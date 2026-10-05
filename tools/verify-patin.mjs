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
     §8  la cadence d'image ne change pas la trajectoire (60 contre 144 i/s).
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

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
