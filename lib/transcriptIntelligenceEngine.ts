export type TranscriptChannel = 'voice' | 'chat' | 'email';
export type TranscriptSpeaker = 'agent' | 'customer' | 'system' | 'unknown';

export type TranscriptTurn = {
  id: string;
  timestamp: string;
  speaker: TranscriptSpeaker;
  text: string;
};

export type NormalizedTranscript = {
  id: string;
  channel: TranscriptChannel;
  sourceName?: string;
  rawText: string;
  turns: TranscriptTurn[];
  metadata: {
    startedAt: string;
    endedAt: string;
    turnCount: number;
    customerTurns: number;
    agentTurns: number;
    durationSeconds: number;
  };
};

export type IntentResult = { label: string; confidence: number; supportingPhrases: string[] };
export type SentimentResult = { score: number; label: 'negative' | 'neutral' | 'positive' };
export type AgentScore = { score: number; rating: 'poor' | 'fair' | 'good' | 'excellent'; notes: string[] };
export type CustomerFrustration = { score: number; level: 'low' | 'medium' | 'high'; signals: string[] };

export type IssueResult = {
  type: 'billing' | 'technical' | 'access' | 'routing' | 'escalation' | 'compliance' | 'general';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
};

export type TopicCluster = { topic: string; count: number; examples: string[] };

export type TranscriptAnalysis = {
  transcript: NormalizedTranscript;
  intents: IntentResult[];
  sentiment: SentimentResult;
  emotions: string[];
  issues: IssueResult[];
  escalationDetected: boolean;
  agentScore: AgentScore;
  customerFrustration: CustomerFrustration;
  topics: TopicCluster[];
  keywords: string[];
};

export type FlowMappingResult = {
  mappedSegments: Array<{ turnId: string; nodeId: string; reason: string }>;
  path: string[];
  deviations: string[];
  agentOverrides: string[];
  brokenSelfServicePaths: string[];
  repeatedLoops: string[];
  dropOffPoints: string[];
  unreachableSelfServiceNodes: string[];
};

export type IntelligenceReport = TranscriptAnalysis & {
  flowMapping: FlowMappingResult;
  recommendations: string[];
  summary: {
    transcriptId: string;
    channel: TranscriptChannel;
    primaryIntent: string;
    sentiment: SentimentResult['label'];
    topIssue: string;
    escalationDetected: boolean;
    agentScore: number;
    customerFrustration: number;
  };
};

type ParseInput = {
  text?: string;
  fileName?: string;
  mimeType?: string;
};

const POSITIVE_WORDS = ['thanks', 'great', 'helpful', 'resolved', 'perfect', 'good', 'appreciate'];
const NEGATIVE_WORDS = ['angry', 'frustrated', 'upset', 'terrible', 'bad', 'issue', 'problem', 'not working', 'broken'];
const ESCALATION_WORDS = ['manager', 'supervisor', 'escalate', 'complaint', 'legal'];
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'you', 'your', 'have', 'this', 'from', 'are', 'was', 'can', 'please',
  'about', 'into', 'they', 'their', 'them', 'would', 'could', 'should', 'just', 'like', 'there', 'what', 'when',
]);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoTimestamp(input: string): string {
  const parsed = Date.parse(input);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  const hms = input.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const hours = Number(hms[1]);
    const minutes = Number(hms[2]);
    const seconds = Number(hms[3] ?? '0');
    const base = new Date();
    base.setHours(hours, minutes, seconds, 0);
    return base.toISOString();
  }
  return new Date().toISOString();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]+/g, ' ').trim();
}

function detectChannel(params: ParseInput): TranscriptChannel {
  const source = (params.fileName ?? '').toLowerCase();
  const raw = (params.text ?? '').toLowerCase();
  if (source.endsWith('.eml') || raw.includes('subject:') || raw.includes('from:')) return 'email';
  if (source.endsWith('.csv') || raw.includes('agent:') || raw.includes('customer:')) return 'chat';
  return 'voice';
}

function speakerFromText(prefix: string): TranscriptSpeaker {
  const value = prefix.toLowerCase();
  if (value.includes('agent') || value.includes('rep')) return 'agent';
  if (value.includes('customer') || value.includes('caller') || value.includes('client')) return 'customer';
  if (value.includes('system') || value.includes('ivr') || value.includes('bot')) return 'system';
  return 'unknown';
}

function parseCsv(text: string): TranscriptTurn[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const turns: TranscriptTurn[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((part) => part.trim());
    if (cols.length < 3) continue;
    const timestamp = toIsoTimestamp(cols[0]);
    const speaker = speakerFromText(cols[1]);
    const content = cleanText(cols.slice(2).join(','));
    if (!content) continue;
    turns.push({ id: makeId('turn'), timestamp, speaker, text: content });
  }
  return turns;
}

function parseJson(text: string): TranscriptTurn[] {
  const parsed = JSON.parse(text) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed && Array.isArray((parsed as { turns?: unknown[] }).turns)
    ? (parsed as { turns: unknown[] }).turns
    : [];

  return records
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const timestamp = toIsoTimestamp(String(record.timestamp ?? record.time ?? new Date().toISOString()));
      const speaker = speakerFromText(String(record.speaker ?? record.role ?? 'unknown'));
      const textValue = cleanText(String(record.text ?? record.message ?? ''));
      if (!textValue) return null;
      return { id: makeId('turn'), timestamp, speaker, text: textValue } as TranscriptTurn;
    })
    .filter((value): value is TranscriptTurn => value !== null);
}

function parsePlainText(text: string): TranscriptTurn[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const turns: TranscriptTurn[] = [];

  lines.forEach((line) => {
    const timestampMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
    const contentWithSpeaker = timestampMatch ? timestampMatch[2] : line;
    const speakerMatch = contentWithSpeaker.match(/^([A-Za-z ]+):\s*(.*)$/);
    const speaker = speakerMatch ? speakerFromText(speakerMatch[1]) : 'unknown';
    const content = cleanText(speakerMatch ? speakerMatch[2] : contentWithSpeaker);
    if (!content) return;
    turns.push({
      id: makeId('turn'),
      timestamp: timestampMatch ? toIsoTimestamp(timestampMatch[1]) : new Date().toISOString(),
      speaker,
      text: content,
    });
  });

  return turns;
}

export function ingestTranscript(input: ParseInput): NormalizedTranscript {
  const rawText = input.text?.trim() ?? '';
  if (!rawText) {
    throw new Error('Transcript text is required');
  }

  const channel = detectChannel(input);
  const lowerName = (input.fileName ?? '').toLowerCase();

  let turns: TranscriptTurn[] = [];
  if (lowerName.endsWith('.json') || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
    try {
      turns = parseJson(rawText);
    } catch {
      turns = parsePlainText(rawText);
    }
  } else if (lowerName.endsWith('.csv') || rawText.split(/\r?\n/)[0].toLowerCase().includes('timestamp')) {
    turns = parseCsv(rawText);
  } else {
    turns = parsePlainText(rawText);
  }

  if (turns.length === 0) {
    throw new Error('No transcript turns could be parsed');
  }

  const sorted = [...turns].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  const startedAt = sorted[0].timestamp;
  const endedAt = sorted[sorted.length - 1].timestamp;
  const durationSeconds = Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
  const customerTurns = sorted.filter((turn) => turn.speaker === 'customer').length;
  const agentTurns = sorted.filter((turn) => turn.speaker === 'agent').length;

  return {
    id: makeId('transcript'),
    channel,
    sourceName: input.fileName,
    rawText,
    turns: sorted,
    metadata: {
      startedAt,
      endedAt,
      turnCount: sorted.length,
      customerTurns,
      agentTurns,
      durationSeconds,
    },
  };
}

function scoreIntent(transcript: NormalizedTranscript, label: string, keywords: string[]): IntentResult {
  const phrases: string[] = [];
  transcript.turns.forEach((turn) => {
    const line = turn.text.toLowerCase();
    keywords.forEach((keyword) => {
      if (line.includes(keyword) && phrases.length < 6) {
        phrases.push(turn.text);
      }
    });
  });
  const confidence = Math.min(0.98, Number((phrases.length / Math.max(2, transcript.turns.length / 4)).toFixed(2)));
  return { label, confidence, supportingPhrases: phrases };
}

function analyzeSentiment(transcript: NormalizedTranscript): SentimentResult {
  const text = transcript.turns.map((turn) => turn.text.toLowerCase()).join(' ');
  let score = 0;
  POSITIVE_WORDS.forEach((word) => {
    if (text.includes(word)) score += 1;
  });
  NEGATIVE_WORDS.forEach((word) => {
    if (text.includes(word)) score -= 1;
  });
  const normalized = Math.max(-1, Math.min(1, score / 8));
  return {
    score: Number(normalized.toFixed(3)),
    label: normalized > 0.2 ? 'positive' : normalized < -0.2 ? 'negative' : 'neutral',
  };
}

function detectEmotions(transcript: NormalizedTranscript): string[] {
  const text = transcript.turns.map((turn) => turn.text.toLowerCase()).join(' ');
  const emotions: string[] = [];
  if (/(frustrated|angry|upset|annoyed)/.test(text)) emotions.push('frustration');
  if (/(confused|unclear|not sure|don\'t understand)/.test(text)) emotions.push('confusion');
  if (/(thank you|appreciate|great service|helpful)/.test(text)) emotions.push('gratitude');
  if (/(urgent|immediately|asap)/.test(text)) emotions.push('urgency');
  if (emotions.length === 0) emotions.push('neutral');
  return emotions;
}

function detectIssues(transcript: NormalizedTranscript): IssueResult[] {
  const lines = transcript.turns.map((turn) => turn.text);
  const lower = lines.join(' ').toLowerCase();
  const issues: IssueResult[] = [];

  if (/(bill|charge|invoice|payment)/.test(lower)) {
    issues.push({ type: 'billing', severity: 'medium', description: 'Billing-related concern detected', evidence: lines.filter((line) => /bill|charge|payment/i.test(line)).slice(0, 4) });
  }
  if (/(error|not working|bug|failed|crash|timeout)/.test(lower)) {
    issues.push({ type: 'technical', severity: 'high', description: 'Technical failure indicators present', evidence: lines.filter((line) => /error|failed|not working|timeout/i.test(line)).slice(0, 4) });
  }
  if (/(cannot login|locked|password|verification|access)/.test(lower)) {
    issues.push({ type: 'access', severity: 'medium', description: 'Access/authentication issue detected', evidence: lines.filter((line) => /login|password|locked|access/i.test(line)).slice(0, 4) });
  }
  if (/(transferred|loop|same menu|again and again|keeps sending)/.test(lower)) {
    issues.push({ type: 'routing', severity: 'high', description: 'Potential routing/IVR loop issue detected', evidence: lines.filter((line) => /transfer|loop|menu|again/i.test(line)).slice(0, 4) });
  }
  if (ESCALATION_WORDS.some((word) => lower.includes(word))) {
    issues.push({ type: 'escalation', severity: 'high', description: 'Escalation language identified', evidence: lines.filter((line) => /manager|supervisor|escalat|complaint|legal/i.test(line)).slice(0, 4) });
  }
  if (issues.length === 0) {
    issues.push({ type: 'general', severity: 'low', description: 'No major issue patterns detected', evidence: lines.slice(0, 2) });
  }

  return issues;
}

function computeAgentScore(transcript: NormalizedTranscript, sentiment: SentimentResult, issues: IssueResult[]): AgentScore {
  const agentLines = transcript.turns.filter((turn) => turn.speaker === 'agent').map((turn) => turn.text.toLowerCase());
  const notes: string[] = [];
  let score = 72;
  const politeCount = agentLines.filter((line) => /please|thank you|happy to help|glad/i.test(line)).length;
  const empathyCount = agentLines.filter((line) => /sorry|understand|apologize|that sounds/i.test(line)).length;
  const resolveCount = agentLines.filter((line) => /resolved|fixed|completed|done|updated/i.test(line)).length;
  score += politeCount * 2 + empathyCount * 2 + resolveCount * 3;
  if (issues.some((issue) => issue.severity === 'high')) {
    score -= 8;
    notes.push('High-severity issue present in conversation.');
  }
  if (sentiment.label === 'negative') {
    score -= 5;
    notes.push('Conversation ended with negative sentiment.');
  }
  if (politeCount === 0) notes.push('Low courtesy language from agent.');
  if (empathyCount === 0) notes.push('Low empathy signal detected.');
  if (resolveCount > 0) notes.push('Resolution-oriented language present.');

  const bounded = Math.max(0, Math.min(100, score));
  const rating = bounded >= 90 ? 'excellent' : bounded >= 75 ? 'good' : bounded >= 60 ? 'fair' : 'poor';
  return { score: bounded, rating, notes };
}

function computeCustomerFrustration(transcript: NormalizedTranscript, sentiment: SentimentResult, issues: IssueResult[]): CustomerFrustration {
  const customerLines = transcript.turns.filter((turn) => turn.speaker === 'customer').map((turn) => turn.text.toLowerCase());
  const signals: string[] = [];
  let score = 20;
  const frustrationMentions = customerLines.filter((line) => /frustrated|angry|upset|ridiculous|unacceptable/.test(line)).length;
  const repeatMentions = customerLines.filter((line) => /again|still|already|third time|repeated/.test(line)).length;
  const escalationMentions = customerLines.filter((line) => /manager|supervisor|complaint|cancel/.test(line)).length;

  score += frustrationMentions * 15 + repeatMentions * 8 + escalationMentions * 10;
  if (sentiment.label === 'negative') score += 15;
  if (issues.some((issue) => issue.type === 'technical' || issue.type === 'routing')) score += 10;

  if (frustrationMentions > 0) signals.push('Explicit frustration language');
  if (repeatMentions > 0) signals.push('Repeated-contact indicators');
  if (escalationMentions > 0) signals.push('Escalation requests');
  if (signals.length === 0) signals.push('No strong frustration signals');

  const bounded = Math.max(0, Math.min(100, score));
  const level = bounded >= 70 ? 'high' : bounded >= 40 ? 'medium' : 'low';
  return { score: bounded, level, signals };
}

function extractKeywords(transcript: NormalizedTranscript): string[] {
  const freq = new Map<string, number>();
  transcript.turns.forEach((turn) => {
    turn.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !STOPWORDS.has(token))
      .forEach((token) => {
        freq.set(token, (freq.get(token) ?? 0) + 1);
      });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([token]) => token);
}

function clusterTopics(transcript: NormalizedTranscript): TopicCluster[] {
  const clusters: Array<{ topic: string; matcher: RegExp }> = [
    { topic: 'Billing & Payments', matcher: /bill|invoice|payment|charge|refund/i },
    { topic: 'Access & Authentication', matcher: /login|password|locked|access|verify/i },
    { topic: 'Technical Support', matcher: /error|failed|bug|crash|timeout|not working/i },
    { topic: 'Routing & Transfers', matcher: /transfer|queue|menu|route|agent/i },
    { topic: 'Account Changes', matcher: /update|change|address|profile|plan/i },
  ];

  const results: TopicCluster[] = [];
  clusters.forEach((cluster) => {
    const examples = transcript.turns
      .map((turn) => turn.text)
      .filter((text) => cluster.matcher.test(text))
      .slice(0, 4);
    if (examples.length > 0) {
      results.push({ topic: cluster.topic, count: examples.length, examples });
    }
  });
  return results;
}

export function analyzeTranscript(transcript: NormalizedTranscript): TranscriptAnalysis {
  const intentCatalog: Array<{ label: string; keywords: string[] }> = [
    { label: 'Billing Support', keywords: ['bill', 'charge', 'invoice', 'payment', 'refund'] },
    { label: 'Technical Support', keywords: ['error', 'failed', 'not working', 'bug', 'timeout'] },
    { label: 'Account Access', keywords: ['login', 'password', 'locked', 'verify', 'access'] },
    { label: 'Order/Status Inquiry', keywords: ['status', 'order', 'update', 'tracking'] },
    { label: 'Escalation Request', keywords: ['manager', 'supervisor', 'escalate', 'complaint'] },
  ];

  const intents = intentCatalog
    .map((intent) => scoreIntent(transcript, intent.label, intent.keywords))
    .filter((intent) => intent.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const sentiment = analyzeSentiment(transcript);
  const emotions = detectEmotions(transcript);
  const issues = detectIssues(transcript);
  const escalationDetected = issues.some((issue) => issue.type === 'escalation');
  const agentScore = computeAgentScore(transcript, sentiment, issues);
  const customerFrustration = computeCustomerFrustration(transcript, sentiment, issues);
  const topics = clusterTopics(transcript);
  const keywords = extractKeywords(transcript);

  return {
    transcript,
    intents,
    sentiment,
    emotions,
    issues,
    escalationDetected,
    agentScore,
    customerFrustration,
    topics,
    keywords,
  };
}

function nodeFromTurn(turn: TranscriptTurn): { nodeId: string; reason: string } {
  const text = turn.text.toLowerCase();
  if (/menu|option|press/.test(text)) return { nodeId: 'menu-main', reason: 'Menu language detected' };
  if (/billing|invoice|charge|payment/.test(text)) return { nodeId: 'queue-billing', reason: 'Billing keywords detected' };
  if (/tech|error|failed|not working|timeout/.test(text)) return { nodeId: 'queue-tech', reason: 'Technical support keywords detected' };
  if (/agent|representative|transfer/.test(text)) return { nodeId: 'agent-handoff', reason: 'Agent transfer language detected' };
  if (/after hours|closed|business hours/.test(text)) return { nodeId: 'after-hours', reason: 'After-hours language detected' };
  if (/holiday/.test(text)) return { nodeId: 'holiday-route', reason: 'Holiday language detected' };
  return { nodeId: 'self-service', reason: 'Default self-service segment' };
}

export function mapTranscriptToFlow(transcript: NormalizedTranscript): FlowMappingResult {
  const mappedSegments = transcript.turns.map((turn) => {
    const match = nodeFromTurn(turn);
    return { turnId: turn.id, nodeId: match.nodeId, reason: match.reason };
  });

  const path = mappedSegments.map((segment) => segment.nodeId);
  const deviations: string[] = [];
  const agentOverrides: string[] = [];
  const brokenSelfServicePaths: string[] = [];
  const repeatedLoops: string[] = [];
  const dropOffPoints: string[] = [];

  const expectedStart = path[0];
  if (expectedStart && expectedStart !== 'menu-main' && expectedStart !== 'self-service') {
    deviations.push(`Conversation started at ${expectedStart} instead of standard menu entry.`);
  }

  for (let i = 1; i < path.length; i += 1) {
    if (path[i] === 'agent-handoff' && path[i - 1] !== 'queue-tech' && path[i - 1] !== 'queue-billing') {
      agentOverrides.push(`Agent handoff occurred early at step ${i + 1}.`);
    }
    if (path[i] === path[i - 1] && path[i] !== 'self-service') {
      repeatedLoops.push(`Repeated node loop detected at ${path[i]} (step ${i + 1}).`);
    }
  }

  const rawText = transcript.turns.map((turn) => turn.text.toLowerCase()).join(' ');
  if (/didn\'t work|still not working|same issue|again/.test(rawText)) {
    brokenSelfServicePaths.push('Customer repeated unresolved issue after self-service steps.');
  }

  const lastTurn = transcript.turns[transcript.turns.length - 1];
  if (lastTurn && /bye|disconnect|hang up|cancel/.test(lastTurn.text.toLowerCase()) && !/resolved|fixed|done/.test(rawText)) {
    dropOffPoints.push(`Drop-off likely at ${mappedSegments[mappedSegments.length - 1].nodeId}.`);
  }

  const knownNodes = ['menu-main', 'self-service', 'queue-billing', 'queue-tech', 'agent-handoff', 'after-hours', 'holiday-route'];
  const usedNodes = new Set(path);
  const unreachableSelfServiceNodes = knownNodes.filter((nodeId) => nodeId.startsWith('self') || nodeId.includes('menu')).filter((nodeId) => !usedNodes.has(nodeId));

  return {
    mappedSegments,
    path,
    deviations,
    agentOverrides,
    brokenSelfServicePaths,
    repeatedLoops,
    dropOffPoints,
    unreachableSelfServiceNodes,
  };
}

export function generateIntelligenceReport(params: {
  transcript: NormalizedTranscript;
  analysis?: TranscriptAnalysis;
  flowMapping?: FlowMappingResult;
}): IntelligenceReport {
  const analysis = params.analysis ?? analyzeTranscript(params.transcript);
  const flowMapping = params.flowMapping ?? mapTranscriptToFlow(params.transcript);
  const recommendations: string[] = [];

  if (analysis.sentiment.label === 'negative') recommendations.push('Review transcript for coaching opportunities to improve customer sentiment.');
  if (analysis.customerFrustration.level !== 'low') recommendations.push('Escalate workflow review for frustration hot spots and tighten self-service resolution.');
  if (flowMapping.repeatedLoops.length > 0) recommendations.push('Reduce loop conditions and add explicit escape routes in IVR logic.');
  if (flowMapping.brokenSelfServicePaths.length > 0) recommendations.push('Improve self-service prompts and fallback routing to reduce handoffs.');
  if (analysis.issues.some((issue) => issue.type === 'technical')) recommendations.push('Feed technical issues into troubleshooting and routing optimization modules.');
  if (analysis.agentScore.score < 70) recommendations.push('Schedule targeted agent coaching for empathy and resolution language.');

  const primaryIntent = analysis.intents[0]?.label ?? 'General Inquiry';
  const topIssue = analysis.issues[0]?.description ?? 'No major issues detected';

  return {
    transcript: analysis.transcript,
    intents: analysis.intents,
    sentiment: analysis.sentiment,
    emotions: analysis.emotions,
    issues: analysis.issues,
    escalationDetected: analysis.escalationDetected,
    agentScore: analysis.agentScore,
    customerFrustration: analysis.customerFrustration,
    topics: analysis.topics,
    keywords: analysis.keywords,
    flowMapping,
    recommendations,
    summary: {
      transcriptId: analysis.transcript.id,
      channel: analysis.transcript.channel,
      primaryIntent,
      sentiment: analysis.sentiment.label,
      topIssue,
      escalationDetected: analysis.escalationDetected,
      agentScore: analysis.agentScore.score,
      customerFrustration: analysis.customerFrustration.score,
    },
  };
}
