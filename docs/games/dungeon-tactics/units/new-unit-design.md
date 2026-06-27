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

## Mage

- has N mana (e.g. 3 at start)
- has a selection of spells to choose from to cast
- spells cost different amounts of mana (1-3 typical)
- can move freely (up to maximum movement) between casting
- movement is teleportation
- each spell has its own targeting and effects as per the attack definition
- spells:
  * create wall
  * destroy wall
  * wall of fire
  * obscuring fog - costs more movement to traverse
  * ice flow - freezes ground, adding icy status to tile, units slide (do not
  implement this, just an example)
  * freeze enemy - status effect to stop attack

## Rogue

- can move / action / move
- has a certain number of movement points they can use at one time
- then they must take an action to get more movement points
- certain actions end the turn after chosen
- some actions grant additional movement points
- can move diagonally and/or move through enemy units (TBD after playtesting)

## Barbarian

- can move then attack
- some actions / attacks have movement part of them such as charge
- many attacks have pushback
- can grant self status "raging" which increases movement and damage (not
encoded in the action, just "raging" is encoded)
- action to "taunt" enemy to move closer
- action to "shove" enemy: no damage, only pushback, barbarian doesn't move
- action to "enrage" an enemy: given them status enraged; target barbarian
  * enemy now moves and targets the barbarian only until status ends

## Ranger

- has a long bow with a set of arrows with different effects that change on a
rotation:
  * normal arrow; poison arrow; exploding arrow
- forced to move between actions
- other actions:
  * another long bow attack
  * throw a net
  * throw a spear
  * crossbow
  * drop caltrops




