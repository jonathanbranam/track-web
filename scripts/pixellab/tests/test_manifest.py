from __future__ import annotations

import pytest

from pixellab_tools import manifest as manifest_mod


def test_ensure_workspace_creates_standard_dirs_and_empty_manifest(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "newgame")
    for sub in manifest_mod.STANDARD_SUBDIRS:
        assert (game_dir / sub).is_dir()
    assert (game_dir / "manifest.yaml").is_file()
    m = manifest_mod.Manifest(game_dir)
    assert m.data["version"] == 1
    assert m.data["game"] == "newgame"
    assert list(m.assets) == []


def test_ensure_workspace_is_idempotent(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "newgame")
    (tmp_path / "newgame" / "manifest.yaml").write_text("version: 1\ngame: newgame\nconfig: {}\nassets: []\ncustom: keep-me\n")
    manifest_mod.ensure_workspace(tmp_path, "newgame")
    text = (tmp_path / "newgame" / "manifest.yaml").read_text()
    assert "keep-me" in text


def test_add_and_find(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "mochi-bunny-s-32-ur", "subject": "mochi-bunny", "kind": "sprite", "status": "named"})
    m.save()

    reloaded = manifest_mod.Manifest(game_dir)
    entry = reloaded.find("mochi-bunny-s-32-ur")
    assert entry is not None
    assert entry["status"] == "named"


def test_duplicate_id_rejected_without_writing(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "dup", "subject": "x", "kind": "sprite", "status": "named"})
    with pytest.raises(manifest_mod.ManifestError) as excinfo:
        m.add({"id": "dup", "subject": "y", "kind": "sprite", "status": "named"})
    assert "dup" in str(excinfo.value)
    assert len(m.assets) == 1


def test_legal_transition_updates_status_and_history(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "named"})
    m.mark("a", "in-review", note="looks good")
    entry = m.find("a")
    assert entry["status"] == "in-review"
    assert len(entry["history"]) == 1
    assert entry["history"][0]["to"] == "in-review"
    assert entry["history"][0]["note"] == "looks good"
    assert "at" in entry["history"][0]


def test_illegal_transition_leaves_manifest_unchanged(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "named"})
    m.save()
    before = (game_dir / "manifest.yaml").read_text()

    with pytest.raises(manifest_mod.ManifestError):
        m.mark("a", "shipped")

    entry = m.find("a")
    assert entry["status"] == "named"
    assert "history" not in entry or len(entry.get("history", [])) == 0
    # Nothing was saved during the failed mark, and the on-disk file (from
    # before the attempt) is untouched.
    after = (game_dir / "manifest.yaml").read_text()
    assert before == after


def test_force_overrides_illegal_transition(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "named"})
    m.mark("a", "shipped", force=True)
    assert m.find("a")["status"] == "shipped"


def test_named_to_approved_directly_allowed():
    # D4: "Skipping from named straight to approved is allowed."
    assert "approved" in manifest_mod.TRANSITIONS["named"]


def test_rejected_from_named_candidate_in_review():
    for status in ("named", "candidate", "in-review"):
        assert "rejected" in manifest_mod.TRANSITIONS[status]


def test_status_counts_and_waiting_for_review(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "named"})
    m.add({"id": "b", "subject": "x", "kind": "sprite", "status": "approved"})
    m.add({"id": "c", "subject": "x", "kind": "sprite", "status": "candidate"})
    counts = m.status_counts()
    assert counts == {"named": 1, "approved": 1, "candidate": 1}
    waiting_ids = {e["id"] for e in m.waiting_for_review()}
    assert waiting_ids == {"a", "c"}


def test_round_trip_preserves_comment_and_unknown_field(tmp_path):
    game_dir = tmp_path / "mimlings"
    game_dir.mkdir()
    (game_dir / "manifest.yaml").write_text(
        "version: 1\n"
        "game: mimlings\n"
        "config: {}\n"
        "assets:\n"
        "  - id: a\n"
        "    subject: mochi-bunny\n"
        "    kind: sprite\n"
        "    status: named\n"
        "    notes: hand-written note  # a custom field\n"
        "# a trailing comment\n"
    )
    m = manifest_mod.Manifest(game_dir)
    m.mark("a", "approved")
    m.save()

    text = (game_dir / "manifest.yaml").read_text()
    assert "hand-written note" in text
    assert "a custom field" in text
    assert "a trailing comment" in text

    reloaded = manifest_mod.Manifest(game_dir)
    entry = reloaded.find("a")
    assert entry["notes"] == "hand-written note"
    assert entry["status"] == "approved"


def test_list_games(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "mimlings")
    manifest_mod.ensure_workspace(tmp_path, "otter_game")
    (tmp_path / ".DS_Store").write_text("")
    assert manifest_mod.list_games(tmp_path) == ["mimlings", "otter_game"]


def test_list_games_missing_root_returns_empty(tmp_path):
    assert manifest_mod.list_games(tmp_path / "nope") == []
