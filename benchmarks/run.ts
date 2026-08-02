import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

import {
  buildCoachUser,
  buildJudgeUser,
  buildOptimistUser,
  buildPessimistUser,
  COACH_SYSTEM,
  judgeSystem,
  optimistSystem,
  pessimistSystem,
  type AgentTurn,
} from "../lib/agents";
import { buildEssayExhibit, essayToBrief } from "../lib/essay-evaluation";

const MODEL = "claude-sonnet-5";
const INPUTS_DIR = path.join(__dirname, "inputs");
const RESULTS_PATH = path.join(__dirname, "results.json");
const DIMENSIONS = ["specificity", "actionability", "coverage"] as const;
type Dimension = (typeof DIMENSIONS)[number];
type Scores = Record<Dimension, number>;

function loadApiKey(): string {
  const envPath = path.join(__dirname, "..", ".env.local");
  const raw = fs.readFileSync(envPath, "utf-8");
  const match = raw.match(/^ANTHROPIC_API_KEY=(.+)$/m);
  const key = match?.[1]?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  return key;
}

const client = new Anthropic({ apiKey: loadApiKey() });

async function complete(system: string | undefined, user: string, maxTokens: number): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: user }],
  });
  const block = message.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

async function runSingleClaude(input: string): Promise<string> {
  return complete(
    undefined,
    `You are a college admissions expert. Give feedback on this application material: ${input}`,
    2000,
  );
}

async function runVerdictDebate(input: string): Promise<string> {
  const exhibit = buildEssayExhibit({
    purpose: "college",
    prompt: "",
    essayText: input,
    context: "",
    rubric: null,
    school: "a selective university",
    extracurriculars: [],
    resumeText: null,
    resumeFileName: null,
    scholarshipName: null,
    pastAssignments: [],
  });
  const brief = essayToBrief(exhibit);

  const history: AgentTurn[] = [];

  const pessimistText = await complete(pessimistSystem("college"), buildPessimistUser(brief, 1, history), 1200);
  history.push({ role: "pessimist", round: 1, text: pessimistText });

  const optimistText = await complete(optimistSystem("college"), buildOptimistUser(brief, 1, history), 1200);
  history.push({ role: "optimist", round: 1, text: optimistText });

  const judgeText = await complete(judgeSystem("college"), buildJudgeUser(brief, history), 1500);
  history.push({ role: "judge", round: 4, text: judgeText });

  const verdictLabel = judgeText.match(/VERDICT:\s*([^—\-\n]+)/i)?.[1]?.trim() ?? "no formal verdict";
  const coachText = await complete(COACH_SYSTEM, buildCoachUser(brief, history, verdictLabel), 700);

  return `PESSIMIST:\n${pessimistText}\n\nOPTIMIST:\n${optimistText}\n\nJUDGE:\n${judgeText}\n\nCOACH:\n${coachText}`;
}

async function evaluate(input: string, outputA: string, outputB: string): Promise<{ a: Scores; b: Scores }> {
  const prompt = `You are an impartial evaluator of college admissions feedback quality. Below is the original application material, followed by two independent feedback responses (Output A and Output B), in random order.

ORIGINAL MATERIAL:
"""
${input}
"""

OUTPUT A:
"""
${outputA}
"""

OUTPUT B:
"""
${outputB}
"""

Score each output from 1-10 on these three dimensions:
- specificity: does it reference concrete details from the actual input?
- actionability: does it give specific things to improve, not just general observations?
- coverage: does it surface both strengths and weaknesses?

Respond with ONLY a JSON object in this exact shape, no other text:
{"a":{"specificity":N,"actionability":N,"coverage":N},"b":{"specificity":N,"actionability":N,"coverage":N}}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await complete(undefined, prompt, 1000);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through to retry
      }
    }
  }
  throw new Error("Evaluator did not return valid JSON after 3 attempts");
}

interface InputResult {
  file: string;
  single: Scores;
  verdict: Scores;
}

function average(results: InputResult[], key: "single" | "verdict"): Scores {
  const sums: Scores = { specificity: 0, actionability: 0, coverage: 0 };
  for (const r of results) {
    for (const d of DIMENSIONS) sums[d] += r[key][d];
  }
  const out = {} as Scores;
  for (const d of DIMENSIONS) out[d] = sums[d] / results.length;
  return out;
}

async function main() {
  const files = fs
    .readdirSync(INPUTS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  const results: InputResult[] = [];

  for (const file of files) {
    console.log(`Running ${file}...`);
    const input = fs.readFileSync(path.join(INPUTS_DIR, file), "utf-8");

    const [singleOutput, verdictOutput] = await Promise.all([runSingleClaude(input), runVerdictDebate(input)]);

    const singleIsA = Math.random() < 0.5;
    const outputA = singleIsA ? singleOutput : verdictOutput;
    const outputB = singleIsA ? verdictOutput : singleOutput;

    const scores = await evaluate(input, outputA, outputB);
    const singleScores = singleIsA ? scores.a : scores.b;
    const verdictScores = singleIsA ? scores.b : scores.a;

    results.push({ file, single: singleScores, verdict: verdictScores });
  }

  const overall = {
    single: average(results, "single"),
    verdict: average(results, "verdict"),
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify({ perInput: results, overall }, null, 2));

  console.log("\n=== Results (avg across all inputs) ===\n");
  console.log(`${"Dimension".padEnd(15)}${"Single Claude".padEnd(16)}Verdict Debate`);
  for (const d of DIMENSIONS) {
    console.log(`${d.padEnd(15)}${overall.single[d].toFixed(2).padEnd(16)}${overall.verdict[d].toFixed(2)}`);
  }
  console.log(`\nFull results written to ${RESULTS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
