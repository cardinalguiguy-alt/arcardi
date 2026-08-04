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

import fs from "fs";
import path from "path";
import { load, ROOT } from "./lib-play.mjs";

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

/* =============================================================================
   ZIP 397 — LA SOURIS. Sept contrôles neufs, posés dans les mêmes termes que
   ceux du 394 : on ne relit AUCUNE formule, on demande où part le regard.
   -----------------------------------------------------------------------------
   ⚠️ C'est le même piège qu'au 393, à un périphérique près. Le signe de
   `turnDelta` est écrit dans rules.js, et n'importe qui pourrait « corriger »
   la ligne `st.ang -= intent.turnDelta` en la trouvant bizarre — elle l'est,
   puisque le vecteur avant vaut (−sin a, −cos a). Sans ces contrôles, la
   souris partirait à l'envers exactement comme les flèches en 393, et pour la
   même raison : personne ne peut vérifier un signe en le regardant.
   ========================================================================== */
{
  const st = fresh(); run(st, { turnDelta: 0.4 }, 1);
  const [fx] = fwdOf(st);
  ok("SOURIS vers la DROITE fait tourner à DROITE (vers l'est)", fx > 0.3, `x avant = ${fx.toFixed(2)}`);
}
{
  const st = fresh(); run(st, { turnDelta: -0.4 }, 1);
  const [fx] = fwdOf(st);
  ok("SOURIS vers la GAUCHE fait tourner à GAUCHE (vers l'ouest)", fx < -0.3, `x avant = ${fx.toFixed(2)}`);
}
{
  /* La souris est un DÉPLACEMENT, pas une vitesse : elle ne doit ni accélérer
     ni continuer sur sa lancée. Une souris qui « glisse » après l'arrêt de la
     main est la sensation que tous les joueurs de FPS détestent, et c'est ce
     qu'on obtient si on la fait passer par TURN_ACCEL / TURN_DECEL. */
  const st = fresh();
  run(st, { turnDelta: 0.5 }, 1);
  const a1 = st.ang;
  run(st, {}, 20);
  ok("la souris ne laisse AUCUNE inertie de rotation",
    Math.abs(st.ang - a1) < 1e-9, `dérive ${(st.ang - a1).toFixed(6)} rad`);
}
{
  // 200 pixels à MOUSE_SENS doivent produire exactement 200 × sens radians.
  const st = fresh();
  const want = 200 * CFG.MOUSE_SENS;
  run(st, { turnDelta: want }, 1);
  ok("le cap tourne exactement de ce que la main a parcouru",
    Math.abs(Math.abs(st.ang) - want) < 1e-9, `${Math.abs(st.ang).toFixed(4)} rad pour ${want.toFixed(4)} demandés`);
}
{
  /* ⚠️ LE RECALAGE SUR LE COULOIR DOIT SE TAIRE À LA SOURIS. Sinon un joueur
     qui vise un rôdeur en diagonale se fait redresser sur l'axe dès qu'il
     lâche la main — le jeu corrige une visée délibérée, ce qui est le pire
     défaut qu'une aide puisse avoir. */
  const st = fresh();
  st.ang = 0.18;                                   // à 10° de l'axe
  run(st, { fwd: 1, turnDelta: 0.001 }, 1);
  const a1 = st.ang;
  run(st, { fwd: 1, turnDelta: 0.001 }, 6);
  /* Le cap doit avoir bougé EXACTEMENT de ce que la souris a demandé — six
     images à −0,001 rad — et de rien d'autre. Le signe est négatif parce que
     `st.ang -= turnDelta` : pousser la souris à droite fait DÉCROÎTRE l'angle
     (démonstration au 394). La première écriture de ce contrôle attendait
     +0,006 et échouait sur un jeu qui, lui, était juste : un contrôle faux
     accuse le code, et on perd la matinée à chercher dans le code. */
  ok("le recalage sur le couloir se TAIT quand on vise à la souris",
    Math.abs((st.ang - a1) + 0.006) < 1e-6, `cap ${st.ang.toFixed(4)} rad, dérive ${(st.ang - a1).toFixed(4)}`);
}
{
  // ... mais il revient dès que la souris se tait, au clavier seul.
  const st = fresh();
  st.ang = 0.18;
  run(st, { fwd: 1 }, Math.ceil(CFG.SIM_HZ * 1.2));
  ok("... et revient dès que la main s'arrête",
    Math.abs(st.ang) < 0.05, `cap ${st.ang.toFixed(4)} rad`);
}
{
  /* L'ARBALÈTE. Le carreau part DEVANT et va vers le nord quand on regarde au
     nord. Un projectile qui part derrière est le genre de faute de signe qu'on
     ne voit qu'en jouant, et seulement si on regarde au bon moment. */
  const st = fresh();
  st.hasBow = true; st.bolts = 3; st.ang = 0;
  run(st, { shoot: true }, 1);
  const p = st.projectiles[0];
  ok("un carreau part DEVANT le joueur", !!p && p.z < st.pz, p ? `Δz = ${(p.z - st.pz).toFixed(2)}` : "aucun carreau");
  ok("... et il consomme exactement un carreau", st.bolts === 2, `${st.bolts} restants`);
  const z0 = p ? p.z : 0;
  run(st, {}, 3);
  ok("... et il AVANCE (il est simulé, pas instantané)",
    !st.projectiles.length || st.projectiles[0].z < z0 - 1,
    st.projectiles.length ? `Δz = ${(st.projectiles[0].z - z0).toFixed(2)}` : "déjà planté dans un mur");
}
{
  // On ne tire pas sans arme, et on ne tire pas à vide.
  const st = fresh();
  run(st, { shoot: true }, 1);
  ok("on ne tire pas sans arbalète", st.projectiles.length === 0);
  st.hasBow = true; st.bolts = 0;
  run(st, { shoot: true }, 1);
  ok("on ne tire pas sans carreau", st.projectiles.length === 0);
}
{
  /* LA CARTE. Elle se ramasse AU PASSAGE (voir handlePickups) : un joueur qui
     passe devant sans comprendre qu'il fallait appuyer aurait raté le seul
     bonus de navigation du jeu. */
  const m = Maze.generate(CFG, 4242);
  const st = Rules.create(CFG, m, 4242);
  ok("le générateur a bien posé une carte sur un mur", !!st.mapItem,
    st.mapItem ? `cellule ${st.mapItem.x},${st.mapItem.y}` : "aucune");
  if (st.mapItem) {
    const [wx, wz] = Rules.centerOf(CFG, st.mapItem.x, st.mapItem.y);
    st.px = wx; st.pz = wz;
    run(st, {}, 1);
    ok("... et elle se ramasse au PASSAGE, sans appuyer sur rien", st.hasMap === true);
  }
}


/* =============================================================================
   ZIP 405 — LE COMBAT. Ajouté ici plutôt que dans un outil neuf parce que ces
   contrôles disent la même chose que tous les autres de ce fichier : « le jeu
   va-t-il dans le sens que le joueur attend ». Une créature qui se fige pendant
   qu'on la frappe est une commande qui ne répond pas.
   ⚠️ LES QUATRE PREMIERS ÉCHOUENT SUR LE ZIP 404. C'est la condition pour leur
   faire confiance ici (leçon du 404).
   ========================================================================== */
{
  /* 1. LE RÔDEUR NE SE FIGE PLUS DANS VOTRE CASE.
     Maze.pathTo(x,y → x,y) rend [] : toute la locomotion des créatures passait
     par un chemin de cellules, donc un rôdeur entré dans la cellule du joueur
     n'avait plus rien à suivre. Mesuré sur le 404 : 0,000 unité parcourue en
     deux secondes, en mode « chase », au contact. */
  const st = fresh();
  st.invulnT = 999;               // on mesure un déplacement, pas une survie
  const r = st.roamers[0];
  r.dead = false; r.mode = "chase"; r.giveUpT = 9; r.staggerT = 0;
  r.x = st.px + 3.0; r.z = st.pz + 3.0;
  st.torch = 1;
  const bx = r.x, bz = r.z;
  run(st, {}, 60);
  const moved = Math.hypot(r.x - bx, r.z - bz);
  ok("un rôdeur au contact BOUGE encore", moved > 0.5, `${moved.toFixed(2)} u en 2 s`);
}
{
  /* 2. ... ET IL VIENT SUR LE JOUEUR, pas sur le centre de la cellule. Une
     cellule fait 11,5 unités : viser son centre, c'est viser à cinq mètres. */
  const st = fresh();
  /* ⚠️ LE JOUEUR EST RENDU INVULNÉRABLE, ET PAS PAR COMMODITÉ. Sans ça, le
     rôdeur arrive, touche, et hurt() REPOUSSE le joueur de HURT_KNOCKBACK
     (5,0) : la distance mesurée AUGMENTE alors qu'il fait exactement ce qu'on
     lui demande. Le premier lancement de ce contrôle a échoué comme ça, et
     c'est le contrôle qui avait tort — il mesurait le recul du joueur en
     croyant mesurer l'approche de la créature. */
  st.invulnT = 999;
  const r = st.roamers[0];
  r.dead = false; r.mode = "chase"; r.giveUpT = 9; r.staggerT = 0;
  // on met le joueur dans un COIN de sa cellule, loin du centre
  st.px += CFG.CELL * 0.35; st.pz += CFG.CELL * 0.35;
  r.x = st.px - 6.0; r.z = st.pz - 6.0;
  st.torch = 1;
  const d0 = Math.hypot(r.x - st.px, r.z - st.pz);
  run(st, {}, 60);
  const d1 = Math.hypot(r.x - st.px, r.z - st.pz);
  ok("il se rapproche VRAIMENT du joueur, pas du centre de sa case",
    d1 < CFG.BODY_R + CFG.ROAMER_BODY_R + 0.5, `${d0.toFixed(2)} → ${d1.toFixed(2)} u`);
}
{
  /* 3. LE RECUL D'UN COUP JETTE SON CHEMIN. SWING_KNOCKBACK vaut 4,6 : sans
     ça, la créature repart vers un nœud désormais derrière elle. */
  const st = fresh();
  const r = st.roamers[0];
  r.dead = false; r.hp = 9; r.staggerT = 0; r.path = [[0, 0], [1, 1]]; r.pathI = 1;
  r.x = st.px; r.z = st.pz - 2.4;      // droit devant, à portée
  st.hasSword = true; st.swingT = 0; st.swingCd = 0;
  run(st, { attack: true }, 2);
  ok("un rôdeur frappé oublie son chemin (il ne repart pas en arrière)",
    r.path === null || r.path.length === 0, `path = ${JSON.stringify(r.path)}`);
}
{
  /* 4. L'ASSISTANCE À LA VISÉE SERT LES DEUX ARMES. Elle avait été écrite au
     396 pour l'épée ; l'arbalète est arrivée au 397 et personne n'a rebranché
     le fil. La seule arme qui demande de viser était la seule sans aide. */
  const src = fs.readFileSync(path.join(ROOT, "js/rules.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  /* ⚠️ ON RETIRE LA DÉCLARATION AVANT DE COMPTER. Premier jet : le motif
     `aimAssist(st` attrapait aussi `function aimAssist(st)`. Le contrôle
     trouvait donc 2 sur le zip 404 — une déclaration et un seul appel — et
     PASSAIT sur le code fautif. C'est le motif exact du 404 (« un contrôle qui
     énumère des formes ne protège que des formes énumérées ») et la même
     famille de faute : un contrôle qui compte des appels doit d'abord retirer
     ce qui n'en est pas un. */
  const calls = (src.replace(/function\s+aimAssist\s*\([^)]*\)/g, " ")
    .match(/aimAssist\s*\(\s*st/g) || []).length;
  ok("aimAssist est appelée par les DEUX armes", calls >= 2, `${calls} appel(s)`);
  const st = fresh();
  st.hasBow = true; st.bolts = 3; st.boltCd = 0; st.torch = 1;
  const r = st.roamers[0];
  r.dead = false; r.staggerT = 0;
  // une cible LÉGÈREMENT à côté du regard : c'est le cas que l'aide existe pour
  r.x = st.px + 4.0; r.z = st.pz - 16.0;
  const a0 = st.ang;
  run(st, { shoot: true }, 1);
  ok("tirer recale le cap vers une cible proche du regard", Math.abs(st.ang - a0) > 0.01,
    `${(st.ang - a0).toFixed(3)} rad`);
}
{
  /* 5. LE TRAQUEUR : l'épée ne l'entame pas, le carreau si. C'est la ligne de
     partage entre les deux armes, décidée par Guillaume au 405. */
  const st = fresh();
  const s = st.stalker;
  st.stalkerAwake = true; s.staggerT = 0;
  s.x = st.px; s.z = st.pz - 2.4;
  st.hasSword = true; st.swingT = 0; st.swingCd = 0;
  const hp0 = s.hp;
  run(st, { attack: true }, 2);
  ok("l'épée ne fait AUCUN dégât au traqueur (elle le repousse)", s.hp === hp0,
    `${hp0} → ${s.hp}`);
  ok("... mais elle le repousse bien", s.staggerT > 0);
}
{
  const st = fresh();
  const s = st.stalker;
  st.stalkerAwake = true; s.staggerT = 0;
  s.x = st.px; s.z = st.pz - 14.0;
  st.hasBow = true; st.bolts = 9; st.boltCd = 0;
  let shots = 0;
  while (!s.dead && shots < 12) { st.boltCd = 0; run(st, { shoot: true }, 20); shots++; }
  ok("le traqueur tombe à l'arbalète", s.dead === true, `${shots} tir(s)`);
  ok("... et il faut PLUSIEURS carreaux", CFG.STALK_HP >= 3, `STALK_HP = ${CFG.STALK_HP}`);
  ok("... et il cesse alors de chasser", st.stalkerAwake === false);
  ok("... et le voile rouge s'éteint", Rules.dread(st) === 0);
}
{
  /* 6. LE CARREAU TUE UN RÔDEUR D'UN SEUL COUP. Déjà vrai au 397 (2 dégâts
     pour 2 PV) ; on le fige, parce que « one shot les monstres » est une
     demande explicite de Guillaume et qu'un réglage de PV suffirait à la
     défaire sans bruit. */
  ok("un carreau tue un rôdeur d'un seul coup", CFG.BOLT_DAMAGE >= CFG.ROAMER_HP,
    `${CFG.BOLT_DAMAGE} dégâts pour ${CFG.ROAMER_HP} PV`);
  /* ⚠️ UNE MARGE DE 15 %, PAS « PLUS LOIN QUE ». Au 404 la portée valait 86,8
     pour 85 unités de vue : le contrôle « strictement supérieur » passait,
     avec 1,8 unité d'avance, c'est-à-dire rien. Un carreau tiré sur une
     silhouette au fond d'une galerie mourait de vieillesse à un pas d'elle, et
     EN SILENCE. Un seuil qui passe de justesse sur un défaut réel est un
     seuil faux. */
  const reach = CFG.BOLT_SPEED * CFG.BOLT_LIFE_MS / 1000;
  ok("un carreau porte franchement plus loin que la vue", reach > CFG.FOG_FAR_FULL * 1.15,
    `${reach.toFixed(0)} u pour ${CFG.FOG_FAR_FULL} u de vue (seuil ${(CFG.FOG_FAR_FULL * 1.15).toFixed(0)})`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LA COUTURE ENTRE L'ENTRÉE ET LE MOTEUR (416) — LE CONTRÔLE QUI MANQUAIT.
   ──────────────────────────────────────────────────────────────────────────────
   Tout ce qui précède teste `rules.js` en lui FOURNISSANT `turnDelta` en
   radians. C'est nécessaire et ce n'est pas suffisant : pendant vingt zips,
   `js/input.js` a envoyé des PIXELS dans ce paramètre, parce que sa variable
   `sens` valait 1 et que `CFG.MOUSE_SENS` n'était lue nulle part. La souris
   tournait à 57° par pixel, le jeu était injouable à la main, et TOUS LES
   CONTRÔLES CI-DESSUS PASSAIENT — ils passaient même parfaitement, puisque le
   moteur, lui, était juste.

   ⚠️ LA RÈGLE : UN TEST QUI FABRIQUE SES PROPRES ENTRÉES NE TESTE PAS LEUR
   PROVENANCE. Chaque fois qu'un banc d'essai remplace un module par une valeur
   écrite à la main, il crée exactement là un angle mort — et c'est justement là
   que se logent les défauts, parce que c'est la seule partie du code que
   personne ne regarde jamais.

   `input.js` ne peut pas tourner ici (il lui faut `window`, `document` et un
   canvas). On lit donc son TEXTE : c'est grossier, ça ne prouve pas que le
   calcul est juste, mais ça prouve que la constante est LUE — et c'est
   exactement ce qui manquait. Un contrôle grossier au bon endroit vaut mieux
   qu'un contrôle exact au mauvais.
   ══════════════════════════════════════════════════════════════════════════ */
{
  const src = fs.readFileSync(path.join(ROOT, "js/input.js"), "utf8");
  ok("⚠️ l'ENTRÉE convertit bien les pixels en radians (elle lit CFG.MOUSE_SENS)",
    /sens\s*=\s*CFG\.MOUSE_SENS/.test(src),
    /sens\s*=\s*CFG\.MOUSE_SENS/.test(src) ? "" : "js/input.js n'utilise pas CFG.MOUSE_SENS — la souris tournera en RADIANS PAR PIXEL");
  ok("... et la zone de précision du pavé tactile est branchée",
    /CFG\.MOUSE_FINE/.test(src) && /CFG\.MOUSE_SOFT/.test(src));
  /* La borne haute : la courbe de précision ne doit jamais AMPLIFIER. On
     rejoue sa formule ici — c'est la seule partie qu'on puisse vérifier sans
     navigateur, et c'est la seule qui pourrait rendre le regard imprévisible. */
  let worst = 0;
  for (let px = 0; px <= 400; px += 1) {
    const k = CFG.MOUSE_FINE + (1 - CFG.MOUSE_FINE) * Math.min(1, px / CFG.MOUSE_SOFT);
    worst = Math.max(worst, k);
  }
  ok("... et elle n'AMPLIFIE jamais : le gain reste borné par MOUSE_SENS",
    worst <= 1 + 1e-9, `gain maximal ${worst.toFixed(3)} × MOUSE_SENS`);
  ok("... sans créer de centre mort (un geste minuscule tourne encore)",
    CFG.MOUSE_FINE >= 0.25, `MOUSE_FINE = ${CFG.MOUSE_FINE}`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   LE SILLAGE DE SORTIE (416) — cinq questions, toutes posées en français.
   ──────────────────────────────────────────────────────────────────────────────
   ⚠️ ON DÉCLENCHE LE SILLAGE EN INCRÉMENTANT `st.kills` À LA MAIN, et ce n'est
   pas de la triche : c'est précisément la couture qu'on veut vérifier. Le
   moteur ne réagit pas à « un carreau a touché » ni à « l'épée a porté » mais au
   COMPTEUR, justement pour qu'un quatrième site de mise à mort n'ait rien à
   brancher. Tester en tuant vraiment un rôdeur vérifierait un chemin d'appel
   particulier ; tester par le compteur vérifie la règle.
   ══════════════════════════════════════════════════════════════════════════ */
{
  const st = fresh();
  const m = st.m;
  const cell = [Math.floor(st.px / CFG.CELL), Math.floor(st.pz / CFG.CELL)];
  st.kills++;
  run(st, {}, 1);
  ok("⚠️ tuer un ennemi allume un chemin vers la sortie",
    !!(st.trail && st.trail.cells && st.trail.cells.length), st.trail ? `${st.trail.cells.length} cases` : "aucun sillage");

  if (st.trail) {
    const last = st.trail.cells[st.trail.cells.length - 1];
    ok("... et ce chemin arrive BIEN à la porte de sortie",
      last[0] === m.exit.x && last[1] === m.exit.y,
      `fin en (${last[0]},${last[1]}) pour une sortie en (${m.exit.x},${m.exit.y})`);

    /* ⚠️ « LE PLUS COURT CHEMIN » EST UNE PROMESSE, PAS UNE INTENTION. On la
       mesure en refaisant le parcours en largeur depuis la même case : un BFS
       rend par construction le plus court chemin, donc toute longueur
       supérieure trahirait un chemin bricolé. */
    const ref = Maze.pathTo(m, cell[0], cell[1], m.exit.x, m.exit.y);
    ok("... et c'est le PLUS COURT, pas un chemin quelconque",
      ref && st.trail.cells.length === ref.length,
      `${st.trail.cells.length} cases contre ${ref ? ref.length : "?"} au plus court`);

    /* Les deux durées, et elles sont distinctes : PLEIN jusqu'à dix secondes,
       puis fondu, puis plus rien à quinze. Un seul nombre ne pourrait pas
       exprimer les deux, et c'est exactement ce que demandait Guillaume. */
    const a = fresh(); a.kills++;
    run(a, {}, Math.round(CFG.SIM_HZ * 9.5));
    ok("... il tient encore à 9,5 s (dix secondes PLEINES)",
      !!a.trail, a.trail ? `âge ${a.trail.t.toFixed(1)} s` : "déjà éteint");
    const b = fresh(); b.kills++;
    run(b, {}, Math.round(CFG.SIM_HZ * 15.5));
    ok("... et il a totalement disparu à 15,5 s",
      !b.trail, b.trail ? `encore là, âge ${b.trail.t.toFixed(1)} s` : "");
  }
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nToutes les commandes vont dans le bon sens.\n");
console.log(`Ce script ne dit RIEN du confort réel : il dit que chaque commande
va dans le sens que le joueur attend, que le recalage aide sans jamais prendre
la main, et que la passerelle puis la herse font ce qu'elles promettent. Le
confort, lui, se juge une manette à la main.\n`);
process.exit(fails ? 1 : 0);
