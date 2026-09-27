from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request

import pytest
from PIL import Image

from pixellab_tools import manifest, review


def setup_game(tmp_path, name="mimlings"):
    game_dir = manifest.ensure_workspace(tmp_path, name)
    m = manifest.Manifest(game_dir)
    return game_dir, m


def add_sprite(game_dir, m, asset_id, subject="mochi-bunny", status="named"):
    work = game_dir / "work" / subject
    work.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGBA", (32, 32), (255, 0, 0, 255))
    img.save(work / f"{asset_id}.png")
    m.add({
        "id": asset_id, "subject": subject, "kind": "sprite", "dir": "s",
        "file": f"work/{subject}/{asset_id}.png", "status": status,
        "tags": [], "source": {"tool": "third-party", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })


def test_render_html_embeds_every_entry(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "mochi-bunny-s-32")
    add_sprite(game_dir, m, "mochi-bunny-e-32")
    m.save()

    html = review.render_html(game_dir, m)
    data_json = html.split('type="application/json">', 1)[1].split("</script>", 1)[0]
    data = json.loads(data_json)
    ids = {a["id"] for a in data["assets"]}
    assert ids == {"mochi-bunny-s-32", "mochi-bunny-e-32"}
    assert data["assets"][0]["src"].startswith("../work/")


def test_write_review_creates_index_html(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()
    out_path = review.write_review(game_dir, m)
    assert out_path == game_dir / "review" / "index.html"
    assert out_path.is_file()
    assert "a" in out_path.read_text()


def test_directory_entry_has_no_src(tmp_path):
    game_dir, m = setup_game(tmp_path)
    (game_dir / "work" / "mochi-bunny" / "variations-colorways").mkdir(parents=True)
    m.add({
        "id": "colorways-set", "subject": "mochi-bunny", "kind": "variations",
        "file": "work/mochi-bunny/variations-colorways", "status": "named",
        "tags": [], "source": {"tool": "derived", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    html = review.render_html(game_dir, m)
    data = json.loads(html.split('type="application/json">', 1)[1].split("</script>", 1)[0])
    entry = data["assets"][0]
    assert entry["src"] is None
    assert entry["srcs"] == []
    assert entry["file_is_dir"] is True


def test_directory_entry_lists_its_images_in_natural_order(tmp_path):
    game_dir, m = setup_game(tmp_path)
    tiles = game_dir / "work" / "meadow" / "tileset-meadow-path"
    tiles.mkdir(parents=True)
    for i in (10, 2, 0, 1):
        Image.new("RGBA", (32, 32)).save(tiles / f"meadow-tileset-wang_{i}.png")
    (tiles / "notes.txt").write_text("not an image")
    m.add({
        "id": "meadow-tileset-meadow-path", "subject": "meadow", "kind": "tileset",
        "file": "work/meadow/tileset-meadow-path", "status": "named",
        "tags": [], "source": {"tool": "pixellab-api", "original": "create-tileset"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    html = review.render_html(game_dir, m)
    data = json.loads(html.split('type="application/json">', 1)[1].split("</script>", 1)[0])
    entry = data["assets"][0]
    assert entry["file_is_dir"] is True
    assert [s.rsplit("_", 1)[1] for s in entry["srcs"]] == ["0.png", "1.png", "2.png", "10.png"]
    assert all(s.startswith("../work/meadow/tileset-meadow-path/") for s in entry["srcs"])


def _free_port():
    import socket

    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def test_served_mark_endpoint_updates_manifest(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()

    port = _free_port()
    server = review.make_server(game_dir, m, port=port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/mark",
            method="POST",
            data=json.dumps({"id": "a", "status": "in-review", "note": "check ears"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        assert result == {"id": "a", "status": "in-review"}

        # Re-load from disk: the manifest was actually saved.
        reloaded = manifest.Manifest(game_dir)
        entry = reloaded.find("a")
        assert entry["status"] == "in-review"
        assert entry["review"]["note"] == "check ears"

        # The static page got the served page (with action buttons).
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/review/index.html") as resp:
            page = resp.read().decode()
        assert '"served": true' in page
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_served_mark_illegal_transition_returns_400(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()

    port = _free_port()
    server = review.make_server(game_dir, m, port=port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/mark",
            method="POST",
            data=json.dumps({"id": "a", "status": "shipped"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with pytest.raises(urllib.error.HTTPError) as excinfo:
            urllib.request.urlopen(req)
        assert excinfo.value.code == 400
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()
