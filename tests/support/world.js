const { setWorldConstructor, World } = require('@cucumber/cucumber');

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.context = null;
    this.page = null;
  }
}

setWorldConstructor(CustomWorld);
