"use client";

import { useEffect, useRef } from "react";

interface TurnState {
  role: "pessimist" | "optimist" | "judge" | "coach";
  round: number;
  text: string;
  done: boolean;
}

interface CoachBenchProps {
  turn: TurnState | null;
  isSpeaking: boolean;
  sealed: boolean;
}

export default function CoachBench({ turn, isSpeaking, sealed }: CoachBenchProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turn?.text]);

  return (
    <article
      className={`chamber-frame relative px-6 py-8 sm:px-10 backdrop-blur-sm transition-all ${
        sealed ? "opacity-60" : "opacity-100"
      } shadow-[0_0_80px_-30px_rgba(34,211,238,0.55)]`}
      style={{ borderColor: "rgba(34,211,238,0.25)" }}
    >
      <span className="corner-ornament tl" style={{ borderColor: "rgba(34,211,238,0.45)" }} aria-hidden />
      <span className="corner-ornament tr" style={{ borderColor: "rgba(34,211,238,0.45)" }} aria-hidden />
      <span className="corner-ornament bl" style={{ borderColor: "rgba(34,211,238,0.45)" }} aria-hidden />
      <span className="corner-ornament br" style={{ borderColor: "rgba(34,211,238,0.45)" }} aria-hidden />

      <div className="text-center mb-4">
        <div className="text-[0.6rem] tracking-[0.5em] text-cyan-300/80 mb-2">
          ⟡ YOUR ACTION PLAN ⟡
        </div>
        <h3 className="font-display text-5xl text-ink-50">The Coach</h3>
        <div className="divider-flourish mt-3" style={{ color: "rgba(34,211,238,0.55)" }}>
          {sealed ? "Awaiting the Verdict" : isSpeaking ? "Drafting Your Edits" : "Edits Ready"}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="transcript-scroll max-h-[420px] overflow-y-auto px-2 sm:px-6"
      >
        {sealed ? (
          <p className="font-serif-body italic text-ink-300/70 text-center text-lg">
            The Coach will not speak until the Judge has delivered a verdict.
          </p>
        ) : (
          <p
            className={`font-serif-body text-ink-50 text-lg sm:text-xl leading-relaxed whitespace-pre-wrap ${
              isSpeaking ? "stream-cursor" : ""
            }`}
          >
            {turn?.text || (isSpeaking ? " " : "")}
          </p>
        )}
      </div>
    </article>
  );
}
