class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('load');
  }

  async title() {
    return this.page.title();
  }
}

module.exports = BasePage;
