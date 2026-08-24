const BasePage = require('./BasePage');

/**
 * Ported from a separate Pakquality automation project (own POM structure, restructured here
 * to follow this suite's conventions) - reached via Configuration-style sidebar navigation
 * (Document Control > Liquid Analysis), not composed onto CampaignExecutionPage, same reasoning
 * as ChangeRecordingPage/RequestsPage being standalone.
 *
 * Confirmed live in the source project (Playwright codegen):
 *
 *   await page.getByRole('button', { name: 'Document Control' }).click();
 *   await page.getByRole('link', { name: 'Liquid Analysis' }).click();
 *   await page.getByRole('button', { name: 'Pending Review' }).click();
 *   await page.getByRole('textbox', { name: 'Search by keyword' }).fill('c1001');
 *   await page.getByRole('button', { description: 'Edit', exact: true }).click();
 *   await page.getByTitle('Pending Review').click();
 *   await page.getByText('Approved').nth(3).click();
 *   await page.getByRole('button', { name: 'Save' }).click();
 *   await page.getByRole('button', { name: 'file-add', description: 'Download COA' }).click();
 *   await page.getByRole('button', { name: 'Approved' }).click();
 *   await page.getByRole('button', { name: 'inbox', description: 'Archive' }).click();
 *   await page.getByRole('button', { name: 'Archive', exact: true }).click();
 *   await page.getByRole('button', { name: 'inbox View Archives' }).click();
 *   await page.getByRole('button', { name: 'team', description: 'Customer Download' }).click();
 *   (new tab) await page.getByRole('button', { name: 'Release to Customer' }).click();
 *   await page.getByRole('button', { name: 'plus Add Row' }).click();
 *   await page.getByText('End').click();
 *   await page.getByRole('button', { name: 'download Generate & Download' }).click();
 *
 * Key findings, all verified live against the real app:
 * - "Document Control" is a button, "Liquid Analysis" a link - same pattern as
 *   Configuration > Core Configuration/Execution Configuration elsewhere in this suite.
 * - "Pending Review"/"All Campaigns"/"Approved" are plain named quick-filter buttons.
 * - The status dropdown trigger's accessible name mirrors its currently selected value (via the
 *   `title` attribute), same as this app's other AntD selects.
 * - Every row action icon (Edit, Customer Download, Download Files, Download COA, Archive) is
 *   icon-only. This page uses a plain CSS class-based icon font (e.g. `<i class="icon-edit">`)
 *   for Edit, not AntD's data-icon/anticon-* SVG convention used by the others - each button's
 *   accessible description only attaches once THAT SPECIFIC button is hovered (a tooltip quirk),
 *   so findRowActionIcon() below hovers the row, then tries several strategies in order (icon
 *   class, name+description, name alone, data-icon/aria-label), each filtered by excludeText to
 *   reject known-wrong matches - deliberately no positional fallback, since guessing by position
 *   previously clicked the wrong action on live data.
 * - The "Select Test Attributes to Download" modal (opened by the "download" icon, 3rd of 5
 *   action icons) has "Select All" pre-checked by default; its Download button is scoped to the
 *   modal.
 * - Customer Download opens an entirely new browser tab, not a modal - every method below that
 *   operates on it takes an explicit `page` argument instead of using the constructor's
 *   `this.page` (which stays the original Liquid Analysis tab). Its table is a custom
 *   spreadsheet-like grid, not a plain AntD table: each cell shows static text with a per-cell
 *   hover-revealed "edit" icon; clicking the bare cell only selects it, so the Comments-column
 *   edit hovers the cell and clicks that icon specifically. The "Comments" column is located
 *   generically by matching the table header's text/index rather than a hardcoded position.
 * - Archive's confirmation popup and the Customer Download tab's several buttons all carry an
 *   icon-text prefix in their accessible name (e.g. "inbox View Archives", "plus Add Row",
 *   "download Generate & Download") - matched with loose regexes rather than exact strings.
 */
class DocumentControlPage extends BasePage {
  constructor(page) {
    super(page);

    this.documentControlButton = page.getByRole('button', { name: 'Document Control' });
    this.liquidAnalysisLink = page.getByRole('link', { name: 'Liquid Analysis' });

    this.searchInput = page.getByRole('textbox', { name: 'Search by keyword' });

    this.editRecordModal = page.locator('.ant-modal:visible').filter({ hasText: /Edit Record/i }).first();
    this.statusOptionInDropdown = (value) => page.getByText(value, { exact: true }).last();

    this.downloadFilesModal = page
      .locator('.ant-modal:visible')
      .filter({ hasText: /Select Test Attributes to Download/i })
      .first();
    this.downloadFilesSubmitButton = this.downloadFilesModal.getByRole('button', { name: 'Download', exact: true });

    // No confirmed title text for either of these - targets whichever ant-modal is currently
    // open, same fallback used throughout this suite for AntD modals without a stable title.
    this.openModal = page.locator('.ant-modal:visible').last();

    this.viewArchivesButton = page.getByRole('button', { name: /View Archives/i });
  }

  /**
   * Generic click for this page's plain, non-icon-prefixed named buttons (quick filters like
   * "Pending Review"/"All Campaigns"/"Approved", modal buttons like "Save"/"Update"/"Delete"/
   * "Archive") - shared via the "the user clicks the {string} button" step in requests.steps.js,
   * gated on this page being the active one, rather than adding one dispatcher branch per button
   * name there.
   */
  async clickNamedButton(buttonName) {
    const button = this.page.getByRole('button', { name: buttonName, exact: true });
    await button.waitFor({ state: 'visible', timeout: 30000 });
    await button.click();
  }

  /**
   * Starts from a hard page.goto('/dashboard?page=1') rather than clicking "Document Control"
   * unconditionally - same reasoning as TestProtocolManagementPage.open(): if it's a toggle-style
   * sidebar menu, calling open() a second time mid-session could collapse it instead of expanding
   * it. A fresh page load always starts collapsed.
   */
  async open() {
    await this.page.goto('/dashboard?page=1');
    await this.documentControlButton.click();
    await this.liquidAnalysisLink.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async search(term) {
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(1000);
  }

  resultRow(keyword) {
    return this.page.locator('table tr').filter({ hasText: keyword }).first();
  }

  /** Skips AntD's hidden "measure row" (column-width calculation only, not real data) - same
   *  pattern used throughout this suite (e.g. TestProtocolManagementPage's rowFor()). */
  async firstResultRow() {
    return this.firstDataRowIn(this.page);
  }

  async firstDataRowIn(page) {
    const rows = page.locator('table tbody tr');
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

  /**
   * Finds one row's icon-only action button, trying several strategies in order (icon class,
   * name+description, description alone, data-icon/aria-label) and rejecting any candidate whose
   * nearest clickable ancestor's text matches excludeText - deliberately no positional fallback.
   */
  async findRowActionIcon(row, { name, description, iconClass, excludeText = [] } = {}) {
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    await this.page.waitForTimeout(300);

    const roleOptions = { exact: true };
    if (name) roleOptions.name = name;
    if (description) roleOptions.description = description;

    const iconKey = (name || description || '').toLowerCase();
    const candidates = [];

    if (iconClass) {
      candidates.push(row.locator(`i.${iconClass}`));
    }
    candidates.push(row.getByRole('button', roleOptions));
    if (description && name) {
      candidates.push(row.getByRole('button', { description, exact: true }));
    }
    if (iconKey) {
      candidates.push(row.locator(`svg[data-icon="${iconKey}" i], .anticon-${iconKey}`));
      candidates.push(row.locator(`[aria-label="${iconKey}" i], [title="${iconKey}" i]`));
    }

    const excludePattern = excludeText.length
      ? new RegExp(excludeText.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
      : null;

    for (const candidate of candidates) {
      const count = await candidate.count();
      for (let i = 0; i < count; i++) {
        const item = candidate.nth(i);
        if (!(await item.isVisible().catch(() => false))) continue;
        if (!excludePattern) return item;

        const clickable = item
          .locator('xpath=ancestor-or-self::button[1] | ancestor-or-self::*[@role="button"][1]')
          .first();
        const target = (await clickable.count()) > 0 ? clickable : item;
        const text = await target.innerText().catch(() => '');
        if (!excludePattern.test(text)) return item;
      }
    }
    return null;
  }

  /** The dropdown trigger's accessible name mirrors its currently selected value (the `title`
   *  attribute) rather than a fixed label. */
  statusDropdownTrigger(currentStatusText) {
    return this.page.getByTitle(currentStatusText);
  }

  async findStatusComboboxFallback(modal) {
    const candidates = [
      modal.getByRole('combobox', { name: /status/i }),
      modal.locator('[role="combobox"]').filter({ hasText: /status/i }),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  async selectStatus(statusValue) {
    let trigger = this.statusDropdownTrigger('Pending Review');
    const triggerVisible = await trigger.isVisible().catch(() => false);
    if (!triggerVisible) {
      trigger = await this.findStatusComboboxFallback(this.editRecordModal);
    }
    if (!trigger) {
      throw new Error('Status dropdown could not be located in the Edit Record modal.');
    }
    await trigger.click();
    await this.page.waitForTimeout(300);
    const option = this.statusOptionInDropdown(statusValue);
    await option.waitFor({ state: 'visible', timeout: 30000 });
    await option.click();
  }

  // --- Customer Download tab (new browser tab, not this.page) ---

  releaseToCustomerButton(page) {
    return page.getByRole('button', { name: 'Release to Customer', exact: true });
  }

  addRowButton(page) {
    return page.getByRole('button', { name: /Add Row/i });
  }

  newRowOption(page, value) {
    return page.getByText(value, { exact: true });
  }

  generateAndDownloadButton(page) {
    return page.getByRole('button', { name: /Generate\s*&\s*Download/i });
  }

  saveChangesButton(page) {
    return page.getByRole('button', { name: /Save Changes/i });
  }

  async commentsCellForRow(page, row) {
    const headers = page.locator('table thead th');
    const headerCount = await headers.count();
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).innerText().catch(() => '');
      if (/comments?/i.test(text.trim())) {
        return row.locator('td').nth(i);
      }
    }
    return null;
  }

  /** Clicking the bare cell only selects it - the per-cell hover-revealed "edit" icon must be
   *  clicked to actually enter edit mode. */
  async editCommentsCell(page, commentsCell, commentText) {
    await commentsCell.scrollIntoViewIfNeeded().catch(() => {});
    await commentsCell.hover();
    await page.waitForTimeout(300);

    const editIcon = commentsCell.locator('[aria-label="edit"]').first();
    if ((await editIcon.count()) > 0) {
      await editIcon.click({ force: true });
    } else {
      await commentsCell.click();
    }
    await page.waitForTimeout(300);

    const candidates = [commentsCell.locator('input, textarea'), page.locator('.ant-popover:visible input, .ant-popover:visible textarea')];
    let input = null;
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
        input = c.first();
        break;
      }
    }
    if (!input) {
      throw new Error('Comments cell did not become editable after clicking its edit icon.');
    }
    await input.fill(commentText);

    const saveButton = this.saveChangesButton(page);
    await saveButton.waitFor({ state: 'visible', timeout: 30000 });
    await saveButton.click();
    await page.waitForTimeout(3000);
  }

  // --- Archive / Unarchive ---

  async unarchiveFirstRow() {
    const row = await this.firstResultRow();
    if (!row) {
      throw new Error('No rows found in the archives table.');
    }
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    await this.page.waitForTimeout(300);

    const actionsCell = row.locator('td').last();
    await actionsCell.click({ timeout: 10000 });

    const unarchiveButton = this.page.getByRole('button', { name: 'Unarchive', exact: true });
    await unarchiveButton.waitFor({ state: 'visible', timeout: 30000 });
    await unarchiveButton.click();
  }
}

module.exports = DocumentControlPage;
