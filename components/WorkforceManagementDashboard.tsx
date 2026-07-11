import type { CSSProperties } from 'react';
import type { Agent, ForecastResult, RealtimeResult, ScheduleResult, WorkforceReport } from '@/lib/workforceManagementEngine';

type Props = {
  rawData: string;
  onRawDataChange: (value: string) => void;
  agents: Agent[];
  forecast: ForecastResult | null;
  schedule: ScheduleResult | null;
  realtime: RealtimeResult | null;
  report: WorkforceReport | null;
  busy: boolean;
  error: string | null;
  onForecast: () => void;
  onSchedule: () => void;
  onRealtime: () => void;
  onReport: () => void;
  onDownloadWorkforce: () => void;
  onDownloadSchedule: () => void;
};

export default function WorkforceManagementDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panel}>
        <h3 style={title}>Historical Data Input</h3>
        <p style={muted}>Paste interaction records (JSON array: timestamp, volume, avgHandleTimeSeconds).</p>
        <textarea value={props.rawData} onChange={(e) => props.onRawDataChange(e.target.value)} rows={8} style={textarea} />
      </section>

      <section style={panel}>
        <h3 style={title}>Actions</h3>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={props.onForecast} disabled={props.busy}>Generate Forecast</button>
          <button style={primaryBtn} onClick={props.onSchedule} disabled={props.busy || !props.forecast}>Build Schedule</button>
          <button style={primaryBtn} onClick={props.onRealtime} disabled={props.busy || !props.forecast}>Realtime Gap Check</button>
          <button style={primaryBtn} onClick={props.onReport} disabled={props.busy}>Generate Workforce Report</button>
          <button style={secondaryBtn} onClick={props.onDownloadWorkforce} disabled={!props.report}>Download workforce-report.json</button>
          <button style={secondaryBtn} onClick={props.onDownloadSchedule} disabled={!props.schedule}>Download schedule.json</button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f' }}>{props.error}</p>}
      </section>

      <section style={panel}>
        <h3 style={title}>Forecast View</h3>
        {!props.forecast ? (
          <p style={muted}>Generate forecast to see volume, concurrency, and staffing windows.</p>
        ) : (
          <>
            <div style={metricsGrid}>
              <Metric label="Projected Interactions" value={props.forecast.totals.projectedInteractions} />
              <Metric label="Avg Required Agents" value={props.forecast.totals.averageRequiredAgents} />
              <Metric label="Max Required Agents" value={props.forecast.totals.maxRequiredAgents} />
            </div>
            <SimpleTable
              headers={['Hour', 'Volume', 'Concurrency', 'AHT', 'Required Agents', 'SLA Risk']}
              rows={props.forecast.windows.slice(0, 24).map((w) => [
                String(w.hourIndex),
                String(w.expectedVolume),
                String(w.expectedConcurrency),
                `${w.expectedHandleTimeSeconds}s`,
                String(w.requiredAgents),
                w.slaRisk,
              ])}
            />
          </>
        )}
      </section>

      <section style={panel}>
        <h3 style={title}>Schedule Builder</h3>
        <p style={muted}>Agents loaded: {props.agents.length}</p>
        {!props.schedule ? (
          <p style={muted}>Build schedule to view shifts and channel/queue coverage.</p>
        ) : (
          <>
            <div style={metricsGrid}>
              <Metric label="Agents Scheduled" value={props.schedule.summary.totalAgentsScheduled} />
              <Metric label="Understaffed Windows" value={props.schedule.summary.understaffedWindows} />
              <Metric label="Overstaffed Windows" value={props.schedule.summary.overstaffedWindows} />
            </div>
            <SimpleTable
              headers={['Agent', 'Shift', 'Channel', 'Queue', 'Notes']}
              rows={props.schedule.shifts.map((s) => [
                s.agentName,
                `${s.startHour}:00 - ${s.endHour}:00`,
                s.assignedChannel,
                s.assignedQueue,
                s.notes.join('; '),
              ])}
            />
          </>
        )}
      </section>

      <section style={panel}>
        <h3 style={title}>Real-Time Staffing View</h3>
        {!props.realtime ? (
          <p style={muted}>Run realtime analysis to detect understaffing and SLA risk.</p>
        ) : (
          <>
            <div style={metricsGrid}>
              <Metric label="Understaffed" value={props.realtime.summary.understaffed} />
              <Metric label="Overstaffed" value={props.realtime.summary.overstaffed} />
              <Metric label="SLA Risk Windows" value={props.realtime.summary.slaRiskWindows} />
            </div>
            <SimpleTable
              headers={['Hour', 'Required', 'Staffed', 'Gap', 'Risk', 'Status']}
              rows={props.realtime.gaps.slice(0, 24).map((g) => [
                String(g.hourIndex),
                String(g.requiredAgents),
                String(g.staffedAgents),
                String(g.gap),
                g.slaRisk,
                g.status,
              ])}
            />
            <StringList title="Recommended Actions" items={props.realtime.recommendations} />
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

function StringList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: '.6rem' }}>
      <p style={{ margin: '0 0 .3rem 0', fontWeight: 700 }}>{title}</p>
      {items.length === 0 ? <p style={muted}>No items.</p> : (
        <ul style={{ margin: '.2rem 0 0 .9rem' }}>
          {items.map((item, idx) => <li key={`${title}-${idx}`} style={{ marginBottom: '.2rem' }}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', marginTop: '.6rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={`row-${rIdx}`}>{row.map((col, cIdx) => <td key={`col-${rIdx}-${cIdx}`} style={td}>{col}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const panel: CSSProperties = { border: '1px solid rgba(255,255,255,.12)', borderRadius: '10px', padding: '.9rem', background: 'rgba(255,255,255,.03)' };
const title: CSSProperties = { margin: '0 0 .5rem 0', fontSize: '1rem' };
const muted: CSSProperties = { opacity: 0.72, margin: '.2rem 0' };
const textarea: CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,.2)', background: '#07192b', color: '#eaf2ff', padding: '.7rem', fontFamily: 'monospace' };
const primaryBtn: CSSProperties = { background: '#5bd3ff', color: '#06111f', border: 0, borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const secondaryBtn: CSSProperties = { background: '#12324f', color: '#eaf2ff', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', padding: '.5rem .8rem', fontWeight: 700, cursor: 'pointer' };
const metricsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.5rem' };
const th: CSSProperties = { textAlign: 'left', padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: '.74rem' };
const td: CSSProperties = { padding: '.45rem', borderBottom: '1px solid rgba(255,255,255,.08)', fontSize: '.8rem' };
