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

Then('the protocol row for {string} should show status {string}', async function (protocolName, status) {
  const row = this.testProtocolPage.rowFor(protocolName);
  await expect(this.testProtocolPage.statusCell(row)).toHaveText(status);
});

When('the user clicks the edit action for protocol {string}', async function (protocolName) {
  await this.testProtocolPage.clickEditAction(protocolName);
});

When('the user clicks the copy action for protocol {string}', async function (protocolName) {
  await this.testProtocolPage.clickCopyAction(protocolName);
});

// The copy action's on-screen title is "Duplicate Test Protocol", not "Add Test Protocol" (the
// {string} here is the button's label, "New Test Protocol", not a literal title match) - verified
// live.
Then('the {string} form should be displayed pre-filled from {string}', async function (formName, protocolName) {
  await expect(this.testProtocolPage.duplicateProtocolFormTitle).toBeVisible();
  await expect(this.testProtocolPage.nameInput).toHaveValue(protocolName);
});

When('the user saves the duplicated protocol under a unique name', async function () {
  await this.testProtocolPage.saveDuplicateWithUniqueName();
});

Then('a duplicated protocol row should appear in the Test Protocol table', async function () {
  await expect(this.testProtocolPage.rowFor(this.testProtocolPage.lastDuplicateName)).toBeVisible();
});

When('the user clicks the history action for protocol {string}', async function (protocolName) {
  await this.testProtocolPage.clickHistoryAction(protocolName);
});

Then('the change history for {string} should be displayed', async function (protocolName) {
  await expect(this.testProtocolPage.historyDialog).toContainText(`History — ${protocolName}`);
});

/**
 * "Bug_test" (the fixture the other Test Protocol Management scenarios reference) can't actually
 * be deleted - verified live, the backend rejects it with 400 "Cannot delete protocol with
 * campaigns" since real batches have been run against it, and the UI gives no visible error for
 * that rejection (the confirmation dialog just silently stays open). So this scenario creates its
 * own disposable, campaign-free protocol first (reusing the existing Liquid Analysis protocol
 * creation flow - see liquid_analysis_protocol_creation.steps.js), the same way this scenario
 * previously - unintentionally - discovered "Bug_test" wasn't a safe target. A unique per-run
 * name avoids "name already taken" collisions across runs.
 *
 * Long timeout for the same reason as "the user fills in the attribute rows and saves the
 * protocol" (liquid_analysis_protocol_creation.steps.js) - twelve rows' worth of selects/fills
 * through the real UI can run past Cucumber's default 180s step timeout. Given a longer budget
 * than that step's 300s: verified live, this step timed out at 300s specifically when run as
 * part of the full @testProtocolManagement group (which by this point has already run the
 * Duplicate scenario's own protocol creation earlier in the same run) - the identical step passed
 * standalone in under 5 minutes twice, so the slowdown is cumulative session/table growth, not a
 * logic issue, and needs more headroom than a lone run does.
 */
Given('a disposable test protocol has been created', { timeout: 600 * 1000 }, async function () {
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  const uniqueSuffix = Date.now().toString().slice(-6);
  this.disposableProtocolName = `disposable_del_${uniqueSuffix}`;
  await this.dashboardPage.protocolCreation.navigateToNewProtocolForm();
  await this.dashboardPage.protocolCreation.fillProtocolDetails({
    name: this.disposableProtocolName,
    syrupId: `DISP${uniqueSuffix}`,
    customerFormula: 'disposable',
  });
  await this.dashboardPage.protocolCreation.fillAttributeRowsAndSave();
  await this.testProtocolPage.open();
});

When('the user searches for that protocol in the Test Protocol search box', async function () {
  await this.testProtocolPage.search(this.disposableProtocolName);
});

When('the user clicks the delete action for that protocol', async function () {
  await this.testProtocolPage.clickDeleteAction(this.disposableProtocolName);
});

Then('a deletion confirmation dialog should be displayed', async function () {
  await expect(this.testProtocolPage.deleteDialog).toBeVisible();
});

Then('that protocol should no longer appear in the Test Protocol table', async function () {
  await expect(this.testProtocolPage.rowFor(this.disposableProtocolName)).toHaveCount(0);
});
