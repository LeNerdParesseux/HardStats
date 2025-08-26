// components/MatchCard.jsx
"use client";

const QUEUE_LABEL = {
  420: "Solo/Duo",
  440: "Flex",
  400: "Draft",
  430: "Blind",
  490: "Quickplay",
  450: "ARAM",
};

function dur(msOrSec) {
  const s = msOrSec > 100000 ? Math.round(msOrSec / 1000) : Math.round(msOrSec || 0);
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function when(ts) {
  const d = new Date(ts || 0);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MatchCard({ match, puuid, dd }) {
  const info = match?.info || {};
  const part = (info.participants || []).find((p) => p.puuid === puuid);
  if (!part) return null;

  const win = !!part.win;
  const q = info.queueId;
  const qLabel = QUEUE_LABEL[q] || q;

  // Champion
  const champMeta =
    dd?.championMetaFromNameOrKey?.(part.championName, part.championId) ||
    dd?.championMetaByKey?.(part.championId);
  const champIcon = champMeta ? dd.championIconById(champMeta.id) : "";
  const champName = champMeta?.name || part.championName || "Champion";

  // Spells
  const s1Icon = dd?.spellIconUrl?.(part.summoner1Id);
  const s2Icon = dd?.spellIconUrl?.(part.summoner2Id);

  // Items
  const items = [];
  for (let i = 0; i <= 6; i++) {
    const id = Number(part[`item${i}`] || 0);
    if (id > 0) {
      const full = dd?.itemsById?.[id]?.image?.full;
      items.push({ id, icon: full ? dd.itemIconUrl(full) : "" });
    } else {
      items.push({ id: 0, icon: "" });
    }
  }

  const k = `${part.kills}/${part.deaths}/${part.assists}`;
  const kda = part.deaths === 0 ? (part.kills + part.assists) : (part.kills + part.assists) / part.deaths;
  const kdaStr = (typeof kda === "number" ? kda.toFixed(2) : "—") + ":1";

  const border = win ? "border-emerald-700/60" : "border-rose-700/60";
  const badge = win ? "bg-emerald-900/40 border-emerald-700/60" : "bg-rose-900/40 border-rose-700/60";

  const startTs = info.gameStartTimestamp ?? info.gameCreation;
  const durStr = dur(info.gameDuration ?? info.gameLength);

  return (
    <div className={`rounded-2xl bg-neutral-900 border ${border} p-3`}>
      <div className="flex items-start gap-3">
        {/* Champion + spells */}
        <div className="relative">
          <img src={champIcon} alt={champName} className="w-16 h-16 rounded-xl border border-neutral-700 object-cover" />
          <div className="absolute -bottom-2 left-1 flex gap-1">
            {s1Icon ? <img src={s1Icon} alt="S1" className="w-5 h-5 rounded border border-neutral-700" /> : null}
            {s2Icon ? <img src={s2Icon} alt="S2" className="w-5 h-5 rounded border border-neutral-700" /> : null}
          </div>
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs rounded-full border ${badge}`}>{win ? "Victoire" : "Défaite"}</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-800 border border-neutral-700">{qLabel}</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-800 border border-neutral-700">{durStr}</span>
            {startTs ? <span className="text-xs text-neutral-400">{when(startTs)}</span> : null}
          </div>
          <div className="mt-1 text-sm text-neutral-300 truncate">{champName} • {part.individualPosition || part.teamPosition || "—"}</div>

          <div className="mt-1 flex items-center gap-3 text-sm">
            <div className="font-semibold">{k} <span className="text-neutral-400">({kdaStr})</span></div>
            <div className="text-neutral-400">CS {part.totalMinionsKilled ?? 0}</div>
            <div className="text-neutral-400">Dmg {part.totalDamageDealtToChampions ?? 0}</div>
            <div className="text-neutral-400">Gold {part.goldEarned ?? 0}</div>
          </div>

          {/* Items */}
          <div className="mt-2 flex flex-wrap gap-1">
            {items.map((it, idx) =>
              it.icon ? (
                <img key={idx} src={it.icon} alt={`item${idx}`} className="w-7 h-7 rounded border border-neutral-700" />
              ) : (
                <div key={idx} className="w-7 h-7 rounded border border-neutral-800 bg-neutral-800/50" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
