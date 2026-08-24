const { Given, Then, When } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');
const { grantFullAccess } = require('../../support/permissionBypass');
const { setLastCampaignId } = require('../../support/campaignState');

Given('the user is already logged in', async function () {
  // Navigate to the app to initialize the origin context, then inject a client-side
  // wildcard permission (see permissionBypass.js) - the signed-in account's real
  // server-side permissions are missing execution/waterQualityExecution/cipExecution/
  // bulkOffloadExecution reads, which would otherwise show the "Access Restricted" screen.
  await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
  await grantFullAccess(this.page);
  // Permissions are read once at load time, which already happened above - reload so
  // this session picks them up, regardless of what step runs next.
  await this.page.reload({ waitUntil: 'domcontentloaded' });
});

Given('the dashboard page is loaded', async function () {
  this.dashboardPage = new CampaignExecutionPage(this.page);
  await this.dashboardPage.open();
  await this.dashboardPage.waitForLoad();
});

Then('Dashboard title should be displayed', async function () {
  await expect(this.dashboardPage.pageTitle).toBeVisible();
});

When('the user starts a new liquid analysis', async function () {
  await this.dashboardPage.liquidAnalysis.startNewLiquidAnalysis();
});

When('the user searches for formula {string} and selects the first result', async function (formulaId) {
  await this.dashboardPage.liquidAnalysis.searchAndSelectFormula(formulaId);
});

When('the user fills in the batch details', async function (dataTable) {
  const details = Object.fromEntries(dataTable.rows().map(([field, value]) => [field, value]));
  // Batch/campaign IDs must be unique per run - the app flags repeats as "Instance Already Exists".
  const uniqueSuffix = Date.now().toString().slice(-6);
  details.batchId = `${details.batchId}${uniqueSuffix}`;
  details.campaignId = `${details.campaignId}${uniqueSuffix}`;
  // Tracked for document_control.feature, which searches for this exact
  // campaign by ID - see campaignState.js.
  setLastCampaignId(details.campaignId);
  await this.dashboardPage.liquidAnalysis.fillBatchDetails(details);
});

When('the user submits the batch', async function () {
  await this.dashboardPage.liquidAnalysis.submitBatch();
});

Then('the protocol campaign should be created successfully', async function () {
  // submitBatch() navigates away from the create-batch form on success (same "form button
  // disappears" pattern used for CIP/Bulk Offload/Water Quality's "created successfully" checks).
  await expect(this.dashboardPage.liquidAnalysis.submitBatchButton).not.toBeVisible();
});

When("the user opens the newly created batch's analysis", async function () {
  await this.dashboardPage.liquidAnalysis.openCreatedBatchAnalysis();
});

When('the user applies the analysis filters', async function () {
  await this.dashboardPage.liquidAnalysis.applyAnalysisFilters();
});

When('the user enters the following liquid analysis results', async function (dataTable) {
  const rows = dataTable.hashes(); // [{ filler: 'EAST', value: '30' }, ...]
  const east = rows.filter((row) => row.filler.toUpperCase() === 'EAST').map((row) => row.value);
  const west = rows.filter((row) => row.filler.toUpperCase() === 'WEST').map((row) => row.value);
  await this.dashboardPage.liquidAnalysis.enterLiquidAnalysisResults({ east, west });
});

// Reused for all four rounds (Beginning/Analysis/End/Middle) via the {string} round name rather
// than four separate step definitions. The Analysis round can take a short while (seconds to
// ~1 minute, per product behavior) to become available after Beginning's tests are entered -
// completeRound() waits for it - which can run past Cucumber's default 180s step timeout
// (tests/support/hooks.js) once combined with the rest of the round's test entry, so this gets
// a longer budget of its own, same reasoning as the multi-row protocol-creation steps.
When('the user completes the {string} round tests', { timeout: 300 * 1000 }, async function (roundName, dataTable) {
  const rows = dataTable.hashes(); // [{ filler: 'EAST', value: '30' }, ...]
  const east = rows.filter((row) => row.filler.toUpperCase() === 'EAST').map((row) => row.value);
  const west = rows.filter((row) => row.filler.toUpperCase() === 'WEST').map((row) => row.value);
  await this.dashboardPage.liquidAnalysis.completeRound(roundName, { east, west });
});

When('the user sets the batch status to {string}', async function (status) {
  await this.dashboardPage.liquidAnalysis.setStatus(status);
});
