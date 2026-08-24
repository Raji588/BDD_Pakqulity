module.exports = {
  default: {
    paths: ['tests/features/**/*.feature'],
    require: ['tests/support/**/*.js', 'tests/steps/**/*.js'],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json'
    ],
    formatOptions: { snippetInterface: 'async-await' }
  }
};
