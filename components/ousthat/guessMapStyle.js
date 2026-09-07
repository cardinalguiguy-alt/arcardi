/*
 * 2026-09-07 (retour de Guillaume sur OpenTopoMap : « je veux voir les
 * labels, noms de pays, capitales, villes, rues, frontières, numéros de
 * route ») — remplace le style raster OpenTopoMap par un style MapLibre
 * VECTORIEL écrit à la main sur les tuiles OpenMapTiles de
 * tiles.openstreetmap.us (gratuit, sans compte ni clé — le même service
 * public qu'utilise le projet OpenStreetMap Americana pour ses propres
 * panneaux routiers, voir shieldLayer.js). ⚠️ Fournisseur DIFFÉRENT
 * d'OpenFreeMap (déjà utilisé pour la ferme) : même famille de service
 * (association à but non lucratif, gratuit pour un usage non commercial à
 * faible volume), mais un point de dépendance de plus, assumé.
 *
 * ⚠️ Piège vérifié en construisant ce fichier (2026-09-07) : le champ
 * "capital" du schéma OpenMapTiles n'est pas un booléen — 2 = capitale
 * nationale, 3/4/5/6 = diverses capitales régionales/d'État selon les pays.
 * Un simple `["has","capital"]` aurait mis en gras des préfectures.
 */
export const GUESS_MAP_SOURCE_ID = "ot-omt";

const OMT_TILES_URL = "https://tiles.openstreetmap.us/vector/openmaptiles.json";
export const GUESS_MAP_GLYPHS_URL = "https://tiles.openstreetmap.us/fonts/{fontstack}/{range}.pbf";
export const GUESS_MAP_SPRITE_URL = "/ousthat/shields/sprite";

export const GUESS_MAP_ATTRIBUTION = 'Données : © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributeurs · Tuiles : <a href="https://openstreetmap.us/our-work/tileservice/" target="_blank" rel="noopener">OpenStreetMap US</a> · Panneaux : <a href="https://americanamap.org" target="_blank" rel="noopener">OpenStreetMap Americana</a> (CC0)';

// Nom affiché = français si connu, sinon anglais, sinon la forme latine que
// le pays lui-même utilise (evite le cyrillique/CJK/arabe injouable sans
// les polices dédiées — voir shieldLayer.js), sinon le nom natif brut.
const LABEL_TEXT = ["coalesce", ["get", "name:fr"], ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

function roadColor(fill) {
  return { "line-color": fill };
}

export function buildGuessMapStyle(shieldLayer) {
  return {
    version: 8,
    glyphs: GUESS_MAP_GLYPHS_URL,
    sprite: GUESS_MAP_SPRITE_URL,
    sources: {
      [GUESS_MAP_SOURCE_ID]: {
        type: "vector",
        url: OMT_TILES_URL,
        attribution: GUESS_MAP_ATTRIBUTION,
      },
    },
    layers: [
      { id: "ot-bg", type: "background", paint: { "background-color": "#f4f1e9" } },
      {
        id: "ot-landcover-wood",
        type: "fill",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": "#d7e4c8", "fill-opacity": 0.7 },
      },
      {
        id: "ot-landcover-ice",
        type: "fill",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "ice"],
        paint: { "fill-color": "#f7fbff" },
      },
      {
        id: "ot-water",
        type: "fill",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "water",
        paint: { "fill-color": "#a9cfe6" },
      },
      {
        id: "ot-waterway",
        type: "line",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "waterway",
        paint: { "line-color": "#a9cfe6", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2] },
      },
      // Routes : casing (contour) puis fill (couleur), du plus gros au plus
      // petit calibre — l'ordre de dessin fait la superposition des
      // croisements, comme partout ailleurs dans le style.
      ...["motorway", "trunk", "primary", "secondary", "tertiary"].flatMap((cls, i) => {
        const minzoom = [3, 4, 7, 9, 11][i];
        const casing = ["#c0703f", "#c98a4a", "#d9a94f", "#c9b98a", "#c9c2ab"][i];
        const fill = ["#e8a26a", "#f0bd77", "#f7d98a", "#fdf3c8", "#ffffff"][i];
        return [
          {
            id: `ot-road-casing-${cls}`,
            type: "line",
            source: GUESS_MAP_SOURCE_ID,
            "source-layer": "transportation",
            minzoom,
            filter: ["==", ["get", "class"], cls],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": casing, "line-width": ["interpolate", ["linear"], ["zoom"], minzoom, i === 0 ? 1.4 : 0.9, 16, i === 0 ? 9 : 6] },
          },
          {
            id: `ot-road-fill-${cls}`,
            type: "line",
            source: GUESS_MAP_SOURCE_ID,
            "source-layer": "transportation",
            minzoom,
            filter: ["==", ["get", "class"], cls],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": fill, "line-width": ["interpolate", ["linear"], ["zoom"], minzoom, i === 0 ? 0.9 : 0.5, 16, i === 0 ? 6.5 : 4.2] },
          },
        ];
      }),
      {
        id: "ot-boundary-state",
        type: "line",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "boundary",
        minzoom: 4,
        filter: ["==", ["get", "admin_level"], 4],
        paint: { "line-color": "#b9ab8c", "line-width": 0.7, "line-dasharray": [2, 2] },
      },
      {
        id: "ot-boundary-country",
        type: "line",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        layout: { "line-join": "round" },
        paint: {
          "line-color": "#8a6d4f",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1.4, 12, 2.4],
          "line-dasharray": ["step", ["zoom"], ["literal", [1]], 3, ["literal", [4, 2]]],
        },
      },
      {
        id: "ot-road-name",
        type: "symbol",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "transportation_name",
        minzoom: 11,
        filter: ["all", ["!", ["has", "route_1_ref"]], ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]]],
        layout: {
          "text-field": LABEL_TEXT,
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "symbol-placement": "line",
          "text-pitch-alignment": "viewport",
          "text-rotation-alignment": "map",
        },
        paint: { "text-color": "#5b4c36", "text-halo-color": "#f4f1e9", "text-halo-width": 1.2 },
      },
      // Numéros de route : au-dessus du ruban de la route et de son nom,
      // sous les libellés de lieux.
      shieldLayer,
      {
        id: "ot-place-town",
        type: "symbol",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "place",
        minzoom: 8,
        filter: ["in", ["get", "class"], ["literal", ["town", "village"]]],
        layout: {
          "text-field": LABEL_TEXT,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 14, 13],
        },
        paint: { "text-color": "#3a2f21", "text-halo-color": "#f4f1e9", "text-halo-width": 1.3 },
      },
      {
        id: "ot-place-city",
        type: "symbol",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "place",
        minzoom: 3,
        filter: ["all", ["==", ["get", "class"], "city"], ["any", ["!", ["has", "capital"]], [">", ["get", "capital"], 2]]],
        layout: {
          "text-field": LABEL_TEXT,
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 12, 14, 16],
        },
        paint: { "text-color": "#2c2416", "text-halo-color": "#f4f1e9", "text-halo-width": 1.4 },
      },
      // Capitale nationale (capital=2) : point plein + libellé toujours en
      // gras, visible dès le zoom monde — c'est l'info que Guillaume a
      // nommée explicitement.
      {
        id: "ot-place-capital-dot",
        type: "circle",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "place",
        filter: ["all", ["==", ["get", "class"], "city"], ["==", ["get", "capital"], 2]],
        paint: { "circle-radius": 3.5, "circle-color": "#8a2f1f", "circle-stroke-color": "#f4f1e9", "circle-stroke-width": 1.2 },
      },
      {
        id: "ot-place-capital",
        type: "symbol",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "place",
        filter: ["all", ["==", ["get", "class"], "city"], ["==", ["get", "capital"], 2]],
        layout: {
          "text-field": LABEL_TEXT,
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 6, 13, 14, 17],
          "text-offset": [0, 0.9],
          "text-anchor": "top",
        },
        paint: { "text-color": "#5c1c10", "text-halo-color": "#f4f1e9", "text-halo-width": 1.5 },
      },
      {
        id: "ot-place-country",
        type: "symbol",
        source: GUESS_MAP_SOURCE_ID,
        "source-layer": "place",
        maxzoom: 7,
        filter: ["==", ["get", "class"], "country"],
        layout: {
          "text-field": LABEL_TEXT,
          "text-font": ["Noto Sans Bold"],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.08,
          "text-size": ["interpolate", ["linear"], ["zoom"], 0, 10, 3, 13, 6, 16],
        },
        paint: { "text-color": "#3a2f21", "text-halo-color": "#f4f1e9", "text-halo-width": 1.4 },
      },
    ],
  };
}
