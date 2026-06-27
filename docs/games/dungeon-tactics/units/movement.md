## Movement

```json
{
  "movement": {
    "range": 3,
    "traversal": "walk",
    "diagonal": false,
    "passthrough": [],
    "blocked_by": []
  }
}
```

### Fields

**`range`** *(integer)*
The number of squares the unit can move per turn.

**`traversal`** *(string)*
How the unit physically moves through the environment.

| Value | Description |
|---|---|
| `walk` | Blocked by pits, walls, and elevation changes beyond step height |
| `fly` | Ignores pits, units, and elevation; blocked only by solid walls and ceilings |
| `teleport` | Instant movement from origin to destination |

> **TODO:** Add back capabilities for movement over different terrain (e.g. moving through water, climbing surfaces) and adjustments to the cost of moving through terrain per unit, after exploring the options and coming up with a data model.
>
> Previously `swim`, `climb`, and `jump` were traversal values. They were removed because they don't model capabilities properly. Some characters are able to move through water or climb surfaces, but that doesn't mean they are always swimming or climbing. A `swim` movement type would imply "only moves in water," which we don't need currently. Adjusting movement per terrain type should be covered in a different way.

**`diagonal`** *(boolean)*
Whether the unit can move diagonally. Most units move only in the four cardinal directions. Some units — spiders, ghosts, certain monsters — may move diagonally as well.

**`passthrough`** *(array of strings)* / **`blocked_by`** *(array of strings)*
Two complementary lists that control which entity categories block this unit's pathing. `passthrough` lists categories the unit can move *through* without being blocked; `blocked_by` lists categories that stop the unit. Note that a unit cannot end its movement on a tile occupied by another unit; these fields only affect pathing.

| Value | Description |
|---|---|
| `allied_units` | Friendly units |
| `enemy_units` | Hostile units |
| `structures` | Walls, doors, pillars |
| `objects` | Barrels, boulders, furniture |
| `any` | All other entities |

**Defaults.** Every character has the following defaults. They are *not* stored in the data model:

- `passthrough`: `allied_units`
- `blocked_by`: `enemy_units`, `structures`, `objects`

An empty list for `passthrough` or `blocked_by` means the defaults apply. Only modifications to the defaults are stored — so the lists in the data model contain just the deltas, not the full effective set. When showing these fields in the UI, the defaults should not be included in the list for that field.

> **TODO:** Define validation to ensure the chosen values are logical:
> - The same item must not appear in both lists.
> - `any` must be alone in a list.
> - Flag a configuration that matches the default as meaningless, including after evaluating `any`.
>
> **TODO:** Define the exact order of applying rules:
> - The same value must not appear in both lists.
> - Without `any`: apply the rules as listed.
> - With `any`: first add all values to the chosen list, then remove the values that appear in the alternate list.

### Terrain Movement Costs

> **Future enhancement — not implemented.** This section describes a planned direction, not current behavior. It may be kept in code for now as long as it is not part of the data model.

Terrain can modify the effective cost of entering a tile. Rather than treating terrain as binary passable/impassable, each terrain type can define a movement cost per traversal type.

```json
{
  "terrain": {
    "id": "swamp",
    "movement_costs": {
      "walk": 2,
      "fly": 1
    },
    "passable_by": ["walk", "fly"]
  }
}
```

A unit with `range: 3` moving through two swamp tiles would only have 1 square of movement remaining.

> **TODO:** Define terrain types per-region (biome) in the region editor.

### Movement Examples

**Rogue** (slips past enemies)
```json
{
  "movement": {
    "range": 4,
    "traversal": "walk",
    "diagonal": false,
    "passthrough": ["enemy_units"],
    "blocked_by": []
  }
}
```

**Harpy** (flying unit)
```json
{
  "movement": {
    "range": 5,
    "traversal": "fly",
    "diagonal": false,
    "passthrough": [],
    "blocked_by": []
  }
}
```

**Wraith** (incorporeal)
```json
{
  "movement": {
    "range": 4,
    "traversal": "walk",
    "diagonal": true,
    "passthrough": ["any"],
    "blocked_by": []
  }
}
```
