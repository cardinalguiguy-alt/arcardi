/* =============================================================================
   boulodrome.js — LE BOULODROME DANS VALLEY TOWN (2026-10-29, lot 2) : OÙ IL EST, ET CE QU'EST CHAQUE PIXEL. PUR.
   -----------------------------------------------------------------------------
   Les verdicts de Guillaume (docs/PROJETS.md §11) : derrière la mairie, deux pistes d'EST EN OUEST, la piste du platane
   au nord (relief `b`, les racines), la piste de la mairie au sud (relief `a`) ; des madriers bas qu'on enjambe, une
   bande d'herbe entre les deux ; des arbres DÉJÀ DANS LE JEU, quatre au nord et un au bout est, jamais au sud ; des
   bancs de planches entre eux, face aux pistes ; une guirlande en zigzag. Et : « je veux une qualité graphique
   bluffante ».

   ⚠️⚠️ UNE GRANDEUR, UN SEUL ENDROIT (noyau §4 : « une même grandeur écrite à sept endroits… »). Ce fichier est le SEUL
   à savoir où est le boulodrome. Le générateur (`generateTownWorld`, passe finale), le dessin (`boulodromeArt.js`), la
   neige et la pluie (`townSnowEnv.bouloAt`), le plan de la ville et, au lot 3, la partie elle-même lisent ces nombres-ci.
   Et la piste se dessine DEPUIS le relief de la physique (`petanque.js`, `PISTES`) : ce qu'on voit est ce qui dévie la
   boule, au pixel.

   LE REPÈRE. Une piste de `petanque.js` a son repère propre, en mètres : `x` en travers (0 au NORD, 4 au sud), `y` en
   long (0 à l'OUEST, le bout du premier cercle, 15 à l'est). À 13,5 px d'art par mètre (`PX_M`, l'échelle de la ville),
   un point (x, y) d'une piste tombe en (sx + y·PX_M, sy + x·PX_M) px du monde : on lance de gauche à droite, la hauteur
   de l'arc se lit vers le haut de l'écran (la décision du plan A).

   ⚠️ LES PIXELS, PAS LES CASES. Une piste fait 4 m = 54 px de large, soit 3,375 cases : ses bords ne tombent pas sur la
   grille, et c'est voulu (une piste réglementaire ne se plie pas à la case de 1,185 m). Le sol de la ville se cuit par
   case (`paintTownGroundTile`), chaque case reçoit sa part du dessin, découpée au pixel.
   ========================================================================== */
import * as C from "./fermeConstants.mjs";
import * as PT from "./petanque.mjs";

const T = C.TILE;
const PX_M = PT.PETANQUE.PX_M;

/* ── LE CADRE ──
   `OX`, `OY` : le coin nord-ouest du cadre de la piste du nord, madrier compris (px d'art du monde). Choisis pour que le
   SABLE commence sur une ligne de case (x 101, y 39) : le plan de la page de décisions, et les mesures du site (la
   prairie libre de x 83 à 121, y 36 à 48 ; le toit de la mairie ne déborde au-dessus de la prairie que pour x 87..98).
   `M` : le dessus d'un madrier, 2 px (≈ 15 cm — une traverse de bois, plus large qu'un vrai madrier de 8 cm : à un pixel,
   on ne lirait pas le bois). `GAP` : l'herbe entre les deux pistes, 7 px (≈ 52 cm, « une bande d'herbe » de la page).
   `LP` : 202 px = 14,96 m (15 m feraient 202,5 : la dernière demi-colonne est sous le madrier de l'est, où une boule
   arrêtée au bord vient s'appuyer). `WP` : 4 m, 54 px tout rond. */
export const BOULO = { OX: 101 * T - 2, OY: 39 * T - 2, M: 2, GAP: 7, LP: 202, WP: 54 };
const B = BOULO;
/* Les deux pistes, du nord au sud. `sx`, `sy` : le coin nord-ouest du SABLE. */
export const BOULO_PISTES = [
  { k: "b", sx: B.OX + B.M, sy: B.OY + B.M },
  { k: "a", sx: B.OX + B.M, sy: B.OY + B.M + B.WP + B.M + B.GAP + B.M },
];
/* L'emprise entière, px du monde (demi-ouvert) : [x0, x1) × [y0, y1). */
export const BOULO_BOX = {
  x0: B.OX, y0: B.OY,
  x1: B.OX + B.M + B.LP + B.M,
  y1: BOULO_PISTES[1].sy + B.WP + B.M + 1,   // + 1 : la face sud du dernier madrier, posée sur l'herbe
};
/* Les cases que le dessin touche (au moins un pixel), pour le générateur et la cuisson du sol. */
export const BOULO_TILES = {
  x0: Math.floor(BOULO_BOX.x0 / T), y0: Math.floor(BOULO_BOX.y0 / T),
  x1: Math.floor((BOULO_BOX.x1 - 1) / T), y1: Math.floor((BOULO_BOX.y1 - 1) / T),
};

/* ── CE QUI SE TIENT AUTOUR (cases) ──
   ⚠️ LES ARBRES SONT AU NORD, ET C'EST UNE RÈGLE DE VUE, PAS UN GOÛT : vue d'en haut, la couronne d'un arbre couvre ce
   qui est au NORD de son pied. Au sud des pistes, elle cacherait les boules. Quatre le long de l'avenue (rangée 36, la
   première case d'herbe sous la chaussée), un au bout est. Leur essence est un érable (`townTreeKind`, fermeArt.js) :
   « un arbre déjà dans le jeu » (son verdict) — celui dont la feuille est celle du platane.
   Les bancs entre les arbres, une rangée plus bas (leur pied à 14 px du madrier) ; ils regardent le sud, donc les pistes
   ET la caméra. Les mâts de la guirlande au sud de la piste de la mairie, à mi-chemin entre deux arbres : le fil part du
   tronc d'un arbre, descend vers un mât, remonte vers l'arbre suivant (le zigzag). */
export const BOULO_TREES = [{ x: 101, y: 36 }, { x: 105, y: 36 }, { x: 109, y: 36 }, { x: 113, y: 36 }, { x: 116, y: 42 }];
export const BOULO_BENCHES = [{ x: 103, y: 37 }, { x: 107, y: 37 }, { x: 111, y: 37 }];
export const BOULO_POLES = [{ x: 103, y: 47 }, { x: 107, y: 47 }, { x: 111, y: 47 }];
/* La hauteur des attaches (px d'art au-dessus du sol) : sur le tronc, sous la couronne d'un grand érable ; en tête de mât. */
export const BOULO_TRUNK_HOOK = 34;
export const BOULO_POLE_H = 46;
/* Les fils, d'arbre en mât : { a: arbre, b: mât } pris dans l'ordre d'ouest en est. ⚠️ Un fil dont l'arbre est abattu
   (`townTreeStanding`) ne se dessine pas : l'appelant le teste. */
export const BOULO_SPANS = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]].map(([t, p]) => ({ tree: t, pole: p }));

/** Un des arbres du boulodrome ? (Sur une carte qui l'a reçu : `tw.boulo`.) */
export const isBouloTree = (tw, x, y) => !!(tw && tw.boulo) && BOULO_TREES.some((t) => t.x === x && t.y === y);
export const inBouloTiles = (x, y) => x >= BOULO_TILES.x0 && x <= BOULO_TILES.x1 && y >= BOULO_TILES.y0 && y <= BOULO_TILES.y1;

/* ── LE REPÈRE DES PISTES ── */
export const pisteDe = (k) => BOULO_PISTES.find((p) => p.k === k) || null;
/** Un point d'une piste (mètres, repère de `petanque.js`) → px d'art du monde. */
export function pisteVersMonde(k, mx, my, out = [0, 0]) {
  const p = pisteDe(k);
  out[0] = p.sx + my * PX_M; out[1] = p.sy + mx * PX_M;
  return out;
}

/** Le relief LOCAL d'une piste (m) : la hauteur de `petanque.js` sans sa pente d'ensemble (`incl`). C'est ce que l'eau
    retient (une flaque comble un creux ; une piste inclinée de 0,8 % se draine, elle ne se noie pas à son bout bas) et ce
    que la neige épouse. Le dessin l'emploie aussi : une seule lecture du relief pour tout ce qui le montre. */
export function reliefLocal(k, mx, my) {
  const Tp = PT.PISTES[k], P = PT.PETANQUE;
  return PT.hauteur(Tp, mx, my) - (Tp.incl[0] * (mx - P.W / 2) + Tp.incl[1] * (my - P.L / 2));
}
/** Le relief local en cm du dernier pixel de SABLE lu par `bouloAt` (la neige et la pluie, sans allocation). */
export const bouloHitCm = () => reliefLocal(BOULO_HIT.k, BOULO_HIT.mx, BOULO_HIT.my) * 100;

/* ── CE QU'EST UN PIXEL ──
   `bouloAt(wx, wy)` (px d'art du monde, entiers) rend 0 hors du boulodrome, sinon un code :
     1 SABLE (et `BOULO_HIT` dit quelle piste et où, en mètres) · 2 MADRIER, son dessus · 3 MADRIER, sa face sud (le
     flanc d'une traverse de 10 cm vu de trois quarts : un pixel, posé sur ce qui est au sud du dessus) · 4 L'HERBE entre
     les pistes (rien n'y est peint : le gazon de la ville se voit au travers).
   ⚠️ Appelée PAR PIXEL par la neige et la pluie (une parcelle de 130 × 130) : un test de boîte d'abord, aucune
   allocation (le détail va dans un objet réutilisé). */
export const BOULO_HIT = { k: "", mx: 0, my: 0, i: 0, j: 0, side: "" };
export function bouloAt(wx, wy) {
  if (wx < BOULO_BOX.x0 || wx >= BOULO_BOX.x1 || wy < BOULO_BOX.y0 || wy >= BOULO_BOX.y1) return 0;
  const H = BOULO_HIT;
  for (let n = 0; n < 2; n++) {
    const p = BOULO_PISTES[n];
    const fy0 = p.sy - B.M, fy1 = p.sy + B.WP + B.M;
    if (wy < fy0 || wy > fy1) continue;
    const i = wx - p.sx, j = wy - p.sy;
    H.k = p.k; H.i = i; H.j = j;
    // la rangée sous le cadre : la face sud du madrier du sud, posée sur l'herbe
    if (wy === fy1) { H.side = "s"; return 3; }
    if (i >= 0 && i < B.LP && j >= 0 && j < B.WP) {
      H.mx = (j + 0.5) / PX_M; H.my = (i + 0.5) / PX_M;
      // la face sud du madrier du nord recouvre la première rangée de sable
      if (j === 0) { H.side = "n"; return 3; }
      H.side = "";
      return 1;
    }
    H.side = j < 0 ? "n" : j >= B.WP ? "s" : i < 0 ? "w" : "e";
    return 2;
  }
  return 4;
}
