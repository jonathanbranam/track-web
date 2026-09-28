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


def add_sprite(game_dir, m, asset_id, subject="mochi-bunny", status="unreviewed"):
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
        "file": "work/mochi-bunny/variations-colorways", "status": "unreviewed",
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
        "file": "work/meadow/tileset-meadow-path", "status": "unreviewed",
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

        # D7: GET renders the served page fresh every time, regardless of
        # what's on disk (action buttons included).
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/review/index.html") as resp:
            page = resp.read().decode()
        assert '"served": true' in page
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_get_review_index_renders_served_true_regardless_of_disk(tmp_path):
    # D7: the on-disk file is written with served=False, but GETting it
    # through the server always renders fresh with served=True.
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()
    review.write_review(game_dir, m, served=False)
    on_disk = (game_dir / "review" / "index.html").read_text()
    assert '"served": false' in on_disk

    port = _free_port()
    server = review.make_server(game_dir, m, port=port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/review/index.html") as resp:
            page = resp.read().decode()
        assert '"served": true' in page
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_mark_reloads_manifest_so_concurrent_cli_change_is_kept(tmp_path):
    # D7: handle_mark_request loads a fresh Manifest per request, so a CLI
    # mark made (and saved) while the server is up isn't lost.
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    add_sprite(game_dir, m, "b")
    m.save()

    port = _free_port()
    server = review.make_server(game_dir, m, port=port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        other = manifest.Manifest(game_dir)
        other.mark("a", "rejected")
        other.save()

        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/mark",
            method="POST",
            data=json.dumps({"id": "b", "status": "in-review"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            json.loads(resp.read())

        final = manifest.Manifest(game_dir)
        assert final.find("a")["status"] == "rejected"
        assert final.find("b")["status"] == "in-review"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_served_reference_button_marks_reference(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a", status="unreviewed")
    m.save()

    port = _free_port()
    server = review.make_server(game_dir, m, port=port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/mark",
            method="POST",
            data=json.dumps({"id": "a", "status": "reference"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        assert result == {"id": "a", "status": "reference"}

        reloaded = manifest.Manifest(game_dir)
        entry = reloaded.find("a")
        assert entry["status"] == "reference"
        assert entry["history"][-1]["to"] == "reference"
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


def _entry_from(html_text):
    data = json.loads(html_text.split('type="application/json">', 1)[1].split("</script>", 1)[0])
    return data["assets"][0]


def test_size_single_image_no_layout(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"w": 32, "h": 32}


def test_size_sheet_with_cell_and_frames(tmp_path):
    game_dir, m = setup_game(tmp_path)
    work = game_dir / "work" / "mochi-bunny"
    work.mkdir(parents=True)
    Image.new("RGBA", (200, 40), (0, 0, 0, 0)).save(work / "mochi-bunny-idle-s-40-5f.png")
    m.add({
        "id": "mochi-bunny-idle-s-40-5f", "subject": "mochi-bunny", "kind": "animation",
        "anim": "idle", "dir": "s", "file": "work/mochi-bunny/mochi-bunny-idle-s-40-5f.png",
        "status": "unreviewed",
        "layout": {"cell": [40, 40], "cols": 5, "rows": 1, "frames": 5, "order": "row-major"},
        "tags": [], "source": {"tool": "x", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"w": 200, "h": 40, "cell": [40, 40], "frames": 5}


def test_size_rotations_sheet_uses_dir_count(tmp_path):
    game_dir, m = setup_game(tmp_path)
    work = game_dir / "work" / "mochi-bunny"
    work.mkdir(parents=True)
    Image.new("RGBA", (96, 96), (0, 0, 0, 0)).save(work / "mochi-bunny-rot8-32.png")
    from pixellab_tools import naming
    m.add({
        "id": "mochi-bunny-rot8-32", "subject": "mochi-bunny", "kind": "rotations",
        "file": "work/mochi-bunny/mochi-bunny-rot8-32.png", "status": "unreviewed",
        "layout": {"cell": [32, 32], "cols": 3, "rows": 3, "frames": 8, "order": "row-major", "dirs": list(naming.DIRECTIONS)},
        "tags": [], "source": {"tool": "x", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"w": 96, "h": 96, "cell": [32, 32], "frames": 8}


def test_size_directory_tileset_16_tiles(tmp_path):
    game_dir, m = setup_game(tmp_path)
    tiles = game_dir / "work" / "meadow" / "tileset-meadow-path"
    tiles.mkdir(parents=True)
    for i in range(16):
        Image.new("RGBA", (32, 32)).save(tiles / f"meadow-tileset-wang_{i}.png")
    m.add({
        "id": "meadow-tileset", "subject": "meadow", "kind": "tileset",
        "file": "work/meadow/tileset-meadow-path", "status": "unreviewed",
        "layout": {"cell": [32, 32], "total_tiles": 16},
        "tags": [], "source": {"tool": "x", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"cell": [32, 32], "tiles": 16}


def test_size_directory_tileset_mismatch_adds_manifest_count(tmp_path):
    game_dir, m = setup_game(tmp_path)
    tiles = game_dir / "work" / "meadow" / "tileset-meadow-path"
    tiles.mkdir(parents=True)
    for i in range(16):
        Image.new("RGBA", (32, 32)).save(tiles / f"meadow-tileset-wang_{i}.png")
    m.add({
        "id": "meadow-tileset", "subject": "meadow", "kind": "tileset",
        "file": "work/meadow/tileset-meadow-path", "status": "unreviewed",
        "layout": {"cell": [32, 32], "total_tiles": 15},
        "tags": [], "source": {"tool": "x", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"cell": [32, 32], "tiles": 16, "tiles_manifest": 15}


def test_size_other_directory_image_count(tmp_path):
    game_dir, m = setup_game(tmp_path)
    colorways = game_dir / "work" / "mochi-bunny" / "variations-colorways"
    colorways.mkdir(parents=True)
    for i in range(12):
        Image.new("RGBA", (32, 32)).save(colorways / f"colorway_{i}.png")
    m.add({
        "id": "colorways-set", "subject": "mochi-bunny", "kind": "variations",
        "file": "work/mochi-bunny/variations-colorways", "status": "unreviewed",
        "tags": [], "source": {"tool": "derived", "original": "x"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    entry = _entry_from(review.render_html(game_dir, m))
    assert entry["size"] == {"images": 12}


def test_note_field_is_textarea(tmp_path):
    game_dir, m = setup_game(tmp_path)
    add_sprite(game_dir, m, "a")
    m.save()
    served_html = review.render_html(game_dir, m, served=True)
    assert 'createElement("textarea")' in served_html


def test_static_page_shows_readonly_mode_and_serve_command(tmp_path):
    game_dir, m = setup_game(tmp_path, "mimlings")
    add_sprite(game_dir, m, "a")
    m.save()
    static_html = review.render_html(game_dir, m, served=False)
    assert "Read-only" in static_html
    assert "assets -- review mimlings --serve" in static_html
    assert "Review mode" not in static_html


def test_served_page_shows_review_mode(tmp_path):
    game_dir, m = setup_game(tmp_path, "mimlings")
    add_sprite(game_dir, m, "a")
    m.save()
    served_html = review.render_html(game_dir, m, served=True)
    assert "Review mode" in served_html
    assert "Read-only" not in served_html
