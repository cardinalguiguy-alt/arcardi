/* ==========================================================================
   verify-devworld.mjs — ZIP 392
   ==========================================================================
   CE QU'IL PROUVE, et pourquoi aucune relecture ne pourrait le faire.

   La promesse du menu développeur n'est pas « une constante vaut candy ». Elle
   est : « quand l'hôte force une terre, SON PARTENAIRE VOIT LA MÊME, quel que
   soit le jour de sa propre ferme — et rétablir la rotation redonne EXACTEMENT
   la terre que le jeu aurait donnée sans forçage ».

   Aucune constante ne dit ça. Ce script fait donc tourner la VRAIE
   `passageWorldIndex` du VRAI `fermeEngine.js`, sur 15 000 jours de jeu, pour
   deux clients simulés dont les fermes ne sont pas au même jour — ce qui est le
   cas de figure exact que le commentaire de PASSAGE_FORCE_KEY (zip 385) décrit
   comme « précisément ce qu'il ne faut pas ».

   CORROLAIRE N°5 DU ZIP 387, RESPECTÉ : aucune copie locale de quoi que ce
   soit. `passageWorldIndex`, `setForcedPassageKey`, `passageBlockOf` et
   `PASSAGE_WORLDS` sont importés du moteur et des constantes du jeu. Si
   quelqu'un change la cadence de rotation ou ajoute une sixième terre, ce
   script suit sans être touché.

   CE QU'IL NE PROUVE PAS, et qu'il faut regarder à la main :
     - rien de l'INTERFACE du menu (boutons, libellés, bandeau) ;
     - rien du RACCOURCI clavier ni de son absence de conflit navigateur —
       ça ne se vérifie qu'en le pressant dans Safari et dans Chrome ;
     - rien des TÉLÉPORTS : ils touchent m.zone et la machine à fondu, qui
       vivent dans FermeGame.js et demandent un navigateur.

   Lancer :  node public/templerun/tools/verify-devworld.mjs
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* Même contournement que verify-petplay.mjs et render-flowers.mjs, recopié et
   non réinventé : les modules du jeu s'importent entre eux SANS extension
   (`from "./fermeConstants"`), ce que Next.js résout et que Node ESM refuse.
   On recopie les fichiers dans un dossier temporaire en réécrivant les imports.
   Aucune autre transformation : le code exécuté est celui du jeu. */
const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-devworld-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeArt.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log((ok ? "  OK    " : "  ÉCHEC ") + label + (detail ? "   " + detail : ""));
}

const N_DAYS = 15000;
const KEYS = C.PASSAGE_WORLDS.map(w => w.key);

console.log("=== verify-devworld.mjs (zip 392) ===");
console.log(`${KEYS.length} terres, rotation de ${C.PASSAGE_WORLD_DAYS} jours, ${N_DAYS} jours simulés\n`);

/* --- 1. Sans forçage, l'index est EXACTEMENT la rotation naturelle. -------
   C'est le contrôle de non-régression le plus important du zip : le forçage ne
   doit rien changer tant que personne ne s'en sert. PASSAGE_FORCE_KEY vient
   d'être repassée à null, donc « pas de forçage » doit valoir « rotation ». */
E.setForcedPassageKey(null);
let mismatch = 0;
for (let day = 1; day <= N_DAYS; day++) {
  const natural = E.passageBlockOf(day) % C.PASSAGE_WORLDS.length;
  if (E.passageWorldIndex(day) !== natural) mismatch++;
}
check("sans forçage, l'index suit la rotation du jour", mismatch === 0, `${N_DAYS - mismatch}/${N_DAYS} jours`);
check("PASSAGE_FORCE_KEY est bien revenue à null", C.PASSAGE_FORCE_KEY === null, `valeur = ${JSON.stringify(C.PASSAGE_FORCE_KEY)}`);

/* --- 2. Sous forçage, DEUX CLIENTS À DES JOURS DIFFÉRENTS voient la même
   terre. C'est la promesse centrale. On simule l'hôte au jour dh et l'invité
   au jour dg, sur toutes les paires d'un cycle complet, pour chaque terre. */
let agree = 0, disagree = 0;
for (const key of KEYS) {
  E.setForcedPassageKey(key);
  const expected = KEYS.indexOf(key);
  for (let dh = 1; dh <= 60; dh++) {
    for (let dg = 1; dg <= 60; dg++) {
      const a = E.passageWorldIndex(dh);   // ce que calcule l'hôte
      const b = E.passageWorldIndex(dg);   // ce que calcule l'invité
      if (a === b && a === expected) agree++; else disagree++;
    }
  }
}
check("sous forçage, hôte et invité voient la même terre", disagree === 0, `${agree} paires de jours d'accord, ${disagree} divergences`);

/* --- 3. Le forçage est RÉVERSIBLE au jour près. Après avoir forcé puis
   rétabli, on doit retomber sur la terre naturelle — pas sur « une » terre. */
let restoreKo = 0;
for (let day = 1; day <= 3000; day++) {
  const before = (E.setForcedPassageKey(null), E.passageWorldIndex(day));
  E.setForcedPassageKey(KEYS[day % KEYS.length]);   // on force n'importe quoi
  E.setForcedPassageKey(null);                       // "Rétablir"
  if (E.passageWorldIndex(day) !== before) restoreKo++;
}
check("rétablir la rotation redonne exactement la terre naturelle", restoreKo === 0, `${3000 - restoreKo}/3000 jours`);

/* --- 4. Une clé INCONNUE ne doit jamais forcer quoi que ce soit. C'est le
   filet contre une sauvegarde portant une terre supprimée depuis : elle doit
   se lire « rotation normale », jamais planter ni figer une terre au hasard.
   Même discipline que `ensureFarmerShape` avec f.inv.petOffer au zip 388. */
let junkKo = 0;
for (const junk of ["", "atlantis", "EVIL", "candy ", null, undefined, 0, 42, {}, []]) {
  E.setForcedPassageKey(junk);
  if (E.getForcedPassageKey() !== null) junkKo++;
  for (let day = 1; day <= 40; day++) {
    if (E.passageWorldIndex(day) !== E.passageBlockOf(day) % C.PASSAGE_WORLDS.length) junkKo++;
  }
}
check("une clé inconnue retombe sur la rotation, sans planter", junkKo === 0, `10 valeurs douteuses testées`);

/* --- 5. Le CRÉNEAU ne doit pas bouger sous forçage. `passageBlockOf` est le
   jeton « une fois par venue » du trésor du Gourmandin (zip 385) : s'il suivait
   le forçage, ouvrir le menu deux fois rendrait 10 000 pièces rejouables à
   volonté. Il ne doit dépendre que du jour. */
let blockKo = 0;
for (const key of [null, ...KEYS]) {
  E.setForcedPassageKey(key);
  for (let day = 1; day <= 200; day++) {
    if (E.passageBlockOf(day) !== Math.floor((day - 1) / C.PASSAGE_WORLD_DAYS)) blockKo++;
  }
}
check("le créneau anti-farm reste indépendant du forçage", blockKo === 0, "le trésor du Gourmandin reste non rejouable");

/* --- 6. Chaque terre forcée donne bien SA destination de pont et SON familier.
   C'est ce que le menu affiche sous chaque ligne : si l'affichage et le moteur
   divergeaient, on montrerait « défi de fuite » sur une terre qui n'y mène pas. */
let destKo = 0;
for (const key of KEYS) {
  E.setForcedPassageKey(key);
  const spec = C.PASSAGE_WORLDS[E.passageWorldIndex(1)];
  if (spec.key !== key) destKo++;
  if (E.passagePetOf(1) !== ((spec.pet && spec.pet.id) || null)) destKo++;
}
E.setForcedPassageKey(null);
const withDest = KEYS.filter(k => C.PASSAGE_GATE_DEST[k]).length;
check("terre forcée -> bon habillage, bonne destination, bon familier", destKo === 0,
  `${withDest}/${KEYS.length} terres ont une destination de pont`);

/* --- 7. Le défi de fuite est bien atteignable de nouveau. Sous l'ancien
   forçage "candy", la SEULE terre menant au défi (evil, depuis le zip 386)
   était inaccessible. C'est la conséquence concrète de la remise à null. */
E.setForcedPassageKey(null);
let sawEvil = false, sawAll = new Set();
for (let day = 1; day <= C.PASSAGE_WORLD_DAYS * KEYS.length; day++) {
  const k = C.PASSAGE_WORLDS[E.passageWorldIndex(day)].key;
  sawAll.add(k);
  if (C.PASSAGE_GATE_DEST[k] === "run") sawEvil = true;
}
check("un cycle complet fait passer par les 5 terres", sawAll.size === KEYS.length, `${sawAll.size}/${KEYS.length}`);
check("le défi de fuite est de nouveau atteignable sans forçage", sawEvil);

/* --- 8. LES TÉLÉPORTS DU MENU POSENT-ILS LE JOUEUR SUR UNE CASE VALIDE ?
   Un téléport qui dépose le fermier dans l'eau ou dans un rocher est un
   téléport cassé, et ça ne se voit pas en relisant une constante : la carte est
   GÉNÉRÉE, différemment pour chacune des cinq terres. On génère donc les cinq
   cartes avec la vraie `generatePassageWorld` et on regarde où l'on atterrit.

   DIVERGENCE DÉCLARÉE (corollaire n°5 du zip 387) : `blockedEvil` vit dans la
   closure de la boucle de rendu de FermeGame.js et n'est pas importable. La
   copie ci-dessous est la même que celle de verify-gate.mjs, qui déclare déjà
   cette divergence — on ne réinvente pas une seconde règle de collision. */
function blockedEvil(w, x, y) {
  const W = C.EVIL_MAP_W, H = C.EVIL_MAP_H;
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  const i = y * W + x;
  if (w.ground[i] === C.G_WATER) return true;
  const o = w.objects[i];
  return o === C.O_TREE || o === C.O_DEADTREE || o === C.O_ROCK || o === C.O_STUMP;
}
{
  let landKo = 0, onTrigger = 0;
  const targets = [
    ["🌀 la terre en cours", C.EVIL_SPAWN.x, C.EVIL_SPAWN.y],
    ["🌉 le pied du pont", C.RUN_GATE.x - C.DEV_BRIDGE_OFFSET, C.RUN_GATE.y],
  ];
  for (let idx = 0; idx < C.PASSAGE_WORLDS.length; idx++) {
    const w = E.generatePassageWorld(idx);
    for (const [, tx, ty] of targets) if (blockedEvil(w, Math.floor(tx), Math.floor(ty))) landKo++;
  }
  // Le pied du pont ne doit surtout PAS tomber sur la dalle de déclenchement :
  // marcher dessus lance l'embuscade puis le mini-jeu de la terre. On veut
  // arriver À CÔTÉ, pour voir le pont et choisir de l'emprunter.
  if (C.RUN_GATE.x - C.DEV_BRIDGE_OFFSET === C.RUN_GATE.x) onTrigger++;
  check("les 2 arrivées de téléport sont libres sur les 5 terres", landKo === 0,
    `${C.PASSAGE_WORLDS.length * targets.length - landKo}/${C.PASSAGE_WORLDS.length * targets.length} cases praticables`);
  check("le pied du pont n'est pas la dalle de déclenchement", onTrigger === 0,
    `${C.DEV_BRIDGE_OFFSET} cases à l'ouest de RUN_GATE`);
}

console.log("\n" + (failures
  ? `${failures} CONTRÔLE(S) EN ÉCHEC`
  : "Tous les contrôles passent."));
process.exit(failures ? 1 : 0);
