const BasePage = require('./BasePage');

/**
 * Ported from a separate Pakquality automation project (own POM structure, restructured here to
 * follow this suite's conventions) - reached via Configuration > Core Configuration, same
 * Configuration parent menu as Execution Configuration (see
 * TestProtocolManagementPage/CipProtocolCreationPage etc.).
 *
 * Confirmed live in the source project (Playwright codegen):
 *
 *   await page.getByRole('button', { name: 'Configuration' }).click();
 *   await page.getByRole('link', { name: 'Core Configuration' }).click();
 *   await page.getByRole('button', { name: 'New Test Attribute' }).click();
 *   await page.locator('div').filter({ hasText: /^Textbox$/ }).click();
 *   await page.getByRole('textbox', { name: '* Attribute Name' }).fill('Test Att');
 *   await page.getByRole('textbox', { name: '* Unit of Measure' }).fill('Test');
 *   await page.getByRole('button', { name: 'Save' }).click();
 *   await page.getByRole('button', { description: 'Edit', exact: true }).click();
 *   await page.getByRole('button', { name: 'Update' }).click();
 *   await page.getByText('COA').click();
 *   await page.getByRole('button', { name: 'collapsed Off-site Testing' }).click();
 *   await page.getByRole('button', { name: 'collapsed api Micro Tests' }).click();
 *   await page.getByRole('button', { name: 'api New Micro Test' }).click();
 *   await page.getByRole('textbox', { name: '* Test Name' }).fill('Automated MicroTest');
 *   await page.getByRole('textbox', { name: 'Enter a value' }).fill('1');
 *   await page.getByRole('button', { name: 'plus Add' }).click();
 *   await page.getByRole('button', { name: 'collapsed experiment Chem' }).click();
 *   await page.getByRole('button', { name: 'experiment New Chem Test' }).click();
 *   await page.getByRole('textbox', { name: 'Enter test name' }).fill('Automated Chem test');
 *   await page.getByText('Shifts').click();
 *   await page.getByRole('button', { name: 'Add Shift' }).click();
 *   await page.getByRole('textbox', { name: '* Shift Name' }).fill('Automation Test');
 *   await page.getByRole('textbox', { name: '* Start Time' }).click();
 *
 * Key findings, all verified live against the real app:
 * - "Configuration" is a button, "Core Configuration" a link - the Test Attributes page is what
 *   Core Configuration opens by default, no separate "Test Attributes" click needed.
 * - Input Type is a plain clickable tile (not a real dropdown/radio group); required fields carry
 *   a literal "* " prefix in their accessible name.
 * - Edit/Delete row-action icons are icon-only, with the accessible DESCRIPTION ("Edit"/"Delete")
 *   only attaching once that specific button is hovered (a tooltip quirk) - findRowActionIcon()
 *   hovers the row first, then falls through name/description/data-icon strategies, deliberately
 *   with NO positional fallback.
 * - "COA" is a plain text click (getByText), a category header ON the Test Attribute page itself
 *   - NOT the similarly-named top-level Core Configuration tab (confirmed via a live diagnostic
 *   dump after an earlier attempt landed on the wrong one; a settle wait before the click fixed
 *   it - see categoryTab usage in the step file). "Micro Tests" and "Chem" both nest inside
 *   "Off-site Testing" (confirmed live - an earlier assumption that Chem was a sibling of
 *   Off-site Testing itself was wrong). Collapsible section buttons share a "collapsed {icon}
 *   {Section Name}" accessible-name pattern (icon token optional/varies).
 * - The Test Name field uses two different accessible name patterns depending on context - "*
 *   Test Name" for Micro Test, a plain "Enter test name" placeholder (no asterisk) for Chem Test
 *   - testNameInputCandidates() handles both generically.
 * - Start/End Time open an Ant Design TimePicker. Rebuilt on AntD's standard, stable markup (a
 *   `.ant-picker-time-panel-column` per unit, hour then minute, each containing
 *   `.ant-picker-time-panel-cell-inner` cells) rather than a recording's positional/artifact
 *   clicks. Confirmed live that AntD keeps a closed picker's dropdown panel mounted (hidden) even
 *   after use, so a second field's panel search must scope to only the dropdown that is NOT
 *   hidden, or it can match a stale panel from the first field.
 */
class CoreConfigurationPage extends BasePage {
  constructor(page) {
    super(page);

    this.configurationButton = page.getByRole('button', { name: 'Configuration' });
    this.coreConfigurationLink = page.getByRole('link', { name: 'Core Configuration' });

    this.newAttributeModal = page.locator('.ant-modal:visible').filter({ hasText: /New Test Attribute/i }).first();

    // No specific title text confirmed for the Edit or Delete confirmation modals, or the
    // Micro/Chem Test and Shift modals in their edit state - targets whichever ant-modal is
    // currently open.
    this.openModal = page.locator('.ant-modal:visible').last();
  }

  /**
   * Starts from a hard page.goto('/dashboard?page=1') rather than clicking "Configuration"
   * unconditionally - same reasoning as TestProtocolManagementPage.open(): the sidebar's
   * Configuration entry is a toggle, so calling open() a second time mid-session could collapse
   * it instead of expanding it. A fresh page load always starts collapsed.
   */
  async open() {
    await this.page.goto('/dashboard?page=1');
    await this.configurationButton.click();
    await this.coreConfigurationLink.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  /** Generic click for this page's plain, non-icon-prefixed named buttons ("New Test
   *  Attribute"/"Save"/"Update"/"Delete") - shared via the "the user clicks the {string} button"
   *  step in requests.steps.js, gated on this page being the active one. */
  async clickNamedButton(buttonName) {
    const button = this.page.getByRole('button', { name: buttonName, exact: true });
    await button.waitFor({ state: 'visible', timeout: 30000 });
    await button.click();
  }

  // --- Input Type selection ---

  inputTypeTile(inputType) {
    const escaped = inputType.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.locator('div').filter({ hasText: new RegExp(`^${escaped}$`) }).first();
  }

  async findInputTypeDropdown(modal) {
    const candidates = [
      modal.getByRole('combobox', { name: /Input Type/i }),
      modal.locator('[role="combobox"]').filter({ hasText: /Input Type/i }),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  inputTypeDropdownOption(inputType) {
    return this.page.getByText(inputType, { exact: true }).last();
  }

  async findInputTypeDirectOption(modal, inputType) {
    const escaped = inputType.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    const candidates = [
      modal.getByRole('radio', { name: namePattern }),
      modal.locator('.ant-radio-wrapper, .ant-segmented-item, [role="tab"]').filter({ hasText: namePattern }),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  // --- Modal fields (shared by Attribute Name/Unit of Measure/Description/Shift Name/Start
  // Time/End Time - all follow the same "* Field Name" or plain-placeholder convention) ---

  async findModalField(modal, fieldName) {
    const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidates = [
      modal.getByRole('textbox', { name: new RegExp(`\\*?\\s*${escaped}`, 'i') }),
      modal.getByPlaceholder(fieldName, { exact: true }),
      modal.locator(`input[placeholder*="${fieldName}" i]`),
      modal.locator(`textarea[placeholder*="${fieldName}" i]`),
      modal.locator(`input[name*="${fieldName}" i]`),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  async fillModalField(modal, fieldName, value) {
    const input = await this.findModalField(modal, fieldName);
    if (!input) {
      throw new Error(`Field "${fieldName}" could not be located in the modal.`);
    }
    await input.fill(String(value));
  }

  // --- Table rows (Test Attributes / Micro Test / Chem Test / Shifts all share this shape) ---

  rowFor(name) {
    return this.page.locator('table tr').filter({ hasText: name }).first();
  }

  rowsFor(name) {
    return this.page.locator('table tr').filter({ hasText: name });
  }

  rowForWithUnit(name, unit) {
    return this.page.locator('table tr').filter({ hasText: name }).filter({ hasText: unit }).first();
  }

  /** Skips AntD's hidden "measure row" (column-width calculation only, not real data). */
  async firstDataRow() {
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      if (!(await row.isVisible().catch(() => false))) continue;
      const className = await row.getAttribute('class').catch(() => '');
      if (className && className.includes('ant-table-measure-row')) continue;
      return row;
    }
    return null;
  }

  async actionsCellHtml(row) {
    return row.locator('td').last().innerHTML().catch(() => '');
  }

  /** Edit/Delete row-action icon, hover-dependent accessible description first, then
   *  data-icon/aria-label, then position within the Actions cell - deliberately no positional
   *  fallback beyond that last resort (Edit precedes Delete left to right). */
  async findRowActionIcon(row, iconName, position) {
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    await this.page.waitForTimeout(300);

    const actionsCellButtons = row.locator('td:last-child button, td:last-child [role="button"]');
    const candidates = [
      row.getByRole('button', { description: iconName, exact: true }),
      row.locator(`svg[data-icon="${iconName.toLowerCase()}" i], .anticon-${iconName.toLowerCase()}`),
      row.locator(`[aria-label="${iconName}" i], [title="${iconName}" i]`),
      position === 'last' ? actionsCellButtons.last() : actionsCellButtons.first(),
    ];
    for (const c of candidates) {
      const count = await c.count();
      for (let i = 0; i < count; i++) {
        const item = c.nth(i);
        if (await item.isVisible().catch(() => false)) return item;
      }
    }
    return null;
  }

  // --- Micro Test / Chem Test (COA > Off-site Testing > Micro Tests / Chem) ---

  categoryTab(name) {
    return this.page.getByText(name, { exact: true });
  }

  collapsedSectionButton(sectionName) {
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('button', { name: new RegExp(`collapsed.*${escaped}`, 'i') });
  }

  newTestButton(testLabel) {
    const escaped = testLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('button', { name: new RegExp(escaped, 'i') });
  }

  testNameInputCandidates(modal) {
    return [modal.getByRole('textbox', { name: /Test Name/i }), modal.getByPlaceholder(/test name/i), modal.locator('input[placeholder*="test name" i]')];
  }

  valueInputCandidates(modal) {
    return [modal.getByRole('textbox', { name: 'Enter a value', exact: true }), modal.getByPlaceholder('Enter a value', { exact: true })];
  }

  addValueButton(modal) {
    return modal.getByRole('button', { name: /Add/i });
  }

  async findVisible(candidates) {
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  // --- Shift (Core Configuration > Shifts tab) ---

  /** Confirmed live: AntD keeps a closed picker's dropdown panel mounted (hidden) even after it
   *  closes - a second field's search must scope to only the NOT-hidden dropdown, or it can match
   *  a stale panel from an earlier field. Column 0 = hour, column 1 = minute. */
  timePanelColumnCell(columnIndex, value) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) .ant-picker-time-panel-column')
      .nth(columnIndex)
      .locator('.ant-picker-time-panel-cell-inner')
      .filter({ hasText: new RegExp(`^${escaped}$`) });
  }

  timePickerOkButton() {
    return this.page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').getByRole('button', { name: 'OK', exact: true });
  }

  async setTimeField(fieldLabel, timeValue) {
    const input = await this.findModalField(this.openModal, fieldLabel);
    if (!input) {
      throw new Error(`"${fieldLabel}" field could not be located.`);
    }
    await input.click();

    const [hour, minute] = timeValue.split(':');
    const hourCell = this.timePanelColumnCell(0, hour);
    await hourCell.waitFor({ state: 'visible', timeout: 30000 });
    await hourCell.click();

    const minuteCell = this.timePanelColumnCell(1, minute);
    await minuteCell.waitFor({ state: 'visible', timeout: 30000 });
    await minuteCell.click();

    const okButton = this.timePickerOkButton();
    await okButton.waitFor({ state: 'visible', timeout: 30000 });
    await okButton.click();
  }
}

module.exports = CoreConfigurationPage;
