const BasePage = require('../BasePage');

/**
 * Rebuilt after a fresh Playwright codegen recording against the live app - the recording
 * itself couldn't be replayed literally: it relies on exactly which dropdowns happened to be
 * scrolled/open at each point (AntD leaves every closed dropdown hidden in the DOM rather than
 * removing it, and testAttributeId's option list is long enough to need scrolling - it's
 * virtualized and options far from the current scroll position don't exist in the DOM yet).
 * Both make plain getByText(...).nth(n) picks fragile across runs. selectOption() instead
 * scopes every pick to whichever one dropdown panel is currently open (not hidden) and matches
 * by each option's title attribute, which - unlike visible text - is unique per option even
 * when duplicate text nodes are lying around from earlier fields.
 */
class LiquidAnalysisProtocolCreationPage extends BasePage {
  constructor(page) {
    super(page);

    // --- Navigation ---
    this.configurationButton = page.getByRole('button', { name: 'Configuration' });
    this.executionConfigurationLink = page.getByRole('link', { name: 'Execution Configuration' });
    this.newTestProtocolButton = page.getByRole('button', { name: 'New Test Protocol' });

    // --- Protocol details ---
    this.nameInput = page.getByRole('textbox', { name: '* Protocol Name' });
    this.syrupIdInput = page.getByRole('textbox', { name: '* Syrup ID' });
    this.customerFormulaInput = page.getByRole('textbox', { name: 'Customer Formula' });

    this.addTestAttributeButton = page.getByRole('button', { name: 'Add Test Attribute' });
    this.saveProtocolButton = page.getByRole('button', { name: 'Save Protocol' });

    // --- Protocol list ---
    this.searchInput = page.getByPlaceholder('Search');
    this.deleteConfirmButton = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true });
  }

  async navigateToProtocolList() {
    await this.page.goto('/dashboard?page=1');
    await this.configurationButton.click();
    await this.executionConfigurationLink.click();
  }

  async navigateToNewProtocolForm() {
    await this.navigateToProtocolList();
    await this.newTestProtocolButton.click();
  }

  /** Filters the protocol list table down to rows matching `name` (debounced, hence the wait). */
  async searchProtocol(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Matched by the NAME cell's exact `title` attribute (AntD sets it to the cell's full,
   * untruncated text), not `hasText` - this list accumulates many similarly-prefixed test
   * protocols (jhnm123456, jhnm654321, ...) across runs, and a substring match against "jhnm"
   * would silently grab an unrelated one instead of the exact name asked for.
   */
  protocolRow(name) {
    return this.page.locator(`td.ant-table-cell-ellipsis[title="${name}"]`).locator('xpath=ancestor::tr').first();
  }

  rowActionButton(name, index) {
    return this.protocolRow(name).locator('td').last().locator('button').nth(index);
  }

  // Actions column order (verified live, no accessible names on these icon buttons): edit,
  // copy, history, delete.
  async openProtocolForEditing(name) {
    await this.rowActionButton(name, 0).click();
  }

  async openProtocolForDeletion(name) {
    await this.rowActionButton(name, 3).click();
  }

  async confirmDeletion() {
    await this.deleteConfirmButton.click();
  }

  /**
   * The create scenario uses a fixed, literal name (not a per-run random suffix - see
   * "the user fills in the protocol details" step) so the update/delete scenarios can find it
   * by exact name afterward. That means a leftover protocol from an earlier partial run, or
   * from someone manually testing with the same name, blocks creation with a disabled Save
   * button ("Protocol name already taken") rather than a catchable error. Deleting any existing
   * match first makes the create scenario idempotent regardless of what's left over.
   */
  async deleteProtocolIfExists(name) {
    await this.navigateToProtocolList();
    await this.searchProtocol(name);
    if ((await this.protocolRow(name).count()) > 0) {
      await this.openProtocolForDeletion(name);
      await this.confirmDeletion();
      await this.page.waitForTimeout(1000);
    }
  }

  async fillProtocolDetails({ name, syrupId, customerFormula }) {
    await this.nameInput.click();
    await this.nameInput.fill(name);
    await this.syrupIdInput.click();
    await this.syrupIdInput.fill(syrupId);
    await this.customerFormulaInput.click();
    await this.customerFormulaInput.fill(customerFormula);
  }

  /**
   * AntD keeps the previously-open dropdown panel in the DOM (class `ant-slide-up-leave`) for
   * the duration of its close animation, still matching `:not(.ant-select-dropdown-hidden)`
   * alongside the newly-opened one (`ant-slide-up-appear`) - both panels can be present at once
   * right after clicking a field to open its dropdown. Verified live on CipProtocolCreationPage's
   * identical pattern: this caused a strict-mode violation on a title that exists in two
   * different fields' option lists ("Analysis" is an option for both Type of Check and
   * Frequency here too). `.last()` picks the most recently opened (i.e. current) panel, since
   * it's the most recently appended to the DOM.
   */
  activeDropdown() {
    return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  }

  /** The visible "selected value" chip for a select field, or null if nothing is selected yet. */
  async selectedOptionText(fieldLocator) {
    const chip = fieldLocator
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
      .locator('.ant-select-selection-item');
    if ((await chip.count()) === 0) return null;
    return chip.textContent();
  }

  /**
   * Every row here is created via addTestAttributeRow() (never duplicated from a row that
   * already has a value), so its testAttributeId dropdown always opens fresh at the top -
   * no need to reset scroll position first. Just search downward until the target option's
   * DOM node exists and is visible.
   */
  async scrollUntilVisible(locator) {
    // Already there (the common case for the small typeOfCheck/frequency/passingCriteriaType
    // lists, which never need scrolling) - skip touching the list/mouse entirely.
    if ((await locator.count()) > 0 && (await locator.first().isVisible().catch(() => false))) return;

    const listBox = this.activeDropdown().locator('.rc-virtual-list-holder').first();
    if ((await listBox.count()) === 0) return;
    await listBox.hover();
    // 150px steps (~1 item) rather than large jumps - AntD only keeps a narrow window of
    // items rendered around the current scroll position, so a coarser step can skip clean
    // over the target between visibility checks without ever rendering it.
    for (let i = 0; i < 80; i++) {
      if ((await locator.count()) > 0 && (await locator.first().isVisible().catch(() => false))) return;
      await this.page.mouse.wheel(0, 150);
    }
  }

  /**
   * Opens a row's select field and picks the option matching this exact title. No-op if the
   * field already shows this exact value (see CipProtocolCreationPage.selectTestAttributeOption
   * for why: with many rows in flight, a later field's click can otherwise land while an earlier
   * field's dropdown is still mid-close-animation).
   */
  async selectOption(rowIndex, fieldName, title) {
    const field = this.page.locator(`#attributes_${rowIndex}_${fieldName}`);
    if ((await this.selectedOptionText(field)) === title) return;
    await field.click();
    const option = this.activeDropdown().getByTitle(title);
    await this.scrollUntilVisible(option);
    await option.first().click();
    await this.page.waitForTimeout(250);
  }

  async addTestAttributeRow() {
    await this.addTestAttributeButton.click();
  }

  /**
   * Fills a Bounds row's lower/upper limit inputs, scoped to the row whose visible text
   * contains `rowNameHint` - needed once more than one row uses "Bounds" at a time, since
   * the limit inputs aren't otherwise scoped to a specific row.
   */
  async fillRowLimits(rowNameHint, { lowerLimit, upperLimit } = {}) {
    const row = this.page.getByRole('row', { name: rowNameHint });
    if (lowerLimit !== undefined) {
      await row.getByPlaceholder('Please Enter Lower Limit').click();
      await row.getByPlaceholder('Please Enter Lower Limit').fill(lowerLimit);
    }
    if (upperLimit !== undefined) {
      await row.getByPlaceholder('Please Enter Upper Limit').click();
      await row.getByPlaceholder('Please Enter Upper Limit').fill(upperLimit);
    }
  }

  async saveProtocol() {
    await this.saveProtocolButton.click();
  }

  /**
   * Creates twelve test attribute rows with their type of check, frequency and passing
   * criteria, then saves. The first three (pH / Sorbic Acid / Can Code) are exactly as
   * originally recorded via Playwright codegen (see class doc comment) - Can Code's double
   * fillRowLimits call is a recorded quirk, not a bug, kept as-is. The other nine were added to
   * reach twelve total, alternating Bounds/Record like the first three and using names verified
   * live against the same shared Test Attribute seed data (see LiquidAnalysisProtocolCreationPage
   * and CipProtocolCreationPage's shared caveat: this list drifts over time).
   */
  async fillAttributeRowsAndSave() {
    await this.selectOption(0, 'testAttributeId', 'pH');
    await this.selectOption(0, 'typeOfCheck', 'Analysis');
    await this.selectOption(0, 'frequency', 'Analysis');
    await this.selectOption(0, 'passingCriteriaType', 'Bounds');
    await this.fillRowLimits('pH', { lowerLimit: '1', upperLimit: '111' });

    await this.addTestAttributeRow();
    await this.selectOption(1, 'testAttributeId', 'Sorbic Acid');
    await this.selectOption(1, 'typeOfCheck', 'Analysis');
    await this.selectOption(1, 'frequency', 'Beginning');
    await this.selectOption(1, 'passingCriteriaType', 'Record');

    await this.addTestAttributeRow();
    await this.selectOption(2, 'testAttributeId', 'Can Code');
    await this.selectOption(2, 'typeOfCheck', 'Analysis');
    await this.selectOption(2, 'frequency', 'End');
    await this.selectOption(2, 'passingCriteriaType', 'Bounds');
    await this.fillRowLimits('Can Code', { lowerLimit: '11', upperLimit: '111' });
    await this.fillRowLimits('Can Code', { lowerLimit: '1' }); // correction, as recorded

    const additionalRows = [
      { name: 'TA', typeOfCheck: 'Analysis', frequency: 'Beginning', passingCriteriaType: 'Record' },
      { name: 'Brix', typeOfCheck: 'Analysis', frequency: 'End', passingCriteriaType: 'Bounds', lowerLimit: '1', upperLimit: '100' },
      { name: 'Density', typeOfCheck: 'Analysis', frequency: 'Beginning', passingCriteriaType: 'Record' },
      { name: 'Caffeine', typeOfCheck: 'Analysis', frequency: 'End', passingCriteriaType: 'Bounds', lowerLimit: '1', upperLimit: '100' },
      { name: 'CO2', typeOfCheck: 'Analysis', frequency: 'Beginning', passingCriteriaType: 'Record' },
      { name: 'Citric Acid', typeOfCheck: 'Analysis', frequency: 'End', passingCriteriaType: 'Bounds', lowerLimit: '1', upperLimit: '100' },
      { name: 'Benzoic Acid', typeOfCheck: 'Analysis', frequency: 'Beginning', passingCriteriaType: 'Record' },
      { name: 'Fill Volume', typeOfCheck: 'Analysis', frequency: 'End', passingCriteriaType: 'Bounds', lowerLimit: '1', upperLimit: '100' },
      { name: 'Gluten', typeOfCheck: 'Analysis', frequency: 'Beginning', passingCriteriaType: 'Record' },
    ];

    for (let i = 0; i < additionalRows.length; i++) {
      const rowIndex = 3 + i;
      const row = additionalRows[i];
      await this.addTestAttributeRow();
      await this.selectOption(rowIndex, 'testAttributeId', row.name);
      await this.selectOption(rowIndex, 'typeOfCheck', row.typeOfCheck);
      await this.selectOption(rowIndex, 'frequency', row.frequency);
      await this.selectOption(rowIndex, 'passingCriteriaType', row.passingCriteriaType);
      if (row.passingCriteriaType === 'Bounds') {
        await this.fillRowLimits(row.name, { lowerLimit: row.lowerLimit, upperLimit: row.upperLimit });
      }
    }

    await this.saveProtocol();
  }
}

module.exports = LiquidAnalysisProtocolCreationPage;
