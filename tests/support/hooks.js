const { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const config = require('../../config/config');

setDefaultTimeout(180 * 1000);

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
});

After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }
  if (!config.headless && this.page) {
    await this.page.waitForTimeout(2000);
  }
  await this.context?.close();
});
