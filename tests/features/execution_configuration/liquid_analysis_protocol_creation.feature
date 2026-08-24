@admin
Feature: Liquid analysis protocol creation

  Background:
    Given the user is already logged in

  @protocolCreation
  Scenario: Create a new protocol with multiple test attributes
    When the user navigates to the new protocol form
    And the user fills in the protocol details
      | field           | value |
      | name            | jhnm  |
      | syrupId         | cft   |
      | customerFormula | sdft  |
    And the user fills in the attribute rows and saves the protocol
    Then the protocol "jhnm" should be created successfully

  @protocolUpdate
  Scenario: Update the created protocol
    Given the protocol "jhnm" is available in the protocol list
    When the user opens the protocol "jhnm" for editing
    And the user updates the protocol details
      | field           | value        |
      | name            | jhnm_updated |
      | syrupId         | cft_updated  |
      | customerFormula | sdft_updated |
    And the user saves the updated protocol
    Then the protocol "jhnm_updated" should be updated successfully

  @protocolDelete
  Scenario: Delete the created protocol
    Given the protocol "jhnm_updated" is available in the protocol list
    When the user opens the protocol "jhnm_updated" for deletion
    And the user confirms the protocol deletion
    Then the protocol "jhnm_updated" should be deleted successfully
