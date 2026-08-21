## ADDED Requirements

### Requirement: An enemy already spent through the action surface cannot be planned

Planning SHALL refuse an enemy that has already acted this round by being driven
directly, with a reason — the mirror of the action surface refusing an enemy that
has already been planned. Together these make an enemy's turn spendable exactly
once per round regardless of which route spends it.

#### Scenario: A hand-driven enemy cannot then be planned

- **WHEN** an enemy that has already moved or attacked this round through the
  action surface is planned
- **THEN** the engine refuses with a reason stating its turn is already spent,
  and nothing changes

#### Scenario: The AI will not plan a spent enemy either

- **WHEN** the round is advanced, and an enemy has already acted this round
  through the action surface
- **THEN** that enemy is not planned again as part of the enemy phase

#### Scenario: A fresh round clears the record

- **WHEN** a round ends after an enemy acted through the action surface
- **THEN** that enemy can be planned normally in the next round
