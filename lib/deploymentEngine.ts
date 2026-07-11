import fs from 'fs';
import path from 'path';
import { listVersions, type FlowJson } from '@/lib/versioningEngine';

export type EnvironmentName = 'dev' | 'qa' | 'staging' | 'production';

export type ValidationReport = {
  isValid: boolean;
  structural: string[];
  logic: string[];
  routing: string[];
  bestPractice: string[];
  warnings: string[];
  errors: string[];
  recommendations: string[];
};

export type DeploymentSnapshot = {
  id: string;
  environment: EnvironmentName;
  versionId: string | null;
  flow: FlowJson;
  timestamp: string;
  metadata: {
    user: string;
    notes: string;
    action: 'deploy' | 'promote' | 'rollback';
    sourceEnvironment?: EnvironmentName;
  };
  validation: ValidationReport;
};

export type EnvironmentRecord = {
  name: EnvironmentName;
  currentSnapshotId: string | null;
  historySnapshotIds: string[];
  locked: boolean;
};

export type DeploymentAuditEvent = {
  id: string;
  timestamp: string;
  type: 'deployment' | 'promotion' | 'rollback';
  message: string;
  metadata?: Record<string, unknown>;
};

type DeploymentState = {
  environments: Record<EnvironmentName, EnvironmentRecord>;
  snapshots: Record<string, DeploymentSnapshot>;
  auditLog: DeploymentAuditEvent[];
};

export type DeploymentDiffReport = {
  environmentA: EnvironmentName;
  environmentB: EnvironmentName;
  structuralDiff: Array<{ key: string; action: 'add' | 'remove' | 'update'; before: unknown; after: unknown }>;
  logicDiff: string[];
  routingDiff: string[];
  recommendations: string[];
};

export type DeploymentReport = {
  status: 'deployed';
  environment: EnvironmentName;
  snapshot: DeploymentSnapshot;
  validation: ValidationReport;
};

export type PromotionReport = {
  status: 'promoted';
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  snapshot: DeploymentSnapshot;
  validation: ValidationReport;
};

export type RollbackStatus = {
  status: 'rolled_back';
  environment: EnvironmentName;
  activeSnapshotId: string;
  rolledBackToSnapshotId: string;
};

const ENVIRONMENTS: EnvironmentName[] = ['dev', 'qa', 'staging', 'production'];
const STORE_PATH = path.join(process.cwd(), '.ai4-flow-deployment-store.json');

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultState(): DeploymentState {
  return {
    environments: {
      dev: { name: 'dev', currentSnapshotId: null, historySnapshotIds: [], locked: false },
      qa: { name: 'qa', currentSnapshotId: null, historySnapshotIds: [], locked: false },
      staging: { name: 'staging', currentSnapshotId: null, historySnapshotIds: [], locked: false },
      production: { name: 'production', currentSnapshotId: null, historySnapshotIds: [], locked: false },
    },
    snapshots: {},
    auditLog: [],
  };
}

function readState(): DeploymentState {
  if (!fs.existsSync(STORE_PATH)) return defaultState();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as DeploymentState;
    if (!parsed || !parsed.environments || !parsed.snapshots || !Array.isArray(parsed.auditLog)) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function writeState(state: DeploymentState) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function addAuditEvent(state: DeploymentState, event: Omit<DeploymentAuditEvent, 'id' | 'timestamp'>) {
  state.auditLog.unshift({
    id: makeId('deploy-audit'),
    timestamp: nowIso(),
    ...event,
  });
}

function buildGraph(flow: FlowJson): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const nodes = Array.isArray(flow.nodes) ? (flow.nodes as Array<Record<string, unknown>>) : [];
  const transitions = Array.isArray(flow.transitions) ? (flow.transitions as Array<Record<string, unknown>>) : [];
  const edges = Array.isArray(flow.edges) ? (flow.edges as Array<Record<string, unknown>>) : [];

  nodes.forEach((node) => {
    const id = typeof node.id === 'string' ? node.id : '';
    if (id) graph.set(id, []);
  });

  [...transitions, ...edges].forEach((edge) => {
    const from = typeof edge.from === 'string' ? edge.from : '';
    const to = typeof edge.to === 'string' ? edge.to : '';
    if (!from || !to) return;
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)?.push(to);
    if (!graph.has(to)) graph.set(to, []);
  });

  return graph;
}

function findUnreachableNodes(flow: FlowJson): string[] {
  const nodes = Array.isArray(flow.nodes) ? (flow.nodes as Array<Record<string, unknown>>) : [];
  if (nodes.length === 0) return [];
  const ids = nodes.map((n) => (typeof n.id === 'string' ? n.id : '')).filter(Boolean);
  if (ids.length === 0) return [];

  const graph = buildGraph(flow);
  const startNode = ids[0];
  const visited = new Set<string>();
  const queue: string[] = [startNode];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const next = graph.get(current) ?? [];
    next.forEach((n) => {
      if (!visited.has(n)) queue.push(n);
    });
  }

  return ids.filter((id) => !visited.has(id));
}

function hasInfiniteLoop(flow: FlowJson): boolean {
  const graph = buildGraph(flow);
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    const next = graph.get(node) ?? [];
    for (const neighbor of next) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const node of Array.from(graph.keys())) {
    if (dfs(node)) return true;
  }
  return false;
}

function resolveFlow(params: { versionId?: string; flow?: FlowJson }): { flow: FlowJson; versionId: string | null } {
  if (params.flow && typeof params.flow === 'object') {
    return { flow: deepClone(params.flow), versionId: params.versionId ?? null };
  }
  if (!params.versionId) {
    throw new Error('versionId or flow is required');
  }
  const { versions } = listVersions();
  const version = versions.find((v) => v.id === params.versionId);
  if (!version) throw new Error('Version not found');
  return { flow: deepClone(version.flow), versionId: version.id };
}

export function validateFlow(params: { versionId?: string; flow?: FlowJson }): ValidationReport {
  const { flow } = resolveFlow(params);
  const structural: string[] = [];
  const logic: string[] = [];
  const routing: string[] = [];
  const bestPractice: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  const options = Array.isArray(flow.options) ? (flow.options as Array<Record<string, unknown>>) : [];
  if (!flow.menu || typeof flow.menu !== 'string') {
    errors.push('Missing required field: menu');
    structural.push('Field "menu" is required and must be a string.');
  }
  if (!Array.isArray(flow.options)) {
    errors.push('Missing required field: options');
    structural.push('Field "options" is required and must be an array.');
  }
  if (Array.isArray(flow.options) && options.length === 0) {
    warnings.push('Options array is empty.');
    logic.push('No menu options configured.');
  }

  options.forEach((opt, idx) => {
    if (typeof opt.key !== 'number' && typeof opt.key !== 'string') {
      errors.push(`Option ${idx + 1} is missing key.`);
    }
    if (!opt.label || typeof opt.label !== 'string') {
      errors.push(`Option ${idx + 1} is missing label.`);
    }
    if (!opt.queue && !opt.after_hours && !opt.holiday) {
      warnings.push(`Option ${idx + 1} has no routing destination.`);
      routing.push(`Option ${idx + 1} cannot route callers.`);
    }
  });

  const nodes = Array.isArray(flow.nodes) ? (flow.nodes as Array<Record<string, unknown>>) : [];
  const nodeIds = new Set(nodes.map((n) => (typeof n.id === 'string' ? n.id : '')).filter(Boolean));
  const transitions = Array.isArray(flow.transitions) ? (flow.transitions as Array<Record<string, unknown>>) : [];
  transitions.forEach((transition, idx) => {
    const from = typeof transition.from === 'string' ? transition.from : '';
    const to = typeof transition.to === 'string' ? transition.to : '';
    if (from && !nodeIds.has(from)) errors.push(`Transition ${idx + 1} has unknown "from" node: ${from}`);
    if (to && !nodeIds.has(to)) errors.push(`Transition ${idx + 1} has unknown "to" node: ${to}`);
  });

  const unreachable = findUnreachableNodes(flow);
  if (unreachable.length > 0) {
    warnings.push(`${unreachable.length} unreachable node(s) detected.`);
    routing.push(`Unreachable nodes: ${unreachable.join(', ')}`);
    recommendations.push('Remove or reconnect unreachable nodes before production deployment.');
  }

  if (hasInfiniteLoop(flow)) {
    errors.push('Infinite loop detected in node transitions.');
    routing.push('Cycle found in routing graph.');
    recommendations.push('Break routing cycles with explicit terminal destinations.');
  }

  if (!flow.after_hours) {
    warnings.push('after_hours destination is not configured.');
    bestPractice.push('Add after-hours destination for compliance and caller experience.');
  }
  if (!flow.holiday) {
    warnings.push('holiday destination is not configured.');
    bestPractice.push('Add holiday routing for business continuity.');
  }

  if (warnings.length > 4) {
    recommendations.push('Flow has multiple warnings; run troubleshooting and simulation before deployment.');
  }

  return {
    isValid: errors.length === 0,
    structural,
    logic,
    routing,
    bestPractice,
    warnings,
    errors,
    recommendations,
  };
}

function saveSnapshot(params: {
  environment: EnvironmentName;
  versionId: string | null;
  flow: FlowJson;
  validation: ValidationReport;
  user?: string;
  notes?: string;
  action: 'deploy' | 'promote' | 'rollback';
  sourceEnvironment?: EnvironmentName;
}): DeploymentSnapshot {
  const snapshot: DeploymentSnapshot = {
    id: makeId('snapshot'),
    environment: params.environment,
    versionId: params.versionId,
    flow: deepClone(params.flow),
    timestamp: nowIso(),
    metadata: {
      user: params.user?.trim() || 'system',
      notes: params.notes?.trim() || 'No notes',
      action: params.action,
      sourceEnvironment: params.sourceEnvironment,
    },
    validation: deepClone(params.validation),
  };
  return snapshot;
}

export function deployToEnvironment(params: {
  environment: EnvironmentName;
  versionId?: string;
  flow?: FlowJson;
  user?: string;
  notes?: string;
}): DeploymentReport {
  const state = readState();
  if (!ENVIRONMENTS.includes(params.environment)) {
    throw new Error('Invalid environment');
  }
  if (state.environments[params.environment].locked) {
    throw new Error(`${params.environment} is locked`);
  }

  const resolved = resolveFlow({ versionId: params.versionId, flow: params.flow });
  const validation = validateFlow({ flow: resolved.flow, versionId: resolved.versionId ?? undefined });
  if (!validation.isValid) {
    throw new Error('Flow validation failed. Deployment blocked.');
  }

  const snapshot = saveSnapshot({
    environment: params.environment,
    versionId: resolved.versionId,
    flow: resolved.flow,
    validation,
    user: params.user,
    notes: params.notes,
    action: 'deploy',
  });

  state.snapshots[snapshot.id] = snapshot;
  state.environments[params.environment].currentSnapshotId = snapshot.id;
  state.environments[params.environment].historySnapshotIds.unshift(snapshot.id);

  addAuditEvent(state, {
    type: 'deployment',
    message: `Deployed ${resolved.versionId ?? 'ad-hoc-flow'} to ${params.environment}`,
    metadata: { environment: params.environment, snapshotId: snapshot.id, versionId: resolved.versionId },
  });

  writeState(state);
  return { status: 'deployed', environment: params.environment, snapshot: deepClone(snapshot), validation };
}

export function promoteEnvironment(params: {
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  user?: string;
  notes?: string;
}): PromotionReport {
  const state = readState();
  const from = state.environments[params.fromEnvironment];
  const to = state.environments[params.toEnvironment];
  if (!from || !to) throw new Error('Invalid source or target environment');
  if (params.fromEnvironment === params.toEnvironment) throw new Error('Source and target environments must differ');
  if (!from.currentSnapshotId) throw new Error('Source environment has no deployed snapshot');
  if (to.locked) throw new Error(`${params.toEnvironment} is locked`);

  const sourceSnapshot = state.snapshots[from.currentSnapshotId];
  if (!sourceSnapshot) throw new Error('Source snapshot not found');

  const validation = validateFlow({ flow: sourceSnapshot.flow, versionId: sourceSnapshot.versionId ?? undefined });
  if (!validation.isValid) throw new Error('Validation failed during promotion');

  const snapshot = saveSnapshot({
    environment: params.toEnvironment,
    versionId: sourceSnapshot.versionId,
    flow: sourceSnapshot.flow,
    validation,
    user: params.user,
    notes: params.notes ?? `Promoted from ${params.fromEnvironment}`,
    action: 'promote',
    sourceEnvironment: params.fromEnvironment,
  });

  state.snapshots[snapshot.id] = snapshot;
  state.environments[params.toEnvironment].currentSnapshotId = snapshot.id;
  state.environments[params.toEnvironment].historySnapshotIds.unshift(snapshot.id);

  addAuditEvent(state, {
    type: 'promotion',
    message: `Promoted ${params.fromEnvironment} to ${params.toEnvironment}`,
    metadata: {
      fromEnvironment: params.fromEnvironment,
      toEnvironment: params.toEnvironment,
      sourceSnapshotId: sourceSnapshot.id,
      targetSnapshotId: snapshot.id,
    },
  });

  writeState(state);
  return {
    status: 'promoted',
    fromEnvironment: params.fromEnvironment,
    toEnvironment: params.toEnvironment,
    snapshot: deepClone(snapshot),
    validation,
  };
}

export function rollbackEnvironment(params: { environment: EnvironmentName; snapshotId?: string; user?: string }): RollbackStatus {
  const state = readState();
  const env = state.environments[params.environment];
  if (!env) throw new Error('Invalid environment');
  if (env.historySnapshotIds.length === 0) throw new Error('No deployment history available');

  const targetSnapshotId = params.snapshotId ?? env.historySnapshotIds[1];
  if (!targetSnapshotId) throw new Error('No previous snapshot available to rollback');
  if (!env.historySnapshotIds.includes(targetSnapshotId)) throw new Error('Snapshot does not belong to environment history');

  env.currentSnapshotId = targetSnapshotId;
  const current = state.snapshots[targetSnapshotId];
  addAuditEvent(state, {
    type: 'rollback',
    message: `Rolled back ${params.environment} to snapshot ${targetSnapshotId}`,
    metadata: {
      environment: params.environment,
      snapshotId: targetSnapshotId,
      versionId: current?.versionId ?? null,
      user: params.user ?? 'system',
    },
  });

  writeState(state);
  return {
    status: 'rolled_back',
    environment: params.environment,
    activeSnapshotId: targetSnapshotId,
    rolledBackToSnapshotId: targetSnapshotId,
  };
}

export function getDeploymentHistory(environment?: EnvironmentName) {
  const state = readState();
  if (environment) {
    const env = state.environments[environment];
    if (!env) throw new Error('Invalid environment');
    const history = env.historySnapshotIds.map((id) => state.snapshots[id]).filter(Boolean);
    return {
      environments: deepClone(state.environments),
      history: deepClone(history),
      auditLog: deepClone(state.auditLog),
    };
  }
  const history = ENVIRONMENTS.flatMap((env) =>
    state.environments[env].historySnapshotIds.map((id) => state.snapshots[id]).filter(Boolean)
  ).sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  return {
    environments: deepClone(state.environments),
    history: deepClone(history),
    auditLog: deepClone(state.auditLog),
  };
}

export function diffEnvironments(environmentA: EnvironmentName, environmentB: EnvironmentName): DeploymentDiffReport {
  const state = readState();
  const envA = state.environments[environmentA];
  const envB = state.environments[environmentB];
  if (!envA || !envB) throw new Error('Invalid environments');
  if (!envA.currentSnapshotId || !envB.currentSnapshotId) throw new Error('Both environments must have deployed snapshots');
  const snapshotA = state.snapshots[envA.currentSnapshotId];
  const snapshotB = state.snapshots[envB.currentSnapshotId];
  if (!snapshotA || !snapshotB) throw new Error('Current snapshots not found');

  const aKeys = new Set(Object.keys(snapshotA.flow));
  const bKeys = new Set(Object.keys(snapshotB.flow));
  const allKeys = Array.from(new Set([...Array.from(aKeys), ...Array.from(bKeys)])).sort();
  const structuralDiff: DeploymentDiffReport['structuralDiff'] = [];
  for (const key of allKeys) {
    const before = snapshotA.flow[key];
    const after = snapshotB.flow[key];
    if (!aKeys.has(key)) {
      structuralDiff.push({ key, action: 'add', before: undefined, after });
      continue;
    }
    if (!bKeys.has(key)) {
      structuralDiff.push({ key, action: 'remove', before, after: undefined });
      continue;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      structuralDiff.push({ key, action: 'update', before, after });
    }
  }

  const logicDiff: string[] = [];
  const routingDiff: string[] = [];
  const recommendations: string[] = [];
  const aOptions = Array.isArray(snapshotA.flow.options) ? (snapshotA.flow.options as unknown[]).length : 0;
  const bOptions = Array.isArray(snapshotB.flow.options) ? (snapshotB.flow.options as unknown[]).length : 0;
  if (aOptions !== bOptions) logicDiff.push(`Options count changed: ${aOptions} -> ${bOptions}`);
  if (JSON.stringify(snapshotA.flow.after_hours) !== JSON.stringify(snapshotB.flow.after_hours)) {
    routingDiff.push('after_hours route differs.');
  }
  if (JSON.stringify(snapshotA.flow.holiday) !== JSON.stringify(snapshotB.flow.holiday)) {
    routingDiff.push('holiday route differs.');
  }
  if (structuralDiff.length > 5) recommendations.push('Large environment drift detected; run validation and simulation before promotion.');
  if (routingDiff.length > 0) recommendations.push('Review SLA and business-hour routing alignment between environments.');

  return {
    environmentA,
    environmentB,
    structuralDiff,
    logicDiff,
    routingDiff,
    recommendations,
  };
}
