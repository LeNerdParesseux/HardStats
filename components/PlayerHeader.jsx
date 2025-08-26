// components/PlayerHeader.jsx
import ProgressBar from "@/components/ProgressBar";

const QUEUE_LABEL = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

export default function PlayerHeader({ player, server, progress, profileIconUrl }) {
  const leagues = Array.isArray(player?.league) ? player.league : [];
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
      <div className="flex items-center gap-4">
        <img
          src={profileIconUrl || "/favicon.ico"}
          alt="Icône de profil"
          className="w-16 h-16 rounded-xl border border-neutral-700"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xl font-semibold truncate">
            {player.account.gameName}#{player.account.tagLine}
          </div>
          <div className="text-sm text-neutral-400">
            Serveur : {server}
            {player?.summoner?.summonerLevel != null && <> • Niveau {player.summoner.summonerLevel}</>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {leagues.length
              ? leagues.map((l) => (
                  <span
                    key={l.queueType}
                    className="px-2 py-1 text-xs rounded-full bg-neutral-800 border border-neutral-700"
                  >
                    {QUEUE_LABEL[l.queueType] || l.queueType.replaceAll("_", " ")} :{" "}
                    <b>{l.tier} {l.rank}</b> ({l.leaguePoints} LP)
                  </span>
                ))
              : <span className="px-2 py-1 text-xs rounded-full bg-neutral-800 border border-neutral-700">Non classé</span>}
          </div>
        </div>
        <div className="w-80 max-w-full">
          <ProgressBar current={progress.done} total={progress.total || 100} />
        </div>
      </div>
    </div>
  );
}
