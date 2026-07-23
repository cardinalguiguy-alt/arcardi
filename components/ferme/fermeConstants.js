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
  // 2026-07 visitors update (zip 233): UNIQUE crop varieties, `unique: true`.
  // NEVER sold in the shop (the shop/Greg lists filter on this flag, and
  // resolveBuySeed refuses them): their seeds only arrive as visitor GIFTS
  // on "prep" orders (see spawnVisitor). Everything else (planting, growth,
  // sprites, selling at the bin) rides the existing data-driven pipeline.
  { id: 6, name: "Navet doré",    nameEn: "Golden turnip", seedName: "Graine de navet doré",    seedNameEn: "Golden turnip seeds", growMs: 6 * H,  seedCost: 0, sell: 260, color: "#f6d76a", top: "#e0b02a", unique: true },
  { id: 7, name: "Baie étoilée",  nameEn: "Star berry",    seedName: "Graine de baie étoilée",  seedNameEn: "Star berry seeds",    growMs: 12 * H, seedCost: 0, sell: 460, color: "#b48ef0", top: "#7a4ee0", unique: true },
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
// Zip 247 (demande Guillaume : "fix the walking speed in the valley town, it
// should be faster") : Valley Town est une grande carte de rues longues et on
// n'y a ni cheval ni raccourci — on marche donc sensiblement plus vite qu'à la
// ferme. Multiplicateur appliqué dans updateMeTown (FermeGame.js) uniquement,
// la vitesse de la ferme n'est pas touchée.
export const TOWN_SPEED_MULT = 1.45;
export const POS_TICK_HZ = 8;        // FIX 243: 12 -> 8 Hz (economie position ; extrapolation cote rendu compense le ressenti)
export const AOI_MARGIN_TILES = 8;   // FIX 242 (AOI): marge (tuiles) autour du viewport — pré-charge entités/joueurs juste avant qu'ils entrent à l'écran
export const POS_KEEPALIVE_MS = 500;   // FIX 243: en mouvement continu (meme direction), on renvoie une correction au moins toutes les 500 ms
// Zip 247 : plafond de la vitesse ESTIMÉE d'un joueur distant (extrapolation,
// voir le handler "pos"). L'ancienne valeur codée en dur (1.6) était déjà
// INFÉRIEURE à la vitesse à cheval (HORSE_SPEED_MULT = 1.9) et le reste à
// celle de Valley Town avec bonbon (1.45 * 1.5 = 2.175) : les joueurs
// distants rapides traînaient donc visuellement derrière leur vraie position.
export const POS_EXTRAP_SPEED_CAP = 2.4;
export const POS_EXTRAP_MAX_MS = 600;  // FIX 243: duree max d'extrapolation d'un joueur distant sans nouveau paquet (anti-derive)
export const POS_FAR_HZ = 1.5;       // FIX 242 (AOI): cadence de diffusion de position quand aucun autre joueur n'est à portée de vue (indication minimap seulement)   // fréquence de diffusion des positions (broadcast)
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


// --- Repos de Greg : pose assise sur un tabouret + 💤 (FIX 246, décision
// Guillaume : "pose assise dédiée"). Quand il rôde sans tâche, il s'assoit
// parfois un moment avant de reprendre sa balade tranquille.
export const GREG_SIT_CHANCE = 0.45;                 // proba., à chaque fin de cible de rôdaille, de s'asseoir au lieu de repartir
export const GREG_SIT_MIN_MS = 4000;                 // durée assise minimale
export const GREG_SIT_MAX_MS = 9000;                 // durée assise maximale

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
  { x: 66, y: 39, w: 3, h: 3 },   // level 1 (48px sprite)
  { x: 65, y: 37, w: 5, h: 5 },   // level 2 (72px sprite)
  { x: 62, y: 28, w: 11, h: 14 }, // level 3 (170x230px sprite)
];
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
export const VISITOR_ROSTER = [
  { rid: 0,  name: "Margot",   gender: "f", outfit: 3, overalls: false, cap: false, theme: "market",  job: "run a market stall" },
  { rid: 1,  name: "Theo",     gender: "m", outfit: 2, overalls: true,  cap: true,  theme: "fields",  job: "help in the fields" },
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
  { rid: 16, name: "Rosalie",  gender: "f", outfit: 3, overalls: true,  cap: true,  theme: "kitchen", job: "bake bread and pies" },
  { rid: 17, name: "Edgar",    gender: "m", outfit: 2, overalls: false, cap: false, theme: "shadow",  job: "track wolves", edgy: true },
  { rid: 18, name: "Violette", gender: "f", outfit: 4, overalls: true,  cap: false, theme: "style",   job: "paint signs and murals" },
  { rid: 19, name: "Casimir",  gender: "m", outfit: 0, overalls: true,  cap: true,  theme: "wood",    job: "fell and replant trees" },
  { rid: 20, name: "Philomene",gender: "f", outfit: 5, overalls: true,  cap: false, theme: "gold",    job: "fund new buildings", rich: true },
  { rid: 21, name: "Ambroise", gender: "m", outfit: 1, overalls: false, cap: true,  theme: "train",   job: "haul freight crates" },
  { rid: 22, name: "Berthe",   gender: "f", outfit: 6, overalls: true,  cap: true,  theme: "animals", job: "shear and milk" },
  { rid: 23, name: "Leandre",  gender: "m", outfit: 7, overalls: true,  cap: false, theme: "stone",   job: "mine the far hills" },
  { rid: 24, name: "Zelie",    gender: "f", outfit: 0, overalls: false, cap: true,  theme: "flowers", job: "keep bees" },
];

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
export const VISITOR_NET_MS = 500;                // host broadcast throttle while a visitor exists
// 2026-07 visitors update (zip 233, Guillaume's spec):
export const VISITORS_MAX = 5;                    // hard cap of visitors on the farm at once
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
export const UNIQUE_DECORATIONS = [
  { id: "gnome",    name: "Gnome farceur",       nameEn: "Prankster gnome" },
  { id: "fountain", name: "Fontaine de cristal", nameEn: "Crystal fountain" },
  { id: "sunwheel", name: "Roue solaire",        nameEn: "Sun wheel" },
];
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
export const MAX_PETS = 2;
// Zip 251 (demande Guillaume : "réduire les familiers à ~la taille d'une
// poule") : facteur d'échelle appliqué au RENDU du pet (sprite 16x16 dessiné
// à PET_DRAW_SCALE * 16 px, ancré par le bas). Purement visuel, ajustable.
export const PET_DRAW_SCALE = 0.7;
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
export const TOWN_MAP_W = 64;
export const TOWN_MAP_H = 48;
export const TOWN_RAIL_X = 2;                       // rails on columns 2..3, full height, like the farm
export const TOWN_PLATFORM = { x: 4, y: 18, w: 2, h: 8 };
export const TOWN_SPAWN = { x: 6, y: 22 };          // step off the train here
export const TOWN_STATION_SIGN = { x: 7, y: 24 };   // E here to ride back to the farm
export const TOWN_MAIN_ST_Y = 22;                   // main street rows y..y+1, from the platform to the east edge
export const TOWN_CROSS_ST_X = 31;                  // cross street columns x..x+1, north-south through the plaza
export const TOWN_PLAZA = { x: 26, y: 17, w: 12, h: 12 }; // paved central square
export const TOWN_FOUNTAIN = { x: 31, y: 22 };      // 2x2 fountain, top-left tile (blocks movement)
export const TOWN_HOUSE_W = 6;                      // house sprite is 96px = 6 tiles wide
export const TOWN_HOUSE_H = 3;                      // blocked footprint rows (the visual roof overlaps north of it)
export const TOWN_HOUSES = [                        // door faces south onto a street
  { x: 14, y: 13 }, { x: 22, y: 13 }, { x: 38, y: 13 }, { x: 46, y: 13 },   // north side of main street
  { x: 14, y: 27 }, { x: 22, y: 27 }, { x: 38, y: 27 }, { x: 46, y: 27 },   // south side
];
// Zip 235: Valley Town townhall — big civic building anchored just north of
// the plaza, replacing the old "just another house" look. Sprite is 128x128,
// footprint occupies 8x5 tiles (blockedTown extends to cover it, see
// FermeGame.js/blockedTown).
export const TOWN_HALL = { x: 28, y: 4, w: 8, h: 5 };
export const TRAIN_BOARD = { x: 5, y: 30 };         // farm-side boarding spot on the platform (E to ride)

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
export const O_BERRY_BUSH = 19;      // buisson à baies (printemps), hache = bois, E = baies
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
export const PASSAGE_WORLDS = [
  { key: "evil",    name: "Terres Maléfiques",   nameEn: "Evil Lands",
    bg: "#0b120c", g1: "#182417", g2: "#182417", waterA: "#241246", waterB: "rgba(160,70,220,",
    pickupColor: null, pickupCount: 0,
    pet: { id: "shadowcat", name: "Chat d'ombre", nameEn: "Shadow cat" }, petHue: 260 },
  { key: "candy",   name: "Pays des Bonbons",    nameEn: "Candy Land",
    bg: "#f2b8d0", g1: "#f0c2d8", g2: "#eab4ce", waterA: "#c86ea8", waterB: "rgba(255,190,230,",
    pickupColor: "#e0356e", pickupCount: 14,
    pet: { id: "candyfox", name: "Renard barbe à papa", nameEn: "Cotton-candy fox" }, petHue: 300 },
  { key: "maze",    name: "Pays du Labyrinthe",  nameEn: "Maze Land",
    bg: "#25331f", g1: "#4a6b38", g2: "#446434", waterA: "#3a7bc8", waterB: "rgba(190,225,255,",
    pickupColor: "#e8c860", pickupCount: 6,
    pet: { id: "mazemouse", name: "Souris des haies", nameEn: "Hedge mouse" }, petHue: 90 },
  { key: "crystal", name: "Grottes de Cristal",  nameEn: "Crystal Caverns",
    bg: "#0c1226", g1: "#1c2440", g2: "#182038", waterA: "#12386a", waterB: "rgba(120,200,255,",
    pickupColor: "#7ce0f0", pickupCount: 12,
    pet: { id: "gemturtle", name: "Tortue gemme", nameEn: "Gem turtle" }, petHue: 180 },
  { key: "meadow",  name: "Prairie Céleste",     nameEn: "Sky Meadow",
    bg: "#a8d8f0", g1: "#8fd06a", g2: "#86c862", waterA: "#5ab0e8", waterB: "rgba(255,255,255,",
    pickupColor: "#f0b428", pickupCount: 12,
    pet: { id: "cloudlamb", name: "Agneau des nuages", nameEn: "Cloud lamb" }, petHue: 40 },
];
export const PASSAGE_PET_CATCH_CHANCE = 0.35;
export const PASSAGE_LOOT_GOLD_MIN = 25;   // or accordé par breloque ramassée (min..max)
export const PASSAGE_LOOT_GOLD_MAX = 75;
export const MAZE_PRIZE_GOLD = 300;        // récompense du coffre au bout du labyrinthe (1x/joueur/semaine)
export const CANDY_SPEED_MS = 60 * 1000;   // durée du bonbon magique "vitesse" (buff local)
export const CANDY_SPEED_MUL = 1.5;

// --- Valley Town, suite (zip 235) ---
export const TOWN_HOUSE_STYLES = 10;       // 10 façades de base gratuites (R à sa porte pour changer)

// Rappel des visiteurs qui flânent : pendant ce délai après un "rendez-vous à
// la mairie", ils reviennent (et restent) sur la place au lieu de vagabonder.
export const VISITOR_RECALL_MS = 2 * 60 * 1000;
export const VISITOR_ROAM_HOP = 8;         // longueur max (tuiles) d'une étape de balade libre sur toute la carte
