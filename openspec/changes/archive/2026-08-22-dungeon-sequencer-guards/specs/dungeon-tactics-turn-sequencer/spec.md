## ADDED Requirements

### Requirement: An enemy already spent through the action surface cannot be planned

Planning SHALL refuse an enemy that has already acted this round by being driven
through the action surface, with a reason, so that an enemy's turn is spendable
exactly once per round no matter which route spends it.

No host can currently reach this state — the action surface refuses an enemy
outright — so this is defence-in-depth rather than a live path. It is specified
because the engine must be correct for any host, including one that does not
exist yet, and because the two per-round records (movement and attack accounting,
versus whether an enemy has been planned) answer different questions and neither
otherwise reads the other.

#### Scenario: An enemy spent through the action surface cannot then be planned

- **WHEN** an enemy that has already moved or attacked this round through the
  action surface is planned
- **THEN** the engine refuses with a reason stating its turn is already spent,
  and nothing changes

#### Scenario: The AI will not plan a spent enemy either

- **WHEN** the round is advanced, and an enemy has already acted this round
  through the action surface
- **THEN** that enemy is not offered as the next thing to plan, and the enemy
  phase still reaches the player phase

#### Scenario: A fresh round clears the record

- **WHEN** a round ends after an enemy acted through the action surface
- **THEN** that enemy can be planned normally in the next round
