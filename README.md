# PAKQuality_Dev

Playwright + Cucumber BDD test framework in JavaScript, using the Page Object Model (POM) and
Component Object Model (COM) patterns, with the base URL supplied via environment variable and
session handling via Playwright storage state.

Target app: [PakQuality](https://dev.pakquality.drinkpak.com/), which authenticates via
**Microsoft SSO only** (no username/password form) — see the login flow note below.

## Structure

```
components/               # COM - reusable UI fragments, scoped to a root selector
  BaseComponent.js
  NavbarComponent.js         # used inside CampaignExecutionPage
config/
  config.js                 # reads BASE_URL, HEADLESS, SLOW_MO, STORAGE_STATE_PATH from .env
tests/
  features/
    dashboard/                # feature files for the Dashboard/campaign-execution area
      campaign_execution.feature # Dashboard scenario + Liquid Analysis campaign scenarios (shared Background)
      alerts.feature             # repeated-failure escalation scenarios (independent - see below)
    execution_configuration/  # feature files for the app's "Execution Configuration" tab group
      liquid_analysis_protocol_creation.feature # Liquid analysis protocol creation scenario (independent - see below)
      cip_protocol_creation.feature # CIP protocol creation/update/delete scenarios (independent - see below)
      bulk_offload_protocol_creation.feature # Bulk Offload protocol creation/update/delete scenarios (independent - see below)
      water_quality_protocol_creation.feature # Water Quality protocol creation/update/delete scenarios (independent - see below)
      test_protocol_management.feature # Test Protocol tab navigation/table/actions scenarios (independent - see below)
    change_recording.feature  # Change Recording status-filter scenarios (independent - see below)
    requests.feature          # Requests search/filter/reset/view scenarios (independent - see below)
  pages/                    # POM
    BasePage.js                # goto/waitForLoad helpers
    dashboard/                # page objects mirroring features/dashboard/
      CampaignExecutionPage.js   # composes NavbarComponent + LiquidAnalysisPage (defined in the same file)
      AlertsPage.js               # composes CampaignExecutionPage's LiquidAnalysisPage rather than
                                   # duplicating its primitives - see below
    execution_configuration/  # page objects mirroring features/execution_configuration/
      LiquidAnalysisProtocolCreationPage.js # composed onto CampaignExecutionPage as `.protocolCreation`
      CipProtocolCreationPage.js  # composed onto CampaignExecutionPage as `.cipProtocolCreation`
      BulkOffloadProtocolCreationPage.js # composed onto CampaignExecutionPage as `.bulkOffloadProtocolCreation`
      WaterQualityProtocolCreationPage.js # composed onto CampaignExecutionPage as `.waterQualityProtocolCreation`
      TestProtocolManagementPage.js # standalone within execution_configuration/ - see below
    ChangeRecordingPage.js      # standalone - reached via the sidebar, not composed onto CampaignExecutionPage
    RequestsPage.js             # standalone - reached via the sidebar, not composed onto CampaignExecutionPage
  steps/
    dashboard/                 # step files mirroring features/dashboard/
      campaign_execution.steps.js # login/dashboard/liquid-analysis steps
      alerts.steps.js            # filler-failure-handling steps
    execution_configuration/  # step files mirroring features/execution_configuration/
      liquid_analysis_protocol_creation.steps.js # liquid-analysis-protocol-creation steps
      cip_protocol_creation.steps.js # cip-protocol-creation steps; also owns the shared "the user
                                 # confirms the deletion" step (also used by Test Protocol
                                 # Management - see note below)
      bulk_offload_protocol_creation.steps.js # bulk-offload-protocol-creation steps
      water_quality_protocol_creation.steps.js # water-quality-protocol-creation steps
      test_protocol_management.steps.js # test-protocol-management steps
    change_recording.steps.js  # change-recording steps; also owns the shared "the user navigates
                                 # to the {string} page" step (Change Recording + Requests both
                                 # use it - see note below)
    requests.steps.js          # requests steps; also owns the shared "the user clicks the
                                 # {string} button" step (Requests + Test Protocol Management both
                                 # use it - see note below)
  storageStates/            # saved session JSON from "npm run login" - gitignored
  support/
    world.js                  # CustomWorld - carries `page`/`context` into every step
    hooks.js                   # Before/After hooks - creates a browser context per scenario,
                                 # loading storageState unless the scenario is tagged @noauth
  global-setup.js           # one-time interactive login (npm run login) that saves storage state
cucumber.js                # Cucumber profile (paths, require globs, formatters)
.env.example               # copy to .env and fill in
```

## Setup

```
npm install
npx playwright install chromium   # or: npm run install:browsers
cp .env.example .env
```

Edit `.env`:

| Variable             | Purpose                                                              |
|----------------------|------------------------------------------------------------------------|
| `BASE_URL`           | Base URL every `page.goto('/path')` call resolves against             |
| `HEADLESS`           | `true`/`false` (ignored by `npm run login`, see below)                |
| `SLOW_MO`             | Milliseconds to slow down each browser action (0 = full speed)        |
| `STORAGE_STATE_PATH` | Where the logged-in session (cookies/localStorage) is cached          |

## Signing in (Microsoft SSO)

The app only offers "Login with Microsoft" — there's no form to fill in automatically, and
scripting Microsoft's login (email/password/MFA) is fragile and not attempted here. Instead,
you sign in **once by hand** and the framework reuses that session:

```
npm run login
```

This always opens a **headed** browser (regardless of `HEADLESS`) and clicks "Login with
Microsoft" for you. Complete the Microsoft sign-in (and MFA, if prompted) yourself in that
window. Once you land back on the PakQuality app, click **Resume** in the Playwright Inspector
that popped up — `tests/global-setup.js` then saves the session to `STORAGE_STATE_PATH`
(`tests/storageStates/user.json` by default).

Re-run `npm run login` whenever the saved session expires (tests will fail with a clear
"No saved session found" error if `STORAGE_STATE_PATH` is missing).

## Running tests

Run the whole suite:

```
npm test
```

**Run one scenario by tag** — this is the reliable way to isolate a single scenario, since it
works the same regardless of how you invoke cucumber-js (plain CLI, an npm script, an editor's
"run" button, etc.) rather than depending on exactly which file path gets passed through:

```
npm run test:tags -- "@protocolCreation"
npm run test:tags -- "@dashboard"
npm run test:tags -- "@liquidAnalysis"
npm run test:tags -- "@cipProtocolCreation or @cipProtocolUpdate or @cipProtocolDelete"
npm run test:tags -- "@bulkOffloadProtocolCreation or @bulkOffloadProtocolUpdate or @bulkOffloadProtocolDelete"
npm run test:tags -- "@waterQualityProtocolCreation or @waterQualityProtocolUpdate or @waterQualityProtocolDelete"
npm run test:tags -- "@changeRecording or @changeRecordingSearch or @changeRecordingFilter or @changeRecordingClear"
npm run test:tags -- "@requests or @requestSearch or @requestFilter or @requestStatus or @requestDateFilter or @requestReset or @requestView"
npm run test:tags -- "@testProtocolManagement and not @testProtocolDelete"   # see caveat below - @testProtocolDelete is destructive
npm run test:tags -- "@fillerFailureNotification or @fillerFailureSpecChangeRequest or @fillerFailurePause"
```

Every scenario has a unique tag for this purpose - check the top of each `Scenario:` in
`tests/features/*.feature` for its tag if you add a new one.

(Passing a specific `.feature` file path to `npx cucumber-js` looks like it should isolate it too,
but cucumber-js merges the CLI path with `cucumber.js`'s configured `paths` rather than letting it
override — so it silently still runs everything. Use tags instead.)

Every scenario gets a fresh browser context pre-loaded with the storage state saved by
`npm run login`, so scenarios don't need to sign in individually.

To run a scenario **without** the saved session, tag it `@noauth` — `tests/support/hooks.js`
skips attaching storage state for those scenarios.

Reports are written to `test-results/cucumber-report.html` and `test-results/cucumber-report.json`.

## Notes on the current scenarios

- **Liquid Analysis** (`campaign_execution.feature`): results are entered generically against whichever
  test each filler's "Add Test" dropdown offers, not specific test names — the available tests
  depend on the formula's protocol. Round-advancement ("Next Round") is intentionally out of
  scope. An out-of-spec value can open a "Spec Change Request" dialog (which would email Quality
  Team Leads if confirmed); it's always dismissed automatically rather than ever confirmed.
- **Liquid analysis protocol creation** (`liquid_analysis_protocol_creation.feature`): runs independently of the Dashboard
  scenario (reached via the sidebar, not the dashboard page itself). Rebuilt from real Playwright
  codegen output, so most dropdown selections match by visible option text (e.g. "pH", "Bounds"),
  not position. Two exceptions preserved as recorded: the first attribute row's frequency (matched
  by title, not text) and the third row's frequency (a raw CSS fallback codegen itself produced).
  Twelve test attribute rows are created (pH, Sorbic Acid, Can Code, TA, Brix, Density, Caffeine,
  CO2, Citric Acid, Benzoic Acid, Fill Volume, Gluten - alternating Bounds/Record passing
  criteria), and the Test Attribute names assume those specific attributes exist in the shared dev
  environment's seed data, which drifts over time - if one isn't available when you run this, that
  step will fail; swap it for whatever's currently offered. The protocol name is suffixed with a
  timestamp per run since the app rejects duplicate names.
- Both flows append a per-run unique suffix to IDs/names that the app treats as unique
  (batch ID, campaign ID, protocol name) so repeat runs don't collide with earlier test data.
- **CIP Protocol Creation** (`cip_protocol_creation.feature`): CIP Protocol is a tab inside
  Execution Configuration (alongside Test Protocol, Bulk Offload Protocol, Water Quality Protocol),
  not a separate Configuration menu link - and its form (Protocol Name/Status, then repeatable
  Sections each with their own repeatable Test Attributes) is structurally different from the Test
  Protocol form, despite similar naming. The create scenario adds multiple sections, each with
  multiple test attributes; since Test Attribute names are seed data that drifts (same caveat as
  Protocol Creation), each row is selected by stable dropdown position (via keyboard navigation)
  rather than by name, with a running index kept across sections so every row in the protocol gets
  a distinct attribute. That step is given its own longer Cucumber timeout
  (`cip_protocol_creation.steps.js`) since filling many rows through the real UI can run past the
  suite's default 180s step timeout. The later scenarios refer to "the created CIP protocol" rather
  than a literal name, so the step file threads the name created in the first scenario through a
  module-scoped variable and assumes scenarios run in file order (create → update → delete).
- **Bulk Offload Protocol Creation** (`bulk_offload_protocol_creation.feature`): Bulk Offload
  Protocol is another tab inside Execution Configuration, and its "Add New Bulk Offload Protocol"
  form is - verified live - the exact same shared component CIP Protocol Creation uses (identical
  field ids, list columns, row action order, and delete-dialog structure; only the "CIP"/"Bulk
  Offload" labels differ), so `BulkOffloadProtocolCreationPage.js` mirrors
  `CipProtocolCreationPage.js`'s structure and locator strategy exactly. Because Cucumber's step
  registry is global across every `*.steps.js` file, several step phrases that would otherwise be
  identical to CIP Protocol Creation's (e.g. "the user adds the following sections", "the user
  saves the changes") are worded distinctly here ("the user adds the following Bulk Offload
  sections", "the user saves the Bulk Offload changes", etc.) specifically to avoid colliding with
  CIP's step definitions - reuse that phrasing pattern if you add another protocol type built on
  this same shared form.
- **Water Quality Protocol Creation** (`water_quality_protocol_creation.feature`): Water Quality
  Protocol is the fourth tab inside Execution Configuration, but - verified live, don't assume
  every protocol tab shares CIP's form - its "Add New Water Quality Protocol" form is a different
  shape: no "Sections" concept at all (Basic Information followed directly by a flat "Test
  Attributes" list, field ids `testAttributes_N_*` rather than CIP's nested
  `sections_X_testAttributes_Y_*`), an extra required Facility field, no Frequency column on each
  row, and the list's Actions column has only edit/delete (no copy). Facility also affects
  visibility, not just data: a protocol saved under a Facility other than the session's active one
  doesn't show up when this session searches the list afterward - found live by picking the wrong
  one first and having a "successfully created" protocol seem to vanish. The create scenario
  selects Facility "DP01" to match the session this suite logs in as; if `npm run login` is ever
  run against a different facility account, update that literal in
  `water_quality_protocol_creation.feature` to match. Same Cucumber-step-registry collision
  concern as Bulk Offload Protocol Creation applies here too, so step phrases are worded distinctly
  ("the user saves the Water Quality changes", etc.).
- **Change Recording** (`change_recording.feature`): reached directly via a top-level sidebar
  link (`/change-recording`), not nested under Execution Configuration like the protocol pages -
  `ChangeRecordingPage` is standalone rather than composed onto `CampaignExecutionPage`. The status filter
  (an Ant Select) is scoped via `main .ant-select` rather than its placeholder text, since AntD
  updates that text to whatever status is selected - the facility select in the navbar (DP01/DP02)
  also renders as a plain `.ant-select-selector` but sits outside `<main>`, so scoping by that
  container reliably isolates the one on the page itself. The select's clear ("x") icon only
  mounts in the DOM once the select is hovered - verified live. `selectStatus()` opens the
  dropdown itself if it isn't already open, since one scenario selects a status without a
  preceding explicit "open the filter" step, and waits after selecting - unlike the search box
  and clear actions (which already had a settle wait), status selection didn't, and the table can
  still show a transient "No data" state at the moment a filter's Then step reads it otherwise.
- **Requests** (`requests.feature`): also a top-level sidebar link (`/requests`), not composed
  onto `CampaignExecutionPage`. Its "Filters" panel (Request ID/Campaign/Test Attribute/From Date/To
  Date/Status) is collapsed by default and no scenario has a separate "open the Filters panel"
  step, so `RequestsPage.open()` expands it as part of navigating here. Request ID/Campaign/Test
  Attribute are AntD AutoComplete fields, not plain text inputs or plain selects - verified live,
  typing alone doesn't apply as a filter; the typed text must be confirmed by clicking its
  matching suggestion in the dropdown, or clicking "Filter" leaves the list unchanged.
  `fillAutocompleteFilter()` handles that click-to-confirm step. The date-range scenario only
  checks that both date inputs got a value rather than asserting specific rows come back -
  verified live, a same-day From/To range can genuinely return "No data" (request timestamps vs.
  the date picker's day boundary don't always align), so asserting an exact row count would be
  flaky. Reuses Change Recording's `the user navigates to the "{string}" page` step (see
  `change_recording.steps.js`) rather than redefining it, since Cucumber's step registry is
  global and a second identical phrase would collide instead of adding a new step - extend that
  shared step (not this file) if a future page needs the same "navigate via sidebar link" step
  text. The "View" action in the Actions column is a plain `<a>` link (`role=link`), not a
  button - despite looking like one - and opens the request detail in a dialog on the same URL
  rather than navigating to a new route.
- **Test Protocol Management** (`test_protocol_management.feature`): covers the Test Protocol
  tab's general page chrome (tabs, table columns, search, Filters panel, row actions) - separate
  from `liquid_analysis_protocol_creation.feature`, which owns the create/update/delete-by-name
  flow, even though both land on the same `/configuration/protocol` page. All four row actions
  (edit/copy/history/delete) are icon-only buttons with no accessible name (only an
  `aria-describedby` pointing at a tooltip, which contributes to accessible *description*, not
  *name*) - verified live, so they're targeted by fixed position in the Actions cell instead of
  `getByRole('button', {name: ...})`. The copy action does **not** create a duplicate row
  immediately - it navigates to the create form pre-filled from the source protocol (visible via
  `duplicateFrom` in the URL, and a distinct "Duplicate Test Protocol" title, not "Add Test
  Protocol") - the row only appears once Save Protocol is clicked, which the duplicate scenario
  does after appending a per-run unique suffix to the name (saving under the exact original name
  hits the same "name already taken" block documented for the plain create flow). The Filters
  panel's expand/collapse toggle only responds to clicking the chevron *button* itself - unlike
  the equivalent-looking "Filters" text on the Requests page, clicking the "Filters" text label
  here does nothing; verified live via the panel's fields (and the chevron's icon class) not
  changing when only the label was clicked. Reuses two shared steps from other files rather than
  redefining them (Cucumber's step registry is global, so a duplicate phrase would collide
  instead of adding a new step): `the user clicks the "{string}" button` (owned by
  `requests.steps.js`, extended for "New Test Protocol") and `the user confirms the deletion`
  (owned by `cip_protocol_creation.steps.js`, extended to branch on which page object is present
  in the scenario context) - extend those shared steps, not this file, if a future page needs the
  same phrasing.
  - **`@testProtocolDelete` is destructive against shared data**: unlike this suite's other
    delete scenarios (CIP/Bulk Offload/Water Quality/Liquid Analysis), which all delete a protocol
    the *same scenario chain created* moments earlier with a unique per-run suffix, this scenario
    deletes **"Bug_test"** - a real, manually-created fixture in the shared dev database that
    several other scenarios in this same feature reference by that fixed name (status, edit,
    duplicate, history). It's ordered last in the file so those others still find it, matching
    the create → update → delete file-order convention documented for CIP Protocol Creation - but
    running it for real permanently removes "Bug_test" from the shared environment for everyone,
    not just this test run. Treat `@testProtocolDelete` as opt-in: exclude it from routine runs
    (`... and not @testProtocolDelete`, as in the tag example above) and only run it deliberately.
- **Alerts** (`alerts.feature`): covers a repeated-failure
  escalation ladder discovered live on the Liquid Analysis "Add Test" flow (not the round-tab
  flow `campaign_execution.feature`'s campaign-execution scenario uses) - entering an out-of-spec reading
  against the same test/filler repeatedly behaves differently each time: the 1st and 2nd just save
  normally (generic "Test results saved successfully" toast, filler stays active); the 3rd opens a
  real "Spec Change Request" dialog ("Would you like to modify the spec?... sent to Quality Team
  Leads for review") - cancelled, never confirmed, same policy as every other Spec Change Request
  in this suite; the 4th pauses that filler (a "Resume Filler" button appears and its "Enter
  Value" input becomes `disabled`) while the other filler is unaffected. None of this was
  documented anywhere beforehand - it was found by brute-force testing repeated failures live
  before writing any code, the same "verified live" approach as every other page in this suite.
  Reuses the existing "HBC-3647" formula rather than creating a new protocol (this feature is
  about the failure behavior, not protocol-creation mechanics, already covered by
  `liquid_analysis_protocol_creation.feature`), so its Background needs the same login/dashboard
  steps every other feature's Background has (`the user is already logged in` /
  `the dashboard page is loaded`) even though the original scenario draft omitted them - forgetting
  those was the first bug found while building this out; every scenario failed immediately trying
  to click a button on a blank page. `AlertsPage` composes a `LiquidAnalysisPage`
  instance (see `CampaignExecutionPage.js`) rather than duplicating its batch-creation/result-entry
  primitives - `LiquidAnalysisPage.addResultReading()` (used throughout this suite to push
  straight past any Spec Change Request) isn't safe to reuse for the reading a scenario needs to
  *observe* the resulting dialog/toast/pause state from: its own dismiss-wait logic burns several
  seconds even when no dialog appears, which alone is enough to miss a toast that's already
  auto-dismissed by the time a step checks for it, and its unscoped `Cancel` button lookup left a
  Spec Change Request dialog stuck open in one case, blocking the next reading -
  `AlertsPage.enterReadingWithoutDismissing()` plus its `specChangeRequestDialog()`/
  `cancelSpecChangeRequest()` (scoped to the dialog itself) exist for exactly that. Pausing a
  filler also removes its "Add Test" button from the DOM entirely (rather than just disabling it),
  which shifts `LiquidAnalysisPage.westAddTestButton`'s hardcoded position index - checking the
  *other* filler stayed active after a pause uses `.last()` instead, since that fixed index is
  still correct everywhere else in this suite, where no filler is ever paused.

## Extending

- **New page**: add a class in `tests/pages/` extending `BasePage`.
- **New reusable UI fragment** (navbar, modal, table row, etc.): add a class in `components/`
  extending `BaseComponent`, scoped to a root selector, and compose it into whichever page(s) use it.
- **New scenario**: add a `.feature` file under `tests/features/` plus matching steps in `tests/steps/`,
  named to match (e.g. `foo.feature` + `foo.steps.js`).
- **Multiple user roles**: give each role its own `STORAGE_STATE_PATH` under `tests/storageStates/`
  (and run `npm run login` signed in as that role), then select the right file per scenario tag in
  `tests/support/hooks.js`.
