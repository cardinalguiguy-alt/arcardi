/*
 * 2026-09-07 — le SEUL morceau du dépôt qui vienne d'ailleurs texte pour
 * texte : c'est la couche « shield » d'OpenStreetMap Americana
 * (github.com/osm-americana/openstreetmap-americana, CC0, donc librement
 * réutilisable), traduite en JS simple (le dépôt n'a pas de TypeScript).
 * Elle lit les champs route_1_network/route_1_ref/… posés par les tuiles
 * OpenMapTiles de tiles.openstreetmap.us — jusqu'à HUIT itinéraires
 * concurrents sur un même tronçon (une route nationale qui porte aussi un
 * numéro d'Route Européenne, par exemple) — et fabrique pour chacun un nom
 * d'image "shield\n<réseau>\n<numéro>\n<nom>\n" : c'est CE nom que
 * @americana/maplibre-shield-generator intercepte via l'événement MapLibre
 * "styleimagemissing" pour dessiner le panneau à la volée (shieldRenderer.js).
 * ⚠️ Piège hérité du projet d'origine, donc à ne pas re-remarquer : le champ
 * "color" dans orderedRouteAttributes n'est PAS la couleur du panneau (celle-
 * ci vient de shields.json, par réseau) — c'est une couleur de secours que
 * porte parfois la relation OSM elle-même (rare).
 */
const ROUTE_ATTRIBUTES = ["network", "ref", "name", "color"];
const MAX_CONCURRENT_ROUTES = 8;

function imageNameExpression(routeIndex) {
  const concat = ["concat", "shield"];
  for (const attr of ROUTE_ATTRIBUTES) {
    concat.push("\n");
    concat.push(["coalesce", ["get", `route_${routeIndex}_${attr}`], ""]);
  }
  return concat;
}

function routeConcurrency(routeIndex) {
  return [
    "case",
    ["any", ...ROUTE_ATTRIBUTES.map((attr) => ["has", `route_${routeIndex}_${attr}`])],
    ["image", imageNameExpression(routeIndex)],
    ["literal", ""],
  ];
}

// Reconstruit {network, ref, name, color, imageName} à partir du nom d'image
// que routeConcurrency() a fabriqué — c'est ce que le générateur de panneaux
// appelle pour savoir QUOI dessiner.
export function parseShieldImageName(imageName) {
  const lines = imageName.split("\n");
  lines.shift(); // "shield"
  const parsed = Object.fromEntries(ROUTE_ATTRIBUTES.map((attr, i) => [attr, lines[i]]));
  parsed.imageName = imageName;
  return parsed;
}

export const shieldRouteParser = {
  parse: parseShieldImageName,
  format: (network, ref, name) => `shield\n${network}\n${ref}\n${name}\n`,
};

export const shieldImagePredicate = (imageId) => !!imageId && imageId.startsWith("shield");

// Sur les relations de randonnée/cyclisme, network=* décrit la PORTÉE du
// réseau (local/régional/national/international), pas un réseau routier —
// exclu ici pour ne jamais leur chercher un panneau routier.
export const shieldNetworkPredicate = (network) => !/^[lrni][chimpw]n$/.test(network);

const shieldTextField = ["format"];
for (let i = 1; i <= MAX_CONCURRENT_ROUTES; i++) shieldTextField.push(routeConcurrency(i));

// La police ne sert qu'aux CHIFFRES/LETTRES du numéro — la forme du panneau
// est un dessin, pas du texte — donc "Noto Sans" (servi par
// tiles.openstreetmap.us, seul fournisseur de glyphes gratuit et sans compte
// trouvé qui couvre notre alphabet) convient aussi bien que la police dédiée
// du projet d'origine, qu'il aurait fallu héberger nous-mêmes pour rien.
export function makeShieldLayer(sourceId) {
  return {
    id: "ot-highway-shield",
    type: "symbol",
    source: sourceId,
    "source-layer": "transportation_name",
    layout: {
      "text-rotation-alignment": "viewport-glyph",
      "text-font": ["Noto Sans Bold"],
      "text-field": shieldTextField,
      "text-anchor": "center",
      "text-letter-spacing": 0.6,
      "symbol-placement": "line",
      "text-max-angle": 180,
      "text-pitch-alignment": "viewport",
      "symbol-sort-key": ["match", ["get", "class"], "motorway", 0, "trunk", 1, "primary", 2, "secondary", 3, "tertiary", 4, 5],
    },
    paint: {
      "text-opacity": [
        "step",
        ["zoom"],
        ["match", ["get", "class"], "motorway", 1, 0],
        8,
        ["match", ["get", "class"], ["motorway", "trunk"], 1, 0],
        10,
        ["match", ["get", "class"], ["motorway", "trunk", "primary"], 1, 0],
        12,
        ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary"], 1, 0],
        14,
        1,
      ],
    },
    filter: ["any", ...ROUTE_ATTRIBUTES.map((attr) => ["has", `route_1_${attr}`])],
  };
}
