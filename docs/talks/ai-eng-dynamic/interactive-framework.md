# ADM Talk — Interactive Presentation Framework
### Concept, framework behaviors, and first-version outline
*Working doc. This is the telemetry / context-window visualization concept. Standalone from any other presentation line of work — do not import framing from elsewhere.*

---

## 1. The concept in one paragraph

The talk's three-stage arc is, underneath, a single story about **managing volatile working memory**. The context window is RAM: fast, finite, and it evaporates. Durable storage — a plan on disk, a skills file — is where important knowledge survives. Vibe coding tries to hold everything in RAM until it overflows; spec-driven development learns to flush the plan to disk; the harness externalizes both the plan *and* the skills, and improves them because the human is reviewing the code. The visual layer makes this literal: one instrumented apparatus that the audience watches reorganize itself from unhealthy to healthy across three stages, with the human visibly load-bearing the entire time.

## 2. The spine: externalization

Two things migrate out of volatile memory (the context window) and onto durable shelves over the course of the talk. That migration *is* the argument.

| Stage | Plan | Skills / knowledge | Human's attention points at |
|---|---|---|---|
| 1 — Vibe coding | in-window only (lost) | in-window only (lost) | chat + running app, **never the code** |
| 2 — Spec-driven | **externalized to disk** | still in-window (lost) | chat + spec + app, **still never the code** |
| 3 — Harness | externalized, refined as you go | **externalized to skills, refined** | spec + **code diff** + **skills** |

The bidirectional loop lives in Stage 3: review the code → distill a rule → write it to the skills shelf → it loads into the next context's foundation → the next diff is better. Two things improve each turn — the product (right thing built) and the harness (agent gets better at building it) — and neither improves without the human in the loop.

## 3. The core apparatus (one living diagram, mutated three times)

Do **not** build three separate diagrams. Build one apparatus and transform it. The mutation is the content.

Persistent on-screen objects:

- **Context window** — a vertical container. A **pinned foundation zone** at the bottom (system prompt / skills / MCP) that never scrolls, and a **scroll zone** above it where chat blocks enter from the top and push downward. The **middle** is the danger area (see color system + eviction).
- **Plan shelf** — durable storage slot, left or below. Empty in Stage 1.
- **Skills shelf** — durable storage slot. Empty in Stages 1 and 2; the Stage 3 payoff.
- **Context gauge** — fill % of the window.
- **Token / cost counter** — spins up as work happens.
- **Gaze marker** — indicates where the human's attention is pointed (output vs. plan vs. code+tooling).
- **Chat pane** — where prompts/responses stream.
- **Code / diff pane** — the generated code. Dimmed/unwatched in Stages 1–2; foregrounded and reviewed in Stage 3.
- **App preview** — the running app; primarily a Stage 1 element (sprouts tabs fast, "working features" counter stalls).

## 4. Color system (minimal, purposeful — color is the plot, not decoration)

Exactly three registers. Nothing else earns a color.

- **Green** = important / durable knowledge — explicit instructions, key decisions, "remember: fix it this way." Green is the stuff that *should* survive. The whole talk is green migrating from window → shelves.
- **Anchor color** (one, e.g. deep blue/slate) = the pinned foundation zone (system prompt, skills, MCP). Reads as bedrock.
- **Muted neutral** = ordinary chatter with no lasting importance.

The tragedy the color makes visible: in Stage 1, green enters the window and later gets **crushed in the middle** and evicted — important knowledge lost. ("Lost in the middle" is a real attention phenomenon — models attend to the start/end of long context and poorly to the middle — so the green block getting squeezed between the pinned foundation and the fresh recent chat, then failing, is honest, not a cheat.)

## 5. The "remember" throughline (the single sharpest teaching beat)

The word "remember" means two different things across the talk, and the gap between them is the argument in miniature:

- **Stage 1:** you type *"remember: fix it this way."* It flashes green, slides into the window… and gets evicted anyway. Typing "remember" into chat *feels* like saving, but it's still RAM.
- **Stage 3:** the same instinct, done right — the pattern is written to a **skill file on disk**, lands on the skills shelf, and loads into the next context's foundation. Now "remember" is real.

Build the arc so this word recurs deliberately.

---

## 6. Framework behaviors required (the build spec)

This is the priority: a reusable engine that exercises all of the below. The outline in §7 is what stresses each behavior.

### 6.1 Timeline model
- **Beats**, not free-running animation. The atomic unit is a beat = a target state of the apparatus. Transitions animate *between* beats.
- **Presenter-advanced**: spacebar / arrow steps forward to the next beat. This keeps the visual locked to the spoken word on a tight clock and lets you trigger the overflow/flush/eviction moment *on the line that describes it*.
- **Reversible**: step backward restores the prior beat's state. Essential for practice and for recovering gracefully if you get ahead of yourself live.
- **Deterministic**: no randomness that could desync from the script. Same beat → same state, every run.
- **Scenes** group beats (Cold open, Stage 1, Stage 2, Stage 3, Close). Jumping to a scene start should be possible (practice / Q&A recovery).

### 6.2 Block lifecycle (the workhorse)
Blocks are colorized, labeled units of context. The engine must:
- **spawn** a block (in chat, with a color register and a short label)
- **promote** a block from chat → context window (animate the move)
- **shift / scroll** blocks within the scroll zone as new ones enter
- **evict** a block from the middle (fade + eject) — the Stage 1 failure
- **compact / summarize** — replace N blocks with one smaller, lossier block (alternate Stage 1 failure)
- **clear** — remove all non-pinned blocks (full amnesia; alternate Stage 1 failure and the Stage 2 flush step)
- **flush** — a compound move: gather green blocks → write a single consolidated block onto the plan shelf → clear the window → drop a compact green *reference* pointer back in. (This is the Stage 2 "write to disk, clear, resume clean" beat.)
- **highlight / pulse** a block (e.g. when "remember" fires)

### 6.3 Region behaviors
- **pin / unpin** the foundation zone (stays fixed while scroll zone moves)
- **feedback arrow**: skills shelf → pinned foundation of the next context (the Stage 3 loop made literal)
- **shelf fill**: plan shelf and skills shelf visibly accumulate artifacts across stages

### 6.4 Gauges & counters
- **context gauge**: animate fill to a target %, including the overflow state (tops out, triggers eviction/compaction)
- **token counter**: animate count-up; should be able to spin fast (Stage 1 waste) or tick slowly (Stage 3 efficiency)
- **status flips**: bug indicator ✓→✗ (whack-a-mole regression), "working features" counter that can stall or climb

### 6.5 Gaze marker
- **move** to a target pane (app / spec / code / skills), holding position across beats until re-pointed
- Should read at a glance — this one marker summarizes "where judgment is being applied" across the whole talk

### 6.6 Scene swaps (non-apparatus scenes)
- **Cold open**: an expiring-headline ticker + a two-line divergence chart (predicted vs. actual)
- **Close**: the divergence chart returns with an added trajectory line; a "typing" bar shrinks while "judgment / design / review" bars grow
- Engine needs a clean way to swap the full stage between the chart scenes and the apparatus scenes

### 6.7 Practical / safety
- Runs offline, no network dependency mid-talk.
- Fixed aspect ratio sized for Zoom screen-share legibility; text overlays large enough to read when compressed.
- A visible-to-presenter-only cue of "current beat / next action" is desirable (even a tiny corner readout) so you always know what the next spacebar press will do.

---

## 7. First-version outline — with framework behaviors annotated per beat

*Mirrors the 10-minute structure. This is a first cut; expect to trim. Each beat notes the framework behavior it exercises so engine coverage is visible.*

### Scene 0 — Cold open (~1:15)
1. **Headline ticker.** "Coding is dead" predictions 2022→2026 scroll past and expire. → *scene-swap; timed ticker animation.*
2. **Radiology divergence chart.** Hinton's 2016 predicted radiologist-headcount-to-zero line vs. the real line rising ~7% then bending into shortage. → *two-line chart reveal, presenter-advanced.*
3. Serious pivot to the personal admission (spoken; static hold). → *beat hold, no animation.*

### Scene 1 — Vibe coding (~2:00)
4. **Apparatus appears**, healthy-looking: empty window, empty shelves, gaze marker on the app. → *scene-swap to apparatus; establish persistent objects.*
5. Prompts stream; neutral blocks promote chat→window; token counter spins; context gauge climbs; app preview sprouts tabs. → *spawn + promote (neutral); gauge fill; token count-up; app tabs animate.*
6. **"Remember" fires.** You type an important instruction; block flashes **green**, promotes into the window's middle. → *spawn (green) + highlight + promote.*
7. App looks feature-rich but **"working features" counter stalls** near zero; a bug indicator sits at ✓. → *status counter stall.*
8. **Overflow.** Context gauge tops out. Choose the failure (see fork): green middle block **evicted** / lossy **compaction** / full **clear**. → *evict OR compact OR clear.*
9. **Consequence.** Agent contradicts the lost instruction; bug **✗ flips back** — two steps forward, one back, with a *visible cause*. Gaze marker still stuck on the app, never the code. → *status flip; gaze hold.*
10. Abandonment beat (spoken; apparatus sits in its broken state). → *beat hold.*

### Scene 2 — Spec-driven development (~2:00)
11. Same apparatus. Window fills with green working material as you iterate on a plan; token counter climbs toward the limit. → *spawn/promote (green); gauge fill toward cap.*
12. **The flush.** Before overflow, **write it all out** as one consolidated block onto the **plan shelf** (glows); **clear** the window; drop a compact green **reference** back in. Window goes cluttered → clean-plus-one-pointer. → *flush (compound): shelf-write + clear + reference drop.*
13. "Momentum preserved, cleaner going forward." Gaze marker points at chat + spec + app. **Working features climbs steadily.** → *gaze move; counter climb.*
14. **The trap.** Code/diff pane has been accumulating in a **dimmed, unwatched** state the whole time. A quiet **cost-to-change meter** has been rising. → *dim pane accumulation; secondary gauge rising.*
15. **Slack message swings the light.** Coworker's DynamoDB offer → gaze/spotlight snaps to the code pane → implementation revealed monstrous (whole CSV into pandas, mutate, rewrite every change). Plan was fine; you never read what shipped. → *gaze/spotlight snap; pane reveal.*

### Scene 3 — Harness (~2:00)
16. Human's **three stations** light up and stay lit: **Define** (clean spec), **Review** (the actual diff), **Improve** (the tooling). → *persistent station indicators.*
17. Real loop: agent writes it wrong → you refactor with clear direction → you have it **document the pattern** → **write a skill** → skill lands on the **skills shelf**. → *code pane update; shelf-write (skills).*
18. **Feedback arrow**: skills shelf → **pinned foundation** of the next context. Next diff passes through the skill as a permanent filter, automatically. → *feedback arrow; pinned-zone update.*
19. Tests self-heal; a review agent flags a smell — **but the human review gate stays lit.** "Every line reviewed" holds firm. The harness doesn't remove the gate; it makes the gate **tractable** (small diffs, pre-filtered). → *status hold on review gate; small-diff visual.*
20. Both shelves now full; context stays lean; token counter ticks efficiently. The apparatus is visibly healthy — the same diagram from Scene 1, reorganized. → *steady-state; gauge low; counter slow.*

### Scene 4 — Close (~1:00)
21. **Divergence chart returns** with your own trajectory line added (building more than ever). → *scene-swap; chart callback + added line.*
22. **Typing bar shrinks; judgment / design / review bars grow.** → *bar animation.*
23. *(Fork)* **Meta-reveal**: this deck was built exactly this way — it is the demo. → *optional hold beat.*
24. Final line to title (spoken; static hold). → *beat hold.*

---

## 8. Open forks (tracked, not resolved)

- **Stage 1 failure mode** — eviction (green crushed in the middle) vs. lossy compaction (auto-summarize garbles it) vs. full clear (total amnesia, re-learn from scratch). Each is buildable; each teaches a slightly different lesson. Could even show two.
- **Skills region color** — is "skills on the shelf" a third dedicated color, or just green-when-durable (same green, different location)? Leaning: same green, location carries the meaning (reinforces the migration story).
- **Gaze marker** — explicit marker vs. implied by spotlight/dimming. Explicit is clearer at Zoom scale; implied is more elegant.
- **Meta-reveal at close** — strong, but spends ~15–20s you're tight on. Keep as fork.
- **Cold-open chart vs. ticker vs. both** — ticker adds motion, chart adds the honest data beat. Both may be one beat too many for the clock.
- **App preview persistence** — Stage 1 element only, or a thin callback in later stages to show "the thing still runs"?
