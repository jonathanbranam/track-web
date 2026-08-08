# ai-eng-dynamic/ — ADM Talk Working Docs

Working documents for a talk titled **"Software Engineering Skills Are More Important Than Ever,"** given to ADM (~570 engineers) as a 10-minute talk + 5-minute Q&A, paired with a custom presenter-advanced animated React "apparatus" presentation (the context-window-as-RAM visualization). This is a separate line of work from the RPG/Dragon Warrior talk — do not mix framing between them.

Files are listed roughly in reading/priority order.

## [[docs/talks/ai-eng-dynamic/adm-talk-restart-kit]]
Orientation doc for handing this doc set to a fresh conversation. Explains the deliverable (an animated React presentation that doubles as the demo), the talk's point, the visual engine (one mutating apparatus across three stages), the locked decisions, and a list of still-open decisions grouped by impact (build-shaping, timing/structure, emphasis). Read this first to get oriented, then follow its recommended reading order into the other docs.

## [[docs/talks/ai-eng-dynamic/adm-talk-overview]]
Narrative summary of the talk's argument (fear of AI obsolescence → three-stage personal journey through Vibe Coding, Spec-Driven Development, and Harness Engineering → resolution that judgment/design/architecture are what remain valuable), plus a standalone Dragon Warrior RPG analogy retelling of the same arc. The RPG framing here is local color for *this* talk only — per [[docs/talks/ai-eng-dynamic/adm-talk-status]], it must not be imported into the separate Dragon Warrior presentation.

## [[docs/talks/ai-eng-dynamic/adm-talk-interactive-framework 2]]
**Canonical, latest build spec** for the interactive presentation. Defines the thesis (software engineering matters more, not less; David Farley's two principles — optimize for feedback, manage complexity), the "principles never changed" supporting argument, the head-to-disk externalization technique, the stage-title/lessons-learned-interstitial talk rhythm, the full mutating apparatus (context window, plan/skills shelves, gauges, orange attention highlight, blur/focus code pane, sub-agent multiplication in Stage 3), the color system, the "remember" throughline, all framework behaviors (§8), and the full beat-by-beat outline (§9) with the real Kubeflow/pandas example content and open forks (§10). Supersedes [[docs/talks/ai-eng-dynamic/adm-talk-interactive-framework]] and [[docs/talks/ai-eng-dynamic/interactive-framework]].

## [[docs/talks/ai-eng-dynamic/adm-talk-interactive-framework]]
Earlier version of the framework spec — introduces the thesis-first structure, stage-title banners, lessons-learned interstitials, the orange attention highlight (replacing the old gaze marker), the blur/focus code pane, and Stage 3 sub-agent multiplication. Missing the later refinements in [[docs/talks/ai-eng-dynamic/adm-talk-interactive-framework 2]] (the "principles never changed" section, the head-to-disk technique section, and the resolved Kubeflow example content).

## [[docs/talks/ai-eng-dynamic/interactive-framework]]
Original/oldest version of the framework concept doc — establishes the core apparatus (context window, plan shelf, skills shelf, gauges, gaze marker), the three-register color system, the "remember" throughline, and a first beat-by-beat outline. Predates the stage-title banners, lessons-learned interstitials, orange attention rework, and sub-agent multiplication that appear in the later framework docs.

## [[docs/talks/ai-eng-dynamic/adm-talk-status]]
Status report on the interactive presentation effort: confirms a first working version has been built and the remaining work is refinement (not invention). Lists locked/decided items, next steps in priority order (timing pass against the 10-minute clock is highest-value), and open talk-craft questions (competing endings, where to state the invariance point, generic-vs-specific repetition, Zoom-scale legibility of the blurred code pane).

## [[docs/talks/ai-eng-dynamic/adm-talk-outline 2]]
Refined version of the spoken-talk outline — adds a "Context" section (format, audience composition across the AI-adoption spectrum, tone target) and carries the same 8-section structure as [[docs/talks/ai-eng-dynamic/adm-talk-outline]] with tightened wording and an updated timing table. Supersedes [[docs/talks/ai-eng-dynamic/adm-talk-outline]].

## [[docs/talks/ai-eng-dynamic/adm-talk-outline]]
Original section-by-section spoken-talk outline (cold open → personal fear → thesis → three stages → cost-of-change turn → close), each section with target timing and a rough over-budget timing table with suggested cuts. Superseded by [[docs/talks/ai-eng-dynamic/adm-talk-outline 2]].

## [[docs/talks/ai-eng-dynamic/adm-talk-talking-points]]
Working reference doc of quotes, sources, and practice notes — not slide content. Covers the Geoffrey Hinton radiology-prediction quote (verified source/date/wording), the Boris Cherny and "Vibe Coding" (Gene Kim & Steve Yegge) citations, and the detailed real-project stories behind the Vibe Coding and Spec-Driven Development sections (the life-management app failure, the bug whack-a-mole loop, the CSV/pandas persistence story, and the Dex Horthy "read the code, not the plan" reversal). Flags still-open items like where to name Horthy in the SDD section.
