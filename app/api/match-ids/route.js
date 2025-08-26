import { regionInfo, fetchJson } from "@/lib/riot";

export async function POST(request) {
  try {
    const { puuid, server, count = 100, start = 0 } = await request.json();
    if (!puuid) {
      return new Response(JSON.stringify({ error: "puuid required" }), { status: 400 });
    }
    const { regional } = regionInfo(server);
    const safeCount = Math.min(100, Math.max(1, Number(count) || 1));
    const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${safeCount}`;
    console.log("[RIOT] GET", url);
    const ids = await fetchJson(url);
    return Response.json({ ids });
  } catch (e) {
    console.error("[MATCH-IDS][ERR]", e?.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
