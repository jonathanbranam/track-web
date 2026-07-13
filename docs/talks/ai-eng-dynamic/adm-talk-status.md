# ADM Talk — Current State, Next Steps & Open Questions
*Status report for the interactive presentation effort. Companion to `adm-talk-interactive-framework.md` (full spec), `adm-talk-overview.md` (talk narrative), and `adm-talk-restart-kit.md` (orientation + decisions).*

---

## Where this stands

The concept is settled and a **first working version has already been built** — the speaker reports it works well and tells a compelling visual story. The work now is refinement, not invention: sharpening a few weak elements, dropping in real content, and doing a timing pass.

This effort is **separate from the RPG/Dragon Warrior line of work** and should not import framing from it. (The Dragon Warrior section in the overview is an analogy for *this* talk, not the separate RPG presentation.)

## Locked / decided

- **Spine (confirmed):** the personal journey — *feared my value as an engineer was eroding → went to learn what AI-assisted development is really about → discovered the skills and principles matter more than ever, and we can't lose sight of them even while using AI.* Every body beat illustrates that; "using AI effectively" always resolves to "good software engineering."
- **Two principles** (David Farley): optimize for feedback, manage complexity — run as the scoreboard (gauges: broken → partial → operational).
- **Invariance** ("the principles never changed") kept as a *supporting* truth, not the headline.
- **Head-to-disk** demoted from spine to a *technique/beat*, reframed as the familiar instinct behind shifting left / scripting / automation: externalize what matters for faster feedback.
- **Three stages, names locked:** Vibe Coding · Spec-Driven Development · Harness Engineering.
- **One living apparatus** mutated three times (context window as RAM + plan shelf + skills shelf + gauges + panes), with a **persistent stage-title banner** on top.
- **Color system:** green = durable knowledge; slate anchor = pinned foundation; muted neutral = ordinary chatter; **orange = human attention** (the one dynamic highlight).
- **Attention rework (resolved):** the old eyeball marker is cut; the attended pane glows orange + enlarges while others dim/collapse. Movement: S1 chat+app → S2 chat+spec+app → Slack reveal snaps to code → S3 code+skills, with a reviewer sub-agent's eyes alongside (not replacing) the human.
- **Code pane (resolved):** blur = unread; on attention it sharpens, freezes, enlarges. Three states: nobody looking (S1) → developer looks at the Slack reveal (S2) → agent looks alongside the human (S3).
- **Real S3 content (resolved):** the Kubeflow example — Claude wrote a one-big-function, poorly-named Kubeflow job; careful review produced a skill capturing the modular/testable pattern + naming practices. Beat line: *"things I'd never have seen without reading the code."*
- **Constructive payoff (S3):** builds to the recommendation — define a clear spec and materialize it to iterate + get feedback, for *both* the plan and the skills.
- **Sub-agents (S3):** single agent → scoped sub-agents (spec-writer/implementer/tester/reviewer) cycling around the spec, under human orchestration — explicitly *not* autonomous teams; review gate stays lit, every line reviewed.
- **"Remember" throughline:** fake in S1 (typed into RAM, evicted), real in S3 (written to a skill on disk).
- **Framework behaviors** specified (§8 of the framework doc): presenter-advanced/reversible/deterministic beat timeline; block lifecycle (spawn/promote/evict/compact/clear/flush/highlight); gauges; attention highlight + blur/focus; titles + lessons-learned interstitials; agent multiplication; scene swaps; offline + Zoom-legible.

## Next steps (roughly in priority order)

1. **Timing pass against the 10-minute clock.** A lot has been added (four interstitials, the S3 payoff, the cold-open ticker+chart). This is the highest-value next action — see open questions on the two endings and the refrain count.
2. **Resolve the Stage 1 failure-mode fork** (eviction vs. lossy compaction vs. full clear) — it directly shapes the block-lifecycle build.
3. **Drop real content into the panes:** the Kubeflow blurb + resulting skill (S3), the pandas-in-memory mess (S2 reveal), representative prompt snippets (S1).
4. **Build/refine the attention highlight + blur-to-focus** in the actual React build so the un-blur reveal lands.
5. **Wire the lessons-learned interstitials** as real cards with the principle gauges advancing.
6. **Decide sub-agent count/roles** for S3 so the split reads clearly without clutter.
7. **Cold-open assets** (ticker + radiology divergence chart) and the **close callback** (chart returns with the speaker's trajectory; typing bar shrinks / judgment bars grow).
8. **Decide meta-reveal in/out** and, if in, build the one-line disclosure.

## Open questions (talk-craft level; build-level forks live in the restart kit)

- **Two endings competing for the last word.** The constructive payoff (S3: here's how to work well) and the emotional close (back to the fear, resolved) both want to land last. Need a ~20-second bridge so the spec-and-skills recommendation *sets up* the fear resolution rather than landing the plane twice.
- **Where to say the invariance point.** Likely plant it in one line up front ("the principles never changed — I just forgot that for a while") and pay it off at the close with the cost-of-change proof, letting the middle demonstrate it silently — rather than stating it fully in multiple places.
- **Generic-vs-specific appears three times** (the principle, the AI's code, the harness tools). Decide which instance is spoken and which the visuals carry silently, so it doesn't feel repeated on a tight clock.
- **Whether to seed "the head" in the cold open** (a head full of green, most of it never reaching the ticket) to pre-load the head-to-disk technique — small add, outsized payoff, but costs seconds.
- **Blurred-code legibility at Zoom scale** — the blurred state must read as *real code being written fast*, and the sharp reveal must be alarming within the 2–3 seconds it's held. Lives or dies on the real content dropped in.
