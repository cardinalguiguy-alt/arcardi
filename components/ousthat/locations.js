/*
 * Le catalogue de panoramas. Les données brutes vivent dans locationsData.js
 * (généré par tools/import-locations.mjs — ne pas éditer à la main) : ce
 * fichier-ci ne porte que la logique.
 *
 * Deux provenances, mélangées dans un seul tableau : 38 panoramas WorldGuessr
 * (MIT, révision ef88928c) et la carte personnelle que Guillaume a construite
 * dans l'éditeur GeoGuessr, ~1500 lieux après déduplication (2026-09-06).
 * Provenance et licences complètes : ./THIRD_PARTY_NOTICES.md.
 *
 * ⚠️ panoId peut être null : la plupart des lieux GeoGuessr n'en ont pas non
 * plus, et streetViewUrl (StreetViewFrame.js) résout alors le panorama au vol
 * depuis lat/lng. ⚠️ country peut être null (rattachement pays hors ligne,
 * point-dans-polygone, voir import-locations.mjs) : ces lieux restent
 * utilisables en Pinpoint, jamais tirés en mode Pays — locationOrder(seed,
 * "country") filtre sur ce champ, locationOrder(seed, "pinpoint") ne filtre
 * rien.
 *
 * ⚠️ Aucune vérification programmatique ne peut confirmer qu'un panoId est
 * encore servi par Google sans une API facturée (voir README.md) — un
 * panorama mort se signale en jeu (bouton « signaler »), pas au chargement.
 */

import { LOCATIONS_RAW } from "./locationsData";
import { COUNTRY_BY_CODE } from "./countries";

export const LOCATIONS = LOCATIONS_RAW;

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
export function locationOrder(seed, mode = "pinpoint") {
  const pool = mode === "country" ? LOCATIONS.filter((location) => COUNTRY_BY_CODE[location.country]) : LOCATIONS;
  const ids = pool.map((location) => location.id);
  const random = seededRandom(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
