"use client";

import { PURPOSE_LABELS, type EssayEvaluationExhibit } from "@/lib/essay-evaluation";

interface ExhibitAProps {
  exhibit: EssayEvaluationExhibit;
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export default function ExhibitA({ exhibit }: ExhibitAProps) {
  const subtitle =
    exhibit.purpose === "college" && exhibit.school
      ? `Target: ${exhibit.school}`
      : exhibit.purpose === "scholarship" && exhibit.scholarshipName
        ? `Scholarship: ${exhibit.scholarshipName}`
        : PURPOSE_LABELS[exhibit.purpose];

  return (
    <section className="chamber-frame relative px-6 py-6 sm:px-8 animate-riseIn">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">
            EXHIBIT A — {PURPOSE_LABELS[exhibit.purpose].toUpperCase()}
          </div>
          <h3 className="font-display text-3xl text-ink-50">The Submission</h3>
        </div>
        <div className="text-xs text-ink-300/70 font-mono tracking-wider">{subtitle}</div>
      </div>

      {exhibit.prompt && (
        <blockquote className="relative border-l-2 border-brass-400/60 pl-5 py-1 mb-6">
          <div className="text-[0.55rem] tracking-[0.4em] text-brass-300/80 mb-1">THE PROMPT</div>
          <p className="font-display italic text-xl sm:text-2xl text-ink-50 leading-snug text-balance">
            “{exhibit.prompt}”
          </p>
        </blockquote>
      )}

      <div className="mb-6">
        <TextBlock label="The Essay" text={exhibit.essayText} showWordCount />
      </div>

      {exhibit.context && (
        <div className="mb-6">
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">CONTEXT</div>
          <p className="font-serif-body italic text-ink-100 text-base leading-relaxed whitespace-pre-wrap">
            {exhibit.context}
          </p>
        </div>
      )}

      {exhibit.rubric && (
        <div className="mb-6">
          <TextBlock label="Rubric" text={exhibit.rubric} />
        </div>
      )}

      {exhibit.purpose === "college" && exhibit.extracurriculars.length > 0 && (
        <div className="mb-6">
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">
            EXTRACURRICULAR RECORD
          </div>
          <ul className="space-y-1.5 text-sm">
            {exhibit.extracurriculars.map((ec, i) => (
              <li key={i} className="border-b border-brass-400/10 pb-1.5 text-ink-100">
                <span className="text-ink-50">{ec.activity}</span>
                {[ec.role, ec.years, ec.hoursPerWeek && `${ec.hoursPerWeek} hrs/wk`, ec.weeksPerYear && `${ec.weeksPerYear} wks/yr`]
                  .filter(Boolean)
                  .map((part, j) => (
                    <span key={j} className="text-ink-300/70">
                      {" · "}
                      {part}
                    </span>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exhibit.purpose === "college" && exhibit.resumeText && (
        <div className="mb-6">
          <TextBlock
            label={`Resume${exhibit.resumeFileName ? ` (${exhibit.resumeFileName})` : ""}`}
            text={exhibit.resumeText}
          />
        </div>
      )}

      {exhibit.purpose === "assignment" && exhibit.pastAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">PAST ASSIGNMENTS</div>
          {exhibit.pastAssignments.map((pa, i) => (
            <div key={i} className="border border-brass-400/15 bg-ink-800/40 px-5 py-4 text-sm space-y-2">
              <div className="flex items-center justify-between text-ink-300/70">
                <span>Assignment {i + 1}</span>
                {pa.grade && <span className="font-mono text-brass-300">{pa.grade}</span>}
              </div>
              {pa.feedback && (
                <p className="font-serif-body italic text-ink-100 whitespace-pre-wrap">“{pa.feedback}”</p>
              )}
              {pa.rubric && <p className="text-ink-300/70 text-xs">Rubric: {pa.rubric}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TextBlock({ label, text, showWordCount }: { label: string; text: string; showWordCount?: boolean }) {
  const PREVIEW_CHARS = 2400;
  const preview = text.length > PREVIEW_CHARS ? text.slice(0, PREVIEW_CHARS) : text;
  const isTruncated = text.length > PREVIEW_CHARS;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">{label.toUpperCase()}</div>
        {showWordCount && (
          <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/50 font-mono">
            {wordCount(text)} WORDS
          </div>
        )}
      </div>
      <div className="border border-brass-400/15 bg-ink-800/40 px-5 py-4 max-h-[260px] overflow-y-auto transcript-scroll">
        <p className="font-serif-body text-ink-100 text-base leading-relaxed whitespace-pre-wrap">
          {preview}
          {isTruncated && (
            <span className="text-ink-300/60 italic">
              {"\n\n…continues. The full text was passed to the court."}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
