const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class LinkDetector {
  constructor() {
    this._disposableDomains = null;
    this._phishingData = null;
    this._urlShorteners = null;
  }

  /**
   * Extract all URLs from text
   * @param {string} text - Text to extract URLs from
   * @returns {string[]} Array of URLs found
   */
  extractURLs(text) {
    if (!text || typeof text !== 'string') return [];

    const urlPatterns = [
      // Full URLs with protocol
      /https?:\/\/[^\s<>"'`,;)}\]]+/gi,
      // URLs starting with www
      /www\.[^\s<>"'`,;)}\]]+/gi,
      // Common shortener domains without protocol
      /(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|buff\.ly|cutt\.ly|rb\.gy|j\.mp)\/[^\s<>"'`,;)}\]]+/gi
    ];

    const urls = new Set();
    for (const pattern of urlPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Clean trailing punctuation
          const cleaned = match.replace(/[.,;:!?)}\]]+$/, '');
          urls.add(cleaned);
        }
      }
    }

    return Array.from(urls);
  }

  /**
   * Check if an email uses a disposable email domain
   * @param {string} email - Email address to check
   * @returns {{ flagged: boolean, reason: string|null, checks: string[] }}
   */
  checkDisposableEmail(email) {
    if (!email || typeof email !== 'string') {
      return { flagged: false, reason: null, checks: ['email_pattern'] };
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      return { flagged: false, reason: null, checks: ['email_pattern'] };
    }

    const domain = parts[1].toLowerCase().trim();
    const disposableDomains = this._loadDisposableDomains();

    if (disposableDomains.includes(domain)) {
      return {
        flagged: true,
        reason: 'Disposable email domain detected',
        checks: ['email_pattern']
      };
    }

    return { flagged: false, reason: null, checks: ['email_pattern'] };
  }

  /**
   * Evaluate a single URL for risk
   * @param {string} url - URL to evaluate
   * @returns {Promise<{ flagged: boolean, reason: string|null, urlRisk: string, url: string }>}
   */
  async evaluateURL(url) {
    if (!url || typeof url !== 'string') {
      return { flagged: false, reason: null, urlRisk: 'safe', url };
    }

    const normalizedUrl = url.toLowerCase();

    // Check if it's a URL shortener
    const shorteners = this._loadUrlShorteners();
    let isShortener = false;
    for (const shortener of shorteners) {
      if (normalizedUrl.includes(shortener)) {
        isShortener = true;
        break;
      }
    }

    if (isShortener) {
      // Try to expand the short URL
      try {
        const expandedUrl = await this.expandShortURL(url);
        if (expandedUrl && expandedUrl !== url) {
          // Re-evaluate the expanded URL
          const expandedResult = await this.evaluateURL(expandedUrl);
          if (expandedResult.flagged) {
            return expandedResult;
          }
        }
      } catch (error) {
        // If we can't expand, treat as suspicious
        return {
          flagged: true,
          reason: 'Shortened URL could not be resolved — treated as suspicious',
          urlRisk: 'suspicious',
          url
        };
      }

      return {
        flagged: true,
        reason: 'URL shortener detected — may hide malicious destination',
        urlRisk: 'suspicious',
        url
      };
    }

    // Check against phishing URL database
    const phishingData = this._loadPhishingData();
    const urlDomain = this._extractDomain(normalizedUrl);

    // Exact domain match against phishing list
    for (const phishDomain of phishingData.domains) {
      if (urlDomain === phishDomain.toLowerCase() || normalizedUrl.includes(phishDomain.toLowerCase())) {
        return {
          flagged: true,
          reason: `Known phishing domain detected: ${phishDomain}`,
          urlRisk: 'malicious',
          url
        };
      }
    }

    // Check for typo-squatting / misleading domains
    const typoSquatResult = this._checkTypoSquatting(urlDomain);
    if (typoSquatResult.flagged) {
      return {
        flagged: true,
        reason: typoSquatResult.reason,
        urlRisk: 'malicious',
        url
      };
    }

    return { flagged: false, reason: null, urlRisk: 'safe', url };
  }

  /**
   * Evaluate all URLs in an array
   * @param {string[]} urls - Array of URLs
   * @returns {Promise<{ flagged: boolean, suspiciousLinks: object[], reason: string|null, confidence: number, severity: string, checks: string[] }>}
   */
  async evaluateAllURLs(urls) {
    if (!urls || urls.length === 0) {
      return {
        flagged: false,
        suspiciousLinks: [],
        reason: null,
        confidence: 0,
        severity: 'none',
        checks: ['phishing_links']
      };
    }

    const results = [];
    const suspiciousLinks = [];

    for (const url of urls) {
      const result = await this.evaluateURL(url);
      results.push(result);
      if (result.flagged) {
        suspiciousLinks.push(result);
      }
    }

    const urlRiskList = results.map(r => r.urlRisk);
    const flagged = suspiciousLinks.length > 0;
    const reason = flagged ? suspiciousLinks[0].reason : null;
    const confidence = this.calculateConfidence(urlRiskList);
    const severity = this.determineSeverity(urlRiskList);

    return {
      flagged,
      suspiciousLinks,
      reason,
      confidence,
      severity,
      checks: ['phishing_links']
    };
  }

  /**
   * Follow redirects to expand a shortened URL
   * @param {string} url - Shortened URL to expand
   * @returns {Promise<string>} Expanded URL
   */
  expandShortURL(url) {
    return new Promise((resolve, reject) => {
      // Add protocol if missing
      let fullUrl = url;
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = 'https://' + fullUrl;
      }

      const client = fullUrl.startsWith('https') ? https : http;
      const timeout = 5000;

      const req = client.request(fullUrl, { method: 'HEAD', timeout }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(res.headers.location);
        } else {
          resolve(url);
        }
      });

      req.on('error', () => {
        reject(new Error(`Could not expand URL: ${url}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout expanding URL: ${url}`));
      });

      req.end();
    });
  }

  /**
   * Calculate confidence from URL risk levels
   * @param {string[]} urlRiskList - Array of risk levels ('safe', 'suspicious', 'malicious')
   * @returns {number} Confidence score 0.0 to 1.0
   */
  calculateConfidence(urlRiskList) {
    if (!urlRiskList || urlRiskList.length === 0) return 0;

    if (urlRiskList.includes('malicious')) return 0.99;
    if (urlRiskList.includes('suspicious')) return 0.75;
    return 0.10;
  }

  /**
   * Determine severity from URL risk levels
   * @param {string[]} urlRiskList - Array of risk levels
   * @returns {string} Severity: 'none', 'low', 'medium', 'high', or 'critical'
   */
  determineSeverity(urlRiskList) {
    if (!urlRiskList || urlRiskList.length === 0) return 'none';

    if (urlRiskList.includes('malicious')) return 'critical';
    if (urlRiskList.includes('suspicious')) return 'high';
    return 'none';
  }

  /**
   * Extract domain from a URL
   * @param {string} url
   * @returns {string}
   */
  _extractDomain(url) {
    let domain = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
      .toLowerCase()
      .trim();
    return domain;
  }

  /**
   * Check if a domain is typo-squatting a known brand
   * @param {string} domain
   * @returns {{ flagged: boolean, reason: string|null }}
   */
  _checkTypoSquatting(domain) {
    // Known brand domains and their common typo-squats
    const brandChecks = [
      { brand: 'paypal.com', fakes: ['paypa1.com', 'paypai.com', 'payp4l.com', 'paypaI.com', 'peypal.com'] },
      { brand: 'google.com', fakes: ['g00gle.com', 'googie.com', 'gogle.com', 'go0gle.com', 'googl3.com'] },
      { brand: 'amazon.com', fakes: ['amaz0n.com', 'arnazon.com', 'amazom.com', 'amzon.com', 'amazn.com'] },
      { brand: 'facebook.com', fakes: ['faceb00k.com', 'facebok.com', 'facbook.com', 'fac3book.com'] },
      { brand: 'apple.com', fakes: ['app1e.com', 'appie.com', 'aple.com', 'appl3.com'] },
      { brand: 'microsoft.com', fakes: ['micr0soft.com', 'mircosoft.com', 'microsft.com', 'micros0ft.com'] },
      { brand: 'netflix.com', fakes: ['netf1ix.com', 'netfiix.com', 'netfIix.com', 'n3tflix.com'] },
      { brand: 'instagram.com', fakes: ['1nstagram.com', 'instagran.com', 'instgram.com', 'inst4gram.com'] },
      { brand: 'twitter.com', fakes: ['tw1tter.com', 'twiter.com', 'twltter.com'] },
      { brand: 'linkedin.com', fakes: ['l1nkedin.com', 'linkedln.com', 'link3din.com'] }
    ];

    for (const check of brandChecks) {
      // Check if domain looks like a fake of a known brand
      for (const fake of check.fakes) {
        if (domain === fake || domain.includes(fake.split('.')[0])) {
          return {
            flagged: true,
            reason: `Misleading domain detected — appears to impersonate ${check.brand}`
          };
        }
      }

      // Check if domain contains brand name with suspicious additions
      const brandName = check.brand.split('.')[0];
      if (domain !== check.brand && domain.includes(brandName) &&
          (domain.includes('-secure') || domain.includes('-verify') ||
           domain.includes('-login') || domain.includes('-update') ||
           domain.includes('-billing') || domain.includes('-alert') ||
           domain.includes('-support') || domain.includes('-security'))) {
        return {
          flagged: true,
          reason: `Suspicious domain detected — uses ${brandName} brand name with deceptive suffix`
        };
      }
    }

    return { flagged: false, reason: null };
  }

  /**
   * Load disposable email domains list
   * @returns {string[]}
   */
  _loadDisposableDomains() {
    if (this._disposableDomains) return this._disposableDomains;

    const filePath = path.join(__dirname, '..', '..', 'data', 'links', 'disposable_domains.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      this._disposableDomains = JSON.parse(raw);
      return this._disposableDomains;
    } catch (error) {
      console.error('Failed to load disposable domains list:', error.message);
      return [];
    }
  }

  /**
   * Load phishing URL data
   * @returns {{ domains: string[], patterns: string[] }}
   */
  _loadPhishingData() {
    if (this._phishingData) return this._phishingData;

    const filePath = path.join(__dirname, '..', '..', 'data', 'links', 'phishing_urls.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      this._phishingData = JSON.parse(raw);
      return this._phishingData;
    } catch (error) {
      console.error('Failed to load phishing URL data:', error.message);
      return { domains: [], patterns: [] };
    }
  }

  /**
   * Load URL shortener domains list
   * @returns {string[]}
   */
  _loadUrlShorteners() {
    if (this._urlShorteners) return this._urlShorteners;

    const filePath = path.join(__dirname, '..', '..', 'data', 'links', 'url_shorteners.json');
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      this._urlShorteners = JSON.parse(raw);
      return this._urlShorteners;
    } catch (error) {
      console.error('Failed to load URL shorteners list:', error.message);
      return [];
    }
  }
}

module.exports = LinkDetector;
