const { expect } = require('@playwright/test');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('load');
  }

  async title() {
    return this.page.title();
  }

  /** Waits (best effort) for any visible AntD loading spinner to go away - while a table is
   *  loading its spinner overlay intercepts clicks, and the re-render when loading finishes closes
   *  any dropdown opened in the meantime. */
  async waitForSpinners(timeout = 30000) {
    await expect(this.page.locator('.ant-spin-spinning:visible')).toHaveCount(0, { timeout }).catch(() => {});
  }

  /** Runs `action` (e.g. a tab click or navigation) and waits for the protocol list API call it
   *  triggers - `type` is the API's protocolType (GEN = Test Protocol, CIP, BOL = Bulk Offload,
   *  WQT = Water Quality). Acting before this lands lets the late, unfiltered list response
   *  overwrite a search typed in the meantime. */
  async waitForProtocolList(type, action, extraMatch = () => true) {
    const loaded = this.page
      .waitForResponse((r) => {
        const url = decodeURIComponent(r.url()).replace(/\+/g, ' ');
        return url.includes('/api/core/protocols?') && url.includes(`protocolType=${type}`) && extraMatch(url);
      }, { timeout: 30000 })
      .catch(() => {});
    await action();
    await loaded;
    await this.waitForSpinners();
  }

  /** Types `term` into a protocol list's search box and waits for that search's own response. */
  async searchProtocolList(type, input, term) {
    await this.waitForSpinners();
    await this.waitForProtocolList(type, async () => {
      await input.click();
      await input.fill(term);
    }, (url) => url.includes(`nameContains=${term}`));
  }

  /** Runs `open` (an edit-row click) and waits until the edit form has hydrated its test
   *  attribute rows - `firstAttributeSelect` is row 0's Test Attribute select. Verified live: the
   *  protocol name fills in ~300ms after opening, but the rows only render once the separate
   *  test-attributes list loads (~2s+ later), and saving before that sends empty attribute arrays
   *  that the API rejects with 400 ("Each section must have at least one attribute"). */
  async openEditFormAndWaitForAttributes(open, firstAttributeSelect) {
    await open();
    const selectedValue = firstAttributeSelect
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
      .locator('.ant-select-selection-item');
    await expect(selectedValue).toBeVisible({ timeout: 30000 });
  }

  /** Clicks a form's save button and returns the response it triggers (PATCH/PUT by default, for
   *  edit forms), or null if no request went out (e.g. client-side validation blocked the save). */
  async saveAndCaptureResponse(saveButton, methods = ['PATCH', 'PUT']) {
    // Blur the just-filled field first: clicking Save straight from it blurs it on mousedown, whose
    // validation re-renders the button before mouseup, so the click never reaches the form
    // (verified live on the Test Protocol edit form: no submit event fired, no request was sent).
    await this.page.evaluate(() => document.activeElement?.blur());
    await expect(saveButton).toBeEnabled();
    await expect(saveButton).not.toHaveClass(/ant-btn-loading/);

    // Everything else the click set off, for the failure message when no matching request came.
    this.lastSaveActivity = [];
    const onRequest = (r) => r.method() !== 'GET' && this.lastSaveActivity.push(`${r.method()} ${r.url()}`);
    const onConsole = (m) => m.type() === 'error' && this.lastSaveActivity.push(`console error: ${m.text().slice(0, 300)}`);
    this.page.on('request', onRequest);
    this.page.on('console', onConsole);
    const response = await Promise.all([
      this.page
        .waitForResponse(
          (r) => methods.includes(r.request().method()) && r.url().includes('/api/core/'),
          { timeout: 30000 }
        )
        .catch(() => null),
      saveButton.click().then(async () => {
        // Toasts vanish after ~3s, long before a failing caller gets to look.
        const toast = this.page.locator('.ant-message-notice, .ant-notification-notice').first();
        if (await toast.waitFor({ timeout: 5000 }).then(() => true, () => false)) {
          this.lastSaveActivity.push(`toast: ${await toast.innerText().catch(() => '?')}`);
        }
      }),
    ]).then(([r]) => r);
    this.page.off('request', onRequest);
    this.page.off('console', onConsole);
    return response;
  }

  /** Describes every form field AntD currently marks invalid (id + any message) - a save blocked
   *  by client-side validation sends no request and may show no message text, only a red border
   *  on a field scrolled out of view. */
  async invalidFormFields() {
    return this.page.locator('.ant-form-item-has-error').evaluateAll((items) =>
      items.map((item) => {
        const field = item.querySelector('input[id], textarea[id], [id].ant-select, .ant-select input[id]');
        const message = item.querySelector('.ant-form-item-explain-error');
        return `${field?.id || '(no id)'}: ${message?.textContent || '(no message)'}`;
      })
    );
  }

  /** Opens an AntD select via `open` and clicks the option with `optionText`, retrying the whole
   *  open+click if a table reload closes the dropdown mid-way. */
  async selectDropdownOption(dropdown, open, optionText) {
    await expect(async () => {
      await this.waitForSpinners();
      if (!(await dropdown.isVisible().catch(() => false))) {
        await open();
      }
      await dropdown.locator('.ant-select-item-option', { hasText: optionText }).click({ timeout: 5000 });
    }).toPass({ timeout: 45000 });
  }
}

module.exports = BasePage;
