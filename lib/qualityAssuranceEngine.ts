export type QAInput = {
  transcripts: Array<{
    id: string;
    agent: string;
    text: string;
    sentiment?: number;
    outcome?: 'resolved' | 'unresolved';
  }>;
  complianceRules?: string[];
};

export type QAScorecard = {
  transcriptId: string;
  agent: string;
  qualityScore: number;
  complianceScore: number;
  flowAdherenceScore: number;
  sentimentScore: number;
  flags: string[];
};

export type QAReport = {
  scorecards: QAScorecard[];
  complianceFindings: Array<{ transcriptId: string; issues: string[] }>;
  recommendations: string[];
  summary: {
    averageQuality: number;
    averageCompliance: number;
    highRiskInteractions: number;
  };
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function autoScore(input: QAInput): QAScorecard[] {
  return input.transcripts.map((t) => {
    const lower = t.text.toLowerCase();
    const empathy = lower.includes('sorry') || lower.includes('understand') ? 12 : 0;
    const resolution = t.outcome === 'resolved' ? 18 : -10;
    const policyPenalty = lower.includes('credit card number') ? 20 : 0;
    const escalationPenalty = lower.includes('supervisor') ? 8 : 0;
    const qualityScore = clamp(70 + empathy + resolution - escalationPenalty);
    const complianceScore = clamp(88 - policyPenalty);
    const flowAdherenceScore = clamp(82 + (lower.includes('verify') ? 8 : -6));
    const sentimentScore = clamp(Math.round(((t.sentiment ?? 0) + 1) * 50));
    const flags: string[] = [];
    if (policyPenalty > 0) flags.push('Possible PCI exposure');
    if (t.outcome !== 'resolved') flags.push('Unresolved interaction');
    if (flowAdherenceScore < 70) flags.push('Low flow adherence');
    return {
      transcriptId: t.id,
      agent: t.agent,
      qualityScore,
      complianceScore,
      flowAdherenceScore,
      sentimentScore,
      flags,
    };
  });
}

export function detectCompliance(input: QAInput) {
  const rules = input.complianceRules ?? ['PCI', 'HIPAA', 'Verification'];
  return input.transcripts.map((t) => {
    const lower = t.text.toLowerCase();
    const issues: string[] = [];
    if (rules.includes('PCI') && lower.includes('credit card number')) issues.push('Potential PCI-sensitive data in transcript.');
    if (rules.includes('Verification') && !lower.includes('verify')) issues.push('Missing verification language.');
    if (rules.includes('HIPAA') && lower.includes('medical record')) issues.push('Potential PHI handling requires review.');
    return { transcriptId: t.id, issues };
  });
}

export function generateQAReport(input: QAInput): QAReport {
  const scorecards = autoScore(input);
  const complianceFindings = detectCompliance(input);
  const highRiskInteractions = scorecards.filter((s) => s.qualityScore < 65 || s.complianceScore < 70).length;
  const recommendations: string[] = [];
  if (highRiskInteractions > 0) recommendations.push('Prioritize QA review for high-risk interactions and assign coaching plans.');
  if (complianceFindings.some((f) => f.issues.length > 0)) recommendations.push('Enable mandatory compliance prompts for sensitive workflows.');
  if (recommendations.length === 0) recommendations.push('Maintain current QA cadence and continue weekly calibration.');

  return {
    scorecards,
    complianceFindings,
    recommendations,
    summary: {
      averageQuality: Number(avg(scorecards.map((s) => s.qualityScore)).toFixed(2)),
      averageCompliance: Number(avg(scorecards.map((s) => s.complianceScore)).toFixed(2)),
      highRiskInteractions,
    },
  };
}

