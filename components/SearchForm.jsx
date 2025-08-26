// components/SearchForm.jsx
"use client";

import { useState } from "react";

const SERVERS = ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP"];

export default function SearchForm({ onSubmit, onFilterChange, loading, selectedTypes }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [server, setServer] = useState("EUW");

  function submit(e) {
    e.preventDefault();
    if (!name || !tag) return;
    onSubmit?.({ name, tag, server });
  }

  function toggle(key) {
    const next = { ...selectedTypes, [key]: !selectedTypes[key] };
    onFilterChange?.(next);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <div className="flex-1 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
            placeholder="Pseudo (ex: Xarod012)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-28 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none"
            placeholder="Tag (ex: EUW)"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={server}
            onChange={(e) => setServer(e.target.value)}
            className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2"
          >
            {SERVERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => toggle("ranked")}
          className={`px-2 py-1 rounded-full border ${selectedTypes.ranked ? "bg-red-900/40 border-red-700/60" : "bg-neutral-800 border-neutral-700"}`}>
          Classées (420/440)
        </button>
        <button type="button" onClick={() => toggle("draft")}
          className={`px-2 py-1 rounded-full border ${selectedTypes.draft ? "bg-amber-900/30 border-amber-700/60" : "bg-neutral-800 border-neutral-700"}`}>
          Draft (400)
        </button>
        <button type="button" onClick={() => toggle("blind")}
          className={`px-2 py-1 rounded-full border ${selectedTypes.blind ? "bg-amber-900/30 border-amber-700/60" : "bg-neutral-800 border-neutral-700"}`}>
          Blind (430)
        </button>
        <button type="button" onClick={() => toggle("quickplay")}
          className={`px-2 py-1 rounded-full border ${selectedTypes.quickplay ? "bg-amber-900/30 border-amber-700/60" : "bg-neutral-800 border-neutral-700"}`}>
          Quickplay (490)
        </button>
        <button type="button" onClick={() => toggle("aram")}
          className={`px-2 py-1 rounded-full border ${selectedTypes.aram ? "bg-cyan-900/30 border-cyan-700/60" : "bg-neutral-800 border-neutral-700"}`}>
          ARAM (450)
        </button>
      </div>
    </form>
  );
}
