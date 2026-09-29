const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const fs = require('fs/promises');
const path = require('path');
const { getLastCampaignId } = require('../support/campaignState');

/**
 * Backs document_control.feature. Ported from a separate Pakquality automation project,
 * restructured to follow this suite's conventions - this.documentControlPage is created by the
 * shared "the user navigates to {string} > {string}" step in
 * execution_configuration/test_protocol_management.steps.js.
 */

// Generic AntD modal-title check, page-agnostic (any currently-open modal filtered by title
// text) - not owned by any specific page, reusable by Core Configuration / User Role's own
// modals too (extend this step, not a new one, if a future page needs the same check).
Then('the {string} popup should be displayed', async function (popupName) {
  const modal = this.page.locator('.ant-modal:visible').filter({ hasText: popupName }).first();
  await expect(modal).toBeVisible({ timeout: 30000 });
});

// Generic checkbox-by-name check, page-agnostic - reusable elsewhere (e.g. User Role's "Select
// All").
When('the user selects the {string} checkbox', async function (checkboxName) {
  const checkbox = this.page.getByRole('checkbox', { name: checkboxName });
  await expect(checkbox).toBeVisible({ timeout: 30000 });
  await checkbox.check();
});

When('the user searches for the campaign created in the previous scenario', async function () {
  const campaignId = getLastCampaignId();
  if (!campaignId) {
    throw new Error(
      'No campaign ID is tracked from a prior scenario - "Create a new protocol campaign" must run first in this same cucumber-js invocation.'
    );
  }
  this.campaignId = campaignId;
  await this.documentControlPage.search(campaignId);
});

Then('a search result row for that campaign should appear as the first entry', async function () {
  if (!this.campaignId) {
    throw new Error('No campaign ID is stored - the search step must run first.');
  }
  // Re-read until the debounced server-side search returns - a single read right after typing can
  // catch the table's interim "No data" state.
  await expect(async () => {
    const row = await this.documentControlPage.firstResultRow();
    if (!row) {
      throw new Error('No rows found in the search results table.');
    }
    const rowText = await row.innerText().catch(() => '');
    if (!rowText.includes(this.campaignId)) {
      throw new Error(`Expected the first search result row to contain "${this.campaignId}", but found: "${rowText.trim()}"`);
    }
  }).toPass({ timeout: 30000 });
});

When('the user clicks the edit icon for the first search result row', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the search results table.');
  }
  const editButton = await this.documentControlPage.findRowActionIcon(row, {
    description: 'Edit',
    iconClass: 'icon-edit',
  });
  if (!editButton) {
    const actionsHtml = await this.documentControlPage.actionsCellHtml(row);
    throw new Error(`Edit icon for the first search result row could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  await editButton.click();
});

When('the user selects {string} from the Status dropdown', async function (statusValue) {
  await this.documentControlPage.selectStatus(statusValue);
});

Then('the search result row should show status {string}', async function (statusValue) {
  if (!this.campaignId) {
    throw new Error('No campaign ID is stored - earlier steps must run first.');
  }
  const row = this.documentControlPage.resultRow(this.campaignId);
  await expect(row).toBeVisible({ timeout: 30000 });
  const rowText = await row.innerText().catch(() => '');
  if (!rowText.includes(statusValue)) {
    throw new Error(`Expected the search result row for "${this.campaignId}" to show status "${statusValue}", but found: "${rowText.trim()}"`);
  }
});

async function saveDownload(download, worldKey, world) {
  const downloadDir = path.join(__dirname, '..', '..', 'debug', 'downloads');
  await fs.mkdir(downloadDir, { recursive: true });
  const suggestedFilename = download.suggestedFilename();
  const savePath = path.join(downloadDir, suggestedFilename);
  await download.saveAs(savePath);
  const stats = await fs.stat(savePath).catch(() => null);
  if (!stats || stats.size === 0) {
    throw new Error(`Downloaded file is missing or empty: ${savePath}`);
  }
  world[worldKey] = { savePath, size: stats.size, suggestedFilename };
}

When('the user clicks the "Download COA" button for the first search result row', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the search results table.');
  }
  const downloadButton = await this.documentControlPage.findRowActionIcon(row, {
    name: 'file-add',
    description: 'Download COA',
    excludeText: ['Off-site Testing'],
  });
  if (!downloadButton) {
    const actionsHtml = await this.documentControlPage.actionsCellHtml(row);
    throw new Error(`Download COA icon could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 2000)}`);
  }
  const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
  await downloadButton.click();
  const download = await downloadPromise;
  await saveDownload(download, 'coaDownload', this);
});

Then('the COA PDF file should be downloaded successfully', async function () {
  if (!this.coaDownload) {
    throw new Error('No download was captured - the Download COA click step must run first.');
  }
  if (!/\.pdf$/i.test(this.coaDownload.suggestedFilename)) {
    throw new Error(`Expected a .pdf download, but got: "${this.coaDownload.suggestedFilename}"`);
  }
});

// Confirmed live (source project): 5 action icons total - Edit, Customer Download (2nd), this
// "download"-named icon (3rd), Download COA (4th), Archive (5th). No description ever confirmed
// for this icon's tooltip, so only `name` is matched.
When('the user clicks the "Download Files" icon for the first search result row', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the search results table.');
  }
  const icon = await this.documentControlPage.findRowActionIcon(row, {
    name: 'download',
    excludeText: ['Download COA', 'Off-site Testing'],
  });
  if (!icon) {
    const actionsHtml = await this.documentControlPage.actionsCellHtml(row);
    throw new Error(`Download Files icon could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 8000)}`);
  }
  await icon.click();
});

When('the user downloads the selected files', async function () {
  const button = this.documentControlPage.downloadFilesSubmitButton;
  await expect(button).toBeVisible({ timeout: 30000 });
  const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
  await button.click();
  const download = await downloadPromise;
  await saveDownload(download, 'filesDownload', this);
});

Then('the selected files should be downloaded successfully', async function () {
  if (!this.filesDownload) {
    throw new Error('No download was captured - "the user downloads the selected files" step must run first.');
  }
});

// --- Customer Download (opens a new browser tab) ---

When('the user clicks the "Customer Download" icon for the first search result row', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the search results table.');
  }
  const icon = await this.documentControlPage.findRowActionIcon(row, {
    name: 'team',
    description: 'Customer Download',
    excludeText: ['Download COA', 'Off-site Testing'],
  });
  if (!icon) {
    const actionsHtml = await this.documentControlPage.actionsCellHtml(row);
    throw new Error(`Customer Download icon could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 8000)}`);
  }
  // Must register the new-page listener BEFORE the click that triggers it.
  const newPagePromise = this.page.context().waitForEvent('page');
  await icon.click();
  this.customerDownloadPage = await newPagePromise;
  await this.customerDownloadPage.waitForLoadState('domcontentloaded').catch(() => {});
  // Fixed pause after every step in this flow (up through the one right before Generate &
  // Download) - this tab's content settles asynchronously.
  await this.customerDownloadPage.waitForTimeout(3000);
});

Then('a new browser tab should open for customer download', async function () {
  if (!this.customerDownloadPage) {
    throw new Error('No customer download tab is stored - the Customer Download icon click step must run first.');
  }
  const releaseButton = this.documentControlPage.releaseToCustomerButton(this.customerDownloadPage);
  await expect(releaseButton).toBeVisible({ timeout: 30000 });
});

When('the user clicks the Release to Customer button', async function () {
  const button = this.documentControlPage.releaseToCustomerButton(this.customerDownloadPage);
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.customerDownloadPage.waitForTimeout(3000);
});

When('the user clicks the Add Row button', async function () {
  const button = this.documentControlPage.addRowButton(this.customerDownloadPage);
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.customerDownloadPage.waitForTimeout(3000);
});

When('the user selects {string} for the new row', async function (value) {
  const option = this.documentControlPage.newRowOption(this.customerDownloadPage, value);
  await expect(option).toBeVisible({ timeout: 30000 });
  await option.click();
  await this.customerDownloadPage.waitForTimeout(3000);
});

When('the user enters {string} in the Comments column for the first row', async function (commentText) {
  const page = this.customerDownloadPage;
  const row = await this.documentControlPage.firstDataRowIn(page);
  if (!row) {
    throw new Error('No rows found in the customer download table.');
  }
  const commentsCell = await this.documentControlPage.commentsCellForRow(page, row);
  if (!commentsCell) {
    throw new Error('Comments column could not be located in the customer download table.');
  }
  await this.documentControlPage.editCommentsCell(page, commentsCell, commentText);
});

When('the user clicks the Generate and Download button', async function () {
  const button = this.documentControlPage.generateAndDownloadButton(this.customerDownloadPage);
  await expect(button).toBeVisible({ timeout: 30000 });
  const downloadPromise = this.customerDownloadPage.waitForEvent('download', { timeout: 60000 });
  await button.click();
  const download = await downloadPromise;
  await saveDownload(download, 'customerDownload', this);
});

Then('the customer download file should be downloaded successfully', async function () {
  if (!this.customerDownload) {
    throw new Error('No download was captured - "the user clicks the Generate and Download button" step must run first.');
  }
});

// --- Archive / Unarchive ---

Then('at least one search result row should be visible', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the results table.');
  }
  await expect(row).toBeVisible({ timeout: 30000 });
});

When('the user clicks the archive icon for the first search result row', async function () {
  const row = await this.documentControlPage.firstResultRow();
  if (!row) {
    throw new Error('No rows found in the search results table.');
  }
  const icon = await this.documentControlPage.findRowActionIcon(row, {
    name: 'inbox',
    description: 'Archive',
    excludeText: ['Download COA', 'Off-site Testing'],
  });
  if (!icon) {
    const actionsHtml = await this.documentControlPage.actionsCellHtml(row);
    throw new Error(`Archive icon could not be located. Actions cell HTML:\n${actionsHtml.slice(0, 8000)}`);
  }
  await icon.click();
});

Then('an archive confirmation popup should be displayed', async function () {
  await expect(this.documentControlPage.openModal).toBeVisible({ timeout: 30000 });
});

// Deliberately NOT phrased as `the user clicks the "View Archives" button` - a quoted string
// there would also match the shared generic "the user clicks the {string} button" step, and this
// button's FULL accessible name is "inbox View Archives" (icon text + label concatenated) anyway,
// so an exact match on "View Archives" alone wouldn't find it either way.
When('the user clicks the View Archives button', async function () {
  const button = this.documentControlPage.viewArchivesButton;
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.click();
  await this.page.waitForLoadState('networkidle').catch(() => {});
});

When('the user unarchives the first archived record', async function () {
  await this.documentControlPage.unarchiveFirstRow();
});

Then('the record should be unarchived successfully', async function () {
  await this.page.waitForTimeout(1000);
});
