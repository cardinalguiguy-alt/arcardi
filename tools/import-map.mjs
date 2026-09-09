/* =============================================================================
   import-map.mjs — AJOUTER UNE CARTE DE PANORAMAS (2026-09-06).
   -----------------------------------------------------------------------------
   Généralisation de import-locations.mjs (qui reste tel quel : c'est lui qui
   a produit "Beautiful World", la carte historique, et il continue de faire
   foi pour elle). Ce script sert à toute carte SUIVANTE, à partir d'un export
   GeoGuessr fourni par Guillaume (même format que celui déjà utilisé :
   tableau de {lat, lng, heading, pitch, zoom, panoId?}).

   Ce qu'il fait, à l'identique de import-locations.mjs : rattachement pays
   hors ligne par point-dans-polygone (Natural Earth via world-atlas), même
   conversion zoom→fov, mêmes bornes. Ce qu'il NE fait PAS : dédoublonner
   contre les autres cartes déjà enregistrées — deux cartes qui partagent un
   même lieu ne sont pas un doublon à corriger, ce sont deux catalogues
   indépendants par construction (maps.js). Le dédoublonnage reste interne à
   la carte importée (quasi-doublons <30 m, panoId déjà vu dans CE fichier).

   Usage :
     node tools/import-map.mjs <source.json> <id-de-carte> "<Nom affiché>"
   Exemple :
     node tools/import-map.mjs ~/Downloads/europe.json europe "Europe"

   <id-de-carte> devient le préfixe de chaque lieu (europe-0001, …) : il DOIT
   être unique parmi les cartes déjà enregistrées dans maps.js, en kebab-case.

   Une fois le fichier généré, DEUX étapes manuelles restent (ce script ne
   les fait pas — ce sont des fichiers écrits à la main, pas régénérés) :
     1. components/ousthat/maps.js : importer LOCATIONS_RAW de ce fichier et
        ajouter une entrée à MAPS.
     2. components/ousthat/rules.js : ajouter <id-de-carte> à GAME_MAP_IDS.
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

const [, , sourceArg, mapIdArg, nameArg] = process.argv;
if (!sourceArg || !mapIdArg) {
  console.error('Usage : node tools/import-map.mjs <source.json> <id-de-carte> "<Nom affiché>"');
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(mapIdArg)) {
  console.error(`Id de carte invalide : "${mapIdArg}" — kebab-case attendu (lettres, chiffres, tirets), ex. "europe" ou "us-states".`);
  process.exit(1);
}
const SOURCE_JSON = path.resolve(sourceArg);
const MAP_ID = mapIdArg;
const MAP_NAME = nameArg || mapIdArg;
const OUT = path.join(ROOT, "components", "ousthat", `mapData.${MAP_ID}.js`);

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
// champ). Bornes documentées de Maps Embed API pour fov : 10 à 100.
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
  if (fs.existsSync(OUT)) {
    console.log(`⚠️  ${OUT} existe déjà — écrasement (régénération de la carte "${MAP_ID}").`);
  }
  const parsed = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  // L'export du fabricant de cartes (map-making.app) enveloppe le tableau
  // dans { name, customCoordinates: [...] } au lieu du tableau nu attendu
  // jusqu'ici — les deux formes sont acceptées, jamais devinées en silence.
  const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.customCoordinates) ? parsed.customCoordinates : null;
  if (!raw) {
    console.error(`Format inattendu dans ${SOURCE_JSON} : ni tableau nu, ni { customCoordinates: [...] }.`);
    process.exit(1);
  }
  console.log(`Source : ${raw.length} lieux dans ${SOURCE_JSON}`);

  const countryIndex = buildCountryIndex();
  const accepted = [];
  const acceptedPanoIds = new Set();

  let dupCoord = 0, dupPano = 0, resolvedCountry = 0, rejectedCountry = 0, invalid = 0;
  let seq = 0;
  for (const item of raw) {
    const lat = Number(item.lat), lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90) { invalid++; continue; }
    if (item.panoId && acceptedPanoIds.has(item.panoId)) { dupPano++; continue; }
    // O(n²) : quelques millions de haversine sur un import de cette taille,
    // sous la seconde — voir import-locations.mjs pour la même remarque.
    const isNear = accepted.some((entry) => haversineDistanceKm(entry, { lat, lng }) < 0.03);
    if (isNear) { dupCoord++; continue; }

    let country = countryAt(lng, lat, countryIndex);
    if (country) {
      if (COUNTRY_BY_CODE[country]) resolvedCountry++;
      else { rejectedCountry++; country = null; } // hors du vocabulaire Explorer : reste Pinpoint seul
    }

    seq += 1;
    const entry = {
      id: `${MAP_ID}-${String(seq).padStart(4, "0")}`,
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
  console.log(`Rejetés — coordonnées invalides : ${invalid}, quasi-doublon (<30 m) : ${dupCoord}, panoId déjà vu : ${dupPano}`);
  console.log(`Rattachement pays — résolu et admis : ${resolvedCountry}, résolu mais hors vocabulaire Explorer : ${rejectedCountry}`);
  console.log(`Total conservé : ${accepted.length} (dont ${withPano} avec panoId figé, ${withCountry} avec pays)`);

  const body = accepted.map(serializeEntry).join("\n");
  const output = `/* GÉNÉRÉ par tools/import-map.mjs le ${new Date().toISOString().slice(0, 10)} — NE PAS ÉDITER À LA MAIN.
 * Régénérer : node tools/import-map.mjs <source.json> ${MAP_ID} "${MAP_NAME}"
 *
 * Carte "${MAP_NAME}" (id "${MAP_ID}") — ${accepted.length} lieux, voir
 * components/ousthat/maps.js pour son enregistrement dans le jeu.
 *
 * country vaut null quand le point n'est rattachable à aucun pays du
 * vocabulaire GeoGuessr Explorer (countries.js) : le lieu reste utilisable
 * en Pinpoint, jamais proposé en mode Pays (voir locations.js,
 * locationOrder(seed, "country", mapId)).
 *
 * panoId vaut null la plupart du temps : Google résout alors le panorama au
 * vol depuis lat/lng (voir streetViewUrl, StreetViewFrame.js).
 */

export const LOCATIONS_RAW = Object.freeze([
${body}
].map((entry) => Object.freeze(entry)));
`;
  fs.writeFileSync(OUT, output);
  console.log(`Écrit : ${OUT}`);
  console.log(`\nIl reste DEUX étapes manuelles :`);
  console.log(`  1. components/ousthat/maps.js : importer LOCATIONS_RAW de "${path.basename(OUT)}" et l'ajouter à MAPS.`);
  console.log(`  2. components/ousthat/rules.js : ajouter "${MAP_ID}" à GAME_MAP_IDS.`);
}

main();
