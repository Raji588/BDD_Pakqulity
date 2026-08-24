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
