import React from 'react';
import type {
  DeploymentAuditEvent,
  DeploymentDiffReport,
  DeploymentReport,
  DeploymentSnapshot,
  EnvironmentName,
  EnvironmentRecord,
  PromotionReport,
  RollbackStatus,
  ValidationReport,
} from '@/lib/deploymentEngine';
import type { VersionRecord } from '@/lib/versioningEngine';

type Props = {
  inputJson: string;
  onInputJsonChange: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedVersionId: string;
  onSelectedVersionId: (value: string) => void;
  versions: VersionRecord[];
  selectedEnvironment: EnvironmentName;
  onSelectedEnvironment: (value: EnvironmentName) => void;
  promoteFrom: EnvironmentName;
  promoteTo: EnvironmentName;
  onPromoteFrom: (value: EnvironmentName) => void;
  onPromoteTo: (value: EnvironmentName) => void;
  diffA: EnvironmentName;
  diffB: EnvironmentName;
  onDiffA: (value: EnvironmentName) => void;
  onDiffB: (value: EnvironmentName) => void;
  environments: Record<EnvironmentName, EnvironmentRecord>;
  history: DeploymentSnapshot[];
  auditLog: DeploymentAuditEvent[];
  validationReport: ValidationReport | null;
  deploymentReport: DeploymentReport | null;
  promotionReport: PromotionReport | null;
  rollbackStatus: RollbackStatus | null;
  diffReport: DeploymentDiffReport | null;
  isBusy: boolean;
  error: string | null;
  onValidate: () => void;
  onDeploy: () => void;
  onPromote: () => void;
  onRollback: () => void;
  onDiff: () => void;
  onDownloadSnapshot: (snapshotId: string) => void;
};

const ENVS: EnvironmentName[] = ['dev', 'qa', 'staging', 'production'];

export default function FlowDeploymentDashboard(props: Props) {
  const currentSnapshot = props.environments[props.selectedEnvironment]?.currentSnapshotId ?? null;

  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Input & Environment Selector</h3>
        <label style={labelStyle}>
          Upload Flow JSON
          <input type="file" accept=".json,application/json" onChange={props.onFileUpload} style={{ display: 'block', marginTop: '.4rem' }} />
        </label>
        <textarea
          value={props.inputJson}
          onChange={(e) => props.onInputJsonChange(e.target.value)}
          rows={8}
          style={{ ...textareaStyle, marginTop: '.5rem' }}
          placeholder='{"menu":"Main Menu","options":[]}'
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.6rem', marginTop: '.6rem' }}>
          <label style={labelStyle}>
            Flow Version
            <select value={props.selectedVersionId} onChange={(e) => props.onSelectedVersionId(e.target.value)} style={inputStyle}>
              <option value="">Use JSON input</option>
              {props.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.branch} · {v.notes}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Target Environment
            <select
              value={props.selectedEnvironment}
              onChange={(e) => props.onSelectedEnvironment(e.target.value as EnvironmentName)}
              style={inputStyle}
            >
              {ENVS.map((env) => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <div style={{ alignSelf: 'end', color: 'rgba(255,255,255,.75)', fontSize: '.78rem' }}>
            Current snapshot: {currentSnapshot ?? 'none'}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Actions</h3>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button onClick={props.onValidate} disabled={props.isBusy} style={primaryBtn}>Validate</button>
          <button onClick={props.onDeploy} disabled={props.isBusy} style={primaryBtn}>Deploy</button>
          <button onClick={props.onRollback} disabled={props.isBusy} style={secondaryBtn}>Roll back</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.6rem', marginTop: '.7rem' }}>
          <label style={labelStyle}>
            Promote From
            <select value={props.promoteFrom} onChange={(e) => props.onPromoteFrom(e.target.value as EnvironmentName)} style={inputStyle}>
              {ENVS.map((env) => (
                <option key={`from-${env}`} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Promote To
            <select value={props.promoteTo} onChange={(e) => props.onPromoteTo(e.target.value as EnvironmentName)} style={inputStyle}>
              {ENVS.map((env) => (
                <option key={`to-${env}`} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <button onClick={props.onPromote} disabled={props.isBusy || props.promoteFrom === props.promoteTo} style={{ ...primaryBtn, alignSelf: 'end' }}>
            Promote
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.6rem', marginTop: '.7rem' }}>
          <label style={labelStyle}>
            Diff Environment A
            <select value={props.diffA} onChange={(e) => props.onDiffA(e.target.value as EnvironmentName)} style={inputStyle}>
              {ENVS.map((env) => (
                <option key={`da-${env}`} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Diff Environment B
            <select value={props.diffB} onChange={(e) => props.onDiffB(e.target.value as EnvironmentName)} style={inputStyle}>
              {ENVS.map((env) => (
                <option key={`db-${env}`} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <button onClick={props.onDiff} disabled={props.isBusy || props.diffA === props.diffB} style={{ ...primaryBtn, alignSelf: 'end' }}>
            Diff Environments
          </button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{props.error}</p>}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Validation Report</h3>
        {!props.validationReport ? (
          <p style={mutedStyle}>Run validation to view report.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.5rem', marginBottom: '.5rem' }}>
              <Metric label="Valid" value={props.validationReport.isValid ? 1 : 0} />
              <Metric label="Warnings" value={props.validationReport.warnings.length} />
              <Metric label="Errors" value={props.validationReport.errors.length} />
            </div>
            <StringList title="Structural" items={props.validationReport.structural} />
            <StringList title="Logic" items={props.validationReport.logic} />
            <StringList title="Routing" items={props.validationReport.routing} />
            <StringList title="Best Practice" items={props.validationReport.bestPractice} />
            <StringList title="Recommendations" items={props.validationReport.recommendations} />
          </>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Deployment & Promotion Reports</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.5rem' }}>
          <Metric label="Deployments" value={props.history.filter((h) => h.metadata.action === 'deploy').length} />
          <Metric label="Promotions" value={props.history.filter((h) => h.metadata.action === 'promote').length} />
          <Metric label="Rollbacks" value={props.auditLog.filter((a) => a.type === 'rollback').length} />
        </div>
        {props.deploymentReport && (
          <p style={detailStyle}>
            Deployed snapshot <strong>{props.deploymentReport.snapshot.id}</strong> to <strong>{props.deploymentReport.environment}</strong>.
          </p>
        )}
        {props.promotionReport && (
          <p style={detailStyle}>
            Promoted from <strong>{props.promotionReport.fromEnvironment}</strong> to <strong>{props.promotionReport.toEnvironment}</strong> with snapshot <strong>{props.promotionReport.snapshot.id}</strong>.
          </p>
        )}
        {props.rollbackStatus && (
          <p style={detailStyle}>
            Rolled back <strong>{props.rollbackStatus.environment}</strong> to snapshot <strong>{props.rollbackStatus.rolledBackToSnapshotId}</strong>.
          </p>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Environment Diff Viewer</h3>
        {!props.diffReport ? (
          <p style={mutedStyle}>Run environment diff to view differences.</p>
        ) : (
          <>
            <StringList title="Logic Diff" items={props.diffReport.logicDiff} />
            <StringList title="Routing Diff" items={props.diffReport.routingDiff} />
            <StringList title="Recommendations" items={props.diffReport.recommendations} />
            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Action', 'Path', 'Before', 'After'].map((h) => (
                      <th key={`diff-${h}`} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.diffReport.structuralDiff.map((entry, idx) => (
                    <tr key={`${entry.key}-${idx}`}>
                      <td style={tdStyle}>{entry.action}</td>
                      <td style={tdStyle}>{entry.key}</td>
                      <td style={tdStyle}>{typeof entry.before === 'string' ? entry.before : JSON.stringify(entry.before)}</td>
                      <td style={tdStyle}>{typeof entry.after === 'string' ? entry.after : JSON.stringify(entry.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Environment History & Snapshots</h3>
        <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Time', 'Env', 'Version', 'Action', 'Snapshot', 'Download'].map((h) => (
                  <th key={`h-${h}`} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.history.map((snapshot) => (
                <tr key={snapshot.id}>
                  <td style={tdStyle}>{snapshot.timestamp}</td>
                  <td style={tdStyle}>{snapshot.environment}</td>
                  <td style={tdStyle}>{snapshot.versionId ?? 'manual'}</td>
                  <td style={tdStyle}>{snapshot.metadata.action}</td>
                  <td style={tdStyle}>{snapshot.id}</td>
                  <td style={tdStyle}>
                    <button onClick={() => props.onDownloadSnapshot(snapshot.id)} style={miniBtn}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: '.45rem' }}>
      <h4 style={subTitle}>{title}</h4>
      {items.length === 0 ? (
        <p style={mutedStyle}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} style={liStyle}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '6px', padding: '.55rem .65rem' }}>
      <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '8px',
  padding: '.9rem',
};
const titleStyle: React.CSSProperties = {
  margin: '0 0 .7rem 0',
  color: '#fff',
  fontSize: '.9rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};
const subTitle: React.CSSProperties = {
  margin: '0 0 .35rem 0',
  color: '#fff',
  fontSize: '.78rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.8)',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '.35rem',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.14)',
  color: '#e8f0fe',
  borderRadius: '6px',
  padding: '.5rem .65rem',
};
const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: '6px',
  color: '#e8f0fe',
  padding: '.7rem .8rem',
  fontFamily: "'Fira Mono', 'Courier New', monospace",
  lineHeight: 1.5,
};
const primaryBtn: React.CSSProperties = {
  background: '#5bd3ff',
  color: '#06111f',
  border: 'none',
  borderRadius: '7px',
  padding: '.7rem 1rem',
  fontWeight: 800,
  fontSize: '.76rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  color: 'rgba(255,255,255,.85)',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: '7px',
  padding: '.7rem 1rem',
  fontWeight: 700,
  fontSize: '.76rem',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const miniBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.06)',
  color: '#e8f0fe',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: '5px',
  padding: '.25rem .45rem',
  fontSize: '.65rem',
  cursor: 'pointer',
};
const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.82rem',
};
const liStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.85)',
  marginBottom: '.25rem',
  fontSize: '.82rem',
};
const detailStyle: React.CSSProperties = {
  margin: '.45rem 0 0 0',
  color: 'rgba(255,255,255,.88)',
  fontSize: '.82rem',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '.68rem',
  color: 'rgba(255,255,255,.7)',
  borderBottom: '1px solid rgba(255,255,255,.1)',
  padding: '.4rem .45rem',
  position: 'sticky',
  top: 0,
  background: '#0a1a2a',
};
const tdStyle: React.CSSProperties = {
  fontSize: '.74rem',
  color: 'rgba(255,255,255,.85)',
  borderBottom: '1px solid rgba(255,255,255,.06)',
  padding: '.35rem .45rem',
  verticalAlign: 'top',
};
