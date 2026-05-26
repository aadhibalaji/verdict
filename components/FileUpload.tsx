"use client";

import { useCallback, useRef, useState } from "react";

interface SubmissionPayload {
  question: string;
  file: File | null;
}

interface FileUploadProps {
  onSubmit: (payload: SubmissionPayload) => void;
}

const ACCEPT_EXT = [".pdf", ".docx", ".csv"];
const ACCEPT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/vnd.ms-excel",
];

const QUESTION_EXAMPLES = [
  "Should I quit my job and start the company?",
  "Is this Brooklyn lease fair?",
  "Should I move to New York?",
  "Is this draft paper ready to submit?",
  "Should I take the counter-offer or leave?",
];

export default function FileUpload({ onSubmit }: FileUploadProps) {
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    const extOk = ACCEPT_EXT.some((ext) => name.endsWith(ext));
    const mimeOk = ACCEPT_MIMES.includes(f.type);
    if (!extOk && !mimeOk) {
      setHint("Unsupported file. The court accepts PDF, DOCX, or CSV.");
      setFile(null);
      return;
    }
    setHint(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      acceptFile(e.dataTransfer.files?.[0]);
    },
    [acceptFile],
  );

  const canSubmit = question.trim().length > 0 || file !== null;

  return (
    <div className="chamber-frame relative px-6 py-10 sm:px-10">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="text-center mb-8">
        <div className="divider-flourish mb-6">State the Matter</div>
        <h2 className="font-display text-4xl text-ink-50 mb-2">Before the Court</h2>
        <p className="text-ink-200/80 font-serif-body italic text-lg max-w-2xl mx-auto text-balance">
          Describe the decision. Submit the evidence. Both, either, but not neither.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <QuestionField question={question} setQuestion={setQuestion} />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer border border-dashed transition px-6 py-8 select-none flex flex-col ${
            dragging
              ? "border-brass-400 bg-brass-400/5"
              : "border-brass-400/30 hover:border-brass-400/60 hover:bg-brass-400/[0.03]"
          }`}
        >
          <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">
            THE EVIDENCE
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_EXT.join(",")}
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <div className="text-brass-300 font-display text-2xl leading-tight mb-1">
              {file ? file.name : "Drop a document"}
            </div>
            <div className="text-xs tracking-[0.3em] text-ink-300/60">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · entered into the record`
                : "PDF · DOCX · CSV"}
            </div>
            {!file && (
              <div className="text-[0.55rem] tracking-[0.4em] text-ink-300/40 mt-3">
                OR CLICK TO BROWSE
              </div>
            )}
          </div>
          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="absolute top-3 right-3 text-[0.55rem] tracking-[0.4em] text-ink-300/60 hover:text-blood-400 transition"
            >
              REMOVE
            </button>
          )}
        </div>
      </div>

      {hint && (
        <div className="text-blood-400 text-sm mt-4 text-center font-serif-body italic">
          {hint}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="text-[0.6rem] tracking-[0.4em] text-ink-300/60 text-center sm:text-left">
          ANY DECISION · LIFE · CAREER · CONTRACTS · WRITING · MONEY
        </div>
        <button
          disabled={!canSubmit}
          onClick={() => canSubmit && onSubmit({ question, file })}
          className={`group relative px-8 py-3 border tracking-[0.35em] text-xs transition ${
            canSubmit
              ? "border-brass-400 text-brass-300 hover:bg-brass-400 hover:text-ink-900"
              : "border-ink-500/40 text-ink-400/60 cursor-not-allowed"
          }`}
        >
          CONVENE THE COURT
        </button>
      </div>

      <details className="mt-8 text-ink-300/70 text-sm">
        <summary className="cursor-pointer text-brass-300/80 tracking-[0.25em] text-xs">
          NEED A STARTING POINT? TRY A SAMPLE QUESTION.
        </summary>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTION_EXAMPLES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(q)}
              className="text-left border border-brass-400/20 hover:border-brass-400/60 hover:bg-brass-400/5 transition px-3 py-2 text-ink-100 font-serif-body italic"
            >
              “{q}”
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

interface QuestionFieldProps {
  question: string;
  setQuestion: (s: string) => void;
}

function QuestionField({ question, setQuestion }: QuestionFieldProps) {
  return (
    <div className="border border-brass-400/30 hover:border-brass-400/60 focus-within:border-brass-400/80 transition px-5 py-4 flex flex-col">
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">
        THE QUESTION
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={7}
        placeholder={"Describe the decision or situation.\n\nExample: “Should I leave my job to write fiction full-time? I have 14 months of runway and one publishing offer.”"}
        className="w-full flex-1 bg-transparent text-ink-50 font-serif-body text-lg leading-snug placeholder:text-ink-300/40 placeholder:italic focus:outline-none resize-none"
      />
      <div className="text-[0.55rem] tracking-[0.4em] text-ink-300/40 mt-2">
        PLAIN LANGUAGE · BE SPECIFIC · THE COURT REWARDS DETAIL
      </div>
    </div>
  );
}
