@admin
Feature: Change Recording

  Background:
    Given the user is already logged in

  @changeRecording
  Scenario: Verify Change Recording status filter options
    When the user navigates to the "Change Recording" page
    And the user opens the change recording status filter
    Then the following recording status options should be displayed:
      | Status  |
      | Created |
      | Updated |
      | Deleted |

  @changeRecordingSearch
  Scenario: Search change recording by keyword
    Given the user is on the "Change Recording" page
    When the user searches for "jhnm" in the Change Recording search field
    Then the change recording results for "jhnm" should be displayed

  @changeRecordingFilter
  Scenario: Filter change recordings by Created status
    Given the user is on the "Change Recording" page
    When the user opens the change recording status filter
    And the user selects "Created" from the status filter
    Then only "Created" change recordings should be displayed

  @changeRecordingFilter
  Scenario: Filter change recordings by Updated status
    Given the user is on the "Change Recording" page
    When the user opens the change recording status filter
    And the user selects "Updated" from the status filter
    Then only "Updated" change recordings should be displayed

  @changeRecordingFilter
  Scenario: Filter change recordings by Deleted status
    Given the user is on the "Change Recording" page
    When the user opens the change recording status filter
    And the user selects "Deleted" from the status filter
    Then only "Deleted" change recordings should be displayed

  @changeRecordingClear
  Scenario: Clear the Change Recording status filter
    Given the user is on the "Change Recording" page
    When the user opens the change recording status filter
    And the user selects "Updated" from the status filter
    And the user clears the status filter
    Then the default Change Recording records should be displayed
