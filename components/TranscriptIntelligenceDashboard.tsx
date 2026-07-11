import React from 'react';
import type { IntelligenceReport } from '@/lib/transcriptIntelligenceEngine';

type Props = {
  inputText: string;
  onInputTextChange: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  onDownloadReport: () => void;
  report: IntelligenceReport | null;
  isRunning: boolean;
  error: string | null;
};

export default function TranscriptIntelligenceDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Input Section</h3>
        <label style={labelStyle}>
          Upload transcript (JSON/TXT/CSV)
          <input type="file" accept=".json,.txt,.csv,text/plain,text/csv,application/json" onChange={props.onFileUpload} style={{ display: 'block', marginTop: '.4rem' }} />
        </label>
        <label style={{ ...labelStyle, marginTop: '.7rem' }}>
          Paste transcript text
          <textarea
            value={props.inputText}
            onChange={(e) => props.onInputTextChange(e.target.value)}
            rows={10}
            style={textareaStyle}
            placeholder='[09:00:12] Customer: I keep getting sent back to the menu...'
          />
        </label>
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.7rem' }}>
          <button onClick={props.onAnalyze} disabled={props.isRunning} style={primaryBtn}>
            {props.isRunning ? 'Analyzing...' : 'Analyze Transcript'}
          </button>
          <button onClick={props.onDownloadReport} disabled={!props.report} style={{ ...secondaryBtn, opacity: props.report ? 1 : 0.45 }}>
            Download intelligence-report.json
          </button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{props.error}</p>}
      </section>

      {props.report && (
        <>
          <section style={panelStyle}>
            <h3 style={titleStyle}>Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '.5rem' }}>
              <Metric label="Primary Intent" value={props.report.summary.primaryIntent} />
              <Metric label="Sentiment" value={props.report.summary.sentiment} />
              <Metric label="Agent Score" value={String(props.report.summary.agentScore)} />
              <Metric label="Frustration Score" value={String(props.report.summary.customerFrustration)} />
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Insights Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.8rem' }}>
              <PanelList title="Intent List" items={props.report.intents.map((intent) => `${intent.label} (${Math.round(intent.confidence * 100)}%)`)} />
              <PanelList title="Emotions" items={props.report.emotions} />
              <PanelList title="Keywords" items={props.report.keywords.slice(0, 20)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.8rem', marginTop: '.8rem' }}>
              <div style={chartPanel}>
                <h4 style={subTitle}>Sentiment Chart</h4>
                <Bar label="Negative" value={Math.max(0, -props.report.sentiment.score)} color="#ef476f" />
                <Bar label="Positive" value={Math.max(0, props.report.sentiment.score)} color="#06d6a0" />
                <p style={muted}>Overall score: {props.report.sentiment.score}</p>
              </div>
              <div style={chartPanel}>
                <h4 style={subTitle}>Agent/Frustration Score</h4>
                <Bar label="Agent quality" value={props.report.agentScore.score / 100} color="#5bd3ff" />
                <Bar label="Customer frustration" value={props.report.customerFrustration.score / 100} color="#f78c6b" />
              </div>
            </div>
            <div style={{ marginTop: '.8rem' }}>
              <h4 style={subTitle}>Issue Table</h4>
              <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Type', 'Severity', 'Description', 'Evidence'].map((header) => (
                        <th key={header} style={thStyle}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {props.report.issues.map((issue, index) => (
                      <tr key={`${issue.type}-${index}`}>
                        <td style={tdStyle}>{issue.type}</td>
                        <td style={tdStyle}>{issue.severity}</td>
                        <td style={tdStyle}>{issue.description}</td>
                        <td style={tdStyle}>{issue.evidence.join(' | ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Flow Mapping Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.8rem' }}>
              <PanelList title="Deviations" items={props.report.flowMapping.deviations} />
              <PanelList title="Agent Overrides" items={props.report.flowMapping.agentOverrides} />
              <PanelList title="Repeated Loops" items={props.report.flowMapping.repeatedLoops} />
              <PanelList title="Drop-offs" items={props.report.flowMapping.dropOffPoints} />
              <PanelList title="Broken Paths" items={props.report.flowMapping.brokenSelfServicePaths} />
              <PanelList title="Unreachable Nodes" items={props.report.flowMapping.unreachableSelfServiceNodes} />
            </div>
            <div style={{ marginTop: '.8rem' }}>
              <h4 style={subTitle}>Node-by-node mapping</h4>
              <div style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Turn ID', 'Node', 'Reason'].map((header) => (
                        <th key={header} style={thStyle}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {props.report.flowMapping.mappedSegments.map((segment) => (
                      <tr key={segment.turnId}>
                        <td style={tdStyle}>{segment.turnId}</td>
                        <td style={tdStyle}>{segment.nodeId}</td>
                        <td style={tdStyle}>{segment.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ marginTop: '.8rem' }}>
              <PanelList title="Recommendations" items={props.report.recommendations} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PanelList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={chartPanel}>
      <h4 style={subTitle}>{title}</h4>
      {items.length === 0 ? (
        <p style={muted}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`} style={liStyle}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '6px', padding: '.55rem .65rem' }}>
      <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: '.95rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '.45rem' }}>
      <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.65)', marginBottom: '.2rem' }}>{label}</div>
      <div style={barTrack}>
        <div style={{ ...barFill, width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '8px',
  padding: '.9rem',
};
const chartPanel: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '6px',
  padding: '.6rem',
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
const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: '.35rem',
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
const liStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.85)',
  marginBottom: '.25rem',
  fontSize: '.82rem',
};
const muted: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.82rem',
};
const barTrack: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.08)',
  borderRadius: '999px',
  height: '8px',
};
const barFill: React.CSSProperties = {
  height: '8px',
  borderRadius: '999px',
  background: '#5bd3ff',
};
