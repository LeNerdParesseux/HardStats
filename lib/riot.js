const REGION_CLUSTER = {
  EUW:  { platform: "euw1", regional: "europe" },
  EUNE: { platform: "eun1", regional: "europe" },
  NA:   { platform: "na1",  regional: "americas" },
  KR:   { platform: "kr",   regional: "asia" },
  JP:   { platform: "jp1",  regional: "asia" },
  BR:   { platform: "br1",  regional: "americas" },
  LAN:  { platform: "la1",  regional: "americas" },
  LAS:  { platform: "la2",  regional: "americas" },
  OCE:  { platform: "oc1",  regional: "americas" },
  TR:   { platform: "tr1",  regional: "europe" },
  RU:   { platform: "ru",   regional: "europe" },
  PH:   { platform: "ph2",  regional: "sea" },
  SG:   { platform: "sg2",  regional: "sea" },
  TH:   { platform: "th2",  regional: "sea" },
  TW:   { platform: "tw2",  regional: "sea" },
  VN:   { platform: "vn2",  regional: "sea" },
};

export function regionInfo(server) {
  const key = (server || "EUW").toUpperCase();
  return REGION_CLUSTER[key] || REGION_CLUSTER.EUW;
}

export function riotHeaders() {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("RIOT_API_KEY manquante (définis-la dans .env.local puis redémarre)");
  return { "X-Riot-Token": key };
}

export async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), ...riotHeaders() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[RIOT][ERR]", res.status, res.statusText, url, text);
    throw new Error(`Riot API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}
