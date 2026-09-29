/**
 * Runs the suite as several cucumber-js processes at once ("shards"), each handed whole feature
 * files. Cucumber's own `parallel` option can't be used here: it hands individual scenarios to
 * worker processes, but this suite passes state between scenarios through module variables
 * (e.g. cipProtocolName: create -> update -> delete) and across features (campaignState.js:
 * campaign_execution -> document_control), and that state doesn't survive across processes.
 * Keeping each feature (or chain of features) inside one process preserves it.
 *
 * Usage:  npm run test:parallel                      (WORKERS defaults to 3)
 *         WORKERS=4 npm run test:parallel
 *         npm run test:parallel -- --tags "@admin"   (extra args go to every shard)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Features that must run in this order inside the same process.
const CHAINS = [
  ['tests/features/dashboard/campaign_execution.feature', 'tests/features/document_control.feature'],
];

const workers = Math.max(1, Number(process.env.WORKERS || 3));
const extraArgs = process.argv.slice(2);

function findFeatures(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return findFeatures(full);
    return entry.name.endsWith('.feature') ? [full] : [];
  });
}

// Scenario count is a rough stand-in for runtime, used to balance the shards.
function weight(files) {
  return files.reduce(
    (sum, file) => sum + (fs.readFileSync(file, 'utf8').match(/^\s*Scenario( Outline)?:/gm) || []).length,
    0
  );
}

const chained = new Set(CHAINS.flat());
const units = [...CHAINS, ...findFeatures('tests/features').filter((f) => !chained.has(f)).map((f) => [f])]
  .map((files) => ({ files, weight: weight(files) }))
  .sort((a, b) => b.weight - a.weight);

// Greedy: give the next-heaviest unit to the currently lightest shard.
const shards = Array.from({ length: Math.min(workers, units.length) }, () => ({ files: [], weight: 0 }));
for (const unit of units) {
  const target = shards.reduce((min, s) => (s.weight < min.weight ? s : min));
  target.files.push(...unit.files);
  target.weight += unit.weight;
}

const cucumberBin = path.join(path.dirname(require.resolve('@cucumber/cucumber/package.json')), 'bin', 'cucumber.js');

function runShard(shard, index) {
  const id = index + 1;
  const prefix = `[shard ${id}] `;
  console.log(`${prefix}${shard.files.length} feature(s), ~${shard.weight} scenario(s):\n  ${shard.files.join('\n  ')}`);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cucumberBin, ...shard.files, ...extraArgs], {
      // Output is piped (not a TTY), so keep colors on explicitly when the real terminal supports them.
      env: { ...process.env, CUCUMBER_SHARD: String(id), ...(process.stdout.isTTY && { FORCE_COLOR: '1' }) },
    });
    const pipe = (stream, out) => {
      let buffered = '';
      stream.on('data', (chunk) => {
        buffered += chunk;
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop();
        for (const line of lines) out.write(prefix + line + '\n');
      });
      stream.on('end', () => buffered && out.write(prefix + buffered + '\n'));
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

(async () => {
  const start = Date.now();
  const codes = await Promise.all(shards.map(runShard));
  const minutes = ((Date.now() - start) / 60000).toFixed(1);
  codes.forEach((code, i) => console.log(`[shard ${i + 1}] ${code === 0 ? 'passed' : `FAILED (exit ${code})`}`));
  console.log(`All shards finished in ${minutes} min. Reports: test-results/shard-*/`);
  process.exit(codes.some((c) => c !== 0) ? 1 : 0);
})();
