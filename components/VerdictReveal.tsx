"use client";

import type { Purpose } from "@/lib/essay-evaluation";

interface VerdictRevealProps {
  verdict: { label: string; line: string } | null;
  purpose: Purpose;
  onReset: () => void;
}

export default function VerdictReveal({ verdict, purpose, onReset }: VerdictRevealProps) {
  const tone = toneFor(purpose, verdict?.label ?? "");

  return (
    <section className="relative max-w-4xl mx-auto chamber-frame px-6 py-12 sm:px-12 text-center animate-riseIn">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="divider-flourish mb-6">The Verdict on Your Essay</div>

      {verdict ? (
        <>
          <div
            className={`stamp ${tone.text} animate-gavel inline-block`}
            style={{ borderColor: "currentColor" }}
          >
            {verdict.label}
          </div>
          <p className="font-display text-3xl sm:text-4xl text-ink-50 mt-8 text-balance leading-snug">
            “{verdict.line}”
          </p>
        </>
      ) : (
        <p className="font-serif-body italic text-ink-200 text-xl">
          The Judge declined to issue a formal verdict line, but the reasoning above stands as written.
        </p>
      )}

      <div className="mt-10">
        <button
          onClick={onReset}
          className="px-7 py-3 border border-brass-400 text-brass-300 hover:bg-brass-400 hover:text-ink-900 transition tracking-[0.35em] text-xs"
        >
          NEW TRIAL
        </button>
      </div>
    </section>
  );
}

function toneFor(purpose: Purpose, label: string): { text: string } {
  const upper = label.toUpperCase();

  if (purpose === "college" || purpose === "scholarship") {
    if (upper.includes("LIKELY")) return { text: "text-verdure-400" };
    if (upper.includes("TARGET")) return { text: "text-brass-300" };
    if (upper.includes("REACH")) return { text: "text-blood-400" };
    return { text: "text-brass-300" };
  }

  if (purpose === "assignment") {
    if (upper.startsWith("A")) return { text: "text-verdure-400" };
    if (upper.startsWith("B")) return { text: "text-brass-300" };
    if (upper.startsWith("C") || upper.startsWith("D") || upper.startsWith("F")) {
      return { text: "text-blood-400" };
    }
    return { text: "text-brass-300" };
  }

  if (upper.includes("STRONG")) return { text: "text-verdure-400" };
  if (upper.includes("PROMISING")) return { text: "text-brass-300" };
  if (upper.includes("NEEDS WORK")) return { text: "text-blood-400" };
  return { text: "text-brass-300" };
}
