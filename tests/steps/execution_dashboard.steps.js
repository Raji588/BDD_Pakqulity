const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const ExecutionDashboardPage = require('../pages/ExecutionDashboardPage');

When('the user opens the Execution Dashboard', async function () {
  this.executionDashboardPage = new ExecutionDashboardPage(this.page);
  await this.executionDashboardPage.open();
});

When('the user filters by production line {string}', async function (lineName) {
  await this.executionDashboardPage.filterByProductionLine(lineName);
});

Then('the production line filter should show {string}', async function (lineName) {
  await expect(this.executionDashboardPage.productionLineSelectionItem()).toHaveText(lineName);
});

When('the user clears the production line filter', async function () {
  await this.executionDashboardPage.clearProductionLineFilter();
});

Then('the production line filter should be empty', async function () {
  expect(await this.executionDashboardPage.productionLineSelectionItem().count()).toBe(0);
});
