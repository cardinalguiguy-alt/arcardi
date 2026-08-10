/* =============================================================================
   render-oiseaux.mjs — LES PIGEONS DE LA PLACE, DESSINÉS ET REJOUÉS. (433)
   -----------------------------------------------------------------------------
   ⚠️ DEUX BANCS EN UN, PARCE QUE LES DEUX MOITIÉS DU DÉFAUT SONT DE NATURES
   DIFFÉRENTES et qu'aucune des deux ne se voit en jouant :

     1. LE DESSIN. Sept poses par espèce, dont quatre qui ne durent qu'un
        vingtième de seconde en jeu : personne ne les regardera JAMAIS
        autrement qu'ici. C'est exactement la raison d'être de `render-assise`
        (une pose vue trois zips sans que personne remarque un buste tronqué).
        ⚠️ Et à côté d'une fermière : « pas trop grands » est une demande
        MESURABLE, pas une impression (leçon de `render-echelle`).

     2. LE VOL. `birdStep` est une machine à six phases dont trois se pilotent
        l'une l'autre (montée, virage, plané). Regardée dix secondes elle a
        toujours l'air de marcher ; ce qu'on veut savoir, c'est si les quinze
        oiseaux se reposent TOUS, à chaque cycle, et si leur envol a la forme
        annoncée — monter fort puis s'amortir, accélérer au sol, s'écarter en
        éventail. On rejoue donc trois minutes de vol à 60 images par seconde.

   Usage :  node tools/render-oiseaux.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine"]);
const A = mods.fermeArt, C = mods.fermeConstants, E = mods.fermeEngine;
const S = A.buildSprites();

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : ""));
  if (!cond) fail++;
};

/* ═══════════════ 1. LA PLANCHE DES POSES, SUR LEUR LIGNE DE SOL ═══════════ */
const POSES = ["stand", "peck", "walk", "puff", "alert", "down", "mid", "up", "glide"];
const KINDS = ["pigeon", "dove"];
{
  const CW = 20, CH = 18, PAD = 2;
  const W = POSES.length * (CW + PAD) + PAD + 26, H = 2 * (CH + PAD) + PAD;
  const sh = makeCanvas(W, H);
  // Le dallage de la place : c'est là qu'ils vivent, et un oiseau gris se juge
  // sur du gris (la leçon du fond de render-tribunal).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    sh.ctx.fillStyle = ((((x / 8) | 0) + ((y / 8) | 0)) % 2) ? "rgba(179,178,184,1)" : "rgba(165,164,171,1)";
    sh.ctx.fillRect(x, y, 1, 1);
  }
  for (let r = 0; r < 2; r++) {
    POSES.forEach((q, i) => {
      const im = S.birds[KINDS[r]][q];
      const cx = PAD + i * (CW + PAD), cy = PAD + r * (CH + PAD);
      sh.ctx.fillStyle = "rgba(0,0,0,0.28)";
      sh.ctx.fillRect(cx, cy + CH - 3, CW, 1);
      sh.ctx.drawImage(im, cx + 2, cy + CH - 3 - im.ground);
    });
  }
  // La fermière, comme repère d'échelle.
  const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);
  sh.ctx.drawImage(CHAR, 0, 0, 16, 24, W - 22, PAD + CH - 3 - 23, 16, 24);
  const up = scale(sh.px, W, H, 8);
  writePNG(path.join(OUT, "oiseaux-poses.png"), up.px, up.W, up.H);
}

console.log("\n=== le dessin ===\n");
{
  const px = (im) => im.__px;
  const stats = (im) => {
    const d = px(im); const cols = new Set(); let n = 0, top = -1, bot = -1, left = -1, right = -1;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      if (d[(y * im.width + x) * 4 + 3] > 8) {
        n++; cols.add(d[(y * im.width + x) * 4] + "," + d[(y * im.width + x) * 4 + 1] + "," + d[(y * im.width + x) * 4 + 2]);
        if (top < 0) top = y; bot = y;
        if (left < 0 || x < left) left = x;
        if (x > right) right = x;
      }
    }
    return { n, cols: cols.size, top, bot, left, right, h: bot - top + 1, w: right - left + 1 };
  };
  console.log("  pose            l × h    px   couleurs");
  for (const k of KINDS) for (const q of POSES) {
    const st = stats(S.birds[k][q]);
    console.log("  " + (k + ":" + q).padEnd(16) + (st.w + "×" + st.h).padStart(7) + String(st.n).padStart(6) + String(st.cols).padStart(10));
  }
  /* ⚠️ « PAS TROP GRANDS » EST UN NOMBRE. Un fermier fait 23 px peints ; un
     pigeon posé doit rester sous le tiers, sinon c'est une poule. */
  const stand = stats(S.birds.pigeon.stand);
  /* ⚠️ LE SEUIL EST À DIX, ET C'EST UN ARBITRAGE ASSUMÉ, PAS UNE DÉRIVE. À
     l'échelle vraie, un pigeon de 30 cm contre un adulte de 1,75 m ferait
     QUATRE pixels : une poussière. La référence photo tranche dans l'autre
     sens — ce qui fait le pigeon, c'est la tête HAUTE au-dessus d'un corps
     profond, et à neuf pixels la tête retombe dans le dos. On tient donc la
     hauteur à dix et on gagne l'allure par la LONGUEUR (quinze pixels), qui
     ne coûte rien à l'encombrement perçu. */
  ok(stand.h <= 10, "⚠️ « pas trop grands » : l'oiseau posé reste sous 0,45 fermier",
     stand.h + " px de haut sur " + stand.w + " de long (liseré compris) contre 23 = ×" + (stand.h / 23).toFixed(2));
  ok(stand.h >= 6, "…et reste lisible", stand.h + " px : en dessous de 6 on ne voit plus la tête");
  /* ⚠️ AUCUNE POSE NE DOIT ÊTRE DÉCOUPÉE PAR SON CANEVAS (§4 de CLAUDE.md).
     Un canevas découpe en silence : une aile haute rognée d'un pixel ne lève
     rien, et c'est précisément ce qui est arrivé deux fois dans ce zip
     (l'enseigne du taxi, le drapeau de la mairie). */
  let clipped = [];
  for (const k of KINDS) for (const q of POSES) {
    const im = S.birds[k][q], d = px(im);
    const touch = (x, y) => d[(y * im.width + x) * 4 + 3] > 8;
    for (let x = 0; x < im.width; x++) if (touch(x, 0)) { clipped.push(k + ":" + q + " (haut)"); break; }
    for (let y = 0; y < im.height; y++) if (touch(0, y) || touch(im.width - 1, y)) { clipped.push(k + ":" + q + " (côté)"); break; }
  }
  ok(clipped.length === 0, "⚠️ aucune pose ne touche le bord de son canevas",
     clipped.length ? clipped.join(", ") : "rien n'est rogné en silence");
  /* Le sol : au sol, l'oiseau POSE. Les poses de vol, elles, n'ont pas à toucher
     leur `ground` — elles sont dessinées en l'air par construction. */
  const bad = [];
  for (const k of KINDS) for (const q of ["stand", "peck", "walk", "puff", "alert"]) {
    const im = S.birds[k][q], st = stats(im);
    if (st.bot !== im.ground) bad.push(k + ":" + q + " (" + st.bot + " ≠ " + im.ground + ")");
  }
  ok(bad.length === 0, "⚠️ les cinq poses au sol portent sur leur ligne de sol",
     bad.length ? bad.join(", ") : "les pattes touchent le sol, pas trois pixels au-dessus");
  /* Les poses doivent DIFFÉRER. Deux poses identiques = une animation qui ne
     bouge pas, et personne ne s'en aperçoit sans compter. */
  const sig = (im) => { const d = px(im); let s = ""; for (let i = 3; i < d.length; i += 4) s += d[i] > 8 ? "1" : "0"; return s; };
  const seen = new Map(); let dup = [];
  for (const k of KINDS) for (const q of POSES) {
    const s2 = k + "|" + sig(S.birds[k][q]);
    if (seen.has(s2)) dup.push(seen.get(s2) + " = " + k + ":" + q);
    seen.set(s2, k + ":" + q);
  }
  ok(dup.length === 0, "les neuf poses sont neuf silhouettes différentes",
     dup.length ? dup.join(", ") : "aucune paire identique");
}

/* ═══════════════ 2. LA VOLÉE, REJOUÉE IMAGE PAR IMAGE ════════════════════ */
console.log("\n=== les emplacements ===\n");
const tw = E.generateTownWorld();
const flocks = E.townFlocks(tw);
ok(flocks.length === 2, "deux volées", flocks.map(f => f.key + " (max " + f.max + ", rayon " + f.r.toFixed(1) + ")").join(", "));
{
  const nav = E.townNav(tw);
  let offPave = 0, n = 0;
  for (const f of flocks) for (const q of f.spots) {
    n++;
    const i = q[1] * tw.w + q[0];
    const gnd = tw.ground[i];
    if (!nav.walk[i] || (gnd !== C.G_PATH && gnd !== C.G_PATH_STONE)) offPave++;
  }
  ok(offPave === 0, "⚠️ chaque emplacement est du dallage praticable",
     offPave ? offPave + " emplacements dans un massif" : n + " emplacements, tous sur la pierre");
}

const CFG = {
  FLUSH_R: C.BIRD_FLUSH_R, ALERT_R: C.BIRD_ALERT_R,
  ACT_MIN: C.BIRD_ACT_MIN, ACT_MAX: C.BIRD_ACT_MAX,
  WALK_SPD: C.BIRD_WALK_SPD, RUN_SPD: C.BIRD_RUN_SPD, ACC: C.BIRD_ACC,
  SEP: C.BIRD_SEP, SEP_F: C.BIRD_SEP_F, COH: C.BIRD_COH,
  FOOD_R: C.BIRD_FOOD_R, FOOD_EAT_R: C.BIRD_FOOD_EAT_R,
  EXC_UP: C.BIRD_EXC_UP, EXC_DOWN: C.BIRD_EXC_DOWN,
  POP_MS: C.BIRD_POP_MS, POP_MIN: C.BIRD_POP_MIN, POP_MAX: C.BIRD_POP_MAX,
  TAKEOFF: C.BIRD_TAKEOFF, CRUISE: C.BIRD_CRUISE, CLIMB: C.BIRD_CLIMB,
  CLIMB_DECAY: C.BIRD_CLIMB_DECAY, TURN: C.BIRD_TURN, ALT_MAX: C.BIRD_ALT_MAX,
  FADE_S: C.BIRD_FADE_S, AWAY_MIN: C.BIRD_AWAY_MIN, AWAY_MAX: C.BIRD_AWAY_MAX,
  RETURN_D: C.BIRD_RETURN_D, LAND_SPD: C.BIRD_LAND_SPD, LAND_BRAKE: C.BIRD_LAND_BRAKE,
  FLARE_D: C.BIRD_FLARE_D, LAND_MAX_S: C.BIRD_LAND_MAX_S,
  WING_FAST: C.BIRD_WING_FAST, WING_GLIDE: C.BIRD_WING_GLIDE, BEAT_S: C.BIRD_BEAT_S,
};
const DT = 1 / 60;
const fill = (f) => { f.birds = []; for (let k = 0; k < f.max; k++) f.birds.push(E.newBird(f, k >= Math.ceil(f.max * 0.6))); };

console.log("\n=== la vie du groupe, 4 minutes rejouées à 60 images/s ===\n");
{
  /* ⚠️ CE CHAPITRE EXISTE PARCE QUE LE PREMIER MODÈLE PASSAIT TOUS LES AUTRES
     CONTRÔLES. Les oiseaux arrivaient, se posaient, ne restaient pas en l'air —
     et Guillaume a quand même écrit « ils se comportent comme les animaux de la
     ferme ». Ce qui manquait n'était mesuré nulle part : la VARIÉTÉ des
     activités, l'IRRÉGULARITÉ de l'espacement, et le fait qu'ils accélèrent et
     ralentissent au lieu de se téléporter d'une case à l'autre. */
  for (const f of flocks) fill(f);
  const site = flocks[0];
  const acts = {}, spdHist = [];
  let gaps = [], maxCrowd = 0, landings = 0;
  let now = 0;
  for (let i = 0; i < 60 * 240; i++) {
    now += DT * 1000;
    const before = site.birds.filter(b => b.st === "ground").length;
    E.flockStep(site, DT, { threats: [], food: null }, CFG, now);
    const after = site.birds.filter(b => b.st === "ground").length;
    if (after > before) landings += after - before;
    if (i % 7 === 0) for (const b of site.birds) if (b.st === "ground") {
      acts[b.act] = (acts[b.act] || 0) + 1;
      spdHist.push(b.spd);
    }
    if (i % 120 === 0) {
      const g2 = site.birds.filter(b => b.st === "ground");
      let near = 0;
      for (let a = 0; a < g2.length; a++) {
        let bd = Infinity;
        for (let b2 = 0; b2 < g2.length; b2++) if (a !== b2) bd = Math.min(bd, Math.hypot(g2[a].x - g2[b2].x, g2[a].y - g2[b2].y));
        if (bd < Infinity) gaps.push(bd);
        if (bd < 1.2) near++;
      }
      maxCrowd = Math.max(maxCrowd, near);
    }
  }
  const tot = Object.values(acts).reduce((a, b) => a + b, 0);
  console.log("  activités : " + Object.entries(acts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => k + " " + Math.round(v / tot * 100) + "%").join("  ·  "));
  /* ⚠️ « ILS NE FONT PAS TOUJOURS QUE PICORER » se mesure : aucune activité ne
     doit dépasser la moitié du temps, et il doit y en avoir au moins quatre. */
  const share = Object.values(acts).map(v => v / tot);
  ok(Object.keys(acts).length >= 4, "⚠️ ils ne font pas toujours que picorer",
     Object.keys(acts).length + " activités différentes observées");
  ok(Math.max(...share) < 0.55, "…et aucune n'occupe le temps à elle seule",
     "la plus fréquente : " + Math.round(Math.max(...share) * 100) + " %");
  /* ⚠️ L'ESPACEMENT EST IRRÉGULIER, ET C'EST LA DEMANDE MOT POUR MOT (« n'ont
     pas […] un espacement égal »). On mesure l'écart-type des distances au plus
     proche voisin : une grille régulière donne un écart-type quasi nul. */
  const mg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mg) * (b - mg), 0) / gaps.length);
  ok(sd > 0.25, "⚠️ l'espacement est IRRÉGULIER, pas une grille",
     "distance au plus proche voisin : " + mg.toFixed(2) + " ± " + sd.toFixed(2) + " case");
  ok(maxCrowd >= 2, "⚠️ ils se regroupent", "jusqu'à " + maxCrowd + " oiseaux à moins d'1,2 case l'un de l'autre");
  /* ⚠️ ILS ACCÉLÈRENT ET RALENTISSENT. Un modèle à sautillements donne deux
     vitesses : zéro et « la valeur ». On veut un continuum. */
  const moving = spdHist.filter(v => v > 0.05);
  const vmax = Math.max(...spdHist);
  const distinct = new Set(moving.map(v => Math.round(v * 5))).size;
  ok(distinct >= 6 && vmax > C.BIRD_WALK_SPD * 1.2, "⚠️ ils accélèrent et ralentissent",
     distinct + " paliers de vitesse observés, pointe à " + vmax.toFixed(2) + " tuile/s");
  ok(landings > 0, "la population se renouvelle", landings + " arrivées en 4 min");
}

console.log("\n=== le pain jeté depuis un banc ===\n");
{
  /* La demande : « quand on est assis, on doit pouvoir jeter du pain et ça
     attirera des groupes de pigeons ». Ce qu'on vérifie, c'est que le pain
     RASSEMBLE (ils convergent) et qu'il EXCITE (ils vont plus vite et se
     chamaillent) — deux effets distincts, et le second est celui que Guillaume
     décrit comme « le comportement plus excité des pigeons en groupe ». */
  for (const f of flocks) fill(f);
  const site = flocks[0];
  let now = 0;
  for (let i = 0; i < 60 * 20; i++) { now += DT * 1000; E.flockStep(site, DT, { threats: [], food: null }, CFG, now); }
  /* ⚠️ ON MESURE LA DISTANCE AU MÊME POINT AVANT ET APRÈS, et ce point est
     franchement EXCENTRÉ. Premier jet : on comparait « distance au centre du
     groupe » à « distance au pain », avec un pain posé à une case et demie du
     centre — les deux nombres étaient égaux par construction et le contrôle
     passait quoi qu'il arrive. Un banc qui ne peut pas échouer ne mesure rien. */
  const fx = site.cx + site.r * 0.9, fy = site.cy + site.r * 0.9;
  const food = { x: fx, y: fy, pts: [] };
  for (let k = 0; k < C.BIRD_CRUMB_N; k++) {
    const a = Math.random() * 6.28, rr = Math.random() * C.BIRD_CRUMB_SPREAD;
    food.pts.push({ x: fx + Math.cos(a) * rr, y: fy + Math.sin(a) * rr * 0.6 });
  }
  const before = site.birds.filter(b => b.st === "ground");
  const spreadBefore = before.reduce((a, b) => a + Math.hypot(b.x - food.x, b.y - food.y), 0) / Math.max(1, before.length);
  let squabs = 0, fastest = 0;
  for (let i = 0; i < 60 * 30; i++) {
    now += DT * 1000;
    E.flockStep(site, DT, { threats: [], food }, CFG, now);
    for (const b of site.birds) if (b.st === "ground") { if (b.act === "squab") squabs++; fastest = Math.max(fastest, b.spd); }
  }
  const after = site.birds.filter(b => b.st === "ground");
  const spreadAfter = after.reduce((a, b) => a + Math.hypot(b.x - food.x, b.y - food.y), 0) / Math.max(1, after.length);
  ok(spreadAfter < spreadBefore * 0.7, "⚠️ le pain RASSEMBLE",
     "distance moyenne au point : " + spreadBefore.toFixed(2) + " → " + spreadAfter.toFixed(2) + " case");
  ok(after.length >= before.length, "…et il en fait revenir",
     before.length + " → " + after.length + " oiseaux au sol");
  ok(squabs > 0, "⚠️ …et ça se chamaille", squabs + " images de bousculade");
  ok(fastest > C.BIRD_WALK_SPD * 1.5, "…on s'y précipite", "pointe à " + fastest.toFixed(2) + " tuile/s");
  /* ⚠️ LA MÊLÉE EST UNE ROSACE, PAS UNE FILE INDIENNE. C'est le seul défaut
     qu'on a vu EN JOUANT et qu'aucun contrôle ne regardait : les oiseaux
     arrivaient bien, allaient bien vite, se chamaillaient bien — et
     s'empilaient en chenille sur un point unique. On mesure donc la FORME du
     groupe : le rapport entre son étalement le long de son axe principal et son
     étalement en travers. Une file donne 4 ou 5, un attroupement rond donne 1,5. */
  { const g3 = after;
    const mx = g3.reduce((a, b) => a + b.x, 0) / g3.length, my = g3.reduce((a, b) => a + b.y, 0) / g3.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const b of g3) { const dx = b.x - mx, dy = b.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= g3.length; syy /= g3.length; sxy /= g3.length;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const ratio = Math.sqrt(l1 / Math.max(1e-6, l2));
    ok(ratio < 2.6, "⚠️ la mêlée est une ROSACE, pas une file indienne",
       "allongement du groupe : ×" + ratio.toFixed(2) + " (une file donne 4 ou plus)"); }
}

console.log("\n=== l'envol ===\n");
{
  for (const f of flocks) fill(f);
  let now = 0, stuck = 0, maxAlt = 0, flushed = 0;
  for (const f of flocks) {
    for (let i = 0; i < 60 * 90; i++) {
      now += DT * 1000;
      // Le promeneur se poste sur le centre du groupe une seconde sur deux.
      const th = ((i / 60) | 0) % 2 === 0 ? [{ x: f.cx, y: f.cy }] : [];
      E.flockStep(f, DT, { threats: th, food: null }, CFG, now);
      for (const b of f.birds) if (b.alt > maxAlt) maxAlt = b.alt;
    }
    for (const b of f.birds) { if (b.st === "fly" && b.t > 20) stuck++; if (b.st !== "away") flushed++; }
  }
  ok(stuck === 0, "⚠️ aucun oiseau resté en l'air", stuck ? stuck + " bloqués" : "aucun");
  ok(maxAlt <= C.BIRD_ALT_MAX + 2, "la hauteur reste raisonnable", "plafond : " + maxAlt.toFixed(1) + " tuiles");
}
{
  /* La FORME de l'envol : montée forte puis amortie, vitesse au sol inverse.
     C'est la différence entre un oiseau et une flèche, et c'est tout ce que
     veut dire « élégamment ». */
  const f = flocks[0]; fill(f);
  const b = f.birds[0];
  b.st = "ground"; b.alt = 0; b.spd = 0; b.a = 1; b.t = 0;
  const th = [{ x: b.x + 0.5, y: b.y }];
  const alt = [], spd = [];
  let now = 0;
  const solo = { ...f, birds: [b] };
  for (let i = 0; i < 90; i++) { now += DT * 1000; E.flockStep(solo, DT, { threats: th, food: null }, CFG, now); alt.push(b.alt); spd.push(b.spd); }
  const climb1 = alt[15] - alt[0], climb2 = alt[89] - alt[74];
  ok(climb1 > climb2 * 1.8, "⚠️ la montée est FORTE puis s'amortit",
     "premier quart de seconde : " + climb1.toFixed(2) + " tuile, dernier : " + climb2.toFixed(2));
  ok(spd[89] > spd[15] * 1.4, "…et la vitesse au sol fait l'inverse",
     spd[15].toFixed(1) + " → " + spd[89].toFixed(1) + " tuiles/s");
}
{
  /* Une colombe sur sept, pas une sur trois : demande explicite. */
  const f = flocks[0];
  let doves = 0, n = 400;
  for (let k = 0; k < n; k++) if (E.newBird(f, false).kind === "dove") doves++;
  ok(doves / n < 0.25, "⚠️ le pigeon est la règle, la colombe l'exception",
     Math.round(doves / n * 100) + " % de colombes sur " + n + " tirages");
}

/* ═══════════════ 3. UNE PLANCHE DU VOL, IMAGE PAR IMAGE ══════════════════ */
{
  const DT = 1 / 60, N = 14, EVERY = 7;
  const b = E.newBird(flocks[0], false);
  b.x = 0; b.y = 0; b.alt = 0; b.spd = 0; b.a = 1; b.t = 0; b.st = "ground"; b.kind = "pigeon";
  const solo = { ...flocks[0], cx: 0, cy: 0, birds: [b] };
  const th = [{ x: 0.6, y: 0 }];
  const frames = [];
  let now = 0;
  for (let f = 0; f < N * EVERY; f++) {
    now += DT * 1000;
    E.flockStep(solo, DT, { threats: th, food: null }, CFG, now);
    if (f % EVERY === 0) frames.push({ x: b.x, alt: b.alt, wing: b.wing, a: b.a, rate: b.wingRate || 0 });
  }
  const CW = 22, H = 74;
  const W = frames.length * CW + 8;
  const sh = makeCanvas(W, H);
  for (let y = 0; y < H; y++) {
    const k = y / H;
    sh.ctx.fillStyle = `rgba(${Math.round(150 + k * 40)},${Math.round(185 + k * 30)},${Math.round(220 - k * 20)},1)`;
    sh.ctx.fillRect(0, y, W, 1);
  }
  sh.ctx.fillStyle = "rgba(165,164,171,1)"; sh.ctx.fillRect(0, H - 6, W, 6);
  frames.forEach((fr, i) => {
    const im = poseFor("pigeon", fr);
    const gx = 4 + i * CW, gy = H - 6 - Math.round(fr.alt * 8);
    sh.ctx.fillStyle = "rgba(0,0,0," + (0.26 * Math.max(0, 1 - fr.alt / 5)).toFixed(3) + ")";
    sh.ctx.fillRect(gx + 2, H - 6, 12, 1);
    sh.ctx.globalAlpha = Math.max(0.15, fr.a);
    sh.ctx.drawImage(im, gx, gy - im.ground);
    sh.ctx.globalAlpha = 1;
  });
  const up = scale(sh.px, W, H, 6);
  writePNG(path.join(OUT, "oiseaux-envol.png"), up.px, up.W, up.H);
}
/* La pose que le rendu choisira : la MÊME règle que FermeGame, écrite une fois
   ici pour que la planche montre ce que le joueur verra vraiment. */
function poseFor(kind, fr) {
  const set = S.birds[kind];
  if (fr.rate < C.BIRD_WING_GLIDE * 1.6) return set.glide;
  const k = Math.floor(fr.wing / (Math.PI / 2)) % 4;
  return [set.down, set.mid, set.up, set.mid][k];
}

console.log("\n→ tools/out/oiseaux-poses.png, tools/out/oiseaux-envol.png");
console.log("\n" + (fail ? "❌ " + fail + " contrôle(s) en échec.\n" : "✅ tout passe.\n"));
process.exit(fail ? 1 : 0);
