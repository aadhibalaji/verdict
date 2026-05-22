"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onSubmit: (file: File) => void;
}

export default function FileUpload({ onSubmit }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!/\.csv$|text\/csv|application\/vnd\.ms-excel/i.test(f.name + " " + f.type)) {
      setHint("That doesn't look like a CSV. The court accepts CSV exports only.");
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
      accept(e.dataTransfer.files?.[0]);
    },
    [accept],
  );

  return (
    <div className="chamber-frame relative px-8 py-12">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="text-center mb-8">
        <div className="divider-flourish mb-6">Exhibit A</div>
        <h2 className="font-display text-4xl text-ink-50 mb-2">Enter the Evidence</h2>
        <p className="text-ink-200/80 font-serif-body italic text-lg">
          Upload your bank statement as CSV. Nothing leaves this session except a summary sent to Claude.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border border-dashed transition px-6 py-10 text-center select-none ${
          dragging
            ? "border-brass-400 bg-brass-400/5"
            : "border-brass-400/30 hover:border-brass-400/60 hover:bg-brass-400/[0.03]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <div className="text-brass-300 font-display text-2xl mb-1">
          {file ? file.name : "Drop CSV here"}
        </div>
        <div className="text-xs tracking-[0.3em] text-ink-300/60">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · ready to enter into the record`
            : "OR CLICK TO BROWSE"}
        </div>
      </div>

      {hint && (
        <div className="text-blood-400 text-sm mt-4 text-center font-serif-body italic">
          {hint}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="text-[0.6rem] tracking-[0.4em] text-ink-300/60">
          MOST BANK CSV EXPORTS WORK · DATE / DESCRIPTION / AMOUNT
        </div>
        <button
          disabled={!file}
          onClick={() => file && onSubmit(file)}
          className={`group relative px-8 py-3 border tracking-[0.35em] text-xs transition ${
            file
              ? "border-brass-400 text-brass-300 hover:bg-brass-400 hover:text-ink-900"
              : "border-ink-500/40 text-ink-400/60 cursor-not-allowed"
          }`}
        >
          CONVENE THE COURT
        </button>
      </div>

      <details className="mt-8 text-ink-300/70 text-sm">
        <summary className="cursor-pointer text-brass-300/80 tracking-[0.25em] text-xs">
          NO CSV ON HAND? PASTE A SAMPLE.
        </summary>
        <SamplePaste onSubmit={onSubmit} />
      </details>
    </div>
  );
}

function SamplePaste({ onSubmit }: { onSubmit: (file: File) => void }) {
  const [text, setText] = useState(SAMPLE_CSV);
  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full bg-ink-800/60 border border-brass-400/20 text-ink-100 font-mono text-xs p-3 focus:outline-none focus:border-brass-400/60"
      />
      <button
        onClick={() => {
          const blob = new Blob([text], { type: "text/csv" });
          const file = new File([blob], "statement.csv", { type: "text/csv" });
          onSubmit(file);
        }}
        className="px-5 py-2 border border-brass-400/60 text-brass-300 hover:bg-brass-400/10 transition tracking-[0.3em] text-xs"
      >
        USE THIS SAMPLE
      </button>
    </div>
  );
}

const SAMPLE_CSV = `Date,Description,Amount,Category
2025-03-01,UBER EATS,-42.13,Food
2025-03-01,SALARY ACME CORP,4200.00,Income
2025-03-02,STARBUCKS #4421,-6.75,Coffee
2025-03-02,AMAZON MARKETPLACE,-89.99,Shopping
2025-03-03,STARBUCKS #4421,-7.20,Coffee
2025-03-04,UBER TRIP,-22.40,Transport
2025-03-05,WHOLE FOODS,-117.32,Groceries
2025-03-05,DOORDASH,-38.50,Food
2025-03-06,STARBUCKS #4421,-6.75,Coffee
2025-03-06,NETFLIX,-15.49,Subscriptions
2025-03-07,SPOTIFY,-9.99,Subscriptions
2025-03-07,UBER TRIP,-18.10,Transport
2025-03-08,LATE NIGHT TACO,-31.20,Food
2025-03-08,AMAZON MARKETPLACE,-44.20,Shopping
2025-03-09,RENT PAYMENT,-1850.00,Housing
2025-03-10,STARBUCKS #4421,-6.75,Coffee
2025-03-11,DOORDASH,-29.15,Food
2025-03-12,UBER EATS,-26.80,Food
2025-03-13,APPLE.COM/BILL,-2.99,Subscriptions
2025-03-14,APPLE.COM/BILL,-9.99,Subscriptions
2025-03-15,SALARY ACME CORP,4200.00,Income
2025-03-15,VENMO TO ROOMMATE,-340.00,Bills
2025-03-16,CVS PHARMACY,-23.18,Health
2025-03-17,STARBUCKS #4421,-6.75,Coffee
2025-03-18,UBER EATS,-37.40,Food
2025-03-19,AMAZON MARKETPLACE,-67.30,Shopping
2025-03-20,DOORDASH,-44.15,Food
2025-03-21,BAR TAB DOWNTOWN,-92.00,Entertainment
2025-03-22,UBER TRIP,-26.40,Transport
2025-03-22,LATE NIGHT TACO,-19.80,Food
2025-03-23,SUNDAY BRUNCH,-58.40,Food
2025-03-24,STARBUCKS #4421,-7.20,Coffee
2025-03-25,UBER EATS,-31.55,Food
2025-03-26,GYM MEMBERSHIP,-39.00,Health
2025-03-27,AMAZON MARKETPLACE,-21.10,Shopping
2025-03-28,UBER TRIP,-15.80,Transport
2025-03-29,WHOLE FOODS,-98.45,Groceries
2025-03-30,DOORDASH,-33.20,Food
2025-03-31,STARBUCKS #4421,-6.75,Coffee
`;
