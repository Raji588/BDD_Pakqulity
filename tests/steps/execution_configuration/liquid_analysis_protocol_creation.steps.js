const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');

// The feature file's literal names (jhnm -> jhnm_updated) get a per-run suffix after their first
// segment (jhnm123456 -> jhnm123456_updated), so the create/update/delete chain still links up by
// name but a leftover protocol from an earlier failed run can never cause "Protocol name already
// taken". Module scope keeps the same suffix for every scenario in this cucumber-js process.
const RUN_SUFFIX = Date.now().toString().slice(-6);
const runName = (name) => name.replace(/^([^_]+)/, `$1${RUN_SUFFIX}`);

When('the user navigates to the new protocol form', async function () {
  // Independent of "the dashboard page is loaded" - Protocol Creation is reached via the
  // sidebar (present on every page), not through the dashboard specifically.
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  await this.dashboardPage.protocolCreation.navigateToNewProtocolForm();
});

When('the user fills in the protocol details', async function (dataTable) {
  const details = Object.fromEntries(dataTable.rows().map(([field, value]) => [field, value]));
  details.name = runName(details.name);
  // A protocol with this exact name can already exist (a previous run that failed before the
  // delete scenario ran, someone testing by hand with the same name, ...), which blocks
  // creation with a disabled Save button ("Protocol name already taken") rather than a
  // catchable error - so clear it out first and return to the (now empty) form.
  await this.dashboardPage.protocolCreation.deleteProtocolIfExists(details.name);
  await this.dashboardPage.protocolCreation.navigateToNewProtocolForm();
  await this.dashboardPage.protocolCreation.fillProtocolDetails(details);
});

// Twelve rows' worth of selects/fills through the real UI (with settle waits - see
// LiquidAnalysisProtocolCreationPage.selectOption) can run past Cucumber's default 180s step
// timeout (tests/support/hooks.js), same as the equivalent CIP Protocol Creation step, so this
// gets a longer budget of its own rather than raising the timeout for every step in the suite.
When('the user fills in the attribute rows and saves the protocol', { timeout: 300 * 1000 }, async function () {
  await this.dashboardPage.protocolCreation.fillAttributeRowsAndSave();
});

Then('the protocol {string} should be created successfully', async function (name) {
  name = runName(name);
  await this.dashboardPage.protocolCreation.navigateToProtocolList();
  await this.dashboardPage.protocolCreation.searchProtocol(name);
  await expect(this.dashboardPage.protocolCreation.protocolRow(name)).toBeVisible();
});

Given('the protocol {string} is available in the protocol list', async function (name) {
  name = runName(name);
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  await this.dashboardPage.protocolCreation.navigateToProtocolList();
  await this.dashboardPage.protocolCreation.searchProtocol(name);
  await expect(this.dashboardPage.protocolCreation.protocolRow(name)).toBeVisible();
});

When('the user opens the protocol {string} for editing', async function (name) {
  name = runName(name);
  this.editingProtocolName = name; // remembered so updateProtocolDetails can return here
  await this.dashboardPage.protocolCreation.openProtocolForEditing(name);
});

When('the user updates the protocol details', async function (dataTable) {
  const details = Object.fromEntries(dataTable.rows().map(([field, value]) => [field, value]));
  details.name = runName(details.name);
  // Same "name already taken" problem as creation (see that step) can hit a rename too - a
  // protocol already named "jhnm_updated" blocks Save with no catchable error. Clearing it out
  // navigates away from the edit form, so reopen the original protocol we were editing.
  await this.dashboardPage.protocolCreation.deleteProtocolIfExists(details.name);
  await this.dashboardPage.protocolCreation.navigateToProtocolList();
  await this.dashboardPage.protocolCreation.searchProtocol(this.editingProtocolName);
  await this.dashboardPage.protocolCreation.openProtocolForEditing(this.editingProtocolName);
  await this.dashboardPage.protocolCreation.fillProtocolDetails(details);
});

When('the user saves the updated protocol', async function () {
  await this.dashboardPage.protocolCreation.saveProtocol();
});

Then('the protocol {string} should be updated successfully', async function (name) {
  name = runName(name);
  await this.dashboardPage.protocolCreation.navigateToProtocolList();
  await this.dashboardPage.protocolCreation.searchProtocol(name);
  await expect(this.dashboardPage.protocolCreation.protocolRow(name)).toBeVisible();
});

When('the user opens the protocol {string} for deletion', async function (name) {
  name = runName(name);
  await this.dashboardPage.protocolCreation.openProtocolForDeletion(name);
});

When('the user confirms the protocol deletion', async function () {
  await this.dashboardPage.protocolCreation.confirmDeletion();
});

Then('the protocol {string} should be deleted successfully', async function (name) {
  name = runName(name);
  await this.dashboardPage.protocolCreation.navigateToProtocolList();
  await this.dashboardPage.protocolCreation.searchProtocol(name);
  await expect(this.dashboardPage.protocolCreation.protocolRow(name)).toHaveCount(0);
});
