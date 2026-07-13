# ADM Talk — Interactive Presentation Framework
### Thesis, framework behaviors, and first-version outline
*Working doc. Telemetry / context-window visualization concept. Standalone from any other presentation line of work.*

---

## 1. Thesis (front and center)

**Software engineering is more important than ever.**

The earned conclusion, not the opening claim. The speaker spent real time building applications with AI, was legitimately worried his value as a software engineer was eroding — and came out convinced the discipline matters *more*, not less. Software engineering is a discipline, not a keyboarding skill. Typing was never the valuable part.

Two enduring principles — David Farley, *Modern Software Engineering* — that AI makes **more** important:

1. **Optimize for feedback / learning.** Small batches; rapid incremental iteration. With AI: you must be able to *test the code the agent writes to prove it works* — not wait for a user. Vibe coding is where this got relearned: too many requirements at once, no fast loop, speaker becomes a manual QA loop, agent goes two steps forward one back.
2. **Manage complexity.** Where the human is most load-bearing. The AI makes *reasonable* architectural choices — not always the *best* ones given the human's context, perspective, and view of the future. Demands constant review of the code and the decisions behind it, and writing better skills/guidance so the AI produces better code next time.

Principle health across the three stages — the argument in one table:

| Principle | Stage 1 · Vibe Coding | Stage 2 · Spec-Driven | Stage 3 · Harness Engineering |
|---|---|---|---|
| **Feedback** | Broken — requirements dumped at once, no way to prove it works, manual QA, regressions | Partial — smaller specified increments; working features climb | Operational — sub-agents run and fix their own tests; fast, provable feedback |
| **Complexity** | Broken — no review, architecture invisible, debt compounds | Still failing — plan read, code never read; hidden debt | Operational — human reviews diffs, writes skills, catches drift before it calcifies |

Illustrated entirely with the speaker's **own** examples — no finger-pointing.

## 2. The concept in one paragraph

Underneath the three stages is a single story about **managing volatile working memory**. The context window is RAM: fast, finite, evaporates. Durable storage — a plan on disk, a skills file — is where important knowledge survives. Vibe coding holds everything in RAM until it overflows; spec-driven development flushes the plan to disk; the harness externalizes both the plan *and* the skills and improves them because the human is reviewing the code. The volatile-memory story is the *mechanism*; the two principles are the *point*.

## 3. The spine: externalization

Two things migrate out of volatile memory onto durable shelves. That migration *is* the argument, and it maps onto the two principles (externalizing the plan tightens **feedback**; externalizing and reviewing the skills is how you **manage complexity**).

| Stage | Plan | Skills / knowledge | Agents |
|---|---|---|---|
| 1 — Vibe Coding | in-window only (lost) | in-window only (lost) | single agent |
| 2 — Spec-Driven | externalized to disk | still in-window (lost) | single agent |
| 3 — Harness Engineering | externalized, refined as you go | externalized to skills, refined | **single agent → scoped sub-agents** |

Stage 3 bidirectional loop: review the code → distill a rule → write it to the skills shelf → it loads into the next context's foundation → the next diff is better. Product and harness both improve each turn; neither improves without the human in the loop.

## 4. Talk rhythm: lessons-learned interstitials + stage titles

Two structural pieces carry the framing the visuals kept losing.

**(a) Stage title — persistent, at the top of the apparatus.** Each stage's title sits in a banner across the top of the apparatus for the entire stage, so the current stage is always unmistakable:

- Stage 1 — **Vibe Coding** — *everything in the window*
- Stage 2 — **Spec-Driven Development** — *externalize the plan*
- Stage 3 — **Harness Engineering** — *externalize the plan **and** the skills* *(confirmed name)*

**(b) Lessons-learned interstitials — between every stage and at the end.** These are full interstitial cards, not just a thesis flash. Each states: the **problems encountered** in the stage just finished, the **lessons learned** tied to the two principles, and the **SWE framing** restated. Designed to be scannable in a few seconds (the speaker may click through fast) but complete if lingered on. Structure:

> Cold open → Stage 1 → **Interstitial 1** → Stage 2 → **Interstitial 2** → Stage 3 → **Interstitial 3** → **Close / Summary**

Each interstitial also advances the two **principle gauges** (Feedback, Complexity: broken → partial → operational) — the scoreboard for the argument. The gauges live *in the interstitials* rather than cluttering the apparatus.

Interstitial content:

- **Interstitial 1 — "Everything in the window doesn't last."** Problems: underspecified prompts; agent made large assumptions; compounding corrections; whack-a-mole regressions; the key instruction evicted from context; abandonment. Lessons: *feedback* means small batches and being able to test the code to prove it works — not acting as manual QA; *complexity* went entirely unmanaged because nothing was reviewed or externalized. Framing: **the agent can write code; it is not a software engineer.** Gauges: both → broken.
- **Interstitial 2 — "Read the code, not just the plan."** Problems: good spec, working app — but the generated code was never read; architectural debt accrued invisibly; the persistence *decision* was reviewed, the *implementation* wasn't; cost-to-change rose silently. Lessons: externalizing the plan tightened *feedback*, but *managing complexity* means reading what shipped, not just what was planned. Framing: **a good plan doesn't manage complexity — judgment applied to the actual code does.** Gauges: Feedback → partial, Complexity → still broken.
- **Interstitial 3 — "Turn the principles into infrastructure."** Synthesis: tooling + scoped sub-agents + automated review enforce design and catch drift; skills externalize the learning; the spec becomes the shared, cyclical coordination medium; the human defines, reviews, improves. Guardrail: **sub-agents with individual responsibilities under human orchestration — not autonomous agentic teams; every line still reviewed.** Framing: **the two principles become self-correcting infrastructure — built and maintained by engineering judgment.** Gauges: both → operational.
- **Close / Summary.** The dread was real but aimed at the wrong thing. Typing was never the valuable part. Judgment, design, architecture, knowing what "good" looks like — uncommoditized; higher output volume raises the stakes on getting design right. **Software engineering is more important than ever.**

## 5. The core apparatus (one living diagram, mutated three times)

Build one apparatus and transform it. Persistent objects:

- **Stage title banner** — top of the apparatus, always shows the current stage.
- **Context window** — pinned **foundation zone** at the bottom (system prompt / skills / MCP, never scrolls) + a **scroll zone** above where chat blocks enter from the top and push down. The **middle** is the danger area.
- **Plan shelf** — durable storage. Empty in Stage 1; active coordination medium in Stage 3.
- **Skills shelf** — durable storage. Empty in Stages 1–2; the Stage 3 payoff.
- **Context gauge** and **token / cost counter**.
- **Chat pane** — the agent(s). A single agent in Stages 1–2; **splits into scoped sub-agents in Stage 3.**
- **Code / diff pane** — blur = unread; sharpens + enlarges when read. See §5.2.
- **App preview** — mainly Stage 1.

### 5.1 Attention highlight (replaces the old gaze marker — the eyeball is cut)
The eyeball + tiny "app/code/chat" labels were unreadable and overlookable. Replace with a full-apparatus mechanic: **the pane(s) the human is actively working glow strong orange and enlarge; every other pane dims and collapses toward a thin strip.** Attention is now expressed by the whole layout shifting, not a small marker — unmissable at Zoom scale. Movement across the talk:

- Stage 1 → orange on **chat + app** (never code)
- Stage 2 → orange on **chat + spec + app** (still never code)
- Slack reveal → orange **snaps onto the code pane** (blur resolves — the developer finally reads it)
- Stage 3 → orange holds on **code diff + skills shelf**; a **reviewer sub-agent's eyes also land on the code**, alongside (not replacing) the human

The audience literally watches judgment relocate onto the code.

### 5.2 The code pane: blur as "unread", and who has eyes on it *(resolved)*
The code pane is the "who is reviewing the code" throughline, and its treatment is **blur + focus** paired with the §5.1 orange highlight. **Blur is a second, independent encoding of "unread"**: code streaming by blurred and fast = illegible, nobody looking. When attention lands, the pane **enlarges, the scroll slows/freezes, and the code sharpens into legibility.** Blur/focus shows *whether* the code is being read; orange shows *who* is reading. Three states across the talk:

- **Stage 1 — nobody looking.** Code streams by **blurred and fast**, deliberately illegible, pane kept small. Its illegibility *is* the message; debt accrues unseen (cost-to-change meter climbs behind it). Orange never touches it.
- **Stage 2 — the developer finally looks.** Still blurred through the stage (you're reading the *plan*, not the code — the trap). At the **Slack reveal**, orange snaps onto the pane → it **expands, the scroll freezes, the blur resolves to sharp** → the monstrous pandas implementation becomes readable. The un-blur *is* the horror.
- **Stage 3 — the agent looks too.** Code stays sharp and reviewed; a **reviewer sub-agent's eyes also land on it** (its own attention marker on the code). Critically this is an *addition, not a handoff* — the human review gate stays lit, every line still reviewed. Two sets of eyes, human load-bearing.

This kills the dead-space problem: empty code is no longer wasted real estate — its blurred smallness carries meaning, and it earns focus + size exactly when someone starts reading it.

### 5.3 Sub-agents in Stage 3 (single agent → scoped sub-agents)
The single chat agent **splits into several labeled sub-agents, each with an individual responsibility** (e.g. spec-writer, implementer, test-runner, reviewer). They operate **cyclically around the spec** on the plan shelf — reading and writing specs in a loop. Framed with a persistent guardrail: this is **delegation under human orchestration, not an autonomous agentic team.** The Define · Review · Improve stations wrap the sub-agents; the human review gate stays lit; every line is still reviewed.

## 6. Color system (minimal, purposeful — color is the plot)

Three **content** registers plus one **attention** highlight:

- **Green** = important / durable knowledge — instructions, key decisions, "remember." The whole talk is green migrating window → shelves.
- **Anchor color** (one, e.g. slate) = pinned foundation zone. Bedrock.
- **Muted neutral** = ordinary chatter, no lasting importance.
- **Orange** = *human attention* (the §5.1 highlight). The one dynamic color; never used for content, only to show where judgment is being applied.

"Lost in the middle" is a real attention phenomenon — models attend to the start/end of long context and poorly to the middle — so green getting crushed in the middle and evicted is honest, not a cheat.

## 7. The "remember" throughline (sharpest single teaching beat)

"Remember" means two different things, and the gap is the argument in miniature:

- **Stage 1:** you type *"remember: fix it this way."* Flashes green, promotes into the window… evicted anyway. Typing "remember" into chat *feels* like saving, but it's still RAM.
- **Stage 3:** same instinct done right — the pattern is written to a **skill file on disk**, lands on the skills shelf, loads into the next context's foundation. Now "remember" is real.

---

## 8. Framework behaviors required (the build spec)

Priority: a reusable engine exercising all of the below. The §9 outline stresses each.

### 8.1 Timeline model
Beats (target states), not free-running animation. **Presenter-advanced** (spacebar/arrow) so visuals lock to the spoken word and you trigger overflow/flush/reveal *on the line*. **Reversible** (step back). **Deterministic**. **Scenes** group beats (Cold open, Stage 1–3, Interstitial 1–3, Close); jump-to-scene supported (also lets you click interstitials fast).

### 8.2 Block lifecycle (the workhorse)
Colorized, labeled context units: **spawn** (chat), **promote** (chat→window), **shift/scroll**, **evict** (from the middle), **compact/summarize** (N→one lossier block), **clear** (remove non-pinned), **flush** (gather green → one consolidated block to plan shelf → clear window → drop compact green reference), **highlight/pulse** ("remember").

### 8.3 Region behaviors
**pin/unpin** foundation zone; **feedback arrow** (skills shelf → pinned foundation of next context); **shelf fill** (plan and skills accumulate across stages).

### 8.4 Gauges & counters
**context gauge** (fill incl. overflow → triggers eviction/compaction); **token counter** (fast = Stage 1 waste, slow = Stage 3 efficiency); **cost-to-change meter** (rises silently through Stage 2); **status flips** (bug ✓→✗ regression; working-features stall vs. climb); **principle gauges** (Feedback, Complexity; broken/partial/operational; advanced by interstitials).

### 8.5 Attention highlight + blur/focus code pane *(reworked — replaces gaze marker)*
Exactly the attended pane(s) glow **strong orange and enlarge**; others **dim and collapse to thin strips**. The **code pane additionally uses blur/focus**: blurred fast-scroll = unread; on attention it **enlarges, freezes, and sharpens to legible**. Support the code-pane **expand + un-blur + orange snap** at the Slack reveal, and an **agent (reviewer sub-agent) attention marker** landing on the code in Stage 3 alongside the human's. Primary, unmissable elements — not small icons.

### 8.6 Stage titles & lessons-learned interstitials *(expanded)*
**Persistent stage banner** at the top of the apparatus for the whole stage. **Interstitial card** scene type: title + problems-encountered + lessons-learned + SWE framing + principle-gauge state; presenter-advanced, fast-clickable, one at the end as a consolidated summary.

### 8.7 Agent multiplication *(new — Stage 3)*
Single agent node **splits into N labeled sub-agents** with scoped roles; **cyclical flow** among them mediated by the spec (plan shelf read/write). Persistent **human-orchestration frame** (Define · Review · Improve + lit review gate) as a visual guardrail: delegation, not autonomy.

### 8.8 Scene swaps (non-apparatus)
**Cold open**: expiring-headline ticker + two-line radiology divergence chart. **Close**: divergence chart returns with the speaker's own trajectory added; a "typing" bar shrinks while "judgment / design / review" bars grow.

### 8.9 Practical / safety
Runs offline. Fixed aspect ratio for Zoom legibility; overlays large enough when compressed. Presenter-only "current beat / next action" readout.

---

## 9. First-version outline — with interstitials, titles, attention rework, and sub-agents

*First cut; expect to trim. Each beat notes the behavior it exercises.*

### Scene 0 — Cold open (~1:15)
1. **Headline ticker.** "Coding is dead" predictions 2022→2026 expire on screen. → *scene-swap; ticker.*
2. **Radiology divergence chart.** Hinton's 2016 predicted headcount-to-zero vs. real line rising ~7% then bending into shortage. → *two-line chart reveal.*
3. Personal admission — the speaker believed it for a while (spoken; static hold). → *beat hold.*

### Scene 1 — Vibe Coding (~2:00)
4. **Stage banner** ("Vibe Coding — everything in the window"). Apparatus appears; single agent in chat; orange attention on **chat + app**; **code pane streams blurred, fast, illegible — nobody looking**. → *banner; establish apparatus; attention highlight + blurred-code pane.*
5. Prompts stream; neutral blocks promote chat→window; token counter spins; context gauge climbs; app sprouts tabs; blurred code keeps racing by unread; cost-to-change meter starts climbing behind it. → *spawn/promote; gauges; app tabs; blurred-code scroll.*
6. **"Remember" fires.** Instruction flashes green, promotes into the middle. → *spawn (green) + highlight + promote.*
7. Feature-rich app but **working-features counter stalls**; bug at ✓. → *status stall.*
8. **Overflow.** Gauge tops out; failure fires (fork): green middle **evicted** / lossy **compaction** / full **clear**. → *evict OR compact OR clear.*
9. **Consequence.** Agent contradicts the lost instruction; bug **✗ flips back**; orange never once touched the blurred code. → *status flip; attention hold.*

### Interstitial 1 — "Everything in the window doesn't last." (~0:20)
10. Problems + lessons + framing ("the agent can write code; it is not a software engineer"); both principle gauges → **broken**. → *interstitial card; gauges.*

### Scene 2 — Spec-Driven Development (~2:00)
11. **Stage banner** ("Spec-Driven Development — externalize the plan"). Orange attention on **chat + spec + app**; code still blurred and unread (the trap). → *banner; attention shift.*
12. Window fills with green working material; token counter climbs toward the limit. → *spawn/promote (green); gauge toward cap.*
13. **The flush.** Before overflow, write it all out → one consolidated block on the **plan shelf** (glows); **clear** window; drop compact green **reference**. Cluttered → clean-plus-pointer. → *flush.*
14. **Working features climb steadily.** Meanwhile the **cost-to-change meter rises silently** behind the blurred, still-unread code. → *counter climb; hidden meter rise.*
15. **Slack reveal.** Coworker's DynamoDB offer → orange **snaps onto the code pane; it expands, the scroll freezes, and the blur resolves to sharp** → the developer finally reads it: monstrous implementation (whole CSV into pandas, mutate, rewrite every change). Plan was fine; you never read what shipped. → *attention snap; pane expand + un-blur; content reveal.*

### Interstitial 2 — "Read the code, not just the plan." (~0:20)
16. Problems + lessons + framing ("a good plan doesn't manage complexity — judgment on the actual code does"); Feedback → **partial**, Complexity → **still broken**. → *interstitial card; gauge transitions.*

### Scene 3 — Harness Engineering (~2:00)
17. **Stage banner** ("Harness Engineering — externalize the plan *and* the skills"). Single agent **splits into scoped sub-agents** (spec-writer, implementer, tester, reviewer) inside a **human-orchestration frame**; Define · Review · Improve stations light and stay lit. → *banner; agent multiplication; guardrail frame.*
18. Real loop: a sub-agent writes it wrong → you refactor with clear direction → have it **document the pattern** → **write a skill** → skill lands on the **skills shelf**. Code stays **sharp and read**; orange (human) attention on **code diff + skills shelf**. → *code update; shelf-write; attention on code.*
19. **Feedback arrow**: skills shelf → **pinned foundation** of next context; next diff passes the skill as a permanent filter. Sub-agents cycle around the spec. → *feedback arrow; cyclical spec flow.*
20. Tests self-heal; a **reviewer sub-agent's eyes land on the code** and flag a smell — **but the human review gate stays lit** and every line is still reviewed (agent eyes are an addition, not a handoff). Harness makes the gate **tractable** (small diffs, pre-filtered), not absent. → *agent attention marker on code; review-gate hold; small-diff visual.*
21. Both shelves full; context lean; token counter ticks efficiently. Same diagram as Scene 1, reorganized to health. → *steady-state.*

### Interstitial 3 — "Turn the principles into infrastructure." (~0:25)
22. Synthesis + guardrail (sub-agents with scoped responsibilities, not autonomous teams) + framing; both gauges → **operational**. → *interstitial card; gauges.*

### Scene 4 — Close / Summary (~1:00)
23. **Summary card.** The dread was real but aimed at the wrong thing; typing was never valuable; judgment/design/architecture uncommoditized; volume raises the stakes on design. **Software engineering is more important than ever.** → *interstitial/summary card.*
24. **Divergence chart returns** with the speaker's own trajectory added. → *scene-swap; chart callback + added line.*
25. **Typing bar shrinks; judgment / design / review bars grow.** → *bar animation.*
26. *(Fork)* **Meta-reveal**: this deck was built exactly this way — it is the demo. → *optional hold.*
27. Final line to title (spoken; static hold). → *beat hold.*

---

## 10. Open forks (tracked, not resolved)

- **Principle-gauge home** — resolved toward *interstitial-only* (keeps the apparatus uncluttered). Revisit if they feel absent during stages.
- **Stage 1 failure mode** — eviction (green crushed in the middle) vs. lossy compaction vs. full clear. Each teaches slightly differently; could show two.
- **Skills-region color** — dedicated color vs. green-when-durable. Leaning: same green, location carries meaning.
- **Code-pane treatment** — *resolved:* blurred fast-scroll = unread; sharpen + freeze + enlarge on attention. Three states: nobody looking (S1) → developer looks at the Slack reveal (S2) → reviewer sub-agent looks alongside the human (S3). Still needs the real code content shown at the reveal + in S3 (speaker to supply).
- **Sub-agent count / roles** — how many, and which named responsibilities read clearly without cluttering Stage 3.
- **Meta-reveal at close** — strong but spends ~15–20s you're tight on.
- **Cold-open chart vs. ticker vs. both** — both may be one beat too many for the clock.
