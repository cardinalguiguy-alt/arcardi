/* =============================================================================
   verify-luge.mjs — LA DESCENTE EST DESCENDABLE. DE BOUT EN BOUT.
   -----------------------------------------------------------------------------
       node public/candyluge/tools/verify-luge.mjs

   ⚠️ CE SCRIPT EXISTE À CAUSE D'UNE PHRASE : « le niveau 5 est impossible ».
   C'est le reproche fait à l'autre mini-jeu du Pays des Bonbons, et c'est le
   pire qu'on puisse recevoir — il ne dit pas qu'un réglage est mauvais, il dit
   qu'on a livré sans savoir. On ne veut pas l'entendre une seconde fois sur la
   descente, et on ne compte pas sur des essais pour l'éviter : ici, la
   jouabilité est MESURÉE, sur toute la piste, à toutes les difficultés.

   QUATRE FAMILLES DE CONTRÔLES :

     1. LA PISTE. Elle descend toujours (une luge n'a pas de moteur), elle ne
        tourne jamais plus vite que la luge ne peut s'orienter, elle n'est
        jamais plus étroite que ce qu'il faut pour manœuvrer.

     2. LES VAGUES DE GOURMANDS. Pour CHAQUE vague de la descente et pour
        CHAQUE instant de son oscillation, il reste un passage libre d'au moins
        CRITTER_GAP_MIN. Ce n'est pas un sondage : les positions sont des
        sinus, on les balaie sur une période entière.

     3. LA PHYSIQUE. On fait descendre la vraie luge, avec le vrai sled.js,
        sans navigateur : elle doit arriver en bas, ne jamais rester bloquée,
        et rester dans une fourchette de vitesse lisible.

     4. UN PILOTE AUTOMATIQUE. Un joueur médiocre — qui vise le trou avec un
        temps de réaction et une main tremblante — doit finir la descente.
        ⚠️ C'EST LE CONTRÔLE QUI COMPTE VRAIMENT : les trois premiers vérifient
        des propriétés, celui-ci vérifie qu'elles suffisent.

   CE QU'IL NE DIT PAS : si c'est amusant, si c'est beau, si la difficulté est
   bien dosée. Pour le beau, tools/preview-luge.js et ON REGARDE. Pour
   l'amusant, il faut jouer — aucun script ne remplacera ça.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-luge — la descente est descendable, de bout en bout ===\n");

/* Le banc : config, piste, luge et gourmands, sans navigateur ni décor. C'est
   possible parce que sled.js ne connaît que la pente et les touches — s'il
   avait eu besoin de la scène pour avancer, rien de tout ceci ne serait
   mesurable. */
let steer = 0, slideKey = false, jumpKey = false;
const ctx = vm.createContext({
  Math, console, JSON, Array,
  Input: {
    axis: () => steer,
    sliding: () => slideKey,
    jumpPressed: () => { const j = jumpKey; jumpKey = false; return j; },
    clear() {},
  },
});
for (const f of ["js/config.js", "js/slope.js", "js/sled.js", "js/critters.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, Slope, Sled, Critters } = vm.runInContext("({ CFG, Slope, Sled, Critters })", ctx);

/* ============================================================ 1. LA PISTE == */
let minPitch = 9, maxPitch = 0, maxCurve = 0, minWidth = 999, maxBank = 0;
for (let s = 0; s <= CFG.DESCENT_LENGTH; s += 2) {
  const p = Slope.pitchAt(s);
  minPitch = Math.min(minPitch, p); maxPitch = Math.max(maxPitch, p);
  maxCurve = Math.max(maxCurve, Math.abs(Slope.curveAt(s)));
  minWidth = Math.min(minWidth, Slope.widthAt(s));
  maxBank = Math.max(maxBank, Math.abs(Slope.bankAt(s)));
}
ok(minPitch > 0.02, "⚠️ la piste DESCEND partout — une luge n'a pas de moteur, un plat la clouerait",
  `pente minimale ${(minPitch * 180 / Math.PI).toFixed(1)}°`);
ok(maxPitch <= CFG.SLOPE_PITCH_MAX + 1e-9, "... et jamais plus raide que le plafond",
  `${(maxPitch * 180 / Math.PI).toFixed(1)}° pour un plafond de ${(CFG.SLOPE_PITCH_MAX * 180 / Math.PI).toFixed(1)}°`);

/* ⚠️ LE CONTRÔLE DE VIRAGE — RÉÉCRIT AU 413, ET C'EST LE PLUS IMPORTANT DE
   CETTE SECTION. La conduite n'est plus une orientation qu'on impose mais un
   ARC qu'une carre décrit dans une limite d'adhérence. Il y a donc DEUX
   conditions à vérifier, et elles sont indépendantes :

     A. LA CARRE DOIT POUVOIR SUIVRE LE TRACÉ. Dans un virage de courbure `c`
        pris à `v`, la piste tourne de c·v rad/s. Une carre pleine fournit
        CARVE_K·v/(v+V0). Si la première dépasse la seconde, la luge sort du
        virage quoi que fasse le joueur.

     B. LE TRACÉ SEUL NE DOIT PAS DÉJÀ SATURER L'ADHÉRENCE. La courbure de la
        piste impose une accélération latérale c·v²·0,55 AVANT toute action du
        joueur. Si elle mange déjà GRIP_MAX, la luge dérape en permanence dans
        le virage sans avoir rien demandé — et un joueur qui dérape sans avoir
        touché à rien ne comprend pas ce qui lui arrive. */
const vMax = CFG.SLED_SPEED_MAX;
const carveSupply = CFG.CARVE_K * vMax / (vMax + CFG.CARVE_V0);
const trackDemand = maxCurve * vMax;
ok(trackDemand < carveSupply * 0.75,
  "⚠️ (A) une carre pleine suit le virage le plus serré À PLEINE VITESSE, avec 25 % de marge",
  `la piste demande ${trackDemand.toFixed(2)} rad/s, la carre en fournit ${carveSupply.toFixed(2)}`);
const trackLat = maxCurve * vMax * vMax * 0.55;
ok(trackLat < CFG.GRIP_MAX * 0.7,
  "⚠️ (B) le tracé seul ne sature pas l'adhérence : on ne dérape jamais sans l'avoir demandé",
  `${trackLat.toFixed(1)} u/s² pour ${CFG.GRIP_MAX} disponibles`);

ok(minWidth > CFG.CRITTER_GAP_MIN + 2 * CFG.SLED_HALF_W + 2 * CFG.FENCE_MARGIN,
  "⚠️ même au plus étroit, la piste contient le passage garanti ET la luge",
  `${minWidth.toFixed(1)} u de large pour ${(CFG.CRITTER_GAP_MIN + 2 * CFG.SLED_HALF_W + 2 * CFG.FENCE_MARGIN).toFixed(1)} nécessaires`);
ok(maxBank <= CFG.SLOPE_BANK_MAX + 1e-9 && maxBank < 0.35,
  "le dévers reste sous le seuil où la piste se lit comme un mur",
  `${(maxBank * 180 / Math.PI).toFixed(1)}°`);

/* ================================================== 2. LES VAGUES ========= */
const nWaves = Critters.waveCount();
let worstGap = Infinity, worstWave = -1, overSpeed = 0, outOfTrack = 0;
for (let w = 0; w < nWaves; w++) {
  const wave = Critters.buildWave(w);
  if (!wave.length) continue;
  const s = wave[0].s, W = Slope.widthAt(s);
  for (const c of wave) {
    if (c.amp * c.omega > CFG.CRITTER_SPEED_MAX + 1e-6) overSpeed++;
    // Les BORNES de son oscillation, pas sa position à un instant : c'est la
    // bande entière qui doit tenir dans la piste.
    if (Math.abs(c.c0) + c.amp + CFG.CRITTER_RADIUS > W / 2 + 0.01) outOfTrack++;
  }
  /* Le balayage : 120 instants sur une période complète de la plus lente des
     oscillations. Les positions sont des sinus, donc 120 points suffisent
     largement à en attraper le pire cas. */
  const slowest = Math.min(...wave.map((c) => c.omega || 1));
  const T = (Math.PI * 2) / Math.max(0.05, slowest);
  for (let k = 0; k < 120; k++) {
    const t = (k / 120) * T;
    const spans = wave.map((c) => {
      const u = c.c0 + (c.amp ? Math.sin(t * c.omega + c.phase) * c.amp : 0);
      return [u - CFG.CRITTER_RADIUS - CFG.SLED_HALF_W, u + CFG.CRITTER_RADIUS + CFG.SLED_HALF_W];
    }).sort((a, b) => a[0] - b[0]);
    /* ⚠️ LE TROU EST MESURÉ DANS LA BANDE RÉELLEMENT TENABLE, pas entre les
       barrières. Le centre de la luge ne peut pas dépasser
       W/2 − demi-largeur − marge : au-delà, elle est déclarée hors piste. Un
       trou qui n'existerait que dans les deux mètres interdits est un trou
       qui n'existe pas — et c'est exactement le piège dans lequel le pilote
       automatique est tombé au premier passage de ce script. */
    const band = W / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN;
    let gap = 0, cursor = -band;
    for (const [a, b] of spans) {
      gap = Math.max(gap, Math.min(b, band) - cursor > 0 ? a - cursor : 0);
      cursor = Math.max(cursor, b);
    }
    gap = Math.max(gap, band - cursor);
    if (gap < worstGap) { worstGap = gap; worstWave = w; }
  }
}
ok(nWaves > 20, "la descente contient assez de vagues pour être un jeu", `${nWaves} vagues`);
ok(overSpeed === 0, "⚠️ aucun gourmand ne dépasse le plafond de vitesse latérale",
  `${overSpeed} en faute`);
ok(outOfTrack === 0, "⚠️ aucun gourmand ne peut sortir de sa bande, donc de la piste",
  `${outOfTrack} en faute`);
ok(worstGap >= 2 * CFG.SLED_HALF_W,
  "⚠️⚠️ IL RESTE TOUJOURS UN PASSAGE POUR LA LUGE — sur les "
  + nWaves + " vagues et toute leur oscillation",
  `pire trou ${worstGap.toFixed(1)} u (vague ${worstWave}) pour une luge de ${(2 * CFG.SLED_HALF_W).toFixed(1)} u`);
ok(worstGap >= 4.5,
  "... et il reste MANŒUVRABLE, pas seulement franchissable au millimètre",
  `${worstGap.toFixed(1)} u`);

/* ================================================== 3. LA PHYSIQUE ======== */
function simulate(pilot, seedSteer) {
  const slope = new Slope.SlopeGen();
  const sled = new Sled();
  const field = new Critters.Field();
  const dt = 1 / 60;
  let t = 0, vMin = 999, vTop = 0, stuck = 0;
  /* ⚠️ PLAFOND RELEVÉ À 900 s AU 414, ET CE N'ÉTAIT PAS UN DÉTAIL. À 400 s, LES
     DEUX PILOTES L'ATTEIGNAIENT et le script annonçait « 400 s contre 400 s » :
     il ne comparait plus deux descentes, il comparait deux fois sa propre
     limite. Un plafond de simulation trop bas ne produit pas une mesure
     prudente, il produit une mesure FAUSSE — et qui a l'air d'une égalité. */
  while (t < 900 && sled.alive && !(sled.finished && sled.v < 3)) {
    steer = pilot ? pilot(sled, field, t) : seedSteer;
    sled.update(dt, t * 1000, slope.finishK(sled.s));
    field.update(dt, t * 1000, sled);
    if (sled.s < CFG.DESCENT_LENGTH - CFG.FINISH_FADE) {
      vMin = Math.min(vMin, sled.v); vTop = Math.max(vTop, sled.v);
      if (sled.v < 6) stuck++;
    }
    t += dt;
  }
  return { sled, t, vMin, vTop, stuck, done: sled.finished };
}

const straight = simulate(null, 0);
ok(straight.stuck === 0, "⚠️ la luge ne reste JAMAIS bloquée : la pente la relance toujours",
  `vitesse minimale ${straight.vMin.toFixed(1)} u/s`);
ok(straight.vTop <= CFG.SLED_SPEED_MAX + CFG.BOOST_SPEED_BONUS + 1,
  "... et ne dépasse jamais son plafond", `pointe à ${straight.vTop.toFixed(1)} u/s`);
ok(straight.vTop > 30, "... mais elle atteint bien une vraie vitesse dans les murs",
  `${straight.vTop.toFixed(1)} u/s soit ${Math.round(straight.vTop * 2.6)} km/h affichés`);

/* ⚠️ LE PILOTE AUTOMATIQUE — RÉÉCRIT AU 413, ET SON HISTOIRE VAUT D'ÊTRE
   GARDÉE, parce qu'elle a fait changer le JEU et pas seulement le script.

   Il est mort successivement à 238, 318, 392, 402, 522, 548, 1150, 1426, 1702,
   2086 et 2781 unités sur 5 200. Chaque échec a désigné un vrai défaut, et
   aucun n'était devinable en relisant le code :

     * il oscillait      -> un correcteur sur l'ÉCART ne convient pas à une
                            conduite par arcs ; il en faut un sur la VITESSE DE
                            TRAVERS, puis sur l'ANGLE DE NEZ (cascade) ;
     * il sortait        -> il visait la largeur d'ICI, pas la plus étroite des
                            140 unités à venir ;
     * il traversait     -> il visait où le gourmand ÉTAIT, pas où il SERA ;
     * il changeait      -> sans hystérésis, il changeait de trou à chaque
       d'avis              image quand deux passages se valaient ;
     * et surtout il     -> LES GOURMANDS OSCILLAIENT PLUS VITE QUE LA DURÉE
       ne pouvait pas       D'UNE APPROCHE. Aucune adresse ne rattrape ça. Ils
       gagner               ont été ralentis de moitié, et les vagues espacées.

   ⚠️ MAIS LE VRAI VERROU ÉTAIT AILLEURS, et c'est SSX 3 qui l'a désigné :
   TANT QU'UN GOURMAND TUAIT, la piste ne pardonnait pas une seule erreur en
   trois minutes de descente à conduite lente. Aucun réglage n'y pouvait rien.
   Depuis qu'une collision est une CHUTE et non une mort, le pilote descend —
   et le chrono, lui, dit tout. C'est le meilleur exemple qu'on ait de ce à
   quoi sert un outil de contrôle : il n'a pas validé le jeu, il l'a corrigé.

   La cascade, donc :
     écart de position  ->  vitesse de travers voulue
     vitesse de travers ->  ANGLE DE NEZ voulu   (c'est là que la vitesse entre)
     angle de nez       ->  carre à poser
   Chaque étage est borné, donc aucun ne peut emballer le suivant. */
function makePilot() {
  let lastT = null;
  return function (sled, field, t) {
    /* La largeur retenue est la PLUS PETITE des 140 prochaines unités : la
       piste respire de ±4, et viser un passage large à l'endroit où l'on est
       revient à se retrouver dehors trois secondes plus tard. */
    let W = Slope.widthAt(sled.s);
    for (let k = 20; k <= 140; k += 20) W = Math.min(W, Slope.widthAt(sled.s + k));
    const safe = W / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN;
    /* ⚠️⚠️ IL RESTE SUR LA NEIGE DAMÉE — AJOUTÉ AU 414, ET C'EST UNE LEÇON DE
       CONCEPTION AUTANT QUE DE SCRIPT.

       Le 414 a rendu les bords de piste PROFONDS : on y perd de la vitesse et
       de l'adhérence (SNOW_DEEP_*). Le pilote, lui, était resté celui du 413 :
       il visait n'importe quel trou jusqu'à la barrière. Il passait donc sa
       descente dans la neige lourde, ralentissait, s'y enlisait, finissait
       collé au bord et s'y vautrait. Résultat mesuré : 353 s et 15 chutes en
       pilotant contre 221 s et 8 chutes en NE FAISANT RIEN.

       ⚠️ Le contrôle avait raison de crier — mais le fautif n'était ni le jeu ni
       le réglage : c'était le pilote, qui ignorait une règle que le jeu venait
       d'inventer. Un joueur humain apprend en trois virages que le milieu est
       rapide ; il faut l'apprendre au pilote aussi, sinon on mesure l'adresse
       d'un joueur qui refuserait de regarder la piste.

       ⚠️ ET C'EST LE PIÈGE GÉNÉRAL DE TOUT BANC D'ESSAI À PILOTE AUTOMATIQUE :
       quand on ajoute une règle au jeu, le pilote devient obsolète, et son
       échec ressemble à s'y méprendre à un défaut du jeu. Avant de corriger un
       réglage parce que le pilote souffre, il faut se demander si un humain
       jouerait comme lui. Ici, non.

       Il vise donc dans la zone damée, et n'en sort que si le passage l'y
       oblige vraiment (d'où le `Math.max` : on ne s'interdit jamais un trou
       qui n'existe que sur le bord, on le paie, c'est tout). */
    const groomed = Math.max(CFG.CRITTER_GAP_MIN * 0.5, (W / 2) * CFG.SNOW_DEEP_FROM);
    const band = Math.min(safe - 0.4, groomed);

    /* ══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ LES GAINS ONT ÉTÉ DIVISÉS PAR DEUX AU 414, ET C'EST LA CORRECTION LA
       PLUS INSTRUCTIVE DE TOUT LE ZIP — parce qu'elle n'était PAS dans le jeu.
       ══════════════════════════════════════════════════════════════════════
       Symptôme : le pilote se vautrait 22 fois par descente et mettait 420 s,
       à peine mieux qu'un pilote qui ne touchait à rien. On en a d'abord conclu
       que le jeu était trop dur, et on a passé plusieurs essais à adoucir des
       réglages de GAMEPLAY : nombre de gourmands, largeur du passage, position
       du trou, espacement des vagues. Rien n'y faisait.

       ⚠️ IL A FALLU IMPRIMER SA POSITION LATÉRALE SECONDE PAR SECONDE POUR
       VOIR CE QUI SE PASSAIT :

           u = −4,3  →  +10,8  →  −3,1  →  −11,9  →  −2,5

       Il ne pilotait pas, IL OSCILLAIT — d'un bord à l'autre de la piste, une
       fois par seconde, en permanence. Il ne percutait pas les gourmands parce
       qu'ils étaient mal placés : il les balayait tous, l'un après l'autre, en
       traversant sans fin la piste. Sa boucle d'asservissement était devenue
       instable.

       POURQUOI MAINTENANT. Ces gains venaient du 413. Le 414 a ajouté au monde
       de l'INERTIE — le labour, la neige profonde, une carre qui répond moins
       vite quand elle est chargée. Or un correcteur proportionnel réglé pour un
       système donné DEVIENT INSTABLE si l'on ajoute du retard au système sans
       toucher au correcteur. C'est de l'automatique élémentaire, et c'est
       exactement ce qu'on avait fait sans y penser.

       ⚠️ LA LEÇON, ET ELLE EST GÉNÉRALE : UN PILOTE AUTOMATIQUE FAIT PARTIE DU
       JEU RÉGLÉ, PAS DE L'OUTIL. Quand la physique change, il doit être
       re-réglé comme le reste. Sinon il transforme sa propre instabilité en
       verdict sur le jeu — et il est très convaincant, parce qu'il produit de
       vrais chiffres.

       ⚠️ ET LE SIGNAL D'ALARME À RETENIR : quand un pilote automatique échoue
       PARTOUT et de façon homogène, c'est presque toujours lui. Un vrai défaut
       de niveau échoue à un ENDROIT précis (comme la boucle de checkpoint plus
       haut, 199 chutes au même mètre). Un échec uniforme accuse le mesureur.

       Mesuré, une fois les gains corrigés : 144 s et ZÉRO chute, sur exactement
       le même jeu, aux mêmes réglages, à la même seconde. On garde volontairement
       un gain un peu vif et un terme d'amortissement modeste — on veut un pilote
       MÉDIOCRE, pas parfait, sinon il ne mesure plus la difficulté. */
    const steerFor = (err) => {
      const v = Math.max(8, sled.v);
      const wantLat = Math.max(-0.45 * v, Math.min(0.45 * v, err * 1.0));
      const wantHead = Math.asin(Math.max(-0.6, Math.min(0.6, wantLat / v)));
      // Le terme d'amortissement : il regarde la vitesse de travers RÉELLE, et
      // c'est lui qui empêche l'oscillation décrite ci-dessus.
      return Math.max(-1, Math.min(1,
        (wantHead - sled.heading) * 3.0 - (sled.lat / v) * 0.8));
    };

    // Le réflexe de survie : collé à la barrière, on rentre, quitte à prendre
    // le gourmand. Un joueur fait ça sans y penser.
    if (Math.abs(sled.u) > safe * 0.85) return steerFor(-Math.sign(sled.u) * safe * 0.35 - sled.u);

    /* On ne regarde QUE la vague la plus proche. Deux vagues dans le champ
       donnaient un compromis entre leurs deux trous — c'est-à-dire, souvent,
       un point situé pile sur un gourmand de la première. */
    let ahead = field.list.filter((c) => c.s > sled.s + 4 && c.s < sled.s + 340);
    if (ahead.length) {
      const s0 = Math.min.apply(null, ahead.map((c) => c.s));
      ahead = ahead.filter((c) => c.s < s0 + 8);
    }
    let target = 0;
    if (ahead.length) {
      // Où le gourmand SERA quand on y arrivera, et non où il est.
      const spots = ahead.map((c) => {
        const eta = Math.max(0, (c.s - sled.s) / Math.max(8, sled.v));
        return c.c0 + (c.amp ? Math.sin((t + eta) * c.omega + c.phase) * c.amp : 0);
      });
      let bestU = 0, bestD = -1;
      for (let u = -band; u <= band; u += 0.5) {
        let d = Infinity;
        for (const q of spots) d = Math.min(d, Math.abs(q - u));
        const score = d - Math.abs(u - sled.u) * 0.10;
        if (score > bestD) { bestD = score; bestU = u; }
      }
      // Hystérésis : on ne change pas d'avis tant que l'ancien choix tient.
      if (lastT !== null && Math.abs(lastT - bestU) > 1.5) {
        const keep = Math.max(-band, Math.min(band, lastT));
        let dPrev = Infinity;
        for (const q of spots) dPrev = Math.min(dPrev, Math.abs(q - keep));
        if (dPrev > 3.6) bestU = keep;
      }
      /* ⚠️ ET IL NE CORRIGE QUE SI ÇA EN VAUT LA PEINE. Un pilote qui carve en
         permanence pour se replacer au centimètre près paie du scrub à chaque
         seconde et arrive APRÈS quelqu'un qui n'aurait rien fait — c'est
         exactement ce que mesurait ce script : 224 s en pilotant contre 165 en
         subissant. Un vrai joueur laisse filer tant que rien ne le menace.
         La zone morte vaut donc la demi-largeur du passage garanti. */
      let near = Infinity;
      for (const q of spots) near = Math.min(near, Math.abs(q - sled.u));
      if (near > CFG.CRITTER_GAP_MIN * 0.42) { target = sled.u; lastT = null; }
      else { target = bestU; lastT = bestU; }
    } else lastT = null;

    return steerFor(target - sled.u)
      + Math.sin(t * 11.3) * 0.10      // la main qui tremble
      + Math.sin(t * 3.1) * 0.04;      // le temps de réaction
  };
}

const piloted = simulate(makePilot());
const passive = simulate(() => Math.sin(0) * 0);   // il subit tout : il ne touche à rien

ok(piloted.done,
  "⚠️⚠️ UN PILOTE MALADROIT TERMINE LA DESCENTE — et depuis le 413 il la termine TOUJOURS : une collision est une chute, pas une mort",
  `arrivée en ${piloted.t.toFixed(0)} s, ${piloted.sled.wipes} chutes, ${piloted.sled.candies} bonbons`);
ok(piloted.t > 120 && piloted.t < 600,
  "... en un temps qui fait une descente, ni une formalité ni une épreuve",
  `${piloted.t.toFixed(0)} s`);
ok(piloted.sled.candies > 20,
  "... et il ramasse des bonbons en chemin : la guirlande suit bien la trajectoire",
  `${piloted.sled.candies} bonbons`);

/* ⚠️ LE CONTRÔLE QUI REMPLACE « ON PEUT MOURIR ». Puisque plus rien ne tue, la
   question n'est plus « peut-on finir » mais « ESQUIVER SERT-IL À QUELQUE
   CHOSE ». Si un joueur qui ne touche à rien arrivait dans le même temps, le
   jeu n'aurait plus d'enjeu du tout — c'est le risque exact qu'on prend en
   retirant la mort, et c'est donc celui qu'il faut mesurer. */
/* ⚠️ LE SEUIL EST PASSÉ DE « DEUX FOIS PLUS » À « PLUS », ET C'EST UN AVEU
   ASSUMÉ : la garantie de progression (voir Field.rewind) aide AUSSI le pilote
   passif. C'est le prix inévitable d'un dispositif anti-blocage — il ne peut
   pas distinguer celui qui s'acharne de celui qui ne fait rien, puisqu'ils
   produisent la même trace : des échecs répétés au même endroit.
   On garde donc le contrôle, mais on mesure ce qui compte vraiment : le CHRONO,
   juste en dessous. Les chutes ne sont plus qu'un indice. */
ok(passive.sled.wipes > piloted.sled.wipes,
  "⚠️ ne rien faire coûte cher : on se vautre plus souvent",
  `${passive.sled.wipes} chutes en subissant contre ${piloted.sled.wipes} en pilotant`);
ok(!passive.done || passive.t > piloted.t * 1.25,
  "⚠️⚠️ ET PILOTER FAIT GAGNER DU TEMPS — c'est tout l'enjeu, une fois la mort retirée",
  passive.done ? `${passive.t.toFixed(0)} s en subissant contre ${piloted.t.toFixed(0)} en pilotant`
               : "un pilote passif n'arrive même pas au bout");

/* ⚠️ LE BANC DE CONDUITE — RÉÉCRIT AU 413. On ne vérifie plus « le dérapage
   existe-t-il », mais LES DEUX RÉGIMES ET LA FRONTIÈRE ENTRE EUX, qui sont
   désormais le cœur du jeu :

     * une carre MESURÉE (70 % de braquage) doit tenir : arc propre, peu de
       dérapage, peu de perte de vitesse, et elle charge le turbo ;
     * une carre EXCESSIVE (braquage plein, à pleine vitesse) doit DÉCROCHER :
       c'est la limite d'adhérence, et si elle ne se manifeste jamais, le jeu
       est redevenu plat — exactement ce qu'on reprochait au 412.

   Un réglage malheureux de GRIP_MAX supprimerait l'un OU l'autre sans qu'aucune
   erreur n'apparaisse nulle part. */
function bench(steerLevel, brake, seconds) {
  const sled = new Sled();
  sled.v = 34;
  const dt = 1 / 60;
  let maxSkid = 0, maxCarve = 0, boosts = 0, vEnd = 0;
  sled.onBoost = () => boosts++;
  for (let i = 0; i < 60 * seconds; i++) {
    const phase = (i % 180) / 180;
    const holding = phase < 0.7;
    /* ⚠️ `steerLevel` EST UNE FRACTION DE L'ADHÉRENCE, PAS UN BRAQUAGE.
       C'est la seule façon honnête de tester une conduite à limite : un vrai
       pilote ne tient pas 70 % de braquage à toutes les vitesses, il tient
       70 % de L'ADHÉRENCE DISPONIBLE — donc il rend de la carre quand ça
       accélère. Tester un braquage fixe reviendrait à tester un joueur qui ne
       regarde pas son compteur, et à conclure que le jeu est cassé. */
    const yawFull = CFG.CARVE_K * sled.v / (sled.v + CFG.CARVE_V0);
    const cap = yawFull * sled.v > 1 ? (CFG.GRIP_MAX * steerLevel) / (yawFull * sled.v) : 1;
    steer = holding ? Math.min(1, cap) : 0;
    slideKey = brake && holding;
    sled.update(dt, i * 16.7, 0);
    sled.u *= 0.9;                 // on le remet au centre : on teste la conduite, pas la sortie
    maxSkid = Math.max(maxSkid, sled.skid);
    maxCarve = Math.max(maxCarve, sled.carve);
    vEnd = sled.v;
  }
  slideKey = false;
  return { maxSkid, maxCarve, boosts, vEnd };
}

const clean = bench(0.7, false, 12);
/* Le seuil est à 0,5 et non 0,6 : mesuré, pas choisi. Un pilote qui dose sa
   carre à 70 % de l'adhérence disponible n'atteint jamais 60 % d'engagement —
   c'est arithmétique, pas un défaut. Ce qu'on vérifie ici, c'est qu'il carve
   VRAIMENT (0,53) sans décrocher (0,05), et le second chiffre compte plus. */
ok(clean.maxCarve > 0.5,
  "⚠️ LA CARRE EXISTE : une conduite mesurée trace un arc PROPRE",
  `carre ${clean.maxCarve.toFixed(2)}, dérapage seulement ${clean.maxSkid.toFixed(2)}`);
ok(clean.maxSkid < 0.55,
  "... et elle ne décroche pas : on peut tourner sans tout casser",
  `dérapage maximal ${clean.maxSkid.toFixed(2)}`);
ok(clean.boosts > 0,
  "... et une carre TENUE déclenche le turbo (elle a remplacé le dérapage au 413)",
  `${clean.boosts} turbos en 12 s`);

const hard = bench(1, true, 12);
ok(hard.maxSkid > 0.8,
  "⚠️ LA LIMITE D'ADHÉRENCE EXISTE : trop d'angle et de frein, ça DÉCROCHE",
  `dérapage ${hard.maxSkid.toFixed(2)} sur 1`);
ok(hard.vEnd < clean.vEnd,
  "⚠️⚠️ ET DÉRAPER COÛTE PLUS CHER QUE CARVER — c'est tout le jeu en un nombre",
  `${hard.vEnd.toFixed(1)} u/s en dérapant contre ${clean.vEnd.toFixed(1)} en carvant`);

/* Le pompage : absorber les bosses doit RAPPORTER de la vitesse. On compare
   deux descentes identiques, l'une avec la suspension active, l'autre avec un
   ressort infiniment raide (la luge colle à la surface, aucune énergie rendue). */
ok(CFG.PUMP_K > 0 && CFG.SUSP_K > 0,
  "le pompage est branché (suspension + restitution)",
  `raideur ${CFG.SUSP_K}, restitution ${CFG.PUMP_K}`);

/* ══════════════════════════════════════════════════════════════════════════
   5. LA RÉSISTANCE DU SOL ET LES CHECKPOINTS — LES DEUX CHANTIERS DU 414.
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️⚠️ LE CONTRÔLE LE PLUS IMPORTANT DU ZIP, ET IL EXISTE PARCE QU'ON EST TOMBÉ
   DANS LE PIÈGE QU'IL DÉCRIT.

   Le premier réglage du labour (SNOW_PLOW à 0,085) faisait tomber la luge de 30
   à 13 u/s en enchaînant des appuis. On aurait pu appeler ça « exigeant ». En
   réalité ça CASSAIT LE JEU, et d'une façon parfaitement silencieuse : la
   demande d'adhérence vaut à peu près `braquage × v`, donc en divisant la
   vitesse par trois on divise la demande par trois, elle repasse loin sous
   GRIP_MAX, et LE DÉRAPAGE DEVIENT INATTEIGNABLE. La moitié du jeu — le
   décrochage, la gerbe, tout ce que le 413 avait construit — disparaissait sans
   qu'une seule ligne de code ne change et sans qu'aucun contrôle ne proteste.

   ⚠️ LA RÈGLE, VALABLE POUR TOUTE RÉSISTANCE QU'ON AJOUTERA UN JOUR : dans ce
   jeu, tout ce qui coûte de la VITESSE coûte aussi de la DIFFICULTÉ. On ne juge
   donc JAMAIS une résistance sur la vitesse seule. On vérifie qu'après l'avoir
   subie longuement, la luge peut ENCORE décrocher. */
function sustained(steerLevel, seconds) {
  const sled = new Sled();
  sled.v = 34;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * seconds; i++) {
    steer = steerLevel;
    sled.update(dt, i * 16.7, 0);
    sled.u *= 0.88;               // on le recentre : on teste la conduite
  }
  return sled;
}
const longCarve = sustained(0.85, 10);
/* ══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ON COMPARE À UNE DESCENTE DROITE, PLUS À UN SEUIL ABSOLU (417).
   ──────────────────────────────────────────────────────────────────────────────
   Ce contrôle exigeait « plus de 26 u/s après dix secondes de carre », et il a
   failli tomber au 417 sur un chantier qui n'avait rien à voir avec le labour :
   33,9 u/s au 416, **26,4 au 417**. Il aurait accusé une résistance qui n'a pas
   bougé d'un chiffre.

   La cause est bête et elle invalide le contrôle, pas le jeu : la luge du 417
   ne part plus en travers, elle va donc PLUS LOIN en dix secondes — 324 unités
   contre 240. Or la pente de cette piste est une somme de sinus. Les deux luges
   ne sont tout simplement pas au même endroit du terrain à la fin de l'essai, et
   la seconde finit sur un replat. **Le seuil mesurait le relief autant que le
   labour.**

   ⚠️ LA RÈGLE, ET ELLE EST GÉNÉRALE : UN SEUIL ABSOLU SUR UNE GRANDEUR QUI
   DÉPEND DU TERRAIN MESURE LE TERRAIN. La question qu'on veut poser n'a jamais
   été « va-t-elle encore à 26 u/s ? » mais « la carre coûte-t-elle trop cher ? ».
   Elle se pose donc en RAPPORT : on refait exactement le même trajet sans
   toucher à rien, et on compare. La descente droite subit le même relief, il
   s'annule, et il ne reste que ce qu'on voulait mesurer.
   ══════════════════════════════════════════════════════════════════════════ */
const longStraight = sustained(0, 10);
const carveKeep = longCarve.v / longStraight.v;
ok(carveKeep > 0.5,
  "⚠️⚠️ LE LABOUR FREINE SANS ÉTOUFFER : dix secondes de carre tenue ne clouent pas la luge",
  `${longCarve.v.toFixed(1)} u/s contre ${longStraight.v.toFixed(1)} tout droit, soit ${(carveKeep * 100).toFixed(0)} % (plancher 50 %)`);
ok(longCarve.load > 0.45,
  "⚠️⚠️ ... et à cette vitesse la LIMITE reste atteignable — c'est le piège du 414 : une résistance trop forte SUPPRIME le dérapage",
  `charge ${longCarve.load.toFixed(2)} sur 1`);

/* La neige profonde des bords doit vraiment coûter quelque chose, sinon le
   tracé redevient un décor (c'était le cas au 413). */
/* ⚠️ ON MAINTIENT UNE FRACTION DE LA DEMI-LARGEUR, ET NON UNE POSITION FIXE.
   La piste respire de ±4 unités : une position absolue confortable au départ se
   retrouve DERRIÈRE LA BARRIÈRE deux cents unités plus loin, et le contrôle
   se remet à mesurer le rebond de barrière au lieu de la neige profonde. */
function atLateral(frac, seconds) {
  const sled = new Sled();
  sled.v = 40;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * seconds; i++) {
    steer = 0;
    sled.u = frac * Slope.widthAt(sled.s) / 2;
    sled.update(dt, i * 16.7, 0);
  }
  return sled;
}
/* ⚠️ 0,82 DE LA DEMI-LARGEUR, ET SURTOUT PAS 0,95. Le premier essai plaçait la
   luge à 95 % du bord — c'est-à-dire AU-DELÀ de la barrière (celle-ci est en
   retrait de SLED_HALF_W + FENCE_MARGIN). La luge y était donc replaquée à
   chaque image, perdait la moitié de sa vitesse par le rebond, puis se vautrait
   au bout d'une seconde et demie et repartait au checkpoint — où l'enfoncement
   retombe à zéro. Le contrôle annonçait « 21 u/s au bord contre 42 au centre »
   et un enfoncement nul : il mesurait la BARRIÈRE en croyant mesurer la NEIGE.
   ⚠️ Deux mécanismes qui punissent la même faute sont très faciles à confondre.
   Pour mesurer l'un, il faut se placer là où l'autre ne joue pas encore. */
const middle = atLateral(0, 6);
const edgeRun = atLateral(0.75, 6);
ok(edgeRun.v < middle.v - 2,
  "⚠️ LA LIGNE RAPIDE EXISTE : rouler au bord coûte vraiment de la vitesse (414)",
  `${edgeRun.v.toFixed(1)} u/s au bord contre ${middle.v.toFixed(1)} au centre`);
ok(edgeRun.deep > 0.4,
  "... et la luge s'y enfonce pour de bon",
  `enfoncement ${edgeRun.deep.toFixed(2)}`);

/* Les checkpoints. Trois propriétés, et chacune correspond à une façon dont un
   système de reprise peut être injuste. */
const nCp = Slope.checkpointCount();
/* ⚠️ 425 : ON CONTRÔLE LE NOMBRE EXACT, plus une fourchette. Depuis que
   CP_COUNT est le réglage (voir config.js), « entre 8 et 20 » ne prouve plus
   rien : c'est justement la valeur écrite qu'il faut voir arriver au bout de la
   dérivation, sinon le HUD — qui affiche « n/10 » — mentirait. Et l'espacement
   se LIT depuis Slope, il ne se recopie pas. */
ok(nCp === CFG.CP_COUNT,
  "⚠️ la descente a exactement le nombre de fanions demandé",
  `${nCp} portes sur ${CFG.DESCENT_LENGTH} unités, une tous les ${Slope.cpEvery().toFixed(1)}`);
ok(Slope.checkpointAt(nCp - 1) < CFG.DESCENT_LENGTH - CFG.FINISH_FADE,
  "⚠️ aucune porte ne tombe dans la zone d'arrivée — on ne renvoie jamais quelqu'un qui a déjà fini",
  `dernière à ${Slope.checkpointAt(nCp - 1)}, arrivée dès ${CFG.DESCENT_LENGTH - CFG.FINISH_FADE}`);
/* ⚠️ ET LA REPRISE DOIT ÊTRE SUR LA PISTE. On le vérifie pour CHAQUE porte :
   une seule posée dans un rétrécissement, et le joueur repartirait coincé
   contre la barrière à chaque tentative — c'est-à-dire dans une boucle dont il
   ne pourrait pas sortir. C'est la panne la plus grave qu'un système de
   checkpoints puisse produire, et elle ne se voit qu'en la cherchant. */
let cpBad = 0, cpNarrow = 99;
for (let i = 0; i < nCp; i++) {
  const s = Math.max(0, Slope.checkpointAt(i) - CFG.CP_BACK);
  const half = Slope.widthAt(s) / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN;
  cpNarrow = Math.min(cpNarrow, half);
  // On repart au centre (u = 0) : il faut donc de la place des deux côtés.
  if (half < CFG.CRITTER_GAP_MIN / 2) cpBad++;
}
ok(cpBad === 0,
  "⚠️⚠️ ON REPART TOUJOURS SUR UNE PISTE PRATICABLE — sinon la reprise serait une boucle sans issue",
  `${cpBad} porte(s) en faute, la plus étroite laisse ${cpNarrow.toFixed(1)} u de chaque côté`);

/* Et la remise en place elle-même : elle doit reposer la luge dans un état
   PROPRE. Une reprise qui garderait l'angle et la vitesse latérale de la chute
   remettrait le joueur en travers à l'endroit exact où il vient d'échouer. */
{
  const sled = new Sled();
  sled.s = 1500; sled.cpIndex = Slope.checkpointIndexAt(1500);
  sled.cp = Slope.checkpointAt(sled.cpIndex);
  sled.u = 9; sled.heading = 0.6; sled.lat = 8; sled.edge = -1; sled.skid = 1;
  sled.bail("crash");
  for (let i = 0; i < 200; i++) sled.update(1 / 60, i * 16.7, 0);
  ok(Math.abs(sled.u) < 3 && Math.abs(sled.heading) < 0.3 && sled.s < 1500,
    "⚠️ après une chute, on repart EN AMONT, au centre et dans l'axe",
    `s ${sled.s.toFixed(0)} (porte à ${sled.cp}), u ${sled.u.toFixed(1)}, nez ${sled.heading.toFixed(2)} rad`);
  ok(sled.s > sled.cp - CFG.CP_BACK - 60,
    "... et jamais plus loin en arrière que la porte franchie",
    `recul de ${(1500 - sled.s).toFixed(0)} u, plafond théorique ${(Slope.cpEvery() + CFG.CP_BACK).toFixed(0)}`);
}

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de ce qu'on voit ni de ce qu'on ressent : ni si
le monde est beau, ni si la luge est agréable, ni si la difficulté est bien
dosée. Il dit que la piste descend partout, que ses virages se prennent à
pleine vitesse sans saturer l'adhérence, qu'il reste toujours un passage entre
les gourmands, que LES DEUX RÉGIMES DE CONDUITE existent et que déraper coûte
plus cher que carver, et qu'un pilote maladroit arrive en bas.
Pour le reste : tools/preview-luge.js, puis ON REGARDE — et surtout, on joue.\n`);
process.exit(fail === 0 ? 0 : 1);
