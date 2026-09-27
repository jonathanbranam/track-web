from __future__ import annotations

import pytest

from pixellab_tools import args as args_mod
from pixellab_tools import config


def test_string_value():
    body, sources = args_mod.build_body(["description=mochi bunny"])
    assert body == {"description": "mochi bunny"}
    assert sources == {}


def test_nested_and_typed_values():
    body, _ = args_mod.build_body([
        "image_size.width:=32",
        "image_size.height:=32",
        "no_background:=true",
    ])
    assert body == {"image_size": {"width": 32, "height": 32}, "no_background": True}


def test_json_array_and_object():
    body, _ = args_mod.build_body(['directions:=["south","east","north"]', "frame_count:=4"])
    assert body == {"directions": ["south", "east", "north"], "frame_count": 4}


def test_image_argument_resolves_against_cwd(tmp_path, monkeypatch):
    image = tmp_path / "ur.png"
    image.write_bytes(b"\x89PNG\r\n\x1a\nfakepngbytes")
    monkeypatch.chdir(tmp_path)
    body, sources = args_mod.build_body(["reference_image=@ur.png"], env={})
    assert body["reference_image"]["type"] == "base64"
    assert body["reference_image"]["format"] == "png"
    assert sources == {"reference_image": str(image)}


def test_image_argument_resolves_against_game_assets_dir(tmp_path, monkeypatch):
    assets_dir = tmp_path / "assets"
    game_dir = assets_dir / "mimlings" / "work" / "mochi-bunny"
    game_dir.mkdir(parents=True)
    image = game_dir / "mochi-bunny-s-32-ur.png"
    image.write_bytes(b"fake-png-bytes")
    other_cwd = tmp_path / "elsewhere"
    other_cwd.mkdir()
    monkeypatch.chdir(other_cwd)
    env = {"GAME_ASSETS_DIR": str(assets_dir)}
    body, sources = args_mod.build_body(
        ["reference_image=@mimlings/work/mochi-bunny/mochi-bunny-s-32-ur.png"], env=env
    )
    assert sources == {"reference_image": str(image)}
    assert body["reference_image"]["format"] == "png"


def test_dry_run_elides_image_data(tmp_path, monkeypatch):
    image = tmp_path / "ur.png"
    image.write_bytes(b"some-bytes-here")
    monkeypatch.chdir(tmp_path)
    body, _ = args_mod.build_body(
        ["reference_image=@ur.png", 'description=mochi bunny'], env={}
    )
    elided = args_mod.elide_images(body)
    assert "some-bytes-here" not in str(elided)
    assert "base64 chars elided" in elided["reference_image"]["base64"]
    assert elided["description"] == "mochi bunny"
    # original body must be untouched
    assert body["reference_image"]["base64"] != elided["reference_image"]["base64"]


def test_unreadable_image_names_both_paths(tmp_path, monkeypatch):
    other_cwd = tmp_path / "cwd"
    other_cwd.mkdir()
    monkeypatch.chdir(other_cwd)
    env = {"GAME_ASSETS_DIR": str(tmp_path / "assets")}
    with pytest.raises(args_mod.ArgError) as excinfo:
        args_mod.build_body(["reference_image=@missing.png"], env=env)
    message = str(excinfo.value)
    assert str(other_cwd / "missing.png") in message
    assert str(tmp_path / "assets" / "missing.png") in message


def test_base_body_merge_and_override():
    base = {"description": "old", "kept": True}
    body, _ = args_mod.build_body(["description=new"], base_body=base)
    assert body == {"description": "new", "kept": True}
    # base_body itself must not be mutated
    assert base == {"description": "old", "kept": True}


def test_malformed_argument_raises():
    with pytest.raises(args_mod.ArgError):
        args_mod.build_body(["not-a-valid-token"])


def test_invalid_json_value_raises():
    with pytest.raises(args_mod.ArgError):
        args_mod.build_body(["frame_count:=not-json"])
