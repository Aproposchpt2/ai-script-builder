'use client';
import { useState } from 'react';
import type { ParsedCallFlow } from '@/lib/parser';
import JsonViewer from '@/components/JsonViewer';

const PLACEHOLDER = `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.`;

export default function BuilderPage() {
  const [text, setText]               = useState('');
  const [result, setResult]           = useState<ParsedCallFlow | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleGenerate() {
    if (!text.trim()) { setError('Please describe your call flow first.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/parse-flow', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setResult(data as ParsedCallFlow);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'call-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#06111f', color: '#e8f0fe', fontFamily: "'Inter', 'Jost', sans-serif", padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.4rem' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.5rem', fontWeight: 600 }}>
            AI4 Contact Center · Engineering Suite
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.1, margin: 0, color: '#fff' }}>
            AI Script Builder
          </h1>
          <p style={{ color: 'rgba(255,255,255,.5)', marginTop: '.6rem', fontSize: '.95rem' }}>
            Describe your call flow in plain English — get structured JSON logic instantly.
          </p>
        </div>

        {/* Input */}
        <label style={{ display: 'block', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '.6rem' }}>
          Describe your call flow
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: '8px',
            color: '#e8f0fe',
            padding: '1rem 1.1rem',
            fontSize: '.95rem',
            fontFamily: 'inherit',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            marginBottom: '1rem',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.6rem' }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              background: '#5bd3ff', color: '#06111f',
              border: 'none', borderRadius: '6px',
              padding: '.8rem 1.8rem',
              fontWeight: 800, fontSize: '.8rem',
              letterSpacing: '.14em', textTransform: 'uppercase',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Generating…' : 'Generate Logic →'}
          </button>

          {result && (
            <button
              onClick={handleDownload}
              style={{
                background: 'rgba(255,255,255,.08)',
                color: '#e8f0fe',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: '6px',
                padding: '.8rem 1.8rem',
                fontWeight: 700, fontSize: '.8rem',
                letterSpacing: '.14em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Download JSON ↓
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: '#ff7070', fontSize: '.88rem', marginBottom: '1rem', padding: '.8rem 1rem', background: 'rgba(255,80,80,.08)', borderRadius: '6px', border: '1px solid rgba(255,80,80,.2)' }}>
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div>
            <p style={{ fontSize: '.65rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '.6rem' }}>
              Parsed Call Flow Logic
            </p>
            <JsonViewer data={result} />
          </div>
        )}

      </div>
    </main>
  );
}
