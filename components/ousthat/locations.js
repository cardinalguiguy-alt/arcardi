/*
 * Le catalogue de panoramas, réparti en CARTES nommées (maps.js — 2026-09-06,
 * voir ce fichier pour ajouter une carte future). « Beautiful World » reste
 * la seule à ce jour et couvre tout le stock historique : 38 panoramas
 * WorldGuessr (MIT, révision ef88928c) et la carte personnelle que Guillaume
 * a construite dans l'éditeur GeoGuessr, ~1500 lieux après déduplication.
 * Provenance et licences complètes : ./THIRD_PARTY_NOTICES.md.
 *
 * ⚠️ panoId peut être null : la plupart des lieux GeoGuessr n'en ont pas non
 * plus, et streetViewUrl (StreetViewFrame.js) résout alors le panorama au vol
 * depuis lat/lng. ⚠️ country peut être null (rattachement pays hors ligne,
 * point-dans-polygone, voir import-locations.mjs/import-map.mjs) : ces lieux
 * restent utilisables en Pinpoint, jamais tirés en mode Pays —
 * locationOrder(seed, "country") filtre sur ce champ, locationOrder(seed,
 * "pinpoint") ne filtre rien.
 *
 * ⚠️ Aucune vérification programmatique ne peut confirmer qu'un panoId est
 * encore servi par Google sans une API facturée (voir README.md) — un
 * panorama mort se signale en jeu (bouton « signaler »), pas au chargement.
 */

import { MAPS, MAP_BY_ID } from "./maps";
import { COUNTRY_BY_CODE } from "./countries";

export { MAPS, MAP_BY_ID } from "./maps";

// Union de toutes les cartes enregistrées. Un id de lieu reste unique ENTRE
// cartes (préfixe imposé par tools/import-map.mjs) : hostResolve retrouve
// donc la cible via LOCATION_BY_ID quelle que soit la carte qui a servi à
// construire locationOrder.
export const LOCATIONS = MAPS.flatMap((map) => map.locations);

export const LOCATION_BY_ID = Object.freeze(Object.fromEntries(LOCATIONS.map((location) => [location.id, location])));

// Compatibilité des appelants historiques : le catalogue complet et les noms
// vivent dans countries.js, locations.js ne décrit que les panoramas.
export { countryFlag } from "./countries";

function hashSeed(seed) {
  let h = 2166136261;
  for (const char of String(seed)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let x = hashSeed(seed) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

// mode "country" ne tire que les lieux rattachés à un pays du vocabulaire
// GeoGuessr Explorer (countries.js) — un tiers du stock reste Pinpoint seul.
// mode "pinpoint" (par défaut) tire dans tout le stock, pays ou non.
// mapId (2026-09-06) restreint le tirage à UNE carte de maps.js — un id
// inconnu retombe sur la carte par défaut plutôt que de planter.
export function locationOrder(seed, mode = "pinpoint", mapId = "beautiful-world") {
  const base = (MAP_BY_ID[mapId] || MAP_BY_ID["beautiful-world"]).locations;
  const pool = mode === "country" ? base.filter((location) => COUNTRY_BY_CODE[location.country]) : base;
  const ids = pool.map((location) => location.id);
  const random = seededRandom(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
