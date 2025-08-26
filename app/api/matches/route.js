import { regionInfo, fetchJson } from "@/lib/riot";

export async function POST(request) {
  try {
    const { matchIds = [], server } = await request.json();
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return new Response(JSON.stringify({ error: "matchIds required" }), { status: 400 });
    }
    const { regional } = regionInfo(server);

    const MAX_CONCURRENCY = 12; // safe < 20 r/s
    const results = [];
    let i = 0;

    async function worker() {
      while (i < matchIds.length) {
        const idx = i++;
        const id = matchIds[idx];
        const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${id}`;
        try {
          console.log("[RIOT] GET", url);
          const m = await fetchJson(url);
          results[idx] = m;
        } catch (e) {
          console.error("[MATCH][ERR]", id, e?.message);
          results[idx] = { error: e.message, metadata: { matchId: id } };
        }
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, matchIds.length) }, () => worker());
    await Promise.all(workers);

    return Response.json({ matches: results });
  } catch (e) {
    console.error("[MATCHES][ERR]", e?.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
