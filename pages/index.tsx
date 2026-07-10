import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '560px' }}>
        <p style={{ fontSize: '.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.8rem', fontWeight: 600 }}>
          AI4 Contact Center · Engineering Suite
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700, lineHeight: 1.08, marginBottom: '1rem' }}>
          Build smarter<br />call flows.
        </h1>
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Describe your call flow in plain English. Get structured JSON logic you can download and deploy immediately.
        </p>
        <Link href="/builder" style={{ display: 'inline-block', background: '#5bd3ff', color: '#06111f', fontWeight: 800, fontSize: '.82rem', letterSpacing: '.16em', textTransform: 'uppercase', padding: '.9rem 2rem', borderRadius: '6px', textDecoration: 'none' }}>
          Open Script Builder →
        </Link>
      </div>
    </main>
  );
}
