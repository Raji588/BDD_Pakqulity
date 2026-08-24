const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const config = require('../config/config');
const LoginPage = require('./pages/LoginPage');

(async () => {
  const storageDir = path.dirname(config.storageStatePath);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Headed regardless of HEADLESS env - you need to see the window to complete SSO by hand.
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ baseURL: config.baseURL });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.startMicrosoftLogin();

  console.log('\n[global-setup] Complete the Microsoft SSO login (and MFA, if prompted) in the opened browser window.');
  console.log('[global-setup] Once you land back on the app, click "Resume" in the Playwright Inspector to save the session.\n');

  await page.pause();

  await context.storageState({ path: config.storageStatePath });
  await browser.close();

  console.log(`[global-setup] Storage state saved to ${config.storageStatePath}`);
})();
