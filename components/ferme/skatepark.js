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
   `tools/verify-skatepark.mjs` tient la COLLISION (des milliers de sessions jouées au hasard, à pied et sur les quatre montures :
   jamais hors du park, jamais dans un module, jamais à travers un tube) ; `tools/render-skatepark.mjs` regarde le dessin.
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
   garde-corps pour la collision (le tube est fin ; c'est le corps qui ne passe pas).
   ⚠️ 2026-10-13 — `FENCE_R` EST UNE MARGE AUTOUR DE LA SEMELLE ENTIÈRE (`fenceNear`), plus autour de ses quatre coins : à 0,14
   sur les coins seuls (premier jet), une semelle de 0,6 case enjambait un tube de 0,28 en arrivant par son bout — on longeait la
   main courante de l'escalier nord, la barrière de la porte est, LE TUBE AU MILIEU DU CORPS. Le rectangle entier tient le tube
   dehors ; la marge redescend donc à l'épaisseur du tube et d'un rien d'air (sans quoi l'escalier de la mini-rampe, une case
   entre deux mains courantes, ne laisserait qu'un couloir de 12 cm à la semelle). */
export const WALK = { STEP: 0.26, DOWN: 0.55, SLOPE: 0.58, FENCE_R: 0.06 };

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
/* 2026-10-13 — L'AIRE DE ROULAGE : le dallage seul, sans l'escalier du nord. Une monture n'en sort pas (`monture.js` : la porte
   de l'est, le haut de l'escalier du nord, et partout ailleurs l'enceinte) ; on n'y monte qu'ici (FermeGame.js, `parkMountToggle`).
   ⚠️ Premier jet : rien ne la bornait que les tubes — le bout nord de la mini-rampe n'en avait pas, et l'on descendait l'escalier de la
   galerie en roulant jusque dans l'allée de terre, puis dans la ville, où la physique des montures ne voit aucun mur. */
export function inRideArea(x, y) {
  const u = x - PARK.x0, v = y - PARK.y0;
  return u >= 0 && v >= 0 && u <= PARK.w && v <= PARK.h;
}
/* Les deux ouvertures de l'aire de roulage (local) : la porte de l'est et le haut de l'escalier du nord. On y BUTE (le jeu le dit),
   on n'y tombe pas : il n'y a là aucun tube à heurter. */
export function rideOpeningAt(u, v) {
  if (u > PARK.w) return v >= EAST_GATE.v0 && v <= EAST_GATE.v1;
  if (v < 0) return u >= GALLERY.stairU0 && u <= GALLERY.stairU1;
  return false;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LES TUBES : garde-corps, barrières, rails, arêtes de glisse.
   ╚════════════════════════════════════════════════════════════════════════════
   Un segment local (u0, v0) → (u1, v1), sa hauteur de PIED à chaque bout (`b0`, `b1` : la surface où il est fixé) et sa
   hauteur de LISSE au-dessus (`top`). `kind` : "rail" (garde-corps de plateforme, 0,8 m), "fence" (barrière basse de
   l'enceinte, 0,75 m), "grind" (un rail de glisse : posé bas, il ne bloque pas la vue). */
const FENCES = [];
/* `posts` (facultatif) : où le dessin plante les poteaux, en fractions du segment — sinon un tous les 1,1 case. */
function fence(kind, u0, v0, u1, v1, b0, b1, top, posts) { FENCES.push({ kind, u0, v0, u1, v1, b0, b1: b1 == null ? b0 : b1, top, posts: posts || null }); }
const RAIL_TOP = 0.7, FENCE_TOP = 0.65;
// La mini-rampe : le dos et les côtés de ses plateformes.
fence("rail", 0, 0, 0, MINI.v1, MINI.top, MINI.top, RAIL_TOP);
fence("rail", 0, 0, MINI.u0 + MINI.D, 0, MINI.top, MINI.top, RAIL_TOP);
fence("rail", MINI.u1 - MINI.D, 0, MINI.u1, 0, MINI.top, MINI.top, RAIL_TOP);
/* 2026-10-13 — LE BOUT NORD DE LA MINI-RAMPE A SON GARDE-CORPS, QUI ÉPOUSE LE U (d'un coping à l'autre, la lisse à 80 cm au-dessus
   du bois) : premier jet, rien — le U s'ouvrait sur l'allée de terre, et l'on sortait du park en roulant (la sonde de fuzz du
   2026-10-13 : 243 sorties sur 3 000 sessions, toutes par là). Une barrière basse posée sur la terre ne suffisait pas : qui quitte
   la courbe à un mètre la franchit en l'air. ⚠️ Il suit le relief en segments (la base d'un segment est linéaire) : les courbes
   échantillonnées à angle constant, plus serrées là où ça monte raide ; les poteaux au pied de chaque courbe et au milieu du plat. */
{
  const prof = [];
  const NC = 9;
  for (let k = 0; k <= NC; k++) prof.push(MINI.uTW - MINI.R * Math.sin(MT.ang * (1 - k / NC)));   // la courbe ouest, du coping au pied
  prof.push((MINI.uTW + MINI.uTE) / 2);
  for (let k = 0; k <= NC; k++) prof.push(MINI.uTE + MINI.R * Math.sin(MT.ang * k / NC));         // la courbe est, du pied au coping
  const postAt = new Set([NC, NC + 1, NC + 2]);
  for (let k = 0; k + 1 < prof.length; k++) {
    const a = prof[k], b = prof[k + 1];
    if (b - a < 1e-6) continue;
    fence("rail", a, 0, b, 0, heightAt(PARK.x0 + a, PARK.y0 + 0.01), heightAt(PARK.x0 + b, PARK.y0 + 0.01), RAIL_TOP, postAt.has(k) ? [0] : []);
  }
}
// L'escalier de la plateforme ouest : sa main courante côté dehors (2026-10-13 : le flanc ouest de l'escalier était ouvert sur la terre).
fence("rail", WSTAIR.u0, WSTAIR.v0, WSTAIR.u0, WSTAIR.v1, MINI.top, 0, RAIL_TOP);
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
/* ⚠️ 2026-10-13 — UN COPING S'ARRÊTE AVANT LE POTEAU QUI LE TERMINE (`GRIND_END` : le torse d'un rider et un rien). Premier jet,
   chaque ligne courait jusqu'au bout du module, c'est-à-dire jusqu'au pied d'un garde-corps (le bout sud du quarter, les deux bouts de
   la mini-rampe) : on glissait jusque DANS le poteau, et l'on y restait. Au bout raccourci, on sort de la glisse dans son axe — et si
   l'on file encore vers le poteau, on le heurte, comme en vrai. */
const GRIND_END = 0.25;
export const PARK_GRINDS = [
  ...PARK_RAILS.map((r) => ({ kind: "rail", pts: r.pts })),
  { kind: "edge", pts: [[FUNBOX.u0 + FUNBOX.L, FUNBOX.v0, FUNBOX.H], [FUNBOX.u1 - FUNBOX.L, FUNBOX.v0, FUNBOX.H]] },
  { kind: "edge", pts: [[BOX.u0, BOX.v0, BOX.H], [BOX.u1, BOX.v0, BOX.H]] },
  { kind: "edge", pts: [[BOX.u0, BOX.v1, BOX.H], [BOX.u1, BOX.v1, BOX.H]] },
  { kind: "coping", pts: [[MINI.uTW - MINI.d, MINI.v0 + GRIND_END, MINI.top], [MINI.uTW - MINI.d, MINI.v1 - GRIND_END, MINI.top]] },
  { kind: "coping", pts: [[MINI.uTE + MINI.d, MINI.v0 + GRIND_END, MINI.top], [MINI.uTE + MINI.d, MINI.v1 - GRIND_END, MINI.top]] },
  { kind: "coping", pts: [[QUARTER.u0 + GRIND_END, QUARTER.toeV - QUARTER.d, QUARTER.Ht], [QUARTER.toeU, QUARTER.toeV - QUARTER.d, QUARTER.Ht],
    ...arcPts(QUARTER.toeU, QUARTER.toeV, QUARTER.d, -Math.PI / 2, 0, QUARTER.Ht, 8).slice(1),
    [QUARTER.toeU + QUARTER.d, QUARTER.v1 - GRIND_END, QUARTER.Ht]] },
];

/* ── LA MARCHE ── */
function segDist(u, v, f) {
  const du = f.u1 - f.u0, dv = f.v1 - f.v0, L2 = du * du + dv * dv;
  let t = L2 > 0 ? ((u - f.u0) * du + (v - f.v0) * dv) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { d: Math.hypot(u - (f.u0 + t * du), v - (f.v0 + t * dv)), t };
}
/* La distance d'un segment local (a → b) à un rectangle [x0, x1] × [y0, y1] (local), et le paramètre du point le plus proche sur le
   segment : 0 si le segment le traverse (Liang-Barsky), sinon le plus court des quatre coins au segment et des deux bouts au rectangle. */
const SEG = { u0: 0, v0: 0, u1: 0, v1: 0 };
let RT = 0;   // le paramètre (sur le segment) du point le plus proche, rendu à côté de la distance (aucune allocation : 8 appels par image)
function ptRect(pu, pv, x0, y0, x1, y1) { const dx = Math.max(x0 - pu, 0, pu - x1), dy = Math.max(y0 - pv, 0, pv - y1); return Math.sqrt(dx * dx + dy * dy); }
function cornerSeg(cu, cv, au, av, du, dv, L2) {
  let t = L2 > 0 ? ((cu - au) * du + (cv - av) * dv) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const eu = cu - (au + t * du), ev = cv - (av + t * dv);
  return [Math.sqrt(eu * eu + ev * ev), t];
}
function segRect(au, av, bu, bv, x0, y0, x1, y1) {
  const du = bu - au, dv = bv - av;
  // la traversée (Liang-Barsky) : le segment coupe-t-il le rectangle ?
  let t0 = 0, t1 = 1, inside = true;
  const P4 = [-du, du, -dv, dv], Q4 = [au - x0, x1 - au, av - y0, y1 - av];
  for (let i = 0; i < 4 && inside; i++) {
    const p = P4[i], q = Q4[i];
    if (Math.abs(p) < 1e-12) { if (q < 0) inside = false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) inside = false; else if (r > t0) t0 = r; } else { if (r < t0) inside = false; else if (r < t1) t1 = r; }
  }
  if (inside) { RT = (t0 + t1) / 2; return 0; }
  let d = ptRect(au, av, x0, y0, x1, y1); RT = 0;
  const db = ptRect(bu, bv, x0, y0, x1, y1);
  if (db < d) { d = db; RT = 1; }
  const L2 = du * du + dv * dv;
  for (let i = 0; i < 4; i++) {
    const r = cornerSeg(i & 1 ? x1 : x0, i & 2 ? y1 : y0, au, av, du, dv, L2);
    if (r[0] < d) { d = r[0]; RT = r[1]; }
  }
  return d;
}
/* ⚠️ LA SEMELLE : le rectangle de `C.bodyPoints` (sa demi-largeur, sa profondeur DERRIÈRE la ligne de contact), lu ici des constantes
   pour ne pas en écrire une seconde copie. */
const BODY_RX = C.BODY_RX, BODY_D = C.BODY_DEPTH;
/* La hauteur d'un rider, des pieds aux épaules (cases). ⚠️ 2026-10-13 — premier jet : un tube ne comptait que si les PIEDS étaient
   entre 40 cm sous son pied et sa lisse ; au sol à côté de l'escalier de la mini-rampe, sous la main courante (son pied à 80 cm), on
   s'y glissait — le torse dans le tube. Le corps a une hauteur : c'est elle qui croise le tube. */
export const RIDER_H = 1.2;
const NEAR = { d: 1e9, f: null };
/* Les tubes à plat, avec leur boîte (construits au premier appel : `PARK_RAILS` est déclaré plus bas). */
let TUBES = null;
function tubes() {
  if (TUBES) return TUBES;
  TUBES = [];
  const add = (a, b, f, h0, h1) => TUBES.push({ au: a[0], av: a[1], bu: b[0], bv: b[1], f, h0, h1,
    lu: Math.min(a[0], b[0]), lv: Math.min(a[1], b[1]), hu: Math.max(a[0], b[0]), hv: Math.max(a[1], b[1]) });
  for (const f of FENCES) add([f.u0, f.v0], [f.u1, f.v1], f, null, null);
  for (const rl of PARK_RAILS) for (let k = 0; k + 1 < rl.pts.length; k++) add(rl.pts[k], rl.pts[k + 1], rl, rl.pts[k][2], rl.pts[k + 1][2]);
  return TUBES;
}
/* La distance de la SEMELLE (pieds en `fx, fy`, cases de la ville) au plus proche tube — garde-corps, barrière, rail de glisse —
   jusqu'à une case (au-delà, `d` vaut 1e9 : rien de proche).
   `z` (la hauteur des pieds) : ne compte alors que les tubes qui croisent le CORPS (des pieds aux épaules, `RIDER_H`) — sous la lisse
   d'un garde-corps, sous le tube d'un rail : la monture passe au-dessus d'un rail en l'air. `z` nul : tous (le
   piéton : un tube qu'on ne passe pas à pied, quelle que soit la hauteur où on le croise). Rend `{ d, f }` (objet partagé). */
export function fenceNear(fx, fy, z) {
  NEAR.d = 1e9; NEAR.f = null;
  const u = fx - PARK.x0, v = fy - PARK.y0;
  if (u < PARK_BOUNDS.u0 - 1.5 || v < PARK_BOUNDS.v0 - 1.5 || u > PARK_BOUNDS.u1 + 1.5 || v > PARK_BOUNDS.v1 + 1.5) return NEAR;
  const x0 = u - BODY_RX, x1 = u + BODY_RX, y0 = v - BODY_D, y1 = v;
  for (const T of tubes()) {
    const lim = Math.min(NEAR.d, 1);
    if (T.lu > x1 + lim || T.hu < x0 - lim || T.lv > y1 + lim || T.hv < y0 - lim) continue;
    const d = segRect(T.au, T.av, T.bu, T.bv, x0, y0, x1, y1);
    if (d >= lim) continue;
    if (z != null) {
      const f = T.f;
      if (T.h0 == null) { const base = f.b0 + (f.b1 - f.b0) * RT; if (!(z < base + f.top && z + RIDER_H > base)) continue; }
      else if (!(z < T.h0 + (T.h1 - T.h0) * RT - 0.02)) continue;
    }
    NEAR.d = d; NEAR.f = T.f;
  }
  return NEAR;
}
/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-13 — L'EMPRISE D'UN RIDER CONTRE LES TUBES (`rideClear`) : un TORSE et un VÉHICULE, chacun avec sa hauteur.
   ╚════════════════════════════════════════════════════════════════════════════
   Le rectangle de semelle du piéton (0,6 × 0,31, sa profondeur d'ombre derrière les pieds) est un mauvais modèle pour qui roule :
   il « touchait » le garde-corps posé 1,37 m plus haut, à 32 cm au nord des pieds, et laissait la planche d'un rider qui file vers
   un rail y entrer de tout son nez. Ici :
     · le CORPS : un cylindre de `RIDE_TORSO_R` autour des pieds, des chevilles (`RIDE_LEG_H`) aux épaules (`RIDER_H`) ;
     · le VÉHICULE : un segment le long du cap (sa demi-longueur, `half` : la planche, la trottinette, le BMX roue à roue), de
       `RIDE_DECK_R` de large, du bas des roues à `tall` au-dessus (la planche 11 cm, le BMX le haut de ses roues).
   Le JEU d'une part contre un tube est le plus grand de ses deux écarts : à plat (la distance moins l'épaisseur) et en hauteur (un
   garde-corps de son pied à sa lisse, un rail de glisse à son tube). ⚠️ CONTINU, et c'est voulu : premier jet, un tube « comptait » ou
   « ne comptait pas » selon que les hauteurs se croisaient — le jeu sautait d'un coup de +∞ à −8 cm quand les pieds montaient de
   4 mm sur une courbe, et la règle « pas plus près qu'avant » (`monture.js`, `fenceHit`) ne voyait pas le saut.
   Rend `{ c, f }` (objet partagé) : `c`, le jeu le plus court (cases, négatif : ça touche) ; `f`, le tube. Au-delà d'une case, 1e9. */
export const RIDE_TORSO_R = 0.18, RIDE_DECK_R = 0.08, RIDE_LEG_H = 0.12;
const CLEAR = { c: 1e9, f: null };
function tubeSpan(T, t) {
  if (T.h0 == null) { const f = T.f, base = f.b0 + (f.b1 - f.b0) * t; return [base, base + f.top]; }
  const h = T.h0 + (T.h1 - T.h0) * t;
  return [h - 0.05, h];   // la ligne de glisse EST le dessus du tube : qui roule à sa hauteur est dessus, pas dedans
}
let RV = 0;   // le paramètre (0..1) du point le plus proche sur le segment du VÉHICULE
function segSegDist(a0u, a0v, a1u, a1v, T) {
  // la traversée d'abord (le segment du véhicule coupe l'axe du tube) ; sinon les quatre bouts contre l'autre segment
  const du = a1u - a0u, dv = a1v - a0v, eu = T.bu - T.au, ev = T.bv - T.av, den = du * ev - dv * eu;
  if (Math.abs(den) > 1e-12) {
    const s = ((T.au - a0u) * ev - (T.av - a0v) * eu) / den, t = ((T.au - a0u) * dv - (T.av - a0v) * du) / den;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) { RT = t; RV = s; return 0; }
  }
  SEG.u0 = T.au; SEG.v0 = T.av; SEG.u1 = T.bu; SEG.v1 = T.bv;
  let r = segDist(a0u, a0v, SEG), d = r.d; RT = r.t; RV = 0;
  r = segDist(a1u, a1v, SEG); if (r.d < d) { d = r.d; RT = r.t; RV = 1; }
  for (const [pu, pv, tt] of [[T.au, T.av, 0], [T.bu, T.bv, 1]]) {
    let k = ((pu - a0u) * du + (pv - a0v) * dv) / ((du * du + dv * dv) || 1); k = k < 0 ? 0 : k > 1 ? 1 : k;
    const dd = Math.hypot(pu - a0u - k * du, pv - a0v - k * dv);
    if (dd < d) { d = dd; RT = tt; RV = k; }
  }
  return d;
}
/* `grounded` : le véhicule roule — il est alors COUCHÉ sur la surface, comme le dessin le pose (`frameOf`, montureArt.js) : son nez
   monte de la pente le long du cap fois son avance (en l'air, à plat). La pente se lit ICI, au cap essayé : la passer de dehors, c'était
   lire celle de l'ancien cap quand on pivote. ⚠️ 2026-10-13 — premier jet, le plateau à la hauteur des pieds sur toute sa
   longueur : sur la courbe de la mini-rampe, la roue avant du BMX passait sous le garde-corps du bout nord (posé plus haut sur la
   courbe), d'un coup « dedans » quand les pieds montaient de 4 mm. */
const SURF2 = {};
/* `skip` : les points d'une ligne que le VÉHICULE ne heurte pas — celle qu'on glisse, celle qu'on vient prendre dans l'axe en l'air
   (l'accroche en décide ; le corps, lui, la heurte toujours si l'on arrive trop bas). */
export function rideClear(fx, fy, z, th, half, grounded, skip, tall) {
  const dH = tall || 0.12;
  CLEAR.c = 1e9; CLEAR.f = null;
  let p = 0;
  if (grounded && half > 0) { const sf = parkSurf(fx, fy, SURF2); if (sf) p = sf.gu * Math.cos(th) + sf.gv * Math.sin(th); }
  const u = fx - PARK.x0, v = fy - PARK.y0;
  if (u < PARK_BOUNDS.u0 - 1.5 || v < PARK_BOUNDS.v0 - 1.5 || u > PARK_BOUNDS.u1 + 1.5 || v > PARK_BOUNDS.v1 + 1.5) return CLEAR;
  const c = Math.cos(th), sn = Math.sin(th), hl = half || 0;
  const a0u = u - c * hl, a0v = v - sn * hl, a1u = u + c * hl, a1v = v + sn * hl;
  const reach = Math.max(RIDE_TORSO_R, hl + RIDE_DECK_R) + 1;
  for (const T of tubes()) {
    if (T.lu > u + reach || T.hu < u - reach || T.lv > v + reach || T.hv < v - reach) continue;
    // le corps : au-dessus du véhicule (les chevilles sont sur la planche ; c'est elle qui couvre le bas)
    SEG.u0 = T.au; SEG.v0 = T.av; SEG.u1 = T.bu; SEG.v1 = T.bv;
    const rt = segDist(u, v, SEG), span = tubeSpan(T, rt.t);
    const ct = Math.max(rt.d - RIDE_TORSO_R, span[0] - (z + RIDER_H), z + RIDE_LEG_H - span[1]);
    if (ct < CLEAR.c) { CLEAR.c = ct; CLEAR.f = T.f; }
    // le véhicule (sauf contre la ligne qu'on glisse, ou qu'on vient prendre dans l'axe : `skip`)
    if (hl > 0 && !(skip && T.f.pts === skip)) {
      const d = segSegDist(a0u, a0v, a1u, a1v, T), sp = tubeSpan(T, RT), zv = z + p * (2 * RV - 1) * hl;
      const cv = Math.max(d - RIDE_DECK_R, sp[0] - (zv + dH), zv - sp[1]);
      if (cv < CLEAR.c) { CLEAR.c = cv; CLEAR.f = T.f; }
    }
  }
  return CLEAR;
}
/* Le pas d'un PIÉTON de (fx0, fy0) à (fx1, fy1) (pieds, ville) le mène-t-il dans un tube ? Plus près que `FENCE_R` ET plus près
   qu'avant : qui s'y trouve déjà (posé là au changement de saison, descendu de sa monture contre la lisse) s'en éloigne librement,
   ne s'en rapproche jamais — et ne le traverse donc pas, même par la trappe de dégagement de la marche. */
export function walkFenceStep(fx0, fy0, fx1, fy1) {
  const n1 = fenceNear(fx1, fy1, null), d1 = n1.d, f1 = n1.f;
  if (d1 >= WALK.FENCE_R) return true;
  const d0 = fenceNear(fx0, fy0, null).d;
  if (d1 > d0 + 1e-9) return true;
  if (d1 < d0 - 1e-9 || !f1) return false;
  // à égalité (à cheval sur le tube, la semelle le touche des deux pas) : les PIEDS s'éloignent-ils de son axe ? On en sort du côté
  // où l'on est ; le traverser ferait d'abord rapprocher les pieds — refusé.
  return footAxisDist(f1, fx1, fy1) > footAxisDist(f1, fx0, fy0) + 1e-9;
}
/* 2026-10-13 — UN PIÉTON TIENT-IL DEBOUT LÀ (ancre `ax, ay`, ville) ? Ce que demande la marche (`walkBlocked` sous chaque point de la
   semelle, la marche de chacun depuis les pieds, la semelle hors des tubes) — lu ICI, pur, parce que celui qui le demande (descendre
   de sa monture, `parkMountToggle`) vit au niveau du composant, où `canStandTown` (dans la boucle) n'existe pas (§4).
   ⚠️ Premier jet sans ce contrôle : on descendait de sa monture collé à une lisse, ou à mi-hauteur du quarter, et la trappe de
   dégagement de la marche (« tout pas est permis tant qu'on est mal placé ») laissait traverser le garde-corps. */
export function walkStandOk(ax, ay) {
  const fx = C.footX(ax), fy = C.footY(ay), h0 = heightAt(fx, fy);
  for (const [px, py] of C.bodyPoints(ax, ay)) {
    if (walkBlocked(px, py)) return false;
    if (!walkStepOk(h0, px, py)) return false;
  }
  return fenceNear(fx, fy, null).d >= WALK.FENCE_R;
}
function footAxisDist(f, fx, fy) { return tubeAxis(f, fx, fy).d; }
/* Les pieds (ville) par rapport à l'AXE d'un tube : la distance, et la direction (unitaire) de l'axe vers les pieds — pieds sur
   l'axe : la normale du segment, vers le sud ou l'est. */
export function tubeAxis(f, fx, fy) {
  const u = fx - PARK.x0, v = fy - PARK.y0;
  const segs = f.pts ? f.pts.slice(1).map((b, k) => [f.pts[k], b]) : [[[f.u0, f.v0], [f.u1, f.v1]]];
  let best = { d: 1e9, nu: 0, nv: 1 };
  for (const [a, b] of segs) {
    SEG.u0 = a[0]; SEG.v0 = a[1]; SEG.u1 = b[0]; SEG.v1 = b[1];
    const r = segDist(u, v, SEG);
    if (r.d >= best.d) continue;
    const pu = a[0] + (b[0] - a[0]) * r.t, pv = a[1] + (b[1] - a[1]) * r.t;
    let nu = u - pu, nv = v - pv;
    const L = Math.hypot(nu, nv);
    if (L > 1e-9) { nu /= L; nv /= L; } else { const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; nu = -(b[1] - a[1]) / tl; nv = (b[0] - a[0]) / tl; if (nu + nv < 0) { nu = -nu; nv = -nv; } }
    best = { d: r.d, nu, nv };
  }
  return best;
}
/* 2026-10-13 — LES FLANCS VERTICAUX AUTOUR D'UN RIDER (est, ouest, nord) : de combien le relief
   à moins de `rx` des pieds se dresse-t-il au-dessus d'eux (plus de 20 cm d'un coup : un flanc, pas une pente) ? Rend la profondeur
   d'entrée du corps dans le flanc (0 : rien). La physique ne lit que les PIEDS contre le relief : sans ceci, un rider qui longe le
   bout de la caisse ou le flanc ouest du quarter y entrait de la moitié du corps. ⚠️ Une pente continue (le pied d'une courbe,
   d'un tremplin) ne monte pas de 20 cm en 20 cm : elle n'est jamais un flanc ici. */
const SIDE = { pen: 0, du: 0, dv: 0 };
/* La même mesure, avec le côté : `du, dv`, la direction (unitaire) qui ÉCARTE du flanc le plus profond. Rend un objet partagé. */
export function sideWall(fx, fy, z, rx) {
  SIDE.pen = 0; SIDE.du = 0; SIDE.dv = 0;
  // l'est, l'ouest — et le nord (derrière soi à l'écran : le torse, comme la semelle du piéton, ne s'adosse pas DANS un module)
  for (const [du, dv] of [[-1, 0], [1, 0], [0, -1]]) for (let k = 1; k <= 8; k++) {
    const off = rx * k / 8;
    if (heightAt(fx + du * off, fy + dv * off) > z + 0.2) { const pen = rx - off + rx / 8; if (pen > SIDE.pen) { SIDE.pen = pen; SIDE.du = -du; SIDE.dv = -dv; } break; }
  }
  return SIDE;
}
export function sideWallDepth(fx, fy, z, rx) { return sideWall(fx, fy, z, rx).pen; }
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
