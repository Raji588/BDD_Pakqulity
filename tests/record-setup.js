const { chromium } = require('playwright');
const config = require('../config/config');
const { grantFullAccess } = require('./support/permissionBypass');

/**
 * Recording helper used by "npm run record" instead of raw "playwright codegen", since
 * this account's real server-side permissions restrict the dashboard (see
 * permissionBypass.js) - plain codegen would just hit the "Access Restricted" screen.
 * Loads the saved SSO session, applies the same client-side permission bypass the test
 * suite uses, then opens the Playwright Inspector in record mode.
 */
(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({
    baseURL: config.baseURL,
    storageState: config.storageStatePath,
    viewport: null,
  });
  const page = await context.newPage();

  await page.goto(config.baseURL, { waitUntil: 'domcontentloaded' });
  await grantFullAccess(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  console.log('\n[record-setup] Permission bypass applied - opening Playwright Inspector in record mode.');
  console.log('[record-setup] Click "Record" in the Inspector toolbar, then interact with the app.\n');

  await page.pause();

  await browser.close();
})();
