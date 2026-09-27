"""Thin HTTP client for the PixelLab REST API.

Design: openspec/changes/game-asset-pipeline/design.md D3.

This module never prints or logs ``PIXELLAB_SECRET``: it is used only to
build the ``Authorization`` header, which is never included in any error
message, exception, or log line.
"""

from __future__ import annotations

import binascii
import io
import json
import re
import time
import urllib.error
import urllib.request
import zipfile
from base64 import b64decode
from pathlib import Path
from typing import Any, Callable, Iterator

from . import config


class ApiError(RuntimeError):
    """An HTTP error from the PixelLab API. Never carries request headers."""

    def __init__(self, status: int, body: str, path: str = ""):
        self.status = status
        self.body = body
        self.path = path
        super().__init__(f"HTTP {status} for {path}: {body}")


class JobFailedError(RuntimeError):
    def __init__(self, job_id: str, job: dict[str, Any]):
        self.job_id = job_id
        self.job = job
        detail = job.get("last_response") or job.get("detail") or job
        super().__init__(f"Job {job_id} failed: {detail}")


def _url(path: str, env: dict[str, str] | None) -> str:
    base = config.get_api_base(env).rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def _headers(env: dict[str, str] | None) -> dict[str, str]:
    secret = config.get_pixellab_secret(env)
    return {"Authorization": f"Bearer {secret}", "Content-Type": "application/json"}


def _do_request(
    method: str,
    path: str,
    body: Any = None,
    env: dict[str, str] | None = None,
    timeout: float = 60.0,
) -> bytes:
    url = _url(path, env)
    headers = _headers(env)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ApiError(exc.code, detail, path) from None


def get(path: str, env: dict[str, str] | None = None) -> Any:
    raw = _do_request("GET", path, env=env)
    return json.loads(raw) if raw else {}


def get_bytes(path: str, env: dict[str, str] | None = None) -> bytes:
    return _do_request("GET", path, env=env)


def post(path: str, body: Any = None, env: dict[str, str] | None = None) -> Any:
    raw = _do_request("POST", path, body=body, env=env)
    return json.loads(raw) if raw else {}


def wait_for_job(
    job_id: str,
    env: dict[str, str] | None = None,
    interval: float = 5.0,
    sleep_fn: Callable[[float], None] = time.sleep,
    max_polls: int | None = None,
) -> dict[str, Any]:
    """Poll ``background-jobs/{job_id}`` until it completes or fails.

    Returns the completed job body. Raises :class:`JobFailedError` on
    failure.
    """
    polls = 0
    while True:
        job = get(f"background-jobs/{job_id}", env=env)
        status = job.get("status")
        if status == "completed":
            return job
        if status == "failed":
            raise JobFailedError(job_id, job)
        polls += 1
        if max_polls is not None and polls >= max_polls:
            raise TimeoutError(f"Job {job_id} did not complete after {polls} polls")
        sleep_fn(interval)


# --- Result-image discovery -------------------------------------------------

_DIRECTION_KEYS = {
    "south", "south-east", "east", "north-east",
    "north", "north-west", "west", "south-west",
    "s", "se", "e", "ne", "n", "nw", "w", "sw",
}


def _is_image_object(obj: Any) -> bool:
    return isinstance(obj, dict) and isinstance(obj.get("base64"), str)


_PNG_MAGIC = b"\x89PNG"
_JPEG_MAGIC = b"\xff\xd8\xff"


def _is_bare_base64_image(obj: Any) -> bool:
    """True if *obj* is a raw base64 string encoding PNG/JPEG bytes directly
    (no ``{"type": "base64", "base64": ...}`` wrapper).

    Verified 2026-09-27: ``POST /map-objects`` returns its image this way —
    ``last_response.image`` is the base64 string itself, unlike every other
    endpoint checked, which wraps it in an object. Only the first 16
    characters are decoded (a cheap magic-bytes probe) so this never pays to
    decode a whole multi-KB non-image string.
    """
    if not isinstance(obj, str) or len(obj) < 64:
        return False
    prefix = obj[:16]
    if not re.fullmatch(r"[A-Za-z0-9+/]{16}", prefix):
        return False
    try:
        raw = b64decode(prefix)
    except (binascii.Error, ValueError):
        return False
    return raw.startswith(_PNG_MAGIC) or raw.startswith(_JPEG_MAGIC)


def _iter_images(obj: Any, path: tuple[Any, ...] = ()) -> Iterator[tuple[tuple[Any, ...], str]]:
    if _is_image_object(obj):
        yield path, obj["base64"]
        return
    if _is_bare_base64_image(obj):
        yield path, obj
        return
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from _iter_images(value, path + (key,))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            yield from _iter_images(value, path + (index,))


def find_images(response: Any) -> list[tuple[str | None, str]]:
    """Walk *response* for image objects.

    Returns a list of ``(suffix, base64_data)`` pairs. ``suffix`` is ``None``
    for a lone ``image`` key, the direction/list-index otherwise (as a
    string), per design D3.
    """
    found = list(_iter_images(response))
    single = len(found) == 1
    results: list[tuple[str | None, str]] = []
    for path, b64 in found:
        last = path[-1] if path else None
        if single and (last is None or last == "image"):
            suffix = None
        elif last is None:
            suffix = None
        else:
            suffix = str(last)
        results.append((suffix, b64))
    return results


def decode_image_base64(data: str) -> bytes:
    """Strip an optional ``data:image/...;base64,`` prefix and decode."""
    if "," in data[:64] and data[:5] == "data:":
        data = data.split(",", 1)[1]
    return b64decode(data)


def save_image(data: str, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(decode_image_base64(data))
    return path


def save_found_images(response: Any, out_dir: Path, prefix: str) -> list[Path]:
    """Discover and save every image in *response* under ``<prefix>[-<suffix>].png``."""
    saved: list[Path] = []
    for suffix, b64 in find_images(response):
        name = f"{prefix}.png" if suffix is None else f"{prefix}-{suffix}.png"
        saved.append(save_image(b64, out_dir / name))
    return saved


def download_and_unzip(path: str, dest_dir: Path, env: dict[str, str] | None = None) -> list[Path]:
    """GET a ZIP-returning endpoint and extract it into *dest_dir*."""
    raw = get_bytes(path, env=env)
    dest_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            target = dest_dir / Path(name).name
            target.write_bytes(zf.read(name))
            extracted.append(target)
    return extracted
