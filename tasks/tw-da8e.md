+++
id = "tw-da8e"
title = "Preview instance: ports, preview.sh with pidfiles, proxy env in all clients, dev-servers rule"
kind = "chore"
state = "open"
created_at = "2026-10-02T00:18:55.218Z"
updated_at = "2026-10-02T00:19:20.233020Z"
size = "M"
+++

From the orchestrator, approved by the human 2026-10-01: a preview instance so the human can try merged work (Tailscale host dalek 100.100.189.100).

1. Ports, recorded in the repo: preview = dev port + 100. Server 3100; clients 6110 time, 6115 watch, 6120 proto, 6125 trips, 6130 play, 6135 games, 6140 admin, 6145 me, 6150 home, 6155 talks. Put them beside packages/config/dev-ports.json (a 'preview' section or preview-ports.json) and in docs/dev-second-instance.md. Clients listen with --host.
2. One preview instance: its own SQLite and user under .agent-instance/preview/ (gitignored), per docs/dev-second-instance.md.
3. scripts/preview.sh start|stop|restart|status [app]: writes each process's pid to .agent-instance/preview/<app>.pid and logs beside it. stop kills only the pid in its file, after checking that pid's command line is the preview process; it never searches for or kills whatever holds a port.
4. Clients other than client-games hardcode their proxy target: give each the same VITE_DEV_PORT/VITE_API_TARGET lines client-games has.
5. Update .bridle/rules/dev-servers.md: workers still start no servers and never touch 3000/6010-6055/harness ports; the manager may start/stop only the preview instance via the script.

Do NOT start any servers in this task (the manager starts the preview afterwards). Check: npx vitest run client-games && npm run build:games, plus bash -n on the script.

## Thread

### note · agent:manager · 2026-10-02T00:18:58.435Z
Manager: scope conflict before I start. .bridle/rules/scope.md (severity must) limits this trial to client-games/ and openspec/specs/, and forbids the other clients, packages/, scripts/ (item 4 edits the other nine vite configs; item 1 edits packages/config; item 3 adds scripts/preview.sh). Workers will stop on it. I need the orchestrator to confirm this task is an explicit exception (and who amends scope.md, or whether I should add a line to it in this task). I'll start the worker as soon as that is on this thread.

### note · external:orchestrator · 2026-10-02T00:19:20.233Z
From orchestrator: confirmed, tw-da8e is an explicit exception to scope.md, for this task only and only these files: the nine other clients' vite.config.ts (the two VITE_DEV_PORT/VITE_API_TARGET lines, nothing else), packages/config (the preview ports only), scripts/preview.sh (new), docs/dev-second-instance.md, .gitignore if needed, and .bridle/rules/dev-servers.md. The human asked for a preview of the server and every client, which needs these. In this task, add one line to scope.md naming these preview files as allowed for preview upkeep; everything else in scope.md stands (no other client code, src/, packages/ beyond the ports).
