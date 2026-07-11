import type { CSSProperties } from 'react';
import type { QAReport, QAScorecard } from '@/lib/qualityAssuranceEngine';

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  scorecards: QAScorecard[];
  report: QAReport | null;
  busy: boolean;
  error: string | null;
  onScore: () => void;
  onCompliance: () => void;
  onReport: () => void;
  onDownload: () => void;
};

export default function QualityAssuranceDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Transcript Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onScore} disabled={props.busy}>Auto-score</button>
          <button style={primaryBtn} onClick={props.onCompliance} disabled={props.busy}>Compliance Check</button>
          <button style={primaryBtn} onClick={props.onReport} disabled={props.busy}>Generate QA Report</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.report}>Download qa-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Scorecards</h3>
        {props.scorecards.length === 0 ? <p style={muted}>Run auto-score to populate scorecards.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Transcript', 'Agent', 'Quality', 'Compliance', 'Flow', 'Sentiment', 'Flags'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {props.scorecards.map((s) => (
                <tr key={s.transcriptId}>
                  <td style={td}>{s.transcriptId}</td>
                  <td style={td}>{s.agent}</td>
                  <td style={td}>{s.qualityScore}</td>
                  <td style={td}>{s.complianceScore}</td>
                  <td style={td}>{s.flowAdherenceScore}</td>
                  <td style={td}>{s.sentimentScore}</td>
                  <td style={td}>{s.flags.join(', ') || 'none'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section style={panel}>
        <h3 style={title}>Recommendations</h3>
        {!props.report ? <p style={muted}>Generate report to view coaching recommendations.</p> : (
          <ul style={{ margin: '.2rem 0 0 .9rem' }}>
            {props.report.recommendations.map((r, idx) => <li key={`rec-${idx}`}>{r}</li>)}
          </ul>
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

