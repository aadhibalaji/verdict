export type Purpose = "college" | "assignment" | "scholarship" | "other";

export const PURPOSE_LABELS: Record<Purpose, string> = {
  college: "College Application",
  assignment: "Class Assignment",
  scholarship: "Scholarship",
  other: "Other",
};

export interface ExtracurricularInput {
  activity: string;
  role: string;
  years: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

export interface PastAssignmentInput {
  text: string;
  fileName: string | null;
  rubric: string;
  feedback: string;
  grade: string;
}

export interface EssayEvaluationExhibit {
  purpose: Purpose;
  prompt: string;
  essayText: string;
  context: string;
  rubric: string | null;
  school: string | null;
  extracurriculars: ExtracurricularInput[];
  resumeText: string | null;
  resumeFileName: string | null;
  scholarshipName: string | null;
  pastAssignments: PastAssignmentInput[];
}

const COMMON_APP_LIMIT = 650;
const MAX_ESSAY_CHARS = 20_000;
const MAX_SIDE_TEXT_CHARS = 8_000;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function collegeEssayLimitNote(words: number): string {
  if (words > COMMON_APP_LIMIT) {
    return `OVER the 650-word Common App limit by ${words - COMMON_APP_LIMIT} words`;
  }
  if (words < 250) return `notably short for a 650-word-limit essay`;
  return `within the 650-word Common App limit`;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.85));
  return `${head}\n\n[…truncated for length — ${text.length.toLocaleString()} chars total…]`;
}

export function buildEssayExhibit(args: {
  purpose: Purpose;
  prompt: string;
  essayText: string;
  context: string;
  rubric: string | null;
  school: string | null;
  extracurriculars: ExtracurricularInput[];
  resumeText: string | null;
  resumeFileName: string | null;
  scholarshipName: string | null;
  pastAssignments: PastAssignmentInput[];
}): EssayEvaluationExhibit {
  const essayText = args.essayText.trim();
  if (!essayText) {
    throw new Error("An essay is required — paste the text or upload a file.");
  }

  const school = args.purpose === "college" ? args.school?.trim() || null : null;
  if (args.purpose === "college" && !school) {
    throw new Error("A target school is required for a college application submission.");
  }

  const scholarshipName = args.purpose === "scholarship" ? args.scholarshipName?.trim() || null : null;
  if (args.purpose === "scholarship" && !scholarshipName) {
    throw new Error("A scholarship name is required for a scholarship submission.");
  }

  const extracurriculars =
    args.purpose === "college"
      ? args.extracurriculars
          .map((ec) => ({
            activity: ec.activity.trim(),
            role: ec.role?.trim() ?? "",
            years: ec.years?.trim() ?? "",
            hoursPerWeek: ec.hoursPerWeek?.trim() ?? "",
            weeksPerYear: ec.weeksPerYear?.trim() ?? "",
          }))
          .filter((ec) => ec.activity.length > 0)
      : [];

  const resumeText = args.purpose === "college" ? args.resumeText?.trim() || null : null;
  const resumeFileName = args.purpose === "college" ? args.resumeFileName : null;

  const pastAssignments =
    args.purpose === "assignment"
      ? args.pastAssignments
          .map((pa) => ({
            text: pa.text.trim(),
            fileName: pa.fileName,
            rubric: pa.rubric.trim(),
            feedback: pa.feedback.trim(),
            grade: pa.grade.trim(),
          }))
          .filter((pa) => pa.text || pa.rubric || pa.feedback || pa.grade)
      : [];

  return {
    purpose: args.purpose,
    prompt: args.prompt.trim(),
    essayText,
    context: args.context.trim(),
    rubric: args.rubric?.trim() || null,
    school,
    extracurriculars,
    resumeText,
    resumeFileName,
    scholarshipName,
    pastAssignments,
  };
}

export function essayToBrief(exhibit: EssayEvaluationExhibit): string {
  const lines: string[] = [];
  lines.push(`EXHIBIT A — THE SUBMISSION`);
  lines.push(`Purpose: ${PURPOSE_LABELS[exhibit.purpose]}`);
  if (exhibit.purpose === "college" && exhibit.school) lines.push(`Target school: ${exhibit.school}`);
  if (exhibit.purpose === "scholarship" && exhibit.scholarshipName) {
    lines.push(`Scholarship: ${exhibit.scholarshipName}`);
  }
  lines.push("");

  if (exhibit.prompt) {
    lines.push(`EXHIBIT B — THE PROMPT / ASSIGNMENT QUESTION`);
    lines.push(exhibit.prompt);
    lines.push("");
  }

  const words = wordCount(exhibit.essayText);
  lines.push(`EXHIBIT C — THE ESSAY`);
  const note = exhibit.purpose === "college" ? ` — ${collegeEssayLimitNote(words)}` : "";
  lines.push(`(${words} words${note})`);
  lines.push(truncateText(exhibit.essayText, MAX_ESSAY_CHARS));
  lines.push("");

  if (exhibit.context) {
    lines.push(`EXHIBIT — ADDITIONAL CONTEXT`);
    lines.push(exhibit.context);
    lines.push("");
  }

  if (exhibit.rubric) {
    lines.push(`EXHIBIT — RUBRIC (CURRENT)`);
    lines.push(truncateText(exhibit.rubric, MAX_SIDE_TEXT_CHARS));
    lines.push("");
  }

  if (exhibit.purpose === "college") {
    if (exhibit.extracurriculars.length > 0) {
      lines.push(`EXHIBIT — EXTRACURRICULAR RECORD`);
      for (const ec of exhibit.extracurriculars) {
        const parts = [ec.activity];
        if (ec.role) parts.push(`role: ${ec.role}`);
        if (ec.years) parts.push(`years: ${ec.years}`);
        if (ec.hoursPerWeek) parts.push(`${ec.hoursPerWeek} hrs/week`);
        if (ec.weeksPerYear) parts.push(`${ec.weeksPerYear} weeks/year`);
        lines.push(`  • ${parts.join(" — ")}`);
      }
      lines.push("");
    }
    if (exhibit.resumeText) {
      lines.push(`EXHIBIT — RESUME${exhibit.resumeFileName ? ` (${exhibit.resumeFileName})` : ""}`);
      lines.push(truncateText(exhibit.resumeText, MAX_SIDE_TEXT_CHARS));
      lines.push("");
    }
  }

  if (exhibit.purpose === "assignment" && exhibit.pastAssignments.length > 0) {
    exhibit.pastAssignments.forEach((pa, i) => {
      lines.push(`EXHIBIT — PAST ASSIGNMENT ${i + 1}${pa.grade ? ` (grade: ${pa.grade})` : ""}`);
      if (pa.rubric) {
        lines.push(`Rubric used: ${truncateText(pa.rubric, MAX_SIDE_TEXT_CHARS)}`);
      }
      if (pa.feedback) {
        lines.push(`Professor's feedback: ${truncateText(pa.feedback, MAX_SIDE_TEXT_CHARS)}`);
      }
      if (pa.text) {
        lines.push(`Assignment text:`);
        lines.push(truncateText(pa.text, MAX_ESSAY_CHARS));
      }
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}
