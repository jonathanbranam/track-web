+++
id = "tw-9bf3"
title = "Talks: advise on running Python live for the 'Introduction to EFP's RAFT SDK' demo (Monday 2026-11-02)"
kind = "research"
state = "integrated"
created_at = "2026-10-30T01:05:23.089Z"
updated_at = "2026-10-30T01:12:42.574546Z"
created_by = "external:aide"
watchers = ["external:aide"]
priority = "high"
priority_at = "2026-10-30T01:05:29.066516Z"
branch = "bridle/py-advice"
commit = "cfcad1c3ce172158692decf9646e14e358eb1981"
summary = "Recommendation written in the ticket (06f9328), from training knowledge only (no web tools; unverified facts checklisted). Pick: Python runner on the presenter's laptop (127.0.0.1, token + Origin check), talk page in client-talks as front end with a LiveCodeStage (new StageKind via sceneSwap, or a standalone content page), built against a stub of the private RAFT API, real SDK swapped in at work; recorded-output fallback. Rejected: public backend (RCE, t4g.micro, private SDK), Pyodide with the real SDK. Open: which laptop presents, OK to put redacted API shape in repo, where the runner may live under trial scope. No CHANGELOG line (ticket doc only)."
ticket = "9bf3"
+++

docs/tickets/open/talks-advise-on-running-python-live-for-the-introduction-to-9bf3.md

## Thread

### note · external:aide · 2026-10-30T01:05:29.066Z
priority: normal -> high

### note · external:aide · 2026-10-30T01:05:29.209Z
Readied by aide 2026-10-29: the human asked for this advice directly (quoted in the ask). It is research: bring the recommendation back to the human, don't build.

### note · agent:py-advice · 2026-10-30T01:08:53.158Z
py-advice: BLOCKER, tool missing. WebSearch returned 'No such tool available: WebSearch. WebSearch is disabled for this session'; WebFetch is not offered to me at all. I read client-talks/ but cannot verify current Pyodide version, size, package support, micropip/CORS limits, or the c2 wiki. Also 'bridle ticket claim tw-9bf3' failed: 'task tw-9bf3 is not ready to claim' (settling until 9:15 PM). Asked manager how to proceed (enable web tools, approve curl, or write from unverified knowledge). Not substituting without approval.

### note · external:aide · 2026-10-30T01:09:05.486Z
aide, for the manager on py-advice's blocker: the answer mostly depends on the human's four questions about the RAFT SDK (pip/public, pure Python, network/credentials, laptop vs talks.branam.us), which are not answered yet. Aide suggests writing the recommendation from existing knowledge, marking version and size figures as unverified, and laying it out as a decision tree on those four answers. Enabling web tools is the orchestrator's call.

### note · external:aide · 2026-10-30T01:09:26.542Z
The human, 2026-10-29 via aide (verbatim): "hrm. RAFT is private at work only, but I could share the API it isn't very complicated. I could do most of the actual RAFT stuff at work... I'm not sure; seems like python backend would be much easier; I just feel like bridle could be a help here..." Aide: this answers the four questions in part. The SDK is private and can't be in this repo or on the public site, so Pyodide with the real SDK is out. The human leans toward a Python backend. The recommendation should weigh a Python runner on the presenter's laptop, built and tested here against a stub of the RAFT API (the human may share the API), with the real SDK dropped in at work. Still open: does the demo run from the work laptop, and is putting the API shape in this repo OK?

### question · external:orchestrator · 2026-10-30T01:09:35.023Z
FAILURE (rule report-task-failures): the research worker py-advice has no web tools. WebSearch is disabled and WebFetch is not offered, because the worker role in track-web's .bridle/config.toml has allowed_tools = ["Bash", "Read", "Edit", "Write", "Glob", "Grep"]. So it cannot check current Pyodide/PyScript facts. For now it writes the recommendation from training knowledge, with version-sensitive facts marked unverified and listed for checking. Question: may I add "WebSearch" and "WebFetch" to [roles.worker] allowed_tools in track-web's .bridle/config.toml (on the trial branch) and restart the track-web daemon, so research tickets can use the web and a short follow-up verifies the checklist? Recommendation: yes. It is the same gap as the h679 incident, and Monday's talk depends on getting these facts right. (orchestrator)

### note · agent:manager · 2026-10-30T01:10:08.021Z
Brief update (manager, relaying orchestrator m-0711, human via aide): RAFT is private (work only); the human may share its API. They lean toward a Python backend. Pyodide with the real SDK is out. Centre the Recommendation on a Python-backend design for running live code in client-talks: how the talk page sends code and shows output, where the backend runs, sandboxing, and what the human must provide from RAFT's API. Also say what 'bridle could help' could mean (e.g. agents building the backend and the demo snippets). Recommendation only; no building until the human picks.

### note · agent:manager · 2026-10-30T01:10:09.582Z
tw-9bf3: brief updated on the thread; centre the recommendation on a Python backend (see comment)

### note · agent:py-advice · 2026-10-30T01:10:49.705Z
done: Recommendation section on the ticket, centred on a laptop-local Python runner + stub RAFT API; open questions listed there; unverified-facts checklist at the end; 06f9328 (docs only, no check run; bridle ticket check ok; dev already merged)

### note · agent:manager · 2026-10-30T01:10:57.278Z
integrated: cfcad1c3ce172158692decf9646e14e358eb1981 (branch bridle/py-advice)

### note · agent:manager · 2026-10-30T01:11:06.485Z
cleanup: removed agent py-advice, branch bridle/py-advice

### note · external:aide · 2026-10-30T01:12:22.140Z
The human, 2026-10-29 via aide (verbatim): "let's hold on this; I don't htink it belongs in track-web ata ll". The RAFT SDK talk/demo is on hold and no build ticket gets filed. Whether the new-talk placeholder and the client-talks scope addition from tw-vhjj stay is not decided yet; aide is asking.

### note · external:orchestrator · 2026-10-30T01:12:42.574Z
On hold. The human, via aide (m-0492): "let's hold on this; I don't htink it belongs in track-web ata ll". Nothing more is filed or built for the RAFT SDK talk in track-web. The new-talk placeholder and the client-talks scope addition from tw-vhjj stay until the human decides whether to remove them. (orchestrator)
