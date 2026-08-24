@admin
Feature: Bulk Offload Protocol Creation

  Background:
    Given the user is already logged in

  @bulkOffloadProtocolCreation
  Scenario: Create a new Bulk Offload protocol with multiple sections and test attributes
    When the user navigates to the Bulk Offload Protocol tab
    And the user opens the new Bulk Offload protocol form
    And the user enters the Bulk Offload protocol name "Bulk Offload Test Protocol"
    And the user adds the following Bulk Offload sections
      | sectionName | assignedTo        |
      | Section 1   | Administrator     |
      | Section 2   | Quality Team Lead |
    And the user adds the following Bulk Offload test attributes with bounds criteria
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
    And the user saves the Bulk Offload protocol
    Then the Bulk Offload protocol should be created successfully
    And the created Bulk Offload protocol should be displayed in the protocol list

  @bulkOffloadProtocolUpdate
  Scenario: Update the created Bulk Offload protocol
    When the user navigates to the Bulk Offload Protocol tab
    And the user searches for the created Bulk Offload protocol
    And the user opens the Bulk Offload protocol for editing
    And the user updates the Bulk Offload protocol name
    And the user saves the Bulk Offload changes
    Then the Bulk Offload protocol should be updated successfully
    And the updated Bulk Offload protocol details should be displayed

  @bulkOffloadProtocolDelete
  Scenario: Delete the created Bulk Offload protocol
    When the user navigates to the Bulk Offload Protocol tab
    And the user searches for the created Bulk Offload protocol
    And the user selects the Bulk Offload delete option
    And the user confirms the Bulk Offload deletion
    Then the Bulk Offload protocol should be deleted successfully
    And the deleted Bulk Offload protocol should not be displayed in the protocol list
