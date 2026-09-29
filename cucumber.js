// When run through tests/run-parallel.js each shard gets its own CUCUMBER_SHARD id, so every
// shard writes its own HTML/JSON report instead of all processes clobbering the same file, and
// the live formatter's lines get prefixed with the shard id by the runner.
const shard = process.env.CUCUMBER_SHARD;
const reportDir = shard ? `test-results/shard-${shard}` : 'test-results';

module.exports = {
  default: {
    // Sharded runs pass their own feature files on the CLI, which cucumber-js would otherwise merge
    // with (not replace) these paths - making every shard run the whole suite.
    paths: shard ? [] : ['tests/features/**/*.feature'],

    require: [
      'tests/support/**/*.js',
      'tests/steps/**/*.js'
    ],

    format: [
      // Live scenario/step output in the terminal, then a summary
      './tests/formatters/live-formatter.js',

      // Existing Cucumber HTML report
      `html:${reportDir}/cucumber-report.html`,

      // Existing JSON report
      `json:${reportDir}/cucumber-report.json`,

      // Allure report - writes to resultsDir (uniquely named files, so all shards can share it).
      // The .log target just keeps it off stdout: cucumber-js lets only one formatter write to
      // the terminal, and without this Allure would hide the live output.
      `allure-cucumberjs/reporter:${reportDir}/allure-reporter.log`
    ],

    formatOptions: {
      snippetInterface: 'async-await',

      // Allure results directory
      resultsDir: 'allure-results'
    }
  }
};
