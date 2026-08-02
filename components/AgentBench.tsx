"use client";

import { useEffect, useRef } from "react";

interface TurnState {
  role: "pessimist" | "optimist" | "judge" | "coach";
  round: number;
  text: string;
  done: boolean;
}

type Accent = "blood" | "verdure" | "brass";

interface AgentBenchProps {
  role: "pessimist" | "optimist";
  title: string;
  subtitle: string;
  accent: Accent;
  turns: TurnState[];
  activeRound: number | null;
  totalRounds: number;
}

const accentMap: Record<
  Accent,
  { text: string; border: string; glow: string; sigil: string }
> = {
  blood: {
    text: "text-blood-400",
    border: "border-blood-500/40",
    glow: "shadow-[0_0_60px_-30px_rgba(201,67,58,0.7)]",
    sigil: "⚖",
  },
  verdure: {
    text: "text-verdure-400",
    border: "border-verdure-500/40",
    glow: "shadow-[0_0_60px_-30px_rgba(92,143,106,0.6)]",
    sigil: "✦",
  },
  brass: {
    text: "text-brass-300",
    border: "border-brass-400/40",
    glow: "shadow-[0_0_60px_-30px_rgba(228,193,112,0.7)]",
    sigil: "§",
  },
};

export default function AgentBench({
  title,
  subtitle,
  accent,
  turns,
  activeRound,
  totalRounds,
}: AgentBenchProps) {
  const a = accentMap[accent];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <article
      className={`chamber-frame relative px-6 py-6 sm:px-8 ${a.glow} animate-riseIn`}
    >
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <header className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className={`text-[0.6rem] tracking-[0.5em] ${a.text} opacity-90`}>
            {a.sigil} {subtitle.toUpperCase()}
          </div>
          <h3 className="font-display text-4xl text-ink-50 leading-tight">
            {title}
          </h3>
        </div>
        <RoundsTicker
          totalRounds={totalRounds}
          completed={turns.filter((t) => t.done).length}
          activeRound={activeRound}
          accent={accent}
        />
      </header>

      <div
        ref={scrollRef}
        className="transcript-scroll max-h-[420px] min-h-[180px] overflow-y-auto pr-3 space-y-5"
      >
        {turns.length === 0 && (
          <div className="font-serif-body italic text-ink-300/60 text-lg">
            …awaiting opening remarks.
          </div>
        )}
        {turns.map((t, i) => (
          <div key={`${t.role}-${t.round}-${i}`} className="animate-riseIn">
            <div
              className={`text-[0.55rem] tracking-[0.4em] mb-2 ${a.text} opacity-80`}
            >
              ROUND {t.round}
            </div>
            <p
              className={`font-serif-body text-ink-50 text-lg leading-snug whitespace-pre-wrap ${
                !t.done ? "stream-cursor" : ""
              }`}
            >
              {t.text || (!t.done ? "\u00A0" : "")}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

interface RoundsTickerProps {
  totalRounds: number;
  completed: number;
  activeRound: number | null;
  accent: Accent;
}

function RoundsTicker({ totalRounds, completed, activeRound, accent }: RoundsTickerProps) {
  const a = accentMap[accent];
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalRounds }).map((_, idx) => {
        const round = idx + 1;
        const isDone = round <= completed;
        const isActive = round === activeRound;
        return (
          <span
            key={round}
            className={`w-6 h-[2px] transition-all ${
              isDone
                ? `${a.text.replace("text-", "bg-")} opacity-90`
                : isActive
                  ? `${a.text.replace("text-", "bg-")} opacity-50 animate-pulse`
                  : "bg-ink-500/40"
            }`}
            aria-label={`Round ${round} ${isDone ? "done" : isActive ? "active" : "pending"}`}
          />
        );
      })}
    </div>
  );
}
