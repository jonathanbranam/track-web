"""The PixelLab generation log: GAME_ASSETS_DIR/pixellab-log.jsonl.

Design: openspec/changes/game-asset-pipeline/design.md D3;
spec: specs/pixellab-cli/spec.md "Generation log".

Every non-GET call appends one line for the request (image data replaced by
its source file path) and, once known, a second line for the completion
(usage + saved output files). Neither line ever contains the secret or raw
image bytes — only source paths.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config


def log_path(env: dict[str, str] | None = None) -> Path:
    return config.get_game_assets_dir(env) / "pixellab-log.jsonl"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def redact_images(body: Any, image_sources: dict[str, str]) -> Any:
    """Return a copy of *body* with each ``@file`` argument's image object
    replaced by ``{"@": "<source path>"}``, per D3.
    """

    def walk(node: Any, dotted: str) -> Any:
        if dotted in image_sources and isinstance(node, dict) and "base64" in node:
            return {"@": image_sources[dotted]}
        if isinstance(node, dict):
            return {k: walk(v, f"{dotted}.{k}" if dotted else k) for k, v in node.items()}
        if isinstance(node, list):
            return [walk(v, dotted) for v in node]
        return node

    return walk(body, "")


def append_request(
    endpoint: str,
    body: Any,
    image_sources: dict[str, str],
    env: dict[str, str] | None = None,
) -> None:
    line = {
        "at": _now(),
        "type": "request",
        "endpoint": endpoint,
        "body": redact_images(body, image_sources),
    }
    _append(line, env)


def append_completion(
    endpoint: str,
    ids: dict[str, Any],
    usage: Any,
    saved_files: list[str],
    env: dict[str, str] | None = None,
    failed: bool = False,
    detail: Any = None,
) -> None:
    line: dict[str, Any] = {
        "at": _now(),
        "type": "completion" if not failed else "failed",
        "endpoint": endpoint,
        "ids": ids,
        "usage": usage,
        "saved_files": saved_files,
    }
    if failed:
        line["detail"] = detail
    _append(line, env)


def _append(line: dict[str, Any], env: dict[str, str] | None) -> None:
    path = log_path(env)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(line, default=str) + "\n")
