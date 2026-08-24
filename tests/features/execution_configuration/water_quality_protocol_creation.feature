@admin
Feature: Water Quality Protocol Creation

  Background:
    Given the user is already logged in

  @waterQualityProtocolCreation
  Scenario: Create a new Water Quality protocol with multiple test attributes
    When the user navigates to the Water Quality Protocol tab
    And the user opens the new Water Quality protocol form
    And the user enters the Water Quality protocol name "Water Quality Test Protocol"
    And the user selects the Water Quality facility "DP01"
    And the user adds the following Water Quality test attributes with bounds criteria
      | typeOfCheck | lowerLimit | upperLimit |
      | Analysis    | 1          | 100        |
      | Analysis    | 1          | 100        |
      | Analysis    | 1          | 100        |
      | HPLC        | 1          | 100        |
      | HPLC        | 1          | 100        |
      | HPLC        | 1          | 100        |
      | Analysis    | 1          | 100        |
      | Analysis    | 1          | 100        |
      | Analysis    | 1          | 100        |
      | HPLC        | 1          | 100        |
      | HPLC        | 1          | 100        |
      | HPLC        | 1          | 100        |
    And the user saves the Water Quality protocol
    Then the Water Quality protocol should be created successfully
    And the created Water Quality protocol should be displayed in the protocol list

  @waterQualityProtocolUpdate
  Scenario: Update the created Water Quality protocol
    When the user navigates to the Water Quality Protocol tab
    And the user searches for the created Water Quality protocol
    And the user opens the Water Quality protocol for editing
    And the user updates the Water Quality protocol name
    And the user saves the Water Quality changes
    Then the Water Quality protocol should be updated successfully
    And the updated Water Quality protocol details should be displayed

  @waterQualityProtocolDelete
  Scenario: Delete the created Water Quality protocol
    When the user navigates to the Water Quality Protocol tab
    And the user searches for the created Water Quality protocol
    And the user selects the Water Quality delete option
    And the user confirms the Water Quality deletion
    Then the Water Quality protocol should be deleted successfully
    And the deleted Water Quality protocol should not be displayed in the protocol list
