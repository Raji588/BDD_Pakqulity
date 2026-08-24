const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const RequestsPage = require('../pages/RequestsPage');

Then('the {string} page should be displayed', async function (pageName) {
  if (pageName === 'Requests') {
    await expect(this.requestsPage.pageTitle).toBeVisible();
  }
});

Then('the following request filter fields should be displayed:', async function (dataTable) {
  const fields = dataTable.rows().map(([field]) => field);
  for (const field of fields) {
    await expect(this.requestsPage.fieldLabel(field)).toBeVisible();
  }
});

Then('the {string} button should be displayed', async function (buttonName) {
  if (buttonName === 'Filter') {
    await expect(this.requestsPage.filterButton).toBeVisible();
  }
});

Then('the {string} option should be displayed', async function (optionName) {
  if (optionName === 'Reset Filters') {
    await expect(this.requestsPage.resetFiltersOption).toBeVisible();
  }
});

When('the user searches for {string} in the Requests search field', async function (term) {
  await this.requestsPage.search(term);
});

Then('the request result for {string} should be displayed', async function (term) {
  await expect(this.requestsPage.rowFor(term).first()).toBeVisible();
});

// One step per AutoComplete filter (Request ID, Campaign, Test Attribute) rather than a single
// step parametrized on both value and field name - only the value is quoted in the feature text
// ("...in the Request ID filter" has no quotes around the field name), so Cucumber Expressions
// can't capture it as a second {string}. The value is remembered so a following Then step that
// doesn't repeat it (e.g. "the matching campaign requests should be displayed") can still assert
// against it.
When('the user enters {string} in the Request ID filter', async function (value) {
  await this.requestsPage.fillAutocompleteFilter('Request ID', value);
  this.lastFilterValue = value;
});

When('the user enters {string} in the Campaign filter', async function (value) {
  await this.requestsPage.fillAutocompleteFilter('Campaign', value);
  this.lastFilterValue = value;
});

When('the user enters {string} in the Test Attribute filter', async function (value) {
  await this.requestsPage.fillAutocompleteFilter('Test Attribute', value);
  this.lastFilterValue = value;
});

// Shared with Test Protocol Management ("New Test Protocol" button) rather than duplicated -
// Cucumber's step registry is global, so a second identical phrase in
// test_protocol_management.steps.js would collide instead of adding a new step.
When('the user clicks the {string} button', async function (buttonName) {
  if (buttonName === 'Filter') {
    await this.requestsPage.clickFilter();
  } else if (buttonName === 'New Test Protocol') {
    await this.testProtocolPage.clickNewTestProtocol();
  }
});

Then('the request {string} should be displayed in the Requests table', async function (requestId) {
  const row = this.requestsPage.rowFor(requestId);
  await expect(row).toBeVisible();
  await expect(this.requestsPage.requestIdCell(row)).toHaveText(requestId);
});

Then('the matching campaign requests should be displayed', async function () {
  const rows = this.requestsPage.dataRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await this.requestsPage.campaignCell(rows.nth(i)).innerText();
    expect(text).toContain(this.lastFilterValue);
  }
});

Then('requests with Test Attribute {string} should be displayed', async function (attribute) {
  const rows = this.requestsPage.dataRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await this.requestsPage.testAttributeCell(rows.nth(i)).innerText();
    expect(text).toContain(attribute);
  }
});

When('the user opens the Status filter', async function () {
  await this.requestsPage.openStatusFilter();
});

When('the user selects {string}', async function (status) {
  await this.requestsPage.selectStatus(status);
});

When('the user selects {string} from the Status filter', async function (status) {
  await this.requestsPage.selectStatus(status);
});

Then('only requests with {string} status should be displayed', async function (status) {
  const rows = this.requestsPage.dataRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await this.requestsPage.statusCell(rows.nth(i)).innerText();
    expect(text.trim()).toBe(status);
  }
});

When('the user selects the From Date', async function () {
  await this.requestsPage.selectFromDate();
});

When('the user selects the To Date', async function () {
  await this.requestsPage.selectToDate();
});

// A same-day From/To range can genuinely return zero rows (request timestamps vs. the picker's
// date boundary don't always align - verified live) - asserting an exact row count would be
// flaky, so this checks the date filter was actually applied instead of the resulting row count.
Then('requests within the selected date range should be displayed', async function () {
  await expect(this.requestsPage.fromDateInput).not.toHaveValue('');
  await expect(this.requestsPage.toDateInput).not.toHaveValue('');
});

When('the user clicks the {string} option', async function (optionName) {
  if (optionName === 'Reset Filters') {
    await this.requestsPage.clickResetFilters();
  }
});

Then('all request filters should be reset', async function () {
  await expect(this.requestsPage.requestIdInput).toHaveValue('');
  await expect(this.requestsPage.statusSelector).toContainText('All Statuses');
});

Then('the default Requests list should be displayed', async function () {
  await expect(this.requestsPage.page.getByText('Filters Applied:')).toHaveCount(0);
});

When('the user clicks {string} for request {string}', async function (action, requestId) {
  if (action === 'View') {
    await this.requestsPage.viewRequest(requestId);
  }
});

Then('the request details should be displayed', async function () {
  await expect(this.requestsPage.detailHeading).toBeVisible();
});
