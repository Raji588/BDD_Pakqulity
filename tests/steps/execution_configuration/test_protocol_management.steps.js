const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const TestProtocolManagementPage = require('../../pages/execution_configuration/TestProtocolManagementPage');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');
const DocumentControlPage = require('../../pages/DocumentControlPage');
const CoreConfigurationPage = require('../../pages/CoreConfigurationPage');

// Extended (not duplicated - Cucumber's step registry is global) to also cover
// "Document Control" > "Liquid Analysis" and "Configuration" > "Core Configuration", both ported
// from a separate project - extend this same step rather than test_protocol_management.steps.js's
// own file if a future page needs the same two-level "navigate via sidebar menu > submenu" step
// text.
Given('the user navigates to {string} > {string}', async function (menuName, subMenuName) {
  if (menuName === 'Configuration' && subMenuName === 'Execution Configuration') {
    this.testProtocolPage = this.testProtocolPage || new TestProtocolManagementPage(this.page);
    await this.testProtocolPage.open();
  } else if (menuName === 'Document Control' && subMenuName === 'Liquid Analysis') {
    this.documentControlPage = this.documentControlPage || new DocumentControlPage(this.page);
    await this.documentControlPage.open();
  } else if (menuName === 'Configuration' && subMenuName === 'Core Configuration') {
    this.coreConfigurationPage = this.coreConfigurationPage || new CoreConfigurationPage(this.page);
    await this.coreConfigurationPage.open();
  }
});

Then('the {string} page title should be displayed', async function (title) {
  if (title === 'Execution Configuration') {
    await expect(this.testProtocolPage.pageTitle).toBeVisible();
  }
});

Then('the {string} tab should be selected', async function (tabName) {
  expect(await this.testProtocolPage.isTabSelected(tabName)).toBe(true);
});

Then('the following tabs should be visible:', async function (dataTable) {
  const tabs = dataTable.raw().flat();
  for (const tab of tabs) {
    await expect(this.testProtocolPage.tab(tab)).toBeVisible();
  }
});

Then('the Test Protocol table should display the following columns:', async function (dataTable) {
  const columns = dataTable.raw().flat();
  for (const column of columns) {
    await expect(this.testProtocolPage.columnHeader(column)).toBeVisible();
  }
});

When('the user clicks the {string} tab', async function (tabName) {
  await this.testProtocolPage.clickTab(tabName);
});

When('the user searches for {string} in the Test Protocol search box', async function (term) {
  await this.testProtocolPage.search(term);
});

Then('the Test Protocol table should only show rows containing {string}', async function (term) {
  const rows = this.testProtocolPage.page.getByRole('row').filter({ has: this.testProtocolPage.page.getByRole('cell') });
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText();
    expect(text).toContain(term);
  }
});

When('the user clicks {string}', async function (text) {
  if (text === 'Filters') {
    await this.testProtocolPage.openFilters();
  }
});

Then('the Filters panel should be expanded', async function () {
  expect(await this.testProtocolPage.filtersExpanded()).toBe(true);
});

Then('the {string} form should be displayed', async function (formName) {
  if (formName === 'New Test Protocol') {
    await expect(this.testProtocolPage.newProtocolFormTitle).toBeVisible();
  } else if (formName === 'Edit Test Protocol') {
    await expect(this.testProtocolPage.editProtocolFormTitle).toBeVisible();
  }
});

Then("that protocol's row should show status {string}", async function (status) {
  const row = await this.testProtocolPage.findRow(runProtocolName);
  await expect(this.testProtocolPage.statusCell(row)).toHaveText(status);
});

When('the user clicks the edit action for that protocol', async function () {
  await this.testProtocolPage.clickEditAction(runProtocolName);
});

When('the user clicks the copy action for that protocol', async function () {
  await this.testProtocolPage.clickCopyAction(runProtocolName);
});

// The copy action's on-screen title is "Duplicate Test Protocol", not "Add Test Protocol" (the
// {string} here is the button's label, "New Test Protocol", not a literal title match) - verified
// live.
Then('the {string} form should be displayed pre-filled from that protocol', async function (formName) {
  await expect(this.testProtocolPage.duplicateProtocolFormTitle).toBeVisible();
  await expect(this.testProtocolPage.nameInput).toHaveValue(runProtocolName);
});

When('the user saves the duplicated protocol under a unique name', async function () {
  this.saveResponse = await this.testProtocolPage.saveDuplicateWithUniqueName();
});

Then('a duplicated protocol row should appear in the Test Protocol table', async function () {
  expect(this.saveResponse, 'Save sent no POST request').not.toBeNull();
  expect(this.saveResponse.ok(), `Save failed: ${this.saveResponse.status()} ${await this.saveResponse.text()}`).toBe(true);
  await this.testProtocolPage.open();
  await expect(await this.testProtocolPage.findRow(this.testProtocolPage.lastDuplicateName)).toBeVisible();
});

When('the user clicks the history action for that protocol', async function () {
  await this.testProtocolPage.clickHistoryAction(runProtocolName);
});

Then('the change history for that protocol should be displayed', async function () {
  await expect(this.testProtocolPage.historyDialog).toContainText(`History — ${runProtocolName}`);
});

/**
 * One Test Protocol per cucumber-js process, created on first use and shared by the Status /
 * Edit / Duplicate / History scenarios, then deleted by the Delete scenario (last in the feature
 * file) - so the run leaves nothing behind but the Duplicate scenario's copies. These scenarios
 * used to target a hand-made "Bug_test" fixture, which disappeared from DEV (verified live
 * 2026-09-29: a search for it returned 0 rows) and took every scenario using it down at once.
 * Created through the Liquid Analysis protocol creation flow (liquid_analysis_protocol_creation.
 * steps.js), with a unique per-run name to avoid "name already taken" collisions across runs.
 *
 * Long timeout: verified live, twelve rows' worth of selects/fills through the real UI can take
 * several minutes, especially late in a full run as the protocol table grows.
 */
let runProtocolName;

Given('a test protocol has been created for this run', { timeout: 600 * 1000 }, async function () {
  if (runProtocolName) return;
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  const uniqueSuffix = Date.now().toString().slice(-6);
  const name = `run_protocol_${uniqueSuffix}`;
  await this.dashboardPage.protocolCreation.navigateToNewProtocolForm();
  await this.dashboardPage.protocolCreation.fillProtocolDetails({
    name,
    syrupId: `RUN${uniqueSuffix}`,
    customerFormula: 'run fixture',
  });
  await this.dashboardPage.protocolCreation.fillAttributeRowsAndSave();
  runProtocolName = name;
  await this.testProtocolPage.open();
});

When('the user searches for that protocol in the Test Protocol search box', async function () {
  await this.testProtocolPage.search(runProtocolName);
});

When('the user clicks the delete action for that protocol', async function () {
  await this.testProtocolPage.clickDeleteAction(runProtocolName);
});

Then('a deletion confirmation dialog should be displayed', async function () {
  await expect(this.testProtocolPage.deleteDialog).toBeVisible();
});

Then('that protocol should no longer appear in the Test Protocol table', async function () {
  await expect(this.testProtocolPage.rowFor(runProtocolName)).toHaveCount(0);
});
