/* ==========================================================================
   FERME VALLÉE (jeu 22) — sprites pixel-art générés par code (style Stardew).
   ==========================================================================
   Portage FIDÈLE des sprites de la maquette validée. Tout est dessiné sur des
   canvases hors-écran. Comme cela dépend de `document`, on n'exécute rien à
   l'import : `buildSprites()` est appelé côté client une seule fois après le
   montage (voir FermeGame.js). Aucune image bitmap : signature CSS/canvas pur
   du site respectée.
   ========================================================================== */

import * as C from "./fermeConstants";
/* ⚠️⚠️ ZIP 439 — LES SPRITES DE LA PLANCHE DE RÉFÉRENCE, EN DONNÉES. Fichier
   GÉNÉRÉ par `tools/import-planche.mjs` à partir de `refs/` ; il porte les
   pixels de la planche de Guillaume, pas une transcription (« je veux
   simplement que tu copies et colles les sprites »). Voir sa tête de fichier et
   `tools/lib-planche.mjs` pour la chaîne complète.
   ⚠️ IL N'Y A TOUJOURS AUCUN PNG DANS LE JEU : ce sont des rangées de
   caractères que `plancheSprite()` rejoue en canevas au chargement, comme tout
   le reste de ce fichier. C'est ce qui permet aux bancs de rendu — qui n'ont
   pas de navigateur — de continuer à les regarder (§9, §10). */
import { PLANCHE } from "./planche";
/* ⚠️ ZIP 447 — la seconde planche de Guillaume (escalier à palier, balustrade,
   maison, arbres). Générée par `tools/import-planche2.mjs` ; voir sa note
   d'en-tête pour l'échelle, qui est DÉRIVÉE et non mesurée. */
import { PLANCHE2 } from "./planche2";

/* ---------------------------------------------------------------- PALETTE ---
   Zip 377. Ces deux constantes vivaient DANS buildSprites(), donc invisibles
   depuis l'extérieur du module — ce qui allait très bien tant que personne
   d'autre que le canvas n'avait besoin de connaître la couleur des cheveux
   d'un fermier. Le défi de fuite, lui, en a besoin : il doit reconstituer le
   personnage du joueur en 3D et ne peut pas lire ce fichier (page autonome
   servie depuis public/, voir §7 du contexte).

   Elles sont donc REMONTÉES au niveau du module et exposées par charPalette().
   Volontairement pas dupliquées : une deuxième liste de couleurs de cheveux
   quelque part serait la garantie qu'un jour les deux divergent, et le défi
   afficherait un fermier presque bon — le pire cas, celui qu'on ne remarque
   pas tout de suite. buildSprites continue de lire ces mêmes constantes. */
export const CHAR_HAIR_COLORS = ["#5a3a1e", "#2a2a2a", "#c8862a", "#8a3020", "#d4b03a", "#4a3468", "#743a12", "#b0b0b8"];
export const CHAR_SKIN = "#f0c8a0";

/* Tenue complète d'un fermier, telle que la dessine drawCharFrame : couleurs
   de C.OUTFITS (chemise/pantalon), cheveux indexés sur le MÊME numéro de
   tenue, peau standard. Le genre est renvoyé tel quel — c'est le
   consommateur qui décide quoi en faire.

   NB : cette fonction décrit un fermier JOUEUR. Les overlays de résidents
   (salopette de Greg, chemise de Tristan, combinaison de René, tenue de
   Carla…) n'y figurent pas, et c'est correct : seul un joueur peut lancer le
   défi de fuite. */
export function charPalette(gender, outfit) {
  const i = ((outfit | 0) % C.OUTFITS.length + C.OUTFITS.length) % C.OUTFITS.length;
  const o = C.OUTFITS[i];
  return {
    gender: gender === "f" ? "f" : "m",
    shirt: o.shirt,
    pants: o.pants,
    hair: CHAR_HAIR_COLORS[i % CHAR_HAIR_COLORS.length],
    skin: CHAR_SKIN,
  };
}

/* ==========================================================================
   ZIP 378 — LA CHAUSSÉE DU MONDE SOMBRE, VUE DE DESSUS.
   --------------------------------------------------------------------------
   Retour de Guillaume sur capture d'écran : « c'est pas beau du tout. Elle
   doit être beaucoup plus rigoureuse graphiquement et être une représentation
   2D fidèle de la plateforme 3D du jeu. »

   L'ancien rendu (zip 375) tenait en quinze lignes glissées dans la boucle de
   drawEvilFrame et souffrait de trois défauts qui se voyaient tous sur la
   capture :

     * les « fissures » étaient deux traits pleins de 10 et 11 pixels, donc
       une CROIX NOIRE en travers de chaque dalle. À l'échelle du zoom, ça ne
       lisait pas comme de la pierre fêlée mais comme un quadrillage ;
     * il n'y avait ni ombre ni épaisseur : la chaussée était un trou découpé
       dans le lac, pas une plateforme posée dessus ;
     * rien du décor 3D n'y figurait — ni blocs de bordure, ni stèles, ni
       torches, ni champignons.

   POURQUOI CE CODE VIT ICI, au niveau du module, et pas dans la closure de
   drawEvilFrame comme le reste du rendu maléfique : parce qu'il ne touche à
   AUCUN état de jeu. Il ne lit ni le monde, ni le joueur, ni une ref — juste
   des coordonnées et un contexte 2D. Le sortir de la closure permet de le
   RASTERISER hors navigateur et de le regarder (tools/render-jetty.js), ce
   qui est la seule façon honnête de juger un décor. C'est la même décision
   que `leoFollow` au zip 376, prise pour la même raison.

   DEUX PASSES, et il faut les deux :
     1. drawRunDeckTile  — la pierre. Dessinée pendant le balayage des cases.
     2. drawRunDeckOverlay — l'ombre portée sur l'eau, le liseré du lac et
        les lumières (torches, runes, champignons). Elle DÉBORDE sur les cases
        voisines, donc elle doit passer APRÈS que toutes les cases ont été
        peintes, sans quoi le lac recouvrirait l'ombre qu'il reçoit.
   ========================================================================== */

/* Palette transcrite depuis CFG.COL_* (public/templerun/js/config.js). Le défi
   est une page autonome, ce fichier ne peut pas la lire — mais deux palettes
   qui divergent donneraient deux décors « presque » assortis, ce qui est pire
   que deux décors franchement différents. tools/verify-deck.js compare donc
   les deux listes à chaque livraison et échoue au premier écart. */
export const RUN_DECK_PALETTE = {
  STONE: "#565046", STONE_DARK: "#3c372f", STONE_EDGE: "#2b2721",
  MOSS: "#46592e", MOSS_DARK: "#27351a", VINE: "#293a20",
  CRACK: "#0a0807", STAIN: "#2f3d24", STAIN_DARK: "#1a2415",
  TORCH: "#ff9a3c", RUNE: "#a26bff", MUSHROOM: "#b887ff",
  LAKE: "#2a1052", LAKE_GLOW: "#7b3fd8", BARK_DARK: "#1b1712",
};

/* Le MÊME générateur que celui de la piste 3D (mulberry32, Track.makeRng).
   Ce n'est pas de la coquetterie : une graine dérivée des coordonnées de case
   donne un décor rigoureusement stable d'une image à l'autre. L'ancien rendu
   utilisait déjà un hachage pour cette raison, et c'est la seule chose qu'il
   faisait bien — une seule frame tirée au sort et la pierre grésille. */
function deckRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function deckSeed(tx, ty, salt) {
  let h = (tx * 374761393 + ty * 668265263 + (salt || 0) * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/* Palier d'usure d'une dalle. Pondération FLOOR_WEAR_WEIGHTS du défi 3D
   (0,25 / 0,45 / 0,30) : ni dalle neuve trop propre, ni chaos permanent —
   c'est la décision prise avec Guillaume au zip 373, on la reprend telle
   quelle plutôt que d'en inventer une seconde. */
function deckTier(r) { const v = r(); return v < 0.25 ? 0 : v < 0.70 ? 1 : 2; }

/* Valeurs des dalles selon le palier d'usure.

   ⚠ ELLES NE SONT PAS COL_STONE. La pierre du défi vaut bien 0x565046, mais
   elle y est ÉCLAIRÉE par une ambiante violette à 0,5 et une lune à 0,5 :
   à l'écran, elle rend autour de 60 % de sa valeur nominale. Reprendre le
   nombre tel quel en 2D — où il n'y a aucune lumière — donnait une chaussée
   beige, bien plus claire que celle du jeu de fuite, et c'est ce que montrait
   le premier rendu. On transpose donc la valeur PERÇUE, pas la constante.

   Les blocs de bordure, eux, restent plus clairs que la dalle : ils sont en
   relief, ils prennent le peu de lumière qui vient d'en haut. C'est ce
   contraste-là qui fait que la bordure se lit comme une bordure.
   TROIS TEINTES PAR PALIER, et c'est ce qui manquait le plus au deuxième
   rendu : avec une seule valeur par palier, et trois paliers très proches,
   toute la chaussée virait à l'aplat kaki. Neuf valeurs de pierre suffisent à
   ce que deux dalles voisines ne soient jamais identiques — c'est ce qui fait
   lire un PAVAGE plutôt qu'une surface peinte. */
const TIER_FILL = [
  ["#413b31", "#3a352c", "#463f34"],   // intacte
  ["#37322a", "#312d25", "#3c362c"],   // fissurée
  ["#2e2a22", "#28241e", "#332e26"],   // très abîmée
];
const KERB_FILL = "#4b453a", KERB_LIT = "#5f594c";

/* Torches : une tous les TORCH_EVERY_TILES, en alternant les rives. Le défi
   3D les espace de 22 unités, ce qui ferait UNE torche sur toute la chaussée
   si on transposait le nombre tel quel — l'unité 3D et la case 2D n'ont pas
   le même rapport au personnage. On transpose donc le RYTHME (rares, mais
   assez régulières pour tenir la ligne de la chaussée lisible de loin), pas
   la valeur. */
const TORCH_EVERY_TILES = 3;
export function runDeckTorchSide(tx, baseX) {
  const k = tx - baseX;
  if (k < 2 || (k - 2) % TORCH_EVERY_TILES !== 0) return 0;
  return (Math.floor((k - 2) / TORCH_EVERY_TILES) & 1) ? -1 : 1;
}

/* --------------------------------------------------------------- PASSE 1 ---
   Une case de chaussée. `side` vaut 0 pour les trois voies praticables,
   -1 / +1 pour les deux rangées de bordure (nord / sud). */
export function drawRunDeckTile(g, px, py, T, tx, ty, side) {
  const P = RUN_DECK_PALETTE;
  const r = deckRng(deckSeed(tx, ty, 1));
  const tier = deckTier(r);

  // --- La dalle ---------------------------------------------------------
  g.fillStyle = TIER_FILL[tier][Math.floor(r() * 3)];
  g.fillRect(px, py, T, T);

  /* Joint d'appareillage, en haut et à GAUCHE seulement. Les quatre côtés
     donneraient un double trait entre deux dalles voisines, donc une grille
     de 2 px — exactement le quadrillage qu'on cherche à faire disparaître. */
  g.fillStyle = P.STONE_EDGE;
  g.fillRect(px, py, T, 1);
  g.fillRect(px, py, 1, T);

  // --- Grain de la pierre ----------------------------------------------
  for (let s = 0, n = 3 + Math.floor(r() * 4); s < n; s++) {
    g.fillStyle = r() < 0.5 ? "rgba(96,90,78,0.22)" : "rgba(24,21,17,0.28)";
    g.fillRect(px + 2 + Math.floor(r() * (T - 4)), py + 2 + Math.floor(r() * (T - 4)),
               1 + (r() < 0.35 ? 1 : 0), 1);
  }

  // --- Taches d'humidité, comme paintStoneTile en 3D --------------------
  for (let s = 0, n = [0, 1, 2][tier]; s < n; s++) {
    g.fillStyle = "rgba(26,36,21,0.34)";
    g.fillRect(px + 2 + Math.floor(r() * (T - 7)), py + 3 + Math.floor(r() * (T - 8)),
               3 + Math.floor(r() * 3), 2 + Math.floor(r() * 2));
  }

  /* --- Fêlures. C'EST LE DÉFAUT PRINCIPAL DE L'ANCIEN RENDU, et il a fallu
     deux passes pour le régler :

       * l'ancienne version traçait deux lignes PLEINES de 10 et 11 pixels,
         donc une croix noire en travers de chaque dalle — un quadrillage ;
       * la première tentative de ce zip les a raccourcies mais en a mis
         jusqu'à deux par dalle, en noir opaque : le rendu s'est couvert de
         petits vermisseaux noirs, ce qui n'est pas mieux.

     La bonne mesure, trouvée en regardant : UNE fêlure au plus, seulement sur
     les dalles abîmées, en deux ou trois segments de 2 à 3 pixels qui
     changent de direction, et en noir SEMI-TRANSPARENT — une fissure laisse
     voir le fond de la pierre, elle n'est pas un trait d'encre. --- */
  if (tier > 0 && r() < (tier === 2 ? 0.75 : 0.40)) {
    let cx = px + 4 + Math.floor(r() * (T - 9));
    let cy = py + 4 + Math.floor(r() * (T - 9));
    g.fillStyle = "rgba(10,8,7,0.5)";
    for (let seg = 0, ns = 2 + Math.floor(r() * 2); seg < ns; seg++) {
      const len = 2 + Math.floor(r() * 2);
      if (r() < 0.5) { g.fillRect(cx, cy, len, 1); cx += len - 1; cy += r() < 0.5 ? 1 : -1; }
      else { g.fillRect(cx, cy, 1, len); cy += len - 1; cx += r() < 0.5 ? 1 : -1; }
      cx = Math.max(px + 2, Math.min(px + T - 3, cx));
      cy = Math.max(py + 2, Math.min(py + T - 3, cy));
    }
  }

  // --- Éclat manquant sur les dalles très abîmées -----------------------
  if (tier === 2 && r() < 0.4) {
    g.fillStyle = P.STONE_EDGE;
    const cw = 2 + Math.floor(r() * 2);
    g.fillRect(r() < 0.5 ? px + 1 : px + T - 1 - cw, r() < 0.5 ? py + 1 : py + T - 1 - cw, cw, cw);
  }

  /* --- Mousse dans les JOINTS, et seulement là. C'est le détail qui fait
     basculer la pierre grise en ruine, et il n'a de sens que sur les bords :
     la mousse pousse dans l'eau qui stagne entre deux pierres, pas au milieu
     d'une dalle. Même raisonnement qu'en 3D (paintStoneTile). --- */
  for (let m = 0, n = [2, 5, 8][tier]; m < n; m++) {
    const edge = Math.floor(r() * 4);
    const along = Math.floor(r() * (T - 2));
    const depth = Math.floor(r() * (1 + tier));
    const mx = (edge === 0 || edge === 1) ? px + along : (edge === 2 ? px + depth : px + T - 1 - depth);
    const my = (edge === 0) ? py + depth : (edge === 1 ? py + T - 1 - depth : py + along);
    g.fillStyle = r() < 0.5 ? "rgba(70,89,46,0.62)" : "rgba(39,53,26,0.62)";
    g.fillRect(mx, my, 1 + (r() < 0.4 ? 1 : 0), 1);
  }

  /* AMBIANTE VIOLETTE. En 3D, la chaussée est éclairée par une lumière
     d'ambiance violette (AmbientLight COL_PURPLE_DIM, intensité 0,5) : sa
     pierre kaki y est refroidie par le monde qui l'entoure. Sans cette
     transposition, la même pierre posée sur un lac violet ressort jaune et se
     détache du décor au lieu d'y appartenir — c'est ce que montrait le
     troisième rendu. Un voile de 10 % suffit ; au-delà, la pierre devient
     mauve et on perd la matière. */
  g.fillStyle = "rgba(58,32,100,0.10)";
  g.fillRect(px, py, T, T);

  if (side === 0) return;

  /* ====================================================================
     BORDURE — les blocs bas façon sarcophage du décor 3D.
     Ils s'appuient sur la dalle déjà peinte : une bordure posée sur du vide
     flotterait, alors qu'en 3D les blocs reposent bien sur la chaussée.
     Le tirage reprend les probabilités du défi : KERB_SKIP_CHANCE (0,30),
     STELE_CHANCE (0,22), VINE_CHANCE (0,38). Une bordure trop régulière fait
     décor de jeu vidéo — c'est écrit tel quel dans config.js.
     ==================================================================== */
  const rb = deckRng(deckSeed(tx, ty, 7));
  if (rb() < 0.30) return;                      // bloc manquant : la chaussée respire

  const north = side < 0;
  const isStele = rb() < 0.22;
  const bh = isStele ? T - 2 : 9 + Math.floor(rb() * 3);
  const bx = px + 1 + Math.floor(rb() * 2);
  const bw = isStele ? 7 : T - 2 - Math.floor(rb() * 2);
  // Le bloc est plaqué contre le bord EXTÉRIEUR : c'est lui qui borde le vide.
  const by = north ? py : py + T - bh;
  const inner = north ? by + bh : by;      // arête tournée vers la chaussée

  /* Ombre PORTÉE SUR LA CHAUSSÉE, avant le bloc. C'est elle qui décolle la
     bordure du sol : sans elle, le bloc est un rectangle un peu plus clair
     posé à plat, et les cinq cases se lisent comme cinq voies. Elle tombe du
     côté intérieur, cohérente avec la lumière rasante venue du dehors. */
  g.fillStyle = "rgba(8,6,12,0.42)";
  g.fillRect(bx - 1, north ? inner : inner - 3, bw + 2, 3);

  g.fillStyle = KERB_FILL;
  g.fillRect(bx, by, bw, bh);
  // Appareillage : deux assises, joints décalés.
  g.fillStyle = P.STONE_EDGE;
  g.fillRect(bx, by + Math.floor(bh / 2), bw, 1);
  g.fillRect(bx + Math.floor(bw / 3), by, 1, Math.floor(bh / 2));
  g.fillRect(bx + Math.floor((2 * bw) / 3), by + Math.floor(bh / 2), 1, bh - Math.floor(bh / 2));
  // Arête éclairée côté intérieur + tranche sombre : l'épaisseur du bloc.
  g.fillStyle = KERB_LIT;
  g.fillRect(bx, north ? by + bh - 2 : by, bw, 2);
  g.fillStyle = P.STONE_EDGE;
  g.fillRect(bx, north ? by : by + bh - 1, bw, 1);

  // Coiffe de mousse sur la face extérieure, dégressive — comme paintKerbMaterial.
  for (let m = 0; m < 7; m++) {
    const my = north ? by + Math.floor(rb() * 5) : by + bh - 1 - Math.floor(rb() * 5);
    g.fillStyle = rb() < 0.5 ? "rgba(70,89,46,0.72)" : "rgba(39,53,26,0.72)";
    g.fillRect(bx + Math.floor(rb() * bw), my, 1 + (rb() < 0.4 ? 1 : 0), 1);
  }

  // Lierre retombant sur la face intérieure.
  if (!isStele && rb() < 0.38) {
    g.fillStyle = P.VINE;
    const vx = bx + 1 + Math.floor(rb() * (bw - 2));
    const vl = 2 + Math.floor(rb() * 3);
    g.fillRect(vx, north ? inner : inner - vl, 1, vl);
  }

  if (isStele) {
    // Gravures runiques : des hampes et des chevrons, pas un alphabet — même
    // parti pris que paintRunes() en 3D. La LUEUR, elle, est dans la passe 2 :
    // elle déborde de la case.
    g.fillStyle = P.RUNE;
    for (let k = 0; k < 3; k++) {
      const ry = by + 3 + k * 4;
      g.fillRect(bx + 3, ry, 1, 3);
      g.fillRect(bx + 3, ry + (k & 1 ? 0 : 2), 2, 1);
    }
  }
}

/* --------------------------------------------------------------- PASSE 2 ---
   Tout ce qui DÉBORDE de la case : l'ombre portée sur le lac, le liseré que
   le lac renvoie sur les flancs, et les lumières. Appelée après le balayage
   complet des cases, sinon l'eau repeindrait par-dessus.

   `side` : -1 rangée nord, +1 rangée sud, 0 voie centrale (rien à faire).
   `now` : pour le vacillement. Aucun aléa par image — la pierre grésillerait. */
export function drawRunDeckOverlay(g, px, py, T, tx, ty, side, now, baseX) {
  if (!side) return;
  const P = RUN_DECK_PALETTE;
  const north = side < 0;

  if (north) {
    /* Liseré du LAC sur le flanc nord. C'est la lumière violette de l'eau qui
       remonte sur la pierre : sans elle, la chaussée reste un bloc gris mort
       au milieu d'un lac qui luit, et elle se lit comme un trou découpé. */
    const pulse = 0.20 + Math.sin(now / 1100 + tx * 0.7) * 0.07;
    g.fillStyle = `rgba(123,63,216,${pulse})`;
    g.fillRect(px, py, T, 2);
    // Reflet sur l'eau juste au-dessus : la chaussée éclaire ce qu'elle borde.
    g.fillStyle = `rgba(160,110,240,${pulse * 0.55})`;
    g.fillRect(px, py - 2, T, 2);
  } else {
    /* Face AVANT et OMBRE PORTÉE, côté sud. En vue de dessus, c'est ce couple
       qui donne l'épaisseur : une tranche de pierre sombre sous la dalle, puis
       une ombre qui s'éteint sur l'eau. C'est la réponse directe à « la
       plateforme est par-dessus l'eau » — l'eau passe dessous, la pierre
       flotte au-dessus. */
    g.fillStyle = P.STONE_EDGE;
    g.fillRect(px, py + T - 2, T, 2);
    g.fillStyle = "rgba(6,3,14,0.55)"; g.fillRect(px, py + T, T, 2);
    g.fillStyle = "rgba(6,3,14,0.34)"; g.fillRect(px, py + T + 2, T, 2);
    g.fillStyle = "rgba(6,3,14,0.16)"; g.fillRect(px, py + T + 4, T, 2);
    // Et le lac renvoie quand même un peu de lumière sur la tranche.
    const pulse = 0.13 + Math.sin(now / 1300 + tx * 0.5) * 0.05;
    g.fillStyle = `rgba(123,63,216,${pulse})`;
    g.fillRect(px, py + T - 2, T, 1);
  }

  const rb = deckRng(deckSeed(tx, ty, 7));
  const hasBlock = rb() >= 0.30;
  const isStele = hasBlock && rb() < 0.22;

  /* Halo des gravures runiques. En paliers CONCENTRIQUES et non en un seul
     rectangle : la première version posait un carré violet plein sur la case,
     ce qui se lisait comme une tuile colorée et pas comme une lueur. Quatre
     paliers de faible alpha suffisent à donner une décroissance, et on reste
     en pixel-art — un dégradé lisse jurerait avec le reste. */
  if (isStele) {
    const a = 0.26 + Math.sin(now / 430 + tx) * 0.10;
    const steps = [[6, 0.16], [3, 0.22], [1, 0.30], [-1, 0.40]];
    for (const [pad, k] of steps) {
      g.fillStyle = `rgba(162,107,255,${a * k})`;
      g.fillRect(px - pad, py - pad, T + pad * 2, T + pad * 2);
    }
  }

  /* Champignons luminescents. Le motif le plus reconnaissable de
     l'illustration de référence, et le seul autre point de couleur du décor
     avec les torches. Posés sur la bordure, jamais sur la voie : ils
     traverseraient les pieds du fermier. */
  const rm = deckRng(deckSeed(tx, ty, 23));
  if (!isStele && rm() < 0.30) {
    const n = 2 + Math.floor(rm() * 2);
    const cy = north ? py + T - 5 : py + 3;
    const a = 0.42 + Math.sin(now / 700 + tx * 1.3) * 0.10;
    g.fillStyle = `rgba(184,135,255,${a * 0.16})`;
    g.fillRect(px, cy - 4, T, 10);
    g.fillStyle = `rgba(184,135,255,${a * 0.22})`;
    g.fillRect(px + 2, cy - 2, T - 4, 6);
    for (let k = 0; k < n; k++) {
      const mx = px + 3 + Math.floor(rm() * (T - 8));
      g.fillStyle = "#544a60"; g.fillRect(mx + 1, cy + 1, 1, 2);
      // Chapeau : deux pixels seulement, et jamais à pleine opacité — un
      // champignon lumineux reste un DÉTAIL. La première version en faisait
      // des tirets violets qui sautaient aux yeux avant la chaussée.
      g.fillStyle = `rgba(184,135,255,0.85)`; g.fillRect(mx, cy, 2, 1);
      g.fillStyle = `rgba(150,105,215,0.85)`; g.fillRect(mx, cy + 1, 2, 1);
    }
  }

  /* TORCHES. Le seul point CHAUD du cadre, comme en 3D — et la seule chose
     qui donne une échelle à la chaussée la nuit. Deux vacillements de
     périodes incommensurables, jamais synchrones d'une torche à l'autre
     (le décalage vient de tx), et aucun tirage par image. */
  if (runDeckTorchSide(tx, baseX) === side) {
    const cx = px + Math.floor(T / 2) - 1;
    const fy = north ? py + 2 : py + T - 10;
    const fl = 0.62 + Math.sin(now / 128 + tx * 1.7) * 0.20 + Math.sin(now / 67 + tx) * 0.10;

    /* Halo posé au sol, sur la chaussée. En QUATRE paliers concentriques :
       deux seulement laissaient voir deux rectangles orange emboîtés, ce qui
       est pire que pas de halo du tout. On reste en paliers plutôt qu'en
       dégradé lisse — c'est du pixel-art, et le sol l'est aussi. */
    const halo = [[T - 2, 0.040], [9, 0.052], [4, 0.065]];
    for (const [pad, k] of halo) {
      g.fillStyle = `rgba(255,154,60,${k * fl})`;
      g.fillRect(px - pad, fy - pad, T + pad * 2, T + pad * 2);
    }

    // Le mât, puis la flamme : cœur clair, corps orangé, pointe qui vacille.
    g.fillStyle = P.BARK_DARK;
    g.fillRect(cx, fy + 3, 2, 8);
    g.fillStyle = `rgba(255,154,60,${0.85})`;
    g.fillRect(cx - 1, fy + 1, 4, 3);
    g.fillStyle = `rgba(255,206,104,${fl})`;
    g.fillRect(cx, fy, 2, 3);
    g.fillStyle = `rgba(255,247,212,${fl})`;
    g.fillRect(cx, fy + 1, 2, 1);
    // Pointe : elle penche d'un côté ou de l'autre selon le vacillement.
    g.fillStyle = `rgba(255,206,104,${fl * 0.7})`;
    g.fillRect(cx + (Math.sin(now / 190 + tx) > 0 ? 1 : 0), fy - 2, 1, 2);
  }
}

/* ===========================================================================
   ZIP 386 — LES PONTS DU PASSAGE, UN PAR TERRE
   ---------------------------------------------------------------------------
   Décision Guillaume : chaque terre a son pont, et ils ne mènent pas au même
   endroit. La GÉOMÉTRIE reste rigoureusement identique sur les six cartes
   (voir PASSAGE_GATE_DEST, fermeConstants.js) ; seul l'habillage change.

   `drawBridgeTile` n'est donc PAS un remplacement de `drawRunDeckTile` : c'est
   un aiguillage qui l'appelle pour le thème « stone ». La chaussée de pierre
   du défi de fuite sort de ce zip **au pixel près telle qu'elle était** — ce
   qui est la seule façon de laisser verify-deck.mjs (qui compare 15 couleurs
   2D aux CFG.COL_* du défi 3D) continuer à dire quelque chose de vrai.

   Toujours `fillRect` seul, pour la raison du zip 385 : le rasteriseur maison
   ne couvre pas davantage, et un `arc()` glissé ici dessinerait juste dans le
   jeu et faux dans l'outil.
   ======================================================================== */

// Bandes de l'arc-en-ciel, dans l'ordre. Sert au tablier du pont du Pays des
// Bonbons ET à la crinière des licornes : une seule source, sinon les deux
// dérivent l'une de l'autre à la première retouche.
const RAINBOW = ["#ff4d6d", "#ff9e3d", "#ffdd44", "#7ed957", "#4dc3ff", "#8a6cff", "#e06cff"];

const MALLOW_TOP = "#fff6fb", MALLOW_MID = "#ffe1ef", MALLOW_LOW = "#f6bcd8";

function bridgeRng(tx, ty) {
  let h = (((tx * 40503) ^ (ty * 2654435761)) >>> 0) || 7;
  return function () { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

/* Le tablier arc-en-ciel. Les bandes courent DANS LE SENS DE LA MARCHE (comme
   les routes de l'image de référence n°3) et sont calculées sur la coordonnée
   ABSOLUE en y, pas sur la position dans la case : sinon chaque case
   recommencerait sa propre petite série et on verrait une grille de sept
   couleurs au lieu d'un ruban continu. */
function candyDeckTile(g, px, py, T, tx, ty, deckTopY) {
  const rowPx = (ty - deckTopY) * T;               // hauteur absolue dans le tablier
  const BAND = 6;
  for (let k = 0; k < T; k++) {
    const abs = rowPx + k;
    g.fillStyle = RAINBOW[Math.floor(abs / BAND) % RAINBOW.length];
    g.fillRect(px, py + k, T, 1);
  }
  // Voile de sucre glace : sans lui les sept bandes saturées mangent le
  // fermier, qui devient illisible dès qu'il pose un pied dessus.
  g.fillStyle = "rgba(255,255,255,0.30)";
  g.fillRect(px, py, T, T);
  // Grains de sucre, semés sur la case (jamais par image : ça grouillerait).
  const r = bridgeRng(tx, ty);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(px + Math.floor(r() * (T - 2)), py + Math.floor(r() * (T - 2)), 1, 1);
  }
}

/* La bordure en guimauve. Elle est BOMBÉE : clair en haut, sombre en bas, avec
   un liseré rose. C'est ce dégradé qui la fait lire comme un coussin posé sur
   le pont plutôt que comme une deuxième voie praticable — le défaut exact que
   Guillaume avait signalé sur le couronnement des bordures au zip 381. */
function candyKerbTile(g, px, py, T, tx, ty, side) {
  g.fillStyle = MALLOW_MID; g.fillRect(px, py, T, T);
  if (side < 0) {           // bordure NORD : la lumière vient d'en haut
    g.fillStyle = MALLOW_TOP; g.fillRect(px, py, T, Math.round(T * 0.55));
    g.fillStyle = MALLOW_LOW; g.fillRect(px, py + T - 3, T, 3);
  } else {                  // bordure SUD
    g.fillStyle = MALLOW_TOP; g.fillRect(px, py, T, 4);
    g.fillStyle = MALLOW_LOW; g.fillRect(px, py + Math.round(T * 0.6), T, Math.round(T * 0.4));
  }
  const r = bridgeRng(tx, ty);
  if (r() < 0.5) { g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(px + 2 + Math.floor(r() * 6), py + 3, 3, 2); }
}

/* ===========================================================================
   ZIP 400 — LE PONT DU LABYRINTHE, EN PIERRE DU LABYRINTHE.
   ---------------------------------------------------------------------------
   Demande de Guillaume : « Utilise la même texture que les murs pour composer
   le pont menant au jeu maze 3D. » Le Pays du Labyrinthe avait un pont de
   HAIE tressée depuis le 386 — vert, végétal, et sans aucun rapport avec la
   maçonnerie khaki qu'on trouve trois secondes plus tard de l'autre côté.

   ⚠️ « LA MÊME TEXTURE » NE PEUT PAS ÊTRE UN COPIER-COLLER, ET IL FAUT LE
   DIRE. La pierre du 397 est peinte en onze couches sur 512 px pour 5,75
   unités de mur ; une case de ferme fait T pixels pour une case entière. À
   cette échelle, un bloc du dédale ferait moins de deux pixels de haut et la
   texture rendrait une bouillie grise. Ce qui se transporte, ce n'est pas
   l'image : c'est la PALETTE et l'APPAREILLAGE.

   ⚠️ ET LA PALETTE EST RECOPIÉE À LA MAIN, EN CONNAISSANCE DE CAUSE. La ferme
   (bundle Next) et le labyrinthe (public/, hors bundle) ne peuvent pas se
   partager un module — c'est la même frontière qui a imposé RUN_STR, CANDY_STR
   et LAB_STR. Les valeurs viennent de public/labyrinth/js/config.js :
   COL_BRICK 0x9c8b5e, COL_BRICK_LIT 0xc4b073, COL_BRICK_DARK 0x6b5f42,
   COL_MORTAR 0x3a352c, COL_MOSS 0x46592e, COL_STONE_EDGE 0x2b2721.
   **Si elles changent là-bas, elles doivent changer ici**, et c'est
   exactement le genre de dette que verify-palette.mjs surveille déjà entre le
   défi de fuite et le labyrinthe. Un contrôle du même ordre reste à écrire
   pour ce pont — dit ici plutôt que tu, faute de quoi personne ne le saura.

   Appareillage : trois assises par case, joints DÉCALÉS d'une demi-longueur
   d'une assise à l'autre. Un appareillage aligné donne une grille, et c'est
   très exactement le défaut que le 397 a corrigé sur les murs du dédale.
   ======================================================================== */
const MAZE_BRICK = "#9c8b5e", MAZE_LIT = "#c4b073", MAZE_DARK = "#6b5f42";
const MAZE_MORTAR = "#3a352c", MAZE_MOSS = "#46592e", MAZE_EDGE = "#2b2721";

function mazeStoneDeckTile(g, px, py, T, tx, ty, side) {
  // Le mortier d'abord, en fond : les blocs se posent dessus et laissent le
  // joint apparaître entre eux. C'est l'ordre du 397, et il évite d'avoir à
  // dessiner chaque joint.
  g.fillStyle = MAZE_MORTAR;
  g.fillRect(px, py, T, T);

  /* ⚠️⚠️ L'APPAREILLAGE EST CALCULÉ EN COORDONNÉES ABSOLUES, PAS DANS LA CASE.
     La première version posait ses blocs à partir du bord gauche de la tuile
     et décalait les assises avec `(row + tx + ty) & 1`. Résultat, visible d'un
     coup d'œil sur tools/render-maze-bridge.mjs : tous les blocs s'alignaient
     sur les bords de case, et **on lisait la grille du monde à travers son
     propre pont**. C'est exactement le défaut que le 396 avait sur le sol du
     labyrinthe, et que le 397 a corrigé là-bas.

     On raisonne donc en pixels ABSOLUS (tx * T) : un bloc à cheval sur deux
     cases est dessiné en deux morceaux qui se rejoignent, et la maçonnerie
     court d'un bout à l'autre du pont sans qu'aucune couture ne se voie.

     DEUX ASSISES PAR CASE ET DES BLOCS LARGES, pas trois assises de petits
     blocs : à trois, la planche montrait une natte, pas un mur. Le mur du
     dédale compte cinq assises sur onze unités de hauteur, soit un bloc de
     2,2 unités pour 11,5 de case — deux assises par case est la transposition
     juste, et elle vient de là, pas d'un réglage à l'œil. */
  const ROWS = 2;
  const rh = T / ROWS;
  const bw = Math.round(T * 0.62);        // un bloc fait un peu moins de deux tiers de case
  const absX = tx * T;

  for (let row = 0; row < ROWS; row++) {
    const y = py + Math.round(row * rh);
    const h = Math.round((row + 1) * rh) - Math.round(row * rh) - 1;   // 1 px de joint
    // Décalage d'une demi-longueur une assise sur deux, en ABSOLU : il ne
    // dépend donc plus de la case, seulement de l'assise et de la position du
    // pont dans le monde.
    const shift = (row & 1) ? Math.round(bw * 0.5) : 0;
    const first = Math.floor((absX - shift) / bw) - 1;
    for (let k = first; k <= first + Math.ceil(T / bw) + 1; k++) {
      const bx = k * bw + shift;                       // bord gauche ABSOLU du bloc
      const x0 = Math.max(absX, bx), x1 = Math.min(absX + T, bx + bw - 1);
      if (x1 <= x0) continue;
      /* La teinte du bloc vient de SA position absolue, jamais d'un tirage :
         un bloc à cheval sur deux cases doit recevoir la même couleur des deux
         côtés, sinon il se coupe en deux au milieu et la couture revient par
         la fenêtre. C'est le même raisonnement que la phase des bulles du
         défi de fuite au 381. */
      const hsh = ((k * 73856093) ^ (row * 19349663) ^ (ty * 83492791)) >>> 0;
      const v = (hsh % 1000) / 1000;
      /* ⚠️ CONTRASTE RESSERRÉ. La première version tirait un tiers de blocs
         clairs et un tiers de sombres : à l'écran, un damier. La pierre du
         dédale est presque unie — ce sont les JOINTS qui la dessinent, pas
         l'écart entre deux blocs voisins. Un bloc clair sur six, un sombre sur
         quatre, le reste au ton courant. */
      g.fillStyle = v < 0.16 ? MAZE_LIT : v < 0.42 ? MAZE_DARK : MAZE_BRICK;
      g.fillRect(x0 - absX + px, y, x1 - x0, h);
      // Chanfrein clair sur l'arête haute : à cette échelle, c'est lui qui
      // donne le relief, là où le bumpMap du 397 le donne en 3D.
      if (h > 3) {
        g.globalAlpha = 0.26;
        g.fillStyle = MAZE_LIT;
        g.fillRect(x0 - absX + px, y, x1 - x0, 1);
        g.globalAlpha = 1;
      }
    }
  }

  /* Les BORDS du tablier prennent la mousse, comme le pied des murs du dédale.
     `side` vaut -1 ou +1 sur les rives, 0 au milieu. */
  if (side !== 0) {
    g.globalAlpha = 0.42;
    g.fillStyle = MAZE_MOSS;
    g.fillRect(px, side < 0 ? py : py + T - 2, T, 2);
    g.globalAlpha = 1;
  }
  /* Une pierre descellée de loin en loin : le dédale est une ruine, et une
     maçonnerie parfaite se relit comme un carrelage. Tirée sur la case, donc
     stable d'une image à l'autre. */
  const r = bridgeRng(tx, ty);
  if (r() < 0.09) {
    g.fillStyle = MAZE_EDGE;
    g.fillRect(px + Math.floor(r() * (T - 5)), py + Math.floor(r() * (T - 4)), 4, 3);
  }
}

function hedgeDeckTile(g, px, py, T, tx, ty, side) {
  const r = bridgeRng(tx, ty);
  g.fillStyle = side === 0 ? "#5d8f3a" : "#3f6b28";
  g.fillRect(px, py, T, T);
  // Tressage : deux brins clairs sur deux sombres, décalés d'une case sur deux.
  const off = ((tx + ty) & 1) ? 3 : 0;
  for (let k = 0; k < T; k += 6) {
    g.fillStyle = "#76a94c"; g.fillRect(px, py + ((k + off) % T), T, 2);
  }
  if (r() < 0.35) { g.fillStyle = "#c8e08a"; g.fillRect(px + 4 + Math.floor(r() * 6), py + 5, 2, 2); }
}

function crystalDeckTile(g, px, py, T, tx, ty, side) {
  const r = bridgeRng(tx, ty);
  const base = side === 0 ? ["#b8e6f5", "#a4dcef", "#c9eef9"] : ["#7fc4dd", "#6fb6d1"];
  g.fillStyle = base[Math.floor(r() * base.length)];
  g.fillRect(px, py, T, T);
  // Facettes : deux triangles en escalier de pixels, l'un clair l'autre sombre.
  for (let k = 0; k < T; k++) {
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(px + k, py + k, 1, 1);
    g.fillStyle = "rgba(60,120,150,0.25)"; g.fillRect(px + k, py + T - 1 - k, 1, 1);
  }
}

function cloudDeckTile(g, px, py, T, tx, ty, side) {
  const r = bridgeRng(tx, ty);
  g.fillStyle = side === 0 ? "#fdfdff" : "#e6ecfb";
  g.fillRect(px, py, T, T);
  g.fillStyle = "rgba(190,205,240,0.55)";
  g.fillRect(px, py + T - 3, T, 3);
  if (side !== 0) { g.fillStyle = "#ffe6a0"; g.fillRect(px, side < 0 ? py : py + T - 2, T, 2); }
  if (r() < 0.4) { g.fillStyle = "#ffffff"; g.fillRect(px + 3 + Math.floor(r() * 7), py + 4, 5, 3); }
}

/* --------------------------------------------------------------- PASSE 1 ---
   `side` vaut 0 pour les trois voies praticables, -1 / +1 pour les bordures.
   `deckTopY` est la ligne du HAUT du tablier (voir candyDeckTile). */
export function drawBridgeTile(g, px, py, T, tx, ty, side, theme, deckTopY) {
  if (theme === "candy") {
    if (side === 0) candyDeckTile(g, px, py, T, tx, ty, deckTopY);
    else candyKerbTile(g, px, py, T, tx, ty, side);
    return;
  }
  if (theme === "mazestone") return mazeStoneDeckTile(g, px, py, T, tx, ty, side);   // zip 400
  if (theme === "hedge") return hedgeDeckTile(g, px, py, T, tx, ty, side);
  if (theme === "crystal") return crystalDeckTile(g, px, py, T, tx, ty, side);
  if (theme === "cloud") return cloudDeckTile(g, px, py, T, tx, ty, side);
  // Thème inconnu ou "stone" : la chaussée du défi de fuite, inchangée.
  drawRunDeckTile(g, px, py, T, tx, ty, side);
}

/* --------------------------------------------------------------- PASSE 2 ---
   Tout ce qui DÉBORDE d'une case (zip 378 : peint pendant le balayage, ce
   serait effacé par la case voisine dessinée juste après).

   Pour la pierre, c'est l'ombre portée, le liseré du lac et les halos de
   torche. Pour la guimauve, ce sont les COULURES qui pendent au-dessus du
   sirop — le motif de l'image de référence n°2, où tout le relief dégouline. */
export function drawBridgeOverlay(g, px, py, T, tx, ty, side, now, baseX, theme) {
  if (theme === "stone" || !theme) return drawRunDeckOverlay(g, px, py, T, tx, ty, side, now, baseX);

  const r = bridgeRng(tx, ty);
  const outY = side < 0 ? py - 1 : py + T;         // vers l'extérieur du pont
  const dir = side < 0 ? -1 : 1;

  if (theme === "candy") {
    // Trois coulures de guimauve par case, longueurs tirées sur la case donc
    // stables. Elles respirent très lentement : le sirop en dessous bouge
    // déjà, une bordure parfaitement figée par-dessus ferait carton-pâte.
    for (let i = 0; i < 3; i++) {
      const dx = 2 + Math.floor(r() * (T - 5));
      const len = 3 + Math.floor(r() * 5) + Math.round(Math.sin(now / 900 + tx + i) * 1.2);
      g.fillStyle = MALLOW_TOP;
      g.fillRect(px + dx, dir < 0 ? outY - len : outY, 3, len);
      g.fillStyle = MALLOW_LOW;
      g.fillRect(px + dx, dir < 0 ? outY - len : outY + len - 2, 3, 2);
    }
    return;
  }
  if (theme === "mazestone") {
    /* Le bord du pont : une assise de bloc vue de chant, plus sombre, et une
       ligne de mousse dessous — la même mousse que le bas des murs du dédale.
       C'est ce liseré qui donne l'épaisseur : sans lui, le pont est un
       autocollant posé sur l'eau. */
    g.fillStyle = MAZE_EDGE;
    g.fillRect(px, dir < 0 ? outY - 3 : outY, T, 3);
    g.fillStyle = MAZE_MOSS;
    g.fillRect(px, dir < 0 ? outY - 1 : outY + 2, T, 1);
    return;
  }
  if (theme === "hedge") {
    g.fillStyle = "rgba(30,60,20,0.35)";
    g.fillRect(px, dir < 0 ? outY - 2 : outY, T, 2);
    return;
  }
  if (theme === "crystal") {
    // Éclats de glace qui dépassent, pointus vers l'extérieur.
    for (let i = 0; i < 2; i++) {
      const dx = 3 + Math.floor(r() * (T - 7));
      const len = 2 + Math.floor(r() * 4);
      g.fillStyle = "rgba(200,240,255,0.75)";
      for (let k = 0; k < len; k++) {
        g.fillRect(px + dx + k, dir < 0 ? outY - len + k : outY + k, len - k, 1);
      }
    }
    return;
  }
  if (theme === "cloud") {
    for (let i = 0; i < 2; i++) {
      const dx = 1 + Math.floor(r() * (T - 6));
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillRect(px + dx, dir < 0 ? outY - 3 : outY, 6, 3);
    }
  }
}

/* ===========================================================================
   ZIP 385 — LE SOL DU PAYS DES BONBONS
   ---------------------------------------------------------------------------
   Demande Guillaume : « the ground should be made of colour candies
   (marshmallow and pink cotton candy and sprinkles etc.) ».

   CE QUI A ÉTÉ DÉCOUVERT EN CHEMIN, et qui change la nature du chantier : les
   cinq mondes du passage déclarent depuis le zip 235 des couleurs propres
   (`bg`, `g1`, `g2`, `waterA`, `waterB` dans PASSAGE_WORLDS) que PERSONNE NE
   LIT. drawEvilFrame peint « #182417 » en dur pour toute case d'herbe, quelle
   que soit la semaine. Le Pays des Bonbons n'était donc pas rose : il était,
   à l'écran, rigoureusement identique aux Terres Maléfiques. Ce n'est pas une
   retouche de teinte, c'est le premier sol propre à un monde du passage.

   POURQUOI CETTE FONCTION VIT AU NIVEAU DU MODULE, et pas dans la closure de
   la boucle de rendu : corollaire du zip 378. Elle ne touche à AUCUN état de
   jeu — elle ne connaît qu'une position de case — donc elle peut être
   rasterisée hors navigateur (tools/render-candy.mjs) et REGARDÉE sans lancer
   la partie. C'est ce qui a permis de corriger la répartition des parfums
   avant la première capture d'écran.

   fillRect UNIQUEMENT, comme drawRunDeckTile. Ce n'est pas une coquetterie :
   le rasteriseur maison (§4 du contexte, pas de paquet `canvas` disponible)
   ne couvre qu'un sous-ensemble du contexte 2D, et un arc glissé ici
   dessinerait juste dans le jeu et faux dans l'outil — c'est-à-dire un outil
   qui rassure au lieu de montrer.

   Rien ne DÉBORDE d'une case : pas d'ombre portée, pas de liseré sur le
   voisin. Le piège de la seconde passe (zip 378, « l'eau contourne la
   plateforme ») ne s'applique donc pas ici, et il n'y a volontairement pas de
   drawCandyGroundOverlay à écrire.
   ======================================================================== */

// Hash de case -> générateur reproductible. Même case = même parfum à chaque
// image et à chaque visite : sans ça le sol grouillerait d'une image à
// l'autre, ce qui est le défaut le plus fatigant qu'un sol puisse avoir.
function candyRng(tx, ty) {
  let h = (((tx * 73856093) ^ (ty * 19349663)) >>> 0) || 1;
  return function () { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

/* Quatre parfums, et leur fréquence compte autant que leur dessin :
     - GUIMAUVE (fond) : c'est le sol, il doit dominer, sinon la carte devient
       illisible et on ne distingue plus un joueur d'un bonbon ;
     - SPRINKLES : la variété, fréquente mais discrète ;
     - BARBE À PAPA : les taches roses, moyennement fréquentes ;
     - SUCRE D'ORGE : les rayures, RARES — c'est le motif le plus fort, il ne
       tient que par sa rareté. */
const CANDY_MALLOW = ["#f7dfe9", "#f4d6e3", "#fae6ee"];
const CANDY_MALLOW_SHADE = "#e3bfd2";
const CANDY_FLOSS = ["#f5a8cd", "#f09ac4", "#f8b6d6"];
const CANDY_STRIPE_A = "#ffffff", CANDY_STRIPE_B = "#ef4f7e";
const SPRINKLE_COLS = ["#ffd23f", "#7ce0f0", "#a8e02a", "#ff8ab3", "#b98cff", "#ffffff"];

export function drawCandyGroundTile(g, px, py, T, tx, ty) {
  const r = candyRng(tx, ty);
  const roll = r();
  const flavour = roll < 0.50 ? 0 : roll < 0.78 ? 1 : roll < 0.94 ? 2 : 3;

  // Fond de guimauve, toujours : les trois autres parfums se posent DESSUS.
  // Peindre chaque parfum sur son propre fond laissait des coutures visibles
  // entre deux cases voisines de parfums différents.
  g.fillStyle = CANDY_MALLOW[Math.floor(r() * 3)];
  g.fillRect(px, py, T, T);

  // Coins mordus : deux pixels d'ombre en bas à droite donnent à chaque case
  // l'épaisseur d'un coussin plutôt que d'un carrelage.
  g.fillStyle = CANDY_MALLOW_SHADE;
  g.fillRect(px, py + T - 2, T, 2);
  g.fillRect(px + T - 2, py, 2, T);
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.fillRect(px, py, T, 1);
  g.fillRect(px, py, 1, T);

  if (flavour === 1) {
    // SPRINKLES : trois à six bâtonnets de 2x1 ou 1x2, couleurs pastel.
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const sx = px + 2 + Math.floor(r() * (T - 5));
      const sy = py + 2 + Math.floor(r() * (T - 5));
      g.fillStyle = SPRINKLE_COLS[Math.floor(r() * SPRINKLE_COLS.length)];
      if (r() < 0.5) g.fillRect(sx, sy, 3, 1); else g.fillRect(sx, sy, 1, 3);
    }
  } else if (flavour === 2) {
    // BARBE À PAPA : une touffe rose faite d'aplats empilés, jamais centrée
    // (une tache centrée par case redonnerait une grille).
    const cx = px + 3 + Math.floor(r() * (T - 8));
    const cy = py + 3 + Math.floor(r() * (T - 8));
    const col = CANDY_FLOSS[Math.floor(r() * 3)];
    g.fillStyle = col;
    g.fillRect(cx + 1, cy, 5, 2);
    g.fillRect(cx, cy + 2, 7, 3);
    g.fillRect(cx + 1, cy + 5, 5, 2);
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.fillRect(cx + 2, cy + 1, 2, 1);
  } else if (flavour === 3) {
    // SUCRE D'ORGE : rayures diagonales blanches et rouges, en escalier de
    // pixels (une diagonale « propre » n'existe pas en pixel art).
    for (let k = -T; k < T * 2; k += 6) {
      for (let i = 0; i < T; i++) {
        const x = px + k + i, y = py + i;
        if (x < px || x >= px + T) continue;
        g.fillStyle = CANDY_STRIPE_B; g.fillRect(x, y, 3, 1);
        g.fillStyle = CANDY_STRIPE_A; g.fillRect(x + 3, y, 3, 1);
      }
    }
    // On repose l'ombre : les rayures viennent de l'écraser.
    g.fillStyle = CANDY_MALLOW_SHADE;
    g.fillRect(px, py + T - 1, T, 1);
  }
}

/* L'eau du Pays des Bonbons : sirop de fraise. Même rôle que le lac violet des
   Terres Maléfiques (voir drawEvilFrame), mais on ne peut pas se contenter de
   reteinter — c'est la leçon du double dôme de ciel au zip 382 : une teinte
   posée par-dessus ne transforme pas un violet profond en sirop clair, elle
   l'assombrit ou le délave. On donne donc les valeurs directement, et la
   profondeur (`dp`, 0 au bord, 1 au large) module comme ailleurs. */
export function candySyrupColor(dp) {
  const shallow = 1 - dp;
  return `rgb(${Math.round(190 + shallow * 50)}, ${Math.round(60 + shallow * 90)}, ${Math.round(120 + shallow * 60)})`;
}

/* ===========================================================================
   ZIP 388 — SPRITES SORTIS DE LA CLOSURE : FAMILIERS, FLEURS, DÉCORATIONS.
   ---------------------------------------------------------------------------
   Ces fonctions vivaient DANS buildSprites(), donc invisibles depuis
   l'extérieur du module — et surtout impossibles à REGARDER sans lancer un
   navigateur. C'est le corollaire du zip 378, qui vaut règle : « si un morceau
   ne touche à AUCUN état de jeu, le sortir de la closure ; il devient
   rasterisable hors navigateur, donc REGARDABLE. » C'est ce qui a rendu
   `render-flowers.mjs` possible, et c'est cet outil qui a jugé les seize
   fleurs — pas une intuition.

   Elles ne dépendent que de `document.createElement("canvas")`, jamais d'un
   état de jeu. buildSprites se contente désormais de les appeler.

   ⚠️ CONTRAINTE VOLONTAIRE : `petSprite` et `flowerPotSprite` n'utilisent que
   `fillRect` (plus `getImageData`/`putImageData` pour le contour et le
   miroir). Ce n'est pas une limitation subie, c'est le contrôle : le contexte
   2D de `render-flowers.mjs` JETTE sur `arc`, `beginPath` et compagnie. Si
   quelqu'un glisse un dégradé dans une fleur, l'outil casse au lieu de
   dessiner autre chose que le jeu — et un outil qui montre autre chose que le
   jeu est pire qu'un outil absent : il rassure.
   `decorSprite` garde ses trois dessins d'origine (gnome, fontaine, roue
   solaire), qui eux emploient `arc`/`stroke` : le rasteriseur les saute et le
   dit dans sa sortie.
   =========================================================================== */
export const SPR_T = 16;
const SPR_PUPIL = "#16161a", SPR_OUT = "#241f1c";

/* ══════════════════════════════════════════════════════════════════════════
   ZIP 434 — PEINDRE UNE CASE DE RUE DE VALLEY TOWN.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CETTE FONCTION EST ICI, ET PAS DANS LA BOUCLE DE RENDU, POUR UNE SEULE
   RAISON — LA MÊME QUE `drawCandyGroundTile` ET `drawSeated` : ce qui vit dans
   la closure de `drawTownFrame` n'est REGARDABLE que par quelqu'un qui joue.
   La pose assise a passé trois zips tronquée pour exactement ça (427), et le
   §4 en a fait le piège n°1 du projet. Un revêtement de rue est du DESSIN : il
   se juge en le regardant, donc il doit pouvoir être appelé par
   `tools/render-rues.mjs`. Écrit dans la boucle, il aurait fallu le RECOPIER
   dans le banc — c'est-à-dire mesurer une chose et en livrer une autre.

   Elle rend `true` si elle a peint un revêtement, `false` s'il n'y en a pas
   (l'appelant pose alors sa terre battue). Deux replis, tous deux voulus :
   pas de couche `road` sur le monde, ou pas d'atlas `townRoad` sur les sprites.
   ══════════════════════════════════════════════════════════════════════════ */
export function drawTownRoadTile(ctx, S, tw, x, y, px, py) {
  const RS = S && S.townRoad;
  const rd = (RS && tw.road) ? tw.road[y * tw.w + x] : C.TR_NONE;
  if (!rd) return false;
  const T = SPR_T, sup = RS.sup, KW = RS.kerbW;
  /* La case découpée dans le pavé de 4×4 tuiles : c'est `x % sup` qui fait que
     les pierres TRAVERSENT les bords de case au lieu de s'arrêter dessus. Toute
     la différence avec l'ancienne tuile unique est là. */
  const atlas = rd === C.TR_ASPHALT ? RS.asphalt : rd === C.TR_BRICK ? RS.brick
              : (rd === C.TR_GRAVEL && RS.gravel) ? RS.gravel : RS.cobble;
  const ax = (x % sup) * T, ay = (y % sup) * T;
  ctx.drawImage(atlas, ax, ay, T, T, px, py, T, T);
  /* ⚠️ ZIP 437 — LE GRAVIER N'A PAS DE BORDURE, ET IL SORT DONC ICI, AVANT
     ELLE. Un sentier de parc ou de rive n'est pas bordé de pierres de taille :
     il se DISSOUT dans l'herbe. On lui pose à la place un semis qui se raréfie
     vers le bord, du côté de ce qui n'est pas dallé — la même parade que la
     berge du 435 (« la couverture est une densité, pas un demi-plan »), et pour
     la même raison : un bord net est un second contour. */
  if (rd === C.TR_GRAVEL) {
    const soft = (xx, yy, dx, dy) => {
      if (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) return true;
      const gg = tw.ground[yy * tw.w + xx];
      return !(gg === C.G_PATH || gg === C.G_PATH_STONE || gg === C.G_BRIDGE);
    };
    for (let k = 0; k < 22; k++) {
      const h = waterHash(x * 7 + k, y * 13 + 3);
      const qx = h % T, qy = (h >>> 5) % T;
      const nearN = qy < 4 && soft(x, y - 1), nearS = qy >= T - 4 && soft(x, y + 1);
      const nearW = qx < 4 && soft(x - 1, y), nearE = qx >= T - 4 && soft(x + 1, y);
      if (!(nearN || nearS || nearW || nearE)) continue;
      if (((h >>> 11) & 3) === 0) continue;                     // le semis, pas un liseré
      ctx.fillStyle = "rgba(94,110,62,0.55)";                   // l'herbe qui reprend
      ctx.fillRect(px + qx, py + qy, 1, 1);
    }
    return true;
  }

  // LA LIGNE BLANCHE, à cheval sur l'axe de la chaussée — un pixel au sud de la
  // rangée du dessus, un pixel au nord de celle du dessous. L'axe est DÉRIVÉ,
  // comme la chaussée : la ligne ne peut donc pas se décentrer.
  const axis = C.TOWN_MAIN_ST_Y0 + C.TOWN_MAIN_ST_W / 2;
  // ⚠️ ET ELLE S'INTERROMPT AUX CARREFOURS, comme une vraie. Une ligne continue
  // à travers une intersection est le détail qui trahit tout de suite le décor.
  const cut = C.TOWN_ST_COLS.some((cx) => x >= cx - 1 && x <= cx + 2);
  if (rd === C.TR_ASPHALT && (y === axis - 1 || y === axis) && !cut) {
    const ly = (y === axis) ? py : py + T - 1;
    const ON = 14, PER = 32;                 // 14 px de trait, 18 de vide, sur deux cases
    const base = Math.floor(px / PER) * PER;
    ctx.fillStyle = "#d6d4c8";               // blanc sali : un blanc pur ferait néon
    for (const s of [base, base + PER]) {
      const a = Math.max(px, s), b = Math.min(px + T, s + ON);
      if (b > a) ctx.fillRect(a, ly, b - a, 1);
    }
  }

  /* LES REBORDS. ⚠️ ILS SE POSENT CONTRE CE QUI N'EST PAS DALLÉ, jamais contre
     « un autre revêtement ». Testé sur le revêtement, un carrefour où le goudron
     croise les pavés se serait retrouvé CEINT DE BORDURES — une rue barrée par
     un trottoir à chaque intersection, avec le taxi passant au travers. On teste
     donc le SOL : dallé (rue, allée, esplanade) → rien ; herbe, eau, marche →
     bordure. La place n'est pas coupée, les allées débouchent, les carrefours
     restent ouverts. */
  const paved = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) return false;
    const gg = tw.ground[yy * tw.w + xx];
    return gg === C.G_PATH || gg === C.G_PATH_STONE;
  };
  const kb = rd === C.TR_BRICK ? RS.kerbBrick : RS.kerb;
  if (!paved(x, y - 1)) ctx.drawImage(kb.n, ax, 0, T, KW, px, py, T, KW);
  if (!paved(x, y + 1)) ctx.drawImage(kb.s, ax, 0, T, KW, px, py + T - KW, T, KW);
  if (!paved(x - 1, y)) ctx.drawImage(kb.w, 0, ay, KW, T, px, py, KW, T);
  if (!paved(x + 1, y)) ctx.drawImage(kb.e, 0, ay, KW, T, px + T - KW, py, KW, T);
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   ZIP 436 — PEINDRE UNE MARCHE, UN PAREMENT DE FALAISE, UN LIMON.
   ──────────────────────────────────────────────────────────────────────────
   Ces trois fonctions étaient dans la closure de `drawTownFrame`. Elles n'y
   sont plus, pour la raison de toujours (§4) : un dessin qu'aucun banc ne
   peut appeler est un dessin que personne ne regarde, et ça se voit — c'est
   très exactement le reproche de Guillaume sur l'écart de qualité entre le
   sol pavé (qui a `render-rues.mjs`) et les marches (qui n'avaient rien).
   ⚠️ ELLES RENDENT `true`/`false` COMME `drawTownRoadTile`, et l'appelant garde
   son repli : un client dont l'atlas manquerait doit peindre du gris, pas un
   trou noir.
   ══════════════════════════════════════════════════════════════════════════ */

/* Le SENS DE LA MONTÉE se déduit du gradient d'altitude, jamais de
   `TOWN_STAIRS` : deux descriptions du même escalier finiraient par se
   contredire (§7), et une volée retournée se redessine ici toute seule. */
export function townStairVertical(tw, x, y) {
  const idx = (xx, yy) => yy * tw.w + xx;
  const inb = (xx, yy) => xx >= 0 && yy >= 0 && xx < tw.w && yy < tw.h;
  const at = (xx, yy) => (inb(xx, yy) ? tw.elev[idx(xx, yy)] : 0);
  const isS = (xx, yy) => inb(xx, yy) && tw.ground[idx(xx, yy)] === C.G_TOWN_STAIR;
  /* ⚠️⚠️ ON MESURE LA PENTE ENTRE MARCHES, PAS LA PENTE DU TERRAIN — et c'est
     un défaut trouvé par `tools/render-escaliers.mjs`, sur les TROIS volées de
     la ville. Le 425 lisait le gradient d'altitude sur les quatre voisines
     immédiates, terrain compris. Ça marche au MILIEU d'une volée et ça bascule
     sur son BORD : à l'entrée d'un escalier, la case du dessus est de la
     terrasse et celle du dessous du trottoir, donc le gradient transversal
     cesse d'être nul et peut égaler celui de la montée. Résultat mesuré :
     **22 cases sur 52 dessinées perpendiculairement à leur volée.** Avec les
     quatre traits gris du 425 personne ne l'a jamais vu ; avec des marches en
     pierre, c'est la première chose qu'on voit.
     ⚠️ LA BONNE QUESTION N'EST PAS « DE QUEL CÔTÉ ÇA MONTE » MAIS « DANS QUEL
     SENS LES MARCHES SE SUIVENT ». Deux cases d'escalier VOISINES ne diffèrent
     d'altitude que le long de la montée : en travers, une volée est de niveau,
     par construction. On ne regarde donc que les voisines qui sont elles-mêmes
     des marches, et la réponse est exacte au lieu d'être statistique.
     ⚠️ On n'interroge toujours PAS `TOWN_STAIRS` (§7) : ce qui est lu est la
     carte, donc une volée retournée se redessine toute seule. */
  const e = at(x, y);
  let dx = 0, dy = 0;
  for (const s of [-1, 1]) {
    if (isS(x + s, y)) dx = Math.max(dx, Math.abs(at(x + s, y) - e));
    if (isS(x, y + s)) dy = Math.max(dy, Math.abs(at(x, y + s) - e));
  }
  if (dx !== dy) return dy > dx;
  // Repli : une volée d'une seule case n'a aucune voisine à interroger. On
  // retombe alors sur le gradient du terrain, qui est ce que faisait le 425.
  return Math.abs(at(x, y + 1) - at(x, y - 1)) >= Math.abs(at(x + 1, y) - at(x - 1, y));
}

/* LE DALLAGE D'ESPLANADE, plus sa PIERRE DE BORD. ⚠️ LE BORD SE DÉDUIT DU
   VOISINAGE, jamais de la géométrie de `TOWN_PLAZA` : c'est ce qui le fait
   servir AUSSI les cinq parvis, le champ de foire, le quai et la terrasse de la
   Haute-Ville, sans une ligne de plus. Le principe est du 425 (« une esplanade
   qui s'arrête net dans l'herbe a l'air découpée aux ciseaux ») ; seul le
   dessin change au 436. */
export function drawTownFlagTile(ctx, S, tw, x, y, px, py) {
  const RS = S && S.townRoad;
  if (!RS || !RS.flag) return false;
  const T = SPR_T, sup = RS.sup;
  ctx.drawImage(RS.flag, (x % sup) * T, (y % sup) * T, T, T, px, py, T, T);
  const st4 = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) return false;
    return tw.ground[yy * tw.w + xx] === C.G_PATH_STONE;
  };
  ctx.fillStyle = "#cfcabb";
  if (!st4(x, y - 1)) ctx.fillRect(px, py, T, 3);
  if (!st4(x, y + 1)) ctx.fillRect(px, py + T - 3, T, 3);
  if (!st4(x - 1, y)) ctx.fillRect(px, py, 3, T);
  if (!st4(x + 1, y)) ctx.fillRect(px + T - 3, py, 3, T);
  /* ⚠️ LA PIERRE DE BORD REÇOIT SON PROPRE GRAIN, sinon on remplace un damier
     par un ruban lisse tout autour de la place — le liseré d'autocollant que
     l'écume de l'eau a coûté au 435. Deux pixels d'usure par case suffisent. */
  const h = ((x * 2654435761) ^ (y * 40503)) >>> 0;
  ctx.fillStyle = "rgba(120,116,108,0.35)";
  if (!st4(x, y - 1)) ctx.fillRect(px + (h % 12), py + 1 + ((h >>> 4) % 2), 2, 1);
  if (!st4(x, y + 1)) ctx.fillRect(px + ((h >>> 8) % 12), py + T - 2, 2, 1);
  ctx.fillStyle = "rgba(70,66,60,0.22)";
  if (!st4(x, y + 1)) ctx.fillRect(px, py + T - 1, T, 1);
  return true;
}

export function drawTownStairTile(ctx, S, tw, x, y, px, py) {
  const ST = S && S.townStone;
  if (!ST) return false;
  const T = SPR_T, sup = ST.sup;
  const vertical = townStairVertical(tw, x, y);
  /* ⚠️ LA DÉCOUPE SE FAIT DANS LE PAVÉ, PAS DANS LA CASE : c'est `x % sup` qui
     fait que deux marches voisines ne sont pas le même dessin. Mais l'axe DE
     LA MONTÉE doit rester aligné sur la case — une marche fait 4 px et la
     grille d'altitude compte les cases, donc on ne peut décaler que l'axe
     TRANSVERSAL. D'où le `% sup` sur un seul des deux, l'autre restant à 0. */
  const ax = vertical ? (x % sup) * T : 0;
  const ay = vertical ? 0 : (y % sup) * T;
  ctx.drawImage(ST.stair[vertical ? "v" : "h"], ax, ay, T, T, px, py, T, T);
  return true;
}

/* Le parement, sur `fh` pixels sous la case. On le découpe depuis le HAUT de
   l'atlas : un mur d'une unité et un mur de deux partagent leur première
   assise, ce qui est ce qu'une falaise fait dans la nature. */
export function drawTownCliffFace(ctx, S, tw, x, y, px, py, fh) {
  const ST = S && S.townStone;
  if (!ST || fh <= 0) return false;
  const T = SPR_T, sup = ST.sup;
  const h = Math.min(fh, ST.cliffH);
  ctx.drawImage(ST.cliff, (x % sup) * T, 0, T, h, px, py, T, h);
  if (fh > h) ctx.drawImage(ST.cliff, (x % sup) * T, ST.cliffH - 1, T, 1, px, py + h, T, fh - h);
  return true;
}

/* ⚠️⚠️⚠️ ZIP 447 — LA CONTREMARCHE, ET ELLE N'EST PLUS UN MORCEAU DE FALAISE.
   Jusqu'ici le trou ouvert sous une marche par le décalage d'altitude était
   bouché par `drawTownCliffFace`, c'est-à-dire par le parement d'un MUR DE
   SOUTÈNEMENT : de la pierre brute, à joints décalés, faite pour une hauteur
   d'étage. Sous une marche de 9,6 px, ça donnait une bande rugueuse qui se
   lisait comme du désordre, pas comme la face verticale d'une marche.
   Une contremarche est l'inverse d'un mur : c'est une dalle DRESSÉE, lisse,
   à l'ombre, et son sommet accroche la lumière. Trois bandes suffisent, et
   l'ordre compte — le sombre en bas (l'ombre s'accumule au pied), le clair en
   haut (le nez de la marche du dessus).
   ⚠️ ELLE EST ICI ET PAS DANS LA BOUCLE DE RENDU, comme les marches depuis le
   436, pour la seule raison qui vaille : `tools/render-escaliers.mjs` doit
   pouvoir l'appeler. Un dessin que personne ne peut rastériser ne se dégrade
   pas, il VIEILLIT (§ en-tête). */
export function drawTownStairRiser(ctx, S, tw, x, y, px, py, fh) {
  if (fh <= 0) return false;
  const T = SPR_T;
  const h = Math.max(1, Math.round(fh));
  /* Le corps, en deux valeurs : le haut de la contremarche reçoit encore un peu
     de ciel, le pied est dans l'ombre de la marche. */
  ctx.fillStyle = "#6e6b64"; ctx.fillRect(px, py, T, h);
  ctx.fillStyle = "#5d5a54"; ctx.fillRect(px, py + Math.ceil(h * 0.55), T, h - Math.ceil(h * 0.55));
  /* Le joint vertical, décalé d'une marche à l'autre — c'est ce qui empêche
     une volée de se lire comme une seule plaque rayée (leçon du 433 sur la
     brique de l'hôtel de ville). */
  ctx.fillStyle = "rgba(38,36,32,0.45)";
  ctx.fillRect(px + (((x * 7 + y * 13) >>> 0) % (T - 2)) + 1, py, 1, h);
  /* Le liseré clair du sommet : le nez de la marche du dessus vu par la
     tranche. Un pixel, et c'est lui qui sépare deux marches à l'œil. */
  ctx.fillStyle = "#b9b5aa"; ctx.fillRect(px, py, T, 1);
  return true;
}

/* ⚠️⚠️⚠️ ZIP 447 — LE LIMON DEVIENT UN VOLUME, ET C'EST L'INDICE DE PROFONDEUR
   QUE GUILLAUME RÉCLAMAIT SUR LES CÔTÉS. Ce qu'il y avait : une bande de 4 px
   de pierre, puis un simple voile gris translucide pour le vide en dessous.
   Un voile n'a pas d'épaisseur — il assombrit l'herbe sans jamais dire qu'il y
   a de la MATIÈRE là, si bien que la volée semblait posée à plat sur le pré.
   Un vrai limon est une joue de pierre pleine : elle a un dessus éclairé, une
   FACE verticale qui descend jusqu'au sol, et elle porte une ombre à son pied.
   Les trois sont ici, et dans cet ordre — le dessus, la face, l'ombre.
   ⚠️ LA FACE EST DESSINÉE, PAS TEINTÉE. Teinter aurait été le piège du §4
   (« teinter un sprite avec un fillRect dessine une boîte ») : ce qu'on veut
   n'est pas de l'herbe assombrie, c'est de la pierre vue de côté. */
export function drawTownStairCheek(ctx, S, tw, x, y, px, py, bx, bw, drop) {
  const ST = S && S.townStone;
  if (!ST) return false;
  const T = SPR_T, sup = ST.sup;
  ctx.drawImage(ST.cheek, 0, (y % sup) * T, 4, T, bx, py, bw, T);
  if (drop > 0) {
    const h = Math.round(drop);
    // La FACE du limon : deux valeurs, la plus sombre au pied. Même logique que
    // la contremarche, en plus haut et en plus étroit.
    ctx.fillStyle = "#6a6760"; ctx.fillRect(bx, py + T, bw, h);
    ctx.fillStyle = "#575550"; ctx.fillRect(bx, py + T + Math.ceil(h * 0.6), bw, h - Math.ceil(h * 0.6));
    // L'arête éclairée du haut de la face : c'est elle qui sépare le dessus
    // du limon de sa face, donc qui donne l'angle.
    ctx.fillStyle = "#b4b0a5"; ctx.fillRect(bx, py + T, bw, 1);
    // L'ombre portée au sol, au pied de la joue. Elle DÉBORDE d'un pixel de
    // chaque côté : une ombre exactement large comme l'objet se lit comme sa
    // continuation, pas comme son ombre.
    ctx.fillStyle = "rgba(20,26,16,0.30)";
    ctx.fillRect(bx - 1, py + T + h, bw + 2, 2);
    ctx.fillStyle = "rgba(20,26,16,0.16)";
    ctx.fillRect(bx - 1, py + T + h + 2, bw + 2, 2);
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   ZIP 435 — PEINDRE UNE CASE D'EAU DE VALLEY TOWN, ET SA BERGE.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ICI, ET PAS DANS `drawTownFrame`, POUR LA RAISON DU §4 : ce qui vit
   dans la closure du rendu n'est REGARDABLE que par quelqu'un qui joue, et
   l'eau est du DESSIN. Recopié dans `tools/render-eau.mjs`, il aurait mesuré
   autre chose que ce qu'on livre. Même contrat que `drawTownRoadTile` (434).
   ══════════════════════════════════════════════════════════════════════════ */

/* Le hachage d'un COIN du monde. ⚠️ IL PORTE TOUT LE NATUREL DU RIVAGE (voir
   la note de `townWaterTile`) et il doit donc être PUR : même entrée, même
   sortie, chez l'hôte comme chez l'invité, sans une seule diffusion. Les
   coordonnées sont celles du coin, pas de la case — c'est ce qui fait que les
   quatre cases qui se le partagent lisent la même réponse. */
function waterHash(cx, cy) {
  let n = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) | 0;
  n ^= n >>> 13; n = Math.imul(n, 0x5bd1e995); n ^= n >>> 15;
  return n >>> 0;
}
function townIsWater(tw, x, y) {
  if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) return false;   // hors carte = terre
  return tw.ground[y * tw.w + x] === C.G_WATER;
}
/* Le coin est de l'eau si TROIS de ses quatre cellules le sont, de la terre
   s'il n'en a qu'une, et c'est le hachage qui tranche à deux — le cas de tous
   les coins d'une rive droite. */
function townWaterCorner(tw, cx, cy) {
  let n = 0;
  if (townIsWater(tw, cx - 1, cy - 1)) n++;
  if (townIsWater(tw, cx, cy - 1)) n++;
  if (townIsWater(tw, cx - 1, cy)) n++;
  if (townIsWater(tw, cx, cy)) n++;
  if (n >= 3) return true;
  if (n <= 1) return false;
  return (waterHash(cx, cy) & 1) === 1;
}

/* Rend `true` si elle a peint de l'eau. Elle est appelée sur les cases d'eau
   ET sur les cases de BERGE : le trait d'eau déborde d'une demi-case là où le
   hachage a tranché « eau » sur un coin, et sans cet appel il manquerait
   exactement ce débord — un feston d'herbe le long du rivage.
   ⚠️ ET IL NE DÉBORDE QUE SUR DE LA BERGE (`tw.shore`). Sans ce garde-fou,
   l'eau baverait sur la promenade en pierre du lac du sud et sur l'allée du
   parc : un quai a une arête franche, c'est ce qui le distingue d'une plage. */
export function drawTownWaterTile(ctx, S, tw, x, y, px, py, now) {
  const SW = S && S.townWater;
  if (!SW || !tw.depth) return false;
  const i = y * tw.w + x, isW = tw.ground[i] === C.G_WATER;
  if (!isW && !(tw.shore && tw.shore[i] === 1)) return false;
  const cfg = (townWaterCorner(tw, x, y) ? 1 : 0)
            | (townWaterCorner(tw, x + 1, y) ? 2 : 0)
            | (townWaterCorner(tw, x + 1, y + 1) ? 4 : 0)
            | (townWaterCorner(tw, x, y + 1) ? 8 : 0);
  if (!isW && cfg === 0) return false;              // rien ne déborde ici
  const vr = waterHash(x * 3 + 1, y * 7 + 2) & 1;
  // La berge est le cran le plus haut : un débord d'eau sur la terre, c'est du
  // haut-fond par définition.
  const d = isW ? Math.min(SW.depths - 1, ((tw.depth[i] * SW.depths) / 256) | 0) : 0;
  ctx.drawImage(SW.tiles[cfg][vr][d], px, py);

  /* ⚠️⚠️ LE DÉGRADÉ DOIT TRAVERSER LA CASE, EXACTEMENT COMME LE TRAIT D'EAU.
     Premier jet : une case = un cran de profondeur = un aplat, et l'étang
     rendait un ESCALIER DE RECTANGLES BLEUS de 16 px au milieu de l'eau. On
     avait cassé la grille sur le rivage et on venait de la redessiner au
     large — le même défaut, déplacé de deux mètres, ce qui est la définition
     d'une correction ratée.
     ⚠️ LA PARADE COÛTE UN `drawImage` PAR VOISIN ET AUCUN ATLAS DE PLUS : on
     repose une BANDE de la MÊME tuile (même configuration, même variante, donc
     exactement le même contour) au cran du voisin, en semi-transparence, du
     côté de ce voisin. Le masque étant identique au pixel près, rien ne peut
     déborder du contour — ce qu'un `fillRect` de dégradé aurait fait sur
     l'herbe une case sur deux. Deux crans voisins se fondent, et la marche
     apparente est divisée par deux sans qu'on ait multiplié les tuiles.
     ⚠️ Réservé à la pleine eau : sur une case de rive, le contour occupe déjà
     moins d'une demi-case et la bande n'aurait rien à fondre. */
  /* ⚠️⚠️ ZIP 436 — LE TRAMAGE REMPLACE LES DEUX BANDES DU 435. Le détail du
     raisonnement est au-dessus de `townWaterFadeTile` ; ce qu'il faut savoir
     ici : les QUATRE voisins sont servis (une bande ne servait que l'axe
     dominant, donc une case en coin gardait une arête franche), la couverture
     est un semis et non un rectangle, et on vise le cran MOYEN pour que les
     deux moitiés d'une arête se rejoignent sur la même valeur.
     ⚠️ Le tramage n'est posé que sur la PLEINE eau, et c'est la même raison
     qu'au 435 : ses tuiles sont des carrés pleins, elles déborderaient du
     contour sur une case de rive. */
  if (isW && cfg === 15 && SW.fade) {
    const lvl = (xx, yy) => {
      if (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) return d;
      const j = yy * tw.w + xx;
      if (tw.ground[j] !== C.G_WATER) return d;
      return Math.min(SW.depths - 1, ((tw.depth[j] * SW.depths) / 256) | 0);
    };
    const mid = (a) => Math.max(0, Math.min(SW.depths - 1, Math.round((d + a) / 2)));
    const nb = [lvl(x - 1, y), lvl(x + 1, y), lvl(x, y - 1), lvl(x, y + 1)];
    for (let k = 0; k < 4; k++) {
      const m = mid(nb[k]);
      if (m !== d) ctx.drawImage(SW.fade[k][m], px, py);
    }
  }

  /* ---- LES REFLETS. Ils ne se posent QUE sur une case de pleine eau
     (`cfg === 15`), et ce n'est pas de la prudence de façade : sur une case de
     rive, le contour ne couvre qu'une partie du carré, et un reflet peint en
     `fillRect` déborderait sur l'herbe — c'est-à-dire qu'il redessinerait la
     grille qu'on vient de casser, en clair, une case sur deux. */
  if (cfg !== 15) return true;
  const T = SPR_T;
  /* 1. LE REFLET DE LA BERGE ET DES ARBRES. Un arbre planté au nord se couche
        sur l'eau vers le SUD, en s'estompant et en ondulant. C'est le détail
        qui dit « surface » plutôt que « trou bleu », et il ne coûte que deux
        rectangles. On regarde trois cases au nord : au-delà, un arbre ne se
        reflète plus dans ce qu'on voit de la mare. */
  /* ⚠️⚠️ ZIP 436 — IL ÉTAIT DEUX RECTANGLES, ET ÇA SE VOYAIT. Le 435 posait
     `fillRect(px + 3, py, 10, T)` : un bloc vert de 10 × 16 px à arêtes
     franches, aligné sur la case, donc **la grille redessinée en vert** —
     exactement le défaut que tout ce chapitre corrige, à trois lignes de la
     note qui l'explique. Mesuré sur `eau-etang.png` du 435 : une plaque
     `#7a9796` parfaitement rectangulaire au milieu de la nappe.
     ⚠️ La parade est la même qu'ailleurs dans ce zip : une DENSITÉ, pas une
     surface. Chaque rangée a sa largeur (l'ondulation), et un pixel sur deux
     saute vers le bas de la case — un reflet d'arbre s'effiloche en s'éloignant
     de la berge, il ne s'arrête pas net. Seize `fillRect` de 1 px de haut, et
     seulement sur les cases qui ont un arbre au nord : c'est rare. */
  for (let k = 1; k <= 3; k++) {
    const o = (y - k) >= 0 ? tw.objects[(y - k) * tw.w + x] : 0;
    if (o !== C.O_TREE && o !== C.O_TREE2) continue;
    const a0 = 0.40 - k * 0.09;
    for (let row = 0; row < T; row++) {
      // L'ondulation : deux sinus de périodes différentes, sinon le bord du
      // reflet est une sinusoïde parfaite, ce qui se lit comme un ressort.
      const wob = Math.sin(now / 1300 + x * 0.7 + k + row * 0.55) * 1.7
                + Math.sin(now / 640 + row * 0.31) * 0.9;
      const half = 4.2 - row * 0.11;                      // il s'affine vers le sud
      const a = a0 * (1 - row / (T * 1.35));              // et il s'estompe
      const h = waterHash(x * 31 + row, y * 37 + k) & 255;
      if (h < 62) continue;                               // le tramage : un pixel sur quatre saute
      ctx.fillStyle = `rgba(24, 58, 44, ${a.toFixed(3)})`;
      ctx.fillRect(px + Math.round(8 + wob - half), py + row, Math.max(1, Math.round(half * 2)), 1);
      if ((h & 3) === 0) {                                 // le cœur sombre, discontinu
        ctx.fillStyle = `rgba(18, 44, 34, ${(a * 0.7).toFixed(3)})`;
        ctx.fillRect(px + Math.round(8 + wob) - 1, py + row, 2, 1);
      }
    }
    break;
  }
  /* 2. LA LAME DE LUMIÈRE. Une seule, qui glisse lentement : à 16 px, deux
        reflets animés dans la même case font de la friture. Sa hauteur est
        dérivée de la case pour que deux cases voisines ne battent pas ensemble
        — un lac qui clignote d'un seul bloc se lit comme un défaut d'affichage
        (c'est ce que faisait le voile `sin(x + y)` du 425 : une damier
        diagonale de deux bleus, visible en grand sur toute la nappe). */
  const ph = (waterHash(x, y) % 1000) / 1000;
  const t = ((now / 5200) + ph) % 1;
  const ly = ((t * T) | 0);
  const gl = 0.16 + Math.sin((now / 900) + ph * 6.28) * 0.07;
  ctx.fillStyle = `rgba(214, 238, 246, ${Math.max(0, gl)})`;
  ctx.fillRect(px + 2 + ((ph * 5) | 0), py + ly, 7, 1);

  /* ---- ZIP 436 — LES NÉNUPHARS ET LES ROCHERS. Voir la note de
     `townLilyTile`. Ils sont tirés du hachage de la case, donc identiques chez
     les deux joueurs sans un octet de réseau, et rangés par PROFONDEUR :
       — le rocher émerge là où c'est peu profond (d ≤ 2), sinon il flotterait ;
       — le nénuphar s'installe dans le calme, un peu plus au large (d ≥ 2), et
         jamais au ras de la rive où il se confondrait avec la berge.
     ⚠️ LES SEUILS SE CHEVAUCHENT À d = 2 EXPRÈS : c'est la seule case où l'on
     peut trouver les deux, et c'est ce qui empêche l'étang de se lire en
     anneaux concentriques — le défaut qu'on vient de corriger sur les bleus
     serait revenu sur les objets. */
  const hh = waterHash(x * 11 + 3, y * 13 + 7);
  /* ⚠️ LE SEUIL EST UNE FRACTION DE LA RAMPE, PAS UN CRAN. C'est la leçon du
     seuil d'axe du taxi (434) : écrit « d ≤ 2 », il voulait dire « le tiers
     clair » tant que la rampe avait huit crans, et il a voulu dire « le
     huitième » le jour où elle en a eu seize. Une seule ligne, et les rochers
     auraient disparu de l'étang sans que rien ne le signale. */
  /* ⚠️⚠️ ZIP 439 — LES NÉNUPHARS DE LA PLANCHE NE SE POSENT PLUS ICI, ET LE
     CHEMIN POUR EN ARRIVER LÀ EST LA LEÇON. Premier jet : on remplaçait la
     tuile procédurale du 436 par le sprite de la planche, ancré par son bord
     bas sur la case. `render-eau.mjs` a immédiatement crié — le saut de valeur
     à la COUTURE des cases est passé de ×1,00 à ×1,57 de son voisinage, puis à
     ×1,68 quand on a essayé de décaler l'ancrage. C'est-à-dire LA GRILLE DE
     16 px REDESSINÉE PAR LE DÉCOR : le défaut que les zips 434, 435 et 438 ont
     chacun passé une passe à effacer, réintroduit par la porte du décor.
     ⚠️ LA CAUSE EST STRUCTURELLE, PAS UN RÉGLAGE : un dessin de 25×23 px posé
     par une boucle qui balaye des cases de 16 ne peut pas ne pas se couper sur
     une couture — il est plus grand que le pas de la boucle. Décaler l'ancrage
     déplace la couture, il ne la supprime pas.
     La parade est de changer de MÉCANISME : les nénuphars et les touffes de
     roseaux sont devenus des DÉCORS posés par le générateur (`lily`,
     `reedsWater`), donc dessinés dans la file triée par profondeur, où un
     sprite déborde librement de sa case — c'est déjà le contrat des arbres, des
     bancs et des lampadaires depuis le 425. La tuile d'eau, elle, ne porte plus
     que ce qui tient DANS une case : le rocher et le nénuphar du 436. */
  const WAT_SHOAL = Math.round((SW.depths - 1) * 0.30);
  if (SW.wrock && d <= WAT_SHOAL && (hh % 100) < 7) {
    ctx.drawImage(SW.wrock[(hh >>> 7) % SW.wrock.length], px, py);
  } else if (SW.lily && d >= WAT_SHOAL && ((hh >>> 3) % 100) < 8) {
    ctx.drawImage(SW.lily[(hh >>> 11) % SW.lily.length], px, py);
  }
  return true;
}

/* ZIP 438 — L'HERBE DE VALLEY TOWN. Même découpe que les revêtements : la case
   est prise dans un pavé de 4×4 tuiles, donc les touffes et les plaques
   TRAVERSENT les bords de case au lieu de s'arrêter dessus.
   ⚠️ Elle rend `false` si l'atlas manque, et l'appelant repose alors ses trois
   vieilles tuiles — même contrat que `drawTownRoadTile`. */
export function drawTownGrassTile(ctx, S, tw, x, y, px, py) {
  const RS = S && S.townRoad;
  if (!RS || !RS.grass) return false;
  const T = SPR_T, sup = RS.sup;
  ctx.drawImage(RS.grass, (x % sup) * T, (y % sup) * T, T, T, px, py, T, T);
  return true;
}

/* ZIP 437 — LE MASSIF FLEURI, SUR LA PELOUSE. Il se pose APRÈS le sol et AVANT
   tout le reste : c'est une couche de peinture, pas un décor (voir `BL_*`).
   ⚠️ LA VARIANTE VIENT DU HACHAGE DE LA CASE, jamais d'un tirage : deux cases
   voisines doivent différer, et la même case doit être identique chez les deux
   joueurs et d'une image à l'autre. */
export function drawTownBloomTile(ctx, S, tw, x, y, px, py) {
  const BS = S && S.townBloom;
  const b = (BS && tw.bloom) ? tw.bloom[y * tw.w + x] : 0;
  if (!b || !BS.surf || !BS.surf[b - 1]) return false;
  /* ⚠️⚠️ ZIP 438 — UN MASSIF A DE LA TERRE ET UNE BORDURE, sinon ce sont des
     fleurs POSÉES SUR DU GAZON : c'est ce que le 437 dessinait, et c'est
     exactement pourquoi le parc avait l'air d'une friche fleurie plutôt que
     d'un jardin. Ce qui dit « quelqu'un s'en occupe », ce n'est pas la fleur,
     c'est la TERRE RETOURNÉE en dessous et la pierre qui la retient.
     ⚠️ ET LES DEUX SE DÉDUISENT DU VOISINAGE, pas d'une donnée de plus : une
     case dont les quatre voisines fleurissent est au CŒUR du massif, les autres
     sont sur son pourtour. Zéro octet en plus, et le massif garde sa bordure le
     jour où l'on change sa forme. La prairie sauvage (BL_WILD) n'a ni l'une ni
     l'autre — une prairie n'a pas de bord, c'est sa définition. */
  const wild = b === C.BL_WILD;
  if (!wild) {
    const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= tw.w || yy >= tw.h) ? 0 : (tw.bloom[yy * tw.w + xx] && tw.bloom[yy * tw.w + xx] !== C.BL_WILD ? 1 : 0);
    const n = at(x, y - 1), so = at(x, y + 1), w = at(x - 1, y), e = at(x + 1, y);
    // La terre, en deux bruns, avec un grain de mottes tiré du hachage de la case.
    ctx.fillStyle = "#5d4630"; ctx.fillRect(px, py, SPR_T, SPR_T);
    for (let k = 0; k < 26; k++) {
      const h = waterHash(x * 31 + k, y * 47 + 5);
      ctx.fillStyle = (h & 1) ? "#6b5238" : "#4e3a27";
      ctx.fillRect(px + (h % SPR_T), py + ((h >>> 5) % SPR_T), 1 + ((h >>> 10) & 1), 1);
    }
    // La bordure de pierre, du côté où le massif s'arrête. Deux tons : l'arête
    // prend la lumière du nord-ouest comme tout le reste du jeu.
    const kerb = (bx, by, bw, bh, lit) => {
      ctx.fillStyle = "#9a9184"; ctx.fillRect(px + bx, py + by, bw, bh);
      ctx.fillStyle = lit ? "#b8b0a2" : "#6f695f";
      ctx.fillRect(px + bx, py + by, lit ? bw : bw, 1);
    };
    if (!n) kerb(0, 0, SPR_T, 3, true);
    if (!so) kerb(0, SPR_T - 3, SPR_T, 3, false);
    if (!w) { ctx.fillStyle = "#9a9184"; ctx.fillRect(px, py, 3, SPR_T); ctx.fillStyle = "#b8b0a2"; ctx.fillRect(px, py, 1, SPR_T); }
    if (!e) { ctx.fillStyle = "#9a9184"; ctx.fillRect(px + SPR_T - 3, py, 3, SPR_T); ctx.fillStyle = "#6f695f"; ctx.fillRect(px + SPR_T - 1, py, 1, SPR_T); }
  }
  /* ⚠️ LA CASE SE DÉCOUPE DANS LE PAVÉ, elle ne se choisit plus dans une liste :
     c'est ce qui fait qu'une tige traverse le bord d'une case au lieu de
     s'arrêter dessus (voir `townBloomSurface`). */
  ctx.drawImage(BS.surf[b - 1], (x % BS.sup) * SPR_T, (y % BS.sup) * SPR_T, SPR_T, SPR_T, px, py, SPR_T, SPR_T);
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   ZIP 437 — QUELLE ESSENCE POUSSE ICI ? UNE DÉDUCTION, PAS UN CHAMP.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ RIEN N'EST STOCKÉ ET RIEN NE CIRCULE, et c'est la règle du §3 appliquée
   telle quelle : ce qui peut se déduire ne se diffuse pas. L'essence se lit
   dans ce que la case a DÉJÀ — son objet (feuillu ou conifère, donc la
   collision et la coupe restent identiques au 426), sa berge, son quartier —
   plus un hachage pur pour le reste. Deux joueurs voient donc le même arbre
   sans un octet de réseau, et couper un arbre continue de marcher sans que
   personne ait à savoir que les essences existent.
   ⚠️ L'ORDRE DES TESTS EST L'ORDRE DES PRIORITÉS, et le LIEU passe avant le
   hachage : un saule au bord de l'eau et un pommier au verger ne sont pas des
   variantes décoratives, ce sont les deux endroits où l'essence DIT quelque
   chose. Le hachage ne sert qu'à mélanger ce qui reste.
   ⚠️ LA ZONE EST TESTÉE AVANT LES DISTANCES (§4, le piège des deux cartes) :
   cette fonction ne s'appelle que sur la carte de la ville, d'où le `tw.shore`
   en garde — la ferme n'a pas cette couche, et un arbre de ferme passé ici par
   erreur rendrait `null` au lieu de dessiner un saule au milieu d'un champ. */
/* ⚠️⚠️ ZIP 439 — QUATRE ESSENCES DE PLUS, CELLES DE LA PLANCHE DE GUILLAUME.
   Elles s'AJOUTENT aux onze du 437 (sa demande : « on ajoute aux miens de
   nouveaux »), elles ne les remplacent pas — la ville a donc quinze essences,
   dont quatre dessinées à la main par lui et onze par le code.
   ⚠️ ELLES SONT EN FIN DE TABLE, ET C'EST OBLIGATOIRE : cet indice DÉSIGNE
   l'essence dans `S.townTrees`. Les insérer au milieu aurait décalé les onze
   autres d'un cran, c'est-à-dire changé toutes les essences de la carte sans
   qu'une seule ligne ne le dise. */
export const TT = { OAK: 0, MAPLE: 1, BIRCH: 2, WILLOW: 3, MAGNOLIA: 4, CHERRY: 5, MIMOSA: 6, APPLE: 7, FIR: 8, PINE: 9, CYPRESS: 10,
                    REF_FIR: 11, REF_APPLE: 12, REF_WILLOW: 13, REF_MAGNOLIA: 14 };
const TT_IN = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
export function townTreeKind(tw, x, y, obj) {
  if (!tw || !tw.shore) return null;
  const i = y * tw.w + x;
  const h = waterHash(x * 23 + 5, y * 41 + 9);
  const wet = tw.shore[i] > 0;                       // la berge : 2 cases autour de toute eau
  const conifer = obj === C.O_TREE2;
  /* ⚠️ ZIP 439 — LES QUATRE ESSENCES DE LA PLANCHE SE MÊLENT AUX NÔTRES, à
     raison d'environ une sur trois là où elles ont un sens. ⚠️ PAS UNE SUR
     DEUX : à parité, on ne lit plus deux familles d'arbres mais un damier, et
     l'œil cherche la règle au lieu de regarder le parc. Une sur trois se lit
     comme de la variété. */
  if (conifer) {
    // Le cyprès est un arbre de cimetière et de terrasse : il ne pousse nulle
    // part ailleurs, sinon il cesse de vouloir dire quelque chose.
    if (TT_IN(C.TOWN_CEMETERY, x, y) || TT_IN(C.TOWN_UPPER, x, y)) return TT.CYPRESS;
    if ((h % 3) === 0) return TT.REF_FIR;
    if (wet) return TT.FIR;
    return (h % 5) === 0 ? TT.PINE : TT.FIR;
  }
  if (wet) { const k = h % 6; return k < 2 ? TT.REF_WILLOW : k < 3 ? TT.BIRCH : TT.WILLOW; }
  if (TT_IN(C.TOWN_ORCHARD, x, y)) return (h % 3) === 0 ? TT.REF_APPLE : TT.APPLE;
  if (TT_IN(C.TOWN_PARK, x, y)) {
    const k = h % 12;
    return k < 3 ? TT.REF_MAGNOLIA : k < 5 ? TT.CHERRY : k < 7 ? TT.MAGNOLIA : k < 9 ? TT.MIMOSA
         : k < 10 ? TT.REF_APPLE : k < 11 ? TT.APPLE : TT.MAPLE;
  }
  const k = h % 8;
  return k < 4 ? TT.OAK : k < 7 ? TT.MAPLE : TT.BIRCH;
}
/* L'image, saison ET souffle de vent compris. ⚠️ ELLE REND `null` PLUTÔT QUE DE
   DEVINER : le repli (les sprites du 232) reste chez l'appelant, comme pour les
   revêtements et la pierre — un atlas manquant doit rendre l'ancien arbre, pas
   un trou dans le décor.
   ⚠️⚠️ LA PHASE VIENT DU HACHAGE DE LA CASE, ET C'EST TOUT LE SUJET DE
   L'ANIMATION. Sans elle, les huit cents arbres de la ville changent d'image à
   la même milliseconde : la ville entière bat comme un cœur, ce qui ne se lit
   pas comme du vent mais comme un défaut d'affichage — exactement le voile
   `sin(x + y)` du 425 sur l'eau, en pire. Avec elle, chaque arbre a son souffle,
   et rien ne circule sur le réseau (§3 : ce qui se déduit ne se diffuse pas). */
const TREE_SWAY = [1, 2, 1, 0];      // aller-retour : 0 et 2 sont les extrêmes, 1 le repos
export function townTreeImg(S, tw, x, y, seasonKey, obj, now) {
  const set = S && S.townTrees;
  if (!set) return null;
  const k = townTreeKind(tw, x, y, obj);
  if (k === null || !set[k]) return null;
  const frames = set[k][seasonKey === "autumn" ? "autumn" : seasonKey === "spring" ? "spring" : "summer"];
  if (!now) return frames[1];
  const ph = waterHash(x * 13 + 7, y * 29 + 3) % 1000 / 1000;
  return frames[TREE_SWAY[Math.floor(now / C.TOWN_TREE_SWAY_MS + ph * 4) & 3]];
}
/* Le dessin complet, ancrage compris. ⚠️ L'ANCRAGE VIT ICI ET PAS CHEZ
   L'APPELANT : le gabarit est passé de 32×48 à 48×64 au 438, et un décalage
   écrit en dur dans la boucle de rendu aurait planté les arbres vingt pixels
   trop haut sans qu'aucune erreur ne le dise. `S.townTrees[k].base` porte la
   ligne de sol du canevas ; le rendu n'a rien à savoir. */
export function drawTownTree(ctx, S, tw, x, y, px, py, seasonKey, obj, now) {
  const img = townTreeImg(S, tw, x, y, seasonKey, obj, now);
  if (!img) return false;
  const m = S.townTrees[0];
  ctx.drawImage(img, px + SPR_T / 2 - m.w / 2, py + SPR_T - m.base);
  return true;
}

/* La berge, sur la TERRE. Elle se pose après le sol et avant l'eau : le trait
   d'eau vient mordre dessus, donc l'ordre est ce qui donne la rive mouillée. */
export function drawTownShoreTile(ctx, S, tw, x, y, px, py) {
  const SW = S && S.townWater;
  const b = (SW && tw.shore) ? tw.shore[y * tw.w + x] : 0;
  if (!b) return false;
  /* La direction de l'eau, moyennée sur les huit voisines puis quantifiée sur
     les huit orientations bakées. ⚠️ MOYENNÉE ET PAS « LA PREMIÈRE TROUVÉE » :
     au fond d'une crique, l'eau est à la fois au nord et à l'ouest, et une
     berge orientée plein nord y aurait laissé un quart de case d'herbe nue
     entre elle et l'eau — un trou, exactement là où le regard va. */
  /* ⚠️ SUR L'EAU (valeur 3), ON CHERCHE LA TERRE, PAS L'EAU. La vase d'une
     case d'eau de bord est du côté de la RIVE, sinon on la peindrait au large
     et le quart de case resté sec sous le contour redeviendrait vert. */
  const seek = b === 3;
  const rad = seek ? 1 : b;
  let vx = 0, vy = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (let k = 1; k <= rad; k++) if (townIsWater(tw, x + dx * k, y + dy * k) !== seek) { vx += dx / k; vy += dy / k; }
  }
  if (vx === 0 && vy === 0) return false;
  const ang = Math.atan2(vy, vx);
  // L'ordre de SHORE_DIRS commence au nord et tourne dans le sens horaire.
  let dir = Math.round((ang + Math.PI / 2) / (Math.PI / 4)) % 8;
  if (dir < 0) dir += 8;
  ctx.drawImage(SW.shore[b - 1][dir][waterHash(x * 5, y * 11) & 1], px, py);
  /* ⚠️ ZIP 436 — LES ROSEAUX, SUR LA VASE ET NULLE PART AILLEURS. Bande 1
     seulement (la rive mouillée) : sur la bande sèche ils pousseraient dans la
     pelouse du parc, et sur la bande 3 ils pousseraient au fond de l'eau.
     C'est le seul décor de ce zip qui soit sur la TERRE, et c'est pour ça
     qu'il est ici plutôt que dans `drawTownWaterTile`. */
  /* ⚠️ LES ROSEAUX DE LA PLANCHE SONT DES DÉCORS, PAS UNE TUILE — même raison
     que les nénuphars ci-dessus : `reedsWater` fait 41×37 px, il ne peut pas
     tenir dans une case sans se couper sur la couture. Ce qui reste ici est la
     touffe de 16 px du 436, qui, elle, est faite pour la tuile. */
  if (b === 1 && SW.reed) {
    const hh = waterHash(x * 17 + 5, y * 19 + 11);
    if ((hh % 100) < 26) ctx.drawImage(SW.reed[(hh >>> 9) % SW.reed.length], px, py);
  }
  return true;
}

function sprCv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}
function PX(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
function sprRnd(s) { return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

/* Anneau sombre d'un pixel autour de la silhouette. C'est lui qui règle le
   « trop ambigu » du zip 248 : sans liseré, tête et corps se fondaient en une
   seule masse illisible à 16x16. */
export function outlineSprite(g, w, h, col) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const ring = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ring.push(x, y);
  }
  g.fillStyle = col;
  for (let i = 0; i < ring.length; i += 2) g.fillRect(ring[i], ring[i + 1], 1, 1);
}

/* Miroir horizontal PAR PIXEL, et non par `g.scale(-1, 1)`.
   Deux raisons, et la seconde est la vraie : (1) une transformation sur un
   canevas 16x16 non lissé décale d'un demi-pixel selon les navigateurs ;
   (2) un rasteriseur hors navigateur devrait alors implémenter la pile de
   transformations pour montrer la même chose que le jeu — et un outil qui
   s'écarte du moteur mesure son propre écart (leçon du zip 387). Ici,
   l'inversion est la MÊME opération des deux côtés. */
function flipH(g, w, h) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < (w >> 1); x++) {
    const a = (y * w + x) * 4, b = (y * w + (w - 1 - x)) * 4;
    for (let k = 0; k < 4; k++) { const t = d[a + k]; d[a + k] = d[b + k]; d[b + k] = t; }
  }
  g.putImageData(im, 0, 0);
}

/* ===========================================================================
   LES FAMILIERS — QUATRE DIRECTIONS, TROIS FRAMES
   ---------------------------------------------------------------------------
   Zip 248 : chaque race porte sa VRAIE palette et son motif (fini le dalmatien
   violet), chat et chien ont des silhouettes réellement distinctes.
   Zip 251 : contour aminci partout sauf sur le dalmatien.
   Zip 388 : le sprite devient une PLANCHE. `dir` 0 = face, 1 = dos, 2 = gauche,
   3 = droite ; `frame` 0 = repos, 1 et 2 = les deux contacts de la foulée.

   Ce qui fait la marche, à cette taille, tient en trois choses et pas une de
   plus : les pattes AVANT et ARRIÈRE partent en sens opposés (`gait`), une
   patte sur deux se raccourcit d'un pixel pour lire comme levée, et la queue
   balaie d'un pixel (`sway`). Un quatrième effet (le corps qui monte et
   descend) existe déjà côté rendu — c'est le `bob` de drawPetsFor — et le
   remettre ici le doublerait.

   Le profil GAUCHE est le profil droit inversé : une seule description de
   l'animal de profil, donc aucune divergence possible entre les deux sens
   (règle du zip 387). Face et dos sont, eux, de vrais dessins : un chat vu de
   face n'est pas un chat de profil aplati, et c'est précisément ce que
   Guillaume demande de corriger.
   =========================================================================== */
export function petSprite(petId, dir, frame) {
  dir = (dir | 0) % C.PET_DIRS; frame = (frame | 0) % C.PET_FRAMES;
  const spec = C.PET_CATALOG[petId] || {};
  const kind = spec.body || "critter";
  const coat = spec.coat || "#b0a898";
  const shade = spec.shade || "#8a8274";
  const belly = spec.belly || "#e2ddd2";
  const mark = spec.mark || shade;
  const mark2 = spec.mark2 || mark;
  const eyeC = spec.eye || "#3a3a3a";
  const noseC = spec.nose || "#2a2320";
  const pattern = spec.pattern || "solid";
  const fluff = spec.fluff | 0;
  const ears = spec.ears || (kind === "cat" ? "cat" : "floppy");
  const tail = spec.tail || (kind === "cat" ? "cat" : "up");
  const T = SPR_T;
  const [c, g] = sprCv(T, T);
  // Aléa DÉTERMINISTE par identifiant : les taches d'un dalmatien doivent être
  // identiques d'une session à l'autre ET d'une frame à l'autre, sinon le
  // sprite scintille dès qu'il marche. La graine ne dépend donc NI de `dir`,
  // NI de `frame` — c'est le piège de ce chantier, et il ne se voit qu'en
  // mouvement.
  let sd = 0; for (let i = 0; i < petId.length; i++) sd = (sd * 31 + petId.charCodeAt(i)) & 0x7fffffff;
  const rnd = sprRnd(sd + 7);
  const PUPIL = SPR_PUPIL, OUT = SPR_OUT;

  // Décalages de foulée. frame 0 : à l'arrêt, tout est aligné.
  const gait = frame === 0 ? 0 : (frame === 1 ? 1 : -1);
  const sway = frame === 0 ? 0 : (frame === 1 ? -1 : 1);
  const liftF = frame === 2 ? 1 : 0;    // patte avant levée sur la frame 2
  const liftB = frame === 1 ? 1 : 0;    // patte arrière levée sur la frame 1
  // Ton des pattes du côté OPPOSÉ (celles qu'on voit derrière le corps) :
  // le même `shade` assombri d'un voile, pour que la paire lointaine recule
  // sans introduire une couleur qui n'est pas dans la palette de la race.
  const farLeg = (x, y, w, h) => { PX(g, x, y, w, h, shade); PX(g, x, y, w, h, "rgba(0,0,0,0.28)"); };

  /* -------------------------------------------------- PROFIL (droite) --- */
  function drawSide() {
    if (kind === "cat" || kind === "dog") {
      const isCat = kind === "cat";
      const low = !!spec.longBody;
      const bx = low ? 2 : 3, bw = low ? 10 : (isCat ? 8 : 9);
      const legA = bx + 1 + gait, legB = bx + bw - 3 - gait;   // près : avant / arrière

      // ---- queue (en premier : le corps recouvre sa racine) ----
      const ty = 0 + sway;
      if (tail === "cat") { PX(g, 1, 6 + ty, 2, 6, coat); PX(g, 2, 5 + ty, 2, 1, coat); }
      else if (tail === "curl") { PX(g, 1, 7 + ty, 3, 2, coat); PX(g, 1, 5 + ty, 2, 3, coat); }
      else if (tail === "plume") { PX(g, 1, 6 + ty, 3, 4, coat); PX(g, 2, 4 + ty, 2, 2, coat); }
      else if (tail === "pom") { PX(g, 1, 6 + ty, 3, 3, coat); }
      else if (tail === "bushy") { PX(g, 1, 7 + ty, 3, 5, coat); }
      else if (tail === "stub") { PX(g, 2, 10, 2, 2, coat); }
      else { PX(g, 1, 6 + ty, 2, 4, coat); }

      // ---- pattes LOINTAINES (avant le corps : elles passent derrière) ----
      farLeg(bx + 2 - gait, 13, 2, 2 - liftB);
      farLeg(bx + bw - 4 + gait, 13, 2, 2 - liftF);

      // ---- corps + pattes proches ----
      PX(g, bx, 9, bw, 4, coat);
      PX(g, bx + 1, 12, bw - 2, 1, belly);
      PX(g, legA, 13, 2, 2 - liftF, shade);
      PX(g, legB, 13, 2, 2 - liftB, shade);

      // ---- tête ----
      if (isCat) {
        PX(g, 8, 3, 7, 6, coat);
        PX(g, spec.flatFace ? 10 : 11, spec.flatFace ? 5 : 6, spec.flatFace ? 5 : 4, 2, belly);
      } else {
        PX(g, 8, 3, 6, 6, coat);
        PX(g, 12, 6, spec.flatFace ? 2 : 3, 3, belly);
      }

      // ---- oreilles ----
      if (ears === "cat") {
        PX(g, 8, 1, 2, 3, coat); PX(g, 12, 1, 2, 3, coat);
        PX(g, 9, 2, 1, 1, noseC); PX(g, 12, 2, 1, 1, noseC);
        if (spec.tufts) { PX(g, 8, 0, 1, 1, belly); PX(g, 13, 0, 1, 1, belly); }
      } else if (ears === "perky") {
        PX(g, 8, 1, 2, 3, coat); PX(g, 11, 1, 2, 3, coat);
        PX(g, 8, 2, 1, 1, noseC); PX(g, 12, 2, 1, 1, noseC);
      } else if (ears === "semi") {
        PX(g, 8, 2, 2, 3, coat); PX(g, 11, 2, 2, 3, coat);
        PX(g, 8, 2, 2, 1, shade); PX(g, 11, 2, 2, 1, shade);
      } else if (ears === "tiny") {
        PX(g, 8, 2, 2, 2, coat); PX(g, 11, 2, 2, 2, coat);
      } else if (ears === "rose") {
        PX(g, 7, 4, 2, 2, shade); PX(g, 12, 3, 2, 2, shade);
      } else if (ears === "long") {
        PX(g, 6, 4, 2, 8, shade); PX(g, 13, 3, 1, 3, shade);
      } else {
        PX(g, 6, 4, 2, 6, shade); PX(g, 13, 3, 1, 3, shade);
      }

      // ---- motif : découpé sur la silhouette ----
      g.globalCompositeOperation = "source-atop";
      if (pattern === "tabby") {
        for (const sx of [bx + 2, bx + 4, bx + 6]) PX(g, sx, 9, 1, 4, mark);
        PX(g, 10, 3, 1, 2, mark); PX(g, 12, 3, 1, 2, mark);
        PX(g, 1, 7, 2, 1, mark); PX(g, 1, 10, 2, 1, mark);
      } else if (pattern === "spots") {
        for (let i = 0; i < 12; i++) PX(g, 2 + Math.floor(rnd() * 11), 2 + Math.floor(rnd() * 11), 2, 2, mark);
        for (let i = 0; i < 9; i++) PX(g, 1 + Math.floor(rnd() * 13), 2 + Math.floor(rnd() * 12), 1, 1, mark);
      } else if (pattern === "rosette") {
        for (let i = 0; i < 7; i++) { const sx = bx + Math.floor(rnd() * (bw - 2)), sy = 9 + Math.floor(rnd() * 3); PX(g, sx, sy, 2, 1, mark); PX(g, sx, sy + 1, 1, 1, mark); }
        PX(g, 10, 3, 1, 2, mark); PX(g, 12, 3, 1, 2, mark);
      } else if (pattern === "calico") {
        PX(g, bx, 9, 4, 3, mark); PX(g, 1, 5, 3, 4, mark);
        PX(g, 9, 1, 4, 3, mark2); PX(g, bx + 4, 10, 4, 3, mark2);
      } else if (pattern === "points") {
        PX(g, 8, 1, 7, 3, mark);
        PX(g, 11, 5, 4, 4, mark);
        PX(g, 1, 4, 3, 8, mark);
        PX(g, legA, 13, 2, 2, mark); PX(g, legB, 13, 2, 2, mark);
      } else if (pattern === "tuxedo") {
        PX(g, 11, 6, 4, 2, mark);
        PX(g, bx + 2, 10, 5, 3, mark);
        PX(g, legA, 13, 2, 2, mark); PX(g, legB, 13, 2, 2, mark);
      } else if (pattern === "saddle") {
        PX(g, 8, 3, 7, 5, mark); PX(g, 6, 4, 2, 8, mark);
        PX(g, bx, 9, bw - 2, 3, mark2);
      } else if (pattern === "mask") {
        PX(g, 11, 4, 4, 5, mark); PX(g, 9, 4, 2, 2, mark);
        PX(g, bx + 1, 10, 6, 3, belly);
        PX(g, legA, 13, 2, 2, belly); PX(g, legB, 13, 2, 2, belly);
      } else if (pattern === "blaze") {
        PX(g, 11, 3, 2, 4, mark);
        PX(g, bx + 1, 10, 6, 3, mark);
        PX(g, legA, 13, 2, 2, mark); PX(g, legB, 13, 2, 2, mark);
      } else if (pattern === "patches") {
        PX(g, 8, 3, 5, 4, mark);
        PX(g, bx, 9, 4, 3, mark);
        if (ears === "long" || ears === "floppy") PX(g, 6, 4, 2, 8, mark);
      }
      if (spec.curly) for (let i = 0; i < 18; i++) PX(g, 2 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 11), 1, 1, shade);
      if (spec.scruffy) for (let i = 0; i < 10; i++) PX(g, bx + Math.floor(rnd() * bw), 8 + Math.floor(rnd() * 5), 1, 1, shade);
      if (fluff >= 2) PX(g, 7, 8, 2, 5, belly);
      g.globalCompositeOperation = "source-over";

      // ---- yeux / truffe ----
      if (isCat) {
        PX(g, 10, 5, 1, 2, eyeC); PX(g, 13, 5, 1, 2, eyeC);
        PX(g, 10, 5, 1, 1, PUPIL); PX(g, 13, 5, 1, 1, PUPIL);
        PX(g, 12, 7, 1, 1, noseC);
      } else {
        PX(g, 10, 4, 1, 2, eyeC); PX(g, 12, 4, 1, 2, eyeC);
        PX(g, 10, 4, 1, 1, PUPIL); PX(g, 12, 4, 1, 1, PUPIL);
        PX(g, spec.flatFace ? 13 : 14, 6, 1, 2, noseC);
      }
    } else if (kind === "dragon") {
      PX(g, 3, 8, 8, 5, coat); PX(g, 4, 12, 6, 1, belly);
      PX(g, 9, 3, 6, 6, coat); PX(g, 11, 7, 3, 1, belly);
      PX(g, 2, 4 + sway, 4, 5, shade);                            // aile : elle bat
      for (let i = 0; i < 4; i++) PX(g, 4 + i * 2, 6 + (i % 2), 1, 2, mark);
      PX(g, 13, 1, 1, 3, mark); PX(g, 10, 1, 1, 2, mark);
      PX(g, 1, 10 + sway, 3, 2, coat);
      PX(g, 4 + gait, 13, 2, 2 - liftF, shade); PX(g, 8 - gait, 13, 2, 2 - liftB, shade);
      PX(g, 12, 5, 1, 2, eyeC); PX(g, 12, 5, 1, 1, PUPIL);
      PX(g, 14, 7, 1, 1, noseC);
    } else if (kind === "horse") {
      PX(g, 3, 8, 8, 5, coat); PX(g, 4, 12, 6, 1, belly);
      PX(g, 10, 3, 4, 6, coat); PX(g, 12, 7, 2, 2, belly);
      PX(g, 9, 2, 2, 6, mark);
      PX(g, 1, 7 + sway, 3, 5, mark);
      PX(g, 12, 0, 1, 3, "#ffd75e"); PX(g, 12, 0, 1, 1, "#fff0b0");
      farLeg(5 - gait, 13, 2, 2 - liftB);
      PX(g, 4 + gait, 13, 2, 2 - liftF, shade); PX(g, 9 - gait, 13, 2, 2 - liftB, shade);
      PX(g, 12, 5, 1, 2, eyeC); PX(g, 12, 5, 1, 1, PUPIL);
      PX(g, 13, 8, 1, 1, noseC);
    } else if (kind === "turtle") {
      PX(g, 2, 6, 10, 6, shade); PX(g, 3, 7, 8, 4, coat);
      for (const [sx, sy] of [[4, 8], [7, 8], [5, 10], [8, 10]]) PX(g, sx, sy, 2, 1, mark);
      PX(g, 11, 8 - (frame === 1 ? 1 : 0), 4, 4, coat);           // la tête sort et rentre
      PX(g, 12, 11 - (frame === 1 ? 1 : 0), 3, 1, belly);
      PX(g, 1, 9 + sway, 2, 2, coat);
      PX(g, 3 + gait, 12, 2, 2 - liftF, coat); PX(g, 9 - gait, 12, 2, 2 - liftB, coat);
      PX(g, 13, 9 - (frame === 1 ? 1 : 0), 1, 2, eyeC); PX(g, 13, 9 - (frame === 1 ? 1 : 0), 1, 1, PUPIL);
    } else if (kind === "lamb") {
      PX(g, 2, 5, 10, 7, coat);
      for (let i = 0; i < 16; i++) PX(g, 2 + Math.floor(rnd() * 10), 5 + Math.floor(rnd() * 6), 1, 1, shade);
      PX(g, 10, 7, 5, 4, mark); PX(g, 11, 10, 3, 1, belly);
      PX(g, 9, 7, 2, 2, mark); PX(g, 14, 7, 1, 2, mark);
      farLeg(4 - gait, 12, 2, 2 - liftB);
      PX(g, 3 + gait, 12, 2, 2 - liftF, mark); PX(g, 9 - gait, 12, 2, 2 - liftB, mark);
      PX(g, 12, 8, 1, 2, eyeC); PX(g, 12, 8, 1, 1, PUPIL);
      PX(g, 14, 9, 1, 1, noseC);
    } else {
      // Petits mammifères (moufette, renard, souris).
      PX(g, 4, 8, 7, 5, coat); PX(g, 5, 12, 5, 1, belly);
      PX(g, 9, 4, 6, 5, coat); PX(g, 11, 8, 3, 1, belly);
      PX(g, 8, 2, 3, 3, coat); PX(g, 12, 2, 3, 3, coat);
      PX(g, 9, 3, 1, 1, noseC); PX(g, 13, 3, 1, 1, noseC);
      PX(g, 1, 5 + sway, 4, 7, coat);
      farLeg(6 - gait, 13, 2, 2 - liftB);
      PX(g, 5 + gait, 13, 2, 2 - liftF, shade); PX(g, 9 - gait, 13, 2, 2 - liftB, shade);
      g.globalCompositeOperation = "source-atop";
      if (pattern === "stripe") { PX(g, 6, 6, 2, 7, mark); PX(g, 1, 4, 4, 5, mark); PX(g, 11, 3, 1, 4, mark); }
      else if (pattern === "tips") { PX(g, 1, 4, 3, 3, mark); PX(g, 11, 8, 4, 2, mark); }
      g.globalCompositeOperation = "source-over";
      PX(g, 11, 6, 1, 2, eyeC); PX(g, 11, 6, 1, 1, PUPIL);
      PX(g, 14, 7, 1, 1, noseC);
    }
  }

  /* ------------------------------------------------ OREILLES DE FACE --- */
  function earsFrontBack(front) {
    const inner = front ? noseC : shade;
    if (ears === "cat" || ears === "perky") {
      PX(g, 4, 0, 2, 3, coat); PX(g, 10, 0, 2, 3, coat);
      PX(g, 4, 1, 1, 1, inner); PX(g, 11, 1, 1, 1, inner);
      if (spec.tufts) { PX(g, 4, 0, 1, 1, belly); PX(g, 11, 0, 1, 1, belly); }
    } else if (ears === "semi") {
      PX(g, 4, 1, 2, 3, coat); PX(g, 10, 1, 2, 3, coat);
      PX(g, 4, 1, 2, 1, shade); PX(g, 10, 1, 2, 1, shade);
    } else if (ears === "tiny") {
      PX(g, 4, 1, 2, 2, coat); PX(g, 10, 1, 2, 2, coat);
    } else if (ears === "rose") {
      PX(g, 3, 4, 2, 2, shade); PX(g, 11, 4, 2, 2, shade);
    } else if (ears === "long") {
      PX(g, 3, 3, 2, 8, shade); PX(g, 11, 3, 2, 8, shade);
    } else {                                   // floppy
      PX(g, 3, 3, 2, 6, shade); PX(g, 11, 3, 2, 6, shade);
    }
  }

  /* --------------------------------- MOTIF, VERSION FACE ET DOS --------- */
  function patternFrontBack(front) {
    g.globalCompositeOperation = "source-atop";
    if (pattern === "tabby" || pattern === "rosette") {
      PX(g, 7, 1, 2, 4, mark);                                 // raie médiane du crâne
      for (const sx of [5, 8, 10]) PX(g, sx, 8, 1, 4, mark);
    } else if (pattern === "spots") {
      for (let i = 0; i < 14; i++) PX(g, 2 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 11), 2, 2, mark);
    } else if (pattern === "calico") {
      PX(g, 3, 2, 4, 4, mark); PX(g, 9, 8, 4, 4, mark2);
    } else if (pattern === "points") {
      PX(g, 4, 0, 8, 3, mark);
      if (front) PX(g, 5, 5, 6, 4, mark);
      PX(g, 4, 13, 3, 2, mark); PX(g, 9, 13, 3, 2, mark);
    } else if (pattern === "tuxedo" || pattern === "blaze") {
      if (front) { PX(g, 7, 2, 2, 6, mark); PX(g, 5, 9, 6, 4, mark); }
      PX(g, 4, 13, 3, 2, mark); PX(g, 9, 13, 3, 2, mark);
    } else if (pattern === "saddle") {
      PX(g, 4, 1, 8, 6, mark); PX(g, 5, 7, 6, 5, mark2);
    } else if (pattern === "mask") {
      if (front) { PX(g, 4, 3, 8, 4, mark); PX(g, 5, 9, 6, 4, belly); }
      else PX(g, 4, 2, 8, 4, mark);
    } else if (pattern === "patches") {
      PX(g, 3, 2, 5, 4, mark); PX(g, 8, 8, 4, 4, mark);
    } else if (pattern === "stripe") {
      PX(g, 7, 0, 2, 14, mark);
    } else if (pattern === "tips") {
      PX(g, 4, 0, 2, 3, mark); PX(g, 10, 0, 2, 3, mark);
    }
    if (spec.curly) for (let i = 0; i < 18; i++) PX(g, 2 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 11), 1, 1, shade);
    if (fluff >= 2) { PX(g, 3, 7, 10, 3, belly); PX(g, 4, 6, 8, 1, belly); }
    g.globalCompositeOperation = "source-over";
  }

  /* ------------------------------------------------------------- FACE --- */
  function drawFront() {
    // Queue : elle dépasse derrière, d'un côté, et balaie.
    // Même précaution de face : la queue qui dépasse sur le flanc doit être
    // cernée, sinon elle se fond dans le poitrail.
    if (tail !== "stub") { PX(g, 11 + sway, 8, 2, 6, shade); PX(g, 11 + sway, 9, 2, 4, coat); }
    // Pattes arrière, à peine visibles derrière le poitrail.
    farLeg(3, 12, 2, 3); farLeg(11, 12, 2, 3);
    /* POITRAIL PLUS ÉTROIT QUE LA TÊTE, et c'est tout le sujet. Le premier jet
       donnait au corps et au crâne la même largeur de 8 px : à l'écran, un
       rectangle uniforme de 14 px de haut où l'on ne distinguait plus la bête.
       C'est mot pour mot le défaut « too ambiguous » que le zip 248 avait
       corrigé sur le profil — et que la vue de face venait de réintroduire.
       Tronc de 6 px, épaules de 8 px : le rétrécissement à hauteur du cou est
       ce qui fait lire une tête. */
    PX(g, 5, 9, 6, 4, coat);
    PX(g, 4, 10, 8, 3, coat);                                   // épaules
    PX(g, 6, 11, 4, 2, belly);
    // Pattes avant.
    PX(g, 4 + gait, 13, 3, 2 - liftF, shade);
    PX(g, 9 - gait, 13, 3, 2 - liftB, shade);
    // Tête, coins coupés en haut et en bas : un carré plein lit comme une boîte.
    earsFrontBack(true);
    PX(g, 4, 2, 8, 6, coat);
    PX(g, 5, 1, 6, 1, coat); PX(g, 5, 8, 6, 1, coat);
    PX(g, 5, 2, 6, 1, shade);                                   // ligne de crâne
    PX(g, 6, 6, 4, 3, belly);                                   // museau
    if (kind === "horse") { PX(g, 5, 0, 6, 3, mark); PX(g, 7, 0, 2, 2, "#ffd75e"); } // toupet + corne
    if (kind === "dragon") { PX(g, 3, 0, 2, 2, mark); PX(g, 11, 0, 2, 2, mark); }    // cornes
    if (kind === "turtle") { PX(g, 2, 6, 12, 6, shade); PX(g, 3, 7, 10, 4, coat); PX(g, 5, 2, 6, 6, coat); PX(g, 6, 6, 4, 2, belly); }
    patternFrontBack(true);
    // Yeux bien écartés, pupille en haut à l'extérieur : c'est ce qui rend la
    // bestiole attachante plutôt que fixe.
    PX(g, 5, 4, 2, 2, eyeC); PX(g, 9, 4, 2, 2, eyeC);
    PX(g, 5, 4, 1, 1, PUPIL); PX(g, 10, 4, 1, 1, PUPIL);
    PX(g, 7, 6, 2, 1, noseC); PX(g, 7, 7, 2, 1, "rgba(0,0,0,0.18)");
    if (kind === "cat" || kind === "critter") { PX(g, 2, 7, 2, 1, belly); PX(g, 12, 7, 2, 1, belly); } // moustaches
  }

  /* -------------------------------------------------------------- DOS --- */
  function drawBack() {
    farLeg(3, 12, 2, 3); farLeg(11, 12, 2, 3);
    PX(g, 5, 9, 6, 4, coat);                                    // croupe
    PX(g, 4, 10, 8, 3, coat);
    PX(g, 5, 12, 6, 1, shade);
    PX(g, 4 + gait, 13, 3, 2 - liftF, shade);
    PX(g, 9 - gait, 13, 3, 2 - liftB, shade);
    earsFrontBack(false);
    PX(g, 4, 2, 8, 6, coat);                                    // arrière du crâne
    PX(g, 5, 1, 6, 1, coat); PX(g, 5, 8, 6, 1, coat);
    PX(g, 5, 2, 6, 2, shade);
    if (kind === "turtle") { PX(g, 2, 5, 12, 8, shade); PX(g, 3, 6, 10, 6, coat); for (const [sx, sy] of [[4, 7], [8, 7], [6, 10]]) PX(g, sx, sy, 2, 2, mark); }
    patternFrontBack(false);
    // La queue passe PAR-DESSUS le dos : c'est elle qui dit « je m'éloigne ».
    /* ⚠️ LA QUEUE DOIT ÊTRE CERNÉE, sinon elle n'existe pas.
       Défaut trouvé sur pets-dirs.png : peinte en `coat` par-dessus un dos
       également en `coat`, elle était rigoureusement invisible — le chat
       d'ombre vu de dos était un rectangle violet uni. C'est la variante,
       pour un seul sprite, du problème que le liseré du zip 248 avait résolu
       pour la silhouette entière : deux masses de même couleur qui se
       touchent ne font qu'une masse.
       On pose donc la forme d'abord en `shade`, un pixel plus large de chaque
       côté, puis le pelage à l'intérieur. Aucun contour à calculer, et ça
       marche pour les huit types de queue d'un coup. */
    const tx = 7 + sway;
    const tl = (x, y, w, h) => { PX(g, x - 1, y, w + 2, h, shade); PX(g, x, y, w, h, coat); };
    if (tail === "cat") { tl(tx, 4, 2, 9); tl(tx, 3, 2, 2); }
    else if (tail === "curl") { tl(tx, 6, 2, 5); tl(tx - 2, 5, 3, 2); }
    else if (tail === "plume") { tl(tx - 1, 4, 4, 8); tl(tx, 3, 2, 2); }
    else if (tail === "pom") { tl(tx - 1, 6, 4, 4); }
    else if (tail === "bushy") { tl(tx - 1, 4, 4, 9); }
    else if (tail === "stub") { tl(tx, 8, 2, 3); }
    else { tl(tx, 5, 2, 7); }
    if (pattern === "stripe") PX(g, tx, 4, 2, 5, mark);
    if (pattern === "tips") PX(g, tx, 3, 2, 3, mark);
  }

  if (dir === 2 || dir === 3) { drawSide(); if (dir === 2) flipH(g, T, T); }
  else if (dir === 0) drawFront();
  else drawBack();

  // Zip 251 : contour plein pour le dalmatien, aminci pour tous les autres.
  const petOut = petId === "dog_dalmatian" ? OUT : "rgba(36,31,28,0.45)";
  outlineSprite(g, T, T, petOut);
  return c;
}

/* Petites bulles au-dessus de la tête pendant les jeux. Sans elles, un
   familier qui tourne sur lui-même et un familier qui s'assoit se ressemblent
   trop — c'est la même leçon que les retours visuels du Gourmandin (zip 387) :
   un geste réussi et un geste raté doivent se distinguer. 8x8, fillRect seul. */
export function petEmoteSprite(kind) {
  const [c, g] = sprCv(8, 8);
  if (kind === "heart") {
    PX(g, 1, 2, 2, 2, "#e8456b"); PX(g, 5, 2, 2, 2, "#e8456b");
    PX(g, 1, 3, 6, 2, "#e8456b"); PX(g, 2, 5, 4, 1, "#e8456b"); PX(g, 3, 6, 2, 1, "#e8456b");
    PX(g, 2, 3, 1, 1, "#f7a0b8");
  } else if (kind === "note") {
    PX(g, 5, 1, 1, 5, "#4a3f6a"); PX(g, 3, 5, 3, 2, "#4a3f6a"); PX(g, 5, 1, 2, 1, "#4a3f6a");
  } else if (kind === "spark") {
    PX(g, 3, 0, 2, 8, "#f4d548"); PX(g, 0, 3, 8, 2, "#f4d548");
    PX(g, 2, 2, 4, 4, "#fff0b0");
  } else if (kind === "excl") {
    PX(g, 3, 0, 2, 5, "#f2f0e8"); PX(g, 3, 6, 2, 2, "#f2f0e8");
  } else {                                   // "zzz"
    PX(g, 1, 1, 4, 1, "#dfe6f0"); PX(g, 3, 2, 2, 1, "#dfe6f0"); PX(g, 1, 3, 4, 1, "#dfe6f0");
    PX(g, 4, 4, 3, 1, "#dfe6f0"); PX(g, 5, 5, 2, 1, "#dfe6f0"); PX(g, 4, 6, 3, 1, "#dfe6f0");
  }
  outlineSprite(g, 8, 8, "rgba(24,20,18,0.55)");
  return c;
}

/* ===========================================================================
   ZIP 388 — LES SEIZE FLEURS EN POTS
   ---------------------------------------------------------------------------
   Un seul dessinateur, neuf silhouettes de floraison, seize entrées de
   catalogue. C'est délibéré : seize dessins recopiés auraient divergé au
   premier ajustement (leçon du zip 387, « deux descriptions d'une même chose
   finissent toujours par diverger »), et surtout on ne peut pas les comparer.
   Là, `render-flowers.mjs` les dessine sur une seule planche et on VOIT
   laquelle ne se distingue pas de sa voisine.

   Le pot est commun à toutes — c'est ce qui donne son unité au catalogue —
   mais sa terre change de teinte (`pot`), et sa forme est légèrement conique :
   à 20 px de large, un pot rectangulaire lit comme une caisse.

   Canvas 20x28, dessin ancré en bas comme les autres décorations : les pieds
   reposent vers y = 27.
   =========================================================================== */
export function flowerPotSprite(spec) {
  const W = 20, H = 28;
  const [c, g] = sprCv(W, H);
  const bloom = spec.bloom || "#e2456b";
  const bloom2 = spec.bloom2 || "#f7c0d0";
  const leaf = spec.leaf || "#4a8f3c";
  const leafD = "rgba(0,0,0,0.22)";
  const potC = spec.pot || "#b5623c";
  const shape = spec.shape || "cup";
  const cx = 10;
  // Base de la floraison : plus haut pour les grandes tiges.
  const ty = spec.tall ? 2 : 6;

  /* ------------------------------------------------------------ LE POT --- */
  // Rebord, puis corps conique rangée par rangée. Deux teintes seulement :
  // la terre et un voile sombre — un pot en dégradé mangerait la fleur.
  PX(g, 3, 18, 14, 3, potC);
  PX(g, 3, 18, 14, 1, "rgba(255,255,255,0.22)");
  PX(g, 4, 21, 12, 2, potC);
  PX(g, 5, 23, 10, 2, potC);
  PX(g, 5, 25, 10, 2, potC);
  PX(g, 6, 27, 8, 1, potC);
  PX(g, 12, 21, 4, 6, "rgba(0,0,0,0.20)");     // flanc droit dans l'ombre
  PX(g, 4, 21, 2, 4, "rgba(255,255,255,0.12)"); // flanc gauche éclairé
  PX(g, 4, 19, 12, 2, "#4a3a2a");               // terre
  for (let i = 0; i < 5; i++) PX(g, 5 + i * 2, 19, 1, 1, "#5e4a34");

  /* ------------------------------------------------------------- CACTUS --- */
  // Le cactus n'a ni tige ni feuille : la plante EST le corps. Il sort donc
  // AVANT le feuillage, et non en dernier avec un rectangle transparent censé
  // effacer les tiges — un fillRect à alpha 0 ne peint rien, il ne gomme pas.
  // (Défaut réel de la première version, trouvé sur la planche.)
  if (shape === "cactus") {
    PX(g, 7, 5, 6, 14, leaf);
    PX(g, 4, 10, 3, 6, leaf); PX(g, 13, 8, 3, 7, leaf);
    for (let y = 6; y < 19; y += 2) { PX(g, 8, y, 1, 1, "rgba(255,255,255,0.25)"); PX(g, 11, y, 1, 1, "rgba(0,0,0,0.20)"); }
    PX(g, 5, 11, 1, 4, "rgba(255,255,255,0.20)"); PX(g, 15, 9, 1, 5, "rgba(0,0,0,0.18)");
    PX(g, 8, 2, 4, 3, bloom); PX(g, 7, 3, 6, 1, bloom);      // fleur au sommet
    PX(g, 9, 3, 2, 1, bloom2);
    PX(g, 4, 8, 3, 2, bloom); PX(g, 14, 6, 2, 2, bloom);      // deux boutons latéraux
    outlineSprite(g, W, H, "rgba(36,31,28,0.45)");
    return c;
  }

  /* ---------------------------------------------------------- FEUILLAGE --- */
  /* HAUTEUR DE FLORAISON, calculée et non devinée. Chaque silhouette monte
     d'un nombre de pixels connu au-dessus du sommet de sa tige (`up`) ; on
     dimensionne les tiges pour que la plus haute laisse UN pixel de marge en
     haut du canevas — celui du contour.

     C'est ce qui a corrigé le seul vrai défaut de la première planche : la
     jacinthe (épi de 12 px sur une tige « tall ») sortait du cadre et se
     faisait trancher. `render-flowers.mjs` l'a signalée avant qu'elle
     n'arrive en jeu ; à l'œil seul, on l'aurait prise pour un choix. */
  // Valeurs = extension RÉELLE de la silhouette au-dessus du sommet de tige,
  // PLUS UN PIXEL pour l'anneau de contour. C'est ce « plus un » qui manquait
  // au premier jet : cinq fleurs sur seize se faisaient trancher non par leur
  // dessin mais par leur liseré, ce qui est indétectable en relisant le code.
  const UP = { cup: 6, ray: spec.single ? 11 : 6, spike: 12, cluster: 6, bell: 7, rose: 6, trumpet: 6, pom: 7, pad: 6 };
  const up = UP[shape] || 6;
  const hMax = Math.max(4, 18 - up);
  const hTop = spec.tall ? hMax : Math.max(4, hMax - 3);
  // Trois tiges, jamais de même hauteur ni régulièrement espacées : alignées,
  // elles se lisent comme un peigne. Écart de 5 px pour que trois fleurs de
  // 5 px de large ne se touchent pas — c'est l'autre défaut de la première
  // planche, où les trois têtes fusionnaient en une seule masse.
  const stems = spec.single
    ? [[cx, hTop]]
    : [[cx - 5, hTop - 2], [cx, hTop], [cx + 5, hTop - 4]];
  for (const [sx, sh] of stems) PX(g, sx, 19 - sh, 1, sh, leaf);
  /* TOUFFE DE FEUILLAGE. Sur la deuxième planche, les seize fleurs lisaient
     comme « trois bâtons surmontés d'une tache » : la moitié basse du sprite
     était vide entre le rebord du pot et la floraison. Aucune constante ne dit
     ça — c'est exactement le genre de défaut que seule une planche montre.

     La touffe est un ÉVENTAIL qui s'évase vers le bas : rangée pleine juste
     au-dessus du rebord, puis deux lobes qui s'écartent, puis deux feuilles
     arquées en pointe. Symétrique en masse, jamais en pixels — une symétrie
     exacte se lit comme un motif, pas comme une plante. */
  PX(g, cx - 5, 17, 11, 1, leaf);
  PX(g, cx - 6, 16, 5, 1, leaf); PX(g, cx + 2, 16, 5, 1, leaf);
  PX(g, cx - 4, 15, 3, 1, leaf); PX(g, cx + 2, 15, 4, 1, leaf);
  PX(g, cx - 7, 14, 3, 1, leaf); PX(g, cx + 4, 13, 3, 1, leaf);
  PX(g, cx - 3, 13, 2, 1, leaf); PX(g, cx + 1, 12, 2, 1, leaf);
  // Ombres portées : sans elles la touffe est un aplat vert et perd sa masse.
  PX(g, cx - 5, 18, 11, 1, leafD);
  PX(g, cx - 6, 17, 4, 1, leafD); PX(g, cx + 3, 17, 4, 1, leafD);
  PX(g, cx - 4, 16, 2, 1, leafD); PX(g, cx + 3, 16, 3, 1, leafD);
  PX(g, cx - 7, 15, 3, 1, leafD); PX(g, cx + 4, 14, 3, 1, leafD);
  // Le tournesol n'a qu'une tige : il lui faut ses deux grandes feuilles
  // caractéristiques, sinon la tige seule est un manche à balai.
  if (spec.single) {
    PX(g, cx - 6, 11, 5, 2, leaf); PX(g, cx + 2, 13, 5, 2, leaf);
    PX(g, cx - 6, 12, 5, 1, leafD); PX(g, cx + 2, 14, 5, 1, leafD);
  }

  /* --------------------------------------------------------- FLORAISON --- */
  const heads = stems.map(([sx, sh]) => [sx, 19 - sh]);   // sommet de chaque tige

  for (const [hx, hy] of heads) {
    if (shape === "cup") {                       // tulipe, coquelicot
      PX(g, hx - 2, hy - 4, 5, 4, bloom);
      PX(g, hx - 2, hy - 5, 1, 1, bloom); PX(g, hx, hy - 5, 1, 1, bloom); PX(g, hx + 2, hy - 5, 1, 1, bloom);
      PX(g, hx - 1, hy - 3, 1, 3, bloom2);       // pli central sombre (cœur du coquelicot)
      PX(g, hx + 1, hy - 4, 1, 2, "rgba(255,255,255,0.22)");
    } else if (shape === "ray" && spec.single) {  // tournesol : une seule grosse tête
      // Huit pétales POSÉS UN PAR UN, avec un creux entre chacun. Le premier
      // jet peignait un carré plein avec un cœur au milieu : à l'écran, ça
      // donnait une gaufre jaune à trou brun, pas un tournesol. Ce sont les
      // CREUX qui font la fleur, pas les pétales.
      const cyy = hy - 6;
      PX(g, hx - 1, cyy - 4, 3, 2, bloom); PX(g, hx - 1, cyy + 3, 3, 2, bloom);
      PX(g, hx - 4, cyy - 1, 2, 3, bloom); PX(g, hx + 3, cyy - 1, 2, 3, bloom);
      PX(g, hx - 3, cyy - 3, 2, 2, bloom); PX(g, hx + 2, cyy - 3, 2, 2, bloom);
      PX(g, hx - 3, cyy + 2, 2, 2, bloom); PX(g, hx + 2, cyy + 2, 2, 2, bloom);
      PX(g, hx - 2, cyy - 2, 5, 5, bloom);                    // couronne interne
      PX(g, hx - 2, cyy - 2, 4, 4, bloom2);                   // cœur de graines
      PX(g, hx - 1, cyy - 1, 1, 1, "rgba(255,255,255,0.18)"); // grain qui accroche la lumière
      PX(g, hx, cyy, 1, 1, "rgba(0,0,0,0.25)");
    } else if (shape === "ray") {                // marguerite : trois petites têtes
      const cyy = hy - 3;
      PX(g, hx - 1, cyy - 2, 3, 1, bloom); PX(g, hx - 1, cyy + 2, 3, 1, bloom);
      PX(g, hx - 2, cyy - 1, 1, 3, bloom); PX(g, hx + 2, cyy - 1, 1, 3, bloom);
      PX(g, hx - 1, cyy - 1, 3, 3, bloom);
      PX(g, hx, cyy, 1, 1, bloom2);                           // cœur
    } else if (shape === "spike") {              // lavande, jacinthe
      // Épi : segments de 3 px qui rétrécissent et se décalent d'un pixel en
      // alternance. C'est le décalage qui fait l'épi ; alignés, on lit une
      // colonne.
      for (let i = 0; i < 5; i++) {
        const w = i >= 3 ? 2 : 3;
        PX(g, hx - 1 + (i % 2 ? 1 : 0), hy - 2 - i * 2, w, 2, i % 2 ? bloom2 : bloom);
      }
      PX(g, hx, hy - 11, 1, 1, bloom2);          // pointe de l'épi
    } else if (shape === "cluster") {            // hortensia, géranium
      PX(g, hx - 2, hy - 4, 5, 3, bloom);
      PX(g, hx - 1, hy - 5, 3, 1, bloom);
      PX(g, hx - 2, hy - 4, 2, 1, bloom2); PX(g, hx + 1, hy - 2, 2, 1, bloom2);
      PX(g, hx, hy - 3, 1, 1, bloom2);
    } else if (shape === "bell") {               // iris
      PX(g, hx - 2, hy - 6, 5, 2, bloom);        // étendards dressés
      PX(g, hx - 1, hy - 4, 3, 2, bloom);
      PX(g, hx - 2, hy - 4, 1, 1, bloom); PX(g, hx + 2, hy - 4, 1, 1, bloom);
      PX(g, hx - 1, hy - 2, 3, 2, bloom);        // sabot retombant
      PX(g, hx, hy - 3, 1, 2, bloom2);           // barbe jaune
    } else if (shape === "rose") {               // rosier
      PX(g, hx - 2, hy - 5, 5, 5, bloom);
      PX(g, hx - 1, hy - 4, 3, 3, bloom2);       // cœur enroulé
      PX(g, hx, hy - 3, 1, 1, bloom);
    } else if (shape === "trumpet") {            // jonquille
      PX(g, hx - 2, hy - 4, 5, 3, bloom);        // périanthe plat
      PX(g, hx - 1, hy - 5, 3, 3, bloom2);       // trompette, plus foncée
      PX(g, hx, hy - 5, 1, 1, "rgba(255,255,255,0.4)");
    } else if (shape === "pom") {                // pivoine, œillet
      PX(g, hx - 2, hy - 5, 5, 4, bloom);
      PX(g, hx - 1, hy - 6, 3, 1, bloom);
      for (const [ox, oy] of [[-2, -4], [1, -4], [-1, -2], [1, -2]]) PX(g, hx + ox, hy + oy, 2, 1, bloom2);
    } else {                                     // pad : orchidée, pensée
      PX(g, hx - 2, hy - 4, 5, 3, bloom);        // trois pétales bas
      PX(g, hx - 2, hy - 5, 2, 1, bloom); PX(g, hx + 1, hy - 5, 2, 1, bloom);
      PX(g, hx - 1, hy - 3, 3, 1, bloom2);       // gorge contrastée
      PX(g, hx, hy - 2, 1, 1, bloom2);
    }
  }

  outlineSprite(g, W, H, "rgba(36,31,28,0.45)");
  return c;
}

/* Zip 251 : sprites des décorations offertes. Zip 388 : la fonction devient un
   AIGUILLAGE. Une entrée du catalogue qui porte un `shape` est une fleur en
   pot ; les trois d'origine gardent leur dessin, au pixel près. Une entrée
   inconnue retombe sur le gnome : un catalogue étendu sans habillage doit être
   terne, jamais cassé (même règle que drawBridgeTile, zip 386). */
export function decorSprite(id) {
  const spec = C.UNIQUE_DECORATIONS.find(d => d.id === id);
  if (spec && spec.shape) return flowerPotSprite(spec);
  const [c, g] = sprCv(20, 28);
  if (id === "fountain") {
    PX(g, 3, 22, 14, 5, "#9aa0aa");                   // vasque pierre
    PX(g, 4, 20, 12, 3, "#b6bcc6");
    PX(g, 5, 21, 10, 2, "#3f7fd0");                   // eau
    PX(g, 9, 10, 2, 11, "#b6bcc6");                   // colonne centrale
    PX(g, 7, 9, 6, 2, "#9aa0aa");                     // vasque haute
    PX(g, 8, 8, 4, 1, "#3f7fd0");
    g.fillStyle = "rgba(210,235,255,0.9)"; PX(g, 9, 3, 2, 5, "#cfeaff"); // jet
    PX(g, 7, 6, 1, 2, "#cfeaff"); PX(g, 12, 6, 1, 2, "#cfeaff");
    outlineSprite(g, 20, 28, "#5a606a");
  } else if (id === "sunwheel") {
    PX(g, 9, 12, 2, 15, "#8a6340");                   // poteau
    g.fillStyle = "#e8c24a"; g.beginPath(); g.arc(10, 9, 6, 0, 7); g.fill();   // disque solaire
    g.fillStyle = "#f2d873"; g.beginPath(); g.arc(10, 9, 3, 0, 7); g.fill();
    g.strokeStyle = "#e8c24a"; g.lineWidth = 2;      // rayons
    for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; g.beginPath(); g.moveTo(10 + Math.cos(an) * 6, 9 + Math.sin(an) * 6); g.lineTo(10 + Math.cos(an) * 9, 9 + Math.sin(an) * 9); g.stroke(); }
    outlineSprite(g, 20, 28, "#8a6a2a");
  } else {                                            // gnome (et filet de sécurité)
    PX(g, 7, 20, 6, 6, "#3f6fb0");                    // tunique bleue
    PX(g, 6, 24, 8, 3, "#2f568c");                    // bas de tunique
    PX(g, 8, 15, 4, 5, "#f2d3b0");                    // visage
    PX(g, 7, 19, 6, 2, "#e8e8e8");                    // barbe blanche
    PX(g, 8, 20, 4, 3, "#e8e8e8");
    g.fillStyle = "#c0392b"; g.beginPath(); g.moveTo(6, 15); g.lineTo(14, 15); g.lineTo(10, 4); g.closePath(); g.fill(); // bonnet rouge
    PX(g, 9, 16, 2, 1, "#d9a066");                    // nez
    PX(g, 8, 17, 1, 1, "#2a2320"); PX(g, 11, 17, 1, 1, "#2a2320"); // yeux
    outlineSprite(g, 20, 28, "#241f1c");
  }
  return c;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 428 — LA POSE ASSISE, POUR DE BON. (demande explicite de Guillaume :
   « je veux une position assise soignée quand on utilise un banc »)
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUE FAISAIT LE 427 N'ÉTAIT PAS UNE POSE, C'ÉTAIT UNE COUPE. Il
   dessinait les 17 pixels du HAUT de la feuille, quatre pixels plus bas, et
   s'arrêtait là — un buste tronqué net à mi-cuisse, posé sur le banc. Ça se
   défendait (« vu de dessus, les jambes sont cachées par l'assise »), et c'est
   faux : à cette inclinaison de caméra on voit le devant du personnage, donc on
   voit ses genoux. Un personnage sans jambes ne lit pas comme quelqu'un
   d'assis, il lit comme quelqu'un qui s'enfonce dans le banc.

   ⚠️⚠️ ET LES JAMBES SONT DÉCOUPÉES DANS SA PROPRE FEUILLE, JAMAIS REPEINTES.
   C'est LA décision de ce dessin. Peindre des cuisses avec une couleur de
   pantalon prise dans OUTFITS marcherait — jusqu'au premier article de la
   garde-robe : la teinte du 427 est CUITE dans la feuille de sprite (c'est
   même toute son astuce, cinq caractères qui servent de clé de cache). Deux
   sources pour la même couleur, c'est la divergence en attente du §8, et le
   symptôme aurait été « le pantalon acheté à la Maison Garfield ne se voit pas
   quand on s'assoit ». En redécoupant la feuille, la pose hérite GRATUITEMENT
   de la tenue, de la teinte, de la salopette, de la combinaison d'apiculteur
   et de tout ce qu'on ajoutera.

   La recette, en trois tranches prises dans les 24 px de la pose :
     0..15  le buste et la tête, tels quels ;
     16..20 les cuisses, ÉCRASÉES en 2 px : elles pointent vers la caméra, donc
            elles sont vues en raccourci — c'est ce raccourci, et lui seul, qui
            fait lire « assis » plutôt que « debout mais plus petit » ;
     20..24 les mollets et les chaussures, RÉTRÉCIS en largeur : les genoux se
            rapprochent, ce qui est ce que fait un corps assis.
   Hauteur totale 18 px contre 24 debout — trois quarts, la proportion d'une
   silhouette assise.

   ⚠️ AUCUN `translate` NI `rotate` ICI. Le faux canevas du banc de rendu les
   ignore (§10) : une pose qui en dépendrait s'y jugerait fausse, et on perdrait
   le seul moyen de REGARDER ce dessin. Le miroir du profil est fait par
   l'appelant, qui le fait déjà pour toutes les autres poses. */
/* ⚠️⚠️ CES DÉCALAGES SONT DÉRIVÉS DE LA GÉOMÉTRIE DU BANC, PAS CHOISIS. Le
   banc (plazaBench, 32×32) est dessiné bord bas sur (by+1)×16, donc à l'écran :
       dossier   by×16 − 8 … by×16 + 6
       ASSISE    by×16 + 4 … by×16 + 10
       sol       by×16 + 14
   L'assis, lui, est ancré à (by + 0,45), donc py = by×16 + 7. Il faut que ses
   HANCHES tombent sur l'assise (by×16 + 7 ≈ py) et que ses PIEDS touchent le
   sol juste devant le banc (by×16 + 18 ≈ py + 11). Tout le reste en découle.
   ⚠️ ZIP 429 — LE BANC A RÉTRÉCI (22 → 18 px de haut, dossier ramené à hauteur
   de hanche) et l'assise a suivi : sprite bord bas sur (by+1)×16, donc
       dossier   by×16 + 2 … by×16 + 6
       ASSISE    by×16 + 7 … by×16 + 11
       sol       by×16 + 14
   Les hanches tombent toujours sur l'assise sans qu'on ait touché à `topY` —
   c'est le signe que le décalage était bien dérivé et non réglé à l'œil.
   ⚠️ Le premier jet posait le haut du crâne à py − 4 : la tête arrivait alors
   AU NIVEAU DE L'ASSISE et les pieds dix pixels sous le banc — le personnage
   n'était pas assis dessus, il était assis PAR TERRE DEVANT. Vu au banc de
   rendu, invisible à la relecture, et c'est exactement pourquoi ce banc existe. */
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — LES SOLS DE L'INTÉRIEUR, SORTIS DE LA CLOSURE DU RENDU.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ CE DÉPLACEMENT EST LA MOITIÉ DU TRAVAIL, ET IL EST PLUS IMPORTANT QUE
   LE DESSIN LUI-MÊME. Les quatre matières du tribunal et de la mairie étaient
   peintes à l'intérieur de `drawCourtFrame`, dans `FermeGame.js` — c'est-à-dire
   à un endroit qu'aucun banc ne peut appeler. C'est exactement le piège nommé au
   §4 de CLAUDE.md : *un dessin qu'aucun banc ne peut regarder ne se dégrade pas,
   il reste au niveau du jour où il a été écrit pendant que tout ce qui est
   mesuré monte.* Le parquet datait du 426 ; les rues de la ville sont passées au
   pavé de 64 px au 434, l'herbe au 438, et l'intérieur est resté sur ses tuiles
   de 16 px pendant douze zips. L'écart n'était pas un écart de soin, c'était un
   écart de DATE — et il se lisait sur une carte du dépôt, sans ouvrir une image.
   ⚠️⚠️ ET LA PÉRIODE COMPTE PLUS QUE LES DÉTAILS (leçon du 434). Le parquet du
   426 dessinait quatre lames de 4 px DANS chaque case : les abouts tombaient
   donc tous les 16 px, alignés, sur toute la pièce — l'œil voyait la grille
   avant le bois. Les lames sont désormais ABSOLUES : elles traversent les cases,
   leur longueur (44 px) n'est pas un multiple de la case, et leurs abouts se
   décalent d'une rangée à l'autre. Une lame qui s'arrête au bord d'une case
   n'est pas une lame, c'est un carreau.
   ═══════════════════════════════════════════════════════════════════════════ */
// Bruit déterministe, sans état : deux entiers → [0,1[. Même famille que les
// hachages de case du reste du fichier ; il ne sert qu'à CHOISIR dans une
// palette, jamais à tirer un pixel au hasard (leçon des arbres du 438).
function ctH(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const CT_PLANK_L = 44;   // px : la longueur d'une lame. ⚠️ PREMIER AVEC 16.
/* ⚠️ L'ÉCART DE TON ENTRE DEUX LAMES EST ÉTROIT, ET C'EST DÉLIBÉRÉ. Premier jet
   avec six tons bien séparés : sur une pièce de dix-sept cases, vu au banc, le
   sol lisait comme un velours côtelé — chaque lame criait sa couleur et la
   pièce devenait un code-barres. Un parquet n'est pas un damier de planches :
   c'est une matière presque unie où la lame se devine. On resserre donc les
   tons et on laisse le JOINT faire le dessin. Même leçon que les arbres du
   438 : ce qui fait la matière n'est pas le contraste, c'est la forme. */
const CT_WOOD_TONES = ["#8e6a45", "#8a6642", "#916e49", "#876340", "#8c6844", "#946f4b"];
/* LE PARQUET. Des lames longues, en rangées de 4 px, dont les abouts se
   décalent. On ne peint QUE la part de chaque lame qui tombe dans la case
   demandée : le dessin est donc identique qu'on l'appelle case par case (le jeu)
   ou d'un bloc (le banc), ce qui est la condition pour qu'un banc serve. */
export function drawCourtWoodTile(ctx, x, y, px, py, T) {
  const PH = 4, rows = T / PH;
  for (let k = 0; k < rows; k++) {
    const row = y * rows + k;                       // ⚠️ rangée ABSOLUE
    const shift = (row * 23) % CT_PLANK_L;          // le décalage des abouts
    const gy = py + k * PH;
    const xa = x * T, xb = xa + T;
    let p = Math.floor((xa + shift) / CT_PLANK_L);
    for (;;) {
      const s = p * CT_PLANK_L - shift, e = s + CT_PLANK_L;
      if (s >= xb) break;
      const a = Math.max(s, xa), b = Math.min(e, xb);
      if (b > a) {
        ctx.fillStyle = CT_WOOD_TONES[(ctH(p, row) * CT_WOOD_TONES.length) | 0];
        ctx.fillRect(px + (a - xa), gy, b - a, PH);
        // Le fil du bois : une veine claire par lame, jamais au même endroit.
        ctx.fillStyle = "rgba(255,236,205,0.07)";
        ctx.fillRect(px + (a - xa), gy + (ctH(row, p) < 0.5 ? 1 : 2), b - a, 1);
        // L'ABOUT, seulement s'il tombe dans la case : c'est ce trait-là qui
        // dit « une autre lame commence », et il ne doit jamais s'aligner.
        if (s >= xa && s < xb) { ctx.fillStyle = "rgba(48,32,18,0.55)"; ctx.fillRect(px + (s - xa), gy, 1, PH); }
      }
      p++;
    }
    // Le joint entre deux lames : léger, sinon quatre traits noirs par case
    // redessinent la grille qu'on vient de casser.
    ctx.fillStyle = "rgba(58,38,22,0.17)"; ctx.fillRect(px, gy + PH - 1, T, 1);
  }
}
/* LE DALLAGE DE MARBRE. Des dalles de DEUX cases sur deux (32 px), pas d'une :
   un hall public se dalle en grand format, et c'est la taille de la dalle qui
   fait la différence entre un vestibule et une salle de bains. Les veines sont
   calculées dans le repère de la DALLE et découpées à la case, donc elles
   traversent les joints — c'est tout ce qu'on demande à une veine. */
export function drawCourtMarbleTile(ctx, x, y, px, py, T) {
  const sx = x >> 1, sy = y >> 1;                  // la dalle
  const lx = (x & 1) * T, ly = (y & 1) * T;        // où l'on est DANS la dalle
  const h = ctH(sx, sy);
  ctx.fillStyle = h < 0.34 ? "#cfcbc0" : h < 0.68 ? "#c6c2b7" : "#bcb8ad";
  ctx.fillRect(px, py, T, T);
  // Deux veines par dalle, en diagonale, tracées en escalier d'un pixel.
  for (let v = 0; v < 2; v++) {
    const hv = ctH(sx * 3 + v, sy * 7 - v);
    const y0v = 4 + ((hv * (T * 2 - 8)) | 0), dir = hv < 0.5 ? 1 : -1;
    ctx.fillStyle = v ? "rgba(150,146,140,0.20)" : "rgba(255,255,255,0.22)";
    for (let i = 0; i < T * 2; i++) {
      const vy = y0v + ((i * dir) >> 2);
      if (i < lx || i >= lx + T || vy < ly || vy >= ly + T) continue;
      ctx.fillRect(px + (i - lx), py + (vy - ly), 1, 1);
    }
  }
  // Le joint : au nord et à l'ouest de chaque DALLE, jamais de chaque case.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  if (!ly) ctx.fillRect(px, py, T, 1);
  if (!lx) ctx.fillRect(px, py, 1, T);
  ctx.fillStyle = "rgba(120,116,110,0.22)";
  if (ly === T) ctx.fillRect(px, py + T - 1, T, 1);
  if (lx === T) ctx.fillRect(px + T - 1, py, 1, T);
}
/* LE TAPIS. Sa bordure se déduit du VOISINAGE (`isCarpet`), donc elle reste
   juste si la salle change de forme — mais son CHAMP est désormais tissé : une
   trame de deux pixels et un semis de losanges sur un pavé de quatre cases.
   Un aplat rouge de vingt cases sur douze est une flaque, pas un tapis. */
export function drawCourtCarpetTile(ctx, x, y, px, py, T, isCarpet) {
  ctx.fillStyle = ((x + y) % 2) ? "#7a2530" : "#742330";
  ctx.fillRect(px, py, T, T);
  for (let gy = 0; gy < T; gy += 2) {
    ctx.fillStyle = "rgba(255,225,200,0.045)";
    ctx.fillRect(px, py + gy, T, 1);
  }
  // Le motif : un losange par pavé de 4×4 cases, centré sur la case (1,1) du
  // pavé — il boucle donc sur lui-même et ne fabrique pas de seconde grille.
  const mx = ((x % 4) + 4) % 4, my = ((y % 4) + 4) % 4;
  if (mx === 1 && my === 1) {
    ctx.fillStyle = "rgba(200,164,90,0.30)";
    for (let i = 0; i < 5; i++) { ctx.fillRect(px + 8 - i, py + 3 + i, 1, 1); ctx.fillRect(px + 8 + i, py + 3 + i, 1, 1); ctx.fillRect(px + 8 - i, py + 13 - i, 1, 1); ctx.fillRect(px + 8 + i, py + 13 - i, 1, 1); }
  }
  ctx.fillStyle = "#c8a45a";
  if (!isCarpet(x, y - 1)) ctx.fillRect(px, py + 1, T, 2);
  if (!isCarpet(x, y + 1)) ctx.fillRect(px, py + T - 3, T, 2);
  if (!isCarpet(x - 1, y)) ctx.fillRect(px + 1, py, 2, T);
  if (!isCarpet(x + 1, y)) ctx.fillRect(px + T - 3, py, 2, T);
}
/* LA DALLE BRUTE DU SOUS-SOL. Des pierres IRRÉGULIÈRES : une case sur trois
   s'accouple à sa voisine de droite pour faire une pierre longue, et le joint
   ne se dessine qu'entre deux pierres différentes. C'est l'irrégularité du
   calepinage qui dit « cave » — un damier régulier dirait « carrelage ». */
export function drawCourtStoneTile(ctx, x, y, px, py, T) {
  // À quelle pierre appartient la case : soi-même, ou sa voisine de gauche.
  const pairs = (px2, py2) => ctH(px2 * 5 + 11, py2 * 3 + 7) < 0.34;
  const joined = pairs(x - 1, y);
  const ox = joined ? x - 1 : x, w2 = pairs(ox, y) ? 2 : 1;
  const h = ctH(ox, y);
  ctx.fillStyle = h < 0.3 ? "#717277" : h < 0.6 ? "#787980" : h < 0.85 ? "#6b6c71" : "#7e7f86";
  ctx.fillRect(px, py, T, T);
  // Le grain : trois éclats fixes par pierre, jamais un semis par pixel.
  for (let k = 0; k < 3; k++) {
    const hk = ctH(ox * 13 + k, y * 17 - k);
    const gx = ((hk * (T * w2 - 4)) | 0) + 2, gy = ((ctH(y + k, ox) * (T - 4)) | 0) + 2;
    const lx = gx - (joined ? T : 0);
    if (lx < 1 || lx >= T - 1) continue;
    ctx.fillStyle = hk < 0.5 ? "rgba(30,30,34,0.30)" : "rgba(200,200,208,0.14)";
    ctx.fillRect(px + lx, py + gy, 2, 1);
  }
  // Le MORTIER, seulement là où deux pierres se touchent.
  ctx.fillStyle = "rgba(38,38,42,0.45)";
  ctx.fillRect(px, py + T - 1, T, 1);
  if (!joined) ctx.fillRect(px, py, 1, T);
  ctx.fillStyle = "rgba(150,150,158,0.10)"; ctx.fillRect(px, py, T, 1);
}
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 441 — LES DEUX MATIÈRES DE L'ÉGLISE, ET POURQUOI CE SONT DES COUCHES.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ AUCUN `CT_*` DE PLUS N'A ÉTÉ AJOUTÉ POUR L'ÉGLISE. Le sol reste
   `CT_STONE` et les baies restent `CT_WINDOW` ; c'est le BÂTIMENT du niveau
   (`COURT_FLOORS[f].bld`) qui décide du dessin. Un identifiant de sol de plus
   aurait rouvert le test de solidité du générateur, les deux passes de sol et
   la passe de murs — et en oublier un ne lève rien, ça fait juste une dalle
   qu'on traverse ou une fenêtre qui ne bloque plus. C'est mot pour mot la règle
   du 434 sur les revêtements de rue, appliquée à un intérieur.

   ⚠️ ET ELLES SONT ICI, PAS DANS LA CLOSURE DU RENDU. Les sols du tribunal y
   sont restés au niveau du 426 pendant douze zips faute de banc capable de les
   appeler (439) ; on ne recommence pas. `render-eglise.mjs` les APPELLE.
   ═══════════════════════════════════════════════════════════════════════════ */
/* LA DALLE D'ÉGLISE. ⚠️ ELLE EST L'INVERSE EXACT DE LA DALLE DE CAVE : celle-ci
   est irrégulière parce que l'irrégularité dit « cave » ; une nef est dallée
   par un maître d'œuvre, en GRANDES dalles régulières de deux cases, appareil à
   joints croisés. Ce qui l'empêche d'être un damier n'est donc pas du désordre
   (leçon du 437 : on n'obtient pas le naturel en mettant du désordre partout),
   c'est l'USURE — l'allée centrale est passée, les bas-côtés le sont moins. */
export function drawChurchFlagTile(ctx, x, y, px, py, T, wear) {
  /* ⚠️⚠️ `wear` EST UNE RAMPE, PLUS UN PALIER, ET C'EST UNE CORRECTION VUE SUR
     LA PLANCHE. Premier jet : 1 dans les deux travées bordant l'allée, 0
     ailleurs. Résultat, parfaitement visible sur `eglise-nef.png` : deux BANDES
     verticales plus claires, à bords francs, en travers du dallage — l'œil y
     lisait une couture, pas un passage. Une usure a un bord flou par
     définition ; un pavement qui change de ton d'une case à l'autre dessine une
     seconde grille, exactement ce que la dalle de deux cases vient d'effacer
     (leçon du 434 sur la période des motifs). On reçoit donc une DISTANCE et on
     l'amortit. */
  /* Une dalle fait 2×2 cases et une rangée sur deux est décalée d'une dalle :
     le calepinage boucle donc sur 4 cases en x et 2 en y — il ne fabrique pas
     de seconde grille, contrairement à un motif à période libre (434). */
  const row = ((y >> 1) % 2 + 2) % 2;
  const sx = ((x + row * 2) % 4 + 4) % 4;      // 0..3 : la colonne dans le pavé
  const inX = sx % 2, inY = ((y % 2) + 2) % 2; // la position DANS la dalle
  const h = ctH((x + row * 2 - inX) * 7 + 3, (y - inY) * 11 + 5);
  // `wear` = distance à l'axe, en cases. Le passage s'éteint sur six cases,
  // et le bruit de la dalle (h) le module — sinon la rampe elle-même se voit.
  const w = Math.max(0, 1 - (wear == null ? 99 : Math.abs(wear)) / 6) * (0.7 + h * 0.6);
  const base = h < 0.33 ? [0x8b, 0x88, 0x80] : h < 0.66 ? [0x93, 0x90, 0x87] : [0x86, 0x83, 0x7b];
  const k = 1 + w * 0.10;                      // l'usure ÉCLAIRCIT et lisse
  ctx.fillStyle = `rgb(${Math.min(255, base[0] * k) | 0},${Math.min(255, base[1] * k) | 0},${Math.min(255, base[2] * k) | 0})`;
  ctx.fillRect(px, py, T, T);
  // Le bombé de la dalle : une arête claire au nord-ouest, une ombre au sud-est.
  if (!inX) { ctx.fillStyle = "rgba(228,226,218,0.16)"; ctx.fillRect(px, py, 1, T); }
  if (!inY) { ctx.fillStyle = "rgba(228,226,218,0.16)"; ctx.fillRect(px, py, T, 1); }
  if (inX) { ctx.fillStyle = "rgba(40,38,34,0.10)"; ctx.fillRect(px + T - 1, py, 1, T); }
  if (inY) { ctx.fillStyle = "rgba(40,38,34,0.10)"; ctx.fillRect(px, py + T - 1, T, 1); }
  // LE JOINT : seulement sur le pourtour de la dalle, jamais entre ses quatre
  // cases — c'est ce qui fait qu'on lit des dalles de 32 px et pas de 16.
  ctx.fillStyle = "rgba(52,50,46,0.42)";
  if (!inX) ctx.fillRect(px, py, 1, T); else ctx.fillRect(px + T - 1, py, 1, T);
  if (!inY) ctx.fillRect(px, py, T, 1); else ctx.fillRect(px, py + T - 1, T, 1);
  /* Deux éclats fixes par DALLE (pas par case) : la pierre a un grain, mais un
     semis par case redessinerait la grille de 16 px qu'on vient d'effacer. */
  if (!inX && !inY) {
    for (let i = 0; i < 2; i++) {
      const hk = ctH(x * 13 + i, y * 17 - i);
      ctx.fillStyle = hk < 0.5 ? "rgba(34,32,30,0.22)" : "rgba(214,212,206,0.14)";
      ctx.fillRect(px + 3 + ((hk * 20) | 0), py + 4 + ((ctH(y + i, x) * 20) | 0), 2, 1);
    }
  }
}
/* LE VITRAIL. ⚠️ CE QUI FAIT UN VITRAIL N'EST PAS LA COULEUR, C'EST LE PLOMB :
   des aplats colorés sans réseau donnent une gomme de fruit ; les mêmes aplats
   cernés d'un trait sombre donnent du verre. Même leçon que les décors du 438
   (on assemble des masses cernées, on ne texture pas une silhouette).
   ⚠️ Et la baie porte une TACHE DE LUMIÈRE au sol, peinte par l'appelant : une
   fenêtre qui n'éclaire rien est un autocollant sur un mur. */
export function drawChurchGlass(ctx, px, py, wallH, T, seed) {
  const x0 = px + 2, y0 = py - wallH + 2, w = T - 4, h = wallH + 2;
  ctx.fillStyle = "#2a2118"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);   // la feuillure
  // Trois registres, et la couleur du registre vient de la baie (`seed`) : deux
  // baies voisines ne se ressemblent pas, et une baie donnée ne change jamais.
  const PAL = [["#3f6fa8", "#7fa8cf"], ["#a33c46", "#d4747c"], ["#3f7d4c", "#7fb489"], ["#a8842c", "#e0c072"]];
  for (let r = 0; r < 3; r++) {
    const p = PAL[(seed + r) % PAL.length];
    ctx.fillStyle = p[0]; ctx.fillRect(x0, y0 + r * ((h / 3) | 0), w, (h / 3) | 0);
    ctx.fillStyle = p[1]; ctx.fillRect(x0, y0 + r * ((h / 3) | 0), w, 2);
  }
  // Le réseau de plomb : deux meneaux, trois traverses. Traits pleins.
  ctx.fillStyle = "#2a2118";
  ctx.fillRect(x0 + ((w / 3) | 0), y0, 1, h);
  ctx.fillRect(x0 + ((2 * w / 3) | 0), y0, 1, h);
  for (let r = 1; r < 3; r++) ctx.fillRect(x0, y0 + r * ((h / 3) | 0), w, 1);
  // L'arc brisé, en haut : deux pans, pas une courbe — à douze pixels de large,
  // une ogive tracée à l'arc rend un escalier (leçon des allées du 437).
  ctx.fillStyle = "#6a6458";
  for (let i = 0; i < (w >> 1); i++) {
    ctx.fillRect(x0 + i, y0 - 1 + ((w >> 1) - i) - 1, 1, 2);
    ctx.fillRect(x0 + w - 1 - i, y0 - 1 + ((w >> 1) - i) - 1, 1, 2);
  }
  ctx.fillStyle = "#c6c2b6"; ctx.fillRect(px + 1, py - 1, T - 2, 2);        // l'appui
}

export const SEAT_POSE = {
  headH: 16,      // hauteur de la tranche buste + tête
  topY: -11,      // le haut du crâne, relativement à l'ancre du personnage
  thighSrcY: 16, thighSrcH: 5,   // la tranche de cuisses prise dans la feuille
  thighY: 4, thighH: 3, thighInset: 1,
  shinSrcY: 19, shinSrcH: 5,     // mollets + chaussures
  shinY: 7, shinH: 4, shinInset: 4,
};
export function drawSeated(ctx, sheet, row, px, py) {
  const S2 = SEAT_POSE;
  // 1. Buste et tête, sans retouche.
  ctx.drawImage(sheet, 0, row * 24, 16, S2.headH, px, py + S2.topY, 16, S2.headH);
  // 2. Les cuisses en raccourci. ⚠️ Elles CHEVAUCHENT volontairement le bas du
  //    buste : sans ce recouvrement d'un pixel, la couture entre les deux
  //    tranches se voit comme un trait clair en travers du bassin.
  ctx.drawImage(sheet, 0, row * 24 + S2.thighSrcY, 16, S2.thighSrcH,
                px + S2.thighInset, py + S2.thighY, 16 - S2.thighInset * 2, S2.thighH);
  // 3. Les mollets, plus étroits — genoux rapprochés.
  ctx.drawImage(sheet, 0, row * 24 + S2.shinSrcY, 16, S2.shinSrcH,
                px + S2.shinInset, py + S2.shinY, 16 - S2.shinInset * 2, S2.shinH);
  /* 4. ⚠️ LE CREUX SOUS LES GENOUX. Un pixel sombre à la jonction cuisse/mollet
        est ce qui empêche les deux tranches de se lire comme un seul bloc de
        pantalon. C'est le même rôle que le nez de marche éclairé du perron du
        tribunal : une valeur, pas une forme. */
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(px + S2.shinInset, py + S2.shinY, 16 - S2.shinInset * 2, 1);
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ ZIP 459 — LES TROIS POSES DU CRATÈRE : IL DÉVALE, IL S'ARC-BOUTE, IL GRIMPE.
   ╚════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : *« une animation réelle poussée montrant le
   personnage qui climb up et glisse du cratère. ça doit être très beau et
   logique. nouveau mouvement pour le perso du fermier qui doit lean back et
   slide quand il glisse. »*

   ⚠️⚠️⚠️ ELLES SONT DÉCOUPÉES DANS LA FEUILLE DU PERSONNAGE, JAMAIS REPEINTES —
   c'est LA décision, et c'est celle de `drawSeated` (428) reprise mot pour mot.
   Peindre un bras avec une couleur de chemise prise dans `OUTFITS` marcherait
   jusqu'au premier article de la Maison Garfield : la teinte d'une tenue est
   CUITE dans la feuille (c'est même toute son astuce). Deux sources pour la même
   couleur, c'est la divergence en attente du §8 de `CLAUDE.md`, et le symptôme
   aurait été « le pantalon acheté ne se voit pas quand on glisse ». En
   redécoupant, les trois poses héritent GRATUITEMENT de la tenue, de la
   salopette, de la combinaison d'apiculteur et de tout ce qu'on ajoutera.

   ⚠️⚠️ ET ELLES VIVENT ICI, PAS DANS LA BOUCLE DE RENDU. Le piège n°1 du projet
   (§4 de `CLAUDE.md`) a deux visages, et c'est le SECOND qui menaçait ici : *un
   dessin qu'aucun banc ne peut appeler ne se dégrade pas, il reste au niveau du
   jour où il a été écrit.* `render-etoile` appelle ces trois fonctions et mesure
   leur silhouette, leur ancrage au sol et — pour la grimpe — le fait que ses
   quatre images soient VRAIMENT différentes (leçon du 449 sur la compagne, dont
   deux poses sortaient identiques au pixel près).

   ⚠️ AUCUN `translate`, AUCUN `rotate`, AUCUN `roundRect` : le faux canevas du
   banc les ignore ou LÈVE (leçon du 455), et une pose qui en dépendrait ne serait
   plus regardable — donc elle vieillirait. L'inclinaison se fait donc par
   CISAILLEMENT : trois bandes horizontales décalées les unes par rapport aux
   autres, ce qui est de toute façon ce qu'on ferait à la main en pixel art (un
   corps penché n'est pas un corps tourné, c'est un corps dont les épaules ne sont
   plus au-dessus des pieds).
   ═════════════════════════════════════════════════════════════════════════════ */
/* Les trois tranches d'un personnage, telles que les peint `drawCharFrame` :
   0..10 la tête, 10..16 le buste (et les bras en 11..16), 16..24 les jambes et
   les bottes. ⚠️ ELLES SONT ÉCRITES UNE FOIS ICI et lues par les trois poses —
   trois copies auraient divergé au premier réglage du sprite. */
const POSE_HEAD_H = 10, POSE_TORSO_Y = 10, POSE_TORSO_H = 6, POSE_LEG_Y = 16, POSE_LEG_H = 8;
const POSE_ARM_Y = 11, POSE_ARM_H = 5, POSE_ARM_W = 3;   // les manches, x 3..6 et x 10..13
const POSE_ARM_LX = 3, POSE_ARM_RX = 10;
/* ⚠️⚠️ LA SILHOUETTE OCCUPE x 3..13 DANS SA CASE DE SEIZE, ET CE NOMBRE EST LA
   CHOSE À NE PAS OUBLIER. Un bras posé « deux pixels à gauche de l'ancre » se
   retrouve à CINQ pixels du corps : il flotte, détaché, et ça se voit comme un
   défaut de dessin alors que c'est une erreur d'arithmétique. Les trois poses du
   459 sont nées avec, aux trois endroits, et c'est la planche du banc qui l'a
   montré — pas la relecture. On écrit donc les deux bords une fois pour toutes. */
const POSE_BODY_L = 3, POSE_BODY_R = 13;

/* ── LA GLISSADE. « lean back and slide. »
   ⚠️ LE CORPS EST PLUS COURT DE QUATRE PIXELS (20 au lieu de 24) ET LES PIEDS NE
   BOUGENT PAS : on s'accroupit en dévalant, on ne rapetisse pas. C'est la même
   règle que la pose assise — l'ancrage au sol est ce qui empêche une pose de
   flotter, et c'est la première chose que le banc mesure.
   ⚠️ `lx`/`ly` sont la direction de la GLISSADE à l'écran (unitaires). Le buste
   part À CONTRESENS et les jambes partent DEVANT : c'est ça, « lean back » — les
   épaules ne sont plus au-dessus des pieds. Deux pixels suffisent à 16 de large ;
   au troisième, le personnage se disloque (essayé, mesuré, reculé). */
export function drawStarSlide(ctx, sheet, row, px, py, lx, ly) {
  const sy = row * 24;
  const kx = Math.max(-1, Math.min(1, +lx || 0)), ky = Math.max(-1, Math.min(1, +ly || 0));
  const hx = Math.round(-3 * kx), tx = Math.round(-1.5 * kx), fx = Math.round(2 * kx);
  /* Le tassement vertical : on descend vers la caméra (ky > 0) le buste se
     redresse et les jambes partent devant ; on s'éloigne, c'est l'inverse. */
  const rise = Math.round(-1.5 * ky);
  const top = py - 4 + rise;                       // 20 px de haut, pieds toujours à py+16
  // 1. La tête et les épaules, rejetées en arrière.
  ctx.drawImage(sheet, 0, sy, 16, POSE_HEAD_H, px + hx, top, 16, POSE_HEAD_H);
  // 2. Le buste, à mi-chemin — sans lui, la tête et les jambes se toucheraient
  //    en un coude franc au lieu d'une courbe.
  ctx.drawImage(sheet, 0, sy + POSE_TORSO_Y, 16, POSE_TORSO_H, px + tx, top + 8, 16, POSE_TORSO_H);
  /* 3. Les jambes, DEVANT et ÉCRASÉES (8 px de source pour 6 de rendu) : elles
        pointent vers le bas de la pente, donc vers la caméra, donc on les voit en
        raccourci. C'est ce raccourci qui fait lire « il dévale » plutôt que
        « il est debout, plus bas ». */
  ctx.drawImage(sheet, 0, sy + POSE_LEG_Y, 16, POSE_LEG_H, px + fx, py + 10, 16, 6);
  /* 4. Les bras en balancier, écartés et remontés. ⚠️ DÉCOUPÉS DANS LA MANCHE
        (x 3..6 et x 10..13 du buste) : c'est le seul endroit de la feuille où la
        couleur du vêtement et la main sont déjà l'une sous l'autre. */
  ctx.drawImage(sheet, POSE_ARM_LX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, px + hx + POSE_BODY_L - POSE_ARM_W, top + 4, POSE_ARM_W, POSE_ARM_H);
  ctx.drawImage(sheet, POSE_ARM_RX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, px + hx + POSE_BODY_R, top + 4, POSE_ARM_W, POSE_ARM_H);
  /* 5. Le creux sous le bassin. Même rôle que dans la pose assise : une VALEUR,
        pas une forme — sans elle, buste et jambes se lisent comme un seul bloc. */
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(px + 3 + fx, py + 10, 10, 1);
}

/* ── L'ARC-BOUTEMENT. La posture de qui se tient debout, immobile, sur la paroi.
   ⚠️⚠️ ELLE EXISTE POUR RENDRE VISIBLE LA SEULE LIBERTÉ QUE LE MOTEUR PREND AVEC
   LA PHYSIQUE (voir le chapeau de `starSlipStep` dans quete.js) : au repos sur la
   pente, on ne glisse pas. Un fermier debout, jambes serrées, au milieu d'un
   dévers, se lit comme un bogue ; jambes écartées et bras en balancier, il se lit
   comme quelqu'un qui plante ses talons — et c'est vrai, c'est exactement ce
   qu'il fait. *Une exception assumée se dessine ; une exception cachée se paie.* */
export function drawStarBrace(ctx, sheet, row, px, py) {
  const sy = row * 24;
  // Tête et buste, tels quels mais tassés d'un pixel (genoux fléchis).
  ctx.drawImage(sheet, 0, sy, 16, POSE_TORSO_Y + POSE_TORSO_H, px, py - 7, 16, POSE_TORSO_Y + POSE_TORSO_H);
  /* Les jambes en DEUX moitiés écartées : la feuille les peint côte à côte
     (x 5..8 et x 8..11), il suffit de les éloigner de deux pixels chacune. */
  ctx.drawImage(sheet, 0, sy + POSE_LEG_Y, 8, POSE_LEG_H, px - 2, py + 9, 8, 7);
  ctx.drawImage(sheet, 8, sy + POSE_LEG_Y, 8, POSE_LEG_H, px + 10, py + 9, 8, 7);
  // Les bras, écartés et bas — un balancier, pas une garde.
  ctx.drawImage(sheet, POSE_ARM_LX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, px + POSE_BODY_L - POSE_ARM_W, py + 4, POSE_ARM_W, POSE_ARM_H);
  ctx.drawImage(sheet, POSE_ARM_RX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, px + POSE_BODY_R, py + 4, POSE_ARM_W, POSE_ARM_H);
}

/* ── LA GRIMPE. « l'anim grimpeur avec les bras et jambes. »
   ⚠️⚠️ QUATRE IMAGES, ET ELLES SONT CONTRALATÉRALES : bras gauche haut avec jambe
   DROITE haute. C'est ce qui distingue une escalade d'une reptation, et ça ne se
   voit qu'en mouvement — le banc, lui, vérifie que les quatre images diffèrent
   vraiment au pixel près (au 449, deux poses de la compagne sortaient identiques
   et personne ne l'avait vu à l'œil).
   ⚠️ LE CORPS EST PLUS ÉTROIT DE DEUX PIXELS : plaqué contre la paroi, on se
   présente de trois quarts, pas de face. C'est le seul endroit du jeu où l'on
   redimensionne un personnage en LARGEUR, et c'est ce qui achète le « collé au
   mur » sans dessiner un seul pixel de mur. */
export const STAR_CLIMB_FRAMES = 4;
export function drawStarClimb(ctx, sheet, row, px, py, phase) {
  const sy = row * 24, f = ((phase | 0) % STAR_CLIMB_FRAMES + STAR_CLIMB_FRAMES) % STAR_CLIMB_FRAMES;
  const bob = [0, -1, 0, 1][f];
  /* Les quatre temps, en une table : la hauteur du bras gauche, du bras droit, de
     la jambe gauche, de la jambe droite. ⚠️ UNE TABLE ET PAS QUATRE `if` : c'est
     ce qui rend le cycle lisible d'un coup d'œil et vérifiable d'une boucle. */
  const AL = [-4, -1, 0, -1][f], AR = [0, -1, -4, -1][f];
  /* ⚠️⚠️ LES JAMBES SONT L'INVERSE DES BRAS, PAS LEUR COPIE — c'est ÇA, la marche
     contralatérale, et le premier jet avait écrit les deux tables dans le même
     sens : bras gauche en l'air AVEC jambe gauche en l'air, c'est-à-dire un
     lézard. Personne ne le voit sur une image fixe ; le banc, lui, compare les
     quatre hauteurs et le dit en une ligne. */
  const LL = [2, 1, 0, 1][f], LR = [0, 1, 2, 1][f];
  const top = py - 7 + bob;
  // 1. Le corps, plaqué : 14 px de large au lieu de 16, tête + buste d'un bloc.
  ctx.drawImage(sheet, 0, sy, 16, POSE_TORSO_Y + POSE_TORSO_H, px + 1, top, 14, POSE_TORSO_Y + POSE_TORSO_H);
  /* 2. Les jambes, écartées et repliées : deux moitiés de la tranche basse, l'une
        plus haute que l'autre selon le temps. La compression (8 → 6) est le genou
        qui remonte, pas un rétrécissement. */
  ctx.drawImage(sheet, 0, sy + POSE_LEG_Y, 8, POSE_LEG_H, px - 2, py + 8 + LL, 8, 6);
  ctx.drawImage(sheet, 8, sy + POSE_LEG_Y, 8, POSE_LEG_H, px + 10, py + 8 + LR, 8, 6);
  /* 3. Les bras, TENDUS VERS LE HAUT — c'est eux qui font toute la lecture. Ils
        montent jusqu'au niveau du crâne et pas au-delà : au-dessus, ils passent
        derrière l'étiquette du nom (py − 10) et on ne voit plus rien. */
  /* ⚠️ Le corps est RÉTRÉCI à 14/16 : ses épaules ne sont donc plus à `px + 3` mais
     à `px + 1 + 3 × 14/16`. Les bras se collent à CE bord-là, pas à celui du sprite
     debout — sans quoi ils flottent d'un pixel et demi, ce qui se voit. */
  const cbl = Math.round(px + 1 + POSE_BODY_L * 14 / 16), cbr = Math.round(px + 1 + POSE_BODY_R * 14 / 16);
  ctx.drawImage(sheet, POSE_ARM_LX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, cbl - POSE_ARM_W, top + 1 + AL, POSE_ARM_W, POSE_ARM_H);
  ctx.drawImage(sheet, POSE_ARM_RX, sy + POSE_ARM_Y, POSE_ARM_W, POSE_ARM_H, cbr, top + 1 + AR, POSE_ARM_W, POSE_ARM_H);
}

export function buildSprites() {
  const T = 16;

  function cv(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function P(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function makeRnd(s) { return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  /* ZIP 439 — un sprite de la planche, rejoué en canevas.
     ⚠️ IL PEINT PAR PLAGES HORIZONTALES, PAS PIXEL PAR PIXEL. Les quarante-cinq
     sprites font 44 000 pixels : un `fillRect` par pixel, c'est 44 000 appels au
     chargement, pour un résultat identique à 3 500 appels par plages. Le
     chargement de la ferme est déjà le moment le plus chargé du jeu (tout
     `buildSprites` y passe), et c'est le genre de coût qu'on ne voit pas venir
     parce qu'il ne casse rien — il rallonge juste l'écran noir.
     ⚠️ AUCUN LISSAGE, AUCUNE MISE À L'ÉCHELLE : la planche est déjà à la
     résolution du jeu (pas natif mesuré à 3,25 px image = 1 px de jeu, soit
     exactement la case de 16). Un sprite redimensionné ici perdrait la netteté
     qui est toute la raison de l'avoir importé. */
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 439 — LES ARBRES DE LA PLANCHE, RENDUS SAISONNIERS ET ANIMÉS.
     ──────────────────────────────────────────────────────────────────────────
     Demande de Guillaume : « on ajoute aux miens de nouveaux : saisonniers,
     animés et avec ombres ». Ses quatre arbres sont des images FIXES ; les onze
     essences du 437 ont trois saisons et trois images de vent. Les brancher
     tels quels aurait mis, dans la même allée, des arbres qui respirent à côté
     d'arbres qui ne bougent pas et ne jaunissent jamais — une rupture de plus,
     et la plus visible de toutes puisqu'elle est en MOUVEMENT.

     ⚠️⚠️ LA SAISON SE FAIT SUR LA PALETTE, PAS SUR LES PIXELS, et c'est ce qui
     préserve le dessin. Chaque sprite importé porte ses dix à seize couleurs
     (voir `planche.js`) : on transpose CES couleurs-là, et le dessin — les
     formes, les cernes, les masses — reste au pixel près celui de Guillaume.
     Repeindre pixel par pixel aurait été la même erreur que transcrire.
     ⚠️ ET ON NE TOUCHE QUE LE FEUILLAGE. Le troncs, les fleurs roses du
     magnolia et les pommes rouges gardent leur teinte : un tronc qui vire à
     l'ocre en automne se lit comme un arbre malade, et un magnolia dont les
     fleurs jaunissent n'est plus un magnolia. On repère le feuillage par sa
     TEINTE (le vert, entre 65° et 190°), jamais par sa position.

     ⚠️⚠️ LE VENT EST UN CISAILLEMENT PAR RANGÉE, ET IL S'ARRÊTE AU TRONC. Une
     rangée du houppier glisse d'un pixel, proportionnellement au CARRÉ de sa
     hauteur dans la couronne — la cime prend tout, la base rien. C'est la même
     loi que `crownClumps` au 438, et pour la même raison : un arbre entier qui
     glisse d'un pixel n'est pas un arbre qui plie, c'est un arbre qui saute.
     ⚠️ LE TRONC SE RECONNAÎT À SA LARGEUR, PAS À SA COULEUR : on mesure la
     largeur peinte de chaque rangée, et on ne cisaille que celles qui font plus
     de 42 % de la plus large. Un critère de couleur aurait raté le bouleau, dont
     le tronc est blanc, et le saule, dont les rameaux descendent au ras du sol. */
  /* ⚠️⚠️ `lMul` EST AU-DESSUS DE 1 EN AUTOMNE, ET C'EST UNE CORRECTION MESURÉE
     SUR PLANCHE. Premier réglage à 0,94 : les quatre essences importées
     sortaient BRUN BOUEUX à côté des huit nôtres, qui sont ocre lumineux. La
     cause n'est pas la teinte — elle est la même — mais le point de départ :
     les verts de la planche sont plus SOMBRES que les nôtres, et une rotation
     de teinte conserve la valeur. Transposer sans remonter la luminosité
     revenait donc à peindre l'automne dans l'ombre.
     ⚠️ LE CHIFFRE EST MESURÉ, PAS CHOISI : la luminance moyenne du feuillage
     chaud de nos huit feuillus d'automne va de 114 (érable) à 157 (saule). Les
     essences importées sortaient à 93 et 100 — hors de la plage, donc visibles
     comme un autre automne. À `lMul = 1,50` elles mesurent 126 et 127, soit en
     plein milieu. C'est la méthode du §8 appliquée à une transposition de
     palette : on compare des nombres, on ne juge pas au ressenti.
     ⚠️ LES CONIFÈRES ONT LEUR PROPRE RÈGLE, ET C'EST LA PLUS IMPORTANTE : un
     sapin ne jaunit pas. Le premier jet appliquait la même transposition à
     tout ce qui est vert, et le sapin de la planche virait au brun en automne —
     un arbre mort au milieu d'une forêt verte. Il perd un peu de saturation et
     de lumière (l'automne est gris), il ne change pas de teinte. C'est déjà ce
     que font les trois conifères procéduraux du 437, dont les tables `autumn`
     ne bougent que de quelques points. */
  const TREE_HUE_SHIFT = {
    autumn: { h: [22, 46], sMul: 1.15, lMul: 1.50 },   // ocre, orange, brun doré
    spring: { h: [88, 122], sMul: 1.06, lMul: 1.07 },  // vert tendre
  };
  const TREE_EVERGREEN = {
    autumn: { sMul: 0.86, lMul: 0.93 },
    spring: { sMul: 1.08, lMul: 1.06 },
  };
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, sa = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, sa, l];
  }
  function hslToHex(h, sa, l) {
    h = ((h % 360) + 360) % 360; sa = Math.max(0, Math.min(1, sa)); l = Math.max(0, Math.min(1, l));
    const c2 = (1 - Math.abs(2 * l - 1)) * sa, x = c2 * (1 - Math.abs((h / 60) % 2 - 1)), m2 = l - c2 / 2;
    const t = h < 60 ? [c2, x, 0] : h < 120 ? [x, c2, 0] : h < 180 ? [0, c2, x]
            : h < 240 ? [0, x, c2] : h < 300 ? [x, 0, c2] : [c2, 0, x];
    return "#" + t.map(v => Math.round((v + m2) * 255).toString(16).padStart(2, "0")).join("");
  }
  function seasonPalette(pal, season, evergreen) {
    const sp = evergreen ? TREE_EVERGREEN[season] : TREE_HUE_SHIFT[season];
    if (!sp) return pal;
    return pal.map((hex) => {
      const [h, sa, l] = hexToHsl(hex);
      if (sa < 0.12 || h < 65 || h > 190) return hex;      // pas du feuillage : on n'y touche pas
      if (evergreen) return hslToHex(h, sa * sp.sMul, l * sp.lMul);
      // Le vert d'origine (65..190) est étalé sur la plage de la saison : deux
      // verts distincts restent deux teintes distinctes.
      const t = (h - 65) / 125;
      return hslToHex(sp.h[0] + t * (sp.h[1] - sp.h[0]), sa * sp.sMul, l * sp.lMul);
    });
  }
  /* Un arbre de la planche, dans sa saison et sa phase de vent, posé dans le
     gabarit 48×64 des essences du 438. ⚠️ IL EST ANCRÉ PAR LE BAS DE SON OMBRE :
     les sprites de la planche portent leur ombre portée peinte (c'est elle qu'on
     a pris soin de ne pas détourer, voir `backgroundMask`), et c'est elle qui
     donne la ligne de sol. */
  function plancheTree(name, season, frame, evergreen) {
    const d = PLANCHE[name];
    const pal = seasonPalette(d.pal, season, evergreen);
    const [c, g] = cv(TW_, TH_);
    // La largeur peinte de chaque rangée : elle sépare la couronne du tronc.
    const wid = d.rows.map(r => { let n = 0; for (let i = 0; i < r.length; i++) if (r[i] !== ".") n++; return n; });
    const mx = Math.max(...wid), lim = mx * 0.42;
    let top = 0; while (top < d.h && wid[top] < lim) top++;
    let bot = d.h - 1; while (bot > top && wid[bot] < lim) bot--;
    const ox = ((TW_ - d.w) / 2) | 0, oy = TBASE_ + 4 - d.h;
    /* ⚠️⚠️ LE CISAILLEMENT EST BORNÉ PAR LA MARGE RÉELLE, ET C'EST LE PIÈGE N°1
       DES SPRITES (§4) QUI SE REPRÉSENTE. Le magnolia de la planche fait 47 px
       de large dans un gabarit de 48 : il n'a UN pixel de marge que d'un seul
       côté. Un cisaillement symétrique de ±2 le faisait déborder du canevas, qui
       découpe en silence — deux colonnes de fleurs disparaissaient à chaque
       souffle de vent, sans erreur et sans que la relecture puisse le voir.
       `render-arbres.mjs` l'a dit au premier lancement.
       ⚠️ ET ON BORNE PLUTÔT QUE DE SUPPRIMER LE VENT : ainsi bridé, le magnolia
       oscille entre 0 et +1 au lieu de −1 et +1. Il plie moins que les autres,
       mais il PLIE — et un seul arbre immobile au milieu d'une allée qui bouge
       se voit bien davantage qu'un arbre qui bouge un peu moins. */
    const shMin = -ox, shMax = TW_ - (ox + d.w);
    for (let y = 0; y < d.h; y++) {
      const r = d.rows[y];
      let sh = 0;
      if (frame && bot > top && y <= bot) {
        const hgt = Math.max(0, (bot - y) / (bot - top));
        sh = Math.max(shMin, Math.min(shMax, Math.round(frame * hgt * hgt * 1.8)));
      }
      let x = 0;
      while (x < d.w) {
        const ch = r[x];
        if (ch === ".") { x++; continue; }
        let n = 1;
        while (x + n < d.w && r[x + n] === ch) n++;
        g.fillStyle = pal[r.charCodeAt(x) - 48];
        g.fillRect(ox + x + sh, oy + y, n, 1);
        x += n;
      }
    }
    return c;
  }

  function plancheSprite(name) {
    const d = PLANCHE[name];
    if (!d) throw new Error("sprite de planche inconnu : " + name);
    const [c, g] = cv(d.w, d.h);
    for (let y = 0; y < d.h; y++) {
      const r = d.rows[y];
      let x = 0;
      while (x < d.w) {
        const ch = r[x];
        if (ch === ".") { x++; continue; }
        let n = 1;
        while (x + n < d.w && r[x + n] === ch) n++;
        g.fillStyle = d.pal[r.charCodeAt(x) - 48];
        g.fillRect(x, y, n, 1);
        x += n;
      }
    }
    return c;
  }

  /* ⚠️⚠️ ZIP 447 — LE MÊME REJOUEUR, POUR LA SECONDE PLANCHE. Il est écrit à
     part et non fondu avec `plancheSprite` parce qu'une seule fonction à deux
     tables se tromperait un jour de table en silence : les deux planches n'ont
     ni la même échelle (3,25 contre 3,875) ni la même origine, et un nom absent
     de l'une existe peut-être dans l'autre. Deux portes nommées valent mieux
     qu'une porte qui devine — c'est la leçon « une jointure, jamais deux
     listes » prise par le bon bout (§ en-tête, `C.DEV_FLOOR_OF`).
     ⚠️ Le corps est identique de dix lignes, et c'est assumé : les fondre pour
     dix lignes créerait le paramètre qui double un paramètre du §8. */
  function planche2Sprite(name) {
    const d = PLANCHE2[name];
    if (!d) throw new Error("sprite de planche 2 inconnu : " + name);
    const [c, g] = cv(d.w, d.h);
    for (let y = 0; y < d.h; y++) {
      const r = d.rows[y];
      let x = 0;
      while (x < d.w) {
        const ch = r[x];
        if (ch === ".") { x++; continue; }
        let n = 1;
        while (x + n < d.w && r[x + n] === ch) n++;
        g.fillStyle = d.pal[r.charCodeAt(x) - 48];
        g.fillRect(x, y, n, 1);
        x += n;
      }
    }
    return c;
  }

  // Zip 388 : outlineSprite et petSprite sont passés au NIVEAU DU MODULE
  // (voir en tête de fichier). petSprite prend désormais (petId, dir, frame).

  // ==================================================================
  // Zip 235 additions
  // ==================================================================
  // Léopard des neiges : mêmes 4 frames que wolfSprite, dessinées via
  // temporary tint (canvas mask). On construit un canevas au-dessus du loup
  // et on remplit les zones du corps en blanc + rosettes noires.
  function snowLeopardSprite(frame) {
    const wolf = wolfSprite(frame);
    const [c, g] = cv(30, 22);
    // Base = loup, puis on ré-éclaircit le corps.
    g.drawImage(wolf, 0, 0);
    g.globalCompositeOperation = "source-atop";
    // Voile clair général : blanc cassé sur tout le corps.
    g.fillStyle = "rgba(238, 240, 248, 0.75)"; g.fillRect(0, 0, 30, 22);
    // Rosettes : petites taches sombres semi-transparentes déterministes.
    g.fillStyle = "rgba(60, 60, 78, 0.85)";
    const rr = makeRnd(500 + frame * 17);
    for (let i = 0; i < 26; i++) g.fillRect(3 + Math.floor(rr() * 24), 5 + Math.floor(rr() * 14), 1, 1);
    for (let i = 0; i < 8; i++) g.fillRect(3 + Math.floor(rr() * 24), 5 + Math.floor(rr() * 14), 2, 1);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  /* ========================================================================
     ZIP 398 — LES FRUITS. « Insiste sur la qualité des sprites de citrons, de
     blueberries, de fraises et framboises. »
     ------------------------------------------------------------------------
     Ce sont les seules icônes du jeu qu'on regarde de PRÈS et LONGTEMPS : dans
     le sac, dans la boutique, dans les recettes, dans le bac de vente. Elles
     méritent donc mieux qu'un carré de couleur — et c'est très exactement ce
     qu'était la baie du buisson de printemps, deux `fillRect` l'un sur l'autre.

     LES QUATRE RÈGLES SUIVIES ICI, dans l'ordre d'importance. Elles viennent
     du zip 397, où l'on a enfin RENDU les textures pour les regarder :

       1. TROIS VALEURS AU MINIMUM par masse — ombre, corps, lumière. Deux
          suffisent à colorier, jamais à donner du volume. C'est la différence
          entre « une fraise rouge » et « une fraise » ;
       2. UN POINT SPÉCULAIRE, toujours en haut à gauche, toujours le même sur
          les quatre fruits. C'est lui qui dit « c'est rond et c'est humide »,
          et son placement constant est ce qui fait que les quatre appartiennent
          au même monde ;
       3. UNE OCCLUSION SOUS L'OBJET (une ombre portée d'un pixel), sinon le
          fruit flotte au-dessus du fond du sac ;
       4. UN CERNE SOMBRE, par `outlineSprite`. Sans lui, une myrtille bleu
          foncé posée sur le violet d'un panneau disparaît — deux masses de même
          valeur qui se touchent n'en font qu'une (leçon du zip 388).

     ⚠️ ET ELLES SONT RENDUES EN PNG PAR `tools/render-fruits.mjs`, puis
     REGARDÉES. C'est la dette que le 397 a payée pour le labyrinthe et que le
     398 paie pour la ferme : quatre refontes graphiques du labyrinthe avaient
     été faites en aveugle avant qu'on s'en aperçoive.
     ====================================================================== */

  // Un fruit, dessiné à 16x16 puis cerné. `spec` vient de C.FRUITS.
  function fruitSprite(id) {
    const [c, g] = cv(T, T);
    const S = (x, y, w, h, col) => P(g, x, y, w, h, col);

    if (id === "lemon") {
      /* CITRON — un ovale PENCHÉ, à téton aux deux bouts.
         ⚠️ RÉGLÉ EN REGARDANT LE PNG (tools/render-fruits.mjs). La première
         version était un cercle jaune surmonté d'une feuille : elle se lisait
         comme une POMME JAUNE, et c'est le genre de méprise qu'aucune
         relecture ne signale — on sait ce qu'on a voulu dessiner.
         Trois corrections, dans l'ordre de ce qui a compté :
           1. la silhouette s'ALLONGE sur la diagonale (un citron est un ovale,
              une pomme est un disque) ;
           2. les deux TÉTONS sortent franchement du corps, en pointe. Ce sont
              eux, et rien d'autre, qui disent « agrume » à seize pixels ;
           3. la feuille disparaît. Elle tirait toute la lecture vers la pomme,
              et un citron cueilli n'en porte pas. */
      const dark = "#b8940c", body = "#e8c81e", lit = "#f6e46a", hi = "#fff6c4";
      /* Un OVALE COUCHÉ, large de dix pixels et haut de huit. Deuxième
         correction faite en regardant : la version « oblique » précédente
         donnait une courge, parce qu'un décalage d'un pixel par ligne se lit
         comme une COURBURE. Un citron n'est pas courbe, il est ALLONGÉ. */
      S(4, 5, 8, 6, body); S(3, 6, 10, 4, body); S(5, 4, 6, 8, body);
      S(4, 8, 8, 3, dark); S(5, 10, 6, 2, dark);            // ventre à l'ombre
      S(5, 4, 6, 3, lit); S(6, 4, 4, 2, "#fbef9a");         // dos éclairé
      // les deux tétons : COURTS, sur l'axe long, un pixel de plus que le corps
      S(2, 7, 2, 2, "#c9a512"); S(1, 8, 1, 1, "#9c7c08");
      S(12, 7, 2, 2, "#c9a512"); S(14, 8, 1, 1, "#9c7c08");
      S(7, 2, 2, 2, "#6f8a34"); S(7, 1, 1, 1, "#8aa848");   // pédoncule, discret
      S(6, 5, 2, 2, hi); S(6, 5, 1, 1, "#ffffff");          // point spéculaire
      // pores : un citron n'est jamais lisse, trois pixels suffisent à le dire
      S(9, 7, 1, 1, dark); S(7, 9, 1, 1, dark); S(11, 8, 1, 1, dark);
    } else if (id === "strawberry") {
      /* FRAISE — un cœur pointe en bas, calice vert en couronne, et des
         AKÈNES : les petits points jaunes. Ce sont eux qu'on reconnaît, bien
         avant la forme. */
      const dark = "#9c1c2e", body = "#e0344a", lit = "#f0687a", seed = "#f8dc78";
      S(4, 5, 8, 5, body); S(3, 6, 10, 4, body);
      S(4, 9, 8, 3, body); S(5, 11, 6, 2, body); S(6, 12, 4, 2, body); S(7, 14, 2, 1, dark);
      S(3, 8, 5, 5, dark); S(4, 10, 4, 3, dark);      // flanc gauche à l'ombre
      S(7, 5, 5, 4, lit); S(8, 6, 3, 2, "#ff8a98");
      for (const [sx, sy] of [[5, 7], [8, 8], [6, 10], [10, 7], [9, 11], [7, 12], [11, 9], [4, 9]]) S(sx, sy, 1, 1, seed);
      // calice : cinq folioles, pas un bandeau vert
      S(4, 4, 8, 2, "#3f8a2e");
      S(3, 4, 2, 1, "#54a83c"); S(6, 3, 2, 1, "#54a83c"); S(9, 3, 2, 1, "#54a83c"); S(11, 4, 2, 1, "#54a83c");
      S(7, 2, 2, 2, "#6a3a1e"); S(7, 1, 1, 1, "#8a5230");     // queue
      S(6, 6, 2, 1, "#ff9aa6");                                // spéculaire
    } else if (id === "raspberry") {
      /* FRAMBOISE — une DRUPÉOLE à la fois. C'est le seul fruit des quatre
         dont la surface est faite de boules : la dessiner lisse la
         transformerait en fraise sans akènes. Huit petites sphères, chacune
         avec son propre point clair, valent mieux qu'un tampon de bruit. */
      /* ⚠️ RÉGLÉ EN REGARDANT LE PNG. La première version alignait les
         drupéoles en COLONNES : elles se fondaient en bandes horizontales, et
         le fruit se lisait comme une fraise rayée. Deux corrections :
           1. les rangs sont DÉCALÉS d'un demi-motif (appareillage en quinconce,
              comme une maçonnerie) — c'est ce décalage qui fait qu'on compte
              des boules au lieu de lire des lignes ;
           2. un pixel de creux SOMBRE entre les rangs. Sans séparation, deux
              masses de même valeur qui se touchent n'en font qu'une (zip 388),
              et c'est vrai à l'échelle de trois pixels comme à celle d'un mur.
         Le fruit se resserre vers le bas : une framboise est un dé à coudre. */
      const dark = "#7e1c39", body = "#c8365f", lit = "#e0688a", deep = "#5c1129";
      const cells = [
        [3, 5], [6, 5], [9, 5], [12, 5],
        [4, 8], [7, 8], [10, 8],
        [5, 11], [8, 11],
      ];
      /* ⚠️ DEUX PASSES, ET L'ORDRE EST LA CORRECTION. La version précédente
         peignait chaque boule PUIS son creux : la boule suivante, dessinée
         après, recouvrait le creux qu'on venait de tracer. Résultat, des
         bandes horizontales — exactement le défaut qu'on croyait réparer. On
         pose donc toutes les boules, puis tous les creux par-dessus. */
      for (const [dx, dy] of cells) {
        S(dx, dy, 3, 3, body);
        S(dx, dy + 2, 3, 1, dark);        // bas de la boule
        S(dx, dy, 2, 1, lit);             // haut éclairé
      }
      for (const [dx, dy] of cells) {
        S(dx + 3, dy, 1, 3, deep);        // creux vertical, à droite de chaque boule
        S(dx, dy + 3, 3, 1, deep);        // creux horizontal, sous chaque boule
        S(dx, dy, 1, 1, "#f0a0b8");       // le point brillant reste au-dessus
      }
      S(4, 14, 7, 1, dark); S(6, 15, 3, 1, deep);    // pointe du fruit
      S(4, 3, 8, 2, "#3f8a2e");                      // calice
      S(3, 4, 2, 1, "#54a83c"); S(11, 4, 2, 1, "#54a83c");
      S(6, 2, 1, 1, "#54a83c"); S(9, 2, 1, 1, "#54a83c");
      S(7, 1, 2, 2, "#6a3a1e");
    } else {
      /* MYRTILLE — presque noire, avec la PRUINE (le voile bleu-gris cireux)
         et la petite COURONNE en étoile à son sommet. Ces deux détails-là sont
         toute la myrtille ; sans eux, c'est un raisin. */
      /* ⚠️ RÉGLÉ EN REGARDANT LE PNG. La première version était un rectangle
         bleu à coins vifs : elle se lisait comme un sac, pas comme un fruit.
         Trois corrections :
           1. les COINS SONT MANGÉS — une sphère de seize pixels doit perdre
              son coin, sinon l'œil lit un carré arrondi ;
           2. la COURONNE en étoile est franche et CREUSE (elle s'enfonce),
              parce que c'est elle qui distingue une myrtille d'un raisin ;
           3. la PRUINE — le voile cireux bleu-gris — couvre franchement le
              dos. C'est la seule zone claire du fruit, donc la seule qui lui
              donne du volume sur un fond sombre. */
      const dark = "#1e2450", body = "#3a4a9c", lit = "#5f78d0", bloom = "#9db0e8";
      S(5, 4, 6, 10, body); S(4, 5, 8, 8, body); S(3, 7, 10, 4, body);
      S(4, 10, 8, 3, dark); S(5, 12, 6, 2, dark); S(6, 13, 4, 1, "#141838");
      S(5, 5, 6, 4, lit);
      S(5, 5, 5, 3, bloom); S(6, 4, 4, 2, bloom);     // pruine sur tout le dos
      S(6, 5, 2, 2, "#d8e2f8"); S(6, 5, 1, 1, "#ffffff");
      S(12, 8, 1, 2, lit);                             // reflet froid, flanc droit
      /* la couronne : un creux sombre, cinq dents autour. Elle mord sur le
         corps (y = 3..5) au lieu de se poser dessus — une couronne posée
         ressemble à un chapeau. */
      S(6, 3, 4, 3, "#141838");
      S(5, 4, 1, 1, "#2c3670"); S(10, 4, 1, 1, "#2c3670");
      S(6, 2, 1, 2, "#2c3670"); S(9, 2, 1, 2, "#2c3670"); S(7, 2, 2, 1, "#2c3670");
      S(7, 4, 2, 1, "#0c0e24");
    }
    outlineSprite(g, T, T, "rgba(24,18,30,0.85)");
    /* Ombre portée : un fruit sans contact flotte au-dessus du fond du sac.
       ⚠️ Elle est SOMBRE et ÉTROITE. La première version était une barre grise
       claire sur toute la largeur : sur le PNG elle se lisait comme une
       étagère sous le fruit, pas comme son ombre. Une ombre est un trou, pas
       un objet. */
    P(g, 6, 15, 4, 1, "rgba(12,8,18,0.45)");
    P(g, 5, 15, 1, 1, "rgba(12,8,18,0.22)"); P(g, 10, 15, 1, 1, "rgba(12,8,18,0.22)");
    return c;
  }

  /* La BARQUETTE (demande de Guillaume : « on peut aussi vendre les fruits par
     barquettes »). Une cagette de bois clair remplie du fruit choisi. Elle doit
     se lire comme UNE UNITÉ DE VENTE et non comme six fruits en vrac : d'où le
     cadre, les lattes, et l'étiquette claire sur le devant. */
  function punnetSprite(id) {
    const [c, g] = cv(24, 20);
    const sp = (C.FRUITS.find(f => f.id === id) || C.FRUITS[0]);
    // fruits qui dépassent, dessinés AVANT la cagette : c'est ce chevauchement
    // qui donne la profondeur, et il ne coûte que l'ordre des lignes
    for (const [dx, dy] of [[5, 4], [10, 3], [15, 4], [7, 6], [13, 6]]) {
      P(g, dx, dy, 4, 4, sp.color);
      P(g, dx, dy + 3, 4, 1, sp.dark);
      P(g, dx, dy, 2, 1, "#ffffff22");
      P(g, dx + 1, dy + 1, 1, 1, "rgba(255,255,255,0.55)");
    }
    P(g, 2, 8, 20, 10, "#c8a06a");                 // caisse
    P(g, 2, 8, 20, 1, "#e0bd88");
    P(g, 2, 17, 20, 1, "#8f6f42");
    for (let x = 4; x < 22; x += 4) P(g, x, 9, 1, 8, "#a9834f");   // lattes
    P(g, 1, 9, 1, 8, "#8f6f42"); P(g, 22, 9, 1, 8, "#8f6f42");
    P(g, 7, 11, 10, 5, "#f2e6c8");                 // étiquette
    P(g, 8, 12, 8, 1, sp.dark); P(g, 8, 14, 6, 1, sp.dark);
    outlineSprite(g, 24, 20, "rgba(24,18,30,0.8)");
    return c;
  }

  /* ========================================================================
     ZIP 398 — LES VERGERS, à quatre stades.
     ------------------------------------------------------------------------
     Trois silhouettes selon `kind` : `tree` (citronnier, sur tronc),
     `bush` (framboisier, myrtillier) et `low` (fraisier, au ras du sol).

     ⚠️ LE STADE 3 (EN FRUITS) DOIT SE VOIR DE LOIN, et c'est le seul critère
     qui compte pour ces sprites : un joueur traverse sa ferme et doit repérer
     d'un coup d'œil lequel de ses douze plants est prêt. Les fruits y sont donc
     PLUS GROS et PLUS CLAIRS que nature, et posés sur le pourtour du feuillage
     plutôt qu'au milieu — au milieu, ils se noient dans le vert.
     ====================================================================== */
  function orchardSprite(kindIdx, stage) {
    const spec = C.ORCHARDS[kindIdx] || C.ORCHARDS[0];
    const fr = C.FRUITS.find(f => f.id === spec.fruit) || C.FRUITS[0];
    const W = 24, H = 28;
    const [c, g] = cv(W, H);
    const leaf = "#2f6f2c", leaf2 = "#3f8a36", leafD = "#1e4a1c";
    const bark = "#6b4a2a", barkD = "#4a3119";
    const puff = (x, y, w, h) => { P(g, x, y, w, h, leaf); P(g, x, y, w, Math.max(1, h >> 1), leaf2); P(g, x, y + h - 1, w, 1, leafD); };
    const fruitDot = (x, y, r) => {
      P(g, x, y, r, r, fr.color);
      P(g, x, y + r - 1, r, 1, fr.dark);
      P(g, x, y, 1, 1, "rgba(255,255,255,0.75)");
    };

    if (stage === 0) {
      // PLANT : deux feuilles et une tige. Il doit avoir l'air FRAGILE, sinon
      // on ne ressent rien à le voir grandir.
      P(g, 11, 20, 2, 6, "#5f8a3a");
      puff(8, 17, 4, 3); puff(13, 18, 4, 3);
      P(g, 6, 26, 12, 2, "#4a3a24");            // terre remuée
    } else if (stage === 1) {
      if (spec.kind === "tree") { P(g, 10, 16, 4, 10, bark); P(g, 10, 16, 1, 10, barkD); puff(6, 10, 12, 7); puff(8, 7, 8, 4); }
      else { puff(5, 15, 14, 9); puff(7, 12, 10, 5); }
      P(g, 5, 26, 14, 2, "#4a3a24");
    } else {
      // ADULTE (2) et EN FRUITS (3) : même feuillage, les fruits en plus.
      if (spec.kind === "tree") {
        P(g, 10, 15, 5, 12, bark); P(g, 10, 15, 1, 12, barkD); P(g, 14, 15, 1, 12, "#8a6236");
        P(g, 8, 25, 9, 2, barkD);                                    // empattement
        puff(3, 6, 18, 10); puff(5, 2, 14, 6); puff(1, 9, 6, 5); puff(17, 9, 6, 5);
        if (stage === 3) for (const [fx, fy] of [[3, 10], [7, 13], [12, 12], [17, 10], [5, 6], [15, 5], [19, 12], [10, 3]]) fruitDot(fx, fy, 4);
      } else if (spec.kind === "bush") {
        puff(2, 11, 20, 13); puff(4, 7, 16, 6); puff(0, 15, 5, 7); puff(19, 15, 5, 7);
        P(g, 11, 22, 2, 5, "#4a6b2a");
        if (stage === 3) for (const [fx, fy] of [[2, 15], [6, 12], [10, 17], [15, 12], [19, 16], [8, 8], [16, 8], [12, 21]]) fruitDot(fx, fy, 4);
      } else {
        // LOW (fraisier) : une touffe ramassée, les fruits POSÉS AU SOL, comme
        // dans un vrai carré de fraises. C'est ce détail qui le distingue du
        // framboisier au premier coup d'œil, bien avant sa couleur.
        puff(3, 15, 18, 9); puff(6, 11, 12, 5); puff(1, 18, 5, 5); puff(18, 18, 5, 5);
        if (stage === 3) for (const [fx, fy] of [[3, 22], [8, 23], [13, 22], [18, 23], [6, 18], [15, 18]]) fruitDot(fx, fy, 4);
      }
      P(g, 4, 26, 16, 2, "#3f3220");
    }
    outlineSprite(g, W, H, "rgba(18,14,22,0.7)");
    return c;
  }

  // Buisson à baies (printemps) : petite touffe verte foncée piquée de baies
  // rouges. Occupe une seule tuile (16x16).
  function berryBushSprite() {
    const [c, g] = cv(T, T);
    P(g, 2, 6, 12, 8, "#2d6a2a"); P(g, 1, 8, 14, 5, "#2d6a2a");
    for (let i = 0; i < 22; i++) P(g, 2 + Math.floor(Math.random() * 12), 6 + Math.floor(Math.random() * 8), 1, 1, Math.random() < 0.4 ? "#3d8a3a" : "#245422");
    // baies rouges (déterministes plutôt qu'aléatoires : un rendu à chaque
    // frame donnerait un buisson qui clignote — on fige ici).
    const berries = [[3, 8], [7, 6], [9, 10], [5, 12], [11, 7], [12, 11]];
    for (const [bx, by] of berries) { P(g, bx, by, 2, 2, "#c8283a"); P(g, bx, by, 1, 1, "#e05a6a"); }
    return c;
  }

  // ----- Mairie de Valley Town (zip 235, Guillaume : "change the townhall
  // design to look more like a townhall and not like a house"). Sprite
  // dédié : bâtisse imposante à colonnades avec fronton, drapeau, horloge,
  // large volée de marches. Canevas 128x128 (2x une maison), ancré comme les
  // maisons par son bord bas.
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 429 — L'ÉGLISE, ENFIN DESSINÉE COMME UNE ÉGLISE.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ CE BÂTIMENT ÉTAIT UNE MAIRIE. Littéralement : le zip 235 avait dessiné
     `townhallSprite` — fronton à colonnes, HORLOGE au centre, DRAPEAU sur le
     toit — et le 425 l'a renommé « église » sans toucher un pixel, parce qu'il
     venait d'en dessiner une vraie (`townHall2`) et qu'il fallait bien recaser
     l'ancienne. La note de l'époque le dit noir sur blanc : « le dessin n'a pas
     bougé d'un pixel ». Le résultat tenait quatre zips : Valley Town avait deux
     mairies, dont l'une s'appelait église, et la seule chose qui en faisait un
     lieu de culte était une chaîne de caractères.
     C'est une variante du « bâtiment muet » du 426 (une porte qui ne dit rien
     passe pour cassée), en plus sournoise : ici le bâtiment PARLE, et il ment.

     ⚠️ CE QUI FAIT « ÉGLISE » — et aucun de ces quatre points n'était présent :
       1. UN CLOCHER, c'est-à-dire une masse VERTICALE décalée sur le côté. Une
          façade symétrique à fronton, c'est un temple civique ; une silhouette
          asymétrique dominée par une tour, c'est une église. C'est la
          silhouette qui identifie, pas le détail ;
       2. UNE FLÈCHE ET UNE CROIX au sommet. C'est le seul élément littéral, et
          il est indispensable : à cette taille, c'est lui qu'on lit de loin ;
       3. UNE ROSACE en façade, ronde, à meneaux rayonnants. Une fenêtre ronde
          ne se trouve nulle part ailleurs dans cette ville ;
       4. DES OUVERTURES EN ARC BRISÉ, pas cintrées. L'arc plein cintre est
          l'arc de la mairie et de la gare ; l'ogive n'appartient qu'ici.
     ⚠️ Et le fronton, l'horloge et le drapeau ont été SUPPRIMÉS, pas déplacés :
     ce sont exactement les trois signes qui disaient « mairie ».

     ⚠️ AUCUN `translate` NI `rotate`, aucun `fillText` (§10) : le banc de rendu
     doit pouvoir dessiner ce bâtiment, sinon on ne peut plus le regarder. La
     flèche et les ogives sont donc des chemins en coordonnées absolues. */
  function townhallSprite() {
    const W = 128, H = 152;
    const [c, g] = cv(W, H);
    const ST = "#d6d0c0", ST_L = "#efe9d8", ST_D = "#b0aa9a", ST_XD = "#8d887a";
    const ROOF = "#5c6b7e", ROOF_L = "#7a8a9e", ROOF_D = "#3f4c5c";
    const WOOD = "#5a4028", WOOD_L = "#7d5c3c";
    const GLASS = "#8fc7ec", GLASS_D = "#5f9ec6";
    const GOLD = "#e0c060";
    /* Les vitraux : trois couleurs seulement. ⚠️ Un vitrail « réaliste » à cette
       échelle donne du bruit multicolore ; trois teintes saturées sur du plomb
       sombre lisent « vitrail » à quinze pixels de large. */
    const V1 = "#c8503c", V2 = "#3c76c8", V3 = "#e0b03c";

    const BASE = H - 4;                 // le sol, 4 px de marge comme les autres monuments
    const TOWER_X = 8, TOWER_W = 34;    // le clocher, à GAUCHE — l'asymétrie fait l'église
    const NAVE_X = TOWER_X + TOWER_W, NAVE_W = W - NAVE_X - 8;

    // ---- 1. LA NEF. Corps de pierre, plus bas que la tour.
    const NAVE_TOP = BASE - 74;
    P(g, NAVE_X, NAVE_TOP, NAVE_W, BASE - NAVE_TOP, ST);
    P(g, NAVE_X, NAVE_TOP, NAVE_W, 2, ST_L);
    P(g, W - 10, NAVE_TOP, 2, BASE - NAVE_TOP, ST_D);         // ombre du bord droit
    // Contreforts : deux pilastres qui montent du sol au toit. Ce sont eux qui
    // donnent l'épaisseur du mur, donc le poids.
    for (const bx of [NAVE_X + 4, NAVE_X + NAVE_W - 10]) {
      P(g, bx, NAVE_TOP + 6, 6, BASE - NAVE_TOP - 6, ST_D);
      P(g, bx, NAVE_TOP + 6, 2, BASE - NAVE_TOP - 6, ST);
      P(g, bx - 1, NAVE_TOP + 4, 8, 3, ST_L);                 // chapiteau
    }
    // Soubassement mouluré, sur toute la largeur du bâtiment.
    P(g, TOWER_X - 2, BASE - 8, W - TOWER_X - 4, 8, ST_D);
    P(g, TOWER_X - 2, BASE - 8, W - TOWER_X - 4, 2, ST);

    // ---- 2. LE TOIT À DEUX PENTES de la nef. Il DÉPASSE du mur : c'est
    // l'avancée du toit qui fait l'ombre portée, donc le relief.
    g.fillStyle = ROOF;
    g.beginPath();
    g.moveTo(NAVE_X - 4, NAVE_TOP + 2);
    g.lineTo(NAVE_X + NAVE_W / 2, NAVE_TOP - 26);
    g.lineTo(W - 4, NAVE_TOP + 2);
    g.closePath(); g.fill();
    g.fillStyle = ROOF_L;                                     // versant éclairé (gauche)
    g.beginPath();
    g.moveTo(NAVE_X - 4, NAVE_TOP + 2);
    g.lineTo(NAVE_X + NAVE_W / 2, NAVE_TOP - 26);
    g.lineTo(NAVE_X + NAVE_W / 2, NAVE_TOP - 20);
    g.lineTo(NAVE_X + 4, NAVE_TOP + 2);
    g.closePath(); g.fill();
    P(g, NAVE_X - 4, NAVE_TOP + 2, NAVE_W + 8, 3, ROOF_D);    // corniche sous le toit

    // ---- 3. LA ROSACE, en façade de nef. Ronde, à huit meneaux.
    const RX = NAVE_X + NAVE_W / 2, RY = NAVE_TOP + 20;
    g.fillStyle = ST_XD; g.beginPath(); g.arc(RX, RY, 12, 0, 7); g.fill();
    g.fillStyle = GLASS_D; g.beginPath(); g.arc(RX, RY, 10, 0, 7); g.fill();
    // Les quartiers colorés : quatre secteurs, posés en carrés (pas d'arcs
    // partiels, qui bavent à cette taille).
    P(g, RX - 8, RY - 4, 6, 8, V2); P(g, RX + 2, RY - 4, 6, 8, V1);
    P(g, RX - 4, RY - 8, 8, 5, V3); P(g, RX - 4, RY + 3, 8, 5, V3);
    g.fillStyle = ST_L;                                        // meneaux de pierre
    P(g, RX - 10, RY - 1, 20, 2, ST_L); P(g, RX - 1, RY - 10, 2, 20, ST_L);
    g.fillStyle = ST; g.beginPath(); g.arc(RX, RY, 3, 0, 7); g.fill();

    // ---- 4. LE PORTAIL EN ARC BRISÉ. L'ogive est faite de deux segments
    // droits : un arc de cercle donnerait un plein cintre, c'est-à-dire la
    // porte de la mairie.
    const DW = 26, DX = RX - DW / 2, DY = BASE - 42;
    const ogive = (x0, y0, w, h, rise, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x0, y0 + h);
      g.lineTo(x0, y0 + rise);
      g.lineTo(x0 + w / 2, y0);
      g.lineTo(x0 + w, y0 + rise);
      g.lineTo(x0 + w, y0 + h);
      g.closePath(); g.fill();
    };
    ogive(DX - 3, DY - 15, DW + 6, 57, 15, ST_XD);            // encadrement
    ogive(DX, DY - 12, DW, 54, 12, WOOD);                     // vantaux
    P(g, DX + DW / 2 - 1, DY, 2, 42, "#3a2818");              // joint central
    for (let k = 0; k < 3; k++) {                             // ferrures
      P(g, DX + 2, DY + 8 + k * 12, DW / 2 - 4, 2, WOOD_L);
      P(g, DX + DW / 2 + 2, DY + 8 + k * 12, DW / 2 - 4, 2, WOOD_L);
    }
    P(g, DX + DW / 2 - 5, DY + 20, 3, 3, GOLD);               // poignées
    P(g, DX + DW / 2 + 2, DY + 20, 3, 3, GOLD);
    // Trois marches devant le portail.
    for (let k = 0; k < 3; k++) P(g, DX - 6 - k * 3, BASE - 2 - k * 2, DW + 12 + k * 6, 2, k % 2 ? ST_D : ST);

    // ---- 5. LES BAIES EN OGIVE de la nef, de part et d'autre du portail.
    for (const wx of [NAVE_X + 12, NAVE_X + NAVE_W - 24]) {
      ogive(wx, NAVE_TOP + 30, 12, 26, 9, ST_XD);
      ogive(wx + 2, NAVE_TOP + 32, 8, 22, 8, GLASS);
      P(g, wx + 2, NAVE_TOP + 38, 8, 2, V1);                  // deux bandes de vitrail
      P(g, wx + 2, NAVE_TOP + 46, 8, 2, V2);
      P(g, wx + 5, NAVE_TOP + 34, 2, 20, ST_L);               // meneau
    }

    // ---- 6. LE CLOCHER. Il monte plus haut que tout le reste, et c'est LUI
    // qui identifie le bâtiment de loin.
    const TOP = 30;
    P(g, TOWER_X, TOP, TOWER_W, BASE - TOP, ST);
    P(g, TOWER_X, TOP, 3, BASE - TOP, ST_L);                  // arête éclairée
    P(g, TOWER_X + TOWER_W - 3, TOP, 3, BASE - TOP, ST_D);
    // Bandeaux horizontaux : ils étagent la tour, sinon elle lit comme une
    // cheminée.
    for (const by of [TOP + 26, TOP + 54]) { P(g, TOWER_X - 2, by, TOWER_W + 4, 4, ST_D); P(g, TOWER_X - 2, by, TOWER_W + 4, 1, ST_L); }
    // La chambre des cloches : deux abat-sons en ogive, sombres (c'est du VIDE,
    // pas du verre — une tour aux fenêtres vitrées est un immeuble).
    for (const ax of [TOWER_X + 6, TOWER_X + 19]) {
      ogive(ax, TOP + 8, 9, 17, 7, ST_XD);
      ogive(ax + 2, TOP + 10, 5, 13, 5, "#2e2c2a");
      for (let k = 0; k < 3; k++) P(g, ax + 2, TOP + 14 + k * 3, 5, 1, ST_D);   // lames de l'abat-son
    }
    // La grande baie basse, côté rue.
    ogive(TOWER_X + 11, TOP + 62, 12, 24, 9, ST_XD);
    ogive(TOWER_X + 13, TOP + 64, 8, 20, 8, GLASS);
    P(g, TOWER_X + 13, TOP + 70, 8, 2, V3);

    // ---- 7. LA FLÈCHE ET LA CROIX. Le point le plus haut de Valley Town.
    g.fillStyle = ROOF_D;                                     // corniche du beffroi
    P(g, TOWER_X - 4, TOP - 4, TOWER_W + 8, 5, ROOF_D);
    P(g, TOWER_X - 4, TOP - 4, TOWER_W + 8, 1, ROOF_L);
    const SPX = TOWER_X + TOWER_W / 2;
    g.fillStyle = ROOF;                                       // la flèche
    g.beginPath(); g.moveTo(TOWER_X - 2, TOP - 4); g.lineTo(SPX, 8); g.lineTo(TOWER_X + TOWER_W + 2, TOP - 4); g.closePath(); g.fill();
    g.fillStyle = ROOF_L;                                     // arête éclairée de la flèche
    g.beginPath(); g.moveTo(TOWER_X - 2, TOP - 4); g.lineTo(SPX, 8); g.lineTo(SPX - 4, TOP - 4); g.closePath(); g.fill();
    P(g, SPX - 1, 1, 2, 8, GOLD);                             // la croix
    P(g, SPX - 3, 3, 6, 2, GOLD);
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 425 — LE TRIBUNAL DE VALLEY TOWN.
     ──────────────────────────────────────────────────────────────────────────
     Demande de Guillaume : « un autre bâtiment élégant néoclassique nommé
     tribunal (doit être imposant et ressembler à un tribunal) ».

     ⚠️ CE QUI FAIT « TRIBUNAL » N'EST NI LA TAILLE NI LES COLONNES — l'église
     du 235 a déjà les deux. Ce sont TROIS choses, et il les faut toutes :
       1. UN PERRON QUI OCCUPE TOUTE LA FAÇADE, haut de plusieurs marches. Un
          bâtiment de justice se GRAVIT ; c'est la première chose que dit un
          palais de justice, avant même son nom sur le fronton.
       2. UN PÉRISTYLE PROFOND — huit colonnes, et une ombre portée derrière
          elles. Une simple rangée de colonnes plaquées sur un mur fait un
          portique de banque ; le RETRAIT fait le temple.
       3. UN FRONTON SCULPTÉ, avec la balance. C'est le seul endroit du jeu où
          l'on écrit un symbole plutôt qu'un mot, et c'est le bon : il se lit à
          la taille d'un sprite, ce qu'un mot ne fait pas.

     ⚠️ ET IL EST GRIS-PIERRE, PAS CRÈME. L'église est crème (0xefe6cc). Deux
     bâtiments à colonnes de la même couleur, à trois écrans l'un de l'autre,
     seraient LE MÊME bâtiment pour le joueur — c'est le piège habituel des
     tuiles civiques. Le tribunal est en pierre froide, l'hôtel de ville en
     brique : à distance, la teinte suffit à les nommer.

     ⚠️ POURQUOI PAS BLENDER (proposé par Guillaume). BlenderMCP est installé et
     répond, mais la ferme n'a AUCUN pipeline d'image : tous ses sprites sont
     des canevas procéduraux dessinés dans ce fichier (voir §8 de CLAUDE.md —
     le pipeline A sert à `crystal`, qui TRANSCRIT un rendu en table de données,
     et le B aux jeux three.js). Introduire un PNG ici créerait un troisième
     pipeline, avec son chargement, son cache et sa palette hors-fichier, pour
     un bâtiment. On garde l'unique façon de faire du fichier.

     Canevas 192×176, ancré par son bord bas comme tous les bâtiments.
     ══════════════════════════════════════════════════════════════════════════ */
  function courthouseSprite() {
    const W = 192, H = 176;
    const [c, g] = cv(W, H);
    const STONE = "#c9c6bd", STONE_L = "#dedbd2", STONE_D = "#a8a49a", STONE_XD = "#8b8880";
    const SHADE = "#6f6d67";      // le fond du péristyle, dans l'ombre
    const BRONZE = "#8a6a3a";     // la poignée de la porte, seule touche chaude

    // ---- 1. LE PERRON. Cinq marches pleine largeur, chacune un cran plus
    // étroite : c'est ce dégradé de largeur qui donne la perspective, pas un
    // dessin en biais.
    for (let s = 0; s < 5; s++) {
      const inset = s * 5, y = H - 6 - s * 6;
      P(g, inset, y, W - inset * 2, 6, s % 2 ? STONE_D : STONE);
      P(g, inset, y, W - inset * 2, 1, STONE_L);          // nez de marche éclairé
      P(g, inset, y + 5, W - inset * 2, 1, STONE_XD);     // contremarche à l'ombre
    }
    // Deux socles latéraux (ils portent les vasques) : ils encadrent la volée
    // et empêchent le perron de « couler » sur les côtés.
    for (const bx of [2, W - 20]) {
      P(g, bx, H - 34, 18, 28, STONE_D); P(g, bx, H - 34, 18, 2, STONE_L);
      P(g, bx + 3, H - 44, 12, 10, STONE); P(g, bx + 3, H - 44, 12, 2, STONE_L);
    }

    // ---- 2. LE STYLOBATE (la plateforme sur laquelle reposent les colonnes).
    P(g, 12, H - 42, W - 24, 12, STONE); P(g, 12, H - 42, W - 24, 2, STONE_L);
    P(g, 12, H - 31, W - 24, 2, STONE_XD);

    // ---- 3. LE MUR DU FOND, EN RETRAIT ET DANS L'OMBRE. Il est dessiné AVANT
    // les colonnes : c'est lui qui donne la profondeur du péristyle.
    P(g, 24, 52, W - 48, H - 94, SHADE);
    P(g, 30, 60, W - 60, H - 106, "#7e7c75");
    // La grande porte de bronze, à deux battants, au fond du portique.
    const dw = 30, dx = (W - dw) / 2, dy = 92;
    P(g, dx - 4, dy - 6, dw + 8, 6, "#6a6862");
    P(g, dx, dy, dw, H - 42 - dy, "#4a4238");
    P(g, dx + dw / 2, dy, 1, H - 42 - dy, "#2c261e");
    for (let r = 0; r < 4; r++) {
      P(g, dx + 4, dy + 8 + r * 10, dw / 2 - 7, 7, "#5c5248");
      P(g, dx + dw / 2 + 3, dy + 8 + r * 10, dw / 2 - 7, 7, "#5c5248");
    }
    P(g, dx + dw / 2 - 4, dy + 20, 3, 3, BRONZE); P(g, dx + dw / 2 + 2, dy + 20, 3, 3, BRONZE);

    // ---- 4. LES HUIT COLONNES. Fût cannelé (trois traits verticaux), base et
    // chapiteau débordants.
    /* ⚠️⚠️ ZIP 431 — LA COLONNADE ÉTAIT DÉCALÉE DE SIX PIXELS VERS LA DROITE,
       ET C'EST GUILLAUME QUI L'A VU EN JEU (« même type de décalage pour
       l'architecture extérieure du tribunal »). Le 425 avait écrit le départ en
       dur (`18 + i * 22`) au lieu de le DÉDUIRE : huit fûts de 14 px espacés de
       22 occupent 7×22 + 14 = 168 px, qui se centrent dans 192 à partir de 12,
       pas de 18. Tout le reste du bâtiment — fronton, entablement, porte,
       perron, acrotères — est bâti sur W/2 ; seules les colonnes ne l'étaient
       pas, donc le péristyle penchait par rapport à son propre fronton.
       ⚠️ Un défaut de SYMÉTRIE ne se voit pas en regardant l'élément fautif :
       la colonnade est parfaitement régulière, c'est son rapport au fronton qui
       est faux. C'est la même famille que l'échelle du 429 — un objet ne se
       juge pas seul. D'où le contrôle de symétrie ajouté au banc de rendu. */
    const COLS = 8, COL_W = 14, COL_STEP = 22;
    const COL_X0 = (W - ((COLS - 1) * COL_STEP + COL_W)) / 2;
    for (let i = 0; i < COLS; i++) {
      const cx = COL_X0 + i * COL_STEP;
      P(g, cx, 56, 14, H - 98, STONE);
      P(g, cx, 56, 3, H - 98, STONE_L);            // côté éclairé
      P(g, cx + 11, 56, 3, H - 98, STONE_D);       // côté à l'ombre
      P(g, cx + 6, 60, 1, H - 106, STONE_D);       // cannelure
      P(g, cx - 2, 52, 18, 5, STONE_L);            // chapiteau
      P(g, cx - 2, 56, 18, 1, STONE_D);
      P(g, cx - 3, H - 46, 20, 5, STONE);          // base
      P(g, cx - 3, H - 46, 20, 1, STONE_L);
    }

    // ---- 5. L'ENTABLEMENT ET LE FRONTON.
    P(g, 8, 40, W - 16, 12, STONE); P(g, 8, 40, W - 16, 2, STONE_L);
    P(g, 8, 50, W - 16, 2, STONE_D);
    // Denticules sous la corniche : quatre pixels sur deux, et le bâtiment
    // gagne d'un coup son siècle.
    /* Les denticules, CENTRÉS eux aussi (431) : le pas de 6 px ne tombait pas
       juste dans 168 px de course, et la rangée finissait 1,5 px à gauche. À
       cette échelle c'est invisible seul — mais c'est ce genre d'écart cumulé
       qui donne l'impression qu'un bâtiment « penche » sans qu'on sache dire
       pourquoi. */
    {
      const DN_STEP = 6, DN_W = 3, DN_N = Math.floor((W - 24 + DN_STEP - DN_W) / DN_STEP);
      const dx0 = (W - ((DN_N - 1) * DN_STEP + DN_W)) / 2;
      for (let i = 0; i < DN_N; i++) P(g, dx0 + i * DN_STEP, 52, DN_W, 3, STONE_D);
    }
    g.fillStyle = STONE_D;
    g.beginPath(); g.moveTo(4, 42); g.lineTo(W / 2, 6); g.lineTo(W - 4, 42); g.fill();
    g.fillStyle = STONE;
    g.beginPath(); g.moveTo(10, 41); g.lineTo(W / 2, 11); g.lineTo(W - 10, 41); g.fill();
    g.fillStyle = STONE_L;
    g.beginPath(); g.moveTo(10, 41); g.lineTo(W / 2, 11); g.lineTo(W / 2, 15); g.lineTo(14, 41); g.fill();

    // ---- 6. LA BALANCE, sculptée au tympan. Fléau, deux plateaux, colonnette.
    {
      const bx = W / 2, by = 30;
      P(g, bx - 1, by - 10, 2, 12, STONE_XD);            // colonnette
      P(g, bx - 16, by - 10, 32, 2, STONE_XD);           // fléau
      for (const s of [-1, 1]) {
        P(g, bx + s * 15 - 1, by - 9, 1, 5, STONE_XD);   // suspente
        P(g, bx + s * 15 - 5, by - 4, 10, 2, STONE_XD);  // plateau
        P(g, bx + s * 15 - 4, by - 2, 8, 1, STONE_D);
      }
      P(g, bx - 6, by + 2, 12, 2, STONE_XD);             // socle
    }
    // Acrotères aux trois pointes du fronton : de petits blocs qui empêchent
    // le triangle de finir en pointe molle.
    P(g, W / 2 - 3, 2, 6, 6, STONE_L);
    P(g, 2, 38, 6, 6, STONE_L); P(g, W - 8, 38, 6, 6, STONE_L);
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 425 — LE NOUVEL HÔTEL DE VILLE DE VALLEY TOWN. REPRIS AU 433.
     ──────────────────────────────────────────────────────────────────────────
     Demande : « un nouveau bâtiment townhall différent des autres quelque part
     au centre ». « Différent des autres » est la contrainte principale, et elle
     porte sur ce qu'on voit de loin :
       * l'ÉGLISE est blanche, symétrique, à fronton ;
       * le TRIBUNAL est gris-pierre, à péristyle profond et grand perron ;
       * l'HÔTEL DE VILLE est en BRIQUE ROUGE, et il est ASYMÉTRIQUE — un
         beffroi à horloge décalé sur la gauche, un corps de logis plus bas à
         droite. C'est ce déséquilibre qui le rend reconnaissable en une
         fraction de seconde, bien plus que n'importe quel détail.
     Canevas 160×144, ancré par son bord bas.

     ══════════════════════════════════════════════════════════════════════════
     ZIP 433 — L'AUDIT GRAPHIQUE (demande de Guillaume : « le town hall est pas
     assez travaillé, regarder ce qui cloche niveau textures, détails,
     symétrie »). Quatre défauts, et les trois premiers sont des DÉCALAGES —
     exactement la famille du 431 (la rangée d'étals, la colonnade du tribunal) :

       1. ⚠️⚠️ **LE PERRON NE MENAIT NULLE PART.** Les trois marches étaient
          centrées sur x = 80, c'est-à-dire au milieu du CORPS DE LOGIS ; la
          porte, elle, est sous le BEFFROI, à x = 28. On montait donc un escalier
          posé devant un mur plein, et la seule entrée du bâtiment n'avait pas
          de marche. Invisible en regardant l'escalier (il est régulier), visible
          dès qu'on regarde ce à quoi il MÈNE.
       2. ⚠️⚠️ **LA RANGÉE DE FENÊTRES PENCHAIT DE SEPT PIXELS.** Trois travées
          régulières, mais posées à 10 px du chaînage gauche et 24 px du droit :
          la façade avait l'air d'avoir été coupée à droite. Un alignement se
          juge contre son MUR, jamais contre lui-même.
       3. ⚠️ **LE FAÎTE DU TOIT ÉTAIT À CÔTÉ DE L'AXE DU MUR** (106 contre 103).
       ⚠️ LA PARADE EST CELLE DU 431, APPLIQUÉE PARTOUT ICI : plus une seule
       position réglée à la main. Deux axes (`AX_TOWER`, `AX_BODY`), et TOUT s'en
       déduit — travées, faîte, perron, horloge, enseigne. « Une position réglée
       à la main est une position qui penchera. »

       4. ⚠️⚠️ **LA BRIQUE N'ÉTAIT PAS DE LA BRIQUE, C'ÉTAIT DU RONDIN.** Une
          ligne sombre pleine largeur tous les 4 px, et pas UN joint vertical :
          à distance, un mur rayé horizontalement se lit comme des madriers
          empilés — le bâtiment public le plus important de la ville avait la
          texture d'une cabane. ⚠️ Ce qui fait la brique n'est pas la ligne
          d'assise, c'est **l'ALTERNANCE DES JOINTS VERTICAUX d'une assise à
          l'autre** (l'appareil à demi-brique). C'est la leçon de la ruche du
          432 dite autrement : du détail, c'est une STRUCTURE qu'on voit mieux,
          pas du bruit.
     Le reste est de l'ajout franc, réclamé par « pas assez travaillé » : chambre
     des cloches à abat-sons (un beffroi sans baie n'est qu'une tour), corniche à
     denticules, appuis et clés de voûte aux fenêtres, chaînages d'angle en
     besace (long/court alternés, comme un vrai chaînage), soubassement à refends,
     ardoises posées en rangs, cheminée, drapeau, et une ombre portée du beffroi
     SUR le corps de logis — sans elle les deux masses sont deux aplats côte à
     côte, pas un volume devant un autre.
     ══════════════════════════════════════════════════════════════════════════ */
  function townHall2Sprite() {
    const W = 160, H = 144;
    const [c, g] = cv(W, H);
    const BRICK = "#a8503c", BRICK_D = "#7e3728", BRICK_L = "#c26a52", BRICK_V = "#98462f";
    const MORTAR = "#8d4433";
    const STONE = "#e2dccb", STONE_D = "#bfb8a4", STONE_L = "#f2eddd";
    const ROOF = "#4a5a70", ROOF_D = "#33415a", ROOF_L = "#66788f";
    const SHADE = "rgba(40,24,30,0.20)";

    /* ── LES DEUX AXES. Tout ce qui suit s'y rapporte ; aucune abscisse n'est
       écrite « parce que ça tombait bien ». ── */
    const TW0 = 8, TW1 = 48;                 // le beffroi
    const BD0 = 52, BD1 = 154;               // le corps de logis
    const AX_TOWER = (TW0 + TW1) / 2;        // 28
    const AX_BODY = (BD0 + BD1) / 2;         // 103
    const GROUND = H - 12;                   // le dessus du soubassement

    /* ── LA BRIQUE, EN APPAREIL À DEMI-BRIQUE. Une assise de 4 px, un joint
       vertical toutes les 8 px, décalé d'une demi-brique une assise sur deux.
       ⚠️ LE JOINT HORIZONTAL EST PLUS CLAIR QUE LA BRIQUE, PAS PLUS SOMBRE :
       le mortier est du sable et de la chaux, il accroche la lumière. Une ligne
       sombre pleine largeur, c'est une OMBRE — donc un creux, donc un rondin.
       Le joint vertical, lui, est sombre : il est étroit et reste à l'ombre. ── */
    const brickWall = (x0, y0, w, h, phase) => {
      P(g, x0, y0, w, h, BRICK);
      for (let y = y0; y < y0 + h; y++) {
        const row = ((y - y0) / 4) | 0;
        if ((y - y0) % 4 === 3) { P(g, x0, y, w, 1, MORTAR); continue; }
        // Joints verticaux, décalés d'une demi-brique une assise sur deux.
        for (let x = x0 + ((row + (phase | 0)) % 2 ? 0 : 4); x < x0 + w; x += 8) P(g, x, y, 1, 1, BRICK_V);
        // Une brique sur sept est un peu plus claire : c'est ce qui empêche le
        // mur de moirer, sans ajouter la moindre couleur.
        for (let x = x0; x < x0 + w; x += 8) {
          if (((x * 7 + y * 13) % 29) < 5) P(g, x + 1, y, 3, 1, BRICK_L);
          else if (((x * 5 + y * 11) % 31) < 4) P(g, x + 1, y, 3, 1, BRICK_D);
        }
      }
    };
    /* Le chaînage d'angle EN BESACE : une pierre longue, une courte, alternées.
       Toutes de la même taille, ce n'est plus un chaînage, c'est une échelle. */
    const quoins = (x, y0, y1, toRight) => {
      for (let y = y0, k = 0; y < y1; y += 8, k++) {
        const w2 = k % 2 ? 4 : 7;
        P(g, toRight ? x : x - w2 + 1, y, w2, 5, STONE);
        P(g, toRight ? x : x - w2 + 1, y, w2, 1, STONE_L);
        P(g, toRight ? x : x - w2 + 1, y + 4, w2, 1, STONE_D);
      }
    };
    /* Un rang d'ardoises : des écailles décalées, pas un aplat. */
    const slates = (x0, y0, x1, y1, dxTop) => {
      for (let y = y0; y < y1; y += 3) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        const ax = x0 + dxTop * (1 - t), bx = x1 - dxTop * (1 - t);
        for (let x = Math.round(ax); x < Math.round(bx); x += 6) {
          P(g, x + (((y - y0) / 3) | 0) % 2 * 3, y, 1, 3, ROOF_D);
        }
        P(g, Math.round(ax), y, Math.round(bx - ax), 1, ((y - y0) / 3 | 0) % 2 ? ROOF : ROOF_L);
      }
    };

    /* ── 1. SOUBASSEMENT À REFENDS, sur toute la largeur. ── */
    P(g, 4, GROUND, W - 8, 12, STONE_D);
    P(g, 4, GROUND, W - 8, 2, STONE);
    for (let x = 8; x < W - 8; x += 12) P(g, x, GROUND + 2, 1, 10, "#a9a291");
    P(g, 4, GROUND + 6, W - 8, 1, "#a9a291");

    /* ── 2. LE CORPS DE LOGIS. ── */
    brickWall(BD0, 44, BD1 - BD0, GROUND - 44, 0);
    P(g, BD0, 44, 2, GROUND - 44, BRICK_L);
    quoins(BD0, 44, GROUND, true);
    quoins(BD1 - 1, 44, GROUND, false);
    // Bandeau de pierre entre les deux niveaux.
    P(g, BD0, 80, BD1 - BD0, 4, STONE); P(g, BD0, 80, BD1 - BD0, 1, STONE_L);
    P(g, BD0, 83, BD1 - BD0, 1, STONE_D);

    /* Les travées. ⚠️ QUATRE, ET CENTRÉES SUR `AX_BODY` : la rangée se construit
       à partir de son milieu, jamais à partir de son bord gauche.
       ⚠️ ET LE REZ-DE-CHAUSSÉE A DES BAIES PLUS HAUTES QUE L'ÉTAGE : c'est la
       règle de toute façade publique (le niveau noble se voit à ses fenêtres),
       et c'est aussi ce qui remplit le bas du mur — deux rangées identiques
       laissaient trente pixels de brique nue au-dessus du soubassement. */
    const BAYS = 4, PITCH = 24, WINW = 14;
    const ROWY = [58, 98], ROWH = [16, 22];
    const bayX = (i) => Math.round(AX_BODY + (i - (BAYS - 1) / 2) * PITCH - WINW / 2);
    for (let r = 0; r < 2; r++) for (let i = 0; i < BAYS; i++) {
      const wx = bayX(i), wy = ROWY[r], hh = ROWH[r];
      // Encadrement de pierre + appui saillant.
      P(g, wx - 2, wy - 2, WINW + 4, hh + 4, STONE);
      g.fillStyle = STONE; g.beginPath(); g.arc(wx + WINW / 2, wy - 1, WINW / 2 + 2, Math.PI, 2 * Math.PI); g.fill();
      P(g, wx - 3, wy + hh + 1, WINW + 6, 2, STONE); P(g, wx - 3, wy + hh + 1, WINW + 6, 1, STONE_L);
      // Le verre, plus clair en haut (le ciel s'y reflète).
      P(g, wx, wy, WINW, hh, "#3d5c78");
      g.fillStyle = "#3d5c78"; g.beginPath(); g.arc(wx + WINW / 2, wy, WINW / 2, Math.PI, 2 * Math.PI); g.fill();
      P(g, wx, wy, WINW, 4, "#7fa8c8"); P(g, wx, wy, WINW, 1, "#a8c8e0");
      // Croisée : un meneau, une traverse.
      P(g, wx + WINW / 2 - 1, wy - 6, 2, hh + 6, STONE_D);
      P(g, wx, wy + 8, WINW, 1, STONE_D);
      // Clé de voûte au sommet de l'arc — c'est elle qui fait « bâtiment public ».
      P(g, wx + WINW / 2 - 2, wy - WINW / 2 - 4, 4, 6, STONE_L);
      P(g, wx + WINW / 2 - 2, wy - WINW / 2 - 4, 4, 1, STONE);
    }
    /* Corniche à denticules sous l'avant-toit. Deux rangées de pierre et une
       dent tous les 4 px : à cette taille, c'est le détail qui distingue une
       façade publique d'un pignon de grange. */
    P(g, BD0 - 2, 40, BD1 - BD0 + 4, 4, STONE);
    P(g, BD0 - 2, 40, BD1 - BD0 + 4, 1, STONE_L);
    for (let x = BD0; x < BD1; x += 4) P(g, x, 44, 2, 2, STONE_D);

    /* ── 3. LE TOIT DU CORPS DE LOGIS, à quatre pans, faîte SUR L'AXE. ── */
    const RX0 = AX_BODY - 56, RX1 = AX_BODY + 56, RTOP = 20, REAVE = 42;
    g.fillStyle = ROOF;
    g.beginPath(); g.moveTo(RX0, REAVE); g.lineTo(AX_BODY - 14, RTOP); g.lineTo(AX_BODY + 14, RTOP); g.lineTo(RX1, REAVE); g.closePath(); g.fill();
    slates(RX0, RTOP, RX1, REAVE, 42);
    P(g, AX_BODY - 14, RTOP, 28, 2, ROOF_L);                 // le faîtage éclairé
    P(g, RX0, REAVE - 2, RX1 - RX0, 3, ROOF_D);              // l'égout, à l'ombre
    P(g, RX0, REAVE + 1, RX1 - RX0, 1, "#2a3548");
    /* Cheminée, franchement décalée : elle appuie l'asymétrie du bâtiment.
       ⚠️ ELLE DESCEND JUSQU'À LA PENTE, pas jusqu'à un nombre rond : une souche
       qui s'arrête en l'air flotte au-dessus du toit, et c'est ce qu'on voit
       en premier sur une silhouette. Le pied se DÉDUIT donc de la pente. */
    { const CHX = AX_BODY + 28, CHW = 10;
      // y de la pente droite au niveau du bord droit de la souche
      const t = (CHX + CHW - (AX_BODY + 14)) / (RX1 - (AX_BODY + 14));
      const foot = Math.round(RTOP + t * (REAVE - RTOP)) + 1;
      P(g, CHX, RTOP - 12, CHW, foot - (RTOP - 12), BRICK);
      for (let y = RTOP - 10; y < foot; y += 4) P(g, CHX, y, CHW, 1, MORTAR);
      P(g, CHX, RTOP - 12, 2, foot - (RTOP - 12), BRICK_L);
      P(g, CHX - 1, RTOP - 15, CHW + 2, 3, STONE_D); P(g, CHX - 1, RTOP - 15, CHW + 2, 1, STONE); }

    /* ── 4. LE BEFFROI. Il passe DEVANT le corps de logis, donc il porte son
       ombre dessus — deux aplats côte à côte ne font pas deux volumes. ── */
    /* ⚠️ L'OMBRE COMMENCE AU MUR, PAS AU BEFFROI. Peinte depuis TW1, ses
       quatre premiers pixels tombaient dans le VIDE entre les deux masses :
       une bande translucide flottant sur le fond, qu'on ne voit qu'une fois le
       bâtiment posé sur un sol clair. Une ombre se porte sur quelque chose. */
    P(g, BD0, 46, 6, GROUND - 46, SHADE);
    const TTOP = 24;
    brickWall(TW0, TTOP, TW1 - TW0, GROUND - TTOP, 1);
    P(g, TW0, TTOP, 3, GROUND - TTOP, BRICK_L);
    quoins(TW0, TTOP, GROUND, true);
    quoins(TW1 - 1, TTOP, GROUND, false);

    /* La chambre des cloches : deux baies à abat-sons. ⚠️ UN BEFFROI SANS BAIE
       N'EST PAS UN BEFFROI — c'est par là que sort le son, et c'est le seul
       détail qui dit « il y a une cloche dedans » sans dessiner la cloche. */
    for (const bx of [AX_TOWER - 12, AX_TOWER + 3]) {
      P(g, bx - 1, 32, 11, 20, STONE);
      P(g, bx, 34, 9, 17, "#2b2620");
      g.fillStyle = STONE; g.beginPath(); g.arc(bx + 4.5, 34, 5.5, Math.PI, 2 * Math.PI); g.fill();
      g.fillStyle = "#2b2620"; g.beginPath(); g.arc(bx + 4.5, 34, 4.5, Math.PI, 2 * Math.PI); g.fill();
      for (let y = 36; y < 50; y += 3) { P(g, bx, y, 9, 2, "#4a4239"); P(g, bx, y, 9, 1, "#6b6154"); }
      P(g, bx + 4, 32, 1, 19, STONE_D);                       // le meneau
    }
    // Bandeau sous les baies.
    P(g, TW0 - 1, 54, TW1 - TW0 + 2, 3, STONE); P(g, TW0 - 1, 54, TW1 - TW0 + 2, 1, STONE_L);

    /* L'HORLOGE, centrée sur l'axe de la tour. */
    const CY = 74;
    P(g, AX_TOWER - 14, CY - 14, 28, 28, STONE);
    P(g, AX_TOWER - 14, CY - 14, 28, 2, STONE_L);
    P(g, AX_TOWER - 14, CY + 12, 28, 2, STONE_D);
    g.fillStyle = "#2e2a24"; g.beginPath(); g.arc(AX_TOWER, CY, 11, 0, 7); g.fill();
    g.fillStyle = "#f6f2e4"; g.beginPath(); g.arc(AX_TOWER, CY, 9, 0, 7); g.fill();
    g.fillStyle = "#ded7c2"; g.beginPath(); g.arc(AX_TOWER - 1, CY + 1, 9, 0.6, 2.4); g.fill();
    P(g, AX_TOWER - 1, CY - 7, 2, 8, "#2e2a24");              // grande aiguille
    P(g, AX_TOWER, CY - 1, 6, 2, "#2e2a24");                  // petite aiguille
    for (const [hx, hy] of [[0, -8], [0, 7], [-8, -1], [7, -1]]) P(g, AX_TOWER + hx, CY + hy, 1, 1, "#2e2a24");

    /* LE PORCHE — LA SEULE ENTRÉE, et donc celle que le perron doit servir. */
    const DW = 22, DTOP = 104, DX = Math.round(AX_TOWER - DW / 2);
    P(g, DX - 3, DTOP - 12, DW + 6, 4, STONE); P(g, DX - 3, DTOP - 12, DW + 6, 1, STONE_L);
    g.fillStyle = STONE; g.beginPath(); g.arc(AX_TOWER, DTOP, DW / 2 + 3, Math.PI, 2 * Math.PI); g.fill();
    P(g, DX, DTOP, DW, GROUND - DTOP, "#5a3a26");
    g.fillStyle = "#5a3a26"; g.beginPath(); g.arc(AX_TOWER, DTOP, DW / 2, Math.PI, 2 * Math.PI); g.fill();
    P(g, DX, DTOP - 8, 2, GROUND - DTOP + 8, "#4a2e1c");
    P(g, DX + DW - 2, DTOP - 8, 2, GROUND - DTOP + 8, "#4a2e1c");
    P(g, AX_TOWER - 1, DTOP - 10, 2, GROUND - DTOP + 10, "#3c2618");   // le refend des deux battants
    for (const px2 of [DX + 4, DX + DW - 8]) P(g, px2, DTOP + 8, 4, 1, "#c9a24a");  // poignées
    // Deux lanternes de part et d'autre : elles disent « on entre ici ».
    for (const lx of [DX - 8, DX + DW + 5]) {
      P(g, lx, 96, 3, 3, "#3a3a42"); P(g, lx - 1, 99, 5, 7, "#4a4a54");
      P(g, lx, 100, 3, 5, "#ffe9a8"); P(g, lx - 1, 106, 5, 2, "#3a3a42");
    }

    /* ── 5. LE COURONNEMENT DU BEFFROI : corniche, toit en pavillon, drapeau. ── */
    P(g, TW0 - 5, TTOP - 5, TW1 - TW0 + 10, 5, STONE);
    P(g, TW0 - 5, TTOP - 5, TW1 - TW0 + 10, 1, STONE_L);
    for (let x = TW0 - 4; x < TW1 + 4; x += 4) P(g, x, TTOP, 2, 2, STONE_D);
    const PX0 = AX_TOWER - 26, PX1 = AX_TOWER + 26, PTOP = 2;
    g.fillStyle = ROOF;
    g.beginPath(); g.moveTo(PX0, TTOP - 5); g.lineTo(AX_TOWER, PTOP); g.lineTo(PX1, TTOP - 5); g.closePath(); g.fill();
    /* ⚠️ LE VERSANT ÉCLAIRÉ SE PEINT AVANT LES ARDOISES, PAS APRÈS. Peint
       après, il recouvre les écailles d'un aplat clair : la moitié gauche du
       toit redevenait lisse, et on ne le voit pas en relisant le code — les
       deux lignes sont justes, c'est leur ORDRE qui efface le travail. */
    g.fillStyle = ROOF_L;
    g.beginPath(); g.moveTo(PX0, TTOP - 5); g.lineTo(AX_TOWER, PTOP); g.lineTo(AX_TOWER, TTOP - 5); g.closePath(); g.fill();
    slates(PX0, PTOP, PX1, TTOP - 5, 25);
    /* Mât et drapeau. Il flotte vers la droite, du côté du corps de logis :
       c'est ce qui rattache visuellement les deux masses. Le drapeau est une
       FLAMME (triangulaire), pas un rectangle — un rectangle rouge au bout d'un
       mât se lit comme une brique posée sur le toit.
       ⚠️⚠️ ET IL TIENT DANS LE CADRE. Mon premier jet plantait le mât NEUF
       pixels au-dessus du faîte, c'est-à-dire à y = −7 : le canevas a découpé
       tout le drapeau en silence, et il ne restait qu'un moignon de mât gris
       (§4 de CLAUDE.md, le haut-de-forme décapité du 427 — le même piège, sur
       le même genre d'accessoire). Le faîte est à PTOP = 2 : il reste DEUX
       rangées au-dessus, et rien de plus. La flamme part donc du faîte lui-même
       et se déploie SUR LE FLANC du toit, ce qui est de toute façon ce qu'on
       voit d'un drapeau au vent. */
    P(g, AX_TOWER, PTOP - 2, 1, 8, "#8a8a94");
    P(g, AX_TOWER - 1, PTOP - 2, 3, 1, "#d8b45a");
    for (let k = 0; k < 9; k++) P(g, AX_TOWER + 1 + k, PTOP - 1 + ((k / 3) | 0), 1, 5 - ((k / 3) | 0), "#c8433a");
    for (let k = 0; k < 9; k++) P(g, AX_TOWER + 1 + k, PTOP - 1 + ((k / 3) | 0), 1, 2, "#e0685c");

    /* ── 6. LE PERRON, CENTRÉ SUR LA PORTE. C'est le défaut n°1 du 433 : il
       était centré sur le corps de logis, donc devant un mur plein. ── */
    /* ⚠️ ELLES DESCENDENT DEPUIS LE SEUIL, DONC DANS LE SOUBASSEMENT. Posées
       au-dessus de GROUND, elles étaient peintes SUR LE MUR : un bandeau clair
       à hauteur de genou, pas un escalier. Le seuil de la porte est en
       GROUND — c'est de là que part la première marche. */
    for (let s = 0; s < 3; s++) {
      const w2 = DW + 8 + s * 10;
      P(g, Math.round(AX_TOWER - w2 / 2), GROUND + 1 + s * 3, w2, 3, s % 2 ? STONE_D : STONE);
      P(g, Math.round(AX_TOWER - w2 / 2), GROUND + 1 + s * 3, w2, 1, STONE_L);
    }
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 426 — LE MOBILIER DE VILLE AJOUTÉ AVEC L'AGRANDISSEMENT.
     ──────────────────────────────────────────────────────────────────────────
     Même contrat que celui du 425 juste en dessous : canevas ancré par son bord
     BAS, plus haut que sa case, dessiné en pixels pleins.
     ⚠️ LES ÉTALS SONT QUATRE, ET C'EST LE MINIMUM QUI TIENNE. Une foire dont
     tous les étals ont la même bâche se lit comme un parking à barnums ; le
     choix se fait par HACHAGE DE LA POSITION au rendu (jamais un tirage
     aléatoire, qui ferait scintiller la foire d'une image à l'autre).
     ══════════════════════════════════════════════════════════════════════════ */
  /* ⚠️⚠️ ZIP 429 — L'ÉTAL A ÉTÉ AGRANDI DE MOITIÉ, ET C'ÉTAIT LE PIRE ÉCART DE
     LA VILLE. Il faisait 30 px peints pour un personnage de 23 : **1,3 fois sa
     taille**, alors qu'un étal de marché en fait 2,1 (on passe SOUS la bâche
     sans se baisser, c'est même à ça qu'il sert). Concrètement, les dix étals
     du champ de foire arrivaient à l'épaule d'un marchand — la foire ressemblait
     à une rangée de tables d'enfants, et personne ne l'avait vu parce qu'on ne
     les avait jamais regardés à côté de quelqu'un.
     ⚠️ ON AGRANDIT LA BÂCHE ET LES MONTANTS, PAS LE PLATEAU. Un plateau à
     hauteur de poitrine serait un comptoir de bar ; ce qui manquait, c'est la
     HAUTEUR LIBRE sous la toile. Le plateau reste à hauteur de hanche, exactement
     là où l'on pose la main.
     ⚠️ Et la largeur suit (32 → 44) : une bâche haute et étroite fait une
     guérite. Les proportions d'un étal sont plus larges que hautes. */
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 431 — LES ÉTALS DEVIENNENT SIX MÉTIERS, PAS QUATRE COULEURS.
     ──────────────────────────────────────────────────────────────────────────
     Demande de Guillaume : « embellis le marché, vraiment plus mignon et
     détaillé […] priorise le rendu final élégant et soigné ».

     ⚠️⚠️ CE QUI MANQUAIT N'ÉTAIT PAS DU DÉTAIL, C'ÉTAIT DU SENS. L'étal du 429
     était correct — bonnes proportions, bâche festonnée, quatre cageots — et
     pourtant la foire restait un alignement de barnums, parce que les dix étals
     vendaient LA MÊME CHOSE dans quatre couleurs. Ajouter des pixels à ce
     dessin-là n'aurait rien changé : on aurait eu dix barnums plus fins.
     Un marché se lit parce qu'on RECONNAÎT les commerces en passant devant —
     le poissonnier à ses poissons pendus, le boulanger à ses baguettes debout,
     la fleuriste à ses seaux. C'est le même raisonnement que les trois
     bâtiments civiques du 425 (« la teinte suffit à les nommer »), appliqué au
     mobilier : la silhouette d'abord, la couleur ensuite.

     ⚠️ LES SIX MÉTIERS SONT CEUX QUE LE JEU PRODUIT DÉJÀ — légumes, poisson,
     pain, fleurs, fromage, poterie. Un étal de marchandise qu'on ne peut ni
     récolter ni fabriquer serait un décor qui promet ce que le jeu ne tient
     pas, et le 429 s'est fait avoir exactement comme ça avec les lampadaires
     qui ne s'allumaient jamais.

     ⚠️ TROIS ÉTAGES DE LECTURE, ET ILS SE LISENT À DES DISTANCES DIFFÉRENTES :
       1. la BÂCHE (visible de l'autre bout de la place) donne la couleur ;
       2. les PENDUS sous la barre (visibles à trois cases) donnent le métier ;
       3. la MARCHANDISE sur le plateau (visible quand on s'arrête) donne le
          détail, et c'est elle qui récompense de s'être arrêté.

     ⚠️ ÉCHELLE : 48 px peints pour un personnage de 23, soit ×2,09 — la cible
     de `tools/render-echelle.mjs` (×2,10, « on passe dessous sans se baisser »).
     Le 429 était à ×1,91, un peu court. La largeur passe de 44 à 52 : une bâche
     haute et étroite fait une guérite, et il fallait de la place pour poser
     autre chose que quatre cageots identiques.
     ⚠️ ET RIEN N'EST ÉCRIT EN TEXTE ICI. `ctx.fillText` n'est pas rastérisable
     hors navigateur (§4 de CLAUDE.md) : une enseigne cuite dans le sprite ferait
     planter les bancs de rendu, c'est-à-dire qu'on perdrait le seul moyen de
     REGARDER ce dessin. L'ardoise du marchand porte donc des gribouillis de
     craie, ce qui est de toute façon ce qu'on lit à cette taille.
     ══════════════════════════════════════════════════════════════════════════ */
  /* Les six métiers. ⚠️ LA TABLE EST DEHORS et nommée : le générateur choisit
     l'indice (voir le champ de foire dans fermeEngine), le rendu ne devine
     rien. Règle du 426 — la bâche vient du générateur, pas d'un hachage. */
  const STALL_TRADES = C.TOWN_STALL_TRADES;
  function townStallSprite(variant) {
    const W = 52, H = 50;
    const [c, g] = cv(W, H);
    const tr = STALL_TRADES[((variant | 0) % STALL_TRADES.length + STALL_TRADES.length) % STALL_TRADES.length];
    const AW = tr.aw, AW_L = tr.awL;
    const W1 = "#8a6038", W2 = "#a8794a", W3 = "#6a4726", W4 = "#523618";
    const CREAM = "#f2e6d2";
    const TOP = H - 14;                 // le plateau : hauteur de hanche (11 px de sol)

    /* ---- 1. LES MONTANTS ET LA BARRE DE FAÎTAGE. Ils sont dessinés AVANT la
       bâche : c'est ce qui permet à la toile de les recouvrir en haut, donc de
       passer devant, donc d'avoir une épaisseur. */
    P(g, 4, 9, 3, TOP - 8, W3); P(g, 4, 9, 1, TOP - 8, W2);
    P(g, W - 7, 9, 3, TOP - 8, W3); P(g, W - 7, 9, 1, TOP - 8, W2);
    P(g, 3, 12, W - 6, 2, W4);                              // la barre où l'on pend la marchandise

    /* ---- 2. LA BÂCHE. Deux pentes très courtes plutôt qu'un bandeau plat : le
       faîte au milieu et les deux versants sont ce qui distingue une TOILE
       TENDUE d'un auvent de magasin. */
    const bays = 9, bw = (W - 2) / bays;
    for (let i = 0; i < bays; i++) {
      const bx = 1 + i * bw, col = i % 2 ? AW : AW_L;
      P(g, bx, 3, bw + 1, 8, col);
      P(g, bx, 3, bw + 1, 1, i % 2 ? AW_L : CREAM);         // le faîte prend la lumière
      P(g, bx, 10, bw + 1, 1, "rgba(30,24,20,0.22)");       // l'ombre du débord
    }
    P(g, 0, 2, W, 2, "#f7ecd8");                            // la lisse de faîtage, crème sur toute la largeur
    P(g, 0, 4, W, 1, "rgba(255,255,255,0.20)");
    // Le lambrequin festonné. Une dent sur deux est claire : c'est ce qui rend
    // la toile RAYÉE à distance, là où des dents unies feraient une frange.
    for (let i = 0; i < bays; i++) {
      g.fillStyle = i % 2 ? AW : AW_L;
      g.beginPath(); g.moveTo(1 + i * bw, 11); g.lineTo(1 + (i + 1) * bw, 11); g.lineTo(1 + (i + 0.5) * bw, 16); g.fill();
      P(g, (1 + (i + 0.5) * bw) | 0, 15, 1, 1, CREAM);      // le pompon de la pointe
    }

    /* ---- 3. LE PLATEAU ET SA NAPPE. La nappe est à carreaux, et c'est elle
       qui fait « marché » plutôt que « comptoir » : une jupe de bois brut se
       lit comme un meuble, un tissu se lit comme un étalage installé le matin
       et remballé le soir. */
    P(g, 2, TOP, W - 4, 3, W3);
    P(g, 2, TOP, W - 4, 1, "#c8975f");                      // nez de plateau éclairé
    P(g, 2, TOP + 3, W - 4, 1, "rgba(30,20,10,0.30)");
    const CL = AW, CL_L = AW_L, CL_W = "#f6ecda";
    for (let y = TOP + 4; y < H - 2; y += 3) {
      for (let x = 3; x < W - 3; x += 4) {
        const k = (((x / 4) | 0) + ((y / 3) | 0)) % 2;
        P(g, x, y, 4, 3, k ? CL_W : CL);
      }
    }
    P(g, 3, TOP + 4, W - 6, 1, "rgba(255,255,255,0.28)");   // pli de lumière sous le plateau
    // L'ourlet dentelé de la nappe : quatre pointes, comme le lambrequin en
    // plus petit — un rappel de forme entre le haut et le bas de l'étal.
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? CL_L : CL;
      const hx = 3 + i * ((W - 6) / 6);
      g.beginPath(); g.moveTo(hx, H - 3); g.lineTo(hx + (W - 6) / 6, H - 3); g.lineTo(hx + (W - 6) / 12, H - 1); g.fill();
    }
    // Les pieds, visibles de part et d'autre de la nappe : sans eux la table
    // flotte au-dessus du sol.
    P(g, 4, TOP + 3, 2, H - TOP - 4, W4); P(g, W - 6, TOP + 3, 2, H - TOP - 4, W4);

    /* ---- 4. CE QU'ON PEND À LA BARRE. C'est l'étage de lecture MOYENNE : à
       trois cases, on ne distingue plus ce qui est sur le plateau, mais une
       silhouette suspendue sur le fond clair de la toile, oui. */
    const hangCord = (x, len) => P(g, x, 14, 1, len, "#6b5a3c");
    if (tr.key === "veg") {
      // Deux tresses d'ail et un chapelet d'oignons.
      for (const hx of [10, 41]) {
        hangCord(hx, 4);
        for (let k = 0; k < 3; k++) { P(g, hx - 2, 17 + k * 3, 5, 3, "#efe6cf"); P(g, hx - 2, 17 + k * 3, 5, 1, "#fbf5e6"); }
        P(g, hx - 1, 26, 3, 1, "#c9bda0");
      }
      hangCord(26, 3);
      for (let k = 0; k < 3; k++) { P(g, 24, 16 + k * 3, 5, 3, "#b8763a"); P(g, 24, 16 + k * 3, 2, 3, "#d6924f"); }
    } else if (tr.key === "fish") {
      // Trois poissons pendus par la queue, tête en bas — la silhouette la plus
      // reconnaissable du marché.
      for (const [hx, col, lig] of [[12, "#8fa8bc", "#c2d4e2"], [26, "#7e9bb2", "#b4c9da"], [40, "#8fa8bc", "#c2d4e2"]]) {
        hangCord(hx, 3);
        P(g, hx - 3, 17, 7, 9, col); P(g, hx - 3, 17, 7, 3, lig);
        P(g, hx - 2, 26, 5, 2, col);
        g.fillStyle = col; g.beginPath(); g.moveTo(hx - 3, 28); g.lineTo(hx + 4, 28); g.lineTo(hx + 0.5, 32); g.fill();
        P(g, hx - 1, 20, 1, 1, "#2e3238");                  // l'œil
      }
    } else if (tr.key === "bread") {
      // Une couronne et deux tresses. Le trou de la couronne est ce qui la
      // distingue d'une miche à cette taille.
      hangCord(26, 3);
      g.fillStyle = "#c9924e"; g.beginPath(); g.arc(26, 23, 7, 0, 7); g.fill();
      g.fillStyle = "#e0ae68"; g.beginPath(); g.arc(26, 21, 6, Math.PI, 2 * Math.PI); g.fill();
      g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.arc(26, 23, 3, 0, 7); g.fill();
      g.globalCompositeOperation = "source-over";
      for (const hx of [11, 41]) {
        hangCord(hx, 3);
        for (let k = 0; k < 4; k++) { P(g, hx - 3, 17 + k * 3, 6, 3, k % 2 ? "#c08a48" : "#dda861"); }
      }
    } else if (tr.key === "flower") {
      // Bouquets séchés, la tête en bas : c'est comme ça qu'on les sèche, et ça
      // donne une silhouette en cône que rien d'autre du marché n'a.
      for (const [hx, col] of [[11, "#b06ad0"], [26, "#e0a04a"], [41, "#d05a7a"]]) {
        hangCord(hx, 4);
        P(g, hx - 1, 18, 3, 5, "#6f8a4a");
        g.fillStyle = col; g.beginPath(); g.moveTo(hx - 5, 30); g.lineTo(hx + 5, 30); g.lineTo(hx, 21); g.fill();
        P(g, hx - 3, 27, 2, 2, "#ffe8f2"); P(g, hx + 1, 25, 2, 2, "#ffe8f2");
      }
    } else if (tr.key === "cheese") {
      /* ⚠️ PREMIER JET : UNE BALANCE À DEUX PLATEAUX, ET ELLE A ÉTÉ JETÉE APRÈS
         L'AVOIR REGARDÉE au banc (tools/render-foire.mjs). L'idée était juste —
         « on pèse ici » dit le métier mieux qu'un fromage de plus — mais à
         cette taille son fléau de vingt pixels et ses deux plateaux formaient un
         RECTANGLE GRIS au milieu de la bâche jaune : ça se lisait comme une
         fenêtre, pas comme un instrument. Trois meules pendues dans leur filet
         se reconnaissent instantanément, et c'est tout ce qu'on demande à
         l'étage moyen de lecture. La leçon est celle du 429 : un dessin se juge
         en le regardant, pas en le décrivant. */
      /* ⚠️⚠️ DEUX MEULES, PAS TROIS, ET UNE CROÛTE SOMBRE — le deuxième jet
         était encore illisible au banc. Trois disques jaunes de rayons 5 à 7
         se touchaient et fusionnaient en une seule tache ; et surtout, du jaune
         clair sur une BÂCHE JAUNE ne se détache pas. C'est la leçon du §8
         appliquée au petit : une couleur ne se juge pas seule, elle se juge
         contre son fond. La croûte brune règle les deux d'un coup — elle sépare
         du fond ET donne aux meules leur silhouette de meule. */
      for (const [hx, rr] of [[13, 6], [39, 5]]) {
        hangCord(hx, 3);
        g.fillStyle = "#8a5f22"; g.beginPath(); g.arc(hx, 17 + rr, rr, 0, 7); g.fill();       // la croûte
        g.fillStyle = "#e8c463"; g.beginPath(); g.arc(hx, 17 + rr, rr - 1.5, 0, 7); g.fill(); // la pâte
        g.fillStyle = "#f6dd94"; g.beginPath(); g.arc(hx - 1, 16 + rr, rr - 3, 0, 7); g.fill();
        // Le filet : deux croisillons suffisent à dire « suspendu », et sans eux
        // la meule a l'air de flotter.
        for (const s of [-1, 1]) P(g, hx + s * ((rr / 2) | 0), 17 + rr - rr, 1, rr * 2, "rgba(60,44,18,0.45)");
      }
    } else {
      // Le potier pend ses jarres à la barre : trois profils différents, parce
      // qu'un potier qui ferait trois fois le même pot ne serait pas un potier.
      for (const [hx, wd, ht, col, lig] of [[12, 8, 9, "#a85e42", "#c87c5c"], [26, 6, 11, "#8a6a9a", "#a888b6"], [40, 9, 7, "#5e8a7a", "#7cae9c"]]) {
        hangCord(hx, 3);
        P(g, hx - (wd >> 1), 17, wd, ht, col);
        P(g, hx - (wd >> 1), 17, 2, ht, lig);
        P(g, hx - (wd >> 1) - 1, 17, wd + 2, 2, lig);       // la lèvre débordante
        P(g, hx - (wd >> 1), 17 + ht - 1, wd, 1, "rgba(30,20,16,0.35)");
      }
    }

    /* ---- 5. LA MARCHANDISE SUR LE PLATEAU. Étage de lecture PROCHE : c'est ce
       qu'on voit en s'arrêtant, et c'est là qu'on met les couleurs vives. Tout
       est posé SUR le plateau (base à TOP), jamais flottant. */
    const crate = (x, w2, h2) => {
      P(g, x, TOP - h2, w2, h2, "#8a6a42");
      P(g, x, TOP - h2, w2, 1, "#ab8a5e");
      P(g, x, TOP - 1, w2, 1, "#6a4e2e");
      for (let k = 2; k < w2 - 1; k += 3) P(g, x + k, TOP - h2 + 1, 1, h2 - 2, "#77592f");
    };
    if (tr.key === "veg") {
      crate(4, 13, 5); crate(19, 13, 5); crate(34, 13, 5);
      // Carottes en bottes, choux, tomates : trois formes, trois couleurs.
      for (let k = 0; k < 3; k++) { P(g, 6 + k * 4, TOP - 9, 2, 5, "#e08234"); P(g, 5 + k * 4, TOP - 11, 4, 2, "#4f9a41"); }
      for (let k = 0; k < 2; k++) { g.fillStyle = "#77b84e"; g.beginPath(); g.arc(23 + k * 6, TOP - 8, 3.5, 0, 7); g.fill(); P(g, 22 + k * 6, TOP - 10, 2, 2, "#9ad46e"); }
      for (let k = 0; k < 3; k++) { g.fillStyle = "#cf4436"; g.beginPath(); g.arc(37 + k * 4, TOP - 8, 2.2, 0, 7); g.fill(); P(g, 36 + k * 4, TOP - 10, 2, 1, "#3f8a36"); }
    } else if (tr.key === "fish") {
      // Le lit de glace : un bac gris pâle, et les poissons couchés dessus.
      P(g, 4, TOP - 6, 44, 6, "#9fb6c6"); P(g, 4, TOP - 6, 44, 2, "#cfe0ea");
      for (let k = 0; k < 6; k++) P(g, 6 + k * 7, TOP - 5, 3, 2, "#eaf4fa");
      for (let k = 0; k < 4; k++) {
        const fx = 7 + k * 11;
        P(g, fx, TOP - 10, 8, 4, k % 2 ? "#7e9bb2" : "#93aec2");
        P(g, fx, TOP - 10, 8, 1, "#c6d8e6");
        g.fillStyle = k % 2 ? "#7e9bb2" : "#93aec2"; g.beginPath(); g.moveTo(fx + 8, TOP - 10); g.lineTo(fx + 11, TOP - 12); g.lineTo(fx + 11, TOP - 5); g.fill();
        P(g, fx + 2, TOP - 9, 1, 1, "#2e3238");
      }
      P(g, 40, TOP - 12, 7, 4, "#cf5a44"); P(g, 39, TOP - 13, 2, 2, "#cf5a44"); P(g, 46, TOP - 13, 2, 2, "#cf5a44"); // un crabe
    } else if (tr.key === "bread") {
      // Un panier de baguettes DEBOUT (la seule verticale du marché) et trois
      // miches rondes farinées.
      P(g, 5, TOP - 7, 12, 7, "#a8794a"); P(g, 5, TOP - 7, 12, 1, "#c49a66");
      for (let k = 0; k < 4; k++) { P(g, 6 + k * 3, TOP - 18, 2, 12, k % 2 ? "#c9924e" : "#dda861"); P(g, 6 + k * 3, TOP - 18, 2, 2, "#e8bd7e"); }
      for (let k = 0; k < 3; k++) {
        g.fillStyle = "#c9924e"; g.beginPath(); g.ellipse(24 + k * 9, TOP - 4, 4.5, 3.5, 0, 0, 7); g.fill();
        g.fillStyle = "#e2ae6a"; g.beginPath(); g.ellipse(24 + k * 9, TOP - 5, 4, 2.5, 0, 0, 7); g.fill();
        P(g, 22 + k * 9, TOP - 6, 5, 1, "#f6e2c0");         // le coup de lame fariné
      }
    } else if (tr.key === "flower") {
      // Quatre seaux de zinc, chacun d'une couleur. Les fleurs débordent du
      // cadre du plateau vers le haut : c'est ce débordement qui fait « bouquet ».
      /* ⚠️ LE BLANC A UNE OMBRE, sinon il fait une tache. Un pétale « blanc pur
         sur blanc pur » n'a aucun contour à cette taille : au banc, le quatrième
         seau devenait un pâté informe pendant que les trois autres se lisaient. */
      const cols = [["#d0455e", "#f07d92"], ["#e0a832", "#f6cd6a"], ["#8a5cc0", "#b78ae0"], ["#cfd0dc", "#ffffff"]];
      for (let k = 0; k < 4; k++) {
        const bx = 5 + k * 11;
        P(g, bx, TOP - 7, 9, 7, "#9aa2ac"); P(g, bx, TOP - 7, 9, 2, "#c2c8d0"); P(g, bx, TOP - 1, 9, 1, "#7a828c");
        for (let f = 0; f < 4; f++) {
          const fx = bx + 1 + (f % 3) * 3, fy = TOP - 12 - (f % 2) * 3;
          P(g, fx, fy + 2, 1, 4, "#4f8a3e");
          P(g, fx - 1, fy, 3, 3, cols[k][0]); P(g, fx, fy, 1, 1, cols[k][1]);
        }
      }
    } else if (tr.key === "cheese") {
      // Deux meules empilées, coupées, plus des portions alignées. La TRANCHE
      // (le triangle plus clair) est ce qui fait lire « fromage » et pas
      // « tonneau ».
      /* Même remède qu'aux meules pendues : une CROÛTE brune autour de tout ce
         qui est jaune, sans quoi la marchandise se noie dans la bâche. */
      for (const [cx2, cy2, rr] of [[14, TOP - 5, 8], [14, TOP - 12, 8]]) {
        g.fillStyle = "#8a5f22"; g.beginPath(); g.ellipse(cx2, cy2, rr, rr * 0.45, 0, 0, 7); g.fill();
        P(g, cx2 - rr, cy2 - 4, rr * 2, 4, "#8a5f22");
        P(g, cx2 - rr + 1, cy2 - 3, rr * 2 - 2, 3, "#e8c463");
        P(g, cx2 - rr + 1, cy2 - 4, rr * 2 - 2, 1, "#f6dd94");
      }
      g.fillStyle = "#f3e0a4"; g.beginPath(); g.moveTo(14, TOP - 16); g.lineTo(22, TOP - 12); g.lineTo(14, TOP - 12); g.fill();
      for (let k = 0; k < 3; k++) {
        const wx = 28 + k * 7;
        g.fillStyle = "#8a5f22"; g.beginPath(); g.moveTo(wx - 1, TOP - 1); g.lineTo(wx + 7, TOP - 1); g.lineTo(wx + 3, TOP - 9); g.fill();
        g.fillStyle = "#f3e0a4"; g.beginPath(); g.moveTo(wx + 1, TOP - 2); g.lineTo(wx + 5, TOP - 2); g.lineTo(wx + 3, TOP - 7); g.fill();
        P(g, wx + 2, TOP - 4, 1, 1, "#c9a13a"); P(g, wx + 3, TOP - 6, 1, 1, "#c9a13a");   // les yeux du fromage
      }
    } else {
      // Poterie : jarres, bols empilés, une amphore. Trois hauteurs, sinon la
      // rangée fait une palissade.
      for (const [px2, wd, ht, col, lig] of [[5, 10, 12, "#a85e42", "#c87c5c"], [18, 8, 8, "#8a6a9a", "#a888b6"], [29, 12, 6, "#5e8a7a", "#7cae9c"]]) {
        P(g, px2, TOP - ht, wd, ht, col);
        P(g, px2, TOP - ht, 3, ht, lig);
        P(g, px2 - 1, TOP - ht, wd + 2, 2, lig);
        P(g, px2, TOP - 1, wd, 1, "rgba(30,20,16,0.35)");
      }
      for (let k = 0; k < 3; k++) { P(g, 42, TOP - 3 - k * 3, 8, 3, k % 2 ? "#cfa88a" : "#e0bfa4"); P(g, 42, TOP - 3 - k * 3, 8, 1, "#f0d8c2"); }
    }

    /* ---- 6. L'ARDOISE DU MARCHAND, posée contre le pied gauche. ⚠️ LES PRIX
       SONT DES GRIBOUILLIS, PAS DU TEXTE (voir l'en-tête) : à cette taille un
       chiffre écrit ne serait de toute façon qu'une tache, et `fillText` ferait
       planter les bancs de rendu. */
    P(g, 1, H - 13, 11, 12, "#4a3a2e");
    P(g, 2, H - 12, 9, 10, "#2e3a34");
    P(g, 1, H - 13, 11, 1, "#6a5442");
    for (let k = 0; k < 3; k++) { P(g, 3, H - 10 + k * 3, 5, 1, "rgba(240,240,225,0.75)"); P(g, 9, H - 10 + k * 3, 2, 1, "rgba(240,225,180,0.85)"); }
    return c;
  }
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 431 — L'ARCHE D'ENTRÉE DU CHAMP DE FOIRE.
     ⚠️ ELLE EXISTE POUR UNE RAISON DE LECTURE, PAS DE DÉCORATION : le champ de
     foire est une esplanade dallée de 26 cases au milieu d'une ville qui en a
     d'autres, et rien ne disait où il COMMENÇAIT. Une arche au bout de l'allée
     centrale fait deux choses qu'aucun étal de plus ne ferait : elle cadre la
     perspective (on voit la foire À TRAVERS elle) et elle donne à la place un
     seuil, donc une entrée, donc un dedans.
     ⚠️ SON PANNEAU EST VIDE ICI, ET C'EST VOULU : le nom est écrit VIVANT au
     rendu (drawTownFrame), ce qui le rend bilingue — un sprite cuit ne peut pas
     l'être — et garde ce fichier rastérisable hors navigateur (§4).
     Canevas 96×72, ancré par son bord bas, centré sur DEUX cases. */
  function townMarketArchSprite() {
    const W = 96, H = 72;
    const [c, g] = cv(W, H);
    const W1 = "#8a6038", W2 = "#a8794a", W3 = "#6a4726", W4 = "#523618";
    const CREAM = "#f2e6d2";
    // Les deux poteaux, sur leur dé de pierre. Le dé n'est pas un détail : un
    // poteau de bois planté dans le dallage a l'air tombé là.
    for (const bx of [4, W - 16]) {
      P(g, bx - 2, H - 8, 16, 8, "#b9b6ad"); P(g, bx - 2, H - 8, 16, 2, "#d4d1c6");
      P(g, bx, 14, 12, H - 22, W1);
      P(g, bx, 14, 3, H - 22, W2);                      // arête éclairée
      P(g, bx + 9, 14, 3, H - 22, W3);                  // arête à l'ombre
      for (let y = 20; y < H - 10; y += 7) P(g, bx, y, 12, 1, "rgba(60,40,20,0.25)");  // veinage
      P(g, bx - 2, 10, 16, 5, W2); P(g, bx - 2, 10, 16, 1, "#c8975f");                 // chapiteau
    }
    // La traverse, et le petit fronton de bois au-dessus.
    P(g, 2, 12, W - 4, 8, W1); P(g, 2, 12, W - 4, 2, W2); P(g, 2, 19, W - 4, 1, W4);
    g.fillStyle = W2; g.beginPath(); g.moveTo(6, 12); g.lineTo(W / 2, 1); g.lineTo(W - 6, 12); g.fill();
    g.fillStyle = W1; g.beginPath(); g.moveTo(12, 12); g.lineTo(W / 2, 5); g.lineTo(W - 12, 12); g.fill();
    P(g, W / 2 - 2, 0, 4, 4, "#d8b45a");                // l'épi doré, comme le kiosque et la mairie
    // Le panneau suspendu : deux chaînettes et une planche crème encadrée. Le
    // NOM s'écrit dessus au rendu.
    for (const sx of [W / 2 - 20, W / 2 + 19]) P(g, sx, 20, 1, 4, "#6a6a74");
    P(g, W / 2 - 24, 24, 48, 16, "#5e4326");
    P(g, W / 2 - 22, 26, 44, 12, CREAM);
    P(g, W / 2 - 22, 26, 44, 1, "#fffaf0");
    P(g, W / 2 - 22, 37, 44, 1, "#cdbfa4");
    // Les fanions accrochés aux deux poteaux, qui retombent vers l'extérieur :
    // ils prolongent l'arche dans la rangée d'étals, donc relient les deux.
    const FLAGS = ["#c05442", "#e0c463", "#4a9a58", "#3f79c0", "#c05c96"];
    for (const [x0, dir] of [[16, -1], [W - 16, 1]]) {
      for (let k = 0; k < 3; k++) {
        const fx = x0 + dir * (k * 5 + 2), fy = 22 + k * 3;
        P(g, fx - (dir < 0 ? 5 : 0), fy - 1, 5, 1, "#6b5a3c");
        g.fillStyle = FLAGS[(k + (dir < 0 ? 0 : 2)) % FLAGS.length];
        g.beginPath(); g.moveTo(fx - 2, fy); g.lineTo(fx + 2, fy); g.lineTo(fx, fy + 5); g.fill();
      }
    }
    return c;
  }
  /* La CHARRETTE DE FLEURS. ⚠️ ELLE A DEUX ROUES ET DES BRANCARDS, et c'est ce
     qui la distingue d'une caisse fleurie : une charrette est un objet qui est
     ARRIVÉ le matin et repartira le soir. Un marché, c'est d'abord des gens qui
     ont apporté des choses. Canevas 40×40. */
  function townFlowerCartSprite() {
    const W = 40, H = 40;
    const [c, g] = cv(W, H);
    const W1 = "#9a6a3e", W2 = "#b98a58", W3 = "#6f4a24";
    // Les roues (deux, décalées : celle du fond plus sombre et plus haute).
    for (const [wx, wy, col] of [[9, 30, "#5e3f20"], [29, 32, "#7a5528"]]) {
      g.fillStyle = col; g.beginPath(); g.arc(wx, wy, 7, 0, 7); g.fill();
      g.fillStyle = "#c2a06a"; g.beginPath(); g.arc(wx, wy, 4.5, 0, 7); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(wx, wy, 2, 0, 7); g.fill();
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; P(g, (wx + Math.cos(a) * 3) | 0, (wy + Math.sin(a) * 3) | 0, 1, 1, col); }
    }
    // Le brancard, qui sort vers la droite et repose sur une béquille.
    P(g, 30, 22, 9, 2, W3); P(g, 37, 24, 2, 10, W3);
    // La caisse, en pente vers l'avant.
    P(g, 4, 18, 30, 12, W1);
    P(g, 4, 18, 30, 2, W2);
    P(g, 4, 29, 30, 2, W3);
    for (let x = 7; x < 33; x += 5) P(g, x, 20, 1, 9, "rgba(70,44,20,0.35)");
    P(g, 2, 16, 34, 3, W2); P(g, 2, 16, 34, 1, "#d2a878");     // la lisse supérieure
    // Les fleurs, en trois bancs de couleur qui débordent du bord.
    const BQ = [["#d0455e", "#f07d92"], ["#e0a832", "#f6cd6a"], ["#8a5cc0", "#b78ae0"], ["#f0f0f6", "#ffffff"], ["#d05a9a", "#f08ac0"]];
    for (let k = 0; k < 11; k++) {
      const fx = 4 + k * 3, fy = 8 + ((k * 5) % 7);
      const col = BQ[k % BQ.length];
      P(g, fx + 1, fy + 3, 1, 14 - (fy - 8), "#4f8a3e");
      P(g, fx, fy, 3, 3, col[0]); P(g, fx + 1, fy, 1, 1, col[1]);
      P(g, fx - 1, fy + 1, 1, 1, col[0]);
    }
    // Deux seaux posés au sol contre la roue : la marchandise déborde toujours.
    P(g, 18, 30, 8, 8, "#9aa2ac"); P(g, 18, 30, 8, 2, "#c2c8d0");
    for (let k = 0; k < 3; k++) { P(g, 19 + k * 3, 25, 1, 5, "#4f8a3e"); P(g, 18 + k * 3, 23, 3, 3, BQ[k][0]); }
    return c;
  }
  /* Le TONNEAU de la foire, avec des pommes dessus. Canevas 22×26. ⚠️ Ses
     cercles de fer sont DÉCALÉS vers le haut et le bas, jamais réguliers : un
     tonneau à cercles équidistants se lit comme un tuyau. */
  function townBarrelSprite() {
    const [c, g] = cv(22, 26);
    P(g, 3, 6, 16, 18, "#9a6a3e");
    P(g, 3, 6, 4, 18, "#b98a58");                       // douve éclairée
    P(g, 16, 6, 3, 18, "#7a5228");
    for (const y of [8, 13, 21]) { P(g, 2, y, 18, 2, "#5a5a62"); P(g, 2, y, 18, 1, "#8a8a94"); }
    for (let x = 6; x < 18; x += 4) P(g, x, 10, 1, 10, "rgba(70,44,20,0.30)");
    g.fillStyle = "#c9a06a"; g.beginPath(); g.ellipse(11, 6, 8, 3, 0, 0, 7); g.fill();
    g.fillStyle = "#e0bd8a"; g.beginPath(); g.ellipse(11, 5, 7, 2.2, 0, 0, 7); g.fill();
    for (const [ax, ay] of [[8, 3], [13, 3], [11, 1]]) {
      g.fillStyle = "#cf4436"; g.beginPath(); g.arc(ax, ay + 1, 2.2, 0, 7); g.fill();
      P(g, ax - 1, ay, 1, 1, "#f07a68"); P(g, ax, ay - 2, 1, 2, "#4f7a2e");
    }
    return c;
  }
  /* La PILE DE SACS de grain. Canevas 30×22. Trois sacs, dont un couché : une
     pile de sacs tous debout ressemble à des quilles. */
  function townSackPileSprite() {
    const [c, g] = cv(30, 22);
    const sack = (x, y, w2, h2, col, lig) => {
      g.fillStyle = col; g.beginPath(); g.ellipse(x + w2 / 2, y + h2 / 2, w2 / 2, h2 / 2, 0, 0, 7); g.fill();
      g.fillStyle = lig; g.beginPath(); g.ellipse(x + w2 / 2 - 1, y + h2 / 2 - 1, w2 / 2 - 2, h2 / 2 - 2, 0, Math.PI, 2 * Math.PI); g.fill();
      P(g, x + (w2 >> 1) - 2, y - 1, 4, 3, "#c9bda0");      // le col ficelé
      P(g, x + (w2 >> 1) - 1, y - 2, 2, 2, "#8a7f66");
    };
    sack(1, 8, 13, 13, "#c9b184", "#ded0ab");
    sack(15, 10, 14, 11, "#bda876", "#d4c49c");
    sack(6, 1, 13, 10, "#d2bc90", "#e8dcb8");
    // Une poignée de grains renversés au pied : le détail qui dit que le sac
    // est plein et qu'on y a puisé.
    for (const [gx, gy] of [[3, 20], [5, 21], [24, 20], [26, 21], [14, 21]]) P(g, gx, gy, 1, 1, "#e8dcb8");
    return c;
  }
  /* LE KIOSQUE À MUSIQUE du parc. Trois cases sur trois : c'est le seul décor
     de la ville plus large que haut, et il lui fallait un toit CONIQUE pour ne
     ressembler ni à une maison ni à la fontaine. */
  function townKioskSprite() {
    const [c, g] = cv(48, 64);
    const S = "#d8d2c2", SD = "#b0aa9a", W1 = "#8a6038";
    const ROOF = "#3f6f52", ROOF_L = "#57906a", ROOF_D = "#2c5540";
    P(g, 2, 52, 44, 8, SD); P(g, 2, 52, 44, 2, S);              // soubassement
    P(g, 4, 46, 40, 7, "#c2bcae");                              // plancher
    P(g, 4, 46, 40, 1, "#e6e0d0");
    for (const bx of [6, 20, 34]) { P(g, bx, 26, 3, 21, S); P(g, bx, 26, 1, 21, "#f0eade"); } // colonnettes
    P(g, 5, 36, 38, 2, W1);                                     // garde-corps
    for (let x = 6; x < 43; x += 4) P(g, x, 36, 1, 8, "#6a4726");
    g.fillStyle = ROOF; g.beginPath(); g.moveTo(0, 28); g.lineTo(24, 4); g.lineTo(48, 28); g.fill();
    g.fillStyle = ROOF_L; g.beginPath(); g.moveTo(0, 28); g.lineTo(24, 4); g.lineTo(24, 10); g.fill();
    g.fillStyle = ROOF_D; g.beginPath(); g.moveTo(0, 28); g.lineTo(48, 28); g.lineTo(48, 31); g.lineTo(0, 31); g.fill();
    P(g, 23, 0, 2, 6, "#8a8a94"); P(g, 21, 0, 6, 2, "#d8b45a"); // épi de faîtage
    return c;
  }
  // Une TOMBE. Trois silhouettes possibles auraient été du luxe : c'est
  // l'alignement qui fait le cimetière, pas la variété des pierres.
  function townGraveSprite() {
    const [c, g] = cv(16, 24);
    P(g, 3, 20, 10, 3, "#8f8a80");                              // socle
    P(g, 4, 8, 8, 13, "#c2beb2"); P(g, 4, 8, 3, 13, "#dcd8cc");
    g.fillStyle = "#c2beb2"; g.beginPath(); g.arc(8, 9, 4, Math.PI, 0); g.fill();
    P(g, 6, 12, 4, 1, "#8f8a80"); P(g, 6, 15, 4, 1, "#8f8a80"); // l'inscription, illisible et c'est voulu
    P(g, 2, 21, 12, 2, "rgba(30,46,26,0.35)");                  // l'herbe au pied
    return c;
  }
  // Jardinière fleurie : trois touches de couleur suffisent à faire lire des
  // fleurs à cette taille — un dessin plus fin devient une bouillie.
  function townPlanterSprite() {
    const [c, g] = cv(24, 24);
    P(g, 2, 14, 20, 9, "#a86a44"); P(g, 2, 14, 20, 2, "#c8875c"); P(g, 2, 21, 20, 2, "#7e4a2e");
    P(g, 4, 11, 16, 4, "#2f6b34");
    for (const [fx, fy, col] of [[5, 9, "#e05a6a"], [10, 8, "#f0d05a"], [15, 10, "#c86ae0"], [18, 8, "#e08a4a"]]) {
      P(g, fx, fy, 3, 3, col); P(g, fx + 1, fy + 1, 1, 1, "#fff2d0");
    }
    return c;
  }
  // Panneau de rue : deux flèches croisées. Il n'indique rien de précis, et
  // c'est assumé — son rôle est de marquer le carrefour, pas de guider.
  function townStreetSignSprite() {
    const [c, g] = cv(24, 32);
    P(g, 11, 12, 2, 19, "#4a4a52"); P(g, 11, 12, 1, 19, "#6a6a74");
    P(g, 2, 6, 15, 5, "#e6e0d0"); P(g, 2, 6, 15, 1, "#fbf6ea"); P(g, 2, 10, 15, 1, "#b0aa9a");
    for (let i = 0; i < 4; i++) P(g, 4 + i * 3, 8, 2, 1, "#5a5a64");
    P(g, 8, 13, 14, 5, "#e6e0d0"); P(g, 8, 13, 14, 1, "#fbf6ea"); P(g, 8, 17, 14, 1, "#b0aa9a");
    for (let i = 0; i < 4; i++) P(g, 10 + i * 3, 15, 2, 1, "#5a5a64");
    return c;
  }
  // Statue commémorative : un personnage schématique sur un haut socle. Vue de
  // dessus à 16 px, un visage ne se lit pas — la POSE, si.
  function townStatueSprite() {
    const [c, g] = cv(32, 56);
    const S = "#cfcabc", SL = "#e6e1d2", SD = "#a9a496", BR = "#8a7a4a", BR_L = "#a89858";
    P(g, 4, 46, 24, 9, SD); P(g, 4, 46, 24, 2, S);
    P(g, 8, 30, 16, 17, S); P(g, 8, 30, 3, 17, SL); P(g, 21, 30, 3, 17, SD);
    P(g, 10, 34, 12, 1, "#8f8a7c"); P(g, 11, 37, 10, 1, "#8f8a7c");
    P(g, 13, 12, 6, 19, BR); P(g, 13, 12, 2, 19, BR_L);        // le corps, drapé
    g.fillStyle = BR; g.beginPath(); g.arc(16, 9, 4, 0, 7); g.fill();
    g.fillStyle = BR_L; g.beginPath(); g.arc(15, 8, 2, 0, 7); g.fill();
    P(g, 19, 14, 6, 2, BR); P(g, 24, 6, 2, 10, BR_L);          // le bras tendu, la torche
    P(g, 23, 2, 4, 5, "#e0a83c"); P(g, 24, 0, 2, 3, "#f2d878");
    return c;
  }
  // Caisse d'atelier / de dépôt. Elle sert dehors (artisans, foire) ET dedans
  // (sous-sol du tribunal) : un seul dessin, deux usages, aucune divergence.
  function crateSprite() {
    const [c, g] = cv(16, 18);
    P(g, 1, 4, 14, 13, "#8a6a42"); P(g, 1, 4, 14, 2, "#a88a5e"); P(g, 1, 15, 14, 2, "#6a4e2e");
    P(g, 1, 9, 14, 2, "#6a4e2e"); P(g, 7, 4, 2, 13, "#6a4e2e");
    P(g, 2, 5, 3, 1, "#c2a478");
    return c;
  }
  // Le puits de la foire et des artisans : le puits de la ferme existe déjà
  // (sprites.well) mais il est bâti pour la campagne. Celui-ci est maçonné.
  function townWellSprite() {
    const [c, g] = cv(32, 40);
    const S = "#b0aa9a", SL = "#cfcabc", SD = "#8f8a80", W1 = "#7a5232";
    P(g, 5, 26, 22, 12, S); P(g, 5, 26, 22, 2, SL); P(g, 5, 36, 22, 2, SD);
    for (let y = 28; y < 36; y += 3) for (let x = 6; x < 27; x += 5) P(g, x, y, 4, 2, SD);
    g.fillStyle = "#2b3a44"; g.beginPath(); g.ellipse(16, 27, 9, 3.5, 0, 0, 7); g.fill();
    P(g, 7, 6, 3, 21, W1); P(g, 22, 6, 3, 21, W1);
    g.fillStyle = "#8a3a2c"; g.beginPath(); g.moveTo(3, 8); g.lineTo(16, 0); g.lineTo(29, 8); g.fill();
    g.fillStyle = "#a8503c"; g.beginPath(); g.moveTo(3, 8); g.lineTo(16, 0); g.lineTo(16, 4); g.fill();
    P(g, 9, 12, 14, 2, "#5a4a3a"); P(g, 15, 14, 2, 8, "#5a4a3a");
    P(g, 12, 20, 8, 5, W1); P(g, 12, 20, 8, 1, "#a37448");
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 425 — LE MOBILIER DE LA PLACE ET LES MARCHES.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ CE SONT DES SPRITES DE 32×32 (ou 32×48 pour le lampadaire), ancrés par
     leur bord BAS comme les bâtiments, et non des tuiles de 16 : un banc ou un
     lampadaire dessiné dans sa case déborde forcément sur la case du dessus, et
     c'est exactement ce qui lui donne du volume. C'est déjà le contrat de
     `decor` et des maisons — on ne réinvente rien.
     ══════════════════════════════════════════════════════════════════════════ */
  function plazaLampSprite() {
    const [c, g] = cv(32, 48);
    P(g, 12, 42, 8, 5, "#4a4a52"); P(g, 12, 42, 8, 1, "#6a6a74");   // socle
    P(g, 14, 12, 4, 31, "#3c3c44"); P(g, 14, 12, 1, 31, "#5e5e68"); // fût
    P(g, 10, 20, 12, 2, "#3c3c44");                                  // bague
    P(g, 11, 6, 10, 8, "#2e2e36");                                   // lanterne
    P(g, 12, 7, 8, 6, "#ffe9a8"); P(g, 13, 8, 6, 4, "#fff6d4");      // verre allumé
    g.fillStyle = "#2e2e36"; g.beginPath(); g.moveTo(9, 6); g.lineTo(16, 0); g.lineTo(23, 6); g.fill();
    P(g, 15, 0, 2, 2, "#2e2e36");
    return c;
  }
  /* ⚠️⚠️ ZIP 429 — LE BANC A ÉTÉ REDESSINÉ, ET C'EST UNE QUESTION D'ÉCHELLE,
     PAS DE GOÛT. (retour de Guillaume : « attention à leur format, ils
     paraissent parfois très gros par rapport au joueur »)
     Mesure du sprite du 425 : 22 pixels de hauteur peinte, dossier compris,
     pour un personnage qui en fait 23. **Le dossier arrivait au sommet du crâne
     d'un adulte debout.** Ce n'était pas visible sur la planche de rendu, parce
     qu'on n'y regardait que des meubles entre eux — c'est la leçon du fond de
     `render-tribunal` poussée d'un cran : un meuble ne se juge pas contre
     d'autres meubles, il se juge **contre le personnage qui s'en sert**. C'est
     pour ça que `render-assise.mjs` met debout et assis côte à côte.
     Repère réel : le dossier d'un banc public arrive à mi-cuisse / hanche d'un
     adulte debout, soit environ 55 % de sa hauteur. À 23 px de personnage, ça
     fait **13 px**, et non 22.

     ⚠️ ET IL A ÉTÉ ÉLARGI À 52 px, ce qui est l'autre moitié de la demande
     (« on doit pouvoir s'asseoir à deux, ou trois sur le même banc »). Trois
     personnages de 16 px espacés de 11 px se chevauchent aux épaules — c'est
     exactement ce à quoi ressemblent trois personnes sur un banc. À 32 px la
     troisième place était une superposition, pas une place.
     ⚠️⚠️ ET 52, PAS 40 : à 40, les trois occupants MANGENT LE BANC EN ENTIER
     (ils s'étalent sur 38 px) et la scène se lit « trois personnes debout en
     rang ». Vu au banc de rendu, invisible autrement — la planche ne dessinait
     qu'un occupant jusqu'à ce zip, et un occupant unique au milieu d'un meuble
     ne dit rien de ce à quoi ressemble un meuble PLEIN. Il faut que le banc
     dépasse de part et d'autre : ce sont ces sept pixels d'accoudoir libres qui
     disent « ils sont assis DESSUS ».
     ⚠️ La case BLOQUANTE, elle, n'a pas changé : le banc en occupe toujours
     UNE. Le sprite débordait déjà (32 px sur une case de 16), et toucher au
     générateur pour 40 px, c'est risquer de refermer un passage — le piège du
     verger, §4. Le débord est du décor, pas de la collision. */
  function plazaBenchSprite() {
    const W = 52, H = 20;
    const [c, g] = cv(W, H);
    const W1 = "#8a6038", W2 = "#a8794a", IR = "#3c3c44";
    // Pieds de fonte, écartés des bouts : un pied à l'extrémité exacte donne
    // une table, pas un banc.
    P(g, 5, 14, 3, 6, IR); P(g, W - 8, 14, 3, 6, IR);
    // Assise : deux lattes, pas trois. À cette hauteur la troisième n'était
    // plus qu'une ligne de bruit.
    for (let i = 0; i < 2; i++) P(g, 3, 11 + i * 2, W - 6, 2, i % 2 ? W1 : W2);
    P(g, 3, 11, W - 6, 1, "#c08f5e");                   // nez d'assise éclairé
    // Dossier : deux lattes et un vide entre les deux — c'est ce jour qui fait
    // lire « lattes » plutôt que « planche ».
    P(g, 3, 2, W - 6, 3, W2);
    P(g, 3, 7, W - 6, 3, W1);
    P(g, 3, 2, W - 6, 1, "#c08f5e");
    P(g, 3, 2, 3, 12, IR); P(g, W - 6, 2, 3, 12, IR);   // montants
    return c;
  }
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 427 — LES DEUX COMMERCES DE LA HAUTE-VILLE.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ « CHIC » N'EST PAS UNE COULEUR, C'EST UNE PROPORTION. Le premier réflexe
     pour une boutique de luxe est de tout dorer ; à 16 px par case, ça donne un
     bâtiment jaune. Ce qui lit « chic » vue de dessus tient à trois choses, et
     aucune n'est une teinte : une façade SOMBRE (elle fait ressortir tout ce
     qu'on y pose), une VITRINE qui occupe presque toute la largeur (un commerce
     de luxe montre, il ne stocke pas), et une SYMÉTRIE stricte — les trois
     monuments de la ville sont symétriques, les maisons ne le sont pas ; c'est
     ce contraste qui range un bâtiment du côté « institution ».
     L'or n'arrive qu'en LISERÉS : enseigne, corniche, montants de vitrine.

     ⚠️ ET ELLE PORTE SON NOM EN TOUTES LETTRES. Le 426 a établi la règle avec
     les plaques du tribunal : un bâtiment muet passe pour cassé. Une boutique
     dont on ne sait pas que c'est celle de Carla n'est qu'une maison noire. */
  function townBoutiqueSprite() {
    const W = C.TOWN_BOUTIQUE.w * T, H = C.TOWN_BOUTIQUE.h * T + 48;  // 128 x 128
    const [c, g] = cv(W, H);
    const BASE = H - 4;                       // le bas du mur (4 px de marge, comme l'église)
    const NOIR = "#25222a", NOIR_L = "#37333e", NOIR_D = "#16141a";
    const OR = "#d9b04a", OR_L = "#f2d883", OR_D = "#9c7a26";
    const VITRE = "#2f4a63", VITRE_L = "#79a6c8";
    const ROSE = "#c0455f", ROSE_L = "#dd6d86";
    // Soubassement de pierre noire + deux marches centrées.
    P(g, 2, BASE - 10, W - 4, 10, NOIR_D);
    for (let s = 0; s < 2; s++) P(g, W / 2 - 22 - s * 4, BASE - 4 + s * 2, 44 + s * 8, 2, s % 2 ? NOIR : NOIR_L);
    // Corps : mur sombre, panneaux verticaux (les refends font le « sur mesure »).
    P(g, 6, 40, W - 12, BASE - 46, NOIR);
    for (let x = 14; x < W - 12; x += 20) P(g, x, 40, 1, BASE - 46, NOIR_L);
    P(g, 6, 40, W - 12, 2, NOIR_L);
    // La VITRINE : deux grandes glaces de part et d'autre de la porte, montants
    // dorés. Le reflet est une DIAGONALE claire — c'est ce qui dit « verre »
    // plutôt que « trou bleu ».
    const vy = 66, vh = BASE - 76;
    for (const vx of [12, W / 2 + 8]) {
      P(g, vx - 2, vy - 2, 44, vh + 4, OR_D); P(g, vx - 2, vy - 2, 44, 2, OR);
      P(g, vx, vy, 40, vh, VITRE);
      g.fillStyle = "rgba(210,235,255,0.30)";
      g.beginPath(); g.moveTo(vx + 4, vy + vh); g.lineTo(vx + 20, vy); g.lineTo(vx + 30, vy); g.lineTo(vx + 14, vy + vh); g.fill();
      // Deux mannequins par vitrine : une silhouette et une tache de couleur
      // suffisent, un visage ne se lirait pas à cette taille.
      for (let mI = 0; mI < 2; mI++) {
        const mx = vx + 9 + mI * 18;
        P(g, mx, vy + vh - 22, 6, 14, mI ? ROSE : OR);
        P(g, mx + 1, vy + vh - 8, 4, 8, "#cfc7bb");
        g.fillStyle = "#e8dccb"; g.beginPath(); g.arc(mx + 3, vy + vh - 25, 3, 0, 7); g.fill();
      }
    }
    // La PORTE, au milieu de la façade sud (comme tous les bâtiments de la
    // ville : c'est ce que `nearCivicDoor` suppose, et il n'y a qu'une règle).
    const dw = 20, dx = (W / 2 - dw / 2) | 0, dy = BASE - 34;
    P(g, dx - 3, dy - 3, dw + 6, 37, OR_D); P(g, dx - 3, dy - 3, dw + 6, 2, OR);
    P(g, dx, dy, dw, 34, NOIR_L);
    P(g, dx + 3, dy + 3, dw - 6, 16, VITRE); P(g, dx + 3, dy + 3, dw - 6, 2, VITRE_L);
    P(g, dx + dw - 6, dy + 24, 2, 4, OR_L);                        // poignée
    // MARQUISE festonnée rose au-dessus de la porte : la seule courbe de la
    // façade, et c'est elle qui empêche la symétrie d'être froide.
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? ROSE : ROSE_L; g.beginPath(); g.arc(dx - 4 + 3 + i * 5.5, dy - 6, 3, 0, Math.PI); g.fill(); }
    P(g, dx - 6, dy - 10, dw + 12, 4, ROSE); P(g, dx - 6, dy - 10, dw + 12, 1, ROSE_L);
    /* CORNICHE + ENSEIGNE. ⚠️⚠️ LE NOM N'EST PAS PEINT DANS LE SPRITE, ET C'EST
       UNE RÈGLE DU FICHIER, PAS UNE PRÉFÉRENCE. Premier jet : un `fillText`
       ici même. Deux problèmes, et le second est disqualifiant :
         1. du texte antialiasé au milieu d'un fichier entièrement dessiné en
            pixels pleins — il jure, et il change de forme selon le navigateur ;
         2. `fillText` N'EST PAS RASTÉRISABLE hors navigateur, donc le sprite
            devenait invisible au banc de rendu (tools/render-tribunal.mjs a
            planté net). Un dessin qu'on ne peut plus REGARDER, c'est le §8 en
            entier qui tombe.
       Le bandeau reste donc doré et NU, avec un monogramme en pixels ; le nom
       est écrit VIVANT par le rendu, comme la plaque de chaque maison de la
       ville depuis le 235 (drawTownFrame). Une seule façon d'écrire sur un
       bâtiment de Valley Town, et elle est déjà là. */
    P(g, 2, 34, W - 4, 8, OR); P(g, 2, 34, W - 4, 2, OR_L); P(g, 2, 41, W - 4, 1, OR_D);
    // Monogramme « G » en pixels pleins, centré, encadré de deux fleurons.
    const mgx = (W / 2 - 4) | 0;
    P(g, mgx, 35, 8, 1, NOIR_D); P(g, mgx, 39, 8, 1, NOIR_D);
    P(g, mgx, 35, 1, 5, NOIR_D); P(g, mgx + 7, 37, 1, 3, NOIR_D); P(g, mgx + 4, 37, 4, 1, NOIR_D);
    for (const fx of [mgx - 14, mgx + 14]) { P(g, fx, 37, 6, 1, NOIR_D); P(g, fx + 2, 36, 2, 3, NOIR_D); }
    // TOIT en zinc à faible pente + acrotère : un toit de commerce urbain, pas
    // une charpente de maison — c'est aussi ce qui le distingue des parcelles
    // voisines de la terrasse.
    P(g, 0, 22, W, 14, "#4a4f58"); P(g, 0, 22, W, 3, "#6b717c"); P(g, 0, 34, W, 2, "#33373d");
    P(g, 4, 16, W - 8, 8, "#3b3f47"); P(g, 4, 16, W - 8, 2, "#585d66");
    // Trois lanternes dorées sur l'acrotère, allumées : une devanture de luxe
    // est éclairée, c'est ce qui la fait exister de loin.
    for (let i = 0; i < 3; i++) {
      const lx = 20 + i * ((W - 40) / 2);
      P(g, lx - 2, 8, 5, 9, OR_D); P(g, lx - 1, 10, 3, 5, OR_L);
      g.fillStyle = "rgba(255,225,150,0.30)"; g.beginPath(); g.arc(lx, 12, 7, 0, 7); g.fill();
    }
    // Deux buis en pot encadrant l'entrée, posés SUR le perron.
    for (const tx of [10, W - 18]) {
      P(g, tx, BASE - 16, 8, 6, OR_D); P(g, tx, BASE - 16, 8, 1, OR);
      g.fillStyle = "#2f6b34"; g.beginPath(); g.arc(tx + 4, BASE - 22, 6, 0, 7); g.fill();
      g.fillStyle = "#3f8a44"; g.beginPath(); g.arc(tx + 3, BASE - 24, 4, 0, 7); g.fill();
    }
    return c;
  }
  /* LE SALON DE COIFFURE, « ouverture prochaine ».
     ⚠️ IL EST DÉLIBÉRÉMENT INACHEVÉ, ET ÇA SE VOIT AU PREMIER COUP D'ŒIL. Une
     boutique fermée qui ressemble à une boutique ouverte est un bug pour le
     joueur : il tourne autour, il appuie sur E, il conclut que la porte est
     cassée. Trois signes, donc : la BANDEROLE en travers de la façade, les
     vitrines encore blanchies au blanc d'Espagne (pas de reflet, pas de
     mannequin — rien à voir dedans), et un ÉCHAFAUDAGE d'un côté.
     ⚠️ Mais l'enseigne, elle, est déjà posée et le mât de barbier tourne : on
     annonce « bientôt », pas « peut-être ». */
  function townSalonSprite() {
    const W = C.TOWN_SALON.w * T, H = C.TOWN_SALON.h * T + 44;   // 112 x 108
    const [c, g] = cv(W, H);
    const BASE = H - 4;
    const MUR = "#e8dfe6", MUR_D = "#c6bcc6", MUR_L = "#f6f0f4";
    const MENUIS = "#5a4a5e", TURQ = "#4fb3a8", TURQ_L = "#78d4c9";
    const BLANCHI = "#dfe6e4";
    /* ⚠️⚠️ TOUT EST EN COORDONNÉES ABSOLUES, SANS `translate` NI `rotate`, ET
       C'EST UNE LEÇON DE CE ZIP. Premier jet : la banderole était dessinée dans
       un `save()/translate(W/2,52)/rotate(-0.07)`. En jeu elle tombait au bon
       endroit ; au banc de rendu, dont le faux canvas ignore les
       transformations, elle atterrissait EN L'AIR au-dessus du toit — et j'ai
       d'abord cru à un défaut de dessin. Un sprite qu'on ne peut pas rastériser
       fidèlement est un sprite qu'on ne peut plus REGARDER (§8), donc qu'on ne
       peut plus corriger. L'inclinaison de la banderole est obtenue en
       décalant ses rangées d'un pixel, ce qui est de toute façon la bonne
       façon de pencher quelque chose en pixel art. */

    // ---- Soubassement + corps.
    P(g, 2, BASE - 8, W - 4, 8, MUR_D); P(g, 2, BASE - 8, W - 4, 1, "#d8ccd6");
    P(g, 6, 34, W - 12, BASE - 42, MUR);
    P(g, 6, 34, W - 12, 2, MUR_L);
    P(g, 6, 34, 2, BASE - 42, MUR_L); P(g, W - 8, 34, 2, BASE - 42, MUR_D);

    /* ---- LES DEUX VITRINES, BLANCHIES AU BLANC D'ESPAGNE. C'est le signe le
       plus fort de « pas encore ouvert » : une vitrine qu'on ne peut pas voir à
       travers. Elles s'arrêtent AU-DESSUS du soubassement et LAISSENT LA PLACE À
       LA PORTE — le premier jet les faisait courir sur toute la largeur, et la
       porte se dessinait par-dessus : on lisait une devanture confuse, sans
       entrée identifiable. */
    /* ⚠️ TROIS RÉGLAGES SORTIS DU BANC DE RENDU, ET AUCUN NE SE VOYAIT AU CODE :
       les vitrines passent de 30 à 26 px de large et descendent à y=58, sinon
       (1) la banderole leur mangeait le haut et (2) le mât de barbier chevauchait
       le montant de celle de droite — il avait l'air d'être RANGÉ DEDANS. */
    const vy = 58, vh = BASE - 74;
    for (const vx of [10, W - 36]) {
      P(g, vx - 2, vy - 2, 30, vh + 4, MENUIS);
      P(g, vx, vy, 26, vh, BLANCHI);
      P(g, vx, vy, 26, 1, "#f2f8f6");
      // Les traits de badigeon : des croix larges, tracées en pixels pleins
      // (un `stroke` fin disparaîtrait au vrai zoom du jeu).
      for (let k = 0; k < 3; k++) {
        for (let t2 = 0; t2 < 22; t2++) {
          P(g, vx + 2 + t2, vy + 4 + k * 7 + Math.floor(t2 / 5), 2, 2, "rgba(255,255,255,0.9)");
          P(g, vx + 2 + t2, vy + 9 + k * 7 - Math.floor(t2 / 5), 2, 2, "rgba(255,255,255,0.75)");
        }
      }
    }

    // ---- LA PORTE, au MILIEU de la façade sud (règle commune à tous les
    // bâtiments de la ville : c'est ce que suppose nearCivicDoor), condamnée
    // par une planche clouée en travers.
    const dw = 18, dx = (W / 2 - dw / 2) | 0, dy = BASE - 34;
    P(g, dx - 2, dy - 2, dw + 4, 36, MENUIS);
    P(g, dx, dy, dw, 34, "#8a7690"); P(g, dx, dy, dw, 1, "#a08fa6");
    P(g, dx + 3, dy + 4, dw - 6, 9, BLANCHI);                    // hublot blanchi
    P(g, dx - 7, dy + 16, dw + 14, 4, "#9a7a4e"); P(g, dx - 7, dy + 16, dw + 14, 1, "#b8965e");
    for (const nx of [dx - 4, dx + dw + 2]) P(g, nx, dy + 17, 2, 2, "#5c4630");   // les clous

    // ---- ENSEIGNE turquoise + ciseaux croisés (le nom est écrit vivant par le
    // rendu, voir la note de townBoutiqueSprite).
    P(g, 4, 26, W - 8, 10, TURQ); P(g, 4, 26, W - 8, 2, TURQ_L); P(g, 4, 35, W - 8, 1, "#2f8a80");
    for (let k = 0; k < 12; k++) {
      P(g, W / 2 - 6 + k, 28 + Math.floor(k / 2), 2, 2, "#f2f6f5");
      P(g, W / 2 + 6 - k, 28 + Math.floor(k / 2), 2, 2, "#f2f6f5");
    }
    P(g, W / 2 - 8, 33, 3, 3, "#dfe8e6"); P(g, W / 2 + 5, 33, 3, 3, "#dfe8e6");   // les anneaux

    // ---- Toit à faible pente.
    P(g, 0, 16, W, 12, "#8f8a96"); P(g, 0, 16, W, 3, "#a9a4b0"); P(g, 0, 26, W, 2, "#6e6a76");

    /* ---- LA BANDEROLE, en travers de la façade. Penchée d'un pixel toutes les
       huit colonnes : c'est ce qui la fait lire comme une toile tendue à la
       main plutôt que comme un bandeau imprimé. Elle reste VIERGE — le texte
       « ouverture prochaine » est écrit vivant, donc dans la langue du joueur. */
    for (let x2 = 6; x2 < W - 6; x2++) {
      const ty = 42 + Math.floor((W / 2 - x2) / 26);
      P(g, x2, ty, 1, 15, "#f4ead2");
      P(g, x2, ty, 1, 2, "#fffaf0");
      P(g, x2, ty + 13, 1, 2, "#cfc2a2");
      P(g, x2, ty + 3, 1, 1, "#c8785e");
      P(g, x2, ty + 11, 1, 1, "#c8785e");
    }
    P(g, 5, 40, 3, 8, "#b09a72"); P(g, W - 8, 40, 3, 8, "#b09a72");   // ses deux attaches

    /* ---- LE MÂT DE BARBIER, À DROITE DE LA PORTE ET SUR LE MUR — pas sur une
       vitrine. Le premier jet le posait à x=14, c'est-à-dire au milieu de la
       vitrine gauche : il avait l'air d'être RANGÉ DANS le magasin. */
    const px2 = dx + dw + 2;
    P(g, px2 - 1, BASE - 40, 9, 5, "#9aa0a8");
    P(g, px2, BASE - 36, 7, 26, "#cfd4d8");
    for (let k = 0; k < 6; k++) P(g, px2, BASE - 34 + k * 4, 7, 2, k % 2 ? "#c0303a" : "#2f5aa8");
    P(g, px2 - 1, BASE - 11, 9, 4, "#9aa0a8");

    /* ---- L'ÉCHAFAUDAGE, contre le pignon de gauche, HORS des vitrines. Il dit
       « chantier en cours » sans rien masquer de ce qu'on veut montrer. */
    P(g, 1, 30, 2, BASE - 34, "#a98a5a"); P(g, 7, 30, 2, BASE - 34, "#a98a5a");
    for (let k = 0; k < 4; k++) P(g, 1, 42 + k * 14, 8, 2, "#c2a06a");
    P(g, 0, 66, 14, 3, "#8a6f46"); P(g, 0, 66, 14, 1, "#a88a5e");
    P(g, 10, 62, 3, 4, "#6b5a3a");                                   // un seau posé dessus
    return c;
  }
  /* LE TABLEAU DES NOUVELLES de la place. C'est le seul décor de ce zip qui
     porte une MÉCANIQUE (il se lit à la touche E, et il dit qui est en ville et
     qui s'entend avec qui) : il devait donc se distinguer d'un panneau de rue
     au premier regard — d'où le double battant vitré, le toit à deux pentes et
     les affiches punaisées qui débordent. */
  function townNewsBoardSprite() {
    const [c, g] = cv(36, 44);
    const B = "#6b4a2e", BL = "#8a6038", BD = "#4a3120";
    P(g, 6, 34, 3, 9, BD); P(g, 27, 34, 3, 9, BD);              // pieds
    P(g, 2, 8, 32, 28, B); P(g, 2, 8, 32, 2, BL);
    P(g, 5, 12, 26, 21, "#efe6d2");                              // le fond de liège
    // Les affiches : quatre papiers de tailles différentes, jamais alignés —
    // un panneau d'affichage bien rangé n'a l'air d'avoir servi à personne.
    P(g, 7, 14, 10, 8, "#f8f4e4"); P(g, 7, 14, 10, 1, "#ffffff");
    P(g, 19, 13, 9, 11, "#e8f0d8");
    P(g, 8, 24, 13, 7, "#f2e0c8");
    P(g, 23, 26, 6, 6, "#dfe8f4");
    for (const [px, py] of [[12, 14], [23, 13], [14, 24], [26, 26]]) P(g, px, py, 1, 1, "#b03030");  // punaises
    for (let k = 0; k < 3; k++) { P(g, 9, 16 + k * 2, 6, 1, "#9a9484"); P(g, 21, 16 + k * 2, 5, 1, "#9a9484"); }
    // Toit à deux pentes, débordant : il protège l'affichage, donc il déborde.
    g.fillStyle = "#4f7a4a"; g.beginPath(); g.moveTo(0, 9); g.lineTo(18, 0); g.lineTo(36, 9); g.fill();
    g.fillStyle = "#639159"; g.beginPath(); g.moveTo(0, 9); g.lineTo(18, 0); g.lineTo(18, 3); g.lineTo(4, 9); g.fill();
    P(g, 0, 8, 36, 2, "#2f5a2c");
    return c;
  }
  function plazaTopiarySprite() {
    const [c, g] = cv(32, 40);
    P(g, 10, 32, 12, 6, "#7a6a52"); P(g, 10, 32, 12, 1, "#95866c");  // bac
    P(g, 15, 24, 2, 9, "#6a4a2e");                                    // tronc
    g.fillStyle = "#2f6b34"; g.beginPath(); g.arc(16, 16, 11, 0, 7); g.fill();
    g.fillStyle = "#3f8a44"; g.beginPath(); g.arc(14, 13, 8, 0, 7); g.fill();
    g.fillStyle = "#57a85c"; g.beginPath(); g.arc(12, 11, 4, 0, 7); g.fill();
    return c;
  }
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 425 — LA FONTAINE DE LA PLACE.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ ELLE ÉTAIT UN CARRÉ BLEU. Depuis le zip 234, la « fontaine » était deux
     cases d'eau plus quatre traits de margelle dessinés à la volée dans
     drawTownFrame : vue au vrai zoom du jeu, ça donne un rectangle bleu posé
     sur du dallage, et c'est la première chose que l'œil trouve laide sur une
     place qu'on nous demande de rendre soignée.

     ⚠️ LE CENTRE DU CANEVAS EST TRANSPARENT, ET C'EST TOUT LE PRINCIPE. Le
     sprite ne dessine que la PIERRE — margelle octogonale, pied, vasque haute.
     L'eau reste celle des cases G_WATER dessous, qui respire déjà (voir le
     reflet animé de drawTownFrame). Peindre l'eau ici l'aurait figée, et il
     aurait fallu deux sources de vérité pour une même flaque.
     Canevas 56×64, ancré par son bord bas comme les bâtiments. */
  /* ⚠️⚠️ ZIP 429 — LA GÉOMÉTRIE DE LA FONTAINE EST UNE TABLE, ET C'EST LE §8
     APPLIQUÉ APRÈS COUP. Le canevas dessinait la margelle à `H − 16` et le
     bouton du jet à `H − 51` ; drawTownFrame, lui, peignait l'eau à `fBy − 16`
     et le jet à `fBy − 60` — les MÊMES cotes, recopiées à quatre cents lignes de
     distance. Tant que le sprite n'a pas bougé, ça a tenu. En le rabaissant de
     64 à 44 px, l'eau serait restée à mi-hauteur de l'air et le jet aurait
     jailli VINGT PIXELS AU-DESSUS de sa colonne, sans la moindre erreur.
     Les cotes sont comptées DEPUIS LE BAS du sprite, parce que c'est par le bas
     qu'il est ancré des deux côtés : changer H ne les déplace plus. */
  const FOUNTAIN_GEO = { basinY: 16, basinRX: 19, basinRY: 8, bowlY: 27, bowlRX: 8, bowlRY: 3.5, jetY: 39 };
  /* ⚠️⚠️ ZIP 429 — LA FONTAINE A ÉTÉ RABAISSÉE, ET C'EST UNE MESURE. Elle
     faisait 54 px peints pour un personnage de 23, soit **2,35 fois sa taille** ;
     une fontaine de place, vasque haute comprise, fait environ 1,6 fois un
     adulte (la margelle à la taille, la vasque à hauteur d'épaule, le jet
     au-dessus de la tête). Elle DOMINAIT la place au lieu d'y trôner, et
     dépassait même la hauteur d'une maison de ville rapportée à sa largeur.
     ⚠️ La correction est prise sur la COLONNE et le PIED, jamais sur la
     margelle : c'est le bassin qui dit « fontaine », et le rétrécir aurait
     donné une vasque sur pied. On raccourcit ce qui est décoratif, on garde ce
     qui est signifiant — c'est la même règle que le banc, dont on a baissé le
     dossier sans toucher à la largeur de l'assise.
     ⚠️ Et le sprite garde ses proportions relatives : tout est exprimé en
     fractions de H, donc changer H suffit et rien ne se décale. */
  function plazaFountainSprite() {
    const W = 56, H = 44;
    const F = FOUNTAIN_GEO;
    const [c, g] = cv(W, H);
    const S = "#c6c2b6", SL = "#e2ded1", SD = "#9d9a8f", SXD = "#7c7a71";
    const cx = W / 2;
    // ---- La margelle octogonale, vue de trois quarts : deux ellipses de
    // pierre et un anneau d'ombre entre les deux.
    const ring = (ry, rx, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, ry, rx, rx * 0.42, 0, 0, 7); g.fill(); };
    ring(H - F.basinY + 4, 26, SXD);   // socle, un peu débordant
    ring(H - F.basinY + 2, 25, SD);
    ring(H - F.basinY, 24, S);
    ring(H - F.basinY - 1, 23, SL);    // arête éclairée de la margelle
    /* Le bassin lui-même : on DÉCOUPE, on ne peint pas du bleu. `destination-out`
       rend la zone transparente, l'eau animée des tuiles apparaît au travers. */
    g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.ellipse(cx, H - F.basinY, F.basinRX, F.basinRY, 0, 0, 7); g.fill();
    g.globalCompositeOperation = "source-over";
    // Un liseré sombre à l'intérieur de la margelle : c'est lui qui donne la
    // PROFONDEUR du bassin. Sans lui, l'eau a l'air posée par-dessus.
    g.strokeStyle = "rgba(40,44,38,0.45)"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, H - F.basinY, F.basinRX, F.basinRY, 0, 0, 7); g.stroke();

    // ---- Le pied et la vasque haute. Le fût passe de 20 px à 11 : c'est là
    // que la fontaine était trop haute, et c'est la partie la moins parlante.
    P(g, cx - 4, H - F.bowlY + 2, 8, 11, S); P(g, cx - 4, H - F.bowlY + 2, 3, 11, SL); P(g, cx + 2, H - F.bowlY + 2, 2, 11, SD);
    ring(H - F.bowlY + 2, 13, SD); ring(H - F.bowlY, 12, S); ring(H - F.bowlY - 1, 11, SL);
    g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.ellipse(cx, H - F.bowlY, F.bowlRX, F.bowlRY, 0, 0, 7); g.fill();
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "rgba(40,44,38,0.40)"; g.lineWidth = 1;
    g.beginPath(); g.ellipse(cx, H - F.bowlY, F.bowlRX, F.bowlRY, 0, 0, 7); g.stroke();
    // ---- La colonne et le bouton d'où sort le jet (le jet lui-même est animé
    // dans drawTownFrame : il bouge, donc il ne peut pas vivre dans un canevas).
    P(g, cx - 2, H - F.jetY + 1, 4, 12, S); P(g, cx - 2, H - F.jetY + 1, 1, 12, SL);
    g.fillStyle = SL; g.beginPath(); g.arc(cx, H - F.jetY, 4, 0, 7); g.fill();
    g.fillStyle = SD; g.beginPath(); g.arc(cx + 1, H - F.jetY + 1, 2, 0, 7); g.fill();
    return c;
  }

  /* L'OBÉLISQUE de la place. ⚠️ Il n'est PAS une seconde fontaine : deux
     bassins symétriques auraient fait un jardin d'eau, pas une place. Une masse
     de pierre verticale au sud répond à une masse d'eau horizontale au nord —
     ce sont les contraires qui équilibrent, pas les copies. */
  function plazaMonumentSprite() {
    const [c, g] = cv(48, 72);
    const S = "#cfcabc", SL = "#e6e1d2", SD = "#a9a496";
    P(g, 6, 62, 36, 9, SD); P(g, 6, 62, 36, 2, S);                   // emmarchement
    P(g, 11, 54, 26, 9, S); P(g, 11, 54, 26, 2, SL);                 // socle
    P(g, 15, 46, 18, 9, SD); P(g, 15, 46, 18, 1, S);                 // dé
    g.fillStyle = S;                                                  // fût effilé
    g.beginPath(); g.moveTo(18, 46); g.lineTo(21, 8); g.lineTo(27, 8); g.lineTo(30, 46); g.fill();
    g.fillStyle = SL;
    g.beginPath(); g.moveTo(18, 46); g.lineTo(21, 8); g.lineTo(23, 8); g.lineTo(21, 46); g.fill();
    g.fillStyle = "#d8b45a";                                          // pyramidion doré
    g.beginPath(); g.moveTo(20, 9); g.lineTo(24, 0); g.lineTo(28, 9); g.fill();
    P(g, 14, 50, 20, 1, "#8f8a7c");                                   // inscription
    P(g, 16, 52, 16, 1, "#8f8a7c");
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 426 — LE MOBILIER DE L'INTÉRIEUR DU TRIBUNAL.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️ UNE SEULE FONCTION POUR VINGT-CINQ MEUBLES, et c'est délibéré : ils
     partagent la même palette (trois bois, deux pierres, un bronze) et le même
     ancrage (bord bas du canevas sur le bord bas de la case). Vingt-cinq
     fonctions auraient donné vingt-cinq palettes qui divergeraient à la
     première retouche — et un intérieur dont les meubles ne s'accordent pas se
     voit immédiatement, bien plus qu'un meuble mal dessiné.

     ⚠️ LA LARGEUR DE RÉFÉRENCE EST 16 (une case) ET LA HAUTEUR VARIE. Ce qui
     dépasse, dépasse vers le HAUT — comme les haies, les bancs et les
     lampadaires de la ville : c'est ce débord qui donne le volume et qui dit
     « ça arrête ». Deux meubles font 32 de large (le siège du juge, la statue
     de la Justice) et sont donc découpés en DEUX sprites d'une case, posés
     côte à côte par le générateur : rien dans le rendu n'a besoin de connaître
     de meuble à cheval sur deux cases.
     ══════════════════════════════════════════════════════════════════════════ */
  const COURT_PROP_KINDS = [
    "pillar", "bench", "desk", "chair", "shelf", "cabinet", "plant", "counter",
    "locker", "table", "mirror", "judgeBench", "judgeBench2", "flag", "witnessBox",
    "juryBench", "railing", "pew", "bunk", "stoolC", "crate", "boiler", "board",
    "justice", "justice2",
    // ZIP 438 — l'hôtel de ville. Même gabarit (16 de large, ce qui dépasse
    // dépasse vers le haut) et même palette : les deux bâtiments doivent avoir
    // été MEUBLÉS PAR LA MÊME VILLE, sinon on lit deux jeux différents.
    "cityModel", "cityModel2", "wallMap", "planChest", "priceBoard",
    "portrait", "globe", "lectern", "urn", "ovalTable", "ovalTable2",
    // ZIP 439 — le fauteuil (promis par une description depuis le 438 et absent
    // de la pièce) et la planche à dessin du géomètre, en deux moitiés.
    "armchair", "draftTable", "draftTable2",
    // ZIP 439 — l'hôtesse d'accueil. ⚠️ ELLE EST UN PROP ET PAS UN PERSONNAGE :
    // elle ne se déplace jamais, donc lui donner une feuille de poses, un état
    // et une position à diffuser serait payer trois mécanismes pour une chose
    // qui reste debout derrière un comptoir. Ce qu'elle a à faire — parler —
    // ne demande aucun des trois.
    "clerkNPC",
    /* ⚠️⚠️ ZIP 441 — L'ÉGLISE. Dix-sept dessins, et TROIS SEULEMENT SONT NEUFS
       EN NATURE : le buffet d'orgue, le râtelier à cierges et le confessionnal.
       Le banc de nef (`pew`), le garde-corps (`railing`), l'ambon (`lectern`) et
       l'urne existaient déjà et sont REPRIS TELS QUELS — pas parce que c'est
       économique, mais parce que la ville qui a meublé le tribunal a meublé
       l'église : deux vocabulaires de dessin dans la même ville se lisent comme
       deux jeux (c'est ce que le 438 disait déjà en donnant à la mairie le
       gabarit du tribunal).
       ⚠️ ET AUCUN CIERGE ALLUMÉ N'EST CUIT DANS UN SPRITE. Leur nombre change
       (il est partagé et arbitré par l'hôte) : cuire des flammes obligerait à
       treize sprites, ou à en dessiner un mensonger. Les flammes sont peintes
       VIVANTES au rendu, comme le nom du maire sous son portrait (439). */
    "altar", "altar2", "candlestick", "paschal", "choirStall", "candleRack",
    "prieDieu", "confessional", "confessional2", "font", "pulpit", "saintNiche",
    "stoup", "organ", "organWing", "organBench", "bellRope", "pewL", "pewR",
    /* ⚠️⚠️ ZIP 444 — LE BEFFROI. Quatre dessins, et la cloche est le seul décor
       de tout le projet qui soit AUSSI HAUT QU'UN MUR : elle est dessinée avec
       les MURS et pas dans la file des props (voir `drawCourtFrame`). On le sait
       d'avance parce que le 441 l'a payé sur le buffet d'orgue — un sprite haut
       contre le mur du fond avale ce qui passe devant. *On ne règle pas un tri,
       on change de passe.* Le prop existe pour la COLLISION et pour l'invite. */
    "greatBell", "greatBell2", "bellFrame", "ringerBoard",
  ];
  function courtPropSprite(kind) {
    const W1 = "#7a5232", W2 = "#9c6b42", W3 = "#5a3b26", W4 = "#b98a58";  // bois : mat, clair, ombre, éclairé
    const S = "#c2beb2", SL = "#e0dcd0", SD = "#96928a";                    // pierre
    const IR = "#3c3c44", BR = "#a8863c", GR = "#2f6b34";                   // fonte, bronze, feuillage
    const CL = "#8a2f38";                                                    // le drap rouge des sièges
    /* ZIP 441 — la palette de l'église, en plus de celle du tribunal.
       ⚠️ LE BOIS DE L'ÉGLISE EST PLUS SOMBRE QUE CELUI DES BUREAUX (DK*) : c'est
       la seule chose qui distingue un confessionnal d'une armoire à dossiers une
       fois le sprite réduit à seize pixels. La matière se dit par la VALEUR,
       jamais par le détail (leçon du parquet, 439). */
    const DK1 = "#4a2f1e", DK2 = "#63402a", DK3 = "#332014", DK4 = "#7d5334";
    const GO = "#d0a441", GOL = "#f0d78a", GOD = "#96702a";                  // l'or des objets du culte
    const WX = "#f2ead6", WXD = "#d6ccb2";                                   // la cire
    const FL = "#ffcf55", FLC = "#fff6cc";                                   // la flamme
    const PI = "#b9bcc4", PIL = "#e4e7ec", PID = "#868a92";                  // l'étain des tuyaux
    const LN = "#f4efe0", LND = "#dcd5c0";                                   // le linge d'autel
    switch (kind) {
      case "pillar": {
        const [c, g] = cv(16, 44);
        P(g, 1, 38, 14, 5, SD); P(g, 1, 38, 14, 1, SL);
        P(g, 3, 6, 10, 33, S); P(g, 3, 6, 3, 33, SL); P(g, 11, 6, 2, 33, SD);
        P(g, 7, 9, 1, 27, SD);
        P(g, 1, 2, 14, 5, SL); P(g, 1, 6, 14, 1, SD);
        return c;
      }
      case "bench": {
        const [c, g] = cv(16, 20);
        P(g, 2, 15, 2, 4, IR); P(g, 12, 15, 2, 4, IR);
        P(g, 1, 11, 14, 4, W2); P(g, 1, 11, 14, 1, W4);
        P(g, 1, 4, 14, 6, W1); P(g, 1, 4, 14, 1, W4);
        return c;
      }
      case "desk": {
        const [c, g] = cv(16, 20);
        P(g, 0, 6, 16, 4, W2); P(g, 0, 6, 16, 1, W4);                  // plateau
        P(g, 1, 10, 14, 8, W1); P(g, 1, 17, 14, 2, W3);                // caisson
        P(g, 3, 12, 5, 2, W3); P(g, 9, 12, 5, 2, W3);                  // tiroirs
        P(g, 4, 3, 6, 3, "#f2ecdc"); P(g, 4, 3, 6, 1, "#ffffff");      // les papiers, seule tache claire
        P(g, 11, 2, 3, 4, "#2f4a6b");
        return c;
      }
      case "chair": {
        const [c, g] = cv(16, 20);
        P(g, 3, 14, 2, 5, W3); P(g, 11, 14, 2, 5, W3);
        P(g, 2, 10, 12, 4, W2); P(g, 2, 10, 12, 1, W4);
        P(g, 3, 2, 10, 8, W1); P(g, 4, 3, 8, 6, CL);
        return c;
      }
      case "shelf": {
        const [c, g] = cv(16, 34);
        P(g, 0, 2, 16, 31, W1); P(g, 0, 2, 16, 1, W4); P(g, 0, 31, 16, 2, W3);
        for (let r = 0; r < 4; r++) {
          const y = 4 + r * 7;
          P(g, 1, y, 14, 6, "#3a2a1c");                                 // le fond, dans l'ombre
          for (let b = 0; b < 6; b++) {
            const h = 4 + ((r * 7 + b * 3) % 3);
            P(g, 2 + b * 2, y + 6 - h, 2, h, ["#8a3a2c", "#2f4a6b", "#4a6b2f", "#6b4a2f", "#5a3a6b", "#8a6a2c"][(r + b) % 6]);
          }
          P(g, 1, y + 6, 14, 1, W3);
        }
        return c;
      }
      case "cabinet": {
        const [c, g] = cv(16, 26);
        P(g, 1, 2, 14, 23, "#5a6068"); P(g, 1, 2, 14, 1, "#7c828a"); P(g, 1, 24, 14, 1, "#3a4048");
        for (let r = 0; r < 4; r++) { P(g, 2, 4 + r * 5, 12, 4, "#6a7078"); P(g, 6, 6 + r * 5, 4, 1, "#c8ccd2"); }
        return c;
      }
      case "plant": {
        const [c, g] = cv(16, 30);
        P(g, 4, 22, 8, 7, "#8a5a3c"); P(g, 4, 22, 8, 1, "#a87450"); P(g, 4, 28, 8, 1, "#5a3a26");
        P(g, 7, 14, 2, 9, "#4a6b2f");
        for (const [lx, ly, lw, lh] of [[1, 8, 7, 3], [8, 6, 7, 3], [2, 12, 6, 3], [8, 13, 6, 3], [5, 3, 6, 4]]) {
          P(g, lx, ly, lw, lh, GR); P(g, lx, ly, lw, 1, "#4f9a48");
        }
        return c;
      }
      case "counter": {
        const [c, g] = cv(16, 24);
        P(g, 0, 8, 16, 15, W1); P(g, 0, 21, 16, 2, W3);
        P(g, 0, 6, 16, 3, W2); P(g, 0, 6, 16, 1, W4);                   // tablette débordante
        P(g, 2, 12, 12, 6, "#3a2a1c");                                   // panneau en creux
        P(g, 3, 1, 4, 5, "#cfd6dc");                                     // la vitre du guichet
        P(g, 9, 2, 5, 4, "#f2ecdc");
        return c;
      }
      case "locker": {
        const [c, g] = cv(16, 32);
        P(g, 1, 2, 14, 29, "#4a5058"); P(g, 1, 2, 14, 1, "#6c727a");
        P(g, 8, 2, 1, 29, "#2e343c");
        for (const dx of [2, 9]) { P(g, dx, 6, 5, 2, "#2e343c"); P(g, dx + 4, 16, 1, 3, "#c8ccd2"); }
        // Une robe noire pendue : c'est ce détail qui fait « vestiaire des
        // avocats » plutôt que « casiers de gymnase ».
        P(g, 3, 10, 4, 12, "#20222a"); P(g, 3, 10, 4, 1, "#3a3e48");
        return c;
      }
      case "table": {
        const [c, g] = cv(16, 18);
        P(g, 0, 6, 16, 4, W2); P(g, 0, 6, 16, 1, W4); P(g, 0, 10, 16, 1, W3);
        P(g, 2, 10, 2, 7, W3); P(g, 12, 10, 2, 7, W3);
        return c;
      }
      case "mirror": {
        const [c, g] = cv(16, 30);
        P(g, 2, 2, 12, 26, BR); P(g, 3, 3, 10, 24, "#8fa6b8");
        P(g, 4, 4, 4, 22, "#a8bccc"); P(g, 4, 4, 8, 6, "#c8dae6");
        return c;
      }
      case "judgeBench": case "judgeBench2": {
        /* LE SIÈGE DU JUGE, moitié gauche puis moitié droite. Il est le meuble
           le plus haut du bâtiment (32 px de débord) : c'est ce qui le fait
           dominer la salle, et c'est la seule raison pour laquelle il existe. */
        const right = kind === "judgeBench2";
        const [c, g] = cv(16, 40);
        P(g, 0, 16, 16, 22, W1); P(g, 0, 36, 16, 2, W3);
        P(g, 0, 14, 16, 3, W2); P(g, 0, 14, 16, 1, W4);                  // pupitre
        P(g, right ? 0 : 2, 20, 14, 10, "#3a2a1c");
        P(g, right ? 0 : 2, 20, 14, 1, W3);
        // Le dossier haut, drapé de rouge, et l'écusson à la balance.
        P(g, right ? 0 : 3, 2, 13, 13, W1);
        P(g, right ? 0 : 4, 3, 12, 10, CL);
        if (!right) { P(g, 12, 5, 4, 1, BR); P(g, 11, 6, 1, 3, BR); P(g, 15, 6, 1, 3, BR); }
        else { P(g, 0, 5, 3, 1, BR); P(g, 0, 6, 1, 3, BR); P(g, 2, 8, 3, 1, BR); }
        return c;
      }
      case "flag": {
        const [c, g] = cv(16, 40);
        P(g, 3, 4, 2, 35, "#5a4a3a"); P(g, 2, 1, 4, 4, BR);
        P(g, 5, 5, 10, 20, "#2f4a6b"); P(g, 5, 5, 10, 2, "#4a6b8c");
        P(g, 8, 11, 4, 8, "#d8b45a");                                    // l'emblème, simplifié à une masse
        for (let i = 0; i < 4; i++) P(g, 5, 25 + i, 10 - i * 2, 1, "#2f4a6b");
        return c;
      }
      case "witnessBox": {
        const [c, g] = cv(16, 30);
        P(g, 0, 12, 16, 16, W1); P(g, 0, 26, 16, 2, W3);
        P(g, 0, 10, 16, 3, W2); P(g, 0, 10, 16, 1, W4);
        P(g, 1, 14, 14, 5, "#3a2a1c");
        P(g, 2, 2, 3, 9, W2); P(g, 11, 2, 3, 9, W2); P(g, 2, 2, 12, 2, W2); // le petit dais
        return c;
      }
      case "juryBench": {
        const [c, g] = cv(16, 24);
        P(g, 0, 10, 16, 12, W1); P(g, 0, 20, 16, 2, W3);
        P(g, 0, 8, 16, 3, W2); P(g, 0, 8, 16, 1, W4);
        P(g, 2, 13, 12, 5, "#3a2a1c");
        P(g, 3, 4, 10, 4, CL);
        return c;
      }
      case "railing": {
        const [c, g] = cv(16, 18);
        P(g, 0, 4, 16, 3, W2); P(g, 0, 4, 16, 1, W4);
        for (let x = 1; x < 15; x += 4) P(g, x, 7, 2, 10, W1);
        P(g, 0, 15, 16, 2, W3);
        return c;
      }
      case "pew": case "pewL": case "pewR": {
        /* ⚠️⚠️ ZIP 441 — TROIS DESSINS POUR UN SEUL BANC, ET C'EST LA PÉRIODE
           QUI L'EXIGE. Un banc de nef fait HUIT cases ; avec un seul sprite,
           l'œil voit huit paires de pieds tous les seize pixels — c'est-à-dire
           la grille avant le meuble, le défaut nommé au 434 et payé quatre fois
           depuis. Les pieds ne se dessinent donc qu'aux DEUX BOUTS, qui portent
           en plus une joue pleine : le corps du banc devient une masse continue
           de huit cases, et la travée se lit d'un coup.
           ⚠️ La variante vient du GÉNÉRATEUR (`pr.kind`), jamais d'un hachage de
           position : le hachage donnerait des pieds au milieu d'une travée et
           pas au bout, ce qui est pire que pas de pieds du tout. Même raison
           que la bâche des étals, qui vient de `pr.v` depuis le 426. */
        const end = kind !== "pew", right = kind === "pewR";
        const [c, g] = cv(16, 22);
        P(g, 0, 12, 16, 5, W2); P(g, 0, 12, 16, 1, W4);       // l'assise, continue
        P(g, 0, 4, 16, 8, W1); P(g, 0, 4, 16, 1, W4);         // le dossier, continu
        P(g, 0, 16, 16, 1, W3);                                // l'ombre sous l'assise
        if (end) {
          // La joue : pleine, du dossier au sol, du côté de l'allée.
          const jx = right ? 13 : 0;
          P(g, jx, 3, 3, 18, W1); P(g, jx, 3, 3, 1, W4); P(g, jx, 19, 3, 2, W3);
          P(g, right ? 12 : 3, 4, 1, 16, W3);                  // l'arête de la joue
        }
        return c;
      }
      case "bunk": {
        const [c, g] = cv(16, 20);
        P(g, 0, 10, 16, 6, "#5a6068"); P(g, 0, 10, 16, 1, "#7c828a");
        P(g, 1, 6, 14, 5, "#8a8478"); P(g, 1, 6, 14, 1, "#a8a294");      // le matelas
        P(g, 2, 4, 6, 3, "#c8c2b4");                                      // l'oreiller
        P(g, 1, 16, 2, 4, "#3a4048"); P(g, 13, 16, 2, 4, "#3a4048");
        return c;
      }
      case "stoolC": {
        const [c, g] = cv(16, 14);
        P(g, 3, 6, 10, 3, W2); P(g, 3, 6, 10, 1, W4);
        P(g, 4, 9, 2, 4, W3); P(g, 10, 9, 2, 4, W3);
        return c;
      }
      case "crate": return crateSprite();
      case "boiler": {
        const [c, g] = cv(16, 34);
        P(g, 2, 10, 12, 22, "#4a3a34"); P(g, 2, 10, 3, 22, "#6a5a52"); P(g, 2, 31, 12, 2, "#2a201c");
        for (let r = 0; r < 3; r++) P(g, 2, 14 + r * 6, 12, 1, "#2a201c");
        P(g, 5, 20, 6, 6, "#e08a3c"); P(g, 6, 21, 4, 4, "#f2c86a");      // la porte du foyer, ouverte
        P(g, 6, 0, 4, 11, "#5a5a64"); P(g, 6, 0, 1, 11, "#7c7c88");      // le conduit
        P(g, 12, 4, 3, 8, "#5a5a64");
        return c;
      }
      case "board": {
        /* LE PANNEAU D'AFFICHAGE. C'est le meuble le plus important du
           bâtiment tant qu'aucun service n'ouvre : c'est LUI qui explique que
           le tribunal ouvrira. On lui donne donc de vrais papiers punaisés,
           pas une planche vide. */
        const [c, g] = cv(16, 34);
        P(g, 1, 30, 14, 3, W3);
        P(g, 0, 2, 16, 29, W1); P(g, 0, 2, 16, 1, W4);
        P(g, 1, 4, 14, 25, "#6a5238");                                    // le liège
        for (const [px, py, pw, ph] of [[2, 6, 5, 7], [8, 5, 6, 8], [3, 15, 6, 8], [10, 16, 4, 6], [2, 24, 12, 4]]) {
          P(g, px, py, pw, ph, "#f2ecdc"); P(g, px, py, pw, 1, "#ffffff");
          for (let l = 2; l < ph - 1; l += 2) P(g, px + 1, py + l, pw - 2, 1, "#8a8478");
          P(g, px + (pw >> 1), py, 1, 1, "#c83c3c");                      // la punaise
        }
        return c;
      }
      /* ═══ ZIP 438 — LE MOBILIER DE L'HÔTEL DE VILLE ══════════════════════
         ⚠️ MÊME PALETTE ET MÊME GABARIT QUE LE TRIBUNAL, et ce n'est pas de la
         paresse : les deux bâtiments doivent avoir été meublés PAR LA MÊME
         VILLE. Un mobilier de mairie dessiné dans une autre gamme se lirait
         comme un autre jeu, exactement comme les deux ronds verts du 232 à côté
         d'une rue au motif de 64 px. Ce qui change, ce sont les OBJETS. */
      /* LA MAQUETTE DE LA VILLE, en deux moitiés d'une case comme la statue de
         la Justice. C'est le point de fuite du hall, et il fallait qu'elle se
         lise en une seconde : pas une carte à plat mais des VOLUMES — des
         maisons à toit rouge sur un plateau vert, sous une vitrine. Un visiteur
         doit savoir dans quel bâtiment il est avant de lire la moindre plaque. */
      case "cityModel": case "cityModel2": {
        const right = kind === "cityModel2";
        const [c, g] = cv(16, 40);
        /* ⚠️ LA TABLE D'ABORD, ET ELLE A DES PIEDS. Premier jet : un socle plein
           et un plateau vert — regardé sur `render-mairie.mjs`, ça donnait une
           JARDINIÈRE. Ce qui fait lire « maquette », ce n'est pas la maquette,
           c'est le meuble qui la porte : un plateau à hauteur d'homme, des pieds
           tournés, et une vitrine par-dessus. */
        P(g, right ? 2 : 11, 30, 3, 10, W1); P(g, right ? 2 : 11, 30, 1, 10, W4);
        P(g, right ? 1 : 10, 38, 5, 2, W3);
        P(g, 0, 26, 16, 5, W2); P(g, 0, 26, 16, 1, W4); P(g, 0, 30, 16, 1, W3);
        // Le terrain : herbe, la rivière qui traverse les deux moitiés, une route.
        P(g, 0, 18, 16, 8, "#4e7f46"); P(g, 0, 18, 16, 1, "#63a05a");
        P(g, 0, 22, 16, 2, "#3f79c0"); P(g, 0, 22, 16, 1, "#65a0e2");
        P(g, right ? 5 : 9, 18, 2, 8, "#a89c78");
        // Les bâtiments, en volumes de trois quarts : mur clair, toit rouge,
        // une fenêtre. La moitié droite porte le beffroi, la gauche l'église —
        // deux repères que le joueur vient de voir en ville.
        const HS = right ? [[1, 12, 4, 8], [8, 15, 5, 5], [12, 10, 3, 6]] : [[2, 15, 4, 5], [7, 11, 5, 8], [12, 14, 3, 5]];
        for (const [hx, hy, hw, hh] of HS) {
          P(g, hx, hy + 2, hw, hh, "#d8cdb8"); P(g, hx, hy + 2, 1, hh, "#efe6d2");
          P(g, hx + hw - 1, hy + 2, 1, hh, "#b4a992");
          P(g, hx - 1, hy, hw + 2, 3, "#b3453a"); P(g, hx - 1, hy, hw + 2, 1, "#d0685a");
          P(g, hx + 1, hy + 4, 1, 2, "#5f6f86");
        }
        if (right) { P(g, 2, 6, 2, 7, "#d8cdb8"); P(g, 1, 3, 4, 3, "#b3453a"); P(g, 2, 8, 2, 2, "#e8d67a"); }  // le beffroi et son horloge
        else { P(g, 8, 5, 2, 7, "#e6e0d2"); P(g, 8, 2, 2, 3, "#8a8f96"); P(g, 7, 3, 4, 1, "#8a8f96"); }        // le clocher de l'église
        // La vitrine : montants aux deux bouts, traverse en haut. Un pixel, pas
        // un aplat translucide — le faux canevas des bancs ignore l'alpha fin.
        P(g, right ? 15 : 0, 1, 1, 26, "#cfd6dc");
        P(g, 0, 1, 16, 1, "#cfd6dc");
        return c;
      }
      /* LE PLAN MURAL DU CADASTRE. Il est ACCROCHÉ — la tringle et les deux
         cordons sont ce qui le distingue d'une fenêtre. Ce qui est dessiné
         dessus n'est pas décoratif : des parcelles jointives séparées par des
         traits, le lac au sud, l'artère centrale en rouge. */
      case "wallMap": {
        const [c, g] = cv(16, 26);
        P(g, 0, 2, 16, 1, IR);
        P(g, 3, 0, 1, 3, IR); P(g, 12, 0, 1, 3, IR);
        P(g, 0, 3, 16, 20, "#e6dfc8"); P(g, 0, 3, 16, 1, "#f5efdc");
        P(g, 0, 22, 16, 2, W3);
        const PARC = [[1, 5, 6, 5], [8, 5, 7, 4], [1, 11, 4, 6], [6, 10, 4, 5], [11, 10, 4, 4], [6, 16, 9, 5]];
        for (const [px2, py2, pw, ph] of PARC) {
          P(g, px2, py2, pw, ph, "#d8d0b4");
          P(g, px2, py2, pw, 1, "#a89c78"); P(g, px2, py2, 1, ph, "#a89c78");
        }
        P(g, 1, 18, 4, 4, "#6f9fce"); P(g, 1, 18, 4, 1, "#8fbde6");
        P(g, 7, 4, 1, 19, "#b3453a");
        return c;
      }
      // LE CARTONNIER À PLANS : un meuble bas à tiroirs PLATS et larges, avec
      // une poignée centrale. Il dit « ici on range des cartes » sans un mot.
      case "planChest": {
        const [c, g] = cv(16, 20);
        P(g, 0, 4, 16, 15, W1); P(g, 0, 4, 16, 1, W4); P(g, 0, 18, 16, 2, W3);
        for (let k = 0; k < 4; k++) {
          const y = 6 + k * 3;
          P(g, 1, y, 14, 2, W2); P(g, 1, y + 2, 14, 1, W3);
          P(g, 7, y, 2, 1, BR);
        }
        P(g, 1, 2, 14, 2, "#e6dfc8"); P(g, 2, 1, 12, 1, "#c9c0a4");
        return c;
      }
      /* LE TABLEAU DES COURS. Une ardoise encadrée, des lignes à la craie, une
         colonne de chiffres jaunes. ⚠️ AUCUN VRAI TEXTE ICI (§4 : `fillText`
         n'est pas rastérisable hors navigateur, donc un sprite qui en contient
         n'est plus regardable par un banc) — le texte vivant est dans le
         panneau qu'on ouvre, ce qui le rend en plus bilingue. */
      case "priceBoard": {
        const [c, g] = cv(16, 30);
        P(g, 0, 0, 16, 26, W1); P(g, 0, 0, 16, 1, W4); P(g, 0, 25, 16, 3, W3);
        P(g, 2, 2, 12, 22, "#2b3330"); P(g, 2, 2, 12, 1, "#3d4744");
        for (let k = 0; k < 5; k++) {
          const y = 5 + k * 4;
          P(g, 3, y, 5 + (k % 3), 1, "#d8e2d8");
          P(g, 11, y, 2 + (k % 2), 1, "#e8d67a");
        }
        P(g, 3, 23, 10, 1, "#8a9a90");
        P(g, 6, 28, 4, 2, W3);
        return c;
      }
      // LE PORTRAIT OFFICIEL. À cette taille un visage détaillé fait une tache ;
      // une SILHOUETTE se lit. Cadre doré, fond sombre, épaules.
      case "portrait": {
        const [c, g] = cv(16, 22);
        P(g, 1, 1, 14, 20, BR); P(g, 1, 1, 14, 1, "#d8b45c");
        P(g, 3, 3, 10, 16, "#2f3a44");
        P(g, 6, 6, 4, 4, "#d8b08a"); P(g, 6, 6, 2, 4, "#e8c4a0");
        P(g, 4, 10, 8, 8, "#3c4c66"); P(g, 4, 10, 2, 8, "#4e6182");
        P(g, 7, 11, 2, 5, "#d8d2c2");
        return c;
      }
      // LE GLOBE : une sphère ombrée sur un pied de bois. Le dégradé est en
      // TROIS tons seuillés, jamais un fondu — la règle de tout ce fichier.
      case "globe": {
        const [c, g] = cv(16, 22);
        P(g, 6, 17, 4, 4, W1); P(g, 4, 20, 8, 2, W3);
        P(g, 5, 15, 6, 2, BR);
        for (let y = 3; y < 15; y++) {
          const dy = (y - 9) / 6, hw = Math.round(Math.sqrt(Math.max(0, 1 - dy * dy)) * 6);
          for (let x = 8 - hw; x <= 7 + hw; x++) {
            const dx = (x - 7.5) / 6;
            P(g, x, y, 1, 1, (-dx - dy) > 0.45 ? "#7fb6dd" : (dx + dy) > 0.55 ? "#2f5f88" : "#4e8cba");
          }
        }
        P(g, 4, 8, 9, 1, "#8fc9e8");
        P(g, 6, 5, 4, 3, "#5e9c58"); P(g, 9, 10, 3, 3, "#5e9c58");
        return c;
      }
      // LE PUPITRE. C'est l'INCLINAISON du plan qui le distingue d'une table,
      // et elle se dessine en trois marches d'un pixel.
      case "lectern": {
        const [c, g] = cv(16, 22);
        P(g, 6, 12, 4, 8, W1); P(g, 4, 19, 8, 3, W3);
        P(g, 2, 8, 12, 2, W2); P(g, 3, 6, 10, 2, W1); P(g, 4, 4, 8, 2, W2);
        P(g, 2, 8, 12, 1, W4);
        P(g, 5, 3, 7, 2, "#e6dfc8");
        return c;
      }
      // L'URNE FLEURIE : le décor qui dit « bâtiment public entretenu ». Les
      // fleurs sont des CROIX de cinq pixels, comme celles des arbres (438).
      case "urn": {
        const [c, g] = cv(16, 24);
        P(g, 4, 16, 8, 6, S); P(g, 4, 16, 3, 6, SL); P(g, 4, 21, 8, 2, SD);
        P(g, 3, 14, 10, 3, S); P(g, 3, 14, 10, 1, SL);
        P(g, 4, 12, 8, 3, GR); P(g, 4, 12, 8, 1, "#3f8a48");
        for (const [fx, fy, col] of [[5, 9, "#c9455a"], [8, 7, "#e0d24a"], [10, 10, "#b06fc0"], [6, 6, "#e6e0d2"]]) {
          P(g, fx, fy + 1, 1, 4, GR);
          P(g, fx - 1, fy, 3, 1, col); P(g, fx, fy - 1, 1, 3, col);
          P(g, fx, fy, 1, 1, "#f4ecd0");
        }
        return c;
      }
      /* LA TABLE OVALE DU CONSEIL, en deux sprites : le BORD (avec son épaisseur
         et son ombre) et le CENTRE (plateau nu). Le générateur choisit lequel
         poser, comme pour le siège du juge — le rendu n'a jamais à connaître un
         meuble de douze cases. */
      case "ovalTable": {
        const [c, g] = cv(16, 20);
        P(g, 0, 4, 16, 12, W2); P(g, 0, 4, 16, 2, W4); P(g, 0, 15, 16, 3, W3);
        P(g, 0, 6, 16, 1, "#8f6142");
        return c;
      }
      case "ovalTable2": {
        const [c, g] = cv(16, 20);
        P(g, 0, 4, 16, 12, W2); P(g, 0, 4, 16, 1, W4);
        P(g, 3, 7, 4, 3, "#e6dfc8"); P(g, 10, 9, 4, 2, "#e6dfc8");
        P(g, 7, 6, 2, 2, "#7f9f8a");
        return c;
      }
      /* ═══ ZIP 439 — TROIS MEUBLES NEUFS, ET AUCUN N'EST DÉCORATIF. ═══
         ⚠️ Le FAUTEUIL a été ajouté parce qu'une description le promettait
         depuis le 438 (« le fauteuil est tourné vers la fenêtre ») pendant que
         la pièce ne contenait qu'une `chair` — le même tabouret que dans les
         salles d'attente. Une description qui décrit un meuble absent apprend au
         joueur à ne plus lire les descriptions, et c'est très cher.
         ⚠️ Et il sert AUSSI dans tous les bureaux : c'est ce qui distingue enfin
         le côté de l'agent du côté du visiteur. Un bureau où les trois sièges
         sont identiques ne dit pas qui reçoit qui. */
      case "armchair": {
        const [c, g] = cv(16, 22);
        P(g, 3, 17, 2, 4, W3); P(g, 11, 17, 2, 4, W3);
        P(g, 1, 4, 14, 14, W1); P(g, 1, 4, 14, 1, W4);                   // la carcasse
        P(g, 3, 2, 10, 11, CL); P(g, 3, 2, 10, 1, "#a8434d");            // le dossier haut, capitonné
        P(g, 5, 5, 2, 1, "#6d222a"); P(g, 9, 5, 2, 1, "#6d222a");        // deux boutons du capiton
        P(g, 5, 8, 2, 1, "#6d222a"); P(g, 9, 8, 2, 1, "#6d222a");
        P(g, 0, 8, 3, 8, W2); P(g, 13, 8, 3, 8, W2);                     // les ACCOUDOIRS : c'est eux qui font le fauteuil
        P(g, 0, 8, 3, 1, W4); P(g, 13, 8, 3, 1, W4);
        P(g, 2, 13, 12, 4, CL); P(g, 2, 13, 12, 1, "#a8434d");           // l'assise
        return c;
      }
      /* LA PLANCHE À DESSIN du géomètre, en deux moitiés empilées (la rangée du
         fond, puis celle du devant) — même procédé que le siège du juge, à la
         verticale. ⚠️ ELLE EST INCLINÉE, et c'est tout ce qui la distingue d'une
         table : une planche à plat est une table, et le bureau du géomètre
         redevient un bureau quelconque. */
      case "draftTable": {
        const [c, g] = cv(16, 26);
        P(g, 0, 6, 16, 14, "#e8e2d0"); P(g, 0, 6, 16, 2, "#f6f2e6");     // le papier, vu de haut
        P(g, 0, 4, 16, 2, W2); P(g, 0, 4, 16, 1, W4);                    // le tasseau du haut
        P(g, 2, 9, 12, 1, "#9fb4c6"); P(g, 2, 13, 9, 1, "#9fb4c6");      // le tracé
        P(g, 2, 17, 11, 1, "#9fb4c6"); P(g, 5, 9, 1, 9, "#c2707a");
        return c;
      }
      case "draftTable2": {
        const [c, g] = cv(16, 22);
        P(g, 0, 0, 16, 9, "#dcd6c4"); P(g, 0, 8, 16, 2, W3);             // le bas de la planche
        P(g, 0, 10, 16, 3, W2); P(g, 0, 10, 16, 1, W4);                  // la traverse
        P(g, 2, 13, 2, 8, W1); P(g, 12, 13, 2, 8, W1);                   // les pieds
        P(g, 2, 16, 12, 1, W3);                                          // l'entretoise
        P(g, 6, 2, 6, 1, "#9fb4c6"); P(g, 6, 5, 4, 1, "#c2707a");
        return c;
      }
      case "clerkNPC": {
        /* L'HÔTESSE D'ACCUEIL. ⚠️ ELLE EST DESSINÉE COMME LES HABITANTS DE LA
           VILLE, pas comme un meuble : même gabarit de 16 de large, mêmes
           proportions de tête, même palette de peau. Un guichet tenu par une
           silhouette d'un autre style dirait « objet interactif » au lieu de
           « quelqu'un », et c'est tout ce qu'on ne veut pas ici.
           ⚠️ ON NE VOIT QU'ELLE À MI-CORPS : le comptoir est devant, en case
           `iy + 2`, et il coupe la case du dessous. Dessiner des jambes qui
           seraient toujours cachées, c'est dessiner pour personne. */
        const SK = "#e8c39a", SK2 = "#d3a87f", HAIR = "#4a3326", BL = "#3b4a6b", BL2 = "#2c3a55";
        const [c, g] = cv(16, 26);
        P(g, 4, 12, 8, 13, BL); P(g, 4, 12, 8, 1, "#4c5f85");        // le buste, veste bleue
        P(g, 3, 14, 2, 8, BL2); P(g, 11, 14, 2, 8, BL2);             // les bras, un ton plus bas
        P(g, 6, 12, 4, 6, "#f2efe6");                                 // le col ouvert, chemise claire
        P(g, 7, 15, 2, 2, "#c8a45a");                                 // le badge de la commune
        P(g, 5, 3, 6, 8, SK); P(g, 5, 3, 3, 8, "#f0cfa8");            // le visage, éclairé à gauche
        P(g, 10, 5, 1, 6, SK2);                                       // l'ombre du côté droit
        P(g, 4, 1, 8, 4, HAIR); P(g, 3, 3, 2, 7, HAIR); P(g, 11, 3, 2, 7, HAIR);
        P(g, 4, 1, 5, 1, "#5d4232");                                  // le reflet des cheveux
        P(g, 6, 6, 1, 1, "#2a2018"); P(g, 9, 6, 1, 1, "#2a2018");     // les yeux
        P(g, 7, 9, 2, 1, "#b4705f");                                  // la bouche
        return c;
      }
      case "justice": case "justice2": {
        // LA JUSTICE, au fond du hall — deux cases, comme le siège du juge.
        const right = kind === "justice2";
        const [c, g] = cv(16, 48);
        P(g, 0, 40, 16, 7, SD); P(g, 0, 40, 16, 2, S);
        P(g, right ? 0 : 2, 32, 14, 9, S); P(g, right ? 0 : 2, 32, 14, 1, SL);
        if (!right) {
          P(g, 8, 12, 8, 21, SL); P(g, 8, 12, 3, 21, "#f0ece0");          // le drapé
          g.fillStyle = SL; g.beginPath(); g.arc(13, 9, 4, 0, 7); g.fill();
          P(g, 9, 6, 8, 3, "#d8d2c2");                                     // le bandeau sur les yeux
          P(g, 4, 18, 5, 2, SL);                                           // le bras qui tient la balance
        } else {
          P(g, 0, 12, 6, 21, S); P(g, 0, 12, 2, 21, SL);
          P(g, 5, 16, 4, 2, S);
          P(g, 8, 4, 1, 14, BR);                                           // le fléau de la balance
          P(g, 4, 4, 10, 1, BR);
          P(g, 3, 5, 1, 4, BR); P(g, 14, 5, 1, 4, BR);
          P(g, 1, 9, 5, 1, BR); P(g, 12, 9, 5, 1, BR);                     // les deux plateaux
        }
        return c;
      }
      /* ══════════════════════════════════════════════════════════════════════
         ZIP 441 — L'ÉGLISE.
         ⚠️ TOUS ces dessins suivent la règle du 438 : ON N'APPLIQUE PAS UNE
         TEXTURE À UNE SILHOUETTE, on empile des MASSES PLEINES, chacune avec sa
         ligne éclairée en haut et son ombre en bas. Aucun pixel n'est tiré au
         hasard, et le contour sort tout seul de l'empilement.
         ⚠️ ET LA LUMIÈRE VIENT DE LA GAUCHE PARTOUT, comme dans tout le reste du
         fichier : un seul meuble éclairé de l'autre côté et la pièce entière a
         l'air fausse sans qu'on sache dire lequel. */
      case "altar": case "altar2": {
        /* L'AUTEL, deux cases — comme la statue de la Justice et la maquette de
           la ville. ⚠️ LA CROIX EST À CHEVAL SUR LA COUTURE : elle est centrée
           sur l'axe de la nef, qui tombe ENTRE les deux cases. Chaque moitié en
           dessine la sienne ; dessinée en entier d'un seul côté, elle serait
           décalée d'une demi-case, et c'est exactement le défaut de la maquette
           de la mairie au 439 — invisible sur l'objet, flagrant sur la nef. */
        const right = kind === "altar2";
        const [c, g] = cv(16, 34);
        P(g, right ? 0 : 1, 24, 15, 8, S); P(g, right ? 0 : 1, 24, 15, 1, SL);   // le massif de pierre
        P(g, right ? 0 : 1, 31, 15, 2, SD);
        P(g, right ? 0 : 1, 20, 15, 5, LN); P(g, right ? 0 : 1, 20, 15, 1, "#fffaf0"); // la nappe
        P(g, right ? 0 : 1, 24, 15, 1, LND);
        // Le parement brodé qui tombe devant : trois plis, du même or que les
        // objets du culte — c'est lui qui dit « autel » et pas « table ».
        for (let k = 0; k < 3; k++) P(g, (right ? 1 : 3) + k * 4, 25, 2, 6, GO);
        /* ⚠️ LA CROIX MONTE PLUS HAUT QUE LE SPRITE NE SEMBLE LE DEMANDER, et
           c'est mesuré sur la planche : posée à mi-hauteur, elle se noyait dans
           le fond du chœur et l'autel se lisait comme une caisse blanche. Le
           point de fuite d'une nef doit être visible depuis la porte, à vingt
           cases — donc la seule question est « la voit-on de loin », pas « fait-
           elle la bonne taille de près ». */
        if (!right) {
          P(g, 13, 2, 3, 20, GO); P(g, 13, 2, 1, 20, GOL);        // le montant, moitié gauche
          P(g, 9, 7, 7, 3, GO); P(g, 9, 7, 7, 1, GOL);            // la traverse
          P(g, 9, 9, 7, 1, GOD);
          P(g, 6, 15, 3, 5, WX); P(g, 7, 12, 1, 3, FL);            // un cierge d'autel
        } else {
          P(g, 0, 2, 3, 20, GOD); P(g, 0, 2, 1, 20, GO);
          P(g, 0, 7, 7, 3, GOD); P(g, 0, 7, 7, 1, GO);
          P(g, 0, 0, 3, 2, GOL);                                   // le sommet de la croix
          P(g, 7, 15, 3, 5, WX); P(g, 8, 12, 1, 3, FL);
        }
        return c;
      }
      case "candlestick": {
        // Le grand chandelier de chœur : un fût de bronze, une bobèche, une
        // flamme. Trois masses, pas une de plus — à seize pixels, un chandelier
        // détaillé devient une tache.
        const [c, g] = cv(16, 30);
        P(g, 5, 26, 6, 3, GOD); P(g, 5, 26, 6, 1, GO);            // le pied
        P(g, 7, 12, 2, 14, GO); P(g, 7, 12, 1, 14, GOL);           // le fût
        P(g, 5, 11, 6, 2, GO); P(g, 5, 11, 6, 1, GOL);             // la bobèche
        /* ⚠️ LA CIRE EST CERNÉE, ET C'EST UNE CORRECTION VUE EN JEU. Un cierge
           blanc sur le marbre PÂLE du chœur disparaissait : les deux chandeliers
           du chœur, pourtant rigoureusement symétriques dans les données, n'en
           avaient l'air que d'un côté — selon la dalle qui passait derrière. Ce
           qui manquait n'était pas du contraste, c'était un CERNE : la règle du
           438 (on assemble des masses CERNÉES) vaut aussi contre un fond clair,
           pas seulement contre un fond sombre. */
        P(g, 6, 4, 4, 8, "#8f8878");                               // le cerne
        P(g, 7, 5, 2, 6, WX); P(g, 7, 5, 1, 6, "#fffaf0");         // la cire
        P(g, 7, 2, 2, 3, FL); P(g, 7, 2, 1, 2, FLC);               // la flamme
        return c;
      }
      case "paschal": {
        // Le cierge pascal : plus haut, plus gros, sur son trépied. Il RÉPOND à
        // l'ambon de l'autre côté de l'allée (voir churchBuild) — c'est sa
        // raison d'être, une paire qui tient l'axe.
        const [c, g] = cv(16, 34);
        P(g, 4, 30, 8, 3, GOD); P(g, 4, 30, 8, 1, GO);
        P(g, 6, 18, 4, 12, GOD); P(g, 6, 18, 1, 12, GO);
        P(g, 4, 16, 8, 3, GO); P(g, 4, 16, 8, 1, GOL);
        P(g, 5, 4, 6, 13, "#8f8878");                              // le cerne (voir `candlestick`)
        P(g, 6, 5, 4, 11, WX); P(g, 6, 5, 1, 11, "#fffaf0"); P(g, 9, 5, 1, 11, WXD);
        P(g, 7, 8, 2, 1, GO); P(g, 7, 11, 2, 1, GO);               // les cinq grains d'encens
        P(g, 7, 1, 2, 4, FL); P(g, 7, 1, 1, 3, FLC);
        return c;
      }
      case "choirStall": {
        // La stalle : un banc à haut dossier et à joue pleine. C'est la JOUE
        // qui la distingue d'un banc de nef, pas le dossier.
        const [c, g] = cv(16, 30);
        P(g, 1, 22, 14, 5, DK2); P(g, 1, 22, 14, 1, DK4);          // l'assise
        P(g, 0, 4, 16, 18, DK1); P(g, 0, 4, 16, 1, DK4);           // le dossier
        P(g, 2, 8, 12, 10, DK3);                                    // le panneau creusé
        P(g, 0, 16, 3, 11, DK2); P(g, 0, 16, 1, 11, DK4);          // la joue
        P(g, 1, 27, 14, 2, DK3);
        return c;
      }
      case "candleRack": {
        /* LE RÂTELIER À CIERGES. ⚠️ IL EST DESSINÉ ÉTEINT, ET C'EST VOULU : le
           nombre de cierges allumés est PARTAGÉ entre les joueurs (décision de
           Guillaume au 441), donc il change. Cuire des flammes dans le sprite
           voudrait dire treize sprites, ou un sprite qui ment. Le rendu peint
           les flammes par-dessus, vivantes — c'est la règle du nom du maire
           (439) et des enseignes de la ville (427). */
        const [c, g] = cv(16, 28);
        P(g, 2, 24, 12, 3, IR); P(g, 2, 24, 12, 1, "#55555e");     // le socle
        P(g, 7, 16, 2, 8, IR);                                      // le pied
        P(g, 1, 13, 14, 3, IR); P(g, 1, 13, 14, 1, "#55555e");     // le plateau haut
        P(g, 3, 19, 10, 2, IR); P(g, 3, 19, 10, 1, "#55555e");     // le plateau bas
        // Les godets, vides : deux rangs de six, qui donnent au rendu où poser
        // les flammes sans qu'il ait à deviner (voir CHURCH_CANDLE_MAX = 12).
        for (let k = 0; k < 6; k++) {
          P(g, 2 + k * 2, 10, 1, 3, WXD);
          P(g, 2 + k * 2, 17, 1, 2, WXD);
        }
        return c;
      }
      case "prieDieu": {
        const [c, g] = cv(16, 22);
        P(g, 3, 17, 10, 4, DK2); P(g, 3, 17, 10, 1, DK4);          // l'agenouilloir
        P(g, 4, 6, 8, 11, DK1); P(g, 4, 6, 8, 1, DK4);             // le pupitre
        P(g, 5, 8, 6, 3, LN);                                       // le livre ouvert
        P(g, 3, 20, 10, 1, DK3);
        return c;
      }
      case "confessional": case "confessional2": {
        /* LE CONFESSIONNAL, deux cases EN HAUTEUR (une au nord, une au sud) et
           non en largeur : c'est une armoire, elle est plus haute que large, et
           le seul moyen de le montrer d'en haut est de lui donner deux cases de
           profondeur. Le nord porte le fronton, le sud la porte et le rideau. */
        const top = kind === "confessional";
        const [c, g] = cv(16, top ? 30 : 24);
        if (top) {
          P(g, 1, 6, 14, 24, DK1); P(g, 1, 6, 14, 1, DK4);
          P(g, 0, 2, 16, 5, DK2); P(g, 0, 2, 16, 1, DK4);          // la corniche
          P(g, 6, 0, 4, 3, GO); P(g, 7, 0, 2, 1, GOL);              // la petite croix du fronton
          P(g, 3, 10, 10, 12, DK3);                                 // le panneau du fond
        } else {
          P(g, 1, 0, 14, 22, DK1);
          P(g, 2, 1, 5, 18, DK3); P(g, 9, 1, 5, 18, DK3);          // les deux battants
          P(g, 3, 3, 3, 8, CL);                                     // le rideau du pénitent
          // La grille, en croisillons pleins : quatre traits, pas une trame.
          for (let k = 0; k < 3; k++) P(g, 10, 3 + k * 3, 3, 1, "#241608");
          P(g, 11, 3, 1, 8, "#241608");
          P(g, 1, 21, 14, 2, DK3);
        }
        return c;
      }
      case "font": {
        // Les fonts baptismaux : une vasque octogonale sur son pied. L'eau est
        // la seule tache froide de tout le mobilier — c'est ce qui l'isole.
        const [c, g] = cv(16, 26);
        P(g, 4, 21, 8, 4, SD); P(g, 4, 21, 8, 1, S);               // le socle
        P(g, 6, 13, 4, 8, S); P(g, 6, 13, 1, 8, SL);               // le pied
        P(g, 2, 7, 12, 7, S); P(g, 2, 7, 12, 1, SL); P(g, 2, 13, 12, 1, SD);
        P(g, 3, 6, 10, 2, SL);                                      // la lèvre
        P(g, 4, 8, 8, 3, "#5c86a8"); P(g, 4, 8, 8, 1, "#8fb6cc");  // l'eau
        return c;
      }
      case "pulpit": {
        // La chaire : une cuve en encorbellement, un abat-voix au-dessus, un
        // départ d'escalier. Trois masses, et l'abat-voix est ce qui la rend
        // reconnaissable d'un coup d'œil.
        const [c, g] = cv(16, 40);
        P(g, 3, 24, 10, 13, DK1); P(g, 3, 24, 10, 1, DK4);         // la cuve
        P(g, 4, 27, 8, 7, DK3);
        P(g, 5, 28, 6, 5, GO); P(g, 5, 28, 6, 1, GOL);             // le panneau doré
        P(g, 1, 33, 3, 6, DK2); P(g, 1, 33, 3, 1, DK4);            // la volée
        P(g, 2, 20, 12, 4, DK2); P(g, 2, 20, 12, 1, DK4);          // l'abat-voix
        P(g, 6, 16, 4, 4, DK1);
        P(g, 3, 37, 10, 2, DK3);
        return c;
      }
      case "saintNiche": {
        // La niche : un enfoncement de pierre et une petite statue peinte.
        const [c, g] = cv(16, 34);
        P(g, 1, 4, 14, 29, SD); P(g, 1, 4, 14, 1, S);
        P(g, 3, 7, 10, 24, "#6e6a60");                              // le fond, dans l'ombre
        P(g, 2, 2, 12, 3, S); P(g, 2, 2, 12, 1, SL);               // le larmier
        P(g, 6, 16, 4, 13, "#4a6fa0"); P(g, 6, 16, 1, 13, "#6f92c0"); // le manteau
        g.fillStyle = "#e8c39a"; g.beginPath(); g.arc(8, 14, 2, 0, 7); g.fill();
        P(g, 5, 11, 6, 2, GOL);                                     // l'auréole
        return c;
      }
      case "stoup": {
        const [c, g] = cv(16, 16);
        P(g, 5, 10, 6, 5, S); P(g, 5, 10, 6, 1, SL); P(g, 5, 14, 6, 1, SD);
        P(g, 6, 7, 4, 4, S); P(g, 6, 7, 1, 4, SL);
        P(g, 6, 8, 4, 2, "#5c86a8"); P(g, 6, 8, 4, 1, "#8fb6cc");
        return c;
      }
      case "organ": case "organWing": {
        /* LE BUFFET D'ORGUE. ⚠️ CE SONT DEUX DESSINS ET UN SEUL OUVRAGE : les
           TOURELLES (`organWing`) portent les tuyaux graves, hauts ; les
           PLATES-FACES (`organ`) portent les aigus, plus courts. C'est cette
           alternance haut/bas/bas/haut, et elle seule, qui fait qu'on reconnaît
           un orgue et pas une bibliothèque — un buffet à tuyaux tous égaux se
           lit comme une clôture. Quatre cases : tourelle, plate-face,
           plate-face, tourelle, symétriques sur l'axe de la nef. */
        /* ⚠️ IL EST HAUT, ET C'EST MESURÉ SUR LA PLANCHE, PAS CHOISI. À 56/44 px
           il sortait de `eglise-tribune.png` comme un harmonium posé au fond
           d'un couloir : quatre cases de large pour une tribune de vingt, ça ne
           dit rien. Un buffet d'orgue EST le fond de sa tribune — il monte
           jusqu'à la voûte, et c'est la seule chose qui fasse comprendre à quoi
           sert cet étage quand on y débouche. */
        const wing = kind === "organWing";
        const H = wing ? 84 : 66;
        const [c, g] = cv(16, H);
        P(g, 0, H - 10, 16, 9, DK1); P(g, 0, H - 10, 16, 1, DK4);  // le soubassement
        P(g, 0, H - 2, 16, 2, DK3);
        P(g, 0, 8, 16, H - 18, DK2); P(g, 0, 8, 16, 1, DK4);       // la caisse
        P(g, 1, 10, 14, H - 22, DK3);                               // l'ombre du dedans
        // Les tuyaux : des masses pleines à liseré clair, en montant vers le
        // milieu de la tourelle et en descendant sur la plate-face.
        for (let k = 0; k < 5; k++) {
          const d = wing ? Math.abs(k - 2) : k % 2;
          const ph = (wing ? H - 26 : H - 28) - d * 5;
          const px = 1 + k * 3, py = 10 + ((wing ? H - 26 : H - 28) - ph);
          P(g, px, py, 2, ph, PI);
          P(g, px, py, 1, ph, PIL);
          P(g, px, py, 2, 2, PID);                                  // la bouche du tuyau
        }
        P(g, 0, 4, 16, 5, DK2); P(g, 0, 4, 16, 1, DK4);            // la corniche
        if (wing) { P(g, 5, 0, 6, 4, GO); P(g, 6, 0, 4, 1, GOL); } // l'ornement de tourelle
        return c;
      }
      case "organBench": {
        const [c, g] = cv(16, 16);
        P(g, 2, 8, 12, 4, DK2); P(g, 2, 8, 12, 1, DK4);
        P(g, 3, 12, 2, 3, DK3); P(g, 11, 12, 2, 3, DK3);
        return c;
      }
      case "bellRope": {
        // La corde de cloche : elle descend du haut du canevas — donc du hors-
        // champ — et se termine par la « sally » de laine rouge et blanche. Une
        // corde qui commence dans le vide dit qu'il y a quelque chose au-dessus,
        // ce qu'aucun plafond dessiné ne peut faire vu de dessus.
        const [c, g] = cv(16, 34);
        P(g, 7, 0, 2, 22, "#b8a684"); P(g, 7, 0, 1, 22, "#d6c8a8");
        for (let k = 0; k < 4; k++) { P(g, 6, 22 + k * 3, 4, 2, "#e8e2d0"); P(g, 6, 23 + k * 3, 4, 1, CL); }
        P(g, 7, 33, 2, 1, "#8a7a5c");
        return c;
      }
      /* ═══════════════════════════════════════════════════════════════════
         ZIP 444 — LE BEFFROI. Quatre dessins.
         ───────────────────────────────────────────────────────────────────
         ⚠️ MÊME PALETTE QUE LE TRIBUNAL ET L'ÉGLISE (bois mat, pierre, bronze) :
         la ville qui a meublé le palais a coulé cette cloche aussi. Deux
         vocabulaires de dessin dans le même bâtiment se lisent comme deux jeux
         — c'est ce que disait déjà le 438 en donnant à la mairie le gabarit du
         tribunal, et le 441 en reprenant `pew` et `railing` tels quels. */
      case "greatBell": case "greatBell2": {
        /* LA CLOCHE, en DEUX MOITIÉS posées côte à côte par le générateur —
           comme la statue de la Justice et l'armoire des scellés. Rien dans le
           rendu n'a besoin de connaître un meuble à cheval sur deux cases.

           ⚠️⚠️ DEUXIÈME ÉCRITURE : LE PREMIER JET NE LISAIT PAS COMME UNE CLOCHE.
           Il empilait des bandes dont la largeur décroissait par PALIERS (4, 3,
           2, 2, 1, 1, 0, 0) — sur la planche, ça donnait un rectangle vert à
           épaulement, quelque part entre une lanterne et une borne. Tous les
           contrôles passaient. Ce qui manquait est une grandeur qu'aucun banc de
           ce dépôt ne mesure : **le PROFIL**. Une cloche n'a pas une silhouette
           qui rétrécit, elle a une silhouette qui S'ÉVASE en accélérant — le
           cerveau étroit, la robe qui gonfle, la faussure qui repart vers le
           bas, et une lèvre franchement plus large que tout le reste. C'est une
           COURBE, et une courbe ne s'écrit pas en paliers choisis à la main.
           ⚠️ La demi-largeur est donc calculée : `hw(t) = 2,2 + 5,8·t^1,9`, une
           puissance supérieure à 1 pour que l'évasement s'accélère vers le bas.
           À exposant 1, on retombe sur un cône — c'est-à-dire un abat-jour.

           ⚠️ ELLE FAIT ~40 PIXELS DE HAUT, soit ×1,7 un fermier : une cloche de
           volée, pas une clochette. Le canevas est dimensionné sur ce qui
           DÉPASSE (piège n°1 des sprites, 433).
           ⚠️ LE BRONZE EST VERT-DE-GRIS, PAS DORÉ. Une cloche de cent ans est
           verte ; dorée, elle aurait l'air neuve, et toute la scène finale
           repose sur le fait qu'elle est là depuis longtemps. */
        const right = kind === "greatBell";
        const [c, g] = cv(16, 40);
        const BZ = "#5f7a5a", BZL = "#8aa87d", BZD = "#3c5239", BZE = "#243325";
        /* ⚠️⚠️ TROISIÈME RÉGLAGE : LE PROFIL ÉTAIT BON, LES PROPORTIONS ÉTAIENT
           FAUSSES. Le jet 2 s'évasait bien, mais sur 28 rangées pour 8 pixels de
           demi-largeur — 40 de haut pour 16 de large, soit 2,5:1. À l'écran :
           un sapin sur un pied, ou une fontaine. **Une cloche est à peu près
           aussi large que haute** (32 × 34 ici, les deux moitiés réunies), et
           c'est la première chose qu'on lit ; le profil ne vient qu'après.
           ⚠️ ET LE MOUTON EST POSÉ SUR L'ÉPAULE, PAS AU-DESSUS. Le jet 2 laissait
           trois rangées de vide entre la pièce de bois et le cerveau : ça
           dessinait un COU, et une cloche à cou est une lampe. */
        const Y0 = 9, Y1 = 33;                       // du cerveau à la faussure
        const hwAt = (y) => {
          const t = Math.max(0, Math.min(1, (y - Y0) / (Y1 - Y0)));
          return 4.5 + 11.0 * Math.pow(t, 1.7);
        };
        // Le mouton (la pièce de bois) et les anses, directement sur l'épaule.
        P(g, right ? 0 : 6, 2, 10, 4, "#6f4a24"); P(g, right ? 0 : 6, 2, 10, 1, "#8f6a3c");
        P(g, right ? 1 : 12, 6, 3, 3, BZD); P(g, right ? 1 : 12, 6, 3, 1, BZ);
        /* La robe. ⚠️ ON PEINT DES RANGÉES PLEINES ET ON CERNE — on ne trace pas
           un contour qu'on remplit (438). Le jour vient de l'ouest : la moitié
           gauche porte la lumière, la droite l'ombre. */
        for (let y = Y0; y <= Y1; y++) {
          const hw = Math.round(hwAt(y));
          const x0 = right ? 0 : 16 - hw, w = hw;
          P(g, x0, y, w, 1, BZ);
          if (right) { P(g, 0, y, 1, 1, BZL); P(g, w - 1, y, 1, 1, BZD); }
          else { P(g, 16 - hw, y, 2, 1, BZL); P(g, 15, y, 1, 1, BZ); }
        }
        /* La LÈVRE : plus large que la robe, et plus sombre. C'est le trait qui
           fait lire « cloche » avant tout le reste — sans lui, la robe se
           termine en cône. */
        const lipHw = Math.min(16, Math.round(hwAt(Y1)) + 1);
        for (let y = Y1 + 1; y <= Y1 + 3; y++) {
          const x0 = right ? 0 : 16 - lipHw;
          P(g, x0, y, lipHw, 1, y === Y1 + 1 ? BZD : BZE);
        }
        // Deux filets de moulure et l'inscription, réduite à des ENTAILLES : pas
        // un caractère cuit dans un sprite (§4 — ni bilingue, ni rastérisable).
        for (const my of [Y0 + 12, Y0 + 14]) {
          const hw = Math.round(hwAt(my));
          P(g, right ? 0 : 16 - hw, my, hw, 1, BZE);
        }
        for (let k = 0; k < 3; k++) {
          const my = Y0 + 17, hw = Math.round(hwAt(my));
          P(g, (right ? 1 : 16 - hw + 1) + k * 3, my, 2, 2, BZE);
        }
        /* ⚠️ LE CERNE FAIT LE FLANC, ET IL SERT AUSSI CONTRE UN FOND CLAIR (441) :
           le beffroi a un plancher de bois clair, et une cloche sans cerne s'y
           fond exactement comme les cierges du chœur sur leur marbre. */
        for (let y = Y0; y <= Y1; y++) {
          const hw = Math.round(hwAt(y));
          P(g, right ? hw - 1 : 16 - hw, y, 1, 1, BZE);
        }
        // Le battant, sous la lèvre, une seule fois (moitié gauche).
        if (!right) { P(g, 13, Y1 + 4, 3, 3, "#3a3a42"); P(g, 14, Y1 + 5, 2, 2, "#55555f"); }
        return c;
      }
      case "bellFrame": {
        /* UNE JAMBE DE FORCE du beffroi de bois. ⚠️ ELLE MONTE JUSQU'AU HAUT DU
           CANEVAS parce qu'elle porte la poutre : un montant qui s'arrête à
           mi-hauteur ne porte rien, et vu de dessus c'est exactement ce qui fait
           qu'une charpente a l'air posée au lieu d'être construite. */
        const [c, g] = cv(16, 38);
        P(g, 4, 1, 8, 33, W1); P(g, 4, 1, 3, 33, W2); P(g, 11, 1, 1, 33, W3);
        // L'écharpe en diagonale, en marches : c'est ce qui dit « charpente ».
        for (let k = 0; k < 9; k++) P(g, 12 - k, 8 + k * 3, 3, 3, W1);
        for (let k = 0; k < 9; k++) P(g, 12 - k, 8 + k * 3, 1, 3, W2);
        // Les chevilles de bois, et le pied qui s'élargit.
        for (const cy2 of [6, 16, 26]) P(g, 6, cy2, 2, 2, "#4a3018");
        P(g, 2, 34, 12, 3, W3); P(g, 2, 34, 12, 1, W1);
        P(g, 1, 37, 14, 1, "rgba(20,26,16,0.30)");
        return c;
      }
      case "ringerBoard": {
        /* LE TABLEAU DU SONNEUR : une planche clouée au mur avec les tirages de
           volée. ⚠️ DES LIGNES, PAS DES MOTS (§4). Ce qu'on lit est écrit vivant
           au rendu, jamais cuit — sinon le sprite n'est plus rastérisable hors
           navigateur et il ne peut pas être bilingue. */
        const [c, g] = cv(16, 22);
        P(g, 1, 2, 14, 16, W1); P(g, 1, 2, 14, 1, W2); P(g, 1, 17, 14, 1, W3);
        P(g, 0, 1, 16, 1, W3); P(g, 0, 18, 16, 1, W3);      // le cerne
        P(g, 3, 5, 10, 9, "#e6dfc8"); P(g, 3, 5, 10, 1, "#f4efe0");
        for (let k = 0; k < 4; k++) P(g, 4, 7 + k * 2, 6 + (k % 2) * 2, 1, "#7a7466");
        for (const [nx, ny] of [[2, 3], [13, 3], [2, 16], [13, 16]]) P(g, nx, ny, 1, 1, "#3c3c44");
        P(g, 1, 19, 14, 2, "rgba(20,26,16,0.26)");
        return c;
      }
      default: {
        const [c, g] = cv(16, 16);
        P(g, 2, 2, 12, 12, "#c83c9c");   // rose criard : un `kind` inconnu doit SE VOIR
        return c;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ZIP 444 — LA QUÊTE DE L'ÉTOILE : LES DESSINS DE PLEIN AIR.
     ───────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ `tools/render-etoile.mjs` A ÉTÉ ÉCRIT AVANT LE PREMIER `fillRect`, et
     c'est le corollaire du §4.2 de `CLAUDE.md` : *« ce dessin est-il regardable
     par un banc ? » est une question de QUALITÉ, et elle se pose avant de
     dessiner.* Les sols du tribunal ont vécu douze zips au niveau du 426
     uniquement parce qu'aucun banc ne pouvait les appeler.

     ⚠️ CE QUI GOUVERNE CETTE FAMILLE, C'EST QU'ELLE ÉMET DE LA LUMIÈRE, et rien
     dans ce dépôt n'en émettait encore. Trois conséquences :
       1. **le CERNE est obligatoire et il est SOMBRE** — une étoile blanche sur
          un mur de pierre pâle disparaît, et le 441 l'a payé sur les cierges du
          chœur (« ce qui manquait n'était pas du contraste, c'était un cerne ») ;
       2. **le halo est peint AUTOUR, jamais par-dessus** : un `fillRect` teinté
          sur un sprite dessine une boîte (§4), et un halo qui mange sa propre
          source donne une tache, pas une lumière ;
       3. **la source reste la partie la plus CLAIRE et la plus PETITE.** Un
          dégradé qui s'élargit sans monter en valeur se lit comme du brouillard.
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── L'ÉTOILE COMPAGNON. Quatre poses (la respiration) × trois états.
     ⚠️ ELLE EST PETITE — 13 px, soit ×0,54 un fermier de 24. Un décor ne se juge
     pas contre d'autres décors, il se juge contre le personnage qui s'en sert
     (429) : à la taille d'une tête elle devient un familier, à la taille d'un
     poing elle reste quelque chose qu'on protège. Le texte le dit d'ailleurs
     (« smaller than a hen »), et un dessin qui contredit son texte ment deux
     fois.
     ⚠️ ELLE N'A PAS DE BRANCHES GÉOMÉTRIQUES. Une étoile à cinq pointes tracée
     au compas est un pictogramme, pas une créature : on assemble un corps rond
     et QUATRE pointes molles de longueurs différentes, et la silhouette sort
     toute seule, festonnée (438). */
  function starWispSprite(pose, state, color, queen) {
    /* ⚠️⚠️⚠️ QUATRIÈME ÉCRITURE, ET C'EST UN CHANGEMENT DE CONSTRUCTION, PAS UN
       RÉGLAGE DE PLUS. Les trois premières tentatives ont produit, dans l'ordre :
       une ICÔNE de scintillement (quatre branches sur les axes), un BISCUIT À
       VISAGE (corps trop gros, rayons en bosses), puis une AMIBE (rayons décrits
       par un champ de distance qui les fait fondre dans le corps). Chaque fois,
       tous les contrôles du banc passaient.

       ⚠️ LA LEÇON EST DANS L'OUTIL, PAS DANS LES NOMBRES : **un champ de
       distance ne sait pas faire une pointe à quatorze pixels.** Il fait des
       masses molles — ce qui est exactement ce qu'on veut pour le cratère, neuf
       cases de large et organique, et exactement ce qu'on ne veut pas pour un
       personnage de la taille d'une main. Une pointe, c'est deux ARÊTES DROITES
       qui se rencontrent ; ça se décrit par un POLYGONE, et on le rastérise.
       C'est la même famille de leçon que « une courbe f(x) ne peut pas se
       replier » (437) : l'outil décide de ce qu'on peut dessiner.

       Ici : un polygone à cinq branches (dix sommets, rayon extérieur et rayon
       intérieur), donc des arêtes franches et des pointes qui finissent sur un
       pixel. Cinq est premier : la silhouette ne peut pas se replier sur une
       symétrie et redevenir un pictogramme. Les cinq rayons ont des longueurs
       INÉGALES qui changent avec la pose — c'est la respiration. */
    /* 465 — la reine possède sa propre trame 28 × 28. L'ancienne version
       agrandissait le 18 × 18 des petites à ×1,58 : même silhouette à l'écran,
       mais chaque pixel devenait un gros carré et aucune matière nouvelle ne
       pouvait apparaître. Ici la taille écran reste la même, la définition non. */
    const S = queen ? 28 : 18;
    const [c, g] = cv(S, S);
    const pal = {
      yellow: [["#fffdf2", "#ffe08a", "#eda43a", "#7a4a0e", "rgba(255,222,132,0.20)"],
               ["#fff8e4", "#f2ce7e", "#c98a34", "#66400c", "rgba(255,210,116,0.11)"],
               ["#dedad0", "#a8a49a", "#6e6a62", "#33302a", "rgba(200,196,186,0.05)"]],
      blue:   [["#f4fcff", "#8edcff", "#3aa8df", "#174d75", "rgba(100,205,255,0.20)"],
               ["#edf8ff", "#83c7e8", "#3d86ad", "#183f5a", "rgba(90,185,235,0.11)"],
               ["#d7e0e4", "#94a8b2", "#536d78", "#29383f", "rgba(170,205,220,0.05)"]],
      rose:   [["#fff8fc", "#ff9fd1", "#dc5b9f", "#712451", "rgba(255,130,205,0.20)"],
               ["#fff0f8", "#e895bd", "#aa517e", "#59243e", "rgba(235,120,185,0.11)"],
               ["#e0d6dc", "#ac929f", "#755363", "#3d2a33", "rgba(220,170,195,0.05)"]],
    }[color || "yellow"] || null;
    const [CORE, BODY, EDGE, RIM, HALO] = pal[state];
    const cx = queen ? 14 : 9, cy = queen ? 14.5 : 9.5;   // ⚠️ décalé d'un demi-pixel vers le bas : à cy = 9 la pointe haute touchait le bord du canevas, donc elle était rabotée en silence (piège n°1, 433)
    /* ⚠️ LE RAYON INTÉRIEUR EST CE QUI DÉCIDE DE TOUT. Trop petit, l'étoile est
       une croix maigre et il n'y a plus de place pour un visage ; trop grand,
       les pointes disparaissent et on retombe sur le biscuit. À 0,44 du rayon
       extérieur, le cœur fait six pixels de large — juste assez pour deux yeux —
       et les branches restent des branches. */
    /* ⚠️⚠️⚠️ ET VOICI LE VRAI COUPABLE DES QUATRE JETS PRÉCÉDENTS : **LE CERNE
       PAR DILATATION REBOUCHE LES ÉCHANCRURES.** À rayon intérieur 0,44, les
       creux entre deux branches faisaient deux pixels de profondeur ; le cerne
       ajoute un pixel DE CHAQUE CÔTÉ, donc il les comblait entièrement, et la
       silhouette rendue était un BLOB — quelles que soient les longueurs de
       branches, ce qui explique aussi pourquoi deux poses sortaient identiques
       au pixel près. Le dessin était juste, son contour le mangeait.
       ⚠️⚠️ ET LA PARADE ESSAYÉE — creuser plus fort (rayon intérieur 0,32) — A
       ÉCHOUÉ AUTREMENT : les échancrures apparaissent, mais le cœur tombe à
       quatre pixels de large, le visage n'y tient plus, et le banc voit des
       ÎLOTS FLOTTANTS à 4,6 % (les pointes se détachent du corps). C'est la
       cinquième tentative sur ce seul dessin, et la règle du chantier
       s'applique : **on s'arrête et on documente au lieu de boucler seul.**
       ⚠️ ÉTAT LIVRÉ : le rayon intérieur reste à 0,44. La silhouette est une
       masse ronde à cinq bosses molles avec un visage — une petite créature de
       lumière, lisible et attachante, mais qui ne lit PAS « étoile » d'emblée.
       Tous les contrôles passent. Ce qui reste à trancher est décrit dans
       `components/ferme/QUETE.md` §12, avec deux directions chiffrées.
       ⚠️ LA CONTRAINTE DE FOND, ET ELLE EST GÉNÉRALE : *un cerne d'un pixel
       impose une profondeur d'échancrure d'au moins trois pixels.* En dessous,
       le contour rebouche la forme qu'il est censé souligner. C'est vrai de
       toute dentelure à cette échelle, pas seulement d'une étoile. */
    const rot = -Math.PI / 2 + 0.22;                  // une pointe en haut, légèrement penchée
    /* ⚠️⚠️ LE SOUFFLE PORTE SUR LE RAYON D'ENSEMBLE, ET C'EST LA CONSÉQUENCE
       DIRECTE DU DÉFAUT CI-DESSUS : puisque le cerne rebouche les échancrures,
       faire varier les longueurs de branche NE CHANGE PAS la silhouette rendue —
       deux poses sortaient identiques au pixel près, et le banc l'a dit. La
       seule grandeur qui traverse encore la dilatation est la TAILLE. Elle
       respire donc de ±12 %, ce qui est de toute façon la bonne animation :
       une bestiole qui respire enfle et se creuse. */
    const BREATH = [1.00, 0.88, 1.12, 0.82][pose & 3];
    const R = (state === 1 ? (queen ? 7.1 : 4.4) : (queen ? 9.1 : 5.6)) * BREATH, r = R * (queen ? 0.48 : 0.44);
    /* Les cinq longueurs, par pose : quatre lignes réellement distinctes (le
       piège du jet 1, où deux poses sortaient identiques au pixel près). */
    /* ⚠️ L'ÉCART ENTRE DEUX POSES DOIT SURVIVRE À LA RASTÉRISATION. Premier jet
       à ±13 % : à ce rayon-là, deux poses tombaient sur les MÊMES pixels et le
       banc annonçait « 0 pixel d'écart ». Une différence qui ne franchit pas
       l'arrondi n'existe pas — c'est vrai d'une animation comme d'un seuil. */
    const PUFF = [[1.00, 0.70, 0.92, 0.62, 0.84], [0.66, 1.00, 0.64, 0.90, 0.68],
                  [0.88, 0.62, 1.00, 0.70, 0.98], [0.62, 0.86, 0.72, 1.00, 0.64]][pose & 3];
    /* ⚠️⚠️ ET UN SOUFFLE D'ENSEMBLE PAR-DESSUS, PARCE QUE LES LONGUEURS SEULES NE
       SUFFISENT PAS. Le banc a trouvé que les poses 0 et 2 sortaient IDENTIQUES
       au pixel près : leurs cinq longueurs étaient différentes mais leur somme
       ne l'était presque pas, et à ce rayon-là la rastérisation avalait l'écart.
       Un facteur global assure que les quatre images ont des TAILLES distinctes,
       ce qui est de toute façon la bonne animation : une bestiole qui respire
       enfle et se creuse, elle ne fait pas seulement remuer ses branches. */
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const a1 = rot + k * (Math.PI * 2 / 5);
      const a2 = a1 + Math.PI / 5;
      const rr = R * (state === 2 ? 0.72 : 1) * PUFF[k];
      pts.push([cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr]);
      pts.push([cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]);
    }
    const inside = (x, y) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    // 1. Le halo, AUTOUR, en deux couronnes — jamais par-dessus la source.
    g.fillStyle = HALO;
    g.beginPath(); g.arc(cx, cy, R + 2.2, 0, 7); g.fill();
    g.beginPath(); g.arc(cx, cy, R * 0.75, 0, 7); g.fill();
    // 2. Le cerne, par DILATATION du masque : impossible d'oublier une branche.
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (inside(x + 0.5, y + 0.5)) continue;
      let touch = false;
      for (let dy = -1; dy <= 1 && !touch; dy++) for (let dx = -1; dx <= 1; dx++)
        if (inside(x + dx + 0.5, y + dy + 0.5)) { touch = true; break; }
      if (touch) P(g, x, y, 1, 1, RIM);
    }
    /* 3. La matière. ⚠️ LE TON SUIT LA DISTANCE AU CENTRE, PAS LA FORME : c'est
       ce qui fait que les branches sont plus chaudes que le cœur, donc qu'elles
       se détachent, donc qu'on les lit comme des branches et pas comme un
       contour. Une étoile peinte d'un seul ton est un autocollant. */
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const d = Math.hypot(x + 0.5 - (cx - 0.9), y + 0.5 - (cy - 1.0));
      P(g, x, y, 1, 1, d > r + 1.4 ? EDGE : d > r * 0.55 ? BODY : CORE);
    }
    /* 4. LE VISAGE, DANS LE CŒUR. ⚠️ DES YEUX D'UN PIXEL DE LARGE : à 2×2 sur un
       cœur de six pixels ils mangeaient la face et la bestiole devenait un
       animal (jet 2). Un pixel de large, deux de haut, dans la moitié HAUTE — un
       œil au milieu d'une masse donne un ballon, un œil haut donne un front, et
       un front donne un être. */
    if (state === 2) {
      P(g, cx - (queen ? 4 : 2), cy, queen ? 3 : 2, 1, RIM);
      P(g, cx + 1, cy, queen ? 3 : 2, 1, RIM);                          // fermés
    } else {
      P(g, cx - (queen ? 4 : 2), cy - (queen ? 3 : 2), queen ? 2 : 1, queen ? 3 : 2, RIM);
      P(g, cx + (queen ? 2 : 1), cy - (queen ? 3 : 2), queen ? 2 : 1, queen ? 3 : 2, RIM);
      if (queen) {                                                      // reflets et pommettes : détail natif, pas pixels gonflés
        P(g, cx - 3, cy - 3, 1, 1, CORE); P(g, cx + 3, cy - 3, 1, 1, CORE);
        P(g, cx - 5, cy + 1, 1, 1, EDGE); P(g, cx + 4, cy + 1, 1, 1, EDGE);
      }
      if (state === 0) P(g, cx - (queen ? 2 : 1), cy + (queen ? 2 : 1), queen ? 4 : 2, 1, EDGE); // une bouche, calme seulement
    }
    if (queen && state === 0) {                                        // éclats intérieurs asymétriques
      P(g, cx - 6, cy - 5, 2, 1, CORE); P(g, cx + 5, cy - 1, 1, 2, CORE);
      P(g, cx - 1, cy - 7, 1, 2, CORE); P(g, cx + 2, cy + 5, 2, 1, EDGE);
    }
    return c;
  }

  /* 465 — une rampe nord-sud n'est pas un balustre est-ouest tourné de 90° :
     cette rotation coucherait aussi les poteaux. Elle a donc son dessin natif,
     avec deux montants verticaux et deux lisses qui fuient dans la profondeur. */
  function townRailNorthSouthSprite() {
    const [c, g] = cv(16, 25);
    const DARK = "#3e3840", EDGE = "#565057", BODY = "#8b8788", LIGHT = "#bcbbb0", TOP = "#efeeee";
    // ombre au pied, volontairement décentrée vers l'avant
    P(g, 7, 22, 7, 2, "rgba(38,31,38,0.34)");
    // lisses en profondeur : arête sombre, masse, reflet continu
    for (let i = 0; i < 11; i++) {
      const x = 6 + Math.floor(i * 0.28), y = 3 + i;
      P(g, x - 1, y, 4, 2, DARK); P(g, x, y, 3, 1, BODY); P(g, x, y, 1, 1, LIGHT);
      if (i >= 3) { P(g, x - 1, y + 5, 4, 2, EDGE); P(g, x, y + 5, 2, 1, BODY); }
    }
    // montant du fond
    P(g, 4, 1, 5, 3, DARK); P(g, 5, 1, 3, 2, TOP);
    P(g, 5, 3, 3, 13, DARK); P(g, 6, 4, 1, 11, LIGHT);
    P(g, 4, 15, 5, 2, DARK); P(g, 5, 15, 3, 1, BODY);
    // montant de face, plus bas à l'écran : c'est lui qui fixe l'orientation
    P(g, 8, 10, 5, 3, DARK); P(g, 9, 10, 3, 2, TOP);
    P(g, 9, 12, 3, 11, DARK); P(g, 10, 13, 1, 9, LIGHT);
    P(g, 8, 22, 5, 2, DARK); P(g, 9, 22, 3, 1, BODY);
    return c;
  }

  /* ── UN ÉCLAT. Quatre couleurs, une par note.
     ⚠️ IL EST ANGULEUX LÀ OÙ L'ÉTOILE EST RONDE, et c'est le sujet : un éclat
     est un MORCEAU, il a des arêtes. Les deux se lisent d'un coup d'œil comme
     appartenant à la même chose sans se confondre. */
  function starShardSprite(note) {
    const [c, g] = cv(14, 16);
    const HUE = [
      ["#fff4d0", "#ffd868", "#c08a1c", "#6a4a08"],   // 1 — or
      ["#eaf6ff", "#96ccf0", "#3a7ab0", "#173a58"],   // 2 — bleu d'eau
      ["#fff0f6", "#f0a8c8", "#b0507c", "#5a2038"],   // 3 — rose de verre
      ["#f2fff0", "#a8e8a0", "#4e9a52", "#204a24"],   // 4 — vert de cratère
    ][note & 3];
    const [CORE, BODY, EDGE, RIM] = HUE;
    g.fillStyle = "rgba(255,246,210,0.16)";
    g.beginPath(); g.arc(7, 8, 6.5, 0, 7); g.fill();
    // La silhouette : un éclat penché, décrit par ses RANGÉES (une masse, pas un
    // contour rempli — règle du 438).
    const rows = [[6, 2, 2], [5, 3, 3], [4, 4, 4], [3, 5, 5], [3, 6, 5], [2, 7, 6],
                  [2, 8, 5], [3, 9, 4], [3, 10, 3], [4, 11, 2], [5, 12, 1]];
    for (const [x, y, w] of rows) {
      P(g, x, y, w, 1, BODY);
      P(g, x, y, 1, 1, CORE);
      P(g, x + w - 1, y, 1, 1, EDGE);
    }
    // ⚠️ LE CERNE FAIT LE TOUR, PARCE QU'UN ÉCLAT SE POSE AUSSI BIEN SUR DU
    // SABLE CLAIR QUE DANS L'EAU NOIRE (441).
    for (const [x, y, w] of rows) { P(g, x - 1, y, 1, 1, RIM); P(g, x + w, y, 1, 1, RIM); }
    P(g, 6, 1, 2, 1, RIM); P(g, 4, 13, 2, 1, RIM);
    P(g, 3, 14, 8, 2, "rgba(20,26,16,0.22)");     // l'ombre portée, une seule
    return c;
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — LE SILLON : UN VRAI IMPACT, PAS UNE TEXTURE DE TERRE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ DEMANDE DE GUILLAUME : « que l'impact ait une vraie physique, un peu
     comme le cratère sur valley town. » Le dessin d'avant était une bande de
     96×34 peinte à plat : de la terre plus foncée, un liseré au nord, et rien
     d'autre — aucun relief, aucune ombre calculée, aucune fissure, et **on
     marchait dessus comme sur de l'herbe**. À côté du cratère du 446, qui décrit
     une HAUTEUR, en prend la PENTE et l'éclaire, c'était le §2 du piège n°1
     (« il fait vieillir ») pris la main dans le sac : le cratère avait un banc
     qui le regardait, le sillon n'en avait aucun.
     ⚠️⚠️ ON REPREND DONC LE MODÈLE DU CRATÈRE, PAS SON DESSIN : une hauteur
     `furrowH(x, y)` en cases, sa pente par différences finies, un Lambert éclairé
     de l'ouest-haut, des paliers de valeur, un bourrelet, des fissures qui
     débordent. Ce qui CHANGE est la géométrie, et elle raconte autre chose : le
     cratère est un trou rond (ça tombe droit), le sillon est une balafre qui
     s'enfonce d'est en ouest et finit dans une cuvette (ça a labouré et ça s'est
     arrêté). Le sens de la course, la profondeur croissante et l'azimut de la
     chute (`starFallAngle`, 448) disent tous les trois la même chose.
     ⚠️ ET IL SE PEINT AVEC LES TUILES, PLUS DANS LA FILE DE TRI. C'est la
     conséquence de tout ce qui précède : un décor qu'on TRAVERSE se range par
     ancrage au sol, un décor dans lequel on DESCEND est un décal de sol. Le
     cratère l'avait compris au 444 ; le sillon l'apprend ici. */
  const FURROW_SQUASH = 0.82;          // vu de trois quarts, comme le cratère
  /* La géométrie, en CASES, relative à l'ancre. ⚠️ TOUT EST DÉRIVÉ DES CONSTANTES :
     un nombre recopié ici mentirait au premier réglage de `STAR_FURROW_LEN`. */
  const F_L = C.STAR_FURROW_LEN / 2;               // demi-longueur (est = +, ouest = −)
  const F_BX = C.STAR_FURROW_BOWL_DX;              // la cuvette d'arrêt, à l'ouest
  const F_W = C.STAR_FURROW_W / 2;                 // demi-largeur à la cuvette
  const F_PIT = 1.0, F_LIP = 0.42, F_BAND = 0.55;  // profondeur, bourrelet, largeur du bourrelet
  /* ⚠️ L'AVANCEMENT LE LONG DE LA COURSE : 0 à l'entrée (est), 1 au bout (ouest).
     `f` est la profondeur relative — elle monte doucement, culmine à la cuvette,
     et retombe vite. Un profil symétrique aurait dessiné un ballon de rugby, ce
     qui ne raconte ni une entrée ni un arrêt. */
  const F_UB = (F_L - F_BX) / (2 * F_L);
  function furrowF(u) {
    if (u <= 0 || u >= 1) return 0;
    return u <= F_UB ? Math.pow(u / F_UB, 1.7) : Math.pow((1 - u) / (1 - F_UB), 0.75);
  }
  function furrowW(u) { const f = furrowF(u); return F_W * (0.30 + 0.70 * Math.pow(f, 0.55)); }
  /* ⚠️⚠️ LA HAUTEUR, EN CASES, ET C'EST LE SEUL CHAMP : le dessin l'éclaire, les
     pieds la lisent (`starFurrowSink`). Deux formules auraient donné « il
     s'enfonce à côté du sillon » — défaut invisible en relecture et criant à
     l'écran (c'est écrit tel quel au cratère, et c'est la même règle). */
  /* ⚠️⚠️ LE BOURRELET EST FIBREUX, ET C'EST LE PREMIER DÉFAUT VU À L'ÉCRAN (454).
     Premier jet : une bande de largeur CONSTANTE tout autour de la balafre. Sur
     l'herbe, ça dessinait un OVALE parfaitement régulier bordé d'un liseré — la
     même faute que le premier cratère du 446, qui faisait un tournesol, et pour la
     même raison : *une silhouette lisse se lit comme un dessin posé, pas comme une
     terre projetée*. On fait donc respirer la largeur du bourrelet le long de la
     course et de part et d'autre, avec deux harmoniques et rien de plus — assez
     pour que le bord soit déchiré, pas assez pour qu'il fasse du bruit.
     ⚠️ ELLE EST DÉTERMINISTE (une somme de sinus, pas un tirage) parce que
     `starFurrowSink` lit le MÊME champ : un bord tiré au sort ferait tressauter le
     fermier d'un pas à l'autre. */
  function furrowFib(x, side) {
    return 0.55 + 0.28 * Math.sin(x * 2.7 + side * 2.1) + 0.17 * Math.sin(x * 6.1 - side * 1.3);
  }
  function furrowH(x, y) {
    const u = (F_L - x) / (2 * F_L);
    if (u <= 0 || u >= 1) return 0;
    const w = furrowW(u), f = furrowF(u);
    if (w <= 0.001) return 0;
    const v = Math.abs(y) / w;
    if (v <= 1) return -F_PIT * f * (1 - v * v);
    const band = F_BAND * furrowFib(x, y >= 0 ? 1 : -1);
    if (v <= 1 + band) return F_LIP * f * Math.sin(Math.PI * (v - 1) / band);
    return 0;
  }
  /* ⚠️ LES DEUX PALETTES, EN RVB PARCE QU'ON LES MODULE — l'ombre d'une paroi est
     un FACTEUR, jamais une seconde couleur choisie à la main (446). État 0 : la
     terre retournée. État 1 : refermé, l'herbe a repris (une terre remuée pousse
     mieux, donc plus clair que l'herbe d'à côté). */
  const FURROW_PAL = [
    { pit: [88, 60, 38], earth: [146, 106, 66], tip: [54, 37, 24],
      clod: [[120, 92, 62], [146, 114, 80]], clodDark: [38, 26, 16], crack: "30,20,13" },
    { pit: [104, 132, 76], earth: [132, 160, 92], tip: [64, 82, 46],
      clod: [[112, 138, 78], [134, 162, 94]], clodDark: [44, 58, 34], crack: "44,56,34" },
  ];
  /* Le grain, PAR-DESSUS le relief. ⚠️ IL NE DÉPEND QUE DE LA POSITION LE LONG DE
     LA COURSE : un grain qui varierait aussi en travers ferait du bruit, alors
     qu'une terre labourée porte des STRIES dans le sens du passage. */
  function furrowNoise(x) {
    return 0.55 * Math.sin(x * 5.7 + 1.2) + 0.30 * Math.sin(x * 13.1 + 4.1) + 0.15 * Math.sin(x * 2.9 + 2.2);
  }
  /* LES FISSURES. Elles partent de la CUVETTE et des lèvres, jamais du milieu de
     la course : c'est là que la terre a encaissé. ⚠️ ELLES S'ARRÊTENT NET À
     `STAR_FURROW_CRACK_R` — sans cette borne, la marche aléatoire sortirait du
     canevas cuit et se ferait raboter en silence (piège n°1 des sprites, 433). */
  function furrowCracks(g, ox, oy, T2, pal) {
    const rnd = makeRnd(4547);
    const RC = C.STAR_FURROW_CRACK_R * T2;
    const bx = ox + F_BX * T2, by = oy;
    const walk = (x0, y0, a0, len, wid, al0, depth) => {
      let x = x0, y = y0, a = a0, run = 0;
      while (run < len) {
        const step = 2.0 + rnd() * 1.4;
        a += (rnd() - 0.5) * 0.30;
        x += Math.cos(a) * step; y += Math.sin(a) * step * FURROW_SQUASH;
        run += step;
        const dx = x - bx, dy = (y - by) / FURROW_SQUASH;
        if (Math.sqrt(dx * dx + dy * dy) > RC) return;
        const k = run / len;
        const w = Math.max(1, Math.round(wid * (1 - k * 0.72)));
        P(g, Math.round(x) - (w >> 1), Math.round(y) - (w >> 1), w, w,
          `rgba(${pal.crack},${(al0 * (1 - 0.42 * k)).toFixed(2)})`);
        if (depth < 2 && k > 0.16 && k < 0.74 && rnd() < 0.11)
          walk(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.45),
               (len - run) * (0.35 + rnd() * 0.30), Math.max(1, wid - 1), al0 * 0.9, depth + 1);
      }
    };
    /* ⚠️⚠️ ELLES SONT ORIENTÉES, ET C'EST TOUTE LA DIFFÉRENCE AVEC LE CRATÈRE. Un
       trou rond se fend dans toutes les directions ; une course qui s'arrête pousse
       la terre DEVANT elle. Les fissures de la cuvette partent donc vers l'ouest en
       éventail, et celles des lèvres partent en travers — c'est ce qui fait lire
       « ça venait de là et ça s'est arrêté là » sans une seule flèche. */
    for (let k = 0; k < 13; k++) {
      const a = Math.PI + (k / 12 - 0.5) * 1.9;                  // éventail vers l'ouest
      walk(bx + Math.cos(a) * F_W * T2, by + Math.sin(a) * F_W * T2 * FURROW_SQUASH,
           a + (rnd() - 0.5) * 0.3, (2.4 + rnd() * 2.6) * T2, rnd() < 0.4 ? 3 : 2, 0.80, 0);
    }
    for (let k = 0; k < 10; k++) {
      const u = 0.18 + (k % 5) * 0.16, side = k < 5 ? -1 : 1;
      const x = ox + (F_L - u * 2 * F_L) * T2;
      const y = oy + side * furrowW(u) * (1 + F_BAND) * T2 * FURROW_SQUASH;
      walk(x, y, (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (rnd() - 0.5) * 1.1,
           (0.9 + rnd() * 1.7) * T2, 2, 0.62, 1);
    }
  }
  /* LES MOTTES, toutes DANS la balafre : dehors, elles poivrent le décor (438). */
  function furrowClods(g, ox, oy, T2, pal) {
    const rnd = makeRnd(4551);
    for (let k = 0; k < 44; k++) {
      const u = 0.06 + Math.pow(rnd(), 0.8) * 0.9;
      const w2 = furrowW(u);
      const x = Math.round(ox + (F_L - u * 2 * F_L) * T2);
      const y = Math.round(oy + (rnd() * 2 - 1) * w2 * 0.8 * T2 * FURROW_SQUASH);
      const w = 2 + ((rnd() * 3) | 0), h = 1 + ((rnd() * 2) | 0);
      const c1 = pal.clod[rnd() < 0.5 ? 0 : 1];
      P(g, x, y, w, h, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
      P(g, x, y + h, w, 1, `rgba(${pal.clodDark[0]},${pal.clodDark[1]},${pal.clodDark[2]},0.75)`);
    }
  }

  const furrowCache = new Map();
  function furrowBake(T2, phase) {
    const key = (T2 | 0) + ":" + (phase ? 1 : 0);
    const hit = furrowCache.get(key);
    if (hit) return hit;
    const pal = FURROW_PAL[phase ? 1 : 0];
    /* La boîte : elle couvre la course ET les fissures, qui débordent volontiers
       à l'ouest. ⚠️ ELLE EST CALCULÉE, PAS DEVINÉE — un canevas trop juste rabote
       en silence, et c'est le piège de sprite le plus répétitif du dépôt. */
    const CR = C.STAR_FURROW_CRACK_R;
    const xMin = Math.min(-F_L, F_BX - CR) - 0.5, xMax = Math.max(F_L, F_BX + CR) + 0.5;
    const yHalf = Math.max(F_W * (1 + F_BAND), CR) + 0.5;
    const W = Math.ceil((xMax - xMin) * T2), H = Math.ceil(2 * yHalf * T2 * FURROW_SQUASH);
    const ox = Math.round(-xMin * T2), oy = H >> 1;
    const [c, g] = cv(W, H);
    /* Les fissures D'ABORD : la terre projetée est retombée dessus. */
    furrowCracks(g, ox, oy, T2, pal);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    /* ⚠️ LA LUMIÈRE VIENT DE L'OUEST-HAUT, comme partout dans ce jeu (le four, les
       moellons, les toits, le cratère). Un impact éclairé de l'autre côté aurait
       l'air d'un trou découpé et collé. */
    const LX = -1, LY = -0.55;
    const ln = Math.hypot(LX, LY);
    const EPS = 0.06;                                  // en cases, pour la pente
    for (let py = 0; py < H; py++) {
      const wy = (py + 0.5 - oy) / (T2 * FURROW_SQUASH);
      for (let px = 0; px < W; px++) {
        const wx = (px + 0.5 - ox) / T2;
        const h = furrowH(wx, wy);
        if (h === 0) continue;
        const u = (F_L - wx) / (2 * F_L);
        const gx = (furrowH(wx + EPS, wy) - furrowH(wx - EPS, wy)) / (2 * EPS);
        const gy = (furrowH(wx, wy + EPS) - furrowH(wx, wy - EPS)) / (2 * EPS);
        /* Lambert d'un relief : la pente projetée sur la lumière. ⚠️ NORMALISÉE
           PAR SA PROPRE NORME, sinon les parois raides partent au blanc — la faute
           que le cratère a dû borner après coup. */
        const gn = Math.hypot(gx, gy, 1);
        let shade = 1 - 0.85 * ((gx * LX + gy * LY) / (ln * gn));
        /* L'occlusion : au fond d'une balafre, la lumière du ciel elle-même
           n'entre plus. C'est ce qui creuse VRAIMENT l'image. */
        const occl = Math.max(0, Math.min(1, (h + F_PIT) / (F_PIT + F_LIP)));
        shade *= 0.42 + 0.58 * Math.pow(occl, 1.2);
        shade *= 1 + 0.08 * furrowNoise(wx);
        shade = Math.max(0.16, Math.min(1.20, shade));
        shade = Math.round(shade * 14) / 14;           // les paliers : le monde est en gros pixels
        const inPit = h < 0;
        const base = inPit ? pal.pit : pal.earth;
        let cr = base[0], cg = base[1], cb = base[2];
        /* La pointe du bourrelet va au brun sombre : c'est ce qui relie la terre
           projetée aux fissures et fait lire UNE seule chose (446). */
        /* ⚠️ ET LE BRUNISSEMENT DE LA POINTE EST PLUS DOUX QU'AU PREMIER JET (0,8
           → 0,45) : à 0,8, l'extrême bord du bourrelet partait presque au brun
           noir, et l'herbe claire juste à côté ressortait comme un LISERÉ VERT VIF
           tout autour de la balafre. Vu à l'écran, pas au banc : le banc mesurait
           l'écart-type, qui était excellent — c'est justement le contraste qui
           faisait le défaut. */
        if (!inPit) {
          const q = Math.min(1, Math.abs(h) / (F_LIP * 0.9));
          cr += (pal.tip[0] - cr) * (1 - q) * 0.45; cg += (pal.tip[1] - cg) * (1 - q) * 0.45;
          cb += (pal.tip[2] - cb) * (1 - q) * 0.45;
        }
        /* ⚠️ LE BORD S'EFFILOCHE EN TRAME DE BAYER, PAS EN ALPHA : une terre
           semi-transparente sur de l'herbe donne du brouillard vert-brun (446). */
        const edge = Math.abs(h) / (inPit ? F_PIT : F_LIP);
        /* ⚠️⚠️ ET ELLE EST BORNÉE SOUS UN QUART, CE QUI N'EST PAS UN RÉGLAGE : c'est
           le contrat que `render-etoile` mesure entre ce dessin et
           `starFurrowSink` (« on ne s'enfonce que là où la terre est peinte », au
           delà du quart de profondeur). Une frange qui monterait plus haut
           rendrait ce contrôle faux — le banc l'a dit à un pixel près, ce qui est
           exactement ce qu'on lui demande. Le maximum ici vaut 0,24. */
        const frayed = 0.18 + 0.06 * furrowNoise(wy * 3.1);
        if (edge < frayed) {
          const keep = edge / Math.max(0.02, frayed);
          if (keep <= BAYER[(py & 3) * 4 + (px & 3)] / 16) continue;
        }
        const i = (py * W + px) * 4;
        d[i] = Math.max(0, Math.min(255, cr * shade));
        d[i + 1] = Math.max(0, Math.min(255, cg * shade));
        d[i + 2] = Math.max(0, Math.min(255, cb * shade));
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    furrowClods(g, ox, oy, T2, pal);
    if (phase) {
      /* Refermé : de l'herbe rase a repris dans la balafre, et UN éclat de verre
         est resté dedans. C'est la trace que la ferme garde de toute l'histoire. */
      const rnd = makeRnd(4557);
      for (let k = 0; k < 26; k++) {
        const u = 0.08 + rnd() * 0.86, w2 = furrowW(u);
        const x = Math.round(ox + (F_L - u * 2 * F_L) * T2);
        const y = Math.round(oy + (rnd() * 2 - 1) * w2 * 0.7 * T2 * FURROW_SQUASH);
        P(g, x, y, 1, 3, "#7ea45c"); P(g, x + 1, y + 1, 1, 2, "#96bc70");
      }
      const bx = Math.round(ox + F_BX * T2);
      P(g, bx, oy - 2, 3, 4, "#cfe6d8"); P(g, bx + 1, oy - 2, 1, 3, "#f2fbf4");
      P(g, bx, oy + 2, 3, 1, "#7c9a8c");
    }
    const out = { c, ox, oy, w: W, h: H };
    furrowCache.set(key, out);
    return out;
  }

  /* ⚠️⚠️ L'ENFONCEMENT — UNE GRANDEUR DE DESSIN, ET RIEN D'AUTRE (voir la note
     jumelle de `starCraterSink`). Positif = on descend dans la balafre, négatif =
     on enjambe le bourrelet. Il ne touche NI au rang de tri, NI à la collision, NI
     au réseau : chaque client calcule le décalage de chacun à partir des x/y qui
     circulent déjà. Et il lit `furrowH`, LE MÊME CHAMP QUE LE DESSIN. */
  function starFurrowSink(dxTiles, dyTiles, T2) {
    const h = furrowH(dxTiles, dyTiles / FURROW_SQUASH);
    const sc = T2 / 16;
    if (h < 0) return (-h / F_PIT) * C.STAR_FURROW_SINK_PX * sc;
    if (h > 0) return -(h / F_LIP) * C.STAR_FURROW_LIP_PX * sc;
    return 0;
  }

  /* LE SOL DU SILLON. ⚠️ `opt` : { heat 0..1 } — DÉRIVÉE par l'appelant, jamais
     stockée (règle des cierges, 441). `phase` : 0 = frais, 1 = refermé. */
  function drawStarFurrow(g2, cx, cy, T2, phase, tMs, opt) {
    const o = opt || {};
    const heat = phase ? 0 : Math.max(0, Math.min(1, o.heat === undefined ? 1 : o.heat));
    const t = tMs || 0;
    const bk = furrowBake(T2, phase ? 1 : 0);
    g2.drawImage(bk.c, Math.round(cx) - bk.ox, Math.round(cy) - bk.oy);
    if (phase) return;
    const bx = cx + F_BX * T2, by = cy;
    /* LE SEL DE VERRE : le sable fondu par le passage, en PLAQUES et jamais en
       grains — cinq pixels isolés sur de la terre, c'est du poivre (438). Il suit
       la course, il ne s'amasse pas dans la cuvette : c'est le passage qui a fondu
       le sable, pas l'arrêt. */
    {
      const rnd = makeRnd(4561);
      for (let k = 0; k < 11; k++) {
        const u = 0.12 + rnd() * 0.8, w2 = furrowW(u);
        const x = Math.round(cx + (F_L - u * 2 * F_L) * T2);
        const y = Math.round(cy + (rnd() * 2 - 1) * w2 * 0.6 * T2 * FURROW_SQUASH);
        P(g2, x, y, 3, 2, "#cfe6d8"); P(g2, x + 1, y, 2, 1, "#eef8f0");
        P(g2, x - 1, y + 1, 2, 1, "#a8c4b6");
      }
    }
    if (heat > 0.02) {
      /* LA CHALEUR EST DANS LA CUVETTE, ET SEULEMENT LÀ. C'est là que la course
         s'est arrêtée, donc là que tout s'est dissipé : une balafre qui rougeoierait
         sur toute sa longueur dirait qu'elle brûle encore partout — c'est-à-dire
         qu'elle n'a pas de sens de lecture. */
      const br = 0.5 + 0.5 * Math.sin(t / 760);
      craterDisc(g2, bx, by, F_W * T2 * 1.5, `rgba(255,110,40,${(0.05 * heat).toFixed(3)})`, FURROW_SQUASH);
      craterDisc(g2, bx, by, F_W * T2 * 0.9, `rgba(255,140,50,${((0.06 + 0.02 * br) * heat).toFixed(3)})`, FURROW_SQUASH);
      const rnd = makeRnd(4567);
      for (let k = 0; k < 30; k++) {
        if (k / 30 >= heat * 1.3) continue;
        const u = F_UB + (rnd() - 0.5) * 0.30, w2 = furrowW(u);
        const x = Math.round(cx + (F_L - u * 2 * F_L) * T2);
        const y = Math.round(cy + (rnd() * 2 - 1) * w2 * 0.7 * T2 * FURROW_SQUASH);
        const ph = rnd() * 6.283, big = rnd() < 0.34;
        const b = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 420 + ph))) * (0.60 + 0.40 * heat);
        if (b > 0.62) craterDisc(g2, x, y, 3 + b * 2, `rgba(255,120,40,${(0.05 + 0.05 * b).toFixed(3)})`, FURROW_SQUASH);
        /* ⚠️ UNE BRAISE EST UN TIRET COUCHÉ DANS LE SENS DE LA COURSE, pas un
           point : le modèle du cratère l'a payé, on ne le repaie pas. */
        P(g2, x, y, big ? 3 : 2, 1, b > 0.78 ? "#ffdc8c" : b > 0.52 ? "#ff8a2a" : "#c03a10");
        if (big) P(g2, x, y + 1, 3, 1, "rgba(150,40,10,0.65)");
      }
    }
  }
  /* LA VAPEUR — l'autre moitié, et elle MONTE, donc elle part dans la file de tri
     (même partage qu'au cratère : peinte avec les tuiles, un fermier passant au
     nord se dessinerait par-dessus une colonne qui est devant lui). */
  function drawStarFurrowAir(g2, cx, cy, T2, tMs, opt) {
    const o = opt || {};
    const heat = Math.max(0, Math.min(1, o.heat === undefined ? 1 : o.heat));
    if (heat <= 0.01) return;
    const t = tMs || 0, bx = cx + F_BX * T2;
    const cols = 1 + Math.round(3 * heat);
    for (let k = 0; k < cols; k++) {
      const sx = bx + Math.sin(k * 2.39) * F_W * T2 * 0.8, sy = cy + Math.cos(k * 1.71) * F_W * T2 * 0.3;
      const per = 4600 + k * 730;
      for (let j = 3; j >= 0; j--) {
        const age = ((t / per) + j / 4 + k * 0.37) % 1;
        const x = sx + age * age * 15 + Math.sin(age * 3.1 + k) * 4;
        const y = sy - age * T2 * (2.2 + 0.5 * (k % 3));
        const rad = 2.4 + age * (7.5 + (k % 3) * 1.4);
        const al = heat * 0.44 * Math.sin(Math.pow(age, 0.80) * Math.PI);
        if (al < 0.02) continue;
        const col = `rgba(196,194,184,${al.toFixed(3)})`;
        craterDisc(g2, x, y, rad, col, 1);
        craterDisc(g2, x + rad * 0.62, y + rad * 0.20, rad * 0.66, col, 1);
        craterDisc(g2, x - rad * 0.55, y + rad * 0.30, rad * 0.58, col, 1);
      }
    }
  }

  /* ── LA VERRERIE : le four, un râtelier de perles, le volet à contrepoids, et
     l'arbre de la pie. ⚠️ ILS PARTAGENT LA PALETTE DU QUARTIER DES ARTISANS
     (bois, brique, fonte) : un atelier qui aurait ses propres couleurs se lirait
     comme un décor rapporté. */
  function starKilnSprite() {
    const [c, g] = cv(34, 40);
    const BR1 = "#8e5442", BR2 = "#a86a52", BR3 = "#6a3c2e";
    // Le fût, en assises de brique décalées d'une rangée sur deux (la période
    // compte plus que les détails, 434 — et une brique alignée fait une grille).
    for (let y = 10; y < 34; y += 3) {
      P(g, 5, y, 24, 3, BR1); P(g, 5, y, 24, 1, BR2);
      for (let x = 5 + ((y / 3 | 0) % 2 ? 0 : 3); x < 29; x += 6) P(g, x, y, 1, 3, BR3);
    }
    P(g, 3, 34, 28, 4, "#7a7268"); P(g, 3, 34, 28, 1, "#98908a");   // le socle de pierre
    P(g, 4, 8, 26, 3, BR3); P(g, 4, 8, 26, 1, "#c08468");            // la corniche
    // La gueule : elle est ÉTEINTE (l'atelier est fermé la nuit — c'est le
    // thème du secret). Un four allumé promettrait quelqu'un à l'intérieur.
    P(g, 12, 22, 10, 9, "#241c18"); P(g, 12, 22, 10, 1, "#12100e");
    P(g, 13, 28, 8, 3, "#3a2a22"); P(g, 14, 29, 3, 1, "#5a4032");    // des cendres froides
    // La cheminée, décalée : une cheminée centrée sur un four rond sonne faux.
    /* ⚠️ LA MITRE DESCEND D'UNE RANGÉE, ET CE N'EST PAS DE LA COQUETTERIE : à
       y = 0 elle touchait le bord du canevas, donc elle était RABOTÉE en
       silence. Le piège n°1 des sprites (§4), payé trois fois au seul zip 433 —
       il ne coûte rien sur le moment, le dessin est joli, il manque juste deux
       rangées que personne ne cherche. Ici c'est le banc qui l'a dit. */
    P(g, 20, 2, 7, 7, BR1); P(g, 20, 2, 7, 1, BR2); P(g, 26, 2, 1, 7, BR3);
    P(g, 19, 1, 9, 2, "#5e5048");
    P(g, 2, 37, 30, 3, "rgba(20,26,16,0.24)");
    return c;
  }
  function starRackSprite() {
    /* UN RÂTELIER DE PERLES. ⚠️ LES PERLES SONT TOUTES IDENTIQUES, ET C'EST LE
       MINI-JEU : « en plein jour elles se ressemblent toutes ». Un râtelier où
       l'une brillerait déjà aurait donné la réponse dans le décor. Ce qui la
       distingue n'est pas peint ici — c'est son OMBRE, dessinée au rendu. */
    const [c, g] = cv(30, 30);
    P(g, 1, 6, 28, 2, "#7a5232"); P(g, 1, 6, 28, 1, "#9c6b42");     // la tringle haute
    P(g, 1, 20, 28, 2, "#7a5232"); P(g, 1, 20, 28, 1, "#9c6b42");
    P(g, 2, 8, 2, 20, "#6a4426"); P(g, 26, 8, 2, 20, "#6a4426");    // les montants
    const BEAD = ["#7fb8d8", "#b8d8e8", "#4a7a96"];
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
      const bx = 4 + k * 4, by = 9 + r * 14;
      P(g, bx, by, 3, 3, BEAD[0]); P(g, bx, by, 2, 1, BEAD[1]); P(g, bx + 2, by + 2, 1, 1, BEAD[2]);
      P(g, bx - 1, by + 1, 1, 1, "#2e4a5c"); P(g, bx + 3, by + 1, 1, 1, "#2e4a5c");  // cerne
      P(g, bx + 1, by + 3, 1, 3, "#8a7a5c");   // le fil
    }
    P(g, 1, 27, 28, 2, "rgba(20,26,16,0.22)");
    return c;
  }
  function starShutterSprite() {
    /* LE VOLET À CONTREPOIDS, relevé. ⚠️ LA PIERRE DU CONTREPOIDS EST AU SOL,
       DEVANT : c'est elle qu'on doit voir, parce que c'est dessus qu'on se tient.
       Une mécanique qu'on ne peut découvrir que si on nous l'a dite n'existe pas
       (leçon des plaques du tribunal, 426). */
    const [c, g] = cv(30, 38);
    P(g, 3, 2, 24, 14, "#8a6440"); P(g, 3, 2, 24, 2, "#a87c50");
    for (let x = 5; x < 26; x += 4) P(g, x, 4, 1, 12, "#6a4a2c");
    P(g, 2, 1, 26, 1, "#5a3c22"); P(g, 2, 16, 26, 1, "#5a3c22");     // le cerne
    P(g, 14, 17, 2, 12, "#5a5048");                                   // la chaîne
    for (let y = 18; y < 29; y += 3) P(g, 13, y, 4, 1, "#7e746a");
    // La pierre : ronde, lisse, usée par les pieds — donc plus claire au sommet.
    g.fillStyle = "#4e4a44"; g.beginPath(); g.ellipse(15, 32, 8, 4.5, 0, 0, 7); g.fill();
    g.fillStyle = "#6e6a62"; g.beginPath(); g.ellipse(15, 31, 7, 3.6, 0, 0, 7); g.fill();
    g.fillStyle = "#8a867c"; g.beginPath(); g.ellipse(14, 30, 4.5, 2.2, 0, 0, 7); g.fill();
    P(g, 6, 35, 18, 2, "rgba(20,26,16,0.24)");
    return c;
  }
  function starNestTreeSprite() {
    /* L'ARBRE DE LA PIE. ⚠️ IL NE REPREND PAS LE MOULE DES ONZE ESSENCES (437) :
       celui-là est un arbre de rue, celui-ci est un arbre à NID, et ce qu'on
       doit lire de loin est la boule de brindilles dans la fourche. Il est donc
       plus dégagé — un houppier plein cacherait le seul détail qui compte. */
    const [c, g] = cv(48, 60);
    const BK = "#6a4a30", BK2 = "#86603e", BK3 = "#4a3220";
    P(g, 21, 26, 6, 32, BK); P(g, 21, 26, 2, 32, BK2); P(g, 26, 26, 1, 32, BK3);
    for (const [bx, by, bw, dir] of [[14, 30, 8, -1], [27, 34, 8, 1], [16, 22, 6, -1], [27, 20, 6, 1]]) {
      for (let k = 0; k < bw; k++) P(g, bx + (dir < 0 ? bw - k : k), by - k, 2, 2, BK);
    }
    // Le feuillage : quatre masses pleines et cernées, jamais un semis (438).
    const LF = "#3d7a42", LF2 = "#57a05c", LFD = "#255028";
    /* ⚠️ LA MASSE HAUTE EST DESCENDUE DE TROIS RANGÉES : à `ly = 9` avec un
       rayon de 10 (plus 1 de cerne), le houppier sortait par le haut et se
       faisait raboter sans un mot. Même piège que la mitre du four, trouvé par
       le même contrôle. */
    for (const [lx, ly, lr] of [[13, 16, 9], [33, 14, 8], [24, 12, 10], [17, 26, 7], [32, 26, 6]]) {
      g.fillStyle = LFD; g.beginPath(); g.arc(lx, ly, lr + 1, 0, 7); g.fill();
      g.fillStyle = LF; g.beginPath(); g.arc(lx, ly, lr, 0, 7); g.fill();
      g.fillStyle = LF2; g.beginPath(); g.arc(lx - lr * 0.3, ly - lr * 0.35, lr * 0.55, 0, 7); g.fill();
    }
    /* LE NID, dans la fourche, et il DÉPASSE du feuillage : c'est le seul
       endroit du dessin qu'on doit repérer d'en bas. */
    const NX = 22, NY = 18;
    g.fillStyle = "#3a2a18"; g.beginPath(); g.ellipse(NX + 4, NY + 3, 8, 5, 0, 0, 7); g.fill();
    g.fillStyle = "#6a4e2c"; g.beginPath(); g.ellipse(NX + 4, NY + 2, 7.5, 4.2, 0, 0, 7); g.fill();
    g.fillStyle = "#8a6a3c"; g.beginPath(); g.ellipse(NX + 4, NY + 1, 6, 3, 0, 0, 7); g.fill();
    for (let k = 0; k < 7; k++) P(g, NX - 3 + k * 2, NY - 1 + (k % 3), 3, 1, "#4e3a20");
    // Un reflet DANS le nid : c'est l'éclat qu'elle garde, et il se voit à peine.
    P(g, NX + 4, NY, 2, 2, "#ffe89a"); P(g, NX + 4, NY, 1, 1, "#fffdf0");
    P(g, 16, 57, 16, 3, "rgba(20,26,16,0.26)");
    return c;
  }

  /* ── LA PIE. Trois poses : de dos, tête tournée, en vol.
     ⚠️ ELLE EST NOIRE ET BLANCHE, DONC ELLE A BESOIN D'UN TROISIÈME TON. Deux
     valeurs extrêmes côte à côte vibrent ; le bleu-vert irisé de la queue est ce
     qui fait une pie plutôt qu'un pigeon peint en deux couleurs. */
  function magpieSprite(pose) {
    const [c, g] = cv(26, 24);
    const BK = "#1c1c22", BK2 = "#33333e", WH = "#eef0f2", IR = "#2a4a52";
    if (pose === 2) {
      // EN VOL, ailes hautes : la silhouette d'une pie qui décolle est une CROIX.
      P(g, 11, 9, 5, 7, BK); P(g, 11, 9, 5, 1, BK2);
      P(g, 12, 6, 3, 3, BK); P(g, 15, 7, 3, 1, "#c8a33c");            // tête + bec
      for (let k = 0; k < 7; k++) { P(g, 10 - k, 8 - k, 2, 2, k > 3 ? IR : BK); P(g, 15 + k, 8 - k, 2, 2, k > 3 ? IR : BK); }
      P(g, 12, 15, 3, 7, IR); P(g, 12, 15, 1, 7, BK);                 // la queue
      P(g, 12, 11, 3, 4, WH);
      P(g, 8, 21, 12, 2, "rgba(20,26,16,0.14)");
      return c;
    }
    // AU SOL. `pose 0` = de dos (c'est celle qu'on voit pendant qu'on monte),
    // `pose 1` = la tête tournée — et c'est le seul instant qui compte.
    P(g, 9, 8, 8, 9, BK); P(g, 9, 8, 8, 2, BK2);                      // le corps
    P(g, 10, 12, 6, 5, WH);                                           // le plastron
    P(g, 16, 10, 2, 6, IR);                                           // l'aile irisée
    P(g, 8, 16, 2, 5, IR); P(g, 8, 16, 1, 5, BK);                     // la queue, longue
    if (pose === 0) { P(g, 11, 4, 5, 5, BK); P(g, 11, 4, 5, 1, BK2); }
    else {
      P(g, 11, 4, 5, 5, BK); P(g, 11, 4, 5, 1, BK2);
      P(g, 16, 6, 3, 2, "#c8a33c");                                   // le bec, de profil
      P(g, 15, 5, 2, 2, WH); P(g, 15, 5, 1, 1, "#1c1c22");            // ⚠️ L'ŒIL
    }
    P(g, 11, 17, 2, 4, "#c8a33c"); P(g, 14, 17, 2, 4, "#c8a33c");     // les pattes
    P(g, 8, 21, 12, 2, "rgba(20,26,16,0.20)");
    return c;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LE CRATÈRE — REFAIT AU 446, SUR MODÈLE, ET C'EST LE PREMIER DÉCOR DU JEU
     QUI AIT UNE PROFONDEUR.
     ───────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ IL EST REFAIT PARCE QUE GUILLAUME A FOURNI DEUX IMAGES ET A DEMANDÉ
     « EXACTEMENT CE SPRITE », pas une interprétation. Ce que le 444 dessinait :
     six anneaux concentriques et vingt-six traits. Lisible, et PLAT — c'est-à-dire
     très exactement ce qu'un cratère ne doit pas être. Ce que les deux images
     montrent, et qui manquait :
       1. un TROU, rond, sombre, dont la paroi OUEST est dans l'ombre — sans
          cette ombre, un cratère vu de dessus est un disque brun ;
       2. une couronne de terre projetée en LANGUES inégales (le contour du
          modèle est une étoile, pas un cercle) ;
       3. de longues FISSURES ramifiées qui courent dans l'herbe BIEN au-delà de
          la couronne, et qui disent à elles seules « c'est tombé » ;
       4. des BRAISES au fond, nombreuses puis rares ;
       5. une colonne de FUMÉE, épaisse puis maigre — c'est la différence entre
          les deux images fournies, et c'est devenu une mécanique (voir §heat) ;
       6. l'ÉTOILE, posée au centre, tant qu'on ne l'a pas fait sortir.
     ⚠️⚠️ DEUX RAYONS, ET ILS NE MESURENT PAS LA MÊME CHOSE (règle du 441,
     « une grandeur de dessin, une grandeur de rang, une grandeur de collision ») :
       · `STAR_CRATER_DRAW_R` = LA MASSE DE TERRE. Le générateur garantit un
         disque d'herbe libre de ce rayon : rien de solide ne peut s'y trouver,
         donc la couronne ne recouvre jamais un décor. Elle n'en sort JAMAIS,
         et `render-etoile` le mesure sur le pixel.
       · `STAR_CRATER_CRACK_R` = LES FISSURES, ET ELLES SEULES. Elles débordent
         de l'emprise garantie, ce qui serait interdit pour une masse (« la case
         d'un décor n'est pas la surface qu'il couvre », 440) et ne l'est pas
         pour un trait d'un pixel : le cratère est un DÉCAL DE SOL peint avant
         tout le reste, donc une fissure passe SOUS l'arbre ou le banc qu'elle
         croise, ne cache rien et ne bloque rien. C'est la seule dérogation, elle
         est nommée, et elle a son propre nombre.
     ⚠️ TOUT EST SNAPPÉ À L'ENTIER, `arc()` COMPRIS (voir `craterDisc`). La ville
     se dessine à ZOOM = 3 : un `arc()` de rayon fractionnaire y sort
     ANTICRÉNELÉ, c'est-à-dire une tache lisse au milieu d'un monde en gros
     pixels. Le modèle est en pixels francs ; tout passe donc par `fillRect`.
     ⚠️⚠️ ET LA MASSE EST CUITE UNE FOIS (`craterBake`), PAS REDESSINÉE PAR
     IMAGE. Elle fait 250×220 et se peint pixel par pixel : la calculer soixante
     fois par seconde était hors de question, et la cuire dans un canevas
     TRANSPARENT ne coûte rien — le fond d'herbe reste dessous, donc la saison,
     le voile de nuit et la météo continuent d'être hérités gratuitement (c'était
     la raison invoquée au 444 pour NE PAS cuire, et elle était fausse : ce
     qu'il ne fallait pas cuire, c'est l'herbe, pas le cratère).
     ⚠️ LE DESSIN EST EN DEUX MOITIÉS, ET C'EST UNE QUESTION DE TRI :
     `drawStarCrater` est le SOL (couronne, trou, braises, étoile) et se peint
     avec les tuiles ; `drawStarCraterAir` est la FUMÉE, qui monte, et qui part
     dans la file de tri à la rangée du cratère — sinon un joueur passant au nord
     du trou serait dessiné DEVANT une colonne qui est derrière lui.
     ⚠️ `phase` : 0 = le cratère (chapitre 2), 1 = refroidi en bassin de verre (la
     trace, après la fin) — DÉDUIT de l'état partagé, stocké nulle part (règle
     des cierges, 441). `opt.heat` (0..1) est la chaleur, elle aussi dérivée :
     voir `starCraterHeat` dans `quete.js`. */
  const CRATER_SQUASH = 0.86;          // vu de haut, à peine écrasé (le modèle est presque rond)
  /* ⚠️⚠️ LE MODÈLE N'EST PAS UNE CUVETTE, C'EST UNE GERBE. Premier jet du 446 :
     une cuvette ronde bordée de trente langues régulières — regardé à l'écran, ça
     fait un TOURNESOL, une collerette de pétales tous pareils autour d'un disque
     brun. Le modèle de Guillaume est fait de FIBRES : une soixantaine de traînées
     radiales de longueurs et de tons très inégaux, qui partent du centre, se
     terminent en pointes, et se prolongent en fissures. La même chose donc décrit
     le fond, la paroi, le bord ET la silhouette — un seul champ, pas trois
     couches. C'est ce qui donne la lecture « ça a GICLÉ » au lieu de « on a
     creusé ».
     ⚠️ LA QUEUE DE LA DISTRIBUTION EST LOURDE (`pow(rnd, 1.7)`) : la plupart des
     fibres sont courtes, quelques-unes très longues. Tirées uniformément, elles
     redonnent une collerette — c'est très exactement ce que le premier jet
     faisait, et aucune formule de forme ne le rattrape. */
  const CRATER_RAY_N = 56;
  const CRATER_RAY = (() => {
    const r = makeRnd(4463), raw = [];
    for (let k = 0; k < CRATER_RAY_N; k++)
      raw.push({ len: 0.66 + Math.pow(r(), 1.5) * 0.34, tone: 0.85 + r() * 0.32, hj: 0.86 + r() * 0.26 });
    /* Un lissage LÉGER des longueurs, et de rien d'autre : deux fibres voisines
       de longueurs opposées font du bruit, pas une gerbe. Les TONS, eux, restent
       bruts — c'est leur alternance serrée qui fait les stries. */
    return raw.map((v, k) => ({
      len: Math.min(1, v.len * 0.80 + (raw[(k + 1) % CRATER_RAY_N].len + raw[(k + CRATER_RAY_N - 1) % CRATER_RAY_N].len) * 0.10),
      tone: v.tone, hj: v.hj,
    }));
  })();
  function craterRayAt(a) {
    const TAU = Math.PI * 2;
    let u = a % TAU; if (u < 0) u += TAU;
    const f = u / TAU * CRATER_RAY_N, k = f | 0, s = f - k;
    const ray = CRATER_RAY[k % CRATER_RAY_N], nxt = CRATER_RAY[(k + 1) % CRATER_RAY_N];
    /* ⚠️⚠️ LE BORD EST UNE LIGNE BRISÉE ENTRE FIBRES VOISINES, PAS UN PÉTALE PAR
       FIBRE. Vu sur la planche : avec un lobe (`sin(πs)`) par secteur, chaque
       fibre devient un pétale identique et le cratère porte une COLLERETTE de
       tournesol — d'autant plus visible qu'on réduit leur nombre. Interpolées,
       deux fibres voisines de longueurs très différentes font une dent ; deux
       fibres proches n'en font aucune. La gerbe devient irrégulière PARCE QUE les
       longueurs le sont, et pas parce qu'une formule de forme le décore. */
    return { len: ray.len + (nxt.len - ray.len) * (s * s * (3 - 2 * s)), tone: ray.tone, hj: ray.hj };
  }
  /* ⚠️⚠️ ET LE TROU EST UN SECOND CHAMP, LISSE, QUI N'EST PAS CELUI-LÀ. On
     marche DANS celui-ci (c'est lui que `starCraterSink` interroge, donc il doit
     être doux : une gerbe sous les pieds ferait tressauter le fermier d'une fibre
     à l'autre), on REGARDE l'autre. Un rayon unique aurait porté deux sens —
     la faute du dos d'âne des ponts (441). */
  function craterHoleK(a) {
    return 0.640 + 0.040 * Math.sin(3 * a + 0.7) + 0.026 * Math.sin(5 * a - 1.3);
  }
  /* Le grain fin, PAR-DESSUS les fibres. ⚠️ IL NE DÉPEND QUE DE L'ANGLE — un
     grain qui varierait aussi avec le rayon ferait du bruit, pas des stries. */
  function craterNoise(a) {
    return 0.55 * Math.sin(a * 13.7 + 1.2) + 0.30 * Math.sin(a * 29.3 + 4.1) + 0.15 * Math.sin(a * 7.1 + 2.2);
  }
  /* Les deux palettes, en RVB parce qu'on les MODULE (l'ombre de la paroi est un
     facteur, pas une seconde couleur choisie à la main). Cinq bandes du centre
     vers la lèvre. ⚠️ LA 1 GARDE LA SILHOUETTE DE LA 0 : c'est la règle des deux
     états (banc §5), seule la couleur change. */
  /* ⚠️ DEUX COULEURS DE BASE PAR ÉTAT, PAS CINQ BANDES — C'EST LA VALEUR QUI
     PORTE LA FORME (§8 de CLAUDE.md : ce qui manque à une image, c'est un ÉCART,
     pas un décalage). Cinq bandes concentriques peintes à la main donnaient une
     cible de tir à l'arc ; ici, la terre du trou et la terre du bourrelet sont
     deux tons proches, et tout le reste est de l'ombre calculée. */
  const CRATER_PAL = [
    { pit: [96, 64, 40], earth: [150, 108, 68], tip: [58, 39, 25],
      clod: [[124, 94, 64], [148, 116, 82]], clodDark: [40, 27, 17], crack: "30,20,13" },
    { pit: [96, 196, 152], earth: [132, 158, 92], tip: [66, 82, 48],
      clod: [[110, 136, 76], [132, 160, 92]], clodDark: [42, 56, 32], crack: "42,54,32" },
  ];

  /* Un disque en PIXELS FRANCS. Voir le chapeau : `arc()` anticrénelle. */
  function craterDisc(g, cx, cy, r, col, sq) {
    const q = sq === undefined ? 1 : sq, ri = Math.max(1, Math.round(r));
    g.fillStyle = col;
    for (let dy = -ri; dy <= ri; dy++) {
      const w = Math.round(Math.sqrt(Math.max(0, ri * ri - dy * dy)));
      if (w < 1) continue;
      g.fillRect(Math.round(cx) - w, Math.round(cy + dy * q), w * 2 + 1, 1);
    }
  }

  /* LES FISSURES. Elles partent de la POINTE des langues (la terre se déchire
     dans le prolongement de ce qui a été projeté), marchent en zigzag, se
     divisent une ou deux fois, et s'amincissent. ⚠️ ELLES S'ARRÊTENT NET À
     `STAR_CRATER_CRACK_R` : sans cette borne, la marche aléatoire sortait du
     canevas cuit et se faisait raboter en silence — le piège n°1 des sprites
     (433), qui ne coûte rien sur le moment. */
  function craterCracks(g, ox, oy, R, RC, pal) {
    const rnd = makeRnd(4477);
    const walk = (x0, y0, a0, len, wid, al0, depth) => {
      let x = x0, y = y0, a = a0, run = 0;
      while (run < len) {
        const step = 2.0 + rnd() * 1.4;
        a += (rnd() - 0.5) * 0.30;
        x += Math.cos(a) * step; y += Math.sin(a) * step * CRATER_SQUASH;
        run += step;
        const dx = x - ox, dy = (y - oy) / CRATER_SQUASH;
        if (Math.sqrt(dx * dx + dy * dy) > RC) return;      // la borne, voir ci-dessus
        const k = run / len;
        const w = Math.max(1, Math.round(wid * (1 - k * 0.72)));
        const al = al0 * (1 - 0.42 * k);
        P(g, Math.round(x) - (w >> 1), Math.round(y) - (w >> 1), w, w, `rgba(${pal.crack},${al.toFixed(2)})`);
        if (depth < 2 && k > 0.16 && k < 0.74 && rnd() < 0.11)
          walk(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.45),
               (len - run) * (0.35 + rnd() * 0.30), Math.max(1, wid - 1), al * 0.92, depth + 1);
      }
    };
    /* ⚠️ ELLES PARTENT DES FIBRES LES PLUS LONGUES, PAS D'UN ANGLE SUR DEUX. Une
       fissure au bout d'une fibre courte se détache du dessin ; au bout d'une
       longue, elle en est la continuation — c'est ce que montre le modèle. */
    for (let k = 0; k < CRATER_RAY_N; k += 2) {
      const a = (k + 0.5) / CRATER_RAY_N * Math.PI * 2;
      const ray = craterRayAt(a);
      if (ray.len < 0.70 && rnd() > 0.30) { rnd(); continue; }
      const r0 = ray.len * R * 0.96;
      walk(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0 * CRATER_SQUASH,
           a + (rnd() - 0.5) * 0.34, (RC - r0) * (0.45 + rnd() * 0.55), rnd() < 0.45 ? 3 : 2, 0.80, 0);
    }
  }

  /* LES MOTTES du fond : le modèle en montre des blocs francs, pas du grain.
     Toutes DANS le trou (`craterHoleK`), sinon elles poivrent la couronne. */
  function craterClods(g, ox, oy, R, pal) {
    const rnd = makeRnd(4471);
    for (let k = 0; k < 52; k++) {
      const a = rnd() * Math.PI * 2;
      const rr = (0.08 + Math.pow(rnd(), 0.7) * 0.58) * craterHoleK(a) * R;
      const x = Math.round(ox + Math.cos(a) * rr), y = Math.round(oy + Math.sin(a) * rr * CRATER_SQUASH);
      const w = 2 + ((rnd() * 3) | 0), h = 1 + ((rnd() * 2) | 0);
      const c1 = pal.clod[rnd() < 0.5 ? 0 : 1];
      P(g, x, y, w, h, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
      P(g, x, y + h, w, 1, `rgba(${pal.clodDark[0]},${pal.clodDark[1]},${pal.clodDark[2]},0.75)`);
    }
  }

  const craterCache = new Map();
  function craterBake(T2, phase) {
    const key = (T2 | 0) + ":" + (phase ? 1 : 0);
    const hit = craterCache.get(key);
    if (hit) return hit;
    const pal = CRATER_PAL[phase ? 1 : 0];
    const R = C.STAR_CRATER_DRAW_R * T2, RC = C.STAR_CRATER_CRACK_R * T2;
    const W = ((RC + 3) * 2) | 0, H = ((RC * CRATER_SQUASH + 3) * 2) | 0;
    const ox = W >> 1, oy = H >> 1;
    const [c, g] = cv(W, H);
    /* Les fissures D'ABORD : une langue de terre projetée est retombée DESSUS,
       donc la couronne les recouvre. L'inverse donnerait un trait qui court sur
       la terre au lieu de sortir de dessous. */
    craterCracks(g, ox, oy, R, RC, pal);
    /* LA COURONNE ET LE TROU, PIXEL PAR PIXEL. ⚠️ EN `ImageData` ET NON EN
       `fillRect` : cinquante mille appels à la cuisson passeraient, mais la
       lecture de ce code deviendrait « quel anneau va par-dessus quel anneau »,
       alors que ce qu'on décrit ici est un CHAMP (une couleur par (rayon,
       angle)). C'est la même raison qui a fait choisir une isoligne au 444. */
    const img = g.getImageData(0, 0, W, H), d = img.data;
    /* ⚠️ LA POINTE DES LANGUES S'EFFILOCHE EN TRAME DE BAYER, PAS EN ALPHA. Une
       pointe semi-transparente sur de l'herbe donne un brun verdâtre translucide
       — du brouillard, pas de la terre. La trame garde chaque pixel OPAQUE et
       laisse l'herbe passer entre : c'est ce que fait le modèle. */
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ LE RELIEF. C'EST LA PARTIE QUI COMPTE, ET ELLE EST ÉCLAIRÉE POUR DE BON.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : « attention de bien reproduire
       l'effet 3D de la référence ». Un dégradé du centre vers le bord ne le donne
       pas — il donne une cible. Ce qui creuse une image vue de dessus est
       l'ÉCLAIRAGE D'UNE PENTE : on décrit donc une HAUTEUR le long du rayon (le
       trou descend, le bourrelet remonte, la fibre redescend), on en prend la
       PENTE, et on l'éclaire. Une seule formule rend alors les quatre lectures
       que montre le modèle, et aucune n'a été peinte à la main :
         · paroi OUEST du trou      → sombre (elle tourne le dos à la lumière)
         · paroi EST du trou        → claire (elle la reçoit de plein fouet)
         · dos OUEST du bourrelet   → clair  (pente inverse, même lumière)
         · dos EST du bourrelet     → sombre
       ⚠️ LA LUMIÈRE VIENT DE L'OUEST-HAUT, ET CE N'EST PAS UN CHOIX LIBRE : tous
       les sprites du jeu sont éclairés en haut à gauche (le four, les moellons,
       les toits — voir `bStones`). Un cratère éclairé de l'autre côté aurait
       l'air d'un trou découpé et collé.
       ⚠️ ET LA VALEUR EST QUANTIFIÉE EN PALIERS : le monde est en gros pixels, un
       dégradé continu y fait une tache lisse. Les paliers dessinent des courbes de
       niveau — c'est ce que fait le modèle, et c'est ce qui rend la pente LISIBLE
       plutôt que douce. */
    const LIGHT = Math.PI;                 // ouest
    const PIT = 0.62, LIP = 0.30;          // profondeur du trou, hauteur du bourrelet (relatives)
    for (let py = 0; py < H; py++) {
      const dy = (py + 0.5 - oy) / CRATER_SQUASH;
      for (let px = 0; px < W; px++) {
        const dx = px + 0.5 - ox;
        const rr = Math.sqrt(dx * dx + dy * dy);
        if (rr > R) continue;                       // l'emprise annoncée, jamais franchie
        const a = Math.atan2(dy, dx);
        const ray = craterRayAt(a), n = craterNoise(a);
        const rt = ray.len * R;
        if (rr > rt) continue;
        const rb = craterHoleK(a) * R;
        /* ⚠️ LE BORD DU TROU EST DÉHANCHÉ FIBRE PAR FIBRE (`hj`), ET SEULEMENT
           POUR L'ŒIL : `craterHoleK` reste lisse, c'est lui que les pieds lisent.
           Sans ce déhanchement, l'anneau clair a un bord intérieur parfaitement
           elliptique — une soucoupe posée sur le dessin. */
        const uH = Math.max(0.30, Math.min(0.93, rb * ray.hj / rt));
        const u = rr / rt;
        let slope, depth;
        if (u < uH) {
          // LE TROU : un paraboloïde. La pente monte vers l'extérieur.
          const v = u / uH;
          depth = -PIT * (1 - v * v);
          slope = 2 * PIT * v / uH;
        } else {
          // LE BOURRELET PUIS LA FIBRE : ça monte, ça culmine, ça retombe à plat.
          const w = (u - uH) / Math.max(0.001, 1 - uH);
          depth = LIP * Math.pow(Math.sin(w * Math.PI), 0.70);
          slope = LIP * 2.6 * Math.cos(w * Math.PI);
        }
        const sh = slope / Math.sqrt(1 + slope * slope);       // la pente, normalisée
        /* Lambert d'un relief radial + une occlusion : au fond d'un trou, la
           lumière du ciel elle-même n'entre plus. */
        let shade = 1 - 0.78 * sh * Math.cos(a - LIGHT);
        const occl = Math.max(0, Math.min(1, (depth + PIT) / (PIT + LIP)));
        shade *= 0.40 + 0.60 * Math.pow(occl, 1.25);
        // Le bourrelet porte son ombre DANS la cuvette, juste sous sa lèvre.
        if (u < uH && u > uH * 0.74) shade *= 1 - 0.16 * (u - uH * 0.74) / (uH * 0.26);
        /* ⚠️ LA FIBRE S'ÉTEINT EN APPROCHANT DU CENTRE, ET C'EST UN DÉFAUT VU SUR
           LA PLANCHE : appliquée pleine partout, la variation de ton faisait des
           PARTS DE TARTE qui se rejoignaient au milieu — une roue, pas un trou.
           Une traînée d'éjecta est une chose du BORD ; au fond, il n'y a que de
           la terre. */
        shade *= (1 + (ray.tone - 1) * (0.32 + 0.68 * u)) * (1 + 0.07 * n);
        /* ⚠️ ET LE HAUT EST BORNÉ. Sans cette ligne, une pente qui fait face à la
           lumière atteint 2,0 : la lèvre ouest partait au BLANC, ce qui n'est pas
           une terre éclairée mais un trou dans le dessin — et le banc, lui, la
           comptait comme du feu (elle en avait la couleur). Une pente ne rend
           jamais plus de lumière qu'elle n'en reçoit. */
        shade = Math.max(0.16, Math.min(1.22, shade));
        shade = Math.round(shade * 14) / 14;                   // les paliers, voir le chapeau
        /* ⚠️⚠️ LA POINTE DE LA FIBRE VA AU BRUN SOMBRE, ET C'EST CE QUI SÉPARE
           UNE GERBE D'UNE FOURRURE. Peintes du même ton clair que la lèvre, les
           fibres faisaient un HALO poilu tout autour du trou — vu sur la planche,
           et c'était la dernière chose qui éloignait du modèle. Dans le modèle, le
           tan est l'anneau SOULEVÉ, et ce qui en sort est sombre : ce sont les
           mêmes traînées que les fissures, en plus large. La couleur relie donc
           les deux, et l'œil lit une seule chose qui part du trou. */
        const base = u < uH ? pal.pit : pal.earth;
        let cr = base[0], cg = base[1], cb = base[2];
        if (u > 0.78) {
          const q = Math.min(1, (u - 0.78) / 0.22);
          cr += (pal.tip[0] - cr) * q; cg += (pal.tip[1] - cg) * q; cb += (pal.tip[2] - cb) * q;
        }
        /* ⚠️⚠️ LE TRAMAGE NE SERT QUE LA POINTE, ET C'EST LE DÉFAUT LE PLUS VISIBLE
           DU PREMIER JET : écrit `keep *= 0.82 + 0.18·n`, il s'appliquait à TOUTE
           la surface, donc le cratère entier partait en damier — flou de loin,
           sale de près. Une pointe d'éjecta s'effiloche ; une paroi, non. */
        const frayed = 0.90 + 0.07 * n;
        if (u > frayed) {
          const keep = 1 - (u - frayed) / Math.max(0.02, 1 - frayed) * 0.88;
          if (keep <= BAYER[(py & 3) * 4 + (px & 3)] / 16) continue;
        }
        const i = (py * W + px) * 4;
        d[i] = Math.max(0, Math.min(255, cr * shade));
        d[i + 1] = Math.max(0, Math.min(255, cg * shade));
        d[i + 2] = Math.max(0, Math.min(255, cb * shade));
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    craterClods(g, ox, oy, R, pal);
    const out = { c, ox, oy, w: W, h: H };
    craterCache.set(key, out);
    return out;
  }

  /* ⚠️⚠️ L'ENFONCEMENT — UNE GRANDEUR DE DESSIN, ET RIEN D'AUTRE.
     Demande de Guillaume : « quand on se déplace à l'intérieur, prévoir un
     déplacement qui suggère une profondeur ; pas plat. » Ce que rend cette
     fonction est un DÉCALAGE D'IMAGE en pixels : positif = le fermier descend
     dans le trou, négatif = il enjambe le bourrelet. Il ne touche NI au rang de
     tri, NI à la collision, NI au réseau — et c'est la leçon du 439 prise à
     l'endroit : « une grandeur de dessin ne doit pas entrer dans la collision »,
     l'arc du pont ajouté à `playerElevTown` aurait rendu les ponts
     infranchissables. Ici, rien à réconcilier non plus : chacun calcule le
     décalage de chacun à partir des x/y qui circulent déjà (§3 de CLAUDE.md).
     ⚠️ ET IL LIT `craterHoleK`, LE MÊME CHAMP QUE LE DESSIN : la cuvette où l'on
     s'enfonce est au pixel près celle qu'on voit. Deux formules auraient donné
     « il s'enfonce à côté du trou », défaut invisible en relecture et criant à
     l'écran. */
  function starCraterSink(dxTiles, dyTiles, T2) {
    const R = C.STAR_CRATER_DRAW_R * T2;
    const x = dxTiles * T2, y = (dyTiles * T2) / CRATER_SQUASH;
    const r = Math.sqrt(x * x + y * y);
    if (r >= R) return 0;
    const rb = craterHoleK(Math.atan2(y, x)) * R, sc = T2 / 16;
    if (r < rb) {
      const u = r / rb;
      return C.STAR_CRATER_SINK_PX * (1 - u * u) * sc;
    }
    // Le bourrelet : on monte de deux ou trois pixels en l'enjambant.
    const band = rb * 0.20;
    if (r > rb + band) return 0;
    return -C.STAR_CRATER_LIP_PX * Math.sin(Math.PI * (r - rb) / band) * sc;
  }

  /* LE SOL DU CRATÈRE. ⚠️ `opt` : { heat 0..1, star:false } — deux valeurs
     DÉRIVÉES par l'appelant, aucune stockée. */
  function drawStarCrater(g2, cx, cy, T2, phase, tMs, opt) {
    const o = opt || {};
    const heat = phase ? 0 : Math.max(0, Math.min(1, o.heat === undefined ? 1 : o.heat));
    const withStar = phase ? false : o.star !== false;
    const R = C.STAR_CRATER_DRAW_R * T2, t = tMs || 0;
    const bk = craterBake(T2, phase ? 1 : 0);
    g2.drawImage(bk.c, Math.round(cx) - bk.ox, Math.round(cy) - bk.oy);
    if (phase) {
      // Le bassin : quelques reflets FIXES (dérivés de l'angle, pas tirés), et
      // une lueur qui respire lentement. Inchangé depuis le 444.
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566 + 0.4, r = R * (0.14 + 0.07 * k);
        P(g2, (cx + Math.cos(a) * r) | 0, (cy + Math.sin(a) * r * CRATER_SQUASH) | 0, 3, 1, "rgba(226,255,240,0.55)");
      }
      const pulse = 0.10 + 0.05 * Math.sin(t / 1400);
      craterDisc(g2, cx, cy, R * 0.42, `rgba(140,240,190,${pulse.toFixed(3)})`, CRATER_SQUASH);
      return;
    }
    /* LA CHALEUR DU FOND. ⚠️ ELLE EST LARGE ET FAIBLE, JAMAIS VIVE ET PETITE :
       une lueur qui monte en valeur sans s'élargir se lit comme une lampe. */
    if (heat > 0.02) {
      const br = 0.5 + 0.5 * Math.sin(t / 760);
      craterDisc(g2, cx, cy, R * 0.46, `rgba(255,110,40,${(0.05 * heat).toFixed(3)})`, CRATER_SQUASH);
      craterDisc(g2, cx, cy, R * 0.28, `rgba(255,140,50,${((0.06 + 0.02 * br) * heat).toFixed(3)})`, CRATER_SQUASH);
    }
    /* LES BRAISES. ⚠️ ELLES S'ÉTEIGNENT UNE PAR UNE, ELLES NE PÂLISSENT PAS
       TOUTES ENSEMBLE : c'est la différence entre les deux images de Guillaume
       (la seconde en garde une dizaine, aussi vives). Un fondu global aurait
       donné un cratère qui baisse la lumière, pas un cratère qui refroidit.
       ⚠️ Le tirage est RE-FAIT à chaque image et il est DÉTERMINISTE : même
       graine, mêmes positions, donc aucune braise ne saute d'un pixel. */
    const rnd = makeRnd(4483);
    for (let k = 0; k < 42; k++) {
      const a = rnd() * Math.PI * 2;
      /* ⚠️ ELLES SE SERRENT VERS LE FOND. Étalées sur toute la cuvette (premier
         réglage : 0,72), elles font des CONFETTIS oranges — vu à l'écran, pas sur
         la planche : c'est du poivre (438), et ça casse la lecture « un foyer au
         fond d'un trou ». Le modèle les groupe dans la moitié intérieure. */
      const rr = (0.06 + Math.pow(rnd(), 1.35) * 0.52) * craterHoleK(a) * R;
      const ph = rnd() * 6.283, big = rnd() < 0.34;
      /* ⚠️ LE NOMBRE DE BRAISES EST PROPORTIONNEL À LA CHALEUR, ET SEULEMENT LUI :
         à chaleur nulle il n'en reste AUCUNE (le cratère de la fin ne rougeoie
         pas), au plancher de `STAR_CRATER_EMBER` il en reste la dizaine de la
         seconde image. Leur ÉCLAT, lui, bouge peu — c'est ce qui fait qu'elles
         s'éteignent au lieu de pâlir toutes ensemble. */
      if (k / 42 >= heat * 1.35) continue;
      const b = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 420 + ph))) * (0.60 + 0.40 * heat);
      const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr * CRATER_SQUASH);
      if (b > 0.62) craterDisc(g2, x, y, 3 + b * 2, `rgba(255,120,40,${(0.05 + 0.05 * b).toFixed(3)})`, CRATER_SQUASH);
      const col = b > 0.78 ? "#ffdc8c" : b > 0.52 ? "#ff8a2a" : "#c03a10";
      /* ⚠️ UNE BRAISE EST UN TIRET COUCHÉ SUR LA STRIE, PAS UN POINT. Le modèle
         montre du verre fondu au fond des rainures : des points auraient donné du
         poivre orange (l'îlot qui flotte, 438), le tiret suit la fibre. */
      const ex = Math.abs(Math.cos(a)) > 0.5 ? (big ? 3 : 2) : 1;
      const ey = Math.abs(Math.cos(a)) > 0.5 ? 1 : (big ? 2 : 1);
      P(g2, x, y, ex, ey, col);
      if (big) P(g2, x, y + ey, ex, 1, "rgba(150,40,10,0.65)");
    }
    /* L'ÉTOILE, AU FOND, TANT QU'ELLE N'EST PAS SORTIE. ⚠️ C'est le seul point
       froid du dessin, et c'est voulu : dans le modèle, le bleu au milieu de
       l'orange est ce qui accroche l'œil à trois écrans de distance. */
    if (withStar) {
      const p = 0.5 + 0.5 * Math.sin(t / 900);
      craterDisc(g2, cx, cy, 10 + p * 1.5, `rgba(120,226,255,${(0.09 + 0.03 * p).toFixed(3)})`, CRATER_SQUASH);
      craterDisc(g2, cx, cy, 6 + p, `rgba(150,238,255,${(0.20 + 0.06 * p).toFixed(3)})`, CRATER_SQUASH);
      craterDisc(g2, cx, cy, 3.4, "rgba(198,244,255,0.90)", 1);
      craterDisc(g2, cx, cy, 1.8, "#ffffff", 1);
    }
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 458 — LA POUSSIÈRE DE LA GLISSADE. « poussière marron / grise derrière
     ║ le perso quand il glisse dans le cratère » (demande de Guillaume).
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ ELLE EST ICI ET PAS DANS LA BOUCLE DE RENDU, ET C'EST LE PIÈGE N°1 DU
     PROJET PRIS À L'ENDROIT (§4 de `CLAUDE.md`, deuxième visage) : un effet écrit
     dans la closure n'est appelable par aucun banc, donc il reste au niveau du
     jour où il a été écrit pendant que tout ce qui est mesuré monte. Deux
     paramètres, aucun état : la bouffée ne sait pas d'où elle vient, elle sait
     seulement quel âge elle a.
     ⚠️ `k` VA DE 0 (elle vient de naître) À 1 (elle est éteinte). L'appelant tient
     la liste ; ce dessin n'en garde rien.
     ⚠️⚠️ DEUX TONS, ET C'EST LA DEMANDE AU MOT : le MARRON est la terre qu'on
     arrache (elle part avec le pied, elle retombe vite), le GRIS est la cendre
     sèche du fond, plus légère, qui monte et traîne. Un seul ton aurait fait un
     nuage de dessin animé ; deux font une matière. */
  /* ⚠️⚠️ ZIP 459 — ELLE EST AUX PIEDS, ET C'EST UN DÉCALAGE, PAS UN RÉGLAGE.
     Retour de Guillaume, en jouant : *« la poussière doit être autour des pieds,
     pas de la tête aussi. »* L'appelant passe l'ANCRE du personnage — sa case —
     et l'ancre d'un sprite de 24 px tombe à la CEINTURE : l'ombre portée, elle,
     est peinte quatorze pixels plus bas (`py + 15` dans `drawCharacter`). Une
     bouffée centrée sur l'ancre et qui montait de sept pixels culminait donc à
     hauteur de crâne — elle ne sortait pas de sous les semelles, elle enveloppait
     le fermier.
     ⚠️ LE DÉCALAGE VIT ICI ET PAS CHEZ L'APPELANT, pour que le banc puisse le
     mesurer : `render-etoile` vérifie qu'aucun grain ne monte plus haut que le
     genou (la moitié basse du sprite). Chez l'appelant, il aurait été invisible.
     ⚠️ ET LA MONTÉE A ÉTÉ RABOTÉE AVEC : décaler sans raccourcir aurait rendu le
     même défaut, un cran plus bas. */
  const DUST_FOOT_PX = 14;      // de l'ancre du personnage à ses semelles
  const DUST_RISE_PX = 4;       // ce que la cendre s'autorise à monter, au plus
  function drawStarDust(g2, cx, cy, T2, k, seed) {
    const a = Math.max(0, Math.min(1, +k || 0));
    if (a >= 1) return;
    const sc = T2 / 16;
    /* La bouffée s'ouvre vite puis s'éteint doucement : une rampe linéaire se lit
       comme un fondu d'interface, pas comme de la poussière. */
    const grow = Math.pow(a, 0.55), fade = Math.pow(1 - a, 1.5);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const h = ((seed | 0) * 2654435761 + i * 40503) >>> 0;
      const ax = (((h >>> 3) & 255) / 255 - 0.5), ay = (((h >>> 11) & 255) / 255 - 0.5);
      const grey = (h & 1) === 0;
      /* Le gris MONTE (cendre), le marron RETOMBE (terre) — mais deux fois moins
         qu'avant : ce qui doit se voir est une gerbe SOUS le pied, pas un nuage
         autour du personnage. */
      const rise = grey ? -grow * DUST_RISE_PX : grow * 2.0;
      const x = cx + (ax * 6 + ax * grow * 15) * sc;
      const y = cy + (DUST_FOOT_PX + ay * 1.5 + rise) * sc;
      /* ⚠️⚠️ ELLE S'ÉTALE, ELLE NE GONFLE PAS : une ELLIPSE couchée (0,52) et non
         un disque. Rendre la bouffée plus petite pour la garder basse l'aurait
         rendue invisible — le premier jet du 459 est tombé sous le seuil du banc
         (37 px pour 40 exigés). Une poussière arrachée par une semelle FUIT LE
         LONG DU SOL ; l'élargir au lieu de la grossir la rend plus lisible ET
         plus basse, c'est-à-dire les deux choses à la fois. */
      const rad = (1.6 + grow * (grey ? 5.0 : 3.8)) * sc;
      const al = fade * (grey ? 0.34 : 0.46);
      if (al < 0.02) continue;
      g2.fillStyle = grey
        ? `rgba(152,148,140,${al.toFixed(3)})`
        : `rgba(112,86,58,${al.toFixed(3)})`;
      g2.beginPath(); g2.ellipse(x, y, rad, rad * 0.52, 0, 0, 7); g2.fill();
    }
  }

  /* LA FUMÉE — L'AUTRE MOITIÉ, ET ELLE PART DANS LA FILE DE TRI (voir le
     chapeau). ⚠️ ELLE NE S'ARRÊTE JAMAIS TOUT À FAIT TANT QUE L'ÉTOILE EST AU
     FOND : la seconde image de Guillaume, cratère refroidi, garde une volute.
     C'est `starCraterHeat` qui tient ce plancher, pas ce dessin. */
  function drawStarCraterAir(g2, cx, cy, T2, tMs, opt) {
    const o = opt || {};
    const heat = Math.max(0, Math.min(1, o.heat === undefined ? 1 : o.heat));
    if (heat <= 0.01) return;
    const R = C.STAR_CRATER_DRAW_R * T2, t = tMs || 0;
    const cols = 1 + Math.round(4 * heat);
    for (let k = 0; k < cols; k++) {
      const bx = cx + Math.sin(k * 2.39) * R * 0.34, by = cy + Math.cos(k * 1.71) * R * 0.20;
      const per = 4600 + k * 730;
      for (let j = 3; j >= 0; j--) {
        const age = ((t / per) + j / 4 + k * 0.37) % 1;
        const x = bx + age * age * 15 + Math.sin(age * 3.1 + k) * 4;
        const y = by - age * R * (1.45 + 0.30 * (k % 3));
        const rad = 2.6 + age * (8.5 + (k % 3) * 1.4);
        const al = heat * 0.50 * Math.sin(Math.pow(age, 0.80) * Math.PI);
        if (al < 0.02) continue;
        /* ⚠️ UNE BOUFFÉE EST UN CHOU-FLEUR, PAS UNE BILLE : trois disques décalés
           par bouffée. Un seul cercle par bouffée donnait un chapelet de perles —
           le modèle montre des masses bosselées. */
        const col = `rgba(196,194,184,${al.toFixed(3)})`;
        craterDisc(g2, x, y, rad, col, 1);
        craterDisc(g2, x + rad * 0.62, y + rad * 0.20, rad * 0.66, col, 1);
        craterDisc(g2, x - rad * 0.55, y + rad * 0.30, rad * 0.58, col, 1);
        if (rad > 4) craterDisc(g2, x - rad * 0.30, y - rad * 0.45, rad * 0.55, `rgba(230,228,218,${(al * 0.9).toFixed(3)})`, 1);
      }
    }
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 450 — LE NAVIRE DES ÉTOILES. « construire un bateau magique avec les
     ║ étoiles » (Guillaume), après avoir écarté la Lyre : « un peu arbitraire ? ».
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE DESSIN EST LE PISTEUR DE LA QUÊTE, ET C'EST TOUT SON INTÉRÊT. La
     règle qu'on se donne est celle des dix secondes : *à n'importe quel instant,
     l'enfant doit savoir ce qu'il fait EN REGARDANT L'ÉCRAN, sans ouvrir un menu
     et sans lire une phrase.* Un bandeau ne le fait pas — il faut savoir lire, et
     il faut le relire. Un bateau à qui il manque un mât, si.

     ⚠️⚠️⚠️ LES MORCEAUX MANQUANTS SONT DESSINÉS EN FANTÔME, ET C'EST LA DÉCISION
     DE FOND DE CE DESSIN. Trois écritures ont été envisagées :
       1. cinq logements vides en rang sur une borne → il faut comprendre que la
          borne compte quelque chose, donc il faut l'expliquer. Écarté ;
       2. rien du tout, le bateau pousse morceau par morceau → on voit qu'il
          grandit, jamais ce qu'il lui MANQUE, donc on ne sait pas où l'on en est ;
       3. **le morceau absent, peint en creux, à sa place exacte.** On voit d'un
          coup d'œil qu'il manque une voile, et on voit à quoi elle ressemblera.
          C'est le langage que tout jeu de construction emploie, et un enfant de
          sept ans le lit sans une ligne de texte.
     ⚠️ ET LE FANTÔME EST **DÉRIVÉ** DE LA PIÈCE, PAS DESSINÉ UNE SECONDE FOIS :
     on cuit la pièce, on relit ses pixels, on remplace chaque pixel opaque par du
     bleu d'étoile sur un damier. Deux dessins séparés auraient divergé au premier
     réglage (§8 de `CLAUDE.md` : ce qui double un autre paramètre se DÉRIVE), et
     le symptôme aurait été le pire possible — *le fantôme ne ressemble pas à ce
     qu'on obtient*, c'est-à-dire une promesse fausse.

     ⚠️ LA CARCASSE (quille + membrures) EST DANS LA CALE, PAS DANS LA COQUE, et
     ce partage porte tout le sens : dès la première nuit, il y a sur la grève un
     CHANTIER, pas un terrain vague. On ne se demande pas ce que c'est — on voit
     un bateau qu'on n'a pas fini. La coque, elle, n'est que le bordé.

     ⚠️⚠️ AUCUN `translate`, AUCUN `rotate`, AUCUN `clip`, AUCUN DÉGRADÉ, AUCUN
     `fillText` — le faux canevas des bancs ignore les trois premiers, ne connaît
     pas les deux derniers, et un dessin qui en dépend se juge FAUX au banc tout
     en étant juste en jeu (le stub menteur du §10, payé au 448 sur le croissant de
     la comète). Tout est en `fillRect` et en `drawImage`, comme le reste du jeu.
     ⚠️ MARGE SUR LES QUATRE BORDS : un canevas découpe en silence ce qui dépasse
     (427, payé trois fois au 433), et `render-navire` refuse tout pixel peint sur
     le bord.

     LES CINQ MORCEAUX, ET LEUR ORDRE DE DESSIN (de l'arrière vers l'avant) :
       · `sail`   la voile, derrière le mât qui la tient
       · `mast`   le mât et sa vergue
       · `hull`   le bordé, qui recouvre le pied du mât
       · `rudder` le safran, à l'arrière, contre le bordé
       · `bell`   la cloche de bord, à l'étrave, la plus en avant
     ⚠️ L'ORDRE N'EST PAS L'ORDRE DE LA TABLE de `quete.js`, et il ne doit pas
     l'être : celle-ci dit dans quel ORDRE ON LES TROUVE, celui-ci dit ce qui passe
     DEVANT quoi. Les confondre aurait fait passer la voile devant le mât le jour
     où l'on déplace une trouvaille — une grandeur de jeu et une grandeur de
     dessin, deux choses (§441). */
  const SHIP_PAL = {
    wood:  ["#3a2718", "#4e3520", "#66462b", "#7d5836", "#946b43", "#ab8055"],
    keel:  "#33230f",
    rib:   "#4a3320",
    trim:  "#c8a05a",           // le liseré d'or de la lisse
    stone: ["#5f5a50", "#7c766a", "#98917f", "#b0a894"],
    rope:  "#9a8a68",
    sail:  ["#b8b0a0", "#cfc7b6", "#e4dccb", "#f2ecdd"],
    metal: ["#6a5018", "#9a7726", "#c79c3c", "#e8c874"],
    star:  "#dff6ff",
    glow:  [150, 232, 255],
    dark:  "#241a10",           // le cerne
  };
  /* La boîte de dessin, DÉRIVÉE des constantes de jeu — jamais recopiée (§8). */
  const SHIP_W = () => C.STAR_SHIP_DRAW_W * 16;    // 144 px de référence
  const SHIP_H = () => C.STAR_SHIP_DRAW_H * 16;    // 112
  const SHIP_GROUND = 100;                          // la ligne de sol DANS la boîte
  const SHIP_X0 = 14, SHIP_X1 = 132;                // étambot → étrave

  /* Les deux courbes de la coque. ⚠️ CE SONT DES FONCTIONS DE `x`, ET C'EST LE
     SEUL CAS OÙ LA RÈGLE DU 437 (« une courbe `f(x)` ne peut pas se replier »)
     N'EST PAS VIOLÉE : un bordé vu de profil ne se replie effectivement pas — il
     a un dessus et un dessous pour chaque colonne. Une coque vue de DESSUS, elle,
     demanderait un champ ; ce n'est pas ce qu'on peint. */
  function shipT(x) { return (x - SHIP_X0) / (SHIP_X1 - SHIP_X0); }
  function shipKeelY(x) {
    const t = shipT(x);
    const aft = Math.max(0, (0.16 - t) / 0.16), fwd = Math.max(0, (t - 0.78) / 0.22);
    return SHIP_GROUND - 4 - 13 * Math.pow(aft, 1.6) - 21 * Math.pow(fwd, 1.7);
  }
  function shipSheerY(x) {
    const t = shipT(x);
    /* ⚠️ L'ÉTRAVE MONTE PLUS QUE L'ÉTAMBOT, et ce n'est pas un goût : c'est ce
       qui donne un SENS au bateau. Deux extrémités égales font une barque. */
    return 74 - 17 * Math.pow(t, 2.3) - 4 * Math.pow(Math.max(0, (0.14 - t) / 0.14), 1.5);
  }

  /* ⚠️ UN SEUL POINT D'ENTRÉE POUR PEINDRE, ET IL ARRONDIT. Toutes les
     coordonnées de ce dessin sont en pixels de RÉFÉRENCE (tuile 16) ; `u` les
     porte à la tuile courante. Arrondir dans chaque appel plutôt qu'à la fin
     évite les rangées vides d'une rangée sur deux — le défaut de l'ellipse du 448
     (« une ellipse se décrit dans l'espace où on la peint »). */
  function shipR(g, u, x, y, w, h, col) {
    P(g, Math.round(x * u), Math.round(y * u),
      Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u)), col);
  }

  /* ── LA CALE : l'ombre, le ber, les tins de pierre, ET LA CARCASSE.
     ⚠️⚠️ ZIP 453 — `carcass` DÉCOUPE CE DESSIN EN DEUX ÉTATS, ET C'EST CE QUI
     PERMET À LA CALE DE SE VIDER. Quand Eduardo prend le large avec le navire
     (voir `Q.starShipGone`), il ne doit rester QUE le ber, les tins et l'ombre :
     la quille et les membrures peintes ici se liraient sinon comme un bateau
     qu'on n'a pas fini, c'est-à-dire l'inverse exact de ce qui vient de se
     passer. Un second dessin « cale vide » aurait divergé au premier réglage du
     ber (§8 de `CLAUDE.md`) — c'est le MÊME dessin, amputé de sa carcasse. */
  function shipPartCradle(g, u, carcass) {
    const S = SHIP_PAL;
    /* L'ombre portée. ⚠️ Elle est peinte en rangées de largeur calculée, pas en
       `arc()` mis à l'échelle : le faux canevas des bancs connaît `arc`, mais une
       ombre en rangées reste franche au gros pixel. */
    for (let dy = 0; dy <= 5; dy++) {
      const w = Math.round(112 * Math.sqrt(Math.max(0, 1 - (dy / 6) * (dy / 6))));
      shipR(g, u, 72 - w / 2, SHIP_GROUND + dy, w, 1, `rgba(24,30,22,${(0.26 - dy * 0.035).toFixed(3)})`);
    }
    // Le ber : trois madriers qui filent vers l'eau, tons alternés.
    for (let k = 0; k < 3; k++) {
      const y = SHIP_GROUND - 1 + k * 2;
      shipR(g, u, 18 + k * 3, y, 116 - k * 6, 2, S.wood[k === 1 ? 2 : 1]);
      shipR(g, u, 18 + k * 3, y, 116 - k * 6, 1, S.wood[3]);
    }
    // Les tins de pierre sous la quille, appareillés (lumière en haut à gauche).
    for (const bx of [34, 92]) {
      shipR(g, u, bx, SHIP_GROUND - 9, 20, 10, S.stone[1]);
      shipR(g, u, bx, SHIP_GROUND - 9, 20, 2, S.stone[3]);
      shipR(g, u, bx, SHIP_GROUND - 1, 20, 2, S.stone[0]);
      for (let j = 0; j < 3; j++) shipR(g, u, bx + 2 + j * 6, SHIP_GROUND - 7, 1, 8, S.stone[0]);
    }
    if (!carcass) return;   // zip 453 — la cale seule : il est parti
    /* ⚠️⚠️ LA QUILLE ET LES MEMBRURES SONT ICI, PAS DANS `hull` — voir le chapeau.
       C'est ce qui fait qu'on lit un CHANTIER dès la première nuit. */
    for (let x = SHIP_X0; x <= SHIP_X1; x++) shipR(g, u, x, shipKeelY(x) - 1, 1, 5, S.keel);
    /* ⚠️⚠️ SEPT MEMBRURES, ET UNE LISSE DE CONSTRUCTION QUI LES RELIE — vu sur la
       planche : dix membrures nues, toutes de la même hauteur et régulièrement
       espacées, font une PALISSADE et pas une carcasse de bateau. C'est la règle du
       437 prise par l'autre bout (« le naturel ne s'obtient pas en mettant du
       désordre partout ») : ce qui manquait n'était pas de l'irrégularité, c'était
       la pièce qui prouve que ces bois appartiennent au MÊME ouvrage. Une lisse
       courbe posée sur leur tête, et l'œil lit une coque en construction. */
    const RIBS = 7;
    for (let k = 0; k <= RIBS; k++) {
      const x = SHIP_X0 + 5 + k * ((SHIP_X1 - SHIP_X0 - 12) / RIBS);
      const y0 = shipSheerY(x), y1 = shipKeelY(x);
      if (y1 - y0 < 3) continue;
      shipR(g, u, x - 1, y0 + 1, 2, y1 - y0 + 1, S.rib);
      shipR(g, u, x - 1, y0 + 1, 1, y1 - y0 + 1, S.wood[1]);   // l'arête éclairée, discrète
    }
    // La lisse de construction : elle suit la sheer, donc elle ne peut pas mentir.
    for (let x = SHIP_X0 + 4; x <= SHIP_X1 - 6; x++) {
      shipR(g, u, x, shipSheerY(x) + 1, 1, 2, S.rib);
      shipR(g, u, x, shipSheerY(x) + 1, 1, 1, S.wood[2]);
    }
  }

  /* ── LE BORDÉ. Cinq virures, la lisse claire, la ligne de flottaison sombre. */
  function shipPartHull(g, u) {
    const S = SHIP_PAL;
    for (let x = SHIP_X0; x <= SHIP_X1; x++) {
      const y0 = shipSheerY(x), y1 = shipKeelY(x);
      if (y1 - y0 < 2) continue;
      const h = y1 - y0;
      for (let y = Math.round(y0); y <= Math.round(y1); y++) {
        /* ⚠️ LA VALEUR SE QUANTIFIE EN PALIERS (446) : un dégradé continu sur un
           bordé fait une tache lisse, les paliers font des VIRURES. Six tons, le
           clair en haut (la lumière du jeu vient d'en haut à gauche). */
        const k = (y - y0) / h;
        let ci = 5 - Math.min(5, Math.floor(k * 6.2));
        if ((y - Math.round(y0)) % 5 === 4) ci = Math.max(0, ci - 2);   // le joint entre deux virures
        shipR(g, u, x, y, 1, 1, S.wood[ci]);
      }
      // La lisse : deux rangées claires, puis le liseré d'or au-dessus.
      shipR(g, u, x, y0, 1, 2, S.wood[5]);
      shipR(g, u, x, y0 - 1, 1, 1, S.trim);
    }
    // L'étrave et l'étambot, plus épais que le bordé : ce sont des pièces.
    for (let y = Math.round(shipSheerY(SHIP_X1) - 2); y <= Math.round(shipKeelY(SHIP_X1)); y++)
      shipR(g, u, SHIP_X1 - 2, y, 4, 1, S.wood[1]);
    for (let y = Math.round(shipSheerY(SHIP_X0)); y <= Math.round(shipKeelY(SHIP_X0)); y++)
      shipR(g, u, SHIP_X0 - 1, y, 4, 1, S.wood[1]);
    /* Les sabords : quatre ouvertures sombres, DÉDUITES de la lisse et non posées
       à la main — une position réglée à l'œil penchera (441). */
    for (let k = 0; k < 4; k++) {
      const x = 40 + k * 20, y = shipSheerY(x) + 7;
      shipR(g, u, x, y, 7, 6, S.dark);
      shipR(g, u, x + 1, y + 1, 5, 4, "rgba(90,160,190,0.55)");
      shipR(g, u, x, y - 1, 7, 1, S.wood[4]);
    }
  }

  /* ── LE SAFRAN, à l'étambot. Petit, mais c'est ce qui fait qu'un bateau se
     DIRIGE : sans lui il dérive, et l'étoile le dit. */
  function shipPartRudder(g, u) {
    const S = SHIP_PAL;
    const yTop = shipSheerY(SHIP_X0) + 4, yBot = shipKeelY(SHIP_X0) + 8;
    shipR(g, u, SHIP_X0 - 7, yTop, 6, yBot - yTop, S.wood[2]);
    shipR(g, u, SHIP_X0 - 7, yTop, 2, yBot - yTop, S.wood[4]);
    shipR(g, u, SHIP_X0 - 7, yBot - 2, 6, 2, S.wood[0]);
    for (const fy of [yTop + 3, yBot - 7]) {                 // les ferrures
      shipR(g, u, SHIP_X0 - 8, fy, 10, 2, S.metal[1]);
      shipR(g, u, SHIP_X0 - 8, fy, 10, 1, S.metal[3]);
    }
    // La barre, qui monte vers le pont : une diagonale en escalier.
    for (let k = 0; k < 12; k++)
      shipR(g, u, SHIP_X0 - 5 + k, yTop - 1 - Math.round(k * 0.55), 2, 2, S.wood[3]);
  }

  /* ── LE MÂT ET SA VERGUE. ⚠️ IL MONTE JUSQU'À SIX PIXELS DU BORD HAUT, et pas
     plus : c'est le piège du canevas qui découpe en silence (427/433). */
  function shipPartMast(g, u) {
    const S = SHIP_PAL;
    const mx = 74, top = 8, foot = shipSheerY(mx) + 6;
    shipR(g, u, mx - 2, top, 5, foot - top, S.wood[2]);
    shipR(g, u, mx - 2, top, 2, foot - top, S.wood[4]);      // l'arête éclairée
    shipR(g, u, mx + 2, top, 1, foot - top, S.wood[0]);
    shipR(g, u, mx - 3, top, 7, 3, S.metal[1]);              // le capelage
    // La vergue, et ses deux itagues.
    shipR(g, u, 44, 26, 61, 3, S.wood[3]);
    shipR(g, u, 44, 26, 61, 1, S.wood[5]);
    shipR(g, u, 44, 26, 2, 4, S.wood[1]); shipR(g, u, 103, 26, 2, 4, S.wood[1]);
    /* Les haubans : deux par bord, en escalier d'un pixel. ⚠️ Ils partent du
       capelage et tombent sur la lisse, donc leurs PIEDS sont dérivés de
       `shipSheerY` — posés à la main, ils flotteraient au-dessus du bordé. */
    for (const [x1, sgn] of [[30, -1], [118, 1]]) {
      const y1 = shipSheerY(x1) + 1, n = Math.round(Math.abs(x1 - mx));
      for (let k = 0; k <= n; k += 1) {
        const x = mx + sgn * k, y = top + 4 + (y1 - top - 4) * (k / n);
        shipR(g, u, x, y, 1, 1, S.rope);
      }
    }
  }

  /* ── LA VOILE. ⚠️ ELLE EST BOMBÉE, ET SON VENTRE EST DU CÔTÉ DE L'ÉTRAVE : une
     voile plate est un drap. Le ventre se décrit par une largeur qui varie avec
     la hauteur, jamais par une forme repliée (437). */
  /* ⚠️⚠️ PREMIER JET JETÉ, ET LA PLANCHE L'A MONTRÉ EN UNE SECONDE : une demi-
     largeur en `sin(k^0.85 · π)` donne une LENTILLE — un ballon blanc pendu au
     mât, pas une voile. La faute est la même que la collerette de tournesol du
     446 : *une formule de forme qui décore au lieu de décrire l'objet.* Une voile
     carrée est un TRAPÈZE — un peu plus large au bas (le point d'écoute borde plus
     loin que la vergue) — dont les bords se creusent légèrement sous le vent. On
     décrit donc la largeur par une interpolation franche entre têtière et bordure,
     plus un ventre en `sin(πk)` qui ne fait que la BOMBER. */
  function shipPartSail(g, u) {
    const S = SHIP_PAL;
    const yTop = 30, yBot = 70, mx = 74;
    const HALF_TOP = 27, HALF_BOT = 31;
    for (let y = yTop; y <= yBot; y++) {
      const k = (y - yTop) / (yBot - yTop);
      const half = HALF_TOP + (HALF_BOT - HALF_TOP) * k + 2.5 * Math.sin(k * Math.PI);
      /* Le ventre : la voile est poussée vers l'ÉTRAVE, donc son centre glisse
         vers la droite. C'est ce qui la fait lire comme portée par le vent plutôt
         que pendue. */
      const belly = 5 * Math.sin(k * Math.PI);
      const x0 = mx - half + belly, w = half * 2;
      /* Quatre valeurs quantifiées, du guindant (à l'ombre) à la chute (éclairée).
         ⚠️ Le clair est vers la DROITE et non au centre : une voile creuse reçoit
         la lumière sur sa partie la plus fuyante, et un dégradé symétrique ferait
         un coussin. */
      shipR(g, u, x0, y, w, 1, S.sail[1]);
      shipR(g, u, x0 + w * 0.22, y, w * 0.58, 1, S.sail[2]);
      shipR(g, u, x0 + w * 0.58, y, w * 0.30, 1, S.sail[3]);
      shipR(g, u, x0, y, 3, 1, S.sail[0]);                    // le guindant, dans l'ombre du mât
      shipR(g, u, x0 + w - 2, y, 2, 1, S.sail[1]);            // la chute, un rien plus sourde
      // Les bandes de ris : trois, horizontales, comme sur une vraie voile carrée.
      if ((y - yTop) % 13 === 12) shipR(g, u, x0 + 2, y, w - 4, 1, S.sail[0]);
    }
    // La têtière et la bordure : deux ralingues franches, sinon la toile bave.
    shipR(g, u, mx - HALF_TOP, yTop, HALF_TOP * 2, 1, S.sail[0]);
    shipR(g, u, mx - HALF_BOT + 5, yBot, HALF_BOT * 2, 1, S.sail[0]);
    /* ⚠️⚠️ L'ÉTOILE COUSUE, ET ELLE EST UNE ÉTINCELLE À QUATRE BRANCHES, PAS UN
       PENTAGRAMME. Le premier jet posait cinq rayons de carrés : à vingt pixels ça
       ne fait pas une étoile, ça fait une tache avec des pattes — l'échancrure
       d'un pentagramme demande plus de place que le dessin n'en a (c'est la leçon
       du 449 sur la compagne : *un cerne d'un pixel impose une échancrure d'au
       moins trois*). Quatre branches effilées se lisent à cette taille, et c'est
       déjà le langage visuel de la quête (le chevron, les éclats). */
    const sx = mx + 4, sy = 49, R0 = 13;
    for (let r = 0; r <= R0; r++) {
      const w = Math.max(1, Math.round(Math.pow(1 - r / R0, 1.9) * 6));
      shipR(g, u, sx - w / 2, sy - r, w, 1, S.star);          // haut
      shipR(g, u, sx - w / 2, sy + r, w, 1, S.star);          // bas
      shipR(g, u, sx - r, sy - w / 2, 1, w, S.star);          // gauche
      shipR(g, u, sx + r, sy - w / 2, 1, w, S.star);          // droite
    }
    for (let r = 0; r <= 5; r++) {                            // les quatre diagonales, courtes
      const w = Math.max(1, Math.round((1 - r / 5) * 2));
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        shipR(g, u, sx + dx * r * 0.7 - w / 2, sy + dy * r * 0.7 - w / 2, w, w, S.star);
    }
    // Les écoutes, du point d'écoute vers le pont.
    for (let k = 0; k <= 14; k++) shipR(g, u, mx + 30 + k * 0.7, yBot + Math.round(k * 0.5), 1, 1, S.rope);
  }

  /* ── LA CLOCHE DE BORD. ⚠️ C'EST LE CINQUIÈME MORCEAU, ET C'EST CELUI DE
     L'ÉGLISE : elle est trop lourde pour rentrer au ciel, elle n'a jamais eu de
     bateau, elle donne sa voix et elle voyagera. Elle est donc EN BRONZE VERDI et
     pas en laiton neuf — c'est la même cloche, on doit la reconnaître. */
  function shipPartBell(g, u) {
    const S = SHIP_PAL;
    const bx = 118, by = 38;
    /* La potence : deux montants et un chapeau, pour qu'elle soit MONTÉE et non
       posée en l'air. ⚠️ Vu sur la planche : sans montants visibles, la cloche
       flottait et se lisait comme une lanterne accrochée. */
    shipR(g, u, bx - 8, by - 3, 3, 14, S.wood[2]);
    shipR(g, u, bx + 6, by - 3, 3, 14, S.wood[2]);
    shipR(g, u, bx - 9, by - 5, 19, 3, S.wood[3]);
    shipR(g, u, bx - 9, by - 5, 19, 1, S.wood[5]);
    // Le joug de bois et l'axe : ce qui la fait basculer.
    shipR(g, u, bx - 5, by - 1, 13, 3, S.wood[1]);
    shipR(g, u, bx - 5, by - 1, 13, 1, S.wood[4]);
    /* ⚠️⚠️ UNE CLOCHE N'EST PAS UN CÔNE, ET LE PREMIER JET EN ÉTAIT UN — vu sur la
       planche, il se lisait comme un VASE. Le profil qui la fait reconnaître a
       quatre parties et trois d'entre elles sont presque droites : un cerveau
       étroit, une ÉPAULE qui s'élargit d'un coup, une taille qui ne bouge presque
       pas, puis un PIED DE SON large et ÉPAIS. C'est la règle du 438 sous une
       autre forme : *on assemble des masses, on ne texture pas une silhouette* —
       et ici la silhouette EST ce qui identifie l'objet. */
    const PROFILE = [3, 4, 7, 8, 9, 9, 10, 10, 11, 12, 13, 15, 16, 16];
    for (let k = 0; k < PROFILE.length; k++) {
      const w = PROFILE[k], y = by + 2 + k;
      const tone = k < 2 ? S.metal[0] : k >= PROFILE.length - 2 ? S.metal[0] : S.metal[1];
      shipR(g, u, bx + 1 - w / 2, y, w, 1, tone);
      // La lumière en haut à gauche, comme partout dans le jeu.
      shipR(g, u, bx + 1 - w / 2, y, Math.max(1, Math.round(w * 0.30)), 1, k < 2 ? S.metal[1] : S.metal[2]);
      shipR(g, u, bx + 1 + w / 2 - 1, y, 1, 1, S.metal[0]);
    }
    // Le pied de son : deux rangées franches, plus larges que la jupe.
    shipR(g, u, bx - 8, by + 16, 18, 2, S.metal[1]);
    shipR(g, u, bx - 8, by + 16, 6, 1, S.metal[3]);
    shipR(g, u, bx - 8, by + 18, 18, 1, S.metal[0]);
    shipR(g, u, bx, by + 19, 2, 3, S.metal[2]);           // le battant, qui dépasse
    shipR(g, u, bx - 1, by + 21, 4, 2, S.metal[3]);
  }

  const SHIP_PARTS_DRAW = {
    sail: shipPartSail, mast: shipPartMast, hull: shipPartHull,
    rudder: shipPartRudder, bell: shipPartBell,
  };
  /* ⚠️ L'ORDRE DE DESSIN, ÉCRIT UNE FOIS. Voir le chapeau : il n'est pas celui de
     la table de `quete.js`, et c'est délibéré. */
  const SHIP_Z = ["sail", "mast", "hull", "rudder", "bell"];

  const shipCache = new Map();
  /* Cuit une couche. ⚠️ CANEVAS TRANSPARENT (446) : le sol, la saison, la nuit et
     la météo restent dessous et continuent d'être hérités gratuitement.
     ⚠️⚠️ ET LE FANTÔME EST DÉRIVÉ DE LA PIÈCE PAR RELECTURE DE SES PIXELS — c'est
     la garantie que la promesse ressemble à ce qu'on obtient. Le damier tient
     chaque pixel OPAQUE (règle du tramage, 446) : un fantôme en alpha uniforme
     sur de l'herbe donne un vert bleuté translucide, c'est-à-dire du brouillard. */
  function shipBake(T2, part, ghost) {
    const key = (T2 | 0) + ":" + part + ":" + (ghost ? "g" : "s");
    const hit = shipCache.get(key);
    if (hit) return hit;
    const u = T2 / 16, W = Math.round(SHIP_W() * u), H = Math.round(SHIP_H() * u);
    const [c, g] = cv(W, H);
    /* ⚠️ ZIP 453 — DEUX CLÉS POUR LE MÊME DESSIN : `cradle` (avec la carcasse,
       tout le temps de la quête) et `slip` (sans, une fois le navire parti). */
    const isBase = part === "cradle" || part === "slip";
    if (isBase) shipPartCradle(g, u, part === "cradle");
    else SHIP_PARTS_DRAW[part](g, u);
    if (!isBase) outlineSprite(g, W, H, SHIP_PAL.dark);
    if (ghost) {
      const img = g.getImageData(0, 0, W, H), d = img.data;
      const G = SHIP_PAL.glow;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (!d[i + 3]) continue;
        /* ⚠️⚠️ LE CERNE RESTE SOMBRE, ET C'EST LA RÈGLE DU 441 (« un cerne sert
           AUSSI contre un fond clair »), vue sur la planche : un fantôme
           entièrement bleu clair est parfaitement lisible sur la nuit et
           DISPARAÎT sur l'herbe de jour — exactement les cierges de cire blanche
           sur le marbre pâle du chœur. Ce qui manquait n'était pas du contraste,
           c'était un contour. On reconnaît le cerne à ce qu'il est très sombre :
           il a été posé juste avant par `outlineSprite`. */
        const dark = d[i] < 70 && d[i + 1] < 70 && d[i + 2] < 70;
        /* Un damier de pas 2 : la moitié des pixels tombe, l'autre reste franche.
           C'est ce qui fait lire « pas encore là » sans faire lire « flou ».
           ⚠️ Le cerne, lui, n'est PAS ajouré : ajouré, il cesse d'être un trait. */
        if (!dark && ((x + y) & 1) === 0) { d[i + 3] = 0; continue; }
        if (dark) { d[i + 3] = 150; continue; }
        d[i] = G[0]; d[i + 1] = G[1]; d[i + 2] = G[2]; d[i + 3] = 190;
      }
      g.putImageData(img, 0, 0);
    }
    c.ox = W >> 1; c.oy = Math.round((SHIP_GROUND + 1) * u);
    shipCache.set(key, c);
    return c;
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — LA FEUILLE DE PLAN. « on verra le plan virtuel du bateau. »
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ ELLE EST ICI ET PAS DANS LE PANNEAU REACT, ET C'EST LA MÊME RAISON QUE
     POUR LE CRATÈRE, LE NAVIRE ET LA COMÈTE : un dessin écrit dans un composant
     est un dessin qu'aucun banc ne peut appeler, donc un dessin qui **reste au
     niveau du jour où il a été écrit** pendant que tout le reste monte (§ piège
     n°1, deuxième visage — payé sur les sols d'intérieur, les arbres de la ferme
     et la comète du 445).
     ⚠️⚠️ ET ELLE RÉUTILISE LES CUISSONS DU NAVIRE, elle ne redessine RIEN. C'est
     ce qui garantit qu'un plan ne peut pas montrer un autre bateau que celui de la
     grève : même `shipBake`, mêmes pièces, même ordre. Un second dessin « vu de
     côté, en bleu » aurait divergé au premier réglage de la coque, et personne
     n'aurait pu s'en apercevoir — les deux auraient eu l'air justes (§8).
     ⚠️ LE BLEU DE PLAN EST OBTENU EN INVERSANT LA VALEUR, pas en repeignant : on
     pose la feuille, on tire les pièces en fantôme, et on couche par-dessus une
     encre. Trois pièces posées et deux à venir se distinguent alors par leur
     ÉCLAT et pas par leur couleur — ce qui reste lisible pour un daltonien, et ce
     qui reste lisible en petit. */
  function drawStarPlan(g2, x, y, W, H, parts, tMs) {
    const P5 = Array.isArray(parts) ? parts : [];
    const t = tMs || 0;
    /* La feuille : un bleu d'ozalid, un peu sali sur les bords (une feuille
       parfaitement propre se lit comme un rectangle d'interface). */
    g2.fillStyle = "#14324e"; g2.fillRect(x, y, W, H);
    g2.fillStyle = "#1b4066";
    for (let i = 0; i < 5; i++) {
      const bx = x + ((i * 37) % Math.max(1, W - 40)), by = y + ((i * 53) % Math.max(1, H - 30));
      g2.fillRect(bx, by, 26 + (i % 3) * 8, 12 + (i % 2) * 6);
    }
    /* Le quadrillage, franc et à période longue : une trame fine ferait une
       moirure au gros pixel (434 — la période prime sur les détails). */
    g2.fillStyle = "rgba(150,200,240,0.16)";
    for (let gx = x + 8; gx < x + W; gx += 16) g2.fillRect(gx, y, 1, H);
    for (let gy = y + 8; gy < y + H; gy += 16) g2.fillRect(x, gy, W, 1);
    g2.fillStyle = "rgba(190,225,255,0.55)";
    g2.fillRect(x + 3, y + 3, W - 6, 1); g2.fillRect(x + 3, y + H - 4, W - 6, 1);
    g2.fillRect(x + 3, y + 3, 1, H - 6); g2.fillRect(x + W - 4, y + 3, 1, H - 6);
    /* Le bateau, à l'échelle de la feuille. ⚠️ L'ÉCHELLE EST DÉRIVÉE DE LA BOÎTE
       DE DESSIN DU NAVIRE, jamais choisie : le jour où la coque s'allonge, le plan
       la contient toujours. */
    const T2 = Math.max(4, Math.floor(Math.min((W - 24) / C.STAR_SHIP_DRAW_W, (H - 40) / C.STAR_SHIP_DRAW_H)));
    const cx = x + W / 2, cy = y + H - 18;
    for (const key of SHIP_Z) {
      const idx = C.STAR_SHIP_ORDER.indexOf(key);
      const has = idx >= 0 && !!P5[idx];
      const c2 = shipBake(T2, key, !has);
      g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
      /* ⚠️ CE QUI EST DÉJÀ CONSTRUIT EST REPASSÉ, donc plus dense — c'est
         l'avancement, lu sans un seul chiffre. Une pièce à venir bat lentement :
         ce qui bouge est ce qui MANQUE, jamais l'inverse (règle du 450). */
      if (has) g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
      else if (Math.sin(t / 900 + idx * 1.1) > 0.2)
        g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
    }
    /* La ligne de flottaison et les cotes : ce qui fait qu'une silhouette de
       bateau se lit comme un PLAN et pas comme une image de bateau. */
    g2.fillStyle = "rgba(190,225,255,0.40)";
    g2.fillRect(x + 10, cy - 2, W - 20, 1);
    for (let k = 0; k <= 4; k++) g2.fillRect(x + 10 + k * ((W - 20) / 4), cy - 5, 1, 4);
  }

  /* ⚠️⚠️ LE POINT D'ENTRÉE. `parts` EST LE TABLEAU RENDU PAR `Q.starShipParts` —
     on ne lui passe PAS l'état de la quête, et c'est volontaire : `fermeArt` ne
     doit rien savoir de `quete.js`, sinon le banc de rendu devrait monter toute la
     quête pour peindre un bateau. Il reçoit cinq booléens, il peint.
     `opt.t` anime, `opt.night` allume, `opt.sail` gonfle la voile.
     ⚠️⚠️ ZIP 453 — `opt.gone` VIDE LA CALE, et c'est la seule chose de ce dessin
     qui parle de la FIN. Le rendu ne lisait que `parts`, donc un navire complet
     restait à quai pour toujours pendant que la scène finale affirmait qu'il
     prenait la mer. Il part maintenant avec Eduardo (`Q.starShipGone`) et il
     revient quand Eduardo rentre : c'est le même bateau, pas un décor de plus.
     ⚠️ ET IL NE DESSINE PAS DE FANTÔMES DANS CE CAS — un fantôme dit « ça
     viendra », or ici c'est parti. */
  function drawStarShip(g2, cx, cy, T2, parts, tMs, opt) {
    const o = opt || {}, t = tMs || 0, u = T2 / 16;
    const P5 = Array.isArray(parts) ? parts : [];
    const built = P5.filter(Boolean).length;
    if (o.gone) {
      const sl = shipBake(T2, "slip", false);
      g2.drawImage(sl, Math.round(cx) - sl.ox, Math.round(cy) - sl.oy);
      return;
    }
    const cr = shipBake(T2, "cradle", false);
    g2.drawImage(cr, Math.round(cx) - cr.ox, Math.round(cy) - cr.oy);
    for (const key of SHIP_Z) {
      const idx = C.STAR_SHIP_ORDER.indexOf(key);
      const has = idx >= 0 && !!P5[idx];
      /* ╔══════════════════════════════════════════════════════════════════════
         ║ ZIP 454 — LE FANTÔME NE S'AFFICHE QUE SI ON A LES PLANS.
         ╚══════════════════════════════════════════════════════════════════════
         ⚠️⚠️ DEMANDE DE GUILLAUME : « le fantôme du bateau (visualisation
         virtuelle) […] ne doit être visible que lorsqu'on a trouvé le moyen de
         produire *le plan* de construction […] mais seulement à partir de ce
         moment là. » Le 450 les peignait TOUJOURS : un joueur qui n'a rien
         commencé voyait, dès la première nuit, la silhouette spectrale du bateau
         entier — c'est-à-dire la fin de l'histoire offerte à qui n'en a pas lu la
         première ligne. Un fantôme est une PROMESSE, et une promesse gratuite ne
         promet rien.
         ⚠️ LE TEST EST UN BOOLÉEN PASSÉ PAR L'APPELANT, jamais l'état de la quête :
         `fermeArt` ne sait toujours rien de `quete.js` (c'est ce qui permet au banc
         de peindre ce bateau sans monter toute l'histoire). Il reçoit cinq
         booléens et un sixième ; il peint.
         ⚠️ ET LA CALE, ELLE, RESTE : décision du 450, toujours juste. Sans bateau
         ni fantôme, la grève garde un chantier naval — un endroit de vie, pas un
         trou dans le décor. */
      if (!has && !o.ghosts) continue;
      /* ⚠️ LE FANTÔME PULSE, LA PIÈCE NON. Une pièce posée qui respirerait dirait
         « pas encore fini » : ce qui bouge est ce qui MANQUE, jamais l'inverse. */
      const c2 = shipBake(T2, key, !has);
      if (has) g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
      else {
        /* Le battement du fantôme, peint en repassant la pièce une seconde fois
           aux instants clairs — jamais par `globalAlpha`, que le faux canevas des
           bancs ne restitue pas (448). */
        g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
        if (Math.sin(t / 700 + idx * 1.1) > 0.35)
          g2.drawImage(c2, Math.round(cx) - c2.ox, Math.round(cy) - c2.oy);
      }
    }
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ LA LUEUR — ET LE PREMIER JET A REFAIT LE HALO DE LA COMÈTE DU 448.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ UN SEUL DISQUE À UNE SEULE VALEUR DESSINE UN BORD. Vu sur la planche :
       une **assiette bleue** posée derrière le navire, dont la limite se voyait
       mieux que le bateau. C'est mot pour mot le défaut du 448 (« quantifier la
       valeur reste la règle, mais trop peu de paliers ne simplifie pas : ça dessine
       un bord »), et c'est la deuxième fois qu'il se paie. *Ce qui doit s'ÉTEINDRE
       demande assez de marches pour que l'œil lise une pente, et la dernière doit
       être presque rien.*
       ⚠️ ET LA LUMIÈRE VIENT DES PIÈCES, PAS DU CIEL : une étincelle par morceau
       posé, à SA place, plus un voile très faible autour d'elles. On voit alors
       COMBIEN de morceaux brillent — c'est le compteur — au lieu d'un halo global
       qui ne dit qu'« il se passe quelque chose ». */
    if (built > 0) {
      /* ⚠️ CHAQUE ÉTINCELLE EST À UN POINT CARACTÉRISTIQUE DE SA PIÈCE, PAS EN SON
         MILIEU. Premier jet : celle de la coque était au centre du bordé, et sur la
         planche elle se lisait comme une TACHE sur le bois. Posée sur la tête de
         l'étrave — le point qu'on regarde quand on regarde une coque — elle se lit
         comme une lumière AU BOUT du bateau. Même déplacement pour le mât, monté à
         sa pomme. */
      const SPARK = { hull: [129, 60], rudder: [8, 86], mast: [74, 11], sail: [78, 49], bell: [119, 47] };
      for (let i = 0; i < C.STAR_SHIP_ORDER.length; i++) {
        if (!P5[i]) continue;
        const sp = SPARK[C.STAR_SHIP_ORDER[i]];
        if (!sp) continue;
        const b = 0.5 + 0.5 * Math.sin(t / 1150 + i * 1.7);
        const sx = cx + Math.round((sp[0] - SHIP_W() / 2) * u);
        const sy = cy - Math.round((SHIP_GROUND + 1 - sp[1]) * u);
        /* Six paliers, le dernier presque rien — la recette du 448. ⚠️ ET SERRÉS :
           le premier jet montait à 14 px de rayon et faisait, sur la planche, une
           buée blanche large comme trois cases. Une étincelle est petite ; ce qui
           doit être grand, c'est leur NOMBRE. */
        for (let s = 5; s >= 0; s--) {
          const r = (1.2 + s * 1.35) * u, a = (0.115 - s * 0.019) * (o.night ? 1.7 : 1) * (0.55 + 0.45 * b);
          if (a <= 0.004) continue;
          craterDisc(g2, sx, sy, r, `rgba(${SHIP_PAL.glow[0]},${SHIP_PAL.glow[1]},${SHIP_PAL.glow[2]},${a.toFixed(3)})`, 1);
        }
        craterDisc(g2, sx, sy, Math.max(1, 0.9 * u), `rgba(255,255,255,${(0.50 + 0.3 * b).toFixed(2)})`, 1);
      }
    }
    /* LA MARQUE DE FIN : quand les cinq y sont, l'étoile de la voile bat pour de
       bon. C'est la seule différence entre « fini » et « presque fini », et elle
       doit se voir d'un coup. */
    if (built === C.STAR_SHIP_ORDER.length) {
      const p = 0.5 + 0.5 * Math.sin(t / 620);
      const sx = cx + Math.round((78 - SHIP_W() / 2) * u), sy = cy - Math.round((SHIP_GROUND + 1 - 49) * u);
      for (let s = 4; s >= 0; s--)
        craterDisc(g2, sx, sy, (5 + s * 3.4) * u,
                   `rgba(255,255,255,${(0.11 - s * 0.021 + 0.03 * p).toFixed(3)})`, 1);
    }
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 448 — LA COMÈTE. (Guillaume : « l'animation de la comète est trop
     ║ ridicule… mettre au même niveau de détail et de soin graphique la comète
     ║ elle-même et le cratère ».)
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ ELLE EST ICI ET PAS DANS LA BOUCLE DE RENDU, ET C'EST LA RAISON MÊME DU
     DÉFAUT QU'ON CORRIGE. Le dessin du 444/445 tenait en huit lignes au milieu de
     `drawStarOverlay` : un `createLinearGradient` et un `arc()` blanc. Il n'a
     jamais été « bâclé » — il a VIEILLI, exactement comme les sols d'intérieur
     restés au 426 pendant douze zips (§ piège n°1, deuxième visage). Un dessin
     qu'aucun banc ne peut appeler reste au niveau du jour où il a été écrit
     pendant que tout ce qui est mesuré monte : le cratère a eu trois passes et
     un banc, la comète zéro. *« Ce dessin est-il regardable par un banc ? » est
     une question de QUALITÉ, et elle se pose avant le premier `fillRect`.*

     ── CE QUE MONTRENT LES DEUX MODÈLES DE GUILLAUME (`refs/…fgcq7y….jpg`, la
        comète seule sur fond vert ; `refs/…hayq7g….jpg`, l'impact dans le
        cratère). Sept couches, et l'ordre compte :
          1. une TRAÎNÉE DE FUMÉE gris-bleu, en mèches, qui s'effiloche en
             pixels détachés — pas un dégradé ;
          2. du FEU or/orange près de la tête, en langues distinctes ;
          3. un HALO CYAN large et doux (le « glow » demandé), en paliers ;
          4. un CERNE bleu nuit tout autour de la tête ;
          5. un NOYAU en bandes de bleu, du sombre au clair ;
          6. un CŒUR BLANC PUR, décentré vers l'avant ;
          7. un CROISSANT D'OR épais à l'ARRIÈRE, qui se raccorde au feu, et un
             fin liseré d'or sur l'avant.
     ⚠️ LE CROISSANT EST À L'ARRIÈRE, ET C'EST CONTRE-INTUITIF : on attend la
     matière incandescente sur la face qui frappe l'air. C'est pourtant ce que
     montre le modèle, et c'est juste — ce qu'on voit brûler est ce qui a DÉJÀ
     été arraché et qui s'échappe vers l'arrière. Le liseré avant, lui, est la
     face chauffée. Peindre l'inverse donne une tête qui a l'air de reculer.

     ⚠️⚠️ TOUT EST EN PIXELS FRANCS D'UN QUANTUM `q`, ET CE N'EST PAS DU STYLE.
     La cinématique se peint en espace ÉCRAN, par-dessus un monde dessiné à
     ZOOM 3 : une comète en `arc()` lisse au milieu de gros pixels est une image
     étrangère collée sur le jeu. `q` se DÉRIVE du zoom réel de la vue (l'appelant
     le passe), il n'est pas réglé — sinon il divergerait le jour où le dézoom du
     428 change (§8 : un paramètre qui double un autre doit être dérivé).

     ⚠️ ET LA QUEUE EST FAITE DE MÈCHES DE LONGUEURS TRÈS INÉGALES, tirées avec la
     même queue lourde que les fibres du cratère (`pow(rnd, 1.8)`). Tirées
     uniformément elles redonnent un CÔNE — c'est-à-dire le dégradé qu'on
     remplace. La leçon est identique à celle du 446 sur la gerbe, et elle se
     paie deux fois si on l'oublie ici. */
  /* ⚠️⚠️ TOUT EN RVB, JAMAIS EN HEXA, ET CE N'EST PAS UN DÉTAIL DE STYLE : la
     comète s'ATTÉNUE (elle est lointaine, puis proche) et la seule façon
     honnête de la faire pâlir est de moduler l'alpha de chaque couleur. Teinter
     par `globalAlpha` marcherait dans le navigateur et PAS dans le faux canevas
     des bancs, dont `restore()` ne rend que la transformation — on aurait un
     dessin juste en jeu et faux au banc, c'est-à-dire le stub menteur du §10
     dans l'outil censé nous en protéger. */
  const COMET_PAL = {
    rim:   [11, 28, 60],                                             // le cerne bleu nuit
    core:  [[31, 79, 140], [47, 126, 200], [95, 182, 234], [169, 228, 251]],
    white: [255, 255, 255],
    gold:  [[240, 132, 42], [255, 176, 60], [255, 208, 106], [255, 233, 176]],
    smoke: [[143, 162, 184], [108, 125, 146], [84, 98, 122]],
  };
  const COMET_TAIL_N = 18;
  /* Les mèches, tirées UNE FOIS. ⚠️ Même graine à chaque image : une queue
     retirée par image grouille, elle ne brûle pas. Ce qui bouge est la PHASE,
     pas la forme (règle des braises du cratère, 446).
     ⚠️⚠️ ET ELLES SONT MINCES. Premier jet : `fat` jusqu'à 1,3 rayon de tête et
     un gonflement de la fumée en prime — regardé sur la planche, ça faisait un
     TAMPON D'OUATE, c'est-à-dire précisément le dégradé qu'on remplaçait, en
     plus gros. Le banc l'a chiffré avant l'œil (« 1 inversion de pente en
     travers » : aucune mèche ne se distingue de sa voisine). Une queue se lit
     par ses VIDES autant que par sa matière. */
  const COMET_TAIL = (() => {
    const r = makeRnd(4489), out = [];
    for (let k = 0; k < COMET_TAIL_N; k++)
      out.push({
        len: 0.26 + Math.pow(r(), 1.8) * 0.74,   // la queue lourde : beaucoup de courtes, peu de très longues
        off: (r() - 0.5) * 2,                    // son écart à l'axe, en rayons de tête
        wob: 0.5 + r() * 1.6,                    // sa vitesse d'ondulation
        ph:  r() * 6.283,
        fat: 0.34 + r() * 0.46,                  // son épaisseur
      });
    return out;
  })();

  /* Un disque et un pavé accrochés à la grille de `q`. ⚠️ ON ARRONDIT LE CENTRE
     AVANT DE CONSTRUIRE, pas les pavés après : arrondi après coup, un disque qui
     avance d'un demi-pixel voit ses rangées s'accrocher les unes après les
     autres et la tête ONDULE en traversant l'écran. */
  function qDisc(g2, cx, cy, r, col, q) {
    const s = Math.max(1, Math.round(q || 1));
    const ri = Math.round(r / s);
    if (ri < 0) return;
    const ox = Math.round(cx / s), oy = Math.round(cy / s);
    g2.fillStyle = col;
    for (let dy = -ri; dy <= ri; dy++) {
      const w = Math.round(Math.sqrt(Math.max(0, ri * ri - dy * dy)));
      g2.fillRect((ox - w) * s, (oy + dy) * s, (w * 2 + 1) * s, s);
    }
  }
  function qDot(g2, cx, cy, n, col, q) {
    const s = Math.max(1, Math.round(q || 1));
    g2.fillStyle = col;
    g2.fillRect(Math.round(cx / s) * s, Math.round(cy / s) * s, n * s, n * s);
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

  /* ── LA QUEUE. Elle est peinte de l'ARRIÈRE vers l'avant, en deux matières qui
     se recouvrent : la fumée d'abord (elle est derrière et au-dessus), le feu
     par-dessus (il est plus proche de la tête et plus lumineux).
     ⚠️ ELLE S'INCURVE. Une queue rectiligne se lit comme un TRAIT tracé à la
     règle — c'est très exactement ce que faisait le `createLinearGradient` du
     445. Ce qui traîne est en retard : l'écart à l'axe croît comme le CARRÉ de
     la distance, ce qui donne la courbe molle qu'on voit sur le modèle. */
  function cometTail(g2, cx, cy, ang, R, L, t, q, fade) {
    const ux = Math.cos(ang), uy = Math.sin(ang);          // le sens de la course
    const nx = -uy, ny = ux;                               // la normale
    const CURL = 1.15;
    /* ⚠️ LA POSITION D'UN POINT DE MÈCHE EST ÉCRITE UNE FOIS, et les deux passes
       l'appellent. Deux écritures auraient laissé le feu et la fumée diverger
       d'un demi-pixel — invisible en relecture, et à l'écran la queue se dédouble.
       ⚠️ `-u` : LA QUEUE EST DERRIÈRE. Écrite `+u` au premier jet, elle partait
       DEVANT la tête ; le banc l'a chiffré avant que l'œil ne s'en aperçoive
       (9,2 rayons devant contre 3,5 derrière), et l'œil aurait lu une comète qui
       recule. C'est exactement pour ça que ce banc existe.
       ⚠️ ELLE S'OUVRE EN S'ÉLOIGNANT, elle n'est pas un ruban parallèle : l'écart
       à l'axe est multiplié par `s`, donc les mèches se touchent à la tête et se
       séparent au loin. C'est ce qui fait les VIDES, et les vides sont ce qui
       distingue une queue d'un tampon d'ouate. */
    const at = (st, s) => {
      const d = s * st.len * L;
      /* L'ondulation voyage vers l'arrière, elle ne clignote pas sur place : une
         phase qui ne dépendrait pas de `s` ferait battre la queue entière comme
         un drapeau d'un seul tenant. */
      const w = Math.sin(t / 190 * st.wob + st.ph - s * 3.4) * s;
      const off = R * (st.off * (0.10 + 1.55 * s) + w * 0.60 * s);
      const cur = R * CURL * s * s;                        // ce qui traîne est en retard
      return { x: cx - ux * d + nx * (off + cur), y: cy - uy * d + ny * (off + cur) };
    };
    /* ⚠️⚠️ DEUX PASSES, ET L'ORDRE EST LE POINT : TOUTE la fumée, PUIS tout le
       feu. Écrites mèche par mèche, la fumée de la mèche 12 recouvrait le feu de
       la mèche 3 — le feu vit près de la TÊTE, il doit passer devant la fumée de
       n'importe quelle mèche. Même famille que « ce qui est composé se pose avant
       ce qui est semé » (440), à l'échelle d'un dessin. */
    for (let k = 0; k < COMET_TAIL_N; k++) {
      const st = COMET_TAIL[k];
      const steps = Math.max(4, Math.round(st.len * 26));
      for (let i = steps; i >= 1; i--) {
        const s = i / steps;
        if (s < 0.34) continue;
        const q2 = Math.min(1, (s - 0.34) / 0.66);
        const p = at(st, s);
        const col = COMET_PAL.smoke[Math.min(2, (q2 * 2.6) | 0)];
        const rad = R * st.fat * (0.26 + 0.62 * s);
        const al = fade * 0.40 * Math.sin(Math.pow(1 - q2, 0.60) * Math.PI * 0.92) * (0.50 + 0.50 * (1 - q2));
        if (al > 0.02) qDisc(g2, p.x, p.y, rad, rgba(col, al), q);
        /* ⚠️ LE BOUT SE DÉTACHE EN GRAINS, IL NE S'ÉTEINT PAS EN ALPHA. Une fumée
           qui s'efface uniformément fait un fondu de télévision ; le modèle montre
           des paquets qui se séparent et partent seuls. Même raison que la trame
           de Bayer sur la pointe des fibres du cratère (446) : on garde de la
           matière, on la RARÉFIE. */
        if (q2 > 0.55 && ((k + i) & 1) === 0) {
          const sgn = (i & 2) ? 1 : -1;
          qDot(g2, p.x + nx * rad * 1.9 * sgn, p.y + ny * rad * 1.9 * sgn,
               1, rgba(col, fade * 0.34 * (1 - q2)), q);
        }
      }
    }
    for (let k = 0; k < COMET_TAIL_N; k++) {
      const st = COMET_TAIL[k];
      const steps = Math.max(4, Math.round(st.len * 26));
      for (let i = steps; i >= 1; i--) {
        const s = i / steps;
        if (s > 0.52) continue;
        const q2 = s / 0.52;
        const p = at(st, s);
        // Les LANGUES : plus claires au ras de la tête, orange en s'éteignant.
        const ci = Math.max(0, Math.min(3, 3 - ((q2 * 3.6) | 0)));
        const rad = R * st.fat * (0.34 + 0.46 * s);
        const al = fade * (0.80 - 0.62 * q2) * (0.78 + 0.22 * Math.sin(t / 120 + st.ph));
        if (al > 0.02) qDisc(g2, p.x, p.y, rad, rgba(COMET_PAL.gold[ci], Math.min(1, al)), q);
      }
    }
  }

  /* ── LA TÊTE. `ang` est le sens de la COURSE ; l'avant est donc `+u`. */
  function drawStarComet(g2, cx, cy, ang, R, tMs, opt) {
    const o = opt || {};
    const q = Math.max(1, Math.round(o.q || 3));
    const t = tMs || 0;
    const fade = o.fade === undefined ? 1 : Math.max(0, Math.min(1, o.fade));
    const L = o.tail === undefined ? R * 8.5 : o.tail;
    if (R < 0.6 || fade <= 0.01) return;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const nx = -uy, ny = ux;
    cometTail(g2, cx, cy, ang, R, L, t, q, fade);
    /* LE HALO, EN PALIERS. ⚠️ IL EST LARGE ET FAIBLE, JAMAIS PETIT ET VIF —
       c'est la règle déjà écrite pour la chaleur du cratère : une lueur qui monte
       en valeur sans s'élargir se lit comme une lampe, pas comme un rayonnement.
       Le modèle lui donne trois bons rayons de tête. */
    /* ⚠️ CINQ PALIERS ET NON TROIS, ET C'EST UN DÉFAUT VU SUR LA PLANCHE : à
       trois, le palier extérieur formait un DISQUE FRANC sur le ciel noir — une
       assiette bleue posée derrière la comète. Le modèle montre un halo qui
       s'éteint ; il faut donc assez de marches pour que l'œil lise une pente, et
       la dernière doit être presque rien. La règle est celle du cratère
       (quantifier la valeur), avec la réserve inverse : trop peu de paliers ne
       simplifie pas, ça dessine un bord. */
    const puls = 0.5 + 0.5 * Math.sin(t / 210);
    for (const [mul, al] of [[4.3, 0.035], [3.5, 0.055], [2.8, 0.085], [2.2, 0.12], [1.7, 0.17]])
      qDisc(g2, cx, cy, R * mul * (1 + 0.04 * puls), `rgba(150,226,255,${(al * fade).toFixed(3)})`, q);
    /* ╔════════════════════════════════════════════════════════════════════════
       ║ LA TÊTE EST UN CHAMP, PAS UNE PILE DE DISQUES.
       ╚════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ PREMIÈRE ÉCRITURE, JETÉE : six `arc()` empilés plus deux `clip()` pour
       tailler le croissant. Deux défauts, et le second est le vrai. (1) `clip`
       N'EXISTE PAS dans le faux canevas des bancs, et `restore()` n'y rend que la
       transformation : le dessin aurait été juste en jeu et faux au banc — le
       stub menteur du §10, dans l'outil censé nous en protéger. (2) Empilés, les
       disques se répondent par leur ORDRE : « quel anneau passe par-dessus quel
       anneau » devient la question, alors que ce qu'on décrit est une couleur par
       (rayon, angle). C'est mot pour mot ce que le 446 a compris sur le cratère,
       et c'est la deuxième fois que la même forme paie.
       ⚠️ `c` EST LE COSINUS AVEC L'AVANT, et c'est lui qui porte tout : le
       croissant s'épaissit quand `c` descend vers −1, le liseré n'existe que
       lorsque `c` est franchement positif. Aucune des deux formes n'est peinte à
       la main, et aucune ne peut se décoller de l'autre. */
    const s = Math.max(1, Math.round(q));
    const RH = R * 1.30;
    const i0 = Math.round((cx - RH) / s), i1 = Math.round((cx + RH) / s);
    const j0 = Math.round((cy - RH) / s), j1 = Math.round((cy + RH) / s);
    const COL = {
      rim: rgba(COMET_PAL.rim, fade),
      white: rgba(COMET_PAL.white, fade),
      core: COMET_PAL.core.map(c2 => rgba(c2, fade)),
      gold: COMET_PAL.gold.map(c2 => rgba(c2, fade)),
    };
    const hx = cx + ux * R * 0.18, hy = cy + uy * R * 0.18;
    const wCore = R * (0.30 + 0.04 * puls);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = i * s + s * 0.5, y = j * s + s * 0.5;
        const dx = x - cx, dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > RH) continue;
        const c = r > 0.001 ? (dx * ux + dy * uy) / r : 1;
        let col = null;
        /* ⚠️⚠️ LES TROIS COUCHES SONT DES ANNEAUX QUI NE SE CHEVAUCHENT PAS, ET
           C'EST LA SECONDE ÉCRITURE. La première laissait le croissant d'or
           MORDRE dans le cerne : regardé sur la planche, le liseré sombre ne
           subsistait qu'en bas à gauche, et la tête avait l'air ébréchée. Le
           modèle de Guillaume montre un cerne qui fait le tour COMPLET, et l'or
           par-dessus, à l'extérieur. Une frontière franche (`RIM_OUT`) vaut mieux
           qu'un arbitrage entre deux formes qui se disputent les mêmes pixels. */
        const RIM_IN = R * 0.99, RIM_OUT = R * 1.10;
        if (r < RIM_IN) {
          // LE NOYAU, en bandes, autour d'un centre DÉCALÉ VERS L'AVANT : la face
          // qui frappe est la plus chaude, donc la plus claire.
          const rc = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
          col = rc < wCore ? COL.white
              : rc < R * 0.52 ? COL.core[3]
              : rc < R * 0.72 ? COL.core[2]
              : rc < R * 0.90 ? COL.core[1] : COL.core[0];
        } else if (r <= RIM_OUT) {
          /* LE CERNE. ⚠️ IL FAIT LE TOUR, MÊME DU CÔTÉ CLAIR — un cœur blanc sur
             un ciel voilé de gris disparaît comme un cierge sur du marbre (441),
             et cette famille ÉMET de la lumière : c'est ici que le contrôle n°4
             de `render-etoile` compte le plus. */
          col = COL.rim;
        } else {
          // LE CROISSANT D'OR, À L'ARRIÈRE — il s'épaissit vers `c = -1`…
          const wc = Math.max(0, Math.min(1, (0.34 - c) / 1.10));
          if (wc > 0 && r <= RIM_OUT + R * 0.30 * wc) {
            const u2 = (r - RIM_OUT) / Math.max(0.001, R * 0.30 * wc);
            col = COL.gold[Math.max(0, Math.min(3, Math.round(0.5 + u2 * 2.4)))];
          }
          // …et un FIN liseré sur la face avant : elle chauffe, elle ne fume pas.
          if (!col && c > 0.10) {
            const wf = Math.max(0, Math.min(1, (c - 0.10) / 0.70));
            if (r <= RIM_OUT + R * 0.07 * wf) col = COL.gold[3];
          }
        }
        if (!col) continue;
        g2.fillStyle = col;
        g2.fillRect(i * s, j * s, s, s);
      }
    }
    /* LES ÉTINCELLES ARRACHÉES. ⚠️ Elles partent VERS L'ARRIÈRE et de côté, et
       elles sont peu nombreuses : cinq points bien placés disent « ça se
       désagrège », vingt disent « il neige » (le poivre du 438). */
    const rnd = makeRnd(4493);
    for (let k = 0; k < 6; k++) {
      const ph = (t / (620 + k * 130) + rnd()) % 1;
      const side = rnd() < 0.5 ? -1 : 1;
      const d = R * (1.2 + ph * 5.2), lat = side * R * (0.35 + ph * 1.9) * (0.4 + rnd() * 0.9);
      const al = fade * 0.85 * (1 - ph);
      if (al < 0.05) continue;
      qDot(g2, cx - ux * d + nx * lat, cy - uy * d + ny * lat, 1,
           `rgba(255,${(215 - 60 * ph) | 0},${(140 - 90 * ph) | 0},${al.toFixed(2)})`, q);
    }
  }

  /* 462 — LE PETIT FRAGMENT DE FERME. Ce n'est pas la tête blanche et bleue du
     gros météore : un caillou sombre, irrégulier, incandescent dans ses fissures,
     qui tourne si vite que sa silhouette change à chaque image. La rotation est
     calculée dans les sommets (aucun `rotate`) afin que le banc et le navigateur
     regardent exactement le même dessin. */
  function drawStarFragmentMeteor(g2, cx, cy, ang, R, tMs, opt) {
    const o = opt || {}, q = Math.max(1, Math.round(o.q || 1));
    if (R < 1) return;
    const t = +tMs || 0, spin = t / 72 + Math.sin(t / 39) * 0.22;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    /* Traîne courte et orangée : une pierre brûlante, pas une boule de feu.
       464 — ses petits écarts sont stables le long de la pierre. L'ancien
       `sin(t / 47)` faisait onduler la traîne en plus du centre et brouillait la
       trajectoire ; la silhouette, la fissure et le point chaud continuent de
       tourner avec `spin`, donc le caillou tourne bien sur lui-même. */
    for (let i = 7; i >= 1; i--) {
      const k = i / 7, wob = Math.sin(i * 2.3) * R * 0.10 * k;
      qDisc(g2, cx - ux * R * (1.1 + i * 0.8) + nx * wob,
            cy - uy * R * (1.1 + i * 0.8) + ny * wob,
            Math.max(1, R * (0.44 - k * 0.28)), `rgba(255,${(150 + 55 * (1 - k)) | 0},58,${(0.58 * (1 - k)).toFixed(3)})`, q);
    }
    for (const [mul, al] of [[2.15, 0.08], [1.62, 0.13], [1.28, 0.20]])
      qDisc(g2, cx, cy, R * mul, `rgba(255,112,48,${al})`, q);
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = spin + i * Math.PI * 2 / 9;
      const rr = R * (0.78 + 0.22 * Math.sin(i * 4.7 + t / 113));
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    g2.fillStyle = "#3b2928"; g2.beginPath();
    pts.forEach((p, i) => i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1]));
    g2.closePath(); g2.fill();
    g2.strokeStyle = "#e85b2a"; g2.lineWidth = Math.max(1, R * 0.16);
    g2.beginPath(); g2.moveTo(cx - Math.cos(spin) * R * 0.65, cy - Math.sin(spin) * R * 0.65);
    g2.lineTo(cx + Math.cos(spin + 0.55) * R * 0.18, cy + Math.sin(spin + 0.55) * R * 0.18);
    g2.lineTo(cx + Math.cos(spin + 0.08) * R * 0.64, cy + Math.sin(spin + 0.08) * R * 0.64); g2.stroke();
    qDisc(g2, cx + Math.cos(spin + 2.2) * R * 0.34, cy + Math.sin(spin + 2.2) * R * 0.34,
          R * 0.18, "rgba(255,205,96,0.9)", q);
  }

  /* ── LA TRAÎNÉE QUI RESTE DANS LE CIEL. Une bouffée, à un âge donné (0 fraîche,
     1 dissipée). ⚠️ ELLE EST UNE FONCTION DE L'ÂGE ET DE RIEN D'AUTRE : la
     cinématique la rappelle le long des positions que la comète a occupées, donc
     la TRAJECTOIRE reste chez l'appelant et le DESSIN reste ici. Une closure qui
     aurait gardé l'historique des positions aurait ramené le dessin dans la
     boucle de rendu, c'est-à-dire hors de portée du banc — le défaut même qu'on
     est en train de réparer. */
  function drawStarCometTrail(g2, x, y, ang, R, age, tMs, opt) {
    const o = opt || {};
    const q = Math.max(1, Math.round(o.q || 3));
    const k = Math.max(0, Math.min(1, age));
    if (k >= 1 || R < 0.5) return;
    const t = tMs || 0;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    // Elle GONFLE en vieillissant et elle DÉRIVE : une bouffée qui reste de la
    // même taille au même endroit est une tache, pas de la fumée.
    /* ⚠️ ELLE PÂLIT EN GONFLANT, elle ne se contente pas de baisser l'alpha. Une
       bouffée qui garde son ton en devenant transparente fait un TROU dans un
       ciel sombre — vu sur la planche, la traînée était une file de disques gris
       foncé posés sur la nuit. La fumée qui se dilue va vers le clair : c'est ce
       qui la fait disparaître au lieu de se creuser. */
    const grow = 1 + k * 2.6;
    const drift = k * R * 1.1;
    const base = COMET_PAL.smoke[0];
    const col = [base[0] + (215 - base[0]) * k, base[1] + (220 - base[1]) * k, base[2] + (228 - base[2]) * k];
    for (let j = 0; j < 3; j++) {
      const sp = (j - 1) * R * 0.55 * grow;
      const al = (1 - k) * (1 - k) * 0.22 * (j === 1 ? 1 : 0.66);
      if (al < 0.02) continue;
      qDisc(g2, x + nx * (sp + drift) + Math.sin(t / 900 + j + k * 4) * R * 0.35 * grow,
            y + ny * (sp + drift) - drift * 0.35,
            R * (0.42 + 0.42 * (j === 1 ? 1 : 0.6)) * grow, rgba(col, al), q);
    }
    // Une braise qui s'attarde dans la fumée fraîche : c'est ce qui distingue une
    // traînée de comète d'un nuage.
    if (k < 0.35) qDot(g2, x, y, 1, `rgba(255,190,110,${((0.35 - k) * 1.5).toFixed(2)})`, q);
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 455 — LA BULLE D'ÉMOTION. UN SIGNE, PAS UNE PHRASE.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ DEUX DEMANDES DE GUILLAUME LA PARTAGENT, ET C'EST POURQUOI ELLE EST UNE
     FONCTION ET PAS UN CAS PARTICULIER : le « ! » des PNJ nerveux pendant le
     tampon (« tourner une ou deux fois sur eux mêmes avec un "!" au dessus de leur
     tête ») et le « ! » de TOUTES les têtes à l'impact (« pendant 2 secondes à
     partir du moment de l'impact »). Écrite deux fois, elle aurait divergé au
     premier réglage et personne n'aurait pu comparer les deux — la troisième forme
     du piège n°1.
     ⚠️ ELLE EST ICI ET PAS DANS LA BOUCLE DE RENDU pour la raison du 454 : un
     dessin qu'aucun banc n'appelle reste au niveau du jour où il a été écrit. Le
     sillon en était la preuve vivante (plat pendant dix zips).
     ⚠️ ELLE NE PASSE PAS PAR `fillText` : le faux canevas des bancs ne le connaît
     pas (§4 de `CLAUDE.md`, payé au 427), donc un « ! » écrit en police aurait fait
     PLANTER `render-etoile`, c'est-à-dire qu'on aurait perdu le seul moyen de
     regarder ce dessin. Il est peint en barres — et il est du coup net à toutes
     les tailles, ce qu'une police de 6 px n'est jamais.
     ⚠️ `a` EST L'OPACITÉ *ET* LE RESSORT : la bulle apparaît en sursautant (elle
     dépasse sa taille puis retombe), parce qu'une bulle qui grandit régulièrement
     se lit comme une interface, et qu'un sursaut se lit comme une réaction. */
  function drawEmoteBubble(g2, cx, by, a, opt) {
    const o = opt || {};
    const al = Math.max(0, Math.min(1, a === undefined ? 1 : a));
    if (al <= 0.02) return;
    /* Le ressort : 1,25 au premier dixième, 1 ensuite. `a` descend de 1 à 0 chez
       l'appelant, donc « le début » est `a` proche de 1. */
    const pop = al > 0.86 ? 1 + (al - 0.86) * 1.8 : 1;
    /* ⚠️ ZIP 456 — 11×13 → 9×11, SUR RETOUR DE GUILLAUME (« le point
       d'exclamation est un peu gros »). Elle se pose au-dessus d'une tête de 16 px
       de large : à 11 px elle en couvrait les deux tiers, donc elle lisait comme
       une étiquette d'interface posée sur le PNJ plutôt que comme sa réaction. Le
       sursaut, lui, n'a pas bougé — c'est lui qui la fait remarquer, pas sa
       taille. ⚠️ `render-etoile` mesure la largeur du corps : son plancher est
       descendu de 8 à 6 px DANS LE MÊME ZIP, sans quoi le banc aurait refusé un
       dessin que personne n'a le droit de trouver trop petit à sa place. */
    const W = Math.round(9 * pop), H = Math.round(11 * pop);
    const bx = Math.round(cx - W / 2), byTop = Math.round(by - H);
    g2.save();
    g2.globalAlpha = Math.min(1, al * 1.6);       // elle reste franche puis tombe d'un coup
    /* ⚠️⚠️ NI `roundRect` NI `fillText` — ET C'EST LE BANC QUI L'A EXIGÉ, À SA
       PREMIÈRE EXÉCUTION. Le faux canevas de `tools/lib-canvas.mjs` LÈVE sur
       l'ACCÈS à une méthode qu'il n'implémente pas : `if (g2.roundRect)`, qui a
       l'air d'une garde, était donc déjà l'erreur. C'est le §4 de `CLAUDE.md` dans
       sa version la plus utile — un dessin qui dépend d'une méthode exotique n'est
       pas regardable, donc il vieillira.
       ⚠️ ET LE COIN COUPÉ AU PIXEL EST MEILLEUR QUE L'ARRONDI À CETTE TAILLE :
       à onze pixels de large, un rayon de 3 px anticrénelé fait une bouillie
       grise ; deux rectangles qui se croisent font un coin net, et le dessin reste
       du pixel art comme tout le reste du jeu. */
    const notch = (x, y, w, h, col) => {
      g2.fillStyle = col;
      g2.fillRect(x + 1, y, w - 2, h);
      g2.fillRect(x, y + 1, w, h - 2);
    };
    const ink = o.tone === "calm" ? "#26405e" : "#4a2f12";
    notch(bx, byTop, W, H, o.tone === "calm" ? "rgba(38,64,94,0.80)" : "rgba(58,44,26,0.80)");
    notch(bx + 1, byTop + 1, W - 2, H - 2, o.tone === "calm" ? "rgba(226,238,255,0.96)" : "rgba(255,247,222,0.97)");
    /* La queue, trois rangées qui rétrécissent : elle pointe la tête du PNJ. */
    g2.fillStyle = o.tone === "calm" ? "rgba(226,238,255,0.96)" : "rgba(255,247,222,0.97)";
    g2.fillRect(cx - 1, byTop + H, 3, 1);
    g2.fillRect(cx, byTop + H + 1, 1, 1);
    /* Le signe, en barres. ⚠️ Le point est SÉPARÉ du fût d'une rangée pleine :
       collés, à cette taille, les deux se fondent en un trait et le « ! » devient
       un « l ». C'est ce que `render-etoile` mesure, et c'est la seule chose de ce
       dessin qu'une capture d'écran de jeu ne montrerait jamais. */
    g2.fillStyle = ink;
    const w = Math.max(2, Math.round(2 * pop));
    const x0 = Math.round(cx - w / 2), y0 = byTop + Math.max(2, Math.round(2 * pop));
    const hh = Math.max(3, Math.round(4 * pop));
    /* ⚠️⚠️ IL N'Y A QU'UN SIGNE, ET C'EST DÉLIBÉRÉ. Le premier jet portait aussi
       un « ? », « parce que la famille en aura besoin » — personne ne l'appelait,
       donc seul le banc le regardait, donc il était faux (la planche l'a montré :
       une tache, pas un point d'interrogation). C'est mot pour mot la leçon du
       453 : *une constante que seul le banc lit est débranchée, elle a l'air juste
       et elle ne peut pas échouer.* Le jour où un « ? » servira, il se dessinera
       AVEC son appelant et il sera regardé le même jour. */
    g2.fillRect(x0, y0, w, hh);
    g2.fillRect(x0, y0 + hh + Math.max(1, Math.round(pop)), w, w);
    g2.restore();
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 456 — LA JAUGE DE LA POSTURE. LA SEULE RÉPONSE À « EST-CE QUE JE FAIS
     ║ BIEN ? » DANS TOUT LE CHANTIER.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ DEMANDE DE GUILLAUME : « ça dit stand still mais on ne comprend pas si
     on fait les choses bien ou ce qu'il faut faire de ce cratère. » Le geste du
     cratère est le seul geste CONTINU du jeu : neuf secondes de dos tourné, sans
     touche, sans animation, sans rien à l'écran. Une tenue qui ne rend rien ne se
     distingue pas d'un jeu bloqué — et c'est très exactement ce que Guillaume a
     vécu. Une barre qui monte répond aux deux moitiés de la phrase d'un coup :
     *je fais bien* (elle monte) et *voilà ce que ce trou attend* (elle se vide
     dès qu'on se retourne ou qu'on marche).
     ⚠️ ELLE VIT ICI ET PAS DANS LA BOUCLE DE RENDU, comme la bulle du 455 et pour
     la même raison (§2 du piège n°1) : un dessin qu'aucun banc n'appelle reste au
     niveau du jour où il a été écrit. Elle a ses contrôles dans `render-etoile`
     le jour de son écriture.
     ⚠️⚠️ ET ELLE EST EN `fillRect` PURS, comme la bulle : ni `roundRect` (le faux
     canevas LÈVE sur l'accès, 455) ni `fillText` (il ne le connaît pas, 427).
     C'est ce qui la rend regardable, donc ce qui l'empêchera de vieillir.
     ⚠️ `warn` N'EST PAS UNE COULEUR D'ERREUR : la posture n'est jamais « fausse »,
     elle est seulement « pas encore tenue ». Un rouge d'alerte ferait croire à
     une punition là où le jeu ATTEND (`resolveStarCalm` ne punit pas, il ne
     compte simplement pas). La jauge passe donc au gris-bleu de nuit et se vide —
     elle dit « ça ne compte pas », pas « tu as raté ». */
  function drawCalmMeter(g2, cx, by, k, opt) {
    const o = opt || {};
    const kk = Math.max(0, Math.min(1, +k || 0));
    const W = 24, H = 6;
    const bx = Math.round(cx - W / 2), byTop = Math.round(by - H);
    g2.save();
    if (o.alpha !== undefined) g2.globalAlpha = Math.max(0, Math.min(1, o.alpha));
    /* Le cadre, coins coupés au pixel (même geste que la bulle) : à 24×6 un
       arrondi anticrénelé ferait une bouillie grise. */
    const notch = (x, y, w, h, col) => {
      g2.fillStyle = col;
      g2.fillRect(x + 1, y, w - 2, h);
      g2.fillRect(x, y + 1, w, h - 2);
    };
    /* ⚠️⚠️ LE CERNE EST CLAIR ET LE CREUX EST SOMBRE, PAS L'INVERSE — LA PLANCHE
       DU BANC L'A MONTRÉ DU PREMIER COUP. Premier jet : cadre brun sombre sur la
       terre du cratère, c'est-à-dire un brun sur un brun. Tous les contrôles
       étaient verts (elle monte, elle est vide à zéro…) et sur la planche la
       jauge VIDE avait littéralement disparu dans le sol — or c'est l'état vide
       qui doit se voir le plus, puisque c'est celui où le joueur cherche quoi
       faire. C'est la règle du 441 (« un cerne sert aussi sur fond clair »)
       retournée : ici c'est le fond qui est sombre, donc le cerne est clair. */
    notch(bx, byTop, W, H, o.warn ? "rgba(198,214,238,0.88)" : "rgba(246,236,214,0.88)");
    notch(bx + 1, byTop + 1, W - 2, H - 2, o.warn ? "rgba(26,38,60,0.92)" : "rgba(30,22,10,0.92)");
    /* LE REMPLISSAGE. ⚠️ IL PART DE LA GAUCHE ET IL EST ENTIER EN PIXELS : une
       largeur fractionnaire anticrénelée donnerait un bord flou qui, à cette
       taille, se lit comme une barre qui tremble. */
    const iw = W - 4, fw = Math.round(iw * kk);
    if (fw > 0 && !o.warn) {
      g2.fillStyle = "#e8a83c";
      g2.fillRect(bx + 2, byTop + 2, fw, H - 4);
      // La rangée du haut plus claire : sans elle la barre est un aplat, et un
      // aplat de 2 px de haut se lit comme un trait (DESSIN.md, les masses).
      g2.fillStyle = "#ffe08a";
      g2.fillRect(bx + 2, byTop + 2, fw, 1);
    }
    /* LES DEUX REPÈRES. ⚠️ ILS NE SONT PAS DÉCORATIFS : sur 20 px utiles, une
       barre sans graduation ne dit pas si l'on est au tiers ou à la moitié, et
       c'est précisément la question que le joueur se pose pendant neuf secondes. */
    g2.fillStyle = o.warn ? "rgba(120,140,170,0.75)" : "rgba(120,96,58,0.75)";
    for (let i = 1; i <= 2; i++) g2.fillRect(bx + 2 + Math.round(iw * i / 3), byTop + 2, 1, H - 4);
    g2.restore();
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 459 — LA BULLE DE TRAVAIL DE TRISTAN. « on doit LE VOIR s'y mettre. »
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CE N'EST PAS UNE BULLE DE TEXTE, ET C'EST TOUT L'INTÉRÊT. Une phrase
     (« je m'y mets ») s'affiche trois secondes et disparaît ; la commande, elle,
     dure de trois à huit minutes. Ce qu'il faut montrer n'est pas l'INSTANT où il
     accepte, c'est l'ÉTAT « il est en train de la faire » — donc un dessin qui
     reste au-dessus de lui tant que le bois n'est pas prêt, et qui AVANCE.
     ⚠️ LA SCIE VA ET VIENT (le temps), LE TRAIT DE SCIE S'ENFONCE (l'avancement).
     Deux mouvements, deux sens : sans le premier, la bulle a l'air figée pendant
     huit minutes ; sans le second, elle ne dit pas qu'on approche. C'est la leçon
     du 456 (« un geste continu doit rendre ce qui manque ET ce qui avance »)
     appliquée à quelqu'un d'AUTRE que le joueur.
     ⚠️ AUCUN `roundRect`, AUCUN `fillText` : mêmes raisons qu'à la bulle du 455 —
     le faux canevas LÈVE sur l'accès, donc un dessin qui en dépend n'est pas
     regardable, donc il vieillit. Coins coupés au pixel, comme partout ici. */
  function drawWorkBubble(g2, cx, by, k, tMs) {
    const kk = Math.max(0, Math.min(1, +k || 0)), t = +tMs || 0;
    const W = 26, H = 18;
    const bx = Math.round(cx - W / 2), byTop = Math.round(by - H);
    const notch = (x, y, w, h, col) => {
      g2.fillStyle = col;
      g2.fillRect(x + 1, y, w - 2, h);
      g2.fillRect(x, y + 1, w, h - 2);
    };
    notch(bx, byTop, W, H, "rgba(58,44,26,0.85)");
    notch(bx + 1, byTop + 1, W - 2, H - 2, "rgba(255,247,222,0.97)");
    // La queue : elle pointe la tête du bûcheron.
    g2.fillStyle = "rgba(255,247,222,0.97)";
    g2.fillRect(cx - 1, byTop + H, 3, 1);
    g2.fillRect(cx, byTop + H + 1, 1, 1);
    /* ╔════════════════════════════════════════════════════════════════════════
       ║ LA BILLE DE BOIS. ⚠️ LE PREMIER JET ÉTAIT UNE CAISSE, ET LA PLANCHE L'A DIT.
       ╚════════════════════════════════════════════════════════════════════════
       Un rectangle brun de vingt pixels sur six, avec une barre grise posée
       dessus, ne se lit pas comme « une scie sur un rondin » — ça se lit comme un
       coffre avec une règle dessus. Trois choses le corrigent, et aucune n'est un
       détail : le BOUT DE FIL (l'ellipse claire du côté gauche, la seule chose qui
       dise « c'est cylindrique »), les COINS RETIRÉS (un rondin n'a pas d'angle
       droit), et l'ÉCART entre la lame et le bois (posée dessus, la lame CACHE ce
       qu'elle est censée couper). C'est la règle du DESSIN.md — on assemble des
       masses, et une masse qu'on ne voit pas ne compte pas. */
    const lx = bx + 4, ly = byTop + 9, lw = W - 8, lh = 6;
    g2.fillStyle = "#6a4a28"; g2.fillRect(lx, ly + 1, lw, lh - 2);
    g2.fillRect(lx + 1, ly, lw - 2, lh);                       // coins retirés
    g2.fillStyle = "#8a6538"; g2.fillRect(lx + 1, ly + 1, lw - 2, 2);
    g2.fillStyle = "#a8834c"; g2.fillRect(lx + 2, ly + 1, lw - 4, 1);   // la rangée qui prend la lumière
    /* Le bout de fil, à gauche : deux tons concentriques. C'est LUI qui fait le
       rondin — sans lui, aucune quantité d'ombre ne sauve le rectangle. */
    g2.fillStyle = "#4a3018"; g2.fillRect(lx, ly + 1, 2, lh - 2); g2.fillRect(lx + 1, ly, 1, lh);
    g2.fillStyle = "#7d5c34"; g2.fillRect(lx + 1, ly + 2, 1, 2);
    /* ── LE TRAIT DE SCIE, EN COIN : trois pixels de large en haut, un au fond.
       Il s'enfonce avec l'avancement — à `k` = 1 la bille est traversée. */
    const cxk = lx + Math.round(lw * 0.58);
    const cut = Math.max(1, Math.round((lh + 1) * kk));
    g2.fillStyle = "#2e1c0c";
    for (let i = 0; i < cut; i++) g2.fillRect(cxk - (i < cut - 1 ? 1 : 0), ly + i, i < cut - 1 ? 3 : 1, 1);
    /* ── LA SCIE, AU-DESSUS ET PAS DESSUS. Un va-et-vient sinusoïdal (amorti aux
       extrémités : un aller-retour linéaire se lit comme un ascenseur), les dents
       tournées vers le bois, et la poignée du côté d'où elle revient. */
    const sw = 13, sway = Math.sin(t / 240) * 4;
    const sx = Math.round(cxk - sw / 2 + sway), sy = ly - 4;
    g2.fillStyle = "#8f96a0"; g2.fillRect(sx, sy, sw, 1);
    g2.fillStyle = "#c8ced6"; g2.fillRect(sx, sy - 1, sw, 1);
    g2.fillStyle = "#6f767f";
    for (let i = 1; i < sw; i += 2) g2.fillRect(sx + i, sy + 1, 1, 1);   // les dents, une sur deux
    g2.fillStyle = "#7a4a22";
    g2.fillRect(sway < 0 ? sx - 2 : sx + sw, sy - 2, 2, 4);
    /* ── LA SCIURE. Deux grains qui tombent du trait, décalés dans le temps : sans
       eux, on voit une scie POSÉE sur un rondin, pas une scie qui COUPE. */
    g2.fillStyle = "rgba(214,178,120,0.9)";
    for (let i = 0; i < 2; i++) {
      const ph = ((t / 520) + i * 0.5) % 1;
      g2.fillRect(cxk - 1 + i * 2, ly + lh + Math.round(ph * 2), 1, 1);
    }
  }

  /* ── L'IMPACT. `k` va de 0 à 1 sur la demi-seconde qui suit le contact.
     ⚠️⚠️ CE N'EST PAS UN `fillRect` BLANC. Le 445 peignait l'écran entier en
     blanc pendant 160 ms : ça marche comme COUPURE, ça ne montre rien. Le modèle
     de Guillaume (`…hayq7g….jpg`) montre ce qu'il faut voir — un cœur blanc, une
     éclaboussure CYAN qui gicle en rayons, un anneau d'or qui s'ouvre, et des
     éjectas sombres. Le blanc plein écran reste, mais deux images seulement, au
     sommet : il sert de coupure, pas de spectacle.
     ⚠️ LES RAYONS SONT INÉGAUX ET TIRÉS UNE FOIS. Douze rayons réguliers font une
     étoile de dessin animé ; c'est la même faute que la collerette de tournesol
     du premier cratère (446), et elle se corrige de la même façon. */
  function drawStarImpactFlash(g2, cx, cy, k, R, opt) {
    const o = opt || {};
    const q = Math.max(1, Math.round(o.q || 3));
    const kk = Math.max(0, Math.min(1, k));
    const sq = o.squash === undefined ? 0.55 : o.squash;   // la vue est en trois quarts
    const rnd = makeRnd(4499);
    const out = 1 - Math.pow(1 - kk, 2.2);                 // ça part vite et ça s'étale
    // L'ÉCLABOUSSURE, aplatie : elle court AU SOL.
    /* ⚠️⚠️ ON BALAYE LES RANGÉES D'ARRIVÉE, PAS CELLES DU CERCLE. Premier jet :
       un disque construit en `dy` puis posé à `Math.round(dy · sq)` — deux
       rangées voisines tombent alors sur la même ligne et une rangée sur deux
       reste vide. Sur la planche, la gerbe sortait EN STRIES HORIZONTALES,
       exactement comme un écran qui saute. L'ellipse doit être décrite dans
       l'espace où on la peint. */
    for (const [mul, col, a0] of [[5.6, "150,226,255", 0.34], [3.4, "198,244,255", 0.42], [1.9, "255,255,255", 0.62]]) {
      const al = a0 * (1 - kk) * (1 - kk);
      if (al < 0.02) continue;
      const r = R * mul * (0.25 + out * 1.35);
      const s = Math.max(1, Math.round(q));
      const rx = Math.round(r / s), ry = Math.max(1, Math.round(r * sq / s));
      g2.fillStyle = `rgba(${col},${al.toFixed(3)})`;
      for (let dy = -ry; dy <= ry; dy++) {
        const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
        g2.fillRect((Math.round(cx / s) - w) * s, (Math.round(cy / s) + dy) * s, (w * 2 + 1) * s, s);
      }
    }
    /* L'ANNEAU D'OR : la matière chaude, projetée, qui retombe. ⚠️ IL EST PEINT
       PAR BALAYAGE, jamais par deux ellipses et un `clip` — voir la note de
       `drawStarComet` : `clip` n'existe pas dans le faux canevas des bancs, donc
       un anneau taillé comme ça serait un anneau qu'aucun banc ne voit. Le test
       est la métrique de l'ellipse elle-même, ce qui garde l'épaisseur constante
       tout autour au lieu de la voir s'écraser avec le trois-quarts. */
    {
      const r = R * (1.4 + out * 6.4), al = 0.55 * (1 - kk);
      const thick = Math.max(q, R * 0.55);
      if (al > 0.02 && r > thick) {
        const s = Math.max(1, Math.round(q));
        const i0 = Math.round((cx - r) / s), i1 = Math.round((cx + r) / s);
        const j0 = Math.round((cy - r * sq) / s), j1 = Math.round((cy + r * sq) / s);
        g2.fillStyle = rgba(COMET_PAL.gold[2], al);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const dx = (i * s + s * 0.5 - cx) / r, dy = (j * s + s * 0.5 - cy) / (r * sq);
          const e = Math.sqrt(dx * dx + dy * dy);
          if (e <= 1 && e >= 1 - thick / r) g2.fillRect(i * s, j * s, s, s);
        }
      }
    }
    // LES RAYONS, inégaux — et ils sont BLEUS : c'est l'étoile qu'on voit sortir
    // une demi-seconde avant de disparaître au fond du trou.
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, len = R * (2.2 + Math.pow(rnd(), 1.6) * 9.5);
      const al = 0.75 * (1 - kk) * (1 - kk);
      if (al < 0.03) continue;
      const n = 5 + ((len / (q * 3)) | 0);
      for (let j = 1; j <= n; j++) {
        const s2 = j / n, d = len * (0.18 + out * 0.95) * s2;
        qDot(g2, cx + Math.cos(a) * d, cy + Math.sin(a) * d * sq, s2 > 0.7 ? 1 : 2,
             `rgba(${(198 + 57 * (1 - s2)) | 0},244,255,${(al * (1 - s2 * 0.8)).toFixed(2)})`, q);
      }
    }
    // LES ÉJECTAS : de la TERRE, sombre, qui monte et retombe. Sans eux, la
    // gerbe est de la lumière pure et l'impact n'a rien creusé.
    for (let i = 0; i < 22; i++) {
      const a = rnd() * Math.PI * 2, sp = R * (1.6 + rnd() * 5.0);
      const up = R * (1.4 + rnd() * 3.2);
      const d = sp * out, h = up * Math.sin(Math.min(1, out * 1.15) * Math.PI);
      const al = 0.85 * (1 - kk * kk);
      if (al < 0.05) continue;
      qDot(g2, cx + Math.cos(a) * d, cy + Math.sin(a) * d * sq - h, rnd() < 0.4 ? 2 : 1,
           `rgba(${(58 + rnd() * 40) | 0},${(39 + rnd() * 26) | 0},25,${al.toFixed(2)})`, q);
    }
  }

  /* 463 — L'IMPACT DES PETITS FRAGMENTS DE FERME. Le grand météore produit une
     lumière surnaturelle ; ces pierres, elles, doivent CREUSER les cratères que
     le joueur fouille juste après. On dessine donc quatre matières séparées :
     compression blanche au contact, couronne de terre rompue, éjectas en arcs
     puis colonne de poussière et de braises. Une grande ellipse cyan disait
     « sort magique » ; ces masses disent « poids, sol, retombée ».
     `ageMs` garde les phases exprimées en temps réel afin que le navigateur et
     le banc puissent échantillonner exactement les mêmes images. */
  function drawStarFragmentImpact(g2, cx, cy, ageMs, R, opt) {
    const o = opt || {}, q = Math.max(1, Math.round(o.q || 3));
    const age = Math.max(0, +ageMs || 0), life = Math.min(1, age / 1180);
    const out = 1 - Math.pow(1 - life, 2.7), sq = 0.48;
    const rnd = makeRnd(46319);

    // 1. Le point de compression : violent, local et très bref.
    const crush = Math.max(0, 1 - age / 150);
    if (crush > 0) {
      qDisc(g2, cx, cy - R * 0.08, R * (0.34 + crush * 0.72),
            `rgba(255,249,224,${(0.92 * crush).toFixed(3)})`, q);
      qDisc(g2, cx, cy, R * (0.72 + (1 - crush) * 0.55),
            `rgba(255,154,66,${(0.58 * crush).toFixed(3)})`, q);
    }

    // 2. L'onde dans la TERRE : un anneau cassé, jamais un disque translucide.
    const ringR = R * (0.72 + out * 3.7);
    const ringA = Math.max(0, 1 - life) * 0.82;
    /* 30 paquets, pas 58 points équidistants : à l'échelle réelle du jeu,
       58 gros pixels se touchaient et reformaient exactement le cerceau doré
       que ce dessin devait supprimer. Les ruptures sont suffisamment larges
       pour rester des ruptures après zoom nearest-neighbour. */
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI * 2 / 30;
      const broken = Math.sin(i * 2.17 + 0.8) + Math.sin(i * 0.71) * 0.55;
      if (broken < -0.36 || ringA < 0.025) continue;
      const rr = ringR * (0.91 + 0.12 * Math.sin(i * 1.91));
      const warm = i % 7 === 0 && age < 420;
      const col = warm ? `rgba(224,104,42,${(ringA * 0.72).toFixed(3)})`
                       : `rgba(${76 + (i % 3) * 16},${51 + (i % 4) * 8},31,${ringA.toFixed(3)})`;
      qDot(g2, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq,
           broken > 0.82 ? 2 : 1, col, q);
      /* Un second éclat seulement sur les gros paquets : il épaissit une motte,
         pas toute la circonférence. */
      if (broken > 0.82) qDot(g2, cx + Math.cos(a + 0.045) * rr * 0.91,
                              cy + Math.sin(a + 0.045) * rr * 0.91 * sq,
                              1, `rgba(57,38,25,${(ringA * 0.78).toFixed(3)})`, q);
    }

    // 3. Les mottes suivent des trajectoires paraboliques : elles montent puis
    // retombent devant et derrière le cratère, au lieu de s'éloigner à plat.
    for (let i = 0; i < 34; i++) {
      const a = rnd() * Math.PI * 2, speed = R * (1.35 + rnd() * 3.8);
      const ph = Math.min(1, life * (0.86 + rnd() * 0.34));
      const d = speed * ph, h = R * (0.8 + rnd() * 3.1) * Math.sin(ph * Math.PI);
      const al = Math.max(0, 1 - Math.max(0, ph - 0.68) / 0.32) * 0.9;
      if (al < 0.04) continue;
      const n = rnd() > 0.73 ? 2 : 1;
      /* Les douze plus grosses mottes conservent deux positions passées : le
         regard lit alors une trajectoire, pas des confettis apparus au hasard. */
      if (i < 12 && ph > 0.12) for (let j = 1; j <= 2; j++) {
        const p0 = Math.max(0, ph - j * 0.075);
        const d0 = speed * p0, h0 = R * (0.8 + (i % 5) * 0.43) * Math.sin(p0 * Math.PI);
        qDot(g2, cx + Math.cos(a) * d0, cy + Math.sin(a) * d0 * sq - h0,
             1, `rgba(62,42,27,${(al * (0.48 - j * 0.13)).toFixed(3)})`, q);
      }
      qDot(g2, cx + Math.cos(a) * d, cy + Math.sin(a) * d * sq - h,
           n, `rgba(${54 + (i % 4) * 13},${37 + (i % 3) * 9},25,${al.toFixed(3)})`, q);
    }

    // 4. La colonne : feu au pied, poussière lourde au-dessus, trois lobes qui
    // se décalent plutôt qu'un nuage rond posé sur le cratère.
    const plume = Math.min(1, age / 360), fade = Math.max(0, 1 - Math.max(0, age - 430) / 750);
    if (fade > 0.02) {
      for (let i = 0; i < 5; i++) {
        const ph = Math.max(0, Math.min(1, plume * 1.25 - i * 0.09));
        if (ph <= 0) continue;
        const side = Math.sin(i * 2.4 + age / 170) * R * (0.10 + i * 0.07);
        const y = cy - R * (0.35 + ph * (0.75 + i * 0.42));
        const rr = R * (0.34 + ph * (0.18 + i * 0.08));
        const c = i < 2 ? `rgba(255,${142 + i * 34},62,${(fade * (0.62 - i * 0.10)).toFixed(3)})`
                        : `rgba(${74 + i * 10},${66 + i * 8},58,${(fade * (0.46 - i * 0.045)).toFixed(3)})`;
        qDisc(g2, cx + side, y, rr, c, q);
      }
      // Braises arrachées dans la colonne, peu nombreuses et lisibles.
      for (let i = 0; i < 9; i++) {
        const ph = (life * (1.25 + i * 0.025) + i * 0.093) % 1;
        const al = fade * (1 - ph);
        if (al < 0.08) continue;
        qDot(g2, cx + Math.sin(i * 2.7) * R * (0.25 + ph * 1.1),
             cy - R * (0.5 + ph * 3.8), 1,
             `rgba(255,${174 + (i % 3) * 22},82,${al.toFixed(3)})`, q);
      }
    }
  }

  // ----- 10 façades de maison basiques pour Valley Town (zip 235). Toutes
  // au même canevas 96x96 que la maison de ferme, ancrées par leur bord bas.
  function townHouseVariant(styleIdx) {
    // Zip 260 (demande Guillaume) : Valley Town passe au STYLE PIERRE, en
    // réutilisant les designs des maisons de ferme niv.2 (colombages + chaume
    // + soubassement pierre, houseLvl2) et niv.3 (moellons + tuiles,
    // houseLvl3). On ALTERNE les deux familles (pair -> niv.3, impair ->
    // niv.2) et on fait tourner les tons/toits pour garder 10 maisons
    // distinctes. Même canevas 96x96 et même ancrage bas que house().
    const [c, g] = cv(96, 96);
    const r = makeRnd(200 + styleIdx * 37);
    const stoneSets = [
      ["#b8b0a2", "#d0c8ba", "#a09888", "#b8b0a2"],
      ["#aeb0b8", "#c8cad2", "#989aa2", "#aeb0b8"],
      ["#c2b6a2", "#d8ccb6", "#a89c86", "#c2b6a2"],
      ["#b0b6ac", "#c8ccc2", "#98a094", "#b0b6ac"],
      ["#c0b2b0", "#d6c8c6", "#a89a98", "#c0b2b0"],
    ];
    const tileSets = [
      { m: "#c04a3c", d: "#7c2a22", h: "#d4635a", e: "#6a241e" }, // tuiles rouges
      { m: "#4a6a9a", d: "#2e4568", h: "#6a8ac0", e: "#243450" }, // ardoise bleue
      { m: "#4a8c5a", d: "#2e5a38", h: "#6aae7a", e: "#244a30" }, // vert-de-gris
      { m: "#a86a3a", d: "#6a3f20", h: "#c8905a", e: "#4a2e18" }, // terre cuite
      { m: "#8a6a9a", d: "#563f66", h: "#a88ac0", e: "#382a44" }, // prune
    ];
    const plasters = [
      { p: "#e6d9bc", l: "#efe4ca", tA: "#8f6c2c", tB: "#c89a48", tC: "#d8ac54", ridge: "#e0b862" },
      { p: "#c8c8bc", l: "#d8d8cc", tA: "#6a5a3a", tB: "#8a7a54", tC: "#9a8a64", ridge: "#8a7a54" },
      { p: "#e0ccb4", l: "#eedcc6", tA: "#7a5a2c", tB: "#b88a44", tC: "#c89a54", ridge: "#c89a54" },
      { p: "#d0d8c8", l: "#e0e6d8", tA: "#6a6a3a", tB: "#8a8a54", tC: "#9a9a64", ridge: "#8a8a54" },
      { p: "#e6d0c8", l: "#f0dcd4", tA: "#8a5a4a", tB: "#b07a64", tC: "#c08a74", ridge: "#b07a64" },
    ];
    if (styleIdx % 2 === 0) {
      // Famille niv.3 : murs en pierre appareillée + toit de tuiles + auvent bois.
      const stone = stoneSets[(styleIdx >> 1) % stoneSets.length];
      const tl = tileSets[(styleIdx >> 1) % tileSets.length];
      bStones(g, 8, 46, 80, 42, r, stone, 6);
      for (let i = 0; i < 40; i++) {
        const half = Math.floor(44 * i / 40), y0 = 8 + i;
        if (i % 4 === 0) P(g, 48 - half, y0, Math.max(1, half * 2), 1, tl.d);
        else { P(g, 48 - half, y0, Math.max(1, half * 2), 1, tl.m); if (i % 2 === 0) for (let xx = 48 - half; xx < 48 + half; xx += 5) { P(g, xx, y0, 1, 1, tl.d); P(g, xx + 1, y0, 1, 1, tl.h); } }
      }
      P(g, 0, 46, 96, 3, tl.e);
      bChimney(g);
      P(g, 38, 56, 22, 3, "#8a3028"); P(g, 39, 59, 2, 4, "#6a4a2c"); P(g, 56, 59, 2, 4, "#6a4a2c"); // auvent
      bDoor(g, 42, 62); bWindow(g, 16, 58); bWindow(g, 70, 58);
    } else {
      // Famille niv.2 : colombages + toit de chaume + soubassement pierre.
      const pl = plasters[(styleIdx >> 1) % plasters.length];
      bStones(g, 8, 78, 80, 10, r, ["#9a9aa4", "#b8b8c2", "#84848e", "#9a9aa4"], 5);
      P(g, 8, 46, 80, 32, pl.p);
      for (let i = 0; i < 90; i++) P(g, 8 + Math.floor(r() * 80), 46 + Math.floor(r() * 32), 1, 1, pl.l);
      P(g, 8, 46, 80, 2, "#5a4028"); P(g, 8, 76, 80, 2, "#5a4028");
      P(g, 8, 46, 2, 32, "#5a4028"); P(g, 86, 46, 2, 32, "#5a4028");
      P(g, 34, 46, 2, 32, "#5a4028"); P(g, 60, 46, 2, 32, "#5a4028");
      for (let i = 0; i < 28; i++) { P(g, 10 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); P(g, 62 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); }
      for (let i = 0; i < 38; i++) { const half = Math.floor(44 * i / 38); const col = i % 3 === 0 ? pl.tA : (i % 2 ? pl.tB : pl.tC); P(g, 48 - half, 8 + i, Math.max(1, half * 2), 1, col); }
      for (let i = 0; i < 30; i++) P(g, 6 + Math.floor(r() * 84), 45 + Math.floor(r() * 2), 1, 1, pl.tA);
      P(g, 44, 5, 8, 4, pl.ridge);
      bChimney(g); bDoor(g, 42, 62); bWindow(g, 16, 58); bWindow(g, 70, 58);
    }
    return c;
  }
  function autumnTree(baseImg) {
    const [c, g] = cv(baseImg.width, baseImg.height);
    g.drawImage(baseImg, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(220, 130, 40, 0.55)";
    // Ne teinte QUE la partie haute (feuillage).
    g.fillRect(0, 0, baseImg.width, Math.floor(baseImg.height * 0.65));
    g.globalCompositeOperation = "source-over";
    return c;
  }

  // Chêne en fleurs (printemps) : léger voile rose sur le feuillage.
  function springTree(baseImg) {
    const [c, g] = cv(baseImg.width, baseImg.height);
    g.drawImage(baseImg, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255, 180, 220, 0.35)";
    g.fillRect(0, 0, baseImg.width, Math.floor(baseImg.height * 0.65));
    g.globalCompositeOperation = "source-over";
    return c;
  }

  /* ⚠️⚠️ ZIP 431 — LA PALETTE EST UN PARAMÈTRE, ET C'EST LA SEULE FORME QUI
     TIENNE. Demande de Guillaume : « l'herbe un peu plus sombre à Valley Town
     qu'à la ferme ». Deux fonctions jumelles (une par zone) auraient été deux
     dessins à garder d'accord le jour où l'on retouche la texture — le défaut
     que le §8 de CLAUDE.md nomme « un paramètre qui double un autre paramètre ».
     Ici il n'y a qu'UN dessin ; seules les six couleurs changent, et le tirage
     pseudo-aléatoire est le MÊME (même graine), donc les deux herbes ont
     rigoureusement le même grain. C'est ce qui rend l'écart lisible comme une
     différence de LUMIÈRE et pas comme une autre texture.
     ⚠️ Les jaunes (les petites fleurs de la variante 2) sont dans la palette eux
     aussi : les laisser en dur aurait fait scintiller deux fleurs vives sur un
     gazon assombri, seule chose que l'œil aurait vue. */
  const GRASS_FARM = { base: "#59a84a", d1: "#4f9a41", l1: "#63b653", blade: "#3f8a36", tip: "#6fc25e", fleck: "#e8e05a" };
  /* ⚠️ « TRÈS LÉGÈREMENT », ET LE CHIFFRE EST −10 % DE LUMINANCE avec un demi-pas
     vers le bleu. Assez pour qu'un joueur qui descend du train sente qu'il a
     changé d'endroit ; pas assez pour qu'il croie à une autre saison. La ville
     est plus vieille, plus ombragée, plus tondue que le champ — c'est la lecture
     qu'on cherche, et la hauteur d'herbe et les animations viendront plus tard
     (voir §13). */
  /* ⚠️⚠️ ZIP 447 — ELLE SUIT LE PAVÉ DE 64, ET CE N'EST PAS DU ZÈLE. Ces trois
     tuiles ne servent plus que de REPLI (`drawTownGrassTile` échoue seulement
     chez un client trop vieux pour avoir le pavé) — donc les laisser au vert
     saturé du 431 n'aurait rien cassé AUJOURD'HUI, et c'est exactement ce qui
     rend le piège intéressant : deux descriptions de la même herbe, dont une
     seule est regardée, divergent en silence. C'est le §8 mot pour mot (« un
     paramètre qui double un autre paramètre est une divergence en attente ») et
     le §« il fait vieillir » de l'en-tête : un dessin que personne ne regarde
     reste au niveau du jour où il a été écrit.
     ⚠️ LA FERME NE BOUGE PAS (`GRASS_FARM` au-dessus, intacte) : la décision du
     424 interdit de mêler deux changements visuels, et ce zip ne touche qu'à
     Valley Town. L'écart ferme/ville s'en trouve d'ailleurs AGRANDI — c'est un
     effet connu, pas un oubli, et il est dit dans le rapport. */
  const GRASS_TOWN = { base: "#5e9251", d1: "#54864d", l1: "#689b58", blade: "#4b7647", tip: "#71a15f", fleck: "#bcd7b6" };
  function grassTile(variant, pal) {
    const p = pal || GRASS_FARM;
    const [c, g] = cv(T, T), r = makeRnd(77 + variant * 131);
    P(g, 0, 0, T, T, p.base);
    for (let i = 0; i < 26; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? p.d1 : p.l1);
    for (let i = 0; i < 5; i++) { const x = (r() * 14) | 0, y = (r() * 13) | 0; P(g, x, y, 1, 2, p.blade); P(g, x + 1, y + 1, 1, 1, p.tip); }
    if (variant === 2) { P(g, 4, 5, 1, 1, p.fleck); P(g, 11, 10, 1, 1, p.fleck); }
    return c;
  }
  function tilledTile(watered) {
    const [c, g] = cv(T, T), r = makeRnd(watered ? 55 : 44);
    P(g, 0, 0, T, T, watered ? "#5a3d28" : "#8a5c35");
    P(g, 0, 0, T, 1, watered ? "#4e3421" : "#7a4f2c");
    for (let y = 2; y < T; y += 4) P(g, 0, y, T, 1, watered ? "#503722" : "#7d522e");
    for (let i = 0; i < 14; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, watered ? "#6a4930" : "#9a6a3f");
    if (watered) for (let i = 0; i < 6; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#4a3220");
    return c;
  }
  function waterTile(frame) {
    const [c, g] = cv(T, T), r = makeRnd(99 + frame * 31);
    P(g, 0, 0, T, T, "#3a7bc8");
    for (let i = 0; i < 8; i++) P(g, (r() * T) | 0, (r() * T) | 0, 3, 1, "#4a8bd8");
    for (let i = 0; i < 4; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#7ab4e8");
    P(g, frame ? 9 : 3, frame ? 4 : 10, 3, 1, "#a8d4f0");
    return c;
  }
  function sandTile() {
    const [c, g] = cv(T, T), r = makeRnd(31);
    P(g, 0, 0, T, T, "#d8c07a");
    for (let i = 0; i < 18; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#c8b06a" : "#e5d090");
    return c;
  }
  function bridgeTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#9a6b3f");
    for (let y = 0; y < T; y += 4) { P(g, 0, y, T, 3, "#a87745"); P(g, 0, y + 3, T, 1, "#7a5330"); }
    P(g, 3, 0, 1, T, "#8a6038"); P(g, 11, 0, 1, T, "#8a6038");
    return c;
  }
  function bridgeRuinTile() {
    // Base : eau visible (chantier de pont en ruine, pas encore réparé).
    const [c, g] = cv(T, T), r = makeRnd(48);
    P(g, 0, 0, T, T, "#3a7bc8");
    for (let i = 0; i < 8; i++) P(g, (r() * T) | 0, (r() * T) | 0, 3, 1, "#4a8bd8");
    for (let i = 0; i < 4; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#7ab4e8");
    P(g, 3, 10, 3, 1, "#a8d4f0");
    // Piliers de bois effondrés dépassant de l'eau (pas de planches).
    P(g, 2, 5, 2, 8, "#7a5330");
    P(g, 2, 5, 1, 8, "#5e3f22");
    P(g, 12, 3, 2, 7, "#8a6038");
    P(g, 12, 3, 1, 7, "#6a4a2a");
    P(g, 7, 9, 2, 5, "#6a4528");
    // Éclats/débris flottants autour des piliers.
    P(g, 5, 3, 2, 1, "#8a6038");
    P(g, 9, 6, 1, 1, "#7a5330");
    P(g, 1, 13, 2, 1, "#6a4528");
    return c;
  }
  function bridgeStoneTile() {
    // Pont rénové en pierre (chantier 2026-07, demande Guillaume : "aspect
    // pierre joli"). Base grise pierre avec un pavage de dalles irrégulières
    // (jointures plus sombres), distinct du bois (bridgeTile ci-dessus) pour
    // que la rénovation soit visible d'un coup d'œil.
    const [c, g] = cv(T, T), r = makeRnd(77);
    P(g, 0, 0, T, T, "#8a8a92");
    // Jointures de dalles (grille légèrement irrégulière).
    P(g, 0, 0, T, 1, "#6a6a72"); P(g, 0, 5, T, 1, "#6a6a72"); P(g, 0, 10, T, 1, "#6a6a72");
    P(g, 0, 0, 1, T, "#6a6a72"); P(g, 7, 0, 1, T, "#6a6a72");
    // Variations de teinte par dalle + petits éclats clairs (usure/relief).
    for (let i = 0; i < 10; i++) {
      const x = (r() * T) | 0, y = (r() * T) | 0;
      P(g, x, y, 2, 1, r() < 0.5 ? "#9c9ca4" : "#78787f");
    }
    P(g, 2, 2, 1, 1, "#b0b0b8"); P(g, 12, 12, 1, 1, "#b0b0b8");
    return c;
  }
  function pathTile() {
    const [c, g] = cv(T, T), r = makeRnd(63);
    P(g, 0, 0, T, T, "#b8a888");
    for (let i = 0; i < 10; i++) { const x = (r() * 13) | 0, y = (r() * 13) | 0; P(g, x, y, 3, 2, "#a89878"); P(g, x, y, 2, 1, "#c8b898"); }
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 434 — LES REVÊTEMENTS DE VALLEY TOWN : GOUDRON, PAVÉS, BRIQUES.
     ──────────────────────────────────────────────────────────────────────────
     Demande de Guillaume, sur planche de référence : « des tuiles ou groupes de
     tuiles ASSEMBLABLES qui ont des motifs bien plus complexes qu'à l'heure
     actuelle ». Ce qu'il y avait, c'était `pathTile()` juste au-dessus : UNE
     tuile de 16×16, dix taches, recopiée à l'identique sur les cinq mille cases
     de rue de la ville. À l'écran, une moquette.

     ⚠️⚠️ CE QUI CHANGE N'EST PAS LE NOMBRE DE DÉTAILS, C'EST LA PÉRIODE. Une
     tuile seule se répète tous les 16 px et l'œil voit la grille avant de voir
     le dessin — quelle que soit sa finesse. On dessine donc un PAVÉ DE QUATRE
     TUILES SUR QUATRE (64×64), d'un seul tenant, et le rendu y découpe la case
     dont il a besoin (`x % 4`, `y % 4`). Les pavés, les briques, les fissures
     traversent les bords de case : la grille disparaît, et la période passe de
     16 à 64 px.

     ⚠️ LE MOTIF DOIT BOUCLER SUR LUI-MÊME, sinon on a juste déplacé la couture
     de 16 à 64 px — et une couture tous les quatre carreaux est PIRE qu'un
     motif régulier, parce qu'elle dessine une deuxième grille. Toute forme est
     donc peinte par `wrap()`, qui la dessine aussi à −64 et +64 : un pavé à
     cheval sur le bord droit réapparaît, exactement, sur le bord gauche.
     Verticalement, les hauteurs de rang sont choisies pour tomber juste sur 64.

     ⚠️ AUCUN `translate`, AUCUN `rotate`, AUCUN `fillText` (§4) : tout est en
     `fillRect`, donc tout est rastérisable par `tools/lib-canvas.mjs` — c'est
     ce qui rend `tools/render-rues.mjs` possible, et c'est la seule façon de
     REGARDER ce dessin sans lancer le jeu.
     ══════════════════════════════════════════════════════════════════════════ */
  const ROAD_SUP = 4;                     // période du motif, en tuiles
  const ROAD_N = ROAD_SUP * T;            // 64 px de côté

  /* Le peintre à bouclage. Toute la propriété « assemblable » tient dans ces
     trois lignes : on peint la même forme trois fois, décalée d'une période à
     gauche et à droite. Le canevas découpe le reste tout seul — pour une fois,
     c'est le piège du §4 qui rend service. */
  function roadWrap(g, x, y, w, h, col) {
    P(g, x - ROAD_N, y, w, h, col);
    P(g, x, y, w, h, col);
    P(g, x + ROAD_N, y, w, h, col);
  }

  /* Une répartition de `total` en `n` largeurs entières JAMAIS ÉGALES et dont
     la somme fait exactement `total`. C'est ce qui garantit le bouclage : une
     rangée de pavés dont la somme déborderait d'un pixel décalerait tout le
     rang suivant, et la couture reviendrait. */
  function roadSplit(total, n, r, jitter) {
    const w = new Array(n).fill(Math.floor(total / n));
    for (let k = 0; k < total - w[0] * n; k++) w[k]++;
    // Le jitter est un TRANSFERT (on prend à l'un, on donne à l'autre) : la
    // somme est invariante par construction, jamais recalculée.
    for (let k = 0; k < n * 3; k++) {
      const a = (r() * n) | 0, b = (r() * n) | 0;
      if (a === b || w[a] <= jitter[0] + 1 || w[b] >= jitter[1]) continue;
      w[a]--; w[b]++;
    }
    return w;
  }

  /* ------------------------------------------------------------- LES PAVÉS
     Référence « bruine et pavés de rue » : des pierres grises irrégulières,
     posées en rangs décalés, joint sombre, chacune biseautée. Ce sont les
     TROIS choses qui font la différence avec un damier, et aucune n'est
     coûteuse : le rang décalé (aucun joint vertical continu), le biseau
     (lumière au nord-ouest, ombre au sud-est — le pavé est bombé), et la
     teinte tirée par pierre (une rue n'est pas monochrome). */
  /* ZIP 437 — LE GRAVIER DES PROMENADES (parc, sentier de rive). ⚠️ IL SE
     DISTINGUE DES PAVÉS PAR L'ABSENCE DE JOINT, pas par sa couleur : un pavage
     est un assemblage de pièces (donc un réseau de lignes), un gravier est un
     TAS (donc pas une seule ligne). Peint comme des petites pierres avec des
     joints, il aurait juste eu l'air de pavés plus petits — et le motif de
     16 px serait revenu par la porte de derrière (§4 : « l'œil voit la période
     avant le dessin »). D'où un semis sur toute la période de 64 px, sans
     structure de rangs. */
  /* ══════════════════════════════════════════════════════════════════════
     ZIP 437 — LES MASSIFS FLEURIS, LES BUISSONS ET LES BLOCS ERRATIQUES.
     ──────────────────────────────────────────────────────────────────────
     ⚠️ LE MASSIF EST UNE TUILE, PAS UN DÉCOR. Il se pose sur la pelouse et il
     est TRANSPARENT partout ailleurs : l'herbe continue de se voir au travers,
     ce qui est la différence entre un parterre et une moquette de fleurs. Voir
     `BL_*` dans fermeConstants pour le pourquoi de la couche.
     ⚠️ ET IL NE TOUCHE PAS LE BORD DE LA CASE. Une tige peinte en x = 0 se
     colle à la tige de la case voisine et redessine la grille de 16 px — le
     défaut que ce zip corrige partout ailleurs. Une case fleurie garde donc un
     pixel de marge, et c'est le semis qui fait la continuité, pas le contact. */
  const BLOOM_KINDS = [
    // marguerites : tapis bas, blanc et jaune, feuillage sombre
    { leaf: ["#2f6b2a", "#3f8033"], n: 9, h: [2, 3], pet: ["#f4f1e6", "#ffffff"], core: "#e8c93c", shape: "cross" },
    // tulipes : hautes, rouges et roses, en touffes serrées
    { leaf: ["#2c6b34", "#3d8442"], n: 7, h: [4, 6], pet: ["#cf3a34", "#e0625a", "#d9628f"], core: "#8c1f1c", shape: "puff" },
    // lavande et sauge : épis violets, feuillage gris-vert
    { leaf: ["#5a7a58", "#6d8f68"], n: 8, h: [5, 7], pet: ["#8a6fc4", "#a189d8", "#6f57a8"], core: "#d8c8f0", shape: "spike" },
    // forsythia et souci : la tache jaune de l'image de référence
    { leaf: ["#356e33", "#47883f"], n: 8, h: [3, 5], pet: ["#eec22c", "#f7dc5e", "#d9a41f"], core: "#a06c12", shape: "puff" },
    // la prairie : semis lâche, quatre couleurs, rien d'aligné
    { leaf: ["#3d7a36", "#4f8f42"], n: 5, h: [2, 4], pet: ["#f0efe2", "#e8c93c", "#d97a8e", "#9a86cf"], core: null, shape: "cross" },
  ];
  /* ⚠️⚠️ ZIP 439 — CHAQUE ESPÈCE A UNE FORME DE FLEUR, ET `big: true/false` A
     DISPARU. Vu en jeu après la montée de densité : les massifs de marguerites
     et de lavande se lisaient comme du GRÉSIL — un semis de points d'un pixel,
     c'est-à-dire du bruit, exactement ce que Guillaume appelle « sale » (438).
     Les tulipes et le forsythia, eux, tenaient : ils avaient `big`.
     Le défaut n'était donc pas la densité, c'était la TAILLE DE LA FLEUR. À
     60 % de couverture, une fleur d'un pixel n'est plus une fleur, c'est une
     texture ; il en faut au moins trois pour qu'une forme se lise.
     ⚠️ ET LES TROIS FORMES SONT CELLES DES RÉFÉRENCES DE GUILLAUME, pas des
     variantes graphiques : la CROIX de cinq pixels à cœur contrasté (c'est le
     dessin de fleur nommé au 438), la BOULE de six pixels pour une corolle
     pleine, et l'ÉPI vertical de deux pixels de large pour la lavande — dont
     l'épi EST la silhouette, et qu'une boule aurait effacée. */
  /* ⚠️⚠️⚠️ ZIP 439 — LE MASSIF EST UN PAVÉ DE 64 px, PLUS UNE TUILE DE 16, ET
     C'EST UN DÉFAUT VU EN JEU QUI L'A IMPOSÉ. Ce dessin produisait une case à
     la fois, avec les tiges cantonnées à `x = 2 … T-3` pour qu'aucune ne soit
     coupée par le bord. Tant que les massifs étaient clairsemés, personne ne
     voyait la gouttière de deux pixels laissée tout autour de chaque case ; en
     montant la densité à 60 % (voir plus bas), elle est devenue un QUADRILLAGE
     BRUN parfaitement régulier par-dessus les fleurs — la grille de 16 px
     redessinée, une fois de plus, et cette fois PAR la correction précédente.
     C'est le piège nommé au 434 (« un motif de sol se juge assemblé, et sa
     période compte plus que ses détails ») et la parade y est déjà écrite : on
     dessine un pavé de 4×4 tuiles d'un seul tenant et on y découpe la case.
     ⚠️ ET IL BOUCLE SUR LUI-MÊME (`roadWrap`, comme les revêtements et l'herbe) :
     toute tige peinte près d'un bord est peinte aussi à −64 et +64. Sans ça on
     aurait déplacé la couture de 16 à 64 px, c'est-à-dire dessiné une SECONDE
     grille, plus large et plus laide que la première.
     ⚠️ LA VARIANTE PAR HACHAGE DISPARAÎT, et c'est un gain : la variété ne vient
     plus de huit tuiles tirées au sort case par case (donc de huit motifs qui
     se répètent), elle vient de la POSITION dans le pavé. Deux cases voisines
     sont forcément différentes, et un massif de six cases sur trois ne montre
     plus jamais deux fois le même dessin. */
  function townBloomSurface(kind) {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x6b21 + kind * 419);
    const K = BLOOM_KINDS[kind - 1];
    /* ⚠️ 438 — DENSITÉ DOUBLÉE, puis 439 — DOUBLÉE ENCORE, ET LE CHIFFRE EST
       MESURÉ. Vu en jeu, les massifs du parc se lisaient comme un CHAMP
       LABOURÉ : de grands rectangles de terre brune avec des tiges en rangs.
       Couverture peinte d'une case : 28 % pour les marguerites, 43 à 46 % pour
       les autres — plus de la moitié de terre nue. Le repère est la touffe
       fleurie de la planche de Guillaume, qui couvre 68 % de sa boîte ; à ces
       facteurs les massifs cultivés montent à 53-64 %.
       ⚠️⚠️ LA MARGUERITE A SON PROPRE FACTEUR, ET IL EST LE PLUS BAS DES CINQ —
       à l'inverse de ce que le premier réglage supposait. Elle a la plus petite
       fleur, on l'a donc d'abord densifiée (×6) pour compenser ; vu en jeu, sa
       BORDURE d'une case tout autour de chaque parterre est devenue un halo
       blanc criard qui mangeait les massifs qu'elle borde. Une bordure n'a pas
       à égaler ce qu'elle borde : son rôle est de FAIRE LIRE le massif comme
       dessiné (438), et elle le fait mieux en restant basse. C'est aussi
       l'espèce dont la surface totale est la plus grande dans le parc — la plus
       petite densité y couvre le plus de terrain.
       ⚠️⚠️ ET LES FACTEURS ONT ÉTÉ REDESCENDUS quand les fleurs ont grossi (voir
       `shape` au-dessus) : à ×6 / ×4,6, des corolles de trois à six pixels
       couvraient 77 à 84 % de la case et la terre disparaissait complètement —
       on ne lisait plus un massif mais un TAPIS. Densité et taille de fleur ne
       sont pas deux réglages indépendants : c'est leur PRODUIT qui fait la
       couverture, et c'est la couverture qu'on mesure. Réglage final : 58 à
       64 %, la fourchette de la touffe de référence (68 %).
       ⚠️ LA PRAIRIE GARDE SA DENSITÉ D'ORIGINE : elle n'est pas un massif, c'est
       un semis lâche sur de l'herbe (ni terre ni bordure, voir
       `drawTownBloomTile`). La densifier ferait de la rive du lac un parterre —
       l'inverse exact de l'opposition « ligne construite / ligne qui ne l'est
       pas » du 437. */
    const wild = kind === C.BL_WILD;
    const per = K.n * (wild ? 2 : kind === C.BL_DAISY ? 1.9 : 2.6);
    const n = Math.round(per * ROAD_SUP * ROAD_SUP);
    for (let k = 0; k < n; k++) {
      const x = (r() * ROAD_N) | 0;
      /* ⚠️ LA HAUTEUR DE PIED BALAIE TOUTE LA CASE. Premier jet (438) : entre 9
         et 14, donc toutes les fleurs alignées sur la même base — un massif se
         lisait en RANGS HORIZONTAUX de 16 px, c'est-à-dire encore la grille. */
      const base = (r() * ROAD_N) | 0;
      const h = K.h[0] + ((r() * (K.h[1] - K.h[0] + 1)) | 0);
      const top = base - h;
      const stem = K.leaf[(r() * K.leaf.length) | 0];
      for (let y = top; y <= base; y++) roadWrap(g, x, y, 1, 1, stem);
      // Deux feuilles à mi-hauteur : sans elles, une tige est un trait.
      if (h > 3) { roadWrap(g, x - 1, base - 1, 1, 1, K.leaf[1]); roadWrap(g, x + 1, base - 2, 1, 1, K.leaf[0]); }
      const pet = K.pet[(r() * K.pet.length) | 0];
      if (K.shape === "puff") {
        roadWrap(g, x - 1, top - 1, 3, 2, pet);
        roadWrap(g, x, top - 2, 1, 1, pet);
        if (K.core) roadWrap(g, x, top, 1, 1, K.core);
      } else if (K.shape === "spike") {
        // L'épi : deux pixels de large, la moitié haute plus claire.
        roadWrap(g, x, top - 2, 1, 4, pet);
        roadWrap(g, x + 1, top - 1, 1, 3, pet);
        if (K.core) roadWrap(g, x, top - 2, 1, 1, K.core);
      } else {
        // La croix de cinq pixels, et son cœur d'une autre couleur.
        roadWrap(g, x - 1, top - 1, 3, 1, pet);
        roadWrap(g, x, top - 2, 1, 3, pet);
        if (K.core) roadWrap(g, x, top - 1, 1, 1, K.core);
      }
    }
    return c;
  }

  /* Le buisson fleuri. ⚠️ 24 px DE HAUT POUR UNE CASE DE 16 : il DÉBORDE vers
     le nord, comme la haie du 425, et c'est ce débord qui lui donne du volume.
     Le rendu l'ancre par le bas (voir la file de props). */
  function townShrubSprite(vr) {
    const [c, g] = cv(20, 22), r = makeRnd(0x51d3 + vr * 97);
    const PAL = [
      { l: ["#3f8a37", "#57a84c", "#265e22"], f: "#f2ce3c", fl: "#ffe873" },
      { l: ["#417f4a", "#589a5f", "#28572f"], f: "#e07aa8", fl: "#f7aecb" },
      { l: ["#4a8a3a", "#65a850", "#2c5f24"], f: "#f0efe2", fl: "#ffffff" },
    ][vr % 3];
    const m = new Uint8Array(20 * 22);
    for (const [bx, by, rx, ry] of [[10, 13, 8.5, 7.5], [6, 10, 5.5, 5], [14, 11, 5.5, 5]]) {
      for (let y = 1; y < 21; y++) for (let x = 1; x < 19; x++) {
        const dx = (x + 0.5 - bx) / rx, dy = (y + 0.5 - by) / ry, d = Math.hypot(dx, dy);
        const th = Math.atan2(dy, dx);
        if (d <= 1 + 0.16 * Math.sin(th * 5 + bx)) m[y * 20 + x] = 1;
      }
    }
    const on = (x, y) => (x < 0 || y < 0 || x >= 20 || y >= 22) ? 0 : m[y * 20 + x];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 20; x++) if (m[y * 20 + x]) P(g, x, y, 1, 1, PAL.l[0]);
    for (let k = 0; k < 34; k++) {
      const x = (r() * 20) | 0, y = (r() * 22) | 0;
      if (!m[y * 20 + x]) continue;
      P(g, x, y, 1 + ((r() * 2) | 0), 1, r() < 0.55 ? PAL.l[1] : PAL.l[2]);
    }
    for (let y = 0; y < 22; y++) for (let x = 0; x < 20; x++) {
      if (!m[y * 20 + x]) continue;
      if (on(x + 1, y) && on(x - 1, y) && on(x, y + 1) && on(x, y - 1)) continue;
      let nx = 0, ny = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!on(x + dx, y + dy)) { nx -= dx; ny -= dy; }
      P(g, x, y, 1, 1, (nx + ny * 1.15) > 1.5 ? PAL.l[1] : PAL.l[2]);
    }
    for (let k = 0; k < 14; k++) {
      const x = 1 + ((r() * 18) | 0), y = 1 + ((r() * 20) | 0);
      if (!m[y * 20 + x]) continue;
      P(g, x, y, 2, 2, PAL.f); P(g, x, y, 1, 1, PAL.fl);
    }
    return c;
  }
  /* Le bloc erratique de la rive du lac. ⚠️ IL EST GRIS-BLEU ET IL A UNE LIGNE
     DE FLOTTAISON : une pierre posée au bord de l'eau est mouillée à sa base.
     Sans cette ligne, on ne sait pas si elle est dans le lac ou à côté. */
  function townBoulderSprite(vr) {
    const [c, g] = cv(22, 18), r = makeRnd(0x2c88 + vr * 131);
    const ROC = ["#8b8880", "#7a7770", "#96938b"], LIT = "#aeaaa1", DRK = "#5f5c57";
    const blocks = [[[3, 5, 12, 10]], [[2, 6, 9, 8], [11, 4, 9, 11]], [[4, 3, 13, 12], [1, 9, 7, 6]]][vr % 3];
    for (const [bx, by, bw, bh] of blocks) {
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
        const u = (x - bx) / bw - 0.5, v = (y - by) / bh - 0.5;
        if (u * u + v * v * 1.15 > 0.27) continue;         // un galet, pas une brique
        P(g, x, y, 1, 1, ROC[(r() * ROC.length) | 0]);
      }
      for (let x = bx; x < bx + bw; x++) {                 // l'arête qui prend la lumière du nord-ouest
        for (let y = by; y < by + bh; y++) {
          const u = (x - bx) / bw - 0.5, v = (y - by) / bh - 0.5;
          if (u * u + v * v * 1.15 > 0.27) continue;
          P(g, x, y, 1, 1, (u + v) < -0.35 ? LIT : (u + v) > 0.30 ? DRK : ROC[0]);
          break;
        }
      }
      P(g, bx + 1, by + bh - 2, bw - 2, 1, "#4e5a5e");     // la ligne de flottaison
    }
    for (let k = 0; k < 10; k++) {                          // fissures et lichen
      const x = 2 + ((r() * 18) | 0), y = 3 + ((r() * 13) | 0);
      P(g, x, y, 1, 1 + ((r() * 2) | 0), r() < 0.5 ? DRK : "#6f7a55");
    }
    return c;
  }
  /* ══════════════════════════════════════════════════════════════════════
     ZIP 438 — L'HERBE DE VALLEY TOWN : UN PAVÉ DE 64 px, PLUS UNE TUILE.
     ──────────────────────────────────────────────────────────────────────
     ⚠️⚠️ « ON DIRAIT UNE FRICHE » (Guillaume, sur le parc du 437). Une friche,
     c'est de l'herbe sans SOIN : une teinte, un grain régulier, rien qui dise
     que quelqu'un s'en occupe. Or l'herbe de la ville était trois tuiles de
     16 px tirées par `(x*37+y*17)%3` — donc, à l'échelle d'un parc de 34 cases,
     un damier de trois motifs qui se répète cinquante fois. C'est le §4 mot
     pour mot : *l'œil voit la période avant le dessin*.
     ⚠️ LA PARADE EST CELLE DES REVÊTEMENTS (434) : un pavé de 4×4 tuiles peint
     d'un seul tenant, où l'on découpe la case (`x % 4`, `y % 4`). Il porte des
     PLAQUES d'herbe (de larges taches douces de deux verts voisins) que ne
     peut pas porter une tuile de 16 px, et c'est très exactement ce qui manque
     à une pelouse pour ne plus ressembler à un tapis de billard.
     ⚠️ ET LES TOUFFES SONT PLACÉES SUR UNE SUITE À FAIBLE DISCRÉPANCE, pas
     tirées : un tirage uniforme laisse des paquets et des vides (c'est ce qui
     fait le grain sale), une suite d'or les répartit sans jamais s'aligner. */
  /* ⚠️⚠️ ZIP 447 — LES SEPT COULEURS SONT CELLES DE LA MAQUETTE DE GUILLAUME,
     RELEVÉES AU PIXEL, PAS ACCORDÉES À L'ŒIL. La forme du 438 (plaques douces,
     touffes sur suite R2, fleurs rares) n'a pas bougé d'une ligne : elle était
     juste, et `verify-sol2.mjs` le prouve autrement qu'en le disant — l'ÉCART-
     TYPE du pavé tombait déjà à 1,4 % de celui de la référence.
     Ce qui était faux, c'était la MATIÈRE, et deux nombres le disaient :

       saturation      jeu 56,6 %   référence 42,7 %   → 14 points de trop
       brins sombres   jeu 16,6 %   référence 12,3 %   → un tiers de trop

     Un vert trop saturé et trop dru : de loin, du gazon synthétique. La palette
     ci-dessous EST celle que la quantification lit dans `refs/scene2.png` — sept
     verts entre L=102 et L=147, tous autour de 42 % de saturation. On ne les
     recompose pas, on les copie, exactement comme on copie un sprite (439).
     ⚠️ ET LES TOUFFES PASSENT DE 260 À 190, ce qui n'est pas un réglage non
     plus : 190 × 2 px sombres + un tiers de rappel = 506 px sur 4 096, soit les
     12,3 % de la référence. Le compte se DÉRIVE de la densité visée. */
  function townGrassSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N);
    const BASE = "#5e9251", P1 = "#689b58", P2 = "#54864d", P3 = "#629456";
    P(g, 0, 0, ROAD_N, ROAD_N, BASE);
    /* LES PLAQUES. Des disques doux de deux verts voisins, assez grands pour
       qu'on ne les compte pas — c'est le relief de la pelouse, pas un motif. */
    /* ⚠️⚠️ ZIP 447 — PLUS NOMBREUSES, PLUS PETITES, ET LE TON LE PLUS CLAIR EST
       PARTI. Le côte-à-côte de `verify-sol2` l'a montré alors qu'aucun des
       quatre nombres ne le disait : à gauche, huit TACHES RONDES qu'on compte ;
       à droite, chez Guillaume, un marbrage qu'on ne compte pas. Deux causes,
       et la seconde est la vraie :
         — le rayon. Des disques de 17 px sur un pavé de 64 font trois taches
           par écran ; à 9-12 px elles se recouvrent et redeviennent du relief ;
         — `P3`, à +16 de luminance sur la base, dessinait des AURÉOLES CLAIRES.
           La référence ne monte qu'à +8 sur ses aplats — ce qui est au-dessus,
           chez elle, ce sont des brins, c'est-à-dire des pixels ISOLÉS.
       *Une plaque se remarque par son rayon, mais elle se TRAHIT par sa
       luminance.* On garde donc P1/P2, à ±8 et ±10 de la base, et P3 ne sert
       plus qu'à la moitié d'une plaque sur six. */
    const PATCH = [[14, 12, 11, P1], [46, 20, 10, P2], [26, 44, 12, P1], [56, 52, 9, P3],
                   [6, 34, 10, P2], [38, 6, 9, P1], [60, 8, 9, P2], [10, 58, 10, P1],
                   [34, 28, 11, P2], [50, 38, 9, P1], [20, 6, 8, P2], [44, 60, 9, P1]];
    for (const [px0, py0, rr, col] of PATCH) {
      for (let y = py0 - rr; y <= py0 + rr; y++) for (let x = px0 - rr; x <= px0 + rr; x++) {
        const dx = x - px0, dy = (y - py0) * 1.15;
        const d = Math.sqrt(dx * dx + dy * dy) / rr;
        if (d > 1) continue;
        // ⚠️ Le bord de la plaque est DENTELÉ par une harmonique, jamais un
        // dégradé alpha : à cette échelle un dégradé fait une auréole de gras.
        const th = Math.atan2(dy, dx);
        if (d > 0.82 + 0.18 * Math.sin(th * 3 + px0)) continue;
        P(g, (x + ROAD_N) % ROAD_N, (y + ROAD_N) % ROAD_N, 1, 1, col);
      }
    }
    /* LES TOUFFES. Un V de trois pixels : deux brins qui montent en s'écartant.
       Deux tons, l'un clair l'autre sombre, et le sombre est posé UN PIXEL plus
       bas — c'est l'ombre du brin, et c'est ce qui donne du volume à un gazon.
       ⚠️ La suite d'or (0,618) répartit sans grille et sans paquet ; elle boucle
       en modulo, donc le pavé se raccorde à lui-même. */
    /* ⚠️⚠️ SUITE R2, PAS DEUX SUITES D'OR. Premier jet : `x = frac(k·φ)` et
       `y = frac(k·φ²·7)`. Deux suites unidimensionnelles dont le rapport est
       presque rationnel ne remplissent pas le plan : elles alignent les points
       sur des DROITES. Résultat vu sur `render-parc.mjs` : la pelouse rayée
       verticalement d'un bout à l'autre du parc, pire que la tuile qu'on
       remplaçait. Les deux constantes ci-dessous sont celles du nombre
       plastique, faites pour le plan — c'est le même genre d'erreur que la
       distance de Manhattan prise pour l'euclidienne au 435. */
    const R2X = 0.7548776662, R2Y = 0.5698402910;
    /* ⚠️ ZIP 447 — les quatre tons de touffe sont eux aussi lus dans la maquette.
       L'ancien couple montait à L=156 (`#71bd60`) et descendait à L=88
       (`#35722d`) : 68 de battement, quand Guillaume en a 45. C'est là que
       partaient les huit points d'écart-type en trop. */
    const LIT = ["#71a15f", "#78a663"], DRK = ["#4f7d4a", "#4b7647"];
    for (let k = 1; k <= 190; k++) {
      const x = Math.floor(((k * R2X) % 1) * ROAD_N);
      const y = Math.floor(((k * R2Y) % 1) * ROAD_N);
      const lit = LIT[k % 2], drk = DRK[k % 2];
      P(g, x, y, 1, 2, drk);
      P(g, (x + 1) % ROAD_N, y - 1 < 0 ? ROAD_N - 1 : y - 1, 1, 2, lit);
      if (k % 3 === 0) P(g, (x + 2) % ROAD_N, y, 1, 2, drk);
    }
    /* Quelques fleurs des champs, très rares : une par case en moyenne serait
       une prairie, pas une pelouse de ville.
       ⚠️⚠️ ZIP 447 — ELLES ÉTAIENT JAUNE VIF, ELLES SONT BLANCHES. Vu sur le
       côte-à-côte, et c'est le défaut qui sautait le plus aux yeux : huit points
       jaunes sur le pavé du jeu, deux points pâles sur celui de Guillaume. Le
       `#e8e05a` du 438 est à 61 % de saturation dans une pelouse qui en fait 42,
       donc l'œil ne voit plus que lui — le §8 en une image (« deux couleurs
       réglées à l'œil côte à côte ne gardent pas leur écart »). La référence n'a
       qu'un seul ton de fleur, `#bcd7b6`, à 15 % de saturation, et il n'occupe
       que 0,1 % de sa surface. On passe donc de onze semis à six. */
    const FL = ["#bcd7b6", "#c9d7a4", "#bcd7b6"];
    for (let k = 300; k < 306; k++) {
      const x = Math.floor(((k * R2X) % 1) * ROAD_N), y = Math.floor(((k * R2Y) % 1) * ROAD_N);
      P(g, x, y, 1, 1, FL[k % FL.length]);
      if (k % 2) P(g, (x + 1) % ROAD_N, (y + 1) % ROAD_N, 1, 1, FL[k % FL.length]);
    }
    return c;
  }
  function townGravelSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x37c1);
    P(g, 0, 0, ROAD_N, ROAD_N, "#b2a891");                       // la terre tassée du fond
    for (let i = 0; i < 2600; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#bcb29a" : "#a89e88");
    // Les cailloux : trois tailles, quatre teintes, et un pixel d'ombre au sud
    // sur les plus gros — c'est cette ombre qui donne du RELIEF à un tas.
    const ST = ["#cdc6b3", "#c3bba7", "#d6cfbd", "#b9b09b", "#c8c9be"];
    for (let i = 0; i < 900; i++) {
      const x = (r() * ROAD_N) | 0, y = (r() * ROAD_N) | 0;
      const w = 1 + ((r() * 2) | 0), h = 1 + ((r() * 2) | 0);
      P(g, x, y, w, h, ST[(r() * ST.length) | 0]);
      if (w > 1 && r() < 0.5) P(g, x, y + h, w, 1, "rgba(88,80,66,0.30)");
    }
    // Quelques passages tassés plus clairs : un chemin s'use là où l'on marche.
    for (let i = 0; i < 26; i++) {
      const x = (r() * ROAD_N) | 0, y = (r() * ROAD_N) | 0, w = 5 + ((r() * 12) | 0);
      P(g, x, y, w, 1 + ((r() * 2) | 0), "rgba(214,206,188,0.30)");
    }
    return c;
  }
  /* ⚠️⚠️ ZIP 447 — LES 42 COULEURS DE CE PAVÉ ONT ÉTÉ RAMENÉES SUR CELLES DU
     CHEMIN DE GUILLAUME PAR UNE AFFINE, ET LE DESSIN N'A PAS BOUGÉ D'UNE LIGNE.
     `verify-sol2.mjs` mesurait, entre le pavé du jeu et la branche verticale de
     `refs/planche2.png` (celle qu'il a dessinée VUE DE DESSUS, pas le parement
     horizontal — voir la note du banc) :

       médiane de luminance   jeu 106   référence  92
       écart-type             jeu 45,8  référence  33,7
       joints sombres         jeu 40,8 %  référence 40,3 %   ← déjà juste

     Autrement dit : la STRUCTURE était bonne — même densité de joints, mêmes
     tailles de pierre — mais les corps de pierre montaient à L=195 quand
     Guillaume plafonne à 160. Une rue trop éclairée, pas une rue mal dessinée.
     ⚠️ On a donc appliqué à chaque couleur, mortier compris,
        L' = (L − 106) × (33,7 / 45,8) + 92,
     puis remis la teinte au prorata. Le mortier ne bouge presque pas (63 → 60),
     les pierres descendent beaucoup : c'est exactement la correction qu'il
     fallait, et elle se lit dans une ligne au lieu de trente-six retouches.
     ⚠️ RETOUCHER LES TRENTE-SIX À L'ŒIL AURAIT ÉTÉ L'ERREUR DU §8 : deux gris
     réglés à la main côte à côte ne gardent pas leur écart, et on aurait perdu
     le biseau partiel et les coins mangés, qui sont TOUT ce qui sépare ce pavé
     d'un carrelage (leçon du 434, « le premier jet donnait du papier bulle »).
     ⚠️ Contrôlé après coup : `render-rues` et `render-escaliers` restent au vert,
     la parité de matière marches/pavés comprise — c'est elle qui aurait cassé
     si on avait descendu les pierres sans descendre le reste. */
  function townCobbleSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x5a17);
    const MORTAR = "#3d3c44";
    P(g, 0, 0, ROAD_N, ROAD_N, MORTAR);
    for (let i = 0; i < 900; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#44444a" : "#36353b");
    /* Les corps de pierre. Deux familles : le gris bleuté dominant, et une
       minorité de pierres chaudes ou sombres — c'est cette minorité qui empêche
       la rue de virer au béton. */
    const BODY = ["#807f86", "#87878d", "#79777f", "#8a8a90", "#7d7c83", "#74737a", "#84848a", "#77757b", "#828087", "#89888e", "#77767b", "#7a7973"];
    const LIT = ["#95959b", "#9b9aa0", "#8d8c93", "#9e9da3", "#929197", "#89878f", "#98989e", "#8b8990", "#96959c", "#9d9ca2", "#8c8a91", "#8f8d88"];
    const DRK = ["#5f5e65", "#65646b", "#59575f", "#68676e", "#5c5b62", "#55545b", "#626168", "#57555d", "#606066", "#66656d", "#58565c", "#5a5853"];
    // 64 = 5×8 + 6×4 : douze rangs, pas un pixel de reste (voir l'en-tête).
    const ROWH = [5, 6, 5, 5, 6, 5, 5, 6, 5, 5, 6, 5];
    let y = 0;
    for (let row = 0; row < ROWH.length; row++) {
      const rh = ROWH[row];
      const n = 7 + ((r() * 3) | 0);                 // 7 à 9 pierres par rang
      const ws = roadSplit(ROAD_N, n, r, [5, 13]);
      let x = (r() * ROAD_N) | 0;                    // décalage du rang : aucun joint vertical continu
      for (let s = 0; s < n; s++) {
        /* ⚠️ LE PREMIER JET DONNAIT DU PAPIER BULLE, et c'est le banc qui l'a
           montré (six tuiles assemblées, pas une seule) : toutes les pierres
           avaient la MÊME hauteur, le MÊME biseau complet et les MÊMES quatre
           coins mangés, donc le pavage se lisait comme une grille de pastilles
           identiques — exactement le défaut qu'on prétendait corriger, à une
           échelle plus grosse. Trois irrégularités le cassent, et aucune ne
           coûte : une pierre sur trois est plus BASSE d'un pixel (parfois
           enfoncée d'un pixel, ce qui creuse le joint), le biseau clair ne
           couvre qu'une PARTIE de l'arête, et les coins sont mangés au hasard. */
        const shrink = r() < 0.34 ? 1 : 0, sink = shrink && r() < 0.5 ? 1 : 0;
        const w = ws[s] - 1, h = rh - 1 - shrink, yy = y + sink;
        const k = (r() * BODY.length) | 0;
        roadWrap(g, x, yy, w, h, BODY[k]);
        // Coins mangés : un pavé taillé n'a pas d'angle droit, et c'est ce
        // détail-là qui le sépare d'un carrelage.
        if (r() < 0.85) roadWrap(g, x, yy, 1, 1, MORTAR);
        if (r() < 0.85) roadWrap(g, x + w - 1, yy, 1, 1, MORTAR);
        if (r() < 0.65) roadWrap(g, x, yy + h - 1, 1, 1, MORTAR);
        if (r() < 0.65) roadWrap(g, x + w - 1, yy + h - 1, 1, 1, MORTAR);
        // Biseau PARTIEL : l'arête éclairée démarre où elle veut et s'arrête
        // avant le bout. C'est cette seule ligne qui sort le pavé de la pastille.
        const lo = 1 + ((r() * 2) | 0), hi = w - 1 - ((r() * 3) | 0);
        if (hi > lo) roadWrap(g, x + lo, yy, hi - lo, 1, LIT[k]);
        roadWrap(g, x, yy + 1, 1, Math.max(0, h - 2 - ((r() * 2) | 0)), LIT[k]);
        const dlo = 1 + ((r() * 3) | 0);
        if (w - 1 > dlo) roadWrap(g, x + dlo, yy + h - 1, w - 1 - dlo, 1, DRK[k]);
        roadWrap(g, x + w - 1, yy + 1, 1, h - 2, DRK[k]);
        // Grain de la pierre : deux ou trois pixels, jamais sur le biseau.
        for (let q = 0; q < 2 + ((r() * 2) | 0); q++) {
          const gx = x + 1 + ((r() * Math.max(1, w - 2)) | 0), gy = yy + 1 + ((r() * Math.max(1, h - 2)) | 0);
          roadWrap(g, gx, gy, 1, 1, r() < 0.5 ? DRK[k] : LIT[k]);
        }
        // Une pierre sur douze est enfoncée : de l'eau y stagne, elle est plus
        // sombre et plus terne. C'est ce qui donne la « bruine » sans peindre
        // de flaque (la météo est du ressort du jeu, pas de la tuile).
        if (r() < 0.085) { roadWrap(g, x + 1, yy + 1, w - 2, h - 2, "#64636a"); }
        x += ws[s];
      }
      y += rh;
    }
    // Mousse et sable dans les joints, en tout dernier : ça passe PAR-DESSUS les
    // pierres comme dans la vraie vie, et ça casse la régularité du joint.
    for (let i = 0; i < 40; i++) {
      const gx = (r() * ROAD_N) | 0, gy = (r() * ROAD_N) | 0;
      roadWrap(g, gx, gy, 1 + ((r() * 2) | 0), 1, r() < 0.45 ? "#505d45" : "#5d594f");
    }
    return c;
  }

  /* ------------------------------------------------------------ LE GOUDRON
     Référence « nuit et pavé sombre », mais élargie et de jour : un gris
     ANTHRACITE, jamais uniforme. Ce qui fait un bitume crédible tient en
     quatre couches, dans cet ordre : le grain (des milliers de pixels de trois
     gris voisins), les REPRISES (des rustines d'une autre teinte, aux bords
     mous — c'est le détail qui dit « on a ouvert la chaussée ici »), les
     FISSURES (des lignes brisées d'un pixel), et le gravillon clair qui
     accroche la lumière. */
  function townAsphaltSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x2b93);
    P(g, 0, 0, ROAD_N, ROAD_N, "#3c3d42");
    /* ⚠️ LE PREMIER JET AVAIT UN ÉCART-TYPE DE 8,7 SUR TREIZE COULEURS, et
       `render-rues.mjs` l'a refusé avant que Guillaume ne le voie : c'était un
       aplat anthracite avec du bruit dessus, pas du bitume. Ce qui manquait est
       ce qu'on voit vraiment en baissant les yeux sur une chaussée — LE
       GRANULAT. Un enrobé n'est pas gris : c'est du gravier clair noyé dans du
       noir, et à 16 px par case c'est le seul détail qui porte la matière.
       Douze tons de liant, puis les cailloux par-dessus. */
    const GRAIN = ["#36373c", "#42434a", "#3a3b40", "#45464d", "#333438", "#2e2f34",
                   "#484951", "#3e3f45", "#313237", "#4b4c54", "#383940", "#414248"];
    for (let i = 0; i < 3200; i++) {
      P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, GRAIN[(r() * GRAIN.length) | 0]);
    }
    // Le granulat : des cailloux d'un ou deux pixels, plus clairs que le liant,
    // avec pour une part sur trois un pixel d'ombre au sud — c'est ce relief
    // minuscule qui empêche la chaussée de se lire comme du feutre.
    /* ⚠️ ET IL EN FAUT MOINS QU'ON NE CROIT. Premier réglage : 260 cailloux
       jusqu'à #6f7079, et la planche assemblée montrait du POIVRE ET SEL — à
       l'échelle du jeu (une case = 16 px), un granulat trop clair et trop dense
       scintille au défilement au lieu de faire de la matière. On en pose 170,
       plafonnés deux tons plus bas. La règle est celle du §8 : ce qui porte la
       matière est l'écart de valeur, pas la quantité de points. */
    const STONE = ["#55565e", "#5b5c64", "#4f5058", "#61626b", "#525359", "#585a62", "#5e5f68", "#646570"];
    for (let i = 0; i < 170; i++) {
      const sx = (r() * ROAD_N) | 0, sy = (r() * ROAD_N) | 0, sw = r() < 0.35 ? 2 : 1;
      const k = (r() * STONE.length) | 0;
      roadWrap(g, sx, sy, sw, 1, STONE[k]);
      if (r() < 0.34) roadWrap(g, sx, sy + 1, sw, 1, "#2d2e33");
    }
    // Quelques granulats CHAUDS : un enrobé contient du silex et du grès, et
    // deux ou trois taches ocres suffisent à sortir le gris du camaïeu bleuté.
    for (let i = 0; i < 34; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#585044" : "#63594a");
    // Les traces d'huile : les plus sombres du dessin, mais discrètes — deux
    // taches franches se répéteraient tous les quatre carreaux et dessineraient
    // à elles seules la période du motif (vu sur la planche assemblée).
    for (let i = 0; i < 2; i++) {
      const ox = (r() * ROAD_N) | 0, oy = (r() * ROAD_N) | 0;
      for (let k = 0; k < 3 + ((r() * 3) | 0); k++) roadWrap(g, ox + ((r() * 5) | 0), oy + k, 2 + ((r() * 3) | 0), 1, "#303137");
    }
    /* Les reprises d'enrobé. ⚠️ PREMIER JET REFUSÉ EN REGARDANT LA PLANCHE : des
       RECTANGLES GRIS bien nets, qui se lisaient comme un bogue d'affichage et
       pas comme une chaussée rapiécée. Deux corrections, et la seconde est la
       vraie : un écart de teinte deux fois plus faible (une reprise est de
       l'enrobé, pas du béton), et un bord qui DÉRIVE — l'inset de chaque ligne
       suit une marche aléatoire au lieu d'être retiré au hasard, ce qui donne
       un contour continu et mou plutôt qu'une frange en dents de scie.
       ⚠️ Et on repose du granulat PAR-DESSUS (plus bas) : sans ça, la rustine
       reste une zone lisse au milieu d'un sol grenu, ce qui la redessine. */
    for (let p = 0; p < 4; p++) {
      const px0 = (r() * ROAD_N) | 0, py0 = (r() * ROAD_N) | 0;
      const pw = 11 + ((r() * 16) | 0), ph = 9 + ((r() * 13) | 0);
      const col = r() < 0.5 ? "#37383d" : "#414248";
      let a = 0, b = 0;
      for (let k = 0; k < ph; k++) {
        a += (r() < 0.5 ? 1 : -1) * (r() < 0.55 ? 1 : 0); b += (r() < 0.5 ? 1 : -1) * (r() < 0.55 ? 1 : 0);
        a = Math.max(-2, Math.min(2, a)); b = Math.max(-2, Math.min(2, b));
        roadWrap(g, px0 + a, py0 + k, pw + b - a, 1, col);
        roadWrap(g, px0 + a, py0 + k, 1, 1, "#2f3035");        // joint d'émulsion, côté gauche
        roadWrap(g, px0 + pw + b - 1, py0 + k, 1, 1, "#2f3035");
      }
      // Le granulat de la reprise, sinon elle reste une tache lisse.
      for (let i = 0; i < pw * ph / 7; i++) {
        roadWrap(g, px0 + ((r() * pw) | 0), py0 + ((r() * ph) | 0), 1, 1, r() < 0.3 ? "#575860" : "#33343a");
      }
    }
    // Les fissures : une marche aléatoire, jamais une droite.
    for (let f = 0; f < 7; f++) {
      let fx = (r() * ROAD_N) | 0, fy = (r() * ROAD_N) | 0;
      const horiz = r() < 0.55, len = 10 + ((r() * 26) | 0);
      for (let k = 0; k < len; k++) {
        roadWrap(g, fx, fy, 1, 1, "#2a2b2f");
        if (r() < 0.25) roadWrap(g, fx, fy + 1, 1, 1, "#4a4b52");   // la lèvre éclairée de la fissure
        if (horiz) { fx++; fy += r() < 0.22 ? (r() < 0.5 ? 1 : -1) : 0; }
        else { fy++; fx += r() < 0.22 ? (r() < 0.5 ? 1 : -1) : 0; }
        fx = ((fx % ROAD_N) + ROAD_N) % ROAD_N; fy = ((fy % ROAD_N) + ROAD_N) % ROAD_N;
      }
    }
    // Gravillon : le seul endroit où le bitume est clair.
    for (let i = 0; i < 90; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.3 ? "#6a6b73" : "#55565d");
    return c;
  }

  /* ------------------------------------------------------------ LES BRIQUES
     Référence « vent et pavés en brique » : une allée en appareil à demi-brique
     (running bond), chaude, très usée. La brique fait 8×4 avec son joint —
     deux par case et quatre rangs par case, donc le motif tombe juste sur 64
     dans les deux sens et le décalage d'un demi-module se répète tous les deux
     rangs. Rien à faire boucler ici : la géométrie est déjà périodique. C'est
     la COULEUR qui porte tout le travail (dix teintes, des briques cuites plus
     que les autres, des éclats, de la mousse au joint). */
  function townBrickSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x7c41);
    const JOINT = "#4d3a30";
    P(g, 0, 0, ROAD_N, ROAD_N, JOINT);
    for (let i = 0; i < 700; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#584338" : "#443129");
    /* Treize teintes de terre cuite, et c'est un minimum mesuré : à dix,
       `render-rues.mjs` comptait 37 couleurs sur l'ensemble du pavé, soit
       moins que les pavés gris — une allée de briques MOINS variée qu'une rue
       en pierre est un contresens, la brique est le matériau qui varie le
       plus d'une pièce à l'autre (four, argile, cuisson). */
    /* ⚠️ ET ELLES SONT ROMPUES, PAS ÉCARLATES. Premier jet : treize rouges vifs,
       et la planche donnait un MUR DE BRIQUE NEUF posé à plat — or c'est l'allée
       d'un cimetière, à l'ombre, foulée depuis cent ans. Chaque teinte est
       rabattue vers le brun-gris, et trois d'entre elles sont franchement
       délavées : ce sont ces trois-là, à raison d'une brique sur quatre, qui
       font la différence entre un pavage ancien et un échantillon de catalogue. */
    const BODY = ["#8d5443", "#82493c", "#96604c", "#764438", "#8a5140", "#9b6952", "#7e4c3e", "#905946", "#6d4a3e", "#a07358", "#856049", "#944f3f", "#725045"];
    const LIT = ["#a56b58", "#9a604f", "#ae7660", "#8e5a4b", "#a26855", "#b17e66", "#966253", "#a87059", "#835e50", "#b6886b", "#9c775d", "#aa6553", "#8a6659"];
    const DRK = ["#653c2f", "#5c3428", "#6e4535", "#523026", "#63392c", "#714b38", "#59372b", "#673f31", "#4d372d", "#78543e", "#5f4433", "#6a3729", "#523b32"];
    const BW = 8, BH = 4;                    // module brique + joint
    for (let row = 0; row * BH < ROAD_N; row++) {
      const y = row * BH;
      const off = (row % 2) ? BW / 2 : 0;    // appareil à demi-brique
      for (let col = -1; col * BW < ROAD_N; col++) {
        const x = col * BW + off;
        const k = (r() * BODY.length) | 0;
        const w = BW - 1, h = BH - 1;
        roadWrap(g, x, y, w, h, BODY[k]);
        roadWrap(g, x, y, w, 1, LIT[k]);                 // arête supérieure, éclairée
        roadWrap(g, x, y + h - 1, w, 1, DRK[k]);         // pied de brique, dans l'ombre du joint
        roadWrap(g, x + w - 1, y, 1, h, DRK[k]);
        // Usure : un éclat de coin, une brique fendue, une brique bien plus
        // cuite. Une brique sur cinq porte l'un des trois.
        const wear = r();
        if (wear < 0.10) { roadWrap(g, x + w - 1, y, 1, 1, JOINT); roadWrap(g, x + w - 2, y, 1, 1, JOINT); }
        else if (wear < 0.18) roadWrap(g, x + 2 + ((r() * 3) | 0), y + 1, 1, h - 1, DRK[k]);
        else if (wear < 0.24) roadWrap(g, x + 1, y + 1, w - 2, h - 2, "#6a4033");
        // Grain de terre cuite.
        for (let q = 0; q < 2; q++) roadWrap(g, x + ((r() * w) | 0), y + 1 + ((r() * (h - 1)) | 0), 1, 1, r() < 0.5 ? LIT[k] : DRK[k]);
      }
    }
    // Mousse dans les joints — une allée de cimetière est à l'ombre et peu
    // passante. C'est le seul vert du dessin, il porte donc tout le « lieu ».
    for (let i = 0; i < 70; i++) {
      const gx = (r() * ROAD_N) | 0, gy = ((r() * (ROAD_N / BH)) | 0) * BH + BH - 1;
      roadWrap(g, gx, gy, 1 + ((r() * 3) | 0), 1, r() < 0.6 ? "#57603f" : "#4a5236");
    }
    for (let i = 0; i < 30; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, "#6d5a44");   // sable
    return c;
  }

  /* --------------------------------------------------------- LES REBORDS
     « N'oublie pas les rebords gris comme sur la ref. » Une bordure de trottoir,
     et c'est elle qui transforme une bande de texture en RUE : sans elle, le
     pavé se termine dans l'herbe comme une nappe posée, exactement le défaut
     que le 425 avait déjà corrigé sur la place (§ « LA BORDURE »).

     ⚠️ ELLE EST DESSINÉE DEHORS, PAS DEDANS. Le rebord occupe les 4 px de la
     case CÔTÉ EXTÉRIEUR : sa face claire regarde l'herbe, son ombre tombe sur la
     chaussée, et le caniveau (deux pixels plus sombres) est du côté route. Une
     bordure symétrique n'aurait aucun relief.
     ⚠️ ET ELLE EST DÉBITÉE EN PIERRES DE TAILLE, tous les 8 px, avec un joint :
     une bordure d'un seul tenant sur trente cases se lit comme un trait de
     crayon. Le débit est calé sur la période du motif, donc il s'assemble avec
     lui.
     Les quatre orientations sont BAKÉES séparément : le faux canevas des bancs
     ignore `translate`/`rotate` (§4), donc une bordure obtenue par transformation
     serait invisible là où on veut la regarder. */
  function townKerbStrip(side, tone) {
    const horiz = (side === "n" || side === "s");
    const KW = 4;                                   // épaisseur de la bordure
    const [c, g] = cv(horiz ? ROAD_N : KW, horiz ? KW : ROAD_N);
    const r = makeRnd(side.charCodeAt(0) * 977 + tone.length);
    /* `u` = le long de la bordure, `v` = en travers, 0 étant TOUJOURS le côté
       extérieur. Une seule description géométrique pour les quatre côtés — deux
       auraient divergé au premier réglage (§8). */
    const put = (u, v, lu, lv, col) => {
      const vv = (side === "s" || side === "e") ? KW - v - lv : v;   // sud/est : l'extérieur est de l'autre bord
      if (horiz) P(g, u, vv, lu, lv, col); else P(g, vv, u, lv, lu, col);
    };
    const face = tone.face, top = tone.top, dark = tone.dark, gut = tone.gutter;
    put(0, 0, ROAD_N, KW, face);
    put(0, 0, ROAD_N, 1, top);                       // nez de bordure, éclairé
    put(0, KW - 1, ROAD_N, 1, gut);                  // caniveau, côté chaussée
    for (let u = 0; u < ROAD_N; u++) {               // grain de la pierre
      if (r() < 0.30) put(u, 1 + ((r() * (KW - 2)) | 0), 1, 1, r() < 0.5 ? top : dark);
    }
    /* Le débit en pierres de taille : un joint plein, une ombre à sa droite.
       ⚠️ LE JOINT PART DE `v = 1`, PAS DE `v = 0`, ET C'EST MESURÉ. Coupé sur
       toute l'épaisseur, il hachait le nez de bordure tous les huit pixels :
       `render-rues.mjs` ne trouvait plus que 7 px de gris clair d'affilée là où
       il en attend seize, et — c'est ça le vrai problème — le contrôle « aucun
       trottoir ne barre le carrefour » n'avait plus de quoi distinguer un nez
       de bordure d'un simple biseau de pavé. Un nez continu est de toute façon
       la bonne lecture en pixel art : c'est l'arête qui accroche la lumière,
       le joint se lit en dessous. */
    for (let u = 0; u < ROAD_N; u += 8) {
      put(u, 1, 1, KW - 1, dark);
      put(u + 1, 1, 1, KW - 2, tone.faceAlt);
    }
    return c;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 436 — LES ESCALIERS ET LES FALAISES DE LA HAUTE-VILLE.
     ─────────────────────────────────────────────────────────────────────────
     Retour de Guillaume, mot pour mot : « corrige les écarts entre le détail
     du sol pavé et les escaliers du courthouse/uppertown. Il y a un écart
     flagrant de qualité de textures. »

     ⚠️⚠️ ET LA CAUSE DE L'ÉCART N'EST PAS UN MANQUE DE SOIN, C'EST UN MANQUE
     DE BANC — c'est-à-dire, encore, le piège n°1 du projet. Les revêtements du
     434 vivent ici, dans `fermeArt`, donc `tools/render-rues.mjs` les REGARDE
     à chaque lancement : ils ont eu droit à quatre refus avant livraison. Les
     marches, elles, étaient écrites DANS LA BOUCLE DE RENDU de FermeGame —
     `fillRect(px, py, T, T)` gris uni + quatre traits blancs et quatre traits
     noirs, tous les 4 px, identiques sur toutes les cases de toutes les
     volées. Personne ne pouvait les voir sans jouer, donc personne ne les a
     vues. La falaise, juste en dessous, était un aplat `#8f8a80` avec une
     ligne tous les 5 px et UN joint vertical par case : le « rondin » de
     l'hôtel de ville du 433, exactement, mais en gris.
     **On ne corrige donc pas seulement le dessin : on le SORT de la closure.**

     ⚠️ MÊME MÉTHODE QU'AU 434, ET C'EST VOULU : un pavé de 4×4 tuiles qui
     boucle sur lui-même (`roadWrap`), découpé par `x % 4`, `y % 4`. Une volée
     de six cases cesse d'être six fois la même image. Tout est en `fillRect`,
     donc `tools/render-escaliers.mjs` peut le rastériser (§4).
     ⚠️ LES MARCHES GARDENT LEUR PÉRIODE DE 4 px, ET CE N'EST PAS NÉGOCIABLE :
     c'est la seule chose qui dise au joueur « ça monte », et le pas de la
     grille d'altitude en dépend. Ce qui change, c'est que deux marches ne sont
     plus le même dessin. */
  /* ⚠️⚠️⚠️ ZIP 447 — UNE CASE, UNE MARCHE. C'était 4 px, donc QUATRE nez de
     marche peints dans une case qui ne monte réellement que d'une seule marche.
     Le dessin promettait quatre marches, l'altitude en tenait une : à l'écran,
     une volée devenait une texture rayée posée à plat — exactement ce que
     Guillaume a nommé « condensé et plaqué en 2D », et aucun banc ne pouvait le
     dire, puisqu'ils comptaient les nez SANS jamais les comparer au relief.
     ⚠️ LA MARCHE DESSINÉE DOIT ÊTRE LA MARCHE FRANCHIE. À 16, le giron est la
     case, et la contremarche n'est plus peinte du tout : c'est le dénivelé
     réel, dessiné par le parement (`drawTownCliffFace`), qui la fournit — 9,6 px
     pour un pas de 0,2. Le dessin ne peut donc plus mentir sur la pente, il la
     SUIT. C'est la même idée que « la case d'un décor n'est pas sa surface »
     (§4), retournée : ici on force le dessin à coïncider avec la grandeur
     physique, parce que c'est justement celle que l'œil compare. */
  const STAIR_TREAD = 16;                // giron d'une marche = une case
  function townStairSurface(vertical) {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(vertical ? 0x3f21 : 0x3f22);
    /* `put` échange les deux axes pour la volée horizontale. Une seule
       description géométrique — deux auraient divergé au premier réglage (§8),
       et c'est précisément ce qui est arrivé aux deux dessins de voie ferrée
       du 427. */
    /* ⚠️ `u` COURT TOUJOURS DANS LE SENS DE LA MONTÉE, `v` EN TRAVERS. Pour une
       volée qui monte vers le nord (`vertical`), `u` est donc l'axe Y et les
       nez de marche sont des RANGÉES ; pour une volée est-ouest, l'inverse. Le
       bouclage se fait sur `v` (le travers), parce que c'est le seul axe qu'on
       ait le droit de décaler : le pas de 4 px des marches doit rester calé sur
       la case, sinon la grille d'altitude et le dessin divergent.
       ⚠️ La première écriture de ce zip avait les deux axes ÉCHANGÉS, et rien
       ne l'a signalé — l'atlas bouclait, la matière était riche, les cases
       différaient : trois contrôles verts sur un escalier dont les marches
       étaient perpendiculaires à la montée. C'est le contrôle « seize nez de
       marche » qui l'a attrapé, et lui seul. */
    const put = (u, v, lu, lv, col) => {
      if (vertical) { P(g, v - ROAD_N, u, lv, lu, col); P(g, v, u, lv, lu, col); P(g, v + ROAD_N, u, lv, lu, col); }
      else { P(g, u, v - ROAD_N, lu, lv, col); P(g, u, v, lu, lv, col); P(g, u, v + ROAD_N, lu, lv, col); }
    };
    const BODY = ["#a6a49b", "#aeaca3", "#9e9c93", "#b2b0a6", "#a2a097", "#aaa89f", "#9a988f", "#b0aea4"];
    const NOSE = ["#cfccc1", "#d6d3c8", "#c7c4b9", "#d2cfc4"];       // le nez, qui accroche la lumière
    const RISE = ["#5f5c55", "#67645c", "#585550"];                  // la contremarche, dans l'ombre
    const MOSS = ["#5a6b42", "#4d5c39"];
    /* Les deux tons de l'ombre portée : elle ne se fait pas en alpha (à cette
       échelle un voile gris fait une auréole sale, §8), mais avec des pierres
       plus sombres de la même famille. */
    const SHAD = ["#7d7b74", "#8d8b83"];
    // Fond : de la pierre, pas un gris uni. C'est ce que le granulat du
    // goudron a appris au 434 — à 16 px, la matière tient dans le grain.
    for (let v = 0; v < ROAD_N; v++) for (let u = 0; u < ROAD_N; u++) {
      if (r() < 0.5) put(u, v, 1, 1, BODY[(r() * BODY.length) | 0]);
    }
    for (let s = 0; s * STAIR_TREAD < ROAD_N; s++) {
      const u = s * STAIR_TREAD;
      /* ⚠️ LE DALLAGE DE LA MARCHE EST DÉCOUPÉ EN BLOCS DE LARGEUR INÉGALE, et
         c'est ce qui distingue un escalier de pierre d'un escalier de béton.
         Les coupes de deux marches consécutives ne tombent jamais au même
         endroit : `roadSplit` s'en charge, et le décalage de départ aussi. */
      const n = 3 + ((r() * 3) | 0);
      const ws = roadSplit(ROAD_N, n, r, [9, 26]);
      let v0 = (r() * ROAD_N) | 0;
      for (let k = 0; k < n; k++) {
        const w = ws[k], tone = BODY[(r() * BODY.length) | 0];
        put(u + 1, v0, STAIR_TREAD - 1, w, tone);
        /* ⚠️⚠️ ZIP 447 — L'OMBRE QUE LA MARCHE DU DESSUS PORTE SUR CELLE-CI, et
           c'est LE signal de relief d'un escalier vu de dessus. Sans elle, un
           giron est un rectangle clair : rien ne dit qu'il y a une marche
           au-dessus de lui, et l'œil lit une dalle. Trois pixels au BORD AMONT,
           dégradés en deux tons — c'est la même leçon qu'au 446 sur le cratère
           (« ce qui creuse une image vue de dessus est l'ÉCLAIRAGE d'une pente,
           pas un dégradé »), appliquée à une arête au lieu d'une pente.
           ⚠️ Elle est posée AVANT le grain et les joints, pour qu'ils passent
           par-dessus : une ombre par-dessus le grain aplatit la matière. */
        put(u + 1, v0, 2, w, SHAD[0]);
        put(u + 3, v0, 1, w, SHAD[1]);
        // le joint de refend entre deux blocs de la même marche
        put(u + 1, v0, STAIR_TREAD - 1, 1, "#6e6b64");
        v0 = (v0 + w) % ROAD_N;
      }
      // LE NEZ ET LA CONTREMARCHE. Le nez est ÉBRÉCHÉ par endroits : une arête
      // parfaitement continue sur six cases se lit comme une règle posée là.
      const nose = NOSE[(r() * NOSE.length) | 0];
      let v = 0;
      while (v < ROAD_N) {
        const len = 5 + ((r() * 14) | 0);
        if (r() < 0.86) put(u, v, 1, Math.min(len, ROAD_N - v), nose);
        else put(u, v, 1, Math.min(len, ROAD_N - v), BODY[(r() * BODY.length) | 0]);   // éclat
        v += len;
      }
      put(u + STAIR_TREAD - 1, 0, 1, ROAD_N, RISE[(r() * RISE.length) | 0]);
      // ⚠️ L'OMBRE PORTÉE DE LA MARCHE DU DESSUS, un pixel sous le nez. Sans
      // elle les marches sont des rayures ; avec elle, elles ont une épaisseur.
      put(u + 1, 0, 1, ROAD_N, "rgba(58,54,48,0.30)");
    }
    // La mousse dans les angles rentrants, et l'usure au milieu de la volée :
    // une volée de cent ans est creusée là où l'on marche, pas au bord.
    for (let k = 0; k < 90; k++) {
      const u = (r() * ROAD_N) | 0, v = (r() * ROAD_N) | 0;
      if ((u % STAIR_TREAD) !== STAIR_TREAD - 1) continue;
      put(u, v, 1, 1 + ((r() * 2) | 0), MOSS[(r() * MOSS.length) | 0]);
    }
    for (let k = 0; k < 130; k++) {
      const u = (r() * ROAD_N) | 0, v = 16 + ((r() * 32) | 0);
      if ((u % STAIR_TREAD) === 0) continue;
      put(u, v, 1, 1, r() < 0.5 ? "#98968e" : "#b6b4aa");
    }
    return c;
  }

  /* LE PAREMENT DE FALAISE — le mur qui bouche le décrochement d'altitude.
     ⚠️ CE QUI FAIT LA PIERRE APPAREILLÉE N'EST PAS LA LIGNE D'ASSISE, C'EST
     L'ALTERNANCE DES JOINTS VERTICAUX. C'est le mot pour mot de la leçon de
     l'hôtel de ville au 433 (« la brique n'était pas de la brique, c'était du
     rondin ») : le 425 dessinait ici une ligne sombre pleine largeur tous les
     5 px et UN joint vertical par case, toujours au même endroit. Six cases de
     falaise côte à côte donnaient six fois le même mur.
     ⚠️ Il boucle horizontalement (`roadWrap`) mais PAS verticalement, et c'est
     exprès : une falaise a un HAUT (le nez éclairé) et un BAS (l'ombre au
     pied). On y découpe donc la hauteur qu'on a, depuis le haut. */
  const CLIFF_H = 40;                    // deux unités d'altitude valent 32 px ; on garde de la marge
  function townCliffFace() {
    const [c, g] = cv(ROAD_N, CLIFF_H), r = makeRnd(0x77b3);
    /* ⚠️ DOUZE CORPS, SIX ÉCLAIRÉS, SIX SOMBRES — et c'est le banc qui a fixé le
       nombre. À six corps, `render-escaliers.mjs` comptait 15 teintes contre 42
       aux pavés de rue : la falaise passait le contrôle de relief et échouait
       celui de palette, ce qui est la définition d'un mur en carton peint. */
    const BODY = ["#8d8880", "#948f86", "#847f78", "#9a958b", "#89847d", "#918c83",
                  "#8f8a7c", "#96918a", "#807b74", "#9d988e", "#8b867f", "#959087"];
    const LIT = ["#aaa59b", "#b1aca1", "#a19c93", "#b5b0a5", "#a6a197", "#ada89e", "#b8b3a8", "#a4a095"];
    const DRK = ["#5d5952", "#655f58", "#56524c", "#615c55", "#59554f", "#6a645c", "#514d48", "#6e6860"];
    const JOINT = "#3a3833";                     // ⚠️ assombri au 436 : c'est le joint qui porte l'écart de valeur du parement
    P(g, 0, 0, ROAD_N, CLIFF_H, JOINT);
    const ROWH = [6, 7, 6, 7, 7, 7];                 // 40 = 6+7+6+7+7+7, pas un pixel de reste
    let y = 0;
    for (let row = 0; row < ROWH.length; row++) {
      const rh = ROWH[row];
      const n = 4 + ((r() * 3) | 0);
      const ws = roadSplit(ROAD_N, n, r, [8, 22]);
      // ⚠️ LE DÉCALAGE DE DÉPART EST TIRÉ À CHAQUE ASSISE : c'est LUI qui fait
      // que les joints verticaux ne s'alignent jamais d'une assise à l'autre.
      let x = (r() * ROAD_N) | 0;
      for (let s = 0; s < n; s++) {
        const w = ws[s], k = (r() * BODY.length) | 0;
        roadWrap(g, x, y, w - 1, rh - 1, BODY[k]);
        roadWrap(g, x, y, w - 1, 1, LIT[(r() * LIT.length) | 0]);          // lit d'attente, éclairé
        roadWrap(g, x, y + rh - 2, w - 1, 1, DRK[(r() * DRK.length) | 0]); // sous-face, dans l'ombre
        // Bossage : une pierre sur cinq est légèrement saillante, une sur dix
        // franchement plus sombre (la pierre de remploi).
        if (r() < 0.20) roadWrap(g, x + 1, y + 1, w - 3, rh - 3, LIT[(r() * LIT.length) | 0]);
        else if (r() < 0.16) roadWrap(g, x + 1, y + 1, w - 3, rh - 3, DRK[(r() * DRK.length) | 0]);
        else if (r() < 0.10) roadWrap(g, x + 1, y + 1, w - 3, rh - 3, "#4b4740");   // la pierre en creux, mangée par l'humidité
        for (let q = 0; q < 3; q++) roadWrap(g, x + ((r() * w) | 0), y + ((r() * rh) | 0), 1, 1, r() < 0.5 ? LIT[0] : DRK[0]);
        x = (x + w) % ROAD_N;
      }
      y += rh;
    }
    // Suintement et mousse le long des joints — une falaise de parc n'est pas
    // un mur de soutènement neuf.
    for (let k = 0; k < 70; k++) {
      const x = (r() * ROAD_N) | 0, y2 = (r() * (CLIFF_H - 4)) | 0;
      roadWrap(g, x, y2, 1, 2 + ((r() * 3) | 0), r() < 0.55 ? "#4f5c3c" : "#6a6558");
    }
    return c;
  }

  /* LE LIMON — la joue de pierre qui borde une volée. Il existe depuis le 425
     parce qu'il RÉSOUT UN MUR INVISIBLE (le flanc d'un escalier bloque sans
     rien montrer) ; il n'avait jamais reçu de dessin, juste trois `fillRect`.
     Une seule bande verticale de 64 px, bouclante, découpée par `y % 4`. */
  function townStairCheek() {
    const [c, g] = cv(4, ROAD_N), r = makeRnd(0x1c4e);
    const wrapV = (x, y, w, h, col) => { P(g, x, y - ROAD_N, w, h, col); P(g, x, y, w, h, col); P(g, x, y + ROAD_N, w, h, col); };
    /* ⚠️ LE JOINT SOMBRE ENTRE DEUX PIERRES EST OBLIGATOIRE, et ce n'est pas du
       détail : c'est lui qui porte tout l'écart de valeur. Sans lui le limon
       mesurait un écart-type de 29 contre 46 aux pavés de rue — un ruban gris
       à côté d'un pavage, exactement l'écart que ce zip corrige ailleurs. */
    wrapV(0, 0, 4, ROAD_N, "#43403a");               // le fond EST le joint
    let y = 0;
    while (y < ROAD_N) {
      const h = 6 + ((r() * 4) | 0);
      wrapV(0, y, 4, h - 1, ["#948f86", "#8a857e", "#9c978d", "#8f8a80", "#a09b91"][(r() * 5) | 0]);
      wrapV(0, y, 3, 1, "#c8c3b7");                  // le dessus du limon prend la lumière
      wrapV(3, y, 1, h - 1, "#57534d");              // et son flanc est dans l'ombre
      y += h;
    }
    for (let k = 0; k < 30; k++) wrapV((r() * 4) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#b0aba1" : "#615d57");
    return c;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 436 — LE DALLAGE DES ESPLANADES : LE DERNIER DAMIER DE LA VILLE.
     ─────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ IL EST DANS LE MÊME SAC QUE LES MARCHES, ET POUR LA MÊME RAISON. Le
     parvis du tribunal, la terrasse de la Haute-Ville, la place, les cinq
     parvis, le champ de foire et le quai de gare sont tous du `G_PATH_STONE`,
     et il était peint dans la closure du rendu depuis le 425 : `(x + y) % 2`
     entre deux gris, plus un joint clair au nord-ouest. C'est-à-dire **un
     damier de période 16 px**, exactement le défaut que le 434 a corrigé sur
     les rues — et il occupe la surface qui ENTOURE les escaliers du tribunal.
     Quand Guillaume écrit « il y a un écart flagrant de qualité de textures »
     entre le sol pavé et les escaliers du courthouse, les deux tiers de ce
     qu'il regarde sont ce damier-ci : la volée neuve arrivait sur lui.

     ⚠️ MÊME MÉTHODE, TROISIÈME FOIS : un pavé de 4×4 tuiles qui boucle
     (`roadWrap`), découpé par `x % 4`. Mais la MATIÈRE est délibérément autre
     que celle des rues — de grandes dalles rectangulaires appareillées, pas des
     pavés ronds. Une place n'est pas une chaussée (c'est déjà l'argument du 434
     pour que le goudron s'arrête à ses quatre bords), et deux sols qui se
     touchent doivent se DISTINGUER, sinon on a fait du travail pour rien. */
  function townFlagSurface() {
    const [c, g] = cv(ROAD_N, ROAD_N), r = makeRnd(0x2c8f);
    /* ⚠️ LE JOINT EST SOMBRE, ET C'EST LUI QUI PORTE TOUT L'ÉCART DE VALEUR.
       Premier jet à `#7d7b76` : `render-escaliers.mjs` mesurait un écart-type de
       23,0 contre 45,8 aux pavés de rue — le dallage neuf était deux fois plus
       plat que ce qu'il devait égaler, c'est-à-dire qu'on venait de refaire le
       défaut qu'on corrigeait. Un joint de dalle est une RAINURE : à 16 px, une
       rainure est sombre. */
    const JOINT = "#5c5a56";
    P(g, 0, 0, ROAD_N, ROAD_N, JOINT);
    for (let i = 0; i < 700; i++) P(g, (r() * ROAD_N) | 0, (r() * ROAD_N) | 0, 1, 1, r() < 0.5 ? "#6a6863" : "#4e4c49");
    /* ⚠️ LA PLAGE DE TEINTES DES DALLES EST LARGE, ET C'EST LA CORRECTION QUE
       LE BANC A IMPOSÉE. Avec douze gris tous à ±5 de luminance, la place
       mesurait un écart-type de 28,7 contre 45,8 aux pavés : chaque dalle était
       jolie et l'ENSEMBLE était un aplat, parce qu'une place est faite de peu
       de grandes pierres et que sa matière tient donc dans l'écart d'une pierre
       À L'AUTRE, pas dans le grain de chacune. C'est l'inverse exact du
       goudron du 434 (un seul matériau, la richesse dans le grain) — et c'est
       pour ça qu'on ne peut pas recopier le réglage d'une surface sur une
       autre. Seize teintes, de `#9a988f` à `#c8c6bd`. */
    const BODY = ["#b0aea6", "#b7b5ad", "#a9a79f", "#c2c0b7", "#adaba3", "#b4b2aa", "#9e9c95", "#bcbab2",
                  "#a3a199", "#c8c6bd", "#a7a59d", "#b8b6ac", "#9a988f", "#c5c3ba", "#aba9a1", "#bfbdb4"];
    const LIT = ["#cfcdc4", "#d5d3ca", "#c9c7be", "#d2d0c7", "#dad8cf", "#cccac1"];
    const DRK = ["#8d8b85", "#93918b", "#878580", "#908e88", "#82807b", "#98968f"];
    /* ⚠️ TROIS RANGS DE 21 ou 22 px, pas quatre de 16 : une DALLE est plus
       grande qu'une case, sinon on redessine la grille avec des joints. 64 =
       21 + 21 + 22, pas un pixel de reste (c'est ce qui garantit le bouclage). */
    const ROWH = [21, 21, 22];
    let y = 0;
    for (const rh of ROWH) {
      const n = 3 + ((r() * 2) | 0);                 // 3 ou 4 dalles par rang
      const ws = roadSplit(ROAD_N, n, r, [13, 28]);
      let x = (r() * ROAD_N) | 0;                    // le rang est décalé : aucun joint continu
      for (let s = 0; s < n; s++) {
        const w = ws[s], k = (r() * BODY.length) | 0;
        roadWrap(g, x, y, w - 1, rh - 1, BODY[k]);
        roadWrap(g, x, y, w - 1, 1, LIT[(r() * LIT.length) | 0]);        // arête nord, éclairée
        roadWrap(g, x, y, 1, rh - 1, LIT[(r() * LIT.length) | 0]);       // arête ouest
        roadWrap(g, x, y + rh - 2, w - 1, 1, DRK[(r() * DRK.length) | 0]);
        roadWrap(g, x + w - 2, y, 1, rh - 1, DRK[(r() * DRK.length) | 0]);
        /* ⚠️ UNE DALLE SUR SIX EST FÊLÉE, ET C'EST CE QUI EMPÊCHE LA PLACE
           D'AVOIR L'AIR IMPRIMÉE (le mot du 425). Une fêlure est une ligne
           BRISÉE : droite, elle se lit comme un joint qu'on aurait oublié. */
        /* ⚠️⚠️ ZIP 439 — ELLE A ÉTÉ REFAITE, ET C'EST UN DÉFAUT VU EN JEU, PAS
           AU BANC. Le tracé du 436 partait du HAUT de la dalle et descendait sur
           toute sa hauteur en zigzaguant d'un pixel une fois sur deux, en
           `#8c8a84` — soit un écart de vingt-cinq valeurs avec le corps de la
           dalle. Résultat à l'échelle de jeu : un trait sombre, long, anguleux,
           parfaitement lisible… comme un CHEVRON DESSINÉ sur la pierre. Sur la
           promenade du lac, où les dalles sont grandes et pâles, on voyait des
           « < » régulièrement semés le long du quai. Aucune planche de banc ne
           pouvait le dire : elles montrent la texture agrandie, où le zigzag
           ressemble bien à une fêlure — c'est à 100 % de zoom, et seulement là,
           qu'il devient un signe.
           Trois corrections, et les trois comptent :
             — elle ne traverse plus la dalle : deux tiers de hauteur au plus,
               et jamais depuis le bord (une fêlure qui va d'un joint à l'autre
               EST un joint) ;
             — elle est deux fois moins contrastée (`#a3a19a`), donc elle se
               devine au lieu de se lire ;
             — elle dévie d'un pixel au plus DEUX fois, et toujours du même
               côté : un zigzag alterné dessine une dent de scie, c'est-à-dire
               une forme, et une fêlure n'en a pas. */
        if (r() < 0.17) {
          const len = 3 + ((r() * (rh - 8)) | 0);
          let fx = x + 3 + ((r() * (w - 6)) | 0);
          const fy = y + 2 + ((r() * (rh - 4 - len)) | 0), turn = r() < 0.5 ? -1 : 1;
          let jogs = 0;
          for (let q = 0; q < len; q++) {
            roadWrap(g, fx, fy + q, 1, 1, "#a3a19a");
            if (jogs < 2 && r() < 0.35) { fx += turn; jogs++; }
          }
        }
        for (let q = 0; q < 9; q++) roadWrap(g, x + 1 + ((r() * (w - 2)) | 0), y + 1 + ((r() * (rh - 2)) | 0), 1, 1 + ((r() * 2) | 0), r() < 0.5 ? LIT[(r() * LIT.length) | 0] : DRK[(r() * DRK.length) | 0]);
        /* Une dalle sur huit est FRANCHEMENT plus sombre — celle qu'on a
           remplacée, ou celle qui garde l'eau. Sans cette minorité, une place
           est un aplat très détaillé, ce qui n'est pas la même chose qu'une
           place. C'est le même argument que la minorité de pierres chaudes des
           pavés de rue (434). */
        /* ⚠️⚠️ ZIP 439 — CES DEUX FRÉQUENCES ONT MONTÉ (0,13→0,20 et
           0,08→0,14), ET C'EST UNE COMPENSATION ASSUMÉE. La fêlure du 436
           portait à elle seule une part de la « matière » mesurée par
           `render-escaliers.mjs` ; en la rendant discrète (elle se lisait comme
           un chevron dessiné, voir sa note), l'écart-type du dallage est tombé
           de ×3,3 à ×2,9 du damier de 425 et le contrôle a échoué.
           ⚠️ ON N'A PAS DESSERRÉ LE SEUIL, ET ON N'A PAS REMIS LA FÊLURE : on a
           rendu la matière PAR OÙ ELLE DOIT VENIR. La note de `BODY` le dit
           trois lignes plus haut — une place est faite de PEU DE GRANDES
           PIERRES, donc sa matière tient dans l'écart d'une pierre À L'AUTRE et
           non dans le grain de chacune. Une dalle sur cinq franchement plus
           sombre et une sur sept franchement plus claire, c'est exactement ça ;
           du grain en plus aurait rattrapé le chiffre en trahissant la règle. */
        if (r() < 0.20) roadWrap(g, x + 1, y + 1, w - 3, rh - 3, "#98968f");
        else if (r() < 0.14) roadWrap(g, x + 1, y + 1, w - 3, rh - 3, "#c4c2b9");
        // Mousse dans les joints, côté sud de la dalle — là où l'eau stagne.
        if (r() < 0.4) roadWrap(g, x + 2 + ((r() * (w - 5)) | 0), y + rh - 2, 2 + ((r() * 3) | 0), 1, "#6b7355");
        x = (x + w) % ROAD_N;
      }
      y += rh;
    }
    return c;
  }

  const KERB_STONE = { face: "#a8a69e", top: "#c6c4bb", dark: "#6f6d67", faceAlt: "#b2b0a7", gutter: "#5d5b58" };
  const KERB_BRICK = { face: "#8f5a44", top: "#b07a5e", dark: "#5f3a2c", faceAlt: "#9c6650", gutter: "#4d3a30" };

  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 435 — L'EAU DE VALLEY TOWN : LE TRAIT D'EAU QUITTE LA GRILLE.
     ─────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ CE QU'ON REMPLACE, ET POURQUOI CE N'EST PAS UN PROBLÈME DE COULEUR :
     `ctx.fillStyle = "#3f7fd0"; ctx.fillRect(px, py, T, T)`. Une case est de
     l'eau ou ne l'est pas, donc le trait d'eau SUIT LA GRILLE, donc le rivage
     est un escalier de 16 px — et il le reste quelle que soit la finesse du
     contour qu'on dessine dans le générateur. Mesuré au 434 : 57 % des arêtes
     eau/terre de la ville sont un contact herbe→eau sans un pixel de
     transition. **C'est la géométrie du DESSIN qu'il faut casser, pas celle de
     la carte.**

     ⚠️ LA MÉTHODE : LES CARRÉS MARCHEURS SUR LES COINS, PAS SUR LES CASES.
     Chaque COIN de case vaut « eau » ou « terre » ; le trait d'eau est
     l'isocontour bilinéaire entre les quatre coins de la case. Trois propriétés
     tombent gratuitement, et ce sont les trois qu'on cherchait :
       — il est CONTINU d'une case à l'autre (deux cases voisines partagent
         leurs deux coins, donc le trait se raccorde exactement — aucune couture
         possible, ce que quatre tuiles de rive dessinées à la main n'auraient
         jamais garanti) ;
       — il est COURBE : l'isocontour d'une bilinéaire est une hyperbole, donc
         un angle de rive se lit arrondi, jamais en biseau à 45° ;
       — il TRAVERSE les cases, donc l'escalier disparaît.

     ⚠️⚠️ ET LE COIN AMBIGU EST TIRÉ AU SORT — C'EST LUI QUI FAIT LE NATUREL.
     Un coin dont deux cellules sur quatre sont de l'eau (c'est le cas de TOUS
     les coins le long d'une rive droite) n'a pas de bonne réponse : on la tire
     d'un hachage de ses coordonnées MONDE. Le tirage est donc le même pour les
     quatre cases qui se partagent ce coin — pas de fissure — et il est le même
     chez les deux joueurs, sans rien diffuser. Effet : le long d'une rive
     parfaitement droite dans les données, le trait d'eau ondule d'une
     demi-case, au hasard mais toujours au même endroit. **Sans ce tirage, la
     méthode entière rendrait une rive droite… droite.**

     ⚠️ LES SEIZE CONFIGURATIONS SONT BAKÉES, ET C'EST LA SEULE FAÇON DE
     S'OFFRIR ÇA À 60 IMAGES/S : évaluer la bilinéaire par pixel coûterait 256
     tests × toutes les cases d'eau visibles, à chaque image. On cuit
     16 configurations × 2 variantes × 6 profondeurs = 192 tuiles de 16 px une
     fois pour toutes, et le rendu ne fait qu'un `drawImage`. C'est le même
     raisonnement que les revêtements du 434.
     ⚠️ LA VARIANTE N'EST PAS UN CAPRICE : la bosse qui déforme le seuil vaut
     ZÉRO SUR LES QUATRE BORDS de la case (`16·u(1−u)·v(1−v)`), donc elle
     gondole l'intérieur du trait SANS déplacer ses points de sortie. Une
     variante bombe, l'autre creuse. Déformer le seuil d'une constante aurait
     décollé le trait de celui du voisin — une fissure d'un pixel tout autour
     du lac, invisible à la relecture et hurlante en jeu. */
  /* ⚠️⚠️ ZIP 436 — HUIT CRANS NE SUFFISAIENT PAS, ET LE CALCUL LE DIT. Le
     plateau fait 1,5 case (TOWN_WATER_SHELF) : à huit crans, deux cases
     voisines sautent CINQ crans, et une interpolation entre deux valeurs
     distantes de cinq n'a que trois teintes à offrir sur seize pixels. Le
     tramage rendait donc encore des plaques. Seize crans ramènent le saut à
     deux ou trois, ce qui est exactement ce qu'un tramage sait dissoudre.
     C'est le coût qu'on paye : 16 × 2 × 16 = 512 tuiles de 16 px, cuites une
     fois. */
  const WAT_CFG = 16, WAT_VAR = 2, WAT_DEPTH = 16;
  /* La rampe de profondeur. ⚠️ ELLE CHANGE DE TEINTE, PAS SEULEMENT DE VALEUR :
     un haut-fond est vaseux et vert, le large est bleu et sourd. Une simple
     rampe de luminance sur un seul bleu aurait rendu un dégradé de peinture,
     pas de l'eau — c'est la fausse piste mesurée en §8 (« la sortie est dans la
     VALEUR » vaut pour le mélange, pas pour la teinte d'un fond vu à travers). */
  /* ⚠️⚠️ ET ELLE PLONGE VITE. Premier jet : huit crans étalés régulièrement du
     gris-vert au bleu sombre, sur un plateau de 3,5 cases — regardé sur
     `render-eau.mjs`, l'étang était un anneau BLANC de deux cases autour d'une
     tache bleue. La moitié claire d'une rampe régulière occupe la moitié de la
     surface, et sur une mare de quatre cases de rayon, c'est tout le bord. Un
     haut-fond se voit sur une case, pas sur trois : les deux premiers crans
     seuls sont pâles, le reste est du bleu. */
  /* ⚠️⚠️ ZIP 436 — LA RAMPE EST DÉRIVÉE DE CINQ REPÈRES, PLUS ÉCRITE CRAN PAR
     CRAN. Deux raisons, et la seconde est la vraie :
       — à seize crans, une liste écrite à la main est seize chances de poser
         une teinte qui ne suit pas la courbe, et c'est le §8 de CLAUDE.md (un
         paramètre qui en double un autre doit être DÉRIVÉ) ;
       — le nombre de crans peut désormais changer sans retoucher une couleur.
     ⚠️ ET LES REPÈRES ONT ÉTÉ RABATTUS. Ceux du 435 partaient de `#8fb9bd`, un
     turquoise presque blanc : sur `eau-etang.png`, le haut-fond formait un
     ANNEAU LAITEUX qui se lisait comme de la glace, pas comme de l'eau peu
     profonde. Une eau claire vue de dessus prend la couleur du FOND (vase
     grise, galets), pas celle du ciel — c'est le bleu qui arrive avec la
     profondeur, quand le fond disparaît. */
  const WAT_STOPS = ["#93aeb0", "#6e94ac", "#4a7ba8", "#356293", "#234771", "#183355"];
  const WAT_RAMP = (() => {
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const st = WAT_STOPS.map(hex), out = [];
    for (let k = 0; k < WAT_DEPTH; k++) {
      const t = (k / (WAT_DEPTH - 1)) * (st.length - 1);
      const a = Math.min(st.length - 1, t | 0), b = Math.min(st.length - 1, a + 1), f = t - a;
      const ch = (j) => Math.round(st[a][j] + (st[b][j] - st[a][j]) * f);
      out.push(`rgb(${ch(0)},${ch(1)},${ch(2)})`);
    }
    return out;
  })();
  const WAT_FOAM = "#cfe4e8";      // le liseré clair au ras de la rive, côté lumière
  const WAT_SHADE = "#1b3d63";     // l'ombre portée de la berge, côté nord-ouest

  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 436 — LA PROFONDEUR CESSE D'ÊTRE UN ESCALIER DE CARRÉS.
     ─────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ CE QUE LE 435 A LAISSÉ PASSER, ET SON BANC AVEC LUI. `render-eau.mjs`
     mesurait la profondeur en comparant la LUMINANCE DU BORD À CELLE DU LARGE
     (L 151 contre 54) : il disait donc « la profondeur se voit », ce qui était
     vrai, pendant que l'étang rendait une MOSAÏQUE DE CARRÉS de 16 px de bleus
     différents. C'est le §14.6 de CLAUDE.md pris en flagrant délit — un banc
     qui passe ne dit pas que la chose est bonne, il dit qu'on mesure autre
     chose. La grandeur qui manquait est le CONTRASTE D'UNE ARÊTE DE CASE
     comparé au contraste à l'intérieur d'une case : si les cases se voient,
     c'est que le premier est plus grand.
     Le 435 fondait déjà, par deux bandes de 5 px sur l'axe dominant. Deux
     raisons pour lesquelles ça ne suffisait pas :
       — une bande est un RECTANGLE : trois marches au lieu d'une, mais toujours
         des marches, et toujours alignées sur la grille ;
       — un seul axe : une case qui a un voisin plus profond au nord ET à l'est
         n'en fondait qu'un, l'autre gardait son arête franche.
     ⚠️ LA PARADE EST UN TRAMAGE STOCHASTIQUE, PAS UN VOILE ALPHA. Chaque pixel
     prend la couleur d'UN cran — le sien ou celui d'un voisin — avec une
     probabilité qui décroît linéairement en s'éloignant de ce voisin. En
     espérance, c'est exactement l'interpolation bilinéaire de la profondeur ;
     en pixels, c'est du grain, c'est-à-dire la matière que l'eau a déjà. Et
     comme chaque pixel est OPAQUE, les quatre côtés peuvent être servis d'un
     coup : deux tramages qui se superposent ne fabriquent pas de troisième
     teinte, contrairement à deux voiles alpha (le tissu écossais du 435).
     ⚠️ On tramage vers le cran MOYEN (d + voisin)/2, pas vers le cran du
     voisin : le voisin fera de même de son côté, et les deux moitiés se
     rejoignent sur la même valeur au milieu de l'arête. Trame vers le voisin
     lui-même, on doublerait la marche au lieu de la diviser.
     ⚠️ RÉSERVÉ À LA PLEINE EAU (cfg 15). Sur une case de rive, le contour
     occupe moins d'une demi-case et le tramage déborderait sur l'herbe — la
     grille qu'on vient de casser, redessinée en bleu. */
  const WAT_FADE_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   // O, E, N, S
  function townWaterFadeTile(dir, d) {
    const [c, g] = cv(T, T);
    const [dx, dy] = WAT_FADE_DIRS[dir];
    /* ⚠️ LA GRAINE NE DÉPEND NI DE `d` NI DE `dir`. Les quatre tramages d'une
       même case doivent viser les MÊMES pixels : sinon un pixel peut être
       servi par l'ouest puis recouvert par l'est, et la densité effective ne
       vaut plus la probabilité qu'on a calculée. Avec une graine commune, les
       tirages sont corrélés et chaque pixel n'appartient qu'à un seul côté. */
    const r = makeRnd(0x51c7);
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const u = (px + 0.5) / T, v = (py + 0.5) / T;
      // Position le long de l'axe du voisin : 1 collé à lui, 0 au centre.
      const s = dx ? (dx < 0 ? 1 - 2 * u : 2 * u - 1) : (dy < 0 ? 1 - 2 * v : 2 * v - 1);
      if (r() < s) P(g, px, py, 1, 1, WAT_RAMP[d]);
      else r();                                  // on consomme quand même : la suite doit rester alignée
    }
    return c;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ZIP 436 — CE QUI FLOTTE ET CE QUI ÉMERGE.
     ─────────────────────────────────────────────────────────────────────────
     Le 435 le disait lui-même en dernière ligne : « aucun roseau, aucun
     nénuphar, aucun rocher émergé ». C'est ce qui séparait encore l'étang de
     la référence de Guillaume — et ce n'est pas de la décoration : une nappe
     d'eau vide n'a pas d'ÉCHELLE. Un nénuphar de six pixels dit « cette mare
     fait quatre mètres » ; sans lui, le même dessin peut être une flaque ou un
     lac, et c'est exactement le reproche « pas assez réaliste ».
     ⚠️ AUCUN N'EST UN PROP, ET C'EST DÉLIBÉRÉ. L'eau bloque déjà : un rocher
     posé dessus n'a aucune collision à porter, donc rien à faire dans
     `tw.props` (qui coûterait une passe de générateur, une entrée dans le
     contrôle « toute case solide est dessinée », et un tri de profondeur). Ils
     sont TIRÉS D'UN HACHAGE DE LA CASE au rendu, comme les emplacements
     d'oiseaux du 433 : même carte, mêmes nénuphars, chez les deux joueurs,
     sans un octet de réseau.
     ⚠️ Et ils ne se posent que sur de la PLEINE eau, pour la raison du 435 :
     sur une case de rive, un `drawImage` pleine case redessinerait la grille. */
  const WAT_DECOR_N = 4;                         // 4 variantes par espèce
  function townLilyTile(vr) {
    const [c, g] = cv(T, T), r = makeRnd(0x6a11 + vr * 97);
    const PAD = ["#3f7a3a", "#4d8c44", "#356b32"], PADL = "#63a355", PADD = "#27502a";
    const n = 1 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const cx = 3 + ((r() * 10) | 0), cy = 3 + ((r() * 10) | 0), rad = 2 + ((r() * 2) | 0);
      const body = PAD[(r() * PAD.length) | 0];
      /* ⚠️ LE DISQUE EST DESSINÉ EN RANGÉES DE `fillRect`, PAS AVEC `arc()`.
         Le faux canevas des bancs ne rastérise pas les chemins (§4) : un
         nénuphar en `arc` serait invisible dans `tools/render-eau.mjs`,
         c'est-à-dire livré sans avoir jamais été regardé. */
      for (let dy = -rad; dy <= rad; dy++) {
        const w = Math.round(Math.sqrt(Math.max(0, rad * rad - dy * dy)) * 2);
        if (w <= 0) continue;
        P(g, cx - (w >> 1), cy + dy, w, 1, body);
      }
      P(g, cx - (rad >> 1), cy - rad, Math.max(1, rad), 1, PADL);        // le dessus, éclairé au nord-ouest
      P(g, cx - (rad >> 1), cy + rad, Math.max(1, rad), 1, PADD);        // l'ourlet dans l'eau
      // L'ENCOCHE : c'est elle, et rien d'autre, qui fait lire « nénuphar »
      // plutôt que « tache verte ». Une feuille de nymphéa est fendue.
      P(g, cx, cy, 1, rad + 1, "#2b5384");
      if (r() < 0.35) { P(g, cx + 1, cy - 1, 2, 2, "#e8dfe8"); P(g, cx + 1, cy - 1, 1, 1, "#f6f1f6"); }  // la fleur
    }
    return c;
  }
  function townWaterRockTile(vr) {
    const [c, g] = cv(T, T), r = makeRnd(0x4b73 + vr * 53);
    const ROC = ["#7e7a72", "#8d8981", "#6c6862"], LIT = "#a5a099", WET_ = "#4b5a63";
    const n = 1 + ((r() * 2) | 0);
    for (let k = 0; k < n; k++) {
      const cx = 3 + ((r() * 9) | 0), cy = 4 + ((r() * 8) | 0);
      const w = 3 + ((r() * 4) | 0), h = 2 + ((r() * 3) | 0);
      P(g, cx, cy, w, h, ROC[(r() * ROC.length) | 0]);
      P(g, cx, cy, w - 1, 1, LIT);                       // le dessus prend la lumière du nord-ouest
      P(g, cx, cy + h - 1, w, 1, WET_);                  // la ligne de flottaison, mouillée et sombre
      P(g, cx - 1, cy + h, w + 2, 1, "rgba(219,238,242,0.55)");   // l'anneau d'écume au pied
      if (r() < 0.5) P(g, cx + w - 1, cy + 1, 1, h - 1, "#5d5952");
    }
    return c;
  }
  /* Les roseaux se posent sur la BERGE MOUILLÉE (bande 1), pas sur l'eau : une
     touffe de joncs pousse dans la vase, pas au large. Ils débordent vers le
     haut de la case — c'est ce débord qui leur donne de la hauteur, exactement
     comme la haie du 425 déborde de sept pixels vers le nord. */
  function townReedTile(vr) {
    const [c, g] = cv(T, T), r = makeRnd(0x2d90 + vr * 71);
    const ST = ["#4a7a3c", "#5b8f46", "#3d6733"], SEED = "#6b5233";
    const n = 3 + ((r() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const x = 2 + ((r() * 12) | 0), h = 5 + ((r() * 7) | 0), base = 11 + ((r() * 4) | 0);
      const col = ST[(r() * ST.length) | 0];
      const lean = r() < 0.5 ? 0 : (r() < 0.5 ? -1 : 1);
      for (let q = 0; q < h; q++) P(g, x + ((lean * q / 4) | 0), base - q, 1, 1, col);
      if (r() < 0.45) P(g, x + ((lean * h / 4) | 0), base - h - 1, 1, 2, SEED);   // la massette
    }
    return c;
  }

  function townWaterTile(cfg, vr, d) {
    /* ⚠️ LA GRAINE NE DÉPEND PAS DE `d`, ET C'EST OBLIGATOIRE. Le rendu
       recompose une case à partir de TROIS crans de profondeur (voir les
       bandes de fondu dans `drawTownWaterTile`) : si le grain, les lames de
       lumière et l'écume changeaient de place d'un cran à l'autre, chaque case
       d'eau serait hachée en trois dessins différents. Même graine, même
       placement, seule la teinte bouge. */
    const [c, g] = cv(T, T), r = makeRnd(0x2ee1 + cfg * 131 + vr * 17);
    // Les quatre coins, dans l'ordre NO, NE, SE, SO — le même que `cfg` côté rendu.
    const c00 = (cfg & 1) ? 1 : 0, c10 = (cfg & 2) ? 1 : 0, c11 = (cfg & 4) ? 1 : 0, c01 = (cfg & 8) ? 1 : 0;
    const AMP = vr ? 0.13 : -0.13;
    /* `f` déborde d'un pixel de chaque côté : c'est ce qui permet de savoir si
       un pixel du BORD de la case est au bord de l'eau ou au milieu d'une
       nappe qui continue chez le voisin. Sans ce débord, on aurait posé un
       liseré d'écume tout autour de chaque case — la grille, à nouveau, mais
       en blanc. */
    const N = T + 2;
    const wet = new Uint8Array(N * N);
    for (let py = -1; py <= T; py++) for (let px = -1; px <= T; px++) {
      const u = (px + 0.5) / T, v = (py + 0.5) / T;
      let f = c00 * (1 - u) * (1 - v) + c10 * u * (1 - v) + c01 * (1 - u) * v + c11 * u * v;
      if (cfg === WAT_CFG - 1) f = 1;
      const bump = 16 * u * (1 - u) * v * (1 - v);
      const thr = 0.5 + AMP * (bump > 0 ? bump : 0);
      /* ⚠️ LA CASE D'EAU ISOLÉE (cfg 0) NE DOIT PAS DISPARAÎTRE. Ses quatre
         coins sont de la terre, donc l'isocontour est vide — et une case
         d'eau non peinte, c'est de l'herbe au milieu d'une mare. On lui donne
         une flaque centrée, ce qui est de toute façon la bonne lecture d'un
         fond d'eau d'une seule case. Le générateur en produit zéro aujourd'hui
         (deux passes de lissage), mais le lac du sud n'a pas été retouché et
         rien ne garantit qu'il n'en fabriquera pas demain. */
      const on = cfg === 0
        ? ((px - 7.5) * (px - 7.5) / 30 + (py - 7.5) * (py - 7.5) / 30) < 1
        : f >= thr;
      if (on) wet[(py + 1) * N + (px + 1)] = 1;
    }
    const W_ = (px, py) => wet[(py + 1) * N + (px + 1)] === 1;
    const base = WAT_RAMP[d];
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      if (!W_(px, py)) continue;
      P(g, px, py, 1, 1, base);
    }
    // Grain : sans lui l'eau mesure un écart-type de 8 (mesuré au 434 sur
    // l'ancien aplat), c'est-à-dire une gouache. Deux tons, épars.
    for (let k = 0; k < 22; k++) {
      const px = (r() * T) | 0, py = (r() * T) | 0;
      if (W_(px, py)) P(g, px, py, 1, 1, r() < 0.5 ? WAT_RAMP[Math.min(WAT_DEPTH - 1, d + 1)] : WAT_RAMP[Math.max(0, d - 1)]);
    }
    /* LA RIVE, EN DEUX MATIÈRES OPPOSÉES, ET C'EST ELLE QUI FAIT LA
       PROFONDEUR. La lumière du projet vient du NORD-OUEST (c'est le biseau
       des pavés du 434) : la berge nord-ouest porte donc son ombre SUR l'eau,
       et la rive sud-est reçoit la lumière rasante, donc l'écume. Deux liserés
       de un pixel, jamais les deux du même côté. */
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      if (!W_(px, py)) continue;
      let nx = 0, ny = 0, edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!W_(px + dx, py + dy)) { nx += dx; ny += dy; edge = true; }
      }
      if (!edge) continue;
      const lit = (nx + ny) > 0;                      // normale vers le sud/est
      /* ⚠️ L'ÉCUME EST DISCONTINUE, ET C'EST LA DIFFÉRENCE ENTRE UNE RIVE ET
         UN DÉTOURAGE. Premier jet : un pixel clair sur CHAQUE pixel de bord —
         l'étang se retrouvait cerné d'un trait blanc continu, c'est-à-dire
         détouré comme un autocollant. Une écume réelle est faite de paquets.
         Un pixel sur trois saute, tiré du même générateur que le reste de la
         tuile, donc stable d'une image à l'autre. */
      if (lit && r() < 0.34) continue;
      P(g, px, py, 1, 1, lit ? WAT_FOAM : WAT_SHADE);
    }
    /* Le reflet du ciel : une ou deux lames claires horizontales, à l'intérieur
       du trait. ⚠️ ELLES SONT BAKÉES ET NON ANIMÉES — l'animation est ajoutée
       au rendu, sur les cases de PLEINE eau seulement, où elle ne peut pas
       déborder du contour (voir drawTownWaterTile). */
    const lam = 1 + ((r() * 2) | 0);
    for (let k = 0; k < lam; k++) {
      const ly = 2 + ((r() * (T - 4)) | 0), lx = 1 + ((r() * (T - 6)) | 0), lw = 3 + ((r() * 3) | 0);
      for (let q = 0; q < lw; q++) if (W_(lx + q, ly) && W_(lx + q, ly - 1) && W_(lx + q, ly + 1)) {
        P(g, lx + q, ly, 1, 1, d <= 3 ? "#bfdae0" : "#6ea3c2");
      }
    }
    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════
     LA BERGE. Huit orientations bakées, deux variantes — même raison que les
     bordures de rue : le faux canevas des bancs ignore `rotate` (§4), donc une
     berge obtenue par transformation serait invisible là où on la regarde.
     ⚠️ SA COUVERTURE EST UNE FONCTION DE LA DIRECTION DE L'EAU, pas un
     rectangle : c'est ce qui empêche la berge de redessiner la grille qu'on
     vient de casser. Et son bord EXTÉRIEUR est dentelé par colonne — une berge
     à bord net serait un second rivage, à une case du premier. */
  const SHORE_DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  function townShoreTile(band, dir, vr) {
    const [c, g] = cv(T, T), r = makeRnd(0x71a3 + band * 313 + dir * 29 + vr * 5);
    const [dx, dy] = SHORE_DIRS[dir];
    const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
    /* ⚠️ GRIS-VERT ET PAS CHOCOLAT, ET C'EST UNE CORRECTION MESURÉE. Premier
       jet : de la terre brune sur toute la bande 1 — regardé sur
       `render-eau.mjs`, l'étang portait un DONUT MARRON de deux cases, plus
       large que l'eau elle-même. Une berge de mare n'est pas un labour : c'est
       de la vase grise, des galets et de l'herbe qui continue par-dessus.
       Les touffes et la mousse doivent RESTER visibles au travers, sinon on a
       remplacé une frontière nette par une bande nette. */
    const WET = ["#6a6354", "#736b5b", "#5f5849"];              // vase grise, pas de la terre retournée
    const PEB = ["#95918a", "#7d7973", "#a8a298", "#6b6762"];   // galets
    const MOSS = ["#4a6338", "#3d5730"];
    const TUFT = "#3f7a3c";
    // Le limon et les galets vus À TRAVERS l'eau : plus sombres et plus froids
    // que les mêmes matières à l'air libre. Sans ce décalage, la rive immergée
    // se lirait comme une plage qui affleure.
    const SILT = ["#4e5a55", "#57635c", "#465250"];
    const SPEB = ["#6f7a76", "#5e6866", "#7d8783", "#525c5a"];
    /* Le seuil de couverture. ⚠️ IL A ÉTÉ REMONTÉ DEUX FOIS : la bande mouillée
       ne couvre plus que le tiers de la case côté eau (elle en couvrait les
       deux tiers), et la bande sèche n'est plus qu'un semis de galets dans
       l'herbe. C'est ce qui ramène l'anneau visible de deux cases à une. */
    /* ⚠️ LA BANDE 3 EST LA RIVE IMMERGÉE — celle qu'on peint SUR une case d'eau,
       sous le trait. Elle a sa propre matière, et ce n'est pas de la coquetterie :
       peinte comme la berge sèche, elle mettait de la MOUSSE VERTE et des touffes
       d'herbe dans l'eau. Vu sur `eau-lac-sud.png` : des îlots d'herbe flottant
       le long du quai. Sous l'eau il n'y a que du limon et des galets. */
    const sunk = band === 3;
    /* ⚠️⚠️ ET ELLE COUVRE BEAUCOUP PLUS LARGE QUE LES DEUX AUTRES. Vu sur
       `eau-lac-sud.png` : un LISERÉ VERT VIF courait sous toute la promenade du
       lac. Ce n'était ni la mousse ni une touffe — c'était LE LIT. Le rendu
       peint l'herbe sous les cases d'eau (il le faut : le trait d'eau traverse
       la case, il reste du sec à montrer), et là où le contour se retirait, la
       pelouse ressortait entre les grains de limon. Une bande semée ne peut pas
       masquer un fond : sur une case d'eau, la rive doit couvrir PLEIN au
       contact de la terre et ne se dissoudre qu'en allant vers le large. */
    const thr = band === 2 ? 0.34 : (sunk ? -0.30 : 0.02);
    const span = sunk ? 0.55 : 0.34;
    /* ⚠️⚠️ LA COUVERTURE EST UNE DENSITÉ, PAS UN DEMI-PLAN — ET C'EST LA
       TROISIÈME FOIS QUE CE ZIP PAYE LA MÊME LEÇON. Premier jet : « au-delà du
       seuil, on remplit », avec une dentelure par rangée. Résultat regardé sur
       `render-eau.mjs` : la berge se lisait en TRIANGLES nets, un par case,
       parce que huit orientations bakées + un demi-plan plein = huit triangles.
       On avait cassé la grille sur le rivage, puis au large, et on venait de la
       redessiner sur la berge — sous forme de triangles cette fois.
       ⚠️ La parade est de ne jamais peindre une SURFACE : la distance au bord
       donne une PROBABILITÉ, et on tire pixel par pixel. Le bord de la berge
       n'existe alors plus comme trait — il n'y a qu'un semis qui se raréfie.
       Aucune orientation ne peut plus se lire, et les huit tuiles se raccordent
       sans qu'on ait rien à faire pour ça. */
    const dens = (px, py) => {
      const s = ((px + 0.5) / T - 0.5) * ux + ((py + 0.5) / T - 0.5) * uy;
      return Math.max(0, Math.min(1, (s - thr) / span));
    };
    if (band !== 2) {
      const body = sunk ? SILT : WET;
      for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
        const p = dens(px, py);
        // Sous l'eau, plein au contact de la terre ; sur la berge sèche, jamais
        // tout à fait plein — c'est ce qui laisse l'herbe respirer au travers.
        if (r() >= (sunk ? Math.min(1, p * 1.7) : p * 0.92)) continue;
        P(g, px, py, 1, 1, body[(r() * body.length) | 0]);
      }
      for (let k = 0; k < 9; k++) {                              // galets, plutôt côté eau
        const px = (r() * T) | 0, py = (r() * T) | 0;
        if (r() >= dens(px, py)) continue;
        P(g, px, py, 1 + ((r() * 2) | 0), 1 + ((r() * 2) | 0), (sunk ? SPEB : PEB)[(r() * PEB.length) | 0]);
      }
      if (!sunk) for (let k = 0; k < 6; k++) {                   // mousse, plutôt côté herbe
        const px = (r() * T) | 0, py = (r() * T) | 0;
        if (r() < dens(px, py) * 0.8) P(g, px, py, 2, 1, MOSS[(r() * MOSS.length) | 0]);
      }
    } else {
      for (let k = 0; k < 12; k++) {
        const px = (r() * T) | 0, py = (r() * T) | 0;
        if (r() >= dens(px, py)) continue;
        P(g, px, py, 1 + ((r() * 2) | 0), 1, r() < 0.6 ? PEB[(r() * PEB.length) | 0] : WET[(r() * WET.length) | 0]);
      }
    }
    /* Deux touffes qui débordent sur la terre : c'est ce qui empêche la berge de
       se lire comme une découpe. ⚠️ JAMAIS SOUS L'EAU, et jamais hors couverture
       — le `|| r() < 0.4` du premier jet en semait au hasard dans la case, donc
       des brins d'herbe au milieu de la vase. */
    if (!sunk) for (let k = 0; k < 2; k++) {
      const px = 1 + ((r() * (T - 2)) | 0), py = 1 + ((r() * (T - 3)) | 0);
      if (dens(px, py) > 0.45) { P(g, px, py, 1, 3, TUFT); P(g, px + 1, py + 1, 1, 2, TUFT); }
    }
    return c;
  }

  /* ---------------- Objets ---------------- */
  function oakTree() {
    const [c, g] = cv(32, 48);
    P(g, 14, 32, 5, 14, "#7a5330");
    P(g, 14, 32, 2, 14, "#8a6340");
    P(g, 12, 44, 3, 2, "#7a5330"); P(g, 18, 44, 3, 2, "#6a4528");
    const leaf = "#3e8a34", leafD = "#337029", leafL = "#54a648";
    g.fillStyle = leafD; g.beginPath(); g.arc(16, 18, 14, 0, 7); g.fill();
    g.fillStyle = leaf; g.beginPath(); g.arc(15, 16, 12, 0, 7); g.fill();
    g.fillStyle = leafL; g.beginPath(); g.arc(11, 12, 6, 0, 7); g.fill();
    g.fillStyle = leafL; g.beginPath(); g.arc(21, 15, 4, 0, 7); g.fill();
    const r = makeRnd(12);
    for (let i = 0; i < 12; i++) P(g, 5 + ((r() * 22) | 0), 6 + ((r() * 20) | 0), 1, 1, leafD);
    return c;
  }
  function pineTree() {
    const [c, g] = cv(32, 48);
    P(g, 14, 36, 4, 10, "#6a4a2c"); P(g, 14, 36, 2, 10, "#7a5a38");
    const d = "#2a6648", m = "#347a54", l = "#468f62";
    for (let i = 0; i < 4; i++) {
      const y = 8 + i * 8, half = 6 + i * 2.5;
      g.fillStyle = i % 2 ? m : d;
      g.beginPath(); g.moveTo(16, y - 6); g.lineTo(16 - half, y + 6); g.lineTo(16 + half, y + 6); g.fill();
    }
    P(g, 15, 2, 2, 4, l);
    return c;
  }
  /* ════════════════════════════════════════════════════════════════════════
     ZIP 438 — LES ARBRES, REFAITS UNE SECONDE FOIS, ET LE PROCÉDÉ A CHANGÉ.
     ────────────────────────────────────────────────────────────────────────
     ⚠️⚠️⚠️ VERDICT DE GUILLAUME SUR LA VERSION 437 : « c'est dégueulasse […]
     on dirait une friche […] ton rendu est vraiment sale ». Il avait raison, et
     la cause est identifiable : le 437 dessinait une SILHOUETTE (un masque
     elliptique lobé) puis la texturait par TIRAGES — trente disques, vingt-six
     pixels épars, un cerne. À 32 px, un semis de pixels de tons voisins ne fait
     pas de la matière : il fait du BRUIT. C'est le mot exact de Guillaume,
     « sale », et c'est mesurable — le banc du 437 mesurait un « grain » élevé
     et le prenait pour de la qualité. **Le grain montait, la propreté baissait,
     et le banc applaudissait.** (§10 : un banc qui passe ne dit pas que la
     chose est bonne, il dit qu'on mesure autre chose.)
     ⚠️⚠️ LE PROCÉDÉ EST DONC INVERSÉ : LA SILHOUETTE N'EST PLUS DESSINÉE, ELLE
     EST LE RÉSULTAT. Un houppier est l'UNION D'UNE DIZAINE DE BOUQUETS, et
     chaque bouquet est une forme PLEINE, cernée, ombrée en trois tons francs.
     Aucun pixel n'est tiré au hasard nulle part dans ce fichier-ci : tout ce
     qu'on voit est le bord d'une forme. C'est ce qui distingue le pixel art
     propre du bruit — et c'est ce que font les références que Guillaume a
     données, qu'il suffit de regarder de près pour voir qu'elles ne contiennent
     AUCUN pixel isolé.
     ⚠️ TROIS CONSÉQUENCES DIRECTES :
       1. le contour extérieur est FESTONNÉ tout seul (c'est l'union des
          bouquets), on n'a plus à le fabriquer avec des harmoniques ;
       2. chaque bouquet porte son propre arc d'ombre, donc on LIT les masses,
          alors qu'un semis les recolle en un coussin ;
       3. les fleurs deviennent des FLEURS (une croix de cinq pixels et un cœur)
          au lieu de confettis de deux pixels.
     ⚠️ LE GABARIT PASSE DE 32×48 À 48×64 (2×3 cases → 3×4). À 32 px de large,
     dix bouquets de six pixels ne tiennent pas : on ne pouvait dessiner que des
     ronds. C'est la vraie raison pour laquelle le 437 a échoué — pas le talent,
     la place. Un arbre de Stardew fait trois cases de large.
     ⚠️ ET ILS BOUGENT (demande : « une vraie texture en légère animation »).
     Trois images par essence et par saison, où les bouquets HAUTS se décalent
     d'un pixel et les bas ne bougent pas — un arbre plie par la cime. La phase
     vient du hachage de la case : deux arbres voisins ne respirent jamais
     ensemble, sinon toute la forêt bat comme un cœur.
     ════════════════════════════════════════════════════════════════════════ */
  const TW_ = 48, TH_ = 64;        // 3 cases de large, 4 de haut
  const TBASE_ = 58;               // la ligne de sol dans le canevas
  const TFRAMES_ = 3;
  /* Le tronc. ⚠️ DESSINÉ AVANT LA COURONNE, donc il déborde dessous : peint
     après, il couperait le feuillage en deux ; arrêté au ras des feuilles, il
     laisserait voir le fond entre les deux. */
  function treeTrunk(g, sp) {
    const [bark, barkL, barkD] = sp.trunk;
    const w = sp.tw, x0 = 24 - (w >> 1), top = sp.trunkTop, bot = TBASE_;
    for (let y = top; y < bot; y++) {
      const t = (y - top) / (bot - top);
      // L'évasement du pied : sans lui, un tronc est un poteau planté.
      const flare = t > 0.80 ? Math.round((t - 0.80) * 5 * 3) : 0;
      const lean = sp.lean ? Math.round(sp.lean * (1 - t) * 3) : 0;
      /* ⚠️ ZIP 439 — LE FÛT S'AMINCIT VERS LE HAUT. Sans ça c'est un CYLINDRE,
         et un cylindre de largeur constante sur vingt-six pixels se lit comme
         un tuyau : c'est la moitié de ce que Guillaume appelle « des troncs
         peu travaillés ». Un pixel de moins de chaque côté au-dessus du tiers
         supérieur suffit — au-delà, l'arbre a l'air de tenir sur un fil. */
      const nar = (w >= 6 && t < 0.34) ? 1 : 0;
      const ww = w + flare * 2 - nar * 2;
      const xs = x0 - flare + lean + nar;
      P(g, xs, y, ww, 1, bark);
      P(g, xs, y, Math.max(1, ww >> 2), 1, barkL);   // lumière du nord-ouest
      P(g, xs + ww - 1, y, 1, 1, barkD);
    }
    /* ⚠️⚠️ ZIP 439 — LES CONTREFORTS DE RACINE ONT ÉTÉ REFAITS (retour de
       Guillaume : « attention aux troncs qui sont parfois moches et peu
       travaillés »). Le 438 en posait DEUX, symétriques, en deux rectangles
       plats de part et d'autre du pied : vu à l'échelle du jeu, ça ne se lit
       pas comme des racines mais comme une SEMELLE, c'est-à-dire comme un
       poteau scellé dans du béton. Il en faut trois, de longueurs
       DIFFÉRENTES, et chacun doit S'AMINCIR en s'éloignant du tronc — c'est ce
       profil en coin, et lui seul, qui dit « ça sort de terre ». */
    /* ⚠️⚠️ ZIP 439 (2e passe) — LES TROIS CONTREFORTS EN ONT FAIT DEUX, ET LE
       TROISIÈME ÉTAIT UN BOGUE, PAS UN CHOIX. Écrit `[[-1,6],[1,4],[-1,3]]`, il
       posait un moignon de trois pixels à MI-HAUTEUR du tronc (`bot - 5`), du
       côté gauche : sur un tronc brun ça passait pour un nœud, sur le tronc
       BLANC du bouleau ça se lisait comme une branche cassée. C'est le premier
       des trois défauts que Guillaume a photographiés.
       ⚠️ ET LES DEUX QUI RESTENT SONT DÉSORMAIS DE LONGUEURS PROCHES (4 et 3).
       À 6 contre 4, le pied part franchement à gauche pendant que le fût monte
       à droite : l'arbre n'est pas penché, il est TORDU — et « désaxé » est
       exactement le mot employé. Un arbre penche d'un seul tenant ou pas du
       tout. */
    for (const [dir, len] of [[-1, 4], [1, 3]]) {
      const s = dir < 0 ? x0 - 1 : x0 + w;
      for (let k = 0; k < len; k++) {
        const hh = Math.max(1, 3 - k);
        const xx = dir < 0 ? s - k : s + k;
        if (xx < 1 || xx >= TW_ - 1) break;
        P(g, xx, bot - hh, 1, hh, dir < 0 ? bark : barkD);
        P(g, xx, bot - hh, 1, 1, dir < 0 ? barkL : bark);
      }
    }
    /* ⚠️ L'ÉCORCE EST FAITE DE CRÊTES QUI SE DÉCALENT, PAS DE TIRETS ALIGNÉS.
       Le 438 empilait des tirets de 3 px sur des colonnes fixes tous les 5 px :
       à trois colonnes de large, ça dessine une GRILLE, et une grille sur un
       tronc se lit comme du grillage. Ici chaque crête glisse d'une colonne à
       chaque étage — la texture monte en hélice, comme une vraie écorce. */
    /* ⚠️⚠️ PAS DE CRÊTES SUR LE BOULEAU, ET C'EST LE TROISIÈME DÉFAUT DE LA
       PHOTO. Ces tirets sombres sont faits pour de l'écorce BRUNE, où ils se
       lisent comme des rainures ; posés sur un fût blanc, à côté des cicatrices
       noires que le bouleau a déjà, ils le hachent en barreaux — l'arbre se lit
       comme un poteau métallique. Une texture ne se transporte pas d'une
       matière à l'autre : le bouleau a DÉJÀ sa texture, et deux textures
       superposées n'en font aucune. */
    if (!sp.birchBands) for (let y = top + 3, k = 0; y < bot - 4; y += 4, k++) {
      const xx = x0 + 1 + ((k * 2) % Math.max(1, w - 1));
      P(g, xx, y, 1, 3, barkD);
      if (w > 4) P(g, x0 + w - 2 - ((k * 3) % Math.max(1, w - 2)), y + 2, 1, 2, barkD);
    }
    if (sp.birchBands) {                        // le bouleau et ses cicatrices noires
      for (let y = top + 4; y < bot - 3; y += 6) {
        P(g, x0, y, w, 1, "#3a3630"); P(g, x0 + 1, y + 1, Math.max(1, w - 2), 1, "#57524a");
      }
    }
  }
  /* Les bouquets : une couronne de masses posées sur une ellipse, plus
     quelques-unes au cœur. ⚠️ LEURS POSITIONS SONT CALCULÉES, PAS TIRÉES —
     c'est ce qui permet de les DÉCALER d'une image à l'autre sans que la
     silhouette change de nature, et c'est aussi ce qui rend le dessin
     reproductible chez les deux joueurs sans un octet de réseau. */
  function crownClumps(sp, frame) {
    const out = [];
    const { cx, cy, rx, ry, n, rad, radVar } = sp.crown;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + sp.crown.phase;
      const r = rad + radVar * Math.sin(i * 2.399 + sp.crown.phase * 3);
      const bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry * 0.95;
      out.push({ x: bx, y: by, r });
    }
    for (const [ix, iy, ir] of (sp.crown.inner || [])) out.push({ x: cx + ix, y: cy + iy, r: ir });
    if (frame) {
      /* LE VENT. Le décalage est proportionnel à la HAUTEUR du bouquet dans la
         couronne : la cime prend un pixel, le bas ne bouge pas. Un arbre entier
         qui glisse d'un pixel, c'est un arbre qui saute. */
      const top = Math.min(...out.map(o => o.y - o.r)), bot = Math.max(...out.map(o => o.y + o.r));
      for (const o of out) {
        const h = 1 - (o.y - top) / Math.max(1, bot - top);
        o.x += frame * h * h * 1.9;
      }
    }
    return out;
  }
  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 439 — LES ARBRES À FLEURS, REFAITS. (« les arbres qui ont des fleurs,
     ceux-là sont dégueu » — Guillaume, sur le magnolia, le cerisier et le
     mimosa du 437.)
     ──────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ CE QUI N'ALLAIT PAS N'ÉTAIT PAS LA COULEUR, C'ÉTAIT L'ÉCHELLE DE LA
     FLEUR. Le 438 posait deux ou trois CROIX DE CINQ PIXELS par bouquet, sur la
     coque du houppier. À trois pixels de large, une fleur n'est pas une fleur :
     c'est un point. Un magnolia couvert de points roses ne se lit pas comme un
     magnolia en fleurs, il se lit comme un arbre vert SALI de rose — et c'est
     mot pour mot le verdict.
     Sur la planche de référence, l'arbre en fleurs porte CINQ à SEPT corolles
     de onze pixels, chacune faite de cinq pétales autour d'un cœur jaune. Une
     corolle y occupe un sixième de la couronne. C'est un objet, pas un grain.

     ⚠️⚠️ ET ELLES ENTRENT DANS LE MASQUE DE LA COURONNE, ce qui n'est pas un
     détail d'implémentation mais la condition pour que le contrôle n°5 de
     `render-arbres.mjs` reste vrai (« la saison change la couleur, pas la
     forme »). Une corolle peinte PAR-DESSUS la silhouette la déformerait en
     été et pas en automne, où `petal` vaut `null` : le même arbre changerait
     de forme en changeant de mois. Ici la corolle est une MASSE de la couronne
     au même titre qu'un bouquet de feuilles ; seule sa couleur dépend de la
     saison, et en automne elle redevient simplement du feuillage.
     ⚠️ Corollaire de dessin, et c'est ce qui fait la silhouette festonnée de la
     planche : les corolles sont sur un anneau LÉGÈREMENT plus large que celui
     des bouquets de feuilles. Elles débordent donc du vert, et c'est ce débord
     qu'on voit de loin. */
  function bloomAnchors(sp, frame) {
    const b = sp.blossom, out = [];
    for (let i = 0; i < b.n; i++) {
      const a = (i / b.n) * Math.PI * 2 + b.phase;
      out.push({ x: b.cx + Math.cos(a) * b.rx, y: b.cy + Math.sin(a) * b.ry,
                 r: b.rad + ((i * 5) % 3) * 0.5, a: a * 1.7 });
    }
    for (const [ix, iy, ir] of (b.inner || [])) out.push({ x: b.cx + ix, y: b.cy + iy, r: ir, a: ix + iy });
    if (frame) {
      const top = Math.min(...out.map(o => o.y - o.r)), bot = Math.max(...out.map(o => o.y + o.r));
      for (const o of out) {
        const h = 1 - (o.y - top) / Math.max(1, bot - top);
        o.x += frame * h * h * 1.9;
      }
    }
    return out;
  }
  /* Une corolle. ⚠️ ELLE N'EST PAS DESSINÉE PÉTALE PAR PÉTALE MAIS PAR
     PARTITION : pour chaque pixel du disque on cherche le pétale le plus
     proche, on l'ombre d'après SA normale à lui, et on noircit la frontière
     entre deux pétales voisins. C'est la même idée que les bouquets du 438 —
     une seule grandeur seuillée, donc des bords lisses — et c'est ce qui évite
     les cinq disques recollés en trèfle sale du premier jet.
     ⚠️ ENTRE DEUX PÉTALES, ON NE PEINT RIEN : le feuillage déjà posé reste
     visible dans les creux, ce qui est exactement ce que montre la planche et
     ce qui empêche la corolle de se lire comme une pastille. */
  function paintBloom(g, o, pal, mask, puff) {
    const PN = 5, pr = o.r * 0.54;
    const yA = Math.max(1, Math.floor(o.y - o.r)), yB = Math.min(TH_ - 2, Math.ceil(o.y + o.r));
    const xA = Math.max(1, Math.floor(o.x - o.r)), xB = Math.min(TW_ - 2, Math.ceil(o.x + o.r));
    for (let y = yA; y <= yB; y++) for (let x = xA; x <= xB; x++) {
      if (!mask[y * TW_ + x]) continue;
      const cdx = x + 0.5 - o.x, cdy = y + 0.5 - o.y;
      if (puff) {
        // Le mimosa : une boule duveteuse, pas une corolle. Cinq pétales sur un
        // pompon de quatre pixels ne se lisent pas — un dégradé rond, si.
        const d = Math.sqrt(cdx * cdx + cdy * cdy) / o.r;
        if (d > 1) continue;
        const lit = (-cdx * 0.62 - cdy * 0.78) / o.r;
        P(g, x, y, 1, 1, d > 0.86 ? pal.petalD : lit > 0.28 ? pal.petalL : lit < -0.30 ? pal.petalD : pal.petal);
        continue;
      }
      if (cdx * cdx + cdy * cdy <= o.r * o.r * 0.055) { P(g, x, y, 1, 1, pal.petalC); continue; }  // le cœur
      let b1 = 1e9, b2 = 1e9, bdx = 0, bdy = 0;
      for (let i = 0; i < PN; i++) {
        const a = i * (Math.PI * 2 / PN) + o.a;
        const dx = cdx - Math.cos(a) * o.r * 0.50, dy = cdy - Math.sin(a) * o.r * 0.50;
        const d = dx * dx + dy * dy;
        if (d < b1) { b2 = b1; b1 = d; bdx = dx; bdy = dy; } else if (d < b2) b2 = d;
      }
      if (b1 > pr * pr) continue;                       // le creux entre deux pétales
      if (b2 - b1 < 1.6) { P(g, x, y, 1, 1, pal.petalD); continue; }   // la pliure
      const lit = (-bdx * 0.62 - bdy * 0.78) / pr;
      P(g, x, y, 1, 1, lit > 0.34 ? pal.petalL : lit < -0.28 ? pal.petalD : pal.petal);
    }
  }

  function townTreeSprite(sp, season, frame) {
    const [c, g] = cv(TW_, TH_);
    const pal = (season === "autumn" && sp.autumn) ? Object.assign({}, sp, sp.autumn)
              : (season === "spring" && sp.spring) ? Object.assign({}, sp, sp.spring) : sp;
    /* L'OMBRE PORTÉE AU SOL, cuite dans le sprite. Deux ellipses concentriques
       et pas un dégradé : à cette échelle un dégradé alpha se lit comme une
       tache de gras. C'est le détail qui POSE l'arbre — sans lui il flotte.
       ⚠️⚠️ ZIP 439 — ELLE A ÉTÉ REFAITE, ET LES DEUX ELLIPSES ANNONCÉES PAR CE
       COMMENTAIRE N'EXISTAIENT PAS : le 438 n'en peignait qu'UNE, à 22 %
       d'opacité, large de 15 px pour un houppier qui en fait 36. Le commentaire
       décrivait une intention, le code faisait autre chose — et personne ne
       pouvait le voir, puisque la planche des arbres est dessinée sur un fond
       vert uni où une ombre à 22 % ne se distingue pas.
       Demande de Guillaume : « ajoute des ombres pour plus de présence ». Le
       cœur passe à 38 %, le halo reste à 18 %, et le grand axe suit la LARGEUR
       DU HOUPPIER (17 px de demi-axe) au lieu d'être écrit en dur : une ombre
       plus étroite que la couronne qu'elle porte fait flotter l'arbre, ce qui
       est très exactement le défaut qu'elle est censée corriger.
       ⚠️ ELLE EST DÉCENTRÉE VERS LE SUD-EST, parce que toute la lumière du jeu
       vient du nord-ouest (cf. les arêtes claires du muret, du banc, de la
       berge). Une ombre centrée sous l'objet est une ombre de midi pile, et
       elle contredit tout le reste du décor. */
    for (let y = TBASE_ - 4; y <= TBASE_ + 4; y++) for (let x = 4; x < TW_ - 4; x++) {
      const u = (x - 25.5) / 17, v = (y - (TBASE_ + 1.0)) / 4.0;
      const d = u * u + v * v;
      if (d > 1) continue;
      P(g, x, y, 1, 1, d > 0.44 ? "rgba(18,34,14,0.18)" : "rgba(12,26,10,0.38)");
    }
    if (sp.conifer) { townConifer(g, sp, pal, frame); return c; }
    treeTrunk(g, sp);
    const clumps = crownClumps(sp, frame);
    /* ZIP 439 — les corolles. Elles entrent dans le MASQUE avec les bouquets
       (voir la note de `bloomAnchors`), donc la silhouette est celle de leur
       union, et elle ne dépend pas de la saison. */
    const blooms = sp.blossom ? bloomAnchors(sp, frame) : [];
    const [leaf, leafL, leafD] = pal.leaf;
    const mask = new Uint8Array(TW_ * TH_);
    const inClump = (o, x, y) => {
      const dx = x + 0.5 - o.x, dy = (y + 0.5 - o.y) * 1.06;
      return dx * dx + dy * dy <= o.r * o.r;
    };
    for (const o of blooms) {
      const yA = Math.max(1, Math.floor(o.y - o.r)), yB = Math.min(TH_ - 2, Math.ceil(o.y + o.r));
      const xA = Math.max(1, Math.floor(o.x - o.r)), xB = Math.min(TW_ - 2, Math.ceil(o.x + o.r));
      for (let y = yA; y <= yB; y++) for (let x = xA; x <= xB; x++) if (inClump(o, x, y)) mask[y * TW_ + x] = 1;
    }
    for (const o of clumps) {
      const yA = Math.max(1, Math.floor(o.y - o.r)), yB = Math.min(TH_ - 2, Math.ceil(o.y + o.r));
      const xA = Math.max(1, Math.floor(o.x - o.r)), xB = Math.min(TW_ - 2, Math.ceil(o.x + o.r));
      for (let y = yA; y <= yB; y++) for (let x = xA; x <= xB; x++) if (inClump(o, x, y)) mask[y * TW_ + x] = 1;
    }
    /* ⚠️⚠️ ON BOUCHE LES TROUS D'UN PIXEL AVANT DE CERNER, ET C'EST LA CAUSE
       N°1 DES POINTS PERDUS. Là où deux bouquets se rejoignent en angle rentrant,
       l'union laisse parfois UNE case vide au fond de l'angle. Elle est
       techniquement « dehors », donc la passe de cerne y peint un point noir —
       au MILIEU du feuillage. Vingt et un par arbre, comptés par
       `render-arbres.mjs` : c'est très exactement la saleté que Guillaume a vue.
       Une fermeture morphologique d'un pixel les supprime tous, et ne change
       rien à la silhouette (un trou d'une case n'est pas une forme). */
    for (let y = 2; y < TH_ - 2; y++) for (let x = 2; x < TW_ - 2; x++) {
      if (mask[y * TW_ + x]) continue;
      if (mask[y * TW_ + x + 1] && mask[y * TW_ + x - 1] && mask[(y + 1) * TW_ + x] && mask[(y - 1) * TW_ + x]) mask[y * TW_ + x] = 2;
    }
    const on = (x, y) => (x < 1 || y < 1 || x >= TW_ - 1 || y >= TH_ - 1) ? 0 : mask[y * TW_ + x];
    /* ⚠️ LES BOUQUETS SE PEIGNENT DU HAUT VERS LE BAS. En vue de dessus, ce qui
       est plus bas est plus PRÈS : peint après, il recouvre — et son arc d'ombre
       vient mordre sur celui du dessus. Peints dans le désordre, les arcs se
       coupent et la couronne redevient un coussin. */
    const order = clumps.slice().sort((a, b) => a.y - b.y);
    for (const o of order) {
      const yA = Math.max(1, Math.floor(o.y - o.r)), yB = Math.min(TH_ - 2, Math.ceil(o.y + o.r));
      const xA = Math.max(1, Math.floor(o.x - o.r)), xB = Math.min(TW_ - 2, Math.ceil(o.x + o.r));
      for (let y = yA; y <= yB; y++) for (let x = xA; x <= xB; x++) {
        if (!inClump(o, x, y)) continue;
        const dx = (x + 0.5 - o.x) / o.r, dy = (y + 0.5 - o.y) / o.r;
        const lit = (-dx * 0.62 - dy * 0.78);
        /* ⚠️⚠️ LE TON SE DÉCIDE SUR UNE SEULE GRANDEUR, ET C'EST CE QUI REND LE
           DESSIN PROPRE. Premier jet : deux conditions croisées (« clair si
           éclairé ET pas trop loin du centre », « sombre si loin ET peu
           éclairé »). L'intersection de deux courbes différentes donne une
           frontière DENTELÉE, donc des pixels perdus tout au long — c'est-à-
           dire du tramage involontaire, exactement ce que Guillaume appelle
           « sale ». Une seule grandeur seuillée deux fois donne deux croissants
           à bord LISSE, parce que la frontière est une droite coupant un
           disque. `render-arbres.mjs` compte la différence. */
        P(g, x, y, 1, 1, lit > 0.34 ? leafL : lit < -0.26 ? leafD : leaf);
      }
      /* L'ARC D'OMBRE sous chaque bouquet : c'est LUI qui détache une masse de
         la suivante. Sans lui, dix bouquets clairs se recollent en une tache. */
      /* ⚠️ L'ARC SE PARCOURT AU PIXEL, PAS AU DEGRÉ. Un pas angulaire fixe
         laisse des TROUS sur les grands rayons et repeint dix fois le même
         pixel sur les petits : l'arc devient un pointillé, c'est-à-dire de la
         saleté. On avance d'un pas assez fin pour que deux échantillons soient
         toujours voisins, et on ne repeint pas deux fois la même case. */
      let lastA = -1;
      const step = 0.9 / Math.max(2, o.r);
      for (let t = 0.35; t <= 2.79; t += step) {
        const x = Math.round(o.x + Math.cos(t) * (o.r - 0.6)), y = Math.round(o.y + Math.sin(t) * (o.r - 0.6));
        const key = y * TW_ + x;
        if (key === lastA || !on(x, y)) continue;
        lastA = key;
        P(g, x, y, 1, 1, pal.edge);
      }
    }
    for (let y = 1; y < TH_ - 1; y++) for (let x = 1; x < TW_ - 1; x++) {
      if (mask[y * TW_ + x] === 2) P(g, x, y, 1, 1, leaf);
    }
    /* LES COROLLES, PAR-DESSUS LE FEUILLAGE ET DU HAUT VERS LE BAS — même
       raison que les bouquets : ce qui est plus bas est plus près.
       ⚠️ SI LA SAISON N'A PAS DE FLEUR (`petal: null`, le magnolia en automne),
       ON NE PEINT RIEN : la masse reste, déjà couverte de feuillage par la
       passe précédente, et la silhouette ne bouge pas d'un pixel. */
    if (blooms.length && pal.petal) {
      for (const o of blooms.slice().sort((a, b) => a.y - b.y)) paintBloom(g, o, pal, mask, !!sp.blossom.puff);
    }
    /* LE CERNE EXTÉRIEUR. Un pixel tout autour de l'union — c'est la netteté
       que Guillaume demande (« net et bien détaillé ») : sans cerne, deux
       arbres qui se chevauchent fondent l'un dans l'autre. */
    for (let y = 1; y < TH_ - 1; y++) for (let x = 1; x < TW_ - 1; x++) {
      if (!mask[y * TW_ + x]) continue;
      if (on(x + 1, y) && on(x - 1, y) && on(x, y + 1) && on(x, y - 1)) continue;
      P(g, x, y, 1, 1, pal.out);
    }
    /* LES NERVURES. Deux ou trois traits courts par bouquet, DANS le sens de la
       courbure, du ton clair. Ce sont des feuilles vues de dessus, pas du
       grain : elles suivent une direction, donc l'œil les lit comme un motif. */
    for (const o of order) {
      for (let k = 0; k < 3; k++) {
        const a = -2.3 + k * 0.55;
        const rr = o.r * 0.52;
        const x0 = Math.round(o.x + Math.cos(a) * rr), y0 = Math.round(o.y + Math.sin(a) * rr);
        /* ⚠️ UNE NERVURE EST UN TRAIT CONTINU. Écrite « trois pixels dont le
           troisième décalé d'une rangée », elle se coupait en deux morceaux
           reliés par un coin — donc un pixel perdu par nervure, vingt par
           arbre. Un L plein tient la continuité et lit mieux la courbure. */
        const vein = pal.vein || leafL;
        for (let q = 0; q < 3; q++) if (on(x0 + q, y0) && on(x0 + q, y0 - 1)) P(g, x0 + q, y0, 1, 1, vein);
        if (on(x0 + 2, y0 + 1) && on(x0 + 2, y0)) P(g, x0 + 2, y0 + 1, 1, 1, vein);
      }
    }
    /* LES FLEURS. Une CROIX de cinq pixels et un cœur d'une autre couleur —
       c'est le dessin de fleur des références de Guillaume, et il est lisible
       à 100 % de zoom. Le 437 posait des carrés de deux pixels : à cette
       taille, ça ne se lit pas comme une fleur, ça se lit comme une salissure.
       Elles se posent sur la COQUE (le bord du houppier) : une fleur pousse au
       bout d'une branche. */
    if (pal.petal && !sp.blossom) {
      let k = 0;
      for (const o of order) {
        const nb = pal.petalPer || 2;
        for (let i = 0; i < nb; i++) {
          const a = (k * 2.399 + i * 1.7);
          k++;
          const x = Math.round(o.x + Math.cos(a) * o.r * 0.72), y = Math.round(o.y + Math.sin(a) * o.r * 0.72);
          if (!on(x, y) || !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) continue;
          P(g, x - 1, y, 3, 1, pal.petal); P(g, x, y - 1, 1, 3, pal.petal);
          P(g, x, y, 1, 1, pal.petalC || pal.petal);
          if (pal.petalBig) { P(g, x - 1, y - 1, 1, 1, pal.petal); P(g, x + 1, y + 1, 1, 1, pal.petal); }
        }
      }
    }
    if (pal.fruit) {
      let k = 0;
      for (const o of order) {
        if ((k++ % 2)) continue;
        const a = 0.9 + k * 1.9;
        const x = Math.round(o.x + Math.cos(a) * o.r * 0.66), y = Math.round(o.y + Math.sin(a) * o.r * 0.66);
        if (!on(x, y) || !on(x + 1, y + 1) || !on(x - 1, y - 1)) continue;
        P(g, x - 1, y, 3, 3, pal.fruit);
        P(g, x - 1, y - 1, 1, 1, pal.fruitL); P(g, x, y - 1, 1, 1, pal.fruitL);
        P(g, x + 1, y + 1, 1, 1, pal.fruitD);
        P(g, x, y - 2, 1, 1, "#4a3a22");                     // le pédoncule
      }
    }
    /* LE PORT RETOMBANT DU SAULE : des rameaux d'UN pixel, longs, qui partent du
       bord inférieur de la couronne. Ils sont espacés RÉGULIÈREMENT (tous les
       deux pixels) et leur longueur suit une onde : un semis de rameaux fait un
       rideau de perles, ce que le 437 a produit. */
    if (sp.weep) {
      /* ⚠️ UN RAMEAU PAR COLONNE, PAS UNE COLONNE SUR DEUX. Espacés, ils se
         lisent comme des gouttes qui tombent ; serrés, comme un rideau — et
         c'est un rideau, un saule. Leur longueur suit une onde lente : ce qui
         doit varier est l'ourlet du rideau, pas la présence des fils. */
      for (let x = 4; x < TW_ - 4; x++) {
        let low = -1;
        for (let y = 1; y < TH_ - 1; y++) if (mask[y * TW_ + x]) low = y;
        if (low < 0) continue;
        const edgeF = 0.45 + 0.55 * Math.sin((x - 24) / 13 * 1.6 + 1.57);   // long au centre, court aux bouts
        const len = Math.round(sp.weep * Math.max(0.22, edgeF) * (0.78 + 0.22 * Math.sin(x * 1.7 + frame)));
        const col = (x % 3 === 0) ? leafD : (x % 3 === 1) ? leaf : leafL;
        for (let q = 1; q <= len && low + q < TBASE_ - 2; q++) {
          const xx = x + ((q > len * 0.62) ? (x < 24 ? -1 : 1) : 0);
          if (xx < 1 || xx >= TW_ - 1) break;
          P(g, xx, low + q, 1, 1, q === len ? pal.out : col);
        }
      }
    }
    return c;
  }
  /* LES CONIFÈRES. ⚠️ CE QUI FAIT LIRE « SAPIN » EST LE FESTON DES BRANCHES,
     pas l'empilement de triangles — c'est ce que faisait `pineTree` depuis le
     zip 232, et ça se lit comme un arbre de Noël en carton. Chaque étage a donc
     un bord inférieur en DENTS, un côté clair, un côté sombre et un cerne. */
  function townConifer(g, sp, pal, frame) {
    const [nd, ndL, ndD] = pal.leaf;
    const bot = TBASE_, top = sp.crownTop, tiers = sp.tiers;
    P(g, 24 - (sp.tw >> 1), bot - sp.bare, sp.tw, sp.bare, sp.trunk[0]);
    P(g, 24 - (sp.tw >> 1), bot - sp.bare, 1, sp.bare, sp.trunk[2]);
    P(g, 24 - (sp.tw >> 1) + sp.tw - 1, bot - sp.bare, 1, sp.bare, sp.trunk[2]);
    P(g, 19, bot - 2, 10, 2, sp.trunk[2]);
    const span = bot - sp.bare - top;
    const mask = new Uint8Array(TW_ * TH_);
    for (let i = 0; i < tiers; i++) {
      const yT = top + Math.round(i * span / tiers) - (i ? sp.overlap : 0);
      const yB = top + Math.round((i + 1) * span / tiers) + sp.overlap;
      const half = sp.halfTop + (sp.halfBot - sp.halfTop) * ((i + 1) / tiers);
      const sway = frame * (1 - i / tiers) * 1.6;
      for (let y = yT; y <= yB && y < TH_ - 1; y++) {
        const t = (y - yT) / Math.max(1, yB - yT);
        const hw = half * (0.22 + 0.78 * t);
        const cxs = 24 + sway * (1 - t);
        for (let x = Math.max(1, Math.round(cxs - hw) - 2); x <= Math.min(TW_ - 2, Math.round(cxs + hw) + 2); x++) {
          // Le feston : la branche dépasse de zéro à deux pixels, colonne par
          // colonne, selon une dent de scie CALCULÉE — même colonne, même dent,
          // donc les étages s'empilent au lieu de grésiller.
          const jag = (t > 0.72) ? (((x * 3) % 7 < 3) ? 2 : 0) : 0;
          if (Math.abs(x - cxs) > hw + jag) continue;
          const d = (x - cxs) / Math.max(1, hw);
          P(g, x, y, 1, 1, d < -0.30 ? ndL : d > 0.42 ? ndD : nd);
          mask[y * TW_ + x] = 1;
        }
      }
      // L'ombre portée de l'étage sur celui du dessous : c'est elle qui creuse.
      for (let x = Math.max(1, Math.round(24 - half)); x <= Math.min(TW_ - 2, Math.round(24 + half)); x++) {
        const yy = Math.min(TH_ - 2, yB);
        if (mask[yy * TW_ + x]) P(g, x, yy, 1, 1, pal.edge);
      }
    }
    const on = (x, y) => (x < 1 || y < 1 || x >= TW_ - 1 || y >= TH_ - 1) ? 0 : mask[y * TW_ + x];
    for (let y = 1; y < TH_ - 1; y++) for (let x = 1; x < TW_ - 1; x++) {
      if (!mask[y * TW_ + x]) continue;
      if (on(x + 1, y) && on(x - 1, y) && on(x, y + 1) && on(x, y - 1)) continue;
      P(g, x, y, 1, 1, pal.out);
    }
    // La flèche, bornée à y = 1 : le §4 en flagrant délit au 437 (elle sortait).
    const spY = Math.max(1, top - 3);
    P(g, 24 + Math.round(frame * 1.4), spY, 1, 4, ndL);
    if (pal.cone) for (let i = 0; i < tiers - 1; i++) {
      const y = top + Math.round((i + 0.8) * span / tiers);
      const x = 24 + (i % 2 ? 4 + i : -5 - i);
      if (on(x, y)) { P(g, x, y, 2, 3, pal.cone); P(g, x, y, 1, 1, "#8a6d47"); }
    }
  }

  /* LA TABLE DES ESSENCES. Une ligne par arbre, et rien d'autre que ce qui le
     distingue : la couronne (centre, rayons de l'ellipse porteuse, nombre et
     taille des bouquets), la palette, la floraison, le fruit, le port.
     ⚠️ L'ORDRE EST CELUI DE `TT` (module) et il ne se réarrange pas : c'est
     l'indice qui désigne l'essence.
     ⚠️ `out` EST LE CERNE EXTÉRIEUR ET `edge` L'ARC D'OMBRE INTERNE — deux
     valeurs distinctes, et c'est important : un cerne aussi sombre que les
     ombres internes ferme le dessin comme un autocollant, un cerne trop clair
     et l'arbre n'a plus de bord. */
  const TREE_SPECS = [
    { id: "oak", tw: 8, trunkTop: 31,
      crown: { cx: 24, cy: 23, rx: 11.4, ry: 9.6, n: 9, rad: 7.6, radVar: 1.0, phase: 0.35,
               inner: [[-4, 1, 7], [5, 2, 6.6], [0, -4, 6.2]] },
      trunk: ["#6b4b2d", "#8a6640", "#432c19"],
      leaf: ["#3f8a37", "#63bb52", "#28601f"], edge: "#1c4716", out: "#123309", vein: "#7ccb63",
      autumn: { leaf: ["#c07c26", "#e8ad3c", "#8a4d12"], edge: "#5c320a", out: "#3d2007", vein: "#f7cd6a" },
      spring: { leaf: ["#4a9b3d", "#6fc95c", "#2e6c24"], edge: "#215019", out: "#153a0d", vein: "#8ada6f" } },
    { id: "maple", tw: 7, trunkTop: 29,
      crown: { cx: 24, cy: 21, rx: 10.2, ry: 10.8, n: 9, rad: 7.2, radVar: 1.2, phase: 1.15,
               inner: [[-3, 3, 6.8], [4, 3, 6.4], [0, -5, 6.4]] },
      trunk: ["#66452e", "#84603f", "#3f2a1a"],
      leaf: ["#4a9134", "#6fbc4d", "#2d6420"], edge: "#1e4a15", out: "#123207", vein: "#88d160",
      autumn: { leaf: ["#c2512a", "#ec8340", "#872c11"], edge: "#521c07", out: "#361105", vein: "#f7a866" },
      spring: { leaf: ["#54a03c", "#7ac957", "#357528"], edge: "#245418", out: "#163c0c", vein: "#93dd72" } },
    /* ⚠️ `lean` A ÉTÉ RETIRÉ DU BOULEAU (439, 2e passe). Il décalait le fût de
       trois pixels vers la droite en haut, sous une couronne centrée sur x=24 :
       le tronc sortait du houppier de travers. Un arbre penché doit pencher
       AVEC sa couronne — tant que `crownClumps` ne suit pas le `lean`, le seul
       réglage juste est zéro. C'est le deuxième des trois défauts photographiés
       par Guillaume, et c'est celui qu'il a nommé : « le bouleau est désaxé ». */
    { id: "birch", tw: 5, trunkTop: 24, birchBands: true,
      crown: { cx: 24, cy: 19, rx: 7.6, ry: 10.0, n: 8, rad: 7.0, radVar: 0.9, phase: 2.5,
               /* ⚠️ TROIS BOUQUETS AU CŒUR, ET C'EST OBLIGATOIRE quand l'ellipse
                  porteuse est étroite : à huit bouquets sur un anneau de 7,6 de
                  rayon, le centre n'est couvert par personne et le houppier sort
                  en BEIGNET — vu sur `render-arbres.mjs` à la première passe. */
               inner: [[-2, 3, 6.4], [3, 1, 6.2], [0, -3, 6.0], [0, 5, 5.8]] },
      trunk: ["#e2ded2", "#f7f4ec", "#8b867c"],
      leaf: ["#63ac45", "#8ad462", "#3f8129"], edge: "#2a5c1c", out: "#1a3d0f", vein: "#a3e17c",
      autumn: { leaf: ["#d3b033", "#f4dd5d", "#96721a"], edge: "#63470b", out: "#402d05", vein: "#fbec8b" },
      spring: { leaf: ["#71ba4c", "#9adc70", "#4c9432"], edge: "#316a20", out: "#204512", vein: "#b0e98a" } },
    { id: "willow", tw: 7, trunkTop: 36, weep: 22,
      crown: { cx: 24, cy: 19, rx: 11.6, ry: 7.6, n: 10, rad: 7.6, radVar: 0.9, phase: 3.0,
               inner: [[-4, 2, 6.8], [5, 2, 6.6], [0, -2, 6.4]] },
      trunk: ["#6a5537", "#877049", "#443521"],
      leaf: ["#7cae46", "#a4da65", "#55842c"], edge: "#3a641c", out: "#254210", vein: "#bde881",
      autumn: { leaf: ["#c3ac3a", "#e6d55f", "#8b7616"], edge: "#5d4a0b", out: "#3c3006", vein: "#f4e58a" },
      spring: { leaf: ["#8fbe4f", "#b5e372", "#66993a"], edge: "#457621", out: "#2c4e13", vein: "#cbef95" } },
    { id: "magnolia", tw: 7, trunkTop: 30,
      crown: { cx: 24, cy: 22, rx: 10.6, ry: 10.0, n: 9, rad: 7.2, radVar: 1.0, phase: 0.8,
               inner: [[-3, 2, 6.6], [4, 3, 6.2], [1, -4, 6.0]] },
      trunk: ["#5d4837", "#7b6349", "#3a2a1e"],
      leaf: ["#3f8a45", "#5fb267", "#27612d"], edge: "#164321", out: "#0e2c16", vein: "#7ac783",
      /* ⚠️ LE MAGNOLIA EST L'ARBRE ROSE DE LA PLANCHE DE RÉFÉRENCE, et il ne
         l'était pas : le 437 lui donnait des fleurs blanc crème sur un
         houppier vert plein. Six corolles roses de onze pixels, c'est ce que
         montre la planche, et c'est la seule essence qu'on y reconnaît au
         premier coup d'œil. */
      blossom: { cx: 24, cy: 21, rx: 11.6, ry: 9.6, n: 6, rad: 5.6, phase: 0.5,
                 inner: [[-1, -3, 5.2], [2, 5, 5.0]] },
      petal: "#efa0c4", petalL: "#fbd6e6", petalD: "#b2537f", petalC: "#f2d45e",
      autumn: { leaf: ["#b98a35", "#dcb554", "#7c5514"], edge: "#4c3308", out: "#312105", vein: "#f0cf78", petal: null },
      spring: { leaf: ["#4a9450", "#6cbb74", "#2f6935"], edge: "#1c4c26", out: "#123219", vein: "#88d190",
                petal: "#f4b0d0", petalL: "#ffe4ef", petalD: "#bd6090", petalC: "#f6de78" } },
    { id: "cherry", tw: 7, trunkTop: 31,
      crown: { cx: 24, cy: 22, rx: 10.8, ry: 9.8, n: 9, rad: 7.2, radVar: 1.0, phase: 1.9,
               inner: [[-3, 3, 6.4], [4, 2, 6.4], [0, -4, 6.0]] },
      trunk: ["#59422f", "#775c46", "#372619"],
      leaf: ["#469049", "#68b96c", "#2b6631"], edge: "#194723", out: "#0f2f17", vein: "#82cd88",
      // Le cerisier est le rose PÂLE : c'est ce qui le distingue du magnolia,
      // qui partage sa forme. Deux arbres roses identiques ne font qu'un arbre.
      blossom: { cx: 24, cy: 22, rx: 11.4, ry: 9.4, n: 6, rad: 5.4, phase: 2.0,
                 inner: [[0, -4, 5.0], [-2, 4, 5.0]] },
      petal: "#f7bcd4", petalL: "#ffe8f2", petalD: "#c06a90", petalC: "#f8e59a",
      autumn: { leaf: ["#c06a3a", "#e29a5f", "#833d17"], edge: "#4d2409", out: "#331706", vein: "#f0b183", petal: null },
      spring: { leaf: ["#5aa055", "#7fc87c", "#3a763c"], edge: "#245328", out: "#17371a", vein: "#9bd897",
                petal: "#fbc8dd", petalL: "#fff2f7", petalD: "#c87698", petalC: "#fbeaa8" } },
    { id: "mimosa", tw: 6, trunkTop: 32,
      crown: { cx: 24, cy: 23, rx: 11.0, ry: 8.8, n: 9, rad: 7.0, radVar: 1.1, phase: 5.4,
               inner: [[-4, 1, 6.4], [4, 2, 6.2], [0, -4, 5.8]] },
      trunk: ["#67573a", "#847148", "#413425"],
      leaf: ["#4f8f52", "#72b876", "#2f6334"], edge: "#1c4622", out: "#122d16", vein: "#8ecd92",
      /* ⚠️ LE MIMOSA EST EN POMPONS, PAS EN COROLLES (`puff`). Cinq pétales sur
         une fleur de neuf pixels ne se lisent pas : ce qui fait reconnaître un
         mimosa est une BOULE duveteuse, et il en faut beaucoup. Sept boules
         plus deux au cœur, plus petites que les corolles du magnolia. */
      blossom: { cx: 24, cy: 23, rx: 11.2, ry: 8.6, n: 7, rad: 4.6, phase: 5.0, puff: true,
                 inner: [[-2, -3, 4.4], [3, 3, 4.2]] },
      petal: "#f0cb34", petalL: "#fff08a", petalD: "#a87c12", petalC: "#fff6b0",
      autumn: { petal: "#dcb930", petalL: "#f4dd6c", petalD: "#96690c", petalC: "#f8e58a" },
      spring: { petal: "#f8db4a", petalL: "#fffbc0", petalD: "#bb8c18", petalC: "#fffbd0" } },
    { id: "apple", tw: 7, trunkTop: 32,
      crown: { cx: 24, cy: 23, rx: 10.8, ry: 9.4, n: 9, rad: 7.2, radVar: 0.9, phase: 2.2,
               inner: [[-3, 2, 6.6], [4, 3, 6.2], [0, -4, 6.0]] },
      trunk: ["#68482c", "#87643f", "#432c18"],
      leaf: ["#3d8639", "#5fb251", "#26601f"], edge: "#164318", out: "#0e2c0d", vein: "#79c667",
      fruit: "#cb332c", fruitL: "#ee6a60", fruitD: "#7f1714",
      autumn: { leaf: ["#bf8c2c", "#e0b34a", "#7f5713"], edge: "#4d3308", out: "#312005", vein: "#f2cf72",
                fruit: "#b4271d", fruitL: "#d75a50", fruitD: "#6d120f" },
      spring: { leaf: ["#4a9440", "#6fbe5f", "#2f6a2a"], edge: "#1e4c1a", out: "#13320f", vein: "#88d178",
                fruit: null, petal: "#fbeef2", petalC: "#f3d76a", petalPer: 3, petalBig: true } },
    { id: "fir", conifer: true, tw: 6, bare: 6, crownTop: 5, tiers: 6,
      halfTop: 4.0, halfBot: 17.5, overlap: 2,
      trunk: ["#5b432b", "#75593b", "#3a2a1a"],
      leaf: ["#2f6c4c", "#489c70", "#194030"], edge: "#123528", out: "#0a2118", cone: "#6a5334",
      autumn: { leaf: ["#2c6446", "#438f66", "#173a2b"], edge: "#0f2e22", out: "#081c14" },
      spring: { leaf: ["#357a56", "#54ae7d", "#1d4b37"], edge: "#153c2c", out: "#0b261b" } },
    { id: "pine", conifer: true, tw: 6, bare: 22, crownTop: 4, tiers: 3,
      halfTop: 5.0, halfBot: 15.0, overlap: 3,
      trunk: ["#7c5531", "#9a6d42", "#4e3320"],
      leaf: ["#356b3c", "#519d5b", "#1c4423"], edge: "#123020", out: "#0a1c12", cone: "#6f5230",
      autumn: { leaf: ["#33663a", "#4d9556", "#1a3f21"], edge: "#102c1d", out: "#09190f" },
      spring: { leaf: ["#3d7a44", "#5cae67", "#214d28"], edge: "#153724", out: "#0c2214" } },
    { id: "cypress", conifer: true, tw: 4, bare: 4, crownTop: 4, tiers: 7,
      halfTop: 3.0, halfBot: 8.0, overlap: 2,
      trunk: ["#52432e", "#6b5940", "#352a1c"],
      leaf: ["#2a5c3f", "#3d8557", "#163828"], edge: "#0e2a1a", out: "#071810" },
  ];

  // Arbre mort, sans feuilles (chantier 2026-07, demande Guillaume : arbres
  // morts pour l'ambiance de la carte maléfique) : même gabarit 32x48 que
  // oakTree/pineTree (mêmes offsets d'ancrage dans drawEvilFrame), mais tronc
  // et branches nus — pas de bosquet de feuillage, juste une silhouette de
  // bois mort tracée au trait (branches anguleuses qui se ramifient), pour
  // trancher visuellement avec les arbres vivants encore présents ailleurs
  // sur la carte maléfique.
  function deadTree() {
    const [c, g] = cv(32, 48);
    const bark = "#3a342e", barkD = "#231f1a";
    P(g, 14, 30, 5, 16, bark);
    P(g, 14, 30, 2, 16, barkD);
    P(g, 11, 44, 3, 2, bark); P(g, 18, 44, 3, 2, barkD);
    g.strokeStyle = barkD; g.lineWidth = 2; g.lineCap = "round";
    const branches = [
      [16, 30, 7, 15], [16, 27, 25, 13], [16, 21, 5, 7], [16, 19, 27, 9],
      [16, 15, 11, 3], [16, 15, 21, 5], [11, 3, 8, 0], [21, 5, 25, 2],
    ];
    for (const [x1, y1, x2, y2] of branches) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    const r = makeRnd(45);
    for (let i = 0; i < 6; i++) P(g, 5 + ((r() * 22) | 0), 3 + ((r() * 16) | 0), 1, 1, barkD);
    return c;
  }
  function stump() {
    const [c, g] = cv(T, T);
    P(g, 4, 6, 8, 8, "#7a5330"); P(g, 4, 6, 8, 3, "#c8a878");
    P(g, 6, 7, 4, 1, "#a8865a"); P(g, 3, 12, 3, 3, "#6a4528"); P(g, 11, 12, 3, 2, "#6a4528");
    return c;
  }
  function rock() {
    const [c, g] = cv(T, T);
    P(g, 3, 6, 10, 8, "#8a8a92");
    P(g, 5, 4, 7, 3, "#8a8a92");
    P(g, 4, 5, 5, 4, "#a2a2aa");
    P(g, 10, 8, 3, 4, "#72727a");
    P(g, 3, 12, 10, 2, "#66666e");
    P(g, 6, 6, 2, 1, "#c2c2ca");
    return c;
  }
  // ---- Helpers des bâtiments refondus (maquettes validées 2026-07) ----
  // Porte en planches (cadre sombre, poignée dorée), 16x26 posée en (x,y).
  function bDoor(g, x, y) {
    P(g, x - 1, y, 16, 26, "#4a3826");
    P(g, x, y + 1, 14, 25, "#7a5330");
    for (let i = x + 2; i < x + 13; i += 3) P(g, i, y + 2, 1, 22, "#6a4426");
    P(g, x, y + 1, 14, 2, "#8a6340");
    P(g, x + 11, y + 12, 1, 1, "#e8c85a"); P(g, x + 11, y + 13, 1, 1, "#c8a83a");
  }
  // Fenêtre à croisillons + jardinière fleurie, 16x15 posée en (x,y).
  function bWindow(g, x, y) {
    P(g, x - 1, y - 1, 16, 13, "#4a3826");
    P(g, x, y, 14, 11, "#a8d4e8");
    P(g, x, y, 14, 3, "#d0ecf6");
    P(g, x + 7, y, 1, 11, "#4a3826"); P(g, x, y + 5, 14, 1, "#4a3826");
    P(g, x - 2, y + 12, 18, 2, "#6a4a2c");
    for (let i = 0; i < 3; i++) { P(g, x + 2 + i * 4, y + 11, 1, 1, "#d4504a"); P(g, x + 3 + i * 4, y + 11, 1, 1, "#e8842a"); }
  }
  // Rangée de moellons irréguliers (pierre) : rangs décalés, tons variés.
  function bStones(g, x, y, w, h, r, tones, bh) {
    P(g, x, y, w, h, "#6f6f78");
    let row = 0;
    for (let yy = y; yy < y + h; yy += bh) {
      const hh = Math.min(bh, y + h - yy);
      let xx = x + (row % 2 ? -3 : 0);
      while (xx < x + w) {
        const bw = 5 + Math.floor(r() * 5);
        const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1);
        if (x1 > x0) { P(g, x0, yy, x1 - x0, hh - 1, tones[Math.floor(r() * tones.length)]); P(g, x0, yy, 1, 1, tones[1]); }
        xx += bw;
      }
      row++;
    }
  }
  // Cheminée en pierre (commune aux maisons niv 2/3).
  function bChimney(g) {
    P(g, 66, 12, 12, 20, "#8a8a92"); P(g, 64, 10, 16, 4, "#72727a");
    for (let y = 14; y < 30; y += 4) P(g, 67, y, 10, 1, "#7a7a84");
  }
  // Maison NIVEAU 2 (maquette A validée) : colombages + toit de chaume +
  // soubassement en pierre. Même canevas 96x96 et même ancrage au sol que
  // house() (niveau 1) : aucun changement de position de rendu nécessaire.
  function houseLvl2() {
    const [c, g] = cv(96, 96);
    const r = makeRnd(72);
    // soubassement pierre
    bStones(g, 8, 78, 80, 10, r, ["#9a9aa4", "#b8b8c2", "#84848e", "#9a9aa4"], 5);
    // mur enduit clair (grain léger) + poutres de colombage
    P(g, 8, 46, 80, 32, "#e6d9bc");
    for (let i = 0; i < 90; i++) P(g, 8 + Math.floor(r() * 80), 46 + Math.floor(r() * 32), 1, 1, "#efe4ca");
    P(g, 8, 46, 80, 2, "#5a4028"); P(g, 8, 76, 80, 2, "#5a4028");
    P(g, 8, 46, 2, 32, "#5a4028"); P(g, 86, 46, 2, 32, "#5a4028");
    P(g, 34, 46, 2, 32, "#5a4028"); P(g, 60, 46, 2, 32, "#5a4028");
    for (let i = 0; i < 28; i++) { P(g, 10 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); P(g, 62 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); }
    // toit de chaume : rangées de paille, ourlet de mèches en bord
    for (let i = 0; i < 38; i++) {
      const half = Math.floor(44 * i / 38);
      const col = i % 3 === 0 ? "#8f6c2c" : (i % 2 ? "#c89a48" : "#d8ac54");
      P(g, 48 - half, 8 + i, Math.max(1, half * 2), 1, col);
    }
    for (let i = 0; i < 30; i++) P(g, 6 + Math.floor(r() * 84), 45 + Math.floor(r() * 2), 1, 1, "#8f6c2c");
    P(g, 44, 5, 8, 4, "#e0b862"); // faîtage
    bChimney(g);
    bDoor(g, 42, 62);
    bWindow(g, 16, 58); bWindow(g, 70, 58);
    return c;
  }
  // Maison NIVEAU 3 (maquette B validée) : murs en pierre appareillée + toit
  // de tuiles rouges + auvent bois au-dessus de la porte. Même canevas 96x96.
  function houseLvl3() {
    const [c, g] = cv(96, 96);
    const r = makeRnd(113);
    // mur en pierre
    bStones(g, 8, 46, 80, 42, r, ["#b8b0a2", "#d0c8ba", "#a09888", "#b8b0a2"], 6);
    // toit de tuiles rouges (écailles marquées un rang sur deux)
    for (let i = 0; i < 40; i++) {
      const half = Math.floor(44 * i / 40);
      const y0 = 8 + i;
      if (i % 4 === 0) P(g, 48 - half, y0, Math.max(1, half * 2), 1, "#7c2a22");
      else {
        P(g, 48 - half, y0, Math.max(1, half * 2), 1, "#c04a3c");
        if (i % 2 === 0) for (let xx = 48 - half; xx < 48 + half; xx += 5) { P(g, xx, y0, 1, 1, "#7c2a22"); P(g, xx + 1, y0, 1, 1, "#d4635a"); }
      }
    }
    P(g, 0, 46, 96, 3, "#6a241e"); // rive de toit
    bChimney(g);
    // auvent bois au-dessus de la porte
    P(g, 38, 56, 22, 3, "#8a3028"); P(g, 39, 59, 2, 4, "#6a4a2c"); P(g, 56, 59, 2, 4, "#6a4a2c");
    bDoor(g, 42, 62);
    bWindow(g, 16, 58); bWindow(g, 70, 58);
    return c;
  }
  function house() {
    const [c, g] = cv(96, 96);
    P(g, 8, 46, 80, 42, "#c8a878");
    for (let y = 50; y < 88; y += 6) P(g, 8, y, 80, 1, "#b89868");
    g.fillStyle = "#a83c30";
    g.beginPath(); g.moveTo(0, 48); g.lineTo(48, 6); g.lineTo(96, 48); g.fill();
    g.fillStyle = "#c04a3c";
    g.beginPath(); g.moveTo(6, 46); g.lineTo(48, 10); g.lineTo(90, 46); g.lineTo(84, 46); g.lineTo(48, 15); g.lineTo(12, 46); g.fill();
    P(g, 0, 46, 96, 4, "#8a3028");
    P(g, 68, 12, 10, 18, "#8a8a92"); P(g, 66, 10, 14, 4, "#72727a");
    P(g, 42, 62, 14, 26, "#7a5330"); P(g, 44, 64, 10, 24, "#8a6340");
    P(g, 52, 75, 2, 2, "#e8c85a");
    for (const wx of [16, 68]) {
      P(g, wx, 58, 14, 12, "#5a4530");
      P(g, wx + 1, 59, 12, 10, "#a8d4e8"); P(g, wx + 1, 59, 12, 4, "#c8e8f4");
      P(g, wx + 6, 59, 1, 10, "#5a4530"); P(g, wx + 1, 63, 12, 1, "#5a4530");
      P(g, wx - 1, 70, 16, 2, "#7a5330");
    }
    return c;
  }
  function shopStand() {
    // Étal refondu (maquette validée 2026-07) : auvent rayé à lambrequins,
    // comptoir en planches veinées, cagettes de produits colorés.
    const [c, g] = cv(24, 28);
    const r = makeRnd(4);
    P(g, 2, 12, 20, 12, "#9a6b3f");
    for (let x = 2; x < 22; x += 4) { P(g, x, 12, 1, 12, "#6f4b2a"); P(g, x + 1 + Math.floor(r() * 2), 13 + Math.floor(r() * 9), 1, 2, "#875c34"); }
    P(g, 1, 10, 22, 2, "#b8834f"); P(g, 1, 10, 22, 1, "#d09a5e"); // plateau
    for (let i = 0; i < 6; i++) {
      const col = i % 2 ? "#efe9da" : "#d44a3f";
      P(g, 1 + i * 4, 2, 4, 5, col);
      P(g, 2 + i * 4, 7, 2, 2, col); // pointe de lambrequin
    }
    P(g, 0, 1, 24, 2, "#b03a30");
    P(g, 3, 24, 2, 4, "#7a5330"); P(g, 19, 24, 2, 4, "#7a5330"); // pieds
    const prods = ["#e8842a", "#e03e2e", "#b46ee0"];
    for (let b = 0; b < 3; b++) {
      const bx = 3 + b * 7;
      P(g, bx, 7, 6, 3, "#8a6340"); P(g, bx, 7, 6, 1, "#a87745");
      for (let i = 0; i < 3; i++) P(g, bx + 1 + i * 2, 7, 1, 1, prods[b]);
    }
    return c;
  }

  function sellBin() {
    const [c, g] = cv(20, 18);
    P(g, 1, 4, 18, 13, "#8a6340");
    P(g, 0, 2, 20, 4, "#a87745");
    P(g, 2, 6, 16, 9, "#5a3d28");
    P(g, 3, 3, 2, 1, "#7a5330"); P(g, 15, 3, 2, 1, "#7a5330");
    P(g, 6, 0, 8, 4, "#e8c85a"); P(g, 8, 1, 4, 2, "#c8a83a");
    return c;
  }

  /* ---------------- Canne à sucre (chantier sucrerie, sprite dédié) ----------------
   * Contrairement aux autres cultures (canevas T×T), la canne mûre dépasse la
   * hauteur d'une tuile : canevas T large × T*2 haut, ANCRÉ PAR LE BAS (voir
   * FermeGame.js, dessin des cultures). Tiges segmentées avec nœuds
   * pourpre-brun, dégradé vert -> doré assombri vers la base aux stades avancés,
   * panache plumeux au stade mûr (100%).
   */
  function caneSprite(stage) {
    const H2 = T * 2;
    const [c, g] = cv(T, H2);
    const green = "#5aa93e", greenD = "#3f7a2a", leaf = "#7fcf52";
    const node = "#6a4a3a"; // nœud pourpre-brun
    const gold = "#c99a2e", goldD = "#8a6a1e";

    function stalk(x, yTop, h, w, mature) {
      // tige segmentée : alternance couleur + nœuds pourpre-brun tous les 4px
      for (let seg = 0; seg < h; seg += 4) {
        const y = yTop + seg;
        const segH = Math.min(4, h - seg);
        const fromBase = h - seg; // distance à la base
        let col = green;
        if (mature) {
          // dégradé vert -> doré assombri en approchant de la base
          col = fromBase <= h * 0.4 ? gold : (fromBase <= h * 0.6 ? goldD : green);
        }
        P(g, x, y, w, segH, col);
        if (seg + 4 < h) P(g, x, y + segH - 1, w, 1, node);
      }
      P(g, x, yTop, w, 1, mature ? "#8a7a3a" : greenD); // ombrage colonne haut de tige
    }

    if (stage === 0) {
      // pousse : 2 tiges courtes
      stalk(6, H2 - 6, 6, 2, false);
      stalk(9, H2 - 5, 5, 2, false);
      P(g, 6, H2 - 8, 2, 2, leaf); P(g, 9, H2 - 7, 2, 2, leaf);
    } else if (stage === 1) {
      stalk(5, H2 - 11, 11, 2, false);
      stalk(9, H2 - 9, 9, 2, false);
      P(g, 4, H2 - 13, 3, 2, leaf); P(g, 9, H2 - 11, 3, 2, leaf); P(g, 12, H2 - 9, 2, 2, leaf);
    } else if (stage === 2) {
      stalk(4, H2 - 17, 17, 2, false);
      stalk(7, H2 - 20, 20, 2, false);
      stalk(10, H2 - 16, 16, 2, false);
      P(g, 3, H2 - 20, 3, 2, leaf); P(g, 6, H2 - 23, 4, 2, leaf); P(g, 10, H2 - 19, 3, 2, leaf);
    } else if (stage === 3) {
      stalk(3, H2 - 24, 24, 2, true);
      stalk(7, H2 - 28, 28, 2, true);
      stalk(11, H2 - 23, 23, 2, true);
      P(g, 2, H2 - 27, 3, 2, leaf); P(g, 6, H2 - 31, 4, 2, leaf); P(g, 11, H2 - 26, 3, 2, leaf);
      // feuilles basses fanées
      P(g, 2, H2 - 8, 3, 1, "#8a7a3a"); P(g, 11, H2 - 6, 3, 1, "#8a7a3a");
    } else {
      // stade mûr : tiges pleine hauteur, nœuds marqués, dégradé doré à la
      // base, panache plumeux en tête.
      stalk(3, H2 - 30, 30, 2, true);
      stalk(7, H2 - 32, 32, 2, true);
      stalk(11, H2 - 29, 29, 2, true);
      // panache plumeux (au-dessus des tiges)
      P(g, 5, H2 - 32, 2, 3, "#e8dfa0"); P(g, 8, H2 - 34, 2, 3, "#f4ecc4"); P(g, 11, H2 - 31, 2, 3, "#e8dfa0");
      P(g, 6, H2 - 34, 1, 2, "#efe6b0"); P(g, 9, H2 - 36, 1, 2, "#f8f2d8");
      // feuillage vert restant en haut de tige
      P(g, 2, H2 - 27, 3, 2, leaf); P(g, 6, H2 - 30, 4, 2, leaf); P(g, 11, H2 - 26, 3, 2, leaf);
      // feuilles basses fanées
      P(g, 2, H2 - 6, 3, 1, "#8a7a3a"); P(g, 6, H2 - 4, 4, 1, "#6a5a2a"); P(g, 11, H2 - 5, 3, 1, "#8a7a3a");
    }
    return c;
  }

  /* ---------------- Cultures (4 types × 5 stades) ---------------- */
  function cropSprite(type, stage) {
    if (type === 8) return caneSprite(stage); // canne à sucre : sprite dédié, canevas T×(T*2)
    const [c, g] = cv(T, T);
    const info = C.CROPS[type];
    const green = "#4a9a3a", greenD = "#3a7a2c";
    if (stage === 0) {
      P(g, 7, 11, 2, 3, green); P(g, 6, 10, 1, 2, greenD); P(g, 9, 10, 1, 2, greenD);
    } else if (stage === 1) {
      P(g, 7, 8, 2, 6, green); P(g, 5, 9, 2, 2, greenD); P(g, 9, 9, 2, 2, greenD); P(g, 7, 7, 2, 1, "#63b653");
    } else if (stage === 2) {
      P(g, 7, 6, 2, 8, greenD); P(g, 4, 8, 3, 2, green); P(g, 9, 7, 3, 2, green); P(g, 5, 5, 6, 3, green);
    } else if (stage === 3) {
      P(g, 7, 4, 2, 10, greenD); P(g, 3, 7, 4, 3, green); P(g, 9, 6, 4, 3, green); P(g, 4, 3, 8, 4, green);
      P(g, 7, 3, 2, 2, info.color);
    } else {
      if (type === 3) {
        P(g, 3, 6, 10, 8, info.top); P(g, 4, 7, 8, 6, info.color);
        P(g, 5, 7, 2, 6, "#f09a45"); P(g, 9, 7, 2, 6, "#d67520");
        P(g, 7, 4, 2, 3, "#4a7a2c");
      } else if (type === 0) {
        P(g, 5, 2, 6, 4, green); P(g, 6, 1, 4, 2, "#63b653"); P(g, 7, 5, 2, 3, greenD);
        P(g, 4, 8, 8, 6, info.color); P(g, 5, 8, 6, 2, "#f4ecf8"); P(g, 6, 13, 4, 1, info.top);
      } else if (type === 1) {
        P(g, 6, 3, 4, 6, green); P(g, 4, 4, 3, 3, greenD); P(g, 9, 4, 3, 3, greenD);
        P(g, 3, 10, 4, 3, info.color); P(g, 9, 10, 4, 3, info.color); P(g, 6, 11, 4, 3, info.top);
      } else {
        P(g, 7, 3, 2, 11, greenD); P(g, 4, 5, 3, 2, green); P(g, 9, 6, 3, 2, green); P(g, 5, 2, 6, 3, green);
        P(g, 4, 8, 3, 3, info.color); P(g, 9, 9, 3, 3, info.color); P(g, 6, 11, 3, 3, info.color);
        P(g, 5, 8, 1, 1, "#f4a49a");
      }
    }
    return c;
  }

  /* ---------------- Personnages (H/F, 4 directions × 4 frames) ---------------- */
  // Zip 377 : ces deux-là sont désormais déclarées au niveau du module (et
  // exportées via charPalette, pour le défi de fuite). On les relit ici plutôt
  // que de les redéclarer — une seule source de vérité pour la couleur d'un
  // fermier, quel que soit le moteur qui le dessine.
  const HAIR_COLORS = CHAR_HAIR_COLORS;
  const SKIN = CHAR_SKIN, SKIN_D = "#d8a878";
  // Jérôme Martial (chantier sucrerie, demande Guillaume : "sa peau devra
  // être marron, pas blanche, et ses cheveux noirs et courts") — peau et
  // cheveux dédiés, réservés au résident sugarworker via le flag
  // `sugarWorker` (voir S.getChar/charSheet). Les cheveux courts n'ont besoin
  // d'aucune géométrie spéciale : la coupe masculine (gender === "m") posée
  // plus bas est déjà courte, on lui applique juste la couleur MARTIAL_HAIR.
  const MARTIAL_SKIN = "#8a5a34", MARTIAL_SKIN_D = "#6e4527", MARTIAL_HAIR = "#181818";

  // Zip 376 : `look` (CHAÎNE) au lieu d'un énième booléen. beeSuit/plaid/
  // cheeseHat/sugarWorker sont conservés tels quels (ils sont lus partout),
  // mais tout nouveau personnage passe désormais par ce paramètre unique :
  // la signature ne s'allonge plus d'un cran par tenue. Valeurs actuelles :
  // "carla" (béret rouge, manteau jaune, top noir) et "leo" (son assistant).
  function drawCharFrame(g, ox, gender, outfit, dir, frame, overalls, cap, beeSuit, plaid, cheeseHat, sugarWorker, look) {
    const o = C.OUTFITS[outfit % C.OUTFITS.length];
    const hair = sugarWorker ? MARTIAL_HAIR : HAIR_COLORS[outfit % HAIR_COLORS.length];
    const skin = sugarWorker ? MARTIAL_SKIN : SKIN;
    const skinD = sugarWorker ? MARTIAL_SKIN_D : SKIN_D;
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const bob = step !== 0 ? 1 : 0;
    const x = ox;

    if (gender === "f") {
      P(g, x + 4, 14 + bob, 8, 7, o.shirt);
      P(g, x + 3, 17 + bob, 10, 4, o.shirt);
      P(g, x + 3, 20 + bob, 10, 1, shade(o.shirt));
      P(g, x + 5 + (step > 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#6a4528");
      P(g, x + 9 - (step < 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#6a4528");
    } else {
      P(g, x + 5, 15 + bob, 3, 6, o.pants);
      P(g, x + 8, 15 + bob, 3, 6, shade(o.pants));
      P(g, x + 5 + step, 21 + bob, 3, 3 - bob, "#6a4528");
      P(g, x + 8 - step, 21 + bob, 3, 3 - bob, "#6a4528");
    }
    P(g, x + 4, 10 + bob, 8, (gender === "f" ? 5 : 6), o.shirt);
    P(g, x + 4, 10 + bob, 8, 1, tint(o.shirt));
    if (dir === 2) {
      P(g, x + 7 + step, 11 + bob, 2, 5, o.shirt);
      P(g, x + 7 + step, 15 + bob, 2, 1, skin);
    } else {
      P(g, x + 3, 11 + bob, 2, 5, o.shirt); P(g, x + 11, 11 + bob, 2, 5, o.shirt);
      P(g, x + 3, 15 + bob, 2, 1, skin); P(g, x + 11, 15 + bob, 2, 1, skin);
    }
    P(g, x + 4, 2 + bob, 8, 8, skin);
    P(g, x + 4, 9 + bob, 8, 1, skinD);
    if (gender === "f") {
      P(g, x + 3, 1 + bob, 10, 3, hair);
      P(g, x + 3, 3 + bob, 2, 8, hair); P(g, x + 11, 3 + bob, 2, 8, hair);
      P(g, x + 3, 10 + bob, 2, 3, hair); P(g, x + 11, 10 + bob, 2, 3, hair);
      if (dir === 1) P(g, x + 4, 3 + bob, 8, 6, hair);
      else P(g, x + 4, 1 + bob, 8, 2, hair);
      P(g, x + 12, 4 + bob, 1, 2, "#e85a8a");
    } else {
      P(g, x + 3, 1 + bob, 10, 3, hair);
      P(g, x + 3, 3 + bob, 1, 3, hair); P(g, x + 12, 3 + bob, 1, 3, hair);
      if (dir === 1) P(g, x + 4, 3 + bob, 8, 4, hair);
      else P(g, x + 4, 2 + bob, 8, 2, hair);
    }
    const mouth = sugarWorker ? "#4a2f1c" : "#c88a6a"; // ombre de bouche relative à la peau (peau marron -> ombre plus foncée que le clair "#c88a6a" par défaut, sinon elle ressortirait plus claire que la peau)
    if (dir === 0) {
      P(g, x + 6, 5 + bob, 1, 2, "#3a2a1e"); P(g, x + 9, 5 + bob, 1, 2, "#3a2a1e");
      P(g, x + 6, 8 + bob, 4, 1, mouth);
      if (gender === "f") { P(g, x + 5, 7 + bob, 1, 1, "#eeddaa"); P(g, x + 10, 7 + bob, 1, 1, "#f0a8a0"); }
    } else if (dir === 2) {
      P(g, x + 4, 3 + bob, 5, 5, hair);
      P(g, x + 10, 5 + bob, 1, 2, "#3a2a1e");
      P(g, x + 11, 7 + bob, 1, 1, mouth);
    }
    // Casquette de Soan (chantier 2026-07, révisée : "le chapeau doit être
    // son skin, vraiment faire partie de sa tête, et tourner avec lui quand
    // il marche") : avant, un simple emoji 🧢 flottant, dessiné par-dessus
    // le personnage à une position fixe à l'écran, sans lien avec le sens
    // de la marche (drawCharacter, FermeGame.js) — retiré, remplacé par du
    // vrai pixel art fusionné DANS le sprite lui-même (comme la salopette de
    // Greg juste en dessous). Dessinée ici, DANS `drawCharFrame`, elle suit
    // donc automatiquement `bob` (petit rebond de marche, comme le reste du
    // corps) et surtout le `flip`/`dir` gérés par `drawCharacter` : dir 0 =
    // face caméra (visière vers le bas, bien visible), dir 1 = dos tourné
    // (juste le dôme, pas de visière — cohérent, on ne verrait pas une
    // visière de dos), dir 2 = profil (visière vers l'avant du sens de la
    // marche ; le retournement gauche/droite est pris en charge par le
    // `ctx.scale(-1,1)` déjà appliqué à tout le sprite dans drawCharacter,
    // exactement comme les bras en profil juste au-dessus — aucune variante
    // gauche/droite à coder séparément ici).
    if (cap && !beeSuit) {
      const CAP = "#2f6f4a", CAP_D = shade(CAP), CAP_L = tint(CAP);
      P(g, x + 3, 0 + bob, 10, 3, CAP);
      P(g, x + 3, 0 + bob, 10, 1, CAP_L);
      P(g, x + 3, 2 + bob, 10, 1, CAP_D);
      if (dir === 0) {
        P(g, x + 3, 3 + bob, 10, 1, CAP_D);
        P(g, x + 3, 4 + bob, 4, 1, CAP_D); // visière, vers le bas/caméra
      } else if (dir === 2) {
        P(g, x + 3, 3 + bob, 10, 1, CAP_D);
        P(g, x + 10, 4 + bob, 3, 1, CAP_D); // visière, vers l'avant du profil
      }
      // dir === 1 (dos) : pas de visière, seulement le dôme ci-dessus.
    }
    // Salopette (chantier 2026-07, demande Guillaume : "Greg doit avoir une
    // salopette") : dessinée PAR-DESSUS le rendu de base (jambes + torse déjà
    // posés plus haut), pas un outfit de C.OUTFITS parmi ceux choisissables
    // par les joueurs — activée via le flag `overalls` (voir S.getChar/
    // charSheet), pour l'instant réservé à Greg (FermeGame.js, outfit: 0,
    // overalls: true). Jambes recolorées en denim + bavette + deux
    // bretelles, silhouette reconnaissable même en petit sprite 16x24.
    if (overalls) {
      const DENIM = "#3f5a8c", DENIM_D = shade(DENIM);
      P(g, x + 5, 15 + bob, 3, 6, DENIM);
      P(g, x + 8, 15 + bob, 3, 6, DENIM_D);
      P(g, x + 6, 11 + bob, 4, 5, DENIM);
      P(g, x + 6, 11 + bob, 4, 1, tint(DENIM));
      P(g, x + 5, 9 + bob, 1, 3, DENIM);
      P(g, x + 10, 9 + bob, 1, 3, DENIM);
    }
    // Chemise à carreaux "bûcheron canadien" (demande Guillaume : Tristan doit
    // avoir cette chemise) : recolore torse + manches par-dessus le rendu de
    // base (o.shirt déjà posé plus haut), même principe que la salopette de
    // Greg juste au-dessus — activée via le flag `plaid` (voir S.getChar/
    // charSheet), pour l'instant réservé à Tristan (FermeGame.js, résident
    // lumberjack). `!beeSuit` par précaution seulement : les deux flags ne
    // sont jamais vrais en même temps en pratique (personnages différents).
    if (plaid && !beeSuit) {
      const PLAID = "#a3261f", PLAID_D = shade(PLAID), LINE = "#241a14", LINE2 = "#4a3020";
      // Torse : fond rouge flanelle par-dessus o.shirt.
      P(g, x + 4, 10 + bob, 8, 6, PLAID);
      P(g, x + 4, 10 + bob, 8, 1, tint(PLAID));
      // Grille façon carreaux buffalo (lignes noires verticales + horizontales,
      // plus une ligne secondaire plus fine pour casser l'uniformité du bloc).
      P(g, x + 6, 10 + bob, 1, 6, LINE);
      P(g, x + 9, 10 + bob, 1, 6, LINE);
      P(g, x + 4, 12 + bob, 8, 1, LINE);
      P(g, x + 4, 15 + bob, 8, 1, LINE);
      P(g, x + 7, 10 + bob, 1, 6, LINE2);
      P(g, x + 4, 13 + bob, 8, 1, LINE2);
      // Manches (recouvrent les bras nus/manche courte o.shirt).
      if (dir === 2) {
        P(g, x + 7 + step, 11 + bob, 2, 5, PLAID);
        P(g, x + 7 + step, 13 + bob, 2, 1, LINE);
      } else {
        P(g, x + 3, 11 + bob, 2, 5, PLAID); P(g, x + 11, 11 + bob, 2, 5, PLAID_D);
        P(g, x + 3, 13 + bob, 2, 1, LINE); P(g, x + 11, 13 + bob, 2, 1, LINE);
      }
    }
    // Combinaison d'apiculteur (demande Guillaume : René doit ressembler à un
    // apiculteur — combinaison blanche complète, voile, gants — mais UNIQUEMENT
    // quand il est effectivement au travail près de sa ruche ; en dehors de ça
    // il garde son skin de résident normal, voir FermeGame.js/residentBeeSuit).
    // Dessinée en tout dernier, par-dessus torse/jambes/bras/cheveux/casquette,
    // pour recouvrir intégralement le skin de base (même principe que la
    // salopette de Greg juste au-dessus, mais couvrant aussi la tête).
    if (beeSuit) {
      const SUIT = "#f2f0e6", SUIT_D = shade(SUIT), SUIT_L = tint(SUIT);
      const HAT = "#e8e4d2", HAT_D = shade(HAT);
      const VEIL = "#2e2e30", VEIL_L = "#4a4a4e";
      const GLOVE = "#e4dcc0", GLOVE_D = shade(GLOVE);
      // Jambes : combinaison blanche intégrale (recouvre le pantalon o.pants).
      P(g, x + 5, 15 + bob, 3, 6, SUIT);
      P(g, x + 8, 15 + bob, 3, 6, SUIT_D);
      P(g, x + 5, 20 + bob, 3, 1, shade(SUIT));
      P(g, x + 8, 20 + bob, 3, 1, shade(SUIT_D));
      // Bottes (repli du pantalon dans des bottes, contraste discret).
      P(g, x + 5 + step, 21 + bob, 3, 3 - bob, "#4a3a26");
      P(g, x + 8 - step, 21 + bob, 3, 3 - bob, "#4a3a26");
      // Torse : combinaison montante jusqu'au col (recouvre le torse o.shirt).
      P(g, x + 4, 10 + bob, 8, 6, SUIT);
      P(g, x + 4, 10 + bob, 8, 1, SUIT_L);
      // Fermeture éclair centrale, petit détail cousu.
      P(g, x + 7, 11 + bob, 1, 5, SUIT_D);
      // Bras : manches blanches (recouvrent les bras nus/manche courte o.shirt).
      if (dir === 2) {
        P(g, x + 7 + step, 11 + bob, 2, 5, SUIT);
        P(g, x + 7 + step, 15 + bob, 2, 1, GLOVE_D);
      } else {
        P(g, x + 3, 11 + bob, 2, 5, SUIT); P(g, x + 11, 11 + bob, 2, 5, SUIT_D);
        // Gants épais aux poignets (recouvrent la peau des mains).
        P(g, x + 3, 15 + bob, 2, 1, GLOVE); P(g, x + 11, 15 + bob, 2, 1, GLOVE_D);
      }
      // Tête/voile : capuche + large chapeau à voile, recouvre cheveux/casquette.
      // Capuche montante autour du cou/menton (recouvre le bas du visage/cheveux).
      P(g, x + 4, 8 + bob, 8, 3, SUIT);
      // Voile grillagé noir enveloppant tout le visage (silhouette anonyme,
      // reconnaissable comme apiculteur même en tout petit sprite).
      P(g, x + 4, 3 + bob, 8, 6, VEIL);
      P(g, x + 5, 4 + bob, 6, 1, VEIL_L); // léger reflet du grillage
      P(g, x + 5, 6 + bob, 6, 1, VEIL_L);
      // Large chapeau rond à bord, posé au-dessus du voile.
      P(g, x + 2, 1 + bob, 12, 2, HAT);
      P(g, x + 3, 0 + bob, 10, 1, HAT_D);
      P(g, x + 5, 0 + bob, 6, 1, tint(HAT));
      P(g, x + 4, 2 + bob, 8, 1, HAT_D);
    }
    // Béret + tablier de fromagère (demande Guillaume, zip 301 : Ingrid doit
    // avoir un tablier et un béret). Overlay par-dessus le skin de base, comme
    // la salopette/la chemise à carreaux — réservé au résident cheesemaker via
    // le flag `cheeseHat` (voir S.getChar/charSheet). `!beeSuit` par précaution
    // (personnages différents, jamais les deux à la fois).
    if (cheeseHat && !beeSuit) {
      // Tablier clair : bavette sur le torse + jupe sur le haut des jambes,
      // deux bretelles. Recouvre partiellement o.shirt/o.pants.
      const AP = "#f4efe2", AP_D = shade(AP);
      P(g, x + 6, 10 + bob, 4, 6, AP);
      P(g, x + 6, 10 + bob, 4, 1, tint(AP));
      P(g, x + 5, 16 + bob, 6, 3, AP);
      P(g, x + 5, 18 + bob, 6, 1, AP_D);
      P(g, x + 6, 9 + bob, 1, 2, AP_D);
      P(g, x + 9, 9 + bob, 1, 2, AP_D);
      // Béret posé de biais (galette + léger débord + picot central).
      const BER = "#2f3a56", BER_D = shade(BER);
      P(g, x + 3, 1 + bob, 9, 3, BER);
      P(g, x + 3, 1 + bob, 9, 1, tint(BER));
      P(g, x + 3, 3 + bob, 9, 1, BER_D);
      if (dir !== 1) P(g, x + 11, 0 + bob, 2, 1, BER_D); // débord visible de face/profil
      P(g, x + 7, 0 + bob, 1, 1, BER_D); // picot
    }
    // Tenue de Jérôme Martial (chantier sucrerie, demande Guillaume : "des
    // vêtements rouge noir et vert, pour évoquer les couleurs du drapeau de
    // la Martinique") : chemise rouge, pantalon noir ; la casquette
    // générique dessinée plus haut (bloc `cap`) est déjà verte (CAP =
    // "#2f6f4a"), donc la 3e couleur du drapeau est déjà en place sans rien
    // ajouter ici. Overlay par-dessus le torse/bras/jambes déjà posés (même
    // principe que la salopette/la chemise à carreaux ci-dessus), réservé au
    // résident sugarworker via le flag `sugarWorker` (voir S.getChar/
    // charSheet). Coordonnées reprises du bloc jambes masculin (gender==="m"
    // uniquement, Jérôme est un homme) et du torse/bras communs plus haut.
    if (sugarWorker && !beeSuit) {
      const SHIRT = "#c9302c", SHIRT_D = shade(SHIRT), PANTS = "#1c1c1c", PANTS_D = shade(PANTS);
      // Jambes (pantalon noir), reprend exactement les coordonnées du bloc
      // jambes masculin tout en haut de la fonction.
      if (gender !== "f") {
        P(g, x + 5, 15 + bob, 3, 6, PANTS);
        P(g, x + 8, 15 + bob, 3, 6, PANTS_D);
      }
      // Torse (chemise rouge).
      P(g, x + 4, 10 + bob, 8, (gender === "f" ? 5 : 6), SHIRT);
      P(g, x + 4, 10 + bob, 8, 1, tint(SHIRT));
      // Bras (manches rouges).
      if (dir === 2) {
        P(g, x + 7 + step, 11 + bob, 2, 5, SHIRT);
        P(g, x + 7 + step, 15 + bob, 2, 1, skin);
      } else {
        P(g, x + 3, 11 + bob, 2, 5, SHIRT); P(g, x + 11, 11 + bob, 2, 5, SHIRT_D);
        P(g, x + 3, 15 + bob, 2, 1, skin); P(g, x + 11, 15 + bob, 2, 1, skin);
      }
    }
    // ---- Zip 376 : Carla Garfield (demande Guillaume : "élégante, béret
    // rouge, manteau jaune, top noir"). Overlay complet par-dessus le skin de
    // base féminin, même principe que la combinaison d'apiculteur : on
    // reprend EXACTEMENT les coordonnées des blocs de base (jupe, pieds,
    // torse, bras) pour ne rien laisser dépasser, plutôt que de redessiner
    // un personnage à part. Un seul détail est REMIS après coup : ses
    // cheveux longs, que le manteau vient de recouvrir aux épaules.
    if (look === "carla" && !beeSuit) {
      const COAT = "#e6b32b", COAT_D = shade(COAT), COAT_L = tint(COAT);
      const BLK = "#17171c", BLK_L = "#2e2e38";
      // La jupe est un cran PLUS CLAIRE que les bottines : en tout noir, du
      // genou aux pieds, la silhouette se refermait en un bloc unique et la
      // démarche devenait illisible.
      const SKIRT = "#22222c", SKIRT_D = "#191921";
      const RED = "#b4232c", RED_D = shade(RED), RED_L = tint(RED);
      // Jupe droite (recouvre la jupe o.shirt du bloc féminin).
      P(g, x + 4, 14 + bob, 8, 7, SKIRT);
      P(g, x + 3, 17 + bob, 10, 4, SKIRT);
      P(g, x + 3, 20 + bob, 10, 1, SKIRT_D);
      // Bottines : coordonnées exactes des pieds du bloc féminin (step/bob
      // compris, sinon la démarche se désynchronise d'une frame sur deux).
      P(g, x + 5 + (step > 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#0e0e12");
      P(g, x + 9 - (step < 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#0e0e12");
      // Manteau jaune long : épaules -> hanches, ourlet marqué sur la jupe.
      P(g, x + 4, 10 + bob, 8, 8, COAT);
      P(g, x + 4, 10 + bob, 8, 1, COAT_L);
      P(g, x + 4, 17 + bob, 8, 1, COAT_D);
      // Manches.
      if (dir === 2) {
        P(g, x + 7 + step, 11 + bob, 2, 5, COAT);
        P(g, x + 7 + step, 15 + bob, 2, 1, skin);
      } else {
        P(g, x + 3, 11 + bob, 2, 5, COAT); P(g, x + 11, 11 + bob, 2, 5, COAT_D);
        P(g, x + 3, 15 + bob, 2, 1, skin); P(g, x + 11, 15 + bob, 2, 1, skin);
      }
      // Top noir sous le manteau ouvert. De face : col en V entre deux
      // revers. De profil : une simple bande sur le devant du buste. De dos :
      // rien, le manteau est fermé par derrière.
      // (Un premier jet posait en plus deux revers COAT_D de part et d'autre
      // du col : avec les cheveux longs aux deux colonnes extérieures, la
      // ligne d'épaules devenait une bande sombre continue et le manteau ne
      // se lisait plus. Supprimés — le V noir seul suffit.)
      if (dir === 0) {
        P(g, x + 7, 10 + bob, 2, 4, BLK);
        P(g, x + 7, 10 + bob, 2, 1, BLK_L);
      } else if (dir === 2) {
        P(g, x + 10, 11 + bob, 2, 3, BLK);
      }
      // Ceinture fine à la taille.
      P(g, x + 4, 15 + bob, 8, 1, "#6e5210");
      // Cheveux longs REPOSÉS par-dessus les épaules : la base les dessine
      // après le torse, le manteau vient de les effacer aux colonnes des
      // manches. Sans ces deux lignes, elle est tondue au niveau du col.
      P(g, x + 3, 10 + bob, 2, 3, hair); P(g, x + 11, 10 + bob, 2, 3, hair);
      // Béret rouge porté de biais (même géométrie que le béret d'Ingrid,
      // seules la couleur et l'inclinaison du picot changent).
      P(g, x + 3, 1 + bob, 9, 3, RED);
      P(g, x + 3, 1 + bob, 9, 1, RED_L);
      P(g, x + 3, 3 + bob, 9, 1, RED_D);
      if (dir !== 1) P(g, x + 11, 0 + bob, 2, 1, RED_D); // débord visible de face/profil
      P(g, x + 7, 0 + bob, 1, 1, RED_D);                 // picot
      // Bouche rouge, de face seulement (en profil la base ne pose qu'un pixel).
      if (dir === 0) P(g, x + 6, 8 + bob, 4, 1, "#a8202c");
    }
    // ---- Zip 376 : Léo, l'assistant de Carla (choix Guillaume : "souffre-
    // douleur chic"). Gilet gris trop grand, chemise blanche, nœud papillon
    // de travers, cheveux en bataille, et une pile de cartons à chapeaux
    // portée devant lui qui lui masque le bas de la figure — c'est elle qui
    // dit sa fonction en un coup d'œil, à 16 pixels de haut. Overlay sur le
    // skin masculin, mêmes coordonnées de base que Carla ci-dessus.
    if (look === "leo" && !beeSuit) {
      const SH = "#efe9dc", SH_D = shade(SH);
      const VEST = "#6a6a76", VEST_D = shade(VEST);
      const PANT = "#3a3542", PANT_D = shade(PANT);
      const TIE = "#7e2030";
      const BX1 = "#e3d8c0", BX1_D = shade(BX1), BX2 = "#c6d3dd", BX2_D = shade(BX2), RIB = "#b4232c";
      // Pantalon sombre, souliers usés (coordonnées du bloc masculin).
      P(g, x + 5, 15 + bob, 3, 6, PANT);
      P(g, x + 8, 15 + bob, 3, 6, PANT_D);
      P(g, x + 5 + step, 21 + bob, 3, 3 - bob, "#241c16");
      P(g, x + 8 - step, 21 + bob, 3, 3 - bob, "#241c16");
      // Chemise blanche.
      P(g, x + 4, 10 + bob, 8, 6, SH);
      P(g, x + 4, 10 + bob, 8, 1, tint(SH));
      // Gilet gris trop grand : il bâille sur le devant et descend sous la
      // taille (deux pans latéraux + un ourlet, la chemise reste visible au
      // milieu).
      P(g, x + 4, 11 + bob, 3, 6, VEST);
      P(g, x + 9, 11 + bob, 3, 6, VEST_D);
      P(g, x + 4, 16 + bob, 8, 1, VEST_D);
      // Manches de chemise.
      if (dir === 2) {
        P(g, x + 7 + step, 11 + bob, 2, 5, SH);
        P(g, x + 7 + step, 15 + bob, 2, 1, skin);
      } else {
        P(g, x + 3, 11 + bob, 2, 5, SH); P(g, x + 11, 11 + bob, 2, 5, SH_D);
        P(g, x + 3, 15 + bob, 2, 1, skin); P(g, x + 11, 15 + bob, 2, 1, skin);
      }
      // Nœud papillon DE TRAVERS : une aile plus haute que l'autre. C'est un
      // pixel de décalage, et c'est tout le personnage.
      if (dir !== 1) {
        P(g, x + 6, 10 + bob, 2, 1, TIE);
        P(g, x + 9, 9 + bob, 2, 1, TIE);
        P(g, x + 8, 10 + bob, 1, 1, shade(TIE));
      }
      // Cheveux en bataille : trois mèches qui dépassent du crâne.
      P(g, x + 4, 0 + bob, 1, 1, hair); P(g, x + 8, 0 + bob, 1, 1, hair); P(g, x + 11, 0 + bob, 1, 1, hair);
      // Pile de cartons à chapeaux, dessinée EN DERNIER : elle passe devant
      // les bras et le buste, puisqu'il la serre contre lui.
      //
      // Deux règles tirées du rendu de contrôle, et elles comptent :
      //  - les deux cartons doivent avoir des TEINTES franchement
      //    différentes, sinon la pile se lit comme une planche unique ;
      //  - le ruban ne doit PAS courir d'un carton à l'autre sur toute la
      //    hauteur : à 16 px, une bande verticale partant du menton se lit
      //    comme une cravate. Un ruban vertical sur le carton du haut, un
      //    ruban horizontal sur celui du bas : la pile redevient une pile.
      //
      // Le carton du haut est PENCHÉ du côté gauche : il masque une moitié de
      // la figure et laisse l'autre œil dehors — il a l'air d'en porter trop,
      // ce qui est exactement le personnage.
      if (dir === 1) {
        // De dos : seuls les bords dépassent de part et d'autre du corps.
        P(g, x + 2, 12 + bob, 2, 5, BX1); P(g, x + 12, 12 + bob, 2, 5, BX1_D);
        P(g, x + 1, 6 + bob, 2, 6, BX2);
      } else {
        // Carton du bas : large, à hauteur de taille.
        const bx = dir === 2 ? x + 5 : x + 2;
        P(g, bx, 12 + bob, 12, 5, BX1);
        P(g, bx, 12 + bob, 12, 1, tint(BX1));
        P(g, bx, 16 + bob, 12, 1, BX1_D);
        P(g, bx, 14 + bob, 12, 1, RIB);          // ruban horizontal
        // Carton du haut : plus petit, penché sur le côté (vers l'avant en
        // profil, vers la gauche de face).
        // Largeur 6 et non 7, et débordant d'une colonne HORS du corps : le
        // rendu de contrôle montrait qu'un carton plus large lui mangeait les
        // deux yeux. Là il n'en masque qu'un — l'autre, et l'aile droite du
        // nœud papillon, restent dehors.
        const tx = dir === 2 ? x + 9 : x + 1;
        const ty = dir === 2 ? 7 : 6;
        P(g, tx, ty + bob, 6, 6, BX2);
        P(g, tx, ty + bob, 6, 1, tint(BX2));
        P(g, tx, ty + 5 + bob, 6, 1, BX2_D);
        P(g, tx + 3, ty + bob, 1, 6, RIB);       // ruban vertical
        // Doigts crispés sous la pile.
        P(g, bx, 17 + bob, 1, 1, skin);
        P(g, bx + 11, 17 + bob, 1, 1, skin);
      }
    }
    /* ══════════════════════════════════════════════════════════════════════
       ZIP 427 — LA GARDE-ROBE DE LA MAISON GARFIELD.
       ──────────────────────────────────────────────────────────────────────
       ⚠️ ELLE SE POSE EN DERNIER, ET C'EST OBLIGATOIRE. Un chapeau acheté doit
       passer PAR-DESSUS les cheveux, la casquette générique et jusqu'aux
       tenues de métier — c'est ce que « je viens de l'acheter » veut dire.
       Ordre à l'intérieur, du dessous vers le dessus : teinte → tenue →
       écharpe → chapeau. Une écharpe sous une cape ne se verrait pas ;
       un chapeau sous une écharpe non plus.

       ⚠️ LA TEINTE N'EST PAS UN `globalAlpha` SUR TOUT LE SPRITE. Repeindre la
       feuille entière colorerait la peau et les cheveux — c'est la version
       « personnage » du piège du §4 (« teinter un sprite avec un fillRect
       dessine une boîte »). On REPEINT donc les blocs du vêtement, aux
       coordonnées exactes des blocs de base, comme le font déjà Carla et Leo.
       Corollaire assumé : la teinte n'a pas d'effet visible sur un skin qui
       repeint déjà tout son torse (apiculteur en combinaison, par ex.) — et
       c'est le bon comportement, on ne teint pas une combinaison d'apiculture.

       ⚠️ INDICES DÉCALÉS DE 1, 0 = RIEN. Voir wardrobeLook() dans les
       constantes : c'est ce qui permet de RETIRER un chapeau sans inventer un
       article « pas de chapeau » dans la vitrine.
       ══════════════════════════════════════════════════════════════════════ */
    const wd = parseWardrobeLook(look);
    if (wd) {
      const CT = wd.tint ? C.WARDROBE_TINTS[wd.tint - 1] : null;
      const base = CT ? CT.col : null;
      // ---- 1. LA TEINTE : on repeint le haut (et la jupe, au féminin) aux
      // coordonnées EXACTES des blocs de base, step/bob compris — sinon la
      // couleur se désynchronise du corps d'une frame sur deux.
      if (base) {
        const bD = shade(base), bL = tint(base);
        P(g, x + 4, 10 + bob, 8, (gender === "f" ? 5 : 6), base);
        P(g, x + 4, 10 + bob, 8, 1, bL);
        if (gender === "f") { P(g, x + 4, 14 + bob, 8, 7, base); P(g, x + 3, 17 + bob, 10, 4, base); P(g, x + 3, 20 + bob, 10, 1, bD); }
        if (dir === 2) P(g, x + 7 + step, 11 + bob, 2, 5, base);
        else { P(g, x + 3, 11 + bob, 2, 5, base); P(g, x + 11, 11 + bob, 2, 5, bD); }
        // Les mains ressortent des manches qu'on vient de repeindre.
        if (dir === 2) P(g, x + 7 + step, 15 + bob, 2, 1, skin);
        else { P(g, x + 3, 15 + bob, 2, 1, skin); P(g, x + 11, 15 + bob, 2, 1, skin); }
      }
      // ---- 2. LA TENUE. Chacune est une SILHOUETTE, pas une texture : à
      // 16 px de haut, ce qu'on reconnaît est le contour (une robe s'évase,
      // une cape tombe droit, un tailleur est étroit et net).
      const gar = wd.outfit ? C.WARDROBE_OUTFITS[wd.outfit - 1] : null;
      if (gar) {
        const GC = base || "#3a3550", GD = shade(GC), GL = tint(GC);
        if (gar.id === "gown") {
          // Robe du soir : le buste reste étroit, la jupe s'évase jusqu'aux
          // pieds et les efface — une robe longue n'a pas de chevilles.
          P(g, x + 4, 13 + bob, 8, 5, GC);
          P(g, x + 3, 17 + bob, 10, 4, GC);
          P(g, x + 2, 20 + bob, 12, 4 - bob, GC);
          P(g, x + 2, 23 - bob, 12, 1, GD);
          P(g, x + 4, 13 + bob, 8, 1, GL);
        } else if (gar.id === "cape") {
          // Cape : deux pans droits qui tombent des épaules, col relevé.
          P(g, x + 2, 10 + bob, 12, 11, GC);
          P(g, x + 2, 10 + bob, 12, 1, GL);
          P(g, x + 2, 20 + bob, 12, 1, GD);
          P(g, x + 7, 11 + bob, 2, 10, GD);             // ouverture au milieu
          P(g, x + 5, 8 + bob, 6, 2, GD);               // col relevé
        } else if (gar.id === "suit") {
          // Tailleur : veste courte, revers clairs, taille marquée.
          P(g, x + 4, 10 + bob, 8, 7, GC);
          P(g, x + 4, 10 + bob, 8, 1, GL);
          P(g, x + 6, 10 + bob, 1, 5, GL); P(g, x + 9, 10 + bob, 1, 5, GL);
          P(g, x + 4, 15 + bob, 8, 1, GD);
          if (dir === 0) P(g, x + 7, 11 + bob, 2, 3, "#efe9dc");  // chemise
        } else if (gar.id === "poncho") {
          // Poncho : un trapèze qui déborde des épaules, franges en bas.
          P(g, x + 2, 10 + bob, 12, 8, GC);
          P(g, x + 2, 10 + bob, 12, 1, GL);
          P(g, x + 2, 13 + bob, 12, 1, GD);
          for (let k = 0; k < 6; k++) P(g, x + 2 + k * 2, 18 + bob, 1, 2, GD);
        } else {
          // Tutu : une jupe TRÈS large sur deux rangées, jambes bien dehors.
          P(g, x + 1, 15 + bob, 14, 3, GL);
          P(g, x + 2, 17 + bob, 12, 2, GC);
          P(g, x + 3, 13 + bob, 10, 2, GC);
          P(g, x + 1, 15 + bob, 14, 1, "rgba(255,255,255,0.5)");
        }
      }
      // ---- 3. L'ÉCHARPE, autour du cou, par-dessus la tenue. Le PAN qui
      // pend est ce qui la distingue d'un col : sans lui, ce n'est qu'une
      // ligne de couleur sous le menton.
      const sc = wd.scarf ? C.WARDROBE_SCARVES[wd.scarf - 1] : null;
      if (sc) {
        const SCC = sc.id === "silk" ? (base || "#d94f6e") : sc.id === "feather" ? "#f2e6f2"
                  : sc.id === "fur" ? "#c9b79a" : (base || "#8a4a3a");
        const SCD = shade(SCC);
        P(g, x + 4, 9 + bob, 8, 2, SCC);
        P(g, x + 4, 10 + bob, 8, 1, SCD);
        if (sc.id === "feather") { for (let k = 0; k < 5; k++) P(g, x + 4 + k * 2, 8 + bob, 1, 1, "#ffffff"); }
        if (sc.id === "fur") { P(g, x + 3, 9 + bob, 10, 1, tint(SCC)); P(g, x + 3, 10 + bob, 1, 2, SCC); P(g, x + 12, 10 + bob, 1, 2, SCC); }
        if (dir !== 1) { P(g, x + 10, 11 + bob, 2, 4, SCC); P(g, x + 10, 14 + bob, 2, 1, SCD); }  // le pan
      }
      // ---- 4. LE CHAPEAU, tout en haut, par-dessus tout — y compris la
      // casquette générique, qui n'a plus à être vue si on porte un chapeau.
      const ht = wd.hat ? C.WARDROBE_HATS[wd.hat - 1] : null;
      if (ht) {
        if (ht.id === "beret") {
          const R = base || "#b4232c";
          P(g, x + 3, 1 + bob, 9, 3, R); P(g, x + 3, 1 + bob, 9, 1, tint(R)); P(g, x + 3, 3 + bob, 9, 1, shade(R));
          P(g, x + 7, 0 + bob, 1, 1, shade(R));
        } else if (ht.id === "capeline") {
          // Capeline : le BORD est le personnage. Il déborde de deux colonnes
          // de chaque côté du crâne, sinon c'est un bonnet de paille.
          const S = base || "#e0c274";
          P(g, x + 1, 3 + bob, 14, 2, S); P(g, x + 1, 3 + bob, 14, 1, tint(S)); P(g, x + 1, 4 + bob, 14, 1, shade(S));
          P(g, x + 4, 0 + bob, 8, 3, S); P(g, x + 4, 2 + bob, 8, 1, "#8a3c4a");   // ruban
        } else if (ht.id === "tophat") {
          /* ⚠️ LE HAUT-DE-FORME NE PEUT PAS DÉPASSER DU CADRE. Une case de
             feuille fait 16×24 et le personnage l'occupe entièrement : tout
             pixel posé au-dessus de y=0 est SILENCIEUSEMENT découpé par le
             canevas (les frames sont dessinées côte à côte, translatées par
             `dir * 24`). Premier jet : calotte de y=-4 à y=3 — un chapeau
             décapité, et rien pour le signaler. La calotte tient donc dans les
             quatre pixels du haut, le bord juste dessous ; ce qui est perdu en
             hauteur est repris en LARGEUR de bord, qui est de toute façon ce
             qui fait lire un haut-de-forme vu de dessus. */
          const K = base || "#1c1a22";
          P(g, x + 2, 4 + bob, 12, 2, K); P(g, x + 2, 4 + bob, 12, 1, tint(K)); // bord large
          P(g, x + 4, 0 + bob, 8, 4, K); P(g, x + 4, 0 + bob, 8, 1, tint(K));   // calotte
          P(g, x + 4, 3 + bob, 8, 1, "#d9b04a");                                // ganse dorée
        } else if (ht.id === "beanie") {
          const K = base || "#5a6a8a";
          P(g, x + 3, 1 + bob, 10, 4, K);
          for (let k = 0; k < 5; k++) P(g, x + 3 + k * 2, 1 + bob, 1, 4, shade(K));  // côtes
          P(g, x + 3, 4 + bob, 10, 1, tint(K));
          P(g, x + 7, 0 + bob, 2, 1, tint(K));                  // pompon
        } else {
          // Diadème : trois pointes et un éclat. Le plus petit article de la
          // vitrine, et le plus cher — c'est aussi une blague.
          const O = "#e8c860";
          P(g, x + 4, 2 + bob, 8, 1, O);
          P(g, x + 5, 1 + bob, 1, 1, O); P(g, x + 8, 0 + bob, 1, 2, O); P(g, x + 10, 1 + bob, 1, 1, O);
          P(g, x + 8, 0 + bob, 1, 1, "#ffffff");
        }
      }
    }
  }
  /* ⚠️ UNE SEULE FONCTION RELIT LA CHAÎNE, ET UNE SEULE LA FABRIQUE
     (`wardrobeLook`, dans fermeConstants.js). Deux décodages du même vêtement,
     c'est la garantie qu'un jour on porte un chapeau que les autres ne voient
     pas — et le seul indice serait une capture d'écran comparée à une autre. */
  function parseWardrobeLook(look) {
    if (typeof look !== "string" || look.length !== 5 || look[0] !== "w") return null;
    const d = (k) => {
      const n = look.charCodeAt(k) - 48;
      return n >= 0 && n <= 9 ? n : 0;
    };
    const w = { hat: d(1), scarf: d(2), outfit: d(3), tint: d(4) };
    // Un indice hors catalogue = rien porté. Un article retiré du catalogue un
    // jour ne doit pas faire planter le dessin d'un fermier qui l'avait acheté.
    if (w.hat > C.WARDROBE_HATS.length) w.hat = 0;
    if (w.scarf > C.WARDROBE_SCARVES.length) w.scarf = 0;
    if (w.outfit > C.WARDROBE_OUTFITS.length) w.outfit = 0;
    if (w.tint > C.WARDROBE_TINTS.length) w.tint = 0;
    return (w.hat || w.scarf || w.outfit || w.tint) ? w : null;
  }
  function shade(hex) { return adjust(hex, -30); }
  function tint(hex) { return adjust(hex, 30); }
  function adjust(hex, d) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + d));
    const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + d));
    const b = Math.max(0, Math.min(255, (n & 255) + d));
    return `rgb(${r},${gg},${b})`;
  }
  function charSheet(gender, outfit, overalls, cap, beeSuit, plaid, cheeseHat, sugarWorker, look) {
    const [c, g] = cv(16 * 4, 24 * 3);
    for (let dir = 0; dir < 3; dir++)
      for (let f = 0; f < 4; f++) {
        g.save(); g.translate(0, dir * 24);
        drawCharFrame(g, f * 16, gender, outfit, dir, f, overalls, cap, beeSuit, plaid, cheeseHat, sugarWorker, look);
        g.restore();
      }
    return c;
  }

  /* ---------------- Icônes d'interface ---------------- */
  // Zip 251 : sprites des décorations offertes (gnome, fontaine, roue solaire).
  // Canvas 20x28, dessin ancré en bas (les "pieds" reposent vers y=27).
  // Zip 388 : decorSprite est passé au NIVEAU DU MODULE (voir en tête de
  // fichier) pour être rasterisable hors navigateur. Rien d'autre n'a changé.
  // Zip 252 : ateliers d'artisans. Dessinés sur ~48x40, ancrés par le bas.
  // Zip 302 (demande Guillaume, maquette validée en amont) : montgolfière
  // "hyperréaliste rouge et jaune" — pixel-art HD, texture PAR PIXEL, avec
  // trois matières bien distinctes (enveloppe/panier/cordages) + un brûleur
  // TOUJOURS allumé (jour et nuit, comme une vraie montgolfière — demande
  // explicite de Guillaume). Générée une seule fois ici (baked), FermeGame.js
  // se contente de la positionner/tourner/redimensionner via drawImage.
  // Zip 305 : table de données du calque pixel-art (palette + grille en
  // runs [xStart, longueur, indexPalette] par rangée) générée une fois à
  // partir du calque validé par Guillaume, consommée par balloonSprite()
  // ci-dessous. Aucune image bitmap chargée à l'exécution — juste des
  // données peintes par du code, comme le reste du fichier.
  const BALLOON_PALETTE = ["#f9e7c2","#f1dc12","#ecc046","#f18f29","#83c66d","#3fb391","#b99665","#419793","#f6750b","#f15d1f","#ab7148","#b15337","#3676a2","#2578a5","#414980","#264d90","#f93463","#f32c39","#db2727","#b9242f","#ce111b","#d00f12","#be1126","#a40e1d","#6f2157","#5c255a","#771130","#3f3656","#2d3786","#2d1c4b"];
  const BALLOON_ROWS = [[0,[[31,4,27],[35,2,29],[37,1,25],[38,5,26],[43,2,29],[45,1,27]]],[1,[[26,3,27],[29,1,29],[30,4,26],[34,1,23],[35,5,22],[40,1,9],[41,4,3],[45,1,11],[46,1,10],[47,1,6],[48,1,10],[49,1,27]]],[2,[[22,1,14],[23,2,27],[25,3,25],[28,1,26],[29,3,23],[32,1,22],[33,1,23],[34,1,18],[35,1,9],[36,3,8],[39,1,9],[40,1,18],[41,5,2],[46,2,6],[48,2,0],[50,2,6],[52,1,10],[53,1,27]]],[3,[[20,1,27],[21,1,25],[22,1,29],[23,1,24],[24,3,26],[27,1,23],[28,1,20],[29,4,21],[33,1,19],[34,6,8],[40,1,9],[41,7,0],[48,4,6],[52,1,0],[53,2,6],[55,1,24],[56,1,25]]],[4,[[18,1,27],[19,1,25],[20,2,26],[22,1,23],[23,1,20],[24,1,21],[25,1,20],[26,1,22],[27,6,21],[33,1,11],[34,1,2],[35,3,0],[38,3,2],[41,1,6],[42,7,0],[49,7,16],[56,1,11],[57,1,24],[58,1,27]]],[5,[[16,1,27],[17,1,26],[18,1,19],[19,1,11],[20,1,23],[21,2,20],[23,2,21],[25,1,23],[26,1,18],[27,2,9],[29,3,8],[32,1,9],[33,8,0],[41,1,6],[42,13,16],[55,1,17],[56,2,18],[58,1,19],[59,1,24]]],[6,[[15,2,10],[17,2,9],[19,1,23],[20,2,21],[22,2,9],[24,1,18],[25,1,9],[26,6,8],[32,1,10],[33,8,0],[41,1,6],[42,8,16],[50,1,22],[51,4,18],[55,1,17],[56,1,18],[57,1,20],[58,2,18],[60,1,10],[61,1,6]]],[7,[[13,1,14],[14,1,6],[15,1,11],[16,2,9],[18,1,19],[19,1,9],[20,4,8],[24,1,11],[25,7,8],[32,1,10],[33,1,6],[34,7,16],[41,1,6],[42,8,16],[50,1,19],[51,6,18],[57,1,22],[58,3,18],[61,2,6],[63,1,27]]],[8,[[12,2,6],[14,1,10],[15,2,6],[17,1,11],[18,1,9],[19,4,8],[23,1,9],[24,1,11],[25,1,3],[26,1,2],[27,5,0],[32,1,10],[33,9,16],[42,1,22],[43,4,20],[47,2,18],[49,2,17],[51,1,20],[52,6,18],[58,1,9],[59,2,8],[61,1,9],[62,1,10],[63,1,6],[64,1,24]]],[9,[[11,6,6],[17,1,11],[18,1,8],[19,1,3],[20,1,2],[21,2,0],[23,1,10],[24,8,0],[32,1,19],[33,9,16],[42,1,22],[43,4,20],[47,5,18],[52,4,8],[56,2,9],[58,1,20],[59,3,8],[62,1,9],[63,1,17],[64,1,16],[65,1,10]]],[10,[[10,1,10],[11,1,6],[12,1,10],[13,3,6],[16,1,10],[17,1,6],[18,5,0],[23,1,6],[24,8,0],[32,1,19],[33,6,16],[39,1,17],[40,2,16],[42,1,22],[43,4,20],[47,4,18],[51,1,20],[52,6,8],[58,2,9],[60,1,3],[61,2,8],[63,1,9],[64,1,17],[65,1,16],[66,1,24]]],[11,[[9,1,24],[10,2,19],[12,5,6],[17,6,0],[23,1,6],[24,3,0],[27,5,6],[32,1,22],[33,9,20],[42,1,19],[43,7,9],[50,1,18],[51,1,20],[52,1,9],[53,6,8],[59,1,9],[60,3,1],[63,1,3],[64,1,19],[65,1,18],[66,1,19],[67,1,24]]],[12,[[8,1,25],[9,2,19],[11,2,10],[13,2,19],[15,1,11],[16,6,0],[22,1,6],[23,9,16],[32,10,20],[42,1,22],[43,9,8],[52,1,11],[53,3,1],[56,1,3],[57,2,8],[59,1,9],[60,4,1],[64,1,3],[65,1,19],[66,1,18],[67,1,19],[68,1,10]]],[13,[[7,1,27],[8,1,24],[9,6,19],[15,1,10],[16,2,0],[18,1,6],[19,3,16],[22,1,19],[23,8,16],[31,1,17],[32,10,20],[42,1,21],[43,9,8],[52,1,9],[53,6,1],[59,1,3],[60,1,11],[61,4,1],[65,1,11],[66,2,18],[68,1,19],[69,1,24]]],[14,[[6,1,27],[7,1,24],[8,1,23],[9,1,26],[10,5,19],[15,1,6],[16,6,16],[22,1,19],[23,8,16],[31,1,17],[32,2,20],[34,4,21],[38,1,18],[39,3,21],[42,1,23],[43,10,8],[53,7,1],[60,1,10],[61,2,4],[63,1,2],[64,1,1],[65,1,3],[66,2,8],[68,1,18],[69,1,19],[70,1,24]]],[15,[[5,1,25],[6,4,26],[10,4,19],[14,1,26],[15,7,16],[22,1,19],[23,5,16],[28,3,17],[31,1,22],[32,1,9],[33,8,8],[41,1,9],[42,1,19],[43,1,3],[44,2,1],[46,1,3],[47,3,1],[50,2,3],[52,1,8],[53,1,3],[54,7,1],[61,5,4],[66,1,11],[67,2,8],[69,1,9],[70,1,11]]],[16,[[5,4,26],[9,2,19],[11,2,23],[13,1,26],[14,1,23],[15,7,16],[22,1,19],[23,1,18],[24,5,20],[29,1,21],[30,1,20],[31,1,22],[32,10,8],[42,1,9],[43,1,3],[44,9,1],[53,1,10],[54,3,2],[57,4,1],[61,4,4],[65,1,5],[66,1,10],[67,3,8],[70,1,18],[71,1,24]]],[17,[[4,1,24],[5,9,26],[14,1,19],[15,4,16],[19,2,17],[21,1,18],[22,1,22],[23,8,20],[31,1,19],[32,11,8],[43,1,3],[44,9,1],[53,1,7],[54,6,4],[60,1,2],[61,5,4],[66,1,7],[67,1,3],[68,1,1],[69,1,8],[70,1,18],[71,1,19],[72,1,25]]],[18,[[3,1,6],[4,3,26],[7,1,23],[8,6,26],[14,1,19],[15,1,17],[16,1,18],[17,3,20],[20,1,21],[21,1,22],[22,1,20],[23,1,21],[24,7,20],[31,1,19],[32,11,8],[43,1,3],[44,9,1],[53,1,4],[54,1,5],[55,6,4],[61,1,7],[62,3,5],[65,1,4],[66,1,5],[67,1,10],[68,2,1],[70,1,9],[71,1,22],[72,1,26]]],[19,[[3,1,26],[4,4,23],[8,4,26],[12,1,23],[13,1,26],[14,1,22],[15,1,20],[16,2,21],[18,1,20],[19,1,21],[20,1,20],[21,1,23],[22,3,21],[25,6,20],[31,1,19],[32,1,8],[33,1,3],[34,8,1],[42,1,3],[43,1,10],[44,5,2],[49,4,1],[53,1,4],[54,1,5],[55,6,4],[61,2,7],[63,4,5],[67,1,4],[68,3,1],[71,1,23],[72,1,22],[73,1,24]]],[20,[[3,1,26],[4,4,23],[8,2,26],[10,3,23],[13,1,26],[14,1,23],[15,1,20],[16,4,21],[20,1,20],[21,1,23],[22,3,21],[25,1,18],[26,5,9],[31,1,11],[32,11,1],[43,1,7],[44,5,5],[49,4,4],[53,1,7],[54,2,5],[56,5,4],[61,1,7],[62,1,13],[63,3,5],[66,1,13],[67,1,7],[68,3,1],[71,1,11],[72,1,18],[73,1,26]]],[21,[[2,1,27],[3,1,11],[4,4,23],[8,1,26],[9,4,23],[13,1,26],[14,1,23],[15,6,21],[21,1,23],[22,1,9],[23,8,8],[31,1,11],[32,11,1],[43,1,7],[44,5,5],[49,4,4],[53,2,7],[55,6,5],[61,1,7],[62,1,13],[63,3,5],[66,2,13],[68,2,4],[70,1,1],[71,1,3],[72,1,9],[73,1,11]]],[22,[[2,1,26],[3,1,8],[4,2,23],[6,2,19],[8,5,23],[13,1,26],[14,1,23],[15,1,21],[16,1,18],[17,2,9],[19,2,8],[21,1,18],[22,9,8],[31,1,11],[32,11,1],[43,1,7],[44,6,5],[50,3,4],[53,1,7],[54,1,13],[55,6,5],[61,2,12],[63,1,13],[64,1,5],[65,3,13],[68,1,7],[69,1,5],[70,1,4],[71,1,2],[72,2,8],[74,1,25]]],[23,[[2,2,11],[4,1,23],[5,1,11],[6,1,3],[7,1,19],[8,5,23],[13,1,26],[14,1,18],[15,6,8],[21,1,11],[22,9,8],[31,1,11],[32,11,1],[43,1,7],[44,6,5],[50,3,4],[53,1,7],[54,1,13],[55,6,5],[61,1,13],[62,1,28],[63,2,15],[65,1,12],[66,2,13],[68,1,7],[69,2,5],[71,1,4],[72,1,10],[73,1,8],[74,1,11]]],[24,[[1,1,27],[2,1,10],[3,2,11],[5,1,8],[6,1,3],[7,3,23],[10,1,22],[11,2,11],[13,1,23],[14,1,9],[15,6,8],[21,1,11],[22,9,8],[31,1,10],[32,11,4],[43,7,7],[50,1,5],[51,2,4],[53,1,7],[54,1,13],[55,6,5],[61,1,13],[62,1,28],[63,5,15],[68,1,7],[69,3,5],[72,1,6],[73,1,1],[74,1,11]]],[25,[[1,1,14],[2,1,10],[3,1,27],[4,3,3],[7,2,23],[9,1,9],[10,3,3],[13,1,23],[14,1,9],[15,6,8],[21,1,11],[22,3,8],[25,1,3],[26,5,1],[31,1,10],[32,11,5],[43,1,15],[44,7,13],[51,1,12],[52,1,7],[53,2,12],[55,1,7],[56,1,13],[57,1,7],[58,3,5],[61,1,13],[62,1,28],[63,5,15],[68,1,14],[69,3,5],[72,1,4],[73,1,1],[74,1,10]]],[26,[[0,1,7],[1,1,27],[2,1,14],[3,1,27],[4,3,3],[7,1,11],[8,5,3],[13,1,23],[14,1,9],[15,6,8],[21,1,11],[22,9,1],[31,1,10],[32,11,5],[43,1,15],[44,9,13],[53,2,15],[55,5,12],[60,1,13],[61,1,12],[62,1,28],[63,5,15],[68,1,12],[69,1,7],[70,2,5],[72,1,7],[73,1,1],[74,1,3],[75,1,24]]],[27,[[0,1,7],[1,1,27],[2,1,15],[3,1,27],[4,1,3],[5,1,10],[6,1,7],[7,1,10],[8,5,3],[13,1,23],[14,1,18],[15,1,8],[16,1,3],[17,4,1],[21,1,3],[22,9,1],[31,1,10],[32,11,5],[43,1,15],[44,9,13],[53,2,15],[55,6,12],[61,1,28],[62,1,27],[63,1,14],[64,1,28],[65,3,15],[68,3,13],[71,2,7],[73,2,1],[75,1,26]]],[28,[[0,1,4],[1,1,14],[2,1,13],[3,1,27],[4,1,10],[5,1,12],[6,1,13],[7,1,10],[8,4,3],[12,1,10],[13,1,23],[14,1,3],[15,6,1],[21,1,3],[22,9,1],[31,1,4],[32,11,5],[43,1,15],[44,9,13],[53,1,28],[54,1,15],[55,6,12],[61,1,28],[62,1,25],[63,1,24],[64,2,25],[66,1,14],[67,2,15],[69,3,13],[72,1,7],[73,2,1],[75,1,11]]],[29,[[0,1,4],[1,1,27],[2,1,13],[3,1,27],[4,3,13],[7,1,10],[8,2,3],[10,2,10],[12,1,14],[13,1,10],[14,1,3],[15,7,1],[22,1,3],[23,8,1],[31,1,4],[32,11,7],[43,1,15],[44,9,13],[53,1,28],[54,1,15],[55,6,12],[61,1,28],[62,1,25],[63,4,24],[67,1,25],[68,1,15],[69,3,13],[72,1,12],[73,1,4],[74,1,2],[75,1,11]]],[30,[[0,1,4],[1,1,14],[2,2,15],[4,2,13],[6,1,12],[7,2,10],[9,2,14],[11,2,15],[13,1,27],[14,1,3],[15,7,1],[22,1,2],[23,2,1],[25,1,2],[26,5,4],[31,1,14],[32,11,13],[43,1,28],[44,9,15],[53,1,27],[54,2,14],[56,4,12],[60,1,15],[61,1,28],[62,6,24],[68,1,28],[69,1,12],[70,2,13],[72,1,12],[73,1,5],[74,1,4],[75,1,11]]],[31,[[0,1,7],[1,1,28],[2,2,15],[4,2,13],[6,1,15],[7,1,27],[8,1,14],[9,2,13],[11,2,15],[13,1,27],[14,1,3],[15,6,1],[21,1,2],[22,1,4],[23,8,5],[31,1,12],[32,11,13],[43,1,28],[44,8,15],[52,1,28],[53,1,25],[54,2,24],[56,2,25],[58,3,14],[61,1,27],[62,6,24],[68,1,28],[69,2,15],[71,1,13],[72,1,12],[73,1,5],[74,1,4],[75,1,10]]],[32,[[0,1,14],[1,1,28],[2,2,15],[4,1,13],[5,2,15],[7,1,28],[8,1,15],[9,2,13],[11,1,15],[12,1,13],[13,1,27],[14,1,3],[15,2,1],[17,3,4],[20,2,5],[22,1,7],[23,8,5],[31,1,7],[32,11,13],[43,1,28],[44,3,15],[47,1,28],[48,4,15],[52,1,28],[53,1,25],[54,7,24],[61,1,26],[62,1,23],[63,4,24],[67,1,25],[68,1,28],[69,3,15],[72,1,14],[73,1,5],[74,1,4],[75,1,10]]],[33,[[0,1,7],[1,1,28],[2,1,15],[3,1,28],[4,3,15],[7,1,27],[8,3,15],[11,2,13],[13,1,27],[14,1,10],[15,1,7],[16,6,5],[22,1,7],[23,8,5],[31,1,7],[32,11,13],[43,1,28],[44,3,15],[47,2,28],[49,3,15],[52,1,28],[53,1,25],[54,7,24],[61,1,26],[62,2,20],[64,1,22],[65,1,26],[66,1,24],[67,1,25],[68,5,15],[73,1,5],[74,1,4],[75,1,10]]],[34,[[0,1,4],[1,1,28],[2,1,15],[3,1,28],[4,3,15],[7,1,28],[8,2,15],[10,1,13],[11,4,15],[15,1,7],[16,6,5],[22,1,14],[23,8,5],[31,1,7],[32,1,12],[33,9,13],[42,1,12],[43,1,28],[44,1,15],[45,5,28],[50,2,15],[52,1,27],[53,8,24],[61,1,23],[62,4,20],[66,1,22],[67,1,24],[68,5,15],[73,1,5],[74,1,4],[75,1,10]]],[35,[[0,1,4],[1,2,28],[3,1,29],[4,3,15],[7,1,28],[8,7,15],[15,1,7],[16,6,5],[22,1,14],[23,8,5],[31,1,12],[32,1,28],[33,9,15],[42,1,28],[43,3,14],[46,3,25],[49,1,14],[50,2,28],[52,1,27],[53,8,24],[61,1,22],[62,5,20],[67,1,26],[68,1,25],[69,1,14],[70,2,15],[72,2,13],[74,1,4],[75,1,10]]],[36,[[0,1,7],[1,1,29],[2,1,28],[3,1,29],[4,3,15],[7,2,28],[9,5,15],[14,1,28],[15,1,13],[16,6,5],[22,1,14],[23,1,12],[24,8,13],[32,1,28],[33,9,15],[42,1,28],[43,1,25],[44,6,24],[50,2,25],[52,1,26],[53,3,23],[56,1,26],[57,4,24],[61,1,20],[62,1,21],[63,1,20],[64,2,21],[66,1,20],[67,1,26],[68,2,24],[70,1,25],[71,1,28],[72,2,13],[74,1,7],[75,1,10]]],[37,[[1,1,27],[2,3,28],[5,1,15],[6,3,28],[9,5,15],[14,1,28],[15,1,12],[16,1,7],[17,1,5],[18,2,7],[20,3,13],[23,1,15],[24,8,13],[32,1,28],[33,9,15],[42,1,28],[43,1,25],[44,7,24],[51,1,25],[52,1,26],[53,1,21],[54,4,20],[58,2,22],[60,1,26],[61,3,20],[64,1,21],[65,1,20],[66,1,22],[67,4,24],[71,1,27],[72,2,13],[74,1,7],[75,1,27]]],[38,[[1,1,27],[2,2,28],[4,1,29],[5,4,28],[9,5,15],[14,1,28],[15,1,15],[16,7,13],[23,1,15],[24,8,13],[32,1,28],[33,9,15],[42,1,27],[43,1,25],[44,7,24],[51,1,25],[52,1,23],[53,7,20],[60,1,19],[61,1,16],[62,1,17],[63,1,18],[64,1,20],[65,1,21],[66,1,23],[67,4,24],[71,1,25],[72,1,12],[73,1,13],[74,1,5],[75,1,29]]],[39,[[1,1,27],[2,2,28],[4,1,29],[5,4,28],[9,3,15],[12,3,28],[15,1,15],[16,7,13],[23,1,15],[24,8,13],[32,3,15],[35,1,28],[36,6,15],[42,1,27],[43,1,25],[44,7,24],[51,1,26],[52,1,22],[53,6,20],[59,1,22],[60,1,19],[61,4,16],[65,1,17],[66,1,23],[67,4,24],[71,1,28],[72,1,15],[73,1,12],[74,1,7],[75,1,14]]],[40,[[1,2,27],[3,1,25],[4,1,29],[5,11,28],[16,1,15],[17,6,13],[23,1,15],[24,8,13],[32,1,28],[33,10,25],[43,4,26],[47,4,24],[51,1,26],[52,6,20],[58,1,21],[59,1,22],[60,6,16],[66,2,19],[68,2,24],[70,1,25],[71,3,15],[74,1,7]]],[41,[[1,1,14],[2,1,29],[3,1,25],[4,2,29],[6,2,28],[8,2,29],[10,6,28],[16,1,15],[17,6,13],[23,9,15],[32,1,27],[33,9,24],[42,1,26],[43,7,20],[50,1,22],[51,1,23],[52,1,18],[53,3,20],[56,3,21],[59,1,22],[60,6,16],[66,1,22],[67,2,20],[69,1,19],[70,1,25],[71,3,15],[74,1,14]]],[42,[[2,1,27],[3,2,25],[5,1,29],[6,1,27],[7,2,25],[9,1,29],[10,7,28],[17,3,15],[20,5,28],[25,4,15],[29,1,28],[30,2,15],[32,1,27],[33,9,24],[42,1,26],[43,7,20],[50,1,22],[51,1,19],[52,4,16],[56,2,17],[58,1,18],[59,1,19],[60,5,16],[65,1,19],[66,4,20],[70,1,24],[71,1,14],[72,1,15],[73,1,12],[74,1,14]]],[43,[[2,1,27],[3,6,25],[9,1,29],[10,5,28],[15,2,29],[17,8,28],[25,5,15],[30,2,28],[32,1,27],[33,9,24],[42,1,26],[43,7,20],[50,1,23],[51,8,16],[59,2,0],[61,1,6],[62,3,16],[65,1,22],[66,3,21],[69,1,22],[70,2,24],[72,1,28],[73,1,12],[74,1,27]]],[44,[[2,1,14],[3,1,29],[4,2,26],[6,1,29],[7,2,25],[9,2,29],[11,1,28],[12,2,29],[14,2,25],[16,1,29],[17,11,28],[28,2,15],[30,3,28],[33,1,25],[34,8,24],[42,1,26],[43,7,20],[50,1,19],[51,7,16],[58,1,11],[59,5,0],[64,1,10],[65,1,22],[66,1,20],[67,2,21],[69,1,23],[70,2,24],[72,1,28],[73,1,15],[74,1,14]]],[45,[[3,1,25],[4,1,26],[5,1,23],[6,1,26],[7,1,29],[8,2,25],[10,2,29],[12,4,25],[16,2,29],[18,6,28],[24,1,29],[25,2,28],[27,1,15],[28,5,28],[33,1,25],[34,7,24],[41,1,26],[42,1,23],[43,7,20],[50,1,19],[51,7,16],[58,1,6],[59,5,0],[64,1,11],[65,1,16],[66,1,17],[67,1,18],[68,1,20],[69,2,24],[71,1,25],[72,1,28],[73,1,14]]],[46,[[3,1,25],[4,2,23],[6,1,26],[7,1,25],[8,3,26],[11,1,29],[12,3,25],[15,3,29],[18,6,28],[24,2,29],[26,7,25],[33,1,23],[34,1,20],[35,6,22],[41,1,23],[42,1,17],[43,6,16],[49,1,17],[50,1,11],[51,7,16],[58,5,0],[63,1,6],[64,4,16],[68,1,19],[69,2,24],[71,1,25],[72,1,15],[73,1,14]]],[47,[[4,1,26],[5,2,23],[7,1,26],[8,3,23],[11,1,26],[12,3,25],[15,4,29],[19,1,28],[20,1,27],[21,2,29],[23,1,25],[24,2,29],[26,1,25],[27,4,24],[31,2,25],[33,1,23],[34,7,20],[41,1,22],[42,7,16],[49,1,19],[50,7,0],[57,1,10],[58,1,2],[59,4,0],[63,5,16],[68,1,23],[69,1,19],[70,1,24],[71,2,14]]],[48,[[4,1,25],[5,1,23],[6,1,22],[7,4,23],[11,1,26],[12,3,25],[15,3,26],[18,1,29],[19,6,25],[25,1,29],[26,2,25],[28,2,24],[30,3,25],[33,1,26],[34,5,20],[39,1,21],[40,1,20],[41,1,22],[42,7,16],[49,1,10],[50,7,0],[57,1,9],[58,2,8],[60,1,3],[61,1,2],[62,1,6],[63,4,16],[67,1,19],[68,1,22],[69,1,20],[70,1,26],[71,2,14]]],[49,[[4,1,27],[5,1,26],[6,2,19],[8,4,23],[12,3,26],[15,3,23],[18,1,26],[19,6,25],[25,1,29],[26,2,25],[28,1,24],[29,2,25],[31,1,24],[32,1,25],[33,1,26],[34,7,20],[41,1,22],[42,7,16],[49,1,6],[50,6,0],[56,1,6],[57,5,8],[62,1,10],[63,1,0],[64,3,16],[67,1,22],[68,1,21],[69,1,22],[70,1,24],[71,1,27]]],[50,[[5,1,25],[6,3,19],[9,3,23],[12,2,26],[14,5,23],[19,1,26],[20,5,25],[25,2,29],[27,2,24],[29,2,26],[31,3,23],[34,7,16],[41,1,17],[42,1,6],[43,5,0],[48,2,6],[50,1,2],[51,5,0],[56,1,3],[57,4,8],[61,1,9],[62,1,6],[63,3,0],[66,1,11],[67,2,21],[69,1,23],[70,1,25],[71,1,27]]],[51,[[5,1,10],[6,1,24],[7,2,19],[9,1,23],[10,3,19],[13,1,26],[14,5,23],[19,1,26],[20,2,25],[22,5,26],[27,1,22],[28,5,20],[33,1,23],[34,8,16],[42,6,0],[48,1,6],[49,2,8],[51,2,3],[53,1,8],[54,1,3],[55,1,6],[56,1,9],[57,4,8],[61,1,6],[62,4,0],[66,1,11],[67,1,17],[68,1,22],[69,1,24],[70,1,25]]],[52,[[6,1,24],[7,1,19],[8,1,11],[9,1,10],[10,3,19],[13,1,26],[14,6,23],[20,1,26],[21,5,23],[26,1,26],[27,1,23],[28,5,20],[33,1,23],[34,8,16],[42,6,0],[48,1,6],[49,6,8],[55,4,18],[59,2,9],[61,4,0],[65,1,6],[66,2,16],[68,1,19],[69,1,25],[70,1,14]]],[53,[[7,1,24],[8,2,6],[10,4,19],[14,1,26],[15,2,22],[17,3,19],[20,1,26],[21,7,23],[28,6,20],[34,1,17],[35,7,16],[42,6,0],[48,1,11],[49,6,8],[55,1,21],[56,4,18],[60,1,9],[61,1,3],[62,1,2],[63,2,0],[65,3,16],[68,1,19],[69,1,25]]],[54,[[7,2,10],[9,2,6],[11,2,19],[13,2,6],[15,6,19],[21,6,23],[27,1,26],[28,1,22],[29,2,20],[31,1,18],[32,2,17],[34,8,6],[42,5,2],[47,1,6],[48,1,9],[49,5,8],[54,1,9],[55,5,18],[60,3,8],[63,1,3],[64,1,10],[65,2,16],[67,1,19],[68,1,24]]],[55,[[8,1,10],[9,2,6],[11,1,10],[12,3,6],[15,1,11],[16,5,19],[21,1,26],[22,2,23],[24,2,22],[26,2,19],[28,6,16],[34,1,6],[35,6,0],[41,1,10],[42,5,8],[47,1,9],[48,6,18],[54,1,22],[55,2,21],[57,2,18],[59,1,9],[60,3,8],[63,1,10],[64,2,0],[66,1,19],[67,1,26],[68,1,24]]],[56,[[8,1,6],[9,1,11],[10,2,9],[12,4,6],[16,3,19],[19,1,11],[20,2,6],[22,7,19],[29,5,16],[34,1,10],[35,6,0],[41,1,10],[42,5,8],[47,6,18],[53,5,21],[58,1,23],[59,1,9],[60,3,8],[63,3,0],[66,1,19],[67,1,25]]],[57,[[9,1,10],[10,1,11],[11,1,8],[12,1,11],[13,3,6],[16,1,11],[17,5,6],[22,7,19],[29,5,16],[34,1,10],[35,6,0],[41,1,9],[42,5,8],[47,1,21],[48,5,18],[53,6,21],[59,2,18],[61,1,9],[62,1,6],[63,2,0],[65,1,16],[66,1,24]]],[58,[[10,1,10],[11,2,9],[13,1,11],[14,1,10],[15,2,9],[17,5,6],[22,1,10],[23,5,19],[28,1,10],[29,4,6],[33,1,0],[34,1,6],[35,6,3],[41,2,18],[43,3,9],[46,1,18],[47,2,21],[49,3,18],[52,2,20],[54,3,21],[57,1,23],[58,4,18],[62,1,3],[63,1,2],[64,1,10],[65,1,11],[66,1,6]]],[59,[[10,1,6],[11,1,11],[12,1,18],[13,1,21],[14,1,19],[15,2,9],[17,1,11],[18,5,6],[23,1,11],[24,4,6],[28,1,0],[29,1,6],[30,4,0],[34,1,6],[35,6,8],[41,1,21],[42,4,18],[46,6,21],[52,1,26],[53,1,24],[54,1,26],[55,1,19],[56,1,22],[57,4,18],[61,2,8],[63,3,6]]],[60,[[11,1,10],[12,1,26],[13,1,20],[14,1,23],[15,1,11],[16,2,9],[18,1,11],[19,1,6],[20,1,3],[21,2,9],[23,1,11],[24,6,6],[30,4,0],[34,1,6],[35,6,8],[41,1,21],[42,4,18],[46,1,23],[47,4,21],[51,1,23],[52,4,24],[56,1,23],[57,3,21],[60,1,9],[61,1,8],[62,1,3],[63,1,0],[64,1,6]]],[61,[[12,1,10],[13,1,23],[14,1,20],[15,1,23],[16,1,18],[17,1,21],[18,1,23],[19,1,19],[20,3,9],[23,1,11],[24,1,10],[25,5,6],[30,4,0],[34,1,6],[35,1,9],[36,4,8],[40,1,9],[41,2,21],[43,3,18],[46,1,23],[47,1,20],[48,3,21],[51,1,26],[52,3,24],[55,1,26],[56,1,20],[57,3,21],[60,1,18],[61,1,9],[62,1,0],[63,1,6]]],[62,[[13,1,6],[14,6,23],[20,1,11],[21,3,9],[24,1,11],[25,3,6],[28,1,10],[29,1,3],[30,1,9],[31,4,8],[35,1,21],[36,5,18],[41,4,21],[45,1,23],[46,1,24],[47,4,26],[51,4,25],[55,1,23],[56,3,21],[59,2,18],[61,1,9],[62,1,6]]],[63,[[14,1,24],[15,1,26],[16,5,23],[21,1,11],[22,1,18],[23,1,20],[24,1,23],[25,1,11],[26,1,8],[27,1,9],[28,2,8],[30,1,11],[31,4,8],[35,1,20],[36,5,18],[41,4,21],[45,1,26],[46,2,24],[48,2,25],[50,1,27],[51,3,15],[54,1,25],[55,1,26],[56,2,23],[58,2,18],[60,1,9],[61,1,10],[62,1,6]]],[64,[[15,1,24],[16,10,23],[26,1,9],[27,2,8],[29,1,9],[30,1,11],[31,4,8],[35,5,18],[40,4,21],[44,1,20],[45,1,26],[46,1,25],[47,2,24],[49,1,25],[50,1,28],[51,2,15],[53,1,28],[54,1,25],[55,2,24],[57,1,23],[58,1,21],[59,1,18],[60,1,10],[61,1,6]]],[65,[[16,1,24],[17,3,26],[20,6,23],[26,1,11],[27,5,9],[32,3,8],[35,1,18],[36,3,21],[39,1,18],[40,1,22],[41,2,23],[43,1,22],[44,1,23],[45,4,25],[49,1,27],[50,3,15],[53,1,25],[54,2,24],[56,1,26],[57,2,21],[59,1,11],[60,1,6]]],[66,[[17,2,27],[19,2,26],[21,6,23],[27,1,19],[28,12,21],[40,1,26],[41,3,24],[44,1,25],[45,4,15],[49,3,12],[52,1,14],[53,2,25],[55,1,26],[56,1,20],[57,1,21],[58,1,11],[59,1,10]]],[67,[[18,2,27],[20,4,26],[24,4,23],[28,3,21],[31,1,23],[32,3,21],[35,1,20],[36,4,21],[40,1,26],[41,3,24],[44,1,27],[45,4,15],[49,2,7],[51,1,12],[52,1,15],[53,1,12],[54,1,14],[55,1,26],[56,1,20],[57,1,19],[58,1,10]]],[68,[[19,1,27],[20,1,14],[21,3,29],[24,1,26],[25,3,23],[28,1,22],[29,2,21],[31,1,23],[32,8,21],[40,1,26],[41,2,24],[43,1,25],[44,1,28],[45,3,15],[48,1,12],[49,2,7],[51,3,15],[54,1,25],[55,1,24],[56,1,26],[57,1,10]]],[69,[[20,1,14],[21,1,28],[22,3,29],[25,1,26],[26,3,23],[29,1,22],[30,3,23],[33,2,21],[35,1,20],[36,4,26],[40,1,27],[41,3,14],[44,3,12],[47,1,7],[48,1,4],[49,1,5],[50,3,15],[53,1,27],[54,1,24],[55,1,26],[56,1,24]]],[70,[[20,1,4],[21,1,14],[22,1,28],[23,3,29],[26,3,26],[29,3,23],[32,1,26],[33,1,23],[34,1,21],[35,1,22],[36,1,26],[37,3,25],[40,1,28],[41,3,15],[44,1,5],[45,2,7],[47,1,2],[48,1,1],[49,1,6],[50,2,7],[52,1,15],[53,1,25],[54,1,26],[55,1,24]]],[71,[[21,1,7],[22,2,14],[24,2,15],[26,3,29],[29,1,26],[30,4,23],[34,2,22],[36,1,26],[37,3,25],[40,1,28],[41,2,15],[43,1,12],[44,2,7],[46,1,4],[47,2,1],[49,2,7],[51,1,12],[52,1,15],[53,1,27],[54,1,25]]],[72,[[22,1,14],[23,1,10],[24,1,27],[25,1,15],[26,1,14],[27,3,29],[30,6,26],[36,7,29],[43,2,27],[45,1,14],[46,1,10],[47,1,2],[48,1,4],[49,1,7],[50,1,12],[51,1,15],[52,1,28],[53,1,27]]],[73,[[23,2,10],[25,1,14],[26,1,15],[27,7,29],[34,2,27],[36,1,29],[37,2,27],[39,2,29],[41,4,27],[45,4,29],[49,1,14],[50,2,15],[52,1,27]]],[74,[[24,1,10],[25,1,27],[26,9,29],[35,1,27],[36,2,29],[38,1,27],[39,2,29],[41,1,27],[42,1,29],[43,2,27],[45,1,29],[46,1,27],[47,1,29],[48,1,27],[49,2,29],[51,1,27]]],[75,[[25,1,14],[26,9,29],[35,1,27],[36,2,29],[38,1,27],[39,1,29],[40,2,27],[42,1,29],[43,1,27],[44,1,29],[45,1,27],[46,1,29],[47,3,27],[50,1,29]]],[76,[[26,1,14],[27,8,29],[35,4,27],[39,1,29],[40,2,27],[42,1,29],[43,1,27],[44,1,29],[45,1,27],[46,1,29],[47,1,27],[48,2,29]]],[77,[[27,1,27],[28,18,29],[46,4,27]]],[78,[[28,7,29],[35,1,27],[36,6,29],[42,1,27],[43,5,29],[48,1,27]]],[79,[[28,1,14],[29,1,29],[30,1,27],[31,1,29],[32,1,27],[33,2,29],[35,1,27],[36,6,29],[42,1,27],[43,2,29],[45,2,27],[47,1,7]]],[80,[[29,5,27],[34,1,29],[35,1,27],[36,7,29],[43,1,27],[44,2,4],[46,1,7]]],[81,[[30,1,29],[31,12,27],[43,3,4]]],[82,[[31,10,27],[43,1,4],[45,1,4]]],[83,[[32,5,27],[37,1,29],[38,1,27],[39,1,29],[40,1,14],[41,1,7],[43,2,7]]],[84,[[32,5,27],[37,1,14],[38,1,27],[39,2,14],[41,1,4]]],[85,[[34,2,14],[36,2,27],[38,3,14],[41,1,7],[42,1,14]]],[86,[[33,1,27],[34,1,14],[35,1,7],[36,1,29],[37,1,7],[38,2,27],[40,1,14],[41,1,7],[42,1,14],[43,1,29]]],[87,[[33,1,29],[34,1,10],[35,1,6],[36,1,29],[37,1,10],[38,2,6],[40,1,27],[41,2,6],[43,1,29]]],[88,[[32,1,29],[33,1,27],[34,1,7],[35,1,14],[36,1,27],[37,1,7],[38,1,6],[39,2,10],[41,2,6],[43,1,29]]],[89,[[32,1,29],[33,1,27],[34,1,29],[35,3,27],[38,1,24],[39,2,26],[41,1,14],[42,1,7],[43,2,27]]]];

  function balloonSprite() {
    // Zip 305 (demande Guillaume : reprendre EXACTEMENT le calque pixel-art
    // fourni — "sers-toi en de calque exact") : l'enveloppe est reproduite
    // pixel pour pixel depuis le calque validé, PAS dessinée par une formule
    // géométrique. La règle du site (aucune image bitmap, tout généré par
    // code) reste respectée : le calque a été converti une fois pour toutes
    // en table de données (BALLOON_PALETTE / BALLOON_ROWS, quelques lignes
    // plus haut) que ce code redessine lui-même via fillRect — pas de
    // `<img>` ni de `drawImage` sur un fichier externe, juste des données
    // que le canvas peint. Le sprite est baké une seule fois comme avant.
    // Grille source : 38×49 "méga-pixels" (résolution native du calque
    // pixel-art fourni), chaque méga-pixel est peint comme un carré de
    // BLOCK px sur le canvas final pour rester net (pas de flou).
    //
    // Zip 306 (demande Guillaume : "agrandir le panier pour qu'il puisse
    // accueillir les 4 visiteurs/résidents") — deux ajustements validés :
    //  1) tout le sprite est très légèrement agrandi (BLOCK 3 → 3.3, environ
    //     +10%) ;
    //  2) le petit panier tracé sur le calque original (à peine 4 "méga-
    //     pixels" de haut, trop exigu pour 4 têtes) est coupé de la grille
    //     (on n'en peint que l'enveloppe + les cordages, jusqu'à
    //     GRID_CUT_ROW) et remplacé par un panier tressé bien plus grand,
    //     redessiné par code dans le même esprit "osier" que les zips
    //     302-304 (montants sombres + brins clair/moyen/foncé en quinconce),
    //     dimensionné explicitement pour laisser de la place à 4 passagers
    //     (les repères d'affichage des têtes sont fixes dans FermeGame.js,
    //     à ±6.75 px de large de part et d'autre du centre à l'écran — le
    //     panier ci-dessous est prévu large pour bien les entourer).
    // Retouche (même zip 306, second passage — retour Guillaume) : le
    // panier tressé dessiné par code s'est révélé un peu trop grand une
    // fois en jeu — réduit de ~20% (50×30 → 40×22), toujours largement
    // suffisant pour les 4 têtes (repères écran à ±6.75 px, soit ~19,5 px
    // de large max une fois BALLOON_SCALE appliqué dans FermeGame.js).
    // Et l'enveloppe (calque photo fourni par Guillaume) a été reconvertie
    // en table de données à résolution DOUBLÉE (38×49 → 76×90 méga-pixels)
    // pour un rendu net au lieu de flouté à l'affichage ; BLOCK est divisé
    // par deux en conséquence (3.3 → 1.65) pour que la taille physique du
    // sprite (donc à l'écran) reste inchangée malgré les mailles deux fois
    // plus fines.
    const BLOCK = 1.65;
    const GRID_W = 76, GRID_CUT_ROW = 90;
    const envH = GRID_CUT_ROW * BLOCK;
    // Panier agrandi (indépendant de la résolution du calque) : dimensions
    // choisies pour rester nettement plus spacieux que l'ancien panier
    // tracé (~27×12 px bakés) et que celui, déjà retiré, des zips 302-304
    // (~38×27 px bakés à l'époque) — réduit ensuite (voir note ci-dessus)
    // car jugé trop imposant en jeu.
    const basketW = 40, basketH = 22, basketGap = 3;
    const W = Math.ceil(GRID_W * BLOCK), H = Math.ceil(envH + basketGap + basketH) + 4;
    const [c, g] = cv(W, H);
    function px(x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    function shadeHex(hex, f) {
      let r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      r = Math.max(0, Math.min(255, r * f)); gg = Math.max(0, Math.min(255, gg * f)); b = Math.max(0, Math.min(255, b * f));
      return `rgb(${r | 0},${gg | 0},${b | 0})`;
    }
    function ropeTwist(x0, y0, x1, y1, thick, colA, colB, period) {
      const dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len, steps = Math.ceil(len);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, sx = x0 + dx * t, sy = y0 + dy * t;
        for (let w = -Math.floor(thick / 2); w <= Math.floor(thick / 2); w++) {
          const phase = (t * len / period + w * 0.5) % 1;
          px(Math.round(sx + nx * w), Math.round(sy + ny * w), phase < 0.5 ? colA : colB);
        }
      }
    }
    // Calque : seules l'enveloppe et les cordages (rangées < GRID_CUT_ROW)
    // sont peints depuis les données tracées — le petit panier d'origine
    // (rangées ≥ GRID_CUT_ROW) est volontairement ignoré ici.
    for (const [y, runs] of BALLOON_ROWS) {
      if (y >= GRID_CUT_ROW) continue;
      for (const [x0, len, ci] of runs) {
        g.fillStyle = BALLOON_PALETTE[ci];
        g.fillRect(x0 * BLOCK, y * BLOCK, len * BLOCK, BLOCK);
      }
    }
    const cx = W / 2;
    const basketX = cx - basketW / 2, basketY = envH + basketGap;
    // Cordages reliant le bas des cordages du calque (qui convergent vers
    // le centre) aux 4 coins du panier élargi.
    const attachTopY = envH - 4 * BLOCK;
    ropeTwist(cx - basketW * 0.30, attachTopY, basketX + 4, basketY + 2, 3, "#9c7a44", "#5c421f", 8);
    ropeTwist(cx - basketW * 0.12, attachTopY, basketX + 4, basketY, 3, "#9c7a44", "#5c421f", 8);
    ropeTwist(cx + basketW * 0.12, attachTopY, basketX + basketW - 4, basketY, 3, "#9c7a44", "#5c421f", 8);
    ropeTwist(cx + basketW * 0.30, attachTopY, basketX + basketW - 4, basketY + 2, 3, "#9c7a44", "#5c421f", 8);
    // Panier tressé : vrai tressage d'osier (montants sombres réguliers +
    // brins clair/moyen/foncé en quinconce), même style que les zips
    // 302-304, redessiné à la nouvelle taille.
    const stakeCol = "#3d2c14", weaveLight = "#a9834e", weaveMid = "#7d5c30", weaveDark = "#523c1c", rimCol = "#c79b5e";
    for (let by = 0; by < basketH; by++) {
      for (let bx = 0; bx < basketW; bx++) {
        const isStake = (bx % 4 === 0);
        const lightF = 1 - (bx / basketW) * 0.35;
        let col;
        if (by === 0 || by === 1) col = shadeHex(rimCol, lightF + 0.15);
        else if (by === basketH - 1) col = shadeHex(stakeCol, lightF + 0.1);
        else if (isStake) col = shadeHex(stakeCol, lightF + 0.2);
        else {
          const weaveRow = Math.floor((by + bx * 0.5) / 2) % 2 === 0;
          col = shadeHex(weaveRow ? weaveLight : weaveMid, lightF + 0.15);
          if ((by + bx) % 7 === 0) col = shadeHex(weaveDark, lightF + 0.1);
        }
        px(Math.round(basketX + bx), Math.round(basketY + by), col);
      }
    }
    // Brûleur : TOUJOURS visible (jour et nuit, demande Guillaume : "c'est
    // ainsi qu'une montgolfière fonctionne") — peint PAR-DESSUS le panier,
    // dans le même esprit que le sprite précédent (support métallique +
    // flamme à plusieurs teintes). La lueur de nuit (percée du voile
    // sombre) reste ajoutée dynamiquement par FermeGame.js via
    // `flameX/flameY`, pas bakée ici (elle doit pulser en direct).
    const flameX = Math.round(cx), flameY = Math.round(basketY - 6);
    P(g, flameX - 3, basketY - 3, 7, 2, "#2a2a2a");
    P(g, flameX - 3, basketY - 5, 2, 2, "#2a2a2a"); P(g, flameX + 1, basketY - 5, 2, 2, "#2a2a2a");
    const flamePix = [
      [0, -6, "#fff8d8"], [0, -5, "#fff8d8"], [0, -4, "#ffe27a"], [0, -3, "#ffe27a"],
      [-2, -2, "#ffb84d"], [-1, -2, "#ffb84d"], [1, -2, "#ffb84d"], [2, -2, "#ffb84d"], [0, -2, "#ffcf5c"],
      [-2, 0, "#ff8a2e"], [-1, 0, "#ff8a2e"], [1, 0, "#ff8a2e"], [2, 0, "#ff8a2e"], [0, 0, "#ffa93d"], [0, -1, "#ffa93d"],
      [-2, 2, "#e05a1c"], [-1, 2, "#e05a1c"], [1, 2, "#e05a1c"], [2, 2, "#e05a1c"], [0, 2, "#ff7020"], [0, 1, "#ff7020"],
    ];
    for (const [dx, dy, col] of flamePix) px(flameX + dx, flameY + dy, col);
    return { canvas: c, w: W, h: H, anchorX: cx, anchorY: basketY, flameX, flameY };
  }

  function artisanBuildingSprite(id) {
    // Zip 264 (demande Guillaume) : boulangerie, scierie et fromagerie sont
    // désormais le PORT EXACT du .html de référence (corrections_et_maisons_
    // valley_town.html) — plus détaillés, moins « effet sticker ». Mêmes
    // coordonnées de dessin, mêmes couleurs, mêmes helpers (roofCap/win/
    // scallop/flowerbox/stoneWall). Les parties animées du mockup (fumée de
    // cheminée, lame qui tourne) sont ici FIGÉES sur une frame représentative
    // (le sprite est baké une fois). L'ancrage au sol passe par C.ARTISAN_FOOT
    // (ligne de contact du bâtiment dans le sprite), pour qu'ils ne flottent
    // pas malgré des toiles plus hautes. Ruche RÉDUITE (demande Guillaume).
    const WALL = "#efe4c8", TIMBER = "#7a5330", ROOF = "#b5543c", ROOFL = "#c9694e", GLASS = "#8fc7ec", STONE = "#9a9aa2", GOLD = "#e8c860", AWN = "#c95a6a", AWNL = "#dd7284";
    // Helpers repris tels quels du .html (mêmes signatures).
    const roofCap = (g, X, Y, W, rc, rl) => { rc = rc || ROOF; rl = rl || ROOFL; const ax = X + W / 2, ay = Y - 15, ex = 6;
      g.fillStyle = rc; g.beginPath(); g.moveTo(X - ex, Y + 2); g.lineTo(ax, ay); g.lineTo(X + W + ex, Y + 2); g.closePath(); g.fill();
      g.fillStyle = rl; g.beginPath(); g.moveTo(X - 2, Y + 1); g.lineTo(ax, ay + 4); g.lineTo(X + W + 2, Y + 1); g.lineTo(X + W - 6, Y + 1); g.lineTo(ax, ay + 9); g.lineTo(X + 8, Y + 1); g.closePath(); g.fill();
      P(g, X - ex, Y + 1, W + 2 * ex, 2, "#6a2c20"); P(g, ax - 1, ay - 4, 2, 5, TIMBER); P(g, ax - 2, ay - 5, 4, 2, GOLD); };
    const win = (g, x, y) => { P(g, x - 1, y - 1, 12, 11, TIMBER); P(g, x, y, 10, 9, GLASS); P(g, x, y, 10, 2, "#a8d4f0"); P(g, x + 4, y, 1, 9, TIMBER); P(g, x, y + 4, 10, 1, TIMBER); };
    const scallop = (g, x, y, n) => { g.fillStyle = AWN; for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x + 2 + i * 4.4, y, 2.4, 0, Math.PI); g.fill(); } P(g, x - 1, y - 3, n * 4.4 + 2, 3, AWN); P(g, x - 1, y - 3, n * 4.4 + 2, 1, AWNL); };
    const flowerbox = (g, x, y) => { P(g, x - 1, y, 12, 3, "#6b4a2e"); for (let f = 0; f < 5; f++) P(g, x + f * 2.4, y - 2, 2, 2, f % 2 ? "#e06a8a" : "#d84040"); P(g, x + 1, y - 1, 9, 1, "#4f7a4a"); };
    const stoneWall = (g, X, Y, W, H) => { P(g, X, Y, W, H, "#d8c8a8");
      for (let y = Y + 4; y < Y + H - 4; y += 5) P(g, X, y, W, 1, "#bda87e");
      for (let y = Y; y < Y + H - 4; y += 5) { const off = ((((y - Y) / 5) | 0) % 2) ? 4 : 0; for (let x = X + off; x < X + W - 1; x += 8) P(g, x, y, 1, 5, "#bda87e"); }
      P(g, X, Y + H - 4, W, 4, STONE); P(g, X, Y + H - 4, W, 1, "#b2b2ba");
      for (let y = Y; y < Y + H - 4; y += 6) { P(g, X, y, 4, 5, "#ece1c6"); P(g, X + W - 4, y, 4, 5, "#ece1c6"); }
      P(g, X, Y, W, 2, "#c2b088"); };

    if (id === "beehive") {
      /* ╔══════════════════════════════════════════════════════════════════════
         ║ ZIP SUIVANT — LA RUCHE EST REDESSINÉE EN VUE DE TROIS QUARTS.
         ║ (demande de Guillaume, sur références fournies)
         ╚══════════════════════════════════════════════════════════════════════
         Ce qu'il y avait ici depuis le 264 : cinq rectangles empilés de plus en
         plus étroits, plus trois lignes horizontales. Vu de face, sans épaisseur,
         sans entrée lisible, sans pieds — une pile de planches jaunes.

         ⚠️⚠️ LE MODÈLE VIENT DE BLENDER, LE DESSIN NON — ET C'EST §9 APPLIQUÉ À
         LA LETTRE. Le skep a été modelé (solide de révolution ogival + un tore
         par assise de paille, ombrage plat, deux lampes Soleil, courbe Standard,
         filtre à 0,01 donc AUCUN anticrénelage), rendu en 44×50 sous l'azimut
         exact de la vue 3/4, puis QUANTIFIÉ. Ce qu'on en garde est ce que §9 dit
         qu'on achète à cette taille : **l'ÉCLAIRAGE**, c'est-à-dire la rampe
         mesurée ci-dessous et le profil. Le rendu lui-même, transcrit tel quel,
         donnait une trame bruitée où les assises de paille disparaissaient —
         exactement le verdict du 426 sur la statue de la Justice. On dessine donc
         à la main SUR des mesures, au lieu de deviner ou de recopier des pixels.

         ⚠️ ET AUCUN PNG N'ENTRE DANS LE JEU (§9) : la ruche reste un canevas
         procédural, donc elle reste regardable au banc de rendu, teintable par
         les saisons et modifiable sans repasser par Blender. */
      const [c, g] = cv(28, 32);
      // Rampe MESURÉE sur le rendu (k-moyennes, 8 tons, triés du sombre au clair).
      // La lumière vient du HAUT-GAUCHE : l'index descend vers la droite.
      const S8 = ["#332917", "#534222", "#7a5f2f", "#9c793e", "#b99147", "#d2a451", "#e7b65a", "#f6c362"];
      const CX = 13.5, Y_TOP = 3, Y_BASE = 27, R_BASE = 10.5;
      /* ⚠️ LE PROFIL EST OGIVAL, PAS CONIQUE, et c'est la première chose que la
         référence impose : un skep est un DÔME posé, pas un chapeau pointu. La
         première passe utilisait cos(t·π/2)^0.62 — mesuré sur le rendu, mais
         mesuré au mauvais endroit (le rendu était cadré serré, donc lu comme
         plus étroit qu'il n'est). Flancs presque droits jusqu'aux deux tiers,
         puis épaulement rond. */
      const halfAt = (y) => {
        const t = Math.max(0, Math.min(1, (Y_BASE - y) / (Y_BASE - Y_TOP)));
        return Math.max(1.2, R_BASE * Math.pow(1 - Math.pow(t, 2.7), 0.40));
      };
      /* LES ASSISES DE PAILLE SONT LE SUJET, PAS UNE TEXTURE. Une par deux
         pixels : au-dessus le brin éclairé, en dessous le joint. C'est ce qui
         fait lire « paille tressée » et pas « dôme jaune », et c'est la première
         chose que la référence montre. */
      for (let y = Y_TOP; y <= Y_BASE; y++) {
        const r = halfAt(y), x0 = Math.round(CX - r), x1 = Math.round(CX + r);
        const coil = ((y - Y_TOP) / 2) | 0;            // n° d'assise, pour décaler la couture
        const seam = ((y - Y_TOP) % 2) === 1;          // 1 rangée sur 2 = le joint
        for (let x = x0; x <= x1; x++) {
          const u = (x - (CX - r)) / (2 * r);          // 0 bord gauche, 1 bord droit
          // Rampe horizontale mesurée : clair légèrement à gauche du centre,
          // chute franche sur le quart droit, liseré sombre au bord.
          let k = u < 0.06 ? 5 : u < 0.12 ? 6 : u < 0.46 ? 7 : u < 0.60 ? 6
                : u < 0.71 ? 5 : u < 0.80 ? 4 : u < 0.88 ? 3 : u < 0.95 ? 2 : 1;
          /* ⚠️ LE JOINT VAUT UN TON, PAS DEUX. À deux, les assises se lisaient
             comme des RAYURES peintes — un dôme zébré, pas de la paille tressée.
             Le tressage se voit au rythme, pas au contraste. */
          /* ⚠️⚠️ CHAQUE ASSISE EST UN BOUDIN ROND, PAS UNE BANDE PLATE, et c'est
             ÇA le détail qui manquait — pas des pixels en plus. Deux rangées par
             assise : le dessus prend la lumière (+1), le dessous est dans son
             propre creux (−1). Le dôme cesse d'être un dégradé rayé pour devenir
             un empilement de tubes, ce qu'un skep EST. */
          k = seam ? Math.max(2, k - 1) : Math.min(7, k + 1);
          /* ⚠️⚠️ LA LIGATURE, ET C'EST ELLE QUI MANQUAIT (« le sprite pas assez
             détaillé »). Un skep n'est pas un dôme rainuré : c'est un boudin de
             paille enroulé, COUSU tous les trois doigts par une éclisse. Sans
             ces points, on lit un tour de potier ; avec, on lit de la vannerie.
             ⚠️ ELLE NE VA QUE DANS LE CREUX (la rangée de joint) ET ELLE
             ÉCLAIRCIT : l'éclisse est lisse, elle accroche la lumière là où la
             paille est dans l'ombre. Un premier essai la semait en diagonale sur
             tout le dôme — ça effaçait les assises et donnait du bruit, c'est-
             à-dire l'inverse du détail. **Du détail, c'est une structure qu'on
             voit mieux, pas des pixels en plus.**
             ⚠️ ET LE PAS EST DÉCALÉ D'UNE ASSISE À L'AUTRE (`coil % 3`), sinon
             les points s'alignent en colonnes et on retombe sur une trame. */
          /* ⚠️ ET LA COUTURE RESTE RARE : un point tous les six pixels, d'un seul
             ton. Deux essais l'ont semée tous les trois pixels — à 28 px de
             large ça noie les assises sous du bruit, c'est-à-dire exactement
             l'inverse de « plus détaillé ». */
          if (seam && (((x - x0) + (coil % 3) * 2) % 6) === 0) k = Math.min(7, k + 2);
          P(g, x, y, 1, 1, S8[k]);
        }
        P(g, x0, y, 1, 1, S8[seam ? 1 : 2]);           // arête gauche
        P(g, x1, y, 1, 1, S8[seam ? 0 : 1]);           // arête droite, plus sombre
      }
      /* ⚠️ PAS DE CALOTTE RAPPORTÉE AU SOMMET. Les deux premières passes en
         posaient une, plus large que la dernière assise : ça faisait une POINTE
         qui dépassait du dôme, exactement ce qu'un skep n'a pas. Le profil se
         referme tout seul ; on se contente d'éclairer sa crête. */
      P(g, Math.round(CX) - 1, Y_TOP, 2, 1, S8[7]);
      /* ⚠️ L'OCCLUSION AU PIED. Deux rangées assombries à la base : sans elles la
         ruche est POSÉE SUR rien, et à l'échelle du jeu c'est ce qui la faisait
         flotter au-dessus de son ombre portée. */
      for (let y = Y_BASE - 1; y <= Y_BASE; y++) {
        const r = halfAt(y), x0 = Math.round(CX - r), x1 = Math.round(CX + r);
        g.fillStyle = "rgba(40,26,10,0.22)"; g.fillRect(x0, y, x1 - x0 + 1, 1);
      }
      /* L'ENTRÉE. ⚠️ ELLE EST DÉCENTRÉE VERS LA GAUCHE, pas au milieu : en trois
         quarts, la face vue est celle qui regarde la caméra, et son centre n'est
         pas le centre de la silhouette. Centrée, elle faisait lire la ruche de
         face — c'est ce qui manquait le plus à l'ancien dessin. */
      const EX = 12, EY = 19;
      g.fillStyle = "#241a0d"; g.beginPath(); g.ellipse(EX, EY, 3.0, 2.3, 0, 0, 7); g.fill();
      g.fillStyle = "#3d2c15"; g.beginPath(); g.ellipse(EX, EY - 0.6, 2.4, 1.4, 0, 0, 7); g.fill();
      P(g, EX - 3, EY - 3, 6, 1, S8[1]);               // lèvre supérieure, à l'ombre
      // La planche d'envol : étroite, collée sous l'entrée, en fuite à droite.
      P(g, EX - 3, EY + 3, 6, 1, "#c99a5e"); P(g, EX - 3, EY + 4, 6, 1, "#8a5f36");
      P(g, EX + 3, EY + 4, 2, 1, "#6a4526");
      /* L'ABEILLE GRAVÉE (elle est sur la référence). ⚠️ ELLE RESTE DISCRÈTE :
         au premier essai elle avait le contraste de l'entrée et se lisait comme
         une SECONDE entrée — deux trous dans une ruche, personne ne comprend. */
      P(g, EX - 1, EY - 7, 2, 2, "#6a5028"); P(g, EX - 1, EY - 6, 2, 1, "#a8863c");
      P(g, EX - 2, EY - 7, 1, 1, "#00000030"); P(g, EX + 1, EY - 7, 1, 1, "#00000030");
      // Quatre pieds : deux devant (nets), deux derrière (à peine visibles).
      P(g, 6, 26, 2, 4, "#6a4526"); P(g, 19, 26, 2, 4, "#6a4526");
      P(g, 6, 26, 1, 4, "#8a5f36"); P(g, 19, 26, 1, 4, "#8a5f36");
      P(g, 11, 27, 2, 3, "#553719"); P(g, 16, 27, 2, 3, "#553719");
      outlineSprite(g, 28, 32, "#4a2f16");
      return c;
    }

    if (id === "fromagerie") {
      // Port exact du mockup « p_cheese » (64x82).
      const [c, g] = cv(64, 82); const X = 9, Y = 32, W = 46, H = 30, cxb = X + W / 2;
      stoneWall(g, X, Y, W, H); roofCap(g, X, Y, W);
      win(g, X + 3, Y + 8); win(g, X + W - 13, Y + 8);                 // fenêtres écartées, symétriques
      P(g, cxb - 4, Y + 15, 8, H - 17, TIMBER); P(g, cxb - 3, Y + 17, 6, H - 19, "#8a6340"); P(g, cxb + 1, Y + 22, 1, 2, GOLD); // porte centrée
      P(g, cxb - 1, Y - 6, 2, 4, TIMBER); g.fillStyle = "#f2d873"; g.beginPath(); g.arc(cxb, Y - 9, 4, 0, 7); g.fill();
      g.fillStyle = "#e0b84a"; g.beginPath(); g.moveTo(cxb, Y - 9); g.arc(cxb, Y - 9, 4, -0.6, 0.6); g.closePath(); g.fill();
      // tommes superposées devant (deux piles symétriques)
      const tomme = (x, y, w) => { g.fillStyle = "#e7d49a"; g.beginPath(); g.ellipse(x, y, w, w * 0.42, 0, 0, 7); g.fill(); P(g, x - w, y - w * 0.42, w * 2, w * 0.42, "#e7d49a"); P(g, x - w, y, w * 2, w * 0.36, "#cdb26a"); g.fillStyle = "#dcc584"; g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + w, y - w * 0.42); g.lineTo(x + w, y); g.closePath(); g.fill(); };
      const stack = (cx, by) => { tomme(cx, by, 7); tomme(cx, by - 4, 6); tomme(cx, by - 8, 5); };
      stack(X + 9, Y + H + 7); stack(X + W - 9, Y + H + 7);
      // drapeau de Savoie (croix blanche couppée / fond rouge)
      P(g, X - 3, Y - 20, 1, 22, "#5a4530"); P(g, X - 2, Y - 20, 13, 9, "#d21f2a"); P(g, X + 3, Y - 18, 2, 5, "#fff"); P(g, X + 1, Y - 16, 6, 2, "#fff");
      return c;
    }

    if (id === "sawmill") {
      // Port exact du mockup « p_sawmill » (72x80), toit foncé + scie au sol.
      const [c, g] = cv(72, 80); const X = 12, Y = 30, W = 46, H = 28;
      P(g, X, Y, W, H, WALL); P(g, X, Y + H - 4, W, 4, STONE); P(g, X, Y + H - 4, W, 1, "#b2b2ba");
      P(g, X, Y, 2, H - 4, TIMBER); P(g, X + W - 2, Y, 2, H - 4, TIMBER); P(g, X, Y, W, 2, TIMBER);
      P(g, X + 16, Y, 1, H - 4, "#6a4526"); P(g, X + 32, Y, 1, H - 4, "#6a4526");
      roofCap(g, X, Y, W, "#8a3d2c", "#a04434"); // toit foncé
      P(g, X + W / 2 - 5, Y + 14, 10, H - 16, TIMBER); P(g, X + W / 2 - 3, Y + 16, 6, H - 18, "#8a6340"); P(g, X + W / 2 + 2, Y + 21, 1, 2, GOLD);
      P(g, X + 6, Y + 7, 1, 11, "#7a5330"); P(g, X + 4, Y + 6, 4, 3, "#c9ccd2"); P(g, X + 4, Y + 6, 1, 3, "#e6e9ee");
      P(g, X + 14, Y + 6, 20, 2, "#c9ccd2"); for (let i = 0; i < 9; i++) P(g, X + 15 + i * 2, Y + 8, 1, 1, "#9aa0a8"); P(g, X + 13, Y + 5, 2, 4, "#8a5a30"); P(g, X + 33, Y + 5, 2, 4, "#8a5a30");
      P(g, X + 39, Y + 7, 1, 10, "#7a5330"); P(g, X + 37, Y + 6, 5, 3, "#8a5a30"); P(g, X + 37, Y + 6, 5, 1, "#a87745");
      P(g, X + W + 2, Y + 18, 14, 5, "#b98a52"); P(g, X + W + 4, Y + 23, 12, 5, "#a87a44"); P(g, X + W + 2, Y + 18, 14, 1, "#d8a86a");
      P(g, X + W + 4, Y + 20, 2, 2, "#7a5230"); P(g, X + W + 10, Y + 20, 2, 2, "#7a5230");
      const tY = Y + H + 8, cx = X + 22;
      P(g, X + 10, tY, 26, 6, "#8a6340"); P(g, X + 10, tY, 26, 1, "#a87745"); P(g, X + 12, tY + 6, 2, 4, "#6a4526"); P(g, X + 32, tY + 6, 2, 4, "#6a4526");
      // Scie AU SOL — frame figée (angle 0) : bûche + lame circulaire dentée.
      P(g, X + 8, tY - 4, 30, 4, "#b98a52"); P(g, X + 8, tY - 4, 30, 1, "#d8a86a"); P(g, cx - 1, tY - 4, 2, 4, "#6a4526");
      g.save(); g.translate(cx, tY - 3); g.fillStyle = "#d0d3d8"; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill();
      g.fillStyle = "#8a8d94"; for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(an) * 7, Math.sin(an) * 7); g.lineTo(Math.cos(an + 0.15) * 9, Math.sin(an + 0.15) * 9); g.lineTo(Math.cos(an + 0.3) * 7, Math.sin(an + 0.3) * 7); g.fill(); }
      g.fillStyle = "#6a6d74"; g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); g.restore();
      return c;
    }

    // bakery — port exact du mockup « p_bakery » (64x76), cheminée courte.
    const [c, g] = cv(64, 76); const X = 9, Y = 32, W = 46, H = 30;
    stoneWall(g, X, Y, W, H); roofCap(g, X, Y, W);
    const chX = X + W - 15; P(g, chX, Y - 16, 8, 14, "#c9bfae"); for (let y = Y - 12; y < Y - 4; y += 4) P(g, chX, y, 8, 1, "#a89e8c");
    P(g, chX - 1, Y - 18, 10, 3, "#b0a692"); P(g, chX - 1, Y - 18, 10, 1, "#c9bfae");
    P(g, X + 4, Y + 9, 20, 10, TIMBER); P(g, X + 5, Y + 10, 18, 8, GLASS); P(g, X + 5, Y + 10, 18, 1, "#6ba7d0");
    P(g, X + 8, Y + 13, 4, 4, "#e8b96a"); P(g, X + 8, Y + 12, 4, 1, "#f6d9a4"); P(g, X + 9, Y + 11, 2, 1, "#e87a9a");
    P(g, X + 14, Y + 13, 4, 4, "#d79a5a"); P(g, X + 14, Y + 12, 4, 1, "#f2c98a"); P(g, X + 20, Y + 13, 3, 4, "#e2a84a");
    scallop(g, X + 3, Y + 8, 6);
    P(g, X + 28, Y + 16, 12, 14, TIMBER); P(g, X + 30, Y + 18, 8, 12, "#8a6340"); P(g, X + 37, Y + 24, 1, 2, GOLD);
    P(g, X + 16, Y - 1, 10, 6, "#8a5a36"); P(g, X + 20, Y - 2, 2, 1, "#6a4426"); P(g, X + 19, Y + 2, 4, 2, "#f0b7c2"); P(g, X + 19, Y + 1, 4, 1, "#e88aa0"); P(g, X + 20, Y, 2, 1, "#c65a78");
    flowerbox(g, X + 5, Y + 26);
    // Fumée figée au-dessus de la cheminée (le mockup l'animait par rAF).
    const cx = chX + 4; g.fillStyle = "rgba(235,235,235,0.8)";
    g.beginPath(); g.arc(cx, Y - 20, 1.5, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 1.6, Y - 25, 1.2, 0, 7); g.fill(); g.beginPath(); g.arc(cx - 1, Y - 30, 0.9, 0, 7); g.fill();
    return c;
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP SUIVANT — L'ÉTABLI DE L'APICULTEUR. (demande de Guillaume, sur
     ║ référence fournie : « la petite table de travail sera à côté de la ruche,
     ║ sur la gauche ».)
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ TROIS CANEVAS, PAS UN SEUL AVEC DES DRAPEAUX. L'établi, l'enfumoir et
     les pots de miel s'affichent indépendamment : l'enfumoir SEULEMENT quand
     René n'est pas en combi (il l'a en main quand il travaille), les pots
     SEULEMENT quand il y a vraiment du miel en stock. Un sprite unique aurait
     demandé quatre variantes cuites (rien / enfumoir / miel / les deux), donc
     quatre dessins à tenir d'accord — le doublon du §8. Trois calques
     transparents empilés par un `drawImage` chacun : une seule description de
     chaque objet, et la combinaison est gratuite.
     ⚠️ ILS PARTAGENT LE MÊME CADRE (26×22) ET LA MÊME LIGNE DE SOL, sans quoi
     l'appelant devrait connaître trois décalages — et le jour où l'établi
     grandit, l'enfumoir flotterait. */
  function beeTableSprite(layer) {
    /* ⚠️⚠️ 22×18, ET C'EST UNE RÉDUCTION DEMANDÉE EN JEU. La première version
       faisait 26×24 : à l'écran, à côté d'un skep de 28×32, elle ne se lisait
       plus comme un ÉTABLI mais comme un second meuble aussi imposant que la
       ruche (« la table est trop grosse par rapport à la ruche »). Un plan de
       travail est un accessoire : il doit faire environ la moitié de la hauteur
       de ce à quoi il sert. C'est le corollaire de render-echelle.mjs — un objet
       ne se juge pas seul, il se juge contre celui d'à côté.
       ⚠️ LE CADRE RESTE COMMUN AUX TROIS CALQUES, avec la même ligne de sol :
       sans ça l'appelant devrait connaître trois décalages, et le jour où
       l'établi change de taille l'enfumoir flotterait.
       ⚠️ ET LES DEUX OBJETS SE PARTAGENT LA TABLE PAR MOITIÉS (enfumoir à
       gauche, pots à droite) : ils s'affichent indépendamment, donc ils doivent
       pouvoir s'afficher ENSEMBLE sans se recouvrir. */
    const [c, g] = cv(22, 18);
    const WOODD = "#6a4526", WOOD = "#8a5f36", WOODL = "#a87745", WOODH = "#c99a5e";
    const TOP = 9;                                          // dessus du plateau
    if (layer === "table") {
      P(g, 1, TOP, 20, 2, WOODL); P(g, 1, TOP, 20, 1, WOODH);   // dessus, éclairé
      P(g, 1, TOP + 2, 20, 2, WOOD);                            // chant, à l'ombre
      P(g, 1, TOP + 4, 20, 1, WOODD);
      for (const x of [6, 12, 17]) P(g, x, TOP, 1, 2, "#00000022"); // veines
      P(g, 18, TOP + 3, 1, 1, WOODD);                           // nœud
      // Deux pieds, l'arête claire du côté de la lumière (elle vient de gauche).
      P(g, 3, TOP + 5, 2, 4, WOOD); P(g, 3, TOP + 5, 1, 4, WOODL);
      P(g, 16, TOP + 5, 2, 4, WOOD); P(g, 16, TOP + 5, 1, 4, WOODL);
      P(g, 3, TOP + 8, 2, 1, WOODD); P(g, 16, TOP + 8, 2, 1, WOODD);
      // Une entretoise : c'est elle qui fait lire « établi » et pas « planche
      // sur deux bâtons », et elle coûte trois pixels.
      P(g, 5, TOP + 6, 11, 1, WOOD); P(g, 5, TOP + 6, 11, 1, WOODD);
      outlineSprite(g, 22, 18, "#4a2f16");
      return c;
    }
    if (layer === "smoker") {
      /* L'ENFUMOIR, MOITIÉ GAUCHE. Palette FROIDE assumée : c'est le seul objet
         métallique de la scène, et c'est ce qui le distingue au premier coup
         d'œil des pots de miel. */
      const STEEL = "#8fa6b4", STEELL = "#b6c8d4", STEELD = "#5d7280";
      P(g, 4, 5, 5, 4, STEEL); P(g, 4, 5, 1, 4, STEELL); P(g, 8, 5, 1, 4, STEELD);
      P(g, 4, 8, 5, 1, STEELD);                             // assise sur le plateau
      P(g, 5, 3, 3, 2, STEEL); P(g, 5, 3, 3, 1, STEELL);    // couvercle
      P(g, 6, 1, 2, 2, STEELD); P(g, 6, 1, 1, 2, STEEL);    // bec
      P(g, 2, 4, 2, 5, WOOD); P(g, 2, 4, 1, 5, WOODL); P(g, 2, 8, 2, 1, WOODD); // soufflet
      P(g, 3, 6, 1, 1, STEELD);                             // charnière
      outlineSprite(g, 22, 18, "#3a4a55");
      return c;
    }
    /* « honey » — LES POTS, MOITIÉ DROITE, trois hauteurs comme sur la
       référence. ⚠️ COUVERCLES À FLEUR DU POT, pas débordants : à cette taille
       un couvercle plus large que son bocal soude les trois pots en une barre
       brune et on ne compte plus rien. Le reflet vertical est ce qui fait lire
       le VERRE — sans lui, ce sont des cubes jaunes. */
    const GLASS = "#f2c94b", GLASSD = "#d9a92e", GLASSL = "#ffe89a", LID = "#8a5a30", LIDL = "#a87745";
    const jar = (x, h2) => {
      const y = TOP - h2;
      P(g, x, y, 3, h2, GLASS); P(g, x, y, 1, h2, GLASSD); P(g, x + 2, y, 1, h2, GLASSD);
      P(g, x + 1, y + 1, 1, h2 - 2, GLASSL);
      P(g, x, TOP - 1, 3, 1, GLASSD);                       // fond, plus dense
      P(g, x, y - 2, 3, 2, LID); P(g, x, y - 2, 3, 1, LIDL);
    };
    jar(11, 5); jar(15, 7); jar(19, 4);
    outlineSprite(g, 22, 18, "#5a3a1e");
    return c;
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP SUIVANT — LA LAVANDE, ET ELLE N'EST PAS DÉCORATIVE.
     ╚══════════════════════════════════════════════════════════════════════════
     Elle est sur les trois vues de la référence de Guillaume, et je l'avais
     simplement oubliée. ⚠️ ELLE A UNE RAISON D'ÊTRE LÀ, ce qui est le seul
     critère : un rucher se plante à côté de ce qui fleurit, et la lavande est la
     fleur à abeilles par excellence. Elle explique la ruche autant qu'elle
     l'accompagne — c'est pour ça qu'elle va du côté OPPOSÉ à l'établi (les
     abeilles d'un côté, le travail de l'homme de l'autre) et non collée à lui.
     ⚠️ ET L'ABEILLE PEINTE SUR LE POT VIENT DE LA RÉFÉRENCE, elle aussi. */
  function beeLavenderSprite() {
    /* ⚠️ 12×14, ET C'EST DÉLIBÉRÉMENT PETIT. Un premier jet en 14×18 montait à
       hauteur de poitrine de la fermière : un pot de lavande n'est pas un
       arbuste. Sur la référence il fait environ le tiers de la ruche — ici
       14/32, ce qui est le même rapport. */
    const [c, g] = cv(12, 14);
    const POT = "#b5643c", POTL = "#cd7a4e", POTD = "#8c4526", SOIL = "#4a3320";
    const STEM = "#5d7a44", STEML = "#7a9a58";
    const LAV = "#8e6bc0", LAVL = "#b294dd", LAVD = "#6a4a99";
    const SOIL_Y = 9;
    // Le pot : tronconique, rebord débordant, arête claire du côté de la lumière.
    P(g, 3, SOIL_Y + 1, 6, 4, POT); P(g, 3, SOIL_Y + 1, 1, 4, POTL); P(g, 8, SOIL_Y + 1, 1, 4, POTD);
    P(g, 4, SOIL_Y + 4, 4, 1, POTD);
    P(g, 2, SOIL_Y - 1, 8, 2, POT); P(g, 2, SOIL_Y - 1, 8, 1, POTL); P(g, 2, SOIL_Y, 8, 1, POTD); // rebord
    P(g, 3, SOIL_Y + 1, 6, 1, SOIL);                                                              // terre
    P(g, 5, SOIL_Y + 2, 2, 1, "#e8c24a"); P(g, 5, SOIL_Y + 3, 2, 1, "#3d2c15");                   // l'abeille peinte
    /* LES ÉPIS. ⚠️ TROIS HAUTEURS ET TROIS INCLINAISONS : trois épis identiques
       et verticaux font un peigne, pas un bouquet. Les tiges DESCENDENT jusqu'à
       la terre — sans elles les fleurs flottent au-dessus du pot. */
    const spike = (x, top, h2) => {
      for (let i = 0; i < h2; i++) P(g, x, top + i, 1, 1, i === 0 ? LAVL : i < h2 - 1 ? LAV : LAVD);
      P(g, x - 1, top + 1, 1, 1, LAVL); P(g, x + 1, top + 2, 1, 1, LAVD);
      for (let y = top + h2; y < SOIL_Y + 1; y++) P(g, x, y, 1, 1, y % 2 ? STEM : STEML);
    };
    spike(4, 3, 4); spike(6, 1, 5); spike(8, 4, 3);
    outlineSprite(g, 12, 14, "#4a2f16");
    return c;
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP SUIVANT — LE TAXI DE VALLEY TOWN.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ MODÉLISÉ SOUS BLENDER, DESSINÉ À LA MAIN — ET C'EST §9 QUI LE DIT, PAS
     UNE FACILITÉ. La caisse a été montée en volumes (capot, habitacle, coffre,
     ailes, roues, damier, enseigne), éclairée par deux Soleil, rendue à plat,
     sans anticrénelage, sous l'azimut exact de chaque direction du jeu. Ce
     qu'on en garde est ce que §9 dit qu'on achète à cette taille : **la RAMPE
     et les PROPORTIONS**. Transcrit pixel à pixel, le rendu donnait une bouillie
     où ni les roues ni la ceinture de caisse ne se lisaient — le verdict exact du
     426 sur la statue de la Justice, et du zip précédent sur la ruche.
     La rampe ci-dessous est MESURÉE (k-moyennes sur le rendu, 10 tons).

     ⚠️ TROIS DIRECTIONS, PAS QUATRE. L'ouest est l'est retourné : une voiture
     est symétrique, et deux dessins du même profil finiraient par diverger (§8).
     Le retournement se fait au rendu, comme pour les personnages.

     ⚠️ ET LE POT D'ÉCHAPPEMENT A UNE POSITION NOMMÉE (`exhaust`), pas devinée
     par l'appelant : la fumée doit sortir du tuyau, et le tuyau n'est pas au
     même endroit de face, de dos et de profil. Une position réglée à la main
     dans la boucle de rendu est une position qui penchera (leçon du 431). */
  function taxiSprite(dir) {
    // Rampe mesurée sur le rendu Blender (du plus sombre au plus clair).
    const Y0 = "#5a4817", Y1 = "#876b30", Y2 = "#b78f26", Y3 = "#d8ad32", Y4 = "#fbcb34", Y5 = "#ffd23a";
    const GLS = "#434f56", GLSL = "#5f7280", TYR = "#141414", TYRL = "#242424";
    const CHR = "#d5cdbe", CHRD = "#9a9488", BLK = "#1a1a18", RED = "#c0322a", LMP = "#ffe9a8";
    /* ⚠️ LE PNEU DOIT DOMINER LA JANTE. Premier jet : jante à r−1,7 — à cette
       taille elle mangeait la roue et on lisait deux disques blancs sous la
       caisse, pas des roues. Une roue se reconnaît à sa GOMME ; le chrome n'est
       qu'un reflet au centre. */
    const wheel = (g2, cx, cy, r) => {
      g2.fillStyle = TYR; g2.beginPath(); g2.ellipse(cx, cy, r, r, 0, 0, 7); g2.fill();
      g2.fillStyle = TYRL; g2.beginPath(); g2.ellipse(cx, cy - 0.5, r - 0.9, r - 0.9, 0, 0, 7); g2.fill();
      g2.fillStyle = CHRD; g2.beginPath(); g2.ellipse(cx, cy, r - 2.2, r - 2.2, 0, 0, 7); g2.fill();
      g2.fillStyle = CHR; g2.beginPath(); g2.ellipse(cx - 0.4, cy - 0.4, r - 2.8, r - 2.8, 0, 0, 7); g2.fill();
    };

    /* ⚠️ ZIP 436 — LA ROUE GAGNE SES RAYONS ET SON REFLET. Retour de Guillaume :
       « le taxi peut être plus travaillé ». Une roue de huit pixels de diamètre
       ne peut pas porter cinq bâtons de jante, mais elle peut porter DEUX
       choses : un moyeu qui n'est pas au centre optique (la lumière vient du
       nord-ouest, donc le chrome brille en haut à gauche) et un liseré de gomme
       plus clair en haut — l'arête du pneu qui prend le jour. Sans ça, une roue
       est un point noir. */
    const wheelDetail = (g2, cx, cy, r) => {
      wheel(g2, cx, cy, r);
      P(g2, Math.round(cx - r + 1), Math.round(cy - r), Math.max(1, Math.round(r * 1.4)), 1, "#3a3a3a");
      P(g2, Math.round(cx - 1), Math.round(cy - 1), 1, 1, "#f2ece0");     // l'éclat du moyeu
    };
    /* Une rampe verticale sur la caisse. ⚠️ C'EST LA SEULE CHOSE QUI DONNE DU
       VOLUME À UN FLANC PLAT, et le dessin du 433 ne l'avait pas : une berline
       vue de côté est un cylindre couché, donc son flanc s'assombrit vers le bas
       de caisse ET vers l'épaule (le haut retourne vers le toit). Cinq valeurs
       suffisent ; six feraient de la bande. */
    const FLANK = [Y4, Y3, Y3, Y3, Y3, Y2, Y1];

    if (dir === "e") {
      /* PROFIL — LA VUE QU'ON VOIT LE PLUS (les avenues sont est-ouest).
         ⚠️⚠️ LES PROPORTIONS SONT CELLES DU MONDE RÉEL, RAMENÉES AU PERSONNAGE.
         Premier jet (432) : 34×20. À l'écran, à côté d'un fermier de 23 px
         peints et de bancs de deux cases, ça donnait une voiturette. Le repère
         n'est pas une intuition, c'est une mesure : une berline fait ~4,2 m pour
         1,5 m de haut, un adulte 1,70 m. Donc, avec un fermier à 23 px :
         LONGUEUR ≈ 2,4 × 23 ≈ 54 px, HAUTEUR DE TOIT ≈ 0,88 × 23 ≈ 20 px. D'où
         48×24 hors-tout, ce qui retombe juste sur l'autre repère : trois cases
         de long, la largeur exacte d'une chaussée de la ville.

         ⚠️⚠️ ZIP 436 — CE QUI A CHANGÉ, ET POURQUOI CE N'EST PAS DU DÉTAIL.
         Le dessin du 433 était juste de proportions et PLAT de matière : un
         aplat `Y3` sur toute la caisse, un aplat `Y4` sur tout le pavillon,
         deux vitres unies, deux disques noirs. À côté d'un sol qui a reçu son
         granulat, ses éclats et ses joints décalés (434) et d'une eau qui a
         reçu sa profondeur (435), le véhicule était l'élément le plus PAUVRE de
         la ville — et c'est ce que Guillaume a vu.
         Six ajouts, et chacun répond à une chose qu'un œil cherche sur une
         voiture avant d'en chercher une autre :
           1. le flanc est une RAMPE, pas un aplat (voir FLANK) ;
           2. les PASSAGES DE ROUE sont creusés — c'est le trou d'ombre au-dessus
              du pneu qui dit « la roue est dans la carrosserie », sans lui la
              voiture est posée SUR ses roues ;
           3. le REFLET DE VITRE en diagonale : une vitre unie est un trou, une
              vitre avec sa diagonale est du verre ;
           4. l'OMBRE DE CAISSE entre les roues (le dessous), qui ancre au sol ;
           5. l'ENSEIGNE est ALLUMÉE (ambre, avec son halo sur le toit) : c'est
              elle qui dit « taxi » de loin, et éteinte elle ne disait rien ;
           6. les CLIGNOTANTS ambre à côté des optiques, et la trappe à essence.
         ⚠️ Ce qui n'a PAS changé : les trois lignes (ROOF 4 / BELT 11 /
         SILL 18), la ligne de sol à 23 et le gabarit. `render-taxi.mjs` échoue
         si l'une d'elles bouge, et il a raison — cinq vues doivent décrire le
         même véhicule (§8). */
      const [c, g] = cv(48, 24);
      const SILL = 18, BELT = 11, ROOF = 4, WY = 19, WR = 4.0;
      /* ---- 1. LA CAISSE. Un profil par rangée : la voiture est plus courte en
         haut de caisse qu'en bas (les ailes débordent), et ses deux bouts sont
         arrondis. Écrit en table, donc impossible à décentrer à la main. */
      const EXT = [[4, 44], [2, 46], [1, 47], [1, 47], [1, 47], [2, 46], [3, 45]];
      for (let k = 0; k < EXT.length; k++) {
        const [xa, xb] = EXT[k];
        P(g, xa, BELT + k, xb - xa, 1, FLANK[k]);
      }
      /* ---- 2. L'HABITACLE. Montants inclinés vers l'arrière (le pare-brise est
         plus couché que la lunette), arête de toit éclairée. */
      P(g, 12, ROOF, 18, BELT - ROOF, Y4);
      P(g, 30, ROOF + 1, 1, 2, Y3); P(g, 31, ROOF + 3, 1, 2, Y3); P(g, 32, ROOF + 5, 1, 2, Y3);
      P(g, 11, ROOF + 2, 1, 2, Y3); P(g, 10, ROOF + 4, 1, 3, Y3);
      P(g, 12, ROOF, 18, 1, Y5);
      /* ---- 3. LES VITRES, ET LEUR REFLET. ⚠️ LA DIAGONALE EST LE SUJET : une
         vitre d'un seul gris est un TROU dans la carrosserie. Deux pixels
         clairs en escalier suffisent à la faire lire comme du verre — c'est le
         même principe que l'arête éclairée d'un pavé (434), à ceci près qu'ici
         la lumière traverse. */
      const glass = (gx, gy, gw, gh) => {
        P(g, gx, gy, gw, gh, GLS);
        P(g, gx, gy, gw, 1, GLSL);
        for (let k = 0; k < Math.min(gw - 1, gh + 1); k++) P(g, gx + 1 + k, gy + gh - 1 - k, 1, 1, "#7e94a2");
        P(g, gx, gy + gh - 1, gw, 1, "#39434a");        // la lèvre basse, dans l'ombre du joint
      };
      glass(13, ROOF + 1, 8, 5);
      glass(23, ROOF + 1, 6, 5);
      P(g, 21, ROOF + 1, 2, 5, Y3);                     // montant central
      P(g, 12, ROOF + 1, 1, 5, CHRD); P(g, 29, ROOF + 1, 1, 5, CHRD);   // encadrement chromé
      P(g, 30, ROOF + 4, 3, 1, CHRD);                   // et son retour sur le pare-brise
      /* ---- 4. LE DAMIER, juste sous les vitres — c'est là qu'il est sur une
         vraie voiture, et la seule hauteur où il ne se confond pas avec l'ombre
         du châssis. ⚠️ DEUX RANGÉES DÉCALÉES : un damier à une seule rangée
         n'est pas un damier, c'est une frise. */
      /* ⚠️ DEUX RANGÉES, PAS TROIS — mesuré au banc, pas décidé. La caisse ne
         fait que SEPT rangées entre la ceinture et le bas de caisse ; un damier
         de trois en mange 43 %, et il ne restait plus que deux rangées de jaune
         en dessous : la voiture portait une jupe sombre. À deux rangées, le
         jaune reste majoritaire et le damier reste lisible à trois cases. */
      P(g, 3, BELT, 42, 1, CHRD);
      for (let i = 0; i < 14; i++) P(g, 3 + i * 3, BELT + 1, 3, 2, i % 2 ? BLK : CHR);
      P(g, 3, BELT + 3, 42, 1, "rgba(40,32,12,0.30)");   // l'ombre que la bande porte sur la caisse
      /* ---- 5. LES PASSAGES DE ROUE. ⚠️ SANS EUX LA VOITURE EST POSÉE SUR SES
         ROUES AU LIEU DE LES CONTENIR. On creuse un arc d'ombre au-dessus du
         pneu, et on éclaire la lèvre d'aile juste au-dessus : l'un ne marche
         pas sans l'autre — l'ombre seule fait une tache, la lèvre seule fait un
         sourcil. */
      /* ⚠️ ON DESSINE L'ARC, PAS LA ZONE SOUS L'ARC — premier jet de ce zip, et
         il a fallu le regarder pour le voir : `fillRect` de la corde entière à
         chaque rangée donnait un demi-cercle dont les quatre rangées faisaient
         5 px de demi-largeur, c'est-à-dire un RECTANGLE brun en travers du bas
         de caisse. Un passage de roue est un LISERÉ creux plus une lèvre
         éclairée ; ce qu'il y a entre les deux, c'est la roue. */
      /* ⚠️ L'ARC RESTE SOUS LA BANDE DAMIER, ET C'EST UNE CONTRAINTE DE PLACE,
         pas un choix esthétique : entre la ceinture (11) et le sol de caisse
         (18) il n'y a que sept rangées, et le pneu monte déjà jusqu'à 15. Un
         passage de roue plus grand traverserait le damier — vu au banc, ça
         faisait deux bosses jaunes au milieu des carreaux. On serre donc l'arc
         contre la gomme : quatre rangées, rayon 4,6. */
      const AR = 4.6;
      for (const wx of [11, 35]) {
        for (let dy = -4; dy <= -1; dy++) {
          const hw = Math.round(Math.sqrt(Math.max(0, AR * AR - dy * dy)));
          if (hw < 1) continue;
          P(g, wx - hw, WY + dy, 1, 1, "#5a4818"); P(g, wx + hw, WY + dy, 1, 1, "#5a4818");
        }
        P(g, wx - 3, WY - 5, 7, 1, Y4);                 // la lèvre d'aile, éclairée
      }
      /* ---- 6. LES ACCESSOIRES. Portière, poignées, trappe à essence, pot. */
      P(g, 21, BELT + 4, 1, SILL - BELT - 4, Y1);       // ligne de portière
      P(g, 18, BELT + 4, 3, 1, CHRD); P(g, 26, BELT + 4, 3, 1, CHRD);   // poignées
      P(g, 6, BELT + 5, 3, 2, Y2); P(g, 6, BELT + 5, 3, 1, Y4);         // trappe à essence
      P(g, 3, SILL - 1, 42, 1, Y1);                     // bas de caisse
      /* ---- 7. LES BOUTS. Pare-chocs à butoirs, phare et son halo, feu rouge,
         clignotants ambre. ⚠️ LE CLIGNOTANT EST LE DÉTAIL QUI DATE LA VOITURE :
         deux pixels ambre à côté du phare, et on lit une berline, pas un jouet. */
      P(g, 44, SILL - 3, 4, 3, CHR); P(g, 44, SILL - 1, 4, 1, CHRD);
      P(g, 0, SILL - 3, 4, 3, CHR); P(g, 0, SILL - 1, 4, 1, CHRD);
      P(g, 45, BELT + 2, 3, 3, LMP); P(g, 46, BELT + 2, 2, 1, "#fffbe8");
      P(g, 45, BELT + 5, 3, 1, "#e8912a");
      P(g, 0, BELT + 2, 3, 3, RED); P(g, 0, BELT + 2, 3, 1, "#e8564a");
      P(g, 0, BELT + 5, 3, 1, "#e8912a");
      /* ---- 8. L'ENSEIGNE DE TOIT, ALLUMÉE. ⚠️ ET SON HALO EST PEINT SUR LE
         TOIT, pas autour du sprite : une lampe qui n'éclaire rien n'est pas une
         lampe allumée, c'est une boîte jaune. Le canevas fait 24 px et
         l'enseigne commence à ROOF−4 = 0 : elle touche le bord haut, donc elle
         serait DÉCAPITÉE par le liseré si on cernait sans marge (§4, payé trois
         fois au 433). D'où le pied à ROOF−3 et le corps à ROOF−4, jamais plus
         haut. */
      P(g, 17, ROOF - 4, 9, 4, CHRD);
      P(g, 18, ROOF - 3, 7, 2, "#ffca4e"); P(g, 18, ROOF - 3, 7, 1, "#fff0b0");
      P(g, 17, ROOF - 1, 9, 1, CHR);                    // le pied chromé
      P(g, 16, ROOF, 11, 1, "rgba(255,214,110,0.35)");  // le halo sur le pavillon
      P(g, 1, SILL, 3, 2, BLK);                         // pot d'échappement
      /* ---- 9. LES ROUES, EN DERNIER. ⚠️⚠️ L'ORDRE EST LE SUJET (432). Passées
         avant la caisse, le flanc les recouvrait aux trois quarts : il n'en
         restait qu'un croissant au ras du sol et la voiture avait l'air posée
         sur des patins. De profil, la roue est DEVANT le bas de caisse. */
      for (const wx of [11, 35]) {
        wheelDetail(g, wx, WY, WR);
        P(g, Math.round(wx - WR), SILL, Math.round(WR * 2), 1, "#0e0e0e");
      }
      // L'ombre de dessous, ENTRE les roues : c'est elle qui pose la voiture.
      P(g, 15, SILL + 2, 17, 1, "rgba(14,14,14,0.38)");
      outlineSprite(g, 48, 24, "#2a2110");
      c.exhaust = { x: 0, y: SILL };
      c.ground = 23;
      return c;
    }

    /* ⚠️⚠️ ZIP 436 — FACE ET DOS PARTAGENT LEUR OSSATURE, ET C'EST NOUVEAU.
       Le 433 les écrivait deux fois, ligne par ligne, avec les mêmes cotes
       recopiées : c'est le doublon du §8 (« un paramètre qui double un autre est
       une divergence en attente »), et il avait déjà commencé à diverger — la
       face avait ses bas de caisse `Y2` aux deux angles, le dos non. On écrit
       donc UNE carrosserie et on n'y pose que ce qui change : calandre et
       phares devant, plaque et feux derrière. */
    {
      const [c, g] = cv(28, 24);
      const SILL = 18, BELT = 11, ROOF = 4;
      const front = dir === "s";
      for (const wx of [4, 23]) wheelDetail(g, wx, 19, 3.8);
      /* ---- 1. LA CAISSE, en rampe verticale comme le profil, et rétrécie aux
         épaules : vue de face, une voiture est plus étroite en haut qu'au ras
         des ailes. Sans ce retrait, on dessine un fourgon. */
      const EXT = [[3, 25], [2, 26], [1, 27], [1, 27], [1, 27], [2, 26], [2, 26]];
      for (let k = 0; k < EXT.length; k++) {
        const [xa, xb] = EXT[k];
        P(g, xa, BELT + k, xb - xa, 1, FLANK[k]);
      }
      /* ---- 2. LE PAVILLON ET LA VITRE. Le pare-brise est plus large que la
         lunette, donc la face a un pavillon d'un pixel plus large de chaque
         côté — la seule différence de silhouette entre les deux vues, et elle
         est DÉRIVÉE de `front`, pas écrite deux fois. */
      const gw = front ? 17 : 15, gx = front ? 5 : 6;
      P(g, gx, ROOF, gw, BELT - ROOF, Y4);
      P(g, gx, ROOF, gw, 1, Y5);
      P(g, gx + 1, ROOF + 1, gw - 2, 5, GLS);
      P(g, gx + 1, ROOF + 1, gw - 2, 1, GLSL);
      // Le reflet : une diagonale, comme sur le profil. Une vitre unie est un trou.
      for (let k = 0; k < 5; k++) P(g, gx + 2 + k, ROOF + 5 - k, 1, 1, "#7e94a2");
      P(g, gx + 1, ROOF + 5, gw - 2, 1, "#39434a");
      P(g, gx, ROOF + 1, 1, 5, CHRD); P(g, gx + gw - 1, ROOF + 1, 1, 5, CHRD);
      if (front) { P(g, 13, ROOF + 1, 2, 5, Y3); P(g, gx - 1, ROOF + 3, 1, 2, CHRD); P(g, gx + gw, ROOF + 3, 1, 2, CHRD); }  // rétroviseur + montants
      /* ---- 3. LA BANDE DAMIER, sur la ceinture. ⚠️ ELLE EXISTE SUR LES CINQ
         VUES OU SUR AUCUNE : le damier est ce qui identifie le véhicule, et une
         voiture qui le perd en tournant se lit comme une autre voiture. Vue de
         bout, on n'en voit que le retour sur les ailes — deux carreaux de
         chaque côté, pas la bande entière, qui ferait une ceinture de smoking. */
      for (let i = 0; i < 2; i++) {
        P(g, 1 + i * 3, BELT + 1, 3, 2, i % 2 ? BLK : CHR);
        P(g, 24 - i * 3, BELT + 1, 3, 2, i % 2 ? BLK : CHR);
      }
      /* ---- 4. CE QUI DIFFÈRE : le nez ou la poupe. */
      if (front) {
        P(g, 8, BELT + 3, 12, 4, BLK);                              // calandre
        for (let i = 0; i < 6; i++) P(g, 9 + i * 2, BELT + 3, 1, 4, CHRD);
        P(g, 8, BELT + 2, 12, 1, CHR);                              // son encadrement
        P(g, 2, BELT + 3, 4, 4, LMP); P(g, 22, BELT + 3, 4, 4, LMP);
        P(g, 2, BELT + 3, 4, 1, "#fff8dd"); P(g, 22, BELT + 3, 4, 1, "#fff8dd");
        P(g, 2, BELT + 7, 4, 1, "#e8912a"); P(g, 22, BELT + 7, 4, 1, "#e8912a");   // clignotants
      } else {
        P(g, 9, BELT + 3, 10, 3, CHRD); P(g, 10, BELT + 3, 8, 1, CHR);   // plaque
        P(g, 2, BELT + 3, 4, 4, RED); P(g, 22, BELT + 3, 4, 4, RED);
        P(g, 2, BELT + 3, 4, 1, "#e8564a"); P(g, 22, BELT + 3, 4, 1, "#e8564a");
        P(g, 2, BELT + 7, 4, 1, "#e8912a"); P(g, 22, BELT + 7, 4, 1, "#e8912a");
        P(g, 21, SILL + 4, 4, 1, BLK);                              // pot d'échappement
      }
      /* ---- 5. LE PARE-CHOCS, LES PASSAGES DE ROUE, L'ENSEIGNE. Les trois
         mêmes qu'au profil, aux mêmes hauteurs. */
      P(g, 1, SILL + 1, 26, 3, CHR); P(g, 1, SILL + 3, 26, 1, CHRD);
      P(g, 1, SILL + 1, 26, 1, "#ece5d6");
      for (const wx of [4, 23]) {
        for (let dy = -5; dy <= -2; dy++) {
          const hw = Math.round(Math.sqrt(Math.max(0, 30 - dy * dy)));
          if (hw < 1) continue;
          P(g, wx - hw, 19 + dy, 1, 1, "#4a3b18"); P(g, wx + hw, 19 + dy, 1, 1, "#4a3b18");
        }
        P(g, wx - 3, 19 - 6, 7, 1, Y4);
      }
      P(g, 10, ROOF - 4, 8, 4, CHRD);
      P(g, 11, ROOF - 3, 6, 2, "#ffca4e"); P(g, 11, ROOF - 3, 6, 1, "#fff0b0");
      P(g, 10, ROOF - 1, 8, 1, CHR);
      P(g, 9, ROOF, 10, 1, "rgba(255,214,110,0.35)");
      P(g, 6, SILL + 2, 16, 1, "rgba(14,14,14,0.40)");              // l'ombre de dessous
      outlineSprite(g, 28, 24, "#2a2110");
      c.exhaust = front ? { x: 5, y: SILL + 3 } : { x: 23, y: SILL + 4 };
      c.ground = 23;
      return c;
    }
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 433 — LES PIGEONS ET LES COLOMBES DE VALLEY TOWN.
     ╚══════════════════════════════════════════════════════════════════════════
     Demande de Guillaume : « des colombes et des pigeons qui sont par terre sur
     la place centrale et qui s'envolent élégamment quand on se rapproche trop
     d'elles […] détaille bien les oiseaux, ils doivent être beaux (pas trop
     grands) ».

     ⚠️ L'ÉCHELLE D'ABORD, c'est elle qui décide de tout le reste. Un fermier
     fait 23 px peints ; un pigeon fait 0,25 m contre 1,75 m, soit 3 px. À trois
     pixels ce n'est plus un oiseau, c'est une poussière. On tient donc les deux
     bouts : **7 px de haut, 11 de long, soit 0,30 fermier** — assez pour lire
     une tête, un œil et une barre d'aile, assez peu pour qu'un vol de neuf
     oiseaux ne mange pas la place. C'est la même arbitrage que `render-echelle`
     fait pour les décors, mais dans l'autre sens : ici on grossit exprès.

     ⚠️ SEPT POSES, ET AUCUNE N'EST DÉCORATIVE :
       · `stand` / `peck` / `alert` — au sol. `alert` (cou tendu, tête haute) est
         la pose qui rend l'envol LISIBLE : sans elle, l'oiseau passe de « il
         picore » à « il est en l'air » sans que le joueur comprenne que c'est
         lui qui l'a fait fuir. C'est le même rôle que le ralentissement du taxi
         dans les virages — l'intention se montre AVANT le mouvement.
       · `down` / `mid` / `up` — le battement, dans cet ordre. Trois images
         suffisent si l'amplitude est franche : une aile à mi-course qui ne
         serait qu'une interpolation des deux autres ne se voit pas.
       · `glide` — les ailes tenues, à peine relevées. C'est elle qu'on voit le
         plus longtemps : le battement ne dure qu'au décollage.

     ⚠️ DEUX ESPÈCES, UNE SEULE GÉOMÉTRIE. La colombe n'est pas « un pigeon
     blanc » : elle est plus fine, plus claire, et son aile ne porte pas de
     barres. Mais son squelette est le MÊME code — deux dessins d'un même
     oiseau finiraient par diverger (§8 de CLAUDE.md), et une volée mélangée se
     lit précisément parce que les silhouettes sont parentes.
     ══════════════════════════════════════════════════════════════════════════ */
  /* ⚠️ LES DEUX PALETTES SONT RELEVÉES SUR LES RÉFÉRENCES, pas inventées : le
     biset est GRIS BLEUTÉ (pas gris neutre), son aile est plus sombre que son
     corps, son col vire du VERT au VIOLET, son œil est ORANGE cerclé et ses
     pattes sont ROSE VIF — sur la photo, c'est la seule couleur saturée de
     l'animal, et c'est pour ça qu'on la voit à trente mètres.
     ⚠️ La colombe n'est pas « un pigeon blanc » : son blanc est LÉGÈREMENT
     BLEUTÉ dans les ombres (référence : les ombres des ailes tirent sur le
     lilas, jamais sur le beige), elle n'a ni barres alaires ni col irisé, et
     son bec est fin et sombre. */
  const BIRD_PAL = {
    pigeon: {
      back: "#5d6a7e", body: "#79879b", lit: "#98a5b6", dark: "#3f4a5b",
      breast: "#9ba3ad", neck: "#3f8f7a", neck2: "#8a5f96",
      head: "#6b7688", beak: "#33312f", cere: "#e6e2da",
      eye: "#141414", iris: "#e2761f", leg: "#e8756a", bar: true,
    },
    dove: {
      back: "#dcd9e2", body: "#efedf4", lit: "#ffffff", dark: "#b3b0c0",
      breast: "#f7f5fa", neck: "#e4e1ea", neck2: "#d6d3e0",
      head: "#f4f2f8", beak: "#4a453e", cere: "#f0eef4",
      eye: "#141414", iris: "#c98f6a", leg: "#e0a091", bar: false,
    },
  };
  /* ⚠️⚠️ LE CADRE EST PLUS GRAND QUE LE DESSIN, D'UN PIXEL SUR CHAQUE BORD, ET
     L'ORDRE EST LE SUJET : on dessine serré, on RECADRE, PUIS on cerne. Cerné
     dans son cadre juste, le liseré d'un sprite qui touche le bord est lui-même
     découpé — l'oiseau perd son contour du côté du bec et de la queue, et rien
     ne le dit (§4 de CLAUDE.md : un canevas découpe en silence). C'est le même
     piège que l'enseigne du taxi et le drapeau de la mairie, payé une troisième
     fois dans ce zip ; `render-oiseaux.mjs` refuse désormais toute pose qui
     touche son bord. */
  function padOutline(src, groundRow, col) {
    const PAD = 2;                       // ⚠️ DEUX, PAS UN : le liseré occupe le premier
    const [c, g] = cv(src.width + PAD * 2, src.height + PAD * 2);   // et il ne doit pas non
    g.drawImage(src, PAD, PAD);                                     // plus toucher le bord
    outlineSprite(g, c.width, c.height, col);
    // La ligne de sol est celle du LISERÉ, pas celle des pattes : c'est lui qui
    // pose sur la pierre, et c'est lui qu'on voit.
    c.ground = groundRow + PAD + 1;
    return c;
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ AU SOL — CINQ POSES. Canevas 15×9, l'oiseau POSE sur la rangée 8.
     ╚══════════════════════════════════════════════════════════════════════════
     Il regarde à DROITE ; le rendu retourne pour la gauche.

     ⚠️⚠️ REFAIT SUR LES RÉFÉRENCES DE GUILLAUME (« améliore leur position
     standing […] le détail des ailes, mais aussi le corps »). Le premier jet
     était un ovale de douze pixels avec une tête dessus. La photo de pigeon
     biset dit exactement ce qui manquait, et ce n'est pas du détail :

       1. ⚠️⚠️ **UN PIGEON EST LONG ET BAS, PAS ROND.** Corps + queue font plus
          de DEUX FOIS la hauteur. Le sprite est donc passé de 12 à 15 px de
          long À HAUTEUR CONSTANTE — on gagne l'allure sans grossir l'oiseau,
          ce qui est exactement la contrainte (« pas trop grands »).
       2. **LE JABOT DÉBORDE EN AVANT ET EN BAS DES PATTES.** C'est lui qui
          donne au pigeon son air important et son déséquilibre vers l'avant.
       3. **LA QUEUE EST LONGUE, POINTUE, ET DÉPASSE LOIN DERRIÈRE**, un tiers
          de l'animal. Un moignon horizontal donne un poussin.
       4. **DEUX BARRES ALAIRES ÉPAISSES ET SOMBRES** sur la moitié basse de
          l'aile repliée, et la pointe des rémiges qui CROISE la base de la
          queue. C'est la marque du biset, celle qu'on reconnaît sans savoir.
       5. **LES PATTES SONT ROSE VIF.** Sur la référence, c'est la seule couleur
          saturée de l'animal ; deux pixels corail, et l'oiseau cesse d'être une
          silhouette grise.
       6. **LE COL IRISÉ VERT PUIS VIOLET**, juste sous la tête.
     ⚠️ Et la tête reste PETITE et posée en arrière du jabot, séparée par un
     creux de nuque : une tête dans l'alignement du corps donne un jouet.

     LES CINQ POSES, et chacune répond à un comportement de `flockStep` :
       · `stand` — au repos ;
       · `peck`  — le cou plonge, bec au sol, EN AVANT du corps ;
       · `walk`  — une patte en avant, l'autre en appui, corps porté devant :
                   sans elle, un pigeon qui se déplace GLISSE, et rien ne dit
                   mieux « animal de ferme scripté » ;
       · `alert` — cou dressé : l'avertissement avant l'envol ;
       · `puff`  — la parade : jabot gonflé au maximum, tête rentrée dans les
                   épaules, queue basse et étalée qui traîne au sol.
     ══════════════════════════════════════════════════════════════════════════ */
  function birdGroundSprite(kind, pose) {
    const p = BIRD_PAL[kind];
    const [c, g] = cv(16, 9);
    const peck = pose === "peck", alert = pose === "alert";
    const walk = pose === "walk", puff = pose === "puff";
    const F = walk ? 1 : 0;                       // en marche, le corps porte d'un pixel devant
    /* ---- 1. LA QUEUE. ⚠️ ELLE PART SOUS LE CORPS ET DÉPASSE LOIN DERRIÈRE,
       sur DEUX rangées seulement : une queue aussi épaisse que le corps se
       confond avec lui et l'oiseau devient un pain. Sur la référence, elle est
       fine, pointue, et clairement décalée vers le bas. */
    if (puff) { P(g, 0, 6, 6, 2, p.dark); P(g, 1, 6, 5, 1, p.back); P(g, 0, 7, 3, 1, "#2f3844"); }
    else { P(g, 0, 5, 6, 2, p.dark); P(g, 1, 5, 5, 1, p.back); P(g, 0, 7, 3, 1, "#2f3844"); }
    /* ---- 2. LE CORPS, et son dos éclairé. */
    P(g, 4 + F, 3, 8, 4, p.body);
    P(g, 5 + F, 3, 6, 1, p.lit);
    /* ---- 3. LE JABOT : il déborde en AVANT et descend BAS, jusqu'au niveau
       des pattes. C'est ce déséquilibre vers l'avant qui fait l'allure du
       pigeon, bien plus que n'importe quel détail de plumage. */
    const bx = (puff ? 9 : 10) + F, bw = puff ? 4 : 3;
    P(g, bx, puff ? 2 : 3, bw, puff ? 5 : 4, p.breast);
    P(g, bx, puff ? 2 : 3, bw, 1, p.lit);
    /* ---- 4. L'AILE REPLIÉE, en quatre tons du haut vers le bas : couvertures
       claires, puis LES DEUX BARRES sombres du biset. Elles ne traversent pas
       tout le flanc — elles s'arrêtent avant le jabot, comme sur la photo. */
    P(g, 4 + F, 4, 7, 1, p.back);
    if (p.bar) { P(g, 4 + F, 5, 6, 1, "#39434f"); P(g, 5 + F, 6, 5, 1, "#2c3540"); }
    else { P(g, 4 + F, 5, 6, 1, p.back); P(g, 5 + F, 6, 5, 1, p.dark); }
    P(g, 2 + F, 5, 3, 1, p.dark);                 // les rémiges croisent la base de la queue
    P(g, 3 + F, 6, 2, 1, p.dark);
    /* ---- 5. LA TÊTE. ⚠️⚠️ ELLE EST AU-DESSUS DU CORPS, PAS DEDANS, et il doit
       rester du VIDE derrière elle : c'est ce creux de nuque, et lui seul, qui
       transforme un galet gris en oiseau. Le premier jet la posait dans la
       silhouette et donnait un sous-marin. */
    /* ⚠️ EN PICORANT, LA TÊTE PASSE SOUS ET DEVANT LE JABOT, pas dedans. Mon
       avant-dernier jet la posait à mi-hauteur du jabot : elle y disparaissait
       entièrement, et la pose « picore » ne se distinguait plus de « debout ».
       Le bec doit arriver AU SOL — c'est le seul repère qui dise ce qu'il fait. */
    const hx = (peck ? 12 : puff ? 9 : 10) + F;
    const hy = alert ? 0 : peck ? 5 : 1;
    if (alert) { P(g, 11, 1, 2, 3, p.head); }                                // cou dressé
    else if (peck) { P(g, 11 + F, 4, 2, 2, p.head); }                        // cou plongeant
    else if (puff) { P(g, 10, 3, 2, 1, p.head); P(g, 9, 3, 4, 1, p.dark); }  // cou rentré dans la collerette
    else { P(g, 11 + F, 3, 1, 1, p.head); }                                  // la nuque
    P(g, hx, hy, 3, 2, p.head);
    P(g, hx, hy, 3, 1, p.lit);
    P(g, hx, hy + 2, 1, 1, p.neck);               // le col : vert…
    P(g, hx + 1, hy + 2, 1, 1, p.neck2);          // …puis violet, un pixel chacun
    P(g, hx + 1, hy, 1, 1, p.eye);
    P(g, hx + 2, hy, 1, 1, p.iris);               // l'œil orange cerclé
    P(g, hx + 3, hy, 1, 1, p.cere);               // la cire blanche, au-dessus du bec
    P(g, hx + 3, hy + 1, 1, 1, p.beak);
    /* ---- 6. LES PATTES, ROSE VIF. Sur la photo, c'est la seule couleur
       saturée de l'animal, et c'est pour ça qu'on la voit à trente mètres.
       ⚠️ En marche elles sont ÉCARTÉES ET DÉCALÉES : c'est ça, un pas. Deux
       pattes côte à côte qui glissent, c'est un jouet à roulettes. */
    if (walk) {
      P(g, 6, 7, 1, 1, p.leg); P(g, 5, 8, 3, 1, p.leg);          // l'arrière, posée
      P(g, 10, 7, 1, 1, p.leg); P(g, 10, 8, 3, 1, p.leg);        // l'avant, en appui
    } else if (puff) {
      P(g, 7, 7, 1, 1, p.leg); P(g, 9, 7, 1, 1, p.leg);
      P(g, 6, 8, 3, 1, p.leg); P(g, 9, 8, 3, 1, p.leg);
    } else {
      const l0 = peck ? 6 : 7, l1 = peck ? 8 : 9;
      P(g, l0, 7, 1, 1, p.leg); P(g, l1, 7, 1, 1, p.leg);
      P(g, l0 - 1, 8, 3, 1, p.leg); P(g, l1, 8, 3, 1, p.leg);
    }
    return padOutline(c, 8, "#2b2530");
  }
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ EN VOL — QUATRE POSES. Canevas 19×15, corps ancré sur la rangée 11.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️ LE CORPS NE BOUGE PAS D'UNE POSE À L'AUTRE : c'est l'AILE qui bat, pas
     l'oiseau qui monte et descend. Un corps qui suit l'aile donne un vol de
     papillon — sautillant, jamais élégant.

     ⚠️⚠️ REFAIT SUR LES RÉFÉRENCES (les colombes au trait, et la colombe
     détaillée). Ce qu'elles disent, et que le premier jet ratait complètement :
       1. **L'ENVERGURE ÉCRASE LE CORPS.** Sur toutes les références, une aile
          seule est plus longue que le corps entier. Le sprite passe donc de 16
          à 19 px de large, et l'aile occupe DIX colonnes contre six.
       2. **L'AILE EST POINTUE, PAS ARRONDIE** : elle s'affine régulièrement du
          moignon à la pointe, et la pointe est un seul pixel.
       3. ⚠️⚠️ **LES RÉMIGES SONT SÉPARÉES.** C'est LE détail de toutes les
          références : au bout de l'aile, les longues plumes s'écartent en
          éventail et on voit le ciel entre elles. On dessine donc l'aile pleine,
          puis on ÉVIDE un pixel entre les dernières plumes — le seul endroit du
          fichier où l'on retire de la matière pour ajouter du détail.
       4. **LA QUEUE EST LONGUE ET EN ÉVENTAIL**, presque aussi longue que le
          corps, et elle s'étale par le bas.
     ══════════════════════════════════════════════════════════════════════════ */
  function birdFlySprite(kind, pose) {
    const p = BIRD_PAL[kind];
    const [c, g] = cv(19, 15);
    /* La plume : une suite de colonnes [x, y, hauteur]. Les trois dernières
       sont les rémiges — plus sombres, et évidées une sur deux. */
    const feather = (cols) => {
      cols.forEach(([x, y, h], i) => {
        const tip = i >= cols.length - 4;
        P(g, x, y, 1, h, tip ? p.dark : p.back);
        P(g, x, y, 1, 1, tip ? p.body : p.lit);
        if (h > 1) P(g, x, y + h - 1, 1, 1, p.dark);   // bord de fuite : il détache l'aile du corps
      });
      for (let i = cols.length - 3; i < cols.length; i += 2) {
        if (i < 1) continue;
        const [x, y, h] = cols[i];
        if (h > 1) g.clearRect(x, y + h - 1, 1, 1);    // le ciel entre les rémiges
      }
    };
    /* ---- L'AILE LOINTAINE : un liseré derrière le corps, décalé. Sans elle
       l'oiseau n'a qu'une aile, et à cette taille ça se voit tout de suite. */
    const FAR = {
      up:    [[9, 4, 2], [8, 3, 2], [7, 2, 2], [6, 1, 2]],
      mid:   [[7, 5, 2], [6, 5, 2], [5, 4, 2], [4, 4, 1]],
      down:  [[9, 10, 2], [8, 11, 2], [7, 12, 2], [6, 13, 1]],
      glide: [[7, 6, 2], [6, 6, 2], [5, 6, 1], [4, 6, 1]],
    }[pose];
    for (const [x, y, h] of FAR) P(g, x, y, 1, h, p.dark);
    /* ---- LA QUEUE, longue et en éventail, puis le corps fuselé et le cou
       tendu : la silhouette en vol est ÉTIRÉE, c'est ce qui la distingue de la
       boule posée au sol. */
    P(g, 0, 8, 6, 2, p.dark); P(g, 1, 8, 5, 1, p.back);
    P(g, 0, 10, 4, 1, "#2f3844"); P(g, 1, 11, 2, 1, "#2f3844");
    P(g, 4, 7, 9, 4, p.body);
    P(g, 5, 7, 7, 1, p.lit);
    P(g, 5, 10, 7, 1, p.dark);
    P(g, 10, 8, 3, 2, p.breast);
    P(g, 12, 5, 3, 2, p.head);                     // tête tendue vers l'avant
    P(g, 12, 5, 3, 1, p.lit);
    P(g, 12, 7, 1, 1, p.neck); P(g, 13, 7, 1, 1, p.neck2);
    P(g, 13, 5, 1, 1, p.eye); P(g, 14, 5, 1, 1, p.iris);
    P(g, 15, 5, 1, 1, p.cere); P(g, 15, 6, 2, 1, p.beak);
    P(g, 7, 11, 3, 1, p.leg);                      // pattes repliées sous le ventre
    /* ---- L'AILE PROCHE, par-dessus le corps : c'est elle qu'on lit. Dix
       colonnes, effilées jusqu'à un pixel, rémiges évidées. */
    feather({
      up:    [[8, 4, 4], [7, 3, 4], [6, 2, 4], [5, 1, 3], [4, 0, 3], [3, 0, 2], [2, 1, 2], [1, 2, 1]],
      mid:   [[8, 5, 4], [7, 5, 3], [6, 4, 3], [5, 4, 3], [4, 3, 2], [3, 3, 2], [2, 2, 2], [1, 3, 1], [0, 4, 1]],
      down:  [[8, 10, 4], [7, 11, 4], [6, 12, 3], [5, 12, 3], [4, 13, 2], [3, 13, 2], [2, 14, 1], [1, 14, 1]],
      glide: [[9, 5, 3], [8, 5, 3], [7, 5, 3], [6, 4, 3], [5, 4, 2], [4, 4, 2], [3, 4, 2], [2, 4, 1], [1, 5, 1], [0, 5, 1]],
    }[pose]);
    return padOutline(c, 11, "#2b2530");
  }

  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 432 — LES DEUX VUES DE TROIS QUARTS (le virage). REFAITES AU 433.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ QUATRE DIRECTIONS NE FONT PAS UN VIRAGE. Avec profil / face / dos
     seulement, une voiture qui tourne SAUTE d'un sprite à l'autre : elle est de
     profil, puis d'un coup de face. Il faut les diagonales — et huit directions
     sont exactement ce que le jeu produit déjà pour les personnages.
     ⚠️ ON EN DESSINE DEUX, PAS QUATRE : sud-est et nord-est. Les deux autres
     sont leur miroir, comme l'ouest est le miroir de l'est. Une voiture est
     symétrique ; deux dessins du même trois-quarts finiraient par diverger (§8).

     ⚠️⚠️ ZIP 433 — LES DEUX PREMIÈRES ÉTAIENT FAUSSES DE TROIS FAÇONS, et les
     trois ne se voient QU'EN LES METTANT SUR LA MÊME LIGNE DE SOL que le profil
     (ce que `render-taxi.mjs` ne faisait pas encore) :

       1. ⚠️⚠️ **ELLES FLOTTAIENT.** Le dessin était construit sur un axe qui
          descendait jusqu'à y = 18, roues comprises, mais annonçait `ground = 23`
          comme le profil. Au rendu, `py = y·T − ground` : la voiture planait
          donc CINQ pixels au-dessus de son ombre — à chaque virage, le taxi
          décollait. Aucune erreur, aucun banc : les cinq vues étaient dessinées
          côte à côte mais chacune sur sa propre ligne.
       2. ⚠️⚠️ **LA VUE « NE » MONTRAIT UNE VOITURE QUI ROULE VERS LE NORD-OUEST.**
          Le nez était en haut à GAUCHE et la poupe en bas à droite : le sens de
          marche allait donc vers le haut-gauche. Miroir compris (`TAXI_MIRROR`),
          le taxi partait en biais du mauvais côté une fois sur deux.
          ⚠️ La règle qui l'évite : **le nez est TOUJOURS à droite** dans les deux
          dessins, et c'est la HAUTEUR du nez qui distingue le cap — nez BAS pour
          le sud-est (il vient vers nous), nez HAUT pour le nord-est (il s'en va).
          Le miroir donne alors sud-ouest et nord-ouest sans y penser.
       3. ⚠️ **ON DESSINAIT LA FACE DU BOUT LOINTAIN**, qui par construction est
          tournée à l'opposé de la caméra : ça produisait un plastron crème au
          bout du capot, qu'on lisait comme une lame de chasse-neige. En trois
          quarts on voit UN flanc et UN bout, jamais les deux bouts.

     LA CONSTRUCTION : mêmes lignes de ceinture, de toit et de sol que le profil
     (SILL/BELT/ROOF), plus un FUYANT de trois pixels sur la longueur — le bout
     lointain est plus haut à l'écran parce qu'il est plus au nord sur la carte.
     Le flanc et le bout se partagent la largeur ; les roues portent sur la ligne
     de sol fuyante, jamais sur une horizontale. */
  function taxiQuarterSprite(front) {
    const Y1 = "#876b30", Y2 = "#b78f26", Y3 = "#d8ad32", Y4 = "#fbcb34", Y5 = "#ffd23a";
    const GLS = "#434f56", GLSL = "#5f7280", TYR = "#141414", TYRL = "#242424";
    const CHR = "#d5cdbe", CHRD = "#9a9488", BLK = "#1a1a18", RED = "#c0322a", LMP = "#ffe9a8";
    /* ⚠️⚠️ LE CANEVAS EST EXACTEMENT PLUS HAUT DU FUYANT, ET C'EST DÉRIVÉ.
       Le bout LOINTAIN est DROP pixels plus haut que le bout proche ; son
       enseigne de toit sort donc du cadre d'autant. Un canevas DÉCOUPE en
       silence ce qui dépasse (§4 de CLAUDE.md — le haut-de-forme décapité du
       427) : mon premier jet perdait deux pixels d'enseigne sur les DEUX vues
       sans que rien ne le dise. On ajoute donc DROP en haut et on décale les
       trois lignes du profil d'autant — la ligne de sol, elle, ne bouge pas. */
    const DROP = 2;                                   // le fuyant, en pixels
    const W = 40, H = 24 + DROP;
    const [c, g] = cv(W, H);
    /* ⚠️ CES TROIS LIGNES SONT CELLES DU PROFIL (18 / 11 / 4), DÉCALÉES DU
       FUYANT ET RIEN D'AUTRE : c'est le même véhicule vu d'ailleurs, et
       `render-taxi.mjs` échoue si la hauteur de toit ou la ligne de sol
       divergent. */
    const SILL = 18 + DROP, BELT = 11 + DROP, ROOF = 4 + DROP;
    const X0 = 2, X1 = 37;
    /* Le fuyant. `front` (cap sud-est) : le nez, à droite, vient VERS la caméra,
       donc il est en bas — le décalage vaut 0 à droite et −DROP à gauche. Cap
       nord-est : le nez s'en va, il est en haut, et c'est la poupe qui est en
       bas à gauche. Une seule expression, pas deux dessins. */
    const sh = (x) => {
      const t = Math.max(0, Math.min(1, (x - X0) / (X1 - X0)));
      return Math.round(front ? -DROP * (1 - t) : -DROP * t);
    };
    /* Le BOUT VISIBLE est celui qui est en bas : le nez en sud-est, la poupe en
       nord-est. Il occupe FACE px ; le flanc occupe le reste.
       ⚠️ SIX PIXELS, PAS ONZE. Un bout large fait un MUSEAU DE CAMION : à
       quarante pixels de long, ce qu'on lit d'un trois-quarts c'est le FLANC,
       et le bout n'est qu'un liseré qui dit de quel côté est le nez. Onze
       pixels sur trente-cinq, c'était un tiers de la voiture en aplat. */
    const FACE = 6;
    const faceAtRight = front;
    const fx0 = faceAtRight ? X1 - FACE : X0;
    const fx1 = faceAtRight ? X1 : X0 + FACE;
    const sx0 = faceAtRight ? X0 : X0 + FACE;      // le flanc
    const sx1 = faceAtRight ? X1 - FACE : X1;
    // L'habitacle : au-dessus du flanc, en retrait des deux bouts. Il est plus
    // en retrait du côté du bout LOINTAIN — c'est le capot (ou le coffre) qu'on
    // voit fuir, et c'est lui qui donne la longueur.
    const gx0 = sx0 + (faceAtRight ? 9 : 3), gx1 = sx1 - (faceAtRight ? 3 : 9);

    /* ---- 1. LE FLANC, tranche par tranche le long du fuyant. La tranche la
       plus proche de la caméra est la plus sombre : c'est elle qui tourne le
       dos au soleil, et c'est ce dégradé qui donne le VOLUME sans une seule
       diagonale dessinée à la main. */
    for (let x = sx0; x <= sx1; x++) {
      const d = sh(x);
      P(g, x, BELT + d, 1, SILL - BELT, Y3);
      P(g, x, BELT + d, 1, 1, Y4);                 // arête de ceinture, éclairée
      P(g, x, SILL - 1 + d, 1, 1, Y1);             // bas de caisse, à l'ombre
    }
    /* ---- 2. LE BOUT VISIBLE : capot + calandre, ou coffre + feux. Il est plus
       COURT que le flanc en hauteur de caisse ? Non : même ceinture, même bas de
       caisse — c'est la même voiture. Ce qui change, c'est ce qu'on y pose. */
    for (let x = fx0; x <= fx1; x++) {
      const d = sh(x);
      P(g, x, BELT + d, 1, SILL - BELT, Y2);
      P(g, x, BELT + d, 1, 1, Y3);
    }
    /* ---- 3. L'HABITACLE. Toit, montants, vitres latérales, et la vitre de bout
       (pare-brise ou lunette) qui DÉBORDE sur le bout visible : c'est ce
       débordement qui vend le trois-quarts, bien plus que la pente du toit. */
    for (let x = gx0; x <= gx1; x++) {
      const d = sh(x);
      P(g, x, ROOF + d, 1, BELT - ROOF, Y4);
      P(g, x, ROOF + d, 1, 1, Y5);                 // arête de toit
    }
    for (let x = gx0 + 2; x <= gx1 - 1; x++) {
      const d = sh(x);
      P(g, x, ROOF + 1 + d, 1, BELT - ROOF - 2, GLS);
      P(g, x, ROOF + 1 + d, 1, 1, GLSL);
    }
    { // montant central du flanc
      const xm = Math.round((gx0 + gx1) / 2) + (faceAtRight ? -1 : 1);
      P(g, xm, ROOF + 1 + sh(xm), 1, BELT - ROOF - 2, Y3);
    }
    { /* La vitre de bout : trois colonnes de plus, du côté du bout visible.
         ⚠️ Elle est PLUS SOMBRE que les latérales : on la regarde de biais, et
         une vitre vue de biais réfléchit le ciel au lieu de le laisser passer. */
      const wx0 = faceAtRight ? gx1 + 1 : gx0 - 3, wx1 = faceAtRight ? gx1 + 3 : gx0 - 1;
      for (let x = wx0; x <= wx1; x++) {
        const d = sh(x);
        P(g, x, ROOF + d, 1, BELT - ROOF, Y4);
        P(g, x, ROOF + 1 + d, 1, BELT - ROOF - 2, GLSL);
        P(g, x, ROOF + d, 1, 1, Y5);
      }
    }
    /* ---- 4. LE DAMIER, qui suit le fuyant — et c'est LUI qui vend le
       trois-quarts, bien plus que la pente du toit : une rangée de carreaux qui
       monte est une rangée qu'on lit en perspective.
       ⚠️ IL COURT SUR TOUT LE FLANC ET S'ARRÊTE AU BOUT, exactement comme dans
       le profil (qui va de pare-chocs à pare-chocs). Un damier qui ne couvrirait
       que les portières ferait RÉTRÉCIR la bande dès que la voiture tourne — et
       ce genre d'écart entre deux vues du même objet est la divergence en
       attente du §8. */
    for (let x = sx0; x <= sx1; x++) {
      const d = sh(x);
      P(g, x, BELT + 1 + d, 1, 3, ((((x - sx0) / 3) | 0) % 2) ? BLK : CHR);
    }
    /* ---- 5. LES ACCESSOIRES DU BOUT. ⚠️ TROIS ÉLÉMENTS, PAS CINQ : à six
       pixels de large, une calandre ET un phare ET une plaque ET un pare-chocs
       de deux rangées se recouvrent l'un l'autre et ne font plus qu'un pavé
       crème — c'est ce qu'on lisait comme une caisse à outils posée sur le nez.
       Le pare-chocs tient sur UNE rangée, son ombre sur la suivante. */
    if (front) {
      const d = sh(fx0 + 3);
      P(g, fx0 + 1, BELT + 3 + d, 4, 3, BLK);                       // calandre
      P(g, fx0 + 2, BELT + 3 + d, 1, 3, CHRD); P(g, fx0 + 4, BELT + 3 + d, 1, 3, CHRD);
      P(g, fx1 - 1, BELT + 3 + d, 2, 2, LMP);                       // le phare du coin
      P(g, fx1 - 1, BELT + 3 + d, 2, 1, "#fff8dd");
      P(g, fx0, SILL + d, FACE + 1, 1, CHR);                        // pare-chocs
      P(g, fx0, SILL + 1 + d, FACE + 1, 1, CHRD);
    } else {
      const d = sh(fx0 + 3);
      P(g, fx0, BELT + 3 + d, 2, 3, RED);                           // feu arrière
      P(g, fx0, BELT + 3 + d, 2, 1, "#e8564a");
      P(g, fx0 + 3, BELT + 4 + d, 4, 2, CHRD);                      // plaque
      P(g, fx0 + 3, BELT + 4 + d, 4, 1, CHR);
      P(g, fx0, SILL + d, FACE + 1, 1, CHR);
      P(g, fx0, SILL + 1 + d, FACE + 1, 1, CHRD);
    }
    /* ---- 6. L'ENSEIGNE DE TOIT, penchée comme le reste. */
    { const sxg = Math.round((gx0 + gx1) / 2) - 3, d = sh(sxg + 3);
      P(g, sxg, ROOF - 4 + d, 7, 4, CHR);
      P(g, sxg + 1, ROOF - 3 + d, 5, 2, BLK); }
    /* ---- 7. LES ROUES, EN DERNIER ET SUR LA LIGNE DE SOL FUYANTE. La proche
       (côté bout visible) est un demi-pixel plus grande : c'est tout ce qu'il
       faut de perspective à cette taille. ⚠️ ELLES PORTENT SUR y = SILL + sh + r,
       donc la plus basse touche exactement `ground` — c'est ce contrat-là qui
       manquait et qui faisait planer la voiture. */
    const wheel = (cx, r) => {
      const cy = SILL + 1 + sh(cx);
      g.fillStyle = TYR; g.beginPath(); g.ellipse(cx, cy, r, r * 0.94, 0, 0, 7); g.fill();
      g.fillStyle = TYRL; g.beginPath(); g.ellipse(cx, cy - 0.5, r - 0.9, r - 1.1, 0, 0, 7); g.fill();
      g.fillStyle = CHRD; g.beginPath(); g.ellipse(cx, cy, r - 2.1, r - 2.3, 0, 0, 7); g.fill();
      P(g, Math.round(cx - r), Math.round(cy + r * 0.94), Math.max(2, Math.round(r * 2)), 1, "#0e0e0e");
    };
    if (faceAtRight) { wheel(sx0 + 5, 3.4); wheel(sx1 - 4, 3.9); }
    else { wheel(sx1 - 5, 3.4); wheel(sx0 + 4, 3.9); }
    outlineSprite(g, W, H, "#2a2110");
    /* Le pot d'échappement fume TOUJOURS derrière : côté poupe, donc côté bout
       visible en nord-est et côté bout lointain en sud-est. */
    c.exhaust = front ? { x: X0, y: SILL + sh(X0) + 1 } : { x: fx0 + 1, y: SILL + sh(fx0) + 2 };
    c.ground = 23 + DROP;
    return c;
  }

  // Icônes de produits artisanaux (16x16).
  function craftIcon(id) {
    const [c, g] = cv(T, T);
    if (id === "honey") { P(g, 5, 4, 6, 3, "#e0b84a"); P(g, 6, 3, 4, 1, "#c99a2a"); P(g, 4, 7, 8, 7, "#f2c94b"); P(g, 5, 9, 6, 3, "#e0b030"); P(g, 6, 5, 4, 2, "#fff2c0"); }
    else if (id === "cheeseWheel") { g.fillStyle = "#f2d873"; g.beginPath(); g.arc(8, 9, 6, 0, 7); g.fill(); g.fillStyle = "#e0b84a"; g.beginPath(); g.arc(8, 9, 6, 0, 3.5); g.fill(); P(g, 6, 6, 1, 1, "#c99a2a"); P(g, 10, 8, 1, 1, "#c99a2a"); P(g, 8, 11, 1, 1, "#c99a2a"); }
    else if (id === "cheesePortion") { g.fillStyle = "#f2d873"; g.beginPath(); g.moveTo(3, 13); g.lineTo(13, 13); g.lineTo(4, 4); g.closePath(); g.fill(); g.fillStyle = "#e0b84a"; P(g, 3, 12, 10, 2, "#e0b84a"); P(g, 7, 9, 1, 1, "#c99a2a"); P(g, 9, 11, 1, 1, "#c99a2a"); }
    // Zip 301 : nouvelles denrées de la boulangerie/fromagerie.
    else if (id === "butter") { P(g, 3, 7, 10, 5, "#f2df84"); P(g, 3, 7, 10, 1, "#fff0b8"); P(g, 3, 11, 10, 1, "#d9be5a"); P(g, 3, 6, 7, 1, "#fbeecb"); P(g, 4, 8, 2, 2, "#fff6d8"); } // motte de beurre
    else if (id === "bread") { P(g, 3, 6, 10, 6, "#c98a4a"); P(g, 3, 6, 10, 1, "#e8b96a"); P(g, 4, 5, 8, 1, "#e8b96a"); P(g, 5, 8, 1, 2, "#8a5a2a"); P(g, 8, 8, 1, 2, "#8a5a2a"); P(g, 3, 11, 10, 1, "#9a6a34"); } // pain
    else if (id === "croissant") { g.fillStyle = "#e0a94a"; g.beginPath(); g.arc(8, 9, 5, 0.4, 3.9); g.fill(); P(g, 5, 6, 6, 2, "#eebf6a"); P(g, 4, 8, 2, 3, "#c98a3a"); P(g, 11, 8, 2, 3, "#c98a3a"); P(g, 7, 6, 3, 1, "#f5d9a0"); } // croissant
    else if (id === "chocolatine" || id === "painSuisse") { P(g, 3, 6, 10, 6, "#cd9552"); P(g, 3, 6, 10, 1, "#e8b96a"); P(g, 4, 8, 2, 3, "#4a2a18"); P(g, 10, 8, 2, 3, "#4a2a18"); if (id === "painSuisse") { P(g, 6, 8, 1, 1, "#3a2010"); P(g, 8, 9, 1, 1, "#3a2010"); P(g, 7, 10, 1, 1, "#3a2010"); } } // chocolatine / pain suisse
    else if (id === "eclairVanilla") { P(g, 3, 7, 10, 4, "#e7c98a"); P(g, 3, 7, 10, 1, "#fbf3da"); P(g, 4, 6, 8, 1, "#f3e2ba"); P(g, 4, 11, 8, 1, "#7a5a2a"); P(g, 5, 8, 1, 1, "#3a2a14"); P(g, 10, 8, 1, 1, "#3a2a14"); } // éclair à la vanille (glaçage clair, forme allongée)
    else if (id === "eclairChoco") { P(g, 3, 7, 10, 4, "#6b3a1e"); P(g, 3, 7, 10, 1, "#8a5228"); P(g, 4, 6, 8, 1, "#a86a3a"); P(g, 4, 11, 8, 1, "#3a2010"); P(g, 5, 8, 1, 1, "#f5d9a0"); P(g, 10, 8, 1, 1, "#f5d9a0"); } // éclair au chocolat (glaçage foncé)
    else if (id === "flanVanilla") { g.fillStyle = "#f3e2ba"; g.beginPath(); g.arc(8, 9, 6, 0, 7); g.fill(); g.fillStyle = "#caa24a"; g.beginPath(); g.arc(8, 9, 6, 0, 2.2); g.fill(); P(g, 6, 6, 1, 1, "#3a2a14"); P(g, 9, 8, 1, 1, "#3a2a14"); P(g, 7, 11, 1, 1, "#3a2a14"); } // flan pâtissier vanille de Madagascar (grains de vanille visibles)
    // Zip suivant (demande Guillaume : yaourts nature/vanille d'Ingrid) : pot
    // de céramique, même silhouette pour les deux, seule la teinte du corps
    // et la présence de grains de vanille changent (même principe que
    // flanVanilla, dont les grains foncés signalent la vanille à l'œil).
    else if (id === "yogurtNature") { P(g, 4, 6, 8, 7, "#f5f0e6"); P(g, 4, 6, 8, 1, "#fffdf7"); P(g, 3, 12, 10, 1, "#c9a25a"); P(g, 4, 5, 8, 1, "#e8dcc4"); P(g, 6, 8, 1, 1, "#e0d6bd"); P(g, 9, 9, 1, 1, "#e0d6bd"); } // pot de yaourt nature (céramique claire, liseré doré du couvercle)
    else if (id === "yogurtVanilla") { P(g, 4, 6, 8, 7, "#f2dfa8"); P(g, 4, 6, 8, 1, "#fbeecb"); P(g, 3, 12, 10, 1, "#c9a25a"); P(g, 4, 5, 8, 1, "#e8dcc4"); P(g, 6, 9, 1, 1, "#5a3a1e"); P(g, 9, 10, 1, 1, "#5a3a1e"); P(g, 7, 8, 1, 1, "#5a3a1e"); } // pot de yaourt vanille (crème dorée, grains de vanille visibles)
    else { P(g, 4, 8, 8, 5, "#c98a4a"); P(g, 5, 6, 6, 3, "#e8b96a"); P(g, 6, 5, 4, 2, "#f5d9a0"); P(g, 7, 4, 1, 1, "#d14a3a"); P(g, 6, 10, 1, 1, "#8a3a2a"); P(g, 9, 10, 1, 1, "#8a3a2a"); } // gâteau basque (croûte dorée, croix traditionnelle)
    outlineSprite(g, T, T, "#5a3a1e");
    return c;
  }
  function icon(kind) {
    const [c, g] = cv(T, T);
    switch (kind) {
      case "hoe":
        P(g, 8, 2, 2, 11, "#8a6340"); P(g, 5, 12, 6, 2, "#a8a8b0"); P(g, 5, 14, 2, 1, "#88888f"); break;
      case "can":
        P(g, 4, 6, 8, 7, "#6a8ab0"); P(g, 5, 5, 6, 1, "#7a9ac0"); P(g, 12, 7, 3, 2, "#6a8ab0");
        P(g, 2, 5, 3, 2, "#5a7aa0"); P(g, 1, 4, 1, 4, "#5a7aa0"); break;
      case "axe":
        P(g, 8, 3, 2, 11, "#8a6340"); P(g, 4, 3, 5, 4, "#a8a8b0"); P(g, 3, 4, 2, 2, "#c8c8d0"); break;
      case "pick":
        P(g, 8, 3, 2, 11, "#8a6340"); P(g, 3, 3, 10, 2, "#a8a8b0"); P(g, 3, 5, 2, 2, "#88888f"); P(g, 11, 5, 2, 2, "#88888f"); break;
      case "seeds":
        P(g, 3, 3, 10, 10, "#d8b878"); P(g, 4, 4, 8, 3, "#c04a3c"); P(g, 6, 8, 1, 2, "#5a3a1e"); P(g, 9, 9, 1, 2, "#5a3a1e"); P(g, 7, 11, 1, 2, "#5a3a1e"); break;
      case "wood":
        P(g, 2, 6, 12, 4, "#8a6340"); P(g, 2, 6, 12, 1, "#a87745"); P(g, 3, 10, 12, 4, "#7a5330"); P(g, 13, 6, 2, 4, "#c8a878"); break;
      case "stone":
        P(g, 4, 6, 8, 7, "#8a8a92"); P(g, 5, 5, 5, 2, "#a2a2aa"); P(g, 4, 11, 8, 2, "#66666e"); break;
      case "food":
        P(g, 4, 4, 8, 8, "#d8a850"); P(g, 4, 4, 8, 3, "#e8c880"); P(g, 6, 8, 4, 2, "#a86838"); P(g, 3, 6, 1, 5, "#c89840"); break;
      case "gold":
        g.fillStyle = "#e8c85a"; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill();
        g.fillStyle = "#c8a83a"; g.beginPath(); g.arc(8, 8, 4, 0, 7); g.fill();
        P(g, 7, 5, 2, 6, "#e8c85a"); break;
      case "energy":
        g.fillStyle = "#e8a83a"; g.beginPath();
        g.moveTo(9, 1); g.lineTo(4, 9); g.lineTo(7, 9); g.lineTo(6, 15); g.lineTo(12, 6); g.lineTo(9, 6); g.fill(); break;
      case "rod": // canne à pêche : manche en bois, fil et flotteur
        P(g, 3, 13, 10, 2, "#8a6340"); P(g, 4, 12, 8, 1, "#a87745");
        for (let i = 0; i < 10; i++) P(g, 12 - i, 12 - i, 1, 1, "#c8c8d0"); // canne diagonale
        P(g, 2, 2, 1, 8, "#d8d8e0"); // fil
        P(g, 1, 9, 3, 3, "#e03e2e"); P(g, 2, 10, 1, 1, "#fff"); // flotteur
        break;
      case "ready": // bulle "prêt à récolter" (culture mûre)
        g.fillStyle = "#ffe060"; g.beginPath(); g.arc(8, 7, 6, 0, 7); g.fill();
        g.fillStyle = "#c8a83a"; g.beginPath(); g.arc(8, 7, 6, 0, 7); g.lineWidth = 1; g.stroke();
        P(g, 5, 12, 4, 3, "#ffe060"); // pointe de la bulle
        g.fillStyle = "#5a3e00"; P(g, 7, 3, 2, 5, "#5a3e00"); P(g, 7, 9, 2, 2, "#5a3e00"); // "!"
        break;
      case "herd": // main ouverte : outil pour attraper/déposer un animal
        P(g, 5, 7, 7, 6, "#e8b888"); // paume
        P(g, 4, 3, 2, 5, "#e8b888"); P(g, 6, 2, 2, 6, "#e8b888");
        P(g, 8, 2, 2, 6, "#e8b888"); P(g, 10, 4, 2, 5, "#e8b888");
        P(g, 4, 7, 2, 1, "#c89468"); P(g, 6, 7, 6, 1, "#c89468"); // ombre paume/doigts
        break;
      case "hand": // zip 251 : outil "main" — poser/déplacer des objets. Une
        // main qui pince un petit objet (distinct de "herd", la main ouverte).
        P(g, 6, 8, 6, 5, "#e8b888");                 // paume
        P(g, 5, 6, 2, 4, "#e8b888"); P(g, 7, 5, 2, 5, "#e8b888"); P(g, 9, 5, 2, 5, "#e8b888"); // doigts
        P(g, 11, 7, 2, 3, "#e8b888");                // pouce
        P(g, 6, 9, 6, 1, "#c89468");                 // ombre paume
        P(g, 3, 3, 4, 4, "#b5824f"); P(g, 4, 4, 2, 2, "#d8a86a"); // petit objet (caisse) tenu
        break;
      case "thirst": // goutte barrée : culture plantée non arrosée
        g.fillStyle = "#5a9be0";
        g.beginPath(); g.moveTo(8, 2); g.quadraticCurveTo(13, 9, 8, 14); g.quadraticCurveTo(3, 9, 8, 2); g.fill();
        g.fillStyle = "#a8d4f0"; g.beginPath(); g.arc(6, 9, 1.4, 0, 7); g.fill();
        g.strokeStyle = "#d43a2e"; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(2, 3); g.lineTo(14, 13); g.stroke();
        break;
      case "flour": // sac de farine (chantier 2026-07, transformation artisanale demandée par Guillaume)
        g.fillStyle = "#ede0c4"; // toile du sac
        g.beginPath(); g.moveTo(4, 4); g.quadraticCurveTo(2, 9, 4, 14); g.lineTo(12, 14); g.quadraticCurveTo(14, 9, 12, 4); g.fill();
        P(g, 5, 2, 6, 3, "#c9a25a");   // liseré noué en haut
        P(g, 6, 1, 4, 1, "#8a6340");   // ficelle
        g.strokeStyle = "rgba(140,110,70,.5)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(5, 8); g.lineTo(11, 8); g.moveTo(5, 11); g.lineTo(11, 11); g.stroke(); // coutures
        P(g, 3, 12, 1, 1, "#fff6e6"); // grain de farine échappé
        break;
      case "sugar": // sac de sucre (chantier canne à sucre) — miroir EXACT du sac de farine, teinte dorée/brune
        g.fillStyle = "#f2e6b8"; // toile du sac, un ton plus doré que la farine
        g.beginPath(); g.moveTo(4, 4); g.quadraticCurveTo(2, 9, 4, 14); g.lineTo(12, 14); g.quadraticCurveTo(14, 9, 12, 4); g.fill();
        P(g, 5, 2, 6, 3, "#a97a2e");   // liseré noué en haut (plus brun)
        P(g, 6, 1, 4, 1, "#6a4a1e");   // ficelle
        g.strokeStyle = "rgba(140,110,70,.5)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(5, 8); g.lineTo(11, 8); g.moveTo(5, 11); g.lineTo(11, 11); g.stroke(); // coutures
        P(g, 3, 12, 1, 1, "#fffaf0"); // grain de sucre échappé
        break;
      case "bag": // zip 236: sac à dos / besace personnelle (bouton du sac)
        P(g, 4, 5, 8, 9, "#9a6b3e"); P(g, 4, 5, 8, 1, "#b5824f");   // corps
        P(g, 3, 7, 10, 5, "#8a5f36");                                 // ventre plus large
        P(g, 5, 3, 6, 3, "#7a5330"); P(g, 6, 2, 4, 2, "#8a5f36");     // rabat + anse
        P(g, 6, 8, 4, 3, "#c9a25a");                                  // poche avant
        P(g, 7, 9, 2, 1, "#5a3a1e");                                  // boucle
        break;
      // Zip 237: small pixel glyphs for the new pixel-styled buttons. White
      // so they read on the colored button faces.
      case "check": // accept
        g.fillStyle = "#ffffff"; P(g, 3, 8, 2, 2, "#ffffff"); P(g, 5, 10, 2, 2, "#ffffff"); P(g, 7, 8, 2, 2, "#ffffff"); P(g, 9, 6, 2, 2, "#ffffff"); P(g, 11, 4, 2, 2, "#ffffff"); break;
      case "cross": // decline / refuse
        for (let i = 0; i < 8; i++) { P(g, 4 + i, 4 + i, 2, 1, "#ffffff"); P(g, 11 - i, 4 + i, 2, 1, "#ffffff"); } break;
      case "coin2": // pay
        g.fillStyle = "#fff3c0"; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.fill();
        g.fillStyle = "#e0b83a"; P(g, 7, 5, 2, 6, "#e0b83a"); P(g, 6, 7, 4, 2, "#e0b83a"); break;
      case "speech": // chat
        P(g, 2, 4, 12, 7, "#ffffff"); P(g, 4, 11, 3, 2, "#ffffff");
        P(g, 4, 6, 8, 1, "#8a6340"); P(g, 4, 8, 6, 1, "#8a6340"); break;
      case "swap": // barter / trade (two arrows)
        P(g, 3, 5, 8, 2, "#ffffff"); P(g, 9, 3, 2, 2, "#ffffff"); P(g, 11, 5, 2, 2, "#ffffff");
        P(g, 5, 9, 8, 2, "#ffffff"); P(g, 5, 9, 2, 2, "#ffffff"); P(g, 3, 9, 2, 2, "#ffffff"); break;
      case "bell": // recall / meet
        P(g, 6, 3, 4, 2, "#ffffff"); P(g, 5, 5, 6, 5, "#ffffff"); P(g, 4, 10, 8, 2, "#ffffff"); P(g, 7, 12, 2, 2, "#ffffff"); break;
      case "ban": // blacklist
        g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(4, 4); g.lineTo(12, 12); g.stroke(); break;
      case "release": // set pet free (open hand + arrow up)
        P(g, 5, 8, 6, 4, "#ffffff"); P(g, 5, 6, 1, 4, "#ffffff"); P(g, 7, 5, 1, 5, "#ffffff"); P(g, 9, 6, 1, 4, "#ffffff");
        P(g, 7, 2, 2, 3, "#ffffff"); P(g, 6, 3, 4, 1, "#ffffff"); break;
      default: break;
    }
    return c;
  }
  // Gemme (losange) d'une couleur donnée, pour l'inventaire / le bac.
  function gemIcon(col) {
    const [c, g] = cv(T, T);
    g.fillStyle = col; g.beginPath();
    g.moveTo(8, 2); g.lineTo(13, 7); g.lineTo(8, 14); g.lineTo(3, 7); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath();
    g.moveTo(8, 2); g.lineTo(11, 6); g.lineTo(8, 8); g.lineTo(5, 6); g.closePath(); g.fill();
    P(g, 6, 9, 1, 1, "rgba(255,255,255,.5)");
    return c;
  }
  // Poisson d'une couleur donnée.
  function fishIcon(col) {
    const [c, g] = cv(T, T);
    g.fillStyle = col; g.beginPath(); g.ellipse(8, 8, 5, 3, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(12, 8); g.lineTo(15, 5); g.lineTo(15, 11); g.closePath(); g.fill(); // queue
    P(g, 4, 7, 1, 1, "#1a1a1a"); // oeil
    g.fillStyle = "rgba(255,255,255,.35)"; P(g, 7, 6, 3, 1);
    return c;
  }

  /* -------- 2026-07 station update: sea creatures, ducks, station -------- */
  // Sea creature icons (inventory / sell bin), one per C.SEA_CREATURES entry.
  function seaIcon(kind, col) {
    const [c, g] = cv(T, T);
    if (kind === 0) { // starfish: 5 chunky arms
      P(g, 7, 2, 2, 5, col); P(g, 2, 6, 5, 2, col); P(g, 9, 6, 5, 2, col);
      P(g, 4, 9, 2, 5, col); P(g, 10, 9, 2, 5, col); P(g, 6, 6, 4, 4, col);
      P(g, 7, 7, 1, 1, "#ffffff55"); P(g, 9, 8, 1, 1, "#00000022");
    } else if (kind === 1) { // seahorse: curled S profile
      P(g, 7, 2, 4, 3, col); P(g, 10, 3, 2, 2, col); P(g, 6, 5, 3, 4, col); P(g, 7, 9, 3, 3, col);
      P(g, 9, 12, 2, 2, col); P(g, 8, 13, 2, 1, col);
      P(g, 5, 3, 2, 1, col); P(g, 5, 5, 1, 1, col); // crest + snout
      P(g, 9, 3, 1, 1, "#1a1a1a");
    } else { // eel: long wavy body
      P(g, 2, 5, 5, 2, col); P(g, 6, 7, 5, 2, col); P(g, 10, 9, 4, 2, col);
      P(g, 2, 4, 2, 1, col); P(g, 3, 5, 1, 1, "#1a1a1a");
      P(g, 6, 7, 3, 1, "rgba(255,255,255,.25)");
    }
    return c;
  }
  // Floating duck, 2 bobbing frames (purely decorative on the river).
  function duckSprite(frame) {
    const [c, g] = cv(T, T);
    const dy = frame ? 1 : 0;
    P(g, 4, 7 + dy, 8, 5, "#e8dcc0");             // body
    P(g, 4, 11 + dy, 8, 1, "#c8bc9e");            // waterline shadow
    P(g, 10, 4 + dy, 4, 4, "#e8dcc0");            // head
    P(g, 14, 5 + dy, 2, 2, "#e8952a");            // beak
    P(g, 12, 5 + dy, 1, 1, "#1a1a1a");            // eye
    P(g, 5, 8 + dy, 4, 2, "#c8a86a");             // wing
    P(g, 3, 12 + dy, 10, 1, "rgba(168,212,240,0.8)"); // ripple
    return c;
  }
  // Rail tiles (vertical track), tiled along the ENTIRE west border.
  // Zip 232 redesign: the two columns used to each carry their own narrow
  // track (looked like two parallel toy tracks); they now form ONE wide
  // track — left half (rail on the right of the tile) + right half (rail on
  // the left), with wooden sleepers spanning both tiles.
  function railHalf(side) {
    const [c, g] = cv(T, T), r = makeRnd(413 + side);
    P(g, 0, 0, T, T, "#8a795e");                                   // ballast
    for (let i = 0; i < 12; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#7a6a52" : "#97866b");
    for (const sy of [2, 9]) {                                     // sleepers (span the full 2-tile track)
      P(g, 0, sy, T, 3, "#5a4630"); P(g, 0, sy, T, 1, "#6b5238");
    }
    const rx = side === 0 ? 6 : T - 8;                             // one rail per half tile
    P(g, rx, 0, 2, T, "#8f9aa5"); P(g, rx, 0, 1, T, "#b9c2cc");
    return c;
  }
  // Platform tile (stone-edged planks).
  function platformTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#b8a888");
    P(g, 0, 4, T, 1, "#a89878"); P(g, 0, 9, T, 1, "#a89878"); P(g, 0, 14, T, 1, "#a89878");
    P(g, 0, 0, T, 1, "#cfc0a0");
    return c;
  }
  // The station building. Zip 232 full redesign (Guillaume: "right now it
  // is a big square and ugly... make the station design cuter and more
  // bespoke"): footprint shrunk to 4x3 tiles, cottage look — cream plaster
  // with timber framing, a steep warm-red gabled roof with a ridge cap and
  // finial, a round gable window, a little clock, a scalloped awning over a
  // green door, and window flower boxes. Canvas is taller than the
  // footprint (roof); FermeGame anchors it by its BOTTOM edge.
  function stationSprite() {
    const W = C.STATION.w * T, H = C.STATION.h * T + 28; // 64 x 76
    const [c, g] = cv(W, H);
    const BY = 28;                                        // wall top (roof above)
    const wall = "#efe4c8", timber = "#7a5330", roof = "#b5543c", roofL = "#c9694e";
    // Walls + stone base.
    P(g, 2, BY, W - 4, H - BY, wall);
    P(g, 2, H - 5, W - 4, 5, "#9a9aa2"); P(g, 2, H - 5, W - 4, 1, "#b2b2ba");
    // Timber framing (corners, top beam, two diagonal-look studs).
    P(g, 2, BY, 2, H - BY - 5, timber); P(g, W - 4, BY, 2, H - BY - 5, timber);
    P(g, 2, BY, W - 4, 2, timber);
    P(g, 12, BY, 1, 10, timber); P(g, W - 13, BY, 1, 10, timber);
    // Steep gabled roof (triangle) + ridge cap + tiny finial ball.
    g.fillStyle = roof;
    g.beginPath(); g.moveTo(-2, BY + 2); g.lineTo(W / 2, 4); g.lineTo(W + 2, BY + 2); g.fill();
    g.fillStyle = roofL;
    g.beginPath(); g.moveTo(2, BY - 1); g.lineTo(W / 2, 7); g.lineTo(W - 2, BY - 1);
    g.lineTo(W - 8, BY - 1); g.lineTo(W / 2, 12); g.lineTo(8, BY - 1); g.fill();
    P(g, (W / 2 - 1) | 0, 1, 2, 4, timber); P(g, (W / 2 - 2) | 0, 0, 4, 2, "#e8c860"); // finial
    P(g, -2, BY + 1, W + 4, 2, "#8a3d2c");                // eave shadow line
    // Round window in the gable + little clock under it.
    g.fillStyle = timber; g.beginPath(); g.arc(W / 2, 15, 5, 0, 7); g.fill();
    g.fillStyle = "#8fc7ec"; g.beginPath(); g.arc(W / 2, 15, 3.5, 0, 7); g.fill();
    P(g, (W / 2) | 0, 13, 1, 5, timber); P(g, (W / 2 - 3) | 0, 15, 7, 1, timber);
    g.fillStyle = "#f6f6f6"; g.beginPath(); g.arc(W / 2, 24, 3, 0, 7); g.fill();
    P(g, (W / 2) | 0, 22, 1, 2, "#333333"); P(g, (W / 2) | 0, 24, 2, 1, "#333333");
    // Green door with a window, under a scalloped rose awning.
    const dw = 12, dx = (W / 2 - dw / 2) | 0, dy = H - 5 - 20;
    P(g, dx - 1, dy - 1, dw + 2, 21, timber);
    P(g, dx, dy, dw, 20, "#4f7a4a"); P(g, dx, dy, dw, 1, "#639159");
    P(g, dx + 2, dy + 2, dw - 4, 5, "#8fc7ec");           // door window
    P(g, dx + dw - 3, dy + 10, 1, 2, "#e8c860");          // handle
    g.fillStyle = "#c95a6a";                              // scalloped awning
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(dx - 2 + 2 + i * 4.4, dy - 2, 2.4, 0, Math.PI); g.fill(); }
    P(g, dx - 3, dy - 5, dw + 6, 3, "#c95a6a"); P(g, dx - 3, dy - 5, dw + 6, 1, "#dd7284");
    // Two windows with shutters + flower boxes (pink/red blooms).
    for (const wx of [7, W - 17]) {
      P(g, wx - 1, BY + 8, 12, 11, timber);
      P(g, wx, BY + 9, 10, 9, "#8fc7ec"); P(g, wx, BY + 9, 10, 1, "#6ba7d0");
      P(g, wx + 4, BY + 9, 1, 9, timber); P(g, wx, BY + 13, 10, 1, timber);
      P(g, wx - 1, BY + 19, 12, 3, "#6b4a2e");            // flower box
      for (let f = 0; f < 5; f++) P(g, wx + f * 2.4, BY + 17, 2, 2, f % 2 ? "#e06a8a" : "#d84040");
      P(g, wx + 1, BY + 18, 9, 1, "#4f7a4a");             // greenery
    }
    // Wall lantern beside the door.
    P(g, dx - 6, dy + 2, 3, 4, "#3a3a3a"); P(g, dx - 5, dy + 3, 1, 2, "#ffd970");
    return c;
  }
  // The ad board on the platform (interactive: press E). Symmetric SHORT
  // legs (Guillaume's mockup note: the right leg was too long).
  function signBoardSprite() {
    const [c, g] = cv(18, 22);
    P(g, 2, 12, 2, 8, "#6b4a2e"); P(g, 14, 12, 2, 8, "#6b4a2e"); // equal legs
    P(g, 0, 0, 18, 14, "#8a5c35"); P(g, 0, 0, 18, 1, "#9a6c45");
    P(g, 2, 2, 6, 5, "#e8dcc0"); P(g, 10, 3, 5, 6, "#f0e8a0");   // pinned notices
    P(g, 2, 9, 11, 3, "#e8dcc0");
    return c;
  }
  // The train, zip 232 redesign (Guillaume: "the train design should be a
  // classic steam / choo choo train"): seen from above, sliding in from the
  // north — cowcatcher wedge, round black smokebox with a brass-rimmed
  // funnel, black boiler with gold bands, red cab, coal tender, and one
  // cream-and-green passenger coach. Wheels peek out along both sides.
  // Animated smoke puffs are drawn live in FermeGame, above the funnel.
  function trainSprite() {
    const W = 24, H = 108;
    const [c, g] = cv(W, H);
    const wheel = (y, h) => { P(g, 1, y, 2, h, "#2a2a2a"); P(g, W - 3, y, 2, h, "#2a2a2a"); };
    // Cowcatcher (front wedge) + buffer beam.
    g.fillStyle = "#8a3030";
    g.beginPath(); g.moveTo(4, 6); g.lineTo(W / 2, 0); g.lineTo(W - 4, 6); g.fill();
    P(g, 4, 6, W - 8, 2, "#a54040");
    // Smokebox: round black nose with a brass-rimmed funnel.
    g.fillStyle = "#2e2e2e"; g.beginPath(); g.arc(W / 2, 14, 8, 0, 7); g.fill();
    g.fillStyle = "#e8c860"; g.beginPath(); g.arc(W / 2, 13, 4.5, 0, 7); g.fill(); // brass rim
    g.fillStyle = "#1c1c1c"; g.beginPath(); g.arc(W / 2, 13, 3, 0, 7); g.fill();   // funnel mouth
    // Boiler: long black barrel with gold bands + a brass steam dome.
    P(g, 4, 20, W - 8, 22, "#333333"); P(g, 5, 20, 2, 22, "#4a4a4a");
    for (const by of [24, 31, 38]) P(g, 4, by, W - 8, 1, "#e8c860");
    g.fillStyle = "#d8b850"; g.beginPath(); g.arc(W / 2, 28, 3, 0, 7); g.fill();
    wheel(22, 6); wheel(32, 8);                        // driving wheels
    // Cab: red with a darker roof outline and a skylight.
    P(g, 2, 42, W - 4, 14, "#8a3030"); P(g, 2, 42, W - 4, 2, "#a54040");
    P(g, 3, 43, W - 6, 12, "#7a2828");
    P(g, 8, 46, 8, 5, "#7ab4e8"); P(g, 8, 46, 8, 1, "#5a94c8"); // skylight
    // Coal tender.
    P(g, 3, 58, W - 6, 14, "#3a3a3a"); P(g, 3, 58, W - 6, 1, "#4c4c4c");
    for (let i = 0; i < 14; i++) P(g, 6 + ((i * 7) % (W - 12)), 60 + ((i * 5) % 10), 2, 2, i % 2 ? "#1c1c1c" : "#262626");
    wheel(60, 6);
    P(g, 8, 72, W - 16, 3, "#2a2a2a");                 // coupling
    // Passenger coach: cream upper, green lower, roof vent, windows.
    P(g, 3, 75, W - 6, 30, "#4f7a4a"); P(g, 3, 75, W - 6, 2, "#639159");
    P(g, 5, 78, W - 10, 24, "#efe4c8");
    P(g, (W / 2 - 2) | 0, 79, 4, 3, "#8a8a92");        // roof vent
    for (const wy of [84, 92]) { P(g, 6, wy, 4, 5, "#7ab4e8"); P(g, W - 10, wy, 4, 5, "#7ab4e8"); }
    wheel(80, 6); wheel(96, 6);
    P(g, 4, 105, W - 8, 3, "#2a2a2a");                 // rear buffer beam
    return c;
  }

  /* ---------------- Bâtiments et animaux ---------------- */
  // Cheval (refonte chantier 2026-07, demande Guillaume : "le cheval doit
  // décrire une action de galop quand il se déplace, + de détail sur la
  // course") : sprite paramétré par frame, sur le modèle de wolfSprite/
  // rabbitSprite. frame 0 = à l'arrêt (pose d'origine, pattes verticales),
  // utilisée aussi pour le cheval libre non monté. frames 1..3 = cycle de
  // galop : les paires de pattes avant/arrière s'étendent en oblique puis se
  // regroupent sous le corps, le corps rebondit d'un pixel, la queue passe à
  // l'horizontale (soufflée) et la crinière flotte vers l'arrière.
  // Zip 258 : paramètre `coat` optionnel. "white" produit le CHEVAL BLANC
  // d'Eduardo (robe crème, crinière gris clair) en réutilisant exactement le
  // même tracé — seule la palette change. Sans argument, robe baie d'origine.
  function horseSprite(frame, coat) {
    const f = (frame || 0) % 4;
    const [c, g] = cv(28, 24); // vu de profil (regarde à droite)
    const white = coat === "white";
    const body = white ? "#ececef" : "#8a5a34", light = white ? "#ffffff" : "#a5764a",
      dark = white ? "#c6c6d0" : "#6a4426", shade = white ? "#b2b2c0" : "#5a3a20",
      mane = white ? "#c8c8d2" : "#3a2a18", maneDeep = white ? "#a8a8b6" : "#2a1c10",
      hoof = white ? "#5a5a64" : "#2a2018", saddle = "#7a3020", saddleLight = "#9a4a30";
    const bob = [0, -1, 0, 0][f];   // rebond vertical du corps (phase d'envol)
    const ext = [0, 5, 1, -4][f];   // pattes avant : étendues vers l'avant / regroupées
    const ext2 = [0, -5, -1, 4][f]; // pattes arrière : opposées (étendues vers l'arrière)
    const b = 10 + bob;             // ligne de dos
    P(g, 6, b, 15, 7, body);           // corps
    P(g, 6, b, 15, 2, light);          // reflet sur le dos
    P(g, 6, b + 6, 15, 1, shade);      // ombre sous le ventre
    P(g, 19, b - 4, 6, 7, body);       // encolure
    P(g, 19, b - 4, 6, 2, light);
    P(g, 23, b - 7, 5, 6, body);       // tête
    P(g, 23, b - 7, 5, 1, light);
    P(g, 24, b - 9, 2, 3, body); P(g, 24, b - 9, 1, 2, dark); // oreille
    P(g, 27, b - 5, 1, 3, dark);       // museau
    P(g, 27, b - 3, 1, 1, "#3a2418");  // naseau
    P(g, 24, b - 6, 3, 2, mane);       // toupet
    // Crinière : flotte d'un pixel vers l'arrière en pleine extension.
    P(g, 19 - (f === 1 ? 1 : 0), b - 5, 2, 6, mane);
    P(g, 20 - (f === 1 ? 1 : 0), b - 5, 1, 6, maneDeep);
    // Queue : tombante à l'arrêt, soufflée à l'horizontale au galop.
    if (f === 1 || f === 2) { P(g, 0, b, 6, 2, mane); P(g, 0, b + 1, 6, 1, maneDeep); }
    else { P(g, 1, b + 1, 6, 3, mane); P(g, 1, b + 2, 6, 1, maneDeep); }
    P(g, 10, b - 2, 8, 3, saddle);     // selle (support pour un ou deux cavaliers)
    P(g, 10, b - 2, 8, 1, saddleLight);
    P(g, 9, b, 1, 2, "#5a2418"); P(g, 18, b, 1, 2, "#5a2418"); // sangle
    // Pattes : haut de patte à mi-extension (ext >> 1), sabot à pleine
    // extension — l'écart donne l'oblique de la foulée. Un pixel plus
    // courtes en phase regroupée (f=3), pattes "rentrées" sous le corps.
    const legH = f === 3 ? 5 : 6;
    const ly = b + 7;
    P(g, 7 + (ext2 >> 1), ly, 2, legH, dark);  P(g, 7 + ext2, ly + legH - 1, 2, 2, hoof);  // arrière int.
    P(g, 12 + (ext2 >> 1), ly, 2, legH, body); P(g, 12 + ext2, ly + legH - 1, 2, 2, hoof); // arrière ext.
    P(g, 16 + (ext >> 1), ly, 2, legH, dark);  P(g, 16 + ext, ly + legH - 1, 2, 2, hoof);  // avant int.
    P(g, 19 + (ext >> 1), ly, 2, legH, body);  P(g, 19 + ext, ly + legH - 1, 2, 2, hoof);  // avant ext.
    P(g, 25, b - 5, 1, 1, "#1a1a1a");  // oeil
    P(g, 25, b - 6, 1, 1, "#e8dcc8");  // reflet dans l'oeil
    return c;
  }
  // Loup (chantier 2026-07, demande Guillaume : "loups assez détaillés... avec
  // mouvements de pattes"). Vu de profil (regarde à droite, comme le cheval),
  // silhouette basse et fine typique du loup (dos qui remonte vers l'arrière-
  // train, grandes oreilles pointues, museau allongé, queue touffue tombante).
  // 4 frames de marche (cycle classique quadrupède : les pattes avant/arrière
  // opposées avancent ensemble, puis l'autre paire) pour une démarche crédible
  // aux 2 vitesses de déplacement (marche lente/rapide n'utilisent que le
  // TIMING du cycle, pas des frames différentes — voir FermeGame.js). frame=0
  // sert aussi de pose "à l'arrêt" (pattes jointes), utilisée pour l'état
  // arrêté (guet, repas).
  function wolfSprite(frame) {
    const [c, g] = cv(30, 22);
    const body = "#6b6b6d", light = "#8a8a8c", dark = "#4a4a4c", shade = "#3a3a3c",
      belly = "#a8a8a2", ear = "#3a3a3c", snoutDark = "#232325", eye = "#e0b840", paw = "#2a2a2c";
    // Décalage des pattes selon la frame (0 = jointes/arrêt, 1..3 = cycle).
    const off = [0, 3, 0, -3][frame % 4]; // avant-gauche/arrière-droite
    const off2 = -off;                    // avant-droite/arrière-gauche (opposées)
    // Queue touffue, tombante, qui suit légèrement le mouvement.
    P(g, 1, 8, 5, 3, dark); P(g, 1, 8, 5, 1, body);
    P(g, 0, 10, 3, 3, shade);
    // Corps (dos qui remonte vers l'arrière-train, silhouette louve).
    P(g, 5, 9, 15, 6, body);
    P(g, 5, 9, 15, 2, light);           // reflet sur le dos
    P(g, 5, 14, 15, 1, shade);          // ombre sous le ventre
    P(g, 8, 13, 9, 2, belly);           // ventre plus clair
    // Encolure + tête (museau allongé pointant vers l'avant/bas, typique loup).
    P(g, 18, 5, 7, 7, body);
    P(g, 18, 5, 7, 2, light);
    P(g, 24, 4, 5, 5, body);            // tête
    P(g, 27, 6, 3, 2, snoutDark);       // museau sombre
    P(g, 29, 7, 1, 1, "#151517");       // truffe
    P(g, 20, 1, 2, 4, ear); P(g, 20, 1, 1, 3, dark);   // oreille (grande, pointue)
    P(g, 24, 1, 2, 4, ear); P(g, 25, 1, 1, 3, dark);   // 2e oreille
    P(g, 25, 6, 1, 1, eye);             // oeil (jaune, typique loup)
    // Pattes avant (2), décalées en frame pour l'animation de marche.
    P(g, (7 + off) | 0, 15, 2, 6, dark); P(g, (7 + off) | 0, 20, 2, 2, paw);
    P(g, (12 + off2) | 0, 15, 2, 6, body); P(g, (12 + off2) | 0, 20, 2, 2, paw);
    // Pattes arrière (2, plus musclées à l'arrière-train), même logique.
    P(g, (17 + off2) | 0, 14, 3, 7, dark); P(g, (17 + off2) | 0, 20, 3, 2, paw);
    P(g, (21 + off) | 0, 14, 3, 7, body); P(g, (21 + off) | 0, 20, 3, 2, paw);
    return c;
  }
  // Lapin (chantier 2026-07, demande Guillaume : "petits lapins bien
  // détaillés qui fuient et sont inoffensifs"). Vu de profil (regarde à
  // droite, comme le loup/cheval), petite silhouette basse, grandes oreilles
  // dressées, queue en pompon. 3 frames de saut (accroupi/tendu/en l'air,
  // cycle de bond plutôt qu'une marche à 4 temps comme le loup — un lapin ne
  // "marche" pas, il bondit) ; frame=0 sert aussi de pose "à l'arrêt"
  // (immobile, aux aguets) pour l'état arrêté/roam lent.
  function rabbitSprite(frame) {
    const [c, g] = cv(16, 14);
    const body = "#a9744f", light = "#c99568", dark = "#7d5335", belly = "#ecdcc4",
      ear = "#c99568", earInner = "#e2a08a", eye = "#1a1a1a", nose = "#5a2418";
    // Décalage vertical du corps + des pattes selon la phase de bond.
    const hop = [0, -2, -1][frame % 3];      // 0=accroupi, 1=apogée du bond, 2=retombée
    const legStretch = [0, 2, 1][frame % 3]; // pattes arrière plus tendues à l'appui
    // Queue en pompon (arrière).
    P(g, 1, 6 + hop, 2, 2, belly);
    // Corps (dos rond typique du lapin).
    P(g, 3, 4 + hop, 8, 5, body);
    P(g, 3, 4 + hop, 8, 1, light);
    P(g, 4, 8 + hop, 6, 1, dark);         // ombre sous le ventre
    P(g, 4, 7 + hop, 5, 1, belly);        // ventre clair
    // Tête + museau (avant/bas).
    P(g, 9, 3 + hop, 4, 4, body);
    P(g, 12, 5 + hop, 1, 1, nose);        // truffe
    P(g, 11, 4 + hop, 1, 1, belly);       // joue claire
    P(g, 10, 4 + hop, 1, 1, eye);         // oeil
    // Oreilles dressées, longues et fines.
    P(g, 9, 0 + hop, 1, 4, ear); P(g, 9, 1 + hop, 1, 2, earInner);
    P(g, 11, 0 + hop, 1, 4, ear); P(g, 11, 1 + hop, 1, 2, earInner);
    // Pattes avant (courtes).
    P(g, 4, 9 + hop, 1, 2, dark); P(g, 9, 9 + hop, 1, 2, dark);
    // Pattes arrière (puissantes, tendues à l'appui du bond).
    P(g, 2, (9 - legStretch) + hop, 2, 2 + legStretch, dark);
    P(g, 7, (9 - legStretch) + hop, 2, 2 + legStretch, dark);
    return c;
  }
  // Torche portative (chantier 2026-07) : bouton dédié (comme le sifflet à
  // chevaux), pas un slot d'outil numéroté. Flamme dessinée séparément de la
  // hampe pour pouvoir la faire vaciller légèrement à l'affichage (voir
  // FermeGame.js, qui redessine juste la pointe avec un décalage variable).
  function torchSprite() {
    const [c, g] = cv(14, 20);
    P(g, 5, 9, 3, 10, "#7a5330");  // manche en bois
    P(g, 5, 9, 1, 10, "#9a6f42");
    P(g, 3, 6, 7, 4, "#5a4020");   // tête ficelée
    g.fillStyle = "#f0a838"; g.beginPath(); g.moveTo(7, 0); g.lineTo(11, 6); g.lineTo(7, 5); g.lineTo(3, 6); g.fill(); // flamme
    g.fillStyle = "#ffe27a"; g.beginPath(); g.moveTo(7, 2); g.lineTo(9, 6); g.lineTo(7, 5); g.lineTo(5, 6); g.fill();  // coeur clair de la flamme
    return c;
  }
  // Tabouret de pêche + canne tenue (demande Guillaume : "la canne à pêche et
  // le tabouret doivent être faits en pixel art, pour rester cohérents avec
  // l'univers du jeu") : remplace les overlays emoji 🪑/🎣 de Soan en pêche
  // (FermeGame.js, drawCharacter) par des sprites générés au même style que
  // le reste de l'atlas (blocs pleins + boucle diagonale, comme torchSprite/
  // l'icône outil "rod" ci-dessus dont la canne reprend le principe).
  function stoolSprite() {
    const [c, g] = cv(14, 14);
    P(g, 2, 4, 10, 3, "#8a6340");  // assise en bois
    P(g, 2, 4, 10, 1, "#a87745"); // reflet sur l'assise
    g.strokeStyle = "#6a4a2a"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(3, 7); g.lineTo(11, 13); g.stroke();  // pied croisé 1 (tabouret pliant)
    g.beginPath(); g.moveTo(11, 7); g.lineTo(3, 13); g.stroke();  // pied croisé 2
    return c;
  }
  // Greg assis sur son tabouret (FIX 246, décision Guillaume : "pose assise
  // dédiée"). Sprite 16x24 (même gabarit qu'un personnage, aligné pareil dans
  // drawCharacter) : tabouret pliant baké dessous, Greg de face, jambes
  // repliées/pendantes, bras sur les cuisses, salopette denim reconnaissable.
  // Le 💤 flottant est ajouté au rendu (FermeGame) pour qu'il oscille.
  function gregSeatedSprite() {
    const [c, g] = cv(16, 24);
    const o = C.OUTFITS[0];
    const hair = HAIR_COLORS[0];
    const DENIM = "#3f5a8c", DENIM_D = shade(DENIM);
    const WOOD = "#8a6340", WOOD_L = "#a87745", WOOD_D = "#6a4a2a";
    // Tabouret (assise + pieds croisés).
    P(g, 3, 17, 10, 3, WOOD); P(g, 3, 17, 10, 1, WOOD_L);
    g.strokeStyle = WOOD_D; g.lineWidth = 2;
    g.beginPath(); g.moveTo(4, 20); g.lineTo(11, 24); g.stroke();
    g.beginPath(); g.moveTo(12, 20); g.lineTo(5, 24); g.stroke();
    // Mollets pendants devant le tabouret + bottes.
    P(g, 5, 16, 2, 5, DENIM); P(g, 9, 16, 2, 5, DENIM_D);
    P(g, 5, 21, 2, 2, "#6a4528"); P(g, 9, 21, 2, 2, "#6a4528");
    // Cuisses assises (horizontales) sur l'assise.
    P(g, 4, 14, 8, 3, DENIM); P(g, 4, 16, 8, 1, DENIM_D);
    // Torse + salopette.
    P(g, 4, 9, 8, 6, o.shirt); P(g, 4, 9, 8, 1, tint(o.shirt));
    P(g, 6, 10, 4, 5, DENIM);
    P(g, 5, 9, 1, 4, DENIM); P(g, 10, 9, 1, 4, DENIM);
    // Bras posés sur les cuisses + mains.
    P(g, 3, 12, 2, 3, o.shirt); P(g, 11, 12, 2, 3, o.shirt);
    P(g, 3, 14, 2, 1, SKIN); P(g, 11, 14, 2, 1, SKIN);
    // Tête + cheveux.
    P(g, 4, 2, 8, 8, SKIN); P(g, 4, 9, 8, 1, SKIN_D);
    P(g, 3, 1, 10, 3, hair); P(g, 3, 3, 1, 3, hair); P(g, 12, 3, 1, 3, hair); P(g, 4, 1, 8, 2, hair);
    P(g, 6, 5, 1, 2, "#3a2a1e"); P(g, 9, 5, 1, 2, "#3a2a1e"); // yeux reposés
    P(g, 6, 8, 4, 1, "#c88a6a"); // bouche
    return c;
  }
  function fishingRodHeldSprite() {
    const [c, g] = cv(18, 26);
    P(g, 8, 20, 3, 6, "#5a4020");  // poignée en bois
    P(g, 8, 20, 1, 6, "#7a5a34"); // reflet poignée
    for (let i = 0; i < 17; i++) P(g, 16 - i, 19 - i, 1, 1, "#c8c8d0"); // canne diagonale, poignée -> pointe
    P(g, 0, 2, 1, 16, "#d8d8e0"); // fil tendu de la pointe vers l'eau
    P(g, 0, 17, 3, 3, "#e03e2e"); // flotteur
    P(g, 1, 18, 1, 1, "#fff");
    return c;
  }
  // fin surmonté d'une lanterne. Dessiné plus haut qu'une tuile (comme le
  // puits), donc dans le calque "draws" trié par profondeur, pas la boucle de
  // sol. La lanterne est toujours dessinée "éteinte" ici : son halo lumineux
  // de nuit est un effet de rendu séparé (percé dans l'overlay nocturne),
  // pas une variante de sprite.
  function lampSprite() {
    const [c, g] = cv(16, 32);
    P(g, 7, 14, 2, 16, "#3a3a40"); // poteau
    P(g, 6, 28, 4, 2, "#2a2a30");  // base
    P(g, 4, 16, 8, 2, "#4a4a52");  // bras
    g.fillStyle = "#5a5a62"; g.beginPath(); g.moveTo(3, 8); g.lineTo(13, 8); g.lineTo(11, 14); g.lineTo(5, 14); g.fill(); // cage
    P(g, 5, 3, 6, 6, "#f0d878"); // vitre/lanterne (teinte chaude, "éteinte" le jour)
    P(g, 6, 2, 4, 1, "#3a3a40");
    return c;
  }
  // Épouvantail (chantier 2026-07, achetable/posable par les joueurs) : croix
  // de bois habillée de paille/vieux vêtements, chapeau de paille. Dessiné
  // plus haut qu'une tuile (comme le lampadaire/le puits), donc dans le
  // calque "draws" trié par profondeur, pas la boucle de sol.
  function scarecrowSprite() {
    const [c, g] = cv(16, 32);
    P(g, 7, 20, 2, 8, "#7a5330"); // piquet planté au sol
    P(g, 2, 12, 12, 2, "#8a6038"); // traverse (bras)
    P(g, 4, 10, 8, 12, "#d4b25a"); // torse en paille
    P(g, 3, 12, 2, 6, "#c49a4a"); P(g, 11, 12, 2, 6, "#c49a4a"); // manches
    P(g, 5, 22, 3, 4, "#8a6a3a"); P(g, 8, 22, 3, 4, "#6a5230"); // jambes en paille
    g.fillStyle = "#e8d8b0"; g.beginPath(); g.arc(8, 7, 4, 0, 7); g.fill(); // tête (sac de toile)
    P(g, 5, 6, 2, 1, "#2a2a30"); P(g, 9, 6, 2, 1, "#2a2a30"); // yeux cousus
    P(g, 6, 9, 4, 1, "#a83c30"); // bouche cousue
    P(g, 3, 2, 10, 3, "#c9a227"); P(g, 2, 4, 12, 2, "#b8912a"); // chapeau de paille
    return c;
  }
  // Levier de pont (chantier 2026-07, demande Guillaume) : petit poteau planté
  // dans la berge avec un manche articulé. `up` = manche levé vers la droite
  // (pont ouvert), `down` = manche baissé vers la gauche (pont fermé) — un
  // repère visuel simple et lisible à distance, sans nouveau concept d'anim.
  function leverSprite(up) {
    const [c, g] = cv(16, 24);
    P(g, 6, 14, 4, 8, "#5a5a62");  // socle planté au sol
    P(g, 6, 20, 4, 2, "#3a3a40");
    g.fillStyle = "#7a5330"; g.beginPath(); g.arc(8, 13, 2, 0, 7); g.fill(); // articulation
    g.strokeStyle = "#8a6038"; g.lineWidth = 2; g.lineCap = "round";
    g.beginPath(); g.moveTo(8, 13);
    if (up) g.lineTo(13, 4); else g.lineTo(3, 6);
    g.stroke();
    g.fillStyle = up ? "#8ac25a" : "#e06a50"; // boule au bout du manche, couleur = état
    g.beginPath(); g.arc(up ? 13 : 3, up ? 4 : 6, 2, 0, 7); g.fill();
    return c;
  }
  // Moulin (chantier 2026-07, transformation artisanale demandée par
  // Guillaume : "prévoir la construction de bâtiments simples (fût, presse,
  // four)"). Premier bâtiment de cette famille : petite bâtisse en bois sur
  // soubassement de pierre, toit en pente, avec une roue à aubes sur le
  // flanc (symbole lisible de "moulin" même sans rotation animée, gardé
  // simple comme demandé) et un sac de blé/farine posé contre l'entrée pour
  // l'ambiance artisanale. Dessiné plus haut qu'une tuile (comme le puits/le
  // lampadaire), donc dans le calque "draws" trié par profondeur, pas la
  // boucle de sol. Taille intermédiaire (ni trop grand, ni trop petit,
  // demande explicite de Guillaume) : un peu plus large qu'une case, un peu
  // moins haut que la maison.
  function millSprite() {
    // Moulin refondu (maquette validée 2026-07) : tour en pierre, calotte
    // bois, AILES de moulin à vent (lattes bois + toile écrue).
    // Zip 264 (demande Guillaume : « augmenter la taille des moulins sans
    // perdre en précision ») : redessiné à RÉSOLUTION NATIVE plus grande
    // (44x54 au lieu de 30x36), donc ~1.5× plus grand à l'écran sans upscale
    // flou. Design identique, tracé plus dense. Le rendu (FermeGame.js) reste
    // centré sur x*T+8 et ancré en bas sur (y+1)*T ; les ailes tournantes et
    // les jauges y sont recalées (hub à (y+1)*T-36).
    const [c, g] = cv(44, 54);
    const r = makeRnd(3);
    bStones(g, 13, 21, 18, 30, r, ["#b8b0a2", "#d0c8ba", "#a09888"], 6);
    g.fillStyle = "#7a5330"; g.beginPath(); g.moveTo(10, 23); g.lineTo(22, 11); g.lineTo(34, 23); g.fill();
    P(g, 12, 20, 20, 1, "#6a4426"); P(g, 15, 15, 15, 1, "#6a4426");
    // 4 ailes en diagonale : latte bois épaisse + bande de toile écrue
    for (let i = 4; i < 19; i++) {
      for (const sx of [1, -1]) for (const sy of [1, -1]) {
        const xx = 22 + sx * i, yy = 18 + sy * i;
        if (xx >= 0 && xx < 44 && yy >= 0 && yy < 54) {
          P(g, xx, yy, 2, 2, "#5a4028");
          const tx = xx + sx * 2;
          if (i >= 7 && tx >= 0 && tx < 44) P(g, tx, yy, 2, 2, i % 3 ? "#eae2cc" : "#d8cfb2");
        }
      }
    }
    P(g, 20, 16, 4, 4, "#3a2818"); // moyeu
    P(g, 17, 39, 9, 12, "#5a3d24"); P(g, 17, 39, 9, 1, "#6a4a2c"); // porte
    P(g, 18, 27, 7, 6, "#cfe0e8"); P(g, 18, 27, 7, 1, "#3a3a40"); // fenêtre
    // sac de farine contre l'entrée
    P(g, 33, 42, 7, 9, "#d8b878"); P(g, 33, 41, 7, 3, "#b8912a");
    return c;
  }

  // Sucrerie (chantier canne à sucre, maquette "sucrerie_mockup_v3.png"
  // fournie par Guillaume) — COPIE PIXEL-EXACTE du mockup, PAS une
  // réinterprétation stylisée : Guillaume a explicitement demandé "une
  // copie du mockup" après une première version jugée pas fidèle à 100%.
  // Méthode : le mockup (880x800) est dessiné à un pixel "de base" = bloc de
  // 8x8 (vérifié en mesurant les longueurs de segments unis dans l'image —
  // toutes multiples de 8, aucun anticrénelage). En rééchantillonnant 1 pixel
  // sur 8 (au centre de chaque bloc), on retrouve l'image pixel-art NATIVE
  // sans perte, recadrée sur son contenu opaque (95x94 -> 95x88 utile). Les
  // ~343 rectangles ci-dessous sont le résultat direct, en niveau de gris/
  // couleur EXACTS du mockup (RLE ligne par ligne puis fusion verticale), pas
  // redessinés à la main : maison en pierre à toit à 4 pans, cheminée
  // fumante, fenêtre à 4 carreaux, porte, crochets à liane, tonneaux, et à
  // droite le pressoir à canne (ossature à claire-voie + tronçons de canne
  // pressée), et au sol les deux tas de canne coupée.
  // MÊME mécanique de pose/jauges que le moulin (O_SUCRERIE, voir
  // FermeGame.js) : un SEUL tile est solide (la façade de la maison), tout
  // le reste (tonneaux, pressoir, tas de canne) n'est QUE de l'image — le
  // joueur passe au travers, comme demandé par Guillaume ("on peut passer à
  // travers, pareil pour les tonneaux"), exactement comme les ailes du
  // moulin débordent déjà de leur case sans bloquer. Repères utilisés côté
  // FermeGame.js pour l'ancrage : façade centrée en x=36, sol (bas du mur/
  // porte) en y=72 dans ce repère 95x88.
  function sucrerieSprite() {
    const [c, g] = cv(95, 88);
    P(g, 46, 0, 4, 1, "rgba(210,210,210,0.31)"); P(g, 47, 1, 2, 1, "rgba(210,210,210,0.31)"); P(g, 50, 3, 2, 1, "rgba(235,235,235,0.67)"); P(g, 49, 4, 4, 2, "rgba(235,235,235,0.67)");
    P(g, 50, 6, 2, 1, "rgba(235,235,235,0.67)"); P(g, 48, 8, 3, 1, "rgba(235,235,235,0.78)"); P(g, 47, 9, 5, 3, "rgba(235,235,235,0.78)"); P(g, 48, 12, 3, 1, "rgba(235,235,235,0.78)");
    P(g, 44, 14, 10, 1, "#a8a29c"); P(g, 44, 15, 10, 2, "#726d6a"); P(g, 45, 17, 8, 3, "#8f8a86"); P(g, 33, 19, 4, 2, "#e8c860");
    P(g, 45, 20, 8, 1, "#726d6a"); P(g, 45, 21, 8, 3, "#8f8a86"); P(g, 34, 21, 2, 4, "#2e2016"); P(g, 45, 24, 8, 1, "#726d6a");
    P(g, 33, 25, 5, 1, "#463a34"); P(g, 32, 26, 7, 1, "#463a34"); P(g, 45, 25, 8, 3, "#8f8a86"); P(g, 30, 27, 11, 1, "#463a34");
    P(g, 28, 28, 7, 1, "#463a34"); P(g, 36, 28, 7, 1, "#463a34"); P(g, 35, 28, 1, 1, "#5a4c44"); P(g, 45, 28, 8, 1, "#726d6a");
    P(g, 33, 29, 5, 1, "#5a4c44"); P(g, 38, 29, 6, 1, "#463a34"); P(g, 27, 29, 6, 1, "#463a34"); P(g, 25, 30, 6, 1, "#463a34");
    P(g, 40, 30, 5, 1, "#463a34"); P(g, 31, 30, 9, 1, "#5a4c44"); P(g, 45, 29, 8, 3, "#8f8a86"); P(g, 42, 31, 3, 1, "#463a34");
    P(g, 23, 31, 6, 1, "#463a34"); P(g, 29, 31, 13, 1, "#5a4c44"); P(g, 44, 32, 1, 1, "#463a34"); P(g, 27, 32, 17, 1, "#5a4c44");
    P(g, 22, 32, 5, 1, "#463a34"); P(g, 45, 32, 8, 1, "#726d6a"); P(g, 25, 33, 21, 1, "#5a4c44"); P(g, 20, 33, 5, 1, "#463a34");
    P(g, 46, 33, 5, 1, "#463a34"); P(g, 37, 34, 11, 1, "#5a4c44"); P(g, 18, 34, 5, 1, "#463a34"); P(g, 34, 34, 3, 1, "#463a34");
    P(g, 48, 34, 5, 1, "#463a34"); P(g, 23, 34, 11, 1, "#5a4c44"); P(g, 17, 35, 4, 1, "#463a34"); P(g, 40, 35, 10, 1, "#5a4c44");
    P(g, 21, 35, 11, 1, "#5a4c44"); P(g, 50, 35, 4, 1, "#463a34"); P(g, 32, 35, 8, 1, "#463a34"); P(g, 52, 36, 4, 1, "#463a34");
    P(g, 19, 36, 11, 1, "#5a4c44"); P(g, 30, 36, 12, 1, "#463a34"); P(g, 15, 36, 4, 1, "#463a34"); P(g, 42, 36, 10, 1, "#5a4c44");
    P(g, 54, 37, 4, 1, "#463a34"); P(g, 44, 37, 10, 1, "#5a4c44"); P(g, 28, 37, 16, 1, "#463a34"); P(g, 17, 37, 11, 1, "#5a4c44");
    P(g, 13, 37, 4, 1, "#463a34"); P(g, 15, 38, 11, 1, "#5a4c44"); P(g, 12, 38, 3, 1, "#463a34"); P(g, 26, 38, 20, 1, "#463a34");
    P(g, 56, 38, 3, 1, "#463a34"); P(g, 46, 38, 10, 1, "#5a4c44"); P(g, 24, 39, 25, 1, "#463a34"); P(g, 49, 39, 9, 1, "#5a4c44");
    P(g, 13, 39, 11, 1, "#5a4c44"); P(g, 58, 39, 3, 1, "#463a34"); P(g, 10, 39, 3, 1, "#463a34"); P(g, 8, 40, 3, 1, "#463a34");
    P(g, 51, 40, 9, 1, "#5a4c44"); P(g, 60, 40, 3, 1, "#463a34"); P(g, 22, 40, 29, 1, "#463a34"); P(g, 11, 40, 11, 1, "#5a4c44");
    P(g, 5, 41, 60, 1, "#332a26"); P(g, 31, 42, 8, 1, "#332a26"); P(g, 65, 42, 1, 1, "#463a34"); P(g, 42, 42, 23, 1, "#332a26");
    P(g, 5, 42, 23, 1, "#332a26"); P(g, 28, 42, 3, 2, "#96782b"); P(g, 39, 42, 3, 2, "#96782b"); P(g, 19, 43, 1, 1, "#5e5a56");
    P(g, 12, 43, 7, 1, "#8f8a86"); P(g, 44, 43, 7, 1, "#8f8a86"); P(g, 31, 43, 4, 1, "#8f8a86"); P(g, 51, 43, 1, 1, "#5e5a56");
    P(g, 43, 43, 1, 1, "#5e5a56"); P(g, 35, 43, 1, 1, "#5e5a56"); P(g, 36, 43, 3, 1, "#8f8a86"); P(g, 27, 43, 1, 1, "#5e5a56");
    P(g, 11, 43, 1, 1, "#5e5a56"); P(g, 42, 43, 1, 1, "#8f8a86"); P(g, 20, 43, 7, 1, "#8f8a86"); P(g, 52, 43, 7, 1, "#8f8a86");
    P(g, 41, 44, 18, 1, "#5e5a56"); P(g, 30, 44, 10, 1, "#5e5a56"); P(g, 11, 44, 18, 1, "#5e5a56"); P(g, 24, 45, 5, 2, "#8f8a86");
    P(g, 11, 45, 4, 2, "#8f8a86"); P(g, 23, 45, 1, 2, "#5e5a56"); P(g, 16, 45, 7, 2, "#8f8a86"); P(g, 15, 45, 1, 2, "#5e5a56");
    P(g, 63, 46, 22, 1, "#5a3f28"); P(g, 14, 47, 12, 1, "#2e2016"); P(g, 47, 45, 1, 4, "#5e5a56"); P(g, 32, 45, 7, 4, "#8f8a86");
    P(g, 56, 45, 3, 4, "#8f8a86"); P(g, 39, 45, 1, 4, "#5e5a56"); P(g, 41, 45, 6, 4, "#8f8a86"); P(g, 55, 45, 1, 4, "#5e5a56");
    P(g, 31, 45, 1, 4, "#5e5a56"); P(g, 48, 45, 7, 4, "#8f8a86"); P(g, 30, 45, 1, 4, "#8f8a86"); P(g, 11, 47, 3, 2, "#8f8a86");
    P(g, 26, 47, 3, 2, "#8f8a86"); P(g, 63, 47, 22, 3, "#4a3524"); P(g, 15, 48, 4, 2, "#3f5f7e"); P(g, 20, 48, 5, 2, "#3f5f7e");
    P(g, 41, 49, 18, 1, "#5e5a56"); P(g, 26, 49, 3, 1, "#5e5a56"); P(g, 11, 49, 3, 1, "#5e5a56"); P(g, 30, 49, 10, 1, "#5e5a56");
    P(g, 73, 50, 2, 1, "#6b4a2e"); P(g, 25, 48, 1, 4, "#2e2016"); P(g, 14, 48, 1, 4, "#2e2016"); P(g, 19, 48, 1, 4, "#2e2016");
    P(g, 20, 50, 5, 2, "#2e4a66"); P(g, 15, 50, 4, 2, "#2e4a66"); P(g, 71, 51, 6, 1, "#4a3320"); P(g, 14, 52, 12, 1, "#2e2016");
    P(g, 40, 44, 1, 10, "#5f8a3c"); P(g, 29, 44, 1, 10, "#5f8a3c"); P(g, 43, 50, 1, 4, "#5e5a56"); P(g, 41, 50, 2, 4, "#8f8a86");
    P(g, 36, 50, 4, 4, "#8f8a86"); P(g, 11, 50, 1, 4, "#5e5a56"); P(g, 30, 50, 5, 4, "#8f8a86"); P(g, 52, 50, 7, 4, "#8f8a86");
    P(g, 35, 50, 1, 4, "#5e5a56"); P(g, 27, 50, 1, 4, "#5e5a56"); P(g, 51, 50, 1, 4, "#5e5a56"); P(g, 12, 50, 2, 4, "#8f8a86");
    P(g, 44, 50, 7, 4, "#8f8a86"); P(g, 28, 50, 1, 4, "#8f8a86"); P(g, 26, 50, 1, 4, "#8f8a86"); P(g, 73, 52, 2, 2, "#6b4a2e");
    P(g, 20, 53, 5, 1, "#2e4a66"); P(g, 71, 54, 6, 1, "#4a3320"); P(g, 11, 54, 3, 1, "#5e5a56"); P(g, 26, 54, 33, 1, "#5e5a56");
    P(g, 15, 53, 1, 3, "#2e4a66"); P(g, 16, 53, 3, 3, "#c9a878"); P(g, 20, 54, 1, 2, "#2e4a66"); P(g, 24, 54, 1, 2, "#2e4a66");
    P(g, 21, 54, 3, 2, "#c9a878"); P(g, 73, 55, 2, 1, "#4a3320"); P(g, 25, 53, 1, 4, "#2e2016"); P(g, 14, 53, 1, 4, "#2e2016");
    P(g, 19, 53, 1, 4, "#2e2016"); P(g, 31, 55, 8, 2, "#2e2016"); P(g, 11, 55, 3, 2, "#8f8a86"); P(g, 72, 56, 5, 1, "#4a3320");
    P(g, 15, 56, 4, 1, "#2e4a66"); P(g, 20, 56, 5, 1, "#2e4a66"); P(g, 26, 55, 5, 3, "#8f8a86"); P(g, 71, 57, 7, 1, "#4a3320");
    P(g, 6, 57, 8, 1, "#3a3a3a"); P(g, 14, 57, 12, 1, "#2e2016"); P(g, 47, 55, 1, 4, "#5e5a56"); P(g, 56, 55, 3, 4, "#8f8a86");
    P(g, 39, 55, 1, 4, "#5e5a56"); P(g, 48, 55, 7, 4, "#8f8a86"); P(g, 55, 55, 1, 4, "#5e5a56"); P(g, 40, 55, 7, 4, "#8f8a86");
    P(g, 24, 58, 7, 1, "#8f8a86"); P(g, 14, 58, 1, 1, "#8f8a86"); P(g, 70, 58, 2, 1, "#4a3320"); P(g, 16, 58, 7, 1, "#8f8a86");
    P(g, 77, 58, 2, 1, "#4a3320"); P(g, 23, 58, 1, 1, "#5e5a56"); P(g, 15, 58, 1, 1, "#5e5a56"); P(g, 80, 50, 3, 10, "#2e2016");
    P(g, 13, 58, 1, 2, "#8a5a30"); P(g, 6, 58, 1, 2, "#8a5a30"); P(g, 8, 58, 4, 2, "#8a5a30"); P(g, 73, 58, 2, 2, "#6b4a2e");
    P(g, 39, 59, 20, 1, "#5e5a56"); P(g, 14, 59, 17, 1, "#5e5a56"); P(g, 78, 59, 2, 1, "#4a3320"); P(g, 69, 59, 2, 1, "#4a3320");
    P(g, 71, 60, 6, 1, "#4a3320"); P(g, 13, 60, 1, 1, "#3a3a3a"); P(g, 6, 60, 1, 1, "#3a3a3a"); P(g, 8, 60, 4, 1, "#3a3a3a");
    P(g, 32, 57, 6, 5, "#4a3524"); P(g, 73, 61, 2, 2, "#6b4a2e"); P(g, 65, 50, 3, 14, "#2e2016"); P(g, 43, 60, 1, 4, "#5e5a56");
    P(g, 52, 60, 7, 4, "#8f8a86"); P(g, 79, 60, 2, 4, "#4a3320"); P(g, 27, 60, 1, 4, "#5e5a56"); P(g, 39, 60, 4, 4, "#8f8a86");
    P(g, 51, 60, 1, 4, "#5e5a56"); P(g, 14, 60, 5, 4, "#8f8a86"); P(g, 19, 60, 1, 4, "#5e5a56"); P(g, 44, 60, 7, 4, "#8f8a86");
    P(g, 68, 60, 2, 4, "#4a3320"); P(g, 28, 60, 3, 4, "#8f8a86"); P(g, 20, 60, 7, 4, "#8f8a86"); P(g, 6, 61, 1, 3, "#8a5a30");
    P(g, 36, 62, 1, 2, "#e8c860"); P(g, 37, 62, 1, 2, "#4a3524"); P(g, 32, 62, 4, 2, "#4a3524"); P(g, 71, 63, 6, 1, "#4a3320");
    P(g, 0, 63, 6, 1, "#3a3a3a"); P(g, 81, 60, 2, 5, "#2e2016"); P(g, 13, 61, 1, 4, "#8a5a30"); P(g, 8, 61, 4, 4, "#8a5a30");
    P(g, 68, 64, 1, 1, "#4a3320"); P(g, 39, 64, 20, 1, "#5e5a56"); P(g, 14, 64, 17, 1, "#5e5a56"); P(g, 2, 64, 5, 1, "#8a5a30");
    P(g, 80, 64, 1, 1, "#4a3320"); P(g, 12, 58, 1, 8, "#a5713e"); P(g, 7, 58, 1, 8, "#6b4423"); P(g, 73, 64, 3, 2, "#96782b");
    P(g, 65, 64, 3, 2, "#96782b"); P(g, 69, 64, 3, 2, "#96782b"); P(g, 0, 64, 1, 2, "#8a5a30"); P(g, 77, 64, 3, 2, "#96782b");
    P(g, 2, 65, 4, 1, "#8a5a30"); P(g, 13, 65, 6, 1, "#3a3a3a"); P(g, 6, 65, 1, 1, "#3a3a3a"); P(g, 8, 65, 4, 1, "#3a3a3a");
    P(g, 2, 66, 5, 1, "#3a3a3a"); P(g, 8, 66, 1, 1, "#3a3a3a"); P(g, 0, 66, 1, 1, "#3a3a3a"); P(g, 47, 65, 1, 3, "#5e5a56");
    P(g, 56, 65, 3, 3, "#8f8a86"); P(g, 24, 65, 7, 3, "#8f8a86"); P(g, 39, 65, 1, 3, "#5e5a56"); P(g, 48, 65, 7, 3, "#8f8a86");
    P(g, 19, 65, 4, 3, "#8f8a86"); P(g, 55, 65, 1, 3, "#5e5a56"); P(g, 40, 65, 7, 3, "#8f8a86"); P(g, 23, 65, 1, 3, "#5e5a56");
    P(g, 18, 66, 1, 2, "#8a5a30"); P(g, 11, 66, 1, 2, "#8a5a30"); P(g, 13, 66, 4, 2, "#8a5a30"); P(g, 72, 66, 1, 3, "#4a3320");
    P(g, 76, 66, 1, 3, "#4a3320"); P(g, 11, 68, 1, 1, "#3a3a3a"); P(g, 13, 68, 4, 1, "#3a3a3a"); P(g, 18, 68, 1, 1, "#3a3a3a");
    P(g, 38, 57, 1, 13, "#2e2016"); P(g, 31, 57, 1, 13, "#2e2016"); P(g, 32, 64, 6, 6, "#4a3524"); P(g, 39, 68, 20, 2, "#726d6a");
    P(g, 19, 68, 12, 2, "#726d6a"); P(g, 63, 70, 2, 1, "#a8a29c"); P(g, 68, 70, 1, 1, "#a8a29c"); P(g, 83, 70, 2, 1, "#a8a29c");
    P(g, 72, 70, 1, 1, "#a8a29c"); P(g, 76, 70, 1, 1, "#a8a29c"); P(g, 69, 66, 3, 6, "#4d7530"); P(g, 73, 66, 3, 6, "#5f8a3c");
    P(g, 77, 66, 3, 6, "#4d7530"); P(g, 65, 66, 3, 6, "#5f8a3c"); P(g, 19, 70, 40, 2, "#726d6a"); P(g, 72, 71, 1, 1, "#726d6a");
    P(g, 76, 71, 1, 1, "#726d6a"); P(g, 68, 71, 1, 1, "#726d6a"); P(g, 0, 67, 1, 6, "#8a5a30"); P(g, 2, 67, 5, 6, "#8a5a30");
    P(g, 8, 67, 1, 6, "#8a5a30"); P(g, 1, 64, 1, 10, "#6b4423"); P(g, 80, 65, 3, 9, "#2e2016"); P(g, 7, 66, 1, 8, "#a5713e");
    P(g, 18, 69, 1, 5, "#8a5a30"); P(g, 11, 69, 1, 5, "#8a5a30"); P(g, 13, 69, 4, 5, "#8a5a30"); P(g, 83, 71, 2, 3, "#726d6a");
    P(g, 63, 71, 2, 3, "#726d6a"); P(g, 68, 72, 12, 2, "#726d6a"); P(g, 65, 72, 3, 2, "#2e2016"); P(g, 8, 73, 1, 1, "#3a3a3a");
    P(g, 2, 73, 5, 1, "#3a3a3a"); P(g, 0, 73, 1, 1, "#3a3a3a"); P(g, 12, 66, 1, 9, "#6b4423"); P(g, 17, 66, 1, 9, "#a5713e");
    P(g, 11, 74, 1, 1, "#3a3a3a"); P(g, 18, 74, 1, 1, "#3a3a3a"); P(g, 13, 74, 4, 1, "#3a3a3a"); P(g, 63, 74, 22, 2, "#726d6a");
    P(g, 74, 78, 1, 1, "#96782b"); P(g, 94, 79, 1, 1, "#4d7530"); P(g, 74, 79, 3, 1, "#96782b"); P(g, 30, 79, 3, 1, "#96782b");
    P(g, 77, 79, 1, 1, "#5f8a3c"); P(g, 71, 79, 1, 1, "#96782b"); P(g, 33, 80, 3, 1, "#5f8a3c"); P(g, 68, 80, 1, 1, "#96782b");
    P(g, 77, 80, 3, 1, "#5f8a3c"); P(g, 20, 80, 1, 1, "#96782b"); P(g, 24, 80, 3, 1, "#4d7530"); P(g, 71, 80, 6, 1, "#96782b");
    P(g, 91, 80, 4, 1, "#4d7530"); P(g, 27, 80, 6, 1, "#96782b"); P(g, 33, 81, 8, 1, "#5f8a3c"); P(g, 81, 81, 2, 1, "#5f8a3c");
    P(g, 21, 81, 3, 1, "#4d7530"); P(g, 17, 81, 4, 1, "#96782b"); P(g, 88, 81, 7, 1, "#4d7530"); P(g, 87, 81, 1, 1, "#96782b");
    P(g, 24, 81, 9, 1, "#96782b"); P(g, 84, 82, 4, 1, "#96782b"); P(g, 37, 82, 4, 1, "#5f8a3c"); P(g, 14, 82, 5, 1, "#96782b");
    P(g, 88, 82, 4, 1, "#4d7530"); P(g, 81, 82, 3, 1, "#5f8a3c"); P(g, 63, 81, 18, 3, "#6b4a2e"); P(g, 88, 83, 1, 1, "#5f8a3c");
    P(g, 40, 83, 1, 1, "#5f8a3c"); P(g, 11, 83, 7, 1, "#96782b"); P(g, 81, 83, 7, 1, "#96782b"); P(g, 19, 82, 18, 3, "#6b4a2e");
    P(g, 37, 83, 1, 2, "#4d7530"); P(g, 18, 83, 1, 2, "#5f8a3c"); P(g, 74, 84, 2, 1, "#5f8a3c"); P(g, 15, 84, 3, 1, "#4d7530");
    P(g, 68, 84, 6, 1, "#4d7530"); P(g, 67, 84, 1, 1, "#96782b"); P(g, 8, 84, 7, 1, "#96782b"); P(g, 34, 85, 1, 1, "#5f8a3c");
    P(g, 71, 85, 5, 1, "#4d7530"); P(g, 26, 85, 6, 1, "#4d7530"); P(g, 76, 84, 15, 3, "#6b4a2e"); P(g, 31, 86, 1, 1, "#4d7530");
    P(g, 73, 86, 3, 1, "#4d7530"); P(g, 3, 85, 21, 3, "#6b4a2e"); P(g, 76, 87, 1, 1, "#4d7530");
    return c;
  }


  // Chaudron en métal (chantier 2026-07 : remplace l'ancien rendu emoji
  // ⚗️ flottant, demande explicite Guillaume "un joli chaudron type
  // métal, pas une image qui flotte"). Panse en fonte noire, rebord et
  // reflets en gris acier, trois pieds courts, anse arquée, liquide en
  // ébullition (violet, cohérent avec la teinte "améthyste" déjà utilisée
  // pour la lueur côté maléfique) avec quelques bulles et un mince filet
  // de vapeur. Dessiné plus haut qu'une tuile (comme le puits/lampadaire),
  // donc dans le calque "draws" trié par profondeur, pas la boucle de sol.
  /* Zip 385 — LE GOURMANDIN sur la carte 2D. Dessiné plus haut qu'une tuile
     (comme le chaudron et le puits), donc posé dans le calque « draws » trié
     par profondeur, jamais dans la boucle de sol.

     Il doit se lire comme UNE BOUCHE avant tout : c'est ce qu'on vient lui
     donner à manger, et c'est ce qui doit attirer l'œil de loin sur une carte
     rose où tout est déjà rose. D'où le contraste maximal du monde — un violet
     sombre — sur un sol pastel, alors que tout le reste du Pays des Bonbons
     est en camaïeu. */
  /* Zip 386 — ARBRE DE BARBE À PAPA. Demande Guillaume : « convert all trees
     into cotton candy trees (the trunk is the stick that holds the candy floss
     and the leaves are the candy floss) ».

     Même gabarit que le chêne (32x48, ancré par le bas, dessiné à
     (x*T-8, (y+1)*T-48)) : l'objet reste O_TREE/O_TREE2, donc la collision, la
     coupe et le rendement en bois sont RIGOUREUSEMENT inchangés. Seul le
     dessin change, et uniquement au Pays des Bonbons.

     La nuée est faite de rangées de largeurs décroissantes puis croissantes,
     avec des bosses tirées d'un générateur semé sur la VARIANTE (pas sur
     l'horloge) : deux arbres voisins de la même variante sont identiques, ce
     qui est normal en pixel art, et aucun ne bouge d'une image à l'autre. */
  function candyTreeSprite(variant) {
    const [c, g] = cv(32, 48);
    const PAL = variant === 0
      ? { hi: "#ffd3e8", mid: "#ff9dc8", lo: "#e56ba4" }   // rose
      : { hi: "#d8e9ff", mid: "#9fc6f5", lo: "#6f9fd8" };  // bleu
    const rnd = makeRnd(variant === 0 ? 8123 : 4471);

    // Le bâtonnet : blanc cassé, deux pixels de large, avec son ombre.
    P(g, 15, 24, 2, 24, "#f3e6cf");
    P(g, 17, 24, 1, 24, "#cbb894");

    // La nuée : 24 px de haut, bord bosselé.
    const CX = 16, TOP = 2, BOT = 27;
    for (let y = TOP; y < BOT; y++) {
      const t = (y - TOP) / (BOT - TOP);
      // demi-largeur : ovale un peu plus large que haut, plus une bosse
      const base = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.46) / 0.54, 2))) * 14;
      const half = Math.max(2, Math.round(base + (rnd() - 0.5) * 2.2));
      P(g, CX - half, y, half * 2, 1, PAL.mid);
      P(g, CX - half, y, 2, 1, PAL.lo);
      P(g, CX + half - 2, y, 2, 1, PAL.lo);
    }
    // Reflet en haut à gauche, base plus dense : c'est ce qui donne du volume
    // à une masse qui serait sinon un aplat rond.
    for (let y = TOP + 2; y < TOP + 10; y++) {
      const w = 9 - Math.abs(y - (TOP + 5));
      P(g, CX - 9, y, Math.max(2, w), 1, PAL.hi);
    }
    for (let y = BOT - 5; y < BOT; y++) P(g, CX - 8, y, 16, 1, PAL.lo);
    // Quelques perles de sucre prises dans la nuée.
    const beads = ["#ffd23f", "#7ce0f0", "#ffffff", "#a8e02a"];
    for (let i = 0; i < 5; i++) {
      P(g, 6 + Math.floor(rnd() * 20), 5 + Math.floor(rnd() * 18), 2, 2, beads[i % 4]);
    }
    return c;
  }

  /* Zip 386 — LICORNE. Blanche, crinière et queue arc-en-ciel, corne dorée.
     Un seul sprite, tourné vers la DROITE ; le rendu le retourne pour l'autre
     sens (voir drawCandyUnicorns, FermeGame.js). Deux images d'animation : la
     seconde lève les antérieurs, ce qui suffit à lire une allure sans payer
     quatre poses. */
  function unicornSprite(frame) {
    const [c, g] = cv(28, 24);
    const W = "#ffffff", SH = "#e3e0ee", GOLD = "#ffd23f";
    const up = frame === 1;

    // queue arc-en-ciel, à l'arrière (gauche)
    for (let i = 0; i < RAINBOW.length; i++) {
      P(g, 1 + Math.floor(i / 2), 9 + i, 4 - Math.floor(i / 3), 1, RAINBOW[i]);
    }
    // corps
    P(g, 5, 9, 15, 7, W);
    P(g, 5, 14, 15, 2, SH);
    // encolure et tête, vers la droite
    P(g, 17, 5, 6, 6, W);
    P(g, 20, 3, 6, 5, W);
    P(g, 25, 5, 2, 2, SH);          // museau
    P(g, 23, 4, 1, 1, "#2a2436");   // œil
    // corne
    P(g, 23, 0, 1, 3, GOLD); P(g, 24, 1, 1, 2, GOLD);
    // crinière arc-en-ciel, du garrot au front
    for (let i = 0; i < RAINBOW.length; i++) {
      P(g, 16 + i, 6 - Math.floor(i / 2), 1, 4 + (i % 2), RAINBOW[i]);
    }
    // pattes
    P(g, 7, 16, 2, up ? 4 : 6, W);
    P(g, 11, 16, 2, 6, W);
    P(g, 16, 16, 2, up ? 3 : 6, W);
    P(g, 19, 16, 2, 6, W);
    // étincelles
    P(g, 3, 6, 1, 1, "#fff"); P(g, 12, 4, 1, 1, GOLD); P(g, 26, 9, 1, 1, "#fff");
    return c;
  }

  function candyMonsterSprite() {
    const [c, g] = cv(30, 30);
    const FUR = "#8d5bd6", FUR_D = "#6a3fae", MOUTH = "#3a1a5e";
    // corps hirsute : deux rangées de mèches, pas un disque lisse
    P(g, 4, 9, 22, 17, FUR);
    P(g, 2, 12, 2, 12, FUR); P(g, 26, 12, 2, 12, FUR);
    for (let x = 4; x < 26; x += 3) P(g, x, 7, 2, 3, FUR);      // touffes du crâne
    for (let x = 5; x < 25; x += 4) P(g, x, 26, 3, 2, FUR_D);   // pattes/mèches du bas
    P(g, 4, 24, 22, 2, FUR_D);
    // bouche grande ouverte, au centre du corps
    P(g, 9, 16, 12, 8, MOUTH);
    P(g, 10, 24, 10, 1, MOUTH);
    P(g, 11, 16, 2, 2, "#fffdf6"); P(g, 15, 16, 2, 2, "#fffdf6"); P(g, 19, 16, 1, 2, "#fffdf6");
    P(g, 12, 21, 7, 3, "#ff6f9e");                               // langue
    // yeux blancs à grosses pupilles, très écartés (lecture immédiate)
    P(g, 6, 3, 8, 8, "#fffdf6"); P(g, 16, 3, 8, 8, "#fffdf6");
    P(g, 8, 6, 4, 4, "#20122e"); P(g, 18, 6, 4, 4, "#20122e");
    P(g, 9, 7, 1, 1, "#ffffff"); P(g, 19, 7, 1, 1, "#ffffff");
    // pastilles de bonbon prises dans le pelage
    P(g, 5, 14, 2, 2, "#ffd23f"); P(g, 24, 18, 2, 2, "#7ce0f0"); P(g, 6, 21, 2, 2, "#a8e02a");
    return c;
  }

  function cauldronSprite() {
    const [c, g] = cv(20, 24);
    // vapeur légère au-dessus (statique, pas d'animation de flottement)
    g.strokeStyle = "rgba(220,220,230,0.5)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(7, 4); g.quadraticCurveTo(5, 1, 7, -1); g.stroke();
    g.beginPath(); g.moveTo(12, 4); g.quadraticCurveTo(14, 1, 12, -1); g.stroke();
    // anse arquée en fer
    g.strokeStyle = "#2a2a30"; g.lineWidth = 2;
    g.beginPath(); g.arc(10, 9, 7, Math.PI, 0); g.stroke();
    // panse en fonte (corps arrondi)
    g.fillStyle = "#2e2e34";
    g.beginPath(); g.moveTo(2, 10); g.quadraticCurveTo(2, 21, 10, 21); g.quadraticCurveTo(18, 21, 18, 10);
    g.lineTo(18, 9); g.lineTo(2, 9); g.fill();
    // reflet métallique (haut-gauche)
    g.fillStyle = "#4a4a54";
    g.beginPath(); g.moveTo(3, 10); g.quadraticCurveTo(3, 17, 7, 20); g.lineTo(6, 20); g.quadraticCurveTo(3, 16, 3, 10); g.fill();
    P(g, 4, 12, 2, 6, "#5a5a66"); // liseré de reflet
    // rebord épais du chaudron
    P(g, 1, 7, 18, 3, "#3a3a42");
    P(g, 1, 7, 18, 1, "#57575f");
    // liquide en ébullition (potion), visible juste sous le rebord
    P(g, 4, 8, 12, 1, "#8a5ad0");
    g.fillStyle = "#a97ee8";
    g.beginPath(); g.arc(7, 8, 1, 0, 7); g.arc(11, 8, 1.2, 0, 7); g.arc(14, 8, 0.8, 0, 7); g.fill();
    // pieds courts en fonte
    P(g, 2, 20, 3, 3, "#26262c"); P(g, 15, 20, 3, 3, "#26262c"); P(g, 8.5, 21, 3, 3, "#26262c");
    return c;
  }
  function well() {
    // Puits refondu (maquette validée 2026-07) : toit de tuiles, treuil avec
    // tambour + corde + seau en métal, margelle en moellons, eau visible.
    const [c, g] = cv(24, 30);
    for (let row = 0; row < 2; row++) {
      const yy = 3 + row * 4;
      P(g, 2, yy, 20, 4, "#c04a3c");
      P(g, 2, yy + 3, 20, 1, "#7c2a22");
      for (let x = 2 + (row % 2 ? 2 : 0); x < 22; x += 5) { P(g, x, yy, 1, 3, "#7c2a22"); P(g, x + 1, yy, 1, 1, "#d4635a"); }
    }
    P(g, 1, 10, 22, 2, "#6a241e");
    P(g, 3, 12, 2, 10, "#6a4a2c"); P(g, 19, 12, 2, 10, "#6a4a2c"); // poteaux
    P(g, 5, 13, 14, 2, "#5a4028");  // axe du treuil
    P(g, 10, 12, 4, 4, "#8a6340");  // tambour
    P(g, 11, 16, 1, 5, "#3a2818");  // corde
    P(g, 9, 20, 5, 3, "#8a8a92"); P(g, 9, 20, 5, 1, "#a4a4ae"); // seau métal
    const r = makeRnd(9);
    bStones(g, 2, 22, 20, 8, r, ["#9a9aa4", "#b8b8c2", "#84848e"], 4);
    P(g, 5, 24, 14, 4, "#20303c"); // eau sombre visible
    P(g, 8, 25, 3, 1, "#3a5a74"); P(g, 14, 26, 2, 1, "#3a5a74");
    return c;
  }

  // Clôture HORIZONTALE : les deux lisses courent sur toute la LARGEUR de la
  // tuile (y=6 et y=11), donc se prolongent sans coupure d'une tuile à
  // l'autre quand plusieurs tuiles sont posées côte à côte horizontalement.
  function fenceTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 6, T, 2, "#a87745"); P(g, 0, 11, T, 2, "#8a6038"); // lisses
    P(g, 2, 3, 2, 11, "#9a6b3f"); P(g, 10, 3, 2, 11, "#9a6b3f"); // poteaux
    P(g, 2, 3, 2, 1, "#b8834f"); P(g, 10, 3, 2, 1, "#b8834f");
    return c;
  }
  // Clôture VERTICALE (miroir de la précédente, x<->y) : les deux lisses
  // courent sur toute la HAUTEUR de la tuile, donc se prolongent sans coupure
  // d'une tuile à l'autre quand la clôture descend/monte verticalement.
  // Corrige le bug signalé : utiliser le sprite horizontal sur un bord
  // vertical laissait un vide entre chaque tuile (la clôture ne semblait
  // jamais se refermer).
  function fenceTileV() {
    const [c, g] = cv(T, T);
    P(g, 6, 0, 2, T, "#a87745"); P(g, 11, 0, 2, T, "#8a6038"); // lisses
    P(g, 3, 2, 11, 2, "#9a6b3f"); P(g, 3, 10, 11, 2, "#9a6b3f"); // traverses
    P(g, 3, 2, 11, 1, "#b8834f"); P(g, 3, 10, 11, 1, "#b8834f");
    return c;
  }
  // Poteau d'angle : jonction d'un bord horizontal ET vertical (les 4 coins
  // de l'enclos). Un poteau plein + un moignon de lisse dans les deux
  // directions, pour que le coin se lise comme un vrai point d'ancrage.
  function fenceTileCorner() {
    const [c, g] = cv(T, T);
    P(g, 0, 6, T, 2, "#a87745"); P(g, 6, 0, 2, T, "#a87745"); // lisses (croix)
    P(g, 0, 11, T, 2, "#8a6038"); P(g, 11, 0, 2, T, "#8a6038");
    P(g, 4, 4, 8, 8, "#9a6b3f"); // poteau plein
    P(g, 4, 4, 8, 2, "#b8834f");
    return c;
  }
  // Poteau isolé : section de clôture posée librement par le joueur sans
  // aucune section voisine encore adjacente.
  function fenceTilePost() {
    const [c, g] = cv(T, T);
    P(g, 6, 3, 4, 11, "#9a6b3f");
    P(g, 6, 3, 4, 2, "#b8834f");
    P(g, 5, 13, 6, 2, "#7a5330");
    return c;
  }
  // Mur en pierre (construction joueur, zip 154+) : blocs de pierre empilés,
  // un seul sprite (pas d'orientation, contrairement à la clôture) puisque
  // des blocs de pierre s'enchaînent visuellement dans n'importe quel sens.
  function wallTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#8a8a92");
    P(g, 0, 0, T, 5, "#9a9aa2"); P(g, 0, 5, T, 1, "#66666e");
    P(g, 0, 10, T, 1, "#66666e");
    P(g, 1, 1, 5, 3, "#a2a2aa"); P(g, 8, 1, 6, 3, "#7a7a82");
    P(g, 0, 6, 7, 4, "#7a7a82"); P(g, 8, 6, 8, 4, "#9a9aa2");
    P(g, 1, 11, 6, 4, "#a2a2aa"); P(g, 9, 11, 6, 4, "#72727a");
    P(g, 0, 15, T, 1, "#54545c");
    return c;
  }
  // Animal de profil (16x14) : forme simple déclinée par type. Refonte zip
  // 255 (demande Guillaume : "animer les pattes", même principe que
  // wolfSprite) : sprite paramétré par `frame` (0..3). frame 0 = pose
  // d'arrêt (pattes jointes, utilisée quand l'animal broute) ; frames 1..3 =
  // cycle de marche à 4 temps (pattes avant/arrière opposées, comme le
  // loup), toujours vu de profil regardant à droite — le miroir gauche/
  // droite se fait au moment du dessin (FermeGame.js), pas ici.
  // ==================================================================
  // Zip 369 — REFONTE DU CHEPTEL (maquettes validées par Guillaume).
  //
  // Avant : un canevas de 16x14 par animal, une dizaine de fillRect chacun,
  // agrandi jusqu'à x1,7 au rendu. Après : un canevas NATIF par animal (voir
  // C.ANIMAL_SPRITE), des silhouettes en ellipses pixellisées, une robe par
  // bête (C.ANIMAL_SKINS) et 8 frames — 4 de marche, 4 de tête basse pour le
  // broutage et le picorage.
  //
  // Trois outils font ici le gros du travail, et c'est eux qui donnent le
  // volume plutôt que le tracé lui-même :
  //   aEll   : ellipse pixellisée (largeur calculée ligne par ligne) — c'est
  //            ce qui remplace les dalles rectangulaires d'avant ;
  //   aLight : passe de lumière. Éclaircit le pixel le PLUS HAUT de chaque
  //            colonne et assombrit le plus bas. Générique, indépendante du
  //            dessin, ~10 lignes, et elle suffit à donner du relief à tout.
  //   aEdge  : contour. Retour de Guillaume sur la 1re maquette ("quand il y a
  //            un contour, celui-ci est trop large, il faut le réduire par
  //            deux") : le contour ne fait plus le tour complet, il ne subsiste
  //            que du côté OMBRE (arêtes basses et arrière), soit moitié moins
  //            de pixels, et dans un ton plus doux (-70 au lieu de -92).
  //
  // L'encolure est une CHAÎNE d'ellipses tracée entre l'épaule et la tête
  // (aNeck) : elle suit la tête où qu'elle aille, ce qui est ce qui rend la
  // tête basse possible sans redessiner un cou par pose — et réutilisable plus
  // tard pour une tête qui se tourne vers un joueur qui approche.
  // ==================================================================
  function aRect(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function aEll(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y < y1; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (t <= -1 || t >= 1) continue;
      const hw = rx * Math.sqrt(1 - t * t);
      const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
    }
  }
  function aNeck(g, sx, sy, hx, hy, r0, r1, col, n) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      aEll(g, sx + (hx - sx) * t, sy + (hy - sy) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, col);
    }
  }
  function aLeg(g, x, y, w, h, col, hoof) { aRect(g, x, y, w, h, col); aRect(g, x - 0.2, y + h - 1.2, w + 0.4, 1.2, hoof); }
  function aLight(g, w, h, rim, und) {
    const a = g.getImageData(0, 0, w, h).data;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) if (a[(y * w + x) * 4 + 3] > 128) { g.fillStyle = rim; g.fillRect(x, y, 1, 1); break; }
      for (let y = h - 1; y >= 0; y--) if (a[(y * w + x) * 4 + 3] > 128) { g.fillStyle = und; g.fillRect(x, y, 1, 1); break; }
    }
  }
  function aEdge(g, w, h, col) {
    const a = g.getImageData(0, 0, w, h).data, pts = [];
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : a[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (A(x, y) > 128) continue;
      if (A(x, y - 1) > 128 || A(x + 1, y) > 128) pts.push(x, y);
    }
    g.fillStyle = col;
    for (let i = 0; i < pts.length; i += 2) g.fillRect(pts[i], pts[i + 1], 1, 1);
  }
  // Poule : corps chamois, camail et tête d'une teinte propre à la robe (la
  // référence de Guillaume montre une poule chamois à camail brun), crête en
  // trois bosses, caroncule, aile marquée d'un trait, pattes à doigts.
  function drawHen(g, sk, hd, off, of2) {
    const b = 8;
    aEll(g, 3.4, b - 2, 2.8, 2.6, sk.tail); aEll(g, 2.6, b - 3.2, 2, 1.7, sk.tail);
    aEll(g, 8, b, 4.8, 3.9, sk.body); aEll(g, 10.8, b + 0.5, 3, 3.1, sk.body);
    aEll(g, 8.4, b + 0.3, 3.1, 2.2, adjust(sk.body, -20));
    aRect(g, 6.6, b + 1, 3.6, 0.5, adjust(sk.body, -34));
    const hx = 12.2 + hd * 0.28, hy = b - 3.6 + hd;
    aNeck(g, 10.8, b - 1.4, hx, hy, 1.9, 2.3, sk.hack, 3);
    aEll(g, hx, hy, 2.4, 2.2, sk.hack);
    aRect(g, hx - 1.2, hy - 2.5, 0.9, 1.3, sk.comb); aRect(g, hx - 0.2, hy - 2.9, 0.9, 1.6, sk.comb);
    aRect(g, hx + 0.8, hy - 2.5, 0.9, 1.3, sk.comb); aRect(g, hx + 1.1, hy + 1, 0.9, 1.6, sk.comb);
    aRect(g, hx + 2, hy - 0.3, 1.9, 1, sk.foot); aRect(g, hx + 2.7, hy + 0.3, 1.2, 0.7, adjust(sk.foot, -30));
    aLeg(g, 6.6 + of2, b + 3.4, 0.9, 2.4, sk.foot, adjust(sk.foot, -30));
    aLeg(g, 9.4 + off, b + 3.4, 0.9, 2.4, sk.foot, adjust(sk.foot, -30));
    return { eye: [hx + 0.7, hy - 0.7] };
  }
  function drawGoat(g, sk, hd, off, of2, cw) {
    const b = 10, leg = adjust(sk.body, -42);
    aLeg(g, 6.6 + of2, b + 3.6, 1.6, 4.6, leg, sk.hoof); aLeg(g, 14.8 + off, b + 3.6, 1.6, 4.6, leg, sk.hoof);
    aRect(g, 5.2, b - 4.4, 1, 2.9, adjust(sk.body, -24));
    aEll(g, 10.4, b, 6.3, 3.8, sk.body); aEll(g, 6.4, b - 0.2, 3.6, 3.7, sk.body);
    aEll(g, 14.2, b - 0.2, 3.7, 4, sk.body); aEll(g, 10.2, b + 2.4, 4.6, 1.7, adjust(sk.body, 12));
    const hx = 18.8 + hd * 0.34, hy = b - 5.2 + hd * 1.02;
    aNeck(g, 15.8, b - 2.6, hx, hy, 1.5, 2.3, sk.body, 4);
    aEll(g, hx, hy, 2.5, 2.3, sk.body); aEll(g, hx + 1.9, hy + 1.1 + cw, 1.5, 1.3, sk.muz);
    aRect(g, hx + 0.4, hy - 3.6, 0.9, 2, sk.horn); aRect(g, hx + 1, hy - 4.8, 0.9, 1.5, sk.horn);
    aRect(g, hx + 1.7, hy - 5.6, 0.9, 1.1, sk.horn);
    aRect(g, hx - 1.1, hy - 3.6, 0.9, 2, sk.horn); aRect(g, hx - 1.6, hy - 4.7, 0.9, 1.4, sk.horn);
    aEll(g, hx - 1.9, hy - 1.4, 1.4, 1, sk.body);
    aRect(g, hx + 0.2, hy + 2.2, 1.5, 2.4, sk.patch); aRect(g, hx + 0.4, hy + 4, 1.1, 1.1, adjust(sk.patch, -30));
    aLeg(g, 8.6 + off, b + 3.6, 1.6, 4.6, sk.body, sk.hoof); aLeg(g, 12.8 + of2, b + 3.6, 1.6, 4.6, sk.body, sk.hoof);
    return { eye: [hx + 1, hy - 0.5], nose: [hx + 2.9, hy + 1 + cw] };
  }
  function drawEwe(g, sk, hd, off, of2, cw) {
    const b = 9.4, dark = adjust(sk.patch, -30);
    aLeg(g, 6.2 + of2, b + 3.4, 1.4, 4.6, dark, sk.hoof); aLeg(g, 13.4 + off, b + 3.4, 1.4, 4.6, dark, sk.hoof);
    aEll(g, 10, b, 6.1, 3.9, adjust(sk.body, -24));
    aEll(g, 5.6, b - 1.1, 3.2, 3.1, sk.body); aEll(g, 8.4, b - 1.8, 3.4, 3.3, sk.body);
    aEll(g, 11.4, b - 1.6, 3.3, 3.2, sk.body); aEll(g, 13.9, b - 0.5, 2.9, 2.9, sk.body);
    aEll(g, 9.8, b + 1.5, 5.5, 2.7, sk.body);
    let sd = 7;
    for (let i = 0; i < 10; i++) { sd = (sd * 1103515245 + 12345) & 0x7fffffff; aEll(g, 4.5 + ((sd >> 7) % 11), b - 4 + ((sd >> 13) % 6), 0.75, 0.75, adjust(sk.body, -24)); }
    const hx = 17.2 + hd * 0.3, hy = b - 1.4 + hd * 1.1;
    aNeck(g, 15, b - 0.6, hx, hy, 1.6, 2, dark, 3);
    aEll(g, hx, hy, 2.3, 2.1, dark); aEll(g, hx + 1.6, hy + 1 + cw, 1.4, 1.2, adjust(sk.muz, 16));
    aEll(g, hx - 1.3, hy - 1.6, 1.3, 1.5, dark);
    aRect(g, 4.6, b - 2.4, 1, 1.5, sk.body);
    aLeg(g, 8.2 + off, b + 3.4, 1.4, 4.6, dark, sk.hoof); aLeg(g, 11.8 + of2, b + 3.4, 1.4, 4.6, dark, sk.hoof);
    return { eye: [hx + 0.8, hy - 0.5] };
  }
  function drawPig(g, sk, hd, off, of2, cw) {
    const b = 11, leg = adjust(sk.body, -42);
    aLeg(g, 6.4 + of2, b + 3.8, 1.8, 4.2, leg, sk.hoof); aLeg(g, 14.8 + off, b + 3.8, 1.8, 4.2, leg, sk.hoof);
    aRect(g, 3.9, b - 3.2, 0.9, 1.3, adjust(sk.body, -24)); aRect(g, 3.1, b - 3.9, 0.9, 1.1, adjust(sk.body, -24));
    aRect(g, 3.7, b - 4.6, 1.3, 0.9, adjust(sk.body, -24));
    aEll(g, 10.6, b, 6.8, 4.4, sk.body); aEll(g, 6.4, b + 0.2, 4.2, 4.2, sk.body);
    aEll(g, 10.4, b + 2.5, 5.2, 2, adjust(sk.body, 16));
    const hx = 17.6 + hd * 0.3, hy = b - 1 + hd * 1.05;
    aNeck(g, 15, b - 0.4, hx, hy, 2.2, 2.8, sk.body, 3);
    aEll(g, hx, hy, 3.2, 2.9, sk.body); aEll(g, hx + 2.8, hy + 1 + cw, 1.8, 1.6, sk.patch);
    aRect(g, hx + 3.3, hy + 0.5 + cw, 0.7, 0.7, adjust(sk.patch, -30));
    aRect(g, hx + 3.3, hy + 1.6 + cw, 0.7, 0.7, adjust(sk.patch, -30));
    aEll(g, hx - 1.2, hy - 3.2, 1.7, 1.9, sk.body); aEll(g, hx - 1.2, hy - 3, 1.1, 1.3, sk.patch);
    aLeg(g, 8.6 + off, b + 3.8, 1.8, 4.2, sk.body, sk.hoof); aLeg(g, 12.8 + of2, b + 3.8, 1.8, 4.2, sk.body, sk.hoof);
    return { eye: [hx + 1.4, hy - 1] };
  }
  // Vache : proportions reprises d'après les références de Guillaume (holstein
  // et limousine de profil). Retour sur la 1re maquette : "la vache a un trop
  // gros cul" — la croupe est passée de 4,6 à 3,5 de large, le dos s'est
  // allongé, la hanche est marquée par un petit relief au lieu d'une masse
  // ronde, les pattes sont plus longues et plus fines (6,2 x 1,7 contre
  // 5,6 x 2), la tête est plus petite et portée plus bas sur une encolure plus
  // longue, et le ventre pend légèrement.
  function drawCow(g, sk, hd, off, of2, cw) {
    const b = 12.4, leg = adjust(sk.body, -42);
    aRect(g, 4.6, b - 4.4, 0.9, 7.4, adjust(sk.body, -30)); aEll(g, 4.3, b + 3.6, 1.1, 1.7, sk.patch);
    aLeg(g, 7.4 + of2, b + 4.6, 1.7, 6.2, leg, sk.hoof); aLeg(g, 17.8 + off, b + 4.6, 1.7, 6.2, leg, sk.hoof);
    aEll(g, 13.2, b, 8.4, 4.3, sk.body);
    aEll(g, 7.8, b - 0.6, 3.5, 4, sk.body);
    aEll(g, 18.2, b - 0.2, 3.9, 4.3, sk.body);
    aEll(g, 8.6, b - 3.4, 2.4, 1.5, sk.body);
    aEll(g, 13, b + 2.8, 6.4, 2.1, sk.body);
    if (sk.pat) {
      aEll(g, 10, b - 1.8, 3, 2.2, sk.patch); aEll(g, 16.4, b + 1.4, 2.4, 1.6, sk.patch);
      aEll(g, 6.9, b + 1.2, 1.8, 1.4, sk.patch); aEll(g, 13.6, b - 2.6, 1.7, 1.3, sk.patch);
    }
    aEll(g, 11.8, b + 4.4, 2, 1.4, sk.udder || "#e8a89f");
    const hx = 24 + hd * 0.28, hy = b - 6.4 + hd * 1.5;
    aNeck(g, 20.6, b - 3, hx, hy, 1.9, 2.6, sk.body, 4);
    aEll(g, hx, hy, 2.9, 2.4, sk.body);
    if (sk.pat) aEll(g, hx - 0.4, hy - 0.9, 2, 1.5, sk.patch);
    aEll(g, hx + 2.2, hy + 1.2 + cw, 1.9, 1.6, sk.muz);
    aRect(g, hx - 0.2, hy - 3.4, 0.9, 1.5, sk.horn); aRect(g, hx - 0.8, hy - 4.1, 1, 0.9, sk.horn);
    aRect(g, hx + 2, hy - 3.4, 0.9, 1.5, sk.horn); aRect(g, hx + 2.5, hy - 4.1, 1, 0.9, sk.horn);
    aEll(g, hx - 2, hy - 2.2, 1.5, 1.1, sk.body);
    aLeg(g, 9.8 + off, b + 4.6, 1.7, 6.2, sk.body, sk.hoof); aLeg(g, 15.6 + of2, b + 4.6, 1.7, 6.2, sk.body, sk.hoof);
    return { eye: [hx + 1.1, hy - 0.6], nose: [hx + 3, hy + 1.1 + cw] };
  }
  // frame 0..3 = marche (décalage des pattes), 4..7 = tête basse (broutage /
  // picorage, pattes au repos). `skin` indexe C.ANIMAL_SKINS[type].
  function animalSprite(type, skin, frame) {
    const sp = C.ANIMAL_SPRITE[type], list = C.ANIMAL_SKINS[type] || [];
    const sk = list[Math.max(0, Math.min(list.length - 1, skin | 0))] || { body: C.ANIMALS[type].body, patch: C.ANIMALS[type].accent };
    const [c, g] = cv(sp.w, sp.h);
    const f = (frame | 0) % C.ANIMAL_FRAMES;
    const grazing = f >= 4;
    const hdSpec = C.ANIMAL_HEAD_DROP[type];
    const hd = grazing ? hdSpec.d[f - 4] : 0;
    const cw = (grazing && f === hdSpec.chew) ? 0.5 : 0;
    const off = grazing ? 0 : [0, 1.4, 0, -1.4][f];
    const of2 = -off;
    // Translation unique : le code de dessin ci-dessus garde son repère
    // d'origine, la garde de 1 px et le recentrage sont portés ici.
    g.translate(sp.dx, sp.dy);
    let d;
    if (type === 0) d = drawHen(g, sk, hd, off, of2);
    else if (type === 1) d = drawGoat(g, sk, hd, off, of2, cw);
    else if (type === 2) d = drawEwe(g, sk, hd, off, of2, cw);
    else if (type === 3) d = drawPig(g, sk, hd, off, of2, cw);
    else d = drawCow(g, sk, hd, off, of2, cw);
    g.setTransform(1, 0, 0, 1, 0, 0);
    aLight(g, sp.w, sp.h, adjust(sk.body, 22), adjust(sk.body, -70));
    aEdge(g, sp.w, sp.h, adjust(sk.body, -70));
    g.translate(sp.dx, sp.dy);
    if (d.eye) {
      aRect(g, d.eye[0], d.eye[1], 1, 1, "#1a1614");
      aRect(g, d.eye[0], d.eye[1] - 1, 1, 1, "#fffaf0");
    }
    if (d.nose) aRect(g, d.nose[0], d.nose[1], 1, 1, adjust(sk.body, -70));
    g.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }
  // Icône de production d'élevage (par type d'animal).
  function productIcon(type) {
    const [c, g] = cv(T, T);
    if (type === 0) { g.fillStyle = "#fff8ec"; g.beginPath(); g.ellipse(8, 9, 4, 5, 0, 0, 7); g.fill(); P(g, 6, 5, 2, 1, "#e8e0d0"); } // oeuf
    else if (type === 2) { g.fillStyle = "#f2f0ea"; g.beginPath(); g.arc(6, 9, 4, 0, 7); g.arc(10, 9, 4, 0, 7); g.arc(8, 6, 4, 0, 7); g.fill(); } // laine
    else if (type === 3) { g.fillStyle = "#3a2a22"; g.beginPath(); g.arc(8, 9, 5, 0, 7); g.fill(); P(g, 6, 6, 2, 2, "#5a463a"); } // truffe
    else { P(g, 5, 3, 6, 10, "#eef2f5"); P(g, 5, 3, 6, 2, "#cfd8dd"); P(g, 6, 1, 4, 2, "#9fb0b8"); P(g, 6, 5, 4, 2, "#4a8ad0"); } // bouteille de lait
    return c;
  }

  // Grange collaborative (chantier persistant, zip 158) : 3 paliers, la
  // grange grandit et se complète visuellement à chaque palier construit.
  // Paliers 1/2 : même famille de dessin que house(), palette rouge/blanc
  // "grange", taille croissante (48 / 72 px). Palier 3 (zip 161, demande
  // explicite "bien plus grand que la maison" — la maison fait 96×96px) :
  // dessin dédié, façade beaucoup plus large ET plus haute que la maison,
  // avec silo attenant à taille réelle, cupole + girouette au faîtage,
  // grande fenêtre ronde de fenil et soubassement en pierre — direction
  // validée par Guillaume sur maquette avant implémentation.
  function barnSprite(level) {
    if (level >= 3) return barnSpriteBig();
    const sz = level === 1 ? 48 : 72;
    const [c, g] = cv(sz, sz + 8);
    const wallH = Math.round(sz * 0.42);
    const baseY = sz - 4;
    // Murs
    P(g, sz * 0.06, baseY - wallH, sz * 0.88, wallH, "#a83c30");
    for (let y = baseY - wallH + 4; y < baseY; y += 6) P(g, sz * 0.06, y, sz * 0.88, 1, "#8a3028");
    P(g, sz * 0.06, baseY - wallH, sz * 0.88, 3, "#c04a3c");
    // Restyle maquette validée 2026-07 : joints de planches verticaux sur
    // le bardage rouge (lecture "planches" plutôt qu'aplat).
    for (let x = Math.round(sz * 0.06) + 5; x < sz * 0.92; x += 5) P(g, x, baseY - wallH + 3, 1, wallH - 3, "#8a3028");
    // Toit à deux pans — gris ardoise (maquette validée 2026-07)
    g.fillStyle = "#8a8a92";
    g.beginPath(); g.moveTo(0, baseY - wallH + 2); g.lineTo(sz / 2, sz * 0.08); g.lineTo(sz, baseY - wallH + 2); g.fill();
    g.fillStyle = "#a4a4ae";
    g.beginPath(); g.moveTo(sz * 0.04, baseY - wallH); g.lineTo(sz / 2, sz * 0.12); g.lineTo(sz * 0.96, baseY - wallH); g.lineTo(sz * 0.9, baseY - wallH); g.lineTo(sz / 2, sz * 0.18); g.lineTo(sz * 0.1, baseY - wallH); g.fill();
    // Porte double, cadre blanc (signature "grange")
    const doorW = sz * 0.28, doorX = sz / 2 - doorW / 2, doorY = baseY - wallH * 0.86, doorH = wallH * 0.86;
    P(g, doorX - 2, doorY - 2, doorW + 4, doorH + 2, "#f0ead8");
    P(g, doorX, doorY, doorW / 2 - 1, doorH, "#7a5330");
    P(g, doorX + doorW / 2 + 1, doorY, doorW / 2 - 1, doorH, "#7a5330");
    // Croix blanches sur les deux vantaux + rail de coulissement
    // (maquette validée 2026-07).
    for (let i = 0; i < doorH; i++) {
      const t = Math.floor(i * (doorW / 2 - 3) / doorH);
      P(g, doorX + 1 + t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + Math.floor(doorW / 2) - 2 - t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + Math.floor(doorW / 2) + 2 + t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + doorW - 3 - t, doorY + i, 1, 1, "#f0ead8");
    }
    P(g, doorX - 3, doorY - 4, doorW + 6, 2, "#5a4028");
    // Grande ouverture ronde sous le pignon (silo à foin), palier 2 uniquement
    if (level >= 2) {
      g.fillStyle = "#f0ead8"; g.beginPath(); g.arc(sz / 2, baseY - wallH - sz * 0.03, sz * 0.09, 0, 7); g.fill();
      g.fillStyle = "#5a4530"; g.beginPath(); g.arc(sz / 2, baseY - wallH - sz * 0.03, sz * 0.065, 0, 7); g.fill();
    }
    return c;
  }

  // Palier 3 : dessin en coordonnées absolues (pas de mise à l'échelle d'un
  // "sz" unique comme les paliers 1/2) pour garder le plein contrôle sur les
  // proportions d'un bâtiment volontairement massif. Canevas de sortie
  // 85×115px (réduit de moitié depuis 170×230px — jugé "BEAUCOUP trop grand"
  // par Guillaume, voir SCALE dans barnSpriteBig), à comparer aux 96×96px de
  // la maison (house()) : la grange au palier 3 reste donc un peu plus
  // grande que la maison, mais plus l'énorme bâtiment d'avant. Budget
  // vertical (du haut vers le bas) : pointe de girouette → cupole → faîtage
  // principal → mur → fondations en pierre, tout aligné sur `baseY` (sol).
  function barnSpriteBig() {
    // Demande Guillaume : le palier 3 était "BEAUCOUP trop grand" à l'écran.
    // Le canevas final est réduit de moitié (85×115, contre 170×230
    // auparavant) via un g.scale(0.5) global : tout le tracé ci-dessous
    // continue de raisonner dans le système de coordonnées d'origine
    // (170×230) pour ne pas devoir recalculer chaque forme à la main, seul
    // le canevas de sortie (et donc la taille réellement dessinée sur la
    // carte par drawImage, voir FermeGame.js) est deux fois plus petit.
    const SCALE = 0.5;
    const W = 170, H = 230;
    const [c, g] = cv(W * SCALE, H * SCALE);
    g.scale(SCALE, SCALE);
    const baseY = 221;
    const cx = 75; // centre horizontal du corps principal (hors silo)

    // Fondations en pierre : ancrent visuellement le bâtiment au sol.
    P(g, 10, 213, 150, 8, "#8a8a92");
    for (let x = 14; x < 156; x += 10) P(g, x, 213, 1, 8, "#78787f");

    // Silo attenant, à taille réelle (pas un simple détail cosmétique).
    P(g, 132, 100, 28, 113, "#c8c8d0");
    for (let y = 106; y < 210; y += 8) P(g, 132, y, 28, 1, "#b6b6bd");
    g.fillStyle = "#a8a8b2"; g.beginPath(); g.ellipse(146, 100, 14, 7, 0, 0, 7); g.fill();
    P(g, 132, 150, 28, 3, "#9a9aa4");

    // Mur principal.
    P(g, 20, 123, 110, 90, "#a83c30");
    for (let y = 129; y < 213; y += 7) P(g, 20, y, 110, 1, "#8a3028");
    P(g, 20, 123, 110, 3, "#c04a3c");

    // Joints de planches sur le mur (restyle maquette validée 2026-07).
    for (let x = 25; x < 128; x += 6) P(g, x, 126, 1, 87, "#8a3028");
    // Toit à deux pans (faîtage principal) — gris ardoise (maquette 2026-07).
    g.fillStyle = "#8a8a92";
    g.beginPath(); g.moveTo(20, 123); g.lineTo(cx, 68); g.lineTo(130, 123); g.fill();
    g.fillStyle = "#a4a4ae";
    g.beginPath(); g.moveTo(28, 123); g.lineTo(cx, 78); g.lineTo(122, 123); g.fill();

    // Grande fenêtre ronde de fenil, dans le pignon.
    g.fillStyle = "#f0ead8"; g.beginPath(); g.arc(cx, 100, 14, 0, 7); g.fill();
    g.fillStyle = "#5a4530"; g.beginPath(); g.arc(cx, 100, 9, 0, 7); g.fill();

    // Cupole + girouette, au sommet du faîtage : c'est elle qui fait
    // dépasser la grange bien au-delà de la hauteur de la maison.
    P(g, 58, 42, 34, 26, "#f0ead8");
    P(g, 62, 48, 4, 20, "#c8c0ac"); P(g, 104, 48, 4, 20, "#c8c0ac"); // colombages
    g.fillStyle = "#a83c30";
    g.beginPath(); g.moveTo(53, 42); g.lineTo(cx, 25); g.lineTo(97, 42); g.fill();
    P(g, cx - 1, 12, 2, 13, "#5a4530");
    g.fillStyle = "#5a4530";
    g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx + 12, 16); g.lineTo(cx, 22); g.fill(); // girouette

    // Porte double, cadre blanc (signature "grange"), bien visible.
    P(g, 58, 163, 34, 44, "#f0ead8");
    P(g, 61, 166, 13, 38, "#7a5330");
    P(g, 76, 166, 13, 38, "#7a5330");
    // Croix blanches sur les deux vantaux (maquette validée 2026-07).
    for (let i = 0; i < 38; i++) {
      const t = Math.floor(i * 10 / 38);
      P(g, 62 + t, 166 + i, 1, 1, "#f0ead8"); P(g, 72 - t, 166 + i, 1, 1, "#f0ead8");
      P(g, 77 + t, 166 + i, 1, 1, "#f0ead8"); P(g, 87 - t, 166 + i, 1, 1, "#f0ead8");
    }

    return c;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ZIP 439 — LE MOBILIER DE RIVE : IL A ÉTÉ TRANSCRIT, PUIS LA TRANSCRIPTION A
     ÉTÉ JETÉE, ET C'EST LA LEÇON DU ZIP.
     ──────────────────────────────────────────────────────────────────────────
     ⚠️⚠️ QUATRE CENT CINQUANTE LIGNES DE `fillRect` ONT VÉCU ICI PENDANT UNE
     PASSE. Elles dessinaient, une par une, les quinze pièces de la planche de
     Guillaume : le pont en arc, la clôture, le muret, le banc de pierre, le
     lampadaire à suspensions… Chaque objet avait sa note, son piège, sa palette
     justifiée. Elles passaient tous les contrôles du banc. Verdict : « il y a
     toujours un écart […] c'est vraiment en dessous de mon niveau d'exigence ».

     Le défaut n'était pas dans un dessin, il était dans la MÉTHODE. Transcrire
     une image de trente couleurs en la regardant, c'est en produire une
     imitation — et une imitation ne converge pas vers son modèle : chaque passe
     corrige trois pixels et en manque trente. Le seul geste qui ferme l'écart
     est de copier les pixels.

     Tout ce bloc a donc été remplacé par `plancheSprite(...)`, qui rejoue les
     données de `planche.js` — les pixels de la planche eux-mêmes, ramenés à la
     résolution du jeu par `tools/import-planche.mjs`.
     ⚠️ ET ON N'EN GARDE AUCUNE COPIE « AU CAS OÙ ». Un dessin mort qu'aucun
     appel n'atteint est exactement ce que le 436 a nommé : il ne se dégrade
     pas, il VIEILLIT sur place, et il finit par revenir dans une revue comme
     s'il faisait autorité. Ce commentaire est ce qui reste, et il suffit.
     ══════════════════════════════════════════════════════════════════════════ */

  /* ---------------- Atlas ---------------- */
  const S = {
    grass: [grassTile(0), grassTile(1), grassTile(2)],
    // Zip 431 : l'herbe de Valley Town, même grain, palette assombrie (voir GRASS_TOWN).
    townGrass: [grassTile(0, GRASS_TOWN), grassTile(1, GRASS_TOWN), grassTile(2, GRASS_TOWN)],
    tilled: tilledTile(false),
    watered: tilledTile(true),
    water: [waterTile(0), waterTile(1)],
    sand: sandTile(),
    bridge: bridgeTile(),
    bridgeRuin: bridgeRuinTile(),
    bridgeStoneSprite: bridgeStoneTile(),
    grassPatch: grassTile(0), // icône outil Construction/aperçu pour l'herbe (chantier 2026-07), simple réutilisation d'une tuile d'herbe existante
    path: pathTile(),
    /* ZIP 434 — LES REVÊTEMENTS DE VALLEY TOWN. Un seul objet plutôt que six
       entrées à la racine : le rendu en a besoin ENSEMBLE (la surface et son
       rebord), et `sup` voyage avec eux — le jour où la période passe de 4 à 6,
       le rendu n'a rien à savoir. C'est le même raisonnement que `S.birds`. */
    townRoad: {
      sup: ROAD_SUP,
      kerbW: 4,
      asphalt: townAsphaltSurface(),
      cobble: townCobbleSurface(),
      brick: townBrickSurface(),
      // Bordure de pierre pour le goudron et les pavés, bordure de brique
      // debout (« soldier course ») pour l'allée du cimetière.
      kerb: { n: townKerbStrip("n", KERB_STONE), s: townKerbStrip("s", KERB_STONE), e: townKerbStrip("e", KERB_STONE), w: townKerbStrip("w", KERB_STONE) },
      kerbBrick: { n: townKerbStrip("n", KERB_BRICK), s: townKerbStrip("s", KERB_BRICK), e: townKerbStrip("e", KERB_BRICK), w: townKerbStrip("w", KERB_BRICK) },
      // ZIP 436 — le dallage des esplanades, dernier damier de 16 px de la ville.
      flag: townFlagSurface(),
      // ZIP 437 — le gravier des promenades de parc et de rive.
      gravel: townGravelSurface(),
      // ZIP 438 — l'herbe de la ville, même pavé de 64 px que les rues.
      grass: townGrassSurface(),
    },
    /* ZIP 437 — LES MASSIFS FLEURIS DU PARC ET LA PRAIRIE DES RIVES. Cinq
       espèces × quatre variantes : quatre suffisent parce que la case est
       choisie par hachage et qu'une cinquième ne se verrait pas — c'est le même
       compte que les variantes de berge (435). */
    /* ⚠️ HUIT VARIANTES ET PAS QUATRE. À quatre, un parterre de six cases sur
       trois répète deux fois chaque tuile, et les répétitions tombent côte à
       côte assez souvent pour dessiner des RANGS — un massif qui a l'air semé
       au cordeau, c'est-à-dire un champ. Huit suffisent : à cette densité, l'œil
       ne retrouve plus la période. */
    /* ZIP 439 — un PAVÉ de 64 px par espèce, plus huit tuiles de 16 (voir la
       note de `townBloomSurface`). `sup` voyage avec les images, comme pour
       `townRoad` : le jour où la période change, le rendu n'a rien à savoir. */
    townBloom: { sup: ROAD_SUP, surf: Array.from({ length: C.BL_KINDS }, (_, k) => townBloomSurface(k + 1)) },
    townShrub: [0, 1, 2].map(v => townShrubSprite(v)),
    townBoulder: [0, 1, 2].map(v => townBoulderSprite(v)),
    /* ══ ZIP 439 — LES SPRITES DE LA PLANCHE, TELS QUELS ══
       ⚠️ LES CLÉS N'ONT PAS CHANGÉ quand les dessins ont changé de source :
       `townArchBridge` désignait ma transcription, il désigne maintenant les
       pixels de la planche. C'est volontaire — le générateur, la boucle de
       rendu et les trois bancs les nomment déjà, et renommer aurait mêlé un
       changement de DESSIN à un changement d'INTERFACE. On ne mêle pas deux
       changements (décision du 424, appliquée au code plutôt qu'à l'image). */
    townArchBridge: plancheSprite("archBridge"),
    townFence: plancheSprite("fence"),
    townWoodBox: plancheSprite("woodBox"),
    townLowWall: plancheSprite("lowWall"),
    townStoneBlock: plancheSprite("stoneBlock"),
    townStoneBench: plancheSprite("benchStone"),
    townBenchWall: plancheSprite("benchWall"),
    townHangLamp: plancheSprite("hangLamp"),
    townStepStones: plancheSprite("stones"),
    townChest: plancheSprite("chest"),
    townBucket: plancheSprite("bucket"),
    townRod: plancheSprite("rod"),
    townPotReeds: plancheSprite("potReeds"),
    townFlowerTrough: plancheSprite("flowerTrough"),
    townBonsai: plancheSprite("bonsai"),
    townRoseBox: plancheSprite("roseBox"),
    townPotPink: plancheSprite("potPink"),
    townOilLamp: plancheSprite("oilLamp"),
    /* La table et ses deux tabourets sont UN SEUL sprite sur la planche, et on
       les garde ainsi : les séparer demanderait de réinventer leur écartement,
       c'est-à-dire de régler à la main une position que le dessin donne déjà
       (le piège de symétrie du 432). */
    townTable: plancheSprite("tableSet"),
    townGoldBush: ["goldBush1", "goldBush2", "goldBush3"].map(plancheSprite),
    townLavender: ["lavender1", "lavender2"].map(plancheSprite),
    townFlowerClump: ["flowersPurple", "flowersWhite", "flowersRed", "flowersYellow"].map(plancheSprite),
    townLilyPads: ["lilyPads", "lilyPads2", "lilyPadBloom", "lilyFlower"].map(plancheSprite),
    townReedTuft: plancheSprite("reeds"),
    townReedsWater: plancheSprite("reedsWater"),
    townHedgeRow: plancheSprite("hedgeRow"),
    /* ⚠️⚠️ ZIP 447 — LE GARDE-CORPS, ET IL FAIT EXACTEMENT UNE CASE DE LARGE.
       Ce n'est pas une chance : `balusterEnd` est le tronçon court que Guillaume
       a dessiné accroché à son escalier, et il mesure 16 px natifs une fois la
       planche ramenée à l'échelle du jeu. Il se répète donc case par case sans
       une ligne de raccord, comme la haie du 439 — et son motif porte DÉJÀ ses
       pilastres (deux jours de balustre, puis six pixels pleins), si bien que
       mis bout à bout il dessine des travées régulières au lieu d'une grille.
       ⚠️ IL EST HAUT DE 25 PX POUR UNE CASE DE 16 : les 9 px qui dépassent sont
       ce qui le fait passer DEVANT ou DERRIÈRE le fermier selon la rangée, et
       c'est pour ça qu'il est posé dans la file triée (`pushE`) et jamais dans
       la passe de sol. */
    townRail: planche2Sprite("balusterEnd"),
    townRailY: townRailNorthSouthSprite(),
    /* ⚠️ ZIP 447 — la végétation de la seconde planche. Elle sert à HABILLER un
       dénivelé : au pied d'un mur de soutènement, un massif casse la ligne
       droite et donne une échelle. Sans elle, une falaise de 48 px rencontre
       l'herbe sur un trait net, et un trait net se lit comme un collage. */
    townBloomBed: [planche2Sprite("flowerBedL"), planche2Sprite("flowerBedR")],
    townBloomRow: planche2Sprite("flowerRow"),
    townRockBed: planche2Sprite("rockBed"),
    townHedgeAngle: planche2Sprite("hedgeCorner"),
    townHedgeBush: plancheSprite("hedgeBush"),
    townGrassTuft: plancheSprite("grassTuft"),
    townGrassPatch: plancheSprite("grassPatch"),
    townDeck: plancheSprite("deckPlank"),
    townPuddle: plancheSprite("puddle"),
    townFlatStone: plancheSprite("flatStone"),
    /* ⚠️⚠️ ZIP 439 — LA HAIE DE LA PLANCHE, EN TUILES. Trois dessins : le
       tronçon, le bout, et la haie ISOLÉE (qui est un buisson, pas un bout de
       haie — c'est ce que montre la planche, et c'est ce que le 429 avait déjà
       compris en arrondissant les haies seules).
       ⚠️ LE BOUT EST DESSINÉ POUR L'OUEST ET MIROITÉ POUR L'EST, par le même
       `flipH` que les personnages. Deux dessins séparés auraient divergé au
       premier retouchage — c'est le paramètre qui double un paramètre du §8,
       appliqué à une symétrie. */
    townHedge: (() => {
      const mid = plancheSprite("hedgeMid"), end = plancheSprite("hedgeEnd");
      const endE = cv(end.width, end.height);
      endE[1].drawImage(end, 0, 0);
      flipH(endE[1], end.width, end.height);
      return { mid, w: end, e: endE[0], solo: plancheSprite("hedgeSolo") };
    })(),
    /* ZIP 436 — LA PIERRE DE LA HAUTE-VILLE : marches, parement de falaise,
       limons. Même forme que `townRoad` (un objet, sa période voyage avec) et
       même raison d'être ici plutôt que dans la boucle de rendu — voir la note
       au-dessus de `townStairSurface`. */
    townStone: {
      sup: ROAD_SUP,
      cliffH: CLIFF_H,
      stair: { v: townStairSurface(true), h: townStairSurface(false) },
      cliff: townCliffFace(),
      cheek: townStairCheek(),
    },
    /* ZIP 435 — L'EAU ET SA BERGE. Un seul objet, comme `townRoad` : le rendu
       en a besoin ENSEMBLE, et `depths` voyage avec les tuiles — le jour où la
       rampe passe de six à huit crans, le rendu n'a rien à savoir. */
    townWater: {
      depths: WAT_DEPTH,
      // [configuration des 4 coins][variante][cran de profondeur]
      tiles: Array.from({ length: WAT_CFG }, (_, cfg) =>
        Array.from({ length: WAT_VAR }, (_, vr) =>
          Array.from({ length: WAT_DEPTH }, (_, d) => townWaterTile(cfg, vr, d)))),
      // [bande 1 mouillée · 2 sèche · 3 immergée][une des 8 directions][variante]
      shore: Array.from({ length: 3 }, (_, b) =>
        Array.from({ length: 8 }, (_, dir) =>
          Array.from({ length: 2 }, (_, vr) => townShoreTile(b + 1, dir, vr)))),
      // ZIP 436 — le tramage de profondeur : [O·E·N·S][cran]. 32 tuiles, et
      // c'est ce qui remplace la mosaïque de carrés bleus du 435.
      fade: Array.from({ length: 4 }, (_, dir) =>
        Array.from({ length: WAT_DEPTH }, (_, d) => townWaterFadeTile(dir, d))),
      // ZIP 436 — ce qui flotte et ce qui émerge.
      lily: Array.from({ length: WAT_DECOR_N }, (_, vr) => townLilyTile(vr)),
      wrock: Array.from({ length: WAT_DECOR_N }, (_, vr) => townWaterRockTile(vr)),
      reed: Array.from({ length: WAT_DECOR_N }, (_, vr) => townReedTile(vr)),
    },
    oak: oakTree(),
    pine: pineTree(),
    /* ZIP 437 — les onze essences de Valley Town, en trois saisons. ⚠️ ELLES NE
       REMPLACENT PAS `oak`/`pine` : la FERME et la carte maléfique continuent
       de les employer, et ce zip ne touche pas à la ferme (décision du 424 :
       ne pas mêler deux changements visuels dans la même livraison). */
    /* ⚠️ TROIS IMAGES PAR ESSENCE ET PAR SAISON : c'est l'animation de vent
       (§ note du moule). 11 × 3 × 3 = 99 canevas de 48×64, cuits une fois au
       chargement comme tout le reste de ce fichier — le rendu ne fait qu'un
       `drawImage` par arbre et par image, exactement comme avant. */
    /* ⚠️ L'ORDRE DE CE TABLEAU EST CELUI DE `TT`, et les quatre essences de la
       planche sont CONCATÉNÉES à la fin — voir la note de `TT`. Elles ont le
       même gabarit, le même ancrage et le même nombre d'images que les onze
       autres : `drawTownTree` ne fait aucune distinction, et c'est le point. */
    townTrees: [
      ...TREE_SPECS.map(sp => ({
        w: TW_, h: TH_, base: TBASE_,
        summer: [-1, 0, 1].map(f => townTreeSprite(sp, "summer", f)),
        spring: [-1, 0, 1].map(f => townTreeSprite(sp, "spring", f)),
        autumn: [-1, 0, 1].map(f => townTreeSprite(sp, "autumn", f)),
      })),
      ...[["treeFir", 1], ["treeApple", 0], ["treeWillow", 0], ["treeMagnolia", 0]].map(([nm, ev]) => ({
        w: TW_, h: TH_, base: TBASE_,
        summer: [-1, 0, 1].map(f => plancheTree(nm, "summer", f, ev)),
        spring: [-1, 0, 1].map(f => plancheTree(nm, "spring", f, ev)),
        autumn: [-1, 0, 1].map(f => plancheTree(nm, "autumn", f, ev)),
      })),
    ],
    deadTree: deadTree(),
    stump: stump(),
    rock: rock(),
house: house(),
    houses: [house(), houseLvl2(), houseLvl3()], // maison à niveaux (maquettes validées 2026-07)
    shop: shopStand(),
    bin: sellBin(),
    crops: [],
    chars: {},
    icons: {},
    gemIcons: [],
    fishIcons: [],
    horse: horseSprite(0),
    horseRun: [horseSprite(0), horseSprite(1), horseSprite(2), horseSprite(3)], // cycle de galop (chantier 2026-07)
    horseWhite: horseSprite(0, "white"), // zip 258 : monture d'Eduardo (arrivée au village)
    horseWhiteRun: [horseSprite(0, "white"), horseSprite(1, "white"), horseSprite(2, "white"), horseSprite(3, "white")], // zip 264 : cycle de galop blanc — Eduardo chevauche EXACTEMENT comme le fermier (même modèle assis), seule la robe change
    wolf: [wolfSprite(0), wolfSprite(1), wolfSprite(2), wolfSprite(3)],
    // Zip 235: winter swap. Same 4 frames, same anim, different pelt.
    snowLeopard: [snowLeopardSprite(0), snowLeopardSprite(1), snowLeopardSprite(2), snowLeopardSprite(3)],
    berryBush: berryBushSprite(),
    /* ZIP 398 — les fruits, les barquettes et les vergers. Tous indexés par
       IDENTIFIANT (et non par position dans un tableau) : ajouter un fruit un
       jour ne doit pas décaler les autres. */
    fruits: Object.fromEntries(C.FRUITS.map(f => [f.id, fruitSprite(f.id)])),
    punnets: Object.fromEntries(C.FRUITS.map(f => [f.id, punnetSprite(f.id)])),
    orchards: C.ORCHARDS.map((_, k) => Array.from({ length: C.ORCHARD_STAGES }, (__, st) => orchardSprite(k, st))),
    /* ⚠️ 425 : `townhall` DEVIENT `church`, ET C'EST LA SEULE CHOSE QUI CHANGE.
       Le dessin n'a pas bougé d'un pixel — demande de Guillaume : « garder
       l'actuel townhall et le renommer église ». On ne garde PAS l'ancienne
       clé en alias : elle désignerait le bâtiment que la ville n'appelle plus
       ainsi, à trois lignes d'un `townHall2` qui est, lui, la vraie mairie. Un
       registre où `townhall` n'est pas la mairie est un piège posé pour plus
       tard. La fonction, elle, garde son nom historique : c'est la trace du
       zip 235, et elle n'est appelée qu'ici. */
    church: townhallSprite(),
    courthouse: courthouseSprite(),    // 425 : le tribunal néoclassique
    townHall2: townHall2Sprite(),      // 425 : le NOUVEL hôtel de ville (brique + beffroi)
    plazaLamp: plazaLampSprite(),      // 425 : mobilier de la place
    /* ⚠️⚠️ ZIP 439 — LE BANC DE BOIS EST CELUI DE LA PLANCHE, ET IL A COÛTÉ UNE
       PLACE ASSISE. Le banc du 429 faisait 52 px pour porter trois occupants
       (« on doit pouvoir s'asseoir à deux, ou trois sur le même banc ») ; celui
       de la planche en fait 36. Garder les deux aurait mis DEUX bancs de bois
       différents dans la même ville — la « rupture » que Guillaume dit ne pas
       vouloir — et garder trois places sur 36 px fait déborder les occupants de
       part et d'autre, ce que le 429 avait justement corrigé.
       `TOWN_SEATS_PER_BENCH` passe donc à 2, et sa note dit pourquoi. C'est le
       seul endroit du zip où la fidélité au dessin coûte quelque chose au jeu ;
       c'est assumé, et c'est arbitré dans le sens que Guillaume a demandé trois
       fois. */
    plazaBench: plancheSprite("benchWood"),
    plazaTopiary: plazaTopiarySprite(),
    plazaMonument: plazaMonumentSprite(),
    plazaFountain: plazaFountainSprite(),
    fountainGeo: FOUNTAIN_GEO,        // zip 429 : lue par drawTownFrame pour l'eau et le jet
    /* Zip 426 — le mobilier de l'agrandissement. ⚠️ Les étals sont un TABLEAU
       (quatre bâches) et non quatre clés : le rendu choisit par hachage de la
       position, ce qui restait impossible avec des noms distincts. */
    /* ⚠️ ZIP 431 — LA LONGUEUR VIENT DE LA TABLE DES MÉTIERS, elle n'est plus
       écrite en dur. Le `[0,1,2,3]` du 426 était déjà le doublon d'un `% 4`
       recopié dans le rendu ET dans le générateur : ajouter un sixième métier
       aurait demandé de le corriger à trois endroits, et l'oubli d'un seul aurait
       donné un étal manquant (donc invisible) sur une case pourtant solide —
       le mur invisible du 425, en négatif. */
    townStalls: STALL_TRADES.map((_, i) => townStallSprite(i)),
    townMarketArch: townMarketArchSprite(),   // zip 431
    townFlowerCart: townFlowerCartSprite(),   // zip 431
    townBarrel: townBarrelSprite(),           // zip 431
    townSacks: townSackPileSprite(),          // zip 431
    townKiosk: townKioskSprite(),
    townGrave: townGraveSprite(),
    townPlanter: townPlanterSprite(),
    townStreetSign: townStreetSignSprite(),
    townStatue: townStatueSprite(),
    townWell: townWellSprite(),
    townCrate: crateSprite(),
    /* Zip 427 — les deux commerces de la Haute-Ville + le tableau des nouvelles
       de la place. Le tableau est le seul décor de ce zip qui porte une
       MÉCANIQUE (il se lit à la touche E) ; il est donc dans `props`, comme les
       bancs, et pas dessiné à part — un décor et sa collision au même endroit. */
    townBoutique: townBoutiqueSprite(),
    townSalon: townSalonSprite(),
    townNewsBoard: townNewsBoardSprite(),
    /* Zip 426 — l'intérieur du tribunal, indexé par `kind` (jamais par
       position dans un tableau : ajouter un meuble ne doit rien décaler). */
    courtProps: Object.fromEntries(COURT_PROP_KINDS.map(k => [k, courtPropSprite(k)])),
    /* ⚠️ ZIP 444 — LA QUÊTE DE L'ÉTOILE. Quatre poses × trois états pour la
       compagne (la respiration et l'humeur), quatre éclats (une couleur par
       note), quatre décors de la verrerie, trois poses de pie. Le cratère, le
       SILLON (454) et le navire ne sont PAS ici : ce sont des fonctions, parce
       qu'ils se peignent sur un fond déjà là (voir leur note). */
    starWisp: Array.from({ length: 3 }, (_, st) => Array.from({ length: 4 }, (_, po) => starWispSprite(po, st, "yellow"))),
    starWispColors: Object.fromEntries(["yellow", "blue", "rose"].map(color => [color,
      Array.from({ length: 3 }, (_, st) => Array.from({ length: 4 }, (_, po) => starWispSprite(po, st, color))) ])),
    starWispQueen: Array.from({ length: 3 }, (_, st) => Array.from({ length: 4 }, (_, po) => starWispSprite(po, st, "yellow", true))),
    starShard: Array.from({ length: 4 }, (_, n) => starShardSprite(n)),
    /* ⚠️ ZIP 454 — LE SILLON N'EST PLUS UN SPRITE, C'EST UNE FONCTION, exactement
       comme le cratère et pour la même raison : il se peint sur un fond déjà là et
       il porte un CHAMP que les pieds lisent aussi (`starFurrowSink`). Les deux
       canevas cuits d'avant sont partis avec lui. */
    drawStarFurrow,
    drawStarFurrowAir,
    starFurrowSink,
    starKiln: starKilnSprite(),
    starRack: starRackSprite(),
    starShutter: starShutterSprite(),
    starNestTree: starNestTreeSprite(),
    magpie: [magpieSprite(0), magpieSprite(1), magpieSprite(2)],
    drawStarCrater,
    drawStarCraterAir,
    drawStarDust,
    drawStarShip,          // 450 — le navire des étoiles, sur la grève du lac
    drawStarPlan,          // 454 — la feuille de plan de Kerguélen
    starCraterSink,
    drawStarComet,          // zip 448 — la comète, sa queue, sa traînée et son impact
    drawStarFragmentMeteor, // 462 — petit caillou incandescent des impacts de ferme
    drawStarFragmentImpact, // 463 — choc physique terre/éjectas/poussière des petits fragments
    drawStarCometTrail,
    drawStarImpactFlash,
    drawEmoteBubble,        // zip 455 — le « ! » des PNJ : tampon d'annonce et impact
    drawCalmMeter,          // zip 456 — la tenue du cratère, la seule réponse à « est-ce que je fais bien ? »
    drawWorkBubble,         // zip 459 — Tristan à l'ouvrage : la scie va et vient, le trait s'enfonce
    townHouses: Array.from({ length: C.TOWN_HOUSE_STYLES }, (_, i) => townHouseVariant(i)),
    rabbit: [rabbitSprite(0), rabbitSprite(1), rabbitSprite(2)],
    torch: torchSprite(),
    stool: stoolSprite(),
    gregSeated: gregSeatedSprite(),
    fishingRodHeld: fishingRodHeldSprite(),
    well: well(),
    fence: fenceTile(),
    fenceV: fenceTileV(),
    fenceCorner: fenceTileCorner(),
    fencePost: fenceTilePost(),
    wall: wallTile(),
    lamp: lampSprite(),
    scarecrow: scarecrowSprite(),
    leverOpen: leverSprite(true),
    leverClosed: leverSprite(false),
    mill: millSprite(),
    sucrerie: sucrerieSprite(),
    cauldron: cauldronSprite(),
    candyMonster: candyMonsterSprite(),   // zip 385
    candyTrees: [candyTreeSprite(0), candyTreeSprite(1)],           // zip 386
    unicorn: [unicornSprite(0), unicornSprite(1)],                  // zip 386
    seaIcons: [],
    duck: [duckSprite(0), duckSprite(1)],
    railL: railHalf(0), railR: railHalf(1), // one wide track (zip 232)
    platform: platformTile(),
    station: stationSprite(),
    signBoard: signBoardSprite(),
    train: trainSprite(),
    barn: [barnSprite(1), barnSprite(2), barnSprite(3)],
    animals: [],
    products: [],
  };
  for (let t = 0; t < C.CROPS.length; t++) {
    S.crops[t] = [];
    for (let s = 0; s < C.CROP_STAGES; s++) S.crops[t][s] = cropSprite(t, s);
  }
  for (const k of ["hoe", "can", "axe", "pick", "seeds", "wood", "stone", "food", "gold", "energy", "rod", "ready", "thirst", "herd", "hand", "flour", "sugar", "bag", "check", "cross", "coin2", "speech", "swap", "bell", "ban", "release"]) S.icons[k] = icon(k);
  // Zip 251: sprites des décorations déployables (cadeaux). Dessinés sur ~28px
  // de haut, ancrés par le bas au rendu (comme les petites structures).
  S.decor = {}; for (const d of C.UNIQUE_DECORATIONS) S.decor[d.id] = decorSprite(d.id);
  // Zip 252 : bâtiments d'ateliers + icônes de produits artisanaux.
  // Chantier "sucrerie déplaçable" (2026-07) : la sucrerie a rejoint cette
  // liste (voir C.ARTISAN_BUILDINGS.sucrerie) — réutilise le canvas pixel-
  // exact déjà calculé ci-dessus (S.sucrerie), pas besoin de le regénérer.
  // BUG corrigé (Guillaume : "le bâtiment est effacé visuellement mais
  // Jérôme tourne, et le dépôt de canne marche encore") : cette entrée avait
  // été oubliée lors du branchement sur le pipeline générique — la donnée
  // (crafts.sucrerie), la collision et le clic de dépôt ne dépendent QUE de
  // C.ARTISAN_BUILDINGS/crafts et fonctionnaient déjà, mais le rendu
  // (FermeGame.js) lit sprites.artisan.sucrerie et l'ignorait silencieusement
  // (bimg undefined -> tuile jamais dessinée) faute de cette clé.
  S.artisan = { beehive: artisanBuildingSprite("beehive"), fromagerie: artisanBuildingSprite("fromagerie"), bakery: artisanBuildingSprite("bakery"), sawmill: artisanBuildingSprite("sawmill"), sucrerie: S.sucrerie };
  // Zip suivant : l'établi de l'apiculteur, en trois calques (voir beeTableSprite).
  S.beeTable = { table: beeTableSprite("table"), smoker: beeTableSprite("smoker"), honey: beeTableSprite("honey") };
  S.beeLavender = beeLavenderSprite();   // le pot de lavande, à droite de la ruche
  // Le taxi de Valley Town : trois directions, l'ouest est l'est retourné au rendu.
  /* Huit directions, cinq dessins : l'ouest, le nord-ouest et le sud-ouest sont
     les miroirs de leurs symétriques (voir taxiQuarterSprite). */
  S.taxi = { e: taxiSprite("e"), s: taxiSprite("s"), n: taxiSprite("n"),
             ne: taxiQuarterSprite(false), se: taxiQuarterSprite(true) };
  /* Les pigeons et les colombes de la place (433). Même contrat que le taxi :
     on dessine le profil DROIT, le rendu retourne pour la gauche. */
  S.birds = {};
  for (const kind of ["pigeon", "dove"]) {
    S.birds[kind] = {
      stand: birdGroundSprite(kind, "stand"),
      peck: birdGroundSprite(kind, "peck"),
      walk: birdGroundSprite(kind, "walk"),
      puff: birdGroundSprite(kind, "puff"),
      alert: birdGroundSprite(kind, "alert"),
      down: birdFlySprite(kind, "down"),
      mid: birdFlySprite(kind, "mid"),
      up: birdFlySprite(kind, "up"),
      glide: birdFlySprite(kind, "glide"),
    };
  }
  S.craftIcons = { honey: craftIcon("honey"), cheeseWheel: craftIcon("cheeseWheel"), cheesePortion: craftIcon("cheesePortion"), eclairChoco: craftIcon("eclairChoco"), eclairVanilla: craftIcon("eclairVanilla"), flanVanilla: craftIcon("flanVanilla"), gateauBasque: craftIcon("gateauBasque"), butter: craftIcon("butter"), bread: craftIcon("bread"), croissant: craftIcon("croissant"), chocolatine: craftIcon("chocolatine"), painSuisse: craftIcon("painSuisse"), yogurtNature: craftIcon("yogurtNature"), yogurtVanilla: craftIcon("yogurtVanilla") };
  // Zip 236: one sprite per pet id in the catalog (individual pets).
  // Zip 388 : DEUX entrées, et c'est délibéré.
  //   S.petFrames[pid][dir][frame] = la planche animée, lue par drawPetsFor ;
  //   S.pets[pid]                  = le profil droit au repos, exactement le
  //                                  sprite d'avant ce zip.
  // Garder S.pets sous cette forme évite de toucher aux TROIS endroits de
  // l'interface qui l'affichent déjà comme une simple image (sac, carte de
  // familier, proposition de cadeau). Une planche imposée partout aurait
  // demandé de reprendre chacun d'eux, sans rien apporter : dans un panneau,
  // un familier est un portrait, pas une animation.
  S.petFrames = {}; S.pets = {};
  for (const pid of Object.keys(C.PET_CATALOG)) {
    S.petFrames[pid] = Array.from({ length: C.PET_DIRS }, (_, d) =>
      Array.from({ length: C.PET_FRAMES }, (_, f) => petSprite(pid, d, f)));
    S.pets[pid] = S.petFrames[pid][3][0];
  }
  // Zip 388 : bulles affichées au-dessus d'un familier qui joue.
  S.petEmotes = {}; for (const k of ["heart", "note", "spark", "excl", "zzz"]) S.petEmotes[k] = petEmoteSprite(k);
  S.gemIcons = C.GEMS.map(gm => gemIcon(gm.color));
  S.fishIcons = C.FISH.map(fs => fishIcon(fs.color));
  S.seaIcons = C.SEA_CREATURES.map((sc, i) => seaIcon(i, sc.color));
  // zip 255 : 4 frames de marche par animal (au lieu d'un sprite unique),
  // même structure que sprites.wolf/sprites.rabbit.
  // Zip 369 : un tableau par ROBE, et 8 frames au lieu de 4 (les 4 dernières
  // sont les poses de tête basse du broutage). Au total une cinquantaine de
  // canevas de moins de 30x24 px, tous construits une seule fois au
  // chargement — les deux passes getImageData (lumière, contour) ne tournent
  // donc jamais pendant une frame de jeu.
  S.animals = C.ANIMALS.map(a => (C.ANIMAL_SKINS[a.id] || [null]).map((sk, si) =>
    Array.from({ length: C.ANIMAL_FRAMES }, (_, f) => animalSprite(a.id, si, f))));
  S.products = C.ANIMALS.map(a => productIcon(a.id));
  // Zip 235: seasonal foliage variants (autumn = orange leaves,
  // spring = pink blooms). Same size as base sprites, drawn via seasonal
  // tint. FermeGame picks them based on seasonOf().
  S.oakAutumn = autumnTree(S.oak); S.pineAutumn = autumnTree(S.pine);
  S.oakSpring = springTree(S.oak); S.pineSpring = springTree(S.pine);
  // Zip 302 (demande Guillaume, maquette validée) : montgolfière — sprite
  // pixel-art HAUTE DÉFINITION généré une seule fois ici (comme tous les
  // autres sprites de ce fichier), au lieu d'être redessiné en primitives
  // canvas à CHAQUE frame dans FermeGame.js (trop coûteux pour ce niveau de
  // détail : ombrage par pixel façon sphère + tressage d'osier + cordages
  // torsadés). FermeGame.js se contente de `drawImage` ce canvas, à la bonne
  // échelle/rotation, à chaque frame — aussi léger que les autres sprites.
  // `anchorX/anchorY` = point de repère (haut du panier, centré en x) que
  // FermeGame.js aligne sur le monde ; `flameX/flameY` = position LOCALE du
  // brûleur (même repère) pour percer le voile de nuit au bon endroit.
  S.balloon = balloonSprite();
  S.getChar = (gender, outfit, overalls, cap, beeSuit, plaid, cheeseHat, sugarWorker, look) => {
    const key = gender + ":" + outfit + (overalls ? ":overalls" : "") + (cap ? ":cap" : "") + (beeSuit ? ":beeSuit" : "") + (plaid ? ":plaid" : "") + (cheeseHat ? ":cheeseHat" : "") + (sugarWorker ? ":sugarWorker" : "") + (look ? ":" + look : "");
    if (!S.chars[key]) S.chars[key] = charSheet(gender, outfit, !!overalls, !!cap, !!beeSuit, !!plaid, !!cheeseHat, !!sugarWorker, look || null);
    return S.chars[key];
  };
  return S;
}
