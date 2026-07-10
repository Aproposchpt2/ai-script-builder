import type { FlowRepairResult } from '@/lib/flowRepairEngine';

type Props = {
  inputJson: string;
  onInputJsonChange: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyzeRepair: () => void;
  onDownloadFlow: () => void;
  onDownloadDiff: () => void;
  isRunning: boolean;
  result: FlowRepairResult | null;
  error: string | null;
};

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <section style={panelStyle}>
      <h4 style={subTitle}>{title}</h4>
      {items.length === 0 ? (
        <p style={muted}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.slice(0, 30).map((item, idx) => (
            <li key={`${title}-${idx}`} style={liStyle}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function FlowAutoRepairDashboard(props: Props) {
  const {
    inputJson,
    onInputJsonChange,
    onFileUpload,
    onAnalyzeRepair,
    onDownloadFlow,
    onDownloadDiff,
    isRunning,
    result,
    error,
  } = props;

  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Input Section</h3>
        <label style={labelStyle}>
          Upload Flow JSON
          <input type="file" accept=".json,application/json" onChange={onFileUpload} style={{ display: 'block', marginTop: '.4rem' }} />
        </label>
        <label style={{ ...labelStyle, marginTop: '.7rem' }}>
          Paste Flow JSON
          <textarea
            value={inputJson}
            onChange={(e) => onInputJsonChange(e.target.value)}
            rows={10}
            style={textareaStyle}
            placeholder='{"menu":"Main Menu","options":[{"key":1,"label":"Admissions","queue":"Admissions_Queue"}]}'
          />
        </label>
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.7rem', flexWrap: 'wrap' }}>
          <button onClick={onAnalyzeRepair} disabled={isRunning} style={primaryBtn}>
            {isRunning ? 'Analyzing & Repairing...' : 'Analyze & Repair'}
          </button>
          <button onClick={onDownloadFlow} disabled={!result} style={{ ...secondaryBtn, opacity: result ? 1 : 0.45 }}>
            Download repaired-flow.json
          </button>
          <button onClick={onDownloadDiff} disabled={!result} style={{ ...secondaryBtn, opacity: result ? 1 : 0.45 }}>
            Download diff-report.json
          </button>
        </div>
        {error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{error}</p>}
      </section>

      {result && (
        <>
          <section style={panelStyle}>
            <h3 style={titleStyle}>Optimization Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '.5rem' }}>
              <Metric label="Issues" value={result.summary.issueCount} />
              <Metric label="Fixes" value={result.summary.fixCount} />
              <Metric label="Recommendations" value={result.summary.recommendationCount} />
              <Metric label="Complexity Δ" value={result.summary.complexityBefore - result.summary.complexityAfter} />
              <Metric label="Nodes Before" value={result.summary.nodesBefore} />
              <Metric label="Nodes After" value={result.summary.nodesAfter} />
              <Metric label="Options Before" value={result.summary.optionsBefore} />
              <Metric label="Options After" value={result.summary.optionsAfter} />
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.85rem' }}>
            <SectionList title="Issues Found" items={result.issues} />
            <SectionList title="Proposed Fixes" items={result.fixes} />
            <SectionList title="Recommendations" items={result.recommendations} />
          </div>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Diff View</h3>
            {result.diff.length === 0 ? (
              <p style={muted}>No diff entries</p>
            ) : (
              <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['action', 'path', 'before', 'after'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.diff.map((d, idx) => (
                      <tr key={`${d.path}-${idx}`}>
                        <td style={tdStyle}>{d.action}</td>
                        <td style={tdStyle}>{d.path}</td>
                        <td style={tdStyle}>{typeof d.before === 'string' ? d.before : JSON.stringify(d.before)}</td>
                        <td style={tdStyle}>{typeof d.after === 'string' ? d.after : JSON.stringify(d.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Final Repaired Flow</h3>
            <pre style={preStyle}>{JSON.stringify(result.optimizedFlow, null, 2)}</pre>
          </section>
        </>
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
  margin: '0 0 .55rem 0',
  color: '#fff',
  fontSize: '.82rem',
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
const muted: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.82rem',
};
const liStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.85)',
  marginBottom: '.25rem',
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
const preStyle: React.CSSProperties = {
  margin: 0,
  maxHeight: '320px',
  overflow: 'auto',
  background: 'rgba(255,255,255,.02)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '6px',
  padding: '.7rem',
  fontSize: '.76rem',
  color: 'rgba(255,255,255,.9)',
};

