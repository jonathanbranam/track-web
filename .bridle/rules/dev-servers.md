---
id: dev-servers
severity: must
roles: [worker]
---
No browser verification in this trial: tests and the build are the check.
Don't start a dev server. The human's servers use ports 3000 and 6010-6055,
and harness uses 4100-4300 and 5175-5177; never stop, restart or bind any of
them. Don't create users or write to the human's `data.db`.

Why: bridle has no port registry yet (u8sm stage 2), and on 2026-08-21 stray
agent processes held the human's ports.
