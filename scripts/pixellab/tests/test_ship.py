from __future__ import annotations

import hashlib

import pytest

from pixellab_tools import manifest, ship


def setup_packed_game(tmp_path, name="mimlings", subject="mochi-bunny", dest=None):
    game_dir = manifest.ensure_workspace(tmp_path, name)
    m = manifest.Manifest(game_dir)
    if dest is not None:
        m.config["ship"] = {"dest": dest}
    (game_dir / "dist").mkdir(exist_ok=True)
    png = game_dir / "dist" / f"{subject}.png"
    json_path = game_dir / "dist" / f"{subject}.json"
    png.write_bytes(b"fake-png-bytes")
    json_path.write_text("{}")
    m.add({
        "id": f"{subject}-rot8-32", "subject": subject, "kind": "rotations",
        "file": f"work/{subject}/{subject}-rot8-32.png", "status": "packed",
        "tags": [], "source": {"tool": "pixellab-web", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    m.save()
    return game_dir, m


def test_no_destination_configured_error_names_manifest(tmp_path):
    game_dir, m = setup_packed_game(tmp_path, dest=None)
    with pytest.raises(ship.ShipError) as excinfo:
        ship.ship(game_dir, m)
    message = str(excinfo.value)
    assert "mimlings" in message
    assert str(m.path) in message


def test_ship_to_tmp_destination_copies_and_marks_shipped(tmp_path):
    dest = tmp_path / "out"
    game_dir, m = setup_packed_game(tmp_path, dest=str(dest))
    results = ship.ship(game_dir, m)
    assert results[0]["subject"] == "mochi-bunny"
    assert (dest / "mochi-bunny.png").read_bytes() == b"fake-png-bytes"
    assert (dest / "mochi-bunny.json").is_file()
    expected_sha = hashlib.sha256(b"fake-png-bytes").hexdigest()
    assert results[0]["sha256"] == expected_sha

    reloaded = manifest.Manifest(game_dir)
    entry = reloaded.find("mochi-bunny-rot8-32")
    assert entry["status"] == "shipped"
    assert entry["ship"]["sha256"] == expected_sha
    assert entry["ship"]["dest"] == str(dest)


def test_ship_dry_run_changes_nothing(tmp_path):
    dest = tmp_path / "out"
    game_dir, m = setup_packed_game(tmp_path, dest=str(dest))
    results = ship.ship(game_dir, m, dry_run=True)
    assert results[0]["subject"] == "mochi-bunny"
    assert not dest.exists()
    assert m.find("mochi-bunny-rot8-32")["status"] == "packed"


def test_ship_refuses_unpacked_approved_changes(tmp_path):
    dest = tmp_path / "out"
    game_dir, m = setup_packed_game(tmp_path, dest=str(dest))
    m.add({
        "id": "mochi-bunny-idle-s-32-5f", "subject": "mochi-bunny", "kind": "animation",
        "anim": "idle", "dir": "s", "file": "work/mochi-bunny/x.png", "status": "approved",
        "tags": [], "source": {"tool": "pixellab-web", "original": "x.png"},
        "review": {"verdict": None, "note": None, "at": None}, "history": [],
    })
    m.save()
    with pytest.raises(ship.ShipError, match="unpacked approved"):
        ship.ship(game_dir, m)
    assert not dest.exists()


def test_env_var_expansion_in_destination(tmp_path, monkeypatch):
    real_dest = tmp_path / "from-env"
    game_dir, m = setup_packed_game(tmp_path, dest="${MY_SHIP_DEST}/mimlings")
    env = {"MY_SHIP_DEST": str(real_dest)}
    results = ship.ship(game_dir, m, env=env)
    assert results[0]["dest"] == str(real_dest / "mimlings")
    assert (real_dest / "mimlings" / "mochi-bunny.png").is_file()


def test_repo_relative_destination_resolves_against_repo_root(tmp_path, monkeypatch):
    from pixellab_tools import config as config_mod

    fake_root = tmp_path / "repo"
    (fake_root / "openspec").mkdir(parents=True)
    (fake_root / "package.json").write_text("{}")
    monkeypatch.setattr(config_mod, "find_repo_root", lambda start=None: fake_root)

    game_dir, m = setup_packed_game(tmp_path, dest="client-games/public/mimlings")
    results = ship.ship(game_dir, m)
    expected = fake_root / "client-games" / "public" / "mimlings"
    assert results[0]["dest"] == str(expected)
    assert (expected / "mochi-bunny.png").is_file()


def test_ship_missing_dist_file_errors_without_writing(tmp_path):
    dest = tmp_path / "out"
    game_dir, m = setup_packed_game(tmp_path, dest=str(dest))
    (game_dir / "dist" / "mochi-bunny.json").unlink()
    with pytest.raises(ship.ShipError, match="no packed sheet"):
        ship.ship(game_dir, m)
    assert not dest.exists()
