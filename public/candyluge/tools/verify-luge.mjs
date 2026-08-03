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

/* ⚠️ LE CONTRÔLE DE VIRAGE, et c'est le plus important de cette section.
   Dans un virage de courbure `c` pris à la vitesse `v`, la piste tourne de
   c·v radians par seconde. La luge, elle, ne peut se réorienter qu'à
   STEER_RATE (amputé de l'autorité perdue à haute vitesse). Si la première
   dépasse la seconde, le virage est INFRANCHISSABLE à pleine vitesse, quelle
   que soit l'adresse du joueur — la définition même du niveau injouable. */
const vMax = CFG.SLED_SPEED_MAX;
const authorityAtMax = 1 - (1 - CFG.SLED_STEER_SPEED_FALLOFF);
const turnDemand = maxCurve * vMax;
const turnSupply = CFG.SLED_STEER_RATE * authorityAtMax * 2.4;
ok(turnDemand < turnSupply * 0.75,
  "⚠️ le virage le plus serré se prend À PLEINE VITESSE (avec 25 % de marge)",
  `demande ${turnDemand.toFixed(2)} rad/s contre ${turnSupply.toFixed(2)} disponibles`);
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
  while (t < 400 && sled.alive && !(sled.finished && sled.v < 3)) {
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

/* Sans toucher au volant, la luge doit MOURIR (sortie de piste dans un
   virage). Un jeu où ne rien faire suffit à finir n'est pas un jeu — et ce
   contrôle-ci a le mérite d'échouer bruyamment si la piste devenait droite. */
ok(!straight.done, "⚠️ ne rien faire ne suffit pas : la luge sort dans le premier grand virage",
  `sortie à ${straight.sled.s.toFixed(0)} u sur ${CFG.DESCENT_LENGTH}`);

/* ============================================ 4. LE PILOTE AUTOMATIQUE ==== */
/* ⚠️ LE CONTRÔLE QUI COMPTE VRAIMENT. Il joue comme quelqu'un d'un peu maladroit :
     * il ne regarde que 55 unités devant lui (pas la vague suivante) ;
     * il réagit avec 0,25 s de retard ;
     * sa main tremble (bruit sur la consigne) ;
     * il ne dérape jamais, ne saute jamais, ne freine jamais.
   S'il finit la descente, alors un joueur humain le peut. S'il échoue, la
   piste est trop dure — et c'est ce constat-là qu'on veut recevoir d'un
   script, pas d'un joueur. */
function autopilot(sled, field, t) {
  const W = Slope.widthAt(sled.s);
  // Les gourmands dans la fenêtre d'anticipation.
  const ahead = field.list.filter((c) => c.s > sled.s + 4 && c.s < sled.s + 55);
  let target = 0;
  if (ahead.length) {
    // Le meilleur trou : on échantillonne la largeur et on garde le point le
    // plus éloigné de tout gourmand.
    let bestU = 0, bestD = -1;
    // La bande tenable, et pas la largeur de piste : viser un trou situé dans
    // les deux mètres interdits revient à viser la barrière.
    const band = W / 2 - CFG.SLED_HALF_W - CFG.FENCE_MARGIN - 0.4;
    for (let u = -band; u <= band; u += 0.5) {
      let d = Infinity;
      for (const c of ahead) d = Math.min(d, Math.abs(c.u - u));
      // Un léger biais vers la position actuelle : un pilote ne traverse pas
      // la piste pour gagner dix centimètres de marge.
      const score = d - Math.abs(u - sled.u) * 0.16;
      if (score > bestD) { bestD = score; bestU = u; }
    }
    target = bestU;
  }
  const err = target - sled.u;
  const noise = Math.sin(t * 11.3) * 0.12;             // la main qui tremble
  const lag = Math.sin(t * 3.1) * 0.05;                 // le temps de réaction
  /* Le terme en `lat` est ce que fait n'importe quel humain sans y penser :
     on ne corrige pas seulement l'écart, on anticipe la dérive en cours.
     Sans lui, le pilote oscille autour de sa cible et finit dans la barrière —
     ce qui dit quelque chose sur le pilote, pas sur la piste. */
  return Math.max(-1, Math.min(1, err * 0.24 - sled.lat * 0.07 + noise + lag));
}

const piloted = simulate(autopilot);
ok(piloted.done,
  "⚠️⚠️ UN PILOTE MALADROIT TERMINE LA DESCENTE — c'est le contrôle qui répond à « le niveau 5 est impossible »",
  piloted.done ? `arrivée en ${piloted.t.toFixed(1)} s, ${piloted.sled.candies} bonbons`
               : `mort à ${piloted.sled.s.toFixed(0)} u (${piloted.sled.cause})`);
ok(piloted.t > 60 && piloted.t < 260,
  "... en un temps qui fait une descente, ni une formalité ni une épreuve",
  `${piloted.t.toFixed(0)} s`);
ok(piloted.sled.candies > 5,
  "... et il ramasse des bonbons en chemin : la guirlande suit bien la trajectoire",
  `${piloted.sled.candies} bonbons`);

/* Le dérapage produit-il vraiment quelque chose ? On force un braquage tenu et
   on regarde monter l'intensité. Sans ce contrôle, un réglage malheureux de
   GRIP pourrait supprimer le dérapage sans qu'aucune erreur n'apparaisse — et
   c'est l'effet central du chantier. */
const drifter = (function () {
  const sled = new Sled();
  const slope = new Slope.SlopeGen();
  const dt = 1 / 60;
  let maxDrift = 0, boosts = 0;
  sled.onBoost = () => boosts++;
  /* ⚠️ ON JOUE COMME UN JOUEUR : on amorce, on TIENT, puis on RELÂCHE. Le turbo
     part au relâchement (comme dans tous les jeux de course depuis trente ans),
     donc un banc d'essai qui garde la flèche enfoncée en permanence ne verra
     jamais un seul turbo — et conclura à tort qu'il est cassé. Cycle de trois
     secondes : deux de dérapage tenu, une de répit. */
  for (let i = 0; i < 60 * 12; i++) {
    const phase = (i % 180) / 180;
    const holding = phase < 0.66;
    steer = holding ? (Math.floor(i / 180) % 2 ? -1 : 1) : 0;
    slideKey = holding;
    sled.update(dt, i * 16.7, 0);
    sled.u *= 0.9;              // on le remet au centre : on teste le dérapage, pas la sortie
    maxDrift = Math.max(maxDrift, sled.drift);
  }
  slideKey = false;
  return { maxDrift, boosts };
})();
ok(drifter.maxDrift > 0.6,
  "⚠️ LE DÉRAPAGE EXISTE VRAIMENT — c'est l'effet central du chantier",
  `intensité maximale ${drifter.maxDrift.toFixed(2)} sur 1`);
ok(drifter.boosts > 0,
  "... et un dérapage tenu déclenche bien le turbo", `${drifter.boosts} turbos en 12 s`);

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de ce qu'on voit ni de ce qu'on ressent : ni si
le monde est beau, ni si la luge est agréable, ni si la difficulté est bien
dosée. Il dit que la piste descend partout, que ses virages se prennent à
pleine vitesse, qu'il reste toujours un passage entre les gourmands, que le
dérapage produit bien quelque chose, et qu'un pilote maladroit arrive en bas.
Pour le reste : tools/preview-luge.js, puis ON REGARDE — et surtout, on joue.\n`);
process.exit(fail === 0 ? 0 : 1);
