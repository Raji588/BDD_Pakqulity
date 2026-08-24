const fs = require('fs');
const path = require('path');

// ============================================================
// TEST ATTRIBUTE NAME COUNTER
// ============================================================
//
// The app rejects duplicate test attribute names, and (unlike
// Batch ID in liquid_analysis.steps.js) an attribute name needs
// to stay readable/predictable rather than timestamp-based.
//
// This persists a running counter to disk (tests/support/
// attribute-counter.json) so "Ported Attribute 1", "Ported
// Attribute 2", ... keep incrementing across separate test runs,
// not just within a single run.
//
// Prefix deliberately distinct from "Auto Attribute" (used by a
// separate Pakquality automation project's own copy of this same
// mechanism, testing against the same shared dev environment/app) —
// confirmed via a live failure that "Auto Attribute 1" already
// existed (created by that other project ages ago) and the app
// rejects duplicate names. A different prefix guarantees no
// collision regardless of how either project's counter evolves,
// rather than trying to keep two independent counters numerically
// disjoint over time.
// ============================================================

const COUNTER_FILE = path.join(__dirname, 'attribute-counter.json');

function nextAttributeName(prefix = 'Ported Attribute') {

    let counter = 1;

    try {

        const raw = fs.readFileSync(COUNTER_FILE, 'utf8');
        const data = JSON.parse(raw);

        if (Number.isInteger(data.next) && data.next > 0) {
            counter = data.next;
        }

    } catch (error) {

        // File doesn't exist yet (first run) or is unreadable —
        // start the counter from 1.
    }

    fs.writeFileSync(
        COUNTER_FILE,
        JSON.stringify({ next: counter + 1 }, null, 2)
    );

    // Same shared, ever-incrementing sequence regardless of prefix —
    // e.g. "Auto Attribute 4" followed by "Edited Attribute 5" — so
    // names stay unique across both creation and edit scenarios.
    return `${prefix} ${counter}`;
}

module.exports = { nextAttributeName };
