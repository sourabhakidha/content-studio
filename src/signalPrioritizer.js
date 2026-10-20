/**
 * Akidha Marketing OS — Market Signal Processing & Prioritization Engine
 * Handles deduplication, relevance scoring, intent classification, and conversion to creative briefs.
 */

export const RELEVANCE_KEYWORDS = {
  high: [
    /substitut(e|es|ion)/i,
    /generic(s)?/i,
    /same molecule/i,
    /alternative medicine/i,
    /nppa/i,
    /price control/i,
    /medicine cost/i,
    /expensive medicine/i
  ],
  medium: [
    /diabetes/i,
    /hypertension/i,
    /blood pressure/i,
    /thyroid/i,
    /chronic/i,
    /cdsco/i,
    /drug price/i,
    /counterfeit/i,
    /who-gmp/i,
    /quality/i,
    /online pharmacy/i,
    /trust/i
  ]
};

/**
 * Inactive or low-quality patterns to deprioritize
 */
export const NOISE_PATTERNS = [
  /homeopathy/i,
  /ayurvedic hair oil/i,
  /weight loss supplement/i
];

/**
 * Calculates a 0-100 relevance score for Akidha's chronic-care mission.
 * @param {object} signal - Raw signal with title, summary, source.
 * @returns {number} Score between 0 and 100.
 */
export function scoreSignal(signal = {}) {
  const text = `${signal.title || ''} ${signal.summary || ''}`.toLowerCase();
  if (!text.trim()) return 0;

  for (const noise of NOISE_PATTERNS) {
    if (noise.test(text)) return 15;
  }

  let score = 30; // base score

  for (const pattern of RELEVANCE_KEYWORDS.high) {
    if (pattern.test(text)) score += 15;
  }

  for (const pattern of RELEVANCE_KEYWORDS.medium) {
    if (pattern.test(text)) score += 8;
  }

  if (signal.num_comments && signal.num_comments >= 10) score += 10;
  if (signal.category === 'regulation' || signal.category === 'pricing') score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Deduplicates signals based on URL and normalized title.
 * @param {Array<object>} signals - Array of signals.
 * @returns {Array<object>} Deduplicated and prioritized signals.
 */
export function deduplicateSignals(signals = []) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const unique = [];

  for (const item of signals) {
    const url = String(item.url || '').trim().toLowerCase();
    const title = String(item.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (url && seenUrls.has(url)) continue;
    if (title && seenTitles.has(title)) continue;

    if (url) seenUrls.add(url);
    if (title) seenTitles.add(title);

    const scored = {
      ...item,
      relevance_score: item.relevance_score != null ? item.relevance_score : scoreSignal(item)
    };
    unique.push(scored);
  }

  return unique.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
}

/**
 * Converts a market signal into a structured creative brief and task proposal.
 * @param {object} signal - Market signal.
 * @returns {object} Pre-populated task and creative brief structure.
 */
export function convertSignalToBrief(signal = {}) {
  const title = `Education: ${String(signal.title || 'Market Insight').slice(0, 80)}`;
  const category = signal.category === 'regulation' ? 'Social media' : 'Meta Ads';
  const theme = signal.category === 'pricing' ? 'Affordability & Fair Pricing' : 'Trust & Transparency';

  const brief = [
    `SOURCE CONTEXT:`,
    `- Title: ${signal.title || 'N/A'}`,
    `- Source: ${signal.source || 'Market Intelligence'}`,
    `- Reference URL: ${signal.url || 'N/A'}`,
    `- Summary: ${signal.summary || 'N/A'}`,
    ``,
    `EDITORIAL OBJECTIVE:`,
    `Address chronic patient uncertainty around this topic using Akidha brand standards:`,
    `1. Teach first, sell second.`,
    `2. Use the term "substitutes" over "cheap generics".`,
    `3. Explain the regulatory/pharmacist verification behind the medicine.`,
    `4. MANDATORY: Include doctor/pharmacist consultation CTA.`,
    `5. Do NOT make unverified 100% cure or pricing claims.`
  ].join('\n');

  return {
    task_title: title,
    brief,
    category,
    theme,
    priority: (signal.relevance_score || 0) >= 70 ? 'High' : 'Medium',
    estimate_minutes: 180,
    creative_title: title,
    platform: 'Instagram',
    format: 'Carousel'
  };
}

