export type Channel = 'voice' | 'chat' | 'email' | 'self-service';

export type HistoricalDataPoint = {
  timestamp: string;
  volume: number;
  avgHandleTimeSeconds: number;
  intent?: string;
  queue?: string;
  channel?: Channel;
};

export type ForecastRequest = {
  historicalData: HistoricalDataPoint[];
  forecastHours?: number;
  concurrencyFactor?: number;
  occupancyTarget?: number;
  shrinkage?: number;
};

export type ForecastWindow = {
  hourIndex: number;
  expectedVolume: number;
  expectedConcurrency: number;
  expectedHandleTimeSeconds: number;
  requiredAgents: number;
  slaRisk: 'low' | 'medium' | 'high';
};

export type ForecastResult = {
  generatedAt: string;
  windows: ForecastWindow[];
  peakWindows: ForecastWindow[];
  totals: {
    projectedInteractions: number;
    averageRequiredAgents: number;
    maxRequiredAgents: number;
  };
};

export type Agent = {
  id: string;
  name: string;
  skills: string[];
  channels: Channel[];
  availableHours: number[];
};

export type ScheduleRequest = {
  forecast: ForecastResult;
  agents: Agent[];
  requiredSkills?: string[];
  queue?: string;
  channel?: Channel;
  slaTargetSeconds?: number;
};

export type AgentShift = {
  agentId: string;
  agentName: string;
  startHour: number;
  endHour: number;
  assignedChannel: Channel;
  assignedQueue: string;
  notes: string[];
};

export type ScheduleResult = {
  shifts: AgentShift[];
  coverageByHour: Array<{
    hourIndex: number;
    requiredAgents: number;
    staffedAgents: number;
    gap: number;
  }>;
  summary: {
    totalAgentsScheduled: number;
    understaffedWindows: number;
    overstaffedWindows: number;
  };
};

export type RealtimeRequest = {
  forecast: ForecastResult;
  currentStaffingByHour: Array<{ hourIndex: number; staffedAgents: number }>;
  liveQueueDepthByHour?: Array<{ hourIndex: number; queueDepth: number }>;
};

export type RealtimeResult = {
  gaps: Array<{
    hourIndex: number;
    requiredAgents: number;
    staffedAgents: number;
    gap: number;
    slaRisk: 'low' | 'medium' | 'high';
    status: 'understaffed' | 'balanced' | 'overstaffed';
  }>;
  recommendations: string[];
  summary: {
    understaffed: number;
    overstaffed: number;
    slaRiskWindows: number;
  };
};

export type WorkforceReport = {
  forecast: ForecastResult;
  schedules: AgentShift[];
  realtime: RealtimeResult;
  gaps: RealtimeResult['gaps'];
  recommendations: string[];
  summary: {
    generatedAt: string;
    totalProjectedInteractions: number;
    maxRequiredAgents: number;
    understaffedWindows: number;
  };
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function ceil(n: number): number {
  return Math.max(0, Math.ceil(n));
}

export function generateForecast(input: ForecastRequest): ForecastResult {
  const forecastHours = input.forecastHours ?? 24;
  const concurrencyFactor = input.concurrencyFactor ?? 0.12;
  const occupancyTarget = input.occupancyTarget ?? 0.82;
  const shrinkage = input.shrinkage ?? 0.25;

  const baseVolume = avg(input.historicalData.map((d) => d.volume)) || 80;
  const baseAht = avg(input.historicalData.map((d) => d.avgHandleTimeSeconds)) || 420;

  const windows: ForecastWindow[] = [];
  for (let i = 0; i < forecastHours; i += 1) {
    const hourOfDay = i % 24;
    const peakMultiplier = hourOfDay >= 9 && hourOfDay <= 17 ? 1.25 : 0.8;
    const expectedVolume = Math.max(1, Math.round(baseVolume * peakMultiplier));
    const expectedHandleTimeSeconds = Math.max(60, Math.round(baseAht));
    const expectedConcurrency = Number((expectedVolume * concurrencyFactor).toFixed(2));

    const workloadSeconds = expectedVolume * expectedHandleTimeSeconds;
    const productiveSecondsPerAgent = 3600 * occupancyTarget * (1 - shrinkage);
    const requiredAgents = ceil(workloadSeconds / Math.max(1, productiveSecondsPerAgent));
    const slaRisk: ForecastWindow['slaRisk'] =
      requiredAgents >= 20 ? 'high' : requiredAgents >= 10 ? 'medium' : 'low';

    windows.push({ hourIndex: i, expectedVolume, expectedConcurrency, expectedHandleTimeSeconds, requiredAgents, slaRisk });
  }

  const peakWindows = [...windows].sort((a, b) => b.requiredAgents - a.requiredAgents).slice(0, 5);
  const maxRequiredAgents = Math.max(...windows.map((w) => w.requiredAgents));

  return {
    generatedAt: new Date().toISOString(),
    windows,
    peakWindows,
    totals: {
      projectedInteractions: windows.reduce((sum, w) => sum + w.expectedVolume, 0),
      averageRequiredAgents: Number(avg(windows.map((w) => w.requiredAgents)).toFixed(2)),
      maxRequiredAgents,
    },
  };
}

export function buildSchedule(input: ScheduleRequest): ScheduleResult {
  const fallbackChannel: Channel = input.channel ?? 'voice';
  const fallbackQueue = input.queue ?? 'queue-general';
  const shifts: AgentShift[] = [];

  input.agents.forEach((agent) => {
    if (agent.availableHours.length === 0) return;
    const sorted = [...agent.availableHours].sort((a, b) => a - b);
    shifts.push({
      agentId: agent.id,
      agentName: agent.name,
      startHour: sorted[0],
      endHour: sorted[sorted.length - 1] + 1,
      assignedChannel: agent.channels[0] ?? fallbackChannel,
      assignedQueue: fallbackQueue,
      notes: input.requiredSkills && input.requiredSkills.length > 0
        ? [`Skills matched: ${agent.skills.filter((s) => input.requiredSkills?.includes(s)).join(', ') || 'none'}`]
        : ['General coverage'],
    });
  });

  const coverageByHour = input.forecast.windows.map((window) => {
    const staffedAgents = shifts.filter((s) => window.hourIndex >= s.startHour && window.hourIndex < s.endHour).length;
    const gap = window.requiredAgents - staffedAgents;
    return { hourIndex: window.hourIndex, requiredAgents: window.requiredAgents, staffedAgents, gap };
  });

  return {
    shifts,
    coverageByHour,
    summary: {
      totalAgentsScheduled: shifts.length,
      understaffedWindows: coverageByHour.filter((h) => h.gap > 0).length,
      overstaffedWindows: coverageByHour.filter((h) => h.gap < 0).length,
    },
  };
}

export function analyzeRealtime(input: RealtimeRequest): RealtimeResult {
  const staffingMap = new Map(input.currentStaffingByHour.map((s) => [s.hourIndex, s.staffedAgents]));
  const queueMap = new Map((input.liveQueueDepthByHour ?? []).map((q) => [q.hourIndex, q.queueDepth]));

  const gaps = input.forecast.windows.map((window) => {
    const staffedAgents = staffingMap.get(window.hourIndex) ?? 0;
    const queueDepth = queueMap.get(window.hourIndex) ?? 0;
    const gap = window.requiredAgents - staffedAgents;
    const adjustedRisk: 'low' | 'medium' | 'high' =
      gap > 4 || queueDepth > 30 ? 'high' : gap > 1 || queueDepth > 10 ? 'medium' : window.slaRisk;

    const status: 'understaffed' | 'balanced' | 'overstaffed' = gap > 0 ? 'understaffed' : gap < 0 ? 'overstaffed' : 'balanced';
    return {
      hourIndex: window.hourIndex,
      requiredAgents: window.requiredAgents,
      staffedAgents,
      gap,
      slaRisk: adjustedRisk,
      status,
    };
  });

  const recommendations: string[] = [];
  const understaffed = gaps.filter((g) => g.status === 'understaffed');
  const overstaffed = gaps.filter((g) => g.status === 'overstaffed');
  const highRisk = gaps.filter((g) => g.slaRisk === 'high');

  if (understaffed.length > 0) recommendations.push('Reassign cross-skilled agents into understaffed queues during high-gap windows.');
  if (highRisk.length > 0) recommendations.push('Enable overtime and prioritize high-volume intents with skill-based routing.');
  if (overstaffed.length > 0) recommendations.push('Temporarily merge low-volume queues to optimize staffed capacity.');
  if (recommendations.length === 0) recommendations.push('Current staffing is balanced against forecasted demand.');

  return {
    gaps,
    recommendations,
    summary: {
      understaffed: understaffed.length,
      overstaffed: overstaffed.length,
      slaRiskWindows: highRisk.length,
    },
  };
}

export function generateWorkforceReport(params: {
  forecastInput: ForecastRequest;
  scheduleInput: Omit<ScheduleRequest, 'forecast'>;
  realtimeStaffing: RealtimeRequest['currentStaffingByHour'];
  liveQueueDepthByHour?: RealtimeRequest['liveQueueDepthByHour'];
}): WorkforceReport {
  const forecast = generateForecast(params.forecastInput);
  const schedule = buildSchedule({ ...params.scheduleInput, forecast });
  const realtime = analyzeRealtime({
    forecast,
    currentStaffingByHour: params.realtimeStaffing,
    liveQueueDepthByHour: params.liveQueueDepthByHour,
  });

  return {
    forecast,
    schedules: schedule.shifts,
    realtime,
    gaps: realtime.gaps,
    recommendations: realtime.recommendations,
    summary: {
      generatedAt: new Date().toISOString(),
      totalProjectedInteractions: forecast.totals.projectedInteractions,
      maxRequiredAgents: forecast.totals.maxRequiredAgents,
      understaffedWindows: realtime.summary.understaffed,
    },
  };
}
