/* =============================================================================
   verify-controls.mjs — LES COMMANDES VONT-ELLES DANS LE BON SENS ?
   -----------------------------------------------------------------------------
   ⚠️ CE SCRIPT EXISTE PARCE QUE GUILLAUME A TROUVÉ CE QU'AUCUN OUTIL N'AVAIT VU.
   Retour du zip 393 : « tes contrôles sont inversés ». Il avait raison — flèche
   droite faisait tourner à gauche — et pas un seul des sept scripts de
   vérification ne pouvait s'en apercevoir, pour une raison qui mérite d'être
   écrite en toutes lettres :

     le joueur oracle de lib-play.mjs CALCULE son intention de rotation à
     partir de la même convention que le moteur. Dans un monde inversé, il
     tournait « juste » et arrivait à destination. Il mesurait la cohérence du
     code avec lui-même, pas son accord avec le joueur.

   C'est le corollaire n°5 du zip 387 sous une forme neuve : un contrôle qui
   partage la CONVENTION du code qu'il vérifie ne vérifie rien. La parade est
   celle du projet depuis toujours — ne pas vérifier la règle, vérifier le
   RÉSULTAT qu'on promet. Ici la promesse est en français : « flèche droite
   fait tourner à droite », et le script la teste comme un joueur la testerait,
   en regardant où part le regard.

   CE QU'IL NE PROUVE PAS : rien de la douceur du geste (ça, il faut jouer),
   rien du tactile, rien de la caméra.
   ========================================================================== */

import { load } from "./lib-play.mjs";

const { CFG, Maze, Rules } = load();
let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

function fresh() {
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 4242);
  // On pose le fermier au large, au centre d'une grande salle s'il y en a une,
  // pour que les murs ne faussent aucun déplacement.
  const r = m.rooms[0];
  const [wx, wz] = Rules.centerOf(CFG, r ? r.x + 1 : m.entry.x, r ? r.y + 1 : m.entry.y);
  st.px = wx; st.pz = wz; st.ang = 0; st.vx = 0; st.vz = 0; st.turnVel = 0;
  return st;
}
function run(st, intent, frames) {
  for (let i = 0; i < frames; i++) Rules.step(st, 1 / CFG.SIM_HZ, Object.assign({ fwd: 0, turn: 0, strafe: 0 }, intent));
}
const fwdOf = (st) => [-Math.sin(st.ang), -Math.cos(st.ang)];

/* ang = 0 regarde vers -Z, et -Z est le NORD de la grille (la sortie est au
   nord, l'entrée au sud). +X est donc l'EST, à la droite du fermier. */
{
  const st = fresh(); run(st, { turn: 1 }, 15);
  const [fx] = fwdOf(st);
  ok("flèche DROITE fait tourner à DROITE (vers l'est)", fx > 0.3, `x avant = ${fx.toFixed(2)}`);
}
{
  const st = fresh(); run(st, { turn: -1 }, 15);
  const [fx] = fwdOf(st);
  ok("flèche GAUCHE fait tourner à GAUCHE (vers l'ouest)", fx < -0.3, `x avant = ${fx.toFixed(2)}`);
}
{
  const st = fresh(); const z0 = st.pz; run(st, { fwd: 1 }, 15);
  ok("flèche HAUT avance vers le nord", st.pz < z0 - 1, `Δz = ${(st.pz - z0).toFixed(2)}`);
}
{
  const st = fresh(); const z0 = st.pz; run(st, { fwd: -1 }, 15);
  ok("flèche BAS recule vers le sud", st.pz > z0 + 0.5, `Δz = ${(st.pz - z0).toFixed(2)}`);
}
{
  const st = fresh(); const x0 = st.px; run(st, { strafe: 1 }, 15);
  ok("pas de côté DROIT va vers l'est", st.px > x0 + 0.5, `Δx = ${(st.px - x0).toFixed(2)}`);
}
{
  const st = fresh(); const x0 = st.px; run(st, { strafe: -1 }, 15);
  ok("pas de côté GAUCHE va vers l'ouest", st.px < x0 - 0.5, `Δx = ${(st.px - x0).toFixed(2)}`);
}
{
  // Reculer doit être NETTEMENT plus lent qu'avancer : on ne fuit pas à reculons.
  const a = fresh(); run(a, { fwd: 1 }, 30);
  const b = fresh(); run(b, { fwd: -1 }, 30);
  const da = Math.abs(a.pz - fresh().pz), db = Math.abs(b.pz - fresh().pz);
  ok("reculer est plus lent qu'avancer", db < da * 0.75, `${db.toFixed(1)} contre ${da.toFixed(1)} unités`);
}
{
  /* LE LISSAGE. La rotation ne doit PAS atteindre sa vitesse maximale en une
     image (à-coup), ni mettre plus d'un tiers de seconde à s'établir (patinage).
     Les deux bornes viennent du retour « pas très très fluide ». */
  const st = fresh();
  run(st, { turn: 1 }, 1);
  const v1 = Math.abs(st.turnVel);
  run(st, { turn: 1 }, 9);
  const v20 = Math.abs(st.turnVel);
  ok("la rotation monte progressivement, pas d'un coup", v1 < CFG.TURN_SPEED * 0.35, `${v1.toFixed(2)} rad/s après 1 pas`);
  ok("... et elle est bien établie en un tiers de seconde", v20 > CFG.TURN_SPEED * 0.9, `${v20.toFixed(2)} / ${CFG.TURN_SPEED} rad/s après 10 pas`);
}
{
  // Un demi-tour complet doit rester sous 1,5 s, sinon la fuite est impossible.
  const st = fresh();
  let f = 0;
  while (Math.abs(st.ang) < Math.PI && f < 200) { run(st, { turn: 1 }, 1); f++; }
  ok("un demi-tour se fait en moins de 1,5 s", f / CFG.SIM_HZ < 1.5, `${(f / CFG.SIM_HZ).toFixed(2)} s`);
}

/* ===========================================================================
   ZIP 396 — LE RECALAGE SUR LE COULOIR, LA PASSERELLE, LA HERSE
   ---------------------------------------------------------------------------
   Trois mécaniques neuves, et les trois se posent comme des questions en
   français sur un RÉSULTAT — jamais sur une formule. C'est la seule façon de
   ne pas refaire l'erreur du 394, où sept scripts partageaient la convention
   du code qu'ils vérifiaient et ne voyaient donc pas des commandes inversées.
   ========================================================================= */
const q = Math.PI / 2;
{
  /* On lâche le fermier à 0,25 rad de l'axe, en marche avant, sans toucher aux
     flèches. Le recalage doit le ramener sur l'axe — c'est exactement le geste
     d'un joueur qui a relâché sa flèche un peu trop tard. */
  const st = fresh();
  st.ang = 0.25;
  run(st, { fwd: 1 }, 30);
  ok("lâcher la flèche recale-t-il le cap sur le couloir ?",
    Math.abs(st.ang) < 0.06, `cap ${st.ang.toFixed(3)} rad après 1 s (départ 0,250)`);
}
{
  /* ... mais PAS quand on vise délibérément en diagonale. À 0,70 rad on est
     hors de SNAP_WINDOW : le jeu doit laisser la main. */
  const st = fresh();
  st.ang = 0.70;
  run(st, { fwd: 1 }, 30);
  ok("viser en diagonale reste-t-il possible (hors fenêtre de recalage) ?",
    Math.abs(st.ang - 0.70) < 0.02, `cap ${st.ang.toFixed(3)} rad, inchangé`);
}
{
  /* ... ni à l'arrêt : on tourne pour REGARDER, et recaler quelqu'un qui
     inspecte un mur serait le contraire du service rendu. */
  const st = fresh();
  st.ang = 0.25;
  run(st, {}, 30);
  ok("à l'arrêt, le cap est-il laissé tranquille ?",
    Math.abs(st.ang - 0.25) < 0.02, `cap ${st.ang.toFixed(3)} rad, inchangé`);
}
{
  /* LA PASSERELLE. On repart de la VRAIE position de départ (fresh() déplace
     le fermier au large) et on recule, ce que fait un joueur qui se retourne. */
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 4242);
  let f = 0;
  while (st.status === "play" && f < 300) { run(st, { fwd: -1 }, 1); f++; }
  ok("reculer au départ mène-t-il dehors, sans mourir ?",
    st.status === "abandon", `issue « ${st.status} » en ${(f / CFG.SIM_HZ).toFixed(1)} s`);
}
{
  /* LA HERSE. On attend, immobile : l'horloge ne doit PAS démarrer — décision
     de Guillaume, « le décompte part au premier pas ». */
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 4242);
  run(st, {}, CFG.SIM_HZ * 20);
  ok("rester immobile laisse-t-il la porte ouverte indéfiniment ?",
    st.gate.state === 0 && st.abandonT < 0, `herse état ${st.gate.state}, horloge ${st.abandonT.toFixed(1)}`);
}
{
  /* On avance quelques pas, puis on attend : la herse doit tomber, et la porte
     doit être RÉELLEMENT bloquée après — pas seulement dessinée fermée. */
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 4242);
  const boxes0 = st.boxes.length;
  run(st, { fwd: 1 }, 8);                              // le premier pas
  run(st, {}, Math.ceil(CFG.SIM_HZ * (CFG.ABANDON_MS + CFG.GATE_FALL_MS) / 1000) + 4);
  ok("la herse tombe-t-elle après les 15 secondes ?",
    st.gate.state === 2, `état ${st.gate.state}`);
  ok("... et bloque-t-elle vraiment le passage ?",
    st.boxes.length === boxes0 + 1, `${st.boxes.length - boxes0} boîte de maçonnerie ajoutée`);
  // On repousse le fermier vers la porte : il ne doit plus sortir.
  const before = st.status;
  run(st, { fwd: -1 }, 200);
  ok("... au point qu'on ne peut plus faire demi-tour ?",
    st.status !== "abandon", `statut « ${st.status} » (était « ${before} »)`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nToutes les commandes vont dans le bon sens.\n");
console.log(`Ce script ne dit RIEN du confort réel : il dit que chaque commande
va dans le sens que le joueur attend, que le recalage aide sans jamais prendre
la main, et que la passerelle puis la herse font ce qu'elles promettent. Le
confort, lui, se juge une manette à la main.\n`);
process.exit(fails ? 1 : 0);
