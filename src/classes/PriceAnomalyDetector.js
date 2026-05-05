const fs = require('fs');
const path = require('path');

class PriceAnomalyDetector {
  constructor() {
    this._baselines = null;
    this._baselinesPath = path.join(__dirname, '..', '..', 'data', 'pricing', 'baselines.json');
  }

  checkPrice(price, category) {
    if (price === undefined || price === null || category === undefined) {
      return { flagged: false, reason: null, expectedRange: null, confidence: 0, severity: 'none', checks: ['price_anomaly'] };
    }

    const baseline = this.getBaseline(category);
    if (!baseline) {
      return { flagged: false, reason: null, expectedRange: null, confidence: 0, severity: 'none', checks: ['price_anomaly'] };
    }

    const deviation = this.calculateDeviation(price, baseline);

    if (price < baseline.min) {
      return {
        flagged: true,
        reason: `Price anomaly — too low for category. Expected range: $${baseline.min}-$${baseline.max}, got: $${price}`,
        expectedRange: { min: baseline.min, max: baseline.max },
        deviation, confidence: this.calculateConfidence(deviation),
        severity: this.determineSeverity(deviation), checks: ['price_anomaly']
      };
    }

    return { flagged: false, reason: null, expectedRange: { min: baseline.min, max: baseline.max }, deviation: 0, confidence: 0, severity: 'none', checks: ['price_anomaly'] };
  }

  getBaseline(category) {
    const baselines = this._loadBaselines();
    const key = category.toLowerCase().replace(/\s+/g, '_');
    return baselines[key] || baselines['general'] || null;
  }

  updateBaseline(category, newPrice) {
    const baselines = this._loadBaselines();
    const key = category.toLowerCase().replace(/\s+/g, '_');

    if (!baselines[key]) {
      baselines[key] = { min: newPrice, max: newPrice, average: newPrice };
    } else {
      const c = baselines[key];
      c.min = Math.min(c.min, newPrice);
      c.max = Math.max(c.max, newPrice);
      c.average = Math.round((c.average + newPrice) / 2);
    }

    try { fs.writeFileSync(this._baselinesPath, JSON.stringify(baselines, null, 2), 'utf-8'); } catch (e) { console.error('Failed to update baselines:', e.message); }
    this._baselines = baselines;
    return baselines[key];
  }

  calculateDeviation(price, baseline) {
    if (!baseline || baseline.average === 0) return 0;
    if (price >= baseline.average) return 0;
    return Math.round(Math.min((baseline.average - price) / baseline.average, 1.0) * 100) / 100;
  }

  calculateConfidence(deviation) {
    if (deviation >= 0.80) return 0.95;
    if (deviation >= 0.50) return 0.75;
    if (deviation > 0) return 0.50;
    return 0;
  }

  determineSeverity(deviation) {
    if (deviation >= 0.80) return 'high';
    if (deviation >= 0.50) return 'medium';
    if (deviation > 0) return 'low';
    return 'none';
  }

  _loadBaselines() {
    if (this._baselines) return this._baselines;
    try {
      const raw = fs.readFileSync(this._baselinesPath, 'utf-8');
      this._baselines = JSON.parse(raw);
      return this._baselines;
    } catch (e) {
      console.error('Failed to load baselines:', e.message);
      return {};
    }
  }
}

module.exports = PriceAnomalyDetector;
