const KeywordDetector = require('../classes/KeywordDetector');
const LinkDetector = require('../classes/LinkDetector');
const FlagAssigner = require('../classes/FlagAssigner');

const keywordDetector = new KeywordDetector();
const linkDetector = new LinkDetector();
const flagAssigner = new FlagAssigner();

/**
 * Check a comment entity for fraud indicators
 * Scans: content for spam, phishing, hate_speech keywords and links
 */
const check = async (body) => {
  const { content } = body;
  const results = [];

  // Step 1 — Keyword Detector: scan content
  const keywordCategories = ['spam', 'phishing', 'hate_speech'];
  let keywordResult = { flagged: false, matchedKeywords: [], confidence: 0, severity: 'none', checks: [] };

  for (const category of keywordCategories) {
    const scanResult = keywordDetector.scan(content || '', category);
    if (scanResult.flagged) {
      keywordResult = {
        flagged: true,
        reason: `Suspicious ${category} content detected in comment`,
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

  // Step 2 — Link Detector: extract URLs from content
  const urls = linkDetector.extractURLs(content || '');
  const urlResult = await linkDetector.evaluateAllURLs(urls);
  results.push(urlResult);

  // Step 3 — Flag Assigner
  return flagAssigner.assign(results);
};

module.exports = { check };
