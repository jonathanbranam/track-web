# Software Engineering Skills Are More Important Than Ever
### ADM Talk — 10 min + 5 min Q&A

---

## Context

- **Format**: 10 minutes talking, 5 minutes Q&A buffer — extremely tight, every section must earn its time
- **Audience**: ADM — approximately 570 people across the engineering job family, including software, data, and machine learning engineers, plus leaders
- **Adoption spectrum**: full range, from people who haven't touched AI coding tools yet to people using them daily — the talk needs to land for both ends
- **Tone target**: honest and personal, not promotional and not dismissive — genuine fear alongside genuine optimism, technical where it matters

---

## 1. Cold open: "SWE is dead" (≈1–1:30 min)

- Serious tone throughout — not a joke, not a "predictions are always wrong" bit
- Radiology parallel: brother has been a radiologist this whole time
  - Hinton, 2016: told people to stop training radiologists, deep learning would surpass them within five years
  - What actually happened: radiologist headcount rose, and the field now faces a growing shortage
- Honest admission: you initially treated this as a special case — high-stakes medicine, regulation, human trust — and assumed software engineering had no such protection. You took "software engineering is dead" seriously, not as hype to dismiss.
- Pivot line into personal fear section

## 2. The personal fear (≈1 min)

- Brief, honest, no hedging: dread, felt like your value was eroding, questioned whether you'd still be a useful contributor
- Keep this short and unresolved for now — return to it at the close
- Who I am: one sentence, spoken not slide. Something like: *"I've been writing code since I was a kid on a Commodore 64 — assembly, C++, game graphics, web, now ML. I love this craft."*

## 3. The thesis — reframed as a journey, not a claim (≈1 min)

- Not "I set out to prove X" — instead: *"I set out to discover whether I still provided value as a software engineer, and whether our discipline had a future."*
- Serious, unresolved tone — you didn't know the answer yet
- Turning point: Steve Yegge and Gene Kim's book *Vibe Coding* (2025) — subtitle explicitly "Building Production-Grade Software"
  - Yegge's credibility mattered specifically: ~30 years in the industry, ~19 combined at Google/Amazon, a million+ lines of production code, led teams up to 150 people — not someone chasing hype or satisfied with toy demos
  - Hearing that *Yegge* had taken this seriously was the signal to re-evaluate your own skepticism
- Two principles you came to (re)discover through the journey, stated plainly once here:
  1. **Optimize for feedback / learning**
  2. **Manage complexity**
- Setup line: *"I tested this on myself. Here's what happened."*

## 4. Stage 1 — Vibe coding (≈2 min)

Show, don't tell — brief, illustrated with real prompt examples, minimal narration. (Note: resist the pull toward React Native / testing / visual-inspection tangents — stay tight.)

- **Failure 1 — wrong thing built despite a real requirements doc.** Wrote a detailed requirements doc for a life-management / time / priority / habit-tracking app. Thought intent was accurately captured. Agent still made significant assumptions about meaning and behavior, shipped many screens/tabs fast, much of it not matching intent. Heavy rework, had to reverse-engineer what was actually built.
- **Failure 2 — bug whack-a-mole.** Slide shows a compressed timeline: prompt ("fix the bug, data isn't sticking between settings and habits page") → time/tokens pass → still broken → "no, still not working" → more time/tokens → still broken. Narrated live over the slide. You became a manual QA loop — click, describe, re-prompt — while the agent moved two steps forward, one step back, sometimes reintroducing old bugs.
- **Summary line**: *"The agent can write code. It's not a software engineer."*
- Visual: prompt snippets + the time/token timeline. No live coding.

## 5. Stage 2 — Spec-driven development (≈2 min)

- **Bookend open**: you were following advice from successful AI engineers — read the plan, not the code. [Detail of framing — whether to name Horthy here or later — still open, see notes below]
- **The story**: built a deployment-tracking dashboard, pulled data from Tableau as CSV, used the CSV as the data store — a deliberate, discussed decision with the agent, not an accident. Built using SDD; spec written, plan aligned, result worked well and met requirements.
- **The discovery**: a coworker pushed a similar app to QA using DynamoDB and offered the framework. Checking the cost to convert surfaced what was actually built: the agent had loaded the entire CSV into memory via pandas, joined tables in-memory, mutated the whole dataset, and written it back to disk on every change — not a real data layer, despite CSV having been an intentional and reasonable choice at the data-store level.
- **Why it slipped through**: solo project, light review only when the agent hit a visible problem. The persistence *decision* was reviewed and discussed; the persistence *implementation* wasn't. SDD got a working, requirement-fulfilling result — and still let this through, because the gap was in reading, not planning.
- **Current status**: not migrated. Cost to convert now looks higher than a rewrite would be. Living with it — which is itself evidence for the closing point about cost of change.
- **Bookend close**: parallel to Horthy's own public reversal — arrived independently at the same conclusion: you have to read the code if you want a maintainable system.
- Visual: still open — possible simple before/after of "what the spec said" vs. "what actually got built"

## 6. Stage 3 — Harness (≈2 min)

- What it is: moving beyond a single plan/spec into a system — tooling, sub-agents, and skills that constrain *how* code gets written and check it afterward
- When the AI missteps, you improve the harness, not just re-prompt
- Principles 1 and 2 combined and systematized: fast feedback (tests the agent runs and fixes itself) + complexity management (review agents checking design smells, coupling, boundaries)
- Iteration-size point lives here too: small specs, small diffs — a giant spec is a waterfall document with extra steps, producing a giant PR nobody can review
- Visual/demo: pre-recorded or animated flow — spec → apply → tests run → review agent flags an issue → harness updated. Best "show, don't tell" moment. Keep under 60–90 seconds.

## 7. The turn: cost of change is not free (≈30–60 sec)

- Likely folded into the close rather than standing alone, pending timing
- Line to land: *"The cost of writing new code always feels lower than the cost of changing existing code — whether that code is handwritten or AI-written."*
- The more code produced, the more this matters, not less

## 8. Close: back to the fear (≈1 min)

- Return to the opening dread. It was real. It was also wrong — not because AI is harmless or limited, but because the thing that was actually valuable was never the typing.
- Where you are now: building more than ever — side projects, work projects — and at work, value shows up in review, in guiding the agent and teammates, in judgment calls
- Final line, tying back to title: coding may get commoditized; software engineering — judgment, design, architecture, knowing what "good" looks like — is the part that doesn't

---

## Timing check (rough, pending final cuts)

| Section | Time | Running total |
|---|---|---|
| Cold open | 1:15 | 1:15 |
| Personal fear + who I am | 1:00 | 2:15 |
| Thesis / turning point | 1:00 | 3:15 |
| Vibe coding | 2:00 | 5:15 |
| SDD | 2:00 | 7:15 |
| Harness | 2:00 | 9:15 |
| Cost of change + close | 1:00 | 10:15 |

Still slightly over — same likely levers as before: trim harness narration to let the visual carry it, or tighten vibe coding's second failure to the visual doing most of the work.

## Open questions for next pass

- SDD bookend: confirm whether Horthy is named at the *open* of the SDD section (framing the advice you were following) or only revealed at the *close* (the "turns out I wasn't alone" beat) — noted as still undecided, not to be resolved without your input
- Visual for SDD section not yet defined
- Visual for vibe coding section (prompt snippets + timeline) not yet built
- Confirm final title/theme wording
- Confirm what the harness demo asset actually shows before finalizing section 6 timing
