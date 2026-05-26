"use client";

import { formatCurrency, type Exhibit, type StatementSummary } from "@/lib/csv";

interface ExhibitAProps {
  exhibit: Exhibit;
}

export default function ExhibitA({ exhibit }: ExhibitAProps) {
  return (
    <section className="chamber-frame relative px-6 py-6 sm:px-8 animate-riseIn">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <ExhibitHeader exhibit={exhibit} />

      {exhibit.question && (
        <QuestionBlock
          question={exhibit.question}
          highlighted={!hasEvidence(exhibit)}
        />
      )}

      {exhibit.kind === "summary" && <SummaryBlock summary={exhibit.summary} />}
      {exhibit.kind === "text" && exhibit.source !== "text" && (
        <TextBlock text={exhibit.text} source={exhibit.source} />
      )}
    </section>
  );
}

function hasEvidence(exhibit: Exhibit): boolean {
  if (exhibit.kind === "summary") return true;
  if (exhibit.kind === "text" && exhibit.source !== "text") return true;
  return false;
}

function ExhibitHeader({ exhibit }: { exhibit: Exhibit }) {
  const subtitle =
    exhibit.kind === "summary"
      ? `${exhibit.summary.parsedCount} transactions${exhibit.summary.dateRange.start ? ` · ${exhibit.summary.dateRange.start} → ${exhibit.summary.dateRange.end ?? "?"}` : ""}`
      : exhibit.source === "pdf"
        ? `PDF · ${(exhibit.text.length / 1000).toFixed(1)}k characters${exhibit.fileName ? ` · ${exhibit.fileName}` : ""}`
        : exhibit.source === "docx"
          ? `DOCX · ${(exhibit.text.length / 1000).toFixed(1)}k characters${exhibit.fileName ? ` · ${exhibit.fileName}` : ""}`
          : "Submitted in the petitioner's own words";

  const heading =
    exhibit.kind === "summary"
      ? "The Statement"
      : exhibit.source === "text"
        ? "The Petition"
        : "The Evidence";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
      <div>
        <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">
          EXHIBIT A
        </div>
        <h3 className="font-display text-3xl text-ink-50">{heading}</h3>
      </div>
      <div className="text-xs text-ink-300/70 font-mono tracking-wider">
        {subtitle}
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  highlighted,
}: {
  question: string;
  highlighted: boolean;
}) {
  return (
    <blockquote
      className={`relative border-l-2 border-brass-400/60 pl-5 py-1 mb-6 ${
        highlighted ? "" : "opacity-95"
      }`}
    >
      <div className="text-[0.55rem] tracking-[0.4em] text-brass-300/80 mb-1">
        THE QUESTION
      </div>
      <p className="font-display italic text-2xl sm:text-3xl text-ink-50 leading-snug text-balance">
        “{question}”
      </p>
    </blockquote>
  );
}

function SummaryBlock({ summary }: { summary: StatementSummary }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Inflow" value={formatCurrency(summary.totalInflow)} tone="verdure" />
        <Stat label="Outflow" value={formatCurrency(summary.totalOutflow)} tone="blood" />
        <Stat
          label="Net"
          value={formatCurrency(summary.net)}
          tone={summary.net >= 0 ? "verdure" : "blood"}
        />
        <Stat
          label="Weekend / Weekday"
          value={`${formatCurrency(summary.weekendSpending)} / ${formatCurrency(summary.weekdaySpending)}`}
          tone="brass"
          small
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        {summary.topMerchants.length > 0 && (
          <List
            heading="Top merchants"
            items={summary.topMerchants.map((m) => ({
              left: m.name,
              right: `${formatCurrency(m.total)} · ${m.count}x`,
            }))}
          />
        )}
        {summary.recurringCandidates.length > 0 && (
          <List
            heading="Likely recurring"
            items={summary.recurringCandidates.map((m) => ({
              left: m.name,
              right: `${m.count}x · ${formatCurrency(m.total)}`,
            }))}
          />
        )}
      </div>
    </>
  );
}

function TextBlock({
  text,
  source,
}: {
  text: string;
  source: "pdf" | "docx";
}) {
  const PREVIEW_CHARS = 2400;
  const preview = text.length > PREVIEW_CHARS ? text.slice(0, PREVIEW_CHARS) : text;
  const isTruncated = text.length > PREVIEW_CHARS;

  return (
    <div>
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-3">
        ENTERED INTO THE RECORD ({source.toUpperCase()})
      </div>
      <div className="border border-brass-400/15 bg-ink-800/40 px-5 py-4 max-h-[320px] overflow-y-auto transcript-scroll">
        <p className="font-serif-body text-ink-100 text-base leading-relaxed whitespace-pre-wrap">
          {preview}
          {isTruncated && (
            <span className="text-ink-300/60 italic">
              {"\n\n…document continues. The full text was passed to the court."}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  tone: "verdure" | "blood" | "brass";
  small?: boolean;
}

function Stat({ label, value, tone, small }: StatProps) {
  const toneClass =
    tone === "verdure"
      ? "text-verdure-400"
      : tone === "blood"
        ? "text-blood-400"
        : "text-brass-300";
  return (
    <div className="border-l border-brass-400/20 pl-3">
      <div className="text-[0.55rem] tracking-[0.4em] text-ink-300/60 mb-1">
        {label.toUpperCase()}
      </div>
      <div className={`font-display ${small ? "text-base" : "text-2xl"} ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

interface ListProps {
  heading: string;
  items: Array<{ left: string; right: string }>;
}

function List({ heading, items }: ListProps) {
  return (
    <div>
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">
        {heading.toUpperCase()}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-b border-brass-400/10 pb-1.5"
          >
            <span className="text-ink-100 truncate">{it.left}</span>
            <span className="text-ink-300 font-mono text-xs whitespace-nowrap">
              {it.right}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
