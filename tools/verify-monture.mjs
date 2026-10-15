/* =============================================================================
   verify-monture.mjs — LES MONTURES DU SKATEPARK SE JOUENT-ELLES ? (2026-10-11)
   -----------------------------------------------------------------------------
   Un banc qui JOUE (comme `verify-maire`, `verify-patin`) : la vraie physique (`monture.js`) sur le vrai relief (`skatepark.js`),
   pilotée par des ordres scriptés, à 60 images/s. Il ne relit pas une table : il mesure ce qui arrive.
     1. pousser sur le plat (chaque monture atteint sa croisière, et le BMX y arrive le premier) ; la roue libre ;
     2. le pompage dans la mini-rampe : sans pomper, les allers-retours s'éteignent ; en pompant, on monte jusqu'au coping ;
     3. la conservation de l'énergie (sans roulement ni air, le va-et-vient garde sa hauteur) ;
     4. l'air au quarter : le skate retombe en fakie ; le BMX tombe s'il n'a pas fait son demi-tour, et retombe s'il l'a fait ;
     5. le saut de la funbox (décollage à la lèvre du tremplin, on retombe sur la table ou le tremplin d'en face) ;
     6. l'ollie sur le plat (sa hauteur) ; le choc contre le flanc d'un module (lent : arrêt ; vite : chute) ; la barrière.
   Usage :  node tools/verify-monture.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mods = await loadFerme(ROOT, ["skatepark", "monture"]);
const SP = mods.skatepark, MO = mods.monture;
const P = SP.PARK;
let fail = 0, nOk = 0;
const ok = (cond, label, detail) => { console.log((cond ? "  OK   " : "  FAIL ") + label + (detail ? "  —  " + detail : "")); if (!cond) fail++; else nOk++; };
console.log("\n=== verify-monture ===\n");
const DT = 1 / 60;
/* Faire tourner `st` pendant `sec` secondes avec l'ordre que rend `ctl(st, t)` ; `on(st, t)` est appelé à chaque image. */
function run(st, sec, ctl, on) {
  for (let t = 0; t < sec; t += DT) { MO.rideStep(st, ctl ? ctl(st, t) : {}, DT); if (on && on(st, t) === false) break; }
  return st;
}
const L = (u, v) => [P.x0 + u, P.y0 + v];

// ── 1. LA POUSSÉE ET LA ROUE LIBRE (la voie street, sud, d'ouest en est : du plat sur 8 cases avant la caisse... on part à l'ouest)
{
  const res = {};
  for (const k of MO.VEH_KINDS) {
    const [x, y] = L(1.5, 20.6);
    const st = MO.rideNew(k, x, y, 0);
    let t2 = null;
    run(st, 4, () => ({ ix: 1, iy: 0, push: true }), (s, t) => { if (t2 == null && s.u > 2) t2 = t; if (s.x > P.x0 + 19) return false; });
    res[k] = { v: st.u, t2 };
  }
  const line = MO.VEH_KINDS.map((k) => `${k} ${res[k].v.toFixed(2)} (2 c/s en ${res[k].t2 == null ? "—" : res[k].t2.toFixed(2)} s)`).join(" · ");
  ok(MO.VEH_KINDS.every((k) => res[k].v > 3.5), "chaque monture prend sa vitesse en poussant", line);
  ok(res.bmx.t2 < res.skate.t2 && res.bmx.t2 < res.roller.t2, "le BMX arrache le premier (le pédalage)", line);
  const st = MO.rideNew("skate", ...L(1.5, 20.6), 0); st.u = 4;
  let x0 = st.x; run(st, 3, () => ({}));
  ok(st.u < 4 && st.u > 3.1, "la roue libre : le skate garde l'essentiel de sa vitesse sur 3 s", `${st.u.toFixed(2)} c/s, ${(st.x - x0).toFixed(1)} cases`);
}

// ── 2. LE POMPAGE DANS LA MINI-RAMPE (on part du plat, vers l'est, à 3,2 c/s)
const M = SP.MINI;
function miniRun(kind, pump, sec) {
  const st = MO.rideNew(kind, ...L((M.uTW + M.uTE) / 2, 3), 0);
  st.u = 3.2;
  let maxH = 0, air = 0, bails = 0, lastSign = 1, passes = 0;
  run(st, sec, (s) => {
    // le pilote pompe dans le creux des courbes (là où la pente n'est ni nulle ni verticale)
    const g = SP.parkSurf(s.x, s.y, {});
    const sl = g ? Math.abs(g.gu) : 0;
    return { push: pump && s.mode === "ground" && sl > 0.15 && sl < 2.5 };
  }, (s) => {
    maxH = Math.max(maxH, s.z); if (s.mode === "air") air = Math.max(air, s.z - SP.heightAt(s.x, s.y));
    if (s.bailed) bails++;
    const sg = Math.sign(s.u); if (sg && sg !== lastSign) { passes++; lastSign = sg; }
  });
  return { maxH, air, bails, passes, st };
}
{
  const a = miniRun("skate", false, 12), b = miniRun("skate", true, 12);
  ok(a.maxH < M.top - 0.15, "sans pomper, les allers-retours ne montent pas au coping", `haut ${a.maxH.toFixed(2)} / coping ${M.top.toFixed(2)}`);
  ok(b.maxH > a.maxH + 0.2, "en pompant, on monte plus haut", `${a.maxH.toFixed(2)} → ${b.maxH.toFixed(2)} (${b.passes} demi-tours)`);
  ok(b.air > 0.05 && b.bails === 0, "en pompant, le skate finit par sortir au coping, et retombe dedans (en fakie)", `air ${b.air.toFixed(2)} case, ${b.bails} chute(s)`);
  const c2 = miniRun("skate", true, 40);
  ok(c2.air < 0.7, "mais le pompage plafonne : à force, un air de mini-rampe, pas un vol", `air max en 40 s : ${(c2.air * 1.15).toFixed(2)} m`);
}

// ── 3. L'ÉNERGIE (sans roulement ni air) : dix allers-retours gardent leur hauteur
{
  const save = { ...MO.VEH.skate };
  MO.VEH.skate.crr = 0; MO.VEH.skate.drag = 0;
  const st = MO.rideNew("skate", ...L((M.uTW + M.uTE) / 2, 3), 0); st.u = 3.0;
  const peaks = [];
  let prevZ = st.z, rising = false;
  run(st, 14, () => ({}), (s) => { if (s.z > prevZ) rising = true; else if (rising && s.z < prevZ) { peaks.push(prevZ); rising = false; } prevZ = s.z; });
  Object.assign(MO.VEH.skate, save);
  const d = peaks.length > 4 ? Math.abs(peaks[peaks.length - 1] - peaks[1]) : 9;
  ok(d < 0.03, "sans frottement, la hauteur des allers-retours se conserve (l'intégration ne crée ni ne perd d'énergie)", `${peaks.length} sommets, écart ${d.toFixed(3)} case`);
}

// ── 4. L'AIR AU QUARTER (contre le bord nord, face au sud) : on arrive du sud, droit dessus, à 6,8 c/s
const Q = SP.QUARTER;
// `hold` : la flèche tenue EN L'AIR (null : on lâche tout) ; `ground` : celle tenue en montant (null : aucune)
function quarterRun(kind, hold, ground) {
  const st = MO.rideNew(kind, ...L(14, Q.toeV + 4), -Math.PI / 2);   // cap au nord
  st.u = 6.8;
  let air = 0, landed = null, bailed = null, spin = 0, deck = false;
  run(st, 3, (s) => (s.mode === "air" ? (hold || {}) : (ground || {})), (s) => {
    if (s.landed && s.landed.air > 0.1) deck = s.y - P.y0 < Q.v1 - Q.R - 0.05 && Math.abs(s.z - Q.Ht) < 0.08;
    if (s.mode === "air") { air = Math.max(air, s.z - Q.Ht); spin = s.spin; }
    if (s.landed && s.landed.air > 0.1) { landed = s.landed; return false; }
    if (s.bailed) { bailed = s.bailed; return false; }
  });
  return { air, landed, bailed, spin, deck };
}
{
  const sk = quarterRun("skate", false);
  ok(sk.air > 0.25, "le skate sort au-dessus du coping du quarter", `${sk.air.toFixed(2)} case (${(sk.air * 1.15).toFixed(2)} m)`);
  ok(sk.landed && sk.landed.fakie && !sk.bailed, "et retombe DANS la courbe, en fakie", sk.landed ? `réception ${sk.landed.hard.toFixed(2)} c/s` : String(sk.bailed && sk.bailed.why));
  /* 2026-10-13 (soir) — LE DEMI-TOUR DU BMX SE FAIT SEUL (décision de Guillaume : « les échecs rares ») : sans ordre, la monture
     s'aligne sur sa réception. Premier jet : « le BMX sans demi-tour tombe » — et un joueur qui gardait la flèche du nord tombait
     à chaque air. Le demi-tour automatique ne compte pas comme une figure (`spin` reste à zéro : pas de « 180 » affiché). */
  const bx = quarterRun("bmx", null);
  ok(bx.landed && !bx.bailed && Math.abs(bx.spin) < 0.1, "le BMX fait seul son demi-tour au quarter et retombe (sans « 180 » au compteur)", bx.landed ? `rotation voulue ${(bx.spin * 180 / Math.PI).toFixed(0)}°` : String(bx.bailed && bx.bailed.why));
  const bk = quarterRun("bmx", { ix: 0, iy: -1 }, { ix: 0, iy: -1 });
  ok(bk.landed && !bk.bailed && bk.deck, "la flèche du nord tenue en montant et en l'air : il se pose sur la plateforme (« air to deck »)", bk.landed ? (bk.deck ? "sur la plateforme" : "dans la courbe") : String(bk.bailed && bk.bailed.why));
  const bx2 = quarterRun("bmx", { ix: 0, iy: 1 });
  ok(bx2.landed && !bx2.bailed && Math.abs(bx2.spin) > 2.6, "la flèche du retour (vers le creux) : un demi-tour VOULU, compté", bx2.landed ? `rotation ${(bx2.spin * 180 / Math.PI).toFixed(0)}°` : String(bx2.bailed && bx2.bailed.why));
  const bx3 = quarterRun("bmx", { ix: 1, iy: 0 });
  ok(bx3.bailed && bx3.bailed.why === "angle", "mais la flèche de travers tenue jusqu'au bout : il retombe en travers, la chute", bx3.bailed ? bx3.bailed.why : "pas de chute");
}

// ── 5. LA FUNBOX : d'ouest en est, à 5,5 c/s — sans ollie, un petit saut qui retombe sur la table ; avec un ollie lâché à la
//       lèvre, on passe la table
{
  const F = SP.FUNBOX;
  const go = (ollie) => {
    const st = MO.rideNew("skate", ...L(F.u0 - 3, (F.v0 + F.v1) / 2), 0); st.u = 5.8;
    let take = null, land = null, bail = null, top = 0;
    run(st, 2.5, (s) => ({ jump: ollie && s.x - P.x0 > F.u0 + 0.6 && s.x - P.x0 < F.u0 + F.L - 0.05 && s.mode === "ground" }), (s) => {
      if (s.mode === "air" && take == null) take = s.x - P.x0;
      if (s.mode === "air") top = Math.max(top, s.z);
      if (s.landed && take != null) { land = s.x - P.x0; return false; }
      if (s.bailed) { bail = s.bailed; return false; }
    });
    return { take, land, bail, top };
  };
  const a = go(false), b = go(true);
  ok(a.take != null && Math.abs(a.take - (F.u0 + F.L)) < 0.2, "on décolle tout seul à la lèvre du tremplin de la funbox", a.take == null ? "pas décollé" : `u ${a.take.toFixed(2)} (lèvre ${(F.u0 + F.L).toFixed(2)})`);
  ok(a.land != null && !a.bail, "et l'on retombe sur la table, debout", a.land == null ? String(a.bail && a.bail.why) : `u ${a.land.toFixed(2)}, ${((a.top - F.H) * 1.15).toFixed(2)} m`);
  ok(b.land != null && !b.bail && b.land > F.u1 - F.L - 0.3, "avec un ollie à la lèvre, on passe la table", b.land == null ? String(b.bail && b.bail.why) : `u ${b.land.toFixed(2)} (fin de table ${(F.u1 - F.L).toFixed(2)}), ${((b.top - F.H) * 1.15).toFixed(2)} m`);
}

// ── 6. L'OLLIE, LE CHOC, LA BARRIÈRE
{
  /* 2026-10-15 — LE SAUT CHARGÉ (« plus on maintient longtemps, plus le saut est haut ») : une tape, l'ollie d'avant (0,3 s : ~60 cm, le
     geste appris ne rapetisse pas), la charge pleine (~1 m) ; et chaque monture va plus haut en chargeant plus longtemps. */
  const ollieTop = (kind, hold) => {
    const st = MO.rideNew(kind, ...L(4, 9), 0); st.u = 2.5;   // la rangée v 9 est plate de u 2,5 à 18,5 : le saut part et retombe à plat
    let top = 0;
    run(st, hold, () => ({ jump: true }));
    const z0 = st.z;
    run(st, 1.6, () => ({}), (s) => { top = Math.max(top, s.z - z0); if (s.landed) return false; });
    return top * 1.15;
  };
  const tap = ollieTop("skate", 0.05), mid03 = ollieTop("skate", 0.3), full = ollieTop("skate", 1.0);
  ok(tap > 0.2 && tap < 0.36, "une tape sur le saut : un petit ollie (~25 cm)", `${tap.toFixed(2)} m`);
  ok(mid03 > 0.5 && mid03 < 0.7, "0,3 s de charge : l'ollie d'avant (~60 cm)", `${mid03.toFixed(2)} m`);
  ok(full > 0.88 && full < 1.12, "la charge pleine : environ un mètre", `${full.toFixed(2)} m`);
  const grow = MO.VEH_KINDS.map((k) => [k, ollieTop(k, 0.15), ollieTop(k, 0.5), ollieTop(k, 1.1)]);
  ok(grow.every(([, a2, b2, c2]) => a2 < b2 - 0.08 && b2 < c2 - 0.05), "chaque monture saute plus haut à mesure qu'on charge", grow.map(([k, a2, b2, c2]) => `${k} ${a2.toFixed(2)}→${b2.toFixed(2)}→${c2.toFixed(2)} m`).join(" · "));
  const F = SP.FUNBOX;
  const slow = MO.rideNew("skate", ...L(9, F.v1 + 1.5), -Math.PI / 2); slow.u = 1.2;
  let bailS = null; run(slow, 2, () => ({}), (s) => { if (s.bailed) bailS = s.bailed; });
  ok(!bailS && slow.y > P.y0 + F.v1 - 0.05, "lentement contre le flanc de la funbox : on s'arrête, sans tomber", `v ${(slow.y - P.y0).toFixed(2)}`);
  /* 2026-10-13 (soir) — « les échecs rares » : on ne tombe plus que DE FACE et à fond (`HIT_FALL`, 5,6 c/s dans le mur) ; de biais,
     on longe le flanc. Premier jet : la chute dès 3,6 c/s, quel que soit l'angle (ce contrôle lançait à 5). */
  const fast = MO.rideNew("skate", ...L(9, F.v1 + 3), -Math.PI / 2); fast.u = 6.4;
  let bailF = null; run(fast, 2, () => ({}), (s) => { if (s.bailed && !bailF) bailF = s.bailed; });
  ok(bailF && bailF.why === "step", "à fond, de face contre le flanc : la chute", bailF ? bailF.why : "pas de chute");
  const mid = MO.rideNew("skate", ...L(9, F.v1 + 2.5), -Math.PI / 2); mid.u = 5;
  let bailM = null; run(mid, 2, () => ({}), (s) => { if (s.bailed && !bailM) bailM = s.bailed; });
  ok(!bailM && mid.y > P.y0 + F.v1 - 0.05, "lancé (5 c/s) mais pas à fond, de face : on rebondit, sans tomber", bailM ? bailM.why : `v ${(mid.y - P.y0).toFixed(2)}`);
  const sl = MO.rideNew("skate", ...L(8, F.v1 + 1.2), -Math.PI / 2 + 0.75); sl.u = 6.4;   // 43° de biais, vers le nord-est
  let bailL = null, minV = 1e9; run(sl, 0.6, () => ({}), (s) => { if (s.bailed && !bailL) bailL = s.bailed; minV = Math.min(minV, s.y - P.y0); });
  ok(!bailL && minV > F.v1 - 0.05 && sl.x - P.x0 > 9.5 && Math.abs(sl.u) > 3, "à fond mais de biais (43°) : on longe le flanc, sans tomber ni y entrer", bailL ? bailL.why : `u ${(sl.x - P.x0).toFixed(2)}, ${Math.abs(sl.u).toFixed(1)} c/s`);
  const fe = MO.rideNew("bmx", ...L(10, 20.5), Math.PI / 2); fe.u = 4;
  let bailE = null; run(fe, 2, () => ({}), (s) => { if (s.bailed && !bailE) bailE = s.bailed; });
  ok(fe.y < P.y0 + P.h, "la barrière sud arrête qui roule vers elle", `v ${(fe.y - P.y0).toFixed(2)} (${bailE ? "chute" : "arrêt"})`);
}
// ── 7. LE GRIND : un ollie sur le rail plat (sud, d'ouest en est), aligné — on s'y accroche en 50-50, on le glisse au bout
{
  const R = SP.PARK_RAILS[0].pts, rv = R[0][1];
  const st = MO.rideNew("skate", ...L(R[0][0] - 2.4, rv), 0); st.u = 4.6;
  let grind = null, done = null, bail = null, popAt = null;
  run(st, 3, (s) => {
    const u = s.x - P.x0;
    if (popAt == null && u > R[0][0] - 0.95) popAt = u;
    return { jump: s.mode === "ground" && u < R[0][0] - 0.95 && u > R[0][0] - 1.4 };
  }, (s) => { if (s.grinded && !grind) grind = s.grinded; if (s.grindDone && !done) done = s.grindDone; if (s.bailed) { bail = s.bailed; return false; } if (done && s.landed) return false; });
  ok(grind && grind.style === "5050", "un ollie sur le rail plat, aligné : on s'y accroche en 50-50", grind ? grind.style : bail ? "chute : " + bail.why : "pas d'accroche");
  ok(done && done.how === "end" && done.len > 2.5, "on le glisse jusqu'au bout et l'on en sort dans son axe", done ? `${done.len.toFixed(1)} cases, sortie « ${done.how} »` : "—");
  ok(!bail, "et l'on retombe debout", bail ? bail.why : "debout");
}

// ── 8. LE KICKFLIP : lancé tôt dans un ollie, il retombe propre ; lancé trop tard, le plateau tourne encore : la chute
{
  const go = (late) => {
    const st = MO.rideNew("skate", ...L(15, 9), 0); st.u = 3.5;
    run(st, 0.36, () => ({ jump: true }));
    let landed = null, bail = null, pressed = false;
    run(st, 1.5, (s) => {
      const want = !pressed && s.mode === "air" && (late === "mid" ? s.vz < 0 : late ? s.vz < -1.2 : s.airT > 0.08);
      if (want) pressed = true;
      return { trick: want };
    }, (s) => { if (s.landed) { landed = s.landed; return false; } if (s.bailed) { bail = s.bailed; return false; } });
    return { landed, bail };
  };
  /* 2026-10-13 (soir) — premier jet : « lancé trop tard, la chute ». Désormais la figure se PRESSE pour tenir dans l'air qui reste,
     ou ne part pas : un appui tardif ne fait jamais tomber. */
  const a = go(false), b = go(true), c = go("mid");
  ok(a.landed && a.landed.trick === "kickflip", "un kickflip lancé tôt retombe propre", a.landed ? a.landed.trick : a.bail ? a.bail.why : "—");
  ok(c.landed && c.landed.trick === "kickflip", "lancé au sommet, il se presse et retombe propre", c.landed ? c.landed.trick : c.bail ? c.bail.why : "—");
  ok(b.landed && !b.bail && !b.landed.trick, "lancé trop tard, il ne part pas — et l'on retombe debout", b.landed ? `debout, figure : ${b.landed.trick || "aucune"}` : b.bail ? b.bail.why : "—");
}
// ── 9. LES FIGURES NEUVES (2026-10-15) : la flèche choisit la variante (pas celle du décollage), le même appui prolonge, le corps
//    tourne (spins, bigspin) et vise la réception, la pirouette des rollers au sol, le handplant au coping. Chacune JOUÉE.
{
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  /* Un saut à pleine charge sur le plat (vers l'est), puis un script d'appuis en l'air : `ev` = [{ at, key, ix, iy }] (la flèche est
     tenue dès `at`, la touche appuyée 50 ms plus tard, deux images) ; `push` : la flèche de l'est tenue de bout en bout (on poussait). */
  const air = (kind, ev, o = {}) => {
    const st = MO.rideNew(kind, ...L(4, 9), 0); st.u = o.u != null ? o.u : 2.5;   // à plat de bout en bout (voir `ollieTop`)
    run(st, o.hold != null ? o.hold : 1.0, () => ({ jump: true, ix: o.push ? 1 : 0 }));
    let landed = null, bail = null, names = [];
    run(st, 2, (s) => {
      const c = { ix: o.push ? 1 : 0, iy: 0 };
      if (s.mode !== "air") return c;
      for (const e of ev) {
        if (s.airT >= e.at) { if (e.ix != null || e.iy != null) { c.ix = e.ix || 0; c.iy = e.iy || 0; } }
        if (s.airT >= e.at + 0.05 && s.airT < e.at + 0.05 + 2 * DT) c[e.key] = true;
      }
      return c;
    }, (s) => { if (s.flipped && !names.includes(s.flipped)) names.push(s.flipped); if (s.landed) { landed = s.landed; return false; } if (s.bailed) { bail = s.bailed; return false; } });
    return { st, landed, bail, names, th: st.th };
  };
  const tag = (r) => (r.bail ? "chute : " + r.bail.why : r.landed ? `${[...(r.landed.tricks || []), r.landed.trick].filter(Boolean).join(" › ") || "—"}, ${Math.round(Math.abs(r.landed.spin || 0) * 180 / Math.PI)}°${r.landed.fakie ? ", fakie" : ""}` : "pas de réception");
  const k0 = air("skate", [{ at: 0.03, key: "trick" }], { push: true });
  ok(k0.landed && k0.landed.trick === "kickflip", "la flèche tenue au décollage (on poussait) n'est pas une variante : V reste un kickflip", tag(k0));
  const h1 = air("skate", [{ at: 0.1, key: "trick", ix: -1 }]);
  ok(h1.landed && h1.landed.trick === "heelflip" && Math.abs(wrapA(h1.th)) < 0.3, "une flèche fraîche (←) avec V : le heelflip — et la flèche, prise pour variante, ne fait pas tourner", tag(h1) + `, cap ${(h1.th * 180 / Math.PI).toFixed(0)}°`);
  const h2 = air("skate", [{ at: 0.1, key: "trick", iy: 1 }]);
  ok(h2.landed && h2.landed.trick === "hardflip", "une flèche ↓ avec V : le hardflip", tag(h2));
  const d2 = air("skate", [{ at: 0.06, key: "trick" }, { at: 0.2, key: "trick" }]);
  ok(d2.landed && d2.landed.trick === "doubleFlip", "V, puis V pendant qu'il tourne : le double kickflip, posé", tag(d2));
  const d3 = air("skate", [{ at: 0.06, key: "trick" }, { at: 0.2, key: "trick" }, { at: 0.36, key: "trick" }]);
  ok(d3.landed && !d3.bail && /Flip$/.test(d3.landed.trick || ""), "un troisième V : le triple s'il reste de l'air, sinon le double — jamais une chute", tag(d3));
  const bg = air("skate", [{ at: 0.1, key: "trick2", iy: -1 }]);
  ok(bg.landed && bg.landed.trick === "bigspin" && bg.landed.fakie, "une flèche ↑ avec G : le bigspin (le corps fait un 180), posé en fakie", tag(bg));
  const r1 = air("roller", [{ at: 0.1, key: "trick", ix: 1, iy: 0.3 }]);
  ok(r1.landed && !r1.bail && Math.abs(Math.abs(r1.landed.spin) - 2 * Math.PI) < 0.2, "rollers, une flèche avec V : un spin 360, posé", tag(r1));
  const r2 = air("roller", [{ at: 0.1, key: "trick", ix: 1, iy: 0.3 }, { at: 0.3, key: "trick" }]);
  ok(r2.landed && !r2.bail && Math.abs(Math.abs(r2.landed.spin) - 3 * Math.PI) < 0.25, "un V de plus pendant le spin : un demi-tour de plus (540), posé en fakie", tag(r2));
  const r3 = air("roller", [{ at: 0.08, key: "trick", ix: 1, iy: 0.3 }, { at: 0.22, key: "trick" }, { at: 0.36, key: "trick" }, { at: 0.5, key: "trick" }]);
  ok(r3.landed && !r3.bail && Math.abs(r3.landed.spin) > 3.4 * Math.PI, "le spin s'emballe autant que l'air le permet (720 et plus), sans chute", tag(r3));
  const bs = air("bmx", [{ at: 0.08, key: "trick2", ix: 1, iy: -0.3 }]);
  ok(bs.landed && !bs.bail && Math.abs(Math.abs(bs.landed.spin) - 2 * Math.PI) < 0.25, "BMX, une flèche avec G : le 360 sur le plat, retombé dans son sens", tag(bs));
  // au quarter : le 360 lancé vise la réception — il redescend la courbe, donc il fait 540
  const q = MO.rideNew("bmx", ...L(14, SP.QUARTER.toeV + 4), -Math.PI / 2); q.u = 6.8;
  let qL = null, qB = null;
  run(q, 3, (s) => (s.mode === "air" && s.airT > 0.05 && s.airT < 0.05 + 2 * DT ? { trick2: true, ix: 1, iy: 0 } : s.mode === "air" && s.airT < 0.3 ? { ix: 1, iy: 0 } : {}),
    (s) => { if (s.landed && s.landed.air > 0.1) { qL = s.landed; return false; } if (s.bailed) { qB = s.bailed; return false; } });
  ok(qL && !qB && Math.abs(Math.abs(qL.spin) - 3 * Math.PI) < 0.3, "au quarter, le 360 du BMX vise la réception : un 540, et il redescend la courbe dans son sens", qB ? "chute : " + qB.why : qL ? `${Math.round(Math.abs(qL.spin) * 180 / Math.PI)}°` : "—");
  // la pirouette des rollers, à l'arrêt : V, puis deux V de plus (elle s'emballe) ; elle finit de face, le cap n'a pas bougé
  const pr = MO.rideNew("roller", ...L(15, 9), 0.4);
  let pEnd = null, lvMax = 0;
  run(pr, 3, (s, t) => ({ trick: (t > 0.1 && t < 0.1 + 2 * DT) || (t > 0.45 && t < 0.45 + 2 * DT) || (t > 0.75 && t < 0.75 + 2 * DT) }),
    (s) => { if (s.piro) lvMax = Math.max(lvMax, s.piro.lv); if (s.piroEnd) { pEnd = s.piroEnd; return false; } });
  ok(pEnd && lvMax === 2 && Math.abs(pEnd.turns - Math.round(pEnd.turns)) < 1e-6 && pEnd.turns >= 3, "rollers au sol : V lance la pirouette, chaque V l'emballe, elle finit sur un tour entier", pEnd ? `${pEnd.turns} tours, niveau ${lvMax}` : "pas finie");
  ok(Math.abs(wrapA(pr.th - 0.4)) < 1e-9 && pr.mode === "ground", "et le cap n'a pas tourné (seul le dessin tourne)", `cap ${pr.th.toFixed(3)}`);
  ok(MO.piroAngle({ lv: 0, t: 0, a0: 0, dir: 1 }) === 0 && Math.abs(MO.piroAngle({ lv: 0, t: 9, a0: 0, dir: -1 }) + 2 * Math.PI) < 1e-9, "l'angle dessiné (celui que relit l'autre joueur) : 0 au départ, un tour entier à la fin", "");
  // le handplant au quarter : G tenu en montant, la main sur le coping une seconde, G lâché — on redescend sans tomber
  const hand = (u0, holdT) => {
    const st = MO.rideNew("roller", ...L(14, SP.QUARTER.toeV + 4), -Math.PI / 2); st.u = u0;
    let inHand = 0, maxT = 0, landed = null, bail = null, t0 = null;
    run(st, 5, (s, t) => {
      if (s.mode === "hand" && t0 == null) t0 = t;
      return { trick2: t0 == null ? true : t - t0 < holdT };
    }, (s) => { if (s.mode === "hand") { inHand++; maxT = Math.max(maxT, s.hand.T); } if (s.landed && t0 != null) { landed = s.landed; return false; } if (s.bailed) { bail = s.bailed; return false; } });
    return { inHand, maxT, landed, bail, z: st.z };
  };
  const hp = hand(6.8, 1.0);
  ok(hp.inHand > 0 && hp.maxT > 0.9, "rollers, G tenu en montant le quarter : la main sur le coping (handplant), tenue tant que G l'est", hp.inHand ? `${hp.maxT.toFixed(2)} s` : hp.bail ? "chute : " + hp.bail.why : "pas d'accroche");
  ok(hp.landed && !hp.bail && (hp.landed.tricks || []).includes("handplant"), "G lâché : on redescend dans la courbe et l'on retombe sur ses roues", hp.landed ? tag({ landed: hp.landed }) : hp.bail ? "chute : " + hp.bail.why : "—");
  const hp2 = hand(6.8, 9);
  ok(hp2.inHand && hp2.maxT <= 3.01 && hp2.landed && !hp2.bail, "tenu trop longtemps : on redescend tout seul au bout de 3 s", `${hp2.maxT.toFixed(2)} s, ${hp2.bail ? "chute" : "debout"}`);
  const hs = quarterRun("skate", { trick2: true });
  ok(!hs.bailed, "le skate, G tenu au quarter : pas de handplant (c'est aux rollers), sa figure ordinaire", hs.landed ? tag({ landed: hs.landed }) : String(hs.bailed && hs.bailed.why));
}

console.log(fail ? `\n${fail} CONTRÔLE(S) EN ÉCHEC` : `\n${nOk}/${nOk} — tout passe`);
process.exit(fail ? 1 : 0);
