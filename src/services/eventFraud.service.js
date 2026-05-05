const KeywordDetector = require('../classes/KeywordDetector');
const LinkDetector = require('../classes/LinkDetector');
const FlagAssigner = require('../classes/FlagAssigner');

const keywordDetector = new KeywordDetector();
const linkDetector = new LinkDetector();
const flagAssigner = new FlagAssigner();

/**
 * Check an event entity for fraud indicators
 * Scans: title, description for scam/giveaway bait keywords and links
 */
const check = async (body) => {
  const { title, description } = body;
  const results = [];

  // Step 1 — Keyword Detector: scan title and description
  const textFields = [title, description].filter(f => f);
  const keywordCategories = ['spam', 'fraud', 'phishing'];
  let keywordResult = { flagged: false, matchedKeywords: [], confidence: 0, severity: 'none', checks: [] };

  for (const category of keywordCategories) {
    const scanResult = keywordDetector.scanMultiple(textFields, category);
    if (scanResult.flagged) {
      keywordResult = {
        flagged: true,
        reason: `Giveaway scam bait detected in event`,
        matchedKeywords: [...keywordResult.matchedKeywords, ...scanResult.matchedKeywords],
        confidence: Math.max(keywordResult.confidence, scanResult.confidence),
        severity: scanResult.severity,
        checks: [...keywordResult.checks, ...scanResult.checks]
      };
    } else {
      keywordResult.checks = [...keywordResult.checks, ...scanResult.checks];
    }
  }
  results.push(keywordResult);

  // Step 2 — Link Detector: extract URLs from description
  const urls = linkDetector.extractURLs(description || '');
  const urlResult = await linkDetector.evaluateAllURLs(urls);
  results.push(urlResult);

  // Step 3 — Flag Assigner
  return flagAssigner.assign(results);
};

module.exports = { check };
