import type { CSSProperties } from 'react';
import type { DataLakeRecord } from '@/lib/dataLakeEngine';

type Props = {
  ingestInput: string;
  queryInput: string;
  onIngestInputChange: (value: string) => void;
  onQueryInputChange: (value: string) => void;
  records: DataLakeRecord[];
  rows: DataLakeRecord[];
  schema: { entities: Array<{ name: string; fields?: string[]; values?: string[] }>; lineage: string[] } | null;
  busy: boolean;
  error: string | null;
  onIngest: () => void;
  onQuery: () => void;
  onSchema: () => void;
  onExport: () => void;
  onDownload: () => void;
};

export default function DataLakeDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Ingestion Payload</h3>
        <textarea value={props.ingestInput} onChange={(e) => props.onIngestInputChange(e.target.value)} rows={7} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Query Payload</h3>
        <textarea value={props.queryInput} onChange={(e) => props.onQueryInputChange(e.target.value)} rows={5} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onIngest} disabled={props.busy}>Ingest</button>
          <button style={primaryBtn} onClick={props.onQuery} disabled={props.busy}>Query</button>
          <button style={primaryBtn} onClick={props.onSchema} disabled={props.busy}>Load Schema</button>
          <button style={primaryBtn} onClick={props.onExport} disabled={props.busy}>Export Results</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={props.rows.length === 0}>Download query-results.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Data Explorer</h3>
        <p style={muted}>Records: {props.records.length} · Query results: {props.rows.length}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Source', 'ID', 'Timestamp'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{props.rows.slice(0, 30).map((r) => (
            <tr key={`${r.source}-${r.id}-${r.timestamp}`}>
              <td style={td}>{r.source}</td>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.timestamp}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <section style={panel}>
        <h3 style={title}>Schema Viewer</h3>
        {!props.schema ? <p style={muted}>Load schema to inspect entities and lineage.</p> : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(props.schema, null, 2)}</pre>
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

