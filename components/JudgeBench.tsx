"use client";

import { useEffect, useRef } from "react";

interface TurnState {
  role: "pessimist" | "optimist" | "judge";
  round: number;
  text: string;
  done: boolean;
}

interface JudgeBenchProps {
  turn: TurnState | null;
  isSpeaking: boolean;
  sealed: boolean;
}

export default function JudgeBench({ turn, isSpeaking, sealed }: JudgeBenchProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turn?.text]);

  const verdictBody = turn?.text
    ? turn.text.replace(/\n?VERDICT:.*$/im, "").trim()
    : "";

  return (
    <article
      className={`chamber-frame relative px-6 py-8 sm:px-10 transition-all ${
        sealed ? "opacity-60" : "opacity-100"
      } shadow-[0_0_80px_-30px_rgba(228,193,112,0.5)]`}
    >
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="text-center mb-4">
        <div className="text-[0.6rem] tracking-[0.5em] text-brass-300/80 mb-2">
          ⚖ THE BENCH ⚖
        </div>
        <h3 className="font-display text-5xl text-ink-50">The Judge</h3>
        <div className="divider-flourish mt-3">{sealed ? "Awaiting Closing Arguments" : isSpeaking ? "Delivering Verdict" : "Verdict Rendered"}</div>
      </div>

      <div
        ref={scrollRef}
        className="transcript-scroll max-h-[520px] overflow-y-auto px-2 sm:px-6"
      >
        {sealed ? (
          <p className="font-serif-body italic text-ink-300/70 text-center text-lg">
            The Judge will not speak until the prosecution and the defense have
            exhausted their three rounds.
          </p>
        ) : (
          <p
            className={`font-serif-body text-ink-50 text-xl sm:text-2xl leading-snug whitespace-pre-wrap text-balance ${
              isSpeaking ? "stream-cursor" : ""
            }`}
          >
            {verdictBody || (isSpeaking ? "\u00A0" : "")}
          </p>
        )}
      </div>
    </article>
  );
}
