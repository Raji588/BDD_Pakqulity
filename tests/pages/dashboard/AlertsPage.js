const BasePage = require('../BasePage');

/**
 * Wraps the repeated-failure escalation behavior discovered live on the Liquid Analysis
 * "Add Test" flow (not the round-tab flow `campaign_execution.feature`'s campaign-execution
 * scenario uses): entering an out-of-spec reading against the same test/filler repeatedly
 * behaves differently each time - see README's "Alerts" note for the full ladder. None
 * of this was documented anywhere beforehand; it was found by brute-force testing repeated
 * failures live before writing any code.
 *
 * Composes a `LiquidAnalysisPage` instance (see CampaignExecutionPage.js) rather than duplicating
 * its batch-creation/result-entry primitives (startNewLiquidAnalysis, searchAndSelectFormula,
 * fillBatchDetails, submitBatch, openCreatedBatchAnalysis, addResultReading,
 * eastAddTestButton/westAddTestButton, resultValueInput/Label/AcceptButton, ...), which this
 * page's methods build directly on top of.
 */
class AlertsPage extends BasePage {
  constructor(page, liquidAnalysisPage) {
    super(page);
    this.liquidAnalysis = liquidAnalysisPage;
  }

  /**
   * Opens "Add Test" for one filler and picks whichever test the dropdown offers first - the
   * same opening step `LiquidAnalysisPage.enterResultsForFiller` does, but exposed standalone so
   * a caller can enter (and observe the result of) one reading at a time, rather than only ever
   * looping through a fixed array of values in one call.
   */
  async openFirstAvailableTest(fillerIndex) {
    const la = this.liquidAnalysis;
    const addTestButton = fillerIndex === 0 ? la.eastAddTestButton : la.westAddTestButton;
    await addTestButton.click();
    const firstOption = la.activeTestDropdown().locator('.ant-dropdown-menu-item').first();
    const opened = await firstOption
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      throw new Error('"Add Test" dropdown never opened.');
    }
    await firstOption.click();
  }

  /**
   * Enters one reading without dismissing any resulting "Spec Change Request" dialog - verified
   * live, three consecutive out-of-spec readings against the same test trigger that dialog
   * (`specChangeRequestDialog()`/`cancelSpecChangeRequest()` below). `LiquidAnalysisPage`'s own
   * `addResultReading()` always dismisses it transparently, which is right for readings a
   * scenario is just using to build up prior state, but wrong for the one reading a scenario
   * needs to actually observe the dialog from.
   */
  async enterReadingWithoutDismissing(value) {
    const la = this.liquidAnalysis;
    await la.resultValueInput.click({ timeout: 45000 });
    await la.resultValueInput.fill(String(value));
    await la.resultValueLabel.click();
    await la.resultValueAcceptButton.click();
  }

  /** Scoped by its "Spec Change Request" heading text, same pattern as
   *  `LiquidAnalysisPage.dismissSpecChangeDialogIfPresent`'s detection, but returned as a locator
   *  the caller can assert on directly instead of a boolean. */
  specChangeRequestDialog() {
    return this.page.getByRole('dialog').filter({ hasText: 'Spec Change Request' });
  }

  /** Cancels rather than confirms - same policy as every other Spec Change Request this suite
   *  encounters (see `dismissSpecChangeDialogIfPresent`'s doc comment): confirming would email
   *  Quality Team Leads for real, so this never does. */
  async cancelSpecChangeRequest() {
    await this.specChangeRequestDialog().getByRole('button', { name: 'Cancel' }).click();
  }

  /**
   * Ported from a separate Pakquality automation project (restructured to follow this suite's
   * conventions) - the CONFIRM path through this dialog, for a scenario that deliberately DOES
   * want to raise a real Spec Change Request and get it approved (see
   * spec_change_request.steps.js), unlike every other scenario in this suite, which always
   * cancels (see cancelSpecChangeRequest's doc comment). No recording confirmed the comment
   * field's exact accessible name/placeholder in the source project - best-effort candidates,
   * scoped to this dialog specifically, pending live verification. The confirming button
   * ("Continue") was confirmed against this same app by that separate project's own live
   * testing.
   */
  specChangeRequestCommentInputCandidates() {
    const dialog = this.specChangeRequestDialog();
    return [
      dialog.getByRole('textbox', { name: /comment/i }),
      dialog.locator('textarea'),
      dialog.locator('input[placeholder*="comment" i]'),
    ];
  }

  async findVisible(candidates) {
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  async confirmSpecChangeRequest() {
    await this.specChangeRequestDialog().getByRole('button', { name: 'Continue' }).click();
  }

  /**
   * A fourth consecutive out-of-spec reading against the same test pauses that filler - verified
   * live: a "Resume Filler" button appears (replacing the round tabs/Add Test controls for that
   * filler) and its "Enter Value" input becomes disabled. Only one filler is ever paused in this
   * suite's scenarios, so this isn't scoped per filler index - a future scenario pausing both
   * fillers at once would need `.nth(fillerIndex)` here instead.
   */
  fillerResumeButton() {
    return this.page.getByRole('button', { name: 'Resume Filler' });
  }

  async isFillerPaused() {
    return this.fillerResumeButton().isVisible().catch(() => false);
  }
}

module.exports = AlertsPage;
