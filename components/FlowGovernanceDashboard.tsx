import type { CSSProperties } from 'react';
import type { GovernanceReport } from '@/lib/flowGovernanceEngine';

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  report: GovernanceReport | null;
  busy: boolean;
  error: string | null;
  onScan: () => void;
  onPolicies: () => void;
  onReport: () => void;
  onDownload: () => void;
};

export default function FlowGovernanceDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Flow Governance Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onScan} disabled={props.busy}>Security Scan</button>
          <button style={primaryBtn} onClick={props.onPolicies} disabled={props.busy}>Policy Evaluation</button>
          <button style={primaryBtn} onClick={props.onReport} disabled={props.busy}>Generate Governance Report</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.report}>Download governance-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Governance Findings</h3>
        {!props.report ? <p style={muted}>Run report to view policy and security findings.</p> : (
          <>
            <p style={muted}>Scan results: {props.report.scanResults.length} · Policy findings: {props.report.policyFindings.length}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Flow', 'Risk', 'Issues'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.report.scanResults.map((s) => (
                <tr key={s.flowId}>
                  <td style={td}>{s.flowId}</td>
                  <td style={td}>{s.risk}</td>
                  <td style={td}>{s.issues.join(', ') || 'none'}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

const panel: CSSProperties = { border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', padding: '.9rem', background: 'rgba(255,255,255,.03)' };
const title: CSSProperties = { margin: '0 0 .5rem 0', fontSize: '1rem' };
const muted: CSSProperties = { opacity: 0.72, margin: '.2rem 0' };
const textarea: CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,.2)', background: '#07192b', color: '#eaf2ff', padding: '.7rem', fontFamily: 'monospace' };
const primaryBtn: CSSProperties = { background: '#5bd3ff', color: '#06111f', border: 0, borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: CSSProperties = { background: '#12324f', color: '#eaf2ff', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const th: CSSProperties = { textAlign: 'left', padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: '.74rem' };
const td: CSSProperties = { padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: '.8rem' };

