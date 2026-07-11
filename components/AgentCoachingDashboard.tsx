import React from 'react';
import type { CoachingOutput } from '@/lib/agentCoachingEngine';

type Props = {
  transcriptIds: string;
  onTranscriptIdsChange: (value: string) => void;
  transcriptText: string;
  onTranscriptTextChange: (value: string) => void;
  team: string;
  onTeamChange: (value: string) => void;
  queue: string;
  onQueueChange: (value: string) => void;
  flowId: string;
  onFlowIdChange: (value: string) => void;
  onAnalyze: () => void;
  onDownloadReport: () => void;
  onDownloadPlaybook: () => void;
  output: CoachingOutput | null;
  isRunning: boolean;
  error: string | null;
};

export default function AgentCoachingDashboard(props: Props) {
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      <section style={panelStyle}>
        <h3 style={titleStyle}>Selection Panel</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.7rem' }}>
          <label style={labelStyle}>
            Transcript IDs (comma-separated)
            <input value={props.transcriptIds} onChange={(e) => props.onTranscriptIdsChange(e.target.value)} style={inputStyle} placeholder="billing-101, tech-209" />
          </label>
          <label style={labelStyle}>
            Team
            <input value={props.team} onChange={(e) => props.onTeamChange(e.target.value)} style={inputStyle} placeholder="Billing" />
          </label>
          <label style={labelStyle}>
            Queue
            <input value={props.queue} onChange={(e) => props.onQueueChange(e.target.value)} style={inputStyle} placeholder="Billing Queue" />
          </label>
          <label style={labelStyle}>
            Flow
            <input value={props.flowId} onChange={(e) => props.onFlowIdChange(e.target.value)} style={inputStyle} placeholder="flow-billing" />
          </label>
        </div>
        <label style={{ ...labelStyle, marginTop: '.7rem' }}>
          Raw transcript text (optional)
          <textarea value={props.transcriptText} onChange={(e) => props.onTranscriptTextChange(e.target.value)} rows={8} style={textareaStyle} />
        </label>
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '.7rem' }}>
          <button onClick={props.onAnalyze} disabled={props.isRunning} style={primaryBtn}>
            {props.isRunning ? 'Analyzing...' : 'Run Coaching Analysis'}
          </button>
          <button onClick={props.onDownloadReport} disabled={!props.output} style={{ ...secondaryBtn, opacity: props.output ? 1 : 0.45 }}>
            Download coaching-report.json
          </button>
          <button onClick={props.onDownloadPlaybook} disabled={!props.output} style={{ ...secondaryBtn, opacity: props.output ? 1 : 0.45 }}>
            Download playbook.json
          </button>
        </div>
        {props.error && <p style={{ color: '#ff8f8f', margin: '.6rem 0 0 0' }}>{props.error}</p>}
      </section>

      {props.output && (
        <>
          <section style={panelStyle}>
            <h3 style={titleStyle}>Per-agent Coaching Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.7rem' }}>
              {props.output.agents.map((agent) => (
                <div key={agent.agentId} style={subPanel}>
                  <h4 style={subTitle}>{agent.agentName} · {agent.team}</h4>
                  <p style={detail}>Overall: <strong>{agent.scores.overall}</strong> · Empathy {agent.scores.empathy} · Resolution {agent.scores.resolution}</p>
                  <p style={detail}>Adherence {agent.scores.adherenceToFlow} · Escalation {agent.scores.escalationHandling}</p>
                  <p style={detail}>Strengths: {agent.strengths.join('; ')}</p>
                  <p style={detail}>Opportunities: {agent.opportunities.join('; ')}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Per-team Overview</h3>
            <div style={{ display: 'grid', gap: '.6rem' }}>
              {props.output.teams.map((team) => (
                <div key={team.team} style={subPanel}>
                  <h4 style={subTitle}>{team.team} · Avg Score {team.averageScore}</h4>
                  <p style={detail}>Common issues: {team.commonFailureModes.join('; ')}</p>
                  <p style={detail}>Weak intents: {team.weakIntentAreas.join(', ') || 'None'}</p>
                  <p style={detail}>Focus areas: {team.trainingOpportunities.join('; ')}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Playbook View</h3>
            {props.output.playbooks.map((playbook) => (
              <details key={playbook.id} style={subPanel}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{playbook.title}</summary>
                <List title="Openers" items={playbook.openers} />
                <List title="Probing" items={playbook.probingQuestions} />
                <List title="De-escalation" items={playbook.deEscalationPatterns} />
                <List title="Resolution" items={playbook.resolutionFrameworks} />
                <List title="Follow-up" items={playbook.followUpTemplates} />
              </details>
            ))}
          </section>

          <section style={panelStyle}>
            <h3 style={titleStyle}>Snippets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '.7rem' }}>
              <List title="Golden examples" items={props.output.snippets.golden.map((s) => `${s.agentName} (${s.intent}/${s.outcome}): ${s.text}`)} />
              <List title="Coaching examples" items={props.output.snippets.coaching.map((s) => `${s.agentName} (${s.intent}/${s.outcome}): ${s.text}`)} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={subPanel}>
      <h4 style={subTitle}>{title}</h4>
      {items.length === 0 ? (
        <p style={detail}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} style={{ ...detail, marginBottom: '.25rem' }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '8px',
  padding: '.9rem',
};
const subPanel: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '6px',
  padding: '.55rem',
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
const detail: React.CSSProperties = {
  margin: '.2rem 0',
  color: 'rgba(255,255,255,.88)',
  fontSize: '.8rem',
};
