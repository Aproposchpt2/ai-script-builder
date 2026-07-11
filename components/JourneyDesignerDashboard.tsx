import type { CSSProperties } from 'react';
import type { JourneyDefinition } from '@/lib/journeyDesignerEngine';

type AnalyzeResult = {
  journey: JourneyDefinition;
  simulation: {
    overallScore: number;
    timeline: Array<{ touchpointName: string; experienceScore: number; dropoffRisk: string }>;
    dropoffs: Array<{ touchpointId: string; reason: string }>;
    recommendations: string[];
  };
  summary: { touchpoints: number; highRiskTouchpoints: number; overallScore: number };
};

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  analysis: AnalyzeResult | null;
  busy: boolean;
  error: string | null;
  onCreate: () => void;
  onSimulate: () => void;
  onAnalyze: () => void;
  onDownload: () => void;
};

export default function JourneyDesignerDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Journey Definition</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onCreate} disabled={props.busy}>Create Journey</button>
          <button style={primaryBtn} onClick={props.onSimulate} disabled={props.busy}>Simulate</button>
          <button style={primaryBtn} onClick={props.onAnalyze} disabled={props.busy}>Analyze</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.analysis}>Download journey-report.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Journey Analysis</h3>
        {!props.analysis ? <p style={muted}>Run analyze to view score, drop-offs, and friction points.</p> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '.5rem' }}>
              <Metric label="Touchpoints" value={props.analysis.summary.touchpoints} />
              <Metric label="High Risk Touchpoints" value={props.analysis.summary.highRiskTouchpoints} />
              <Metric label="Overall Experience Score" value={props.analysis.summary.overallScore} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '.6rem' }}>
              <thead><tr>{['Touchpoint', 'Score', 'Drop-off Risk'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{props.analysis.simulation.timeline.map((t, idx) => (
                <tr key={`t-${idx}`}>
                  <td style={td}>{t.touchpointName}</td>
                  <td style={td}>{t.experienceScore}</td>
                  <td style={td}>{t.dropoffRisk}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: '8px', padding: '.6rem' }}>
      <p style={{ margin: 0, opacity: 0.7, fontSize: '.74rem' }}>{label}</p>
      <p style={{ margin: '.3rem 0 0 0', fontSize: '1.15rem', fontWeight: 700 }}>{value}</p>
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

