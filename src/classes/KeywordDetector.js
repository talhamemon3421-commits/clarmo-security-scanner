const fs = require('fs');
const path = require('path');

class KeywordDetector {
  constructor() {
    this.cache = {};
    this.leetMap = {
      '0': 'o',
      '1': 'i',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '7': 't',
      '@': 'a',
      '$': 's',
      '!': 'i',
      '(': 'c',
      '+': 't'
    };
  }

  /**
   * Scan a single text field for keywords in a given category
   * @param {string} text - The text to scan
   * @param {string} category - Category of keywords (spam, phishing, fraud, hate_speech, fake_review, panic_bait)
   * @returns {{ flagged: boolean, matchedKeywords: string[], category: string, confidence: number, severity: string, totalWords: number, checks: string[] }}
   */
  scan(text, category) {
    if (!text || typeof text !== 'string') {
      return {
        flagged: false,
        matchedKeywords: [],
        category,
        confidence: 0,
        severity: 'none',
        totalWords: 0,
        checks: [`${category}_keywords`]
      };
    }

    const keywordData = this.loadKeywordList(category);
    const keywords = keywordData.keywords || [];
    const cleanedText = this._cleanText(text);
    const normalizedText = this._normalizeLeet(cleanedText);
    const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    const matchedKeywords = [];

    for (const keyword of keywords) {
      const cleanKeyword = this._cleanText(keyword);

      // Exact phrase match
      if (normalizedText.includes(cleanKeyword)) {
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
        continue;
      }

      // Partial match — check individual words of the keyword against text words
      const keywordWords = cleanKeyword.split(/\s+/);
      if (keywordWords.length === 1) {
        const normalizedWords = words.map(w => this._normalizeLeet(w));
        for (const nw of normalizedWords) {
          if (nw.includes(cleanKeyword) || cleanKeyword.includes(nw)) {
            if (nw.length >= 3 && !matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
              break;
            }
          }
        }
      }
    }

    const flagged = matchedKeywords.length > 0;
    const confidence = this.calculateConfidence(matchedKeywords, totalWords);
    const severity = this.determineSeverity(matchedKeywords, category);

    return {
      flagged,
      matchedKeywords,
      category,
      confidence,
      severity,
      totalWords,
      checks: [`${category}_keywords`]
    };
  }

  /**
   * Scan multiple text fields for keywords
   * @param {string[]} fields - Array of text strings to scan
   * @param {string} category - Category of keywords
   * @returns {{ flagged: boolean, matchedKeywords: string[], fieldsAffected: number[], confidence: number, severity: string, checks: string[] }}
   */
  scanMultiple(fields, category) {
    const allMatchedKeywords = [];
    const fieldsAffected = [];
    let totalWords = 0;

    for (let i = 0; i < fields.length; i++) {
      const result = this.scan(fields[i], category);
      totalWords += result.totalWords;

      if (result.flagged) {
        fieldsAffected.push(i);
        for (const kw of result.matchedKeywords) {
          if (!allMatchedKeywords.includes(kw)) {
            allMatchedKeywords.push(kw);
          }
        }
      }
    }

    const flagged = allMatchedKeywords.length > 0;
    const confidence = this.calculateConfidence(allMatchedKeywords, totalWords);
    const severity = this.determineSeverity(allMatchedKeywords, category);

    return {
      flagged,
      matchedKeywords: allMatchedKeywords,
      fieldsAffected,
      confidence,
      severity,
      checks: [`${category}_keywords`]
    };
  }

  /**
   * Load the keyword list for a given category from disk
   * @param {string} category - Category name
   * @returns {{ keywords: string[], highSeverity: string[] }}
   */
  loadKeywordList(category) {
    if (this.cache[category]) {
      return this.cache[category];
    }

    const filePath = path.join(__dirname, '..', '..', 'data', 'keywords', `${category}.json`);

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.cache[category] = data;
      return data;
    } catch (error) {
      console.error(`Failed to load keyword list for category: ${category}`, error.message);
      return { keywords: [], highSeverity: [] };
    }
  }

  /**
   * Calculate confidence score based on matched keywords and total words
   * @param {string[]} matchedKeywords - Keywords that matched
   * @param {number} totalWords - Total words in the text
   * @returns {number} Confidence score between 0.0 and 1.0
   */
  calculateConfidence(matchedKeywords, totalWords) {
    if (matchedKeywords.length === 0) return 0;
    if (totalWords === 0) return 0;

    // Base confidence from ratio of matched keywords to total words
    const ratio = matchedKeywords.length / totalWords;

    // Scale: even a few matches in a short text should give decent confidence
    let confidence = Math.min(ratio * 3, 1.0);

    // Minimum confidence if anything matched
    if (matchedKeywords.length >= 1) {
      confidence = Math.max(confidence, 0.3);
    }
    if (matchedKeywords.length >= 3) {
      confidence = Math.max(confidence, 0.6);
    }
    if (matchedKeywords.length >= 5) {
      confidence = Math.max(confidence, 0.8);
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Determine severity based on matched keywords and category
   * @param {string[]} matchedKeywords - Keywords that matched
   * @param {string} category - Category name
   * @returns {string} Severity: "none", "low", "medium", "high", or "critical"
   */
  determineSeverity(matchedKeywords, category) {
    if (matchedKeywords.length === 0) return 'none';

    const keywordData = this.loadKeywordList(category);
    const highSeverityList = (keywordData.highSeverity || []).map(k => k.toLowerCase());

    let hasHighSeverity = false;
    for (const kw of matchedKeywords) {
      if (highSeverityList.includes(kw.toLowerCase())) {
        hasHighSeverity = true;
        break;
      }
    }

    if (hasHighSeverity && matchedKeywords.length >= 3) return 'critical';
    if (hasHighSeverity) return 'high';
    if (matchedKeywords.length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Clean text: lowercase, remove special characters except spaces
   * @param {string} text
   * @returns {string}
   */
  _cleanText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s@$!+()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize leet-speak characters to their letter equivalents
   * @param {string} text
   * @returns {string}
   */
  _normalizeLeet(text) {
    let normalized = '';
    for (const char of text) {
      normalized += this.leetMap[char] || char;
    }
    return normalized;
  }
}

module.exports = KeywordDetector;
