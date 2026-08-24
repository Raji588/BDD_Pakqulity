/**
 * Cross-feature campaign state - document_control.feature (ported from a separate project)
 * needs to know the Campaign ID entered by campaign_execution.feature's "the user fills in the
 * batch details" step, so it can search for that exact campaign. Cucumber gives each scenario a
 * fresh World, and this crosses FEATURE FILES (not just scenarios), so it's tracked here at
 * module scope instead - persists for the lifetime of a single cucumber-js run. Same pattern as
 * the module-scoped "last created protocol name" already used within single step files (e.g.
 * cip_protocol_creation.steps.js), just promoted to its own shared module since two different
 * step files need to read/write it.
 */

let lastCampaignId = null;

function setLastCampaignId(campaignId) {
  lastCampaignId = campaignId;
}

function getLastCampaignId() {
  return lastCampaignId;
}

module.exports = { setLastCampaignId, getLastCampaignId };
