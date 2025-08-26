// Noms FR — sans Data Dragon. Couverture : sorts courants + styles/Keystones majeurs.
// Tu pourras plugger DDragon ensuite pour Items/Runes détaillées.

export const SUMMONER_SPELLS_FR = {
  1: "Purification",
  3: "Fatigue",
  4: "Flash",
  6: "Fantôme",
  7: "Soin",
  11: "Châtiment",
  12: "Téléportation",
  13: "Clarté (ARAM)",
  14: "Embrasement",
  21: "Barrière",
  32: "Marque (ARAM)",
  39: "Ruée (ARAM)",
};

export function spellName(id) {
  const k = Number(id);
  return SUMMONER_SPELLS_FR[k] || `Sort ${k}`;
}

// Styles de runes (arbres)
export const RUNE_STYLES_FR = {
  8000: "Précision",
  8100: "Domination",
  8200: "Sorcellerie",
  8300: "Inspiration",
  8400: "Volonté",
};

export function runeStyleName(id) {
  const k = Number(id);
  return RUNE_STYLES_FR[k] || `Style ${k}`;
}

// Keystones (runes maîtresses)
export const KEYSTONES_FR = {
  // Précision
  8005: "Attaque soutenue",
  8008: "Tempo mortel",
  8010: "Conquérant",
  8021: "Jeu de jambes",
  // Domination
  8112: "Électrocution",
  8124: "Prédateur",
  8128: "Moisson noire",
  9923: "Déluge de lames",
  // Sorcellerie
  8214: "Aery",
  8229: "Comète arcanique",
  8230: "Rush phasique",
  // Volonté
  8437: "Poigne de l’immortel",
  8439: "Après-coup",
  8465: "Gardien",
  // Inspiration
  8351: "Optimisation glaciale",
  8360: "Livre de sorts non scellé",
  8369: "Premier coup",
};

export function keystoneName(id) {
  const k = Number(id);
  return KEYSTONES_FR[k] || `Keystone ${k}`;
}

// Format utilitaires
export function formatCountList(pairs, namer) {
  if (!pairs || !pairs.length) return "—";
  return pairs.map(({ id, cnt }) => `${namer(id)} × ${cnt}`).join(" • ");
}
