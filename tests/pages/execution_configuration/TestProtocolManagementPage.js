const BasePage = require('../BasePage');

/**
 * Verified live. Reached via Configuration > Execution Configuration, same destination as
 * LiquidAnalysisProtocolCreationPage.navigateToProtocolList() - the navigation click sequence is
 * intentionally duplicated here rather than reused, since this is a standalone page object
 * covering the page's general tabs/table/filters rather than the create/update/delete flow that
 * page already owns.
 */
class TestProtocolManagementPage extends BasePage {
  constructor(page) {
    super(page);

    this.configurationButton = page.getByRole('button', { name: 'Configuration' });
    this.executionConfigurationLink = page.getByRole('link', { name: 'Execution Configuration' });

    // Not a real heading - a plain styled div. The identical text also appears as the sidebar
    // nav link (first in DOM), so `.last()` reaches the actual page title.
    this.pageTitle = page.getByText('Execution Configuration', { exact: true }).last();

    this.searchInput = page.getByPlaceholder('Search');
    this.newTestProtocolButton = page.getByRole('button', { name: 'New Test Protocol' });

    this.filtersToggle = page.getByText('Filters', { exact: true });

    // Shared by the create and edit forms (both are the same "protocol details" form, verified
    // live: editing pre-fills these same fields).
    this.nameInput = page.getByRole('textbox', { name: '* Protocol Name' });
    this.saveProtocolButton = page.getByRole('button', { name: 'Save Protocol' });
    // Real title text, verified live - not "New Test Protocol" despite the button that opens it
    // being named that. Duplicating (the copy action) lands on the same route but shows its own
    // distinct title instead of "Add Test Protocol".
    this.newProtocolFormTitle = page.getByText('Add Test Protocol', { exact: true });
    this.editProtocolFormTitle = page.getByText('Edit Test Protocol', { exact: true });
    this.duplicateProtocolFormTitle = page.getByText('Duplicate Test Protocol', { exact: true });

    this.deleteDialog = page.getByRole('dialog').filter({ hasText: 'Delete Protocol' });
    this.deleteConfirmButton = this.deleteDialog.getByRole('button', { name: 'Delete', exact: true });

    this.historyDialog = page.getByRole('dialog');
  }

  /**
   * Starts from a hard `page.goto('/dashboard?page=1')` rather than clicking "Configuration"
   * unconditionally, same as `LiquidAnalysisProtocolCreationPage.navigateToProtocolList()` -
   * verified live, the sidebar's Configuration entry is a toggle: calling `open()` a second time
   * within the same session (e.g. after creating a protocol elsewhere and returning here) would
   * otherwise collapse an already-expanded menu instead of expanding it, hiding the "Execution
   * Configuration" link the very next click needs. A fresh page load always starts collapsed.
   */
  async open() {
    await this.page.goto('/dashboard?page=1');
    await this.configurationButton.click();
    await this.executionConfigurationLink.click();
    // The table's data loads asynchronously after landing on the page - verified live, reading
    // the table right after navigation can catch it still empty.
    await this.page.waitForTimeout(3000);
  }

  tab(name) {
    return this.page.getByRole('tab', { name });
  }

  async clickTab(name) {
    await this.tab(name).click();
  }

  async isTabSelected(name) {
    return (await this.tab(name).getAttribute('aria-selected')) === 'true';
  }

  columnHeader(name) {
    return this.page.getByRole('columnheader', { name, exact: true });
  }

  async search(term) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1200);
  }

  /** The "Filters" heading and its expand/collapse toggle button are siblings under the same
   *  wrapper div - verified live. */
  filtersToggleButton() {
    return this.filtersToggle.locator('xpath=ancestor::div[1]//button');
  }

  /** Clicking the "Filters" text itself doesn't toggle the panel here (unlike the equivalent
   *  text on the Requests page) - only the chevron button does, verified live. */
  async openFilters() {
    await this.filtersToggleButton().click();
  }

  /** The toggle's chevron icon flips direction (down when collapsed, up when expanded) -
   *  verified live. */
  async filtersExpanded() {
    const className = await this.filtersToggleButton().locator('i').getAttribute('class');
    return (className || '').includes('chevron-up');
  }

  /**
   * Matched by the Name cell's exact accessible name, not `hasText` (substring) - the duplicate
   * scenario leaves behind rows like "Bug_test_dup123456" whose name contains "Bug_test" as a
   * prefix, which a substring match against "Bug_test" would wrongly include too (verified live:
   * this previously made the delete scenario's "no longer appears" assertion see 5 rows instead
   * of the expected 0).
   */
  rowFor(protocolName) {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: protocolName, exact: true }),
    });
  }

  /** Column order is Name, Syrup ID, Customer Formula, Status, ... - Status is the 4th cell. */
  statusCell(row) {
    return row.getByRole('cell').nth(3);
  }

  /**
   * All four row actions (edit/copy/history/delete) are icon-only buttons with no accessible
   * name - verified live, each only has an `aria-describedby` pointing at a tooltip, which
   * contributes to accessible description, not name, so `getByRole('button', {name: ...})` can't
   * reach them. They're targeted by their fixed position in the Actions cell instead.
   */
  actionButton(protocolName, action) {
    const index = { edit: 0, copy: 1, history: 2, delete: 3 }[action];
    return this.rowFor(protocolName).getByRole('cell').last().getByRole('button').nth(index);
  }

  async clickNewTestProtocol() {
    await this.newTestProtocolButton.click();
  }

  async clickEditAction(protocolName) {
    await this.actionButton(protocolName, 'edit').click();
  }

  async clickCopyAction(protocolName) {
    await this.actionButton(protocolName, 'copy').click();
  }

  async clickHistoryAction(protocolName) {
    await this.actionButton(protocolName, 'history').click();
  }

  async clickDeleteAction(protocolName) {
    await this.actionButton(protocolName, 'delete').click();
  }

  async confirmDeletion() {
    await this.deleteConfirmButton.click();
  }

  /**
   * The copy action only pre-fills the create form (verified live via `duplicateFrom` in the
   * URL) - it doesn't create the row until Save Protocol is clicked, and saving under the
   * original name would hit the same "name already taken" block documented for the plain create
   * flow (see LiquidAnalysisProtocolCreationPage), so this appends a per-run unique suffix to the
   * pre-filled name first. The resulting name is remembered on `lastDuplicateName` for the
   * following assertion step.
   */
  async saveDuplicateWithUniqueName() {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const currentName = await this.nameInput.inputValue();
    this.lastDuplicateName = `${currentName}_dup${uniqueSuffix}`;
    await this.nameInput.click();
    await this.nameInput.fill(this.lastDuplicateName);
    await this.saveProtocolButton.click();
    await this.page.waitForTimeout(1500);
  }
}

module.exports = TestProtocolManagementPage;
