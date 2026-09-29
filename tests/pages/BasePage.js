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
