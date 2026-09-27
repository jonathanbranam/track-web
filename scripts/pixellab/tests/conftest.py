from __future__ import annotations

import io
import json
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest


class StubState:
    def __init__(self):
        self.job_poll_counts: dict[str, int] = {}
        self.requests: list[dict] = []


def make_handler(state: StubState):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # silence
            pass

        def _record(self, method):
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length) if length else b""
            state.requests.append(
                {
                    "method": method,
                    "path": self.path,
                    "auth": self.headers.get("Authorization"),
                    "body": body.decode("utf-8") if body else None,
                }
            )
            return body

        def _json(self, status, payload):
            data = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            self._record("GET")
            if self.path == "/balance":
                self._json(200, {
                    "credits": {"type": "usd", "usd": 0.0},
                    "subscription": {
                        "type": "generations", "status": "active",
                        "plan": "Tier 1: Pixel Apprentice",
                        "generations": 1804.0, "total": 2000.0,
                    },
                })
            elif self.path == "/characters":
                self._json(200, {"characters": [{"id": "abc", "name": "test"}]})
            elif self.path.startswith("/background-jobs/"):
                job_id = self.path.rsplit("/", 1)[-1]
                if job_id == "failing":
                    self._json(200, {"id": job_id, "status": "failed", "detail": "boom"})
                elif job_id == "immediate":
                    self._json(
                        200,
                        {
                            "id": job_id,
                            "status": "completed",
                            "last_response": {"image": {"type": "base64", "base64": "aGVsbG8=", "format": "png"}},
                            "usage": {"cost": 1},
                        },
                    )
                elif job_id in ("dirjob-south", "dirjob-east"):
                    count = state.job_poll_counts.get(job_id, 0) + 1
                    state.job_poll_counts[job_id] = count
                    direction = job_id.rsplit("-", 1)[-1]
                    b64 = {"south": "c291dGg=", "east": "ZWFzdA=="}[direction]
                    if count < 2:
                        self._json(200, {"id": job_id, "status": "processing"})
                    else:
                        self._json(
                            200,
                            {
                                "id": job_id,
                                "status": "completed",
                                "last_response": {"image": {"type": "base64", "base64": b64, "format": "png"}},
                                "usage": {"cost": 1},
                            },
                        )
                else:
                    count = state.job_poll_counts.get(job_id, 0) + 1
                    state.job_poll_counts[job_id] = count
                    if count < 2:
                        self._json(200, {"id": job_id, "status": "processing"})
                    else:
                        self._json(
                            200,
                            {
                                "id": job_id,
                                "status": "completed",
                                "last_response": {
                                    "images": {
                                        "south": {"type": "base64", "base64": "c291dGg=", "format": "png"},
                                        "east": {"type": "base64", "base64": "ZWFzdA==", "format": "png"},
                                    }
                                },
                                "usage": {"cost": 2},
                            },
                        )
            elif self.path == "/zip-test" or self.path.endswith("/spritesheet") or self.path.endswith("/zip"):
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w") as zf:
                    zf.writestr("sheet.png", b"PNGDATA")
                    zf.writestr("sheet.json", json.dumps({"ok": True}))
                data = buf.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            elif self.path == "/error-path":
                self._json(422, {"detail": "bad params: width must be a multiple of 4"})
            else:
                self._json(404, {"detail": "not found"})

        def do_POST(self):
            body = self._record("POST")
            if self.path == "/echo":
                parsed = json.loads(body) if body else {}
                self._json(200, {"background_job_id": "job-1", "echo": parsed})
            elif self.path == "/animate-with-text-v3":
                self._json(200, {"background_job_id": "job-x"})
            elif self.path == "/characters/animations":
                self._json(
                    200,
                    {
                        "background_job_ids": ["dirjob-south", "dirjob-east"],
                        "directions": ["south", "east"],
                        "status": "processing",
                    },
                )
            elif self.path == "/sync-image":
                self._json(200, {"image": {"type": "base64", "base64": "c3luYw==", "format": "png"}})
            elif self.path == "/error-path":
                self._json(422, {"detail": "bad params"})
            else:
                self._json(404, {"detail": "not found"})

    return Handler


@pytest.fixture
def stub_server():
    state = StubState()
    server = HTTPServer(("127.0.0.1", 0), make_handler(state))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        yield base_url, state
    finally:
        server.shutdown()
        thread.join(timeout=5)


@pytest.fixture
def stub_env(stub_server):
    base_url, state = stub_server
    env = {"PIXELLAB_SECRET": "test-secret-value", "PIXELLAB_API_BASE": base_url}
    return env, state
