// components/StatCard.jsx
"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

function parseValue(v) {
  if (v === null || v === undefined) return { num: null, suffix: "", text: "—", decimals: 0 };
  if (typeof v === "number") return { num: v, suffix: "", text: null, decimals: v % 1 ? 2 : 0 };
  const s = String(v).trim();
  const m = s.match(/^(-?\d[\d\s]*[.,]?\d*)(\s*[%A-Za-z].*)?$/);
  if (!m) return { num: null, suffix: "", text: s, decimals: 0 };
  const raw = m[1].replace(/\s/g, "").replace(",", ".");
  const num = Number(raw);
  const decimals = (raw.split(".")[1]?.length || 0) > 3 ? 2 : (raw.includes(".") ? (raw.split(".")[1]?.length || 0) : 0);
  const suffix = (m[2] || "").trim();
  return Number.isFinite(num) ? { num, suffix, text: null, decimals } : { num: null, suffix: "", text: s, decimals: 0 };
}

export default function StatCard({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "from-neutral-900/70 to-neutral-900/30", br: "border-neutral-800", glow: "shadow-[0_0_0_0_rgba(0,0,0,0)]" },
    red:     { bg: "from-rose-900/40 to-rose-900/10",       br: "border-rose-800/50",  glow: "shadow-[0_8px_32px_rgba(244,63,94,0.15)]" },
    amber:   { bg: "from-amber-900/30 to-amber-900/5",      br: "border-amber-700/50", glow: "shadow-[0_8px_32px_rgba(245,158,11,0.15)]" },
    emerald: { bg: "from-emerald-900/30 to-emerald-900/5",  br: "border-emerald-700/50", glow: "shadow-[0_8px_32px_rgba(16,185,129,0.15)]" },
    cyan:    { bg: "from-cyan-900/30 to-cyan-900/5",        br: "border-cyan-700/50",  glow: "shadow-[0_8px_32px_rgba(34,211,238,0.15)]" },
    violet:  { bg: "from-violet-900/30 to-violet-900/5",    br: "border-violet-700/50", glow: "shadow-[0_8px_32px_rgba(139,92,246,0.15)]" },
    sky:     { bg: "from-sky-900/30 to-sky-900/5",          br: "border-sky-700/50",   glow: "shadow-[0_8px_32px_rgba(56,189,248,0.15)]" },
    indigo:  { bg: "from-indigo-900/30 to-indigo-900/5",    br: "border-indigo-700/50", glow: "shadow-[0_8px_32px_rgba(99,102,241,0.15)]" },
  };
  const t = tones[tone] || tones.neutral;
  const { num, suffix, text, decimals } = parseValue(value);
  const countKey = `${label}-${num ?? text}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl p-4 bg-gradient-to-b ${t.bg} border ${t.br} ${t.glow}`}
    >
      <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>

      <motion.div
        key={countKey}
        initial={{ scale: 0.96, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mt-1 flex items-baseline gap-1"
      >
        <div className="text-2xl font-bold tabular-nums">
          {num !== null && text === null ? (
            <CountUp end={num} duration={0.6} decimals={decimals} separator=" " decimal="," />
          ) : (
            value ?? "—"
          )}
        </div>
        {suffix ? <span className="text-sm font-semibold text-neutral-400">{suffix}</span> : null}
      </motion.div>

      {hint ? <div className="text-xs text-neutral-500 mt-1">{hint}</div> : null}
    </motion.div>
  );
}
