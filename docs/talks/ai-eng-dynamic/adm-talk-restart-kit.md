# ADM Talk — Restart Kit (Clean-Start Handoff)
*Purpose: hand this document set to a fresh conversation and continue without re-explaining. This doc orients; the others carry the detail.*

---

## The document set (read in this order)

1. **`adm-talk-overview.md`** — the talk's narrative summary + a Dragon Warrior analogy version. Read first for the story at a glance.
2. **`adm-talk-interactive-framework.md`** — the canonical build spec: thesis, apparatus, color system, framework behaviors (§8), and the beat-by-beat outline (§9) with forks (§10). The main working doc.
3. **`adm-talk-status.md`** — current state, next steps, and talk-craft open questions.
4. **`adm-talk-restart-kit.md`** — this file: orientation + the consolidated decisions to resolve.

## Orient a fresh conversation in 8 lines

- **The deliverable:** a highly engaging, presenter-advanced **animated React presentation** that runs behind/with a ~10-minute + 5-min-Q&A talk to a large virtual engineering audience (~570). It doubles as the "demo."
- **The talk's point:** *software engineering skills are more important than ever;* the speaker feared AI was eroding his value, went on a journey, and concluded good engineering is exactly what makes AI-assisted development work.
- **The visual engine:** one **apparatus** (context window as RAM + a plan shelf + a skills shelf + gauges + chat/code/app panes) that **mutates across three stages** — Vibe Coding → Spec-Driven Development → Harness Engineering — showing engineering getting healthier.
- **Two principles** (Farley: optimize for feedback, manage complexity) are the scoreboard; **lessons-learned interstitials** between stages carry the framing.
- **Color:** green = durable knowledge, slate = pinned foundation, neutral = chatter, **orange = human attention** (the one dynamic highlight).
- **Non-negotiable:** the human stays load-bearing — every line reviewed (Capital One context). Stage 3 uses **scoped sub-agents under human orchestration, never autonomous teams.**
- **Keep separate** from the RPG/Dragon Warrior presentation line of work; do not import its framing.
- **State:** a first version is built and works; the task is refinement, real content, and a timing pass — not reinvention.

## The important steps taken (so a fresh Claude has the through-line)

1. Chose the telemetry/context-window concept and the single-mutating-apparatus approach.
2. Re-centered on the personal-journey thesis; demoted "getting knowledge out of your head onto disk" to a *technique* (framed as shift-left/automation) and kept "the principles never changed" as *supporting* truth.
3. Added persistent stage titles and expanded the between-stage beats into full **lessons-learned interstitials** (problems + lessons + framing + gauge advance).
4. Reworked the unreadable "gaze eyeball" into the **orange attention highlight** (attended pane glows + grows; others dim/collapse).
5. Resolved the dead-space **code pane** via **blur = unread / focus = read**, with the un-blur as the dramatic reveal; three states nobody → developer → agent.
6. Locked the **Kubeflow example** as the real Stage 3 content and added the **constructive payoff** (define a clear spec + externalize plan *and* skills to iterate and get feedback).

## Decisions to resolve

*Grouped by impact. Each has a leaning where one exists; none are locked.*

### Build-shaping (resolve before/while building)
- **Stage 1 failure mode** — how the key green instruction is lost: (a) **eviction** (crushed in the middle), (b) **lossy compaction** (auto-summary garbles it), or (c) **full clear** (total amnesia, re-learn from scratch). Each needs slightly different block-lifecycle support; could show two. *Most impactful open fork.*
- **Sub-agent count & roles (Stage 3)** — how many scoped sub-agents, and which named responsibilities read clearly without cluttering the busiest stage. Draft set: spec-writer, implementer, tester, reviewer.
- **Principle-gauge home** — interstitial-only (current leaning, keeps the apparatus clean) vs. a small always-on HUD during stages.
- **Engineer's-head source element** — show green knowledge emanating from a "head" into RAM/shelves (makes the technique literal) vs. leave implicit to avoid clutter. *Clutter risk is the concern.*
- **Skills-region color** — dedicated color vs. green-when-durable (leaning: same green, location carries the meaning).

### Timing & structure (resolve in the timing pass)
- **The two endings** — bridge the S3 constructive payoff into the emotional close so the talk lands once, not twice (~20s bridge needed).
- **Refrain/interstitial count** — four interstitials plus cold open plus close is a lot on a 10-min clock; confirm the rhythm is worth it or trim.
- **Cold open: chart vs. ticker vs. both** — both (expiring-headline ticker + radiology divergence chart) may be one beat too many.
- **Meta-reveal at close** — "this deck was built exactly this way" is strong but spends ~15–20s.

### Emphasis (resolve in scripting)
- **Where to state the invariance point** — plant up front, pay off at close; avoid saying it fully in three places.
- **Generic-vs-specific** — appears in three spots; pick which is spoken vs. visual-only.
- **Whether to seed "the head" in the cold open** to pre-load the head-to-disk technique.

## Content the speaker still owns
- Final code shown in the panes: the **Kubeflow** blurb + resulting skill (S3) and the **pandas-in-memory** mess (S2 reveal) — rendered so the blurred state reads as real code and the sharp reveal is alarming within 2–3 seconds.
- Representative **prompt snippets** for Stage 1.
- Confirming exact **timings** once the above are in.
