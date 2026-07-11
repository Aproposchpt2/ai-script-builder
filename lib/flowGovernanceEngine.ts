export type GovernanceInput = {
  flows: Array<{
    id: string;
    name: string;
    json: Record<string, unknown>;
    ownerRole?: string;
    lastModifiedBy?: string;
  }>;
  policies?: string[];
};

export type GovernanceReport = {
  scanResults: Array<{
    flowId: string;
    issues: string[];
    risk: 'low' | 'medium' | 'high';
  }>;
  policyFindings: Array<{
    flowId: string;
    violations: string[];
  }>;
  accessMatrix: Array<{
    flowId: string;
    ownerRole: string;
    canDeploy: boolean;
    canEditPolicy: boolean;
  }>;
  auditTrail: Array<{
    flowId: string;
    actor: string;
    action: string;
    timestamp: string;
  }>;
  recommendations: string[];
};

export function runSecurityScan(input: GovernanceInput) {
  return input.flows.map((flow) => {
    const raw = JSON.stringify(flow.json).toLowerCase();
    const issues: string[] = [];
    if (raw.includes('password')) issues.push('Potential hardcoded secret pattern.');
    if (raw.includes('http://')) issues.push('Insecure protocol reference detected.');
    const risk: 'low' | 'medium' | 'high' = issues.length >= 2 ? 'high' : issues.length === 1 ? 'medium' : 'low';
    return { flowId: flow.id, issues, risk };
  });
}

export function evaluatePolicies(input: GovernanceInput) {
  const policies = input.policies ?? ['approval-required', 'no-public-pii', 'rbac-enforced'];
  return input.flows.map((flow) => {
    const violations: string[] = [];
    if (policies.includes('approval-required') && !flow.lastModifiedBy) violations.push('Missing change approver metadata.');
    if (policies.includes('rbac-enforced') && !flow.ownerRole) violations.push('Missing owner role for RBAC checks.');
    if (JSON.stringify(flow.json).toLowerCase().includes('ssn') && policies.includes('no-public-pii')) {
      violations.push('Possible PII exposure in flow payload.');
    }
    return { flowId: flow.id, violations };
  });
}

export function buildAccessMatrix(input: GovernanceInput) {
  return input.flows.map((flow) => {
    const ownerRole = flow.ownerRole ?? 'agent';
    return {
      flowId: flow.id,
      ownerRole,
      canDeploy: ownerRole === 'admin' || ownerRole === 'supervisor',
      canEditPolicy: ownerRole === 'admin',
    };
  });
}

export function buildGovernanceReport(input: GovernanceInput): GovernanceReport {
  const scanResults = runSecurityScan(input);
  const policyFindings = evaluatePolicies(input);
  const accessMatrix = buildAccessMatrix(input);
  const auditTrail = input.flows.map((flow) => ({
    flowId: flow.id,
    actor: flow.lastModifiedBy ?? 'unknown',
    action: 'flow_change_reviewed',
    timestamp: new Date().toISOString(),
  }));

  const recommendations: string[] = [];
  if (scanResults.some((s) => s.risk !== 'low')) recommendations.push('Block deployment of high-risk flows until security issues are remediated.');
  if (policyFindings.some((p) => p.violations.length > 0)) recommendations.push('Enforce policy gates in CI for governance violations.');
  if (recommendations.length === 0) recommendations.push('Governance checks are healthy; continue periodic auditing.');

  return { scanResults, policyFindings, accessMatrix, auditTrail, recommendations };
}

