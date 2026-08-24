Feature: Core Configuration

  Background:
    Given the user is already logged in

  # Ported from a separate Pakquality automation project, restructured to follow this suite's
  # conventions. Combined create/create-without-description/edit/delete into one continuous
  # scenario (matching this feature's Micro Test scenario below) rather than four separate ones.
  # Attribute name is auto-incremented ("Auto Attribute 1", "Auto Attribute 2", ...) via
  # tests/support/attributeCounter.js - the app rejects duplicate attribute names, and the counter
  # persists across runs, not just within one run. Explicit 2-second waits are inserted between
  # create -> edit and edit -> delete.
  @coreConfigurationTestAttribute
  Scenario: Create, edit, and delete a test attribute
    Given the user navigates to "Configuration" > "Core Configuration"
    When the user clicks the "New Test Attribute" button
    Then the "New Test Attribute" popup should be displayed
    When the user selects "Textbox" as the input type
    And the user enters a unique attribute name
    And the user enters the unit of measurement "NA"
    And the user enters the attribute description "Created by automation script"
    And the user clicks the "Save" button
    Then the created test attribute should appear in the Test Attributes table
    And the created test attribute should be the first entry in the Test Attributes table
    And the test attribute row should show unit of measurement "NA"

    When the user clicks the "New Test Attribute" button
    Then the "New Test Attribute" popup should be displayed
    When the user selects "Textbox" as the input type
    And the user enters a unique attribute name
    And the user enters the unit of measurement "NA"
    And the user clicks the "Save" button
    Then the created test attribute should appear in the Test Attributes table
    And the created test attribute should be the first entry in the Test Attributes table
    And the test attribute row should show unit of measurement "NA"

    When the user waits 2 seconds
    And the user clicks the edit icon for the second created test attribute
    And the user clears the attribute name and changes it to a new unique name
    And the user clicks the "Update" button
    Then the edited test attribute should appear in the Test Attributes table

    When the user waits 2 seconds
    And the user clicks the delete icon for the last edited test attribute
    Then a delete confirmation popup should be displayed
    When the user clicks the "Delete" button
    Then the deleted test attribute should no longer appear in the Test Attributes table

  # "COA" here is a category header ON the Test Attribute page itself, not the top-level Core
  # Configuration tab of the same name - confirmed via a live diagnostic dump. "Micro Tests" nests
  # inside "Off-site Testing".
  @coreConfigurationMicroTest
  Scenario: Create, edit, and delete a Micro Test
    Given the user navigates to "Configuration" > "Core Configuration"
    When the user clicks on the "COA" category
    And the user expands the "Off-site Testing" section
    And the user expands the "Micro Tests" section
    And the user clicks the New "Micro" Test button
    Then the "New Micro Test" popup should be displayed
    When the user enters the Test Name "Automated MicroTest"
    And the user adds the value "1"
    And the user adds the value "2"
    And the user clicks the "Save" button
    Then the "Automated MicroTest" row should appear in the table

    When the user clicks the edit icon for the test row
    And the user adds the value "3"
    And the user enters the Test Name "Automated MicroTest2"
    And the user clicks the "Update" button
    Then the "Automated MicroTest2" row should appear in the table

    When the user clicks the delete icon for the test row
    Then a delete confirmation popup should be displayed
    When the user clicks the "Delete" button
    Then the "Automated MicroTest2" row should no longer appear in the table

  # "Chem" is nested INSIDE "Off-site Testing" too (a sibling of "Micro Tests"), confirmed via a
  # live failure screenshot after first assuming it was a sibling of Off-site Testing itself.
  @coreConfigurationChemTest
  Scenario: Create and delete a Chem Test
    Given the user navigates to "Configuration" > "Core Configuration"
    When the user clicks on the "COA" category
    And the user expands the "Off-site Testing" section
    And the user expands the "Chem" section
    And the user clicks the New "Chem" Test button
    Then the "New Chem Test" popup should be displayed
    When the user enters the Test Name "Automated Chem test"
    And the user clicks the "Save" button
    Then the "Automated Chem test" row should appear in the table

    When the user clicks the delete icon for the test row
    Then a delete confirmation popup should be displayed
    When the user clicks the "Delete" button
    Then the "Automated Chem test" row should no longer appear in the table

  # Start/End Time selection uses Ant Design's standard TimePicker markup, not a recording's
  # positional clicks (see CoreConfigurationPage.setTimeField()).
  @coreConfigurationShift
  Scenario: Add, edit, and delete a shift
    Given the user navigates to "Configuration" > "Core Configuration"
    When the user clicks on the "Shifts" category
    And the user clicks the "Add Shift" button
    Then the "Add Shift" popup should be displayed
    When the user enters the Shift Name "Automation Test"
    And the user sets the "Start Time" to "00:00"
    And the user sets the "End Time" to "07:00"
    And the user clicks the "Save" button
    Then the "Automation Test" row should appear in the table

    When the user waits 2 seconds
    And the user clicks the edit icon for the test row
    And the user sets the "Start Time" to "01:00"
    And the user clicks the "Update" button
    Then the "Automation Test" row should appear in the table

    When the user waits 2 seconds
    And the user clicks the delete icon for the test row
    Then a delete confirmation popup should be displayed
    When the user clicks the "Delete" button
    Then the "Automation Test" row should no longer appear in the table
