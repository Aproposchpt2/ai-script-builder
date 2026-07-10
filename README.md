# AI4 Contact Center — AI Script Builder

**AI4 Contact Center Engineering Suite** · MVP v1.0 · Apropos Group LLC

## What it does
Convert natural-language call flow descriptions into structured JSON logic — instantly.

## Quick Start
\\\ash
npm install
npm run dev
\\\
Open http://localhost:3000/builder

## Stack
- Next.js 14 (TypeScript)
- Rule-based parser (no AI API key needed for MVP)
- Zero database required

## Project Structure
\\\
/pages/builder.tsx         Main UI — input + JSON output
/pages/api/parse-flow.ts   API route
/lib/parser.ts             extractMenu, extractOptions, extractAfterHours, extractHoliday
/components/JsonViewer.tsx Styled JSON display
/docs/                     Specification documents
\\\

## Docs
See [AI4_Script_Builder_MVP_Specification.md](./docs/AI4_Script_Builder_MVP_Specification.md) for the full developer spec.

---
© 2026 Apropos Group LLC
