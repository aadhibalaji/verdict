import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import {
  buildJudgeUser,
  buildOptimistUser,
  buildPessimistUser,
  JUDGE_SYSTEM,
  OPTIMIST_SYSTEM,
  PESSIMIST_SYSTEM,
  type AgentRole,
  type AgentTurn,
} from "@/lib/agents";
import { parseStatement, summaryToBrief } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-20250514";
const ROUNDS = 3;
const MAX_CSV_BYTES = 2_000_000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let csvText: string;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return badRequest("No CSV file was provided.");
      }
      if (file.size > MAX_CSV_BYTES) {
        return badRequest("That CSV is too large. 2MB max.");
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = String(body.csv ?? "");
    }
  } catch (e) {
    return badRequest("Could not read the uploaded file.");
  }

  if (!csvText.trim()) {
    return badRequest("The uploaded file appears to be empty.");
  }

  let parsed;
  try {
    parsed = parseStatement(csvText);
  } catch (e) {
    return badRequest("Could not parse that CSV. Make sure it has a header row with date, description, and amount columns.");
  }

  if (parsed.transactions.length === 0) {
    return badRequest("No transactions found. The CSV must include a header row and at least one row with a numeric amount.");
  }

  const brief = summaryToBrief(parsed.summary);
  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "summary", summary: parsed.summary });

        const history: AgentTurn[] = [];

        for (let round = 1; round <= ROUNDS; round++) {
          const pessimistText = await runAgent({
            client,
            role: "pessimist",
            round,
            system: PESSIMIST_SYSTEM,
            userMessage: buildPessimistUser(brief, round, history),
            send,
          });
          history.push({ role: "pessimist", round, text: pessimistText });

          const optimistText = await runAgent({
            client,
            role: "optimist",
            round,
            system: OPTIMIST_SYSTEM,
            userMessage: buildOptimistUser(brief, round, history),
            send,
          });
          history.push({ role: "optimist", round, text: optimistText });
        }

        const judgeText = await runAgent({
          client,
          role: "judge",
          round: ROUNDS + 1,
          system: JUDGE_SYSTEM,
          userMessage: buildJudgeUser(brief, history),
          send,
          maxTokens: 900,
        });

        send({ type: "done", verdict: extractVerdict(judgeText) });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error during the debate.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

interface RunAgentArgs {
  client: Anthropic;
  role: AgentRole;
  round: number;
  system: string;
  userMessage: string;
  send: (event: Record<string, unknown>) => void;
  maxTokens?: number;
}

async function runAgent({ client, role, round, system, userMessage, send, maxTokens = 600 }: RunAgentArgs): Promise<string> {
  send({ type: "turn_start", role, round });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  let collected = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      collected += text;
      send({ type: "delta", role, round, text });
    }
  }

  await stream.finalMessage();

  send({ type: "turn_end", role, round });
  return collected;
}

function extractVerdict(text: string): { label: string; line: string } | null {
  const match = text.match(/VERDICT:\s*([^—\-\n]+?)\s*[—\-]\s*(.+)$/im);
  if (!match) return null;
  return {
    label: match[1].trim().toUpperCase(),
    line: match[2].trim().replace(/[."]+$/, "").trim(),
  };
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
