const BasePage = require('./BasePage');

/**
 * Verified live. Reached directly from the sidebar (present on every page, like Protocol
 * Creation) rather than through the Dashboard - not composed onto CampaignExecutionPage for that reason.
 */
class ChangeRecordingPage extends BasePage {
  constructor(page) {
    super(page);

    this.navLink = page.getByRole('link', { name: 'Change Recording' });

    this.searchInput = page.getByPlaceholder('Search');
    this.searchClearIcon = page.locator('.ant-input-clear-icon');

    // The only Ant Select filter within the page content - the facility select in the navbar
    // (DP01/DP02) also renders as `.ant-select-selector` but lives outside <main>, so scoping to
    // `main` reliably isolates the status filter without depending on its (unstable, react-
    // generated) placeholder text, which changes to whatever status is selected.
    this.statusFilter = page.locator('main .ant-select').first();
    this.statusFilterSelector = this.statusFilter.locator('.ant-select-selector');
    // AntD only mounts the select's clear ("x") icon once it is hovered - verified live.
    this.statusFilterClearIcon = this.statusFilter.locator('.ant-select-clear');
  }

  async open() {
    await this.navLink.click();
  }

  /** AntD keeps closed dropdown panels hidden in the DOM rather than removing them - same
   *  pattern as the protocol-creation pages' activeDropdown(). `.last()` picks the one most
   *  recently opened. */
  activeStatusDropdown() {
    return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  }

  async openStatusFilter() {
    await this.statusFilterSelector.click();
  }

  async statusOptionTexts() {
    return this.activeStatusDropdown().locator('.ant-select-item-option').allInnerTexts();
  }

  /**
   * Opens the dropdown first if it isn't already open - "select X from the filter" reads as one
   * self-contained action, and one of the scenarios exercises it without a separate prior "open
   * the filter" step, so this can't assume the dropdown is already open.
   */
  async selectStatus(status) {
    const dropdown = this.activeStatusDropdown();
    const alreadyOpen = await dropdown.isVisible().catch(() => false);
    if (!alreadyOpen) {
      await this.openStatusFilter();
    }
    await this.activeStatusDropdown()
      .locator('.ant-select-item-option', { hasText: status })
      .click();
    await this.page.waitForTimeout(1000); // let the filtered table settle before the caller reads it
  }

  async clearStatusFilter() {
    await this.statusFilter.hover();
    await this.statusFilterClearIcon.click();
    await this.page.waitForTimeout(1000);
  }

  /** Debounced server-side search - the wait lets the table finish re-rendering before the
   *  caller reads it. */
  async search(term) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1000);
  }

  async clearSearch() {
    await this.searchClearIcon.click();
    await this.page.waitForTimeout(1000);
  }

  /** Data rows only (excludes the header row) - a data row is identified by containing at
   *  least one `cell` (the header row's cells are `columnheader`s instead). */
  dataRows() {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  protocolNameCell(row) {
    return row.getByRole('cell').first();
  }

  changeTypeCell(row) {
    return row.getByRole('cell').last();
  }
}

module.exports = ChangeRecordingPage;
