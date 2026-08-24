const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const RequestsPage = require('../pages/RequestsPage');
const { getLastCampaignId } = require('../support/campaignState');

/**
 * Backs the "Approve a Spec Change Request raised after the third test failure" scenario in
 * alerts.feature. Ported from a separate Pakquality automation project, restructured to follow
 * this suite's conventions.
 *
 * Reuses this suite's existing infrastructure heavily rather than duplicating it:
 * - alerts.feature's own Background and "the first two test executions..."/"the third test
 *   execution.../"a Spec Change Request should be triggered" steps (alerts.steps.js) get the
 *   scenario up through the dialog appearing - this file only adds the CONFIRM path (every other
 *   alerts.feature scenario always cancels) and the approval flow afterward.
 * - "the user navigates to the {string} page" / "the {string} page should be displayed"
 *   (change_recording.steps.js / requests.steps.js) for the Requests page.
 * - "the user clicks the {string} button" (requests.steps.js, extended for "Approve").
 */

When('the user enters {string} in the Spec Change Request comment', async function (comment) {
  const input = await this.fillerFailurePage.findVisible(this.fillerFailurePage.specChangeRequestCommentInputCandidates());
  if (!input) {
    throw new Error('Spec Change Request comment field could not be located.');
  }
  await input.fill(comment);
});

When('the user confirms the Spec Change Request', async function () {
  await this.fillerFailurePage.confirmSpecChangeRequest();
});

When('the user searches for the campaign created in this scenario in the Requests search field', async function () {
  const campaignId = getLastCampaignId();
  if (!campaignId) {
    throw new Error('No campaign ID is tracked - "the user has created a campaign using the created Test Protocol" must run first in this same cucumber-js invocation.');
  }
  this.campaignId = campaignId;
  this.requestsPage = this.requestsPage || new RequestsPage(this.page);
  await this.requestsPage.search(campaignId);
});

Then('a search result row for the campaign created in this scenario should appear', async function () {
  if (!this.campaignId) {
    throw new Error('No campaign ID is stored - the search step must run first.');
  }
  await expect(this.requestsPage.rowFor(this.campaignId).first()).toBeVisible({ timeout: 30000 });
});

When('the user views the request for the campaign created in this scenario', async function () {
  if (!this.campaignId) {
    throw new Error('No campaign ID is stored - the search step must run first.');
  }
  await this.requestsPage.viewRequest(this.campaignId);
});

Then('a record details popup should be displayed', async function () {
  await expect(this.requestsPage.detailDialog).toBeVisible({ timeout: 30000 });
});

// No click was recorded between opening the details dialog and finding the upper limit field in
// the source project - a separate "Approval" tab/section may not exist at all, so this is
// optional rather than required. Confirmed via a live failure screenshot: the dialog's body
// content (including any such tab) loads asynchronously after the dialog itself becomes visible
// - a brief wait here lets it settle before searching.
When('the user opens the Approval section', async function () {
  await this.page.waitForTimeout(1500);
  const tab = await this.requestsPage.findApprovalSectionTab();
  if (tab) {
    await tab.click();
  }
});

When('the user sets the upper limit to {string}', async function (value) {
  // Confirmed via a live failure screenshot: the record details dialog itself becomes visible
  // immediately, but its body content (including this field) loads asynchronously afterward - a
  // loading spinner was still showing at the point this step ran. Retry once after a short delay
  // before giving up.
  let input = await this.requestsPage.findVisible(this.requestsPage.upperLimitInputCandidates());
  if (!input) {
    await this.page.waitForTimeout(2000);
    input = await this.requestsPage.findVisible(this.requestsPage.upperLimitInputCandidates());
  }
  if (!input) {
    throw new Error('Upper limit field could not be located in the Approval section.');
  }
  await input.click();
  await input.fill(value);
});

When('the user enters {string} in the Approval comment', async function (comment) {
  const input = await this.requestsPage.findVisible(this.requestsPage.approvalCommentInputCandidates());
  if (!input) {
    throw new Error('Approval comment field could not be located.');
  }
  await input.fill(comment);
});

// No confirmed success message - verifies the record details dialog has closed after clicking
// Approve, a generic but real signal the action was accepted rather than blocked.
Then('the spec change request should be approved successfully', async function () {
  const closed = await this.requestsPage.detailDialog
    .waitFor({ state: 'hidden', timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!closed) {
    throw new Error('Spec change request approval could not be confirmed - the record details dialog is still open.');
  }
});
