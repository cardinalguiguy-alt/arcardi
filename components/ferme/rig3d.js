"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   LES OS — LA CINÉMATIQUE INVERSE, ÉCRITE UNE FOIS POUR TOUT LE DÉPÔT.
   ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ POURQUOI CE FICHIER NAÎT, ET C'EST LA SEULE CHOSE À RETENIR : il y a
   maintenant DEUX personnages articulés en 3D dans ce jeu — le maire à son
   bureau (`maireBureau.js`) et Tristan à sa scie (`scierieAtelier.js`) — et le
   solveur de bras est une ROUTINE MATHÉMATIQUE, pas un réglage. Deux copies
   d'une loi des cosinus divergent toujours : la première fois qu'on corrige un
   repli dégénéré, un choix de coude ou une longueur d'os, on ne le corrige que
   d'un côté, et le second personnage garde le défaut jusqu'à ce que quelqu'un
   le regarde. C'est très exactement le §8 de `CLAUDE.md` — *un paramètre qui
   double un autre paramètre est une divergence en attente* — appliqué à du
   code plutôt qu'à un nombre.
   ⚠️ CE QUI RESTE PROPRE À CHAQUE PERSONNAGE, ET QUI NE MONTE PAS ICI : les
   LONGUEURS d'os. Le maire et le bûcheron n'ont pas le même bras, et ces deux
   nombres doivent rester à côté des boîtes qui les dessinent — sinon on
   retrouve le défaut inverse, une longueur écrite loin de l'os qu'elle décrit
   (`ARM_FORE` mentait d'un centimètre, 2026-08-31).

   ⚠️ `THREE` N'EST JAMAIS IMPORTÉ ICI NON PLUS : la bibliothèque est vendorisée
   en `<script>` (r128), et deux copies dans une page ne ressemblent à rien.
   Ce fichier ne fait que de l'arithmétique sur des objets qu'on lui passe.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── LE GLISSEMENT VERS UNE CIBLE. Sorti de `maireBureau.js` sans une virgule de
   changement : `1 - Math.pow(k, dt)` plutôt que `dt * k`, sinon la même pose met
   deux fois plus de temps à 30 images/s qu'à 60 et le réglage fait à 60 est faux
   partout ailleurs. ⚠️ ON INTERPOLE LES TABLEAUX ÉLÉMENT PAR ÉLÉMENT (ce sont
   des cibles de MAIN, en mètres) : glisser sur les angles ferait décrire à la
   main un ARC au lieu d'un segment. ── */
export function ease(cur, want, dt, speed) {
  const a = 1 - Math.pow(0.0001, dt * (speed || 1));
  for (const k in want) {
    const w = want[k];
    if (Array.isArray(w)) {
      let c = cur[k]; if (!Array.isArray(c)) c = cur[k] = w.slice();
      for (let i = 0; i < w.length; i++) c[i] += (w[i] - c[i]) * a;
    } else {
      cur[k] = (cur[k] || 0) + ((w || 0) - (cur[k] || 0)) * a;
    }
  }
  return cur;
}

/* ⚠️⚠️⚠️ UNE TABLE DE RÉFÉRENCE QU'ON ÉTALE À PLAT EST UNE TABLE QU'ON MODIFIE.
   `{ ...POSE.x }` recopie la RÉFÉRENCE des tableaux, et `ease` écrit dedans —
   donc dans la table elle-même, qui se corrompt à la première image. Trouvé le
   2026-08-31 sur le maire, sans aucun symptôme sur le moment (les nombres
   restaient plausibles). C'est la parade, et elle vaut pour toute table de pose
   du dépôt. */
export function poseCopy(p) {
  const out = {};
  for (const k in p) out[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
  return out;
}

/* ── LES VECTEURS DE TRAVAIL. ⚠️ ALLOUÉS UNE FOIS PAR PERSONNAGE, jamais dans le
   solveur : un `new Vector3()` par bras et par image, c'est sept cents
   allocations par seconde et un ramasse-miettes qui tousse toutes les vingt
   secondes — exactement au moment où le personnage force. ── */
export function rigScratch(THREE) {
  return { v: new THREE.Vector3(), d: new THREE.Vector3(), x: new THREE.Vector3(),
           y: new THREE.Vector3(), z: new THREE.Vector3(), hint: new THREE.Vector3(),
           m: new THREE.Matrix4() };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE BRAS — DEUX OS, UNE CIBLE, ET UN CHOIX DE COUDE
   ───────────────────────────────────────────────────────────────────────────
   `arm` : { sh, el } — l'épaule et le coude, deux `Group` déjà accrochés.
   `frame` : l'objet dans le repère duquel la cible est ramenée (le BUSTE) ;
             c'est ce qui fait que se pencher emmène les bras sans les décrocher.
   `target` : [x, y, z] EN MONDE, la main.
   `out` : de quel côté sort le coude. `side` : −1 gauche, +1 droit.

   ⚠️⚠️ IL BORNE LA CIBLE HORS DE PORTÉE, ET C'EST DÉLIBÉRÉ : un `acos` hors
   bornes ferait disparaître le bras entier. La contrepartie est écrite dans
   `render-maire` §3 et vaut ici aussi — *une garde qui borne au lieu de jeter
   doit être MESURÉE, sinon elle cache ce qu'elle protège* : le banc compare
   toujours la main RENDUE à la main ÉCRITE.
   ⚠️ LE REPLI DÉGÉNÉRÉ RESPECTE `side`. Quand la cible s'aligne avec `hint` le
   produit vectoriel s'effondre ; un repli qui choisirait +X monde plierait le
   coude GAUCHE dans le plan du bras droit — un bras inversé « parfois », donc
   introuvable en regardant une seule pose (signalé par Guillaume, corrigé le
   2026-08-31).
   ═══════════════════════════════════════════════════════════════════════════ */
export function solveArm(T, frame, arm, target, out, side, upper, fore) {
  if (!target) return;
  T.v.set(target[0], target[1], target[2]);
  frame.worldToLocal(T.v);
  T.v.sub(arm.sh.position);

  const dMax = (upper + fore) * 0.995;
  const dMin = Math.abs(upper - fore) + 0.02;
  let d = T.v.length();
  if (d < 1e-4) { T.v.set(0, -dMin, 0); d = dMin; }
  else if (d > dMax) { T.v.multiplyScalar(dMax / d); d = dMax; }
  else if (d < dMin) { T.v.multiplyScalar(dMin / d); d = dMin; }

  /* l'angle du coude par la loi des cosinus. `bend` est ce dont l'avant-bras
     s'écarte du prolongement du bras : zéro = tendu. */
  const cosB = (upper * upper + fore * fore - d * d) / (2 * upper * fore);
  const bend = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosB)));
  const A = Math.acos(Math.max(-1, Math.min(1,
    (upper * upper + d * d - fore * fore) / (2 * upper * d))));

  const dir = T.d.copy(T.v).normalize();
  T.hint.set(side * (out >= 0 ? 1 : -1), 0.15, out >= 0 ? -0.55 : 0.75).normalize();
  T.x.copy(dir).cross(T.hint);
  if (T.x.lengthSq() < 1e-6) T.x.set(side, 0, 0);
  T.x.normalize();
  T.y.copy(dir).multiplyScalar(-1);                 // le bras pointe vers −Y
  T.z.copy(T.x).cross(T.y).normalize();
  T.m.makeBasis(T.x, T.y, T.z);
  arm.sh.quaternion.setFromRotationMatrix(T.m);
  arm.sh.rotateX(A);
  arm.el.rotation.set(-bend, 0, 0);
}

/* ── LA DISTANCE D'UNE MAIN RENDUE À SA CIBLE, EN MÈTRES. ⚠️ ELLE EXISTE POUR
   LES BANCS ET POUR EUX SEULS : c'est la seule façon de prendre la garde
   ci-dessus en flagrant délit de bornage silencieux. ── */
export function handError(THREE, hand, target, v) {
  hand.updateMatrixWorld(true);
  const p = (v || new THREE.Vector3()).setFromMatrixPosition(hand.matrixWorld);
  return Math.hypot(p.x - target[0], p.y - target[1], p.z - target[2]);
}
