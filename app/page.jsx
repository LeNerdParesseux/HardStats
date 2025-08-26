"use client";

import { useEffect, useMemo, useState } from "react";
import SearchForm from "@/components/SearchForm";
import StatCard from "@/components/StatCard";
import MatchCard from "@/components/MatchCard";
import PlayerHeader from "@/components/PlayerHeader";
import { loadDDragon } from "@/lib/ddragon";
import { Reveal, RevealItem } from "@/components/Reveal";

// Files d’attente (groupes)
const QUEUE_GROUPS = {
  ranked: new Set([420, 440]),
  draft: new Set([400]),
  blind: new Set([430]),
  quickplay: new Set([490]),
  aram: new Set([450]),
};

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [matches, setMatches] = useState([]);
  const [server, setServer] = useState("EUW");
  const [selectedTypes, setSelectedTypes] = useState({
    ranked: true, draft: true, blind: true, quickplay: true, aram: true
  });

  // DDragon
  const [dd, setDd] = useState(null);
  useEffect(() => { loadDDragon().then(setDd).catch(console.error); }, []);

  // Recherche
  async function handleSearch({ name, tag, server: srv }) {
    try {
      setServer(srv);
      setLoading(true);
      setPlayer(null);
      setMatches([]);
      setProgress({ done: 0, total: 0 });

      const bootRes = await fetch("/api/bootstrap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, server: srv }),
      });
      const boot = await bootRes.json();
      if (!bootRes.ok) throw new Error(boot.error || "Erreur bootstrap");
      setPlayer(boot);

      // 5 matchs rapides
      const ids5Res = await fetch("/api/match-ids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid: boot.account.puuid, server: srv, count: 5 }),
      });
      const ids5 = await ids5Res.json();
      if (!ids5Res.ok) throw new Error(ids5.error || "Erreur match-ids (5)");
      setProgress({ done: 0, total: 100 });

      const firstMatchesRes = await fetch("/api/matches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: ids5.ids, server: srv }),
      });
      const firstMatches = await firstMatchesRes.json();
      if (!firstMatchesRes.ok) throw new Error(firstMatches.error || "Erreur matches (5)");
      const first = firstMatches.matches.filter(Boolean);
      setMatches(first);
      setProgress((p) => ({ ...p, done: Math.min(100, first.length) }));

      // Jusqu’à 100
      const idsAllRes = await fetch("/api/match-ids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid: boot.account.puuid, server: srv, count: 100 }),
      });
      const idsAll = await idsAllRes.json();
      if (!idsAllRes.ok) throw new Error(idsAll.error || "Erreur match-ids (100)");
      const allIds = Array.isArray(idsAll.ids) ? idsAll.ids : [];
      setProgress((p) => ({ ...p, total: Math.min(100, allIds.length) || 100 }));

      const remaining = allIds.filter((id) => !ids5.ids.includes(id));
      const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
      const chunks = chunk(remaining, 20);

      for (let idx = 0; idx < chunks.length; idx++) {
        const slice = chunks[idx];
        const res = await fetch("/api/matches", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchIds: slice, server: srv }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur matches (batch)");

        setMatches((prev) => {
          const merged = [...prev, ...data.matches.filter(Boolean)];
          const map = new Map();
          for (const m of merged) {
            const id = m?.metadata?.matchId;
            if (id) map.set(id, m);
          }
          const uniq = Array.from(map.values());
          setProgress((p) => ({ ...p, done: Math.min(p.total || 100, uniq.length) }));
          return uniq;
        });

        if (idx < chunks.length - 1) await new Promise((r) => setTimeout(r, 25000));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Filtres (sans refetch)
  const filteredMatches = useMemo(() => {
    if (!matches.length) return [];
    const a = selectedTypes;
    const none = !a.ranked && !a.draft && !a.blind && !a.quickplay && !a.aram;
    const base = none ? matches : matches.filter((m) => {
      const q = m?.info?.queueId;
      return (a.ranked && QUEUE_GROUPS.ranked.has(q)) ||
             (a.draft && QUEUE_GROUPS.draft.has(q)) ||
             (a.blind && QUEUE_GROUPS.blind.has(q)) ||
             (a.quickplay && QUEUE_GROUPS.quickplay.has(q)) ||
             (a.aram && QUEUE_GROUPS.aram.has(q));
    });
    // Ignore remakes < 5 min
    return base.filter((m) => (m?.info?.gameDuration ?? 0) >= 300);
  }, [matches, selectedTypes]);

  // Helpers
  const nf = (n) => (Number.isFinite(n) ? n.toLocaleString("fr-FR") : "0");
  const topN = (obj, n = 5) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  // Agrégations (fonctionne même si 0 matchs → “—”)
  const agg = useMemo(() => {
    if (!player) return null;

    const puuid = player.account.puuid;
    const parts = (filteredMatches || []).map((m) => m?.info?.participants?.find((p) => p.puuid === puuid)).filter(Boolean);
    const n = parts.length;

    const safeAvg = (sum) => (n ? nf(Math.round(sum / n)) : "—");
    const sumKey = (k) => parts.reduce((a, p) => a + (Number(p?.[k]) || 0), 0);
    const maxKey = (k) => parts.reduce((a, p) => Math.max(a, Number(p?.[k]) || 0), 0);

    const kills = sumKey("kills");
    const deaths = sumKey("deaths");
    const assists = sumKey("assists");

    // Dégâts infligés
    const dmg = {
      total: sumKey("totalDamageDealt"),
      champs: sumKey("totalDamageDealtToChampions"),
      phys: sumKey("physicalDamageDealt"),
      physChamps: sumKey("physicalDamageDealtToChampions"),
      mag: sumKey("magicDamageDealt"),
      magChamps: sumKey("magicDamageDealtToChampions"),
      brut: sumKey("trueDamageDealt"),
      brutChamps: sumKey("trueDamageDealtToChampions"),
      tours: sumKey("damageDealtToTurrets"),
      objectifs: sumKey("damageDealtToObjectives"),
    };

    // Dégâts subis / mitigés
    const taken = {
      total: sumKey("totalDamageTaken"),
      phys: sumKey("physicalDamageTaken"),
      mag: sumKey("magicDamageTaken"),
      brut: sumKey("trueDamageTaken"),
      selfMitigated: sumKey("damageSelfMitigated"),
    };

    // Objectifs
    const obj = {
      tKills: sumKey("turretKills"),
      tTD: sumKey("turretTakedowns"),
      iKills: sumKey("inhibitorKills"),
      iTD: sumKey("inhibitorTakedowns"),
      baron: sumKey("baronKills"),
      dragon: sumKey("dragonKills"),
      herald: sumKey("riftHeraldKills"),
      stolen: sumKey("objectivesStolen"),
      stolenA: sumKey("objectivesStolenAssists"),
    };

    // Vision
    const vision = {
      score: sumKey("visionScore"),
      placed: sumKey("wardsPlaced"),
      killed: sumKey("wardsKilled"),
      pinks: sumKey("visionWardsBoughtInGame"),
      detectors: sumKey("detectorWardsPlaced"),
    };

    // Économie
    const eco = {
      gold: sumKey("goldEarned"),
      goldSpent: sumKey("goldSpent"),
      cs: sumKey("totalMinionsKilled"),
      neutral: sumKey("neutralMinionsKilled"),
      teamJgl: sumKey("neutralMinionsKilledTeamJungle"),
      enemyJgl: sumKey("neutralMinionsKilledEnemyJungle"),
      consumables: sumKey("consumablesPurchased"),
      itemsBought: sumKey("itemsPurchased"),
    };

    // W-L
    const wins = parts.filter((p) => p.win).length;
    const losses = n - wins;
    const winrate = n ? Math.round((wins / n) * 100) + "%" : "—";
    const kdaVal = n ? (deaths === 0 ? kills + assists : (kills + assists) / deaths) : null;

    // Items fréquents
    const itemFreq = {};
    for (const p of parts) for (let i = 0; i <= 6; i++) {
      const it = Number(p?.[`item${i}`] || 0);
      if (it > 0) itemFreq[it] = (itemFreq[it] || 0) + 1;
    }
    const topItems = topN(itemFreq, 8).map(([id, cnt]) => ({ id: Number(id), cnt }));

    // Sorts
    const spellFreq = {};
    for (const p of parts) {
      const s1 = Number(p?.summoner1Id || 0), s2 = Number(p?.summoner2Id || 0);
      if (s1) spellFreq[s1] = (spellFreq[s1] || 0) + 1;
      if (s2) spellFreq[s2] = (spellFreq[s2] || 0) + 1;
    }
    const topSpells = topN(spellFreq, 4).map(([id, cnt]) => ({ id: Number(id), cnt }));

    // Runes
    const styleFreq = {}, subFreq = {}, keyFreq = {};
    for (const p of parts) {
      const styles = p?.perks?.styles || [];
      const primary = styles[0], s = styles[1];
      if (primary?.style) styleFreq[primary.style] = (styleFreq[primary.style] || 0) + 1;
      if (s?.style) subFreq[s.style] = (subFreq[s.style] || 0) + 1;
      const ks = primary?.selections?.[0]?.perk;
      if (ks) keyFreq[ks] = (keyFreq[ks] || 0) + 1;
    }
    const topPrimaryStyles = topN(styleFreq, 3).map(([id, cnt]) => ({ id: Number(id), cnt }));
    const topSubStyles = topN(subFreq, 3).map(([id, cnt]) => ({ id: Number(id), cnt }));
    const topKeystones = topN(keyFreq, 6).map(([id, cnt]) => ({ id: Number(id), cnt }));

    // Playstyle (par champion avec W-L)
    const champStats = {}; // id -> { cnt, w }
    for (const p of parts) {
      const meta =
        (dd?.championMetaFromNameOrKey && dd.championMetaFromNameOrKey(p.championName, p.championId)) ||
        (dd?.championMetaByKey && dd.championMetaByKey(p.championId));
      const id = meta?.id || p.championName || "Inconnu";
      if (!champStats[id]) champStats[id] = { cnt: 0, w: 0, name: meta?.name || p.championName || "Inconnu" };
      champStats[id].cnt++;
      if (p.win) champStats[id].w++;
    }
    const topChamps = Object.entries(champStats)
      .map(([id, s]) => ({ id, name: s.name, cnt: s.cnt, w: s.w, l: s.cnt - s.w, wr: s.cnt ? Math.round((s.w / s.cnt) * 100) : 0 }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 8);

    return {
      n,
      kpis: {
        winrate,
        wl: `${wins}-${losses}`,
        kda: n ? (kdaVal?.toFixed ? kdaVal.toFixed(2) : "—") : "—",
        degatsChampsMoy: safeAvg(dmg.champs),
        visionMoy: safeAvg(vision.score),
        orMoy: safeAvg(eco.gold),
        parties: n,
      },
      combat: {
        killsAvg: n ? (kills / n).toFixed(2) : "—",
        deathsAvg: n ? (deaths / n).toFixed(2) : "—",
        assistsAvg: n ? (assists / n).toFixed(2) : "—",
        kdaTotal: `${kills}/${deaths}/${assists}`,
        spreeMax: maxKey("largestKillingSpree"),
        multiKillMax: maxKey("largestMultiKill"),
        quadras: parts.reduce((a, p) => a + (p.quadraKills || 0), 0),
        pentas: parts.reduce((a, p) => a + (p.pentaKills || 0), 0),
        critMax: maxKey("largestCriticalStrike"),
        lvlMax: maxKey("champLevel"),
        dmgAvg: {
          total: safeAvg(dmg.total),
          champions: safeAvg(dmg.champs),
          physiques: safeAvg(dmg.phys),
          physiquesChamp: safeAvg(dmg.physChamps),
          magiques: safeAvg(dmg.mag),
          magiquesChamp: safeAvg(dmg.magChamps),
          bruts: safeAvg(dmg.brut),
          brutsChamp: safeAvg(dmg.brutChamps),
          tourelles: safeAvg(dmg.tours),
          objectifs: safeAvg(dmg.objectifs),
        },
        dmgSum: {
          total: nf(dmg.total), champions: nf(dmg.champs), tourelles: nf(dmg.tours), objectifs: nf(dmg.objectifs),
        },
      },
      tanking: {
        subisMoy: {
          total: safeAvg(taken.total),
          physiques: safeAvg(taken.phys),
          magiques: safeAvg(taken.mag),
          bruts: safeAvg(taken.brut),
          mitiges: safeAvg(taken.selfMitigated),
        },
        subisSum: { total: nf(taken.total), mitiges: nf(taken.selfMitigated) },
      },
      objectives: {
        perGame: {
          tourelles: n ? (obj.tKills / n).toFixed(2) : "—",
          inhibiteurs: n ? (obj.iKills / n).toFixed(2) : "—",
          barons: n ? (obj.baron / n).toFixed(2) : "—",
          dragons: n ? (obj.dragon / n).toFixed(2) : "—",
          herauts: n ? (obj.herald / n).toFixed(2) : "—",
          vols: n ? (obj.stolen / n).toFixed(2) : "—",
        },
        totals: {
          tourelles: nf(obj.tKills), prisesTourelles: nf(obj.tTD), inhibiteurs: nf(obj.iKills),
          prisesInhibiteurs: nf(obj.iTD), barons: nf(obj.baron), dragons: nf(obj.dragon),
          herauts: nf(obj.herald), vols: nf(obj.stolen), assistsVols: nf(obj.stolenA),
        },
      },
      vision: {
        scoreMoy: safeAvg(vision.score),
        scoreSum: nf(vision.score),
        wardsPosesMoy: n ? (vision.placed / n).toFixed(2) : "—",
        wardsDetruitsMoy: n ? (vision.killed / n).toFixed(2) : "—",
        pinksSum: nf(vision.pinks),
        detectorsSum: nf(vision.detectors),
      },
      economy: {
        orMoy: safeAvg(eco.gold),
        orSum: nf(eco.gold),
        orDepenseSum: nf(eco.goldSpent),
        csMoy: n ? (eco.cs / n).toFixed(2) : "—",
        csSum: nf(eco.cs),
        jungleMoy: n ? (eco.neutral / n).toFixed(2) : "—",
        jungleAllieSum: nf(eco.teamJgl),
        jungleEnnemiSum: nf(eco.enemyJgl),
        consoSum: nf(eco.consumables),
        achatsSum: nf(eco.itemsBought),
        topItems,
      },
      spellsRunes: {
        topSpells,
        stylesPrim: topPrimaryStyles,
        stylesSec: topSubStyles,
        keystones: topKeystones,
      },
      time: {
        mortMoyS: n ? (sumKey("totalTimeSpentDead") / n).toFixed(2) : "—",
        mortSumS: nf(sumKey("totalTimeSpentDead")),
        longVieMaxS: nf(maxKey("longestTimeSpentLiving")),
        ccMoy: n ? nf(Math.round(parts.reduce((a, p) => a + (p.timeCCingOthers || 0), 0) / n)) : "—",
      },
      end: { winrate, games: n, wl: `${wins}-${losses}` },
      playstyle: { topChamps },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, filteredMatches, dd]);

  const profileIconUrl =
    dd && player?.summoner?.profileIconId != null ? dd.profileIconUrl(player.summoner.profileIconId) : "";

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <SearchForm
          onSubmit={handleSearch}
          onFilterChange={setSelectedTypes}
          loading={loading}
          selectedTypes={selectedTypes}
        />

        {player && (
          <section className="mt-8 space-y-10">
            <Reveal>
              <PlayerHeader player={player} server={server} progress={progress} profileIconUrl={profileIconUrl} />
            </Reveal>

            {/* KPIs */}
            {agg && (
              <Reveal>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="sky" label="Winrate" value={agg.kpis.winrate} hint={agg.kpis.wl ? `W-L ${agg.kpis.wl}` : undefined} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="KDA moyen" value={agg.kpis.kda} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Dégâts aux champions (moy.)" value={agg.kpis.degatsChampsMoy} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Score de vision (moy.)" value={agg.kpis.visionMoy} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="Or gagné (moy.)" value={agg.kpis.orMoy} /></RevealItem>
                  <RevealItem><StatCard tone="indigo" label="Parties agrégées" value={agg.kpis.parties} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Combat */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Combat</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="red" label="Éliminations (moy.)" value={agg.combat.killsAvg} hint={`Σ ${agg.combat.kdaTotal.split("/")[0]}`} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Morts (moy.)" value={agg.combat.deathsAvg} hint={`Σ ${agg.combat.kdaTotal.split("/")[1]}`} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Assistances (moy.)" value={agg.combat.assistsAvg} hint={`Σ ${agg.combat.kdaTotal.split("/")[2]}`} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Série d’élim. max" value={agg.combat.spreeMax} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Multi-kill max" value={agg.combat.multiKillMax} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Quadra / Penta (Σ)" value={`${agg.combat.quadras} / ${agg.combat.pentas}`} /></RevealItem>
                </div>

                <h3 className="text-lg font-semibold mt-4">Dégâts infligés</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="red" label="Total (moy.)" value={agg.combat.dmgAvg.total} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Aux champions (moy.)" value={agg.combat.dmgAvg.champions} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Physiques (moy.)" value={agg.combat.dmgAvg.physiques} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Physiques aux champions (moy.)" value={agg.combat.dmgAvg.physiquesChamp} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Magiques (moy.)" value={agg.combat.dmgAvg.magiques} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Magiques aux champions (moy.)" value={agg.combat.dmgAvg.magiquesChamp} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Bruts (moy.)" value={agg.combat.dmgAvg.bruts} /></RevealItem>
                  <RevealItem><StatCard tone="red" label="Bruts aux champions (moy.)" value={agg.combat.dmgAvg.brutsChamp} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Aux tourelles (moy.)" value={agg.combat.dmgAvg.tourelles} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Aux objectifs (moy.)" value={agg.combat.dmgAvg.objectifs} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Dégâts subis & mitigation */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Dégâts subis & mitigation</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="amber" label="Subis (moy.)" value={agg.tanking.subisMoy.total} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Physiques (moy.)" value={agg.tanking.subisMoy.physiques} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Magiques (moy.)" value={agg.tanking.subisMoy.magiques} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Bruts (moy.)" value={agg.tanking.subisMoy.bruts} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="Dégâts mitigés (moy.)" value={agg.tanking.subisMoy.mitiges} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Objectifs */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Objectifs</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="amber" label="Tourelles / partie" value={agg.objectives.perGame.tourelles} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Inhibiteurs / partie" value={agg.objectives.perGame.inhibiteurs} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Dragons / partie" value={agg.objectives.perGame.dragons} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Barons / partie" value={agg.objectives.perGame.barons} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Hérauts / partie" value={agg.objectives.perGame.herauts} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Vols / partie" value={agg.objectives.perGame.vols} /></RevealItem>
                </div>

                <h3 className="text-lg font-semibold mt-4">Volume total</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="amber" label="Σ Tourelles détruites" value={agg.objectives.totals.tourelles} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Prises de tourelles" value={agg.objectives.totals.prisesTourelles} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Inhibiteurs détruits" value={agg.objectives.totals.inhibiteurs} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Prises d’inhibiteurs" value={agg.objectives.totals.prisesInhibiteurs} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Barons" value={agg.objectives.totals.barons} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Dragons" value={agg.objectives.totals.dragons} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Hérauts" value={agg.objectives.totals.herauts} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Vols" value={agg.objectives.totals.vols} /></RevealItem>
                  <RevealItem><StatCard tone="amber" label="Σ Assists sur vols" value={agg.objectives.totals.assistsVols} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Vision */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Vision</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="cyan" label="Score de vision (moy.)" value={agg.vision.scoreMoy} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Score de vision (Σ)" value={agg.vision.scoreSum} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Wards posés (moy.)" value={agg.vision.wardsPosesMoy} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Wards détruits (moy.)" value={agg.vision.wardsDetruitsMoy} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Balises de contrôle (Σ)" value={agg.vision.pinksSum} /></RevealItem>
                  <RevealItem><StatCard tone="cyan" label="Détecteurs posés (Σ)" value={agg.vision.detectorsSum} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Économie & objets */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Économie & objets</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="emerald" label="Or gagné (moy.)" value={agg.economy.orMoy} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="Or gagné (Σ)" value={agg.economy.orSum} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="Or dépensé (Σ)" value={agg.economy.orDepenseSum} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="CS (moy.)" value={agg.economy.csMoy} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="CS (Σ)" value={agg.economy.csSum} /></RevealItem>
                  <RevealItem><StatCard tone="emerald" label="Sbires jungle (moy.)" value={agg.economy.jungleMoy} /></RevealItem>
                </div>

                {/* Items populaires */}
                <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                  <div className="text-sm text-neutral-400 mb-3">Objets les plus fréquents</div>
                  <Reveal>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {agg.economy.topItems.length ? agg.economy.topItems.map((it) => {
                        const meta = dd?.itemsById?.[it.id];
                        const icon = meta?.image?.full ? dd.itemIconUrl(meta.image.full) : "";
                        return (
                          <RevealItem key={it.id}>
                            <div className="flex items-center gap-3 rounded-xl p-2 bg-neutral-800/50 border border-neutral-700 hover:-translate-y-1 transition-transform">
                              <img src={icon} alt={meta?.name || `Objet ${it.id}`} className="w-10 h-10 rounded" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{meta?.name || `Objet ${it.id}`}</div>
                                <div className="text-xs text-neutral-400">× {it.cnt}</div>
                              </div>
                            </div>
                          </RevealItem>
                        );
                      }) : <div className="text-sm text-neutral-500">—</div>}
                    </div>
                  </Reveal>
                </div>
              </Reveal>
            )}

            {/* Runes & sorts */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Runes & sorts d’invocateur</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Sorts */}
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                    <div className="text-sm text-neutral-400 mb-2">Sorts les plus joués</div>
                    <div className="flex flex-wrap gap-3">
                      {agg.spellsRunes.topSpells.length ? agg.spellsRunes.topSpells.map((s) => {
                        const name = dd?.spellName?.(s.id);
                        const icon = dd?.spellIconUrl?.(s.id);
                        return (
                          <RevealItem key={s.id}>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-800/60 border border-neutral-700 hover:-translate-y-1 transition-transform">
                              <img src={icon} alt={name} className="w-6 h-6 rounded" />
                              <div className="text-sm">{name || `Sort ${s.id}`}</div>
                              <div className="text-xs text-neutral-400">× {s.cnt}</div>
                            </div>
                          </RevealItem>
                        );
                      }) : <div className="text-sm text-neutral-500">—</div>}
                    </div>
                  </div>

                  {/* Styles */}
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                    <div className="text-sm text-neutral-400 mb-2">Styles primaires</div>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {agg.spellsRunes.stylesPrim.length ? agg.spellsRunes.stylesPrim.map((st) => {
                        const name = dd?.runeStyleName?.(st.id);
                        const icon = dd?.runeStyleIconUrl?.(st.id);
                        return (
                          <RevealItem key={st.id}>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-800/60 border border-neutral-700 hover:-translate-y-1 transition-transform">
                              <img src={icon} alt={name} className="w-6 h-6 rounded" />
                              <div className="text-sm">{name || `Style ${st.id}`}</div>
                              <div className="text-xs text-neutral-400">× {st.cnt}</div>
                            </div>
                          </RevealItem>
                        );
                      }) : <div className="text-sm text-neutral-500">—</div>}
                    </div>

                    <div className="text-sm text-neutral-400 mb-2">Styles secondaires</div>
                    <div className="flex flex-wrap gap-3">
                      {agg.spellsRunes.stylesSec.length ? agg.spellsRunes.stylesSec.map((st) => {
                        const name = dd?.runeStyleName?.(st.id);
                        const icon = dd?.runeStyleIconUrl?.(st.id);
                        return (
                          <RevealItem key={st.id}>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-800/60 border border-neutral-700 hover:-translate-y-1 transition-transform">
                              <img src={icon} alt={name} className="w-6 h-6 rounded" />
                              <div className="text-sm">{name || `Style ${st.id}`}</div>
                              <div className="text-xs text-neutral-400">× {st.cnt}</div>
                            </div>
                          </RevealItem>
                        );
                      }) : <div className="text-sm text-neutral-500">—</div>}
                    </div>
                  </div>

                  {/* Keystones */}
                  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                    <div className="text-sm text-neutral-400 mb-2">Keystones</div>
                    <div className="flex flex-wrap gap-3">
                      {agg.spellsRunes.keystones.length ? agg.spellsRunes.keystones.map((k) => {
                        const name = dd?.keystoneName?.(k.id);
                        const icon = dd?.keystoneIconUrl?.(k.id);
                        return (
                          <RevealItem key={k.id}>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-800/60 border border-neutral-700 hover:-translate-y-1 transition-transform">
                              <img src={icon} alt={name} className="w-6 h-6 rounded" />
                              <div className="text-sm">{name || `Keystone ${k.id}`}</div>
                              <div className="text-xs text-neutral-400">× {k.cnt}</div>
                            </div>
                          </RevealItem>
                        );
                      }) : <div className="text-sm text-neutral-500">—</div>}
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            {/* Temps */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Temps & gameplay</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="violet" label="Temps mort (moy., s)" value={agg.time.mortMoyS} /></RevealItem>
                  <RevealItem><StatCard tone="violet" label="Temps mort (Σ, s)" value={agg.time.mortSumS} /></RevealItem>
                  <RevealItem><StatCard tone="violet" label="Plus longue vie (s)" value={agg.time.longVieMaxS} /></RevealItem>
                  <RevealItem><StatCard tone="violet" label="CC appliqué (moy.)" value={agg.time.ccMoy} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Fin */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Fin de partie</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RevealItem><StatCard tone="sky" label="Winrate" value={agg.end.winrate} hint={agg.end.wl ? `W-L ${agg.end.wl}` : undefined} /></RevealItem>
                  <RevealItem><StatCard tone="indigo" label="Parties agrégées" value={agg.end.games} /></RevealItem>
                </div>
              </Reveal>
            )}

            {/* Playstyle — icônes + W-L + % */}
            {agg && (
              <Reveal>
                <h2 className="text-2xl font-bold mb-2">Playstyle</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {agg.playstyle.topChamps.length ? agg.playstyle.topChamps.map((c) => {
                    const icon = dd?.championIconById?.(c.id);
                    return (
                      <RevealItem key={c.id}>
                        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-2 flex items-center gap-2">
                          <img src={icon} alt={c.name} className="w-10 h-10 rounded-lg border border-neutral-700 object-cover" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-xs text-neutral-400">{c.cnt} parties • {c.w}-{c.l} • {c.wr}%</div>
                          </div>
                        </div>
                      </RevealItem>
                    );
                  }) : <div className="text-sm text-neutral-500">—</div>}
                </div>
              </Reveal>
            )}

            {/* Matchs récents */}
            <Reveal>
              <h2 className="text-2xl font-bold">Matchs récents (filtrés)</h2>
              <div className="text-sm text-neutral-400 mt-1 mb-3">
                {filteredMatches.length} / {matches.length} matchs affichés (fenêtre max 100).
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.slice(0, 10).map((m) => (
                  <RevealItem key={m?.metadata?.matchId}>
                    <MatchCard match={m} puuid={player.account.puuid} dd={dd} />
                  </RevealItem>
                ))}
              </div>
            </Reveal>
          </section>
        )}
      </div>
    </main>
  );
}
