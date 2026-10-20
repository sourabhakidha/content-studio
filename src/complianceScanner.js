/**
 * Akidha Marketing OS — Healthcare & Pharmaceutical Compliance Scanner
 * Enforces Indian healthcare advertising guidelines (Drugs and Magic Remedies Act,
 * CDSCO directives, and Akidha brand principles: education & trust first, savings second).
 */

export const BANNED_PATTERNS = [
  {
    code: 'PROHIBITED_CURE_CLAIM',
    severity: 'CRITICAL',
    regex: /\b(100%\s*(cure|safe|effective)|miracle|permanent cure|magic remedy|guaranteed cure|instant cure|completely cures|eradicates diabetes|eradicates hypertension)\b/i,
    message: 'Prohibited absolute cure or miracle claim. Chronic conditions like diabetes and hypertension are managed, not magically cured.'
  },
  {
    code: 'PRESCRIPTION_TAMPERING_ADVICE',
    severity: 'CRITICAL',
    regex: /\b(stop taking|stop your (medicine|pills|insulin|tablets)|change your (dose|dosage)|skip (your )?dose|discard your prescription|no need (for|to see) (a )?doctor|switch (medicines|tablets|drugs) yourself)\b/i,
    message: 'Illegal medical advice. Never instruct or advise a patient to stop, switch, or alter medication or dosages without their doctor.'
  },
  {
    code: 'UNSUBSTANTIATED_EQUIVALENCE',
    severity: 'WARNING',
    regex: /\b(100%\s*identical|exact same chemical|zero difference|completely identical in every way)\b/i,
    message: 'Unsubstantiated equivalence claim. Use precise regulatory terminology (same active molecule, therapeutic equivalence verified by regulatory standards).'
  },
  {
    code: 'MISLEADING_SUPERLATIVE_SAVINGS',
    severity: 'WARNING',
    regex: /\b(cheapest in india|unbeatable price|lowest price guaranteed|cheapest medicine|free medicines)\b/i,
    message: 'Unsubstantiated comparative pricing claim. Pricing comparisons must be supported by verifiable NPPA/MRP data.'
  },
  {
    code: 'DISCOURAGED_TERMINOLOGY',
    severity: 'INFO',
    regex: /\b(cheap generics|cheap generic medicine)\b/i,
    message: 'Brand voice note: Prefer the term "substitutes" over "cheap generics" to emphasize quality and pharmacist verification over cheapness.'
  }
];

export const MANDATORY_DISCLAIMER_PATTERNS = [
  /\b(consult|discuss with|talk to|advice of|prescribed by|under supervision of)\s+(your\s+)?(doctor|physician|clinician|pharmacist|healthcare provider)\b/i
];

/**
 * Scan copy for compliance violations, medical risk flags, and brand voice standards.
 * @param {string} text - The content copy, script, or brief to inspect.
 * @param {object} options - Options such as requiring consultation disclaimer.
 * @returns {object} Scan result with compliance status, flags, and score.
 */
export function scanCompliance(text, options = {}) {
  const content = String(text || '').trim();
  const flags = [];
  const requireDisclaimer = options.requireDisclaimer ?? true;

  if (!content) {
    return {
      isCompliant: false,
      score: 0,
      flags: [{ code: 'EMPTY_CONTENT', severity: 'CRITICAL', message: 'Content is empty.' }]
    };
  }

  // Check banned patterns
  for (const rule of BANNED_PATTERNS) {
    const match = content.match(rule.regex);
    if (match) {
      flags.push({
        code: rule.code,
        severity: rule.severity,
        message: rule.message,
        matchedText: match[0]
      });
    }
  }

  // Check mandatory clinician disclaimer for public patient education
  if (requireDisclaimer) {
    const hasDisclaimer = MANDATORY_DISCLAIMER_PATTERNS.some(pattern => pattern.test(content));
    if (!hasDisclaimer) {
      flags.push({
        code: 'MISSING_CLINICIAN_CTA',
        severity: 'WARNING',
        message: 'Missing clinician consultation call-to-action (e.g., "Always consult your doctor or pharmacist before changing any medication").'
      });
    }
  }

  const hasCritical = flags.some(f => f.severity === 'CRITICAL');
  const hasWarning = flags.some(f => f.severity === 'WARNING');

  let score = 100;
  flags.forEach(f => {
    if (f.severity === 'CRITICAL') score -= 50;
    else if (f.severity === 'WARNING') score -= 20;
    else if (f.severity === 'INFO') score -= 5;
  });
  score = Math.max(0, score);

  return {
    isCompliant: !hasCritical && !hasWarning,
    hasCritical,
    hasWarning,
    score,
    flags
  };
}

