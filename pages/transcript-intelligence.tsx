'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TranscriptIntelligenceDashboard from '@/components/TranscriptIntelligenceDashboard';
import type {
  FlowMappingResult,
  IntelligenceReport,
  NormalizedTranscript,
  TranscriptAnalysis,
} from '@/lib/transcriptIntelligenceEngine';

const EXAMPLE_TRANSCRIPT = `[09:00:12] Customer: Hi, I keep getting sent back to the same billing menu and my payment still fails.
[09:00:31] Agent: I am sorry you are experiencing this. Let me check the account and routing.
[09:01:05] Customer: This is the third time I called and it is very frustrating.
[09:01:42] Agent: I can transfer you to a billing specialist and escalate if needed.
[09:02:10] Customer: Please escalate to a supervisor if this is not fixed today.`;

export default function TranscriptIntelligencePage() {
  const [inputText, setInputText] = useState(EXAMPLE_TRANSCRIPT);
  const [fileMeta, setFileMeta] = useState<{ fileName?: string; mimeType?: string }>({});
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setInputText(text);
      setFileMeta({ fileName: file.name, mimeType: file.type });
      setError(null);
    } catch {
      setError('Failed to read transcript file.');
    }
  }

  async function handleAnalyze() {
    setError(null);
    setIsRunning(true);
    setReport(null);
    try {
      const ingestResponse = await fetch('/api/transcripts/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, fileName: fileMeta.fileName, mimeType: fileMeta.mimeType }),
      });
      const ingestData = await ingestResponse.json();
      if (!ingestResponse.ok) throw new Error(ingestData?.error ?? 'Failed to ingest transcript');
      const transcript = ingestData as NormalizedTranscript;

      const analyzeResponse = await fetch('/api/transcripts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const analyzeData = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(analyzeData?.error ?? 'Failed to analyze transcript');
      const analysis = analyzeData as TranscriptAnalysis;

      const mapResponse = await fetch('/api/transcripts/map-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const mapData = await mapResponse.json();
      if (!mapResponse.ok) throw new Error(mapData?.error ?? 'Failed to map transcript to flow');
      const flowMapping = mapData as FlowMappingResult;

      const reportResponse = await fetch('/api/transcripts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, analysis, flowMapping }),
      });
      const reportData = await reportResponse.json();
      if (!reportResponse.ok) throw new Error(reportData?.error ?? 'Failed to generate report');
      setReport(reportData as IntelligenceReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRunning(false);
    }
  }

  function handleDownloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'intelligence-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main
        style={{
          minHeight: '100vh',
          background: '#06111f',
          color: '#e8f0fe',
          fontFamily: "'Inter', 'Jost', sans-serif",
          padding: '2rem clamp(1rem, 4vw, 3rem)',
        }}
      >
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <p style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#5bd3ff', marginBottom: '.4rem' }}>
            AI4 Contact Center · Transcript Intelligence
          </p>
          <h1 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
            Conversation Transcript Ingestion & Intelligence Engine
          </h1>

          <TranscriptIntelligenceDashboard
            inputText={inputText}
            onInputTextChange={setInputText}
            onFileUpload={handleFileUpload}
            onAnalyze={handleAnalyze}
            onDownloadReport={handleDownloadReport}
            report={report}
            isRunning={isRunning}
            error={error}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
