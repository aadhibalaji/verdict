# Verdict

> Your essay. On trial.

Submit a college essay, an extracurricular list, a class assignment, or a
scholarship essay. Four AI agents work the case before the bench:

- **The Pessimist** — prosecution. Finds every flaw, cliché, and weak argument.
- **The Optimist** — defense. Reframes weaknesses and defends the writer.
- **The Judge** — delivers a verdict (REACH / TARGET / LIKELY, a letter
  grade, or a strength tier, depending on the submission's purpose) after
  three rounds of debate.
- **The Coach** — reads the full debate and the verdict, then hands the
  applicant exactly 5 specific, actionable edits to make before submitting.

Built with Next.js 14 (App Router), Tailwind, and the Anthropic SDK using
`claude-sonnet-5`. Token-by-token streaming straight from the API to the
courtroom UI.

## Quick start

```bash
cp .env.local.example .env.local
# paste your key into .env.local
npm install
npm run dev
```

Open <http://localhost:3000>, then go to `/dashboard` to enter the courtroom.
Paste an essay (or extracurricular list) as text or upload a PDF / DOCX / TXT
file, pick a purpose, and submit.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Server-side key used by `/api/debate` and `benchmarks/run.ts`. Never exposed to the client. |

## How it works

```
Submission (essay/EC text or PDF/DOCX/TXT) ─►  /api/debate (Node runtime)
                          │
                          ├─ Extract file text via pdf-parse / mammoth
                          ├─ Build a structured Exhibit (essayToBrief)
                          ├─ Stream Pessimist → Optimist  × 3 rounds
                          ├─ Stream the Judge with the full transcript
                          └─ Stream the Coach with the transcript + verdict
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
| `summary` | `{ exhibit: EssayEvaluationExhibit }` | Parsed exhibit. Sent once at the start. |
| `turn_start` | `{ role, round }` | A new turn is beginning. `role` is one of `pessimist`, `optimist`, `judge`, `coach`. |
| `delta` | `{ role, round, text }` | A token chunk for the active turn. |
| `turn_end` | `{ role, round }` | The current turn has finished. |
| `done` | `{ verdict: { label, line } \| null }` | All five turns complete (3 rounds of debate + Judge + Coach). |
| `error` | `{ message }` | Something went wrong mid-trial. |

### Submission purposes

The purpose changes how the Pessimist, Optimist, and Judge calibrate:

- **College application** — calibrated to a target school's selectivity;
  checks the 650-word Common App limit; flags cliché topics; can factor in
  an extracurricular record and resume.
- **Class assignment** — calibrated to a specific professor's past grades
  and feedback, and/or a rubric, if provided.
- **Scholarship** — calibrated to a named scholarship's likely priorities.
- **Other** — plain writing-quality assessment, no selectivity framing.

## Architecture

```
app/
  layout.tsx           # Fonts (Cormorant Garamond + Inter + JetBrains Mono)
  page.tsx              # Landing page
  dashboard/page.tsx     # Hosts <Courtroom />
  globals.css           # Dark editorial theme, chamber frames, gold ornaments
  api/debate/route.ts    # Streaming orchestrator (5 agent calls)
components/
  Courtroom.tsx          # Top-level state machine + stream reader
  ExhibitA.tsx           # Renders the parsed submission
  EssayForm.tsx          # Purpose picker + text/file inputs
  AgentBench.tsx         # Pessimist / Optimist panels (with round tickers)
  JudgeBench.tsx         # Judge panel
  CoachBench.tsx         # Coach panel (cyan accent, 5-point action plan)
  VerdictReveal.tsx      # Final stamped verdict
lib/
  agents.ts              # System prompts + per-turn user prompts for all 4 agents
  essay-evaluation.ts    # Purpose-aware exhibit builder + brief formatter
  extract.ts             # PDF (pdf-parse) + DOCX (mammoth) extractors
benchmarks/
  run.ts                 # Single-Claude vs. Verdict (debate + Coach) benchmark
  inputs/                # Sample essays / EC lists used by the benchmark
  results/               # Per-run benchmark output (see Benchmarks below)
```

## Notes & limitations

- The API route runs in the Node runtime so the Anthropic SDK can stream
  over HTTPS and `pdf-parse` / `mammoth` can read binary buffers.
- A trial is 5 model calls (Pessimist × 3, Optimist × 3 interleaved, Judge,
  Coach — 8 calls total across the debate rounds plus verdict and coaching).
  Expect well under a minute end-to-end depending on latency.
- This app is a piece of theater, not admissions or academic advice.

## Benchmarks

`benchmarks/run.ts` compares a single unstructured Claude call against the
full Verdict pipeline (debate + Coach) on the same 5 sample submissions in
`benchmarks/inputs/`. A blind third Claude call scores both outputs 1–10 on
**specificity**, **actionability**, and **coverage**, without knowing which
is which.

```bash
npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' benchmarks/run.ts
```

Because individual LLM-judged runs are noisy, the table below is the average
of 5 full benchmark runs (`benchmarks/results/run-1.json` … `run-5.json`),
taken after adding the Coach agent:

| Dimension | Single Claude (avg) | Verdict (avg) | Improvement |
| --- | --- | --- | --- |
| Specificity | 7.88 | 8.80 | +12% |
| Actionability | 6.84 | 8.56 | +25% |
| Coverage | 6.88 | 8.12 | +18% |

Single Claude wins on raw specificity in some runs, but the full Verdict
pipeline — debate followed by the Coach's 5-point action plan — consistently
comes out ahead on actionability and coverage: the courtroom format surfaces
both strengths and weaknesses, and the Coach turns that debate into concrete
edits instead of leaving it as rhetoric.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with Next's config |
