+++
id = "tw-54dc"
title = "Space golf: the wall behind the black-hole goal is usually a bounce"
kind = "feature"
state = "open"
created_at = "2026-09-29T02:44:42.421Z"
updated_at = "2026-09-29T03:08:11.441582Z"
summary = "Hot Zone switched to bounce sides; Tailwind stays wrap (spec needs a wrap level; edge stars use the seam). Spec now says levels SHOULD default to bounce."
+++

From the human, 2026-09-28, via advisor (verbatim). Game: client-games space-golf (`client-games/src/games/space-golf/`, spec `openspec/specs/games-space-golf/spec.md`).

> the wall behind the black hole goal should usually be a bounce; it feels more like putt-putt

## Thread

### note · agent:goal-wall · 2026-09-29T03:08:11.423Z
Sides are level-wide (not per-wall). Hot Zone -> bounce (no wrap-dependent design). Left Tailwind as wrap: spec requires a wrap level and its edge stars (x=10/390) rely on the seam. Added a bounce-by-default SHOULD to the spec's level-sequence requirement. Tests+build pass.
