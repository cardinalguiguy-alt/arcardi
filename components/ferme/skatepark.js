/* =============================================================================
   skatepark.js — LE SKATEPARK DE LA PLACE (2026-10-11), PUR : SON RELIEF.
   -----------------------------------------------------------------------------
   Guillaume : « la physique du skatepark doit être ULTRA soignée, je veux être autant bluffé que pour la patinoire » ;
   « une idée de profondeur comparable avec la patinoire, il ne faut pas que ça ressemble à de la 2D » ; « anticiper la
   fluidité de la circulation ». Décidé avec lui (2026-10-11) : le park occupe le dallage de la place AU PRINTEMPS (l'hiver
   y met la patinoire, l'été des jeux d'eau, l'automne le festival d'Halloween) ; modules en BOIS CLAIR SUR STRUCTURE
   D'ACIER (un park modulaire, monté et démonté par une équipe en 3 h — d'où les soudeurs et les engins du chantier) ;
   piétons admis ; montures louées sur place, on ne sort pas du park en roulant.

   CE FICHIER EST LE RELIEF ET RIEN D'AUTRE : la hauteur, la pente et la matière en tout point (`parkSurf`), les
   garde-corps et barrières, les rails et arêtes de glisse, la règle de marche. Ni dessin (`skateparkArt.js`), ni jeu.
   La PHYSIQUE des montures viendra le lire (étape 2) — d'où une surface CONTINUE, analytique, et pas une grille de cases.

   ⚠️⚠️ CE QUI EST UN RELIEF ICI ET CE QUI NE L'EST PAS :
     · un RELIEF (`h(x, y)`, une seule hauteur par point vu de dessus) : les courbes, plateformes, tremplins, plans inclinés,
       caisses, marches. Le dessin le projette en 3/4 et l'éclaire ; la marche et (bientôt) la physique le lisent ;
     · PAS un relief : les rails, garde-corps et barrières (des TUBES, minces) — ce sont des segments, avec leur hauteur.
       Les mettre dans `h` ferait d'un rail un mur d'une case de large pour la marche, et une marche d'escalier pour le dessin.
   ⚠️ UNE GRANDEUR DE DESSIN N'ENTRE PAS DANS LA COLLISION (§4) : `liftPx` (le pixel d'image) et `heightAt` (la hauteur,
   en cases) sont deux fonctions ; la clé de tri, elle, ne lit ni l'une ni l'autre (le relief est un décalage d'image, comme
   le dos d'âne des ponts — voir `archPxTown`, FermeGame.js, zip 441).
   ⚠️ LA VUE EST EN 3/4 SANS FUYANTE LATÉRALE : une face verticale tournée vers l'est ou l'ouest ne se voit pas, une face
   tournée vers le nord non plus. D'où le plan : les grandes courbes regardent le SUD, l'EST ou l'OUEST ; rien de haut ne
   monte vers le sud (sa face se cacherait derrière son propre rebord).
   ⚠️ AUCUN TIRAGE, AUCUNE HORLOGE : tout se déduit des constantes. Les autres joueurs ne reçoivent que la position ; la
   hauteur sous leurs pieds se LIT ici (§3 : ce qui se déduit ne se diffuse pas).
   `tools/verify-skatepark.mjs` tient la géométrie (continuité, angles de coping, pentes praticables, accès, enceinte) ;
   `tools/render-skatepark.mjs` la regarde.
   ========================================================================== */
import * as C from "./fermeConstants";

/* 2026-10-12 — OUVERT (Guillaume : « patinoire en hiver, qui transitionne vers le skatepark avec les manutentions, donc au printemps il
   faut le skatepark »). Faux : le printemps garde la place vide, et `?skatepark=1` le pose chez soi (FermeGame.js, `townSeasonKindNow`). */
export const PARK_OPEN = true;

/* L'EMPRISE : le dallage de la place, le MÊME que celui de la patinoire (`TOWN_RINK` en dérive aussi) — 21 × 22 cases de
   pierre, x 40-60 / y 76-97. ⚠️ Dérivé de `TOWN_MARKET`, jamais recopié : si la place bouge, le park la suit. */
const MK = C.TOWN_MARKET;
export const PARK = { x0: MK.x + 2, y0: MK.y + 2, w: MK.w - 5, h: MK.h - 4 };
/* Ce que le relief déborde du dallage : l'escalier de la galerie descend sur l'allée de terre du nord (deux cases). */
export const PARK_BOUNDS = { u0: -0.5, v0: -2.2, u1: PARK.w + 0.5, v1: PARK.h + 0.5 };

/* ── LA MARCHE (un piéton, pas une monture) ──
   `STEP` : la plus haute marche qu'on franchit en marchant (30 cm, la marge haute d'une marche d'escalier) — on monte sur
   le plat surélevé de la mini-rampe, pas sur une plateforme. `SLOPE` : la pente la plus raide qu'on gravit à pied (tan 30°) —
   les tremplins, le plan incliné, le pied des courbes ; jamais le haut d'une courbe. `FENCE_R` : la demi-épaisseur d'un
   garde-corps pour la collision (le tube est fin ; c'est le corps qui ne passe pas). */
export const WALK = { STEP: 0.26, DOWN: 0.55, SLOPE: 0.58, FENCE_R: 0.14 };

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES MODULES — coordonnées LOCALES (u vers l'est, v vers le sud, en cases depuis le coin nord-ouest du dallage).
   ╚════════════════════════════════════════════════════════════════════════════
   Le plan (validé sur maquette, 2026-10-11) — une BOUCLE à sens unique (horaire à l'écran) autour de la funbox :
     · NORD-OUEST : la MINI-RAMPE (deux courbes face à face, est-ouest), surélevée de 25 cm sur son cadre ; on y entre par le
       haut (drop-in depuis une plateforme) ;
     · NORD : la GALERIE (piétons, spectateurs, départ du drop-in), atteinte par un escalier depuis le boulevard ;
     · NORD-EST : le QUARTER EN L (contre le bord nord, puis le bord est), raccordés par un VIRAGE creux ;
     · CENTRE : la FUNBOX (un tremplin à l'ouest, un à l'est, une table ; une arête d'acier au nord, un rail qui descend au sud) ;
     · OUEST : le PLAN INCLINÉ, où l'on fait demi-tour ;
     · SUD : la voie street — la CAISSE de glisse puis le RAIL plat, enchaînés dans le sens de la boucle.
   Hauteurs (1 case ≈ 1,15 m ; un personnage fait 1,5 case) : mini 1,2 m (plat 14 cm + courbe 1,05 m), quarter 1,6 m, funbox
   0,6 m, plan incliné 0,9 m, caisse 0,4 m, rail 0,35 m. */

/* Une COURBE (transition circulaire de rayon R, montée de Ht au-dessus de sa base) : son étendue au sol `d` et son angle au
   coping. ⚠️ `Ht < R` : la courbe s'arrête AVANT la verticale (l'angle de coping est `acos(1 − Ht/R)`, ~75° ici, celui d'une
   vraie mini-rampe) ; une courbe qui irait à 90° aurait une pente infinie sur la dernière rangée — la physique y lira un mur. */
export function transition(R, Ht) {
  const ca = 1 - Ht / R;
  return { R, Ht, d: R * Math.sqrt(1 - ca * ca), ang: Math.acos(ca) };
}

/* ⚠️ 2026-10-11 — LA COURBE DE LA MINI-RAMPE EST LARGE (R 1,35) ET SON PLAT PRESQUE AU SOL (14 cm). Premier jet : R 1,1 et un plat
   à 25 cm — vue en 3/4, la courbe ne faisait qu'un liseré d'une case de part et d'autre d'un grand plat : une baignoire vue
   de dessus, pas un U. Une courbe plus large étale ses paliers de lumière ; l'angle au coping reste celui d'une vraie mini (71°). */
export const MINI = { u0: 0, v0: 0, v1: 6, base: 0.12, Ht: 0.91, R: 1.35, D: 1.0, flat: 3.2 };
const MT = transition(MINI.R, MINI.Ht);
MINI.d = MT.d;
MINI.uTW = MINI.u0 + MINI.D + MT.d;                // le pied de la courbe ouest (côté plat)
MINI.uTE = MINI.uTW + MINI.flat;                    // le pied de la courbe est
MINI.u1 = MINI.uTE + MT.d + MINI.D;                 // le bord est de la plateforme est
MINI.top = MINI.base + MINI.Ht;                     // la hauteur des plateformes et des copings

export const QUARTER = { R: 1.8, Ht: 1.37, D: 1.0, toeV: 2.75, toeU: 18.25, u0: 10, v1: 13 };
const QT = transition(QUARTER.R, QUARTER.Ht);
QUARTER.d = QT.d;

export const GALLERY = { u0: MINI.u1, u1: QUARTER.u0, v0: 0, v1: 2, h: MINI.top, stairU0: 8.2, stairU1: 9.4, stairV0: -2, steps: 7 };
/* Les deux marches de la galerie vers la plateforme du quarter (1,03 → 1,37 : deux contremarches de 11 cm). */
const GSTEP_U = [9.4, 9.7, QUARTER.u0];

/* ⚠️ 2026-10-11 — LA TABLE FAIT 2,5 CASES (2,9 m), PAS 4 : un ollie lâché à la lèvre à bonne vitesse la passe, comme sur une
   vraie funbox ; à 4,6 m (premier jet), on retombait toujours dessus. */
export const FUNBOX = { u0: 6.75, u1: 12.25, v0: 12, v1: 15.5, H: 0.5, L: 1.5 };
export const BANK = { toeU: 2.5, L: 2.0, H: 0.77, v0: 9, v1: 19 };
export const BOX = { u0: 11, u1: 17, v0: 18.2, v1: 19.2, H: 0.35 };
export const WSTAIR = { u0: 0, u1: 1, v0: MINI.v1, v1: 7.75, steps: 7 };
/* L'arrondi du pied d'un tremplin (cases) : une vraie rampe ne fait pas d'arête vive avec le sol — et la physique d'une
   arête vive serait un choc à chaque passage. */
const TOE = 0.25;

/* ── LES PRIMITIVES ──
   Chacune rend, en un point local (u, v) de sa boîte, sa hauteur `h`, sa pente (`gu`, `gv` : ∂h/∂u, ∂h/∂v), deux
   coordonnées de texture (`sig` : l'abscisse curviligne LE LONG de la pente — les joints des lattes y sont réguliers, donc
   resserrés à l'écran là où ça monte raide, et c'est ce qui fait lire la courbure ; `lat` : en travers) et sa matière.
   `mod` : le module (le dessin y lit ses flancs et ses cernes). Le relief en un point est la plus HAUTE primitive. */
const PRIMS = [];
function addRamp(mod, dir, s0, a, b, base, R, Ht, D, extra) {
  const t = transition(R, Ht);
  const L = t.d + D;
  let bb;
  if (dir === "s") bb = [a, s0 - L, b, s0];
  else if (dir === "n") bb = [a, s0, b, s0 + L];
  else if (dir === "e") bb = [s0 - L, a, s0, b];
  else bb = [s0, a, s0 + L, b];
  PRIMS.push({ kind: "ramp", mod, dir, s0, a, b, base, R, Ht, D, d: t.d, ang: t.ang, bb, ...(extra || {}) });
}
/* Le coin creux du quarter en L : la même courbe, tournée autour du point où les deux pieds se rencontrent (`cu`, `cv`). Le
   quadrant au nord-est de ce point ; au-delà de la courbe, la plateforme remplit jusqu'au bord du dallage. */
function addCorner(mod, cu, cv, u1, v0, base, R, Ht) {
  const t = transition(R, Ht);
  PRIMS.push({ kind: "corner", mod, cu, cv, base, R, Ht, d: t.d, ang: t.ang, bb: [cu, v0, u1, cv] });
}
function addWedge(mod, dir, s0, a, b, H, L, D) {
  const Lt = L + D;
  let bb;
  if (dir === "e") bb = [s0 - Lt, a, s0, b];
  else if (dir === "w") bb = [s0, a, s0 + Lt, b];
  else if (dir === "s") bb = [a, s0 - Lt, b, s0];
  else bb = [a, s0, b, s0 + Lt];
  PRIMS.push({ kind: "wedge", mod, dir, s0, a, b, H, L, D, m: H / (L - TOE / 2), bb });
}
function addBox(mod, u0, v0, u1, v1, h, mat, edges) {
  PRIMS.push({ kind: "box", mod, h, mat: mat || "deck", edges: edges || null, bb: [u0, v0, u1, v1] });
}
/* Un escalier : `n` marches de `H/n`, qui MONTENT vers `dir` ("n" ou "s"). */
function addStairs(mod, u0, v0, u1, v1, dir, n, H0, H1) {
  PRIMS.push({ kind: "stairs", mod, dir, n, H0, H1, bb: [u0, v0, u1, v1] });
}

// La mini-rampe : deux courbes dos à dos à la plateforme, le plat entre elles (surélevé de `base`).
addRamp("mini", "e", MINI.uTW, MINI.v0, MINI.v1, MINI.base, MINI.R, MINI.Ht, MINI.D);   // regarde l'est : sa plateforme est à l'ouest
addRamp("mini", "w", MINI.uTE, MINI.v0, MINI.v1, MINI.base, MINI.R, MINI.Ht, MINI.D);   // regarde l'ouest
addBox("mini", MINI.uTW, MINI.v0, MINI.uTE, MINI.v1, MINI.base, "flat");
// La galerie, ses deux marches vers le quarter, et l'escalier qui y monte depuis le boulevard.
addBox("gallery", GALLERY.u0, GALLERY.v0, GALLERY.u1, GALLERY.v1, GALLERY.h, "deck");
addBox("gallery", GSTEP_U[0], 0, GSTEP_U[1], 1.0, GALLERY.h + (QUARTER.Ht - GALLERY.h) / 3, "step");
addBox("gallery", GSTEP_U[1], 0, GSTEP_U[2], 1.0, GALLERY.h + 2 * (QUARTER.Ht - GALLERY.h) / 3, "step");
addStairs("stairN", GALLERY.stairU0, GALLERY.stairV0, GALLERY.stairU1, 0, "s", GALLERY.steps, 0, GALLERY.h);
// L'escalier de la plateforme ouest de la mini-rampe (depuis le sol du park, il monte vers le nord).
addStairs("stairW", WSTAIR.u0, WSTAIR.v0, WSTAIR.u1, WSTAIR.v1, "n", WSTAIR.steps, 0, MINI.top);
// Le quarter en L : le bord nord (regarde le sud), le virage, le bord est (regarde l'ouest).
addRamp("quarter", "s", QUARTER.toeV, QUARTER.u0, QUARTER.toeU, 0, QUARTER.R, QUARTER.Ht, QUARTER.toeV - QT.d);   // la plateforme va jusqu'au bord nord
addCorner("quarter", QUARTER.toeU, QUARTER.toeV, PARK.w, 0, 0, QUARTER.R, QUARTER.Ht);
addRamp("quarter", "w", QUARTER.toeU, QUARTER.toeV, QUARTER.v1, 0, QUARTER.R, QUARTER.Ht, PARK.w - QUARTER.toeU - QT.d);
// La funbox : deux tremplins et la table. L'arête nord de la table est une cornière d'acier (on y glisse).
addWedge("funbox", "w", FUNBOX.u0, FUNBOX.v0, FUNBOX.v1, FUNBOX.H, FUNBOX.L, 0);
addWedge("funbox", "e", FUNBOX.u1, FUNBOX.v0, FUNBOX.v1, FUNBOX.H, FUNBOX.L, 0);
addBox("funbox", FUNBOX.u0 + FUNBOX.L, FUNBOX.v0, FUNBOX.u1 - FUNBOX.L, FUNBOX.v1, FUNBOX.H, "deck", { n: 1 });
// Le plan incliné de l'ouest (regarde l'est), et son replat contre le bord.
addWedge("bank", "e", BANK.toeU, BANK.v0, BANK.v1, BANK.H, BANK.L, BANK.toeU - BANK.L);
// La caisse de glisse : deux cornières, au nord et au sud.
addBox("box", BOX.u0, BOX.v0, BOX.u1, BOX.v1, BOX.H, "deck", { n: 1, s: 1 });

export const PARK_PRIMS = PRIMS;

/* ── LE RELIEF EN UN POINT ── */
const EDGE_W = 0.07;   // cases : la largeur d'une cornière d'acier vue de dessus (un pixel)
function evalPrim(p, u, v, o) {
  const bb = p.bb;
  if (u < bb[0] || u > bb[2] || v < bb[1] || v > bb[3]) return false;
  if (p.kind === "ramp" || p.kind === "corner") {
    let s, su = 0, sv = 0, lat;
    if (p.kind === "ramp") {
      if (p.dir === "s") { s = p.s0 - v; sv = -1; lat = u; }
      else if (p.dir === "n") { s = v - p.s0; sv = 1; lat = u; }
      else if (p.dir === "e") { s = p.s0 - u; su = -1; lat = v; }
      else { s = u - p.s0; su = 1; lat = v; }
    } else {
      const du = u - p.cu, dv = p.cv - v;
      s = Math.hypot(du, dv);
      if (s > 1e-6) { su = du / s; sv = -dv / s; }
      lat = Math.atan2(dv, du) * (p.d + 1);   // en travers : l'angle, ramené à une longueur
    }
    if (s < 0) return false;
    let h, dh, sig, mat;
    if (s < p.d) {
      const q = Math.sqrt(p.R * p.R - s * s);
      h = p.R - q; dh = s / q; sig = p.R * Math.asin(s / p.R);
      mat = p.Ht - h < 0.07 ? "coping" : "wood";
    } else {
      h = p.Ht; dh = 0; sig = p.R * p.ang + (s - p.d);
      mat = s - p.d < EDGE_W ? "coping" : "deck";
    }
    o.h = p.base + h; o.gu = dh * su; o.gv = dh * sv; o.sig = sig; o.lat = lat; o.mat = mat; o.s = s; o.d = p.d;
    return true;
  }
  if (p.kind === "wedge") {
    let s, su = 0, sv = 0, lat;
    if (p.dir === "e") { s = p.s0 - u; su = -1; lat = v; }
    else if (p.dir === "w") { s = u - p.s0; su = 1; lat = v; }
    else if (p.dir === "s") { s = p.s0 - v; sv = -1; lat = u; }
    else { s = v - p.s0; sv = 1; lat = u; }
    if (s < 0) return false;
    let h, dh;
    if (s < TOE) { h = p.m * s * s / (2 * TOE); dh = p.m * s / TOE; }
    else if (s < p.L) { h = p.m * (s - TOE / 2); dh = p.m; }
    else { h = p.H; dh = 0; }
    o.h = h; o.gu = dh * su; o.gv = dh * sv; o.sig = s < p.L ? s * Math.hypot(1, p.m) : p.L * Math.hypot(1, p.m) + (s - p.L);
    o.lat = lat; o.mat = s < p.L ? "wood" : (s - p.L < EDGE_W ? "coping" : "deck"); o.s = s; o.d = p.L;
    return true;
  }
  if (p.kind === "box") {
    o.h = p.h; o.gu = 0; o.gv = 0; o.sig = u; o.lat = v; o.s = 0; o.d = 0;
    o.mat = p.edges && ((p.edges.n && v - bb[1] < EDGE_W) || (p.edges.s && bb[3] - v < EDGE_W)) ? "steel" : p.mat;
    return true;
  }
  if (p.kind === "stairs") {
    const span = bb[3] - bb[1], t = p.dir === "s" ? (v - bb[1]) / span : (bb[3] - v) / span;
    const k = Math.min(p.n - 1, Math.floor(t * p.n));
    o.h = p.H0 + (p.H1 - p.H0) * (k + 1) / p.n; o.gu = 0; o.gv = 0; o.sig = k; o.lat = u; o.s = t * p.n - k; o.d = 0;
    o.mat = o.s < 0.18 ? "nose" : "step";   // le nez de marche (cornière d'acier), au bord qui surplombe la marche d'en dessous
    return true;
  }
  return false;
}
const TMP = { h: 0, gu: 0, gv: 0, sig: 0, lat: 0, mat: "", s: 0, d: 0 };
/* La surface du park au point (x, y) en CASES DE LA VILLE. Rend `out` rempli — `h` (cases), `gu`/`gv` (la pente), `sig`/`lat`
   (texture), `mat`, `mod`, `prim` (l'indice) — ou `null` hors de tout module (le sol de la place, à hauteur 0). */
export function parkSurf(x, y, out) {
  const u = x - PARK.x0, v = y - PARK.y0;
  if (u < PARK_BOUNDS.u0 || v < PARK_BOUNDS.v0 || u > PARK_BOUNDS.u1 || v > PARK_BOUNDS.v1) return null;
  let best = -1, bh = -1;
  const o = out || {};
  for (let i = 0; i < PRIMS.length; i++) {
    if (!evalPrim(PRIMS[i], u, v, TMP)) continue;
    if (TMP.h > bh) { bh = TMP.h; best = i; Object.assign(o, TMP); }
  }
  if (best < 0) return null;
  o.prim = best; o.mod = PRIMS[best].mod;
  return o;
}
const SURF1 = {};
/* La hauteur (cases) sous un point de la ville : 0 hors du park. */
export function heightAt(x, y) {
  const s = parkSurf(x, y, SURF1);
  return s ? s.h : 0;
}
/* La hauteur d'IMAGE (px du monde) : ce que le dessin monte un personnage debout là. ⚠️ Jamais une clé de tri, jamais une
   collision (voir l'en-tête). */
export function liftPx(x, y) {
  return heightAt(x, y) * C.TILE;
}
/* Le point est-il dans l'emprise du park (dallage + escalier du nord) ? */
export function inPark(x, y) {
  const u = x - PARK.x0, v = y - PARK.y0;
  if (u >= 0 && v >= 0 && u < PARK.w && v < PARK.h) return true;
  return u >= GALLERY.stairU0 && u <= GALLERY.stairU1 && v >= GALLERY.stairV0 && v < 0;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES TUBES : garde-corps, barrières, rails, arêtes de glisse.
   ╚════════════════════════════════════════════════════════════════════════════
   Un segment local (u0, v0) → (u1, v1), sa hauteur de PIED à chaque bout (`b0`, `b1` : la surface où il est fixé) et sa
   hauteur de LISSE au-dessus (`top`). `kind` : "rail" (garde-corps de plateforme, 0,8 m), "fence" (barrière basse de
   l'enceinte, 0,75 m), "grind" (un rail de glisse : posé bas, il ne bloque pas la vue). */
const FENCES = [];
function fence(kind, u0, v0, u1, v1, b0, b1, top) { FENCES.push({ kind, u0, v0, u1, v1, b0, b1: b1 == null ? b0 : b1, top }); }
const RAIL_TOP = 0.7, FENCE_TOP = 0.65;
// La mini-rampe : le dos et les côtés de ses plateformes.
fence("rail", 0, 0, 0, MINI.v1, MINI.top, MINI.top, RAIL_TOP);
fence("rail", 0, 0, MINI.u0 + MINI.D, 0, MINI.top, MINI.top, RAIL_TOP);
fence("rail", MINI.u1 - MINI.D, 0, MINI.u1, 0, MINI.top, MINI.top, RAIL_TOP);
fence("rail", MINI.u1, GALLERY.v1, MINI.u1, MINI.v1, MINI.top, MINI.top, RAIL_TOP);
fence("rail", MINI.u1 - MINI.D, MINI.v1, MINI.u1, MINI.v1, MINI.top, MINI.top, RAIL_TOP);
// La galerie : son bord nord de part et d'autre de l'escalier, son bord sud, son bord est (au flanc du quarter).
fence("rail", GALLERY.u0, 0, GALLERY.stairU0, 0, GALLERY.h, GALLERY.h, RAIL_TOP);
fence("rail", GALLERY.stairU1, 0, GALLERY.u1, 0, GALLERY.h + 0.2, GALLERY.h + 0.2, RAIL_TOP);
fence("rail", GALLERY.u0, GALLERY.v1, GALLERY.u1, GALLERY.v1, GALLERY.h, GALLERY.h, RAIL_TOP);
fence("rail", GALLERY.u1, 1.0, GALLERY.u1, GALLERY.v1, GALLERY.h, GALLERY.h, RAIL_TOP);
// L'escalier du nord : une main courante de chaque côté, qui monte avec lui.
fence("rail", GALLERY.stairU0, GALLERY.stairV0, GALLERY.stairU0, 0, 0, GALLERY.h, RAIL_TOP);
fence("rail", GALLERY.stairU1, GALLERY.stairV0, GALLERY.stairU1, 0, 0, GALLERY.h, RAIL_TOP);
// L'escalier de la plateforme ouest : une main courante côté park.
fence("rail", WSTAIR.u1, WSTAIR.v0, WSTAIR.u1, WSTAIR.v1, MINI.top, 0, RAIL_TOP);
// Le quarter : le dos de sa plateforme (nord, puis est) et le bout sud de la plateforme est.
fence("rail", QUARTER.u0, 0, PARK.w, 0, QUARTER.Ht, QUARTER.Ht, RAIL_TOP);
fence("rail", PARK.w, 0, PARK.w, QUARTER.v1, QUARTER.Ht, QUARTER.Ht, RAIL_TOP);
fence("rail", PARK.w - (PARK.w - QUARTER.toeU - QT.d), QUARTER.v1, PARK.w, QUARTER.v1, QUARTER.Ht, QUARTER.Ht, RAIL_TOP);
// Le plan incliné : le dos de son replat, contre le bord ouest.
fence("rail", 0, BANK.v0, 0, BANK.v1, BANK.H, BANK.H, RAIL_TOP);
// L'ENCEINTE (barrière basse au sol) : à l'ouest de part et d'autre du plan incliné, tout le sud, l'est hors de l'entrée.
export const EAST_GATE = { v0: 16, v1: 19 };   // en face de l'allée pavée qui arrive de l'est (y 92-94 de la ville)
fence("fence", 0, WSTAIR.v1, 0, BANK.v0, 0, 0, FENCE_TOP);
fence("fence", 0, BANK.v1, 0, PARK.h, 0, 0, FENCE_TOP);
fence("fence", 0, PARK.h, PARK.w, PARK.h, 0, 0, FENCE_TOP);
fence("fence", PARK.w, QUARTER.v1, PARK.w, EAST_GATE.v0, 0, 0, FENCE_TOP);
fence("fence", PARK.w, EAST_GATE.v1, PARK.w, PARK.h, 0, 0, FENCE_TOP);
export const PARK_FENCES = FENCES;
/* LA CABANE DE LOCATION (cases de la VILLE) : un conteneur reconverti, sur l'herbe à l'est de l'allée de terre, au nord de l'allée
   pavée qui arrive par la porte est — on loue au comptoir (son côté sud), trois pas, et l'on est dans le park. `reach` : la portée
   du comptoir (cases, depuis son emprise). */
export const SHED = { x: PARK.x0 + PARK.w + 3, y: PARK.y0 + EAST_GATE.v0 - 3, w: 4, h: 2, reach: 1.4 };

/* Les RAILS DE GLISSE (polylignes de points locaux `[u, v, h]`, h = la hauteur du TUBE) et les ARÊTES où l'on glisse (cornières
   des caisses, copings) — la physique de l'étape 4 les lira ; le dessin pose les rails, les arêtes sont déjà dans le relief. */
export const PARK_RAILS = [
  /* ⚠️ 2026-10-11 — LE RAIL PLAT A SA PROPRE VOIE (v 20,4), au sud de la caisse : dans l'axe de la caisse (premier jet, v 18,7),
     elle lui barrait l'élan côté est et le plan incliné le longeait côté ouest — on ne pouvait l'aborder que de travers. Deux
     voies parallèles, dans le sens de la boucle. */
  { kind: "flat", pts: [[3.5, 20.4, 0.3], [9.5, 20.4, 0.3]], posts: [3.85, 6.5, 9.15] },
  { kind: "down", pts: [[FUNBOX.u0 + FUNBOX.L + 0.1, FUNBOX.v1 + 0.45, FUNBOX.H + 0.3], [FUNBOX.u0 - 0.05, FUNBOX.v1 + 0.45, 0.3], [FUNBOX.u0 - 0.9, FUNBOX.v1 + 0.45, 0.3]], posts: [FUNBOX.u0 + FUNBOX.L - 0.1, FUNBOX.u0 - 0.75] },
];

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES LIGNES DE GLISSE (`PARK_GRINDS`) — tout ce sur quoi une monture peut grinder, en polylignes locales `[u, v, h]`.
   ╚════════════════════════════════════════════════════════════════════════════
   Les RAILS (les tubes posés), les ARÊTES (la cornière de la table de la funbox, les deux de la caisse) et les COPINGS (le tube
   d'acier en haut de chaque courbe, le virage du quarter compris). ⚠️ DÉRIVÉES DES MODULES, jamais recopiées : un coping est à
   l'abscisse où la courbe atteint sa hauteur (`d` depuis son pied) ; déplacer un module déplace sa ligne. `out` : de quel côté
   tombe-t-on d'un coping ou d'une arête quand on la quitte en douceur (le côté de la courbe, le côté du vide). */
function arcPts(cu, cv, r, a0, a1, h, n) {
  const pts = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a), h]); }
  return pts;
}
export const PARK_GRINDS = [
  ...PARK_RAILS.map((r) => ({ kind: "rail", pts: r.pts })),
  { kind: "edge", pts: [[FUNBOX.u0 + FUNBOX.L, FUNBOX.v0, FUNBOX.H], [FUNBOX.u1 - FUNBOX.L, FUNBOX.v0, FUNBOX.H]] },
  { kind: "edge", pts: [[BOX.u0, BOX.v0, BOX.H], [BOX.u1, BOX.v0, BOX.H]] },
  { kind: "edge", pts: [[BOX.u0, BOX.v1, BOX.H], [BOX.u1, BOX.v1, BOX.H]] },
  { kind: "coping", pts: [[MINI.uTW - MINI.d, MINI.v0, MINI.top], [MINI.uTW - MINI.d, MINI.v1, MINI.top]] },
  { kind: "coping", pts: [[MINI.uTE + MINI.d, MINI.v0, MINI.top], [MINI.uTE + MINI.d, MINI.v1, MINI.top]] },
  { kind: "coping", pts: [[QUARTER.u0, QUARTER.toeV - QUARTER.d, QUARTER.Ht], [QUARTER.toeU, QUARTER.toeV - QUARTER.d, QUARTER.Ht],
    ...arcPts(QUARTER.toeU, QUARTER.toeV, QUARTER.d, -Math.PI / 2, 0, QUARTER.Ht, 8).slice(1),
    [QUARTER.toeU + QUARTER.d, QUARTER.v1, QUARTER.Ht]] },
];

/* ── LA MARCHE ── */
function segDist(u, v, f) {
  const du = f.u1 - f.u0, dv = f.v1 - f.v0, L2 = du * du + dv * dv;
  let t = L2 > 0 ? ((u - f.u0) * du + (v - f.v0) * dv) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { d: Math.hypot(u - (f.u0 + t * du), v - (f.v0 + t * dv)), t };
}
/* Un point (cases de la ville) est-il interdit au PIÉTON, quelle que soit sa provenance ? Un garde-corps (son épaisseur de
   corps), un rail de glisse, une pente trop raide. ⚠️ Le DÉNIVELÉ (monter sur une plateforme d'un pas) ne se lit pas ici :
   il dépend d'où l'on vient — c'est `walkStepOk`. */
export function walkBlocked(x, y) {
  const u = x - PARK.x0, v = y - PARK.y0;
  if (u < PARK_BOUNDS.u0 - 0.5 || v < PARK_BOUNDS.v0 - 0.5 || u > PARK_BOUNDS.u1 + 0.5 || v > PARK_BOUNDS.v1 + 0.5) return false;
  for (const f of FENCES) if (segDist(u, v, f).d < WALK.FENCE_R) return true;
  for (const r of PARK_RAILS) for (let k = 0; k + 1 < r.pts.length; k++) {
    const a = r.pts[k], b = r.pts[k + 1];
    if (segDist(u, v, { u0: a[0], v0: a[1], u1: b[0], v1: b[1] }).d < WALK.FENCE_R) return true;
  }
  const s = parkSurf(x, y, SURF1);
  return !!(s && Math.hypot(s.gu, s.gv) > WALK.SLOPE);
}
/* Le pas d'un piéton de la hauteur `h0` vers le point (x, y) : on MONTE une marche (`STEP`), on DESCEND d'un saut de la
   caisse ou de la table de la funbox (`DOWN`) — sans quoi qui s'y trouve (posé là au changement de saison, monté par un
   tremplin) y resterait. Les plateformes, elles, ont leurs garde-corps. */
export function walkStepOk(h0, x, y) {
  const dh = heightAt(x, y) - h0;
  return dh <= WALK.STEP && dh >= -WALK.DOWN;
}
