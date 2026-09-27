"""Generate the review contact sheet, and optionally serve it with
approve/reject/back-to-review actions.

Design: openspec/changes/game-asset-pipeline/design.md D7;
spec: specs/game-asset-pipeline/spec.md "Review contact sheet".
"""

from __future__ import annotations

import http.server
import json
import os
from pathlib import Path
from typing import Any

from . import manifest as manifest_mod

_TEMPLATE_PATH = Path(__file__).parent / "review_template.html"
_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _entry_to_json(game_dir: Path, review_dir: Path, entry: dict[str, Any]) -> dict[str, Any]:
    file_rel = entry.get("file")
    src = None
    file_is_dir = False
    if file_rel:
        abs_path = game_dir / file_rel
        if abs_path.is_dir():
            file_is_dir = True
        elif abs_path.is_file() and abs_path.suffix.lower() in _IMAGE_EXTS:
            src = os.path.relpath(abs_path, review_dir)

    return {
        "id": entry.get("id"),
        "subject": entry.get("subject"),
        "kind": entry.get("kind"),
        "status": entry.get("status"),
        "dir": entry.get("dir"),
        "anim": entry.get("anim"),
        "layout": entry.get("layout"),
        "source": entry.get("source"),
        "review": entry.get("review"),
        "src": src,
        "file_is_dir": file_is_dir,
    }


def render_html(game_dir: Path, m: manifest_mod.Manifest, served: bool = False) -> str:
    review_dir = game_dir / "review"
    data = {
        "game": m.data.get("game", game_dir.name),
        "served": served,
        "assets": [_entry_to_json(game_dir, review_dir, e) for e in m.assets],
    }
    template = _TEMPLATE_PATH.read_text()
    html = template.replace("__GAME__", str(m.data.get("game", game_dir.name)))
    html = html.replace("__DATA_JSON__", json.dumps(data))
    return html


def write_review(game_dir: Path, m: manifest_mod.Manifest, served: bool = False) -> Path:
    review_dir = game_dir / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    out_path = review_dir / "index.html"
    out_path.write_text(render_html(game_dir, m, served=served))
    return out_path


def handle_mark_request(
    body: dict[str, Any],
    game_dir: Path,
    m: manifest_mod.Manifest,
) -> dict[str, Any]:
    """Apply one `/api/mark`-style request: {id, status, note}. Regenerates
    the review page afterwards. Returns the updated entry (JSON-safe).
    """
    asset_id = body["id"]
    status = body["status"]
    note = body.get("note")
    m.mark(asset_id, status, note=note)
    m.save()
    write_review(game_dir, m, served=True)
    entry = m.find(asset_id)
    return {"id": asset_id, "status": entry["status"]}


def make_server(
    game_dir: Path,
    m: manifest_mod.Manifest,
    host: str = "127.0.0.1",
    port: int = 8765,
) -> http.server.HTTPServer:
    """Build (but don't start) an HTTP server rooted at *game_dir*, serving
    the static review page plus a POST /api/mark endpoint. Call
    ``server.serve_forever()`` to run it.
    """
    write_review(game_dir, m, served=True)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=str(game_dir), **kwargs)

        def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A002
            pass

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/api/mark":
                self.send_response(404)
                self.end_headers()
                return
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length) if length else b""
            try:
                body = json.loads(raw) if raw else {}
                result = handle_mark_request(body, game_dir, m)
            except manifest_mod.ManifestError as exc:
                payload = str(exc).encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except (KeyError, json.JSONDecodeError) as exc:
                payload = f"bad request: {exc}".encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            payload = json.dumps(result).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    return http.server.HTTPServer((host, port), Handler)


def serve(game_dir: Path, m: manifest_mod.Manifest, host: str = "127.0.0.1", port: int = 8765) -> None:
    server = make_server(game_dir, m, host=host, port=port)
    try:
        server.serve_forever()
    finally:
        server.server_close()
