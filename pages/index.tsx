import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const pillars = [
  { name: 'Flow Authoring', detail: 'Builder · Validator · Visualizer · Debugger · Rewrite' },
  { name: 'Real-Time Operations', detail: 'Deployment · Runtime Monitor · Omni-Channel Routing' },
  { name: 'Workforce & QA', detail: 'Forecasting · Skill Matrix · QA Auto-Scoring · Coaching' },
  { name: 'Governance & Compliance', detail: 'Policy automation · Violations · Audit intelligence' },
];

const outcomes = [
  { kpi: 'AHT', delta: '-22%' },
  { kpi: 'Containment', delta: '+31%' },
  { kpi: 'QA Coverage', delta: '100%' },
  { kpi: 'Time-to-Deploy', delta: '-70%' },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mc-shell mc-grid" style={{ color: '#e8f0fe' }}>
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 24px 54px', position: 'relative' }}>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', border: '1px solid rgba(121,180,255,.35)', borderRadius: 999, padding: '7px 14px', background: 'rgba(19,38,68,.45)', marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#45d0ff' }} />
            <span style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9fd8ff', fontWeight: 700 }}>
              Mission Control Premium
            </span>
          </div>

          <h1 className="mc-title" style={{ fontSize: 'clamp(2.3rem,5.5vw,4.5rem)', fontWeight: 850, maxWidth: 900 }}>
            AI-Native Contact Center OS
            <br />
            <span style={{ color: '#68d6ff' }}>Built for Executive-Grade Operations</span>
          </h1>

          <p style={{ marginTop: 20, maxWidth: 720, color: 'rgba(232,240,254,.72)', fontSize: 'clamp(1rem,1.8vw,1.17rem)', lineHeight: 1.7 }}>
            Orchestrate voice, chat, email, SMS, and social with one unified intelligence layer.
            Deploy faster, score every interaction, enforce policy in real time, and operate with
            mission-control visibility across every queue and team.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
            <Link href="/dashboard" style={{ textDecoration: 'none', background: '#59d3ff', color: '#04111e', fontWeight: 800, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', padding: '13px 24px', borderRadius: 10 }}>
              Open Operations Dashboard
            </Link>
            <Link href="/flow-rewrite" style={{ textDecoration: 'none', background: 'rgba(12,22,39,.75)', border: '1px solid rgba(121,180,255,.35)', color: '#d5e9ff', fontWeight: 700, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', padding: '13px 22px', borderRadius: 10 }}>
              Launch AI Rewrite Engine
            </Link>
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {outcomes.map((o) => (
              <div key={o.kpi} className="mc-card" style={{ padding: '18px 16px' }}>
                <p style={{ color: 'rgba(232,240,254,.6)', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }}>{o.kpi}</p>
                <p style={{ color: '#68d6ff', fontWeight: 800, fontSize: 28 }}>{o.delta}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 24px 84px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
            {pillars.map((p) => (
              <div key={p.name} className="mc-card" style={{ padding: '22px 18px' }}>
                <p style={{ color: '#fff', fontSize: 17, fontWeight: 760, marginBottom: 8 }}>{p.name}</p>
                <p style={{ color: 'rgba(232,240,254,.62)', fontSize: 14, lineHeight: 1.65 }}>{p.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

