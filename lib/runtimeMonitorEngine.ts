import fs from 'fs';
import path from 'path';

export type RuntimeEnvironment = 'dev' | 'qa' | 'staging' | 'prod';
export type RuntimeSeverity = 'info' | 'warning' | 'error' | 'critical';
export type RuntimeStatus = 'ok' | 'error' | 'timeout';

export type RuntimeEvent = {
  id: string;
  timestamp: string;
  environment: RuntimeEnvironment;
  flowId: string;
  nodeId: string;
  type: 'route' | 'queue' | 'timeout' | 'unreachable_node' | 'routing_loop' | 'error';
  latencyMs: number;
  status: RuntimeStatus;
  severity: RuntimeSeverity;
  message: string;
};

export type RuntimeIncidentStatus = 'open' | 'acknowledged' | 'muted' | 'resolved';

export type RuntimeIncident = {
  id: string;
  key: string;
  rule: 'high_error_rate' | 'high_latency' | 'repeated_timeouts' | 'unreachable_node' | 'routing_loop';
  severity: RuntimeSeverity;
  impact: string;
  environment: RuntimeEnvironment;
  flowId: string;
  nodeId: string;
  status: RuntimeIncidentStatus;
  openedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  mutedUntil?: string;
  resolvedAt?: string;
  relatedEventIds: string[];
  remediationNotes: string;
};

export type RuntimeMuteRule = {
  id: string;
  createdAt: string;
  createdBy: string;
  environment?: RuntimeEnvironment;
  flowId?: string;
  nodeId?: string;
  eventType?: RuntimeEvent['type'];
  until: string;
};

export type RuntimeAction = {
  id: string;
  timestamp: string;
  type: 'acknowledge' | 'mute' | 'resolve';
  incidentId?: string;
  operator: string;
  details: string;
};

export type RuntimeReport = {
  id: string;
  generatedAt: string;
  incidentId?: string;
  timeRange?: { start: string; end: string };
  environment?: RuntimeEnvironment;
  summary: {
    eventCount: number;
    incidentCount: number;
    openIncidents: number;
    acknowledgedIncidents: number;
    mutedIncidents: number;
  };
  metrics: RuntimeMetrics;
  incidents: RuntimeIncident[];
  events: RuntimeEvent[];
};

export type RuntimeMetrics = {
  latency: { avg: number; p95: number; p99: number };
  throughput: { eventsPerMinute: number; eventsPerSecond: number };
  errorRates: Record<string, number>;
  bottlenecks: Array<{ flowId: string; nodeId: string; score: number; reason: string }>;
};

type RuntimeState = {
  events: RuntimeEvent[];
  incidents: RuntimeIncident[];
  mutes: RuntimeMuteRule[];
  actions: RuntimeAction[];
  reports: RuntimeReport[];
};

type EventFilters = {
  environment?: RuntimeEnvironment;
  flowId?: string;
  nodeId?: string;
  severity?: RuntimeSeverity;
  minutes?: number;
};

const STORE_PATH = path.join(process.cwd(), '.ai4-runtime-monitor-store.json');
const FLOWS = ['enrollment', 'billing', 'support', 'operator'];
const NODES = ['menu-main', 'queue-a', 'queue-b', 'after-hours', 'holiday', 'handoff'];
const ENVIRONMENTS: RuntimeEnvironment[] = ['dev', 'qa', 'staging', 'prod'];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultState(): RuntimeState {
  return {
    events: [],
    incidents: [],
    mutes: [],
    actions: [],
    reports: [],
  };
}

function readState(): RuntimeState {
  if (!fs.existsSync(STORE_PATH)) return defaultState();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as RuntimeState;
    if (!parsed || !Array.isArray(parsed.events) || !Array.isArray(parsed.incidents)) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function writeState(state: RuntimeState) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function computeSeverity(status: RuntimeStatus, latencyMs: number, eventType: RuntimeEvent['type']): RuntimeSeverity {
  if (eventType === 'routing_loop' || eventType === 'unreachable_node') return 'critical';
  if (status === 'timeout') return 'error';
  if (status === 'error') return latencyMs > 1800 ? 'critical' : 'error';
  if (latencyMs > 1300) return 'warning';
  return 'info';
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function isIncidentMuted(state: RuntimeState, event: RuntimeEvent): boolean {
  const now = Date.now();
  const activeRules = state.mutes.filter((rule) => new Date(rule.until).getTime() > now);
  return activeRules.some((rule) => {
    if (rule.environment && rule.environment !== event.environment) return false;
    if (rule.flowId && rule.flowId !== event.flowId) return false;
    if (rule.nodeId && rule.nodeId !== event.nodeId) return false;
    if (rule.eventType && rule.eventType !== event.type) return false;
    return true;
  });
}

function createOrUpdateIncident(
  state: RuntimeState,
  params: {
    key: string;
    rule: RuntimeIncident['rule'];
    severity: RuntimeSeverity;
    impact: string;
    event: RuntimeEvent;
  }
) {
  const existing = state.incidents.find((incident) => incident.key === params.key && incident.status !== 'resolved');
  if (existing) {
    if (!existing.relatedEventIds.includes(params.event.id)) {
      existing.relatedEventIds.unshift(params.event.id);
      if (existing.relatedEventIds.length > 50) existing.relatedEventIds = existing.relatedEventIds.slice(0, 50);
    }
    if (existing.status === 'acknowledged') return;
    const muted = isIncidentMuted(state, params.event);
    if (muted) existing.status = 'muted';
    return;
  }

  const muted = isIncidentMuted(state, params.event);
  state.incidents.unshift({
    id: makeId('incident'),
    key: params.key,
    rule: params.rule,
    severity: params.severity,
    impact: params.impact,
    environment: params.event.environment,
    flowId: params.event.flowId,
    nodeId: params.event.nodeId,
    status: muted ? 'muted' : 'open',
    openedAt: nowIso(),
    mutedUntil: muted ? nowIso() : undefined,
    relatedEventIds: [params.event.id],
    remediationNotes:
      params.rule === 'high_latency'
        ? 'Review queue capacity and optimize branch depth for this node.'
        : params.rule === 'high_error_rate'
        ? 'Inspect recent deployment and prompt logic for this flow/node.'
        : params.rule === 'repeated_timeouts'
        ? 'Validate upstream dependencies and increase timeout safeguards.'
        : params.rule === 'unreachable_node'
        ? 'Reconnect or remove unreachable nodes in the flow model.'
        : 'Review routing loops and add terminal routes.',
  });
}

function detectIncidentsForEvent(state: RuntimeState, event: RuntimeEvent) {
  const windowStart = Date.now() - 5 * 60 * 1000;
  const recent = state.events.filter(
    (ev) =>
      ev.environment === event.environment &&
      ev.flowId === event.flowId &&
      ev.nodeId === event.nodeId &&
      new Date(ev.timestamp).getTime() >= windowStart
  );
  const errorCount = recent.filter((ev) => ev.status !== 'ok').length;
  const timeoutCount = recent.filter((ev) => ev.status === 'timeout').length;
  const errorRate = recent.length > 0 ? errorCount / recent.length : 0;
  const p95 = percentile(recent.map((ev) => ev.latencyMs), 95);

  if (errorRate >= 0.3 && recent.length >= 10) {
    createOrUpdateIncident(state, {
      key: `err-rate|${event.environment}|${event.flowId}|${event.nodeId}`,
      rule: 'high_error_rate',
      severity: 'error',
      impact: `Error rate at ${(errorRate * 100).toFixed(1)}%`,
      event,
    });
  }

  if (p95 >= 1500 && recent.length >= 10) {
    createOrUpdateIncident(state, {
      key: `latency|${event.environment}|${event.flowId}|${event.nodeId}`,
      rule: 'high_latency',
      severity: p95 > 2200 ? 'critical' : 'warning',
      impact: `P95 latency ${p95.toFixed(0)}ms`,
      event,
    });
  }

  if (timeoutCount >= 5) {
    createOrUpdateIncident(state, {
      key: `timeouts|${event.environment}|${event.flowId}|${event.nodeId}`,
      rule: 'repeated_timeouts',
      severity: 'error',
      impact: `${timeoutCount} timeouts in the last 5 minutes`,
      event,
    });
  }

  if (event.type === 'unreachable_node') {
    createOrUpdateIncident(state, {
      key: `unreachable|${event.environment}|${event.flowId}|${event.nodeId}`,
      rule: 'unreachable_node',
      severity: 'critical',
      impact: 'Runtime unreachable node event detected',
      event,
    });
  }

  if (event.type === 'routing_loop') {
    createOrUpdateIncident(state, {
      key: `loop|${event.environment}|${event.flowId}|${event.nodeId}`,
      rule: 'routing_loop',
      severity: 'critical',
      impact: 'Routing loop detected',
      event,
    });
  }
}

function normalizeEvent(raw: Omit<RuntimeEvent, 'id' | 'timestamp' | 'severity'> & { severity?: RuntimeSeverity }): RuntimeEvent {
  const severity = raw.severity ?? computeSeverity(raw.status, raw.latencyMs, raw.type);
  return {
    id: makeId('evt'),
    timestamp: nowIso(),
    environment: raw.environment,
    flowId: raw.flowId,
    nodeId: raw.nodeId,
    type: raw.type,
    latencyMs: raw.latencyMs,
    status: raw.status,
    severity,
    message: raw.message,
  };
}

export function ingestEvents(events: Array<Omit<RuntimeEvent, 'id' | 'timestamp' | 'severity'> & { severity?: RuntimeSeverity }>) {
  const state = readState();
  const normalized = events.map((event) => normalizeEvent(event));
  normalized.forEach((event) => {
    state.events.unshift(event);
    detectIncidentsForEvent(state, event);
  });
  if (state.events.length > 5000) state.events = state.events.slice(0, 5000);
  writeState(state);
  return deepClone(normalized);
}

export function ingestMockEvents(environment: RuntimeEnvironment, count = 25) {
  const generated: Array<Omit<RuntimeEvent, 'id' | 'timestamp' | 'severity'> & { severity?: RuntimeSeverity }> = [];
  for (let i = 0; i < count; i += 1) {
    const flowId = pickOne(FLOWS);
    const nodeId = pickOne(NODES);
    const eventType = pickOne<RuntimeEvent['type']>(['route', 'queue', 'error', 'timeout', 'route', 'queue', 'route']);
    const status: RuntimeStatus =
      eventType === 'timeout' ? 'timeout' : eventType === 'error' ? 'error' : Math.random() > 0.92 ? 'error' : 'ok';
    const latencyBase = status === 'timeout' ? 2800 : status === 'error' ? 1400 : 350;
    const jitter = Math.floor(Math.random() * 900);
    generated.push({
      environment,
      flowId,
      nodeId,
      type: eventType,
      latencyMs: latencyBase + jitter,
      status,
      message: `${eventType} event on ${flowId}/${nodeId}`,
    });
  }

  if (Math.random() > 0.8) {
    generated.push({
      environment,
      flowId: pickOne(FLOWS),
      nodeId: pickOne(NODES),
      type: 'routing_loop',
      latencyMs: 2200 + Math.floor(Math.random() * 700),
      status: 'error',
      message: 'Routing loop anomaly detected',
    });
  }
  if (Math.random() > 0.85) {
    generated.push({
      environment,
      flowId: pickOne(FLOWS),
      nodeId: pickOne(NODES),
      type: 'unreachable_node',
      latencyMs: 1700 + Math.floor(Math.random() * 600),
      status: 'error',
      message: 'Unreachable node anomaly detected',
    });
  }

  return ingestEvents(generated);
}

export function computeMetrics(events: RuntimeEvent[]): RuntimeMetrics {
  const latencySeries = events.map((event) => event.latencyMs);
  const avg = latencySeries.length > 0 ? latencySeries.reduce((sum, value) => sum + value, 0) / latencySeries.length : 0;
  const p95 = percentile(latencySeries, 95);
  const p99 = percentile(latencySeries, 99);

  const minuteWindowStart = Date.now() - 60 * 1000;
  const perMinute = events.filter((event) => new Date(event.timestamp).getTime() >= minuteWindowStart).length;
  const throughput = {
    eventsPerMinute: perMinute,
    eventsPerSecond: Number((perMinute / 60).toFixed(3)),
  };

  const groups = new Map<string, RuntimeEvent[]>();
  events.forEach((event) => {
    const key = `${event.flowId}:${event.nodeId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(event);
  });

  const errorRates: Record<string, number> = {};
  const bottlenecks: RuntimeMetrics['bottlenecks'] = [];
  Array.from(groups.entries()).forEach(([key, values]) => {
    const [flowId, nodeId] = key.split(':');
    const errors = values.filter((event) => event.status !== 'ok').length;
    const errorRate = values.length > 0 ? errors / values.length : 0;
    errorRates[key] = Number(errorRate.toFixed(4));
    const nodeP95 = percentile(values.map((event) => event.latencyMs), 95);
    const score = nodeP95 * 0.65 + errorRate * 1000 * 0.35;
    if (score > 700) {
      bottlenecks.push({
        flowId,
        nodeId,
        score: Number(score.toFixed(1)),
        reason: `P95 ${nodeP95.toFixed(0)}ms, error ${(errorRate * 100).toFixed(1)}%`,
      });
    }
  });

  bottlenecks.sort((a, b) => b.score - a.score);

  return {
    latency: { avg: Number(avg.toFixed(2)), p95, p99 },
    throughput,
    errorRates,
    bottlenecks: bottlenecks.slice(0, 10),
  };
}

function applyEventFilters(state: RuntimeState, filters: EventFilters): RuntimeEvent[] {
  const minutes = filters.minutes ?? 30;
  const start = Date.now() - minutes * 60 * 1000;
  return state.events.filter((event) => {
    if (new Date(event.timestamp).getTime() < start) return false;
    if (filters.environment && event.environment !== filters.environment) return false;
    if (filters.flowId && event.flowId !== filters.flowId) return false;
    if (filters.nodeId && event.nodeId !== filters.nodeId) return false;
    if (filters.severity && event.severity !== filters.severity) return false;
    return true;
  });
}

function refreshMutedIncidents(state: RuntimeState) {
  const now = Date.now();
  state.incidents.forEach((incident) => {
    if (incident.status === 'muted' && incident.mutedUntil && new Date(incident.mutedUntil).getTime() <= now) {
      incident.status = 'open';
      incident.mutedUntil = undefined;
    }
  });
}

export function getRuntimeSnapshot(filters: EventFilters) {
  const state = readState();
  refreshMutedIncidents(state);
  const events = applyEventFilters(state, filters);
  const incidents = state.incidents.filter((incident) => {
    if (filters.environment && incident.environment !== filters.environment) return false;
    if (filters.flowId && incident.flowId !== filters.flowId) return false;
    if (filters.nodeId && incident.nodeId !== filters.nodeId) return false;
    if (filters.severity && incident.severity !== filters.severity) return false;
    return true;
  });

  const metrics = computeMetrics(events);
  const availableFlows = Array.from(new Set(events.map((event) => event.flowId))).sort();
  const availableNodes = Array.from(new Set(events.map((event) => event.nodeId))).sort();
  writeState(state);

  return {
    events: deepClone(events.slice(0, 250)),
    metrics,
    incidents: deepClone(incidents.slice(0, 100)),
    actions: deepClone(state.actions.slice(0, 200)),
    reports: deepClone(state.reports.slice(0, 50)),
    availableFlows,
    availableNodes,
  };
}

export function listIncidents(params: {
  environment?: RuntimeEnvironment;
  status?: RuntimeIncidentStatus;
  minutes?: number;
}) {
  const state = readState();
  refreshMutedIncidents(state);
  const start = Date.now() - (params.minutes ?? 24 * 60) * 60 * 1000;
  const incidents = state.incidents.filter((incident) => {
    if (new Date(incident.openedAt).getTime() < start) return false;
    if (params.environment && incident.environment !== params.environment) return false;
    if (params.status && incident.status !== params.status) return false;
    return true;
  });
  writeState(state);
  return {
    incidents: deepClone(incidents.slice(0, 200)),
    openCount: incidents.filter((incident) => incident.status === 'open').length,
    acknowledgedCount: incidents.filter((incident) => incident.status === 'acknowledged').length,
    mutedCount: incidents.filter((incident) => incident.status === 'muted').length,
    resolvedCount: incidents.filter((incident) => incident.status === 'resolved').length,
  };
}

export function acknowledgeIncident(incidentId: string, operator: string) {
  const state = readState();
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) throw new Error('Incident not found');
  incident.status = 'acknowledged';
  incident.acknowledgedAt = nowIso();
  incident.acknowledgedBy = operator.trim() || 'operator';

  state.actions.unshift({
    id: makeId('action'),
    timestamp: nowIso(),
    type: 'acknowledge',
    incidentId: incident.id,
    operator: incident.acknowledgedBy,
    details: `Acknowledged ${incident.rule}`,
  });

  writeState(state);
  return deepClone(incident);
}

export function muteIncidents(params: {
  operator: string;
  incidentId?: string;
  environment?: RuntimeEnvironment;
  flowId?: string;
  nodeId?: string;
  eventType?: RuntimeEvent['type'];
  durationMinutes: number;
}) {
  const state = readState();
  const durationMs = Math.max(1, params.durationMinutes) * 60 * 1000;
  const until = new Date(Date.now() + durationMs).toISOString();
  const operator = params.operator.trim() || 'operator';

  if (params.incidentId) {
    const incident = state.incidents.find((item) => item.id === params.incidentId);
    if (!incident) throw new Error('Incident not found');
    incident.status = 'muted';
    incident.mutedUntil = until;
    state.actions.unshift({
      id: makeId('action'),
      timestamp: nowIso(),
      type: 'mute',
      incidentId: incident.id,
      operator,
      details: `Muted incident until ${until}`,
    });
    writeState(state);
    return { mutedIncident: deepClone(incident), muteRule: null };
  }

  const rule: RuntimeMuteRule = {
    id: makeId('mute'),
    createdAt: nowIso(),
    createdBy: operator,
    environment: params.environment,
    flowId: params.flowId,
    nodeId: params.nodeId,
    eventType: params.eventType,
    until,
  };
  state.mutes.unshift(rule);
  state.actions.unshift({
    id: makeId('action'),
    timestamp: nowIso(),
    type: 'mute',
    operator,
    details: `Created mute rule ${rule.id}`,
  });
  writeState(state);
  return { mutedIncident: null, muteRule: deepClone(rule) };
}

export function generateIncidentReport(params: {
  incidentId?: string;
  start?: string;
  end?: string;
  environment?: RuntimeEnvironment;
}): RuntimeReport {
  const state = readState();
  let scopedIncidents = state.incidents;
  let scopedEvents = state.events;

  if (params.environment && ENVIRONMENTS.includes(params.environment)) {
    scopedIncidents = scopedIncidents.filter((incident) => incident.environment === params.environment);
    scopedEvents = scopedEvents.filter((event) => event.environment === params.environment);
  }

  if (params.incidentId) {
    const incident = state.incidents.find((item) => item.id === params.incidentId);
    if (!incident) throw new Error('Incident not found');
    scopedIncidents = [incident];
    const ids = new Set(incident.relatedEventIds);
    scopedEvents = state.events.filter((event) => ids.has(event.id));
  } else if (params.start || params.end) {
    const startTs = params.start ? new Date(params.start).getTime() : Date.now() - 60 * 60 * 1000;
    const endTs = params.end ? new Date(params.end).getTime() : Date.now();
    scopedEvents = scopedEvents.filter((event) => {
      const ts = new Date(event.timestamp).getTime();
      return ts >= startTs && ts <= endTs;
    });
    scopedIncidents = scopedIncidents.filter((incident) => {
      const ts = new Date(incident.openedAt).getTime();
      return ts >= startTs && ts <= endTs;
    });
  }

  const metrics = computeMetrics(scopedEvents);
  const report: RuntimeReport = {
    id: makeId('report'),
    generatedAt: nowIso(),
    incidentId: params.incidentId,
    environment: params.environment,
    timeRange: params.start || params.end ? { start: params.start ?? '', end: params.end ?? '' } : undefined,
    summary: {
      eventCount: scopedEvents.length,
      incidentCount: scopedIncidents.length,
      openIncidents: scopedIncidents.filter((incident) => incident.status === 'open').length,
      acknowledgedIncidents: scopedIncidents.filter((incident) => incident.status === 'acknowledged').length,
      mutedIncidents: scopedIncidents.filter((incident) => incident.status === 'muted').length,
    },
    metrics,
    incidents: deepClone(scopedIncidents),
    events: deepClone(scopedEvents),
  };

  state.reports.unshift(report);
  if (state.reports.length > 100) state.reports = state.reports.slice(0, 100);
  writeState(state);
  return deepClone(report);
}
