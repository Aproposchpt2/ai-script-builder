import React from 'react';
import type {
  RuntimeEnvironment,
  RuntimeEvent,
  RuntimeIncident,
  RuntimeMetrics,
  RuntimeSeverity,
} from '@/lib/runtimeMonitorEngine';

type Props = {
  environment: RuntimeEnvironment;
  onEnvironmentChange: (value: RuntimeEnvironment) => void;
  flowFilter: string;
  onFlowFilterChange: (value: string) => void;
  nodeFilter: string;
  onNodeFilterChange: (value: string) => void;
  severityFilter: RuntimeSeverity | 'all';
  onSeverityFilterChange: (value: RuntimeSeverity | 'all') => void;
  minutes: number;
  onMinutesChange: (value: number) => void;
  availableFlows: string[];
  availableNodes: string[];
  events: RuntimeEvent[];
  incidents: RuntimeIncident[];
  metrics: RuntimeMetrics | null;
  selectedIncidentId: string;
  onSelectIncidentId: (value: string) => void;
  onRefresh: () => void;
  onAcknowledge: (incidentId: string) => void;
  onMute: (incidentId: string) => void;
  onDownloadIncidentReport: (incidentId: string) => void;
  onCreateTicket: (incidentId: string) => void;
  isLoading: boolean;
  error: string | null;
};

const ENV_OPTIONS: RuntimeEnvironment[] = ['dev', 'qa', 'staging', 'prod'];
const SEVERITY_OPTIONS: Array<RuntimeSeverity | 'all'> = ['all', 'info', 'warning', 'error', 'critical'];

export default function FlowRuntimeMonitorDashboard(props: Props) {
  const selectedIncident = props.incidents.find((incident) => incident.id === props.selectedIncidentId) ?? null;
  const incidentEvents = selectedIncident
    ? props.events.filter((event) => selectedIncident.relatedEventIds.includes(event.id))
    : [];

  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Environment & Filter Bar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '.6rem' }}>
          <label style={labelStyle}>
            Environment
            <select value={props.environment} onChange={(e) => props.onEnvironmentChange(e.target.value as RuntimeEnvironment)} style={inputStyle}>
              {ENV_OPTIONS.map((env) => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Flow
            <select value={props.flowFilter} onChange={(e) => props.onFlowFilterChange(e.target.value)} style={inputStyle}>
              <option value="">All flows</option>
              {props.availableFlows.map((flow) => (
                <option key={flow} value={flow}>{flow}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Node
            <select value={props.nodeFilter} onChange={(e) => props.onNodeFilterChange(e.target.value)} style={inputStyle}>
              <option value="">All nodes</option>
              {props.availableNodes.map((node) => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Severity
            <select value={props.severityFilter} onChange={(e) => props.onSeverityFilterChange(e.target.value as RuntimeSeverity | 'all')} style={inputStyle}>
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Time Range
            <select value={String(props.minutes)} onChange={(e) => props.onMinutesChange(Number(e.target.value))} style={inputStyle}>
              <option value="15">Last 15m</option>
              <option value="30">Last 30m</option>
              <option value="60">Last 1h</option>
              <option value="180">Last 3h</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.65rem' }}>
          <button onClick={props.onRefresh} style={primaryBtn} disabled={props.isLoading}>
            {props.isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{props.error}</p>}
      </section>

      <section style={panelStyle}>
        <h3 style={titleStyle}>Metrics</h3>
        {!props.metrics ? (
          <p style={mutedStyle}>No metrics loaded yet.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: '.5rem' }}>
              <Metric label="Latency Avg" value={`${props.metrics.latency.avg.toFixed(1)} ms`} />
              <Metric label="Latency p95" value={`${props.metrics.latency.p95.toFixed(1)} ms`} />
              <Metric label="Latency p99" value={`${props.metrics.latency.p99.toFixed(1)} ms`} />
              <Metric label="Throughput/s" value={props.metrics.throughput.eventsPerSecond.toFixed(2)} />
              <Metric label="Throughput/min" value={String(props.metrics.throughput.eventsPerMinute)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.7rem', marginTop: '.7rem' }}>
              <ChartBox title="Latency Chart (line)">
                <div style={barTrack}><div style={{ ...barFill, width: `${Math.min(100, (props.metrics.latency.avg / 3000) * 100)}%` }} /></div>
                <div style={barTrack}><div style={{ ...barFill, width: `${Math.min(100, (props.metrics.latency.p95 / 3000) * 100)}%`, background: '#ffd166' }} /></div>
                <div style={barTrack}><div style={{ ...barFill, width: `${Math.min(100, (props.metrics.latency.p99 / 3000) * 100)}%`, background: '#ef476f' }} /></div>
              </ChartBox>
              <ChartBox title="Throughput Chart (bar)">
                <div style={barTrack}><div style={{ ...barFill, width: `${Math.min(100, (props.metrics.throughput.eventsPerMinute / 120) * 100)}%` }} /></div>
              </ChartBox>
              <ChartBox title="Error Rate Chart">
                {Object.entries(props.metrics.errorRates).slice(0, 6).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '.35rem' }}>
                    <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.65)' }}>{key}</div>
                    <div style={barTrack}>
                      <div style={{ ...barFill, width: `${Math.min(100, value * 100)}%`, background: '#f78c6b' }} />
                    </div>
                  </div>
                ))}
              </ChartBox>
            </div>
            <div style={{ marginTop: '.7rem' }}>
              <h4 style={subTitle}>Bottleneck Indicators</h4>
              {props.metrics.bottlenecks.length === 0 ? (
                <p style={mutedStyle}>No active bottlenecks detected.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {props.metrics.bottlenecks.map((bottleneck, idx) => (
                    <li key={`${bottleneck.flowId}-${bottleneck.nodeId}-${idx}`} style={liStyle}>
                      {bottleneck.flowId}/{bottleneck.nodeId} · score {bottleneck.score} · {bottleneck.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '.9rem' }}>
        <section style={panelStyle}>
          <h3 style={titleStyle}>Live Event Stream</h3>
          <div style={{ maxHeight: '360px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['timestamp', 'env', 'flow', 'node', 'type', 'latency', 'status', 'severity'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.events.map((event) => (
                  <tr key={event.id}>
                    <td style={tdStyle}>{event.timestamp}</td>
                    <td style={tdStyle}>{event.environment}</td>
                    <td style={tdStyle}>{event.flowId}</td>
                    <td style={tdStyle}>{event.nodeId}</td>
                    <td style={tdStyle}>{event.type}</td>
                    <td style={tdStyle}>{event.latencyMs} ms</td>
                    <td style={tdStyle}>{event.status}</td>
                    <td style={tdStyle}>{event.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panelStyle}>
          <h3 style={titleStyle}>Incidents</h3>
          <div style={{ maxHeight: '360px', overflow: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px', marginBottom: '.6rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['severity', 'flow/node', 'status', 'opened', 'actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td style={tdStyle}>{incident.severity}</td>
                    <td style={tdStyle}>{incident.flowId}/{incident.nodeId}</td>
                    <td style={tdStyle}>{incident.status}</td>
                    <td style={tdStyle}>{incident.openedAt}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                        <button onClick={() => props.onSelectIncidentId(incident.id)} style={miniBtn}>View</button>
                        <button onClick={() => props.onAcknowledge(incident.id)} style={miniBtn}>Acknowledge</button>
                        <button onClick={() => props.onMute(incident.id)} style={miniBtn}>Mute</button>
                        <button onClick={() => props.onCreateTicket(incident.id)} style={miniBtn}>Create Ticket</button>
                        <button onClick={() => props.onDownloadIncidentReport(incident.id)} style={miniBtn}>Report</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={subTitle}>Incident Details</h4>
          {!selectedIncident ? (
            <p style={mutedStyle}>Select an incident to view details.</p>
          ) : (
            <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', padding: '.6rem' }}>
              <p style={detailStyle}>Rule: <strong>{selectedIncident.rule}</strong></p>
              <p style={detailStyle}>Impact: <strong>{selectedIncident.impact}</strong></p>
              <p style={detailStyle}>Status: <strong>{selectedIncident.status}</strong></p>
              <p style={detailStyle}>Remediation: {selectedIncident.remediationNotes}</p>
              <h5 style={{ margin: '.45rem 0 .25rem 0', color: '#fff' }}>Timeline of related events</h5>
              {incidentEvents.length === 0 ? (
                <p style={mutedStyle}>No related events currently loaded.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {incidentEvents.slice(0, 10).map((event) => (
                    <li key={event.id} style={liStyle}>
                      {event.timestamp} · {event.type} · {event.status} · {event.latencyMs} ms
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', padding: '.55rem' }}>
      <div style={{ fontSize: '.74rem', color: '#fff', marginBottom: '.4rem' }}>{title}</div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
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
  margin: '.15rem 0',
  color: 'rgba(255,255,255,.9)',
  fontSize: '.8rem',
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
const barTrack: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.08)',
  borderRadius: '999px',
  height: '8px',
  marginBottom: '.35rem',
};
const barFill: React.CSSProperties = {
  height: '8px',
  borderRadius: '999px',
  background: '#5bd3ff',
};
