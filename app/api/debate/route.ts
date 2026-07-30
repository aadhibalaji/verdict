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
import { situationToBrief } from "@/lib/csv";
import { buildExhibit, detectFileKind, extractFile } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5";
const ROUNDS = 3;
const MAX_FILE_BYTES = 8_000_000;
const MAX_QUESTION_CHARS = 8_000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let question: string | null = null;
  let file: File | null = null;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const rawQuestion = form.get("question");
      if (typeof rawQuestion === "string") {
        question = rawQuestion;
      }
      const rawFile = form.get("file");
      if (rawFile instanceof File && rawFile.size > 0) {
        file = rawFile;
      }
    } else {
      const body = await req.json();
      if (typeof body?.question === "string") question = body.question;
    }
  } catch {
    return badRequest("Could not read the submission.");
  }

  if (question && question.length > MAX_QUESTION_CHARS) {
    return badRequest(`The petition is too long. Keep it under ${MAX_QUESTION_CHARS} characters.`);
  }

  if (file) {
    if (file.size > MAX_FILE_BYTES) {
      return badRequest("That file is too large. 8MB max.");
    }
    if (!detectFileKind(file.name, file.type)) {
      return badRequest("Unsupported file type. The court accepts PDF, DOCX, or CSV files only.");
    }
  }

  if (!question?.trim() && !file) {
    return badRequest("Describe a decision or upload a document — the court needs something to deliberate on.");
  }

  let exhibit;
  try {
    const extracted = file ? await extractFile(file) : null;
    exhibit = buildExhibit({
      question,
      file: extracted,
      fileName: file?.name ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not read that submission.";
    return badRequest(message);
  }

  const brief = situationToBrief(exhibit);
  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "summary", exhibit });

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
