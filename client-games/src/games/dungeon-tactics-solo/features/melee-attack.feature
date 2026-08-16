Feature: Melee PC attack

  Scenario: A melee PC attacks an adjacent NPC
    Given a melee PC at column 5, row 5
    And an NPC with 3 hp at column 6, row 5
    When the PC attacks to the right
    Then the NPC's hp should be 1
