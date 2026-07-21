/* ==========================================================================
   FERME VALLÉE (jeu 22) — constantes partagées client/hôte.
   Portées telles quelles depuis la maquette validée (shared/constants.js du
   prototype autonome), en module ES pour ARCARDI. Aucune valeur de gameplay
   n'a été modifiée par rapport à la maquette.
   ========================================================================== */

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

// --- Cultures ---
// stages: 0=semis ... maxStage=récoltable ; growMs = durée RÉELLE (arrosée) pour
// mûrir, indépendante du cycle jour/nuit (voir zip 151, demande 2026-07 :
// "12h réelles pour la tomate"). navet 6h, patate 12h, tomate 12h, citrouille 18h
// (proportionnel aux anciens ratios de croissance 1/2/2/3). Prix et coûts inchangés.
const H = 60 * 60 * 1000; // 1 heure en ms, pour lisibilité des durées ci-dessous
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
export const POS_TICK_HZ = 12;   // fréquence de diffusion des positions (broadcast)
export const ACT_RANGE = 1.8;    // portée d'action en tuiles

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
export const EVIL_MONSTER_FLEE_MS = 6000;     // durée pendant laquelle une créature repoussée fuit le joueur avant de pouvoir rechasser

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
export const MILL_WHEAT_PER_SACK = 3;        // blé consommé par sac de farine produit, donné par Guillaume
export const MILL_BATCH_MS = 15 * 60 * 1000; // 15 minutes réelles par sac, donné par Guillaume
export const MILL_STOCK_CAP = 90;            // stock de blé max qu'un moulin peut contenir (extrapolé, ~30 sacs d'avance)
export const FLOUR_SELL = 55;                // prix de vente d'un sac de farine (extrapolé)

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
// multipliés par 5 (demande 2026-07, zip 156). Coûts d'achat (cost)
// inchangés.
export const ANIMALS = [
  { id: 0, name: "Poule",  nameEn: "Hen",   cost: 120,   prodMs: 4 * H,  prod: "Œuf",             prodEn: "Egg",         sell: 125, edible: true,  energy: 15, body: "#f0e8d8", accent: "#d44a3f" },
  { id: 1, name: "Chèvre", nameEn: "Goat",  cost: 8000,  prodMs: 8 * H,  prod: "Lait de chèvre",  prodEn: "Goat milk",   sell: 300, edible: true,  energy: 22, body: "#d8cbb0", accent: "#7a6a52" },
  { id: 2, name: "Brebis", nameEn: "Sheep", cost: 10000, prodMs: 14 * H, prod: "Laine",           prodEn: "Wool",        sell: 450, edible: false, energy: 0,  body: "#f2f0ea", accent: "#c8c0b0" },
  { id: 3, name: "Cochon", nameEn: "Pig",   cost: 15000, prodMs: 16 * H, prod: "Truffe",          prodEn: "Truffle",     sell: 700, edible: true,  energy: 28, body: "#e8a8b0", accent: "#c07882" },
  { id: 4, name: "Vache",  nameEn: "Cow",   cost: 25000, prodMs: 10 * H, prod: "Lait",            prodEn: "Milk",        sell: 600, edible: true,  energy: 26, body: "#efe7dc", accent: "#5a4634" },
];
// --- Missions collaboratives (v1, "grandes lignes" — demande 2026-07) ---
// Se déclenchent automatiquement dès que 2 fermiers sont en ligne en même
// temps (voir hostMaybeStartCoop dans FermeGame.js) : une caisse commune de
// chantier, matérialisée par un point sur la carte (COOP_SITE), avec 2
// "parties" à remplir (chacune une ressource différente, bois ou pierre).
// Un fermier qui s'approche du chantier (touche E, comme la boutique/le bac)
// et qui porte la ressource d'une partie pas encore terminée y dépose
// automatiquement ce qu'il faut (jusqu'au manquant) : en pratique, celui qui
// apporte du bois avance une partie, celui qui apporte de la pierre avance
// l'autre, donc à 2 chacun a naturellement "sa" partie. Version volontaire-
// ment simple : pas d'assignation stricte par joueur, pas encore de variété
// dans les chantiers au-delà de bois/pierre — à affiner ensuite.
export const COOP_SITE = { x: 44, y: 42 };
export const COOP_MISSIONS = [
  {
    id: "irrigation",
    name: "Système d'irrigation",
    nameEn: "Irrigation system",
    parts: [
      { id: "A", resource: "wood", target: 40, label: "Canalisations (bois)", labelEn: "Piping (wood)" },
      { id: "B", resource: "stone", target: 30, label: "Bassin (pierre)", labelEn: "Basin (stone)" },
    ],
    reward: 400,
  },
  {
    id: "houseext",
    name: "Agrandir la maison",
    nameEn: "House extension",
    parts: [
      { id: "A", resource: "wood", target: 60, label: "Charpente (bois)", labelEn: "Framing (wood)" },
      { id: "B", resource: "stone", target: 40, label: "Fondations (pierre)", labelEn: "Foundations (stone)" },
    ],
    reward: 600,
  },
];
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
  { level: 1, cost: { wood: 150, stone: 100, money: 10000 }, hits: 6, animalBonus: 6 },
  { level: 2, cost: { wood: 250, stone: 180, money: 20000 }, hits: 8, animalBonus: 6 },
  { level: 3, cost: { wood: 400, stone: 300, money: 50000 }, hits: 10, animalBonus: 8 },
];
export const MAX_ANIMALS = 12;      // limite d'animaux dans l'enclos, avant toute grange
export const COLLECT_RANGE = 1.5;   // distance pour ramasser une production
// Déambulation lente (zip 152) : purement dérivée de l'horodatage (comme
// cropGrowState), aucun message réseau supplémentaire. `hx`/`hy` (ancrage,
// synchronisé) restent fixes ; la position affichée/logique oscille autour
// de cet ancrage. Rayon volontairement petit pour rester dans l'enclos de
// départ (les animaux y naissent à au moins 1 case des clôtures).
export const ANIMAL_WANDER_RADIUS = 0.55;    // amplitude en tuiles
export const ANIMAL_WANDER_PERIOD_MS = 7000; // période de base (variée par animal)
export const ANIMAL_PICK_RANGE = 1.8;        // portée pour attraper/déposer un animal (= ACT_RANGE)

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
export const GREG_WATER_CHECK_MS = 15 * 1000;      // fréquence de scan des cultures assoiffées (15s réelles) — Greg part à pied dès qu'il en repère une, pas d'arrosage instantané
export const GREG_WATER_BATCH = 6;                 // nb max de cases assoiffées mises en file par scan (évite de surcharger la file d'un coup sur un grand champ)
export const GREG_SPEED = 3.2;                     // tuiles/seconde, un peu plus lent qu'un fermier (5.2)
export const GREG_ROAM_RADIUS = 6;                 // amplitude de rôdaille autour de son ancre (même principe que WOLF_ROAM_RADIUS)
export const GREG_ANCHOR = { x: 26, y: 58 };        // point d'ancrage (rôdaille + tuiles de dépôt), au bord des champs ouest (puits)
export const GREG_TASK_RANGE = 0.6;                // distance d'arrivée sur une case de tâche avant de l'exécuter
export const GREG_ORDER_MAX = 60;                  // nombre max de cases par ordre (garde-fou anti-abus)
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
export const SOAN_WORK_MS = 30 * 60 * 1000;         // durée d'un bloc de pêche d'affilée
export const SOAN_BREAK_MS = 15 * 60 * 1000;        // durée de la pause (balade) avant de reprendre
export const SOAN_BREAK_ROAM_RADIUS = 8;            // amplitude de balade pendant la pause, autour de la berge où il pêche
export const SOAN_FISH_INTERVAL_MS = 20 * 1000;     // pêche EN CONTINU pendant un bloc de travail ("il pioche des poissons continûment", demande Guillaume) : une prise toutes les 20s réelles (extrapolé, pas de mini-jeu pour un PNJ, contrairement au joueur)

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
export const RABBIT_NOTICE_CHECK_MS = 550; // fréquence des "jets de repérage" tant qu'un fermier reste à portée
export const RABBIT_UNSEEN_CHANCE = 0.2;   // "1 chance sur 5 qu'ils ne nous voient pas" (demande chiffrée de Guillaume)
export const RABBIT_CATCH_RANGE = ANIMAL_PICK_RANGE; // même portée que l'outil "déplacer" sur les animaux de la ferme
export const RABBIT_MIN_HOUSE_DIST = 35;   // distance min. à la maison pour apparaître ("zones éloignées de la maison")
export const RABBIT_EAST_BIAS = 0.8;       // proba. de favoriser la rive droite à l'apparition ("surtout rive droite")
export const RABBIT_RESPAWN_MS = 7000;     // délai minimum entre deux réapparitions (repop progressif, pas instantané)
export const RABBIT_FLEE_HOP_PX = 5;       // amplitude (pixels) du bond visuel en fuite (demande 2026-07, roam inchangé)

// --- Défi "chasse aux lapins" (chantier 2026-07, demande Guillaume) ---
// Popup proposée aléatoirement à l'HÔTE (jamais démarrée automatiquement,
// contrairement aux missions collaboratives, voir COOP_MISSIONS) tant qu'au
// moins 2 fermiers sont en ligne simultanément et qu'aucun défi n'est déjà en
// cours. Le premier fermier à atteindre RABBIT_CHALLENGE_TARGET captures
// (voir req "catchRabbit") remporte le défi et gagne un chapeau (cosmétique,
// purement pour le fun, comme la capture de lapin elle-même).
export const RABBIT_CHALLENGE_MIN_PLAYERS = 2;   // nombre minimum de fermiers en ligne en même temps pour proposer le défi
export const RABBIT_CHALLENGE_TARGET = 3;        // nombre de lapins à capturer pour gagner
export const RABBIT_CHALLENGE_OFFER_CHANCE = 1 / 240; // proba. par tick (1 Hz) de proposer le défi à l'hôte : ~1 fois toutes les 4 min en moyenne quand les conditions sont réunies (valeur extrapolée, à ajuster librement)
// Trophée 🏆 du gagnant (correctif 2026-07, demande Guillaume : "il doit
// disparaitre au bout de 15 minutes") : n'est plus permanent, affiché
// seulement pendant HAT_DISPLAY_MS après la victoire (voir farmer.hatUntil,
// même mécanique d'horodatage que injuredUntil).
export const HAT_DISPLAY_MS = 15 * 60 * 1000;    // durée d'affichage du trophée après la victoire du défi lapins

// --- Torche (chantier 2026-07) : objet équipable (bouton dédié, comme le
// sifflet à chevaux), pas un slot d'outil numéroté. Éclaire comme un
// lampadaire portatif (rayon plus modeste) et fait fuir les loups à portée.
export const TORCH_LIGHT_RADIUS = 4.5; // rayon éclairé autour du porteur (tuiles)
