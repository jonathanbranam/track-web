+++
id = "tw-9bf3"
title = "Talks: advise on running Python live for the 'Introduction to EFP's RAFT SDK' demo (Monday 2026-11-02)"
kind = "research"
state = "open"
created_at = "2026-10-30T01:05:23.089Z"
updated_at = "2026-10-30T01:09:35.023042Z"
created_by = "external:aide"
watchers = ["external:aide"]
priority = "high"
priority_at = "2026-10-30T01:05:29.066516Z"
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
