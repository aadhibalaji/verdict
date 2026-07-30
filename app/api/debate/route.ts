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
import {
  applicationToBrief,
  buildApplicationExhibit,
  type EssayInput,
  type ExtracurricularInput,
} from "@/lib/college-application";
import { detectFileKind, extractFile } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5";
const ROUNDS = 3;
const MAX_FILE_BYTES = 8_000_000;
const MAX_SCHOOL_CHARS = 200;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return badRequestJson("ANTHROPIC_API_KEY is not set on the server.", 500);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest("Expected a multipart form submission.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Could not read the submission.");
  }

  const school = String(form.get("school") ?? "").trim();
  if (!school) {
    return badRequest("A target school is required.");
  }
  if (school.length > MAX_SCHOOL_CHARS) {
    return badRequest(`Target school name is too long. Keep it under ${MAX_SCHOOL_CHARS} characters.`);
  }

  let extracurriculars: ExtracurricularInput[] = [];
  const rawExtracurriculars = form.get("extracurriculars");
  if (typeof rawExtracurriculars === "string" && rawExtracurriculars.trim()) {
    try {
      const parsed = JSON.parse(rawExtracurriculars);
      if (Array.isArray(parsed)) {
        extracurriculars = parsed.map((ec) => ({
          activity: String(ec?.activity ?? ""),
          role: String(ec?.role ?? ""),
          years: String(ec?.years ?? ""),
          hoursPerWeek: String(ec?.hoursPerWeek ?? ""),
          weeksPerYear: String(ec?.weeksPerYear ?? ""),
        }));
      }
    } catch {
      return badRequest("Could not read the extracurricular record.");
    }
  }

  const essayCount = Number(form.get("essayCount") ?? 0);
  const essays: EssayInput[] = [];
  for (let i = 0; i < essayCount; i++) {
    const label = String(form.get(`essay_label_${i}`) ?? `Essay ${i + 1}`);
    const rawText = form.get(`essay_text_${i}`);
    const rawFile = form.get(`essay_file_${i}`);

    if (rawFile instanceof File && rawFile.size > 0) {
      if (rawFile.size > MAX_FILE_BYTES) {
        return badRequest(`"${label}" is too large. 8MB max.`);
      }
      if (!detectFileKind(rawFile.name, rawFile.type)) {
        return badRequest(`"${label}" is an unsupported file type. PDF, DOCX, or TXT only.`);
      }
      try {
        const extracted = await extractFile(rawFile);
        essays.push({ label, text: extracted.text });
      } catch (e) {
        const message = e instanceof Error ? e.message : `Could not read "${label}".`;
        return badRequest(message);
      }
    } else if (typeof rawText === "string") {
      essays.push({ label, text: rawText });
    }
  }

  let resumeText: string | null = null;
  let resumeFileName: string | null = null;
  const resumeFile = form.get("resume");
  if (resumeFile instanceof File && resumeFile.size > 0) {
    if (resumeFile.size > MAX_FILE_BYTES) {
      return badRequest("Resume file is too large. 8MB max.");
    }
    if (!detectFileKind(resumeFile.name, resumeFile.type)) {
      return badRequest("Unsupported resume file type. PDF, DOCX, or TXT only.");
    }
    try {
      const extracted = await extractFile(resumeFile);
      resumeText = extracted.text;
      resumeFileName = resumeFile.name;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not read the resume.";
      return badRequest(message);
    }
  }

  let exhibit;
  try {
    exhibit = buildApplicationExhibit({ school, essays, extracurriculars, resumeText, resumeFileName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the application file.";
    return badRequest(message);
  }

  const brief = applicationToBrief(exhibit);
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
  return badRequestJson(message, 400);
}

function badRequestJson(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
