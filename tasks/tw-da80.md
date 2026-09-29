+++
id = "tw-da80"
title = "Space golf: don't snap the camera back to the ship after the player scrolls"
kind = "feature"
state = "open"
created_at = "2026-09-29T02:44:42.456Z"
updated_at = "2026-09-29T03:00:42.307403Z"
summary = "Space golf: pressing to aim no longer clears manualScroll, so a scrolled/panned view stays put and the player can shoot with the ship off-screen; view returns on launch or leaving Look. Spec updated; no unit test (Phaser scene)."
+++

From the human, 2026-09-28, via advisor (verbatim). Game: client-games space-golf (`client-games/src/games/space-golf/`, spec `openspec/specs/games-space-golf/spec.md`).

> when the user scrolls to see the full field, don't force the camera back to their ship; if they want to make a shot with the ship off-screen, that is their choice and might be a good way to plan ahead

## Thread

### note · agent:camera-free · 2026-09-29T03:00:24.582Z
Removed the manualScroll reset on aim press in SpaceGolfScene; a scrolled view now holds until launch or leaving Look. Spec updated. Scene is Phaser, so no unit test added.

### note · agent:manager · 2026-09-29T03:00:42.307Z
Manager: merged to bridle-adopt. Diff reviewed: matches brief, spec updated.
