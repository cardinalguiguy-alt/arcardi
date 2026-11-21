/* =============================================================================
   rosee.js — LA ROSÉE DU MATIN (2026-11-21), PUR.
   -----------------------------------------------------------------------------
   Un ajout de l'après-midi libre du 2026-11-21 (« be free, sois inventif »). Après une nuit claire, l'herbe est trempée de rosée : elle
   prend un voile argenté, des gouttes s'allument au soleil bas — et ceux qui marchent dedans y laissent un chemin plus sombre, l'herbe
   couchée et essuyée, qu'on suit des yeux jusqu'à ce que le soleil sèche tout. C'est le matin qu'on lit sur le sol, l'équivalent doux
   de la gelée blanche (meteo.js § 10), qu'elle prolonge : quand la gelée fond au soleil, ce qui reste est de la rosée.
   · `dewOf` rend { sun, shade } (0..1), comme `frostOf` : la rosée au soleil sèche d'abord, celle de l'ombre des murs, des haies et des
     arbres tient une heure et demie de plus (`neige.js`, `renderChunk`, passe de l'une à l'autre au pixel).
   · Elle se pose par une NUIT CLAIRE (le ciel de l'aube compte, pas celui de 9 h — même règle que la gelée), pas sous la pluie (le sol
     mouillé, c'est `pluie.js`), ni la neige, ni la grêle ; le vent la réduit (il sèche et empêche le dépôt).
   · Pleine jusqu'à une heure et quart après le lever du soleil (jamais avant 7 h 30 : le jour du jeu commence à 6 h), puis elle sèche.
   · Ce qu'elle DESSINE et les PAS qu'on y laisse vivent dans le champ de la neige (`neige.js` : `renderChunk`, `makeWalkers`) — la même
     couche, les mêmes parcelles, les mêmes marcheurs : chaque client creuse ce qu'il voit marcher (local, rien ne circule, §3).
   Désactivable : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.dew`, FermeGame.js). Banc : `tools/verify-rosee.mjs`.
   ========================================================================== */

export const ROSEE = {
  FULL_AFTER_RISE: 1.25,   // h : pleine jusqu'à cette heure après le lever du soleil…
  MIN_FULL: 7.5,           // … et jamais avant 7 h 30
  DRY_SUN: 1.6,            // h : le temps de sécher au soleil
  DRY_SHADE: 3.1,          // h : à l'ombre
  SEASON: { spring: 1, summer: 0.85, autumn: 1, winter: 0.8 },
  WIND: 0.6,               // le vent plein retire 60 % du dépôt
};
const ZERO = { sun: 0, shade: 0 };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

/* `hour` l'heure de jeu, `sunrise` l'heure du lever (meteo.js, `sunHoursOfTag`), `seasonTag` la saison, `W` le ciel de l'instant,
   `Wdawn` celui de l'aube (ou null), `snowCm` la neige au sol. */
export function dewOf(hour, sunrise, seasonTag, W, Wdawn, snowCm) {
  if (!W || (W.rain || 0) > 0.05 || (W.snow || 0) > 0.05 || (W.hail || 0) > 0.05 || (snowCm || 0) > 0.3) return ZERO;
  if (!(hour >= 4 && hour < 14)) return ZERO;
  const sky = Wdawn || W;
  const clear = Math.max(0, 1 - 1.6 * (sky.dark || 0));
  const base = clear * (ROSEE.SEASON[seasonTag] == null ? 1 : ROSEE.SEASON[seasonTag]) * (1 - ROSEE.WIND * clamp01(W.wind || 0));
  if (base <= 0) return ZERO;
  const t0 = Math.max((sunrise || 6) + ROSEE.FULL_AFTER_RISE, ROSEE.MIN_FULL);
  const left = (span) => (hour <= t0 ? 1 : smooth(clamp01(1 - (hour - t0) / span)));
  return { sun: base * left(ROSEE.DRY_SUN), shade: base * left(ROSEE.DRY_SHADE) };
}
