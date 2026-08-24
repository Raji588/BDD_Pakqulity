const BasePage = require('./BasePage');

/**
 * Ported from a separate Pakquality automation project (own POM structure, restructured here to
 * follow this suite's conventions) - reached directly from the sidebar, like Change Recording and
 * Requests, not composed onto CampaignExecutionPage.
 *
 * Confirmed live in the source project (Playwright codegen):
 *
 *   await page.getByRole('link', { name: 'User Roles' }).click();
 *   await page.getByRole('button', { name: 'Create Role' }).click();
 *   await page.getByRole('textbox', { name: 'Role Name *' }).fill('Test role');
 *   await page.getByRole('button', { name: 'Read' }).first().click();
 *   await page.getByLabel('Create Role').getByRole('button', { name: 'Create Role' }).click();
 *   await page.getByRole('button').filter({ hasText: /^$/ }).nth(4).click();
 *   await page.getByRole('checkbox', { name: 'Select All' }).check();
 *   await page.getByRole('button', { name: 'Update' }).click();
 *   await page.getByRole('button', { description: 'Delete', exact: true }).click();
 *   await page.getByRole('button', { name: 'Delete' }).click();
 *
 * Key findings, all verified live against the real app:
 * - Side panel entry is a link named "User Roles" (plural).
 * - The "Create Role" popup's accessible label is "Create Role" - the SAME text as the
 *   page-level button that opens it, so the modal's own submit button must stay scoped to the
 *   modal (getByLabel) rather than matched page-wide, or it risks resolving to the
 *   still-visible-but-covered button behind the modal.
 * - The "Read" permission button for the first ("User") row was matched with a bare `.first()`
 *   in the recording - no row-scoping was captured. Scoped by row text where possible here,
 *   falling back to that same positional behavior.
 * - The Edit icon has no confirmed description/data-icon - the recording resolved it purely
 *   positionally, page-wide. Tries the description/data-icon strategies first (same convention
 *   as every other action-icon in this suite), with the recorded position - scoped to the role's
 *   own row instead of the whole page - as the fallback.
 * - The Delete icon DOES have an accessible description of "Delete", same convention as
 *   findRowActionIcon() elsewhere in this suite.
 * - No title text was ever confirmed for the Edit Role modal or the delete confirmation modal -
 *   openModal targets whichever ant-modal is currently open, same fallback used throughout this
 *   suite (e.g. CoreConfigurationPage's equivalent modals).
 */
class UserRolePage extends BasePage {
  constructor(page) {
    super(page);

    this.navLink = page.getByRole('link', { name: 'User Roles' });
    this.pageTitle = page.getByRole('heading', { name: 'User Roles' });

    this.createRoleModal = page.getByLabel('Create Role');
    this.createRoleSubmitButton = this.createRoleModal.getByRole('button', { name: 'Create Role' });

    this.selectAllCheckbox = page.getByRole('checkbox', { name: 'Select All' });

    // No title text was ever confirmed for the Edit Role modal or the delete confirmation modal -
    // targets whichever ant-modal is currently open.
    this.openModal = page.locator('.ant-modal:visible').last();
  }

  async open() {
    await this.navLink.click();
  }

  /** Generic click for this page's plain, non-icon-prefixed named buttons ("Create Role"/
   *  "Update"/"Delete") - shared via the "the user clicks the {string} button" step in
   *  requests.steps.js, gated on this page being the active one. NOT used for the modal's own
   *  "Create Role" submit button (see createRoleSubmitButton - that one must stay scoped to the
   *  modal). */
  async clickNamedButton(buttonName) {
    const button = this.page.getByRole('button', { name: buttonName, exact: true });
    await button.waitFor({ state: 'visible', timeout: 30000 });
    await button.click();
  }

  // Scoped to the modal, not the page - the page's own role-search box can also match a loose
  // page-wide "Role Name" name/placeholder lookup, and (being CSS-visible even though obscured
  // behind the modal overlay) can silently receive the fill() intended for the modal's field.
  roleNameInputCandidates() {
    return [this.createRoleModal.getByRole('textbox', { name: /Role Name/i }), this.createRoleModal.locator('input[placeholder*="Role Name" i]')];
  }

  readPermissionButtonCandidates(rowName) {
    return [
      this.page.locator('tr, [role="row"]').filter({ hasText: rowName }).getByRole('button', { name: 'Read' }),
      this.page.getByRole('button', { name: 'Read' }).first(),
    ];
  }

  async findVisible(candidates) {
    for (const c of candidates) {
      if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) return c.first();
    }
    return null;
  }

  roleRow(roleName) {
    return this.page.locator('table tr').filter({ hasText: roleName }).first();
  }

  /** position is zero-indexed: 1 = 2nd icon/Edit, 2 = 3rd icon/Delete. */
  async findRowActionIcon(row, iconName, position) {
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    await this.page.waitForTimeout(300);

    const actionsCellButtons = row.locator('td:last-child button, td:last-child [role="button"]');
    const candidates = [
      row.getByRole('button', { description: iconName, exact: true }),
      row.locator(`svg[data-icon="${iconName.toLowerCase()}" i], .anticon-${iconName.toLowerCase()}`),
      row.locator(`[aria-label="${iconName}" i], [title="${iconName}" i]`),
      actionsCellButtons.nth(position),
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
}

module.exports = UserRolePage;
