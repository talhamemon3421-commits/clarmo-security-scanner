const KeywordDetector = require('../classes/KeywordDetector');
const LinkDetector = require('../classes/LinkDetector');
const FlagAssigner = require('../classes/FlagAssigner');

const keywordDetector = new KeywordDetector();
const linkDetector = new LinkDetector();
const flagAssigner = new FlagAssigner();

/**
 * Check a user entity for fraud indicators
 * Scans: name, bio, address for keywords; email, bio, address for links
 */
const check = async (body) => {
  const { name, email, bio, address } = body;
  const results = [];

  // Step 1 — Keyword Detector: scan name, bio, address
  const textFields = [name, bio, address].filter(f => f);
  const keywordCategories = ['spam', 'phishing', 'fraud'];
  let keywordResult = { flagged: false, matchedKeywords: [], confidence: 0, severity: 'none', checks: [] };

  for (const category of keywordCategories) {
    const scanResult = keywordDetector.scanMultiple(textFields, category);
    if (scanResult.flagged) {
      keywordResult = {
        flagged: true,
        reason: `Suspicious ${category} keywords detected in user profile`,
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

  // Step 2 — Link Detector: check email domain + extract URLs from bio, address
  const emailResult = linkDetector.checkDisposableEmail(email);
  const linkFields = [bio, address].filter(f => f).join(' ');
  const urls = linkDetector.extractURLs(linkFields);
  const urlResult = await linkDetector.evaluateAllURLs(urls);

  const linkResult = {
    flagged: emailResult.flagged || urlResult.flagged,
    reason: emailResult.flagged ? emailResult.reason : urlResult.reason,
    confidence: emailResult.flagged ? 0.85 : urlResult.confidence,
    severity: emailResult.flagged ? 'medium' : urlResult.severity,
    checks: [...emailResult.checks, ...urlResult.checks]
  };
  results.push(linkResult);

  // Step 3 — Flag Assigner
  return flagAssigner.assign(results);
};

module.exports = { check };
