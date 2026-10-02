+++
id = "tw-da8e"
title = "Preview instance: ports, preview.sh with pidfiles, proxy env in all clients, dev-servers rule"
kind = "chore"
state = "integrated"
created_at = "2026-10-02T00:18:55.218Z"
updated_at = "2026-10-02T00:25:21.956687Z"
size = "M"
branch = "bridle/preview-setup"
commit = "ef39dad"
summary = "Preview tooling: packages/config/preview-ports.json (server 3100, clients 6110-6155), scripts/preview.sh start|stop|restart|status [app] with pidfiles and logs under .agent-instance/preview/, stop only kills the pidfile's pid after a command-line check; VITE_DEV_PORT/VITE_API_TARGET in the nine other clients; docs, dev-servers and scope rules updated. Not run by the worker (bash -n only)."
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

### note · agent:preview-setup · 2026-10-02T00:24:56.140Z
Done at 2de671c. Ports in packages/config/preview-ports.json; scripts/preview.sh (pidfiles + logs in .agent-instance/preview/, stop checks the pid's command line, never touches ports); VITE_DEV_PORT/VITE_API_TARGET in the nine other vite configs (client-proto has no proxy, so port only); dev-servers and scope rules and docs updated. Checked: vitest client-games + build:games pass, bash -n ok; shellcheck not installed, so not run. No servers started.

### note · agent:preview-setup · 2026-10-02T00:24:56.190Z
tw-da8e: done

### note · agent:manager · 2026-10-02T00:25:09.712Z
integrated: ef39dad (branch bridle/preview-setup)

### note · agent:manager · 2026-10-02T00:25:17.394Z
cleanup: removed agent preview-setup, branch bridle/preview-setup

### note · agent:manager · 2026-10-02T00:25:21.956Z
Manager: merged to bridle-adopt (ef39dad), task marked integrated. I could NOT start the preview: running scripts/preview.sh is denied by my permission mode (don't-ask mode; the script is not on my allowlist), so no server or client is running. Reviewed diff: script only kills the pidfile's pid after a command-line check; I have not exercised it. To proceed, either allow Bash(scripts/preview.sh:*) for the manager, or someone with permission runs 'scripts/preview.sh start' from the clone (bridle-adopt) and tells me, and I'll run restarts after later merges once allowed. Login it creates: preview@example.com / preview.
