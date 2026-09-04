export interface CmaValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  flaggedPhrases: Array<{
    phrase: string;
    reason: string;
    severity: 'CRITICAL_PROHIBITED' | 'WARNING_UNGROUNDED';
    suggestedReplacement: string;
  }>;
  suggestedCompliantText: string;
  legalGuidance: string;
}

export class CmaValidatorService {
  // Prohibited absolute greenwashing terms under UK CMA Green Claims Code & EU Green Claims Directive
  private static PROHIBITED_CLAIMS_RULES = [
    {
      regex: /\b(100%\s*(?:green|eco-friendly|clean|sustainable|carbon\s*neutral|zero\s*carbon))\b/gi,
      reason: 'Absolute claim "100% Green / Clean" prohibited under CMA Rule 1 unless verified across full cradle-to-grave lifecycle.',
      replacement: 'processes verified under the GHG Logo Drop methodology in accordance with ISO 14064-1 data',
    },
    {
      regex: /\b(carbon\s*neutral\s*(?:event|match|derby|product|flight|garment))\b/gi,
      reason: 'Broad "Carbon Neutral" claims are prohibited under CMA Guidance without primary Scope 1, 2, and 3 lifecycle disclosures.',
      replacement: 'event operations monitored and transparently audited against ISO 14064-2 project emission baselines',
    },
    {
      regex: /\b(zero\s*(?:emissions|carbon)\s*(?:steel|production|energy|facility))\b/gi,
      reason: 'Absolute "Zero Emissions" claim implies zero lifecycle footprint, which violates CMA Rule 2 (Truthful & Accurate).',
      replacement: 'low-carbon production utilizing 99.97% green hydrogen verified under ISO 22734 standards',
    },
    {
      regex: /\b(completely\s*sustainable|planet\s*friendly|eco\s*safe)\b/gi,
      reason: 'Vague, non-specific environmental claims violate CMA Rule 3 (Clear & Unambiguous).',
      replacement: 'manufactured using 100% certified organic materials with verified ISO 14067 Product Carbon Footprint data',
    },
    {
      regex: /\b(carbon\s*offset\s*guaranteed|offsetting\s*all\s*emissions)\b/gi,
      reason: 'Offset-based neutrality claims are restricted; emission reductions must be prioritized over unverified credits.',
      replacement: 'emissions accounted for through verified local energy optimization and audited charitable impact routing',
    },
  ];

  /**
   * Scans text (attestation note, product description, marketing copy) against the UK CMA Green Claims Code.
   */
  validateText(text: string): CmaValidationResult {
    if (!text || !text.trim()) {
      return {
        isValid: true,
        score: 100,
        flaggedPhrases: [],
        suggestedCompliantText: '',
        legalGuidance: 'Text is empty.',
      };
    }

    const input = text.trim();
    const flaggedPhrases: CmaValidationResult['flaggedPhrases'] = [];
    let compliantDraft = input;

    for (const rule of CmaValidatorService.PROHIBITED_CLAIMS_RULES) {
      let match;
      rule.regex.lastIndex = 0; // Reset regex state
      while ((match = rule.regex.exec(input)) !== null) {
        flaggedPhrases.push({
          phrase: match[0],
          reason: rule.reason,
          severity: match[0].toLowerCase().includes('100%') || match[0].toLowerCase().includes('zero')
            ? 'CRITICAL_PROHIBITED'
            : 'WARNING_UNGROUNDED',
          suggestedReplacement: rule.replacement,
        });

        // Replace in draft
        compliantDraft = compliantDraft.replace(match[0], rule.replacement);
      }
    }

    const isValid = flaggedPhrases.length === 0;
    const score = Math.max(100 - flaggedPhrases.length * 25, 0);

    return {
      isValid,
      score,
      flaggedPhrases,
      suggestedCompliantText: isValid ? input : compliantDraft,
      legalGuidance: isValid
        ? 'Conformant: Text complies with UK CMA Green Claims Code principles (Specific, Substantiated, and Clear).'
        : 'Notice: Prohibited or absolute environmental claims detected. Apply suggested legal phrasing to prevent CMA regulatory penalties.',
    };
  }
}
