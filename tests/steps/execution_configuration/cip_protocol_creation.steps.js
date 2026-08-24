const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');

// The Update/Delete scenarios refer to "the created CIP protocol" instead of a literal name
// (unlike liquid_analysis_protocol_creation.feature, which threads an exact string through
// Given/When steps) - so the name created in the first scenario is kept here, module-scoped,
// and reused/updated by the scenarios that run after it in file order.
let cipProtocolName;

When('the user navigates to the CIP Protocol tab', async function () {
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  await this.dashboardPage.cipProtocolCreation.navigateToCipProtocolList();
});

When('the user opens the new CIP protocol form', async function () {
  await this.dashboardPage.cipProtocolCreation.openNewCipProtocolForm();
});

When('the user enters the CIP protocol name {string}', async function (name) {
  // Names must be unique per run - same "already taken" problem as Liquid Analysis Protocol
  // Creation (see liquid_analysis_protocol_creation.steps.js).
  cipProtocolName = `${name} ${Date.now().toString().slice(-6)}`;
  await this.dashboardPage.cipProtocolCreation.enterCipProtocolName(cipProtocolName);
});

When('the user adds the following sections', async function (dataTable) {
  const sections = dataTable.hashes(); // [{ sectionName, assignedTo }, ...]
  // Remembered so the test-attributes step below can map each row's "section" column (a name)
  // back to the index it was added at.
  this.cipSectionNames = sections.map((section) => section.sectionName);
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    await this.dashboardPage.cipProtocolCreation.addSection(sectionIndex, sections[sectionIndex]);
  }
});

// A row's worth of interactions (test attribute pick via keyboard nav, 3 more selects, 2 fills)
// takes a few seconds through the real UI with the settle waits CipProtocolCreationPage needs
// (see activeDropdown()'s doc comment) - with up to 12 rows that can run past Cucumber's default
// 180s step timeout (tests/support/hooks.js), so this step gets a longer budget of its own
// rather than raising the timeout for every step in the suite.
When('the user adds the following test attributes with bounds criteria', { timeout: 300 * 1000 }, async function (dataTable) {
  const rows = dataTable.hashes(); // [{ section, typeOfCheck, frequency, lowerLimit, upperLimit }, ...]
  const bySection = new Map();
  for (const row of rows) {
    if (!bySection.has(row.section)) bySection.set(row.section, []);
    bySection.get(row.section).push(row);
  }
  // A running offset across sections, so every row in the whole protocol gets a distinct Test
  // Attribute (not just distinct within its own section) - see addBoundsTestAttributes.
  let attributeIndex = 0;
  for (const sectionName of this.cipSectionNames) {
    const sectionIndex = this.cipSectionNames.indexOf(sectionName);
    const attributes = bySection.get(sectionName) || [];
    await this.dashboardPage.cipProtocolCreation.addBoundsTestAttributes(sectionIndex, attributes, attributeIndex);
    attributeIndex += attributes.length;
  }
});

When('the user saves the CIP protocol', async function () {
  await this.dashboardPage.cipProtocolCreation.saveProtocol();
});

Then('the CIP protocol should be created successfully', async function () {
  // Save Protocol navigates back to the CIP Protocol list on success (verified live).
  await expect(this.dashboardPage.cipProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the created CIP protocol should be displayed in the protocol list', async function () {
  await this.dashboardPage.cipProtocolCreation.navigateToCipProtocolList();
  await this.dashboardPage.cipProtocolCreation.searchCipProtocol(cipProtocolName);
  await expect(this.dashboardPage.cipProtocolCreation.cipProtocolRow(cipProtocolName)).toBeVisible();
});

When('the user searches for the created CIP protocol', async function () {
  await this.dashboardPage.cipProtocolCreation.searchCipProtocol(cipProtocolName);
});

When('the user opens the CIP protocol for editing', async function () {
  await this.dashboardPage.cipProtocolCreation.openCipProtocolForEditing(cipProtocolName);
});

When('the user updates the CIP protocol name', async function () {
  const updatedName = `${cipProtocolName}_updated`;
  await this.dashboardPage.cipProtocolCreation.enterCipProtocolName(updatedName);
  cipProtocolName = updatedName;
});

When('the user saves the changes', async function () {
  await this.dashboardPage.cipProtocolCreation.saveProtocol();
});

Then('the CIP protocol should be updated successfully', async function () {
  await expect(this.dashboardPage.cipProtocolCreation.saveProtocolButton).not.toBeVisible();
});

Then('the updated CIP protocol details should be displayed', async function () {
  await this.dashboardPage.cipProtocolCreation.navigateToCipProtocolList();
  await this.dashboardPage.cipProtocolCreation.searchCipProtocol(cipProtocolName);
  await expect(this.dashboardPage.cipProtocolCreation.cipProtocolRow(cipProtocolName)).toBeVisible();
});

When('the user selects the delete option', async function () {
  await this.dashboardPage.cipProtocolCreation.openCipProtocolForDeletion(cipProtocolName);
});

// Shared with Test Protocol Management's delete scenario rather than duplicated - Cucumber's
// step registry is global, so a second identical phrase in test_protocol_management.steps.js
// would collide instead of adding a new step.
When('the user confirms the deletion', async function () {
  if (this.testProtocolPage) {
    await this.testProtocolPage.confirmDeletion();
  } else {
    await this.dashboardPage.cipProtocolCreation.confirmDeletion();
  }
});

Then('the CIP protocol should be deleted successfully', async function () {
  await this.dashboardPage.cipProtocolCreation.navigateToCipProtocolList();
  await this.dashboardPage.cipProtocolCreation.searchCipProtocol(cipProtocolName);
  await expect(this.dashboardPage.cipProtocolCreation.cipProtocolRow(cipProtocolName)).toHaveCount(0);
});

Then('the deleted CIP protocol should not be displayed in the protocol list', async function () {
  await expect(this.dashboardPage.cipProtocolCreation.cipProtocolRow(cipProtocolName)).toHaveCount(0);
});
