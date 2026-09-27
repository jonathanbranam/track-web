from __future__ import annotations

import io
import json

from pixellab_tools import pl


def run_pl(argv, env):
    out = io.StringIO()
    code = pl.run(argv, env=env, out=out)
    return code, out.getvalue()


def test_balance_json_is_raw_response(stub_env):
    env, _ = stub_env
    code, output = run_pl(["balance", "--json"], env)
    assert code == 0
    assert json.loads(output) == {
        "credits": {"type": "usd", "usd": 0.0},
        "subscription": {
            "type": "generations", "status": "active",
            "plan": "Tier 1: Pixel Apprentice",
            "generations": 1804.0, "total": 2000.0,
        },
    }


def test_balance_human_summary(stub_env):
    env, _ = stub_env
    code, output = run_pl(["balance"], env)
    assert code == 0
    assert "Pixel Apprentice" in output
    assert "1804" in output
    assert "test-secret-value" not in output


def test_get_characters_json(stub_env):
    env, _ = stub_env
    code, output = run_pl(["get", "characters", "--json"], env)
    assert code == 0
    assert json.loads(output)["characters"][0]["id"] == "abc"


def test_post_dry_run_sends_nothing_and_elides_image(stub_env, tmp_path, monkeypatch):
    env, state = stub_env
    image = tmp_path / "ur.png"
    image.write_bytes(b"totally-real-png-bytes")
    monkeypatch.chdir(tmp_path)
    before = len(state.requests)
    code, output = run_pl(
        ["post", "echo", "reference_image=@ur.png", "description=mochi bunny", "--dry-run"],
        env,
    )
    assert code == 0
    assert len(state.requests) == before  # no request sent
    body = json.loads(output)
    assert "totally-real-png-bytes" not in output
    assert body["description"] == "mochi bunny"
    assert "elided" in body["reference_image"]["base64"]


def test_post_wait_out_saves_images_and_logs_redacted(stub_env, tmp_path, monkeypatch):
    env, state = stub_env
    env["GAME_ASSETS_DIR"] = str(tmp_path / "assets")
    image_dir = tmp_path / "cwd"
    image_dir.mkdir()
    image = image_dir / "first_frame.png"
    image.write_bytes(b"first-frame-bytes-not-secret")
    monkeypatch.chdir(image_dir)

    code, output = run_pl(
        [
            "post",
            "animate-with-text-v3",
            "first_frame=@first_frame.png",
            "action=idle",
            "frame_count:=4",
            "--wait",
            "--out",
            "mimlings/inbox",
            "--prefix",
            "idle",
        ],
        env,
    )
    assert code == 0
    saved_dir = tmp_path / "assets" / "mimlings" / "inbox"
    assert (saved_dir / "idle-south.png").exists()
    assert (saved_dir / "idle-east.png").exists()
    assert (saved_dir / "idle-south.png").read_bytes() == b"south"

    log_file = tmp_path / "assets" / "pixellab-log.jsonl"
    lines = log_file.read_text().splitlines()
    assert len(lines) == 2
    for raw_line in lines:
        assert "test-secret-value" not in raw_line
        assert "first-frame-bytes-not-secret" not in raw_line
    request_line = json.loads(lines[0])
    assert request_line["body"]["first_frame"] == {"@": str(image)}
    completion_line = json.loads(lines[1])
    assert completion_line["usage"] == {"cost": 2}
    assert any("idle-south.png" in f for f in completion_line["saved_files"])


def test_post_multi_job_response_waits_for_all_and_saves_per_direction(stub_env, tmp_path):
    env, state = stub_env
    env["GAME_ASSETS_DIR"] = str(tmp_path / "assets")
    code, output = run_pl(
        [
            "post", "characters/animations",
            "character_id=abc123", "mode=v3",
            'directions:=["south","east"]',
            "--wait", "--out", "mimlings/inbox/verify", "--prefix", "idle",
        ],
        env,
    )
    assert code == 0
    saved_dir = tmp_path / "assets" / "mimlings" / "inbox" / "verify"
    assert (saved_dir / "idle-south.png").read_bytes() == b"south"
    assert (saved_dir / "idle-east.png").read_bytes() == b"east"

    log_file = tmp_path / "assets" / "pixellab-log.jsonl"
    lines = log_file.read_text().splitlines()
    completion = json.loads(lines[-1])
    assert completion["usage"] == [{"cost": 1}, {"cost": 1}]


def test_wait_command_reports_failure(stub_env, tmp_path):
    env, _ = stub_env
    env["GAME_ASSETS_DIR"] = str(tmp_path / "assets")
    code, output = run_pl(["wait", "failing"], env)
    assert code == 1


def test_wait_command_logs_completion(stub_env, tmp_path):
    # A `pl post` without --wait only logs the request line; `pl wait`
    # resuming that job later must still log its completion (found during
    # the 2026-09-27 D11 run: edit-image-pixen returned async and the
    # follow-up `pl wait` silently dropped the completion line).
    env, _ = stub_env
    env["GAME_ASSETS_DIR"] = str(tmp_path / "assets")
    code, _ = run_pl(["wait", "job-x"], env)
    assert code == 0
    log_file = tmp_path / "assets" / "pixellab-log.jsonl"
    lines = [line for line in log_file.read_text().splitlines() if '"endpoint": "wait"' in line]
    assert len(lines) == 1
    entry = json.loads(lines[0])
    assert entry["type"] == "completion"
    assert entry["ids"] == {"job_id": "job-x"}


def test_export_character_spritesheet(stub_env, tmp_path):
    env, _ = stub_env
    out_dir = tmp_path / "out"
    code, output = run_pl(["export", "character", "abc123", "--out", str(out_dir), "--json"], env)
    assert code == 0
    files = json.loads(output)["files"]
    assert any(f.endswith("sheet.png") for f in files)
    assert (out_dir / "sheet.png").exists()


def test_missing_secret_exits_nonzero_without_request():
    out = io.StringIO()
    # Pre-set an empty value so config.load_env's repo .env (which has a real
    # PIXELLAB_SECRET) does not fill it in — this simulates "set nowhere".
    code = pl.run(["balance"], env={"PIXELLAB_SECRET": ""}, out=out)
    assert code == 1


def test_unreadable_at_path_exits_before_request(stub_env, tmp_path, monkeypatch):
    env, state = stub_env
    cwd = tmp_path / "cwd2"
    cwd.mkdir()
    monkeypatch.chdir(cwd)
    env["GAME_ASSETS_DIR"] = str(tmp_path / "assets2")
    before = len(state.requests)
    code, output = run_pl(["post", "echo", "reference_image=@missing.png"], env)
    assert code == 2
    assert len(state.requests) == before
