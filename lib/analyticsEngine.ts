type OptionLike = { key?: number | string; label?: string; queue?: string };
type NodeLike = { id?: string; type?: string };
type EdgeLike = { source?: string; target?: string };

export type AnalyticsInput = {
  options?: OptionLike[];
  after_hours?: string | null;
  holiday?: string | null;
  nodes?: NodeLike[];
  edges?: EdgeLike[];
  warnings?: string[];
  errors?: string[];
  recommendations?: string[];
  issues?: string[];
  optimizations?: string[];
};

export type AnalyticsReport = {
  metrics: {
    menuOptions: number;
    queues: number;
    routingDepth: number;
    unreachableNodes: number;
    warnings: number;
    errors: number;
    recommendations: number;
  };
  insights: string[];
  recommendations: string[];
};

export function countMenuOptions(script: AnalyticsInput): number {
  return Array.isArray(script.options) ? script.options.length : 0;
}

export function countQueues(script: AnalyticsInput): number {
  const options = Array.isArray(script.options) ? script.options : [];
  const queues = new Set<string>();
  for (const option of options) {
    const queue = (option.queue ?? '').trim();
    if (queue) queues.add(queue);
  }
  return queues.size;
}

function graphRoutingDepth(script: AnalyticsInput): number {
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0 || edges.length === 0) return 0;

  const root = nodes.find((n) => (n.type ?? '').toLowerCase() === 'menu') ?? nodes[0];
  if (!root?.id) return 0;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  function dfs(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return 0;
    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);
    const children = adjacency.get(nodeId) ?? [];
    if (children.length === 0) return 1;
    let maxDepth = 1;
    for (const child of children) {
      maxDepth = Math.max(maxDepth, 1 + dfs(child, nextVisited));
    }
    return maxDepth;
  }

  return dfs(root.id, new Set());
}

export function calculateRoutingDepth(script: AnalyticsInput): number {
  const graphDepth = graphRoutingDepth(script);
  if (graphDepth > 0) return graphDepth;

  const options = Array.isArray(script.options) ? script.options : [];
  if (options.length === 0) return 1;
  return 3;
}

export function countUnreachableNodes(script: AnalyticsInput): number {
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0) return 0;

  const incoming = new Map<string, number>();
  for (const node of nodes) {
    if (node.id) incoming.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!edge.target) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  let unreachable = 0;
  for (const node of nodes) {
    const id = node.id;
    if (!id) continue;
    const isMenu = (node.type ?? '').toLowerCase() === 'menu';
    if (!isMenu && (incoming.get(id) ?? 0) === 0) unreachable += 1;
  }
  return unreachable;
}

export function countWarnings(script: AnalyticsInput): number {
  const direct = Array.isArray(script.warnings) ? script.warnings.length : 0;
  const optimizerIssues = Array.isArray(script.issues) ? script.issues.length : 0;
  const optimizerOptimizations = Array.isArray(script.optimizations) ? script.optimizations.length : 0;
  return direct + optimizerIssues + optimizerOptimizations;
}

export function countErrors(script: AnalyticsInput): number {
  return Array.isArray(script.errors) ? script.errors.length : 0;
}

export function countRecommendations(script: AnalyticsInput): number {
  return Array.isArray(script.recommendations) ? script.recommendations.length : 0;
}

function buildInsights(script: AnalyticsInput, metrics: AnalyticsReport['metrics']): string[] {
  const insights: string[] = [];
  if (metrics.routingDepth > 3) {
    insights.push('Routing depth is high; consider simplifying.');
  }

  const options = Array.isArray(script.options) ? script.options : [];
  const queueCounts = new Map<string, number>();
  for (const option of options) {
    const queue = (option.queue ?? '').trim();
    if (!queue) continue;
    queueCounts.set(queue, (queueCounts.get(queue) ?? 0) + 1);
  }
  const hasOverload = Array.from(queueCounts.values()).some((count) => count > 1);
  if (hasOverload) {
    insights.push('Multiple options route to the same queue; potential overload.');
  }

  if (!script.holiday) {
    insights.push('Holiday logic missing; compliance risk.');
  }

  if (metrics.unreachableNodes > 0) {
    insights.push('Unreachable nodes detected; review flow connectivity.');
  }

  if (insights.length === 0) {
    insights.push('Core routing metrics look stable for this logic model.');
  }

  return insights;
}

function buildRecommendations(script: AnalyticsInput, metrics: AnalyticsReport['metrics']): string[] {
  const recommendations = new Set<string>();
  if (metrics.routingDepth > 3) recommendations.add('Reduce routing depth to 3 levels or fewer.');
  if (!script.after_hours) recommendations.add('Add after-hours routing coverage.');
  if (!script.holiday) recommendations.add('Add holiday routing coverage.');
  if (metrics.unreachableNodes > 0) recommendations.add('Remove or reconnect unreachable nodes.');

  const incomingRecommendations = Array.isArray(script.recommendations) ? script.recommendations : [];
  for (const rec of incomingRecommendations) recommendations.add(rec);

  return Array.from(recommendations);
}

export function buildAnalyticsReport(script: AnalyticsInput): AnalyticsReport {
  const metrics: AnalyticsReport['metrics'] = {
    menuOptions: countMenuOptions(script),
    queues: countQueues(script),
    routingDepth: calculateRoutingDepth(script),
    unreachableNodes: countUnreachableNodes(script),
    warnings: countWarnings(script),
    errors: countErrors(script),
    recommendations: countRecommendations(script),
  };

  return {
    metrics,
    insights: buildInsights(script, metrics),
    recommendations: buildRecommendations(script, metrics),
  };
}

