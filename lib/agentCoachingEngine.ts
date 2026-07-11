import {
  analyzeTranscript,
  generateIntelligenceReport,
  ingestTranscript,
  mapTranscriptToFlow,
  type IntelligenceReport,
} from '@/lib/transcriptIntelligenceEngine';

export type CoachingInputTranscript = {
  id?: string;
  text: string;
  fileName?: string;
  agentId?: string;
  agentName?: string;
  team?: string;
  queue?: string;
  flowId?: string;
  kpis?: { csat?: number; aht?: number; fcr?: number };
};

export type CoachingSnippet = {
  transcriptId: string;
  agentId: string;
  agentName: string;
  team: string;
  intent: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  outcome: 'successful' | 'mixed' | 'unsuccessful';
  text: string;
  reason: string;
};

export type AgentCoachingSummary = {
  agentId: string;
  agentName: string;
  team: string;
  transcriptCount: number;
  scores: {
    empathy: number;
    clarity: number;
    resolution: number;
    adherenceToFlow: number;
    escalationHandling: number;
    overall: number;
  };
  strengths: string[];
  opportunities: string[];
  kpis: { csat: number; aht: number; fcr: number };
};

export type TeamCoachingSummary = {
  team: string;
  transcriptCount: number;
  commonFailureModes: string[];
  weakIntentAreas: string[];
  trainingOpportunities: string[];
  averageScore: number;
};

export type SkillGap = {
  scope: 'agent' | 'team';
  agentId?: string;
  team?: string;
  skill: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string[];
};

export type PlaybookRecommendation = {
  id: string;
  title: string;
  scope: 'global' | 'team' | 'queue';
  team?: string;
  queue?: string;
  openers: string[];
  probingQuestions: string[];
  deEscalationPatterns: string[];
  resolutionFrameworks: string[];
  followUpTemplates: string[];
};

export type CoachingOutput = {
  agents: AgentCoachingSummary[];
  teams: TeamCoachingSummary[];
  skillGaps: SkillGap[];
  playbooks: PlaybookRecommendation[];
  snippets: {
    golden: CoachingSnippet[];
    coaching: CoachingSnippet[];
  };
  recommendations: string[];
  summary: {
    transcriptCount: number;
    agentCount: number;
    teamCount: number;
    topSkillGap: string;
    topRecommendation: string;
  };
};

type PreparedRecord = {
  transcriptId: string;
  agentId: string;
  agentName: string;
  team: string;
  queue: string;
  flowId: string;
  report: IntelligenceReport;
  kpis: { csat: number; aht: number; fcr: number };
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function outcomeFromReport(report: IntelligenceReport): 'successful' | 'mixed' | 'unsuccessful' {
  const goodAgent = report.agentScore.score >= 78;
  const lowFrustration = report.customerFrustration.score < 45;
  const negative = report.sentiment.label === 'negative';
  if (goodAgent && lowFrustration && !negative) return 'successful';
  if (report.agentScore.score < 60 || report.customerFrustration.score > 70) return 'unsuccessful';
  return 'mixed';
}

function deriveScores(report: IntelligenceReport): AgentCoachingSummary['scores'] {
  const empathy = clamp(report.agentScore.score - (report.customerFrustration.score > 65 ? 10 : 0));
  const clarity = clamp(100 - report.flowMapping.deviations.length * 12 - report.flowMapping.repeatedLoops.length * 8);
  const resolution = clamp(100 - report.issues.filter((issue) => issue.severity === 'high').length * 15 - (report.escalationDetected ? 10 : 0));
  const adherenceToFlow = clamp(100 - report.flowMapping.deviations.length * 15 - report.flowMapping.agentOverrides.length * 10);
  const escalationHandling = clamp(
    report.escalationDetected
      ? 55 + (report.agentScore.score > 80 ? 20 : 0) - report.flowMapping.agentOverrides.length * 10
      : 82
  );
  const overall = clamp(average([empathy, clarity, resolution, adherenceToFlow, escalationHandling]));
  return { empathy, clarity, resolution, adherenceToFlow, escalationHandling, overall };
}

function defaultTranscriptFromId(id: string): CoachingInputTranscript {
  const normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const team = normalizedId.includes('billing') ? 'Billing' : normalizedId.includes('tech') ? 'Support' : 'General';
  const queue = normalizedId.includes('billing') ? 'Billing Queue' : normalizedId.includes('tech') ? 'Tech Queue' : 'General Queue';
  return {
    id,
    text: `[09:00:00] Customer: I need help with my account and still have unresolved issues.\n[09:00:25] Agent: Thank you for your patience, I can help review and resolve this today.\n[09:01:05] Customer: It has happened several times and I may need a supervisor.\n[09:01:40] Agent: I understand. I will check the flow and escalate if needed.`,
    fileName: `${id}.txt`,
    agentId: `agent-${normalizedId.slice(0, 6) || '001'}`,
    agentName: `Agent ${normalizedId.slice(0, 1).toUpperCase() || 'A'}`,
    team,
    queue,
    flowId: normalizedId.includes('billing') ? 'flow-billing' : 'flow-support',
    kpis: { csat: 78, aht: 430, fcr: 70 },
  };
}

function prepareRecords(input: {
  transcriptIds?: string[];
  transcripts?: CoachingInputTranscript[];
  team?: string;
  queue?: string;
  flowId?: string;
}): PreparedRecord[] {
  const direct = input.transcripts ?? [];
  const fromIds = (input.transcriptIds ?? []).map((id) => defaultTranscriptFromId(id));
  const combined = [...direct, ...fromIds];
  if (combined.length === 0) throw new Error('No transcripts provided');

  return combined
    .map((item, index) => {
      const transcript = ingestTranscript({
        text: item.text,
        fileName: item.fileName ?? `${item.id ?? `transcript-${index + 1}`}.txt`,
      });
      const analysis = analyzeTranscript(transcript);
      const flowMapping = mapTranscriptToFlow(transcript);
      const report = generateIntelligenceReport({ transcript, analysis, flowMapping });
      const agentId = item.agentId ?? `agent-${String(index + 1).padStart(3, '0')}`;
      const agentName = item.agentName ?? `Agent ${index + 1}`;
      const team = item.team ?? 'General';
      const queue = item.queue ?? 'General Queue';
      const flowId = item.flowId ?? 'flow-main';
      const kpis = {
        csat: item.kpis?.csat ?? clamp(70 + (report.agentScore.score - 60) * 0.4, 40, 98),
        aht: item.kpis?.aht ?? clamp(320 + report.customerFrustration.score * 2, 180, 900),
        fcr: item.kpis?.fcr ?? clamp(85 - report.issues.filter((issue) => issue.severity === 'high').length * 12, 20, 98),
      };
      return { transcriptId: item.id ?? transcript.id, agentId, agentName, team, queue, flowId, report, kpis };
    })
    .filter((record) => {
      if (input.team && record.team !== input.team) return false;
      if (input.queue && record.queue !== input.queue) return false;
      if (input.flowId && record.flowId !== input.flowId) return false;
      return true;
    });
}

function buildSnippets(records: PreparedRecord[]) {
  const snippets: CoachingOutput['snippets'] = { golden: [], coaching: [] };
  records.forEach((record) => {
    const transcript = record.report.transcript;
    const outcome = outcomeFromReport(record.report);
    const intent = record.report.summary.primaryIntent;
    const sentiment = record.report.sentiment.label;
    const customerTurn = transcript.turns.find((turn) => turn.speaker === 'customer');
    const agentTurn = transcript.turns.find((turn) => turn.speaker === 'agent');
    if (agentTurn && outcome === 'successful') {
      snippets.golden.push({
        transcriptId: record.transcriptId,
        agentId: record.agentId,
        agentName: record.agentName,
        team: record.team,
        intent,
        sentiment,
        outcome,
        text: agentTurn.text,
        reason: 'High-quality interaction with strong outcome and customer stability.',
      });
    }
    if (customerTurn && outcome !== 'successful') {
      snippets.coaching.push({
        transcriptId: record.transcriptId,
        agentId: record.agentId,
        agentName: record.agentName,
        team: record.team,
        intent,
        sentiment,
        outcome,
        text: customerTurn.text,
        reason: 'Segment indicates unmet expectations or escalation risk.',
      });
    }
  });
  return {
    golden: snippets.golden.slice(0, 20),
    coaching: snippets.coaching.slice(0, 20),
  };
}

function buildPlaybooks(records: PreparedRecord[], snippets: CoachingOutput['snippets']): PlaybookRecommendation[] {
  const teams = Array.from(new Set(records.map((record) => record.team)));
  const baseOpeners = snippets.golden.map((snippet) => snippet.text).slice(0, 4);
  const baseCoaching = snippets.coaching.map((snippet) => snippet.text).slice(0, 4);

  const playbooks: PlaybookRecommendation[] = [
    {
      id: makeId('playbook'),
      title: 'Global De-escalation & Resolution Playbook',
      scope: 'global',
      openers: baseOpeners.length > 0 ? baseOpeners : ['Thank you for contacting us. I understand how important this is, and I will help resolve it.'],
      probingQuestions: [
        'Can you walk me through the last step right before the issue occurred?',
        'How many times has this issue happened today?',
        'What outcome are you hoping for in this call?',
      ],
      deEscalationPatterns: [
        'Acknowledge impact, apologize clearly, and provide immediate next steps.',
        'Mirror customer concern with concise empathy and timeline commitment.',
      ],
      resolutionFrameworks: [
        'Confirm issue -> validate account/context -> execute fix -> verify outcome -> summarize.',
      ],
      followUpTemplates: [
        'I have documented this and set follow-up for <date/time>. If it reoccurs, reference case <id>.',
      ],
    },
  ];

  teams.forEach((team) => {
    const teamRecords = records.filter((record) => record.team === team);
    const poorIntents = teamRecords
      .filter((record) => outcomeFromReport(record.report) === 'unsuccessful')
      .map((record) => record.report.summary.primaryIntent);
    playbooks.push({
      id: makeId('playbook'),
      title: `${team} Team Coaching Playbook`,
      scope: 'team',
      team,
      openers: ['Thanks for your patience, I have your case and will stay with you until we confirm the next step.'],
      probingQuestions: [
        'What changed before this issue started?',
        'Which route/menu path did you follow?',
      ],
      deEscalationPatterns: ['If escalation requested, acknowledge and explain criteria + ETA before transfer.'],
      resolutionFrameworks: [
        `Focus on intents with weaker outcomes: ${poorIntents.slice(0, 3).join(', ') || 'none identified'}.`,
      ],
      followUpTemplates: [
        'We applied the fix and will monitor for recurrence over the next 24 hours. Reply with any new error text.',
        ...baseCoaching.slice(0, 1).map((example) => `Avoid this pattern: "${example}"`),
      ],
    });
  });

  return playbooks;
}

export function analyzeCoaching(input: {
  transcriptIds?: string[];
  transcripts?: CoachingInputTranscript[];
  team?: string;
  queue?: string;
  flowId?: string;
}): CoachingOutput {
  const records = prepareRecords(input);
  if (records.length === 0) throw new Error('No transcripts matched selected filters');

  const byAgent = new Map<string, PreparedRecord[]>();
  records.forEach((record) => {
    if (!byAgent.has(record.agentId)) byAgent.set(record.agentId, []);
    byAgent.get(record.agentId)?.push(record);
  });

  const agents: AgentCoachingSummary[] = Array.from(byAgent.entries()).map(([agentId, agentRecords]) => {
    const base = agentRecords[0];
    const scoreList = agentRecords.map((record) => deriveScores(record.report));
    const empathy = average(scoreList.map((score) => score.empathy));
    const clarity = average(scoreList.map((score) => score.clarity));
    const resolution = average(scoreList.map((score) => score.resolution));
    const adherenceToFlow = average(scoreList.map((score) => score.adherenceToFlow));
    const escalationHandling = average(scoreList.map((score) => score.escalationHandling));
    const overall = average(scoreList.map((score) => score.overall));
    const strengths: string[] = [];
    const opportunities: string[] = [];
    if (empathy >= 80) strengths.push('Strong empathy and customer acknowledgment');
    if (resolution >= 78) strengths.push('Consistent resolution behaviors');
    if (adherenceToFlow >= 80) strengths.push('Reliable flow adherence');
    if (clarity < 70) opportunities.push('Improve call clarity and summarization');
    if (adherenceToFlow < 72) opportunities.push('Reduce routing deviations and manual overrides');
    if (escalationHandling < 70) opportunities.push('Strengthen escalation framing and handoff quality');
    if (opportunities.length === 0) opportunities.push('Maintain current coaching cadence with scenario drills');

    return {
      agentId,
      agentName: base.agentName,
      team: base.team,
      transcriptCount: agentRecords.length,
      scores: {
        empathy: Number(empathy.toFixed(1)),
        clarity: Number(clarity.toFixed(1)),
        resolution: Number(resolution.toFixed(1)),
        adherenceToFlow: Number(adherenceToFlow.toFixed(1)),
        escalationHandling: Number(escalationHandling.toFixed(1)),
        overall: Number(overall.toFixed(1)),
      },
      strengths,
      opportunities,
      kpis: {
        csat: Number(average(agentRecords.map((record) => record.kpis.csat)).toFixed(1)),
        aht: Number(average(agentRecords.map((record) => record.kpis.aht)).toFixed(1)),
        fcr: Number(average(agentRecords.map((record) => record.kpis.fcr)).toFixed(1)),
      },
    };
  });

  const byTeam = new Map<string, PreparedRecord[]>();
  records.forEach((record) => {
    if (!byTeam.has(record.team)) byTeam.set(record.team, []);
    byTeam.get(record.team)?.push(record);
  });

  const teams: TeamCoachingSummary[] = Array.from(byTeam.entries()).map(([team, teamRecords]) => {
    const weakIntents = teamRecords
      .filter((record) => outcomeFromReport(record.report) !== 'successful')
      .map((record) => record.report.summary.primaryIntent);
    const failureModes = teamRecords.flatMap((record) => record.report.flowMapping.deviations).slice(0, 5);
    const avgScore = average(teamRecords.map((record) => deriveScores(record.report).overall));
    return {
      team,
      transcriptCount: teamRecords.length,
      commonFailureModes: failureModes.length > 0 ? failureModes : ['No major recurring failure mode detected'],
      weakIntentAreas: Array.from(new Set(weakIntents)).slice(0, 5),
      trainingOpportunities: [
        'Scenario drills for repeat intents with low outcomes',
        'Flow-adherence refresh and escalation simulation',
        'Empathy language reinforcement for high-frustration calls',
      ],
      averageScore: Number(avgScore.toFixed(1)),
    };
  });

  const skillGaps: SkillGap[] = [];
  agents.forEach((agent) => {
    if (agent.scores.empathy < 72) {
      skillGaps.push({ scope: 'agent', agentId: agent.agentId, skill: 'Empathy', severity: 'medium', evidence: agent.opportunities });
    }
    if (agent.scores.adherenceToFlow < 70) {
      skillGaps.push({ scope: 'agent', agentId: agent.agentId, skill: 'Flow adherence', severity: 'high', evidence: agent.opportunities });
    }
    if (agent.scores.resolution < 68) {
      skillGaps.push({ scope: 'agent', agentId: agent.agentId, skill: 'Resolution effectiveness', severity: 'high', evidence: agent.opportunities });
    }
  });
  teams.forEach((team) => {
    if (team.averageScore < 72 || team.weakIntentAreas.length > 1) {
      skillGaps.push({
        scope: 'team',
        team: team.team,
        skill: 'Intent-specific handling consistency',
        severity: team.averageScore < 65 ? 'high' : 'medium',
        evidence: [...team.weakIntentAreas, ...team.commonFailureModes].slice(0, 5),
      });
    }
  });

  const snippets = buildSnippets(records);
  const playbooks = buildPlaybooks(records, snippets);

  const recommendations: string[] = [];
  if (skillGaps.some((gap) => gap.skill === 'Flow adherence')) {
    recommendations.push('Prioritize flow-adherence coaching module for affected agents.');
  }
  if (teams.some((team) => team.weakIntentAreas.length >= 2)) {
    recommendations.push('Run team-level workshops for top weak intents and escalation handling.');
  }
  if (snippets.coaching.length > snippets.golden.length) {
    recommendations.push('Expand quality calibration sessions using golden snippets as benchmark examples.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Maintain current coaching cadence and monitor weekly trend deltas.');
  }

  return {
    agents,
    teams,
    skillGaps,
    playbooks,
    snippets,
    recommendations,
    summary: {
      transcriptCount: records.length,
      agentCount: agents.length,
      teamCount: teams.length,
      topSkillGap: skillGaps[0]?.skill ?? 'No critical gap',
      topRecommendation: recommendations[0] ?? 'No recommendation',
    },
  };
}

export function generatePlaybookOnly(input: Parameters<typeof analyzeCoaching>[0]) {
  const analyzed = analyzeCoaching(input);
  return { playbooks: analyzed.playbooks, summary: analyzed.summary, recommendations: analyzed.recommendations };
}

export function extractSnippetsOnly(input: Parameters<typeof analyzeCoaching>[0]) {
  const analyzed = analyzeCoaching(input);
  return { snippets: analyzed.snippets, summary: analyzed.summary };
}

export function generateCoachingReport(input: Parameters<typeof analyzeCoaching>[0]) {
  return analyzeCoaching(input);
}
