@admin
Feature: Campaign Execution

  Background:
    Given the user is already logged in
    Given the dashboard page is loaded

  @admin @dashboard
  Scenario: Dashboard
    Then Dashboard title should be displayed

  @liquidAnalysis @protocolCampaignCreate
  Scenario: Create a new protocol campaign
    When the user starts a new liquid analysis
    And the user searches for formula "HBC-3647" and selects the first result
    And the user fills in the batch details
      | field          | value          |
      | batchId        | A345           |
      | campaignId     | C345           |
      | customer       | Monster        |
      | flavor         | test           |
      | fgItemNumber   | FG Item Number |
      | format         | Format         |
      | batchTank      | 6              |
    And the user submits the batch
    Then the protocol campaign should be created successfully

  @liquidAnalysis @protocolCampaignExecution
  Scenario: Execute tests and complete the campaign
    When the user starts a new liquid analysis
    And the user searches for formula "HBC-3647" and selects the first result
    And the user fills in the batch details
      | field          | value          |
      | batchId        | A345           |
      | campaignId     | C345           |
      | customer       | Monster        |
      | flavor         | test           |
      | fgItemNumber   | FG Item Number |
      | format         | Format         |
      | batchTank      | 6              |
    And the user submits the batch
    And the user opens the newly created batch's analysis
    And the user completes the "Beginning" round tests
      | filler | value |
      | EAST   | 16    |
      | EAST   | 25    |
      | EAST   | 15    |
      | EAST   | 30    |
    And the user completes the "Middle" round tests
      | filler | value  |
      | EAST   | 31     |
      | EAST   | 26     |
      | EAST   | 15     |
      | EAST   | 2.2    |
      | EAST   | 666    |
      | EAST   | 1.0062 |
      | EAST   | 2.2    |
    And the user completes the "Beginning" round tests
      | filler | value |
      | WEST   | 32    |
    And the user sets the batch status to "COMPLETE"
