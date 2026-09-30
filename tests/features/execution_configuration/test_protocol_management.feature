@admin @testProtocolManagement
Feature: Execution Configuration - Test Protocol Management

  Background:
    Given the user is already logged in
    And the user navigates to "Configuration" > "Execution Configuration"

  @testProtocolLoad
  Scenario: Execution Configuration page loads with Test Protocol tab active by default
    Then the "Execution Configuration" page title should be displayed
    And the "Test Protocol" tab should be selected
    And the following tabs should be visible:
      | Test Protocol          |
      | CIP Protocol           |
      | Bulk Offload Protocol  |
      | Water Quality Protocol |

  @testProtocolColumns
  Scenario: Test Protocol table displays the expected columns
    Then the Test Protocol table should display the following columns:
      | Name              |
      | Syrup ID          |
      | Customer Formula  |
      | Status            |
      | Spec Limit        |
      | Generate COA      |
      | Last Updated      |
      | Last Updated By   |
      | Actions           |

  @testProtocolTabs
  Scenario: Switch to the CIP Protocol tab
    When the user clicks the "CIP Protocol" tab
    Then the "CIP Protocol" tab should be selected

  @testProtocolTabs
  Scenario: Switch to the Bulk Offload Protocol tab
    When the user clicks the "Bulk Offload Protocol" tab
    Then the "Bulk Offload Protocol" tab should be selected

  @testProtocolTabs
  Scenario: Switch to the Water Quality Protocol tab
    When the user clicks the "Water Quality Protocol" tab
    Then the "Water Quality Protocol" tab should be selected

  @testProtocolSearch
  Scenario: Search for a test protocol by name
    When the user searches for "jhnm424627" in the Test Protocol search box
    Then the Test Protocol table should only show rows containing "jhnm424627"

  @testProtocolFilters
  Scenario: Expand the Filters panel
    When the user clicks "Filters"
    Then the Filters panel should be expanded

  @testProtocolCreate
  Scenario: Create a new Test Protocol
    When the user clicks the "New Test Protocol" button
    Then the "New Test Protocol" form should be displayed

  @testProtocolStatus
  Scenario: A test protocol's status is shown as Enabled
    Given a test protocol has been created for this run
    Then that protocol's row should show status "Enabled"

  @testProtocolEdit
  Scenario: Edit an existing test protocol
    Given a test protocol has been created for this run
    When the user clicks the edit action for that protocol
    Then the "Edit Test Protocol" form should be displayed

  @testProtocolDuplicate
  Scenario: Duplicate an existing test protocol
    Given a test protocol has been created for this run
    When the user clicks the copy action for that protocol
    Then the "New Test Protocol" form should be displayed pre-filled from that protocol
    When the user saves the duplicated protocol under a unique name
    Then a duplicated protocol row should appear in the Test Protocol table

  @testProtocolHistory
  Scenario: View change history for a test protocol
    Given a test protocol has been created for this run
    When the user clicks the history action for that protocol
    Then the change history for that protocol should be displayed

  @testProtocolDelete
  Scenario: Delete a test protocol
    Given a test protocol has been created for this run
    When the user searches for that protocol in the Test Protocol search box
    And the user clicks the delete action for that protocol
    Then a deletion confirmation dialog should be displayed
    When the user confirms the deletion
    Then that protocol should no longer appear in the Test Protocol table
