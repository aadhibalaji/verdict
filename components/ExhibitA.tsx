"use client";

import type { ApplicationExhibit } from "@/lib/college-application";

interface ExhibitAProps {
  exhibit: ApplicationExhibit;
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export default function ExhibitA({ exhibit }: ExhibitAProps) {
  return (
    <section className="chamber-frame relative px-6 py-6 sm:px-8 animate-riseIn">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">EXHIBIT A</div>
          <h3 className="font-display text-3xl text-ink-50">The Application File</h3>
        </div>
        <div className="text-xs text-ink-300/70 font-mono tracking-wider">
          Target: {exhibit.school}
        </div>
      </div>

      {exhibit.essays.length > 0 && (
        <div className="mb-6 space-y-4">
          {exhibit.essays.map((essay, i) => (
            <EssayBlock key={i} label={essay.label} text={essay.text} />
          ))}
        </div>
      )}

      {exhibit.extracurriculars.length > 0 && (
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

      {exhibit.resumeText && (
        <div>
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-3">
            RESUME{exhibit.resumeFileName ? ` (${exhibit.resumeFileName})` : ""}
          </div>
          <div className="border border-brass-400/15 bg-ink-800/40 px-5 py-4 max-h-[240px] overflow-y-auto transcript-scroll">
            <p className="font-serif-body text-ink-100 text-base leading-relaxed whitespace-pre-wrap">
              {exhibit.resumeText}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function EssayBlock({ label, text }: { label: string; text: string }) {
  const PREVIEW_CHARS = 2400;
  const preview = text.length > PREVIEW_CHARS ? text.slice(0, PREVIEW_CHARS) : text;
  const isTruncated = text.length > PREVIEW_CHARS;
  const words = wordCount(text);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">
          {label.toUpperCase()}
        </div>
        <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/50 font-mono">{words} WORDS</div>
      </div>
      <div className="border border-brass-400/15 bg-ink-800/40 px-5 py-4 max-h-[260px] overflow-y-auto transcript-scroll">
        <p className="font-serif-body text-ink-100 text-base leading-relaxed whitespace-pre-wrap">
          {preview}
          {isTruncated && (
            <span className="text-ink-300/60 italic">
              {"\n\n…essay continues. The full text was passed to the court."}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
