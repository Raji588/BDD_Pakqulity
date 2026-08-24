Feature: User Role Management

  Background:
    Given the user is already logged in

  # Ported from a separate Pakquality automation project, restructured to follow this suite's
  # conventions. The "Create Role" popup's accessible label is the SAME text as the page-level
  # button that opens it, so the modal's own submit button stays scoped to the modal ("the user
  # submits the Create Role form") rather than reusing the shared generic button-click step a
  # second time - a page-wide name lookup would risk matching the button behind the modal instead.
  @userRole
  Scenario: Create a role, edit its permissions, then delete it
    When the user navigates to the "User Roles" page
    Then the "User Roles" page should be displayed
    When the user clicks the "Create Role" button
    Then the "Create Role" popup should be displayed
    When the user enters the Role Name "Test Role"
    And the user selects the "Read" permission for the "User" row
    And the user submits the Create Role form
    Then a role row for "Test Role" should appear in the User Roles table

    When the user clicks the edit icon for that role row
    Then the "Edit Role" popup should be displayed
    When the user selects the "Select All" checkbox
    And the user clicks the "Update" button
    Then the role permissions should be updated successfully

    When the user clicks the delete icon for that role row
    Then a role deletion confirmation popup should be displayed
    When the user clicks the "Delete" button
    Then the role should no longer appear in the User Roles table
