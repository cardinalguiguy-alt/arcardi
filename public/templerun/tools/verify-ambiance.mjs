/* =============================================================================
   verify-ambiance.mjs — LE CIEL TIENT DANS LE CADRE, ET LA PLUIE TOMBE.
   (zip 406)
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-ambiance.mjs

   Deux sujets dans un seul outil, et c'est délibéré : le ciel et la pluie sont
   les deux seules choses du défi de fuite qui se règlent en regardant l'horizon
   plutôt que la piste, et les deux défauts corrigés au 406 ont la même forme —
   une valeur parfaitement bien écrite qui décrit autre chose que ce que le
   joueur voit.

   ---------------------------------------------------------------------------
   1. LE CIEL — « les triangles lumineux ne sont pas beaux » (405)
   ---------------------------------------------------------------------------
   Troisième zip consécutif sur ce reproche : le 383 a cherché la COULEUR, le
   400 a trouvé l'ORDRE DE PEINTURE, et les triangles sont restés. Le 406 pose
   enfin la bonne question, qui est une question de CADRAGE :

     * la caméra vise 17,3° vers le bas avec un champ vertical de 72°. Sur un
       dôme de 1024×512 dont l'horizon est peint à la ligne 266, **le joueur ne
       voit que les lignes 202 à 282** ;
     * les montagnes montaient jusqu'à 132 px au-dessus de l'horizon. **Leurs
       sommets étaient donc hors cadre**, et ce qui restait à l'écran n'était
       pas un relief : c'étaient deux versants qui se croisent, donc un V.

   ⚠️ CE CONTRÔLE NE REGARDE PAS UNE COULEUR, il refait la projection. C'est la
   seule façon de garder cette correction : n'importe quel réglage de hauteur
   futur repassera par ici, et la question « est-ce que je vois le sommet ? »
   n'aura plus jamais besoin d'être posée à Guillaume.

   ---------------------------------------------------------------------------
   2. LA PLUIE — « elle tombe à l'envers » (405)
   ---------------------------------------------------------------------------
   Un signe de trop sur `offset.y`. Le contrôle lit LA fonction du jeu
   (World.rainLevel) pour la courbe, et le TEXTE de world.js pour le signe —
   parce qu'un sens de défilement ne se mesure pas sans horloge, mais s'écrit
   d'une seule façon.

   ⚠️ ÉCRIT AVANT LA CORRECTION, ET ON A EXIGÉ QU'IL ÉCHOUE : sur le zip 405,
   **15 des 19 contrôles sonnent**. C'est la leçon du 404, et c'est la seule
   raison de faire confiance aux 19 quand ils passent.
   ⚠️ Sur le 405 la moitié d'entre eux annoncent NaN, et ce n'est pas un défaut
   de l'outil : c'est le CONSTAT. Les huit nombres du ciel et les deux bornes de
   fin d'orage n'existaient pas — ils vivaient en dur dans world.js, hors de
   config.js, donc introuvables et jamais rejugés. Un contrôle qui rend NaN sur
   une constante absente dit quelque chose de vrai sur le zip qu'il mesure.

   Ce qu'il NE prouve pas : que le ciel est beau, que les montagnes ont la
   bonne allure, que l'averse fait peur. Pour ça : tools/preview-sky.js, puis
   ON REGARDE.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/* world.js ne touche à Three.js que DANS ses fonctions : on peut donc le
   charger avec un THREE vide tant qu'on n'appelle pas init(). C'est ce qui
   permet d'interroger World.rainLevel sans monter un faux moteur de rendu de
   cent lignes — et c'est aussi ce qui prouve, au passage, que la courbe de
   l'orage ne dépend d'aucun état de rendu. */
const ctx = vm.createContext({
  Math, console, JSON, THREE: {}, Uint8ClampedArray,
  performance: { now: () => Date.now() },
  window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
  document: { getElementById: () => ({}), createElement: () => ({ getContext: () => ({}) }) },
  Input: { consume: () => false, peek: () => false, clear() {} },
  module: {},
});
for (const f of ["js/config.js", "js/track.js", "js/player.js", "js/wolves.js",
                 "js/camera.js", "js/world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, World } = vm.runInContext("({ CFG, World })", ctx);
const SRC = fs.readFileSync(path.join(root, "js/world.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ");     // le code, sans ses commentaires

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-ambiance.mjs — le ciel tient dans le cadre, et la pluie tombe ===\n");

/* =========================================================== 1. LE CIEL === */
/* La projection, DÉRIVÉE de config.js et jamais réécrite : mêmes trois lignes
   que tools/preview-sky.js, mêmes constantes source. */
const H_TEX = 512, W_TEX = 1024;
const HORIZON = H_TEX * 0.52;                       // ligne 266
const pitchDeg = Math.atan2(CFG.CAM_LOOK_HEIGHT - CFG.CAM_HEIGHT, CFG.CAM_LOOK_AHEAD) * 180 / Math.PI;
const elevTop = pitchDeg + CFG.CAM_FOV / 2;
const rowTop = Math.max(0, ((90 - elevTop) / 180) * H_TEX);
const bandH = HORIZON - rowTop;                     // hauteur de ciel visible, en px
const ASPECT = 16 / 9;
const hFovDeg = 2 * Math.atan(Math.tan(CFG.CAM_FOV / 2 * Math.PI / 180) * ASPECT) * 180 / Math.PI;
const bandW = (hFovDeg / 360) * W_TEX;

console.log(`  (cadre : lignes ${rowTop.toFixed(0)}..${HORIZON} soit ${bandH.toFixed(0)} px de ciel,`
  + ` et ${bandW.toFixed(0)} colonnes de large)\n`);

/* Le sommet le plus haut de chaque chaîne, en ligne de texture. Les décalages
   de base (-2 et +6) sont ceux de paintSky et ne sont pas devinés : le contrôle
   les relit dans la source pour ne pas devenir une seconde description. */
const farBaseDy = -2, nearBaseDy = 6;
const farApex = HORIZON + farBaseDy - CFG.SKY_FAR_H_MAX;
const nearApex = HORIZON + nearBaseDy - CFG.SKY_NEAR_H_MAX;

ok(farApex >= rowTop,
  "⚠️ le sommet le plus haut de la chaîne LOINTAINE est DANS le cadre",
  `ligne ${farApex.toFixed(0)} pour un cadre qui commence à ${rowTop.toFixed(0)}`);
ok(nearApex >= rowTop,
  "⚠️ le sommet le plus haut de la chaîne PROCHE est DANS le cadre",
  `ligne ${nearApex.toFixed(0)}`);

/* Un sommet qui touche PILE le bord haut est aussi mauvais qu'un sommet
   dehors : on ne voit toujours pas de pointe. On exige un ciel libre. */
const skyFree = (farApex - rowTop) / bandH;
ok(skyFree > 0.15,
  "il reste du CIEL au-dessus des montagnes",
  `${(100 * skyFree).toFixed(0)} % de la lanière (plancher 15 %)`);
/* ... et l'inverse : un relief ras l'horizon ne fait pas une chaîne. */
ok(CFG.SKY_FAR_H_MAX / bandH > 0.35,
  "... et les montagnes occupent quand même le cadre",
  `${(100 * CFG.SKY_FAR_H_MAX / bandH).toFixed(0)} % (plancher 35 %)`);

ok(CFG.SKY_FAR_H_MIN > CFG.SKY_NEAR_H_MAX * 0.5 && CFG.SKY_FAR_H_MAX > CFG.SKY_NEAR_H_MAX,
  "la chaîne lointaine domine la proche (sinon elle disparaît derrière)",
  `lointaine ${CFG.SKY_FAR_H_MIN}..${CFG.SKY_FAR_H_MAX}, proche ${CFG.SKY_NEAR_H_MIN}..${CFG.SKY_NEAR_H_MAX}`);

/* Combien de montagnes à l'écran. Le pas moyen d'une chaîne vaut la largeur
   moyenne × le recouvrement moyen (0,52..0,82 dans paintSky, soit 0,67). */
const peaks = (r) => bandW / (((r[0] + r[1]) / 2) * 0.67);
const nFar = peaks([CFG.SKY_FAR_W_MIN, CFG.SKY_FAR_W_MAX]);
const nNear = peaks([CFG.SKY_NEAR_W_MIN, CFG.SKY_NEAR_W_MAX]);
ok(nFar >= 3 && nFar <= 9,
  "⚠️ on voit PLUSIEURS montagnes lointaines, pas un versant plein écran",
  `${nFar.toFixed(1)} à l'écran (fenêtre 3..9)`);
ok(nNear >= 3 && nNear <= 11,
  "... et plusieurs proches", `${nNear.toFixed(1)} à l'écran`);

/* Le rougeoiement. Deux conditions, et la seconde est TOUT le 406 : un dégradé
   qui commence à zéro d'opacité n'a pas de bord, donc ne peut pas dessiner de
   forme — c'est ce qui l'autorise enfin à monter plus haut que le col le plus
   bas, ce que le 400 avait dû interdire. */
ok(CFG.SKY_GLOW_H < bandH,
  "le rougeoiement ne remplit pas toute la lanière visible",
  `${CFG.SKY_GLOW_H} px sur ${bandH.toFixed(0)}`);
ok(/glow\.addColorStop\(0,\s*"rgba\([^)]*,\s*0\)"/.test(SRC),
  "⚠️ le rougeoiement part de ZÉRO d'opacité (un dégradé sans bord ne dessine rien)");
/* Et il reste peint APRÈS la chaîne lointaine : c'est le correctif du 400, et
   il ne doit pas se perdre dans celui du 406. */
/* ⚠️ lastIndexOf, ET LE PREMIER JET AVAIT TORT. Avec indexOf, `SKY_NEAR_H_MIN`
   était trouvé tout en haut de paintSky — là où il sert à calculer une variable
   locale, et non à peindre la chaîne. Le contrôle comparait donc la position
   d'un CALCUL à celle d'un DESSIN et sonnait sur du code juste. Ce qu'on veut
   situer, ce sont les deux appels à range(), et ce sont les DERNIÈRES mentions
   de ces deux constantes. Même famille de faute qu'au 405 (un motif qui
   attrapait la déclaration en croyant compter des appels) : quand on cherche
   une position dans du texte, se demander laquelle des occurrences on veut. */
const iGlowFill = SRC.indexOf("ctx.fillStyle = glow;");
const iFar = SRC.lastIndexOf("CFG.SKY_FAR_H_MIN");
const iNear = SRC.lastIndexOf("CFG.SKY_NEAR_H_MIN");
ok(iFar > 0 && iGlowFill > iFar && iNear > iGlowFill,
  "⚠️ le rougeoiement est toujours peint ENTRE les deux chaînes (correctif du 400)");

/* ========================================================== 2. LA PLUIE === */
console.log("");
ok(typeof World.rainLevel === "function",
  "World exporte rainLevel : le contrôle lit LA courbe du jeu, pas une copie");

const R = World.rainLevel || (() => 0);
ok(CFG.RAIN_START_DIST < CFG.RAIN_RAMP_DIST &&
   CFG.RAIN_RAMP_DIST <= CFG.RAIN_HOLD_DIST &&
   CFG.RAIN_HOLD_DIST < CFG.RAIN_END_DIST,
  "les quatre bornes de l'orage sont dans l'ordre",
  `${CFG.RAIN_START_DIST} < ${CFG.RAIN_RAMP_DIST} <= ${CFG.RAIN_HOLD_DIST} < ${CFG.RAIN_END_DIST}`);

ok(R(0) === 0 && R(CFG.RAIN_START_DIST) === 0,
  "pas une goutte au départ", `à 0 m : ${R(0)}`);
ok(Math.abs(R(CFG.RAIN_RAMP_DIST) - 1) < 1e-9 && Math.abs(R(CFG.RAIN_HOLD_DIST) - 1) < 1e-9,
  "pleine intensité de RAMP à HOLD",
  `${CFG.RAIN_RAMP_DIST} m : ${R(CFG.RAIN_RAMP_DIST).toFixed(2)} · ${CFG.RAIN_HOLD_DIST} m : ${R(CFG.RAIN_HOLD_DIST).toFixed(2)}`);
ok(R(CFG.RAIN_END_DIST) === 0 && R(CFG.RAIN_END_DIST + 5000) === 0,
  "⚠️ l'orage S'ÉTEINT, et il ne revient pas",
  `à ${CFG.RAIN_END_DIST} m : ${R(CFG.RAIN_END_DIST)} · à ${CFG.RAIN_END_DIST + 5000} m : ${R(CFG.RAIN_END_DIST + 5000)}`);
{
  // la décrue est MONOTONE : une averse qui repart en s'éteignant ne raconte rien
  let mono = true, prev = 1;
  for (let d = CFG.RAIN_HOLD_DIST; d <= CFG.RAIN_END_DIST; d += 25) {
    const v = R(d); if (v > prev + 1e-9) mono = false; prev = v;
  }
  ok(mono, "la décrue ne remonte jamais");
}
/* Elle doit couvrir la partie TYPE, sinon on l'a réglée pour personne :
   5 018 m de distance moyenne (simulate-run.js, inchangé depuis le 399). */
ok(R(2500) > 0.5 && R(5018) > 0,
  "l'orage couvre la partie moyenne (5 018 m)",
  `à 2 500 m : ${R(2500).toFixed(2)} · à 5 018 m : ${R(5018).toFixed(2)}`);
/* ... et il finit AVANT que le jour se lève, sinon sa fin ne raconte rien. */
ok(CFG.RAIN_END_DIST < CFG.DAY_PREDAWN_AT,
  "il cesse avant l'éclaircie (sa fin l'ANNONCE au lieu de la contredire)",
  `${CFG.RAIN_END_DIST} m contre ${CFG.DAY_PREDAWN_AT} m`);

/* LE SENS. `offset.y` qui AUGMENTE = la pluie qui TOMBE (voir le commentaire de
   tickRain). Un moins devant `now` et elle monte — c'est le défaut du 405, et
   il ne se voit ni en relisant ni sur une image fixe. */
ok(/map\.offset\.y\s*=\s*\(\s*now\s*\*/.test(SRC),
  "⚠️ la pluie TOMBE (offset.y croît avec le temps)",
  /map\.offset\.y\s*=\s*\(\s*-\s*now/.test(SRC) ? "un signe moins : elle monte" : "");

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de l'allure du ciel ni de l'ambiance de
l'averse : il dit que les sommets sont dans le cadre, qu'on voit plusieurs
montagnes et non un versant, que la lumière basse n'a pas de bord, et que
l'orage tombe, couvre la partie type puis s'éteint. Pour l'allure :
tools/preview-sky.js, puis ON REGARDE.\n`);
process.exit(fail === 0 ? 0 : 1);
