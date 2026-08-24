const BaseComponent = require('./BaseComponent');

class NavbarComponent extends BaseComponent {
  constructor(page) {
    super(page);
    this.logoutButton = page.getByRole('button', { name: /logout/i });
  }

  async logout() {
    await this.logoutButton.click();
  }
}

module.exports = NavbarComponent;
