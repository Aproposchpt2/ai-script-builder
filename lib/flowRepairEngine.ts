type FlowOption = {
  id?: string;
  key?: number | string;
  label?: string;
  queue?: string;
  route?: string;
  target?: string;
};

type FlowNode = {
  id?: string;
  type?: string;
  label?: string;
  data?: Record<string, unknown>;
};

type FlowEdge = {
  id?: string;
  source?: string;
  target?: string;
};

export type FlowModel = {
  menu?: string;
  options?: FlowOption[];
  after_hours?: string | null;
  holiday?: string | null;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  messages?: {
    system?: string[];
    agent?: string[];
  };
};

type DiffEntry = {
  path: string;
  before: unknown;
  after: unknown;
  action: 'add' | 'update' | 'remove';
};

export type FlowRepairResult = {
  issues: string[];
  fixes: string[];
  optimizedFlow: FlowModel;
  diff: DiffEntry[];
  recommendations: string[];
  summary: {
    issueCount: number;
    fixCount: number;
    recommendationCount: number;
    nodesBefore: number;
    nodesAfter: number;
    optionsBefore: number;
    optionsAfter: number;
    complexityBefore: number;
    complexityAfter: number;
  };
};

function deepClone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function complexityScore(flow: FlowModel): number {
  return (
    (flow.options?.length ?? 0) * 10 +
    (flow.nodes?.length ?? 0) * 4 +
    (flow.edges?.length ?? 0) * 3 +
    (flow.after_hours ? 6 : 0) +
    (flow.holiday ? 6 : 0)
  );
}

function normalizeNodeType(type?: string): string {
  const t = (type ?? '').toLowerCase().trim();
  const allowed = new Set(['menu', 'option', 'queue', 'prompt', 'after_hours', 'holiday', 'error_handler']);
  if (allowed.has(t)) return t;
  return 'prompt';
}

function detectUnreachableNodes(flow: FlowModel): string[] {
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow.edges) ? flow.edges : [];
  if (nodes.length === 0 || edges.length === 0) return [];

  const incoming = new Map<string, number>();
  for (const n of nodes) {
    if (n.id) incoming.set(n.id, 0);
  }
  for (const e of edges) {
    if (!e.target) continue;
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  return nodes
    .filter((n) => n.id && (n.type ?? '').toLowerCase() !== 'menu' && (incoming.get(n.id) ?? 0) === 0)
    .map((n) => n.id as string);
}

function detectLoops(flow: FlowModel): string[] {
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow.edges) ? flow.edges : [];
  if (nodes.length === 0 || edges.length === 0) return [];

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }

  const loops = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function dfs(id: string) {
    if (visiting.has(id)) {
      loops.add(id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const nxt of adj.get(id) ?? []) dfs(nxt);
    visiting.delete(id);
    visited.add(id);
  }
  for (const n of nodes) {
    if (n.id) dfs(n.id);
  }
  return Array.from(loops);
}

function detectDeadEnds(flow: FlowModel): string[] {
  const options = Array.isArray(flow.options) ? flow.options : [];
  const deadByOptions = options
    .filter((o) => !(o.queue || o.route || o.target || flow.after_hours || flow.holiday))
    .map((o) => `option:${o.key ?? '?'}`);

  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow.edges) ? flow.edges : [];
  if (nodes.length === 0 || edges.length === 0) return deadByOptions;

  const out = new Map<string, number>();
  for (const n of nodes) if (n.id) out.set(n.id, 0);
  for (const e of edges) if (e.source) out.set(e.source, (out.get(e.source) ?? 0) + 1);
  const deadNodes = nodes
    .filter((n) => n.id && (out.get(n.id) ?? 0) === 0 && normalizeNodeType(n.type) !== 'queue')
    .map((n) => n.id as string);

  return [...deadByOptions, ...deadNodes];
}

function makeDiff(before: FlowModel, after: FlowModel): DiffEntry[] {
  const diff: DiffEntry[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of Array.from(keys)) {
    const b = (before as Record<string, unknown>)[k];
    const a = (after as Record<string, unknown>)[k];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    const action = b === undefined ? 'add' : a === undefined ? 'remove' : 'update';
    diff.push({ path: k, before: b, after: a, action });
  }
  return diff;
}

export function repairFlow(input: FlowModel): FlowRepairResult {
  const before = deepClone(input);
  const flow = deepClone(input);
  const issues: string[] = [];
  const fixes: string[] = [];
  const recommendations: string[] = [];

  // Ensure required fields
  if (!flow.menu) {
    issues.push('Missing required field: menu');
    flow.menu = 'Main Menu';
    fixes.push('Added default menu label.');
  }
  if (!Array.isArray(flow.options)) {
    issues.push('Missing required field: options');
    flow.options = [];
    fixes.push('Initialized options array.');
  }

  // Normalize option structure and IDs
  flow.options = flow.options.map((option, index) => {
    const normalized: FlowOption = {
      id: option.id || `opt-${index + 1}`,
      key: option.key ?? index + 1,
      label: (option.label ?? `Option ${index + 1}`).trim(),
      queue: (option.queue ?? '').trim(),
      route: option.route,
      target: option.target,
    };
    if (!option.id || option.key === undefined || !option.label) {
      issues.push(`Option ${index + 1} missing fields`);
      fixes.push(`Normalized option ${index + 1} with id/key/label defaults.`);
    }
    return normalized;
  });

  // Normalize nodes and IDs
  if (Array.isArray(flow.nodes)) {
    const seen = new Set<string>();
    flow.nodes = flow.nodes.map((node, idx) => {
      const id = (node.id ?? `node-${idx + 1}`).trim();
      const uniqueId = seen.has(id) ? `${id}-${idx + 1}` : id;
      seen.add(uniqueId);
      const normalizedType = normalizeNodeType(node.type);
      if (normalizedType !== (node.type ?? '').toLowerCase()) {
        issues.push(`Invalid node type on ${node.id ?? `node-${idx + 1}`}`);
        fixes.push(`Normalized node type for ${uniqueId} to ${normalizedType}.`);
      }
      return { ...node, id: uniqueId, type: normalizedType };
    });
  }

  // Remove broken transitions (edges referencing missing nodes)
  if (Array.isArray(flow.edges) && Array.isArray(flow.nodes)) {
    const nodeIds = new Set(flow.nodes.map((n) => n.id).filter(Boolean) as string[]);
    const beforeCount = flow.edges.length;
    flow.edges = flow.edges.filter((e) => e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));
    if (flow.edges.length < beforeCount) {
      issues.push('Broken transitions detected');
      fixes.push('Removed edges referencing missing nodes.');
    }
  }

  // Unreachable/orphan detection and fix
  const unreachable = detectUnreachableNodes(flow);
  if (unreachable.length > 0) {
    issues.push(...unreachable.map((id) => `Unreachable node: ${id}`));
    if (Array.isArray(flow.edges)) {
      const menuNode = flow.nodes?.find((n) => normalizeNodeType(n.type) === 'menu')?.id;
      if (menuNode) {
        unreachable.forEach((id, idx) => {
          flow.edges!.push({ id: `fix-link-${idx + 1}`, source: menuNode, target: id });
        });
        fixes.push(`Linked ${unreachable.length} unreachable node(s) to menu node.`);
      } else {
        fixes.push('Unable to auto-link unreachable nodes because menu node is missing.');
      }
    } else {
      fixes.push('Unreachable nodes detected in node graph; skipped edge repair (no edges array).');
    }
  }

  // Infinite loops detection and break simple self-loops
  const loops = detectLoops(flow);
  if (loops.length > 0) {
    issues.push(...loops.map((id) => `Infinite loop risk at node ${id}`));
    if (Array.isArray(flow.edges)) {
      const beforeLen = flow.edges.length;
      flow.edges = flow.edges.filter((e) => !(e.source && e.target && e.source === e.target));
      if (flow.edges.length < beforeLen) {
        fixes.push('Removed self-loop edges to break infinite loops.');
      }
    }
  }

  // Dead ends and fallback routing
  const deadEnds = detectDeadEnds(flow);
  if (deadEnds.length > 0) {
    issues.push(...deadEnds.map((d) => `Dead end detected: ${d}`));
    if (!flow.after_hours) {
      flow.after_hours = 'AfterHours_Default';
      fixes.push('Added default after-hours destination as fallback route.');
    }
    recommendations.push('Add explicit fallback routes for all options and terminal nodes.');
  }

  // Merge redundant nodes by label (first wins)
  if (Array.isArray(flow.nodes) && flow.nodes.length > 1) {
    const byLabel = new Map<string, string>();
    const removeIds = new Set<string>();
    for (const n of flow.nodes) {
      const label = (n.label ?? '').trim().toLowerCase();
      if (!label || !n.id) continue;
      const existing = byLabel.get(label);
      if (existing && existing !== n.id) {
        removeIds.add(n.id);
      } else {
        byLabel.set(label, n.id);
      }
    }
    if (removeIds.size > 0) {
      const beforeLen = flow.nodes.length;
      flow.nodes = flow.nodes.filter((n) => !n.id || !removeIds.has(n.id));
      if (Array.isArray(flow.edges)) {
        flow.edges = flow.edges.filter((e) => !removeIds.has(e.source ?? '') && !removeIds.has(e.target ?? ''));
      }
      fixes.push(`Merged redundant nodes (${beforeLen - flow.nodes.length} removed).`);
      recommendations.push('Review merged nodes to ensure business intent remains correct.');
    }
  }

  // Reduce routing depth by eliminating unnecessary option route hops when queue exists
  flow.options = flow.options.map((o) => {
    if (o.queue && (o.route || o.target)) {
      fixes.push(`Removed redundant route/target on option ${o.key}.`);
      return { ...o, route: undefined, target: undefined };
    }
    return o;
  });

  // Ensure error-handling node exists in graph workflows
  if (Array.isArray(flow.nodes)) {
    const hasErrorHandler = flow.nodes.some((n) => normalizeNodeType(n.type) === 'error_handler');
    if (!hasErrorHandler) {
      flow.nodes.push({
        id: 'error-handler-1',
        type: 'error_handler',
        label: 'Default Error Handler',
      });
      fixes.push('Added error-handler node.');
    }
  }

  // Best-practice enhancements
  const systemMessages = new Set(flow.messages?.system ?? []);
  const agentMessages = new Set(flow.messages?.agent ?? []);
  if (!systemMessages.has('Thank you for calling. Please listen carefully to the following options.')) {
    systemMessages.add('Thank you for calling. Please listen carefully to the following options.');
    fixes.push('Added recommended system greeting message.');
  }
  if (!agentMessages.has('Escalate to supervisor when customer requests manager support.')) {
    agentMessages.add('Escalate to supervisor when customer requests manager support.');
    fixes.push('Added recommended agent escalation message.');
  }
  flow.messages = {
    system: Array.from(systemMessages),
    agent: Array.from(agentMessages),
  };

  if (!flow.holiday) {
    flow.holiday = 'Holiday_Default';
    fixes.push('Added default holiday route for compliance.');
  }

  recommendations.push(
    'Add self-service options for top recurring intents.',
    'Add escalation path to live agent for unresolved interactions.',
    'Add fail-safe fallback for unknown input or timeout.'
  );

  const diff = makeDiff(before, flow);
  const uniqueIssues = Array.from(new Set(issues));
  const uniqueFixes = Array.from(new Set(fixes));
  const uniqueRecommendations = Array.from(new Set(recommendations));

  return {
    issues: uniqueIssues,
    fixes: uniqueFixes,
    optimizedFlow: flow,
    diff,
    recommendations: uniqueRecommendations,
    summary: {
      issueCount: uniqueIssues.length,
      fixCount: uniqueFixes.length,
      recommendationCount: uniqueRecommendations.length,
      nodesBefore: before.nodes?.length ?? 0,
      nodesAfter: flow.nodes?.length ?? 0,
      optionsBefore: before.options?.length ?? 0,
      optionsAfter: flow.options?.length ?? 0,
      complexityBefore: complexityScore(before),
      complexityAfter: complexityScore(flow),
    },
  };
}

