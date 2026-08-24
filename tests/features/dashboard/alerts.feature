@admin @liquidAnalysis
Feature: Alerts

  Background:
    Given the user is already logged in
    And the dashboard page is loaded
    And the user has created a valid Test Protocol
    And the user has created a campaign using the created Test Protocol
    And the campaign is ready for execution
    And the user starts executing the campaign

  @fillerFailureNotification
  Scenario: Show in-app notification when the second test fails
    Given the first test execution for the filler has failed
    When the second test execution for the same filler fails
    Then an in-app notification should be displayed
    And the corresponding filler should remain active
    And the campaign execution should continue

  @fillerFailureSpecChangeRequest
  Scenario: Create Spec Change Request when the third test fails
    Given the first two test executions for the filler have failed
    When the third test execution for the same filler fails
    Then a Spec Change Request should be triggered
    And the corresponding filler should remain active until the required action is completed

  @fillerFailurePause
  Scenario: Pause the corresponding filler when the fourth test fails
    Given the first three test executions for the filler have failed
    When the fourth test execution for the same filler fails
    Then the corresponding filler should be paused
    And no further tests should be executed for the paused filler
    And other active fillers should continue their execution

  # Ported from a separate Pakquality automation project, restructured to follow this suite's
  # conventions. Confirms (rather than always cancelling, like every scenario above) the Spec
  # Change Request the third failure raises, then reviews and approves it from the separate
  # Requests page (raising the upper limit to accommodate the value, with its own comment +
  # Approve button).
  @specChangeRequestApproval
  Scenario: Approve a Spec Change Request raised after the third test failure
    Given the first two test executions for the filler have failed
    When the third test execution for the same filler fails
    Then a Spec Change Request should be triggered
    When the user enters "Test" in the Spec Change Request comment
    And the user confirms the Spec Change Request

    When the user navigates to the "Requests" page
    Then the "Requests" page should be displayed
    When the user searches for the campaign created in this scenario in the Requests search field
    Then a search result row for the campaign created in this scenario should appear
    When the user views the request for the campaign created in this scenario
    Then a record details popup should be displayed
    When the user opens the Approval section
    And the user sets the upper limit to "21"
    And the user enters "Approved" in the Approval comment
    And the user clicks the "Approve" button
    Then the spec change request should be approved successfully
