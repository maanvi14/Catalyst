"use client";

import { useMemo, useState } from "react";
import { Copy, ListFilter } from "lucide-react";

function splitValues(input: string, delimiter: string) {
  if (!input.trim()) {
    return [];
  }
  const separators = delimiter === "auto" ? /[\n,;\t]+/ : new RegExp(delimiter === "comma" ? "," : delimiter === "semicolon" ? ";" : delimiter === "tab" ? "\\t" : "\\n");
  return input.split(separators).map((value) => value.trim()).filter(Boolean);
}

export default function CommaListPage() {
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState("auto");
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [sortAlpha, setSortAlpha] = useState(false);
  const [mode, setMode] = useState<"sql" | "otm" | "plain">("sql");

  const values = useMemo(() => {
    let items = splitValues(input, delimiter);
    if (trimWhitespace) {
      items = items.map((value) => value.trim());
    }
    if (removeDuplicates) {
      items = Array.from(new Set(items));
    }
    if (sortAlpha) {
      items = [...items].sort((left, right) => left.localeCompare(right));
    }
    return items;
  }, [delimiter, input, removeDuplicates, sortAlpha, trimWhitespace]);

  const output = useMemo(() => {
    if (mode === "plain") {
      return values.join("\n");
    }
    if (mode === "otm") {
      return values.join(",");
    }
    return values.map((value) => `'${value}'`).join(",");
  }, [mode, values]);

  function copy() {
    void navigator.clipboard.writeText(output);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-text"><ListFilter className="h-4 w-4 text-ai" /> Comma List</div>
        <p className="mt-2 text-sm text-subtle">Paste values, normalize them, and switch between SQL, OTM, or plain list output.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={12} className="w-full rounded-2xl border border-border bg-canvas/80 p-4 text-sm text-text outline-none" placeholder="Paste comma, tab, newline, or semicolon separated values..." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select value={delimiter} onChange={(event) => setDelimiter(event.target.value)} className="rounded-2xl border border-border bg-canvas/70 px-3 py-2 text-sm text-text"><option value="auto">Auto</option><option value="comma">Comma</option><option value="tab">Tab</option><option value="newline">Newline</option><option value="semicolon">Semicolon</option></select>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-canvas/70 px-3 py-2 text-sm text-text"><input type="checkbox" checked={trimWhitespace} onChange={(event) => setTrimWhitespace(event.target.checked)} /> Trim whitespace</label>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-canvas/70 px-3 py-2 text-sm text-text"><input type="checkbox" checked={removeDuplicates} onChange={(event) => setRemoveDuplicates(event.target.checked)} /> Remove duplicates</label>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-canvas/70 px-3 py-2 text-sm text-text"><input type="checkbox" checked={sortAlpha} onChange={(event) => setSortAlpha(event.target.checked)} /> Sort alphabetically</label>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex gap-2">
            {(["sql", "otm", "plain"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === item ? "border-slate-200/30 bg-slate-200/10 text-text" : "border-border bg-canvas/70 text-subtle"}`}>
                {item === "sql" ? "SQL IN Clause" : item === "otm" ? "OTM One-Of" : "Plain List"}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-canvas/80 p-4 font-mono text-sm text-text whitespace-pre-wrap">{output || "Output will appear here."}</div>
          <div className="flex items-center justify-between text-sm text-subtle">
            <span>Unique: {values.length} | Total: {splitValues(input, delimiter).length} | Duplicates removed: {Math.max(0, splitValues(input, delimiter).length - values.length)}</span>
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2 text-text"><Copy className="h-4 w-4" /> Copy to Clipboard</button>
          </div>
        </div>
      </div>
    </section>
  );
}

