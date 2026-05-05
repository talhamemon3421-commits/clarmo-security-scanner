const KeywordDetector = require('../classes/KeywordDetector');
const LinkDetector = require('../classes/LinkDetector');
const FlagAssigner = require('../classes/FlagAssigner');

const keywordDetector = new KeywordDetector();
const linkDetector = new LinkDetector();
const flagAssigner = new FlagAssigner();

/**
 * Check a review entity for fraud indicators
 * Scans: comment for fake review patterns and links
 */
const check = async (body) => {
  const { comment } = body;
  const results = [];

  // Step 1 — Keyword Detector: scan comment for fake review patterns
  const keywordCategories = ['fake_review', 'spam'];
  let keywordResult = { flagged: false, matchedKeywords: [], confidence: 0, severity: 'none', checks: [] };

  for (const category of keywordCategories) {
    const scanResult = keywordDetector.scan(comment || '', category);
    if (scanResult.flagged) {
      keywordResult = {
        flagged: true,
        reason: `Fake or incentivized review pattern detected`,
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

  // Step 2 — Link Detector: extract URLs from comment
  const urls = linkDetector.extractURLs(comment || '');
  const urlResult = await linkDetector.evaluateAllURLs(urls);
  results.push(urlResult);

  // Step 3 — Flag Assigner
  return flagAssigner.assign(results);
};

module.exports = { check };
