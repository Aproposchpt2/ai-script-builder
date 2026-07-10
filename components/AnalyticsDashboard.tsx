import type { AnalyticsReport } from '@/lib/analyticsEngine';

type Props = {
  report: AnalyticsReport;
};

export default function AnalyticsDashboard({ report }: Props) {
  const { metrics, insights, recommendations } = report;

  return (
    <div style={{ display: 'grid', gap: '.85rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.5rem' }}>
          <Metric label="Menu Options" value={metrics.menuOptions} />
          <Metric label="Queues" value={metrics.queues} />
          <Metric label="Routing Depth" value={metrics.routingDepth} />
          <Metric label="Unreachable Nodes" value={metrics.unreachableNodes} />
          <Metric label="Warnings" value={metrics.warnings} />
          <Metric label="Errors" value={metrics.errors} />
          <Metric label="Recommendations" value={metrics.recommendations} />
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Insights</h3>
        {insights.length === 0 ? (
          <p style={emptyStyle}>None</p>
        ) : (
          <ul style={listStyle}>
            {insights.map((item, idx) => (
              <li key={`insight-${idx}`} style={itemStyle}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Recommendations</h3>
        {recommendations.length === 0 ? (
          <p style={emptyStyle}>None</p>
        ) : (
          <ul style={listStyle}>
            {recommendations.map((item, idx) => (
              <li key={`recommendation-${idx}`} style={itemStyle}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '6px', padding: '.55rem .65rem' }}>
      <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '8px',
  padding: '.95rem',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 .55rem 0',
  color: '#fff',
  fontSize: '.92rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '1.2rem',
};

const itemStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.85)',
  marginBottom: '.35rem',
  fontSize: '.9rem',
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,.45)',
  fontSize: '.85rem',
};

