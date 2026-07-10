type OptionLike = {
  key?: number | string;
  label?: string;
  queue?: string;
  route?: string;
  target?: string;
  next_menu?: string;
};

type NodeLike = {
  id?: string;
  type?: string;
  label?: string;
  data?: { label?: string; queueName?: string; destination?: string };
};

type EdgeLike = {
  source?: string;
  target?: string;
};

export type RoutingScript = {
  menu?: string;
  options?: OptionLike[];
  after_hours?: string | null;
  holiday?: string | null;
  nodes?: NodeLike[];
  edges?: EdgeLike[];
};

export type RoutingReport = {
  issues: string[];
  optimizations: string[];
  recommendations: string[];
};

function getQueueName(option: OptionLike): string {
  return (option.queue ?? '').trim();
}

function nodeLabel(node: NodeLike): string {
  return (node.data?.label ?? node.label ?? node.id ?? '').trim();
}

export function checkMissingFallbacks(script: RoutingScript): string[] {
  const issues: string[] = [];
  const options = Array.isArray(script.options) ? script.options : [];
  for (const option of options) {
    const optionId = option.key ?? '?';
    const hasRoute = Boolean(option.route || option.target || option.next_menu);
    const hasQueue = Boolean(getQueueName(option));
    if (!hasQueue && !hasRoute) {
      issues.push(`Menu option ${optionId} has no fallback route.`);
    }
  }
  return issues;
}

export function checkQueueLoad(script: RoutingScript): string[] {
  const optimizations: string[] = [];
  const options = Array.isArray(script.options) ? script.options : [];
  const queueCount = new Map<string, number>();
  for (const option of options) {
    const queue = getQueueName(option);
    if (!queue) continue;
    queueCount.set(queue, (queueCount.get(queue) ?? 0) + 1);
  }
  for (const [queue, count] of Array.from(queueCount.entries())) {
    if (count > 1) optimizations.push(`Queue ${queue} may be overloaded.`);
  }
  return optimizations;
}

export function checkMissingHours(script: RoutingScript): string[] {
  if (!script.after_hours) return ['Add after-hours routing to avoid abandoned calls.'];
  return [];
}

export function checkMissingHoliday(script: RoutingScript): string[] {
  if (!script.holiday) return ['Add holiday routing for compliance.'];
  return [];
}

export function checkRedundantNodes(script: RoutingScript): string[] {
  const optimizations: string[] = [];
  const labels = new Map<string, number>();
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const options = Array.isArray(script.options) ? script.options : [];

  for (const node of nodes) {
    const label = nodeLabel(node);
    if (!label) continue;
    const key = label.toLowerCase();
    labels.set(key, (labels.get(key) ?? 0) + 1);
  }
  for (const option of options) {
    const label = (option.label ?? '').trim();
    if (!label) continue;
    const key = label.toLowerCase();
    labels.set(key, (labels.get(key) ?? 0) + 1);
  }

  for (const [label, count] of Array.from(labels.entries())) {
    if (count > 1) {
      optimizations.push(`Redundant node detected: ${label}`);
    }
  }
  return optimizations;
}

function maxDepthFrom(rootId: string, edges: EdgeLike[]): number {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const visited = new Set<string>();
  function dfs(nodeId: string, depth: number): number {
    const visitKey = `${nodeId}:${depth}`;
    if (visited.has(visitKey)) return depth;
    visited.add(visitKey);
    const targets = adjacency.get(nodeId) ?? [];
    if (targets.length === 0) return depth;
    let maxDepth = depth;
    for (const target of targets) {
      maxDepth = Math.max(maxDepth, dfs(target, depth + 1));
    }
    return maxDepth;
  }
  return dfs(rootId, 1);
}

export function checkRoutingDepth(script: RoutingScript): string[] {
  const optimizations: string[] = [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];

  if (nodes.length > 0 && edges.length > 0) {
    const menuNode = nodes.find((n) => (n.type ?? '').toLowerCase() === 'menu') ?? nodes[0];
    const rootId = menuNode.id;
    if (rootId) {
      const depth = maxDepthFrom(rootId, edges);
      if (depth > 3) optimizations.push('Routing depth is too high; consider simplifying.');
    }
    return optimizations;
  }

  // Fallback for flat script format (menu -> option -> queue)
  if ((script.options?.length ?? 0) > 3) {
    // Flat options are depth 2, so no warning here unless explicit nested routes are present.
  }

  return optimizations;
}

export function checkQueueNaming(script: RoutingScript): string[] {
  const recommendations: string[] = [];
  const options = Array.isArray(script.options) ? script.options : [];
  for (const option of options) {
    const queue = getQueueName(option);
    if (queue && /\s/.test(queue)) {
      recommendations.push('Queue names should not contain spaces.');
      break;
    }
  }
  return recommendations;
}

export function checkUnreachableNodes(script: RoutingScript): string[] {
  const issues: string[] = [];
  const nodes = Array.isArray(script.nodes) ? script.nodes : [];
  const edges = Array.isArray(script.edges) ? script.edges : [];
  if (nodes.length === 0) return issues;

  const incoming = new Map<string, number>();
  for (const node of nodes) {
    if (node.id) incoming.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!edge.target) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  for (const node of nodes) {
    const id = node.id;
    if (!id) continue;
    const isMenu = (node.type ?? '').toLowerCase() === 'menu';
    const count = incoming.get(id) ?? 0;
    if (!isMenu && count === 0) {
      issues.push(`Node ${nodeLabel(node) || id} is unreachable.`);
    }
  }
  return issues;
}

export function buildRoutingReport(script: RoutingScript): RoutingReport {
  const issues: string[] = [];
  const optimizations: string[] = [];
  const recommendations: string[] = [];

  issues.push(...checkMissingFallbacks(script));
  issues.push(...checkUnreachableNodes(script));

  optimizations.push(...checkQueueLoad(script));
  optimizations.push(...checkRedundantNodes(script));
  optimizations.push(...checkRoutingDepth(script));

  recommendations.push(...checkMissingHours(script));
  recommendations.push(...checkMissingHoliday(script));
  recommendations.push(...checkQueueNaming(script));

  return {
    issues: Array.from(new Set(issues)),
    optimizations: Array.from(new Set(optimizations)),
    recommendations: Array.from(new Set(recommendations)),
  };
}
