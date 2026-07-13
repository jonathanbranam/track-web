# Talking Points & References
### Working doc — quotes, sources, and notes for practice. Not slide content.

---

## Section 1: Cold open — "SWE is dead"

### Radiology parallel (brother is a radiologist)
- **Who said it**: Geoffrey Hinton (corrected from memory — not LeCun, not Bengio)
- **When/where**: 2016, at the Creative Destruction Lab
- **Exact quote**: "People should stop training radiologists now. It's just completely obvious that within five years deep learning is going to do better than radiologists. It might be 10 years, but we've got plenty of radiologists already."
- **What actually happened**:
  - Number of radiologists in the US rose ~7% between 2015–2019, not fell
  - There is now a radiologist shortage, projected to grow over the next decade, with imaging backlogged for months at some centers
  - AI tools used as complements (worklist management, image enhancement, measurements) — not replacements for diagnostic judgment
- **Framing (per your direction)**: play it straight, not as a joke. A world-renowned expert made a confident, specific, falsifiable prediction about a high-stakes field, and it didn't happen. Your brother lived through the whole arc while remaining employed and in demand.
- **The turn**: you initially assumed radiology was a special case — high stakes, regulation, human trust — and that software engineering had no equivalent protection. You took "software engineering is dead" seriously rather than dismissing it. This sets up real stakes, not a punchline.

### "Coding is dead" — supporting references (optional, not currently in outline as slide content)
- Recurring headline pattern: 2022/23 "next year," 2024 "this time for real, AI CEO said so," 2025 "guy who knows a guy built a startup with an LLM in 3 hours"
- Boris Cherny (lead developer, Claude Code, Anthropic): "In the last thirty days, 100% of my contributions to Claude Code were written by Claude Code." Real, attributable, sharp — usable as a single line if you want one instead of a montage.
- Independent industry framing already circulating: "coding is dead, software engineering isn't" (syntax vs. judgment) — your thesis rhymes with this, though you arrived at it through your own experience.

---

## Section: Thesis / turning point — Steve Yegge / Gene Kim

- **Title**: *Vibe Coding: Building Production-Grade Software With GenAI, Chat, Agents, and Beyond*
- **Authors**: Gene Kim and Steve Yegge (Dario Amodei also credited)
- **Published**: 2025, IT Revolution
- **Correction from memory**: co-author is **Gene Kim**, not "Jean Kim." Gene Kim is the WSJ-bestselling author of *The Phoenix Project* and *The DevOps Handbook*.
- **Why Yegge's endorsement mattered to you**: ~30 years in the industry, ~19 combined at Google and Amazon, over a million lines of production code across a dozen languages, led teams up to 150 people. Not someone satisfied with toy demos. Subtitle explicitly says "Production-Grade."
- **Your framing**: hearing that Yegge specifically had taken this seriously was the signal to re-evaluate your own skepticism.

### Thesis reframe
- Not "I set out to prove X" — instead: "I set out to discover whether I still provided value as a software engineer, and whether our discipline had a future."
- Tone: serious, unresolved at this point in the talk.

---

## Section: Vibe coding

### Failure 1 — requirements doc, wrong thing built anyway
- Project: comprehensive life-management app — time tracking, priority tracking, habit tracking
- Wrote a large, careful requirements document with the agent beforehand
- Believed intent was accurately captured, including how concepts would be represented and how the app should behave
- Agent still made significant assumptions; built many screens/tabs quickly; much of it didn't match intent
- Heavy rework required; had to reverse-engineer what the agent had actually built and why

### Failure 2 — bug whack-a-mole
- Real prompt example: "Fix the bug — it's not sticking the data between the settings page and the habits page."
- Pattern: prompt → time passes (~5–10 min) / tokens spent (~5,000) → problem persists → "no, it's still not working" → repeat
- You became a manual QA loop: click through the app, describe behavior, re-prompt
- Agent often moved two steps forward, one step back — sometimes reintroducing old bugs while fixing new ones
- No real forward progress

### Slide plan
- Show real prompt snippets
- Show a compressed visual timeline (prompt → time/tokens → still broken → prompt again → time/tokens → still broken), narrated live rather than read off the slide
- Explicit reminder to self: keep this section brief — avoid drifting into React Native, testing, or visual-inspection tangents

### Summary line (confirmed)
> "The agent can write code. It's not a software engineer."

---

## Section: Spec-driven development

### The story
- Project: dashboard tracking deployments, pulling source data from Tableau as CSV
- Used the CSV directly as the data store — a deliberate, discussed decision with the agent, not an accident
- Built using SDD: spec written, plan aligned with the agent before implementation
- Result: dashboard worked well, fulfilled requirements

### The discovery
- Trigger: a coworker pushed a similar app to QA using DynamoDB and offered the framework
- You went to check the cost of converting CSV → DynamoDB
- Found: rather than treating CSV like a real store (row-level read/write), the agent had loaded the entire CSV into memory via pandas, joined tables in-memory, mutated the whole dataset on changes, and wrote it back to disk — no real persistence layer, despite CSV being a reasonable and intentional choice at the decision level
- Not a good fit for a DynamoDB-style migration

### Why it slipped through
- Solo project — review happened lightly, mainly when the agent surfaced a visible problem
- The persistence *decision* (CSV as store) was reviewed and discussed multiple times
- The persistence *implementation* (pandas-in-memory, mutate-everywhere) was not reviewed and went unnoticed
- Note: you've used JSON as a data store elsewhere without this problem — the failure was implementation-specific, not inherent to flat-file storage as a concept

### Current status
- Not migrated — decided against it
- Cost to convert now looks higher than a rewrite would be
- Currently living with it as-is; this is itself a live illustration of "cost of change is not free"

### Bookend structure (confirmed direction, wording still open)
- Open: you were following advice from successful AI engineers — read the plan, not the code
- Close: parallel to Dex Horthy's own public reversal on this exact advice — arrived independently at the same conclusion
- **Not yet decided**: whether Horthy is named specifically at the open (as the source of the advice you were following) or held back until the close (as the "turns out I wasn't alone" reveal) — do not resolve this without further input

### Horthy reference (background, previously verified)
- Source: The Humans in the Loop Substack, March 2026 interview
- Early advice: "read the plan, not the code"
- After six months, had to rip out and replace large parts of the system
- Reversal, in his words (paraphrased): don't read the plan, read the code — it's the same amount of work, there may be drift between plan and code, and the code is the thing that ships

---

## Open items / still need decisions
- Whether Horthy is named at the open or the close of the SDD bookend
- Visual for SDD section not yet defined
- Visual for vibe coding section not yet built (prompt snippets + timeline)
- Whether "coding is dead" supporting references get used at all, or cold open stays purely on the radiology story
