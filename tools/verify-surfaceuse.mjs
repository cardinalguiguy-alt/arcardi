/* =============================================================================
   verify-surfaceuse.mjs — L'USURE DE LA GLACE ET LA SURFACEUSE (2026-10-06)
   -----------------------------------------------------------------------------
   Guillaume : « plusieurs états de lissage de la piste en fonction de l'usage ; pouvoir demander un lissage au chalet quand il
   y a trop d'usure ; pour le début des courses, la glace est toujours lissée ». `surfaceuse.js` (pur) porte l'usure et le
   trajet de la machine ; `fermeArt.js` les calques d'usure et la machine. Ce banc les JOUE :
     §1  l'usure : les seuils croissent, le niveau suit le compteur, une figure ou un freinage brut usent plus, une vitesse
         aberrante (latence) n'use pas d'un coup ; combien de minutes pour user la glace, seul et à trois ;
     §2  le trajet : continu, il part de sa place et y revient, ne dépasse pas sa vitesse, entre par le portillon, reste SUR la
         glace pendant les couloirs, son cap suit son mouvement ;
     §3  LA COUVERTURE : chaque case de glace et chaque pixel échantillonné est lissé UNE fois — et `sweepWhen` (l'instant) et
         `sweptRects` (la zone à cet instant) disent la même chose ;
     §4  sa place : garée hors de la glace, hors du portillon et du comptoir, sur du sol libre du vrai monde d'hiver ;
     §5  le dessin : quatre états d'usure (chacun contient les marques du précédent, rien hors de la glace), la glace neuve
         remise sous la lame au pixel près, la machine dans ses quatre caps ;
     §6  les garde-fous de source : la requête, la fin de passe, le lissage forcé du départ d'une course ;
     §7  (2026-10-06) la CHUTE sans patins : blessure de 30 s à 2 min, et l'atterrissage au bord de la glace — hors de la piste.
   Chaque contrôle a été falsifié le jour de son écriture (la note en face dit comment).
   Usage : node tools/verify-surfaceuse.mjs
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "surfaceuse", "patin"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, S = mods.surfaceuse, PT = mods.patin;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
const RK = C.TOWN_RINK, T = C.TILE;

section("§1 — l'usure : quatre niveaux");
{
  ok("les seuils croissent strictement", S.ICE.USE.every((u, i, a) => u > 0 && (i === 0 || u > a[i - 1])), S.ICE.USE.join(" < "));
  ok("le niveau suit le compteur (0, 1, 2, 3, bornes comprises)", S.iceLevelOf(0) === 0 && S.iceLevelOf(S.ICE.USE[0] - 1) === 0 && S.iceLevelOf(S.ICE.USE[0]) === 1 && S.iceLevelOf(S.ICE.USE[1]) === 2 && S.iceLevelOf(S.ICE.USE[2]) === 3 && S.iceLevelOf(1e9) === 3 && S.ICE_LEVELS === 4);
  const a = S.iceUseAdd(0, 7.6, 0.1, 1), f = S.iceUseAdd(0, 7.6, 0.1, S.ICE.TRICK_K), b = S.iceUseAdd(0, 7.6, 0.1, S.ICE.STOP_K);
  ok("un patineur à la croisière use sa vitesse × le temps (0,76 en 0,1 s), une figure plus, un freinage brut encore plus", Math.abs(a - 0.76) < 1e-9 && f > a && b > f, `${a.toFixed(2)} < ${f.toFixed(2)} < ${b.toFixed(2)} par dixième de seconde`);
  ok("une vitesse aberrante (latence) est bornée, un dt aberrant aussi, un compteur négatif ou absurde est ramené à zéro", S.iceUseAdd(0, 1e6, 1, 1) <= S.ICE.MAX_V + 1e-9 && S.iceUseAdd(0, 5, 100, 1) <= 5 * 0.25 + 1e-9 && S.iceUseAdd(-50, 0, 1, 1) === 0 && S.iceUseAdd(NaN, 0, 1, 1) === 0);
  ok("les codes de figure du paquet de position usent comme prévu (stop, saut, vrilles, axel ; glisse = 1)", S.iceTrickK(6) === S.ICE.STOP_K && [1, 2, 3, 7, 8, 9].every((c) => S.iceTrickK(c) === S.ICE.TRICK_K) && [0, 4, 5].every((c) => S.iceTrickK(c) === 1));
  ok("la part vers le niveau suivant croît de 0 à 1 puis reste à 1 au dernier niveau", S.iceFrac(0) === 0 && S.iceFrac(S.ICE.USE[0] / 2) > 0.45 && S.iceFrac(S.ICE.USE[0] / 2) < 0.55 && S.iceFrac(1e9) === 1);
  // Combien de temps pour user la glace ? (à la croisière de 7,6 cases/s : le chiffre qui règle la soirée)
  const mins = (n, v) => S.ICE.USE.map((u) => (u / (v * n) / 60).toFixed(1));
  console.log(`      (un patineur à 7,6 cases/s : marquée / rayée / usée en ${mins(1, 7.6).join(" / ")} min ; à trois : ${mins(3, 7.6).join(" / ")} min)`);
  ok("seul à la croisière, la glace est USÉE en 4 à 12 minutes (une soirée de jeu l'use, un tour de piste non) ; à trois, en moins de 4", S.ICE.USE[2] / 7.6 / 60 >= 4 && S.ICE.USE[2] / 7.6 / 60 <= 12 && S.ICE.USE[2] / (7.6 * 3) / 60 < 4);
}

section("§2 — le trajet de la surfaceuse");
const legs = S.SURF_LEGS;
const gate = C.TOWN_RINK_GATES.find((g) => g.side === "e"), YG = (gate.a + gate.b + 1) / 2;
{
  ok("le trajet est continu : chaque jambe part où la précédente finit, le temps est contigu", legs.every((l, i) => i === 0 || (Math.abs(l.x0 - legs[i - 1].x1) < 1e-9 && Math.abs(l.y0 - legs[i - 1].y1) < 1e-9 && Math.abs(l.t0 - (legs[i - 1].t0 + legs[i - 1].ms)) < 1e-6)), `${legs.length} jambes`);
  ok("elle part de sa place et y revient", legs[0].x0 === S.PARK.x && legs[0].y0 === S.PARK.y && legs[legs.length - 1].x1 === S.PARK.x && legs[legs.length - 1].y1 === S.PARK.y);
  ok(`la passe dure entre 25 et 45 s (on l'attend, on la regarde)`, S.PASS_MS >= 25000 && S.PASS_MS <= 45000, `${(S.PASS_MS / 1000).toFixed(1)} s`);
  // vitesse : aucun saut de position entre deux instants rapprochés
  let maxStep = 0, teleport = 0;
  for (let t = 0; t < S.PASS_MS; t += 20) {
    const a = S.surfacerAt(t), b = S.surfacerAt(t + 20), d = Math.hypot(b.x - a.x, b.y - a.y);
    maxStep = Math.max(maxStep, d / 0.02);
    if (d > S.SURF.SPEED * 0.02 * 1.4 + 1e-6) teleport++;
  }
  ok("jamais de téléportation : la vitesse ne dépasse pas 1,4 × la vitesse de croisière de la machine", teleport === 0, `vitesse max ${maxStep.toFixed(2)} cases/s pour ${S.SURF.SPEED}`);
  ok("hors passe (avant, après, instant négatif), elle est garée, de face", [-5, 0, S.PASS_MS, S.PASS_MS + 1e5].every((t) => { const p = S.surfacerAt(t); return p.parked && p.x === S.PARK.x && p.y === S.PARK.y && p.dir === 0 && !p.moving; }));
  // elle entre par le portillon est : à un moment elle est sur l'axe du portillon, en x entre la bande et la glace
  let seenGate = false, outside = 0, onIce = 0, lanesInside = true;
  for (let t = 1; t < S.PASS_MS; t += 25) {
    const p = S.surfacerAt(t);
    if (Math.abs(p.y - YG) < 0.01 && p.x > RK.x1 + 1 && p.x < RK.x1 + 2.5) seenGate = true;
    if (C.rinkInside(p.x, p.y)) onIce++; else outside++;
  }
  for (const l of legs) if (l.sweep) for (const [x, y] of [[l.x0, l.y0], [l.x1, l.y1]]) if (!C.rinkInside(x, y)) lanesInside = false;
  ok("elle franchit le portillon est (sur son axe) pour entrer et pour sortir", seenGate);
  ok("pendant les couloirs, ses deux extrémités sont toujours SUR la glace (elle ne mord ni la bande ni les coins arrondis)", lanesInside);
  // 2026-10-06 — « coupée dans les angles » : tout le CORPS de la machine (pas seulement son centre) reste sur la glace pendant la passe.
  {
    let worst = -9, at = null;
    for (let t = 1; t < S.PASS_MS; t += 10) {
      const L = S.SURF_LEGS.find((l) => t >= l.t0 && t < l.t0 + l.ms);
      if (!L || !L.sweep) continue;               // l'entrée et la sortie passent par le portillon : la bande y est ouverte
      const p = S.surfacerAt(t), side = p.dir >= 2, hx = side ? 1.15 : 0.9, hy = side ? 0.45 : 0.55;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const d = C.rinkSignedDist(p.x + sx * hx, p.y + sy * hy); if (d > worst) { worst = d; at = [p.x.toFixed(2), p.y.toFixed(2)]; } }
    }
    ok("pendant les couloirs, le CORPS entier de la machine reste sur la glace, coins arrondis compris (jamais dans la planche)", worst <= -0.05, `pire coin du corps à ${worst.toFixed(2)} case du bord (${at})`);
  }
  ok("elle passe l'essentiel de la passe sur la glace", onIce > outside * 3, `${onIce} instants sur la glace, ${outside} dehors`);
  // le cap suit le mouvement
  let capOk = 0, capBad = 0;
  for (let t = 1; t < S.PASS_MS - 30; t += 40) {
    const a = S.surfacerAt(t), b = S.surfacerAt(t + 30);
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.hypot(dx, dy) < 0.02) continue;
    const want = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    if (a.dir === want || b.dir === want) capOk++; else capBad++;
  }
  ok("son cap (0 sud, 1 nord, 2 ouest, 3 est) suit son mouvement", capBad === 0 && capOk > 100, `${capOk} échantillons, ${capBad} faux`);
  ok("elle fait huit couloirs balayés d'est en ouest et retour (le premier vers l'ouest, le dernier vers l'est)", (() => {
    const lanes = legs.filter((l) => l.sweep && Math.abs(l.x1 - l.x0) > 5);
    return lanes.length === S.SURF.LANES && lanes[0].x1 < lanes[0].x0 && lanes[lanes.length - 1].x1 > lanes[lanes.length - 1].x0 && lanes.every((l, i) => i === 0 || (l.x1 - l.x0) * (lanes[i - 1].x1 - lanes[i - 1].x0) < 0);
  })());
}

section("§3 — la couverture : toute la glace est lissée");
{
  let tiles = 0, missT = 0, pixels = 0, missP = 0, late = 0;
  for (let y = RK.y0; y <= RK.y1; y++) for (let x = RK.x0; x <= RK.x1; x++) {
    if (!C.rinkInside(x + 0.5, y + 0.5)) continue;
    tiles++;
    if (!isFinite(S.sweepWhen(x + 0.5, y + 0.5))) missT++;
  }
  for (let py = RK.y0 * T; py < (RK.y1 + 1) * T; py += 2) for (let px = RK.x0 * T; px < (RK.x1 + 1) * T; px += 2) {
    const x = (px + 0.5) / T, y = (py + 0.5) / T;
    if (!C.rinkInside(x, y)) continue;
    pixels++;
    const w = S.sweepWhen(x, y);
    if (!isFinite(w)) missP++; else if (w > S.PASS_MS) late++;
  }
  ok("chaque case de glace est lissée", missT === 0 && tiles > 300, `${tiles - missT}/${tiles} cases`);
  ok("chaque pixel de glace échantillonné l'est aussi, avant la fin de la passe", missP === 0 && late === 0, `${pixels - missP}/${pixels} pixels`);
  ok("à la fin de la passe, les rectangles lissés couvrent tout (rien d'oublié par le dessin)", (() => {
    const rs = S.sweptRects(S.PASS_MS - 1);
    for (let py = RK.y0 * T; py < (RK.y1 + 1) * T; py += 3) for (let px = RK.x0 * T; px < (RK.x1 + 1) * T; px += 3) {
      const x = (px + 0.5) / T, y = (py + 0.5) / T;
      if (C.rinkInside(x, y) && !rs.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)) return false;
    }
    return true;
  })());
  // L'instant (sweepWhen) et la zone (sweptRects) disent la même chose.
  let rng = 12345; const rnd = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
  let agree = 0, disagree = 0, premature = 0;
  for (let k = 0; k < 4000; k++) {
    const x = RK.x0 + rnd() * (RK.x1 + 1 - RK.x0), y = RK.y0 + rnd() * (RK.y1 + 1 - RK.y0), t = rnd() * S.PASS_MS;
    if (!C.rinkInside(x, y)) continue;
    const when = S.sweepWhen(x, y), inRect = S.sweptRects(t).some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    if (when <= t - 40 && !inRect) disagree++;      // couvert depuis un moment, mais le dessin ne le montre pas
    else if (when > t + 40 && inRect) premature++;   // montré avant que la lame y soit passée
    else agree++;
  }
  ok("l'instant où un point est lissé (`sweepWhen`) et la zone lissée à un instant (`sweptRects`) concordent", disagree === 0 && premature === 0, `${agree} concordent, ${disagree} manquants, ${premature} prématurés`);
  ok("les rectangles ne se rétractent jamais : ce qui est lissé le reste", (() => {
    let prev = [];
    for (let t = 100; t < S.PASS_MS; t += 700) {
      const now = S.sweptRects(t);
      for (const p of prev) if (!now.some((r) => r.x0 <= p.x0 + 1e-9 && r.x1 >= p.x1 - 1e-9 && r.y0 <= p.y0 + 1e-9 && r.y1 >= p.y1 - 1e-9)) return false;
      prev = now;
    }
    return true;
  })());
  ok("rien n'est lissé avant le début de la passe", S.sweptRects(0).length === 0 && S.sweptRects(-10).length === 0 && !S.isSwept(0, RK.x0 + 3, RK.y0 + 3));
}

section("§4 — sa place, garée");
{
  const tw = E.townWinterWorld(E.generateTownWorld());
  const px = Math.floor(S.PARK.x), py = Math.floor(S.PARK.y), W = tw.w;
  ok("sa place est hors de la glace et hors de la bande", !C.rinkInside(S.PARK.x, S.PARK.y) && !C.rinkBandSolid(S.PARK.x, S.PARK.y) && S.PARK.x > RK.x1 + 2);
  const cells = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 0; dy++) cells.push([px + dx, py + dy]);
  const bad = cells.filter(([x, y]) => tw.solid[y * W + x] || tw.ground[y * W + x] === C.G_WATER || tw.objects[y * W + x] !== C.O_NONE);
  ok("le sol de sa place est libre dans le vrai monde d'hiver (ni solide, ni eau, ni décor)", bad.length === 0, bad.length ? `occupé : ${JSON.stringify(bad)}` : `${cells.length} cases libres`);
  // L'emprise que lit `blockedTown` : ±0,95 en x, ±0,55 en y autour de (PARK.x, PARK.y − 0,2)
  const hy0 = S.PARK.y - 0.2 - 0.55, hy1 = S.PARK.y - 0.2 + 0.55;
  ok("garée, elle ne bouche ni le passage du portillon est, ni le comptoir du chalet, ni la sortie de la glace", hy0 > gate.b + 1.2 && hy0 > RK.y0 && (() => {
    const ch = C.TOWN_RINK_CHALET; return hy0 > ch.y + C.TOWN_SKATE_CHALET_H + 1.5;
  })(), `emprise y ${hy0.toFixed(2)}–${hy1.toFixed(2)}, portillon ${gate.a}–${gate.b + 1}`);
  ok("on peut passer entre sa place et la bande/les mâts : l'allée de l'est reste libre sur au moins une case", S.PARK.x - 0.95 > RK.x1 + 1 + 1.0);
}

section("§5 — le dessin : quatre états d'usure, la glace neuve sous la lame, la machine");
{
  const W = (RK.x1 - RK.x0 + 1) * T, H = (RK.y1 - RK.y0 + 1) * T;
  const paint = (st, base) => {
    const cv = makeCanvas(W, H), g = cv.ctx;
    for (let y = RK.y0; y <= RK.y1; y++) for (let x = RK.x0; x <= RK.x1; x++) {
      const px = (x - RK.x0) * T, py = (y - RK.y0) * T;
      if (base) A.drawRinkIceTile(g, x, y, px, py);
      if (st) A.drawRinkWearAt(g, x, y, px, py, st);
    }
    return cv.px;
  };
  const lv = [1, 2, 3].map((l) => paint({ lv: l, prev: l, f: 1, rects: null, wet: 9000 }, false));
  const cover = lv.map((px) => { let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 12) n++; return n; });
  let outside = 0, mono = 0, nIce = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = RK.x0 * T + x, wy = RK.y0 * T + y, i = (y * W + x) * 4 + 3;
    const inside = C.rinkInside((wx + 0.5) / T, (wy + 0.5) / T);
    if (!inside) { if (lv.some((px) => px[i] > 0)) outside++; continue; }
    nIce++;
    if (!(lv[0][i] <= lv[1][i] && lv[1][i] <= lv[2][i])) mono++;
  }
  console.log(`      (couverture de marques visibles : marquée ${(100 * cover[0] / nIce).toFixed(1)} % · rayée ${(100 * cover[1] / nIce).toFixed(1)} % · usée ${(100 * cover[2] / nIce).toFixed(1)} % de la glace)`);
  ok("chaque état en montre plus que le précédent (couverture croissante, d'au moins 10 % chacun)", cover[0] < cover[1] * 0.9 && cover[1] < cover[2] * 0.9 && cover[0] > 0);
  ok("l'usure d'un pixel ne diminue jamais d'un niveau au suivant (chaque état contient les marques du précédent)", mono === 0, `${mono} pixels qui reculent`);
  ok("aucune marque hors de la glace (ni dans les coins arrondis, ni sur la bande)", outside === 0, `${outside} pixels dehors`);
  ok("le niveau 0 ne pose rien (la glace neuve est le tampon d'origine)", (() => { const p0 = paint({ lv: 0, prev: 0, f: 1, rects: null, wet: 9000 }, false); for (let i = 3; i < p0.length; i += 4) if (p0[i]) return false; return true; })());
  // Le fondu : deux calques à l'opacité complémentaire (le faux canevas ignore `globalAlpha` : on espionne les appels).
  const spy = () => { const calls = []; const g = { globalAlpha: 1, fillStyle: "", fillRect() {}, drawImage(img) { calls.push({ a: this.globalAlpha, img }); } }; return { g, calls }; };
  { const q1 = spy(); A.drawRinkWearAt(q1.g, RK.x0 + 3, RK.y0 + 3, 0, 0, { lv: 3, prev: 1, f: 0.5, rects: null, wet: 9000 });
    const q2 = spy(); A.drawRinkWearAt(q2.g, RK.x0 + 3, RK.y0 + 3, 0, 0, { lv: 3, prev: 3, f: 1, rects: null, wet: 9000 });
    const q3 = spy(); A.drawRinkWearAt(q3.g, RK.x0 + 3, RK.y0 + 3, 0, 0, { lv: 0, prev: 2, f: 0.25, rects: null, wet: 9000 });
    const q4 = spy(); A.drawRinkWearAt(q4.g, RK.x0 + 3, RK.y0 + 3, 0, 0, { lv: 2, prev: 0, f: 0.25, rects: null, wet: 9000 });
    ok("le fondu d'un niveau à l'autre pose deux calques d'opacités complémentaires (0,5 + 0,5), un seul calque plein sinon", q1.calls.length === 2 && Math.abs(q1.calls[0].a - 0.5) < 1e-9 && Math.abs(q1.calls[1].a - 0.5) < 1e-9 && q1.calls[0].img !== q1.calls[1].img && q2.calls.length === 1 && q2.calls[0].a === 1);
    ok("vers la glace neuve (niveau 0), seul l'ancien calque s'efface (0,75 puis moins) ; depuis la neuve, seul le nouveau apparaît (0,25)", q3.calls.length === 1 && Math.abs(q3.calls[0].a - 0.75) < 1e-9 && q4.calls.length === 1 && Math.abs(q4.calls[0].a - 0.25) < 1e-9);
    ok("`globalAlpha` est toujours remis à 1 (un calque ne délave pas la suite du dessin)", q1.g.globalAlpha === 1 && q3.g.globalAlpha === 1);
  }
  // La glace neuve remise sous la lame, au pixel près.
  const base = paint(null, true), worn = paint({ lv: 3, prev: 3, f: 1, rects: null, wet: 9000 }, true);
  const rectPx = { x0: 4 * T + 3, y0: 4 * T + 5, x1: 9 * T + 7, y1: 7 * T + 2, age: 9000 };   // en px DU CANEVAS DU BANC (le jeu, lui, donne des px du monde, comme `px`/`py` de la case) ; age = wet : plus de brillant
  const withRect = paint({ lv: 3, prev: 3, f: 1, rects: [rectPx], wet: 9000 }, true);
  let inBad = 0, outBad = 0, inN = 0, differs = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const inR = x >= rectPx.x0 && x < rectPx.x1 && y >= rectPx.y0 && y < rectPx.y1;
    const same = (a, b) => a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2];
    if (inR) { inN++; if (!same(withRect, base)) inBad++; if (!same(worn, base)) differs++; } else if (!same(withRect, worn)) outBad++;
  }
  ok("sous un rectangle lissé, on retrouve EXACTEMENT la glace neuve — au pixel, pas à la case", inBad === 0 && inN > 1000, `${inN} pixels dans le rectangle, ${inBad} différents de la glace neuve`);
  ok("… et le calque d'usure y avait bien laissé des marques (le test n'est pas vide)", differs > inN * 0.05, `${differs} pixels différaient avant`);
  ok("… et hors du rectangle, rien n'est touché", outBad === 0, `${outBad} pixels modifiés dehors`);
  // Le brillant de l'eau fraîche éclaircit, puis s'estompe.
  const fresh = paint({ lv: 0, prev: 0, f: 1, rects: [{ ...rectPx, age: 0 }], wet: 9000 }, true), faded = paint({ lv: 0, prev: 0, f: 1, rects: [{ ...rectPx, age: 9000 }], wet: 9000 }, true);
  const lum = (px, set) => { let s = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (x >= rectPx.x0 && x < rectPx.x1 && y >= rectPx.y0 && y < rectPx.y1) { const i = (y * W + x) * 4; s += px[i] + px[i + 1] + px[i + 2]; n++; } } return s / n; };
  ok("le brillant de l'eau fraîche éclaircit la glace, puis disparaît avec l'âge", lum(fresh) > lum(faded) + 3 && Math.abs(lum(faded) - lum(base)) < 0.5, `${lum(fresh).toFixed(1)} > ${lum(faded).toFixed(1)}`);
  // La machine : quatre caps, bornée, non vide, de profil symétrique.
  const bbox = (dir, st) => {
    const cv = makeCanvas(120, 120), g = cv.ctx; A.drawRinkSurfacer(g, 60, 90, dir, st);
    let x0 = 999, x1 = -1, y0 = 999, y1 = -1, n = 0;
    for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) if (cv.px[(y * 120 + x) * 4 + 3] > 40) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { n, w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1, y0, y1 };
  };
  const bb = [0, 1, 2, 3].map((d) => bbox(d, { moving: false, lit: 0, ms: 0 }));
  ok("la machine se dessine dans ses quatre caps, d'une taille de véhicule (20–50 px de large, 20–55 de haut)", bb.every((b) => b.n > 400 && b.w >= 20 && b.w <= 50 && b.h >= 20 && b.h <= 55), bb.map((b) => `${b.w}×${b.h}`).join(" · "));
  ok("l'ouest est le miroir de l'est (même emprise à ±2 px)", Math.abs(bb[2].w - bb[3].w) <= 2 && Math.abs(bb[2].h - bb[3].h) <= 2 && Math.abs((60 - bb[2].x0) - (bb[3].x1 - 60)) <= 3);
  ok("elle reste dans son cadre : ses pieds sont au sol donné (y = 90), rien dessous à plus de 2 px", bb.every((b) => b.y1 <= 92 && b.y1 >= 88));
  ok("la nuit, ses phares ajoutent de la lumière peinte (jamais de la matière)", (() => { const a = bbox(3, { moving: true, lit: 0, ms: 300 }), b = bbox(3, { moving: true, lit: 1, ms: 300 }); return b.n >= a.n && b.n <= a.n + 60; })());
}

section("§6 — garde-fous de source (le réseau et la course)");
{
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const count = (re) => (src.match(re) || []).length;
  const nReq = count(/req\.kind === "rinkSmooth"/g), nTick = count(/if \(isHost\) hostIceTick\(dt\)/g), nApply = count(/if \(p\.ice\) iceApply\(p\.ice\)/g), nSnap = count(/rinkIce: iceSnapshot\(\)/g);
  const nFast = count(/hostIceFast\(out\)/g), nBookWait = count(/rinkIceRef\.current\.host\.passUntil\) return no\("rinkBookWait"\)/g), nHostOnly = count(/function hostIceTick/g);
  console.log(`      (lues : requête ${nReq}, tick ${nTick}, apply ${nApply}, instantané ${nSnap}, lissage forcé ${nFast}, attente de réservation ${nBookWait})`);
  ok("la demande du chalet (`rinkSmooth`) est arbitrée par l'hôte", nReq === 1 && /function hostRinkSmooth\(req, f, s, out\)/.test(src));
  ok("l'usure se compte chez l'HÔTE seulement, à chaque image", nTick === 1 && nHostOnly === 1);
  ok("le niveau et la passe se reçoivent par `apply`, et un arrivant les reçoit par l'instantané", nApply === 1 && nSnap === 1 && /if \(!isHost && payload\.rinkIce\) iceApply\(payload\.rinkIce\)/.test(src));
  ok("à la réservation et au départ d'une course, la glace est lissée (`hostIceFast`, trois occurrences : définition + deux appels)", nFast === 3 && /function hostIceFast\(out\)/.test(src));
  ok("on ne réserve pas la glace PENDANT une passe (la machine est sur la piste)", nBookWait === 1);
  ok("la requête de lissage refuse pendant une course, pendant une passe, quand la glace est déjà lisse, et loin du chalet", ["rinkSmoothBusy", "rinkSmoothRunning", "rinkSmoothClean", "rinkSmoothFar"].every((k) => new RegExp(`no\\("${k}"\\)`).test(src)));
  ok("le diffuseur ne parle que d'un NIVEAU (jamais une position de machine)", !/payload: \{ ice: \{[^}]*(surf|x:|y:)/.test(src));
  const stringsSrc = fs.readFileSync(path.join(ROOT, "components", "ferme", "fermeStrings.js"), "utf8");
  ok("les textes de l'usure existent dans les deux langues (clés `ice*` et `rinkSmooth*`)", ["iceLevelName", "iceShopTitle", "iceShopAsk", "iceSmoothStart", "iceSmoothFast", "iceWornToast", "rinkSmoothFar", "rinkSmoothBusy", "rinkSmoothRunning", "rinkSmoothClean", "rinkBookWait"].every((k) => (stringsSrc.match(new RegExp(`\\b${k}\\b`, "g")) || []).length >= 2));
}

section("§7 — la chute sans patins : 30 s à 2 min, et déposé au bord de la glace");
{
  ok("la blessure de la chute est bornée entre 30 secondes et 2 minutes", C.ICE_INJURED_MIN_MS === 30000 && C.ICE_INJURED_MAX_MS === 120000 && C.ICE_INJURED_MIN_MS < C.ICE_INJURED_MAX_MS);
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  ok("plus aucune lecture de l'ancienne durée de quinze minutes (`ICE_INJURED_MS` seul)", !/C\.ICE_INJURED_MS\b/.test(src) && C.ICE_INJURED_MS === undefined);
  ok("l'hôte borne la durée envoyée par le joueur (et tire lui-même hors bornes)", /req\.until >= nowI \+ C\.ICE_INJURED_MIN_MS - 3000 && req\.until <= nowI \+ C\.ICE_INJURED_MAX_MS \+ 5000/.test(src) && /nowI \+ C\.ICE_INJURED_MIN_MS \+ Math\.floor\(Math\.random\(\) \* \(C\.ICE_INJURED_MAX_MS - C\.ICE_INJURED_MIN_MS \+ 1\)\)/.test(src));
  const fall = src.slice(src.indexOf("function iceFallNow(spot)"), src.indexOf("function iceFallNow(spot)") + 1600);
  ok("la chute dépose le joueur au bord de la glace (`spot`) : la zone ne change pas, les touches tenues sont lâchées", /if \(spot\) \{ m\.x = spot\.x; m\.y = spot\.y;/.test(fall) && /keysRef\.current = \{\}/.test(fall) && /iceFallNow\(iceShoreSpot\(tw, m\)\)/.test(src));
  ok("le retour à la ferme n'est plus que le secours (sans `spot`)", /else \{ m\.zone = "farm"; m\.x = C\.SPAWN\.x; m\.y = C\.SPAWN\.y; \}/.test(fall) && !/m\.zone = "farm"; m\.x = C\.SPAWN\.x; m\.y = C\.SPAWN\.y; m\.moving/.test(fall));
  // L'atterrissage : la case libre la plus proche, hors de la glace de la patinoire (et hors de la bande)
  const clear = (x, y) => !C.rinkInside(x, y) && !C.rinkBandSolid(x, y);
  const cx = (RK.x0 + RK.x1 + 1) / 2, cy = (RK.y0 + RK.y1 + 1) / 2;
  const starts = [[cx, cy], [RK.x0 + 1.2, RK.y0 + 1.2], [RK.x1 - 0.5, RK.y1 - 0.5], [RK.x1 + 0.4, YG], [RK.x0 + 0.8, cy], [cx, RK.y0 + 0.6], [cx + 3, RK.y1 + 0.3]];
  let allOk = true, nearOk = true, worst = 0; const det = [];
  for (const [sx, sy] of starts) {
    const sp = PT.skateShoreSpot(sx, sy, clear);
    if (!sp || !clear(sp.x, sp.y)) { allOk = false; det.push("aucun"); continue; }
    let best = Infinity;
    for (let gy = sy - 14; gy <= sy + 14; gy += 0.1) for (let gx = sx - 14; gx <= sx + 14; gx += 0.1) if (clear(gx, gy)) best = Math.min(best, Math.hypot(gx - sx, gy - sy));
    worst = Math.max(worst, sp.r - best);
    if (sp.r > best + 0.55) nearOk = false;
    det.push(`${sp.r.toFixed(1)} (optimum ${best.toFixed(1)})`);
  }
  ok("de n'importe où sur la patinoire, on est déposé HORS de la glace et hors de la bande", allOk, det.join(" · "));
  ok("… et l'endroit est l'un des plus proches (à un demi-pas près)", nearOk, `écart max ${worst.toFixed(2)} case`);
  ok("rien de libre : pas d'atterrissage (le secours prend le relais)", PT.skateShoreSpot(cx, cy, () => false, 10) === null);
  ok("le cap regarde l'endroit d'où l'on vient (vers la glace)", (() => { const sp = PT.skateShoreSpot(cx, RK.y0 + 0.6, clear); return sp && sp.dir === 0; })());
}

console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
