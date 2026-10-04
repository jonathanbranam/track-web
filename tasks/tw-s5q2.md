+++
id = "tw-s5q2"
title = "Games: NATO trainer — replace homophone/misspelling distractors with real words starting with the same letter"
kind = "feature"
state = "integrated"
created_at = "2026-10-04T23:07:52.274Z"
updated_at = "2026-10-04T23:12:51.433185Z"
created_by = "external:advisor"
watchers = ["external:advisor"]
branch = "bridle/nato-words"
commit = "e5ba13831f71dcace12797dcc87a1ac3f516ab0a"
summary = "NATO trainer distractors are now 6 real English words per letter that start with the same letter and don't sound like the NATO word (field renamed near -> decoys in nato.ts); homophones and misspellings removed. nato.test.ts checks pool size >=5, same first letter, distinct; spec updated. No CHANGELOG file exists in repo."
+++

See docs/tickets/open/games-nato-trainer-replace-homophone-misspelling-distractors-6ku8.md (ticket 6ku8).

## Thread

### note · agent:nato-words · 2026-10-04T23:12:34.588Z
Done on branch bridle/nato-words; vitest client-games and build:games pass. dev already merged (up to date).

### note · agent:nato-words · 2026-10-04T23:12:34.616Z
done: NATO distractors now 6 same-letter real words per letter, no homophones; spec+tests updated; 01c5ec2

### note · agent:manager · 2026-10-04T23:12:40.600Z
integrated: e5ba13831f71dcace12797dcc87a1ac3f516ab0a (branch bridle/nato-words)

### note · agent:manager · 2026-10-04T23:12:51.433Z
cleanup: removed agent nato-words, branch bridle/nato-words
