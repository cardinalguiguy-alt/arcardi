/* =============================================================================
   verify-patin.mjs — LE PATIN À GLACE SE JOUE-T-IL COMME UN PATIN ? (2026-10-04)
   -----------------------------------------------------------------------------
   Guillaume : « des patins dispos à l'achat pour monter sur le lac gelé » ; « si
   on monte sur la glace sans patins on glisse et se blesse ». `patin.js` est une
   machine d'état pure : ce banc la JOUE (pas de relecture de table), à 60 images
   par seconde comme le jeu, et mesure ce qu'un joueur sentirait.
     §1  la croisière : on l'atteint, on ne la dépasse jamais (course comprise) ;
     §2  la lancée : sans ordre, on file à peu près v/k cases avant de s'arrêter ;
     §3  le virage large : un ordre à angle droit COURBE la trajectoire, jamais un
         pivot sur place ;
     §4  l'arrêt en travers : un ordre à contresens freine sans faire repartir en
         arrière, et s'arrête dans la distance qu'annonce `BRAKE` ;
     §5  sans patins : la glissade ne se pilote presque pas, la chute vient à
         `SLIP_T`, le sol (`down`, la blessure) à `SLIP_T + FALL_T` ;
     §6  le choc contre la berge renvoie un peu, en sens inverse ;
     §7  la pose des autres se déduit (chaussés ou non, leur vitesse) ;
     §8  la cadence d'image ne change pas la trajectoire (60 contre 144 i/s) ;
     §9  le matériel ; §10 les figures ;
     §11 (2026-10-06) le FREINAGE BRUT (C tenue), la VRILLE QUI S'EMBALLE (V répété), leurs codes dans le paquet de position.
   Chaque contrôle a été falsifié le jour de son écriture (la note en face dit
   comment). Usage : node tools/verify-patin.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "patin-"));
fs.writeFileSync(path.join(tmp, "patin.js"), fs.readFileSync(path.join(ROOT, "components", "ferme", "patin.js"), "utf8"));
const PT = await import(pathToFileURL(path.join(tmp, "patin.js")).href);
const K = PT.SKATE;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
/* Jouer `secs` secondes à `hz` images par seconde, l'ordre (ix, iy) pouvant
   dépendre du temps ; rend l'état, la position et ce qu'on a observé. */
function play(st, secs, hz, order, o) {
  const dt = 1 / hz, obs = { x: 0, y: 0, vmax: 0, brake: 0, reversed: false };
  const v0x = st.vx, v0y = st.vy;
  for (let t = 0; t < secs - 1e-9; t += dt) {
    const [ix, iy] = order(t);
    PT.skateStep(st, ix, iy, dt, o || { skates: true });
    obs.x += st.vx * dt; obs.y += st.vy * dt;
    obs.vmax = Math.max(obs.vmax, Math.hypot(st.vx, st.vy));
    if (st.brake) obs.brake++;
    if (st.vx * v0x + st.vy * v0y < -1e-6) obs.reversed = true;
  }
  return obs;
}

section("§1 — la croisière");
{
  const st = PT.skateNew();
  const o = play(st, 4, 60, () => [1, 0]);
  // Falsifié : `VMAX` passé de 7,6 à 99 dans une copie → « jamais au-delà » rougit.
  ok("on atteint la croisière en moins de deux secondes", (() => { const s2 = PT.skateNew(); play(s2, 2, 60, () => [1, 0]); return Math.hypot(s2.vx, s2.vy) > K.VMAX * 0.97; })());
  ok("jamais au-delà de la croisière", o.vmax <= K.VMAX + 1e-9, `${o.vmax.toFixed(3)} ≤ ${K.VMAX}`);
  const sr = PT.skateNew();
  const orr = play(sr, 4, 60, () => [1, 0], { skates: true, run: true });
  ok("en poussant fort (course), la croisière monte sans déborder", orr.vmax > K.VMAX && orr.vmax <= K.VMAX_RUN + 1e-9, `${orr.vmax.toFixed(2)}`);
  ok("on va plus vite qu'on ne marche (5,2)", K.VMAX > 5.2);
}

section("§2 — la lancée");
{
  const st = PT.skateNew(K.VMAX, 0);
  const o = play(st, 20, 60, () => [0, 0]);
  const want = K.VMAX / K.GLIDE_K;
  // Falsifié : `GLIDE_K` à 0,28 (le premier chiffre) → 27 cases, le contrôle rougit.
  ok("depuis la croisière, on glisse à peu près v/k cases", Math.abs(o.x - want) / want < 0.12 && o.x < 12, `${o.x.toFixed(1)} cases (attendu ≈ ${want.toFixed(1)})`);
  ok("et l'on finit arrêté", st.vx === 0 && st.vy === 0);
}

section("§3 — le virage large");
{
  const st = PT.skateNew(K.VMAX, 0);
  const ang = (s) => Math.atan2(s.vy, s.vx) * 180 / Math.PI;
  play(st, 0.1, 60, () => [0, 1]);
  const a1 = ang(st);
  play(st, 0.9, 60, () => [0, 1]);
  const a2 = ang(st);
  // Falsifié : `TURN_K` à 200 → le cap a déjà tourné de ~80° en 0,1 s, le premier rougit.
  ok("un ordre à angle droit ne pivote pas sur place", a1 > 3 && a1 < 45, `${a1.toFixed(1)}° après 0,1 s`);
  ok("il courbe la trajectoire jusqu'au nouveau cap", a2 > 75, `${a2.toFixed(1)}° après 1 s`);
}

section("§4 — l'arrêt en travers");
{
  const st = PT.skateNew(K.VMAX, 0);
  const o = play(st, 2, 60, (t) => [-1, 0]);
  const want = (K.VMAX * K.VMAX - K.BRAKE_MIN_V * K.BRAKE_MIN_V) / (2 * K.BRAKE);
  // Falsifié : `BRAKE_DOT` à −2 (jamais atteint) → on repart en arrière, « sans repartir » rougit.
  /* ⚠️ La boucle s'arrête à la PREMIÈRE fois qu'on passe sous `BRAKE_MIN_V` : après,
     repartir de l'autre côté est voulu (dernier contrôle de la section). Premier jet :
     elle tournait deux secondes, et accusait le joueur qui repartait. */
  ok("on freine (gerbe), on ne repart pas en arrière tant qu'on glisse vite", o.brake > 0 && (() => { const s2 = PT.skateNew(K.VMAX, 0); let rev = false; for (let k = 0; k < 600 && Math.hypot(s2.vx, s2.vy) > K.BRAKE_MIN_V; k++) { PT.skateStep(s2, -1, 0, 1 / 60, { skates: true }); if (s2.vx < 0) rev = true; } return !rev; })());
  const s3 = PT.skateNew(K.VMAX, 0); let d = 0;
  while (Math.hypot(s3.vx, s3.vy) > K.BRAKE_MIN_V) { PT.skateStep(s3, -1, 0, 1 / 60, { skates: true }); d += s3.vx / 60; }
  ok("l'arrêt tient dans la distance qu'annonce BRAKE", Math.abs(d - want) < 0.35, `${d.toFixed(2)} cases (attendu ${want.toFixed(2)})`);
  ok("sous BRAKE_MIN_V, le même ordre fait repartir de l'autre côté", o.reversed);
}

section("§5 — sans patins : la glissade, la chute, le sol");
{
  const st = PT.skateNew(5.2, 0);                                         // on entre sur la glace en marchant
  let tFall = -1, tDown = -1, vAt = 0;
  for (let k = 0; k < 400; k++) {
    PT.skateStep(st, 0, 1, 1 / 60, { skates: false });                    // on essaie de tourner : en vain
    const t = (k + 1) / 60;
    if (st.mode === "fall" && tFall < 0) { tFall = t; vAt = Math.abs(st.vy); }
    if (st.mode === "down") { tDown = t; break; }
  }
  // Falsifié : `SLIP_ACC` à 9 → la vitesse transverse dépasse 2 case/s, le contrôle rougit.
  ok("la glissade ne se pilote presque pas", vAt < 1.2, `vitesse transverse ${vAt.toFixed(2)} case/s au moment de tomber`);
  ok("la chute vient à SLIP_T", Math.abs(tFall - K.SLIP_T) < 1.5 / 60, `${tFall.toFixed(3)} s`);
  ok("le sol (la blessure) à SLIP_T + FALL_T", Math.abs(tDown - (K.SLIP_T + K.FALL_T)) < 1.5 / 60, `${tDown.toFixed(3)} s`);
  ok("au sol, on ne bouge plus", st.vx === 0 && st.vy === 0);
  ok("la pose suit : slip, puis fall", PT.skatePose({ mode: "slip", vx: 1, vy: 0 }) === "slip" && PT.skatePose(st) === "fall");
}

section("§6 — le choc contre la berge");
{
  const st = PT.skateNew(6, 0);
  const v = PT.skateBump(st, "x");
  // Falsifié : `BOUNCE` à 1 → on rebondit à pleine vitesse, le contrôle rougit.
  ok("le choc renvoie un peu, en sens inverse", st.vx < 0 && Math.abs(st.vx) <= 6 * 0.3 && v === 6, `${st.vx.toFixed(2)}`);
  ok("un choc franc se signale (la gerbe)", st.bump > 0);
}

section("§7 — la pose des autres, déduite");
{
  ok("chaussé et lancé : il glisse", PT.skateSeen(true, 3, 0) === "glide");
  ok("chaussé et immobile : il se tient", PT.skateSeen(true, 0, 0) === "stand");
  ok("déchaussé et en mouvement : il mouline", PT.skateSeen(false, 2, 0) === "slip");
  ok("déchaussé et immobile sur la glace : il est tombé", PT.skateSeen(false, 0, 0) === "fall");
}

section("§8 — la cadence d'image ne change pas la trajectoire");
{
  const course = (t) => (t < 1.5 ? [1, 0] : t < 2.5 ? [0, 1] : t < 3.2 ? [-1, 0] : [0, 0]);
  const a = play(PT.skateNew(), 6, 60, course), b = play(PT.skateNew(), 6, 144, course);
  const gap = Math.hypot(a.x - b.x, a.y - b.y), len = Math.hypot(a.x, a.y);
  // Falsifié : une friction appliquée PAR IMAGE (`v *= 0.98`) au lieu de `exp(−k·dt)` → l'écart passe 10 %.
  ok("60 et 144 images par seconde finissent au même endroit", gap / len < 0.03, `écart ${gap.toFixed(2)} cases sur ${len.toFixed(1)}`);
}

section("§9 — le matériel : les longues lames, la combinaison, les couleurs (2026-10-05, fin quater)");
{
  const cruise = (kit, run) => { const st = PT.skateNew(); const o = play(st, 5, 60, () => [1, 0], { skates: true, run: !!run, stats: PT.skateKitStats(kit) }); return o.vmax; };
  const vC = cruise({ type: "classic" }), vR = cruise({ type: "race" }), vS = cruise({ type: "classic", suit: 1 }), vRS = cruise({ type: "race", suit: 1 });
  // Falsifié : `vmaxK` de la lame de course remis à 1 dans une copie → « les longues lames vont plus vite » rougit.
  ok("les longues lames vont un peu plus vite (+10 %)", vR > vC * 1.07 && vR < vC * 1.13, `${vC.toFixed(2)} → ${vR.toFixed(2)}`);
  ok("la combinaison seule gagne un peu (+5 %)", vS > vC * 1.03 && vS < vC * 1.07, `${vS.toFixed(2)}`);
  ok("les deux ensemble s'additionnent en se MULTIPLIANT", Math.abs(vRS / vC - 1.10 * 1.05) < 0.01, `×${(vRS / vC).toFixed(3)}`);
  ok("sans `stats`, rien ne change (le patin ordinaire d'avant)", Math.abs(cruise(undefined) - vC) < 1e-9);
  /* Le VIRAGE : à la croisière, un ordre à angle droit ; on mesure ce qu'il reste de vitesse une fois le cap pris (la
     composante dans le nouveau cap) après 0,8 s, et le cap atteint après 0,3 s (la tenue de trajectoire). */
  const turn = (kit) => {
    const st = PT.skateNew(PT.SKATE.VMAX, 0), o = { skates: true, stats: PT.skateKitStats(kit) };
    for (let t = 0; t < 0.3; t += 1 / 60) PT.skateStep(st, 0, 1, 1 / 60, o);
    const a3 = Math.atan2(st.vy, st.vx) * 180 / Math.PI;
    for (let t = 0; t < 0.5; t += 1 / 60) PT.skateStep(st, 0, 1, 1 / 60, o);
    return { ang: a3, keep: st.vy / (PT.SKATE.VMAX * PT.skateKitStats(kit).vmaxK) };
  };
  const tC = turn({ type: "classic" }), tR = turn({ type: "race" });
  // Falsifié : `carry` à 0 et `turnK` à 1 dans une copie → les deux grandeurs rejoignent celles du patin ordinaire.
  ok("les longues lames MORDENT mieux : le cap tourne plus vite", tR.ang > tC.ang + 5, `${tC.ang.toFixed(1)}° → ${tR.ang.toFixed(1)}° après 0,3 s`);
  ok("… et la vitesse tient mieux dans le virage", tR.keep > tC.keep + 0.05, `${(tC.keep * 100).toFixed(0)} % → ${(tR.keep * 100).toFixed(0)} % de la croisière après 0,8 s`);
  ok("jamais au-delà de la croisière du matériel (pas de vitesse fabriquée dans un virage)", (() => {
    const st = PT.skateNew(PT.SKATE.VMAX, 0), o = { skates: true, stats: PT.skateKitStats({ type: "race", suit: 1 }) }, cap = PT.SKATE.VMAX * 1.10 * 1.05;
    let m = 0; for (let t = 0; t < 6; t += 1 / 60) { const ang = t * 3; PT.skateStep(st, Math.cos(ang), Math.sin(ang), 1 / 60, o); m = Math.max(m, Math.hypot(st.vx, st.vy)); }
    return m <= cap + 1e-9;
  })());
  const g = (kit) => { const st = PT.skateNew(PT.SKATE.VMAX, 0); return play(st, 20, 60, () => [0, 0], { skates: true, stats: PT.skateKitStats(kit) }).x; };
  ok("la lancée est plus longue en longues lames", g({ type: "race" }) > g({ type: "classic" }) * 1.1, `${g({ type: "classic" }).toFixed(1)} → ${g({ type: "race" }).toFixed(1)} cases`);
  ok("un arrêt en travers demande un peu plus de glace en longues lames", (() => {
    // La distance jusqu'à `BRAKE_MIN_V` (au-dessous, le même ordre fait repartir de l'autre côté : on s'arrête là).
    const d = (kit) => { const st = PT.skateNew(PT.SKATE.VMAX, 0), o = { skates: true, stats: PT.skateKitStats(kit) }; let x = 0; for (let k = 0; k < 600 && Math.hypot(st.vx, st.vy) > PT.SKATE.BRAKE_MIN_V; k++) { PT.skateStep(st, -1, 0, 1 / 60, o); x += st.vx / 60; } return x; };
    return d({ type: "race" }) > d({ type: "classic" });
  })());
  ok("le prix : base + supplément de la paire + de la combinaison", PT.skateKitPrice({ type: "classic" }, 60) === 60 && PT.skateKitPrice({ type: "race", suit: 1 }, 60) === 60 + PT.SKATE_KITS.race.extra + PT.SKATE_SUIT.extra);
  ok("un matériel invalide est ramené au patin ordinaire blanc", (() => { const n = PT.skateKitNorm({ type: "x", suit: "oui", color: 99 }); return n.type === "classic" && n.suit === 1 && n.color === 0; })()
    && (() => { const n = PT.skateKitNorm(null); return n.type === "classic" && n.suit === 0 && n.color === 0; })());
  ok("huit couleurs, chacune avec bottine (clair, moyen, ombre) et combinaison", PT.SKATE_COLORS.length === 8 && PT.SKATE_COLORS.every((c) => c.main && c.hi && c.lo && c.suit));
}

section("§10 — les figures de la pratique libre : saut, vrille, axel, marche arrière, cygne");
{
  const o = { skates: true };
  // Un saut : un arc (la hauteur monte puis redescend), de la durée annoncée, qui ne s'écoute pas pendant le vol.
  const st = PT.skateNew(5, 0);
  ok("un saut part chaussé, en glisse", PT.skateTrickStart(st, "hop", o));
  ok("… et pas deux à la fois", !PT.skateTrickStart(st, "hop", o) && !PT.skateTrickStart(st, "spin", o));
  let peak = 0, peakAt = 0, steps = 0, landedAt = -1, tt = 0;
  const vx0 = st.vx;
  while (steps < 200 && landedAt < 0) { PT.skateStep(st, 0, 1, 1 / 60, o); tt += 1 / 60; if (st.air > peak) { peak = st.air; peakAt = tt; } if (st.landed) landedAt = tt; steps++; }
  // Falsifié : la hauteur passée à `tk.h * u` dans une copie → le sommet n'est plus au milieu, plus de retour à 0.
  ok("l'arc monte au sommet annoncé", Math.abs(peak - PT.TRICK.HOP.H) < 0.6, `${peak.toFixed(1)} px (attendu ${PT.TRICK.HOP.H})`);
  ok("le sommet est au MILIEU du vol (un arc, pas une rampe)", Math.abs(peakAt - PT.TRICK.HOP.T / 2) < 0.05, `${peakAt.toFixed(3)} s sur ${PT.TRICK.HOP.T}`);
  ok("il atterrit à la durée annoncée, en rendant `landed` UN pas", Math.abs(landedAt - PT.TRICK.HOP.T) < 0.03 && st.landed === "hop" && (() => { PT.skateStep(st, 0, 0, 1 / 60, o); return st.landed === null; })(), `${landedAt.toFixed(3)} s`);
  ok("en l'air, l'ordre n'est pas écouté (la trajectoire reste droite : pas de virage)", Math.abs(st.vy) < 1e-9 && st.vx > 0 && st.vx < vx0, `vx ${vx0} → ${st.vx.toFixed(2)}`);
  ok("au sol, retour à zéro (air, tours)", st.air === 0 && st.spin === 0 && st.trick === null);
  // La vrille : tours rendus, jamais en l'air, freine un peu.
  const sp = PT.skateNew(4, 0); PT.skateTrickStart(sp, "spin", o);
  let maxAir = 0, spin = 0; for (let k = 0; k < 40; k++) { PT.skateStep(sp, 0, 0, 1 / 60, o); maxAir = Math.max(maxAir, sp.air); spin = Math.max(spin, sp.spin); }
  ok("la vrille tourne d'un tour sans quitter la glace", maxAir === 0 && spin > 0.5 && spin <= PT.TRICK.SPIN.TURNS + 1e-9, `${spin.toFixed(2)} tour(s) à mi-parcours`);
  const sp2 = PT.skateNew(4, 0); PT.skateTrickStart(sp2, "spin", o);
  let sLast = 0, sLand = null; for (let k = 0; k < 60; k++) { if (sp2.trick) sLast = sp2.spin; PT.skateStep(sp2, 0, 0, 1 / 60, o); if (sp2.landed) sLand = sp2.landed; }
  ok("elle finit à un tour entier, puis rend `landed` : \"spin\"", sLast > PT.TRICK.SPIN.TURNS * 0.95 && sLand === "spin" && sp2.trick === null, `${sLast.toFixed(3)} tour`);
  // L'axel : il faut de l'élan.
  ok("un axel exige de l'élan", !PT.skateTrickStart(PT.skateNew(0.5, 0), "axel", o) && PT.skateTrickStart(PT.skateNew(PT.TRICK.AXEL_MIN_V + 0.5, 0), "axel", o));
  const ax = PT.skateNew(5, 0); PT.skateTrickStart(ax, "axel", o);
  let axPeak = 0, axSpin = 0; for (let k = 0; k < 40; k++) { PT.skateStep(ax, 0, 0, 1 / 60, o); axPeak = Math.max(axPeak, ax.air); axSpin = Math.max(axSpin, ax.spin); }
  ok("l'axel est un saut ET une vrille", axPeak > PT.TRICK.AXEL.H * 0.6 && axSpin > 0.5, `${axPeak.toFixed(1)} px, ${axSpin.toFixed(2)} tour`);
  // La spin finale : exactement `turns`.
  ok("les tours montent sans jamais redescendre (la courbe est monotone)", (() => {
    const s9 = PT.skateNew(5, 0); PT.skateTrickStart(s9, "axel", o); let prev = -1, okk = true;
    for (let k = 0; k < 120 && s9.trick; k++) { PT.skateStep(s9, 0, 0, 1 / 60, o); if (s9.trick && s9.spin < prev - 1e-9) okk = false; prev = s9.spin; }
    return okk;
  })());
  // Pas sans patins, pas tombé, pas en course (`free: false`).
  ok("pas de figure sans patins", !PT.skateTrickStart(PT.skateNew(5, 0), "hop", { skates: false }));
  ok("pas de figure en course (`free: false`)", !PT.skateTrickStart(PT.skateNew(5, 0), "hop", { skates: true, free: false }));
  ok("pas de figure à terre (une culbute)", (() => { const s3 = PT.skateNew(5, 0); PT.skateTumble(s3); return !PT.skateTrickStart(s3, "hop", o); })());
  ok("une culbute en plein saut le coupe net", (() => { const s3 = PT.skateNew(5, 0); PT.skateTrickStart(s3, "hop", o); PT.skateStep(s3, 0, 0, 0.2, o); PT.skateTumble(s3); return s3.trick === null && s3.air === 0; })());
  // L'enchaînement : deux figures rapprochées comptent, une pause le remet à zéro.
  const ch = PT.skateNew(5, 0); PT.skateTrickStart(ch, "hop", o);
  for (let k = 0; k < 50; k++) PT.skateStep(ch, 0, 0, 1 / 60, o);
  PT.skateTrickStart(ch, "spin", o);
  ok("deux figures rapprochées font un enchaînement de deux", ch.chain === 2, `chain=${ch.chain}`);
  for (let k = 0; k < 60 * 6; k++) PT.skateStep(ch, 0, 0, 1 / 60, o);
  ok("six secondes de pause remettent l'enchaînement à zéro", ch.chain === 0);
  // La marche arrière : croisière plafonnée.
  const bk = PT.skateNew(); const ob = play(bk, 4, 60, () => [1, 0], { skates: true, back: true });
  ok("à reculons, la croisière est plafonnée", ob.vmax <= PT.SKATE.VMAX * PT.TRICK.BACK_K + 1e-9 && ob.vmax > PT.SKATE.VMAX * PT.TRICK.BACK_K * 0.95, `${ob.vmax.toFixed(2)} ≤ ${(PT.SKATE.VMAX * PT.TRICK.BACK_K).toFixed(2)}`);
  ok("… et la machine le dit (`back`)", bk.back === true && PT.skateTrickView(bk).kind === "back");
  // Le cygne : en roue libre, vite.
  const sw = PT.skateNew(6, 0); for (let k = 0; k < 40; k++) PT.skateStep(sw, 0, 0, 1 / 60, o);
  ok("en roue libre et vite, une jambe se lève (cygne)", PT.skatePose(sw) === "swan" && PT.skateTrickCode(sw) === PT.TRICK_CODE.swan);
  const sw2 = PT.skateNew(6, 0); for (let k = 0; k < 40; k++) PT.skateStep(sw2, 1, 0, 1 / 60, o);
  ok("en poussant, jamais de cygne", PT.skatePose(sw2) !== "swan");
  // Les autres voient les figures par leur code.
  ok("les autres voient la figure par son code (rien d'autre ne circule)", PT.skateSeen(true, 3, 0, PT.TRICK_CODE.axel) === "axel" && PT.skateSeen(true, 3, 0, 0) === "glide" && PT.skateSeen(false, 3, 0, PT.TRICK_CODE.axel) === "slip");
  ok("la cadence d'image ne change pas un saut (60 contre 144)", (() => {
    const run = (hz) => { const s5 = PT.skateNew(5, 0); PT.skateTrickStart(s5, "axel", o); let x = 0; for (let t = 0; t < 1.2; t += 1 / hz) { PT.skateStep(s5, 0, 0, 1 / hz, o); x += s5.vx / hz; } return x; };
    return Math.abs(run(60) - run(144)) < 0.1;
  })());
}

section("§11 — le freinage brut et la vrille emballée (2026-10-06)");
{
  const o = { skates: true, free: true };
  // LE FREINAGE BRUT : C tenue, plus fort que le freinage à contresens, aucun ordre écouté, la machine le dit.
  const cruise = () => { const st = PT.skateNew(); play(st, 4, 60, () => [1, 0], o); return st; };
  const hb = cruise(), v0 = Math.hypot(hb.vx, hb.vy);
  let t = 0, dist = 0, sawHard = false, sawPush = false;
  while (Math.hypot(hb.vx, hb.vy) > 0.05 && t < 4) { PT.skateStep(hb, 1, 0, 1 / 60, { ...o, stop: true }); dist += Math.hypot(hb.vx, hb.vy) / 60; t += 1 / 60; sawHard = sawHard || hb.hard; sawPush = sawPush || hb.push === 1; }
  const cb = cruise(); let t2 = 0, dist2 = 0;
  while (Math.hypot(cb.vx, cb.vy) > 0.05 && t2 < 4) { PT.skateStep(cb, -1, 0, 1 / 60, o); dist2 += Math.hypot(cb.vx, cb.vy) / 60; t2 += 1 / 60; }
  ok("C tenue : on s'arrête, vite (de la croisière à l'arrêt en moins d'une seconde)", t < 1 && Math.hypot(hb.vx, hb.vy) <= 0.05, `${v0.toFixed(1)} → 0 en ${t.toFixed(2)} s, ${dist.toFixed(2)} cases`);
  ok("… plus court que le freinage à contresens (même vitesse d'entrée)", t < t2 && dist < dist2, `${t.toFixed(2)} s / ${dist.toFixed(2)} cases contre ${t2.toFixed(2)} s / ${dist2.toFixed(2)} cases`);
  ok("… sans jamais repartir en arrière ni pousser, même avec un ordre en avant", hb.vx >= -1e-9 && !sawPush);
  ok("… et la machine dit `hard` (la grande gerbe) tant qu'on va vite", sawHard);
  const sl = PT.skateNew(0.9, 0); PT.skateStep(sl, 0, 0, 1 / 60, { ...o, stop: true });
  ok("à très basse vitesse, le frein s'achève sans gerbe (`hard` faux sous STOP_MIN_V)", sl.hard === false);
  ok("sans patins, C ne freine rien (on ne contrôle plus rien)", (() => { const s6 = PT.skateNew(5, 0); PT.skateStep(s6, 0, 0, 1 / 60, { skates: false, stop: true }); return s6.mode === "slip" && s6.hard === false; })());
  ok("le code du paquet de position dit `stop` (les autres voient la gerbe)", PT.skateTrickCode(hb) === 0 && (() => { const s7 = cruise(); PT.skateStep(s7, 0, 0, 1 / 60, { ...o, stop: true }); return PT.skateTrickCode(s7) === PT.TRICK_CODE.stop && PT.skateSeen(true, s7.vx, s7.vy, PT.TRICK_CODE.stop) === "brake"; })());
  ok("le brut est le plus fort des freins (brakeK des longues lames compris)", PT.TRICK.STOP_BRAKE > PT.SKATE.BRAKE);

  // LA VRILLE QUI S'EMBALLE : chaque V pendant la vrille passe au niveau suivant, depuis le tour où l'on est.
  const spinRun = (pressAt) => {
    const st = PT.skateNew(5, 0); PT.skateTrickStart(st, "spin", o);
    let t3 = 0, maxSpin = 0, jump = 0, prev = 0, lv = 0, ended = null, endSpin = 0, boosts = 0;
    for (let k = 0; k < 60 * 3 && !ended; k++) {
      if (pressAt.some((p) => Math.abs(p - t3) < 1 / 120) && PT.skateTrickBoost(st)) boosts++;
      PT.skateStep(st, 0, 0, 1 / 60, o); t3 += 1 / 60;
      if (st.trick) { jump = Math.max(jump, Math.abs(st.spin - prev)); prev = st.spin; maxSpin = Math.max(maxSpin, st.spin); lv = st.trick.lv; endSpin = st.spin; }
      else ended = { t: t3, turns: st.landedTurns, lv: st.landedLv };
    }
    return { t: ended ? ended.t : 99, turns: ended ? ended.turns : 0, lv: ended ? ended.lv : lv, jump, boosts, maxSpin, endSpin };
  };
  const base = spinRun([]), dbl = spinRun([0.2]), many = spinRun([0.15, 0.3, 0.45]);
  ok("une vrille seule : un tour, 0,74 s (comme avant)", base.turns === 1 && Math.abs(base.t - PT.TRICK.SPIN.T) < 0.04 && base.lv === 0, `${base.turns} tour(s) en ${base.t.toFixed(2)} s`);
  ok("deux V rapprochés : plus de tours, et un angle qui ne saute JAMAIS (continuité)", dbl.boosts === 1 && dbl.turns >= 2 && dbl.jump < 0.12, `${dbl.turns} tours, saut max ${dbl.jump.toFixed(3)} tour/image`);
  ok("V répété : de plus en plus vite (tours par seconde croissants, trois niveaux de plus au plus)", many.boosts === 3 && many.turns > dbl.turns && many.turns / many.t > dbl.turns / dbl.t && dbl.turns / dbl.t > base.turns / base.t, `base ${(base.turns / base.t).toFixed(1)} < double ${(dbl.turns / dbl.t).toFixed(1)} < rafale ${(many.turns / many.t).toFixed(1)} tours/s`);
  ok("une vrille retombe toujours sur un tour ENTIER (on retombe de face)", [base, dbl, many].every((r) => Number.isInteger(r.turns)) && [dbl, many].every((r) => Math.abs(r.endSpin - Math.round(r.endSpin)) < 0.2), `fins : ${base.turns}, ${dbl.turns}, ${many.turns}`);
  ok("au-delà du dernier niveau, un V de plus ne fait plus rien", (() => { const r = spinRun([0.1, 0.2, 0.3, 0.4, 0.5]); return r.boosts === 3 && r.lv === 3; })());
  ok("des V pressés AVANT le départ de la vrille (`force`) la font partir déjà emballée, jusqu'au dernier niveau", (() => { const st = PT.skateNew(5, 0); PT.skateTrickStart(st, "spin", o); const a = PT.skateTrickBoost(st, true), b = PT.skateTrickBoost(st, true), c = PT.skateTrickBoost(st, true), d = PT.skateTrickBoost(st, true); return a && b && c && !d && st.trick.lv === 3; })());
  ok("un V dans la même image que le départ de la vrille (rebond de touche) n'emballe pas", (() => { const st = PT.skateNew(5, 0); PT.skateTrickStart(st, "spin", o); return PT.skateTrickBoost(st) === false; })());
  ok("ni le saut ni l'axel ne s'emballent", (() => { const a = PT.skateNew(5, 0); PT.skateTrickStart(a, "axel", o); PT.skateStep(a, 0, 0, 0.2, o); const h = PT.skateNew(5, 0); PT.skateTrickStart(h, "hop", o); PT.skateStep(h, 0, 0, 0.2, o); return !PT.skateTrickBoost(a) && !PT.skateTrickBoost(h); })());
  // Les autres : le niveau voyage dans le code, la même courbe se relit.
  ok("le niveau d'une vrille voyage dans le code (spin, spin1, spin2, spin3), et se relit", (() => {
    const names = [0, 1, 2, 3].map((l) => (l ? "spin" + l : "spin"));
    return names.every((nm, l) => PT.TRICK_CODE[nm] > 0 && PT.TRICK_NAMES[PT.TRICK_CODE[nm]] === nm && PT.skateTrickBase(nm).kind === "spin" && PT.skateTrickBase(nm).lv === l && PT.skateSeen(true, 3, 0, PT.TRICK_CODE[nm]) === "spin");
  })());
  ok("les durées des niveaux décroissent, les tours gagnés croissent", PT.TRICK.SPIN_LV.every((l, i, a) => i === 0 || (l.T < a[i - 1].T && l.G > a[i - 1].G)));
  ok("la courbe relue par les autres (même niveau, même départ) finit sur un tour entier aussi", [0, 0.37, 1.6].every((a0) => [0, 1, 2, 3].every((lv) => Math.abs(a0 + PT.skateTrickAt("spin", 1, lv, a0).spin - Math.round(a0 + PT.skateTrickAt("spin", 1, lv, a0).spin)) < 1e-9)));
  // 2026-10-06 — « elle ne devrait pas s'arrêter d'un coup » : la rotation retombe à zéro à l'arrivée, sans jamais reculer.
  const dSpin = (lv, a0, k) => { const e = 1e-4; return (PT.skateTrickAt("spin", Math.min(1, k + e), lv, a0).spin - PT.skateTrickAt("spin", k, lv, a0).spin) / (PT.skateTrickAt("spin", 1, lv, a0).dur * e); };
  ok("la rotation ralentit jusqu'à l'arrêt : vitesse d'arrivée ≈ 0 (< 3 % de la moyenne), à chaque niveau", [0, 1, 2, 3].every((lv) => {
    const tot = PT.skateTrickAt("spin", 1, lv, 0).spin, mean = tot / PT.skateTrickAt("spin", 1, lv, 0).dur;
    return Math.abs(dSpin(lv, 0, 0.9999 - 1e-4)) < 0.03 * mean;
  }));
  ok("la vrille ne recule jamais (angle croissant sur toute sa durée) et le dernier quart ralentit franchement", [0, 1, 2, 3].every((lv) => {
    let last = -1, mono = true; for (let i = 0; i <= 200; i++) { const a = PT.skateTrickAt("spin", i / 200, lv, 0).spin; if (a < last - 1e-12) mono = false; last = a; }
    return mono && dSpin(lv, 0, 0.875) < 0.7 * dSpin(lv, 0, 0.3);
  }));
  ok("au raccord d'un V de plus (à 15, 30, 50, 70 % du segment), la rotation ne retombe pas de plus de 10 % — chaîne réelle lv0→lv3, angle repris", [0.15, 0.3, 0.5, 0.7].every((kb) => {
    let a0 = 0, worst = 9;
    for (let lv = 0; lv < 3; lv++) {
      const before = dSpin(lv, a0, kb), seg = PT.skateTrickAt("spin", 1, lv, a0).spin, a1 = a0 + PT.skateTrickAt("spin", kb, lv, a0).spin - 0;
      const after = dSpin(lv + 1, a1, 0);
      worst = Math.min(worst, after / before); a0 = a1;
    }
    return worst >= 0.9;
  }));
  ok("le départ n'est pas figé : la vrille démarre déjà en rotation", dSpin(0, 0, 0) > 0.5 * PT.skateTrickAt("spin", 1, 0, 0).spin / PT.skateTrickAt("spin", 1, 0, 0).dur);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
