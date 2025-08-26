import { regionInfo, fetchJson } from "@/lib/riot";

export async function POST(request) {
  try {
    const { name, tag, server } = await request.json();
    if (!name || !tag) {
      return new Response(JSON.stringify({ error: "name & tag required" }), { status: 400 });
    }

    const { platform, regional } = regionInfo(server);

    // 1) Riot ID -> account (PUUID)
    const accountUrl = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      name
    )}/${encodeURIComponent(tag)}`;
    console.log("[RIOT] GET", accountUrl);
    const account = await fetchJson(accountUrl);

    // 2) Summoner via PUUID (peut ne pas exister sur ce shard)
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`;
    console.log("[RIOT] GET", summonerUrl);
    let summoner = null;
    try {
      summoner = await fetchJson(summonerUrl);
      console.log("[RIOT][SUMMONER]", summoner?.id ? "OK" : "NO-ID");
    } catch (e) {
      console.warn("[BOOTSTRAP] summoner by-puuid failed:", e.message);
    }

    // 3) League entries si on a un encryptedSummonerId
    let league = [];
    if (summoner?.id) {
      const leagueUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(
        summoner.id
      )}`;
      console.log("[RIOT] GET", leagueUrl);
      try {
        league = await fetchJson(leagueUrl);
      } catch (e) {
        console.warn("[BOOTSTRAP] league entries failed:", e.message);
      }
    } else {
      console.warn("[BOOTSTRAP] no summoner.id on this shard, league skipped");
    }

    // On renvoie quand même : le front peut tout faire avec `account.puuid`
    return Response.json({ account, summoner, league, platform, regional });
  } catch (e) {
    console.error("[BOOTSTRAP][ERR]", e?.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
