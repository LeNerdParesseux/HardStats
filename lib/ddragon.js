// lib/ddragon.js
// Charge DDragon (FR) et expose helpers: items, sorts, runes, champions.

const CDN = "https://ddragon.leagueoflegends.com";

let cache = {
  loaded: false,
  version: null,
  itemsById: {},
  spellsById: {},
  runeStylesById: {},
  keystonesById: {},
  championsByKey: {},     // { [numericKey]: { id, name, image } }
  championsById: {},      // { [id:"Aatrox"]: { name, image } }
  championsByNorm: {},    // { [normalized]: id }
};

async function fetchJson(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`DDragon ${res.status}: ${url}`);
  return res.json();
}

function normalizeChampKey(s) {
  return String(s || "").toLowerCase().replace(/[^a-z]/g, "");
}

export async function loadDDragon(locale = "fr_FR") {
  if (cache.loaded) return cache;

  const versions = await fetchJson(`${CDN}/api/versions.json`);
  const version = versions?.[0];
  if (!version) throw new Error("Version DDragon introuvable");

  const [items, spells, runes, champions] = await Promise.all([
    fetchJson(`${CDN}/cdn/${version}/data/${locale}/item.json`),
    fetchJson(`${CDN}/cdn/${version}/data/${locale}/summoner.json`),
    fetchJson(`${CDN}/cdn/${version}/data/${locale}/runesReforged.json`),
    fetchJson(`${CDN}/cdn/${version}/data/${locale}/champion.json`),
  ]);

  // Items
  const itemsById = {};
  for (const [idStr, data] of Object.entries(items?.data || {})) {
    itemsById[Number(idStr)] = { name: data.name, image: data.image, gold: data.gold, plaintext: data.plaintext };
  }

  // Spells d’invocateur
  const spellsById = {};
  for (const k of Object.keys(spells?.data || {})) {
    const s = spells.data[k];
    spellsById[Number(s.key)] = { name: s.name, image: s.image };
  }

  // Runes
  const runeStylesById = {};
  const keystonesById = {};
  for (const style of runes || []) {
    runeStylesById[style.id] = { name: style.name, icon: style.icon };
    for (const slot of style.slots || []) {
      for (const rune of slot.runes || []) {
        keystonesById[rune.id] = { name: rune.name, icon: rune.icon };
      }
    }
  }

  // Champions
  const championsByKey = {};
  const championsById = {};
  const championsByNorm = {};
  for (const [id, data] of Object.entries(champions?.data || {})) {
    const keyNum = Number(data.key);
    championsByKey[keyNum] = { id, name: data.name, image: data.image };
    championsById[id] = { name: data.name, image: data.image };
    championsByNorm[normalizeChampKey(id)] = id;
    championsByNorm[normalizeChampKey(data.name)] = id;
  }

  cache = {
    loaded: true,
    version,
    itemsById,
    spellsById,
    runeStylesById,
    keystonesById,
    championsByKey,
    championsById,
    championsByNorm,

    // Helpers Items
    itemName: (id) => itemsById[id]?.name || `Objet ${id}`,
    itemIconUrl: (full) => (full ? `${CDN}/cdn/${version}/img/item/${full}` : ""),

    // Profil
    profileIconUrl: (profileIconId) => `${CDN}/cdn/${version}/img/profileicon/${profileIconId}.png`,

    // Spells
    spellName: (id) => spellsById[id]?.name || `Sort ${id}`,
    spellIconUrl: (id) => {
      const full = spellsById[id]?.image?.full;
      return full ? `${CDN}/cdn/${version}/img/spell/${full}` : "";
    },

    // Runes
    runeStyleName: (id) => runeStylesById[id]?.name || `Style ${id}`,
    runeStyleIconUrl: (id) => (runeStylesById[id]?.icon ? `${CDN}/cdn/img/${runeStylesById[id].icon}` : ""),
    keystoneName: (id) => keystonesById[id]?.name || `Keystone ${id}`,
    keystoneIconUrl: (id) => (keystonesById[id]?.icon ? `${CDN}/cdn/img/${keystonesById[id].icon}` : ""),

    // Champions
    championMetaByKey: (keyNum) => championsByKey[keyNum],
    championMetaById: (id) => championsById[id],
    championIconById: (id) => (id ? `${CDN}/cdn/${version}/img/champion/${id}.png` : ""),
    championMetaFromNameOrKey: (name, keyNum) => {
      if (keyNum && championsByKey[keyNum]) return championsByKey[keyNum];
      const id = championsByNorm[normalizeChampKey(name || "")];
      if (id && championsById[id]) return { id, ...championsById[id] };
      return null;
    },
  };

  return cache;
}
