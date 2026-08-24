const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const ChangeRecordingPage = require('../pages/ChangeRecordingPage');
const RequestsPage = require('../pages/RequestsPage');

// Shared across every "reached directly via the sidebar" page (Change Recording, Requests, ...)
// rather than duplicated per page - Cucumber's step registry is global, so a second identical
// phrase in requests.steps.js would collide with this one instead of adding a new step.
When('the user navigates to the {string} page', async function (pageName) {
  if (pageName === 'Change Recording') {
    this.changeRecordingPage = this.changeRecordingPage || new ChangeRecordingPage(this.page);
    await this.changeRecordingPage.open();
  } else if (pageName === 'Requests') {
    this.requestsPage = this.requestsPage || new RequestsPage(this.page);
    await this.requestsPage.open();
  }
});

Given('the user is on the {string} page', async function (pageName) {
  this.changeRecordingPage = this.changeRecordingPage || new ChangeRecordingPage(this.page);
  if (pageName === 'Change Recording') {
    await this.changeRecordingPage.open();
  }
});

When('the user searches for {string} in the Change Recording search field', async function (term) {
  await this.changeRecordingPage.search(term);
});

Then('the change recording results for {string} should be displayed', async function (term) {
  const rows = this.changeRecordingPage.dataRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await this.changeRecordingPage.protocolNameCell(rows.nth(i)).innerText();
    expect(text.toLowerCase()).toContain(term.toLowerCase());
  }
});

When('the user opens the change recording status filter', async function () {
  await this.changeRecordingPage.openStatusFilter();
});

Then('the following recording status options should be displayed:', async function (dataTable) {
  const expected = dataTable.rows().map(([status]) => status);
  const actual = await this.changeRecordingPage.statusOptionTexts();
  expect(actual.sort()).toEqual(expected.sort());
});

When('the user selects {string} from the status filter', async function (status) {
  await this.changeRecordingPage.selectStatus(status);
});

Then('only {string} change recordings should be displayed', async function (status) {
  const rows = this.changeRecordingPage.dataRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await this.changeRecordingPage.changeTypeCell(rows.nth(i)).innerText();
    expect(text.trim()).toBe(status);
  }
});

When('the user clears the status filter', async function () {
  await this.changeRecordingPage.clearStatusFilter();
});

Then('the default Change Recording records should be displayed', async function () {
  await expect(this.changeRecordingPage.statusFilterSelector).toContainText('All Statuses');
});
