/* =============================================================================
   verify-skatepark.mjs — LA COLLISION DU SKATEPARK, JOUÉE AU HASARD (2026-10-13).
   -----------------------------------------------------------------------------
   Guillaume : « tout doit être assuré sans bug de collision, aucun ». Un banc scripté ne joue que ce qu'on a pensé à écrire ; celui-ci
   JOUE AU HASARD, des centaines de sessions, à pied et sur les quatre montures (ordres, poussée, sauts, figures tirés par une graine
   fixe : le résultat est reproductible), et vérifie à chaque image des invariants qui ne souffrent aucune exception :
     MONTURES — jamais hors de l'aire de roulage (le dallage) ; jamais dans un module (les pieds sous le relief) ; jamais un saut de
       position ; jamais de NaN ; jamais l'axe d'un tube franchi sous sa lisse (hors glisse) ;
     PIÉTON (la règle du jeu reconstruite : `walkBlocked` sous la semelle, `walkStepOk`, `walkFenceStep`, la trappe de dégagement) —
       jamais un tube au milieu du corps ; jamais une marche de plus de `WALK.STEP` gravie d'un pas.
   Il COMPTE aussi, sans échouer en dessous d'un plafond, les contacts résiduels connus : le corps ou le véhicule qui entre de quelques
   centimètres dans un tube hors d'une chute (le prix de l'exemption qui laisse un ollie dans l'axe atteindre le bout d'un rail,
   `alignedRail`, monture.js) — le plafond est là pour qu'une régression se voie.
   ⚠️ Né d'une sonde de fuzz du 2026-10-13 qui trouvait, avant correction : 243 sorties du park sur 3 000 sessions (le bout nord de la
   mini-rampe, l'escalier de la galerie), 96 montées « téléportées » jusqu'à 1,37 m sur le flanc des modules, la semelle qui enjambait
   les mains courantes. Voir l'en-tête de `monture.js` (`fenceHit`) et de `skatepark.js` (`rideClear`, `walkFenceStep`).
   ET (2026-10-13 soir) LES CHUTES D'UN JOUEUR PLAUSIBLE, par minute, sous un plafond (« les échecs rares » — voir la dernière section).
   Usage :  node tools/verify-skatepark.mjs [sessions de monture] [sessions à pied]
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mods = await loadFerme(ROOT, ["fermeConstants", "skatepark", "monture"]);
const C = mods.fermeConstants, SP = mods.skatepark, MO = mods.monture, P = SP.PARK;
const RUNS = +process.argv[2] || 800, WALKS = +process.argv[3] || 120, DT = 1 / 60;
let fail = 0, nOk = 0;
const ok = (c, l, d) => { console.log((c ? "  OK   " : "  FAIL ") + l + (d ? "  —  " + d : "")); if (!c) fail++; else nOk++; };
console.log("\n=== verify-skatepark ===\n");
let seed = 20261013;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(d) < 1e-12) return -1;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
}

/* ── LES MONTURES ── */
const R = { out: [], under: [], teleport: [], nan: [], cross: [], contact: 0 };
const first = (arr, s) => { if (arr.length < 3) arr.push(s); else arr.push(null); };
for (let r = 0; r < RUNS; r++) {
  const kind = MO.VEH_KINDS[r % 4], half = MO.RIDE_HALF[kind], tall = MO.RIDE_TALL[kind];
  let x, y; const th0 = rnd() * 6.28;
  for (;;) {
    x = P.x0 + 0.3 + rnd() * (P.w - 0.6); y = P.y0 + 0.3 + rnd() * (P.h - 0.6);
    const z = SP.heightAt(x, y);
    if (!SP.walkBlocked(x, y) && SP.rideClear(x, y, z, th0, half, true, null, tall).c >= 0 && SP.sideWallDepth(x, y, z, SP.RIDE_TORSO_R) === 0) break;
  }
  const st = MO.rideNew(kind, x, y, th0);
  let inp = {}, segT = 0, jumpHold = 0, px = st.x, py = st.y, pz = st.z, pmode = st.mode, pc = 1e9;
  for (let t = 0; t < 20; t += DT) {
    if ((segT -= DT) <= 0) {
      segT = 0.15 + rnd() * 1.4;
      const a = Math.floor(rnd() * 9);
      inp = a === 8 ? {} : { ix: Math.cos(a * Math.PI / 4), iy: Math.sin(a * Math.PI / 4) };
      inp.push = rnd() < 0.5; inp.stop = rnd() < 0.08;
      if (rnd() < 0.3) jumpHold = 0.05 + rnd() * 0.5;
    }
    MO.rideStep(st, { ...inp, jump: jumpHold > 0, trick: rnd() < 0.03, trick2: rnd() < 0.03 }, DT);
    jumpHold -= DT;
    const tag = `${kind} #${r} t=${t.toFixed(2)} ${pmode}→${st.mode} (${(st.x - P.x0).toFixed(2)}, ${(st.y - P.y0).toFixed(2)}, ${st.z.toFixed(2)})`;
    if (![st.x, st.y, st.z, st.u, st.th].every(Number.isFinite)) { first(R.nan, tag); break; }
    if (!SP.inRideArea(st.x, st.y)) { first(R.out, tag); break; }
    if (st.z < SP.heightAt(st.x, st.y) - 0.035) first(R.under, tag);
    if (Math.hypot(st.x - px, st.y - py) > 0.4) first(R.teleport, tag);
    if (st.mode !== "grind" && pmode !== "grind") {
      const au = px - P.x0, av = py - P.y0, bu = st.x - P.x0, bv = st.y - P.y0, zl = Math.min(pz, st.z);
      for (const f of SP.PARK_FENCES) {
        const u = segX(au, av, bu, bv, f.u0, f.v0, f.u1, f.v1);
        if (u < 0) continue;
        const base = f.b0 + (f.b1 - f.b0) * u;
        if (zl < base + f.top - 0.01 && zl + SP.RIDER_H > base) first(R.cross, tag + ` ${f.kind} (${f.u0}, ${f.v0})`);
      }
    }
    // les contacts résiduels (hors chute, hors glisse) : on y ENTRE de plus de 2 cm
    if (st.mode !== "grind" && pmode !== "grind" && st.mode !== "bail") {
      const c = SP.rideClear(st.x, st.y, st.z, st.th, half, st.mode === "ground", null, tall).c;
      if (c < -0.02 && c < pc - 1e-6) R.contact++;
      pc = c;
    } else pc = 1e9;
    px = st.x; py = st.y; pz = st.z; pmode = st.mode;
  }
}
const show = (arr) => arr.filter(Boolean).join(" | ");
const sec = (RUNS * 20 / 3600).toFixed(1);
ok(R.out.length === 0, `jamais hors du park (${RUNS} sessions, ${sec} h de roulage au hasard)`, R.out.length ? show(R.out) : "0");
ok(R.under.length === 0, "jamais les pieds dans un module (flanc, plateforme)", R.under.length ? `${R.under.length} : ${show(R.under)}` : "0");
ok(R.teleport.length === 0, "jamais un saut de position", R.teleport.length ? show(R.teleport) : "0");
ok(R.nan.length === 0, "jamais de NaN", R.nan.length ? show(R.nan) : "0");
ok(R.cross.length === 0, "jamais l'axe d'un garde-corps franchi sous sa lisse", R.cross.length ? `${R.cross.length} : ${show(R.cross)}` : "0");
ok(R.contact <= RUNS * 0.03, "les contacts résiduels restent rares (≤ 3 pour 100 sessions)", `${R.contact} entrées de plus de 2 cm dans un tube, hors chute et hors glisse`);

/* ── À PIED ── (la règle du jeu, reconstruite : `canStandTown` sur les cases du park, `parkStepOk`, la trappe de dégagement) */
const parkCell = (x, y) => { const u = Math.floor(x) - P.x0, v = Math.floor(y) - P.y0; return (u >= 0 && v >= 0 && u < P.w && v < P.h) || (v >= Math.floor(SP.GALLERY.stairV0) && v < 0 && u >= Math.floor(SP.GALLERY.stairU0) && u < Math.ceil(SP.GALLERY.stairU1)); };
const canStand = (x, y) => C.bodyPoints(x, y).every(([qx, qy]) => !(parkCell(qx, qy) && SP.walkBlocked(qx, qy)));
function parkStepOk(m, nx, ny) {
  if (!SP.walkFenceStep(C.footX(m.x), C.footY(m.y), C.footX(nx), C.footY(ny))) return false;
  if (!SP.inPark(C.footX(nx), C.footY(ny)) && !SP.inPark(C.footX(m.x), C.footY(m.y))) return true;
  const h0 = SP.heightAt(C.footX(m.x), C.footY(m.y));
  return C.bodyPoints(nx, ny).every(([qx, qy]) => SP.walkStepOk(h0, qx, qy));
}
const stepOk = (m, nx, ny) => (canStand(nx, ny) && parkStepOk(m, nx, ny)) || (!canStand(m.x, m.y) && SP.walkFenceStep(C.footX(m.x), C.footY(m.y), C.footX(nx), C.footY(ny)));
const tubes = [...SP.PARK_FENCES.map((f) => [f.u0, f.v0, f.u1, f.v1]), ...SP.PARK_RAILS.flatMap((r) => r.pts.slice(1).map((q, k) => [r.pts[k][0], r.pts[k][1], q[0], q[1]]))];
// un tube passe-t-il DANS la semelle (son rectangle, rogné d'un rien sur les bords) ?
const through = (x0, y0, x1, y1) => tubes.some(([a, b, c, d]) => { for (let k = 0; k <= 40; k++) { const t = k / 40, u = a + (c - a) * t, v = b + (d - b) * t; if (u > x0 && u < x1 && v > y0 && v < y1) return true; } return false; });
const W = { through: [], climb: [] };
for (let r = 0; r < WALKS; r++) {
  let m;
  for (;;) { const fx = P.x0 + 0.4 + rnd() * (P.w - 0.8), fy = P.y0 - 1.8 + rnd() * (P.h + 1.4); m = { x: fx - C.footX(0), y: fy - C.footY(0) }; if (canStand(m.x, m.y) && SP.fenceNear(fx, fy, null).d >= SP.WALK.FENCE_R) break; }
  let dir = [0, 0], segT = 0, hPrev = SP.heightAt(C.footX(m.x), C.footY(m.y));
  for (let t = 0; t < 20; t += DT) {
    if ((segT -= DT) <= 0) { segT = 0.2 + rnd() * 2; const a = Math.floor(rnd() * 8); dir = [Math.cos(a * Math.PI / 4), Math.sin(a * Math.PI / 4)]; }
    const dx = dir[0] * 4.2 * DT, dy = dir[1] * 4.2 * DT;
    if (stepOk(m, m.x + dx, m.y)) m.x += dx;     // axe par axe, comme le jeu
    if (stepOk(m, m.x, m.y + dy)) m.y += dy;
    const fx = C.footX(m.x), fy = C.footY(m.y), h = SP.heightAt(fx, fy);
    const tag = `#${r} t=${t.toFixed(2)} pieds (${(fx - P.x0).toFixed(2)}, ${(fy - P.y0).toFixed(2)})`;
    if (h - hPrev > SP.WALK.STEP + 0.02) first(W.climb, tag + ` +${(h - hPrev).toFixed(2)}`);
    hPrev = h;
    const pts = C.bodyPoints(m.x, m.y);
    if (through(pts[0][0] - P.x0 + 0.06, pts[0][1] - P.y0 + 0.03, pts[3][0] - P.x0 - 0.06, pts[3][1] - P.y0 - 0.03)) first(W.through, tag);
  }
}
ok(W.through.length === 0, `à pied, jamais un tube au milieu du corps (${WALKS} sessions)`, W.through.length ? `${W.through.length} : ${show(W.through)}` : "0");
ok(W.climb.length === 0, "à pied, jamais une marche plus haute que le pas", W.climb.length ? show(W.climb) : "0");

/* ── 2026-10-13 (soir) — LES CHUTES D'UN JOUEUR PLAUSIBLE. Guillaume : « les échecs rares ». Le hasard pur ne dit rien de ce qu'un
   joueur vit ; celui-ci VISE (le centre d'un module, un point d'une ligne de glisse, à huit directions comme le clavier et le pavé),
   pousse, saute toutes les deux à quatre secondes, lance une figure dans un air sur deux à un instant tiré au hasard. Deux profils :
   le NAÏF garde en l'air la flèche qu'il tenait et ne regarde pas devant lui ; l'APPLIQUÉ lâche les flèches en l'air et regarde à
   0,4 s devant lui (son temps de réaction) — il saute ce qui se saute (caisse, rail), contourne le reste.
   ⚠️ MESURÉ AVANT LES CORRECTIONS DU JOUR (`monture.js`, « LES CHUTES RARES ») : 6 à 10 chutes par minute, les deux profils. Après :
   0,2 (rollers) à 1,5 (trottinette, BMX) — presque toutes des chocs DE FACE à fond de poussée, que ce bot voit trop tard. Les chutes
   de commande (réception de travers, figure pas finie) sont tenues à presque rien : c'est ce que le jeu doit garantir. */
{
  const goals = [];
  for (const p of SP.PARK_PRIMS) { const b = p.bb; goals.push([P.x0 + (b[0] + b[2]) / 2, P.y0 + (b[1] + b[3]) / 2]); }
  for (const L of SP.PARK_GRINDS) for (const q of L.pts) goals.push([P.x0 + q[0], P.y0 + q[1]]);
  const q8 = (dx, dy) => { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4); return [Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]; };
  const play = (profile, runs) => {
    const S = { min: 0, bails: 0, ctl: 0, kinds: {} };
    for (let r = 0; r < runs; r++) {
      const kind = MO.VEH_KINDS[r % 4], half = MO.RIDE_HALF[kind], tall = MO.RIDE_TALL[kind];
      const K = S.kinds[kind] || (S.kinds[kind] = { min: 0, bails: 0 });
      let x, y; const th0 = rnd() * 6.28;
      for (;;) { x = P.x0 + 0.3 + rnd() * (P.w - 0.6); y = P.y0 + 0.3 + rnd() * (P.h - 0.6); const z = SP.heightAt(x, y); if (z < 0.01 && SP.inRideArea(x, y) && SP.rideClear(x, y, z, th0, half, true, null, tall).c >= 0 && SP.sideWallDepth(x, y, z, SP.RIDE_TORSO_R) === 0) break; }
      const st = MO.rideNew(kind, x, y, th0);
      let goal = goals[(rnd() * goals.length) | 0], goalT = 4 + rnd() * 4, push = false, pushT = 0, jumpT = 1.5 + rnd() * 2.5, hold = 0;
      let avoidT = 0, avoidDir = null, trickAt = -1, trickKey = null, trickHold = 0, prevMode = st.mode, airDir = null;
      for (let t = 0; t < 60; t += DT) {
        if ((goalT -= DT) <= 0 || Math.hypot(goal[0] - st.x, goal[1] - st.y) < 0.8) { goal = goals[(rnd() * goals.length) | 0]; goalT = 4 + rnd() * 4; }
        if ((pushT -= DT) <= 0) { pushT = 0.5 + rnd() * 2; push = rnd() < 0.5; }
        let [ix, iy] = q8(goal[0] - st.x, goal[1] - st.y);
        let jump = false, trick = false, trick2 = false;
        if (st.mode === "ground") {
          if ((jumpT -= DT) <= 0 && Math.abs(st.u) > 1.2) { hold = 0.1 + rnd() * 0.3; jumpT = 1.5 + rnd() * 3; }
          if (profile === "applique" && avoidT <= 0 && Math.abs(st.u) > 2) {
            const trav = st.th + (st.u < 0 ? Math.PI : 0), d = Math.abs(st.u) * 0.4;
            let seen = false, low = true;
            for (let k = 1; k <= 4 && !seen; k++) {
              const ax = st.x + Math.cos(trav) * d * k / 4, ay = st.y + Math.sin(trav) * d * k / 4, q = SP.parkSurf(ax, ay, {}), h = q ? q.h : 0, sl = q ? Math.hypot(q.gu, q.gv) : 0;
              const tube = SP.rideClear(ax, ay, Math.max(h, st.z), st.th, half, true, null, tall);
              if (h > st.z + 0.06 + sl * d / 4) { seen = true; low = h - st.z < 0.45; }
              else if (!SP.inRideArea(ax, ay)) { seen = true; low = false; }
              else if (tube.c < 0) { seen = true; low = !!(tube.f && tube.f.pts); }   // un rail se saute ; un garde-corps, non
            }
            if (seen) { avoidT = 0.5; if (low && rnd() < 0.5 && Math.abs(st.u) > 3) { hold = 0.2; avoidDir = null; } else avoidDir = trav + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2; }
          }
          if (avoidT > 0) { avoidT -= DT; if (avoidDir != null) [ix, iy] = q8(Math.cos(avoidDir), Math.sin(avoidDir)); }
          if (hold > 0) { jump = true; hold -= DT; }
        }
        if (st.mode === "air") {
          if (prevMode !== "air") { airDir = [ix, iy]; trickAt = rnd() < 0.45 ? 0.05 + rnd() * 0.3 : -1; trickKey = rnd() < 0.5 ? "v" : "g"; }
          if (profile === "naif") [ix, iy] = airDir; else { ix = 0; iy = 0; }
          if (trickAt >= 0 && st.airT >= trickAt) { trickHold = 0.08; trickAt = -1; }
          if (trickHold > 0) { trickHold -= DT; if (trickKey === "v") trick = true; else trick2 = true; }
        }
        prevMode = st.mode;
        MO.rideStep(st, { ix, iy, push, jump, stop: false, trick, trick2 }, DT);
        if (st.bailed) { S.bails++; K.bails++; if (st.bailed.why === "angle" || st.bailed.why === "trick") S.ctl++; }
      }
      S.min++; K.min++;
    }
    return S;
  };
  const RP = Math.max(8, Math.round(RUNS / 40) * 4);   // 80 sessions d'une minute par profil (20 par monture) au réglage par défaut
  for (const profile of ["naif", "applique"]) {
    const S = play(profile, RP), per = (n, m) => (n / m).toFixed(2);
    const line = Object.entries(S.kinds).map(([k, K]) => `${k} ${per(K.bails, K.min)}`).join(" · ");
    const cap = profile === "naif" ? 1.7 : 1.4;
    ok(S.bails / S.min <= cap, `le joueur ${profile === "naif" ? "naïf" : "appliqué"} tombe rarement (≤ ${cap} chute/min ; 6 à 10 avant le 2026-10-13 soir)`, `${per(S.bails, S.min)}/min sur ${S.min} min — ${line}`);
    ok(Object.values(S.kinds).every((K) => K.bails / K.min <= 2.6), `  et aucune monture au-dessus de 2,6 chutes/min`, line);
    ok(S.ctl / S.min <= 0.2, `  les chutes de COMMANDE (réception de travers, figure pas finie) restent exceptionnelles (≤ 0,2/min)`, `${per(S.ctl, S.min)}/min`);
  }
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ${nOk}/${nOk + fail} contrôles\n`);
process.exit(fail === 0 ? 0 : 1);
