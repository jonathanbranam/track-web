"""pl -- PixelLab REST API shim.

See docs/pixellab/README.md for usage and docs/pixellab/api.md for the
endpoint catalog. Spec: specs/pixellab-cli/spec.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence, TextIO

from . import api, args as args_mod, config, log


def _resolve_out_dir(raw: str, env: dict[str, str] | None) -> Path:
    p = Path(raw)
    if p.is_absolute():
        return p
    return config.get_game_assets_dir(env) / p


def _print_json(obj: Any, out: TextIO) -> None:
    print(json.dumps(obj, indent=2, default=str), file=out)


def _print_balance_human(data: dict[str, Any], out: TextIO) -> None:
    """Human summary of GET /balance.

    Verified 2026-09-27 response shape (see docs/pixellab/api.md
    "Verified 2026-09-27"):
    ``{"credits": {"type": "usd", "usd": 0.0},
       "subscription": {"type": "generations", "status": "active",
                         "plan": "Tier 1: Pixel Apprentice",
                         "generations": 1804.0, "total": 2000.0}}``
    Older/alternate flat shapes are also tolerated as a fallback.
    """
    sub = data.get("subscription") if isinstance(data.get("subscription"), dict) else None
    credits = data.get("credits") if isinstance(data.get("credits"), dict) else None

    plan = (sub or {}).get("plan") or data.get("plan") or data.get("subscription_plan") or data.get("tier")
    remaining = (
        (sub or {}).get("generations")
        or data.get("generations_remaining")
        or data.get("remaining_generations")
        or data.get("remaining")
        or data.get("generations")
    )
    total = (sub or {}).get("total")
    usd = (credits or {}).get("usd") if credits is not None else (data.get("credits") or data.get("usd_credits") or data.get("balance"))

    print(f"Plan: {plan}", file=out)
    if total is not None:
        print(f"Generations remaining: {remaining} / {total}", file=out)
    else:
        print(f"Generations remaining: {remaining}", file=out)
    if usd is not None:
        print(f"Credits: ${usd}", file=out)

    known_top = {"subscription", "credits", "plan", "subscription_plan", "tier",
                 "generations_remaining", "remaining_generations", "remaining",
                 "generations", "usd_credits", "balance"}
    for k, v in data.items():
        if k not in known_top:
            print(f"{k}: {v}", file=out)


def _job_ids(response: dict[str, Any]) -> dict[str, Any]:
    keys = ("background_job_id", "character_id", "object_id", "ui_asset_id", "job_id", "id")
    return {k: response[k] for k in keys if k in response}


def cmd_balance(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    data = api.get("balance", env=env)
    if ns.json:
        _print_json(data, out)
    else:
        _print_balance_human(data, out)
    return 0


def cmd_get(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    data = api.get(ns.path.lstrip("/"), env=env)
    _print_json(data, out)
    return 0


def _save_and_log_completion(
    endpoint: str,
    ids: dict[str, Any],
    usage: Any,
    final_response: Any,
    ns: argparse.Namespace,
    env: dict[str, str] | None,
) -> list[Path]:
    saved: list[Path] = []
    if ns.out:
        out_dir = _resolve_out_dir(ns.out, env)
        prefix = ns.prefix or endpoint.rsplit("/", 1)[-1]
        saved = api.save_found_images(final_response, out_dir, prefix)
    log.append_completion(endpoint, ids, usage, [str(p) for p in saved], env=env)
    return saved


def _job_ids_from_response(response: dict[str, Any]) -> list[str]:
    """Most endpoints return a single ``background_job_id``, but some (e.g.
    `characters/animations` with multiple ``directions``) return a
    ``background_job_ids`` list, one per direction — verified 2026-09-27,
    not documented in docs/pixellab/api.md before this.
    """
    single = response.get("background_job_id")
    if single:
        return [single]
    multi = response.get("background_job_ids")
    if isinstance(multi, list):
        return [j for j in multi if j]
    return []


def _direction_suffix(response: dict[str, Any], index: int) -> str | None:
    directions = response.get("directions")
    if isinstance(directions, list) and index < len(directions):
        return str(directions[index])
    return None


def cmd_post(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    endpoint = ns.endpoint.lstrip("/")
    base_body: dict[str, Any] | None = None
    if ns.body:
        base_body = json.loads(Path(ns.body).read_text())
    body, image_sources = args_mod.build_body(ns.args, base_body=base_body, env=env)

    if ns.dry_run:
        _print_json(args_mod.elide_images(body), out)
        return 0

    log.append_request(endpoint, body, image_sources, env=env)
    response = api.post(endpoint, body, env=env)
    ids = _job_ids(response)
    job_ids = _job_ids_from_response(response)

    if job_ids:
        if ns.wait:
            jobs: list[dict[str, Any]] = []
            for job_id in job_ids:
                try:
                    jobs.append(api.wait_for_job(job_id, env=env))
                except api.JobFailedError as exc:
                    log.append_completion(endpoint, ids, None, [], env=env, failed=True, detail=str(exc))
                    print(str(exc), file=sys.stderr)
                    return 1
            usages = [j.get("usage") for j in jobs]
            base_prefix = ns.prefix or endpoint.rsplit("/", 1)[-1]
            saved: list[Path] = []
            if ns.out:
                out_dir = _resolve_out_dir(ns.out, env)
                for i, job in enumerate(jobs):
                    final = job.get("last_response", job)
                    suffix = _direction_suffix(response, i)
                    if suffix is None and len(jobs) > 1:
                        suffix = str(i)
                    prefix = f"{base_prefix}-{suffix}" if suffix else base_prefix
                    saved.extend(api.save_found_images(final, out_dir, prefix))
            usage_for_log = usages[0] if len(usages) == 1 else usages
            log.append_completion(endpoint, ids, usage_for_log, [str(p) for p in saved], env=env)
            if ns.json:
                _print_json({"jobs": jobs} if len(jobs) > 1 else jobs[0], out)
            else:
                for job_id, usage in zip(job_ids, usages):
                    print(f"job {job_id}: completed", file=out)
                    if usage is not None:
                        print(f"usage: {usage}", file=out)
                for p in saved:
                    print(f"saved: {p}", file=out)
        else:
            if ns.json:
                _print_json(response, out)
            else:
                for job_id in job_ids:
                    print(f"job {job_id}: submitted", file=out)
        return 0

    # Synchronous response.
    usage = response.get("usage")
    saved = _save_and_log_completion(endpoint, ids, usage, response, ns, env)
    if ns.json:
        _print_json(response, out)
    else:
        print(f"{endpoint}: completed", file=out)
        if usage is not None:
            print(f"usage: {usage}", file=out)
        for p in saved:
            print(f"saved: {p}", file=out)
    return 0


def cmd_wait(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    try:
        job = api.wait_for_job(ns.job_id, env=env)
    except api.JobFailedError as exc:
        log.append_completion("wait", {"job_id": ns.job_id}, None, [], env=env, failed=True, detail=str(exc))
        print(str(exc), file=sys.stderr)
        return 1
    final = job.get("last_response", job)
    usage = job.get("usage")
    saved: list[Path] = []
    if ns.out:
        out_dir = _resolve_out_dir(ns.out, env)
        prefix = ns.prefix or "job"
        saved = api.save_found_images(final, out_dir, prefix)
    # `pl wait` resumes a job an earlier `pl post` already logged the
    # request for; record the completion here too, so provenance for a
    # deferred `--wait` isn't lost (design D3: "once known, a second line").
    log.append_completion("wait", {"job_id": ns.job_id}, usage, [str(p) for p in saved], env=env)
    if ns.json:
        _print_json(job, out)
    else:
        print(f"job {ns.job_id}: {job.get('status')}", file=out)
        if usage is not None:
            print(f"usage: {usage}", file=out)
        for p in saved:
            print(f"saved: {p}", file=out)
    return 0


def cmd_export(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    kind = "characters" if ns.kind == "character" else "objects"
    suffix = "zip" if ns.zip else "spritesheet"
    endpoint = f"{kind}/{ns.id}/{suffix}"

    if ns.out:
        out_dir = _resolve_out_dir(ns.out, env)
    elif ns.game:
        out_dir = config.get_game_assets_dir(env) / ns.game / "inbox"
    else:
        print("pl export: pass --game <name> or --out <dir>", file=sys.stderr)
        return 2

    extracted = api.download_and_unzip(endpoint, out_dir, env=env)
    if ns.json:
        _print_json({"files": [str(p) for p in extracted]}, out)
    else:
        for p in extracted:
            print(str(p), file=out)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="pl", description="PixelLab REST API shim")
    sub = parser.add_subparsers(dest="command", required=True)

    p_balance = sub.add_parser("balance", help="Show remaining generations, plan and credits")
    p_balance.add_argument("--json", action="store_true")
    p_balance.set_defaults(func=cmd_balance)

    p_get = sub.add_parser("get", help="GET an API path")
    p_get.add_argument("path")
    p_get.add_argument("--json", action="store_true")
    p_get.set_defaults(func=cmd_get)

    p_post = sub.add_parser("post", help="POST an API endpoint with compact arguments")
    p_post.add_argument("endpoint")
    p_post.add_argument("args", nargs="*", help="key=value / key:=json / key=@file arguments")
    p_post.add_argument("--body", help="Base body JSON file; arguments override it")
    p_post.add_argument("--wait", action="store_true", help="Poll a background job to completion")
    p_post.add_argument("--out", help="Directory to save result images (resolved against GAME_ASSETS_DIR)")
    p_post.add_argument("--prefix", help="Filename prefix for saved images")
    p_post.add_argument("--dry-run", action="store_true", help="Print the body, send nothing")
    p_post.add_argument("--json", action="store_true")
    p_post.set_defaults(func=cmd_post)

    p_wait = sub.add_parser("wait", help="Poll an existing background job to completion")
    p_wait.add_argument("job_id")
    p_wait.add_argument("--out")
    p_wait.add_argument("--prefix")
    p_wait.add_argument("--json", action="store_true")
    p_wait.set_defaults(func=cmd_wait)

    p_export = sub.add_parser("export", help="Download a character/object spritesheet export")
    p_export.add_argument("kind", choices=["character", "object"])
    p_export.add_argument("id")
    p_export.add_argument("--game", help="Save into GAME_ASSETS_DIR/<game>/inbox")
    p_export.add_argument("--out", help="Save into this directory instead")
    p_export.add_argument("--zip", action="store_true", help="Fetch the per-frame ZIP export instead")
    p_export.add_argument("--json", action="store_true")
    p_export.set_defaults(func=cmd_export)

    return parser


def run(argv: Sequence[str], env: dict[str, str] | None = None, out: TextIO = sys.stdout) -> int:
    parser = build_parser()
    ns = parser.parse_args(argv)
    try:
        return ns.func(ns, env, out)
    except config.ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except args_mod.ArgError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except api.ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 1


def main() -> None:
    sys.exit(run(sys.argv[1:]))


if __name__ == "__main__":  # pragma: no cover
    main()
