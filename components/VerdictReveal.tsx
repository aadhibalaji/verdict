"use client";

interface VerdictRevealProps {
  verdict: { label: string; line: string } | null;
  onReset: () => void;
}

export default function VerdictReveal({ verdict, onReset }: VerdictRevealProps) {
  const tone = toneFor(verdict?.label ?? "");

  return (
    <section className="relative max-w-4xl mx-auto chamber-frame px-6 py-12 sm:px-12 text-center animate-riseIn">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="divider-flourish mb-6">The Verdict on Your Application</div>

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
          The Judge declined to issue a formal tier, but the verdict above stands as written.
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

function toneFor(label: string): { text: string } {
  const upper = label.toUpperCase();
  if (upper.includes("LIKELY")) return { text: "text-verdure-400" };
  if (upper.includes("TARGET")) return { text: "text-brass-300" };
  if (upper.includes("REACH")) return { text: "text-blood-400" };
  return { text: "text-brass-300" };
}
