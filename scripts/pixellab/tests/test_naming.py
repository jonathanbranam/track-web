from __future__ import annotations

from pixellab_tools import naming


def test_build_sprite():
    assert naming.build_sprite("mochi-bunny", "s", 32) == "mochi-bunny-s-32.png"
    assert naming.build_sprite("mochi-bunny", "s", 32, label="ur") == "mochi-bunny-s-32-ur.png"


def test_build_rotations():
    assert naming.build_rotations("mochi-bunny", 8, 32) == "mochi-bunny-rot8-32.png"


def test_build_animation_name_from_metadata():
    # Spec scenario: mochi-bunny idle s 32px 5 frames -> mochi-bunny-idle-s-32-5f.png
    name = naming.build_animation("mochi-bunny", "idle", "s", 32, 5)
    assert name == "mochi-bunny-idle-s-32-5f.png"


def test_build_animation_multiword_anim_and_subject():
    name = naming.build_animation("mochi-bunny", "look-up", "s", 32, 4)
    assert name == "mochi-bunny-look-up-s-32-4f.png"


def test_build_variations():
    assert naming.build_variations("mochi-bunny", 8, 8, 32) == "mochi-bunny-variations-8x8-32.png"


def test_build_other():
    assert naming.build_other("esther", "source", ext="aseprite") == "esther-source.aseprite"
    assert naming.build_other("background", "source", label="v1", ext="aseprite") == "background-source-v1.aseprite"


def test_build_non_square_cell():
    assert naming.build_sprite("background", "s", (200, 100)) == "background-s-200x100.png"


def test_collision_gets_v2_then_v3():
    existing = {"mochi-bunny-idle-s-32-5f.png"}
    first = naming.with_collision_label("mochi-bunny-idle-s-32-5f.png", existing)
    assert first == "mochi-bunny-idle-s-32-5f-v2.png"
    existing.add(first)
    second = naming.with_collision_label("mochi-bunny-idle-s-32-5f.png", existing)
    assert second == "mochi-bunny-idle-s-32-5f-v3.png"


def test_collision_no_collision_returns_unchanged():
    assert naming.with_collision_label("foo.png", set()) == "foo.png"


def test_round_trip_sprite():
    name = naming.build_sprite("mochi-bunny", "s", 32, label="ur")
    parsed = naming.parse_name(name, subject="mochi-bunny")
    assert parsed["kind"] == "sprite"
    assert parsed["dir"] == "s"
    assert parsed["cell"] == "32"
    assert parsed["label"] == "ur"


def test_round_trip_rotations():
    name = naming.build_rotations("mochi-bunny", 8, 32)
    parsed = naming.parse_name(name, subject="mochi-bunny")
    assert parsed["kind"] == "rotations"
    assert parsed["rot"] == 8
    assert parsed["cell"] == "32"


def test_round_trip_animation_multiword():
    name = naming.build_animation("mochi-bunny", "look-up", "s", 32, 4)
    parsed = naming.parse_name(name, subject="mochi-bunny")
    assert parsed["kind"] == "animation"
    assert parsed["anim"] == "look-up"
    assert parsed["dir"] == "s"
    assert parsed["cell"] == "32"
    assert parsed["frames"] == 4


def test_round_trip_variations():
    name = naming.build_variations("mochi-bunny", 8, 8, 32, label="colorways")
    parsed = naming.parse_name(name, subject="mochi-bunny")
    assert parsed["kind"] == "variations"
    assert parsed["cols"] == 8
    assert parsed["rows"] == 8
    assert parsed["label"] == "colorways"


def test_checker_flags_non_conforming_names():
    files = [
        "mochi-bunny-s-32.png",
        "pixellab-cute-wizard-1790390374425.png",
        "mochi-bunny-idle-s-32-5f.png",
        "IMG_1234.HEIC",
    ]
    bad = naming.check_names(files)
    assert "pixellab-cute-wizard-1790390374425.png" in bad
    assert "IMG_1234.HEIC" in bad
    assert "mochi-bunny-s-32.png" not in bad
    assert "mochi-bunny-idle-s-32-5f.png" not in bad


def test_direction_order_matches_pixellab():
    assert naming.DIRECTIONS == ["s", "se", "e", "ne", "n", "nw", "w", "sw"]


def test_direction_full_name_mapping():
    assert naming.DIRECTION_TO_FULL["s"] == "south"
    assert naming.FULL_TO_DIRECTION["south-east"] == "se"


def test_blind_parse_rejects_uppercase_filenames():
    # Found during the 2026-09-27 D11 verification run: a staging filename
    # like "STAGEDhop-s-32-5f.png" must NOT blind-match (the old `.+`
    # subject group let regex backtracking split mid-word, e.g. subject
    # "STAGEDho" + a spurious 1-char anim "p" — matching almost any
    # filename ending in "-<dir>-<cell>-<n>f.<ext>" regardless of what came
    # before it, uppercase included).
    assert naming.parse_name("STAGEDhop-s-32-5f.png") is None
    assert naming.is_conforming("STAGEDhop-s-32-5f.png") is False


def test_blind_parse_word_boundary_ambiguity_is_real_not_a_bug():
    # A lowercase name that happens to look like a valid convention name
    # with an unintended subject boundary genuinely IS ambiguous -- the
    # fix only removes sub-word/uppercase false positives, not this.
    parsed = naming.parse_name("verify-hop-s-32-5f.png")
    assert parsed == {"kind": "animation", "subject": "verify"}
