const BasePage = require('../BasePage');

/**
 * Verified live against the real "Add New CIP Protocol" form - it is not the same form as
 * LiquidAnalysisProtocolCreationPage (no syrupId/customerFormula). CIP Protocol is a tab inside
 * Execution Configuration (alongside Test Protocol, Bulk Offload Protocol, Water Quality
 * Protocol), not a separate Configuration menu link. The form opens with one empty Section
 * (and one empty Test Attribute row inside it) already present - no need to click
 * "New Section"/"New Test Attribute" for the first of each.
 */
class CipProtocolCreationPage extends BasePage {
  constructor(page) {
    super(page);

    // --- Navigation --- verified live
    this.configurationButton = page.getByRole('button', { name: 'Configuration' });
    this.executionConfigurationLink = page.getByRole('link', { name: 'Execution Configuration' });
    this.cipProtocolTab = page.getByRole('tab', { name: 'CIP Protocol' });
    this.newCipProtocolButton = page.getByRole('button', { name: 'New CIP Protocol' });

    // --- Basic Information --- verified live
    this.nameInput = page.locator('#name');
    this.statusSelect = page.locator('#isActive'); // defaults to "Enabled" - left untouched

    // --- Sections (the form opens with one, at index 0, already added) --- verified live.
    // "New Section" is a single button that appends the next section; "New Test Attribute" is
    // per-section (one such button renders inside each section's card), so it's indexed by
    // section rather than stored as a single locator.
    this.newSectionButton = page.getByRole('button', { name: 'New Section' });

    this.saveProtocolButton = page.getByRole('button', { name: 'Save Protocol' });

    // --- Protocol list --- verified live
    this.searchInput = page.getByPlaceholder('Search');
    this.deleteConfirmButton = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true });
  }

  async navigateToCipProtocolList() {
    await this.page.goto('/dashboard?page=1');
    await this.configurationButton.click();
    await this.executionConfigurationLink.click();
    await this.cipProtocolTab.click();
  }

  async openNewCipProtocolForm() {
    await this.newCipProtocolButton.click();
  }

  async enterCipProtocolName(name) {
    await this.nameInput.click();
    await this.nameInput.fill(name);
  }

  sectionNameField(sectionIndex = 0) {
    return this.page.locator(`#sections_${sectionIndex}_name`);
  }

  assignedToField(sectionIndex = 0) {
    return this.page.locator(`#sections_${sectionIndex}_userRoleId`);
  }

  newTestAttributeButton(sectionIndex = 0) {
    return this.page.getByRole('button', { name: 'New Test Attribute' }).nth(sectionIndex);
  }

  async fillSectionDetails({ sectionName, assignedTo } = {}, sectionIndex = 0) {
    if (sectionName !== undefined) {
      const field = this.sectionNameField(sectionIndex);
      await field.click();
      await field.fill(sectionName);
    }
    if (assignedTo !== undefined) {
      await this.assignedToField(sectionIndex).click();
      await this.activeDropdown().getByTitle(assignedTo).click();
      await this.page.waitForTimeout(250); // see selectTestAttributeOption for why this settle wait matters
    }
  }

  /** Adds the section at `sectionIndex` (clicking "New Section" for every index beyond the
   *  first, which the form pre-adds) and fills its name/assigned-to. */
  async addSection(sectionIndex, details) {
    if (sectionIndex > 0) {
      await this.newSectionButton.click();
      await this.page.waitForTimeout(300); // let the new section's fields mount before filling
    }
    await this.fillSectionDetails(details, sectionIndex);
  }

  /** Adds one more test attribute row to the given section (row 0 is pre-added with the
   *  section itself, same as section 0 is pre-added with the form). */
  async addTestAttributeRow(sectionIndex = 0) {
    await this.newTestAttributeButton(sectionIndex).click();
    await this.page.waitForTimeout(300); // let the new row's fields mount before filling
  }

  /**
   * AntD keeps the previously-open dropdown panel in the DOM (class `ant-slide-up-leave`) for
   * the duration of its close animation, still matching `:not(.ant-select-dropdown-hidden)`
   * alongside the newly-opened one (`ant-slide-up-appear`) - both panels can be present at once
   * right after clicking a field to open its dropdown. Verified live: this caused a strict-mode
   * violation on a title that exists in two different fields' option lists ("Analysis" is an
   * option for both Type of Check and Frequency), since both panels matched. `.last()` picks the
   * most recently opened (i.e. current) panel, since it's the most recently appended to the DOM.
   */
  activeDropdown() {
    return this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  }

  testAttributeField(fieldName, rowIndex = 0, sectionIndex = 0) {
    return this.page.locator(`#sections_${sectionIndex}_testAttributes_${rowIndex}_${fieldName}`);
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
   * Test attribute names are seed data that drifts over time (same caveat as
   * LiquidAnalysisProtocolCreationPage's fillAttributeRowsAndSave), so this selects by stable
   * list position rather than a fixed name: `attributeIndex` counts down the dropdown's option
   * order (0 = first) via ArrowDown/Enter, which lets AntD's own virtualized-list scrolling do
   * the work instead of manually scrolling and reading rendered option text (verified live
   * against a 42-option, virtualized, "not all rendered at once" list). Callers pass a distinct
   * `attributeIndex` per row across the whole protocol so no two rows end up with the same
   * attribute - see cip_protocol_creation.steps.js's running `attributeIndex` counter.
   *
   * No-op if the field already has something selected: observed live, a just-added row's field
   * can already show a value before this method ever touches it (a stray click landing on it
   * while an adjacent row's dropdown was still closing). Left as-is rather than overwritten,
   * since forcing a fresh index-based pick here would risk colliding with another row's value.
   */
  async pickTestAttributeAtIndex(attributeIndex, rowIndex = 0, sectionIndex = 0) {
    const field = this.testAttributeField('testAttributeId', rowIndex, sectionIndex);
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
   * Same "already correct" no-op guard as pickFirstTestAttribute, but checked against the exact
   * target title rather than "any value" - if the field already shows what we want to select,
   * clicking it again fails (its own selected-value chip visually covers the search input and
   * blocks the click) for no benefit, since the desired state is already there.
   */
  async selectTestAttributeOption(fieldName, title, rowIndex = 0, sectionIndex = 0) {
    const field = this.testAttributeField(fieldName, rowIndex, sectionIndex);
    if ((await this.selectedOptionText(field)) === title) return;
    await field.click();
    await this.activeDropdown().getByTitle(title).click();
    await this.page.waitForTimeout(250);
  }

  /**
   * Adds one Bounds-criteria test attribute: selects the Test Attribute at `attributeIndex`
   * (see pickTestAttributeAtIndex), applies the given typeOfCheck/frequency, sets Criteria Type
   * to Bounds, and fills the lower/upper limit inputs that only render once Bounds is selected
   * (verified live - other criteria types, e.g. Match/Pass-Fail/Record, weren't explored and
   * would need their own method if used).
   */
  async addBoundsTestAttribute({ typeOfCheck, frequency, lowerLimit, upperLimit }, attributeIndex, rowIndex = 0, sectionIndex = 0) {
    await this.pickTestAttributeAtIndex(attributeIndex, rowIndex, sectionIndex);
    await this.selectTestAttributeOption('typeOfCheck', typeOfCheck, rowIndex, sectionIndex);
    await this.selectTestAttributeOption('frequency', frequency, rowIndex, sectionIndex);
    await this.selectTestAttributeOption('criteriaType', 'Bounds', rowIndex, sectionIndex);
    await this.testAttributeField('lowerLimit', rowIndex, sectionIndex).fill(String(lowerLimit));
    await this.testAttributeField('upperLimit', rowIndex, sectionIndex).fill(String(upperLimit));
  }

  /**
   * Adds `attributes.length` Bounds-criteria test attributes to the given section, starting at
   * `startingAttributeIndex` and incrementing by one per row so every row gets a distinct Test
   * Attribute - both within this section and, as long as callers keep a running offset across
   * sections (see cip_protocol_creation.steps.js), across the whole protocol. Row 0 is
   * pre-added with the section, so only rows beyond the first need a "New Test Attribute" click.
   */
  async addBoundsTestAttributes(sectionIndex, attributes, startingAttributeIndex = 0) {
    for (let rowIndex = 0; rowIndex < attributes.length; rowIndex++) {
      if (rowIndex > 0) {
        await this.addTestAttributeRow(sectionIndex);
      }
      await this.addBoundsTestAttribute(attributes[rowIndex], startingAttributeIndex + rowIndex, rowIndex, sectionIndex);
    }
  }

  async saveProtocol() {
    await this.saveProtocolButton.click();
  }

  /** Filters the CIP protocol list table down to rows matching `name` (debounced, hence the wait). */
  async searchCipProtocol(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(1000);
  }

  /** The CIP Protocol list's name cell is plain text with no `title` attribute (unlike the Test
   *  Protocol list), so it's matched by exact accessible name instead. */
  cipProtocolRow(name) {
    return this.page.getByRole('cell', { name, exact: true }).locator('xpath=ancestor::tr').first();
  }

  rowActionButton(name, index) {
    return this.cipProtocolRow(name).locator('button').nth(index);
  }

  // Actions column order verified live: edit, copy, delete (no history button, unlike the Test
  // Protocol list's edit/copy/history/delete).
  async openCipProtocolForEditing(name) {
    await this.rowActionButton(name, 0).click();
  }

  async openCipProtocolForDeletion(name) {
    await this.rowActionButton(name, 2).click();
  }

  async confirmDeletion() {
    await this.deleteConfirmButton.click();
  }
}

module.exports = CipProtocolCreationPage;
