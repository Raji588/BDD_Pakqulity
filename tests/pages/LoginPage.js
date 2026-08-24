const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.microsoftLoginButton = page.locator('.login-btn');
  }

  async open() {
    await this.goto('/login');
  }

  async startMicrosoftLogin() {
    await this.microsoftLoginButton.click();
  }
}

module.exports = LoginPage;
