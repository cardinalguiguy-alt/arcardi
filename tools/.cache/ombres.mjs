/* =============================================================================
   ombres.js — LES OMBRES PORTÉES DU SOLEIL (2026-10-05, nuit), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « les ombres portées doivent être calculées en fonction de l'heure
   de la journée, s'allonger quand le soleil est censé se lever ou se coucher.
   Pas figées. » Jusqu'ici, tout ce qui se tient debout posait une ombre de
   CONTACT (une ellipse, lumière d'en haut) et seule la neige portait une ombre
   orientée — figée au nord-ouest, à midi pour toujours.

   LE MODÈLE (un soleil de jeu, pas d'astronome) :
   · il se lève à l'EST et se couche à l'OUEST, aux heures du ciel
     (`sunHoursOfTag`, meteo.js : la même table que l'aube, la fonte, la gelée) —
     l'ombre part vers l'OUEST au matin, vers l'EST le soir ;
   · à midi elle tombe vers le BAS de l'écran, penchée au sud-EST (`NOON_LEAN`) :
     la lumière PEINTE dans tous les sprites vient du nord-ouest (leurs arêtes
     claires sont à gauche), et une ombre qui le contredirait à midi ferait mentir
     chaque dessin. C'est un soleil qui passe « derrière » la vue, comme dans tous
     les jeux vus de dessus : son ombre se VOIT, devant les choses ;
   · sa HAUTEUR suit un arc (`ELEV_MAX` par saison : haut l'été, bas l'hiver) et
     la LONGUEUR de l'ombre est 1/tan(hauteur) — courte à midi l'été, longue tout
     l'hiver, très longue au lever et au coucher (bornée à `K_MAX` : au-delà, elle
     sortirait de ce que l'écran dessine et apparaîtrait d'un coup au bord), et plus
     DOUCE à mesure qu'elle s'allonge (`LONG_FADE`) ;
   · sa FORCE suit le ciel : nette par beau temps, pâle sous les nuages, nulle
     sous la pluie dense, la neige qui tombe et la nuit ; elle naît et meurt avec
     un soleil rasant (`ELEV_FADE`) au lieu de s'allumer d'un coup à l'aube (§4 :
     une transition qui se voit se fait par une durée, pas par un seuil).
   Ce fichier ne sait rien du dessin : il rend, pour un instant, le CISAILLEMENT
   (`sx`, `sy` : de combien un point à `h` px de haut glisse au sol, en px, par
   px de hauteur) et l'opacité. Le jeu projette chaque silhouette debout par ce
   cisaillement autour de sa ligne de sol, toutes dans UN tampon (deux ombres qui
   se recouvrent ne font pas une ombre plus noire), posé une fois sur le sol.
   `tools/verify-ombres.mjs` le joue sur une journée de chaque saison.
   ⚠️ AUCUNE HORLOGE LUE : l'heure, les bornes du jour et le temps sont passés.
   Rien ne circule (§3) : chaque client calcule le même soleil.
   ========================================================================== */

export const OMBRE = {
  /* ⚠️ UN SOLEIL D'HIVER STYLISÉ, PAS ASTRONOMIQUE : à 26° (premier jet, la hauteur vraie d'un midi de janvier) les
     maisons jetaient des dalles sombres de quatorze cases sur la rue et sur la glace — vu en jeu, elles mangeaient
     l'image. 32° garde l'ombre d'hiver nettement plus longue que celle d'été (×1,6 contre ×0,6 à midi). */
  ELEV_MAX: { summer: 60, spring: 47, autumn: 40, winter: 32 },   // hauteur du soleil à midi, en degrés
  ELEV_FADE: [1.5, 9],   // degrés : sous le premier, pas d'ombre ; au-delà du second, toute sa force
  ELEV_MIN: 6,           // degrés : la hauteur sous laquelle la longueur cesse de croître (avec K_MAX, le plafond)
  K_MAX: 1.8,            // longueur maximale, en hauteurs de l'objet (2,2 au premier jet : des dalles, vu en jeu)
  LONG_FADE: 0.4,        // une ombre longue est plus douce (soleil bas, voilé par l'air) : jusqu'à −40 % d'opacité
  KY: 0.8,               // le raccourci du sol (vue plongeante, pas zénithale) — celui des ombres de la neige
  NOON_LEAN: 0.28,       // radians : à midi, l'ombre penche vers le sud-est (lumière peinte du nord-ouest)
  ALPHA: 0.30,           // l'ombre d'un beau midi, sur le tampon des silhouettes
  RGB: [30, 40, 82],     // un bleu de ciel assombri : sur la neige un bleu, sur l'herbe un vert froid
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* L'ombre du soleil à l'heure `hour` (heures de jeu, 6 à 26), pour une journée qui va de `rise` à `set`.
   `season` : la clé de saison ("winter", …) ; `wx` : le temps ({ dark, snow, rain }, meteo.js), facultatif.
   Rend null la nuit, sinon { sx, sy, a, k, elev, th } : un point à h px au-dessus de sa ligne de sol tombe
   à (h·sx, h·sy) px d'elle ; `a` l'opacité ; `k` la longueur (× hauteur) ; `elev` en degrés ; `th` l'angle
   de l'ombre à l'écran (0 = vers l'est, π/2 = vers le bas). */
export function sunShadow(hour, rise, set, season, wx) {
  if (!(set > rise)) return null;
  const u = (hour - rise) / (set - rise);
  if (u <= 0 || u >= 1) return null;
  const s = Math.sin(Math.PI * u);
  const elev = (OMBRE.ELEV_MAX[season] || OMBRE.ELEV_MAX.spring) * s;
  const [f0, f1] = OMBRE.ELEV_FADE;
  const fade = clamp01((elev - f0) / (f1 - f0));
  if (fade <= 0) return null;
  const k = Math.min(OMBRE.K_MAX, 1 / Math.tan(Math.max(OMBRE.ELEV_MIN, elev) * Math.PI / 180));
  const th = Math.PI * (1 - u) - OMBRE.NOON_LEAN * s;
  const clear = wx
    ? clamp01(1 - 1.5 * (wx.dark || 0)) * clamp01(1 - 2.5 * (wx.snow || 0)) * clamp01(1 - 1.6 * (wx.rain || 0))
    : 1;
  const longK = Math.max(0, Math.min(1, (k - 0.8) / (OMBRE.K_MAX - 0.8)));
  const a = OMBRE.ALPHA * fade * clear * (1 - OMBRE.LONG_FADE * longK);
  return { sx: Math.cos(th) * k, sy: Math.sin(th) * k * OMBRE.KY, a, k, elev, th };
}

/* La matrice (canvas `setTransform`) qui projette au sol un dessin fait en coordonnées du MONDE, autour de la
   ligne de sol `base` (y monde), dans un tampon dont le coin est (ox, oy) dans le monde. Un point (x, y) du dessin,
   à h = base − y au-dessus du sol, arrive en (x + h·sx − ox, base + h·sy − oy). */
export function shearMatrix(sh, base, ox, oy) {
  return [1, 0, -sh.sx, -sh.sy, sh.sx * base - ox, base * (1 + sh.sy) - oy];
}
