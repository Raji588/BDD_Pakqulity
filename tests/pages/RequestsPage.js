const BasePage = require('./BasePage');

/**
 * Verified live. Reached directly from the sidebar, like Change Recording - not composed onto
 * CampaignExecutionPage.
 *
 * The "Filters" panel (Request ID/Campaign/Test Attribute/From Date/To Date/Status) is
 * collapsed by default and only reveals its fields once its header is clicked - no scenario has
 * a separate "open the Filters panel" step, so `open()` expands it as part of navigating here
 * rather than leaving that to individual filter steps.
 */
class RequestsPage extends BasePage {
  constructor(page) {
    super(page);

    this.navLink = page.getByRole('link', { name: 'Requests' });
    this.pageTitle = page.getByRole('heading', { name: 'Requests', exact: true });
    this.filtersToggle = page.getByText('Filters', { exact: true });

    this.searchInput = page.getByPlaceholder('Search');

    this.requestIdInput = this.fieldLabel('Request ID').locator('xpath=following-sibling::div[1]//input');
    this.statusSelector = this.fieldLabel('Status').locator(
      'xpath=following-sibling::div[1]//div[contains(@class,"ant-select-selector")]'
    );

    this.fromDateInput = page.getByPlaceholder('Select From Date');
    this.toDateInput = page.getByPlaceholder('Select To Date');

    this.filterButton = page.getByRole('button', { name: 'Filter', exact: true });
    this.resetFiltersOption = page.getByText('Reset Filters', { exact: true });

    this.detailDialog = page.getByRole('dialog');
    this.detailHeading = page.getByRole('heading', { name: 'Request Overview' });
  }

  async open() {
    await this.navLink.click();
    await this.filtersToggle.click();
  }

  /** Each filter field is a `<label>` followed by its own control div - scoping by the field's
   *  exact label text disambiguates between fields (all six labels are distinct substrings). */
  fieldLabel(fieldName) {
    return this.page.locator('label', { hasText: fieldName });
  }

  /** AntD keeps closed dropdown/date-picker panels hidden in the DOM rather than removing them -
   *  same pattern used throughout this suite. `.last()` picks the most recently opened one. */
  activeSelectDropdown() {
    return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  }

  activeDatePicker() {
    return this.page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').last();
  }

  /**
   * Request ID / Campaign / Test Attribute are AntD AutoComplete fields (typing alone doesn't
   * apply as a filter - verified live: the typed text must be confirmed by clicking its matching
   * suggestion, otherwise clicking "Filter" leaves the list unfiltered).
   */
  async fillAutocompleteFilter(fieldName, value) {
    const input = this.fieldLabel(fieldName).locator('xpath=following-sibling::div[1]//input');
    await input.click();
    await input.fill(value);
    await this.page.waitForTimeout(1200); // debounced suggestion lookup
    await this.activeSelectDropdown().locator('.ant-select-item-option', { hasText: value }).click();
  }

  async openStatusFilter() {
    await this.statusSelector.click();
  }

  async selectStatus(status) {
    const dropdown = this.activeSelectDropdown();
    const alreadyOpen = await dropdown.isVisible().catch(() => false);
    if (!alreadyOpen) {
      await this.openStatusFilter();
    }
    await this.activeSelectDropdown().locator('.ant-select-item-option', { hasText: status }).click();
  }

  /** Picks the calendar's "today" cell - any valid, always-enabled date is enough to exercise
   *  the date-range filter. */
  async pickDate(input) {
    await input.click();
    await this.activeDatePicker().locator('.ant-picker-cell-today').click();
  }

  async selectFromDate() {
    await this.pickDate(this.fromDateInput);
  }

  async selectToDate() {
    await this.pickDate(this.toDateInput);
  }

  async clickFilter() {
    await this.filterButton.click();
    await this.page.waitForTimeout(1500); // let the filtered table settle
  }

  async clickResetFilters() {
    await this.resetFiltersOption.click();
    await this.page.waitForTimeout(1500);
  }

  /** Debounced server-side keyword search, separate from the per-field Filters panel. */
  async search(term) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1200);
  }

  /** Data rows only (excludes the header row) - a data row is identified by containing at
   *  least one `cell` (the header row's cells are `columnheader`s instead). Empty results
   *  render a single AntD "No data" placeholder row with no `cell`s, so this naturally excludes
   *  it too. */
  dataRows() {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  requestIdCell(row) {
    return row.getByRole('cell').nth(0);
  }

  campaignCell(row) {
    return row.getByRole('cell').nth(1);
  }

  testAttributeCell(row) {
    return row.getByRole('cell').nth(2);
  }

  statusCell(row) {
    return row.getByRole('cell').nth(5);
  }

  rowFor(requestId) {
    return this.page.getByRole('row').filter({ hasText: requestId });
  }

  async viewRequest(requestId) {
    await this.rowFor(requestId).getByRole('link', { name: 'View' }).click();
  }

  /**
   * Approval section (upper limit override + comment + Approve), ported from a separate
   * Pakquality automation project - ties into this same detailDialog ("Request Overview") rather
   * than a separately-confirmed modal, since this suite already confirmed that dialog live for
   * the plain View flow. No click was recorded between opening the dialog and finding the upper
   * limit field in the source project, so a separate "Approval" tab/section may not exist at all
   * here either - findApprovalSectionTab() is optional, not required.
   */
  async findApprovalSectionTab() {
    const candidates = [this.detailDialog.getByRole('tab', { name: /Approval/i }), this.detailDialog.getByText('Approval', { exact: true })];
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  upperLimitInputCandidates() {
    return [
      this.detailDialog.getByRole('spinbutton', { name: 'New Value' }).first(),
      this.detailDialog.getByRole('spinbutton', { name: /New Value/i }).first(),
      this.detailDialog.locator('input[type="number"]:visible').first(),
    ];
  }

  /** Shared field shape with the Spec Change Request dialog's own comment field (see
   *  CampaignExecutionPage.js's specChangeRequestCommentInputCandidates) - only this Approval
   *  section's version was ever confirmed via recording. */
  approvalCommentInputCandidates() {
    return [
      this.detailDialog.getByRole('textbox', { name: /Enter your approval/i }),
      this.detailDialog.getByRole('textbox', { name: /comment/i }),
      this.detailDialog.locator('textarea'),
      this.detailDialog.locator('input[placeholder*="comment" i]'),
    ];
  }

  approveButton() {
    return this.detailDialog.getByRole('button', { name: 'Approve' });
  }

  async findVisible(candidates) {
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }
}

module.exports = RequestsPage;
