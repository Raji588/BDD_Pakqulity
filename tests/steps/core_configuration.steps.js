const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { nextAttributeName } = require('../support/attributeCounter');

// Feature-file Test Name -> the per-run suffixed name actually typed (see "the user enters the
// Test Name" step).
const RUN_SUFFIX = Date.now().toString().slice(-6);
const runNames = new Map();

/**
 * Backs core_configuration.feature. Ported from a separate Pakquality automation project,
 * restructured to follow this suite's conventions - this.coreConfigurationPage is created by the
 * shared "the user navigates to {string} > {string}" step in
 * execution_configuration/test_protocol_management.steps.js.
 *
 * Cross-scenario tracking: the source project chained Test Attribute create -> edit -> delete
 * across separate Cucumber scenarios via a module-scoped variable (same pattern as this suite's
 * own CIP Protocol Creation). Combined into a single continuous scenario here instead (see
 * core_configuration.feature), so this.testAttributeName / this.testName on the World is enough -
 * no module-scoped state needed for that chain. The Micro/Chem Test and Shift scenarios reuse
 * the same this.testName tracker generically (see the "generic row lookup" steps below).
 */

// Generic fixed wait - page-agnostic, reusable wherever a scenario needs an explicit delay
// between two steps rather than relying solely on spinner/visibility waits.
When('the user waits {int} seconds', async function (seconds) {
  await this.page.waitForTimeout(seconds * 1000);
});

// --- Test Attribute (create / edit / delete) ---

When('the user selects {string} as the input type', async function (inputType) {
  const page = this.coreConfigurationPage;
  const tile = page.inputTypeTile(inputType);
  if (await tile.isVisible().catch(() => false)) {
    await tile.click();
    return;
  }
  const dropdown = await page.findInputTypeDropdown(page.newAttributeModal);
  if (dropdown) {
    await dropdown.click();
    await this.page.waitForTimeout(300);
    const option = page.inputTypeDropdownOption(inputType);
    await expect(option).toBeVisible({ timeout: 30000 });
    await option.click();
    return;
  }
  const directOption = await page.findInputTypeDirectOption(page.newAttributeModal, inputType);
  if (directOption) {
    await directOption.click();
    return;
  }
  throw new Error(`Input type "${inputType}" could not be selected - no tile, dropdown, radio, or segmented control matched.`);
});

When('the user enters a unique attribute name', async function () {
  const attributeName = nextAttributeName();
  this.testAttributeName = attributeName;
  await this.coreConfigurationPage.fillModalField(this.coreConfigurationPage.newAttributeModal, 'Attribute Name', attributeName);
});

// Gherkin wording stays "unit of measurement" for readability - only the internal field-name
// lookup uses the real label ("Unit of Measure").
When('the user enters the unit of measurement {string}', async function (unit) {
  await this.coreConfigurationPage.fillModalField(this.coreConfigurationPage.newAttributeModal, 'Unit of Measure', unit);
  this.testAttributeUnit = unit;
});

When('the user enters the attribute description {string}', async function (description) {
  await this.coreConfigurationPage.fillModalField(this.coreConfigurationPage.newAttributeModal, 'Description', description);
});

When('the user clicks the edit icon for the second created test attribute', async function () {
  if (!this.testAttributeName) {
    throw new Error('No attribute name is stored - the second "New Test Attribute" creation must run first.');
  }
  this.editTargetAttributeName = this.testAttributeName;
  const row = this.coreConfigurationPage.rowFor(this.editTargetAttributeName);
  await expect(row).toBeVisible({ timeout: 60000 });
  const editButton = await this.coreConfigurationPage.findRowActionIcon(row, 'Edit', 'first');
  if (!editButton) {
    const actionsHtml = await this.coreConfigurationPage.actionsCellHtml(row);
    throw new Error(`Edit icon for "${this.editTargetAttributeName}" could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  await editButton.click();
});

When('the user clears the attribute name and changes it to a new unique name', async function () {
  // "Edited Ported Attribute" (not "Edited Attribute") for the same collision-avoidance reason
  // documented in attributeCounter.js - a separate project's copy of this same counter mechanism
  // already uses "Edited Attribute N" against the same shared dev environment.
  const newName = nextAttributeName('Edited Ported Attribute');
  this.testAttributeName = newName;
  this.editTargetAttributeName = newName;
  // fill() replaces the field's existing content wholesale - no separate "clear" action needed.
  await this.coreConfigurationPage.fillModalField(this.coreConfigurationPage.openModal, 'Attribute Name', newName);
});

Then('the edited test attribute should appear in the Test Attributes table', async function () {
  if (!this.testAttributeName) {
    throw new Error('No edited attribute name is stored - the rename step must run first.');
  }
  const row = this.coreConfigurationPage.rowFor(this.testAttributeName);
  await expect(row).toBeVisible({ timeout: 60000 });
});

When('the user clicks the delete icon for the last edited test attribute', async function () {
  if (!this.editTargetAttributeName) {
    throw new Error('No attribute name is tracked - the edit steps must run first.');
  }
  this.deleteTargetAttributeName = this.editTargetAttributeName;
  const row = this.coreConfigurationPage.rowFor(this.deleteTargetAttributeName);
  await expect(row).toBeVisible({ timeout: 60000 });
  const deleteButton = await this.coreConfigurationPage.findRowActionIcon(row, 'Delete', 'last');
  if (!deleteButton) {
    const actionsHtml = await this.coreConfigurationPage.actionsCellHtml(row);
    throw new Error(`Delete icon for "${this.deleteTargetAttributeName}" could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  await deleteButton.click();
});

Then('a delete confirmation popup should be displayed', async function () {
  // No specific title text confirmed for this modal - just confirms *a* popup opened.
  await expect(this.coreConfigurationPage.openModal).toBeVisible({ timeout: 30000 });
});

Then('the deleted test attribute should no longer appear in the Test Attributes table', async function () {
  if (!this.deleteTargetAttributeName) {
    throw new Error('No deleted attribute name is stored - the delete-icon-click step must run first.');
  }
  const rows = this.coreConfigurationPage.rowsFor(this.deleteTargetAttributeName);
  await expect(rows).toHaveCount(0, { timeout: 30000 });
});

Then('the created test attribute should be the first entry in the Test Attributes table', async function () {
  if (!this.testAttributeName) {
    throw new Error('No generated attribute name is stored - "the user enters a unique attribute name" must run first.');
  }
  const firstRow = await this.coreConfigurationPage.firstDataRow();
  if (!firstRow) {
    throw new Error('No rows found in the Test Attributes table.');
  }
  const rowText = await firstRow.innerText().catch(() => '');
  if (!rowText.includes(this.testAttributeName)) {
    throw new Error(`Expected the first entry to be "${this.testAttributeName}", but found: "${rowText.trim()}"`);
  }
});

Then('the created test attribute should appear in the Test Attributes table', async function () {
  if (!this.testAttributeName) {
    throw new Error('No generated attribute name is stored - "the user enters a unique attribute name" must run first.');
  }
  const row = this.coreConfigurationPage.rowFor(this.testAttributeName);
  await expect(row).toBeVisible({ timeout: 60000 });
});

Then('the test attribute row should show unit of measurement {string}', async function (unit) {
  if (!this.testAttributeName) {
    throw new Error('No generated attribute name is stored - "the user enters a unique attribute name" must run first.');
  }
  const row = this.coreConfigurationPage.rowForWithUnit(this.testAttributeName, unit);
  await expect(row).toBeVisible({ timeout: 30000 });
});

// --- Micro Test / Chem Test (COA category) ---

When('the user clicks on the {string} category', async function (categoryName) {
  // Confirmed live: only one "COA" element exists once the page has fully settled - this page's
  // own category header, not the similarly-named top-level Core Configuration tab. An earlier
  // attempt without this extra settle time landed on the wrong one - a genuine timing race, not
  // a structural ambiguity.
  await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(1000);

  const tab = this.coreConfigurationPage.categoryTab(categoryName);
  await expect(tab).toBeVisible({ timeout: 30000 });
  await tab.click();
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

When('the user expands the {string} section', async function (sectionName) {
  const button = this.coreConfigurationPage.collapsedSectionButton(sectionName);
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.page.waitForTimeout(500);
});

// Parameterized rather than the shared "the user clicks the {string} button" step - "New Micro
// Test"/"New Chem Test" both carry an icon-text prefix in their real accessible name, and would
// need exact matches that step doesn't attempt.
When('the user clicks the New {string} Test button', async function (testType) {
  const label = `New ${testType} Test`;
  const button = this.coreConfigurationPage.newTestButton(label);
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

// Reused for both the initial Test Name entry and the later rename during editing - fill()
// replaces existing content either way, and this.testName is what the row-lookup/action-icon
// steps below track (shared with the Shift scenario too).
When('the user enters the Test Name {string}', async function (testName) {
  // Per-run suffix so a row left over from an earlier failed run (same literal name) can't make
  // Save fail as a duplicate - the row steps below map the feature's literal back via runNames.
  const suffixed = `${testName} ${RUN_SUFFIX}`;
  runNames.set(testName, suffixed);
  testName = suffixed;
  this.testName = testName;
  const input = await this.coreConfigurationPage.findVisible(this.coreConfigurationPage.testNameInputCandidates(this.coreConfigurationPage.openModal));
  if (!input) {
    throw new Error('Test Name field could not be located.');
  }
  await input.fill(testName);
});

// Micro Test only - builds up a list of values one at a time (the "Enter a value" field is
// reused/re-queried after each Add).
When('the user adds the value {string}', async function (value) {
  const modal = this.coreConfigurationPage.openModal;
  const input = await this.coreConfigurationPage.findVisible(this.coreConfigurationPage.valueInputCandidates(modal));
  if (!input) {
    throw new Error('Value input could not be located.');
  }
  await input.fill(value);
  const addButton = this.coreConfigurationPage.addValueButton(modal);
  await expect(addButton).toBeVisible({ timeout: 30000 });
  await addButton.click();
});

// Generic row lookup - reused for Micro Test, Chem Test, and Shift rows, since the underlying
// logic (rowFor()/rowsFor() by visible text) doesn't depend on which type the row belongs to.
Then('the {string} row should appear in the table', async function (rowText) {
  rowText = runNames.get(rowText) || rowText;
  const row = this.coreConfigurationPage.rowFor(rowText);
  await expect(row).toBeVisible({ timeout: 30000 });
});

Then('the {string} row should no longer appear in the table', async function (rowText) {
  rowText = runNames.get(rowText) || rowText;
  const rows = this.coreConfigurationPage.rowsFor(rowText);
  await expect(rows).toHaveCount(0, { timeout: 30000 });
});

// Generic Edit/Delete icon clicks for the current row (tracked via this.testName) - reused for
// Micro Test, Chem Test, and Shift scenarios.
// 2 min: waiting up to 30s for the row plus the multi-strategy icon lookup can exceed the global
// 60s step limit (hooks.js) on a slow dev server.
When('the user clicks the edit icon for the test row', { timeout: 120 * 1000 }, async function () {
  if (!this.testName) {
    throw new Error('No test name is stored - "the user enters the Test Name" (or Shift Name) must run first.');
  }
  const row = this.coreConfigurationPage.rowFor(this.testName);
  await expect(row).toBeVisible({ timeout: 30000 });
  const editButton = await this.coreConfigurationPage.findRowActionIcon(row, 'Edit', 'first');
  if (!editButton) {
    const actionsHtml = await this.coreConfigurationPage.actionsCellHtml(row);
    throw new Error(`Edit icon for the test row "${this.testName}" could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  await editButton.click();
});

When('the user clicks the delete icon for the test row', { timeout: 120 * 1000 }, async function () {
  if (!this.testName) {
    throw new Error('No test name is stored - "the user enters the Test Name" (or Shift Name) must run first.');
  }
  const row = this.coreConfigurationPage.rowFor(this.testName);
  await expect(row).toBeVisible({ timeout: 30000 });
  const deleteButton = await this.coreConfigurationPage.findRowActionIcon(row, 'Delete', 'last');
  if (!deleteButton) {
    const actionsHtml = await this.coreConfigurationPage.actionsCellHtml(row);
    throw new Error(`Delete icon for the test row "${this.testName}" could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  await deleteButton.click();
});

// --- Shift (Core Configuration > Shifts tab) ---

// Reuses fillModalField() exactly like Attribute Name/Test Name - "* Shift Name" follows the same
// asterisk-prefixed convention. Also sets this.testName, so the generic edit/delete-icon-click and
// row-assertion steps above are reusable here without any Shift-specific duplicates.
When('the user enters the Shift Name {string}', async function (shiftName) {
  this.testName = shiftName;
  await this.coreConfigurationPage.fillModalField(this.coreConfigurationPage.openModal, 'Shift Name', shiftName);
});

When('the user sets the {string} to {string}', async function (fieldLabel, timeValue) {
  await this.coreConfigurationPage.setTimeField(fieldLabel, timeValue);
});
