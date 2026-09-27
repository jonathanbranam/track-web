from __future__ import annotations

import json

import pytest

from pixellab_tools import api


def test_get_balance(stub_env):
    env, _ = stub_env
    result = api.get("balance", env=env)
    assert result["subscription"]["generations"] == 1804.0


def test_auth_header_sent_and_never_logged(stub_env):
    env, state = stub_env
    api.get("balance", env=env)
    assert state.requests[-1]["auth"] == "Bearer test-secret-value"


def test_post_body_roundtrip(stub_env):
    env, state = stub_env
    result = api.post("echo", {"a": 1, "nested": {"b": 2}}, env=env)
    assert result["echo"] == {"a": 1, "nested": {"b": 2}}
    sent = json.loads(state.requests[-1]["body"])
    assert sent == {"a": 1, "nested": {"b": 2}}


def test_http_error_carries_status_and_body_never_headers(stub_env):
    env, _ = stub_env
    with pytest.raises(api.ApiError) as excinfo:
        api.get("error-path", env=env)
    err = excinfo.value
    assert err.status == 422
    assert "multiple of 4" in err.body
    assert "test-secret-value" not in str(err)
    assert "Authorization" not in str(err)


def test_wait_for_job_polls_until_completed(stub_env):
    env, state = stub_env
    job = api.wait_for_job("job-x", env=env, sleep_fn=lambda s: None)
    assert job["status"] == "completed"
    assert state.job_poll_counts["job-x"] == 2


def test_wait_for_job_raises_on_failed(stub_env):
    env, _ = stub_env
    with pytest.raises(api.JobFailedError) as excinfo:
        api.wait_for_job("failing", env=env, sleep_fn=lambda s: None)
    assert "failing" in str(excinfo.value)


def test_find_images_single_image():
    response = {"image": {"type": "base64", "base64": "aGVsbG8=", "format": "png"}}
    found = api.find_images(response)
    assert found == [(None, "aGVsbG8=")]


def test_find_images_bare_base64_string():
    # Verified 2026-09-27: POST /map-objects returns `image` as a raw base64
    # string (no {"type": "base64", ...} wrapper), unlike every other
    # endpoint checked.
    import base64

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"0" * 40
    encoded = base64.b64encode(png_bytes).decode()
    response = {"image": encoded, "status": "completed", "object_id": "abc-123"}
    found = api.find_images(response)
    assert found == [(None, encoded)]


def test_find_images_ignores_non_image_strings():
    response = {"description": "a berry bush", "id": "abc-123-def-456"}
    assert api.find_images(response) == []


def test_find_images_list():
    response = {"images": [
        {"type": "base64", "base64": "MA==", "format": "png"},
        {"type": "base64", "base64": "MQ==", "format": "png"},
    ]}
    found = api.find_images(response)
    assert [suffix for suffix, _ in found] == ["0", "1"]


def test_find_images_direction_keyed():
    response = {"images": {
        "south": {"type": "base64", "base64": "cw==", "format": "png"},
        "east": {"type": "base64", "base64": "ZQ==", "format": "png"},
    }}
    found = api.find_images(response)
    suffixes = sorted(suffix for suffix, _ in found)
    assert suffixes == ["east", "south"]


def test_decode_image_base64_strips_data_prefix():
    raw = api.decode_image_base64("data:image/png;base64,aGVsbG8=")
    assert raw == b"hello"


def test_save_found_images_direction_keyed(tmp_path):
    response = {"images": {
        "south": {"type": "base64", "base64": "c291dGg=", "format": "png"},
        "east": {"type": "base64", "base64": "ZWFzdA==", "format": "png"},
    }}
    saved = api.save_found_images(response, tmp_path, "idle")
    names = sorted(p.name for p in saved)
    assert names == ["idle-east.png", "idle-south.png"]
    assert (tmp_path / "idle-south.png").read_bytes() == b"south"


def test_save_found_images_list(tmp_path):
    response = {"images": [
        {"type": "base64", "base64": "MA==", "format": "png"},
        {"type": "base64", "base64": "MQ==", "format": "png"},
    ]}
    saved = api.save_found_images(response, tmp_path, "idle")
    names = sorted(p.name for p in saved)
    assert names == ["idle-0.png", "idle-1.png"]


def test_download_and_unzip(stub_env, tmp_path):
    env, _ = stub_env
    extracted = api.download_and_unzip("zip-test", tmp_path, env=env)
    names = sorted(p.name for p in extracted)
    assert names == ["sheet.json", "sheet.png"]
    assert (tmp_path / "sheet.png").read_bytes() == b"PNGDATA"
