---
id: h679
title: "Games: Hole.io clone — research gameplay and reviews"
kind: research
opened: 2026-10-04
repos: [track-web]
changes: []
specs: []
needs: []
see: [5sbv, q5ff]
tasks: []
---

## The ask

From the human, 2026-10-04, via aide (verbatim):

> Do research on gameplay and reviews and build a hole.io clone.

## What to find out

Feeds the build ticket (see below). Keep it short and aimed at what we'd build.

- **Core loop:** how the hole moves and grows, what it can swallow at each size, round length, scoring.
- **Modes:** classic (timed battle against bots or players), solo, battle royale, and which one is worth copying first.
- **Opponents:** how the bots behave, and whether a hole can swallow a smaller one.
- **Feel:** physics of objects falling in, camera zoom as the hole grows, controls on touch (drag versus virtual joystick).
- **Reviews:** what players like and what they complain about (ads, repetition, unfair bots), and what we should do differently.
- **Fit for client-games:** the original is 3D. Recommend a Phaser 3 approach (top-down 2D, or faked 3D), sized for phones and with Phaser externalized as CLAUDE.md requires.

Output: findings written on this ticket, plus a proposed rule set for the build ticket. Ask the human about anything the research leaves open.
