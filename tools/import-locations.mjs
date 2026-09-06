/* =============================================================================
   import-locations.mjs — LE STOCK DE PANORAMAS, ÉLARGI À LA CARTE DE GUILLAUME.
   -----------------------------------------------------------------------------
   Les 38 lieux WorldGuessr (locations.js, avant ce zip) donnaient un stock si
   petit qu'un Country Streak solo pouvait épuiser tout le catalogue — la
   phase `exhausted` existe précisément pour ce cas. Ce script fusionne ces 38
   lieux, INCHANGÉS, avec la carte personnelle que Guillaume a construite dans
   l'éditeur GeoGuessr (~/Downloads/locations.json, 1645 lieux) pour sortir le
   jeu de ce régime.

   Deux manques dans l'export GeoGuessr, et comment ce script les comble :

   1. 85 % des lieux n'ont pas de panoId figé — seulement lat/lng/heading/
      pitch/zoom. C'est le fonctionnement natif de GeoGuessr lui-même : la
      plupart de ses propres lieux n'ont pas d'identifiant fixe non plus.
      `streetViewUrl` (StreetViewFrame.js) sait désormais demander
      `location=lat,lng` à la place de `pano=` — Google résout alors le
      panorama le plus proche, de façon stable pour une même coordonnée.

   2. Aucun code pays. Le rattachement se fait ICI, hors ligne, par point-dans-
      polygone contre les frontières Natural Earth 1:50 000 000 vendorisées
      dans `world-atlas` (devDependency, jamais chargée par le jeu — voir
      THIRD_PARTY_NOTICES.md). Un lieu dont aucune frontière ne le contient,
      ou dont le code résolu n'appartient pas au vocabulaire GeoGuessr
      Explorer de countries.js, reste utilisable en Pinpoint seul
      (country: null) : le mode Pays n'en tient pas compte (voir
      locations.js, locationOrder(seed, "country") filtre sur ce champ).

   ⚠️ Le cadrage (heading/pitch/zoom→fov) de chaque lieu est CONSERVÉ tel que
   Guillaume l'a composé en construisant sa carte — décision explicite
   (2026-09-06), pas un défaut. zoom suit le même référentiel que
   google.maps.StreetViewPanorama.zoom (0 = 180° de champ, 3 ≈ 22,5°,
   confirmé par la plage observée dans l'export, 0 à ~3,1) : fov = 180 / 2^zoom,
   borné à [10, 100] (plage documentée de Maps Embed API).

   ⚠️ Aucune vérification programmatique ne peut confirmer qu'un panoId est
   encore servi par Google sans une API facturée (voir locations.js et
   README.md) : la vérification reste un balayage manuel dans un navigateur,
   fait à part (voir bloc REPRISE de CLAUDE.md), jamais dans ce script.

   Usage : node tools/import-locations.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { haversineDistanceKm } from "../components/ousthat/rules.js";
import { COUNTRY_BY_CODE } from "../components/ousthat/countries.js";

const require = createRequire(import.meta.url);
const topojson = require("topojson-client");
const worldTopology = require("world-atlas/countries-50m.json");
const isoCountries = require("i18n-iso-countries");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_JSON = path.join(process.env.HOME || "", "Downloads", "locations.json");
const OUT = path.join(ROOT, "components", "ousthat", "locationsData.js");

/* Les 38 lieux WorldGuessr existants, inchangés — voir THIRD_PARTY_NOTICES.md.
   [pays, lat, lng, heading, panoId], pitch:0 et fov:82 fixes comme avant. */
const MIT_RAW = [
  ["GR", 38.09794071723781, 21.41533809512418, 50, "NcoJdB2eZSNI3pu2sXLn4Q"],
  ["PA", 7.720799390611916, -81.28070050453492, 329, "ZPIXWk_cxzptC30XZYUpTA"],
  ["BT", 27.59804593690841, 90.71850930387379, 120, "CYbZnXlvl7IDwGkQgfzCyg"],
  ["FI", 63.741796138345165, 23.45785769109084, 303, "H7QVL0Ev-hm1NbecZoVuPw"],
  ["RW", -1.4931212579717026, 29.608533461165358, 279, "DdR9r4DylfdLxD_39bvgfA"],
  ["UG", 0.3224683328104386, 32.58646422192249, 141, "wFeMmyo-5LBoh0vCkn1PQA"],
  ["IS", 65.86552508267427, -19.722893831713613, 300, "O3WoeGvcXXRAS-if7o4dOg"],
  ["EE", 59.38707156224448, 24.868470595974205, 180, "PIR_1kB_1pTQyA6xERxLOw"],
  ["SK", 48.47282480504339, 17.778202964775023, 205, "xkxgkVG6kvPJHi6MUxMi8g"],
  ["LV", 56.519173343108115, 27.067598799314485, 7, "qJWBL1Q2-zTRPGDiPvjM5Q"],
  ["MY", 2.8670119665411242, 112.81033237516255, 74, "EZdPvnifluXu9KXzEk4sEA"],
  ["IE", 52.36209687927321, -8.662582887081811, 57, "RXLZvJnGFND6SxI7SWGRVg"],
  ["UY", -34.04474280494128, -57.052976109246025, 288, "YKhdR2osy0x9bM_MEWua5A"],
  ["QA", 25.808204219083933, 51.368158223136135, 317, "qgx2ZAPXQmWKp8aC9XGz2Q"],
  ["LA", 15.116353248296825, 105.81926873293646, 5, "57zMZk9QFheynTsKQCLjeg"],
  ["NZ", -36.8857152509417, 174.7414486753889, 284, "jOyNDblXhFsKPz6WNyhgtA"],
  ["NG", 12.589125857277123, 4.969343267330353, 206, "MnZfWuM1xTA7mUVcA31Q7g"],
  ["EC", -1.0837965582824887, -80.68629956758294, 62, "5cPEnn8xHd_EbUjy3xUi-g"],
  ["CH", 47.056682914097905, 8.169505611429546, 329, "un9kx9-3gDs7p6I7Qf_AUQ"],
  ["SZ", -26.519788491646636, 31.374655127046722, 198, "cA-J5JZfjQaACLQUIeGT6w"],
  ["JO", 32.01398092438247, 35.87653648492203, 337, "y0vLB9mebe612xC6hVHQVQ"],
  ["SI", 46.63954534421098, 16.233991129831974, 81, "skbNF0AgVnRxUdKvLy2JgA"],
  ["BG", 42.370290404617634, 23.01200072810348, 305, "FL64KbWtxgShsUD6m3mmKw"],
  ["LK", 7.713678415617654, 80.00061063843755, 13, "a5tQSd0xHCB3QpWeFKFVbQ"],
  ["AT", 48.287828182714414, 16.330082965819507, 180, "--Q6k-dX_L1lITAsqgRWtQ"],
  ["SN", 14.2693909616509, -16.400863273311113, 30, "RZj1J8wfDbEYFsakBwWi-Q"],
  ["DE", 52.8292124159868, 7.425134802360592, 359, "t3bYaHpjrgbzHzfkSHgAOw"],
  ["CY", 34.8949855464069, 33.12263648481302, 50, "HhQlLT53GotFv_LqOs3b8g"],
  ["BE", 49.93259646642778, 5.1983998104247675, 47, "eMQ_nPJifbzbrc_q0OStmA"],
  ["PT", 39.858927947166, -7.4936459022197734, 266, "JF_d8WHzl1SOrAXZMcLuNQ"],
  ["LS", -28.897658462819813, 28.803572844774703, 191, "V9Z3k1IWoWX89nDeQcq2bQ"],
  ["ME", 43.24663154053162, 19.37869554324906, 179, "XB5m5NIQ2wCfJjukDT-RvA"],
  ["CR", 9.99238643656763, -83.06450544260684, 326, "v0JfEWMWzlyLqPN5-b3WBw"],
  ["GT", 13.926713783339046, -90.38934535079791, 191, "P6p8y3wzC73U8bOcYCyOGQ"],
  ["LU", 49.89694748578, 5.801207108108202, 243, "kuxTQQWHyly51WPsHW_O_Q"],
  ["HR", 43.92911659404249, 16.45996373419789, 229, "YfYvNiOgpDofeE76tUx-9w"],
  ["NL", 52.728632434730976, 4.967683604340568, 60, "aGNXJ0Xgp2_d0-9x4nd_hg"],
  ["BD", 25.11277262069851, 91.1940152580006, 17, "6HnPXYneUZMBj_OEFp3zQw"],
];

// Panoramas confirmés morts par balayage visuel manuel dans un navigateur
// (« Aucune image Street View disponible ») — jamais détectable en code, voir
// le commentaire de tête. Un id ici doit rester exclu même si le script est
// relancé sur un export GeoGuessr mis à jour qui le recontiendrait.
const KNOWN_DEAD_PANO_IDS = new Set([
  "CAoSLEFGMVFpcE5YMS1UcG5jZnRYT1BFTGZKdC1aV0x4MlRNM0ZLNGVWTjhRNTFJ", // gg-1375, Galápagos (-0.40, -90.71) — vérifié 2026-09-06, « Aucune image Street View disponible »
]);

function buildCountryIndex() {
  const geo = topojson.feature(worldTopology, worldTopology.objects.countries);
  return geo.features.map((feature) => {
    const rings = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates]
      : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const poly of rings) for (const ring of poly) for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const alpha2 = isoCountries.numericToAlpha2(feature.id) || null;
    return { rings, bbox: [minLng, minLat, maxLng, maxLat], alpha2 };
  });
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Parité paire-impaire sur l'ensemble des anneaux d'un polygone (extérieur +
// trous) : c'est ce qui soustrait correctement un lac ou une enclave sans se
// soucier du sens d'enroulement GeoJSON.
function pointInPolygon(lng, lat, rings) {
  let inside = false;
  for (const ring of rings) if (pointInRing(lng, lat, ring)) inside = !inside;
  return inside;
}

function countryAt(lng, lat, index) {
  for (const entry of index) {
    const [minLng, minLat, maxLng, maxLat] = entry.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    if (entry.rings.some((rings) => pointInPolygon(lng, lat, rings))) return entry.alpha2;
  }
  return null;
}

function normalizeHeading(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((((n % 360) + 360) % 360) * 100) / 100;
}

function clampPitch(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(-90, Math.min(90, n)) * 100) / 100;
}

// Même référentiel que google.maps.StreetViewPanorama.zoom (0 = 180° de
// champ) : la plage observée dans l'export (0 à ~3,1) le confirme. Bornes
// documentées de Maps Embed API pour fov : 10 à 100.
function fovFromZoom(zoom) {
  const z = Number.isFinite(Number(zoom)) ? Number(zoom) : 1;
  const raw = 180 / 2 ** z;
  return Math.round(Math.max(10, Math.min(100, raw)) * 100) / 100;
}

function serializeEntry(entry) {
  const country = entry.country ? `"${entry.country}"` : "null";
  const panoId = entry.panoId ? JSON.stringify(entry.panoId) : "null";
  return `  { id: "${entry.id}", country: ${country}, lat: ${entry.lat}, lng: ${entry.lng}, heading: ${entry.heading}, pitch: ${entry.pitch}, fov: ${entry.fov}, panoId: ${panoId} },`;
}

function main() {
  if (!fs.existsSync(SOURCE_JSON)) {
    console.error(`Introuvable : ${SOURCE_JSON}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  console.log(`Source : ${raw.length} lieux dans ${SOURCE_JSON}`);

  const countryIndex = buildCountryIndex();

  const accepted = MIT_RAW.map(([country, lat, lng, heading, panoId], index) => ({
    id: `mit-${String(index + 1).padStart(2, "0")}`,
    country, lat, lng, heading, pitch: 0, fov: 82, panoId,
  }));
  const acceptedPanoIds = new Set(accepted.map((entry) => entry.panoId).filter(Boolean));

  let dupCoord = 0, dupPano = 0, resolvedCountry = 0, rejectedCountry = 0, invalid = 0, dead = 0;
  let seq = 0;
  for (const item of raw) {
    const lat = Number(item.lat), lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) { invalid++; continue; }
    if (item.panoId && KNOWN_DEAD_PANO_IDS.has(item.panoId)) { dead++; continue; }
    if (item.panoId && acceptedPanoIds.has(item.panoId)) { dupPano++; continue; }
    // O(n²) sur ~1700 lieux : quelques millions de haversine, sous la seconde.
    const isNear = accepted.some((entry) => haversineDistanceKm(entry, { lat, lng }) < 0.03);
    if (isNear) { dupCoord++; continue; }

    let country = countryAt(lng, lat, countryIndex);
    if (country) {
      if (COUNTRY_BY_CODE[country]) resolvedCountry++;
      else { rejectedCountry++; country = null; } // hors du vocabulaire Explorer : reste Pinpoint seul
    }

    seq += 1;
    const entry = {
      id: `gg-${String(seq).padStart(4, "0")}`,
      country,
      lat, lng,
      heading: normalizeHeading(item.heading),
      pitch: clampPitch(item.pitch),
      fov: fovFromZoom(item.zoom),
      panoId: item.panoId || null,
    };
    accepted.push(entry);
    if (entry.panoId) acceptedPanoIds.add(entry.panoId);
  }

  const withPano = accepted.filter((entry) => entry.panoId).length;
  const withCountry = accepted.filter((entry) => entry.country).length;
  console.log(`Rejetés — coordonnées invalides : ${invalid}, quasi-doublon (<30 m) : ${dupCoord}, panoId déjà vu : ${dupPano}, confirmé mort : ${dead}`);
  console.log(`Rattachement pays — résolu et admis : ${resolvedCountry}, résolu mais hors vocabulaire Explorer : ${rejectedCountry}`);
  console.log(`Total conservé : ${accepted.length} (dont ${withPano} avec panoId figé, ${withCountry} avec pays)`);

  const body = accepted.map(serializeEntry).join("\n");
  const output = `/* GÉNÉRÉ par tools/import-locations.mjs le ${new Date().toISOString().slice(0, 10)} — NE PAS ÉDITER À LA MAIN.
 * Régénérer : node tools/import-locations.mjs
 *
 * Deux provenances mélangées dans un seul tableau, distinguées par le
 * préfixe de id :
 *  - "mit-01".."mit-38"  : WorldGuessr (MIT, révision ef88928c), inchangés.
 *  - "gg-0001".."gg-NNNN" : carte personnelle de Guillaume, construite dans
 *    l'éditeur GeoGuessr (${raw.length} lieux collectés, ${accepted.length - MIT_RAW.length} conservés après
 *    déduplication). Provenance et méthode de rattachement pays dans
 *    THIRD_PARTY_NOTICES.md.
 *
 * country vaut null quand le point n'est rattachable à aucun pays du
 * vocabulaire GeoGuessr Explorer (countries.js) : le lieu reste utilisable
 * en Pinpoint, jamais proposé en mode Pays (voir locations.js,
 * locationOrder(seed, "country")).
 *
 * panoId vaut null pour la plupart des lieux importés depuis GeoGuessr :
 * Google résout alors le panorama au vol depuis lat/lng (voir
 * streetViewUrl, StreetViewFrame.js), exactement comme le fait GeoGuessr
 * pour la majorité de ses propres lieux.
 */

export const LOCATIONS_RAW = Object.freeze([
${body}
].map((entry) => Object.freeze(entry)));
`;
  fs.writeFileSync(OUT, output);
  console.log(`Écrit : ${OUT}`);
}

main();
