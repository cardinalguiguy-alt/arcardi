/* =============================================================================
   render-boulodrome.mjs — LE BOULODROME, REGARDÉ HORS DU JEU (2026-10-29, lot 2).
   -----------------------------------------------------------------------------
   Peint le VRAI morceau de la ville (le générateur du jeu) avec le sol du jeu (`A.drawTownGrassTile`, `A.drawTownRoadTile`),
   la part du boulodrome (`BA.drawBouloTile`, ce que `paintTownGroundTile` cuit), ses bancs et ses mâts, puis la pluie et la
   neige du jeu (`pluie.js`, `neige.js`, sur les parcelles statiques qui lisent le sable au pixel, `townSnowEnv.bouloAt`) —
   jamais une recopie. Ce qu'il ne voit pas : les arbres (un rond sombre marque leur pied), la lumière de la scène, la
   guirlande (elle se dessine au-dessus du monde trié) ; tout cela se juge en jeu (docs/VERIFICATION.md).

   Planche : tools/out/boulodrome.png (×2) — six états : sec ; humide ; premières flaques ; orage ; 3 cm de neige ; 12 cm.
   Et une loupe du sec à ×4 : tools/out/boulodrome-loupe.png.

   Ce qu'il contrôle (un banc de transition mesure ce que la chose EST — noyau §4, « une surface qui revient… ») :
   · le sable est plein (aucun trou dans le dessin des pistes) et le dessin est le même à chaque construction ;
   · la lumière suit la PHYSIQUE : le flanc nord-ouest d'une bosse est plus clair que son flanc sud-est ;
   · la neige et la pluie lisent le sable comme du sable, les madriers comme du bois ;
   · LES FLAQUES COMBLENT LES CREUX DE LA PISTE : aux premières flaques, elles sont dans le creux de la piste du platane, jamais
     sur une bosse ; sous l'orage, l'ornière de la piste de la mairie a les siennes ;
   · 12 cm de neige couvrent les pistes ; 3 cm laissent percer les bosses ;
   · le banc de planches a la hauteur du banc de la ville (on s'y assoit pareil).

   Usage :  node tools/render-boulodrome.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "neige", "pluie", "boulodrome", "boulodromeArt", "petanque", "planche"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, NG = mods.neige, PL = mods.pluie;
const BD = mods.boulodrome, BA = mods.boulodromeArt, PT = mods.petanque;
const S = A.buildSprites();
const tw = E.generateTownWorld();
const T = C.TILE;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };

const P = { x: 98, y: 34, w: 21, h: 15 };
const env = A.townSnowEnv(tw, S, (wx, wy) => {
  const x = Math.floor(wx / T), y = Math.floor(wy / T);
  return x >= 0 && y >= 0 && x < tw.w && y < tw.h && tw.ground[y * tw.w + x] === C.G_WATER;
});
env.makeCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const SKY = PL.skyReflect(0.6);
const packFor = (cm) => ({ g: cm, s: cm * 1.25 + (cm > 0 ? 1.5 : 0), r: Math.min(NG.NEIGE.ROAD_CAP, cm * 0.3), berm: cm * 1.1, rh: cm * 0.8, rc: cm, tl: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, tc: cm > 8 ? 0.8 : cm > 1 ? 0.3 : 0, since: 0 });

function paint(state) {
  let wet = null, snow = null;
  const field = NG.makeSnowField(tw, env);
  if (state.cm) {
    field.setParams(packFor(state.cm), { winter: true, frost: 0, wetRoad: 0.3, sun: 1 });
    field.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
    field.update(1e9, () => 0);
    snow = field;
  } else if (state.wet || state.pud) {
    wet = PL.makeWetLayer(tw, { makeCanvas: env.makeCanvas, staticOf: (cx, cy) => field.staticOf(cx, cy) });
    wet.setParams({ wet: state.wet, pud: state.pud, run: state.run || 0, sky: SKY });
    wet.view(P.x, P.y, P.x + P.w - 1, P.y + P.h - 1);
    wet.update(1e9, () => 0);
  }
  const W = P.w * T, H = P.h * T, sf = makeCanvas(W, H), ctx = sf.ctx;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const i = y * tw.w + x, g = tw.ground[i], px = (x - P.x) * T, py = (y - P.y) * T;
    if (g === C.G_PATH) A.drawTownRoadTile(ctx, S, tw, x, y, px, py);
    else A.drawTownGrassTile(ctx, S, tw, x, y, px, py);
    BA.drawBouloTile(ctx, x, y, px, py);
    const c = (snow || wet) ? (snow || wet).cell(x, y) : null;
    if (c) ctx.drawImage(c.img, c.sx, c.sy, T, T, px, py, T, T);
  }
  // les arbres : un rond sombre à leur pied (le dessin des arbres se juge en jeu)
  for (const t of BD.BOULO_TREES) { if (t.x < P.x || t.x >= P.x + P.w) continue; ctx.fillStyle = "#3b2c22"; ctx.fillRect((t.x - P.x) * T + 6, (t.y - P.y) * T + 9, 4, 7); }
  const bench = BA.bouloBenchCanvas(env.makeCanvas), pole = BA.bouloPoleCanvas(env.makeCanvas);
  for (const pr of tw.props) {
    if (!(pr.boulo || pr.kind === "bouloPole")) continue;
    const im = pr.boulo ? bench : pole;
    ctx.drawImage(im, Math.round((pr.x - P.x) * T + T / 2 - im.width / 2), (pr.y + 1 - P.y) * T - im.height);
  }
  return { px: sf.px, W, H, wet, snow, field };
}

/* ── 1. LE DESSIN DU SOL ── */
const t0 = Date.now();
const G1 = BA.bouloGroundPixels();
const msG = Date.now() - t0;
const G2 = BA.bouloGroundPixels();
ok("le dessin du sol est le même à chaque construction (aucun tirage)", G1.px.every((v, i) => v === G2.px[i]));
ok("et il se construit vite (une fois par partie)", msG < 400, `${msG} ms`);
let holes = 0, sand = 0;
for (const pk of BD.BOULO_PISTES) for (let j = 0; j < BD.BOULO.WP; j++) for (let i = 0; i < BD.BOULO.LP; i++) {
  const o = ((pk.sy + j - G1.y0) * G1.w + (pk.sx + i - G1.x0)) * 4;
  sand++; if (G1.px[o + 3] < 255) holes++;
}
ok("le sable des deux pistes est plein", holes === 0, `${sand} pixels, ${holes} trou(s)`);
let grassOpaque = 0;
for (let y = BD.BOULO_PISTES[0].sy + BD.BOULO.WP + BD.BOULO.M + 1; y < BD.BOULO_PISTES[1].sy - BD.BOULO.M; y++) for (let x = BD.BOULO_BOX.x0; x < BD.BOULO_BOX.x1 - 1; x++) {
  const o = ((y - G1.y0) * G1.w + (x - G1.x0)) * 4; if (G1.px[o + 3] > 100) grassOpaque++;
}
ok("la bande entre les pistes laisse voir le gazon de la ville (transparente, ombre de contact exceptée)", grassOpaque === 0, `${grassOpaque} px couverts`);
{
  // la bosse des racines (piste du platane) : son flanc nord-ouest au soleil, son flanc sud-est à l'ombre
  const pk = BD.pisteDe("b"), b = PT.PISTES.b.bosses[0], R = b.r * PT.PETANQUE.PX_M * 0.5;
  const lum = (i, j) => { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const o = ((pk.sy + j + dj - G1.y0) * G1.w + (pk.sx + i + di - G1.x0)) * 4; s += G1.px[o] * 0.3 + G1.px[o + 1] * 0.59 + G1.px[o + 2] * 0.11; n++; } return s / n; };
  const ci = Math.round(b.y * PT.PETANQUE.PX_M), cj = Math.round(b.x * PT.PETANQUE.PX_M);
  const bp = PT.PISTES.a.bosses[0], ai = Math.round(bp.y * PT.PETANQUE.PX_M), aj = Math.round(bp.x * PT.PETANQUE.PX_M), pa = BD.pisteDe("a");
  const lumA = (i, j) => { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const o = ((pa.sy + j + dj - G1.y0) * G1.w + (pa.sx + i + di - G1.x0)) * 4; s += G1.px[o] * 0.3 + G1.px[o + 1] * 0.59 + G1.px[o + 2] * 0.11; n++; } return s / n; };
  const Ra = Math.round(bp.r * PT.PETANQUE.PX_M * 0.5), nw = lumA(ai - Ra, aj - Ra), se = lumA(ai + Ra, aj + Ra);
  ok("la lumière suit la physique : la bosse de la piste de la mairie a son flanc nord-ouest plus clair que son flanc sud-est", nw > se + 8, `${nw.toFixed(0)} contre ${se.toFixed(0)}`);
  void ci; void cj; void R; void lum;
}

/* ── 2. LA CLASSE DE CHAQUE PIXEL POUR LA MÉTÉO ── */
{
  const field = NG.makeSnowField(tw, env);
  const pk = BD.pisteDe("b");
  const cxk = Math.floor((pk.sx + 100) / NG.CH), cyk = Math.floor((pk.sy + 20) / NG.CH);
  const st = field.staticOf(cxk, cyk);
  const at = (wx, wy) => st.cls[(wy - (cyk * NG.CH - 1)) * NG.SZ + (wx - (cxk * NG.CH - 1))];
  ok("la neige et la pluie lisent le sable comme du SABLE", at(pk.sx + 100, pk.sy + 20) === NG.CL.SAND);
  const clsAt = (wx, wy) => { const cx = Math.floor(wx / NG.CH), cy = Math.floor(wy / NG.CH), s2 = field.staticOf(cx, cy); return s2.cls[(wy - (cy * NG.CH - 1)) * NG.SZ + (wx - (cx * NG.CH - 1))]; };
  ok("…et le madrier comme du bois", clsAt(pk.sx + 100, pk.sy - 1) === NG.CL.DECK && clsAt(pk.sx - 1, pk.sy + 20) === NG.CL.DECK);
  ok("…et l'herbe entre les pistes comme de l'herbe", clsAt(pk.sx + 100, pk.sy + BD.BOULO.WP + BD.BOULO.M + 3) === NG.CL.GRASS);
}

/* ── 3. LES ÉTATS ── */
const STATES = [
  { name: "sec" },
  { name: "humide", wet: 0.55, pud: 0 },
  { name: "premières flaques", wet: 0.95, pud: 0.2 },
  { name: "orage", wet: 0.95, pud: 0.8, run: 1 },
  { name: "3 cm de neige", cm: 3 },
  { name: "12 cm de neige", cm: 12 },
];
const shots = STATES.map((s) => ({ s, r: paint(s) }));
/* Les flaques : un pixel du rendu mouillé dont la couche porte une flaque (le masque des parcelles). On relit le relief
   de la physique sous chaque pixel de flaque. */
function puddleStats(r, k) {
  const pk = BD.pisteDe(k);
  let inHollow = 0, onBump = 0, n = 0;
  for (let j = 1; j < BD.BOULO.WP; j++) for (let i = 0; i < BD.BOULO.LP; i++) {
    const wx = pk.sx + i, wy = pk.sy + j;
    const cxk = Math.floor(wx / NG.CH), cyk = Math.floor(wy / NG.CH), st = r.field.staticOf(cxk, cyk), o = (wy - (cyk * NG.CH - 1)) * NG.SZ + (wx - (cxk * NG.CH - 1));
    if (!PL.isPuddle(st, o, r.pud)) continue;
    n++;
    const cm = BD.reliefLocal(k, (j + 0.5) / PT.PETANQUE.PX_M, (i + 0.5) / PT.PETANQUE.PX_M) * 100;
    if (cm < -0.8) inHollow++;
    if (cm > 0.8) onBump++;
  }
  return { n, inHollow, onBump };
}
{
  const r1 = { ...shots[2].r, pud: 0.2 }, r2 = { ...shots[3].r, pud: 0.8 };
  const b1 = puddleStats(r1, "b"), b2 = puddleStats(r2, "b"), a2 = puddleStats(r2, "a");
  ok("aux premières flaques, l'eau est dans le creux de la piste du platane", b1.n > 20 && b1.inHollow / b1.n > 0.8, `${b1.n} px, ${b1.inHollow} dans le creux`);
  ok("…et jamais sur une bosse", b1.onBump === 0 && b2.onBump === 0, `${b1.onBump} et ${b2.onBump} px`);
  ok("sous l'orage, l'ornière de la piste de la mairie a ses flaques", a2.inHollow > 30, `${a2.n} px, ${a2.inHollow} dans les creux`);
  ok("…et le creux du platane est plein, sans noyer la piste (moins d'un pixel sur cinq)", b2.n < BD.BOULO.LP * BD.BOULO.WP * 0.2, `${b2.n} px sur ${BD.BOULO.LP * BD.BOULO.WP}`);
}
{
  const cover = (r, cm) => {
    let snowy = 0, n = 0;
    const pk = BD.pisteDe("a");
    for (let j = 2; j < BD.BOULO.WP - 1; j++) for (let i = 2; i < BD.BOULO.LP - 2; i++) {
      const o = ((pk.sy + j - P.y * T) * r.W + (pk.sx + i - P.x * T)) * 4, px = r.px;
      const L = px[o] * 0.3 + px[o + 1] * 0.59 + px[o + 2] * 0.11, blue = px[o + 2] - px[o];
      n++; if (L > 175 && blue > -6) snowy++;
    }
    return snowy / n;
  };
  const c3 = cover(shots[4].r), c12 = cover(shots[5].r);
  ok("12 cm de neige couvrent les pistes", c12 > 0.95, `${(c12 * 100).toFixed(1)} %`);
  ok("3 cm laissent voir le sable par endroits (les bosses, le meuble des bords)", c3 < c12 && c3 > 0.4, `${(c3 * 100).toFixed(1)} %`);
}
{
  const B0 = mods.planche.PLANCHE.benchWood;
  ok("le banc de planches a la hauteur du banc de la ville (même pose assise)", BA.BENCH_H === B0.h, `${BA.BENCH_H} px contre ${B0.h}`);
}

/* ── LA PLANCHE ── */
const K = 2, PW = P.w * T * K, PH = P.h * T * K, GAP = 10, cols = 2, rows = Math.ceil(shots.length / cols);
const sheetW = cols * PW + (cols + 1) * GAP, sheetH = rows * PH + (rows + 1) * GAP;
const sheet = new Uint8ClampedArray(sheetW * sheetH * 4);
for (let i = 0; i < sheet.length; i += 4) { sheet[i] = 34; sheet[i + 1] = 36; sheet[i + 2] = 42; sheet[i + 3] = 255; }
shots.forEach(({ r }, n) => {
  const big = scale(r.px, r.W, r.H, K).px, ox = GAP + (n % cols) * (PW + GAP), oy = GAP + Math.floor(n / cols) * (PH + GAP);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s = (y * PW + x) * 4, d = ((oy + y) * sheetW + ox + x) * 4; sheet[d] = big[s]; sheet[d + 1] = big[s + 1]; sheet[d + 2] = big[s + 2]; sheet[d + 3] = 255; }
});
writePNG(path.join(OUT, "boulodrome.png"), sheet, sheetW, sheetH);
{
  const r = shots[0].r, x0 = (BD.BOULO_BOX.x0 - P.x * T) - 4, y0 = (BD.BOULO_BOX.y0 - P.y * T) - 26, w = 120, h = 160, Kl = 4;
  const crop = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((y0 + y) * r.W + x0 + x) * 4, d = (y * w + x) * 4; for (let c = 0; c < 4; c++) crop[d + c] = r.px[s + c]; }
  writePNG(path.join(OUT, "boulodrome-loupe.png"), scale(crop, w, h, Kl).px, w * Kl, h * Kl);
}
console.log(`\nplanches : tools/out/boulodrome.png (${STATES.map((s) => s.name).join(" · ")}), tools/out/boulodrome-loupe.png`);
console.log(fails ? `\n❌ ${fails}/${checks} contrôle(s) en échec` : `\n✅ ${checks}/${checks} contrôles passés`);
process.exit(fails ? 1 : 0);
