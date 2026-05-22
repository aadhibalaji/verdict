# Verdict

> Your bank statement, on trial.

Upload a CSV bank export. Three AI agents debate it in open court:

- **The Pessimist** — prosecution. Finds every red flag.
- **The Optimist** — defense. Reframes the spending as human.
- **The Judge** — delivers the final verdict after three rounds.

Built with Next.js 14 (App Router), Tailwind, and the Anthropic SDK using
`claude-sonnet-4-20250514`. Token-by-token streaming straight from the API to
the UI.

## Quick start

```bash
cp .env.local.example .env.local
# paste your key into .env.local
npm install
npm run dev
```

Open <http://localhost:3000>, drop in any bank-style CSV (or click the "paste a
sample" disclosure for a built-in one), and convene the court.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Server-side key used by `/api/debate`. Never exposed to the client. |

## How it works

```
CSV  ─►  /api/debate (Node runtime)
              │
              ├─ Parse with papaparse (lib/csv.ts)
              ├─ Build a structured "Exhibit A" brief
              ├─ Stream Pessimist → Optimist  × 3 rounds
              └─ Stream Judge with the full transcript
                        │
                        ▼
                NDJSON event stream
                        │
                        ▼
              Courtroom.tsx (React client)
```

### The streaming protocol

The API responds with newline-delimited JSON. Each line is one event:

| `type` | Payload | Meaning |
| --- | --- | --- |
| `summary` | `{ summary: StatementSummary }` | Parsed statement, sent once at the start. |
| `turn_start` | `{ role, round }` | A new turn is beginning. |
| `delta` | `{ role, round, text }` | A token chunk for the active turn. |
| `turn_end` | `{ role, round }` | The current turn has finished. |
| `done` | `{ verdict: { label, line } | null }` | All seven turns complete. |
| `error` | `{ message }` | Something went wrong mid-trial. |

### CSV expectations

The parser is forgiving. It auto-detects common header names:

- **Date** — `date`, `posted`, `posting date`, `transaction date`, …
- **Description** — `description`, `details`, `memo`, `narration`, `payee`, …
- **Amount** — either a signed `amount` column, or separate `debit` / `credit`
  columns. Negative values, parentheses, and `$`/`,` are all handled.
- **Category** *(optional)* — used as a hint for the Pessimist/Optimist briefs.

Only an aggregated brief is ever sent to Claude — never the full row dump —
which keeps prompts small and avoids leaking raw transaction lists.

## Architecture

```
app/
  layout.tsx           # Fonts (Cormorant Garamond + Inter + JetBrains Mono)
  page.tsx             # Hosts <Courtroom />
  globals.css          # Dark editorial theme, chamber frames, gold ornaments
  api/debate/route.ts  # Streaming orchestrator
components/
  Courtroom.tsx        # Top-level state machine + stream reader
  ExhibitA.tsx         # Parsed-statement summary card
  AgentBench.tsx       # Pessimist / Optimist panels (with round tickers)
  JudgeBench.tsx       # Judge panel
  VerdictReveal.tsx    # Final stamped sentence
  FileUpload.tsx       # CSV drop zone + sample paste
lib/
  csv.ts               # papaparse-based parser + summarizer
  agents.ts            # System prompts and per-turn user prompts
```

## Notes & limitations

- The page route is server-rendered on demand; the API route runs in the Node
  runtime so the Anthropic SDK can stream over HTTPS without edge limitations.
- A debate is roughly 7 model calls (3 × 2 + Judge), capped at ~600 tokens each
  (Judge 900). Expect ~30–60 seconds end-to-end depending on latency.
- CSV uploads are capped at 2 MB.
- This app is a piece of theater, not financial advice. The Judge is not your
  CFO.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with Next's config |
