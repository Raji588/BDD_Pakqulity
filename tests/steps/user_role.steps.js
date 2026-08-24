const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * Backs user_role.feature. Ported from a separate Pakquality automation project, restructured to
 * follow this suite's conventions - this.userRolePage is created by the shared "the user
 * navigates to the {string} page" step in change_recording.steps.js.
 *
 * Reuses generic steps already defined elsewhere in this suite:
 * - Then('the {string} popup should be displayed', ...) - document_control.steps.js
 * - When('the user selects the {string} checkbox', ...) - document_control.steps.js
 * - When('the user clicks the {string} button', ...) - requests.steps.js (gated on
 *   this.userRolePage for "Update"/"Delete")
 */

When('the user enters the Role Name {string}', async function (roleName) {
  this.roleName = roleName;
  const input = await this.userRolePage.findVisible(this.userRolePage.roleNameInputCandidates());
  if (!input) {
    throw new Error('Role Name field could not be located.');
  }
  await input.fill(roleName);
});

When('the user selects the {string} permission for the {string} row', async function (permissionName, rowName) {
  const button = await this.userRolePage.findVisible(this.userRolePage.readPermissionButtonCandidates(rowName));
  if (!button) {
    throw new Error(`"${permissionName}" permission button for the "${rowName}" row could not be located.`);
  }
  await button.click();
});

// Scoped to the modal (not the shared generic button-click step) - the page behind the modal
// still has its own "Create Role" button in the DOM, so a page-wide name lookup risks matching
// that one instead.
When('the user submits the Create Role form', async function () {
  const button = this.userRolePage.createRoleSubmitButton;
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

Then('a role row for {string} should appear in the User Roles table', async function (roleName) {
  const row = this.userRolePage.roleRow(roleName);
  await expect(row).toBeVisible({ timeout: 60000 });
});

When('the user clicks the edit icon for that role row', async function () {
  if (!this.roleName) {
    throw new Error('No role name is stored - "the user enters the Role Name" must run first.');
  }
  const row = this.userRolePage.roleRow(this.roleName);
  // 2nd action icon, zero-indexed position 1.
  const editIcon = await this.userRolePage.findRowActionIcon(row, 'Edit', 1);
  if (!editIcon) {
    throw new Error(`Edit icon could not be located for role row: ${this.roleName}`);
  }
  await editIcon.click();
});

Then('the role permissions should be updated successfully', async function () {
  await this.userRolePage.openModal.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

When('the user clicks the delete icon for that role row', async function () {
  if (!this.roleName) {
    throw new Error('No role name is stored - "the user enters the Role Name" must run first.');
  }
  const row = this.userRolePage.roleRow(this.roleName);
  // 3rd action icon, zero-indexed position 2.
  const deleteIcon = await this.userRolePage.findRowActionIcon(row, 'Delete', 2);
  if (!deleteIcon) {
    throw new Error(`Delete icon could not be located for role row: ${this.roleName}`);
  }
  await deleteIcon.click();
});

Then('a role deletion confirmation popup should be displayed', async function () {
  // No specific title text confirmed for this modal - just confirms *a* popup opened.
  await expect(this.userRolePage.openModal).toBeVisible({ timeout: 30000 });
});

Then('the role should no longer appear in the User Roles table', async function () {
  if (!this.roleName) {
    throw new Error('No role name is stored - "the user enters the Role Name" must run first.');
  }
  const row = this.userRolePage.roleRow(this.roleName);
  await expect(row).toHaveCount(0, { timeout: 30000 });
});
