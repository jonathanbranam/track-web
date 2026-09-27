"""assets -- per-game asset pipeline CLI.

See docs/pixellab/README.md for usage and
specs/game-asset-pipeline/spec.md for the full requirements.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence, TextIO

from . import adopt as adopt_mod, config, ingest as ingest_mod, manifest, pack as pack_mod, review as review_mod, ship as ship_mod


def _print_json(obj: Any, out: TextIO) -> None:
    print(json.dumps(obj, indent=2, default=str), file=out)


def _status_for(m: manifest.Manifest) -> dict[str, Any]:
    counts = m.status_counts()
    total = sum(counts.values())
    waiting = m.waiting_for_review()
    by_subject: dict[str, list[str]] = {}
    for entry in waiting:
        by_subject.setdefault(entry.get("subject", "?"), []).append(entry["id"])
    return {
        "total": total,
        "counts": counts,
        "waiting_for_review": [e["id"] for e in waiting],
        "waiting_by_subject": by_subject,
    }


def _print_status_human(game: str, status: dict[str, Any], out: TextIO) -> None:
    print(f"{game}: {status['total']} asset(s)", file=out)
    for st in manifest.ALL_STATUSES:
        count = status["counts"].get(st)
        if count:
            print(f"  {st}: {count}", file=out)
    waiting = status["waiting_by_subject"]
    if waiting:
        n = len(status["waiting_for_review"])
        print(f"  waiting for review ({n}):", file=out)
        for subject, ids in sorted(waiting.items()):
            print(f"    {subject}:", file=out)
            for asset_id in ids:
                print(f"      - {asset_id}", file=out)


def cmd_status(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    if ns.game:
        game_dir = manifest.ensure_workspace(assets_root, ns.game)
        m = manifest.Manifest(game_dir)
        status = _status_for(m)
        if ns.json:
            _print_json({"game": ns.game, **status}, out)
        else:
            _print_status_human(ns.game, status, out)
        return 0

    games = manifest.list_games(assets_root)
    results: dict[str, Any] = {}
    for g in games:
        m = manifest.Manifest(assets_root / g)
        results[g] = _status_for(m)
    if ns.json:
        _print_json({"games": results}, out)
    else:
        if not results:
            print(f"No game folders under {assets_root}", file=out)
        for g, status in results.items():
            _print_status_human(g, status, out)
            print(file=out)
    return 0


def cmd_mark(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    if len(ns.ids_and_status) < 2:
        print("assets mark: usage: assets mark <game> <id...> <status>", file=sys.stderr)
        return 2
    ids = ns.ids_and_status[:-1]
    status = ns.ids_and_status[-1]

    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)

    errors: list[str] = []
    changed: list[str] = []
    for asset_id in ids:
        try:
            m.mark(asset_id, status, note=ns.note, force=ns.force)
            changed.append(asset_id)
        except manifest.ManifestError as exc:
            errors.append(str(exc))

    if changed:
        m.save()
    for asset_id in changed:
        print(f"{asset_id}: -> {status}", file=out)
    for err in errors:
        print(err, file=sys.stderr)
    return 1 if errors else 0


def _parse_cell_arg(raw: str | None) -> int | tuple[int, int] | None:
    if raw is None:
        return None
    if "x" in raw:
        w, h = raw.split("x", 1)
        return int(w), int(h)
    return int(raw)


def cmd_ingest(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)
    cell = _parse_cell_arg(ns.cell)
    plan = ingest_mod.build_plan(
        game_dir, m, subject=ns.subject, anim=ns.anim, dir=ns.dir, cell=cell, label=ns.label,
    )

    if ns.dry_run:
        if ns.json:
            _print_json(
                {
                    "planned": [{"src": str(a.src), "dest": str(a.dest)} for a in plan.planned],
                    "unresolved": [{"path": str(p), "reason": r} for p, r in plan.unresolved],
                },
                out,
            )
        else:
            for a in plan.planned:
                print(f"{a.src.name} -> {a.dest}", file=out)
            for p, reason in plan.unresolved:
                print(f"skip {p.name}: {reason}", file=out)
        return 0

    new_ids = ingest_mod.apply_plan(plan, game_dir, m)
    if ns.json:
        _print_json(
            {
                "registered": new_ids,
                "unresolved": [{"path": str(p), "reason": r} for p, r in plan.unresolved],
            },
            out,
        )
    else:
        for asset_id in new_ids:
            print(f"registered: {asset_id}", file=out)
        for p, reason in plan.unresolved:
            print(f"left in inbox: {p.name} ({reason})", file=out)
    return 0


def cmd_adopt(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)

    if ns.undo:
        adopt_mod.undo(game_dir, Path(ns.undo), m)
        print(f"undone: {ns.undo}", file=out)
        return 0

    plan_path = Path(ns.plan)
    try:
        result = adopt_mod.apply_plan(game_dir, plan_path, m, dry_run=ns.dry_run)
    except adopt_mod.AdoptError as exc:
        for err in exc.errors:
            print(err, file=sys.stderr)
        return 1

    if ns.dry_run:
        moves = result.get("moves", [])
        if ns.json:
            _print_json({"moves": moves}, out)
        else:
            for mv in moves:
                print(f"{mv['from']} -> {mv['to']} (id={mv.get('entry', {}).get('id')})", file=out)
        return 0

    if ns.json:
        _print_json({"undo_record": str(result)}, out)
    else:
        print(f"adopted; undo record: {result}", file=out)
    return 0


def cmd_review(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)

    if ns.serve:
        server = review_mod.make_server(game_dir, m, port=ns.port)
        print(f"serving http://127.0.0.1:{ns.port}/review/index.html (Ctrl+C to stop)", file=out)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
        return 0

    out_path = review_mod.write_review(game_dir, m, served=False)
    print(f"wrote {out_path}", file=out)
    return 0


def cmd_pack(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)
    try:
        png_path, json_path = pack_mod.pack(game_dir, m, ns.subject, env=env)
    except pack_mod.PackError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if ns.json:
        _print_json({"png": str(png_path), "json": str(json_path)}, out)
    else:
        print(f"wrote {png_path}", file=out)
        print(f"wrote {json_path}", file=out)
    return 0


def cmd_ship(ns: argparse.Namespace, env: dict[str, str] | None, out: TextIO) -> int:
    assets_root = config.get_game_assets_dir(env)
    game_dir = manifest.ensure_workspace(assets_root, ns.game)
    m = manifest.Manifest(game_dir)
    try:
        results = ship_mod.ship(game_dir, m, subjects=ns.subjects or None, dry_run=ns.dry_run, env=env)
    except ship_mod.ShipError as exc:
        for err in exc.errors:
            print(err, file=sys.stderr)
        return 1
    if ns.json:
        _print_json({"shipped" if not ns.dry_run else "would_ship": results}, out)
    else:
        verb = "would ship" if ns.dry_run else "shipped"
        for r in results:
            print(f"{verb} {r['subject']} -> {r['dest']} (sha256 {r['sha256'][:12]}…)", file=out)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="assets", description="Per-game asset pipeline CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_status = sub.add_parser("status", help="Show per-status counts and what needs review")
    p_status.add_argument("game", nargs="?", help="Game folder name; omit to summarise every game")
    p_status.add_argument("--json", action="store_true")
    p_status.set_defaults(func=cmd_status)

    p_mark = sub.add_parser("mark", help="Change one or more assets' status")
    p_mark.add_argument("game")
    p_mark.add_argument("ids_and_status", nargs="+", metavar="id... status")
    p_mark.add_argument("--note")
    p_mark.add_argument("--force", action="store_true")
    p_mark.set_defaults(func=cmd_mark)

    p_ingest = sub.add_parser("ingest", help="Register files from inbox/ under convention names")
    p_ingest.add_argument("game")
    p_ingest.add_argument("--subject")
    p_ingest.add_argument("--anim")
    p_ingest.add_argument("--dir")
    p_ingest.add_argument("--cell")
    p_ingest.add_argument("--label")
    p_ingest.add_argument("--dry-run", action="store_true")
    p_ingest.add_argument("--json", action="store_true")
    p_ingest.set_defaults(func=cmd_ingest)

    p_adopt = sub.add_parser("adopt", help="One-time move/rename of existing files from a plan")
    p_adopt.add_argument("game")
    p_adopt.add_argument("plan", nargs="?", help="Plan YAML path")
    p_adopt.add_argument("--dry-run", action="store_true")
    p_adopt.add_argument("--undo", metavar="RECORD", help="Undo a previous apply using its undo record")
    p_adopt.add_argument("--json", action="store_true")
    p_adopt.set_defaults(func=cmd_adopt)

    p_review = sub.add_parser("review", help="Generate (and optionally serve) the review contact sheet")
    p_review.add_argument("game")
    p_review.add_argument("--serve", action="store_true")
    p_review.add_argument("--port", type=int, default=8765)
    p_review.set_defaults(func=cmd_review)

    p_pack = sub.add_parser("pack", help="Pack approved assets of one subject into a sheet + Aseprite JSON")
    p_pack.add_argument("game")
    p_pack.add_argument("subject")
    p_pack.add_argument("--json", action="store_true")
    p_pack.set_defaults(func=cmd_pack)

    p_ship = sub.add_parser("ship", help="Copy dist/ sheets to the configured destination")
    p_ship.add_argument("game")
    p_ship.add_argument("subjects", nargs="*", help="Subjects to ship; omit to ship every packed subject")
    p_ship.add_argument("--dry-run", action="store_true")
    p_ship.add_argument("--json", action="store_true")
    p_ship.set_defaults(func=cmd_ship)

    return parser


def run(argv: Sequence[str], env: dict[str, str] | None = None, out: TextIO = sys.stdout) -> int:
    parser = build_parser()
    ns = parser.parse_args(argv)
    try:
        return ns.func(ns, env, out)
    except config.ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except manifest.ManifestError as exc:
        print(str(exc), file=sys.stderr)
        return 1


def main() -> None:
    sys.exit(run(sys.argv[1:]))


if __name__ == "__main__":  # pragma: no cover
    main()
