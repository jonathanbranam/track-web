# Software Engineering Skills Are More Important Than Ever — Overview

## Talk Summary

The talk opens by skewering the recurring "SWE is dead" cycle — headlines from
2022 through 2026 that predict coding's demise on an almost annual schedule —
before landing on an honest personal admission: the speaker believed it for a
while. That vulnerability sets up the real argument: software engineering is a
discipline, not a keyboarding skill, and it rests on two enduring principles
that AI makes *more* important, not less — optimize for feedback loops, and
manage complexity.

The bulk of the talk is a first-person journey through three stages of
AI-assisted development. Stage one ("vibe coding") is a cautionary tale of
unconstrained chat-based generation: a lone helper spamming commands, fixing
one bug while quietly reviving another, building forty-seven things nobody
asked for, and — once it runs out of room to hold the situation in mind —
confidently giving perfectly reasonable advice for a fight that isn't
happening. It ends in an avoidable death. Stage two (spec-driven development)
shows real improvement — writing the plan first, aligning before acting — but
reveals a new trap: growing a small team you never stop babysitting, and
plans clean enough that you stop watching how they're actually carried out.
That invisible gap surfaces at the worst moment: a confidently-executed action
that makes things catastrophically worse, undetected until it's too late.
Stage three (the "harness") is the synthesis: defined roles and boundaries,
standing rules that catch a known mistake before it happens, and a system that
corrects itself well enough that watching it becomes boring — which is the
whole point.

The climax pays off the opening dread directly: the antagonist the prologue
warned would make the hero obsolete is defeated not by outworking it, but by
commanding it well — a skill most people don't yet have. A turn beat
acknowledges that not everything gets cleaned up — an early, broken build is
still standing because fixing it now costs more than living with it, a
reminder that the cost of *changing* code always outweighs the cost of writing
it. The talk closes by returning to the opening fear and resolving it cleanly:
the dread was real, but aimed at the wrong thing. The world isn't short on
people who can produce code quickly; it's short on people who know how to lead
what gets produced. Typing was never the valuable part. Judgment, design,
architecture, and knowing what "good" looks like — those don't get
commoditized when the code gets faster to produce. If anything, higher output
volume raises the stakes on getting design right.

## As Dragon Warrior Gameplay

If this talk were a Dragon Warrior RPG, the speaker begins the game as a
max-level hero booting up an "AI-Enhanced Edition" of a game he'd already
finished, and reads the prophecy scroll: *"The Hero's role is obsolete. The
Dragonlord's AI minions shall replace all adventurers."* Stage one is heading
into the dungeon with one generic familiar and a pile of commands — the
familiar fights fast and messy, revives a bug-slime it just killed, and
eventually runs out of context mid-battle: it turns to you and, with HP
critical, cheerfully asks whether you'd like to head back to town for
potions. You die on the first floor and the King revives you for half your
gold.

In town, a battle-hardened veteran (a scarred pastiche of a real practitioner
who's actually run a dozen concurrent agents) tells you the trick isn't more
familiars — it's writing the plan down and following it. Stage two is doing
exactly that: you recruit a couple more familiars, write a battle spec, and
the party visibly starts winning — while you're frantically juggling every
one of them and have stopped watching how, exactly, they fight. That gap
costs you: a familiar casts Fire on a recurring enemy that *heals* from flame,
and your party wipes to a mistake a spec never would have caught, because
nobody was reading the execution.

Stage three is the familiar training ground: four familiars with defined
roles, a standing order pinned above the party — *"HOLD FIRE vs. Hellspawn —
it feeds on flame"* — and a battle that runs itself so cleanly it's boring to
watch. That's the tell. The climax is the Dragonlord and his AI minions, the
very thing the prophecy said would end you — and a low-level squire fells him
not by outfighting him, but by commanding well. A quieter beat acknowledges
the early dungeon you never went back to fix — still standing, cracks and
all, too costly to raze now. The game ends in town, where villagers now beg
for warriors to lead their familiars, including one whose son went in with
only a familiar and is lost — the same mistake stage-one-you made. *To be
continued.*
