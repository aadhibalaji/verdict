import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import {
  buildJudgeUser,
  buildOptimistUser,
  buildPessimistUser,
  judgeSystem,
  optimistSystem,
  pessimistSystem,
  type AgentRole,
  type AgentTurn,
} from "@/lib/agents";
import {
  buildEssayExhibit,
  essayToBrief,
  type ExtracurricularInput,
  type PastAssignmentInput,
  type Purpose,
} from "@/lib/essay-evaluation";
import { detectFileKind, extractFile } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5";
const ROUNDS = 3;
const MAX_FILE_BYTES = 8_000_000;
const MAX_SHORT_FIELD_CHARS = 200;

const PURPOSES: Purpose[] = ["college", "assignment", "scholarship", "other"];

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

  const purpose = String(form.get("purpose") ?? "") as Purpose;
  if (!PURPOSES.includes(purpose)) {
    return badRequest("A valid purpose is required.");
  }

  const prompt = String(form.get("prompt") ?? "");
  const context = String(form.get("context") ?? "");

  let essayText: string;
  try {
    essayText = await readTextOrFile(form, "essay", "essay");
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Could not read the essay.");
  }

  let rubric: string;
  try {
    rubric = await readTextOrFile(form, "rubric", "rubric");
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Could not read the rubric.");
  }

  const school = String(form.get("school") ?? "").trim();
  if (purpose === "college" && school.length > MAX_SHORT_FIELD_CHARS) {
    return badRequest(`Target school name is too long. Keep it under ${MAX_SHORT_FIELD_CHARS} characters.`);
  }

  const scholarshipName = String(form.get("scholarshipName") ?? "").trim();
  if (purpose === "scholarship" && scholarshipName.length > MAX_SHORT_FIELD_CHARS) {
    return badRequest(`Scholarship name is too long. Keep it under ${MAX_SHORT_FIELD_CHARS} characters.`);
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

  let resumeText: string | null = null;
  let resumeFileName: string | null = null;
  const resumeFile = form.get("resume");
  if (resumeFile instanceof File && resumeFile.size > 0) {
    try {
      resumeText = await extractUploaded(resumeFile, "Resume");
      resumeFileName = resumeFile.name;
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : "Could not read the resume.");
    }
  }

  const pastAssignmentCount = Number(form.get("pastAssignmentCount") ?? 0);
  const pastAssignments: PastAssignmentInput[] = [];
  for (let i = 0; i < pastAssignmentCount; i++) {
    let text = "";
    try {
      text = await readTextOrFile(form, `past_${i}`, `past assignment ${i + 1}`);
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : `Could not read past assignment ${i + 1}.`);
    }
    pastAssignments.push({
      text,
      fileName: null,
      rubric: String(form.get(`past_rubric_${i}`) ?? ""),
      feedback: String(form.get(`past_feedback_${i}`) ?? ""),
      grade: String(form.get(`past_grade_${i}`) ?? ""),
    });
  }

  let exhibit;
  try {
    exhibit = buildEssayExhibit({
      purpose,
      prompt,
      essayText,
      context,
      rubric: rubric || null,
      school,
      extracurriculars,
      resumeText,
      resumeFileName,
      scholarshipName,
      pastAssignments,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the submission.";
    return badRequest(message);
  }

  const brief = essayToBrief(exhibit);
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
            system: pessimistSystem(purpose),
            userMessage: buildPessimistUser(brief, round, history),
            send,
          });
          history.push({ role: "pessimist", round, text: pessimistText });

          const optimistText = await runAgent({
            client,
            role: "optimist",
            round,
            system: optimistSystem(purpose),
            userMessage: buildOptimistUser(brief, round, history),
            send,
          });
          history.push({ role: "optimist", round, text: optimistText });
        }

        const judgeText = await runAgent({
          client,
          role: "judge",
          round: ROUNDS + 1,
          system: judgeSystem(purpose),
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

async function extractUploaded(file: File, label: string): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`"${label}" is too large. 8MB max.`);
  }
  if (!detectFileKind(file.name, file.type)) {
    throw new Error(`"${label}" is an unsupported file type. PDF, DOCX, or TXT only.`);
  }
  const extracted = await extractFile(file);
  return extracted.text;
}

async function readTextOrFile(form: FormData, fieldPrefix: string, label: string): Promise<string> {
  const file = form.get(`${fieldPrefix}_file`);
  if (file instanceof File && file.size > 0) {
    return extractUploaded(file, label);
  }
  const text = form.get(`${fieldPrefix}_text`);
  return typeof text === "string" ? text : "";
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
