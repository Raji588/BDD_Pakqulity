@admin
Feature: CIP Protocol Creation

  Background:
    Given the user is already logged in

  @cipProtocolCreation
  Scenario: Create a new CIP protocol with multiple sections and test attributes
    When the user navigates to the CIP Protocol tab
    And the user opens the new CIP protocol form
    And the user enters the CIP protocol name "CIP Test Protocol"
    And the user adds the following sections
      | sectionName | assignedTo        |
      | Section 1   | Administrator     |
      | Section 2   | Quality Team Lead |
    And the user adds the following test attributes with bounds criteria
      | section   | typeOfCheck | frequency | lowerLimit | upperLimit |
      | Section 1 | Analysis    | Analysis  | 1          | 100        |
      | Section 1 | Analysis    | Beginning | 1          | 100        |
      | Section 1 | Analysis    | End       | 1          | 100        |
      | Section 1 | HPLC        | Analysis  | 1          | 100        |
      | Section 1 | HPLC        | Beginning | 1          | 100        |
      | Section 1 | HPLC        | End       | 1          | 100        |
      | Section 2 | Analysis    | Analysis  | 1          | 100        |
      | Section 2 | Analysis    | Beginning | 1          | 100        |
      | Section 2 | Analysis    | End       | 1          | 100        |
      | Section 2 | HPLC        | Analysis  | 1          | 100        |
      | Section 2 | HPLC        | Beginning | 1          | 100        |
      | Section 2 | HPLC        | End       | 1          | 100        |
    And the user saves the CIP protocol
    Then the CIP protocol should be created successfully
    And the created CIP protocol should be displayed in the protocol list

  @cipProtocolUpdate
  Scenario: Update the created CIP protocol
    When the user navigates to the CIP Protocol tab
    And the user searches for the created CIP protocol
    And the user opens the CIP protocol for editing
    And the user updates the CIP protocol name
    And the user saves the changes
    Then the CIP protocol should be updated successfully
    And the updated CIP protocol details should be displayed

  @cipProtocolDelete
  Scenario: Delete the created CIP protocol
    When the user navigates to the CIP Protocol tab
    And the user searches for the created CIP protocol
    And the user selects the delete option
    And the user confirms the deletion
    Then the CIP protocol should be deleted successfully
    And the deleted CIP protocol should not be displayed in the protocol list
