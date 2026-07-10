import type { ParsedCallFlow } from '@/lib/parser';

interface Props {
  data: ParsedCallFlow;
}

export default function JsonViewer({ data }: Props) {
  return (
    <pre
      style={{
        background: '#0d1b2a',
        color: '#7fdbca',
        borderRadius: '8px',
        padding: '1.5rem',
        fontSize: '0.82rem',
        lineHeight: 1.7,
        overflowX: 'auto',
        margin: 0,
        fontFamily: "'Fira Mono', 'Courier New', monospace",
        border: '1px solid rgba(127,219,202,.2)',
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
