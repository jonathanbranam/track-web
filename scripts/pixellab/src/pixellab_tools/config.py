"""Configuration resolution for the pixellab tooling.

Design: openspec/changes/game-asset-pipeline/design.md D2.

The repo root is found by walking up from this file's location until a
directory containing both ``package.json`` and ``openspec/`` is found. The
repo's ``.env`` is then loaded *without* overriding anything already present
in the environment (the shell wins over ``.env``). All lookups go through
``os.environ`` so tests can monkeypatch it freely.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values

_ENV_LOADED_FOR: set[str] = set()

DEFAULT_API_BASE = "https://api.pixellab.ai/v2"
DEFAULT_ASEPRITE_MAC_APP = "/Applications/Aseprite.app/Contents/MacOS/aseprite"


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def find_repo_root(start: Path | None = None) -> Path:
    """Walk up from *start* (default: this file) to the track-web repo root.

    The repo root is identified as the first ancestor directory containing
    both ``package.json`` and an ``openspec`` directory.
    """
    here = (start or Path(__file__)).resolve()
    for candidate in [here, *here.parents]:
        if (candidate / "package.json").is_file() and (candidate / "openspec").is_dir():
            return candidate
    raise ConfigError(
        "Could not find the track-web repo root (looked for package.json + "
        "openspec/ walking up from " + str(here) + ")"
    )


def load_env(env: dict[str, str] | None = None) -> dict[str, str]:
    """Load the repo's ``.env`` into *env* (default: ``os.environ``) without
    overriding keys already set there. Returns the same mapping, mutated.

    Safe to call more than once; existing keys are never overwritten by the
    file, matching the "environment overrides .env" requirement.
    """
    target = os.environ if env is None else env
    repo_root = find_repo_root()
    env_path = repo_root / ".env"
    if env_path.is_file():
        for key, value in dotenv_values(env_path).items():
            if value is None:
                continue
            if key not in target:
                target[key] = value
    return target


def get_pixellab_secret(env: dict[str, str] | None = None) -> str:
    target = load_env(env)
    secret = target.get("PIXELLAB_SECRET")
    if not secret:
        repo_root = find_repo_root()
        raise ConfigError(
            "PIXELLAB_SECRET is not set. Set it in the environment, or add it "
            f"to {repo_root / '.env'} (see .env.example)."
        )
    return secret


def get_game_assets_dir(env: dict[str, str] | None = None) -> Path:
    target = load_env(env)
    raw = target.get("GAME_ASSETS_DIR")
    if not raw:
        raise ConfigError(
            "GAME_ASSETS_DIR is not set. Set it in the environment, or add it "
            f"to {find_repo_root() / '.env'} (see .env.example)."
        )
    return Path(os.path.expanduser(os.path.expandvars(raw)))


def get_aseprite_bin(env: dict[str, str] | None = None) -> str:
    target = load_env(env)
    explicit = target.get("ASEPRITE_BIN")
    if explicit:
        return explicit
    if Path(DEFAULT_ASEPRITE_MAC_APP).exists():
        return DEFAULT_ASEPRITE_MAC_APP
    return "aseprite"


def get_api_base(env: dict[str, str] | None = None) -> str:
    target = load_env(env)
    return target.get("PIXELLAB_API_BASE") or DEFAULT_API_BASE
