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


def test_open_workspace_unknown_game_suggests_near_duplicate(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "otter_game")
    with pytest.raises(manifest_mod.ManifestError) as exc:
        manifest_mod.open_workspace(tmp_path, "otter-game")
    assert 'Did you mean "otter_game"?' in str(exc.value)
    assert not (tmp_path / "otter-game").exists()


def test_open_workspace_close_typo_suggested(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "mimlings")
    with pytest.raises(manifest_mod.ManifestError) as exc:
        manifest_mod.open_workspace(tmp_path, "mimlngs")
    assert 'Did you mean "mimlings"?' in str(exc.value)


def test_open_workspace_unrelated_name_has_no_suggestion(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "mimlings")
    with pytest.raises(manifest_mod.ManifestError) as exc:
        manifest_mod.open_workspace(tmp_path, "zzz")
    assert "Did you mean" not in str(exc.value)
    assert "Games: mimlings" in str(exc.value)


def test_open_workspace_empty_root(tmp_path):
    with pytest.raises(manifest_mod.ManifestError) as exc:
        manifest_mod.open_workspace(tmp_path, "zzz")
    assert "Games: (none)" in str(exc.value)


def test_open_workspace_fills_layout_for_existing_folder(tmp_path):
    (tmp_path / "oldgame").mkdir()
    game_dir = manifest_mod.open_workspace(tmp_path, "oldgame")
    for sub in manifest_mod.STANDARD_SUBDIRS:
        assert (game_dir / sub).is_dir()
    assert (game_dir / "manifest.yaml").is_file()


def test_add_and_find(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "mochi-bunny-s-32-ur", "subject": "mochi-bunny", "kind": "sprite", "status": "unreviewed"})
    m.save()

    reloaded = manifest_mod.Manifest(game_dir)
    entry = reloaded.find("mochi-bunny-s-32-ur")
    assert entry is not None
    assert entry["status"] == "unreviewed"


def test_duplicate_id_rejected_without_writing(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "dup", "subject": "x", "kind": "sprite", "status": "unreviewed"})
    with pytest.raises(manifest_mod.ManifestError) as excinfo:
        m.add({"id": "dup", "subject": "y", "kind": "sprite", "status": "unreviewed"})
    assert "dup" in str(excinfo.value)
    assert len(m.assets) == 1


def test_legal_transition_updates_status_and_history(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"})
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
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"})
    m.save()
    before = (game_dir / "manifest.yaml").read_text()

    with pytest.raises(manifest_mod.ManifestError):
        m.mark("a", "shipped")

    entry = m.find("a")
    assert entry["status"] == "unreviewed"
    assert "history" not in entry or len(entry.get("history", [])) == 0
    # Nothing was saved during the failed mark, and the on-disk file (from
    # before the attempt) is untouched.
    after = (game_dir / "manifest.yaml").read_text()
    assert before == after


def test_force_overrides_illegal_transition(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"})
    m.mark("a", "shipped", force=True)
    assert m.find("a")["status"] == "shipped"


def test_unreviewed_to_approved_directly_allowed():
    # D3: "Skipping from unreviewed straight to approved is allowed."
    assert "approved" in manifest_mod.TRANSITIONS["unreviewed"]


def test_rejected_from_unreviewed_candidate_in_review():
    for status in ("unreviewed", "candidate", "in-review"):
        assert "rejected" in manifest_mod.TRANSITIONS[status]


def test_unreviewed_to_reference_is_legal(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "thronglets", "kind": "reference", "status": "unreviewed"})
    m.mark("a", "reference")
    assert m.find("a")["status"] == "reference"


def test_reference_to_approved_refused_without_force(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "thronglets", "kind": "reference", "status": "reference"})
    with pytest.raises(manifest_mod.ManifestError):
        m.mark("a", "approved")
    assert m.find("a")["status"] == "reference"


def test_reference_to_in_review_is_legal(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "thronglets", "kind": "reference", "status": "reference"})
    m.mark("a", "in-review")
    assert m.find("a")["status"] == "in-review"


def test_status_counts_and_waiting_for_review(tmp_path):
    game_dir = manifest_mod.ensure_workspace(tmp_path, "mimlings")
    m = manifest_mod.Manifest(game_dir)
    m.add({"id": "a", "subject": "x", "kind": "sprite", "status": "unreviewed"})
    m.add({"id": "b", "subject": "x", "kind": "sprite", "status": "approved"})
    m.add({"id": "c", "subject": "x", "kind": "sprite", "status": "candidate"})
    counts = m.status_counts()
    assert counts == {"unreviewed": 1, "approved": 1, "candidate": 1}
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
        "    status: unreviewed\n"
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


def test_migration_renames_named_and_reference_and_preserves_extras(tmp_path):
    # D1: a manifest written before the unreviewed/reference rename migrates
    # on first load -- an ordinary entry becomes "unreviewed", a
    # ``kind: reference`` entry becomes "reference" with a note in its
    # history, "to: named" history lines are rewritten, and unrelated
    # fields/comments survive.
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
        "    history:\n"
        "      - at: '2026-01-01T00:00:00+00:00'\n"
        "        to: named\n"
        "  - id: shot-1\n"
        "    subject: thronglets\n"
        "    kind: reference\n"
        "    status: named\n"
        "# a trailing comment\n"
    )
    m = manifest_mod.Manifest(game_dir)

    a = m.find("a")
    assert a["status"] == "unreviewed"
    assert a["history"][0]["to"] == "unreviewed"
    assert len(a["history"]) == 1  # a plain rename gets no extra line

    shot = m.find("shot-1")
    assert shot["status"] == "reference"
    assert shot["history"][-1]["to"] == "reference"
    assert shot["history"][-1]["note"] == "migrated from named"

    text = (game_dir / "manifest.yaml").read_text()
    assert "hand-written note" in text
    assert "a custom field" in text
    assert "a trailing comment" in text
    # No status or history "to:" line still says "named" -- the only
    # remaining mention is the migration note's own English text.
    assert "status: named" not in text
    assert "to: named" not in text


def test_migration_is_idempotent_second_load_does_not_rewrite(tmp_path):
    game_dir = tmp_path / "mimlings"
    game_dir.mkdir()
    path = game_dir / "manifest.yaml"
    path.write_text(
        "version: 1\n"
        "game: mimlings\n"
        "config: {}\n"
        "assets:\n"
        "  - id: a\n"
        "    subject: x\n"
        "    kind: sprite\n"
        "    status: named\n"
    )
    manifest_mod.Manifest(game_dir)  # first load: migrates and saves
    before_mtime = path.stat().st_mtime_ns
    before_text = path.read_text()

    manifest_mod.Manifest(game_dir)  # second load: nothing left to migrate

    assert path.stat().st_mtime_ns == before_mtime
    assert path.read_text() == before_text


def test_list_games(tmp_path):
    manifest_mod.ensure_workspace(tmp_path, "mimlings")
    manifest_mod.ensure_workspace(tmp_path, "otter_game")
    (tmp_path / ".DS_Store").write_text("")
    assert manifest_mod.list_games(tmp_path) == ["mimlings", "otter_game"]


def test_list_games_missing_root_returns_empty(tmp_path):
    assert manifest_mod.list_games(tmp_path / "nope") == []
