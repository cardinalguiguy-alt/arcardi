/* =============================================================================
   boulistes.js — LE BOULODROME, LOT 4 : LE CLUB DES BOULISTES DE VALLEY TOWN (2026-11-01). PUR — ni React, ni canevas, ni réseau.
   -----------------------------------------------------------------------------
   Ses verdicts (docs/PROJETS.md §11, page https://claude.ai/artifact/FjZkm6oWF1bGbDZs8vDRgd) : TROIS PERSONNAGES NEUFS, des retraités
   de la ville (il a écarté les habitants du roster) ; présents chaque jour de 14 h à 22 h de jeu, ils finissent la partie commencée ;
   pas sous la neige, oui sous la pluie ; une adresse fixe par personne ; des répliques rares, aux moments forts — sa note : « ajoute de
   nouvelles répliques comiques, et même en anglais, avec des expressions du sud de la France » ; la prime 100 / 200 / 400 or selon
   l'adversaire, la première victoire contre chacun chaque jour (heure de Paris), rien à perdre ; chacun retient le bilan.
   Le casting est le mien (il m'a laissé en autonomie : « surprends-moi ») — et chacun joue comme il a vécu (la mémoire : « une raison de
   PNJ se tire de ce qu'il fait déjà ») :
   · FERNAND, l'ancien géomètre du cadastre : il a mesuré la vallée au centimètre — il lâche pile sur la marque (le fort), il tire, il
     grogne, il annonce les distances ;
   · MIREILLE, l'institutrice à la retraite : elle compte les points à voix haute et n'en laisse passer aucun (la moyenne, joueuse) ;
   · TOINOU, l'ancien pêcheur du lac : il raconte ses prises plus qu'il ne vise (le débutant), il applaudit les beaux coups, même ceux
     des autres.
   ⚠️ RIEN NE VOYAGE POUR EUX hors des lancers : leur présence est une pure fonction de l'heure du jeu (que chacun lit sur le même
   `dayStartAt`), leur place une pure fonction de la partie (`BJ.placeDe`), leurs répliques un tirage sur la graine de la partie et le
   numéro du lancer. Seuls leurs LANCERS partent de l'hôte, comme ceux d'un joueur (`bouloBot.js`).
   ========================================================================== */
import * as BD from "./boulodrome.mjs";

export const CLUB = [
  { id: "pnj:fernand", nom: "Fernand", niveau: "fort", gender: "m", outfit: 7, overalls: false, cap: false, look: "^881" },     // raie sur le côté, argent, moustache
  { id: "pnj:mireille", nom: "Mireille", niveau: "moyen", gender: "f", outfit: 4, overalls: false, cap: false, look: "^490" },  // chignon platine
  { id: "pnj:toinou", nom: "Toinou", niveau: "debutant", gender: "m", outfit: 6, overalls: true, cap: true, look: "^584" },     // court, argent, barbe fournie, casquette de pêcheur
];
export const membre = (id) => CLUB.find((c) => c.id === id) || null;
export const estMembre = (id) => !!membre(id);

/* ── L'HORAIRE ── (minutes de jeu ; un jour = 16 min réelles de 6 h à 2 h : 14 h–22 h ≈ 6 min 24 s réelles) */
export const ARRIVEE_MIN = 14 * 60, DEPART_MIN = 22 * 60;
/** Le club est-il « de sortie » à cette heure du jeu ? (La partie commencée se finit : l'appelant le sait par les sessions.) */
export const deSortie = (min, enneige) => !enneige && min >= ARRIVEE_MIN && min < DEPART_MIN;

/* ── OÙ ILS SE TIENNENT (cases ; le PIED du personnage) ──
   Ils arrivent par le jardin de la mairie, à l'ouest des pistes (entre les massifs et le premier madrier), et s'y en retournent. Au
   repos, sur les bancs de planches du nord, face aux pistes : les deux places du banc du milieu, et la place est du banc de l'ouest.
   `seat` suit la convention des bancs de la ville (−0,5 ou +0,5 : `TOWN_SEATS_PER_BENCH` = 2). */
export const ENTREE = { x: 97.5, y: 38.4 };
export const SIEGES = [
  { b: BD.BOULO_BENCHES[1], seat: -0.5 },
  { b: BD.BOULO_BENCHES[1], seat: 0.5 },
  { b: BD.BOULO_BENCHES[0], seat: 0.5 },
];
export const siegeDe = (id) => SIEGES[Math.max(0, CLUB.findIndex((c) => c.id === id))];

/* ── LES PARTIES DU CLUB ── (deux jouent, le troisième attend sur le banc ; on tourne) */
export const CLUB_CIBLE = 7;
export const PAIRES = [[0, 1], [1, 2], [0, 2]];
export const paireDu = (n) => PAIRES[((n | 0) % PAIRES.length + PAIRES.length) % PAIRES.length].map((i) => CLUB[i]);
export const CLUB_FIN_MS = 7000;      // la partie du club finie : le temps de l'ardoise, puis on range
export const CLUB_PAUSE_MS = 15000;   // … et le temps d'un verre avant la suivante
export const DEFI_MS = 120000;        // un défi qui attend la fin de leur mène plus longtemps que ça est oublié

/* ── L'ENJEU ── */
export const PRIME = { fort: 400, moyen: 200, debutant: 100 };
export const primeDe = (id) => { const m = membre(id); return m ? PRIME[m.niveau] : 0; };
/** Le jour de Paris (entier) d'un instant — le plafond « la première victoire contre chacun, chaque jour ». `offMin` : le décalage
    de Paris (`CH.parisOffsetMin`), passé par l'appelant pour garder ce fichier sans dépendance. */
export const jourDeParis = (ms, offMin) => Math.floor((ms + offMin * 60000) / 86400000);
/** Le bilan d'un joueur contre un habitant : { v, d, pd } (victoires, défaites, jour de la dernière prime). */
export function bilanDe(bilans, pid, hid) {
  const b = bilans && bilans[pid] && bilans[pid][hid];
  return { v: (b && b.v) | 0, d: (b && b.d) | 0, pd: (b && b.pd) | 0 };
}
/** La fin d'une partie contre des habitants : le bilan de chaque joueur contre chaque habitant adverse, et les primes. Écrit dans
    `bilans` (l'état partagé, sauvegardé avec la ferme) ; rend [{ pid, hid, prime }] — une prime par joueur gagnant, celle du plus
    fort des habitants battus, si ce joueur ne l'a pas déjà touchée aujourd'hui contre CET habitant. */
export function solder(bilans, partie, jour) {
  const out = [];
  if (!partie || partie.gagnant === null || partie.gagnant === undefined) return out;
  const camps = partie.camps;
  for (let c = 0; c < camps.length; c++) for (const pid of camps[c].joueurs) {
    if (estMembre(pid)) continue;
    const adv = [];
    for (let k = 0; k < camps.length; k++) if (k !== c) for (const h of camps[k].joueurs) if (estMembre(h)) adv.push(h);
    if (!adv.length) continue;
    const mine = bilans[pid] || (bilans[pid] = {});
    for (const h of adv) {
      const b = mine[h] || (mine[h] = { v: 0, d: 0, pd: 0 });
      if (c === partie.gagnant) b.v = (b.v | 0) + 1; else b.d = (b.d | 0) + 1;
    }
    if (c !== partie.gagnant) continue;
    let fort = adv[0];
    for (const h of adv) if (primeDe(h) > primeDe(fort)) fort = h;
    if ((mine[fort].pd | 0) === jour) continue;
    mine[fort].pd = jour;
    out.push({ pid, hid: fort, prime: primeDe(fort) });
  }
  return out;
}

/* ── LES RÉPLIQUES ──
   Les textes vivent dans `fermeStrings.js` (`bouloBarks`, FR et EN, par personne et par moment) ; ici, QUI parle et QUAND. Rares par
   construction : un moment n'est dit qu'une fois sur deux en moyenne (le tirage), et jamais deux fois en huit secondes par la même
   bouche (l'appelant tient la cadence). Le tirage est un entier de la graine de la partie et du numéro du lancer : tous les écrans
   choisissent la même phrase au même moment, sans un message. */
export const BARK_MS = 4200, BARK_PAUSE_MS = 8000;
export const MOMENTS = ["arrive", "defi", "bilan0", "bilanJ", "bilanH", "carreau", "subit", "colle", "rate", "mene", "gagne", "perd", "fanny", "beau", "depart", "cede", "mesure"];
export function tirageReplique(graine, coups, salt) {
  let h = (graine >>> 0) ^ Math.imul(((coups | 0) + 7) | 0, 2246822519) ^ Math.imul((salt | 0) + 3, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 2654435761);
  return (h ^ (h >>> 13)) >>> 0;
}
/** Dit-on ce moment ? (une fois sur deux, sauf les moments qu'on ne tait jamais : le défi, la fin de partie, la Fanny) */
export const onLeDit = (moment, t) => ["defi", "bilan0", "bilanJ", "bilanH", "gagne", "perd", "fanny", "cede", "mesure"].includes(moment) || (t & 1) === 0;
/** La phrase : `lignes` est la table d'une personne (`L.bouloBarks[nom]`), `t` le tirage ; `{v}` / `{d}` : le bilan du joueur. */
export function phrase(lignes, moment, t) {
  const l = lignes && lignes[moment];
  if (!l || !l.length) return null;
  return l[(t >>> 1) % l.length];
}
