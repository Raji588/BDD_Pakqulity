const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');

// The Update/Delete scenarios refer to "the created Bulk Offload protocol" instead of a literal
// name (unlike liquid_analysis_protocol_creation.feature, which threads an exact string through
// Given/When steps) - so the name created in the first scenario is kept here, module-scoped,
// and reused/updated by the scenarios that run after it in file order. Same pattern as
// cip_protocol_creation.steps.js's cipProtocolName.
let bulkOffloadProtocolName;

When('the user navigates to the Bulk Offload Protocol tab', async function () {
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  await this.dashboardPage.bulkOffloadProtocolCreation.navigateToBulkOffloadProtocolList();
});

When('the user opens the new Bulk Offload protocol form', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.openNewBulkOffloadProtocolForm();
});

When('the user enters the Bulk Offload protocol name {string}', async function (name) {
  // Names must be unique per run - same "already taken" problem as Liquid Analysis Protocol
  // Creation and CIP Protocol Creation (see their respective steps files).
  bulkOffloadProtocolName = `${name} ${Date.now().toString().slice(-6)}`;
  await this.dashboardPage.bulkOffloadProtocolCreation.enterBulkOffloadProtocolName(bulkOffloadProtocolName);
});

When('the user adds the following Bulk Offload sections', async function (dataTable) {
  const sections = dataTable.hashes(); // [{ sectionName, assignedTo }, ...]
  // Remembered so the test-attributes step below can map each row's "section" column (a name)
  // back to the index it was added at.
  this.bulkOffloadSectionNames = sections.map((section) => section.sectionName);
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    await this.dashboardPage.bulkOffloadProtocolCreation.addSection(sectionIndex, sections[sectionIndex]);
  }
});

// A row's worth of interactions (test attribute pick via keyboard nav, 3 more selects, 2 fills)
// takes a few seconds through the real UI with the settle waits BulkOffloadProtocolCreationPage
// needs (see activeDropdown()'s doc comment) - with up to 12 rows that can run past Cucumber's
// default 180s step timeout (tests/support/hooks.js), so this step gets a longer budget of its
// own rather than raising the timeout for every step in the suite. Same reasoning as
// cip_protocol_creation.steps.js's equivalent step.
When(
  'the user adds the following Bulk Offload test attributes with bounds criteria',
  { timeout: 300 * 1000 },
  async function (dataTable) {
    const rows = dataTable.hashes(); // [{ section, typeOfCheck, frequency, lowerLimit, upperLimit }, ...]
    const bySection = new Map();
    for (const row of rows) {
      if (!bySection.has(row.section)) bySection.set(row.section, []);
      bySection.get(row.section).push(row);
    }
    // A running offset across sections, so every row in the whole protocol gets a distinct Test
    // Attribute (not just distinct within its own section) - see addBoundsTestAttributes.
    let attributeIndex = 0;
    for (const sectionName of this.bulkOffloadSectionNames) {
      const sectionIndex = this.bulkOffloadSectionNames.indexOf(sectionName);
      const attributes = bySection.get(sectionName) || [];
      await this.dashboardPage.bulkOffloadProtocolCreation.addBoundsTestAttributes(sectionIndex, attributes, attributeIndex);
      attributeIndex += attributes.length;
    }
  }
);

When('the user saves the Bulk Offload protocol', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.saveProtocol();
});

Then('the Bulk Offload protocol should be created successfully', async function () {
  // Save Protocol navigates back to the Bulk Offload Protocol list on success (verified live).
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the created Bulk Offload protocol should be displayed in the protocol list', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.navigateToBulkOffloadProtocolList();
  await this.dashboardPage.bulkOffloadProtocolCreation.searchBulkOffloadProtocol(bulkOffloadProtocolName);
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.bulkOffloadProtocolRow(bulkOffloadProtocolName)).toBeVisible();
});

When('the user searches for the created Bulk Offload protocol', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.searchBulkOffloadProtocol(bulkOffloadProtocolName);
});

When('the user opens the Bulk Offload protocol for editing', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.openBulkOffloadProtocolForEditing(bulkOffloadProtocolName);
});

When('the user updates the Bulk Offload protocol name', async function () {
  const updatedName = `${bulkOffloadProtocolName}_updated`;
  await this.dashboardPage.bulkOffloadProtocolCreation.enterBulkOffloadProtocolName(updatedName);
  bulkOffloadProtocolName = updatedName;
});

When('the user saves the Bulk Offload changes', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.saveProtocol();
});

Then('the Bulk Offload protocol should be updated successfully', async function () {
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the updated Bulk Offload protocol details should be displayed', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.navigateToBulkOffloadProtocolList();
  await this.dashboardPage.bulkOffloadProtocolCreation.searchBulkOffloadProtocol(bulkOffloadProtocolName);
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.bulkOffloadProtocolRow(bulkOffloadProtocolName)).toBeVisible();
});

When('the user selects the Bulk Offload delete option', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.openBulkOffloadProtocolForDeletion(bulkOffloadProtocolName);
});

When('the user confirms the Bulk Offload deletion', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.confirmDeletion();
});

Then('the Bulk Offload protocol should be deleted successfully', async function () {
  await this.dashboardPage.bulkOffloadProtocolCreation.navigateToBulkOffloadProtocolList();
  await this.dashboardPage.bulkOffloadProtocolCreation.searchBulkOffloadProtocol(bulkOffloadProtocolName);
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.bulkOffloadProtocolRow(bulkOffloadProtocolName)).toHaveCount(0);
});

Then('the deleted Bulk Offload protocol should not be displayed in the protocol list', async function () {
  await expect(this.dashboardPage.bulkOffloadProtocolCreation.bulkOffloadProtocolRow(bulkOffloadProtocolName)).toHaveCount(0);
});
