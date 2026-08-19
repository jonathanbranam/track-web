Feature: Melee PC archetype

  @scenario-id:melee-move-range
  Scenario: A melee PC's move range is limited to 4 tiles
    Given a melee PC at column 2, row 7
    When the player queries valid move destinations for the PC
    Then column 6, row 7 should be a valid move destination
    And column 7, row 7 should not be a valid move destination

  @scenario-id:melee-attack-targeting
  Scenario: A melee PC's attack targets only the adjacent tile in the chosen direction
    Given a melee PC at column 6, row 4
    When the player selects the attack direction right for the PC
    Then the attack target should be exactly column 7, row 4

  @scenario-id:melee-attack-adjacent-npc
  Scenario: A melee PC attacks an adjacent NPC
    Given a melee PC at column 5, row 5
    And an NPC with 3 hp at column 6, row 5
    When the PC attacks to the right
    Then the NPC's hp should be 1

  @scenario-id:melee-move-blocked
  Scenario: A melee PC's move range excludes occupied tiles
    Given a melee PC at column 2, row 7
    And a structure at column 4, row 7
    And an NPC with 3 hp at column 2, row 5
    When the player queries valid move destinations for the PC
    Then column 4, row 7 should not be a valid move destination
    And column 2, row 5 should not be a valid move destination
    And column 3, row 7 should be a valid move destination

  @scenario-id:melee-move-attack-same-turn
  Scenario: A melee PC moves then attacks an adjacent NPC in the same turn
    Given a melee PC at column 5, row 5
    And an NPC with 3 hp at column 7, row 5
    When the PC moves to column 6, row 5
    Then the PC should be at column 6, row 5
    And the PC should have 3 movement left
    When the PC attacks column 7, row 5
    Then the NPC's hp should be 1
    And the PC should be locked for the turn

  @scenario-id:melee-aligned-out-of-range-attack-refused
  Scenario: A melee PC aimed at an aligned tile beyond its reach does not strike the adjacent one
    Given a melee PC at column 5, row 5
    And an NPC with 3 hp at column 5, row 4
    When the PC tries to attack column 5, row 1
    Then the attack should be refused
    And the NPC's hp should be 3
    And the PC should be able to act again
