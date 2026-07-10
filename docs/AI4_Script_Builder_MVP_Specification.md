# AI4 Contact Center – AI Script Builder MVP Specification Document
### Developer Technical Specification
### Version 1.0 – July 9, 2026
### Author: Jeffery (Apropos Group LLC)
### Purpose: Build the MVP tonight

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [File Structure](#4-file-structure)
5. [/builder Page Specification](#5-builder-page-specification)
6. [/api/parse-flow Specification](#6-apiparse-flow-specification)
7. [Parsing Logic (Rule-Based)](#7-parsing-logic-rule-based)
8. [Optional Stretch Goal: Save Flows](#8-optional-stretch-goal-save-flows)
9. [Definition of Done (Tonight)](#9-definition-of-done-tonight)
10. [Developer Instructions for Copilot Desktop](#10-developer-instructions-for-copilot-desktop)

---

## 1. Overview

The **AI Script Builder MVP** is the foundational module of the AI4 Contact Center Engineering Suite. It converts natural-language call flow descriptions into structured JSON logic models. This MVP establishes the core "AI Senior Contact Center Engineer" behavior.

The MVP must allow a user to:

- Input a natural-language call flow description
- Generate structured JSON logic
- View the JSON in the UI
- Download the JSON as a file

This document defines the architecture, file structure, parsing logic, UI requirements, and implementation steps.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (TypeScript) |
| Frontend | React (Next.js pages or app router) |
| Backend | Next.js API routes |
| Data | In-memory JSON (no database required for MVP) |
| Optional Stretch | SQLite or Supabase for saving flows |

---

## 3. System Architecture

### Frontend
- `/builder` page
- Text input for call flow description
- "Generate Logic" button
- JSON results panel
- "Download JSON" button

### Backend
- `/api/parse-flow` API route
- Rule-based parser
- JSON response builder

### Utilities
- `parser.ts` module
- Functions for extracting menu, options, queues, after-hours, holiday logic

---

## 4. File Structure

### Pages Router

```
/pages/builder.tsx          # Main UI page
/pages/api/parse-flow.ts    # API route for parsing logic
/lib/parser.ts              # Parsing utility functions
/components/JsonViewer.tsx  # Optional pretty JSON viewer
```

### App Router (alternative)

```
/app/builder/page.tsx
/app/api/parse-flow/route.ts
/lib/parser.ts
/components/JsonViewer.tsx
```

---

## 5. /builder Page Specification

### UI Components

| Component | Type | Description |
|-----------|------|-------------|
| Call Flow Input | `<textarea>` | Labeled "Describe your call flow" |
| Generate Button | `<button>` | Labeled "Generate Logic" |
| JSON Results Panel | `<pre>` / viewer | Displays parsed output |
| Download Button | `<button>` | Labeled "Download JSON" |

### Frontend State

```ts
const [textInput, setTextInput]     = useState('');
const [parsedResult, setParsedResult] = useState(null);
```

### Frontend Logic

**`handleGenerate()`**
1. POST to `/api/parse-flow` with `{ text: textInput }`
2. Await JSON response
3. Store in `parsedResult`

**`handleDownload()`**
1. Create `Blob` from `JSON.stringify(parsedResult, null, 2)`
2. Trigger download as `call-flow.json`

### Example Placeholder Text

```
Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk.
After hours send to voicemail.
Holidays play special message.
```

---

## 6. /api/parse-flow Specification

### Purpose
Convert natural-language call flow descriptions into structured JSON.

### Request

```
POST /api/parse-flow
Content-Type: application/json
```

```json
{
  "text": "Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk. After hours send to voicemail. Holidays play special message."
}
```

### Response

```json
{
  "menu": "Main Menu",
  "options": [
    { "key": 1, "label": "Admissions",    "queue": "Admissions_Queue" },
    { "key": 2, "label": "Financial Aid", "queue": "FinAid_Queue"     },
    { "key": 3, "label": "IT Helpdesk",   "queue": "IT_Queue"         }
  ],
  "after_hours": "Voicemail_Main",
  "holiday":     "Holiday_Message"
}
```

### Error Response

```json
{ "error": "text field is required" }
```
HTTP `400`

---

## 7. Parsing Logic (Rule-Based)

All functions live in `/lib/parser.ts`.

---

### `extractMenu(text: string): string`

**Detect patterns:**
- `Main menu`
- `Menu:`
- `Menu -`

**Returns:** Matched label, or `"Main Menu"` as default.

```ts
export function extractMenu(text: string): string {
  const match = text.match(/(?:main\s+)?menu[:\s-]+([^\n.]+)/i);
  return match ? match[1].trim() : 'Main Menu';
}
```

---

### `extractOptions(text: string): Array<{ key: number, label: string, queue: string }>`

**Detect patterns:**
- `1 for Admissions`
- `2 for Financial Aid`
- `3 for IT Helpdesk`

**For each match:**
- `key` = number
- `label` = text after "for"
- `queue` = `${label.replace(/\s+/g, '')}_Queue`

```ts
export function extractOptions(text: string) {
  const pattern = /(\d+)\s+for\s+([A-Za-z ]+?)(?=[,.]|$)/gi;
  const options = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[2].trim();
    options.push({
      key:   parseInt(match[1], 10),
      label: label,
      queue: `${label.replace(/\s+/g, '')}_Queue`,
    });
  }
  return options;
}
```

---

### `extractAfterHours(text: string): string | null`

**Detect patterns:**
- `after hours`
- `after-hours`
- `afterhours`

**If "voicemail" also present → returns** `"Voicemail_Main"`

```ts
export function extractAfterHours(text: string): string | null {
  if (!/after[-\s]?hours/i.test(text)) return null;
  if (/voicemail/i.test(text)) return 'Voicemail_Main';
  return 'AfterHours_Default';
}
```

---

### `extractHoliday(text: string): string | null`

**Detect patterns:**
- `holiday`
- `holidays`

**If "message" also present → returns** `"Holiday_Message"`

```ts
export function extractHoliday(text: string): string | null {
  if (!/holidays?/i.test(text)) return null;
  if (/message/i.test(text)) return 'Holiday_Message';
  return 'Holiday_Default';
}
```

---

### API Response Builder

```ts
import { extractMenu, extractOptions, extractAfterHours, extractHoliday } from '@/lib/parser';

const result = {
  menu:        extractMenu(text),
  options:     extractOptions(text),
  after_hours: extractAfterHours(text),
  holiday:     extractHoliday(text),
};

return Response.json(result);
```

---

## 8. Optional Stretch Goal: Save Flows

### Database Table: `flows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `text_input` | `text` | Raw user input |
| `parsed_output` | `jsonb` | Parsed JSON result |
| `created_at` | `timestamp` | Auto-set on insert |

### API Route: `POST /api/save-flow`

**Request body:**

```json
{
  "text_input": "...",
  "parsed_output": { ... }
}
```

**Response:**

```json
{ "ok": true, "id": "<uuid>" }
```

---

## 9. Definition of Done (Tonight)

The MVP is **complete** when all of the following are true:

- [x] `/builder` page exists and renders
- [x] User can input call flow text in the textarea
- [x] Clicking "Generate Logic" POSTs to `/api/parse-flow` and displays result
- [x] JSON renders correctly in the results panel
- [x] "Download JSON" saves `call-flow.json` to disk
- [x] Basic error state handled (empty input, API failure)

This is the **first working version** of the AI4 Contact Center Engineering Suite.

---

## 10. Developer Instructions for Copilot Desktop

To scaffold the project directly, tell Copilot Desktop:

> "Scaffold a Next.js TypeScript project with the following files:
> - `/pages/builder.tsx` with a textarea, Generate Logic button, JSON panel, and Download JSON button
> - `/pages/api/parse-flow.ts` that calls parser functions and returns structured JSON
> - `/lib/parser.ts` with `extractMenu`, `extractOptions`, `extractAfterHours`, `extractHoliday`
> - `/components/JsonViewer.tsx` as a styled `<pre>` block
> Use the AI4 Script Builder MVP Specification as the source of truth."

---

*AI4 Contact Center Engineering Suite — AI Script Builder MVP v1.0*
*© 2026 Apropos Group LLC — Confidential*
