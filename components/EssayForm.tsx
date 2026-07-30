"use client";

import { useCallback, useRef, useState } from "react";

import { COMMON_COLLEGES } from "@/lib/colleges";
import { PURPOSE_LABELS, type Purpose } from "@/lib/essay-evaluation";

interface ExtracurricularRow {
  id: number;
  activity: string;
  role: string;
  years: string;
  hoursPerWeek: string;
  weeksPerYear: string;
}

interface PastAssignmentRow {
  id: number;
  mode: "paste" | "file";
  text: string;
  file: File | null;
  rubric: string;
  feedback: string;
  grade: string;
}

export interface EssaySubmission {
  purpose: Purpose;
  prompt: string;
  essayText: string;
  essayFile: File | null;
  context: string;
  rubricText: string;
  rubricFile: File | null;
  school: string;
  extracurriculars: Array<{
    activity: string;
    role: string;
    years: string;
    hoursPerWeek: string;
    weeksPerYear: string;
  }>;
  resumeFile: File | null;
  scholarshipName: string;
  pastAssignments: Array<{
    text: string;
    file: File | null;
    rubric: string;
    feedback: string;
    grade: string;
  }>;
}

interface EssayFormProps {
  onSubmit: (payload: EssaySubmission) => void;
}

let nextId = 1;
const makeId = () => nextId++;

const DOC_ACCEPT_EXT = [".pdf", ".docx", ".txt"];
const DOC_ACCEPT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const PURPOSES: Purpose[] = ["college", "assignment", "scholarship", "other"];

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function isDocAccepted(f: File): boolean {
  const name = f.name.toLowerCase();
  return DOC_ACCEPT_EXT.some((ext) => name.endsWith(ext)) || DOC_ACCEPT_MIMES.includes(f.type);
}

export default function EssayForm({ onSubmit }: EssayFormProps) {
  const [purpose, setPurpose] = useState<Purpose>("college");
  const [prompt, setPrompt] = useState("");
  const [essayMode, setEssayMode] = useState<"paste" | "file">("paste");
  const [essayText, setEssayText] = useState("");
  const [essayFile, setEssayFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [rubricMode, setRubricMode] = useState<"paste" | "file">("paste");
  const [rubricText, setRubricText] = useState("");
  const [rubricFile, setRubricFile] = useState<File | null>(null);

  const [school, setSchool] = useState("");
  const [extracurriculars, setExtracurriculars] = useState<ExtracurricularRow[]>([
    { id: makeId(), activity: "", role: "", years: "", hoursPerWeek: "", weeksPerYear: "" },
  ]);
  const [resume, setResume] = useState<File | null>(null);

  const [scholarshipName, setScholarshipName] = useState("");

  const [pastAssignments, setPastAssignments] = useState<PastAssignmentRow[]>([]);

  const [hint, setHint] = useState<string | null>(null);

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

  const addPastAssignment = useCallback(() => {
    setPastAssignments((prev) => [
      ...prev,
      { id: makeId(), mode: "paste", text: "", file: null, rubric: "", feedback: "", grade: "" },
    ]);
  }, []);
  const removePastAssignment = useCallback((id: number) => {
    setPastAssignments((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const updatePastAssignment = useCallback((id: number, patch: Partial<PastAssignmentRow>) => {
    setPastAssignments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const hasEssayContent = essayMode === "paste" ? essayText.trim().length > 0 : essayFile !== null;
  const purposeReady =
    purpose === "college" ? school.trim().length > 0 : purpose === "scholarship" ? scholarshipName.trim().length > 0 : true;
  const canSubmit = hasEssayContent && purposeReady;

  const handleSubmit = () => {
    if (!hasEssayContent) {
      setHint("An essay is required — paste the text or upload a file.");
      return;
    }
    if (!purposeReady) {
      setHint(purpose === "college" ? "Name a target school first." : "Name the scholarship first.");
      return;
    }
    setHint(null);
    onSubmit({
      purpose,
      prompt,
      essayText: essayMode === "paste" ? essayText : "",
      essayFile: essayMode === "file" ? essayFile : null,
      context,
      rubricText: rubricMode === "paste" ? rubricText : "",
      rubricFile: rubricMode === "file" ? rubricFile : null,
      school,
      extracurriculars: extracurriculars.filter((e) => e.activity.trim()).map(({ id, ...rest }) => rest),
      resumeFile: resume,
      scholarshipName,
      pastAssignments: pastAssignments
        .filter((p) => p.text.trim() || p.file || p.rubric.trim() || p.feedback.trim() || p.grade.trim())
        .map(({ id, mode, ...rest }) => rest),
    });
  };

  return (
    <div className="chamber-frame relative px-6 py-10 sm:px-10">
      <span className="corner-ornament tl" aria-hidden />
      <span className="corner-ornament tr" aria-hidden />
      <span className="corner-ornament bl" aria-hidden />
      <span className="corner-ornament br" aria-hidden />

      <div className="text-center mb-8">
        <div className="divider-flourish mb-6">State Your Case</div>
        <h2 className="font-display text-4xl text-ink-50 mb-2">Before the Court</h2>
        <p className="text-ink-200/80 font-serif-body italic text-lg max-w-2xl mx-auto text-balance">
          Submit your essay. Tell the court what it&apos;s for.
        </p>
      </div>

      <div className="space-y-8">
        <PurposeSelector purpose={purpose} setPurpose={setPurpose} />

        <TextField
          label="The Prompt / Assignment Question"
          hint="Optional"
          value={prompt}
          onChange={setPrompt}
          placeholder="What is the essay responding to?"
          rows={3}
        />

        <section>
          <SectionHeader label="The Essay" hint="Required" />
          <PasteOrFileField
            mode={essayMode}
            setMode={setEssayMode}
            text={essayText}
            setText={setEssayText}
            file={essayFile}
            setFile={setEssayFile}
            placeholder="Paste the essay text…"
            filePlaceholder="Drop the essay file"
            showWordCount
          />
        </section>

        <TextField
          label="Context"
          hint="Optional — anything not captured elsewhere"
          value={context}
          onChange={setContext}
          placeholder={"e.g. “this is for my AP Lit class” or “applying as a transfer student”"}
          rows={3}
        />

        <section>
          <SectionHeader label="Rubric" hint="Optional" />
          <PasteOrFileField
            mode={rubricMode}
            setMode={setRubricMode}
            text={rubricText}
            setText={setRubricText}
            file={rubricFile}
            setFile={setRubricFile}
            placeholder="Paste the rubric text…"
            filePlaceholder="Drop the rubric file"
          />
        </section>

        {purpose === "college" && (
          <>
            <SchoolField school={school} setSchool={setSchool} />
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
          </>
        )}

        {purpose === "scholarship" && (
          <div className="border border-brass-400/30 hover:border-brass-400/60 focus-within:border-brass-400/80 transition px-5 py-4">
            <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-2">SCHOLARSHIP</div>
            <input
              value={scholarshipName}
              onChange={(e) => setScholarshipName(e.target.value)}
              placeholder="e.g. Coca-Cola Scholars Program"
              className="w-full bg-transparent text-ink-50 font-serif-body text-xl placeholder:text-ink-300/40 placeholder:italic focus:outline-none"
            />
          </div>
        )}

        {purpose === "assignment" && (
          <section>
            <SectionHeader label="Past Assignments" hint="Optional — helps the court read this professor" />
            <div className="space-y-4">
              {pastAssignments.map((pa) => (
                <PastAssignmentField
                  key={pa.id}
                  row={pa}
                  onChange={(patch) => updatePastAssignment(pa.id, patch)}
                  onRemove={() => removePastAssignment(pa.id)}
                />
              ))}
            </div>
            <AddButton label="+ Add a past assignment" onClick={addPastAssignment} />
          </section>
        )}
      </div>

      {hint && (
        <div className="text-blood-400 text-sm mt-6 text-center font-serif-body italic">{hint}</div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="text-[0.6rem] tracking-[0.4em] text-ink-300/60 text-center sm:text-left">
          PURPOSE + ESSAY REQUIRED
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
          SUBMIT FOR REVIEW
        </button>
      </div>
    </div>
  );
}

function PurposeSelector({ purpose, setPurpose }: { purpose: Purpose; setPurpose: (p: Purpose) => void }) {
  return (
    <div>
      <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80 mb-3">PURPOSE</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PURPOSES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPurpose(p)}
            className={`px-3 py-3 border text-xs tracking-[0.15em] uppercase transition ${
              purpose === p
                ? "border-brass-400 text-brass-300 bg-brass-400/10"
                : "border-brass-400/25 text-ink-300/70 hover:border-brass-400/50 hover:text-ink-100"
            }`}
          >
            {PURPOSE_LABELS[p]}
          </button>
        ))}
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

function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <div className="border border-brass-400/30 hover:border-brass-400/60 focus-within:border-brass-400/80 transition px-5 py-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[0.6rem] tracking-[0.45em] text-brass-300/80">{label.toUpperCase()}</div>
        <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/40">{hint.toUpperCase()}</div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-transparent text-ink-50 font-serif-body text-base leading-snug placeholder:text-ink-300/40 placeholder:italic focus:outline-none resize-none"
      />
    </div>
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

function PasteOrFileField({
  mode,
  setMode,
  text,
  setText,
  file,
  setFile,
  placeholder,
  filePlaceholder,
  showWordCount,
}: {
  mode: "paste" | "file";
  setMode: (m: "paste" | "file") => void;
  text: string;
  setText: (s: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  placeholder: string;
  filePlaceholder: string;
  showWordCount?: boolean;
}) {
  const words = wordCount(text);
  return (
    <div className="border border-brass-400/20 px-5 py-4 space-y-3">
      <div className="flex items-center justify-end gap-3 text-[0.55rem] tracking-[0.3em]">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={mode === "paste" ? "text-brass-300" : "text-ink-400/50 hover:text-ink-300"}
        >
          PASTE
        </button>
        <span className="text-ink-500/40">/</span>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={mode === "file" ? "text-brass-300" : "text-ink-400/50 hover:text-ink-300"}
        >
          UPLOAD
        </button>
      </div>

      {mode === "paste" ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={placeholder}
            className="w-full bg-transparent text-ink-50 font-serif-body text-base leading-snug placeholder:text-ink-300/40 placeholder:italic focus:outline-none resize-none"
          />
          {showWordCount && text.trim() && (
            <div className="text-[0.55rem] tracking-[0.3em] text-ink-300/40">{words} WORDS</div>
          )}
        </>
      ) : (
        <DocFileField file={file} onFile={setFile} placeholder={filePlaceholder} />
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
        <div className="text-sm text-brass-300 font-serif-body">{file ? file.name : placeholder}</div>
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

function PastAssignmentField({
  row,
  onChange,
  onRemove,
}: {
  row: PastAssignmentRow;
  onChange: (patch: Partial<PastAssignmentRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-brass-400/20 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[0.6rem] tracking-[0.3em] text-brass-300/70">PAST ASSIGNMENT</div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[0.55rem] tracking-[0.3em] text-ink-400/60 hover:text-blood-400 transition"
        >
          REMOVE
        </button>
      </div>

      <PasteOrFileField
        mode={row.mode}
        setMode={(mode) => onChange({ mode })}
        text={row.text}
        setText={(text) => onChange({ text })}
        file={row.file}
        setFile={(file) => onChange({ file })}
        placeholder="Paste the past essay/assignment text…"
        filePlaceholder="Drop the past assignment file"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={row.grade}
          onChange={(e) => onChange({ grade: e.target.value })}
          placeholder="Grade received (e.g. B+)"
          className="bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
        <input
          value={row.rubric}
          onChange={(e) => onChange({ rubric: e.target.value })}
          placeholder="Rubric used, if different from current"
          className="bg-transparent text-ink-100 text-sm placeholder:text-ink-300/40 focus:outline-none border-b border-brass-400/20 pb-1"
        />
      </div>
      <textarea
        value={row.feedback}
        onChange={(e) => onChange({ feedback: e.target.value })}
        rows={3}
        placeholder="Professor's written feedback on it"
        className="w-full bg-transparent text-ink-100 text-sm leading-snug placeholder:text-ink-300/40 focus:outline-none resize-none border border-brass-400/15 px-3 py-2"
      />
    </div>
  );
}
