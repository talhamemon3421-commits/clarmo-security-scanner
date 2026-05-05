const KeywordDetector = require('../classes/KeywordDetector');
const LinkDetector = require('../classes/LinkDetector');
const PriceAnomalyDetector = require('../classes/PriceAnomalyDetector');
const FlagAssigner = require('../classes/FlagAssigner');

const keywordDetector = new KeywordDetector();
const linkDetector = new LinkDetector();
const priceDetector = new PriceAnomalyDetector();
const flagAssigner = new FlagAssigner();

/**
 * Check a marketplace item for fraud indicators
 * Scans: title, description for keywords and links; price + category for anomaly
 */
const check = async (body) => {
  const { title, description, price, category } = body;
  const results = [];

  // Step 1 — Keyword Detector: scan title and description
  const textFields = [title, description].filter(f => f);
  const keywordCategories = ['spam', 'fraud'];
  let keywordResult = { flagged: false, matchedKeywords: [], confidence: 0, severity: 'none', checks: [] };

  for (const cat of keywordCategories) {
    const scanResult = keywordDetector.scanMultiple(textFields, cat);
    if (scanResult.flagged) {
      keywordResult = {
        flagged: true,
        reason: `Suspicious ${cat} keywords detected in marketplace listing`,
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

  // Step 2 — Link Detector: extract URLs from title and description
  const linkText = [title, description].filter(f => f).join(' ');
  const urls = linkDetector.extractURLs(linkText);
  const urlResult = await linkDetector.evaluateAllURLs(urls);
  results.push(urlResult);

  // Step 3 — Price Anomaly Detector
  const priceResult = priceDetector.checkPrice(price, category || 'general');
  results.push(priceResult);

  // Step 4 — Flag Assigner
  return flagAssigner.assign(results);
};

module.exports = { check };
