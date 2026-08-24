class BaseComponent {
  /**
   * @param {import('playwright').Page} page
   * @param {string} [rootSelector] - selector scoping this component within the page; omit for components with no dedicated container element
   */
  constructor(page, rootSelector) {
    this.page = page;
    this.root = page.locator(rootSelector || 'body');
  }

  locator(selector) {
    return this.root.locator(selector);
  }

  async isVisible() {
    return this.root.isVisible();
  }
}

module.exports = BaseComponent;
