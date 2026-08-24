@admin
Feature: Requests

  Background:
    Given the user is already logged in
    And the user navigates to the "Requests" page

  @requests
  Scenario: Verify Requests page is displayed
    Then the "Requests" page should be displayed
    And the following request filter fields should be displayed:
      | Field          |
      | Request ID     |
      | Campaign       |
      | Test Attribute |
      | From Date      |
      | To Date        |
      | Status         |
    And the "Filter" button should be displayed
    And the "Reset Filters" option should be displayed

  @requestSearch
  Scenario: Search requests by keyword
    When the user searches for "CRQ-0366" in the Requests search field
    Then the request result for "CRQ-0366" should be displayed

  @requestFilter
  Scenario: Filter requests by Request ID
    When the user enters "CRQ-0366" in the Request ID filter
    And the user clicks the "Filter" button
    Then the request "CRQ-0366" should be displayed in the Requests table

  @requestFilter
  Scenario: Filter requests by Campaign
    When the user enters "CMP-1786962886198" in the Campaign filter
    And the user clicks the "Filter" button
    Then the matching campaign requests should be displayed

  @requestFilter
  Scenario: Filter requests by Test Attribute
    When the user enters "Benzoic Acid" in the Test Attribute filter
    And the user clicks the "Filter" button
    Then requests with Test Attribute "Benzoic Acid" should be displayed

  @requestStatus
  Scenario: Filter requests by status
    When the user opens the Status filter
    And the user selects "Approved"
    And the user clicks the "Filter" button
    Then only requests with "Approved" status should be displayed

  @requestDateFilter
  Scenario: Filter requests by date range
    When the user selects the From Date
    And the user selects the To Date
    And the user clicks the "Filter" button
    Then requests within the selected date range should be displayed

  @requestReset
  Scenario: Reset request filters
    When the user enters "CRQ-0366" in the Request ID filter
    And the user selects "Approved" from the Status filter
    And the user clicks the "Filter" button
    And the user clicks the "Reset Filters" option
    Then all request filters should be reset
    And the default Requests list should be displayed

  @requestView
  Scenario: View a request
    When the user clicks "View" for request "CRQ-0366"
    Then the request details should be displayed
