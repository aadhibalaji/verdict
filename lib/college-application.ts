export interface EssayInput {
  label: string;
  text: string;
}

export interface ExtracurricularInput {
  activity: string;
  role: string;
  years: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

export interface ApplicationExhibit {
  school: string;
  essays: EssayInput[];
  extracurriculars: ExtracurricularInput[];
  resumeText: string | null;
  resumeFileName: string | null;
}

const COMMON_APP_LIMIT = 650;
const MAX_ESSAY_CHARS = 20_000;
const MAX_RESUME_CHARS = 8_000;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function essayLimitNote(label: string, words: number): string {
  const isMain = /common app|personal statement|main essay/i.test(label);
  if (isMain) {
    if (words > COMMON_APP_LIMIT) {
      return `OVER the 650-word Common App limit by ${words - COMMON_APP_LIMIT} words`;
    }
    if (words < 250) return `notably short for a 650-word-limit essay`;
    return `within the 650-word Common App limit`;
  }
  if (words > 650) return `unusually long for a supplemental essay — most caps sit 100-350 words`;
  if (words < 30) return `very short — verify against this supplement's stated limit`;
  return `typical supplemental length`;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.85));
  return `${head}\n\n[…truncated for length — ${text.length.toLocaleString()} chars total…]`;
}

function exhibitLetter(index: number): string {
  return String.fromCharCode("B".charCodeAt(0) + index);
}

export function buildApplicationExhibit(args: {
  school: string;
  essays: EssayInput[];
  extracurriculars: ExtracurricularInput[];
  resumeText: string | null;
  resumeFileName: string | null;
}): ApplicationExhibit {
  const school = args.school.trim();
  const essays = args.essays
    .map((e) => ({ label: e.label.trim() || "Untitled essay", text: e.text.trim() }))
    .filter((e) => e.text.length > 0);
  const extracurriculars = args.extracurriculars
    .map((ec) => ({
      activity: ec.activity.trim(),
      role: ec.role?.trim() ?? "",
      years: ec.years?.trim() ?? "",
      hoursPerWeek: ec.hoursPerWeek?.trim() ?? "",
      weeksPerYear: ec.weeksPerYear?.trim() ?? "",
    }))
    .filter((ec) => ec.activity.length > 0);
  const resumeText = args.resumeText?.trim() || null;

  if (!school) {
    throw new Error(
      "A target school is required — the court needs to know which admissions bar to weigh this against.",
    );
  }
  if (essays.length === 0 && extracurriculars.length === 0 && !resumeText) {
    throw new Error(
      "Nothing to review. Submit at least one essay, one extracurricular, or a resume alongside the target school.",
    );
  }

  return { school, essays, extracurriculars, resumeText, resumeFileName: args.resumeFileName };
}

export function applicationToBrief(exhibit: ApplicationExhibit): string {
  const lines: string[] = [];
  lines.push(`EXHIBIT A — THE APPLICATION FILE`);
  lines.push(`Target school: ${exhibit.school}`);
  lines.push("");

  exhibit.essays.forEach((essay, i) => {
    const words = wordCount(essay.text);
    lines.push(`EXHIBIT ${exhibitLetter(i)} — ESSAY: ${essay.label.toUpperCase()}`);
    lines.push(`(${words} words — ${essayLimitNote(essay.label, words)})`);
    lines.push(truncateText(essay.text, MAX_ESSAY_CHARS));
    lines.push("");
  });

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
    lines.push(truncateText(exhibit.resumeText, MAX_RESUME_CHARS));
  }

  return lines.join("\n").trim();
}
