/**
 * Prints every scenario and step to the terminal as it runs (instead of only at the end), then the
 * normal failures + totals summary. Works for plain `npm test` and for each shard of
 * `npm run test:parallel` (whose runner prefixes every line with "[shard N]").
 */
const { SummaryFormatter } = require('@cucumber/cucumber');

const ICONS = {
  PASSED: '✔',
  FAILED: '✖',
  SKIPPED: '-',
  PENDING: '?',
  UNDEFINED: '?',
  AMBIGUOUS: '✖',
  UNKNOWN: '?',
};

function seconds(duration) {
  if (!duration) return '0.0s';
  return `${(Number(duration.seconds) + duration.nanos / 1e9).toFixed(1)}s`;
}

class LiveFormatter extends SummaryFormatter {
  static documentation = 'Prints each scenario and step live, then a summary.';

  constructor(options) {
    super(options);
    options.eventBroadcaster.on('envelope', (envelope) => {
      if (envelope.testCaseStarted) this.onScenarioStarted(envelope.testCaseStarted);
      else if (envelope.testStepFinished) this.onStepFinished(envelope.testStepFinished);
      else if (envelope.testCaseFinished) this.onScenarioFinished(envelope.testCaseFinished);
    });
  }

  attempt(testCaseStartedId) {
    return this.eventDataCollector.getTestCaseAttempt(testCaseStartedId);
  }

  onScenarioStarted({ id }) {
    const { pickle } = this.attempt(id);
    this.log(`\n▶ ${pickle.name}  (${pickle.uri.replace(/\\/g, '/')})\n`);
  }

  onStepFinished({ testCaseStartedId, testStepId, testStepResult }) {
    const { pickle, testCase } = this.attempt(testCaseStartedId);
    const testStep = testCase.testSteps.find((s) => s.id === testStepId);
    const { status } = testStepResult;
    const color = this.colorFns.forStatus(status);

    let text;
    if (testStep.pickleStepId) {
      text = pickle.steps.find((s) => s.id === testStep.pickleStepId).text;
    } else if (status === 'FAILED') {
      text = 'Hook'; // hooks are only worth a line when they fail
    } else {
      return;
    }

    this.log(color(`    ${ICONS[status] || '?'} ${text}  (${seconds(testStepResult.duration)})`) + '\n');
    if (status === 'FAILED' && testStepResult.message) {
      const firstLine = testStepResult.message.split('\n').find((line) => line.trim()) || '';
      this.log(color(`      ${firstLine.trim()}`) + '\n');
    }
  }

  onScenarioFinished({ testCaseStartedId, willBeRetried }) {
    const { pickle, worstTestStepResult } = this.attempt(testCaseStartedId);
    const { status } = worstTestStepResult;
    const label = willBeRetried ? 'RETRYING' : status;
    const color = this.colorFns.forStatus(status);
    this.log(color(`${ICONS[status] || '?'} ${label}: ${pickle.name}`) + '\n');
  }
}

module.exports = LiveFormatter;
