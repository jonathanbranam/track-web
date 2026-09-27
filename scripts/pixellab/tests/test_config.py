from __future__ import annotations

import pytest

from pixellab_tools import config


def make_fake_repo(tmp_path, env_lines):
    (tmp_path / "package.json").write_text("{}")
    (tmp_path / "openspec").mkdir()
    (tmp_path / ".env").write_text("\n".join(env_lines) + "\n")
    return tmp_path


def test_find_repo_root_walks_up(tmp_path):
    root = make_fake_repo(tmp_path, [])
    nested = root / "scripts" / "pixellab" / "src" / "pixellab_tools"
    nested.mkdir(parents=True)
    marker = nested / "config.py"
    marker.write_text("")
    assert config.find_repo_root(marker) == root


def test_find_repo_root_missing_raises(tmp_path):
    lonely = tmp_path / "nowhere" / "file.py"
    lonely.parent.mkdir(parents=True)
    lonely.write_text("")
    with pytest.raises(config.ConfigError):
        config.find_repo_root(lonely)


def test_shell_overrides_dot_env(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, ["GAME_ASSETS_DIR=/from/dotenv"])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    env: dict[str, str] = {"GAME_ASSETS_DIR": "/from/shell"}
    result = config.get_game_assets_dir(env)
    assert str(result) == "/from/shell"


def test_dot_env_used_when_shell_unset(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, ["GAME_ASSETS_DIR=/from/dotenv"])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    env: dict[str, str] = {}
    result = config.get_game_assets_dir(env)
    assert str(result) == "/from/dotenv"


def test_missing_secret_error_names_variable_and_env_file(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, [])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    env: dict[str, str] = {}
    with pytest.raises(config.ConfigError) as excinfo:
        config.get_pixellab_secret(env)
    message = str(excinfo.value)
    assert "PIXELLAB_SECRET" in message
    assert ".env" in message


def test_secret_loaded_from_dot_env(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, ["PIXELLAB_SECRET=super-secret-value"])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    env: dict[str, str] = {}
    assert config.get_pixellab_secret(env) == "super-secret-value"


def test_tilde_expansion(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, [])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    env: dict[str, str] = {"GAME_ASSETS_DIR": "~/Dropbox/games"}
    result = config.get_game_assets_dir(env)
    assert result == tmp_path / "Dropbox" / "games"


def test_aseprite_bin_default_and_override(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, [])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    monkeypatch.setattr(config, "DEFAULT_ASEPRITE_MAC_APP", str(tmp_path / "nope"))
    env: dict[str, str] = {}
    assert config.get_aseprite_bin(env) == "aseprite"

    env2: dict[str, str] = {"ASEPRITE_BIN": "/custom/aseprite"}
    assert config.get_aseprite_bin(env2) == "/custom/aseprite"


def test_api_base_default_and_override(tmp_path, monkeypatch):
    make_fake_repo(tmp_path, [])
    monkeypatch.setattr(config, "find_repo_root", lambda start=None: tmp_path)
    env: dict[str, str] = {}
    assert config.get_api_base(env) == config.DEFAULT_API_BASE

    env2: dict[str, str] = {"PIXELLAB_API_BASE": "http://localhost:9999"}
    assert config.get_api_base(env2) == "http://localhost:9999"
