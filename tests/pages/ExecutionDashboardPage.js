const BasePage = require('./BasePage');

/**
 * Reached directly from the sidebar (like Requests/Change Recording), not composed onto
 * CampaignExecutionPage.
 */
class ExecutionDashboardPage extends BasePage {
  constructor(page) {
    super(page);

    this.navLink = page.getByRole('link', { name: 'Execution Dashboard' });

    // Anchored to the "Line Number" filter's own <label> rather than an auto-generated AntD id
    // (e.g. `#rc_select_2`), which shifts whenever the page's select count/order changes.
    this.productionLineFilter = page
      .locator('label', { hasText: 'Line Number' })
      .locator('xpath=following-sibling::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    this.productionLineClearIcon = this.productionLineFilter.locator('.anticon-close-circle');
  }

  async open() {
    await this.navLink.click();
  }

  async openProductionLineFilter() {
    await this.productionLineFilter.click();
  }

  /** The visible "selected value" chip for the production line filter, or a 0-count locator if
   *  nothing is selected - same ancestor-lookup pattern used by the protocol-creation pages'
   *  `selectedOptionText`. */
  productionLineSelectionItem() {
    return this.productionLineFilter.locator('.ant-select-selection-item');
  }

  async filterByProductionLine(lineName) {
    await this.openProductionLineFilter();
    await this.page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', { hasText: lineName })
      .click();
  }

  async clearProductionLineFilter() {
    await this.productionLineClearIcon.click();
  }
}

module.exports = ExecutionDashboardPage;
