"""Generate the review contact sheet, and optionally serve it with
approve/reject/back-to-review actions.

Design: openspec/changes/game-asset-pipeline/design.md D7;
spec: specs/game-asset-pipeline/spec.md "Review contact sheet".
"""

from __future__ import annotations

import html
import http.server
import json
import os
import re
from pathlib import Path
from typing import Any

from PIL import Image

from . import manifest as manifest_mod

_TEMPLATE_PATH = Path(__file__).parent / "review_template.html"
_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _natural_key(path: Path) -> list[Any]:
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", path.name)]


def _cell_wh(cell: Any) -> tuple[int, int] | None:
    if not cell:
        return None
    if len(cell) >= 2:
        return int(cell[0]), int(cell[1])
    return int(cell[0]), int(cell[0])


def _frame_count(entry: dict[str, Any]) -> int:
    """How many frames/cells this sheet entry has (D4): a rotations set
    counts its recorded directions (or 8), everything else its recorded
    `layout.frames` (or 1 for a plain single-cell sheet).
    """
    kind = entry.get("kind")
    layout = entry.get("layout") or {}
    if kind == "rotations":
        dirs = layout.get("dirs")
        return len(dirs) if dirs else 8
    frames = layout.get("frames")
    return int(frames) if frames else 1


def _image_size(path: Path) -> tuple[int, int] | None:
    try:
        with Image.open(path) as img:
            return img.size
    except Exception:  # noqa: BLE001 -- a corrupt/unreadable file just has no size
        return None


def _entry_size(
    entry: dict[str, Any],
    file_is_dir: bool,
    image_path: Path | None,
    tile_paths: list[Path],
) -> dict[str, Any] | None:
    """D4: pixel-size data for one entry, computed in Python so it's
    testable and present in the JSON before any image loads in the browser.
    """
    kind = entry.get("kind")
    layout = entry.get("layout") or {}
    cell = _cell_wh(layout.get("cell"))

    if file_is_dir:
        if kind == "tileset":
            if cell is None and tile_paths:
                dims = [d for d in (_image_size(p) for p in tile_paths) if d]
                if dims:
                    cell = (max(d[0] for d in dims), max(d[1] for d in dims))
            if cell is None:
                return None
            tiles = len(tile_paths)
            size: dict[str, Any] = {"cell": [cell[0], cell[1]], "tiles": tiles}
            total = layout.get("total_tiles")
            if total is not None and int(total) != tiles:
                size["tiles_manifest"] = int(total)
            return size
        return {"images": len(tile_paths)}

    if image_path is None:
        return None
    dims = _image_size(image_path)
    if dims is None:
        return None
    w, h = dims

    if kind == "tileset" and cell is not None:
        tiles = layout.get("total_tiles")
        if tiles is None:
            cols, rows = layout.get("cols"), layout.get("rows")
            tiles = cols * rows if cols and rows else None
        size = {"cell": [cell[0], cell[1]]}
        if tiles is not None:
            size["tiles"] = int(tiles)
        return size

    if cell is not None:
        return {"w": w, "h": h, "cell": [cell[0], cell[1]], "frames": _frame_count(entry)}

    return {"w": w, "h": h}


def _entry_to_json(game_dir: Path, review_dir: Path, entry: dict[str, Any]) -> dict[str, Any]:
    file_rel = entry.get("file")
    src = None
    srcs: list[str] = []
    file_is_dir = False
    image_path: Path | None = None
    tile_paths: list[Path] = []
    if file_rel:
        abs_path = game_dir / file_rel
        if abs_path.is_dir():
            # A directory entry (a tileset's separate tiles, a variations set)
            # previews as a grid of its images, in natural order (_2 before _10).
            file_is_dir = True
            images = [p for p in abs_path.iterdir() if p.is_file() and p.suffix.lower() in _IMAGE_EXTS]
            tile_paths = sorted(images, key=_natural_key)
            srcs = [os.path.relpath(p, review_dir) for p in tile_paths]
        elif abs_path.is_file() and abs_path.suffix.lower() in _IMAGE_EXTS:
            src = os.path.relpath(abs_path, review_dir)
            image_path = abs_path

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
        "srcs": srcs,
        "file_is_dir": file_is_dir,
        "size": _entry_size(entry, file_is_dir, image_path, tile_paths),
    }


def _mode_line_html(game: str, served: bool) -> str:
    """D8: the line under the title stating whether this is the read-only
    page or the served page with review controls, and how to get the other.
    """
    if served:
        return "Review mode — changes save to manifest.yaml"
    game_esc = html.escape(game)
    return (
        "Read-only — run <code>npm run assets -- review "
        f"{game_esc} --serve</code> to approve/reject"
    )


def render_html(game_dir: Path, m: manifest_mod.Manifest, served: bool = False) -> str:
    review_dir = game_dir / "review"
    game = str(m.data.get("game", game_dir.name))
    data = {
        "game": game,
        "served": served,
        "assets": [_entry_to_json(game_dir, review_dir, e) for e in m.assets],
    }
    template = _TEMPLATE_PATH.read_text()
    page = template.replace("__GAME__", game)
    page = page.replace("__MODE_LINE__", _mode_line_html(game, served))
    page = page.replace("__DATA_JSON__", json.dumps(data))
    return page


def write_review(game_dir: Path, m: manifest_mod.Manifest, served: bool = False) -> Path:
    review_dir = game_dir / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    out_path = review_dir / "index.html"
    out_path.write_text(render_html(game_dir, m, served=served))
    return out_path


def handle_mark_request(
    body: dict[str, Any],
    game_dir: Path,
) -> dict[str, Any]:
    """Apply one `/api/mark`-style request: {id, status, note}. Returns the
    updated entry (JSON-safe).

    D7: a fresh :class:`~pixellab_tools.manifest.Manifest` is loaded for
    *this* request rather than reusing one captured at server startup, so a
    mark made here can't clobber a change another command (the CLI, another
    mark, the D1 migration) made to the file in the meantime. The served page
    itself is never re-written to disk here -- ``GET /review/index.html``
    always renders fresh from the manifest (see ``make_server``), so
    ``review/index.html`` on disk stays the static (non-served) page.
    """
    asset_id = body["id"]
    status = body["status"]
    note = body.get("note")
    m = manifest_mod.Manifest(game_dir)
    m.mark(asset_id, status, note=note)
    m.save()
    entry = m.find(asset_id)
    return {"id": asset_id, "status": entry["status"]}


def make_server(
    game_dir: Path,
    m: manifest_mod.Manifest,
    host: str = "127.0.0.1",
    port: int = 8765,
) -> http.server.HTTPServer:
    """Build (but don't start) an HTTP server rooted at *game_dir*, serving
    the review page (rendered fresh, with review controls, on every request
    for it -- D7) plus a POST /api/mark endpoint. Call
    ``server.serve_forever()`` to run it.
    """
    # The on-disk file is only ever the static (non-served) page; opening it
    # from Dropbox or file:// never shows stale review controls.
    write_review(game_dir, m, served=False)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=str(game_dir), **kwargs)

        def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A002
            pass

        def do_GET(self) -> None:  # noqa: N802
            if self.path in ("/review/", "/review/index.html"):
                fresh = manifest_mod.Manifest(game_dir)
                payload = render_html(game_dir, fresh, served=True).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            super().do_GET()

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/api/mark":
                self.send_response(404)
                self.end_headers()
                return
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length) if length else b""
            try:
                body = json.loads(raw) if raw else {}
                result = handle_mark_request(body, game_dir)
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
