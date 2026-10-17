/* =============================================================================
   maison.js — L'INTÉRIEUR DES MAISONS DES JOUEURS : LE PLAN, LA CARTE, LA
   COLLISION, L'ESCALIER (2026-10-16, lot 1 de docs/PROJETS.md §6)
   -----------------------------------------------------------------------------
   PUR : il n'importe que les constantes et la table des sprites de meubles,
   il ne dessine rien et n'appelle pas React. Le jeu l'appelle (FermeGame.js,
   zone « home »), les bancs l'appellent (`verify-maison`, `render-maison`) —
   un banc qui refait une fonction au lieu de l'appeler mesure un autre monde
   (§4, leçon du 442).

   ⚠️⚠️ UNE SEULE CARTE POUR TOUTES LES MAISONS, ET RIEN DE PLUS SUR LE RÉSEAU
   (noyau §3 et §4). Chaque PARCELLE (son rang dans `C.TOWN_HOUSES`, qui
   désigne son propriétaire) a un emplacement de `HOME_SLOT_W` cases de large ;
   chaque niveau est empilé tous les `HOME_LEVEL_H` cases. La maison et l'étage
   d'un joueur se DÉDUISENT de sa position (x, y) dans la zone « home » —
   exactement comme l'étage du tribunal se lit dans son y. Aucun champ ne
   s'ajoute au paquet de position.

   ⚠️ LE PLAN EST À L'ÉCHELLE DE LA FAÇADE : 1 case DU PLAN = 1,183 m (la porte
   de 2,04 m, `C.TOWN_HOUSE_DOOR_PX`). Le plan de l'ÉTROITE fait 5 × 9 cases
   par niveau (5,9 × 10,6 m, murs extérieurs de 40 cm en plus), trois niveaux
   — plus profonde dedans que dehors (Guillaume, 2026-10-17 : « la maison n'est
   pas assez grande », l'option « plus profonde aussi » ; la façade ne change pas).

   ⚠️⚠️ 2026-10-17 — MAIS LE PERSONNAGE N'Y EST PAS À L'ÉCHELLE : `HOME_K` = 2
   CASES DU MONDE PAR CASE DU PLAN. Guillaume : « gros problème d'échelle pour
   ma maison, mon joueur paraît gigantesque ». Mesuré en jeu : le personnage a
   la bonne HAUTEUR (23 px peints = 1,70 m) mais un corps de chibi — 10 px
   d'épaules, 74 cm, une tête de 45 cm — à côté de meubles aux cotes réelles :
   un canapé trois places ne faisait que 2,5 largeurs de personnage, et sa
   tête la taille de la table basse. Maquette ×1 / ×1,5 / ×2 montrée, ×2
   choisi : c'est l'échelle des jeux « cosy » (le personnage mesuré contre
   ses meubles, pas contre un mètre). Le plan, les meubles, les sauvegardes
   restent en cases DU PLAN ; seul le passage au monde multiplie par K
   (`homeToLocal`, `homeToWorld`), et la semelle du corps, qui est une
   grandeur du MONDE, se divise par K pour entrer dans le plan
   (`HOME_BOX_R`, `HOME_BODY_D`). Le dessin garde un pixel de maison pour un
   demi-pixel du personnage : la finesse double avec l'échelle
   (`maisonArt.MPX` 64, les meubles rendus à 64 px par case).
   Les fenêtres
   côté rue et la porte d'entrée sont LUES sur la façade peinte du modèle
   (`homeFacade`) — jamais recopiées : N1 et N2 n'ont pas les mêmes, et la
   façade se change avec R.

   ⚠️ LES CLOISONS FONT 12 CM (0,1 case), LE CORPS 0,24 CASE DU PLAN (0,48 du
   monde, divisé par `HOME_K`) : la collision se
   mesure RECTANGLE CONTRE RECTANGLE, jamais aux coins de la semelle — une
   cloison plus fine que le corps passerait ENTRE deux coins (§4, « une semelle
   testée à ses coins enjambe tout ce qui est plus fin qu'elle »).

   ⚠️ L'ESCALIER : des volées droites SUPERPOSÉES le long du mur ouest, la
   disposition réelle d'une maison étroite (la volée du haut passe au-dessus de
   celle du bas, à un étage d'écart). À l'étage, la même emprise porte DEUX
   choses : l'arrivée de la volée du bas (au nord) et le départ de celle du haut
   (au sud). C'est le piège « une case à deux sols » (§4) : le niveau du marcheur
   se DÉDUIT de son pas précédent (`homeStairStep`) — entré par le sud, il
   monte ; entré par le nord, il descend.
   ========================================================================== */
import * as C from "./fermeConstants";
import { MEUBLES } from "./maisonSprites";

export const CASE_M = 1.183;          // une case DU PLAN
export const HOME_K = 2;              // 2026-10-17 : cases du MONDE par case du PLAN (voir l'en-tête)
export const STOREY_M = 2.7;          // d'un plancher au suivant
export const EP_EXT = 0.34;           // mur extérieur : 40 cm
export const EP_INT = 0.10;           // cloison : 12 cm
/* LA SEMELLE DU CORPS, EN CASES DU PLAN : celle du monde (0,48 × `C.BODY_DEPTH`,
   comme en ville) divisée par K. ⚠️ C'est une grandeur du PERSONNAGE : la
   laisser à 0,24 (sa valeur d'avant ×2) aurait gardé un corps de 57 cm dans un
   personnage dessiné à 37 cm d'épaules — il aurait buté à un pas des meubles. */
export const HOME_BOX_R = 0.24 / HOME_K;          // demi-largeur : 28 cm de large (une porte en fait 95)
export const HOME_BODY_D = C.BODY_DEPTH / HOME_K; // profondeur de la semelle

// ─── la carte des intérieurs (en cases DU MONDE) ─────────────────────────
export const HOME_SLOT_W = 8 * HOME_K;    // par emplacement : 8 cases du plan (5 de plan, les murs, de la marge)
export const HOME_LEVEL_H = 14 * HOME_K;  // par niveau : 14 cases du plan (9 de plan, la hauteur des murs projetée au-dessus)
/* Le coin nord-ouest du plan dans son emplacement, en cases du monde.
   ⚠️ CHOISI POUR QUE L'ORIGINE DES IMAGES CUITES (`maisonArt.HOME_FX0/FY0`, −1
   et −3 cases du plan) TOMBE SUR UNE CASE ENTIÈRE DU MONDE : posées au cran 2
   ou 4, elles tombent alors sur des pixels d'écran entiers — à 1,5, l'origine
   arrivait à 57,6 px au cran 4. */
export const HOME_OX = 2.0 * HOME_K;   // 2026-10-16 (soir) : 1,6 → 2,0 avec la marge des murs évasés (`maisonArt.HOME_FX0` −1)
export const HOME_OY = 4.0 * HOME_K;
export const homeSlotOf = (x) => Math.floor(x / HOME_SLOT_W);
export const homeLevelOf = (y) => Math.floor(y / HOME_LEVEL_H);
/* Un point du MONDE (cases) → sa maison, son niveau, ses coordonnées dans le plan. */
export function homeToLocal(x, y) {
  const slot = homeSlotOf(x), level = homeLevelOf(y);
  return { slot, level, lx: (x - slot * HOME_SLOT_W - HOME_OX) / HOME_K, ly: (y - level * HOME_LEVEL_H - HOME_OY) / HOME_K };
}
export function homeToWorld(slot, level, lx, ly) {
  return { x: slot * HOME_SLOT_W + HOME_OX + lx * HOME_K, y: level * HOME_LEVEL_H + HOME_OY + ly * HOME_K };
}
/* Le pied d'un personnage (la ligne de contact, `C.footX/footY`) en coordonnées du plan. */
export const homeFootLocal = (x, y) => homeToLocal(C.footX(x), C.footY(y));

/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-17 (après-midi) — LES COTES D'USAGE SE LISENT CONTRE LE PERSONNAGE
   ╚════════════════════════════════════════════════════════════════════════
   Guillaume : « la tête du player est en dessous des plans de travail et objets
   [de la cuisine] ; pareil salle de bain […] pour une mise à l'échelle cohérente ».
   Le plan et les murs sont à ×2 (`HOME_K`), pas le personnage : à côté d'eux il fait
   `HOME_PERSO_M` = 0,85 m. Les cotes réelles d'un adulte (plan de travail à 0,90 m,
   vasque à 0,86 m, miroir à 1,15 m, fenêtre à 0,90 m, interrupteur à 1,10 m) lui
   arrivaient à la tête — et le correctif du soir (lavabo −20 cm, miroir 0,80 m,
   fenêtre des bains 0,78 m) la laissait AU RAS de la tête. La règle : les HAUTEURS de
   ce qui s'utilise debout se divisent par K, comme le personnage ; les emprises
   (la grandeur de la pièce) et la hauteur des murs restent réelles.
   ⚠️ DEUX ENDROITS PORTENT LA RÈGLE, ET UN BANC LES RECOUPE (`verify-maison` §12) :
   ici, ce qui est PEINT sur les murs et les fenêtres ; `tools/blender/meubles.py`
   (`ECHELLE_Z`), les sprites des équipements (plan de travail, évier, cuisinière,
   lavabo, toilettes, baignoire : ×0,5 sur les hauteurs, rendus par Blender).
   2026-10-17 (après-midi, sur son « oui ») : tout le reste suit — séjour, chambre, radiateurs (`ECHELLE_Z_SPRITES`). */
export const HOME_PERSO_M = 1.70 / HOME_K;
/* Les sprites dont Blender divise les hauteurs, et de combien (`tools/blender/meubles.py`, `ECHELLE_Z` : la même liste, recoupée par
   `verify-maison` §12). Hors liste : le tapis (à plat), le tableau (suspendu) et l'escalier (ses marches font l'étage des murs).
   ⚠️ La cheminée fait exception à ×1/K : écrasée à ×0,5 elle devenait une auge. */
export const ECHELLE_Z_SPRITES = Object.fromEntries([
  ...["plan_travail", "evier", "cuisiniere", "baignoire", "lavabo", "wc", "canape", "fauteuil", "table_basse", "bibliotheque", "lampadaire", "poele",
      "gueridon", "portemanteau", "plante_morte", "plante_verte", "lit", "radiateur"].map((n) => [n, 1 / HOME_K]),
  ["cheminee", 0.65],
]);
/* Le facteur d'un sprite (`canape_canard` → celui de `canape`, `plan_travail_118` → celui de `plan_travail`, `lampadaire_moutarde_allume`…). */
export const homeZk = (sprite) => {
  const base = Object.keys(ECHELLE_Z_SPRITES).find((n) => sprite === n || sprite.startsWith(n + "_"));
  return base ? ECHELLE_Z_SPRITES[base] : 1;
};
export const ECHELLE_USAGE = {
  fenetre: { allege: 0.70, haut: 1.90 },   // cuisine et bains (0,90–2,15 m avant) : l'appui passe sous le robinet (0,63 m), pas sous l'épaule
  priseCuisine: 0.60,                      // sur la faïence, 15 cm au-dessus du plan (0,45 m)
  priseBains: 0.50,
  miroir: [0.62, 1.08],                    // autour du visage du personnage (0,6 à 0,8 m), au-dessus de la vasque (0,43 m)
  conduit: { tablette: 0.70, trumeau: [0.86, 1.70] },   // la tablette de la cheminée (×0,65 : 1,08 → 0,70 m) et le trumeau au-dessus (1,24–2,20 avant)
};

// ─── le plan de l'étroite ────────────────────────────────────────────────
/* Repère du plan : x vers l'est (0 = mur ouest intérieur), y vers la RUE
   (0 = mur nord intérieur, `d` = façade). `rects` : [x0, y0, x1, y1].
   `sol` : [motif, variante] des peintres de `maisonArt.js` ; `murs` : le papier
   et le lambris des murs DU FOND de la pièce. Ce sont les murs et les sols
   « d'origine » (décision de Guillaume, 2026-10-16 : la maison est vide au
   premier passage) — le lot 2 les rendra changeables.
   `cloisons` : une ligne et son épaisseur (`EP_INT`), percée de `portes`
   ([a, b] le long de la ligne) ; `garde` : un garde-corps (bas, à claire-voie).
   `pleins` : ce qui ne se traverse pas (le placard sous l'escalier, le bas des
   pentes du toit). `fenetresNord` : les fenêtres du mur du fond (le jardin). */
/* ⚠️ 2026-10-17 — 7 → 9 CASES DE PROFONDEUR (Guillaume : « plus profonde aussi »).
   Le programme ne change pas (celui montré le 2026-10-16 et non contesté) : les
   deux cases gagnées vont aux pièces qu'on habite — la cuisine-repas et le
   séjour prennent une case chacun (4,7 × 5,3 m et 3,3 × 5,3 m), l'escalier
   recule d'une case avec la cuisine, les bains et le dressing s'élargissent,
   la chambre gagne une case (5,9 × 4,4 m). Les sauvegardes écrites sur le plan
   de 7 cases sont recalées par `migrateHome` (`HOME_PLAN_V`). */
export const PLAN_ETROITE = {
  taille: "narrow", w: 5, d: 9,
  escalier: { x0: 0.0, x1: 0.9, yPied: 4.5, yHaut: 2.0 },
  niveaux: [
    { cle: "rdc", mur: 2.5,
      pieces: [
        { id: "cage", sol: ["ciment", "classique"], murs: { papier: "rayures", lambris: "creme" }, rects: [[0, 2.0, 0.9, 4.5]] },
        { id: "entree", sol: ["ciment", "classique"], murs: { papier: "rayures", lambris: "creme" }, rects: [[0, 4.5, 2.2, 9]] },
        { id: "sejour", sol: ["parquet", "chene"], murs: { papier: "rayures", lambris: "creme" }, rects: [[2.2, 4.5, 5, 9]] },
        { id: "cuisine", sol: ["tomettes", "rouge"], murs: { papier: "platre", lambris: "faience" }, rects: [[1.0, 0, 5, 4.5]], fenetre: ECHELLE_USAGE.fenetre },
      ],
      cloisons: [
        { x: 0.95, y0: 0, y1: 4.5 },                              // la cage d'escalier contre la cuisine
        { y: 4.5, x0: 0.9, x1: 5, portes: [[1.25, 2.05]] },       // l'entrée et le séjour contre la cuisine
        { x: 2.2, y0: 4.5, y1: 9, portes: [[5.6, 6.4]] },         // l'entrée contre le séjour
      ],
      pleins: [{ nom: "placard", rect: [0, 0, 0.9, 2.0] }],      // sous la volée du haut
      fenetresNord: [[2.0, 2.85], [3.75, 4.6]],
      cadres: [["cage", "entree"]],        // 2026-10-17 : les pièces qui se cadrent ENSEMBLE (voir `homeCadreAt`) — la volée s'ouvre sur l'entrée
      // 2026-10-17 — LES ÉQUIPEMENTS (voir « LES ÉQUIPEMENTS DE LA MAISON ») : la cuisine le long
      // du mur nord (l'évier sous la fenêtre de gauche), la cheminée contre le mur nord du séjour.
      fixes: [
        { sprite: "plan_travail_118", o: "S", lx: 1.0, ly: 0 },
        { sprite: "evier", o: "S", lx: 2.0, ly: 0 },
        { sprite: "cuisiniere", o: "S", lx: 3.0, ly: 0 },
        { sprite: "plan_travail_165", o: "S", lx: 3.6, ly: 0 },
        { sprite: "cheminee", o: "S", lx: 3.0, ly: 4.55 },
      ],
      // Ce qui se PEINT sur la face d'un mur du fond (`y` : le pied de la face) : il se coupe avec lui.
      peints: [
        { quoi: "etagere", y: 0, x0: 1.12, x1: 1.88 },
        { quoi: "hotte", y: 0, x0: 3.0, x1: 3.59 },
        { quoi: "conduit", y: 4.55, x0: 3.13, x1: 4.02, tablette: ECHELLE_USAGE.conduit.tablette, bas: ECHELLE_USAGE.conduit.trumeau[0], haut: ECHELLE_USAGE.conduit.trumeau[1] },
        { quoi: "prise", y: 0, x: 1.5, z: ECHELLE_USAGE.priseCuisine },
        { quoi: "prise", y: 0, x: 4.78, z: ECHELLE_USAGE.priseCuisine },
      ],
    },
    { cle: "etage", mur: 2.5,
      pieces: [
        { id: "cage", sol: ["parquet", "chene"], murs: { papier: "rayures", lambris: "creme" }, rects: [[0, 2.0, 0.9, 4.5]] },
        { id: "palier", sol: ["parquet", "chene"], murs: { papier: "rayures", lambris: "creme" }, rects: [[0, 0, 2.0, 2.0], [1.0, 2.0, 2.0, 5.3], [0, 4.5, 1.0, 5.3]] },
        /* 2026-10-17 (soir) — « salle de bain pas assez grande » : 2,8 × 2,8 → 3,0 × 3,4 cases (3,5 × 4,0 m). Elle prend
           0,2 case au palier (couloir de 1,0 case, encore trois fois le corps) et 0,6 au dressing (3,0 × 1,9). La fenêtre
           est plus BASSE que celle des autres pièces (`fenetre`) : le personnage fait 0,85 m à l'échelle des murs
           (`HOME_K` = 2), un appui à 90 cm lui passait au-dessus de la tête. */
        { id: "bains", sol: ["carreaux", "blanc"], murs: { papier: "platre", lambris: "faience" }, rects: [[2.0, 0, 5, 3.4]], fenetre: ECHELLE_USAGE.fenetre },
        { id: "dressing", sol: ["parquet", "chene"], murs: { papier: "rayures", lambris: null }, rects: [[2.0, 3.4, 5, 5.3]] },
        { id: "chambre", sol: ["parquet", "chene"], murs: { papier: "toile_bleue", lambris: "creme" }, rects: [[0, 5.3, 5, 9]] },
      ],
      cloisons: [
        { x: 0.95, y0: 2.0, y1: 4.5, garde: true },               // le garde-corps de la volée
        { x: 2.0, y0: 0, y1: 5.3, portes: [[0.5, 1.3], [3.95, 4.75]] },
        { y: 3.4, x0: 2.0, x1: 5 },
        { y: 5.3, x0: 0, x1: 5, portes: [[1.1, 1.9]] },
      ],
      pleins: [],
      fenetresNord: [[3.55, 4.30]],
      cadres: [["cage", "palier"]],
      fixes: [
        { sprite: "lavabo", o: "S", lx: 2.18, ly: 0 },
        { sprite: "wc", o: "S", lx: 2.92, ly: 0 },
        { sprite: "baignoire", o: "S", lx: 3.45, ly: 0 },
      ],
      // Le miroir et la prise sont à la hauteur du personnage, pas à celle d'un adulte de 1,70 m : voir `ECHELLE_USAGE`.
      peints: [
        { quoi: "miroir", y: 0, x0: 2.22, x1: 2.62, bas: ECHELLE_USAGE.miroir[0], haut: ECHELLE_USAGE.miroir[1] },
        { quoi: "prise", y: 0, x: 2.80, z: ECHELLE_USAGE.priseBains },
      ],
    },
    { cle: "combles", mur: 1.0, pente: true,
      pieces: [
        { id: "cage", sol: ["vide"], murs: { papier: "platre", lambris: null }, rects: [[0, 2.0, 0.9, 4.5]] },
        { id: "combles", sol: ["parquet", "brut"], murs: { papier: "platre", lambris: null }, rects: [[0, 0, 5, 9]] },
      ],
      cloisons: [
        { x: 0.95, y0: 2.0, y1: 4.5, garde: true },
        { y: 4.5, x0: 0, x1: 0.95, garde: true },
      ],
      pleins: [{ nom: "sous_pente", rect: [0, 0, 5, 0.35] }, { nom: "sous_pente", rect: [0, 8.65, 5, 9] }],
      fenetresNord: [],
      cadres: [["cage", "combles"]],
    },
  ],
};
export const homePlanOf = (size) => (size === "narrow" ? PLAN_ETROITE : null);
/* L'IMAGE D'UN MEUBLE (`MEUBLES`, rendue par Blender) : le SEUL endroit où son URL
   s'écrit (2026-10-17). Sa taille et son ancre sont dans la table générée
   `maisonSprites.js` ; `verify-maison` §2 vérifie que chaque PNG existe à la
   taille annoncée et au grain des murs, `verify-densite` §1 que le jeu ne charge
   aucune image par une URL écrite ailleurs. */
export const homeSpriteUrl = (nom) => "/maison/" + nom + ".png";
export const homeHasInterior = (hsn) => !!hsn && !hsn.model && !!homePlanOf(C.townHouseSize(hsn));

/* LA FAÇADE VUE DE L'INTÉRIEUR : la porte d'entrée et les fenêtres côté rue de
   chaque niveau, en x du plan, LUES sur le modèle peint (`C.TOWN_HOUSE_MODELS`)
   à l'échelle de sa porte (`C.townDoorScale`). Une vitre est au rez-de-chaussée
   si la façade la marque `g` ; au-dessus, l'étage ou les combles selon sa
   hauteur dans l'image (sous les lucarnes, y ≥ 380 px de référence). */
export function homeFacade(look, plan = PLAN_ETROITE) {
  const m = C.TOWN_HOUSE_MODELS[look && look.model];
  const out = { porte: [plan.w * 0.2, plan.w * 0.2 + 0.8], fenetres: plan.niveaux.map(() => []) };
  if (!m) return out;
  const k = C.townDoorScale(m) / C.TILE;                      // cases par px de référence
  const doorX = (m.door - m.wall[0]) * k - EP_EXT;            // l'axe de la porte, en x du plan
  out.porte = [doorX - 0.4, doorX + 0.4];
  const vwins = (m.variants[look.variant] && m.variants[look.variant].wins) || m.wins;
  for (const w of vwins) {
    if (w.lamp || w.ghost) continue;
    if (w.only && !w.only.includes(look.variant)) continue;
    const lvl = w.g ? 0 : w.y >= 380 ? 1 : 2;
    if (lvl >= plan.niveaux.length) continue;
    const a = Math.max(0.12, doorX + (w.x - m.door) * k), b = Math.min(plan.w - 0.12, doorX + (w.x + w.w - m.door) * k);
    if (b - a < 0.2) continue;
    if (lvl === 0 && a < out.porte[1] + 0.1 && b > out.porte[0] - 0.1) continue;
    out.fenetres[lvl].push([a, b]);
  }
  for (const f of out.fenetres) f.sort((p, q) => p[0] - q[0]);
  return out;
}

// ─── le mobilier de départ ───────────────────────────────────────────────
/* Décision de Guillaume (2026-10-16) : VIDE au premier passage de porte, sauf
   un LIT dans la chambre et une plante MORTE dans le séjour. (lx, ly) : le coin
   NORD-OUEST de l'emprise ; l'emprise vient du sprite rendu (`MEUBLES`, en
   mètres) — le dessin et la collision lisent la même. */
export const HOME_DEPART = [
  { id: "lit", sprite: "lit", o: "S", niveau: 1, lx: 2.65, ly: 5.36 },          // 2026-10-17 : +1 avec la chambre (plan de 9)
  { id: "plante_morte", sprite: "plante_morte", o: "S", niveau: 0, lx: 4.42, ly: 4.66 },
];
export function homeFurnitureRect(f) {
  const s = MEUBLES[f.sprite] && MEUBLES[f.sprite][f.o];
  const fw = s ? s.fw / CASE_M : 1, fd = s ? s.fd / CASE_M : 1;
  return [f.lx, f.ly, f.lx + fw, f.ly + fd];
}
/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-17 — LES ÉQUIPEMENTS DE LA MAISON (« pièces trop nues »)
   ╚════════════════════════════════════════════════════════════════════════
   Guillaume a choisi l'architecture (radiateurs sous les fenêtres, prises,
   interrupteurs, poutres des combles, appuis, cheminée au séjour) ET une
   cuisine et une salle de bains équipées de base. ⚠️ ILS VIENNENT AVEC LA
   MAISON : ils sont dans le PLAN (`fixes` de chaque niveau), jamais dans
   l'état du joueur — ni garde-meuble, ni catalogue, ni déplacement, rien de
   plus dans la sauvegarde ni sur le réseau. Ils bloquent la marche et la pose
   comme un meuble (raison « equipement »). Les RADIATEURS se déduisent de la
   façade : un sous chaque fenêtre côté rue, aussi long que la place le permet
   (la façade change avec R, eux aussi). Ce qui se PEINT sur un mur (prises,
   hotte, miroir, conduit et trumeau, poutres) est dans `maisonArt.js` : posé
   en sprite, il flotterait quand le mur se coupe à 35 cm. */
export const HOME_FIXE = /^(radiateur|cheminee|plan_travail|evier|cuisiniere|baignoire|lavabo|wc)(_|$)/;
export const homeFixe = (s) => HOME_FIXE.test(s);
const RADIATEURS = [["radiateur_14", 0.84], ["radiateur_11", 0.66], ["radiateur_8", 0.48]];   // [sprite, longueur en m]
const fixMemo = new Map();
export function homeFixes(plan, L, facade) {
  const lv = plan.niveaux[L];
  if (!lv) return [];
  const key = plan.taille + "|" + L + "|" + (facade ? JSON.stringify(facade.fenetres[L] || []) : "");
  if (fixMemo.has(key)) return fixMemo.get(key);
  const out = (lv.fixes || []).map((f, i) => ({ id: "fixe:" + L + ":" + i, sprite: f.sprite, o: f.o, niveau: L, lx: f.lx, ly: f.ly, fixe: true }));
  if (facade && !lv.pente) for (const [a, b] of facade.fenetres[L] || []) {
    const c = (a + b) / 2, yy = plan.d - 0.2;
    const pc = homeRoomAt(plan, L, c, yy);
    if (!pc || pc.id === "cage") continue;
    const rr = pc.rects.find(([x0, y0, x1, y1]) => c >= x0 && c < x1 && yy >= y0 && yy < y1);
    const lo = Math.max(a, rr[0] + 0.08), hi = Math.min(b, rr[2] - 0.08);
    const pick = RADIATEURS.find(([nom, m]) => MEUBLES[nom] && m / CASE_M <= hi - lo + 1e-9);
    if (!pick) continue;
    const m = MEUBLES[pick[0]].S, fw = m.fw / CASE_M, fd = m.fd / CASE_M;
    out.push({ id: "radiateur:" + L + ":" + out.length, sprite: pick[0], o: "S", niveau: L, lx: (lo + hi) / 2 - fw / 2, ly: plan.d - fd, fixe: true });
  }
  if (fixMemo.size > 64) fixMemo.clear();
  fixMemo.set(key, out);
  return out;
}

/* Où se pose la tête du dormeur : sur l'oreiller de gauche (le lit a la tête au nord). */
export function homeBedPillow(f) {
  const [x0, y0, x1] = homeFurnitureRect(f);
  return { lx: x0 + (x1 - x0) * 0.3, ly: y0 + 0.30, z: 0.58 * homeZk(f.sprite) };   // 2026-10-17 : le matelas descend avec le lit (×½)
}

// ─── la géométrie d'un niveau ────────────────────────────────────────────
function splitGaps(a, b, gaps) {
  const out = [];
  let cur = a;
  for (const [g0, g1] of (gaps || []).slice().sort((p, q) => p[0] - q[0])) {
    if (g0 > cur) out.push([cur, Math.min(g0, b)]);
    cur = Math.max(cur, g1);
  }
  if (cur < b) out.push([cur, b]);
  return out.filter(([p, q]) => q - p > 1e-6);
}
export function homeRoomAt(plan, L, lx, ly) {
  for (const p of plan.niveaux[L].pieces) for (const [x0, y0, x1, y1] of p.rects) {
    if (lx >= x0 && lx < x1 && ly >= y0 && ly < y1) return p;
  }
  return null;
}
/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-17 (soir) — LE CADRAGE PAR PIÈCE (« j'entre dans une pièce, le cadrage
   ║ se resserre ou se centre sur la pièce » — Guillaume ; la vue du plan entier
   ║ devient un bouton, plus la vue par défaut).
   ╚════════════════════════════════════════════════════════════════════════
   Un CADRE est la pièce où l'on se tient, ou un groupe de pièces qui n'en font
   qu'une pour l'œil (`cadres` du niveau : la cage d'escalier s'ouvre sur l'entrée,
   se cadrer sur 0,9 case de large n'aurait aucun sens). Pur : le jeu y lit où
   poser la caméra, le banc y vérifie que chaque pièce tombe dans un cadre. */
export function homeCadreOf(plan, L, pieceId) {
  const lv = plan.niveaux[L];
  const grp = (lv.cadres || []).find((g) => g.includes(pieceId));
  return grp ? grp.join("+") : pieceId;
}
export function homeCadreAt(plan, L, lx, ly) {
  const pc = homeRoomAt(plan, L, lx, ly);
  return pc ? homeCadreOf(plan, L, pc.id) : null;
}
/* Les rectangles du plan d'un cadre (la réunion des pièces de son groupe). */
export function homeCadreRects(plan, L, key) {
  const ids = key.split("+"), out = [];
  for (const p of plan.niveaux[L].pieces) if (ids.includes(p.id)) for (const r of p.rects) out.push(r);
  return out;
}
/* L'ENVELOPPE d'un cadre, en cases du plan : de quoi voir ses murs entiers — la
   face du fond monte de la hauteur du mur (2,11 cases), les murs latéraux
   évasés débordent de 0,6 case, la coupe du devant et les pieds du personnage
   demandent un peu de marge. Rend [x0, y0, x1, y1]. */
export function homeCadreBox(plan, L, key) {
  const rs = homeCadreRects(plan, L, key), lv = plan.niveaux[L];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [a, b, c, d] of rs) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); }
  const mur = (lv.pente ? 2.3 : lv.mur) / CASE_M;                    // la hauteur du mur du fond, en cases
  return [x0 - (x0 <= 0.01 ? 0.65 : 0.30), y0 - mur - 0.35, x1 + (x1 >= plan.w - 0.01 ? 0.65 : 0.30), y1 + (y1 >= plan.d - 0.01 ? 0.60 : 0.45)];
}
/* Distance (cases) d'un point à la réunion de rectangles : 0 dedans. */
export function homeDistToRects(rs, lx, ly) {
  let best = Infinity;
  for (const [x0, y0, x1, y1] of rs) best = Math.min(best, Math.hypot(Math.max(x0 - lx, 0, lx - x1), Math.max(y0 - ly, 0, ly - y1)));
  return best;
}

/* Tout ce qui est plein à un niveau, en rectangles du plan : les murs
   extérieurs (la façade percée de sa porte au rez-de-chaussée), les cloisons
   moins leurs portes, les garde-corps, les pleins, le mobilier posé. */
const solidMemo = new Map();
export function homeSolids(plan, L, facade, meubles = HOME_DEPART, avecFixes = true) {
  /* ⚠️ La clé porte les MEUBLES EUX-MÊMES (lot 2a : on les déplace) — une clé au
     nombre de meubles rendait la collision d'avant après un déplacement.
     2026-10-17 : et les FENÊTRES de la façade (les radiateurs s'en déduisent). */
  const key = plan.taille + "|" + L + "|" + (facade ? facade.porte.join(",") + JSON.stringify(facade.fenetres[L] || []) : "") + "|" + (avecFixes ? 1 : 0) + "|" + meubles.filter((f) => f.niveau === L && !/^tapis/.test(f.sprite)).map((f) => f.sprite + f.o + f.lx + "," + f.ly).join(";");
  if (solidMemo.size > 200) solidMemo.clear();
  if (solidMemo.has(key)) return solidMemo.get(key);
  const { w, d } = plan, lv = plan.niveaux[L], e = EP_EXT, h = EP_INT / 2;
  const R = [
    [-e, -e, 0, d + e], [w, -e, w + e, d + e], [-e, -e, w + e, 0],
  ];
  // ⚠️ La façade reste PLEINE devant la porte : on sort par E (`homeNearExit`), comme au
  // tribunal — une porte ouverte dans la collision laisserait marcher dans le vide de la carte.
  R.push([-e, d, w + e, d + e]);
  for (const c of lv.cloisons) {
    if (c.x != null) for (const [a, b] of splitGaps(c.y0, c.y1, c.portes)) R.push([c.x - h, a, c.x + h, b]);
    else for (const [a, b] of splitGaps(c.x0, c.x1, c.portes)) R.push([a, c.y - h, b, c.y + h]);
  }
  for (const p of lv.pleins) R.push(p.rect.slice());
  if (avecFixes) for (const f of homeFixes(plan, L, facade)) R.push(homeFurnitureRect(f));   // 2026-10-17 : les équipements
  for (const f of meubles) if (f.niveau === L && !/^tapis/.test(f.sprite)) R.push(homeFurnitureRect(f));   // un tapis se marche dessus
  solidMemo.set(key, R);
  return R;
}
/* LA SEMELLE CONTRE LES RECTANGLES. (fx, fy) : la ligne de contact du pied, en
   coordonnées du plan. La boîte va de fy − HOME_BODY_D à fy en profondeur
   (2026-10-17 : `C.BODY_DEPTH` est une profondeur du MONDE, divisée par K). */
export function homeBoxFree(solids, fx, fy, r = HOME_BOX_R) {
  const bx0 = fx - r, bx1 = fx + r, by0 = fy - HOME_BODY_D, by1 = fy;
  for (const [x0, y0, x1, y1] of solids) {
    if (bx1 > x0 + 1e-6 && bx0 < x1 - 1e-6 && by1 > y0 + 1e-6 && by0 < y1 - 1e-6) return false;
  }
  return true;
}
/* Peut-on se tenir au point du MONDE (x, y) — l'ancre du sprite, comme partout ?
   `facadeOf(slot)` rend la façade de la maison de cet emplacement. */
export function homeCanStand(x, y, facadeOf, meublesOf) {
  const { slot, level, lx, ly } = homeFootLocal(x, y);
  const plan = PLAN_ETROITE;
  if (level < 0 || level >= plan.niveaux.length) return false;
  if (lx < -EP_EXT || ly < -EP_EXT || lx > plan.w + EP_EXT || ly > plan.d + 0.9) return false;
  return homeBoxFree(homeSolids(plan, level, facadeOf ? facadeOf(slot) : null, meublesOf ? meublesOf(slot, level) : HOME_DEPART), lx, ly);
}

// ─── l'escalier ──────────────────────────────────────────────────────────
export function homeInStair(plan, lx, ly) {
  const s = plan.escalier;
  return lx >= s.x0 && lx < s.x1 && ly >= s.yHaut && ly < s.yPied;
}
/* ╔════════════════════════════════════════════════════════════════════════
   ║ 2026-10-17 (soir) — GRAVIR UN ESCALIER : LENT, ET MARCHE PAR MARCHE
   ║ (« gravir les escaliers est trop rapide et peu réaliste » — Guillaume).
   ╚════════════════════════════════════════════════════════════════════════
   À la vitesse de la marche (5,2 cases du monde par seconde, soit 3 m/s dans
   une maison à l'échelle ×2), la volée de 3 m se grimpait en une seconde, en
   glissant. Deux changements : (1) sur la volée, la vitesse tombe à
   `HOME_STAIR_SPEED` de la marche et on ne court plus — 2,3 s pour la volée,
   comme quelqu'un qui monte, pas qui court ; (2) la hauteur des pieds n'est plus
   une rampe mais un ESCALIER : elle monte d'une marche (`HOME_STAIR_TREADS`,
   celles de la volée dessinée) à chaque pas, vite au milieu de la marche, à
   plat au début et à la fin — le corps monte par à-coups, comme les jambes. */
export const HOME_STAIR_SPEED = 0.36;
export const HOME_STAIR_TREADS = 15;     // `rendre_meubles.py` : escalier, marches=15
/* ⚠️ 2026-10-17 (après-midi) — « réduire un peu la vitesse de déplacement dans la maison (hors escaliers, la vitesse sur les
   escaliers est parfaite) ». Dedans, `PLAYER_SPEED` (5,2 cases du monde/s) fait ~3 m/s à l'échelle des murs : un personnage de
   0,85 m qui traverse la cuisine en 1,9 s. Hors volée on marche à `HOME_WALK_SPEED` de cette vitesse (la course s'y applique
   comme avant) ; la volée garde SA vitesse ABSOLUE (5,2 × 0,36 = 1,87 cases/s) : le multiplicateur de la volée n'est donc PAS
   composé avec celui de la marche — `homeSpeedMul` est l'unique endroit où les deux se rencontrent (le jeu l'appelle, le banc aussi).
   Le pas de jambes suit (`dt × 9 × HOME_WALK_SPEED` : la même foulée qu'en ville). */
export const HOME_WALK_SPEED = 0.75;
export const homeSpeedMul = (onFlight, running) => (onFlight ? HOME_STAIR_SPEED : HOME_WALK_SPEED * (running ? C.RUN_SPEED_MULT : 1));
/* Le marcheur est-il SUR une volée (celle qu'on voit : la volée du bas au rez-de-chaussée, celle du haut à l'étage
   une fois engagé depuis son pied) ? C'est ce qui le ralentit. */
export function homeOnFlight(plan, L, st, lx, ly) {
  if (L >= plan.niveaux.length - 1 || !homeInStair(plan, lx, ly)) return false;
  return L === 0 || !!(st && st.volee === "haut");
}
/* La hauteur (m) des pieds de qui marche sur une volée : le rez-de-chaussée
   porte la volée du bas, l'étage celle du haut ; les combles n'ont que la trémie. */
export function homeStairLift(plan, L, lx, ly) {
  if (L >= plan.niveaux.length - 1 || !homeInStair(plan, lx, ly)) return 0;
  const s = plan.escalier;
  const t = Math.max(0, Math.min(1, (s.yPied - ly) / (s.yPied - s.yHaut)));
  const u = t * HOME_STAIR_TREADS, i = Math.floor(u + 1e-9), f = u - i;
  return STOREY_M * Math.min(1, (i + f * f * (3 - 2 * f)) / HOME_STAIR_TREADS);
}
/* UN PAS SUR L'ESCALIER. `st` : { volee } (null, ou "haut" quand on gravit la
   volée de l'étage). Rend { st, aller } ; `aller` = { level, ly } quand il faut
   changer de niveau (même x, même maison). Les points d'arrivée sont HORS des
   zones de départ : on n'y rebondit pas.
   ⚠️ L'ÉTAGE, LA CASE À DEUX SOLS : entré dans l'emprise par le SUD (le pied de
   la volée du haut), on monte ; entré par le NORD (le palier), on descend la
   volée du bas, qui arrive là. */
/* ⚠️ 0,45 ET PAS MOINS : au rez-de-chaussée, le placard sous la volée du haut
   arrête la semelle à sa profondeur au-delà de `yHaut` (0,31 au premier jet, 0,155
   depuis K = 2) — un déclenchement à 0,30 de `yHaut` n'était jamais atteint
   avec la semelle d'alors (premier jet). */
export const HOME_STAIR_TRIG = 0.45;
/* ⚠️ 2026-10-17 (soir) — « bug escalier : on passe dessous et ça active l'ascension ».
   L'escalier se déclenchait au premier contact avec son emprise, quel que soit le geste :
   sur le palier de l'étage, côté nord, on se tient SOUS le haut de la volée que la caméra
   dessine (le pied de la volée suivante est au sud, son haut 2,70 m au-dessus) et un pas
   vers le sud suffisait à tomber sur la volée du bas — le personnage réapparaissait en
   haut d'une volée, ce qui se voit comme une montée. Deux garde-fous :
   (1) la volée ne s'engage que sur un geste DANS SON SENS (`dir` : le sens du pas ; dy < 0,
       vers le nord, pour monter ; dy > 0, vers le sud, pour descendre) — jamais en glissant de côté ;
   (2) la descente depuis le palier ne se déclenche qu'à `HOME_STAIR_DESC` DANS l'emprise,
       pas à son bord — frôler la trémie en passant n'est plus l'emprunter.
   `dir` absent = l'ancien comportement (les bancs qui appellent sans). */
export const HOME_STAIR_DESC = 0.25;
const versNord = (dir) => !dir || dir.dy < 0;
const versSud = (dir) => !dir || dir.dy > 0;
export function homeStairStep(plan, L, st, prevLy, lx, ly, dir) {
  const s = plan.escalier, N = plan.niveaux.length;
  const dedans = homeInStair(plan, lx, ly);
  const st2 = { volee: st && st.volee || null };
  if (L === 0) {
    if (dedans && ly < s.yHaut + HOME_STAIR_TRIG && versNord(dir)) return { st: { volee: null }, aller: { level: 1, ly: s.yHaut - 0.3 } };
    return { st: { volee: null }, aller: null };
  }
  if (L === N - 1) {
    if (dedans && ly >= s.yHaut + HOME_STAIR_DESC && versSud(dir)) return { st: { volee: "haut" }, aller: { level: L - 1, ly: s.yHaut + 0.6 } };
    return { st: { volee: null }, aller: null };
  }
  if (st2.volee === "haut") {
    if (!dedans) return { st: { volee: null }, aller: null };
    if (ly < s.yHaut + HOME_STAIR_TRIG && versNord(dir)) return { st: { volee: null }, aller: { level: L + 1, ly: s.yHaut - 0.05 } };
    return { st: st2, aller: null };
  }
  if (dedans) {
    if (prevLy != null && prevLy >= s.yPied - 0.2 && versNord(dir)) return { st: { volee: "haut" }, aller: null };
    if (ly >= s.yHaut + HOME_STAIR_DESC && prevLy != null && prevLy < s.yPied - 0.2 && versSud(dir)) return { st: { volee: null }, aller: { level: L - 1, ly: s.yHaut + 0.6 } };
  }
  return { st: st2, aller: null };
}

// ─── l'arrivée, la sortie, le lit ────────────────────────────────────────
/* On entre par la porte de la façade : juste derrière elle, au rez-de-chaussée. */
export function homeSpawnLocal(facade, plan = PLAN_ETROITE) {
  return { lx: (facade.porte[0] + facade.porte[1]) / 2, ly: plan.d - 0.4 };
}
export function homeNearExit(facade, lx, ly, plan = PLAN_ETROITE) {
  const c = (facade.porte[0] + facade.porte[1]) / 2;
  return Math.abs(lx - c) <= 0.6 && ly >= plan.d - 0.9;
}
/* ⚠️ 2026-10-17 (soir) — « bug lit, accessible depuis une autre salle » : la portée se
   mesurait en LIGNE DROITE, cloison comprise — le dressing (au nord) touche la chambre à 5 cm du lit, et
   l'invite « E : se coucher » s'y affichait derrière le mur (§4 : une condition de proximité doit mesurer ce que
   l'action mesure — on se couche ou l'on ATTEINT le lit). Il faut donc être DANS LA PIÈCE du meuble : le point de
   son emprise le plus proche de nous (rentré de 3 cm) doit y tomber, et c'est la pièce où l'on se tient. */
export function homeNearFurnitureIn(plan, L, f, lx, ly, reach = 0.65) {
  if (!homeNearFurniture(f, lx, ly, reach)) return false;
  const me = homeRoomAt(plan, L, lx, ly);
  if (!me) return false;
  const [x0, y0, x1, y1] = homeFurnitureRect(f);
  const px = Math.min(Math.max(lx, x0 + 0.03), x1 - 0.03), py = Math.min(Math.max(ly, y0 + 0.03), y1 - 0.03);
  const it = homeRoomAt(plan, L, px, py);
  return !!it && it.id === me.id;
}
export function homeNearFurniture(f, lx, ly, reach = 0.65) {
  const [x0, y0, x1, y1] = homeFurnitureRect(f);
  const dx = Math.max(x0 - lx, 0, lx - x1), dy = Math.max(y0 - ly, 0, ly - y1);
  return Math.hypot(dx, dy) <= reach;
}

// ─── ce qui se dessine : les faces des murs du fond, les murs bas ───────
/* LES FACES (murs est-ouest). Chaque ligne est découpée en tronçons selon la
   pièce qui est au SUD (sa face, son papier) ET celle qui est au NORD (on coupe
   le tronçon quand on est derrière lui). `y` : le pied de la face (la surface
   sud du mur) ; `yCap` : sa surface nord (l'arase va de l'un à l'autre). Les
   portes et les fenêtres qui tombent dans un tronçon y sont rapportées. */
const faceMemo = new Map();
export function homeFaces(plan, L) {
  const key = plan.taille + "|" + L;
  if (faceMemo.has(key)) return faceMemo.get(key);
  const lv = plan.niveaux[L], out = [];
  const lines = [{ y: 0, yCap: -EP_EXT, x0: 0, x1: plan.w, ext: true, portes: [], fenetres: lv.fenetresNord || [] }];
  for (const c of lv.cloisons) if (c.y != null && !c.garde) {
    lines.push({ y: c.y + EP_INT / 2, yCap: c.y - EP_INT / 2, x0: c.x0, x1: c.x1, ext: false, portes: c.portes || [], fenetres: [] });
  }
  const STEP = 0.05;
  for (const ln of lines) {
    let cur = null;
    for (let i = 0; ln.x0 + i * STEP < ln.x1 - 1e-6; i++) {
      const x = ln.x0 + (i + 0.5) * STEP;
      const s = homeRoomAt(plan, L, x, ln.y + 0.05), n = ln.ext ? null : homeRoomAt(plan, L, x, ln.yCap - 0.05);
      const plein = lv.pleins.some((p) => x >= p.rect[0] && x < p.rect[2] && ln.y + 0.05 >= p.rect[1] && ln.y + 0.05 < p.rect[3] && p.nom === "placard");
      const sid = plein ? null : s && s.id, nid = n && n.id;
      if (!cur || cur.room !== sid || cur.roomNorth !== nid) {
        if (cur && cur.room) out.push(cur);
        cur = { x0: ln.x0 + i * STEP, x1: ln.x0 + (i + 1) * STEP, y: ln.y, yCap: ln.yCap, ext: ln.ext, room: sid, roomNorth: nid };
      } else cur.x1 = ln.x0 + (i + 1) * STEP;
    }
    if (cur && cur.room) out.push(cur);
    for (const f of out) if (f.y === ln.y && f.x0 >= ln.x0 - 1e-6 && f.x1 <= ln.x1 + 1e-6) {
      f.x0 = Math.round(f.x0 * 100) / 100; f.x1 = Math.round(f.x1 * 100) / 100;
      f.portes = (f.portes || ln.portes.filter(([a, b]) => b > f.x0 && a < f.x1));
      f.fenetres = (f.fenetres || ln.fenetres.filter(([a, b]) => b > f.x0 && a < f.x1));
    }
  }
  // Un tronçon intérieur sans pièce au nord (il longe le bout d'une cloison, 10 cm) se recolle à son voisin.
  for (let i = out.length - 1; i >= 0; i--) {
    const f = out[i];
    if (f.ext || f.roomNorth) continue;
    const nb = out.find((g) => g !== f && g.y === f.y && g.room === f.room && (Math.abs(g.x0 - f.x1) < 1e-6 || Math.abs(g.x1 - f.x0) < 1e-6));
    if (!nb) continue;
    nb.x0 = Math.min(nb.x0, f.x0); nb.x1 = Math.max(nb.x1, f.x1);
    out.splice(i, 1);
  }
  out.forEach((f, i) => { f.id = L + ":" + i; f.y = Math.round(f.y * 1000) / 1000; });
  faceMemo.set(key, out);
  return out;
}
/* LES MURS BAS (coupés à 35 cm) : les murs nord-sud, les garde-corps, la
   façade. `key` de tri : leur bord sud. */
export function homeLows(plan, L, facade) {
  const lv = plan.niveaux[L], { w, d } = plan, e = EP_EXT, h = EP_INT / 2, out = [];
  // Les murs extérieurs est et ouest sont DEBOUT et évasés (`maisonArt.paintSideFaces`, cuits avec le sol) :
  // seule leur tranche avant (le pilier au coin de la façade) se trie avec le reste.
  out.push({ kind: "pilier", ext: true, rect: [-e, d - 0.01, 0, d + e] });
  out.push({ kind: "pilier", ext: true, rect: [w, d - 0.01, w + e, d + e] });
  for (const c of lv.cloisons) {
    if (c.x != null) for (const [a, b] of splitGaps(c.y0, c.y1, c.portes)) out.push({ kind: c.garde ? "garde" : "mur", rect: [c.x - h, a, c.x + h, b] });
    else if (c.garde) out.push({ kind: "garde", rect: [c.x0, c.y - h, c.x1, c.y + h] });
  }
  out.push({ kind: "facade", rect: [-e, d, w + e, d + e], porte: L === 0 && facade ? facade.porte : null,
             fenetres: facade ? facade.fenetres[L] || [] : [] });
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════
   ║ LOT 2a (2026-10-16) — LA MAISON DE CHACUN : MEUBLES POSÉS, GARDE-MEUBLE,
   ║ DÉCOR DES PIÈCES. Cadrage : docs/PROJETS.md §6 (ses huit réponses).
   ╚════════════════════════════════════════════════════════════════════════
   ⚠️ L'ÉTAT VIT DANS LE JSON DE `ferme_saves` (`shared.homes[playerId]`),
   comme la garde-robe : AUCUNE MIGRATION. Champ absent = la maison de départ
   (`homeOf`). L'hôte arbitre chaque geste (`resolveHome*`), le client ne fait
   que demander ; l'or est la caisse commune (décision 3).
   Forme : { m: [{ u, s, o, n, x, y }], g: [{ u, s }], d: { "n:pièce": { p, l, sol } }, k }
     u : identifiant du meuble (unique dans la maison) ; s : son sprite
     (`MEUBLES`, variante comprise : "canape_canard") ; o : S/E/N/W ; n : le
     niveau ; x, y : le coin NORD-OUEST de l'emprise, en VINGTIÈMES DE CASE
     (entiers, 6 cm — jamais de flottant qui dériverait d'une sauvegarde à
     l'autre) ; k : le prochain identifiant.
     ⚠️ LE GESTE SE FAIT AU QUART DE CASE (30 cm, décision 2), MAIS UN MEUBLE SE
     PLAQUE CONTRE LE MUR À MOINS DE 20 CM (`homeSnap`). Premier jet au quart
     pur : les cloisons tombent à 3,55 ou 4,35 cases, jamais sur un quart —
     aucun meuble ne pouvait toucher un mur, et le lit de départ, ramené sur la
     grille, mordait dans la cloison de la chambre (`verify-maison`, §7).
     d : le décor d'une pièce (p : papier, l : lambris ou "" pour aucun,
     sol : "motif:variante") ; absent = celui du plan (`PLAN_ETROITE`). */
export const HOME_Q = 20;                        // vingtièmes de case (le stockage)
export const HOME_STEP = 0.25;                   // le pas du geste : un quart de case
export const HOME_MAGNET = 0.2;                  // l'aimant des murs, en cases
export const HOME_DECOR = {
  papier: ["platre", "rayures", "fleurs", "toile_bleue", "vert_anglais", "damas", "pois"],
  lambris: ["", "creme", "sauge", "bleu", "bois", "faience"],
  sol: ["parquet:chene", "parquet:miel", "parquet:noyer", "parquet:blanchi", "parquet:brut", "ciment:classique", "ciment:bleu", "tomettes:rouge", "carreaux:blanc"],
};
/* Le prix d'un changement, pièce par pièce (décision 4), à l'échelle de la
   garde-robe (décision 8 : chapeaux et tenues de 1 200 à 14 000 or). */
export const HOME_DECOR_PRIX = { papier: 1500, lambris: 1000, sol: 2500 };

/* LA VERSION DU PLAN sur laquelle les positions d'une maison sont écrites
   (`pv`). Absente = 1, le plan de 7 cases du 2026-10-16 ; 2 = le plan de 9
   (2026-10-17) ; 3 = le même avec ses équipements (cuisine, bains, cheminée). Une maison d'une autre version est recalée par `migrateHome`,
   au CHARGEMENT de la sauvegarde (FermeGame.js) — jamais à chaque image. */
export const HOME_PLAN_V = 3;   // 3 (2026-10-17, le soir) : les équipements entrent dans le plan
export function homeDepart() {
  let k = 1;
  return { m: HOME_DEPART.map((f) => ({ u: k++, s: f.sprite, o: f.o, n: f.niveau, x: Math.round(f.lx * HOME_Q), y: Math.round(f.ly * HOME_Q) })), g: [], d: {}, k, pv: HOME_PLAN_V };
}
/* La maison d'un joueur, telle quelle (jamais modifiée ici). */
export function homeOf(homes, id) {
  const h = homes && homes[id];
  return h && Array.isArray(h.m) ? h : homeDepart();
}
/* 2026-10-17 — RECALER UNE MAISON ÉCRITE SUR LE PLAN DE 7 CASES. Les pièces
   du sud ont reculé (séjour, entrée, chambre : +1 case ; le dressing +0,4 ; le
   sud des combles +2, le flanc de la trémie +1) ; chaque meuble suit la bande
   où tombait le centre de son emprise, puis il est REPOSÉ par la règle de
   l'hôte (`homeCanPlace`) dans l'ordre : celui qui ne trouve plus sa place
   part au garde-meuble, rien ne se perd. ⚠️ La façade réelle n'est pas connue
   au chargement (elle dépend du propriétaire) : la règle se juge contre la
   façade par défaut — seul le point d'arrivée de la porte en dépend, à
   quelques décimètres près. Pure : rend une maison neuve. */
const PV1_BANDES = [
  [[3.5, 1.0]],                        // rdc : y ≥ 3,5 → +1
  [[4.3, 1.0], [2.4, 0.4]],            // étage : chambre +1, dressing +0,4
  [[3.5, 2.0], [1.0, 1.0]],            // combles : le sud +2, le flanc de la trémie +1
];
export function migrateHome(h) {
  if (!h || !Array.isArray(h.m) || h.pv === HOME_PLAN_V) return h;
  /* Le recalage des bandes ne vaut que pour le plan de 7 ; depuis le plan de 9, une
     version de plus (les équipements) ne déplace rien : on REPOSE seulement, et ce qui
     tombe sur un équipement part au garde-meuble. */
  const decale = !(h.pv >= 2);
  const out = homeClone(h);
  out.pv = HOME_PLAN_V;
  if (!Array.isArray(out.g)) out.g = [];
  if (!out.d || typeof out.d !== "object") out.d = {};
  const fac = homeFacade(null), poses = out.m;
  out.m = [];
  for (const it of poses) {
    const [, y0, , y1] = homeItemRect(it), yc = (y0 + y1) / 2;
    const b = decale && (PV1_BANDES[it.n] || []).find(([seuil]) => yc >= seuil);
    const cand = { ...it, y: it.y + Math.round((b ? b[1] : 0) * HOME_Q) };
    if (homeCanPlace(PLAN_ETROITE, fac, out, cand).ok) out.m.push(cand);
    else out.g.push({ u: it.u, s: it.s });
  }
  return out;
}
export function migrateHomes(homes) {
  if (!homes || typeof homes !== "object") return {};
  const out = {};
  for (const [id, h] of Object.entries(homes)) out[id] = migrateHome(h);
  return out;
}
/* Un meuble posé, dans le repère du plan (cases). */
export const homeItemLx = (it) => it.x / HOME_Q;
export const homeItemLy = (it) => it.y / HOME_Q;
export function homeItemRect(it) {
  const s = MEUBLES[it.s] && MEUBLES[it.s][it.o];
  const fw = s ? s.fw / CASE_M : 1, fd = s ? s.fd / CASE_M : 1;
  const x = homeItemLx(it), y = homeItemLy(it);
  return [x, y, x + fw, y + fd];
}
export const homeFlat = (s) => /^tapis/.test(s);
export const homeWallItem = (s) => /^tableau/.test(s);   // les objets de mur : lot 2c (jamais posés au sol)
export const homeOrients = (s) => ["S", "E", "N", "W"].filter((o) => MEUBLES[s] && MEUBLES[s][o]);
/* Les meubles d'un niveau, au format de `homeDrawItems` / `homeSolids`. */
export function homeMeublesAt(home, L) {
  return home.m.filter((it) => it.n === L).map((it) => ({ id: it.s, u: it.u, sprite: it.s, o: it.o, niveau: it.n, lx: homeItemLx(it), ly: homeItemLy(it) }));
}
/* Le décor d'une pièce : celui que le joueur a choisi, sinon celui du plan. */
export function homeRoomDecor(home, plan, L, pieceId) {
  const base = plan.niveaux[L].pieces.find((p) => p.id === pieceId);
  const d = home && home.d && home.d[L + ":" + pieceId];
  if (!base) return null;
  return {
    sol: d && d.sol ? d.sol.split(":") : base.sol,
    murs: { papier: d && d.p ? d.p : base.murs.papier, lambris: d && d.l !== undefined ? (d.l || null) : base.murs.lambris },
  };
}
/* Le plan d'un niveau habillé du décor du joueur (un plan neuf, jamais le
   plan de référence modifié — §4, « un étalement recopie les références »). */
export function homePlanDecore(home, plan = PLAN_ETROITE) {
  if (!home || !home.d || !Object.keys(home.d).length) return plan;
  return { ...plan, niveaux: plan.niveaux.map((lv, L) => ({ ...lv,
    pieces: lv.pieces.map((p) => { const dd = homeRoomDecor(home, plan, L, p.id); return { ...p, sol: dd.sol, murs: dd.murs }; }) })) };
}
export const homeDecorKey = (home) => JSON.stringify((home && home.d) || {});

/* OÙ TOMBE UN MEUBLE QU'ON TIENT : son centre suit le pointeur (lx, ly), au
   quart de case ; puis chaque bord à moins de `HOME_MAGNET` d'un mur s'y plaque.
   Rend { x, y } en vingtièmes (le coin nord-ouest de l'emprise). */
export function homeSnap(plan, facade, L, s, o, lx, ly) {
  const m = MEUBLES[s] && MEUBLES[s][o];
  const fw = m ? m.fw / CASE_M : 1, fd = m ? m.fd / CASE_M : 1;
  let x = Math.round((lx - fw / 2) / HOME_STEP) * HOME_STEP, y = Math.round((ly - fd / 2) / HOME_STEP) * HOME_STEP;
  const murs = homeSolids(plan, L, facade, []);
  let bx = null, by = null, sx = 0, sy = 0;   // sx, sy : −1 plaqué à un mur à sa gauche (en haut), +1 à sa droite (en bas)
  for (const [x0, y0, x1, y1] of murs) {
    const recY = y + fd > y0 - 0.3 && y < y1 + 0.3, recX = x + fw > x0 - 0.3 && x < x1 + 0.3;
    if (recY) {
      if (Math.abs(x - x1) < HOME_MAGNET && (bx === null || Math.abs(x - x1) < Math.abs(x - bx))) { bx = x1; sx = -1; }
      if (Math.abs(x + fw - x0) < HOME_MAGNET && (bx === null || Math.abs(x + fw - x0) < Math.abs(x - bx))) { bx = x0 - fw; sx = 1; }
    }
    if (recX) {
      if (Math.abs(y - y1) < HOME_MAGNET && (by === null || Math.abs(y - y1) < Math.abs(y - by))) { by = y1; sy = -1; }
      if (Math.abs(y + fd - y0) < HOME_MAGNET && (by === null || Math.abs(y + fd - y0) < Math.abs(y - by))) { by = y0 - fd; sy = 1; }
    }
  }
  if (bx !== null) x = bx;
  if (by !== null) y = by;
  /* LE MEUBLE BUTE CONTRE LE MUR : poussé au-delà (le pointeur passé de l'autre
     côté d'une cloison), il est ramené du côté le plus proche au lieu d'y entrer. */
  const touche = (xx, yy) => murs.some(([x0, y0, x1, y1]) => xx + fw > x0 + 1e-6 && xx < x1 - 1e-6 && yy + fd > y0 + 1e-6 && yy < y1 - 1e-6);
  if (touche(x, y)) {
    /* Les dégagements possibles : contre chaque bord de chaque mur touché ; on
       garde le plus court qui libère de TOUS les murs (un lit de profil à cheval
       sur une porte faisait du ping-pong entre les deux bouts de cloison). */
    let best = null;
    for (const [x0, y0, x1, y1] of murs) {
      if (!(x + fw > x0 + 1e-6 && x < x1 - 1e-6 && y + fd > y0 + 1e-6 && y < y1 - 1e-6)) continue;
      for (const [dx, dy, ssx, ssy] of [[x0 - fw - x, 0, 1, 0], [x1 - x, 0, -1, 0], [0, y0 - fd - y, 0, 1], [0, y1 - y, 0, -1]]) {
        const d2 = Math.abs(dx) + Math.abs(dy);
        if (!touche(x + dx, y + dy) && (!best || d2 < best.d2)) best = { dx, dy, ssx, ssy, d2 };
      }
    }
    if (best) { x += best.dx; y += best.dy; if (best.ssx) sx = best.ssx; if (best.ssy) sy = best.ssy; }
  }
  /* ⚠️ VU EN JEU (2026-10-16) : plaqué au mur est, un figuier ramené au vingtième
     le plus proche dépassait de 2 cm dans le mur (« hors de la pièce »). On
     arrondit VERS L'INTÉRIEUR : à l'opposé du mur contre lequel on s'est plaqué. */
  const q = (v, side) => (side > 0 ? Math.floor(v * HOME_Q + 1e-6) : side < 0 ? Math.ceil(v * HOME_Q - 1e-6) : Math.round(v * HOME_Q));
  return { x: q(x, sx), y: q(y, sy) };
}

// ─── la règle de pose ─────────────────────────────────────────────────────
const inter = (a, b) => a[2] > b[0] + 1e-6 && a[0] < b[2] - 1e-6 && a[3] > b[1] + 1e-6 && a[1] < b[3] - 1e-6;
/* Les seuils des portes d'un niveau : 45 cm de part et d'autre de chaque
   ouverture, qu'aucun meuble debout ne doit couvrir. */
export function homeDoorClearances(plan, L) {
  const out = [], c0 = 0.45;
  for (const c of plan.niveaux[L].cloisons) for (const [a, b] of c.portes || []) {
    if (c.x != null) out.push([c.x - c0, a, c.x + c0, b]);
    else out.push([a, c.y - c0, b, c.y + c0]);
  }
  return out;
}
/* Les points qu'il faut pouvoir atteindre à un niveau : l'arrivée (porte ou
   escalier), les départs d'escalier — et, à vérifier par l'appelant, chaque pièce. */
export function homeKeyPoints(plan, L, facade) {
  const s = plan.escalier, N = plan.niveaux.length;
  const pts = [];
  if (L === 0) { const sp = homeSpawnLocal(facade, plan); pts.push([sp.lx, sp.ly], [0.45, s.yHaut + HOME_STAIR_TRIG - 0.05]); }
  if (L > 0) pts.push([0.45, s.yHaut - (L === N - 1 ? 0.05 : 0.3)]);
  if (L > 0 && L < N - 1) pts.push([0.45, s.yPied + 0.4]);
  return pts;
}
/* PEUT-ON POSER `cand` ({ s, o, n, x, y } en quarts) parmi `meubles` (la
   maison, sans `cand` s'il y était déjà) ? Rend { ok, raison }. La même
   fonction pour la grille du joueur (vert / rouge) et pour l'hôte (qui tranche). */
export function homeCanPlace(plan, facade, home, cand, ignoreU = null) {
  const L = cand.n;
  if (!MEUBLES[cand.s] || !MEUBLES[cand.s][cand.o] || homeWallItem(cand.s) || cand.s === "escalier" || homeFixe(cand.s)) return { ok: false, raison: "sprite" };
  if (L < 0 || L >= plan.niveaux.length) return { ok: false, raison: "niveau" };
  if (!Number.isInteger(cand.x) || !Number.isInteger(cand.y)) return { ok: false, raison: "grille" };
  const r = homeItemRect(cand);
  if (r[0] < -1e-6 || r[1] < -1e-6 || r[2] > plan.w + 1e-6 || r[3] > plan.d + 1e-6) return { ok: false, raison: "dehors" };
  const s = plan.escalier;
  if (inter(r, [s.x0, s.yHaut - (L > 0 ? 1.0 : 0), s.x1 + EP_INT, s.yPied + (L < plan.niveaux.length - 1 ? 0.5 : 0)])) return { ok: false, raison: "escalier" };
  const murs = homeSolids(plan, L, facade, [], false);
  if (murs.some((w) => inter(r, w))) return { ok: false, raison: "mur" };
  // le centre de l'emprise doit être dans une pièce (pas sous la pente des combles)
  const pc = homeRoomAt(plan, L, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
  if (!pc || pc.id === "cage") return { ok: false, raison: "dehors" };
  // 2026-10-17 : les équipements de la maison (un tapis ne se glisse pas sous une cuisine non plus)
  const fixes = homeFixes(plan, L, facade).map(homeFurnitureRect);
  if (fixes.some((w) => inter(r, w))) return { ok: false, raison: "equipement" };
  if (homeFlat(cand.s)) return { ok: true, raison: null };
  const autres = home.m.filter((it) => it.n === L && it.u !== ignoreU && !homeFlat(it.s));
  if (autres.some((it) => inter(r, homeItemRect(it)))) return { ok: false, raison: "meuble" };
  if (homeDoorClearances(plan, L).some((c) => inter(r, c))) return { ok: false, raison: "porte" };
  // ⚠️ LE PASSAGE : toutes les pièces et tous les points d'arrivée restent atteignables
  // (le remplissage de `verify-maison`, devenu une règle de jeu — décision 2).
  const sol = [...murs, ...fixes, ...autres.map(homeItemRect), r];
  if (!homeReachableAll(plan, L, facade, sol)) return { ok: false, raison: "passage" };
  return { ok: true, raison: null };
}
export function homeReachableAll(plan, L, facade, sol) {
  const S = 0.1, seen = new Set(), q = [];
  const pts = homeKeyPoints(plan, L, facade);
  const start = pts.find(([x, y]) => homeBoxFree(sol, x, y));
  if (!start) return false;
  const i0 = Math.round(start[0] / S), j0 = Math.round(start[1] / S);
  seen.add(i0 + "," + j0); q.push([i0, j0]);
  while (q.length) {
    const [i, j] = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, k = ni + "," + nj;
      if (seen.has(k) || ni < 0 || nj < 0 || ni > plan.w / S || nj > plan.d / S) continue;
      if (!homeBoxFree(sol, ni * S, nj * S)) continue;
      seen.add(k); q.push([ni, nj]);
    }
  }
  const atteint = (x, y, rr = 0.25) => { for (const k of seen) { const [i, j] = k.split(",").map(Number); if (Math.abs(i * S - x) <= rr && Math.abs(j * S - y) <= rr) return true; } return false; };
  for (const [x, y] of pts) if (!atteint(x, y)) return false;
  const rooms = new Set();
  for (const k of seen) { const [i, j] = k.split(",").map(Number); const p = homeRoomAt(plan, L, i * S, j * S); if (p) rooms.add(p.id); }
  return plan.niveaux[L].pieces.every((p) => p.id === "cage" || rooms.has(p.id));
}

// ─── les résolveurs de l'hôte (purs : ils modifient `home`, rendent un verdict) ───
/* POSER ou DÉPLACER : `req` = { u, o, n, x, y }. Le meuble vient du garde-meuble
   (il en sort) ou de la maison (il se déplace). */
export function resolveHomePlace(home, req, plan, facade) {
  const u = req.u | 0;
  const posed = home.m.find((it) => it.u === u), stored = home.g.find((it) => it.u === u);
  if (!posed && !stored) return { ok: false, raison: "inconnu" };
  const cand = { u, s: (posed || stored).s, o: String(req.o), n: req.n | 0, x: req.x | 0, y: req.y | 0 };
  const v = homeCanPlace(plan, facade, home, cand, u);
  if (!v.ok) return v;
  if (posed) Object.assign(posed, { o: cand.o, n: cand.n, x: cand.x, y: cand.y });
  else { home.g = home.g.filter((it) => it.u !== u); home.m.push(cand); }
  return { ok: true };
}
/* RANGER au garde-meuble. */
export function resolveHomeStore(home, req) {
  const u = req.u | 0, it = home.m.find((x) => x.u === u);
  if (!it) return { ok: false, raison: "inconnu" };
  home.m = home.m.filter((x) => x.u !== u);
  home.g.push({ u, s: it.s });
  return { ok: true };
}
/* CHANGER le papier, le lambris ou le sol d'une pièce : `req` = { n, piece, quoi, val }.
   Rend { ok, prix } — l'appelant (l'hôte) débite la caisse commune. */
export function resolveHomeDecor(home, req, plan) {
  const L = req.n | 0, quoi = String(req.quoi), val = String(req.val);
  const lv = plan.niveaux[L];
  if (!lv || !HOME_DECOR[quoi] || !HOME_DECOR[quoi].includes(val)) return { ok: false, raison: "catalogue" };
  const pc = lv.pieces.find((p) => p.id === req.piece);
  if (!pc || pc.id === "cage") return { ok: false, raison: "piece" };
  const cur = homeRoomDecor(home, plan, L, pc.id);
  const now = quoi === "papier" ? cur.murs.papier : quoi === "lambris" ? (cur.murs.lambris || "") : cur.sol.join(":");
  if (now === val) return { ok: false, raison: "deja" };
  const key = L + ":" + pc.id;
  const d = home.d[key] || (home.d[key] = {});
  if (quoi === "papier") d.p = val; else if (quoi === "lambris") d.l = val; else d.sol = val;
  return { ok: true, prix: HOME_DECOR_PRIX[quoi] };
}
/* Le menu développeur : un exemplaire de chaque meuble au garde-meuble (le
   catalogue est le lot 2b). Jamais l'escalier, qui vient avec la maison. */
export function resolveHomeGift(home) {
  const base = Object.keys(MEUBLES).filter((s) => s !== "escalier" && !/_allume$/.test(s) && !homeWallItem(s) && !homeFixe(s));
  for (const s of base) home.g.push({ u: home.k++, s });
  return { ok: true, n: base.length };
}
/* Une copie profonde (l'hôte travaille sur une copie, la diffuse, puis la garde). */
export const homeClone = (h) => JSON.parse(JSON.stringify(h));
