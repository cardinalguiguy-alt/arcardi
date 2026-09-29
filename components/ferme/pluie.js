/* ╔══════════════════════════════════════════════════════════════════════════
   ║ PHASE 12b (2026-09-29) — LA PLUIE DE VALLEY TOWN : LE SOL QUI S'EN SOUVIENT.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « 12b et 12c ensuite » — la pluie dessinée depuis la phase 3
   (`meteo.js`, `drawWeatherVeil`) tombait sur un sol qui ne la sentait pas : la
   chaussée restait sèche, les pavés aussi, et une averse d'orage ne laissait
   rien derrière elle. Ce fichier est le SOL de la pluie : chaussée et dallages
   mouillés, flaques dans les creux, ornières et caniveaux qui les retiennent, un
   sol qui sèche par plaques — et qui met plus longtemps à sécher à l'ombre.

   CE FICHIER EST PUR (il ne dessine rien à l'écran) — `tools/verify-pluie.mjs`
   le joue, `tools/render-pluie.mjs` le regarde. Même architecture que la neige
   (`neige.js`, dont il réutilise les parcelles statiques : la classe de chaque
   pixel, ses joints, ses ornières, ses creux, l'ombre qu'il reçoit) :
   · §1 LE SOL MOUILLÉ : deux grandeurs INTÉGRÉES sur la météo passée, rien ne
     circule sur le réseau (§3 de CLAUDE.md) — `w`, l'humidité de la surface (elle
     monte en quelques minutes de jeu, redescend en quelques heures) et `p`, le
     niveau des flaques (il monte sous une vraie pluie, redescend LENTEMENT et
     à vitesse constante : une flaque ne s'efface pas en exponentielle, elle
     rétrécit puis disparaît) ;
   · §2 LA PARCELLE : un pixel est mouillé si l'humidité a atteint SON ordre
     (des plaques : le sol sèche par taches, l'ombre en dernier) ; il est en
     flaque si son creux est plus bas que le seuil que le niveau dessine (les
     ornières et le pied des trottoirs d'abord — l'eau va où on l'a creusée) ;
   · §3 LA COUCHE : un atlas de parcelles rendues, refait quand le niveau a bougé
     d'un cran, comme la neige.

   ⚠️ CE QUI SE VOIT, ET POURQUOI C'EST DE L'ÉCLAIRAGE, PAS UNE PALETTE : un sol
   mouillé n'est pas plus sombre, il est plus SOMBRE ET PLUS BRILLANT — sombre où
   l'eau le sature, brillant où elle renvoie le ciel. Trois niveaux d'humidité
   (sec, humide, trempé), tramés au bruit bleu de la neige (jamais un dégradé),
   un reflet de ciel sur les creux larges, et des flaques dont le bord haut est
   sombre (l'eau creuse) et le bord bas clair (la berge attrape la lumière).
   ⚠️ LA COULEUR DU CIEL REFLÉTÉ EST CELLE DU JOUR, jamais celle de l'heure : la
   couche est peinte AVANT le voile de nuit (`lumiere.js`), qui la multiplie comme
   toute la scène. Une flaque de nuit n'est donc pas sombre par un second calcul :
   elle l'est par le même voile que la rue — et c'est la lumière des lampadaires
   (`k` des halos, plus fort sur un sol mouillé) qui la fait briller.
   ══════════════════════════════════════════════════════════════════════════ */
import * as WX from "./meteo";
import { CH, CL, SZ, Q_AUX, h32, blueNoise, sunAt } from "./neige";
import * as C from "./fermeConstants";

const T = C.TILE;

/* ── 1. LES RÉGLAGES ────────────────────────────────────────────────────────
   En HEURES DE JEU (une heure de jeu = 48 s réelles). Aucun n'a été joué : ils
   sont posés par déduction, et le banc imprime ce qu'ils donnent (temps pour
   sécher, durée des flaques par saison). */
export const PLUIE = {
  WINDOW_DAYS: 2,         // on remonte deux jours de météo
  STEP_MIN: 6,            // pas d'intégration (minutes de jeu)
  /* L'humidité : elle monte à 5 par heure de pluie franche (l'équilibre est
     G/(G+D) : 0,9 sous une averse, 0,7 sous la bruine) et redescend à la vitesse
     que dit la saison, plus le soleil et le vent. */
  WET_GAIN: 5,
  WET_DRY: { winter: 0.2, spring: 0.34, summer: 0.6, autumn: 0.28 },
  SUN_DRY: 0.45, WIND_DRY: 0.3,
  /* Les flaques : elles ne montent qu'au-delà d'une pluie de 0,18 (la bruine
     mouille, elle ne remplit pas) et sèchent à vitesse CONSTANTE, plus vite au
     soleil. Sous un ciel d'automne : ~5 h de jeu (4 min réelles), plus que le sol
     n'en met à sécher (premier jet : 1 h 40, la place était sèche avant qu'on ait fini
     d'y regarder la pluie ; deuxième : 4 h 20, les flaques partaient avant le sol). */
  PUD_FILL: 0.9, PUD_MIN_RAIN: 0.18,
  PUD_DRAIN: { winter: 0.06, spring: 0.1, summer: 0.26, autumn: 0.08 },
  PUD_SUN: 0.08,
};

/* ── 2. LE SOL MOUILLÉ ──────────────────────────────────────────────────────
   L'état : w (humidité de la surface, 0..1), p (niveau des flaques, 0..1),
   since (minutes de jeu depuis la dernière vraie pluie). */
const zeroPack = () => ({ w: 0, p: 0, since: 1e6 });
const clonePack = (s) => ({ w: s.w, p: s.p, since: s.since });
function relax(v, gain, unload, dtH) {
  const k = gain + unload;
  if (k <= 0) return v;
  const eq = gain / k;
  return eq + (v - eq) * Math.exp(-k * dtH);
}
/* La pluie qui arrive au sol : la pluie, et la grêle qui fond. */
export const groundRain = (W) => Math.min(1, W.rain + 0.6 * W.hail);
export function packStep(st, W, dtH, hour, season) {
  const N = PLUIE, rain = groundRain(W);
  const sun = sunAt(hour, season) * Math.max(0, 1 - 1.25 * W.dark) * Math.max(0, 1 - 2 * rain);
  st.w = Math.max(0, Math.min(1, relax(st.w, N.WET_GAIN * rain, (N.WET_DRY[season] || 0.3) + N.SUN_DRY * sun + N.WIND_DRY * W.wind, dtH)));
  const fill = N.PUD_FILL * Math.max(0, rain - N.PUD_MIN_RAIN) / (1 - N.PUD_MIN_RAIN);
  const drain = (N.PUD_DRAIN[season] || 0.15) + N.PUD_SUN * sun;
  st.p = Math.max(0, Math.min(1, st.p + (fill * (1 - st.p) - (st.p > 0 ? drain : 0)) * dtH));
  st.since = rain > 0.15 ? 0 : st.since + dtH * 60;
  return st;
}
const DAY_A = C.DAY_START_MIN, DAY_B = C.DAY_END_MIN;
/* Une journée entière, de `DAY_START_MIN` à `DAY_END_MIN` — la nuit de 2 h à 6 h
   n'existe pas dans le jeu (même règle que le manteau de neige). */
function integrate(st, day, season, force, t0, t1) {
  const S = PLUIE.STEP_MIN;
  for (let t = t0; t + S <= t1 + 1e-9; t += S) {
    const W = WX.weatherAt(day, t + S / 2, season, force);
    packStep(st, W, S / 60, (t + S / 2) / 60, season);
  }
  return st;
}
/* ⚠️ MIS EN CACHE PAR (jour, saisons des jours remontés, forçage), comme le
   manteau : le passé ne change jamais, « aujourd'hui » avance par PAS FIXES
   depuis 6 h — deux clients qui demandent la même minute rendent le même
   nombre au bit près. */
const packMemo = new Map();
export function wetPack(day, tm, seasonOfDay, force) {
  day = Math.max(1, day | 0);
  const d0 = Math.max(1, day - PLUIE.WINDOW_DAYS);
  const keys = [];
  for (let d = d0; d <= day; d++) keys.push(seasonOfDay(d));
  const fk = force ? `${force.day}:${force.kind}:${Math.round(force.at * 10)}` : "";
  const key = `${day}|${keys.join(",")}|${fk}`;
  let rec = packMemo.get(key);
  if (!rec) {
    const st = zeroPack();
    for (let d = d0; d < day; d++) integrate(st, d, keys[d - d0], force, DAY_A, DAY_B);
    rec = { start: st, cur: clonePack(st), at: DAY_A };
    if (packMemo.size > 24) packMemo.clear();
    packMemo.set(key, rec);
  }
  const season = keys[keys.length - 1];
  const S = PLUIE.STEP_MIN;
  const t = Math.max(DAY_A, Math.min(DAY_B, tm));
  const tq = DAY_A + Math.floor((t - DAY_A) / S) * S;
  if (tq < rec.at) { rec.cur = clonePack(rec.start); rec.at = DAY_A; }
  if (tq > rec.at) { integrate(rec.cur, day, season, force, rec.at, tq); rec.at = tq; }
  const out = clonePack(rec.cur);
  if (t > rec.at + 1e-6) {
    const W = WX.weatherAt(day, (rec.at + t) / 2, season, force);
    packStep(out, W, (t - rec.at) / 60, ((rec.at + t) / 2) / 60, season);
  }
  return out;
}

/* ── 3. LA PARCELLE ─────────────────────────────────────────────────────────
   `st` : la parcelle statique de la neige (`buildChunkStatic`, neige.js §5). Ce
   qu'on y lit : `cls` (la classe du sol), `cov` (l'ORDRE de couverture — des
   plaques —, réemployé ici comme ordre de séchage), `shade` et `cast` (l'ombre :
   le sol y reste mouillé), `und` (l'ondulation large : les creux), `aux` (les
   joints d'un dallage, les ornières et les caniveaux d'une rue), `ao` (le pied
   de ce qui se dresse), `fine` (le bruit fin). */
/* Le creux d'un pixel : plus il est haut, plus l'eau s'y assemble. Rend −9 là où
   il ne peut pas y avoir de flaque (herbe, marche, tablier de bois, berge).
   ⚠️ UNE FLAQUE COMBLE UN CREUX, ELLE NE COUVRE PAS UNE ZONE (Guillaume, en voyant
   le premier jet : « les flaques ne doivent pas ressembler à des zones
   surélevées — leur comportement naturel est de combler les aspérités du sol,
   pas de recouvrir certaines parties comme un manteau »). Le premier jet posait
   des taches lisses d'un bruit large : des plaques claires, aux bords nets, sans
   rapport avec le sol dessous. La profondeur suit maintenant CE QUE LE SOL A DE
   CREUX :
   · sur un dallage, les JOINTS (l'eau s'y assemble en filets, qui se rejoignent),
     puis le bord de chaque dalle, qui plonge vers son joint, puis seulement les
     creux larges de la pierre ; le bruit large ne compte plus que pour un tiers ;
   · sur une chaussée, les ornières (deux par voie, allongées le long de la rue) et
     le caniveau au pied du trottoir. */
export function basin(st, o) {
  const c = st.cls[o];
  if (c !== CL.STREET && c !== CL.STONE) return -9;
  const ax = st.aux[o] / Q_AUX;
  let b = (-st.und[o] / 127) * (c === CL.STONE ? 0.62 : 0.85) + (st.fine[o] / 127) * 0.1;
  if (c === CL.STREET) {
    if (ax === 1) b += 0.56; else if (ax === 0.5) b += 0.2; else if (ax >= 2) b += 0.46 * Math.max(0, 1 - (ax - 2) / 3.9);
  } else {
    if (ax >= 0.5) b += 0.5;                                        // un joint : l'eau y coule
    else {
      const nj = Math.max(st.aux[o - 1], st.aux[o + 1], st.aux[o - SZ], st.aux[o + SZ]) / Q_AUX;
      if (nj >= 0.5) b += 0.16;                                     // le bord d'une dalle plonge vers son joint
    }
    b += (st.ao[o] / 255) * 0.12;                                   // le pied d'un mur : l'eau s'y assemble
  }
  return b + (st.cast[o] / 255) * 0.1;                               // sous l'ombre, elle sèche moins vite
}
/* Le seuil de flaque pour un niveau `p` : au premier niveau (0,05), quelques
   flaques minuscules dans les ornières ; à 0,3, un quart des ornières ; à 1, un
   pixel de sol dur sur six (mesuré au banc : une place sous l'orage n'est pas
   un lac — premier jet à un sur trois, vu à la planche comme un dallage sali). ⚠️ Une puissance et pas une droite :
   avec une droite, les ornières passaient de rien à un cinquième de leur surface
   dès le niveau 0,04 — les flaques apparaissaient d'un coup. */
export const puddleThr = (p) => 1.05 - 0.71 * Math.pow(Math.max(0, p), 0.6);
export const isPuddle = (st, o, p) => p > 0.02 && basin(st, o) > puddleThr(p);

/* L'humidité LOCALE d'un pixel, 0..1 : l'humidité de la surface, moins l'ordre
   de séchage du pixel (des plaques), plus ce que l'ombre retient. Un sol
   entièrement mouillé (w = 1) l'est à 0,95 ; un sol qui sèche (w = 0,4) garde
   des plaques mouillées, l'ombre en dernier. */
function localWet(st, o, w) {
  const cov = st.cov[o] / 255, sh = Math.max(st.shade[o] / 255, 0.9 * st.cast[o] / 255);
  return Math.max(0, Math.min(1, (w + sh * 0.18 * Math.min(1, w * 6) - cov * 0.5) / 0.5));
}
const DARK = [24, 34, 52];             // l'eau qui sature un sol : bleu-noir
const GRASS_DARK = [6, 26, 18];
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
/* Le ciel reflété, à la lumière du JOUR : bleu franc par beau temps, gris
   d'ardoise sous un ciel couvert (`dark`, 0..1). */
export function skyReflect(dark) {
  const k = Math.max(0, Math.min(1, dark));
  return mix([158, 190, 224], [124, 138, 156], Math.min(1, k * 1.6));
}
/* `wp` : { wet, pud, sky:[r,g,b] } — l'humidité et le niveau (0..1) après
   avoir ôté la neige qui couvre, et le ciel reflété. `out` : CH × CH × 4.
   Rend { ripples: [[wx, wy, hash]…] (des points d'où partent les ronds de
   la pluie, dans les flaques), flow: [[wx, wy, hash, horizontal]…] (les départs
   de l'eau qui coule au caniveau) }, et remplit `mask` (CH × CH, 1 = flaque) si donné. */
export function renderWetChunk(st, wp, out, mask) {
  const NP = SZ * SZ, BN = blueNoise();
  const thr = puddleThr(wp.pud), sky = wp.sky;
  const pm = new Uint8Array(NP);
  if (wp.pud > 0.02) for (let o = 0; o < NP; o++) {
    const b = basin(st, o);
    if (b > thr) pm[o] = b > thr + 0.22 ? 2 : 1;
  }
  const rip = [], flow = [];
  const wx0 = st.cx * CH, wy0 = st.cy * CH;
  const pudColor = mix(DARK, sky, 0.3), rimDark = mix(DARK, [0, 0, 8], 0.5), rimLight = mix(sky, [255, 255, 255], 0.3), skyStreak = mix(sky, [255, 255, 255], 0.2);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
    const o = (y + 1) * SZ + (x + 1), q = (y * CH + x) * 4, c = st.cls[o];
    out[q + 3] = 0;
    if (mask) mask[y * CH + x] = 0;
    if (!c || c === CL.RAIL) continue;
    const wx = wx0 + x, wy = wy0 + y;
    const b1 = BN[(wy & 63) * 64 + (wx & 63)] / 256, b2 = BN[((wy + 29) & 63) * 64 + ((wx + 17) & 63)] / 256;
    /* LA FLAQUE, UN CREUX D'EAU : plus SOMBRE que le sol mouillé autour (l'eau
       profonde boit la lumière — elle ne le recouvre pas d'un aplat de ciel), le ciel
       n'y revient que par de courts traits horizontaux et un filet clair au bord
       sud (la berge qui attrape la lumière). Le bord nord est l'ombre de la lèvre.
       ⚠️ Transparente : on lit le dallage dessous, ses joints, ses éclats. */
    if (pm[o]) {
      const N = pm[o - SZ], S = pm[o + SZ];
      let col, a;
      if (!N) { col = rimDark; a = 150; }                                       // l'ombre de la lèvre, au nord
      else if (!S) { col = rimLight; a = 104; }                                 // la berge claire, au sud
      else {
        col = pm[o] === 2 ? mix(pudColor, DARK, 0.35) : pudColor;
        a = pm[o] === 2 ? 150 : 128;
        if ((h32(wx >> 2, wy, 81) % 7) === 0 && b2 < 0.8) { col = skyStreak; a = 132; }     // un trait de ciel, quatre pixels
        else if (b2 < 0.012) { col = skyStreak; a = 190; }                                 // un éclat, rare
      }
      if (N && S && rip.length < 140 && (h32(wx, wy, 77) % 41) === 0) rip.push([wx, wy, h32(wx, wy, 78)]);
      out[q] = col[0]; out[q + 1] = col[1]; out[q + 2] = col[2]; out[q + 3] = a;
      if (mask) mask[y * CH + x] = 1;
      continue;
    }
    const lw = localWet(st, o, wp.wet);
    const v = lw + (b1 - 0.5) * 0.25;
    const level = v < 0.5 ? 0 : v < 0.85 ? 1 : 2;             // sec, humide, trempé
    if (!level) continue;
    if (c === CL.GRASS || c === CL.LAWN || c === CL.SOFT || c === CL.SHORE) {
      out[q] = GRASS_DARK[0]; out[q + 1] = GRASS_DARK[1]; out[q + 2] = GRASS_DARK[2]; out[q + 3] = level === 2 ? 38 : 20;
      continue;
    }
    const ax = st.aux[o] / Q_AUX;
    if (c === CL.STREET) {
      /* Le caniveau coule : un filet d'eau clair le long du trottoir, sous une vraie pluie. */
      if (ax >= 2 && ax < 3 && wp.wet > 0.55 && level === 2) {
        out[q] = sky[0]; out[q + 1] = sky[1]; out[q + 2] = sky[2]; out[q + 3] = 96;
        /* L'eau COULE le long du caniveau : un point de départ tous les ~23 pixels, avec
           le sens de la rue (horizontale si les voisins de gauche ou de droite sont aussi
           caniveau). Le jeu y fait glisser un éclat (`flowPoints`). */
        if (flow.length < 90 && (h32(wx, wy, 91) % 23) === 0) {
          const g = (k) => { const v = st.aux[k] / Q_AUX; return v >= 2 && v < 3; };
          flow.push([wx, wy, h32(wx, wy, 92), g(o - 1) || g(o + 1) ? 1 : 0]);
        }
        continue;
      }
      const a = level === 2 ? 84 : 42;
      out[q] = DARK[0]; out[q + 1] = DARK[1]; out[q + 2] = DARK[2]; out[q + 3] = a + (ax === 1 ? 18 : 0);
    } else if (c === CL.DECK) {
      out[q] = 30; out[q + 1] = 20; out[q + 2] = 16; out[q + 3] = level === 2 ? 66 : 34;
    } else {
      // Un dallage : le joint est plus sombre, la pierre trempée renvoie un peu de ciel sur ses creux larges.
      const joint = c === CL.STONE && ax > 0.6;
      if (level === 2 && !joint && st.und[o] > 30 && b2 < 0.5) { out[q] = sky[0]; out[q + 1] = sky[1]; out[q + 2] = sky[2]; out[q + 3] = 40; continue; }
      const a = (level === 2 ? 62 : 30) + (joint ? 30 : 0);
      out[q] = DARK[0]; out[q + 1] = DARK[1]; out[q + 2] = DARK[2]; out[q + 3] = a;
    }
  }
  return { ripples: rip, flow };
}

/* ── 4. LA COUCHE D'UNE CARTE (ce que le jeu garde) ─────────────────────────
   Les parcelles rendues vivent dans UN atlas (§10 de CLAUDE.md : le NOMBRE de
   canevas compte sur iPad), alloué à la première goutte ; celles qu'on ne voit
   plus cèdent leur place (LRU). `env` : { makeCanvas(w, h), staticOf(cx, cy) }
   — la parcelle statique de la neige. Le rendu est ÉTALÉ (`update`) : quand le
   niveau bouge d'un cran, les parcelles visibles se refont en quelques images.
   ⚠️ Un cran est 0,05 d'humidité et 0,04 de niveau de flaque : la flaque qui
   grandit doit grandir PAR PLAQUES sans qu'on voie une image sauter. */
/* Le sol est-il assez mouillé pour valoir un dessin ? (Avant de construire quoi que ce soit.) */
export const wetActive = (p) => p.wet > 0.03 || p.pud > 0.03;
export function makeWetLayer(tw, env) {
  const NX = Math.ceil(tw.w * T / CH), NY = Math.ceil(tw.h * T / CH);
  const ATL = 2048, PER = ATL / CH, NSLOT = PER * PER;
  let atlas = null, ag = null, scratch = null;
  const chunks = new Map();          // clé → { slot, ver, use, cx, cy, mask, rip }
  const free = [];
  for (let s = NSLOT - 1; s >= 0; s--) free.push(s);
  let P = { wet: 0, pud: 0, sky: [158, 190, 224] }, ver = 1, pkey = "", frame = 0;
  const key = (cx, cy) => cy * NX + cx;
  const ensureAtlas = () => {
    if (atlas) return;
    atlas = env.makeCanvas(ATL, ATL);
    ag = atlas.getContext("2d");
    scratch = ag.createImageData(CH, CH);
  };
  const renderOne = (ch) => {
    const st = env.staticOf(ch.cx, ch.cy);
    ensureAtlas();
    if (ch.slot < 0) {
      if (!free.length) {
        let worst = null;
        for (const c2 of chunks.values()) if (c2.slot >= 0 && c2.use < frame - 1 && (!worst || c2.use < worst.use)) worst = c2;
        if (!worst) return false;
        free.push(worst.slot); worst.slot = -1; worst.ver = 0; worst.mask = null;
      }
      ch.slot = free.pop();
    }
    const mask = new Uint8Array(CH * CH);
    const r = renderWetChunk(st, P, scratch.data, mask);
    ag.putImageData(scratch, (ch.slot % PER) * CH, Math.floor(ch.slot / PER) * CH);
    ch.mask = mask; ch.rip = r.ripples; ch.flow = r.flow; ch.ver = ver;
    return true;
  };
  return {
    active: wetActive,
    /* Les réglages de l'image. Une parcelle se refait quand un cran a bougé. */
    setParams(p) {
      P = p;
      const k = `${Math.round(p.wet / 0.05)}|${Math.round(p.pud / 0.04)}|${p.sky.map((v) => Math.round(v / 12)).join(",")}`;
      if (k !== pkey) { pkey = k; ver++; }
    },
    view(x0, y0, x1, y1) {
      frame++;
      const a = Math.max(0, Math.floor(x0 * T / CH)), b = Math.min(NX - 1, Math.floor((x1 + 1) * T / CH));
      const c = Math.max(0, Math.floor(y0 * T / CH)), d = Math.min(NY - 1, Math.floor((y1 + 1) * T / CH));
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
        const k = key(cx, cy);
        let ch = chunks.get(k);
        if (!ch) { ch = { slot: -1, ver: 0, use: frame, cx, cy, mask: null, rip: [], flow: [] }; chunks.set(k, ch); }
        ch.use = frame;
      }
    },
    /* Refait ce qui doit l'être dans la limite de `budgetMs` : les parcelles JAMAIS
       rendues d'abord (sinon un trou), puis les périmées. */
    update(budgetMs, now) {
      const t0 = now(), todo = [];
      for (const ch of chunks.values()) if (ch.use === frame && (ch.slot < 0 || ch.ver !== ver)) todo.push(ch);
      todo.sort((p, q) => (p.slot < 0 ? 0 : 1) - (q.slot < 0 ? 0 : 1));
      for (const ch of todo) {
        if (!renderOne(ch)) break;
        if (now() - t0 > budgetMs) break;
      }
      if (chunks.size > 160) {
        const old = [...chunks.values()].filter((c2) => c2.use < frame - 60).sort((p, q) => p.use - q.use);
        for (const c2 of old.slice(0, chunks.size - 160)) { if (c2.slot >= 0) free.push(c2.slot); chunks.delete(key(c2.cx, c2.cy)); }
      }
    },
    /* La cellule de la case (x, y) dans l'atlas, ou null. */
    cell(x, y) {
      const cx = Math.floor(x * T / CH), cy = Math.floor(y * T / CH);
      const ch = chunks.get(key(cx, cy));
      if (!ch || ch.slot < 0) return null;
      return { img: atlas, sx: (ch.slot % PER) * CH + (x * T - cx * CH), sy: Math.floor(ch.slot / PER) * CH + (y * T - cy * CH) };
    },
    /* Ce pixel monde est-il dans une flaque ? (faux tant que sa parcelle n'est pas rendue.) */
    puddleAt(wx, wy) {
      const cx = Math.floor(wx / CH), cy = Math.floor(wy / CH);
      const ch = chunks.get(key(cx, cy));
      if (!ch || !ch.mask || ch.ver !== ver) return false;
      return ch.mask[(Math.floor(wy) - cy * CH) * CH + (Math.floor(wx) - cx * CH)] === 1;
    },
    /* Les points d'où partent les ronds de pluie (parcelles visibles, à jour). */
    ripplePoints() {
      const out = [];
      for (const ch of chunks.values()) if (ch.use === frame && ch.slot >= 0 && ch.ver === ver) for (const r of ch.rip) out.push(r);
      return out;
    },
    /* Les départs de l'eau qui coule (caniveaux des parcelles visibles, à jour). */
    flowPoints() {
      const out = [];
      for (const ch of chunks.values()) if (ch.use === frame && ch.slot >= 0 && ch.ver === ver) for (const r of ch.flow) out.push(r);
      return out;
    },
    stats() { return { chunks: chunks.size, slots: NSLOT - free.length, ver }; },
  };
}
