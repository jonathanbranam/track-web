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
