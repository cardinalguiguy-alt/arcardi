/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-25 (phase 4 de la feuille de route graphique) — L'EAU, AU PIXEL.
   ╚══════════════════════════════════════════════════════════════════════════
   Ce qui est remplacé : une tuile d'eau par CASE, un cran de profondeur par
   case (`tw.depth`), et un tramage vers le cran des voisins pour cacher la
   marche (436). Constat de l'audit du 2026-09-25 : les carrés de 16 px
   restaient visibles dans chaque transition — un tramage ATTÉNUE une marche,
   il ne la supprime pas, parce que l'information (un nombre par case) est plus
   grossière que le dessin qu'on lui demande. Même famille pour le quai (un
   bord de pierre tranché par le hachage des coins, donc « bruité »), les
   reflets (un tiret clair par case : la grille, dessinée en clair) et l'étang
   (la même eau que le port, en plus petit : son cœur se lisait en bloc).

   LE MODÈLE (décisions de Guillaume, 2026-09-25 : « reco partout ») :
   - la carte de la ville ne change jamais (graine fixe, §6 de CLAUDE.md) : la
     berge et l'eau sont donc CUITES une fois, au pixel, dans quelques canevas,
     et le rendu n'en recopie qu'un carré de 16 px par case ;
   - la profondeur est une vraie DISTANCE À LA RIVE (transformée de distance
     euclidienne exacte, au pixel), rendue en seize paliers tramés sur la
     grille du monde — le langage des lampes de la phase 3 ;
   - elle se creuse par la LUMIÈRE, comme le cratère (DESSIN.md, « ce qui
     creuse une image vue de dessus est l'éclairage d'une pente ») : la berge
     nord-ouest porte son ombre sur l'eau, la pente du fond s'éclaire au
     sud-est, et tout le projet éclaire en haut à gauche ;
   - une eau par plan d'eau : l'étang est CLAIR, fond visible ; le port et le
     fleuve sont profonds (la rampe s'étale dans les foncés, choix du §13) ; la
     passe s'ensable (turquoise sur sable) ; une anse que la carte élargit
     (`TOWN_SHELF_VAR`) devient une petite plage ;
   - un OUVRAGE reste droit (DESSIN.md) : contre la pierre, l'eau vient
     jusqu'au bord, le parement descend dedans et porte sa ligne de
     flottaison ; contre le ponton, des pieux.

   ⚠️ CE QUI N'EST PAS ICI : la COLLISION (inchangée : une case d'eau reste une
   case d'eau) et les TIRAGES du générateur (aucun : tout se lit dans des
   hachages de coordonnées, §4 de CLAUDE.md — la carte se regénère depuis sa
   graine). Les décors d'eau posés par le générateur (nénuphars, roseaux,
   pas japonais) sont des props et le restent.

   ⚠️ PUR, SAUF LA FABRIQUE DE CANEVAS (`document.createElement`, que les
   bancs simulent) : `tools/render-eau.mjs` appelle exactement ce que le jeu
   appelle (§4 : une fonction de la closure du rendu n'existe pour aucun banc).
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants.mjs";
import { townNoise } from "./fermeEngine.mjs";

const T = C.TILE;

/* ── 0. LE HACHAGE ET LES PALETTES ─────────────────────────────────────────
   `waterHash` vivait dans fermeArt.js ; il est ICI parce que la cuisson et
   les tuiles d'eau de repli doivent tirer les MÊMES variantes (le bombé des
   coins) — deux copies d'un hachage divergent en silence (§8). fermeArt
   l'importe. */
export function waterHash(cx, cy) {
  let n = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) | 0;
  n ^= n >>> 13; n = Math.imul(n, 0x5bd1e995); n ^= n >>> 15;
  return n >>> 0;
}
/* La rampe du port et du fleuve : les cinq repères du 436, INCHANGÉS (fermeArt
   en dérive encore la tuile de repli et la vasque de la fontaine). */
export const WAT_STOPS = ["#93aeb0", "#6e94ac", "#4a7ba8", "#356293", "#234771", "#183355"];
/* L'ÉTANG DU PARC : une mare claire. ⚠️ ELLE NE DESCEND JAMAIS AU BLEU DE NUIT
   du port : c'est ce qui la rendait « la même eau en plus petit », donc un
   bloc sombre au milieu d'un jardin. Le fond reste lisible partout — un
   vert-sable au bord, un bleu-vert au plus profond. */
const POND_STOPS = ["#a7c19c", "#8fb59c", "#77a79f", "#6298a0", "#528a9c", "#467c94"];
/* LA PASSE ET LES PLAGES : l'eau sur du sable. Le clair prend la couleur du
   FOND (le sable vu à travers dix centimètres d'eau), puis le turquoise, puis
   la rampe du port — le sable ne se voit plus au-delà d'un mètre. */
/* ⚠️ ELLE REJOINT LA RAMPE DU PORT AU LARGE, repère pour repère : le premier
   jet gardait un bleu plus clair jusqu'au fond, et une anse sablée éclaircissait
   l'eau PROFONDE à dix mètres de sa plage — un rectangle clair au milieu du
   port (vu au premier rendu). Le sable ne se voit qu'à travers peu d'eau. */
const SAND_STOPS = ["#c3d3ae", "#a4ccb9", "#7fbabd", "#4f8fb0", "#2b5a8a", "#183355"];
const N_LEV = 16;
function hexRGB(s) { return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; }
function rampOf(stops, n) {
  const st = stops.map(hexRGB), out = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * (st.length - 1);
    const a = Math.min(st.length - 1, t | 0), b = Math.min(st.length - 1, a + 1), f = t - a;
    out.push([0, 1, 2].map((j) => Math.round(st[a][j] + (st[b][j] - st[a][j]) * f)));
  }
  return out;
}
const mixRGB = (a, b, f) => [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * f));
const LAKE = rampOf(WAT_STOPS, N_LEV);
const POND = rampOf(POND_STOPS, N_LEV);
const SANDW = rampOf(SAND_STOPS, N_LEV);
/* Quatre rangées entre le port et le sable : la plage ne commence pas d'une
   case à l'autre, elle se trame. */
const SAND_ROWS = 4;
const LAKE_ROWS = Array.from({ length: SAND_ROWS }, (_, r) => LAKE.map((c, k) => mixRGB(c, SANDW[k], r / (SAND_ROWS - 1))));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Les matières de la berge. ⚠️ Celles de la vase et des galets sont celles du
   435 (`townShoreTile`) : la berge change de MÉCANISME (une densité fonction de
   la distance à l'eau, au pixel, au lieu de huit orientations bakées par case),
   pas de palette — Guillaume l'a validée telle quelle. */
const MUD_WET = ["#4d4a41", "#55513f", "#4a473d"];
const MUD = ["#6a6354", "#736b5b", "#5f5849"];
const PEB = ["#95918a", "#7d7973", "#a8a298", "#6b6762"];
const MOSS = ["#4a6338", "#3d5730"];
const TUFT = "#3f7a3c";
const SAND_WET = ["#9f8c5b", "#a8955f", "#96844f"];
const SAND_DAMP = ["#bba56e", "#c3ad77", "#b39e69"];
const SAND_DRY = ["#d7c38d", "#cdb982", "#dfcd9b", "#d2be87"];
const FOAM = hexRGB("#cfe4e8");
const FOAM_POND = hexRGB("#dcecdf");
/* Le parement du quai. Il regarde le SUD, donc il tourne le dos à la lumière
   (nord-ouest) : une pierre plus sombre que la dalle qu'il porte, et une ligne
   d'ombre franche sous le chaperon (la pierre de bord de `drawTownFlagTile`). */
const FACE_SHADOW = hexRGB("#46423b");
const FACE_STONE = ["#8b877e", "#817d74", "#77736b", "#6f6b64"].map(hexRGB);
const FACE_JOINT = hexRGB("#57534c");
const FACE_WET = hexRGB("#4a4f48");
const FACE_ALGAE = hexRGB("#3f5d3d");
const IRON = hexRGB("#2f2c29"), IRON_LIT = hexRGB("#6d6760");
const WOOD = hexRGB("#4e3826"), WOOD_LIT = hexRGB("#6f5034"), WOOD_DARK = hexRGB("#3a2a1c");
const EARTH = ["#5f503c", "#6d5c45"].map(hexRGB);
const ROCK = ["#8d887f", "#7e796f", "#9a958a"].map(hexRGB), ROCK_LIT = hexRGB("#b3aea2"), ROCK_DARK = hexRGB("#5f5b54");

/* Hauteur du parement, en px d'art, SOUS la pierre de bord. Le port a un vrai
   quai ; la terrasse du belvédère, au bord de l'étang, un simple muret. */
export const QUAY_FACE_H = 6;
const POND_FACE_H = 4;

/* ── 1. LA TRANSFORMÉE DE DISTANCE (Felzenszwalb & Huttenlocher) ───────────
   Exacte (euclidienne), en O(n) par ligne puis par colonne. ⚠️ C'est la
   distance euclidienne qui fait des lignes de niveau RONDES ; la vague à
   quatre voisins du 435 faisait des losanges, le chanfrein 5-7 du 436 des
   octogones — sur seize paliers au pixel, les deux se liraient. */
const EDT_INF = 1e20;
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -EDT_INF; z[1] = EDT_INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = EDT_INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}
/* `g` : 0 sur les sources, EDT_INF ailleurs ; rendu en distances AU CARRÉ.
   Générateur : il rend la main toutes les 64 colonnes (§ 3, la cuisson se
   découpe en tranches). */
function* edt2d(g, W, H) {
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) {
    if ((x & 63) === 63) yield;
    for (let y = 0; y < H; y++) f[y] = g[y * W + x];
    edt1d(f, H, d, v, z);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    if ((y & 63) === 63) yield;
    const o = y * W;
    for (let x = 0; x < W; x++) f[x] = g[o + x];
    edt1d(f, W, d, v, z);
    for (let x = 0; x < W; x++) g[o + x] = d[x];
  }
}

/* ── 2. LE TRAIT D'EAU, CASE PAR CASE ───────────────────────────────────────
   Exactement celui du 435 (`townWaterTile`) : l'isocontour bilinéaire des
   quatre coins, le bombé qui gondole l'intérieur sans déplacer les sorties,
   la flaque d'une case isolée. La rive naturelle NE BOUGE PAS d'un pixel.
   Deux exceptions, toutes deux des OUVRAGES :
   - un coin dont toutes les cases sèches sont BÂTIES (quai, ponton, allée)
     est mouillé : l'eau vient jusqu'à la pierre. Le hachage à deux coins, juste
     sur une rive meuble, taillait des festons dans un quai — le « bruit » que
     l'audit a vu à son pied ;
   - hors de la carte, la case prolonge le bord (le fleuve SORT du monde) : le
     435 y voyait de la terre, d'où une bande de galets sur le dernier rang. */
/* ⚠️ UNE ALLÉE MEUBLE (gravier, terre battue) N'EST PAS UN OUVRAGE : au bord de
   l'eau elle garde une rive naturelle. Seules la pierre, les pavés, le goudron,
   les briques, les marches et le bois d'un pont tiennent l'eau droite — le
   premier jet comptait toute allée, et l'étang du parc se coupait à la règle
   contre son sentier de gravier (vu au rendu). */
const HARD_GROUND = new Set([C.G_PATH_STONE, C.G_BRIDGE, C.G_TOWN_STAIR]);
const hardRoad = (tw, i) => tw.road && tw.road[i] !== C.TR_GRAVEL && tw.road[i] !== C.TR_NONE;
function cellFns(tw) {
  const W = tw.w, H = tw.h, G = tw.ground, F = C.TOWN_FOUNTAIN;
  const cx = (x) => (x < 0 ? 0 : x >= W ? W - 1 : x), cy = (y) => (y < 0 ? 0 : y >= H ? H - 1 : y);
  const inFtn = (x, y) => x >= F.x && x < F.x + 2 && y >= F.y && y < F.y + 2;
  const gAt = (x, y) => G[cy(y) * W + cx(x)];
  const water = (x, y) => gAt(x, y) === C.G_WATER && !inFtn(cx(x), cy(y));
  const hard = (x, y) => {
    const i = cy(y) * W + cx(x), g = G[i];
    return HARD_GROUND.has(g) || (g === C.G_PATH && hardRoad(tw, i)) || inFtn(cx(x), cy(y));
  };
  const corner = (px, py) => {
    let n = 0, h = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      if (water(px + dx, py + dy)) n++; else if (hard(px + dx, py + dy)) h++;
    }
    if (n >= 3) return true;
    if (n >= 1 && n + h === 4) return true;
    if (n <= 1) return false;
    return (waterHash(px, py) & 1) === 1;
  };
  return { W, H, gAt, water, hard, corner, hardRoadAt: (x, y) => gAt(x, y) === C.G_PATH && hardRoad(tw, cy(y) * W + cx(x)) };
}
/* L'isocontour d'UNE case, au pixel : `cfg` (les quatre coins, NO·NE·SE·SO →
   bits 1·2·4·8), `vr` (0 ou 1 : la variante qui bombe ou creuse). Rend la
   marge au seuil (> 0 : dedans). ⚠️ Une seule écriture pour le trait d'eau
   (cuisson) et les plaques du gazon (fermeArt) : la même courbe, deux matières. */
export function contourMargin(cfg, vr, px, py) {
  if (cfg === 15) return 1;
  if (cfg === 0) return 0.5 - ((px - 7.5) * (px - 7.5) + (py - 7.5) * (py - 7.5)) / 60;
  const c00 = cfg & 1 ? 1 : 0, c10 = cfg & 2 ? 1 : 0, c11 = cfg & 4 ? 1 : 0, c01 = cfg & 8 ? 1 : 0;
  const u = (px + 0.5) / T, v = (py + 0.5) / T;
  const f = c00 * (1 - u) * (1 - v) + c10 * u * (1 - v) + c01 * (1 - u) * v + c11 * u * v;
  const bump = 16 * u * (1 - u) * v * (1 - v);
  return f - (0.5 + (vr ? 0.13 : -0.13) * (bump > 0 ? bump : 0));
}
/* Remplit `wet` (0/1) pour la case (x, y) à l'origine (ox, oy) du tampon. */
function wetCell(fn, x, y, isWater, wet, RW, ox, oy) {
  const cfg = (fn.corner(x, y) ? 1 : 0) | (fn.corner(x + 1, y) ? 2 : 0) | (fn.corner(x + 1, y + 1) ? 4 : 0) | (fn.corner(x, y + 1) ? 8 : 0);
  if (!isWater && cfg === 0) return;
  const vr = waterHash(x * 3 + 1, y * 7 + 2) & 1;
  for (let py = 0; py < T; py++) {
    const row = (oy + py) * RW + ox;
    for (let px = 0; px < T; px++) if (contourMargin(cfg, vr, px, py) >= 0) wet[row + px] = 1;
  }
}

/* ── 3. LA CUISSON ─────────────────────────────────────────────────────────
   Une RÉGION par plan d'eau (composante connexe des cases d'eau et de berge),
   deux canevas par région : la BERGE (vase, sable, galets, parement, pieux) et
   l'EAU seule. ⚠️ DEUX CANEVAS ET PAS UN : l'alpha du second EST le masque de
   l'eau, et c'est lui qui découpe les reflets (§ 5) — un reflet peint sur la
   vase ou sur le parement serait un reflet posé sur de la terre. */
/* ⚠️⚠️ LA CUISSON SE DÉCOUPE EN TRANCHES, ELLE NE FIGE JAMAIS LE JEU. D'un
   bloc, elle prend un demi-seconde sur le port (mesuré sous Node) : un arrêt
   sur image, et Guillaume réclame la fluidité en permanence. C'est donc un
   GÉNÉRATEUR qui rend la main entre deux étapes et toutes les quelques
   dizaines de rangées ; le jeu le pompe quelques millisecondes par image
   (`townWaterBakeStep`) dès que la carte de la ville existe — elle est tirée
   au montage, avec les sprites —, et l'eau par case de la 436 sert de repli
   tant que la cuisson n'est pas finie. `townWaterBake` (d'un bloc) reste pour
   les bancs, qui n'ont pas d'images à préserver. */
const BAKES = new WeakMap();
function bakeState(S, tw) {
  let st = BAKES.get(tw);
  if (!st) { st = { bake: undefined, gen: buildBake(S, tw) }; BAKES.set(tw, st); }
  return st;
}
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function pump(st, deadline) {
  try {
    do {
      const r = st.gen.next();
      if (r.done) { st.bake = r.value || null; return; }
    } while (nowMs() < deadline);
  } catch (e) { console.error("[EAU] cuisson impossible, repli sur les tuiles", e); st.bake = null; }
}
export function townWaterBake(S, tw) {
  if (!tw || !tw.ground || typeof document === "undefined") return null;
  const st = bakeState(S, tw);
  while (st.bake === undefined) pump(st, Infinity);
  return st.bake;
}
export function townWaterBakeStep(S, tw, budgetMs) {
  if (!tw || !tw.ground || !S || typeof document === "undefined") return null;
  const st = bakeState(S, tw);
  if (st.bake === undefined) pump(st, nowMs() + budgetMs);
  return st.bake || null;
}
/* La cuisson si elle est FINIE, sinon rien : c'est ce que lisent le rendu et
   la pluie (jamais de cuisson déclenchée au milieu d'une image). */
export function townWaterBakeReady(tw) {
  const st = tw ? BAKES.get(tw) : null;
  return st && st.bake ? st.bake : null;
}

function makeCv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function* buildBake(S, tw) {
  const t0 = nowMs();
  const fn = cellFns(tw);
  const { W, H } = fn;
  // Les cases à cuire : l'eau (hors fontaine, qui a sa vasque) et la berge meuble.
  const kind = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (fn.water(x, y)) kind[i] = 1;
    else if (tw.shore && (tw.shore[i] === 1 || tw.shore[i] === 2)) kind[i] = 2;
  }
  // Les régions : composantes 8-connexes.
  const regOf = new Int16Array(W * H).fill(-1);
  const regions = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (!kind[i0] || regOf[i0] >= 0) continue;
    const id = regions.length, stack = [i0];
    regOf[i0] = id;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, nWater = 0, sx = 0, sy = 0;
    while (stack.length) {
      const j = stack.pop(), x = j % W, y = (j / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (kind[j] === 1) { nWater++; sx += x; sy += y; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (kind[k] && regOf[k] < 0) { regOf[k] = id; stack.push(k); }
      }
    }
    regions.push({ id, x0, y0, x1, y1, nWater, mx: nWater ? sx / nWater : 0, my: nWater ? sy / nWater : 0 });
  }
  const park = C.TOWN_PARK;
  const out = { regions: [], regOf, cellKind: kind, W, H };
  for (const r of regions) {
    if (!r.nWater) { out.regions.push(null); continue; }       // une berge sans eau : rien à cuire
    // ⚠️ Par le CENTRE de son eau, pas par sa boîte : la berge du lobe nord de
    // l'étang déborde d'une case au-dessus du parc, et le premier jet l'a prise
    // pour un morceau du port.
    const isPond = r.mx >= park.x && r.mx < park.x + park.w && r.my >= park.y && r.my < park.y + park.h;
    out.regions.push(yield* bakeRegion(S, tw, fn, kind, regOf, r, isPond));
    yield;
  }
  out.ms = nowMs() - t0;
  return out;
}

function* bakeRegion(S, tw, fn, kind, regOf, r, isPond) {
  const { W } = fn;
  // Le domaine : la boîte de la région, plus une case de terre autour (les
  // sources de la distance), bornée à la carte.
  const bx0 = Math.max(0, r.x0 - 1), by0 = Math.max(0, r.y0 - 1);
  const bx1 = Math.min(fn.W - 1, r.x1 + 1), by1 = Math.min(fn.H - 1, r.y1 + 1);
  const cw = bx1 - bx0 + 1, ch = by1 - by0 + 1;
  const RW = cw * T, RH = ch * T, N = RW * RH;
  const ox = bx0 * T, oy = by0 * T;          // origine du domaine, en px monde
  const inReg = (x, y) => regOf[y * W + x] === r.id;
  const inRegOrWater = (x, y) => x < 0 || y < 0 || x >= fn.W || y >= fn.H || inReg(x, y) || fn.water(x, y);

  // 3.1 — le trait d'eau et les classes de pixels.
  // cls : 0 terre hors berge · 1 berge meuble · 2 bâti (case dure ou ouvrage) · 3 eau
  const wet = new Uint8Array(N), cls = new Uint8Array(N), struct = new Uint8Array(N);
  const S_FACE = 1, S_EARTH = 2, S_PILE = 3, S_DECK = 4, S_RING = 5, S_LADDER = 6, S_WATERLINE = 7;
  // L'ombre d'un ouvrage SUR l'eau : ces pixels restent de l'eau (ils gardent
  // leur classe et leur trait), seule leur valeur descend.
  const S_SHADOW1 = 8, S_SHADOW2 = 9;
  const pier = C.TOWN_PIER;
  const inPier = (x, y) => x >= pier.x && x < pier.x + pier.w && y >= pier.y && y < pier.y + pier.h && fn.gAt(x, y) === C.G_BRIDGE;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (x === bx0 && ((y - by0) & 3) === 3) yield;
    const i = y * W + x, cx = (x - bx0) * T, cy = (y - by0) * T;
    const mine = inReg(x, y);
    const k = mine ? kind[i] : 0;
    if (k === 1 || (k === 2 && tw.shore && tw.shore[i] === 1)) wetCell(fn, x, y, k === 1, wet, RW, cx, cy);
    const base = fn.hard(x, y) ? 2 : (k ? 1 : 0);
    for (let py = 0; py < T; py++) {
      const row = (cy + py) * RW + cx;
      for (let px = 0; px < T; px++) cls[row + px] = wet[row + px] ? 3 : base;
    }
  }
  yield;
  // 3.2 — les ouvrages, posés SUR les cases d'eau qui les bordent.
  const faceH = isPond ? POND_FACE_H : QUAY_FACE_H;
  const cellTop = new Uint8Array(cw * ch);    // première rangée d'eau libre sous un ouvrage
  const setStruct = (i, s) => { struct[i] = s; wet[i] = 0; cls[i] = 2; };
  // La case de l'échelle : deux cases à l'ouest du ponton (on y descend du quai
  // vers les barques, pas au milieu de la promenade).
  const ladderX = pier.x - 3;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (!inReg(x, y) || kind[y * W + x] !== 1) continue;
    const cx = (x - bx0) * T, cy = (y - by0) * T, ci = (y - by0) * cw + (x - bx0);
    const gN = fn.gAt(x, y - 1);
    if (gN === C.G_PATH_STONE) {
      // LE PAREMENT : il descend dans l'eau, sur toute la largeur de la case.
      for (let py = 0; py < faceH; py++) for (let px = 0; px < T; px++) setStruct((cy + py) * RW + cx + px, S_FACE);
      for (let px = 0; px < T; px++) { const i = (cy + faceH) * RW + cx + px; if (wet[i]) struct[i] = S_WATERLINE; }
      cellTop[ci] = faceH + 1;
      // Les anneaux d'amarrage, un toutes les cinq cases environ, jamais sur
      // l'échelle ni contre le ponton.
      if (!isPond && x !== ladderX && Math.abs(x - pier.x) > 1 && Math.abs(x - (pier.x + pier.w - 1)) > 1 && waterHash(x * 5 + 1, 77) % 5 === 0) {
        // Un anneau de fer, 4 × 3 : un « O » couché sur la pierre, pas une croix.
        const rx = cx + 6, ry = cy + 1;
        for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]]) struct[(ry + dy) * RW + rx + dx] = S_RING;
      }
      if (!isPond && x === ladderX) {
        for (let py = 0; py < faceH + 5; py++) for (const px of [5, 10]) setStruct((cy + py) * RW + cx + px, S_LADDER);
        for (let py = 1; py < faceH + 5; py += 2) for (let px = 6; px < 10; px++) setStruct((cy + py) * RW + cx + px, S_LADDER);
      }
    } else if (fn.hardRoadAt(x, y - 1) || gN === C.G_TOWN_STAIR) {
      // Une rue pavée au bord de l'eau : un petit talus de terre, pas un mur.
      for (let py = 0; py < 2; py++) for (let px = 0; px < T; px++) setStruct((cy + py) * RW + cx + px, S_EARTH);
      cellTop[ci] = 2;
    }
    // LE PONTON : pieux sur les côtés, tête du tablier au sud, ombre à l'est.
    if (!isPond) {
      /* Les pieux dépassent du flanc du tablier : une tête éclairée, un fût, une
         ligne d'eau sombre. Quatre rangées au-dessus de l'eau, pas trois — à
         trois, seule la tête se lisait (vu au premier rendu). */
      if (inPier(x + 1, y) && (y - pier.y) % 2 === 1) {               // pieu contre le flanc ouest du ponton
        for (let py = 4; py < 9; py++) for (let px = 12; px < 16; px++) setStruct((cy + py) * RW + cx + px, S_PILE);
      }
      if (inPier(x - 1, y) && (y - pier.y) % 2 === 1) {               // pieu contre le flanc est
        for (let py = 4; py < 9; py++) for (let px = 0; px < 4; px++) setStruct((cy + py) * RW + cx + px, S_PILE);
      }
      if (inPier(x - 1, y)) {                                          // l'ombre du tablier, portée à l'est (lumière du nord-ouest)
        for (let py = 0; py < T; py++) for (let px = 0; px < 4; px++) { const i = (cy + py) * RW + cx + px; if (wet[i]) struct[i] = px < 3 ? S_SHADOW2 : S_SHADOW1; }
      }
      if (inPier(x, y - 1)) {                                          // la tête du tablier, au sud
        for (let py = 0; py < 3; py++) for (let px = 0; px < T; px++) setStruct((cy + py) * RW + cx + px, S_DECK);
        const west = !inPier(x - 1, y - 1), east = !inPier(x + 1, y - 1);
        for (let py = 3; py < 6; py++) for (let px = 0; px < T; px++) { const i = (cy + py) * RW + cx + px; if (wet[i]) struct[i] = py < 5 ? S_SHADOW2 : S_SHADOW1; }
        for (let py = 3; py < 8; py++) {
          if (west) for (let px = 1; px < 4; px++) setStruct((cy + py) * RW + cx + px, S_PILE);
          if (east) for (let px = 12; px < 15; px++) setStruct((cy + py) * RW + cx + px, S_PILE);
        }
        cellTop[ci] = 3;
      }
    }
  }

  // 3.3 — les deux distances. `dIn` : de l'eau à la RIVE MEUBLE (un quai n'est
  // pas un haut-fond : un port est profond au pied de son mur) ; `dOut` : de
  // la berge à l'eau.
  const dIn = new Float32Array(N), dOut = new Float32Array(N);
  /* ⚠️ LA SOURCE DE `dIn` EST LA BERGE MEUBLE DE CETTE RÉGION (classe 1), PAS
     « TOUTE TERRE ». Premier jet : l'herbe au-delà du quai comptait aussi — la
     distance mesurée au pied du mur était celle de la PELOUSE, deux cases plus
     haut, et l'eau du port se rangeait en bandes droites parallèles au quai
     (vu au premier rendu). Le quai sépare l'eau de ce pré : ce n'est pas sa
     rive. */
  for (let i = 0; i < N; i++) { dIn[i] = cls[i] === 1 ? 0 : EDT_INF; dOut[i] = wet[i] ? 0 : EDT_INF; }
  /* ⚠️ HORS DE LA CARTE, PAS DE SOURCE : le domaine est borné à la carte, et
     l'eau qui touche le bord (le fleuve qui sort, le lac au sud) continue au
     large. Poser une rive sur le dernier rang pâlirait tout le bord du monde. */
  yield* edt2d(dIn, RW, RH);
  yield* edt2d(dOut, RW, RH);

  yield;
  // 3.4 — les champs : largeur du haut-fond, sable, passe.
  const shelfPer = C.TOWN_SHELF_PER, neckX = C.TOWN_RIVER_NECK_X, neckHalf = C.TOWN_RIVER_NECK_HALF;
  /* ⚠️ LES BRUITS SE LISENT SUR UNE GRILLE DE 4 px, INTERPOLÉE. Ils sont lisses
     à l'échelle de la case (périodes de deux cases et plus) : les évaluer au
     pixel coûtait l'essentiel de la cuisson (un demi-million d'appels par bruit
     sur le port) pour un résultat identique à l'œil. */
  const coarse = (per, salt) => {
    const st = 4, gw = Math.ceil(RW / st) + 2, gh = Math.ceil(RH / st) + 2, g = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) g[gy * gw + gx] = townNoise((ox + gx * st) / T, (oy + gy * st) / T, per, salt);
    return (wx, wy) => {
      const fx = (wx - ox) / st, fy = (wy - oy) / st;
      const x0 = Math.max(0, Math.min(gw - 2, fx | 0)), y0 = Math.max(0, Math.min(gh - 2, fy | 0));
      const tx = fx - x0, ty = fy - y0, a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    };
  };
  const nShelf = coarse(shelfPer, 5); yield;
  const nWarp = coarse(6, 29); yield;
  const nBar = coarse(4.5, 23), nRipPer = coarse(3, 17), nRipMask = coarse(2, 19); yield;
  /* Une plage ne se pose pas au pied d'un quai : un port n'a pas de sable
     contre sa pierre. ⚠️ PAR UNE DISTANCE CONTINUE, PAS « À TROIS CASES » :
     décidé case par case, le sable s'arrêtait sur une ligne droite, verticale,
     au milieu de l'eau (vu au deuxième rendu) — la grille, encore, redessinée
     par une règle. La distance se mesure À LA CASE (elle ne sert qu'à éteindre
     une plage sur deux à quatre cases) puis s'interpole au pixel : une
     transformée de plus au pixel coûtait un dixième de la cuisson. */
  const dsCell = new Float32Array(cw * ch);
  for (let cy2 = 0; cy2 < ch; cy2++) for (let cx2 = 0; cx2 < cw; cx2++) dsCell[cy2 * cw + cx2] = fn.gAt(bx0 + cx2, by0 + cy2) === C.G_PATH_STONE ? 0 : EDT_INF;
  yield* edt2d(dsCell, cw, ch);
  for (let k = 0; k < cw * ch; k++) dsCell[k] = Math.sqrt(dsCell[k]) * T;
  const stoneDist = (xx, yy) => {
    const fx = Math.max(0, Math.min(cw - 1.001, (xx + 0.5) / T - 0.5)), fy = Math.max(0, Math.min(ch - 1.001, (yy + 0.5) / T - 0.5));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
    const x1 = Math.min(cw - 1, x0 + 1), y1 = Math.min(ch - 1, y0 + 1);
    const a = dsCell[y0 * cw + x0], b = dsCell[y0 * cw + x1], c = dsCell[y1 * cw + x0], d = dsCell[y1 * cw + x1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  /* Les champs, une fois par pixel utile (eau ou berge), rangés dans des
     tableaux : les deux boucles de couleur les relisent.
     - le PLATEAU (la largeur du haut-fond, 437) et la PLAGE : même bruit, même
       sel que `TOWN_SHELF_VAR` dans le générateur — l'anse que la carte élargit
       est celle qui s'ensable ;
     - la PASSE, déformée par un bruit lent (±4 cases). ⚠️ Fonction de x seul,
       sa ligne de niveau était une verticale — et sur le banc, où la profondeur
       ne dit plus rien, c'est elle seule qui rangeait le sable : une couture
       droite, en travers du fleuve (vu au cinquième rendu). Son exponentielle
       ne s'évalue qu'à moins de trente-six cases de la passe (au-delà, elle
       vaut moins d'un centième). */
  const shelfPx = new Float32Array(N), beachF = new Float32Array(N), passeS = new Float32Array(N), passeD = new Float32Array(N);
  for (let yy = 0; yy < RH; yy++) {
    if ((yy & 15) === 15) yield;
    for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    if (!wet[i] && cls[i] !== 1) continue;
    const wx = ox + xx, wy = oy + yy;
    const ns = nShelf(wx, wy);
    shelfPx[i] = Math.max(0.5, C.TOWN_WATER_SHELF * (1 + C.TOWN_SHELF_VAR * ns)) * T;
    if (isPond) continue;
    if (ns > 0.30) beachF[i] = smooth(0.30, 0.62, ns) * smooth(2 * T, 4.5 * T, stoneDist(xx, yy));
    const dx = wx / T - neckX;
    if (dx > -36 && dx < 36) {
      const q = dx + 4 * nWarp(wx, wy);
      passeS[i] = Math.exp(-(q * q) / ((neckHalf * 1.1) * (neckHalf * 1.1)));
      passeD[i] = Math.exp(-(q * q) / ((neckHalf * 1.25) * (neckHalf * 1.25)));
    }
  }
  }
  /* Le sable d'un pixel. ⚠️ Sous l'eau, celui d'une plage ne se lit que sur son
     haut-fond (`nearShore` : 1 au bord, 0 au-delà du plateau), et celui de la
     passe à travers peu d'eau (`depth`) — sans ce second facteur, ses rangées
     se découpaient en verticales elles aussi. */
  const sandOf = (i, nearShore, depth) => Math.max(beachF[i] * (nearShore == null ? 1 : nearShore),
    passeS[i] * (depth == null ? 1 : 1 - smooth(0.22, 0.55, depth)));

  yield;
  // 3.5 — la profondeur, au pixel : un haut-fond (la largeur modulée du 437),
  // puis une lente descente dans les foncés (§13 : « plus progressive dans le
  // registre foncé »).
  const v = new Float32Array(N);
  const DEEP = (isPond ? 2.2 : 3.6) * T;
  for (let yy = 0; yy < RH; yy++) {
    if ((yy & 15) === 15) yield;
    for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    if (!wet[i]) continue;
    const wx = ox + xx, wy = oy + yy;
    const d = Math.sqrt(dIn[i]);
    const shelf = shelfPx[i];
    const a = clamp01((d - 2) / shelf), b = clamp01((d - 2 - shelf) / DEEP);
    let val = 0.56 * a + 0.44 * b;
    /* La passe s'ensable. ⚠️ PAS PAR UN PLAFOND FONCTION DE x SEUL : le premier
       jet (`min(val, 1 − 0,66·passe(x))`) rangeait les paliers en bandes
       VERTICALES à travers le fleuve (vu au quatrième rendu) — la ligne de niveau
       d'une fonction de x est une verticale. La profondeur y est RÉDUITE (elle
       garde la forme des rives), et des BANCS de sable, un bruit lent, la
       relèvent par plaques. */
    const ps = passeD[i];
    if (ps > 0.01) {
      const bar = smooth(0.05, 0.55, nBar(wx, wy));
      val = Math.max(0, val * (1 - 0.55 * ps) - 0.16 * ps * bar);
    }
    v[i] = val;
  }
  }

  /* ⚠️ LA PROFONDEUR EST LISSÉE AVANT D'ÊTRE ÉCLAIRÉE. Une distance au bord a
     des ARÊTES (l'axe médian : là où deux rives sont à égale distance), et sa
     pente y change de sens d'un pixel à l'autre — éclairée telle quelle,
     l'étang sortait taillé en facettes, un cristal (vu au premier rendu). Une
     convolution NORMALISÉE sur les seuls pixels mouillés (la berge ne tire pas
     l'eau vers zéro, elle ne compte pas) arrondit la cuvette sans déplacer son
     haut-fond. Deux passes de boîte ≈ une gaussienne. */
  {
    const rad = isPond ? 5 : 4, tmp = new Float32Array(N), acc = new Float32Array(N);
    const pass = (src, dst, horiz) => {
      for (let a = 0; a < (horiz ? RH : RW); a++) {
        let sum = 0, cnt = 0;
        const len = horiz ? RW : RH, at = (b) => (horiz ? a * RW + b : b * RW + a);
        for (let b = -rad; b <= rad; b++) if (b >= 0 && b < len && wet[at(b)]) { sum += src[at(b)]; cnt++; }
        for (let b = 0; b < len; b++) {
          const i = at(b);
          dst[i] = wet[i] && cnt ? sum / cnt : src[i];
          const out = b - rad, inn = b + rad + 1;
          if (out >= 0 && wet[at(out)]) { sum -= src[at(out)]; cnt--; }
          if (inn < len && wet[at(inn)]) { sum += src[at(inn)]; cnt++; }
        }
      }
    };
    for (let k = 0; k < 2; k++) { pass(v, tmp, true); yield; pass(tmp, acc, false); v.set(acc); yield; }
  }

  yield;
  // 3.6 — la couleur de l'eau.
  const [wc, wg] = makeCv(RW, RH), [bc, bg] = makeCv(RW, RH);
  const wim = wg.getImageData(0, 0, RW, RH), bim = bg.getImageData(0, 0, RW, RH);
  const WD = wim.data, BD = bim.data;
  const put = (D, i, c, a) => { const o = i * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = a == null ? 255 : a; };
  const lvl = new Uint8Array(N).fill(255);
  const vAt = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= RW || yy >= RH) return -1; const j = yy * RW + xx; return wet[j] ? v[j] : -1; };
  const softDry = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= RW || yy >= RH) return false; const c = cls[yy * RW + xx]; return c === 1 || c === 0; };
  const K_SLOPE = isPond ? 5.5 : 3.2;         // la pente du fond, en paliers par unité de gradient
  /* ⚠️⚠️ DES PALIERS FRANCS ET UNE COUTURE TRAMÉE D'UN PIXEL, PAS UNE TRAME
     SUR TOUTE LA SURFACE. Premier jet : un Bayer 4×4 sur chaque pixel — de loin
     un dégradé, de près un quadrillage régulier sur toute l'eau (vu au
     troisième rendu). C'est la règle de DESSIN.md (« un tramage sert une
     pointe, jamais une surface », 446) et c'est la manière des lampes de la
     phase 3 : un palier est un aplat, et seule sa lisière se trame, en damier,
     sur un pixel. Deux passes : le palier « brut » de chaque pixel, puis la
     couture (un pixel dont un voisin est un palier plus profond le prend une
     fois sur deux). Le sable se range en rangées de la même façon. */
  const Lraw = new Uint8Array(N), Rraw = new Uint8Array(N), sandV = new Float32Array(N);
  for (let yy = 0; yy < RH; yy++) {
    if ((yy & 15) === 15) yield;
    for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    if (!wet[i]) continue;
    const wx = ox + xx, wy = oy + yy;
    let val = v[i];
    // La pente du fond, éclairée d'en haut à gauche : la paroi nord-ouest d'une
    // cuvette tourne le dos à la lumière (plus sombre), la paroi sud-est lui
    // fait face. Différences centrées ; un voisin sec compte comme le pixel.
    const vl = vAt(xx - 1, yy), vr = vAt(xx + 1, yy), vu = vAt(xx, yy - 1), vd = vAt(xx, yy + 1);
    const gx = ((vr < 0 ? val : vr) - (vl < 0 ? val : vl)) * 0.5, gy = ((vd < 0 ? val : vd) - (vu < 0 ? val : vu)) * 0.5;
    val += K_SLOPE * (gx + gy);
    // L'ombre portée de la berge nord-ouest, sur trois pixels, et celle des
    // ouvrages (le tablier du ponton).
    let sh = 0;
    for (let j = 1; j <= 3; j++) if (softDry(xx - j, yy - j)) { sh = j <= 2 ? 2 : 1; break; }
    if (struct[i] === S_SHADOW2) sh = Math.max(sh, 3); else if (struct[i] === S_SHADOW1) sh = Math.max(sh, 1);
    Lraw[i] = Math.max(0, Math.min(N_LEV - 1, Math.round(val * (N_LEV - 1) + sh)));
    const s = sandOf(i, clamp01(1 - Math.sqrt(dIn[i]) / (1.6 * C.TOWN_WATER_SHELF * T)), v[i]);
    sandV[i] = s;
    Rraw[i] = Math.max(0, Math.min(SAND_ROWS - 1, Math.round(s * (SAND_ROWS - 1))));
  }
  }
  for (let yy = 0; yy < RH; yy++) {
    if ((yy & 15) === 15) yield;
    for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx;
    if (!wet[i]) continue;
    const wx = ox + xx, wy = oy + yy;
    let L = Lraw[i], row = Rraw[i];
    if ((wx + wy) & 1) {
      let up = false, upR = false;
      const seam = (j) => { if (j >= 0 && j < N && wet[j]) { if (Lraw[j] > L) up = true; if (Rraw[j] > row) upR = true; } };
      seam(i - 1); seam(i + 1); seam(i - RW); seam(i + RW);
      if (up) L++;
      if (upR) row++;
    }
    const s = sandV[i];
    let col = isPond ? POND[L] : LAKE_ROWS[row][L];
    // Le liseré : l'écume en paquets du côté éclairé (sud/est), la ligne
    // sombre du côté de l'ombre — seulement contre une rive MEUBLE.
    // (Voisinage déroulé : un tableau littéral par pixel coûtait le tiers de la cuisson.)
    let nx = 0, ny = 0, edgeSoft = false, c2;
    if (xx + 1 < RW && ((c2 = cls[i + 1]) === 1 || c2 === 0)) { nx += 1; edgeSoft = true; }
    if (xx > 0 && ((c2 = cls[i - 1]) === 1 || c2 === 0)) { nx -= 1; edgeSoft = true; }
    if (yy + 1 < RH && ((c2 = cls[i + RW]) === 1 || c2 === 0)) { ny += 1; edgeSoft = true; }
    if (yy > 0 && ((c2 = cls[i - RW]) === 1 || c2 === 0)) { ny -= 1; edgeSoft = true; }
    if (edgeSoft) {
      if (nx + ny > 0) { if (waterHash(wx, wy * 3 + 1) % 3 !== 0) col = isPond ? FOAM_POND : FOAM; }
      else col = (isPond ? POND : LAKE)[Math.min(N_LEV - 1, L + 5)];
    } else if (struct[i] === S_WATERLINE) {
      col = LAKE[Math.min(N_LEV - 1, L + 4)];            // la ligne de flottaison : l'eau sombre au pied du mur
    }
    // Le fond, vu à travers l'eau peu profonde.
    const shallow = v[i];
    if (isPond) {
      const hc = waterHash(((wx / 5) | 0) * 7 + 3, ((wy / 5) | 0) * 11 + 5);
      if (shallow < 0.45 && hc % 100 < 7) {
        const qx = ((wx / 5) | 0) * 5 + ((hc >>> 7) % 3), qy = ((wy / 5) | 0) * 5 + ((hc >>> 9) % 3);
        const w2 = 1 + ((hc >>> 11) & 1);
        if (wx >= qx && wx < qx + w2 + 1 && wy >= qy && wy < qy + w2) {
          const pc = hexRGB(PEB[(hc >>> 13) % PEB.length]);
          col = mixRGB(pc, col, 0.35 + 0.55 * shallow);
        }
      }
      const hw = waterHash(((wx / 7) | 0) * 13 + 1, ((wy / 9) | 0) * 17 + 9);
      if (shallow > 0.22 && shallow < 0.9 && hw % 100 < 6) {
        const sx0 = ((wx / 7) | 0) * 7 + 2 + ((hw >>> 8) % 3), sy0 = ((wy / 9) | 0) * 9 + 1;
        const len = 4 + ((hw >>> 10) % 4), lean = ((hw >>> 13) % 3) - 1;
        const k = wy - sy0;
        if (k >= 0 && k < len && wx === sx0 + ((lean * k) / 3 | 0)) col = mixRGB(hexRGB("#3f6a45"), col, 0.40 + 0.45 * shallow);
      }
    } else if (s > 0.35 && shallow < 0.4) {
      // Les rides du sable sous la passe : de fines lignes plus claires, qui
      // suivent le courant en ondulant. ⚠️ Leur pas VARIE (bruit lent) et elles
      // se rompent : un pas constant se lisait comme un papier peint (vu au
      // premier rendu), exactement la leçon de la période (DESSIN.md).
      const per = 6.5 + 2.2 * nRipPer(wx, wy);
      const rip = ((wx * 0.55 + wy * 0.18 + 2.4 * Math.sin(wy * 0.23 + wx * 0.031)) / per) % 1;
      if ((rip < 0 ? rip + 1 : rip) < 0.09 && nRipMask(wx, wy) > -0.25) col = LAKE_ROWS[row][Math.max(0, L - 1)];
    } else if (shallow < 0.28) {
      const hc = waterHash(((wx / 6) | 0) * 5 + 2, ((wy / 6) | 0) * 9 + 7);
      if (hc % 100 < 9 && (wx % 6) === (hc >>> 8) % 5 && (wy % 6) === (hc >>> 11) % 5) col = mixRGB(hexRGB(PEB[(hc >>> 14) % PEB.length]), col, 0.55);
    }
    put(WD, i, col);
    lvl[i] = L;
  }
  }

  yield;
  // 3.7 — la berge et les ouvrages (le second canevas).
  const cellOf = (xx, yy) => ((yy / T) | 0) * cw + ((xx / T) | 0);
  for (let yy = 0; yy < RH; yy++) {
    if ((yy & 15) === 15) yield;
    for (let xx = 0; xx < RW; xx++) {
    const i = yy * RW + xx, wx = ox + xx, wy = oy + yy;
    const st = struct[i];
    if (st) {
      if (st === S_WATERLINE || st === S_SHADOW1 || st === S_SHADOW2) continue;
      const cyy = yy % T;
      let col;
      if (st === S_FACE || st === S_RING) {
        if (cyy === 0) col = FACE_SHADOW;
        else if (cyy === faceH - 1) col = (waterHash(wx, wy) & 1) ? FACE_ALGAE : FACE_WET;
        else {
          // Des assises de deux pixels, joints verticaux décalés d'une assise à
          // l'autre (« ce qui fait la brique, c'est l'alternance des joints », 433).
          const course = ((cyy - 1) / 2) | 0, top = ((cyy - 1) % 2) === 0;
          const off = course * 5 + (waterHash(course, 3) % 4);
          const bl = ((wx + off) / 8) | 0, inB = (wx + off) % 8;
          col = inB === 0 ? FACE_JOINT : FACE_STONE[waterHash(bl * 3 + course, wy >> 4) % FACE_STONE.length];
          if (top && inB !== 0) col = mixRGB(col, [210, 205, 195], 0.08);
        }
        if (st === S_RING) col = (cyy === 1 && (xx % T) === 7) ? IRON_LIT : IRON;     // le haut de l'anneau accroche la lumière
      } else if (st === S_LADDER) {
        const under = cyy >= faceH;
        col = under ? mixRGB(IRON, LAKE[10], 0.5) : ((xx % T) === 5 || (xx % T) === 10 ? IRON : IRON_LIT);
      } else if (st === S_EARTH) {
        col = EARTH[waterHash(wx, wy) & 1];
      } else if (st === S_PILE) {
        // Tête éclairée (première rangée du pieu), fût à deux tons — la
        // lumière vient de l'ouest —, pied mouillé qui plonge.
        const lx = xx % T, above = struct[i - RW] === S_PILE;
        const litCol = lx === 12 || lx === 0 || lx === 1;
        col = !above ? WOOD_LIT : litCol ? WOOD : WOOD_DARK;
        if (above && struct[i + RW] !== S_PILE) col = mixRGB(WOOD_DARK, LAKE[12], 0.45);
      } else if (st === S_DECK) {
        col = cyy === 0 ? WOOD_LIT : ((wx % 5) === 0 ? WOOD_DARK : WOOD);
      }
      if (col) put(BD, i, col);
      continue;
    }
    if (cls[i] !== 1 || wet[i]) continue;
    // La berge meuble : une DENSITÉ fonction de la distance à l'eau (435 : « la
    // couverture est une densité, pas un demi-plan »), tirée pixel par pixel.
    const d = Math.sqrt(dOut[i]);
    if (d > 30) continue;
    const h = waterHash(wx * 7 + 11, wy * 13 + 5);
    /* ⚠️ ELLE SE FOND AU BORD DE SA RÉGION : une case voisine qui n'est ni berge
       ni eau (un sentier, une pelouse hors bande) n'est pas peinte par la
       cuisson, et la berge s'y arrêtait sur une droite de case — une plage
       coupée au cordeau contre le sentier (vu au rendu). Sur les cinq derniers
       pixels avant un tel bord, la densité s'éteint. */
    const lx = xx % T, ly = yy % T, cxr = bx0 + ((xx / T) | 0), cyr = by0 + ((yy / T) | 0);
    let edge = T;
    if (!inRegOrWater(cxr - 1, cyr)) edge = Math.min(edge, lx);
    if (!inRegOrWater(cxr + 1, cyr)) edge = Math.min(edge, T - 1 - lx);
    if (!inRegOrWater(cxr, cyr - 1)) edge = Math.min(edge, ly);
    if (!inRegOrWater(cxr, cyr + 1)) edge = Math.min(edge, T - 1 - ly);
    // (Jamais sur la vase au ras de l'eau : un coin sec de case d'eau reste de la vase.)
    const p = (h % 1000) / 1000 / (d < 6 ? 1 : Math.max(0.001, smooth(-0.5, 5, edge)));
    const s = sandOf(i);
    // Le sable et la vase se mêlent en SEMIS (un tirage par pixel), pas en
    // trame régulière : une trame de Bayer en travers d'une plage dessinait un
    // damier sur la berge (vu au troisième rendu).
    const sandy = s > 0.02 && (s >= 0.98 || (waterHash(wx * 5 + 2, wy * 3 + 7) % 1000) / 1000 < s);
    let col = null;
    if (sandy) {
      if (d < 2.5) col = SAND_WET[h % SAND_WET.length];
      else if (d < 7) col = SAND_DAMP[h % SAND_DAMP.length];
      else if (d < 20) col = (p < 0.02) ? PEB[h % PEB.length] : SAND_DRY[h % SAND_DRY.length];
      else if (p < (30 - d) / 10) col = SAND_DRY[h % SAND_DRY.length];     // le semis où le sable rend la main à l'herbe
    } else {
      if (d < 2) col = MUD_WET[h % MUD_WET.length];
      else if (d < 6) { if (p < 0.94) col = MUD[h % MUD.length]; }
      else if (d < 13) {
        const dens = 0.9 - (d - 6) * 0.08;
        if (p < dens) col = (p < 0.12) ? PEB[h % PEB.length] : MUD[h % MUD.length];
      } else if (d < 26) {
        if (p < 0.05) col = PEB[h % PEB.length];
        else if (p < 0.09) col = MOSS[h % MOSS.length];
      }
    }
    if (col) put(BD, i, typeof col === "string" ? hexRGB(col) : col);
  }
  }
  // Les touffes d'herbe qui débordent sur la vase : deux brins, là où la vase
  // rend la main (435 : c'est ce qui empêche la berge de se lire comme une découpe).
  for (let yy = 1; yy < RH - 3; yy++) for (let xx = 1; xx < RW - 2; xx++) {
    const i = yy * RW + xx;
    if (cls[i] !== 1 || wet[i] || struct[i]) continue;
    const d = Math.sqrt(dOut[i]);
    if (d < 7 || d > 12) continue;
    const wx = ox + xx, wy = oy + yy;
    if (waterHash(wx * 19 + 3, wy * 23 + 7) % 1000 >= 9 || sandOf(i) > 0.5) continue;
    const tuft = hexRGB(TUFT);
    for (let k = 0; k < 3; k++) put(BD, i + k * RW, tuft);
    put(BD, i + 1 + RW, tuft); put(BD, i + 1 + 2 * RW, tuft);
  }
  // L'enrochement : au bout du quai, là où la pierre rend la main à la berge,
  // quelques blocs couchés — un ouvrage ne s'arrête pas net dans un roseau (437).
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (isPond || !inReg(x, y) || kind[y * W + x] !== 1 || fn.gAt(x, y - 1) !== C.G_PATH_STONE) continue;
    for (const side of [-1, 1]) {
      if (fn.gAt(x + side, y - 1) === C.G_PATH_STONE) continue;           // pas le bout du quai de ce côté
      const cx = (x - bx0) * T + (side < 0 ? 0 : T - 1), cy = (y - by0) * T;
      for (let k = 0; k < 5; k++) {
        const h = waterHash(x * 31 + k * 7, y * 17 + side * 5);
        const rw = 3 + (h % 3), rh = 2 + ((h >>> 3) % 2);
        const rx = cx + side * (1 + ((h >>> 5) % 5)) - (side < 0 ? 0 : rw), ry = cy - 2 + ((h >>> 8) % 9);
        for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) {
          const X = rx + xx, Y = ry + yy;
          if (X < 0 || Y < 0 || X >= RW || Y >= RH) continue;
          const j = Y * RW + X;
          if (cls[j] === 2 && !struct[j]) continue;                        // jamais sur la dalle
          const c = yy === 0 ? ROCK_LIT : yy === rh - 1 ? ROCK_DARK : ROCK[(h >>> 11) % ROCK.length];
          put(BD, j, c);
          if (wet[j]) { WD[j * 4 + 3] = 0; wet[j] = 0; lvl[j] = 255; }      // le bloc émerge : ce n'est plus de l'eau
        }
      }
    }
  }
  wg.putImageData(wim, 0, 0);
  bg.putImageData(bim, 0, 0);
  // Les roseaux de 16 px du 436, sur la vase mouillée, au même hachage que
  // `drawTownShoreTile` (bande 1) — jamais sur une plage.
  const reeds = S && S.townWater && S.townWater.reed;
  if (reeds && reeds.length) for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const i = y * W + x;
    if (!inReg(x, y) || kind[i] !== 2 || !tw.shore || tw.shore[i] !== 1) continue;
    const hh = waterHash(x * 17 + 5, y * 19 + 11);
    if ((hh % 100) >= 26) continue;
    if (sandOf(((y - by0) * T + 8) * RW + (x - bx0) * T + 8) > 0.5) continue;
    const cell = reeds[(hh >>> 9) % reeds.length];
    bg.drawImage(cell.img, cell.sx, cell.sy, cell.w, cell.h, (x - bx0) * T, (y - by0) * T, T, T);
  }
  yield;
  // Par case : pleine (toute d'eau), sa profondeur moyenne, la première rangée libre.
  const full = new Uint8Array(cw * ch), depthCell = new Uint8Array(cw * ch).fill(255), swellOK = new Uint8Array(cw * ch);
  for (let cy2 = 0; cy2 < ch; cy2++) for (let cx2 = 0; cx2 < cw; cx2++) {
    let n = 0, sum = 0, bank = 0;
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const j = (cy2 * T + py) * RW + cx2 * T + px;
      if (wet[j]) { n++; sum += lvl[j]; } else if (!struct[j] || struct[j] === S_WATERLINE) bank++;
    }
    full[cy2 * cw + cx2] = n === T * T ? 1 : 0;
    swellOK[cy2 * cw + cx2] = n > 0 && bank === 0 ? 1 : 0;
    if (n) depthCell[cy2 * cw + cx2] = Math.round(sum / n);
  }
  return {
    isPond, bx0, by0, cw, ch, ox, oy, RW, RH,
    water: wc, bank: bc, lvl, full, depthCell, cellTop, faceH, swellOK,
  };
}

/* ── 4. LE RENDU PAR CASE ───────────────────────────────────────────────────
   Un carré de 16 px de chaque canevas, à la forme à NEUF arguments dont le
   rectangle source est dans le repère NATIF du canevas de la région (§4 de
   CLAUDE.md : payé sur une étoile invisible). */
export function bakeRegionAt(bake, x, y) {
  if (!bake || x < 0 || y < 0 || x >= bake.W || y >= bake.H) return null;
  const id = bake.regOf[y * bake.W + x];
  return id >= 0 ? bake.regions[id] : null;
}
export function drawBakedBank(ctx, bake, x, y, px, py) {
  const R = bakeRegionAt(bake, x, y);
  if (!R) return false;
  ctx.drawImage(R.bank, (x - R.bx0) * T, (y - R.by0) * T, T, T, px, py, T, T);
  return true;
}
export function drawBakedWater(ctx, bake, x, y, px, py) {
  const R = bakeRegionAt(bake, x, y);
  if (!R) return false;
  ctx.drawImage(R.water, (x - R.bx0) * T, (y - R.by0) * T, T, T, px, py, T, T);
  return true;
}
/* Ce que la surface animée doit savoir d'une case cuite. */
export function bakedCellInfo(bake, x, y) {
  const R = bakeRegionAt(bake, x, y);
  if (!R) return null;
  const ci = (y - R.by0) * R.cw + (x - R.bx0);
  return { R, full: R.full[ci] === 1, depth: R.depthCell[ci], top: R.cellTop[ci], swellOK: R.swellOK[ci] === 1 };
}
/* Le palier d'un pixel du monde (0..15), ou -1 s'il n'est pas mouillé. */
export function bakedLevelAt(bake, wx, wy) {
  const x = (wx / T) | 0, y = (wy / T) | 0;
  const R = bakeRegionAt(bake, x, y);
  if (!R) return -1;
  const xx = wx - R.ox, yy = wy - R.oy;
  if (xx < 0 || yy < 0 || xx >= R.RW || yy >= R.RH) return -1;
  const l = R.lvl[yy * R.RW + xx];
  return l === 255 ? -1 : l;
}
export const WATER_LEVELS = N_LEV;

/* ── 5. LA HOULE (2026-09-01, déménagée ici à la phase 4) ──────────────────
   Voir le commentaire d'autorité au-dessus de `TOWN_WATER_SWELL`
   (fermeConstants.js) pour la décision ; ce qui suit est la mécanique.
   ⚠️⚠️ CORRIGÉ EN SÉANCE, VU À L'ÉCRAN (2026-09-01) : le premier jet
   approximait la diagonale par un escalier de 4 rectangles — des coins à angle
   droit, à l'intérieur de la case ET entre deux cases voisines (« délimitations
   de zones... angles droits au lieu de courbes », remarque de Guillaume). Un
   dégradé courbe une case, mais PAS deux cases entre elles.
   ⚠️⚠️⚠️ LA PARADE : un SEUL `createLinearGradient` par case, dont les arrêts
   sont échantillonnés en COORDONNÉES MONDE le long de l'axe de propagation. La
   phase — donc l'opacité — est une fonction continue du pixel monde ; deux
   cases voisines évaluent la MÊME fonction à des points proches, donc se
   raccordent sans couture.
   ⚠️ 2026-09-25 (phase 4) : la phase se lit sur (wx, wy), la case dans le
   MONDE, et le dessin se pose en (px, py) — c'était le même nombre dans le jeu,
   pas dans un banc qui peint une planche à l'origine. `top` saute les rangées
   d'un ouvrage (le parement du quai) : une crête claire passée sur de la
   pierre serait de la lumière sur un mur. */
const WATER_SWELL_ANGLE = C.TOWN_WATER_SWELL_ANGLE_DEG * Math.PI / 180;
const WATER_SWELL_COS = Math.cos(WATER_SWELL_ANGLE);
const WATER_SWELL_SIN = Math.sin(WATER_SWELL_ANGLE);
const WATER_SWELL_WAVELEN = T * C.TOWN_WATER_SWELL_WAVELEN_CASES;
const WATER_SWELL_PEAK_O = 0.12;      // opacité de crête en « v1 » — validée à l'écran par Guillaume
const WATER_SWELL_PEAK_PHASE = 0.62;  // où, dans le cycle, la crête est la plus nette (creux long, crête brève)
const WATER_SWELL_SHARPNESS = 3;      // exposant du cosinus relevé : plus haut = crête plus étroite
const WATER_SWELL_STOPS = 6;          // arrêts du dégradé — assez pour lisser une portion d'onde de 4 cases
const WATER_SWELL_RADIUS = 15;        // demi-longueur du segment de dégradé, en px, centré sur la case
/* ⚠️⚠️ 2026-09-25 (phase 4) — DEUX TRAINS DE VAGUES, ET PLUS UNE PÉRIODE PAR
   CASE. La « passe 2 » (décision verrouillée : la rive est rapide, le large est
   lent, l'amplitude perd un tiers au large) dérivait la PÉRIODE du cran de
   profondeur de chaque case. Deux cases voisines de crans différents battaient
   donc à deux fréquences : leur phase s'écarte de t·(1/P₁ − 1/P₂), c'est-à-dire
   d'un cycle entier toutes les quelques secondes de jeu, et chaque case finit
   par porter sa propre vague. Sous l'eau par case de la 436 ça se confondait
   avec les carrés de profondeur ; sur l'eau cuite au pixel, c'étaient eux, les
   carrés (vus au premier rendu).
   La parade garde la décision au mot : un train RAPIDE (période de la rive) et
   un train LENT (période du large), chacun de période UNIQUE sur toute la
   carte — donc sans cisaillement, jamais — et la profondeur ne règle que leur
   MÉLANGE, lue au pixel à chaque arrêt du dégradé : la rive montre le train
   rapide, le large le lent (au tiers d'amplitude en moins), la transition les
   deux. `depthAt(wx, wy)` rend 0..1 ; le repli sans cuisson passe le cran de sa
   case, comme avant. */
/* ⚠️ ET ELLE S'ÉTEINT AU RAS DE LA RIVE (les tout premiers paliers). Une case
   de bord porte de la vase : la crête n'y passe pas (elle éclaircirait la
   terre), et sa voisine de pleine eau la portait à plein — la houle s'arrêtait
   donc en escalier le long de chaque rive (vu au troisième rendu). Une vague
   meurt dans le haut-fond de toute façon ; ici, elle y meurt avant la case de
   bord. `t` est la profondeur (0 au bord, 1 au large). */
function swellMixAt(worldU, now, t) {
  const near = waterSwellOpacityAt(worldU, WATER_SWELL_WAVELEN, C.TOWN_WATER_SWELL_PERIOD_NEAR_MS, now, 1);
  const far = waterSwellOpacityAt(worldU, WATER_SWELL_WAVELEN, C.TOWN_WATER_SWELL_PERIOD_FAR_MS, now, 1 - C.TOWN_WATER_SWELL_AMP_FAR_CUT);
  return (near * (1 - t) + far * t) * smooth(0.04, 0.28, t);
}
function waterSwellOpacityAt(worldU, wavelen, period, now, ampScale) {
  const phaseRaw = (worldU / wavelen) - (now / period);
  const phase = ((phaseRaw % 1) + 1) % 1;
  const ph = ((phase - WATER_SWELL_PEAK_PHASE + 1.5) % 1) - 0.5;   // recentré sur la crête, borné à [-0.5, 0.5)
  const bump = Math.max(0, Math.cos(ph * Math.PI));                 // 0 sur la moitié du cycle, 1 à la crête
  return WATER_SWELL_PEAK_O * ampScale * Math.pow(bump, WATER_SWELL_SHARPNESS);
}
/* La crête, de 0 à 1, au point (wx, wy) du monde : c'est elle qui porte les
   éclats de soleil (§ 6) — un reflet naît sur la vague, pas sur la grille. */
function swellCrestAt(wx, wy, now, t) {
  return swellMixAt(wx * WATER_SWELL_COS + wy * WATER_SWELL_SIN, now, t) / WATER_SWELL_PEAK_O;
}
export function drawWaterSwellBand(ctx, wx, wy, px, py, w, top, now, d, depthsMax, depthAt) {
  const tCell = d / Math.max(1, depthsMax - 1);
  const cxw = wx + T / 2, cyw = wy + T / 2, cx = px + T / 2, cy = py + T / 2;
  const baseU = cxw * WATER_SWELL_COS + cyw * WATER_SWELL_SIN;   // projection du centre (MONDE) sur l'axe de houle
  const R = WATER_SWELL_RADIUS;
  const grad = ctx.createLinearGradient(
    cx - WATER_SWELL_COS * R, cy - WATER_SWELL_SIN * R,
    cx + WATER_SWELL_COS * R, cy + WATER_SWELL_SIN * R
  );
  let anyVisible = false;
  for (let i = 0; i <= WATER_SWELL_STOPS; i++) {
    const tt = i / WATER_SWELL_STOPS, k = (tt * 2 - 1) * R;
    const worldU = baseU + k;
    const t = depthAt ? depthAt(Math.round(cxw + WATER_SWELL_COS * k), Math.round(cyw + WATER_SWELL_SIN * k), tCell) : tCell;
    const o = swellMixAt(worldU, now, t);
    if (o > 0.003) anyVisible = true;
    grad.addColorStop(tt, `rgba(220, 240, 246, ${o.toFixed(3)})`);
  }
  if (!anyVisible) return;
  ctx.fillStyle = grad;
  ctx.fillRect(px, py + top, w, w - top);
}

/* ── 6. LA SURFACE ANIMÉE, PAR CASE ─────────────────────────────────────────
   Tout ce qui bouge sur l'eau cuite. Elle passe APRÈS les reflets (§ 7) et
   AVANT tout ce qui se tient debout : un éclat de soleil est à la surface,
   donc devant le reflet d'un arbre et derrière le passant du quai.
   1. la houle (inchangée) ;
   2. les ÉCLATS : ils remplacent la « lame de lumière » du 435 — un tiret clair
      par case, à la même hauteur tirée au hachage : de près une lame, de loin
      LA GRILLE, dessinée en clair (« reflets en tirets à pas régulier »,
      audit du 2026-09-25). Un éclat naît où la vague a sa crête, à une place
      retirée à chaque battement, et meurt en un battement : une scintillation,
      jamais un motif ;
   3. le COURANT du fleuve, en aval du bassin : de fines lignes claires qui
      dérivent vers la sortie, plus vite au milieu du chenal. ⚠️ C'est un autre
      mouvement que la houle — elle garde son angle unique (décision de
      Guillaume, 2026-09-01) ; le bassin du port, lui, reste calme ;
   4. le CLAPOT au pied du parement : la ligne de flottaison s'éclaire par
      vagues qui courent le long du quai ;
   5. les rochers et les nénuphars du 436, au même hachage de case, mais sur
      la profondeur CUITE (un rocher ne sort pas d'une eau de trois mètres). */
const GLINT_MS = 460;
const WAT_SHOAL = Math.round((N_LEV - 1) * 0.30);
export function drawWaterSurface(ctx, S, tw, bake, x, y, px, py, now) {
  const info = bakedCellInfo(bake, x, y);
  if (!info || tw.ground[y * tw.w + x] !== C.G_WATER) return false;
  const { R, full, depth, top, swellOK } = info;
  const wx0 = x * T, wy0 = y * T;
  const d = depth === 255 ? N_LEV - 1 : depth;
  const depthAt = (wx, wy, dflt) => { const l = bakedLevelAt(bake, wx, wy); return l < 0 ? dflt : l / (N_LEV - 1); };
  // 1. la houle — sur toute case où rien d'autre que de l'eau et des ouvrages
  // (parement, pieux) ne se trouve : une crête ne passe jamais sur la vase.
  if (C.TOWN_WATER_SWELL && swellOK) drawWaterSwellBand(ctx, wx0, wy0, px, py, T, top, now, d, N_LEV, depthAt);
  // 2. les éclats
  const lvlAt = (xx, yy) => { const X = wx0 + xx - R.ox, Y = wy0 + yy - R.oy; if (X < 0 || Y < 0 || X >= R.RW || Y >= R.RH) return 255; return R.lvl[Y * R.RW + X]; };
  const ph = (waterHash(x * 17 + 3, y * 31 + 9) % 1000) / 1000;
  const tt = now + ph * GLINT_MS, slot = Math.floor(tt / GLINT_MS), life = (tt % GLINT_MS) / GLINT_MS;
  const crest = swellCrestAt(wx0 + 8, wy0 + 8, now, d / (N_LEV - 1));
  for (let k = 0; k < 2; k++) {
    const h = waterHash(x * 73 + k * 19 + slot * 7, y * 41 + slot * 13 + k);
    // ⚠️ Rares hors des crêtes : sur une image fixe, un éclat par case se lit
    // comme du sel (vu au premier rendu). La vague les appelle, le calme non.
    if ((h >>> 12) % 1000 >= (0.025 + 0.34 * crest * crest) * 1000) continue;
    const gx = 1 + (h % 13), gy = 1 + ((h >>> 4) % 14);
    if (lvlAt(gx, gy) === 255 || lvlAt(gx + 1, gy) === 255) continue;
    const a = Math.sin(Math.PI * life) * (R.isPond ? 0.55 : 0.7);
    if (a < 0.05) continue;
    ctx.fillStyle = `rgba(236, 248, 252, ${a.toFixed(3)})`;
    ctx.fillRect(px + gx, py + gy, (h >>> 20) & 1 ? 2 : 1, 1);
  }
  // 3. le courant du fleuve
  if (!R.isPond && x >= C.TOWN_RIVER_X) {
    for (let row = 0; row < T; row++) {
      const wy = wy0 + row, hl = waterHash(wy * 7 + 5, 991);
      if (hl % 6 !== 0) continue;                                      // une rangée sur six porte un filet
      const lv = lvlAt(8, row);
      if (lv === 255 || lv < 4) continue;                               // pas sur le haut-fond : il ne coule pas là
      const P = 46 + ((hl >>> 3) % 40), V = 5 + (lv / (N_LEV - 1)) * 9 + ((hl >>> 9) % 4);
      const Ld = 2 + ((hl >>> 13) % 3), off = (hl >>> 16) % P;
      const x0 = ((off + V * now / 1000) % P + P) % P;
      for (let n = Math.floor((wx0 - x0 - Ld) / P); n * P + x0 < wx0 + T; n++) {
        const sx = n * P + x0;
        const hs = waterHash(n * 13 + 7, wy * 3 + 1);
        if (hs % 3 === 0) continue;                                      // un filet sur trois manque : pas de rail
        const a = 0.16 + 0.12 * ((hs >>> 5) % 3);
        const xa = Math.max(wx0, Math.round(sx)), xb = Math.min(wx0 + T, Math.round(sx + Ld));
        if (xb <= xa || lvlAt(xa - wx0, row) === 255 || lvlAt(xb - 1 - wx0, row) === 255) continue;
        ctx.fillStyle = `rgba(214, 234, 240, ${a.toFixed(2)})`;
        ctx.fillRect(px + xa - wx0, py + row, xb - xa, 1);
      }
    }
  }
  // 4. le clapot au pied du parement
  if (top === R.faceH + 1) {
    for (let xx = 0; xx < T; xx++) {
      const w = Math.sin((wx0 + xx) * 0.31 - now / 420) + 0.6 * Math.sin((wx0 + xx) * 0.11 + now / 910);
      if (w < 0.55) continue;
      ctx.fillStyle = `rgba(214, 236, 242, ${Math.min(0.55, (w - 0.55) * 0.6).toFixed(2)})`;
      ctx.fillRect(px + xx, py + R.faceH, 1, 1);
    }
  }
  // 5. les rochers et les nénuphars du 436
  const SW = S && S.townWater;
  if (full && SW) {
    const hh = waterHash(x * 11 + 3, y * 13 + 7);
    const blit = (cell) => ctx.drawImage(cell.img, cell.sx, cell.sy, cell.w, cell.h, px, py, cell.w, cell.h);
    if (SW.wrock && d <= WAT_SHOAL && (hh % 100) < 7) blit(SW.wrock[(hh >>> 7) % SW.wrock.length]);
    else if (SW.lily && d >= WAT_SHOAL && ((hh >>> 3) % 100) < 8) blit(SW.lily[(hh >>> 11) % SW.lily.length]);
  }
  return true;
}

/* ── 7. LES REFLETS ─────────────────────────────────────────────────────────
   Décision de Guillaume (2026-09-25, « reco partout ») : ce qui se tient sur
   la rive nord se reflète VRAIMENT — arbres, lampadaires, bancs, décors, et
   les personnages (on voit son reflet en longeant le quai).
   LE MODÈLE : vue plongeante, un objet posé à la hauteur de l'eau se reflète
   retourné AUTOUR DE SA PROPRE LIGNE DE SOL (pas autour de la rive : un arbre
   à trois cases de l'eau ne s'y voit que si sa cime dépasse ces trois cases).
   Un objet posé sur le quai est plus haut que l'eau de la hauteur du
   parement : son axe descend d'autant (`axisOff`).
   LE RENDU, par image, dans un tampon à la résolution de l'ART (comme la
   lumière) :
   1. chaque objet est redessiné en miroir par SON PROPRE dessin (le jeu
      rejoue l'entrée de sa file de dessin : `drawItem`) — aucune seconde copie
      d'un choix de sprite, donc aucun reflet qui diverge de son objet (§8) ;
   2. une teinte d'eau (source-atop) l'assombrit et le bleuit ;
   3. il est DÉCOUPÉ par l'alpha des canevas d'EAU cuite (le masque) : jamais
      sur la vase, le sable, le parement ou le pont ;
   4. il est posé rangée par rangée, chacune décalée d'un pixel d'art selon
      une ondulation lente : c'est ce qui le fait lire comme un reflet et non
      comme un décalque.
   ⚠️ Trois canevas pour tout le jeu (le tampon, le masque, le brouillon de la
   nuit), jamais un par objet — §10 : sur iPad c'est le NOMBRE qui tue. */
const REFL_TINT = "rgba(16, 38, 62, 0.46)";
const REFL_ALPHA = 0.52;
export function makeWaterReflector(makeCanvas) {
  let R = null, Rg = null, M = null, Mg = null, Nb = null, Ng = null;
  const ensure = (w, h) => {
    if (!R) { R = makeCanvas(w, h); Rg = R.getContext("2d"); M = makeCanvas(w, h); Mg = M.getContext("2d"); Nb = makeCanvas(w, h); Ng = Nb.getContext("2d"); }
    if (R.width < w || R.height < h) {
      for (const c of [R, M, Nb]) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
    }
    for (const g of [Rg, Mg, Ng]) g.imageSmoothingEnabled = false;
  };
  /* Le masque de l'eau visible, dans le repère du tampon ; rend la boîte des
     rangées d'eau (en px d'art du tampon), ou null s'il n'y a pas d'eau. */
  function mask(bake, ox, oy, Lw, Lh) {
    Mg.setTransform(1, 0, 0, 1, 0, 0);
    Mg.globalCompositeOperation = "source-over";
    Mg.clearRect(0, 0, Lw, Lh);
    let y0 = Infinity, y1 = -Infinity;
    for (const Rr of bake.regions) {
      if (!Rr || Rr.ox + Rr.RW < ox || Rr.ox > ox + Lw || Rr.oy + Rr.RH < oy || Rr.oy > oy + Lh) continue;
      Mg.drawImage(Rr.water, Rr.ox - ox, Rr.oy - oy);
      y0 = Math.min(y0, Math.max(0, Rr.oy - oy)); y1 = Math.max(y1, Math.min(Lh, Rr.oy + Rr.RH - oy));
    }
    return y1 > y0 ? { y0, y1 } : null;
  }
  /* Le tampon, posé sur la scène rangée par rangée, calé sur des pixels d'écran
     entiers (même parade que le sol pendant un fondu de zoom). */
  function blit(ctx, view, src, ox, oy, Lw, rows, now, alpha, wave, op) {
    const zm = view.zm;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op || "source-over";
    for (let row = rows.y0; row < rows.y1; row++) {
      const wy = oy + row;
      const off = wave ? Math.round(Math.sin(now / 640 + wy * 0.57) * 0.75 + Math.sin(now / 1130 + wy * 0.19 + 1.3) * 0.6) : 0;
      const X0 = Math.round((ox + off) * zm - view.Rx), X1 = Math.round((ox + off + Lw) * zm - view.Rx);
      const Y0 = Math.round(wy * zm - view.Ry), Y1 = Math.round((wy + 1) * zm - view.Ry);
      if (Y1 > Y0) ctx.drawImage(src, 0, row, Lw, 1, X0, Y0, X1 - X0, Y1 - Y0);
    }
    ctx.restore();
  }
  /* LE JOUR. `items` : { rb (ligne de sol, px monde), rx (colonne, case) } ;
     `axisOffOf(item)` : de combien l'axe descend sous la ligne de sol ;
     `drawItem(item, g)` : redessine l'objet sur `g`, dans le repère monde. */
  function draw(ctx, view, bake, items, now, axisOffOf, drawItem) {
    if (!bake || !items.length) return;
    const zm = view.zm;
    const ox = Math.floor(view.Rx / zm), oy = Math.floor(view.Ry / zm);
    const Lw = Math.ceil(view.W / zm) + 2, Lh = Math.ceil(view.H / zm) + 2;
    ensure(Lw, Lh);
    const rows = mask(bake, ox, oy, Lw, Lh);
    if (!rows) return;
    Rg.setTransform(1, 0, 0, 1, 0, 0);
    Rg.globalCompositeOperation = "source-over";
    Rg.globalAlpha = 1;
    Rg.clearRect(0, 0, Lw, Lh);
    let n = 0;
    for (const it of items) {
      const axis = it.rb + axisOffOf(it);
      if (axis - oy > rows.y1 || axis + 96 - oy < rows.y0) continue;
      Rg.setTransform(1, 0, 0, -1, -ox, 2 * axis - oy);
      try { drawItem(it, Rg); n++; } catch (e) { /* un reflet raté ne coûte pas l'image */ }
    }
    Rg.setTransform(1, 0, 0, 1, 0, 0);
    if (!n) return;
    Rg.globalCompositeOperation = "source-atop";
    Rg.fillStyle = REFL_TINT;
    Rg.fillRect(0, 0, Lw, Lh);
    Rg.globalCompositeOperation = "destination-in";
    Rg.drawImage(M, 0, 0);
    Rg.globalCompositeOperation = "source-over";
    blit(ctx, view, R, ox, oy, Lw, rows, now, REFL_ALPHA, true);
  }
  /* LA NUIT (décision de Guillaume, 2026-09-25 : « reco partout ») — posée
     APRÈS la lumière (le ciel a déjà multiplié la scène), en `lighter` :
     - chaque lampe au bord de l'eau y trace une COLONNE de lumière brisée, là
       où tomberait le reflet de son verre (le miroir de § 7), faite de tirets
       qui tremblent avec l'eau et dont certains manquent — c'est ce qui la
       fait lire comme de l'eau qui bouge, pas comme un rai posé dessus ;
     - la lune met un éclat froid sur les crêtes de la houle (les mêmes crêtes
       que les éclats de soleil du jour, § 6) : une nuit de lune, décision 2 de
       la phase 3.
     `sources` : { x, y (px monde : le reflet du verre), c: [r,g,b], k }. */
  function night(ctx, view, bake, sources, now, k) {
    if (!bake || !(k > 0.02)) return;
    const zm = view.zm;
    const ox = Math.floor(view.Rx / zm), oy = Math.floor(view.Ry / zm);
    const Lw = Math.ceil(view.W / zm) + 2, Lh = Math.ceil(view.H / zm) + 2;
    ensure(Lw, Lh);
    const rows = mask(bake, ox, oy, Lw, Lh);
    if (!rows) return;
    Ng.setTransform(1, 0, 0, 1, 0, 0);
    Ng.globalCompositeOperation = "source-over";
    Ng.globalAlpha = 1;
    Ng.clearRect(0, 0, Lw, Lh);
    const LEN = 28;             // ⚠️ 18 au premier jet : vu en jeu, deux tirets à peine — une colonne se lit sur sa LONGUEUR
    for (const src of sources) {
      const cx = Math.round(src.x) - ox, cy = Math.round(src.y) - oy;
      if (cx < -6 || cx > Lw + 6 || cy + LEN < 0 || cy - 2 > Lh) continue;
      const slot = Math.floor(now / 170);
      for (let r = -2; r < LEN; r++) {
        const wy = Math.round(src.y) + r;
        const h = waterHash(Math.round(src.x) * 7 + r * 13, slot * 3 + r);
        if (r > 2 && h % 6 === 0) continue;                        // la colonne se rompt, rarement
        const fall = 1 - Math.max(0, r) / LEN;
        const w = Math.max(1, Math.round((r < 3 ? 4 : 2 + ((h >>> 3) % 3)) * (0.5 + 0.5 * Math.sqrt(fall))));
        const off = Math.round(Math.sin(now / 280 + wy * 0.83 + src.x * 0.1) * (0.4 + Math.max(0, r) * 0.08));
        const a = Math.min(1, (r < 0 ? 0.6 : Math.pow(fall, 0.7)) * (src.k == null ? 1 : src.k));
        Ng.fillStyle = `rgba(${src.c[0]},${src.c[1]},${src.c[2]},${a.toFixed(3)})`;
        Ng.fillRect(cx - (w >> 1) + off, cy + r, w, 1);
      }
    }
    // Les éclats de lune : une chance par case et par battement, appelée par la crête.
    const cx0 = Math.floor(ox / T), cx1 = Math.floor((ox + Lw) / T), cy0 = Math.floor(oy / T), cy1 = Math.floor((oy + Lh) / T);
    const slot2 = Math.floor(now / 520);
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
      const info = bakedCellInfo(bake, x, y);
      if (!info || !info.swellOK) continue;
      const h = waterHash(x * 29 + slot2 * 5, y * 43 + slot2 * 11);
      const crest = swellCrestAt(x * T + 8, y * T + 8, now, info.depth === 255 ? 1 : info.depth / (N_LEV - 1));
      if ((h >>> 10) % 1000 >= (0.03 + 0.4 * crest * crest) * 1000) continue;
      const gx = x * T + 1 + (h % 14) - ox, gy = y * T + 1 + ((h >>> 4) % 14) - oy;
      const life = ((now % 520) / 520);
      Ng.fillStyle = `rgba(196, 214, 255, ${(0.75 * Math.sin(Math.PI * life)).toFixed(3)})`;
      Ng.fillRect(gx, gy, (h >>> 20) & 1 ? 2 : 1, 1);
    }
    Ng.globalCompositeOperation = "destination-in";
    Ng.drawImage(M, 0, 0);
    Ng.globalCompositeOperation = "source-over";
    blit(ctx, view, Nb, ox, oy, Lw, rows, now, Math.min(1, k), false, "lighter");
  }
  return { draw, night };
}
/* Les décors COUCHÉS (au sol ou à fleur d'eau) : ils n'ont pas de reflet à donner. */
export const WATER_FLAT_PROPS = new Set(["lily", "stepStones", "flatStone", "bloomBed", "bloomRow", "rockBed", "grassTuft"]);
/* De combien l'AXE du miroir descend sous la ligne de sol d'un objet posé sur la
   case (cx, cy) : la hauteur de ce qui le porte au-dessus de l'eau — le
   parement d'un quai, le tablier du ponton, le talus d'une allée, une berge.
   Une seule écriture, lue par les reflets du jour et par les colonnes de nuit. */
export function waterAxisOffset(tw, cx, cy) {
  if (!tw || cx < 0 || cy < 0 || cx >= tw.w || cy >= tw.h) return 1;
  const g = tw.ground[cy * tw.w + cx];
  return g === C.G_PATH_STONE ? QUAY_FACE_H : g === C.G_BRIDGE ? 3 : g === C.G_PATH ? 2 : g === C.G_WATER ? 0 : 1;
}
/* La couleur d'une colonne de reflet, AJOUTÉE à l'eau de nuit : chaude, et
   moins verte que rouge (même raison que `LIGHT_COLORS` de lumiere.js — un
   jaune saturé sur un bleu nuit vire au vert citron). La torche est plus rouge. */
export const WATER_LAMP_RGB = [255, 196, 112];
export const WATER_TORCH_RGB = [255, 168, 80];
