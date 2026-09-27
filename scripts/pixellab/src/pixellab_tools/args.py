"""Compact request-argument grammar for `pl post` (httpie-style).

Design: openspec/changes/game-asset-pipeline/design.md D3;
spec: specs/pixellab-cli/spec.md "Compact request arguments".

- ``key=value``      -> string
- ``key:=<json>``    -> parsed JSON (numbers, booleans, objects, arrays)
- ``key=@<path>``    -> base64 image object, read from *path*
- dotted keys (``a.b.c``) nest into objects.

A relative ``@`` path is resolved against the current working directory
first, then ``GAME_ASSETS_DIR``.
"""

from __future__ import annotations

import base64
import copy
import json
from pathlib import Path
from typing import Any

from . import config


class ArgError(ValueError):
    pass


def _set_nested(body: dict[str, Any], dotted_key: str, value: Any) -> None:
    parts = dotted_key.split(".")
    node = body
    for part in parts[:-1]:
        existing = node.get(part)
        if not isinstance(existing, dict):
            existing = {}
            node[part] = existing
        node = existing
    node[parts[-1]] = value


def resolve_at_path(raw_path: str, env: dict[str, str] | None = None) -> Path:
    """Resolve an ``@path`` argument: cwd first, then GAME_ASSETS_DIR.

    Raises :class:`ArgError` naming both paths tried if neither exists.
    """
    cwd_path = Path.cwd() / raw_path
    if cwd_path.is_file():
        return cwd_path
    try:
        assets_dir = config.get_game_assets_dir(env)
        assets_path = assets_dir / raw_path
    except config.ConfigError:
        assets_path = None
    if assets_path is not None and assets_path.is_file():
        return assets_path
    tried = [str(cwd_path)]
    if assets_path is not None:
        tried.append(str(assets_path))
    raise ArgError(f"Could not find file for @{raw_path}. Tried: {', '.join(tried)}")


def image_object_from_file(path: Path) -> dict[str, str]:
    data = path.read_bytes()
    fmt = path.suffix.lstrip(".").lower() or "png"
    return {
        "type": "base64",
        "base64": base64.b64encode(data).decode("ascii"),
        "format": fmt,
    }


def parse_arg(
    token: str, body: dict[str, Any], env: dict[str, str] | None = None
) -> tuple[str, str] | None:
    """Parse one ``key=value`` / ``key:=json`` / ``key=@file`` token into *body*.

    Returns ``(dotted_key, source_path)`` when the token was an image
    argument, else ``None`` — used by the caller to record provenance /
    elide data on ``--dry-run`` and in the generation log.
    """
    if ":=" in token and (
        "=" not in token.split(":=", 1)[0]
    ):
        key, raw_json = token.split(":=", 1)
        try:
            value = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise ArgError(f"Invalid JSON for {key!r}: {raw_json!r} ({exc})") from None
        _set_nested(body, key, value)
        return None

    if "=" not in token:
        raise ArgError(f"Malformed argument (expected key=value, key:=json, or key=@file): {token!r}")

    key, raw_value = token.split("=", 1)
    if raw_value.startswith("@"):
        raw_path = raw_value[1:]
        resolved = resolve_at_path(raw_path, env)
        _set_nested(body, key, image_object_from_file(resolved))
        return key, str(resolved)

    _set_nested(body, key, raw_value)
    return None


def build_body(
    tokens: list[str],
    base_body: dict[str, Any] | None = None,
    env: dict[str, str] | None = None,
) -> tuple[dict[str, Any], dict[str, str]]:
    """Build a request body from CLI *tokens*, merged over *base_body*.

    Returns ``(body, image_sources)`` where ``image_sources`` maps the
    dotted key of each ``@file`` argument to the resolved source path.
    """
    body: dict[str, Any] = copy.deepcopy(base_body) if base_body else {}
    image_sources: dict[str, str] = {}
    for token in tokens:
        result = parse_arg(token, body, env)
        if result is not None:
            dotted_key, source = result
            image_sources[dotted_key] = source
    return body, image_sources


def elide_images(body: Any) -> Any:
    """Return a deep copy of *body* with any base64 image data elided.

    Used for --dry-run printing and for the generation log, which must
    never contain image bytes or (by extension) the secret.
    """
    if isinstance(body, dict):
        if isinstance(body.get("base64"), str) and body.get("type") == "base64":
            copied = dict(body)
            copied["base64"] = f"<{len(body['base64'])} base64 chars elided>"
            return copied
        return {k: elide_images(v) for k, v in body.items()}
    if isinstance(body, list):
        return [elide_images(v) for v in body]
    return body
