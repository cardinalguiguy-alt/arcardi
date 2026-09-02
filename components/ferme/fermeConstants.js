/* ==========================================================================
   FERME VALLÉE (jeu 22) — constantes partagées client/hôte.
   Portées telles quelles depuis la maquette validée (shared/constants.js du
   prototype autonome), en module ES pour ARCARDI. Aucune valeur de gameplay
   n'a été modifiée par rapport à la maquette.

   ⚠️ ZIP 440 — CE FICHIER IMPORTE `planche.js`, ET C'EST DÉLIBÉRÉ. Certaines
   grandeurs de CARTE sont en réalité des grandeurs de DESSIN : la portée d'un
   pont est la largeur de son ouvrage, l'emprise d'une clôture est la largeur de
   son sprite. Les écrire ici « à la valeur qu'on a mesurée sur la planche »
   serait le paramètre qui double un autre paramètre du §8 de CLAUDE.md —
   c'est-à-dire une divergence en attente, et on l'a payée (voir
   TOWN_BRIDGE_SPAN). `planche.js` est de la DONNÉE pure, sans effet de bord et
   sans dépendance : l'importer ne coûte rien à personne, et les bancs suivent
   déjà les imports de proche en proche depuis le 439.
   ========================================================================== */
import { PLANCHE } from "./planche";
import { PLANCHE2 } from "./planche2";   // 447

// --- Carte ---
export const MAP_W = 180;   // largeur en tuiles
export const MAP_H = 140;   // hauteur en tuiles
export const TILE = 16;     // taille d'une tuile en px (avant zoom)

// Types de sol
export const G_GRASS = 0;
export const G_TILLED = 1;   // labouré (sec)
export const G_WATERED = 2;  // labouré + arrosé
export const G_WATER = 3;    // rivière
export const G_SAND = 4;     // berge
export const G_BRIDGE = 5;   // pont en bois
export const G_PATH = 6;     // chemin devant la maison (fixe, jamais retirable par un joueur)
export const G_PATH_STONE = 7; // chemin dallé posé/retiré par les joueurs (construction, coûte de la pierre) ;
                                // rendu visuellement IDENTIQUE au chemin fixe (même sprite), mais un type de
                                // sol distinct pour ne jamais pouvoir "miner" le chemin fixe de la maison/du puits.
export const G_BRIDGE_SITE = 8; // site de pont à construire (chantier 2026-07) : case de rivière/berge, aux 2
                                 // emplacements fixes de traversée, pas encore bâtie. Bloque le passage comme
                                 // G_WATER tant qu'elle n'est pas construite (voir blockedTile). Une fois payée
                                 // (bois OU pierre, voir BRIDGE_COST_WOOD/BRIDGE_COST_STONE), devient G_BRIDGE,
                                 // définitivement (pas de retrait, pour ne jamais piéger un joueur en pleine
                                 // rivière en retirant la case sous ses pieds).
export const G_BRIDGE_CLOSED = 9; // pont FERMÉ via le levier (chantier 2026-07, demande Guillaume : "les ponts
                                   // doivent pouvoir être refermés et ouverts à l'aide d'un levier", pensé pour
                                   // bloquer plus tard des ennemis/animaux dangereux sur la rive droite). Même
                                   // pont qu'un G_BRIDGE construit (le pont lui-même reste PERMANENT, jamais
                                   // retiré/remboursé) : seul cet état de passage bascule, G_BRIDGE <-> 
                                   // G_BRIDGE_CLOSED, via resolveAct cas "lever". Bloque le passage comme
                                   // G_WATER tant qu'il n'est pas rouvert (voir blockedTile).
export const G_GRASS_GROWING = 10; // herbe en train de repousser sur une case labourée (chantier 2026-07,
                                    // demande Guillaume : pouvoir "reverse to the original state of grass").
                                    // Posée avec l'outil Construction (variante "grass", herbe achetée à la
                                    // boutique, voir GRASS_COST), sur du sol G_TILLED uniquement. Même "modèle
                                    // Clash of Clans" que lampadaire/épouvantail (voir BUILD_TIMES.grass,
                                    // 5 secondes réelles) : redevient G_GRASS TOUT SEUL une fois le délai
                                    // écoulé (vérifié côté hôte à chaque tick, pas d'action du joueur requise,
                                    // voir FermeGame.js). Ne bloque pas le passage (comme G_TILLED). Définitif,
                                    // pas de retrait une fois planté.
export const G_BRIDGE_STONE = 11; // case de pont RÉNOVÉE en pierre (chantier 2026-07, demande Guillaume : le pont
                                   // bois, une fois entièrement construit, perd 2 cases aléatoires par nuit — voir
                                   // BRIDGE_DECAY_PER_NIGHT — "car il est en bois" ; la rénovation en pierre change
                                   // l'aspect ET rend la case résistante, elle n'est plus jamais tirée par la
                                   // dégradation nocturne). Posée case par case sur une case déjà en G_BRIDGE (ou
                                   // G_BRIDGE_CLOSED), PAS sur un chantier G_BRIDGE_SITE : contrairement à la
                                   // construction initiale, la rénovation améliore une structure bois déjà en
                                   // place plutôt que de la refaire de zéro (voir resolveAct cas "renovateBridge").
                                   // Ouverte/fermable au levier comme G_BRIDGE, voir G_BRIDGE_STONE_CLOSED.
export const G_BRIDGE_STONE_CLOSED = 12; // pont rénové en pierre, FERMÉ via le levier (même principe que
                                          // G_BRIDGE_CLOSED, mais pour une case déjà rénovée : le levier bascule
                                          // chaque case selon SON matériau propre, G_BRIDGE<->G_BRIDGE_CLOSED ou
                                          // G_BRIDGE_STONE<->G_BRIDGE_STONE_CLOSED, voir resolveAct cas "lever").
export const G_DARK_PASSAGE = 13; // "passage sombre" (chantier 2026-07, demande Guillaume) : case unique posée en
                                   // rive droite, près de la limite nord de la carte (voir generateWorld ->
                                   // world.darkPassage, position dépendant de la seed puisque calculée depuis
                                   // riverCenter, jamais un point fixe en dur). Marche dessus = déclenche le fondu
                                   // au noir + téléportation SOLO vers la carte maléfique (voir enterDarkPassage/
                                   // tryOpenNearby côté FermeGame.js). Rendu volontairement sombre (voir drawTile)
                                   // pour se distinguer du reste du décor.
export const G_RUN_GATE = 14;      // zip 372 : point de déclenchement du défi de fuite, bord EST des cartes du
                                   // passage sombre. Position fixe C.RUN_GATE, identique sur les cinq mondes.
                                   // ZIP 375 : ce n'est plus un coffre/brasier posé sur l'herbe mais une dalle
                                   // de la jetée, au-dessus du lac (voir G_RUN_JETTY).
                                   // ⚠ ZIP 378 — PLUS AUCUN RENDU PROPRE (décision Guillaume : « plus de porte
                                   // visible, mais l'effet reste le même, et localisé au même endroit »). La
                                   // case se dessine EXACTEMENT comme une dalle de chaussée : ni brasiers, ni
                                   // gravures, ni lueur. Le type reste distinct parce que c'est lui qui porte le
                                   // déclenchement (checkWalkOverPassage) — et le garder distinct plutôt que de
                                   // tester des coordonnées évite qu'un déplacement de la chaussée désaccorde
                                   // silencieusement le décor et la règle.
export const G_RUN_JETTY = 15;     // zip 375 : dalle de la jetée en pierres qui avance dans le lac violet de la
                                   // rive est, et depuis laquelle on lance le défi de fuite. C'est une
                                   // réduction 2D de la chaussée du jeu de fuite (dalles fissurées, bordures
                                   // moussues, torches), pour que le décor annonce le défi avant qu'il commence.
                                   // Sol PRATICABLE : blockedEvil ne bloque que G_WATER, donc une dalle posée
                                   // sur l'eau se traverse — c'est tout l'intérêt d'un identifiant distinct.
export const G_LAKE_SHORE = 16;    // zip 375 : berge du lac. Bande de galets moussus entre l'herbe et l'eau, sur
                                   // laquelle on marche normalement. Elle sert au FONDU demandé : sans elle, le
                                   // lac s'arrête sur une ligne franche de cases, et aucun dégradé de rendu ne
                                   // rattrape une silhouette en escalier.
export const G_RUN_KERB = 17;      // zip 378 : BORDURE de la chaussée. Les blocs bas façon sarcophage du défi 3D,
                                   // rangée extérieure de part et d'autre des trois voies praticables. Elle BLOQUE
                                   // (voir blockedEvil) — mais elle ne retire aucun passage au joueur : c'était de
                                   // l'eau avant, qui bloquait déjà. On ne change donc que ce qu'il VOIT, jamais où
                                   // il peut aller, et l'ancienne géométrie de l'embuscade reste valide mot pour mot.

export const G_TOWN_STAIR = 18;    // zip 425 : marche d'escalier de Valley Town. ⚠️ ELLE N'EXISTE QUE SUR LA CARTE
                                   // DE LA VILLE, qui est REGÉNÉRÉE à chaque visite et n'est jamais persistée — c'est
                                   // ce qui autorise à ajouter une valeur de sol sans aucune migration. Une nouvelle
                                   // valeur sur la carte de FERME, elle, obligerait à relire toutes les sauvegardes.
                                   // Son rôle est double : elle se DESSINE en marches, et elle AUTORISE le changement
                                   // de niveau (voir TOWN_STEP_MAX) — les deux vont ensemble, un escalier qu'on ne
                                   // voit pas est un mur invisible et un escalier qui ne monte pas est un décor.
export const G_TOWN_LAWN = 19;     // zip 425 : pelouse tondue des squares et parterres de la place centrale. Purement
                                   // visuelle (elle ne bloque pas), mais elle sépare le « jardin » du simple herbage
                                   // sauvage : sans elle, une place « soignée » n'a aucun moyen de le montrer.

// Objets
export const O_NONE = 0;
export const O_TREE = 1;
export const O_ROCK = 2;
export const O_HOUSE = 3;   // tuiles bloquées par la maison
export const O_SHOP = 4;    // étal de la boutique
export const O_BIN = 5;     // bac de vente
export const O_STUMP = 6;   // souche (reste d'arbre)
export const O_TREE2 = 7;   // variante d'arbre (pin)
export const O_WELL = 8;    // puits (bâtiment achetable, 2e point de téléport)
export const O_FENCE = 9;   // section de clôture, orientation automatique (voisinage)
export const O_FENCE_H = 10; // section de clôture, orientation FORCÉE horizontale (touche R)
export const O_FENCE_V = 11; // section de clôture, orientation FORCÉE verticale (touche R)
export const O_WALL = 12;    // mur en pierre, construit par les joueurs (bloque le passage, pas d'orientation)
export const O_LAMP = 13;    // lampadaire, achetable et posé par les joueurs (éclaire la nuit, bloque le passage)
export const O_SCARECROW = 14; // épouvantail, achetable et posé par les joueurs (chantier 2026-07, contre les oiseaux -
                                // pas encore implémentés ; ne bloque pas le passage, posé au milieu des cultures)
export const O_LEVER = 15;     // levier d'un pont (chantier 2026-07, demande Guillaume) : posé AUTOMATIQUEMENT sur
                                // la berge, côté maison, dès qu'une traversée de pont est ENTIÈREMENT construite
                                // (voir generateWorld pour l'emplacement réservé, resolveAct cas "bridge" pour la
                                // pose automatique). Cliquable directement (aucun outil à équiper, aucun coût),
                                // voir resolveAct cas "lever". Ne bloque PAS le passage lui-même (comme
                                // l'épouvantail) : seul le pont qu'il commande se ferme/s'ouvre.
export const O_MILL = 16;      // moulin (chantier 2026-07, demande Guillaume : "transformation artisanale",
                                // premier bâtiment de la famille four/fût/presse/moulin). Achetable/posable comme
                                // le lampadaire (voir MILL_COST/BUILD_TIMES.mill ci-dessous), bloque le passage une
                                // fois construit. Transforme en continu le blé déposé en sacs de farine, voir
                                // resolveAct cas "mill"/"millDeposit" et E.millTick (fermeEngine.js).
export const O_TREE_DEAD = 17; // arbre mort, sans feuilles (chantier 2026-07, demande Guillaume : ambiance de
                                // la carte maléfique) — réservé à generateEvilWorld, jamais posé côté ferme normale.
export const O_CAULDRON = 18;  // chaudron (chantier 2026-07, demande Guillaume : "le chaudron doit être récupéré
                                // dans le monde maléfique et ramené [...] on peut le placer où on veut sur la
                                // map [...] utilisable automatiquement"). Objet POSABLE côté ferme normale, même
                                // mécanique que O_MILL (outil Construction, variante "cauldron", chantier réel
                                // avant d'être fonctionnel, voir BUILD_TIMES.cauldron) — mais jamais achetable :
                                // il faut d'abord le ramasser sur la carte maléfique (voir EVIL_CAULDRON_SPAWN),
                                // une seule fois pour toute la ferme (voir s.cauldron, fermeEngine.js/FermeGame.js).
export const O_SUCRERIE = 19;  // sucrerie (chantier canne à sucre) — tile world.objects LEGACY (zips 317-324).
                                // Chantier "sucrerie déplaçable" (2026-07) : la sucrerie a rejoint le modèle
                                // des autres bâtiments d'artisans (C.ARTISAN_BUILDINGS.sucrerie / crafts.sucrerie),
                                // achetable/déplaçable comme la ruche/fromagerie/boulangerie/scierie — plus aucune
                                // NOUVELLE pose ne crée ce tile. Il ne sert plus qu'à retrouver/convertir une
                                // sucrerie posée par l'ANCIEN modèle sur une ferme sauvegardée avant ce chantier
                                // (voir E.clearGhostSucreries / E.migrateSucrerieToArtisan, fermeEngine.js, et
                                // C.SUCRERIE_LEGACY_SOLID_TILE, coordonnée figée de l'ancien tile solide unique).

// --- Cultures ---
// stages: 0=semis ... maxStage=récoltable ; growMs = durée RÉELLE (arrosée) pour
// mûrir, indépendante du cycle jour/nuit (voir zip 151, demande 2026-07 :
// "12h réelles pour la tomate"). navet 6h, patate 12h, tomate 12h, citrouille 18h
// (proportionnel aux anciens ratios de croissance 1/2/2/3). Prix et coûts inchangés.
const H = 60 * 60 * 1000; // 1 heure en ms, pour lisibilité des durées ci-dessous
const MIN = 60 * 1000; // 1 minute en ms, pour lisibilité des durées ci-dessous
export const CROPS = [
  { id: 0, name: "Navet",          nameEn: "Turnip",   seedName: "Graine de navet",       seedNameEn: "Turnip seeds",   growMs: 6 * H,  seedCost: 20, sell: 60,  color: "#e8d8f0", top: "#b46ee0" },
  { id: 1, name: "Pomme de terre", nameEn: "Potato",   seedName: "Graine de p. de terre", seedNameEn: "Potato seeds",   growMs: 12 * H, seedCost: 35, sell: 110, color: "#d9b380", top: "#c49a62" },
  { id: 2, name: "Tomate",         nameEn: "Tomato",   seedName: "Graine de tomate",      seedNameEn: "Tomato seeds",   growMs: 12 * H, seedCost: 50, sell: 170, color: "#e03e2e", top: "#c22b1c" },
  { id: 3, name: "Citrouille",     nameEn: "Pumpkin",  seedName: "Graine de citrouille",  seedNameEn: "Pumpkin seeds",  growMs: 18 * H, seedCost: 80, sell: 320, color: "#e8842a", top: "#cc6d14" },
  // Blé et maïs (demande Guillaume 2026-07) : pousse longue (2 jours réels),
  // même règle d'arrosage que les autres cultures (WATER_VALID_MS = 10h réelles,
  // déjà global à toutes les cultures, rien de spécifique à coder ici). Coût/prix
  // extrapolés en poursuivant la progression des cultures existantes (aucun
  // chiffre précis demandé au-delà du temps de pousse et de l'arrosage) —
  // à ajuster librement. Ajoutées SEULEMENT à la boutique : la liste CROPS
  // est entièrement pilotée par les données (boutique, inventaire, vente,
  // sprite), aucun autre fichier n'a besoin d'être modifié pour ces 2 entrées.
  { id: 4, name: "Blé",  nameEn: "Wheat", seedName: "Graine de blé",  seedNameEn: "Wheat seeds", growMs: 48 * H, seedCost: 120, sell: 480, color: "#e8d24a", top: "#c2a82a" },
  { id: 5, name: "Maïs", nameEn: "Corn",  seedName: "Graine de maïs", seedNameEn: "Corn seeds",  growMs: 48 * H, seedCost: 140, sell: 560, color: "#f0c93a", top: "#d9a91a" },
  // 2026-07 visitors update (zip 233): UNIQUE crop varieties, `unique: true`.
  // NEVER sold in the shop (the shop/Greg lists filter on this flag, and
  // resolveBuySeed refuses them): their seeds only arrive as visitor GIFTS
  // on "prep" orders (see spawnVisitor). Everything else (planting, growth,
  // sprites, selling at the bin) rides the existing data-driven pipeline.
  { id: 6, name: "Navet doré",    nameEn: "Golden turnip", seedName: "Graine de navet doré",    seedNameEn: "Golden turnip seeds", growMs: 6 * H,  seedCost: 0, sell: 260, color: "#f6d76a", top: "#e0b02a", unique: true },
  { id: 7, name: "Baie étoilée",  nameEn: "Star berry",    seedName: "Graine de baie étoilée",  seedNameEn: "Star berry seeds",    growMs: 12 * H, seedCost: 0, sell: 460, color: "#b48ef0", top: "#7a4ee0", unique: true },
  // Canne à sucre (chantier sucrerie) — extrapolée au-dessus du maïs.
  // Zip 341 (demande Guillaume : réduire un peu la durée de pousse) : 48h -> 36h.
  { id: 8, name: "Canne à sucre", nameEn: "Sugar cane", seedName: "Bouture de canne à sucre", seedNameEn: "Sugar cane cutting", growMs: 36 * H, seedCost: 160, sell: 620, color: "#7fae4a", top: "#4a7a2e" },
];
export const CROP_STAGES = 5; // 0..4, stage 4 = mûr
// Durée réelle pendant laquelle un arrosage reste valable : passé ce délai sans
// réarroser, la pousse se met en pause (elle reprend dès le prochain arrosage,
// sans perdre la progression déjà acquise).
export const WATER_VALID_MS = 10 * H;
// Indication visuelle d'humidité du sol (demande Guillaume 2026-07, remplace
// la goutte d'eau barrée) : la case arrosée reste au plus foncé pendant
// WATER_DARK_MS après l'arrosage, puis s'éclaircit progressivement jusqu'à
// retrouver sa teinte claire d'origine PILE au moment où l'arrosage expire
// (WATER_VALID_MS) — voir E.cropGrowState (champ `wetness`) et le rendu du
// sol dans FermeGame.js.
export const WATER_DARK_MS = 3 * H;
// Zip 287 (demande Guillaume : "pouvoir semer 5 graines par case, pour
// gagner de l'espace, une graine par case c'est beaucoup trop peu, ça
// étend le champ exponentiellement") : une case plantée garde maintenant un
// compteur `n` (1 à MAX_CROPS_PER_TILE, même TYPE de culture uniquement,
// voir resolveAct cas "plant"/"harvest", fermeEngine.js) — semer plusieurs
// fois sur la même case déjà plantée (même graine, tant que non mûre)
// l'incrémente au lieu d'exiger une case libre supplémentaire ; récolter
// rend n cultures d'un coup au lieu d'une seule. La pousse (durée, arrosage)
// reste UNE SEULE minuterie par case, partagée par tout ce qui y est semé —
// simplification volontaire (semer un complément en cours de pousse profite
// du temps déjà écoulé sur la case, pas de pousse séparée par graine).
// Valeur extrapolée depuis la demande ("5 graines par case").
export const MAX_CROPS_PER_TILE = 5;
// Zip 367 (demande Guillaume : "retirer l'indicateur du nombre de graines
// plantees -- les cinq carres jaunes ; il doit toujours exister mais etre plus
// discret, et ne s'afficher qu'au hover en local") : duree du fondu
// d'apparition des pips de graines, en ms. Ils ne sont plus dessines que sur la
// CASE VISEE (targetTile) et montent en opacite pendant PIP_FADE_MS tant que la
// meme case reste visee -- d'ou un survol qui revele l'info sans la faire
// clignoter quand on balaie le champ a la souris. Purement local et visuel :
// aucune incidence reseau (voir aussi PIP_ALPHA_* ci-dessous).
export const PIP_FADE_MS = 120;
// Opacites du zip 367, nettement adoucies par rapport au zip 292 (0.9 / 0.95 /
// 0.35) : l'indicateur ne se lit plus de loin sur tout le champ, il se lit de
// pres sur la seule case survolee.
export const PIP_ALPHA_FILLED = 0.55;  // graine presente, case pas encore pleine
export const PIP_ALPHA_FULL = 0.62;    // case pleine (teinte doree conservee)
export const PIP_ALPHA_EMPTY = 0.18;   // emplacement libre

// --- Gemmes rares (trouvées en cassant des rochers) ---
// Chance de tomber sur une gemme quand un rocher est détruit. Tirage pondéré :
// l'améthyste est commune, le diamant très rare. Vendues très cher au bac.
export const GEMS = [
  { id: 0, name: "Améthyste", nameEn: "Amethyst", sell: 200,  color: "#b46ee0", weight: 0.62 },
  { id: 1, name: "Émeraude",  nameEn: "Emerald",  sell: 500,  color: "#3fbf6a", weight: 0.30 },
  { id: 2, name: "Diamant",   nameEn: "Diamond",  sell: 1200, color: "#a8e8f4", weight: 0.08 },
];
export const GEM_DROP_CHANCE = 0.16; // proba de base qu'un rocher détruit lâche une gemme

// Abondance des gemmes selon la distance à la maison (demande Guillaume 2026-07) :
// "les ressources rares doivent être un peu plus abondantes quand on est très
// éloigné de la maison [...] et quasi jamais trouvable autour de la maison".
// GEM_DROP_CHANCE reste la base ; un multiplicateur est appliqué dessus selon
// la distance (en cases) au centre de la maison, interpolé linéairement entre
// les deux paliers ci-dessous puis appliqué à TOUT rocher cassé, où qu'il
// soit sur la carte (donc aussi bien sur la rive droite de la rivière que
// n'importe où ailleurs d'aussi loin de la maison — pas de règle spécifique
// à la rivière, juste une conséquence de la distance, comme demandé "par
// exemple"). Voir E.gemChanceAt(x,y) dans fermeEngine.js.
// Valeurs extrapolées (aucun chiffre précis demandé), à ajuster librement.
export const GEM_HOUSE_NEAR_RADIUS = 22; // en dessous (en cases) : gemmes quasi absentes
export const GEM_HOUSE_NEAR_MULT = 0.08; // multiplicateur appliqué à GEM_DROP_CHANCE tout près de la maison
export const GEM_HOUSE_FAR_RADIUS = 95;  // au-delà (en cases) : abondance maximale (plateau, ne monte plus)
export const GEM_HOUSE_FAR_MULT = 1.6;   // multiplicateur maximal, loin de la maison
// Zip 280 (bijouterie, demande Guillaume) : l'or est une ressource RARE
// trouvée en minant les rochers, comme les gemmes mais indépendamment (un
// rocher peut donc donner gemme ET or le même coup, ou ni l'un ni l'autre).
// Va dans le pool COMMUN gregStock.gold (même esprit que gregStock.stone),
// pas dans l'inventaire perso — cohérent avec gems/fish/animals déjà partagés.
// Zip 281 (demande Guillaume) : l'or n'est PAS réparti comme les gemmes
// (distance à la maison) — il ne se trouve QUE près de la rivière. Un
// rocher miné à GOLD_RIVER_RADIUS cases ou moins d'une case d'eau (G_WATER)
// a une chance GOLD_DROP_CHANCE de lâcher de l'or ; au-delà, aucune chance
// (0), quelle que soit la distance à la maison.
// Zip 282 (demande Guillaume : "toujours faire des pépites d'or quelque
// chose de rare") : 0.25 rendait l'or presque banal près de la rivière (1
// rocher sur 4). Ramené à 0.05 — plus rare que le diamant (la gemme la
// plus rare, poids 0.08 dans C.GEMS), cohérent avec le statut de ressource
// précieuse de l'or.
export const GOLD_DROP_CHANCE = 0.05;
// Zip 284 (demande Guillaume : "la proximité de la rivière pour les pépites
// d'or doit être plus large") : passé de 4 à 8 cases — deux fois plus de
// rochers autour de la rivière comptent désormais comme "près de l'eau"
// pour la chance d'or, sans toucher aux chances elles-mêmes (GOLD_DROP_CHANCE/
// GOLD_EXTREME_CHANCE inchangées).
export const GOLD_RIVER_RADIUS = 8; // en cases, autour du rocher miné
export const GOLD_PER_FIND = 1;
// Zip 283 (demande Guillaume) : chance montée à 12% aux extrémités NORD et
// SUD de la carte (bande de GOLD_EXTREME_BAND cases depuis le bord y=0 ou
// y=MAP_H-1), 5% ailleurs — toujours conditionné à la proximité de la
// rivière (GOLD_RIVER_RADIUS), ce boost ne s'applique jamais loin de l'eau.
export const GOLD_EXTREME_CHANCE = 0.12;
export const GOLD_EXTREME_BAND = 20; // en cases, depuis le haut/bas de la carte

// Zip 284 (demande Guillaume : "plus de cailloux autour de la rivière, au
// nord et sud de la map, qui respawn tous les jours quand l'utilisateur ne
// regarde pas") : à chaque passage de jour (newDay, fermeEngine.js — déjà le
// point où repousse un peu de nature loin du spawn), on ajoute EN PLUS des
// rochers tirés spécifiquement près des berges, dans les mêmes bandes
// nord/sud que le bonus d'or ci-dessus (GOLD_EXTREME_BAND), pour nourrir le
// filon d'or élargi (GOLD_RIVER_RADIUS) en nouveaux rochers à miner. Valeurs
// extrapolées (aucun chiffre précis demandé), à ajuster librement.
export const RIVER_STONE_RESPAWN_PER_DAY = 10; // nombre de rochers ajoutés par jour, près de la rivière, nord+sud confondus
export const RIVER_STONE_RESPAWN_RADIUS = 6;   // en cases, distance max au centre de la rivière (riverCenterAt) pour ce respawn ciblé

// --- Poissons (pêche à la rivière) ---
// Se mangent (rendent de l'énergie) OU se revendent au bac. Tirage pondéré.
export const FISH = [
  { id: 0, name: "Gardon",  nameEn: "Roach",  sell: 30,  energy: 20, color: "#9fb4c4", weight: 0.58 },
  { id: 1, name: "Truite",  nameEn: "Trout",  sell: 80,  energy: 30, color: "#d98a5a", weight: 0.34 },
  { id: 2, name: "Brochet", nameEn: "Pike",   sell: 180, energy: 45, color: "#6a8f5a", weight: 0.08 },
];

// --- Outils ---
export const TOOLS = ["hoe", "can", "axe", "pick"];
export const TOOL_NAMES = { hoe: "Houe", can: "Arrosoir", axe: "Hache", pick: "Pioche" };
export const TOOL_NAMES_EN = { hoe: "Hoe", can: "Watering can", axe: "Axe", pick: "Pickaxe" };
export const TOOL_MAX_LEVEL = 3;
export const TOOL_UPGRADE_COST = [0, 500, 2000]; // coût pour passer au niveau 2, puis 3
// Bonus de RESSOURCES récoltées (pas seulement la vitesse déjà existante via
// f.tools[key] utilisé comme dégâts/coup) : chaque niveau de hache/pioche au
// dessus de 1 multiplie le bois/la pierre obtenus par ×1.5 (demande Guillaume
// 2026-07 : "1,5x plus par niveau"). Niveau 1 = base inchangée, niveau 2 = ×1.5,
// niveau 3 = ×1.5² (×2.25). Arrondi à l'entier le plus proche au moment de la
// récolte (voir `toolYield()` dans fermeEngine.js).
export const TOOL_YIELD_MULT = 1.5;

// Énergie
export const MAX_ENERGY = 100;
export const ENERGY_COST = { till: 2, water: 1, chop: 3, mine: 3, harvest: 0, plant: 0, fish: 1 };

// --- Quêtes de découverte (checklist guidée) ---
// Chaque quête se valide la PREMIÈRE fois que le joueur réussit l'action
// correspondante, et crédite la caisse commune. `act` = valeur de l'action
// (ou "sell") détectée côté hôte. Ordre = ordre d'affichage/apprentissage.
export const QUESTS = [
  { id: "till",  reward: 40 },
  { id: "plant", reward: 40 },
  { id: "water", reward: 40 },
  { id: "chop",  reward: 50 },
  { id: "mine",  reward: 50 },
  { id: "fish",  reward: 60 },
  { id: "sell",  reward: 80 },
];
export const FOOD_COST = 10;    // prix du casse-croûte (10 or, demande 2026-07 : réduit depuis 50)
export const FOOD_ENERGY = 40;  // énergie rendue

// --- Dormir dans la maison (chantier 2026-07, demandé par Guillaume) ---
// Le fermier s'approche de la porte de la maison et appuie sur E (même
// mécanisme que boutique/bac/grange, voir tryOpenNearby dans FermeGame.js)
// pour entrer dormir. Aucune animation d'entrée : il disparaît simplement de
// la carte, des "Zzz" s'échappent des fenêtres de la maison (visibles de
// tous les joueurs, pas seulement du dormeur) et son énergie remonte
// PROGRESSIVEMENT jusqu'au plein, pile au bout de SLEEP_MS. Il peut aussi
// ressortir plus tôt en rappuyant sur E, en gardant l'énergie déjà regagnée
// à cet instant (voir resolveSleepStart/resolveSleepEnd, fermeEngine.js).
export const SLEEP_MS = 60 * 1000; // durée du sommeil (60 secondes réelles)
// Porte de la maison : juste sous le seuil visible sur le sprite (house(),
// fermeArt.js — porte dessinée à 42-56px sur les 96px du canevas). Portée
// d'interaction : même nearTile() que boutique/bac/grange.
export const HOUSE_DOOR = { x: 43, y: 35 };

// Ressources
export const WOOD_SELL = 5;
export const STONE_SELL = 4;
export const TREE_HP = 5;
export const ROCK_HP = 3;
export const TREE_WOOD = 6;  // bois par arbre
export const ROCK_STONE = 4; // pierres par rocher

// Rochers du monde maléfique (chantier 2026-07, demande Guillaume : "les
// roches là-bas (plus pointues) contiennent de la pierre mais aussi des
// minerais magiques qui serviront d'ingrédients pour des concoctions
// futures, à ramener au chaudron") : mêmes C.O_ROCK/C.ROCK_HP que la ferme
// (réutilisés tels quels dans generateEvilWorld), seul le RENDU diffère
// (variante "pointue"/améthyste, voir fermeArt.js) et le MINAGE rapporte en
// plus une chance de minerai magique, en sus de la pierre habituelle.
export const EVIL_ORE_CHANCE = 0.35;  // probabilité de minerai à chaque rocher épuisé
export const EVIL_ORE_YIELD = [1, 2]; // quantité min/max de minerai par trouvaille
export const EVIL_ROCK_HP = ROCK_HP * 5; // rochers maléfiques : 5x plus résistants à la pioche que ceux de la ferme (demande Guillaume)

// --- Temps ---
export const DAY_REAL_MS = 16 * 60 * 1000; // un jour = 16 minutes réelles (temps ingame 2x plus lent, demande 2026-07)
export const DAY_START_MIN = 6 * 60;      // 6h00
export const DAY_END_MIN = 26 * 60;       // 2h00 le lendemain
export const START_MONEY = 500;

// --- Réseau / jeu ---
export const MAX_PLAYERS = 8;
export const PLAYER_SPEED = 5.2; // tuiles/seconde
// Zip 247 (demande Guillaume : "fix the walking speed in the valley town, it
// should be faster") : Valley Town est une grande carte de rues longues et on
// n'y a ni cheval ni raccourci — on marche donc sensiblement plus vite qu'à la
// ferme. Multiplicateur appliqué dans updateMeTown (FermeGame.js) uniquement,
// la vitesse de la ferme n'est pas touchée.
export const TOWN_SPEED_MULT = 1.45;
export const POS_TICK_HZ = 8;        // FIX 243: 12 -> 8 Hz (economie position ; extrapolation cote rendu compense le ressenti)
export const AOI_MARGIN_TILES = 8;   // FIX 242 (AOI): marge (tuiles) autour du viewport — pré-charge entités/joueurs juste avant qu'ils entrent à l'écran
// Zip 365 (800 -> 2000) : en marche continue, le keep-alive n'est plus qu'un
// filet ANTI-DÉRIVE. Tant que la vitesse était DEVINÉE à l'arrivée, il fallait
// la re-corriger souvent (elle était fausse dès qu'il y avait de la gigue) ;
// maintenant qu'elle est TRANSMISE (pubMe.vx/vy), la trajectoire rejouée est
// exacte et ne dérive que du glissement le long des obstacles. Deux secondes
// suffisent donc largement, et un changement de direction ou un arrêt part
// toujours immédiatement (émission par intention, voir maybeSendPos).
// Effet : le trafic de position en marche droite passe de 1,25 à 0,5 msg/s
// par joueur, AVEC un rendu meilleur — pas au prix du rendu.
export const POS_KEEPALIVE_MS = 2000;
// Zip 247 : plafond de la vitesse ESTIMÉE d'un joueur distant (extrapolation,
// voir le handler "pos"). L'ancienne valeur codée en dur (1.6) était déjà
// INFÉRIEURE à la vitesse à cheval (HORSE_SPEED_MULT = 1.9) et le reste à
// celle de Valley Town avec bonbon (1.45 * 1.5 = 2.175) : les joueurs
// distants rapides traînaient donc visuellement derrière leur vraie position.
export const POS_EXTRAP_SPEED_CAP = 2.4;
// Zip 365 (900 -> 3000) : ce plafond ne s'applique PLUS qu'au mode de secours
// d'advanceRemote (tampon vidé). Il doit couvrir le keep-alive (2000) plus la
// latence et la gigue de la liaison — l'ancienne marge de 100 ms au-dessus du
// keep-alive était le mécanisme exact de la saccade : l'écart se mesurant
// entre ARRIVÉES, la moindre gigue faisait saturer l'extrapolation, figeant le
// personnage jusqu'au paquet suivant. Le prolongement est désormais sûr sur
// cette durée parce que la vitesse est reçue, non estimée.
export const POS_EXTRAP_MAX_MS = 3000;
// Zip 365 — tampon de rendu adaptatif des joueurs distants (voir
// advanceRemote/remoteBufferMs). Le plancher garantit qu'il y a toujours de
// quoi interpoler entre deux paquets ; le plafond borne le retard d'affichage
// même sur une liaison très dégradée. Entre deux joueurs proches, la gigue
// mesurée est faible et le tampon reste au plancher : imperceptible.
export const POS_JITTER_MIN_MS = 30;
export const POS_JITTER_MAX_MS = 260;
export const POS_BUF_MAX_SAMPLES = 12; // ~24 s d'historique au keep-alive de 2 s : très au-delà du nécessaire, coût mémoire nul
export const POS_FAR_HZ = 1;         // FIX 242 (AOI) — zip 264: 1.5 -> 1 Hz. Quand aucun autre joueur n'est à portée de vue, la position ne sert qu'à la minimap : 1 Hz suffit largement (aucun rendu du perso à l'écran). Économie directe sur les longues traversées solo-dans-le-groupe.   // fréquence de diffusion des positions (broadcast)
export const ACT_RANGE = 1.8;    // portée d'action en tuiles

/* ═══════════════════════════════════════════════════════════════════════════
   2026-09-01 — LA SEMELLE : L'EMPREINTE AU SOL D'UN PERSONNAGE, EN UN ENDROIT.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ ELLE ÉTAIT ÉCRITE SEPT FOIS, ET ELLE N'ÉTAIT PAS SOUS LES PIEDS.
   `canStand` (ferme), `canStandMounted`, `canStandTown`, `advanceRemote`,
   `canStandEvil`, `E.townBoxFree` et `verify-vallee` portaient chacun leur
   copie de `[x ± 0,3] × [y … y + 0,35]` — sept fois le paramètre qui double un
   paramètre du §8. Et surtout, cette boîte-là décrit le HAUT de la case, pas la
   semelle : le sprite d'un personnage fait 16 px de large, il est donc centré
   sur `x + 0,5` et non sur `x` ; son ombre portée est peinte à 15 px sous
   l'ancre, donc sa ligne de contact est `y + 0,94` et non `y`. La boîte était
   décalée d'une DEMI-CASE vers l'ouest et de TROIS QUARTS DE CASE vers le nord
   par rapport à ce que le joueur voit de lui-même.

   Ce que ça donnait, et c'est la plainte de Guillaume (« la collision avec les
   haies est impossible, il faut la revoir sous les 4 angles ») en quatre lignes,
   mesurée contre une haie, dont le pied tombe sur le bas de sa case :

     · vers le NORD   on s'arrêtait à 15 px de la haie — une case entière d'herbe
     · vers le SUD    on entrait de 9 px DANS la haie
     · vers l'OUEST   on s'arrêtait à 7 px du feuillage
     · vers l'EST     le corps chevauchait la case de haie de 3 px

   Deux directions laissaient un vide, deux autres traversaient. Aucun banc ne
   pouvait le voir : ils vérifiaient tous qu'une case solide REFUSE le pas — ce
   qui était vrai — et jamais OÙ le pas s'arrête par rapport au dessin.

   ⚠️ LA SEMELLE EST DÉRIVÉE DU DESSIN, elle n'est pas réglée : sa profondeur
   est le diamètre de l'ombre portée, sa ligne de contact est le centre de cette
   ombre, son centre est le milieu du sprite. Le jour où le personnage change de
   gabarit, la collision suit — c'est la règle du §8, et c'est la seule façon
   qu'elle ne redevienne pas fausse en silence.
   ⚠️ SA DEMI-LARGEUR, ELLE, EST DÉLIBÉRÉMENT PLUS ÉTROITE QUE L'OMBRE (0,30
   contre 0,375) : c'est la valeur historique, elle laisse 0,4 case de jeu dans
   un passage d'une case, et l'élargir refermerait des portes qui s'ouvrent
   depuis le 425. Une collision plus indulgente que le dessin ne se remarque
   pas ; l'inverse, si.
   ⚠️ ET ELLE RESTE ENTIÈREMENT DANS SA CASE quand `x` et `y` sont entiers —
   c'est ce qui permet de se tenir dans la case voisine d'un mur, au nord comme
   au sud. Une semelle centrée sur la ligne de contact déborderait sur la case
   du dessous et interdirait de s'approcher d'un mur par le nord.
   ═══════════════════════════════════════════════════════════════════════════ */
export const CHAR_SPRITE_W = 16;      // largeur d'une pose de personnage, en px
export const CHAR_SHADOW_PY = 15;     // la ligne de contact au sol, en px sous l'ancre
export const CHAR_SHADOW_RY = 2.5;    // demi-profondeur de l'ombre portée, en px
export const BODY_RX = 0.30;                                  // demi-largeur de la semelle, en cases
export const BODY_DEPTH = (2 * CHAR_SHADOW_RY) / TILE;        // profondeur, DERRIÈRE la ligne de contact
export const BODY_CX = CHAR_SPRITE_W / (2 * TILE);            // 0,5 — le sprite est centré sur x + 0,5
export const BODY_FY = CHAR_SHADOW_PY / TILE;                 // 0,9375 — la ligne de contact
/* Les quatre coins de la semelle, dans le repère du monde. `r` permet au
   tribunal de garder sa demi-largeur un peu plus fine (couloirs étroits). */
export function bodyPoints(x, y, r = BODY_RX, d = BODY_DEPTH) {
  const cx = x + BODY_CX, fy = y + BODY_FY;
  return [[cx - r, fy - d], [cx + r, fy - d], [cx - r, fy], [cx + r, fy]];
}
/* La case sous les pieds. ⚠️ C'est la MÊME ligne de contact que la semelle :
   l'altitude d'un personnage se lit là où il touche le sol, jamais sous son
   ancre — sans quoi il change de palier un demi-pas avant le reste de son
   corps (c'est ce que faisait le `y + 0,2` d'avant). */
export function bodyFootTile(x, y) { return { x: Math.floor(footX(x)), y: Math.floor(footY(y)) }; }
/* ⚠️⚠️ LES DEUX MÊMES LIGNES DE CONTACT, POUR TOUT LE RESTE DU JEU — et c'est la
   moitié de la correction, pas un raccourci d'écriture. Vingt-huit endroits
   écrivaient `p.y + 0.2` pour dire « la case sous ses pieds » : c'est un
   demi-pas trop haut (le sprite fait 24 px de haut, ses pieds sont à 15), donc
   l'altitude, l'étage du tribunal, la case visée par E, le rebord du saut et
   la flèche du pont se lisaient tous une case trop au nord dès que `y` n'était
   pas entier. Cinq autres écrivaient `Math.floor(m.x)` pour dire « ma colonne »
   alors que le sprite est centré sur `x + 0,5`.
   ⚠️ Ce n'était pas visible tant que la collision partageait le même décalage :
   les deux erreurs se compensaient à peu près. Corriger la semelle sans
   corriger ces lectures aurait donc CASSÉ ce qui marchait par accident — c'est
   pourquoi les deux vont ensemble, dans la même livraison. */
export function footX(x) { return x + BODY_CX; }
export function footY(y) { return y + BODY_FY; }
/* L'INVERSE DE `bodyFootTile` : l'ancre qui pose la semelle au CENTRE d'une
   case. ⚠️ C'est la ligne dont dépend toute la navigation des PNJ — le
   pathfinder rend ses points de passage avec, et le comparait jusqu'ici à un
   `+ 0,5` écrit en dur qui centrait l'ANCIENNE boîte. Une semelle qui bouge
   sans que le point visé bouge avec elle, c'est un résident qui vise le bord
   d'une case et se fait refuser le pas : 114 des 146 endroits de la ville sont
   devenus inatteignables à l'instant où la semelle a changé, et c'est le banc
   qui l'a dit avant le jeu. */
export function tileAnchor(tx, ty) {
  return { x: tx + 0.5 - BODY_CX, y: ty + 0.5 - BODY_FY + BODY_DEPTH / 2 };
}

// Couleurs de tenue attribuées aux joueurs (par ordre d'arrivée)
export const OUTFITS = [
  { shirt: "#3f7fd4", pants: "#454f66" }, { shirt: "#d44a3f", pants: "#5a4632" },
  { shirt: "#3fa653", pants: "#3d3d55" }, { shirt: "#c9a227", pants: "#4a3b2a" },
  { shirt: "#8a4fd4", pants: "#3a4a5a" }, { shirt: "#d46a9f", pants: "#444444" },
  { shirt: "#2ab5b5", pants: "#54442f" }, { shirt: "#d47f2a", pants: "#3f5147" },
];

// Repères fixes du monde (identiques à la maquette / futur match_start).
export const HOUSE = { x: 40, y: 30, w: 6, h: 5 };
export const SHOP = { x: 49, y: 33 };
export const BIN = { x: 52, y: 33 };
export const SPAWN = { x: 43, y: 37 }; // chemin devant la maison (cible du téléport)

// --- Bâtiments / déplacements ---
// Plusieurs chevaux achetables (demande 2026-07, Guillaume) : coût croissant
// à chaque cheval supplémentaire, jusqu'à HORSE_MAX_COUNT. `HORSE_COSTS[n]`
// = prix du (n+1)-ième cheval (index 0 = premier cheval, inchangé à 800 or).
// Valeurs au-delà du premier extrapolées (aucun chiffre précis demandé par
// Guillaume, cohérent avec la nuance de méthode déjà suivie ailleurs dans
// Ferme Vallée, ex. paliers de la grange) : à ajuster librement.
export const HORSE_COSTS = [800, 1500, 2500];
export const HORSE_MAX_COUNT = HORSE_COSTS.length;
export const HORSE_SPEED_MULT = 1.9; // vitesse à cheval
// hors-zip (demande Guillaume : "proposer trois couleurs à l'achat") : robes
// achetables, une par cheval — chaque achat de la ferme choisit la sienne
// (pas un réglage global). "bay" est la robe d'origine (sans coat), gardée
// en première position pour rester le choix par défaut/legacy — voir
// migrateHorses (FermeGame.js), qui assigne "bay" aux chevaux sauvegardés
// avant l'existence du choix. `horseSprite(frame, coat)` (fermeArt.js) ne
// connaît que ces trois clés + undefined (= "bay").
export const HORSE_COATS = ["bay", "black", "white"];

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 432 — LE TAXI DE VALLEY TOWN.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ LA VITESSE EST DÉRIVÉE DU CHEVAL, PAS RECOPIÉE. Demande de Guillaume :
   « même vitesse que le cheval ». Un 9,88 écrit ici serait un nombre qui
   DOUBLE `PLAYER_SPEED × HORSE_SPEED_MULT` — la divergence en attente du §8.
   Le jour où le cheval change d'allure, le taxi le suit. */
export const TAXI_SPEED = PLAYER_SPEED * HORSE_SPEED_MULT;
/* Accélération et freinage, en tuiles/s². ⚠️ ILS NE SONT PAS SYMÉTRIQUES, et
   c'est ce qui rend une conduite crédible : une voiture freine toujours plus
   fort qu'elle n'accélère. Réglés pour que le démarrage prenne ~1,3 s et
   l'arrêt ~0,8 s à pleine vitesse. */
export const TAXI_ACCEL = 7.5;
export const TAXI_BRAKE = 12.0;
/* ⚠️ LE RALENTISSEMENT EN VIRAGE EST UNE VITESSE CIBLE, PAS UN COUP DE FREIN.
   La cible est calculée à partir de l'angle du virage À VENIR (voir
   taxiCornerSpeed) : plus il est serré, plus elle est basse. C'est ce qui donne
   le « ralentit dans les virages, réaccélère en sortie » demandé — et ça sort
   d'une seule formule au lieu d'une table de cas. */
export const TAXI_CORNER_MIN = 0.34;      // fraction de TAXI_SPEED dans un angle droit
export const TAXI_LOOKAHEAD = 3.2;        // tuiles : distance à laquelle on voit le virage
export const TAXI_TURN_RATE = 9.5;        // rad/s : vivacité du volant (7,0 au premier jet : le banc a mesuré que la voiture mordait la pelouse dans les angles)
export const TAXI_ARRIVE_R = 0.30;        // tuile : on considère le point atteint
export const TAXI_CALL_RANGE = 7;         // tuiles : distance MAXI à une rue pour héler
/* ⚠️ DISTANCE D'ARRIVÉE, MESURÉE LE LONG DE LA CHAUSSÉE (voir taxiSpawnFrom).
   Assez loin pour qu'on le VOIE venir — un taxi qui apparaît devant soi n'est
   pas un taxi, c'est un téléport — assez près pour ne pas attendre : ~18 tuiles
   à 9,88 tuiles/s, virages compris, font une attente de l'ordre de 4 à 6 s. */
export const TAXI_SPAWN_MAX = 18;
/* ⚠️ ET SURTOUT : HORS CHAMP. La distance ci-dessus est un confort (l'attente) ;
   ce qui compte vraiment est qu'on ne VOIE PAS le taxi apparaître — une voiture
   qui se matérialise à l'écran n'est pas une voiture, c'est un téléport. Le
   rayon d'apparition est donc DÉRIVÉ du champ de vision réel (comme l'AOI du
   §3), jamais réglé : dézoomer ne doit pas faire apparaître le taxi à l'écran.
   Cette marge s'ajoute au demi-diagonal du viewport. */
export const TAXI_OFFSCREEN_MARGIN = 4;
/* Le temps qu'il reste à quai après la dépose, avant de repartir se garer hors
   champ (demande de Guillaume). Assez pour qu'on le voie s'arrêter, pas assez
   pour qu'il devienne du décor. */
export const TAXI_PARK_MS = 5000;
export const TAXI_SMOKE_MS = 110;         // cadence des bouffées d'échappement
export const TAXI_SMOKE_LIFE = 1.15;      // s : durée de vie d'une bouffée
export const TAXI_BOARD_R = 1.6;
/* ╔══════════════════════════════════════════════════════════════════════════
   ║ ZIP 433 — LES PIGEONS ET LES COLOMBES DE LA PLACE.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ TOUT EST ICI ET RIEN N'EST DANS LE DESSIN : le vol se rejoue au banc
   (`tools/render-oiseaux.mjs`), donc ses nombres doivent être lisibles d'un
   seul endroit. Voir `birdStep` dans fermeEngine pour ce que chacun fait. */
export const BIRD_FLUSH_R = 2.3;      // tuiles : à cette distance, ils décollent
/* ⚠️ LE RAYON D'ALERTE EST PRESQUE LE DOUBLE DU RAYON D'ENVOL, ET C'EST VOULU.
   C'est dans cet intervalle-là que le joueur voit les têtes se lever : s'il
   était serré, on n'aurait plus qu'un envol sec, et « élégamment » disparaît. */
export const BIRD_ALERT_R = 4.2;
export const BIRD_ROAM = 0.9;         // tuiles : le rayon du sautillement autour de sa case
export const BIRD_PECK_MIN = 0.7, BIRD_PECK_MAX = 2.6;   // s entre deux sautillements
export const BIRD_TAKEOFF = 1.6;      // tuiles/s au moment où il quitte le sol
export const BIRD_CRUISE = 7.2;       // tuiles/s en vol tendu
export const BIRD_CLIMB = 4.6;        // tuiles/s : la première poussée verticale
export const BIRD_CLIMB_DECAY = 2.6;  // tuiles/s² : elle s'amortit — sinon c'est une fusée
export const BIRD_TURN = 2.4;         // rad/s : le virage d'écartement
export const BIRD_ALT_MAX = 6.0;      // tuiles : la hauteur d'où il revient
export const BIRD_FADE_S = 1.9;       // s de vol avant de s'effacer au loin
export const BIRD_AWAY_MIN = 7.0, BIRD_AWAY_MAX = 15.0;  // s d'absence
export const BIRD_RETURN_D = 9.0;     // tuiles : il revient de LOIN, pas du dessus
export const BIRD_LAND_SPD = 1.4, BIRD_LAND_BRAKE = 7.0;
export const BIRD_FLARE_D = 2.2;      // tuiles : distance à laquelle il cabre
export const BIRD_LAND_MAX_S = 8.0;   // garde-fou : au-delà, il se pose d'autorité
/* Le battement, en radians/s. ⚠️ RAPIDE AU DÉCOLLAGE, LENT EN PLANÉ — c'est ce
   contraste qui fait « oiseau » et pas « papillon », et il se voit même à sept
   pixels. `BIRD_BEAT_S` est le temps qu'il met à passer de l'un à l'autre. */
export const BIRD_WING_FAST = 26, BIRD_WING_GLIDE = 3.5, BIRD_BEAT_S = 1.3;
/* ── LA VIE SOCIALE DU GROUPE (deuxième passe, retour de Guillaume) ──────────
   « Le comportement social des pigeons n'est pas très réaliste. Les vrais
   pigeons sont rassemblés en groupes souvent, n'ont pas toujours des mouvements
   réguliers ou un espacement égal. Parfois l'un suit l'autre, accélère,
   ralentit sa course en suivant l'autre (parade mâle-femelle). Et ils ne font
   pas toujours que picorer. Là tes oiseaux se comportent comme les animaux de
   la ferme. »

   ⚠️⚠️ CE QUI CLOCHAIT N'ÉTAIT PAS UN RÉGLAGE, C'ÉTAIT LE MODÈLE. Le premier
   jet donnait à chaque oiseau une CASE À LUI et le faisait sauter dedans à
   intervalle régulier : par construction, espacement égal, mouvements
   réguliers, une seule activité. On remplace par trois mécanismes qui, ensemble,
   produisent tout ce que la demande décrit — sans une seule ligne de cas
   particulier :
     1. un OISEAU A UNE ACTIVITÉ, tirée au sort et de durée variable (rester
        planté, picorer, marcher, faire la roue, se chamailler) ;
     2. il a des VOISINS : il s'écarte de ceux qui le serrent, il se rapproche
        du groupe s'il en est loin, et il lui arrive d'en SUIVRE un — c'est ce
        qui donne les poursuites, les accélérations et les arrêts nets ;
     3. il a une EXCITATION, qui monte quand il y a à manger et quand le groupe
        est dense. Elle pilote la vitesse, la fréquence des coups de bec et la
        probabilité de se chamailler. Un pigeon seul flâne, dix pigeons autour
        d'un quignon se battent : c'est le même code, à deux valeurs près. */
export const BIRD_ACT_MIN = 0.5, BIRD_ACT_MAX = 3.2;   // s : durée d'une activité
export const BIRD_WALK_SPD = 0.85;      // tuiles/s : l'allure de flânerie
export const BIRD_RUN_SPD = 2.6;        // tuiles/s : la poursuite, la ruée sur le pain
export const BIRD_ACC = 7.0;            // tuiles/s² : ⚠️ FINI, il accélère et freine
/* ⚠️⚠️ L'ÉCARTEMENT EST PLUS FORT QUE L'ATTRAIT DU PAIN, ET IL LE FAUT. Réglé
   trop mou (0,62 / 2,4), douze pigeons convergeant sur le même point se
   superposaient en une CHENILLE — vu en jeu, c'est le seul défaut visible du
   premier essai de la mêlée. Un vrai attroupement est serré mais chaque oiseau
   garde sa place ; c'est le rapport entre ces deux nombres et `BIRD_FOOD_EAT_R`
   qui décide de la différence entre une mêlée et une bouillie. */
export const BIRD_SEP = 0.78;           // tuiles : en dessous, il s'écarte du voisin
export const BIRD_SEP_F = 3.6;          // force de l'écartement
export const BIRD_COH = 0.55;           // rappel vers le groupe, au-delà du rayon du site
/* ⚠️ LE PAIN. On ne modélise pas le quignon, on modélise CE QU'IL PROVOQUE —
   demande explicite de Guillaume. Un point au sol, une durée, et un rayon
   d'appel : les oiseaux proches se ruent dessus, les absents reviennent. */
export const BIRD_FOOD_R = 14;          // tuiles : jusqu'où l'appel porte
export const BIRD_FOOD_MS = 22000;      // durée d'un jeté de miettes
export const BIRD_FOOD_EAT_R = 2.6;     // tuiles : le cercle où l'on se bouscule
export const BIRD_EXC_UP = 1.6, BIRD_EXC_DOWN = 0.35;   // /s : montée et retombée
/* ⚠️ LA POPULATION VARIE, ET ELLE N'EST PAS LA MÊME CHEZ LES DEUX JOUEURS.
   « Pas besoin qu'ils soient toujours aussi nombreux à tous les moments de la
   journée, fais-les spawn aléatoirement. » On tire donc une cible qui dérive,
   et les oiseaux en trop restent au loin au lieu de revenir. */
export const BIRD_POP_MS = 45000;       // on retire la cible toutes les 45 s
export const BIRD_POP_MIN = 0.25, BIRD_POP_MAX = 1.0;   // fraction du vol maximal
/* ⚠️ LE PIGEON EST LA RÈGLE, LA COLOMBE L'EXCEPTION (demande explicite). Une
   colombe sur sept : assez pour qu'elle surprenne, pas assez pour qu'on croie
   à un lâcher de mariage. */
export const BIRD_DOVE_SHARE = 0.14;
export const BIRD_CRUMB_AHEAD = 2.2;   // tuiles devant le banc où tombent les miettes
export const BIRD_CRUMB_N = 5;         // ⚠️ PLUSIEURS TAS, PAS UN : voir throwCrumbs
export const BIRD_CRUMB_SPREAD = 1.4;  // tuiles : l'éparpillement d'une poignée
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — UN JOUEUR ASSIS N'EST PLUS LA MÊME MENACE QU'UN JOUEUR DEBOUT.
   ───────────────────────────────────────────────────────────────────────────
   Retour de Guillaume : « quand on disperse des miettes de pain pour les
   pigeons, ils sont trop proches et s'envolent direct ».
   ⚠️⚠️ CE N'ÉTAIT PAS UN RÉGLAGE TROP NERVEUX, C'ÉTAIT UNE CONTRADICTION
   GÉOMÉTRIQUE, et c'est ce qui la rend intéressante : les miettes tombaient à
   1,9 case devant le banc, et le rayon d'envol valait 2,3 cases. **Le pain
   atterrissait DANS le rayon d'envol.** On appelait donc les oiseaux à un
   endroit d'où l'on garantissait qu'ils repartiraient, et le geste ne pouvait
   pas marcher — quel que soit le réglage. Aucun banc ne pouvait le voir : les
   deux nombres sont justes séparément, c'est leur ORDRE qui est faux, et il
   n'existait aucun contrôle qui les compare. (Même famille que la rangée
   d'étals du 433 : l'élément est impeccable, c'est son RAPPORT à un autre qui
   ne l'est pas.)
   ⚠️ D'où deux corrections, pas une : les miettes partent plus loin ET la
   confiance monte quand on est assis. Une seule des deux aurait suffi à faire
   « moins pire », les deux ensemble font une scène.
   ⚠️⚠️ ET SE LEVER LES EFFRAIE, GRATUITEMENT. Il n'y a pas une ligne pour ça :
   les rayons repassent de 0,7 / 1,2 à 2,3 / 4,2, et tous les pigeons qui
   s'étaient approchés se retrouvent d'un coup dans le rayon d'envol. La
   bouffée de départ tombe du modèle, elle n'est pas scriptée — exactement ce
   que Guillaume demande (« si on se lève ça les effraie comme prévu »).
   ⚠️ L'ALERTE ASSISE (1,2) EST PLUS COURTE QUE LA DISTANCE MINIMALE DES MIETTES
   (1,5) : sans cet ordre-là, les oiseaux arriveraient au pain puis se
   figeraient en « alerte » au lieu de picorer — ils ne s'envoleraient plus,
   mais ils ne mangeraient pas non plus, ce qui est à peine mieux. Les trois
   nombres se lisent ensemble, dans cet ordre : 0,7 < 1,2 < 1,5 < 2,2. */
export const BIRD_SIT_FLUSH_R = 0.7;   // assis : il faut lui marcher dessus
export const BIRD_SIT_ALERT_R = 1.2;
export const BIRD_CRUMB_MIN = 1.5;     // tuiles : aucune miette plus près que ça
// ⚠️ Anti-rafale : rejeter du pain ne fait que repousser l'échéance, donc rien
// à gagner à marteler la touche — sauf trois toasts par seconde. Le geste
// reste gratuit (l'arbitrage « le gager sur le stock » est toujours ouvert).
export const BIRD_CRUMB_COOLDOWN_MS = 2500;
          // tuiles : distance pour monter (touche E)
// Traversée de la rivière à cheval (chantier 2026-07, demande Guillaume :
// "on doit pouvoir traverser la rivière à cheval, mais le cheval ralentit
// par 4 quand il est sur de l'eau") — s'applique au cheval monté ET aux
// chevaux sifflés qui accourent (updateWhistledHorses), voir aussi
// blockedTileMounted (fermeEngine.js).
export const HORSE_WATER_SLOW = 4;         // diviseur de vitesse à la nage
// Noyade (décision Guillaume 2026-07) : descendre du cheval en pleine eau =
// le fermier coule, est ramené chez lui (C.SPAWN) avec une blessure COURTE
// d'une minute (INJURED_MS = morsure de loup, EVIL_INJURED_MS = créature).
export const DROWN_INJURED_MS = 60 * 1000;
// Anti-blocage loups/lapins (chantier 2026-07, demande Guillaume : "ils ne
// doivent pas être coincés trop longtemps par la rivière ou des
// obstacles") : au bout de CRITTER_STUCK_S secondes sans progresser, la
// bête prend un cap de contournement perpendiculaire pendant
// CRITTER_DETOUR_MS avant de reprendre sa cible.
export const CRITTER_STUCK_S = 2.5;
export const CRITTER_DETOUR_MS = 1200;
export const MOUNT_RANGE = 1.6;      // distance pour enfourcher le cheval
// Maison à NIVEAUX (validation Guillaume 2026-07, maquettes approuvées) :
// niveau 1 = maison actuelle, niveau 2 = colombages/chaume/soubassement
// pierre (maquette A), niveau 3 = pierre/tuiles rouges/auvent (maquette B).
// Chaque palier coûte or + bois + pierre pour LANCER les travaux (payés
// d'un coup : or sur la caisse commune, bois/pierre sur l'inventaire du
// demandeur), puis l'amélioration dure un temps RÉEL : 2 h pour le niveau
// 2, 5 h pour le niveau 3 (durées demandées par Guillaume). Montants
// extrapolés (aucun chiffre demandé à part les durées), calibrés nettement
// sous la grange (BARN_LEVELS) pour rester un objectif de mi-parcours — à
// ajuster librement. HOUSE_LEVELS[n] = palier VERS le niveau n+2.
export const HOUSE_LEVELS = [
  { level: 2, cost: { money: 3000, wood: 120, stone: 80 }, durationMs: 2 * 3600 * 1000 },
  { level: 3, cost: { money: 8000, wood: 200, stone: 160 }, durationMs: 5 * 3600 * 1000 },
];
export const HOUSE_MAX_LEVEL = 3;
export const WELL_COST = 600;
export const WELL = { x: 30, y: 62 }; // emplacement du puits (champs à l'ouest)
export const WELL_SPAWN = { x: 30, y: 64 }; // cible du téléport puits (dégagée à l'achat)

// --- Passage sombre / carte maléfique (chantier 2026-07, demande Guillaume :
// "ajoute seulement un passage sombre rive droite à la limite de la map. quand
// un joueur l'empruntera, cela affichera pour lui un écran noir en fondu
// enchainé et l'emmenera lui seul sur la nouvelle map maléfique. le bouton
// home ne fonctionnera pas sur la nouvelle map, mais il pourra revenir s'il
// retrouve l'entrée") ---
// La position du passage lui-même (world.darkPassage) N'EST PAS ici : elle
// dépend de riverCenter donc de la seed de CETTE partie (calculée dans
// generateWorld, jamais un point fixe en dur, voir G_DARK_PASSAGE). Ce qui
// suit est fixe, propre à la carte maléfique elle-même (indépendante de la
// ferme, générée localement, voir generateEvilWorld) :
export const EVIL_MAP_W = 70;
export const EVIL_MAP_H = 70;
export const EVIL_SPAWN = { x: 35, y: 66 }; // arrivée du joueur, près du bord sud de la carte maléfique
// Passage retour : PAS annoncé au joueur (ni surligné, ni sur la mini-carte) —
// "il pourra revenir s'il retrouve l'entrée" implique qu'il doit l'explorer et
// la repérer lui-même. Position fixe (indépendante de la seed de la ferme :
// une seule carte maléfique, partagée par toutes les parties) mais choisie à
// bonne distance du point d'arrivée pour qu'elle ne saute pas aux yeux tout de
// suite.
export const EVIL_RETURN_PASSAGE = { x: 12, y: 8 };
export const ZONE_FADE_MS = 900; // durée d'une moitié de fondu (aller au noir OU revenir), écran noir tenu entre les deux

/* ==========================================================================
   Zip 372 : PORTE DU DÉFI DE FUITE (endless runner 3D), bord EST.
   --------------------------------------------------------------------------
   Le passage sombre ne mène pas à UNE carte mais à cinq (PASSAGE_WORLDS, une
   par semaine de jeu), dont un labyrinthe qui pose des haies sur toute la
   surface. Une porte posée « quelque part à l'est » serait donc accessible
   certaines semaines et murée d'autres.

   D'où RUN_GATE, un point FIXE, plus un couloir DÉGAGÉ DE FORCE entre
   l'arrivée (EVIL_SPAWN, bord sud) et cette porte, creusé après la génération
   dans les deux générateurs. C'est exactement ce que fait déjà
   generatePassageWorld pour garantir l'accès au centre du labyrinthe : on
   reprend le motif existant plutôt que d'en inventer un.

   Le couloir est volontairement LARGE (RUN_CORRIDOR_HALF de part et d'autre) :
   à 1 case, un joueur qui longe le bord se retrouve coincé entre deux troncs,
   et la « garantie » n'en est plus une en pratique.
   ========================================================================== */
export const RUN_GATE_CLEAR = 2;            // rayon de la place dégagée autour de la base de la jetée
export const RUN_CORRIDOR_HALF = 1;         // demi-largeur du couloir garanti (1 => 3 cases de large)

/* ==========================================================================
   Zip 375 : RIVE EST, JETÉE EN PIERRES ET EMBUSCADE.
   --------------------------------------------------------------------------
   Demande de Guillaume : « une rive de lac violet bien soignée sur la partie
   droite de la map dark world avec fondu pour évoquer l'univers du jeu de
   fuite », et l'ouverture du défi qui ne se fait plus en approchant le coffre
   mais en s'avançant sur une jetée en pierres.

   TROIS RAISONS DE FAIRE ÇA PLUTÔT QUE DE REDÉCORER LA PORTE :

   1. Le défi de fuite se joue sur une chaussée de pierre AU-DESSUS d'un lac
      violet (voir public/templerun/js/world.js). Poser la même chaussée, en
      réduction, à l'endroit d'où on le lance, c'est raccorder les deux
      univers par le décor au lieu de le faire par un menu.
   2. Un bord de carte est un endroit sans intérêt : de l'herbe, puis le vide.
      Une rive donne une fin au monde.
   3. Une jetée ne va nulle part. On s'y avance, on est acculé — ce qui rend
      l'embuscade des loups lisible sans un mot d'explication.

   GÉOMÉTRIE, tout est dérivé de EAST_LAKE_X pour qu'un seul nombre suffise à
   déplacer l'ensemble. La chaussée avance vers l'EST depuis la dernière bande
   de terre.

   ⚠ ZIP 378 — CE N'EST PLUS UNE JETÉE, C'EST UNE CHAUSSÉE. Retour de
   Guillaume sur capture d'écran : « elle doit aller jusqu'au bord droit de
   l'écran, pas s'arrêter comme ça, et l'eau violette ne doit pas la
   contourner, la plateforme est par-dessus l'eau ».

   Les trois défauts étaient distincts et il fallait les traiter séparément :

     1. elle S'ARRÊTAIT quatre dalles après la berge, ce qui la faisait lire
        comme un ponton inachevé posé au milieu d'un lac. Elle court désormais
        jusqu'au bord EST de la carte et sort du cadre — ce qui raconte la
        bonne chose : le défi 3D est la SUITE de cette route ;
     2. l'eau la CONTOURNAIT : les dalles remplaçaient le lac au lieu d'être
        posées dessus, et il n'y avait ni ombre portée ni épaisseur. C'est le
        rendu qui traite ça (drawRunDeckTile, fermeArt.js) ;
     3. elle n'avait que trois cases de large, sans les blocs bas qui bordent
        la chaussée en 3D. La rangée de BORDURE (G_RUN_KERB) les apporte.

   Les noms RUN_JETTY_* sont conservés : tout le code existant les emploie, et
   les renommer aurait touché sept fichiers pour un gain nul.
   ========================================================================== */
export const EAST_LAKE_X = 57;        // colonne moyenne de la rive ; à l'est, c'est le lac
export const EAST_LAKE_WOBBLE = 3.2;  // amplitude du découpage irrégulier de la rive
export const LAKE_SHORE_BAND = 2;     // épaisseur, en cases, de la berge de galets (le « fondu »)

export const RUN_JETTY_BASE = { x: EAST_LAKE_X, y: 34 }; // dernière case de TERRE, pied de la chaussée
export const RUN_JETTY_HALF_W = 1;    // demi-largeur PRATICABLE : 1 => 3 cases, comme les 3 voies du défi
export const RUN_KERB_HALF_W = 2;     // demi-largeur TOTALE : 2 => 5 cases, dont 2 de bordure. Proportion du défi 3D
                                      // (3 voies de 2,6 dans une dalle de 8,4, bordée de blocs bas).
// Zip 378 : la chaussée court jusqu'au bord EST de la carte. Dérivé de
// EVIL_MAP_W et non écrit en dur — les six mondes du passage font tous 70×70,
// mais c'est une propriété de la carte, pas de la chaussée.
export const RUN_DECK_END_X = EVIL_MAP_W - 1;
export const RUN_JETTY_LEN = RUN_DECK_END_X - RUN_JETTY_BASE.x;  // longueur réelle, en dalles

/* Point de DÉCLENCHEMENT du défi. Il garde exactement la place qu'il avait
   quand la jetée s'arrêtait là (quatre dalles après la berge) — décision
   Guillaume : « plus de porte visible, mais l'effet reste le même, et
   localisé au même endroit ». Ce n'est donc plus le bout de quoi que ce soit,
   d'où la constante dédiée plutôt qu'une expression dérivée de la longueur :
   allonger la chaussée ne doit plus déplacer le déclenchement.

   Le nom RUN_GATE est conservé : checkWalkOverPassage, carveRunCorridor,
   ambushCineSpot et verify-gate.mjs le nomment tous. */
export const RUN_GATE_OFFSET = 4;
export const RUN_GATE = { x: RUN_JETTY_BASE.x + RUN_GATE_OFFSET, y: RUN_JETTY_BASE.y };

/* --- Embuscade des darkwolves (cinématique + affrontement) ---------------
   Entièrement LOCALE : aucun de ces loups n'existe pour les autres joueurs,
   et l'ensemble ne coûte pas un message réseau. C'est le motif déjà retenu
   pour les lapins (366), l'animation du cheptel (369) et le défi lui-même
   (372) : ce qui est individuel et n'a pas d'effet sur le monde partagé se
   simule chez le client, point.

   La séquence : le joueur atteint le bout de la jetée -> contrôle coupé ->
   les loups surgissent de la berge et accélèrent -> fondu -> menu du défi.
   S'il ressort du menu sans courir, ils sont TOUJOURS là et deviennent
   hostiles (décision Guillaume). */
export const RUN_AMBUSH_COUNT = 3;
export const RUN_AMBUSH_MS = 2000;        // durée de la cinématique avant le fondu
export const RUN_AMBUSH_FADE_MS = 550;    // fondu au noir enchaîné à la fin de la cinématique
export const RUN_AMBUSH_START_DIST = 9;   // distance, en cases, à laquelle les loups surgissent
export const RUN_AMBUSH_END_DIST = 1.6;   // distance atteinte au moment du fondu (assez près pour inquiéter)
export const RUN_AMBUSH_SPEED = 2.6;      // vitesse de poursuite APRÈS la cinématique (tuiles/s)
                                          // volontairement supérieure à EVIL_MONSTER_SPEED (1.5) : ces
                                          // trois-là ont déjà couru, et le joueur doit sentir qu'il est
                                          // sur une jetée sans issue
export const RUN_AMBUSH_CATCH_RADIUS = 0.7;  // même contact que les créatures maléfiques
export const RUN_AMBUSH_FLEE_MS = 7000;      // durée de fuite d'un loup dont on a gagné la morsure
export const RUN_AMBUSH_DESPAWN_DIST = 22;   // au-delà, le joueur a semé l'embuscade : elle s'efface

// Blessure infligée par une DÉFAITE au défi (décision Guillaume) : 10 minutes,
// nettement moins que la créature maléfique (EVIL_INJURED_MS = 30 min) parce
// qu'on doit pouvoir retenter le défi dans la même soirée. Constante dédiée
// plutôt que réutilisation : les deux évolueront séparément.
export const RUN_INJURED_MS = 10 * 60 * 1000;

/* Brûlure du cratère (zip 449, demande de Guillaume : « si l'on entre dans le
   cratère incandescent sans attendre qu'il ne se refroidisse, on est
   immédiatement blessé »). DIX MINUTES, le chiffre qu'il a donné — donc la même
   durée que la défaite au défi, et une constante dédiée pour la même raison
   qu'elle : les deux évolueront séparément. La RÈGLE, elle, n'est pas ici mais
   dans `quete.js` (`starCraterBurns`), parce qu'elle dépend de l'état de la
   quête et qu'un banc de logique doit pouvoir l'appeler. */
export const BURN_INJURED_MS = 10 * 60 * 1000;

// Abandonner depuis l'écran-titre du défi est gratuit ; abandonner une course
// DÉJÀ COMMENCÉE compte comme une défaite. Sans ça, il suffirait de quitter
// une demi-seconde avant de se faire rattraper pour ne jamais être blessé.
export const RUN_ABORT_COUNTS_AS_LOSS = true;

// Plafonds de confiance appliqués CÔTÉ HÔTE au résultat renvoyé par le défi
// (req "runFailed"). La course se déroule entièrement chez le client, donc ces
// nombres arrivent d'une page qu'on ne contrôle pas. Ils ne rendent pas la
// triche impossible — ils empêchent un message aberrant d'injecter n'importe
// quoi dans une sauvegarde partagée et durable. Calibrés bien au-dessus d'une
// très bonne course (≈ 140 bonbons et ≈ 6 500 points sur 3 minutes en
// simulation) pour ne jamais punir un bon joueur.
// Zip 377 — BIFURCATION OFFROAD. Durée du voile qui s'efface au retour du
// défi par la sortie honnête. Le défi finit sur un écran noir après son propre
// fondu de 1,2 s (ESCAPE_FADE_MS, public/templerun/js/config.js) ; ce voile-ci
// reprend le relais côté ferme pour que le raccord soit un enchaînement et non
// une coupe. Plus court que ZONE_FADE_MS : on ne change pas de zone, on
// rouvre les yeux sur celle où l'on était déjà.
export const RUN_RETURN_FADE_MS = 700;
export const RUN_MAX_CANDIES_PER_RUN = 2000;
export const RUN_MAX_SCORE = 200000;

// Créatures maléfiques (chantier 2026-07, demande Guillaume : "des monstres
// qui pourchassent le joueur, lents, mais qui l'assomment et le renvoient
// chez lui blessé au contact") : simulées côté client uniquement (aucun
// hôte pour la carte maléfique), voir generateEvilWorld/updateEvilMonsters.
export const EVIL_MONSTER_COUNT = 9;         // nombre de créatures sur la carte
export const EVIL_MONSTER_SPEED = 1.5;       // tuiles/seconde — nettement plus lent que le joueur (PLAYER_SPEED = 5.2)
export const EVIL_MONSTER_DETECT_RADIUS = 9; // distance à partir de laquelle une créature endormie se met à suivre le joueur
export const EVIL_MONSTER_CATCH_RADIUS = 0.7; // distance de contact (dans un sens comme dans l'autre) déclenchant l'attrapage
export const EVIL_MONSTER_MIN_SPAWN_DIST = 10; // distance minimale au point d'arrivée pour la génération d'une créature
export const EVIL_INJURED_MS = 30 * 60 * 1000; // 30 minutes : durée de la blessure infligée par une créature (distincte de INJURED_MS, la morsure de loup)
// Mini-jeu de morsure des créatures maléfiques (chantier 2026-07, demande
// Guillaume : "ajoute un minijeu pour résister à la morsure") : au contact,
// la créature s'arrête et un mini-jeu de martelage (EvilBiteMinigame, même
// mécanique que WolfBiteMinigame côté ferme normale) s'ouvre avant que
// caughtByMonster() ne soit appliqué — réussi, la créature fuit au lieu de
// blesser le joueur.
export const EVIL_BITE_REACT_MS = 2800;       // durée du mini-jeu de riposte — même valeur que WOLF_BITE_REACT_MS, à ajuster séparément si besoin
export const EVIL_MONSTER_FLEE_MS = 6000;
// Mise à mort d'une créature (chantier 2026-07, demande Guillaume : "un moyen
// de tuer les loups et les ennemis après trois victoires au mini-jeu"). Le
// compteur est PAR JOUEUR et PAR CRÉATURE (stocké dans mo.biteWins[playerId],
// côté hôte comme le reste de la simulation) : à la EVIL_MONSTER_KILL_WINS-ième
// victoire d'un même joueur contre CETTE créature, elle meurt au lieu de fuir.
// EVIL_MONSTER_BITE_GRACE_MS = fenêtre garantie sans re-morsure de la même
// créature sur ce joueur après CHAQUE victoire (adoucit les 2 premières, casse
// la boucle instantanée). EVIL_MONSTER_DEATH_ANIM_MS = durée de l'animation de
// mort (fondu + effondrement) avant le despawn.
export const EVIL_MONSTER_KILL_WINS = 3;
export const EVIL_MONSTER_BITE_GRACE_MS = 3500;
export const EVIL_MONSTER_DEATH_ANIM_MS = 900;
// Soin d'une blessure de créature maléfique (décision Guillaume 2026-07) :
// chaque pansement retire un TIERS de la blessure de 30 min : il en faut
// donc jusqu'à 3 (appliqués par un ou plusieurs coéquipiers) pour sauver
// complètement le blessé.
export const EVIL_HEAL_STEP_MS = EVIL_INJURED_MS / 3;     // durée pendant laquelle une créature repoussée fuit le joueur avant de pouvoir rechasser

// Pommade de protection (chantier 2026-07, demande Guillaume : un objet
// achetable au magasin pour repousser les créatures maléfiques ou en être
// immunisé pendant 10 minutes, pour pouvoir explorer/farm côté maléfique
// sans craindre le contact). Effet purement local (comme le reste de la
// carte maléfique, voir generateEvilWorld) : consommée à l'usage, elle fait
// fuir toute créature qui aurait autrement repéré/rattrapé le joueur pendant
// sa durée, plutôt que de simplement ignorer le contact (repousser ET
// immuniser, conformément à la demande).
// Pommade de protection : recette de fabrication (chantier 2026-07, demande
// Guillaume : "n'est plus disponible depuis la boutique, mais requiert
// désormais un mélange [...] d'amétyste et de poissons [...] : 1 amétyste, 2
// trouts et 1 pike pour une pommade"). L'améthyste est prélevée directement
// dans la réserve COMMUNE de gemmes (voir GEMS/s.gems, déjà alimentée par le
// minage de tous les fermiers) ; les poissons sont déposés au chaudron
// (CAULDRON_SITE) depuis l'inventaire personnel de chaque fermier — les deux
// mécaniques permettent bien de "coopérer entre fermiers connectés" comme
// demandé, sans dupliquer un système de dépôt pour l'améthyste qui existe
// déjà. Note : Guillaume a aussi mentionné du bois ("un mélange de bois,
// d'amétyste et de poissons") mais ne lui a donné aucune quantité dans la
// liste chiffrée finale ; non inclus ici en attendant confirmation/quantité.
// Chaudron : ramené du monde maléfique (chantier 2026-07, demande Guillaume :
// "le chaudron doit être récupéré dans le monde maléfique et ramené [...] on
// le trouve comme un artéfact interactif dans le monde maléfique avant qu'il
// ne soit présent dans le monde normal [...] on peut le pick up, le collecter
// et le ramener dans notre monde pour le placer où on veut sur la map. Il
// sera automatiquement utilisable"). Remplace l'ancien CAULDRON_SITE fixe
// (doc -50) : PLUS de coordonnées figées côté ferme, le site est désormais
// la position où un joueur choisit de poser l'objet O_CAULDRON (voir cas
// "cauldron" dans resolveAct, fermeEngine.js), retrouvée dynamiquement en
// scannant les tuiles autour du joueur — même principe que O_MILL pour le
// dépôt de blé, voir E.findCauldronTile()/nearCauldron côté FermeGame.js.
// Unique pour toute la ferme (comme le puits) : une fois ramassé côté
// maléfique ET posé côté ferme, plus personne ne peut en retrouver un
// deuxième (voir s.cauldron.unlocked, fermeEngine.js/FermeGame.js).
export const EVIL_CAULDRON_SPAWN = { x: 52, y: 20 }; // position FIXE du chaudron-artéfact sur la carte maléfique
                                                      // (indépendante de la seed de la ferme, comme EVIL_RETURN_PASSAGE),
                                                      // à bonne distance d'EVIL_SPAWN pour qu'il faille explorer un peu.
export const SALVE_RECIPE = { amethyst: 1, trout: 2, pike: 1 }; // trout=FISH[1], pike=FISH[2]
export const SALVE_IMMUNITY_MS = 10 * 60 * 1000; // 10 minutes d'immunité/répulsion après usage
export const SALVE_BREW_MS = 60 * 1000; // 1 minute de concoction réelle (chantier 2026-07, demande Guillaume : menu
                                         // "déposer/prêt/allumer" + minuterie + retrait dédié au chaudron, voir
                                         // resolveSalveBrew/resolveSalveCollect, fermeEngine.js)
/* 480 bis — SECONDE RECETTE DU MÊME CHAUDRON (demande de Guillaume : "trouver
   une nouvelle concoction avec des ingrédients rares pour réveiller
   l'étoile"). `magicOre` — miné dans le monde maléfique, `inv.magicOre`,
   jamais consommé nulle part avant ce zip — devient l'ingrédient rare ; une
   améthyste de la réserve commune, comme la pommade, pour rester cohérent
   avec le geste déjà connu. `salveCraft.product` choisit laquelle des deux
   recettes est en cours (voir `newSalveCraftState`, fermeEngine.js). */
export const STAR_LURE_RECIPE = { magicOre: 2, amethyst: 1 };
export const STAR_LURE_BREW_MS = 90 * 1000;
/* Éclats de comète (hors-zip, demande Guillaume : "je ne sais pas comment
   trouver la ressource pour charmer l'étoile blanche [...] la transformer en
   petit tas de cailloux blancs/violets luisants à ramasser") : même mécanique
   que EVIL_CAULDRON_SPAWN juste au-dessus — point d'intérêt FIXE et purement
   CLIENT (pas un objet de world.objects), ramassable une seule fois pour
   toute la ferme (voir s.salveCraft.shardsTaken, fermeEngine.js), en un lieu
   qu'il faut chercher ("fouillez les moindres recoins de cette forêt
   maudite"). Crédite directement STAR_LURE_RECIPE.magicOre — DÉRIVÉ, jamais
   recopié, pour que le tas suive tout seul si la recette change un jour.
   Position choisie à l'écart de tout le reste de la carte maléfique (le lac
   à 47/30, EVIL_SPAWN au sud, EVIL_RETURN_PASSAGE au nord-ouest,
   EVIL_CAULDRON_SPAWN au nord-est, la rive est du défi de fuite à partir de
   EAST_LAKE_X=57) : un vrai recoin, au sud-ouest. */
export const EVIL_SHARDS_SPAWN = { x: 14, y: 50 };

// --- Clôture (posée librement par les joueurs, section par section) ---
export const FENCE_COST = 15; // prix d'une section de clôture à la boutique (payée en or, inchangé)

// --- Lampadaire (chantier 2026-07, demandé par Guillaume) ---
// Achetable à la boutique (payé en or, même principe que la clôture) puis
// posé librement avec l'outil Construction (case 8, nouvelle variante
// "lamp"). Fonctionnel : éclaire un rayon autour de lui une fois la nuit
// tombée (voir nightAlpha/lampsInView dans FermeGame.js, qui perce un halo
// de lumière au niveau de chaque lampadaire posé). Un seul palier pour
// l'instant ("lvl 1"), valeurs extrapolées (aucun chiffre précis demandé
// par Guillaume), à ajuster librement.
export const LAMP_COST = 5000;         // prix d'un lampadaire à la boutique (or)
export const LAMP_LIGHT_RADIUS = 4.5;  // rayon éclairé autour du lampadaire, en tuiles

// --- Épouvantail (chantier 2026-07, demandé par Guillaume) ---
// Achetable à la boutique (payé en or, même principe que le lampadaire) puis
// posé librement avec l'outil Construction (case 8, nouvelle variante
// "scarecrow"). Pensé pour effrayer les oiseaux, PAS ENCORE IMPLÉMENTÉS
// (instructions à venir) : pour l'instant purement posable, sans effet de jeu
// actif. Ne bloque PAS le passage (contrairement au mur/lampadaire, qui sont
// des poteaux) : il est pensé pour être planté au milieu d'un champ de
// cultures sans gêner la circulation entre les rangs — à confirmer par
// Guillaume, à ajuster librement si un blocage est finalement souhaité.
// Prix extrapolé (aucun chiffre précis demandé), à ajuster librement.
export const SCARECROW_COST = 400; // prix d'un épouvantail à la boutique (or)

// --- Herbe (chantier 2026-07, demande Guillaume) ---
// Achetable à la boutique (payée en or, 5 or/unité) puis posée librement avec
// l'outil Construction (case 8, nouvelle variante "grass"), UNIQUEMENT sur du
// sol labouré sec (G_TILLED). Permet de "reverse to the original state of
// grass" une case labourée qu'on ne veut plus cultiver. Même "modèle Clash of
// Clans" que lampadaire/épouvantail (chantier réel de BUILD_TIMES.grass, voir
// plus bas) : passe d'abord par G_GRASS_GROWING, puis redevient G_GRASS TOUTE
// SEULE une fois le délai écoulé, sans action supplémentaire du joueur.
// Définitif, pas de retrait (contrairement à fence/wall/lamp/scarecrow).
export const GRASS_COST = 5; // prix d'une unité d'herbe à la boutique (or)

// --- Moulin (chantier 2026-07, demande Guillaume : "transformation artisanale :
// prévoir la construction de bâtiments simples (fût, presse, four), qui
// transformeront une récolte brute en produit à plus forte valeur (fruits ->
// confiture, lait -> fromages, blé -> farine puis pain, laine -> vêtements)").
// Premier bâtiment de cette famille : transforme le Blé récolté (CROPS[
// MILL_WHEAT_CROP]) en sacs de farine. Achetable à la boutique (payé en or,
// même principe que le lampadaire) puis posé librement avec l'outil
// Construction (case 8, nouvelle variante "mill"), chantier réel d'1h avant
// d'être fonctionnel (voir BUILD_TIMES.mill). Une fois construit : stock de
// blé COMMUN à la case (world.mills, alimenté par n'importe quel joueur d'un
// simple clic dessus, voir resolveAct cas "millDeposit"), transformation EN
// CONTINU tant qu'il reste au moins MILL_WHEAT_PER_SACK blé en stock, au
// rythme fixe d'un sac toutes les MILL_BATCH_MS (voir E.millTick,
// fermeEngine.js). Les sacs de farine produits rejoignent un pool COMMUN à la
// salle (comme les gemmes, voir sharedRef.current.flour côté FermeGame.js),
// affiché dans le HUD en haut à gauche. Coût/temps de chantier/cadence/
// quantité par sac DONNÉS EXPLICITEMENT par Guillaume, appliqués tels quels ;
// MILL_STOCK_CAP (plafond de blé stockable dans un moulin) et FLOUR_SELL
// (prix de vente d'un sac) sont EXTRAPOLÉS (aucun chiffre précis demandé au-
// delà de la mécanique elle-même), à ajuster librement.
export const MILL_COST = 30000;              // prix d'un moulin niveau 1 à la boutique (or), donné par Guillaume
export const MILL_WHEAT_CROP = 4;            // index de "Blé" dans C.CROPS ci-dessus
export const MILL_WHEAT_PER_SACK = 1;        // Zip 301b (demande Guillaume : plus de farine pour moins de blé) : 2 -> 1 (1 blé = 1 sac)
export const MILL_BATCH_MS = 5 * 60 * 1000;  // Zip 261/262 (demande Guillaume : moulins plus rapides) : 15 -> 5 min réelles par sac
export const MILL_STOCK_CAP = 90;            // stock de blé max qu'un moulin peut contenir (extrapolé, ~30 sacs d'avance)
export const FLOUR_SELL = 55;                // prix de vente d'un sac de farine (extrapolé)
// Sucrerie (chantier canne à sucre) — miroir EXACT du moulin ci-dessus, pour
// pose/dépôt (resolveAct cas "sucrerieDeposit", pose auto via buySucrerieBuilding). Coût et
// stock cap extrapolés sur le même principe que le moulin (bâtiment plus
// "premium" que le moulin car culture plus chère, cf. FEUILLE_ROUTE) ; pas
// de MILL_BATCH_MS/PER_SACK équivalent tant que la transformation (Phase 3
// de la feuille de route) n'est pas branchée.
export const SUCRERIE_COST = 36000;          // prix d'une sucrerie à la boutique (or), extrapolé au-dessus du moulin
export const SUCRERIE_CANE_CROP = 8;         // index de "Canne à sucre" dans C.CROPS ci-dessus
export const SUCRERIE_CANE_PER_SACK = 1;     // inchangé : 1 canne consommée par cycle de production
// Zip 327 (demande Guillaume : rapprocher le rendement du sucre de celui de
// la farine, le sucre devenant un intrant boulangerie/pâtisserie) : chaque
// cycle produit désormais 2 sacs pour 1 canne consommée (au lieu de 1:1),
// et la cadence est alignée sur le moulin (5 min, au lieu de 8 min).
export const SUCRERIE_SACKS_PER_BATCH = 2;   // 1 canne -> 2 sacs de sucre par cycle
export const SUCRERIE_BATCH_MS = 5 * 60 * 1000; // 5 min réelles/cycle, aligné sur MILL_BATCH_MS
// Zip 368 (demande Guillaume : "augmentons la capacité de stockage de la
// sucrerie en canne, passer à 200") : 90 -> 200. Le moulin (MILL_STOCK_CAP)
// reste volontairement à 90 — la demande ne portait que sur la sucrerie, et
// c'est le seul endroit où les deux bâtiments cessent d'être des miroirs.
export const SUCRERIE_STOCK_CAP = 200;       // stock de canne max qu'une sucrerie peut contenir
export const SUCRERIE_SPEED_MIN_MULT = 1;    // miroir de MILL_SPEED_MIN_MULT (parallélisme par répartition du dépôt, pas de boost par sucrerie)
export const SUGAR_SELL = 70;                // prix de vente d'un sac de sucre (extrapolé au-dessus de FLOUR_SELL, sucre = ressource plus rare)
// Chantier reprise (demande Guillaume) : la sucrerie devient un vrai
// bâtiment d'artisan comme les autres (ruche/fromagerie/boulangerie/scierie)
// — achetable SEULEMENT quand Jérôme Martial (skill "sugarworker") est
// résident, puis auto-posée à un emplacement de départ (plus de pose libre
// via la barre d'outils Construction, plus de retrait, un seul exemplaire).
// Chantier "sucrerie déplaçable" (2026-07, demande Guillaume : "qu'on puisse
// bouger le bâtiment sucrerie, comme les autres bâtiments d'artisans") :
// la sucrerie a finalement REJOINT C.ARTISAN_BUILDINGS/world.artisanBlocks
// (voir plus bas), exactement comme la ruche/fromagerie/boulangerie/scierie
// — collision RECTANGULAIRE pleine sur son footprint (w×h), déplaçable à la
// main (moveArtisan), achat via buyArtisanBuilding générique. Le sprite
// pixel-exact (95x88, voir fermeArt.js/sucrerieSprite) reste plus large que
// le footprint choisi : tonneaux/pressoir/tas de canne, dessinés hors du
// footprint (à droite/au-dessus), restent donc traversables tout seuls —
// même principe que le débordement du sawmill/de la fromagerie, sans avoir
// besoin d'une collision partielle dédiée. Voir ARTISAN_FACE_X/
// ARTISAN_DRAW_SCALE_OVERRIDE ci-dessous pour l'ancrage visuel exact
// (façade à x=36 dans le sprite, pas le centre de l'image) et
// E.migrateSucrerieToArtisan (fermeEngine.js) pour la conversion des fermes
// sauvegardées AVANT ce chantier (tile O_SUCRERIE + world.sucreries).
export const SUCRERIE_SITE = { x: 73, y: 45 }; // coin haut-gauche du footprint (2x2) — anciennement site.x/y du tile solide unique (74,46), décalé de -1/-1 pour que le footprint reste centré au même endroit à l'écran
// IMPORTANT (chantier "sucrerie déplaçable") : constante FIGÉE séparée de
// SUCRERIE_SITE ci-dessus, qui référence désormais le footprint (a changé de
// sens/valeur avec ce chantier). clearGhostSucreries/migrateSucrerieToArtisan
// (fermeEngine.js) ont besoin de l'ANCIENNE coordonnée exacte du tile solide
// unique posé par l'ancien modèle (zips 317-324) pour retrouver/convertir une
// sucrerie sauvegardée AVANT ce chantier — ne JAMAIS faire varier cette
// constante avec SUCRERIE_SITE (qui, elle, peut continuer à être ajustée si
// le footprint doit encore bouger un jour).
export const SUCRERIE_LEGACY_SOLID_TILE = { x: 74, y: 46 };
// Zip 286 (demande Guillaume : "quand une ferme dépose plusieurs moulins, il
// faut qu'ils fonctionnent en même temps, qu'ils produisent la farine plus
// vite. 2 moulins = x2, 3 moulins = x3") : chaque moulin garde son propre
// stock de blé indépendant (inchangé, cf. ci-dessus), mais son rythme de
// production (MILL_BATCH_MS) est maintenant divisé par le nombre de moulins
// TERMINÉS (chantier fini, voir buildReady) sur la ferme au moment du tick —
// voir E.millTick(ms, now, speedMult) et son appel dans FermeGame.js, qui
// compte ce nombre avant la boucle. Avec 2 moulins construits, chacun sort un
// sac 2x plus vite qu'un moulin seul ; avec 3, 3x plus vite — exactement le
// x2/x3 demandé, tant qu'il reste du blé en stock dans le(s) moulin(s)
// concerné(s). Pas de plafond volontairement (aucune limite demandée sur le
// nombre de moulins ni sur ce multiplicateur).
export const MILL_SPEED_MIN_MULT = 1; // multiplicateur plancher (1 moulin construit = vitesse normale)
// Zip 301b (demande Guillaume : "les faire fonctionner en même temps, pas
// individuellement ; un clic sur l'un déclenche tous et divise le travail") :
// un dépôt de blé sur N'IMPORTE quel moulin RÉPARTIT désormais le blé sur TOUS
// les moulins terminés de la ferme (voir resolveAct cas "millDeposit"), qui
// broient alors EN PARALLÈLE, chacun sa part. Le débit total est donc ~×N pour
// N moulins (2 moulins = 2× plus de farine par minute, etc.), obtenu par la
// répartition + le broyage simultané, chaque moulin tournant à sa cadence de
// base. On remet donc le multiplicateur de vitesse par moulin à 1 (le boost
// "MILL_BATCH_MS ÷ nb de moulins" du zip 286 est remplacé par ce parallélisme,
// sinon le cumul répartition × boost donnerait un ×N² surpuissant).
export const MILL_GROUPED_DEPOSIT = true;

// --- Temps de construction réels (chantier 2026-07, "modèle Clash of Clans") ---
// Toute infrastructure posée par un joueur (lampadaire pour l'instant, et
// toute future construction similaire) n'est PAS fonctionnelle immédiatement :
// elle reste un chantier en cours pendant BUILD_TIMES[kind] (durée RÉELLE en
// ms, indépendante du cycle jour/nuit — même philosophie que growMs/
// WATER_VALID_MS/prodMs), avant de devenir utilisable. Techniquement, le
// champ objHp existant (jusqu'ici une simple valeur de robustesse à 1 pour
// ces objets non dégradables) est réutilisé pour y stocker l'horodatage de
// fin de chantier (`readyAt`) : aucun nouveau champ réseau/sauvegarde
// nécessaire, en suivant le même pattern "état dérivé purement d'un
// horodatage partagé" déjà utilisé pour les cultures/animaux (voir
// `buildReady`/`buildRemainingMs` dans fermeEngine.js). Pour ajouter une
// future infrastructure au même système : lui donner une entrée ici, la
// poser en stockant `now + BUILD_TIMES.<kind>` dans objHp, et vérifier
// `E.buildReady(...)` avant de la considérer fonctionnelle côté rendu.
export const BUILD_TIMES = {
  lamp: 15 * 60 * 1000,     // lampadaire niveau 1 : 15 minutes réelles (valeur donnée par Guillaume)
  scarecrow: 10 * 1000,     // épouvantail : 10 secondes réelles (valeur donnée par Guillaume)
  grass: 5 * 1000,          // repousse de l'herbe sur une case labourée : 5 secondes réelles (valeur donnée par Guillaume)
  mill: 60 * 60 * 1000,     // moulin niveau 1 : 1 heure réelle (valeur donnée par Guillaume)
  // sucrerie : ENTRÉE DÉSORMAIS INUTILISÉE (chantier "sucrerie déplaçable",
  // demande Guillaume : "comme les autres bâtiments d'artisans") — la
  // sucrerie a rejoint C.ARTISAN_BUILDINGS, qui suit le modèle
  // buyArtisanBuilding (construction INSTANTANÉE, comme la ruche/fromagerie/
  // boulangerie/scierie, aucune ne passe par BUILD_TIMES/objHp). Laissée ici
  // en commentaire pour la trace ; si un délai de chantier est un jour
  // redemandé spécifiquement pour la sucrerie, il faudra un mécanisme dédié
  // (crafts.sucrerie n'a pas d'objHp, cf. migrateSucrerieToArtisan).
  // sucrerie: 60 * 60 * 1000,
  cauldron: 5 * 1000,       // chaudron : 5 secondes réelles (extrapolé, pas de "bâtiment" au sens propre, cohérent
                             // avec l'absence de mini-jeu à la concoction elle-même, voir doc -50)
};

// --- Constructions bois/pierre (chantier 2026-07) ---
// Le joueur convertit du bois/de la pierre récoltés en sections prêtes à poser
// (clic sur l'icône bois/pierre du HUD -> menu Construire/Vendre), puis les
// pose avec l'outil clôture (case 8), qui devient un outil "Construction"
// générique à 3 variantes (clôture/mur/chemin, voir buildKind côté client).
// La clôture en bois rejoint le MÊME stock que celle achetée en or (f.inv.fence) :
// une section reste une section, quelle que soit son origine. Le mur et le
// chemin ont chacun leur propre stock (f.inv.wall / f.inv.path). Valeurs
// choisies par extrapolation (aucun chiffre précis demandé), à ajuster.
export const BUILD_COSTS = {
  fence: 4, // bois par section de clôture fabriquée
  wall: 5,  // pierre par section de mur
  path: 2,  // pierre par dalle de chemin
};

// --- Ponts (chantier 2026-07, demande Guillaume) ---
// Les 2 ponts fixes générés à la carte (voir generateWorld) ne sont plus déjà
// construits : chaque case de la traversée est un site à bâtir (G_BRIDGE_SITE),
// au choix en bois OU en pierre (2 types de pont, pas un coût combiné des
// deux). Contrairement à la clôture/au mur/au chemin, PAS de section à
// fabriquer au préalable via le menu Construire : le coût est prélevé
// directement sur l'inventaire de bois/pierre récolté au moment de poser
// chaque case (voir resolveAct cas "bridge"). Une fois posée, une case de
// pont est PERMANENTE (pas de retrait/remboursement, pour ne jamais risquer
// de piéger un joueur en pleine rivière en retirant la case sous ses pieds).
export const BRIDGE_COST_WOOD = 20;  // bois par case de pont en bois
export const BRIDGE_COST_STONE = 15; // pierre par case de pont en pierre

// --- Dégradation du pont bois + rénovation en pierre (chantier 2026-07, demande Guillaume) ---
// "problème rénovation du pont : une fois qu'il est totalement construit, il
// perd deux tuiles par nuit, car il est en bois. La rénovation en pierre doit
// changer l'aspect du pont (aspect pierre joli), et lui permettre de résister
// à la dégradation." Décisions validées par Guillaume (3 questions à choix
// multiples, conformément à la section 3) : la dégradation ne démarre QUE
// lorsque toute la traversée est déjà bâtie (aucune case encore en
// G_BRIDGE_SITE) ; les cases perdues sont tirées AU HASARD parmi les cases
// bois (G_BRIDGE/G_BRIDGE_CLOSED) de la traversée, pas depuis les bords ni
// toujours la même ; une case perdue redevient un chantier G_BRIDGE_SITE
// normal (à rebâtir comme au tout début, bois ou pierre). La rénovation en
// pierre se fait case par case, DIRECTEMENT sur une case de pont bois déjà
// construite (G_BRIDGE/G_BRIDGE_CLOSED) — pas besoin de la redétruire — et la
// transforme en G_BRIDGE_STONE (résistante, ne peut plus jamais être tirée
// par la dégradation).
export const BRIDGE_DECAY_PER_NIGHT = 2; // nombre de cases bois perdues, au hasard, chaque nuit ÉLIGIBLE (voir
                                          // BRIDGE_DECAY_EVERY_N_NIGHTS), par traversée ENTIÈREMENT construite
                                          // (aucun site restant) ; si moins de cases bois restent que ce nombre
                                          // (ex: presque tout rénové), seules les cases bois restantes sont
                                          // perdues (jamais les cases pierre).
export const BRIDGE_DECAY_EVERY_N_NIGHTS = 2; // fréquence de la dégradation (chantier 2026-07, ajusté par
                                               // Guillaume : "c'est trop fréquent sinon" — passé d'une dégradation
                                               // toutes les nuits à une nuit SUR DEUX). Comparé au compteur `day`
                                               // transmis à `newDay` (voir fermeEngine.js) : la dégradation ne se
                                               // déclenche que si `day % BRIDGE_DECAY_EVERY_N_NIGHTS === 0`.
export const BRIDGE_RENOVATE_COST_STONE = 15; // pierre par case pour rénover une case de pont bois déjà construite
                                               // en pierre (résistante) ; même tarif que la construction initiale en
                                               // pierre (BRIDGE_COST_STONE), valeur extrapolée à ajuster librement.

// --- Levier de pont (chantier 2026-07, demande Guillaume) ---
// "les ponts en pierre et en bois doivent pouvoir être refermés et ouverts à
// l'aide d'un levier [...] car on ajoutera des ennemis et des animaux
// dangereux sur la rive droite, il faudra donc que le pont puisse être ouvert
// et fermé à notre guise pour les bloquer". Décisions validées par Guillaume
// (3 questions à choix multiples, conformément à la section 3) : le levier
// est posé AUTOMATIQUEMENT dès qu'une traversée est entièrement construite
// (aucun coût, aucun objet à équiper) ; le pont fermé reste VISIBLE (une
// barrière apparaît par-dessus, il ne redevient pas un chantier) ; il bloque
// TOUT LE MONDE, joueurs compris (pas seulement les futurs ennemis/animaux).
// Aucune position précise de levier n'a été demandée : posé sur la berge,
// côté maison (ouest), au milieu de la largeur de la traversée — extrapolé,
// à ajuster librement. Le pont bâti (G_BRIDGE) reste toujours PERMANENT au
// sens du chantier précédent (jamais retiré/remboursé en ressources) : seul
// son état de passage bascule via le levier, voir G_BRIDGE_CLOSED plus haut.
export const BRIDGE_LEVER_OFFSET = 7; // décalage (en cases) du levier par rapport au bord ouest de la traversée

// --- Élevage ---
// Enclos près de la maison (dans la zone déjà dégagée autour de la ferme).
export const PEN = { x: 48, y: 38, w: 8, h: 6 };
// Chaque animal produit un bien à ramasser puis vendre (ou manger), toutes les
// `prodMs` (durée RÉELLE, indépendante du cycle jour/nuit, voir zip 151).
// Prix d'achat très nettement augmentés (demande 2026-07 : "pas du tout assez
// chers, sauf les poules") ; seule la poule reste au même prix qu'avant.
// `edible`/`energy` : la production peut aussi être mangée (comme un poisson)
// pour rendre de l'énergie, SAUF la laine qui n'est pas un aliment et reste
// uniquement vendable.
// Prix multipliés par 5 au zip 152 (hors Poule, déjà revue au zip 151).
// Prix de vente des productions (œuf, lait, laine, truffe) à nouveau
// multipliés par 5 (demande 2026-07, zip 156).
// Zip 253 (demande Guillaume) : COÛT D'ACHAT des animaux d'élevage divisé
// par 2,5 (120->48, 8000->3200, 10000->4000, 15000->6000, 25000->10000) pour
// rendre l'élevage plus accessible. Prix de vente (sell) inchangés.
//
// Zip 255 (demande Guillaume) : cadences de production revues pour poule/
// chèvre/brebis/cochon (durées RÉELLES, indépendantes du cycle jour/nuit) +
// prix de vente de la truffe fortement augmenté.
export const ANIMALS = [
  { id: 0, name: "Poule",  nameEn: "Hen",   cost: 48,    prodMs: 10 * MIN, prod: "Œuf",             prodEn: "Egg",         sell: 125,  edible: true,  energy: 15, body: "#f0e8d8", accent: "#d44a3f" },
  { id: 1, name: "Chèvre", nameEn: "Goat",  cost: 3200,  prodMs: 20 * MIN, prod: "Lait de chèvre",  prodEn: "Goat milk",   sell: 300,  edible: true,  energy: 22, body: "#d8cbb0", accent: "#7a6a52" },
  { id: 2, name: "Brebis", nameEn: "Sheep", cost: 4000,  prodMs: 45 * MIN, prod: "Laine",           prodEn: "Wool",        sell: 450,  edible: false, energy: 0,  body: "#f2f0ea", accent: "#c8c0b0" },
  { id: 3, name: "Cochon", nameEn: "Pig",   cost: 6000,  prodMs: 5 * H,    prod: "Truffe",          prodEn: "Truffle",     sell: 2900, edible: true,  energy: 28, body: "#e8a8b0", accent: "#c07882" },
  // Zip 255 : vache à 1h réelle. Zip 265 (demande Guillaume : « augmente le
  // rendement du lait, toutes les 20 minutes par vache ») : cadence ramenée à
  // 20 min réelles -> ×3 de lait par vache. Prix de vente inchangé (600).
  { id: 4, name: "Vache",  nameEn: "Cow",   cost: 10000, prodMs: 20 * MIN, prod: "Lait",            prodEn: "Milk",        sell: 600,  edible: true,  energy: 26, body: "#efe7dc", accent: "#5a4634" },
];
// Zip 254 (demande Guillaume) : echelle d'affichage par animal (rendu en jeu
// uniquement — purement visuel, aucune incidence sur la logique/collisions,
// qui restent en coordonnees de tuiles). Le sprite natif fait 16x14 px ; le
// cheval est dessine a 28x24 (~1,75x). Objectif : "vache aussi grande que le
// cheval, chevre plus grande qu'avant mais plus petite que la vache", et une
// echelle coherente pour le reste du cheptel. Indexe par `id` d'ANIMALS :
// [poule, chevre, brebis, cochon, vache].
export const ANIMAL_DRAW_SCALE = [1, 1.35, 1.25, 1.4, 1.7];

// ==========================================================================
// Zip 369 — REFONTE DU CHEPTEL (maquettes validées par Guillaume).
//
// 1) SPRITES NATIFS. Jusqu'ici un canevas unique de 16x14 était AGRANDI à
//    l'écran par ANIMAL_DRAW_SCALE ci-dessus (jusqu'à x1,7 pour la vache) :
//    au plus proche voisin, un pixel source devenait un bloc de 1 ou 2 px
//    selon sa position, d'où l'aspect grossier et irrégulier. Chaque animal
//    a désormais son propre canevas, à sa taille FINALE : plus aucun
//    agrandissement au rendu, chaque pixel dessiné est un pixel écran.
//    ANIMAL_DRAW_SCALE n'est plus appliqué au dessin ; il est conservé parce
//    que les tailles ci-dessous en sont dérivées (16x14 x l'échelle, arrondi)
//    et qu'il documente les rapports voulus au zip 254.
//
// 2) LES CANEVAS SONT PLUS GRANDS QUE LE DESSIN AU REPOS, volontairement.
//    Alerte de Guillaume : "attention de ne pas couper le sprite à cause de
//    l'animation qui pourrait nécessiter d'utiliser plus de largeur". Mesure
//    faite sur les 4 frames de marche ET les cycles complets de broutage et
//    de repos, contour compris : les cinq sprites étaient coupés. La tête qui
//    broute avance vers l'avant en descendant (jusqu'à 2 px à droite), et la
//    chèvre perdait le bout de ses cornes vers le haut. Les valeurs ci-dessous
//    sont la boîte englobante réelle de tout le cycle, plus 1 px de garde de
//    chaque côté.
//
// 3) ANCRAGE SUR LE CORPS, PAS SUR LA BOÎTE. Les marges sont ASYMÉTRIQUES (de
//    la place à droite pour le mufle, pas à gauche), donc centrer la boîte
//    comme avant décalerait tout le troupeau au sol. `cx` = colonne du centre
//    du CORPS, `footY` = ligne de contact au sol : le rendu place cx sur le
//    centre de la tuile et footY sur le sol (voir FermeGame.js). `cx` sert
//    AUSSI d'axe au retournement vers la gauche : miroiter autour de la boîte
//    ferait sauter la bête latéralement de 2 x (cx - w/2) à chaque demi-tour.
//    `dx`/`dy` = translation appliquée une fois au contexte dans animalSprite,
//    pour que le code de dessin garde son repère naturel.
export const ANIMAL_SPRITE = [
  { w: 19, h: 16, footY: 14, cx:  9, dx:  1, dy:  0, topY: 1 }, // poule
  { w: 24, h: 23, footY: 21, cx: 12, dx: -1, dy:  2, topY: 1 }, // chèvre
  { w: 23, h: 18, footY: 16, cx: 11, dx:  0, dy: -2, topY: 1 }, // brebis
  { w: 25, h: 18, footY: 16, cx: 12, dx:  0, dy: -3, topY: 1 }, // cochon
  { w: 30, h: 24, footY: 22, cx: 15, dx: -1, dy: -1, topY: 1 }, // vache
];
// Robes. Demande Guillaume : "aléatoire pour les animaux d'élevage, seulement
// cosmétique" — d'où un champ `skin` TIRÉ AU HASARD À L'ACHAT côté hôte, puis
// PERSISTÉ avec la bête (voir s.animals.push et normalizeAnimals). Tiré une
// fois et conservé, et non retiré à chaque affichage : sinon la même vache
// changerait de robe à chaque session, et surtout n'aurait pas la même robe
// sur les deux écrans. Le champ voyage déjà, `animals` étant diffusé en bloc.
// Références fournies par Guillaume : poule chamois à camail brun, holstein
// noire et blanche, limousine crème unie.
export const ANIMAL_SKINS = [
  [ { id: "blanche",   body: "#f0e8d8", hack: "#e6d9c0", tail: "#f7f1e4", comb: "#d44a3f", foot: "#e8a83a" },
    { id: "brune",     body: "#eecf94", hack: "#a8623a", tail: "#f2e3bf", comb: "#cf3a2c", foot: "#dd9a34" } ],
  [ { id: "fauve",     body: "#d8cbb0", patch: "#7a6a52", muz: "#b5a68a", hoof: "#3a2f26", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "blanche",   body: "#f2f0ea", patch: "#8a7c68", muz: "#9a8c78", hoof: "#2e2620", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "rose",      body: "#e8a8b0", patch: "#c07882", muz: "#c07882", hoof: "#3a2f26", horn: "#cbbfa4", pat: 0 } ],
  [ { id: "holstein",  body: "#f4f2ee", patch: "#2c2926", muz: "#d7a9a2", udder: "#e8a89f", hoof: "#2a2622", horn: "#d8cdb4", pat: 1 },
    { id: "limousine", body: "#d3a065", patch: "#c08d52", muz: "#e6cdae", udder: "#dda898", hoof: "#6a563c", horn: "#e2d3b0", pat: 0 } ],
];
// Broutage / picorage (demande Guillaume : "il faut qu'elles broutent ou
// picorent quand elles sont à l'arrêt — tête qui pique vers le bas et remonte
// rapidement pour les poules, tête qui reste vers le bas pendant que l'animal
// avance lentement ou reste immobile pour le gros bétail").
//
// Aucune incidence réseau : animalPos (fermeEngine.js) est déjà 100 % LOCAL et
// dérive tout de l'horloge globale, avec un déphasage par animal — les bêtes
// ne picorent donc pas en cœur, et les deux joueurs voient la même chose sans
// qu'un seul message soit émis. Les frames 0 à 3 restent la marche ; 4 à 7
// sont les poses de tête basse. `seq` est parcourue sur `cycleMs`.
export const ANIMAL_FRAMES = 8;
export const ANIMAL_GRAZE = [
  { cycleMs: 1450, seq: [0, 4, 5, 4, 0, 0, 4, 5, 4, 0] }, // poule : deux coups de bec brefs par cycle
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // chèvre : tête basse tenue, mâchoire
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // brebis
  { cycleMs: 5400, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // cochon : fouille un peu plus vite
  { cycleMs: 6200, seq: [4, 5, 6, 5, 6, 5, 6, 5, 7, 0] }, // vache
];
// Descente de la tête par frame de broutage (frames 4,5,6,7), en pixels, et
// frame où la mâchoire mastique. La poule pique franchement et brièvement ; le
// gros bétail descend plus bas et y reste.
export const ANIMAL_HEAD_DROP = [
  { d: [1.4, 3.8, 3.8, 1.4], chew: -1 }, // poule
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // chèvre
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // brebis
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // cochon
  { d: [1.8, 4.4, 4.4, 2.6], chew:  6 }, // vache
];
// --- Missions d'équipe : SUPPRIMÉES au zip 368 -----------------------------
// Demande Guillaume : "supprimer l'animation de team mission qui flotte (le
// chantier qui bounce). C'est pas intéressant" -> puis, en arbitrage :
// "supprimer celui de la mission d'équipe totalement, ainsi que la mission
// d'équipe associée".
// Étaient définis ici COOP_SITE (le point de dépôt, x44 y42) et COOP_MISSIONS
// (deux chantiers tirés au sort, irrigation et agrandissement de la maison,
// avec leurs cibles bois/pierre et leur récompense en or). Tout le système est
// parti avec eux : déclenchement automatique à 2 joueurs en ligne, dépôt par
// la touche E, panneau HUD, marqueur flottant, lignes de chat, champ `coop`
// dans l'état partagé et dans la persistance, et le +2 de farmPopularity.
// Une vieille sauvegarde peut encore contenir un champ `coop` : il est
// simplement IGNORÉ au chargement (aucune lecture ne subsiste), les
// ressources qui y avaient été déposées sont perdues — arbitrage assumé de
// Guillaume, au maximum 60 bois et 40 pierre une seule fois.
// À NE PAS confondre avec la GRANGE collaborative (BARN_LEVELS/BARN_SITE
// ci-dessous), qui reste en place : c'est le chantier coopératif PERSISTANT,
// et lui seul. Deux chaînes de texte portent encore le préfixe "coop" parce
// que le dépôt à la grange les réutilise : `toastCoopNothing`, et
// `woodLabel`/`stoneLabel`.

// --- Grange collaborative (zip 158) : premier "chantier persistant" issu ---
// des missions d'équipe (voir section 0 du contexte). Contrairement à
// COOP_SITE/COOP_MISSIONS (missions aléatoires, temporaires, tirées au
// hasard), la grange a un emplacement FIXE et son niveau SURVIT d'une
// session à l'autre : à chaque palier construit, le bâtiment reste visible
// sur la carte et grandit. But annoncé par Guillaume : augmenter durablement
// le nombre d'animaux possible. S'ajoute aux missions aléatoires existantes,
// ne les remplace pas (elles continuent de se déclencher normalement).
// Repositionnée au zip 161 à droite de l'enclos de départ (PEN, x:48-56) :
// l'ancien emplacement (37,44) gênait la lisibilité près de la maison une
// fois les lampadaires/chevaux du zip 160 ajoutés. Bien dégagée de la PEN
// (marge de plusieurs tuiles) pour laisser la place au palier 3, bien plus
// grand désormais (voir barnSprite() dans fermeArt.js) — generateWorld
// dégage spécifiquement une zone assez large autour de ce point (sol forcé
// en herbe + arbres/rochers retirés), voir fermeEngine.js.
export const BARN_SITE = { x: 67, y: 41 };
export const BARN_LEVELS = [
  // Palier 1 : construction initiale (la grange n'existe pas avant). Coût en
  // or ajouté au zip 161 (en plus du bois/pierre), demandé par Guillaume :
  // il faut réunir une somme déterminée pour LANCER les travaux d'un palier,
  // payée dès que le bois/la pierre du palier sont réunis (voir
  // resolveBarnDeposit dans fermeEngine.js).
  // Zip 265 (demande Guillaume : « augmente la capacité de la grange pour
  // accueillir 50 animaux ») : bonus relevés pour atteindre 50 au palier max
  // (base MAX_ANIMALS 12 + 10 + 12 + 16 = 50). Progression : 12 (enclos) -> 22
  // (niv.1) -> 34 (niv.2) -> 50 (niv.3). SANS surcoût realtime : les animaux ne
  // sont PAS diffusés en continu (déambulation dérivée de l'horodatage, comme
  // les cultures — voir animalPos) ; seuls des événements discrets (ajout,
  // ramassage, déplacement) et le snapshot de join portent le tableau, un peu
  // plus long mais envoyé rarement. Coûts (bois/pierre/or) inchangés.
  { level: 1, cost: { wood: 150, stone: 100, money: 10000 }, hits: 6, animalBonus: 10 },
  { level: 2, cost: { wood: 250, stone: 180, money: 20000 }, hits: 8, animalBonus: 12 },
  { level: 3, cost: { wood: 400, stone: 300, money: 50000 }, hits: 10, animalBonus: 16 },
];
export const MAX_ANIMALS = 12;      // limite d'animaux dans l'enclos, avant toute grange
export const COLLECT_RANGE = 1.5;   // distance pour ramasser une production
// Déambulation lente (zip 152) : purement dérivée de l'horodatage (comme
// cropGrowState), aucun message réseau supplémentaire. `hx`/`hy` (ancrage,
// synchronisé) restent fixes ; la position affichée/logique oscille autour
// de cet ancrage. Rayon volontairement petit pour rester dans l'enclos de
// départ (les animaux y naissent à au moins 1 case des clôtures).
export const ANIMAL_WANDER_RADIUS = 0.55;    // amplitude en tuiles
export const ANIMAL_WANDER_PERIOD_MS = 7000; // période de base (conservée, non réutilisée par animalPos depuis zip 255)
export const ANIMAL_PICK_RANGE = 1.8;        // portée pour attraper/déposer un animal (= ACT_RANGE)
// Broutage/marche (zip 255, demande Guillaume : "faire bouger les animaux de
// la ferme de manière cohérente et légèrement plus détaillée, animer les
// pattes, changer de direction, s'arrêter"). Toujours 100% local (dérivé de
// hx/hy/type/horodatage, comme cropGrowState/animalPos) : aucun trafic réseau
// ajouté. Cycles longs, l'animal broute (arrêté) la plupart du temps puis
// marche vers un point voisin et en revient — même mécanique de cycle que
// les loups/lapins (animT->frame), mais purement locale au lieu d'être
// diffusée par l'hôte.
export const ANIMAL_CYCLE_MS = 13000;        // durée de base d'un cycle brouter/marcher (variée par animal)
export const ANIMAL_WALK_MS = 2200;          // portion du cycle passée à marcher (le reste = broute, arrêté)
export const ANIMAL_WALK_FRAME_MS = 260;     // durée d'une frame de patte pendant la marche (4 frames, cf. loups)

// --- Cycle jour/nuit (seuils partagés) ---
// Extraits ici (au lieu de rester en constantes locales dans nightAlpha,
// FermeGame.js) pour que la logique des loups (chantier 2026-07, demande
// Guillaume) puisse déterminer "est-ce la nuit ?" avec EXACTEMENT les mêmes
// paliers que le voile visuel, sans dupliquer les valeurs à deux endroits.
export const DAWN_START_MIN = 5 * 60 + 30, DAWN_END_MIN = 6 * 60 + 30;   // 5h30 → 6h30
export const DUSK_START_MIN = 17 * 60, DUSK_MID_MIN = 20 * 60, DEEP_END_MIN = 23 * 60; // 17h / 20h / 23h

// --- Météo : journées grises d'orage/pluie (chantier 2026-07, demande
// Guillaume : "ajouter des journées grises d'orages et pluie, une toutes les
// 7") ---
// PUREMENT visuel/ambiance pour l'instant : un jour sur STORM_EVERY_N_DAYS
// (day % STORM_EVERY_N_DAYS === 0, donc jour 7, 14, 21…) est marqué comme
// orageux dès son tout début (voir E.isStormyDay, dérivé du même compteur
// `day` que le reste — aucun tirage aléatoire, prévisible et reproductible
// pour tous les joueurs de la ferme). AUCUN effet de gameplay volontaire
// (pousse des cultures, énergie, déplacement… tout inchangé) : uniquement un
// voile gris semi-transparent + des traits de pluie qui défilent à l'écran
// (voir le rendu dans FermeGame.js, juste après le voile nocturne). Message
// de chat dédié au lever du jour (L.chatStormyDay), en plus du message
// "Jour N" habituel.
export const STORM_EVERY_N_DAYS = 7;      // 1 jour orageux tous les N jours (0 = désactivé)
export const STORM_TINT_ALPHA = 0.28;     // opacité du voile gris (composé AVANT le voile nocturne, s'additionne la nuit)
export const STORM_RAIN_COUNT = 70;       // nombre de traits de pluie affichés simultanément
export const STORM_RAIN_SPEED = 420;      // vitesse de chute, px/seconde (écran, indépendant du zoom)
export const STORM_RAIN_LEN = 14;         // longueur d'un trait de pluie, px

// --- Loups (chantier 2026-07, demande Guillaume : "loups assez détaillés,
// rive droite de la rivière, ponts non fermés, torche pour les éloigner") ---
// Simulation PUREMENT hôte (comme les chevaux sifflés) : les loups
// apparaissent chaque nuit rive droite (côté opposé à la ferme, x plus grand
// que le centre de la rivière à leur rangée), rôdent, et ne peuvent tenter
// de traverser vers l'enclos QUE par un pont construit ET ouvert (G_BRIDGE,
// jamais G_BRIDGE_SITE ni G_BRIDGE_CLOSED — même règle de collision que les
// fermiers). Ils repartent à l'aube, quel que soit leur avancement.
export const WOLF_COUNT = 3;              // loups actifs par nuit
export const WOLF_SPEED_STOP = 0;         // état 1/3 : à l'arrêt (guet, repas)
export const WOLF_SPEED_SLOW = 1.05;      // état 2/3 : marche lente (rôde / approche)
export const WOLF_SPEED_FAST = 3.5;       // état 3/3 : marche rapide (chasse, fuite de la torche)
export const WOLF_MAX_KILLS_PER_NIGHT = 2; // perte maximale d'animaux d'élevage, par nuit
export const WOLF_EAT_RANGE = 0.9;        // portée d'attaque sur un animal de l'enclos
export const WOLF_EAT_MS = 3500;          // durée d'un repas avant que l'animal disparaisse
export const WOLF_HUNT_TRIGGER_MS = 9000; // délai moyen avant qu'un loup au repos décide de partir chasser
export const WOLF_SPAWN_MARGIN = 5;       // marge (tuiles) au-delà de la berge est pour l'apparition
export const WOLF_ROAM_RADIUS = 7;        // amplitude de rôdaille rive droite
export const WOLF_TORCH_RANGE = 6;        // rayon d'effroi autour d'une torche allumée
export const WOLF_FLEE_COOLDOWN_MS = 4000; // temps avant de reprendre son activité après une fuite
// Mise à mort d'un loup (chantier 2026-07, demande Guillaume : "un moyen de
// tuer les loups et les ennemis après trois victoires au mini-jeu"). Symétrique
// des créatures maléfiques (voir EVIL_MONSTER_KILL_WINS) : compteur PAR JOUEUR
// et PAR LOUP (wf.biteWins[playerId], côté hôte). À la WOLF_KILL_WINS-ième
// victoire d'un même joueur contre CE loup, il meurt (phase "dead" + animation)
// au lieu de fuir. WOLF_BITE_GRACE_MS = fenêtre garantie sans re-morsure du
// même loup sur ce joueur après CHAQUE victoire — corrige la boucle où un loup
// agressif re-mordait dès la frame suivante (le ré-aggro est aussi bloqué
// pendant flee/dead). WOLF_DEATH_ANIM_MS = durée de l'anim de mort avant despawn.
export const WOLF_KILL_WINS = 3;
export const WOLF_BITE_GRACE_MS = 3500;
export const WOLF_DEATH_ANIM_MS = 900;

// Loups agressifs (chantier 2026-07, demande Guillaume) : une minorité de
// loups, tirée UNE FOIS à l'apparition (voir wolfSpawnPos/updateWolves), ne
// fuit pas la torche et tente au contraire de mordre le fermier porteur.
export const WOLF_AGGRESSIVE_CHANCE = 0.2;   // ~1 loup sur 5
export const WOLF_SPEED_AGGRESSIVE = 4.4;    // > WOLF_SPEED_FAST : rattrape un fermier qui fuit
export const WOLF_BITE_RANGE = 0.75;         // distance déclenchant la morsure (mini-jeu)
export const WOLF_BITE_REACT_MS = 2800;      // durée du mini-jeu de riposte (rééquilibré 2026-07 : 2200ms + jauge trop punitive rendait le mini-jeu quasi impossible, voir aussi press/decay dans WolfBiteMinigame)
export const INJURED_MS = 10 * 60 * 1000;    // indisponibilité après une morsure manquée (10 min, survit à un refresh)
export const HEAL_KIT_COST = 0;              // trousse de soins, gratuite (magasin) — demande 2026-07
export const HEAL_REDUCE_MS = 60 * 1000;     // durée restante après soin par un autre joueur (1 min)
export const HEAL_RANGE = 2.5;               // distance max (tuiles) pour soigner un fermier blessé

// --- Greg, l'employé de champs de base (chantier 2026-07, demande Guillaume :
// engageable depuis le shop, arrose automatiquement toutes les 10h, exécute
// des ordres de labour/plantation/arrosage sur N cases, se balade tant qu'il
// est employé, contrat de 2 jours rémunéré). Un seul Greg par ferme (pas de
// liste, contrairement aux chevaux) : `sharedRef.current.greg` (voir
// FermeGame.js) vaut soit `null` (pas engagé), soit un objet d'état.
export const GREG_HIRE_COST = 400;                 // prix d'engagement (extrapolé, entre le puits et un cheval)
export const GREG_CONTRACT_MS = 2 * 24 * 60 * 60 * 1000; // durée réelle du contrat : 2 jours réels rémunérés
export const GREG_WATER_CHECK_MS = 8 * 1000;       // FIX 246 : scan des cultures assoiffées plus fréquent (15s -> 8s) — Greg arrose plus vite (demande Guillaume)
export const GREG_WATER_BATCH = 10;                // FIX 246 : plus de cases assoiffées par passage (6 -> 10), Greg arrose plus vite
export const GREG_SPEED = 3.2;                     // tuiles/seconde (rôdaille au repos = GREG_SPEED * 0.55)
export const GREG_TASK_SPEED = 4.3;                // FIX 246 : en mission Greg se déplace plus vite (demande Guillaume) — reste sous PLAYER_SPEED (5.2)
export const GREG_ROAM_RADIUS = 6;                 // amplitude de rôdaille autour de son ancre (même principe que WOLF_ROAM_RADIUS)
export const GREG_ANCHOR = { x: 26, y: 58 };        // point d'ancrage (rôdaille + tuiles de dépôt), au bord des champs ouest (puits)
export const GREG_TASK_RANGE = 0.6;                // distance d'arrivée sur une case de tâche avant de l'exécuter
export const GREG_ORDER_MAX = 200;                  // nombre max de GRAINES (pas de cases) par ordre (garde-fou anti-abus, zip 291)
// Extension du champ (chantier 2026-07) : Greg abat les arbres et casse les
// rochers trouvés autour de son ancre pour agrandir la zone cultivable, sans
// qu'un ordre explicite soit nécessaire — même esprit que l'arrosage auto.
// Niveau d'outil fixe (Greg n'a pas d'inventaire d'outils à améliorer) :
// équivalent hache/pioche niveau 1, comme un fermier qui n'a rien acheté.
export const GREG_AXE_LVL = 1;
export const GREG_PICK_LVL = 1;
export const GREG_CLEAR_RADIUS = 12;               // rayon de recherche d'arbres/rochers à dégager (plus large que GREG_ROAM_RADIUS : "étendre" le champ, pas juste l'entretenir)
export const GREG_CLEAR_BATCH = 3;                 // nb d'obstacles mis en file par passage de scan
export const GREG_CLEAR_CHECK_MS = 5 * 60 * 1000;  // fréquence de scan (5 min réelles) quand Greg n'a plus de tâche en attente


// --- Repos de Greg : pose assise sur un tabouret + 💤 (FIX 246, décision
// Guillaume : "pose assise dédiée"). Quand il rôde sans tâche, il s'assoit
// parfois un moment avant de reprendre sa balade tranquille.
export const GREG_SIT_CHANCE = 0.45;                 // proba., à chaque fin de cible de rôdaille, de s'asseoir au lieu de repartir
export const GREG_SIT_MIN_MS = 4000;                 // durée assise minimale
export const GREG_SIT_MAX_MS = 9000;                 // durée assise maximale

// Chantier 3 (feuille de route Greg, café d'Éthiopie) : mode "SuperGreg".
// x10 sur la vitesse de trajet vers une tâche (GREG_TASK_SPEED) et sur les
// dégâts infligés par gregChop/gregMine, PAS sur la rôdaille passive (roam)
// — décision Guillaume. Consomme le stock commun station.worldStock.coffee,
// PARTAGÉ avec SuperSoan (chantier 4) — pas de pool séparé.
export const SUPERGREG_SPEED_MULT = 10;          // multiplicateur de vitesse (trajet vers tâche uniquement)
export const SUPERGREG_DURATION_MS = 15 * 60 * 1000; // 15 min réelles
export const SUPERGREG_COOLDOWN_MS = 45 * 60 * 1000;  // 45 min réelles, démarre à la FIN de l'effet (décision Guillaume : 15+45=60 min entre deux prises)
export const SUPERGREG_COFFEE_COST = 1;          // unités de café consommées par activation

// --- Engrais (chantier 2026-07, suite plan validé) : ressource RARE achetée
// en or au shop (stock limité, se reconstitue tous les FERTILIZER_RESTOCK_EVERY_N_DAYS
// jours), stockée dans le pool commun sharedRef.current.gregStock.fertilizer
// (même esprit que gregStock.wood/stone) une fois achetée. Dépensée ensuite
// via un ordre à Greg ("gregFertilizeOrder", 1 engrais = 1 case) qui accélère
// la pousse d'une culture déjà plantée et non mûre. Prix extrapolés entre le
// coût d'une graine de blé (120) et celui du puits (600) : à ajuster au
// playtest si besoin (pas bloquant, voir plan).
export const FERTILIZER_BOOST_MS = 6 * H;           // temps de pousse retiré (fixe, quelle que soit la culture)
export const FERTILIZER_AREA_SIZE = 5;              // 1 engrais = 1 carré de FERTILIZER_AREA_SIZE x FERTILIZER_AREA_SIZE cases (centré sur le point choisi), demande 2026-07
export const FERTILIZER_COST = 150;                 // prix d'achat en or, à l'unité
export const FERTILIZER_RESTOCK_EVERY_N_DAYS = 2;   // cycle de réapparition dans le shop
export const FERTILIZER_SHOP_STOCK = 3;             // unités remises en stock à chaque réapparition

// --- Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume : "ajouter
// un employé chargé d'aller pêcher du poisson quand je lui en donne l'ordre").
// Même modèle que Greg ci-dessus (engageable au shop, rôdaille permanente
// autour de son ancre tant qu'il n'a pas de tâche, état persistant unique
// `sharedRef.current.soan`), avec deux différences volontaires :
// - Contrat réel de SOAN_CONTRACT_MS = 24h (pas 2 jours comme Greg).
// - Pas d'ordre "sur N cases" façon gregOrder : un seul ordre possible
//   ("soanOrder"), qui l'envoie au bord de la rivière le plus proche de son
//   ancre (findRiverbankTile, fermeEngine.js — même principe de recherche en
//   anneaux que findClearableTiles) où il pêche ensuite EN CONTINU (peut y
//   rester toute la journée) jusqu'à un nouvel ordre ou l'expiration du
//   contrat, plutôt qu'une tâche qui se termine après N unités.
export const SOAN_HIRE_COST = 400;                  // même prix que Greg (aucun élément ne les distingue économiquement)
export const SOAN_CONTRACT_MS = 24 * 60 * 60 * 1000; // 24h réelles (demande explicite de Guillaume, contrairement aux 2 jours de Greg)
export const SOAN_SPEED = 3.2;                      // identique à GREG_SPEED
export const SOAN_ROAM_RADIUS = 6;                  // rôdaille autour de son ancre tant qu'il n'a pas reçu d'ordre
export const SOAN_ANCHOR = { x: 60, y: 58 };        // ancre de rôdaille, entre la maison (x=40) et la rivière (x~70-120 selon la seed)
export const SOAN_TASK_RANGE = 0.6;                 // distance d'arrivée avant de pêcher, identique à GREG_TASK_RANGE
export const SOAN_RIVER_SEARCH_RADIUS = 60;         // rayon de recherche d'une berge (findRiverbankTile) autour de SOAN_ANCHOR — large car la rivière est sinueuse et sa position dépend de la seed
// Cycle travail/pause (chantier 2026-07, demande Guillaume : "il doit travailler
// pendant 30 minutes straight, puis prendre une pause de 15 minutes, il ira
// marcher, puis se remet au travail, boucle pendant 24h") : une fois posté à
// la rivière, Soan alterne indéfiniment pêche/pause jusqu'à un rappel ou
// l'expiration de son contrat (24h réelles ci-dessus, aucun minuteur de cycle
// séparé n'est nécessaire — la boucle s'arrête d'elle-même avec le contrat).
export const SOAN_WORK_MS = 45 * 60 * 1000;         // FIX 246 : Soan travaille plus (30 -> 45 min de pêche d'affilée, demande Guillaume)
export const SOAN_BREAK_MS = 8 * 60 * 1000;         // FIX 246 : pauses plus courtes (15 -> 8 min), Soan travaille plus
export const SOAN_BREAK_ROAM_RADIUS = 8;            // amplitude de balade pendant la pause, autour de la berge où il pêche
export const SOAN_FISH_INTERVAL_MS = 20 * 1000;     // pêche EN CONTINU pendant un bloc de travail ("il pioche des poissons continûment", demande Guillaume) : une prise toutes les 20s réelles (extrapolé, pas de mini-jeu pour un PNJ, contrairement au joueur)

// Chantier 4 (feuille de route Greg + résidents, café d'Éthiopie) : mode
// "SuperSoan", miroir de SuperGreg (chantier 3) mais appliqué à la pêche.
// Soan ne se déplaçant pas pendant la pêche, le seul levier est la
// fréquence de capture : intervalle divisé par SUPERSOAN_CATCH_MULT pendant
// le mode actif (20s → 2s), pas de changement sur SOAN_WORK_MS/SOAN_BREAK_MS.
// Cooldown démarrant à la FIN du travail (pas d'ambiguïté ici, contrairement
// à SuperGreg). Stock de café PARTAGÉ avec SuperGreg (station.worldStock.coffee).
export const SUPERSOAN_CATCH_MULT = 10;           // multiplicateur de fréquence de pêche (divise l'intervalle entre 2 prises)
export const SUPERSOAN_DURATION_MS = 30 * 60 * 1000; // 30 min réelles
export const SUPERSOAN_COOLDOWN_MS = 60 * 60 * 1000;  // 1h réelle, démarre à la FIN de l'effet
export const SUPERSOAN_COFFEE_COST = 1;           // unités de café consommées par activation — MÊME pool que SuperGreg

// ---- Zip 260 : Harald, l'AGENT D'ÉLEVAGE (demande Guillaume) ----
// Engagé à la boutique comme Soan, contrat réel de 24h payé d'avance (1000 or).
// Fait des RONDES autour de l'enclos (PEN) et RAMASSE les productions des
// animaux dès qu'elles sont prêtes (readyAt) pour éviter toute perte — œufs,
// lait, laine, truffe. Tout va au POOL COMMUN de la ferme (gregStock.animals,
// exactement comme le bois de Greg / les poissons de Soan : vendable par
// n'importe quel joueur au bac/menu Vendre). Aucune séparation par joueur.
// HORS-LIGNE : à la reconnexion, rattrapage PLAFONNÉ par animal (voir plus
// bas), borné par la fin du contrat — voir E.haraldCatchup / updateHarald.
export const HARALD_HIRE_COST = 4000;                  // demande Guillaume : 4000 or / 24h (was 1000)
export const HARALD_CONTRACT_MS = 24 * 60 * 60 * 1000; // 24h réelles (comme Soan)
export const HARALD_SPEED = 3.2;                       // identique à Greg/Soan
export const HARALD_ANCHOR = { x: 52, y: 41 };         // centre de l'enclos (PEN x48-56 / y38-44)
export const HARALD_ROAM_RADIUS = 4;                   // rôdaille serrée : reste dans/autour de l'enclos
export const HARALD_ROUND_MS = 12 * 1000;              // une "ronde" de ramassage toutes les 12 s réelles quand connecté (zéro perte en pratique)
// Filet ANTI-PERTE : un animal prêt depuis plus longtemps que ça est ramassé
// où qu'il soit (couvre les animaux qu'Harald ne peut pas atteindre à pied —
// déplacés derrière une clôture, etc.). Garantit le zéro-perte même si le
// pathing échoue, tout en laissant Harald faire ses rondes visibles sinon.
export const HARALD_FORCE_MS = 45 * 1000;
// Plafonds de rattrapage HORS-LIGNE, PAR ANIMAL (demande Guillaume : "6 par
// gros animal, 20 par poule"). On crédite au pool commun autant de cycles de
// production écoulés pendant l'absence que le plafond l'autorise.
export const HARALD_OFFLINE_CAP_HEN = 20;              // poule (ponte rapide)
export const HARALD_OFFLINE_CAP_BIG = 6;               // chèvre/brebis/cochon/vache

// --- Lapins (chantier 2026-07, demande Guillaume : "ajouter des petits
// lapins bien détaillés qui fuient et sont inoffensifs, surtout rive
// droite"). Contrairement aux loups : présents de JOUR COMME DE NUIT (juste
// moins nombreux la nuit), totalement inoffensifs (aucune interaction
// d'attaque), et attrapables via l'outil "déplacer" existant (case 9) —
// capture "pour le fun", sans effet économique (le lapin est simplement
// retiré de la carte, aucun gain d'or/objet). Simulation HÔTE UNIQUEMENT,
// même esprit que les loups (voir updateRabbits dans FermeGame.js).
export const RABBIT_COUNT_DAY = 10;        // population cible de jour
export const RABBIT_COUNT_NIGHT = 3;       // population cible de nuit (plus discrets)
export const RABBIT_SPEED_SLOW = 0.9;      // rôde tranquillement (inchangé)
export const RABBIT_SPEED_FLEE = 4.6;      // fuite une fois repéré (relevé 2026-07, nettement plus rapide qu'un fermier)
export const RABBIT_ROAM_RADIUS = 5;       // amplitude de rôdaille autour de son point d'ancrage
export const RABBIT_FLEE_RANGE = 3;        // distance en dessous de laquelle un lapin risque d'être repéré
export const RABBIT_FLEE_COOLDOWN_MS = 3500; // durée d'une fuite avant de reprendre son activité
export const RABBIT_NOTICE_CHECK_MS = 800; // FIX 246 : jets de repérage moins fréquents (550 -> 800ms), lapins plus faciles à approcher
export const RABBIT_UNSEEN_CHANCE = 0.38;  // FIX 246 : "pas vus" plus généreux (0.2 -> 0.38), ramassage des lapins facilité (demande Guillaume)
export const RABBIT_CATCH_RANGE = 2.6;     // FIX 246 : portée de capture élargie (1.8 -> 2.6), lapins plus faciles à attraper
export const RABBIT_CATCH_PICK_RADIUS = 2.2;  // FIX 246 : rayon de ciblage souris d'un lapin (nearestPickableRabbit), élargi (1.3 -> 2.2)
export const RABBIT_CATCH_FLEE_GRACE = 1.1;   // FIX 246 : on peut quand même attraper un lapin qui vient de détaler s'il est TRÈS proche (<= cette distance)
export const RABBIT_MIN_HOUSE_DIST = 35;   // distance min. à la maison pour apparaître ("zones éloignées de la maison")
export const RABBIT_EAST_BIAS = 0.8;       // proba. de favoriser la rive droite à l'apparition ("surtout rive droite")
export const RABBIT_RESPAWN_MS = 7000;     // délai minimum entre deux réapparitions (repop progressif, pas instantané)
export const RABBIT_FLEE_HOP_PX = 5;       // amplitude (pixels) du bond visuel en fuite (demande 2026-07, roam inchangé)

// --- Défi "chasse aux lapins" : RETIRÉ (zip 366) ---
// Les lapins sont désormais simulés localement par chaque client, comme les
// canards décoratifs (voir updateRabbits dans FermeGame.js) : ils ne
// consomment plus aucun message temps réel. Une course au premier arrivé n'a
// donc plus de sens — chaque joueur voit des lapins différents.
// Pour un futur défi de chasse à plusieurs (intention de Guillaume), il
// faudra rétablir une synchronisation TEMPORAIRE des bêtes concernées pendant
// la durée du défi seulement. Le trophée ci-dessous est resté en place
// exprès, prêt à être réutilisé.
// Trophée 🏆 du gagnant (correctif 2026-07, demande Guillaume : "il doit
// disparaitre au bout de 15 minutes") : n'est plus permanent, affiché
// seulement pendant HAT_DISPLAY_MS après la victoire (voir farmer.hatUntil,
// même mécanique d'horodatage que injuredUntil).
export const HAT_DISPLAY_MS = 15 * 60 * 1000;    // durée d'affichage du trophée après une victoire. Zip 366 : plus aucune source ne l'attribue (défi lapins retiré) — mécanisme conservé intact pour un futur défi.

// --- Torche (chantier 2026-07) : objet équipable (bouton dédié, comme le
// sifflet à chevaux), pas un slot d'outil numéroté. Éclaire comme un
// lampadaire portatif (rayon plus modeste) et fait fuir les loups à portée.
export const TORCH_LIGHT_RADIUS = 4.5; // rayon éclairé autour du porteur (tuiles)

/* ==========================================================================
   2026-07 TRAIN STATION UPDATE (project language switched to English by
   Guillaume's decision). New systems: rare sea creatures, decorative ducks,
   the west-side train station with its ad board, the 25-visitor roster
   (nice / neutral / hostile / rich patrons), relationships, unanimous
   residency votes with a dice tiebreak, the co-op damage-repair minigame,
   the visitor blacklist, and seasons. All state lives in the save JSON
   (sharedRef.station), no Supabase migration required.
   ========================================================================== */

// --- Rare sea creatures (fishing) ---
// Caught with the rod like fish, but stored in their own inventory array
// (inv.seaCreatures) so old saves and every existing FISH consumer (Soan,
// Greg's stall, the salve recipe) stay untouched. Sell-only for now.
export const SEA_CREATURES = [
  { id: 0, name: "Étoile de mer", nameEn: "Starfish", sell: 360, color: "#e8956a", weight: 0.5 },
  { id: 1, name: "Hippocampe",    nameEn: "Seahorse", sell: 550, color: "#d4b83f", weight: 0.32 },
  { id: 2, name: "Anguille",      nameEn: "Eel",      sell: 780, color: "#5a7a5f", weight: 0.18 },
];
export const SEA_MIN_STREAK = 3;          // casts before rares become possible (mid-river)
export const SEA_CHANCE = 0.30;           // rare chance per cast once eligible
export const SEA_EXTREME_FRAC = 0.15;     // top/bottom 15% of map rows = "extreme ends" of the river
export const SEA_EXTREME_FIRST_CHANCE = 0.35; // rare chance at the extreme ends, from the very first cast

// --- Decorative ducks (purely cosmetic, client-side, seeded per farm) ---
export const DUCK_COUNT = 6;
export const DUCK_SPEED = 0.35;           // tiles/s drift along the river
export const DUCK_TURN_MIN_S = 4;         // seconds between direction changes
export const DUCK_TURN_MAX_S = 10;

// --- Train station (west edge, pre-built, free) ---
// Zip 232 redesign (Guillaume: "big square and ugly" -> smaller + cuter):
// footprint shrunk from 6x5 to 4x3, platform shortened, and the rails now
// run along the ENTIRE west border (they used to stop at row 46, cutting
// off at the bottom-left corner).
export const STATION = { x: 6, y: 25, w: 4, h: 3 };  // station building footprint
export const STATION_PLATFORM = { x: 4, y: 23, w: 2, h: 8 }; // platform strip along the rails
export const STATION_RAIL_X = 2;          // rails occupy columns RAIL_X..RAIL_X+1 (ONE wide track, see railL/railR)
export const STATION_RAIL_Y0 = 0;         // rails run from the very top...
export const STATION_RAIL_Y1 = MAP_H - 1; // ...to the very bottom of the map
export const STATION_SIGN = { x: 10, y: 28 };  // the interactive ad board (press E), east of the building
export const STATION_CLEAR = { x: 1, y: 21, w: 10, h: 12 }; // objects cleared here at load (host normalization; rails are cleared separately over their full length, see clearStationArea)

// Solid buildings (zip 232, Guillaume: "users can't walk through or behind"
// the station and the barn). Full DRAWN rectangles in tiles (including the
// roof rows above the footprint), checked by blockedTile/blockedTileMounted
// via solidBuildingAt (fermeEngine.js). The barn rect depends on its level
// (sprite sizes 48/72/170 px, see barnSprite in fermeArt.js); blockedTile
// reads the current level from world.barnLevel, refreshed every frame in
// updateMe (FermeGame.js).
export const STATION_BLOCK = { x: 6, y: 24, w: 4, h: 4 }; // building + roof row above it
export const BARN_BLOCKS = [
  { x: 66, y: 39, w: 3, h: 3 },  // level 1 (48px sprite)
  { x: 65, y: 37, w: 5, h: 5 },  // level 2 (72px sprite)
  // Zip 260 (demande Guillaume : la grange niv.3 "trop envahissante", "pouvoir
  // passer DERRIÈRE le toit") : la collision est réduite aux 2 rangées de BASE
  // (murs/fondations) au lieu du rectangle dessiné complet. Le toit (rangées
  // au-dessus) devient traversable ; le tri de profondeur des `draws` (barn
  // ancrée à (BARN_SITE.y+1)*T) masque déjà le perso quand il est derrière —
  // donc on passe derrière le toit sans le traverser au sol.
  { x: 64, y: 40, w: 6, h: 2 },  // level 3 : base seule (footprint mur), toit non-bloquant
];
// Zip 260 : zone de DÉGAGEMENT d'objets au gen de map pour la grange
// (rectangle DESSINÉ complet du plus grand palier, TOIT INCLUS) — distincte de
// la COLLISION (BARN_BLOCKS, réduite à la base au niv.3 pour passer derrière le
// toit). On garde l'empreinte d'avant afin de ne PAS semer d'arbres/rochers
// sous le toit de la grange (ils y resteraient solides et gâcheraient le
// "passage derrière").
export const BARN_CLEAR = { x: 64, y: 35, w: 6, h: 7 };
export const AD_FEE = 25;                 // gold per newly posted ad category (common chest)
export const AD_CATEGORIES = ["crops", "animal", "fish", "resources"];

// --- Zip 247 : les visiteurs qui EMMÉNAGENT se mettent au travail (demande
// Guillaume : "when they move in, they start working on the farm, based on
// what they promised to contribute when they convinced us to let them move
// in"). Chaque entrée du roster porte déjà un `theme` et un `job` (la
// promesse faite pendant le vote) : on mappe ce thème sur une contribution
// concrète, exécutée par l'HÔTE toutes les RESIDENT_WORK_MS (voir
// updateResidents dans FermeGame.js). Aucun nouveau sprite ni message
// réseau dédié : on réutilise les patchs `tiles`/`crops`/`gregStock`/`state`
// déjà gérés par applyDeltas.
export const RESIDENT_WORK_MS = 90 * 1000;   // une "journée de travail" toutes les 90 s réelles
export const RESIDENT_WATER_BATCH = 3;       // cultures arrosées par tour pour un résident des champs
export const RESIDENT_FISH_PER_SHIFT = 1;    // poissons ajoutés au stock commun par tour
export const RESIDENT_GOLD_PER_SHIFT = 12;   // or rapporté par tour (métiers non agricoles)
export const RESIDENT_TASK_BY_THEME = {
  fields: "crops", flowers: "crops",   // sèment/soignent -> arrosent les cultures assoiffées
  wood: "wood",                        // bûcheron -> abat un arbre, bois au stock commun
  stone: "stone",                      // carrier -> mine un rocher, pierre au stock commun
  river: "fish",                       // pêcheur/fumeur de poisson -> poisson au stock commun
  animals: "gold", kitchen: "gold", market: "gold", gold: "gold",
  style: "gold", shadow: "gold", train: "gold",
};

// --- Visitors ---
// 25 recurring named characters. Outfits reuse the existing charSheet
// pipeline: distinctness comes from gender x outfit(0-7) x overalls x cap,
// which yields well over 25 unique combinations without any new art asset.
// `edgy: true` doubles the hostile roll for that character; `rich: true`
// makes them eligible for rich-patron visits (big-money purchases).
// --- Carla Garfield, la vendeuse de vêtements (376 → 430) ---
/* ⚠️⚠️ CE COMMENTAIRE DÉCRIVAIT UN ÉTAT PÉRIMÉ, ET C'EST LE PIRE ENDROIT
   POSSIBLE POUR ÇA. Jusqu'au 430 il expliquait encore, en trois paragraphes,
   que Carla portait `noStay` (« elle ne demandera JAMAIS à emménager ») et
   `chatOnly` (« tant que la boutique n'existe pas ») — alors que le 427 avait
   retiré les deux et que sa fiche, quarante lignes plus bas, dit exactement
   l'inverse. Quiconque lisait ce bloc pour comprendre son statut repartait avec
   la version d'il y a trois zips. C'est la règle §14.1 de CLAUDE.md appliquée
   au code : **une information périmée se supprime, elle ne se date pas.**

   CARLA N'EST PAS UN VISITEUR COMME LES AUTRES, et ses particularités sont
   toutes portées par des DRAPEAUX DU ROSTER, jamais par du code spécial
   dispersé — c'est ce qui permet d'en ajouter un sans chercher où elle est
   traitée à part :

     `minArtisans` : elle ne monte dans le train que si la ferme compte déjà
       CARLA_MIN_ARTISANS résidents porteurs d'un skill. Elle a entendu parler
       d'une ferme qui tourne, pas d'un champ de patates.
     `skill: "stylist"` : elle est RECRUTABLE depuis le 427, par les deux
       chemins (amitié, et le bouton « proposer d'emménager » qui exige un
       skill). ⚠️ `SKILL_BUILDING.stylist` vaut `null` : son lieu de travail
       n'est pas un atelier achetable à la ferme, c'est la Maison Garfield, qui
       existe déjà sur la carte de Valley Town.
     `noKick` (430) : ⚠️ **ON NE PEUT PAS LA VIRER COMME LES AUTRES.** Demande
       explicite de Guillaume. Ce n'est pas une faveur cosmétique : le vote
       d'exclusion (259) envoie un résident dans la file des exilés, d'où il
       revient supplier — un traitement qui n'a aucun sens pour quelqu'un qui a
       sa propre boutique en ville et n'a jamais eu besoin de la ferme. La
       partir serait SA décision, pas la nôtre.
     `weeklyShift` (430) : ⚠️ **ELLE NE TRAVAILLE PAS TOUS LES JOURS.** Un jour
       par semaine de jeu, à sa boutique. Les autres jours elle vit sa vie —
       aucun tour de travail, et la Maison Garfield est FERMÉE. Voir
       E.isShopDay et la note de CARLA_WORK_DAY. */export const CARLA_RID = 30;
export const CARLA_MIN_ARTISANS = 4;   // résidents à skill requis pour qu'elle daigne venir
/* ⚠️ LE JOUR DE SERVICE EST DÉRIVÉ DU NUMÉRO DE JOUR, comme le cours du marché
   et le jour d'orage : `day % 7 === CARLA_WORK_DAY`. Aucun état, aucun message,
   aucune migration — et les deux joueurs d'un salon lisent forcément le même
   jour. Un champ « prochain jour de service » dans `shared` aurait été un
   compteur de plus à faire tourner, à diffuser et à réconcilier, pour quelque
   chose qui est une pure fonction du calendrier.
   ⚠️ ET IL EST DÉCALÉ DU JOUR DE MARCHÉ (MARKET_DAY_EVERY vaut 7, reste 0) :
   les deux tombant le même jour, on aurait un jour où tout se passe et six où
   rien ne se passe. Décalés, la semaine a deux rendez-vous. */
export const CARLA_WORK_DAY = 3;
// Léo n'est PAS une entité : sa position est DÉRIVÉE de celle de Carla
// (il marche dans ses pas avec ce retard, en unités de chemin parcouru, cf.
// le principe des loups posés sur la piste du défi de fuite). Zéro message
// réseau, aucune simulation, et il ne peut pas traverser un mur puisqu'il
// rejoue un chemin déjà validé par la collision.
export const LEO_FOLLOW_DIST = 1.3;    // tuiles de retard le long du chemin de Carla
export const LEO_TRAIL_MAX = 64;       // échantillons de chemin gardés (~4 s à vitesse de marche)
export const LEO_TRAIL_MIN_STEP = 0.05;// en deçà, on n'ajoute pas d'échantillon (Carla à l'arrêt)
export const LEO_TELEPORT_TILES = 3;   // saut plus grand = téléportation -> on vide la traîne
// Rembarrages de Carla à Léo : bulle purement cosmétique, jouée localement.
// L'indice de réplique est dérivé de Date.now() découpé en tranches de
// CARLA_SCOLD_MS : sans échanger un seul message, les deux joueurs voient la
// même phrase au même moment (même astuce que les cadences dérivées du
// jour de jeu, et pour la même raison : le quota).
export const CARLA_SCOLD_MS = 26 * 1000;
export const CARLA_SCOLD_SHOW_MS = 4200;
export const CARLA_SCOLD_LINES = 4;    // fr/en symétriques (carlaScoldLines)

export const VISITOR_ROSTER = [
  { rid: 0,  name: "Margot",   gender: "f", outfit: 3, overalls: false, cap: false, theme: "market",  job: "run a market stall" },
  // Zip 315 (chantier canne à sucre) : Theo devient Jérôme Martial, artisan
  // NOMMÉ à skill "sugarworker" (sucrier), sur le même modèle que René/Ingrid/
  // Tristan/Chloé. SKILL_BUILDING["sugarworker"] -> "sucrerie" ci-dessous.
  // Renommé "Grosdésir" -> "Martial" (chantier sucrerie, demande Guillaume).
  // `overalls: false` : son skin dédié (couleurs du drapeau martiniquais —
  // voir le flag `sugarWorker` dans fermeArt.js/drawCharFrame) dessine sa
  // propre chemise/pantalon par-dessus, la salopette générique ne servirait
  // à rien ici. `cap: true` est conservé : la casquette générique est déjà
  // verte (voir CAP dans drawCharFrame), donc cohérente telle quelle.
  { rid: 1,  name: "Jérôme Martial", gender: "m", outfit: 2, overalls: false, cap: true,  theme: "fields",  job: "press cane and cook sugar", skill: "sugarworker" },
  { rid: 2,  name: "Colette",  gender: "f", outfit: 4, overalls: false, cap: false, theme: "style",   job: "sew and dye clothes" },
  { rid: 3,  name: "Bastien",  gender: "m", outfit: 0, overalls: false, cap: false, theme: "gold",    job: "keep the farm ledgers", rich: true },
  { rid: 4,  name: "Odile",    gender: "f", outfit: 5, overalls: false, cap: true,  theme: "shadow",  job: "guard the farm at night", edgy: true },
  { rid: 5,  name: "Marcel",   gender: "m", outfit: 1, overalls: true,  cap: false, theme: "wood",    job: "carve furniture" },
  { rid: 6,  name: "Ines",     gender: "f", outfit: 6, overalls: false, cap: false, theme: "river",   job: "smoke and salt fish" },
  { rid: 7,  name: "Gustave",  gender: "m", outfit: 7, overalls: false, cap: true,  theme: "train",   job: "run the station clock" },
  { rid: 8,  name: "Perrine",  gender: "f", outfit: 0, overalls: true,  cap: false, theme: "animals", job: "care for the animals" },
  { rid: 9,  name: "Aurelien", gender: "m", outfit: 4, overalls: false, cap: false, theme: "gold",    job: "appraise gems", rich: true },
  { rid: 10, name: "Sidonie",  gender: "f", outfit: 1, overalls: false, cap: true,  theme: "kitchen", job: "cook for everyone" },
  { rid: 11, name: "Firmin",   gender: "m", outfit: 5, overalls: true,  cap: true,  theme: "stone",   job: "lay stone paths", edgy: true },
  { rid: 12, name: "Capucine", gender: "f", outfit: 2, overalls: true,  cap: false, theme: "flowers", job: "plant flower beds" },
  { rid: 13, name: "Honore",   gender: "m", outfit: 3, overalls: false, cap: true,  theme: "market",  job: "haggle with traders" },
  { rid: 14, name: "Lucille",  gender: "f", outfit: 7, overalls: true,  cap: false, theme: "river",   job: "ferry goods by boat" },
  { rid: 15, name: "Anselme",  gender: "m", outfit: 6, overalls: true,  cap: false, theme: "fields",  job: "breed better seeds" },
  // Zip 301 (demande Guillaume) : Rosalie devient une artisane NOMMÉE à skill
  // "breadmaker" (boulangère du pain et des viennoiseries), recrutable à la
  // gare comme Ingrid/Tristan. Elle partage la boulangerie (SKILL_BUILDING
  // "breadmaker" -> "bakery") avec Chloé la pâtissière. Outfit distinct de
  // Chloé (outfit 3) pour ne pas les confondre. Caractère aigri (voir
  // skillTalk). Production dans updateCrafts (pain + viennoiseries).
  { rid: 16, name: "Rosalie",  gender: "f", outfit: 5, overalls: true,  cap: true,  theme: "kitchen", job: "bake fresh bread and viennoiseries", skill: "breadmaker" },
  { rid: 17, name: "Edgar",    gender: "m", outfit: 2, overalls: false, cap: false, theme: "shadow",  job: "track wolves", edgy: true },
  { rid: 18, name: "Violette", gender: "f", outfit: 4, overalls: true,  cap: false, theme: "style",   job: "paint signs and murals" },
  { rid: 19, name: "Casimir",  gender: "m", outfit: 0, overalls: true,  cap: true,  theme: "wood",    job: "fell and replant trees" },
  { rid: 20, name: "Philomene",gender: "f", outfit: 5, overalls: true,  cap: false, theme: "gold",    job: "fund new buildings", rich: true },
  { rid: 21, name: "Ambroise", gender: "m", outfit: 1, overalls: false, cap: true,  theme: "train",   job: "haul freight crates" },
  { rid: 22, name: "Berthe",   gender: "f", outfit: 6, overalls: true,  cap: true,  theme: "animals", job: "shear and milk" },
  { rid: 23, name: "Leandre",  gender: "m", outfit: 7, overalls: true,  cap: false, theme: "stone",   job: "mine the far hills" },
  { rid: 24, name: "Zelie",    gender: "f", outfit: 0, overalls: false, cap: true,  theme: "flowers", job: "keep bees" },
  // Zip 252 (demande Guillaume) : artisans NOMMÉS. Ce sont des visiteurs
  // normaux (offres classiques), mais leur `skill` permet de leur proposer
  // d'emménager, et une fois résidents ils débloquent un métier (atelier
  // achetable en or à la boutique) ou travaillent directement pour nous.
  { rid: 25, name: "René",    gender: "m", outfit: 1, overalls: true,  cap: true,  theme: "flowers", job: "keep bees and jar honey",        skill: "beekeeper" },
  { rid: 26, name: "Ingrid",  gender: "f", outfit: 6, overalls: true,  cap: false, theme: "animals", job: "turn our milk into fine cheese", skill: "cheesemaker" },
  { rid: 27, name: "Tristan", gender: "m", outfit: 7, overalls: true,  cap: false, theme: "wood",    job: "fell trees and break rocks all day", skill: "lumberjack" },
  { rid: 28, name: "Chloé",   gender: "f", outfit: 3, overalls: true,  cap: true,  theme: "kitchen", job: "bake cakes and cookies",         skill: "baker" },
  // Zip 258 (demande Guillaume) : Eduardo Da Fonseca. Skin d'explorateur
  // extravagant (outfit 5 + chapeau, gender m). Son skill "voyager" (commerçant
  // grand voyageur) permet de l'accueillir comme résident ; une fois installé,
  // on lui passe commande de produits du monde depuis le menu Employés (voir
  // WORLD_GOODS / VOYAGE_*). Il se présente au village sur le dos d'un CHEVAL
  // BLANC (rendu : sprite horseWhite dessiné sous lui tant qu'il est visiteur).
  // Zip 259 (demande Guillaume) : il apparaît DÉSORMAIS aussi souvent que les
  // autres (le flag `rare` a été retiré) — il faut pouvoir le recruter.
  { rid: 29, name: "Eduardo Da Fonseca", gender: "m", outfit: 5, overalls: false, cap: true, theme: "market", job: "sail the world and bring back rare goods", skill: "voyager" },
  // Zip 376 (demande Guillaume) : Carla Garfield, vendeuse de vêtements.
  // outfit 1 : seule la couleur de CHEVEUX en est tirée (noir corbeau), le
  // reste du skin est entièrement repeint par `look: "carla"` (béret rouge,
  // manteau jaune, top noir). `cap: false` impératif : la casquette verte
  // générique se dessinerait par-dessus le béret.
  /* ⚠️⚠️ ZIP 427 — CARLA DEVIENT RECRUTABLE, ET C'EST UN CHANGEMENT DE STATUT,
     PAS UN RÉGLAGE. Le 376 lui avait posé `noStay: true` avec une raison
     explicite : « elle a une boutique et une vie ailleurs ». Cette raison
     tombe, parce que la boutique est maintenant ICI (TOWN_BOUTIQUE, en ville) —
     c'est exactement ce que Guillaume demande : « la boutique chic de Carla
     Garfield ... quand on aura accepté Carla Garfield comme résidente ».
     Deux drapeaux sautent donc, et pas un de plus :
       * `noStay` — sans lui, le chemin normal (amitié ≥ REL_RESIDENT_MIN, elle
         demande à rester) s'ouvre comme pour n'importe qui ;
       * `chatOnly` — le 376 le justifiait par « tant que la boutique n'existe
         pas ». Elle existe.
     `skill: "stylist"` ouvre le SECOND chemin (le bouton « proposer
     d'emménager » de la fiche visiteur, qui exige un skill).
     ⚠️ ET `SKILL_BUILDING.stylist` VAUT `null`, COMME LE VOYAGEUR : son lieu de
     travail n'est PAS un atelier achetable à la ferme, c'est un bâtiment de
     Valley Town qui existe déjà sur la carte. Lui inventer une échoppe de ferme
     aurait fait deux boutiques pour une seule vendeuse.
     `minArtisans` reste : elle ne se dérange toujours pas pour un champ de
     patates. */
  { rid: 30, name: "Carla Garfield", gender: "f", outfit: 1, overalls: false, cap: false, theme: "style", job: "dress this valley properly", look: "carla", skill: "stylist", minArtisans: CARLA_MIN_ARTISANS, noKick: true, weeklyShift: CARLA_WORK_DAY },
];
// Poids de spawn d'un visiteur "rare" (aucun personnage n'est marqué `rare`
// depuis le zip 259, mais la mécanique reste dispo pour un futur usage).
export const RARE_VISITOR_WEIGHT = 0.25;

// Zip 278 (demande Guillaume) : quand un hostile À SKILL est mis en
// blacklist, on ne le bannit plus pour de bon — il revient sous un nom
// d'emprunt (voir resolveBlacklist / covers dans newStationState). Noms
// piochés dans ce pool, séparés par genre pour rester cohérents avec le
// sprite (déjà fixé par le rid d'origine, seul le nom affiché change).
export const COVER_NAMES = {
  m: ["Anatole", "Baptiste", "Cyprien", "Emile", "Florian", "Gaspard", "Hippolyte", "Isidore", "Justin", "Lazare", "Maxence", "Norbert", "Octave", "Prosper", "Quentin"],
  f: ["Adeline", "Blanche", "Céleste", "Delphine", "Estelle", "Fantine", "Georgine", "Henriette", "Iris", "Josephine", "Louison", "Marceline", "Noelle", "Ophelie", "Solange"],
};

// ---- Zip 252 : métiers d'artisans (résidents à skill) ----
// Indices d'élevage utilisés comme intrants (voir ANIMALS ci-dessus).
export const HEN_ANIMAL = 0;   // œufs = products[0]
export const COW_ANIMAL = 4;   // lait  = products[4]
// Ateliers achetables en or À LA BOUTIQUE, seulement quand l'artisan
// correspondant est résident. Posés automatiquement au site indiqué (sur la
// ferme, non bloquants — on interagit par proximité). Tristan (bûcheron) n'a
// PAS d'atelier : il travaille directement dès qu'il emménage.
export const ARTISAN_BUILDINGS = {
  beehive:    { skill: "beekeeper",   cost: 6000,  site: { x: 50, y: 46 }, w: 2, h: 2 },
  fromagerie: { skill: "cheesemaker", cost: 12000, site: { x: 56, y: 46 }, w: 3, h: 2 },
  bakery:     { skill: "baker",       cost: 9000,  site: { x: 62, y: 46 }, w: 3, h: 2 },
  // Zip 260 (demande Guillaume) : la scierie du bûcheron devient un vrai
  // bâtiment achetable (10000 or), au même titre que les autres. Purement
  // ancrage de métier : aucune production auto (Tristan abat les arbres via
  // son thème "wood", voir updateResidents), mais achetable/déplaçable/solide.
  sawmill:    { skill: "lumberjack",  cost: 10000, site: { x: 68, y: 46 }, w: 3, h: 2 },
  // Chantier "sucrerie déplaçable" (2026-07, demande Guillaume) : rejoint le
  // modèle des autres bâtiments d'artisans (voir commentaire SUCRERIE_SITE
  // plus haut). Footprint volontairement plus PETIT (2x2) que le sprite
  // pixel-exact (95x88 natif) : seule la maison en pierre (façade/porte) est
  // solide, tonneaux/pressoir/tas de canne débordent hors du footprint et
  // restent traversables, comme demandé par Guillaume ("on peut passer à
  // travers, pareil pour les tonneaux").
  sucrerie:   { skill: "sugarworker", cost: SUCRERIE_COST, site: SUCRERIE_SITE, w: 2, h: 2 },
};
// Zip 261 (demande Guillaume : "ils doivent être plus grands, on dirait des
// stickers") : facteur d'agrandissement au DESSIN des bâtiments d'artisans
// (le sprite est dessiné à sa taille × ce facteur, ancré par le bas-centre).
// N'affecte PAS la collision (footprint w×h en tuiles inchangé).
// Zip 264 : les sprites de bâtiments d'artisans sont désormais le port EXACT
// du .html (plus détaillés, dessinés à ~46 px de large en natif au lieu de 38).
// L'ancien facteur 1.75 sur ces gros sprites les rendait « stickers » ; on
// descend à 1.15 pour un rendu cohérent avec le footprint (3 tuiles ≈ 48 px).
// Ajuster ICI si Guillaume veut les grossir/réduire d'un bloc.
export const ARTISAN_DRAW_SCALE = 1.15;
// Zip 264 : ligne de contact au sol DANS le sprite (coord. y de la base du
// bâtiment, avant mise à l'échelle). Le rendu ancre ce y sur le bas du
// footprint (au lieu du bas de la toile), pour que les bâtiments ne flottent
// pas malgré des toiles plus hautes que le bâtiment (fumée/toit/drapeau au-
// dessus, tommes/scie/établi débordant devant). Défaut = hauteur de la toile.
export const ARTISAN_FOOT = { beehive: 31, fromagerie: 62, bakery: 62, sawmill: 58, sucrerie: 72 };
// Chantier "sucrerie déplaçable" : deux réglages PAR BÂTIMENT (au lieu de
// globaux) pour que la sucrerie garde EXACTEMENT son ancrage/échelle déjà
// validés (copie pixel-exacte du mockup, zip 320) une fois branchée sur le
// pipeline générique de rendu des artisans (voir FermeGame.js) :
//  - ARTISAN_FACE_X : abscisse (native, avant mise à l'échelle) de la
//    "façade" dans le sprite, centrée sur le footprint au rendu — PAS le
//    centre géométrique de l'image (le sprite sucrerie est asymétrique :
//    façade à x=36, pressoir plus loin à droite). Absent pour un bid ->
//    repli sur bimg.width/2 (comportement actuel inchangé pour beehive/
//    fromagerie/bakery/sawmill, dessinés symétriques par construction).
export const ARTISAN_FACE_X = { sucrerie: 36 };
//  - ARTISAN_DRAW_SCALE_OVERRIDE : remplace C.ARTISAN_DRAW_SCALE pour un bid
//    donné. La sucrerie reste à l'échelle 1 (taille NATIVE), pour ne pas
//    altérer le rendu "copie pixel-exacte" validé par Guillaume — les autres
//    bâtiments gardent ARTISAN_DRAW_SCALE (1.15) comme avant.
export const ARTISAN_DRAW_SCALE_OVERRIDE = { sucrerie: 1 };
// Métier -> bâtiment (null = pas de bâtiment, travaille directement).
// voyager (Eduardo) : pas de bâtiment, il travaille par voyages (commandes).
// Zip 260 : lumberjack -> sawmill (le bûcheron s'ancre/rôde autour de sa
// scierie une fois construite ; sinon rôde près du spawn comme avant).
// Zip 301 : breadmaker (Rosalie) partage la boulangerie de baker (Chloé).
// Zip 427 : `stylist` (Carla) rejoint `voyager` du côté `null` — son lieu de
// travail est la boutique de Valley Town, pas un atelier de ferme à acheter.
// Voir la note de son entrée dans VISITOR_ROSTER.
export const SKILL_BUILDING = { beekeeper: "beehive", cheesemaker: "fromagerie", baker: "bakery", breadmaker: "bakery", lumberjack: "sawmill", voyager: null, sugarworker: "sucrerie", stylist: null };
// Cadences de production (ms réelles) et valeurs de vente (or).
// Zip 258 (demande Guillaume : "le miel est une denrée rare") : cadence ÷3
// (4 min -> 12 min entre deux pots) et prix du pot fortement relevé à 7000.
// C'est le produit passif le plus lent et le plus cher du jeu, assumé.
export const HONEY_MS = 20 * 60 * 1000;    export const HONEY_SELL = 7000;  // ruche : passif, aucun intrant (denrée rare — zip 301b : 1 pot / 20 min, demande Guillaume)
// Zip 327 (demande Guillaume) : rendement du miel selon la saison en cours
// (voir SEASONS/seasonOf). Multiplicateur appliqué à la CADENCE de René
// (intervalle = HONEY_MS / mult) — hiver à 0 = aucune production tant que la
// saison dure (le cycle reste gelé, pas de perte, voir reneHoneyMs dans
// FermeGame.js). Pas de sous-palier "fin d'été" : tout l'été est un pic.
export const HONEY_SEASON_MULT = { winter: 0, autumn: 0.5, spring: 1, summer: 1.5 };

// Point d'ancrage de rôdaille de l'apiculteur (René) : centre du bâtiment
// beehive (site 2x2 à x:50,y:46), pour qu'il reste autour de sa ruche au lieu
// de se balader près du spawn comme les autres résidents.
export const BEEKEEPER_ANCHOR = { x: 51, y: 47 };
// Chantier 2026-07 (demande Guillaume : "René doit être envoyé récolter de
// temps en temps, comme Soan, avec des pauses") : miroir du système de blocs
// travail/pause de Soan (SOAN_WORK_MS/SOAN_BREAK_MS), adapté au rythme du
// miel (1 pot / 12 min, voir HONEY_MS) — un bloc de travail laisse le temps de
// produire plusieurs pots avant la pause.
// Zip suivant (demande Guillaume) : cycle porté à 1h de travail / 15 min de
// pause dans l'état normal (avant : 45 min de travail).
export const BEEKEEPER_WORK_MS = 60 * 60 * 1000;  // durée d'un bloc de récolte actif (1h)
export const BEEKEEPER_BREAK_MS = 15 * 60 * 1000; // durée de la pause avant de pouvoir reprendre (ou renvoyer manuellement via le bouton "Envoyer récolter")
// Zip 327 (demande Guillaume) : René a aussi des phases "renfermé"/bougon,
// indépendantes de son cycle travail/pause — un cycle de mauvaise humeur
// récurrent (bulles sèches, affichées rarement, voir FermeGame.js) qui
// alterne avec ses phases normales (bulles joyeuses existantes).
export const RENE_GRUMPY_CYCLE_MS = 50 * 1000;    // durée totale d'un cycle d'humeur
export const RENE_GRUMPY_DURATION_MS = 15 * 1000; // dont ce temps (au début du cycle) est bougon

// Zip suivant (demande Guillaume) : "SuperRené" — donner un café à René
// (apiculteur) déclenche un effet prolongé pendant lequel il travaille EN
// CONTINU (aucune pause) ET produit du miel bien plus vite. Miroir de
// SuperGreg/SuperSoan (café), mais paramètres propres à René. Le café est
// puisé dans le MÊME stock commun station.worldStock.coffee que Greg/Soan.
export const SUPERRENE_DURATION_MS = 5 * 60 * 60 * 1000;  // 5h réelles de travail continu (décision Guillaume)
export const SUPERRENE_COOLDOWN_MS = 10 * 60 * 60 * 1000; // 10h réelles, démarre à la FIN de l'effet ; entre-temps René reprend son cycle normal
export const SUPERRENE_COFFEE_COST = 2;   // unités de café consommées au TOTAL par activation (MÊME pool que SuperGreg/SuperSoan)
// Zip suivant (demande Guillaume) : René "a besoin de deux cafés, donc deux
// clics" — contrairement à Greg/Soan (1 clic = 1 café = effet immédiat), le
// 1er clic sur reneCoffee consomme 1 café et arme une jauge (res.coffeeGauge
// = 1, res.coffeeGaugeAt = horodatage) ; le 2e clic consomme le 2e café et
// déclenche l'effet (miroir gregCoffee). Si le 2e café n'arrive pas dans ce
// délai, la jauge expire (redémarre à 0 au clic suivant) — vérifié
// paresseusement (pas de timer serveur dédié), et affiché côté UI par simple
// comparaison Date.now() (même principe que le badge ☕⚡ de superUntil).
export const RENE_COFFEE_GAUGE_TIMEOUT_MS = 60 * 1000; // 1 minute (décision Guillaume)
export const SUPERRENE_HONEY_MULT = 3;    // zip 301b (demande Guillaume : x10 trop cheaté) : ×3 pendant l'effet café
export const CHEESE_MS = 6 * 60 * 1000;    export const CHEESE_MILK_COST = 3; // fromagerie : 3 laits -> 1 roue OU du beurre (zip 301)
// Zip suivant (demande Guillaume : "augmenter drastiquement le rendement en
// beurre de la fromagerie") : chaque fournée qui tombe côté beurre (selon le
// ratio réglé par le joueur, voir butterPct/ratioAcc plus bas) produit
// désormais FROMAGERIE_BUTTER_YIELD mottes d'un coup au lieu d'une seule.
// Le fromage (cheeseWheel) n'est pas concerné, seule la branche beurre.
export const FROMAGERIE_BUTTER_YIELD = 8;
export const CHEESE_WHEEL_SELL = 1500;     export const CHEESE_PORTION_SELL = 350; export const PORTIONS_PER_WHEEL = 6;
// Zip 301 (demande Guillaume) : la fromagerie d'Ingrid produit désormais du
// FROMAGE **et** du BEURRE, à la même cadence (CHEESE_MS) et au même coût de
// lait (CHEESE_MILK_COST). Le joueur règle la PROPORTION de beurre par paliers
// de 10 % (crafts.fromagerie.butterPct, 0..100) dans la fiche d'Ingrid ; un
// accumulateur (crafts.fromagerie.ratioAcc) répartit la sortie de façon exacte
// sur la durée. Le beurre est une denrée vendable ET l'intrant des
// viennoiseries de Rosalie (voir plus bas).
export const BUTTER_SELL = 300;                 // prix de vente d'une motte de beurre
// Zip suivant (bug signalé par Guillaume : "le beurre n'apparaît jamais dans
// le shop") : Rosalie tourne toutes les ROSALIE_MS (1 min 30) et engloutit
// IMMÉDIATEMENT tout beurre disponible dès qu'il y en a ≥ 1 (CROISSANT_BUTTER)
// pour ses croissants/chocolatines, alors que la fromagerie n'en produit
// qu'au mieux toutes les CHEESE_MS (6 min) selon le ratio réglé — le beurre
// n'a donc jamais le temps de s'accumuler ni d'être vu/vendu par le joueur.
// Cette réserve est mise de côté, jamais consommée par Rosalie, pour que le
// beurre reste effectivement une denrée vendable comme prévu (zip 301).
export const BUTTER_SELL_RESERVE = 3;
export const FROMAGERIE_BUTTER_PCT_DEFAULT = 0; // zip 301b (demande Guillaume) : défaut = 100 % fromage (comportement historique préservé) ; le beurre n'apparaît qu'une fois le ratio réglé dans la fiche d'Ingrid
export const FROMAGERIE_RATIO_STEP = 10;         // paliers de réglage du ratio (10 %)
// Zip suivant (demande Guillaume : "Ingrid doit pouvoir faire des yaourts
// maintenant, nature et vanille") : filière YAOURT de la fromagerie,
// INDÉPENDANTE du ratio fromage/beurre ci-dessus, avec son propre minuteur
// (crafts.fromagerie.yogurtNextAt) — même principe que le pain/viennoiseries
// de Rosalie, filière séparée dans le même bâtiment que la pâtisserie de
// Chloé (voir bk.breadNextAt plus bas). Nature : lait seul. Vanille : lait +
// vanille (gousse de Madagascar, station.worldStock.vanilla) + sucre
// (s.sugar, sucrerie). Alternance STRICTE 1 pot sur 2 en vanille tant que le
// stock de vanille/sucre suffit (crafts.fromagerie.yogurtVanillaTurn) ; repli
// sur nature sans faire avancer le tour si les intrants manquent, pour que
// la proportion se rattrape dès que le stock revient (décision Guillaume).
export const YOGURT_MS = 3 * 60 * 1000;    // cadence d'un pot (moitié du fromage, décision Guillaume)
export const YOGURT_MILK_COST = 1;         // lait par pot, nature ou vanille
export const YOGURT_VANILLA_COST = 1;      // gousse de vanille EN PLUS du lait, pot vanille seulement
export const YOGURT_SUGAR_COST = 1;        // sac de sucre EN PLUS du lait, pot vanille seulement
export const YOGURT_NATURE_SELL = 130;     // prix de vente d'un pot nature
export const YOGURT_VANILLA_SELL = 190;    // prix de vente d'un pot vanille (assomption de départ, à ajuster avec Guillaume)
// Zip 258 (demande Guillaume) : la boulangerie tourne 3× plus vite (3 min ->
// 1 min entre deux fournées) mais UNIQUEMENT en journée (voir BAKERY_*_MIN).
export const PASTRY_MS = 1 * 60 * 1000;    // cadence d'une fournée de Chloé (1 min)
// Zip suivant (demande Guillaume) : Chloé abandonne les "pâtisseries"
// génériques pour 4 PRODUITS NOMMÉS, en rotation (même principe que les
// viennoiseries de Rosalie) — chacun avec ses propres intrants :
//   - Éclair au chocolat  : farine + lait + œufs + chocolat (cacao d'Eduardo)
//   - Éclair à la vanille : farine + lait + œufs + vanille (Madagascar) +
//     fève de tonka (remplace l'ancienne "pâtisserie à la vanille")
//   - Flan pâtissier à la vanille de Madagascar : farine + lait + œufs +
//     vanille + fève de tonka
//   - Gâteau basque : farine + lait + œufs + vanille + beurre (fromagerie d'Ingrid)
// Toutes tournent à la même cadence (PASTRY_MS) ; Chloé produit le premier
// item réalisable en parcourant la rotation, comme Rosalie pour le pain.
export const ECLAIR_CHOCO_FLOUR = 1, ECLAIR_CHOCO_MILK = 1, ECLAIR_CHOCO_EGG = 4, ECLAIR_CHOCO_COCOA = 1;
export const ECLAIR_CHOCO_BATCH = 8, ECLAIR_CHOCO_SELL = 700;
export const ECLAIR_VANILLA_FLOUR = 1, ECLAIR_VANILLA_MILK = 1, ECLAIR_VANILLA_EGG = 4, ECLAIR_VANILLA_VANILLA = 1, ECLAIR_VANILLA_TONKA = 1;
export const ECLAIR_VANILLA_BATCH = 8, ECLAIR_VANILLA_SELL = 900; // prix inchangé vs l'ancienne pâtisserie vanille
export const FLAN_VANILLA_FLOUR = 1, FLAN_VANILLA_MILK = 2, FLAN_VANILLA_EGG = 5, FLAN_VANILLA_VANILLA = 1, FLAN_VANILLA_TONKA = 1;
export const FLAN_VANILLA_BATCH = 6, FLAN_VANILLA_SELL = 850;
export const GATEAU_BASQUE_FLOUR = 1, GATEAU_BASQUE_MILK = 1, GATEAU_BASQUE_EGG = 4, GATEAU_BASQUE_VANILLA = 1, GATEAU_BASQUE_BUTTER = 1;
export const GATEAU_BASQUE_BATCH = 6, GATEAU_BASQUE_SELL = 1200; // le plus premium (beurre en plus)

// ---- Zip 301 (demande Guillaume) : Rosalie, boulangère (pain + viennoiseries) ----
// Rosalie travaille dans la MÊME boulangerie que Chloé (bakery), mais sur une
// filière distincte : le PAIN (farine seule, toujours disponible) et les
// VIENNOISERIES (croissants = farine+beurre ; chocolatines & pains suisses =
// farine+beurre+chocolat). Le "chocolat" est la fève de cacao rapportée par
// Eduardo (WORLD_GOODS "cocoa", station.worldStock.cocoa). Les viennoiseries
// ne se produisent QUE si l'on dispose de beurre (filière débloquée par la
// fromagerie d'Ingrid) — d'où l'ordre "commence par le fromager/beurre".
// Même contrainte horaire que la pâtisserie (journée, voir BAKERY_*_MIN).
export const ROSALIE_MS = 90 * 1000;       // cadence d'une fournée de Rosalie (1 min 30)
// Pain (farine de blé seule pour l'instant ; farine de seigle à venir).
export const BREAD_FLOUR = 1, BREAD_BATCH = 4, BREAD_SELL = 120;
// Croissant : farine + beurre.
export const CROISSANT_FLOUR = 1, CROISSANT_BUTTER = 1, CROISSANT_BATCH = 6, CROISSANT_SELL = 180;
// Chocolatine & pain suisse : farine + beurre + chocolat (cacao).
export const CHOCO_FLOUR = 1, CHOCO_BUTTER = 1, CHOCO_COCOA = 1, CHOCO_BATCH = 6;
export const CHOCOLATINE_SELL = 260, PAINSUISSE_SELL = 260;

// ---- Zip suivant (demande Guillaume) : clients automatiques le matin +
// prix réglables par produit de boulangerie ----
// Chaque matin (mêmes horaires d'ouverture que la boulangerie, jusqu'à
// BAKERY_CUSTOMER_MORNING_END_MIN), des clients viennent automatiquement
// acheter un des produits de Chloé/Rosalie dans le stock commun, sans
// action du joueur : un produit tiré au hasard parmi ceux en stock, une
// quantité aléatoire, payée au prix courant (réglé par le joueur ou le prix
// par défaut ci-dessous) et créditée à la caisse commune.
export const BAKERY_SELL_ITEMS = ["bread", "croissant", "chocolatine", "painSuisse", "eclairChoco", "eclairVanilla", "flanVanilla", "gateauBasque"];
export const BAKERY_DEFAULT_PRICE = { bread: BREAD_SELL, croissant: CROISSANT_SELL, chocolatine: CHOCOLATINE_SELL, painSuisse: PAINSUISSE_SELL, eclairChoco: ECLAIR_CHOCO_SELL, eclairVanilla: ECLAIR_VANILLA_SELL, flanVanilla: FLAN_VANILLA_SELL, gateauBasque: GATEAU_BASQUE_SELL };
export const BAKERY_CUSTOMER_MORNING_END_MIN = 11 * 60; // 11h00 : après ça, plus de clients spontanés
export const BAKERY_CUSTOMER_MS = 45 * 1000;             // cooldown normal entre deux VRAIES ventes (une fois qu'une rencontre a eu lieu)
export const BAKERY_CUSTOMER_QTY_MIN = 1, BAKERY_CUSTOMER_QTY_MAX = 3; // quantité achetée par passage
// Correctif "vraie rencontre" (2026-07, demande Guillaume) : la vente du
// matin ne se déclenche plus à l'aveugle sur un simple minuteur — il faut
// qu'un visiteur soit RÉELLEMENT à proximité de Chloé ou Rosalie visible
// devant la boulangerie (voir bakeryEncounterPossible, FermeGame.js). Si
// personne n'est là au moment du tirage, on retente bientôt
// (BAKERY_CUSTOMER_RETRY_MS, plus court que le cooldown normal) plutôt que
// d'attendre le plein cycle pour rien.
export const BAKERY_CUSTOMER_ENCOUNTER_DIST = 2.5; // distance visiteur <-> boulangère pour compter comme une vraie rencontre
export const BAKERY_CUSTOMER_RETRY_MS = 6 * 1000;  // nouvelle tentative si personne n'était là
// Prix réglables : le joueur peut ajuster chaque prix entre 50 % et 200 %
// du prix par défaut ci-dessus, par paliers de 10 % (mêmes paliers que le
// ratio beurre de la fromagerie).
export const BAKERY_PRICE_STEP_PCT = 10;
export const BAKERY_PRICE_MIN_PCT = 50, BAKERY_PRICE_MAX_PCT = 200;

// ---- Zip suivant (demande Guillaume) : Chloé et Rosalie marchent trop —
// l'une des deux doit rentrer dans la boulangerie (invisible) le temps d'un
// "service", puis ressortir pendant que l'autre y va, en alternance ; parfois
// les deux sont dehors en même temps (jamais les deux dedans en même temps).
// Voir updateBakeryVisibility (FermeGame.js).
export const BAKERY_INSIDE_MIN_MS = 25 * 1000,  BAKERY_INSIDE_MAX_MS = 70 * 1000;  // durée d'un passage à l'intérieur
export const BAKERY_OUTSIDE_MIN_MS = 15 * 1000, BAKERY_OUTSIDE_MAX_MS = 45 * 1000; // durée d'un passage dehors avant de retenter d'entrer
export const BAKERY_ENTER_CHANCE = 0.5; // probabilité de rentrer à l'échéance "dehors" (sinon reste dehors un tour de plus)

// Zip suivant (demande Guillaume) : scènes Chloé/Rosalie (voir
// L.chloeRosalieScenes). Déclenchées quand la bulle "rare" de Rosalie a
// bouclé 2 cycles à portée du joueur ET que Chloé n'est pas "à l'intérieur"
// (res.hidden) de la boulangerie. Cooldown 5 min réelles après chaque scène.
export const CHLOE_ROSALIE_SCENE_COOLDOWN_MS = 5 * 60 * 1000;
export const CHLOE_ROSALIE_TRIGGER_CYCLES = 3; // nombre de bulles négatives de Rosalie (à portée du joueur) avant que Chloé réagisse
export const CHLOE_ROSALIE_SCENE_V11_CHANCE = 1 / 18; // variante rare (René), ~1 fois sur 18
export const CHLOE_ROSALIE_CONVO_DIST = 1.8; // distance max (cases) pour déclencher/jouer une scène — "distance conversationnelle"

// Chantier "rivalité Tristan/Jérôme" (2026-07, demande Guillaume) : les deux
// artisans se détestent et se provoquent périodiquement — même moteur que
// Chloé/Rosalie (storming + scène de bulles séquencées), mais avec une issue
// possible réellement impactante (bagarre -> ITT). Voir residentRoam
// (res.storming/res.stormKind==="tj") et updateTristanJeromeFeud.
export const TRISTAN_RID = 27; // rid VISITOR_ROSTER de Tristan (bûcheron)
export const JEROME_RID = 1;   // rid VISITOR_ROSTER de Jérôme Martial (sucrerie)
export const TJ_STORM_PERIOD_MS = 2 * DAY_REAL_MS; // ~48h in-game entre deux tentatives de provocation (départ en trombe vers le stand adverse)
export const TJ_CONVO_DIST = 1.8; // distance de "face à face", identique à Chloé/Rosalie
export const TJ_BRAWL_CHANCE = 0.3; // jet de bagarre à CHAQUE étape de tension (tant qu'ils sont à portée), pas une seule fois par rencontre
// Demande Guillaume : Jérôme lâche parfois (pas systématiquement) une
// interjection créole ("Kisa i ka di mwen ?") juste avant de répondre à une
// remarque vexante de Tristan — tirée au moment du déclenchement de la
// scène, voir residentRoam (branche isTj).
export const TJ_JEROME_INTERJECTION_CHANCE = 0.35;
// 2026-09-01 (bug remonté par Guillaume, « Martial reste figé ») : c'était
// DAY_REAL_MS, soit 16 MINUTES RÉELLES d'immobilisation pour le perdant — le
// mécanisme se dégèle correctement tout seul (vérifié en avançant l'horloge
// en session de debug), ce n'est donc pas un bug de déplacement, mais une
// punition disproportionnée pour une soirée entre amis (§0), et le toast
// (toastTJBrawl) ne donne ni durée ni indice qu'un pansement l'écourte —
// d'où l'impression de PNJ cassé. Ramené à 3 minutes réelles, sur demande de
// Guillaume ("raccourcir nettement").
export const TJ_BRAWL_ITT_MS = 3 * 60 * 1000;

// Chantier "bagarre = vrai événement, en public" (2026-07, demande
// Guillaume) : dès que le jet de bagarre (TJ_BRAWL_CHANCE) tombe positif, la
// résolution n'est plus immédiate — on ouvre une fenêtre "imminente"
// (tjBrawl.imminent) pendant laquelle TOUS les résidents et visiteurs
// présents (hors Tristan/Jérôme eux-mêmes) accourent former un attroupement
// autour du clash et commentent, inquiets (voir triggerTjCrowdReaction,
// updateTjCrowd, tjCrowdLines dans fermeStrings.js). Le JOUEUR, lui, garde
// entièrement le contrôle de ses déplacements — contrairement à l'ancien
// correctif "gel du joueur" (TJ_GAWK_*, retiré), c'est la foule de PNJ qui
// réagit, pas lui. La bagarre se résout à la fin de cette fenêtre
// (TJ_BRAWL_IMMINENT_DELAY_MS après le jet), le temps que l'attroupement se
// forme et réagisse avant l'issue.
// Retour Guillaume (durées de la scène) : la montée de tension (répliques
// "#%!&" échangées par Tristan/Jérôme, voir tristanJeromeScenes) doit durer
// ~10s AU TOTAL, quel que soit le nombre de répliques de la scène tirée au
// sort (4 à 8 lignes selon tristanJeromeScenes) — la durée de CHAQUE étape
// est donc calculée dynamiquement (TJ_TENSION_TOTAL_MS / nombre de lignes)
// plutôt que fixée par ligne. La bagarre elle-même (une fois le jet positif,
// pendant que l'attroupement regarde) doit ensuite durer AU MOINS 15s avant
// résolution (TJ_BRAWL_IMMINENT_DELAY_MS) — suivie d'un mot de la fin
// (TJ_REACT_AFTER_MS) : ~10s tension + ~15s bagarre + ~6s mot de la fin =
// altercation visible ~31s tout compris.
// Zip 368 (demande Guillaume : "les répliques de Tristan et Jérôme
// s'enchaînent un peu vite") : 10 000 -> 22 000 (×2,2, valeur choisie par
// Guillaume). La durée d'UNE réplique est calculée par division (voir stepMs
// dans residentRoam) : les scènes font de 4 à 10 répliques, donc la réplique
// moyenne passe d'environ 1,4 s à 3,1 s. La bagarre
// (TJ_BRAWL_IMMINENT_DELAY_MS) et le mot de la fin (TJ_REACT_AFTER_MS) sont
// inchangés : la scène complète passe d'environ 31 s à environ 43 s.
export const TJ_TENSION_TOTAL_MS = 22000; // durée totale visée pour la montée de tension (répartie sur les répliques de la scène)
export const TJ_BRAWL_IMMINENT_DELAY_MS = 15000; // durée de la bagarre elle-même (au moins 15s), une fois le jet de bagarre positif
export const TJ_REACT_STAGGER_MIN_MS = 0;    // décalage avant qu'UN PNJ donné se mette en route : borne basse
export const TJ_REACT_STAGGER_MAX_MS = 1600; // décalage avant qu'UN PNJ donné se mette en route : borne haute (l'attroupement ne part pas tout d'un bloc)
export const TJ_REACT_GATHER_MIN_DIST = 1.6; // distance au clash à laquelle un PNJ s'arrête pour regarder : borne basse (forme un attroupement, pas un tas)
export const TJ_REACT_GATHER_MAX_DIST = 3.2; // idem, borne haute
export const TJ_REACT_SPEED_MUL = 1.35; // pas pressé (curieux/inquiet) mais pas le sprint de l'instigateur (storming, ×1.9)
// Chantier "T/J courent un peu moins vite l'un vers l'autre" (2026-07,
// demande utilisateur) : Tristan/Jérôme partageaient jusqu'ici le MÊME sprint
// que Chloé/Rosalie (×1.9, storming). Nouveau multiplicateur DÉDIÉ, plus
// lent : plus rapide qu'une marche standard (×1) mais nettement en retrait du
// sprint Chloé/Rosalie. Chloé/Rosalie restent inchangées à ×1.9 (voir isTj
// dans residentRoam, FermeGame.js).
export const TJ_STORM_SPEED_MUL = 1.4;
export const TJ_REACT_RETURN_SPEED_MUL = 0.55; // rythme du retour tranquille vers l'activité d'avant, une fois la scène finie
export const TJ_REACT_LINE_PERIOD_MS = 2800; // cycle d'affichage des commentaires inquiets pendant l'attroupement (même principe que skillTalk)
// Zip suivant (retour Guillaume : bulles de l'attroupement illisibles à
// plusieurs, elles se chevauchent) : au lieu que TOUT l'attroupement parle en
// permanence en même temps, on répartit l'affichage en 3 "tours" tournants
// (rid % TJ_REACT_TALK_SLOTS) — un seul tiers de la foule montre sa bulle à
// la fois, le reste attend son tour (voir le rendu, boucle résidents/visiteurs).
export const TJ_REACT_TALK_SLOTS = 3;
// Zip 368 (demande Guillaume : "la lisibilité est mauvaise pour les
// commentaires du public. Afficher deux fois moins de commentaires du public,
// et moins simultané"). Les 3 tours tournants ci-dessus répartissaient déjà
// l'affichage, mais TOUTE la foule finissait par parler. Ici, un PNJ sur
// TJ_REACT_TALK_EVERY seulement commente la scène — les autres restent
// muets du début à la fin. Sélection par `rid % TJ_REACT_TALK_EVERY`, donc
// DÉTERMINISTE et identique chez tous les joueurs (aucun message réseau, et
// pas de bavard différent d'un écran à l'autre).
// Réglage retenu par Guillaume : 2, soit un commentateur sur deux, ce qui
// divise par deux à la fois le NOMBRE de commentaires et le nombre de bulles
// affichées simultanément. Mettre 1 pour revenir au comportement du zip 363.
export const TJ_REACT_TALK_EVERY = 2;
export const TJ_REACT_AFTER_MS = 6000; // mot de la fin affiché avant de repartir, une fois la bagarre résolue (voir TJ_BRAWL_IMMINENT_DELAY_MS pour le total ~30s)
// Chantier v363 "plus aucun PNJ figé" (bug remonté par Guillaume : Eduardo
// « reste figé et ne circule plus ») : l'attroupement se déplace en LIGNE
// DROITE, sans pathfinding (voir residentRoam/tjReact et updateTjCrowdVisitor).
// Un PNJ dont la ligne droite est coupée par un obstacle massif (bâtiment,
// clôture) n'atteignait donc JAMAIS son point de rassemblement ni son point de
// retour : la phase ne se terminait pas, `tjReact` n'était jamais effacé, et le
// PNJ restait bloqué à vie (plus de rôdaille, plus de déplacement — il
// continuait juste à travailler). On borne désormais chaque phase dans le
// temps : à l'échéance, le PNJ abandonne PROPREMENT (il s'arrête sur place pour
// la phase d'aller = il regarde de loin, et il reprend sa rôdaille normale pour
// la phase de retour). Aucun téléport, donc aucun saut visible à l'écran.
export const TJ_REACT_MOVE_TIMEOUT_MS = 9000;   // délai max pour rejoindre l'attroupement, après son décalage de départ (TJ_REACT_STAGGER_*)
export const TJ_REACT_RETURN_TIMEOUT_MS = 12000; // délai max pour regagner sa position d'avant la scène (rythme de retour tranquille, ×0.55)

// Chantier "relations entre résidents" (2026-07, demande Guillaume : "des
// petites infos qui peuvent changer au fil de l'histoire") : table légère
// d'affinités/inimitiés affichée dans la fiche de présentation (Q). Purement
// informatif pour l'instant (aucun impact gameplay), pensée pour évoluer :
// on pourra plus tard modifier ces listes suite à des événements narratifs
// (réconciliation, nouvelle brouille...) sans toucher au reste du moteur.
// Clé = rid VISITOR_ROSTER du résident ; allies/enemies = rids d'autres
// résidents. Pas besoin d'être symétrique dans le code (on affiche l'union
// des deux sens à l'écran, voir residentAffinitiesFor), mais on le garde
// symétrique ici par lisibilité.
export const RESIDENT_AFFINITIES = {
  [JEROME_RID]: { enemies: [TRISTAN_RID], allies: [26] },   // Jérôme Martial : hostile avec Tristan, ami avec Ingrid
  [TRISTAN_RID]: { enemies: [JEROME_RID], allies: [25] },   // Tristan : hostile avec Jérôme, ami avec René
  25: { allies: [TRISTAN_RID], enemies: [16] },             // René : ami avec Tristan, en froid avec Rosalie
  26: { allies: [JEROME_RID] },                             // Ingrid : amie avec Jérôme
  16: { enemies: [25] },                                    // Rosalie : en froid avec René
};
// Renvoie { allies: [rid...], enemies: [rid...] } pour un résident donné, en
// fusionnant les relations déclarées dans les deux sens (ex. si A liste B en
// ami, B est considéré ami de A même si son entrée ne le répète pas).
export function residentAffinitiesFor(rid) {
  const allies = new Set((RESIDENT_AFFINITIES[rid] && RESIDENT_AFFINITIES[rid].allies) || []);
  const enemies = new Set((RESIDENT_AFFINITIES[rid] && RESIDENT_AFFINITIES[rid].enemies) || []);
  for (const [otherRid, rel] of Object.entries(RESIDENT_AFFINITIES)) {
    const or = Number(otherRid); if (or === rid) continue;
    if ((rel.allies || []).includes(rid)) allies.add(or);
    if ((rel.enemies || []).includes(rid)) enemies.add(or);
  }
  return { allies: [...allies], enemies: [...enemies] };
}
export const TJ_BRAWL_HEAL_STEP_MS = TJ_BRAWL_ITT_MS / 2; // chaque pansement retire la moitié de l'ITT restante (2 pansements pour guérir complètement)
export const TJ_BRAWL_COOLDOWN_MS = DAY_REAL_MS; // verrou supplémentaire ENTRE DEUX BAGARRES (pas entre toutes les altercations) : 24h in-game après une bagarre avant qu'une nouvelle puisse se produire

// Retour Guillaume (chantier bulles/dispute plus faciles) : le cycle "rare"
// de la bulle de Rosalie (3s parlée / silence) était calé sur 12s au total
// (9s de silence), ce qui la faisait paraître sous-déclenchée ET ralentissait
// d'autant le compteur de cycles qui lance la dispute (2 cycles à portée du
// joueur). Ramené à 6s au total (3s parlée / 3s silence) pour Rosalie
// uniquement — le cycle de René (RENE_GRUMPY_*, phases bougonnes) reste
// inchangé à 12s, les deux ne partagent que le flag booléen "rare", pas cette
// constante de durée (piège déjà rencontré au zip 327).
export const ROSALIE_RARE_TALK_PERIOD_MS = 6000; // durée totale d'un cycle (parlée + silence)
export const ROSALIE_RARE_TALK_SHOW_MS = 3000;   // partie "parlée" du cycle
export const ROSALIE_LINE_RECULE_WEIGHT = 2; // "Recule" (dernière réplique du pool breadmaker) a 2x plus de chances de sortir que chacune des autres

// ---- Zip 280 (bijouterie, demande Guillaume) ----
// Contrairement aux autres ateliers (beehive/fromagerie/bakery/sawmill), la
// bijouterie n'est PAS liée à un résident/métier : n'IMPORTE QUEL joueur
// connecté peut designer un lot une fois le bâtiment acheté (état partagé
// station.jewelry, voir newStationState). Chaque lot est une pièce UNIQUE
// (pas de production passive, pas de cadence) : le joueur choisit le type,
// la matière (une gemme, au choix parmi celles en stock), la découpe
// (purement cosmétique, sert à l'aperçu) et fixe LIBREMENT son prix de
// vente — chaque pièce finie est donc vendue individuellement à son propre
// prix (pas un prix fixe par type comme miel/fromage/pâtisserie).
export const JEWELRY_COST = 15000; // achat du bâtiment (pot commun), une fois pour toutes
export const JEWELRY_TYPES = [
  { id: "earrings",  name: "Boucles d'oreilles", nameEn: "Earrings",   gold: 2 },
  { id: "bracelet",  name: "Bracelet",           nameEn: "Bracelet",   gold: 3 },
  { id: "necklace",  name: "Collier",            nameEn: "Necklace",   gold: 4 },
  { id: "chain",     name: "Chaîne en or",       nameEn: "Gold chain", gold: 5 },
];
// Découpe : purement cosmétique (aucune incidence sur coût/prix), sert
// uniquement à varier l'aperçu visuel généré dans la scène de design.
export const JEWELRY_SHAPES = [
  { id: "round",  name: "Ronde",   nameEn: "Round" },
  { id: "square", name: "Carrée",  nameEn: "Square" },
  { id: "heart",  name: "Cœur",    nameEn: "Heart" },
  { id: "star",   name: "Étoile",  nameEn: "Star" },
];
// Une pièce consomme 1 gemme (au choix du joueur, n'importe quel type parmi
// C.GEMS) + l'or indiqué par JEWELRY_TYPES[].gold ci-dessus, tous deux
// prélevés sur le pool COMMUN (s.gems / s.gregStock.gold).
export const JEWELRY_GEM_COST = 1;
// Horaires d'ouverture de la boulangerie (minutes dans la journée de jeu).
// La pâtissière ne produit qu'entre 5h30 et 19h00 ; hors de cette plage, le
// four est éteint (aucune production, aucune alerte). Le jour de jeu commence
// à 6h (DAY_START_MIN) donc 5h30 = ouverture effective dès le lever.
export const BAKERY_OPEN_MIN = 5 * 60 + 30;  // 5h30
export const BAKERY_CLOSE_MIN = 19 * 60;     // 19h00
export const LUMBERJACK_WOOD = 6, LUMBERJACK_STONE = 4; // Tristan : par tour de travail -> réserve commune (gregStock)
// Zip 278 (demande Guillaume : "il doit couper du bois + transformer le bois
// en planches") : à CHAQUE tour de travail, en plus d'abattre un arbre et
// casser un rocher (ci-dessus), Tristan tente aussi une conversion — si la
// réserve commune a au moins LUMBERJACK_PLANK_WOOD_COST de bois, il en
// consomme cette quantité pour produire LUMBERJACK_PLANK_YIELD planches
// (gregStock.planks, même pool commun que bois/pierre). Pas de conversion ce
// tour-là si le stock de bois est insuffisant — il continuera d'accumuler du
// bois au fil des tours suivants jusqu'à pouvoir convertir à nouveau.
export const LUMBERJACK_PLANK_WOOD_COST = 4, LUMBERJACK_PLANK_YIELD = 2;

/* ==========================================================================
   Chantier "Super Tristan" (2026-07, demande Guillaume, effet café comique)
   --------------------------------------------------------------------------
   Miroir de SuperGreg/SuperSoan/SuperRené (même pool commun de café,
   station.worldStock.coffee) mais façon "effet magique assumé" plutôt que
   simple boost de vitesse : donner SUPERTRISTAN_COFFEE_COST cafés D'UN COUP
   à Tristan (bûcheron) déclenche, pendant SUPERTRISTAN_DURATION_MS, la
   disparition progressive d'environ SUPERTRISTAN_CLEAR_FRACTION (la moitié)
   des arbres/cailloux de LA CARTE ENTIÈRE (pas juste autour de son ancre de
   travail habituelle) — voir pickSuperTristanTargets (fermeEngine.js) et
   updateSuperTristan (FermeGame.js). Le bois/la pierre récupérés rejoignent
   la réserve commune (gregStock), comme son travail normal. La nature
   repousse ensuite normalement au fil des jours (voir newDay).
   ------------------------------------------------------------------------- */
export const SUPERTRISTAN_COFFEE_COST = 20;            // unités de café consommées EN UNE FOIS (pas de jauge à cafés multiples, contrairement à SuperRené)
export const SUPERTRISTAN_DURATION_MS = 15 * 60 * 1000; // 15 min réelles : durée sur laquelle la moitié de la nature de la carte disparaît
export const SUPERTRISTAN_COOLDOWN_MS = 60 * 60 * 1000; // 1h réelle, démarre à la FIN de l'effet (avant un nouveau bain de café)
export const SUPERTRISTAN_CLEAR_FRACTION = 0.5;         // proportion des arbres/cailloux de la carte visés
export const SUPERTRISTAN_BATCH_MS = 4000;              // intervalle entre deux "vagues" d'abattage pendant l'effet (répartit la liste sur les 15 min)

/* ==========================================================================
   Zip 258 : Eduardo Da Fonseca, commerçant grand voyageur (demande Guillaume)
   --------------------------------------------------------------------------
   Une fois Eduardo résident, on lui commande des PRODUITS DU MONDE rares
   depuis le menu Employés. Chaque produit appartient à un PALIER DE DISTANCE
   (moyen / lointain) qui pilote à la fois le prix (buy × multiplicateur) et la
   durée du voyage (en JOURS de jeu). Il part au moins 2 jours, revient avec la
   commande + parfois une surprise, le tout déposé dans la réserve commune
   (station.worldStock). On peut ensuite revendre ces produits au marché
   ("assez cher", WORLD_GOODS[].sell) — l'usage en pâtisseries vanillées/
   chocolatées viendra plus tard (demande Guillaume : "à voir à l'avenir").
   Liste volontairement resserrée (6 produits, demande Guillaume), cacao et
   gousses de vanille de Madagascar inclus.
   ========================================================================== */
// Paliers de distance : mult = multiplicateur de prix, days = durée du voyage
// en jours de jeu (1 jour de jeu = DAY_REAL_MS). "proche" est prévu pour de
// futurs produits ; aucun produit de la liste actuelle n'y est rattaché.
export const VOYAGE_TIERS = {
  proche:   { mult: 1.0, days: 2 },
  moyen:    { mult: 1.5, days: 3 },
  lointain: { mult: 2.0, days: 4 },
};
// key   : identifiant interne (clé de station.worldStock)
// tier  : palier de distance (VOYAGE_TIERS)
// buy   : prix de base par unité (avant multiplicateur de distance) payé à Eduardo
// sell  : prix de revente par unité au marché (bac/boutique) — "assez cher"
export const WORLD_GOODS = [
  // Zip 301b (demande Guillaume) : cacao, café et vanille servent d'INTRANTS
  // (viennoiseries, cafés Super*, pâtisseries à la vanille). Leurs prix bruts
  // d'achat ET de vente sont fortement réduits — l'intérêt économique vient
  // désormais de leur TRANSFORMATION par les artisans, pas de la revente brute.
  { key: "vanilla",  name: "Gousse de vanille (Madagascar)", nameEn: "Vanilla pod (Madagascar)", tier: "moyen",    buy: 300, sell: 260,  emoji: "\u{1F33F}" },
  { key: "coffee",   name: "Café d'Éthiopie",                nameEn: "Ethiopian coffee",          tier: "moyen",    buy: 200, sell: 200,  emoji: "☕" },
  { key: "cinnamon", name: "Cannelle de Ceylan",             nameEn: "Ceylon cinnamon",           tier: "moyen",    buy: 260, sell: 620,  emoji: "\u{1F90E}" },
  { key: "cocoa",    name: "Fève de cacao",                  nameEn: "Cocoa bean",                tier: "lointain", buy: 250, sell: 250,  emoji: "\u{1F36B}" },
  { key: "pineapple",name: "Ananas",                         nameEn: "Pineapple",                 tier: "lointain", buy: 250, sell: 600,  emoji: "\u{1F34D}" },
  { key: "coconut",  name: "Noix de coco",                   nameEn: "Coconut",                   tier: "lointain", buy: 180, sell: 450,  emoji: "\u{1F965}" },
  // Zip suivant (demande Guillaume) : fève de tonka, intrant des bases
  // vanillées de Chloé (éclairs vanille + flans vanille), aux côtés de la
  // vanille de Madagascar.
  { key: "tonka",    name: "Fève de tonka",                  nameEn: "Tonka bean",                tier: "lointain", buy: 180, sell: 180,  emoji: "\u{1FAD8}" }, // prix baissé (demande Guillaume, initialement 280/280, jugé trop cher)
];
// Prix unitaire d'une commande (payé d'avance) = buy × mult du palier, arrondi.
export function worldGoodUnitCost(good) {
  const t = VOYAGE_TIERS[good.tier] || VOYAGE_TIERS.proche;
  return Math.round(good.buy * t.mult);
}
export const VOYAGE_DAY_MS = DAY_REAL_MS;   // 1 jour de jeu = durée réelle d'un jour
export const VOYAGE_MAX_QTY = 30;           // garde-fou : quantité max par produit et par commande
export const VOYAGE_SURPRISE_CHANCE = 0.5;  // probabilité qu'Eduardo ramène une surprise en plus
export const VOYAGE_SURPRISE_MIN = 1, VOYAGE_SURPRISE_MAX = 3; // quantité de la surprise
// Ancre de rôdaille d'Eduardo quand il est au village (près de la gare/mairie).
// ATTENTION (constat v363) : cette constante n'est PAS utilisée — elle n'est
// lue nulle part dans le code. Eduardo a `SKILL_BUILDING.voyager = null`, donc
// artisanAnchor() renvoie null pour lui et residentRoam le traite comme un
// résident GÉNÉRIQUE : il rôde autour de C.SPAWN, sur le large rayon 9×7, avec
// le comportement social complet (rendez-vous / petits groupes de discussion).
// Choix assumé, conservé en v363 : c'est le seul résident monté (cheval blanc)
// et le seul sans atelier — un grand circuit à cheval au milieu des autres est
// bien plus cohérent qu'un piétinement sur un anneau de 3 cases dans un champ
// vide au nord de la carte (et il garderait perdu ses rendez-vous sociaux,
// réservés aux résidents non ancrés). Gardée ici uniquement au cas où l'on
// voudrait un jour lui donner un poste fixe.
export const VOYAGER_ANCHOR = { x: 40, y: 12 };

/* ==========================================================================
   Zip 259 : exclusion d'un résident (kick-out) + retour de l'ex-résident
   (demande Guillaume).
   --------------------------------------------------------------------------
   Depuis le menu Employés/Résidents, on peut voter l'exclusion d'un résident
   (unanimité des joueurs en ligne ; immédiat en solo), ce qui libère sa
   maison. L'ex-résident revient ensuite, entre 2 et 15 minutes réelles plus
   tard, sous forme de visiteur spécial (offer.type "plea") avec une réaction
   figée à l'exclusion : "touching" (touchante, implore une révision),
   "bitter" (aigrie/méchante) ou "healthy" (réaction saine et posée). Un index
   de variante (vi) est tiré à l'exclusion pour choisir le texte exact, stable
   d'une session à l'autre. On peut alors le réintégrer (oui, si une maison est
   libre) ou refuser (non).
   ========================================================================== */
export const KICK_RETURN_MIN_MS = 2 * 60 * 1000;   // délai min avant le retour de l'ex-résident
export const KICK_RETURN_MAX_MS = 15 * 60 * 1000;  // délai max
// Humeurs possibles au retour, avec leur poids relatif de tirage.
export const EXILE_MOODS = ["touching", "bitter", "healthy"];
export const EXILE_MOOD_WEIGHTS = { touching: 3, bitter: 2, healthy: 2 };
// Nombre de variantes de texte par humeur (doit correspondre aux tableaux
// exilePlea/exileYes/exileNo de fermeStrings.js). Sert à tirer un index valide.
export const EXILE_VARIANT_COUNTS = { touching: 4, bitter: 4, healthy: 3 };
// Certains visiteurs arrivent en RÉCLAMANT du fromage (roue ou parts) contre
// une grosse somme, prélevée sur la réserve commune craftStock.
export const VISITOR_CHEESE_CHANCE = 0.18;      // part des offres "buy" converties en demande de fromage
export const CHEESE_DEMAND_WHEEL_MIN = 1, CHEESE_DEMAND_WHEEL_MAX = 3;
export const CHEESE_DEMAND_WHEEL_PAY = 2200;    // or par roue payé par le visiteur (mieux qu'au bac)
export const CHEESE_DEMAND_PORTION_PAY = 520;   // or par part

// Visit scheduling. Not a fixed timer: after each visit the host schedules
// the next one in [VISIT_MIN_MS, VISIT_MAX_MS], then SHORTENS that delay by
// VISIT_AD_BONUS_MS per posted ad and by a popularity bonus (capped) that
// grows as the farm gets more established (buildings, animals, house level,
// total gold earned). So ads AND organic popularity both bring people in.
export const VISIT_MIN_MS = 4 * 60 * 1000;
export const VISIT_MAX_MS = 9 * 60 * 1000;
export const VISIT_AD_BONUS_MS = 40 * 1000;       // per posted ad category
export const VISIT_POP_BONUS_MAX_MS = 3 * 60 * 1000; // popularity cap
export const VISITOR_SPEED = 2.4;                 // tiles/s walking
export const VISITOR_TRAIN_MS = 4500;             // train pulls in, doors, etc.
export const VISITOR_WAIT_MS = 90 * 1000;         // legacy base wait (still the formula seed, now FLOORED below)
export const VISITOR_NET_MS = 750;                // host broadcast throttle (zip 264: 500 -> 750, ~2 Hz -> ~1.33 Hz) pour visiteurs ET résidents baladeurs. Le rendu invité lisse ces PNJ via smoothNpc (glide+extrapolation, cf. FIX 246) : 1.33 Hz reste parfaitement fluide. Combiné à l'AOI-gate (zip 264), c'est le plus gros levier contre la fuite « résidents diffusés en continu ».
// 2026-07 visitors update (zip 233, Guillaume's spec):
export const VISITORS_MAX = 5;                    // hard cap of visitors on the farm at once
// Zip 298 (demande Guillaume) : garantie d'apparition des artisans dont l'activité
// est difficile à lancer si on ne les voit jamais — Ingrid (fromagère, rid 26) et
// Tristan (bûcheron, rid 27). S'ils ne sont pas apparus au bout de PITY_ARTISAN_MS
// de jeu CONTINU (session courante) et qu'ils ne sont pas déjà résidents, leur
// venue est forcée à la prochaine visite hors plage nocturne.
export const PITY_ARTISAN_RIDS = [26, 27];
export const PITY_ARTISAN_MS = 30 * 60 * 1000;    // 30 minutes de jeu continu
export const VISITOR_WAIT_FLOOR_MS = 10 * 60 * 1000;   // 10 real minutes, hard FLOOR for every visit type
export const VISITOR_WAIT_MAX_MS = 45 * 60 * 1000;     // ceiling: even "prep" orders never linger longer
export const VISITOR_WANDER_AFTER_MS = 30 * 60 * 1000; // after 30 real minutes waiting, they stroll around
export const VISITOR_EASY_STOCK_BIAS = 0.65;      // chance a buy order targets something already in stock
export const VISITOR_GIFT_CHANCE = 0.45;          // chance a "prep" order pays a GIFT on top of the gold
// Zip 250 (demande Guillaume) : fin des "promesses en l'air". Pour un cadeau
// qui va dans le SAC (graine / objet utile / animal), 8/10 des visiteurs le
// remettent DIRECTEMENT au moment du deal ; les 2/10 restants repartent en
// promettant de "l'envoyer", et le cadeau est déposé dans le sac du joueur
// concerné 3 à 5 min APRÈS le départ du visiteur (voir promisedGifts). Les
// décorations gardent leur mécanique propre (non concernées par ce partage).
export const VISITOR_GIFT_DIRECT_CHANCE = 0.8;         // 8/10 : cadeau remis sur-le-champ
export const VISITOR_GIFT_DELAY_MIN_MS = 3 * 60 * 1000; // 2/10 : livraison différée, borne basse
export const VISITOR_GIFT_DELAY_MAX_MS = 5 * 60 * 1000; // ...borne haute (après le départ)
// Unique gift catalogues (never purchasable). Decorations and pets cannot be
// granted yet (personal houses / pet system are still deferred): they queue
// in station.pendingGifts (persisted, see migrateStation) until those ship.
export const UNIQUE_SEED_CROPS = [6, 7];          // indexes in CROPS with unique: true

/* ===========================================================================
   ZIP 388 — LES FLEURS EN POTS
   ---------------------------------------------------------------------------
   Demande de Guillaume : « ajouter aux cadeaux de visiteurs des fleurs
   décoratives » puis, à la question posée, « oublie les pots ; seulement des
   fleurs qui viennent dans des pots. Autant de variété que possible, tous les
   types. Très beau. »

   Il n'y a donc PAS de catégorie "pot" séparée : le pot est le socle commun
   de toutes les fleurs, et c'est lui qui donne au catalogue son unité — comme
   la guimauve donne son unité au sol du Pays des Bonbons (zip 385).

   POURQUOI SEIZE. Le catalogue n'en comptait que TROIS (gnome, fontaine, roue
   solaire) alors que 35 % des cadeaux "prep" et 17 % des trocs sont des
   décorations. Un joueur qui reçoit trente cadeaux repart avec dix gnomes.
   C'est la cause racine du « on accumule trop de décorations dans notre
   bag » — la vente (voir DECOR_SELL) traite le symptôme, la variété traite la
   cause. À seize fleurs + trois anciennes, la probabilité de recevoir deux
   fois la même passe de 1/3 à 1/19.

   CHAMPS. `shape` choisit la silhouette de la floraison, `pot` la teinte du
   pot, `sell` le prix de revente (voir DECOR_SELL). Les trois anciennes
   décorations n'ont pas de `shape` : decorSprite (fermeArt.js) garde pour
   elles son dessin d'origine, AU PIXEL PRÈS. Une entrée sans `shape` et sans
   dessin dédié retomberait sur le gnome — jamais sur une case vide : un
   catalogue étendu sans habillage doit être terne, pas cassé (règle du
   zip 386, drawBridgeTile).

   Les seize `shape` ne sont pas seize dessins recopiés : ce sont NEUF formes
   florales (coupe, rayons, grappe, épi, clochette, rose, trompette, pompon,
   cactus) paramétrées par une palette et une hauteur. C'est ce qui rend
   `render-flowers.mjs` capable de les juger côte à côte.
   =========================================================================== */
export const UNIQUE_DECORATIONS = [
  // --- les trois d'origine (zip 233/251), inchangées au pixel près
  { id: "gnome",    name: "Gnome farceur",       nameEn: "Prankster gnome", sell: 320 },
  { id: "fountain", name: "Fontaine de cristal", nameEn: "Crystal fountain", sell: 400 },
  { id: "sunwheel", name: "Roue solaire",        nameEn: "Sun wheel",       sell: 360 },
  // --- zip 388 : seize fleurs en pots.
  //     shape  = silhouette de la floraison (voir flowerPotSprite, fermeArt.js)
  //     bloom  = couleur vive de la fleur   bloom2 = seconde teinte / cœur
  //     leaf   = feuillage                  pot    = terre du pot
  //     tall   = la tige monte plus haut (tournesol, iris, jacinthe…)
  { id: "f_tulips",    name: "Tulipes",         nameEn: "Tulips",            shape: "cup",
    bloom: "#e2456b", bloom2: "#f58aa4", leaf: "#4a8f3c", pot: "#b5623c", sell: 90 },
  { id: "f_roses",     name: "Rosier",          nameEn: "Rose bush",         shape: "rose",
    bloom: "#c8203f", bloom2: "#ea5f78", leaf: "#3d7a34", pot: "#9c5334", sell: 120 },
  { id: "f_sunflower", name: "Tournesol",       nameEn: "Sunflower",         shape: "ray", tall: true, single: true,
    bloom: "#f2c42e", bloom2: "#6b4218", leaf: "#4a8f3c", pot: "#b5623c", sell: 110 },
  { id: "f_daisies",   name: "Marguerites",     nameEn: "Daisies",           shape: "ray",
    bloom: "#f6f3ea", bloom2: "#e8c23a", leaf: "#579c46", pot: "#c8b49a", sell: 70 },
  { id: "f_lavender",  name: "Lavande",         nameEn: "Lavender",          shape: "spike",
    bloom: "#8a6ec8", bloom2: "#b8a2e0", leaf: "#7d9c72", pot: "#c0a68a", sell: 85 },
  { id: "f_orchid",    name: "Orchidée",        nameEn: "Orchid",            shape: "pad", tall: true,
    bloom: "#d75fae", bloom2: "#f7e2f0", leaf: "#3f7a46", pot: "#e8e4dc", sell: 130 },
  { id: "f_daffodils", name: "Jonquilles",      nameEn: "Daffodils",         shape: "trumpet",
    bloom: "#f4d548", bloom2: "#e88a24", leaf: "#4f9440", pot: "#b5623c", sell: 80 },
  { id: "f_hyacinth",  name: "Jacinthe",        nameEn: "Hyacinth",          shape: "spike", tall: true,
    bloom: "#4a72d0", bloom2: "#89a6ea", leaf: "#4a8f3c", pot: "#7b8fa8", sell: 95 },
  { id: "f_peony",     name: "Pivoine",         nameEn: "Peony",             shape: "pom",
    bloom: "#f2a0c0", bloom2: "#fbd8e6", leaf: "#3d7a34", pot: "#e8e4dc", sell: 115 },
  { id: "f_hydrangea", name: "Hortensia",       nameEn: "Hydrangea",         shape: "cluster",
    bloom: "#7e8fd8", bloom2: "#c0a2e0", leaf: "#3d7a34", pot: "#9c5334", sell: 105 },
  { id: "f_pansies",   name: "Pensées",         nameEn: "Pansies",           shape: "pad",
    bloom: "#6f3fa0", bloom2: "#f4d548", leaf: "#579c46", pot: "#c8b49a", sell: 75 },
  { id: "f_geranium",  name: "Géranium",        nameEn: "Geranium",          shape: "cluster",
    bloom: "#d8283c", bloom2: "#f26a6a", leaf: "#4a8f3c", pot: "#b5623c", sell: 85 },
  { id: "f_carnations",name: "Œillets",         nameEn: "Carnations",        shape: "pom",
    bloom: "#e0489c", bloom2: "#f6a8cf", leaf: "#4f9440", pot: "#c0a68a", sell: 90 },
  { id: "f_iris",      name: "Iris",            nameEn: "Iris",              shape: "bell", tall: true,
    bloom: "#5a3fa8", bloom2: "#f4d548", leaf: "#4a8f3c", pot: "#7b8fa8", sell: 100 },
  { id: "f_poppies",   name: "Coquelicots",     nameEn: "Poppies",           shape: "cup",
    bloom: "#e02a24", bloom2: "#2a2320", leaf: "#579c46", pot: "#c8b49a", sell: 70 },
  { id: "f_cactus",    name: "Cactus fleuri",   nameEn: "Flowering cactus",  shape: "cactus",
    bloom: "#f0609c", bloom2: "#f9b0cc", leaf: "#3f8a52", pot: "#c07a4a", sell: 95 },
];
// Zip 388 : la carte des prix de revente, dérivée du catalogue. Voir
// resolveSellDecor (fermeEngine.js) — l'hôte lit CETTE table, jamais un prix
// venu du client.
export const DECOR_SELL = Object.fromEntries(UNIQUE_DECORATIONS.map(d => [d.id, d.sell | 0]));
export const DECOR_SELL_DEFAULT = 60;             // filet : une déco future sans prix reste vendable
export const UNIQUE_PETS = [
  { id: "dragon",  name: "Dragonneau",     nameEn: "Baby dragon" },
  { id: "unicorn", name: "Licorne",        nameEn: "Unicorn" },
  { id: "skunk",   name: "Moufette chic",  nameEn: "Fancy skunk" },
];

// --- Zip 236: pets are now INDIVIDUAL to each player (Guillaume: "pets we
// collect ... each player can have maximum two pets. In order to get a new
// one, they have to set one they already have free in the wild"). Unified
// catalog keyed by id so the bag can render/name any pet regardless of
// source (visitor gift OR passage world). `hue` drives the generic pet
// sprite tint (fermeArt.js/petSprite); `body` picks a silhouette.
// Zip 367 (demande Guillaume : "permettre d'avoir 4 animaux en simultane, et
// plus seulement 2") : 2 -> 4. Toute la chaine etait deja parametree par cette
// constante (sac, resolveCatchPet, migrateFarmer .slice, textes FR/EN "n / max")
// -- SAUF l'eventail de suivi de drawPetsFor, qui supposait exactement deux
// pets (`i === 0 ? -0.45 : 0.45`) : corrige dans le meme zip, voir FermeGame.js.
//
// Zip 368 (demande Guillaume : "pouvoir garder ses animaux personnels dans son
// bag, et pouvoir les WALK en les choisissant : up to 4 pets at once") : les
// deux notions sont désormais SÉPARÉES.
//   MAX_PETS         = ce qu'on peut POSSÉDER, rangé dans le sac ;
//   MAX_PETS_WALKING = ce qu'on peut sortir EN BALADE en même temps.
// Valeurs retenues par Guillaume : 8 et 4. Un familier porte un drapeau `out`
// (voir resolveSetPetWalking/migrateFarmer, fermeEngine.js) ; seuls les
// familiers en balade sont dessinés et diffusés aux autres joueurs. La règle
// du zip 236 (« pour en attraper un nouveau, il faut en relâcher un ») ne
// mord donc plus qu'à 8, et la collection devient un objectif en soi.
export const MAX_PETS = 8;
export const MAX_PETS_WALKING = 4;
// Zip 251 (demande Guillaume : "réduire les familiers à ~la taille d'une
// poule") : facteur d'échelle appliqué au RENDU du pet (sprite 16x16 dessiné
// à PET_DRAW_SCALE * 16 px, ancré par le bas). Purement visuel, ajustable.
export const PET_DRAW_SCALE = 0.7;

/* ===========================================================================
   ZIP 388 — DES FAMILIERS VIVANTS
   ---------------------------------------------------------------------------
   Guillaume : « ils doivent être plus animés, avoir des petites pattes qui
   bougent quand ils marchent ; leur corps doit s'orienter selon le sens de
   leur direction ; et ils doivent jouer entre eux ; savoir tourner sur eux-
   mêmes etc. Il faut que ce soit vivant. »

   État de départ, vérifié avant d'écrire (règle du zip 385 : vérifier par grep
   que ce qu'on croit retoucher est réellement LU) : `petSprite` produisait UN
   canevas 16×16, dessiné toujours de profil droit, sans la moindre frame. Il
   n'y avait donc RIEN à améliorer — tout était à créer.

   PET_DIRS × PET_FRAMES canevas par familier. Les frames 1 et 2 sont les deux
   contacts de la foulée (patte avant gauche / patte avant droite) ; la frame 0
   est la pose au repos, pattes jointes. La queue bouge sur les trois.

   ⚠️ COÛT MÉMOIRE, calculé et non estimé : ~45 familiers × 4 × 3 = 540 canevas
   de 16×16, soit 552 ko une fois pour toutes au chargement, plus 540 passes
   getImageData de 256 pixels pour les contours (138 k pixels au total, contre
   les 886 objets que le défi de fuite dessine à CHAQUE frame). C'est construit
   une seule fois dans buildSprites, jamais pendant une frame de jeu.

   ⚠️ ZÉRO MESSAGE RÉSEAU. C'est le point de conception qui compte, et il suit
   le modèle des licornes du zip 386 : ni la direction, ni la frame, ni le jeu
   en cours ne voyagent. La direction se DÉDUIT du déplacement du familier
   (que chaque client calcule déjà pour son suivi lissé), et le comportement
   de jeu est une fonction du TEMPS et d'un grain stable (id du propriétaire +
   index du familier) — donc identique chez les deux joueurs sans qu'ils se
   parlent. La série 373-388 reste à zéro message périodique ajouté.
   =========================================================================== */
export const PET_DIRS = 4;                        // 0 = face (vers le bas), 1 = dos, 2 = gauche, 3 = droite
export const PET_FRAMES = 3;                      // 0 = repos, 1 et 2 = les deux contacts de la foulée
export const PET_STEP_MS = 150;                   // durée d'un contact : plus vif que le fermier (petites pattes)
export const PET_MOVE_EPS = 0.012;                // tuiles/frame en-deçà desquelles le familier est considéré à l'arrêt
export const PET_SHADOW_ALPHA = 0.22;             // ombre au sol, posée sous le sprite
// --- le JEU entre familiers -------------------------------------------------
// Un familier n'entre en jeu que si son propriétaire est immobile depuis
// PET_PLAY_IDLE_MS : tant qu'on marche, ils suivent, sinon on croirait qu'ils
// se perdent. Le créneau de jeu est strictement dérivé du temps (voir
// petPlayAt, fermeEngine.js) : même créneau, même figure, chez tous les
// clients.
export const PET_PLAY_IDLE_MS = 1400;             // immobilité du maître avant que les familiers s'occupent
export const PET_PLAY_PERIOD_MS = 7000;           // durée d'un créneau de jeu
export const PET_PLAY_ACTIVE = 0.62;              // part du créneau réellement jouée (le reste = pause)
export const PET_SPIN_MS = 900;                   // durée d'un tour sur soi-même (les 4 directions défilent)
export const PET_CHASE_RADIUS = 0.85;             // rayon de la ronde quand deux familiers se poursuivent, en tuiles
export const PET_HOP_H = 3;                       // hauteur du petit saut, en pixels écran
export const PET_EMOTE_MS = 1200;                 // durée d'affichage d'une émote au-dessus de la tête
// Les figures possibles, dans l'ordre où petPlayAt les tire. "chase" et "face"
// demandent DEUX familiers : un familier seul retombe sur les figures solo.
export const PET_PLAY_SOLO = ["spin", "sit", "hop", "sniff"];
export const PET_PLAY_DUO = ["chase", "face", "hop"];

/* ===========================================================================
   ZIP 388 — QUI DONNE LES FAMILIERS
   ---------------------------------------------------------------------------
   Guillaume : « leur attribution semble injustifiée et aléatoire : il faut que
   les pets soient offerts par des visiteurs », puis, à la question posée :
   « visiteur uniquement, ET il faut avoir déjà de l'amitié ».

   Ce qui change :
     - `resolvePassagePickup` ne tire PLUS de familier. Ramasser une breloque
       au sol dans le monde du passage faisait apparaître un animal sans un
       mot d'explication : c'était exactement l'attribution « injustifiée ».
       L'or de la breloque, lui, ne bouge pas.
     - un familier ne peut plus venir que d'un visiteur dont l'amitié atteint
       PET_GIFT_REL_MIN, et il est PROPOSÉ (accepter / refuser) au lieu de
       tomber dans le sac.
     - seule exception, assumée : le chat berlingot du Gourmandin. Ce n'est pas
       une attribution aléatoire, c'est le prix de quinze niveaux.

   ⚠️ CONSÉQUENCE CHIFFRÉE, à surveiller manette en main. Le seuil d'amitié
   ferme la seule source disponible en début de partie. Pour ne pas rendre la
   collection inatteignable, la part "familier" du tirage de cadeau passe de
   12 % à 22 % UNE FOIS le seuil franchi : un joueur ami reçoit donc plus de
   familiers qu'avant, un inconnu n'en donne plus jamais. C'est le contraire
   d'un nerf, c'est un déplacement.
   =========================================================================== */
export const PET_GIFT_REL_MIN = 6;                // même seuil que REL_RESIDENT_MIN : un ami, pas un passant
export const PET_GIFT_SHARE = 0.22;               // part du tirage de cadeau qui devient un familier (au-delà du seuil)
export const PET_SWAP_SHARE = 0.30;               // idem côté troc
// Un visiteur qui revient d'un voyage rapporte le familier de la terre du
// passage EN COURS (voir passageWorldOf) plutôt qu'un chat de gouttière : le
// familier de terre reste lié à la rotation, donc à quelque chose que le
// joueur peut lire dans le monde. Sinon on retombe sur du hasard opaque.
export const PET_GIFT_WORLD_SHARE = 0.28;         // part des familiers offerts qui sont ceux d'une terre du passage
export const PET_GIFT_UNIQUE_SHARE = 0.10;        // ...et part des familiers RARES (dragonneau, licorne, moufette)
// Zip 248 (demande Guillaume : "the dalmatian is purple, which does not make
// sense... make each dog and cat design accurate to their actual appearance").
// L'ancien système ne portait qu'une TEINTE (`hue`) appliquée en HSL sur une
// unique silhouette générique : d'où un dalmatien violet et 30 races
// indiscernables. Chaque entrée porte désormais une VRAIE palette et un
// motif :
//   coat  = couleur principale du pelage        shade = ombre / dos
//   belly = ventre / poitrail / museau clair    mark  = couleur des marques
//   eye   = couleur de l'iris                   nose  = truffe
//   pattern = "solid" | "tabby" | "spots" | "rosette" | "calico" | "points"
//             | "tuxedo" | "saddle" | "mask" | "patches" | "blaze"
//   ears  = "cat" | "perky" | "floppy" | "long" | "tiny" | "rose"
//   tail  = "cat" | "curl" | "plume" | "stub" | "bushy"
//   fluff = 0 (poil ras) | 1 (moyen) | 2 (très fourni : persan, spitz…)
//   longBody = true pour les races basses et allongées (teckel)
// Voir petSprite (fermeArt.js) qui dessine chat et chien avec des
// silhouettes RÉELLEMENT différentes puis applique le motif par-dessus.
export const PET_CATALOG = {
  // --- visitor-gift pets
  dragon:    { name: "Dragonneau",          nameEn: "Baby dragon",      body: "dragon",
               coat: "#4aa04a", shade: "#2e6e2e", belly: "#a8dc78", mark: "#ffcf3a", eye: "#ffd75e", nose: "#1f4d1f", pattern: "solid" },
  unicorn:   { name: "Licorne",             nameEn: "Unicorn",          body: "horse",
               coat: "#f4f0ea", shade: "#d8d2c6", belly: "#ffffff", mark: "#e58ac0", eye: "#7a5fd0", nose: "#c0a8b8", pattern: "solid" },
  skunk:     { name: "Moufette chic",       nameEn: "Fancy skunk",      body: "critter",
               coat: "#2a2a30", shade: "#17171c", belly: "#3a3a42", mark: "#f0eee6", eye: "#ffd75e", nose: "#101014", pattern: "stripe" },
  // --- passage-world pets (must match PASSAGE_WORLDS[].pet.id)
  shadowcat: { name: "Chat d'ombre",        nameEn: "Shadow cat",       body: "cat",
               coat: "#3a2f4a", shade: "#241d30", belly: "#4d4062", mark: "#b088ff", eye: "#c9a6ff", nose: "#241d30", pattern: "solid", ears: "cat", tail: "cat", fluff: 1 },
  candyfox:  { name: "Renard barbe à papa", nameEn: "Cotton-candy fox", body: "critter",
               coat: "#f2a8cf", shade: "#d2789f", belly: "#fde4f1", mark: "#ffffff", eye: "#6a4a7a", nose: "#8a4a6a", pattern: "tips" },
  mazemouse: { name: "Souris des haies",    nameEn: "Hedge mouse",      body: "critter",
               coat: "#9a8f7a", shade: "#776d5a", belly: "#e0d8c4", mark: "#f0b8c0", eye: "#241d18", nose: "#c07888", pattern: "solid" },
  gemturtle: { name: "Tortue gemme",        nameEn: "Gem turtle",       body: "turtle",
               coat: "#5fbf7a", shade: "#3d8a55", belly: "#a8e0b0", mark: "#3fbfc8", eye: "#1f3d2a", nose: "#2e6b42", pattern: "solid" },
  // Zip 385 : chat berlingot, prix du niveau 15 du Gourmandin. Il n'est PAS
  // attrapable au sol comme les cinq ci-dessus (il ne remplace donc pas le
  // renard barbe à papa du Pays des Bonbons, il s'y ajoute) : il ne s'obtient
  // qu'en finissant le mini-jeu, une seule fois par joueur, et rejoint le sac
  // comme n'importe quel familier — donc promenable en ferme ET en ville sans
  // une ligne de plus (voir drawPetsFor / drawTownFrame, FermeGame.js).
  candycat:  { name: "Chat berlingot",      nameEn: "Candy cat",        body: "cat",
               coat: "#f7b8d8", shade: "#d98ab5", belly: "#fff0f7", mark: "#e8356e", eye: "#7ce0f0", nose: "#c65a8c", pattern: "tabby", ears: "cat", tail: "cat", fluff: 1 },
  cloudlamb: { name: "Agneau des nuages",   nameEn: "Cloud lamb",       body: "lamb",
               coat: "#f6f4f0", shade: "#dcd8d0", belly: "#ffffff", mark: "#e8c9a8", eye: "#3a3028", nose: "#c9a086", pattern: "solid", fluff: 2 },
};
export function petName(petId, en) {
  const p = PET_CATALOG[petId]; if (!p) return petId;
  return en ? p.nameEn : p.name;
}

// --- Zip 237 / refonte zip 248 : races COMMUNES (chats & chiens) proposées
// par les visiteurs. Chaque race a maintenant sa palette réelle et son motif,
// pour être reconnaissable au premier coup d'œil.
export const COMMON_CATS = [
  { id: "cat_tabby",   name: "Chat tigré",    nameEn: "Tabby cat",    pattern: "tabby",
    coat: "#96794e", shade: "#6d5636", belly: "#e2d3ae", mark: "#4e3c22", eye: "#8fbf4a", nose: "#c98a86" },
  { id: "cat_black",   name: "Chat noir",     nameEn: "Black cat",    pattern: "solid",
    coat: "#2c2c33", shade: "#191920", belly: "#3c3c46", mark: "#2c2c33", eye: "#8fd94a", nose: "#191920" },
  { id: "cat_white",   name: "Chat blanc",    nameEn: "White cat",    pattern: "solid",
    coat: "#f4f2ec", shade: "#d9d5cb", belly: "#ffffff", mark: "#f4f2ec", eye: "#5aa8d9", nose: "#e8a8a8" },
  { id: "cat_ginger",  name: "Chat roux",     nameEn: "Ginger cat",   pattern: "tabby",
    coat: "#d9843c", shade: "#ac5f22", belly: "#f6d9a8", mark: "#9a4f18", eye: "#8fbf4a", nose: "#e0968e" },
  { id: "cat_siamese", name: "Siamois",       nameEn: "Siamese",      pattern: "points",
    coat: "#eadfc4", shade: "#cfc0a0", belly: "#f8f0dc", mark: "#4a3830", eye: "#4aa8e0", nose: "#4a3830" },
  { id: "cat_calico",  name: "Chat calico",   nameEn: "Calico",       pattern: "calico",
    coat: "#f4f1e8", shade: "#d8d3c6", belly: "#ffffff", mark: "#d9863c", mark2: "#33302e", eye: "#c9a03c", nose: "#e0a0a0" },
  { id: "cat_grey",    name: "Chartreux",     nameEn: "Grey cat",     pattern: "solid",
    coat: "#7f8d97", shade: "#5d6a74", belly: "#a3b0b8", mark: "#7f8d97", eye: "#e0a83c", nose: "#5d6a74" },
  { id: "cat_persian", name: "Persan",        nameEn: "Persian",      pattern: "solid", fluff: 2, flatFace: true,
    coat: "#efe3c8", shade: "#d4c5a4", belly: "#fbf5e6", mark: "#efe3c8", eye: "#d9803c", nose: "#d9a09a" },
  { id: "cat_bengal",  name: "Bengal",        nameEn: "Bengal",       pattern: "rosette",
    coat: "#d9a441", shade: "#b07f26", belly: "#f3ddab", mark: "#4a3320", eye: "#8fbf4a", nose: "#c98a72" },
  { id: "cat_tux",     name: "Chat smoking",  nameEn: "Tuxedo cat",   pattern: "tuxedo",
    coat: "#2c2c33", shade: "#191920", belly: "#f6f4ee", mark: "#f6f4ee", eye: "#8fd94a", nose: "#e8a8a8" },
  { id: "cat_maine",   name: "Maine coon",    nameEn: "Maine coon",   pattern: "tabby", fluff: 2, tufts: true,
    coat: "#8a6740", shade: "#63482b", belly: "#dcc39a", mark: "#40301c", eye: "#c9a03c", nose: "#b07a70" },
  { id: "cat_blue",    name: "Bleu russe",    nameEn: "Russian blue", pattern: "solid",
    coat: "#93a6b4", shade: "#6f8290", belly: "#b9c8d2", mark: "#93a6b4", eye: "#6fbf5a", nose: "#7f909c" },
  { id: "cat_cream",   name: "Chat crème",    nameEn: "Cream cat",    pattern: "solid",
    coat: "#eed9b0", shade: "#d2b98c", belly: "#f9ecd2", mark: "#eed9b0", eye: "#c9a03c", nose: "#e0b0a0" },
  { id: "cat_spotty",  name: "Chat moucheté", nameEn: "Spotted cat",  pattern: "spots",
    coat: "#d5d5d0", shade: "#b2b2ac", belly: "#eeeeea", mark: "#43434a", eye: "#8fbf4a", nose: "#b09090" },
  { id: "cat_lilac",   name: "Chat lilas",    nameEn: "Lilac cat",    pattern: "solid",
    coat: "#bda9b6", shade: "#9a8794", belly: "#dccfd8", mark: "#bda9b6", eye: "#c9a03c", nose: "#c0a0aa" },
];
export const COMMON_DOGS = [
  { id: "dog_lab",       name: "Labrador",   nameEn: "Labrador",   pattern: "solid",  ears: "floppy", tail: "plume",
    coat: "#ddc188", shade: "#bb9d63", belly: "#f0dfb4", mark: "#ddc188", eye: "#5a3a20", nose: "#2a2320" },
  { id: "dog_poodle",    name: "Caniche",    nameEn: "Poodle",     pattern: "solid",  ears: "floppy", tail: "pom", fluff: 2, curly: true,
    coat: "#f0ece2", shade: "#d5cfc0", belly: "#fbf8f0", mark: "#f0ece2", eye: "#3a2f28", nose: "#241f1c" },
  { id: "dog_husky",     name: "Husky",      nameEn: "Husky",      pattern: "mask",   ears: "perky",  tail: "bushy", fluff: 1,
    coat: "#4a4f5a", shade: "#31353e", belly: "#f2f2ee", mark: "#f2f2ee", eye: "#5ec8e8", nose: "#1c1c20" },
  { id: "dog_beagle",    name: "Beagle",     nameEn: "Beagle",     pattern: "saddle", ears: "long",   tail: "up",
    coat: "#f2ece0", shade: "#d3ccbc", belly: "#ffffff", mark: "#c2822f", mark2: "#33302c", eye: "#4a3220", nose: "#241f1c" },
  { id: "dog_corgi",     name: "Corgi",      nameEn: "Corgi",      pattern: "blaze",  ears: "perky",  tail: "stub", stumpy: true,
    coat: "#d99a52", shade: "#b3762f", belly: "#f6efe2", mark: "#f6efe2", eye: "#4a3220", nose: "#241f1c" },
  { id: "dog_shiba",     name: "Shiba",      nameEn: "Shiba",      pattern: "blaze",  ears: "perky",  tail: "curl",
    coat: "#d9793a", shade: "#b0561d", belly: "#f6ecd8", mark: "#f6ecd8", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_dalmatian", name: "Dalmatien",  nameEn: "Dalmatian",  pattern: "spots",  ears: "floppy", tail: "up",
    coat: "#f5f3ed", shade: "#dad6cc", belly: "#ffffff", mark: "#1e1e22", eye: "#4a3a2a", nose: "#1e1e22" },
  { id: "dog_bulldog",   name: "Bouledogue", nameEn: "Bulldog",    pattern: "patches",ears: "rose",   tail: "stub", wide: true, flatFace: true,
    coat: "#f0e6d4", shade: "#d2c4ac", belly: "#fbf6ec", mark: "#c98f4a", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_terrier",   name: "Terrier",    nameEn: "Terrier",    pattern: "patches",ears: "tiny",   tail: "up", scruffy: true,
    coat: "#f2ece0", shade: "#d3ccbc", belly: "#ffffff", mark: "#b8823c", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_dachs",     name: "Teckel",     nameEn: "Dachshund",  pattern: "solid",  ears: "long",   tail: "up", longBody: true,
    coat: "#8c4a24", shade: "#68341a", belly: "#b06a3a", mark: "#8c4a24", eye: "#2f2018", nose: "#1e1a18" },
  { id: "dog_collie",    name: "Colley",     nameEn: "Collie",     pattern: "blaze",  ears: "semi",   tail: "plume", fluff: 2, longNose: true,
    coat: "#b5762f", shade: "#8d5820", belly: "#f6efe2", mark: "#f6efe2", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_pug",       name: "Carlin",     nameEn: "Pug",        pattern: "mask",   ears: "rose",   tail: "curl", flatFace: true,
    coat: "#e5c98d", shade: "#c4a769", belly: "#f4e6c4", mark: "#2e2a28", eye: "#2a2018", nose: "#1e1a18" },
  { id: "dog_boxer",     name: "Boxer",      nameEn: "Boxer",      pattern: "mask",   ears: "semi",   tail: "stub",
    coat: "#c9803c", shade: "#a15f24", belly: "#f2e4cc", mark: "#3a2e26", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_spaniel",   name: "Épagneul",   nameEn: "Spaniel",    pattern: "patches",ears: "long",   tail: "plume", fluff: 1,
    coat: "#f4efe4", shade: "#d6d0c2", belly: "#ffffff", mark: "#7d4a2a", eye: "#3a2a1c", nose: "#241f1c" },
  { id: "dog_pom",       name: "Spitz nain", nameEn: "Pomeranian", pattern: "solid",  ears: "tiny",   tail: "pom", fluff: 2, stumpy: true,
    coat: "#e0913c", shade: "#bb6f22", belly: "#f6dcb0", mark: "#e0913c", eye: "#2f2018", nose: "#1e1a18" },
];
for (const c of COMMON_CATS) PET_CATALOG[c.id] = { ...c, body: "cat", common: true, ears: "cat", tail: "cat" };
for (const d of COMMON_DOGS) PET_CATALOG[d.id] = { ...d, body: "dog", common: true };
export const COMMON_PET_IDS = [...COMMON_CATS, ...COMMON_DOGS].map(p => p.id);

// --- Zip 237: SWAP offers. Some visitors barter an item for our produce
// instead of paying money (Guillaume: "offering a decorative item, a useful
// item, rare seeds, common pets — for our crops and fish and other produce").
// The visitor WANTS n units of one of our produce kinds; in return they GIVE
// one reward. Resolution in resolveVisitorSwap.
export const SWAP_OFFER_CHANCE = 0.22;   // share of non-hostile, non-stay visits that are swaps
export const SWAP_WANT_MIN = 3;
export const SWAP_WANT_MAX = 8;
// Useful items a swap can hand over (drawn into the player's own bag/inv).
export const SWAP_USEFUL_ITEMS = [
  { item: "wood",    n: 20 }, { item: "stone", n: 15 }, { item: "food", n: 6 },
  { item: "salve",   n: 1 },  { item: "healKit", n: 2 }, { item: "fence", n: 10 },
];

// Dispositions. Hostile chance is halved once per resident living on the
// farm (a lively townhall discourages troublemakers).
export const VISITOR_HOSTILE_CHANCE = 0.06;
export const VISITOR_RICH_CHANCE = 0.5;           // for rich-flagged roster entries
export const VISITOR_CHAT_CHANCE = 0.3;           // nice/neutral visit is a chat (no purchase)

// Hostile visitors (Guillaume's caps: steal up to 100 gold, ruin 10 crops).
export const HOSTILE_DEADLINE_MS = 60 * 1000;     // time to pay or refuse
export const HOSTILE_STEAL_MAX = 100;
export const HOSTILE_RUIN_CROPS = 10;
export const REPAIR_WINDOW_MS = 120 * 1000;       // co-op window to reverse the damage
export const REPAIR_HITS = 3;                     // hits needed in the repair minigame (easy)

// Relationships and residency.
export const REL_CHAT = 1;
export const REL_DEAL = 2;
export const REL_RESIDENT_MIN = 6;                // friendship needed before they ask to stay
export const VOTE_DEADLINE_MS = 60 * 1000;        // online players must vote within this window

// Zip 234 (Guillaume: "the more a friendship is built, the more they visit,
// the more they come bearing gifts, and the more they pay"). All effects are
// driven by station.rel[rid], the existing per-character friendship counter.
export const REL_PRICE_BONUS = 0.03;              // +3% on every buy price per friendship point...
export const REL_PRICE_BONUS_MAX = 0.6;           // ...capped at +60% (rel 20)
export const REL_GIFT_BONUS = 0.03;               // prep-order gift chance grows with friendship...
export const REL_GIFT_MAX = 0.85;                 // ...capped
export const REL_EASY_GIFT_MIN = 6;               // real friends may attach a gift even to an EASY order
export const REL_SPAWN_WEIGHT = 0.25;             // roster pick weight: 1 + rel*this (capped at rel 12) -> friends visit more often
export const REL_SPAWN_WEIGHT_RELCAP = 12;
export const REL_POP_DIV = 4;                     // farmPopularity: +1 per REL_POP_DIV total friendship points (capped) -> visits come sooner
export const REL_POP_MAX = 8;
export const REL_ARRIVAL_GIFT_MIN = 4;            // from this friendship on, they sometimes step off the train with a present
export const REL_ARRIVAL_GIFT_CHANCE = 0.06;      // chance per friendship point...
export const REL_ARRIVAL_GIFT_CHANCE_MAX = 0.5;   // ...capped at 50%
export const REL_HEART = 2;                       // friendship points per heart in the visitor card (5 hearts max)
export const REL_CHAT_CAP_PER_VISIT = 3;          // only the first chats of a visit earn friendship (anti-spam)
export const VISITOR_CHAT_TIERS = 3;              // dialogue pools by friendship tier (see fermeStrings.visitorChatLines)
export const VISITOR_CHAT_LINES = 4;              // lines per tier, fr/en symmetric
export const VISITOR_CHAT_TIER1_REL = 4;          // rel thresholds for tiers 1 and 2
export const VISITOR_CHAT_TIER2_REL = 10;
export const VISITOR_LINGER_MS = 3 * 60 * 1000;   // after a fulfilled order they stroll the square instead of leaving at once
export const VISITOR_STAGGER_MIN_MS = 1800;       // gap between two group members stepping off the train...
export const VISITOR_STAGGER_MAX_MS = 4200;       // ...so they walk in a loose line, not on top of each other

// --- Valley Town (zip 234, Guillaume: "users can take a train ride at the
// existing train station and arrive at the town centre, called Valley Town;
// each user can have a house there"). Separate map like the evil world (fixed
// seed, regenerated identically on every visit, nothing persisted), but
// MULTIPLAYER: players publish their real position with zone "town" and see
// each other there. Houses are assigned deterministically (see townHouseOwners
// in FermeGame.js): known farmers sorted by id -> plots in order; leftover
// plots show a "for sale" sign. Interiors are deferred.
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ ZIP 425 — VALLEY TOWN EST REFAITE, ET LA CARTE EST 3× PLUS GRANDE DANS
   CHAQUE DIMENSION (64×48 → 192×144, soit NEUF fois la surface).
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « on va tout recommencer sur cette map, car on veut
   une map bien plus grande. La grille doit être au moins 3x plus étendue. »
   L'objectif annoncé est un VERSANT ÉGAL À LA FERME en points d'intérêt — ce
   qui ne se construira pas en une session. Ce zip pose donc la GÉOGRAPHIE
   (quartiers, rues, reliefs, monuments) en laissant délibérément des parcelles
   vides : une ville qu'on remplit est un chantier, une ville trop petite pour
   ce qu'on veut y mettre est une impasse.

   ⚠️ POURQUOI 3× EN LINÉAIRE ET NON 3× EN SURFACE. « 3× plus étendue » se lit
   des deux façons, et 3× en surface (≈ 110×83) n'aurait donné qu'un tiers de
   rue en plus dans chaque direction — c'est-à-dire une ville qui a l'air de la
   même. La demande porte sur la SENSATION d'espace, qui suit la distance, pas
   l'aire. On prend donc le sens le plus généreux.

   ⚠️ ET ÇA NE COÛTE RIEN AU RENDU : drawTownFrame ne dessine que la fenêtre
   visible (x0..x1 / y0..y1 calculés depuis la caméra). Le surcoût est celui de
   trois tableaux de 27 648 entrées construits UNE FOIS par chargement de page
   (le cache module de getTownWorldCached), soit une poignée de millisecondes.
   ⚠️ ET RIEN N'EST PERSISTÉ : la ville est regénérée à graine fixe, identique
   pour tout le monde, à chaque visite. Il n'y a donc aucune migration à écrire
   — c'est ce qui rend cette refonte possible d'un bloc.

   ⚠️ CE QUI NE DEVAIT PAS CASSER, ET QUI N'A PAS CASSÉ :
     * les RÉSIDENTS. townHouseOwners() attribue les parcelles par index (les
       fermiers connus triés par id, puis les résidents). On a AUGMENTÉ le
       nombre de parcelles et gardé l'ordre : les huit premières entrées de
       TOWN_HOUSES restent les quatre du nord et les quatre du sud de la rue
       principale, exactement comme avant. Un propriétaire garde donc son rang.
     * la TÉLÉPORTATION DÉVELOPPEUR (dev:town), qui pose le joueur sur
       TOWN_SPAWN — déplacé avec la gare, jamais recopié ailleurs.
     * le TRAIN, qui arrive et repart sur les mêmes deux repères.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ ZIP 426 — LA CARTE S'AGRANDIT UNE SECONDE FOIS : 192×144 → 224×168.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « tu peux aussi agrandir encore la map ».
   ⚠️ ON N'AGRANDIT PAS AVANT D'AVOIR DE QUOI REMPLIR. Le 425 a montré ce que
   coûte l'inverse (une prairie entre les rues) ; les 32 colonnes et 24 rangées
   de ce zip arrivent DONC avec leur contenu, décidé d'abord :
     * au SUD (y ≥ 144) : une cinquième avenue (y = 150), une rangée de
       parcelles, le CIMETIÈRE et le LAC avec sa promenade et son ponton ;
     * à l'EST (x ≥ 190) : une quatrième artère nord-sud (x = 196) et le
       QUARTIER DES ARTISANS, trois parcelles de plus.
   ⚠️ ET LE BORD SUD N'EST PLUS UNE RUE. `paveCol` s'arrêtait à H-11 : avec la
   promenade du lac en dessous, une artère nord-sud plongeait dans l'eau. Elles
   s'arrêtent maintenant à la DERNIÈRE avenue (dérivée de TOWN_ST_ROWS), ce qui
   est de toute façon ce qu'on veut dire — une rue finit à un carrefour.
   ═══════════════════════════════════════════════════════════════════════════ */
export const TOWN_MAP_W = 224;
export const TOWN_MAP_H = 168;
export const TOWN_RAIL_X = 2;                       // rails on columns 2..3, full height, like the farm
export const TOWN_PLATFORM = { x: 4, y: 66, w: 2, h: 8 };
export const TOWN_SPAWN = { x: 6, y: 70 };          // step off the train here
export const TOWN_STATION_SIGN = { x: 7, y: 72 };   // E here to ride back to the farm

/* LES RUES. Quatre est-ouest, trois nord-sud, toutes larges de deux cases.
   ⚠️ ELLES SONT DÉCLARÉES ICI ET NON DESSINÉES À LA MAIN DANS LE GÉNÉRATEUR,
   parce que trois autres endroits en ont besoin : le placement des parcelles
   (une maison a une allée qui rejoint la rue SOUS elle), l'écartement des
   arbres, et le mobilier urbain. Une rue recopiée est une rue qui bougera
   d'un côté seulement. */
export const TOWN_MAIN_ST_Y = 70;                   // rue principale (gare → bord est) : lignes y..y+1
export const TOWN_ST_ROWS = [34, 70, 108, 128, 150];     // toutes les rues est-ouest (426 : + celle du sud)
export const TOWN_CROSS_ST_X = 92;                  // artère centrale nord-sud, colonnes x..x+1
export const TOWN_ST_COLS = [34, 92, 150, 196];     // toutes les rues nord-sud (426 : + celle des artisans)

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 434 — LE REVÊTEMENT DES RUES. UNE COUCHE, PAS DES IDENTIFIANTS DE SOL.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : l'artère de la gare goudronnée et élargie, l'allée du
   cimetière en briques, toutes les autres rues en pavés gris.

   ⚠️⚠️ LE PIÈGE ÉVITÉ, ET C'EST LE SUJET DE CE BLOC. La façon « évidente » de
   faire est d'ajouter trois `G_*` de plus (G_TOWN_ASPHALT, G_TOWN_COBBLE,
   G_TOWN_BRICK). Elle coûte QUARANTE tests à rouvrir : `ground === C.G_PATH`
   apparaît quarante fois dans fermeEngine.js (marche, A* piéton, A* du taxi,
   arrêts de taxi, oiseaux, lampadaires, panneaux, haies, promenade du lac…) et
   deux fois dans les bancs. En oublier UN ne lève rien : ça fait une rue qu'on
   ne peut plus traverser, ou un taxi qui refuse une course, ou un pigeon qui
   ne se pose plus — c'est-à-dire exactement la famille de défauts muets du §4.
   ⚠️ LA PARADE EST CELLE DES HAIES (425) : un TABLEAU PARALLÈLE, lu à l'index
   qu'on a déjà. Le sol reste `G_PATH` — la circulation, la navigation et le
   taxi ne voient donc STRICTEMENT aucun changement —, et `world.road[i]` dit
   seulement avec quoi on le PEINT. Un client qui n'aurait pas la couche (ou un
   banc qui construit un monde à la main) retombe sur l'ancienne tuile de terre
   battue, jamais sur un trou.
   ═══════════════════════════════════════════════════════════════════════════ */
export const TR_NONE = 0;      // terre battue : allées de maison, parvis, champ de foire
export const TR_ASPHALT = 1;   // la grande artère : goudron + ligne blanche discontinue
export const TR_COBBLE = 2;    // pavés gris, toutes les autres rues
export const TR_BRICK = 3;     // briques : l'allée du cimetière
/* ⚠️ 437 — LE GRAVIER : les allées du parc et le sentier de la rive sauvage du
   lac. Il est arrivé le jour où l'on a voulu un sentier au bord de l'eau, et
   il montre au passage que l'arbitrage du 434 était le bon : une valeur de plus
   dans une couche de PEINTURE ne rouvre aucun des quarante tests
   `ground === G_PATH` du moteur. Un `G_TOWN_GRAVEL` les aurait tous rouverts
   pour une différence purement visuelle. */
export const TR_GRAVEL = 4;    // gravier clair : promenades de parc et de rive, jamais une voie
/* ⚠️ LA CHAUSSÉE S'ÉLARGIT SANS DÉPLACER SON AXE, et ce n'est pas un hasard :
   la bande passe de 2 à 4 cases EN GARDANT SON MILIEU (rangées 69..72 au lieu
   de 70..71, milieu à y = 71,0 dans les deux cas). C'est ce qui rend
   l'élargissement gratuit pour le taxi : `townRoadCenter` repose ses points au
   milieu de la bande roulable, donc il roule exactement là où il roulait, et
   les 18 contrôles de verify-taxi.mjs mesurent la même trajectoire.
   ⚠️ Corollaire : ce nombre doit rester PAIR. Impair, le milieu tomberait au
   centre d'une case (y + 0,5), la ligne blanche se dessinerait au milieu d'une
   tuile et le taxi se décalerait d'une demi-case — visible, et pour rien. */
export const TOWN_MAIN_ST_W = 4;
export const TOWN_MAIN_ST_Y0 = TOWN_MAIN_ST_Y - (TOWN_MAIN_ST_W - 2) / 2;  // première rangée de goudron (dérivée, jamais réglée)

/* LA PLACE CENTRALE. Elle a triplé (12×12 → 30×26) et n'est plus un simple
   rectangle dallé : voir townPlazaDeco() dans fermeEngine.js. */
export const TOWN_PLAZA = { x: 78, y: 58, w: 30, h: 26 };
export const TOWN_FOUNTAIN = { x: 92, y: 63 };      // 2x2 fountain, top-left tile (blocks movement)
/* ⚠️ LE MONUMENT EST LE PENDANT SUD DE LA FONTAINE, et il ne sert qu'à ça :
   la rue principale traverse la place en son milieu, donc la fontaine seule
   posait tout le poids visuel au nord et la moitié sud paraissait vide. Deux
   masses symétriques de part et d'autre de la rue font une PLACE ; une seule
   fait un carrefour avec une fontaine dessus. */
export const TOWN_MONUMENT = { x: 92, y: 78 };      // 2x2, obélisque + vasques
/* ⚠️ 425 — LES QUARTIERS. Sans eux, une carte neuf fois plus grande n'est pas
   une ville neuf fois plus riche : c'est la même petite ville posée au milieu
   d'un très grand pré, et c'est EXACTEMENT ce que le premier jet a donné à
   l'écran. Une ville, c'est d'abord des ÎLOTS occupés entre les rues.
   Ces trois-là sont les premiers ; il reste de la place pour la suite, et c'est
   voulu (voir l'en-tête : la parité avec la ferme se construira au fil des
   mises à jour, pas en une session). */
/* ⚠️ AUCUN DE CES TROIS NE DOIT MORDRE SUR UNE RUE NI SUR UNE PARCELLE — le
   banc de rendu le contrôle (« aucun bâtiment ne coupe une rue »), mais rien ne
   contrôle l'inverse. Les hauteurs sont donc calées pour s'arrêter AVANT les
   rangées de maisons du sud (y = 102) : 74 + 26 = 100. */
/* ⚠️⚠️ ZIP 437 — LE PARC RECULE DE HUIT CASES VERS L'EST (108 → 116). Retour de
   Guillaume : « trop collé au centre ». C'était exact au sens propre — la place
   finit en x = 107 (78 + 30 - 1) et le parc commençait en 108 : PAS UNE SEULE
   case entre le dallage de la place et la pelouse du parc, donc deux espaces
   publics qui se touchent et se lisent comme un seul, immense et mou. Huit
   cases de pelouse libre entre les deux suffisent à les séparer, et le parc
   vient alors s'appuyer sur l'avenue x = 150 — un parc bordé d'une rue sur son
   flanc est un parc, un parc collé à une place est une esplanade.
   ⚠️ ET C'EST LA SEULE LIGNE QU'IL A FALLU TOUCHER, ce qui est tout l'intérêt
   des deux constantes suivantes : l'étang et le kiosque sont désormais DÉRIVÉS
   du parc. Avant le 437 ils portaient leurs coordonnées absolues (115,6 / 80,5
   et 122 / 84) — c'est-à-dire le paramètre qui en DOUBLE un autre (§8 de
   CLAUDE.md), et un déménagement du parc aurait laissé son étang et son kiosque
   sur place, dans l'herbe, sans qu'aucune erreur ne le dise. */
export const TOWN_PARK = { x: 116, y: 74, w: 34, h: 26 };     // le parc et son étang
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 435 — L'ÉTANG DU PARC : UN CONTOUR, PAS UNE ÉQUATION.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUI EST REMPLACÉ : `u² + v² ≤ 1`, une ellipse de 11×7. Une ellipse
   est CONVEXE PAR DÉFINITION — elle ne peut former ni crique, ni pointe, ni
   presqu'île, quels que soient ses rayons. Et sa rastérisation sur une grille
   de 16 px lui donnait QUATRE ERGOTS D'UNE SEULE CASE (nord, sud, est, ouest),
   qui la faisaient lire comme un losange. Mesuré au 434 sur le lac du sud, même
   famille de défaut : son rivage est `sin(x)`, donc une FONCTION DE x, donc
   incapable de revenir sur elle-même — 75 colonnes plates sur 95.
   ⚠️ LA PARADE EST DE DÉCRIRE LE RAYON, PAS LA SURFACE : r(θ) module un rayon
   moyen par quatre harmoniques. Une seule (k=1) décentre, deux (k=2) donnent
   un haricot, trois et cinq creusent les criques. C'est non convexe dès que la
   somme des amplitudes dépasse ~0,25, et c'est exactement ce qu'on veut.
   ⚠️ AUCUN TIRAGE ALÉATOIRE ICI, ET C'EST VOLONTAIRE. `generateTownWorld`
   partage UN générateur (graine 0x7041) entre tout ce qu'il pose ; y puiser
   quatre nombres de plus décalerait la suite du flux, donc TOUS les arbres et
   TOUT le mobilier de la ville. Les harmoniques sont donc écrites en clair :
   elles se règlent à l'œil sur `tools/render-eau.mjs`, ce qu'un tirage ne
   permet pas.
   ⚠️ LES BORNES SONT CONTRAINTES : le parc porte une allée en croix (x = 125-126,
   y = 87-88) et une bordure d'arbres sur son pourtour. rx·(1+Σa) doit rester
   sous 7,5 sinon l'étang mord l'allée — `tools/render-eau.mjs` le contrôle. */
/* ⚠️ ZIP 436 — RÉTRÉCI (5,9 × 4,0 → 4,3 × 3,1). Retour de Guillaume : « le lac
   du parc est un peu trop grand, et pas assez réaliste ». Les deux moitiés de
   la phrase ne se corrigent pas au même endroit — le DESSIN est dans fermeArt
   (profondeur continue, nénuphars, rive) — mais la taille compte pour la
   réalité : une mare de parc de quatorze cases de large est un LAC, et l'œil
   attend d'un lac une berge, un horizon et des barques. À neuf cases sur sept,
   on lit une mare, c'est-à-dire ce que le parc est censé contenir.
   ⚠️ ET ÇA LIBÈRE LA PLACE QUI MANQUAIT : à 5,9 le contour venait à une case de
   l'allée en croix, donc les quatre massifs et les deux bancs étaient serrés
   contre l'eau. `tools/render-eau.mjs` les compte. */
/* ⚠️⚠️ ZIP 439 — L'ÉTANG A ÉTÉ REFAIT POUR PORTER LE PONT, ET C'EST UNE FORME
   IMPOSÉE PAR LA GÉOMÉTRIE, PAS UN GOÛT. Demande de Guillaume : le pont en arc
   de sa planche, « fleuri, façon pont japonais de Monet ». Or ce pont est un
   sprite qui s'étend d'EST en OUEST : on le traverse d'est en ouest, donc l'eau
   doit barrer ce passage — c'est-à-dire s'étendre du NORD au SUD. Un étang plus
   large que haut, comme celui du 437 (9 × 6), ne peut pas porter ce pont : ses
   deux têtes tomberaient dans l'eau.
   ⚠️ ET ON NE L'A PAS SIMPLEMENT ÉLARGI, CE QUI AURAIT CONTREDIT LE 437. Sa
   note disait, à raison, qu'« une mare de parc de quatorze cases de large est
   un LAC, et l'œil attend d'un lac une berge, un horizon et des barques ». La
   largeur reste donc celle d'une mare ; c'est la HAUTEUR qui double.
   ⚠️⚠️ ET LA TAILLE EST PINCÉE, ce qui est tout le dessin. Le lobe k=2 est passé
   de 0,13 à 0,34 et sa phase à 3π/2, ce qui vaut exactement `m = 1 − 0,34·cos2θ` :
   le rayon est MINIMUM plein est et plein ouest, MAXIMUM plein nord et plein
   sud. La mare devient une cacahuète verticale — étroite à l'équateur (six
   cases, la portée du pont), longue de douze du nord au sud. C'est la
   composition de Monet : on franchit l'eau à son plus étroit, et elle s'ouvre
   des deux côtés du tablier.
   ⚠️ Un k=2 fort N'EST PAS un ovale allongé : un ovale se pince aux DEUX bouts
   du grand axe, une cacahuète se pince au MILIEU. C'est ce qui donne deux rives
   face à face à cinq cases l'une de l'autre au lieu d'une rive qui s'éloigne. */
export const TOWN_POND = { cx: TOWN_PARK.x + 8.2, cy: TOWN_PARK.y + 6.4, rx: 4.6, ry: 4.6 };
export const TOWN_POND_LOBES = [       // { k: harmonique, a: amplitude, p: phase }
  { k: 1, a: 0.120, p: 0.80 },         // décentre la masse : une rive plus longue que l'autre
  { k: 2, a: 0.340, p: 4.712 },        // LA TAILLE : étroit à l'est et à l'ouest, long nord-sud
  { k: 3, a: 0.070, p: 5.10 },         // les criques
  { k: 5, a: 0.040, p: 1.15 },         // le grain de rive, juste sous la case
];
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 437 — LES MASSIFS FLEURIS : UNE COUCHE, PAS UN SOL, PAS UN DÉCOR.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : un parc « plus fleuri et intéressant ». Trois formes
   étaient possibles, et deux sont des pièges déjà payés par ce projet :
     * un `G_*` de plus (G_TOWN_FLOWERS) rouvrirait les quarante tests
       `ground === G_PATH` / `G_TOWN_LAWN` du moteur — la leçon du 434 sur les
       revêtements, mot pour mot ;
     * un PROP par touffe : le parc en demande deux cents, et chacune serait un
       objet à trier par ancrage à chaque image, pour un dessin qui tient dans
       la case et ne dépasse jamais.
   ⚠️ La bonne forme est donc la troisième, celle de `road` et de `hedge` : un
   tableau parallèle lu à l'index qu'on a déjà, en même temps que le sol. Il ne
   bloque rien (on marche dans un massif : le contraire obligerait à réserver
   des cases solides au milieu d'une pelouse, donc des murs invisibles — le
   défaut que le 425 a payé six cents fois).
   ⚠️ ET IL SE PEINT EN AVANT-DERNIÈRE PASSE, juste avant le revêtement : il ne
   marque que ce qui est ENCORE de la pelouse, donc tout ce qu'une allée, un
   kiosque ou un étang a recouvert entre-temps s'exclut tout seul. Zéro cas
   particulier — c'est l'ordre qui fait le travail, comme pour `road` (434). */
export const BL_NONE = 0;
export const BL_DAISY = 1;      // marguerites et pâquerettes : le tapis blanc, le plus discret
export const BL_TULIP = 2;      // tulipes rouges et roses, en rangs — le massif dessiné
export const BL_LAVENDER = 3;   // lavande et sauge : des épis violets, hauts
export const BL_GOLD = 4;       // forsythia et souci : la tache jaune de l'image de référence
export const BL_WILD = 5;       // la prairie fleurie : semis lâche, pour les bords et la rive du lac
export const BL_KINDS = 5;
/* Largeur de la berge, en cases, autour de TOUTE eau de la ville (couche
   `world.shore`). 2 = une rangée mouillée au ras de l'eau + une rangée sèche.
   ⚠️ C'est la même valeur que `LAKE_SHORE_BAND` du lac du monde sombre (375) —
   pas une coïncidence : c'est la largeur à laquelle l'œil lit une TRANSITION
   plutôt qu'un liseré, et elle a été trouvée là-bas. */
export const TOWN_SHORE_BAND = 2;
/* Profondeur : le plateau (« shelf ») fait 3,5 cases. Au-delà, c'est le large
   et la teinte ne bouge plus.
   ⚠️⚠️ UNE ÉCHELLE ABSOLUE, PAS UNE NORMALISATION PAR LA PLUS GRANDE FLAQUE.
   C'est la leçon du 434 (le seuil d'axe du taxi, faux le jour où l'artère a
   changé de largeur) prise à l'endroit : normalisé sur le maximum de la carte,
   l'étang du parc — 4 cases de rayon contre 12 pour le lac du sud — serait
   resté un haut-fond uniforme, et il aurait CHANGÉ DE COULEUR le jour où l'on
   creuse le lac d'une case. Une berge se lit en mètres, pas en pourcentage. */
/* ⚠️ ZIP 436 — RAMENÉ DE 2,6 À 1,5 CASE, ET C'EST LA CONSÉQUENCE DIRECTE DU
   RÉTRÉCISSEMENT DE L'ÉTANG. Le principe du 435 est conservé (une berge se lit
   en mètres, pas en pourcentage de la plus grande flaque) ; c'est la VALEUR qui
   était calibrée sur une mare de six cases de rayon. À 2,6 cases de plateau, un
   étang de 3,5 cases de rayon n'a plus de large du tout : `render-eau.mjs` l'a
   refusé sur-le-champ — « 26 cases de haut-fond, 0 au large ». On aurait pu
   desserrer le banc ; c'est le seuil du taxi au 434, en pire, parce qu'ici le
   banc avait raison. 1,5 case, c'est 24 px de rampe : de quoi lire un bord sans
   que la mare entière soit un bord.
   ⚠️ Le lac du sud y gagne aussi. Sur `eau-lac-sud.png` du 435, son plateau
   dessinait un ANNEAU PÂLE de deux cases et demie tout autour — un lac qui a
   l'air peint au pochoir. Une berge se voit sur une case. */
export const TOWN_WATER_SHELF = 1.5;
/* ⚠️ 437 — LE PLATEAU RESPIRE LE LONG DE LA RIVE. Sa largeur est multipliée
   par 1 ± TOWN_SHELF_VAR selon un bruit lisse de période TOWN_SHELF_PER : une
   anse s'ensable et fait une plage, un cap plonge. Sans ça, le haut-fond est un
   liseré de largeur constante — le lac cerné d'un halo régulier, peint au
   pochoir. Le POURQUOI complet est dans la passe de profondeur (fermeEngine).
   ⚠️ 0,55 et pas plus : à 0,8 le plateau disparaît par endroits et la rive
   redevient une falaise sous-marine, ce que `render-eau.mjs` compte. */
export const TOWN_SHELF_VAR = 0.55;
export const TOWN_SHELF_PER = 13;   // en cases : la longueur d'une anse, pas celle d'une vague
/* ══════════════════════════════════════════════════════════════════════════
   2026-09-01 — LA HOULE DE L'EAU DE VALLEY TOWN.
   ──────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ RETIRABLE D'UN SEUL GESTE : `TOWN_WATER_SWELL` est le SEUL interrupteur.
   À `false`, `drawTownWaterTile` ne dessine rien de plus qu'avant ce zip — le
   reflet d'arbre et la lame de lumière existants sont inchangés. Décision de
   Guillaume : la houle est encore en réglage (angle, vitesse, intensité), donc
   elle doit pouvoir revenir en arrière sans toucher au corps de la fonction.
   Prototypée et validée à l'écran (artefact) avant ce code, sur une intensité
   « v1 » — la plus discrète des trois proposées.
   ⚠️ Angle UNIQUE pour toute la carte (décision de Guillaume, à ne plus
   rediscuter) : un plan d'eau n'a pas sa propre houle, c'est un seul temps qui
   passe sur toute la ville. La longueur d'onde se dérive de `SPR_T`, pas d'un
   nombre de pixels écrit en dur (§4 : une grandeur de dessin ne se recopie
   pas). */
export const TOWN_WATER_SWELL = true;
export const TOWN_WATER_SWELL_ANGLE_DEG = 35;
export const TOWN_WATER_SWELL_WAVELEN_CASES = 4;
/* Passe 2 : la période et l'amplitude sont dérivées de `d` (la profondeur
   déjà lue par `drawTownWaterTile`) — la rive est rapide, le large est lent,
   et l'amplitude perd un TIERS au large, jamais plus (décision verrouillée).
   ⚠️ Pas de période « passe 1 » uniforme séparée : les deux passes ont été
   validées ensemble sur le prototype, la dérivation par profondeur remplace
   directement la valeur fixe plutôt que de s'y ajouter — une constante que
   plus rien ne lit est une question qu'on s'est posée sans y répondre. */
export const TOWN_WATER_SWELL_PERIOD_NEAR_MS = 3200;
export const TOWN_WATER_SWELL_PERIOD_FAR_MS = 7500;
export const TOWN_WATER_SWELL_AMP_FAR_CUT = 1 / 3;
export const TOWN_ORCHARD = { x: 12, y: 38, w: 18, h: 24 };   // le verger municipal
export const TOWN_MARKET = { x: 38, y: 74, w: 26, h: 26 };    // le champ de foire, dallé et bordé d'arbres
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 431 — LES SIX MÉTIERS DU MARCHÉ.
   ⚠️ LA TABLE VIT ICI ET NULLE PART AILLEURS, et ce n'est pas de la coquetterie
   d'organisation : elle est lue par TROIS endroits qui ne se parlent pas — le
   générateur (fermeEngine, qui distribue les métiers le long des deux rangées),
   le dessin (fermeArt, qui peint la bâche et la marchandise) et le rendu
   (FermeGame, qui choisit le sprite). Le 426 avait un `% 4` recopié dans chacun
   des trois ; passer à six métiers en aurait donc demandé trois corrections, et
   l'oubli d'une seule aurait posé une case SOLIDE sans sprite dessus, c'est-à-
   dire un mur invisible — le défaut que le 425 a payé six cents fois.
   ⚠️ Les couleurs sont ici avec les clés parce que la BÂCHE EST L'ENSEIGNE :
   séparer « ce qu'on vend » de « la couleur du stand » serait exactement le
   paramètre qui en double un autre (§8 de CLAUDE.md). */
export const TOWN_STALL_TRADES = [
  { aw: "#4a9a58", awL: "#6fbe7b", key: "veg" },     // primeur
  { aw: "#3f79c0", awL: "#65a0e2", key: "fish" },    // poissonnier
  { aw: "#c05442", awL: "#e07a63", key: "bread" },   // boulanger
  { aw: "#c05c96", awL: "#e086bb", key: "flower" },  // fleuriste
  { aw: "#c9a13a", awL: "#e8c463", key: "cheese" },  // fromager
  { aw: "#3d9a9a", awL: "#63c0c0", key: "pot" },     // potier
];
/* ═══════════════════════════════════════════════════════════════════════════
   LES QUARTIERS DU ZIP 426 — ce qui remplit l'agrandissement.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ CHACUN RÉPOND À UN VIDE CONSTATÉ, pas à une envie de décor :
     * le CHAMP DE FOIRE était une esplanade nue (le 425 le dit lui-même) : il
       reçoit ses étals et son kiosque à musique — c'est enfin une foire ;
     * l'ÉGLISE n'avait rien autour d'elle : le cimetière lui donne son enclos
       et une raison d'aller à l'ouest ;
     * le SUD ajouté serait un pré : le lac lui donne un bord, une promenade
       et un ponton — c'est-à-dire un but de promenade ;
     * l'EST ajouté serait un pré aussi : les artisans lui donnent une rue.
   ⚠️ AUCUN NE MORD SUR UNE RUE NI SUR UNE PARCELLE — même règle qu'au 425, et
   c'est le générateur qui l'applique (il refuse toute case déjà pavée). */
export const TOWN_CEMETERY = { x: 46, y: 40, w: 14, h: 16 };  // l'enclos de l'église, à l'ouest de son parvis
/* ⚠️⚠️ ZIP 439 — LA HAUTEUR EST PASSÉE DE 12 À 14, ET C'EST UN BOGUE CORRIGÉ,
   PAS UN AGRANDISSEMENT. Le générateur du lac dit en toutes lettres, depuis le
   437, que « le lac touche le bas de la carte » — c'est même la justification
   d'un cas particulier dans ses deux passes de lissage (« hors du rectangle, on
   compte de l'eau au sud »). Il ne le touchait pas : à `y = 154` et `h = 12`,
   l'eau s'arrêtait à la rangée 165 et laissait DEUX RANGÉES D'HERBE entre elle
   et le bord de la carte (`TOWN_MAP_H = 168`).
   Ces deux rangées étaient inaccessibles — cernées d'eau et du bord du monde —
   et le semis d'arbres, qui ne connaît que « est-ce de l'herbe ? », y avait
   planté QUATRE-VINGT-SEPT ARBRES. Vus en jeu, leurs houppiers de 64 px de haut
   couvraient quatre rangées d'eau : une rangée d'arbres qui flottent sur le lac.
   ⚠️ ET AUCUN CONTRÔLE NE POUVAIT LE VOIR, parce que la mesure évidente — « un
   arbre est-il sur une case d'eau ? » — répondait NON, et à juste titre : la
   case était bien de l'herbe. Ce qui manquait n'était pas le test, c'était la
   distinction entre la case d'un décor et la surface qu'il COUVRE. Un banc de
   plus est entré avec ce zip (voir `tools/render-parc.mjs`). */
export const TOWN_LAKE = { x: 56, y: 154, w: 96, h: 14 };     // le lac du sud + sa promenade (voir TOWN_QUAY_H)
export const TOWN_QUAY_H = 2;                                 // rangées de dallage entre l'avenue du sud et l'eau
export const TOWN_PIER = { x: 100, y: 154, w: 4, h: 8 };      // le ponton de bois, plein sud, dans l'axe de l'artère centrale
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 437 — LE RIVAGE DU LAC DU SUD. UN CHAMP, PAS UNE LIGNE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QUI EST REMPLACÉ, ET LE 435 LE DÉSIGNAIT DÉJÀ NOMMÉMENT : `shore(x)`,
   deux sinus, donc une FONCTION DE x. Une fonction de x ne peut pas revenir sur
   elle-même : pas de crique qui se referme, pas de presqu'île, pas d'îlot, et
   surtout une pente de rive qui ne dépasse jamais un demi-quart de case par
   colonne — c'est-à-dire un trait tiré à la règle qu'on aurait légèrement
   cintré. Le 435 a corrigé l'étang du parc et a laissé le lac ; Guillaume l'a
   vu tout de suite (« le rebord est toujours totalement droit »).
   ⚠️ LA PARADE EST DE PASSER À UN CHAMP SIGNÉ s(x,y) : la rive est l'isoligne
   s = 0 d'un champ qui dépend AUSSI de y. Dès que la pente du bruit en y
   dépasse 1, l'isoligne se replie — et c'est de là que viennent les criques
   fermées, les langues de terre et les îlots. Même famille que les harmoniques
   de `TOWN_POND` (435), mais en géométrie ouverte : un lac n'a pas de centre
   autour duquel tourner un rayon.
   ⚠️ AUCUN TIRAGE ALÉATOIRE, POUR LA RAISON DU 435 : `generateTownWorld`
   partage un seul générateur, y puiser un nombre déplacerait tout le mobilier
   posé après le lac. Le bruit est un HACHAGE de coordonnées entières, pur et
   identique chez les deux joueurs. */
export const TOWN_LAKE_EDGE = 4.6;      // recul moyen de la rive sous le bord nord du rectangle, en cases
/* ⚠️ LES PÉRIODES SONT COURTES DEVANT LA LONGUEUR DU LAC, ET C'EST MESURÉ.
   Premier jet : 57 et 134 cases pour un lac qui en fait 96 — une seule grande
   courbure, donc une rive qui ne change pas d'avis sur vingt cases d'affilée.
   `render-eau.mjs` le compte désormais (la plus longue suite de colonnes dont
   la rive est à la même rangée) : 24 colonnes au premier jet, contre 8 après. */
export const TOWN_LAKE_BAYS = [         // les baies : { p: période en cases, a: amplitude, ph: phase }
  { p: 43, a: 1.7, ph: 0.7 },           // les grandes anses
  { p: 19, a: 1.0, ph: 2.1 },           // et leurs redents
];
export const TOWN_LAKE_NOISE = [        // le bruit de valeur, trois octaves : { p: période, a: amplitude }
  { p: 9, a: 2.9 },                     // les criques et les pointes
  { p: 4.2, a: 1.5 },                   // les redents de crique
  { p: 2.3, a: 0.65 },                   // le grain de rive, juste au-dessus de la case
];
/* ⚠️⚠️ LA PROMENADE DE PIERRE NE COURT PLUS SUR TOUTE LA LONGUEUR, ET C'EST LE
   FOND DE LA REMARQUE DE GUILLAUME. Un quai maçonné EST droit — c'est un
   ouvrage, il a été construit à la règle, et c'est même ce qui le fait lire
   comme un quai. Ce qui ne va pas, c'est que la ville en avait posé quatre-
   vingt-seize cases : à ce compte, le lac entier devient un bassin de jardin
   public et il n'a plus une seule berge naturelle. On garde donc la pierre
   AUTOUR DU PONTON — là où la ville touche l'eau, là où l'on descend de
   l'avenue centrale — et on rend les deux ailes à la nature : sentier de terre
   qui serpente, blocs erratiques, roselières, saules.
   L'emprise est DÉRIVÉE du ponton (jamais deux descriptions du même milieu :
   §8), et le raccord se fait sur `TOWN_QUAY_FADE` cases pour qu'un quai ne
   s'arrête pas net dans un roseau. */
export const TOWN_QUAY_HALF = 21;       // demi-longueur de l'esplanade, de part et d'autre de l'axe du ponton
export const TOWN_QUAY_FADE = 7;        // longueur du raccord entre la rive maçonnée et la rive naturelle
export const TOWN_QUAY_EDGE = 4.2;      // recul de la rive DEVANT le quai : droite, parce qu'un quai est droit
/* Le sentier de la rive sauvage. ⚠️ IL NE SUIT PAS L'EAU, ET C'EST TOUT LE
   POINT : une allée tracée à distance constante du rivage EST le rivage,
   redessiné une case plus haut — on aurait remplacé une ligne droite par une
   seconde ligne parallèle. Il ondule pour son compte, tantôt au ras de l'eau,
   tantôt à quatre cases, et ce qui reste entre lui et le lac est de la berge. */
export const TOWN_TRAIL_MARGIN = 1;     // il ne s'approche jamais plus près que ça de l'eau
/* ⚠️ DES PÉRIODES LONGUES : 29 et 13 cases. À 9, le sentier changeait de rangée
   tous les quatre pas et se lisait comme un escalier — le contraire d'un chemin.
   Ce qui doit onduler vite, c'est la RIVE ; le chemin, lui, est tracé par des
   gens qui vont quelque part. */
export const TOWN_TRAIL_WAVE = [{ p: 29, a: 1.8, ph: 1.9 }, { p: 13, a: 0.7, ph: 4.4 }];
/* ═══════════════════════════════════════════════════════════════════════════
   2026-08-31 — CE N'EST PLUS UN LAC, C'EST UN FLEUVE, ET IL SORT DE LA CARTE
   PAR L'EST.
   ───────────────────────────────────────────────────────────────────────────
   Décision de Guillaume : *« il faut imaginer que le lac actuel sera une sorte
   de fleuve qui mène à une sortie ; par la droite. ensable un peu. »* C'est ce
   qui fait de Valley Town un PORT et non une ville au bord d'un étang : le
   navire d'Eduardo doit pouvoir s'en aller quelque part, sinon la promesse des
   îles n'a aucun support dans la carte et la fin de la quête est une réplique.

   ⚠️⚠️ CE N'EST PAS UNE SECONDE NAPPE D'EAU, C'EST LE MÊME CHAMP PROLONGÉ, et
   c'est la leçon écrite en tête du bloc du lac dans `fermeEngine.js` : *il n'y a
   qu'UNE seule description du rivage*. Deux nappes raccordées bout à bout se
   décaleraient d'une case au premier réglage — et la couture tomberait très
   exactement là où le navire passe, c'est-à-dire au seul endroit que le joueur
   regarde à ce moment-là.

   ⚠️ LA PASSE N'A PAS DEUX MÔLES, ET C'EST LA CARTE QUI L'INTERDIT : le fleuve
   longe le bord SUD du monde (`TOWN_MAP_H`), il n'a donc qu'une seule rive
   dessinable. Lui donner une rive sud laisserait entre l'eau et le bord une
   bande de terre inatteignable — le défaut exact que le 439 a payé (quatre-
   vingt-sept arbres plantés sur deux rangées cernées d'eau). Le goulet se fait
   donc par la rive NORD qui descend, et l'ensablement par une LANGUE DE TERRE
   qui avance dans le chenal.
   ⚠️ Le haut-fond, lui, est GRATUIT : la profondeur de l'eau est une transformée
   de distance à la terre (`TOWN_WATER_SHELF`), donc un chenal étroit se peint
   tout seul en eau claire. On ne peint pas un banc de sable, on le CREUSE.
   ═══════════════════════════════════════════════════════════════════════════ */
export const TOWN_RIVER_X = TOWN_LAKE.x + TOWN_LAKE.w;   // 152 : là où le bassin de la ville cesse
export const TOWN_RIVER_RUN = 24;        // longueur du raccord bassin → fleuve, en cases
export const TOWN_RIVER_EDGE = 8.4;      // recul de la rive nord en aval, en cases sous TOWN_LAKE.y
/* ⚠️ UN FLEUVE A DES BERGES PLUS CALMES QU'UN LAC, et il le FAUT ici : le bruit
   du rivage vaut ±5 cases, ce qui refermerait purement et simplement un chenal
   de cinq rangées. On l'amortit en aval au lieu de rétrécir ses octaves — les
   mêmes trois octaves, moins fort, gardent le grain sans la houle. */
export const TOWN_RIVER_CALM = 0.62;     // part du bruit de rive retirée en aval
/* LA PASSE. ⚠️ ELLE EST LOIN DE L'ESPLANADE (x 123) EXPRÈS : on y va à pied par
   le sentier de rive, et c'est ce trajet qui fait exister le fleuve autrement
   que comme un décor de fond. */
export const TOWN_RIVER_NECK_X = 166;    // le milieu du goulet
export const TOWN_RIVER_NECK_HALF = 11;  // sa demi-longueur (raccord cubique aux deux bouts)
export const TOWN_RIVER_NECK_PINCH = 2.2; // de combien la rive nord descend ENCORE dans le goulet
/* ⚠️⚠️ LE CHENAL NE SE FERME JAMAIS, ET C'EST UN INVARIANT, PAS UN RÉGLAGE. Le
   bruit de rive suffirait à le boucher sur une colonne ou deux ; une seule
   colonne sèche et le fleuve n'est plus un fleuve, c'est deux flaques. On borne
   donc l'isoligne pour qu'il reste toujours au moins ces rangées d'eau —
   `verify-vallee` le balaie colonne par colonne. */
export const TOWN_RIVER_MIN = 3;         // rangées d'eau minimum, du goulet au bord de la carte

/* ═══════════════════════════════════════════════════════════════════════════
   2026-08-31 — ON MONTE DANS LE BATEAU. LES NOMBRES DE LA NAVIGATION.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : *« eduardo peut utiliser le navire. mais nous aussi en
   montant dedans : soigner les sprites. anatomiquement cohérentes dans un
   bateau, mouvements cohérents. »*

   ⚠️⚠️ « MOUVEMENTS COHÉRENTS » EST UNE CONTRAINTE DE MÉCANIQUE, PAS DE DESSIN,
   ET C'EST LA MOITIÉ DIFFICILE. Un bateau qui se déplace comme un fermier — huit
   directions, vitesse instantanée, arrêt net — est un fermier avec une coque
   peinte autour, quel que soit le soin du sprite. Trois règles suffisent à le
   rendre marin, et elles sont ici parce que `boatStep` (pur, dans `fermeEngine`)
   et son banc les lisent toutes les deux :
     1. **il ne se déplace jamais de côté** : la commande donne un CAP voulu, la
        coque tourne vers lui à `BOAT_TURN`, et la poussée se fait le long de son
        propre axe ;
     2. **il a de l'erre** : il accélère, et il continue quand on lâche ;
     3. **il peut culer**, doucement. Sans marche arrière, une étrave posée sur
        une berge dans un chenal de quatre rangées est un joueur coincé pour de
        bon — un défaut de jouabilité, pas une exigence de réalisme.

   ⚠️⚠️ LA COQUE DE COLLISION N'EST PAS LA COQUE DESSINÉE, et c'est le §4 de
   `CLAUDE.md` pris à la lettre (*une grandeur de dessin, une grandeur de
   collision : deux choses, deux paramètres*). Le navire PEINT fait neuf cases de
   long ; le faire manœuvrer dans un chenal qui en fait quatre de large le
   rendrait immobile. On teste quatre points — étrave, étambot, deux travers —
   autour d'une coque de collision volontairement plus courte que le dessin.
   ═══════════════════════════════════════════════════════════════════════════ */
export const BOAT_SPEED = 4.6;       // tuiles/seconde en vitesse de croisière (la marche vaut 5,2)
export const BOAT_ASTERN = 1.4;      // ...et en marche arrière : on cule, on ne recule pas vite
export const BOAT_ACCEL = 2.4;       // tuiles/seconde² — il faut deux secondes pour prendre son erre
export const BOAT_DRAG = 1.1;        // décélération commande lâchée : il continue, il ne s'arrête pas
export const BOAT_TURN = 2.0;        // radians/seconde
/* ⚠️ ON PERD SON ERRE EN TOUCHANT LA BERGE, ON NE S'ARRÊTE PAS NET. Un véhicule
   qui garde sa vitesse contre un mur la restitue dès qu'on se dégage, et ça se
   lit comme un ressort ; un véhicule qui tombe à zéro se lit comme un bug. */
export const BOAT_BUMP = 0.30;       // part de vitesse conservée quand la coque touche
export const BOAT_LEN = 0.85;        // demi-longueur de la coque de COLLISION, en cases
export const BOAT_BEAM = 0.38;       // demi-largeur de la coque de COLLISION
/* ⚠️ ON EMBARQUE ET ON DÉBARQUE À LA MÊME PORTÉE QUE LE CHEVAL : deux distances
   pour le même geste divergeraient, et le joueur ne saurait pas laquelle il a
   dans les doigts. */
export const BOAT_BOARD_RANGE = MOUNT_RANGE;
export const BOAT_SEATS = 2;         // le pilote, et un passager — comme la monture
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 440 — LE BOIS DU SUD-EST, ET LE SENTIER QUI S'Y PERD.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « le chemin à l'est de la jetée s'arrête sur rien du
   tout. Il devrait se poursuivre (serpentant toujours élégamment) jusqu'à aller
   plus loin au coin bas droit de la map », puis, sur la question de la fin :
   « le sentier entre dans le bois et s'y perd, mais fais ça de manière
   élégante. dans le narratif c'est pas une zone très fréquentée. ça doit être
   un peu sauvage ».

   ⚠️⚠️ IL S'ARRÊTAIT SUR RIEN PARCE QU'IL S'ARRÊTAIT SUR UNE BORNE DE BOUCLE.
   Le sentier de rive est tracé `for (x = x0; x < x1; x++)` avec x1 = bord EST
   du rectangle `TOWN_LAKE`, soit 152 : à cette colonne, le lac finit, la boucle
   finit, et le gravier finit — en pleine prairie, à soixante-douze colonnes du
   bord de la carte. Ce n'est pas un oubli de dessin, c'est une frontière de
   DONNÉE qui s'est vue à l'écran. Le lac n'a aucune raison de dire où s'arrête
   un chemin.

   ⚠️⚠️ ET « LE BOIS » N'EXISTAIT PAS. Mesuré avant d'écrire une ligne : le coin
   sud-est portait 6 à 11 % d'arbres, c'est-à-dire le rideau de bord et le semis
   général, la même densité que le reste de la ceinture. Faire « s'arrêter le
   chemin là où la densité devient trop grande » n'avait donc aucun endroit où
   se produire : on aurait posé une fin arbitraire en la racontant comme une
   lisière. Le bois est CREUSÉ, comme l'anse du 439 et le goulet du pont — pour
   la même raison de fond : on ne cherche pas dans une carte la forme qu'on veut
   y trouver, on l'y met.

   ⚠️ LA LISIÈRE EST UNE ISOLIGNE, PAS UNE COLONNE. C'est la leçon du 437 (la
   rive du lac) appliquée à une forêt : une lisière écrite `x > 180` est un mur
   d'arbres tiré à la règle. On prend la profondeur signée d'un champ, donc des
   avancées de futaie, des clairières fermées et des bosquets détachés — que
   deux sinus en x ne peuvent pas produire.
   ⚠️ ET LA DENSITÉ MONTE, ELLE NE BASCULE PAS. Ce qui fait une lisière n'est
   pas une frontière, c'est un GRADIENT : quelques arbres isolés, puis un
   taillis, puis la futaie. C'est ce gradient, et lui seul, qui rend lisible
   « le chemin s'arrête avant que ça devienne trop dense ». */
export const TOWN_WOOD = { x: 156, y: 152, w: 68, h: 16 };  // l'emprise où le bois a le droit de pousser
/* Le fond du champ : la profondeur croît vers le SUD-EST, donc vers le coin de
   la carte. Les deux pentes sont en cases de profondeur par case parcourue. */
/* ⚠️⚠️ LES DEUX PENTES ET L'ORIGINE ONT ÉTÉ REPRISES ENSEMBLE LE 2026-08-31,
   PARCE QUE LE FLEUVE A PRIS UN TIERS DU SOL DE CE BOIS. Elles se règlent
   ENSEMBLE ou pas du tout : la pente sud décide où le cœur tombe, la pente est
   décide sa largeur, et l'origine décide s'il est noyé. Prises une par une,
   chacune casse l'une des quatre mesures de `render-parc` — c'est la forme 458
   (deux grandeurs qui s'opposent), appliquée à un champ de densité.
   ⚠️ Le triplet vient d'un BALAYAGE, pas d'un réglage à l'œil : 0,19 / 1,00 /
   157 est le seul point qui tienne les quatre à la fois — futaie 66 cases,
   bois entier 307, cœur 50 %, et **zéro clairière enfermée** (`verify-vallee`).
   Les voisins immédiats en cassent toujours un : à 0,21 la futaie referme une
   clairière de dix-sept cases où personne ne peut plus entrer, à 0,17 elle
   tombe sous les 60 cases de « vraie surface ». */
export const TOWN_WOOD_SLOPE_X = 0.19;
export const TOWN_WOOD_SLOPE_Y = 1.00;
/* ⚠️⚠️ L'ORIGINE EST REMONTÉE DE 160 À 155 LE 2026-08-31, ET C'EST UNE
   CONSÉQUENCE DU FLEUVE, PAS UN GOÛT. La profondeur de ce champ croît vers le
   SUD-EST : son cœur tombait donc très exactement dans le coin que le fleuve
   occupe désormais, et `render-parc` l'a chiffré au premier essai — **13 % de
   couvert au « cœur » du bois contre 34 % exigés**, c'est-à-dire une futaie
   noyée. Remonter l'origine de TROIS rangées replace le cœur sur la terre qui
   reste, entre l'avenue du sud et la berge, sans toucher ni au rectangle, ni à
   la pente, ni au bruit, ni à la densité — la lisière garde donc sa forme.
   ⚠️ Le chiffre est celui d'un balayage, pas d'un réglage à l'œil : à 155 et à
   156 la futaie devenue trop épaisse ENFERMAIT une clairière de seize cases où
   personne ne pouvait plus entrer (`verify-vallee`, « la ville tient dans une
   seule poche praticable »). Il se règle avec les deux pentes, voir plus bas.
   ⚠️ *Un champ de densité calé sur un coin de carte est calé sur ce qu'il y
   avait dans ce coin ce jour-là.* */
export const TOWN_WOOD_ORIGIN = { x: 190, y: 157 };   // le point où la profondeur du champ vaut zéro
/* ⚠️ TROIS OCTAVES, COMME LA RIVE : la grande respiration de la lisière, les
   avancées de futaie, et le grain qui décide arbre par arbre. Sans le troisième,
   la lisière est nette au pixel près et se lit comme un bord de texture. */
export const TOWN_WOOD_NOISE = [
  { p: 21, a: 2.2 },                    // les golfes de prairie et les caps de futaie
  { p: 9, a: 1.1 },                     // les bosquets détachés
  { p: 3.5, a: 0.6 },                   // le grain : c'est lui qui empêche la lisière d'être un trait
];
/* ⚠️ CES DEUX NOMBRES SE LISENT ENSEMBLE, ET CONTRE LE FOND. La prairie porte
   déjà 6 à 9 % d'arbres épars (le semis de ceinture) : une futaie qui monte
   lentement vers 44 % ne se DÉTACHE qu'au bout de sept cases, c'est-à-dire que
   sa lisière se confond avec le semis sur toute sa largeur — mesuré au banc,
   9 % à la lisière contre 10 % au taillis. Une lisière qui ne se voit pas ne
   peut pas expliquer pourquoi un chemin s'arrête. La rampe est donc plus
   COURTE (le taillis est franc dès trois cases) et le cœur plus dense. */
export const TOWN_WOOD_DEPTH = 5;       // profondeur (en cases de champ) où la futaie est pleine
export const TOWN_WOOD_DENSITY = 0.50;  // part d'arbres au cœur de la futaie
/* ⚠️ LE SENTIER NE RÉTRÉCIT PAS, IL SE TROUE. C'est la parade au piège payé
   quatre fois au 437 (« une allée d'une case de large ne montre que ses
   marches ») : un chemin qui s'efface en passant de deux cases à une redevient
   un escalier de gravier au moment précis où on veut qu'il devienne discret. Un
   sentier abandonné, lui, ne devient pas plus étroit — il devient LACUNAIRE :
   des plaques de gravier de moins en moins fréquentes, séparées par de l'herbe,
   jusqu'à plus rien. On garde donc les deux cases de large jusqu'au bout et on
   fait tomber la PROBABILITÉ de poser la plaque. */
export const TOWN_TRAIL_EAST_WAVE = [{ p: 37, a: 2.6, ph: 0.9 }, { p: 17, a: 1.1, ph: 3.3 }];
/* ⚠️⚠️ LA PENTE EST PASSÉE DE 0,18 À 0,10 LE 2026-08-31, ET C'EST LE FLEUVE QUI
   L'IMPOSE. À 0,18 le chemin descendait de huit rangées entre le bassin et le
   coin de carte : quand il n'y avait rien en bas, il finissait dans le vide et
   c'était sans conséquence ; maintenant il finit DANS L'EAU vers x ≈ 180.
   ⚠️ Le premier correctif l'a fait suivre la berge case par case, et c'était
   pire : la rive descend de six rangées en vingt colonnes, donc le chemin
   redevenait **l'escalier de gravier payé quatre fois au 437** — le contraire
   exact de ce que la note de `TOWN_TRAIL_WAVE` demande. *Un chemin est tracé par
   des gens qui vont quelque part ; c'est la RIVE qui ondule, pas eux.*
   La forme juste est donc celle-ci : le sentier garde sa ligne (cette pente,
   plus son ondulation propre), et la berge n'est qu'un PLANCHER qu'il ne
   franchit jamais. Deux grandeurs, deux rôles. */
export const TOWN_TRAIL_EAST_DIVE = 0.10;   // cases de descente vers le sud par case vers l'est
export const TOWN_TRAIL_FADE_FROM = 0.9;    // profondeur de bois où le sentier commence à se trouer
export const TOWN_TRAIL_FADE_TO = 4.2;      // ...et où il a définitivement disparu
export const TOWN_KIOSK = { x: TOWN_PARK.x + 14, y: TOWN_PARK.y + 10 };  // kiosque à musique du parc (3×3, case nord-ouest) — DÉRIVÉ du parc depuis le 437
export const TOWN_ARTISANS = { x: 190, y: 36, w: 32, h: 96 }; // le quartier de l'est, le long de l'artère x=196
/* Le CŒUR URBAIN : au-dedans, on ne sème PAS d'arbres au hasard. C'est la
   correction la plus efficace du deuxième jet — des arbres épars entre les rues
   faisaient lire toute la ville comme une clairière. Les arbres du centre sont
   désormais PLANTÉS : alignements, parc, verger, parterres de la place. */
export const TOWN_CORE = { x: 8, y: 22, w: 208, h: 132 };
export const TOWN_HOUSE_W = 6;                      // house sprite is 96px = 6 tiles wide
export const TOWN_HOUSE_H = 3;                      // blocked footprint rows (the visual roof overlaps north of it)

/* ═══════════════════════════════════════════════════════════════════════════
   LE RELIEF (425) — LA HAUTE-VILLE, LES ESCALIERS, ET LE SAUT.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « des sections avec des escaliers réalistes, des
   mécaniques de climb up and jump off ».

   ⚠️ IL N'Y A PAS DE COORDONNÉE Z, ET IL NE FAUT PAS EN INTRODUIRE UNE. Le
   joueur n'a que x/y — c'est ce qui voyage dans le réseau (pubMe), ce que
   lisent les collisions, ce que dessinent les autres clients. Ajouter une
   troisième coordonnée obligerait à la diffuser, à la réconcilier, et à la
   gérer dans chaque chemin qui manipule une position : un coût énorme pour
   une carte sur quatre.

   ⚠️ L'ALTITUDE EST DONC UNE PROPRIÉTÉ DE LA CASE, PAS DU PERSONNAGE. Un
   tableau `elev` parallèle au sol donne la hauteur de chaque case ; celle d'un
   personnage se LIT sous ses pieds. Trois conséquences, et les trois sont des
   cadeaux :
     1. les joueurs distants sont à la bonne hauteur sans qu'on diffuse quoi
        que ce soit — leur x/y suffit ;
     2. rien à sauvegarder, rien à synchroniser, rien à désynchroniser ;
     3. un ancien client qui n'aurait pas ce zip verrait les autres au bon
        endroit sur la carte, simplement à plat.

   ⚠️ LES VALEURS SONT FRACTIONNAIRES, ET C'EST CE QUI FAIT L'ESCALIER. Une
   marche d'escalier vaut 0,25 ; un rebord de terrasse vaut 1,0 d'un coup. La
   règle de déplacement est alors la MÊME dans les deux cas — « on ne franchit
   pas plus de TOWN_STEP_MAX d'un pas » — et il n'y a aucun cas particulier à
   écrire : l'escalier passe parce qu'il monte doucement, la falaise bloque
   parce qu'elle monte d'un coup. Un booléen « c'est un escalier » aurait
   demandé de connaître le SENS de chaque marche.

   ⚠️ ET LE PERSONNAGE MONTE VISUELLEMENT PENDANT QU'IL GRAVIT, sans une ligne
   d'animation : son décalage à l'écran vaut `elev × TOWN_ELEV_PX`, lu case par
   case. C'est la même valeur qui décide s'il peut passer et où il se dessine —
   donc elles ne peuvent pas diverger (§7 de CLAUDE.md). */
/* ⚠️ 30 px, ET LE PREMIER RÉGLAGE À 14 ÉTAIT FAUX — vu au banc de rendu, pas à
   la lecture. Quatorze pixels sur une tuile de seize, c'est la hauteur d'une
   BORDURE DE TROTTOIR : la terrasse ne se lisait pas comme un étage, les
   escaliers avaient l'air de dalles grises posées dans l'herbe, et le mur de
   soutènement passait pour un trait. À 30 px (presque deux tuiles), le parement
   a la place d'exister et la Haute-Ville est enfin EN HAUT.
   ⚠️ Ce nombre ne change RIEN à ce qui est franchissable : la marche et le saut
   ne lisent que `elev`, jamais des pixels. C'est un réglage purement optique,
   et c'est exactement pour ça qu'on peut le pousser sans rien re-tester. */
/* ⚠️⚠️⚠️ ZIP 447 — 30 → 48, ET C'EST LA CORRECTION LA PLUS RENTABLE DU ZIP.
   Guillaume, devant l'escalier : « tout est condensé et comme plaqué en 2D ».
   Le chiffre lui donne raison sans appel : à 30 px l'unité, une marche montait
   de 4,5 px pour une case large de 16, et un étage entier — la Haute-Ville —
   ne s'élevait que de 30 px, soit moins de deux cases. Rien ne pouvait se lire
   comme étant AU-DESSUS de quoi que ce soit : la terrasse, le palier et le sol
   n'étaient séparés que par l'épaisseur d'un trait.
   À 48, un étage vaut TROIS CASES et une marche monte de 9,6 px pour 16 px de
   giron — le rapport contremarche/giron d'un vrai escalier (0,6), et celui que
   la planche de Guillaume dessine. Le parement de falaise, qui se calcule en
   `dénivelé × TOWN_ELEV_PX`, grandit dans le même mouvement : le mur de
   soutènement passe de 30 à 48 px et redevient un mur.
   ⚠️ RIEN À RE-TESTER, ET LA NOTE CI-DESSUS LE DISAIT DÉJÀ : ce paramètre est
   PUREMENT OPTIQUE. La marche, l'A* piéton, l'A* du taxi et les collisions ne
   lisent que `elev`, jamais des pixels — `TOWN_STEP_MAX` est en unités
   d'altitude et ne bouge pas. Les 34 bancs ont été relancés après coup. */
export const TOWN_ELEV_PX = 48;      // décalage vertical à l'écran, par unité d'altitude
export const TOWN_STEP_MAX = 0.34;   // dénivelé franchissable EN MARCHANT (une marche vaut 0,25)
/* Le SAUT depuis un rebord (Espace). Il ne sert qu'à DESCENDRE : on grimpe par
   les marches, on redescend où l'on veut. C'est le contrat de tous les jeux qui
   ont ce couple, et il tient à une raison de lisibilité — un saut qui monterait
   rendrait les escaliers facultatifs, donc décoratifs. */
export const TOWN_JUMP_MS = 380;     // durée du saut
export const TOWN_JUMP_TILES = 1.9;  // distance franchie, en cases (assez pour dégager le pied du rebord)
export const TOWN_JUMP_ARC_PX = 16;  // hauteur de la cloche, en px écran
export const TOWN_JUMP_MIN_DROP = 0.5; // dénivelé minimal devant soi pour que le saut soit proposé

/* LA HAUTE-VILLE : la terrasse du nord-est, à une unité d'altitude. Elle porte
   le tribunal, deux parcelles de maisons et le belvédère. */
export const TOWN_UPPER = { x: 120, y: 8, w: 66, h: 22 };
/* LE BELVÉDÈRE : un second palier, à deux unités, dans l'angle de la
   Haute-Ville. ⚠️ Deux niveaux et pas trois : au-delà, le décalage vertical
   cumulé (2 × 14 px) commence à faire flotter les personnages au-dessus de
   leur propre ombre, et un troisième palier n'ajouterait aucune lecture. */
export const TOWN_BELVEDERE = { x: 164, y: 10, w: 16, h: 11 };

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 444 — LA GÉOGRAPHIE DE LA QUÊTE DE L'ÉTOILE.

   ⚠️⚠️ ELLE EST ICI, ET PAS DANS `quete.js`, POUR SUPPRIMER UNE ARÊTE
   D'IMPORT. Le 442 faisait importer `enquete.js` par `fermeEngine.js` pour
   atteindre ses ancres — ça marchait (pas de cycle : l'enquête n'importait que
   les constantes), et c'était quand même une dépendance de plus entre le moteur
   et une histoire. Ici, `fermeEngine`, `quete.js`, `FermeGame` et les trois
   bancs lisent tous `fermeConstants`, qu'ils importaient déjà : **zéro arête
   nouvelle, et une seule description de chaque position.**

   ⚠️⚠️ TOUT EST DÉRIVÉ D'UN LIEU EXISTANT, RIEN N'EST UNE COORDONNÉE. C'est la
   leçon la plus chèrement payée du dépôt (§8 de `CLAUDE.md`) : le parc a reculé
   de huit cases au 437, le bois a été creusé au 440, l'allée du cimetière
   penchait depuis le 425. Une position écrite ici aurait déjà menti deux fois.
   Le jour où le champ de foire bouge, le cratère bouge avec lui.
   ⚠️ Ce sont des NOMBRES et pas des fonctions : tout ce dont ils dépendent est
   défini plus haut dans ce fichier, donc l'évaluation au chargement est sûre —
   et un nombre se lit dans un banc sans avoir à l'appeler. */

/* LE CRATÈRE, dans le pré nu (décision de Guillaume au 444). ⚠️ IL RÉPOND À UNE
   QUESTION OUVERTE DE `CLAUDE.md` §13 depuis trois zips — « la prairie :
   qu'est-ce qu'on construit là ».

   ⚠️⚠️ SA PLACE A ÉTÉ MESURÉE, PAS CHOISIE, ET LE PREMIER JET ÉTAIT FAUX. Ancré
   « à l'est du champ de foire » (`TOWN_MARKET.x + w + 14`), il tombait en
   (78,82) — c'est-à-dire **au milieu de la PLACE**, sous l'obélisque. Ça ne
   levait rien, le générateur en était parfaitement content, et ça aurait donné
   un cratère météoritique dans le square municipal. On a balayé la carte à la
   recherche des disques réellement ouverts hors de toute zone nommée, puis
   noté trois grandeurs pour chaque candidat : le rayon dégagé, la distance à la
   première rue, et l'existence d'un chemin depuis la gare (vrai `townFindPath`).
   ⚠️ **LA DISTANCE À LA RUE EST LA GRANDEUR QUI COMPTE, ET ELLE A DEUX BORNES.**
   Trop près, ce n'est plus un pré, c'est un trou dans un trottoir ; trop loin,
   personne ne tombe dessus par hasard et la deuxième étape devient une chasse
   au décor. Huit cases : on le voit depuis la chaussée, on ne le traverse pas
   en allant ailleurs.

   Il est donc DÉRIVÉ DU PARC et pas du champ de foire, ce qui est meilleur pour
   une raison qu'on n'avait pas cherchée : il tombe **sur le chemin naturel de la
   ville vers le lac**, donc sur le trajet de l'étape 2 vers l'étape 3. On passe
   devant en allant plonger. */
export const STAR_CRATER_X = TOWN_PARK.x + 12;
export const STAR_CRATER_Y = TOWN_PARK.y + TOWN_PARK.h + 17;
/* ⚠️⚠️ DEUX RAYONS, DEUX SENS, DEUX NOMS — ET C'EST LA LEÇON DU 441 APPLIQUÉE
   AVANT D'ÊTRE PAYÉE. Le dos d'âne des ponts a coûté un zip entier parce qu'UN
   nombre portait DEUX sens (il montait le dessin ET reculait le rang) : « une
   grandeur de DESSIN, une grandeur de RANG, une grandeur de COLLISION : trois
   choses, trois paramètres ». Ici : `STAR_CRATER_DRAW_R` est ce que le rendu
   PEINT, `STAR_CRATER_R` (dans `quete.js`) est l'anneau où il faut se tenir
   pour que l'étoile sorte. Ils sont proches et ils ne sont pas la même chose ;
   le jour où l'on agrandira le dessin, le jeu ne bougera pas d'un pouce. */
/* ⚠️⚠️⚠️ ZIP 458 — 4,5 → 7,0, SUR DEMANDE DE GUILLAUME (« augmente la taille du
   gros cratère sur valley town »), ET LE NOMBRE N'EST PAS CHOISI À L'ŒIL. Le
   cratère se place par balayage en spirale sur le premier DISQUE entièrement
   libre (`starCraterPos`) : plus il est large, plus la place est rare, et un
   rayon trop ambitieux ne le rend pas « plus gros », il le DÉPLACE — voire le
   fait disparaître (`starSpiralFree` rend `null` au-delà de vingt cases). Le
   balayage a donc été rejoué sur la vraie carte, rayon par rayon :
       4,5 → 5,0 → 6,0 → 7,0  : (128,117), **l'ancre exacte, écart 0**
       8,0 → 8,5              : (127,118), il commence à glisser
       9,0 et au-delà         : AUCUNE PLACE — le cratère n'existe plus
   7,0 est donc le dernier rayon qui garde la position d'origine : × 1,56 de
   large, × 2,4 de surface, et pas un pixel de déplacement. *Un décor qu'on
   agrandit se mesure contre la place qu'il exige, jamais contre le goût.* */
export const STAR_CRATER_DRAW_R = 7.0;
/* ⚠️⚠️ ET UN TROISIÈME AU 446, POUR LES FISSURES SEULES — LA SEULE CHOSE DU JEU
   QUI DÉBORDE DE SON EMPRISE GARANTIE, ET C'EST NOMMÉ PLUTÔT QUE SUBI. Le modèle
   fourni par Guillaume montre de longues fissures qui courent dans l'herbe bien
   au-delà de la terre projetée : elles font la moitié de la lecture (« c'est
   TOMBÉ » plutôt que « on a creusé »). Les raccourcir pour tenir dans le disque
   libre aurait été raccourcir le dessin pour arranger le générateur.
   ⚠️ La dérogation ne vaut QUE parce qu'une fissure est un trait d'un à trois
   pixels dans un DÉCAL DE SOL peint avant tout le reste : elle passe SOUS
   l'arbre ou le banc qu'elle croise, ne cache rien, ne bloque rien. Une MASSE
   qui déborderait serait le défaut du 440 (« la case d'un décor n'est pas la
   surface qu'il couvre ») ; `render-etoile` mesure les deux rayons séparément
   pour que personne ne confonde les deux cas. */
/* ⚠️ ZIP 458 — DÉRIVÉ, PLUS RÉGLÉ. Il valait 7,6 pour un trou de 4,5, soit
   ×1,69 : le jour où le trou grandit, un nombre écrit à la main aurait laissé les
   fissures MOINS loin que la terre projetée, c'est-à-dire l'inverse de ce qu'elles
   racontent. C'est le §8 de `CLAUDE.md` au mot près — « un paramètre qui double un
   autre est une divergence en attente, il doit être DÉRIVÉ ». */
export const STAR_CRATER_CRACK_R = Math.round(STAR_CRATER_DRAW_R * 1.69 * 10) / 10;
/* ⚠️⚠️ LA PROFONDEUR, EN PIXELS D'IMAGE, ET ELLE N'EST QUE ÇA (446, demande de
   Guillaume : « quand on se déplace à l'intérieur, prévoir un déplacement qui
   suggère une profondeur ; pas plat »). C'est un DÉCALAGE DE DESSIN appliqué au
   sprite de qui se tient dans le trou — jamais une altitude de case, jamais une
   collision. `TOWN_ELEV_PX` aurait été le réflexe : il aurait fait du cratère
   une falaise que `canStandTown` refuse de franchir (`TOWN_STEP_MAX`), donc un
   trou où l'on ne peut pas entrer. C'est très exactement l'arc du pont ajouté à
   `playerElevTown` que le 439 a évité de justesse. */
/* ⚠️ ZIP 458 — LA PROFONDEUR SUIT LA LARGEUR. Un trou 1,56 fois plus large avec
   la même profondeur n'est pas un cratère plus grand, c'est une ASSIETTE : la
   pente s'aplatit d'autant, et c'est justement la pente qui porte la glissade
   demandée. 11 × (7,0 / 4,5) ≈ 17. */
export const STAR_CRATER_SINK_PX = 17;     // au fond du trou
export const STAR_CRATER_LIP_PX = 4;       // sur le bourrelet, on monte
export const STAR_DUST_MS = 900;           // zip 458 — ce que dure une bouffée de poussière
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LE SILLON DÉMÉNAGE, ET IL DEVIENT UN VRAI IMPACT.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : « fais attention à la trainée qui
   tombe dans la ferme. il faudrait qu'elle tombe ailleurs sur la map et que
   l'impact ait une vraie physique, un peu comme le cratère sur valley town. »
   Deux corrections dans une, et elles n'ont rien à voir l'une avec l'autre :
   ⚠️ 1. L'ENDROIT. Il tombait à `WELL − 4`, c'est-à-dire **dans le carré que les
   joueurs labourent depuis le premier jour** : une comète qui s'écrase pile au
   milieu des potagers, à quatre cases du puits, se lit comme un décor posé là
   pour être commode. Il part au NORD, très au-dessus de la cour de ferme (la
   passe de dégagement du générateur va de `HOUSE.y−4` à `HOUSE.y+19` : on est
   dehors), dans la bande vide que le 363 décrivait déjà comme « un champ vide au
   nord de la carte » (voir `VOYAGER_ANCHOR`). Il tombe donc **où il n'y a
   personne**, ce qui est la seule chose que l'histoire demande — et ce qui rend
   la marche jusqu'à lui un vrai déplacement au lieu d'un pas de côté.
   ⚠️ 2. LA PHYSIQUE. Ce n'était pas un impact, c'était une TEXTURE : une bande
   de terre de 96×34 posée à plat, sans relief, sans bourrelet, sans fissures, et
   surtout **sans enfoncement** — on marchait dessus comme sur de l'herbe. Il est
   maintenant décrit comme le cratère : une hauteur le long du rayon, une pente,
   un éclairage, un bourrelet, des fissures qui débordent, et `starFurrowSink`
   pour qu'on y descende. La différence avec le cratère reste la FORME (une
   balafre allongée d'est en ouest contre un trou rond), pas la nature.
   ⚠️ COMME LA BORNE D'ORIGINE DU 442, IL NE BLOQUE TOUJOURS PAS : une case qui
   change de sens sur une carte que les joueurs labourent depuis des mois est un
   piège, et un sillon qu'on traverse ne casse rien puisqu'on ne fait que s'y
   agenouiller. L'enfoncement est une grandeur de DESSIN, jamais d'altitude
   (leçon du 439/441, tenue au cratère depuis le 446). */
export const STAR_FURROW_X = HOUSE.x - 6;
export const STAR_FURROW_Y = HOUSE.y - 17;
export const STAR_FURROW_LEN = 7;              // cases de terre retournée, d'est en ouest
export const STAR_FURROW_W = 3.6;              // cases de large au plus creux (la cuvette d'arrêt)
/* ⚠️ TROIS GRANDEURS, TROIS NOMS — la règle du 441, la même qu'au cratère.
   `DRAW` est ce qu'on peint, `CRACK` jusqu'où courent les fissures (elles
   débordent, et c'est nommé plutôt que subi), `SINK`/`LIP` ce que le fermier
   descend et remonte. Aucune n'entre dans la collision. */
export const STAR_FURROW_CRACK_R = 6.4;        // cases, autour de la cuvette d'arrêt
export const STAR_FURROW_SINK_PX = 8;          // au fond de la balafre
export const STAR_FURROW_LIP_PX = 3;           // sur le bourrelet, on monte
/* La cuvette d'arrêt est à l'OUEST : une course qui laboure creuse de plus en
   plus jusqu'à se poser. C'est ce qui a dicté le sens de la chute au 448
   (`starFallAngle`), et les deux se lisent ensemble. */
export const STAR_FURROW_BOWL_DX = -2.2;       // cases à l'ouest de l'ancre : le point le plus creux
/* 462 — la chasse traverse désormais toute la ferme : les deux derniers
   impacts sont à l'est de la rivière. Le placement refuse les cultures, sols
   labourés et constructions vivantes ; seuls arbres et rochers naturels peuvent
   occuper le disque, car l'impact les détruit réellement. */
export const STAR_FARM_IMPACT_ANCHORS = [
  { x: STATION.x + 12, y: STATION.y - 10 },
  { x: HOUSE.x + 27,  y: HOUSE.y - 14 },
  { x: WELL.x - 15,   y: WELL.y + 10 },
  { x: 146,            y: 30 },
  { x: 150,            y: MAP_H - 24 },
  /* 480 bis — trois ancres de plus (demande de Guillaume : 5 → 8 chutes,
     "toujours à des endroits bien dispersés"), dans les trois quadrants encore
     libres — `starSpiralFree` cherche de toute façon la case libre la plus
     proche, ces points ne sont que des points de départ dispersés. */
  { x: 100,            y: 20 },
  { x: 60,             y: MAP_H - 20 },
  { x: 130,            y: 70 },
];
export const STAR_FARM_CRATER_DRAW_SCALE = 0.38;
/* 480 bis — LE FACTEUR PAR IMPACT EST NOMMÉ, ET IL EST DE LA MÊME LONGUEUR QUE
   `STAR_FARM_IMPACT_ANCHORS`/`Q.STAR_FARM_IMPACTS` : un tableau anonyme indexé
   par `site.impact` sans garde de borne est le défaut n°1 du dépôt (une
   fonction absente ne lève une erreur qu'à l'exécution) — ici c'était pire,
   silencieux : un impact au-delà de la longueur du tableau rendait `sc`
   NaN, donc un cratère qui ne se dessine jamais, sans la moindre exception. */
export const STAR_FARM_CRATER_DRAW_SCALES = [0.92, 1.05, 1, 0.96, 1.08, 1.00, 0.94, 1.06];
export const STAR_FARM_CRATER_FREE_R = 3;
/* LE PONTON. On ne pose rien : il existe depuis le 434. On note juste où se
   tient celui qui éclaire, pour que le jeu et le banc désignent la même case. */
export const STAR_PIER_X = TOWN_PIER.x + (TOWN_PIER.w >> 1);
export const STAR_PIER_Y = TOWN_PIER.y + TOWN_PIER.h - 1;
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 450 — LA CALE DU NAVIRE. (demande de Guillaume : « construire un bateau
   ║ magique avec les étoiles […] prendre le large et amarrer sur des îles ».)
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ IL EST DÉRIVÉ DU PONTON, ET C'EST LA MÊME DISCIPLINE QUE LE CRATÈRE DÉRIVÉ
   DU PARC (444) : aucune coordonnée en dur, donc le jour où le lac recule le
   chantier recule avec lui. `starShipPos` (FermeGame) part d'ici et balaie en
   spirale jusqu'à une cale qui tienne — libre, praticable, ET AU BORD DE L'EAU.
   ⚠️⚠️ « AU BORD DE L'EAU » EST UNE CONDITION DE PLACEMENT ET PAS UN GOÛT : un
   navire posé au milieu d'un pré est un décor absurde, et la spirale l'y aurait
   mis sans broncher (la rive du 435 est ONDULÉE, ses baies remontent de plusieurs
   cases). Le balayage exige donc de l'eau à portée — c'est ce qui fait qu'on le
   lit comme un chantier naval et non comme une épave.
   ⚠️ À L'OUEST DU PONTON, PAS À L'EST : le ponton est dans l'axe de l'artère
   centrale, donc on arrive du NORD. Posé à l'ouest, le navire est de trois quarts
   dans le champ quand on descend vers l'eau, et il ne masque jamais le ponton —
   qui est, lui, le lieu du chapitre 3. */
export const STAR_SHIP_X = TOWN_PIER.x - 11;
export const STAR_SHIP_Y = TOWN_PIER.y + 2;
/* ⚠️⚠️ TROIS GRANDEURS, TROIS NOMS — LA LEÇON DU 441 (« une grandeur de DESSIN,
   une grandeur de RANG, une grandeur de COLLISION : trois choses, trois
   paramètres »), appliquée AVANT d'être payée, exactement comme au cratère.
   `STAR_SHIP_DRAW_W/H` sont ce que le rendu PEINT (en cases) ; `STAR_SHIP_BLOCK_*`
   est l'emprise qui BLOQUE le pas. Les confondre aurait donné soit une coque
   qu'on traverse, soit un mur invisible large comme le dessin — le défaut du 440
   dans les deux sens. (⚠️ Il y en avait TROIS jusqu'au 453 ; la troisième était
   débranchée depuis sa naissance, voir sa note plus bas.)
   ⚠️ L'EMPRISE BLOQUANTE EST PLUS PETITE QUE LE DESSIN, et c'est le bon sens :
   la voile et le mât montent, ils ne barrent rien au sol ; seule la coque est un
   obstacle. Un joueur doit pouvoir passer DERRIÈRE le navire pour aller au
   ponton. */
/* ⚠️⚠️ L'ORDRE CANONIQUE DES CINQ MORCEAUX, ET IL EST ICI PARCE QUE TROIS
   FICHIERS LE LISENT : `quete.js` y accroche ses cinq trouvailles, `fermeArt.js`
   y prend l'indice de la pièce qu'il peint, `FermeGame.js` et le banc s'en
   servent pour nommer. Écrit dans `quete.js`, il aurait obligé `fermeArt` à
   importer la quête — c'est-à-dire à monter toute une histoire pour peindre un
   bateau, et à faire dépendre un banc de RENDU d'un banc de LOGIQUE.
   ⚠️ C'est le §8 dans sa forme la plus simple : une liste, trois lecteurs, aucune
   copie. Le jour où un sixième morceau s'ajoute, il s'ajoute ICI et les trois
   suivent — ou aucun ne suit, et le banc le dit. */
export const STAR_SHIP_ORDER = ["hull", "rudder", "mast", "sail", "bell"];
export const STAR_SHIP_DRAW_W = 9;      // cases peintes en largeur (coque + beaupré)
export const STAR_SHIP_DRAW_H = 7;      // cases peintes en hauteur (jusqu'au haut du mât)
/* ⚠️⚠️⚠️ 2026-09-01 — LE RECTANGLE D'INTERACTION S'ARRÊTAIT AU RAS DE L'ANCRE,
   PAS AU BOUT DE LA PASSERELLE. `STAR_SHIP_DRAW_H` mesure la boîte peinte
   depuis `shipY` vers le NORD (la coque, le mât) ; la passerelle qui mène à
   l'eau, elle, PEND au SUD de `shipY` — c'est la moitié du dessin qu'aucune
   des deux grandeurs de dessin n'a jamais mesurée, parce que rien avant ce
   zip n'avait besoin de savoir où elle finissait. Guillaume, debout sur la
   planche, à l'endroit précis où on l'y fait marcher pour monter une pièce :
   « je clique et rien ne se passe ». Mesuré à l'écran (`__dbgShip`, séance du
   2026-09-01) : le rectangle d'interaction refusait déjà à 0,2 case au sud de
   l'ancre, alors que la planche reste visuellement praticable jusqu'à environ
   deux cases plus loin, jusqu'à son bout recourbé au-dessus de l'eau. C'est la
   dix-septième forme de l'en-tête de `CLAUDE.md` : *un banc — ou un rectangle
   de portée — mesure qu'un geste est refusé, jamais OÙ.*
   ⚠️ ELLE NE S'AJOUTE QU'AU SUD (voir son seul usage, `FermeGame.js`) : les
   trois autres côtés du rectangle sont déjà justes, et les élargir n'aurait
   fait qu'accepter des joueurs qui ne voient même pas le navire. */
export const STAR_SHIP_INTERACT_S_PAD = 2;
export const STAR_SHIP_BLOCK_W = 6;     // la COQUE, et elle seule, arrête le pas
/* ⚠️⚠️ UNE SEULE RANGÉE BLOQUE, ET C'EST UN CHOIX DE JEU VU À L'ÉCRAN. La coque
   est peinte sur trois rangées ; en bloquer deux la faisait déborder de la grève
   sur la promenade du lac, c'est-à-dire couper un chemin. Une rangée suffit à ce
   qu'on ne traverse pas un bateau, et le reste du dessin passe DEVANT les
   promeneurs sans les arrêter — « la case d'un décor n'est pas la surface qu'il
   couvre » (§15 bis), appliquée dans le sens où elle rend service. */
export const STAR_SHIP_BLOCK_H = 1;
/* ⚠️⚠️ LA DISTANCE MAXIMALE À L'EAU, ET ELLE EXISTE PARCE QUE L'ÉCRAN A CORRIGÉ LE
   BANC. « De l'eau quelque part au sud » laissait le navire sur l'herbe haute, six
   cases et un muret au-dessus du lac : trois contrôles verts, et un bateau garé
   dans un pré. La grandeur juste est la DISTANCE, et elle est ici pour que le
   générateur et le banc lisent le même nombre. */
export const STAR_SHIP_WATER_MAX = 3;
/* ⚠️⚠️⚠️ ZIP 453 — `STAR_SHIP_NEAR_R` EST SUPPRIMÉE, ET LE 452 AVAIT EU TORT DE
   LA GARDER. Elle valait 5,0 et **aucun code de jeu ne la lisait** : seul
   `render-navire.mjs` la citait, dans un contrôle qui ne pouvait donc mesurer
   que lui-même. Son commentaire annonçait un « E : regarder le navire » qui
   n'existe pas — le navire se lit à l'œil, c'est tout son intérêt (451).
   ⚠️ Le 452 l'a gardée « en réserve, pour le jour où l'on posera une plaque ».
   C'est exactement ce que le §4 de `CLAUDE.md` interdit depuis le 448 : *une
   constante que SEUL le banc lit est débranchée — elle a l'air juste et elle ne
   peut pas échouer.* Une réserve n'est pas un état du code, c'est une idée ; les
   idées vivent dans `QUETE.md`, où celle-ci est écrite (§12.2). Le jour où la
   plaque existera, la portée se posera AVEC elle, et elle aura un lecteur dès sa
   première ligne. */
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LES TROIS PORTES DE LA QUÊTE, ET ELLES SONT TOUTES DES GENS.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME, MOT POUR MOT : « LA ferme doit avoir déjà débloqué
   au moins eduardo et tristan (actif) ainsi qu'au moins 4 artisans sur la ferme.
   ce patch est logique : eduardo prend le bateau à la fin de la quête et tristan
   y travaille. »
   ⚠️ C'EST LA PREMIÈRE FOIS QUE LA CHUTE A UNE CONDITION QUI N'EST PAS UNE DATE,
   et elle répare une incohérence qui traînait depuis le 450 : la fin de la quête
   fait partir Eduardo avec le navire (453) et toute la construction passe par le
   bûcheron — deux personnages dont RIEN ne garantissait la présence. Une quête
   qui se termine par « et untel prend le large » sur une ferme où untel n'a
   jamais mis les pieds est un texte qui ment, catégorie la plus chère du dépôt.
   ⚠️⚠️ ET ELLES SE COMPTENT AVEC CE QUI EXISTE DÉJÀ : `E.residentActiveSkill`
   (skill présent ET pas en ITT, chantier Tristan/Jérôme) et
   `E.countSkilledResidents` (la porte d'apparition de Carla depuis le 376). Zéro
   nouvelle façon de compter un résident — c'est-à-dire zéro seconde liste qui
   pourrait dire autre chose que la première (§8 de `CLAUDE.md`).
   ⚠️ LE CHIFFRE EST LE MÊME QUE CELUI DE CARLA (`CARLA_MIN_ARTISANS = 4`) et il
   n'est PAS écrit deux fois : quatre artisans, c'est le moment où la ferme cesse
   d'être un champ de patates — pour elle comme pour une étoile. */
export const STAR_GATE_SKILLS = ["voyager", "lumberjack"];   // Eduardo, Tristan — actifs tous les deux
export const STAR_GATE_ARTISANS = CARLA_MIN_ARTISANS;        // dérivé, jamais recopié

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 455 — L'ANNONCE, LE TAMPON, ET LES PNJ QUI S'EN INQUIÈTENT.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « le lancement de la mission doit être annoncé, pas
   automatique, la comète ne doit pas arriver comme ça. […] l'hôte doit cliquer
   sur un overlay "démarrer l'enquête la belle étoile ?" oui / plus tard […] Et
   rien ne doit se passer immédiatement […] la nuit qui suit, l'événement pourra
   survenir enfin. »
   ⚠️⚠️⚠️ ET ÇA N'INVERSE **PAS** LE THÈME DU SECRET (§3 de `QUETE.md`), PARCE
   QU'ON A SÉPARÉ DEUX CHOSES QUI N'EN FAISAIENT QU'UNE : **la PIERRE est
   publique, l'ÉTOILE reste secrète**. Des astronomes annoncent une pluie
   d'astéroïdes, la vallée entière est nerveuse, tout le monde voit tomber le
   caillou — et personne, jamais, ne saura ce qu'il y avait dedans. Le contraste
   RENFORCE le secret au lieu de le démolir : `STAR_HIDE_R` garde tout son sens,
   et le familier-guide du 449 (« un habitant qui renseignerait le joueur
   démolirait la meilleure page du chantier ») reste juste au mot près — les PNJ
   parlent de l'astéroïde, jamais du chemin à suivre.
   ⚠️ LE PLANCHER EXISTE PARCE QUE « LA NUIT QUI SUIT » EST AMBIGU. Accepter à
   16 h 55 fait commencer la nuit trente secondes plus tard : le tampon existerait
   dans le code et pas à l'écran. Le plancher garantit qu'il existe TOUJOURS.
   ⚠️ ET LA NUIT DOIT AVOIR **COMMENCÉ** APRÈS L'ANNONCE (voir `starFallDue`) :
   accepter à 20 h ne fait pas tomber la comète dans les minutes qui suivent, mais
   la nuit d'après. Sans ce test, un « oui » cliqué de nuit donnait très exactement
   ce que cette demande refuse — la comète qui arrive comme ça. */
export const STAR_WARN_FLOOR_MS = 5 * 60 * 1000;   // 5 min réelles minimum entre l'annonce et la chute

/* ── LES PNJ NERVEUX. ⚠️⚠️ TOUT EST DÉRIVÉ, RIEN NE CIRCULE. « Ce PNJ est-il
   nerveux » est une fonction de son `rid` seul ; « où en est son tic » une
   fonction du temps écoulé depuis l'annonce, que les deux clients LISENT dans
   l'état partagé. Deux écrans voient donc les mêmes PNJ s'agiter, sans un octet
   de plus — la discipline de `TJ_REACT_TALK_EVERY` (368) et des oiseaux (433).
   ⚠️ « TOUS NE DOIVENT PAS EN PARLER » (Guillaume) : la part est ici, en dur, et
   c'est le seul endroit qui la dit. */
export const STAR_NERVE_SHARE = 0.45;         // ~un PNJ sur deux montre quelque chose
export const STAR_NERVE_PERIOD_MS = 11000;    // un tic par PNJ toutes les onze secondes, décalées
export const STAR_NERVE_TIC_MS = 2600;        // ce que dure un tic (balancement ou tour sur soi)
export const STAR_NERVE_SPIN_EVERY = 3;       // un tic sur trois est un tour sur soi-même, les autres balancent
export const STAR_NERVE_TALK_R = 3.4;         // en cases : à cette distance, il vous dit ce qu'il a entendu
/* ⚠️ ZIP 456 — `STAR_NERVE_TALK_MS` A ÉTÉ SUPPRIMÉE ICI. Elle bornait la fenêtre
   pendant laquelle un PNJ nerveux disait sa phrase ; depuis que le PNJ S'ARRÊTE et
   se tourne vers le joueur, la phrase reste affichée tant qu'on est à portée et
   il n'y a plus de fenêtre à borner. Une constante que plus personne ne lit est le
   pendant exact d'une chaîne que personne n'affiche (453) : on la supprime, on ne
   la garde pas « en réserve » — c'est la faute que le 452 a commise et que le 453
   a payée. */
/* ⚠️ LE « ! » DE L'IMPACT DURE DEUX SECONDES, ET C'EST LE CHIFFRE DE GUILLAUME
   (« Tous les pnj doivent avoir un "!" en bulle au dessus de leurs têtes pendant
   2 secondes à partir du moment de l'impact »). Il est ici parce que la scène le
   lit ET que le banc le mesure : écrit dans la boucle de rendu, il aurait été un
   nombre que personne ne peut croiser avec `STAR_FALL_IMPACT_MS`. */
export const STAR_BANG_MS = 2000;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — L'INGÉNIEUR NAVAL, ET POURQUOI IL COÛTE SI CHER.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « un nouveau pnj ingénieur devra être contacté via
   une demande à la mairie ; sur conseil (guidé) de la première étoile récoltée
   dans le cratère, et cet ingénieur arrivera sur place rapidement contre forte
   rémunération (or, crops et poissons). […] Quand l'ingénieur aura travaillé sur
   les plans de construction (pendant 15 minutes réelles), il nous les rendra. »
   ⚠️ TROIS MONNAIES, ET C'EST VOULU : l'or seul, c'est un prix ; l'or + la
   récolte + la pêche, c'est **la ferme entière qui paie**. C'est aussi la seule
   dépense du jeu qui touche à trois réserves à la fois, donc la seule qui se
   sente vraiment — et elle tombe au bon moment, puisqu'elle demande une ferme
   déjà installée (voir les portes ci-dessus).
   ⚠️⚠️⚠️ AUDIT 2026-08-31 — 15 MIN → 5, ET 3 MIN DE VOYAGE → 1. LA JUSTIFICATION
   DU CHIFFRE ÉTAIT MORTE DEPUIS LE DÉCHANT, ET ELLE ÉTAIT ÉCRITE ICI.
   Ce bloc disait, mot pour mot : « c'est le temps pendant lequel on retourne
   jouer (les deux croisements d'ombres du chapitre 2 tiennent très exactement
   dans cette fenêtre) ». Le 469 a SUPPRIMÉ les croisements d'ombres. La fenêtre
   est restée, son contenu est parti, et le commentaire a continué de promettre
   pendant douze zips qu'on avait autre chose à faire.
   ⚠️⚠️ CE QUE L'AUDIT A MESURÉ, ET C'EST CE QUI AUTORISE À TOUCHER CES NOMBRES
   SANS AVOIR REJOUÉ (la règle du voyage en train, 431, protège d'un réglage posé
   AU JUGÉ — ici il y a une mesure) : sur ~42 min d'horloge imposée par le chemin
   critique, **33,8 ne proposaient aucun geste de quête, et 31 tombaient après le
   cratère**, dans le chapitre `build` qui n'a aucun `need`. Ces deux constantes en
   portaient 18 à elles seules.
   ⚠️ ON COUPE AU LIEU DE MEUBLER, ET C'EST UN CHOIX. Meubler demandait d'écrire
   une occupation ; couper demande deux nombres. Le §17 garde en réserve de quoi
   remplir (les trois chutes différées, les éclats autour du trou) : le jour où
   elles existeront, ces deux nombres pourront remonter — c'est leur contenu qui
   les justifiera, jamais l'inverse.
   ⚠️ POUR REVENIR EN ARRIÈRE : remettre 3 et 15. Rien d'autre ne dépend de ces
   valeurs — `starPlanPhase`, `starPlanRemainMs` et `starPlanProgress` les DÉRIVENT
   toutes les trois d'une seule date posée par l'hôte (`plan.at`). */
export const STAR_ENG_TRAVEL_MS = 1 * 60 * 1000;    // il monte dans le premier train
export const STAR_ENG_WORK_MS = 5 * 60 * 1000;      // les plans — 15 min à l'origine, voir ci-dessus
export const STAR_ENG_FEE_GOLD = 24000;             // sur la bourse commune
export const STAR_ENG_FEE_CROPS = 60;               // récoltes, toutes espèces confondues, dans MON sac
export const STAR_ENG_FEE_FISH = 12;                // poissons, toutes espèces confondues, dans MON sac
/* Où il s'installe : à trois cases à l'est de la cale, sur la grève. ⚠️ DÉRIVÉ
   DE `shipX/shipY` AU RENDU et pas écrit en dur ici — la cale est posée par un
   balayage du générateur (450), une coordonnée recopiée mentirait au premier
   déplacement de la rive. Seul l'ÉCART est une constante. */
export const STAR_ENG_DX = 4, STAR_ENG_DY = 1;
/* ⚠️ « À CÔTÉ DU LAC » A UN RAYON, ET IL EST GÉNÉREUX EXPRÈS. Demande de
   Guillaume : « si on ouvre le plan à côté du lac, on verra effectivement le
   fantôme virtuel du bateau ». Trop serré, le joueur ouvre le plan à trois pas de
   la cale, voit une feuille de papier, et conclut que le fantôme n'existe pas —
   « le jeu propose et refuse » (426) sur la seule chose que ce zip ajoute à
   l'écran. Douze cases : on est encore sur la grève, et on voit la cale. */
export const STAR_PLAN_LAKE_R = 12;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 454 — LE BOIS DE TRISTAN. CINQ COMMANDES, DANS L'ORDRE DU BATEAU.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ DEMANDE DE GUILLAUME : « On devra ensuite demander à tristan de travailler
   le bois, lui passer des commandes (nouvelles étapes) pour qu'il nous aide à
   construire le bateau "La belle étoile" […] tristan devra produire étape par
   étape les planches et pièces nécessaires pour assurer l'avancement de la
   construction. Le rôle des étoiles est de nous guider dans le projet. »
   ⚠️⚠️ LA TABLE EST INDEXÉE PAR `STAR_SHIP_ORDER`, ET C'EST TOUT LE POINT. Une
   sixième liste de morceaux aurait été la faute du 452 refaite à l'identique (un
   compteur ajouté ne recompte pas les phrases déjà écrites) : ici, une pièce de
   bois EST un morceau du navire, désigné par la même clé, peint par le même
   dessin, compté par le même `starShipParts`. `verify-quete` refuse toute clé qui
   n'est pas dans `STAR_SHIP_ORDER` et toute clé de `STAR_SHIP_ORDER` absente.
   ⚠️ DEUX MORCEAUX NE SONT PAS EN BOIS, ET ILS ONT QUAND MÊME UNE PIÈCE : la
   voile est de la toile, la cloche est de bronze — mais une voile sans VERGUE ne
   se hisse pas et une cloche sans CHAISE ne se monte pas. Le bûcheron a donc
   quelque chose à faire pour les cinq, sans qu'on ait eu à lui inventer un
   métier de tisserand ou de fondeur.
   ⚠️⚠️ L'ORDRE EST UNE RÈGLE DE JEU, PAS UN AFFICHAGE : on ne borde pas une coque
   avant d'avoir la quille. Chaque pièce exige la PRÉCÉDENTE livrée — et, comme le
   morceau d'étoile correspondant arrive dans exactement le même ordre (coque au
   chapitre 1, safran au 3, mât et voile au 4, cloche au 5), la chaîne ne peut pas
   se bloquer. Vérifié par le banc plutôt que par la confiance. */
/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ ZIP 478 — CHAQUE BERCEAU DEMANDE UNE CHOSE DE PLUS QUE DU BOIS, ET JAMAIS
   ║ PLUS D'UNE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ L'AUDIT 477 A MESURÉ LE VRAI DÉFAUT DU CHANTIER : **une seule dépense
   branchée sur l'économie en 56 minutes**. La ferme a des carrières, des lignes de
   pêche, des brebis, des poules — et le navire ne leur demandait rien. Un chantier
   qui n'a besoin de rien de ce qu'on produit n'est pas un chantier, c'est une
   horloge.
   ⚠️⚠️ LA RÈGLE DURE EST « TROIS LIGNES PAR BERCEAU, JAMAIS QUATRE » : le bois, la
   chose en plus, et rien d'autre. C'est ce qui sépare ce chantier du lot du Community
   Center qui réclame un poisson de légende — la longueur d'une liste est ce qui la
   transforme en corvée, et elle doit être bornée par le CODE, pas par une intention.
   ⚠️ LE MÂT N'A DÉLIBÉRÉMENT RIEN EN PLUS. Un mât, c'est un arbre : lui inventer un
   ingrédient aurait été de la symétrie, et la symétrie apprend au joueur que la
   liste est décorative. Quatre sources différentes sur cinq pièces, et une pièce
   qui n'est que du bois : c'est ce qui fait que les cinq ne se ressemblent pas.
   ⚠️ ET LA VOILE DEMANDE DE LA LAINE, C'EST-À-DIRE UNE **BREBIS** — la constellation
   que la quête doit finir par dessiner porte ce nom depuis le 465. Ce n'est pas une
   coïncidence qu'on exploite, c'est une rime qu'on ne paie pas.
   `extra` : `{ kind:"stone"|"fish"|"product", idx?:<index C.ANIMALS>, n }`.
   `kind:"fish"` ne nomme AUCUNE espèce (toutes comptent) : le chantier a besoin
   d'huile, pas d'un poisson précis, et exiger une espèce rendrait la ligne
   dépendante d'un tirage. */
export const STAR_TIMBER = {
  hull:   { wood: 140, ms: 8 * 60 * 1000, extra: { kind: "stone", n: 40 } },              // le bordé — 40 pierre : le lest
  rudder: { wood:  45, ms: 3 * 60 * 1000, extra: { kind: "fish", n: 8 } },                // le safran — 8 poissons : l'huile de la barre
  mast:   { wood: 110, ms: 6 * 60 * 1000 },                                               // le mât — rien de plus : c'est un arbre
  sail:   { wood:  60, ms: 4 * 60 * 1000, extra: { kind: "product", idx: 2, n: 24 } },     // la vergue — 24 laine : la toile
  bell:   { wood:  40, ms: 3 * 60 * 1000, extra: { kind: "product", idx: 0, n: 16 } },     // la chaise de cloche — 16 œufs : la colle et le vernis
};
/* Le nom du bateau. ⚠️ IL NE SE TRADUIT PAS (consigne de Guillaume, mot pour
   mot : « nom français pas à traduire ») : un bateau porte son nom peint sur son
   tableau arrière, dans la langue de qui l'a baptisé. C'est la même règle que
   « Valley Town », qui n'est pas « La ville de la vallée » en français. */
export const STAR_SHIP_NAME = "La Belle Étoile";
/* ⚠️ ZIP 459 — CE QUE DURE SON « JE M'Y METS ». Six secondes : le temps de
   traverser la ferme pour aller le voir si l'on n'était pas à côté, pas assez pour
   qu'une phrase reste plantée au-dessus de quelqu'un qui travaille. Ensuite, c'est
   la bulle à la scie qui prend le relais et qui, elle, dure toute la commande. */
export const STAR_TIMBER_GO_MS = 6000;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 2026-09-01 — LE RUBAN DE JALON : COMBIEN DE TEMPS IL RESTE À L'ÉCRAN.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CETTE CONSTANTE EST LA SEULE SOURCE DE SA DURÉE. Elle ferme le ruban
   (`setTimeout`) ET elle alimente `animation-duration` en style inline : la
   feuille de style ne fixe que la COURBE. C'est la leçon du 476, prise
   d'avance — l'overlay de fouille avait sa durée écrite aux deux endroits, et
   deux nombres qui décrivent le même instant finissent par se contredire.
   ⚠️ 5,2 s, comme `STAR_FIND_MS` : ce sont deux accusés de réception du même
   ordre (« tu viens de gagner quelque chose »), et deux tempos différents pour
   le même geste se remarquent tout de suite. Le ruban en passe 0,7 à sortir du
   bandeau et 0,8 à y retourner ; il reste donc ~3,7 s lisible, ce qui est le
   temps de lire deux lignes courtes sans avoir à s'arrêter de marcher.
   ⚠️ IL NE MET RIEN EN FILE : deux morceaux posés coup sur coup (le menu dev le
   fait) remplacent le ruban courant au lieu de s'empiler. Un accusé de
   réception en retard est un mensonge sur ce qui vient de se passer. */
export const STAR_RIBBON_MS = 5200;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ 2026-09-01 — LA VITESSE À LAQUELLE L'ÉTOILE PARLE, EN SIGNES PAR SECONDE.
   ╚═════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ CE N'EST PAS UN EFFET, C'EST UN AIGUILLAGE DU REGARD. Sa bulle apparaît
   au-dessus d'une compagne de dix-huit pixels, au milieu d'un décor chargé, et
   une phrase qui s'affiche d'un bloc ne se distingue pas du décor : le joueur ne
   sait pas qu'elle vient d'arriver. Un texte qui S'ÉCRIT est la seule chose de
   l'écran qui bouge sans avoir été provoquée — on le remarque sans le chercher.
   ⚠️ 48 SIGNES/SECONDE : la bulle fait 64 px de large en police 6 px, soit ~17
   signes par ligne et trois lignes au plus — donc une seconde au maximum pour la
   phrase la plus longue, sur les 5,2 s qu'elle reste affichée. Plus lent, on
   attendrait après elle ; plus rapide, l'écriture ne se verrait plus.
   ⚠️ ET LA BOÎTE EST DESSINÉE À SA TAILLE FINALE DÈS LA PREMIÈRE IMAGE (voir
   `drawSpeechBubble`) : une bulle qui grandit avec son texte tressaute à chaque
   signe et change de hauteur à chaque retour à la ligne — c'est-à-dire qu'elle
   remplace un défaut de lisibilité par un défaut de stabilité. */
export const STAR_BUBBLE_CPS = 48;

/* LA VERRERIE, dans le quartier des artisans, et L'ARBRE DE LA PIE au-dessus.
   ⚠️ LE NID SE DÉDUIT DU FOUR, PAS D'UNE SECONDE ANCRE, et l'histoire l'exige :
   la pie a laissé tomber un éclat dans le sable de l'atelier, c'est comme ça
   qu'il a fondu dans une perle. Deux ancres finiraient par s'éloigner l'une de
   l'autre, et il faudrait deux coïncidences là où il n'en faut aucune. */
export const STAR_GLASS_ANCHOR_X = TOWN_ARTISANS.x + 7;
export const STAR_GLASS_ANCHOR_Y = TOWN_ARTISANS.y + 32;
export const STAR_NEST_DX = 3, STAR_NEST_DY = -5;

/* LES ESCALIERS. `dir` donne le sens de la MONTÉE : "n" = on monte vers le
   nord (la volée est parcourue du sud au nord). La longueur de la volée
   (`len`) découle du dénivelé : quatre marches pour une unité, ce qui donne
   les 0,25 de TOWN_STEP_MAX. */
/* ⚠️⚠️⚠️ ZIP 447 — LA VOLÉE MONUMENTALE EST DEVENUE UN QUART TOURNANT, ET ELLE
   N'A DEMANDÉ AUCUN MÉCANISME NEUF. C'est le point de la chose : la planche de
   Guillaume montre un escalier à palier, et le réflexe aurait été d'inventer un
   descripteur « corner » avec un sens de virage — c'est-à-dire un second de
   quelque chose, payé en cas particuliers dans les vingt endroits qui lisent
   `TOWN_STAIRS` (§4 : « un second de quelque chose se paie en NIVEAUX, pas en
   zones »).
   Or un quart tournant EST déjà exprimable : ce sont DEUX volées droites qui ne
   partent pas de la même altitude, séparées par un PALIER plat à mi-hauteur, et
   décalées l'une par rapport à l'autre. Le moteur ne voit que des cases et des
   altitudes ; il n'a jamais eu besoin de savoir qu'un escalier « tourne ».
   ⚠️ ET C'EST CE DÉCALAGE QUI FAIT LE VIRAGE, PAS UN ANGLE : la volée basse
   occupe x 138-143, la haute x 144-147. Depuis le palier, le nord n'est ouvert
   qu'à l'est — un joueur qui monte tout droit bute sur le muret et doit
   longer. La contrainte naît de la CARTE, donc `canStandTown` la fait respecter
   sans une ligne, et `townFindPath` la contourne sans une ligne non plus.

   `dir` donne le sens de la MONTÉE : "n" = on monte vers le nord (la volée est
   parcourue du sud au nord). La longueur de la volée (`len`) découle du
   dénivelé : quatre marches pour une unité, ce qui donne les 0,25 de
   TOWN_STEP_MAX. */
export const TOWN_STAIRS = [
  /* ① ZIP 467 — LA VOLÉE BASSE SUIT LE BLOC FOURNI, PAS L'ANCIEN MONTAGE.
     Huit cases entre les deux bords extérieurs, dont six réellement ouvertes
     entre les colonnes. Ses six rangées correspondent aux six girons visibles
     de `ESCALIERDETOURE` : le personnage gagne ou perd 0,6 unité par sept
     petits intervalles, sans téléportation ni cas particulier. */
  /* hors-zip — X CORRIGÉ DE 142 À 141. Guillaume a signalé, captures à
     l'appui, qu'on pouvait chevaucher la rambarde de droite et qu'on restait
     bloqué avant de toucher celle de gauche. Mesuré au pixel (crop du bloc
     importé, comparé colonne par colonne à TOWN_RAILS) : les deux poteaux de
     la volée basse sont peints UNE case plus à l'ouest que ce que review
     laissait supposer — la volée entière suit, rambardes comprises, pour que
     les deux continuent à border exactement ses deux bords. Largeur et compte
     de marches inchangés, seule l'ancre bouge. */
  { x: 141, y: 31, w: 8, len: 6, dir: "n", from: 0, to: 0.6 },
  /* ② LA VOLÉE HAUTE : six cases hors œuvre, quatre ouvertes. Trois rangées
     remplacent les deux rangées comprimées du 466 et calent la montée sur la
     profondeur réellement dessinée par le bloc. */
  { x: 136, y: 27, w: 6, len: 3, dir: "n", from: 0.6, to: 1 },
  // La volée de service, à l'ouest, pour ne pas obliger à traverser toute la
  // ville quand on arrive de la gare.
  { x: 116, y: 18, w: 4, len: 4, dir: "e", from: 0, to: 1 },
  // La montée du belvédère, courte et étroite.
  { x: 170, y: 21, w: 3, len: 4, dir: "n", from: 1, to: 2 },
];

/* Les deux premières volées sont peintes par le bloc 467. La fonction est
   partagée par le jeu et le banc : elle empêche l'ancien dessus/parement/limon
   procédural de dépasser derrière les pixels transparents du nouveau visuel. */
export function townCourtMainStairCell(x, y) {
  for (let i = 0; i < 2 && i < TOWN_STAIRS.length; i++) {
    const st = TOWN_STAIRS[i];
    const inside = st.dir === "e"
      ? x >= st.x && x < st.x + st.len && y >= st.y && y < st.y + st.w
      : x >= st.x && x < st.x + st.w && y >= st.y && y < st.y + st.len;
    if (inside) return true;
  }
  return false;
}

/* LE PALIER. Une plate-forme PLATE à l'altitude de raccord des deux volées.
   ⚠️ IL N'EST PAS EN MARCHES, ET C'EST TOUT SON INTÉRÊT : `G_TOWN_STAIR` y
   dessinerait des nez de marche sur une surface de niveau, ce qui est le
   contresens le plus visible qu'un escalier puisse commettre. On le pave en
   `G_PATH_STONE` — la dalle — qui est déjà ce que la ville emploie pour ses
   surfaces de pierre plates.
   ⚠️ IL DÉBORDE À L'OUEST DE LA VOLÉE HAUTE (x 138-147 contre 144-147), et ce
   débord EST le virage : c'est la surface sur laquelle on tourne. Sans lui, le
   raccord serait un angle mort où l'on resterait coincé contre deux dénivelés.
   ⚠️ Son bord sud, à x 144-147, surplombe le vide de 0,5 unité : ça dépasse
   TOWN_STEP_MAX, donc c'est un mur — mais un mur qui se VOIT, puisque le rendu
   lui dessine son parement de falaise tout seul. C'est exactement le muret de
   brique sous la balustrade de la planche. */
export const TOWN_STAIR_LANDINGS = [
  /* ZIP 467 — une seule rangée plate entre les deux volées. Le palier est plus
     large que le passage : le bloc y peint le muret, la ferronnerie et la
     balustrade ; leurs collisions sont dans TOWN_RAILS, pas dans l'altitude. */
  { x: 136, y: 30, w: 15, h: 1, elev: 0.6 },
];

/* ⚠️⚠️⚠️ ZIP 447 — LA BALUSTRADE, ET ELLE N'EST PAS QU'UN DÉCOR : ELLE EST LA
   CORRECTION D'UN COINCEMENT QUE `verify-vallee` A TROUVÉ ET QUE RIEN D'AUTRE
   N'AURAIT VU.
   Le quart tournant est RECESSÉ dans la terrasse (il le faut : entre l'avenue
   et le plateau il n'y a que six rangées, et une volée + un palier + une volée
   en demandent six). Son creusement laisse donc, à l'est de la volée haute, un
   bord de terrasse qui surplombe le palier de 0,4 unité. C'est un mur — sauf
   qu'un marcheur a une BOÎTE de 0,35 de profondeur : avancé à y=28,8 sur une
   case dont le sud est 0,4 plus bas, sa boîte enjambe les deux niveaux, les
   deux contrôles d'altitude refusent, et il ne peut plus ni avancer ni
   reculer. Mesuré : 108 trajets sur 21 756 finissaient « bloqué en
   (143.0,28.8) ».
   ⚠️ ON NE CORRIGE PAS ÇA EN ÉLARGISSANT UN SEUIL. On empêche d'y aller, et la
   chose qui empêche d'aller au bord d'une terrasse s'appelle un garde-corps —
   c'est-à-dire, très exactement, l'objet que la planche de Guillaume pose là.
   *La collision et le dessin disent la même chose, ce qui est le seul cas où
   l'on a le droit de les faire coïncider.*
   ⚠️⚠️ ET ELLE NE PORTE AUCUNE ALTITUDE. C'est le piège du 439, celui qui a
   failli rendre les deux ponts infranchissables : une grandeur de DESSIN
   (elle monte de 14 px au-dessus de la case) ne doit JAMAIS entrer dans
   `elev`, sinon `canStandTown` en fait une falaise. Elle marque `solid`, rien
   d'autre. Trois grandeurs, trois paramètres (§4). */
export const TOWN_RAILS = [
  // Le garde-corps du bord est du palier haut, celui du défaut ci-dessus.
  { x: 142, y: 29, w: 9, h: 1, axis: "x", style: "stone" },
  /* La ferronnerie occupe tout le bord gauche donné par le bloc. `style` reste
     descriptif pour les bancs et le diagnostic ; le rendu n'en fait plus un
     sprite séparé depuis le 467. */
  { x: 136, y: 31, w: 6, h: 1, axis: "x", style: "iron" },
  /* ⚠️⚠️ ZIP 447 — ET LES RAMPES DES DEUX VOLÉES, QUI SONT L'INDICE DE
     PROFONDEUR LE PLUS FORT DE TOUT L'ESCALIER. Elles sont posées SUR les cases
     de marche extérieures, pas à côté : c'est ce qui les fait MONTER avec la
     volée, puisque la file de rendu classe chaque décor à l'altitude de sa case
     (`pushE(by, elAt(pr.x, pr.y))`). Une rampe posée sur l'herbe voisine serait
     restée plate le long d'un escalier qui monte — le contresens exact que le
     zip corrige.
     ⚠️ ELLES COÛTENT DEUX CASES DE LARGEUR À CHAQUE VOLÉE, et c'est le prix
     juste : la volée basse passe de 8 à 6 cases praticables, la haute de 6 à 4.
     Un escalier dont la rampe ne prend pas de place est un escalier dont la
     rampe est peinte sur le sol. `verify-vallee` confirme que les quatre volées
     et tous les lieux de la ville restent atteignables. */
  /* hors-zip — MÊME CORRECTION D'UNE CASE QUE TOWN_STAIRS[0] (x 142→141,
     149→148) : ces deux rambardes bordent la même volée, elles bougent avec
     elle pour rester exactement sur ses poteaux peints, ni chevauchement à
     l'est ni vide avant contact à l'ouest. */
  { x: 141, y: 31, w: 1, h: 6, axis: "y", style: "short", side: "west" },
  { x: 148, y: 31, w: 1, h: 6, axis: "y", style: "short", side: "east" },   // volée basse
  /* ⚠️⚠️⚠️ hors-zip 2026-09-02 — LA MÊME CORRECTION N'AVAIT JAMAIS ÉTÉ FAITE
     ICI, ET C'EST CE QUE GUILLAUME A VU EN JOUANT : « on est bloqué avant
     d'entrer en contact avec les rambardes […] vision en perspective des
     poteaux ». Mesuré en superposant l'emprise au bitmap affiché
     (`tools/_diag_post_zoom2.mjs`, jeté après usage) : le poteau EST de la
     volée haute est peint centré sur x≈140, pas x=141 — un plein tile à
     l'écart de sa propre emprise de collision, qui ne couvrait donc que du
     pavé vide. Le poteau OUEST (x=136), lui, tombait déjà juste — seule la
     paire de la volée basse avait reçu la correction ci-dessus au 467.
     ⚠️ ET `h` PASSE DE 3 À 4 POUR LES DEUX POTEAUX DE CETTE VOLÉE (« on
     marche sur le mur ») : leur socle sculpté déborde d'une rangée sous le
     haut de la volée (rangée 30, le palier) — visible sur le même
     recouvrement, la base du poteau continue nettement sous le bas de
     l'ancienne emprise (h=3, rangées 27-29). Sans la rangée 30, rien
     n'empêchait de se tenir SUR ce socle peint. Le palier reste ouvert sur
     13 des 15 cases restantes — inchangé pour la traversée est-ouest. */
  { x: 136, y: 27, w: 1, h: 4, axis: "y", style: "tall", side: "west" },
  { x: 140, y: 27, w: 1, h: 4, axis: "y", style: "tall", side: "east" },   // volée haute
];

/* ZIP 467 — LE VISUEL EST UN SEUL BLOC. `x` est son origine dans le monde ;
   `screenY` est déjà la projection verticale du bitmap, parce que le bloc
   contient lui-même murs, paliers et dénivelés. Le repasser par une altitude
   le déformerait une seconde fois. La position est calée par les deux volées :
   l'escalier haut commence à l'écran en y=392 et le bas en y=469, exactement
   aux rangées correspondantes du 268×248 natif. */
export const TOWN_COURT_STAIR_BLOCK = { x: 134, screenY: 343 };
/* Emprise de nettoyage dans la grille : un panneau générique ou une statue
   ajoutés par une passe ultérieure dépasseraient du bloc sans appartenir à sa
   composition. Elle est volontairement plus large de deux cases que le
   contenu opaque, pour attraper les sprites hauts ancrés juste à côté. */
export const TOWN_COURT_STAIR_CLEAR = { x: 132, y: 23, w: 23, h: 16 };

/* Le pot est cuit dans le bloc mais reste un volume. Tout le reste de la
   collision visible est déjà TOWN_RAILS ou un écart d'altitude. */
export const TOWN_COURT_BLOCK_SOLIDS = [
  { x: 147, y: 31, w: 1, h: 1, kind: "pot" },
];

export const TOWN_HOUSES = [                        // door faces south onto a street
  /* ⚠️ LES HUIT PREMIÈRES SONT LES HUIT D'AVANT, DANS LE MÊME ORDRE (quatre au
     nord de la rue principale, quatre au sud) : voir la note d'en-tête. Elles
     ont changé de coordonnées — la carte entière a changé — mais pas de RANG,
     et c'est le rang qui désigne le propriétaire. */
  { x: 14, y: 64 }, { x: 26, y: 64 }, { x: 46, y: 64 }, { x: 58, y: 64 },   // nord de la rue principale
  { x: 14, y: 28 }, { x: 46, y: 28 }, { x: 58, y: 28 }, { x: 100, y: 28 },  // le long de l'avenue du nord
  // Zip 425 : les parcelles nouvelles. Une ville neuf fois plus grande avec
  // huit maisons se lit comme une ville abandonnée.
  { x: 14, y: 102 }, { x: 26, y: 102 }, { x: 46, y: 102 }, { x: 58, y: 102 },
  { x: 116, y: 102 }, { x: 128, y: 102 }, { x: 160, y: 102 },
  { x: 46, y: 122 }, { x: 100, y: 122 }, { x: 160, y: 122 },
  // ... et deux sur la terrasse : les hauteurs sont les belles adresses.
  { x: 122, y: 24 }, { x: 152, y: 24 },
  /* Zip 426 — les parcelles de l'agrandissement. ⚠️ ELLES SONT AJOUTÉES EN
     QUEUE, jamais intercalées : le RANG désigne le propriétaire (voir
     townHouseOwners), donc insérer une parcelle au milieu déménagerait tout le
     monde d'une maison — silencieusement, et sans que rien ne le signale.
     ⚠️ Chaque `y` est calé sur une avenue : la porte est en y+3 et l'allée
     rejoint la rue si elle est à 8 rangées ou moins (générateur). */
  { x: 200, y: 64 }, { x: 200, y: 102 }, { x: 200, y: 122 },   // le quartier des artisans, à l'est
  { x: 26, y: 144 }, { x: 60, y: 144 }, { x: 100, y: 144 }, { x: 140, y: 144 }, // la rangée du sud, face au lac
];
// Zip 260 (demande Guillaume) : plafond de résidents porté à 10, INDÉPENDANT
// du nombre de maisons de Valley Town. L'attribution de maison sera revue plus
// tard — pour l'instant, les résidents au-delà des maisons disponibles sont
// simplement dessinés près d'un point par défaut (voir le rendu des résidents
// dans FermeGame.js), ce qui est assumé.
/* ⚠️⚠️ ZIP 427 — LE PLAFOND PASSE DE 10 À 20, ET LA SEULE QUESTION QUI COMPTE
   EST « COMBIEN DE `send()` EN PLUS ? ». Réponse mesurée sur le code, pas au
   jugé : ZÉRO. Tout ce qui bouge chez un résident passe par UN SEUL message
   groupé par image (`flushResidentNet`, zip 364) — doubler la population double
   la TAILLE du paquet, et la taille n'est pas facturée (§3 de CLAUDE.md).
   Les autres canaux sont eux aussi indifférents au nombre :
     * `broadcastStation()` diffuse la station ENTIÈRE, résidents compris, à sa
       propre cadence : un objet deux fois plus gros, toujours un message ;
     * la rôdaille, les scènes et les trajets de ville n'émettent que par
       DÉCISION (A→B), jamais par tick.
   ⚠️ CE QUI AURAIT COÛTÉ, ET QU'ON NE FAIT DONC PAS : un message par résident
   (le modèle d'avant le 364) — vingt résidents auraient alors dépassé à eux
   seuls le plafond de 10 msg/s à chaque `justCameIntoRange`, EN SILENCE.
   Le vrai coût du passage à 20 est donc du CPU chez l'hôte (rôdaille + travail),
   pas du réseau. C'est le bon échange : le CPU est gratuit, le quota non.
   ⚠️ Et ça reste DÉCORRÉLÉ du nombre de parcelles (27 depuis le 426, zip 260
   pour la règle) : ce nombre-ci plafonne les résidents RECRUTÉS, celui-là
   décrit la ville. */
export const MAX_RESIDENTS = 20;
/* ═══════════════════════════════════════════════════════════════════════════
   LES TROIS MONUMENTS (425).
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ L'ANCIENNE MAIRIE DEVIENT L'ÉGLISE, ET ON NE TOUCHE PAS À SON DESSIN.
   Demande de Guillaume : « garder l'actuel townhall et le renommer église ».
   Le sprite `townhallSprite()` de fermeArt.js reste mot pour mot celui du
   235 — et c'était déjà la bonne lecture : le commentaire du zip 279 l'appelle
   « l'espèce d'église blanche ». On ne renomme donc pas un bâtiment, on lui
   rend son nom. Seuls la CONSTANTE et l'ÉTIQUETTE changent.
   ⚠️ `TOWN_CHURCH` est délibérément un nom NEUF plutôt qu'un TOWN_HALL réutilisé
   pour l'église : `TOWN_HALL` continue d'exister et désigne maintenant un AUTRE
   bâtiment, à un AUTRE endroit. Garder l'ancien nom pour le nouveau sens aurait
   fait mentir tous les commentaires antérieurs d'un coup.

   ⚠️ ET ELLE SORT DE L'AXE CENTRAL. Elle était plantée sur la colonne de
   l'artère nord-sud, qu'elle bouchait ; on ne s'en apercevait pas parce que
   cette artère s'arrêtait avant. Sur une carte trois fois plus longue, une rue
   interrompue par un bâtiment se voit tout de suite. */
export const TOWN_CHURCH = { x: 66, y: 46, w: 8, h: 5 };   // ex-TOWN_HALL du zip 235, sprite 128×128

/* LE NOUVEL HÔTEL DE VILLE. Demande : « un nouveau bâtiment townhall différent
   des autres quelque part au centre ». Il borde la place à l'est, face à la
   fontaine — la position d'une mairie sur une place de village. Brique et
   pierre, beffroi à horloge : rien de commun avec le portique blanc de
   l'église ni avec le péristyle du tribunal, pour qu'aucun des trois ne puisse
   être confondu avec un autre à distance.
   ⚠️ 2026-09-02 — ÉLARGI de 10 à 12 cases (croissance symétrique autour de
   l'ancien centre x=117, donc x passe de 112 à 111) pour le sprite PNG importé
   (townhall-day.png/townhall-glow.png, voir FermeGame.js/drawTownHallBitmap) :
   Guillaume voulait plus de largeur et plus de fenêtres pour que le bâtiment
   se lise comme un hôtel de ville. Largeur vérifiée sans chevauchement — le
   voisin le plus proche (TOWN_COURT, x=136) laisse encore 13 cases de marge.
   6 rangées bloquantes, inchangé (la profondeur du bâtiment n'a pas grandi). */
export const TOWN_HALL = { x: 111, y: 52, w: 12, h: 6 };
// Nombre de rangées, au sud de l'emprise, laissées TRAVERSABLES pour le
// perron (fermeEngine.js, boucle de solidité des bâtiments civils) — partagé
// avec FermeGame.js/drawTownHallBitmap, qui doit ancrer la clé de tri de
// profondeur sur cette même limite (sinon un joueur planté sur le perron,
// donc au nord de l'ancienne bordure sud, se fait recouvrir par le sprite :
// payé le 2026-09-02, joueur invisible en s'approchant de la porte).
export const TOWN_HALL_STEP_ROWS = 1;

/* LE TRIBUNAL. Demande : « un autre bâtiment élégant néoclassique nommé
   tribunal, imposant, qui ressemble à un tribunal ».
   ⚠️ IL EST EN HAUTEUR, ET C'EST LE POINT ENTIER. Un tribunal néoclassique se
   regarde D'EN BAS : le perron, le péristyle et le fronton n'existent que pour
   ça. Le poser au niveau de la rue en aurait fait une grosse maison à colonnes.
   Posé au sommet de la volée monumentale, il est la RÉCOMPENSE de la montée —
   ce qui donne du même coup une raison d'être aux escaliers demandés par
   Guillaume, au lieu d'un escalier-démonstration qui ne mène nulle part.
   Sprite 192×176 (12×11 cases), 7 rangées bloquantes. */
export const TOWN_COURT = { x: 136, y: 14, w: 12, h: 7 };
export const TRAIN_BOARD = { x: 5, y: 30 };         // farm-side boarding spot on the platform (E to ride)

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — COUPER DU BOIS À VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « on doit pouvoir chop trees sur Valley Town aussi »,
   avec trois décisions prises explicitement : la coupe est **partagée et
   sauvegardée** (l'hôte arbitre, ça survit à la session), **tous** les arbres
   sont coupables, **ça repousse**, et seule la **hache** est réactivée en ville.

   ⚠️⚠️ LA COUPE NE TOUCHE PAS `townWorld.objects`, ET C'EST LA DÉCISION QUI
   PROTÈGE TOUT LE RESTE. La carte de la ville est un SINGLETON de module
   (`getTownWorldCached`) partagé par tous les remontages de l'onglet : y écrire
   ferait fuiter les arbres coupés d'une ferme à l'autre, dans le même onglet,
   sans le moindre message — on chargerait un code neuf et la ville arriverait
   déjà déboisée. L'état vit donc DANS L'ÉTAT PARTAGÉ (`shared.townChop`), il est
   consulté au dessin et à la collision, et il est sauvegardé avec la ferme.

   ⚠️ ET IL N'Y A AUCUNE MIGRATION SQL : `townChop` est un champ de plus dans le
   JSON de `ferme_saves`, comme `forcedWorld` au 392. Absent d'une sauvegarde
   antérieure = ville intacte, ce qui est exactement le bon comportement.

   Forme d'une entrée, indexée par case : `{ hp }` = arbre entamé, encore debout ;
   `{ r }` = arbre abattu, souche visible et TRAVERSABLE, qui repousse à `r`. */
/* ⚠️ 438 — LA CADENCE DU SOUFFLE. 430 ms par image, quatre images en boucle,
   soit 1,7 s par respiration. Plus vite, l'arbre grelotte ; plus lentement, on
   ne voit plus qu'un saut de pixel de temps en temps, ce qui se lit comme un
   défaut. La PHASE, elle, est tirée du hachage de la case (voir townTreeImg) :
   c'est elle qui empêche la ville de battre d'un seul bloc. */
export const TOWN_TREE_SWAY_MS = 430;
export const TOWN_TREE_REGROW_MS = 2 * DAY_REAL_MS;  // deux jours de jeu (32 min réelles)
/* ⚠️ LA SOUCHE NE BLOQUE PAS, contrairement à celle de la ferme. Deux raisons,
   et la seconde est la vraie : d'abord un arbre abattu doit OUVRIR le passage,
   sinon couper en ville ne sert à rien ; ensuite la souche est le seul indice
   visible qu'un arbre repoussera là — une case redevenue vide ne dirait rien, et
   la repousse aurait l'air d'un arbre qui apparaît de nulle part. */
export const TOWN_STUMP_BLOCKS = false;

/* ═══════════════════════════════════════════════════════════════════════════
   HORS-ZIP 2026-09-02 — LA VÉGÉTATION BASSE SE TRAVERSE, ELLE FRISSONNE, ET
   ELLE RETIENT LE PAS.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « affiner les collisions pour les petits buissons, on
   doit pouvoir passer à travers en faisant bouger le sprite (réalisme).
   Ralentit un petit peu la marche. »

   ⚠️⚠️ CE FICHIER SE LE REPROCHAIT DÉJÀ DEUX FOIS SANS L'AVOIR APPLIQUÉ ICI.
   Le 401 a sorti `O_BERRY_BUSH` et `O_ORCHARD` des deux listes de collision de
   la FERME (« un buisson à hauteur de genou qui arrête un fermier comme le
   ferait un rocher »), et le 447 pose la végétation du dénivelé en `blocks =
   false` (« un massif de fleurs qu'on ne peut pas traverser est un mur
   invisible déguisé en décor »). `addGarden`, lui, marque TOUT ce qu'il pose
   comme solide depuis le 437 : vingt-huit cases d'herbe, de lavande et de
   buisson d'or arrêtaient net. *Une règle écrite deux fois pour deux endroits
   n'a jamais été une règle ; c'était deux correctifs locaux.*

   ⚠️⚠️⚠️ CE QUI EST DEDANS ET CE QUI N'Y EST PAS, ET LE CRITÈRE N'EST PAS LA
   TAILLE : c'est **ce qui plie**. Une touffe, une lavande, un buisson d'or, un
   buis taillé cèdent quand on marche dedans. Un BAC de roses, une jardinière,
   un pot, un bonsaï sont des CONTENANTS — de la terre cuite et du bois, qui ne
   plient pas — et une haie est un mur (elle borde les vingt-sept parcelles,
   son passage est l'allée). Décision de Guillaume, contre les deux autres
   listes proposées.
   ⚠️ ELLE EST LUE À UN SEUL ENDROIT (la passe finale de `generateTownWorld`,
   qui DÉRIVE `soft` de la liste des props) plutôt qu'aux six sites qui posent
   du décor : `addProp`, `addGarden` et trois `props.push` directs auraient fait
   trois listes, donc trois occasions d'oublier un buisson. */
export const TOWN_SOFT_PROPS = new Set([
  "goldBush", "clump", "lavender", "shrub", "grassTuft", "reedTuft", "topiary",
]);
/* ⚠️ ON RALENTIT, ON N'ARRÊTE PAS. C'est la contrepartie du passage : traverser
   un buisson doit COÛTER quelque chose, sinon la végétation n'est plus qu'un
   dessin qu'on ignore. 0,72 se sent (une seconde de plus sur quatre cases) sans
   donner l'impression d'être englué — et il se cumule au galop comme à la
   course, parce qu'il MULTIPLIE la vitesse au lieu de la plafonner. */
export const TOWN_BUSH_SLOW = 0.72;
/* ── LE FRISSON. Trois nombres, et c'est un ressort amorti : on couche le
   feuillage d'un coup, il revient en oscillant, il s'arrête.
   ⚠️ L'AMPLITUDE EST EN PIXELS AU SOMMET DU SPRITE, PAS UN ANGLE. Le dessin est
   cisaillé autour de son PIED (une plante pousse dans le sol, elle ne pivote
   pas sur son ancre) : la base ne bouge pas d'un pixel, ce qui garantit que
   l'ombre portée dessinée dans le sprite reste où elle est. Un vrai angle
   aurait décollé le pied du sol, et c'est le premier chose qu'on voit.
   ⚠️ LA PÉRIODE EST PLUS COURTE QUE L'AMORTISSEMENT : sans ça on voit un seul
   aller-retour, c'est-à-dire un décor qui glisse et revient, pas une plante. */
export const TOWN_BUSH_SWAY_PX = 5.0;      // décalage du sommet, au premier temps
export const TOWN_BUSH_SWAY_MS = 260;      // période de l'oscillation
export const TOWN_BUSH_SWAY_FADE_MS = 520; // constante de temps de l'amortissement

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 426 — L'INTÉRIEUR DU TRIBUNAL, SUR TROIS NIVEAUX.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « un intérieur complet pour le tribunal avec étages,
   assez grand, avec différents bureaux, une salle d'audience etc. Tout ce
   qu'il faut pour mimer un tribunal dans un jeu comme Valley Farm — anticipe
   les usages du bâtiment et déduis-en le plan. »

   ⚠️ LE PLAN EST DÉDUIT DES USAGES, ET C'EST L'ESSENTIEL DE CE BLOC. Chaque
   pièce existe parce qu'une mécanique du jeu, existante ou évidente, a besoin
   d'un GUICHET quelque part :
     * le CADASTRE  ← les vingt-sept parcelles de Valley Town, qui affichent
       « à vendre » depuis le zip 234 sans qu'on puisse en acheter une ;
     * les PERMIS   ← la grange, le puits, le pont, la maison à niveaux : la
       ferme ne sait construire que par l'argent, jamais par l'autorisation ;
     * le NOTAIRE   ← les échanges entre joueurs, aujourd'hui impossibles ;
     * l'ÉTAT CIVIL ← les noms de ferme, les unions, les familiers déclarés ;
     * la SALLE D'AUDIENCE ← les litiges entre joueurs et les amendes ;
     * les SCELLÉS et les OBJETS TROUVÉS ← ce qu'on perd (mort, blessure) ;
     * les CELLULES ← la sanction, pendant naturel de l'audience ;
     * les ARCHIVES ← l'histoire de la ferme, déjà écrite mais jamais lisible.
   ⚠️ AUCUNE N'EST OPÉRATIONNELLE DANS CE ZIP, ET LE JEU LE DIT. Chaque porte
   porte sa plaque, chaque plaque annonce son service et sa mise en service
   « prochainement » (voir COURT_ROOMS.soon et le panneau d'affichage du hall).
   Un bâtiment qu'on visite en sachant à quoi il servira est une promesse ; le
   même bâtiment muet est un décor qu'on croit cassé.

   ⚠️⚠️ LES TROIS NIVEAUX TIENNENT DANS UNE SEULE GRILLE, EMPILÉE VERTICALEMENT,
   ET C'EST LA DÉCISION STRUCTURANTE. Il n'y a AUCUNE coordonnée d'étage : le
   niveau se DÉDUIT de `y` (voir courtFloorOf). Conséquences, toutes gratuites :
     * un joueur distant est au bon étage sans qu'on diffuse quoi que ce soit —
       ses x/y suffisent, exactement comme l'altitude de Valley Town (§3, §6) ;
     * rien à réconcilier, rien à désynchroniser, aucun champ de plus ;
     * les escaliers ne sont qu'un saut de coordonnée, pas un changement d'état.
   C'est le MÊME raisonnement que « l'altitude est une propriété de la case ».
   ═══════════════════════════════════════════════════════════════════════════ */
export const COURT_FLOOR_W = 46;    // largeur d'un niveau, en cases (murs compris)
export const COURT_FLOOR_H = 28;    // hauteur d'un niveau
export const COURT_FLOOR_GAP = 3;   // rangées de vide entre deux niveaux empilés
export const COURT_MAP_W = COURT_FLOOR_W;
// Les niveaux, du haut de la grille vers le bas. ⚠️ L'ORDRE EST LE PLAN : le
// rez-de-chaussée d'abord (c'est là qu'on entre), puis l'étage, puis le
// sous-sol — et non l'ordre physique (sous-sol en bas), qui obligerait à des
// index négatifs pour rien.
/* ⚠️ `alt` EST L'ALTITUDE RÉELLE DU NIVEAU, et elle n'est pas décorative : c'est
   elle qui décide si une volée se dessine « qui monte » ou « qui descend »,
   DÉDUIT au lieu d'être écrit deux fois. L'ordre du tableau, lui, reste l'ordre
   du plan (on entre par le rez-de-chaussée), pas l'ordre physique. */
/* ⚠️⚠️ ZIP 438 — LA MAIRIE EST DANS LA MÊME GRILLE QUE LE TRIBUNAL, ET C'EST
   LA DÉCISION STRUCTURANTE DE CE ZIP. Un second intérieur pouvait se faire de
   deux façons :
     1. une ZONE de plus (`m.zone === "hall"`). Vingt-cinq endroits de
        `FermeGame.js` testent `zone === "court"` : il aurait fallu les
        retrouver TOUS, et en oublier un ne lève rien — c'est le piège n°1 du
        projet, appliqué à l'architecture ;
     2. deux niveaux de plus dans la MÊME carte, sous ceux du tribunal.
   La seconde ne coûte RIEN : la zone reste « court », les vingt-cinq tests
   restent vrais, `courtFloorOf(y)` continue de dire où l'on est — et, surtout,
   **deux joueurs dans deux bâtiments différents ne peuvent pas se confondre**,
   parce que leurs `y` diffèrent. C'est exactement le raisonnement du 426 (« les
   trois niveaux tiennent dans une seule grille, le niveau se lit dans y »),
   étendu d'un bâtiment. Rien de plus ne circule sur le réseau.
   ⚠️ `bld` DIT À QUEL BÂTIMENT APPARTIENT LE NIVEAU. C'est la seule donnée
   nouvelle, et elle sert à trois choses : la matière du sol, l'emplacement du
   seuil, et la porte de ville par laquelle on ressort. */
/* ⚠️⚠️ ZIP 441 — L'ÉGLISE PREND DEUX NIVEAUX DE PLUS, ET C'EST LA MÊME
   DÉCISION QU'AU 438, PRISE POUR LA MÊME RAISON. Une zone « church » aurait
   demandé de retrouver les vingt-cinq tests `zone === "court"` ; deux niveaux
   ne coûtent rien, `courtFloorOf(y)` continue de dire où l'on est, et trois
   joueurs répartis dans trois bâtiments ne peuvent pas se confondre puisque
   leurs `y` diffèrent. Le troisième bâtiment a donc coûté DEUX LIGNES ici —
   c'est la mesure de ce que la décision du 438 a fait économiser.
   ⚠️ ET AUCUN `CT_*` DE PLUS. Une église n'a pas la matière d'un tribunal : ses
   dalles sont grandes et régulières, ses fenêtres sont des vitraux, son chœur
   est une estrade. Trois différences, et toutes les trois sont une COUCHE —
   `bld === "church"` change le DESSIN des matières existantes (règle du 434 :
   une variante est une couche, pas un identifiant de sol). Un `CT_FLAG` de plus
   aurait rouvert le test de solidité, les deux passes de sol et la passe de
   murs, et en oublier un ne lève rien : ça fait juste une dalle qu'on traverse. */
export const COURT_FLOORS = [
  { key: "ground",   emoji: "⚖️", alt: 0,  bld: "court" },
  { key: "upper",    emoji: "🗂️", alt: 1,  bld: "court" },
  { key: "basement", emoji: "🔒", alt: -1, bld: "court" },
  { key: "hall",     emoji: "🏛️", alt: 0,  bld: "hall" },
  { key: "hallUp",   emoji: "📜", alt: 1,  bld: "hall" },
  { key: "church",   emoji: "⛪", alt: 0,  bld: "church" },
  { key: "churchLoft", emoji: "🎹", alt: 1, bld: "church" },
  /* ⚠️⚠️ ZIP 444 — LE BEFFROI, ET C'EST LA MESURE DE CE QUE LA DÉCISION DU 438
     A FAIT ÉCONOMISER. Le 441 avait écrit, en ouvrant l'église : « deux lignes
     dans `COURT_FLOORS`, et c'est tout ce qu'a coûté le TROISIÈME bâtiment ».
     Le quatrième niveau d'église en coûte UNE, plus un palier de vis, plus un
     plan. Aucune zone de plus (les vingt-cinq tests `zone === "court"` restent
     vrais), aucun `CT_*` de plus, aucun champ réseau — l'étage se déduit de `y`.
     ⚠️ LA PRÉMISSE DU CHANTIER LE CROYAIT DÉJÀ EN JEU, ET IL NE L'ÉTAIT PAS.
     L'église avait une CAGE de clocher et une corde de cloche depuis le 441 :
     un escalier qui ne monte nulle part, et un décor qui promet un lieu. C'est
     le « bâtiment muet » du 426 en plus sournois — ici l'escalier parle, et il
     ment. Il mène quelque part maintenant. */
  { key: "churchTower", emoji: "🔔", alt: 2, bld: "church" },
];
export const COURT_MAP_H = COURT_FLOORS.length * (COURT_FLOOR_H + COURT_FLOOR_GAP);
// Sol / structure. ⚠️ ENUM PROPRE À L'INTÉRIEUR, jamais les G_* de la ferme :
// ces valeurs ne sortent pas du tribunal (carte regénérée, jamais persistée),
// donc rien à migrer — et un G_ de plus, lui, se paierait sur les sauvegardes.
export const CT_VOID = 0;       // hors bâtiment (jamais dessiné, toujours bloquant)
export const CT_MARBLE = 1;     // dallage du hall
export const CT_WOOD = 2;       // parquet des bureaux
export const CT_CARPET = 3;     // tapis de la salle d'audience
export const CT_STONE = 4;      // dalle brute du sous-sol
export const CT_WALL = 5;
export const CT_DOOR = 6;       // porte de pièce (traversable, porte une plaque)
export const CT_STAIR_UP = 7;   // marche vers le niveau précédent dans COURT_FLOORS
export const CT_STAIR_DOWN = 8; // ... et vers le suivant
export const CT_EXIT = 9;       // le seuil : on ressort en ville
export const CT_DAIS = 10;      // estrade de la salle d'audience (traversable, surélevée au dessin)
export const CT_WINDOW = 11;    // mur percé d'une fenêtre (bloque comme un mur)
export const CT_BARS = 12;      // grille de cellule (bloque, se voit au travers)

/* LES PIÈCES. `x,y,w,h` est le rectangle MURS COMPRIS — deux pièces mitoyennes
   partagent donc leur cloison, et le générateur n'a aucun cas particulier à
   traiter. `doors` donne la case D'ANCRAGE de chaque porte (son coin
   nord/ouest), TOUJOURS sur le mur qui touche le couloir central (x = 18 à
   l'ouest, x = 27 à l'est) — c'est `generateCourtWorld` qui l'étend ensuite
   sur `COURT_DOOR_W` cases, jamais la table elle-même (une seule largeur à
   changer, jamais dix-neuf paires de coordonnées à réécrire).
   ⚠️ `kind` PILOTE LE MOBILIER (voir courtFurnish) : c'est ce qui évite d'écrire
   quatre cents positions de meubles à la main et de les voir dériver du plan. */
/* HORS-ZIP — LES PORTES PASSENT DE 1 À 2 CASES DE LARGE, DEMANDÉ PAR
   GUILLAUME (« visuellement quasiment injouable »). Une porte d'une case
   contre une boîte de joueur de 0,56 case (`COURT_BOX`) ne tolérait qu'un
   centrage à ±0,22 case près — plus strict que n'importe quel portail de
   Valley Town, où le plus étroit fait déjà deux cases (les portails de haie,
   `fermeEngine.js`, ±0,7 case de tolérance). On copie exactement ce modèle
   au lieu d'en inventer un nouveau : le confort d'un portail de haie est
   devenu la référence de toutes les portes intérieures. Le générateur fait
   tout le travail (voir la boucle des portes et `doorGuard` dans
   `generateCourtWorld`) ; cette table n'a rien à savoir de la largeur. */
export const COURT_DOOR_W = 2;
export const COURT_CORRIDOR = { x: 18, y: 0, w: 10, h: 28 };
export const COURT_ROOMS = [
  // ---------------- REZ-DE-CHAUSSÉE : ce qui se passe en public.
  /* ⚠️ LA PORTE DE LA SALLE D'AUDIENCE EST AU SUD DE LA BARRE (y = 15), et pas
     au milieu du mur : on entre du côté du PUBLIC. Placée plus haut, elle
     déposait le visiteur dans le prétoire, derrière la balustrade — c'est-à-dire
     à la place des avocats, en ayant traversé une barrière qui est justement là
     pour dire qu'on ne la traverse pas. */
  { floor: 0, key: "courtroom", kind: "courtroom", x: 0, y: 0, w: 19, h: 20, doors: [{ x: 18, y: 15 }] },
  { floor: 0, key: "witness",   kind: "waiting",   x: 0, y: 19, w: 19, h: 9,  doors: [{ x: 18, y: 23 }] },
  { floor: 0, key: "clerk",     kind: "counter",   x: 27, y: 0, w: 19, h: 11, doors: [{ x: 27, y: 5 }] },
  { floor: 0, key: "robing",    kind: "robing",    x: 27, y: 10, w: 19, h: 10, doors: [{ x: 27, y: 14 }] },
  { floor: 0, key: "reception", kind: "counter",   x: 27, y: 19, w: 19, h: 9,  doors: [{ x: 27, y: 23 }] },
  // ---------------- ÉTAGE : les guichets, c'est-à-dire l'avenir du bâtiment.
  { floor: 1, key: "judge",     kind: "office",    x: 0, y: 0, w: 19, h: 11, doors: [{ x: 18, y: 5 }] },
  { floor: 1, key: "jury",      kind: "meeting",   x: 0, y: 10, w: 19, h: 10, doors: [{ x: 18, y: 14 }] },
  { floor: 1, key: "library",   kind: "library",   x: 0, y: 19, w: 19, h: 9,  doors: [{ x: 18, y: 23 }] },
  /* ⚠️⚠️⚠️ ZIP 439 — CES TROIS PIÈCES ONT CHANGÉ DE MÉTIER, ET C'EST LA
     CORRECTION NARRATIVE DE CE ZIP. Jusqu'au 438, l'étage du tribunal portait un
     « 🗺️ Cadastre », un « 📐 Bureau des permis » et un « 💍 État civil » —
     c'est-à-dire les MÊMES trois services, avec les MÊMES emojis, que le
     cadastre, le géomètre et la salle des mariages de l'hôtel de ville ouvert
     dans le même zip. Deux bâtiments promettaient de vendre les mêmes parcelles
     et de célébrer les mêmes unions ; le seul annuaire de la ville (le panneau
     du tribunal) envoyait au palais de justice pour un guichet qui a sa pièce en
     face. Une promesse tenue à un endroit devient un mensonge à l'autre.
     ⚠️ LE PARTAGE EST DÉSORMAIS CELUI DU RÉEL, et il se dit en une ligne : LA
     MAIRIE EST CE QU'ON DEMANDE, LE TRIBUNAL EST CE QUI SE TRANCHE. On choisit
     sa parcelle au cadastre de la mairie ; on signe l'acte chez le notaire du
     tribunal. Les deux bâtiments ne se doublent plus, ils s'ENCHAÎNENT — et cet
     enchaînement est exactement la forme des « commissions » réclamées au §13 de
     CLAUDE.md : une course à deux étapes, dans deux endroits, qui donne une
     raison d'aller de l'un à l'autre.
     ⚠️ Et `notary` RESTE au tribunal : un contrat entre joueurs se fait
     authentifier, il ne se demande pas à un guichet. Sa description ne parle
     plus de « vendre des parcelles » mais de signer ce que le cadastre a
     réservé. */
  { floor: 1, key: "prosecutor", kind: "office",   x: 27, y: 0, w: 19, h: 9,  doors: [{ x: 27, y: 4 }] },
  { floor: 1, key: "mediation",  kind: "meeting",  x: 27, y: 8, w: 19, h: 8,  doors: [{ x: 27, y: 11 }] },
  { floor: 1, key: "notary",     kind: "office",   x: 27, y: 15, w: 19, h: 7, doors: [{ x: 27, y: 18 }] },
  { floor: 1, key: "bailiff",    kind: "counter",  x: 27, y: 21, w: 19, h: 7, doors: [{ x: 27, y: 24 }] },
  // ---------------- SOUS-SOL : ce qu'on garde, et ce qu'on enferme.
  { floor: 2, key: "archives",  kind: "archive",   x: 0, y: 0, w: 19, h: 14, doors: [{ x: 18, y: 7 }] },
  { floor: 2, key: "evidence",  kind: "storage",   x: 0, y: 13, w: 19, h: 15, doors: [{ x: 18, y: 20 }] },
  /* ⚠️ LA PORTE DES CELLULES OUVRE SUR LE COULOIR DE GARDE (y = 9), au sud des
     grilles. À y = 6 elle ouvrait sur une CLOISON entre deux cellules : la
     pièce entière était inaccessible, et seule la porte avait l'air correcte.
     C'est le banc qui l'a vu — de l'extérieur, une porte percée dans un mur
     ressemble à une porte percée dans un mur. */
  { floor: 2, key: "cells",     kind: "cells",     x: 27, y: 0, w: 19, h: 14, doors: [{ x: 27, y: 9 }] },
  { floor: 2, key: "lostfound", kind: "storage",   x: 27, y: 13, w: 19, h: 9, doors: [{ x: 27, y: 17 }] },
  { floor: 2, key: "boiler",    kind: "boiler",    x: 27, y: 21, w: 19, h: 7, doors: [{ x: 27, y: 24 }] },
  /* ═══════════ ZIP 438 — L'HÔTEL DE VILLE. ═══════════════════════════════
     ⚠️ SON PLAN N'EST PAS CELUI DU TRIBUNAL, ET C'EST LE POINT. Le tribunal est
     un couloir bordé de portes closes : c'est ce qu'est un palais de justice,
     et c'est ce qui le rend un peu inquiétant. Une mairie est l'inverse — un
     GRAND HALL public où l'on entre, où l'on lit les affiches, où l'on fait la
     queue au guichet. Les deux pièces du rez-de-chaussée s'ouvrent donc
     LARGEMENT sur ce hall (deux portes chacune), et la salle des cours n'a même
     pas de mur côté hall : c'est une alcôve, on y entre en passant.
     ⚠️ Et l'étage est l'inverse du rez-de-chaussée : trois portes, trois
     pièces où l'on ne va que si on y est invité. C'est ce contraste qui fait
     lire « bâtiment public » plutôt que « niveau de jeu ».
     ───────── rez-de-chaussée (niveau 3) : ce qui est ouvert à tous. */
  { floor: 3, key: "cadastre", kind: "cadastre", x: 0, y: 0, w: 19, h: 15,
    doors: [{ x: 18, y: 5 }, { x: 18, y: 10 }] },
  { floor: 3, key: "civil",    kind: "civil",    x: 0, y: 14, w: 19, h: 14,
    doors: [{ x: 18, y: 19 }, { x: 18, y: 24 }] },
  { floor: 3, key: "prices",   kind: "prices",   x: 27, y: 0, w: 19, h: 15,
    doors: [{ x: 27, y: 5 }, { x: 27, y: 10 }] },
  { floor: 3, key: "welcome",  kind: "counter",  x: 27, y: 14, w: 19, h: 14,
    doors: [{ x: 27, y: 19 }, { x: 27, y: 24 }] },
  /* ───────── étage (niveau 4) : ce qui se décide. */
  /* ⚠️ LES PORTES DE L'ÉTAGE ÉVITENT LES RANGÉES DE COLONNES du couloir (y = 7,
     12, 17, 22, et une case de garde autour). Ce n'est pas une coquetterie : le
     générateur REFUSE de poser un meuble devant une porte, donc une porte mal
     placée ne bloque pas le passage — elle SUPPRIME une colonne ou une étagère,
     en silence, et la pièce s'appauvrit sans que rien ne le dise.
     `render-mairie.mjs` compte ces refus et exige zéro. */
  { floor: 4, key: "council",  kind: "council",  x: 0, y: 0, w: 19, h: 16, doors: [{ x: 18, y: 9 }] },
  { floor: 4, key: "mayor",    kind: "mayor",    x: 0, y: 15, w: 19, h: 13, doors: [{ x: 18, y: 24 }] },
  { floor: 4, key: "cityarch", kind: "archive",  x: 27, y: 0, w: 19, h: 14, doors: [{ x: 27, y: 5 }] },
  { floor: 4, key: "surveyor", kind: "surveyor", x: 27, y: 13, w: 19, h: 15, doors: [{ x: 27, y: 19 }] },
];
/* ═══════════════════════════════════════════════════════════════════════════
   LES CAGES D'ESCALIER. ⚠️ UNE CAGE EST UN LIEU, PAS UN TRAJET — et c'est la
   correction qui a fait passer le banc de contrôle.
   ───────────────────────────────────────────────────────────────────────────
   Premier jet : deux volées (« celle qui monte », « celle qui descend ») et une
   table de liaisons orientées. Résultat immédiat, trouvé par
   tools/verify-vallee.mjs : la liaison RDC → étage arrivait sur la volée
   DESCENDANTE de l'étage, c'est-à-dire nulle part — on montait dans un mur.
   Deux descriptions de la même cage (« la volée du départ » et « la volée de
   l'arrivée ») ne peuvent pas rester d'accord ; c'est le §8 de CLAUDE.md, mot
   pour mot, appliqué à de la géométrie.

   Une cage relie donc DEUX niveaux, au MÊME endroit, et tout le reste se
   déduit : le sens de la volée vient de la comparaison des `alt`, la
   destination vient de « l'autre niveau de ma cage ». Il n'y a plus rien à
   tenir en accord. */
export const COURT_STAIRWELLS = [
  { x: 20, y: 2, w: 2, h: 3, a: 0, b: 1 },   // la cage ouest : rez-de-chaussée ↔ étage
  { x: 24, y: 2, w: 2, h: 3, a: 0, b: 2 },   // la cage est : rez-de-chaussée ↔ sous-sol
  // 438 — la mairie : un seul escalier d'honneur, dans l'axe du hall.
  { x: 22, y: 2, w: 2, h: 4, a: 3, b: 4 },
  /* 441 — l'église : la vis du CLOCHER, et elle n'est pas dans l'axe.
     ⚠️ ELLE EST À L'OUEST PARCE QUE LE CLOCHER EST À L'OUEST SUR LE DESSIN du
     bâtiment (`TOWER_X = 8` dans fermeArt) : un escalier de tribune posé dans
     l'axe de la nef aurait contredit la façade qu'on vient de regarder en
     entrant. C'est la règle des positions dérivées (§4) appliquée entre le
     DEHORS et le DEDANS — les deux doivent raconter le même bâtiment. */
  { x: 8, y: 22, w: 2, h: 4, a: 5, b: 6 },
  /* ⚠️⚠️ 444 — LA SECONDE VOLÉE, DANS LA MÊME TOURELLE MAIS PAS SUR LES MÊMES
     CASES, ET C'EST UN DÉFAUT ATTRAPÉ EN GÉNÉRANT PLUTÔT QU'EN RELISANT.
     Premier jet : `{ x: 8, y: 22, … a: 6, b: 7 }`, c'est-à-dire EXACTEMENT le
     rectangle de la volée du dessous. Le générateur remplit une cage par
     entrée, dans l'ordre de cette table : sur la tribune, la volée MONTANTE
     (vers le beffroi) était donc écrasée par la volée DESCENDANTE (vers la
     nef), posée après. Résultat : on montait de la nef à la tribune et **on ne
     pouvait plus monter au beffroi** — un escalier qu'on voit, qu'on foule, et
     qui ne va nulle part. Rien ne lève, la connexité de la tribune reste
     parfaite, et le seul symptôme est une touche qui ne fait rien.
     ⚠️ Deux volées et un PALIER entre les deux, c'est d'ailleurs ce qu'est une
     tourelle réelle : on ne monte pas d'un trait de la nef au beffroi. Le
     palier de la tribune est assez large pour les deux (x 7..12), et le beffroi
     couvre les deux aussi.
     ⚠️ `COURT_STAIRWELLS` relie DEUX niveaux par entrée, jamais trois — d'où
     deux lignes pour une seule tourelle, et le sens se déduit des `alt`. */
  { x: 11, y: 22, w: 2, h: 4, a: 6, b: 7 },
];
export const COURT_ENTRY = { x: 22, y: 27 };  // le seuil, deux cases (x et x+1) au mur sud du RDC
export const COURT_SPAWN = { x: 22.5, y: 25 }; // où l'on se retrouve en entrant
/* ⚠️ 438 — LES BÂTIMENTS DE L'INTÉRIEUR. `entry`/`spawn` sont donnés en
   coordonnées de NIVEAU (le générateur y ajoute l'origine du niveau), `town`
   nomme la constante du bâtiment en ville — c'est elle, et elle seule, qui dit
   où l'on ressort. Une position de sortie écrite en dur serait la divergence en
   attente du §8 : le jour où l'hôtel de ville bouge, on ressortirait dans un
   pré. */
export const COURT_BUILDINGS = {
  court: { ground: 0, floors: [0, 1, 2], entry: { x: 22, y: 27 }, spawn: { x: 22.5, y: 25 } },
  hall:  { ground: 3, floors: [3, 4],    entry: { x: 22, y: 27 }, spawn: { x: 22.5, y: 25 } },
  church: { ground: 5, floors: [5, 6, 7], entry: { x: 22, y: 27 }, spawn: { x: 22.5, y: 25 } },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 441 — L'ÉGLISE : UNE NEF, UN CHŒUR, UNE TRIBUNE D'ORGUE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume, laissée en chantier ouvert au 440 : « l'église doit
   recevoir un intérieur soigné avec un ORGUE, en décor de haute tenue plus
   ambiance jouable (s'asseoir, un cierge, jouer l'orgue), SANS SERVICE. »
   Plan arrêté avec lui au 441 : deux niveaux (nef + tribune), l'orgue en
   tribune, les cierges PARTAGÉS et arbitrés par l'hôte.

   ⚠️⚠️ CE PLAN N'EST PAS FAIT DE `COURT_ROOMS`, ET C'EST TOUT LE SUJET. Le
   tribunal et la mairie sont des COULOIRS BORDÉS DE PIÈCES : leur générateur
   découpe des rectangles, pose des portes, meuble par `kind`. Une église est
   l'inverse exact — UN SEUL VOLUME, dont tout le sens tient dans la façon dont
   on le TRAVERSE : on entre au sud, on remonte une allée entre deux rangs de
   bancs, on arrive au chœur. Lui appliquer le moule des pièces aurait donné une
   nef coupée en bureaux, c'est-à-dire le contraire d'une église. C'est la leçon
   du 439 poussée d'un cran : *ce qui sépare un hall d'un couloir n'est pas son
   mobilier, c'est son vide* — ce qui fait une nef, c'est sa PERSPECTIVE.

   ⚠️ ELLE EST DONC PLUS ÉTROITE QUE LES DEUX AUTRES, et c'est délibéré. Les
   niveaux existants remplissent les 46 cases ; l'église en occupe 34 (x = 6 à
   39) et laisse le reste en `CT_VOID` — qui n'est jamais dessiné et toujours
   bloquant, donc il n'y a rien à ajouter pour ça. Une église est étroite et
   HAUTE ; la hauteur ne se montre pas d'en haut, l'étroitesse si. Un vaisseau
   de 46 cases de large aurait été une halle.

   ⚠️ TOUTES LES POSITIONS SE DÉRIVENT DE `CHURCH.axis` ET DES BANDES ci-dessous
   (règle du 433/439 : une position réglée à la main est une position qui
   penchera). Les bandes se lisent d'ouest en est et FONT la largeur :
     mur · bas-côté · colonnade · bancs · ALLÉE · bancs · colonnade · bas-côté · mur
   ═══════════════════════════════════════════════════════════════════════════ */
export const CHURCH = {
  x0: 6, x1: 39,                 // murs ouest et est (compris)
  aisleW: 4,                     // largeur de l'allée centrale, en cases
  pewW: 8,                       // largeur d'un bloc de bancs
  sideW: 5,                      // largeur d'un bas-côté
  chancelY: 6,                   // dernière rangée du chœur (l'estrade va de 2 à 6)
  naveY0: 9, naveY1: 24,         // première et dernière rangée de bancs
  pewStep: 2,                    // une rangée de bancs sur deux — l'autre est le passage
  colStep: 4,                    // une colonne toutes les quatre rangées
  loftY0: 22, loftY1: 26,        // la tribune, au-dessus du narthex
  /* ⚠️ 444 — LE BEFFROI. Il ne couvre QUE la cage du clocher, pas la largeur de
     la tribune : au-dessus d'une tribune il n'y a rien — c'est le vide du
     vaisseau, et `CT_VOID` le dit mieux qu'un mur (leçon de la poche murée
     trouvée sur la planche du 441). Ses rangées englobent le palier de la vis
     (`COURT_STAIRWELLS`, y 22..25) : un palier plus court laisserait la
     dernière marche entourée de vide, praticable et visiblement en l'air. */
  /* ⚠️ LES BORNES LAISSENT LA PLACE AUX MURS, ET LE PREMIER JET NE LE FAISAIT
     PAS : à 20..27, le mur SUD tombait en `y0 + 28`, c'est-à-dire dans les trois
     rangées de vide qui séparent deux niveaux empilés — il était écrit hors de
     son étage, sans qu'aucune erreur ne soit levée, et le beffroi n'avait que
     trois murs. Un niveau va de `y0` à `y0 + COURT_FLOOR_H - 1` : une enceinte
     doit donc tenir dans 1..26. */
  towerY0: 19, towerY1: 26,      // le beffroi, au-dessus de la cage du clocher
  towerW: 10,                    // sa largeur, depuis le mur ouest
};
/* ⚠️ LES BANDES SE DÉDUISENT, ELLES NE SE RECOPIENT PAS. `axis` est le milieu
   du bâtiment ; tout le reste s'en écarte symétriquement. Le jour où l'on
   élargit l'allée, les bancs, les colonnes, l'autel, le tapis et la tribune
   suivent — c'est exactement le défaut de symétrie payé au 433 et au 439. */
export function churchBands() {
  const inner0 = CHURCH.x0 + 1, inner1 = CHURCH.x1 - 1;
  const axis = (CHURCH.x0 + CHURCH.x1 + 1) / 2;          // 23 : le milieu, entre deux cases
  const aisle0 = Math.round(axis - CHURCH.aisleW / 2), aisle1 = aisle0 + CHURCH.aisleW - 1;
  return {
    axis,
    inner0, inner1,
    aisle0, aisle1,
    pewW0: aisle0 - CHURCH.pewW, pewW1: aisle0 - 1,      // bloc de bancs ouest
    pewE0: aisle1 + 1, pewE1: aisle1 + CHURCH.pewW,      // bloc de bancs est
    colW: aisle0 - CHURCH.pewW - 1,                      // colonnade ouest
    colE: aisle1 + CHURCH.pewW + 1,                      // colonnade est
    sideW0: inner0, sideW1: aisle0 - CHURCH.pewW - 2,    // bas-côté ouest
    sideE0: aisle1 + CHURCH.pewW + 2, sideE1: inner1,    // bas-côté est
  };
}
/* Les cierges du bas-côté ouest. ⚠️ LEUR NOMBRE EST LA SEULE CHOSE QUI CIRCULE
   SUR LE RÉSEAU pour cette scène (voir `churchCandles` côté partagé) : on
   diffuse un COMPTE, jamais une liste de positions — les emplacements se
   déduisent du plan, comme l'altitude d'un joueur en ville se lit sous ses
   pieds (§3 de CLAUDE.md : ce qui peut se déduire ne se diffuse pas). */
export const CHURCH_CANDLE_MAX = 12;
/* ⚠️ LE MORCEAU D'ORGUE EST UN FICHIER À FOURNIR, ET SON ABSENCE SE DIT. Décision
   de Guillaume au 441 : un vrai morceau, pas une synthèse. Tant que le fichier
   n'est pas là, la scène se joue EN ENTIER (on s'assoit, les mains bougent, les
   notes montent) et le jeu annonce que la registration est muette — plutôt que
   de laisser croire à une touche cassée, qui est le défaut nommé au 426 et
   repris au 438. `playFile` avale déjà un 404 sans lever : c'est précisément ce
   silence-là qu'il ne faut pas laisser passer pour un fonctionnement normal. */
export const CHURCH_ORGAN_SRC = "/sounds/church-organ.mp3";
export const CHURCH_ORGAN_MS = 26000;   // durée jouée avant de se relever tout seul
export const COURT_ELEV_PX = 6;   // relief de l'estrade, en pixels d'écran
// Les services annoncés, dans l'ordre du panneau d'affichage du hall. Le libellé
// et le détail vivent dans fermeStrings (courtRoom*), jamais ici : ce tableau
// dit QUOI et OÙ, pas comment ça se raconte.
export const COURT_BOARD_ORDER = ["courtroom", "prosecutor", "mediation", "notary", "bailiff", "clerk", "archives", "lostfound", "evidence", "cells"];
/* ⚠️ ZIP 439 — LA MAIRIE A ENFIN SON ANNUAIRE. Au 438 elle n'en avait aucun :
   ses huit portes ne se lisaient qu'une par une, pendant que le tribunal, lui,
   affichait un récapitulatif — et ce récapitulatif était le SEUL de la ville,
   donc il faisait autorité sur des guichets qui n'étaient pas chez lui.
   L'accueil vient en tête parce que c'est le seul endroit où quelqu'un répond. */
export const HALL_BOARD_ORDER = ["welcome", "prices", "cadastre", "civil", "mayor", "council", "surveyor", "cityarch"];
/* ⚠️⚠️ ZIP 439 — LES GUICHETS QUI RÉPONDENT DÉJÀ. Sans cette liste, la plaque
   de la salle des cours disait « bientôt opérationnel » suivi, dans la MÊME
   bulle, de « c'est le seul guichet de la ville qui fonctionne déjà ». Le seul
   service qui marchait était annoncé comme ne marchant pas.
   ⚠️ C'est une LISTE et pas un test dérivé, et c'est assumé : « ce guichet
   répond-il » ne se déduit d'aucune autre donnée du plan aujourd'hui. Le jour où
   une pièce ouvre, on l'ajoute ICI et la plaque, le panneau et l'annuaire
   changent ensemble — c'est précisément ce qu'on veut d'un doublon : qu'il n'y
   en ait qu'un. */
export const COURT_ROOMS_LIVE = ["prices", "welcome"];

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — LES ÉLECTIONS MUNICIPALES, TOUS LES TRENTE JOURS.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « Tous les trente jours, élections municipales. Les
   résidents votent et élisent un maire. »
   ⚠️⚠️ AUCUN ÉTAT, AUCUN SCHÉMA, AUCUN OCTET SUR LE RÉSEAU. Le mandat est une
   PURE FONCTION DU NUMÉRO DE JOUR, comme le jour de marché, le jour de service
   de Carla, le jour d'orage et les cours du marché — le patron est écrit quatre
   fois dans ce dépôt, c'est le cinquième. Deux joueurs voient donc le même
   maire par construction, sans qu'on ait rien à réconcilier ni à faire arbitrer
   par l'hôte, et le résultat survit à une déconnexion parce qu'il n'a jamais
   été stocké nulle part.
   ⚠️⚠️⚠️ ET LE VIVIER DE CANDIDATS EST FIXE, PAS LE ROSTER — C'EST LA DÉCISION
   ANTI-EXPLOIT DE CE BLOC. Tirer le maire dans la liste des résidents de la
   ferme aurait paru plus riche et aurait été une faille : accueillir ou
   renvoyer un résident aurait RETIRÉ le maire en cours de mandat, et un joueur
   qui n'aime pas le résultat n'aurait eu qu'à faire tourner sa population
   jusqu'à obtenir celui qu'il veut. Pire, l'histoire ne tiendrait pas : le
   maire élu il y a vingt jours changerait rétroactivement le jour où l'on
   accueille quelqu'un. Les candidats sont donc des figures de la VILLE, cinq,
   écrites ici une fois pour toutes.
   ⚠️⚠️ LES RÉSIDENTS VOTENT QUAND MÊME, ET LEURS VOIX SONT COMPTÉES — mais
   l'écart entre le premier et le second est CONSTRUIT pour dépasser le nombre
   maximal de résidents (voir `mayorBallot`). Autrement dit : on voit pour qui
   ses gens ont voté, ça compte vraiment dans le dépouillement affiché, et ça ne
   peut pas renverser l'élection. C'est le seul arrangement qui soit à la fois
   honnête (rien n'est faux à l'écran) et infalsifiable. Le jour où l'on VEUT
   qu'un joueur pèse — une quête de campagne électorale — il suffira de lui
   donner de quoi franchir cet écart, et le mécanisme est déjà là.
   ⚠️ Le maire ne « prend ses fonctions » nulle part : il est simplement celui
   du mandat courant. Rien à initialiser, rien à migrer, et une partie ouverte
   au jour 400 a un maire tout de suite. */
export const MAYOR_TERM_DAYS = 30;
export const MAYOR_VOTE_BASE = 40, MAYOR_VOTE_SPAN = 60;  // les voix de la ville
/* ⚠️⚠️ HORS-ZIP 2026-09-02 — `fem` DIT CE QUE LE PRÉNOM DISAIT DÉJÀ, ET
   PERSONNE NE L'AVAIT ÉCRIT. `fermeStrings` nomme **Odile** Vasseur, **Séverine**
   Bonnefoy et **Ninon** Delaunay depuis le 480 — trois maires sur cinq — pendant
   que le bureau ne savait dessiner qu'un homme et que les didascalies disaient
   « Il ouvre un registre, y note quelque chose ». Le nom, le corps et le texte
   racontaient donc trois choses différentes du même personnage.
   ⚠️ CE DRAPEAU EST LU À DEUX ENDROITS ET UN SEUL LE DÉCIDE : `MAYOR_LOOKS`
   (`maireBureau.js`) pour le corps, `MAIRE_FR_F` (`fermeStrings.js`) pour le
   texte. `verify-maire` vérifie que les trois tables portent les MÊMES clés et
   le MÊME sexe — sans quoi on obtiendrait une maire au corps de femme qui parle
   au masculin, c'est-à-dire l'état d'avant, à moitié corrigé. */
export const TOWN_CANDIDATES = [
  { key: "vasseur",  emoji: "🌾", fem: true },   // l'eau et les champs
  { key: "lantier",  emoji: "🔨" },              // les travaux, les ponts, les chemins
  { key: "bonnefoy", emoji: "⚖️", fem: true },   // l'ordre et les comptes
  { key: "delaunay", emoji: "🌊", fem: true },   // le lac, le parc, les promenades
  { key: "toussaint", emoji: "📚" },             // l'école et les archives
];
/* Le sexe d'un maire, par sa clé. ⚠️ UNE FONCTION PLUTÔT QU'UNE LECTURE DIRECTE :
   la table est un tableau, pas un dictionnaire, et six appelants qui refont le
   `find` chacun de leur côté sont six occasions d'oublier le repli. */
export function mayorIsFem(key) {
  const c = TOWN_CANDIDATES.find((x) => x.key === key);
  return !!(c && c.fem);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — L'ACCUEIL DE L'HÔTEL DE VILLE, ET LA TABLE DES SUJETS.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « poste un nouveau PNJ à l'accueil de l'hôtel de
   ville. Elle dira bonjour, que puis-je faire pour vous ? et ça ouvre un
   panneau de choix de réponses à lui envoyer. […] Je veux des éléments qui
   permettent le développement d'une quête future. Il faut que les mécaniques
   préexistent pour permettre une conception de quête intéressante. »
   ⚠️⚠️ CE QUI PRÉEXISTE N'EST PAS LE DIALOGUE, C'EST CETTE TABLE. Un dialogue
   écrit en `if` imbriqués dans le composant est un dialogue qu'on ne peut pas
   étendre sans le relire en entier. Ici, UNE QUÊTE = UNE LIGNE : une clé, un
   emoji, le panneau qu'elle ouvre, et éventuellement une garde `when` qui
   décide si le sujet est proposé. Le reste — l'affichage, la fermeture, le
   retour au menu, la traduction — est déjà écrit et ne bougera plus.
   ⚠️⚠️⚠️ ET AUCUN SUJET NE DONNE QUOI QUE CE SOIT. C'est la règle dure de ce
   bloc, et elle est là pour une raison précise : un panneau de dialogue
   s'ouvre à volonté, avec E, sans limite et sans arbitrage de l'hôte. Le jour
   où un sujet rendrait de l'or, une denrée ou un objet, il suffirait de
   marteler E devant l'hôtesse. Tout ce qui est ici est donc de l'INFORMATION
   (ce qu'on lit) ou une DATE DÉRIVÉE (un rendez-vous, qui est une pure
   fonction du jour comme le reste). Une quête qui devra RÉCOMPENSER passera
   par une requête arbitrée par l'hôte, comme la vente au marché — le dialogue
   n'est que la porte, jamais la caisse.
   ⚠️ `when` reçoit `{ day, mayor, residents, shared }` : de quoi ouvrir un
   sujet un jour donné, sous un maire donné, ou quand la ferme a atteint tel
   état. C'est exactement ce qu'il faut pour dater une quête sans inventer un
   calendrier, et ça ne coûte rien tant que personne ne s'en sert. */
export const HALL_CLERK_R = 2.4;      // tuiles : à quelle distance elle vous salue
export const HALL_TOPICS = [
  { key: "mayor",    emoji: "🎩", panel: "mayor" },
  { key: "election", emoji: "🗳️", panel: "election" },
  { key: "registry", emoji: "📇", panel: "registry" },
  { key: "prices",   emoji: "📈", panel: "prices" },
  { key: "where",    emoji: "🧭", panel: "where" },
  { key: "wedding",  emoji: "💍", panel: "soon" },
  { key: "land",     emoji: "🗺️", panel: "soon" },
  /* ⚠️⚠️ ZIP 444 — LA LIGNE DE L'ENQUÊTE EST PARTIE, ET LA QUÊTE DE L'ÉTOILE
     N'EN MET PAS UNE À LA PLACE. C'est une décision de THÈME, pas un oubli : la
     quête de l'étoile est SECRÈTE (voir `quete.js`), personne d'autre ne la
     voit, et une hôtesse de mairie qui en parlerait la ferait exister pour la
     ville. Le 442 avait ajouté ce sujet parce qu'il craignait qu'une histoire
     n'existe que pour qui ouvre le bon panneau — crainte juste, réponse
     coûteuse. La quête de 444 la règle autrement : elle **tombe du ciel**,
     personne n'a rien à trouver pour la commencer, donc elle n'a besoin
     d'aucun point d'entrée. La table reste ce que le 439 promettait : une quête
     future = une ligne, le jour où une quête aura besoin d'une porte. */
  /* Un sujet qui n'apparaît QUE le jour du scrutin : il ne sert à rien
     aujourd'hui, et c'est précisément la démonstration que la garde marche.
     Une quête datée s'écrira exactement comme cette ligne. */
  { key: "ballot",   emoji: "🗳️", panel: "election", when: (c) => c.electionToday },
  /* ╔═════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — ET VOILÀ LA LIGNE QUE LE 439 ATTENDAIT.
     ╚═════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ « Une quête future = une ligne dans cette table, pas une ligne dans le
     panneau. » C'était la promesse du 439, et le 444 l'avait déclinée exprès (la
     quête de l'étoile est SECRÈTE, une hôtesse qui en parlerait la ferait exister
     pour la ville). Ce zip la prend enfin, et sans casser le secret : Léonie ne
     sait rien d'une étoile, elle sait qu'on lui demande un ARCHITECTE NAVAL. Des
     fermiers qui veulent un bateau, c'est une lubie de riches, pas un mystère.
     ⚠️ LA GARDE EST L'ÉTAT DE LA QUÊTE, ce qui fait que le sujet n'apparaît QUE
     pour qui a rencontré l'étoile — un joueur qui n'a rien commencé ne verra
     jamais cette ligne, donc le secret tient même à deux.
     ⚠️⚠️ ET C'EST LE PREMIER SUJET QUI DÉBOUCHE SUR UNE `req`. Le chapeau du
     panneau dit « aucun sujet ne donne rien » et il reste vrai : celui-ci ne
     DONNE pas, il PREND (24 000 or, des récoltes, des poissons) et c'est l'hôte
     qui arbitre. La porte n'est toujours pas la caisse. */
  { key: "engineer", emoji: "📐", panel: "engineer",
    when: (c) => !!(c.shared && c.shared.star && c.shared.star.found && c.shared.star.found.crater) },
];
/* Le rendez-vous chez le maire : il reçoit un jour sur sept du mandat. ⚠️ PURE
   FONCTION, encore : « quand puis-je le voir ? » a la même réponse chez les
   deux joueurs sans qu'on diffuse un calendrier. */
export const MAYOR_AUDIENCE_EVERY = 7;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 439 — LE PONT SE FRANCHIT PAR-DESSUS, PLUS AU TRAVERS.
   ───────────────────────────────────────────────────────────────────────────
   Retour de Guillaume : « LE PONT. Il doit être praticable, pour l'instant on
   le traverse. » Le diagnostic tient en une phrase : les deux ponts de Valley
   Town sont un SPRITE de 81×54 posé comme un décor à une case, et le tablier
   praticable est une bande de planches plates dessinée à côté. Le sprite est
   ancré deux rangées sous la rangée nord du tablier ; un joueur qui marche sur
   cette rangée-là a donc une clé de tri INFÉRIEURE à celle du pont et se
   dessine DERRIÈRE l'ouvrage — il disparaît dedans. Sur la rangée sud, les
   deux clés sont égales et l'ordre dépend de l'ordre d'insertion (§4 : « un
   ordre de dessin ne se fonde pas sur la stabilité du tri »).
   ⚠️⚠️ LA CORRECTION N'EST PAS UN RÉGLAGE DE TRI, C'EST UNE ALTITUDE. Un pont
   en dos d'âne se traverse en MONTANT : si le tablier ne monte pas, aucun ordre
   de dessin ne fera croire qu'on est dessus plutôt que devant. On donne donc au
   tablier un profil d'arc, en pixels d'écran, et le personnage le reçoit comme
   il reçoit l'altitude d'une case — exactement le mécanisme du saut de rebord
   (`TOWN_JUMP_ARC_PX`), qui exprime déjà sa cloche en altitude FRACTIONNAIRE.
   ⚠️⚠️⚠️ ET ELLE NE TOUCHE PAS LA COLLISION, C'EST LA CONTRAINTE DURE. Passer
   l'arc dans `playerElevTown` aurait été plus court de trois lignes — et aurait
   rendu le pont INFRANCHISSABLE : cette fonction sert aussi à `canStandTown`,
   qui refuse tout pas dont le dénivelé dépasse TOWN_STEP_MAX. On aurait
   fabriqué un mur en voulant dessiner une bosse. L'arc est une grandeur de
   DESSIN, il vit dans un chemin de dessin, et le banc vérifie les deux.
   ⚠️ Le profil retombe à ZÉRO à ses deux bouts (7 cases : 0 · ¼ · ¾ · 1 · ¾ ·
   ¼ · 0). Un arc qui s'arrête à mi-hauteur laisse une marche de trois pixels au
   raccord avec le chemin, c'est-à-dire le défaut de grille qu'on passe son
   temps à corriger ailleurs. */
export const TOWN_BRIDGE_ARCH_PX = 7;    // px : la flèche de l'arc, au sommet
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 440 — LA PORTÉE D'UN PONT EST UN SEUL NOMBRE, ET IL EST DÉRIVÉ DU SPRITE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE QU'ON CORRIGE, ET C'EST LE §8 DE CLAUDE.md TEL QUEL : la même portée
   était décrite à TROIS endroits qui ne se parlaient pas —
     1. la largeur de l'ouvrage DESSINÉ (81 px de sprite, soit 5 cases) ;
     2. la largeur du TABLIER posé par le générateur (5 cases au lac, mais 7 au
        parc, parce que là-bas elle épousait la nappe d'eau) ;
     3. la portée de l'ARC (`TOWN_BRIDGE_ARCH_SPAN = 3`, soit 5 cases montées).
   Deux d'entre elles disaient 5, une disait 7, et personne ne les comparait :
   au parc, il restait UNE CASE DE TABLIER NU À CHAQUE BOUT — des planches
   posées sur l'eau, sans garde-corps, sans culée, sans rien. Le 439 l'avait vu
   et l'a excusé en commentaire (« un garde-corps s'arrête sur la culée, il ne
   la couvre pas ») : c'est vrai d'une culée MAÇONNÉE, ça ne l'est pas d'une
   case de planches qui flotte. Guillaume l'a nommé au zip suivant.
   ⚠️ LA PARADE N'EST PAS D'ÉLARGIR LE SPRITE (il vient de la planche, on ne le
   redessine pas) NI DE CHERCHER UNE NAPPE DE LA BONNE LARGEUR (au parc, les
   seules rangées de 5 cases d'eau sont aux DEUX POINTES de l'étang — le pont y
   aurait de l'eau d'un seul côté, ce que le 439 refusait à juste titre). C'est
   de RESSERRER l'eau à la portée de l'ouvrage, comme le 439 CREUSE l'anse du
   lac au lieu de la chercher : un pont se bâtit là où la rive se rapproche, et
   les deux culées qui avancent dans l'eau sont la RAISON qu'il soit là.
   ⚠️ Il n'y a donc plus qu'un nombre, et il n'est pas écrit : la largeur du
   sprite divisée par la case. Le jour où la planche change, la carte suit. */
export const TOWN_BRIDGE_SPAN = Math.round(PLANCHE.archBridge.w / TILE);   // 5 cases
/* ⚠️ Et l'arc se déduit de la portée, il ne se règle plus. Le profil couvre
   `SPAN` cases montées plus une case à zéro de chaque côté (0 · ¼ · ¾ · 1 · ¾ ·
   ¼ · 0 pour une portée de 5) : c'est `cos` qui s'annule à ±SP, donc SP est la
   demi-portée PLUS UN. Écrit à la main, ce 3 était juste par coïncidence. */
export const TOWN_BRIDGE_ARCH_SPAN = (TOWN_BRIDGE_SPAN + 1) / 2;  // cases de part et d'autre du sommet
/* ⚠️⚠️ ET LE SPRITE SE COUPE EN DEUX. Le pont de la planche est déjà dessiné en
   trois-quarts — garde-corps NORD en haut, tablier au milieu, garde-corps SUD en
   bas — mais il était posé comme UN décor, donc entièrement devant ou
   entièrement derrière le passant. Or les deux moitiés n'ont pas la même
   profondeur : le garde-corps du fond est derrière lui, celui du devant est
   devant lui. On le dessine donc DEUX FOIS, avec deux découpes et deux clés de
   tri, et le personnage passe entre les deux. C'est ce sandwich, et lui seul,
   qui fait qu'on marche SUR un pont au lieu de marcher DANS.
   ⚠️ 38 sur 54, c'est la ligne où la main courante du devant commence. Elle est
   mesurée sur le sprite (voir la planche), pas devinée : deux pixels trop haut
   et le tablier passe devant les pieds, deux pixels trop bas et la main courante
   passe derrière la tête. */
export const TOWN_BRIDGE_SPLIT_Y = 38;
/* ⚠️⚠️⚠️ ET LE SPRITE DESCEND D'UNE CASE. C'est la mesure qui a débloqué tout le
   reste, et elle ne se devine pas : elle se lit sur la planche de contrôle.
   Le pont était ancré de façon que la bande de TABLIER du dessin (y = 14 à 38
   sur 54) tombe UNE CASE AU-DESSUS des deux rangées praticables. Autrement dit
   le joueur marchait sur les planches plates pendant que le tablier dessiné
   flottait au-dessus de sa tête : d'où « on le traverse » — il n'y avait aucune
   hauteur à laquelle se tenir qui soit à la fois praticable et dessinée.
   ⚠️ En le descendant de 16 px, la bande de tablier recouvre exactement les deux
   rangées, et le garde-corps du DEVANT tombe une rangée plus au sud — ce qui est
   sa place en trois-quarts : ce qui est plus près du spectateur est plus bas à
   l'écran. Le personnage se retrouve alors DANS l'ouvrage, entre les deux
   garde-corps, ce qui est précisément ce qu'on cherchait. */
export const TOWN_BRIDGE_DROP_PX = 16;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 441 — LA PROFONDEUR SORT DE LA CLOSURE, PARCE QU'ELLE ÉTAIT FAUSSE ET
   QU'AUCUN BANC NE POUVAIT LA REGARDER.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « répare les bugs de traversée des ponts ». Mesuré en
   jouant : sur la rangée NORD du tablier, des DEUX ponts, le fermier était
   intégralement caché par le garde-corps du fond — seule son étiquette de nom
   flottait au-dessus de l'eau. Le 439 avait nommé ce défaut et l'avait corrigé ;
   il est revenu par la porte qu'on venait d'ouvrir pour le corriger.

   ⚠️⚠️ LA CAUSE EST LE §8 DE CLAUDE.md : DEUX GRANDEURS DIFFÉRENTES ÉCRITES
   DANS LE MÊME PARAMÈTRE. `pushE` classe par `wy − altitude × TOWN_ELEV_PX` :
   une altitude monte le dessin ET recule le rang (une terrasse est plus haute
   ET plus loin — c'est juste). Le 439 a versé la FLÈCHE DE L'ARC dans cette
   altitude, alors qu'un dos d'âne monte sans éloigner. Sur la rangée nord, la
   clé du passant valait `pr.y·T − flèche` contre `pr.y·T − 0,02` pour le
   garde-corps du fond : les ±0,02 étaient toute la marge, la flèche vaut
   jusqu'à 7 px, elle la mangeait sur TOUTE la portée.

   ⚠️ ET LES TROIS CLÉS ÉTAIENT ÉCRITES DANS LA CLOSURE DE LA BOUCLE DE RENDU,
   donc invisibles à tout banc (§4.2 : « ce dessin est-il regardable par un
   banc ? » est une question de qualité). Elles sont ici, dérivées les unes des
   autres, et `tools/verify-pont.mjs` les APPELLE au lieu de les recopier.
   Le pixel de décalage, lui, ne passe plus par l'altitude : `pushE` prend un
   `liftPx` qui décale le dessin sans toucher au rang. */
export const TOWN_SORT_EPS = 0.02;
/* La clé de tri commune : profondeur au sol, moins ce que l'altitude remonte à
   l'écran. UNE seule écriture, et les trois fonctions ci-dessous en dérivent. */
export function townDepthKey(worldY, elev) { return worldY - (elev || 0) * TOWN_ELEV_PX; }
/* Les deux moitiés de l'ouvrage. ⚠️ ELLES N'ONT PAS D'ARC DANS LEUR CLÉ et
   c'est délibéré (le sprite porte sa flèche dans son dessin, pas dans son
   rang) : c'est précisément pour ça que le passant ne doit pas en avoir non
   plus, sans quoi les deux côtés de la comparaison ne parlent plus de la même
   chose — le troisième visage du piège n°1 de CLAUDE.md. */
export function townBridgeDepthKeys(propY, elev) {
  return {
    far: townDepthKey(propY * TILE - TOWN_SORT_EPS, elev),
    near: townDepthKey((propY + 1) * TILE + TOWN_SORT_EPS, elev),
  };
}
/* Celle d'un passant (joueur, résident, familier, taxi) ancré au bas de sa
   case. `elev` est l'altitude DE LA CASE, jamais une hauteur d'image. */
export function townWalkerDepthKey(y, elev) { return townDepthKey((y + 1) * TILE, elev); }

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 440 — L'EMPRISE DESSINÉE D'UN DÉCOR, ET POURQUOI LE GÉNÉRATEUR EN A
   BESOIN.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « revoir la cohérence de la composition des éléments
   posés (exemple un arbre sur un pont) ».

   ⚠️⚠️ LE DÉFAUT DE FOND N'EST PAS UN OUBLI, C'EST UNE UNITÉ. Le générateur
   raisonne en CASES : un décor occupe la sienne, on la marque solide, et c'est
   tout. Le rendu, lui, dessine un sprite de 81, 67 ou 62 px CENTRÉ sur cette
   case — donc quatre ou cinq cases de large. Tout ce qui est posé après tombe
   librement dans les quatre cases que le premier COUVRE sans les OCCUPER. Le
   435 avait déjà nommé exactement ça pour les arbres du lac (« ce qui manquait
   n'était pas le test, c'était la distinction entre la case d'un décor et la
   surface qu'il COUVRE ») et l'avait corrigé pour un cas ; c'est la règle
   générale qui manquait.

   ⚠️ CETTE TABLE EST DONC LA SEULE CHOSE QUI RELIE UN `kind` DE PROP À SA
   TAILLE, et elle ne redit pas la taille : elle nomme le dessin, et la taille
   se lit dans `PLANCHE`. Le jour où la planche est réimportée avec un pont plus
   large, le générateur cesse tout seul de planter dessous.
   ⚠️ CE QUI N'Y EST PAS Y EST DÉLIBÉRÉMENT ABSENT : les décors PROCÉDURAUX
   (étal, kiosque, fontaine, statue, puits, tombe…) ne viennent pas de la
   planche, donc leur taille n'est lisible nulle part hors de `fermeArt`. Ils
   comptent pour une case, comme avant. Les inscrire ici en recopiant leur
   largeur à la main serait exactement le paramètre qui double un paramètre du
   §8 — on préfère un trou déclaré à un doublon silencieux, et `verify-compo`
   imprime la liste de ce qu'il ne sait pas mesurer.
   ⚠️ La boucle de rendu garde sa propre chaîne `kind → sprites.townXxx` : c'est
   un doublon, il est connu, et `verify-compo` échoue si le générateur émet un
   `kind` de la planche que cette table ignore. */
export const TOWN_PROP_ART = {
  archBridge: "archBridge", fence: "fence", woodBox: "woodBox", lowWall: "lowWall",
  stoneBlock: "stoneBlock", stoneBench: "benchStone", bench: "benchWood",
  benchWall: "benchWall", hangLamp: "hangLamp", stepStones: "stones",
  chest: "chest", bucket: "bucket", rod: "rod", potReeds: "potReeds",
  flowerTrough: "flowerTrough", bonsai: "bonsai", roseBox: "roseBox",
  potPink: "potPink", oilLamp: "oilLamp", table: "tableSet",
  goldBush: "goldBush1", lavender: "lavender1", clump: "flowersPurple",
  lily: "lilyPads", reedTuft: "reeds", reedsWater: "reedsWater",
  hedgeRow: "hedgeRow", grassTuft: "grassTuft", flatStone: "flatStone",
  /* ⚠️ ZIP 447 — les décors de la SECONDE planche. Même table, même mécanique :
     c'est `townPropBox` qui va chercher dans l'une puis l'autre. */
  bloomBed: "flowerBedL", bloomBed2: "flowerBedR",
  bloomRow: "flowerRow", rockBed: "rockBed", hedgeAngle: "hedgeCorner",
};
/* L'emprise d'un décor, en cases, dans le repère du monde : le sprite est
   dessiné centré en x sur `pr.x` et POSÉ par le bas sur `pr.y + 1` (voir la
   boucle de rendu). Rendue en flottant — c'est l'appelant qui décide de son
   seuil de recouvrement, et il n'y en a qu'un dans le projet (voir
   `townPropCovers`). */
export function townPropBox(kind, x, y) {
  /* ⚠️ ZIP 447 — L'EMPRISE SE CHERCHE DANS LES DEUX PLANCHES. Un décor de la
     seconde qui n'aurait pas trouvé son sprite ici serait retombé sur la boîte
     d'UNE case : le générateur l'aurait cru minuscule et aurait semé un arbre
     dedans. C'est exactement le défaut du §4 (« la case d'un décor n'est pas la
     surface qu'il couvre »), qu'un `|| {}` silencieux aurait ramené. */
  const a = TOWN_PROP_ART[kind], s = a && (PLANCHE[a] || PLANCHE2[a]);
  if (!s) return { x0: x, x1: x + 1, y0: y, y1: y + 1 };
  const hw = s.w / (2 * TILE);
  return { x0: x + 0.5 - hw, x1: x + 0.5 + hw, y0: y + 1 - s.h / TILE, y1: y + 1 };
}
/* ⚠️ UNE CASE EST COUVERTE QUAND LE SPRITE EN PREND LA MOITIÉ, et ce seuil est
   le seul du projet. Sans lui, un sprite de 81 px centré sur une case « touche »
   sept cases (il déborde de 0,03 case de chaque côté) et on interdirait de
   planter deux cases trop loin ; avec un seuil à zéro on retomberait sur la
   case unique qu'on corrige. À la moitié, l'emprise mesurée d'un pont de 81 px
   vaut exactement les cinq cases de son tablier — vérifié par le banc. */
export function townPropCovers(kind, px, py, x, y) {
  const b = townPropBox(kind, px, py);
  const ox = Math.min(b.x1, x + 1) - Math.max(b.x0, x);
  const oy = Math.min(b.y1, y + 1) - Math.max(b.y0, y);
  return ox >= 0.5 && oy >= 0.5;
}

// --- Seasons (timing chosen by the model, per Guillaume's delegation) ---
// One season lasts SEASON_DAYS in-game days; purely visual for now (tint +
// HUD label), gameplay hooks come later with crops-per-season.
export const SEASON_DAYS = 7;
export const SEASONS = [
  { key: "spring", emoji: "🌸", tint: null },
  { key: "summer", emoji: "☀️", tint: "rgba(255,214,90,0.05)" },
  { key: "autumn", emoji: "🍂", tint: "rgba(224,138,44,0.09)" },
  { key: "winter", emoji: "❄️", tint: "rgba(150,185,255,0.11)" },
];

// --- Zip 235 (Guillaume) ---

// Saisons en TEMPS RÉEL : une saison dure désormais 7 jours réels (demande
// Guillaume : "change the seasons to be once every real 7 days it changes"),
// et n'est plus dérivée du jour de jeu. Ancre fixe (un lundi) pour que tous
// les clients calculent exactement la même saison sans aucune synchro.
// SEASON_DAYS ci-dessus reste utilisé pour la ROTATION HEBDOMADAIRE (en jours
// de JEU) des mondes du passage sombre, voir PASSAGE_WORLDS.
export const SEASON_REAL_MS = 7 * 24 * 60 * 60 * 1000;
export const SEASON_EPOCH = Date.UTC(2026, 0, 5); // lundi 5 janvier 2026, 00:00 UTC -> printemps

// Hiver : il neige (flocons plein écran, même mécanique que la pluie d'orage)
// et les léopards des neiges REMPLACENT les loups (même comportement, sprite
// reteinté blanc à rosettes, voir snowLeopardSprite/fermeArt.js).
export const SNOW_COUNT = 90;        // flocons affichés simultanément
export const SNOW_SPEED = 60;        // vitesse de chute, px/s écran
// Automne : les visiteurs veulent plus de citrouilles (biais de tirage de la
// culture demandée, voir classifyBuyOffer) ; feuillages orange (variantes de
// sprites, voir fermeArt.js).
export const AUTUMN_PUMPKIN_BIAS = 0.55; // proba de forcer la citrouille quand elle est candidate
export const PUMPKIN_CROP_ID = 3;
// Printemps : fleurs décoratives sur l'herbe (purement visuel, hash de case),
// fruits (pommes) sur une partie des chênes (E pour cueillir, 1x/jour réel
// par arbre) et buissons à baies posés par l'hôte (E = cueillir des baies,
// hache = bois). Baies et fruits sont des objets d'inventaire vendables au bac.
/* ⚠️⚠️ ZIP 398 — COLLISION D'IDENTIFIANT RÉPARÉE : O_BERRY_BUSH VALAIT 19,
   COMME O_SUCRERIE (voir plus haut, ligne ~130).
   ---------------------------------------------------------------------------
   Trouvée en cherchant un identifiant libre pour les vergers, par un contrôle
   de trois lignes (`tools/verify-objects.mjs`) — jamais en relisant : les deux
   déclarations sont à 2 500 lignes l'une de l'autre, chacune parfaitement
   correcte prise seule.

   CE QU'ELLE PRODUISAIT, et c'était silencieux :
     * `world.objects[i]` ne pouvait plus distinguer une sucrerie d'un buisson.
       `resolveBerryPick` teste `objects[i] !== O_BERRY_BUSH` : on pouvait donc
       CUEILLIR DES BAIES SUR LA SUCRERIE ;
     * le semeur de printemps compte les buissons existants avec le même test :
       une sucrerie posée réduisait d'autant le nombre de buissons de la saison ;
     * et le rendu dessinait l'un ou l'autre selon l'ordre des branches.

   POURQUOI C'EST LE BUISSON QUI DÉMÉNAGE, ET PAS LA SUCRERIE. `O_SUCRERIE` est
   déclaré LEGACY (zips 317-324) : d'anciennes sauvegardes contiennent encore
   des 19 qui désignent des sucreries, et les relire comme des buissons ferait
   disparaître un bâtiment payé 30 000 or. Les buissons, eux, sont du décor
   SAISONNIER que l'hôte repose chaque printemps jusqu'à BERRY_BUSH_MAX : au
   pire, une sauvegarde d'avant le 398 en perd quelques-uns, et la prochaine
   saison les remet. On déplace donc ce qui se répare tout seul.

   AUCUNE MIGRATION SUPABASE : ces valeurs vivent dans l'instantané JSON. */
export const O_BERRY_BUSH = 20;      // buisson à baies (printemps), hache = bois, E = baies
/* ZIP 398 — LES VERGERS : cultures PÉRENNES, plantées une fois.
   Demande de Guillaume : « des arbres fruitiers qui demeurent, produisent
   périodiquement des fruits mais ne nécessitent pas de replanter ». */
export const O_ORCHARD = 21;
export const BERRY_BUSH_MAX = 14;    // nombre max de buissons posés par l'hôte au printemps
export const BERRY_BUSH_HP = 2;
export const BERRY_BUSH_WOOD = 2;    // bois récolté en l'abattant
export const BERRY_PICK_MIN = 2;     // baies par cueillette (min..max)
export const BERRY_PICK_MAX = 4;
export const BERRY_SELL = 25;        // prix de vente d'une baie au bac
export const FRUIT_PICK_N = 2;       // pommes par cueillette d'arbre
export const FRUIT_SELL = 18;        // prix de vente d'une pomme au bac
export const FRUIT_TREE_MOD = 3;     // 1 chêne sur FRUIT_TREE_MOD (hash de case) porte des fruits au printemps

// --- Mondes tournants du passage sombre (zip 235, demande Guillaume :
// "every new week (game time) it rotates to a new land, similar to Folk of
// the Faraway Tree"). L'index de monde = floor((jour de jeu - 1) / SEASON_DAYS)
// % PASSAGE_WORLDS.length, donc tout le monde calcule la même rotation depuis
// s.day, sans synchro. Toutes les cartes réutilisent EVIL_SPAWN /
// EVIL_RETURN_PASSAGE (mêmes coordonnées d'arrivée/retour), si bien que toute
// la machinerie existante (fondu, walk-over de retour) marche telle quelle.
// Chaque monde a ses cadeaux/breloques et un animal de compagnie EXCLUSIF à
// attraper (1 tentative réussie par joueur et par semaine, chance
// PASSAGE_PET_CATCH_CHANCE ; l'animal rejoint station.pendingGifts comme les
// cadeaux des visiteurs, en attendant le système d'animaux).
/* --- Zip 385 : CADENCE DE ROTATION (demande Guillaume : « chaque terre reste
   3 jours de jeu »). Jusqu'ici l'index de monde se calculait sur SEASON_DAYS
   (7), constante qui ne sert PLUS QU'À ÇA depuis que les saisons sont passées
   en temps réel au zip 235. On lui donne son propre nom : une rotation de
   monde n'est pas une saison, et les confondre a déjà failli faire changer les
   deux d'un coup.

   ARITHMÉTIQUE, à garder en tête avant de retoucher ce chiffre : 5 mondes x 3
   jours = un cycle de 15 jours de JEU, et un jour de jeu vaut DAY_REAL_MS
   (16 min). Le Pays des Bonbons revient donc environ toutes les 4 h de jeu
   effectif. La demande initiale disait « tous les 10 jours » : ce serait
   PASSAGE_WORLD_DAYS = 2. Le seul chiffre à changer est celui-ci. */
export const PASSAGE_WORLD_DAYS = 3;

/* --- Zip 385 : FORÇAGE DE MONDE, POUR LES ESSAIS. -------------------------
   Quand cette clé n'est pas `null`, le passage sombre mène TOUJOURS au monde
   correspondant, quel que soit le jour de jeu. Demande explicite de Guillaume
   pour ce zip : « make candy land the land that appears upon this next update
   so i can test how its functionality ».

   >>> REMETTRE À null POUR RENDRE LA ROTATION AU JEU. <<<

   C'est la SEULE chose à défaire dans cette livraison, et elle est ici, seule,
   à cet endroit, pour cette raison. Le forçage ne pouvait pas se faire par un
   simple décalage de l'index : la rotation est dérivée de s.day, et chaque
   ferme est à un jour différent — un décalage aurait donné le Pays des Bonbons
   chez Guillaume et les Grottes de Cristal chez son partenaire de jeu, ce qui
   est précisément ce qu'il ne faut pas quand on teste à deux.

   >>> ZIP 392 : REMISE À null, SUR DEMANDE EXPLICITE DE GUILLAUME. <<<
   Elle avait traversé les zips 385, 386, 387 et 388. Ce qu'elle faisait est
   désormais fait, en mieux, par le MENU DÉVELOPPEUR (Cmd/Ctrl+Shift+X) : même
   effet partagé par tous les joueurs, mais réversible d'un clic au lieu d'une
   livraison, et affiché à l'écran tant qu'il est actif.

   Ce que la remise à null rend au jeu, et qu'il faut savoir en le relisant :
   les quatre terres autres que le Pays des Bonbons, le défi de fuite (qui n'est
   accessible que depuis les Terres Maléfiques depuis le zip 386), et la variété
   des familiers de terre rapportés par les visiteurs — sous forçage « candy »,
   seul le renard barbe à papa pouvait être offert (voir passagePetOf).

   Le forçage en dur reste lu par passageWorldIndex, DERRIÈRE le menu : reposer
   une clé ici continue de fonctionner, pour les essais qui doivent survivre à
   un rechargement sans passer par une ferme sauvegardée. */
export const PASSAGE_FORCE_KEY = null;

/* --- Zip 386 : À QUOI MÈNE LE PONT DE CHAQUE TERRE -----------------------
   Jusqu'au zip 385, la chaussée de pierre et sa porte (G_RUN_GATE) étaient
   construites À L'IDENTIQUE sur les six cartes, et menaient partout au défi de
   fuite. Décision Guillaume (zip 386) : **chaque terre a son propre pont, et
   ils ne mènent pas au même endroit.**

   LA GÉOMÉTRIE, ELLE, NE CHANGE PAS D'UN PIXEL. Même tracé, même largeur,
   même case de porte sur les six cartes — seuls l'HABILLAGE (`bridge`) et la
   DESTINATION (`PASSAGE_GATE_DEST`) varient. C'est délibéré et c'est ce qui
   permet à verify-gate.mjs et verify-deck.mjs de continuer à balayer les six
   cartes sans changer de sens : ils vérifient qu'on ARRIVE au bout du pont,
   ce qui reste vrai et reste nécessaire partout.

   `bridge` est lu par drawBridgeTile/drawBridgeOverlay (fermeArt.js).
   Une clé inconnue retombe sur la pierre — un monde ajouté sans habillage
   sera terne, jamais cassé. */
export const PASSAGE_GATE_DEST = {
  evil: "run",      // défi de fuite (zip 372) — sa seule terre depuis le 386
  /* ⚠️ ZIP 411 — LE PONT ARC-EN-CIEL A CHANGÉ DE DESTINATION.
     Il menait au Gourmandin depuis le 386 ; il mène désormais à LA GRANDE
     DESCENTE (public/candyluge/). Le Gourmandin, lui, n'a pas disparu : il a
     déménagé au milieu du lac (voir CANDY_MONSTER_APPROACH). Demande de
     Guillaume, et le déplacement est le chantier — le mini-jeu lui-même n'est
     pas touché d'une ligne. */
  candy: "luge",    // LA GRANDE DESCENTE (zip 411), au bout du pont arc-en-ciel
  maze: "maze",     // LE LABYRINTHE (zip 393), au bout du pont de haies
  /* ⚠️ ZIP 418 — LE PONT DE CRISTAL MÈNE ENFIN QUELQUE PART.
     Il était « construit et habillé, destination à venir » depuis le 386, soit
     trente-deux zips. Il ouvre sur LA VALLÉE DE VERRE (public/crystal/), et ce
     mini-jeu ne ressemble à aucun des trois autres : c'est un récit à
     chapitres, avec des cinématiques et des choix, pas une partie qu'on gagne
     ou qu'on perd. Voir CRY_* plus bas pour ce que ça change. */
  crystal: "vallee", // LA VALLÉE DE VERRE (zip 418), au bout du pont de cristal
  // meadow : pont construit et habillé, destination à venir.
};

/* ==========================================================================
   ZIP 418 — LA VALLÉE DE VERRE (mini-jeu des Grottes de Cristal)
   ==========================================================================
   Quatrième mini-jeu, servi depuis public/crystal/, au bout du pont de
   cristal. Jeu NARRATIF : sept chapitres, des cinématiques en pixel art, des
   choix qui posent des drapeaux, et un segment jouable par chapitre.

   ⚠️ IL NE RAPPORTE PAS UN SCORE, IL RAPPORTE UN AVANCEMENT — et c'est la
   seule chose à comprendre avant de brancher quoi que ce soit. Les trois
   autres mini-jeux ont une fin : on meurt, on gagne, on recommence pour faire
   mieux. Celui-ci a des CHAPITRES : on ne le rejoue pas, on le continue. Coller
   un tableau de scores à la fin d'un chapitre casserait exactement ce qu'on
   essaie de construire.

   ⚠️ CONSÉQUENCE : PAS DE BLESSURE, PAS DE PRIME, PAS ENCORE. Au chapitre 1 on
   ne peut ni mourir ni gagner d'or — il n'y a rien à perdre dans la vallée
   avant qu'on n'y ait des bêtes à perdre (chapitre 3). Les constantes
   ci-dessous existent pour le jour où ce sera le cas, et elles ne sont pas
   encore lues. C'est délibéré et c'est écrit ici pour qu'on ne les croie pas
   branchées.

   ⚠️ LE BUT DU JEU EST DE RAMENER DEUX CHOSES À LA FERME : des animaux
   (renne d'aurore, chevaux de verre, tortue gemme — le familier canon de ce
   monde —, chouette de givre) et UN HOMME, Aubin, qui deviendra un second
   ouvrier à côté de Greg, spécialisé dans la survie des bêtes en hiver.
   ========================================================================== */
export const CRY_SHARD_GOLD = 30;      // or par éclat de givre rapporté
export const CRY_PRIZE_GOLD = 1200;    // fin du récit, UNE FOIS par ferme
export const CRY_MAX_SHARDS = 60;      // plafond anti-message-aberrant, cf. LAB_MAX_*
export const CRY_MAX_CHAPTER = 7;

/* ==========================================================================
   ZIP 393 — LE LABYRINTHE (mini-jeu du Pays du Labyrinthe)
   ==========================================================================
   Troisième mini-jeu, servi depuis public/labyrinth/, au bout du pont de
   haies. Jeu 3D à la troisième personne : on avance à la torche dans un
   dédale de pierre POSÉ SUR LE LAC VIOLET, on trouve une épée, on affronte
   des rôdeurs, on fuit un traqueur increvable, on évite les trous, on
   ressort au nord.

   ⚠️ NE PAS CONFONDRE AVEC `MAZE_PRIZE_GOLD` (zip 235), juste au-dessus :
   celui-là paie le coffre au centre du labyrinthe de HAIES de la carte 2D,
   il est bel et bien lu (voir la requête "mazePrize" dans FermeGame.js), et
   il n'a rien à voir avec le mini-jeu 3D. Les deux coexistent sur la même
   terre : le coffre des haies se ramasse en se promenant, la récompense
   ci-dessous se gagne en traversant le dédale de pierre.

   TROIS DÉCISIONS DE GUILLAUME, prises avant la première ligne de code :
     - épée TROUVÉE dans le labyrinthe (donc on commence désarmé — le
       générateur borne cette période, voir SWORD_MAX_DEPTH côté jeu) ;
     - torche qui SE CONSUME si on ne la ravive pas ;
     - conséquences « comme le défi de fuite » : mort → blessé 10 min, butin
       gardé ; sortie → on ressort au pied du pont, sur la carte du monde
       sombre, avec de l'or.

   LA DURÉE DE BLESSURE EST CELLE DU DÉFI (RUN_INJURED_MS, 10 min) et non
   EVIL_INJURED_MS (30 min) : décision Guillaume, on doit pouvoir retenter
   dans la soirée. On réutilise la constante au lieu d'en créer une jumelle —
   deux nombres qui doivent rester égaux finissent toujours par diverger.
   ========================================================================== */
export const LAB_PRIZE_GOLD = 900;         // sortie réussie, UNE FOIS PAR VENUE du labyrinthe
export const LAB_SHARD_GOLD = 40;          // or par éclat rapporté (même en cas de mort)
/* Plafonds anti-message-aberrant, même rôle que RUN_MAX_* : le mini-jeu se
   déroule ENTIÈREMENT côté client, l'hôte persiste ce qu'on lui dit et ne peut
   donc pas le croire sur parole. Ces bornes ne rendent pas la triche
   impossible, elles empêchent qu'un bug ou un message forgé n'injecte une
   fortune dans une sauvegarde partagée et durable. 26 éclats sont posés par
   dédale (SHARD_COUNT) : 40 est confortable et reste borné. */
export const LAB_MAX_SHARDS = 40;
export const LAB_MAX_SCORE = 60000;

export const PASSAGE_WORLDS = [
  { key: "evil", bridge: "stone",    name: "Terres Maléfiques",   nameEn: "Evil Lands",
    bg: "#0b120c", g1: "#182417", g2: "#182417", waterA: "#241246", waterB: "rgba(160,70,220,",
    pickupColor: null, pickupCount: 0,
    pet: { id: "shadowcat", name: "Chat d'ombre", nameEn: "Shadow cat" }, petHue: 260 },
  { key: "candy", bridge: "candy",   name: "Pays des Bonbons",    nameEn: "Candy Land",
    bg: "#f2b8d0", g1: "#f0c2d8", g2: "#eab4ce", waterA: "#c86ea8", waterB: "rgba(255,190,230,",
    pickupColor: "#e0356e", pickupCount: 14,
    pet: { id: "candyfox", name: "Renard barbe à papa", nameEn: "Cotton-candy fox" }, petHue: 300 },
  { key: "maze", bridge: "mazestone", name: "Pays du Labyrinthe",  nameEn: "Maze Land",
    bg: "#25331f", g1: "#4a6b38", g2: "#446434", waterA: "#3a7bc8", waterB: "rgba(190,225,255,",
    pickupColor: "#e8c860", pickupCount: 6,
    pet: { id: "mazemouse", name: "Souris des haies", nameEn: "Hedge mouse" }, petHue: 90 },
  { key: "crystal", bridge: "crystal", name: "Grottes de Cristal",  nameEn: "Crystal Caverns",
    bg: "#0c1226", g1: "#1c2440", g2: "#182038", waterA: "#12386a", waterB: "rgba(120,200,255,",
    pickupColor: "#7ce0f0", pickupCount: 12,
    pet: { id: "gemturtle", name: "Tortue gemme", nameEn: "Gem turtle" }, petHue: 180 },
  { key: "meadow", bridge: "cloud",  name: "Prairie Céleste",     nameEn: "Sky Meadow",
    bg: "#a8d8f0", g1: "#8fd06a", g2: "#86c862", waterA: "#5ab0e8", waterB: "rgba(255,255,255,",
    pickupColor: "#f0b428", pickupCount: 12,
    pet: { id: "cloudlamb", name: "Agneau des nuages", nameEn: "Cloud lamb" }, petHue: 40 },
];
/* ==========================================================================
   ZIP 392 — MENU DÉVELOPPEUR (secret, hôte uniquement)
   ==========================================================================
   Ouvert par Cmd+Shift+X (macOS) ou Ctrl+Shift+X (Windows/Linux).

   POURQUOI CETTE COMBINAISON ET PAS UNE AUTRE. Contrainte posée par Guillaume :
   ne jamais entrer en conflit avec Safari ni Chrome. Les lettres Cmd+Shift sont
   presque toutes prises par l'un ou l'autre — N (navigation privée), T (rouvrir
   l'onglet), W (fermer la fenêtre), R (rechargement forcé / lecteur Safari),
   B, D, G, H, I, J, M, O, P, U, V, Y, Z... `X` est la seule lettre qui ne soit
   réservée ni par Chrome, ni par Safari, ni par Firefox, sur aucune des trois
   plateformes. Ne pas la changer sans refaire cette vérification.

   Le raccourci est volontairement le SEUL moyen d'ouvrir ce menu : aucun bouton
   ne l'annonce à l'écran, un joueur ne peut pas tomber dessus par hasard. */
export const DEV_MENU_KEY = "KeyX";

/* Destinations du téléporteur du menu. `zone` est la zone d'arrivée au sens de
   m.zone ; le détail des coordonnées est résolu dans devTeleport (FermeGame.js)
   parce que deux d'entre elles dépendent du monde généré, pas d'une constante :
   le passage sombre est posé par la génération de la ferme (w.darkPassage), et
   le bout du pont se dérive de RUN_GATE.

   ORDRE VOLONTAIRE : de la ferme vers le plus lointain. C'est l'ordre dans
   lequel on teste. */
export const DEV_TELEPORTS = [
  { key: "farm",    zone: "farm" },  // devant la maison (SPAWN)
  { key: "passage", zone: "farm" },  // devant le passage sombre, côté ferme
  { key: "town",    zone: "town" },  // Valley Town, descente du train
  /* ⚠️ 425 — TROIS ARRÊTS DE PLUS DANS VALLEY TOWN, ET C'EST LA CARTE QUI LES
     RÉCLAME. Elle mesurait 64×48 : la descente du train suffisait, on voyait
     tout en dix secondes. Elle fait 192×144, et rejoindre le belvédère à pied
     demande une minute de marche — à répéter à chaque rechargement, pour
     regarder une ombre. Un outil de test dont le coût dépasse ce qu'il fait
     gagner cesse d'être utilisé, et c'est comme ça qu'on finit par livrer sans
     regarder (§9 de CLAUDE.md).
     Les coordonnées se DÉRIVENT des repères de la ville dans devTeleport, elles
     ne sont pas recopiées ici : déplacer la place ne doit pas laisser un
     téléporteur pointé sur l'herbe. */
  { key: "townBoutique",  zone: "town" },  // zip 427 : la Haute-Ville, devant la Maison Garfield (le seul quartier qu'on n'atteint qu'en montant)
  { key: "townPlaza",     zone: "town" },  // la place centrale, devant la fontaine
  { key: "townCourt",     zone: "town" },  // le parvis du tribunal, en Haute-Ville
  { key: "townHall",      zone: "town" },  // 2026-09-02 : le perron de l'hôtel de ville (test PNG) — pour juger le sprite/les marches/l'horloge sans traverser la ville à chaque rechargement
  { key: "townBelvedere", zone: "town" },  // le second palier
  { key: "townMarket",    zone: "town" },  // zip 426 : le champ de foire, enfin occupé
  { key: "townLake",      zone: "town" },  // zip 426 : la promenade du lac, au sud
  /* ⚠️ 2026-08-31 — LA PASSE A SON ARRÊT LE JOUR OÙ ELLE EST CREUSÉE, et c'est
     la leçon du 425 appliquée AVANT d'être repayée pour la troisième fois : elle
     est à quarante-trois cases à l'est du ponton, sur un sentier de rive, donc
     y aller à pied coûte une minute — donc on ne serait pas allé la REGARDER à
     chaque retouche, donc on l'aurait réglée en aveugle. C'est le seul endroit
     de la carte par où le monde a une sortie ; il ne peut pas être le plus
     coûteux à atteindre. */
  { key: "townPasse",     zone: "town" },
  /* ⚠️ ZIP 446 — LE CRATÈRE A SON ARRÊT, ET C'EST LA LEÇON DU 425 APPLIQUÉE
     AVANT D'ÊTRE REPAYÉE : il est dans un pré, à l'écart, et y aller à pied
     coûte une bonne minute — donc on ne serait pas allé le regarder à chaque
     retouche, donc on l'aurait refait en aveugle. Sa position est DÉRIVÉE de
     `starCraterPos` (le vrai balayage en spirale), pas de la constante d'ancrage :
     un arrêt qui pose le joueur là où le cratère AURAIT dû être est le défaut
     n°1 du 444 (« un arrêt de téléport qui posait le joueur dans le vide »). */
  { key: "townCrater",    zone: "town" },
  /* ⚠️ 426 — LES TROIS NIVEAUX DU TRIBUNAL, ET C'EST LE MÊME RAISONNEMENT QU'AU
     425 : traverser la ville, entrer, puis monter deux volées à chaque
     rechargement pour regarder un bureau finit par ne plus se faire du tout.
     Un outil de test dont le coût dépasse ce qu'il fait gagner cesse d'être
     utilisé — et c'est comme ça qu'on livre sans regarder. */
  { key: "court",         zone: "court" }, // le hall, au rez-de-chaussée
  { key: "courtUpper",    zone: "court" }, // l'étage des bureaux
  { key: "courtBasement", zone: "court" }, // le sous-sol
  /* ⚠️⚠️ ZIP 442 — QUATRE ARRÊTS QUI MANQUAIENT DEPUIS DEUX ET UN ZIPS, ET
     C'EST LA MÊME LEÇON QU'AU 425, NON APPRISE : l'hôtel de ville est ouvert
     depuis le 438 et l'église depuis le 441, et NI L'UN NI L'AUTRE n'avait de
     téléport. Pour regarder le bureau du géomètre il fallait traverser la ville,
     entrer, monter — à chaque rechargement. *Un outil de test dont le coût
     dépasse ce qu'il fait gagner cesse d'être utilisé, et c'est comme ça qu'on
     finit par livrer sans regarder.* Le code de destination, lui, savait déjà
     traiter « hall » et « hallUpper » : seule l'entrée de menu manquait, donc
     personne ne pouvait s'en servir. Un chemin de code sans porte n'existe pas.
     ⚠️ LA QUÊTE DE L'ÉTOILE (444) EN A BESOIN AUSSI, et d'un de plus : son
     climax se joue à cheval sur DEUX niveaux d'église, la tribune et le
     beffroi, l'un au-dessus de l'autre. Regarder le duo sans arrêt de téléport
     coûterait la traversée de la ville plus deux volées d'escalier, à chaque
     rechargement — c'est-à-dire qu'on ne le regarderait pas. */
  { key: "hall",       zone: "court" }, // hôtel de ville, le grand hall (438)
  { key: "hallUpper",  zone: "court" }, // hôtel de ville, l'étage (conseil, maire, archives, géomètre)
  { key: "church",     zone: "court" }, // l'église, la nef (441)
  { key: "churchLoft", zone: "court" }, // l'église, la tribune d'orgue
  { key: "churchTower", zone: "court" }, // 444 — le beffroi, le point le plus haut de la carte
  { key: "world",   zone: "evil" },  // arrivée dans la terre en cours (EVIL_SPAWN)
  { key: "bridge",  zone: "evil" },  // pied du pont de la terre en cours
];

/* ╔══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 444 — UN ARRÊT DE TÉLÉPORT D'INTÉRIEUR EST UN NIVEAU, ET ÇA SE DÉRIVE.
   ╚══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ C'EST UNE RÉPARATION, ET ELLE A ÉTÉ TROUVÉE EN ÉCRIVANT LE BANC. Le
   beffroi (`churchTower`) avait son entrée de menu dès le premier jet du 444, et
   le code de destination l'ignorait : la liste des clés acceptées était ÉNUMÉRÉE
   à la main dans `FermeGame` (« court || courtUpper || courtBasement || hall ||
   hallUpper || church || churchLoft »), donc le nouvel arrêt tombait dans la
   branche « ferme » et téléportait devant la maison. **Un chemin de code sans
   porte n'existe pas ; une porte sans chemin de code MENT**, et c'est le même
   défaut qu'au 438 et au 441, pris par l'autre bout.
   ⚠️ LA PARADE N'EST PAS D'AJOUTER UNE CLÉ À LA LISTE, C'EST DE NE PLUS AVOIR DE
   LISTE. `DEV_TELEPORTS` dit ce qui est proposé, `COURT_FLOORS` dit ce qui
   existe : cette table est leur JOINTURE, et un niveau de plus ne coûte plus une
   ligne de code (§8 de CLAUDE.md — ce qui double un autre paramètre doit être
   DÉRIVÉ, jamais réglé).
   ⚠️ LES QUATRE ALIAS SONT LE PRIX DE L'HISTOIRE (le tribunal a nommé ses
   arrêts avant que les niveaux n'aient des clés), et ils sont ICI, seuls et
   visibles, plutôt que dispersés dans trois chaînes de ternaires.
   ⚠️ ET `tools/verify-quete.mjs` COMPARE LES DEUX LISTES DANS LES DEUX SENS : un
   arrêt qui ne mène à aucun niveau et un niveau qu'aucun arrêt n'atteint
   échouent tous les deux. Le second est celui qui a coûté deux zips au 442. */
export const DEV_FLOOR_ALIAS = { court: "ground", courtUpper: "upper", courtBasement: "basement", hallUpper: "hallUp" };
export const DEV_FLOOR_OF = Object.fromEntries(
  DEV_TELEPORTS
    .filter(d => d.zone === "court")
    .map(d => [d.key, COURT_FLOORS.findIndex(f => f.key === (DEV_FLOOR_ALIAS[d.key] || d.key))])
    .filter(([, i]) => i >= 0)
);

/* Le téléport « pied du pont » ne pose PAS le joueur sur RUN_GATE : marcher sur
   cette dalle déclenche l'embuscade puis le mini-jeu de la terre (voir
   checkWalkOverPassage). On atterrit donc quelques cases à l'OUEST, d'où l'on
   voit le pont et où il reste un pas à faire pour l'emprunter — ce qui est
   précisément ce qu'on veut montrer à quelqu'un. */
export const DEV_BRIDGE_OFFSET = 3;

export const PASSAGE_PET_CATCH_CHANCE = 0.35;
// ⚠️ ZIP 388 : PLUS LUE NULLE PART. La capture d'un familier en ramassant une
// breloque a été supprimée (voir resolvePassagePickup) — c'était l'attribution
// « injustifiée et aléatoire » signalée par Guillaume. La constante est
// conservée, et commentée ici plutôt que supprimée, pour deux raisons : elle
// documente l'ancien comportement, et la retirer obligerait à toucher un
// fichier de plus pour zéro effet. Si les familiers redevenaient un jour
// attrapables, c'est ici qu'on reviendrait.
export const PASSAGE_LOOT_GOLD_MIN = 25;   // or accordé par breloque ramassée (min..max)
export const PASSAGE_LOOT_GOLD_MAX = 75;
export const MAZE_PRIZE_GOLD = 300;        // récompense du coffre au bout du labyrinthe (1x/joueur/semaine)
export const CANDY_SPEED_MS = 60 * 1000;   // durée du bonbon magique "vitesse" (buff local)
export const CANDY_SPEED_MUL = 1.5;

/* --- Zip 385 : LE GOURMANDIN (mini-jeu du Pays des Bonbons) ---------------
   Mini-jeu façon « Cut the Rope » servi depuis public/candyland/, ouvert en
   s'approchant du monstre posé sur la carte. Quinze niveaux, deux paliers.

   POURQUOI CES DEUX PALIERS SE COMPORTENT DIFFÉREMMENT (arbitrage Guillaume) :
   l'or du niveau 10 est REJOUABLE — une fois par venue du Pays des Bonbons —
   tandis que le chat berlingot du niveau 15 ne s'obtient QU'UNE FOIS.

   « Une fois par venue » et non « une fois par visite » : une visite se répète
   en ressortant et en rentrant par le passage, ce qui aurait fait de 10 000
   pièces un bouton à or infini (un moulin en coûte 30 000). La venue, elle,
   est le CRÉNEAU de rotation — le numéro de tranche de PASSAGE_WORLD_DAYS
   jours — et il est strictement croissant : il ne peut pas être rejoué.
   Voir CANDY_GAME_BLOCK / f.inv.candyGoldBlock. */
export const CANDY_GAME_LEVELS = 15;
export const CANDY_GAME_GOLD_LEVEL = 10;
export const CANDY_GAME_GOLD = 10000;
export const CANDY_GAME_PET_LEVEL = 15;
export const CANDY_GAME_PET_ID = "candycat";
// Position FIXE du Gourmandin sur la carte, comme EVIL_CAULDRON_SPAWN pour le
// chaudron. Au sud-ouest : loin de l'arrivée (EVIL_SPAWN) pour qu'il y ait un
// bout de chemin à faire, loin de la mare (générée autour de x 22-36 / y 30-40)
// et loin de la rive est (EAST_LAKE_X) pour ne pas se disputer l'espace avec la
// chaussée du défi de fuite.
/* Zip 386 : LE GOURMANDIN A DÉMÉNAGÉ SUR LE PONT. Il était au sud-ouest de la
   carte (18, 52) et s'ouvrait à la touche E ; demande Guillaume : « the cut the
   rope candy game should be accessed via this rainbow bridge ».

   Il est donc posé DEUX CASES À L'EST de la porte, c'est-à-dire juste devant le
   joueur qui avance sur le pont — et c'est la porte elle-même qui ouvre le
   mini-jeu, en marchant dessus, sans aucune touche. Le monstre EST le repère
   visuel de la case de déclenchement : la règle du zip 378 (« rien ne marque
   cette case ») valait pour le défi de fuite, où la surprise de l'embuscade
   était l'effet recherché. Ici c'est l'inverse — on doit voir où l'on va.

   Conséquence : plus d'invite E, plus de dégagement de cases à la génération
   (le tablier du pont n'a jamais d'objets), et le mini-jeu n'a plus qu'UNE
   seule porte d'entrée au lieu de deux. */
/* ⚠️ ZIP 411 — LE GOURMANDIN DÉMÉNAGE UNE SECONDE FOIS : AU MILIEU DU LAC.
   Demande de Guillaume : « mets un monstre similaire au monstre du mini jeu au
   milieu du lac du monde candy et quand on s'approche du lac central un message
   "donne à manger au gentil monstre Candy" oui/non s'affiche ».

   TROIS CONSÉQUENCES, et la troisième est la plus importante :

     1. SA POSITION N'EST PLUS UNE CONSTANTE. Le lac est tiré au sort à la
        génération du monde ; le monstre est donc posé sur `ew.lake`, exporté
        pour l'occasion par generatePassageWorld. Une constante en dur aurait
        planté le monstre dans l'herbe quatre semaines sur cinq.

     2. ON NE MARCHE PLUS SUR RIEN. Le déclenchement du 386 était une CASE : on
        posait le pied dessus, le jeu s'ouvrait. Ici la case est de l'eau, et
        l'eau ne se marche pas. C'est donc une APPROCHE (rayon ci-dessous) qui
        pose une question — et une question se refuse, ce que la case ne
        permettait pas.

     3. ELLE SE RÉARME EN S'ÉLOIGNANT. Sans ce verrou (le même que
        runGateArmedRef pour la porte du pont), répondre « non » rouvrirait la
        question à l'image suivante, puisqu'on est toujours près du lac. Le
        joueur serait prisonnier de sa propre réponse. */
export const CANDY_MONSTER_APPROACH = 5.5;   // distance de déclenchement, en cases
export const CANDY_MONSTER_REARM = 8.0;      // ... et distance de réarmement (toujours > la précédente)

/* --- Zip 411 : LA GRANDE DESCENTE (public/candyluge/) --------------------
   Quatrième mini-jeu, au bout du pont arc-en-ciel, à la place du Gourmandin.
   Descente en luge sur une piste de barbe à papa : on évite des gourmands
   mobiles aux flèches, on ramasse des bonbons, on dérape.

   ⚠️ IL SE COMPORTE COMME LE GOURMANDIN, PAS COMME LE DÉFI DE FUITE : aucune
   blessure, aucun report de position, aucune cinématique. Le Pays des Bonbons
   est un monde PAISIBLE (décision du zip 235 : seul « evil » garde des
   monstres), et lui coller une sanction de sortie en ferait un second monde
   sombre. On ouvre, on descend, on revient là où l'on était.

   Les plafonds ont le même rôle que RUN_MAX_* et LAB_MAX_* : le mini-jeu se
   déroule ENTIÈREMENT côté client, l'hôte persiste ce qu'on lui dit et ne peut
   donc pas le croire sur parole. Ils n'empêchent pas la triche, ils empêchent
   qu'un bogue ou un message forgé n'injecte une fortune dans une sauvegarde
   partagée et durable. */
export const LUGE_GOLD_PER_CANDY = 6;      // or par bonbon ramassé
export const LUGE_FINISH_GOLD = 450;       // prime d'arrivée, UNE FOIS PAR VENUE au Pays des Bonbons
export const LUGE_MAX_CANDIES = 200;
export const LUGE_MAX_SCORE = 60000;

/* --- Zip 386 : LES LICORNES DU PAYS DES BONBONS --------------------------
   Demande Guillaume : « white unicorns with rainbow sparkly hair and tail
   roaming around in candy land ».

   DÉCORATION PURE, ET C'EST CE QUI LES REND GRATUITES. Leur position est
   DÉRIVÉE du temps et d'un index (voir unicornAt, FermeGame.js) : aucun état,
   aucune sauvegarde, AUCUN MESSAGE RÉSEAU. Les deux joueurs voient la même
   licorne au même endroit parce qu'ils calculent la même fonction du même
   temps, pas parce que quelqu'un le leur a dit.

   C'est la même économie que les loups de l'embuscade (zip 375) poussée plus
   loin : eux avaient un état local, celles-ci n'en ont aucun. Le jour où on
   voudra les attraper, il faudra tout reprendre côté hôte — et ce sera un
   chantier, pas un réglage. */
export const CANDY_UNICORNS = 7;              // nombre sur toute la carte
export const CANDY_UNICORN_ROAM = 5.5;        // rayon d'errance autour du point d'ancrage, en cases
export const CANDY_UNICORN_PERIOD_MS = 26000; // durée d'un tour de promenade

// --- Valley Town, suite (zip 235) ---
export const TOWN_HOUSE_STYLES = 10;       // 10 façades de base gratuites (R à sa porte pour changer)

// Rappel des visiteurs qui flânent : pendant ce délai après un "rendez-vous à
// la mairie", ils reviennent (et restent) sur la place au lieu de vagabonder.
export const VISITOR_RECALL_MS = 2 * 60 * 1000;
export const VISITOR_ROAM_HOP = 8;         // longueur max (tuiles) d'une étape de balade libre sur toute la carte

// --- Montgolfière (zip 302, demande Guillaume) : attraction touristique ---
// Business indépendant des ateliers d'artisans : pas de skill dédié dans
// VISITOR_ROSTER, pas de bâtiment à construire. Le joueur désigne comme
// pilote N'IMPORTE QUEL résident DÉJÀ INSTALLÉ (st.residents), sans lui
// retirer son métier d'origine — "sans attribution" = pas de skill/atelier
// propre à créer pour ce business, on réutilise un résident existant.
export const BALLOON_TICKET_PRICE = 50;    // prix du billet, par passager
export const BALLOON_CAPACITY = 4;         // places dans la nacelle
// Horaires FIXES en temps de jeu (minutes depuis minuit, cf. DAY_START_MIN/
// DAY_END_MIN) : 10h00 (tour du matin) et 20h00 (tour de nuit).
export const BALLOON_DEPARTURES_MIN = [10 * 60, 20 * 60];
// Fenêtre d'embarquement AVANT chaque départ (horloge réelle, indépendante de
// la vitesse du temps de jeu) : les billets ne sont vendables que pendant
// cette fenêtre. Décision Guillaume : le vol part à l'heure même incomplet.
export const BALLOON_BOARDING_REAL_MS = 90 * 1000; // 1min30 réelles avant le départ
export const BALLOON_FLIGHT_REAL_MS = 3 * 60 * 1000; // durée réelle d'un survol complet
// Point d'ancrage visuel (hangar/plateforme au sol) où la montgolfière est
// visible posée hors vol et pendant l'embarquement. Purement décoratif, pas
// de collision dédiée (cf. Guillaume à ajuster visuellement en jeu si besoin).
// Zip 307 (demande Guillaume : "une belle zone de landing déplaçable, peut-
// être rive droite pour l'instant") : ce point ne sert plus que de valeur par
// défaut/de repli — le joueur peut désormais la déplacer avec l'outil main
// (comme un bâtiment d'artisan), la position choisie est alors persistée dans
// station.balloon.anchor (voir balloonAnchorPos, FermeGame.js). Choisie ici
// rive droite (x > riverCenter, côté opposé à la maison, cf. WOLF_ROAM_RADIUS
// plus bas), juste au sud de la traversée nord (bridgeSites `by = 42`, rivière
// centrée ~x=95 à cette hauteur) : une position raisonnable proche du pont.
export const BALLOON_ANCHOR = { x: 108, y: 46 };

/* ============================================================================
   ZIP 398 — LES VERGERS : DES CULTURES QUI DEMEURENT.
   ----------------------------------------------------------------------------
   Demande de Guillaume, mot pour mot : « ajouter les nouvelles cultures
   suivantes : des arbres fruitiers qui demeurent, produisent périodiquement des
   fruits mais ne nécessitent pas de replanter. Trouve un mécanisme cohérent. »

   ⚠️ POURQUOI CE N'EST PAS UNE ENTRÉE DE PLUS DANS `CROPS`, ET POURQUOI ÇA
   COMPTE. Le pipeline `CROPS` est entièrement piloté par les données — boutique,
   inventaire, pousse, sprite, vente — et il a une hypothèse gravée partout :
   **une culture disparaît quand on la récolte**. `resolveHarvest` efface la case
   et rend la parcelle à la terre nue. Ajouter un « pérenne » dans CROPS aurait
   demandé un drapeau lu à sept endroits différents, dont trois qui ne se
   connaissent pas. C'est le genre d'exception qui pourrit une table de données
   propre pendant dix zips.

   Un verger est donc un OBJET DE TUILE (`O_ORCHARD`) avec son état par case,
   sur le modèle EXACT de `world.mills` : une Map idx → état, sérialisée avec le
   monde, diffusée par `payload.orchards`, avancée par le tick de l'hôte. Ce
   modèle est déjà écrit, déjà persisté, déjà réseau — on ne réinvente rien.

   LE MÉCANISME, ET SA COHÉRENCE :
     1. on achète un PLANT à la boutique, on le pose comme un moulin ;
     2. il pousse pendant `matureMs` (quatre stades visibles) ;
     3. arrivé à maturité, il porte des fruits tous les `cycleMs` ;
     4. `E` cueille — l'arbre RESTE, le compteur repart ;
     5. hors saison, il ne produit pas : il attend. C'est ce qui donne au
        verger son rythme d'année et empêche qu'il devienne une rente plate ;
     6. la hache l'abat et rend du bois. C'est réversible, donc c'est un choix.

   ⚠️⚠️ LES CYCLES ET LES RENDEMENTS ONT ÉTÉ CORRIGÉS APRÈS MESURE, PAS AVANT.
   La première écriture donnait des cycles courts (5 à 9 h) et de gros paniers
   (jusqu'à 8 fruits). `tools/verify-orchards.mjs` a fait tourner un plant sur
   sept jours simulés et sorti le chiffre : **1 870 or par jour et par case**
   pour un myrtillier, contre 427 pour la meilleure culture existante (la
   citrouille). Vingt-quatre vergers auraient rapporté plus de 300 000 or par
   semaine — un moulin en coûte 30 000. Les neuf cultures du jeu seraient
   devenues du décor en une soirée.

   Aucun raisonnement ne donnait ça : chaque nombre pris seul paraissait
   raisonnable, c'est leur PRODUIT qui dérapait. Les valeurs actuelles visent
   700 à 900 or/jour/case, soit environ le double d'une bonne culture — assez
   pour récompenser un investissement long et sans replantage, pas assez pour
   remplacer le reste du jeu. Le contrôle compare désormais aux CULTURES
   EXISTANTES et non à un idéal (règle du zip 379).

   ⚠️ LE PRIX EST CALCULÉ, PAS CHOISI. Un plant coûte `saplingCost` et rapporte
   `yieldAvg × fruitSell` par cycle. Le seuil de rentabilité est écrit dans
   chaque entrée (`payback`, en cycles) : il tourne autour de 9 à 12 cycles,
   c'est-à-dire plusieurs jours réels. Un verger doit être un INVESTISSEMENT —
   plus cher qu'une graine, plus lent, et meilleur à la longue. S'il était
   rentable en deux cycles, personne ne planterait plus rien d'autre, et les
   neuf cultures existantes deviendraient du décor.
   ========================================================================== */
const OH = 3600 * 1000;
export const ORCHARDS = [
  {
    id: "lemon", kind: "tree",
    name: "Citronnier", nameEn: "Lemon tree",
    saplingName: "Plant de citronnier", saplingNameEn: "Lemon sapling",
    saplingCost: 1400, matureMs: 30 * OH, cycleMs: 11 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "lemon",
    // Le citron est le seul à porter en hiver : c'est l'agrume, et ça donne une
    // raison de planter un verger même quand tout le reste dort.
    seasons: ["spring", "summer", "autumn", "winter"],
    payback: 11,
  },
  {
    id: "strawberry", kind: "low",
    name: "Fraisier", nameEn: "Strawberry plant",
    saplingName: "Plant de fraisier", saplingNameEn: "Strawberry plant",
    saplingCost: 520, matureMs: 10 * OH, cycleMs: 9 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "strawberry",
    seasons: ["spring", "summer"],
    payback: 9,
  },
  {
    id: "raspberry", kind: "bush",
    name: "Framboisier", nameEn: "Raspberry bush",
    saplingName: "Plant de framboisier", saplingNameEn: "Raspberry cane",
    saplingCost: 760, matureMs: 16 * OH, cycleMs: 11 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "raspberry",
    seasons: ["summer", "autumn"],
    payback: 10,
  },
  {
    id: "blueberry", kind: "bush",
    name: "Myrtillier", nameEn: "Blueberry bush",
    saplingName: "Plant de myrtillier", saplingNameEn: "Blueberry bush",
    saplingCost: 980, matureMs: 20 * OH, cycleMs: 13 * OH,
    yieldMin: 3, yieldMax: 5, fruit: "blueberry",
    seasons: ["summer", "autumn"],
    payback: 10,
  },
];
export const ORCHARD_STAGES = 4;      // 0 = plant, 1 = jeune, 2 = adulte, 3 = en fruits
export const ORCHARD_HP = 3;          // coups de hache pour l'abattre
export const ORCHARD_WOOD = 3;        // bois rendu à l'abattage
export const ORCHARD_MAX = 24;        // vergers plantés simultanément (toute la ferme)

/* LES FRUITS. Rangés dans `f.inv.fruits` (un objet id → nombre), et non en
   champs plats : quatre champs de plus dans l'inventaire, c'est quatre endroits
   à toucher à chaque nouveau fruit. AUCUNE MIGRATION — `f.inv` est dans
   l'instantané JSON. */
export const FRUITS = [
  { id: "lemon",      name: "Citron",    nameEn: "Lemon",      sell: 95,  color: "#f2d640", dark: "#c9a715" },
  { id: "strawberry", name: "Fraise",    nameEn: "Strawberry", sell: 70,  color: "#e0344a", dark: "#a81f32" },
  { id: "raspberry",  name: "Framboise", nameEn: "Raspberry",  sell: 88,  color: "#c8365f", dark: "#8e2140" },
  { id: "blueberry",  name: "Myrtille",  nameEn: "Blueberry",  sell: 110, color: "#4a5fc8", dark: "#2c3a86" },
];
export function fruitSpec(id) { return FRUITS.find(f => f.id === id) || null; }
export function fruitName(id, en) { const f = fruitSpec(id); return f ? (en ? f.nameEn : f.name) : id; }

/* LA BARQUETTE (demande de Guillaume : « on peut aussi vendre les fruits par
   barquettes »). Six fruits d'une même espèce, vendus ensemble avec une prime.
   ⚠️ LA PRIME EST LA RAISON D'ÊTRE DE LA BARQUETTE : sans elle, vendre par six
   serait exactement vendre six fois, donc un bouton de plus qui ne sert à rien.
   À +25 %, elle récompense d'avoir attendu d'en avoir assez — c'est-à-dire
   d'avoir laissé le verger tourner. */
export const PUNNET_SIZE = 6;
export const PUNNET_BONUS = 1.25;
export function punnetPrice(fruitId) {
  const f = fruitSpec(fruitId); if (!f) return 0;
  return Math.round(f.sell * PUNNET_SIZE * PUNNET_BONUS);
}

/* ============================================================================
   ZIP 398 — LES PRODUITS AUX FRUITS.
   ----------------------------------------------------------------------------
   « Ces nouvelles cultures permettront aussi d'avoir des produits qui incluent
   cela. Des confitures, des yaourts aux fruits, des tartes aux citrons. »

   Trois familles, et chacune est confiée à L'ATELIER QUI LA MÉRITE plutôt qu'à
   un atelier neuf :
     * la CONFITURE demande du sucre → la sucrerie, qui en produit déjà ;
     * le YAOURT AUX FRUITS demande du lait → la fromagerie, qui fait déjà les
       yaourts nature et vanille ;
     * la TARTE AU CITRON demande de la farine et des œufs → la boulangerie.
   Aucun bâtiment neuf à acheter : les vergers rendent plus utiles les trois
   ateliers déjà payés, ce qui est un meilleur cadeau qu'un quatrième bâtiment.

   ⚠️ LE PRIX DE VENTE EST TOUJOURS SUPÉRIEUR À LA SOMME DES INGRÉDIENTS, sinon
   transformer serait une punition. `verify-orchards.mjs` le mesure recette par
   recette, au lieu de faire confiance aux quatre nombres écrits ici. */
/* ⚠️ QUEL ANIMAL DONNE QUOI. Les produits animaux vivent dans `f.inv.products`,
   un TABLEAU indexé par type d'animal (voir ANIMALS) — pas dans des champs
   `f.inv.milk` / `f.inv.egg`, qui n'existent pas.

   La première écriture du 398 lisait `f.inv.milk` et `f.inv.egg` : toujours
   `undefined`, donc toujours 0, donc **les yaourts et la tarte étaient
   définitivement impossibles à préparer** — bouton grisé sur « pas de lait »
   avec une étable pleine de vaches. Le genre de défaut qu'aucun contrôle de
   syntaxe ne voit et qu'aucune relecture ne soupçonne, parce que
   `f.inv.milk` a l'air parfaitement raisonnable.

   Le lait accepte la VACHE ou la CHÈVRE, dans cet ordre : refuser le lait de
   chèvre pour un yaourt serait une subtilité que personne ne comprendrait en
   regardant son inventaire plein. */
export const ANIMAL_EGG = 0;          // poule
export const ANIMAL_MILK = [4, 1];    // vache d'abord, puis chèvre

export const FRUIT_PRODUCTS = [
  { id: "jam_strawberry", shop: "sucrerie",   name: "Confiture de fraises",    nameEn: "Strawberry jam",
    fruit: "strawberry", fruitN: 5, sugar: 2, sell: 620,  ms: 40 * 60 * 1000 },
  { id: "jam_raspberry",  shop: "sucrerie",   name: "Confiture de framboises", nameEn: "Raspberry jam",
    fruit: "raspberry",  fruitN: 5, sugar: 2, sell: 720,  ms: 40 * 60 * 1000 },
  { id: "jam_blueberry",  shop: "sucrerie",   name: "Confiture de myrtilles",  nameEn: "Blueberry jam",
    fruit: "blueberry",  fruitN: 5, sugar: 2, sell: 850,  ms: 40 * 60 * 1000 },
  { id: "yog_strawberry", shop: "fromagerie", name: "Yaourt à la fraise",      nameEn: "Strawberry yogurt",
    fruit: "strawberry", fruitN: 3, milk: 2,  sell: 480,  ms: 30 * 60 * 1000 },
  { id: "yog_blueberry",  shop: "fromagerie", name: "Yaourt à la myrtille",    nameEn: "Blueberry yogurt",
    fruit: "blueberry",  fruitN: 3, milk: 2,  sell: 610,  ms: 30 * 60 * 1000 },
  { id: "tart_lemon",     shop: "bakery",     name: "Tarte au citron",         nameEn: "Lemon tart",
    fruit: "lemon",      fruitN: 4, flour: 2, egg: 2, sell: 780, ms: 45 * 60 * 1000 },
];
export function fruitProduct(id) { return FRUIT_PRODUCTS.find(p => p.id === id) || null; }

/* ZIP 398 — LE NOM DES FAMILIERS.
   « Il faut pouvoir nommer chaque animal de compagnie qu'on a. »
   Le surnom vit dans `f.pets[i].nick`, donc dans l'instantané JSON du fermier :
   aucune migration. Vide = on retombe sur le nom d'espèce du catalogue. */
export const PET_NICK_MAX = 14;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — VALLEY TOWN HABITÉE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « donner vie à Valley Town ... les résidents doivent
   pouvoir s'y balader, s'y trouver, utiliser les infrastructures (s'asseoir sur
   les bancs, monter descendre les escaliers, vivre en gros) ».

   ⚠️⚠️ LE PRINCIPE QUI TIENT TOUT LE CHAPITRE : UN RÉSIDENT A UNE ZONE, PAS
   DEUX POSITIONS. `res.zone` vaut "farm" ou "town", et `res.x/res.y` sont ses
   coordonnées DANS CETTE ZONE. C'est la seule forme qui résiste au piège déjà
   payé deux fois dans ce projet (§4 de CLAUDE.md, « deux cartes sans repère
   commun finissent par se mélanger ») : avec deux couples de coordonnées, il
   existe forcément un chemin de code qui lit le mauvais — et ça se voit le jour
   où la petite carte ne tient plus dans la grande, c'est-à-dire trop tard.
   Avec UNE position tagguée, le pire défaut possible est un résident invisible,
   jamais un résident dessiné à Valley Town au milieu d'un champ de blé.

   ⚠️ ET LA ZONE VOYAGE DANS LES MESSAGES QUI EXISTENT DÉJÀ. Le trajet groupé du
   zip 364 (`residentPaths` / `residentStops`, UN message par image pour tout le
   monde) gagne un champ `z`. Zéro `send()` de plus, quel que soit le nombre de
   résidents en vadrouille — c'est la même arithmétique que celle qui autorise
   MAX_RESIDENTS = 20.

   ⚠️ L'ALTITUDE NE VOYAGE TOUJOURS PAS, ni pour les joueurs (425) ni pour les
   résidents : elle se lit sous leurs pieds dans `elev`. Un résident en haut des
   marches est en haut des marches sur tous les écrans, sans un octet. */

// Cadence d'arbitrage des séjours en ville. C'est un TIRAGE, pas un horaire :
// une ville dont on connaît les horaires de passage n'a plus l'air vivante.
export const TOWN_TRIP_CHECK_MS = 18 * 1000;
export const TOWN_TRIP_CHANCE = 0.30;      // par résident éligible, à chaque contrôle
/* ⚠️ COMBIEN DE RÉSIDENTS EN VILLE À LA FOIS, ET POURQUOI PAS TOUS. Deux
   raisons, la seconde étant la vraie : d'abord la ferme ne doit pas se vider
   (ils y travaillent, c'est leur contribution) ; ensuite une ville où l'on
   croise deux ou trois têtes connues est vivante, alors qu'une ville où l'on
   croise les vingt d'un coup est une file d'attente. Le plafond est un
   PLANCHER de qualité, pas une économie. */
export const TOWN_VISITORS_MAX = 6;
export const TOWN_TRIP_MIN_MS = 3 * 60 * 1000;   // séjour le plus court
export const TOWN_TRIP_MAX_MS = 10 * 60 * 1000;  // le plus long
// ⚠️ UN RÉSIDENT EN VILLE NE TRAVAILLE PAS. C'est le prix du voyage, il est
// explicite, et c'est ce qui empêche la ville d'être un bonus gratuit.
// (Même traitement que le voyage d'Eduardo, res.trip.phase === "away".)

/* ---- LES ACTIVITÉS. Une activité = un endroit + une durée + une réplique.
   ⚠️ ELLE EST DIFFUSÉE DANS LE MESSAGE D'ARRÊT QUI EXISTE DÉJÀ (`residentStops`
   gagne un champ `a`), jamais dans un message à elle. Un résident qui s'assoit
   s'arrête forcément : l'information voyage donc avec l'arrêt, ou pas du tout. */
// Plancher de durée d'activité : il ne sert QUE de repli, quand un résident abandonne son
// trajet (obstacle) et fait sur place ce qu'il était parti faire. Les durées normales sont
// dans TOWN_ACTS, activité par activité — un maximum global en plus serait un second réglage
// pour la même chose, donc une divergence en attente (§8).
export const TOWN_ACT_MIN_MS = 7 * 1000;
export const TOWN_RES_BUBBLE_MS = 5200;    // durée d'affichage d'une réplique d'activité
/* ⚠️⚠️ ZIP 428 — LA TOLÉRANCE D'ARRIVÉE SUR UN POINT DE PASSAGE, ET C'EST UN
   RÉGLAGE MESURÉ, PAS UN GOÛT. Le suiveur avance en ligne droite d'un point au
   suivant ; chaque segment a été validé DEPUIS SON DÉPART EXACT par
   E.townFindPath. Accepter l'arrivée trop tôt, c'est repartir d'un point que
   personne n'a validé. Mesuré sur ~600 trajets à travers toute la ville :

       0,35 (valeur du 427) ............. 93,0 % d'arrivées
       0,20 + recalage .................. 100 %
       0,15 + recalage .................. 100 %

   Le recalage (townResidentRoam pose x/y sur le point atteint) fait l'essentiel
   du travail ; ce seuil-ci ne sert plus qu'à ne pas tourner autour du point une
   image de trop. On le garde donc large plutôt que serré : un seuil PLUS PETIT
   que le pas d'une image (vitesse × dt ≈ 0,025 case) ferait osciller. */
export const TOWN_WP_ARRIVE = 0.2;
/* Essais de recalcul avant d'abandonner un trajet (voir le garde anti-blocage de
   townResidentRoam). Deux suffisent : le cas résiduel est un demi-pixel au ras
   d'un palier, et un chemin recalculé depuis la position réelle en sort. La
   borne existe pour qu'un cas non prévu ne fasse pas chercher un chemin par
   seconde et par résident chez l'hôte, indéfiniment et sans bruit. */
export const TOWN_REPATH_TRIES = 2;
/* ⚠️ ZIP 428 — OÙ SE POSE QUELQU'UN D'ASSIS, EN CASES, AU SUD DE LA CASE DU
   BANC. Ce nombre était écrit en dur (0,45) dans le rendu des résidents ; le
   joueur pouvant maintenant s'asseoir lui aussi, il aurait fallu l'écrire une
   seconde fois — donc un joueur et un PNJ assis côte à côte sur la MÊME planche
   à deux hauteurs différentes, au premier ajustement. C'est le doublon du §8,
   et la parade est la même : un seul endroit. La géométrie qui le justifie (le
   dossier, l'assise et le sol du sprite de banc) est dans SEAT_POSE, côté
   fermeArt — c'est là que se dessine, ici que se place. */
export const TOWN_SEAT_OFFSET = 0.45;
/* ZIP 429 — ON S'ASSOIT À PLUSIEURS SUR LE MÊME BANC (demande de Guillaume).
   ⚠️ LES PLACES SONT DES DÉCALAGES, PAS DES CASES. Un banc occupe UNE case
   bloquante et un sprite de 40 px : découper trois cases pour trois places
   aurait obligé le générateur à réserver trois fois plus de place, donc à
   refuser des bancs là où il en pose aujourd'hui. Une place est donc un
   décalage horizontal en cases autour du centre du banc — le dessin s'y pose,
   la collision ne connaît que la case.
   ⚠️ L'ÉCART EST DÉRIVÉ DE LA LARGEUR DU SPRITE, pas choisi : 52 px de banc
   dont 38 occupés par trois personnages, il reste sept pixels d'accoudoir de
   chaque côté. Ce sont EUX qui disent « ils sont assis dessus » plutôt que
   « ils sont debout en rang » — voir la note de plazaBenchSprite. */
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 429 — LA BOUSSOLE GPS. ⚠️ TOUT EST LOCAL : aucune de ces valeurs ne
   décrit un état partagé, et la destination elle-même ne quitte jamais le
   client qui l'a posée (voir gpsRef, FermeGame.js).
   ⚠️ LES TAILLES SONT EN PIXELS D'ÉCRAN, PAS EN CASES, et c'est délibéré : un
   repère d'interface doit garder la même taille quel que soit le zoom, sans
   quoi il se confond avec le décor. C'est l'inverse exact de la règle qui vaut
   pour tout le reste du jeu (§« sans perturber le gameplay », zip 428). */
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 429 — LA COURSE. (demande de Guillaume : « conçois un mode de
   transportation plus rapide »)
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST UN MODE DE DÉPLACEMENT, PAS UN VÉHICULE, ET LE CHOIX EST MOTIVÉ.
   Un véhicule (vélo, omnibus, tramway) aurait demandé : un sprite par
   orientation, un état PARTAGÉ « qui l'utilise » à arbitrer par l'hôte, des
   points de stationnement à dériver de la carte, et une réconciliation quand
   un joueur se déconnecte dessus. Soit exactement le genre de chantier que le
   §0 range du côté « on en ajoute un de plus » plutôt que « on en finit un ».
   La course ne coûte AUCUN de ces états : elle multiplie une vitesse qui
   voyage DÉJÀ dans le paquet de position depuis le 365 (`vx`/`vy`, la
   « réplication par intention »). Les autres joueurs voient donc quelqu'un
   courir sans une ligne de réseau en plus, et sans qu'aucun client ait à
   savoir ce qu'est la course.

   ⚠️ ELLE COÛTE DE L'ÉNERGIE, ET C'EST CE QUI EN FAIT UN CHOIX. Gratuite, elle
   deviendrait la vitesse par défaut : plus personne ne marcherait, et on
   aurait simplement augmenté PLAYER_SPEED en ajoutant une touche à tenir. Le
   débit est calibré pour qu'une traversée complète de Valley Town au pas de
   course (~220 cases) coûte une dizaine de points — sensible, jamais punitif.
   ⚠️ ET ELLE S'ARRÊTE À ZÉRO plutôt que d'entamer autre chose : un jeu qui
   laisse courir jusqu'à l'épuisement oblige à surveiller une jauge au lieu de
   regarder la ville.
   ⚠️ Elle ne s'applique PAS à cheval : le cheval est déjà le mode rapide de la
   ferme, et cumuler les deux ferait traverser la carte en quatre secondes. */
export const RUN_SPEED_MULT = 1.75;        // ×1,75 la marche
export const RUN_ENERGY_PER_SEC = 0.55;    // ~10 points pour traverser Valley Town
export const RUN_MIN_ENERGY = 5;           // en dessous, on ne court plus (on ne s'écroule pas)
/* ⚠️ LE PLAFOND D'UN DÉBIT, POSÉ CÔTÉ HÔTE. La course envoie des points entiers
   au fil de l'eau ; ce plafond dit qu'aucune requête ne peut en réclamer plus
   que ce qu'une seconde de course coûte, avec une marge. Il n'est pas là pour
   la course elle-même (qui envoie 1 à la fois) mais pour ce que la requête
   `spendEnergy` deviendra le jour où quelqu'un s'en resservira ailleurs. */
export const RUN_ENERGY_CLAMP = 3;
export const GPS_MARK_PX = 11;        // demi-hauteur du triangle
export const GPS_ORBIT_PX = 46;       // rayon de l'orbite autour du joueur
export const GPS_ARRIVE_TILES = 2.2;  // en deçà, on est arrivé et la boussole s'éteint
export const GPS_CLEAR_TILES = 3;     // recliquer à moins de ça sur le plan efface la destination
/* ⚠️ ZIP 445 — LE CHEVRON DE LA QUÊTE (voir `drawStarChevron`). Il est un peu
   plus petit que le triangle de la boussole et il orbite PLUS LOIN : les deux
   peuvent être à l'écran en même temps, et sur le même cercle ils se
   recouvriraient très exactement dans le cas le plus fréquent — celui où l'on a
   posé sa boussole sur l'objectif de la quête. Deux repères superposés, c'est
   un repère de perdu et un repère illisible. */
export const STAR_CHEVRON_PX = 10;
export const STAR_CHEVRON_ORBIT_PX = 64;
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 430 — LE MARCHÉ DU CHAMP DE FOIRE.
   ⚠️ AUCUNE DE CES VALEURS N'EST UN ÉTAT : le cours du jour est une pure
   fonction du numéro de jour (voir E.marketRate). Rien n'est stocké, rien n'est
   diffusé, rien n'est à migrer. */
export const MARKET_SPREAD = 0.35;     // cote entre +0 % et +35 % du prix de la ferme
export const MARKET_DAY_EVERY = 7;     // un jour de marché par semaine de jeu
/* La zone où l'on vend. ⚠️ ELLE EST PLUS LARGE QUE LE CHAMP DE FOIRE lui-même :
   les étals sont solides, on se tient FORCÉMENT à côté et jamais dessus, et un
   rayon calé au pixel sur l'emprise refuserait la vente à quelqu'un qui est
   visiblement au marché. Une portée qui refuse alors que le jeu propose est le
   défaut que le 426 s'est juré de ne plus commettre. */
export const MARKET_RANGE_TILES = 4;
/* ⚠️⚠️ ZIP 439 — PASSÉ DE 3 À 2, ET C'EST UNE CONSÉQUENCE DU DESSIN, PAS UN
   RÉGLAGE. Le banc de bois est désormais celui de la planche de référence de
   Guillaume (36 px de large) et non plus celui du 429 (52 px). Trois places
   espacées de 0,69 case font 38 px d'occupants : elles débordaient du banc des
   deux côtés — exactement le défaut que le 429 avait corrigé en l'élargissant,
   retrouvé par l'autre bout. Deux places tiennent en 27 px et laissent quatre
   pixels d'accoudoir libres de chaque côté, ce qui est la proportion que le 429
   avait mesurée comme juste.
   ⚠️ CE NOMBRE SE DÉDUIT DE LA LARGEUR DU SPRITE : le jour où le banc change de
   dessin, c'est ici qu'il faut revenir. `tools/render-assise.mjs` le montre. */
export const TOWN_SEATS_PER_BENCH = 2;
export const TOWN_SEAT_SPACING = 0.69;   // 11 px sur les 52 du sprite (voir plazaBenchSprite)
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 428 — LE DÉZOOM À L'APPROCHE DES GRANDS BÂTIMENTS.
   ⚠️ TOWN_ZOOM_NEAR EST UN ENTIER, ET CE N'EST PAS NÉGOCIABLE. À 2, une case
   fait 32 px et le sprite du tribunal (11 cases) tient dans 352 px : il passe
   entier sur n'importe quelle fenêtre. À 2,5 il tiendrait aussi — mais une
   échelle fractionnaire sur du pixel art donne des pixels de tailles inégales
   qui CHANGENT de taille quand la caméra bouge, et ça grouille. La règle du
   jeu est « au repos, l'échelle est entière » ; le fondu est le seul moment où
   elle ne l'est pas, et à ce moment-là l'image bouge de toute façon.
   ⚠️ Et on ne descend pas plus bas : à 1, un personnage fait 16 px de haut à
   l'écran et on ne distingue plus qui est qui — la ville deviendrait lisible
   au prix des gens qui l'habitent. */
export const TOWN_ZOOM_NEAR = 2;
export const TOWN_ZOOM_MS = 520;      // durée du fondu d'échelle
/* Marge en CASES autour de l'emprise d'un monument. ⚠️ Elle est GÉNÉREUSE
   exprès : le dézoom doit être TERMINÉ quand on arrive au pied du bâtiment. Un
   fondu qui démarre au moment où l'on se colle à la porte donne l'impression
   que la caméra recule parce qu'on a fait quelque chose, alors qu'elle doit
   avoir l'air d'avoir toujours été là. */
export const TOWN_ZOOM_MARGIN = 7;
/* Les activités connues. `sit` = le personnage est dessiné ASSIS (buste seul,
   posé sur le banc) — c'est la seule qui change le dessin, les autres se
   contentent d'une pose immobile et d'une bulle.
   ⚠️ La liste des ENDROITS n'est pas ici : elle est DÉRIVÉE de la carte
   (E.townSpots), pour la raison du §8 — un décor et sa liste d'endroits réglés
   séparément divergent au premier déplacement de banc. */
export const TOWN_ACTS = {
  sit:      { ms: [12000, 26000], sit: true },  // banc : on y reste plus longtemps
  fountain: { ms: [8000, 16000] },              // regarder la fontaine
  kiosk:    { ms: [10000, 20000] },             // écouter (ou faire) de la musique
  stall:    { ms: [7000, 14000] },              // faire son marché
  well:     { ms: [6000, 12000] },              // tirer de l'eau
  grave:    { ms: [10000, 18000] },             // se recueillir
  pier:     { ms: [12000, 24000] },             // regarder le lac
  view:     { ms: [12000, 22000] },             // le belvédère
  window:   { ms: [8000, 16000] },              // lécher la vitrine de la boutique
  board:    { ms: [6000, 12000] },              // lire le tableau des nouvelles
  statue:   { ms: [6000, 12000] },
  pray:     { ms: [8000, 16000] },              // le parvis de l'église
  /* ZIP 428 — LES SIX QUARTIERS QUI N'AVAIENT AUCUNE ACTIVITÉ. Voir la longue
     note de E.townSpots : 33 des 48 blocs ouverts de la ville n'avaient aucun
     endroit de vie, et un quart des endroits existants étaient des tombes.
     ⚠️ LES DURÉES NE SONT PAS COPIÉES AU HASARD SUR LES ANCIENNES. Elles disent
     ce qu'on vient faire : on s'accoude longtemps au bord d'un lac, on ne
     s'arrête qu'un instant au coin d'une rue. C'est ce contraste de durées,
     bien plus que le nombre d'endroits, qui fait qu'une ville a des quartiers
     calmes et des quartiers de passage. */
  shore:    { ms: [12000, 24000] },             // la promenade du lac, au bord de l'eau
  pond:     { ms: [9000, 18000] },              // l'étang du parc
  orchard:  { ms: [8000, 16000] },              // sous les arbres du verger municipal
  craft:    { ms: [7000, 14000] },              // regarder travailler, chez les artisans
  fair:     { ms: [6000, 13000] },              // traîner entre les rangées du champ de foire
  flowers:  { ms: [7000, 15000] },              // les parterres de la place
  stroll:   { ms: [3500, 8000] },               // ⚠️ COURT EXPRÈS : on ne s'arrête pas dans une rue, on y flâne
};

/* ---- LES RENCONTRES. C'est l'architecture sociale, et elle tient en une
   phrase : DEUX RÉSIDENTS QUI SE CROISENT EN VILLE SE PARLENT, et ce qu'ils se
   disent dépend de RESIDENT_AFFINITIES (zip « relations entre résidents »), qui
   existait déjà et n'était qu'informatif.
   ⚠️ C'EST L'HÔTE QUI APPARIE, ET LUI SEUL. Deux clients qui décideraient
   chacun d'une rencontre en verraient deux différentes — c'est exactement le
   défaut corrigé au zip « dispute Chloé/Rosalie vue de tous », on ne le refait
   pas. La scène voyage ensuite dans le message d'arrêt (`a` = "talk"), et les
   RÉPLIQUES sont dérivées d'une graine partagée, jamais transmises. */
export const TOWN_MEET_DIST = 3.4;             // distance de déclenchement
export const TOWN_MEET_MS = 15 * 1000;         // durée d'une conversation
export const TOWN_MEET_COOLDOWN_MS = 75 * 1000; // avant que les deux mêmes se reparlent
export const TOWN_MEET_CHANCE = 0.55;
/* ⚠️ PAS DE « DISTANCE DE RAPPROCHEMENT » ICI, ET C'EST UN CHOIX MESURÉ. Le premier
   jet faisait converger les deux résidents l'un vers l'autre : un déplacement de plus à
   diffuser, un risque de plus de rester coincé dans un mur, et à l'écran ça ne se lit pas
   mieux qu'un face-à-face — ils sont déjà à trois cases. Ils se TOURNENT l'un vers l'autre,
   ce qui ne coûte rien et se voit. Une constante que personne ne lit ment plus qu'elle
   n'informe (leçon de TOWN_CORE au 426) : celle-là a donc été supprimée plutôt que gardée
   « au cas où ». */
/* ⚠️⚠️ LE DÉLAI DE GRÂCE À LA DESCENTE DU TRAIN, ET IL A ÉTÉ TROUVÉ EN JEU, PAS
   À LA RELECTURE. Sans lui, la vie sociale s'étrangle elle-même : cinq
   résidents descendent le même quai à la même seconde, donc tous à moins de
   TOWN_MEET_DIST les uns des autres, donc l'hôte les apparie IMMÉDIATEMENT.
   Chacun se fige quinze secondes pour bavarder, repart, se retrouve encore
   collé aux autres, et se refige. Résultat observé : la moitié de la ville
   plantée sur le quai à se dire bonjour en boucle, et pas un seul résident qui
   arrive jamais à la place. Personne ne quitte la gare.
   La correction n'est pas de baisser la distance de rencontre (ça les
   empêcherait de se parler ailleurs, là où c'est justement le but) : c'est de
   dire qu'on ne se salue pas SUR LE QUAI. Un débarquement n'est pas une
   rencontre — d'abord on s'éparpille, ensuite on se croise. */
export const TOWN_MEET_ARRIVE_GRACE_MS = 25 * 1000;

/* ---- LA FAMILLE (nouveaux personnages).
   Demande : « certains membres de leur famille puissent être présents ... en
   tant qu'invités à Valley Town ».

   ⚠️⚠️ UN INVITÉ N'EST PAS UNE ENTITÉ, ET C'EST TOUT L'INTÉRÊT. Sa position est
   DÉRIVÉE de celle du résident qu'il accompagne, exactement comme Leo derrière
   Carla depuis le 376 : il marche dans ses pas avec un retard mesuré le long du
   chemin déjà parcouru. Conséquences, toutes bonnes : zéro message réseau, zéro
   simulation, et il ne peut pas traverser un mur puisqu'il rejoue un trajet que
   la collision a déjà validé. Vingt résidents peuvent donc sortir accompagnés
   sans coûter un octet de plus.

   Ce qui voyage : UN entier, `res.guest`, l'index dans la liste ci-dessous —
   posé au départ du séjour, effacé au retour. Il part avec la station.

   `small: true` = un enfant : même feuille de sprite, dessinée à
   TOWN_GUEST_CHILD_SCALE. Pas un octet d'art en plus pour un personnage qu'on
   reconnaît au premier coup d'œil. */
export const TOWN_GUEST_CHANCE = 0.42;         // un séjour sur deux, à peu près
export const TOWN_GUEST_FOLLOW_DIST = 1.15;    // en cases, le long du chemin (cf. LEO_FOLLOW_DIST)
export const TOWN_GUEST_CHILD_SCALE = 0.74;
export const RESIDENT_FAMILY = {
  1:  [{ name: "Solène Martial", rel: "spouse", gender: "f", outfit: 4 },
       { name: "Ti-Jo", rel: "son", gender: "m", outfit: 2, small: true }],
  16: [{ name: "Hubert", rel: "brother", gender: "m", outfit: 0, cap: true }],
  25: [{ name: "Maryse", rel: "spouse", gender: "f", outfit: 6 },
       { name: "Nono", rel: "grandson", gender: "m", outfit: 5, small: true }],
  26: [{ name: "Katrin", rel: "sister", gender: "f", outfit: 2 }],
  27: [{ name: "Bérangère", rel: "spouse", gender: "f", outfit: 7 },
       { name: "Loulou", rel: "daughter", gender: "f", outfit: 3, small: true }],
  28: [{ name: "Mamie Odette", rel: "grandmother", gender: "f", outfit: 5 }],
  29: [{ name: "Duarte", rel: "cousin", gender: "m", outfit: 6, cap: true }],
  30: [{ name: "Leo", rel: "assistant", gender: "m", outfit: 0, look: "leo" }],
};
/* ⚠️ CARLA SORT TOUJOURS AVEC LEO, JAMAIS SEULE — et ce n'est pas un tirage.
   Le 376 en avait fait une règle de personnage ; la casser en ville la
   contredirait à l'endroit même où elle est censée régner. Son entrée dans
   RESIDENT_FAMILY est donc une famille d'UN SEUL membre, tirée à coup sûr. */
export const ALWAYS_GUEST_RIDS = [CARLA_RID];

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LES DEUX NOUVELLES ADRESSES DE LA HAUTE-VILLE.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ ELLES SONT EN HAUT DES MARCHES, ET C'EST UN CHOIX DE LECTURE. Le 425 avait
   écrit la règle en posant deux parcelles sur la terrasse : « les hauteurs sont
   les belles adresses ». Une boutique chic au niveau de la rue, entre le
   marché aux légumes et le puits, n'aurait pas été chic — elle aurait été une
   échoppe de plus. Posée au sommet de la volée monumentale, à côté du tribunal,
   elle achète sa réputation avec la montée, comme le tribunal achète la sienne
   avec le fronton. Et ça donne à l'escalier une TROISIÈME raison d'exister.
   ⚠️ Un panneau au pied des marches l'annonce (voir TOWN_STREET_SIGNS dans le
   générateur) : une boutique qu'on ne trouve qu'en montant par hasard n'existe
   pas. */
export const TOWN_BOUTIQUE = { x: 121, y: 12, w: 8, h: 5 };   // Maison Garfield
export const TOWN_SALON = { x: 152, y: 12, w: 7, h: 4 };      // salon de coiffure, « ouverture prochaine »

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LA GARDE-ROBE DE LA MAISON GARFIELD.
   ───────────────────────────────────────────────────────────────────────────
   Demande : « tout est très cher mais permettra de changer ses vêtements,
   styles, couleurs de vêtements, etc. ; accessoires comme chapeaux, écharpes,
   robes originales ».

   ⚠️⚠️ TOUT LE COSMÉTIQUE TIENT DANS UNE CHAÎNE, ET IL LE FAUT. Le paramètre
   `look` de getChar/drawCharFrame (zip 376) a justement été créé pour ne plus
   allonger la signature d'un booléen par personnage ; on s'en sert. La tenue
   d'un joueur s'encode `"w<chapeau><écharpe><tenue><teinte>"`, quatre chiffres,
   par ex. `"w2103"`. Conséquences en chaîne, toutes voulues :
     * ELLE TIENT DANS LE PAQUET DE POSITION qui circule déjà (`pubMe`), donc
       zéro message de plus pour que les autres voient mes vêtements ;
     * elle sert de CLÉ DE CACHE de feuille de sprite telle quelle (S.getChar),
       donc une tenue donnée n'est peinte qu'une fois ;
     * une sauvegarde ancienne (pas de chaîne) donne un fermier habillé comme
       avant, ce qui est exactement le bon comportement.
   ⚠️ ET LES INDICES SONT DÉCALÉS DE 1 : 0 = « rien ». Le chiffre 0 doit vouloir
   dire « pas de chapeau », sinon on ne peut plus retirer un chapeau une fois
   acheté — et on se retrouve à ajouter un article « pas de chapeau » à la
   boutique, ce qui est absurde à voir dans une vitrine. */
export const WARDROBE_HATS = [
  { id: "beret",   name: "Béret cerise",        nameEn: "Cherry beret",     price: 2400 },
  { id: "capeline",name: "Capeline de paille",  nameEn: "Straw capeline",   price: 3600 },
  { id: "tophat",  name: "Haut-de-forme",       nameEn: "Top hat",          price: 6800 },
  { id: "beanie",  name: "Bonnet côtelé",       nameEn: "Ribbed beanie",    price: 1500 },
  { id: "crown",   name: "Diadème de la vallée",nameEn: "Valley tiara",     price: 14000 },
];
export const WARDROBE_SCARVES = [
  { id: "silk",    name: "Écharpe de soie",     nameEn: "Silk scarf",       price: 2200 },
  { id: "feather", name: "Boa de plumes",       nameEn: "Feather boa",      price: 5200 },
  { id: "fur",     name: "Étole de fourrure",   nameEn: "Fur stole",        price: 8800 },
  { id: "knit",    name: "Grosse maille",       nameEn: "Chunky knit",      price: 1200 },
];
export const WARDROBE_OUTFITS = [
  { id: "gown",    name: "Robe du soir",        nameEn: "Evening gown",     price: 9500 },
  { id: "cape",    name: "Cape de velours",     nameEn: "Velvet cape",      price: 7400 },
  { id: "suit",    name: "Tailleur strict",     nameEn: "Sharp suit",       price: 6600 },
  { id: "poncho",  name: "Poncho de la vallée", nameEn: "Valley poncho",    price: 3100 },
  { id: "tutu",    name: "Tutu d'apparat",      nameEn: "Ceremonial tutu",  price: 12500 },
];
/* Les teintes. ⚠️ ELLES S'APPLIQUENT AU VÊTEMENT, PAS AU SPRITE ENTIER : teinter
   la feuille complète colorerait la peau et les cheveux (et c'est le même piège
   que le `fillRect` de teinte du §4 — on croit assombrir, on peint une boîte).
   `price` unique : une couleur ne vaut pas plus qu'une autre, sauf l'or. */
export const WARDROBE_TINTS = [
  { id: "cherry",  name: "Cerise",     nameEn: "Cherry",    col: "#c0304a", price: 900 },
  { id: "ink",     name: "Encre",      nameEn: "Ink",       col: "#26314f", price: 900 },
  { id: "moss",    name: "Mousse",     nameEn: "Moss",      col: "#3d6b3a", price: 900 },
  { id: "cream",   name: "Crème",      nameEn: "Cream",     col: "#e8dcc0", price: 900 },
  { id: "plum",    name: "Prune",      nameEn: "Plum",      col: "#5b2d54", price: 1400 },
  { id: "ocean",   name: "Océan",      nameEn: "Ocean",     col: "#20707f", price: 1400 },
  { id: "rose",    name: "Rose thé",   nameEn: "Tea rose",  col: "#d98aa0", price: 1400 },
  { id: "gold",    name: "Or Garfield",nameEn: "Garfield gold", col: "#d8a93a", price: 4500 },
];
export const WARDROBE_SLOTS = ["hat", "scarf", "outfit", "tint"];
export function wardrobeCatalog(slot) {
  return slot === "hat" ? WARDROBE_HATS : slot === "scarf" ? WARDROBE_SCARVES
       : slot === "outfit" ? WARDROBE_OUTFITS : WARDROBE_TINTS;
}
/* ⚠️ UNE SEULE FONCTION FABRIQUE LA CHAÎNE, ET UNE SEULE LA RELIT (voir
   `parseLookWardrobe` dans fermeArt.js). Deux encodages du même vêtement, c'est
   la garantie qu'un jour on porte un chapeau que les autres ne voient pas. */
export function wardrobeLook(worn) {
  if (!worn) return null;
  const d = (n) => String(Math.max(0, Math.min(9, n | 0)));
  const s = "w" + d(worn.hat) + d(worn.scarf) + d(worn.outfit) + d(worn.tint);
  return s === "w0000" ? null : s;   // rien porté = pas de chaîne du tout
}
// Léo tient la caisse, et il en fait des tonnes : le prix affiché est le prix
// payé, mais il l'annonce toujours avec une flatterie (voir leoUpsellLines).
export const LEO_UPSELL_MS = 5200;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — CE QU'ON PEUT FAIRE EN VILLE (les points d'intérêt animés).
   ⚠️ CHACUN COÛTE UNE SEULE CHOSE AU RÉSEAU : RIEN. Le vœu de la fontaine passe
   par une `req` déjà existante (l'or est arbitré par l'hôte, comme tout achat) ;
   le reste est purement local et dérivé du temps de jeu partagé, comme les
   rembarrages de Carla à Leo (CARLA_SCOLD_MS). */
export const TOWN_WISH_COST = 25;              // pièce jetée dans la fontaine
export const TOWN_WISH_COOLDOWN_MS = DAY_REAL_MS; // un vœu par jour de jeu et par joueur
export const TOWN_WISH_GOLD_MIN = 0, TOWN_WISH_GOLD_MAX = 400; // ce que la fontaine rend, parfois
export const TOWN_KIOSK_NOTE_MS = 380;         // cadence des notes de musique au kiosque

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 427 — LA GARE DE VALLEY TOWN.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « donne la même forme et attention graphique aux rails
   et à la station de Valley Town qu'à celles de Valley Farm, pour cohérence
   visuelle ».

   ⚠️⚠️ LA RÉPONSE N'EST PAS DE DESSINER UNE SECONDE GARE, C'EST D'ARRÊTER D'EN
   DESSINER UNE DEUXIÈME. Depuis le 234, la ville peignait ses rails à la main,
   dans la boucle de rendu : trois `fillRect` (ballast plat, une traverse une
   rangée sur deux, deux traits d'acier) pendant que la ferme, elle, posait le
   sprite `railHalf` du zip 232 (ballast granuleux, traverses larges, rail
   éclairé sur son arête). Deux dessins d'une même voie ferrée — c'est le doublon
   du §8, et il a donné exactement ce qu'un doublon donne : le même objet, deux
   fois moins soigné d'un côté, et personne pour s'en apercevoir avant qu'on
   compare les deux écrans.
   La ville réutilise donc `railL`/`railR`/`platform` TELS QUELS, et le bâtiment
   `station` tel quel. Zéro sprite nouveau, zéro divergence possible, et le
   « même soin » est garanti par construction plutôt que par relecture.

   ⚠️ ET LE BÂTIMENT DOIT ÊTRE BLOQUANT DANS LE GÉNÉRATEUR. Un décor massif qui
   ne bloque pas, c'est la réciproque du mur invisible du 425 — on traverse une
   gare. Le banc de contrôle teste les deux sens. */
export const TOWN_STATION = { x: 6, y: 62, w: 4, h: 3 };   // même gabarit que STATION (ferme)

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 480 — L'AUDIENCE CHEZ LE MAIRE : LES NOMBRES DE LA NÉGOCIATION.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume, mot pour mot : « une vraie discussion longue, avec un
   maire réticent au départ qu'on devra convaincre en choisissant les bonnes
   réactions », « une jauge de persuasion », et — c'est ce qui décide de toute
   la forme — « si l'on ne fait rien, la jauge de patience/persuasion descend
   continûment. D'où l'intérêt de trouver les bonnes réponses et de LES
   ENCHAÎNER ».

   ⚠️⚠️⚠️ UNE SEULE GRANDEUR, DEUX SENS, ET C'EST LE CŒUR DU RÉGLAGE. Le premier
   jet avait DEUX ressources : une jauge d'adhésion et un quart d'heure décompté
   en tours. Guillaume l'a refusé, et il a eu raison pour une raison qui est
   écrite en tête de CLAUDE.md : « deux grandeurs qui s'opposent se mesurent
   ensemble ou pas du tout » (458). Ici, la FUITE EST L'HORLOGE — hésiter coûte
   littéralement des points, il n'y a rien de plus à afficher, et le banc n'a
   qu'une différence à calculer au lieu de deux courbes à croiser.

   ⚠️⚠️ CE QUE LA FUITE NE DOIT SURTOUT PAS PUNIR, C'EST LA LECTURE. Une jauge
   qui descend pendant qu'on lit trois répliques transforme un dialogue en test
   de vitesse de lecture, et pénalise d'autant plus le joueur anglophone que le
   français gonfle de 15 à 20 %. La grâce est donc DÉRIVÉE DU TEXTE LUI-MÊME
   (`MAYOR_READ_MS_CHAR` × le nombre de signes réellement affichés), jamais
   réglée à la main — §8 de CLAUDE.md : un paramètre qui double un autre
   paramètre est une divergence en attente.

   ⚠️ AUCUN DE CES NOMBRES N'EST ÉCRIT DEUX FOIS. `maire.js` les lit, le banc
   `verify-maire.mjs` les lit, la vue 3D ne lit que la jauge résolue.
   ═══════════════════════════════════════════════════════════════════════════ */
export const MAYOR_ADH_MAX = 100;          // le haut de la jauge d'adhésion
export const MAYOR_ADH_WIN = 75;           // à partir d'ici il PEUT signer
export const MAYOR_ADH_FLOOR = 0;          // en dessous, il met fin à l'entretien

/* ⚠️⚠️ LES DEUX DÉPARTS, ET C'EST TOUTE LA RÉPONSE DE GUILLAUME SUR LES PLANS :
   « si l'on n'a pas encore les plans du bateau délivrés par l'ingénieur, le
   maire sera très difficile à convaincre. Si l'on a déjà les plans alors il
   sera toujours un peu radin et réticent mais ce sera moins difficile ».
   Les plans ne sont donc PAS une serrure — on peut monter le voir sans eux, et
   gagner. Ils changent le DÉPART, la FUITE et la valeur des arguments qui
   demandent une preuve. Une porte fermée aurait été plus courte à écrire et
   aurait retiré au joueur la seule décision intéressante de tout le chapitre :
   y aller tout de suite, ou attendre d'avoir de quoi montrer. */
export const MAYOR_START_PLANS = 24;       // plans en main : réticent, pas hostile
export const MAYOR_START_BARE = 18;        // les mains vides : très difficile

/* La fuite nue, en points par seconde. À 2,0 la jauge pleine se vide en
   cinquante secondes : c'est court, et c'est voulu — on ne rêvasse pas devant
   un maire qui vous a donné un quart d'heure. */
export const MAYOR_DRAIN_PER_S = 2.0;
/* ⚠️ LE JOUR D'AUDIENCE EST UN BONUS, PAS UNE ATTENTE. `mayorAudienceDay` existe
   depuis le 439 et n'était jusqu'ici qu'une DATE AFFICHÉE : rien dans le jeu ne
   se comportait différemment ce jour-là. Le rendez-vous officiel ne barre donc
   aucune porte (on monte le voir n'importe quand, l'accueil fait monter) — mais
   ce jour-là il est préparé, il n'est pas interrompu, et il décroche moins vite.
   Une date qui ne change rien est une date qui ment. */
export const MAYOR_DRAIN_AUDIENCE_K = 0.7;
/* Après une faute, il décroche vite pendant quelques secondes : c'est le moment
   où l'on sent qu'on vient de perdre la salle, et il faut qu'il se sente.
   ⚠️⚠️⚠️ MAIS LE GLISSEMENT ACCOMPAGNE LA FAUTE, IL NE LA DOUBLE PAS. Réglé à
   4 s × 2,2, il coûtait à lui seul quatorze points de plus que la fuite
   ordinaire, c'est-à-dire PLUS que la bourde qui l'avait déclenché : une seule
   maladresse d'accueil fermait l'entretien chez Bonnefoy, et le joueur n'avait
   aucun moyen d'attribuer les dégâts à la bonne cause. *Une pénalité invisible
   plus grosse que la pénalité visible n'est pas une pénalité, c'est un piège.*
   Le banc tient maintenant l'invariant : le glissement ne coûte jamais plus que
   la faute elle-même. */
export const MAYOR_SLIP_MS = 3000;
export const MAYOR_SLIP_K = 1.7;

/* ⚠️⚠️ L'ÉLAN — « d'où l'intérêt de trouver les bonnes réponses et de les
   ENCHAÎNER ». Deux réponses idéales de suite ARRÊTENT la fuite ; trois
   l'INVERSENT (il s'anime tout seul, il vous coupe la parole pour finir votre
   phrase). Une réponse tiède ramène l'élan à un, une faute le casse à zéro.
   C'est la seule règle du système qui récompense la SUITE plutôt que le coup,
   et c'est elle qui distingue une négociation d'un questionnaire. */
export const MAYOR_STREAK_HOLD = 2;        // la fuite se réduit
export const MAYOR_STREAK_GAIN = 3;        // elle s'inverse
export const MAYOR_STREAK_RISE_PER_S = 0.8;
/* ⚠️⚠️ L'ÉLAN RÉDUIT LA FUITE, IL NE L'ANNULE PAS — CORRIGÉ APRÈS LECTURE DES
   TRANSCRIPTIONS DU BANC, ET C'EST LE MEILLEUR ARGUMENT POUR §7 DE
   `verify-maire.mjs`. À l'annulation pure, un sans-faute ne payait plus rien à
   partir du troisième échange : il plafonnait à 100 au SEPTIÈME nœud et les six
   derniers ne servaient plus à rien. Aucun contrôle numérique ne l'aurait dit
   (tout était vert : le jeu parfait gagnait, le jeu tiède perdait) ; ça se voit
   en lisant la colonne de gauche d'un entretien imprimé. *Une négociation dont
   la seconde moitié ne peut plus rien changer n'est pas longue, elle est finie
   depuis un moment.* */
export const MAYOR_STREAK_HOLD_K = 0.3;

/* ⚠️⚠️⚠️ AUCUNE HÉSITATION NE PEUT COÛTER PLUS QU'UNE BONNE RÉPONSE NE RAPPORTE.
   C'est l'invariant qui décide si ce jeu récompense de répondre BIEN ou de
   répondre VITE, et le premier passage du banc l'a montré cru : à 2 points par
   seconde, neuf secondes de réflexion coûtaient dix-huit points, c'est-à-dire
   plus que la meilleure réplique de l'arbre. Un joueur qui LIT et qui pèse
   perdait contre un joueur qui martèle, ce qui est très exactement l'inverse de
   la mécanique demandée. La fuite est donc BORNÉE par échange.
   ⚠️ Et elle ne court pas AVANT le premier échange : il vous a reçu, il vous a
   donné un quart d'heure, il ne se lève pas parce que vous avez marqué un temps
   avant votre première phrase. */
export const MAYOR_DRAIN_CAP = 4;
/* ⚠️⚠️ SA VALEUR N'EST PAS LIBRE : elle doit rester SOUS la plus faible des
   répliques idéales de la table, sinon la phrase ci-dessus devient fausse chez
   le maire le plus hostile — c'est ce qui arrivait à 9, où deux hésitations
   longues d'affilée effaçaient plus que deux bonnes réponses ne rapportaient.
   ⚠️ Le lien est tenu par `verify-maire.mjs`, qui lit les deux et refuse qu'ils
   se croisent : un nombre qui en double un autre se DÉRIVE ou se MESURE, il ne
   se règle pas à la main des deux côtés (§8 de CLAUDE.md). */

/* La grâce de lecture : dérivée du texte affiché, bornée par le bas pour qu'une
   réplique très courte laisse quand même le temps de la voir arriver. */
export const MAYOR_READ_MS_CHAR = 26;
export const MAYOR_READ_MS_MIN = 1600;
export const MAYOR_READ_MS_MAX = 14000;

/* ⚠️⚠️ SANS LES PLANS, ON NE PEUT RIEN PROUVER — ET C'EST UNE RÈGLE, PAS
   QUARANTE VARIANTES DE RÉPLIQUES. Tout argument de la famille `risk` (la
   sûreté, la responsabilité, le devis) perd la moitié de sa valeur quand on n'a
   rien à poser sur le bureau, et les répliques qui NOMMENT les plans sont
   simplement remplacées par leur version les mains vides (`when`). Écrire deux
   arbres complets aurait été le doublon du §8, avec la divergence garantie au
   premier réglage. */
export const MAYOR_BARE_RISK_K = 0.5;
/* ⚠️⚠️⚠️ IL Y AVAIT ICI UN SECOND MALUS, `MAYOR_BARE_IDEAL_K`, ET IL EST
   SUPPRIMÉ PLUTÔT QUE MIS À 1 (leçon 448/453 : une constante que plus personne
   ne lit est une constante débranchée, et elle repasse au vert dans les bancs
   sans rien tenir). Il rabotait TOUTES les répliques idéales de 30 % quand on
   n'avait pas les plans — c'est-à-dire qu'il comptait une quatrième fois une
   difficulté déjà comptée trois : la carte des plans n'existe pas (−15), les
   trois répliques qui les nomment sont remplacées par des versions faibles
   (−13), la sûreté vaut moitié (−9), le départ est plus bas et la fuite plus
   rapide. La négociation était devenue arithmétiquement ingagnable les mains
   vides, ce qui contredit la décision de Guillaume (« très difficile », pas
   « impossible ») — et c'est le banc qui l'a dit, en la jouant.
   ⚠️ *Une difficulté empilée quatre fois n'est pas quatre fois plus difficile :
   c'est un mur, et un mur ne se règle pas, il se retire.* */

/* La carte « poser les plans » : elle ne se joue qu'UNE fois, et sa valeur
   dépend entièrement du moment. Posée quand il demande ce qu'on veut construire
   au juste, c'est le plus gros gain de la partie ; posée pour meubler, il ne les
   déroule même pas. Le détail par nœud est dans `maire.js` (`plansValue`). */
export const MAYOR_PLANS_LATE = 4;         // le repli, quand ce n'est pas le moment

/* ⚠️⚠️⚠️ LE CAPITAL DE CONFIANCE — RÉPONSE DE GUILLAUME SUR CE QUE RAPPORTE UN
   ENTRETIEN PARFAIT : « on gagne la confiance du maire dans les prochains
   projets : plus facile de le convaincre pour les futures missions que nous
   implémenterons ». C'est ce qui oblige ce module à être un système de
   NÉGOCIATION dès le premier jour et pas une scène unique : la confiance est un
   départ plus haut pour toute audience future, quelle qu'elle soit. */
export const MAYOR_TRUST_MAX = 3;
export const MAYOR_TRUST_START_BONUS = 6;  // points de départ par cran gagné
export const MAYOR_TRUST_DRAIN_K = 0.9;    // et il s'énerve un peu moins vite
/* ⚠️⚠️⚠️ CE QUE LA CONFIANCE ACHÈTE VRAIMENT, C'EST LE PARDON — ET C'EST LE BANC
   QUI A IMPOSÉ CETTE FORME. Le premier réglage donnait un simple bonus de
   départ ; mesuré, il n'achetait un rattrapage de trois bourdes que chez UN
   maire sur cinq, c'est-à-dire que la récompense promise par Guillaume (« plus
   facile de le convaincre pour les futures missions ») ne se sentait nulle part.
   ⚠️ Le monter aurait cassé l'autre moitié : à confiance pleine, un joueur tiède
   franchissait les 75 sans avoir rien dit de bon. Un capital qui gonfle la jauge
   rend la négociation FACILE ; un capital qui raccourcit le glissement après une
   maladresse rend la négociation INDULGENTE, et c'est ça qu'on voulait dire.
   ⚠️ Diégétique, en plus : quelqu'un qui vous fait confiance ne vous tient pas
   rigueur d'une phrase mal tournée. Il ne vous écoute pas moins bien pour
   autant, et il ne pardonne toujours pas l'insulte (`fatal` reste fatal). */
export const MAYOR_TRUST_FORGIVE = 0.25;   // par cran : le glissement raccourcit d'autant

/* Ce qu'un échec laisse derrière lui. Il ne referme pas la porte — on revient —
   mais il se souvient des répliques déjà servies (`burnt`), et une réplique
   resservie ne vaut plus qu'une fraction, en le lui faisant DIRE. */
export const MAYOR_BURNT_K = 0.35;

/* ⚠️⚠️⚠️ ZIP 480 — LE BATTEMENT DU MAIRE, ET IL FERME UN TROU QU'AUCUN TEXTE
   N'AURAIT FERMÉ. Trouvé en calculant les bornes AVANT d'écrire le banc : un
   joueur qui répond instantanément (`dt = 0`) ne paie aucune fuite, donc douze
   réponses TIÈDES plus les plans posés au bon moment franchissaient les 75. La
   mécanique se battait à mains nues contre le martèlement de touche.
   ⚠️ La sortie n'est pas de baisser les réponses tièdes (Guillaume les veut
   « stagnantes, ou en progrès un peu ») ni d'inventer un anti-martèlement : le
   maire NE RÉPOND PAS INSTANTANÉMENT. Il finit sa phrase, il réfléchit, il
   repose son stylo. Ce battement-là s'écoule que le joueur hésite ou non, donc
   `dt` effectif vaut au moins ça.
   ⚠️⚠️ ET IL REND L'ÉLAN ENCORE PLUS PAYANT, ce qui est exactement la demande :
   à deux réponses idéales d'affilée la fuite s'arrête, donc le battement cesse
   de coûter quoi que ce soit. Enchaîner ne rapporte pas seulement des points,
   ça arrête l'hémorragie. C'est la même grandeur qui porte les deux, et elle
   est diégétique : rien à afficher, rien à expliquer. */
export const MAYOR_BEAT_MS = 2600;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 481 — LE RENDEZ-VOUS, L'HUMEUR, ET LA PORTE QU'ON CLAQUE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume, en trois morceaux : on demande l'audience à l'accueil,
   la secrétaire dit l'HUMEUR du maire (elle EST la difficulté), et on attend
   trois, quatre ou cinq minutes réelles avant de pouvoir monter.

   ⚠️⚠️ L'HUMEUR EST LA SEULE DIFFICULTÉ VISIBLE DE TOUT LE SYSTÈME, ET C'EST
   POUR ÇA QU'ELLE VAUT MIEUX QU'UN RÉGLAGE. Le 480 a payé la leçon inverse en
   entier : trois malus empilés (la carte des plans, les répliques de repli, une
   fuite majorée) rendaient l'entretien arithmétiquement ingagnable sans que
   personne ne puisse faire la somme, parce qu'aucun des trois ne s'affichait.
   Ici il n'y a qu'un levier, il porte un nom, une secrétaire le prononce à voix
   haute avant qu'on monte, et le joueur peut décider de revenir demain.
   *La difficulté d'un monde se règle sur UN levier qu'on peut lire.*

   ⚠️ DEUX GRANDEURS, PAS UNE : le DÉPART (ce qu'il vous accorde d'avance) et la
   FUITE (la vitesse à laquelle il décroche). Une humeur qui ne bougerait que le
   départ se rattraperait en deux répliques ; une humeur qui ne bougerait que la
   fuite ne se verrait pas avant la vingtième seconde. Les deux ensemble se
   sentent au premier échange et tiennent jusqu'au dernier.
   ═══════════════════════════════════════════════════════════════════════════ */
export const MAYOR_MOODS = ["great", "good", "mid", "bad", "awful"];
/* Ce qu'il vous accorde d'avance, en points, par-dessus le départ du monde. */
export const MAYOR_MOOD_START = { great: 12, good: 6, mid: 0, bad: -4, awful: -7 };
/* Et la vitesse à laquelle il décroche. ⚠️ BORNÉ EN HAUT À 1,45 : au-delà, la
   fuite d'une humeur exécrable dépasse à elle seule ce que la meilleure réplique
   de l'arbre rapporte, et on retombe sur le mur du 480. */
export const MAYOR_MOOD_DRAIN = { great: 0.70, good: 0.85, mid: 1, bad: 1.22, awful: 1.45 };
/* ⚠️ LE TIRAGE EST EN CLOCHE : le milieu est le cas ordinaire, les extrêmes
   sont des soirées. Un tirage uniforme aurait fait de « très favorable » un
   cinquième des visites, c'est-à-dire une routine. */
export const MAYOR_MOOD_WEIGHT = { great: 1, good: 3, mid: 4, bad: 3, awful: 1 };
/* ⚠️⚠️ LE JOUR D'AUDIENCE PENCHE LE TIRAGE, IL NE LE DÉCIDE PAS. `mayorAudienceDay`
   existait depuis le 439 comme une date affichée ; depuis le 480 elle ralentit la
   fuite, depuis celui-ci elle vous donne aussi une chance de plus de bien tomber.
   Une date qui ne change rien est une date qui ment — et une date qui décide tout
   supprime la raison de venir les autres jours. */
export const MAYOR_MOOD_AUDIENCE_LIFT = 1;   // d'un cran vers le haut, une fois sur deux

/* L'attente avant de pouvoir monter. Trois, quatre ou cinq minutes RÉELLES.
   ⚠️ C'est le chiffre de Guillaume, et il n'est pas décoratif : c'est ce qui
   transforme « ouvrir un panneau » en « avoir rendez-vous ». On redescend faire
   autre chose, et on remonte. */
export const MAYOR_WAIT_CHOICES_MS = [3 * 60000, 4 * 60000, 5 * 60000];
/* ⚠️⚠️⚠️ AUDIT 2026-08-31 — LE SECOND RENDEZ-VOUS NE COÛTE PAS LE PRIX DU PREMIER,
   ET C'EST UNE CORRECTION DE JUSTICE, PAS DE DIFFICULTÉ.
   Le §16.4 de `QUETE.md` chiffre le réglage VOULU : un premier essai ordinaire
   culmine à 69,9 contre un seuil à 75 — il échoue de cinq points, exprès. C'est
   une bonne tension. Mais `resolveMayor` consomme le créneau QUOI QU'IL ARRIVE
   (et il le doit : sans ça une audience ratée serait un droit de rentrer
   aussitôt), donc l'échec prévu par la conception coûtait un second rendez-vous
   PLEIN. Mesuré : 8 minutes d'attente pour une négociation qu'on est censé perdre
   une fois. *Une leçon qu'on fait payer deux fois n'est plus une leçon.*
   ⚠️ ON NE TOUCHE NI AU SEUIL DE 75, NI À L'HUMEUR, NI À LA FUITE : la
   négociation reste exactement aussi difficile. Ce qui change est le PRIX de
   recommencer, ce qui n'est pas la même grandeur.
   ⚠️⚠️ ET LA PORTE CLAQUÉE GARDE SES QUINZE MINUTES, intactes. C'est la seule
   sortie du jeu qui ait un prix (§16.2 bis) ; la confondre avec un échec ordinaire
   retirerait tout son sens au geste. `mayorSlam` passe par `mayor.block`, jamais
   par cette constante — les deux chemins ne se croisent nulle part. */
export const MAYOR_RETRY_WAIT_MS = 60000;   // il vous reprend entre deux dossiers
/* ⚠️⚠️ ET LE RENDEZ-VOUS NE PÉRIME PAS À LA SECONDE. Un créneau d'une minute
   ferait rater l'audience à qui traverse la ville à pied, et rater un rendez-vous
   qu'on a attendu quatre minutes est la définition d'une corvée. Une demi-heure
   de grâce : il est en retard, comme tout le monde. */
export const MAYOR_APPT_GRACE_MS = 30 * 60000;

/* ═══════════════════════════════════════════════════════════════════════════
   LA PORTE QU'ON CLAQUE — ET LE SEUL ENDROIT DU JEU OÙ PARTIR SE PAIE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume, mot pour mot : « Ajouter une option quitter la séance en
   claquant la porte ! le maire aura un "!" sur la tête si on fait ça. Et on ne
   pourra pas le contacter avant 15 minutes réelles si l'on quitte. Il sera de
   mauvaise humeur à la prochaine audience. »
   ⚠️⚠️ CE N'EST PAS LA MÊME CHOSE QUE PERDRE. Perdre (`out`, `walked`) coûte une
   tentative et des répliques brûlées ; claquer la porte coûte un quart d'heure
   RÉEL et l'humeur de la fois suivante. C'est la seule sortie du jeu qui ait un
   prix, et c'est ce qui la rend intéressante à proposer.
   ⚠️ TOUT SE REMET À ZÉRO AVEC LA QUÊTE (menu développeur → ⭐ Star → effacer) :
   `newStar()` reconstruit `mayor`, donc le blocage et la rancune partent avec.
   C'est la demande de Guillaume, et c'est gratuit — il n'y avait rien à écrire. */
export const MAYOR_SLAM_BLOCK_MS = 15 * 60000;
/* Le « ! » au-dessus de sa tête, en secondes de scène avant le fondu au noir. */
export const MAYOR_SLAM_HOLD_MS = 2600;

/* ═══════════════════════════════════════════════════════════════════════════
   LA SCÈNE, ET CE QU'ELLE DIFFUSE — ⚠️ UNE FOIS PAR BATTEMENT, JAMAIS PAR IMAGE.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « en multi si un joueur entre dans la négo, les autres
   joueurs doivent avoir un bouton "voir la scène de (autre joueur)" ».
   ⚠️⚠️ LE §3 EST FORMEL : dix messages par seconde et par client, et seul le
   NOMBRE de `send()` compte. Une scène diffusée image par image, c'est soixante
   messages par seconde — le plafond est dépassé en silence et TOUT le reste du
   jeu (positions, récoltes) tombe avec. On ne diffuse donc que ce qui CHANGE :
   une réponse, un nœud, une fin. Un entretien complet coûte une quinzaine de
   messages, et le spectateur voit exactement la même scène parce qu'il rejoue
   les mêmes interpolations à partir du même état.
   ⚠️ Une relance périodique existe quand même, très lente : sans elle, un joueur
   qui ouvre la fenêtre pendant que l'autre LIT n'aurait rien à afficher jusqu'au
   battement suivant. */
export const MAYOR_LIVE_KEEPALIVE_MS = 4000;

/* ╔═════════════════════════════════════════════════════════════════════════════
   ║ LOT E — LA GRANDE SCIE DE TRISTAN. TOUS LES NOMBRES DU GESTE.
   ╚═════════════════════════════════════════════════════════════════════════════
   Demande de Guillaume, mot pour mot : « la scie doit pas être trop rigide et on
   doit sentir l'effort. Je veux un truc bien arcade, appuyer en rythme pour
   découper les planches etc avec la possibilité de casser la planche de bois ».
   Le dossier est au §17.6 de `QUETE.md` (« La charpente — tirer »).

   ⚠️⚠️ TOUT CE QUI SUIT EST LU PAR UNE SIMULATION À PAS FIXE (`scierie.js`), ET
   C'EST CE QUI REND LA MANCHE REJOUABLE PAR L'HÔTE. Un réglage exprimé en
   « par image » aurait donné un sciage plus facile à 144 Hz qu'à 60, et surtout
   un client et un hôte qui ne tombent pas d'accord — c'est-à-dire une manche
   gagnée à l'écran et refusée par le réseau, le pire symptôme possible.
   ⚠️ ON RÈGLE EN SECONDES ET EN UNITÉS DE COURSE, JAMAIS EN PIXELS : le dessin
   dérive de la mécanique (`scierieAtelier.js` lit `bx`), l'inverse serait la
   faute du §4 (« une grandeur de dessin ne doit pas entrer dans la collision »).
   ═══════════════════════════════════════════════════════════════════════════ */
/* Le pas de la simulation. ⚠️ 120 Hz ET PAS 60 : la fenêtre parfaite fait 90 ms,
   soit onze pas — à 60 Hz elle en ferait cinq, et un demi-pas d'écart déplacerait
   le verdict d'un cran. Un pas deux fois plus fin coûte deux fois rien (la
   simulation est une douzaine de multiplications) et rend la note stable. */
export const SAW_HZ = 120;
export const SAW_DT = 1 / SAW_HZ;
/* La course de la lame, en unités : −1 = poignée de Tristan, +1 = la nôtre.
   `SAW_END` est le point où l'on considère qu'un trait est allé au bout ; on ne
   va jamais jusqu'à ±1, une scie qui tape ses butées est une scie qu'on casse. */
export const SAW_END = 0.86;
/* ⚠️⚠️ LA MASSE ET LE FROTTEMENT SONT CE QUI FAIT « L'ÉLAN », et c'est la moitié
   de la demande de Guillaume. Une lame sans inertie répond au bouton : c'est un
   métronome, pas un outil. Avec inertie, un trait bien placé PROLONGE le
   précédent — le joueur sent qu'il entretient quelque chose. */
/* ⚠️⚠️ LE FROTTEMENT EST FORT, ET C'EST UNE MESURE, PAS UN GOÛT. Le premier jet
   le posait à 1,55 : la lame partait sur son erre et mettait UNE SECONDE ET
   DEMIE à s'arrêter, si bien qu'un aller-retour durait près de trois secondes et
   que la manche ne finissait jamais dans la borne de temps. Une lame dans son
   trait est freinée par le bois, pas par l'air : elle s'arrête à peu près quand
   on cesse de tirer, et c'est ce qui rend le trait LISIBLE — on voit où finit le
   geste de l'autre, donc on sait quand commencer le sien. */
export const SAW_DRAG = 6.0;              // frottement visqueux, par seconde
export const SAW_PULL = 30.5;             // accélération d'un trait, en unités/s²
export const SAW_PULL_MS = 340;           // durée pendant laquelle un trait pousse
/* ╔═══════════════════════════════════════════════════════════════════════════
   ║ LE MOU — ⚠️ C'EST LUI QUI FAIT LE RYTHME, ET IL A FALLU LE MESURER POUR LE
   ║ COMPRENDRE.
   ╚═══════════════════════════════════════════════════════════════════════════
   Le premier jet n'avait que la position de la lame dans son verdict, et la
   première manche jouée par le banc l'a démonté en une ligne : une lame arrivée
   chez Tristan et arrêtée y RESTE, donc la fenêtre parfaite ne se referme
   jamais, donc il suffit d'attendre. Un jeu de rythme dont on peut prendre son
   temps n'est pas un jeu de rythme.
   ⚠️⚠️ LA PARADE N'EST PAS UN CHRONOMÈTRE, C'EST UNE GRANDEUR PHYSIQUE QU'ON
   VOIT : une scie qu'on laisse s'arrêter se DÉTEND, la lame s'assied dans son
   trait, et il faut la relancer avant qu'elle morde à nouveau. C'est vrai d'une
   vraie scie, ça se dessine (la lame s'arque, `scierieAtelier.js` la fléchit
   avec cette même valeur), et ça répond du même coup à la demande de Guillaume :
   « la scie doit pas être trop rigide ». *Une contrainte de rythme qu'on peut
   REGARDER s'apprend ; un compte à rebours invisible se subit.*
   ⚠️ 3,4 par seconde : le mou atteint 1 en 294 ms, c'est-à-dire un tiers de
   tempo. On a le temps de viser, pas celui d'hésiter. */
export const SAW_SLACK_RATE = 3.4;
export const SAW_SLACK_STILL = 0.35;      // en-deçà de cette vitesse, la lame est « arrêtée »
export const SAW_SLACK_PERFECT = 0.55;    // au-delà, un trait ne peut plus être parfait
export const SAW_SLACK_GOOD = 1.5;        // au-delà, il n'est même plus bon
/* Le trait de Tristan. ⚠️ IL RÉPOND, IL NE MÈNE PAS : il part quand la lame
   arrive chez nous, après un délai de réaction. C'est ce qui fait qu'on peut
   accélérer le tempo en le pressant — et qu'un joueur mou ralentit la scène
   entière au lieu de se faire distancer par un métronome. */
export const SAW_MATE_DELAY_MS = 190;     // sa réaction quand la lame arrive chez nous
export const SAW_MATE_JITTER_MS = 70;     // ce qu'il gagne ou perd, tiré du hachage
export const SAW_MATE_PULL_K = 0.94;      // il tire un peu moins fort que nous : c'est NOTRE scie
/* ⚠️⚠️ LES TROIS VERDICTS SE LISENT SUR LA LAME, JAMAIS SUR UNE HORLOGE. Une
   fenêtre en millisecondes aurait été une seconde description du même instant
   (§8 : un paramètre qui double un autre est une divergence en attente) : ici la
   question est « où est la lame et où va-t-elle », et c'est la même question que
   se pose le scieur. */
export const SAW_PERFECT_X = 0.62;        // au-delà (vers Tristan), le trait est parfait…
export const SAW_PERFECT_V = 0.55;        // …à condition que la lame ne fuie plus vite que ça
export const SAW_GOOD_X = 0.24;           // au-delà, le trait est bon
/* Ce qu'un trait fait avancer le trait de scie, par unité de course parcourue.
   ⚠️ C'EST LA VITESSE QUI COUPE, PAS L'APPUI : une lame qu'on pousse sans qu'elle
   bouge chauffe, elle ne mord pas. */
export const SAW_BITE = 0.058;
export const SAW_BITE_BIND = 0.22;        // ce qui reste quand la lame est coincée
/* ⚠️⚠️ LE COINCEMENT EST LA SANCTION, ET IL EST PHYSIQUE : tirer quand l'autre
   tire, c'est deux forces opposées sur une lame de deux mètres. Elle s'arque,
   elle chauffe, elle ne coupe plus, et le bois encaisse la différence. */
export const SAW_BIND_HIT = 0.62;         // ce qu'un trait à contresens ajoute
export const SAW_BIND_FALL = 1.35;        // ce qui se dissipe par seconde
export const SAW_STRESS_BIND = 0.78;      // contrainte gagnée par seconde de coincement plein
export const SAW_STRESS_FALL = 0.115;     // ce que la planche récupère par seconde
/* ⚠️ LA PLANCHE CASSE À 1, ET C'EST UN VRAI RISQUE (demande de Guillaume). Elle
   ne coûte pas la manche : elle coûte le trait déjà fait, du bois, et le temps
   de recommencer. Trois planches cassées et la commande est perdue — sans que
   rien n'ait été dépensé, puisque l'hôte n'a encore rien prélevé. */
export const SAW_BREAK_MAX = 3;
export const SAW_BREAK_WOOD = 12;         // bois perdu par planche cassée
export const SAW_BREAK_HOLD_MS = 900;     // le temps qu'on regarde la planche se fendre
/* Le souffle. ⚠️ IL NE PUNIT PAS LE RYTHME, IL PUNIT LA PANIQUE : un trait tous
   les tempos ne l'entame presque pas, un martèlement le vide en six secondes et
   les traits deviennent mous. C'est la seule façon honnête de « sentir l'effort »
   sans mettre une jauge de vie sur un geste d'artisan. */
export const SAW_STAM_COST = 0.085;       // par trait
export const SAW_STAM_BACK = 0.135;       // par seconde
export const SAW_STAM_FLOOR = 0.42;       // la force qui reste à bout de souffle
/* Le tempo. ⚠️⚠️ IL ACCÉLÈRE, ET C'EST CE QUI REND LA CHOSE ARCADE : chaque trait
   parfait rapproche la réponse de Tristan, chaque raté lui rend du mou. La montée
   est bornée des deux côtés — une scie qui accélère sans fin devient un test de
   fréquence de clavier, ce qui n'est pas un geste. */
/* ⚠️⚠️⚠️ LE TEMPO EST UNE ÉCHELLE DE TEMPS, PAS UN DÉLAI — ET C'EST LA SEULE
   FORME QUI ACCÉLÈRE VRAIMENT LE GESTE. Le premier jet ne l'appliquait qu'à la
   réaction de Tristan : la manche entière ne gagnait que 80 ms sur 1 500, c'est-
   à-dire une montée invisible, donc pas une montée. Ici c'est la SIMULATION qui
   tourne plus vite (`rate = SAW_TEMPO_MAX / tempo`) — même course, même
   distance, même trait de scie, tout en moins de temps — donc la fenêtre
   parfaite se resserre à la même proportion et le geste devient réellement plus
   difficile à mesure qu'on le réussit. *Une difficulté qui monte doit se lire
   dans le GESTE, pas dans un nombre affiché.*
   ⚠️ 0,66 EN PLANCHER, PAS 0,58 : à ×1,72 la fenêtre parfaite tombe à 135 ms,
   ce qui n'est plus du rythme mais du réflexe. ×1,51 laisse 155 ms — le même
   ordre que le marteau de la grange, dont on sait qu'il est jouable. */
export const SAW_TEMPO_MIN = 0.66, SAW_TEMPO_MAX = 1.0;
export const SAW_TEMPO_GAIN = 0.045, SAW_TEMPO_LOSS = 0.10;
/* Combien de planches par commande, et ce que ça vaut. ⚠️ CINQ N'EST PAS UN
   NOMBRE ROND CHOISI AU HASARD : à tempo moyen une planche demande une douzaine
   de traits, donc la manche dure de quarante à soixante secondes — la durée d'un
   mini-jeu de ce dépôt (le marteau de la grange, la pêche), pas celle d'une
   épreuve. */
export const SAW_PLANKS = 5;
/* ⚠️⚠️ CE QUE LA MANCHE CHANGE POUR LA QUÊTE, ET RIEN D'AUTRE : la DURÉE de la
   commande. Bien scier fait gagner jusqu'à 40 % du délai, mal scier en coûte 15.
   ⚠️ ELLE NE TOUCHE PAS AU PRIX EN BOIS (sauf les planches cassées) : un mini-jeu
   qui change une dépense fait de l'adresse une monnaie, et la ferme a déjà une
   économie. Elle change le TEMPS, qui est ce que ce chantier reproche à Tristan
   depuis l'audit 477. */
export const SAW_MS_BEST = 0.60, SAW_MS_WORST = 1.15;
export const SAW_LOG_MAX = 220;           // traits transportés dans la `req` — voir `sawRun`
/* ╔═══════════════════════════════════════════════════════════════════════════
   ║ ⚠️⚠️⚠️ LE PLAFOND DE TEMPS APPARTIENT À LA SIMULATION, PAS À SES APPELANTS —
   ║ ET C'EST LE BANC QUI L'A TROUVÉ, SUR LE SEUL CONTRÔLE QUI COMPTE VRAIMENT.
   ╚═══════════════════════════════════════════════════════════════════════════
   Le premier jet le posait dans `sawRun` (« trois minutes, largement au-delà
   d'une manche jouée »), et la boucle du client n'en avait aucun. Une manche
   traînante dépassait donc les trois minutes chez le joueur et s'arrêtait au
   plafond chez l'hôte : deux manches différentes à partir du même journal, avec
   pour symptôme une commande gagnée à l'écran et refusée par le réseau — sans
   que rien ne l'explique. C'est le §8 sous sa forme la plus coûteuse : *deux
   descriptions de la même limite, l'une chez chaque partie du réseau.*
   ⚠️ Ici la borne est DANS `sawTick` : quel que soit l'appelant, la manche
   s'arrête au même pas. Il n'y a plus rien à tenir d'accord. */
export const SAW_MAX_TICKS = SAW_HZ * 180;
