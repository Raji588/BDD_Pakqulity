@admin
Feature: Execution Dashboard

  Background:
    Given the user is already logged in

  @executionDashboard @productionLineFilter
  Scenario: Filter the Execution Dashboard by production line and clear it
    When the user opens the Execution Dashboard
    And the user filters by production line "Line 23"
    Then the production line filter should show "Line 23"
    When the user clears the production line filter
    Then the production line filter should be empty
