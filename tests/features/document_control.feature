Feature: Document Control

  Background:
    Given the user is already logged in

  # Ported from a separate Pakquality automation project, restructured to follow this suite's
  # conventions. Depends on campaign_execution.feature's "Execute tests and complete the
  # campaign" scenario (@protocolCampaignExecution) having just run in the same cucumber-js
  # invocation - NOT the plain "Create a new protocol campaign" scenario, confirmed via a live
  # failure that a freshly created-but-not-yet-executed campaign doesn't show up in Document
  # Control's search at all ("No data") - it only becomes searchable here once its rounds have
  # been run and the campaign completed, same as the source project's dependency on a fully
  # executed liquid_analysis.feature scenario. Searches for the campaign the execution scenario
  # created (by its Campaign ID field, tracked via campaignState.js), approves its COA record,
  # then downloads the generated COA PDF. Same cross-scenario chaining convention already used
  # within this suite (e.g. CIP Protocol Creation's create -> update -> delete).
  @documentControlCoaGeneration
  Scenario: Approve and download the COA for the campaign created in Liquid Analysis
    Given the user navigates to "Document Control" > "Liquid Analysis"
    When the user clicks the "Pending Review" button
    And the user searches for the campaign created in the previous scenario
    Then a search result row for that campaign should appear as the first entry
    When the user clicks the edit icon for the first search result row
    Then the "Edit Record" popup should be displayed
    When the user selects "Approved" from the Status dropdown
    And the user clicks the "Save" button
    # The "Pending Review" quick filter (still active from earlier) legitimately stops matching
    # this record the moment its status changes away from "Pending Review" - switching to
    # "All Campaigns" (status-agnostic) and re-searching avoids relying on a filter that would
    # otherwise race against the status update.
    When the user clicks the "All Campaigns" button
    And the user searches for the campaign created in the previous scenario
    Then the search result row should show status "Approved"
    When the user clicks the "Download COA" button for the first search result row
    Then the COA PDF file should be downloaded successfully
    When the user clicks the "Download Files" icon for the first search result row
    Then the "Select Test Attributes to Download" popup should be displayed
    When the user selects the "Select All" checkbox
    And the user downloads the selected files
    Then the selected files should be downloaded successfully

  # Same campaign as the scenario above - re-searched via "All Campaigns" + campaign ID, since the
  # campaign is already "Approved" by this point (the default "Pending Review" filter would show
  # no results). Customer Download opens an entirely new browser tab - every step from the icon
  # click onward operates on that tab, not the original one.
  @documentControlCustomerDownload
  Scenario: Customer download for the campaign created in Liquid Analysis
    Given the user navigates to "Document Control" > "Liquid Analysis"
    When the user clicks the "All Campaigns" button
    And the user searches for the campaign created in the previous scenario
    Then a search result row for that campaign should appear as the first entry
    When the user clicks the "Customer Download" icon for the first search result row
    Then a new browser tab should open for customer download
    When the user clicks the Release to Customer button
    And the user clicks the Add Row button
    And the user selects "End" for the new row
    And the user enters "Edited by Automation" in the Comments column for the first row
    And the user clicks the Generate and Download button
    Then the customer download file should be downloaded successfully

  # Depends on at least one "Approved" record already existing - relies on the COA Generation
  # scenario above having just run in the same cucumber-js invocation. Archives/unarchives
  # whatever is the FIRST row under the "Approved" filter, not a specific campaign by ID.
  @documentControlArchive
  Scenario: Archive and unarchive a document control record
    Given the user navigates to "Document Control" > "Liquid Analysis"
    When the user clicks the "Approved" button
    Then at least one search result row should be visible
    When the user clicks the archive icon for the first search result row
    Then an archive confirmation popup should be displayed
    When the user clicks the "Archive" button
    When the user clicks the View Archives button
    Then at least one search result row should be visible
    When the user unarchives the first archived record
    Then the record should be unarchived successfully
