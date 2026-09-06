/*
 * Registre des CARTES de panoramas (2026-09-06). Une carte est un
 * sous-ensemble nommé du catalogue ; « Beautiful World » est la seule à ce
 * jour et couvre tout le stock existant (locationsData.js).
 *
 * Ajouter une carte future (JSON fourni par Guillaume, même format que
 * l'export GeoGuessr déjà utilisé) :
 *   1. node tools/import-map.mjs <source.json> <id> "<Nom affiché>"
 *      → écrit components/ousthat/mapData.<id>.js (généré, ne pas éditer).
 *   2. Importer ce fichier ici et ajouter une entrée à MAPS.
 *   3. Ajouter <id> à GAME_MAP_IDS dans rules.js.
 * Rien d'autre : locations.js, le setup et les bancs suivent le registre.
 */
import { LOCATIONS_RAW as BEAUTIFUL_WORLD_LOCATIONS } from "./locationsData";

export const MAPS = Object.freeze([
  { id: "beautiful-world", name: "Beautiful World", icon: "🌍", locations: BEAUTIFUL_WORLD_LOCATIONS },
]);

export const MAP_BY_ID = Object.freeze(Object.fromEntries(MAPS.map((map) => [map.id, map])));
