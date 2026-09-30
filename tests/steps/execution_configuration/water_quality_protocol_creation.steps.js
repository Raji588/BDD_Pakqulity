const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');

// The Update/Delete scenarios refer to "the created Water Quality protocol" instead of a
// literal name (unlike liquid_analysis_protocol_creation.feature, which threads an exact string
// through Given/When steps) - so the name created in the first scenario is kept here,
// module-scoped, and reused/updated by the scenarios that run after it in file order. Same
// pattern as cip_protocol_creation.steps.js's cipProtocolName.
let waterQualityProtocolName;

When('the user navigates to the Water Quality Protocol tab', async function () {
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  await this.dashboardPage.waterQualityProtocolCreation.navigateToWaterQualityProtocolList();
});

When('the user opens the new Water Quality protocol form', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.openNewWaterQualityProtocolForm();
});

When('the user enters the Water Quality protocol name {string}', async function (name) {
  // Names must be unique per run - same "already taken" problem as Liquid Analysis Protocol
  // Creation, CIP Protocol Creation, and Bulk Offload Protocol Creation (see their respective
  // steps files).
  waterQualityProtocolName = `${name} ${Date.now().toString().slice(-6)}`;
  await this.dashboardPage.waterQualityProtocolCreation.enterWaterQualityProtocolName(waterQualityProtocolName);
});

When('the user selects the Water Quality facility {string}', async function (facility) {
  // Must match the session's active facility, or the created protocol won't show up in this
  // session's list view - see WaterQualityProtocolCreationPage's class doc comment.
  await this.dashboardPage.waterQualityProtocolCreation.selectFacility(facility);
});

// A row's worth of interactions (test attribute pick via keyboard nav, 2 more selects, 2 fills)
// takes a few seconds through the real UI with the settle waits
// WaterQualityProtocolCreationPage needs (see activeDropdown()'s doc comment) - with up to 12
// rows that can run past Cucumber's default 180s step timeout (tests/support/hooks.js), so this
// step gets a longer budget of its own rather than raising the timeout for every step in the
// suite. Same reasoning as cip_protocol_creation.steps.js's equivalent step.
When(
  'the user adds the following Water Quality test attributes with bounds criteria',
  { timeout: 300 * 1000 },
  async function (dataTable) {
    const attributes = dataTable.hashes(); // [{ typeOfCheck, lowerLimit, upperLimit }, ...]
    await this.dashboardPage.waterQualityProtocolCreation.addBoundsTestAttributes(attributes);
  }
);

When('the user saves the Water Quality protocol', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.saveProtocol();
});

Then('the Water Quality protocol should be created successfully', async function () {
  // Save Protocol navigates back to the Water Quality Protocol list on success (verified live).
  await expect(this.dashboardPage.waterQualityProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the created Water Quality protocol should be displayed in the protocol list', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.navigateToWaterQualityProtocolList();
  await this.dashboardPage.waterQualityProtocolCreation.searchWaterQualityProtocol(waterQualityProtocolName);
  await expect(this.dashboardPage.waterQualityProtocolCreation.waterQualityProtocolRow(waterQualityProtocolName)).toBeVisible();
});

When('the user searches for the created Water Quality protocol', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.searchWaterQualityProtocol(waterQualityProtocolName);
});

When('the user opens the Water Quality protocol for editing', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.openWaterQualityProtocolForEditing(waterQualityProtocolName);
});

When('the user updates the Water Quality protocol name', async function () {
  const updatedName = `${waterQualityProtocolName}_updated`;
  await this.dashboardPage.waterQualityProtocolCreation.enterWaterQualityProtocolName(updatedName);
  // Only adopted as waterQualityProtocolName once the save succeeds - otherwise the delete scenario would
  // look for a renamed protocol that doesn't exist and leave the original behind.
  this.pendingProtocolName = updatedName;
});

When('the user saves the Water Quality changes', async function () {
  this.saveResponse = await this.dashboardPage.waterQualityProtocolCreation.saveProtocolChanges();
});

Then('the Water Quality protocol should be updated successfully', async function () {
  expect(this.saveResponse, 'Save sent no PATCH/PUT request').not.toBeNull();
  expect(this.saveResponse.ok(), `Save failed: ${this.saveResponse.status()} ${await this.saveResponse.text()}`).toBe(true);
  waterQualityProtocolName = this.pendingProtocolName;
  await expect(this.dashboardPage.waterQualityProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the updated Water Quality protocol details should be displayed', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.navigateToWaterQualityProtocolList();
  await this.dashboardPage.waterQualityProtocolCreation.searchWaterQualityProtocol(waterQualityProtocolName);
  await expect(this.dashboardPage.waterQualityProtocolCreation.waterQualityProtocolRow(waterQualityProtocolName)).toBeVisible();
});

When('the user selects the Water Quality delete option', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.openWaterQualityProtocolForDeletion(waterQualityProtocolName);
});

When('the user confirms the Water Quality deletion', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.confirmDeletion();
});

Then('the Water Quality protocol should be deleted successfully', async function () {
  await this.dashboardPage.waterQualityProtocolCreation.navigateToWaterQualityProtocolList();
  await this.dashboardPage.waterQualityProtocolCreation.searchWaterQualityProtocol(waterQualityProtocolName);
  await expect(this.dashboardPage.waterQualityProtocolCreation.waterQualityProtocolRow(waterQualityProtocolName)).toHaveCount(0);
});

Then('the deleted Water Quality protocol should not be displayed in the protocol list', async function () {
  await expect(this.dashboardPage.waterQualityProtocolCreation.waterQualityProtocolRow(waterQualityProtocolName)).toHaveCount(0);
});
