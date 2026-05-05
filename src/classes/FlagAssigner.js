class FlagAssigner {
  constructor() {
    this.severityOrder = ['none', 'low', 'medium', 'high', 'critical'];
  }

  /**
   * Assemble final response from all detector results
   * @param {object[]} results - Array of results from detector classes
   * @returns {{ isFlagged: boolean, flagReason: string|null, severity: string, moderationStatus: string, confidence: number, checks: string[] }}
   */
  assign(results) {
    const isFlagged = this.isFlagged(results);
    const flagReason = this.buildFlagReason(results);
    const severity = this.determineSeverity(results);
    const confidence = this.calculateFinalConfidence(results);
    const moderationStatus = this.determineModerationStatus(severity, confidence);
    const checks = this.buildChecksList(results);

    return {
      isFlagged,
      flagReason,
      severity: isFlagged ? severity : 'none',
      moderationStatus,
      confidence: isFlagged ? confidence : 0.97,
      checks
    };
  }

  /**
   * Check if any result is flagged
   * @param {object[]} results
   * @returns {boolean}
   */
  isFlagged(results) {
    for (const result of results) {
      if (result.flagged) return true;
    }
    return false;
  }

  /**
   * Build the flag reason from the highest-severity flagged result
   * @param {object[]} results
   * @returns {string|null}
   */
  buildFlagReason(results) {
    const flaggedResults = results.filter(r => r.flagged);
    if (flaggedResults.length === 0) return null;

    // Sort by severity (highest first)
    flaggedResults.sort((a, b) => {
      const aIdx = this.severityOrder.indexOf(a.severity || 'none');
      const bIdx = this.severityOrder.indexOf(b.severity || 'none');
      return bIdx - aIdx;
    });

    return flaggedResults[0].reason || null;
  }

  /**
   * Determine the highest severity across all results
   * @param {object[]} results
   * @returns {string}
   */
  determineSeverity(results) {
    let highestIdx = 0;

    for (const result of results) {
      if (!result.flagged) continue;
      const idx = this.severityOrder.indexOf(result.severity || 'none');
      if (idx > highestIdx) highestIdx = idx;
    }

    return this.severityOrder[highestIdx];
  }

  /**
   * Determine moderation status based on severity and confidence
   * @param {string} severity
   * @param {number} confidence
   * @returns {string}
   */
  determineModerationStatus(severity, confidence) {
    if (severity === 'critical' && confidence >= 0.95) return 'auto_removed';
    if (severity === 'high' || severity === 'medium') return 'pending_review';
    if (severity === 'low') return 'pending_review';
    return 'approved';
  }

  /**
   * Return the highest confidence score among all results
   * @param {object[]} results
   * @returns {number}
   */
  calculateFinalConfidence(results) {
    let maxConfidence = 0;
    for (const result of results) {
      if (result.confidence && result.confidence > maxConfidence) {
        maxConfidence = result.confidence;
      }
    }
    return maxConfidence;
  }

  /**
   * Flatten all check names from all results into one array
   * @param {object[]} results
   * @returns {string[]}
   */
  buildChecksList(results) {
    const checks = [];
    for (const result of results) {
      if (result.checks && Array.isArray(result.checks)) {
        for (const check of result.checks) {
          if (!checks.includes(check)) {
            checks.push(check);
          }
        }
      }
    }
    return checks;
  }
}

module.exports = FlagAssigner;
