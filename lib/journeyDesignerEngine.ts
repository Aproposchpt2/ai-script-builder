export type JourneyNode = {
  id: string;
  name: string;
  channel: 'voice' | 'chat' | 'email' | 'self-service';
  flowId: string;
  expectedCompletionRate: number;
};

export type JourneyDefinition = {
  id: string;
  name: string;
  touchpoints: JourneyNode[];
};

export type JourneySimulationResult = {
  timeline: Array<{
    touchpointId: string;
    touchpointName: string;
    step: number;
    experienceScore: number;
    dropoffRisk: 'low' | 'medium' | 'high';
  }>;
  overallScore: number;
  dropoffs: Array<{ touchpointId: string; reason: string }>;
  frictionPoints: Array<{ touchpointId: string; issue: string }>;
  recommendations: string[];
};

export function createJourney(input: Omit<JourneyDefinition, 'id'>): JourneyDefinition {
  return {
    id: `journey-${Date.now()}`,
    name: input.name,
    touchpoints: input.touchpoints,
  };
}

export function simulateJourney(journey: JourneyDefinition): JourneySimulationResult {
  const timeline = journey.touchpoints.map((tp, idx) => {
    const score = Math.max(45, Math.round(tp.expectedCompletionRate * 100) - (idx % 3 === 0 ? 8 : 0));
    const dropoffRisk: 'low' | 'medium' | 'high' = score < 60 ? 'high' : score < 75 ? 'medium' : 'low';
    return {
      touchpointId: tp.id,
      touchpointName: tp.name,
      step: idx + 1,
      experienceScore: score,
      dropoffRisk,
    };
  });

  const dropoffs = timeline
    .filter((t) => t.dropoffRisk === 'high')
    .map((t) => ({ touchpointId: t.touchpointId, reason: 'Low completion and repeated handoff friction' }));
  const frictionPoints = timeline
    .filter((t) => t.dropoffRisk !== 'low')
    .map((t) => ({ touchpointId: t.touchpointId, issue: 'Excessive effort detected across channel transitions' }));

  const recommendations: string[] = [];
  if (dropoffs.length > 0) recommendations.push('Simplify high-risk touchpoints with streamlined routing and fewer handoffs.');
  if (frictionPoints.length > 0) recommendations.push('Improve self-service containment before escalation to live agent.');
  if (recommendations.length === 0) recommendations.push('Journey is healthy; monitor weekly for drift.');

  const overallScore =
    timeline.length === 0 ? 0 : Number((timeline.reduce((sum, t) => sum + t.experienceScore, 0) / timeline.length).toFixed(2));

  return { timeline, overallScore, dropoffs, frictionPoints, recommendations };
}

export function analyzeJourney(journey: JourneyDefinition) {
  const simulation = simulateJourney(journey);
  return {
    journey,
    simulation,
    summary: {
      touchpoints: journey.touchpoints.length,
      highRiskTouchpoints: simulation.timeline.filter((t) => t.dropoffRisk === 'high').length,
      overallScore: simulation.overallScore,
    },
  };
}

