/* =============================================================================
   preview-fps.mjs — REGARDER LA VUE SUBJECTIVE SANS NAVIGATEUR. (zip 397)
   -----------------------------------------------------------------------------
   Le pendant de render-textures.mjs, un cran plus loin. Celui-ci ne montre pas
   une texture : il montre CE QU'ON VOIT EN JOUANT — la pierre à l'échelle où
   elle apparaît vraiment, la largeur du couloir, la hauteur des murs, la
   portée de la torche, la lisibilité d'un carrefour.

   ⚠️ POURQUOI IL EXISTE, ET CE QU'IL RÈGLE VRAIMENT. Une texture qu'on juge sur
   une planche de 512 px n'a rien à voir avec la même texture vue à quatre
   mètres, de biais, sous une lumière ponctuelle. Le zip 396 avait un mur dont
   la texture était ÉTIRÉE sur toute la face, quelle que soit sa longueur : les
   pierres n'avaient donc pas la même taille selon le couloir où l'on se
   tenait. Aucune planche de texture ne peut montrer ça. Il faut une vue.

   ⚠️ CE QU'IL N'EST PAS. Ce n'est pas le jeu. Il lance des rayons là où
   Three.js pose des triangles, il ne connaît ni les créatures, ni les torches
   murales, ni le ciel, ni le modèle de vue, et son éclairage est une
   approximation grossière de celui de world.js. Il ne prouve donc RIEN du
   rendu final — il permet de REGARDER l'échelle, le cadrage et la lisibilité,
   c'est-à-dire les trois choses qu'on ne peut pas déduire d'un chiffre.

   ⚠️ ET IL LIT LA VRAIE LISTE DE BOÎTES. `Rules.buildBoxes()` — la même que
   celle qui arrête le joueur, la même que celle que world.js dessine. Un
   aperçu qui se reconstruirait sa propre géométrie mesurerait son propre écart
   (corollaire n°5 du zip 387), et c'est très exactement la faute que ce projet
   passe son temps à ne pas commettre.

   Usage :  node tools/preview-fps.mjs [graine] [nb de vues]
   ========================================================================== */

import path from "path";
import { load, ROOT } from "./lib-play.mjs";
import { surface, writePNG } from "./lib-raster.mjs";

const { CFG, Maze, Rules, Paint } = load(["js/config.js", "js/maze.js", "js/rules.js", "js/paint.js"]);

const SEED = parseInt(process.argv[2] || "4242", 10);
const SHOTS = parseInt(process.argv[3] || "4", 10);
const W = 640, H = 360;
const OUT = path.join(ROOT, "tools", "out");

/* --- les textures, sous forme de tampons lisibles au pixel --------------- */
function bake(w, h, f) {
  const s = surface(w, h);
  f(s.ctx, w, h);
  return s;
}
const TW = CFG.TEX_WALL, TF = CFG.TEX_FLOOR;
const TEX = {
  wall: bake(TW, TW, (c, a, b) => Paint.wall(c, CFG, a, b, 1)),
  wall2: bake(TW, TW, (c, a, b) => Paint.wall(c, CFG, a, b, 7)),
  floor: bake(TF, TF, (c, a, b) => Paint.floor(c, CFG, a, b, 3)),
};
function texel(t, u, v) {
  const x = ((u % 1) + 1) % 1, y = ((v % 1) + 1) % 1;
  const i = ((Math.min(t.H - 1, (y * t.H) | 0) * t.W) + Math.min(t.W - 1, (x * t.W) | 0)) * 4;
  return [t.px[i], t.px[i + 1], t.px[i + 2]];
}

/* --- le monde ------------------------------------------------------------ */
const m = Maze.generate(CFG, SEED);
const st = Rules.create(CFG, m, SEED);
const boxes = st.boxes;
const idx = Rules.indexBoxes(CFG, m, boxes);

/* Intersection rayon / boîte alignée sur les axes, en 2D (les murs sont des
   prismes verticaux : la troisième dimension ne change rien à QUI est touché,
   seulement à QUELLE HAUTEUR). On rend la distance, le mur touché, et l'abscisse
   du point d'impact le long de ce mur — c'est elle qui donne la coordonnée de
   texture, donc l'échelle de la pierre. */
function cast(ox, oz, dx, dz, maxD) {
  let best = maxD, bu = 0, bAxis = 0;
  for (const b of boxes) {
    // slab test
    let t0 = -1e9, t1 = 1e9, ax = 0;
    if (Math.abs(dx) < 1e-9) { if (ox < b.x0 || ox > b.x1) continue; }
    else {
      let a = (b.x0 - ox) / dx, c = (b.x1 - ox) / dx;
      if (a > c) { const t = a; a = c; c = t; }
      if (a > t0) { t0 = a; ax = 0; }
      if (c < t1) t1 = c;
    }
    if (Math.abs(dz) < 1e-9) { if (oz < b.z0 || oz > b.z1) continue; }
    else {
      let a = (b.z0 - oz) / dz, c = (b.z1 - oz) / dz;
      if (a > c) { const t = a; a = c; c = t; }
      if (a > t0) { t0 = a; ax = 1; }
      if (c < t1) t1 = c;
    }
    if (t1 < t0 || t0 < 0.02 || t0 >= best) continue;
    best = t0; bAxis = ax;
    const hx = ox + dx * t0, hz = oz + dz * t0;
    bu = ax === 0 ? hz : hx;
  }
  return best < maxD ? { d: best, u: bu, axis: bAxis } : null;
}

/* -----------------------------------------------------------------------
   L'ÉCLAIRAGE. Ambiante + hémisphérique + LA TORCHE, qui est une lumière
   PONCTUELLE placée à 3,2 unités de haut, un peu devant le joueur — les mêmes
   valeurs que world.js/init et world.js/sync.
   -----------------------------------------------------------------------
   ⚠️ LA PREMIÈRE ÉCRITURE DE CET APERÇU DONNAIT UN FAUX DIAGNOSTIC, et c'est
   assez instructif pour être gardé. Elle éclairait le sol par une constante
   (0,85) et les murs par |cos| entre le rayon et la normale. Résultat : un sol
   éclatant sous des murs presque noirs — l'inverse exact de l'intention écrite
   dans paint.js — et j'ai failli corriger les TEXTURES pour compenser un
   défaut qui était dans l'OUTIL.

   C'est le corollaire n°5 du zip 387 encore une fois, appliqué à l'outil de
   regard : un aperçu dont le modèle d'éclairage s'écarte de celui du jeu
   mesure son propre écart. On calcule donc, comme Three.js, en un point du
   monde avec une vraie normale :

       N·L × (1 − d/portée)²

   La différence est massive : le sol, qui est loin ET rasant, retombe à sa
   place, et la profondeur du couloir revient.
   -------------------------------------------------------------------- */
const AMB = 0.30 + 0.22;                                 // ambiante + hémisphérique
let LX = 0, LY = 0, LZ = 0;                              // position de la torche
function lightAt(wx, wy, wz, nx, ny, nz) {
  const dx = LX - wx, dy = LY - wy, dz = LZ - wz;
  const d = Math.hypot(dx, dy, dz) || 1e-6;
  const ndotl = Math.max(0, (dx * nx + dy * ny + dz * nz) / d);
  const att = Math.max(0, 1 - d / CFG.TORCH_LIGHT_MAX);
  return AMB + 2.6 * ndotl * att * att;
}
const fogK = (d) => Math.min(1, Math.max(0,
  (d - CFG.FOG_NEAR_FULL) / (CFG.FOG_FAR_FULL - CFG.FOG_NEAR_FULL)));
const FOGC = [(CFG.COL_FOG >> 16) & 255, (CFG.COL_FOG >> 8) & 255, CFG.COL_FOG & 255];

function render(px, pz, ang, name, note) {
  const s = surface(W, H);
  const buf = s.px;
  const fov = CFG.FPS_FOV * Math.PI / 180;
  const planeH = Math.tan(fov / 2);
  const planeW = planeH * (W / H);
  const eye = CFG.EYE_H;
  // la torche, exactement où world.js/sync la pose
  LX = px - Math.sin(ang) * 1.4; LY = 3.2; LZ = pz - Math.cos(ang) * 1.4;

  for (let sx = 0; sx < W; sx++) {
    const cx = (sx / W) * 2 - 1;
    // direction du rayon dans le plan horizontal (ang = 0 → -Z)
    const fx = -Math.sin(ang), fz = -Math.cos(ang);
    const rx = Math.cos(ang), rz = -Math.sin(ang);
    const dx = fx + rx * cx * planeW, dz = fz + rz * cx * planeW;
    const len = Math.hypot(dx, dz);
    const ndx = dx / len, ndz = dz / len;
    const hit = cast(px, pz, ndx, ndz, CFG.FOG_FAR_FULL);
    // correction de la distorsion en tonneau : distance PERPENDICULAIRE
    const persp = (hit ? hit.d : CFG.FOG_FAR_FULL) * (ndx * fx + ndz * fz);

    for (let sy = 0; sy < H; sy++) {
      const cy = 1 - (sy / H) * 2;
      const ty = cy * planeH;
      let r, g, b, dist;

      // hauteur du mur touché, à cette distance, en unités d'écran
      const wallTop = hit ? (CFG.WALL_H - eye) / persp : 1e9;
      const wallBot = hit ? (0 - eye) / persp : -1e9;

      if (hit && ty <= wallTop && ty >= wallBot) {
        // --- un mur
        const t = hit.axis === 0 ? TEX.wall2 : TEX.wall;
        const u = hit.u / CFG.WALL_TILE;
        const wy = eye + ty * persp;                    // hauteur monde du point
        const v = 1 - wy / CFG.WALL_H;                  // une seule tuile sur la hauteur
        [r, g, b] = texel(t, u, v);
        // la normale du mur touché : ±X ou ±Z, tournée vers le rayon
        const hx = px + ndx * hit.d, hz = pz + ndz * hit.d;
        const nx = hit.axis === 0 ? (ndx > 0 ? -1 : 1) : 0;
        const nz = hit.axis === 1 ? (ndz > 0 ? -1 : 1) : 0;
        const L = lightAt(hx, wy, hz, nx, 0, nz);
        r *= L; g *= L; b *= L;
        dist = hit.d;
      } else if (ty < wallBot || (!hit && ty < 0)) {
        // --- le sol : on résout l'intersection avec le plan y = 0
        const d = -eye / ty;                            // distance perpendiculaire
        const wx = px + ndx * (d / (ndx * fx + ndz * fz));
        const wz = pz + ndz * (d / (ndx * fx + ndz * fz));
        [r, g, b] = texel(TEX.floor, wx / CFG.FLOOR_TILE, wz / CFG.FLOOR_TILE);
        const dd = Math.hypot(wx - px, wz - pz);
        const L = lightAt(wx, 0, wz, 0, 1, 0);          // normale du sol : vers le haut
        r *= L; g *= L; b *= L;
        dist = dd;
      } else {
        // --- le ciel violet au-dessus des murs
        const k = Math.min(1, Math.max(0, ty / planeH));
        r = 107 + (185 - 107) * (1 - k); g = 63 + (135 - 63) * (1 - k); b = 143 + (200 - 143) * (1 - k);
        dist = 0;
      }
      const f = fogK(dist);
      const i = (sy * W + sx) * 4;
      buf[i] = Math.min(255, r * (1 - f) + FOGC[0] * f);
      buf[i + 1] = Math.min(255, g * (1 - f) + FOGC[1] * f);
      buf[i + 2] = Math.min(255, b * (1 - f) + FOGC[2] * f);
      buf[i + 3] = 255;
    }
  }

  /* Le réticule, dessiné par-dessus : c'est la seule pièce du HUD dont la
     TAILLE compte, et on ne peut la juger que sur une image de la bonne
     définition. */
  const cxp = W / 2, cyp = H / 2;
  const put = (x, y) => { const i = ((y | 0) * W + (x | 0)) * 4; buf[i] = buf[i + 1] = buf[i + 2] = 239; };
  for (let k = 4; k < 12; k++) { put(cxp + k, cyp); put(cxp - k, cyp); put(cxp, cyp + k); put(cxp, cyp - k); }

  writePNG(path.join(OUT, `fps-${name}.png`), buf, W, H);
  console.log(`  fps-${name}.png   ${note}`);
}

console.log(`\n=== vue subjective, graine ${SEED} → tools/out/ ===\n`);
console.log(`  couloir : ${CFG.CORRIDOR.toFixed(1)} unités · murs : ${CFG.WALL_H} · œil : ${CFG.EYE_H} · champ : ${CFG.FPS_FOV}°`);
console.log(`  une tuile de mur = ${CFG.WALL_TILE} unités de large, ${CFG.WALL_H} de haut\n`);

/* On choisit les points de vue DANS le dédale plutôt qu'au hasard : l'entrée
   (ce que le joueur voit en premier, donc la seule image qu'il verra à coup
   sûr), un couloir droit, un carrefour, et le bord de la rotonde. */
const shots = [];
{
  const [ex, ez] = Rules.centerOf(CFG, m.entry.x, m.entry.y);
  shots.push([ex, ez + CFG.CELL * 0.3, 0, "entree", "ce que le joueur voit en premier"]);
}
{
  // un carrefour : la cellule du chemin qui a le plus de voisins reliés
  let best = null, bestDeg = 0;
  for (const [x, y] of m.path) {
    let deg = 0;
    for (const d of m.DIRS) if (m.linked(x, y, d)) deg++;
    if (deg > bestDeg) { bestDeg = deg; best = [x, y]; }
  }
  if (best) {
    const [wx, wz] = Rules.centerOf(CFG, best[0], best[1]);
    shots.push([wx, wz, 0, "carrefour", `${bestDeg} issues — la lisibilité d'un choix`]);
    shots.push([wx, wz, Math.PI / 2, "carrefour-ouest", "le même, tourné d'un quart"]);
  }
}
if (m.rotunda) {
  const [wx, wz] = Rules.centerOf(CFG, m.rotunda.cx, m.rotunda.cy - 2);
  shots.push([wx, wz, Math.PI, "rotonde", "la salle centrale, depuis son bord"]);
}
for (let i = 0; i < Math.min(SHOTS, shots.length); i++) render(...shots[i]);

console.log(`
LIRE CES IMAGES. Trois questions, dans cet ordre :
  1. LES PIERRES ONT-ELLES LA MÊME TAILLE d'un mur à l'autre ? (c'est ce que
     le 396 ratait, et aucune planche de texture ne pouvait le montrer)
  2. LE COULOIR EST-IL LISIBLE — voit-on où l'on peut aller, d'un coup d'œil ?
  3. LE MUR EST-IL PLAT ? S'il l'est ici, il le sera dans le jeu : le relief
     du bumpMap ne rattrape pas une texture sans matière, il la révèle.

⚠️ Ce n'est PAS une capture du jeu : pas de créatures, pas de torches murales,
pas de plafond, pas de modèle de vue, et un éclairage approché. C'est un
gabarit d'échelle et de cadrage, et c'est tout ce qu'on lui demande.
`);
