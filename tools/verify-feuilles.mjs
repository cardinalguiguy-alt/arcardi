/* =============================================================================
   verify-feuilles.mjs — LES FEUILLES MORTES (2026-09-30) : LA CHUTE, LE TAPIS, LE
   VENT, ET LA SOUDURE AVEC L'HIVER.
   -----------------------------------------------------------------------------
   Guillaume : « vers la fin de l'automne, des feuilles mortes doivent tomber des
   arbres pour se retrouver au sol aux pieds des arbres, et des feuilles doivent
   voler quand il y a du vent et des intempéries ».
   Ce que ce banc tient (chaque contrôle falsifié le jour de son écriture) :
     §1  le calendrier : rien avant la moitié de l'automne, tout à la fin, jamais
         en arrière, et un arbre ne se dénude pas au même instant que son voisin ;
     §2  la chute au pixel : un pixel tombé reste tombé, la part tombée suit `f`,
         et les trouées se font PAR PLAQUES (pas en poivre et sel) ;
     §3  LA SOUDURE : un arbre d'automne à la fin de sa chute est, AU PIXEL PRÈS,
         l'arbre nu du premier jour d'hiver — la saison bascule sans que rien ne
         saute (§4 de CLAUDE.md : une transition qui se voit se fait par un ordre au
         pixel, jamais par un seuil commun) ;
     §4  le tapis : il suit la chute, tient l'hiver, disparaît avant le printemps,
         sans saut aux deux bascules de saison ;
     §5  ce qui vole : sans vent, les feuilles tombent et se posent ; au vent, elles
         filent vers l'est, et jamais plus que le plafond ;
     §6  (reprise du 2026-09-30, Guillaume : « on dirait que la forme générale de
         l'arbre est rongée, pas que les branches se dénudent ») LA COURONNE SE
         DÉNUDE PAR SES BRANCHES : aucun éclat isolé, une couronne d'un seul tenant
         jusqu'à mi-chute, plus rien loin du bois à 75 %, pas de saut au premier
         cran, quelques feuilles au bout des branches à 90 %. Chaque mesure REJOUE
         le premier jet (`thinPixels` sur l'image d'automne) et doit le voir rougir.
   Planche : tools/out/feuilles-chute.png — toutes les essences caduques et leurs
   tailles, de 0 à 100 % de chute, puis l'hiver.
   Usage : node tools/verify-feuilles.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "feuilles"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine, FL = mods.feuilles;

let fail = 0, n = 0;
const ok = (cond, label, detail) => {
  n++;
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* ═══ §1 — LE CALENDRIER ════════════════════════════════════════════════════
   Falsifié : `FALL_FROM` à 0 → des feuilles tombent dès le début de l'automne. */
{
  ok(FL.leafFall("autumn", 0.45, 0) === 0 && FL.leafFall("summer", 0.9, 0) === 0 && FL.leafFall("spring", 0.5, 0) === 0, "rien ne tombe avant la moitié de l'automne", "");
  ok(FL.leafFall("winter", 0.1, 0) === 1, "l'hiver, les feuillus sont nus", "");
  let back = 0, prev = -1;
  for (let p = 0; p <= 1.0001; p += 0.01) { const f = FL.leafFall("autumn", p, 0); if (f < prev - 1e-9) back++; prev = f; }
  ok(back === 0, "la chute ne recule jamais au fil de l'automne", `${back} recul(s)`);
  // Les deux extrêmes du décalage par arbre (±8 %) : tous nus à la fin de l'automne.
  const ends = [-0.08, 0, 0.08].map((j) => FL.leafFall("autumn", 1, j));
  ok(ends.every((f) => f === 1), "à la fin de l'automne, tous les feuillus sont nus (décalage compris)", ends.map((f) => f.toFixed(3)).join(" / "));
  // Deux arbres voisins ne se dénudent pas à la même seconde.
  const tw = E.generateTownWorld();
  let diff = 0, pairs = 0;
  for (let y = 1; y < tw.h - 1; y++) for (let x = 1; x < tw.w - 2; x++) {
    if (tw.objects[y * tw.w + x] !== C.O_TREE || tw.objects[y * tw.w + x + 1] !== C.O_TREE) continue;
    pairs++;
    if (Math.abs(A.townTreeFall("autumn", 0.7, x, y) - A.townTreeFall("autumn", 0.7, x + 1, y)) > 0.02) diff++;
  }
  ok(pairs > 5 && diff / pairs > 0.5, "deux feuillus voisins n'en sont pas au même point", `${diff}/${pairs} paires différentes à 70 % de l'automne`);
}

/* ═══ §2 — LA CHUTE AU PIXEL ════════════════════════════════════════════════
   Falsifié : `leafOrder` réduit à son grain (`u01` seul) → l'agrégation tombe à
   ~0, le contrôle des plaques rougit. */
{
  const W = 48, H = 64, src = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { src[i * 4] = 200; src[i * 4 + 1] = 120; src[i * 4 + 2] = 40; src[i * 4 + 3] = 255; }
  const gone = (f) => { const p = FL.thinPixels(src, W, H, f), m = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) m[i] = p[i * 4 + 3] === 0 ? 1 : 0; return m; };
  const a = gone(0.3), b = gone(0.6), z = gone(0), o = gone(1);
  let back = 0, na = 0, nb = 0;
  for (let i = 0; i < W * H; i++) { if (a[i] && !b[i]) back++; na += a[i]; nb += b[i]; }
  ok(back === 0, "un pixel tombé reste tombé (30 % → 60 %)", `${back} pixel(s)`);
  ok(Math.abs(na / (W * H) - 0.3) < 0.12 && Math.abs(nb / (W * H) - 0.6) < 0.12, "la part tombée suit la chute", `${(100 * na / (W * H)).toFixed(0)} % à 30, ${(100 * nb / (W * H)).toFixed(0)} % à 60`);
  ok(z.every((v) => v === 0) && o.every((v) => v === 1), "0 : rien n'est tombé ; 1 : tout est tombé", "");
  // Les plaques : un voisin d'un pixel tombé est tombé bien plus souvent que le hasard.
  let nn = 0, both = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) { const i = y * W + x; if (!a[i]) continue; nn++; if (a[i + 1]) both++; }
  const pr = na / (W * H);
  ok(both / nn > pr + 0.15, "les trouées se font par plaques", `voisin tombé ${(100 * both / nn).toFixed(0)} % contre ${(100 * pr).toFixed(0)} % au hasard`);
}

/* ═══ §3 — LA SOUDURE AVEC L'HIVER ══════════════════════════════════════════
   Falsifié : l'arbre nu retiré du dessin d'automne (seule la couronne éclaircie) →
   à 100 % il ne reste rien, le contrôle rougit. */
const S = A.buildSprites();
const tw = E.generateTownWorld();
const picks = [];
{
  const seen = new Set();
  for (let y = 4; y < tw.h - 4 && picks.length < 4; y++) for (let x = 4; x < tw.w - 4 && picks.length < 4; x++) {
    const o = tw.objects[y * tw.w + x];
    if (o !== C.O_TREE) continue;
    const k = A.townTreeKind(tw, x, y, o);
    if (k === null || A.townTreeEvergreen(k) || seen.has(k)) continue;
    if (A.townTreeSize(tw, x, y, o) !== "adult") continue;
    seen.add(k); picks.push({ x, y, o, k });
  }
  let same = 0, painted = 0, tot = 0;
  for (const t of picks) {
    const a = makeCanvas(96, 96), b = makeCanvas(96, 96);
    A.drawTownTree(a.ctx, S, tw, t.x, t.y, 40, 70, "autumn", t.o, 0, null, 1);
    A.drawTownTree(b.ctx, S, tw, t.x, t.y, 40, 70, "winter", t.o, 0, null);
    for (let i = 0; i < a.px.length; i += 4) {
      tot++;
      if (a.px[i + 3]) painted++;
      if (a.px[i] === b.px[i] && a.px[i + 1] === b.px[i + 1] && a.px[i + 2] === b.px[i + 2] && a.px[i + 3] === b.px[i + 3]) same++;
    }
  }
  ok(picks.length >= 3, "assez d'essences feuillues pour conclure", `${picks.length} essence(s) : ${picks.map((t) => t.k).join(", ")}`);
  ok(painted > 500 && same === tot, "à la fin de sa chute, l'arbre d'automne EST l'arbre nu d'hiver, au pixel près", `${tot - same} pixel(s) différent(s) sur ${tot}, ${painted} peints`);
  // Et à 0 %, l'arbre d'automne n'a pas bougé d'un pixel.
  let d0 = 0;
  for (const t of picks) {
    const a = makeCanvas(96, 96), b = makeCanvas(96, 96);
    A.drawTownTree(a.ctx, S, tw, t.x, t.y, 40, 70, "autumn", t.o, 0, null, 0);
    A.drawTownTree(b.ctx, S, tw, t.x, t.y, 40, 70, "autumn", t.o, 0, null);
    for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) d0++;
  }
  ok(d0 === 0, "avant la chute, l'arbre d'automne est celui d'avant", `${d0} octet(s) différent(s)`);
}

/* ═══ §4 — LE TAPIS ═════════════════════════════════════════════════════════
   Falsifié : `litterLevel` d'hiver à 0 → saut de 1 à 0 à la bascule. */
{
  const e1 = FL.litterLevel("autumn", 1, 0), e2 = FL.litterLevel("winter", 0, 0);
  ok(Math.abs(e1 - e2) < 0.02, "le tapis ne saute pas à l'entrée de l'hiver", `${e1.toFixed(2)} → ${e2.toFixed(2)}`);
  const w1 = FL.litterLevel("winter", 1, 0), s0 = FL.litterLevel("spring", 0, 0);
  ok(w1 < 0.02 && s0 === 0, "il a disparu au printemps, sans saut", `${w1.toFixed(3)} → ${s0}`);
  ok(FL.litterLevel("autumn", 0.3, 0) === 0 && FL.litterLevel("summer", 0.5, 0) === 0, "pas de tapis avant la chute", "");
  const L = FL.litterLeaves(19, 8, 3, 4);
  const near = L.filter((q) => Math.hypot(q.x / 19, q.y / 8) < 0.5).length / L.length;
  ok(L.length > 60 && near > 0.35, "le tapis est plus dense près du tronc", `${L.length} feuilles, ${(100 * near).toFixed(0)} % dans la demi-ellipse centrale (25 % de l'aire)`);
  const pal = FL.autumnPalette(new Uint8ClampedArray(16 * 4), 4, 4);
  ok(pal.length >= 2, "une essence sans teinte lisible retombe sur l'or", `${pal.length} teintes`);
}

/* ═══ §5 — CE QUI VOLE ══════════════════════════════════════════════════════
   Falsifié : la dérive des feuilles qui tombent retirée (`wind * 26` à 0) → la
   seconde mesure du vent rougit. */
{
  const view = { x0: 0, x1: 640, y0: 0, y1: 480 };
  const pal = [[214, 148, 52], [192, 104, 40]];
  const src = [{ x: 300, y: 200, rx: 14, ry: 9, ground: 240, pal, rate: 30 }];
  const calm = FL.makeLeafFlurry();
  for (let k = 0; k < 60; k++) calm.step({ dt: 0.05, wind: 0, sources: src, view });
  const pts = []; calm.draw((x, y) => pts.push({ x, y }));
  ok(calm.count() > 20 && pts.every((p) => p.y <= 246), "sans vent, les feuilles tombent et se posent au pied", `${calm.count()} feuilles, plus basse à y=${Math.max(...pts.map((p) => p.y))}`);
  const windy = FL.makeLeafFlurry();
  let x0 = 0;
  for (let k = 0; k < 60; k++) windy.step({ dt: 0.05, wind: 0.9, sources: src, view, flyPal: pal, flyRate: 3, gust: 0.9, lift: [{ x: 300, y: 240, pal }] });
  const wp = []; windy.draw((x, y) => wp.push(x));
  for (let k = 0; k < 20; k++) windy.step({ dt: 0.05, wind: 0.9, sources: [], view, flyPal: pal, flyRate: 0 });
  const wp2 = []; windy.draw((x) => wp2.push(x));
  x0 = wp.reduce((a, b) => a + b, 0) / Math.max(1, wp.length);
  const x1 = wp2.reduce((a, b) => a + b, 0) / Math.max(1, wp2.length);
  ok(wp.length > calm.count(), "au vent, il y a plus de feuilles en l'air (celles qui volent)", `${wp.length} contre ${calm.count()} sans vent`);
  ok(x1 > x0 + 10, "le vent emporte celles qui volent vers l'est", `abscisse moyenne ${x0.toFixed(0)} → ${x1.toFixed(0)}`);
  // Celles qui TOMBENT dérivent aussi (premier jet : mesuré avec celles qui volent,
  // le contrôle restait vert sans la dérive — falsifié).
  const mean = (fl) => { const q = []; fl.draw((x) => q.push(x)); return q.reduce((a, b) => a + b, 0) / Math.max(1, q.length); };
  const fallW = FL.makeLeafFlurry();
  for (let k = 0; k < 60; k++) fallW.step({ dt: 0.05, wind: 0.9, sources: src, view });
  ok(mean(fallW) > mean(calm) + 8, "au vent, les feuilles qui tombent dérivent vers l'est", `abscisse moyenne ${mean(calm).toFixed(0)} sans vent, ${mean(fallW).toFixed(0)} au vent`);
  const storm = FL.makeLeafFlurry();
  for (let k = 0; k < 400; k++) storm.step({ dt: 0.1, wind: 1, sources: [{ ...src[0], rate: 400 }], view, flyPal: pal, flyRate: 40, gust: 1, lift: [] });
  ok(storm.count() <= 260, "jamais plus que le plafond, même dans la tempête", `${storm.count()} feuilles`);
}

/* ═══ §6 — LA COURONNE SE DÉNUDE PAR SES BRANCHES ══════════════════════════
   Le premier jet perçait l'image d'automne au pixel : le cerne restait en éclats
   dans le vide, la couronne partait en miettes, et des feuilles flottaient au-delà
   des rameaux de l'arbre nu (plus étroit qu'elle). Les essences en code se
   redessinent maintenant par bouquets (`fallClumps`), le pommier de la planche par
   bouquets découpés dans son image (`FL.clumpThin`). Le saule, qui perd ses feuilles
   par mèches sur un hiver de même silhouette, n'est pas mesuré ici (ses fils d'un
   pixel SONT des éclats) : il se juge sur la planche.
   Chaque mesure est faite sur le NOUVEAU et sur le PREMIER JET rejoué (le vrai
   défaut, pas une falsification fabriquée — §10 de CLAUDE.md) ; le seuil est posé
   entre les deux. */
const ALL = ["OAK/adult", "OAK/young", "OAK/planted", "OAK/tall", "OAK/short", "MAPLE/adult", "MAPLE/tall", "BIRCH/adult", "BIRCH/young",
             "APPLE/adult", "CHERRY/adult", "REF_MAGNOLIA/adult", "REF_MAGNOLIA/tall", "REF_APPLE/adult", "REF_WILLOW/adult", "REF_WILLOW/grand"];
const TTN = Object.fromEntries(Object.entries(A.TT).map(([k, v]) => [v, k]));
const every = [];
for (const want of ALL) {
  let got = null;
  for (let y = 4; y < tw.h - 4 && !got; y++) for (let x = 4; x < tw.w - 4 && !got; x++) {
    const o = tw.objects[y * tw.w + x];
    if (o !== C.O_TREE) continue;
    const k = A.townTreeKind(tw, x, y, o);
    if (k === null) continue;
    const size = A.townTreeSize(tw, x, y, o);
    if (TTN[k] + "/" + size === want) got = { x, y, o, k, size, want };
  }
  if (got) every.push(got);
}
{
  const pixOf = (cell) => cell.img.getContext("2d").getImageData(cell.sx, cell.sy, cell.w, cell.h).data;
  const pixSrc = (img) => (img.sx !== undefined ? pixOf(img) : img.getContext("2d").getImageData(0, 0, img.width, img.height).data);
  // Les feuilles d'une couronne (au-dessus de l'ombre portée), ses morceaux, ses éclats, ce qui flotte loin du bois.
  const measure = (ov, bare, w, h, base) => {
    const leaf = new Uint8Array(w * h);
    let n = 0;
    for (let y = 0; y < base - 5; y++) for (let x = 0; x < w; x++) if (ov[(y * w + x) * 4 + 3] >= 200) { leaf[y * w + x] = 1; n++; }
    const seen = new Uint8Array(w * h);
    let specks = 0, comps = 0, fl = 0;
    for (let i = 0; i < w * h; i++) if (leaf[i] && !seen[i]) {
      comps++;
      let sz = 0;
      const st = [i], comp = [i]; seen[i] = 1;
      while (st.length) {
        const j = st.pop(); sz++;
        const x = j % w, y = (j / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (leaf[k] && !seen[k]) { seen[k] = 1; st.push(k); comp.push(k); }
        }
      }
      // Un ÉCLAT ne touche ni le feuillage ni le bois de l'arbre nu : un bout de rameau
      // d'un pixel posé sur le fût n'en est pas un (premier jet de la mesure : si).
      if (sz <= 2) {
        let wood = false;
        for (const j of comp) {
          const x = j % w, y = (j / w) | 0;
          for (let dy = -1; dy <= 1 && !wood; dy++) for (let dx = -1; dx <= 1 && !wood; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && bare[(yy * w + xx) * 4 + 3] >= 200) wood = true;
          }
        }
        if (!wood) specks++;
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!leaf[y * w + x]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && bare[(yy * w + xx) * 4 + 3] >= 200) near = true;
      }
      if (!near) fl++;
    }
    return { n, specks, comps, float: n ? fl / n : 0 };
  };
  const trees = every.filter((t) => t.k !== A.TT.REF_WILLOW);
  const coded = trees.filter((t) => t.k !== A.TT.REF_APPLE);
  let specks = 0, specksOld = 0, split = [], splitOld = 0, float = [], floatOld = 0, grow = [], late = 0;
  for (const t of trees) {
    const bare = S.townTreesWinter.get(t.k, t.size, 0, 1, false);
    const src = A.townTreeImg(S, tw, t.x, t.y, "autumn", t.o, 0).img;
    const bd = pixOf(bare), sd = pixSrc(src), w = bare.w, h = bare.h, base = bare.m.base;
    let prev = Infinity;
    for (let step = 1; step < FL.FALL_STEPS; step++) {
      const nw = measure(pixOf(S.townTreesFall.get(t.k, t.size, 1, step, bare, src)), bd, w, h, base);
      const old = measure(FL.thinPixels(sd, w, h, step / FL.FALL_STEPS), bd, w, h, base);
      specks += nw.specks; specksOld += old.specks;
      // Deux morceaux au plus jusqu'à 30 % (un baliveau n'est qu'un anneau de quelques
      // bouquets : en perdre un l'ouvre), trois à mi-chute (le magnolia, dont les
      // bouquets sont au bout de rameaux écartés). Le premier jet : des dizaines.
      if (step <= 9 && coded.includes(t)) { const lim = step <= 6 ? 2 : 3; if (nw.comps > lim) split.push(`${t.want}@${step}:${nw.comps}`); splitOld += old.comps > lim ? 1 : 0; }
      if (step === 15) { if (nw.float > 0.02) float.push(`${t.want}:${nw.float.toFixed(2)}`); floatOld += old.float; }
      if (step === 18 && nw.n > 0) late++;
      if (nw.n > prev * 1.04 + 4) grow.push(`${t.want}@${step}:${prev}→${nw.n}`);
      prev = nw.n;
    }
  }
  ok(trees.length >= 12, "toutes les essences caduques et leurs tailles sont mesurées", `${trees.length} arbres : ${trees.map((t) => t.want).join(", ")}`);
  ok(specks === 0 && specksOld > 100, "aucun éclat isolé (≤ 2 px) dans une couronne qui se dénude", `${specks} éclat(s) sur 19 crans × ${trees.length} arbres ; le premier jet en semait ${specksOld}`);
  ok(split.length === 0 && splitOld > coded.length * 4, "la couronne s'ouvre, elle ne s'émiette pas (deux morceaux au plus jusqu'à 30 %, trois à mi-chute)", split.length ? split.slice(0, 6).join(" · ") : `le premier jet la mettait en miettes ${splitOld} fois sur ${coded.length * 9}`);
  const floatOldMean = floatOld / trees.length;
  ok(float.length === 0 && floatOldMean > 0.05, "à 75 %, les feuilles qui restent sont sur le bois de l'arbre nu", float.length ? float.join(" · ") : `≤ 2 % loin d'un rameau partout ; le premier jet : ${(100 * floatOldMean).toFixed(0)} % en moyenne`);
  ok(grow.length === 0, "le feuillage ne revient jamais d'un cran au suivant", grow.slice(0, 6).join(" · ") || "0 retour");
  ok(late >= trees.length * 0.6, "à 90 %, il reste des feuilles au bout des branches", `${late}/${trees.length} arbres en portent encore`);
  /* Pas de saut au premier cran : il ne change pas plus l'arbre qu'un cran ordinaire
     de la chute. ⚠️ UNE COMPARAISON, PAS UN SEUIL (§10 de CLAUDE.md) : premier jet à
     « moins de 12 % de pixels changés », rouge sur le jeune bouleau (15 %) dont
     CHAQUE cran change 15 % — un petit arbre clairsemé a peu de pixels. */
  const drawAt = (t, f) => { const c = makeCanvas(96, 120); A.drawTownTree(c.ctx, S, tw, t.x, t.y, 40, 90, "autumn", t.o, 0, null, f); return c.px; };
  const change = (a, b) => {
    let d = 0, painted = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (b[i + 3] > 200) painted++;
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 40) d++;
    }
    return d / Math.max(1, painted);
  };
  const jumps = [];
  for (const t of trees) {
    const imgs = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((st) => drawAt(t, st / FL.FALL_STEPS));
    const steps = [];
    for (let st = 1; st < 8; st++) steps.push(change(imgs[st + 1], imgs[st]));
    steps.sort((p, q) => p - q);
    const first = change(imgs[1], imgs[0]), typ = steps[steps.length >> 1];
    jumps.push([t.want, first, typ]);
  }
  jumps.sort((p, q) => q[1] / Math.max(0.005, q[2]) - p[1] / Math.max(0.005, p[2]));
  const [jw, jf, jt] = jumps[0];
  ok(jf <= Math.max(0.02, 1.6 * jt), "au premier cran, l'arbre ne change pas plus qu'à un cran ordinaire (pas de saut)", `pire : ${jw} ${(100 * jf).toFixed(1)} % au premier cran, ${(100 * jt).toFixed(1)} % à un cran courant`);
}

/* ═══ LA PLANCHE ════════════════════════════════════════════════════════════ */
{
  const cols = [0, 0.2, 0.4, 0.55, 0.7, 0.85, 1, -1];     // -1 : l'hiver
  const cw = 72, ch = 100;
  const board = makeCanvas(cw * cols.length, ch * every.length);
  board.ctx.fillStyle = "#6b8f4e"; board.ctx.fillRect(0, 0, cw * cols.length, ch * every.length);
  every.forEach((t, r) => cols.forEach((f, c) => {
    if (f < 0) A.drawTownTree(board.ctx, S, tw, t.x, t.y, c * cw + 28, r * ch + 80, "winter", t.o, 0, null);
    else A.drawTownTree(board.ctx, S, tw, t.x, t.y, c * cw + 28, r * ch + 80, "autumn", t.o, 0, null, f);
  }));
  const up = scale(board.px, cw * cols.length, ch * every.length, 3);
  writePNG(path.join(OUT, "feuilles-chute.png"), up.px, up.W, up.H);
  console.log(`planche : tools/out/feuilles-chute.png (${every.length} arbres ; 0 · 20 · 40 · 55 · 70 · 85 · 100 % · hiver)`);
}

console.log(`\n${n - fail}/${n} contrôles passent.`);
process.exit(fail ? 1 : 0);
