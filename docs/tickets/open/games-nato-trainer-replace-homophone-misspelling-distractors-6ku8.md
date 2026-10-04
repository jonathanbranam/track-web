---
id: 6ku8
title: "Games: NATO trainer — replace homophone/misspelling distractors with real words starting with the same letter"
kind: feature
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: [8v3y]
tasks: [tw-s5q2]
---

## The ask

From the human, 2026-10-04, via advisor (verbatim):

> Okay, yeah, I tried the native again. It's great. I think the only problem I have with it is that some of the words are homophones, which is kind of pointless a little bit because this is a phonetic alphabet. When I say alpha, it doesn't matter how I spell that word at all.
>
> Let's get rid of the homophones, and I also think just use real words. I don't know the alphabet at all, so it's a good drill. At any rate, just show four words that start with the same letter. I think that'd be fine, but overall, it's good.

("native" = the NATO trainer from [[games-nato-alphabet-trainer-flash-4-letter-ids-tap-the-right-8v3y]], tw-vbjb.)

## The change

Change the distractors in `client-games/src/games/nato-alphabet/` (`nato.ts`, with tests in `nato.test.ts`):

- **Remove** every homophone and spelling-variant distractor (for example "Alpha" for Alfa, "Juliet" for Juliett). The correct answer must be the only option that *sounds like* the NATO word.
- **Distractors** are 3 real, ordinary English words that **start with the same letter** as the target and don't sound like the NATO word. For A, the options might be Alfa, Apple, Anchor, Arrow.
- Each letter needs a pool of distractors big enough that the options vary from one round to the next.
- Update the OpenSpec spec for the game to match.

The human said "overall, it's good", so leave everything else as it is.
