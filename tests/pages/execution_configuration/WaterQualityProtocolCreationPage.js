const BasePage = require('../BasePage');

/**
 * Verified live against the real "Add New Water Quality Protocol" form - it is a different
 * shape from CipProtocolCreationPage/BulkOffloadProtocolCreationPage's shared component: no
 * "Sections" concept at all (Basic Information followed directly by a flat "Test Attributes"
 * list, closer to LiquidAnalysisProtocolCreationPage's flat `attributes_N_*` shape), an extra
 * required "Facility" field, and no "Frequency" column on each test attribute row. Water
 * Quality Protocol is a tab inside Execution Configuration (alongside Test Protocol, CIP
 * Protocol, Bulk Offload Protocol), not a separate Configuration menu link. "New Test
 * Attribute" is a single global button (no per-section indexing needed, since there are no
 * sections) and the list's Actions column has only edit/delete (no copy), unlike the CIP/Bulk
 * Offload lists.
 *
 * Facility matters for visibility, not just data entry: a protocol saved under a Facility other
 * than the session's active one (shown in the app header) does not appear in this session's
 * list view when searched for - verified live by accidentally picking the wrong one first.
 * Callers should pass whichever facility matches the active session (e.g. "DP01").
 */
class WaterQualityProtocolCreationPage extends BasePage {
  constructor(page) {
    super(page);

    // --- Navigation --- verified live
    this.configurationButton = page.getByRole('button', { name: 'Configuration' });
    this.executionConfigurationLink = page.getByRole('link', { name: 'Execution Configuration' });
    this.waterQualityProtocolTab = page.getByRole('tab', { name: 'Water Quality Protocol' });
    this.newWaterQualityProtocolButton = page.getByRole('button', { name: 'New Water Quality Protocol' });

    // --- Basic Information --- verified live
    this.nameInput = page.locator('#name');
    this.statusSelect = page.locator('#isActive'); // defaults to "Enabled" - left untouched
    this.facilitySelect = page.locator('#facilityId');

    // --- Test Attributes (flat list, no sections) --- verified live
    this.newTestAttributeButton = page.getByRole('button', { name: 'New Test Attribute' });

    this.saveProtocolButton = page.getByRole('button', { name: 'Save Protocol' });

    // --- Protocol list --- verified live
    // The app header also has a global "Search" box (role searchbox, type=search), so matching
    // by placeholder alone hits two elements - the page's own table search is the plain textbox.
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.deleteConfirmButton = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true });
  }

  async navigateToWaterQualityProtocolList() {
    await this.page.goto('/dashboard?page=1');
    await this.configurationButton.click();
    await this.executionConfigurationLink.click();
    await this.waitForProtocolList('WQT', () => this.waterQualityProtocolTab.click());
  }

  async openNewWaterQualityProtocolForm() {
    await this.newWaterQualityProtocolButton.click();
  }

  async enterWaterQualityProtocolName(name) {
    await this.nameInput.click();
    await this.nameInput.fill(name);
  }

  /**
   * AntD keeps the previously-open dropdown panel in the DOM (class `ant-slide-up-leave`) for
   * the duration of its close animation, still matching `:not(.ant-select-dropdown-hidden)`
   * alongside the newly-opened one (`ant-slide-up-appear`) - both panels can be present at once
   * right after clicking a field to open its dropdown. Verified live on CipProtocolCreationPage's
   * identical pattern: this caused a strict-mode violation on a title that exists in two
   * different fields' option lists. `.last()` picks the most recently opened (i.e. current)
   * panel, since it's the most recently appended to the DOM.
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

  async selectFacility(facility) {
    if ((await this.selectedOptionText(this.facilitySelect)) === facility) return;
    await this.facilitySelect.click();
    await this.activeDropdown().getByTitle(facility).click();
    await this.page.waitForTimeout(250); // see selectTestAttributeOption for why this settle wait matters
  }

  testAttributeField(fieldName, rowIndex = 0) {
    return this.page.locator(`#testAttributes_${rowIndex}_${fieldName}`);
  }

  /** Adds one more test attribute row (row 0 is pre-added with the form). */
  async addTestAttributeRow() {
    await this.newTestAttributeButton.click();
    await this.page.waitForTimeout(300); // let the new row's fields mount before filling
  }

  /**
   * Test attribute names are seed data that drifts over time (same caveat as
   * LiquidAnalysisProtocolCreationPage's fillAttributeRowsAndSave), so this selects by stable
   * list position rather than a fixed name: `attributeIndex` counts down the dropdown's option
   * order (0 = first) via ArrowDown/Enter, which lets AntD's own virtualized-list scrolling do
   * the work (verified live on CipProtocolCreationPage against the same shared Test Attribute
   * master data). Callers pass a distinct `attributeIndex` per row so no two rows end up with
   * the same attribute - see water_quality_protocol_creation.steps.js.
   *
   * No-op if the field already has something selected: observed live on the CIP form, a
   * just-added row's field can already show a value before this method ever touches it (a stray
   * click landing on it while an adjacent row's dropdown was still closing).
   */
  async pickTestAttributeAtIndex(attributeIndex, rowIndex = 0) {
    const field = this.testAttributeField('testAttributeId', rowIndex);
    if ((await this.selectedOptionText(field)) !== null) return;
    await field.click();
    await this.page.waitForTimeout(200);
    for (let i = 0; i < attributeIndex; i++) {
      await this.page.keyboard.press('ArrowDown');
    }
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(250);
  }

  /**
   * Same "already correct" no-op guard as pickTestAttributeAtIndex, but checked against the
   * exact target title rather than "any value" - if the field already shows what we want to
   * select, clicking it again fails (its own selected-value chip visually covers the search
   * input and blocks the click) for no benefit, since the desired state is already there.
   */
  async selectTestAttributeOption(fieldName, title, rowIndex = 0) {
    const field = this.testAttributeField(fieldName, rowIndex);
    if ((await this.selectedOptionText(field)) === title) return;
    await field.click();
    await this.activeDropdown().getByTitle(title).click();
    await this.page.waitForTimeout(250);
  }

  /**
   * Adds one Bounds-criteria test attribute: selects the Test Attribute at `attributeIndex`
   * (see pickTestAttributeAtIndex), applies the given typeOfCheck, sets Criteria Type to
   * Bounds, and fills the lower/upper limit inputs that only render once Bounds is selected.
   * Unlike CIP/Bulk Offload, there is no Frequency field on this form.
   */
  async addBoundsTestAttribute({ typeOfCheck, lowerLimit, upperLimit }, attributeIndex, rowIndex = 0) {
    await this.pickTestAttributeAtIndex(attributeIndex, rowIndex);
    await this.selectTestAttributeOption('typeOfCheck', typeOfCheck, rowIndex);
    await this.selectTestAttributeOption('criteriaType', 'Bounds', rowIndex);
    await this.testAttributeField('lowerLimit', rowIndex).fill(String(lowerLimit));
    await this.testAttributeField('upperLimit', rowIndex).fill(String(upperLimit));
  }

  /** Adds `attributes.length` Bounds-criteria test attributes, each getting a distinct Test
   *  Attribute (index 0, 1, 2, ...). Row 0 is pre-added with the form, so only rows beyond the
   *  first need a "New Test Attribute" click. */
  async addBoundsTestAttributes(attributes) {
    for (let rowIndex = 0; rowIndex < attributes.length; rowIndex++) {
      if (rowIndex > 0) {
        await this.addTestAttributeRow();
      }
      await this.addBoundsTestAttribute(attributes[rowIndex], rowIndex, rowIndex);
    }
  }

  async saveProtocol() {
    await this.saveProtocolButton.click();
  }

  /** Filters the Water Quality protocol list table down to rows matching `name`, waiting for the
   *  search's response. */
  async searchWaterQualityProtocol(name) {
    await this.searchProtocolList('WQT', this.searchInput, name);
  }

  /** The Water Quality Protocol list's name cell is plain text with no `title` attribute (same
   *  as the CIP/Bulk Offload Protocol lists, unlike the Test Protocol list), so it's matched by
   *  exact accessible name instead. */
  waterQualityProtocolRow(name) {
    return this.page.getByRole('cell', { name, exact: true }).locator('xpath=ancestor::tr').first();
  }

  rowActionButton(name, index) {
    return this.waterQualityProtocolRow(name).locator('button').nth(index);
  }

  // Actions column order verified live: edit, delete - no copy button, unlike the CIP/Bulk
  // Offload Protocol lists' edit/copy/delete.
  async openWaterQualityProtocolForEditing(name) {
    await this.rowActionButton(name, 0).click();
  }

  async openWaterQualityProtocolForDeletion(name) {
    await this.rowActionButton(name, 1).click();
  }

  async confirmDeletion() {
    await this.deleteConfirmButton.click();
  }
}

module.exports = WaterQualityProtocolCreationPage;
