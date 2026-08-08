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
    for (let i = 0; i < 8; i++) {
      const cx = 18 + i * 22;
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
    for (let x = 12; x < W - 12; x += 6) P(g, x, 52, 3, 3, STONE_D);
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
     ZIP 425 — LE NOUVEL HÔTEL DE VILLE DE VALLEY TOWN.
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
     ══════════════════════════════════════════════════════════════════════════ */
  function townHall2Sprite() {
    const W = 160, H = 144;
    const [c, g] = cv(W, H);
    const BRICK = "#a8503c", BRICK_D = "#7e3728", BRICK_L = "#c26a52";
    const STONE = "#e2dccb", STONE_D = "#bfb8a4";
    const ROOF = "#4a5a70", ROOF_D = "#33415a", ROOF_L = "#66788f";

    // Soubassement de pierre + trois marches devant l'entrée.
    P(g, 4, H - 12, W - 8, 12, STONE_D); P(g, 4, H - 12, W - 8, 2, STONE);
    for (let s = 0; s < 3; s++) P(g, 58 - s * 3, H - 6 + s * 2, 44 + s * 6, 2, s % 2 ? STONE : STONE_D);

    // ---- Corps principal (droite), deux niveaux de brique.
    P(g, 52, 44, W - 58, H - 56, BRICK);
    for (let y = 46; y < H - 12; y += 4) P(g, 52, y, W - 58, 1, BRICK_D);       // assises
    P(g, 52, 44, 2, H - 56, BRICK_L);
    // Chaînages d'angle en pierre : c'est ce qui fait « bâtiment public » et
    // pas « grange en brique ».
    for (let y = 44; y < H - 12; y += 8) { P(g, 52, y, 6, 4, STONE); P(g, W - 12, y, 6, 4, STONE); }
    // Bandeau de pierre entre les deux étages.
    P(g, 52, 76, W - 58, 4, STONE); P(g, 52, 76, W - 58, 1, "#f2eddd");
    // Fenêtres cintrées, deux rangées de trois.
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const wx = 64 + i * 26, wy = 54 + r * 32;
      P(g, wx - 2, wy - 2, 16, 22, STONE);
      P(g, wx, wy, 12, 18, "#3d5c78");
      P(g, wx, wy, 12, 3, "#7fa8c8");
      P(g, wx + 5, wy, 2, 18, STONE_D); P(g, wx, wy + 8, 12, 1, STONE_D);
      g.fillStyle = STONE; g.beginPath(); g.arc(wx + 6, wy, 8, Math.PI, 2 * Math.PI); g.fill();
      g.fillStyle = "#3d5c78"; g.beginPath(); g.arc(wx + 6, wy, 6, Math.PI, 2 * Math.PI); g.fill();
    }
    // Toit d'ardoise à deux pentes, débordant.
    g.fillStyle = ROOF;
    g.beginPath(); g.moveTo(46, 46); g.lineTo(106, 22); g.lineTo(W - 2, 46); g.fill();
    g.fillStyle = ROOF_L;
    g.beginPath(); g.moveTo(46, 46); g.lineTo(106, 22); g.lineTo(106, 27); g.lineTo(54, 46); g.fill();
    P(g, 46, 44, W - 48, 4, ROOF_D);

    // ---- LE BEFFROI (gauche), plus haut que tout le reste.
    P(g, 8, 26, 40, H - 38, BRICK);
    for (let y = 28; y < H - 12; y += 4) P(g, 8, y, 40, 1, BRICK_D);
    P(g, 8, 26, 3, H - 38, BRICK_L);
    for (let y = 26; y < H - 12; y += 8) { P(g, 8, y, 5, 4, STONE); P(g, 43, y, 5, 4, STONE); }
    // Porche du beffroi : c'est l'entrée de la mairie.
    P(g, 18, 96, 20, H - 108, "#5a3a26"); P(g, 27, 96, 2, H - 108, "#3c2618");
    g.fillStyle = "#5a3a26"; g.beginPath(); g.arc(28, 96, 10, Math.PI, 2 * Math.PI); g.fill();
    P(g, 15, 84, 26, 4, STONE); P(g, 15, 84, 26, 1, "#f2eddd");
    // Horloge.
    P(g, 14, 40, 28, 28, STONE); P(g, 14, 40, 28, 2, "#f2eddd");
    g.fillStyle = "#2e2a24"; g.beginPath(); g.arc(28, 54, 11, 0, 7); g.fill();
    g.fillStyle = "#f6f2e4"; g.beginPath(); g.arc(28, 54, 9, 0, 7); g.fill();
    P(g, 27, 47, 2, 8, "#2e2a24"); P(g, 28, 53, 7, 2, "#2e2a24");
    for (const [hx, hy] of [[28, 46], [28, 62], [20, 54], [36, 54]]) P(g, hx, hy, 1, 1, "#2e2a24");
    // Couronnement : corniche, toit pyramidal, girouette.
    P(g, 4, 22, 48, 6, STONE); P(g, 4, 22, 48, 1, "#f2eddd");
    g.fillStyle = ROOF;
    g.beginPath(); g.moveTo(2, 23); g.lineTo(28, 2); g.lineTo(54, 23); g.fill();
    g.fillStyle = ROOF_L;
    g.beginPath(); g.moveTo(2, 23); g.lineTo(28, 2); g.lineTo(28, 7); g.fill();
    P(g, 27, 0, 2, 4, "#8a8a94");
    P(g, 29, 0, 7, 3, "#d8b45a");   // girouette dorée : le point le plus haut de la ville basse
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
  function townStallSprite(variant) {
    const W = 44, H = 54;
    const [c, g] = cv(W, H);
    const AWNS = [["#c8503c", "#e0705c"], ["#3c76c8", "#5c96e0"], ["#c8a83c", "#e0c85c"], ["#3ca86a", "#5cc88a"]];
    const [AW, AW_L] = AWNS[variant % AWNS.length];
    const W1 = "#8a6038", W2 = "#a8794a", W3 = "#6a4726";
    const TOP = H - 26;                       // le plateau : hauteur de hanche
    P(g, 4, TOP, W - 8, 3, W3);                                       // plateau
    for (let i = 0; i < 6; i++) P(g, 4, TOP + 3 + i * 3, W - 8, 2, i % 2 ? W1 : W2); // jupe
    P(g, 4, TOP, W - 8, 1, "#c08f5e");                                // nez éclairé
    P(g, 5, 10, 2, TOP - 9, W3); P(g, W - 7, 10, 2, TOP - 9, W3);     // montants, bien plus hauts
    // La bâche : rayée, débordante, avec un lambrequin festonné. C'est le
    // débord qui fait l'ombre, donc le volume.
    const bays = 8, bw = (W - 2) / bays;
    for (let i = 0; i < bays; i++) P(g, 1 + i * bw, 4, bw + 1, 7, i % 2 ? AW : AW_L);
    P(g, 1, 4, W - 2, 1, "#f2e6d2");
    for (let i = 0; i < bays; i++) {
      g.fillStyle = i % 2 ? AW : AW_L;
      g.beginPath(); g.moveTo(1 + i * bw, 11); g.lineTo(1 + (i + 1) * bw, 11); g.lineTo(1 + (i + 0.5) * bw, 15); g.fill();
    }
    // La marchandise : quatre cageots de couleurs, posés sur le plateau.
    for (let i = 0; i < 4; i++) {
      const bx = 6 + i * 8;
      P(g, bx, TOP - 5, 7, 5, "#8a6a42"); P(g, bx, TOP - 5, 7, 1, "#a88a5e");
      P(g, bx + 1, TOP - 8, 5, 3, ["#d05a4a", "#6ab84a", "#e0b03c", "#c86ad0"][i]);
    }
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
  ];
  function courtPropSprite(kind) {
    const W1 = "#7a5232", W2 = "#9c6b42", W3 = "#5a3b26", W4 = "#b98a58";  // bois : mat, clair, ombre, éclairé
    const S = "#c2beb2", SL = "#e0dcd0", SD = "#96928a";                    // pierre
    const IR = "#3c3c44", BR = "#a8863c", GR = "#2f6b34";                   // fonte, bronze, feuillage
    const CL = "#8a2f38";                                                    // le drap rouge des sièges
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
      case "pew": {
        const [c, g] = cv(16, 22);
        P(g, 0, 12, 16, 5, W2); P(g, 0, 12, 16, 1, W4);
        P(g, 0, 4, 16, 8, W1); P(g, 0, 4, 16, 1, W4);
        P(g, 1, 17, 2, 4, W3); P(g, 13, 17, 2, 4, W3);
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
      default: {
        const [c, g] = cv(16, 16);
        P(g, 2, 2, 12, 12, "#c83c9c");   // rose criard : un `kind` inconnu doit SE VOIR
        return c;
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

  function grassTile(variant) {
    const [c, g] = cv(T, T), r = makeRnd(77 + variant * 131);
    P(g, 0, 0, T, T, "#59a84a");
    for (let i = 0; i < 26; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#4f9a41" : "#63b653");
    for (let i = 0; i < 5; i++) { const x = (r() * 14) | 0, y = (r() * 13) | 0; P(g, x, y, 1, 2, "#3f8a36"); P(g, x + 1, y + 1, 1, 1, "#6fc25e"); }
    if (variant === 2) { P(g, 4, 5, 1, 1, "#e8e05a"); P(g, 11, 10, 1, 1, "#e8e05a"); }
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
      // Zip 264 (demande Guillaume : « réduire nettement la taille de la
      // ruche ») : petit skep de paille, ~20 px de large (contre 32 avant),
      // pour ne plus écraser le farm market voisin.
      const [c, g] = cv(28, 32);
      P(g, 10, 28, 8, 3, "#7a5330");                    // socle bois
      P(g, 5, 23, 18, 5, "#c99a4a");                    // base de la ruche
      P(g, 6, 18, 16, 5, "#d8a94e"); P(g, 8, 14, 12, 5, "#e0b558"); P(g, 10, 10, 8, 4, "#e8c162"); P(g, 12, 7, 4, 3, "#efce76"); // paille empilée
      for (let y = 9; y < 28; y += 3) P(g, 5, y, 18, 1, "#00000022"); // lignes de paille
      P(g, 12, 24, 4, 3, "#3a2a18");                    // entrée
      outlineSprite(g, 28, 32, "#5a3a1e");
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

  /* ---------------- Atlas ---------------- */
  const S = {
    grass: [grassTile(0), grassTile(1), grassTile(2)],
    tilled: tilledTile(false),
    watered: tilledTile(true),
    water: [waterTile(0), waterTile(1)],
    sand: sandTile(),
    bridge: bridgeTile(),
    bridgeRuin: bridgeRuinTile(),
    bridgeStoneSprite: bridgeStoneTile(),
    grassPatch: grassTile(0), // icône outil Construction/aperçu pour l'herbe (chantier 2026-07), simple réutilisation d'une tuile d'herbe existante
    path: pathTile(),
    oak: oakTree(),
    pine: pineTree(),
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
    plazaBench: plazaBenchSprite(),
    plazaTopiary: plazaTopiarySprite(),
    plazaMonument: plazaMonumentSprite(),
    plazaFountain: plazaFountainSprite(),
    fountainGeo: FOUNTAIN_GEO,        // zip 429 : lue par drawTownFrame pour l'eau et le jet
    /* Zip 426 — le mobilier de l'agrandissement. ⚠️ Les étals sont un TABLEAU
       (quatre bâches) et non quatre clés : le rendu choisit par hachage de la
       position, ce qui restait impossible avec des noms distincts. */
    townStalls: [0, 1, 2, 3].map(i => townStallSprite(i)),
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
