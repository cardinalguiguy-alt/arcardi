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

// --- Temps ---
export const DAY_REAL_MS = 8 * 60 * 1000; // un jour = 8 minutes réelles
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
export const MOUNT_RANGE = 1.6;      // distance pour enfourcher le cheval
export const WELL_COST = 600;
export const WELL = { x: 30, y: 62 }; // emplacement du puits (champs à l'ouest)
export const WELL_SPAWN = { x: 30, y: 64 }; // cible du téléport puits (dégagée à l'achat)

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
