"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ApplicationExhibit } from "@/lib/college-application";

import AgentBench from "./AgentBench";
import ApplicationForm, { type ApplicationSubmission } from "./ApplicationForm";
import ExhibitA from "./ExhibitA";
import JudgeBench from "./JudgeBench";
import VerdictReveal from "./VerdictReveal";

type Role = "pessimist" | "optimist" | "judge";

interface TurnState {
  role: Role;
  round: number;
  text: string;
  done: boolean;
}

interface VerdictInfo {
  label: string;
  line: string;
}

type Phase = "idle" | "loading" | "debating" | "verdict" | "error";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "AWAITING THE APPLICATION",
  loading: "ENTERING THE CHAMBER",
  debating: "ARGUMENTS IN PROGRESS",
  verdict: "VERDICT DELIVERED",
  error: "MISTRIAL",
};

export default function Courtroom() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [exhibit, setExhibit] = useState<ApplicationExhibit | null>(null);
  const [turns, setTurns] = useState<TurnState[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [verdict, setVerdict] = useState<VerdictInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pessimistTurns = useMemo(() => turns.filter((t) => t.role === "pessimist"), [turns]);
  const optimistTurns = useMemo(() => turns.filter((t) => t.role === "optimist"), [turns]);
  const judgeTurn = useMemo(() => turns.find((t) => t.role === "judge") ?? null, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleStart = useCallback(async (payload: ApplicationSubmission) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("loading");
    setError(null);
    setExhibit(null);
    setTurns([]);
    setCurrentRound(0);
    setCurrentRole(null);
    setVerdict(null);

    const formData = new FormData();
    formData.append("school", payload.school);
    formData.append("essayCount", String(payload.essays.length));
    payload.essays.forEach((essay, i) => {
      formData.append(`essay_label_${i}`, essay.label);
      if (essay.file) {
        formData.append(`essay_file_${i}`, essay.file);
      } else {
        formData.append(`essay_text_${i}`, essay.text);
      }
    });
    formData.append("extracurriculars", JSON.stringify(payload.extracurriculars));
    if (payload.resumeFile) {
      formData.append("resume", payload.resumeFile);
    }

    let response: Response;
    try {
      response = await fetch("/api/debate", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch {
      setError("Could not reach the courthouse. Check your connection.");
      setPhase("error");
      return;
    }

    if (!response.ok || !response.body) {
      let message = "The court refused to convene.";
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {}
      setError(message);
      setPhase("error");
      return;
    }

    setPhase("debating");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: any;
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }
          handleEvent(event);
        }
      }
      if (buffer.trim()) {
        try {
          handleEvent(JSON.parse(buffer));
        } catch {}
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError("The stream was interrupted before the court could finish.");
        setPhase("error");
      }
    }

    function handleEvent(event: any) {
      if (!event || typeof event !== "object") return;
      switch (event.type) {
        case "summary":
          if (event.exhibit) setExhibit(event.exhibit as ApplicationExhibit);
          break;
        case "turn_start":
          setCurrentRole(event.role as Role);
          setCurrentRound(event.round as number);
          setTurns((prev) => [
            ...prev,
            { role: event.role, round: event.round, text: "", done: false },
          ]);
          break;
        case "delta":
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === event.role && last.round === event.round) {
              next[next.length - 1] = { ...last, text: last.text + event.text };
            }
            return next;
          });
          break;
        case "turn_end":
          setTurns((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === event.role && last.round === event.round) {
              next[next.length - 1] = { ...last, done: true };
            }
            return next;
          });
          break;
        case "done":
          if (event.verdict) setVerdict(event.verdict as VerdictInfo);
          setCurrentRole(null);
          setPhase("verdict");
          break;
        case "error":
          setError(event.message ?? "The court could not render a verdict.");
          setPhase("error");
          break;
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setError(null);
    setExhibit(null);
    setTurns([]);
    setCurrentRound(0);
    setCurrentRole(null);
    setVerdict(null);
  }, []);

  const isStreaming = phase === "debating";

  return (
    <main className="relative min-h-screen px-4 sm:px-8 py-10">
      <BackgroundDecor />

      <header className="relative max-w-6xl mx-auto text-center mb-10">
        <div className="text-[0.65rem] tracking-[0.5em] text-brass-400/80 mb-3 chamber-lamp">
          THE COURT OF ADMISSIONS
        </div>
        <h1 className="font-display text-6xl sm:text-7xl md:text-8xl text-ink-50 tracking-tight leading-none">
          <span className="text-balance">Verdict</span>
        </h1>
        <p className="font-serif-body italic text-ink-200/80 mt-4 text-lg sm:text-xl max-w-2xl mx-auto text-balance">
          Your application. On trial.
        </p>
        <p className="font-serif-body text-ink-300/70 mt-2 text-base sm:text-lg max-w-2xl mx-auto text-balance">
          Essays, activities, a resume — submit the file and three agents will argue your case before the bench.
        </p>
        <div className="mt-6 text-[0.6rem] tracking-[0.45em] text-brass-300/70">
          {PHASE_LABELS[phase]}
          {phase === "debating" && currentRound > 0 && (
            <span className="ml-3 text-blood-400/80">
              ROUND {currentRound} OF 3 — {currentRole?.toUpperCase()} SPEAKING
            </span>
          )}
        </div>
      </header>

      {phase === "idle" && (
        <section className="relative max-w-4xl mx-auto">
          <ApplicationForm onSubmit={handleStart} />
        </section>
      )}

      {phase === "error" && (
        <section className="relative max-w-3xl mx-auto">
          <div className="chamber-frame p-8 text-center">
            <Ornaments />
            <div className="font-display text-3xl text-blood-400 mb-3">Mistrial</div>
            <p className="text-ink-200/90 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-5 py-2 border border-brass-400/40 text-brass-300 hover:bg-brass-400/10 transition tracking-[0.3em] text-xs"
            >
              TRY AGAIN
            </button>
          </div>
        </section>
      )}

      {(phase === "loading" || phase === "debating" || phase === "verdict") && (
        <section className="relative max-w-7xl mx-auto space-y-8">
          {exhibit && <ExhibitA exhibit={exhibit} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentBench
              role="pessimist"
              title="The Pessimist"
              subtitle="for the prosecution"
              accent="blood"
              turns={pessimistTurns}
              activeRound={currentRole === "pessimist" ? currentRound : null}
              totalRounds={3}
            />
            <AgentBench
              role="optimist"
              title="The Optimist"
              subtitle="for the defense"
              accent="verdure"
              turns={optimistTurns}
              activeRound={currentRole === "optimist" ? currentRound : null}
              totalRounds={3}
            />
          </div>

          <JudgeBench
            turn={judgeTurn}
            isSpeaking={currentRole === "judge"}
            sealed={!judgeTurn && phase !== "verdict"}
          />

          {phase === "verdict" && (
            <VerdictReveal verdict={verdict} onReset={handleReset} />
          )}

          {isStreaming && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-[0.6rem] tracking-[0.4em] text-ink-300/60 hover:text-blood-400 transition"
              >
                DECLARE A MISTRIAL
              </button>
            </div>
          )}
        </section>
      )}

      <footer className="relative text-center mt-16 text-[0.6rem] tracking-[0.4em] text-ink-400/60">
        BUILT WITH ANTHROPIC CLAUDE — NO ADVICE RENDERED IN THIS CHAMBER IS LEGALLY BINDING
      </footer>
    </main>
  );
}

function BackgroundDecor() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 spotlight" aria-hidden />
      <div className="pointer-events-none fixed inset-0 mix-blend-screen opacity-[0.04] hand-bg" aria-hidden />
    </>
  );
}

function Ornaments() {
  return (
    <>
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />
    </>
  );
}
