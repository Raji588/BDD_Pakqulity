const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const CampaignExecutionPage = require('../../pages/dashboard/CampaignExecutionPage');
const AlertsPage = require('../../pages/dashboard/AlertsPage');
const { setLastCampaignId } = require('../../support/campaignState');

// Reliably out-of-spec against any Bounds-type test attribute this suite has encountered (all
// use small numeric ranges, e.g. "29.16 - 34.24") - verified live.
const OUT_OF_SPEC_VALUE = '999999';

/**
 * "the user has created a valid Test Protocol" reuses the existing "HBC-3647" formula (Monster
 * Ultra Blue), already seeded in the shared dev environment and proven valid by every other
 * Liquid Analysis scenario in this suite - this feature is about the failure-escalation behavior
 * once a campaign is running, not protocol-creation mechanics (already covered by
 * liquid_analysis_protocol_creation.feature), so no new protocol is created here.
 */
Given('the user has created a valid Test Protocol', async function () {
  this.dashboardPage = this.dashboardPage || new CampaignExecutionPage(this.page);
  this.fillerFailurePage =
    this.fillerFailurePage || new AlertsPage(this.page, this.dashboardPage.liquidAnalysis);
});

Given('the user has created a campaign using the created Test Protocol', async function () {
  await this.dashboardPage.liquidAnalysis.startNewLiquidAnalysis();
  await this.dashboardPage.liquidAnalysis.searchAndSelectFormula('HBC-3647');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const campaignId = `FAILC${uniqueSuffix}`;
  await this.dashboardPage.liquidAnalysis.fillBatchDetails({
    batchId: `FAIL${uniqueSuffix}`,
    campaignId,
    customer: 'Monster',
    flavor: 'test',
    fgItemNumber: 'FG Item Number',
    format: 'Format',
    batchTank: '6',
  });
  // Tracked for the Spec Change Request approval scenario below, which searches for this exact
  // campaign on the Requests page (see campaignState.js).
  setLastCampaignId(campaignId);
  await this.dashboardPage.liquidAnalysis.submitBatch();
});

Given('the campaign is ready for execution', async function () {
  // submitBatch() navigating away from the create-batch form (same "form button disappears"
  // pattern documented on the protocol campaign creation scenario) already confirms the campaign
  // was created successfully - nothing further to do here.
  await expect(this.dashboardPage.liquidAnalysis.submitBatchButton).not.toBeVisible();
});

Given('the user starts executing the campaign', async function () {
  await this.dashboardPage.liquidAnalysis.openCreatedBatchAnalysis();
  await this.fillerFailurePage.openFirstAvailableTest(0); // EAST
});

Given('the first test execution for the filler has failed', async function () {
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
});

When('the second test execution for the same filler fails', async function () {
  // enterReadingWithoutDismissing, not addResultReading - the latter's own dismiss check waits
  // out its full timeout budget (2s then 8s) when no dialog ever appears (true here, only the
  // 3rd failure triggers one), which by itself burns past the few seconds AntD's success toast
  // stays up for - verified live, that alone was enough to make the notification check below
  // always see it already gone.
  await this.fillerFailurePage.enterReadingWithoutDismissing(OUT_OF_SPEC_VALUE);
  // waitFor rather than a single isVisible() snapshot - the toast can take a brief moment to
  // render after the accept click resolves, and a plain isVisible() check right at that instant
  // is racy enough to sometimes catch it a beat too early (verified live: flaked intermittently
  // with the snapshot version).
  this.notificationSeen = await this.page
    .getByText('Test results saved successfully')
    .first()
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
});

Then('an in-app notification should be displayed', async function () {
  expect(this.notificationSeen).toBe(true);
});

Then('the corresponding filler should remain active', async function () {
  expect(await this.fillerFailurePage.isFillerPaused()).toBe(false);
});

Then('the campaign execution should continue', async function () {
  await expect(this.dashboardPage.liquidAnalysis.eastAddTestButton).toBeVisible();
});

Given('the first two test executions for the filler have failed', async function () {
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
  await this.page.waitForTimeout(1000);
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
});

// Uses enterReadingWithoutDismissing rather than addResultReading, deliberately - the following
// Then step needs to observe the Spec Change Request dialog this reading triggers, which
// addResultReading would otherwise cancel transparently before the assertion ever ran.
When('the third test execution for the same filler fails', async function () {
  await this.fillerFailurePage.enterReadingWithoutDismissing(OUT_OF_SPEC_VALUE);
});

Then('a Spec Change Request should be triggered', async function () {
  await expect(this.fillerFailurePage.specChangeRequestDialog()).toBeVisible();
});

Then(
  'the corresponding filler should remain active until the required action is completed',
  async function () {
    // Cancelling (never confirming - see cancelSpecChangeRequest's doc comment) returns control
    // to the filler, which remains active rather than paused.
    await this.fillerFailurePage.cancelSpecChangeRequest();
    await this.page.waitForTimeout(1000);
    expect(await this.fillerFailurePage.isFillerPaused()).toBe(false);
  }
);

Given('the first three test executions for the filler have failed', async function () {
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
  await this.page.waitForTimeout(1000);
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
  await this.page.waitForTimeout(1000);
  // The 3rd triggers the Spec Change Request dialog - this step is only building up prior state,
  // not observing that dialog (see "the third test execution..." above for the scenario that
  // does), so it just needs dismissing. Uses enterReadingWithoutDismissing + cancelSpecChangeRequest
  // explicitly rather than addResultReading's own dismiss handling - verified live, the latter's
  // unscoped `Cancel` button lookup left this dialog stuck open, blocking the 4th reading that
  // follows; cancelSpecChangeRequest scopes the click to the dialog itself instead.
  await this.fillerFailurePage.enterReadingWithoutDismissing(OUT_OF_SPEC_VALUE);
  await expect(this.fillerFailurePage.specChangeRequestDialog()).toBeVisible();
  await this.fillerFailurePage.cancelSpecChangeRequest();
  await this.page.waitForTimeout(1000);
});

When('the fourth test execution for the same filler fails', async function () {
  await this.dashboardPage.liquidAnalysis.addResultReading(OUT_OF_SPEC_VALUE);
});

Then('the corresponding filler should be paused', async function () {
  expect(await this.fillerFailurePage.isFillerPaused()).toBe(true);
});

Then('no further tests should be executed for the paused filler', async function () {
  await expect(this.dashboardPage.liquidAnalysis.resultValueInput).toBeDisabled();
});

// Not westAddTestButton (`.nth(1)`) - verified live, pausing EAST removes its "Add Test" button
// from the DOM entirely (replaced by "Resume Filler"), so WEST's becomes the only/last one
// instead of the second. westAddTestButton's fixed index is still correct everywhere else in
// this suite, where no filler is ever paused.
Then('other active fillers should continue their execution', async function () {
  await expect(this.page.getByRole('button', { name: /add test/i }).last()).toBeEnabled();
});
