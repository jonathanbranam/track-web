# Software Engineering Skills Are More Important Than Ever
### ADM Talk — 10 min + 5 min Q&A

---

## 1. Cold open: "SWE is dead" (≈1 min)

- Slide: montage of headlines/quotes, escalating over time
  - 2022/23: "Software engineering is dead next year"
  - 2024: "This time for real — AI CEO said so"
  - 2025–26: "Coding is dead" (multiple real, findable headlines — UW rethinking CS curriculum, Spotify/Anthropic/NVIDIA anecdotes, Boris Cherny's "100% of my Claude Code contributions were written by Claude Code")
  - Land the joke: the prediction repeats every year, on schedule, like clockwork
- Pivot line: *"I heard all of this. And for a while, I believed it."*

## 2. The personal fear (≈1 min)

- Brief, honest, no hedging: dread, felt like your value was eroding, questioned whether you'd still be a useful contributor
- Keep this short and unresolved for now — you'll return to it at the close
- Who I am: one sentence, spoken not slide. Something like: *"I've been writing code since I was a kid on a Commodore 64 — assembly, C++, game graphics, web, now ML. I love this craft."* (Establishes stakes, not a resume)

## 3. The thesis (≈1 min)

- Software engineering is an engineering discipline. The discipline hasn't changed — only the tools have.
- Two organizing principles, stated plainly:
  1. **Optimize for feedback** (iterative development, fast learning loops)
  2. **Manage complexity** (modular design, loose coupling, clear boundaries)
- These aren't new ideas. They predate AI by decades. The claim: *they matter more now, not less.*
- One-line setup for what's coming: *"I tested that claim on myself. Here's what happened when I actually tried to build with AI."*

## 4. Stage 1 — Vibe coding (≈2 min)

- What you did: unconstrained chat-based coding, telling the agent what to build
- What broke:
  - Flaky tests, agent looping trying to fix them and failing
  - Agent guessing at intent, building the wrong thing from an underspecified prompt
  - Endless correction chat, compounding mess
  - Eventually abandoned
- The lesson, tied back to principle 1 (optimize for feedback):
  - Feedback loops only work if they're *fast and small*. Vibe coding had neither — no plan to check against, no fast test signal, no way to know if you were converging or diverging
- Visual: quick before/after or a mock "chat log gone wrong" — doesn't need to be real code, just illustrative

## 5. Stage 2 — Spec-driven development (≈2 min)

- What changed: writing specs first, aligning with the agent on *what* and *how* before code
- Results improved a lot — but you weren't reading the code
- The story: CSV-on-disk persistence, pandas dataframes passed and mutated everywhere, no actual persistence layer — invisible because you never looked
- Consequence: wanted a proper document store later, migration became brutal, the "quick" original choice calcified
- The lesson, tied to principle 2 (manage complexity):
  - A good plan is necessary but not sufficient. Complexity has to be managed *in the code*, not just in the spec. If you don't read it, you don't know what you actually built.
- Optional citation here or in stage 3: Dex Horthy's public reversal — "read the plans, not the code" → six months of rebuilding → "please read the code, it's the thing that ships"
- Visual: simple diagram — spec says "persistence layer," actual code shows global dataframe threaded through everything. The gap between the two is the point.

## 6. Stage 3 — Harness (≈2 min)

- What it is: moving beyond a single plan/spec into a system — tooling, sub-agents, and skills that constrain *how* code gets written and that check it afterward
- When the AI missteps, you don't just re-prompt — you improve the harness so the same mistake doesn't recur
- This is principles 1 and 2 *combined and systematized*: fast feedback (tests the agent runs and fixes itself) + complexity management (review agents checking for design smells, coupling, boundaries)
- Also where the iteration-size point lives: small specs, small diffs, same as it ever was — a giant spec is just a waterfall document with extra steps, and it produces a giant PR nobody can review
- Visual/demo: pre-recorded or animated flow — spec → apply → tests run → review agent flags an issue → harness updated. This is your best "show, don't tell" moment. Keep it under 60–90 seconds.

## 7. The turn: cost of change is not free (≈1 min)

- The thesis line to land hard, possibly on its own slide:
  > *"The cost of writing new code always feels lower than the cost of changing existing code — whether that code is handwritten or AI-written."*
- The more code we produce, the more this matters, not less. Volume raises the stakes on design quality, not lowers them.
- This is the "why" underneath everything — why principles 1 and 2 don't get to retire just because the typing got faster

## 8. Close: back to the fear (≈1 min)

- Return to where you started. The dread was real. It was also wrong — but not because AI is harmless or limited. It's wrong because the thing that was actually valuable was never the typing.
- Where you are now: building more than ever — side projects, work projects — and at work, your value shows up in review, in guiding the agent and your teammates, in the judgment calls
- Final line, tying back to title: *coding may get commoditized. Software engineering — judgment, design, architecture, knowing what "good" looks like — is the part that doesn't.*

---

## Timing check

| Section | Time | Running total |
|---|---|---|
| Cold open | 1:00 | 1:00 |
| Personal fear + who I am | 1:00 | 2:00 |
| Thesis | 1:00 | 3:00 |
| Vibe coding | 2:00 | 5:00 |
| SDD | 2:00 | 7:00 |
| Harness | 2:00 | 9:00 |
| Cost of change | 1:00 | 10:00 |
| Close | — | *tight* |

**This is over budget.** Likely cuts/compressions, in order of preference:
1. Fold "cost of change" into the close as a single line rather than its own beat (saves ~1 min)
2. Trim harness section to the visual doing most of the talking, minimal narration (saves ~30–45 sec)
3. Tighten vibe coding to two bullets instead of three failure modes (saves ~30 sec)

Recommend drafting section 6 and the close together once the demo asset exists, since the visual's actual length will drive how much spoken time is left.

## Open questions for next pass

- Confirm whether the Horthy citation earns its ~15–20 seconds, or if the CSV story alone carries "manage complexity" without it
- Decide exact wording for the title/theme slide — current candidates: "Software Engineering Skills Are More Important Than Ever" vs. something sharper riffing on "coding is dead, long live engineering"
- Nail down what the pre-recorded/animated asset actually shows before finalizing section 6 timing
