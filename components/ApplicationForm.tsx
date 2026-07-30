"use client";

import { useCallback, useRef, useState } from "react";

import { COMMON_COLLEGES } from "@/lib/colleges";

interface EssayRow {
  id: number;
  label: string;
  mode: "paste" | "file";
  text: string;
  file: File | null;
}

interface ExtracurricularRow {
  id: number;
  activity: string;
  role: string;
  years: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

export interface ApplicationSubmission {
  school: string;
  essays: Array<{ label: string; text: string; file: File | null }>;
  extracurriculars: Array<{
    activity: string;
    role: string;
    years: string;
    hoursPerWeek: string;
    weeksPerYear: string;
  }>;
  resumeFile: File | null;
}

interface ApplicationFormProps {
  onSubmit: (payload: ApplicationSubmission) => void;
}

let nextId = 1;
const makeId = () => nextId++;

const DOC_ACCEPT_EXT = [".pdf", ".docx", ".txt"];
const DOC_ACCEPT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function isDocAccepted(f: File): boolean {
  const name = f.name.toLowerCase();
  return DOC_ACCEPT_EXT.some((ext) => name.endsWith(ext)) || DOC_ACCEPT_MIMES.includes(f.type);
}

export default function ApplicationForm({ onSubmit }: ApplicationFormProps) {
  const [school, setSchool] = useState("");
  const [essays, setEssays] = useState<EssayRow[]>([
    { id: makeId(), label: "Common App Personal Statement", mode: "paste", text: "", file: null },
  ]);
  const [extracurriculars, setExtracurriculars] = useState<ExtracurricularRow[]>([
    { id: makeId(), activity: "", role: "", years: "", hoursPerWeek: "", weeksPerYear: "" },
  ]);
  const [resume, setResume] = useState<File | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const addEssay = useCallback(() => {
    setEssays((prev) => [
      ...prev,
      { id: makeId(), label: `Supplemental Essay ${prev.length}`, mode: "paste", text: "", file: null },
    ]);
  }, []);

  const removeEssay = useCallback((id: number) => {
    setEssays((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEssay = useCallback((id: number, patch: Partial<EssayRow>) => {
    setEssays((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const addEc = useCallback(() => {
    setExtracurriculars((prev) => [
      ...prev,
      { id: makeId(), activity: "", role: "", years: "", hoursPerWeek: "", weeksPerYear: "" },
    ]);
  }, []);

  const removeEc = useCallback((id: number) => {
    setExtracurriculars((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEc = useCallback((id: number, patch: Partial<ExtracurricularRow>) => {
    setExtracurriculars((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const hasEssayContent = essays.some((e) => e.text.trim() || e.file);
  const hasEcContent = extracurriculars.some((e) => e.activity.trim());
  const canSubmit = school.trim().length > 0 && (hasEssayContent || hasEcContent || resume !== null);

  const handleSubmit = () => {
    if (!canSubmit) {
      setHint(
        school.trim().length === 0
          ? "Name a target school first."
          : "Submit at least one essay, extracurricular, or resume alongside the target school.",
      );
      return;
    }
    setHint(null);
    onSubmit({
      school: school.trim(),
      essays: essays
        .filter((e) => e.text.trim() || e.file)
        .map((e) => ({ label: e.label.trim() || "Essay", text: e.text, file: e.file })),
      extracurriculars: extracurriculars
        .filter((e) => e.activity.trim())
        .map(({ id, ...rest }) => rest),
      resumeFile: resume,
    });
  };

  return (
    <div className="chamber-frame relative px-6 py-10 sm:px-10">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="text-center mb-8">
        <div className="divider-flourish mb-6">State Your Application</div>
        <h2 className="font-display text-4xl text-ink-50 mb-2">Before the Court</h2>
        <p className="text-ink-200/80 font-serif-body italic text-lg max-w-2xl mx-auto text-balance">
          Name the school. Submit an essay, your activities, a resume — any combination will do.
        </p>
      </div>

      <div className="space-y-8">
        <SchoolField school={school} setSchool={setSchool} />

        <section>
          <SectionHeader label="The Essays" hint="Common App main essay plus any supplements" />
          <div className="space-y-4">
            {essays.map((essay) => (
              <EssayField
                key={essay.id}
                essay={essay}
                removable={essays.length > 1}
                onChange={(patch) => updateEssay(essay.id, patch)}
                onRemove={() => removeEssay(essay.id)}
              />
            ))}
          </div>
          <AddButton label="+ Add another essay" onClick={addEssay} />
        </section>

        <section>
          <SectionHeader label="The Extracurricular Record" hint="Not every field is required" />
          <div className="space-y-3">
            {extracurriculars.map((ec) => (
              <ExtracurricularField
                key={ec.id}
                row={ec}
                removable={extracurriculars.length > 1}
                onChange={(patch) => updateEc(ec.id, patch)}
                onRemove={() => removeEc(ec.id)}
              />
            ))}
          </div>
          <AddButton label="+ Add another activity" onClick={addEc} />
        </section>

        <section>
          <SectionHeader label="The Resume" hint="Optional" />
          <DocFileField file={resume} onFile={setResume} placeholder="Drop a resume" />
        </section>
      </div>

      {hint && (
        <div className="text-blood-400 text-sm mt-6 text-center font-serif-body italic">{hint}</div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="text-[0.6rem] tracking-[0.4em] text-ink-300/60 text-center sm:text-left">
          SCHOOL REQUIRED · AT LEAST ONE OF ESSAY / ACTIVITIES / RESUME
        </div>
        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`group relative px-8 py-3 border tracking-[0.35em] text-xs transition ${
            canSubmit
              ? "border-brass-400 text-brass-300 hover:bg-brass-400 hover:text-ink-900"
              : "border-ink-500/40 text-ink-400/60 cursor-not-allowed"
          }`}
        >
          SUBMIT YOUR APPLICATION
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">{label.toUpperCase()}</div>
      <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/40">{hint.toUpperCase()}</div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 text-[0.6rem] tracking-[0.35em] text-brass-300/70 hover:text-brass-300 transition"
    >
      {label.toUpperCase()}
    </button>
  );
}

function SchoolField({ school, setSchool }: { school: string; setSchool: (s: string) => void }) {
  return (
    <div className="border border-brass-400/30 hover:border-brass-400/60 focus-within:border-brass-400/80 transition px-5 py-4">
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">TARGET SCHOOL</div>
      <input
        value={school}
        onChange={(e) => setSchool(e.target.value)}
        list="college-options"
        placeholder="e.g. University of Michigan"
        className="w-full bg-transparent text-ink-50 font-serif-body text-xl placeholder:text-ink-300/40 placeholder:italic focus:outline-none"
      />
      <datalist id="college-options">
        {COMMON_COLLEGES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function EssayField({
  essay,
  removable,
  onChange,
  onRemove,
}: {
  essay: EssayRow;
  removable: boolean;
  onChange: (patch: Partial<EssayRow>) => void;
  onRemove: () => void;
}) {
  const words = wordCount(essay.text);
  return (
    <div className="border border-brass-400/20 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={essay.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Essay label"
          className="bg-transparent text-brass-300 text-xs tracking-[0.2em] uppercase flex-1 min-w-[10rem] focus:outline-none placeholder:text-ink-300/40"
        />
        <div className="flex items-center gap-3 text-[0.55rem] tracking-[0.3em]">
          <button
            type="button"
            onClick={() => onChange({ mode: "paste" })}
            className={essay.mode === "paste" ? "text-brass-300" : "text-ink-400/50 hover:text-ink-300"}
          >
            PASTE
          </button>
          <span className="text-ink-500/40">/</span>
          <button
            type="button"
            onClick={() => onChange({ mode: "file" })}
            className={essay.mode === "file" ? "text-brass-300" : "text-ink-400/50 hover:text-ink-300"}
          >
            UPLOAD
          </button>
          {removable && (
            <button type="button" onClick={onRemove} className="text-ink-400/60 hover:text-blood-400 ml-1">
              REMOVE
            </button>
          )}
        </div>
      </div>

      {essay.mode === "paste" ? (
        <>
          <textarea
            value={essay.text}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={6}
            placeholder="Paste the essay text…"
            className="w-full bg-transparent text-ink-50 font-serif-body text-base leading-snug placeholder:text-ink-300/40 placeholder:italic focus:outline-none resize-none"
          />
          {essay.text.trim() && (
            <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/40">{words} WORDS</div>
          )}
        </>
      ) : (
        <DocFileField
          file={essay.file}
          onFile={(f) => onChange({ file: f })}
          placeholder="Drop the essay file"
        />
      )}
    </div>
  );
}

function DocFileField({
  file,
  onFile,
  placeholder,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  placeholder: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      if (!isDocAccepted(f)) {
        setRejected(true);
        onFile(null);
        return;
      }
      setRejected(false);
      onFile(f);
    },
    [onFile],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer border border-dashed transition px-4 py-5 select-none flex items-center justify-between gap-3 ${
          dragging
            ? "border-brass-400 bg-brass-400/5"
            : "border-brass-400/30 hover:border-brass-400/60 hover:bg-brass-400/[0.03]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={DOC_ACCEPT_EXT.join(",")}
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <div className="text-sm text-brass-300 font-serif-body">
          {file ? file.name : placeholder}
        </div>
        <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/40 whitespace-nowrap">
          {file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF · DOCX · TXT"}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
            className="text-[0.55rem] tracking-[0.3em] text-ink-300/60 hover:text-blood-400 transition"
          >
            REMOVE
          </button>
        )}
      </div>
      {rejected && (
        <div className="text-blood-400 text-xs mt-2 font-serif-body italic">
          Unsupported file. PDF, DOCX, or TXT only.
        </div>
      )}
    </div>
  );
}

function ExtracurricularField({
  row,
  removable,
  onChange,
  onRemove,
}: {
  row: ExtracurricularRow;
  removable: boolean;
  onChange: (patch: Partial<ExtracurricularRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-brass-400/20 px-5 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <input
          value={row.activity}
          onChange={(e) => onChange({ activity: e.target.value })}
          placeholder="Activity name"
          className="sm:col-span-4 bg-transparent text-ink-50 font-serif-body placeholder:text-ink-300/40 placeholder:italic focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <input
          value={row.role}
          onChange={(e) => onChange({ role: e.target.value })}
          placeholder="Role / position"
          className="sm:col-span-3 bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <input
          value={row.years}
          onChange={(e) => onChange({ years: e.target.value })}
          placeholder="Years (e.g. 10-12)"
          className="sm:col-span-2 bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <input
          value={row.hoursPerWeek}
          onChange={(e) => onChange({ hoursPerWeek: e.target.value })}
          placeholder="Hrs/week"
          className="sm:col-span-1 bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <input
          value={row.weeksPerYear}
          onChange={(e) => onChange({ weeksPerYear: e.target.value })}
          placeholder="Wks/year"
          className="sm:col-span-1 bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <div className="sm:col-span-1 flex items-center justify-end">
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[0.55rem] tracking-[0.2em] text-ink-400/60 hover:text-blood-400 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
