# Dungeon Tactics - Unit Framework

This document describes how units are defined in a turn-based, online tactics game
similar to a table-top RPG inspired by Into the Breach and other tactics games.

## New Approach

After playtesting, we have changes to improve the unit framework to make the
game more engaging for players. I have archived the current framework and plan
at @docs/games/dungeon-tactics/archive/*. Work with me to refine the new design
of the framework until all the details are clear. Write working docs for review
in the @Èdocs/games/dungeon-tactics folder as needed. The goal is: updated unit
framework based on new insights and a new phased plan for implementation.

Keep track of any TODOs in this document and list them at the end of the final
summary document.

The core approach of the framework with movement, targeting, and effect, is not
changing, but the design and options available to PCs is changing. The primary
initial change is that the PCs will now have more flexibility on their turn.
Each unit will have several actions available and possibly several moves
available. A unit may be able to:

1. move 2 squares
2. action: bash attack enemy with pushback
3. move
4. action: trip enemy

And they are choosing from a set of 3-10 possible actions. The action taken will
affect what their remaining choices are.

E.g. 
- some actions immediately end the players turn when taken
- some actions scan be chosen as many times as the user has slots
- some actions can only be taken N times (e.g. once or twice)
- some actions grant additional tiles of free movement before or after the action
- some actions include movement such as charge or flee or teleport

In defining the data model, I would prefer to keep the actions and interactions
between them defined in data (in the database) so that the behaviors can be
changed in the unit designer.

## Health

- start: docs/games/dungeon-tactics/archive/unit_framework.md:19
- end:   docs/games/dungeon-tactics/archive/unit_framework.md:30
- keep as is

## Attack system

### Targeting

```json
{
  "targeting": {
    "mode": "tile_line",
    "arc": "cardinal",
    "min_range": 0,
    "max_range": 6,
    "requires_los": true
  }
}
```

### Propagation

### Effect

## Mage

- movement traversal is teleportation
- has a selection of spells to choose from to cast

