const { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const config = require('../../config/config');

setDefaultTimeout(60 * 1000);

let browser;

BeforeAll(async function () {
  const launchOptions = { headless: config.headless, slowMo: config.slowMo };
  if (!config.headless) {
    // Launch full screen so the run is actually visible instead of a small default window -
    // `viewport: null` (set per-context below) makes the page use the real maximized window
    // size instead of Playwright's fixed default viewport.
    launchOptions.args = ['--start-maximized'];
  }
  browser = await chromium.launch(launchOptions);
});

AfterAll(async function () {
  await browser.close();
});

Before(async function (scenario) {
  const contextOptions = { baseURL: config.baseURL };
  if (!config.headless) {
    contextOptions.viewport = null;
  }

  const skipStorageState = scenario.pickle.tags.some((tag) => tag.name === '@noauth');
  if (!skipStorageState) {
    if (!fs.existsSync(config.storageStatePath)) {
      throw new Error(
        `No saved session found at "${config.storageStatePath}". Run "npm run login" once to sign in via Microsoft SSO and cache the session, then re-run the tests.`
      );
    }
    contextOptions.storageState = config.storageStatePath;
  }

  this.context = await browser.newContext(contextOptions);
  this.page = await this.context.newPage();
  this.baseUrl = config.baseURL;

  // Failed API calls, attached to the report if the scenario fails - a save that silently leaves
  // its form open usually has a 4xx/5xx behind it whose toast is gone by the time a step times out.
  this.apiErrors = [];
  this.page.on('response', async (response) => {
    if (response.status() < 400 || !response.url().includes('/api/')) return;
    const body = await response.text().catch(() => '');
    this.apiErrors.push(`${response.status()} ${response.request().method()} ${response.url()}\n  ${body.slice(0, 500)}`);
  });
});

After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    // Bounded + non-fatal: a hung page shouldn't turn the diagnostic itself into a second failure.
    const screenshot = await this.page.screenshot({ timeout: 10000 }).catch(() => null);
    if (screenshot) this.attach(screenshot, 'image/png');

    const uiErrors = await this.page
      .locator('.ant-form-item-explain-error:visible, .ant-message-notice:visible, .ant-notification-notice:visible, .ant-alert-error:visible')
      .allInnerTexts()
      .catch(() => []);
    if (uiErrors.length) this.attach(`Visible error messages:\n${uiErrors.join('\n')}`, 'text/plain');
    if (this.apiErrors.length) this.attach(`Failed API calls:\n${this.apiErrors.join('\n')}`, 'text/plain');
  }
  if (!config.headless && this.page) {
    await this.page.waitForTimeout(2000);
  }
  await this.context?.close();
});
