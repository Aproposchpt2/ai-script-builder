import type { CSSProperties } from 'react';
import type { LocalizationResult } from '@/lib/localizationEngine';

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  result: LocalizationResult | null;
  busy: boolean;
  error: string | null;
  onTranslate: () => void;
  onValidate: () => void;
  onExport: () => void;
  onDownload: () => void;
};

export default function LocalizationDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Localization Input</h3>
        <textarea value={props.input} onChange={(e) => props.onInputChange(e.target.value)} rows={8} style={textarea} />
      </section>
      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onTranslate} disabled={props.busy}>Translate</button>
          <button style={primaryBtn} onClick={props.onValidate} disabled={props.busy}>Validate</button>
          <button style={primaryBtn} onClick={props.onExport} disabled={props.busy}>Export</button>
          <button style={secondaryBtn} onClick={props.onDownload} disabled={!props.result}>Download localized-flow.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>
      <section style={panel}>
        <h3 style={title}>Translation Preview</h3>
        {!props.result ? <p style={muted}>Run translation to preview localized content.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Original', 'Translated', 'Warnings'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{props.result.translations.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.id}</td>
                <td style={td}>{t.original}</td>
                <td style={td}>{t.translated}</td>
                <td style={td}>{t.warnings.join(', ') || 'none'}</td>
              </tr>
            ))}</tbody>
          </table>
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

