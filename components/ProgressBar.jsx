export default function ProgressBar({ current = 0, total = 100 }) {
  const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span>Progression</span>
        <span>{current}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
