"use client";
/* ==========================================================================
   FERME VALLÉE (jeu 22) — composant ARCARDI.
   ==========================================================================
   Ferme coopérative temps réel (2 à 8, jouable seul). Rendu canvas pixel-art
   (fermeArt), logique arbitrée par l'hôte (fermeEngine), réseau Supabase
   Broadcast (host-authoritative, self:true) calqué sur GoldMines/Chromatik.

   Modèle réseau :
   - L'HÔTE détient le monde (ground/objects/objHp/crops), l'or commun, le jour
     et l'horodatage de début de journée. Il génère le monde depuis une seed
     stable (dérivée de room.id), applique les actions via fermeEngine et
     rediffuse les DELTAS dans un seul message `apply`.
   - Les POSITIONS des joueurs sont diffusées de pair à pair (`pos`, ~12 Hz),
     non arbitrées : coopératif, aucun enjeu de triche, latence minimale.
   - Un nouvel arrivant demande un instantané (`hello`) ; l'hôte répond
     `snapshot` (seed + overrides + état partagé + fermiers). Le monde de base
     se régénère localement depuis la seed, puis on applique les overrides.
   - Persistance : l'hôte écrit périodiquement seed + overrides + état dans
     rooms.game_state (survit à un rechargement).

   NOUVEAUTÉS demandées : bouton 🏠 (téléport instantané devant la maison) et
   bouton 🗺️ (carte plein écran, positions des joueurs actualisées en direct,
   fermeture au clic / Échap / M).

   Aucune migration Supabase : s'appuie sur rooms.game_state déjà existant.
   ========================================================================== */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import * as C from "./fermeConstants";
import * as E from "./fermeEngine";
import { buildSprites } from "./fermeArt";
import { fstr } from "./fermeStrings";

const GAME_ID = "ferme";
const ZOOM = 3;

// Cache mémoire du dernier état sauvegardé par L'HÔTE de CET onglet
// (correctif audit lancement 2026-07, module-level : survit aux montages/
// démontages successifs du composant dans la même session). Raison d'être :
// lors d'une bascule d'instance hôte (bouton Quitter -> instance cachée,
// "Rejoindre la ferme" -> instance visible), la NOUVELLE instance lit
// ferme_saves pendant que le flush de démontage de L'ANCIENNE est encore en
// vol — la lecture peut battre l'écriture de vitesse et recharger un état en
// léger retour arrière, répercuté aux invités par snapshot. Ce cache fait
// foi sur la base pendant une courte fenêtre (HOST_MEM_CACHE_MS) : dans le
// même onglet, la mémoire est par construction au moins aussi fraîche que ce
// que CE même hôte a pu écrire en base. Jamais utilisé au-delà de la
// fenêtre (une autre room/un autre hôte a alors pu écrire plus récent).
let hostFarmMemCache = null; // { code, state, at }
// Carte maléfique (seed FIXE, identique pour tous) : générée UNE fois par
// onglet et partagée entre toutes les instances/du composant (correctif
// latence 2026-07 : la générer à chaud au premier passage/première
// simulation hôte provoquait un à-coup perceptible).
// Zip 235 (Guillaume, "similar to Folk of the Faraway Tree, where lands come
// and go and rotate through"): cache is now keyed by the CURRENT PASSAGE
// WORLD INDEX (rotates every SEASON_DAYS in-game days). The evil-world
// coordinates (EVIL_SPAWN, EVIL_RETURN_PASSAGE, EVIL_CAULDRON_SPAWN) are
// reused verbatim, so the fade/walk-over machinery in FermeGame stays
// unchanged; each passage world just paints a different biome + gives
// different loot/pets. See generatePassageWorld/passageWorldOf in engine.
let evilWorldModuleCache = null;
let evilWorldModuleCacheIdx = -1;
function getEvilWorldCached(E2, day) {
  const idx = E2.passageWorldIndex(day || 1);
  if (!evilWorldModuleCache || evilWorldModuleCacheIdx !== idx) {
    evilWorldModuleCache = E2.generatePassageWorld(idx);
    evilWorldModuleCacheIdx = idx;
  }
  return evilWorldModuleCache;
}
// Valley Town (zip 234): same module-level cache pattern as the evil world —
// fixed seed, generated once per page load, shared by every remount.
let townWorldModuleCache = null;
function getTownWorldCached(E2) {
  if (!townWorldModuleCache) townWorldModuleCache = E2.generateTownWorld();
  return townWorldModuleCache;
}
const HOST_MEM_CACHE_MS = 20000;

// Petit hash stable d'une chaîne -> seed positive (monde stable par salon).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h & 0x7fffffff;
}

// Migration douce d'une ferme sauvegardée par un zip antérieur à la
// possibilité d'acheter plusieurs chevaux (demande 2026-07) : l'ancien
// format stockait un seul cheval sous `saved.horse` (objet unique, avec
// `owned:false` comme sentinelle d'absence). Le nouveau format stocke un
// TABLEAU `saved.horses` (0 à HORSE_MAX_COUNT entrées, chacune toujours
// possédée). Ne perd jamais un cheval déjà acheté.
function migrateHorses(saved) {
  if (Array.isArray(saved.horses)) return saved.horses;
  if (saved.horse && saved.horse.owned) return [{ x: saved.horse.x, y: saved.horse.y, rider: null, rider2: null }];
  return [];
}

// Les gemmes/diamants deviennent un pool COMMUN à la salle (chantier 2026-07,
// demande Guillaume), au lieu d'un inventaire privé par fermier. Filet de
// migration (même principe que migrateHorses) : si la sauvegarde n'a pas
// encore de `gems` partagé, on récupère tout ce que chaque fermier avait déjà
// trouvé individuellement (f.inv.gems) dans le pool commun, sans rien perdre,
// puis on vide l'inventaire privé (devenu obsolète pour les gemmes).
function migrateGems(saved) {
  const n = C.GEMS.length;
  const gems = Array.isArray(saved.gems) ? saved.gems.slice(0, n) : [];
  while (gems.length < n) gems.push(0);
  if (!saved.gems) {
    for (const id in (saved.farmers || {})) {
      const f = saved.farmers[id];
      if (f && f.inv && Array.isArray(f.inv.gems)) {
        for (let i = 0; i < f.inv.gems.length && i < n; i++) gems[i] += f.inv.gems[i] || 0;
        f.inv.gems = C.GEMS.map(() => 0);
      }
    }
  }
  return gems;
}

export default function FermeGame({ room, me, isHost, players, t, lang, onFinish, savedCode, onCodeLoaded, hidden }) {
  const L = fstr(lang);

  // -------- État React (piloté par évènements, basse fréquence) --------
  // Phases : "code" (hôte : saisit le code de ferme) -> "select" (choix du
  // perso, sauté si déjà mémorisé) -> "playing". L'invité démarre en "select"
  // (il attend l'instantané de l'hôte, sans saisir de code).
  // Correctif 2026-07 : quand `savedCode` est fourni (l'hôte a déjà chargé
  // cette ferme plus tôt dans la session — voir page.js), on saute
  // directement l'écran "code" au lieu d'y rester bloqué. Indispensable pour
  // l'instance CACHÉE (display:none) montée en arrière-plan quand l'hôte
  // quitte la vue ferme : sans ça, personne ne peut jamais cliquer sur
  // "Charger" pour elle, et la simulation ne redémarre jamais tant que
  // l'hôte est "away" — contrairement à ce que promettait le design.
  const [phase, setPhase] = useState(isHost && !savedCode ? "code" : "select");
  const [gender, setGender] = useState("m");
  const [nameVal, setNameVal] = useState((me?.username || "Fermier").slice(0, 14));
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  // Correctif audit lancement 2026-07 : vrai quand l'hôte a répondu "pas
  // encore de ferme chargée" (event `nofarm`) — l'invité affiche alors un
  // message d'attente explicite au lieu d'un "Connexion…" muet et sans fin.
  const [hostPreparing, setHostPreparing] = useState(false);
  const [hud, setHud] = useState({ money: C.START_MONEY, day: 1, timeMin: C.DAY_START_MIN, players: 1 });
  const [myEnergy, setMyEnergy] = useState(C.MAX_ENERGY);
  const [myTools, setMyTools] = useState({ hoe: 1, can: 1, axe: 1, pick: 1 });
  const [myInv, setMyInv] = useState(null);
  const [myQuests, setMyQuests] = useState(null); // {questId: true}
  const [questOpen, setQuestOpen] = useState(true);
  const [questsHidden, setQuestsHidden] = useState(false); // true = checklist remplie depuis plus de 30 min -> disparition définitive
  const [slot, setSlot] = useState(0);
  const [seedSel, setSeedSel] = useState(0);
  const [seedMenuOpen, setSeedMenuOpen] = useState(false); // mini-menu de choix de graine
  // Outil "tools" (simplification barre d'outils) : houe/hache/pioche sont
  // regroupées sous une seule case (touche 1). toolKind mémorise lequel des
  // trois est actuellement équipé ; la touche 1 fait tourner hoe -> axe ->
  // pick -> hoe quand la case est déjà sélectionnée, et le clic gauche ouvre
  // toolMenuOpen (même principe que seedMenuOpen) pour choisir directement.
  const [toolKind, setToolKind] = useState("hoe");
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [fenceDir, setFenceDir] = useState("auto"); // orientation affichée dans la barre d'outils (miroir de fenceDirRef)
  // Construction (chantier 2026-07) : l'outil clôture (case 8) devient un
  // outil "Construction" générique à 3 variantes choisies depuis le menu
  // Construire/Vendre (clic sur bois/pierre du HUD) : "fence" (clôture, en
  // bois), "wall" (mur, en pierre) ou "path" (chemin dallé, en pierre).
  const [buildKind, setBuildKind] = useState("fence");
  // craftMenuOpen : null (fermé) | "wood" | "stone" — quelle popup Construire/Vendre est ouverte.
  const [craftMenuOpen, setCraftMenuOpen] = useState(null);
  const [carryingAnimal, setCarryingAnimal] = useState(false); // vrai si un animal est actuellement porté (miroir de heldAnimalRef)
  const [buildings, setBuildings] = useState({ horseCount: 0, wellBuilt: false, animalCount: 0 });
  const [onHorse, setOnHorse] = useState(false);
  const [torchOn, setTorchOn] = useState(false); // torche allumée (chantier 2026-07) : éloigne les loups, éclaire un rayon autour du porteur
  const [fishMini, setFishMini] = useState(null); // {mode, fish} pendant le minijeu, sinon null
  const [barnMini, setBarnMini] = useState(null); // {level} pendant le mini-jeu de construction de la grange, sinon null
  const [wolfBite, setWolfBite] = useState(null); // {wolfId} pendant le mini-jeu de morsure (loup agressif), sinon null
  const [evilBite, setEvilBite] = useState(null); // {monsterId} pendant le mini-jeu de morsure d'une créature maléfique (chantier 2026-07), sinon null
  const [injuredUntil, setInjuredUntil] = useState(0); // horodatage de fin d'indisponibilité (0 = pas blessé), survit à un refresh (voir farmer.injuredUntil)
  const [immunityUntil, setImmunityUntil] = useState(0); // pommade de protection (chantier 2026-07) : horodatage de fin d'immunité/répulsion aux créatures maléfiques (0 = inactif), effet purement local, ne survit pas à un refresh
  const [shopOpen, setShopOpen] = useState(false);
  // -------- 2026-07 station update: UI state --------
  const [stationSt, setStationSt] = useState(null);    // React mirror of sharedRef.current.station
  const [adsOpen, setAdsOpen] = useState(false);       // station ad board panel
  const [adsSel, setAdsSel] = useState([]);            // checkbox selection inside the panel
  const [visitorOpen, setVisitorOpen] = useState(false); // visitor dialog panel
  const [visitorRid, setVisitorRid] = useState(-1);    // which visitor the dialog targets (zip 233: several at once)
  const [myVote, setMyVote] = useState(null);          // my residency vote (null until cast)
  const [repairMini, setRepairMini] = useState(null);  // co-op repair minigame ({name}) | null
  const [nearHall, setNearHall] = useState(false);     // am I close to the townhall? (1 Hz, corner notif)
  const [nearArtisan, setNearArtisan] = useState(null); // zip 259 : bid du bâtiment d'artisan proche (encart d'info production), ou null
  const repairSeenRef = useRef(0);                     // damage.until already shown (no re-open loop)
  const visitorNetRef = useRef(0);                     // host network throttle for visitorSim
  const residentNetRef = useRef(0);                    // zip 252: host network throttle for residentSim (résidents baladeurs)
  const ducksRef = useRef(null);                       // decorative ducks (client-side, seeded)
  const adsOpenRef = useRef(false);
  const visitorOpenRef = useRef(false);
  const [gregOrderOpen, setGregOrderOpen] = useState(false); // panneau "donner un ordre à Greg" (chantier 2026-07)
  const [gregOrderCrop, setGregOrderCrop] = useState(0);
  const [gregOrderCount, setGregOrderCount] = useState(10);
  // Ordre choisi mais pas encore lancé (retour Guillaume 2026-07) : le joueur
  // choisit culture+nombre à la boutique, PUIS se déplace où il veut que Greg
  // travaille et confirme via le bouton flottant (gregOrderFab) — l'ancre de
  // recherche de cases est alors sa position réelle à cet instant (px/py),
  // pas la boutique où il était en train de choisir.
  const [gregOrderPending, setGregOrderPending] = useState(null); // {crop, count} | null
  // Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume) : pas de
  // panneau de choix (culture/nombre) comme Greg — un seul ordre possible,
  // envoyé directement au clic ("Envoyer pêcher"), donc aucun state
  // "pending" n'est nécessaire ici.
  const [fertilizerOrderOpen, setFertilizerOrderOpen] = useState(false); // panneau "épandre de l'engrais" (chantier 2026-07)

  // Même schéma différé que gregOrderPending ci-dessus : choisi à la
  // boutique, confirmé ensuite via le bouton flottant à l'endroit voulu.
  const [fertilizerOrderPending, setFertilizerOrderPending] = useState(false); // true | false — zone fixe 5x5, plus de nombre de cases à choisir
  const [binOpen, setBinOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false); // zip 236: personal bag modal
  const [mapOpen, setMapOpen] = useState(false);
  // Menu du chaudron (chantier 2026-07, demande Guillaume : "le click sur E
  // doit ouvrir un menu chaudron que voulez-vous concocter ?") : remplace
  // l'ancien enchaînement automatique E->dépôt/E->lancement par un vrai menu
  // (liste de produits, une seule entrée pour l'instant : la pommade
  // magique). Voir cauldronPlaceIngredients/igniteCauldron plus bas.
  const [cauldronMenuOpen, setCauldronMenuOpen] = useState(false);
  const [brewSecs, setBrewSecs] = useState(0); // secondes restantes de concoction, affichées dans le prompt (correctif audit 2026-07)
  // Menu "Employés actifs" (chantier 2026-07, demande Guillaume : "un menu
  // qui indique le nom des employés sous contrat actuellement, on pourra les
  // diriger à partir de ce menu, leur donner les ordres") : panneau dédié,
  // séparé de la boutique — liste UNIQUEMENT les employés (Greg/Soan)
  // effectivement sous contrat (sharedRef.current.greg/soan non null), avec
  // leur nom et le temps de contrat restant, et donne un accès direct aux
  // mêmes ordres que la boutique (gregOrderOpen/fertilizerOrderOpen/
  // soanOrder/soanRecall — aucune nouvelle logique de commande, juste un
  // raccourci d'accès pour éviter de rouvrir toute la boutique).
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [gregCardOpen, setGregCardOpen] = useState(false); // FIX 246 : fiche de Greg ouverte via la touche Q à proximité (comme les visiteurs)
  // Zip 258 : commande de voyage à Eduardo (menu Employés) + revente des
  // produits du monde rapportés. voyagerDraft = { key: quantité }.
  const [voyagerOrderOpen, setVoyagerOrderOpen] = useState(false);
  const [voyagerSellOpen, setVoyagerSellOpen] = useState(false);
  const [voyagerDraft, setVoyagerDraft] = useState({});
  const [residentCard, setResidentCard] = useState(null);  // zip 252 : rid du résident dont la fiche dialogue est ouverte (ou null)
  const [petChoice, setPetChoice] = useState(null);        // zip 252 : { petId } cadeau animal en attente quand le sac est plein
  const gregCardOpenRef = useRef(false);
  const [promptKey, setPromptKey] = useState(null); // 'shop' | 'bin' | null
  const [mountPrompt, setMountPrompt] = useState(null); // 'mount' | 'dismount' | null
  const [chat, setChat] = useState([]);   // {id, from, msg}
  const [toasts, setToasts] = useState([]); // {id, msg}
  const [spritesReady, setSpritesReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coop, setCoop] = useState(null); // miroir React de sharedRef.current.coop (mission d'équipe en cours)
  const [barn, setBarn] = useState(null); // miroir React de sharedRef.current.barn (grange persistante)
  const [salveCraft, setSalveCraft] = useState(null); // miroir React de sharedRef.current.salveCraft (chaudron de la pommade)
  const [house, setHouse] = useState({ level: 1, upgradeUntil: 0 }); // miroir React de sharedRef.current.house (maison à niveaux, 2026-07)
  const [gems, setGems] = useState(() => C.GEMS.map(() => 0)); // miroir React de sharedRef.current.gems (pool commun à la salle)
  const [flour, setFlour] = useState(0); // miroir React de sharedRef.current.flour (sacs de farine, pool commun à la salle, chantier 2026-07)
  const [gregStock, setGregStock] = useState(() => ({ wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) })); // miroir React de sharedRef.current.gregStock (bois/pierre récoltés par Greg + engrais acheté + poissons pêchés par Soan, pool commun, chantier 2026-07)
  const [fertilizerShop, setFertilizerShop] = useState(() => ({ stock: 0, lastRestockDay: 0 })); // miroir React de sharedRef.current.fertilizerShop (stock boutique de l'engrais, chantier 2026-07)
  // Défi "chasse aux lapins" (chantier 2026-07, demande Guillaume) : miroir
  // React de sharedRef.current.rabbitChallenge (null si aucun défi en cours),
  // popup de proposition affichée UNIQUEMENT à l'hôte (jamais partagée), et
  // trophée gagné (temporaire depuis le correctif 2026-07, voir
  // farmer.hatUntil / p.hatWon / C.HAT_DISPLAY_MS).
  const [rabbitChallenge, setRabbitChallenge] = useState(null);
  const [rabbitChallengeOffer, setRabbitChallengeOffer] = useState(false); // popup "activer le défi ?" (hôte uniquement)
  const [hatUntil, setHatUntil] = useState(0); // moi-même : horodatage de fin d'affichage du trophée (0 = pas de trophée en cours)

  // -------- Refs (état du jeu, lus par la boucle de rendu) --------
  const canvasRef = useRef(null);
  const mapCanvasRef = useRef(null);
  // Canvas hors-écran dédié à l'overlay nocturne (correctif chantier
  // 2026-07, voir nightAlpha/lampsInView) : le voile sombre + les halos
  // "destination-out" des lampadaires sont composés ICI, séparément du
  // canvas principal, puis le résultat est plaqué par-dessus en une seule
  // fois (drawImage, composite normal). Sans ce détour, appliquer
  // "destination-out" directement sur le canvas principal n'aurait pas
  // seulement percé le voile sombre : ça aurait aussi effacé le terrain/les
  // sprites déjà dessinés dessous dans le rayon du lampadaire, laissant un
  // trou transparent (fond de la page visible) plutôt qu'un cercle éclairé
  // — c'était la cause du bug "les lampadaires restent éteints la nuit".
  const nightCanvasRef = useRef(null);
  // Météo (chantier 2026-07) : positions (fractions 0..1 de l'écran) des
  // traits de pluie affichés les jours orageux — générées une seule fois
  // puis animées frame après frame (voir le rendu plus bas), pas régénérées
  // à chaque frame pour éviter un scintillement aléatoire.
  const rainDropsRef = useRef(null);
  const snowFlakesRef = useRef(null); // zip 235: winter fullscreen snowfall (screen-space, same idea as rainDropsRef)
  const passageIdxRef = useRef(-1);   // zip 235: last known passage-world index (rotates weekly)
  const passageAppliedIdxRef = useRef(-1);
  const facadeStylesRef = useRef({}); // zip 235: farmerId -> town façade style index (client-side pref, broadcast via pos)
  const petCaughtRef = useRef({});    // zip 235: worldKey -> true once we caught this week's pet locally (limits nagging)
  const pickedIdsRef = useRef({});    // zip 235: worldIdx -> { pickupId -> true }, client-side idempotence
  const mazePrizeClaimedRef = useRef({}); // zip 235: worldIdx -> true (once/week/player)
  const speedBuffUntilRef = useRef(0);   // zip 235: candy speed buff expiry (performance.now())
  const chatInputRef = useRef(null);
  const channelRef = useRef(null);
  const spritesRef = useRef(null);
  const worldRef = useRef(null);
  // Carte maléfique (chantier 2026-07, demande Guillaume — "passage sombre") :
  // générée localement à la première entrée (E.generateEvilWorld, seed fixe,
  // voir fermeEngine.js), gardée en cache ensuite (même instance tant que
  // l'onglet reste ouvert). Totalement indépendante de worldRef (qui reste
  // TOUJOURS la ferme, y compris pour la simulation hôte pendant que ce
  // joueur précis est parti — voir updateMe/le rendu, qui basculent sur
  // evilWorldRef seulement pour CE joueur, jamais sur worldRef lui-même).
  const evilWorldRef = useRef(null);
  // Valley Town (zip 234) : carte locale de CE joueur, comme evilWorldRef —
  // mais le zone "town" est MULTIJOUEUR (positions publiees normalement).
  const townWorldRef = useRef(null);
  // Transition en fondu au noir (aller ET retour) : { active, t0, toEvil,
  // swapped }. `swapped` marque le moment (mi-fondu, écran totalement noir)
  // où la téléportation réelle a lieu, pour qu'elle soit invisible.
  const zoneTransRef = useRef({ active: false, t0: 0, toEvil: false, swapped: false });
  const meRef = useRef(null);
  const playersRef = useRef(new Map()); // id -> remote farmer render data
  const farmersRef = useRef({});        // hôte : id -> état privé arbitré
  const sharedRef = useRef({ seed: 0, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), salveCraft: E.newSalveCraftState(), house: { level: 1, upgradeUntil: 0 }, evilMonsters: [], flour: 0, gregStock: { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) }, fertilizerShop: { stock: 0, lastRestockDay: 0 }, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [], rabbitChallenge: null, greg: null, soan: null, harald: null, station: E.newStationState(), decor: [], crafts: E.newCrafts(), craftStock: E.newCraftStock() });
  const invRef = useRef(null);
  const toolsRef = useRef({ hoe: 1, can: 1, axe: 1, pick: 1 });
  const energyRef = useRef(C.MAX_ENERGY);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const slotRef = useRef(0);
  const toolKindRef = useRef("hoe"); // miroir synchrone de toolKind (hoe/axe/pick)
  const seedSelRef = useRef(0);
  const actAnimRef = useRef(0);
  const fxRef = useRef([]);
  const joinedRef = useRef(false);
  const channelReadyRef = useRef(false);
  const restoredRef = useRef(false);
  const minimapImgRef = useRef(null);
  const minimapDirtyRef = useRef(true);
  const dirtyRef = useRef(false);
  const overridesRef = useRef({ ground: {}, object: {} }); // deltas vs monde de base
  const lastPosSentRef = useRef(0);
  const lastPosKeyRef = useRef("s");        // FIX 243: derniere cle d'etat de mouvement diffusee ("m"+dir ou "s") pour l'emission par intention
  const lastMovingSentRef = useRef(false); // FIX 241: dernier "moving" diffusé — coupe l'envoi de position quand le joueur est immobile
  const hiddenRef = useRef(false);         // FIX 241: onglet masqué (Page Visibility) — coupe toute diffusion réseau (desktop + tablette)
  const mapOpenRef = useRef(false);
  const shopOpenRef = useRef(false);
  const binOpenRef = useRef(false);
  const bagOpenRef = useRef(false); // zip 236
  const [myPets, setMyPets] = useState([]); // zip 236: my individual pets, mirror of me.pets
  const myPetsRef = useRef([]);     // zip 236: draw-loop mirror of myPets
  const petFollowRef = useRef(new Map());  // zip 247: smoothed follow positions, per-player-id (self + remotes)
  const cauldronMenuOpenRef = useRef(false);
  const brewSecsRef = useRef(0);       // miroir de brewSecs (évite un setState par frame dans la boucle de rendu)
  const cauldronPosRef = useRef(null); // cache de la position du chaudron (correctif audit 2026-07 : évite un scan complet de la carte par frame ; invalidé si l'objet n'y est plus) // miroir synchrone de cauldronMenuOpen, même rôle que shopOpenRef/binOpenRef (bloque déplacement/action pendant que le menu est ouvert)
  const toastIdRef = useRef(0);
  const chatIdRef = useRef(0);
  const farmCodeRef = useRef("");      // code de la ferme durable en cours
  const worldReadyRef = useRef(false); // miroir synchrone de worldReady (lu dans le handler `snapshot`, correctif audit lancement 2026-07)
  const lastSnapSentRef = useRef(0);   // hôte : throttle des snapshots complets déclenchés par `hello` (au plus 1 par 500 ms)
  const persistFnRef = useRef(null);   // toujours la DERNIÈRE persistFarm (closures fraîches pour les filets unmount/pagehide ci-dessous)
  const autoJoinTriedRef = useRef(false);
  const fishTileRef = useRef(null);    // case d'eau ciblée par le minijeu de pêche
  const fishMiniRef = useRef(false);
  const seaStreakRef = useRef(0);      // 2026-07 station update: consecutive casts (client mirror, host re-validates)   // un mini-jeu plein écran est en cours (pêche OU construction de la grange) : bloque le reste
  const autoHarvestPendingRef = useRef(new Set()); // tuiles de récolte auto déjà demandées (anti-spam)
  const autoWaterPendingRef = useRef(new Set());   // tuiles d'arrosage auto déjà demandées (anti-spam)
  const autoCollectPendingRef = useRef(new Set()); // animaux de collecte auto déjà demandés (anti-spam)
  const fenceDirRef = useRef("auto"); // orientation choisie pour la prochaine clôture posée ("auto"|"h"|"v")
  const buildKindRef = useRef("fence"); // miroir synchrone de buildKind ("fence"|"wall"|"path"|"lamp"|"scarecrow"|"grass"|"mill"|"bridgeWood"|"bridgeStone")
  const heldAnimalRef = useRef(-1);   // index (dans sharedRef.animals) de l'animal actuellement porté par CE joueur, -1 sinon
  // Zip 251 : outil main. handModeRef = déco du sac ARMÉE pour la pose (id) ou
  // null ; handHeldRef = objet attrapé sur la carte pour être déplacé/rangé :
  //   { kind:"decor", did, deco } | { kind:"obj", otype, fromX, fromY } | null
  const handModeRef = useRef(null);
  const handHeldRef = useRef(null);
  const [handMode, setHandMode] = useState(null);      // miroir React (surbrillance menu)
  const [handMenuOpen, setHandMenuOpen] = useState(false);
  const [handHeldUI, setHandHeldUI] = useState(null);  // miroir React (invite d'action)
  const horseCallAccumRef = useRef(0); // accumulateur (secondes) pour throttler la diffusion réseau des chevaux sifflés en course
  const wolfAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour les loups simulés côté hôte
  const rabbitAccumRef = useRef(0);
  const evilMonstersAccumRef = useRef(0); // hôte : throttle réseau des créatures maléfiques partagées (2026-07)    // accumulateur (secondes), même throttle réseau pour les lapins simulés côté hôte
  const gregAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour Greg simulé côté hôte
  const soanAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour Soan simulé côté hôte
  const haraldAccumRef = useRef(0);    // zip 260 : même throttle réseau pour Harald (agent d'élevage) simulé côté hôte
  // FIX 246 : état de lissage des PNJ/bêtes côté invité, PERSISTANT (survit
  // au remplacement en bloc de greg/soan/wolves/rabbits par applyDeltas à
  // 2 Hz — c'est cette perte d'état qui rendait l'ancien easing g.rx/g.ry
  // inopérant, d'où le rendu ultra saccadé). Clé -> { x,y (rendu), bx,by
  // (base du dernier snapshot), lx,ly, vx,vy (vitesse estimée), tSnap }.
  const npcSmoothRef = useRef(new Map());
  const rabbitRespawnAtRef = useRef(0); // horodatage du prochain repop autorisé (repop progressif, pas instantané)
  const rabbitSeqRef = useRef(0);      // compteur pour des ids de lapins uniques
  const torchOnRef = useRef(false);    // miroir synchrone de torchOn (lu dans la boucle de rendu / diffusé avec la position)
  // Dormir dans la maison (chantier 2026-07) : sleepStartedAtRef (performance.now(),
  // horloge locale) + sleepStartEnergyRef permettent d'interpoler localement l'énergie
  // affichée pendant les 60s, même principe que cropGrowState mais côté client pour
  // le confort visuel du dormeur (l'hôte, lui, dérive l'énergie finale de SA propre
  // horloge à la sortie, voir resolveSleepEnd — les deux convergent car basés sur la
  // même énergie de départ et la même durée C.SLEEP_MS).
  const sleepStartedAtRef = useRef(null);
  const sleepStartEnergyRef = useRef(0);
  const sleepTimerRef = useRef(null); // setTimeout de sortie automatique après C.SLEEP_MS
  const injuredUntilRef = useRef(0); // miroir synchrone de injuredUntil (lu dans la boucle de rendu/déplacement)
  const immunityUntilRef = useRef(0); // miroir synchrone de immunityUntil (lu dans updateEvilMonsters)
  const hatUntilRef = useRef(0); // miroir synchrone de hatUntil (lu dans la boucle de rendu, voir drawCharacter)
  const rabbitChallengeOfferRef = useRef(false); // miroir synchrone de rabbitChallengeOffer (lu dans le timer hôte, évite de reproposer en boucle)
  const evilBiteRef = useRef(null); // miroir synchrone de evilBite (lu dans updateEvilMonsters, boucle de rendu — évite de redéclencher le mini-jeu tant qu'il est déjà ouvert)

  useEffect(() => { fishMiniRef.current = !!fishMini || !!barnMini || !!wolfBite || !!evilBite || !!repairMini; }, [fishMini, barnMini, wolfBite, evilBite, repairMini]);
  useEffect(() => { adsOpenRef.current = adsOpen; visitorOpenRef.current = visitorOpen; }, [adsOpen, visitorOpen]);
  useEffect(() => { gregCardOpenRef.current = gregCardOpen; }, [gregCardOpen]); // FIX 246
  // 2026-07 station update: a fresh hostile raid opens the co-op repair
  // minigame for EVERYONE online (keyed by damage.until so it opens once).
  useEffect(() => {
    const d = stationSt && stationSt.damage;
    if (d && repairSeenRef.current !== d.until && Date.now() < d.until) {
      repairSeenRef.current = d.until;
      const ro = C.VISITOR_ROSTER[d.rid];
      setRepairMini({ name: ro ? ro.name : "?" });
    }
    if (!d && repairMini) setRepairMini(null); // repaired (or expired) elsewhere
  }, [stationSt]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset my residency vote whenever the targeted visitor changes (zip 233).
  useEffect(() => { setMyVote(null); }, [visitorRid]); // eslint-disable-line react-hooks/exhaustive-deps
  // Zip 234 (friendship): opening a visitor card greets them — the host
  // grants any unclaimed ARRIVAL gift to the greeting farmer (no-op
  // otherwise, see resolveVisitorGreet).
  useEffect(() => { if (visitorOpen && visitorRid >= 0) sendReq({ kind: "visitorGreet", rid: visitorRid }); }, [visitorOpen, visitorRid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { evilBiteRef.current = evilBite; }, [evilBite]);
  useEffect(() => { injuredUntilRef.current = injuredUntil || 0; }, [injuredUntil]);
  useEffect(() => { immunityUntilRef.current = immunityUntil || 0; }, [immunityUntil]);
  useEffect(() => { hatUntilRef.current = hatUntil || 0; }, [hatUntil]);
  useEffect(() => { rabbitChallengeOfferRef.current = !!rabbitChallengeOffer; }, [rabbitChallengeOffer]);
  useEffect(() => { worldReadyRef.current = worldReady; }, [worldReady]);
  useEffect(() => { mapOpenRef.current = mapOpen; }, [mapOpen]);
  useEffect(() => { shopOpenRef.current = shopOpen; }, [shopOpen]);
  useEffect(() => { cauldronMenuOpenRef.current = cauldronMenuOpen; }, [cauldronMenuOpen]);
  useEffect(() => { binOpenRef.current = binOpen; }, [binOpen]);
  useEffect(() => { myPetsRef.current = myPets; }, [myPets]);
  useEffect(() => { bagOpenRef.current = bagOpen; }, [bagOpen]);
  useEffect(() => { slotRef.current = slot; }, [slot]);
  useEffect(() => { handModeRef.current = handMode; }, [handMode]); // zip 251
  const handMenuOpenRef = useRef(false);
  useEffect(() => { handMenuOpenRef.current = handMenuOpen; }, [handMenuOpen]); // zip 251
  useEffect(() => { toolKindRef.current = toolKind; }, [toolKind]);
  useEffect(() => { seedSelRef.current = seedSel; }, [seedSel]);

  // Ordre d'arrivée -> tenue attribuée
  const myOutfit = (() => {
    const sorted = [...players].sort((a, b) => (a.joined_at || "").localeCompare(b.joined_at || ""));
    const i = sorted.findIndex(p => p.profile_id === me.id);
    return (i < 0 ? 0 : i) % C.OUTFITS.length;
  })();

  // -------- Sprites (client uniquement) + habillage --------
  useEffect(() => {
    if (typeof document === "undefined") return;
    setMounted(true);
    spritesRef.current = buildSprites();
    setSpritesReady(true);
    // Masque le chrome ARCARDI (FABs haut/droite, barre de scores, logo) tant
    // que la ferme est ouverte : elle est plein écran et ces boutons (mode
    // agrandi surtout) pourraient interférer avec le rendu / la sortie.
    document.body.classList.add("ferme-active");
    // Pré-remplit le dernier code de ferme utilisé sur cette machine.
    try { const c = window.localStorage.getItem("ferme_lastcode"); if (c) setCodeInput(c); } catch (e) { /* localStorage indispo */ }
    return () => document.body.classList.remove("ferme-active");
  }, []);

  // Correctif 2026-07 : quand cette instance démarre avec `savedCode` (cas de
  // l'instance CACHÉE montée en arrière-plan pendant que l'hôte est "away",
  // ET du remontage lors d'un "Rejoindre la ferme"), on charge le monde tout
  // de suite au lieu d'attendre un clic sur "Charger" que personne ne peut
  // faire (l'instance cachée n'est jamais affichée). Sans ce correctif, la
  // simulation host-authoritative restait totalement figée pendant toute
  // l'absence de l'hôte, malgré ce que promettait le design de `fermeAway`.
  useEffect(() => {
    if (isHost && savedCode && !farmCodeRef.current) loadFarmByCode(savedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checklist des quêtes de découverte (nouveaux joueurs) : une fois toutes
  // les quêtes cochées, elle n'a plus d'utilité. Demande 2026-07: elle doit
  // disparaître (icône + panneau) 30 minutes après avoir été entièrement
  // remplie, pour ne pas rester affichée indéfiniment. L'horodatage de fin
  // est gardé en localStorage (par machine) pour survivre à un rechargement.
  useEffect(() => {
    const QUESTS_DONE_KEY = "ferme_quests_done_at";
    const checkQuestsHidden = () => {
      try {
        const doneAt = window.localStorage.getItem(QUESTS_DONE_KEY);
        if (doneAt && Date.now() - Number(doneAt) > 30 * 60 * 1000) setQuestsHidden(true);
      } catch (e) { /* localStorage indispo */ }
    };
    checkQuestsHidden();
    const iv = setInterval(checkQuestsHidden, 30 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!myQuests || questsHidden) return;
    if (!C.QUESTS.every(q => myQuests[q.id])) return;
    try {
      if (!window.localStorage.getItem("ferme_quests_done_at")) {
        window.localStorage.setItem("ferme_quests_done_at", String(Date.now()));
      }
    } catch (e) { /* localStorage indispo */ }
  }, [myQuests, questsHidden]);

  // Rend le jeu dans un PORTAL vers document.body. INDISPENSABLE : le jeu est
  // plein écran en position:fixed, mais le conteneur du stage (.door-content a
  // un transform via l'animation povPush, .door-stage a perspective +
  // overflow:hidden) crée un bloc englobant qui "capturerait" et rognerait un
  // position:fixed. Le portal vers body fait résoudre le fixed par rapport au
  // viewport, comme dans la maquette plein écran.
  // Correctif URGENT 2026-07 (bug remonté par Guillaume : bouton "Quitter"
  // qui ne ramène pas au lobby, mais renvoie instantanément dans la partie,
  // fermier respawné devant la maison) : cette fonction rend TOUJOURS via un
  // PORTAL React directement dans `document.body` (indispensable pour le
  // plein écran `position:fixed`, voir commentaire plus haut) — un portal
  // rend son contenu dans un noeud DOM totalement différent de celui où il
  // est déclaré dans l'arbre React. Un `display:none` posé sur le `<div>`
  // wrapper de l'instance CACHÉE (page.js, avant `</RoomChat>`) n'a donc
  // AUCUN effet sur ce contenu : il reste visible, plein écran, par-dessus
  // tout le reste. Or cette instance cachée s'auto-rejoint dès que son monde
  // est prêt (effet d'auto-spawn plus bas, personnage déjà mémorisé) et
  // spawn systématiquement au point de spawn (`C.SPAWN`, près de la maison,
  // voir `doJoinWith`) — d'où le symptôme exact remonté : clic "Quitter" ->
  // l'hôte est VISUELLEMENT renvoyé dans la ferme, planté devant sa maison,
  // sans jamais voir le salon. Le correctif : un prop `hidden` dédié (passé
  // uniquement par l'instance cachée de page.js) qui coupe le RENDU (portal
  // renvoyé à `null`) sans toucher aux effets/refs/intervalles React, qui
  // continuent de tourner normalement sur un composant simplement non rendu
  // — la simulation en arrière-plan (le vrai but de cette instance) n'est
  // donc pas affectée, seul son affichage fantôme disparaît.
  const wrap = (node) => (!hidden && mounted && typeof document !== "undefined" ? createPortal(node, document.body) : null);

  // -------- Hôte : charge (ou crée) une ferme durable depuis son CODE --------
  // Charge la sauvegarde de la table ferme_saves indexée par le code saisi.
  // Si le code n'existe pas encore, crée une nouvelle ferme (seed dérivée du
  // code, donc reproductible). Puis diffuse un instantané aux invités.
  async function loadFarmByCode(rawCode) {
    const code = String(rawCode || "").trim().toLowerCase();
    if (!code) { setCodeError(L.codeEmpty); return; }
    setCodeError(""); setCodeLoading(true);
    let saved = null;
    // Cache mémoire d'abord (voir hostFarmMemCache en tête de fichier) : lors
    // d'une bascule d'instance hôte dans le même onglet, il est toujours au
    // moins aussi frais que la base et élimine la course lecture/écriture.
    if (hostFarmMemCache && hostFarmMemCache.code === code && Date.now() - hostFarmMemCache.at < HOST_MEM_CACHE_MS) {
      saved = hostFarmMemCache.state;
    } else try {
      const { data, error } = await supabase.from("ferme_saves").select("state").eq("code", code).maybeSingle();
      if (error) throw error;
      if (data && data.state) saved = data.state;
    } catch (e) {
      console.error("[FERME] Lecture ferme_saves impossible (table absente ? exécute supabase/upgrade-005.sql).", e);
      setCodeError(L.codeDbError); setCodeLoading(false); return;
    }
    farmCodeRef.current = code;
    try { window.localStorage.setItem("ferme_lastcode", code); } catch (e) { /* ignore */ }
    if (saved && typeof saved.seed === "number") {
      const w = E.generateWorld(saved.seed);
      E.applyOverrides(w, { groundOv: saved.groundOv, objectOv: saved.objectOv, crops: saved.crops, mills: saved.mills });
      worldRef.current = w;
      // 2026-07 station update: the pre-built station stands on cleared
      // ground even on old saves (same normalization spirit as the cauldron
      // fix of zip 230). Overrides persist + travel in snapshots.
      for (const ci of E.clearStationArea(w)) recordTileOverride(ci);
      overridesRef.current = { ground: { ...(saved.groundOv || {}) }, object: { ...(saved.objectOv || {}) } };
      sharedRef.current = {
        seed: saved.seed, money: saved.money, day: saved.day, dayStartAt: saved.dayStartAt, totalEarned: saved.totalEarned,
        horses: migrateHorses(saved),
        animals: saved.animals || [], wellBuilt: !!saved.wellBuilt, coop: saved.coop || null,
        barn: saved.barn || E.newBarnState(),
        salveCraft: saved.salveCraft || E.newSalveCraftState(),
        // Maison à niveaux (validation Guillaume 2026-07) : persiste comme la grange.
        house: (saved.house && saved.house.level) ? { level: saved.house.level, upgradeUntil: saved.house.upgradeUntil || 0 } : { level: 1, upgradeUntil: 0 },
        evilMonsters: [], // créatures maléfiques partagées (2026-07) : jamais restaurées, régénérées depuis la seed fixe à la demande (comme les loups)
        gems: migrateGems(saved),
        flour: saved.flour || 0,
        // Stock commun de bois/pierre récoltés par Greg (chantier 2026-07,
        // "étendre son champ") : survit à une reprise, comme flour/gems.
        gregStock: { wood: (saved.gregStock && saved.gregStock.wood) || 0, stone: (saved.gregStock && saved.gregStock.stone) || 0, fertilizer: (saved.gregStock && saved.gregStock.fertilizer) || 0, fish: C.FISH.map((_, i) => (saved.gregStock && saved.gregStock.fish && saved.gregStock.fish[i]) || 0), animals: C.ANIMALS.map((_, i) => (saved.gregStock && saved.gregStock.animals && saved.gregStock.animals[i]) || 0) },
        // Boutique d'engrais (chantier 2026-07, suite plan validé) : survit à
        // une reprise comme gregStock (le cycle de restock continue depuis
        // lastRestockDay, aucun rattrapage spécial nécessaire).
        fertilizerShop: { stock: (saved.fertilizerShop && saved.fertilizerShop.stock) || 0, lastRestockDay: (saved.fertilizerShop && saved.fertilizerShop.lastRestockDay) || 0 },
        wolves: [], wolfNight: { active: false, kills: 0 }, // repartent à zéro à la reprise, respawn dérivé de l'heure courante
        rabbits: [], // même principe : repartent à zéro, repop dérivé de l'heure courante (voir updateRabbits)
        rabbitChallenge: null, // défi éphémère, ne survit pas à une reprise (même principe que wolfNight)
        // Greg (chantier 2026-07) : contrat réel de 2 jours, DOIT survivre à
        // une reprise (contrairement aux loups/lapins) — sinon un rechargement
        // "rembourserait" gratuitement le temps de contrat restant. On ne
        // garde que s'il n'a pas déjà expiré depuis la dernière sauvegarde ;
        // la file de tâches en cours est purgée (redémarre en rôdaille, aucune
        // tâche perdue de façon visible car elle a été payée à la commande).
        // 2026-07 station update: ads/blacklist/relationships/residents
        // persist; a live visitor or unrepaired raid does NOT (transient,
        // like wolves) - migrateStation drops them on plain loads.
        station: E.migrateStation(saved.station),
        decor: E.migrateDecor(saved.decor), // zip 251: décorations posées (ferme + ville)
        crafts: E.migrateCrafts(saved.crafts), craftStock: E.migrateCraftStock(saved.craftStock), // zip 252
        greg: (saved.greg && saved.greg.expiresAt > Date.now())
          ? { ...saved.greg, taskQueue: [], phase: "roam", roamTarget: null, nextRoamAt: 0 } : null,
        // Soan (chantier 2026-07) : même principe que Greg ci-dessus — contrat
        // réel de 24h qui DOIT survivre à une reprise, mais repart en rôdaille
        // (pas en pleine pêche) au chargement, le trajet vers la rivière
        // n'ayant pas de sens à restaurer tel quel.
        soan: (saved.soan && saved.soan.expiresAt > Date.now())
          ? { ...saved.soan, phase: "roam", roamTarget: null, nextRoamAt: 0, riverSpot: null } : null,
        // Zip 260 : Harald (agent d'élevage) — même principe que Soan : contrat
        // 24h qui DOIT survivre à une reprise, repart en rôdaille. Le
        // rattrapage HORS-LIGNE (crédit des productions manquées au pool
        // commun) est fait juste après, via E.haraldCatchup.
        harald: (saved.harald && saved.harald.expiresAt > Date.now())
          ? { ...saved.harald, phase: "roam", roamTarget: null, nextRoamAt: 0, nextRoundAt: 0 } : null,
      };
      // Les cavaliers repartent à pied à la reprise (aucun joueur monté au chargement).
      for (const h of sharedRef.current.horses) { h.rider = null; h.rider2 = null; h.callTarget = null; }
      // Zip 260 : rattrapage hors-ligne de l'agent d'élevage (crédite au pool
      // commun les productions animales manquées pendant l'absence, plafonné).
      E.haraldCatchup(sharedRef.current, Date.now());
      farmersRef.current = saved.farmers || {};
      // Correctif 2026-07 ("le chaudron est toujours trouvable") : filet de
      // normalisation — si un chaudron est DÉJÀ posé quelque part sur la
      // ferme (O_CAULDRON dans le monde restauré), l'artéfact du monde
      // maléfique a forcément déjà été ramassé : on force le verrou
      // cauldronUnlocked, même pour une sauvegarde d'un zip antérieur où le
      // drapeau aurait pu manquer/se perdre. Sans ça, l'artéfact restait
      // visible et ramassable une seconde fois côté carte maléfique.
      {
        const objs = worldRef.current.objects;
        if (!sharedRef.current.salveCraft.cauldronUnlocked) {
          for (let i2 = 0; i2 < objs.length; i2++) if (objs[i2] === C.O_CAULDRON) { sharedRef.current.salveCraft.cauldronUnlocked = true; break; }
        }
      }
      // Une ferme peut avoir été sauvegardée par un zip plus ancien, avant
      // l'ajout des gemmes/poissons/productions/quêtes : on remet chaque
      // fermier au format actuel (sans rien perdre) pour éviter tout crash
      // silencieux côté hôte sur la première action qui touche un champ
      // manquant (voir normalizeFarmer dans fermeEngine.js).
      for (const id in farmersRef.current) E.normalizeFarmer(farmersRef.current[id]);
      // Même filet pour les animaux (schéma `hasProduct` -> `readyAt` en temps
      // réel depuis le zip 151, `hx`/`hy` depuis le zip 152, voir normalizeAnimals).
      E.normalizeAnimals(sharedRef.current.animals);
      // Personne ne porte un animal à la reprise (comme le cavalier ci-dessus).
      for (const a of sharedRef.current.animals) a.carriedBy = null;
    } else {
      const seed = hashSeed(code);
      worldRef.current = E.generateWorld(seed);
      for (const ci of E.clearStationArea(worldRef.current)) recordTileOverride(ci); // 2026-07 station update
      overridesRef.current = { ground: {}, object: {} };
      sharedRef.current = { seed, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), salveCraft: E.newSalveCraftState(), house: { level: 1, upgradeUntil: 0 }, evilMonsters: [], gems: C.GEMS.map(() => 0), flour: 0, gregStock: { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) }, fertilizerShop: { stock: 0, lastRestockDay: 0 }, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [], rabbitChallenge: null, greg: null, soan: null, harald: null, station: E.newStationState() };
      farmersRef.current = {};
      // Crée tout de suite l'enregistrement pour réserver le code.
      persistFarm();
    }
    minimapDirtyRef.current = true;
    restoredRef.current = true;
    // Filet identique à applySnapshot (non-hôte) : l'hôte est aussi un joueur
    // et doit retrouver SA PROPRE blessure en cours (injuredUntil) au rejoin,
    // faute de quoi il pouvait ressortir librement avant la fin du repos
    // forcé (bug remonté 2026-07 : seul le cas non-hôte était couvert).
    {
      const mineF = farmersRef.current[me.id];
      injuredUntilRef.current = (mineF && mineF.injuredUntil) || 0;
      setInjuredUntil(injuredUntilRef.current);
      hatUntilRef.current = (mineF && mineF.hatUntil) || 0;
      setHatUntil(hatUntilRef.current);
    }
    setCodeLoading(false);
    setHud(h => ({ ...h, money: sharedRef.current.money, day: sharedRef.current.day }));
    setCoop(sharedRef.current.coop);
    setBarn(sharedRef.current.barn);
    setSalveCraft(sharedRef.current.salveCraft);
    setHouse(sharedRef.current.house || { level: 1, upgradeUntil: 0 });
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
    setGregStock(sharedRef.current.gregStock || { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
    setFertilizerShop(sharedRef.current.fertilizerShop || { stock: 0, lastRestockDay: 0 });
    setRabbitChallenge(sharedRef.current.rabbitChallenge);
    syncBuildings();
    setWorldReady(true);
    setPhase("select"); // l'effet d'auto-spawn décidera de sauter cet écran
    onCodeLoaded && onCodeLoaded(code); // mémorise le code côté page.js pour les remontages suivants (instance cachée, rejoin)
    setTimeout(() => broadcastSnapshot(), 0);
  }

  // -------- Helpers --------
  const idxOf = (x, y) => y * C.MAP_W + x;
  const pushToast = useCallback((msg) => {
    const id = ++toastIdRef.current;
    setToasts(ts => [...ts, { id, msg }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3200);
  }, []);
  const addChat = useCallback((from, msg) => {
    const id = ++chatIdRef.current;
    setChat(cs => {
      const next = [...cs, { id, from, msg }];
      return next.length > 8 ? next.slice(next.length - 8) : next;
    });
    setTimeout(() => setChat(cs => cs.filter(x => x.id !== id)), 13000);
  }, []);

  // FIX 243: self:false supprime l'echo de ses propres broadcasts. Le chat en
  // dependait (l'expediteur voyait son message via l'echo). broadcastChat ajoute
  // donc le message EN LOCAL puis le diffuse -> l'expediteur le voit, les autres
  // le recoivent, sans doublon (pas d'echo avec self:false).
  function broadcastChat(from, msg) {
    addChat(from, msg);
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from, msg } });
  }

  function buildMinimapBase() {
    const w = worldRef.current; if (!w) return;
    const c = document.createElement("canvas"); c.width = w.w; c.height = w.h;
    const g = c.getContext("2d");
    const im = g.createImageData(w.w, w.h);
    for (let i = 0; i < w.w * w.h; i++) {
      const gr = w.ground[i], o = w.objects[i];
      let col = [89, 168, 74];
      if (gr === C.G_WATER) col = [58, 123, 200];
      else if (gr === C.G_SAND) col = [216, 192, 122];
      else if (gr === C.G_TILLED || gr === C.G_WATERED) col = [138, 92, 53];
      else if (gr === C.G_BRIDGE || gr === C.G_PATH || gr === C.G_PATH_STONE) col = [154, 107, 63];
      else if (gr === C.G_BRIDGE_SITE) col = [90, 110, 150];
      else if (gr === C.G_BRIDGE_CLOSED) col = [176, 74, 58];
      else if (gr === C.G_BRIDGE_STONE) col = [138, 138, 146];
      else if (gr === C.G_BRIDGE_STONE_CLOSED) col = [176, 74, 58];
      else if (gr === C.G_DARK_PASSAGE) col = [150, 90, 220]; // passage sombre repérable sur la carte (demande Guillaume 2026-07)
      if (o === C.O_TREE || o === C.O_TREE2) col = [46, 106, 40];
      else if (o === C.O_ROCK || o === C.O_WALL) col = [130, 130, 138];
      else if (o === C.O_LAMP) col = [230, 200, 100];
      else if (o === C.O_SCARECROW) col = [212, 178, 90];
      else if (o === C.O_LEVER) col = [80, 80, 88];
      else if (o === C.O_MILL) col = [169, 119, 63];
      else if (o === C.O_CAULDRON) col = [140, 90, 190];
      else if (o === C.O_HOUSE) col = [192, 74, 60];
      else if (o === C.O_SHOP || o === C.O_BIN) col = [232, 200, 90];
      im.data.set([col[0], col[1], col[2], 255], i * 4);
    }
    g.putImageData(im, 0, 0);
    minimapImgRef.current = c;
    minimapDirtyRef.current = false;
  }

  // Applique un instantané (snapshot) : régénère le monde depuis la seed puis
  // pose les overrides + l'état partagé. Utilisé par les non-hôtes et à la
  // reprise.
  function applySnapshot(payload) {
    const w = E.generateWorld(payload.seed);
    E.applyOverrides(w, { groundOv: payload.groundOv, objectOv: payload.objectOv, crops: payload.crops, mills: payload.mills });
    worldRef.current = w;
    overridesRef.current = { ground: { ...(payload.groundOv || {}) }, object: { ...(payload.objectOv || {}) } };
    sharedRef.current = {
      seed: payload.seed, money: payload.money, day: payload.day, dayStartAt: payload.dayStartAt, totalEarned: payload.totalEarned,
      horses: payload.horses || (payload.horse && payload.horse.owned ? [{ x: payload.horse.x, y: payload.horse.y, rider: null, rider2: null }] : []),
      animals: payload.animals || [], wellBuilt: !!payload.wellBuilt, coop: payload.coop || null,
      barn: payload.barn || E.newBarnState(),
      salveCraft: (() => {
        // Correctif audit 2026-07 : même relocalisation d'horloge que dans
        // applyDeltas (brewingUntil = timestamp hôte -> horloge locale).
        const sc = payload.salveCraft || E.newSalveCraftState();
        if (sc.brewingUntil > 0 && typeof payload.hostNow === "number") sc.brewingUntil = Date.now() + (sc.brewingUntil - payload.hostNow);
        return sc;
      })(),
      // Maison à niveaux (2026-07) : même relocalisation d'horloge que
      // salveCraft.brewingUntil pour l'horodatage de fin de travaux.
      house: (() => {
        const hh = (payload.house && payload.house.level) ? { level: payload.house.level, upgradeUntil: payload.house.upgradeUntil || 0 } : { level: 1, upgradeUntil: 0 };
        if (hh.upgradeUntil > 0 && typeof payload.hostNow === "number") hh.upgradeUntil = Date.now() + (hh.upgradeUntil - payload.hostNow);
        return hh;
      })(),
      evilMonsters: payload.evilMonsters || [], // créatures maléfiques partagées (2026-07)
      gems: migrateGems(payload),
      flour: payload.flour || 0,
      gregStock: { wood: (payload.gregStock && payload.gregStock.wood) || 0, stone: (payload.gregStock && payload.gregStock.stone) || 0, fertilizer: (payload.gregStock && payload.gregStock.fertilizer) || 0, fish: C.FISH.map((_, i) => (payload.gregStock && payload.gregStock.fish && payload.gregStock.fish[i]) || 0), animals: C.ANIMALS.map((_, i) => (payload.gregStock && payload.gregStock.animals && payload.gregStock.animals[i]) || 0) },
      fertilizerShop: { stock: (payload.fertilizerShop && payload.fertilizerShop.stock) || 0, lastRestockDay: (payload.fertilizerShop && payload.fertilizerShop.lastRestockDay) || 0 },
      wolves: payload.wolves || [], wolfNight: { active: !!(payload.wolves && payload.wolves.length), kills: 0 },
      rabbits: payload.rabbits || [], rabbitChallenge: payload.rabbitChallenge || null,
      greg: payload.greg || null,
      soan: payload.soan || null,
      harald: payload.harald || null, // zip 260
      // 2026-07 station update: mid-session snapshot keeps the live visitor,
      // with host-clock timestamps relocated (same discipline as house).
      station: E.migrateStation(payload.station, payload.hostNow),
      decor: E.migrateDecor(payload.decor), // zip 251
      crafts: E.migrateCrafts(payload.crafts), craftStock: E.migrateCraftStock(payload.craftStock), // zip 252
    };
    setStationSt(sharedRef.current.station ? JSON.parse(JSON.stringify(sharedRef.current.station)) : null);
    if (payload.farmers) {
      farmersRef.current = payload.farmers;
      // Même filet de sécurité qu'au chargement par code (voir loadFarmByCode) :
      // un instantané peut porter des fermiers au format d'un zip antérieur.
      for (const id in farmersRef.current) E.normalizeFarmer(farmersRef.current[id]);
      // Un joueur distant déjà blessé au moment où je rejoins (pas seulement
      // au moment où il se fait mordre) doit rester repérable comme tel, pour
      // que je puisse le soigner (voir applyDeltas / p.injured).
      for (const id in farmersRef.current) {
        const rp = playersRef.current.get(id);
        if (rp) { rp.injuredUntil = farmersRef.current[id].injuredUntil || 0; rp.hatUntil = farmersRef.current[id].hatUntil || 0; }
      }
    }
    E.normalizeAnimals(sharedRef.current.animals);
    // Mon propre fermier (reprise) si présent
    const mine = payload.farmers && payload.farmers[me.id];
    if (mine) {
      invRef.current = mine.inv; toolsRef.current = mine.tools; energyRef.current = mine.energy;
      setMyInv(mine.inv); setMyTools(mine.tools); setMyEnergy(mine.energy); if (mine.quests) setMyQuests(mine.quests);
      setMyPets(Array.isArray(mine.pets) ? mine.pets : []); // zip 236
      // Blessure (morsure de loup) : survit à un rechargement, restaurée depuis
      // l'état persistant du fermier (voir farmer.injuredUntil / INJURED_MS).
      injuredUntilRef.current = mine.injuredUntil || 0; setInjuredUntil(injuredUntilRef.current);
      hatUntilRef.current = mine.hatUntil || 0; setHatUntil(hatUntilRef.current);
    }
    minimapDirtyRef.current = true;
    setHud(h => ({ ...h, money: payload.money, day: payload.day }));
    setCoop(sharedRef.current.coop);
    setBarn(sharedRef.current.barn);
    setSalveCraft(sharedRef.current.salveCraft);
    setHouse(sharedRef.current.house || { level: 1, upgradeUntil: 0 });
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
    setGregStock(sharedRef.current.gregStock || { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
    setFertilizerShop(sharedRef.current.fertilizerShop || { stock: 0, lastRestockDay: 0 });
    setRabbitChallenge(sharedRef.current.rabbitChallenge);
    syncBuildings();
    // Correctif audit lancement 2026-07 (succession d'hôte) : mémorise le
    // code de la ferme reçu avec l'instantané. Sans lui, un invité promu
    // hôte (claimAbandonedHost) simulait le monde mais persistFarm() ne
    // faisait plus JAMAIS rien (farmCodeRef vide) — perte de progression
    // totalement silencieuse à la fermeture de la session. On ne remplace
    // jamais un code déjà connu (l'hôte d'origine garde le sien), et on le
    // remonte à page.js (onCodeLoaded) pour les remontages d'instance.
    if (payload.farmCode && !farmCodeRef.current) {
      farmCodeRef.current = payload.farmCode;
      onCodeLoaded && onCodeLoaded(payload.farmCode);
    }
    setHostPreparing(false);
    setWorldReady(true);
  }

  // -------- Réseau : canal, souscription, évènements --------
  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: false } } });  // FIX 243: self:false (-33% a 2j, -25% a 3j), echo local du chat assure par broadcastChat()
    channelRef.current = ch;

    ch.on("broadcast", { event: "hello", }, ({ payload }) => {
      if (!isHost) return;
      // Correctif audit lancement 2026-07 : pas encore de monde (l'hôte est
      // toujours sur l'écran code) -> on répond `nofarm` au lieu de laisser
      // l'invité sur un "Connexion…" muet et sans fin (voir écran select).
      if (!worldRef.current) { ch.send({ type: "broadcast", event: "nofarm", payload: {} }); return; }
      // Throttle léger : plusieurs invités relancent `hello` toutes les
      // 1,2 s — inutile de construire/envoyer plusieurs instantanés complets
      // dans la même demi-seconde (ils se valent tous ; le demandeur écarté
      // retentera de lui-même 1,2 s plus tard).
      const nowMs = Date.now();
      if (nowMs - lastSnapSentRef.current < 500) return;
      lastSnapSentRef.current = nowMs;
      // Un joueur demande l'instantané : l'hôte le renvoie, ADRESSÉ à ce
      // joueur (payload.to) — les clients déjà en jeu l'ignorent (voir le
      // handler `snapshot` ci-dessous) : fini le monde intégralement
      // régénéré chez TOUS les invités à chaque arrivée/retry d'un seul.
      broadcastSnapshot(payload && payload.id);
    });
    ch.on("broadcast", { event: "nofarm" }, () => {
      // Réponse de l'hôte à un `hello` prématuré (voir ci-dessus) : message
      // d'attente explicite chez l'invité, effacé dès qu'un snapshot arrive.
      if (!isHost && !worldReadyRef.current) setHostPreparing(true);
    });
    ch.on("broadcast", { event: "snapshot" }, ({ payload }) => {
      // L'hôte ignore l'écho de son propre snapshot (il a déjà le monde).
      if (isHost && worldRef.current) return;
      // Correctif audit lancement 2026-07 : un snapshot ADRESSÉ à un autre
      // joueur (réponse à SON hello) ne concerne pas un client dont le monde
      // est déjà prêt — l'appliquer quand même régénérait tout le monde
      // (micro-freeze) et pouvait faire reculer l'état visible. Un snapshot
      // NON adressé (diffusion générale de l'hôte à son (re)montage) reste
      // appliqué par tous : c'est un point de resynchronisation volontaire.
      if (worldReadyRef.current && payload && payload.to && payload.to !== me.id) return;
      applySnapshot(payload);
    });
    ch.on("broadcast", { event: "join" }, ({ payload }) => {
      if (isHost) {
        // Mémorise le personnage choisi (nom/genre/tenue) dans le fermier,
        // pour l'entrée directe la prochaine fois.
        const f = hostEnsureFarmer(payload.id, payload.name, payload.gender, payload.outfit);
        f.name = payload.name; f.gender = payload.gender; f.outfit = payload.outfit;
        dirtyRef.current = true;
      }
      if (payload.id !== me.id) {
        ensureRemote(payload);
        addChat("🌱", L.chatJoin(payload.name));
        sendPos(); // FIX 241: la position n'étant plus diffusée en continu, on l'annonce à l'arrivée d'un joueur
      }
      setHud(h => ({ ...h, players: playersRef.current.size + 1 }));
    });
    ch.on("broadcast", { event: "leave" }, ({ payload }) => {
      if (payload.id === me.id) return;
      const r = playersRef.current.get(payload.id);
      playersRef.current.delete(payload.id);
      petFollowRef.current.delete(payload.id); // zip 247: libère l'état de suivi des pets du partant
      if (r) addChat("👋", L.chatLeave(r.name));
      setHud(h => ({ ...h, players: playersRef.current.size + 1 }));
      // Un animal porté par un joueur qui quitte est relâché sur place, pour
      // ne jamais rester "coincé" en main de personne.
      if (isHost) {
        let changed = false;
        for (const a of (sharedRef.current.animals || [])) if (a.carriedBy === payload.id) { a.carriedBy = null; changed = true; }
        if (changed) dirtyRef.current = true;
      }
    });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      if (isHost && farmersRef.current[payload.id]) { farmersRef.current[payload.id].x = payload.x; farmersRef.current[payload.id].y = payload.y; }
      if (payload.id === me.id) return;
      ensureRemote(payload);
      const r = playersRef.current.get(payload.id);
      // FIX 243: vitesse estimee par delta de position entre 2 paquets (base de l'extrapolation cote rendu).
      const _now = performance.now();
      const _prevX = r.px0 !== undefined ? r.px0 : payload.x, _prevY = r.py0 !== undefined ? r.py0 : payload.y;
      const _dtr = r.tRecv !== undefined ? Math.max(0.03, (_now - r.tRecv) / 1000) : 0;
      if (payload.moving && _dtr > 0) { r.vx = (payload.x - _prevX) / _dtr; r.vy = (payload.y - _prevY) / _dtr; const _sp = Math.hypot(r.vx, r.vy), _mx = C.PLAYER_SPEED * C.POS_EXTRAP_SPEED_CAP; if (_sp > _mx) { r.vx *= _mx / _sp; r.vy *= _mx / _sp; } }
      else { r.vx = 0; r.vy = 0; }
      r.px0 = payload.x; r.py0 = payload.y; r.tRecv = _now;
      r.tx = payload.x; r.ty = payload.y; r.dir = payload.dir; r.moving = payload.moving; r.tool = payload.tool;
      r.gender = payload.gender; r.outfit = payload.outfit; r.name = payload.name; r.sleeping = !!payload.sleeping;
      r.torch = !!payload.torch; r.zone = payload.zone || "farm";
      if (Array.isArray(payload.pets)) r.pets = payload.pets; // zip 247: pets are now broadcast so everyone sees everyone's pets
      // Monde maléfique multijoueur (2026-07) : cible d'interpolation sur la
      // carte maléfique + drapeau d'immunité (lu par la simulation hôte).
      if (r.zone === "evil" && payload.ex !== undefined) {
        r.etx = payload.ex; r.ety = payload.ey;
        if (r.ex === undefined) { r.ex = payload.ex; r.ey = payload.ey; }
        r.emoving = !!payload.emoving; r.immune = !!payload.immune;
      } else { r.ex = r.ey = r.etx = r.ety = undefined; r.emoving = false; r.immune = false; }
    });
    ch.on("broadcast", { event: "req" }, ({ payload }) => { if (isHost) hostHandleReq(payload); });
    ch.on("broadcast", { event: "apply" }, ({ payload }) => applyDeltas(payload));
    ch.on("broadcast", { event: "newday" }, ({ payload }) => applyNewDay(payload));
    ch.on("broadcast", { event: "chat" }, ({ payload }) => addChat(payload.from, payload.msg));
    // Zip 235: town façade style broadcast — everyone sees each other's
    // choice without any host arbitration (client-only preference).
    ch.on("broadcast", { event: "facadeStyle" }, ({ payload }) => {
      if (!payload || !payload.id) return;
      facadeStylesRef.current = { ...facadeStylesRef.current, [payload.id]: payload.style | 0 };
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED") return;
      channelReadyRef.current = true;
      // Zip 250 (demande Guillaume) : restaure la préférence de style de maison
      // (Valley Town) enregistrée en localStorage et la (re)diffuse pour que
      // tout le monde voie ta façade choisie dès la connexion.
      try {
        const savedFacade = window.localStorage.getItem("ferme_town_facade");
        if (savedFacade !== null) {
          const st2 = ((savedFacade | 0) % C.TOWN_HOUSE_STYLES + C.TOWN_HOUSE_STYLES) % C.TOWN_HOUSE_STYLES;
          facadeStylesRef.current = { ...facadeStylesRef.current, [me.id]: st2 };
          ch.send({ type: "broadcast", event: "facadeStyle", payload: { id: me.id, style: st2 } });
        }
      } catch (e2) { /* localStorage indispo */ }
      if (isHost) {
        // Le monde est déjà généré par l'effet de montage ci-dessus ; on
        // diffuse juste un instantané pour tout invité déjà en attente.
        setTimeout(() => broadcastSnapshot(), 0);
      } else {
        ch.send({ type: "broadcast", event: "hello", payload: { id: me.id } });
      }
    });

    return () => {
      if (joinedRef.current) ch.send({ type: "broadcast", event: "leave", payload: { id: me.id } });
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // FIX 241: pause réseau quand l'onglet du jeu n'est plus affiché (autre
  // onglet/app au premier plan, fenêtre minimisée, ou sur TABLETTE écran
  // verrouillé / app changée). netCanBroadcast() lit hiddenRef -> plus aucun
  // message émis tant que le jeu n'est pas visible ; reprise immédiate au retour.
  useEffect(() => {
    const onVis = () => { hiddenRef.current = document.hidden; if (!document.hidden && channelReadyRef.current) sendPos(); };
    document.addEventListener('visibilitychange', onVis);
    hiddenRef.current = document.hidden;
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  function ensureRemote(p) {
    if (p.id === me.id) return;
    if (!playersRef.current.has(p.id)) {
      playersRef.current.set(p.id, { id: p.id, name: p.name, gender: p.gender || "m", outfit: p.outfit || 0, x: p.x ?? C.SPAWN.x, y: p.y ?? C.SPAWN.y, tx: p.x ?? C.SPAWN.x, ty: p.y ?? C.SPAWN.y, dir: p.dir || 0, moving: false, tool: 0, animT: 0, sleeping: false, torch: false, hatUntil: (farmersRef.current[p.id] && farmersRef.current[p.id].hatUntil) || 0, pets: (p.pets) || (farmersRef.current[p.id] && farmersRef.current[p.id].pets) || [], zone: "farm" });
    }
  }

  // -------- Hôte : construction de l'instantané + persistance --------
  function currentSnapshot() {
    const s = sharedRef.current;
    return {
      seed: s.seed, money: s.money, day: s.day, dayStartAt: s.dayStartAt, totalEarned: s.totalEarned,
      groundOv: overridesRef.current.ground, objectOv: overridesRef.current.object,
      crops: worldRef.current ? E.serializeCrops(worldRef.current) : [],
      mills: worldRef.current ? E.serializeMills(worldRef.current) : [],
      farmers: farmersRef.current,
      horses: s.horses, animals: s.animals, wellBuilt: s.wellBuilt, coop: s.coop, barn: s.barn, salveCraft: s.salveCraft, house: s.house, evilMonsters: s.evilMonsters, gems: s.gems, flour: s.flour, gregStock: s.gregStock, fertilizerShop: s.fertilizerShop, wolves: s.wolves, greg: s.greg, soan: s.soan, harald: s.harald,
      rabbits: s.rabbits, rabbitChallenge: s.rabbitChallenge,
      station: s.station, // 2026-07 station update
      decor: s.decor, // zip 251: décorations posées (ferme + Valley Town), persistées
      crafts: s.crafts, craftStock: s.craftStock, // zip 252: ateliers artisans + stock de produits
      hostNow: Date.now(), // correctif audit 2026-07 : relocalisation d'horloge (voir salveCraft.brewingUntil)
      // Correctif audit lancement 2026-07 (succession d'hôte) : le code de la
      // ferme voyage avec l'instantané, pour qu'un invité promu hôte
      // (claimAbandonedHost) puisse continuer à SAUVEGARDER — voir
      // applySnapshot, qui le range dans farmCodeRef.
      farmCode: farmCodeRef.current || null,
    };
  }
  function syncBuildings() {
    const s = sharedRef.current;
    const hs = s.horses || [];
    setBuildings({ horseCount: hs.length, wellBuilt: !!s.wellBuilt, animalCount: (s.animals || []).length });
    setOnHorse(hs.some(h => h.rider === me.id || h.rider2 === me.id));
  }
  function broadcastSnapshot(toId) {
    if (!worldRef.current) return;
    // `to` (correctif audit lancement 2026-07) : renseigné quand le snapshot
    // répond au `hello` d'UN joueur précis — les clients déjà en jeu
    // l'ignorent alors (voir le handler `snapshot`). null = diffusion
    // générale (montage/chargement hôte), appliquée par tous.
    channelRef.current?.send({ type: "broadcast", event: "snapshot", payload: { ...currentSnapshot(), to: toId || null } });
  }
  function hostEnsureFarmer(id, name, gender, outfit) {
    // Filet de sécurité systématique (même pour un fermier déjà existant) :
    // couvre le cas d'une ferme restaurée par un chemin qui n'aurait pas
    // encore été normalisé (ex. ancien apply reçu en cache, etc.).
    if (farmersRef.current[id]) return E.normalizeFarmer(farmersRef.current[id]);
    const f = E.newFarmer(id, name, gender || "m", outfit | 0);
    farmersRef.current[id] = f;
    dirtyRef.current = true;
    // Renvoie l'état privé de départ au nouveau venu.
    hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id, energy: f.energy, tools: f.tools, inv: f.inv } } });
    return f;
  }
  // Sauvegarde DURABLE de la ferme dans la table ferme_saves (indexée par le
  // code). Remplace l'ancien rooms.game_state éphémère : survit au retour au
  // salon et se recharge par le même code, sur des semaines.
  async function persistFarm() {
    if (!isHost || !farmCodeRef.current || !worldRef.current) return;
    // Le cache mémoire est posé AVANT l'écriture réseau (et même si elle
    // échoue) : c'est lui qui protège les bascules d'instance dans l'onglet
    // (voir hostFarmMemCache en tête de fichier).
    const snap = currentSnapshot();
    hostFarmMemCache = { code: farmCodeRef.current, state: snap, at: Date.now() };
    try {
      await supabase.from("ferme_saves").upsert(
        { code: farmCodeRef.current, state: snap, updated_at: new Date().toISOString() },
        { onConflict: "code" }
      );
    } catch (e) {
      console.error("[FERME] Sauvegarde impossible (table ferme_saves absente ? exécute supabase/upgrade-005.sql).", e);
    }
  }
  // Toujours la DERNIÈRE version de persistFarm (props et state frais) pour
  // les filets ci-dessous, qui vivent dans des effets à deps vides et ne
  // verraient sinon que la closure du tout premier rendu.
  useEffect(() => { persistFnRef.current = persistFarm; });
  // Filets anti-perte de sauvegarde (correctif audit lancement 2026-07) :
  // 1. au DÉMONTAGE de l'instance (bouton Quitter, bascule vers l'instance
  //    cachée, "Rejoindre la ferme", "Terminer la partie") — avant, tout ce
  //    qui était "dirty" depuis moins de 3 s (période du saveTimer) était
  //    perdu, et l'instance suivante rechargeait donc depuis ferme_saves un
  //    état en léger retour arrière, répercuté aux invités par snapshot ;
  // 2. à pagehide / onglet masqué — meilleure chance d'écrire avant une
  //    fermeture d'onglet ou une mise en veille (best effort : la requête
  //    peut être coupée en route, mais on ne perd jamais PLUS qu'avant).
  // flush() ne fait rien si rien n'a changé (dirtyRef), et persistFarm
  // elle-même ne fait rien côté invité (isHost + farmCode + monde requis).
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      persistFnRef.current && persistFnRef.current();
    };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush(); // démontage : dernier point de sauvegarde de CETTE instance
    };
  }, []);
  // Point de contrôle à la promotion d'hôte (succession, correctif audit
  // lancement 2026-07) : dès que CE client devient hôte d'un monde prêt dont
  // il connaît le code (reçu via le snapshot, voir applySnapshot), il écrit
  // immédiatement une sauvegarde-témoin, sans attendre qu'une action rende
  // l'état "dirty" — la ferme est ainsi couverte même si plus personne ne
  // touche à rien après la disparition de l'hôte d'origine. Pour l'hôte
  // normal, ça ne fait qu'un point de sauvegarde de plus au chargement.
  useEffect(() => {
    if (isHost && worldReady && farmCodeRef.current) persistFnRef.current && persistFnRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, worldReady]);

  // Enregistre les tuiles changées dans les overrides de persistance.
  function recordTileOverride(i) {
    const w = worldRef.current;
    overridesRef.current.ground[i] = w.ground[i];
    const o = w.objects[i];
    if (o === C.O_NONE) overridesRef.current.object[i] = [C.O_NONE, 0];
    else overridesRef.current.object[i] = [o, w.objHp.get(i) || 0];
    dirtyRef.current = true;
  }

  // -------- Hôte : traitement d'une requête d'action --------
  // Filet de sécurité : toute la logique est enveloppée dans un try/catch.
  // Sans lui, une exception (schéma de fermier inattendu, etc.) interrompait
  // silencieusement la fonction AVANT le channelRef.current.send(apply) final :
  // aucune mise à jour (inventaire, tuiles, quêtes...) n'était alors diffusée,
  // et rien ne le signalait au joueur (symptôme observé : pêche qui ne
  // remplit jamais l'inventaire, quêtes qui ne se cochent jamais). Même si
  // normalizeFarmer() corrige la cause connue, ce filet évite qu'un futur
  // changement de schéma reproduise le même échec totalement silencieux.
  // FIX 246b : avec self:false (zip 243), l'hôte ne reçoit PAS l'écho de ses
  // propres broadcasts. Ses actions (achat, vente, ramassage d'œufs...) étaient
  // donc bien APPLIQUÉES en autorité (or/inventaire réels modifiés) mais ne
  // s'AFFICHAIENT jamais chez lui : setHud/setMyInv/pushToast/spawnFx se font
  // dans applyDeltas, uniquement à la RÉCEPTION d'un apply. L'hôte s'applique
  // donc désormais son propre diff localement (comme le faisait l'écho self:true
  // d'avant 243). Les entités qu'il simule (evilMonsters/station/visitorSim)
  // sont protégées par les gardes !isHost dans applyDeltas -> pas de double
  // application nuisible ; le reste (tiles/crops/animals...) est idempotent.
  function hostSend(msg) {
    channelRef.current?.send(msg);
    if (isHost && msg && msg.event === "apply") applyDeltas(msg.payload);
  }
  function hostHandleReq(req) {
    try { hostHandleReqUnsafe(req); }
    catch (e) {
      console.error("[FERME] hostHandleReq: échec de traitement, action ignorée.", req, e);
      hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "actionFailed" } } });
    }
  }
  function hostHandleReqUnsafe(req) {
    const w = worldRef.current; if (!w) return;
    const f = hostEnsureFarmer(req.id, req.name);
    if (typeof req.px === "number") { f.x = req.px; f.y = req.py; }
    const s = sharedRef.current;
    const out = { tiles: [], crops: [], mills: null, fx: [], state: null, farmer: null, toast: null, chat: null, horses: null, animals: null, wellBuilt: false, coop: undefined, barn: undefined, salveCraft: undefined, house: undefined };
    let questId = null; // action réussie -> quête à valider éventuellement
    const px = typeof req.px === "number" ? req.px : f.x, py = typeof req.py === "number" ? req.py : f.y;

    // 2026-07 station update: station/visitor/repair requests are resolved in
    // a dedicated handler (returns true when the request was consumed).
    if (hostHandleStationReq(req, f)) return;
    if (hostHandleDecorReq(req, f)) return; // zip 251: pose/déplacement/rangement (outil main)
    if (hostHandleArtisanReq(req, f)) return; // zip 252: recrutement / ateliers / vente produits craft

    if (req.kind === "wolfBiteResult") {
      // Dénouement du mini-jeu de morsure (chantier 2026-07) : n'affecte que
      // le loup concerné, encore en attente ("biting") et visant bien CE
      // fermier — ignore toute requête tardive/rejouée après résolution.
      const s2 = sharedRef.current;
      const wf = (s2.wolves || []).find(x => x.id === req.wolfId && x.phase === "biting" && x.biteTargetId === req.id);
      if (wf) resolveWolfBiteOutcome(wf, req.result === "win" ? "win" : "fail");
    } else if (req.kind === "heal") {
      // Soin d'un autre joueur blessé (trousse de soins, chantier 2026-07,
      // demande : réduire le repos forcé à 1 minute au lieu de 10). f = le
      // soignant (déjà résolu ci-dessus via hostEnsureFarmer). Vérifs :
      // trousse en stock, cible bien blessée à l'instant présent, et à
      // portée (position cible tenue à jour par les broadcasts "pos", voir
      // plus haut ch.on("pos") -> farmersRef.current[payload.id].x/y).
      const target = req.targetId ? E.normalizeFarmer(farmersRef.current[req.targetId]) : null;
      if (!target || !(target.injuredUntil > Date.now())) {
        out.toast = { id: f.id, key: "notInjured" };
      } else if (!((f.inv.healKit || 0) > 0)) {
        out.toast = { id: f.id, key: "noHealKit" };
      } else if (Math.hypot(target.x - f.x, target.y - f.y) > C.HEAL_RANGE) {
        out.toast = { id: f.id, key: "healTooFar" };
      } else {
        f.inv.healKit -= 1;
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        if (target.injuryKind === "evil") {
          // Blessure de créature maléfique (décision Guillaume 2026-07) :
          // CHAQUE pansement retire un tiers de la blessure de 30 min
          // (C.EVIL_HEAL_STEP_MS = 10 min) — il en faut donc jusqu'à 3,
          // appliqués par un ou plusieurs coéquipiers, pour sauver
          // complètement le blessé (mécanique habituelle sinon : il reste
          // téléporté devant la maison, immobilisé jusqu'à la fin).
          target.injuredUntil -= C.EVIL_HEAL_STEP_MS;
          if (target.injuredUntil - Date.now() <= 1000) { target.injuredUntil = Date.now(); target.injuryKind = null; }
        } else {
          const reduced = Date.now() + C.HEAL_REDUCE_MS;
          if (target.injuredUntil > reduced) target.injuredUntil = reduced;
        }
        dirtyRef.current = true;
        hostSend({
          type: "broadcast", event: "apply",
          payload: {
            farmer: { id: target.id, energy: target.energy, tools: target.tools, inv: target.inv, injuredUntil: target.injuredUntil },
            injured: { id: target.id, until: target.injuredUntil },
          },
        });
        const remainMn = Math.ceil(Math.max(0, target.injuredUntil - Date.now()) / 60000);
        broadcastChat("💊", remainMn > 1 ? L.healPartialChat(f.name, target.name, remainMn) : L.healChat(f.name, target.name));
      }
    } else if (req.kind === "evilChop") {
      // Coupe d'arbre en carte maléfique (chantier 2026-07, demande
      // Guillaume) : contrairement à req.kind==="act", ne touche JAMAIS
      // worldRef (la carte maléfique n'existe pas côté hôte, voir
      // doActionEvil/FermeGame.js) — seul le bois gagné, déjà calculé et
      // plafonné côté client via E.toolYield, est crédité ici.
      const wood = Math.max(0, Math.min(50, req.wood | 0));
      if (wood > 0) {
        f.inv.wood += wood;
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        dirtyRef.current = true;
      }
    } else if (req.kind === "evilMine") {
      // Minage de rocher en carte maléfique (chantier 2026-07, demande
      // Guillaume : "les roches là-bas contiennent de la pierre mais aussi
      // des minerais magiques") : même esprit que "evilChop" — la carte
      // maléfique n'existe pas côté hôte, la pierre et le minerai gagnés
      // sont déjà calculés/plafonnés côté client (doActionEvil) et
      // simplement crédités ici.
      const stone = Math.max(0, Math.min(50, req.stone | 0));
      const ore = Math.max(0, Math.min(10, req.ore | 0));
      if (stone > 0 || ore > 0) {
        f.inv.stone += stone;
        f.inv.magicOre = (f.inv.magicOre || 0) + ore;
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        dirtyRef.current = true;
      }
    } else if (req.kind === "evilCaught") {
      // Créature maléfique (chantier 2026-07, demande Guillaume) : même
      // esprit que "evilChop" — la carte maléfique n'existe pas côté hôte,
      // tout est déjà résolu côté client (caughtByMonster/updateEvilMonsters,
      // FermeGame.js). On se contente de persister/diffuser la blessure,
      // comme pour une morsure de loup ratée (resolveWolfBiteOutcome), avec
      // la durée dédiée C.EVIL_INJURED_MS (30 min) au lieu de C.INJURED_MS.
      // Reprend TEL QUEL l'horodatage envoyé (déjà appliqué en optimiste
      // côté client) plutôt que de le recalculer : sinon la moindre
      // différence ferait retéléporter le fermier une seconde fois via
      // applyDeltas pendant qu'il est encore visuellement en zone maléfique
      // (voir commentaire de caughtByMonster). Bornée uniquement pour
      // écarter une valeur aberrante d'un client non fiable.
      const now = Date.now();
      const until = (typeof req.until === "number" && req.until > now && req.until <= now + C.EVIL_INJURED_MS + 5000) ? req.until : now + C.EVIL_INJURED_MS;
      f.injuredUntil = until;
      f.injuryKind = "evil"; // décision Guillaume 2026-07 : soignable par 3 pansements (voir req "heal")
      dirtyRef.current = true;
      hostSend({
        type: "broadcast", event: "apply",
        payload: { injured: { id: f.id, until: f.injuredUntil } },
      });
    } else if (req.kind === "drown") {
      // Noyade (décision Guillaume 2026-07 : descendre du cheval en pleine
      // eau -> retour à la maison + blessure d'UNE minute). Même mécanique
      // de confiance qu'"evilCaught" ci-dessus : l'horodatage déjà appliqué
      // en optimiste côté client est repris tel quel (borné contre les
      // valeurs aberrantes), la téléportation est locale au client (elle
      // arrive à l'hôte par ses messages de position habituels).
      const nowD = Date.now();
      const untilD = (typeof req.until === "number" && req.until > nowD && req.until <= nowD + C.DROWN_INJURED_MS + 5000) ? req.until : nowD + C.DROWN_INJURED_MS;
      f.injuredUntil = untilD;
      f.injuryKind = "drown";
      dirtyRef.current = true;
      hostSend({
        type: "broadcast", event: "apply",
        payload: { injured: { id: f.id, until: f.injuredUntil } },
      });
    } else if (req.kind === "evilBiteResult") {
      // Dénouement du mini-jeu de morsure d'une créature PARTAGÉE (2026-07) :
      // "win" = repoussée, elle fuit un moment (visible par tous) ; "fail" =
      // la blessure et le retour maison arrivent séparément par la req
      // "evilCaught" du même client (mécanique habituelle).
      const moB = (s.evilMonsters || []).find(x => x.id === req.monsterId);
      if (moB) {
        const tId = moB.biteTargetId; // qui vient de gagner/perdre (fixé par updateSharedEvilMonsters)
        moB.biteTargetId = null; moB.biteDeadline = 0;
        if (req.result === "win") {
          moB.chasing = false;
          const now = Date.now();
          // Compteur de victoires PAR JOUEUR sur CETTE créature (chantier
          // 2026-07, demande Guillaume, symétrique des loups) : à la
          // C.EVIL_MONSTER_KILL_WINS-ième victoire d'un même joueur, elle meurt.
          if (tId) { moB.biteWins = moB.biteWins || {}; moB.biteWins[tId] = (moB.biteWins[tId] || 0) + 1; }
          const wins = tId ? moB.biteWins[tId] : 0;
          if (tId && wins >= C.EVIL_MONSTER_KILL_WINS) {
            moB.dead = true; moB.deadUntil = now + C.EVIL_MONSTER_DEATH_ANIM_MS;
            moB.chasing = false; moB.fleeing = false; moB.biteWins = {};
            const nm = (playersRef.current.get(tId) || (meRef.current?.id === tId ? meRef.current : null) || {}).name || "?";
            addChat("🗡️", L.evilKilledChat(nm));
          } else {
            moB.biteFleeUntil = now + C.EVIL_MONSTER_FLEE_MS;
            // Grâce : la créature ignore ce joueur (comme immunisé) le temps de
            // C.EVIL_MONSTER_BITE_GRACE_MS, brisant la boucle de re-morsure.
            if (tId) { moB.biteGrace = moB.biteGrace || {}; moB.biteGrace[tId] = now + C.EVIL_MONSTER_BITE_GRACE_MS; }
          }
        }
        hostSend({ type: "broadcast", event: "apply", payload: { evilMonsters: s.evilMonsters } });
      }
    } else if (req.kind === "useSalve") {
      // Pommade de protection (chantier 2026-07, demande Guillaume) : même
      // esprit que "evilChop"/"evilCaught" — l'effet (immunité/répulsion 10
      // min) est déjà appliqué en optimiste côté client (voir useSalve,
      // FermeGame.js), l'hôte se contente ici de décompter le stock, seul
      // autorité sur l'inventaire (persistance/diffusion aux autres joueurs
      // après un refresh).
      const r = E.resolveUseSalve(f);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
    } else if (req.kind === "act") {
      const r = E.resolveAct(w, f, req);
      for (const i of r.tiles) { recordTileOverride(i); out.tiles.push({ i, g: w.ground[i], o: w.objects[i], hp: w.objHp.get(i) }); }
      for (const i of r.cropTiles) { const c = w.crops.get(i); out.crops.push({ i, c: c ? { t: c.t, bankedMs: c.bankedMs, wateredAt: c.wateredAt } : null }); }
      out.fx = r.fx;
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.did) questId = r.did;
      // Gemme trouvée : va dans le pool COMMUN à la salle (chantier 2026-07),
      // pas dans l'inventaire privé du fermier (voir resolveAct/"mine").
      if (typeof r.gemFound === "number") {
        s.gems[r.gemFound] = (s.gems[r.gemFound] || 0) + 1;
        out.gems = s.gems;
      }
      // Moulin (chantier 2026-07) : dépôt de blé -> remonte le nouveau stock
      // de la/des tuile(s) de moulin touchée(s) à tout le monde (même
      // mécanique que out.crops ci-dessus, sur w.mills).
      if (r.millTiles && r.millTiles.length) {
        out.mills = r.millTiles.map(i => { const ms = w.mills.get(i) || { wheat: 0, nextAt: 0 }; return [i, ms.wheat, ms.nextAt]; });
      }
    } else if (req.kind === "buy") {
      const r = E.resolveBuy(f, s.money, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; out.state = shareState(); }
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.chat) out.chat = { from: r.chat.from, msg: L.chatToolUp(toolName(r.chat.tool), r.chat.lvl) };
    } else if (req.kind === "sell" && req.item === "gem") {
      // Vente d'une gemme du pool COMMUN (chantier 2026-07) : pas de
      // vérification de proximité au bac ici (les gemmes sont partagées et
      // vendables aussi bien au bac que depuis le menu Construire/Vendre,
      // demande Guillaume), contrairement aux autres ventes.
      const r = E.resolveSellGem(s.gems, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.gemsChanged) out.gems = s.gems;
      if (r.gain > 0) { out.fx.push({ k: "sell", x: px, y: py, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "sell" && req.item === "flour") {
      // Vente de sacs de farine du pool COMMUN (chantier 2026-07), même
      // principe que la vente de gemmes juste au-dessus.
      const r = E.resolveSellFlour(s, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.flourChanged) out.flour = s.flour;
      if (r.gain > 0) { out.fx.push({ k: "sell", x: px, y: py, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "sell" && req.item === "commonFish") {
      // Vente d'un poisson pêché par Soan, pool COMMUN (chantier 2026-07,
      // demande Guillaume : "le poisson est direct notre propriété et on
      // peut aller le vendre") — même principe que la vente de gemmes/farine
      // juste au-dessus.
      const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
      const r = E.resolveSellCommonFish(stock, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.stockChanged) out.gregStock = stock;
      if (r.gain > 0) { out.fx.push({ k: "sell", x: px, y: py, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "sell" && req.item === "commonAnimal") {
      // Zip 260 : vente d'une production animale du POOL COMMUN ramassé par
      // Harald (œuf/lait/laine/truffe), même principe que "commonFish".
      const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
      const r = E.resolveSellCommonAnimal(stock, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.stockChanged) out.gregStock = stock;
      if (r.gain > 0) { out.fx.push({ k: "sell", x: px, y: py, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "sell") {
      const r = E.resolveSell(f, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.gain > 0) { out.fx.push({ k: "sell", x: C.BIN.x, y: C.BIN.y, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "craft") {
      const r = E.resolveCraft(f, req);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
    } else if (req.kind === "eat") {
      const r = E.resolveEat(f);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.fx) out.fx.push(r.fx);
    } else if (req.kind === "sleepStart") {
      const r = E.resolveSleepStart(f, Date.now());
      if (r.reason) out.toast = { id: f.id, key: r.reason };
    } else if (req.kind === "sleepEnd") {
      const r = E.resolveSleepEnd(f, Date.now());
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
    } else if (req.kind === "buyHorse") {
      // Plusieurs chevaux achetables (demande 2026-07) : coût croissant
      // (C.HORSE_COSTS), jusqu'à C.HORSE_MAX_COUNT. Chaque cheval est un
      // objet indépendant dans s.horses (mêmes 2 places rider/rider2 que
      // l'ancien cheval unique). Positions de spawn légèrement décalées pour
      // ne pas superposer plusieurs chevaux au même endroit.
      const hs = s.horses;
      if (hs.length < C.HORSE_MAX_COUNT) {
        const cost = C.HORSE_COSTS[hs.length];
        if (s.money >= cost) {
          s.money -= cost;
          hs.push({ x: C.SPAWN.x + 2 + hs.length * 2, y: C.SPAWN.y, rider: null, rider2: null });
          out.state = shareState(); out.horses = hs;
          out.chat = { from: "🐴", msg: L.chatAnimalBought(lang === "en" ? "Horse" : "Cheval") };
        } else out.toast = { id: f.id, key: "noGold" };
      }
    } else if (req.kind === "houseUpgrade") {
      // Maison à niveaux (validation Guillaume 2026-07) : lance les TRAVAUX
      // du palier suivant — or prélevé sur la caisse commune, bois/pierre
      // sur l'inventaire du DEMANDEUR, fin des travaux à upgradeUntil
      // (2 h vers le niveau 2, 5 h vers le niveau 3, temps RÉEL). La montée
      // de niveau effective est faite par le tick hôte 1 Hz (voir dayTimer),
      // pour aboutir même si plus personne ne clique rien d'ici là.
      const hh = s.house || (s.house = { level: 1, upgradeUntil: 0 });
      const pal = C.HOUSE_LEVELS[hh.level - 1];
      if (pal && hh.level < C.HOUSE_MAX_LEVEL && !(hh.upgradeUntil > Date.now())
          && s.money >= pal.cost.money && f.inv.wood >= pal.cost.wood && f.inv.stone >= pal.cost.stone) {
        s.money -= pal.cost.money;
        f.inv.wood -= pal.cost.wood; f.inv.stone -= pal.cost.stone;
        hh.upgradeUntil = Date.now() + pal.durationMs;
        out.state = shareState();
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.house = { ...hh };
        broadcastChat("🏠", L.houseWorksStarted(f.name, pal.level));
      } else {
        out.toast = { id: req.id, key: "actionFailed" };
      }
    } else if (req.kind === "buyWell") {
      const w2 = worldRef.current;
      if (!s.wellBuilt && s.money >= C.WELL_COST && w2) {
        s.money -= C.WELL_COST; s.wellBuilt = true;
        for (let yy = C.WELL.y - 1; yy <= C.WELL.y + 3; yy++) for (let xx = C.WELL.x - 1; xx <= C.WELL.x + 1; xx++) {
          const i = idxOf(xx, yy); if (i < 0 || i >= w2.ground.length) continue;
          w2.ground[i] = C.G_PATH; if (w2.objects[i] !== C.O_NONE) { w2.objects[i] = C.O_NONE; w2.objHp.delete(i); }
          recordTileOverride(i); out.tiles.push({ i, g: w2.ground[i], o: w2.objects[i] });
        }
        const wi = idxOf(C.WELL.x, C.WELL.y); w2.objects[wi] = C.O_WELL; recordTileOverride(wi); out.tiles.push({ i: wi, g: w2.ground[wi], o: C.O_WELL });
        out.state = shareState(); out.wellBuilt = true;
        out.chat = { from: "🪣", msg: lang === "en" ? "The well is built!" : "Le puits est construit !" };
      } else if (!s.wellBuilt) out.toast = { id: f.id, key: "noGold" };
    } else if (req.kind === "hireGreg") {
      // Engagement de Greg (chantier 2026-07) : contrat réel de 2 jours
      // (C.GREG_CONTRACT_MS), rémunéré d'avance (C.GREG_HIRE_COST). Un seul
      // Greg à la fois : ré-engager avant expiration prolonge simplement le
      // contrat (paie à nouveau, repart pour 2 jours pleins) plutôt que de
      // refuser — plus simple à comprendre pour le joueur qu'un blocage.
      if (s.money >= C.GREG_HIRE_COST) {
        s.money -= C.GREG_HIRE_COST;
        const now = Date.now();
        s.greg = {
          hiredAt: now, expiresAt: now + C.GREG_CONTRACT_MS,
          x: C.GREG_ANCHOR.x, y: C.GREG_ANCHOR.y, tx: C.GREG_ANCHOR.x, ty: C.GREG_ANCHOR.y, dir: 0, animT: 0, moving: false,
          phase: "roam", roamAnchor: { x: C.GREG_ANCHOR.x, y: C.GREG_ANCHOR.y }, roamTarget: null, nextRoamAt: 0,
          taskQueue: [], lastWaterCheckAt: now,
        };
        out.state = shareState(); out.greg = s.greg;
        out.chat = { from: "🧑‍🌾", msg: lang === "en" ? "Greg is hired for 2 days!" : "Greg est engagé pour 2 jours !" };
      } else out.toast = { id: f.id, key: "noGold" };
    } else if (req.kind === "gregOrder") {
      // Ordre donné à Greg (chantier 2026-07) : "labourer N cases, planter,
      // puis arroser" pour une culture donnée. Payé d'avance au prix des
      // graines (stock commun, ne touche PAS l'inventaire d'un joueur en
      // particulier — Greg travaille pour la ferme). La file de tâches est
      // simplement complétée (des ordres successifs s'enchaînent).
      const g = s.greg;
      const cropIdx = req.crop | 0, count = Math.max(1, Math.min(C.GREG_ORDER_MAX, req.count | 0));
      if (!g || g.expiresAt <= Date.now()) out.toast = { id: f.id, key: "gregNotHired" };
      else if (!(cropIdx >= 0 && cropIdx < C.CROPS.length)) out.toast = { id: f.id, key: "noGold" };
      else {
        const cost = C.CROPS[cropIdx].seedCost * count;
        const w2 = worldRef.current;
        if (s.money < cost) out.toast = { id: f.id, key: "noGold" };
        else {
          // Zone ciblée par le joueur (chantier 2026-07, suite retour Guillaume) :
          // Greg laboure intelligemment AUTOUR d'où le joueur se trouve au
          // moment de l'ordre (px/py, position déjà envoyée par sendReq),
          // plutôt qu'autour d'un point fixe ou de sa position de rôdaille.
          const tiles = E.findFreeGrassTiles(w2, { x: Math.round(px), y: Math.round(py) }, count);
          if (tiles.length === 0) out.toast = { id: f.id, key: "gregNoRoom" };
          else {
            s.money -= C.CROPS[cropIdx].seedCost * tiles.length;
            for (const i of tiles) {
              // Case déjà labourée (G_TILLED/G_WATERED) : pas besoin de
              // "till", on passe directement à la plantation (correctif
              // 2026-07, voir findFreeGrassTiles).
              const alreadyTilled = w2.ground[i] === C.G_TILLED || w2.ground[i] === C.G_WATERED;
              if (!alreadyTilled) g.taskQueue.push({ a: "till", i });
              g.taskQueue.push({ a: "plant", i, crop: cropIdx }, { a: "water", i });
            }
            out.state = shareState(); out.greg = g;
            out.chat = { from: "🧑‍🌾", msg: lang === "en" ? `Greg is on it: ${tiles.length} tile(s) of ${C.CROPS[cropIdx].nameEn}.` : `Greg s'y met : ${tiles.length} case(s) de ${C.CROPS[cropIdx].name}.` };
          }
        }
      }
    } else if (req.kind === "buyFertilizer") {
      // Achat d'engrais au shop (chantier 2026-07, suite plan validé) : stock
      // limité côté boutique (sharedRef.current.fertilizerShop.stock, remis à
      // niveau tous les FERTILIZER_RESTOCK_EVERY_N_DAYS jours, voir le
      // dayTimer plus bas), payé en or. Une fois acheté, l'engrais rejoint le
      // pool COMMUN de la ferme (sharedRef.current.gregStock.fertilizer,
      // même esprit que gregStock.wood/stone) — pas l'inventaire d'un joueur
      // en particulier, puisqu'il ne se dépense que via un ordre à Greg.
      const shop = sharedRef.current.fertilizerShop || (sharedRef.current.fertilizerShop = { stock: 0, lastRestockDay: s.day });
      if (shop.stock <= 0) out.toast = { id: f.id, key: "gregNoRoom" };
      else if (s.money < C.FERTILIZER_COST) out.toast = { id: f.id, key: "noGold" };
      else {
        s.money -= C.FERTILIZER_COST; shop.stock -= 1;
        const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0 });
        stock.fertilizer = (stock.fertilizer || 0) + 1;
        out.state = shareState(); out.gregStock = stock; out.fertilizerShop = shop;
      }
    } else if (req.kind === "gregFertilizeOrder") {
      // Ordre "épandre de l'engrais" (chantier 2026-07, révisé 2026-07 :
      // zone fixe au lieu d'un nombre de cases choisi) : même schéma que
      // "gregOrder" (labourer/planter/arroser), mais cible toutes les cases
      // DÉJÀ PLANTÉES et non mûres dans le carré C.FERTILIZER_AREA_SIZE x
      // C.FERTILIZER_AREA_SIZE autour du point où se trouve le joueur
      // (findFertilizableTiles). Consomme le pool commun d'engrais
      // (gregStock.fertilizer) à raison d'1 engrais pour TOUT le carré,
      // quel que soit le nombre de cases réellement fertilisées.
      const g = s.greg;
      if (!g || g.expiresAt <= Date.now()) out.toast = { id: f.id, key: "gregNotHired" };
      else {
        const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0 });
        const have = stock.fertilizer || 0;
        if (have <= 0) out.toast = { id: f.id, key: "gregNoFertilizer" };
        else {
          const w2 = worldRef.current;
          const tiles = E.findFertilizableTiles(w2, { x: Math.round(px), y: Math.round(py) }, Date.now());
          if (tiles.length === 0) out.toast = { id: f.id, key: "gregNoRoom" };
          else {
            stock.fertilizer = have - 1;
            for (const i of tiles) g.taskQueue.push({ a: "fertilize", i });
            out.gregStock = stock; out.greg = g;
            out.chat = { from: "🧑‍🌾", msg: lang === "en" ? `Greg is on it: fertilizing ${tiles.length} tile(s).` : `Greg s'y met : engrais sur ${tiles.length} case(s).` };
          }
        }
      }
    } else if (req.kind === "hireSoan") {
      // Engagement de Soan (chantier 2026-07, demande Guillaume) : même
      // principe que hireGreg, contrat réel de 24h (C.SOAN_CONTRACT_MS) au
      // lieu de 2 jours. Un seul Soan à la fois ; ré-engager avant expiration
      // prolonge simplement le contrat.
      if (s.money >= C.SOAN_HIRE_COST) {
        s.money -= C.SOAN_HIRE_COST;
        const now = Date.now();
        s.soan = {
          hiredAt: now, expiresAt: now + C.SOAN_CONTRACT_MS,
          x: C.SOAN_ANCHOR.x, y: C.SOAN_ANCHOR.y, tx: C.SOAN_ANCHOR.x, ty: C.SOAN_ANCHOR.y, dir: 0, animT: 0, moving: false,
          phase: "roam", roamAnchor: { x: C.SOAN_ANCHOR.x, y: C.SOAN_ANCHOR.y }, roamTarget: null, nextRoamAt: 0,
          riverSpot: null, lastFishAt: 0,
        };
        out.state = shareState(); out.soan = s.soan;
        out.chat = { from: "🎣", msg: lang === "en" ? "Soan is hired for 24h!" : "Soan est engagé pour 24h !" };
      } else out.toast = { id: f.id, key: "noGold" };
    } else if (req.kind === "soanOrder") {
      // Ordre "va pêcher à la rivière" (chantier 2026-07, demande Guillaume) :
      // contrairement à gregOrder, pas de zone/nombre choisi par le joueur —
      // Soan cherche lui-même la berge la plus proche de son ancre
      // (findRiverbankTile) et s'y poste pour pêcher en continu tant qu'aucun
      // nouvel ordre ni fin de contrat n'intervient.
      const so = s.soan;
      if (!so || so.expiresAt <= Date.now()) out.toast = { id: f.id, key: "soanNotHired" };
      else {
        const w2 = worldRef.current;
        // FIX 246 (demande Guillaume : "Soan a parfois du mal à trouver la
        // rivière") : on cherche la berge autour de la POSITION DU JOUEUR au
        // moment de l'ordre (px/py, déjà envoyée par sendReq) — comme Greg
        // laboure autour du joueur — au lieu de l'ancre de rôdaille de Soan,
        // souvent loin de l'eau. Repli sur l'ancre si le joueur était hors carte.
        const near = { x: Math.round(px), y: Math.round(py) };
        const spot = E.findRiverbankTile(w2, near) ?? E.findRiverbankTile(w2, so.roamAnchor || C.SOAN_ANCHOR);
        if (spot == null) out.toast = { id: f.id, key: "soanNoRiver" };
        else {
          so.riverSpot = spot; so.phase = "toRiver";
          out.state = shareState(); out.soan = so;
          out.chat = { from: "🎣", msg: lang === "en" ? "Soan is heading to the river." : "Soan part pêcher à la rivière." };
        }
      }
    } else if (req.kind === "soanRecall") {
      // Rappelle Soan en rôdaille près de son ancre (annule un ordre de pêche
      // en cours, sans résilier le contrat).
      const so = s.soan;
      if (so) { so.phase = "roam"; so.riverSpot = null; so.roamTarget = null; so.nextRoamAt = 0; out.state = shareState(); out.soan = so; }
    } else if (req.kind === "hireHarald") {
      // Zip 260 (demande Guillaume) : agent d'élevage engagé à la boutique
      // comme Soan, contrat réel de 24h payé d'avance (1000 or). Un seul à la
      // fois ; ré-engager avant expiration prolonge le contrat.
      if (s.money >= C.HARALD_HIRE_COST) {
        s.money -= C.HARALD_HIRE_COST;
        const now = Date.now();
        s.harald = {
          hiredAt: now, expiresAt: now + C.HARALD_CONTRACT_MS,
          x: C.HARALD_ANCHOR.x, y: C.HARALD_ANCHOR.y, tx: C.HARALD_ANCHOR.x, ty: C.HARALD_ANCHOR.y, dir: 0, animT: 0, moving: false,
          phase: "roam", roamAnchor: { x: C.HARALD_ANCHOR.x, y: C.HARALD_ANCHOR.y }, roamTarget: null, nextRoamAt: 0, nextRoundAt: now + C.HARALD_ROUND_MS,
        };
        out.state = shareState(); out.harald = s.harald;
        out.chat = { from: "\uD83E\uDDFA", msg: lang === "en" ? "Harald the livestock agent is hired for 24h!" : "Harald, l'agent d'\u00e9levage, est engag\u00e9 pour 24h !" };
      } else out.toast = { id: f.id, key: "noGold" };
    } else if (req.kind === "buyAnimal") {
      const at = req.animal | 0;
      if (at >= 0 && at < C.ANIMALS.length) {
        if (s.animals.length >= E.barnAnimalCap(s.barn ? s.barn.level : 0)) out.toast = { id: f.id, key: "penFull" };
        else if (s.money < C.ANIMALS[at].cost) out.toast = { id: f.id, key: "noGold" };
        else {
          s.money -= C.ANIMALS[at].cost;
          const ax = C.PEN.x + 1 + Math.floor(Math.random() * (C.PEN.w - 2));
          const ay = C.PEN.y + 1 + Math.floor(Math.random() * (C.PEN.h - 2));
          s.animals.push({ type: at, hx: ax, hy: ay, readyAt: Date.now(), carriedBy: null });
          out.state = shareState(); out.animals = s.animals;
          out.chat = { from: "🐮", msg: L.chatAnimalBought(lang === "en" ? C.ANIMALS[at].nameEn : C.ANIMALS[at].name) };
        }
      }
    } else if (req.kind === "mount") {
      // Deux places : "rider" (mène la monture) et "rider2" (passager, la suit).
      // Si un premier cavalier est déjà en selle, le cheval bouge : on compare
      // la position du demandeur à la position VIVANTE du cavalier (suivie en
      // continu via les messages "pos"), pas à h.x/h.y qui n'est à jour que
      // lorsque le cheval est laissé libre (voir "dismount"). Plusieurs
      // chevaux possibles désormais (demande 2026-07) : le client cible celui
      // le plus proche via req.horseIndex.
      const hs = s.horses, h = hs[req.horseIndex | 0];
      if (h) {
        const anchorFarmer = h.rider ? farmersRef.current[h.rider] : null;
        const hx = anchorFarmer ? anchorFarmer.x : h.x, hy = anchorFarmer ? anchorFarmer.y : h.y;
        if (h.rider !== req.id && h.rider2 !== req.id && Math.abs(px - hx) <= C.MOUNT_RANGE && Math.abs(py - hy) <= C.MOUNT_RANGE) {
          if (!h.rider) { h.rider = req.id; out.horses = hs; }
          else if (!h.rider2) { h.rider2 = req.id; out.horses = hs; }
        }
      }
    } else if (req.kind === "dismount") {
      const hs = s.horses;
      for (const h of hs) {
        if (h.rider === req.id) { h.rider = null; h.rider2 = null; h.x = px; h.y = py; out.horses = hs; break; }
        else if (h.rider2 === req.id) { h.rider2 = null; out.horses = hs; break; }
      }
    } else if (req.kind === "whistle") {
      // Sifflement (bouton dédié, icône cheval) : tous les chevaux LIBRES
      // (personne dessus) de la ferme se mettent à courir vers celui qui a
      // sifflé, où qu'il soit sur la carte (pas de restriction de portée,
      // c'est justement l'intérêt du rappel à distance). Le déplacement réel
      // (course progressive) est fait côté hôte, image par image, dans la
      // boucle de rendu (voir updateWhistledHorses) ; ici on se contente de
      // fixer la cible (`callTarget`) que cette boucle va suivre.
      const hs = s.horses || [];
      let any = false;
      for (const h of hs) {
        if (h.rider) continue; // monté : ignore l'appel, il a déjà un cavalier
        h.callTarget = { x: px, y: py };
        any = true;
      }
      if (any) out.horses = hs;
    } else if (req.kind === "collect") {
      const ai = req.animal | 0, an = s.animals[ai];
      const apos = an ? E.animalPos(an, Date.now()) : null;
      if (an && !an.carriedBy && E.animalReady(an, Date.now()) && Math.abs(px - apos.x) <= C.COLLECT_RANGE && Math.abs(py - apos.y) <= C.COLLECT_RANGE) {
        an.readyAt = Date.now() + ((C.ANIMALS[an.type] && C.ANIMALS[an.type].prodMs) || 0);
        f.inv.products[an.type] = (f.inv.products[an.type] || 0) + 1;
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.animals = s.animals;
        out.fx.push({ k: "product", x: apos.x, y: apos.y, product: an.type });
      }
    } else if (req.kind === "pickAnimal") {
      // Attraper un animal (outil "déplacer") : doit être libre et à portée
      // (portée calculée sur sa position dérivée actuelle, donc mobile).
      const ai = req.animal | 0, an = s.animals[ai];
      const apos = an ? E.animalPos(an, Date.now()) : null;
      if (an && !an.carriedBy && Math.abs(px - apos.x) <= C.ANIMAL_PICK_RANGE && Math.abs(py - apos.y) <= C.ANIMAL_PICK_RANGE) {
        an.carriedBy = req.id;
        out.animals = s.animals;
      } else out.toast = { id: f.id, key: "actionFailed" };
    } else if (req.kind === "placeAnimal") {
      // Déposer l'animal porté : n'importe où sur la ferme, hors case bloquée.
      const ai = req.animal | 0, an = s.animals[ai];
      const tx = req.x | 0, ty = req.y | 0;
      if (an && an.carriedBy === req.id && inMap(tx, ty) && !E.blockedTile(w, tx + 0.5, ty + 0.5, Date.now())) {
        an.hx = tx + 0.5; an.hy = ty + 0.5; an.carriedBy = null;
        out.animals = s.animals;
      } else out.toast = { id: f.id, key: "actionFailed" };
    } else if (req.kind === "dropAnimal") {
      // Annulation (changement d'outil) : relâche l'animal sans le déplacer.
      const ai = req.animal | 0, an = s.animals[ai];
      if (an && an.carriedBy === req.id) { an.carriedBy = null; out.animals = s.animals; }
    } else if (req.kind === "sellAnimal") {
      // Vente d'un animal porté (outil "déplacer", touche E, demande 2026-07) :
      // au lieu de le redéposer sur la carte (voir "placeAnimal"), le joueur
      // peut le vendre définitivement contre de l'or, où qu'il se trouve sur
      // la ferme. Prix de vente = 1/3 du prix d'achat (`cost`) du même type
      // d'animal, arrondi à l'entier le plus proche — indépendant du prix de
      // vente de la PRODUCTION (`sell`, œuf/lait/laine/truffe), qui reste
      // inchangé. Retrait définitif du tableau (`splice`), même pattern que
      // pour un animal mangé par un loup (voir phase "eat" plus haut) : les
      // index détenus par d'autres joueurs (`carriedBy`) qui suivraient un
      // animal situé APRÈS celui-ci dans le tableau se décaleraient d'un cran
      // — risque déjà présent et accepté pour le loup, non traité ici non
      // plus (accepter la même limite plutôt qu'introduire un mécanisme à
      // part, cf. remarque du zip 178 sur les lapins/id vs index).
      const ai = req.animal | 0, an = s.animals[ai];
      if (an && an.carriedBy === req.id) {
        const at = C.ANIMALS[an.type];
        const price = Math.round(((at && at.cost) || 0) / 3);
        s.money += price;
        s.animals.splice(ai, 1);
        out.state = shareState(); out.animals = s.animals;
        out.fx.push({ k: "sell", x: px, y: py, gain: price });
        out.chat = { from: "💰", msg: L.chatAnimalSold(lang === "en" ? at.nameEn : at.name, price) };
      } else out.toast = { id: f.id, key: "actionFailed" };
    } else if (req.kind === "catchRabbit") {
      // Capture d'un lapin sauvage avec l'outil "déplacer" (même case 9 que
      // pour attraper un animal de la ferme, demande Guillaume). Contrairement
      // aux animaux de la ferme : pas de portage, résolution immédiate en un
      // clic — "pour le fun", sans aucun effet économique. Ne réussit que si
      // le lapin visé est encore là, à portée, et PAS en train de fuir (s'il
      // fuit, c'est qu'un jet de repérage l'a déjà "vu" arriver, voir
      // updateRabbits) : la vraie chance ("1 sur 5") vient de ces jets
      // répétés pendant l'approche, pas d'un tirage supplémentaire ici.
      const ri = (s.rabbits || []).findIndex(r => r.id === req.rabbit);
      const rb = ri >= 0 ? s.rabbits[ri] : null;
      // FIX 246 (demande Guillaume : "facilite le ramassage des lapins") :
      // capture si le lapin est à portée (élargie) ET soit pas en fuite, soit
      // en fuite MAIS très proche (RABBIT_CATCH_FLEE_GRACE) — un lapin qui
      // vient de détaler juste sous la main peut désormais être saisi.
      const rbDist = rb ? Math.hypot(px - rb.x, py - rb.y) : Infinity;
      const catchable = rb && rbDist <= C.RABBIT_CATCH_RANGE && (rb.phase !== "flee" || rbDist <= C.RABBIT_CATCH_FLEE_GRACE);
      if (catchable) {
        s.rabbits.splice(ri, 1);
        out.rabbits = s.rabbits;
        out.chat = { from: "🐇", msg: L.rabbitCaughtChat(f.name) };
        // Défi "chasse aux lapins" (chantier 2026-07, demande Guillaume) : si
        // un défi est actif, cette capture compte pour le compteur personnel
        // du fermier. Indexé par id de fermier (pas par index de tableau,
        // contrairement aux animaux/loups) : reste valide quel que soit
        // l'ordre des captures ou des (re)connexions pendant le défi.
        const rc = s.rabbitChallenge;
        if (rc && rc.active) {
          rc.catches[req.id] = (rc.catches[req.id] || 0) + 1;
          if (rc.catches[req.id] >= C.RABBIT_CHALLENGE_TARGET) {
            // Victoire : le défi s'arrête, le gagnant reçoit le trophée 🏆
            // (correctif 2026-07 : affiché temporairement pendant
            // C.HAT_DISPLAY_MS, plus permanent — voir farmer.hatUntil /
            // p.hatWon, même mécanique de diffusion que le statut "blessé").
            rc.active = false;
            f.hatUntil = Date.now() + C.HAT_DISPLAY_MS;
            out.hatWon = { id: f.id, hatUntil: f.hatUntil };
            out.chat = { from: "🏆", msg: L.rabbitChallengeWon(f.name) };
          }
          out.rabbitChallenge = rc;
        }
      } else out.toast = { id: f.id, key: "actionFailed" };
    } else if (req.kind === "coopDeposit") {
      const r = E.resolveCoopDeposit(f, s.coop, req);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.deposited > 0) {
        out.coop = s.coop;
        out.chat = { from: "🚧", msg: L.coopDeposited(f.name, r.deposited, r.resource === "wood" ? L.woodLabel : L.stoneLabel) };
        if (r.completed) {
          const def = C.COOP_MISSIONS.find(m2 => m2.id === s.coop.id);
          const reward = (def && def.reward) || 0;
          s.money += reward; out.state = shareState();
          broadcastChat("🎉", L.coopDone(lang === "en" ? def.nameEn : def.name, reward));
          // Nouvelle mission tirée aussitôt (tant que 2+ fermiers sont en ligne).
          s.coop = (playersRef.current.size + 1) >= 2 ? E.pickCoopMission() : null;
          out.coop = s.coop;
        }
        dirtyRef.current = true;
      }
    } else if (req.kind === "barnDeposit") {
      const r = E.resolveBarnDeposit(f, s.barn, req, s.money);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.deposited > 0) {
        out.barn = s.barn;
        out.chat = { from: "🛖", msg: L.barnDeposited(f.name, r.deposited, r.resource === "wood" ? L.woodLabel : L.stoneLabel) };
        dirtyRef.current = true;
      }
      if (r.becameReady) {
        s.money -= r.moneySpent; out.state = shareState(); out.barn = s.barn;
        broadcastChat("🛖", L.barnReadyChat(r.moneySpent));
        dirtyRef.current = true;
      }
    } else if (req.kind === "barnBuild") {
      const r = E.resolveBarnBuild(f, s.barn);
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.built) {
        out.barn = s.barn;
        broadcastChat("🎉", L.barnBuilt(f.name, r.level));
        dirtyRef.current = true;
      }
    } else if (req.kind === "salveDeposit") {
      // Dépôt d'un poisson (truite/brochet) au chaudron de la pommade de
      // protection (chantier 2026-07) — même esprit que barnDeposit, mais
      // sur les poissons personnels du fermier plutôt que bois/pierre.
      const r = E.resolveSalveDeposit(f, s.salveCraft, w, req);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.deposited > 0) {
        out.salveCraft = s.salveCraft;
        out.chat = { from: "🧪", msg: L.salveDeposited(f.name, r.deposited, r.fish === "trout" ? L.troutLabel : L.pikeLabel) };
        dirtyRef.current = true;
      }
    } else if (req.kind === "salveBrew") {
      // Allumage du feu / lancement de la concoction (chantier 2026-07,
      // refonte "menu déposer/prêt/allumer" : déclenché par un clic/E sur le
      // chaudron torche allumée, voir tryOpenNearby/igniteCauldron côté
      // client) : consomme la recette (poissons déposés + améthyste
      // commune) et lance une minuterie de C.SALVE_BREW_MS — NE crédite PAS
      // encore la pommade, voir "salveCollect" plus bas pour le retrait une
      // fois la concoction terminée.
      const r = E.resolveSalveBrew(f, s.salveCraft, s.gems, w);
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.ignited) {
        out.salveCraft = s.salveCraft; out.gems = s.gems;
        broadcastChat("🔥", L.salveIgnited(f.name));
        dirtyRef.current = true;
      }
    } else if (req.kind === "salveCollect") {
      // Retrait du produit fini (chantier 2026-07, demande Guillaume : "le
      // produit est récupérable directement au chaudron et apparaîtra dans
      // l'inventaire, il sera logiquement utilisable par tous les joueurs de
      // la session") : n'importe quel fermier présent une fois la minuterie
      // écoulée peut venir le chercher, pas forcément celui qui a allumé le
      // feu.
      const r = E.resolveSalveCollect(f, s.salveCraft, w);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.collected) {
        out.salveCraft = s.salveCraft;
        broadcastChat("🧴", L.salveBrewed(f.name));
        dirtyRef.current = true;
      }
    } else if (req.kind === "evilCauldronPickup") {
      // Ramassage de l'artéfact-chaudron sur la carte maléfique (chantier
      // 2026-07, demande Guillaume) : la carte maléfique n'existe pas côté
      // hôte (comme evilChop/evilCaught), mais l'unicité du chaudron pour
      // TOUTE la ferme exige une décision arbitrée par l'hôte (traite les
      // requêtes séquentiellement, donc pas de double-obtention possible
      // même si deux fermiers l'atteignent au même instant).
      const r = E.resolveEvilCauldronPickup(f, s.salveCraft);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.unlocked) {
        out.salveCraft = s.salveCraft;
        out.chat = { from: "⚗️", msg: L.evilCauldronPickedToast };
        dirtyRef.current = true;
      }
    } else if (req.kind === "cauldronPlace") {
      // Pose/retrait du chaudron ramené (outil Construction, variante
      // "cauldron", chantier 2026-07) — même mécanique que "act"/"mill",
      // mais fonction dédiée car elle a aussi besoin de s.salveCraft (pour
      // interdire le retrait tant qu'il reste du poisson non transformé).
      const r = E.resolveCauldronPlace(f, w, s.salveCraft, req);
      for (const i of r.tiles) { recordTileOverride(i); out.tiles.push({ i, g: w.ground[i], o: w.objects[i], hp: w.objHp.get(i) }); }
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.tiles.length) dirtyRef.current = true;
    }

    // Quêtes de découverte : première réussite d'une action listée -> or commun.
    if (questId && !f.quests[questId]) {
      const q = C.QUESTS.find(x => x.id === questId);
      if (q) {
        f.quests[questId] = true;
        s.money += q.reward; out.state = shareState();
        if (!out.farmer) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        const label = (L.questLabels && L.questLabels[questId]) || questId;
        broadcastChat("🎯", L.questDone(label, q.reward));
        dirtyRef.current = true;
      }
    }
    // Les quêtes accomplies voyagent avec l'état privé du fermier.
    if (out.farmer) out.farmer.quests = f.quests;

    if (out.tiles.length || out.state || out.horses || out.animals || out.wellBuilt || out.gems || out.mills || out.house || out.flour !== undefined) dirtyRef.current = true;
    hostSend({ type: "broadcast", event: "apply", payload: { ...out, hostNow: Date.now() } });
  }
  // -------- 2026-07 station update: host-side station module --------
  function rosterOf(rid) { return C.VISITOR_ROSTER[rid] || C.VISITOR_ROSTER[0]; }
  function cropLabel(id) { const cr = C.CROPS[id] || C.CROPS[0]; return lang === "en" ? cr.nameEn : cr.name; }
  // Zip 233: human label of a gift reward (unique seeds / decoration / pet).
  function giftLabel(g) {
    if (!g) return "";
    if (g.kind === "seed") { const cr = C.CROPS[g.cropId] || {}; return L.giftSeed(lang === "en" ? cr.seedNameEn : cr.seedName); }
    if (g.kind === "decor") { const d = C.UNIQUE_DECORATIONS.find(x => x.id === g.id) || {}; return L.giftDecor(lang === "en" ? d.nameEn : d.name); }
    if (g.kind === "pet") { return L.giftPet(C.petName(g.petId, lang === "en")); }
    if (g.kind === "useful") { return L.giftUseful(g.n || 1, itemLabel(g.item)); }
    return "";
  }
  // Zip 250: ligne de chat annonçant le sort d'un cadeau de deal/troc —
  // promis (livré plus tard), en file d'attente (déco), ou remis direct.
  function giftChatLine(rid, r) {
    const nm = rosterOf(rid).name, lbl = giftLabel(r.gift);
    if (r.giftPromised) return L.visitorGiftPromised(nm, lbl);
    if (r.giftQueued) return L.visitorGiftQueued(nm, lbl);
    return L.visitorGiftGranted(nm, lbl);
  }
  // Zip 237: human label for a useful item id (used by swap gives).
  function itemLabel(item) {
    return ({ wood: lang === "en" ? "wood" : "bois", stone: lang === "en" ? "stone" : "pierre", food: lang === "en" ? "snacks" : "snacks", salve: lang === "en" ? "immunity salve" : "baume d'immunité", healKit: lang === "en" ? "bandaids" : "pansements", fence: lang === "en" ? "fences" : "clôtures" })[item] || item;
  }
  // Broadcast the FULL station object (discrete changes only: arrivals,
  // phase switches, deals, votes, damage). Continuous movement travels in
  // the light `visitorSim` payload instead. Also refreshes the host's own
  // React mirror, since the host ignores its own echo (see applyDeltas).
  function broadcastStation() {
    const st = sharedRef.current.station;
    setStationSt(st ? JSON.parse(JSON.stringify(st)) : null);
    dirtyRef.current = true;
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: { station: st, hostNow: Date.now() } });
  }
  function stationChat(msg, from) {
    broadcastChat(from || "\u{1F689}", msg);
  }
  // -------- Zip 251 : décorations (outil main) — hôte autoritaire --------
  function nextDecorDid() {
    const s = sharedRef.current; let mx = 0;
    for (const e of (s.decor || [])) if ((e.did | 0) > mx) mx = e.did | 0;
    return mx + 1;
  }
  function broadcastDecor() {
    dirtyRef.current = true;
    // apply gardé par !isHost côté applyDeltas -> l'hôte conserve sa liste vivante.
    hostSend({ type: "broadcast", event: "apply", payload: { decor: sharedRef.current.decor } });
  }
  // Traite les requêtes de l'outil main. Retourne true si consommée.
  //  - placeDecor : pose une déco du sac (ferme ou ville) ;
  //  - moveDecor / pickDecor : déplace une déco posée, ou la remet au sac ;
  //  - moveObj / returnObj : déplace un lampadaire/épouvantail (ferme), ou le
  //    remet dans l'inventaire du joueur. La validité de la case CIBLE est
  //    vérifiée côté client avant l'envoi (il connaît la carte de sa zone).
  function hostHandleDecorReq(req, f) {
    const w = worldRef.current, s = sharedRef.current;
    if (!Array.isArray(s.decor)) s.decor = [];
    if (req.kind === "placeDecor") {
      const deco = req.deco, zone = req.zone === "town" ? "town" : "farm";
      if (!C.UNIQUE_DECORATIONS.some(d => d.id === deco)) return true;
      if (!f.inv.decor || (f.inv.decor[deco] | 0) <= 0) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: f.id, key: "decorNone" } } }); return true; }
      const x = +req.x, y = +req.y;
      if (!(x >= 0 && y >= 0)) return true;
      f.inv.decor[deco] = (f.inv.decor[deco] | 0) - 1;
      if (f.inv.decor[deco] <= 0) delete f.inv.decor[deco];
      s.decor.push({ did: nextDecorDid(), deco, x: +x.toFixed(2), y: +y.toFixed(2), zone, owner: f.id });
      hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets } } });
      broadcastDecor();
      return true;
    }
    if (req.kind === "moveDecor") {
      const e = s.decor.find(d => d.did === (req.did | 0));
      if (e && +req.x >= 0 && +req.y >= 0) { e.x = +(+req.x).toFixed(2); e.y = +(+req.y).toFixed(2); broadcastDecor(); }
      return true;
    }
    if (req.kind === "moveArtisan") {
      // Zip 259 : déplace UNIQUEMENT la position d'un bâtiment d'artisan
      // construit (crafts[bid].pos), sans jamais le supprimer ni toucher à sa
      // production. L'apiculteur/fromager/pâtissière recalcule sa zone de
      // rôdaille automatiquement (artisanAnchor lit cette position).
      const bid = req.bid, def = C.ARTISAN_BUILDINGS[bid];
      if (!def || !s.crafts || !s.crafts[bid] || !s.crafts[bid].built) return true;
      const x = req.x | 0, y = req.y | 0;
      if (!(x >= 0 && y >= 0)) return true;
      s.crafts[bid].pos = { x, y };
      dirtyRef.current = true;
      hostSend({ type: "broadcast", event: "apply", payload: { crafts: s.crafts } });
      return true;
    }
    if (req.kind === "pickDecor") {
      const idx = s.decor.findIndex(d => d.did === (req.did | 0));
      if (idx >= 0) {
        const e = s.decor[idx]; s.decor.splice(idx, 1);
        if (!f.inv.decor) f.inv.decor = {};
        f.inv.decor[e.deco] = (f.inv.decor[e.deco] | 0) + 1;
        hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets }, toast: { id: f.id, key: "decorPicked" } } });
        broadcastDecor();
      }
      return true;
    }
    if (req.kind === "moveObj" || req.kind === "returnObj") {
      if (!w) return true;
      const fromI = idxOf(req.fromX | 0, req.fromY | 0);
      const o = w.objects[fromI];
      if (o !== C.O_LAMP && o !== C.O_SCARECROW) return true; // seuls lampadaire/épouvantail sont manipulables à la main
      const hp = w.objHp.get(fromI) || 0;
      w.objects[fromI] = C.O_NONE; w.objHp.delete(fromI); recordTileOverride(fromI);
      const tiles = [{ i: fromI, g: w.ground[fromI], o: C.O_NONE }];
      const payload = { tiles };
      if (req.kind === "returnObj") {
        if (o === C.O_LAMP) f.inv.lamp = (f.inv.lamp | 0) + 1; else f.inv.scarecrow = (f.inv.scarecrow | 0) + 1;
        payload.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets };
        payload.toast = { id: f.id, key: "objReturned" };
      } else {
        const toI = idxOf(req.toX | 0, req.toY | 0);
        if (w.objects[toI] === C.O_NONE && !E.blockedTile(w, (req.toX | 0) + 0.5, (req.toY | 0) + 0.5)) {
          w.objects[toI] = o; w.objHp.set(toI, hp); recordTileOverride(toI);
          tiles.push({ i: toI, g: w.ground[toI], o, hp });
        } else {
          // cible invalide : on repose l'objet à sa place d'origine.
          w.objects[fromI] = o; w.objHp.set(fromI, hp); recordTileOverride(fromI);
          tiles[0] = { i: fromI, g: w.ground[fromI], o, hp };
        }
      }
      hostSend({ type: "broadcast", event: "apply", payload });
      return true;
    }
    return false;
  }
  function hostExecuteHostileDamage(v) {
    const w = worldRef.current, s = sharedRef.current;
    if (!w || !v) return;
    const ro = rosterOf(v.rid);
    const r = E.applyHostileDamage(w, s, Math.random, v.rid);
    v.phase = "leave"; v.offer = { type: "done" };
    if (r.patches.length) channelRef.current?.send({ type: "broadcast", event: "apply", payload: { crops: r.patches } });
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: { state: shareState() } });
    stationChat(L.hostileDamageChat(ro.name, s.station.damage.stolen, s.station.damage.ruined.length), "\u26A0\uFE0F");
    broadcastStation();
  }
  function hostFinalizeVote(v) {
    const s = sharedRef.current;
    if (!v || !v.votes) return;
    const ro = rosterOf(v.rid);
    const fv = E.finalizeVote(v.votes, Math.random);
    if (fv.stay) {
      s.station.residents.push({ rid: v.rid, job: v.offer.job });
      stationChat(fv.dice ? L.voteDiceChat(ro.name, fv.roll, true) : L.voteStayChat(ro.name), "\u{1F3E0}");
    } else {
      stationChat(fv.dice ? L.voteDiceChat(ro.name, fv.roll, false) : L.voteLeaveChat(ro.name), "\u{1F3E0}");
    }
    v.phase = "leave"; v.offer = { type: "done" }; v.votes = null;
    broadcastStation();
  }
  function hostHandleStationReq(req, f) {
    const w = worldRef.current, s = sharedRef.current;
    if (!s.station) s.station = E.newStationState();
    const ch = { send: (m) => hostSend(m) }; // FIX 246b : ch relaie ET applique en local chez l'hôte
    const v = E.getVisitor(s, req.rid); // zip 233: requests target a specific visitor by roster id
    const toastTo = (key) => ch?.send({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key } } });
    if (req.kind === "adsSet") {
      const r = E.resolveAdsSet(s, req.ads);
      if (!r.ok) { toastTo(r.toast || "actionFailed"); return true; }
      if (r.cost > 0) ch?.send({ type: "broadcast", event: "apply", payload: { state: shareState() } });
      stationChat(L.adsSaved(r.cost), "\u{1F4CC}");
      broadcastStation();
      return true;
    }
    if (req.kind === "visitorDeal") {
      const r = E.resolveVisitorDeal(f, s, req);
      if (!r.ok) { toastTo(r.toast || "actionFailed"); return true; }
      // Zip 237: pets can land in the seller's bag now, so include pets in the payload.
      ch?.send({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets }, state: shareState() } });
      stationChat(L.visitorDealDone(rosterOf(v.rid).name, r.gain), "\u{1F4B0}");
      if (r.gift) { if (r.bagFull && r.gift.kind === "pet") hostSend({ type: "broadcast", event: "apply", payload: { petChoice: { id: f.id, petId: r.gift.petId } } }); else stationChat(giftChatLine(v.rid, r), "\u{1F381}"); }
      broadcastStation();
      return true;
    }
    // Zip 237: barter — swap our produce for the visitor's offered item.
    if (req.kind === "visitorSwap") {
      const r = E.resolveVisitorSwap(f, s, req);
      if (!r.ok) { toastTo(r.toast === "visitorNotEnough" ? "swapNotEnough" : (r.toast || "actionFailed")); return true; }
      ch?.send({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets }, state: shareState() } });
      stationChat(L.swapDone(rosterOf(v.rid).name, giftLabel(r.gift)), "\u{1F501}");
      if (r.bagFull && r.gift && r.gift.kind === "pet") hostSend({ type: "broadcast", event: "apply", payload: { petChoice: { id: f.id, petId: r.gift.petId } } });
      else if (r.giftQueued || r.giftPromised) stationChat(giftChatLine(v.rid, r), "\u{1F381}");
      broadcastStation();
      return true;
    }
    if (req.kind === "visitorChat") {
      // Zip 234 chat rework: the engine picks a dialogue line from the
      // friendship-tier pool and appends it to v.chatLog (rendered as speech
      // bubbles in the visitor card, which every player sees via the station
      // broadcast). The global chat gets the actual spoken line too.
      const r = E.resolveVisitorChat(s, req.rid, Math.random);
      if (r.ok) {
        const line = (L.visitorChatLines[r.tier] || L.visitorChatLines[0])[r.li] || "";
        stationChat(L.visitorChatSaid(rosterOf(v.rid).name, line), "\u{1F4AC}");
        if (r.gained) stationChat(L.visitorChatDone(rosterOf(v.rid).name), "\u{1F49B}");
        broadcastStation();
      }
      return true;
    }
    if (req.kind === "visitorGreet") {
      // Zip 234 (friendship): sent automatically when a visitor card opens.
      // No-op unless this visitor stepped off the train with an arrival gift
      // that nobody has claimed yet (idempotent, see resolveVisitorGreet).
      const r = E.resolveVisitorGreet(f, s, req.rid);
      if (r.ok) {
        if (r.bagFull && r.gift && r.gift.kind === "pet") { hostSend({ type: "broadcast", event: "apply", payload: { petChoice: { id: f.id, petId: r.gift.petId } } }); }
        else {
          if (r.gift && !r.giftQueued) ch?.send({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets } } });
          stationChat(L.visitorArrivalGift(rosterOf(v.rid).name, giftLabel(r.gift)), "\u{1F381}");
        }
        broadcastStation();
      }
      return true;
    }
    if (req.kind === "visitorPay") {
      const r = E.resolveHostilePay(s, req.rid);
      if (!r.ok) { toastTo(r.toast || "actionFailed"); return true; }
      ch?.send({ type: "broadcast", event: "apply", payload: { state: shareState() } });
      stationChat(L.visitorPaid(rosterOf(v.rid).name, r.paid), "\u26A0\uFE0F");
      broadcastStation();
      return true;
    }
    if (req.kind === "visitorRefuse") {
      if (v && v.phase === "wait" && v.offer && v.offer.type === "demand") hostExecuteHostileDamage(v);
      return true;
    }
    if (req.kind === "visitorVote") {
      if (v && v.phase === "wait" && v.offer && v.offer.type === "stay") {
        v.votes = v.votes || {};
        v.votes[req.id] = !!req.v;
        const online = new Set([me.id, ...playersRef.current.keys()]);
        let all = true;
        for (const idp of online) if (!(idp in v.votes)) { all = false; break; }
        if (all) hostFinalizeVote(v); else broadcastStation();
      }
      return true;
    }
    if (req.kind === "visitorBlacklist") {
      const rid = req.rid | 0;
      const r = E.resolveBlacklist(s, rid);
      if (r.ok) { stationChat(L.visitorLeftChat(rosterOf(rid).name), "\u{1F6AB}"); broadcastStation(); }
      return true;
    }
    // Zip 235 (Guillaume: "when we want to recall them, we press 'meet at the
    // townhall'"): pins the visitor's roam target back near the townhall for
    // VISITOR_RECALL_MS, no state churn otherwise.
    if (req.kind === "visitorRecall") {
      const rid = req.rid | 0;
      const v = (s.station.visitors || []).find(vv => vv.rid === rid);
      if (v) { v.recallUntil = Date.now() + C.VISITOR_RECALL_MS; v.roamTarget = null; v.nextRoamAt = 0; broadcastStation(); }
      return true;
    }
    if (req.kind === "passagePickup") {
      const worldIdx = req.worldIdx | 0, pickupId = req.pickupId | 0;
      const r = E.resolvePassagePickup(s, f, worldIdx, pickupId, Math.random);
      out.state = shareState();
      // Pets are individual now: return the updated farmer so the catcher's
      // bag syncs. Chat announces gold; pet catch / bag-full toast is local.
      if (r.pet || r.bagFull) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets };
      out.chat = { from: "✨", msg: L.passageLootToast(r.gold) };
      if (r.pet) out.toast = { id: f.id, key: "petCaught", petId: r.pet.id };
      else if (r.bagFull) out.toast = { id: f.id, key: "bagFull" };
      return true;
    }
    // Zip 236: release a pet back into the wild (frees a bag slot).
    if (req.kind === "releasePet") {
      const r = E.resolveReleasePet(f, req.index | 0);
      if (r.ok) {
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets };
        out.toast = { id: f.id, key: "petReleased", petId: r.petId };
      }
      return true;
    }
    // Zip 235: maze center prize — flat gold reward. Client dedupes with
    // mazePrizeClaimedRef so the host doesn't need to track per-player
    // claims (they'd reset anyway on rotation).
    if (req.kind === "mazePrize") {
      s.money += C.MAZE_PRIZE_GOLD; s.totalEarned = (s.totalEarned || 0) + C.MAZE_PRIZE_GOLD;
      out.state = shareState();
      out.chat = { from: "🏆", msg: L.mazePrizeToast(C.MAZE_PRIZE_GOLD) };
      return true;
    }
    if (req.kind === "berryPick") {
      const r = E.resolveBerryPick(f, w, req.x | 0, req.y | 0, Math.random);
      if (r.ok) {
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.toast = { id: f.id, key: "berriesPicked", n: r.n };
      }
      return true;
    }
    if (req.kind === "fruitPick") {
      const r = E.resolveFruitPick(f, w, req.x | 0, req.y | 0);
      if (r.ok) {
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.toast = { id: f.id, key: "fruitPicked", n: r.n };
      } else if (r.cooldown) out.toast = { id: f.id, key: "fruitCooldown" };
      return true;
    }
    if (req.kind === "repairResult") {
      const onlineCount = playersRef.current.size + 1;
      const r = E.resolveRepairResult(w, s, req.id, !!req.win, onlineCount);
      if (r.done) {
        if (r.patches && r.patches.length) ch?.send({ type: "broadcast", event: "apply", payload: { crops: r.patches } });
        ch?.send({ type: "broadcast", event: "apply", payload: { state: shareState() } });
        stationChat(L.repairDoneChat(r.restored.stolen, r.restored.crops), "\u2705");
        broadcastStation();
      } else if (typeof r.progress === "number") {
        stationChat(L.repairProgress(r.progress, r.needed), "\u{1F6E0}\uFE0F");
        broadcastStation();
      }
      return true;
    }
    return false;
  }
  // Summed crop stock of the ONLINE players (zip 233): feeds spawnVisitor's
  // easy/prep offer classification. Offline farmers are ignored: an order
  // must be servable by somebody actually here.
  function visitorStockCtx() {
    const crops = C.CROPS.map(() => 0);
    const online = new Set([me.id, ...playersRef.current.keys()]);
    for (const id of online) {
      const f = farmersRef.current[id];
      if (f && f.inv && Array.isArray(f.inv.crops)) f.inv.crops.forEach((n, i) => { crops[i] += (n || 0); });
    }
    return { crops };
  }
  // Host simulation of the live visitors (called from the rAF loop, next to
  // updateGreg). Zip 233: SEVERAL visitors at once (station.visitors[], max
  // C.VISITORS_MAX) arriving in random-sized rounds via spawnVisitorGroup.
  // Handles scheduling, the train, walking, waiting (10-min real-time floor),
  // strolling after 30 real minutes, hostile deadlines, vote deadlines,
  // leaving, and the network throttle.
  // Zip 250 (demande Guillaume) : livraison des cadeaux "promis" (les 2/10
  // différés). Host-only. Chaque entrée { farmerId, fromRid, reward, deliverAt }
  // est déposée dans le SAC du fermier concerné dès qu'elle est échue ET que ce
  // joueur est connecté (sinon on patiente : la promesse ne se perd pas, elle
  // est persistée). Réutilise EXACTEMENT le chemin des deals (grantReward +
  // delta 'farmer' via hostSend → self-apply chez l'hôte, apply chez l'invité).
  function hostDeliverPromisedGifts(now) {
    const s = sharedRef.current, st = s.station;
    if (!st || !Array.isArray(st.promisedGifts) || !st.promisedGifts.length) return;
    let changed = false;
    const keep = [];
    for (const pg of st.promisedGifts) {
      if (!pg || !pg.reward || !pg.farmerId || (pg.deliverAt || 0) > now) { keep.push(pg); continue; }
      const online = pg.farmerId === me.id || playersRef.current.has(pg.farmerId);
      if (!online) { keep.push(pg); continue; } // le joueur est parti : on garde la promesse jusqu'à son retour
      const rf = hostEnsureFarmer(pg.farmerId);
      const gr = E.grantReward(rf, s, null, pg.reward);
      // Zip 252 : cadeau animal différé mais sac plein -> on propose le choix
      // (libérer/refuser) plutôt que de perdre le pet ou de le mettre en file.
      if (gr.bagFull && pg.reward.kind === "pet") {
        hostSend({ type: "broadcast", event: "apply", payload: { petChoice: { id: pg.farmerId, petId: pg.reward.petId } } });
      } else {
        hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id: rf.id, energy: rf.energy, tools: rf.tools, inv: rf.inv, pets: rf.pets } } });
        stationChat(L.visitorGiftDelivered(rosterOf(pg.fromRid != null ? pg.fromRid : 0).name, giftLabel(pg.reward)), "\u{1F381}");
      }
      changed = true;
    }
    if (changed) { st.promisedGifts = keep; dirtyRef.current = true; broadcastStation(); }
  }
  // ================= Zip 252 : artisans / ateliers / produits =================
  function craftMsFor(bid) { return bid === "beehive" ? C.HONEY_MS : bid === "fromagerie" ? C.CHEESE_MS : C.PASTRY_MS; }
  // Cherche, parmi les fermiers connus (hôte inclus), le premier qui a AU MOINS
  // `need` d'un intrant (bag = "products"), pour alimenter un atelier.
  function findInvWith(bag, idx, need) {
    for (const id of Object.keys(farmersRef.current || {})) {
      const fm = farmersRef.current[id];
      if (fm && fm.inv && Array.isArray(fm.inv[bag]) && (fm.inv[bag][idx] | 0) >= need) return { id, fm };
    }
    return null;
  }
  function broadcastFarmerDelta(fm) {
    hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id: fm.id, energy: fm.energy, tools: fm.tools, inv: fm.inv, pets: fm.pets } } });
  }
  // Requêtes liées aux artisans. Retourne true si consommée.
  function hostHandleArtisanReq(req, f) {
    const s = sharedRef.current, st = s.station;
    if (req.kind === "recruitResident") {
      const rid = req.rid | 0, ro = C.VISITOR_ROSTER[rid];
      if (!ro || !ro.skill || !st) return true;
      if ((st.residents || []).some(r => r.rid === rid)) return true; // déjà installé
      // Zip 260 (demande Guillaume) : limite portée à MAX_RESIDENTS,
      // décorrélée des maisons (l'attribution de maison sera revue plus tard).
      if ((st.residents || []).length >= C.MAX_RESIDENTS) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "residentNoRoom" } } }); return true; }
      if (!st.residents) st.residents = [];
      st.residents.push({ rid, job: ro.job, announced: false });
      const v = E.getVisitor(s, rid);
      if (v) { v.phase = "leave"; v.offer = { type: "done" }; } // il a emménagé : il quitte la file des visiteurs
      stationChat(L.residentMovedIn(ro.name, ro.job), "\u{1F3E1}");
      broadcastStation();
      return true;
    }
    if (req.kind === "kickResident") {
      // Zip 259 : vote d'exclusion d'un résident. Unanimité des joueurs EN
      // LIGNE (immédiat en solo). Quand l'exclusion passe : le résident quitte
      // sa maison (libérée) et rejoint la file des exilés (st.exiles) pour
      // revenir supplier plus tard (voir hostSpawnPlea / updateVisitors).
      const rid = req.rid | 0;
      if (!st || !(st.residents || []).some(r => r.rid === rid)) return true;
      // Zip 260 (correctif Guillaume : "le vote n'exclut pas vraiment,
      // Exclusion 1/1 sans effet") : on compte les joueurs RÉELLEMENT
      // CONNECTÉS (soi-même + playersRef), pas farmersRef qui conserve des
      // fermiers d'anciennes sessions — ce dernier gonflait le dénominateur et
      // rendait l'unanimité impossible (compteur figé, aucune exclusion). En
      // solo, onlineIds = [moi] -> exclusion immédiate.
      const onlineIds = [me.id, ...playersRef.current.keys()];
      if (!st.kickVotes) st.kickVotes = {};
      const votes = st.kickVotes[rid] || (st.kickVotes[rid] = {});
      votes[req.id] = true;
      // On ne garde que les votes de joueurs encore connectés (nettoyage).
      for (const vid of Object.keys(votes)) if (!onlineIds.includes(vid)) delete votes[vid];
      const unanime = onlineIds.every(id => votes[id]);
      if (onlineIds.length <= 1 || unanime) {
        const ro = C.VISITOR_ROSTER[rid];
        st.residents = st.residents.filter(r => r.rid !== rid);
        delete st.kickVotes[rid];
        // Humeur pondérée + variante de texte figées dès l'exclusion.
        const moods = C.EXILE_MOODS, wsum = moods.reduce((a, m) => a + (C.EXILE_MOOD_WEIGHTS[m] || 1), 0);
        let pick = Math.random() * wsum, mood = moods[0];
        for (const m of moods) { pick -= (C.EXILE_MOOD_WEIGHTS[m] || 1); if (pick < 0) { mood = m; break; } }
        const vi = Math.floor(Math.random() * (C.EXILE_VARIANT_COUNTS[mood] || 1));
        const delay = C.KICK_RETURN_MIN_MS + Math.floor(Math.random() * (C.KICK_RETURN_MAX_MS - C.KICK_RETURN_MIN_MS + 1));
        if (!st.exiles) st.exiles = [];
        st.exiles.push({ rid, returnAt: Date.now() + delay, mood, vi });
        stationChat(L.kickedChat(ro ? ro.name : "?"), "\u{1F44B}");
      } else {
        hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "kickVoted" } } });
      }
      broadcastStation();
      return true;
    }
    if (req.kind === "pleaResolve") {
      // Zip 259 : réponse à la supplique d'un ex-résident revenu. "accept" ->
      // il réemménage SI une maison est libre ; sinon message "plus de place".
      // "refuse" -> il repart. Dans tous les cas le visiteur-supplique s'en va.
      const rid = req.rid | 0, ro = C.VISITOR_ROSTER[rid];
      if (!st || !ro) return true;
      const v = E.getVisitor(s, rid);
      if (req.accept) {
        // Zip 260 : même plafond MAX_RESIDENTS (décorrélé des maisons).
        if ((st.residents || []).length >= C.MAX_RESIDENTS) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "residentNoRoom" } } }); }
        else { if (!st.residents) st.residents = []; st.residents.push({ rid, job: ro.job, announced: false }); stationChat(L.exileReacceptedChat(ro.name), "\u{1F3E1}"); }
      } else {
        stationChat(L.exileRefusedChat(ro.name), "\u{1F494}");
      }
      if (v) { v.phase = "leave"; v.offer = { type: "done" }; }
      broadcastStation();
      return true;
    }
    if (req.kind === "buyArtisanBuilding") {
      const bid = req.bid, def = C.ARTISAN_BUILDINGS[bid];
      if (!def || !st) return true;
      if (!E.residentHasSkill(st, def.skill)) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "artisanNoResident" } } }); return true; }
      if (!s.crafts) s.crafts = E.newCrafts();
      if (s.crafts[bid] && s.crafts[bid].built) return true;
      if (s.money < def.cost) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "noGold" } } }); return true; }
      s.money -= def.cost;
      s.crafts[bid] = { built: true, nextAt: Date.now() + craftMsFor(bid) };
      setHud(h => ({ ...h, money: s.money }));
      hostSend({ type: "broadcast", event: "apply", payload: { crafts: s.crafts, state: shareState() } });
      stationChat(L.artisanBuilt(L.buildingName(bid)), "\u{1F528}");
      return true;
    }
    if (req.kind === "sellCraft") {
      const stock = s.craftStock || (s.craftStock = E.newCraftStock());
      const price = { honey: C.HONEY_SELL, cheeseWheel: C.CHEESE_WHEEL_SELL, cheesePortion: C.CHEESE_PORTION_SELL, pastry: C.PASTRY_SELL }[req.item];
      if (!price || (stock[req.item] | 0) <= 0) return true;
      const n = Math.min(stock[req.item] | 0, req.n > 0 ? req.n : 9999);
      stock[req.item] -= n; const gain = n * price;
      s.money += gain; s.totalEarned = (s.totalEarned || 0) + gain;
      setHud(h => ({ ...h, money: s.money }));
      hostSend({ type: "broadcast", event: "apply", payload: { craftStock: stock, state: shareState() } });
      stationChat(L.craftSold(L.craftName(req.item), n, gain), "\u{1F4B0}");
      return true;
    }
    if (req.kind === "cutCheese") {
      const stock = s.craftStock || (s.craftStock = E.newCraftStock());
      const n = Math.min(stock.cheeseWheel | 0, req.n > 0 ? req.n : 1);
      if (n <= 0) return true;
      stock.cheeseWheel -= n; stock.cheesePortion = (stock.cheesePortion | 0) + n * C.PORTIONS_PER_WHEEL;
      hostSend({ type: "broadcast", event: "apply", payload: { craftStock: stock } });
      stationChat(L.cheeseCut(n, n * C.PORTIONS_PER_WHEEL), "\u{1F9C0}");
      return true;
    }
    if (req.kind === "releasePetForGift") {
      // Zip 252 : le joueur a choisi de libérer un compagnon pour accueillir le
      // cadeau animal en attente (sac plein).
      E.resolveReleasePet(f, req.index | 0);
      const cr = E.resolveCatchPet(f, req.petId);
      hostSend({ type: "broadcast", event: "apply", payload: { farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, pets: f.pets }, toast: { id: f.id, key: cr.ok ? "petCaught" : "bagFull", petId: req.petId } } });
      return true;
    }
    if (req.kind === "voyagerOrder") {
      // Zip 258 : commande passée à Eduardo (commerçant grand voyageur) depuis
      // le menu Employés. Payée d'avance (or). La durée = plus grand palier de
      // distance parmi les produits commandés. Il part, puis updateResidents
      // détecte le retour (res.trip.returnAt) et dépose la marchandise dans
      // station.worldStock.
      if (!st) return true;
      const res = (st.residents || []).find(r => C.VISITOR_ROSTER[r.rid] && C.VISITOR_ROSTER[r.rid].skill === "voyager");
      if (!res) return true; // Eduardo n'est pas (encore) résident
      if (res.trip && res.trip.phase === "away") { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "voyagerBusy" } } }); return true; }
      const order = Array.isArray(req.order) ? req.order : [];
      let cost = 0, maxDays = 0; const clean = [];
      for (const line of order) {
        const good = C.WORLD_GOODS.find(g => g.key === (line && line.key));
        if (!good) continue;
        const qty = Math.max(0, Math.min(C.VOYAGE_MAX_QTY, (line.qty | 0)));
        if (qty <= 0) continue;
        cost += C.worldGoodUnitCost(good) * qty;
        maxDays = Math.max(maxDays, (C.VOYAGE_TIERS[good.tier] || C.VOYAGE_TIERS.proche).days);
        clean.push({ key: good.key, qty });
      }
      if (!clean.length) return true;
      if (s.money < cost) { hostSend({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "noGold" } } }); return true; }
      s.money -= cost; setHud(h => ({ ...h, money: s.money }));
      const durMs = maxDays * C.VOYAGE_DAY_MS;
      res.trip = { phase: "away", returnAt: Date.now() + durMs, order: clean, cost };
      res.announced = true; // il repart : pas de ré-annonce "au travail"
      broadcastStation();
      hostSend({ type: "broadcast", event: "apply", payload: { state: shareState() } });
      stationChat(L.voyagerDeparted(fmtDuration(durMs)), "\u{1F40E}");
      return true;
    }
    if (req.kind === "voyagerSell") {
      // Zip 258 : revente au marché d'un produit du monde de la réserve commune
      // (station.worldStock) au prix WORLD_GOODS[].sell. Même esprit que sellCraft.
      if (!st) return true;
      const good = C.WORLD_GOODS.find(g => g.key === req.item);
      const ws = st.worldStock || (st.worldStock = {});
      if (!good || (ws[good.key] | 0) <= 0) return true;
      const n = Math.min(ws[good.key] | 0, req.n > 0 ? req.n : 9999);
      ws[good.key] -= n; const gain = n * good.sell;
      s.money += gain; s.totalEarned = (s.totalEarned || 0) + gain;
      setHud(h => ({ ...h, money: s.money }));
      broadcastStation();
      hostSend({ type: "broadcast", event: "apply", payload: { state: shareState() } });
      stationChat(L.craftSold((lang === "en" ? good.nameEn : good.name), n, gain), "\u{1F4B0}");
      return true;
    }
    return false;
  }
  // Boucle de production des ateliers (hôte, ~1 Hz depuis la boucle temps).
  function updateCrafts() {
    const s = sharedRef.current, w = worldRef.current;
    if (!w || !s.crafts) return;
    const now = Date.now();
    const stock = s.craftStock || (s.craftStock = E.newCraftStock());
    let stockChanged = false, flourChanged = false, craftsMetaChanged = false;
    const bh = s.crafts.beehive;
    if (bh && bh.built) {
      if (!bh.nextAt || bh.nextAt > now + C.HONEY_MS) bh.nextAt = now + C.HONEY_MS;
      else if (now >= bh.nextAt) { bh.nextAt = now + C.HONEY_MS; stock.honey++; stockChanged = true; }
    }
    const fr = s.crafts.fromagerie;
    if (fr && fr.built) {
      if (!fr.nextAt || fr.nextAt > now + C.CHEESE_MS) fr.nextAt = now + C.CHEESE_MS;
      else if (now >= fr.nextAt) {
        const src = findInvWith("products", C.COW_ANIMAL, C.CHEESE_MILK_COST);
        if (src) { src.fm.inv.products[C.COW_ANIMAL] -= C.CHEESE_MILK_COST; stock.cheeseWheel++; stockChanged = true; fr.nextAt = now + C.CHEESE_MS; broadcastFarmerDelta(src.fm); }
        else fr.nextAt = now + Math.min(C.CHEESE_MS, 30000); // pas de lait : réessaie bientôt
      }
    }
    const bk = s.crafts.bakery;
    if (bk && bk.built) {
      // Zip 258 (demande Guillaume) : la boulangerie ne tourne QU'EN JOURNÉE
      // (5h30 -> 19h). Hors horaires, four éteint : ni production, ni alerte.
      const tmin = E.gameTimeMin(s.dayStartAt, now);
      const open = tmin >= C.BAKERY_OPEN_MIN && tmin < C.BAKERY_CLOSE_MIN;
      if (!open) {
        // fermé : on repousse la prochaine fournée et on efface une éventuelle
        // alerte (elle ne concerne que les heures d'ouverture).
        if (!bk.nextAt || bk.nextAt < now) bk.nextAt = now + C.PASTRY_MS;
        if (bk.alert) { bk.alert = false; craftsMetaChanged = true; }
      } else if (!bk.nextAt || bk.nextAt > now + C.PASTRY_MS) {
        bk.nextAt = now + C.PASTRY_MS;
      } else if (now >= bk.nextAt) {
        const milkSrc = findInvWith("products", C.COW_ANIMAL, C.PASTRY_MILK);
        const eggSrc = findInvWith("products", C.HEN_ANIMAL, C.PASTRY_EGG);
        if ((s.flour | 0) >= C.PASTRY_FLOUR && milkSrc && eggSrc) {
          // Fournée : 1 lait + 1 farine + 6 œufs -> PASTRY_BATCH pâtisseries.
          s.flour -= C.PASTRY_FLOUR; flourChanged = true;
          milkSrc.fm.inv.products[C.COW_ANIMAL] -= C.PASTRY_MILK; eggSrc.fm.inv.products[C.HEN_ANIMAL] -= C.PASTRY_EGG;
          stock.pastry += C.PASTRY_BATCH; stockChanged = true; bk.nextAt = now + C.PASTRY_MS;
          broadcastFarmerDelta(milkSrc.fm); if (eggSrc.id !== milkSrc.id) broadcastFarmerDelta(eggSrc.fm);
          // Stock revenu -> l'alerte s'efface toute seule (demande Guillaume).
          if (bk.alert) { bk.alert = false; craftsMetaChanged = true; }
        } else {
          // Intrants insuffisants : la pâtissière stoppe et lève une ALERTE
          // (une seule fois, jusqu'à résolution) — coin haut-droite + badge
          // dans le menu Employés. Réessaie bientôt.
          bk.nextAt = now + Math.min(C.PASTRY_MS, 30000);
          if (!bk.alert) { bk.alert = true; craftsMetaChanged = true; stationChat(L.bakeryAlertToast, "⚠️"); }
        }
      }
    }
    if (stockChanged || flourChanged || craftsMetaChanged) {
      dirtyRef.current = true;
      const payload = { crafts: s.crafts };
      if (stockChanged) payload.craftStock = stock;
      if (flourChanged) { payload.flour = s.flour; setFlour(s.flour); }
      hostSend({ type: "broadcast", event: "apply", payload });
    }
  }
  function updateVisitors(dt) {
    const w = worldRef.current, s = sharedRef.current;
    if (!w) return;
    if (!s.station) s.station = E.newStationState();
    const st = s.station, now = Date.now();
    if (!Array.isArray(st.visitors)) st.visitors = [];
    // Zip 259 : retour des ex-résidents exclus. Quand l'échéance d'un exilé est
    // atteinte et qu'il reste de la place, on le fait revenir en visiteur
    // spécial (offer.type "plea") pour qu'il vienne supplier/réagir. Retiré de
    // la file dès qu'il est de retour (une seule tentative).
    if (Array.isArray(st.exiles) && st.exiles.length) {
      for (let i = st.exiles.length - 1; i >= 0; i--) {
        const ex = st.exiles[i];
        if (!ex || now < ex.returnAt) continue;
        if (st.visitors.length >= C.VISITORS_MAX || st.visitors.some(v => v.rid === ex.rid)) continue; // pas de place / déjà là : on réessaie au prochain tick
        st.visitors.push({
          // disp "neutral" volontaire : le plea NE déclenche aucun dégât (seul
          // offer.type "demand" en provoque) ; l'humeur vit dans offer.mood.
          rid: ex.rid, disp: "neutral",
          offer: { type: "plea", mood: ex.mood, vi: ex.vi | 0 },
          x: C.STATION_PLATFORM.x + 1, y: C.STATION.y + C.STATION.h + 1.5,
          dir: 2, moving: false, animT: 0, speedMul: 0.9,
          phase: "train", phaseUntil: now + C.VISITOR_TRAIN_MS,
          waitUntil: 0, waitStartedAt: 0, deadline: 0, votes: null, voteUntil: 0,
        });
        st.exiles.splice(i, 1);
        const ro = C.VISITOR_ROSTER[ex.rid];
        stationChat(L.exileReturnChat(ro ? ro.name : "?"), "\u{1F6B6}");
        broadcastStation();
      }
    }
    // Expired repair window: the damage becomes permanent.
    if (st.damage && now > st.damage.until) {
      st.damage = null;
      stationChat(L.repairExpired, "\u{1F6E0}\uFE0F");
      broadcastStation();
    }
    // Round scheduler: when the timer fires and there is room, a whole group
    // (1..VISITORS_MAX, random each round) steps off the train.
    if (!st.nextVisitAt) { E.scheduleNextVisit(st, E.farmPopularity(s, w), Math.random); dirtyRef.current = true; }
    else if (now >= st.nextVisitAt) {
      if (st.visitors.length < C.VISITORS_MAX) {
        const added = E.spawnVisitorGroup(st, Math.random, !!st.damage, visitorStockCtx());
        E.scheduleNextVisit(st, E.farmPopularity(s, w), Math.random);
        if (added.length === 1) stationChat(L.visitorArrived(rosterOf(added[0].rid).name), "\u{1F682}");
        else if (added.length > 1) stationChat(L.visitorsArrived(added.map(nv => rosterOf(nv.rid).name).join(", ")), "\u{1F682}");
        if (added.length) broadcastStation();
      } else E.scheduleNextVisit(st, 0, Math.random);
    }
    // Waypoints: platform -> south of the townhall -> its door (and back).
    // The station sits WEST of the river, like the townhall: no crossing.
    // Waiting spots fan out west of the door by slot so the group forms a row.
    const WP = [{ x: 5, y: 30.5 }, { x: 5, y: 36.5 }, { x: 43.5, y: 36.5 }, { x: 43.5, y: 36.3 }];
    let removed = false;
    for (const v of st.visitors) {
      const slotX = (v.slot | 0) * 1.3;
      const walkTo = (tx, ty, speedMul) => {
        const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
        if (d < 0.08) { v.moving = false; return true; }
        // Zip 234: per-visitor speed variance (v.speedMul, rolled at spawn)
        // stacks with the situational multiplier (0.45 while strolling), so
        // a group spreads out naturally along the path.
        const step = Math.min(d, C.VISITOR_SPEED * (v.speedMul || 1) * (speedMul || 1) * dt);
        v.x += (dx / d) * step; v.y += (dy / d) * step;
        v.moving = true; v.animT = (v.animT || 0) + dt * 6;
        // Zip 234 debug fix: eastbound visitors used to face WEST (dir was
        // hardcoded to 2 for any horizontal move) — dir 3 is "right".
        v.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
        return false;
      };
      const wpAt = (i) => { const wp = WP[Math.max(0, Math.min(i, WP.length - 1))]; return i >= 2 ? { x: wp.x - slotX, y: wp.y } : wp; };
      if (v.phase === "train") {
        if (now >= v.phaseUntil) { v.phase = "walk"; v.wpi = 1; broadcastStation(); }
      } else if (v.phase === "walk") {
        const wp = wpAt(Math.min(v.wpi || 1, WP.length - 1));
        if (walkTo(wp.x, wp.y)) {
          v.wpi = (v.wpi || 1) + 1;
          if (v.wpi >= WP.length) {
            v.phase = "wait"; v.moving = false; v.dir = 1;
            // Zip 233: 10-minute real-time FLOOR for every visit type; "prep"
            // orders are sized on the item's grow time (capped) instead.
            v.waitStartedAt = now;
            v.waitUntil = now + E.visitorWaitMs(v.offer);
            if (v.offer && v.offer.type === "demand") v.deadline = now + C.HOSTILE_DEADLINE_MS;
            if (v.offer && v.offer.type === "stay") { v.votes = {}; v.voteUntil = now + C.VOTE_DEADLINE_MS; }
            broadcastStation();
          }
        }
      } else if (v.phase === "wait") {
        if (v.offer && v.offer.type === "demand" && now > v.deadline) hostExecuteHostileDamage(v);
        else if (v.offer && v.offer.type === "stay" && now > v.voteUntil) hostFinalizeVote(v);
        else if (now > v.waitUntil) {
          // Zip 234: a visitor whose order was FULFILLED lingered on the
          // square (see startLinger) — their exit line is a happy goodbye,
          // not the old "left without an answer" one (which stays for
          // genuinely unanswered visits).
          v.phase = "leave";
          stationChat(v.offer && v.offer.type === "done" ? L.visitorHomeChat(rosterOf(v.rid).name) : L.visitorLeftChat(rosterOf(v.rid).name));
          broadcastStation();
        }
        else if (v.waitStartedAt && now - v.waitStartedAt > C.VISITOR_WANDER_AFTER_MS) {
          // Zip 233: after 30 real minutes they stop standing rigidly and
          // stroll around the townhall square (same roamTarget/nextRoamAt
          // pattern as Greg/rabbits). Still phase "wait": every deal / pay /
          // vote / chat path keeps working unmodified, and proximity checks
          // read the live x/y.
          // Zip 235 (Guillaume: "allow visitors to walk all over the map
          // when they linger"): roamTarget draws from the WHOLE farm, not
          // just the townhall square. Recall ("meet at townhall" button)
          // pins the target back on the square for VISITOR_RECALL_MS.
          const recalled = v.recallUntil && now < v.recallUntil;
          if (!v.roamTarget || now >= (v.nextRoamAt || 0) || Math.hypot(v.roamTarget.x - v.x, v.roamTarget.y - v.y) < 0.15) {
            v.nextRoamAt = now + 2500 + Math.random() * 4500;
            if (recalled) {
              // Small step back toward the townhall.
              v.roamTarget = { x: 40.5 + Math.random() * 6.5, y: 36.2 + Math.random() * 3.4 };
            } else if (Math.random() < 0.25) {
              v.roamTarget = null; v.moving = false;
            } else {
              // Random hop within a HOP-tile radius; keep it walkable.
              let tries = 0, tx, ty;
              do {
                tx = Math.max(4, Math.min(C.MAP_W - 4, v.x + (Math.random() * 2 - 1) * C.VISITOR_ROAM_HOP));
                ty = Math.max(4, Math.min(C.MAP_H - 4, v.y + (Math.random() * 2 - 1) * C.VISITOR_ROAM_HOP));
                tries++;
              } while (tries < 6 && E.blockedTile(w, tx, ty));
              v.roamTarget = { x: tx, y: ty };
            }
          }
          if (v.roamTarget) walkTo(v.roamTarget.x, v.roamTarget.y, 0.45);
        }
      } else if (v.phase === "leave") {
        if (v.wpi === undefined || v.wpi >= WP.length) v.wpi = WP.length - 2;
        const wp = wpAt(Math.max(0, v.wpi));
        if (walkTo(wp.x, wp.y)) {
          v.wpi -= 1;
          if (v.wpi < 0) { v.phase = "depart"; v.phaseUntil = now + C.VISITOR_TRAIN_MS; v.moving = false; broadcastStation(); }
        }
      } else if (v.phase === "depart") {
        if (now >= v.phaseUntil) {
          v._gone = true; removed = true;
          // Zip 250: un cadeau "promis" (2/10) devient une livraison différée,
          // datée depuis le DÉPART du visiteur (3 à 5 min), destinée au sac du
          // joueur qui a conclu le deal.
          if (v.promisedGift && v.promisedGift.farmerId && v.promisedGift.reward) {
            if (!Array.isArray(st.promisedGifts)) st.promisedGifts = [];
            const delay = C.VISITOR_GIFT_DELAY_MIN_MS + Math.random() * (C.VISITOR_GIFT_DELAY_MAX_MS - C.VISITOR_GIFT_DELAY_MIN_MS);
            st.promisedGifts.push({ farmerId: v.promisedGift.farmerId, fromRid: (v.promisedGift.fromRid != null ? v.promisedGift.fromRid : v.rid), reward: v.promisedGift.reward, deliverAt: now + delay });
            dirtyRef.current = true;
          }
        }
      }
    }
    if (removed) {
      st.visitors = st.visitors.filter(v => !v._gone);
      broadcastStation();
    }
    hostDeliverPromisedGifts(now); // zip 250: dépose les cadeaux promis échus
    // Light continuous broadcast while visitors move (200 ms throttle):
    // an ARRAY of per-visitor positions matched by rid on the guests.
    visitorNetRef.current += dt;
    if (visitorNetRef.current >= C.VISITOR_NET_MS / 1000 && st.visitors.length && netCanBroadcast()) {
      visitorNetRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { visitorSim: st.visitors.map(v => ({ rid: v.rid, x: v.x, y: v.y, dir: v.dir, moving: v.moving, animT: v.animT, phase: v.phase })) } });
    }
  }
  function shareState() { const s = sharedRef.current; return { money: s.money, day: s.day, dayStartAt: s.dayStartAt, totalEarned: s.totalEarned }; }
  function toolName(k) { return (lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES)[k]; }

  // -------- Tous : application des deltas reçus --------
  function applyDeltas(p) {
    const w = worldRef.current;
    if (w && p.tiles) for (const tl of p.tiles) {
      w.ground[idxOf(E.xOf(tl.i), E.yOf(tl.i))] = tl.g; w.objects[tl.i] = tl.o;
      if (tl.o === C.O_NONE) w.objHp.delete(tl.i);
      else if (typeof tl.hp === "number") w.objHp.set(tl.i, tl.hp);
      else if (tl.o === C.O_STUMP) w.objHp.set(tl.i, 2);
      minimapDirtyRef.current = true;
    }
    if (w && p.crops) for (const cr of p.crops) { if (cr.c) w.crops.set(cr.i, { t: cr.c.t, bankedMs: cr.c.bankedMs || 0, wateredAt: cr.c.wateredAt || null }); else w.crops.delete(cr.i); }
    // Moulins (chantier 2026-07) : [i, wheat, nextAt] par tuile changée
    // (dépôt de blé côté joueur, ou production côté tick hôte 1 Hz — voir
    // hostHandleReqUnsafe et le dayTimer plus bas). Même mécanique que
    // p.crops ci-dessus, mais sur w.mills.
    if (w && p.mills) for (const [i, wheat, nextAt] of p.mills) w.mills.set(i, { wheat, nextAt });
    if (p.state) { const s = sharedRef.current; s.money = p.state.money; s.day = p.state.day; s.dayStartAt = p.state.dayStartAt; s.totalEarned = p.state.totalEarned; setHud(h => ({ ...h, money: s.money, day: s.day })); }
    if (p.farmer && p.farmer.id !== me.id && Array.isArray(p.farmer.pets)) {
      const r = playersRef.current.get(p.farmer.id);
      if (r) r.pets = p.farmer.pets; // zip 247: everyone sees everyone's pets, not just the owner
    }
    if (p.farmer && p.farmer.id === me.id) {
      invRef.current = p.farmer.inv; toolsRef.current = p.farmer.tools; energyRef.current = p.farmer.energy;
      setMyInv(p.farmer.inv); setMyTools(p.farmer.tools); setMyEnergy(p.farmer.energy); if (p.farmer.quests) setMyQuests(p.farmer.quests);
      if (Array.isArray(p.farmer.pets)) setMyPets(p.farmer.pets); // zip 236
      if (typeof p.farmer.injuredUntil === "number" && p.farmer.injuredUntil !== injuredUntilRef.current) {
        const wasInjured = injuredUntilRef.current > Date.now();
        injuredUntilRef.current = p.farmer.injuredUntil; setInjuredUntil(p.farmer.injuredUntil);
        // Nouvelle blessure (pas déjà blessé) : le loup vient de mordre -> on
        // ramène le fermier chez lui, incapable d'agir pendant C.INJURED_MS.
        if (!wasInjured && p.farmer.injuredUntil > Date.now()) {
          const m = meRef.current;
          // Zip 234 debug fix: reset the ZONE too — getting injured while in
          // Valley Town (or the evil map, via host-side paths) used to beam
          // farm spawn coordinates onto the wrong map.
          if (m) { m.zone = "farm"; m.x = C.SPAWN.x; m.y = C.SPAWN.y; m.moving = false; sendPos(); }
          setWolfBite(null);
          pushToast(L.toastInjured);
        }
      }
    }
    if (p.wolfBite && p.wolfBite.id === me.id && !isInjured()) setWolfBite({ wolfId: p.wolfBite.wolfId });
    // Créatures maléfiques partagées (2026-07) : positions simulées par
    // l'hôte, et déclenchement du mini-jeu de morsure chez la cible.
    // Correctif latence/freeze 2026-07 : l'HÔTE est la seule autorité sur
    // les créatures partagées — appliquer l'écho self:true de son PROPRE
    // broadcast (vieux de ~150 ms + aller-retour serveur) écrasait ses
    // mutations fraîches (dont biteTargetId/biteDeadline) : les morsures se
    // re-déclenchaient en boucle (spam d'apply `evilBite` chez la cible,
    // mini-jeu qui se rouvrait sans fin -> freeze) et les monstres faisaient
    // du va-et-vient. Les invités, eux, appliquent normalement.
    if (p.evilMonsters && !isHost) sharedRef.current.evilMonsters = p.evilMonsters;
    if (p.evilBite && p.evilBite.id === me.id && !evilBiteRef.current && !isInjured() && meRef.current && meRef.current.zone === "evil" && !fishMiniRef.current) setEvilBite({ monsterId: p.evilBite.monsterId });
    // Statut "blessé" diffusé à TOUTE la room (voir resolveWolfBiteOutcome et
    // resolveHeal côté hôte) : permet aux autres joueurs de repérer un
    // fermier blessé pour le soigner, même s'ils n'étaient pas la cible.
    if (p.injured) {
      if (p.injured.id === me.id) {
        injuredUntilRef.current = p.injured.until; setInjuredUntil(p.injured.until);
      } else {
        const rp = playersRef.current.get(p.injured.id);
        if (rp) rp.injuredUntil = p.injured.until;
      }
    }
    if (p.toast && p.toast.id === me.id) pushToast(toastMsg(p.toast.key, p.toast.petId != null ? p.toast.petId : p.toast.n));
    // Zip 252 : cadeau animal en attente mais sac plein -> ouvre le choix.
    if (p.petChoice && p.petChoice.id === me.id) setPetChoice({ petId: p.petChoice.petId });
    if (p.chat) addChat(p.chat.from, p.chat.msg);
    if (p.fx) for (const f of p.fx) spawnFx(f);
    if (p.horses) { sharedRef.current.horses = p.horses; syncBuildings(); }
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    if (p.wolves) { sharedRef.current.wolves = p.wolves; minimapDirtyRef.current = true; }
    if (p.rabbits) { sharedRef.current.rabbits = p.rabbits; minimapDirtyRef.current = true; }
    // 2026-07 station update. Echo guard (!isHost): the host simulates the
    // visitor continuously, its own echo must NEVER overwrite the live
    // object (root cause of the zip 230 evil-monster desync).
    if (p.station !== undefined && !isHost) {
      sharedRef.current.station = E.migrateStation(p.station, p.hostNow);
      setStationSt(sharedRef.current.station ? JSON.parse(JSON.stringify(sharedRef.current.station)) : null);
    }
    // Zip 251: liste des décorations posées (ferme + Valley Town). L'hôte est
    // autoritaire ; l'écho ne doit pas écraser sa liste vivante.
    if (p.decor !== undefined && !isHost) { sharedRef.current.decor = E.migrateDecor(p.decor); minimapDirtyRef.current = true; }
    // Zip 252 : ateliers d'artisans + stock de produits artisanaux (communs).
    if (p.crafts !== undefined && !isHost) { sharedRef.current.crafts = E.migrateCrafts(p.crafts); minimapDirtyRef.current = true; }
    if (p.craftStock !== undefined && !isHost) { sharedRef.current.craftStock = E.migrateCraftStock(p.craftStock); }
    if (p.residentSim && !isHost) { // positions des résidents baladeurs (léger, 2 Hz)
      const list = sharedRef.current.station && sharedRef.current.station.residents;
      if (list && Array.isArray(p.residentSim)) for (const sim of p.residentSim) {
        const r = list.find(rr => rr.rid === sim.rid);
        if (r) { r.x = sim.x; r.y = sim.y; r.dir = sim.dir; r.moving = sim.moving; r.animT = sim.animT; }
      }
    }
    if (p.visitorSim && !isHost) {
      // Zip 233: an ARRAY of light per-visitor positions, matched by rid.
      const list = sharedRef.current.station && sharedRef.current.station.visitors;
      if (list && Array.isArray(p.visitorSim)) for (const sim of p.visitorSim) {
        const stv = list.find(vv => vv.rid === sim.rid);
        if (stv) { stv.x = sim.x; stv.y = sim.y; stv.dir = sim.dir; stv.moving = sim.moving; stv.animT = sim.animT; stv.phase = sim.phase; }
      }
    }
    if (p.greg !== undefined) { sharedRef.current.greg = p.greg; minimapDirtyRef.current = true; }
    if (p.soan !== undefined) { sharedRef.current.soan = p.soan; minimapDirtyRef.current = true; }
    if (p.harald !== undefined) { sharedRef.current.harald = p.harald; minimapDirtyRef.current = true; } // zip 260
    if (p.wellBuilt) { sharedRef.current.wellBuilt = true; minimapDirtyRef.current = true; syncBuildings(); }
    if (p.coop !== undefined) { sharedRef.current.coop = p.coop; setCoop(p.coop); }
    if (p.barn !== undefined) { sharedRef.current.barn = p.barn; setBarn(p.barn); minimapDirtyRef.current = true; }
    if (p.salveCraft !== undefined) {
      // Correctif audit 2026-07 : brewingUntil est un timestamp posé avec
      // l'horloge de l'HÔTE — on le relocalise sur l'horloge locale via
      // hostNow, pour que la fin de concoction soit vue au même moment par
      // tous, même avec des horloges machines décalées.
      const sc = p.salveCraft;
      if (sc && sc.brewingUntil > 0 && typeof p.hostNow === "number") sc.brewingUntil = Date.now() + (sc.brewingUntil - p.hostNow);
      sharedRef.current.salveCraft = sc; setSalveCraft(sc);
    }
    if (p.house) {
      // Maison à niveaux (2026-07) : même relocalisation que brewingUntil.
      const hh = { ...p.house };
      if (hh.upgradeUntil > 0 && typeof p.hostNow === "number") hh.upgradeUntil = Date.now() + (hh.upgradeUntil - p.hostNow);
      sharedRef.current.house = hh; setHouse(hh);
    }
    if (p.gems) { sharedRef.current.gems = p.gems; setGems(p.gems); }
    if (p.flour !== undefined) { sharedRef.current.flour = p.flour; setFlour(p.flour); }
    if (p.gregStock !== undefined) { sharedRef.current.gregStock = p.gregStock; setGregStock(p.gregStock); }
    if (p.fertilizerShop !== undefined) { sharedRef.current.fertilizerShop = p.fertilizerShop; setFertilizerShop(p.fertilizerShop); }
    if (p.rabbitChallenge !== undefined) { sharedRef.current.rabbitChallenge = p.rabbitChallenge; setRabbitChallenge(p.rabbitChallenge); }
    if (p.hatWon) {
      // Diffusion du trophée gagné (correctif 2026-07 : temporaire, voir
      // C.HAT_DISPLAY_MS) : même principe que `p.injured` pour la blessure —
      // état persistant (avec expiration) du fermier concerné, propagé à
      // tous pour qu'il reste visible (jusqu'à expiration) même après un
      // refresh distant.
      if (p.hatWon.id === me.id) { hatUntilRef.current = p.hatWon.hatUntil; setHatUntil(p.hatWon.hatUntil); }
      else { const rp = playersRef.current.get(p.hatWon.id); if (rp) rp.hatUntil = p.hatWon.hatUntil; }
    }
  }
  function applyNewDay(p) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current; s.day = p.day; s.dayStartAt = p.dayStartAt;
    if (p.tiles) for (const tl of p.tiles) { w.ground[tl.i] = tl.g; w.objects[tl.i] = tl.o; if (tl.o !== C.O_NONE && tl.o !== C.O_STUMP) w.objHp.set(tl.i, tl.o === C.O_ROCK ? C.ROCK_HP : C.TREE_HP); minimapDirtyRef.current = true; }
    if (p.crops) for (const cr of p.crops) { if (cr.c) w.crops.set(cr.i, { t: cr.c.t, bankedMs: cr.c.bankedMs || 0, wateredAt: cr.c.wateredAt || null }); else w.crops.delete(cr.i); }
    // Énergie restaurée pour tous (accord avec l'hôte).
    energyRef.current = C.MAX_ENERGY; setMyEnergy(C.MAX_ENERGY);
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    if (p.fertilizerShop !== undefined) { sharedRef.current.fertilizerShop = p.fertilizerShop; setFertilizerShop(p.fertilizerShop); }
    setHud(h => ({ ...h, day: p.day }));
    pushToast(L.toastNewDay(p.day));
  }
  function toastMsg(key, n) {
    if (key === "berriesPicked") return L.toastBerriesPicked(n | 0);
    if (key === "fruitPicked")   return L.toastFruitPicked(n | 0);
    if (key === "fruitCooldown") return L.toastFruitCooldown;
    if (key === "petCaught")     return L.petCaughtToast(C.petName(n, lang === "en"));
    if (key === "petReleased")   return L.bagReleasedToast(C.petName(n, lang === "en"));
    if (key === "bagFull")       return L.bagPetsFull(C.MAX_PETS);
    return { tired: L.toastTired, farShop: L.toastFarShop, farBin: L.toastFarBin, noGold: L.toastNoGold, toolMax: L.toastToolMax, needWater: L.toastNeedWater, penFull: L.penFull, noFence: L.toastNoFence, noWood: L.toastNoWood, noStone: L.toastNoStone, noWallStock: L.toastNoWallStock, noPathStock: L.toastNoPathStock, noLampStock: L.toastNoLampStock, noScarecrowStock: L.toastNoScarecrowStock, noGrassStock: L.toastNoGrassStock, noMillStock: L.toastNoMillStock, millNotEmpty: L.toastMillNotEmpty, noWheatToDeposit: L.toastNoWheatToDeposit, millFull: L.toastMillFull, actionFailed: L.toastActionFailed, coopNone: L.toastCoopNone, farCoop: L.toastFarCoop, coopNothing: L.toastCoopNothing, barnMax: L.toastBarnMax, farBarn: L.toastFarBarn, barnReady: L.toastBarnReadyWait, barnNotReady: L.toastBarnNotReady, barnNeedMoney: L.toastBarnNeedMoney, sleepFull: L.toastSleepFull, notInjured: L.toastNotInjured, noHealKit: L.toastNoHealKit, healTooFar: L.toastHealTooFar, gregNotHired: L.toastGregNotHired, gregNoRoom: L.toastGregNoRoom, gregNoFertilizer: L.toastGregNoFertilizer, soanNotHired: L.toastSoanNotHired, soanNoRiver: L.toastSoanNoRiver, farCauldron: L.toastFarCauldron, noFishToDeposit: L.toastNoFishToDeposit, cauldronMissing: L.toastCauldronMissing, cauldronAlreadyTaken: L.toastCauldronAlreadyTaken, noCauldronStock: L.toastNoCauldronStock, cauldronNotEmpty: L.toastCauldronNotEmpty, cauldronBrewing: L.toastCauldronBrewing, cauldronNothingToCollect: L.toastCauldronNothingToCollect, cauldronHasEnough: L.toastCauldronHasEnough, visitorNotEnough: L.visitorNotEnough, decorNone: L.decorNone, decorPicked: L.decorPicked, objReturned: L.objReturned, residentNoRoom: L.residentNoRoom, artisanNoResident: L.artisanNoResident, voyagerBusy: L.voyagerBusyToast, kickVoted: L.kickVotedToast }[key] || "";
  }

  // -------- Hôte : boucle temps + persistance --------
  useEffect(() => {
    if (!isHost) return;
    const dayTimer = setInterval(() => {
      // Fin des travaux de la maison (2026-07) : montée de niveau effective,
      // diffusée à tous (avec hostNow pour la relocalisation d'horloge).
      {
        const hh0 = sharedRef.current.house;
        if (hh0 && hh0.upgradeUntil > 0 && Date.now() >= hh0.upgradeUntil) {
          hh0.level = Math.min(C.HOUSE_MAX_LEVEL, hh0.level + 1);
          hh0.upgradeUntil = 0;
          dirtyRef.current = true;
          channelRef.current?.send({ type: "broadcast", event: "apply", payload: { house: { ...hh0 }, hostNow: Date.now() } });
          broadcastChat("🏠", L.houseUpgraded(hh0.level));
        }
      }
      const s = sharedRef.current, w = worldRef.current;
      if (!w) return;
      // Mission collaborative : démarre automatiquement dès que 2 fermiers
      // (ou plus) sont en ligne en même temps, si aucune n'est déjà en cours.
      // S'arrête (sans perdre la progression) si tout le monde repart sauf un.
      const online = playersRef.current.size + 1;
      if (!s.coop && online >= 2) {
        s.coop = E.pickCoopMission();
        const def = C.COOP_MISSIONS.find(m2 => m2.id === s.coop.id);
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { coop: s.coop } });
        broadcastChat("🚧", L.coopStarted(lang === "en" ? def.nameEn : def.name));
        dirtyRef.current = true;
      }
      // Défi "chasse aux lapins" (chantier 2026-07, demande Guillaume) :
      // contrairement à la mission collaborative ci-dessus (auto-démarrée),
      // ce défi n'est JAMAIS déclenché automatiquement — seulement PROPOSÉ à
      // l'hôte (popup locale, `rabbitChallengeOffer`, jamais partagée aux
      // autres joueurs) tant qu'aucun défi n'est déjà en cours et qu'au moins
      // `RABBIT_CHALLENGE_MIN_PLAYERS` fermiers sont en ligne en même temps.
      // C'est l'hôte qui choisit ensuite d'activer réellement le défi (voir
      // `activateRabbitChallenge`). Un seul jet par tick tant que la popup
      // n'a pas déjà été proposée (`rabbitChallengeOfferRef`), pour éviter de
      // la faire réapparaître en boucle si l'hôte l'ignore sans la fermer.
      if (!s.rabbitChallenge && online >= C.RABBIT_CHALLENGE_MIN_PLAYERS && !rabbitChallengeOfferRef.current
        && Math.random() < C.RABBIT_CHALLENGE_OFFER_CHANCE) {
        rabbitChallengeOfferRef.current = true;
        setRabbitChallengeOffer(true);
      }
      // Repousse d'herbe (chantier 2026-07, demande Guillaume) : contrairement
      // au lampadaire/épouvantail (état "prêt" purement dérivé à l'affichage,
      // jamais de mutation du monde), une case G_GRASS_GROWING doit finir par
      // redevenir G_GRASS pour de vrai (redevenir labourable, etc.), donc on
      // vérifie ici à chaque tick (1s, granularité largement suffisante pour
      // un chantier de 5s) si son délai est écoulé. Parcours de la carte
      // entière : coût négligeable (un simple survol d'un tableau d'entiers),
      // mêmes ordres de grandeur que buildMinimapBase.
      {
        const grassTiles = [];
        for (let gi = 0; gi < w.ground.length; gi++) {
          if (w.ground[gi] === C.G_GRASS_GROWING && E.buildReady(w.objHp.get(gi), Date.now())) {
            w.ground[gi] = C.G_GRASS; w.objHp.delete(gi);
            recordTileOverride(gi);
            grassTiles.push({ i: gi, g: w.ground[gi], o: w.objects[gi] });
          }
        }
        if (grassTiles.length) {
          minimapDirtyRef.current = true; dirtyRef.current = true;
          channelRef.current?.send({ type: "broadcast", event: "apply", payload: { tiles: grassTiles } });
        }
      }
      // Zip 235 — Spring: seed a few berry bushes across the farm and keep
      // topping them up until BERRY_BUSH_MAX is reached. Purely host-driven,
      // rare (~one attempt per 5s), so no visible spikes on gathering.
      if (E.seasonOf().key === "spring") {
        let existing = 0;
        for (let bi = 0; bi < w.objects.length; bi++) if (w.objects[bi] === C.O_BERRY_BUSH) existing++;
        if (existing < C.BERRY_BUSH_MAX && Math.random() < 0.2) {
          let tries = 30;
          while (tries-- > 0) {
            const tx = 4 + Math.floor(Math.random() * (C.MAP_W - 8));
            const ty = 4 + Math.floor(Math.random() * (C.MAP_H - 8));
            const bi = ty * C.MAP_W + tx;
            if (w.ground[bi] === C.G_GRASS && w.objects[bi] === C.O_NONE) {
              w.objects[bi] = C.O_BERRY_BUSH;
              w.objHp.set(bi, C.BERRY_BUSH_HP);
              recordTileOverride(bi);
              channelRef.current?.send({ type: "broadcast", event: "apply", payload: { tiles: [{ i: bi, g: w.ground[bi], o: w.objects[bi], hp: C.BERRY_BUSH_HP }] } });
              dirtyRef.current = true;
              break;
            }
          }
        }
      }
      // Zip 235 — Weekly passage-world rotation announcement. Fires once per
      // change of week (in-game days -> week index). Everyone reads the same
      // day, so hosts and clients all show the same toast at the same moment.
      {
        const idx = E.passageWorldIndex(sharedRef.current.day || 1);
        if (passageIdxRef.current !== idx) {
          passageIdxRef.current = idx;
          const spec = E.passageWorldOf(sharedRef.current.day || 1);
          broadcastChat("🌀", L.passageWorldToast(lang === "en" ? spec.nameEn : spec.name));
        }
      }
      // Production continue des moulins (chantier 2026-07, transformation
      // artisanale demandée par Guillaume) : même esprit que la repousse
      // d'herbe ci-dessus (état réellement muté côté hôte à chaque tick, pas
      // purement dérivé), mais via E.millTick (fonction pure, voir
      // fermeEngine.js) qui calcule le nouvel état + les sacs produits depuis
      // le dernier tick. w.mills ne contient que les moulins avec un état non
      // trivial n'est PAS garanti ici (un moulin fraîchement posé y est
      // ajouté à wheat:0 par resolveAct/"mill") : on parcourt donc toute la
      // Map, son cardinal reste minuscule (quelques moulins par ferme tout au
      // plus) contrairement au parcours de carte ci-dessus.
      {
        const now = Date.now();
        const millTilesOut = [];
        let sacksProduced = 0;
        for (const [mi, ms] of w.mills) {
          const r = E.millTick(ms, now);
          if (r.wheat !== ms.wheat || r.nextAt !== ms.nextAt) {
            w.mills.set(mi, { wheat: r.wheat, nextAt: r.nextAt });
            millTilesOut.push([mi, r.wheat, r.nextAt]);
          }
          if (r.sacks > 0) sacksProduced += r.sacks;
        }
        if (sacksProduced > 0) s.flour = (s.flour || 0) + sacksProduced;
        if (millTilesOut.length) {
          dirtyRef.current = true;
          const payload = { mills: millTilesOut };
          if (sacksProduced > 0) payload.flour = s.flour;
          channelRef.current?.send({ type: "broadcast", event: "apply", payload });
        }
      }
      if (Date.now() - s.dayStartAt >= C.DAY_REAL_MS) {
        const { tiles } = E.newDay(w, farmersRef.current, s.day, s.seed);
        s.day += 1; s.dayStartAt = Date.now();
        // Réapparition de l'engrais en boutique (chantier 2026-07, suite plan
        // validé) : tous les FERTILIZER_RESTOCK_EVERY_N_DAYS jours, le stock
        // shop remonte à FERTILIZER_SHOP_STOCK (épuisable entre-temps, jamais
        // remis à niveau hors de ce cycle — cohérent avec "ressource rare").
        const shop = sharedRef.current.fertilizerShop || (sharedRef.current.fertilizerShop = { stock: 0, lastRestockDay: 0 });
        if (s.day - shop.lastRestockDay >= C.FERTILIZER_RESTOCK_EVERY_N_DAYS) {
          shop.stock = C.FERTILIZER_SHOP_STOCK; shop.lastRestockDay = s.day;
        }
        const tilesOut = tiles.map(i => { recordTileOverride(i); return { i, g: w.ground[i], o: w.objects[i] }; });
        // Depuis le zip 151, la pousse/l'arrosage/la production animale sont en
        // temps réel (voir cropGrowState/animalReady) : ce passage de jour ne
        // fait plus produire les animaux, il ne fait que régénérer un peu de
        // nature et restaurer l'énergie (voir E.newDay).
        dirtyRef.current = true;
        channelRef.current?.send({ type: "broadcast", event: "newday", payload: { day: s.day, dayStartAt: s.dayStartAt, tiles: tilesOut, crops: [], animals: s.animals, fertilizerShop: shop } });
        broadcastChat("☀", L.chatNewDay(s.day));
        if (E.isStormyDay(s.day)) {
          broadcastChat("⛈", L.chatStormyDay);
        }
      }
    }, 1000);
    const saveTimer = setInterval(() => {
      if (!dirtyRef.current || !worldRef.current || !farmCodeRef.current) return;
      dirtyRef.current = false;
      persistFarm();
    }, 3000);
    return () => { clearInterval(dayTimer); clearInterval(saveTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Entrée directe si le personnage est déjà mémorisé pour cette ferme : dès
  // que le monde est prêt, si mon fermier existe déjà (nom enregistré), on
  // saute l'écran de choix et on rejoint directement avec ce personnage.
  useEffect(() => {
    if (!worldReady || phase === "playing" || autoJoinTriedRef.current) return;
    const saved = farmersRef.current[me.id];
    if (saved && saved.name && saved.gender) {
      autoJoinTriedRef.current = true;
      doJoinWith(saved.name, saved.gender, saved.outfit ?? myOutfit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldReady, phase]);

  // Invité : retente `hello` tant que le monde n'est pas arrivé (au cas où
  // l'hôte se soit abonné après nous et ait raté notre premier `hello`).
  useEffect(() => {
    if (isHost || worldReady) return;
    const it = setInterval(() => {
      if (worldReady || !channelReadyRef.current) return;
      channelRef.current?.send({ type: "broadcast", event: "hello", payload: { id: me.id } });
    }, 1200);
    return () => clearInterval(it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, worldReady]);

  // Horloge HUD (1 Hz, tous)
  useEffect(() => {
    const it = setInterval(() => {
      const s = sharedRef.current;
      setHud(h => ({ ...h, timeMin: E.gameTimeMin(s.dayStartAt, Date.now()) }));
      // 2026-07 station update: am I near the townhall? (drives the corner
      // notification card for waiting visitors, 1 Hz is plenty)
      const m0 = meRef.current;
      if (m0) setNearHall(Math.abs(m0.x - (C.HOUSE.x + 3.5)) + Math.abs(m0.y - (C.HOUSE.y + 5.5)) < 8);
      // Zip 259 : suis-je près d'un bâtiment d'artisan construit ? (encart
      // d'info production à l'approche). On ne teste que sur la ferme.
      if (m0 && (!m0.zone || m0.zone === "farm")) {
        let found = null;
        for (const bid of Object.keys(C.ARTISAN_BUILDINGS)) {
          const cb = (sharedRef.current.crafts || {})[bid]; if (!cb || !cb.built) continue;
          const def = C.ARTISAN_BUILDINGS[bid], p = artisanPos(bid);
          const cx = p.x + def.w / 2, cy = p.y + def.h / 2;
          if (Math.abs(m0.x - cx) + Math.abs(m0.y - cy) < 4) { found = bid; break; }
        }
        setNearArtisan(found);
      } else setNearArtisan(null);
    }, 1000);
    return () => clearInterval(it);
  }, []);

  // -------- Rejoindre (spawn) --------
  function doJoin() { doJoinWith((nameVal || "Fermier").trim().slice(0, 14) || "Fermier", gender, myOutfit); }
  function doJoinWith(name, g, outfit) {
    if (!worldReady) return;
    meRef.current = { id: me.id, name, gender: g === "f" ? "f" : "m", outfit: outfit | 0, x: C.SPAWN.x, y: C.SPAWN.y, dir: 0, moving: false, animT: 0, sleeping: false, zone: "farm" };
    invRef.current = invRef.current || { wood: 0, stone: 0, food: 0, fence: 0, wall: 0, path: 0, seeds: [5, 0, 0, 0], crops: [0, 0, 0, 0], gems: C.GEMS.map(() => 0), fish: C.FISH.map(() => 0) };
    if (!myInv) { setMyInv(invRef.current); }
    if (!myQuests) setMyQuests((farmersRef.current[me.id] && farmersRef.current[me.id].quests) || {});
    joinedRef.current = true;
    setPhase("playing");
    channelRef.current?.send({ type: "broadcast", event: "join", payload: pubMe() });
    channelRef.current?.send({ type: "broadcast", event: "hello", payload: { id: me.id } }); // s'assure d'un snapshot frais
    addChat("★", L.chatWelcome);
  }
  // "Changer de perso" en jeu : revient à l'écran de choix sans quitter la ferme.
  function changeCharacter() { autoJoinTriedRef.current = true; joinedRef.current = false; setPhase("select"); }
  function pubMe() {
    const m = meRef.current;
    // Tant que m.zone==="evil", la position DIFFUSÉE reste figée sur la case
    // du passage (m.farmX/farmY, capturée à l'entrée par crossPassage) : les
    // autres joueurs restés sur la ferme ne doivent jamais voir de
    // coordonnées de la carte maléfique (dimensions différentes, aucun sens
    // sur leur écran) — voir aussi le filtre zone!=="farm" au rendu (draws
    // ci-dessous), qui masque carrément son personnage pendant ce temps.
    const px = m.zone === "evil" ? m.farmX : m.x, py = m.zone === "evil" ? m.farmY : m.y;
    const pub = { id: m.id, name: m.name, gender: m.gender, outfit: m.outfit, x: +px.toFixed(2), y: +py.toFixed(2), dir: m.dir, moving: m.zone === "evil" ? false : m.moving, tool: slotRef.current, sleeping: !!m.sleeping, torch: !!torchOnRef.current, zone: m.zone || "farm", pets: myPetsRef.current };
    // Monde maléfique MULTIJOUEUR (demande Guillaume 2026-07) : les
    // coordonnées RÉELLES sur la carte maléfique voyagent dans des champs
    // dédiés (ex/ey) — x/y restent figées sur la case du passage pour tout
    // ce qui regarde la ferme (hôte, carte, autres joueurs restés au champ).
    // `immune` permet à l'hôte (simulation partagée des créatures) de savoir
    // qui est invisible sous pommade.
    if (m.zone === "evil") { pub.ex = +m.x.toFixed(2); pub.ey = +m.y.toFixed(2); pub.emoving = !!m.moving; pub.immune = Date.now() < immunityUntilRef.current; }
    return pub;
  }
  // FIX 241 (réduction trafic Realtime) : on ne diffuse QUE s'il y a au moins
  // un autre joueur pour recevoir ET si l'onglet est visible. Seul dans sa
  // ferme (cas courant) ou onglet masqué/tablette verrouillée -> zéro message
  // émis, sans aucun impact de gameplay (personne pour voir). Vaut pour la
  // position ET pour les entités simulées par l'hôte (greg/soan/lapins/…).
  function netCanBroadcast() { return channelReadyRef.current && !hiddenRef.current && playersRef.current.size > 0; }
  function sendPos() { if (!netCanBroadcast()) return; const _m = meRef.current; if (_m) { lastPosSentRef.current = performance.now(); lastPosKeyRef.current = _m.moving ? ("m" + _m.dir) : "s"; } channelRef.current?.send({ type: "broadcast", event: "pos", payload: pubMe() }); }
  // FIX 242 (AOI / zone d'intérêt) : rayon "même zone d'écran" dérivé du viewport réel + marge de pré-chargement.
  function aoiRadiusTiles() { const c = canvasRef.current; if (!c) return 40; return Math.hypot(c.width, c.height) / (ZOOM * C.TILE) / 2 + C.AOI_MARGIN_TILES; }
  // Distance (tuiles) au plus proche AUTRE joueur de la même zone ; Infinity si personne.
  function nearestOtherDist() { const m = meRef.current; if (!m) return Infinity; let best = Infinity; for (const p of playersRef.current.values()) { if (!p || (p.zone || "farm") !== m.zone) continue; const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < best) best = d; } return best; }
  // Cadence de diffusion de MA position : plein débit si un autre joueur peut me voir, sinon débit "minimap" (personne ne me voit bouger de près).
  function posSendHz() { return nearestOtherDist() <= aoiRadiusTiles() ? C.POS_TICK_HZ : C.POS_FAR_HZ; }
  // Un joueur distant (non-hôte) est-il à portée de vue de cette entité (ou de l'une de ces entités) ? Sinon inutile de la diffuser : hors écran ET absente de la minimap (loups/greg/soan/lapins n'y figurent pas).
  function anyRemoteNear(ex, ey) { const R = aoiRadiusTiles(); for (const p of playersRef.current.values()) { if (!p || (p.zone || "farm") !== "farm") continue; if (Math.hypot(p.x - ex, p.y - ey) <= R) return true; } return false; }
  function anyRemoteNearList(list) { if (!list || !list.length) return false; const R = aoiRadiusTiles(); for (const p of playersRef.current.values()) { if (!p || (p.zone || "farm") !== "farm") continue; for (const e of list) { if (e && Math.hypot(p.x - e.x, p.y - e.y) <= R) return true; } } return false; }
  // FIX 243 (emission par intention + cap 8 Hz) : on n'emet plus un flux continu.
  // On envoie quand l'ETAT de mouvement change (depart/arret/changement de
  // direction), plafonne a POS_TICK_HZ, plus un keep-alive de correction. Les
  // changements de direction (donc les mouvements rapides) partent tout de suite ;
  // seule la marche en ligne droite est throttlee -> gros gain trafic sans perdre
  // la reactivite. Borne dure : jamais plus que POS_TICK_HZ/s (<= l'ancien 12 Hz).
  function maybeSendPos() {
    const m = meRef.current; if (!m) return;
    const now = performance.now();
    const key = m.moving ? ("m" + m.dir) : "s";
    const minGap = 1000 / posSendHz();
    if (key !== lastPosKeyRef.current) { if (now - lastPosSentRef.current >= minGap) sendPos(); }
    else if (m.moving && now - lastPosSentRef.current >= C.POS_KEEPALIVE_MS) sendPos();
  }
  // FIX 243 (extrapolation) : on affiche les autres joueurs a leur position
  // PRESENTE (base recue + vitesse * temps ecoule) et non a leur derniere position
  // recue (en retard -> sensation de lag). La vitesse vient du delta entre deux
  // paquets (capture diagonales + mouvements rapides). Collision rejouee localement
  // (canStand/canStandTown) car la carte est partagee -> le fantome ne traverse pas
  // un mur. Plafonne a POS_EXTRAP_MAX_MS pour eviter la derive si un paquet manque.
  function advanceRemote(p) {
    if (!p || !p.moving || p.vx === undefined || (p.vx === 0 && p.vy === 0)) return;
    const el = Math.min((performance.now() - (p.tRecv || 0)) / 1000, C.POS_EXTRAP_MAX_MS / 1000);
    if (el <= 0) return;
    const nx = p.px0 + p.vx * el, ny = p.py0 + p.vy * el;
    if (p.zone === "town") { const tw = townWorldRef.current; p.tx = (tw && canStandTown(tw, nx, p.py0)) ? nx : p.px0; p.ty = (tw && canStandTown(tw, p.px0, ny)) ? ny : p.py0; }
    else if (!p.zone || p.zone === "farm") { const w = worldRef.current; p.tx = (w && canStand(w, nx, p.py0)) ? nx : p.px0; p.ty = (w && canStand(w, p.px0, ny)) ? ny : p.py0; }
  }
  // FIX 246 : lissage du rendu d'un PNJ/bête côté invité, avec état persistant
  // (npcSmoothRef, indépendant de l'objet remplacé en bloc à 2 Hz).
  //  - glide=true (PNJ amicaux : Greg/Soan) : EXTRAPOLATION façon-joueur —
  //    on prolonge la dernière position reçue par la vitesse estimée (delta de
  //    2 snapshots), plafonnée (POS_EXTRAP_MAX_MS) et REJOUÉE contre la
  //    collision locale (collide) pour ne jamais traverser un mur/l'eau. Ils
  //    "glissent" au lieu de s'arrêter entre deux paquets. Coupée dès que le
  //    snapshot dit `moving=false` (aucun dépassement à l'arrêt / assis).
  //  - glide=false (loups, lapins, bêtes) : EASING SEUL vers la dernière
  //    position reçue — fluide mais toujours LÉGÈREMENT EN RETRAIT du réel
  //    (jamais en avance), donc les loups restent faciles à éviter et aucune
  //    bête ne semble traverser un obstacle (contrainte Guillaume).
  function smoothNpc(key, sx, sy, dt, glide, moving, collide) {
    const M = npcSmoothRef.current, tnow = performance.now();
    let st = M.get(key);
    if (!st) { st = { x: sx, y: sy, bx: sx, by: sy, lx: sx, ly: sy, vx: 0, vy: 0, tSnap: tnow }; M.set(key, st); return st; }
    if (sx !== st.lx || sy !== st.ly) {
      const dts = Math.min(Math.max((tnow - st.tSnap) / 1000, 1 / 30), 0.6);
      st.vx = (sx - st.lx) / dts; st.vy = (sy - st.ly) / dts;
      st.lx = sx; st.ly = sy; st.bx = sx; st.by = sy; st.tSnap = tnow;
    }
    let tx = sx, ty = sy;
    if (glide && moving) {
      const el = Math.min((tnow - st.tSnap) / 1000, C.POS_EXTRAP_MAX_MS / 1000);
      let nx = st.bx + st.vx * el, ny = st.by + st.vy * el;
      if (collide) { if (!collide(nx, st.by)) nx = st.bx; if (!collide(st.bx, ny)) ny = st.by; }
      tx = nx; ty = ny;
    }
    const k = Math.min(1, dt * (glide ? 14 : 12));
    st.x += (tx - st.x) * k; st.y += (ty - st.y) * k;
    return st;
  }


  // -------- Actions joueur (envoi au host) --------
  // La requête porte DEUX jeux de coordonnées : px/py = position du joueur
  // (pour la vérification de portée côté hôte) et x/y = case ciblée (lue par
  // fermeEngine.resolveAct). Les deux sont distincts et ne doivent jamais être
  // confondus.
  function sendReq(payload) {
    const m = meRef.current;
    const full = { ...payload, id: me.id, name: m.name, px: +m.x.toFixed(2), py: +m.y.toFixed(2) };
    // FIX 244b : depuis self:false (zip 243), l'hote ne recoit PLUS l'echo de
    // ses propres broadcasts -> son propre "req" n'atteignait jamais
    // ch.on("req") (garde par isHost) et AUCUNE de ses actions n'etait traitee
    // (recoltes, peche, cheval, chat visiteurs...). Seuls les invites, dont le
    // req atteint bien l'hote, fonctionnaient. Correctif : l'hote traite sa
    // requete EN LOCAL (comme s'il l'avait recue), sans passer par le reseau.
    // Le req est de toute facon host-only (les invites l'ignorent) et l'hote
    // diffuse ensuite l'"apply" aux autres depuis hostHandleReq -> inchange.
    if (isHost) { hostHandleReq(full); return; }
    channelRef.current?.send({ type: "broadcast", event: "req", payload: full });
  }
  function isInjured() { return Date.now() < injuredUntilRef.current; }
  function doAction() {
    const m = meRef.current; if (!m || actAnimRef.current > 0 || fishMiniRef.current || m.sleeping || isInjured()) return;
    if (m.zone === "evil") return doActionEvil();
    if (slotRef.current === 7) return handAction(); // zip 251 : outil main (ferme ET ville)
    if (m.zone === "town") return; // Valley Town (zip 234): no farm tools here — E interactions only (see tryOpenNearby)
    const w = worldRef.current; if (!w) return;
    // Priorité : ramasser la production d'un animal proche.
    const ai = nearestCollectable();
    if (ai >= 0) { actAnimRef.current = 0.28; sendReq({ kind: "collect", animal: ai }); return; }
    const tt = targetTile();
    if (!inMap(tt.x, tt.y)) return;
    const i = idxOf(tt.x, tt.y);
    const sl = slotRef.current;
    if (sl === 4) { startFishing(tt); return; } // pêche = minijeu
    actAnimRef.current = 0.28;
    const c = w.crops.get(i);
    if (c && E.cropGrowState(c, Date.now()).mature) return sendReq({ kind: "act", action: "harvest", x: tt.x, y: tt.y });
    // Levier de pont (chantier 2026-07, demande Guillaume) : cliquable
    // directement, quel que soit l'outil équipé (aucun objet à équiper),
    // même priorité que la récolte ci-dessus.
    if (w.objects[i] === C.O_LEVER) return sendReq({ kind: "act", action: "lever", x: tt.x, y: tt.y });
    // Moulin construit (chantier 2026-07, demande Guillaume) : cliquable
    // directement pour y déposer son blé, même priorité que le levier
    // ci-dessus — SAUF si l'outil Construction est équipé en variante "mill"
    // (case Construction), auquel cas le clic sert à retirer/reposer le
    // moulin lui-même (voir resolveAct cas "mill", branche sl===5 plus bas).
    if (w.objects[i] === C.O_MILL && E.buildReady(w.objHp.get(i), Date.now()) && !(sl === 5 && buildKindRef.current === "mill")) {
      return sendReq({ kind: "act", action: "millDeposit", x: tt.x, y: tt.y });
    }
    // Chaudron cliquable (correctif audit 2026-07) : tous les textes du jeu
    // disent "clique sur le chaudron" mais seul E fonctionnait — le clic (et
    // Espace) déclenche maintenant exactement la même logique que la touche E
    // (voir cauldronInteract), quel que soit l'outil équipé, même priorité
    // que le levier/moulin ci-dessus.
    if (w.objects[i] === C.O_CAULDRON && E.buildReady(w.objHp.get(i), Date.now())) { actAnimRef.current = 0; return cauldronInteract(); }
    if (sl === 0) {
      // Case "outils" (simplification barre d'outils) : houe/hache/pioche
      // regroupées, l'action dépend de toolKindRef.current (choisi via la
      // touche 1 en rotation, ou le mini-menu au clic).
      const tk = toolKindRef.current;
      const action = tk === "axe" ? "chop" : tk === "pick" ? "mine" : "till";
      sendReq({ kind: "act", action, x: tt.x, y: tt.y });
    }
    else if (sl === 1) sendReq({ kind: "act", action: "water", x: tt.x, y: tt.y });
    else if (sl === 2) sendReq({ kind: "act", action: "plant", seed: seedSelRef.current, x: tt.x, y: tt.y });
    else if (sl === 3) sendReq({ kind: "eat" });
    else if (sl === 5) {
      // Outil "Construction" (case Construction) : variante choisie via le
      // menu Construire/Vendre (fence = clôture bois, wall = mur pierre,
      // path = chemin dallé, lamp = lampadaire acheté en or, scarecrow =
      // épouvantail acheté en or, bridgeWood/bridgeStone = case de pont,
      // chantier 2026-07). L'orientation (dir) n'a de sens que pour la
      // clôture ; l'envoyer pour les autres variantes est sans effet. Le
      // pont n'a pas de stock à part : le coût (bois ou pierre) est prélevé
      // directement à la pose côté hôte (voir resolveAct cas "bridge").
      // bridgeRenovate (chantier 2026-07, demande Guillaume) : rénove en
      // pierre une case de pont BOIS déjà construite (aspect + résistance à
      // la dégradation nocturne), voir resolveAct cas "renovateBridge".
      const bk = buildKindRef.current;
      if (bk === "cauldron") {
        // Chaudron ramené du monde maléfique (chantier 2026-07) : requête
        // dédiée cauldronPlace (voir plus haut) plutôt que "act", car elle a
        // aussi besoin de s.salveCraft côté hôte (garde-fou de retrait).
        sendReq({ kind: "cauldronPlace", x: tt.x, y: tt.y });
        return;
      }
      const action = bk === "wall" ? "wall" : bk === "path" ? "path" : bk === "lamp" ? "lamp" : bk === "scarecrow" ? "scarecrow"
        : bk === "grass" ? "grass" : bk === "mill" ? "mill"
        : bk === "bridgeRenovate" ? "renovateBridge"
        : (bk === "bridgeWood" || bk === "bridgeStone") ? "bridge" : "fence";
      sendReq({ kind: "act", action, x: tt.x, y: tt.y, dir: fenceDirRef.current, material: bk === "bridgeStone" ? "stone" : "wood" });
      // Correctif 2026-07 (bug remonté par Guillaume : "le moulin ne peut pas
      // être alimenté en blé") : l'achat d'un moulin bascule automatiquement
      // l'outil Construction sur la variante "mill" (confort de pose, voir
      // buyMill), mais RIEN ne le rebasculait ensuite — tant que cette
      // variante restait équipée, resolveAct/"mill" prenait la branche de
      // RETRAIT à chaque clic sur le moulin (voir le garde-fou sl===5 dans le
      // bloc millDeposit ci-dessus), au lieu du dépôt de blé. Comme un moulin
      // fraîchement posé contient 0 blé, rien ne bloquait ce retrait : le
      // premier clic destiné à le nourrir le reprenait silencieusement en
      // inventaire. On rebascule donc sur la variante par défaut ("fence")
      // juste après avoir envoyé la pose, pour que le clic suivant sur le
      // moulin déclenche bien millDeposit.
      if (bk === "mill") { buildKindRef.current = "fence"; setBuildKind("fence"); }
    }
    else if (sl === 6) {
      // Outil "déplacer" : premier clic attrape l'animal visé, second clic
      // le dépose sur la case visée (n'importe où sur la ferme, hors case
      // bloquée). Aucune limite d'enclos : le joueur choisit librement.
      if (heldAnimalRef.current === -1) {
        const ai = nearestPickableAnimal(tt);
        if (ai >= 0) { heldAnimalRef.current = ai; setCarryingAnimal(true); sendReq({ kind: "pickAnimal", animal: ai }); }
        else {
          // Aucun animal de ferme visé : tente d'attraper un lapin sauvage
          // proche (chantier 2026-07, demande Guillaume). Résolution
          // immédiate côté hôte, pas de portage (voir req "catchRabbit").
          const rid = nearestPickableRabbit(tt);
          if (rid) sendReq({ kind: "catchRabbit", rabbit: rid });
          actAnimRef.current = 0;
        }
      } else {
        sendReq({ kind: "placeAnimal", animal: heldAnimalRef.current, x: tt.x, y: tt.y });
        heldAnimalRef.current = -1; setCarryingAnimal(false);
      }
    }
  }
  // Action en carte maléfique (chantier 2026-07, demande Guillaume : "il
  // faut juste qu'on puisse chop tous les arbres et récupérer le bois comme
  // des arbres normaux") : la carte maléfique n'est PAS synchronisée avec
  // l'hôte (evilWorldRef purement local, voir generateEvilWorld) — resolveAct
  // (fermeEngine.js) ne peut donc pas s'appliquer ici, il opère sur worldRef
  // (la ferme). La coupe est résolue localement sur evilWorldRef (même
  // formule d'usure/rendement que resolveAct cas "chop", via E.toolYield et
  // C.TREE_HP/C.TREE_WOOD, pour un ressenti identique à la ferme), puis SEUL
  // le gain de bois est envoyé à l'hôte (req "evilChop") pour créditer
  // l'inventaire du fermier — aucune coordonnée envoyée, aucune tuile de la
  // ferme n'est donc jamais touchée par erreur. Contrairement à resolveAct,
  // gère aussi O_TREE_DEAD (jamais rencontré côté ferme) comme un arbre
  // normal : mêmes PV/rendement, devient une souche (O_STUMP) une fois à 0.
  // Seuls la hache (arbres) et la pioche (rochers, chantier 2026-07 ci-dessous)
  // agissent ici (pas de récolte/arrosage/construction en zone maléfique,
  // hors périmètre de la demande).
  function doActionEvil() {
    const m = meRef.current; if (!m || actAnimRef.current > 0) return;
    const ew = evilWorldRef.current; if (!ew) return;
    if (slotRef.current !== 0) return;
    if (toolKindRef.current === "pick") { doMineEvil(m, ew); return; }
    if (toolKindRef.current !== "axe") return;
    const tt = targetTileEvil();
    if (!inMapEvil(tt.x, tt.y)) return;
    const i = tt.y * ew.w + tt.x;
    const o = ew.objects[i];
    if (o !== C.O_TREE && o !== C.O_TREE2 && o !== C.O_TREE_DEAD && o !== C.O_STUMP) return;
    actAnimRef.current = 0.28;
    const axeLvl = (toolsRef.current && toolsRef.current.axe) || 1;
    const hp = (ew.objHp.get(i) || 1) - axeLvl;
    const base = { x: m.x, y: m.y, t: 0 };
    for (let k = 0; k < 5; k++) fxRef.current.push({ ...base, kind: "p", col: k % 2 ? "#3e8a34" : "#a87745", vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .6 });
    if (hp <= 0) {
      const wood = E.toolYield(o === C.O_STUMP ? 2 : C.TREE_WOOD, axeLvl);
      if (o === C.O_STUMP) { ew.objects[i] = C.O_NONE; ew.objHp.delete(i); }
      else { ew.objects[i] = C.O_STUMP; ew.objHp.set(i, 2); }
      fxRef.current.push({ ...base, kind: "txt", txt: L.fxWood(wood), col: "#ffdf80", life: 1.4 });
      sendReq({ kind: "evilChop", wood });
    } else {
      ew.objHp.set(i, hp);
    }
  }
  // Minage des rochers du monde maléfique (chantier 2026-07, demande
  // Guillaume : "les roches là-bas [plus pointues] contiennent de la pierre
  // mais aussi des minerais magiques qui serviront d'ingrédients pour des
  // concoctions futures, à ramener au chaudron"). Même principe que la coupe
  // d'arbre ci-dessus : résolu localement sur evilWorldRef (jamais
  // synchronisé), seul le gain (pierre + minerai) est envoyé à l'hôte via la
  // requête dédiée "evilMine" pour créditer l'inventaire du fermier. Le
  // minerai n'a, pour l'instant, aucun usage côté chaudron (aucune recette ne
  // le consomme encore) — il s'accumule simplement dans `inv.magicOre` en
  // attendant un futur chantier de concoctions.
  function doMineEvil(m, ew) {
    const tt = targetTileEvil();
    if (!inMapEvil(tt.x, tt.y)) return;
    const i = tt.y * ew.w + tt.x;
    if (ew.objects[i] !== C.O_ROCK) return;
    actAnimRef.current = 0.28;
    const pickLvl = (toolsRef.current && toolsRef.current.pick) || 1;
    const hp = (ew.objHp.get(i) || 1) - pickLvl;
    const base = { x: m.x, y: m.y, t: 0 };
    for (let k = 0; k < 5; k++) fxRef.current.push({ ...base, kind: "p", col: k % 2 ? "#8a6f9e" : "#c7bcd6", vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .6 });
    if (hp <= 0) {
      ew.objects[i] = C.O_NONE; ew.objHp.delete(i);
      const stone = E.toolYield(C.ROCK_STONE, pickLvl);
      let ore = 0;
      if (Math.random() < C.EVIL_ORE_CHANCE) {
        const [lo, hi] = C.EVIL_ORE_YIELD;
        ore = lo + Math.floor(Math.random() * (hi - lo + 1));
      }
      fxRef.current.push({ ...base, kind: "txt", txt: L.fxStone(stone), col: "#d8d0e0", life: 1.4 });
      if (ore > 0) fxRef.current.push({ ...base, kind: "txt", txt: L.fxMagicOre(ore), col: "#c48bff", life: 1.6 });
      sendReq({ kind: "evilMine", stone, ore });
    } else {
      ew.objHp.set(i, hp);
    }
  }
  // Animal (non porté) le plus proche de la case visée `tt`, pour l'outil
  // "déplacer" (attraper). Même style que nearestCollectable, mais basé sur
  // la case ciblée par la souris plutôt que sur la position du joueur, pour
  // pouvoir viser un animal précis parmi plusieurs proches.
  function nearestPickableAnimal(tt) {
    const animals = sharedRef.current.animals || [];
    const now = Date.now();
    let best = -1, bd = 1.3;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i]; if (a.carriedBy) continue;
      const apos = E.animalPos(a, now);
      const d = Math.abs((tt.x + 0.5) - apos.x) + Math.abs((tt.y + 0.5) - apos.y);
      if (d <= bd) { bd = d; best = i; }
    }
    return best;
  }
  // Id du lapin sauvage le plus proche de la case visée `tt` (outil
  // "déplacer", chantier 2026-07) : même style que nearestPickableAnimal,
  // mais renvoie un id (pas un index — le tableau des lapins bouge sans
  // arrêt côté hôte, un index se périmerait). N'exclut PAS les lapins en
  // fuite ici : c'est resolveReq côté hôte qui tranche si la capture réussit
  // (voir req "catchRabbit"), le client se contente de viser le plus proche.
  function nearestPickableRabbit(tt) {
    const rabbits = sharedRef.current.rabbits || [];
    let best = null, bd = C.RABBIT_CATCH_PICK_RADIUS; // FIX 246 : ciblage élargi (1.3 -> 2.2)
    for (const rb of rabbits) {
      const d = Math.abs((tt.x + 0.5) - rb.x) + Math.abs((tt.y + 0.5) - rb.y);
      if (d <= bd) { bd = d; best = rb.id; }
    }
    return best;
  }
  // Index d'un animal (dans sharedRef.animals) à portée et prêt à ramasser.
  function nearestCollectable() {
    const m = meRef.current, animals = sharedRef.current.animals || [];
    const now = Date.now();
    let best = -1, bd = C.COLLECT_RANGE;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i]; if (a.carriedBy || !E.animalReady(a, now)) continue;
      const apos = E.animalPos(a, now);
      const d = Math.abs(m.x - apos.x) + Math.abs(m.y - apos.y);
      if (d <= bd) { bd = d; best = i; }
    }
    return best;
  }
  // Pêche : tire un poisson (pondéré), ouvre le minijeu correspondant.
  function startFishing(tt) {
    const w = worldRef.current, m = meRef.current; if (!w || !m) return;
    if (!inMap(tt.x, tt.y) || w.ground[idxOf(tt.x, tt.y)] !== C.G_WATER) { pushToast(L.toastNeedWater); return; }
    let total = 0; for (const fs of C.FISH) total += fs.weight;
    let r = Math.random() * total, ft = 0;
    for (let i = 0; i < C.FISH.length; i++) { r -= C.FISH[i].weight; if (r <= 0) { ft = i; break; } }
    // 2026-07 station update: rare sea creatures. Eligible after
    // SEA_MIN_STREAK consecutive casts (client mirror of f.seaStreak, the
    // host re-validates), or from the FIRST cast at the extreme north/south
    // ends of the river. Rare bites use the hardest minigame tier.
    const seaEligible = E.seaExtremeRow(tt.y) ? C.SEA_EXTREME_FIRST_CHANCE
      : (seaStreakRef.current >= C.SEA_MIN_STREAK ? C.SEA_CHANCE : 0);
    if (Math.random() < seaEligible) {
      let stot = 0; for (const sc of C.SEA_CREATURES) stot += sc.weight;
      let sr = Math.random() * stot, si = 0;
      for (let i = 0; i < C.SEA_CREATURES.length; i++) { sr -= C.SEA_CREATURES[i].weight; if (sr <= 0) { si = i; break; } }
      fishTileRef.current = { x: tt.x, y: tt.y };
      pushToast(L.seaBite(lang === "en" ? C.SEA_CREATURES[si].nameEn : C.SEA_CREATURES[si].name));
      setFishMini({ mode: 2, fish: 2, sea: si });
      return;
    }
    fishTileRef.current = { x: tt.x, y: tt.y };
    pushToast(L.fishBite(lang === "en" ? C.FISH[ft].nameEn : C.FISH[ft].name));
    setFishMini({ mode: ft, fish: ft });
  }
  function fishWon() {
    const fm = fishMini, tt = fishTileRef.current;
    setFishMini(null);
    if (!tt || !fm) return;
    // 2026-07 station update: rare catches claim `sea`; the host validates
    // the streak/extreme-row eligibility (see resolveAct in fermeEngine.js).
    if (typeof fm.sea === "number") { seaStreakRef.current = 0; sendReq({ kind: "act", action: "fish", x: tt.x, y: tt.y, sea: fm.sea }); }
    else { seaStreakRef.current += 1; sendReq({ kind: "act", action: "fish", x: tt.x, y: tt.y, fish: fm.fish }); }
  }
  function fishLost(tooSoon) { setFishMini(null); pushToast(tooSoon ? L.fishTooSoon : L.fishFail); }
  function barnWon() { setBarnMini(null); sendReq({ kind: "barnBuild" }); }
  function barnLost() { setBarnMini(null); pushToast(L.barnMiniFail); }
  function wolfBiteWon() {
    const wb = wolfBite; setWolfBite(null);
    if (wb) sendReq({ kind: "wolfBiteResult", wolfId: wb.wolfId, result: "win" });
    pushToast(L.wolfBiteWin);
  }
  function wolfBiteLost() {
    const wb = wolfBite; setWolfBite(null);
    if (wb) sendReq({ kind: "wolfBiteResult", wolfId: wb.wolfId, result: "fail" });
    // Pas de toast ici : la blessure elle-même (payload.farmer.injuredUntil,
    // voir applyDeltas) affiche déjà L.toastInjured et téléporte à la maison.
  }

  // Position vivante du cheval : celle de son cavalier actuel s'il est monté
  // (le cheval se déplace avec lui), sinon sa position au repos (h.x/h.y).
  function horseAnchor(h) {
    if (h.rider) { const r = playersRef.current.get(h.rider); if (r) return { x: r.x, y: r.y }; }
    return { x: h.x, y: h.y };
  }
  // Monter / descendre du cheval (touche F). Deux places : le cavalier qui
  // monte le premier mène la monture, un second joueur peut grimper derrière
  // comme passager tant qu'il reste une place libre. Plusieurs chevaux
  // possibles désormais (demande 2026-07) : on descend du cheval sur lequel
  // on est déjà (peu importe lequel), ou on monte le plus proche à portée
  // qui a encore une place libre.
  function myHorse() {
    const hs = sharedRef.current.horses || [];
    return hs.find(h => h.rider === me.id || h.rider2 === me.id) || null;
  }
  function nearestMountableHorse() {
    const m = meRef.current, hs = sharedRef.current.horses || []; if (!m) return -1;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i]; if (h.rider && h.rider2) continue; // plus de place libre
      const a = horseAnchor(h);
      if (Math.abs(m.x - a.x) > C.MOUNT_RANGE || Math.abs(m.y - a.y) > C.MOUNT_RANGE) continue;
      const d = Math.hypot(m.x - a.x, m.y - a.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function toggleMount() {
    const m = meRef.current; if (!m) return;
    if (myHorse()) {
      // Noyade (décision Guillaume 2026-07) : descendre du cheval en pleine
      // eau = le fermier coule et est ramené chez lui (C.SPAWN) avec une
      // blessure d'UNE minute (C.DROWN_INJURED_MS). Le "dismount" part
      // D'ABORD (avec la position actuelle en px/py) : le cheval reste donc
      // nager sur place — récupérable au sifflet, les chevaux sifflés
      // savent nager désormais (voir updateWhistledHorses). Blessure
      // appliquée en optimiste localement puis persistée/diffusée par
      // l'hôte (req "drown", même mécanique de confiance qu'"evilCaught").
      const w = worldRef.current;
      if (w && E.isWaterTile(w, m.x, m.y)) {
        sendReq({ kind: "dismount" });
        const until = Date.now() + C.DROWN_INJURED_MS;
        injuredUntilRef.current = until; setInjuredUntil(until);
        sendReq({ kind: "drown", until });
        m.x = C.SPAWN.x; m.y = C.SPAWN.y; m.moving = false;
        sendPos();
        pushToast(L.drownToast);
        return;
      }
      sendReq({ kind: "dismount" });
      return;
    }
    // Zip 253 : aucun cheval en ville ni dans le passage sombre — on ne peut
    // monter QUE sur la ferme (les chevaux vivent à la ferme). En ville, F ne
    // fait rien (le prompt de monte y est déjà masqué, voir updateMeTown).
    if (m.zone && m.zone !== "farm") return;
    const idx = nearestMountableHorse();
    if (idx >= 0) sendReq({ kind: "mount", horseIndex: idx });
  }
  // Sifflement (bouton dédié, icône cheval, chantier 2026-07 demande
  // Guillaume) : envoie la requête au hôte, qui fixe `callTarget` sur chaque
  // cheval libre (voir req.kind === "whistle" dans hostHandleReqUnsafe).
  function whistleHorses() { sendReq({ kind: "whistle" }); }
  // Torche (chantier 2026-07, demande Guillaume : "on doit pouvoir éloigner
  // les loups en sortant une torche et en s'approchant d'eux") : simple
  // bascule locale, diffusée avec la position (voir pubMe/sendPos) comme
  // dir/moving/tool/sleeping. Aucun arbitrage hôte nécessaire : la torche ne
  // consomme ni n'use rien, elle change seulement le comportement des loups
  // (updateWolves, simulé côté hôte) et perce un halo dans le voile nocturne
  // (voir lampsInView plus bas, qui inclut aussi les porteurs de torche).
  function toggleTorch() {
    torchOnRef.current = !torchOnRef.current;
    setTorchOn(torchOnRef.current);
    sendPos();
  }
  // Fait progresser, HÔTE UNIQUEMENT, chaque cheval ayant reçu un `callTarget`
  // (sifflement) vers cette cible, à la même vitesse qu'un cheval monté
  // (PLAYER_SPEED * HORSE_SPEED_MULT, "au galop"). Purement une simulation de
  // position (comme updateMe pour les joueurs) : appelée à chaque frame côté
  // hôte, avec une diffusion réseau THROTTLÉE (toutes les ~150ms, comme les
  // messages de position des joueurs) pour ne pas saturer le canal.
  function updateWhistledHorses(dt) {
    const hs = sharedRef.current.horses; if (!hs || !hs.length) return;
    const w = worldRef.current;
    let moved = false;
    const speed = C.PLAYER_SPEED * C.HORSE_SPEED_MULT;
    for (const h of hs) {
      if (h.rider) { if (h.callTarget) h.callTarget = null; continue; } // monté entre-temps : annule l'appel
      if (!h.callTarget) continue;
      const dx = h.callTarget.x - h.x, dy = h.callTarget.y - h.y;
      const d = Math.hypot(dx, dy);
      // Nage (décision Guillaume 2026-07) : un cheval sifflé depuis l'autre
      // rive traverse la rivière à la nage, ralenti par C.HORSE_WATER_SLOW
      // tant qu'il est sur une case d'eau — plus jamais de cheval coincé
      // derrière la rivière (il allait déjà en ligne droite, il ne fait
      // plus que ralentir de façon crédible en zone d'eau).
      const sp2 = (w && E.isWaterTile(w, h.x, h.y)) ? speed / C.HORSE_WATER_SLOW : speed;
      if (d < 0.12) { h.x = h.callTarget.x; h.y = h.callTarget.y; h.callTarget = null; }
      else { const step = Math.min(sp2 * dt, d); h.x += (dx / d) * step; h.y += (dy / d) * step; }
      moved = true;
    }
    if (moved) {
      minimapDirtyRef.current = true;
      horseCallAccumRef.current += dt;
      if (horseCallAccumRef.current >= 0.5 && netCanBroadcast()) {
        horseCallAccumRef.current = 0;
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { horses: hs } });
      }
    }
  }
  // Position vivante d'un joueur (soi-même ou distant) par id, pour le
  // ciblage des loups agressifs. Renvoie null si le joueur n'est plus là
  // (déconnecté) : le loup abandonne alors sa cible (voir phase "attack").
  function livePlayerPos(id) {
    const mm = meRef.current;
    if (mm && mm.id === id) return { id, x: mm.x, y: mm.y };
    const p = playersRef.current.get(id);
    return p ? { id, x: p.x, y: p.y } : null;
  }
  // Dénouement d'une morsure tentée (chantier 2026-07) : "win" = le fermier a
  // réagi à temps au mini-jeu (voir req.kind === "wolfBiteResult" plus bas),
  // le loup repart effrayé comme s'il avait fui la torche. "fail" = pas de
  // réaction dans le délai (mini-jeu raté OU joueur injoignable) : le fermier
  // est blessé pendant C.INJURED_MS, ramené chez lui. Toujours appelé côté
  // hôte, donc farmersRef.current[id] fait foi (persisté ensuite via le
  // filet dirtyRef -> persistFarm, même mécanisme que le reste du fermier).
  function resolveWolfBiteOutcome(wf, result) {
    const now = Date.now();
    const targetId = wf.biteTargetId || wf.attackTargetId;
    wf.attackTargetId = null; wf.biteTargetId = null; wf.biteDeadline = 0; wf.huntAnimalIdx = -1;
    if (result === "win") {
      const nm = targetId ? ((playersRef.current.get(targetId) || (meRef.current?.id === targetId ? meRef.current : null) || {}).name || "?") : "?";
      // Compteur de victoires PAR JOUEUR sur CE loup (chantier 2026-07, demande
      // Guillaume). À la C.WOLF_KILL_WINS-ième victoire d'un même fermier, le
      // loup est terrassé au lieu de fuir.
      if (targetId) { wf.biteWins = wf.biteWins || {}; wf.biteWins[targetId] = (wf.biteWins[targetId] || 0) + 1; }
      const wins = targetId ? wf.biteWins[targetId] : 0;
      if (targetId && wins >= C.WOLF_KILL_WINS) {
        // Mise à mort : phase "dead", figé, animation puis despawn (wf.gone,
        // réutilise le filtre de despawn existant). Diffusé explicitement pour
        // que tous les clients reçoivent deadUntil et jouent l'animation.
        wf.phase = "dead"; wf.state = "dead"; wf.deadUntil = now + C.WOLF_DEATH_ANIM_MS;
        wf.tx = wf.x; wf.ty = wf.y; wf.biteWins = {};
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolves: sharedRef.current.wolves } });
        addChat("🗡️", L.wolfKilledChat(nm));
        return;
      }
      // Sinon : fuite classique + grâce garantie sans re-morsure de CE loup sur
      // ce joueur (casse la boucle « re-mordu instantanément »).
      wf.phase = "flee"; wf.fleeUntil = now + C.WOLF_FLEE_COOLDOWN_MS;
      if (targetId) { wf.biteGrace = wf.biteGrace || {}; wf.biteGrace[targetId] = now + C.WOLF_BITE_GRACE_MS; }
      const target = targetId ? livePlayerPos(targetId) : null;
      if (target) {
        const dx = wf.x - target.x, dy = wf.y - target.y, d = Math.hypot(dx, dy) || 1;
        wf.tx = wf.x + (dx / d) * 4; wf.ty = wf.y + (dy / d) * 4;
      }
      wf.state = "run";
      if (targetId) addChat("🐺", L.wolfBiteWinChat(nm));
      return;
    }
    // "fail" : blesse le fermier visé s'il existe encore (peut avoir quitté).
    if (targetId) {
      const f = E.normalizeFarmer(farmersRef.current[targetId]);
      if (f) {
        f.injuredUntil = Date.now() + C.INJURED_MS;
        f.injuryKind = "wolf";
        dirtyRef.current = true;
        channelRef.current?.send({
          type: "broadcast", event: "apply",
          payload: {
            farmer: { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv, injuredUntil: f.injuredUntil },
            // Diffusé à TOUS (pas juste à la victime) pour que les autres
            // joueurs de la room sachent qui est blessé et puissent le
            // soigner (trousse de soins, demande 2026-07). Voir applyDeltas.
            injured: { id: f.id, until: f.injuredUntil },
          },
        });
        addChat("🩸", L.wolfBiteFailChat(f.name));
      }
    }
    wf.phase = "return";
  }
  // Lapins (chantier 2026-07, demande Guillaume : "petits lapins bien
  // détaillés qui fuient et sont inoffensifs, surtout rive droite").
  // Simulation HÔTE UNIQUEMENT, même esprit général que les loups
  // (updateWolves ci-dessous) mais bien plus simple : aucune attaque, aucun
  // pont/rivière à respecter (les lapins ne chassent rien de l'autre côté),
  // juste roam + fuite face à un fermier trop proche. Présents JOUR ET NUIT
  // (contrairement aux loups, nocturnes), population cible différente selon
  // l'heure (C.RABBIT_COUNT_DAY/NIGHT) : l'excédent est retiré en douceur au
  // passage à la nuit, le manque est comblé progressivement (un lapin à la
  // fois, C.RABBIT_RESPAWN_MS) plutôt que d'un coup, pour ne pas donner
  // l'impression d'un "pop" instantané et pour laisser le repop se faire loin
  // du regard des joueurs (E.rabbitSpawnPos, "zones éloignées de la maison").
  function updateRabbits(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current;
    const now = Date.now();
    if (!s.rabbits) s.rabbits = [];
    const tmin = E.gameTimeMin(s.dayStartAt, now);
    const target = E.isNightTime(tmin) ? C.RABBIT_COUNT_NIGHT : C.RABBIT_COUNT_DAY;

    let changed = false;
    if (s.rabbits.length > target) {
      // Passage au régime de nuit (ou tout autre excédent) : retire l'excès
      // au hasard, en priorité des lapins déjà en fuite (les moins "posés"
      // visuellement) plutôt que d'ordre fixe.
      const fleeing = [], calm = [];
      for (const rb of s.rabbits) (rb.phase === "flee" ? fleeing : calm).push(rb);
      while (fleeing.length + calm.length > target) {
        if (fleeing.length) fleeing.splice(Math.floor(Math.random() * fleeing.length), 1);
        else calm.splice(Math.floor(Math.random() * calm.length), 1);
      }
      s.rabbits = fleeing.concat(calm);
      changed = true;
    } else if (s.rabbits.length < target && now >= rabbitRespawnAtRef.current) {
      const p = E.rabbitSpawnPos(w, Math.random);
      s.rabbits.push({
        id: "rabbit" + (rabbitSeqRef.current++) + "_" + now, x: p.x, y: p.y, tx: p.x, ty: p.y, dir: 2, animT: 0,
        state: "stop", phase: "roam", roamAnchor: { x: p.x, y: p.y }, roamTarget: null, nextRoamAt: 0,
        nextNoticeAt: 0, fleeUntil: 0,
        // Côté d'origine (demande Guillaume 2026-07 : "retrouver le pont pour
        // rentrer chez eux, les lapins aussi") : mémorisé au spawn — un lapin
        // chassé de l'autre côté de la rivière y reviendra par un pont ouvert
        // (voir phase "return" plus bas).
        homeSide: E.riverSideOf(w, p.x, p.y),
      });
      rabbitRespawnAtRef.current = now + C.RABBIT_RESPAWN_MS;
      changed = true;
    }
    if (changed) {
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { rabbits: s.rabbits } });
      minimapDirtyRef.current = true;
      rabbitAccumRef.current = 0;
      return;
    }
    if (!s.rabbits.length) return;

    // Fermiers vivants à considérer pour la fuite (soi-même + distants),
    // même style que torchBearers ci-dessous pour les loups.
    const live = [];
    const mm = meRef.current;
    if (mm) live.push({ x: mm.x, y: mm.y });
    for (const p of playersRef.current.values()) live.push({ x: p.x, y: p.y });

    let moved = false;
    for (const rb of s.rabbits) {
      let near = null, nearD = Infinity;
      for (const t of live) { const d = Math.hypot(t.x - rb.x, t.y - rb.y); if (d < nearD) { nearD = d; near = t; } }
      let speed = 0;
      if (rb.phase === "flee") {
        if (now < rb.fleeUntil) { rb.state = "run"; speed = C.RABBIT_SPEED_FLEE; }
        else {
          // Fin de fuite : s'il a été chassé du mauvais côté de la rivière,
          // il rentre chez lui par un pont (voir phase "return" ci-dessous).
          rb.phase = (rb.homeSide && E.riverSideOf(w, rb.x, rb.y) !== rb.homeSide) ? "return" : "roam";
          rb.roamAnchor = { x: rb.x, y: rb.y };
        }
      }
      // Retente périodiquement un retour au bercail resté en échec (aucun
      // pont ouvert au dernier essai — voir nextReturnAt, phase "return").
      if (rb.phase === "roam" && rb.homeSide && rb.nextReturnAt && now >= rb.nextReturnAt && E.riverSideOf(w, rb.x, rb.y) !== rb.homeSide) { rb.phase = "return"; rb.nextReturnAt = 0; }
      // Retour au bercail (demande Guillaume 2026-07 : "les lapins aussi") :
      // rejoint le pont ouvert le plus proche, le traverse, puis reprend sa
      // rôdaille chez lui. Sans pont ouvert : broute sur place et retente
      // plus tard (nextReturnAt).
      if (rb.phase === "return" && speed === 0) {
        rb.state = "walk"; speed = C.RABBIT_SPEED_SLOW;
        if (!rb.homeSide || E.riverSideOf(w, rb.x, rb.y) === rb.homeSide) {
          rb.phase = "roam"; rb.roamAnchor = { x: rb.x, y: rb.y }; rb.roamTarget = null; rb.state = "stop"; speed = 0;
        } else {
          if (rb.bridgeIdx == null || rb.bridgeIdx < 0 || !E.bridgeIsOpen(w, rb.bridgeIdx)) rb.bridgeIdx = E.nearestOpenBridge(w, rb.x, rb.y);
          if (rb.bridgeIdx < 0) {
            rb.phase = "roam"; rb.roamAnchor = { x: rb.x, y: rb.y }; rb.nextReturnAt = now + 8000; rb.state = "stop"; speed = 0;
          } else {
            const bp = E.bridgeCrossPoint(w, rb.bridgeIdx);
            const homeEast = rb.homeSide === "east";
            // Vise le centre du pont, puis la sortie côté maison une fois dessus.
            const nearB = Math.hypot(bp.x - rb.x, bp.y - rb.y) < 0.7;
            rb.tx = nearB ? bp.x + (homeEast ? 4 : -4) : bp.x;
            rb.ty = bp.y;
          }
        }
      }
      if (rb.phase !== "flee" && near && nearD < C.RABBIT_FLEE_RANGE) {
        // "1 chance sur 5 qu'ils ne nous voient pas" (demande chiffrée de
        // Guillaume) : jet de repérage throttlé (pas à chaque frame) tant
        // qu'un fermier reste dans le rayon d'alerte — plus l'approche est
        // longue/répétée, plus le risque cumulé d'être repéré grandit,
        // d'où l'intérêt d'une approche courte et prudente pour tenter la
        // capture avant le prochain jet.
        if (now >= (rb.nextNoticeAt || 0)) {
          rb.nextNoticeAt = now + C.RABBIT_NOTICE_CHECK_MS;
          if (Math.random() >= C.RABBIT_UNSEEN_CHANCE) {
            rb.phase = "flee"; rb.fleeUntil = now + C.RABBIT_FLEE_COOLDOWN_MS;
            const dx = rb.x - near.x, dy = rb.y - near.y, d = Math.hypot(dx, dy) || 1;
            rb.tx = rb.x + (dx / d) * 5; rb.ty = rb.y + (dy / d) * 5;
            rb.state = "run"; speed = C.RABBIT_SPEED_FLEE;
          }
        }
      }
      if (rb.phase === "roam" && speed === 0) {
        rb.state = rb.roamTarget ? "walk" : "stop"; speed = C.RABBIT_SPEED_SLOW;
        if (!rb.roamTarget || Math.hypot(rb.roamTarget.x - rb.x, rb.roamTarget.y - rb.y) < 0.25 || now >= rb.nextRoamAt) {
          if (Math.random() < 0.4) { rb.roamTarget = null; rb.nextRoamAt = now + 1500 + Math.random() * 2500; rb.state = "stop"; speed = 0; }
          else {
            const a = Math.random() * Math.PI * 2, d = Math.random() * C.RABBIT_ROAM_RADIUS;
            rb.roamTarget = { x: rb.roamAnchor.x + Math.cos(a) * d, y: rb.roamAnchor.y + Math.sin(a) * d };
            rb.nextRoamAt = now + 4000 + Math.random() * 3000;
          }
        }
        if (rb.roamTarget) { rb.tx = rb.roamTarget.x; rb.ty = rb.roamTarget.y; } else speed = 0;
      }
      // Cap de contournement anti-blocage en cours (posé plus bas) : il
      // remplace temporairement la cible normale (même principe que les loups).
      if (rb.detourUntil && now < rb.detourUntil && rb.detour) { rb.tx = rb.detour.x; rb.ty = rb.detour.y; }
      else if (rb.detourUntil && now >= rb.detourUntil) { rb.detourUntil = 0; rb.detour = null; }
      if (speed > 0 && rb.tx !== undefined) {
        const dx = rb.tx - rb.x, dy = rb.ty - rb.y, d = Math.hypot(dx, dy);
        if (d > 0.02) {
          const step = Math.min(speed * dt, d);
          const nx = rb.x + (dx / d) * step, ny = rb.y + (dy / d) * step;
          // Correctif 2026-07 (demande Guillaume : "ils ne doivent pas être
          // coincés trop longtemps par la rivière ou des obstacles") : au
          // lieu de s'arrêter net contre l'eau/un obstacle (l'ancien
          // `rb.tx = rb.x` annulait carrément la cible), le lapin GLISSE le
          // long (essai axe X seul, puis axe Y seul), et un cap de
          // contournement perpendiculaire est pris s'il piétine trop
          // longtemps — même mécanique que les loups (updateWolves).
          const pass = (xx, yy) => !E.blockedTile(w, xx, yy) && !E.isWaterTile(w, xx, yy);
          let mx = rb.x, my = rb.y;
          if (pass(nx, ny)) { mx = nx; my = ny; }
          else if (pass(nx, rb.y)) { mx = nx; }
          else if (pass(rb.x, ny)) { my = ny; }
          const adv = Math.hypot(mx - rb.x, my - rb.y);
          if (adv > 0.001) {
            if (mx !== rb.x) rb.dir = mx < rb.x ? 2 : 3;
            rb.x = mx; rb.y = my;
            rb.animT += dt * (speed >= C.RABBIT_SPEED_FLEE ? 9 : 4);
            moved = true;
          } else rb.animT = 0;
          if (adv < step * 0.25) {
            rb.stuckT = (rb.stuckT || 0) + dt;
            if (rb.stuckT >= C.CRITTER_STUCK_S) {
              rb.stuckT = 0;
              const sgn = Math.random() < 0.5 ? 1 : -1;
              rb.detour = { x: rb.x - (dy / d) * 4 * sgn, y: rb.y + (dx / d) * 4 * sgn };
              rb.detourUntil = now + C.CRITTER_DETOUR_MS;
            }
          } else rb.stuckT = 0;
        }
      } else rb.animT = 0;
    }
    if (moved) minimapDirtyRef.current = true;
    rabbitAccumRef.current += dt;
    if (rabbitAccumRef.current >= 0.5 && netCanBroadcast() && anyRemoteNearList(s.rabbits)) {
      rabbitAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { rabbits: s.rabbits } });
    }
  }
  // Loups (chantier 2026-07, demande Guillaume). Simulation HÔTE UNIQUEMENT,
  // même esprit que updateWhistledHorses : positions dérivées frame par
  // frame, diffusées en throttle (~150ms). Apparaissent rive droite
  // (E.riverSideOf) à la tombée de la nuit (E.isNightTime), tentent de
  // traverser par un pont OUVERT (E.nearestOpenBridge/E.bridgeIsOpen) pour
  // aller chasser dans l'enclos, repartent à l'aube. Une torche allumée à
  // portée (C.WOLF_TORCH_RANGE) prime sur tout le reste : le loup fuit et
  // abandonne sa proie/son repas en cours (l'animal est alors sauvé).
  // Créatures maléfiques PARTAGÉES (décision Guillaume 2026-07) : simulation
  // HÔTE sur le modèle des loups — tous les joueurs présents sur la carte
  // maléfique voient les mêmes créatures aux mêmes endroits. Initialisées à
  // la demande depuis la seed FIXE de la carte (E.generateEvilWorld), jamais
  // persistées (comme les loups). Chaque créature vise le joueur en zone
  // maléfique le plus proche NON immunisé (pommade = invisible) ; le contact
  // déclenche le mini-jeu de morsure CHEZ ce joueur (apply `evilBite` ciblé)
  // et le dénouement revient par la req "evilBiteResult". La blessure/le
  // retour maison du perdant passent par la req "evilCaught" existante.
  function updateSharedEvilMonsters(dt) {
    const s = sharedRef.current;
    const evil = [];
    const mm = meRef.current;
    if (mm && mm.zone === "evil") evil.push({ id: mm.id, x: mm.x, y: mm.y, immune: Date.now() < immunityUntilRef.current });
    for (const p of playersRef.current.values()) if (p.zone === "evil" && p.etx !== undefined) evil.push({ id: p.id, x: p.etx, y: p.ety, immune: !!p.immune });
    if (!evil.length) { evilMonstersAccumRef.current = 0; return; } // personne là-bas : simulation en pause
    // Zip 235: when the passage rotates, drop any stale monsters from the
    // previous world before re-seeding from the current one. Some worlds
    // (candy/maze/crystal/meadow) have zero monsters, which is fine.
    const curWorldIdx = E.passageWorldIndex(sharedRef.current.day || 1);
    if (s._evilMonstersWorldIdx !== curWorldIdx) { s.evilMonsters = []; s._evilMonstersWorldIdx = curWorldIdx; }
    if (!s.evilMonsters || (!s.evilMonsters.length && curWorldIdx === 0)) {
      s.evilMonsters = getEvilWorldCached(E, sharedRef.current.day || 1).monsters.map(mo => ({ ...mo }));
    }
    const now = Date.now();
    for (const mo of s.evilMonsters) {
      mo.animT = (mo.animT || 0) + dt * 6;
      // Créature terrassée (3e victoire d'un joueur, voir handler evilBiteResult) :
      // plus aucune IA, figée le temps de l'animation puis retirée après la boucle.
      if (mo.dead) { mo.chasing = false; mo.fleeing = false; continue; }
      const biteFleeing = !!mo.biteFleeUntil && now < mo.biteFleeUntil;
      if (mo.biteFleeUntil && !biteFleeing) mo.biteFleeUntil = 0;
      // Morsure en cours (mini-jeu ouvert chez la cible) : immobile jusqu'au
      // résultat ou au délai de grâce (même marge réseau que les loups).
      if (mo.biteTargetId && now < (mo.biteDeadline || 0)) { mo.fleeing = biteFleeing; mo.chasing = false; continue; }
      if (mo.biteTargetId) { mo.biteTargetId = null; mo.biteDeadline = 0; }
      let near = null, nearD = Infinity;
      // Grâce anti-re-morsure (chantier 2026-07) : un joueur qui vient de gagner
      // est ignoré (comme immunisé) pendant C.EVIL_MONSTER_BITE_GRACE_MS.
      for (const t of evil) { if (t.immune) continue; if (mo.biteGrace && mo.biteGrace[t.id] && now < mo.biteGrace[t.id]) continue; const d = Math.hypot(t.x - mo.x, t.y - mo.y); if (d < nearD) { nearD = d; near = t; } }
      if (!near) { mo.chasing = false; mo.fleeing = biteFleeing; continue; }
      const ddx = near.x - mo.x, ddy = near.y - mo.y, dist = nearD || 0.0001;
      if (!biteFleeing && dist <= C.EVIL_MONSTER_CATCH_RADIUS) {
        mo.biteTargetId = near.id;
        mo.biteDeadline = now + C.EVIL_BITE_REACT_MS + 900;
        mo.chasing = true; mo.fleeing = false;
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { evilBite: { id: near.id, monsterId: mo.id } } });
        continue;
      }
      if (dist <= C.EVIL_MONSTER_DETECT_RADIUS || biteFleeing) {
        const speed = C.EVIL_MONSTER_SPEED * dt;
        const sign = biteFleeing ? -1 : 1;
        mo.x += sign * (ddx / dist) * speed; mo.y += sign * (ddy / dist) * speed;
        mo.dir = (sign * ddx) < 0 ? 2 : 3;
      }
      mo.chasing = !biteFleeing && dist <= C.EVIL_MONSTER_DETECT_RADIUS;
      mo.fleeing = biteFleeing;
    }
    // Retrait des créatures terrassées une fois leur animation de mort finie.
    if (s.evilMonsters.some(m => m.dead && now >= (m.deadUntil || 0))) {
      s.evilMonsters = s.evilMonsters.filter(m => !(m.dead && now >= (m.deadUntil || 0)));
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { evilMonsters: s.evilMonsters } });
    }
    evilMonstersAccumRef.current += dt;
    if (evilMonstersAccumRef.current >= 0.5 && netCanBroadcast()) {
      evilMonstersAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { evilMonsters: s.evilMonsters } });
    }
  }
  function updateWolves(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current;
    const now = Date.now();
    const tmin = E.gameTimeMin(s.dayStartAt, now);
    const night = E.isNightTime(tmin);
    if (!s.wolfNight) s.wolfNight = { active: false, kills: 0 };
    if (night && !s.wolfNight.active) {
      s.wolfNight = { active: true, kills: 0 };
      s.wolves = [];
      for (let i = 0; i < C.WOLF_COUNT; i++) {
        const p = E.wolfSpawnPos(w, Math.random);
        s.wolves.push({
          id: "wolf" + i + "_" + now, x: p.x, y: p.y, tx: p.x, ty: p.y, dir: 2, animT: 0,
          state: "stop", phase: "roam", roamAnchor: { x: p.x, y: p.y }, roamTarget: null, nextRoamAt: 0,
          nextHuntCheckAt: now + 3000 + Math.random() * C.WOLF_HUNT_TRIGGER_MS,
          bridgeIdx: -1, huntAnimalIdx: -1, eatUntil: 0, fleeUntil: 0,
          // Loup agressif (chantier 2026-07) : ne fuit pas la torche, tente une
          // morsure à la place (voir la branche `scare` plus bas). Trait FIXE
          // tiré une seule fois à l'apparition (pas un tirage à chaque frame).
          aggressive: Math.random() < C.WOLF_AGGRESSIVE_CHANCE,
          attackTargetId: null, biteTargetId: null, biteDeadline: 0,
        });
      }
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolves: s.wolves } });
      minimapDirtyRef.current = true;
      return;
    } else if (!night && s.wolfNight.active) {
      s.wolfNight = { active: false, kills: 0 };
      s.wolves = [];
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolves: s.wolves } });
      minimapDirtyRef.current = true;
      return;
    }
    if (!s.wolves || !s.wolves.length) return;

    // Porteurs de torche allumée (soi-même + distants), pour la fuite. `id`
    // conservé (chantier 2026-07) : un loup agressif qui décide d'attaquer au
    // lieu de fuir a besoin de savoir QUI viser (voir plus bas, phase "attack").
    const torchBearers = [];
    const mm = meRef.current;
    if (mm && torchOnRef.current) torchBearers.push({ id: mm.id, x: mm.x, y: mm.y });
    for (const p of playersRef.current.values()) if (p.torch) torchBearers.push({ id: p.id, x: p.x, y: p.y });

    // Grâce anti-re-morsure (chantier 2026-07) : après une victoire, le loup ne
    // peut pas re-cibler CE joueur pendant C.WOLF_BITE_GRACE_MS (voir
    // resolveWolfBiteOutcome). Empêche le ré-aggro instantané d'un loup agressif.
    const biteGraceActive = (wf, id) => !!(wf.biteGrace && wf.biteGrace[id] && now < wf.biteGrace[id]);
    let animalsChanged = false, moved = false;
    for (const wf of s.wolves) {
      // Loup terrassé (3e victoire d'un joueur, voir resolveWolfBiteOutcome) :
      // figé le temps de l'animation de mort, puis retiré (réutilise le filtre
      // `gone` plus bas). Ne fait plus AUCUNE IA entre-temps.
      if (wf.phase === "dead") {
        wf.state = "dead"; wf.tx = wf.x; wf.ty = wf.y;
        if (now >= (wf.deadUntil || 0)) wf.gone = true;
        continue;
      }
      let scare = null, scareD = Infinity;
      for (const t of torchBearers) {
        const d = Math.hypot(t.x - wf.x, t.y - wf.y);
        if (d < C.WOLF_TORCH_RANGE && d < scareD) { scareD = d; scare = t; }
      }
      let speed = 0;
      if (scare) {
        if (wf.aggressive && wf.phase !== "attack" && wf.phase !== "biting" && wf.phase !== "flee" && !biteGraceActive(wf, scare.id)) {
          // Loup agressif (chantier 2026-07, ~1 loup sur 5) : ignore la peur
          // de la torche et fonce sur son porteur au lieu de fuir. Repas en
          // cours abandonné, comme pour la fuite classique.
          wf.huntAnimalIdx = -1;
          wf.phase = "attack"; wf.attackTargetId = scare.id;
        } else if (!wf.aggressive) {
          // Repas en cours interrompu par la torche : l'animal visé est sauvé.
          wf.huntAnimalIdx = -1;
          wf.phase = "flee"; wf.fleeUntil = now + C.WOLF_FLEE_COOLDOWN_MS;
          const dx = wf.x - scare.x, dy = wf.y - scare.y, d = Math.hypot(dx, dy) || 1;
          wf.tx = wf.x + (dx / d) * 4; wf.ty = wf.y + (dy / d) * 4;
          wf.state = "run"; speed = C.WOLF_SPEED_FAST;
        }
      } else if (wf.phase === "flee") {
        if (now < wf.fleeUntil) { wf.state = "run"; speed = C.WOLF_SPEED_FAST; }
        else wf.phase = E.riverSideOf(w, wf.x, wf.y) === "west" ? "return" : "roam";
      }
      if (wf.phase === "attack") {
        // Fonce vers le fermier visé (ou le plus proche si celui-ci a lâché
        // sa torche/quitté la portée entretemps) jusqu'à portée de morsure.
        wf.state = "run"; speed = C.WOLF_SPEED_AGGRESSIVE;
        const target = (wf.attackTargetId && livePlayerPos(wf.attackTargetId)) || (scare ? livePlayerPos(scare.id) : null);
        // Cible sous grâce (vient de gagner) : on abandonne l'attaque au lieu de
        // re-mordre — filet de sécurité en plus du blocage du ré-aggro plus haut.
        if (target && biteGraceActive(wf, target.id)) { wf.phase = "roam"; wf.attackTargetId = null; }
        else if (!target) { wf.phase = "roam"; }
        else {
          wf.attackTargetId = target.id;
          wf.tx = target.x; wf.ty = target.y;
          if (Math.hypot(target.x - wf.x, target.y - wf.y) < C.WOLF_BITE_RANGE) {
            wf.phase = "biting"; wf.biteTargetId = target.id;
            wf.biteDeadline = now + C.WOLF_BITE_REACT_MS + 900; // + marge réseau
            wf.state = "stop"; speed = 0;
            channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolfBite: { id: target.id, wolfId: wf.id } } });
          }
        }
      } else if (wf.phase === "biting") {
        // Immobile, en attente du mini-jeu côté joueur (req "wolfBiteResult")
        // ou du délai de grâce : sans réaction à temps, la morsure réussit.
        wf.state = "stop"; speed = 0; wf.tx = wf.x; wf.ty = wf.y;
        if (now >= wf.biteDeadline) resolveWolfBiteOutcome(wf, "fail");
      } else if (!scare && wf.phase !== "flee") {
        if (wf.phase === "roam") {
          wf.state = "walk"; speed = C.WOLF_SPEED_SLOW;
          if (!wf.roamTarget || Math.hypot(wf.roamTarget.x - wf.x, wf.roamTarget.y - wf.y) < 0.3 || now >= wf.nextRoamAt) {
            const a = Math.random() * Math.PI * 2, d = Math.random() * C.WOLF_ROAM_RADIUS;
            wf.roamTarget = { x: wf.roamAnchor.x + Math.cos(a) * d, y: wf.roamAnchor.y + Math.sin(a) * d };
            wf.nextRoamAt = now + 3000 + Math.random() * 3000;
          }
          wf.tx = wf.roamTarget.x; wf.ty = wf.roamTarget.y;
          if (now >= wf.nextHuntCheckAt) {
            if (s.wolfNight.kills < C.WOLF_MAX_KILLS_PER_NIGHT && (s.animals || []).some(a => !a.carriedBy)) wf.phase = "toBridge";
            wf.nextHuntCheckAt = now + C.WOLF_HUNT_TRIGGER_MS + Math.random() * 4000;
          }
        } else if (wf.phase === "toBridge") {
          wf.state = "walk"; speed = C.WOLF_SPEED_SLOW;
          if (wf.bridgeIdx < 0 || !E.bridgeIsOpen(w, wf.bridgeIdx)) wf.bridgeIdx = E.nearestOpenBridge(w, wf.x, wf.y);
          if (wf.bridgeIdx < 0) wf.phase = "roam";
          else {
            const p = E.bridgeCrossPoint(w, wf.bridgeIdx);
            wf.tx = p.x; wf.ty = p.y;
            if (Math.hypot(p.x - wf.x, p.y - wf.y) < 0.6) wf.phase = "cross";
          }
        } else if (wf.phase === "cross") {
          wf.state = "walk"; speed = C.WOLF_SPEED_SLOW;
          if (!E.bridgeIsOpen(w, wf.bridgeIdx)) { wf.phase = "toBridge"; wf.bridgeIdx = -1; }
          else {
            const p = E.bridgeCrossPoint(w, wf.bridgeIdx);
            const westX = p.x - 4;
            wf.tx = westX; wf.ty = p.y;
            if (E.riverSideOf(w, wf.x, wf.y) === "west" && Math.abs(wf.x - westX) < 0.6) wf.phase = "hunt";
          }
        } else if (wf.phase === "hunt") {
          wf.state = "run"; speed = C.WOLF_SPEED_FAST;
          const animals = s.animals || [];
          let an = wf.huntAnimalIdx >= 0 ? animals[wf.huntAnimalIdx] : null;
          if (!an || an.carriedBy) {
            let bi = -1, bd = Infinity;
            for (let i = 0; i < animals.length; i++) { const a = animals[i]; if (a.carriedBy) continue; const d = Math.hypot(a.hx - wf.x, a.hy - wf.y); if (d < bd) { bd = d; bi = i; } }
            wf.huntAnimalIdx = bi; an = bi >= 0 ? animals[bi] : null;
          }
          if (!an) wf.phase = "return";
          else {
            const ap = E.animalPos(an, now);
            wf.tx = ap.x; wf.ty = ap.y;
            if (Math.hypot(ap.x - wf.x, ap.y - wf.y) < C.WOLF_EAT_RANGE) { wf.phase = "eat"; wf.eatUntil = now + C.WOLF_EAT_MS; }
          }
        } else if (wf.phase === "eat") {
          wf.state = "stop"; speed = 0; wf.tx = wf.x; wf.ty = wf.y;
          if (now >= wf.eatUntil) {
            const animals = s.animals || [];
            const an = wf.huntAnimalIdx >= 0 ? animals[wf.huntAnimalIdx] : null;
            if (an && !an.carriedBy) {
              animals.splice(wf.huntAnimalIdx, 1);
              s.wolfNight.kills++;
              animalsChanged = true;
              addChat("🐺", L.wolfAteAnimal());
            }
            wf.huntAnimalIdx = -1; wf.phase = "return";
          }
        } else if (wf.phase === "return") {
          wf.state = "walk"; speed = C.WOLF_SPEED_SLOW;
          if (E.riverSideOf(w, wf.x, wf.y) === "east") { wf.phase = "roam"; wf.roamAnchor = { x: wf.x, y: wf.y }; }
          else {
            if (wf.bridgeIdx < 0 || !E.bridgeIsOpen(w, wf.bridgeIdx)) wf.bridgeIdx = E.nearestOpenBridge(w, wf.x, wf.y);
            if (wf.bridgeIdx < 0) {
              // Plus aucun pont ouvert (décision Guillaume 2026-07) : le loup
              // ne reste plus planté sur la rive ferme — il détale LE LONG de
              // la rivière (côté ouest, jamais à la nage) vers le bord de
              // carte le plus proche, et despawn en l'atteignant (voir le
              // filtre `gone` après la boucle). Si un pont rouvre entretemps,
              // nearestOpenBridge (relancé à chaque tick tant que
              // bridgeIdx < 0) reprend le dessus et il rentre normalement.
              wf.state = "run"; speed = C.WOLF_SPEED_FAST;
              if (!wf.escapeDir) wf.escapeDir = wf.y < w.h / 2 ? -1 : 1;
              wf.tx = E.riverCenterAt(w, wf.y + wf.escapeDir * 3) - 3;
              wf.ty = wf.y + wf.escapeDir * 3;
              if (wf.y < 2 || wf.y > w.h - 3) wf.gone = true;
            }
            else { wf.escapeDir = 0; const p = E.bridgeCrossPoint(w, wf.bridgeIdx); wf.tx = p.x + 4; wf.ty = p.y; }
          }
        }
      }
      // Cap de contournement anti-blocage en cours (posé plus bas) : il
      // remplace temporairement la cible normale de la phase.
      if (wf.detourUntil && now < wf.detourUntil && wf.detour) { wf.tx = wf.detour.x; wf.ty = wf.detour.y; }
      else if (wf.detourUntil && now >= wf.detourUntil) { wf.detourUntil = 0; wf.detour = null; }
      if (speed > 0 && wf.tx !== undefined) {
        const dx = wf.tx - wf.x, dy = wf.ty - wf.y, d = Math.hypot(dx, dy);
        if (d > 0.02) {
          const step = Math.min(speed * dt, d);
          const nx = wf.x + (dx / d) * step, ny = wf.y + (dy / d) * step;
          // Ne jamais marcher sur l'eau (rivière, pont pas encore ouvert) : en
          // phase "cross" le loup avance sur un pont ouvert (case non-eau),
          // toutes les autres phases (dont "flee", qui visait tout droit vers
          // un point pouvant tomber dans la rivière) doivent rester sur leur
          // rive tant qu'un pont ouvert n'a pas été emprunté.
          // Correctif 2026-07 (demande Guillaume : "ils ne doivent pas être
          // coincés trop longtemps") : au lieu de se figer net contre la
          // berge, il GLISSE le long (essai axe X seul, puis axe Y seul,
          // comme la collision joueur canStand).
          let mx = wf.x, my = wf.y;
          if (!E.isWaterTile(w, nx, ny)) { mx = nx; my = ny; }
          else if (!E.isWaterTile(w, nx, wf.y)) { mx = nx; }
          else if (!E.isWaterTile(w, wf.x, ny)) { my = ny; }
          const adv = Math.hypot(mx - wf.x, my - wf.y);
          if (adv > 0.001) {
            wf.dir = Math.abs(mx - wf.x) > Math.abs(my - wf.y) ? (mx < wf.x ? 2 : 3) : (my < wf.y ? 1 : 0);
            wf.x = mx; wf.y = my;
            wf.animT += dt * (speed >= C.WOLF_SPEED_FAST ? 10 : 5);
            moved = true;
          } else wf.animT = 0;
          // Anti-blocage : s'il n'avance presque plus alors qu'il veut
          // avancer, au bout de C.CRITTER_STUCK_S secondes cumulées il prend
          // un cap perpendiculaire court (C.CRITTER_DETOUR_MS) pour
          // contourner l'obstacle, puis reprend sa cible.
          if (adv < step * 0.25) {
            wf.stuckT = (wf.stuckT || 0) + dt;
            if (wf.stuckT >= C.CRITTER_STUCK_S) {
              wf.stuckT = 0;
              const sgn = Math.random() < 0.5 ? 1 : -1;
              wf.detour = { x: wf.x - (dy / d) * 4 * sgn, y: wf.y + (dx / d) * 4 * sgn };
              wf.detourUntil = now + C.CRITTER_DETOUR_MS;
            }
          } else wf.stuckT = 0;
        }
      } else wf.animT = 0;
    }
    // Despawn des loups en fuite définitive (phase "return" sans pont ouvert,
    // décision Guillaume 2026-07 : "court le long de la rivière et s'éloigne
    // jusqu'à despawn") : retirés du monde une fois le bord de carte atteint.
    if (s.wolves.some(x => x.gone)) {
      s.wolves = s.wolves.filter(x => !x.gone);
      minimapDirtyRef.current = true;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolves: s.wolves } });
    }
    if (moved) minimapDirtyRef.current = true;
    if (animalsChanged) {
      dirtyRef.current = true;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { animals: s.animals, wolves: s.wolves } });
      wolfAccumRef.current = 0;
      return;
    }
    wolfAccumRef.current += dt;
    if (wolfAccumRef.current >= 0.5 && netCanBroadcast() && anyRemoteNearList(s.wolves)) {
      wolfAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { wolves: s.wolves } });
    }
  }
  // Greg, l'employé de champs (chantier 2026-07). Simulation hôte, même
  // squelette que updateWolves/updateRabbits (rôdaille par ancre + throttle
  // réseau ~150ms), plus une file de tâches (till/plant/water) et un
  // détection fréquente (GREG_WATER_CHECK_MS) des cultures qui ont besoin d'eau
  // (findThirstyCrops/cropGrowState().needsWater), mises en file comme tâches
  // "water" : Greg s'y rend PHYSIQUEMENT à pied avant d'arroser (gregWater),
  // dès qu'une culture manque d'eau — plutôt que l'ancien arrosage instantané
  // (télétransporté, toutes les 10h) — demande Guillaume. Peu importe qui a
  // planté (joueur ou Greg lui-même) : findThirstyCrops scanne tout le champ.
  // "Greg doit toujours se balader autour du champs tant qu'il est employé" :
  // en l'absence de tâche, il repasse systématiquement en rôdaille autour
  // de son ancre — jamais immobile.
  function updateGreg(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current, g = s.greg;
    if (!g) return;
    const now = Date.now();
    if (g.expiresAt <= now) {
      s.greg = null;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { greg: null } });
      addChat("🧑‍🌾", lang === "en" ? "Greg's contract has ended." : "Le contrat de Greg est terminé.");
      dirtyRef.current = true;
      return;
    }
    // Vérification fréquente (15s réelles) : dès qu'une culture manque d'eau,
    // Greg est envoyé physiquement l'arroser (tâche "water" en tête de file,
    // prioritaire sur le débroussaillage) — pas d'arrosage instantané.
    if (now - (g.lastWaterCheckAt || 0) >= C.GREG_WATER_CHECK_MS) {
      g.lastWaterCheckAt = now;
      const thirsty = E.findThirstyCrops(w, now, C.GREG_WATER_BATCH);
      if (thirsty.length) {
        g.taskQueue = g.taskQueue || [];
        const queued = new Set(g.taskQueue.filter(t => t.a === "water").map(t => t.i));
        const newTasks = thirsty.filter(i => !queued.has(i)).map(i => ({ a: "water", i }));
        if (newTasks.length) g.taskQueue.unshift(...newTasks);
      }
    }
    // Extension du champ (chantier 2026-07, demande Guillaume) : quand Greg
    // n'a plus de tâche en attente, il repère les arbres/rochers autour de
    // son ancre et les met en file (chop/mine) pour agrandir la zone
    // cultivable — pas besoin d'un ordre explicite du joueur. Scan throttlé
    // (GREG_CLEAR_CHECK_MS) pour ne pas rescanner à chaque frame.
    if ((!g.taskQueue || g.taskQueue.length === 0) && now - (g.lastClearCheckAt || 0) >= C.GREG_CLEAR_CHECK_MS) {
      g.lastClearCheckAt = now;
      const anchor = g.roamAnchor || C.GREG_ANCHOR;
      const found = E.findClearableTiles(w, anchor, C.GREG_CLEAR_BATCH);
      for (const ti of found) {
        g.taskQueue = g.taskQueue || [];
        g.taskQueue.push({ a: w.objects[ti] === C.O_ROCK ? "mine" : "chop", i: ti });
      }
    }
    let speed = 0, moved = false;
    if (g.taskQueue && g.taskQueue.length > 0) {
      const t = g.taskQueue[0];
      const tx = E.xOf(t.i) + 0.5, ty = E.yOf(t.i) + 0.5;
      g.tx = tx; g.ty = ty; speed = C.GREG_TASK_SPEED; g.phase = "task"; g.sitting = false;
      const d = Math.hypot(tx - g.x, ty - g.y);
      if (d <= C.GREG_TASK_RANGE) {
        let ok = false, patch = null;
        if (t.a === "till") { ok = E.gregTill(w, t.i); if (ok) { recordTileOverride(t.i); patch = { tiles: [{ i: t.i, g: w.ground[t.i], o: w.objects[t.i] }] }; } }
        else if (t.a === "plant") { ok = E.gregPlant(w, t.i, t.crop); if (ok) patch = { crops: [{ i: t.i, c: w.crops.get(t.i) }] }; }
        else if (t.a === "water") { ok = E.gregWater(w, t.i, now); if (ok) patch = { crops: [{ i: t.i, c: w.crops.get(t.i) }] }; }
        else if (t.a === "fertilize") { ok = E.gregFertilize(w, t.i, now); if (ok) patch = { crops: [{ i: t.i, c: w.crops.get(t.i) }] }; }
        else if (t.a === "chop") {
          const r = E.gregChop(w, t.i);
          recordTileOverride(t.i);
          const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0 });
          if (r.wood) stock.wood += r.wood;
          patch = { tiles: [{ i: t.i, g: w.ground[t.i], o: w.objects[t.i], hp: w.objHp.get(t.i) }], gregStock: stock };
          if (r.done) g.taskQueue.shift();
          dirtyRef.current = true;
          if (patch) channelRef.current?.send({ type: "broadcast", event: "apply", payload: patch });
          return;
        } else if (t.a === "mine") {
          const r = E.gregMine(w, t.i);
          recordTileOverride(t.i);
          const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0 });
          if (r.stone) stock.stone += r.stone;
          patch = { tiles: [{ i: t.i, g: w.ground[t.i], o: w.objects[t.i], hp: w.objHp.get(t.i) }], gregStock: stock };
          if (r.done) g.taskQueue.shift();
          dirtyRef.current = true;
          if (patch) channelRef.current?.send({ type: "broadcast", event: "apply", payload: patch });
          return;
        }
        g.taskQueue.shift();
        dirtyRef.current = true;
        if (patch) channelRef.current?.send({ type: "broadcast", event: "apply", payload: patch });
      }
    } else {
      g.phase = "roam";
      if (!g.roamAnchor) g.roamAnchor = { x: C.GREG_ANCHOR.x, y: C.GREG_ANCHOR.y };
      // Au repos, Greg marche tranquillement autour de son ancre et, de temps
      // à autre, s'assoit sur son tabouret un moment (Zzz) au lieu de
      // repartir aussitôt.
      if (g.sitUntil && now < g.sitUntil) {
        g.sitting = true; speed = 0; g.tx = g.x; g.ty = g.y;
      } else {
        if (g.sitting) { g.sitting = false; g.roamTarget = null; g.nextRoamAt = 0; }
        speed = C.GREG_SPEED * 0.55;
        if (!g.roamTarget || Math.hypot(g.roamTarget.x - g.x, g.roamTarget.y - g.y) < 0.3 || now >= (g.nextRoamAt || 0)) {
          if (Math.random() < C.GREG_SIT_CHANCE) {
            const sitMs = C.GREG_SIT_MIN_MS + Math.random() * (C.GREG_SIT_MAX_MS - C.GREG_SIT_MIN_MS);
            g.sitUntil = now + sitMs;
            g.sitting = true; speed = 0; g.tx = g.x; g.ty = g.y;
          } else {
            const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * C.GREG_ROAM_RADIUS;
            g.roamTarget = { x: g.roamAnchor.x + Math.cos(a) * d, y: g.roamAnchor.y + Math.sin(a) * d };
            g.nextRoamAt = now + 1500 + Math.random() * 2500;
          }
        }
        if (!g.sitting && g.roamTarget) { g.tx = g.roamTarget.x; g.ty = g.roamTarget.y; }
      }
    }
    if (speed > 0 && g.tx !== undefined) {
      const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy);
      if (d > 0.02) {
        const step = Math.min(speed * dt, d);
        const nx = g.x + (dx / d) * step, ny = g.y + (dy / d) * step;
        if (!E.isWaterTile(w, nx, ny)) {
          g.x = nx; g.y = ny;
          g.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
          g.animT = (g.animT || 0) + dt * 6; g.moving = true; moved = true;
        } else g.animT = 0;
      } else g.moving = false;
    } else g.moving = false;
    if (moved) minimapDirtyRef.current = true;
    // Arrosage passif "en marchant" (demande Guillaume : Greg doit être plus
    // efficace, pas juste faire un aller-retour dédié case par case comme
    // avant). Même principe que checkWalkOverWater côté joueur : QUELLE QUE
    // SOIT la case sous ses pieds à cet instant — qu'il se rende à une
    // tâche "water" précise, à une tâche "till"/"chop"/"mine", ou qu'il
    // rôdaille sans tâche — toute culture assoiffée croisée au passage est
    // arrosée instantanément, sans détour ni attente de son tour dans
    // `taskQueue`. Ça ne remplace pas la file de tâches "water" (toujours
    // utile pour les cultures isolées, hors du chemin naturel de Greg),
    // mais ça évite désormais un trajet dédié par case pour tout ce qu'il
    // traverse en marchant vers autre chose — exactement comme un joueur
    // avec l'arrosoir équipé. On retire aussi du taskQueue toute tâche
    // "water" déjà en file pour cette même case, désormais inutile.
    const gtx = Math.floor(g.x + 0.5), gty = Math.floor(g.y + 0.5);
    if (inMap(gtx, gty)) {
      const gi = idxOf(gtx, gty);
      const gc = w.crops.get(gi);
      if (gc) {
        const ggs = E.cropGrowState(gc, now);
        if (!ggs.mature && ggs.needsWater) {
          const wOk = E.gregWater(w, gi, now);
          if (wOk) {
            if (g.taskQueue && g.taskQueue.length) g.taskQueue = g.taskQueue.filter(t => !(t.a === "water" && t.i === gi));
            dirtyRef.current = true;
            channelRef.current?.send({ type: "broadcast", event: "apply", payload: { crops: [{ i: gi, c: w.crops.get(gi) }] } });
          }
        }
      }
    }
    gregAccumRef.current += dt;
    if (gregAccumRef.current >= 0.5 && netCanBroadcast() && anyRemoteNear(g.x, g.y)) {
      gregAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { greg: g } });
    }
  }
  // Zip 247 (demande Guillaume : "when they move in, they start working on the
  // farm, based on what they promised to contribute when they convinced us to
  // let them move in"). Les résidents (visiteurs ayant emménagé après un vote,
  // s.station.residents) ne se contentent plus de figurer devant leur maison :
  // l'HÔTE leur fait produire une contribution concrète toutes les
  // RESIDENT_WORK_MS, choisie d'après le `theme` de leur fiche de roster —
  // c'est-à-dire d'après le `job` qu'ils ont promis pendant le vote
  // (RESIDENT_TASK_BY_THEME, fermeConstants.js).
  //  - "crops"  : arrose les cultures assoiffées (comme Greg, mais sans trajet)
  //  - "wood"   : abat un arbre     -> gregStock.wood
  //  - "stone"  : mine un rocher    -> gregStock.stone
  //  - "fish"   : poisson           -> gregStock.fish
  //  - "gold"   : revenu            -> s.money
  // Aucun sprite ni canal réseau dédié : on réutilise les patchs
  // tiles/crops/gregStock/state déjà gérés par applyDeltas côté invités.
  // `nextWorkAt`/`announced` sont du bookkeeping HÔTE porté par l'objet
  // resident (normalizeStation conserve les champs supplémentaires).
  // Zip 252 : balade d'un résident sur la ferme (host), pour qu'on puisse
  // l'aborder (Q). Positions diffusées à part (residentSim, ~2 Hz).
  // Zip 259 : position (coin haut-gauche, en tuiles) d'un bâtiment d'artisan.
  // Déplaçable : on lit crafts[bid].pos si présent, sinon le site d'origine.
  function artisanPos(bid) {
    const cb = (sharedRef.current.crafts || {})[bid];
    const def = C.ARTISAN_BUILDINGS[bid];
    if (cb && cb.pos && typeof cb.pos.x === "number") return { x: cb.pos.x, y: cb.pos.y };
    return def ? { x: def.site.x, y: def.site.y } : { x: 0, y: 0 };
  }
  // Zip 259 : point d'ancrage de rôdaille d'un artisan = juste DEVANT (au sud
  // de) son bâtiment, à sa position actuelle. Renvoie null si pas de bâtiment
  // construit (l'artisan se balade alors près du spawn).
  function artisanAnchor(skill) {
    const bid = C.SKILL_BUILDING[skill];
    if (!bid) return null;
    const cb = (sharedRef.current.crafts || {})[bid];
    if (!cb || !cb.built) return null;
    const def = C.ARTISAN_BUILDINGS[bid], p = artisanPos(bid);
    return { x: p.x + def.w / 2, y: p.y + def.h + 0.5 };
  }
  function residentRoam(res, w, now, dt, ro) {
    // Zip 256/259 : un artisan à bâtiment (apiculteur/fromager/pâtissière) rôde
    // autour de SON bâtiment, à sa position ACTUELLE (déplaçable, voir
    // artisanAnchor), au lieu d'une ancre fixe — corrige "l'apiculteur planté
    // devant le farm market" et fait que la pâtissière se tient devant sa
    // boutique. Les autres résidents se baladent près du spawn commun.
    const bAnchor = ro && ro.skill ? artisanAnchor(ro.skill) : null;
    const anchor = bAnchor || C.SPAWN;
    const rx = bAnchor ? 3 : 9, ry = bAnchor ? 3 : 7;
    if (typeof res.x !== "number" || typeof res.y !== "number") {
      res.x = anchor.x + (Math.random() * (rx * 0.9) - rx * 0.45); res.y = anchor.y + (Math.random() * (ry * 0.9) - ry * 0.45);
      res.dir = 0; res.animT = 0; res.moving = false; res.roamTarget = null; res.nextRoamAt = 0;
    }
    if (!res.roamTarget || now >= (res.nextRoamAt || 0) || Math.hypot(res.roamTarget.x - res.x, res.roamTarget.y - res.y) < 0.2) {
      res.nextRoamAt = now + 2500 + Math.random() * 4500;
      if (Math.random() < 0.25) { res.roamTarget = null; res.moving = false; }
      else { let tries = 0, tx = res.x, ty = res.y; do { tx = anchor.x + (Math.random() * 2 - 1) * rx; ty = anchor.y + (Math.random() * 2 - 1) * ry; tries++; } while (tries < 6 && (!inMap(Math.floor(tx), Math.floor(ty)) || E.blockedTile(w, tx, ty))); res.roamTarget = { x: tx, y: ty }; }
    }
    if (res.roamTarget) {
      const dx = res.roamTarget.x - res.x, dy = res.roamTarget.y - res.y, d = Math.hypot(dx, dy);
      if (d < 0.08) res.moving = false;
      else { const step = Math.min(d, C.VISITOR_SPEED * 0.7 * dt); const nx = res.x + (dx / d) * step, ny = res.y + (dy / d) * step; if (!E.blockedTile(w, nx, ny)) { res.x = nx; res.y = ny; res.moving = true; res.animT = (res.animT || 0) + dt * 6; res.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1); } else res.moving = false; }
    }
  }
  // Zip 252 : tour de travail d'un résident À SKILL. Tristan (lumberjack) abat
  // un arbre ET casse un rocher -> réserve commune ; les métiers à atelier
  // produisent via updateCrafts (rien à faire ici).
  function residentSkillShift(res, ro, w, s) {
    if (ro.skill !== "lumberjack") return;
    const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
    const tiles = [];
    for (const kind of ["tree", "rock"]) {
      const i = E.findResidentTile(w, C.GREG_ANCHOR, kind);
      if (i >= 0) { if (kind === "rock") { E.gregMine(w, i); stock.stone += C.LUMBERJACK_STONE; } else { E.gregChop(w, i); stock.wood += C.LUMBERJACK_WOOD; } recordTileOverride(i); tiles.push({ i, g: w.ground[i], o: w.objects[i], hp: w.objHp.get(i) }); }
    }
    dirtyRef.current = true;
    if (netCanBroadcast()) channelRef.current?.send({ type: "broadcast", event: "apply", payload: { tiles, gregStock: stock } });
  }
  function updateResidents(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current, st = s.station;
    if (!st) return;
    const residents = st.residents || [];
    if (!residents.length) return;
    const now = Date.now();
    for (const res of residents) {
      if (!res) continue;
      const ro = C.VISITOR_ROSTER[res.rid];
      if (!ro) continue;
      // Zip 258 : Eduardo en voyage. Tant qu'il n'est pas rentré, il ne se
      // balade pas et ne travaille pas (il est absent du village). À l'échéance
      // (res.trip.returnAt), on dépose la commande + une éventuelle surprise
      // dans la réserve commune (station.worldStock) et on le fait réapparaître.
      if (res.trip && res.trip.phase === "away") {
        if (now >= res.trip.returnAt) {
          const ws = s.station.worldStock || (s.station.worldStock = {});
          const brought = {};
          for (const line of (res.trip.order || [])) { ws[line.key] = (ws[line.key] | 0) + (line.qty | 0); brought[line.key] = (brought[line.key] | 0) + (line.qty | 0); }
          let surprise = false;
          if (Math.random() < C.VOYAGE_SURPRISE_CHANCE) {
            const g = C.WORLD_GOODS[Math.floor(Math.random() * C.WORLD_GOODS.length)];
            const q = C.VOYAGE_SURPRISE_MIN + Math.floor(Math.random() * (C.VOYAGE_SURPRISE_MAX - C.VOYAGE_SURPRISE_MIN + 1));
            ws[g.key] = (ws[g.key] | 0) + q; brought[g.key] = (brought[g.key] | 0) + q; surprise = true;
          }
          res.trip = null;
          // On efface sa position pour que residentRoam le replace proprement
          // sur une case valide près du spawn (évite de le figer sur une tuile
          // bloquée si VOYAGER_ANCHOR tombait mal).
          delete res.x; delete res.y; delete res.roamTarget; res.moving = false; res.nextRoamAt = 0;
          s.station.voyagerNotice = { goods: brought, surprise, at: now };
          const summary = Object.keys(brought).map(k => `${L.worldGoodName(k)} ×${brought[k]}`).join(", ");
          stationChat(L.voyagerReturned(summary + (surprise ? L.voyagerSurpriseTag : "")), "\u{1F9F3}");
          broadcastStation();
        }
        continue;
      }
      residentRoam(res, w, now, dt, ro); // zip 252 : balade sur la ferme (chaque tick) — zip 256 : ancre dédiée pour l'apiculteur
      // Premier passage : on planifie la première journée de travail sans rien
      // produire (emménager prend un peu de temps). La borne haute protège
      // d'une succession d'hôte : `nextWorkAt` vient de l'horloge de l'hôte
      // PRÉCÉDENT et pourrait, en cas de décalage, être très loin dans le
      // futur — le résident resterait alors bloqué à ne jamais travailler.
      if (!res.nextWorkAt || res.nextWorkAt > now + C.RESIDENT_WORK_MS) { res.nextWorkAt = now + C.RESIDENT_WORK_MS; continue; }
      if (now < res.nextWorkAt) continue;
      res.nextWorkAt = now + C.RESIDENT_WORK_MS;
      // Zip 252 : résident à skill -> travail dédié (Tristan) ou atelier (via
      // updateCrafts), pas le travail générique par thème.
      if (ro.skill) { residentSkillShift(res, ro, w, s); if (!res.announced) { res.announced = true; stationChat(L.residentStarted(ro.name, ro.job), "\u{1F6E0}"); } continue; }
      const task = C.RESIDENT_TASK_BY_THEME[ro.theme] || "gold";
      const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
      if (!Array.isArray(stock.fish)) stock.fish = C.FISH.map(() => 0);
      const patch = {};
      if (task === "crops") {
        const done = [];
        for (const i of E.findThirstyCrops(w, now, C.RESIDENT_WATER_BATCH)) {
          if (E.gregWater(w, i, now)) done.push({ i, c: w.crops.get(i) });
        }
        if (done.length) patch.crops = done;
      } else if (task === "wood" || task === "stone") {
        const i = E.findResidentTile(w, C.GREG_ANCHOR, task === "stone" ? "rock" : "tree");
        if (i >= 0) {
          const r = task === "stone" ? E.gregMine(w, i) : E.gregChop(w, i);
          recordTileOverride(i);
          if (r.wood) stock.wood += r.wood;
          if (r.stone) stock.stone += r.stone;
          patch.tiles = [{ i, g: w.ground[i], o: w.objects[i], hp: w.objHp.get(i) }];
          patch.gregStock = stock;
        }
      } else if (task === "fish") {
        stock.fish[Math.floor(Math.random() * stock.fish.length)] += C.RESIDENT_FISH_PER_SHIFT;
        patch.gregStock = stock;
      } else {
        s.money += C.RESIDENT_GOLD_PER_SHIFT;
        s.totalEarned = (s.totalEarned || 0) + C.RESIDENT_GOLD_PER_SHIFT;
        setHud(h => ({ ...h, money: s.money }));
        patch.state = shareState();
      }
      // Annonce unique, à la toute première journée de travail : on rappelle
      // la promesse faite pendant le vote (ro.job) pour que la contribution
      // soit lisible. Les tours suivants restent silencieux (pas de spam).
      if (!res.announced) { res.announced = true; stationChat(L.residentStarted(ro.name, ro.job), "\u{1F6E0}\uFE0F"); }
      dirtyRef.current = true;
      if (Object.keys(patch).length && netCanBroadcast()) {
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: patch });
      }
    }
    // Zip 252 : diffusion légère des positions des résidents baladeurs (~2 Hz).
    residentNetRef.current += dt;
    if (residentNetRef.current >= C.VISITOR_NET_MS / 1000 && netCanBroadcast()) {
      residentNetRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { residentSim: residents.map(r => ({ rid: r.rid, x: +(+r.x).toFixed(2), y: +(+r.y).toFixed(2), dir: r.dir | 0, moving: !!r.moving, animT: r.animT || 0 })) } });
    }
  }
  // Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume). Simulation
  // hôte, même squelette que updateGreg (rôdaille par ancre + throttle réseau
  // ~150ms), mais sans file de tâches : quatre phases.
  // "roam" (en attente d'ordre, se balade autour de son ancre) -> "toRiver"
  // (se dirige vers la berge trouvée à l'ordre, ou y retourne après une
  // pause) -> "fishing" (posté à la rivière, attrape un poisson toutes les
  // SOAN_FISH_INTERVAL_MS EN CONTINU pendant SOAN_WORK_MS) -> "break" (pause
  // de SOAN_BREAK_MS, il se balade autour de la berge) -> retour en
  // "toRiver", et ainsi de suite EN BOUCLE (demande Guillaume : "boucle
  // pendant 24h") jusqu'à un rappel ou l'expiration du contrat (24h réelles,
  // aucun minuteur de boucle séparé n'est nécessaire).
  function updateSoan(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current, so = s.soan;
    if (!so) return;
    const now = Date.now();
    if (so.expiresAt <= now) {
      s.soan = null;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { soan: null } });
      addChat("🎣", lang === "en" ? "Soan's contract has ended." : "Le contrat de Soan est terminé.");
      dirtyRef.current = true;
      return;
    }
    let speed = 0, moved = false;
    if (so.phase === "toRiver" && so.riverSpot != null) {
      const tx = E.xOf(so.riverSpot) + 0.5, ty = E.yOf(so.riverSpot) + 0.5;
      so.tx = tx; so.ty = ty; speed = C.SOAN_SPEED;
      const d = Math.hypot(tx - so.x, ty - so.y);
      // Arrivée à la berge (premier trajet OU retour après une pause, même
      // code dans les deux cas) : (re)démarre un bloc de pêche de
      // SOAN_WORK_MS.
      if (d <= C.SOAN_TASK_RANGE) { so.phase = "fishing"; so.lastFishAt = now; so.workUntil = now + C.SOAN_WORK_MS; }
    } else if (so.phase === "fishing" && so.riverSpot != null) {
      so.tx = so.x; so.ty = so.y; // reste posté sur place
      if (now >= (so.workUntil || 0)) {
        // 30 min de pêche d'affilée écoulées : pause, il se balade autour de
        // la berge (demande Guillaume : "il ira marcher").
        so.phase = "break"; so.breakUntil = now + C.SOAN_BREAK_MS;
        so.roamAnchor = { x: E.xOf(so.riverSpot) + 0.5, y: E.yOf(so.riverSpot) + 0.5 };
        so.roamTarget = null; so.nextRoamAt = 0;
      } else if (now - (so.lastFishAt || 0) >= C.SOAN_FISH_INTERVAL_MS) {
        // Pêche en continu tant que le bloc de travail n'est pas terminé.
        so.lastFishAt = now;
        const ft = E.soanCatchFish();
        const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
        if (!stock.fish) stock.fish = C.FISH.map(() => 0);
        stock.fish[ft] = (stock.fish[ft] || 0) + 1;
        setGregStock({ ...stock });
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { gregStock: stock } });
        dirtyRef.current = true;
      }
    } else if (so.phase === "break") {
      // Pause : se balade autour de la berge (roamAnchor posé à l'entrée en
      // pause ci-dessus), même mouvement que la rôdaille "roam" mais avec un
      // rayon dédié (SOAN_BREAK_ROAM_RADIUS), jusqu'à la fin de la pause.
      if (now >= (so.breakUntil || 0)) {
        so.phase = "toRiver"; // retour au poste de pêche, redémarre un bloc de travail à l'arrivée
      } else {
        speed = C.SOAN_SPEED * 0.55;
        if (!so.roamTarget || Math.hypot(so.roamTarget.x - so.x, so.roamTarget.y - so.y) < 0.3 || now >= (so.nextRoamAt || 0)) {
          const anchor = so.roamAnchor || C.SOAN_ANCHOR;
          const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * C.SOAN_BREAK_ROAM_RADIUS;
          so.roamTarget = { x: anchor.x + Math.cos(a) * d, y: anchor.y + Math.sin(a) * d };
          so.nextRoamAt = now + 1500 + Math.random() * 2500;
        }
        so.tx = so.roamTarget.x; so.ty = so.roamTarget.y;
      }
    } else {
      so.phase = "roam";
      if (!so.roamAnchor) so.roamAnchor = { x: C.SOAN_ANCHOR.x, y: C.SOAN_ANCHOR.y };
      speed = C.SOAN_SPEED * 0.55; // rôdaille plus lente que le trajet vers la rivière
      if (!so.roamTarget || Math.hypot(so.roamTarget.x - so.x, so.roamTarget.y - so.y) < 0.3 || now >= (so.nextRoamAt || 0)) {
        const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * C.SOAN_ROAM_RADIUS;
        so.roamTarget = { x: so.roamAnchor.x + Math.cos(a) * d, y: so.roamAnchor.y + Math.sin(a) * d };
        so.nextRoamAt = now + 1500 + Math.random() * 2500;
      }
      so.tx = so.roamTarget.x; so.ty = so.roamTarget.y;
    }
    if (speed > 0 && so.tx !== undefined) {
      const dx = so.tx - so.x, dy = so.ty - so.y, d = Math.hypot(dx, dy);
      if (d > 0.02) {
        const step = Math.min(speed * dt, d);
        const nx = so.x + (dx / d) * step, ny = so.y + (dy / d) * step;
        if (!E.isWaterTile(w, nx, ny)) {
          so.x = nx; so.y = ny;
          so.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
          so.animT = (so.animT || 0) + dt * 6; so.moving = true; moved = true;
        } else so.animT = 0;
      } else so.moving = false;
    } else so.moving = false;
    if (moved) minimapDirtyRef.current = true;
    soanAccumRef.current += dt;
    if (soanAccumRef.current >= 0.5 && netCanBroadcast() && anyRemoteNear(so.x, so.y)) {
      soanAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { soan: so } });
    }
  }

  // Zip 260 : Harald, l'AGENT D'ÉLEVAGE (demande Guillaume). Simulation hôte,
  // même famille que Greg/Soan. Il rôde autour de l'enclos (PEN) et fait des
  // RONDES : toutes les HARALD_ROUND_MS, il ramasse TOUTES les productions
  // animales prêtes (readyAt) et les verse au POOL COMMUN (gregStock.animals),
  // exactement comme le bois de Greg / les poissons de Soan — zéro perte, aucun
  // partage par joueur. Le mouvement est cosmétique (il reste dans/autour de
  // l'enclos, ne traverse pas les solides). Le rattrapage HORS-LIGNE est géré
  // séparément au chargement (E.haraldCatchup).
  function updateHarald(dt) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current, h = s.harald;
    if (!h) return;
    const now = Date.now();
    if (h.expiresAt <= now) {
      s.harald = null;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { harald: null } });
      addChat("\uD83E\uDDFA", lang === "en" ? "Harald's contract has ended." : "Le contrat de Harald est terminé.");
      dirtyRef.current = true;
      return;
    }
    // Rôdaille autour de l'ancre (centre de l'enclos), même mouvement que Soan.
    let moved = false;
    if (!h.roamAnchor) h.roamAnchor = { x: C.HARALD_ANCHOR.x, y: C.HARALD_ANCHOR.y };
    if (!h.roamTarget || Math.hypot(h.roamTarget.x - h.x, h.roamTarget.y - h.y) < 0.3 || now >= (h.nextRoamAt || 0)) {
      const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * C.HARALD_ROAM_RADIUS;
      h.roamTarget = { x: h.roamAnchor.x + Math.cos(a) * d, y: h.roamAnchor.y + Math.sin(a) * d };
      h.nextRoamAt = now + 1500 + Math.random() * 2500;
    }
    h.tx = h.roamTarget.x; h.ty = h.roamTarget.y;
    {
      const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
      if (d > 0.02) {
        const step = Math.min(C.HARALD_SPEED * 0.55 * dt, d);
        const nx = h.x + (dx / d) * step, ny = h.y + (dy / d) * step;
        // Collision douce : ne traverse jamais un solide (bâtiments, clôtures…).
        if (!E.blockedTile(w, nx, h.y)) h.x = nx;
        if (!E.blockedTile(w, h.x, ny)) h.y = ny;
        h.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
        h.animT = (h.animT || 0) + dt * 6; h.moving = true; moved = true;
      } else h.moving = false;
    }
    // RONDE de ramassage (zéro perte quand connecté).
    if (now >= (h.nextRoundAt || 0)) {
      h.nextRoundAt = now + C.HARALD_ROUND_MS;
      const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0), animals: C.ANIMALS.map(() => 0) });
      if (!stock.animals) stock.animals = C.ANIMALS.map(() => 0);
      let picked = false;
      for (const an of (s.animals || [])) {
        if (!an || an.carriedBy) continue;
        if (E.animalReady(an, now)) {
          const prodMs = (C.ANIMALS[an.type] && C.ANIMALS[an.type].prodMs) || 0;
          an.readyAt = now + prodMs;
          stock.animals[an.type] = (stock.animals[an.type] || 0) + 1;
          picked = true;
        }
      }
      if (picked) {
        setGregStock({ ...stock });
        channelRef.current?.send({ type: "broadcast", event: "apply", payload: { gregStock: stock, animals: s.animals } });
        dirtyRef.current = true;
      }
    }
    if (moved) minimapDirtyRef.current = true;
    haraldAccumRef.current += dt;
    if (haraldAccumRef.current >= 0.5 && netCanBroadcast() && anyRemoteNear(h.x, h.y)) {
      haraldAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { harald: h } });
    }
  }
  function teleportWell() {
    const m = meRef.current; if (!m || !sharedRef.current.wellBuilt) return;
    m.x = C.WELL_SPAWN.x; m.y = C.WELL_SPAWN.y; m.moving = false;
    sendPos(); pushToast(L.wellToast);
  }
  const buyHorse = () => sendReq({ kind: "buyHorse" });
  const buyWell = () => sendReq({ kind: "buyWell" });
  const houseUpgrade = () => sendReq({ kind: "houseUpgrade" }); // maison à niveaux (2026-07)
  const hireGreg = () => sendReq({ kind: "hireGreg" });
  // Choix de l'ordre (chantier 2026-07, v2 suite retour Guillaume) : on
  // n'envoie PAS tout de suite — le joueur est encore à la boutique. On
  // mémorise juste le choix et on ferme boutique + panneau ; le joueur va
  // ensuite où il veut, puis confirme via le bouton flottant (fireGregOrder).
  const armGregOrder = () => { setGregOrderPending({ crop: gregOrderCrop, count: gregOrderCount }); setGregOrderOpen(false); setShopOpen(false); };
  const cancelGregOrder = () => setGregOrderPending(null);
  const fireGregOrder = () => {
    if (!gregOrderPending) return;
    sendReq({ kind: "gregOrder", crop: gregOrderPending.crop, count: gregOrderPending.count });
    setGregOrderPending(null);
  };
  const buyFertilizer = () => sendReq({ kind: "buyFertilizer" });
  const armFertilizerOrder = () => { setFertilizerOrderPending(true); setFertilizerOrderOpen(false); setShopOpen(false); };
  const cancelFertilizerOrder = () => setFertilizerOrderPending(false);
  const fireFertilizerOrder = () => {
    if (!fertilizerOrderPending) return;
    sendReq({ kind: "gregFertilizeOrder" });
    setFertilizerOrderPending(false);
  };
  const buyAnimal = (type) => sendReq({ kind: "buyAnimal", animal: type });
  // Soan, l'employé pêcheur (chantier 2026-07, demande Guillaume) : contrairement
  // à Greg, un seul ordre possible ("va pêcher"), envoyé directement — pas de
  // panneau de choix ni de bouton flottant à positionner.
  const hireSoan = () => sendReq({ kind: "hireSoan" });
  const hireHarald = () => sendReq({ kind: "hireHarald" }); // zip 260
  const soanOrder = () => sendReq({ kind: "soanOrder" });
  const soanRecall = () => sendReq({ kind: "soanRecall" });
  // Zip 258 : commande de voyage à Eduardo. Envoie la liste { key, qty } non
  // vide au host (voyagerOrder), puis referme le panneau et remet le brouillon
  // à zéro. Le coût/durée sont recalculés et vérifiés côté hôte (autoritaire).
  const setDraftQty = (key, qty) => setVoyagerDraft(d => ({ ...d, [key]: Math.max(0, Math.min(C.VOYAGE_MAX_QTY, qty | 0)) }));
  const voyagerDraftLines = () => C.WORLD_GOODS.map(g => ({ key: g.key, qty: voyagerDraft[g.key] | 0 })).filter(l => l.qty > 0);
  const voyagerDraftCost = () => voyagerDraftLines().reduce((sum, l) => { const g = C.WORLD_GOODS.find(x => x.key === l.key); return sum + (g ? C.worldGoodUnitCost(g) * l.qty : 0); }, 0);
  const voyagerDraftDays = () => voyagerDraftLines().reduce((mx, l) => { const g = C.WORLD_GOODS.find(x => x.key === l.key); return g ? Math.max(mx, (C.VOYAGE_TIERS[g.tier] || C.VOYAGE_TIERS.proche).days) : mx; }, 0);
  const sendVoyagerOrder = () => { const order = voyagerDraftLines(); if (!order.length) return; sendReq({ kind: "voyagerOrder", order }); setVoyagerDraft({}); setVoyagerOrderOpen(false); setEmployeesOpen(false); };
  const sellWorldGood = (key, n) => sendReq({ kind: "voyagerSell", item: key, n });
  // Défi "chasse aux lapins" (chantier 2026-07) : actions RÉSERVÉES à l'hôte
  // (c'est lui qui reçoit la popup de proposition, jamais les autres
  // joueurs) — pas de requête réseau ici, l'hôte modifie directement son
  // propre état partagé puis le diffuse, comme pour le démarrage d'une
  // mission collaborative un peu plus haut.
  function activateRabbitChallenge() {
    const s = sharedRef.current;
    s.rabbitChallenge = { active: true, catches: {}, startedAt: Date.now() };
    setRabbitChallenge(s.rabbitChallenge);
    setRabbitChallengeOffer(false); rabbitChallengeOfferRef.current = false;
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: { rabbitChallenge: s.rabbitChallenge } });
    broadcastChat("🐇", L.rabbitChallengeStarted(C.RABBIT_CHALLENGE_TARGET));
    dirtyRef.current = true;
  }
  function dismissRabbitChallengeOffer() {
    // Ignorer la proposition ne bloque pas définitivement : `rabbitChallengeOfferRef`
    // est relâché pour qu'un futur tirage puisse la reproposer plus tard.
    setRabbitChallengeOffer(false); rabbitChallengeOfferRef.current = false;
  }
  const sellProduct = (type) => sendReq({ kind: "sell", item: "product", product: type, n: 9999 });

  // -------- Passage sombre / carte maléfique (chantier 2026-07, demande
  // Guillaume : "quand un joueur l'empruntera, cela affichera pour lui un
  // écran noir en fondu enchainé et l'emmenera lui seul sur la nouvelle map
  // maléfique") --------
  // Fondu en 2 moitiés (ZONE_FADE_MS chacune) : noir progressif -> bascule
  // RÉELLE de zone/monde/position pile au point le plus noir (invisible pour
  // le joueur) -> retour progressif à la normale. `swapped` évite de
  // rejouer la bascule plusieurs fois pendant la même transition.
  // `viaMonster` (chantier 2026-07, demande Guillaume : créatures maléfiques
  // qui "renvoient chez lui" au contact) : même fondu que le retour normal,
  // mais atterrissage forcé chez le joueur (C.SPAWN) plutôt que sur la case
  // du passage — cohérent avec "sent back to your house" plutôt qu'un simple
  // retour par le passage — et toast dédié. Voir caughtByMonster.
  // Contact avec une créature maléfique (chantier 2026-07, demande
  // Guillaume : "s'il vous touche ou si vous le touchez, vous êtes renvoyé
  // chez vous avec une blessure de 30 minutes") — appelée par
  // updateEvilMonsters (boucle de rendu) dans les deux sens de contact,
  // aucune distinction "attaque"/"subi" : un simple contact suffit. La durée
  // (`until`) est calculée ICI, côté client (seule autorité sur la carte
  // maléfique, jamais synchronisée à l'hôte, voir generateEvilWorld) et
  // appliquée immédiatement en local pour un ressenti instantané ; le MÊME
  // horodatage est envoyé à l'hôte (req "evilCaught") pour persistance/
  // diffusion aux autres joueurs (repérer/soigner un fermier blessé, comme
  // pour une morsure de loup) — l'envoi de la valeur déjà calculée, plutôt
  // que de laisser l'hôte la recalculer, évite un flottement entre les deux
  // (voir applyDeltas : si la valeur revenue de l'hôte diffère de celle déjà
  // posée ici, le fermier serait retéléporté une seconde fois, alors encore
  // en zone maléfique — voir garde `wasInjured`/injuredUntilRef ci-dessous).
  function caughtByMonster() {
    if (zoneTransRef.current.active || isInjured()) return; // déjà en transition ou déjà blessé : ignore
    const until = Date.now() + C.EVIL_INJURED_MS;
    injuredUntilRef.current = until; setInjuredUntil(until);
    sendReq({ kind: "evilCaught", until });
    crossPassage(false, true);
  }
  // Mini-jeu de morsure des créatures maléfiques (chantier 2026-07, demande
  // Guillaume : "ajoute un minijeu pour résister à la morsure") : au contact
  // (voir updateEvilMonsters), la créature s'arrête et ce mini-jeu s'ouvre
  // au lieu d'appliquer caughtByMonster() instantanément. Déclarée au niveau
  // du composant (comme resolveWolfBiteOutcome ne l'est pas — ici tout est
  // local, aucun aller-retour hôte requis, contrairement au loup de la ferme
  // normale) pour rester accessible depuis le bouton du mini-jeu comme
  // depuis un éventuel timeout.
  function resolveEvilBiteOutcome(monsterId, result) {
    // Créatures PARTAGÉES (2026-07) : le dénouement part à l'hôte (req
    // "evilBiteResult") — "win" = la créature fuit un moment pour tout le
    // monde ; "fail" = blessure + retour maison, via caughtByMonster()
    // (inchangé : req "evilCaught", mécanique habituelle de blessure).
    sendReq({ kind: "evilBiteResult", monsterId, result });
    if (result === "win") pushToast(L.evilBiteWin);
    else caughtByMonster();
  }
  function evilBiteWon() {
    const eb = evilBiteRef.current; setEvilBite(null);
    if (eb) resolveEvilBiteOutcome(eb.monsterId, "win");
  }
  function evilBiteLost() {
    const eb = evilBiteRef.current; setEvilBite(null);
    if (eb) resolveEvilBiteOutcome(eb.monsterId, "fail");
  }
  function crossPassage(toEvil, viaMonster) {
    if (zoneTransRef.current.active) return; // déjà en transition : ignore un nouveau déclenchement
    // Zip 253 : le cheval reste à la ferme (décision Guillaume). Un joueur monté
    // qui franchit le passage sombre descend d'abord — sinon l'ancien `rider`
    // traînait le cheval aux coordonnées de la carte maléfique (même ghost-horse
    // que le train vers la ville). Le cheval est laissé sur la ferme à sa place.
    if (toEvil && myHorse()) sendReq({ kind: "dismount" });
    zoneTransRef.current = { active: true, t0: performance.now(), toEvil, swapped: false, viaMonster: !!viaMonster };
  }
  // Valley Town (zip 234): the train ride reuses the exact zone-fade
  // machinery (fade to black, teleport at mid-fade, fade back) with a `dest`
  // field the evil passage never sets — "town" (farm -> Valley Town) or
  // "farmFromTown" (the ride back, arriving on the farm platform).
  function rideTrain(toTown) {
    if (zoneTransRef.current.active) return;
    // Zip 253 (décision Guillaume : "le cheval reste à quai, mais le train
    // emmène quand même le joueur à pied") : un joueur monté qui embarque pour
    // la ville DESCEND d'abord — le cheval est laissé sur la ferme, à la place
    // d'embarquement (dismount fixe h.x/h.y sur la position actuelle du
    // cavalier). Sans ça, l'ancien `rider` restait posé et les autres joueurs
    // voyaient le cheval se téléporter aux coordonnées ville du cavalier
    // (horseAnchor). En ville, plus aucun cheval (monte bloquée, voir
    // toggleMount) — cohérent avec "il restera à la ferme".
    if (toTown && myHorse()) sendReq({ kind: "dismount" });
    zoneTransRef.current = { active: true, t0: performance.now(), toEvil: false, swapped: false, dest: toTown ? "town" : "farmFromTown" };
  }
  function updateZoneTransition() {
    const zt = zoneTransRef.current;
    if (!zt.active) return;
    const elapsed = performance.now() - zt.t0;
    if (!zt.swapped && elapsed >= C.ZONE_FADE_MS) {
      zt.swapped = true;
      const m = meRef.current;
      if (zt.dest === "town") {
        if (!townWorldRef.current) townWorldRef.current = getTownWorldCached(E);
        m.zone = "town";
        m.x = C.TOWN_SPAWN.x; m.y = C.TOWN_SPAWN.y; m.moving = false;
        sendPos(); // publish the town position right away (multiplayer zone)
        pushToast(L.trainToTownToast);
      } else if (zt.dest === "farmFromTown") {
        m.zone = "farm";
        m.x = C.TRAIN_BOARD.x; m.y = C.TRAIN_BOARD.y - 0.5; m.moving = false;
        sendPos();
        pushToast(L.trainToFarmToast);
      } else if (zt.toEvil) {
        // Zip 235: always refresh in case the passage rotated since the
        // last visit. The cached generator is idempotent per week index.
        evilWorldRef.current = getEvilWorldCached(E, sharedRef.current.day || 1);
        m.farmX = m.x; m.farmY = m.y; // position ferme à restaurer au retour
        m.zone = "evil";
        m.x = C.EVIL_SPAWN.x; m.y = C.EVIL_SPAWN.y; m.moving = false;
        sendPos(); // fige la position publique sur la case du passage (voir pubMe)
        pushToast(L.darkPassageToast);
      } else if (zt.viaMonster) {
        m.zone = "farm";
        m.x = C.SPAWN.x; m.y = C.SPAWN.y; m.moving = false;
        sendPos();
        pushToast(L.evilMonsterCaughtToast);
      } else {
        const w = worldRef.current;
        m.zone = "farm";
        m.x = (w && w.darkPassage ? w.darkPassage.x : C.SPAWN.x); m.y = (w && w.darkPassage ? w.darkPassage.y + 1 : C.SPAWN.y); m.moving = false;
        sendPos();
        pushToast(L.darkPassageReturnToast);
      }
    }
    if (elapsed >= C.ZONE_FADE_MS * 2) zt.active = false;
  }
  function zoneFadeAlpha() {
    const zt = zoneTransRef.current;
    if (!zt.active) return 0;
    const elapsed = performance.now() - zt.t0;
    if (elapsed < C.ZONE_FADE_MS) return elapsed / C.ZONE_FADE_MS;
    if (elapsed < C.ZONE_FADE_MS * 2) return 1 - (elapsed - C.ZONE_FADE_MS) / C.ZONE_FADE_MS;
    return 0;
  }
  // Détection automatique (marcher sur la case, pas de touche à presser —
  // "quand un joueur l'empruntera") : une seule direction possible à la
  // fois selon la zone courante, donc pas d'ambiguïté farm/evil ici.
  function checkWalkOverPassage() {
    if (zoneTransRef.current.active) return; // pas de nouveau déclenchement pendant une transition en cours
    const m = meRef.current;
    if (m.zone === "town") return; // zip 234: Valley Town rides back via E at the sign, never by walk-over (its coords would collide with farm passage math)
    const tx = Math.floor(m.x + 0.5), ty = Math.floor(m.y + 0.5);
    if (m.zone === "evil") {
      const ew = evilWorldRef.current; if (!ew) return;
      if (tx === C.EVIL_RETURN_PASSAGE.x && ty === C.EVIL_RETURN_PASSAGE.y) crossPassage(false);
    } else {
      const w = worldRef.current; if (!w || !w.darkPassage) return;
      if (tx === w.darkPassage.x && ty === w.darkPassage.y) crossPassage(true);
    }
  }

  // -------- Téléport maison (nouveauté) --------
  function teleportHome() {
    const m = meRef.current; if (!m) return;
    if (m.zone === "evil" || m.zone === "town") { pushToast(L.homeBlockedToast); return; } // zip 234: teleporting home from Valley Town would desync zone/coords — ride the train back instead
    m.x = C.SPAWN.x; m.y = C.SPAWN.y; m.moving = false;
    sendPos();
    pushToast(L.homeToast);
  }

  // -------- Dormir dans la maison (chantier 2026-07) --------
  // Aucune animation d'entrée : le fermier disparaît simplement de l'écran
  // (voir la boucle de rendu, qui ne dessine plus son personnage tant que
  // m.sleeping est vrai) pendant que des "Zzz" flottent au-dessus des
  // fenêtres de la maison, visibles de TOUS les joueurs (le flag "sleeping"
  // voyage avec la position, diffusée à 12 Hz comme dir/moving/tool, voir
  // pubMe()/le handler "pos"). L'énergie remonte progressivement, pilotée
  // par l'hôte (resolveSleepStart/End, fermeEngine.js) mais interpolée
  // localement ici pour un affichage fluide de la jauge du dormeur.
  function startSleep() {
    const m = meRef.current; if (!m || m.sleeping) return;
    if (energyRef.current >= C.MAX_ENERGY) { pushToast(L.toastSleepFull); return; }
    m.sleeping = true; m.moving = false;
    sleepStartedAtRef.current = performance.now();
    sleepStartEnergyRef.current = energyRef.current;
    sendPos();
    clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => wakeUp(true), C.SLEEP_MS);
    sendReq({ kind: "sleepStart" });
  }
  // auto = sortie naturelle au bout de 60s (énergie pleine) ; sinon sortie
  // anticipée demandée par le joueur (touche E), énergie déjà acquise gardée.
  function wakeUp(auto) {
    const m = meRef.current; if (!m || !m.sleeping) return;
    clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null;
    m.sleeping = false;
    sleepStartedAtRef.current = null;
    sendPos();
    sendReq({ kind: "sleepEnd" });
    pushToast(auto ? L.toastSleepDone : L.toastSleepEarly);
  }

  // -------- Boucle de rendu + entrées --------
  useEffect(() => {
    if (phase !== "playing" || !spritesReady) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const T = C.TILE;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.imageSmoothingEnabled = false; }
    resize();
    window.addEventListener("resize", resize);

    // ----- entrées -----
    function onKeyDown(e) {
      if (document.activeElement === chatInputRef.current) return;
      if (fishMiniRef.current) return; // le minijeu de pêche (ou de morsure) gère ses entrées
      if (isInjured()) return; // blessé : aucune entrée, en attendant la fin du repos forcé
      // Endormi : seule la touche E (se réveiller) doit rester active, pour
      // ne pas pouvoir changer d'outil/monter à cheval/etc. depuis "l'intérieur".
      if (meRef.current?.sleeping && e.code !== "KeyE") return;
      keysRef.current[e.code] = true;
      if (e.code >= "Digit1" && e.code <= "Digit9") {
        const idx = +e.code.slice(5) - 1;
        if (idx === 0) pressToolKey();
        else selectSlot(idx);
      }
      // Correctif audit 2026-07 : Espace/E n'agissent plus "à travers" un
      // menu ouvert (le clic était déjà bloqué, voir onDown ; Échap/T/M
      // restent actifs pour fermer/naviguer).
      const uiOpen = mapOpenRef.current || shopOpenRef.current || binOpenRef.current || bagOpenRef.current || cauldronMenuOpenRef.current || adsOpenRef.current || visitorOpenRef.current || gregCardOpenRef.current;
      if (e.code === "Space") { e.preventDefault(); if (!uiOpen) doAction(); }
      if (e.code === "KeyE") { if (!uiOpen) tryOpenNearby(); }
      // Zip 233 (Guillaume): Q, not E, talks to visitors - opens the unified
      // visitor card for the nearest one waiting within reach. NOTE: KeyQ is
      // ALSO move-left on AZERTY (ZQSD) - !e.repeat keeps a held Q from
      // re-opening the card; to test in browser, see the context file.
      if (e.code === "KeyQ" && !e.repeat) { if (!uiOpen) { const vq = visitorPromptNearby(); if (vq) { setMyVote(null); setVisitorRid(vq.rid); setVisitorOpen(true); } else { const rq = residentPromptNearby(); if (rq) setResidentCard(rq.rid); else if (gregPromptNearby()) setGregCardOpen(true); } } } // FIX 246 : Q parle à Greg ; zip 252 : Q parle aussi aux résidents
      if (e.code === "KeyF") toggleMount();
      // Zip 251 : R avec l'outil main tenant un objet -> le remet dans le sac
      // (prioritaire sur le cycle de façade ville / d'orientation clôture).
      if (e.code === "KeyR" && slotRef.current === 7 && handHeldRef.current) { handStoreHeld(); return; }
      if (e.code === "KeyR" && slotRef.current === 5 && buildKindRef.current === "fence") {
        fenceDirRef.current = fenceDirRef.current === "auto" ? "h" : fenceDirRef.current === "h" ? "v" : "auto";
        setFenceDir(fenceDirRef.current);
        pushToast(L.fenceDirToast(fenceDirRef.current));
      }
      // Zip 235: R at your OWN Valley Town door cycles the free façade
      // style (1..10). Purely local preference; broadcast via posBlob so
      // remote clients render your house with the same style.
      if (e.code === "KeyR" && meRef.current && meRef.current.zone === "town") {
        const ids = Object.keys(farmersRef.current || {}).sort();
        const myHouseIdx = ids.indexOf(me.id);
        if (myHouseIdx >= 0) {
          const hsn = C.TOWN_HOUSES[myHouseIdx];
          if (hsn) {
            const doorX = hsn.x + C.TOWN_HOUSE_W / 2, doorY = hsn.y + C.TOWN_HOUSE_H + 0.5;
            if (Math.abs(meRef.current.x + 0.5 - doorX) <= 1.6 && Math.abs(meRef.current.y - doorY) <= 1.4) {
              const cur = facadeStylesRef.current[me.id] || 0;
              const nxt = (cur + 1) % C.TOWN_HOUSE_STYLES;
              facadeStylesRef.current = { ...facadeStylesRef.current, [me.id]: nxt };
              pushToast(L.townHouseStyleChangeBtn(nxt + 1));
              // Zip 250 (demande Guillaume) : la préférence de style est
              // mémorisée en localStorage (par machine, comme ferme_lastcode)
              // pour survivre à un rechargement / une nouvelle session.
              try { window.localStorage.setItem("ferme_town_facade", String(nxt)); } catch (e2) { /* localStorage indispo */ }
              // Broadcast via chat channel so remote clients pick it up.
              channelRef.current?.send({ type: "broadcast", event: "facadeStyle", payload: { id: me.id, style: nxt } });
            }
          }
        }
      }
      if (e.code === "KeyT") { e.preventDefault(); setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 0); }
      if (e.code === "KeyM") setMapOpen(o => !o);
      if (e.code === "Escape") { setShopOpen(false); setBinOpen(false); setBagOpen(false); setMapOpen(false); setSeedMenuOpen(false); setToolMenuOpen(false); setCraftMenuOpen(null); setCauldronMenuOpen(false); setAdsOpen(false); setVisitorOpen(false); }
    }
    function onKeyUp(e) { keysRef.current[e.code] = false; }
    function onMove(e) { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; }
    function onDown(e) { if (e.button === 0 && !mapOpenRef.current && !shopOpenRef.current && !binOpenRef.current && !bagOpenRef.current && !cauldronMenuOpenRef.current && !fishMiniRef.current && !adsOpenRef.current && !visitorOpenRef.current && !gregCardOpenRef.current && !isInjured()) doAction(); }
    function onWheel() { }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    let raf = 0, last = performance.now();
    function loop() {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const epochNow = Date.now(); // pousse/arrosage/production animale sont en temps réel (horloge murale)
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const w = worldRef.current, m = meRef.current, sprites = spritesRef.current;
      if (!w || !m || !sprites) return;

      updateMe(dt);
      if (isHost) updateWhistledHorses(dt);
      if (isHost) updateWolves(dt);
      if (isHost) updateRabbits(dt);
      if (isHost) updateSharedEvilMonsters(dt); // créatures maléfiques partagées (2026-07)
      if (isHost) updateGreg(dt);
      if (isHost) updateVisitors(dt); // 2026-07 station update (zip 233: multi-visitor)
      if (isHost) updateResidents(dt); // zip 247: moved-in visitors work the farm per their pledged job
      if (isHost) updateCrafts(); // zip 252: production des ateliers d'artisans
      if (isHost) updateSoan(dt);
      if (isHost) updateHarald(dt); // zip 260 : agent d'élevage
      // Simulation hôte toujours sur worldRef.current (la ferme), quoi qu'il
      // arrive : rien ci-dessus ne dépend de la zone du joueur LOCAL. Seul
      // ce qui suit (mouvement/rendu propres à CE client) bascule sur la
      // carte maléfique si m.zone==="evil" — voir crossPassage plus haut.
      updateZoneTransition();
      // Zip 235: detect weekly passage rotation on every client — clears
      // per-player pickup / prize tracking so the next visit is fresh.
      {
        const idx = E.passageWorldIndex(sharedRef.current.day || 1);
        if (passageAppliedIdxRef.current !== idx) {
          passageAppliedIdxRef.current = idx;
          pickedIdsRef.current = {};
          mazePrizeClaimedRef.current = {};
          // Invalidate any prior evil-world reference; will be re-fetched on entry.
          if (meRef.current && meRef.current.zone !== "evil") evilWorldRef.current = null;
        }
      }
      checkWalkOverPassage();
      if (m.zone === "evil") {
        drawEvilFrame(now);
        const fa = zoneFadeAlpha();
        if (fa > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "black"; ctx.globalAlpha = fa; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
        return;
      }
      // Valley Town (zip 234): same early-return pattern as the evil map; the
      // host sims above keep running on the farm world regardless.
      if (m.zone === "town") {
        drawTownFrame(now, dt);
        const fa = zoneFadeAlpha();
        if (fa > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "black"; ctx.globalAlpha = fa; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
        return;
      }
      checkWalkOverHarvest();
      checkWalkOverWater();
      checkWalkOverCollect();
      // Sommeil : énergie interpolée localement en temps réel pendant les
      // 60s (affichage fluide de la jauge), sans attendre l'hôte (qui, lui,
      // ne tranche l'énergie finale qu'à la sortie, voir wakeUp/resolveSleepEnd).
      if (m.sleeping && sleepStartedAtRef.current) {
        const frac = Math.min(1, (now - sleepStartedAtRef.current) / C.SLEEP_MS);
        const disp = Math.round(sleepStartEnergyRef.current + (C.MAX_ENERGY - sleepStartEnergyRef.current) * frac);
        if (disp !== energyRef.current) { energyRef.current = disp; setMyEnergy(disp); }
      }
      if (actAnimRef.current > 0) actAnimRef.current -= dt;
      for (const p of playersRef.current.values()) {
        advanceRemote(p); // FIX 243
        p.x += (p.tx - p.x) * Math.min(1, dt * 12);
        p.y += (p.ty - p.y) * Math.min(1, dt * 12);
        p.animT = p.moving ? (p.animT || 0) + dt * 9 : 0;
      }
      // FIX 246 : le lissage de Greg/Soan est désormais fait au moment du
      // rendu via smoothNpc (état persistant npcSmoothRef), l'ancien easing
      // sur g.rx/g.ry ici était réinitialisé à chaque apply (objet remplacé
      // en bloc) — d'où le saccadé. On se contente d'élaguer la map si des
      // ids de lapins/loups périmés s'y accumulent sur une longue session.
      if (npcSmoothRef.current.size > 400) npcSmoothRef.current.clear();

      const cam = getCam();
      ctx.setTransform(ZOOM, 0, 0, ZOOM, -Math.round(cam.x * ZOOM), -Math.round(cam.y * ZOOM));
      ctx.clearRect(cam.x, cam.y, cam.vw, cam.vh);
      const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(w.w - 1, Math.ceil((cam.x + cam.vw) / T));
      const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(w.h - 1, Math.ceil((cam.y + cam.vh) / T));
      const waterFrame = Math.floor(now / 600) % 2;
      const draws = [];  // FIX 240: déclaré AVANT la boucle de tuiles (le rendu des buissons à baies y pousse via draws.push — cf. modèle evil/town). Corrige le ReferenceError TDZ qui noircissait la moitié basse de la ferme.

      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = idxOf(x, y), g = w.ground[i];
        let img;
        if (g === C.G_GRASS) img = sprites.grass[(x * 7 + y * 13) % 3];
        else if (g === C.G_TILLED) img = sprites.tilled;
        else if (g === C.G_WATERED) img = sprites.watered;
        else if (g === C.G_WATER) img = sprites.water[waterFrame];
        else if (g === C.G_SAND) img = sprites.sand;
        else if (g === C.G_BRIDGE) img = sprites.bridge;
        else if (g === C.G_BRIDGE_CLOSED) img = sprites.bridge;
        else if (g === C.G_BRIDGE_STONE) img = sprites.bridgeStoneSprite;
        else if (g === C.G_BRIDGE_STONE_CLOSED) img = sprites.bridgeStoneSprite;
        else if (g === C.G_BRIDGE_SITE) img = sprites.bridgeRuin;
        else if (g === C.G_GRASS_GROWING) img = sprites.tilled;
        else if (g === C.G_DARK_PASSAGE) img = sprites.grass[0];
        else img = sprites.path;
        ctx.drawImage(img, x * T, y * T);
        if (g === C.G_DARK_PASSAGE) {
          // Passage sombre (chantier 2026-07, demande Guillaume) : voile
          // violine pulsant, pour être repéré de loin sans être un simple
          // sprite figé — reste discret (pas de flèche/texte) puisque
          // "il pourra revenir s'il retrouve l'entrée" suppose qu'on ne le
          // souligne pas non plus côté carte maléfique.
          const pulse = 0.45 + Math.sin(now / 500) * 0.15;
          ctx.fillStyle = `rgba(35, 10, 55, ${pulse})`;
          ctx.fillRect(x * T, y * T, T, T);
        }
        if (g === C.G_GRASS_GROWING) {
          // Repousse d'herbe en cours (chantier 2026-07, demande Guillaume) :
          // même "modèle Clash of Clans" que lampadaire/épouvantail, mais sur
          // le SOL plutôt qu'un objet (voir resolveAct cas "grass" et le tick
          // hôte qui finalise le retour à G_GRASS, FermeGame.js). Léger voile
          // vert + barre de progression, même technique que la jauge de
          // chantier collaboratif plus haut, pour rester cohérent avec le
          // reste du chantier 2026-07 sans ajouter de nouveau sprite dédié.
          const readyAt = w.objHp.get(i);
          const remaining = E.buildRemainingMs(readyAt, epochNow);
          const frac = Math.max(0, Math.min(1, 1 - remaining / C.BUILD_TIMES.grass));
          ctx.fillStyle = "rgba(60, 150, 60, 0.30)";
          ctx.fillRect(x * T, y * T, T, T);
          const barW = T - 4;
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x * T + 2, y * T + T - 4, barW, 3);
          ctx.fillStyle = "#6bd15a"; ctx.fillRect(x * T + 2, y * T + T - 4, barW * frac, 3);
        }
        // Site de pont en ruine (chantier 2026-07, validé Guillaume) : le
        // sprite bridgeRuin (piliers effondrés + eau visible) suffit à signaler
        // le chantier, plus besoin de voile hachuré par-dessus.
        if (g === C.G_BRIDGE_CLOSED || g === C.G_BRIDGE_STONE_CLOSED) {
          // Pont fermé via le levier (chantier 2026-07, demande Guillaume) :
          // le pont reste VISIBLE (décision validée), une barrière
          // hachurée rouge/blanche (signal "fermé", même technique de fillRect
          // que le voile de chantier ci-dessus, teinte distincte pour ne pas
          // le confondre avec un chantier en cours) apparaît par-dessus.
          ctx.fillStyle = "rgba(160, 40, 30, 0.4)";
          ctx.fillRect(x * T, y * T, T, T);
          ctx.strokeStyle = "rgba(255, 220, 60, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x * T + 1, y * T + T - 1); ctx.lineTo(x * T + T - 1, y * T + 1);
          ctx.stroke();
        }
        const c = w.crops.get(i);
        if (c) {
          const gs = E.cropGrowState(c, epochNow);
          if (gs.wetness > 0) {
            // Indication visuelle d'humidité (chantier 2026-07, remplace la
            // goutte d'eau barrée) : la terre s'assombrit dès l'arrosage,
            // reste foncée ~3h réelles, puis s'éclaircit progressivement
            // jusqu'à sa teinte claire d'origine PILE quand il faut
            // réarroser — ce retour à la couleur claire EST l'indicateur de
            // manque d'eau, aucune icône superposée n'est plus nécessaire.
            ctx.fillStyle = `rgba(40,26,12,${gs.wetness * 0.55})`;
            ctx.fillRect(x * T, y * T, T, T);
          }
          const cropSprites = sprites.crops[c.t] || sprites.crops[0];
          const cropImg = cropSprites && cropSprites[gs.stage];
          if (cropImg) ctx.drawImage(cropImg, x * T, y * T);
          if (gs.mature) {
            // Bulle "prête à récolter" : flotte doucement au-dessus de la case.
            const bob = Math.sin(now / 260) * 1.5;
            ctx.drawImage(sprites.icons.ready, x * T + 2, y * T - 11 + bob, 12, 12);
          }
        }
        const o = w.objects[i];
        if (o === C.O_ROCK) ctx.drawImage(sprites.rock, x * T, y * T);
        else if (o === C.O_STUMP) ctx.drawImage(sprites.stump, x * T, y * T);
        else if (o === C.O_FENCE || o === C.O_FENCE_H || o === C.O_FENCE_V) {
          // Clôture (posée librement par un joueur, OU section de l'enclos de
          // départ, désormais unifiés) : orientation FORCÉE si le joueur a
          // tourné l'aperçu avant de poser (O_FENCE_H/O_FENCE_V), sinon le
          // sprite dépend des sections voisines pour que les lisses se
          // prolongent bien d'une tuile à l'autre.
          const fk = fenceKindAt(w, x, y);
          ctx.drawImage(fk === "corner" ? sprites.fenceCorner : fk === "v" ? sprites.fenceV : fk === "post" ? sprites.fencePost : sprites.fence, x * T, y * T);
        }
        else if (o === C.O_WALL) ctx.drawImage(sprites.wall, x * T, y * T);
        else if (o === C.O_BERRY_BUSH) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.berryBush, x * T, y * T - 2) });
      }

      const tt = targetTile();
      if (inMap(tt.x, tt.y)) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(tt.x * T + 0.5, tt.y * T + 0.5, T - 1, T - 1); }

      draws.push({ y: (C.HOUSE.y + C.HOUSE.h) * T, fn: () => {
        // Maison à niveaux (2026-07) : sprite selon le niveau ; pendant les
        // travaux, marteau + barre de progression au-dessus du toit.
        const hh = sharedRef.current.house || { level: 1, upgradeUntil: 0 };
        const img = (sprites.houses && sprites.houses[Math.min(Math.max(hh.level, 1), 3) - 1]) || sprites.house;
        ctx.drawImage(img, C.HOUSE.x * T, (C.HOUSE.y + C.HOUSE.h) * T - 96);
        if (hh.upgradeUntil > Date.now()) {
          const pal = C.HOUSE_LEVELS[hh.level - 1];
          const total = pal ? pal.durationMs : 1;
          const frac = Math.max(0, Math.min(1, 1 - (hh.upgradeUntil - Date.now()) / total));
          const barW = 40, bx = C.HOUSE.x * T + 48 - barW / 2, by = (C.HOUSE.y + C.HOUSE.h) * T - 104;
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 4);
          ctx.fillStyle = "#c9a25a"; ctx.fillRect(bx, by, barW * frac, 4);
          ctx.font = "10px monospace"; ctx.textAlign = "center";
          ctx.fillText("🔨", bx + barW / 2, by - 4);
        }
      } });
      draws.push({ y: (C.SHOP.y + 1) * T, fn: () => ctx.drawImage(sprites.shop, C.SHOP.x * T - 4, (C.SHOP.y + 1) * T - 28) });
      draws.push({ y: (C.BIN.y + 1) * T, fn: () => ctx.drawImage(sprites.bin, C.BIN.x * T - 2, (C.BIN.y + 1) * T - 18) });
      // Grange collaborative persistante : sprite réel dès le palier 1 (elle
      // survit d'une session à l'autre), simple marqueur de chantier tant
      // qu'aucun palier n'est encore construit (niveau 0). Jauges (bois,
      // pierre, or) placées au-dessus du bâtiment ; leur position tient
      // compte de la vraie hauteur du sprite (le palier 3, bien plus grand
      // que la maison depuis le zip 161, a besoin de bien plus de recul).
      if (sharedRef.current.barn) {
        const bs = C.BARN_SITE, barnNow = sharedRef.current.barn;
        const def = C.BARN_LEVELS[barnNow.level]; // palier EN COURS de collecte (undefined si déjà au max)
        draws.push({ y: (bs.y + 1) * T, fn: () => {
          let sprH = 0;
          if (barnNow.level >= 1 && spritesRef.current && spritesRef.current.barn) {
            const spr = spritesRef.current.barn[barnNow.level - 1];
            sprH = spr.height;
            ctx.drawImage(spr, bs.x * T - spr.width / 2 + 8, (bs.y + 1) * T - spr.height + 4);
          } else {
            ctx.font = "14px monospace"; ctx.textAlign = "center";
            ctx.fillText("🛖", bs.x * T + 8, bs.y * T + 4 + Math.sin(now / 300) * 1.5);
          }
          if (def) {
            const barW = 26, bx = bs.x * T + 8 - barW / 2;
            const topY = sprH ? (bs.y + 1) * T - sprH + 4 - 14 : bs.y * T - 6;
            if (barnNow.ready) {
              ctx.font = "13px monospace"; ctx.textAlign = "center";
              ctx.fillText("🔨", bs.x * T + 8, topY);
            } else {
              const resourcesDone = barnNow.progress.wood >= def.cost.wood && barnNow.progress.stone >= def.cost.stone;
              const rows = resourcesDone ? ["money"] : ["wood", "stone", "money"];
              rows.forEach((r, ri) => {
                const got = r === "money" ? sharedRef.current.money : (barnNow.progress[r] || 0);
                const frac = Math.max(0, Math.min(1, got / def.cost[r]));
                const by = topY - (rows.length - 1 - ri) * 5;
                ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
                ctx.fillStyle = r === "wood" ? "#a9773f" : r === "stone" ? "#9aa0a8" : "#e8b830";
                ctx.fillRect(bx, by, barW * frac, 3);
              });
            }
          }
        } });
      }
      // Chantier de la mission d'équipe en cours (marqueur simple, v1 : pas
      // de sprite dédié, juste un repère + mini-jauges par ressource).
      if (sharedRef.current.coop) {
        const cs = C.COOP_SITE, coopNow = sharedRef.current.coop;
        draws.push({ y: (cs.y + 1) * T, fn: () => {
          const bob = Math.sin(now / 300) * 1.5;
          ctx.font = "14px monospace"; ctx.textAlign = "center";
          ctx.fillText("🚧", cs.x * T + 8, cs.y * T + 4 + bob);
          const barW = 20;
          coopNow.parts.forEach((p, pi) => {
            const bx = cs.x * T + 8 - barW / 2, by = cs.y * T + 8 + pi * 5;
            const frac = Math.max(0, Math.min(1, p.got / p.target));
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
            ctx.fillStyle = p.resource === "wood" ? "#a9773f" : "#9aa0a8";
            ctx.fillRect(bx, by, barW * frac, 3);
          });
        } });
      }
      const lampsInView = []; // positions des lampadaires visibles, pour percer l'overlay nocturne
      // Torches portées par les fermiers (chantier 2026-07) : même mécanique
      // de halo que les lampadaires, rayon plus modeste (C.TORCH_LIGHT_RADIUS),
      // et qui SUIT le porteur au lieu d'être fixe.
      if (torchOnRef.current) lampsInView.push({ x: m.x + 0.5, y: m.y + 0.5, r: C.TORCH_LIGHT_RADIUS });
      for (const p of playersRef.current.values()) if (p.torch) lampsInView.push({ x: p.x + 0.5, y: p.y + 0.5, r: C.TORCH_LIGHT_RADIUS });
      for (let y = y0 - 1; y <= Math.min(w.h - 1, y1 + 2); y++) for (let x = x0 - 1; x <= Math.min(w.w - 1, x1 + 1); x++) {
        if (!inMap(x, y)) continue;
        const o = w.objects[idxOf(x, y)];
        if (o === C.O_TREE || o === C.O_TREE2) { const _se = E.seasonOf().key; const img = o === C.O_TREE ? (_se === "autumn" ? sprites.oakAutumn : _se === "spring" ? sprites.oakSpring : sprites.oak) : (_se === "autumn" ? sprites.pineAutumn : _se === "spring" ? sprites.pineSpring : sprites.pine); draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(img, x * T - 8, (y + 1) * T - 48) }); }
        else if (o === C.O_WELL) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.well, x * T - 4, (y + 1) * T - 30) });
        else if (o === C.O_LAMP) {
          const readyAt = w.objHp.get(idxOf(x, y));
          const ready = E.buildReady(readyAt, epochNow);
          if (ready) {
            lampsInView.push({ x: x + 0.5, y: y + 0.5 });
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.drawImage(sprites.lamp, x * T, (y + 1) * T - 32);
              if (nightAlpha() > 0.05) {
                // Lanterne allumée : petit point lumineux sur la vitre, en plus
                // du halo percé dans l'overlay nocturne (voir plus bas).
                ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = "#ffe27a";
                ctx.beginPath(); ctx.arc(x * T + 8, (y + 1) * T - 27, 3, 0, 7); ctx.fill();
                ctx.restore();
              }
            } });
          } else {
            // Chantier en cours (temps réel, "modèle Clash of Clans") : sprite
            // assombri (pas encore fonctionnel, aucun halo) + jauge de
            // progression et compte à rebours mm:ss, même esprit que le
            // marqueur 🚧 du chantier collaboratif.
            const totalMs = C.BUILD_TIMES.lamp;
            const remaining = E.buildRemainingMs(readyAt, epochNow);
            const frac = Math.max(0, Math.min(1, 1 - remaining / totalMs));
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.save(); ctx.globalAlpha = 0.55;
              ctx.drawImage(sprites.lamp, x * T, (y + 1) * T - 32);
              ctx.restore();
              const barW = 20, bx = x * T + 8 - barW / 2, by = (y + 1) * T - 38;
              ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
              ctx.fillStyle = "#ffe27a"; ctx.fillRect(bx, by, barW * frac, 3);
              const totalSec = Math.ceil(remaining / 1000);
              const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
              const ss = String(totalSec % 60).padStart(2, "0");
              ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
              ctx.fillStyle = "#00000090"; ctx.fillText(`${mm}:${ss}`, x * T + 8 + 1, by - 3 + 1);
              ctx.fillStyle = "#fff"; ctx.fillText(`${mm}:${ss}`, x * T + 8, by - 3);
            } });
          }
        }
        else if (o === C.O_SCARECROW) {
          const readyAt = w.objHp.get(idxOf(x, y));
          const ready = E.buildReady(readyAt, epochNow);
          if (ready) {
            // Aucun effet de jeu actif pour l'instant (contre les oiseaux,
            // pas encore implémentés) : sprite simplement affiché plein.
            draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.scarecrow, x * T, (y + 1) * T - 32) });
          } else {
            // Chantier en cours (10s réelles) : même traitement visuel que le
            // lampadaire (sprite assombri + jauge + compte à rebours mm:ss).
            const totalMs = C.BUILD_TIMES.scarecrow;
            const remaining = E.buildRemainingMs(readyAt, epochNow);
            const frac = Math.max(0, Math.min(1, 1 - remaining / totalMs));
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.save(); ctx.globalAlpha = 0.55;
              ctx.drawImage(sprites.scarecrow, x * T, (y + 1) * T - 32);
              ctx.restore();
              const barW = 20, bx = x * T + 8 - barW / 2, by = (y + 1) * T - 38;
              ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
              ctx.fillStyle = "#d4b25a"; ctx.fillRect(bx, by, barW * frac, 3);
              const totalSec = Math.ceil(remaining / 1000);
              const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
              const ss = String(totalSec % 60).padStart(2, "0");
              ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
              ctx.fillStyle = "#00000090"; ctx.fillText(`${mm}:${ss}`, x * T + 8 + 1, by - 3 + 1);
              ctx.fillStyle = "#fff"; ctx.fillText(`${mm}:${ss}`, x * T + 8, by - 3);
            } });
          }
        }
        else if (o === C.O_LEVER) {
          // Levier de pont (chantier 2026-07, demande Guillaume) : posé
          // automatiquement, aucun chantier/délai (contrairement au
          // lampadaire/épouvantail) : cliquable et fonctionnel dès son
          // apparition. Position du manche (haut/bas) reflète l'état actuel
          // du pont qu'il commande, lu directement sur la case de référence
          // de sa traversée (w.bridgeSites/w.bridgeLeverPos, voir
          // fermeEngine.js), aucun état séparé à stocker.
          const k = w.bridgeLeverPos ? w.bridgeLeverPos.indexOf(idxOf(x, y)) : -1;
          const closed = k >= 0 && (w.ground[w.bridgeSites[k][0]] === C.G_BRIDGE_CLOSED || w.ground[w.bridgeSites[k][0]] === C.G_BRIDGE_STONE_CLOSED);
          draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(closed ? sprites.leverClosed : sprites.leverOpen, x * T, (y + 1) * T - 24) });
        }
        else if (o === C.O_MILL) {
          // Moulin (chantier 2026-07, transformation artisanale demandée par
          // Guillaume). Chantier en cours : même traitement visuel que
          // lampadaire/épouvantail (sprite assombri + jauge + mm:ss).
          // Fonctionnel : sprite plein + une jauge de stock de blé (marron,
          // sous le sprite) et, si une transformation est en cours, une
          // seconde jauge/compte à rebours (couleur farine) jusqu'au
          // prochain sac — état lu directement dans w.mills (idx -> {wheat,
          // nextAt}), synchronisé par resolveAct/"millDeposit" et le tick
          // hôte 1 Hz (voir FermeGame.js, dayTimer).
          const ii = idxOf(x, y);
          const readyAt = w.objHp.get(ii);
          const ready = E.buildReady(readyAt, epochNow);
          if (!ready) {
            const totalMs = C.BUILD_TIMES.mill;
            const remaining = E.buildRemainingMs(readyAt, epochNow);
            const frac = Math.max(0, Math.min(1, 1 - remaining / totalMs));
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.save(); ctx.globalAlpha = 0.55;
              ctx.drawImage(sprites.mill, x * T - 7, (y + 1) * T - 36);
              ctx.restore();
              const barW = 24, bx = x * T + 8 - barW / 2, by = (y + 1) * T - 42;
              ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
              ctx.fillStyle = "#c9a25a"; ctx.fillRect(bx, by, barW * frac, 3);
              const totalSec = Math.ceil(remaining / 1000);
              const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
              const ss = String(totalSec % 60).padStart(2, "0");
              ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
              ctx.fillStyle = "#00000090"; ctx.fillText(`${mm}:${ss}`, x * T + 8 + 1, by - 3 + 1);
              ctx.fillStyle = "#fff"; ctx.fillText(`${mm}:${ss}`, x * T + 8, by - 3);
            } });
          } else {
            const ms = w.mills.get(ii) || { wheat: 0, nextAt: 0 };
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.drawImage(sprites.mill, x * T - 7, (y + 1) * T - 36);
              const barW = 24, bx = x * T + 8 - barW / 2;
              const stockFrac = Math.max(0, Math.min(1, ms.wheat / C.MILL_STOCK_CAP));
              const stockY = (y + 1) * T - 42;
              ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, stockY, barW, 3);
              ctx.fillStyle = "#a9773f"; ctx.fillRect(bx, stockY, barW * stockFrac, 3);
              if (ms.nextAt) {
                const remaining = Math.max(0, ms.nextAt - epochNow);
                const frac = Math.max(0, Math.min(1, 1 - remaining / C.MILL_BATCH_MS));
                const by2 = stockY - 5;
                ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by2, barW, 3);
                ctx.fillStyle = "#ede0c4"; ctx.fillRect(bx, by2, barW * frac, 3);
                const totalSec = Math.ceil(remaining / 1000);
                const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
                const ss = String(totalSec % 60).padStart(2, "0");
                ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
                ctx.fillStyle = "#00000090"; ctx.fillText(`${mm}:${ss}`, x * T + 8 + 1, by2 - 3 + 1);
                ctx.fillStyle = "#fff"; ctx.fillText(`${mm}:${ss}`, x * T + 8, by2 - 3);
              }
            } });
          }
        }
        else if (o === C.O_CAULDRON) {
          // Chaudron ramené du monde maléfique (chantier 2026-07, demande
          // Guillaume) : posable n'importe où (contrairement à l'ancien
          // CAULDRON_SITE fixe, voir doc -50), même traitement visuel que
          // lampadaire/épouvantail pendant le chantier (BUILD_TIMES.cauldron,
          // 5s réelles), puis affiche les 3 mini-jauges de la recette une
          // fois fonctionnel (même contenu que l'ancien marqueur fixe :
          // améthyste lue dans la réserve commune de gemmes, truite/brochet
          // dans s.salveCraft). Sprite dédié en pixel art (voir cauldronSprite,
          // fermeArt.js — demande explicite Guillaume : "un joli chaudron type
          // métal, pas une image qui flotte" ; remplace l'ancien rendu emoji
          // ⚗️ avec animation de flottement).
          const ii = idxOf(x, y);
          const readyAt = w.objHp.get(ii);
          const ready = E.buildReady(readyAt, epochNow);
          if (!ready) {
            const totalMs = C.BUILD_TIMES.cauldron;
            const remaining = E.buildRemainingMs(readyAt, epochNow);
            const frac = Math.max(0, Math.min(1, 1 - remaining / totalMs));
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.save(); ctx.globalAlpha = 0.55;
              ctx.drawImage(sprites.cauldron, x * T - 2, (y + 1) * T - 24);
              ctx.restore();
              const barW = 20, bx = x * T + 8 - barW / 2, by = (y + 1) * T - 30;
              ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
              ctx.fillStyle = "#c9a25a"; ctx.fillRect(bx, by, barW * frac, 3);
            } });
          } else {
            const scNow = sharedRef.current.salveCraft || { trout: 0, pike: 0 };
            const gemsNow = (sharedRef.current.gems && sharedRef.current.gems[0]) || 0;
            const rec = C.SALVE_RECIPE;
            draws.push({ y: (y + 1) * T, fn: () => {
              ctx.drawImage(sprites.cauldron, x * T - 2, (y + 1) * T - 24);
              const barW = 20, bx = x * T + 8 - barW / 2;
              const rows = [
                { got: gemsNow, target: rec.amethyst, color: "#b46ee0" },
                { got: scNow.trout || 0, target: rec.trout, color: "#d98a5a" },
                { got: scNow.pike || 0, target: rec.pike, color: "#6a8f5a" },
              ];
              rows.forEach((r, ri) => {
                const by = (y + 1) * T - 30 + ri * 5;
                const frac = Math.max(0, Math.min(1, r.got / r.target));
                ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx, by, barW, 3);
                ctx.fillStyle = r.color; ctx.fillRect(bx, by, barW * frac, 3);
              });
            } });
          }
        }
      }
      // Animaux d'élevage (+ indicateur de production à ramasser). Position
      // dérivée du temps (déambulation, zip 152) sauf si l'animal est
      // porté : dans ce cas il suit le fermier qui le porte (position déjà
      // interpolée, moi-même ou un autre joueur via playersRef).
      for (const an of (sharedRef.current.animals || [])) {
        let ax, ay;
        if (an.carriedBy) {
          const carrier = an.carriedBy === me.id ? m : playersRef.current.get(an.carriedBy);
          if (!carrier) continue; // porteur pas encore connu de ce client : ignore ce tour-ci
          ax = carrier.x; ay = carrier.y - 0.55;
        }
        // zip 255 : mouvement animal 100% local (broute/marche, pattes,
        // direction) — voir E.animalPos. Porté : pas d'anim propre (pose
        // d'arrêt, oriente vers la droite par défaut).
        const apos = an.carriedBy ? { x: ax, y: ay, dir: 1, frame: 0 } : E.animalPos(an, epochNow);
        ax = apos.x; ay = apos.y;
        // Zip 254 : echelle d'affichage par type (vache ~= cheval, chevre plus
        // grande, etc. — voir C.ANIMAL_DRAW_SCALE). Purement visuel : le sprite
        // natif fait 16x14, on l'agrandit en gardant l'ancrage bas-centre (les
        // pieds restent au meme endroit) pour ne pas casser l'alignement au sol.
        const asc = (C.ANIMAL_DRAW_SCALE && C.ANIMAL_DRAW_SCALE[an.type]) || 1;
        const aw = 16 * asc, ah = 14 * asc;
        const adx = ax * T + 8 - aw / 2;   // recentrage horizontal
        const ady = ay * T + 14 - ah;      // ancrage bas conserve
        draws.push({ y: (ay + 1) * T, fn: () => {
          const img = sprites.animals[an.type][apos.frame || 0];
          if (apos.dir === 2) { ctx.save(); ctx.translate(adx + aw, ady); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, aw, ah); ctx.restore(); }
          else ctx.drawImage(img, adx, ady, aw, ah);
          if (!an.carriedBy && E.animalReady(an, epochNow)) { const bob = Math.sin(now / 260) * 1.5; ctx.drawImage(sprites.products[an.type], adx + aw / 2 - 6, ady - 12 + bob, 12, 12); }
        } });
      }
      // Chevaux libres (non montés) : plusieurs possibles désormais.
      // Chantier 2026-07 : un cheval sifflé qui accourt (callTarget) galope
      // (cycle horseRun cadencé sur l'horloge, pas d'animT propre) ; un
      // cheval sur une case d'eau (nage vers le siffleur, ou laissé là par
      // une noyade) est immergé sous la ligne d'eau (drawSwimOverlay).
      (sharedRef.current.horses || []).forEach((horse, hidx) => {
        if (horse.rider) return;
        // Zip 250 (demande Guillaume : "les mouvements du cheval sont saccadés
        // pour les clients") : l'hôte simule au frame près, l'invité ne reçoit
        // que ~2 Hz et affichait la position BRUTE -> saccades. On lisse comme
        // Greg : un cheval sifflé qui galope (callTarget) glisse par
        // extrapolation rejouée contre la collision ; un cheval immobile reste
        // en easing seul (aucune avance).
        const hp = isHost ? horse : smoothNpc("horse:" + hidx, horse.x, horse.y, dt, !!horse.callTarget, !!horse.callTarget, (cx, cy) => canStand(w, cx, cy));
        const dx0 = hp.x, dy0 = hp.y;
        draws.push({ y: (dy0 + 1) * T, fn: () => {
          const hx = dx0 * T - 6, hy = dy0 * T - 10;
          const img = horse.callTarget ? sprites.horseRun[Math.floor(now / 110) % 4] : sprites.horse;
          ctx.drawImage(img, hx, hy);
          if (E.isWaterTile(w, horse.x, horse.y)) drawSwimOverlay(hx, hy + 1, 28);
        } });
      });
      // Loups (chantier 2026-07) : 4 frames de marche, vitesse du cycle
      // dépendante de l'état (arrêté/lent/rapide, voir updateWolves) plutôt
      // que des frames différentes — même mécanique que l'animation des
      // fermiers (animT).
      for (const wf of (sharedRef.current.wolves || [])) {
        const wp = isHost ? wf : smoothNpc("wolf:" + wf.id, wf.x, wf.y, dt, false, false, null); // FIX 246 : easing seul (jamais d'avance -> reste facile à éviter)
        draws.push({ y: (wp.y + 1) * T, fn: () => {
          const frame = wf.state === "stop" ? 0 : Math.floor((wf.animT || 0) % 4);
          // Zip 235 (Guillaume: "when it's winter, ... snow leopards replace
          // wolves"): same simulated wolves, different pelt. Purely visual;
          // AI/collision is unchanged.
          const isWinter = E.seasonOf().key === "winter";
          const img = (isWinter && sprites.snowLeopard) ? sprites.snowLeopard[frame] : sprites.wolf[frame];
          const px = Math.round(wp.x * T - 14), py = Math.round(wp.y * T - 9);
          // Animation de mort (chantier 2026-07, 3e victoire d'un joueur) : le
          // loup s'effondre (rotation vers le sol) en s'estompant, avec un petit
          // nuage de poussière. deadUntil vient de l'hôte (diffusé), horloges
          // proches suffisent pour ~900ms.
          if (wf.deadUntil) {
            const prog = Math.min(1, Math.max(0, 1 - (wf.deadUntil - Date.now()) / C.WOLF_DEATH_ANIM_MS));
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - prog);
            const cx = px + 15, cy = py + 12;
            ctx.translate(cx, cy);
            ctx.rotate((wf.dir === 2 ? -1 : 1) * prog * (Math.PI / 2)); // bascule au sol
            ctx.translate(-15, -12);
            if (wf.dir === 2) { ctx.translate(30, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); }
            else ctx.drawImage(img, 0, 0);
            ctx.restore();
            // Poussière de chute.
            ctx.save();
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * Math.PI * 2;
              const r = 4 + prog * 12;
              ctx.globalAlpha = Math.max(0, 0.5 * (1 - prog));
              ctx.fillStyle = "rgba(120,110,95,1)";
              ctx.beginPath();
              ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5 + 6, 2.5 * (1 - prog * 0.5), 0, 7);
              ctx.fill();
            }
            ctx.restore();
            return;
          }
          if (wf.dir === 2) { ctx.save(); ctx.translate(px + 30, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
          else ctx.drawImage(img, px, py);
        } });
      }
      // Lapins (chantier 2026-07) : 3 frames de bond, même mécanique
      // d'animation que les loups (cycle piloté par animT/state), silhouette
      // bien plus petite/basse.
      for (const rb of (sharedRef.current.rabbits || [])) {
        const rp = isHost ? rb : smoothNpc("rabbit:" + rb.id, rb.x, rb.y, dt, false, false, null); // FIX 246 : easing seul, pas d'incohérence visuelle
        draws.push({ y: (rp.y + 1) * T, fn: () => {
          const frame = rb.state === "stop" ? 0 : Math.floor((rb.animT || 0) % 3);
          const img = sprites.rabbit[frame];
          const px = Math.round(rp.x * T - 8);
          // Bond visuel uniquement EN FUITE (rb.state === "run", jamais en
          // roam/stop — demande 2026-07 : "les changer pas dans leur état
          // normal, mais qu'ils aient l'air de sautiller en fuite"). Arc
          // simple dérivé du même animT que le cycle de frames, donc
          // toujours en phase avec l'anim des pattes.
          const hop = rb.state === "run" ? Math.abs(Math.sin((rb.animT || 0) * Math.PI)) * C.RABBIT_FLEE_HOP_PX : 0;
          const py = Math.round(rp.y * T - 7 - hop);
          if (rb.dir === 2) { ctx.save(); ctx.translate(px + 16, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
          else ctx.drawImage(img, px, py);
        } });
      }
      // -------- 2026-07 station update: station, train, ducks, visitor --------
      {
        const st = sharedRef.current.station;
        // Rails + platform: ground-level, drawn under every sorted sprite
        // (pushed with very low sort keys so they land first in `draws`).
        draws.push({ y: -1000, fn: () => {
          // One wide track (zip 232): left/right half tiles, full border.
          for (let yy = C.STATION_RAIL_Y0; yy <= C.STATION_RAIL_Y1; yy++) {
            ctx.drawImage(sprites.railL, C.STATION_RAIL_X * T, yy * T);
            ctx.drawImage(sprites.railR, (C.STATION_RAIL_X + 1) * T, yy * T);
          }
        } });
        draws.push({ y: -999, fn: () => {
          for (let yy = C.STATION_PLATFORM.y; yy < C.STATION_PLATFORM.y + C.STATION_PLATFORM.h; yy++)
            for (let xx = C.STATION_PLATFORM.x; xx < C.STATION_PLATFORM.x + C.STATION_PLATFORM.w; xx++)
              ctx.drawImage(sprites.platform, xx * T, yy * T);
        } });
        // The train slides in from the north while visitors arrive, and
        // back out when they depart. Timestamps are already relocated onto
        // the local clock (migrateStation), so guests see the same motion.
        // Zip 233: several visitors can share the train; its motion follows
        // the LATEST phaseUntil among them (last one to step off / board).
        const vlist = (st && st.visitors) || [];
        const v = vlist.filter(x => x.phase === "train" || x.phase === "depart").sort((a, b) => b.phaseUntil - a.phaseUntil)[0] || null;
        if (v) {
          const raw = 1 - Math.max(0, (v.phaseUntil - Date.now()) / C.VISITOR_TRAIN_MS);
          const pr = Math.min(1, Math.max(0, raw));
          const yStop = (C.STATION_PLATFORM.y + 1) * T, yOff = -8 * T;
          const trainY = v.phase === "train" ? yOff + (yStop - yOff) * pr : yStop + (yOff - yStop) * pr;
          draws.push({ y: -900, fn: () => {
            const tx = C.STATION_RAIL_X * T + 4; // centered on the wide track
            ctx.drawImage(sprites.train, tx, trainY);
            // Choo-choo smoke: little puffs rising from the funnel, denser
            // while the train is actually rolling (start of arrival / end of
            // departure), fading as they climb.
            const rolling = v.phase === "train" ? 1 - pr : pr;
            const tp = performance.now();
            for (let i = 0; i < 3; i++) {
              const ph = ((tp / 500 + i / 3) % 1);
              const a = Math.max(0, 0.55 * (1 - ph) * (0.25 + 0.75 * rolling));
              if (a <= 0.02) continue;
              ctx.fillStyle = `rgba(238,238,238,${a.toFixed(2)})`;
              ctx.beginPath();
              ctx.arc(tx + 12 + Math.sin(tp / 320 + i * 2.1) * 3, trainY + 13 - 6 - ph * 26, 2 + ph * 4, 0, 7);
              ctx.fill();
            }
          } });
        }
        // Station building (anchored by its BOTTOM edge: the zip 232 sprite
        // is taller than the footprint because of the gabled roof) + the
        // interactive ad board.
        draws.push({ y: (C.STATION.y + C.STATION.h) * T, fn: () => ctx.drawImage(sprites.station, C.STATION.x * T, (C.STATION.y + C.STATION.h) * T - sprites.station.height) });
        draws.push({ y: (C.STATION_SIGN.y + 1) * T, fn: () => ctx.drawImage(sprites.signBoard, C.STATION_SIGN.x * T - 1, C.STATION_SIGN.y * T - 6) });
        // Decorative ducks: purely cosmetic, client-side, seeded from the
        // farm seed, drifting up and down the river with a 2-frame bob.
        if (!ducksRef.current && w.riverCenter && w.riverCenter.length) {
          let ds = (sharedRef.current.seed || 1) >>> 0;
          const drnd = () => { ds = (ds * 1103515245 + 12345) & 0x7fffffff; return ds / 0x7fffffff; };
          ducksRef.current = Array.from({ length: C.DUCK_COUNT }, () => {
            const dy = 12 + drnd() * (C.MAP_H - 24);
            return { y: dy, off: (drnd() - 0.5) * 2.4, dir: drnd() < 0.5 ? 1 : -1, turnAt: 0 };
          });
        }
        if (ducksRef.current) {
          const nowS = performance.now() / 1000;
          for (const d of ducksRef.current) {
            if (nowS >= d.turnAt) { d.dir = Math.random() < 0.5 ? 1 : -1; d.turnAt = nowS + C.DUCK_TURN_MIN_S + Math.random() * (C.DUCK_TURN_MAX_S - C.DUCK_TURN_MIN_S); }
            d.y += d.dir * C.DUCK_SPEED * dt;
            if (d.y < 10) { d.y = 10; d.dir = 1; } if (d.y > C.MAP_H - 10) { d.y = C.MAP_H - 10; d.dir = -1; }
            const dxp = (E.riverCenterAt(w, Math.round(d.y)) + d.off) * T, dyp = d.y * T;
            const fr = Math.floor(performance.now() / 450) % 2;
            draws.push({ y: dyp + T * 0.6, fn: () => ctx.drawImage(sprites.duck[fr], dxp, dyp) });
          }
        }
        // The visiting villagers (host: live sim; guests: broadcast positions
        // smoothed locally) + residents idling by the townhall. Zip 233:
        // EVERY live visitor is drawn, each smoothed independently.
        for (const vv of vlist) {
          if (vv.phase === "train" || vv.phase === "depart") continue;
          // Zip 250 (demande Guillaume : "les visiteurs sont saccadés pour les
          // clients") : on remplace l'ancien easing faible (taux 8) par le même
          // lissage que Greg/Soan — extrapolation façon-joueur rejouée contre la
          // collision — pour qu'ils GLISSENT entre deux paquets 2 Hz au lieu de
          // sauter. L'hôte garde la position simulée brute.
          const vp = isHost ? vv : smoothNpc("visitor:" + vv.rid, vv.x, vv.y, dt, true, !!vv.moving, (cx, cy) => canStand(w, cx, cy));
          const vx = vp.x, vy = vp.y;
          const ro = C.VISITOR_ROSTER[vv.rid] || C.VISITOR_ROSTER[0];
          // Zip 258 : Eduardo "se présente au village sur le dos d'un cheval
          // blanc" — tant qu'il est visiteur (pas encore résident), on dessine
          // sa monture juste derrière lui (sprite horseWhite), sous le perso.
          const onWhiteHorse = ro.skill === "voyager" && sprites.horseWhite;
          draws.push({ y: (vy + 1) * T, fn: () => {
            if (onWhiteHorse) { const hi = sprites.horseWhite; ctx.drawImage(hi, Math.round(vx * T - hi.width / 2 - 4), Math.round((vy + 1) * T - hi.height + 2)); }
            drawCharacter({ id: "visitor" + vv.rid, name: ro.name, x: vx, y: vy, dir: vv.dir || 0, moving: !!vv.moving, animT: vv.animT || 0, gender: ro.gender, outfit: ro.outfit, overalls: ro.overalls, cap: ro.cap }, false);
          } });
        }
        const residents = (st && st.residents) || [];
        const houseOwners = townHouseOwners();
        for (let ri = 0; ri < residents.length; ri++) {
          const ro = C.VISITOR_ROSTER[residents[ri].rid]; if (!ro) continue;
          if (residents[ri].trip && residents[ri].trip.phase === "away") continue; // zip 258 : Eduardo absent (en voyage)
          const hsn = houseOwners.find(h => h.resident && h.resident.rid === residents[ri].rid);
          const rxp = hsn ? hsn.x + C.TOWN_HOUSE_W / 2 : 47.5 + (ri % 3) * 1.6;
          const ryp = hsn ? hsn.y + C.TOWN_HOUSE_H + 0.6 : 37.5 + Math.floor(ri / 3) * 1.4;
          draws.push({ y: (ryp + 1) * T, fn: () => drawCharacter({ id: "res" + ro.rid, name: ro.name, x: rxp, y: ryp, dir: 0, moving: false, animT: 0, gender: ro.gender, outfit: ro.outfit, overalls: ro.overalls, cap: ro.cap }, false) });
        }
      }
      // Greg, l'employé de champs (chantier 2026-07) : réutilise le rendu
      // fermier existant (drawCharacter) avec un jeu de sprite dédié
      // (outfit -1 → sprite ouvrier, voir buildSprites/getChar) plutôt que
      // de dessiner un nouveau personnage à part. L'hôte affiche sa position
      // simulée en temps réel (g.x/g.y) ; les autres joueurs affichent la
      // position lissée (g.rx/g.ry, voir la boucle d'interpolation ci-dessus).
      // Salopette (demande Guillaume, chantier 2026-07 : "Greg ressemble
      // trop à un fermier, il doit avoir une salopette") : flag `overalls`
      // propagé jusqu'à sprites.getChar/charSheet (fermeArt.js), qui dessine
      // une bavette + bretelles denim par-dessus le rendu de base — réservé
      // à Greg, aucun joueur ne peut choisir cet outfit.
      {
        const g = sharedRef.current.greg;
        if (g) {
          let gx, gy;
          if (isHost) { gx = g.x; gy = g.y; }
          // FIX 246 : pas d'extrapolation quand il est assis (moving faux) — il reste bien posé.
          else { const gp = smoothNpc("greg", g.x, g.y, dt, true, !!g.moving && !g.sitting, (cx, cy) => canStand(w, cx, cy)); gx = gp.x; gy = gp.y; }
          const nearG = (Math.abs(m.x - g.x) + Math.abs(m.y - g.y) <= 2.4) && (!m.zone || m.zone === "farm") && !gregCardOpenRef.current;
          draws.push({ y: (gy + 1) * T, fn: () => {
            ctx.save();
            if (g.sitting) {
              // Pose assise dédiée (sprite gregSeated) + ombre, aligné comme drawCharacter.
              const px = Math.round(gx * T), py = Math.round(gy * T);
              ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(px + 8, py + 15, 6, 2.5, 0, 0, 7); ctx.fill();
              ctx.drawImage(sprites.gregSeated, px, py - 8);
              ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
              ctx.fillStyle = "#00000090"; ctx.fillText("Greg", px + 8 + 1, py - 10 + 1);
              ctx.fillStyle = "#ffe9a8"; ctx.fillText("Greg", px + 8, py - 10);
            } else {
              drawCharacter({ id: "greg", name: "Greg", x: gx, y: gy, dir: g.dir || 0, moving: !!g.moving, animT: g.animT || 0, gender: "m", outfit: 0, overalls: true }, false);
            }
            // Invite "Q" quand le joueur est à portée (comme les visiteurs).
            if (nearG) {
              ctx.font = "bold 8px sans-serif";
              ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.fillStyle = "#fff8c0";
              const hx = Math.round(gx * T) + 8, hy = Math.round(gy * T) - 28;
              ctx.strokeText("Q \uD83D\uDCCB", hx, hy); ctx.fillText("Q \uD83D\uDCCB", hx, hy);
            }
            ctx.restore();
          } });
        }
      }
      // Soan, l'employé pêcheur (chantier 2026-07) : même principe de rendu
      // que Greg ci-dessus, réutilise drawCharacter (aucun nouveau sprite).
      // Casquette (demande Guillaume, chantier 2026-07) : PAS un flag pixel
      // art comme la salopette de Greg — dessinée en overlay emoji dans
      // drawCharacter, même principe que le trophée cosmétique 🏆 existant
      // (voir plus bas dans drawCharacter, condition sur p.id === "soan").
      {
        const so = sharedRef.current.soan;
        if (so) {
          let sx, sy;
          if (isHost) { sx = so.x; sy = so.y; }
          else { const sp = smoothNpc("soan", so.x, so.y, dt, true, !!so.moving, (cx, cy) => canStand(w, cx, cy)); sx = sp.x; sy = sp.y; } // FIX 246
          draws.push({ y: (sy + 1) * T, fn: () => drawCharacter({ id: "soan", name: "Soan", x: sx, y: sy, dir: so.dir || 0, moving: !!so.moving, animT: so.animT || 0, gender: "m", outfit: 1, cap: true, fishing: so.phase === "fishing" }, false) });
        }
      }
      // Zip 260 : Harald, l'agent d'élevage — même principe de rendu que
      // Greg/Soan (réutilise drawCharacter, jeu de sprite dédié outfit 6 +
      // salopette + casquette).
      {
        const ha = sharedRef.current.harald;
        if (ha) {
          let hx, hy;
          if (isHost) { hx = ha.x; hy = ha.y; }
          else { const hp = smoothNpc("harald", ha.x, ha.y, dt, true, !!ha.moving, (cx, cy) => canStand(w, cx, cy)); hx = hp.x; hy = hp.y; }
          draws.push({ y: (hy + 1) * T, fn: () => drawCharacter({ id: "harald", name: "Harald", x: hx, y: hy, dir: ha.dir || 0, moving: !!ha.moving, animT: ha.animT || 0, gender: "m", outfit: 6, overalls: true, cap: true }, false) });
        }
      }
      if (!m.sleeping) { draws.push({ y: (m.y + 0.9) * T, fn: () => drawMyPets(m, dt) }); draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) }); }
      // Zip 234 (Guillaume: "when we walk over a certain crop, we can see
      // what they are"): standing on a planted tile floats a small paper tag
      // above the farmer — crop name + growth % (or "ready!" / "needs
      // water"). Purely local, drawn on top of everything (huge sort y).
      {
        const ctx2 = Math.floor(m.x + 0.5), cty = Math.floor(m.y + 0.5);
        const cUnder = inMap(ctx2, cty) ? w.crops.get(idxOf(ctx2, cty)) : null;
        if (cUnder) {
          const gs = E.cropGrowState(cUnder, epochNow);
          const cr = C.CROPS[cUnder.t] || C.CROPS[0];
          const label = `${lang === "en" ? cr.nameEn : cr.name} \u00B7 ${gs.mature ? L.cropTipReady : gs.needsWater ? L.cropTipWater : Math.floor(((gs.grown || 0) / cr.growMs) * 100) + "%"}`;
          draws.push({ y: 1e9, fn: () => {
            ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
            const px = (m.x + 0.5) * T, py = m.y * T - 26;
            const wpx = ctx.measureText(label).width + 10;
            ctx.fillStyle = "rgba(245,238,218,0.95)"; ctx.fillRect(px - wpx / 2, py - 9, wpx, 13);
            ctx.strokeStyle = "#6b4a2e"; ctx.lineWidth = 1; ctx.strokeRect(px - wpx / 2 + 0.5, py - 8.5, wpx - 1, 12);
            // Mini crop swatch on the left edge of the tag.
            ctx.fillStyle = cr.color; ctx.fillRect(px - wpx / 2 + 2, py - 6, 4, 7);
            ctx.fillStyle = "#1d1d1d"; ctx.fillText(label, px + 2, py + 1);
            ctx.textAlign = "left";
          } });
        }
      }
      for (const p of playersRef.current.values()) if (!p.sleeping && p.zone !== "evil" && p.zone !== "town") { draws.push({ y: (p.y + 0.9) * T, fn: () => drawRemotePets(p, dt) }); draws.push({ y: (p.y + 1) * T, fn: () => drawRemote(p) }); } // zip 234: town players are drawn on the town map, not here — zip 247: their pets follow them here too
      // Sommeil : aucune animation d'entrée, le dormeur disparaît juste de la
      // carte (voir ci-dessus, non ajouté à `draws`) ; des "Zzz" flottent
      // au-dessus des fenêtres de la maison tant qu'AU MOINS un joueur dort
      // (peu importe lequel), visibles de tous.
      const anySleeping = m.sleeping || [...playersRef.current.values()].some(p => p.sleeping);
      if (anySleeping) {
        const hx = C.HOUSE.x * T, hy = (C.HOUSE.y + C.HOUSE.h) * T - 96;
        draws.push({ y: (C.HOUSE.y + C.HOUSE.h) * T + 1, fn: () => {
          ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
          for (const off of [{ dx: 23, dy: 58 }, { dx: 75, dy: 58 }]) {
            const bob = Math.sin(now / 260 + off.dx) * 2;
            const zx = hx + off.dx, zy = hy + off.dy - 6 + bob;
            ctx.fillStyle = "#00000090"; ctx.fillText("Zzz", zx + 1, zy + 1);
            ctx.fillStyle = "#ffffff"; ctx.fillText("Zzz", zx, zy);
          }
        } });
      }
      // Zip 251 : décorations posées sur la FERME (liste partagée, persistée).
      for (const e of (sharedRef.current.decor || [])) {
        if (e.zone !== "farm") continue;
        const dimg = sprites.decor && sprites.decor[e.deco]; if (!dimg) continue;
        const dex = e.x, dey = e.y;
        draws.push({ y: (dey + 0.5) * T, fn: () => ctx.drawImage(dimg, Math.round(dex * T - dimg.width / 2), Math.round(dey * T - dimg.height + 6)) });
      }
      // Zip 252 : ateliers d'artisans construits (avec abeilles pour la ruche).
      {
        const crafts = sharedRef.current.crafts || {};
        for (const bid of Object.keys(C.ARTISAN_BUILDINGS)) {
          const cb = crafts[bid]; if (!cb || !cb.built) continue;
          const def = C.ARTISAN_BUILDINGS[bid], bimg = sprites.artisan && sprites.artisan[bid]; if (!bimg) continue;
          const bp = artisanPos(bid); // zip 259 : position déplaçable
          const bcx = (bp.x + def.w / 2) * T, bby = (bp.y + def.h) * T;
          draws.push({ y: bby, fn: () => {
            ctx.drawImage(bimg, Math.round(bcx - bimg.width / 2), Math.round(bby - bimg.height));
            if (bid === "beehive") { // abeilles tournant autour de la ruche
              const t = performance.now() / 1000;
              for (let b = 0; b < 4; b++) {
                const a = t * 2 + b * 1.6, bx = bcx + Math.cos(a) * 12, byp = bby - 20 + Math.sin(a * 1.3) * 8;
                ctx.fillStyle = "#3a2a10"; ctx.fillRect(Math.round(bx), Math.round(byp), 2, 2);
                ctx.fillStyle = "#e8c24a"; ctx.fillRect(Math.round(bx), Math.round(byp), 1, 1);
              }
            }
          } });
        }
      }
      // Zip 252 : résidents baladeurs (lissés côté invité comme les visiteurs).
      {
        const residents = (sharedRef.current.station && sharedRef.current.station.residents) || [];
        for (const res of residents) {
          const ro = C.VISITOR_ROSTER[res.rid]; if (!ro) continue;
          if (res.trip && res.trip.phase === "away") continue; // zip 258 : Eduardo absent (en voyage)
          if (typeof res.x !== "number") continue;
          const rp = isHost ? res : smoothNpc("resident:" + res.rid, res.x, res.y, dt, true, !!res.moving, (cx, cy) => canStand(w, cx, cy));
          const rx = rp.x, ry = rp.y;
          draws.push({ y: (ry + 1) * T, fn: () => drawCharacter({ id: "res" + res.rid, name: ro.name, x: rx, y: ry, dir: res.dir || 0, moving: !!res.moving, animT: res.animT || 0, gender: ro.gender, outfit: ro.outfit, overalls: ro.overalls, cap: ro.cap }, false) });
        }
      }
      draws.sort((a, b) => a.y - b.y);
      // Zip 253 (audit) : on isole chaque draw en try/catch, exactement comme
      // la boucle de rendu de la ville (fix zip 250 "les maisons disparaissent
      // à deux"). Sans ça, une seule exception dans UN draw (joueur distant
      // fraîchement arrivé, sprite manquant, résident/atelier mal formé)
      // interrompait TOUTE la frame triée -> moitié basse de la ferme non
      // dessinée. La ferme étant la zone principale, ce filet manquait.
      for (const d of draws) { try { d.fn(); } catch (e) { console.error("[FERME] farm draw ignoré", e); } }

      const fx = fxRef.current;
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.t += dt;
        if (f.t > f.life) { fx.splice(i, 1); continue; }
        const a = 1 - f.t / f.life;
        if (f.kind === "p") { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * dt; ctx.fillStyle = f.col; ctx.globalAlpha = a; ctx.fillRect(f.x * T + 8, f.y * T + 8, 2, 2); ctx.globalAlpha = 1; }
        else { ctx.globalAlpha = a; ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#00000090"; ctx.fillText(f.txt, f.x * T + 8 + 1, f.y * T - f.t * 12 + 1); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x * T + 8, f.y * T - f.t * 12); ctx.globalAlpha = 1; }
      }

      const na = nightAlpha();
      if (na > 0) {
        // Correctif chantier 2026-07 ("les lampadaires restent éteints la
        // nuit") : le voile sombre + les halos des lampadaires sont
        // composés sur un canvas HORS-ÉCRAN dédié, PAS directement sur le
        // canvas principal. Raison : "destination-out" efface les pixels
        // sur lesquels il est appliqué ; utilisé directement sur le canvas
        // principal, il n'aurait pas seulement percé le voile sombre mais
        // aussi le terrain/les sprites déjà dessinés dessous, laissant un
        // trou transparent (fond de page visible) au lieu d'un cercle
        // éclairé. En composant d'abord sur un calque séparé, puis en le
        // plaquant par-dessus (drawImage, composite normal), seul le voile
        // est percé — le terrain en dessous reste intact et redevient
        // visible, normalement éclairé.
        let nc = nightCanvasRef.current;
        if (!nc) { nc = document.createElement("canvas"); nightCanvasRef.current = nc; }
        if (nc.width !== canvas.width || nc.height !== canvas.height) { nc.width = canvas.width; nc.height = canvas.height; }
        const nctx = nc.getContext("2d");
        nctx.setTransform(1, 0, 0, 1, 0, 0);
        nctx.globalCompositeOperation = "source-over";
        nctx.clearRect(0, 0, nc.width, nc.height);
        nctx.fillStyle = `rgba(8,10,30,${na})`;
        nctx.fillRect(0, 0, nc.width, nc.height);
        if (lampsInView.length) {
          // Halo lumineux : perce l'obscurité autour de chaque lampadaire
          // allumé (composite "destination-out", dégradé radial du centre au
          // bord pour une transition douce plutôt qu'un cercle net) — mais
          // uniquement sur le calque nocturne hors-écran (voir ci-dessus).
          nctx.save();
          nctx.globalCompositeOperation = "destination-out";
          for (const lamp of lampsInView) {
            const radiusPx = (lamp.r || C.LAMP_LIGHT_RADIUS) * T * ZOOM;
            const sx = (lamp.x * T - cam.x) * ZOOM, sy = (lamp.y * T - cam.y) * ZOOM;
            const grad = nctx.createRadialGradient(sx, sy, 0, sx, sy, radiusPx);
            grad.addColorStop(0, `rgba(0,0,0,${na})`);
            grad.addColorStop(0.7, `rgba(0,0,0,${na * 0.9})`);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            nctx.fillStyle = grad;
            nctx.beginPath(); nctx.arc(sx, sy, radiusPx, 0, Math.PI * 2); nctx.fill();
          }
          nctx.restore();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(nc, 0, 0);
      }

      // Météo : jour orageux/pluvieux (chantier 2026-07, demande Guillaume :
      // "des journées grises d'orages et pluie, une toutes les 7") —
      // PUREMENT visuel, aucun effet sur la pousse/l'énergie/les animaux.
      // Dessiné en espace ÉCRAN (transform déjà remis à l'identité juste
      // au-dessus, comme le voile nocturne) : un voile gris semi-transparent
      // plein écran + des traits de pluie qui tombent en continu. S'ajoute
      // au voile nocturne s'il fait aussi nuit (les deux se cumulent tout
      // simplement, pas de logique spéciale de mélange).
      if (E.isStormyDay(sharedRef.current.day || 1)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(70,74,86,${C.STORM_TINT_ALPHA})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!rainDropsRef.current || rainDropsRef.current.length !== C.STORM_RAIN_COUNT) {
          rainDropsRef.current = Array.from({ length: C.STORM_RAIN_COUNT }, () => ({
            x: Math.random(), y: Math.random(), sp: 0.7 + Math.random() * 0.6,
          }));
        }
        ctx.strokeStyle = "rgba(210,220,235,0.35)";
        ctx.lineWidth = 1;
        for (const d of rainDropsRef.current) {
          d.y += (C.STORM_RAIN_SPEED / canvas.height) * dt * d.sp;
          if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
          const sx = d.x * canvas.width, sy = d.y * canvas.height;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 4, sy + C.STORM_RAIN_LEN); ctx.stroke();
        }
      }

      // 2026-07 station update: seasonal tint, stacked exactly like the
      // storm veil (screen space, purely visual).
      // Zip 235 (Guillaume: "when it's winter, it snows"): winter also adds
      // a fullscreen snowfall, same mechanic as the storm rain but slower
      // and lighter. Snow flakes are recycled the same way rain drops are.
      {
        const se = E.seasonOf();
        if (se.tint) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = se.tint;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (se.key === "winter") {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (!snowFlakesRef.current || snowFlakesRef.current.length !== C.SNOW_COUNT) {
            snowFlakesRef.current = Array.from({ length: C.SNOW_COUNT }, () => ({
              x: Math.random(), y: Math.random(), sp: 0.6 + Math.random() * 0.9, sw: (Math.random() * 2 - 1) * 0.02,
            }));
          }
          ctx.fillStyle = "rgba(240, 246, 255, 0.9)";
          for (const d of snowFlakesRef.current) {
            d.y += (C.SNOW_SPEED / canvas.height) * dt * d.sp;
            d.x += d.sw * dt;
            if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
            const sx = d.x * canvas.width, sy = d.y * canvas.height;
            ctx.fillRect(sx, sy, 2, 2);
          }
          // Fine white overlay to sell a bit of ground cover.
          ctx.fillStyle = "rgba(240, 246, 255, 0.09)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Invite boutique/bac
      let pk = null;
      const cauldronTile = findCauldronTile();
      if (heldAnimalRef.current !== -1) pk = "sellAnimal";
      else if (nearTile(C.SHOP)) pk = "shop"; else if (nearTile(C.BIN)) pk = "bin";
      else if (nearTile(C.STATION_SIGN)) pk = "station"; // 2026-07 station update
      else if (nearTile(C.TRAIN_BOARD)) pk = "trainRide"; // Valley Town (zip 234)
      // Zip 233: sleep prompt removed with the townhall sleep option; the
      // visitor prompt carries the nearest rid so the label can name them.
      else { const vp = visitorPromptNearby(); if (vp) pk = "visitor:" + vp.rid; }
      if (!pk && nearTile(C.COOP_SITE) && sharedRef.current.coop) pk = "coop";
      else if (!pk && nearTile(C.BARN_SITE)) { const b = sharedRef.current.barn; if (b && b.level < C.BARN_LEVELS.length) pk = b.ready ? "barnBuild" : "barn"; }
      // (chantier 2026-07, refonte demande Guillaume) : le prompt E distingue
      // maintenant les 4 états possibles du chaudron — récupérer le produit
      // fini, attendre la fin de la concoction, allumer le feu (recette
      // complète + torche déjà allumée), ou ouvrir le menu de dépôt sinon.
      else if (!pk && cauldronTile && nearTile(cauldronTile)) {
        const cst = salveRecipeStatus();
        pk = cst.brewReady ? "cauldronCollect" : cst.brewing ? "cauldronBrewing" : (cst.ready && torchOnRef.current) ? "cauldronIgnite" : "cauldron";
        // Compte à rebours de concoction (correctif audit 2026-07) : mis à
        // jour au plus une fois par seconde (setState seulement au changement).
        const secs = cst.brewing && !cst.brewReady ? Math.max(1, Math.ceil((cst.brewingUntil - Date.now()) / 1000)) : 0;
        if (secs !== brewSecsRef.current) { brewSecsRef.current = secs; setBrewSecs(secs); }
      }
      setPromptKeyThrottled(pk);
      // Invite cheval (monter/descendre) : plusieurs chevaux possibles.
      const hs = sharedRef.current.horses || []; let mp = null;
      if (hs.some(h => h.rider === me.id || h.rider2 === me.id)) mp = "dismount";
      else if (nearestMountableHorse() >= 0) mp = "mount";
      setMountPromptThrottled(mp);

      if (mapOpenRef.current) drawFullMap();
      const fa = zoneFadeAlpha();
      if (fa > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "black"; ctx.globalAlpha = fa; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    }
    raf = requestAnimationFrame(loop);

    // ----- fonctions internes de rendu -----
    function inMapLocal() {}
    function getCam() {
      const w = worldRef.current, m = meRef.current;
      const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
      let cx = (m.x + 0.5) * T - vw / 2, cy = (m.y + 0.5) * T - vh / 2;
      cx = Math.max(0, Math.min(w.w * T - vw, cx)); cy = Math.max(0, Math.min(w.h * T - vh, cy));
      return { x: cx, y: cy, vw, vh };
    }
    // Récolte automatique en marchant sur une culture mûre (en plus du
    // clic/Espace, qui reste actif). Une tuile déjà demandée n'est pas
    // redemandée tant que la réponse n'est pas revenue (anti-spam), avec
    // une expiration de secours si jamais l'hôte ne répondait pas.
    function checkWalkOverHarvest() {
      const m = meRef.current, w = worldRef.current;
      if (!m || !w || fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current || cauldronMenuOpenRef.current) return;
      const tx = Math.floor(m.x + 0.5), ty = Math.floor(m.y + 0.5);
      if (!inMap(tx, ty)) return;
      const i = idxOf(tx, ty);
      const c = w.crops.get(i);
      if (!c || !E.cropGrowState(c, Date.now()).mature) return; // pas mûr : passer dessus ne fait rien
      if (autoHarvestPendingRef.current.has(i)) return;
      autoHarvestPendingRef.current.add(i);
      setTimeout(() => autoHarvestPendingRef.current.delete(i), 1500);
      sendReq({ kind: "act", action: "harvest", x: tx, y: ty });
    }
    // Arrosage automatique en marchant sur une culture qui en a besoin, à
    // condition d'avoir l'arrosoir équipé (case 2) : cohérent avec l'arrosage
    // manuel, qui exige toujours cet outil. Même anti-spam que la récolte.
    function checkWalkOverWater() {
      const m = meRef.current, w = worldRef.current;
      if (!m || !w || slotRef.current !== 1 || fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current || cauldronMenuOpenRef.current) return;
      const tx = Math.floor(m.x + 0.5), ty = Math.floor(m.y + 0.5);
      if (!inMap(tx, ty)) return;
      const i = idxOf(tx, ty);
      const c = w.crops.get(i);
      if (!c) return;
      const gs = E.cropGrowState(c, Date.now());
      if (gs.mature || !gs.needsWater) return;
      if (autoWaterPendingRef.current.has(i)) return;
      autoWaterPendingRef.current.add(i);
      setTimeout(() => autoWaterPendingRef.current.delete(i), 1500);
      sendReq({ kind: "act", action: "water", x: tx, y: ty });
    }
    // Collecte automatique d'une production d'élevage en marchant à portée
    // d'un animal prêt (aucun outil requis, comme la collecte manuelle
    // prioritaire dans doAction). Même anti-spam, par index d'animal.
    function checkWalkOverCollect() {
      if (fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current || cauldronMenuOpenRef.current) return;
      const ai = nearestCollectable();
      if (ai < 0) return;
      if (autoCollectPendingRef.current.has(ai)) return;
      autoCollectPendingRef.current.add(ai);
      setTimeout(() => autoCollectPendingRef.current.delete(ai), 1500);
      sendReq({ kind: "collect", animal: ai });
    }
    // Collision dédiée à la carte maléfique : volontairement séparée de
    // canStand/blockedTile (fermeEngine.js), câblées en dur sur les
    // dimensions de la ferme (idx/inMap internes -> C.MAP_W/C.MAP_H) et donc
    // inutilisables telles quelles sur une carte 70x70 — voir generateEvilWorld.
    function getCamEvil() {
      const ew = evilWorldRef.current, m = meRef.current;
      const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
      let cx = (m.x + 0.5) * T - vw / 2, cy = (m.y + 0.5) * T - vh / 2;
      cx = Math.max(0, Math.min(ew.w * T - vw, cx)); cy = Math.max(0, Math.min(ew.h * T - vh, cy));
      return { x: cx, y: cy, vw, vh };
    }
    // Rendu de la carte maléfique : volontairement minimal et séparé du
    // rendu ferme (qui suppose worldRef.current partout) — juste le sol
    // (teinte sombre unie, pas de cycle jour/nuit ici : l'ambiance reste
    // sombre en permanence), les arbres/rochers (mêmes sprites que la ferme,
    // pour la cohérence visuelle) et le joueur lui-même. Pas d'autre joueur,
    // pas d'animaux, pas de cultures : personne d'autre n'est censé se
    // trouver ici en même temps (voir crossPassage/pubMe, "lui seul").
    function drawEvilFrame(now) {
      const ew = evilWorldRef.current, m = meRef.current, sprites = spritesRef.current;
      if (!ew || !sprites) return;
      const cam = getCamEvil();
      ctx.setTransform(ZOOM, 0, 0, ZOOM, -Math.round(cam.x * ZOOM), -Math.round(cam.y * ZOOM));
      ctx.fillStyle = "#0b120c";
      ctx.fillRect(cam.x, cam.y, cam.vw, cam.vh);
      const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(ew.w - 1, Math.ceil((cam.x + cam.vw) / T));
      const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(ew.h - 1, Math.ceil((cam.y + cam.vh) / T));
      const draws = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * ew.w + x, g = ew.ground[i];
        ctx.fillStyle = g === C.G_DARK_PASSAGE ? "#3a2a55" : g === C.G_WATER ? "#241246" : "#182417";
        ctx.fillRect(x * T, y * T, T, T);
        if (g === C.G_DARK_PASSAGE) {
          const pulse = 0.4 + Math.sin(now / 500) * 0.15;
          ctx.fillStyle = `rgba(140, 90, 220, ${pulse})`;
          ctx.fillRect(x * T, y * T, T, T);
        } else if (g === C.G_WATER) {
          // Grand lac violet luisant (chantier 2026-07, demande Guillaume :
          // "ambiance sombre partout avec un grand lac violet luisant") :
          // même principe de voile pulsant que le passage sombre ci-dessus,
          // teinte plus profonde et onde plus lente/large pour une surface
          // qui respire plutôt que clignote, cohérente avec un grand plan
          // d'eau plutôt qu'une case isolée.
          const glow = 0.5 + Math.sin(now / 1100 + (x + y) * 0.35) * 0.22;
          ctx.fillStyle = `rgba(160, 70, 220, ${glow})`;
          ctx.fillRect(x * T, y * T, T, T);
          // Bulles (chantier 2026-07, demande Guillaume : "rendre le lac plus
          // actif") : une case sur ~sept émet une bulle en boucle, hash
          // déterministe sur l'indice de case (pas de random() par frame,
          // sinon la case "choisie" changerait sans arrêt) pour une
          // répartition stable mais qui a l'air naturelle/éparse — chaque
          // bulle remonte du bas vers le haut de sa case sur une période
          // propre (déphasée par le hash), grossit très légèrement en
          // montant, et s'estompe juste avant de disparaître en haut plutôt
          // que de couper net.
          const bh = ((i * 2654435761) >>> 0) % 1000 / 1000;
          if (bh < 0.14) {
            const period = 2600 + bh * 4200;
            const phase = ((now + bh * 97000) % period) / period;
            if (phase < 0.9) {
              const bx = x * T + 4 + bh * (T - 8);
              const by = (y + 1) * T - phase * (T * 1.15);
              const bAlpha = Math.sin(phase / 0.9 * Math.PI) * 0.75;
              ctx.fillStyle = `rgba(215, 180, 255, ${bAlpha})`;
              ctx.beginPath(); ctx.arc(bx, by, 1.2 + bh * 1.6, 0, 7); ctx.fill();
            }
          }
        }
        const o = ew.objects[i];
        if (o === C.O_TREE || o === C.O_TREE2) { const img = o === C.O_TREE ? sprites.oak : sprites.pine; draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(img, x * T - 8, (y + 1) * T - 48) }); }
        else if (o === C.O_TREE_DEAD) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.deadTree, x * T - 8, (y + 1) * T - 48) });
        else if (o === C.O_STUMP) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.stump, x * T, y * T) });
        else if (o === C.O_ROCK) {
          // Rochers du monde maléfique (chantier 2026-07, demande Guillaume :
          // "les roches là-bas [plus pointues]") : même sprite de base que
          // la ferme (pas de nouveau pixel art dédié ici), mais lueur
          // améthyste pulsante pour signaler visuellement la présence de
          // minerai magique — même teinte que le lac/la lueur maléfique
          // (voir cauldronSprite, fermeArt.js), sans idem-sprite dupliqué.
          draws.push({
            y: (y + 1) * T, fn: () => {
              const pulse = 0.55 + 0.35 * Math.sin(now / 480 + i);
              ctx.save();
              ctx.shadowColor = `rgba(190, 120, 255, ${pulse})`;
              ctx.shadowBlur = 10;
              ctx.drawImage(sprites.rock, x * T, y * T);
              ctx.restore();
            }
          });
        }
      }
      // Chaudron-artéfact (chantier 2026-07, demande Guillaume : "on le
      // trouve comme un artéfact interactif dans le monde maléfique avant
      // qu'il ne soit présent dans le monde normal") : point d'intérêt fixe
      // (EVIL_CAULDRON_SPAWN), PAS un objet de ew.objects — disparaît dès
      // que quelqu'un l'a ramassé (s.salveCraft.cauldronUnlocked, synchronisé
      // comme le reste), pour tout le monde, pas seulement le joueur qui l'a
      // pris. Sprite pixel art (voir cauldronSprite, fermeArt.js) + lueur
      // pulsante statique pour bien le distinguer du décor — plus d'emoji ni
      // d'animation de flottement (demande Guillaume).
      if (!(sharedRef.current.salveCraft && sharedRef.current.salveCraft.cauldronUnlocked)) {
        const cx = C.EVIL_CAULDRON_SPAWN.x, cy = C.EVIL_CAULDRON_SPAWN.y;
        if (cx >= x0 - 1 && cx <= x1 + 1 && cy >= y0 - 1 && cy <= y1 + 1) {
          draws.push({ y: (cy + 1) * T, fn: () => {
            const glow = 0.4 + Math.sin(now / 350) * 0.2;
            ctx.save(); ctx.shadowColor = `rgba(200, 140, 255, ${glow})`; ctx.shadowBlur = 16;
            ctx.drawImage(sprites.cauldron, cx * T - 2, cy * T - 2);
            ctx.restore();
          } });
        }
      }
      draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) });
      // Créatures maléfiques (chantier 2026-07, demande Guillaume) : réutilise
      // le sprite loup (mêmes 4 frames de marche, même mécanique d'animT que
      // les loups de la ferme) plutôt qu'un nouvel asset — reteinté en violet
      // sombre via ctx.filter pour rester cohérent avec l'ambiance de la
      // carte maléfique (lac/passage, déjà dans cette teinte) et bien
      // distinct visuellement d'un loup normal. Lueur douce ajoutée quand la
      // créature a repéré le joueur (`chasing`), pour signaler clairement le
      // danger avant même le contact.
      // Coéquipiers présents sur la carte maléfique (2026-07) : visibles et
      // interpolés (ex/ey vers etx/ety, ~12 Hz), animés via un compteur
      // dédié (eAnimT, distinct de l'animT utilisé par la vue ferme).
      for (const rp of playersRef.current.values()) {
        if (rp.zone !== "evil" || rp.etx === undefined) continue;
        rp.ex = rp.ex === undefined ? rp.etx : rp.ex + (rp.etx - rp.ex) * 0.25;
        rp.ey = rp.ey === undefined ? rp.ety : rp.ey + (rp.ety - rp.ey) * 0.25;
        rp.eAnimT = rp.emoving ? (rp.eAnimT || 0) + 0.16 : 0;
        const pv = { ...rp, x: rp.ex, y: rp.ey, moving: !!rp.emoving, animT: rp.eAnimT };
        draws.push({ y: (rp.ey + 1) * T, fn: () => drawCharacter(pv, false) });
      }
      // Créatures maléfiques PARTAGÉES (2026-07) : positions simulées par
      // l'hôte (updateSharedEvilMonsters), reçues via apply `evilMonsters`.
      for (const mo of (sharedRef.current.evilMonsters || [])) {
        draws.push({ y: (mo.y + 1) * T, fn: () => {
          if (mo.chasing) {
            const glow = 0.35 + Math.sin(now / 220) * 0.15;
            ctx.save(); ctx.shadowColor = `rgba(170, 60, 220, ${glow})`; ctx.shadowBlur = 14;
          } else if (mo.fleeing) {
            // Pommade de protection (chantier 2026-07) : lueur verte plutôt
            // que violette tant que la créature fuit le joueur, pour bien
            // distinguer visuellement "danger" (chasing) de "repoussée"
            // (fleeing) le temps de l'effet.
            const glow = 0.3 + Math.sin(now / 220) * 0.12;
            ctx.save(); ctx.shadowColor = `rgba(90, 220, 130, ${glow})`; ctx.shadowBlur = 12;
          }
          // Correctif 2026-07 (demande Guillaume : "pas tous un aspect de
          // loup") : dispatch selon mo.kind (tiré à la génération, voir
          // generateEvilWorld/fermeEngine.js) — loup (rendu existant
          // inchangé) ou zombie (drawZombie, ci-dessous près de
          // drawCharacter).
          // Animation de mort (chantier 2026-07, 3e victoire d'un joueur) :
          // effondrement + fondu, avec un éclat violet façon dissipation. Les
          // créatures mortes n'ont ni chasing ni fleeing (pas de lueur autour).
          if (mo.deadUntil) {
            const prog = Math.min(1, Math.max(0, 1 - (mo.deadUntil - Date.now()) / C.EVIL_MONSTER_DEATH_ANIM_MS));
            const cx = mo.x * T, cy = mo.y * T;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - prog);
            ctx.translate(cx, cy); ctx.rotate((mo.dir === 2 ? -1 : 1) * prog * (Math.PI / 2)); ctx.translate(-cx, -cy);
            if (mo.kind === "zombie") drawZombie(mo, now);
            else drawWolfMonster(mo);
            ctx.restore();
            ctx.save();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              const r = 4 + prog * 14;
              ctx.globalAlpha = Math.max(0, 0.55 * (1 - prog));
              ctx.fillStyle = "rgba(170, 60, 220, 1)";
              ctx.beginPath();
              ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.5 * (1 - prog * 0.5), 0, 7);
              ctx.fill();
            }
            ctx.restore();
            return;
          }
          if (mo.kind === "zombie") drawZombie(mo, now);
          else drawWolfMonster(mo);
          if (mo.chasing || mo.fleeing) ctx.restore();
        } });
      }
      draws.sort((a, b) => a.y - b.y);
      for (const d of draws) d.fn();
      // Voile sombre permanent (assombrissement de l'ambiance, indépendant
      // du cycle jour/nuit de la ferme, jamais retiré ici).
      ctx.fillStyle = "rgba(0,0,10,0.35)";
      ctx.fillRect(cam.x, cam.y, cam.vw, cam.vh);
      // Invite E pour ramasser le chaudron-artéfact (chantier 2026-07).
      const already = sharedRef.current.salveCraft && sharedRef.current.salveCraft.cauldronUnlocked;
      // Zip 235: passage-world pickups (breloques). Only shown for worlds
      // that place them (spec.pickupCount > 0). Idempotent client-side via
      // pickedIdsRef; the host also tracks them (see req "passagePickup").
      const passSpec = ew.spec || null;
      if (passSpec && passSpec.pickupColor && Array.isArray(ew.pickups)) {
        const picked = pickedIdsRef.current[ew.worldIdx] || {};
        for (const pk of ew.pickups) {
          if (picked[pk.id]) continue;
          const px = pk.x * T + T / 2, py = pk.y * T + T / 2;
          const pulse = 0.6 + 0.4 * Math.sin(now / 320 + pk.id);
          ctx.save();
          ctx.shadowColor = passSpec.pickupColor; ctx.shadowBlur = 10 * pulse;
          ctx.fillStyle = passSpec.pickupColor;
          ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
          ctx.restore();
        }
      }
      // Zip 235: maze center prize (only in "maze" world). Drawn as a small
      // chest lookalike.
      if (ew.maze) {
        const mx = ew.maze.prizeX * T, my = ew.maze.prizeY * T;
        ctx.fillStyle = "#8a5a2a"; ctx.fillRect(mx + 2, my + 6, 12, 8);
        ctx.fillStyle = "#e8c860"; ctx.fillRect(mx + 2, my + 6, 12, 2);
        ctx.fillStyle = "#3a2a10"; ctx.fillRect(mx + 7, my + 9, 2, 3);
        const pulse = 0.4 + 0.3 * Math.sin(now / 400);
        ctx.save(); ctx.shadowColor = `rgba(255,220,130,${pulse})`; ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(255,220,130,0.6)"; ctx.strokeRect(mx + 1.5, my + 5.5, 13, 9); ctx.restore();
      }
      // Prompt on the passage world: pickup nearby > cauldron > return.
      let ppk = null;
      const cauldronDone = sharedRef.current.salveCraft && sharedRef.current.salveCraft.cauldronUnlocked;
      if (passSpec && passSpec.pickupColor && Array.isArray(ew.pickups)) {
        const pickedNow = pickedIdsRef.current[ew.worldIdx] || {};
        for (const pk of ew.pickups) {
          if (pickedNow[pk.id]) continue;
          if (Math.abs(m.x + 0.5 - (pk.x + 0.5)) <= 1.2 && Math.abs(m.y + 0.5 - (pk.y + 0.5)) <= 1.2) { ppk = "passagePickup:" + pk.id; break; }
        }
      }
      if (!ppk && ew.maze && Math.abs(m.x + 0.5 - (ew.maze.prizeX + 0.5)) <= 1.5 && Math.abs(m.y + 0.5 - (ew.maze.prizeY + 0.5)) <= 1.5) ppk = "mazePrize";
      if (!ppk && !cauldronDone && nearTile(C.EVIL_CAULDRON_SPAWN) && passSpec && passSpec.key === "evil") ppk = "evilCauldronPickup";
      setPromptKeyThrottled(ppk);
    }
    function blockedEvil(ew, x, y) {
      const fx = Math.floor(x), fy = Math.floor(y);
      if (fx < 0 || fy < 0 || fx >= ew.w || fy >= ew.h) return true;
      const i = fy * ew.w + fx;
      const o = ew.objects[i];
      // Lac violet (chantier 2026-07, demande Guillaume) : bloque comme la
      // rivière côté ferme normale (E.isWaterTile) — pas de baignade ici.
      if (ew.ground[i] === C.G_WATER) return true;
      return o === C.O_TREE || o === C.O_TREE2 || o === C.O_TREE_DEAD || o === C.O_STUMP || o === C.O_ROCK;
    }
    function canStandEvil(ew, x, y) {
      const r = 0.3;
      return !blockedEvil(ew, x - r, y) && !blockedEvil(ew, x + r, y) && !blockedEvil(ew, x - r, y + 0.35) && !blockedEvil(ew, x + r, y + 0.35);
    }
    // ----- Valley Town (zip 234) -----
    // Same separation as the evil map: dedicated camera, collision and frame
    // renderer on townWorldRef (64x48), never touching worldRef. UNLIKE the
    // evil map this zone is MULTIPLAYER: remote players with zone "town" are
    // lerped and drawn here (their real x/y travels in the normal pos
    // broadcast, see pubMe).
    function getCamTown() {
      const tw = townWorldRef.current, m = meRef.current;
      const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
      let cx = (m.x + 0.5) * T - vw / 2, cy = (m.y + 0.5) * T - vh / 2;
      cx = Math.max(0, Math.min(tw.w * T - vw, cx)); cy = Math.max(0, Math.min(tw.h * T - vh, cy));
      return { x: cx, y: cy, vw, vh };
    }
    // Deterministic house assignment: every KNOWN farmer (farmersRef, i.e.
    // anyone who ever joined this world) sorted by id -> plots in order.
    // Same inputs on every client = same map for everyone, no sync needed.
    // Zip 247 (demande Guillaume : "quand les visiteurs emménagent, ils
    // occupent une des maisons à vendre") : une fois les joueurs casés, les
    // résidents (visiteurs ayant emménagé, sharedRef.current.station.residents,
    // même ordre pour tout le monde) prennent les plots restants — sinon la
    // maison reste "à vendre" indéfiniment même après un emménagement.
    function townHouseOwners() {
      const ids = Object.keys(farmersRef.current || {}).sort();
      const residents = (sharedRef.current.station && sharedRef.current.station.residents) || [];
      return C.TOWN_HOUSES.map((h, i) => {
        const fid = ids[i];
        if (fid) { const fm = farmersRef.current[fid]; return { ...h, ownerId: fid, ownerName: fm ? (fm.name || "?") : null, resident: null }; }
        const res = residents[i - ids.length];
        if (res) {
          const ro = C.VISITOR_ROSTER[res.rid];
          return { ...h, ownerId: "res" + res.rid, ownerName: ro ? ro.name : null, resident: res };
        }
        return { ...h, ownerId: null, ownerName: null, resident: null };
      });
    }
    function blockedTown(tw, x, y) {
      const fx = Math.floor(x), fy = Math.floor(y);
      if (fx < 0 || fy < 0 || fx >= tw.w || fy >= tw.h) return true;
      if (fx <= C.TOWN_RAIL_X + 1 && !(fy >= C.TOWN_PLATFORM.y && fy < C.TOWN_PLATFORM.y + C.TOWN_PLATFORM.h)) return true; // rails: only reachable along the platform
      const i = fy * tw.w + fx;
      if (tw.ground[i] === C.G_WATER) return true; // fountain pool
      // Zip 235: townhall footprint blocks like a building.
      if (fx >= C.TOWN_HALL.x && fx < C.TOWN_HALL.x + C.TOWN_HALL.w && fy >= C.TOWN_HALL.y && fy < C.TOWN_HALL.y + C.TOWN_HALL.h) return true;
      for (const hsn of C.TOWN_HOUSES) {
        if (fx >= hsn.x && fx < hsn.x + C.TOWN_HOUSE_W && fy >= hsn.y && fy < hsn.y + C.TOWN_HOUSE_H) return true;
      }
      const o = tw.objects[i];
      return o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP;
    }
    function canStandTown(tw, x, y) {
      const r = 0.3;
      return !blockedTown(tw, x - r, y) && !blockedTown(tw, x + r, y) && !blockedTown(tw, x - r, y + 0.35) && !blockedTown(tw, x + r, y + 0.35);
    }
    function updateMeTown(dt) {
      const m = meRef.current, tw = townWorldRef.current, keys = keysRef.current;
      if (!tw) return;
      const uiBlocked = mapOpenRef.current || document.activeElement === chatInputRef.current;
      let dx = 0, dy = 0;
      if (!uiBlocked) {
        if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyZ"]) dy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
        if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyQ"]) dx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
      }
      const moving = (dx || dy) && actAnimRef.current <= 0;
      if (moving) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        // Zip 250 (demande Guillaume : "mêmes déplacements qu'à la ferme, on
        // ne fait que marcher en ville") : on retire l'ancien bonus de vitesse
        // ville (TOWN_SPEED_MULT) pour caler la marche EXACTEMENT sur la ferme
        // (PLAYER_SPEED, même bonus bonbon). Le cheval reste absent en ville.
        const sp = C.PLAYER_SPEED * dt * (performance.now() < speedBuffUntilRef.current ? C.CANDY_SPEED_MUL : 1);
        const nx = m.x + dx * sp, ny = m.y + dy * sp;
        if (canStandTown(tw, nx, m.y)) m.x = nx;
        if (canStandTown(tw, m.x, ny)) m.y = ny;
        if (dx < 0) m.dir = 2; else if (dx > 0) m.dir = 3; else if (dy < 0) m.dir = 1; else if (dy > 0) m.dir = 0;
        m.animT += dt * 9;
      } else m.animT = 0;
      m.moving = !!moving;
      const nowP = performance.now();
      maybeSendPos();
    }
    function drawTownFrame(now, dt) {
      const tw = townWorldRef.current, m = meRef.current, sprites = spritesRef.current;
      if (!tw || !sprites) return;
      const cam = getCamTown();
      ctx.setTransform(ZOOM, 0, 0, ZOOM, -Math.round(cam.x * ZOOM), -Math.round(cam.y * ZOOM));
      ctx.fillStyle = "#4c8f40";
      ctx.fillRect(cam.x, cam.y, cam.vw, cam.vh);
      const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(tw.w - 1, Math.ceil((cam.x + cam.vw) / T));
      const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(tw.h - 1, Math.ceil((cam.y + cam.vh) / T));
      const draws = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * tw.w + x, g = tw.ground[i];
        // Zip 235: use the real farm sprite tiles for a match with the farm
        // look (grass/path/stone), keeping the fountain water for the pool.
        if (g === C.G_GRASS) ctx.drawImage(sprites.grass[(x * 37 + y * 17) % sprites.grass.length], x * T, y * T);
        else if (g === C.G_PATH) ctx.drawImage(sprites.path, x * T, y * T);
        else if (g === C.G_PATH_STONE) { ctx.fillStyle = ((x + y) % 2 === 0) ? "#a9a9b2" : "#9f9fa8"; ctx.fillRect(x * T, y * T, T, T); }
        else if (g === C.G_WATER) { ctx.fillStyle = "#3f7fd0"; ctx.fillRect(x * T, y * T, T, T); }
        else ctx.drawImage(sprites.grass[0], x * T, y * T);
        // Rails on the west edge (same look as the farm side: dark bed,
        // lighter ties, two steel rails).
        if (x >= C.TOWN_RAIL_X && x <= C.TOWN_RAIL_X + 1) {
          ctx.fillStyle = "#5c5348"; ctx.fillRect(x * T, y * T, T, T);
          if (y % 2 === 0) { ctx.fillStyle = "#7a6a52"; ctx.fillRect(x * T, y * T + 6, T, 3); }
          ctx.fillStyle = "#9aa0aa";
          if (x === C.TOWN_RAIL_X) ctx.fillRect(x * T + 11, y * T, 2, T);
          else ctx.fillRect(x * T + 3, y * T, 2, T);
        }
        // Platform planks alongside the rails.
        if (x >= C.TOWN_PLATFORM.x && x < C.TOWN_PLATFORM.x + C.TOWN_PLATFORM.w && y >= C.TOWN_PLATFORM.y && y < C.TOWN_PLATFORM.y + C.TOWN_PLATFORM.h) {
          ctx.fillStyle = "#b09468"; ctx.fillRect(x * T, y * T, T, T);
          ctx.fillStyle = "#9c8158"; ctx.fillRect(x * T, y * T + (y % 2 ? 4 : 10), T, 2);
        }
        // Fountain pool: gently breathing highlight, like the farm river.
        if (g === C.G_WATER) {
          const glow = 0.25 + Math.sin(now / 900 + (x + y)) * 0.12;
          ctx.fillStyle = `rgba(190, 225, 255, ${glow})`;
          ctx.fillRect(x * T, y * T, T, T);
        }
        const o = tw.objects[i];
        if (o === C.O_TREE || o === C.O_TREE2) { const _se = E.seasonOf().key; const img = o === C.O_TREE ? (_se === "autumn" ? sprites.oakAutumn : _se === "spring" ? sprites.oakSpring : sprites.oak) : (_se === "autumn" ? sprites.pineAutumn : _se === "spring" ? sprites.pineSpring : sprites.pine); draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(img, x * T - 8, (y + 1) * T - 48) }); }
      }
      // Fountain rim + spray, on top of the pool tiles.
      {
        const fx0 = C.TOWN_FOUNTAIN.x * T, fy0 = C.TOWN_FOUNTAIN.y * T;
        ctx.fillStyle = "#8a8a94";
        ctx.fillRect(fx0 - 3, fy0 - 3, T * 2 + 6, 3); ctx.fillRect(fx0 - 3, fy0 + T * 2, T * 2 + 6, 3);
        ctx.fillRect(fx0 - 3, fy0, 3, T * 2); ctx.fillRect(fx0 + T * 2, fy0, 3, T * 2);
        const jet = Math.sin(now / 260) * 2;
        ctx.fillStyle = "rgba(210, 235, 255, 0.9)";
        ctx.fillRect(fx0 + T - 1, fy0 + T - 8 + jet, 2, 8 - jet);
        for (let d = 0; d < 4; d++) {
          const ph = ((now / 700) + d * 0.25) % 1;
          ctx.fillStyle = `rgba(210, 235, 255, ${0.7 * (1 - ph)})`;
          ctx.fillRect(fx0 + T - 6 + d * 3, fy0 + T - 2 - ph * 6, 2, 2);
        }
      }
      // Zip 235: townhall sprite anchored on TOWN_HALL (128x128, anchored
      // by its bottom edge like the houses).
      {
        const th = C.TOWN_HALL, thBy = (th.y + th.h) * T;
        draws.push({ y: thBy, fn: () => {
          ctx.drawImage(sprites.townhall, th.x * T + (th.w * T - 128) / 2, thBy - 128);
        } });
      }
      // Houses: one per known farmer (deterministic order), leftovers show a
      // "for sale" plate. Zip 235: 10 basic free façade styles — the owner
      // may cycle theirs with R at their door (see facadeStylesRef).
      const owners = townHouseOwners();
      for (let hi = 0; hi < owners.length; hi++) {
        const hsn = owners[hi];
        // Style: owner's saved choice if any, else deterministic default.
        const styleMap = facadeStylesRef.current || {};
        const styleIdx = (hsn.ownerId && typeof styleMap[hsn.ownerId] === "number")
          ? styleMap[hsn.ownerId] : hi % C.TOWN_HOUSE_STYLES;
        // Zip 250: fallback d'image blindé (jamais `undefined` passé à
        // drawImage) — voir aussi le try/catch par-draw plus bas.
        const img = (sprites.townHouses && sprites.townHouses[styleIdx % C.TOWN_HOUSE_STYLES]) || (sprites.houses && sprites.houses[hi % sprites.houses.length]) || null;
        const bx = hsn.x * T, by = (hsn.y + C.TOWN_HOUSE_H) * T;
        draws.push({ y: by, fn: () => {
          if (img) ctx.drawImage(img, bx, by - 96);
          const label = hsn.ownerName || L.townSaleSign;
          ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
          const tx2 = bx + T * C.TOWN_HOUSE_W / 2, ty2 = by - 96 + 12;
          const wpx = ctx.measureText(label).width + 8;
          ctx.fillStyle = "#f5eeda"; ctx.fillRect(tx2 - wpx / 2, ty2 - 8, wpx, 11);
          ctx.strokeStyle = "#6b4a2e"; ctx.lineWidth = 1; ctx.strokeRect(tx2 - wpx / 2 + 0.5, ty2 - 7.5, wpx - 1, 10);
          ctx.fillStyle = "#1d1d1d"; ctx.fillText(label, tx2, ty2);
          ctx.textAlign = "left";
        } });
      }
      // Station sign (ride back to the farm), reusing the farm's ad board sprite.
      draws.push({ y: (C.TOWN_STATION_SIGN.y + 1) * T, fn: () => ctx.drawImage(sprites.signBoard, C.TOWN_STATION_SIGN.x * T - 1, C.TOWN_STATION_SIGN.y * T - 6) });
      // Remote players in town: their pos broadcast carries real town coords
      // (zone "town"); lerp locally exactly like the farm loop does — the
      // farm loop early-returns before its own lerp while we are here.
      for (const p of playersRef.current.values()) {
        if (p.zone !== "town" || p.sleeping) continue;
        advanceRemote(p); // FIX 243
        p.x += (p.tx - p.x) * Math.min(1, dt * 12);
        p.y += (p.ty - p.y) * Math.min(1, dt * 12);
        p.animT = p.moving ? (p.animT || 0) + dt * 9 : 0;
        draws.push({ y: (p.y + 0.9) * T, fn: () => drawRemotePets(p, dt) });
        draws.push({ y: (p.y + 1) * T, fn: () => drawCharacter(p, false) });
      }
      if (!m.sleeping) draws.push({ y: (m.y + 0.9) * T, fn: () => drawMyPets(m, dt) });
      draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) });
      // Zip 251 : décorations posées en Valley Town (même liste partagée,
      // filtrée sur zone "town" ; persistées avec la ferme).
      for (const e of (sharedRef.current.decor || [])) {
        if (e.zone !== "town") continue;
        const dimg = sprites.decor && sprites.decor[e.deco]; if (!dimg) continue;
        const dex = e.x, dey = e.y;
        draws.push({ y: (dey + 0.5) * T, fn: () => ctx.drawImage(dimg, Math.round(dex * T - dimg.width / 2), Math.round(dey * T - dimg.height + 6)) });
      }
      draws.sort((a, b) => a.y - b.y);
      // Zip 250 (bug "les maisons disparaissent à deux") : la boucle exécutait
      // les draws triés d'un bloc — si UN seul draw levait une exception (ex.
      // un joueur distant fraîchement arrivé, une image manquante), TOUS les
      // draws suivants (dont des maisons plus bas à l'écran) n'étaient plus
      // dessinés. On isole chaque draw : une frame ne peut plus être amputée.
      for (const d of draws) { try { d.fn(); } catch (e) { console.error("[FERME] town draw ignoré", e); } }
      // Prompts: E at the sign to ride home; near a house door, name it.
      let tpk = null;
      if (nearTile(C.TOWN_STATION_SIGN)) tpk = "trainBack";
      else {
        for (const hsn of owners) {
          const doorX = hsn.x + C.TOWN_HOUSE_W / 2, doorY = hsn.y + C.TOWN_HOUSE_H + 0.5;
          if (Math.abs(m.x + 0.5 - doorX) <= 1.6 && Math.abs(m.y - doorY) <= 1.4) { tpk = hsn.ownerName ? "townHouse:" + hsn.ownerName : "townHouseSale"; break; }
        }
      }
      setPromptKeyThrottled(tpk);
      setMountPromptThrottled(null); // zip 234 debug fix: clear a stale farm mount hint while in town
    }
    // Créatures maléfiques (chantier 2026-07, demande Guillaume : "des
    // monstres qui pourchassent le joueur, lents, mais qui l'assomment et le
    // renvoient chez lui blessé au contact") : simulation purement locale
    // (comme le reste de la carte maléfique, voir generateEvilWorld) —
    // endormies tant que le joueur reste hors de portée de détection
    // (`EVIL_MONSTER_DETECT_RADIUS`), puis avancent lentement droit sur lui
    // (`EVIL_MONSTER_SPEED`, bien inférieure à `PLAYER_SPEED` : on peut leur
    // échapper en marchant) une fois repérées — pas de désaggro ensuite
    // (elles gardent la cible jusqu'au contact ou jusqu'à ce que le joueur
    // quitte la carte). Le contact déclenche `caughtByMonster()` quel que
    // soit le sens (le joueur fonce dedans OU la créature le rattrape) —
    // volontairement aucune distinction "attaque"/"subi", conformément à la
    // demande ("if you hit them or if they hit you"). Volontairement pas de
    // collision avec les arbres/rochers ici (contrairement au joueur, voir
    // canStandEvil) : des créatures qui se bloquent en forêt seraient
    // triviales à semer, ce qui viderait la menace de tout son sens sur une
    // carte aussi densément boisée.
    // Pommade de protection (chantier 2026-07, demande Guillaume : "adding a
    // salve buyable from the market to repel the creatures or be immune to
    // them for 10 minutes, so the player can explore/farm that side").
    // Correctif 2026-07 (demande Guillaume : "elle doit nous rendre invisible
    // ET immunisé aux monstres") : remplace l'ancienne répulsion (créature
    // qui "voit" le joueur et s'en éloigne) par une invisibilité totale —
    // tant que immunityUntilRef est dans le futur, une créature qui ne fuit
    // pas déjà une morsure gagnée ignore purement et simplement le joueur
    // (aucune poursuite, aucun mouvement de réaction), exactement comme s'il
    // n'était pas là. Voir aussi le rendu semi-transparent du joueur pendant
    // l'immunité (drawCharacter, ci-dessous), ajouté pour rendre cette
    // invisibilité lisible à l'écran.
    // (Simulation locale des créatures supprimée, 2026-07 : les créatures
    // maléfiques sont désormais PARTAGÉES et simulées par l'HÔTE — voir
    // updateSharedEvilMonsters — sur décision de Guillaume, pour que tous
    // les joueurs présents sur la carte voient les mêmes monstres.)
    function updateMeEvil(dt) {
      const m = meRef.current, ew = evilWorldRef.current, keys = keysRef.current;
      if (!ew) return;
      const uiBlocked = mapOpenRef.current || document.activeElement === chatInputRef.current;
      let dx = 0, dy = 0;
      if (!uiBlocked) {
        if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyZ"]) dy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
        if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyQ"]) dx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
      }
      const moving = (dx || dy) && actAnimRef.current <= 0;
      if (moving) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        const sp = C.PLAYER_SPEED * dt * (performance.now() < speedBuffUntilRef.current ? C.CANDY_SPEED_MUL : 1);
        const nx = m.x + dx * sp, ny = m.y + dy * sp;
        if (canStandEvil(ew, nx, m.y)) m.x = nx;
        if (canStandEvil(ew, m.x, ny)) m.y = ny;
        if (dx < 0) m.dir = 2; else if (dx > 0) m.dir = 3; else if (dy < 0) m.dir = 1; else if (dy > 0) m.dir = 0;
        m.animT += dt * 9;
      } else m.animT = 0;
      m.moving = !!moving;
      // Monde maléfique MULTIJOUEUR (2026-07) : la position est désormais
      // diffusée aussi depuis la carte maléfique (champs ex/ey de pubMe) —
      // pour les coéquipiers présents sur la carte ET pour la simulation
      // hôte des créatures partagées. x/y publics restent figés côté ferme.
      const nowP = performance.now();
      maybeSendPos();
    }
    function updateMe(dt) {
      const m = meRef.current, keys = keysRef.current;
      // Zip 232 (solid station/barn): mirror the current barn level onto the
      // world object so blockedTile/blockedTileMounted (fermeEngine.js) can
      // block the barn's drawn rectangle — the barn state lives in `shared`,
      // which collision functions never receive. Refreshed every frame; also
      // covers the host sims (wolves, Greg, animal drops) since they share
      // this same world object.
      if (worldRef.current) worldRef.current.barnLevel = sharedRef.current.barn ? (sharedRef.current.barn.level | 0) : 0;
      // Zip 260 : miroir des footprints d'artisans (bâtiments SOLIDES) pour la
      // collision locale (solidBuildingAt lit world.artisanBlocks), rafraîchi
      // chaque frame comme barnLevel car la position est déplaçable.
      if (worldRef.current) {
        const abs = [], cr = sharedRef.current.crafts || {};
        for (const bid of Object.keys(C.ARTISAN_BUILDINGS)) {
          const cb = cr[bid]; if (!cb || !cb.built) continue;
          const def = C.ARTISAN_BUILDINGS[bid], p = artisanPos(bid);
          abs.push({ x: Math.round(p.x), y: Math.round(p.y), w: def.w, h: def.h });
        }
        worldRef.current.artisanBlocks = abs;
      }
      if (m.zone === "evil") { updateMeEvil(dt); return; }
      if (m.zone === "town") { updateMeTown(dt); return; } // Valley Town (zip 234)
      const w = worldRef.current;
      const horseNow = (sharedRef.current.horses || []).find(h => h.rider2 === me.id);
      if (horseNow) {
        // Passager : ne pilote pas, suit simplement la position vivante du
        // cavalier principal (aucune touche de déplacement à traiter ici ;
        // F reste actif pour descendre, géré ailleurs par toggleMount()).
        const driver = playersRef.current.get(horseNow.rider);
        if (driver) { m.x = driver.x; m.y = driver.y; m.dir = driver.dir; m.moving = driver.moving; m.animT = driver.animT || 0; }
        const now2 = performance.now();
        maybeSendPos();
        return;
      }
      const uiBlocked = shopOpenRef.current || binOpenRef.current || mapOpenRef.current || cauldronMenuOpenRef.current || fishMiniRef.current || adsOpenRef.current || visitorOpenRef.current || gregCardOpenRef.current || document.activeElement === chatInputRef.current || m.sleeping || isInjured();
      let dx = 0, dy = 0;
      if (!uiBlocked) {
        if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyZ"]) dy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
        if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyQ"]) dx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
      }
      const mounted = (sharedRef.current.horses || []).some(h => h.rider === me.id);
      // Nage à cheval (chantier 2026-07) : monté, l'eau devient franchissable
      // (canStandMounted) mais divise la vitesse par C.HORSE_WATER_SLOW tant
      // que le cheval est sur une case d'eau — plus lent qu'à pied, cohérent
      // avec une traversée à la nage. À pied, l'eau bloque comme avant.
      const swimming = mounted && E.isWaterTile(w, m.x, m.y);
      const moving = (dx || dy) && actAnimRef.current <= 0;
      if (moving) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        const sp = C.PLAYER_SPEED * (mounted ? C.HORSE_SPEED_MULT : 1) / (swimming ? C.HORSE_WATER_SLOW : 1) * dt;
        const nx = m.x + dx * sp, ny = m.y + dy * sp;
        const stand = mounted ? canStandMounted : canStand;
        // Zip 232 escape hatch: if the CURRENT position is already inside a
        // solid tile (e.g. a barn tier finished while standing in its newly
        // blocked rectangle), collision is waived so the player can simply
        // walk out instead of being stuck forever.
        const stuck = !stand(w, m.x, m.y);
        if (stuck || stand(w, nx, m.y)) m.x = nx;
        if (stuck || stand(w, m.x, ny)) m.y = ny;
        if (dx < 0) m.dir = 2; else if (dx > 0) m.dir = 3; else if (dy < 0) m.dir = 1; else if (dy > 0) m.dir = 0;
        // Cadence d'animation ralentie à la nage (le cycle de galop devient
        // un battement de nage, voir drawCharacter/horseRun).
        m.animT += dt * (swimming ? 4 : 9);
      } else m.animT = 0;
      m.moving = !!moving;
      const now = performance.now();
      maybeSendPos();
    }
    // Zip 236/247: draw a player's individual pets trailing behind them. Each
    // pet keeps a smoothed follow position (petFollowRef, keyed by player id)
    // that eases toward a point a bit behind the player, offset per pet so
    // two pets don't overlap. Zip 247: pets are now broadcast (see pubMe/
    // applyDeltas/ensureRemote) so every player sees everyone's pets, not
    // just their own.
    function drawPetsFor(id, pets, m, dt2) {
      const sprites = spritesRef.current;
      if (!pets || !pets.length || !sprites.pets) return;
      let follow = petFollowRef.current.get(id);
      if (!follow) { follow = []; petFollowRef.current.set(id, follow); }
      if (follow.length > pets.length) follow.length = pets.length;
      // behind = opposite of facing dir
      const bx = -[0, 0, -1, 1][m.dir], by = -[1, -1, 0, 0][m.dir];
      for (let i = 0; i < pets.length; i++) {
        const img = sprites.pets[pets[i].id];
        if (!img) continue;
        // target a tile behind the player, fanned sideways by pet index
        const side = i === 0 ? -0.45 : 0.45;
        const perpX = by, perpY = -bx;
        const tx = m.x + bx * (0.9 + i * 0.15) + perpX * side;
        const ty = m.y + by * (0.9 + i * 0.15) + perpY * side;
        if (!follow[i]) follow[i] = { x: tx, y: ty };
        const f2 = follow[i];
        f2.x += (tx - f2.x) * Math.min(1, dt2 * 6);
        f2.y += (ty - f2.y) * Math.min(1, dt2 * 6);
        const bob = m.moving ? Math.sin(performance.now() / 140 + i) * 1.5 : 0;
        // Zip 251 (demande Guillaume) : pets réduits à ~la taille d'une poule.
        // On dessine le sprite 16x16 à l'échelle PET_DRAW_SCALE, ancré par le
        // BAS (les pattes restent au sol) et centré horizontalement.
        const ps = C.PET_DRAW_SCALE, dw = 16 * ps, dh = 16 * ps;
        const dxp = f2.x * T + (16 - dw) / 2, dyp = f2.y * T - 2 + (16 - dh) + bob;
        ctx.drawImage(img, Math.round(dxp), Math.round(dyp), dw, dh);
      }
    }
    function drawMyPets(m, dt2) { drawPetsFor(me.id, myPetsRef.current, m, dt2); }
    function drawRemotePets(p, dt2) { drawPetsFor(p.id, p.pets, p, dt2); }
    function drawSelf(m) {
      drawCharacter(m, true);
      if (actAnimRef.current > 0 && slotRef.current < 2) {
        const sprites = spritesRef.current;
        const key = slotRef.current === 0 ? toolKindRef.current : "can";
        const px = Math.round(m.x * T), py = Math.round(m.y * T);
        const fx2 = [0, 0, -1, 1][m.dir], fy2 = [1, -1, 0, 0][m.dir];
        ctx.drawImage(sprites.icons[key], px + fx2 * 10 + 2, py + fy2 * 8 - 4);
      }
    }
    function drawRemote(p) { drawCharacter(p, false); }
    // Habillage nage (chantier 2026-07, décision Guillaume "immersion +
    // ondulations") : ligne d'eau semi-opaque qui immerge les pattes du
    // cheval + petites vaguelettes claires animées. (sx, sy) = coin du
    // sprite cheval 28x24 tel que dessiné, sw = sa largeur.
    function drawSwimOverlay(sx, sy, sw) {
      ctx.fillStyle = "rgba(58, 123, 200, 0.72)";
      ctx.fillRect(sx - 2, sy + 16, sw + 4, 9);
      const ph = performance.now() / 320;
      ctx.fillStyle = "rgba(220, 238, 255, 0.55)";
      for (let k = 0; k < 3; k++) {
        const ox = (Math.sin(ph + k * 2.1) * 0.5 + 0.5) * (sw - 6);
        ctx.fillRect(sx + ox, sy + 15 + ((k + Math.floor(ph)) % 3), 5, 1);
      }
    }
    function drawCharacter(p, isSelf) {
      const sprites = spritesRef.current;
      const sheet = sprites.getChar(p.gender, p.outfit, p.overalls, p.cap);
      const row = p.dir === 0 ? 0 : p.dir === 1 ? 1 : 2;
      const frame = p.moving ? Math.floor((p.animT || 0) % 4) : 0;
      const horse = (sharedRef.current.horses || []).find(h => h.rider === p.id || h.rider2 === p.id) || null;
      const isPrimaryRider = horse && horse.rider === p.id;
      const isPassenger = horse && horse.rider2 === p.id;
      const riding = isPrimaryRider || isPassenger;
      const flip = p.dir === 2;
      // Le passager est assis juste derrière le cavalier principal sur la
      // selle, décalé du côté opposé au sens de la marche.
      const basePx = Math.round(p.x * T), py = Math.round(p.y * T);
      const px = isPassenger ? basePx + (flip ? 9 : -9) : basePx;
      // Correctif retour Guillaume 2026-07 ("assis trop haut, effet
      // flottement") : lift réduit pour que le bas du buste repose
      // DIRECTEMENT sur la selle du sprite cheval (selle à ~py+2 écran, bas
      // du buste 15px sous seatY), au lieu de flotter au-dessus.
      const lift = riding ? 5 : 0;
      // Nage à cheval (chantier 2026-07) : monture sur une case d'eau ->
      // pattes immergées + vaguelettes (drawSwimOverlay), pas d'ombre portée.
      const wSwim = worldRef.current;
      const swimmingHere = riding && wSwim && p.zone !== "evil" && E.isWaterTile(wSwim, p.x, p.y);
      if (!swimmingHere) { ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(px + 8, py + 15, riding ? 9 : 6, riding ? 3 : 2.5, 0, 0, 7); ctx.fill(); }
      // Galop (chantier 2026-07, demande Guillaume : "le cheval doit décrire
      // une action de galop quand il se déplace") : 4 frames (horseRun,
      // fermeArt.js) cadencées par l'animT du cavalier — déjà ralenti à la
      // nage côté updateMe, le cycle devient naturellement un battement
      // lent. À l'arrêt : frame statique (pattes jointes). hBob = rebond
      // vertical du cavalier, synchronisé avec la frame d'envol du sprite.
      const hFrame = p.moving ? Math.floor((p.animT || 0) % 4) : 0;
      const hBob = p.moving ? [0, -1, 0, 0][hFrame] : 0;
      if (isPrimaryRider) {
        // Le cheval n'est dessiné qu'une fois, porté par le cavalier
        // principal, et se retourne avec lui selon le sens de la marche.
        const hImg = p.moving ? sprites.horseRun[hFrame] : sprites.horse;
        ctx.save();
        if (flip) { ctx.translate(basePx + 22, py - 6); ctx.scale(-1, 1); ctx.drawImage(hImg, 0, 0); }
        else ctx.drawImage(hImg, basePx - 6, py - 6);
        ctx.restore();
        if (swimmingHere) drawSwimOverlay(basePx - 6, py - 6, 28);
      }
      // Invisibilité de la pommade (chantier 2026-07, demande Guillaume :
      // "elle doit nous rendre invisible ET immunisé aux monstres") : tant
      // que soi-même en zone maléfique reste sous l'effet (immunityUntilRef,
      // voir aussi updateEvilMonsters qui fait ignorer le joueur par les
      // créatures pendant ce temps), le sprite se dessine semi-transparent —
      // retour visuel indispensable pour que le joueur SACHE qu'il est
      // invisible, plutôt qu'un effet purement logique invisible... au sens
      // propre.
      const invisibleNow = isSelf && p.zone === "evil" && Date.now() < immunityUntilRef.current;
      ctx.save();
      if (invisibleNow) ctx.globalAlpha = 0.35;
      if (riding) {
        // ASSIS (chantier 2026-07, demande Guillaume : "le fermier qui le
        // chevauche doit clairement être assis dessus, de manière plus
        // réaliste") : on ne dessine que le BUSTE du sprite (15 px du haut —
        // les jambes du cycle de marche, debout, n'ont aucun sens assis),
        // posé sur la selle avec le rebond du galop (hBob), pose neutre
        // (colonne 0). Une jambe fléchie est ajoutée par-dessus : cuisse à
        // l'horizontale, mollet qui tombe le long du flanc, botte au bout.
        const seatY = py - 8 - lift + hBob;
        ctx.save();
        if (flip) { ctx.translate(px + 16, seatY); ctx.scale(-1, 1); }
        else ctx.translate(px, seatY);
        ctx.drawImage(sheet, 0, row * 24, 16, 15, 0, 0, 16, 15);
        ctx.fillStyle = "#3a3550";  // pantalon
        ctx.fillRect(6, 13, 6, 3);  // cuisse
        ctx.fillRect(10, 15, 3, 5); // mollet
        ctx.fillStyle = "#241c14";  // botte
        ctx.fillRect(10, 19, 4, 3);
        ctx.restore();
      } else if (flip) { ctx.translate(px + 16, py - 8 - lift); ctx.scale(-1, 1); ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, 0, 0, 16, 24); }
      else ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, px, py - 8 - lift, 16, 24);
      ctx.restore();
      // Torche allumée (chantier 2026-07) : dessinée collée à la main côté
      // sens de la marche, flamme qui vacille légèrement.
      const carryingTorch = isSelf ? torchOnRef.current : !!p.torch;
      if (carryingTorch) {
        const tx = px + (flip ? -4 : 12), ty = py - 4 - lift;
        const flicker = Math.sin(performance.now() / 90 + px) * 1;
        ctx.drawImage(sprites.torch, tx + flicker, ty);
      }
      ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "#00000090"; ctx.fillText(p.name, px + 8 + 1, py - 10 + 1);
      ctx.fillStyle = isSelf ? "#ffffff" : "#ffe9a8"; ctx.fillText(p.name, px + 8, py - 10);
      // Icône de blessure (chantier 2026-07) : visible au-dessus de TOUT
      // fermier blessé, soi-même ou distant (voir p.injuredUntil, propagé à
      // tous via applyDeltas/p.injured), pour qu'un autre joueur repère qui
      // soigner (trousse de soins, touche E à proximité).
      const hurtUntil = isSelf ? injuredUntilRef.current : (p.injuredUntil || 0);
      if (hurtUntil > Date.now()) {
        ctx.font = "10px monospace";
        ctx.fillText("🩹", px + 8, py - 20);
      }
      // Chapeau (chantier 2026-07) : trophée cosmétique remporté en gagnant
      // le défi "chasse aux lapins" (voir farmer.hatUntil / p.hatWon).
      // Purement décoratif, aucun effet de jeu.
      // Correctif 2026-07 (demande Guillaume : "le chapeau trophée doit être
      // remplacé par une icone trophée") : 🎩 (haut-de-forme) remplacé par
      // 🏆 (coupe), même position/logique, purement cosmétique.
      // Correctif 2026-07 (demande Guillaume : "il doit disparaitre au bout
      // de 15 minutes") : n'est plus affiché en permanence, seulement tant
      // que Date.now() < hatUntil (C.HAT_DISPLAY_MS après la victoire), même
      // principe d'horodatage que la blessure (injuredUntil).
      const wearingHat = (isSelf ? hatUntilRef.current : (p.hatUntil || 0)) > Date.now();
      if (wearingHat) {
        ctx.font = "12px monospace";
        ctx.fillText("🏆", px + 8, py - (riding ? 34 : 26) - lift);
      }
      // Casquette de Soan (chantier 2026-07, demande Guillaume : "Soan
      // ressemble trop à un fermier, il doit avoir un chapeau") : d'abord un
      // overlay emoji 🧢 flottant à position fixe à l'écran (ici même) ; puis
      // corrigé pour flotter moins haut ; puis, demande finale de Guillaume
      // ("le chapeau doit être son skin, vraiment faire partie de sa tête,
      // et tourner avec lui quand il marche"), retiré d'ici et remplacé par
      // du vrai pixel art fusionné DANS le sprite lui-même (voir `cap` dans
      // fermeArt.js/drawCharFrame, activé via `p.cap` sur le sheet réclamé
      // par `sprites.getChar` juste au-dessus dans cette fonction) : la
      // casquette suit désormais automatiquement le bob de marche ET le
      // sens (face/dos/profil, avec flip gauche-droite), exactement comme
      // le reste du corps — plus aucun dessin séparé nécessaire ici.
      // Tabouret + canne à pêche visibles pendant que Soan pêche (demande
      // Guillaume : "soan doit disposer d'un tabouret et avoir une canne à
      // pêche visible quand il pêche" puis "en pixel art, pour rester
      // cohérents avec l'univers du jeu") : sprites dédiés (sprites.stool /
      // sprites.fishingRodHeld, voir fermeArt.js), conditionnés à p.fishing
      // (phase === "fishing", propagé depuis updateSoan/draws.push
      // ci-dessus), même principe que la casquette permanente ci-dessus mais
      // affiché seulement pendant l'action de pêche elle-même — pas en
      // rôdaille ni en pause. Le tabouret est posé au sol derrière lui, la
      // canne tenue et retournée selon le sens où il fait face à l'eau
      // (même logique de flip que le sprite du personnage juste au-dessus).
      if (p.id === "soan" && p.fishing) {
        ctx.drawImage(sprites.stool, px + (flip ? 10 : -12), py + 3);
        ctx.save();
        if (flip) { ctx.translate(px + 16, py - 4 - lift); ctx.scale(-1, 1); ctx.drawImage(sprites.fishingRodHeld, 0, 0); }
        else ctx.drawImage(sprites.fishingRodHeld, px, py - 4 - lift);
        ctx.restore();
      }
    }
    // Rendu du loup maléfique (chantier 2026-07) : extrait tel quel de
    // l'ancien rendu inline (voir drawEvilFrame) au moment de l'introduction
    // du type "zombie" ci-dessous — aucun changement de comportement, juste
    // sorti de la boucle pour permettre le dispatch par mo.kind.
    function drawWolfMonster(mo) {
      const sprites = spritesRef.current;
      const frame = Math.floor((mo.animT || 0) % 4);
      const img = sprites.wolf[frame];
      const px = Math.round(mo.x * T - 14), py = Math.round(mo.y * T - 9);
      ctx.save();
      ctx.filter = "brightness(0.55) saturate(2.2) hue-rotate(235deg)";
      if (mo.dir === 2) { ctx.translate(px + 30, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); }
      else ctx.drawImage(img, px, py);
      ctx.restore();
    }
    // Zombie maléfique (chantier 2026-07, demande Guillaume : "un skin type
    // zombie basé sur l'apparence du fermier ou de Greg, avec des couleurs
    // pâles, qui doit faire peur") : réutilise le sprite de Greg
    // (sprites.getChar("m", 0, true, false), même skin que le NPC dessiné
    // plus haut dans drawFullMap) plutôt qu'un nouvel asset dédié — teinté
    // blafard/verdâtre via ctx.filter (à l'opposé du violet des loups),
    // démarche titubante (légère rotation oscillante par frame) et posture
    // penchée en avant (cisaillement), bras tendus suggérés par deux
    // rectangles sombres, tache sombre semi-transparente sur le visage pour
    // l'effet "visage défoncé".
    function drawZombie(mo, now) {
      const sprites = spritesRef.current;
      const sheet = sprites.getChar("m", 0, true, false);
      const row = mo.dir === 0 ? 0 : mo.dir === 1 ? 1 : 2;
      const frame = Math.floor((mo.animT || 0) % 4);
      const px = Math.round(mo.x * T), py = Math.round(mo.y * T);
      const flip = mo.dir === 2;
      // Démarche titubante : légère oscillation d'angle, déphasée par
      // l'identité de la créature pour que plusieurs zombies ne titubent
      // pas parfaitement en phase les uns avec les autres.
      const wobble = Math.sin(now / 260 + (mo.id || 0) * 1.7) * 0.09;
      ctx.save();
      ctx.translate(px + 8, py + 8 - 4);
      ctx.rotate(wobble);
      // Cisaillement avant : posture penchée en avant façon prédateur.
      ctx.transform(1, 0, 0.22, 1, 0, 0);
      ctx.filter = "brightness(0.75) saturate(0.35) sepia(0.25) hue-rotate(70deg)";
      if (flip) { ctx.scale(-1, 1); ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, -16, -12, 16, 24); }
      else ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, -8, -12, 16, 24);
      ctx.filter = "none";
      // Bras tendus vers l'avant : deux petits rectangles sombres, léger
      // balancement inverse du bobbing de marche.
      const armSwing = Math.sin((mo.animT || 0) * 1.6) * 2;
      ctx.fillStyle = "rgba(40, 55, 40, 0.85)";
      const armDir = flip ? -1 : 1;
      ctx.fillRect(armDir * 6, -2 + armSwing, armDir * 5, 3);
      ctx.fillRect(armDir * 6, 4 - armSwing, armDir * 5, 3);
      // Tache de "visage défoncé" : marque sombre semi-transparente sur la
      // zone du visage, légèrement décalée selon le sens.
      ctx.fillStyle = "rgba(90, 10, 15, 0.45)";
      ctx.beginPath(); ctx.ellipse((flip ? -4 : 4), -8, 3.5, 2.5, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    function nightAlpha() {
      // Demande Guillaume (chantier 2026-07) : lumière du jour qui revient
      // PROGRESSIVEMENT à l'aube (5h30-6h30, fondu symétrique au coucher de
      // soleil) plutôt qu'un retour instantané au jour. L'obscurité doit
      // rester quasi totale (plafond 0.85) tout le cœur de la nuit, du pic
      // atteint vers 23h jusqu'au début de l'aube à 5h30 — seules les zones
      // éclairées par les lampadaires (halo percé plus bas) restent visibles
      // pendant ce palier. Mêmes paliers de tombée du jour qu'avant (17h-20h
      // amorce, 20h-23h approfondissement jusqu'au plafond).
      const tmin = E.gameTimeMin(sharedRef.current.dayStartAt, Date.now());
      const NIGHT_MAX = 0.85;
      const DAWN_START = C.DAWN_START_MIN, DAWN_END = C.DAWN_END_MIN;
      const DUSK_START = C.DUSK_START_MIN, DUSK_MID = C.DUSK_MID_MIN, DEEP_END = C.DEEP_END_MIN;
      if (tmin < DAWN_START) return NIGHT_MAX; // cœur de nuit, avant l'aube
      if (tmin < DAWN_END) return NIGHT_MAX * (1 - (tmin - DAWN_START) / (DAWN_END - DAWN_START)); // aube progressive
      if (tmin < DUSK_START) return 0; // plein jour
      if (tmin < DUSK_MID) return ((tmin - DUSK_START) / (DUSK_MID - DUSK_START)) * 0.3; // tombée du jour amorcée
      if (tmin < DEEP_END) return 0.3 + Math.min(1, (tmin - DUSK_MID) / (DEEP_END - DUSK_MID)) * (NIGHT_MAX - 0.3); // approfondissement
      return NIGHT_MAX; // cœur de nuit jusqu'au lendemain matin
    }
    function drawFullMap() {
      const mc = mapCanvasRef.current; if (!mc) return;
      const w = worldRef.current;
      if (minimapDirtyRef.current || !minimapImgRef.current) buildMinimapBase();
      const base = minimapImgRef.current; if (!base) return;
      const g = mc.getContext("2d"); g.imageSmoothingEnabled = false;
      // Ajuste la taille d'affichage (une fois) au ratio de la carte.
      const maxW = Math.min(window.innerWidth * 0.86, 900), scale = maxW / w.w;
      const dispW = Math.round(w.w * scale), dispH = Math.round(w.h * scale);
      if (mc.width !== dispW || mc.height !== dispH) { mc.width = dispW; mc.height = dispH; }
      g.clearRect(0, 0, dispW, dispH);
      g.drawImage(base, 0, 0, w.w, w.h, 0, 0, dispW, dispH);
      // Joueurs (moi + distants), point + nom, actualisés en direct.
      const all = [meRef.current, ...playersRef.current.values()];
      for (const p of all) {
        if (!p) continue;
        const px = p.x * scale, py = p.y * scale;
        const self = p.id === me.id;
        g.fillStyle = "#000"; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill();
        g.fillStyle = self ? "#ffffff" : "#ffe060"; g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
        g.font = "bold 10px monospace"; g.textAlign = "center";
        g.fillStyle = "#000"; g.fillText(self ? L.mapYou : p.name, px + 1, py - 6 + 1);
        g.fillStyle = self ? "#fff" : "#ffe9a8"; g.fillText(self ? L.mapYou : p.name, px, py - 6);
      }
      // Passage sombre (demande Guillaume 2026-07 : "on ne trouve pas la
      // case noire") : marqueur violet pulsant + libellé sur la carte.
      if (w.darkPassage) {
        const dpx = (w.darkPassage.x + 0.5) * scale, dpy = (w.darkPassage.y + 0.5) * scale;
        const pulse = 4 + Math.sin(performance.now() / 300) * 1.5;
        g.fillStyle = "rgba(150, 90, 220, 0.85)"; g.beginPath(); g.arc(dpx, dpy, pulse + 2, 0, 7); g.fill();
        g.fillStyle = "#e8d8ff"; g.beginPath(); g.arc(dpx, dpy, 2.5, 0, 7); g.fill();
        g.font = "bold 10px monospace"; g.textAlign = "center";
        g.fillStyle = "#000"; g.fillText(L.mapDarkPassage, dpx + 1, dpy - 9 + 1);
        g.fillStyle = "#d9c2ff"; g.fillText(L.mapDarkPassage, dpx, dpy - 9);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(sleepTimerRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, spritesReady]);

  // Throttle du prompt (évite un setState par frame)
  const promptRef = useRef(null);
  function setPromptKeyThrottled(pk) { if (promptRef.current !== pk) { promptRef.current = pk; setPromptKey(pk); } }
  const mountPromptRef = useRef(null);
  function setMountPromptThrottled(mp) { if (mountPromptRef.current !== mp) { mountPromptRef.current = mp; setMountPrompt(mp); } }

  // -------- Utilitaires partagés (hors boucle) --------
  function inMap(x, y) { const w = worldRef.current; return w && x >= 0 && y >= 0 && x < w.w && y < w.h; }
  // Équivalents "carte maléfique" de inMap/targetTile ci-dessus (chantier
  // 2026-07, demande Guillaume : pouvoir couper les arbres du monde
  // maléfique) : mêmes calculs, mais sur evilWorldRef (70x70) plutôt que
  // worldRef (ferme, 180x140) — targetTile ci-dessous serait sinon fausse en
  // zone maléfique (elle borne la caméra sur les dimensions de la ferme, pas
  // celles, bien plus petites, de la carte maléfique). Voir doActionEvil.
  function inMapEvil(x, y) { const ew = evilWorldRef.current; return ew && x >= 0 && y >= 0 && x < ew.w && y < ew.h; }
  function targetTileEvil() {
    const m = meRef.current, ew = evilWorldRef.current; if (!m || !ew) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
    let cx = (m.x + 0.5) * C.TILE - vw / 2, cy = (m.y + 0.5) * C.TILE - vh / 2;
    cx = Math.max(0, Math.min(ew.w * C.TILE - vw, cx)); cy = Math.max(0, Math.min(ew.h * C.TILE - vh, cy));
    const wx = (mouseRef.current.x / ZOOM + cx) / C.TILE, wy = (mouseRef.current.y / ZOOM + cy) / C.TILE;
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (inMapEvil(tx, ty) && Math.abs(wx - (m.x + 0.5)) <= C.ACT_RANGE + 0.5 && Math.abs(wy - (m.y + 0.2)) <= C.ACT_RANGE + 0.5) return { x: tx, y: ty };
    return facingTile();
  }
  function blocked(w, x, y) { return E.blockedTile(w, x, y, Date.now()); }
  function canStand(w, x, y) {
    const r = 0.3;
    return !blocked(w, x - r, y) && !blocked(w, x + r, y) && !blocked(w, x - r, y + 0.35) && !blocked(w, x + r, y + 0.35);
  }
  // Variante montée (chantier 2026-07, demande Guillaume : "on doit pouvoir
  // traverser la rivière à cheval") : mêmes 4 points de test que canStand,
  // mais l'eau est franchissable à la nage (voir E.blockedTileMounted). Le
  // ralentissement /4 est appliqué dans updateMe, pas ici.
  function canStandMounted(w, x, y) {
    const r = 0.3, now = Date.now();
    const bm = (xx, yy) => E.blockedTileMounted(w, xx, yy, now);
    return !bm(x - r, y) && !bm(x + r, y) && !bm(x - r, y + 0.35) && !bm(x + r, y + 0.35);
  }
  function facingTile() {
    const m = meRef.current;
    const fx = [0, 0, -1, 1][m.dir], fy = [1, -1, 0, 0][m.dir];
    return { x: Math.floor(m.x + fx), y: Math.floor(m.y + 0.2 + fy) };
  }
  function targetTile() {
    const m = meRef.current, w = worldRef.current; if (!m || !w) return { x: 0, y: 0 };
    const cam = { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
    let cx = (m.x + 0.5) * C.TILE - vw / 2, cy = (m.y + 0.5) * C.TILE - vh / 2;
    cx = Math.max(0, Math.min(w.w * C.TILE - vw, cx)); cy = Math.max(0, Math.min(w.h * C.TILE - vh, cy));
    cam.x = cx; cam.y = cy;
    const wx = (mouseRef.current.x / ZOOM + cam.x) / C.TILE, wy = (mouseRef.current.y / ZOOM + cam.y) / C.TILE;
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (inMap(tx, ty) && Math.abs(wx - (m.x + 0.5)) <= C.ACT_RANGE + 0.5 && Math.abs(wy - (m.y + 0.2)) <= C.ACT_RANGE + 0.5) return { x: tx, y: ty };
    return facingTile();
  }
  function nearTile(tl, d = 2.5) { const m = meRef.current; return m && Math.abs(m.x - tl.x) <= d && Math.abs(m.y - tl.y) <= d; }
  // ---- Zip 251 : outil main (poser/déplacer/ranger décos + lampadaires) ----
  // Case visée en Valley Town (équivalent town de targetTile, sur townWorldRef).
  function targetTileTown() {
    const m = meRef.current, tw = townWorldRef.current, canvas = canvasRef.current;
    if (!m || !tw || !canvas) return { x: 0, y: 0 };
    const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
    let cx = (m.x + 0.5) * C.TILE - vw / 2, cy = (m.y + 0.5) * C.TILE - vh / 2;
    cx = Math.max(0, Math.min(tw.w * C.TILE - vw, cx)); cy = Math.max(0, Math.min(tw.h * C.TILE - vh, cy));
    const wx = (mouseRef.current.x / ZOOM + cx) / C.TILE, wy = (mouseRef.current.y / ZOOM + cy) / C.TILE;
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (tx >= 0 && ty >= 0 && tx < tw.w && ty < tw.h && Math.abs(wx - (m.x + 0.5)) <= C.ACT_RANGE + 0.5 && Math.abs(wy - (m.y + 0.2)) <= C.ACT_RANGE + 0.5) return { x: tx, y: ty };
    return facingTile();
  }
  // Case posable pour une déco selon la zone (le client connaît sa carte).
  function farmPlaceable(x, y) { const w = worldRef.current; return inMap(x, y) && w && canStand(w, x + 0.5, y + 0.5); }
  function townPlaceable(x, y) {
    const tw = townWorldRef.current; if (!tw) return false;
    const fx = Math.floor(x), fy = Math.floor(y);
    if (fx < 0 || fy < 0 || fx >= tw.w || fy >= tw.h) return false;
    if (fx <= C.TOWN_RAIL_X + 1) return false;                       // rails / bord ouest
    const i = fy * tw.w + fx;
    if (tw.ground[i] === C.G_WATER) return false;                    // bassin de la fontaine
    if (fx >= C.TOWN_HALL.x && fx < C.TOWN_HALL.x + C.TOWN_HALL.w && fy >= C.TOWN_HALL.y && fy < C.TOWN_HALL.y + C.TOWN_HALL.h) return false;
    for (const hsn of C.TOWN_HOUSES) if (fx >= hsn.x && fx < hsn.x + C.TOWN_HOUSE_W && fy >= hsn.y && fy < hsn.y + C.TOWN_HOUSE_H) return false;
    const o = tw.objects[i];
    return !(o === C.O_TREE || o === C.O_TREE2 || o === C.O_STUMP);
  }
  function handPlaceable(zone, x, y) { return zone === "town" ? townPlaceable(x, y) : farmPlaceable(x, y); }
  // Objet le plus proche de la case visée que la main peut attraper : une déco
  // (ferme ou ville) ou, sur la ferme, un lampadaire/épouvantail sous le curseur.
  function handNearestGrab(zone, tt) {
    // Zip 259 : sur la ferme, l'outil main peut SAISIR un bâtiment d'artisan
    // construit (ruche/fromagerie/boulangerie) pour le DÉPLACER — jamais le
    // ranger au sac (il ne disparaît pas). Prioritaire quand la case visée est
    // sur (ou au bord de) l'emprise du bâtiment.
    if (zone === "farm") {
      for (const bid of Object.keys(C.ARTISAN_BUILDINGS)) {
        const cb = (sharedRef.current.crafts || {})[bid]; if (!cb || !cb.built) continue;
        const def = C.ARTISAN_BUILDINGS[bid], p = artisanPos(bid);
        if (tt.x >= p.x - 1 && tt.x <= p.x + def.w && tt.y >= p.y - 1 && tt.y <= p.y + def.h) return { kind: "artisan", bid };
      }
    }
    const decor = sharedRef.current.decor || [];
    let best = null, bestD = 1.5;
    for (const e of decor) {
      if (e.zone !== zone) continue;
      const d = Math.hypot(e.x - (tt.x + 0.5), e.y - (tt.y + 0.5));
      if (d < bestD) { bestD = d; best = { kind: "decor", did: e.did, deco: e.deco }; }
    }
    if (best) return best;
    if (zone === "farm") {
      const w = worldRef.current, o = w && w.objects[idxOf(tt.x, tt.y)];
      if (o === C.O_LAMP || o === C.O_SCARECROW) return { kind: "obj", otype: o, fromX: tt.x, fromY: tt.y };
    }
    return null;
  }
  // Clic avec l'outil main : pose une déco armée, dépose l'objet tenu, ou
  // attrape l'objet visé.
  function handAction() {
    const m = meRef.current; if (!m) return;
    const zone = m.zone === "town" ? "town" : "farm";
    const tt = zone === "town" ? targetTileTown() : targetTile();
    const armed = handModeRef.current;
    if (armed === "__lamp__" || armed === "__scarecrow__") {
      // Correctif ("lampadaire perdu après rangement au sac (R)") : un
      // lampadaire/épouvantail rangé via handStoreHeld atterrit dans
      // f.inv.lamp/scarecrow, PAS dans le sac de décorations (f.inv.decor) —
      // il ne pouvait donc jamais être réarmé depuis ce menu, seul l'outil
      // Construction (variante lamp/scarecrow) le permettait, ce qui n'était
      // pas évident pour le joueur. On réutilise ici directement l'action
      // "act" existante (resolveAct cas "lamp"/"scarecrow", même logique que
      // l'outil Construction) pour reposer l'objet depuis l'outil main.
      const iv = invRef.current, key = armed === "__lamp__" ? "lamp" : "scarecrow";
      if (!(iv && (iv[key] | 0) > 0)) { handModeRef.current = null; setHandMode(null); return; }
      if (zone !== "farm" || !handPlaceable(zone, tt.x, tt.y)) { pushToast(L.decorBadSpot); return; }
      sendReq({ kind: "act", action: key, x: tt.x, y: tt.y });
      return;
    }
    if (armed) {
      const iv = invRef.current; // ref (pas l'état React) : handAction vit dans un écouteur figé
      if (!(iv && iv.decor && (iv.decor[armed] | 0) > 0)) { handModeRef.current = null; setHandMode(null); return; }
      if (!handPlaceable(zone, tt.x, tt.y)) { pushToast(L.decorBadSpot); return; }
      sendReq({ kind: "placeDecor", deco: armed, x: tt.x + 0.5, y: tt.y + 0.5, zone });
      return;
    }
    const held = handHeldRef.current;
    if (held) {
      if (held.kind === "decor") {
        if (!handPlaceable(zone, tt.x, tt.y)) { pushToast(L.decorBadSpot); return; }
        sendReq({ kind: "moveDecor", did: held.did, x: tt.x + 0.5, y: tt.y + 0.5 });
      } else if (held.kind === "obj" && zone === "farm") {
        sendReq({ kind: "moveObj", fromX: held.fromX, fromY: held.fromY, toX: tt.x, toY: tt.y });
      } else if (held.kind === "artisan" && zone === "farm") {
        // Zip 259 : repose le bâtiment sur la case visée (nouveau coin haut-
        // gauche). L'hôte valide et met à jour crafts[bid].pos (jamais supprimé).
        if (!handPlaceable(zone, tt.x, tt.y)) { pushToast(L.decorBadSpot); return; }
        sendReq({ kind: "moveArtisan", bid: held.bid, x: tt.x, y: tt.y });
      }
      handHeldRef.current = null; setHandHeldUI(null);
      return;
    }
    const grab = handNearestGrab(zone, tt);
    if (grab) { handHeldRef.current = grab; setHandHeldUI(grab); pushToast(L.handGrabbed); }
    else pushToast(L.handNothing);
  }
  // Reprend dans le sac l'objet actuellement tenu par la main (touche R).
  function handStoreHeld() {
    const held = handHeldRef.current; if (!held) return;
    if (held.kind === "decor") sendReq({ kind: "pickDecor", did: held.did });
    else if (held.kind === "obj") sendReq({ kind: "returnObj", fromX: held.fromX, fromY: held.fromY });
    // Zip 259 : un bâtiment d'artisan tenu ne se range PAS au sac (il ne doit
    // jamais disparaître) — R annule simplement la prise, le bâtiment reste où
    // il est.
    handHeldRef.current = null; setHandHeldUI(null);
  }
  // Arme (ou désarme) une déco du sac pour la poser au prochain clic.
  function armDecor(id) {
    handHeldRef.current = null; setHandHeldUI(null);
    const nxt = handModeRef.current === id ? null : id;
    handModeRef.current = nxt; setHandMode(nxt);
  }
  // 2026-07 station update (zip 233): the NEAREST waiting visitor within
  // reach, if any. Uses live x/y, so it keeps working while they stroll.
  function visitorPromptNearby() {
    const m = meRef.current, st = sharedRef.current.station;
    if (!m || !st || !Array.isArray(st.visitors)) return null;
    if (m.zone && m.zone !== "farm") return null; // zip 234 debug fix: no visitor prompts from Valley Town / the evil map (coordinate aliasing)
    let best = null, bestD = 2.4;
    for (const v of st.visitors) {
      if (v.phase !== "wait") continue;
      const d = Math.abs(m.x - v.x) + Math.abs(m.y - v.y);
      if (d <= bestD) { bestD = d; best = v; }
    }
    return best;
  }
  // FIX 246 : Greg est-il à portée d'interaction (touche Q, comme un visiteur) ?
  function gregPromptNearby() {
    const m = meRef.current, g = sharedRef.current.greg;
    if (!m || !g) return null;
    if (m.zone && m.zone !== "farm") return null;
    return (Math.abs(m.x - g.x) + Math.abs(m.y - g.y) <= 2.4) ? g : null;
  }
  // Zip 252 : résident baladeur le plus proche à portée de dialogue (Q).
  function residentPromptNearby() {
    const m = meRef.current, st = sharedRef.current.station;
    if (!m || !st || !Array.isArray(st.residents)) return null;
    if (m.zone && m.zone !== "farm") return null;
    let best = null, bestD = 2.4;
    for (const res of st.residents) {
      if (typeof res.x !== "number") continue;
      const d = Math.abs(m.x - res.x) + Math.abs(m.y - res.y);
      if (d <= bestD) { bestD = d; best = res; }
    }
    return best;
  }
  // Zip 253 (demande Guillaume : "que les résidents avec skills que nous avons
  // apparaissent dans l'onglet employés") : liste des résidents recrutés qui
  // portent un métier (skill). Ils travaillent pour la ferme comme Greg/Soan,
  // donc on les liste au même endroit. Lue au rendu -> sharedRef frais.
  function skilledResidents() {
    const rs = (sharedRef.current.station && sharedRef.current.station.residents) || [];
    return rs.filter(r => r && C.VISITOR_ROSTER[r.rid] && C.VISITOR_ROSTER[r.rid].skill);
  }
  // Zip 253 : ligne d'état de PRODUCTION d'un résident à skill, pour la fiche Q
  // enrichie ET l'onglet Employés. Purement lecture de l'état partagé
  // (craftStock / gregStock), aucun nouveau message réseau. Renvoie "" si
  // l'atelier n'est pas encore construit (la fiche affiche alors la ligne de
  // besoin existante à la place).
  // Zip 258 : formate une durée (ms réelles) en texte court FR/EN, pour le
  // compte à rebours du retour d'Eduardo (ex. "45 min", "1 h 10").
  function fmtDuration(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return lang === "en" ? `${m} min` : `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r}` : `${h} h`;
  }
  function residentProdLine(ro) {
    const s = sharedRef.current;
    const cs = s.craftStock || {}, gs = s.gregStock || {};
    const crafts = s.crafts || {};
    if (ro.skill === "lumberjack") return L.residentProdWood(gs.wood | 0, gs.stone | 0);
    // Zip 258 : Eduardo (voyager) — pas d'atelier, statut = en voyage / au village.
    if (ro.skill === "voyager") {
      const res = skilledResidents().find(r => r.rid === ro.rid);
      if (res && res.trip && res.trip.phase === "away") return L.voyagerStatusAway(fmtDuration(res.trip.returnAt - Date.now()));
      const total = Object.values((s.station && s.station.worldStock) || {}).reduce((a, b) => a + (b | 0), 0);
      return L.voyagerProdLine(total);
    }
    const bid = C.SKILL_BUILDING[ro.skill];
    if (!bid || !(crafts[bid] && crafts[bid].built)) return "";
    if (ro.skill === "beekeeper") return L.residentProdHoney(cs.honey | 0);
    if (ro.skill === "cheesemaker") return L.residentProdCheese(cs.cheeseWheel | 0, cs.cheesePortion | 0);
    // Zip 258 : si la boulangerie est en alerte (rupture d'intrants en
    // journée), la ligne d'état devient l'alerte plutôt que le compteur.
    if (ro.skill === "baker") return (crafts[bid] && crafts[bid].alert) ? L.bakeryAlertLine : L.residentProdPastry(cs.pastry | 0);
    return "";
  }
  // Position du chaudron ramené (chantier 2026-07, demande Guillaume) : posé
  // n'importe où par un joueur, retrouvée en scannant w.objects — un seul
  // chaudron possible pour toute la ferme (voir resolveCauldronPlace côté
  // hôte), le scan reste donc négligeable (appelé seulement pour le prompt E
  // et l'interaction, jamais par tick). Renvoie null si pas encore posé.
  function findCauldronTile() {
    const w = worldRef.current; if (!w) return null;
    const c = cauldronPosRef.current;
    if (c && w.objects[c.i] === C.O_CAULDRON) return c;
    cauldronPosRef.current = null;
    for (let i = 0; i < w.objects.length; i++) if (w.objects[i] === C.O_CAULDRON) { cauldronPosRef.current = { x: E.xOf(i), y: E.yOf(i), i }; return cauldronPosRef.current; }
    return null;
  }
  // Clôture (posée librement par un joueur, OU section de l'enclos de départ,
  // désormais unifiés en un seul système d'objets, voir generateWorld) : si le
  // joueur a FORCÉ l'orientation en posant (touche R -> O_FENCE_H/O_FENCE_V),
  // cette orientation est utilisée directement ; sinon (O_FENCE, "auto"), le
  // sprite choisi dépend des sections DÉJÀ voisines (haut/bas/gauche/droite),
  // pour que les lisses se prolongent bien quelle que soit la forme dessinée.
  function fenceKindAt(w, x, y) {
    const o = w.objects[idxOf(x, y)];
    if (o === C.O_FENCE_H) return "h";
    if (o === C.O_FENCE_V) return "v";
    const isFence = (oo) => oo === C.O_FENCE || oo === C.O_FENCE_H || oo === C.O_FENCE_V;
    const has = (xx, yy) => inMap(xx, yy) && isFence(w.objects[idxOf(xx, yy)]);
    const horiz = has(x - 1, y) || has(x + 1, y), vert = has(x, y - 1) || has(x, y + 1);
    if (horiz && vert) return "corner";
    if (vert) return "v";
    if (horiz) return "h";
    return "post";
  }
  // Fermier blessé le plus proche (portée C.HEAL_RANGE), pour le soin à la
  // trousse (chantier 2026-07). Ne considère que les AUTRES joueurs : on ne
  // se soigne pas soi-même.
  function nearestInjuredPlayer() {
    const m = meRef.current; if (!m) return null;
    let best = null, bestD = C.HEAL_RANGE;
    for (const p of playersRef.current.values()) {
      if (p.injuredUntil && p.injuredUntil > Date.now()) {
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (d <= bestD) { bestD = d; best = p; }
      }
    }
    return best;
  }
  function tryOpenNearby() {
    const m0 = meRef.current;
    // Carte maléfique (chantier 2026-07, demande Guillaume) : seule
    // interaction E possible ici, le chaudron-artéfact — les coordonnées de
    // la ferme (SHOP/BIN/etc.) n'ont aucun sens en zone maléfique, on sort
    // donc tôt plutôt que de risquer une fausse coïncidence de coordonnées.
    if (m0 && m0.zone === "evil") {
      const ew = evilWorldRef.current;
      // Zip 235: passage-world pickups (breloques). Idempotent client-side
      // via pickedIdsRef so a nearby pickup isn't collected twice.
      if (ew && ew.spec && ew.spec.pickupColor && Array.isArray(ew.pickups)) {
        const picked = pickedIdsRef.current[ew.worldIdx] || {};
        for (const pk of ew.pickups) {
          if (picked[pk.id]) continue;
          if (Math.abs(m0.x + 0.5 - (pk.x + 0.5)) <= 1.2 && Math.abs(m0.y + 0.5 - (pk.y + 0.5)) <= 1.2) {
            pickedIdsRef.current = { ...pickedIdsRef.current, [ew.worldIdx]: { ...picked, [pk.id]: true } };
            sendReq({ kind: "passagePickup", worldIdx: ew.worldIdx, pickupId: pk.id });
            // Candy world: pickup also grants a 1 min speed buff to the collector.
            if (ew.spec.key === "candy") {
              speedBuffUntilRef.current = performance.now() + C.CANDY_SPEED_MS;
              pushToast(L.candySpeedToast);
            }
            return;
          }
        }
      }
      // Zip 235: maze center prize (once per world per player per week).
      if (ew && ew.maze) {
        const claimed = mazePrizeClaimedRef.current[ew.worldIdx];
        if (!claimed && Math.abs(m0.x + 0.5 - (ew.maze.prizeX + 0.5)) <= 1.5 && Math.abs(m0.y + 0.5 - (ew.maze.prizeY + 0.5)) <= 1.5) {
          mazePrizeClaimedRef.current = { ...mazePrizeClaimedRef.current, [ew.worldIdx]: true };
          sendReq({ kind: "mazePrize", worldIdx: ew.worldIdx });
          pushToast(L.mazePrizeToast(C.MAZE_PRIZE_GOLD));
          return;
        }
      }
      // Carte maléfique (chantier 2026-07, demande Guillaume) : seule
      // interaction E possible ici, le chaudron-artéfact — les coordonnées de
      // la ferme (SHOP/BIN/etc.) n'ont aucun sens en zone maléfique, on sort
      // donc tôt plutôt que de risquer une fausse coïncidence de coordonnées.
      const already = sharedRef.current.salveCraft && sharedRef.current.salveCraft.cauldronUnlocked;
      if (!already && nearTile(C.EVIL_CAULDRON_SPAWN) && ew && ew.spec && ew.spec.key === "evil") evilCauldronPickup();
      return;
    }
    // Vendre l'animal porté (outil "déplacer") est prioritaire sur toute
    // autre interaction : un joueur les mains prises ne peut de toute façon
    // rien faire d'autre tant qu'il n'a pas déposé ou vendu l'animal, comme
    // le montre déjà `selectSlot` qui relâche l'animal au changement d'outil.
    if (m0 && m0.zone === "town") {
      // Valley Town (zip 234): E at the sign rides the train home; E at a
      // house door just introduces the place (interiors deferred).
      if (nearTile(C.TOWN_STATION_SIGN)) { rideTrain(false); return; }
      const ids = Object.keys(farmersRef.current || {}).sort();
      for (let hi = 0; hi < C.TOWN_HOUSES.length; hi++) {
        const hsn = C.TOWN_HOUSES[hi];
        const doorX = hsn.x + C.TOWN_HOUSE_W / 2, doorY = hsn.y + C.TOWN_HOUSE_H + 0.5;
        if (Math.abs(m0.x + 0.5 - doorX) <= 1.6 && Math.abs(m0.y - doorY) <= 1.4) {
          const fid = ids[hi];
          // Zip 235 (Guillaume: "allow us to 'sleep' at our houses in the
          // valley town by pressing 'E'"): the owner sleeps at their own
          // door — same startSleep flow as the farm's original bedroom.
          if (fid === me.id) { startSleep(); pushToast(L.sleepInHouseToast); return; }
          if (!fid) pushToast(L.toastHouseSale);
          else pushToast(L.toastTheirHouse((farmersRef.current[fid] || {}).name || "?"));
          return;
        }
      }
      return;
    }
    // Zip 235: berry bush / fruit tree pick (spring). Checked BEFORE the
    // heavy shop/bin/nearest logic so it stays cheap when nothing is near.
    if (m0 && m0.zone === "farm") {
      const tx = Math.floor(m0.x + 0.5), ty = Math.floor(m0.y + 0.5);
      const w2 = worldRef.current;
      if (w2) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = tx + dx, yy = ty + dy;
          if (xx < 0 || yy < 0 || xx >= C.MAP_W || yy >= C.MAP_H) continue;
          const i = yy * C.MAP_W + xx;
          if (w2.objects[i] === C.O_BERRY_BUSH) { sendReq({ kind: "berryPick", x: xx, y: yy }); return; }
          if (w2.objects[i] === C.O_TREE && E.seasonOf().key === "spring" && (i * 2654435761 >>> 0) % C.FRUIT_TREE_MOD === 0) {
            sendReq({ kind: "fruitPick", x: xx, y: yy }); return;
          }
        }
      }
    }
    if (heldAnimalRef.current !== -1) {
      sendReq({ kind: "sellAnimal", animal: heldAnimalRef.current });
      heldAnimalRef.current = -1; setCarryingAnimal(false);
      return;
    }
    const injured = nearestInjuredPlayer();
    if (injured && !isInjured()) sendReq({ kind: "heal", targetId: injured.id });
    else if (nearTile(C.SHOP)) setShopOpen(true);
    else if (nearTile(C.BIN)) setBinOpen(true);
    else if (nearTile(C.STATION_SIGN)) { setAdsSel([...((sharedRef.current.station && sharedRef.current.station.ads) || [])]); setAdsOpen(true); } // 2026-07 station update
    else if (nearTile(C.TRAIN_BOARD)) rideTrain(true); // Valley Town (zip 234): board the train on the platform
    // Zip 233: the townhall 'sleep' option is REMOVED (Guillaume) - the E-at-
    // HOUSE_DOOR branch is gone; startSleep/wakeUp stay in place but dead,
    // flagged for a later cleanup zip. Visitor interaction moved to Q.
    else if (nearTile(C.COOP_SITE) && sharedRef.current.coop) sendReq({ kind: "coopDeposit" });
    else if (nearTile(C.BARN_SITE)) {
      const b = sharedRef.current.barn;
      if (!b || b.level >= C.BARN_LEVELS.length) pushToast(L.toastBarnMax);
      else if (b.ready) setBarnMini({ level: b.level + 1 });
      else sendReq({ kind: "barnDeposit" });
    }
    // (chantier 2026-07, refonte demande Guillaume) : E au chaudron a
    // maintenant trois comportements possibles selon l'état de la
    // concoction, plus jamais le vieil auto-enchaînement dépôt/lancement
    // d'avant le menu :
    // 1. Concoction terminée (brewReady) → récupération DIRECTE du produit
    //    ("le produit est récupérable directement au chaudron"), sans passer
    //    par le menu.
    // 2. Concoction en cours (brewing mais pas encore prête) → simple toast
    //    d'attente, le menu n'a rien à proposer tant que ce n'est pas fini.
    // 3. Sinon : si la recette est complète ET la torche déjà allumée, E
    //    vaut pour "cliquer sur le chaudron en tenant la torche" → allume le
    //    feu et lance la concoction directement (igniteCauldron), sans menu.
    //    Sinon (recette incomplète, ou torche éteinte), ouvre le menu
    //    "que voulez-vous concocter ?" pour déposer les ingrédients — voir
    //    cauldronMenuOpen, cauldronPlaceIngredients.
    else { const ct = findCauldronTile(); if (ct && nearTile(ct)) cauldronInteract(); }
  }

  function spawnFx(m) {
    const fx = fxRef.current, base = { x: m.x, y: m.y, t: 0 };
    switch (m.k) {
      case "water": for (let i = 0; i < 6; i++) fx.push({ ...base, kind: "p", col: "#5a9be0", vx: (Math.random() - .5) * 2, vy: -Math.random() * 2, life: .5 }); break;
      case "till": for (let i = 0; i < 6; i++) fx.push({ ...base, kind: "p", col: "#8a5c35", vx: (Math.random() - .5) * 2, vy: -Math.random() * 2.5, life: .5 }); break;
      case "chop": for (let i = 0; i < 5; i++) fx.push({ ...base, kind: "p", col: i % 2 ? "#3e8a34" : "#a87745", vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .6 }); break;
      case "mine": for (let i = 0; i < 5; i++) fx.push({ ...base, kind: "p", col: "#a2a2aa", vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .6 }); break;
      case "treedown": fx.push({ ...base, kind: "txt", txt: L.fxWood(m.wood), col: "#ffdf80", life: 1.4 }); break;
      case "rockdown": fx.push({ ...base, kind: "txt", txt: L.fxStone(C.ROCK_STONE), col: "#d0d0e0", life: 1.4 }); break;
      case "harvest": fx.push({ ...base, kind: "txt", txt: L.fxHarvest(cropName(m.crop)), col: "#a8f080", life: 1.4 }); break;
      case "sell": fx.push({ ...base, kind: "txt", txt: L.fxGold(m.gain), col: "#ffe060", life: 1.8 }); break;
      case "eat": fx.push({ ...base, kind: "txt", txt: L.fxEat, col: "#ffd0a0", life: 1 }); break;
      case "gem": {
        const gm = C.GEMS[m.gem] || C.GEMS[0];
        fx.push({ ...base, kind: "txt", txt: L.fxGem(lang === "en" ? gm.nameEn : gm.name), col: gm.color, life: 1.8 });
        for (let i = 0; i < 8; i++) fx.push({ ...base, kind: "p", col: gm.color, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3.5, life: .7 });
        break;
      }
      case "fish": {
        const fs = C.FISH[m.fish] || C.FISH[0];
        fx.push({ ...base, kind: "txt", txt: L.fxFish(lang === "en" ? fs.nameEn : fs.name), col: "#a8d4f0", life: 1.4 });
        for (let i = 0; i < 5; i++) fx.push({ ...base, kind: "p", col: "#5a9be0", vx: (Math.random() - .5) * 2, vy: -Math.random() * 2, life: .5 });
        break;
      }
      case "sea": { // 2026-07 station update: rare sea creature caught
        const sc = C.SEA_CREATURES[m.sea] || C.SEA_CREATURES[0];
        fx.push({ ...base, kind: "txt", txt: L.seaCaught(lang === "en" ? sc.nameEn : sc.name), col: sc.color, life: 2 });
        for (let i = 0; i < 8; i++) fx.push({ ...base, kind: "p", col: sc.color, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, life: .7 });
        break;
      }
      case "product": {
        const a = C.ANIMALS[m.product] || C.ANIMALS[0];
        fx.push({ ...base, kind: "txt", txt: L.fxProduct(lang === "en" ? a.prodEn : a.prod), col: "#fff0c0", life: 1.4 });
        break;
      }
      case "bridge": fx.push({ ...base, kind: "txt", txt: L.fxBridge, col: "#d9b380", life: 1.2 }); break;
      case "lever": fx.push({ ...base, kind: "txt", txt: m.closed ? L.fxLeverClosed : L.fxLeverOpen, col: m.closed ? "#e06a50" : "#8ac25a", life: 1.2 }); break;
      case "millDeposit": fx.push({ ...base, kind: "txt", txt: L.fxMillDeposit(m.n), col: "#c9a25a", life: 1.2 }); break;
      default: break;
    }
  }
  function cropName(t) { return lang === "en" ? C.CROPS[t].nameEn : C.CROPS[t].name; }

  // -------- Interactions UI --------
  // Case graines (désormais index 2) : au lieu de cycler à l'aveugle, un clic
  // ouvre/ferme un petit menu listant chaque graine (icône, nom, quantité)
  // pour choisir directement. Les autres emplacements ferment le menu s'il
  // était ouvert.
  // Case outils (index 0, simplification barre d'outils) : même principe de
  // mini-menu au clic (toolMenuOpen) — mais voir pressToolKey ci-dessous pour
  // le comportement DIFFÉRENT au clavier (touche 1 = rotation, pas ouverture
  // du menu). `noToolMenu` permet à pressToolKey de sélectionner la case 0
  // sans déclencher l'ouverture du menu.
  function selectSlot(s, noToolMenu) {
    if (s === 2) setSeedMenuOpen(o => (slotRef.current === 2 ? !o : true));
    else setSeedMenuOpen(false);
    if (s === 0 && !noToolMenu) setToolMenuOpen(o => (slotRef.current === 0 ? !o : true));
    else setToolMenuOpen(false);
    // Zip 251 : la case main (7) ouvre/ferme son menu de décorations ; en
    // quittant l'outil main on abandonne toute pose armée / objet attrapé
    // (l'attrape est purement locale, l'objet reste en place sur la carte).
    if (s === 7) setHandMenuOpen(o => (slotRef.current === 7 ? !o : true));
    else setHandMenuOpen(false);
    if (s !== 7) { handModeRef.current = null; setHandMode(null); handHeldRef.current = null; setHandHeldUI(null); }
    setCraftMenuOpen(null);
    // Changer d'outil en portant un animal l'annule (relâché sans être
    // déplacé), pour ne jamais le laisser "coincé" en main d'un joueur.
    if (s !== 6 && heldAnimalRef.current !== -1) {
      sendReq({ kind: "dropAnimal", animal: heldAnimalRef.current });
      heldAnimalRef.current = -1; setCarryingAnimal(false);
    }
    setSlot(s);
  }
  // Touche 1 (case outils) : si déjà équipée, fait tourner hoe -> axe ->
  // pick -> hoe ; sinon sélectionne simplement la case (garde le dernier
  // outil équipé), sans ouvrir le mini-menu (réservé au clic souris).
  function pressToolKey() {
    if (slotRef.current === 0) {
      setToolKind(tk => tk === "hoe" ? "axe" : tk === "axe" ? "pick" : "hoe");
    } else {
      selectSlot(0, true);
    }
  }
  function submitChat() {
    const v = chatInputRef.current?.value.trim();
    if (v) broadcastChat(meRef.current.name, v.slice(0, 120));
    if (chatInputRef.current) chatInputRef.current.value = "";
    setChatOpen(false); chatInputRef.current?.blur();
  }
  async function leaveGame() {
    // L'hôte ne quitte pas réellement le monde partagé : Ferme Vallée est
    // host-authoritative (simulation, réponse aux requêtes des autres
    // joueurs) et démontant ce composant ARRÊTERAIT le monde pour tout le
    // monde. Ce bouton, pour l'hôte, se contente donc de masquer SA vue
    // (voir `fermeAway` dans app/room/[code]/page.js, qui garde ce
    // composant monté en arrière-plan) — aucune écriture Supabase, aucun
    // évènement "leave" diffusé (le fermier hôte reste visible aux autres,
    // qui ne l'ont jamais vraiment quitté). Seul le bouton dédié "📣
    // Rassembler tout le monde" (côté salon) referme réellement la partie
    // pour tout le monde.
    // Correctif 2026-07 : l'hôte doit aussi remettre `joinedRef.current` à
    // false AVANT le retour — sinon, au démontage de cette vue (l'effet
    // réseau ci-dessus, cleanup), `joinedRef.current` étant resté `true`, un
    // broadcast "leave" est envoyé pour l'hôte lui-même, qui disparaît alors
    // à tort de la carte de tous les autres joueurs alors qu'il est censé
    // rester visible (voir le commentaire juste au-dessus).
    if (isHost) { joinedRef.current = false; onFinish && onFinish(); return; }
    joinedRef.current = false;
    channelRef.current?.send({ type: "broadcast", event: "leave", payload: { id: me.id } });
    onFinish && onFinish();
  }

  // Actions boutique/bac
  const buySeed = (t2, n) => sendReq({ kind: "buy", item: "seed", crop: t2, n });
  const buyFood = () => sendReq({ kind: "buy", item: "food" });
  const buyTool = (k) => sendReq({ kind: "buy", item: "tool", tool: k });
  const buyFence = (n) => sendReq({ kind: "buy", item: "fence", n });
  // Achat d'un lampadaire (payé en or, comme la clôture) : équipe directement
  // l'outil Construction sur la variante "lamp", prêt à poser au clic suivant
  // (même confort que craftBuild pour clôture/mur/chemin).
  const buyLamp = (n) => { sendReq({ kind: "buy", item: "lamp", n }); buildKindRef.current = "lamp"; setBuildKind("lamp"); };
  // Zip 252 : actions artisans / produits (client -> hôte).
  const askResidentStay = (rid) => { sendReq({ kind: "recruitResident", rid }); setVisitorOpen(false); };
  const buyArtisanBuilding = (bid) => sendReq({ kind: "buyArtisanBuilding", bid });
  const sellCraft = (item) => sendReq({ kind: "sellCraft", item, n: 9999 });
  const cutCheese = () => sendReq({ kind: "cutCheese", n: 1 });
  const acceptPetGift = (index) => { sendReq({ kind: "releasePetForGift", index, petId: petChoice.petId }); setPetChoice(null); };
  // Achat d'un épouvantail (payé en or, comme le lampadaire) : équipe
  // directement l'outil Construction sur la variante "scarecrow", prêt à
  // poser au clic suivant.
  const buyScarecrow = (n) => { sendReq({ kind: "buy", item: "scarecrow", n }); buildKindRef.current = "scarecrow"; setBuildKind("scarecrow"); };
  // Achat d'herbe (payée en or, comme l'épouvantail) : équipe directement
  // l'outil Construction sur la variante "grass", prêt à poser au clic
  // suivant (herbe = replanter sur une case labourée, chantier 2026-07).
  const buyGrass = (n) => { sendReq({ kind: "buy", item: "grass", n }); buildKindRef.current = "grass"; setBuildKind("grass"); };
  const buyMill = (n) => { sendReq({ kind: "buy", item: "mill", n }); buildKindRef.current = "mill"; setBuildKind("mill"); };
  const buyHealKit = (n) => sendReq({ kind: "buy", item: "healKit", n });
  // Pommade de protection (chantier 2026-07, demande Guillaume : plus
  // achetable en boutique — désormais fabriquée à un chaudron ramené du
  // monde maléfique et posé où on veut (voir O_CAULDRON/EVIL_CAULDRON_SPAWN,
  // fermeConstants.js), à partir de poissons déposés par l'équipe +
  // améthyste de la réserve commune, voir salveDeposit/salveBrew ci-dessous
  // et resolveSalveDeposit/resolveSalveBrew, fermeEngine.js).
  // Sélection de l'outil Construction en variante "cauldron" (chantier
  // 2026-07) : PAS de bouton d'achat (le chaudron ne s'obtient qu'en le
  // ramassant côté maléfique, voir evilCauldronPickup) — ce bouton
  // n'apparaît dans le menu Construire que si le fermier en porte un
  // (myInv.cauldron > 0), pour le poser/reposer où il veut.
  const selectCauldronBuild = () => { buildKindRef.current = "cauldron"; setBuildKind("cauldron"); };
  const salveDeposit = (fish) => sendReq({ kind: "salveDeposit", fish });
  const salveBrew = () => sendReq({ kind: "salveBrew" });
  // Menu du chaudron (chantier 2026-07, demande Guillaume) : état "recette
  // pommade" dérivé à chaque rendu (jamais stocké à part) à partir de
  // salveCraft (déposé) + gems (améthyste commune) + myInv (poissons
  // portés) — utilisé à la fois par le rendu du menu et par les deux
  // actions ci-dessous.
  function salveRecipeStatus() {
    const sc = sharedRef.current.salveCraft || { trout: 0, pike: 0, brewingUntil: 0 };
    const rec = C.SALVE_RECIPE;
    const gemsNow = (sharedRef.current.gems && sharedRef.current.gems[0]) || 0;
    const carryTrout = (myInv && myInv.fish && myInv.fish[1]) || 0;
    const carryPike = (myInv && myInv.fish && myInv.fish[2]) || 0;
    const brewingUntil = sc.brewingUntil || 0;
    const brewing = brewingUntil > 0;
    return {
      rec, deposited: { trout: sc.trout || 0, pike: sc.pike || 0 }, amethyst: gemsNow,
      carrying: { trout: carryTrout, pike: carryPike },
      ready: (sc.trout || 0) >= rec.trout && (sc.pike || 0) >= rec.pike && gemsNow >= rec.amethyst,
      // Correctif audit 2026-07 : "Oui" ne dépose plus que ce qui manque —
      // canPlace n'est donc vrai que si le joueur porte un poisson encore
      // utile à la recette en cours (cohérent avec resolveSalveDeposit).
      canPlace: (carryTrout > 0 && (sc.trout || 0) < rec.trout) || (carryPike > 0 && (sc.pike || 0) < rec.pike),
      // Une partie de la recette a déjà été déposée par l'équipe (mémoire
      // persistante côté hôte) : le bouton de dépôt devient "Compléter" au
      // lieu de "Oui" (demande Guillaume : "il faudra aller chercher les
      // ingrédients restants et revenir au chaudron pour Compléter").
      started: (sc.trout || 0) > 0 || (sc.pike || 0) > 0,
      brewing, brewingUntil,
      brewReady: brewing && Date.now() >= brewingUntil,
    };
  }
  // "Quand on clique sur un produit, le chaudron vérifie si on a les
  // ressources demandées pour la recette. Si oui, on peut les placer."
  // — dépose au chaudron tout poisson pertinent actuellement porté (comme
  // avant, resolveSalveDeposit accepte un dépôt même au-delà du strict
  // nécessaire, en avance pour la pommade suivante) ; refuse avec un toast
  // explicite si le joueur ne porte ni truite ni brochet à cet instant.
  // Correspond au bouton "Oui" (ou "Compléter" si déjà commencé) du menu
  // après la question "Déposer les ingrédients ?".
  function cauldronPlaceIngredients() {
    const st = salveRecipeStatus();
    if (!st.canPlace) { pushToast(L.toastNoFishToDeposit); return; }
    if (st.carrying.trout > 0 && st.deposited.trout < st.rec.trout) salveDeposit("trout");
    if (st.carrying.pike > 0 && st.deposited.pike < st.rec.pike) salveDeposit("pike");
  }
  // "Il faudra allumer le chaudron ! Les joueurs devront cliquer sur le
  // chaudron en tenant la torche pour allumer le feu et lancer la
  // concoction" (chantier 2026-07, refonte demande Guillaume) : ce n'est
  // PLUS un bouton du menu — c'est déclenché directement par un clic/E sur
  // le chaudron dans le monde, torche déjà allumée (voir tryOpenNearby).
  // Réutilise le mécanisme de torche existant (toggleTorch, bouton HUD)
  // plutôt qu'un nouvel objet dédié : ici la torche est déjà supposée
  // allumée (condition vérifiée par l'appelant), donc on se contente de
  // lancer la requête et de fermer le menu s'il était encore ouvert.
  function igniteCauldron() {
    const st = salveRecipeStatus();
    if (st.brewing) { pushToast(L.toastCauldronBrewing); return; }
    if (!st.ready) { pushToast(L.toastCauldronMissing); return; }
    if (!torchOnRef.current) { pushToast(L.toastCauldronNeedTorch); return; }
    salveBrew();
    setCauldronMenuOpen(false);
  }
  // Retrait du produit fini une fois la minuterie de concoction écoulée
  // (chantier 2026-07, demande Guillaume : "à la fin de la concoction, le
  // produit est récupérable directement au chaudron et apparaîtra dans
  // l'inventaire, il sera logiquement utilisable par tous les joueurs de la
  // session") — un simple clic/E au chaudron suffit, pas de menu.
  function salveCollect() {
    sendReq({ kind: "salveCollect" });
  }
  // Interaction unifiée au chaudron (clic souris, Espace OU touche E —
  // correctif audit 2026-07) : récupère le produit fini, signale l'attente,
  // allume si recette complète + torche allumée, sinon ouvre le menu.
  function cauldronInteract() {
    const st = salveRecipeStatus();
    if (st.brewReady) salveCollect();
    else if (st.brewing) pushToast(L.toastCauldronBrewing);
    else if (st.ready && torchOnRef.current) igniteCauldron();
    else setCauldronMenuOpen(true);
  }
  // Chaudron ramené du monde maléfique (chantier 2026-07, demande Guillaume).
  const evilCauldronPickup = () => {
    sendReq({ kind: "evilCauldronPickup" });
    // Bascule directement l'outil Construction sur "cauldron" (confort :
    // évite d'avoir à rouvrir un menu pour poser un objet qu'on ne possède
    // qu'en un seul exemplaire) — optimiste comme le reste des ramassages
    // évil (evilChop), sans conséquence si l'hôte refuse (déjà pris par
    // quelqu'un d'autre au même instant) : sélectionner l'outil sans rien
    // porter ne pose simplement rien au clic (voir resolveCauldronPlace,
    // noCauldronStock).
    selectSlot(5);
    buildKindRef.current = "cauldron"; setBuildKind("cauldron");
  };
  // Usage de la pommade (inchangé) : applique l'immunité IMMÉDIATEMENT en
  // local (ressenti instantané, comme caughtByMonster) puis envoie la
  // requête à l'hôte pour décompter le stock côté serveur (persistance/
  // diffusion). Utilisable à tout moment, pas de contrainte de proximité.
  const useSalve = () => {
    if (!myInv || !((myInv.salve || 0) > 0)) { pushToast(L.toastNoSalve); return; }
    const until = Date.now() + C.SALVE_IMMUNITY_MS;
    immunityUntilRef.current = until; setImmunityUntil(until);
    sendReq({ kind: "useSalve" });
    pushToast(L.salveUsedToast);
  };
  const sellFlour = () => sendReq({ kind: "sell", item: "flour", n: 9999 });
  const sellItem = (item, crop) => sendReq({ kind: "sell", item, crop, n: 9999 });
  // Menu Construire (clic sur bois/pierre du HUD) : fabrique `n` sections de
  // `item` (fence/wall/path) depuis le bois/la pierre récoltés, puis équipe
  // directement l'outil Construction (case 8) sur cette variante, prêt à
  // poser au prochain clic sur une case.
  function craftBuild(item, n) {
    sendReq({ kind: "craft", item, n });
    buildKindRef.current = item; setBuildKind(item);
    selectSlot(5);
    setCraftMenuOpen(null);
  }
  // Équiper le pont (chantier 2026-07) : contrairement à craftBuild, aucune
  // fabrication de section au préalable — le coût (BRIDGE_COST_WOOD ou
  // BRIDGE_COST_STONE) est prélevé directement à la pose de chaque case, sur
  // un site de chantier (voir resolveAct cas "bridge"). Cette fonction se
  // contente d'équiper l'outil Construction sur la bonne variante.
  function equipBridge(mat) {
    buildKindRef.current = mat === "stone" ? "bridgeStone" : "bridgeWood";
    setBuildKind(mat === "stone" ? "bridgeStone" : "bridgeWood");
    selectSlot(5);
    setCraftMenuOpen(null);
  }
  // Équiper la rénovation en pierre (chantier 2026-07, demande Guillaume) :
  // même principe qu'equipBridge (aucune fabrication préalable, coût prélevé
  // à la pose, voir resolveAct cas "renovateBridge"), mais cible une case de
  // pont BOIS déjà construite plutôt qu'un chantier G_BRIDGE_SITE.
  function equipBridgeRenovate() {
    buildKindRef.current = "bridgeRenovate";
    setBuildKind("bridgeRenovate");
    selectSlot(5);
    setCraftMenuOpen(null);
  }
  const sellFish = (fishId) => sendReq({ kind: "sell", item: "fish", fish: fishId, n: 9999 });
  const sellSea = (seaId) => sendReq({ kind: "sell", item: "sea", sea: seaId, n: 9999 }); // 2026-07 station update
  // Zip 235: berries/fruit (spring gathering).
  const sellBerry = () => sendReq({ kind: "sell", item: "berry", n: 9999 });
  const sellFruit = () => sendReq({ kind: "sell", item: "fruit", n: 9999 });
  const sellCommonFish = (fishId) => sendReq({ kind: "sell", item: "commonFish", fish: fishId, n: 9999 });
  const sellCommonAnimal = (pid) => sendReq({ kind: "sell", item: "commonAnimal", product: pid, n: 9999 }); // zip 260
  const sellGem = (gemId) => sendReq({ kind: "sell", item: "gem", gem: gemId, n: 9999 });

  // -------- Rendu React (UI par-dessus le canvas) --------
  const TOOL_NAMES = lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES;
  const slots = [
    { key: "tools", icon: toolKind }, { key: "can", icon: "can" },
    { key: "seeds", icon: "seeds" }, { key: "food", icon: "food" },
    { key: "rod", icon: "rod" }, { key: "fence", icon: "fence" }, { key: "herd", icon: "herd" },
    { key: "hand", icon: "hand" }, // zip 251 : outil main (poser/déplacer/ranger objets)
  ];
  const clockStr = (() => { const h = Math.floor(hud.timeMin / 60) % 24, mn = hud.timeMin % 60; return `${h}h${String(mn).padStart(2, "0")}`; })();

  // Écran de code de ferme (hôte uniquement) : choisit quelle ferme durable ouvrir.
  if (phase === "code") {
    return wrap(
      <div className="ferme-root">
        <div className="ferme-join-screen">
          <div className="ferme-join-box panel">
            <h1>{L.codeTitle}</h1>
            <div className="ferme-join-sub">{L.codePrompt}</div>
            <input className="ferme-name-input" maxLength={24} value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(""); }}
              onKeyDown={e => { if (e.key === "Enter") loadFarmByCode(codeInput); }}
              placeholder={L.codePlaceholder} autoFocus />
            <button className="ferme-btn ferme-join-btn" disabled={codeLoading} onClick={() => loadFarmByCode(codeInput)}>{codeLoading ? L.codeLoading : L.codeLoad}</button>
            <div className="ferme-join-err">{codeError}</div>
          </div>
        </div>
      </div>
    );
  }

  // Sélection de personnage
  if (phase === "select") {
    return wrap(
      <div className="ferme-root">
        <div className="ferme-join-screen">
          <div className="ferme-join-box panel">
            <h1>{L.csTitle}</h1>
            <div className="ferme-join-sub">{L.csSub}</div>
            <input className="ferme-name-input" maxLength={14} value={nameVal} onChange={e => setNameVal(e.target.value)} placeholder={L.namePlaceholder} autoFocus />
            <div className="ferme-char-pick">
              <div className={"ferme-char-card" + (gender === "m" ? " sel" : "")} onClick={() => setGender("m")}>
                <Sprite img={spritesReady ? spritesRef.current.getChar("m", myOutfit) : null} sx={16} sy={24} w={48} h={72} />
                <div>{L.fermier}</div>
              </div>
              <div className={"ferme-char-card" + (gender === "f" ? " sel" : "")} onClick={() => setGender("f")}>
                <Sprite img={spritesReady ? spritesRef.current.getChar("f", myOutfit) : null} sx={16} sy={24} w={48} h={72} />
                <div>{L.fermiere}</div>
              </div>
            </div>
            <button className="ferme-btn ferme-join-btn" disabled={!worldReady} onClick={doJoin}>{L.joinBtn}</button>
            {/* Correctif audit lancement 2026-07 : tant que l'hôte n'a pas
                chargé de ferme (réponse `nofarm` à nos hello), message
                d'attente explicite au lieu d'un "Connexion…" sans fin. */}
            <div className="ferme-join-err">{!worldReady ? (hostPreparing ? L.waitWorld : L.connecting) : ""}</div>
          </div>
        </div>
      </div>
    );
  }

  return wrap(
    <div className="ferme-root">
      <canvas id="ferme-game" ref={canvasRef} className="ferme-canvas" />

      {/* HUD */}
      <div className="ferme-hud panel">
        <div className="row"><Sprite img={spritesReady ? spritesRef.current.icons.gold : null} w={18} h={18} /> <span>{hud.money}</span> <span className="ferme-hud-sub">{L.goldCommon}</span></div>
        <div className="row">📅 {L.day} {hud.day} &nbsp; {(() => { const se = E.seasonOf(hud.day || 1); const nm = { spring: L.seasonSpring, summer: L.seasonSummer, autumn: L.seasonAutumn, winter: L.seasonWinter }[se.key]; return se.emoji + " " + nm; })()} &nbsp; 🕐 {clockStr}</div>
        <div className="row ferme-hud-players">👥 {L.playersOnline(hud.players)}</div>
        <div className="row ferme-hud-barn">🛖 {L.barnHudLine(barn ? barn.level : 0, C.BARN_LEVELS.length, E.barnAnimalCap(barn ? barn.level : 0))}</div>
        <div className="row ferme-hud-res" title={L.woodResTip} onClick={() => setCraftMenuOpen(o => o === "wood" ? null : "wood")}>
          <Sprite img={spritesReady ? spritesRef.current.icons.wood : null} w={16} h={16} /> <span>{myInv ? myInv.wood : 0}</span>
        </div>
        <div className="row ferme-hud-res" title={L.stoneResTip} onClick={() => setCraftMenuOpen(o => o === "stone" ? null : "stone")}>
          <Sprite img={spritesReady ? spritesRef.current.icons.stone : null} w={16} h={16} /> <span>{myInv ? myInv.stone : 0}</span>
        </div>
        <div className="row ferme-hud-res" title={L.gemsResTip} onClick={() => setCraftMenuOpen(o => o === "gems" ? null : "gems")}>
          <Sprite img={spritesReady ? spritesRef.current.gemIcons[2] : null} w={16} h={16} /> <span>{gems ? gems.reduce((a, b) => a + b, 0) : 0}</span>
        </div>
        <div className="row ferme-hud-res" title={L.flourResTip} onClick={() => setCraftMenuOpen(o => o === "flour" ? null : "flour")}>
          <Sprite img={spritesReady ? spritesRef.current.icons.flour : null} w={16} h={16} /> <span>{flour || 0}</span>
        </div>
      </div>

      {/* Énergie */}
      <div className="ferme-energy-wrap panel"><div className="ferme-energy-bar" style={{ height: Math.max(0, (myEnergy / C.MAX_ENERGY) * 100) + "%" }} /></div>

      {/* Sifflet à chevaux (chantier 2026-07, demande Guillaume) : bouton
          dédié à gauche de l'écran, icône cheval. Rappelle tous les chevaux
          libres de la ferme, qui reviennent en courant vers qui a sifflé. */}
      <button className="ferme-whistle-btn" title={L.whistleTip} onClick={whistleHorses}>
        <Sprite img={spritesReady ? spritesRef.current.horse : null} w={36} h={30} />
      </button>
      <button className={"ferme-torch-btn" + (torchOn ? " lit" : "")} title={torchOn ? L.torchTipOn : L.torchTipOff} onClick={toggleTorch}>
        <Sprite img={spritesReady ? spritesRef.current.torch : null} w={22} h={30} />
      </button>

      {/* Ordre Greg armé (chantier 2026-07 v2) : le joueur a choisi
          culture+nombre à la boutique, il se déplace maintenant librement
          puis confirme ici — Greg travaillera autour de CETTE position. */}
      {gregOrderPending && (
        <div className="ferme-greg-order-wrap">
          <button className="ferme-greg-order-fab" onClick={fireGregOrder}>{L.gregOrderFab}</button>
          <button className="ferme-greg-order-cancel" title={L.gregOrderCancel} onClick={cancelGregOrder}>✕</button>
        </div>
      )}
      {fertilizerOrderPending && (
        <div className="ferme-greg-order-wrap">
          <button className="ferme-greg-order-fab" onClick={fireFertilizerOrder}>{L.gregOrderFab}</button>
          <button className="ferme-greg-order-cancel" title={L.gregOrderCancel} onClick={cancelFertilizerOrder}>✕</button>
        </div>
      )}

      {/* Boutons flottants (nouveautés incluses) */}
      <div className="ferme-actions">
        <button className="ferme-btn" onClick={teleportHome}>{L.btnHome}</button>
        {buildings.wellBuilt && <button className="ferme-btn" onClick={teleportWell}>{L.btnWell}</button>}
        <button className="ferme-btn" onClick={() => setMapOpen(true)}>{L.btnMap}</button>
        {(sharedRef.current.greg || sharedRef.current.soan || skilledResidents().length > 0 || ((sharedRef.current.station && sharedRef.current.station.residents) || []).length > 0) && (
          <button className="ferme-btn" onClick={() => setEmployeesOpen(true)}>{L.btnEmployees}</button>
        )}
        <button className="ferme-btn ferme-btn-ghost" onClick={changeCharacter}>{L.btnChangeChar}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={leaveGame}>{L.btnLeave}</button>
      </div>

      {/* Invite proximité */}
      {promptKey && <div className="ferme-prompt">{promptKey === "sellAnimal" ? L.promptSellAnimal(Math.round(((C.ANIMALS[(sharedRef.current.animals[heldAnimalRef.current] || {}).type] || {}).cost || 0) / 3)) : promptKey === "station" ? L.promptStation : promptKey === "trainRide" ? L.promptTrainRide : promptKey === "trainBack" ? L.promptTrainBack : promptKey === "townHouseSale" ? L.promptTownHouseSale : promptKey.startsWith("townHouse:") ? L.promptTownHouse(promptKey.slice(10)) : promptKey.startsWith("visitor:") ? L.promptVisitor((C.VISITOR_ROSTER[+promptKey.slice(8)] || {}).name || "?") : promptKey === "shop" ? L.promptShop : promptKey === "coop" ? L.promptCoop : promptKey === "barn" ? L.promptBarn : promptKey === "barnBuild" ? L.promptBarnBuild : promptKey === "cauldron" ? L.promptCauldron : promptKey === "cauldronIgnite" ? L.promptCauldronIgnite : promptKey === "cauldronBrewing" ? L.promptCauldronBrewing(brewSecs) : promptKey === "cauldronCollect" ? L.promptCauldronCollect : promptKey === "evilCauldronPickup" ? L.promptEvilCauldronPickup : L.promptBin}</div>}
      {mountPrompt && <div className="ferme-prompt ferme-prompt-mount">{mountPrompt === "mount" ? L.mountPrompt : L.dismountPrompt}</div>}
      {handHeldUI && <div className="ferme-prompt ferme-prompt-mount">{L.handHeldHint}</div>}

      {/* Barre d'outils */}
      <div className="ferme-toolbar panel">
        {slots.map((s, i) => {
          const isSeed = s.key === "seeds", isFood = s.key === "food", isRod = s.key === "rod", isFence = s.key === "fence", isHerd = s.key === "herd", isTools = s.key === "tools", isHand = s.key === "hand";
          let count = "", lvl = "", img = spritesReady ? spritesRef.current.icons[s.icon] : null;
          if (isSeed) { count = myInv ? myInv.seeds[seedSel] : ""; img = spritesReady ? spritesRef.current.crops[seedSel][C.CROP_STAGES - 1] : null; }
          else if (isFood) count = myInv ? myInv.food : "";
          else if (isRod) { /* pas de niveau ni de compteur */ }
          else if (isTools) lvl = "N" + (myTools[toolKind] || 1);
          else if (isFence) {
            // Outil "Construction" générique (chantier 2026-07) : icône,
            // compteur et infobulle dépendent de la variante choisie via le
            // menu Construire/Vendre (fence/wall/path/lamp/scarecrow), pas
            // seulement clôture.
            const bkImg = buildKind === "wall" ? "wall" : buildKind === "path" ? "path" : buildKind === "lamp" ? "lamp" : buildKind === "scarecrow" ? "scarecrow"
              : buildKind === "grass" ? "grassPatch" : buildKind === "mill" ? "mill" : buildKind === "cauldron" ? null
              : buildKind === "bridgeWood" ? "bridge" : (buildKind === "bridgeStone" || buildKind === "bridgeRenovate") ? "bridgeStoneSprite" : "fence";
            // Pour le pont, pas de stock dédié (voir craft menu) : le compteur
            // affiche directement le bois/la pierre disponible pour la
            // variante choisie, cohérent avec le coût prélevé à la pose.
            // Chaudron (chantier 2026-07) : pas de sprite dédié pour
            // l'instant (emoji ⚗️ affiché à la place de l'icône, voir
            // ci-dessous) — non fait/limite connue, à ajouter si besoin.
            count = myInv ? (buildKind === "wall" ? (myInv.wall || 0) : buildKind === "path" ? (myInv.path || 0) : buildKind === "lamp" ? (myInv.lamp || 0) : buildKind === "scarecrow" ? (myInv.scarecrow || 0)
              : buildKind === "grass" ? (myInv.grass || 0) : buildKind === "mill" ? (myInv.mill || 0) : buildKind === "cauldron" ? (myInv.cauldron || 0)
              : buildKind === "bridgeWood" ? (myInv.wood || 0) : (buildKind === "bridgeStone" || buildKind === "bridgeRenovate") ? (myInv.stone || 0) : (myInv.fence || 0)) : "";
            img = spritesReady && bkImg ? spritesRef.current[bkImg] : null;
            lvl = buildKind === "fence" ? (fenceDir === "h" ? "↔" : fenceDir === "v" ? "↕" : "R") : buildKind === "cauldron" ? "⚗️" : "";
          }
          else if (isHerd) { if (carryingAnimal) lvl = "●"; }
          else if (isHand) { const dn = (myInv && myInv.decor ? Object.values(myInv.decor).reduce((a, b) => a + (b | 0), 0) : 0) + (myInv ? (myInv.lamp | 0) + (myInv.scarecrow | 0) : 0); count = dn || ""; if (handHeldUI || handMode) lvl = "●"; }
          else lvl = "N" + (myTools[s.key] || 1);
          const title = isSeed ? L.seedTip(seedName(seedSel)) : isFood ? L.foodTip(C.FOOD_ENERGY) : isRod ? L.rodTip
            : isFence ? (buildKind === "wall" ? L.wallTip : buildKind === "path" ? L.pathTip : buildKind === "lamp" ? L.lampTip : buildKind === "scarecrow" ? L.scarecrowTip
              : buildKind === "grass" ? L.grassTip : buildKind === "mill" ? L.millTip : buildKind === "cauldron" ? L.cauldronRowSub
              : buildKind === "bridgeRenovate" ? L.bridgeRenovateTip
              : (buildKind === "bridgeWood" || buildKind === "bridgeStone") ? L.bridgeTip : L.fenceTip)
            : isHerd ? L.herdTip : isHand ? L.handTip : isTools ? L.toolsTip(TOOL_NAMES[toolKind]) : TOOL_NAMES[s.key];
          return (
            <div key={s.key} className={"ferme-slot" + (i === slot ? " sel" : "")} onClick={() => selectSlot(i)} title={title}>
              <span className="ferme-slot-key">{i + 1}</span>
              <Sprite img={img} w={32} h={32} />
              {count !== "" && <span className="ferme-slot-count">{count}</span>}
              {lvl && <span className="ferme-slot-lvl">{lvl}</span>}
            </div>
          );
        })}
        {/* Zip 236: personal bag button (bag icon). Opens the individual
            inventory: pets, immunity salve, bandaids, energy/sleep hint. This
            is separate from the selling stall, which holds the COMMUNAL loot
            (crops/fish/gems/gold). */}
        <div className="ferme-slot ferme-slot-bag" onClick={() => setBagOpen(true)} title={L.bagBtn}>
          <Sprite img={spritesReady ? spritesRef.current.icons.bag : null} w={32} h={32} />
          {myPets.length > 0 && <span className="ferme-slot-count">{myPets.length}</span>}
        </div>
      </div>

      {/* Mini-menu de choix de graine (clic sur la case graines) : liste
          cliquable avec icône, nom et quantité, plutôt qu'un cycle à l'aveugle. */}
      {seedMenuOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setSeedMenuOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.seedMenuTitle}</div>
            {C.CROPS.filter(cr => !cr.unique || (myInv && myInv.seeds && myInv.seeds[cr.id] > 0)).map(cr => (
              <div key={cr.id} className={"ferme-seed-menu-row" + (cr.id === seedSel ? " sel" : "")}
                onClick={() => { setSeedSel(cr.id); setSeedMenuOpen(false); }}>
                <Sprite img={spritesReady ? spritesRef.current.crops[cr.id][C.CROP_STAGES - 1] : null} w={26} h={26} />
                <span className="name">{seedName(cr.id)}</span>
                <span className="count">× {myInv ? myInv.seeds[cr.id] : 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zip 251 : menu de l'outil main — décorations posables + aide au déplacement. */}
      {handMenuOpen && slot === 7 && (
        <div className="ferme-seed-menu-ov" onClick={() => setHandMenuOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.handMenuTitle}</div>
            {(() => {
              const owned = C.UNIQUE_DECORATIONS.filter(d => myInv && myInv.decor && (myInv.decor[d.id] | 0) > 0);
              // Correctif : un lampadaire/épouvantail rangé au sac (R) vit
              // dans myInv.lamp/scarecrow, pas myInv.decor — sans ces deux
              // entrées, il n'apparaissait nulle part dans ce menu et restait
              // introuvable pour le joueur une fois rangé.
              const lampN = myInv ? (myInv.lamp | 0) : 0;
              const scarecrowN = myInv ? (myInv.scarecrow | 0) : 0;
              if (!owned.length && !lampN && !scarecrowN) return <div className="ferme-seed-menu-row" style={{ opacity: .7, cursor: "default" }}><span className="name">{L.handMenuEmpty}</span></div>;
              return [
                lampN > 0 && (
                  <div key="__lamp__" className={"ferme-seed-menu-row" + (handMode === "__lamp__" ? " sel" : "")}
                    onClick={() => { armDecor("__lamp__"); setHandMenuOpen(false); }}>
                    <Sprite img={spritesReady ? spritesRef.current.lamp : null} w={26} h={26} />
                    <span className="name">{L.lampRowTitle(C.LAMP_COST).replace(/ :.*/, "")}</span>
                    <span className="count">× {lampN}</span>
                  </div>
                ),
                scarecrowN > 0 && (
                  <div key="__scarecrow__" className={"ferme-seed-menu-row" + (handMode === "__scarecrow__" ? " sel" : "")}
                    onClick={() => { armDecor("__scarecrow__"); setHandMenuOpen(false); }}>
                    <Sprite img={spritesReady ? spritesRef.current.scarecrow : null} w={26} h={26} />
                    <span className="name">{L.scarecrowRowTitle(C.SCARECROW_COST).replace(/ :.*/, "")}</span>
                    <span className="count">× {scarecrowN}</span>
                  </div>
                ),
                ...owned.map(d => (
                  <div key={d.id} className={"ferme-seed-menu-row" + (d.id === handMode ? " sel" : "")}
                    onClick={() => { armDecor(d.id); setHandMenuOpen(false); }}>
                    <Sprite img={spritesReady ? spritesRef.current.decor[d.id] : null} w={26} h={26} />
                    <span className="name">{lang === "en" ? d.nameEn : d.name}</span>
                    <span className="count">× {myInv ? (myInv.decor[d.id] | 0) : 0}</span>
                  </div>
                )),
              ];
            })()}
            <div className="ferme-seed-menu-row" style={{ opacity: .75, fontSize: 11, cursor: "default" }} onClick={e => e.stopPropagation()}>
              <span className="name">{L.handMoveHint}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini-menu de choix d'outil (clic sur la case outils) : liste
          cliquable houe/hache/pioche, même principe que le menu graines.
          La touche 1 (clavier), elle, fait tourner les outils sans passer
          par ce menu (voir pressToolKey). */}
      {toolMenuOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setToolMenuOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.toolMenuTitle}</div>
            {C.TOOLS.filter(k => k !== "can").map(k => (
              <div key={k} className={"ferme-seed-menu-row" + (k === toolKind ? " sel" : "")}
                onClick={() => { setToolKind(k); setToolMenuOpen(false); }}>
                <Sprite img={spritesReady ? spritesRef.current.icons[k] : null} w={26} h={26} />
                <span className="name">{TOOL_NAMES[k]}</span>
                <span className="count">N{myTools[k] || 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Construire/Vendre (clic sur bois ou pierre du HUD) : choisir de
          fabriquer des sections de construction (clôture/mur/chemin) depuis
          la ressource récoltée, ou de tout vendre au bac (chantier 2026-07). */}
      {gregOrderOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setGregOrderOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.gregOrderTitle}</div>
            {C.CROPS.filter(cr => !cr.unique).map(cr => (
              <div key={cr.id} className={"ferme-seed-menu-row" + (cr.id === gregOrderCrop ? " sel" : "")}
                onClick={() => setGregOrderCrop(cr.id)}>
                <Sprite img={spritesReady ? spritesRef.current.crops[cr.id][C.CROP_STAGES - 1] : null} w={26} h={26} />
                <span className="name">{seedName(cr.id)}</span>
                <span className="count">{L.perPiece(cr.seedCost)}</span>
              </div>
            ))}
            <div className="ferme-shop-row">
              <div className="info"><b>{L.gregOrderCountLabel}</b></div>
              <input type="number" min={1} max={C.GREG_ORDER_MAX} value={gregOrderCount}
                onChange={e => setGregOrderCount(Math.max(1, Math.min(C.GREG_ORDER_MAX, parseInt(e.target.value) || 1)))}
                style={{ width: 60 }} />
            </div>
            <div className="ferme-shop-row">
              <div className="info"><span>{L.gregOrderCost(C.CROPS[gregOrderCrop].seedCost * gregOrderCount)}</span></div>
              <button disabled={hud.money < C.CROPS[gregOrderCrop].seedCost * gregOrderCount} onClick={armGregOrder}>{L.gregOrderArmBtn}</button>
            </div>
            <div className="ferme-seed-menu-hint">{L.gregOrderHint}</div>
          </div>
        </div>
      )}

      {fertilizerOrderOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setFertilizerOrderOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.fertilizerOrderTitle}</div>
            <div className="ferme-shop-row">
              <div className="info"><span>{L.fertilizerOrderAvailable(gregStock.fertilizer || 0)}</span></div>
            </div>
            <div className="ferme-shop-row">
              <div className="info"><span>{L.fertilizerOrderCost}</span></div>
              <button disabled={(gregStock.fertilizer || 0) <= 0} onClick={armFertilizerOrder}>{L.fertilizerOrderArmBtn}</button>
            </div>
            <div className="ferme-seed-menu-hint">{L.fertilizerOrderHint}</div>
          </div>
        </div>
      )}

      {/* Menu "Employés actifs" (chantier 2026-07, demande Guillaume) : liste
          les employés RÉELLEMENT sous contrat (le bouton qui ouvre ce
          panneau est lui-même masqué si personne n'est engagé, voir plus
          haut), avec leur nom et le temps de contrat restant, et donne un
          accès direct aux mêmes commandes que la boutique — pas de nouvelle
          logique de jeu, juste un raccourci pour ne pas rouvrir toute la
          boutique à chaque ordre. Se ferme automatiquement s'il ne reste
          plus aucun employé actif (fin de contrat pendant que le panneau
          est ouvert), pour ne jamais rester affiché sur une liste vide. */}
      {employeesOpen && (sharedRef.current.greg || sharedRef.current.soan || sharedRef.current.harald || skilledResidents().length > 0 || ((sharedRef.current.station && sharedRef.current.station.residents) || []).length > 0) && (
        <div className="ferme-modal open" onClick={() => setEmployeesOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setEmployeesOpen(false)}>✕</button>
            <h2>{L.employeesTitle}</h2>
            <div className="ferme-hint">{L.employeesHint}</div>
            {/* Zip 253 : résidents à skill (René/Ingrid/Tristan/Chloé…) listés
                comme employés de la ferme, avec leur métier et l'état de leur
                production. Clic -> ouvre leur fiche de dialogue (même carte que
                la touche Q). */}
            {skilledResidents().map(res => {
              const ro = C.VISITOR_ROSTER[res.rid]; if (!ro) return null;
              const prod = residentProdLine(ro);
              // Zip 258 : Eduardo (voyager) a des boutons dédiés (commander un
              // voyage / revendre), au lieu du simple "Voir". Alerte pâtissière :
              // la ligne d'état passe en rouge quand le four est en rupture.
              const isVoyager = ro.skill === "voyager";
              const away = isVoyager && res.trip && res.trip.phase === "away";
              const bakerAlert = ro.skill === "baker" && (sharedRef.current.crafts || {}).bakery && sharedRef.current.crafts.bakery.alert;
              const worldTotal = Object.values((sharedRef.current.station && sharedRef.current.station.worldStock) || {}).reduce((a, b) => a + (b | 0), 0);
              return (
                <div className="ferme-shop-row" key={"emp-res-" + res.rid}>
                  <Sprite img={spritesReady ? spritesRef.current.getChar(ro.gender, ro.outfit, ro.overalls, ro.cap) : null} w={26} h={32} />
                  <div className="info">
                    <b>{ro.name} {bakerAlert ? "⚠️" : ""}</b>
                    <span className="ferme-usage" style={bakerAlert ? { color: "#c0392b", fontWeight: 700 } : undefined}>{prod || L.residentTag(ro.job)}</span>
                  </div>
                  {isVoyager ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <button disabled={away} onClick={() => { setVoyagerDraft({}); setVoyagerOrderOpen(true); }}>{L.voyagerOrderBtn}</button>
                      {worldTotal > 0 && <button onClick={() => setVoyagerSellOpen(true)}>{L.voyagerSellBtn}</button>}
                    </div>
                  ) : (
                    <button onClick={() => { setEmployeesOpen(false); setResidentCard(res.rid); }}>{L.residentSeeBtn}</button>
                  )}
                </div>
              );
            })}
            {sharedRef.current.greg && (
              <div className="ferme-shop-row">
                <Sprite img={spritesReady ? spritesRef.current.getChar("m", 0) : null} w={26} h={32} />
                <div className="info">
                  <b>{L.employeesGregName}</b>
                  <span className="ferme-usage">{L.gregHiredUntil(Math.max(0, Math.ceil((sharedRef.current.greg.expiresAt - Date.now()) / 3600000)))}</span>
                </div>
                <button onClick={() => { setEmployeesOpen(false); setGregOrderOpen(true); }}>{L.gregOrderBtn}</button>
                {(gregStock.fertilizer || 0) > 0 && (
                  <button onClick={() => { setEmployeesOpen(false); setFertilizerOrderOpen(true); }}>{L.fertilizerOrderBtn}</button>
                )}
              </div>
            )}
            {sharedRef.current.soan && (
              <div className="ferme-shop-row">
                <Sprite img={spritesReady ? spritesRef.current.getChar("m", 1) : null} w={26} h={32} />
                <div className="info">
                  <b>{L.employeesSoanName}</b>
                  <span className="ferme-usage">
                    {L.soanHiredUntil(Math.max(0, Math.ceil((sharedRef.current.soan.expiresAt - Date.now()) / 3600000)))} — {
                      sharedRef.current.soan.phase === "fishing" ? L.soanStatusFishing
                        : sharedRef.current.soan.phase === "break" ? L.soanStatusBreak
                        : sharedRef.current.soan.phase === "toRiver" ? L.soanStatusToRiver : L.soanStatusRoam}
                  </span>
                </div>
                {sharedRef.current.soan.phase === "roam"
                  ? <button onClick={soanOrder}>{L.soanOrderBtn}</button>
                  : <button onClick={soanRecall}>{L.soanRecallBtn}</button>}
              </div>
            )}
            {sharedRef.current.harald && (
              <div className="ferme-shop-row">
                <Sprite img={spritesReady ? spritesRef.current.getChar("m", 6) : null} w={26} h={32} />
                <div className="info">
                  <b>{L.employeesHaraldName}</b>
                  <span className="ferme-usage">{L.haraldHiredUntil(Math.max(0, Math.ceil((sharedRef.current.harald.expiresAt - Date.now()) / 3600000)))} — {L.haraldStatusRounds}</span>
                </div>
              </div>
            )}
            {/* Zip 259 : TOUS nos résidents (skill ou non) avec un bouton de
                vote d'exclusion. En multi il faut l'unanimité des joueurs en
                ligne (le compteur affiche l'avancée) ; en solo c'est immédiat.
                L'exclusion libère la maison ; l'ex-résident reviendra supplier. */}
            {(stationSt && (stationSt.residents || []).length > 0) && (
              <>
                <div className="ferme-hint" style={{ marginTop: 10 }}>{L.residentsSectionTitle}</div>
                {(stationSt.residents || []).map(res => {
                  const ro = C.VISITOR_ROSTER[res.rid]; if (!ro) return null;
                  const votes = ((stationSt.kickVotes || {})[res.rid]) || {};
                  const nv = Object.keys(votes).length;
                  const online = Math.max(1, (hud.players | 0) || Object.keys(farmersRef.current || {}).length || 1);
                  const away = res.trip && res.trip.phase === "away";
                  return (
                    <div className="ferme-shop-row" key={"kick-" + res.rid}>
                      <Sprite img={spritesReady ? spritesRef.current.getChar(ro.gender, ro.outfit, ro.overalls, ro.cap) : null} w={26} h={32} />
                      <div className="info">
                        <b>{ro.name}</b>
                        <span className="ferme-usage">{away ? L.voyagerStatusAway(fmtDuration(res.trip.returnAt - Date.now())) : L.residentTag(ro.job)}</span>
                      </div>
                      <button onClick={() => sendReq({ kind: "kickResident", rid: res.rid })}>{nv > 0 ? L.kickTally(nv, online) : L.kickBtn}</button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}



      {/* Zip 258 : commande de voyage à Eduardo (produits du monde). */}
      {voyagerOrderOpen && (
        <div className="ferme-modal open" onClick={() => setVoyagerOrderOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setVoyagerOrderOpen(false)}>✕</button>
            <h2>{L.voyagerOrderTitle}</h2>
            <div className="ferme-hint">{L.voyagerOrderHint}</div>
            {C.WORLD_GOODS.map(g => {
              const qty = voyagerDraft[g.key] | 0;
              const unit = C.worldGoodUnitCost(g);
              const days = (C.VOYAGE_TIERS[g.tier] || C.VOYAGE_TIERS.proche).days;
              return (
                <div className="ferme-shop-row" key={"vg-" + g.key}>
                  <div className="info">
                    <b>{g.emoji} {lang === "en" ? g.nameEn : g.name}</b>
                    <span className="ferme-usage">{L.voyagerUnitCost(unit)} · {L.voyagerTripDays(days)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setDraftQty(g.key, qty - 1)} disabled={qty <= 0}>−</button>
                    <span style={{ minWidth: 22, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => setDraftQty(g.key, qty + 1)} disabled={qty >= C.VOYAGE_MAX_QTY}>+</button>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 10, fontWeight: 700 }}>
              {L.voyagerTotal(voyagerDraftCost())}{voyagerDraftDays() > 0 ? ` · ${L.voyagerTripDays(voyagerDraftDays())}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button disabled={voyagerDraftLines().length === 0 || voyagerDraftCost() > (hud.money | 0)} onClick={sendVoyagerOrder}>{L.voyagerSendBtn}</button>
              <button onClick={() => setVoyagerOrderOpen(false)}>{L.voyagerCancelBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* Zip 258 : revente des produits du monde rapportés par Eduardo. */}
      {voyagerSellOpen && (
        <div className="ferme-modal open" onClick={() => setVoyagerSellOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setVoyagerSellOpen(false)}>✕</button>
            <h2>{L.voyagerSellTitle}</h2>
            {C.WORLD_GOODS.map(g => {
              const n = ((sharedRef.current.station && sharedRef.current.station.worldStock) || {})[g.key] | 0;
              if (n <= 0) return null;
              return (
                <div className="ferme-shop-row" key={"vgs-" + g.key}>
                  <div className="info">
                    <b>{g.emoji} {L.voyagerSellRow(lang === "en" ? g.nameEn : g.name, n)}</b>
                    <span className="ferme-usage">{g.sell} or/unité</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => sellWorldGood(g.key, 1)}>{lang === "en" ? "Sell 1" : "Vendre 1"}</button>
                    <button onClick={() => sellWorldGood(g.key, 9999)}>{lang === "en" ? "Sell all" : "Tout vendre"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fiche de Greg (touche Q à proximité) — menu d'ordres complet. */}
      {gregCardOpen && sharedRef.current.greg && (() => {
        const g = sharedRef.current.greg;
        return (
          <div className="ferme-modal open" onClick={() => setGregCardOpen(false)}>
            <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
              <button className="ferme-close-x" onClick={() => setGregCardOpen(false)}>\u2715</button>
              <h2>{L.employeesGregName}</h2>
              <div className="ferme-shop-row">
                <Sprite img={spritesReady ? spritesRef.current.getChar("m", 0, true) : null} w={26} h={32} />
                <div className="info">
                  <b>Greg</b>
                  <span className="ferme-usage">{L.gregHiredUntil(Math.max(0, Math.ceil((g.expiresAt - Date.now()) / 3600000)))}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <button onClick={() => { setGregCardOpen(false); setGregOrderOpen(true); }}>{L.gregOrderBtn}</button>
                {(gregStock.fertilizer || 0) > 0 && (
                  <button onClick={() => { setGregCardOpen(false); setFertilizerOrderOpen(true); }}>{L.fertilizerOrderBtn}</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {craftMenuOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setCraftMenuOpen(null)}>
          <div className="ferme-seed-menu panel ferme-craft-menu" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">
              {craftMenuOpen === "wood" ? L.craftMenuTitleWood(myInv ? myInv.wood : 0) : craftMenuOpen === "stone" ? L.craftMenuTitleStone(myInv ? myInv.stone : 0) : craftMenuOpen === "flour" ? L.craftMenuTitleFlour() : L.craftMenuTitleGems()}
            </div>
            {craftMenuOpen === "wood" && (
              <div className="ferme-craft-row">
                <Sprite img={spritesReady ? spritesRef.current.fence : null} w={26} h={26} />
                <span className="name">{L.buildFenceLabel}<br /><span className="cost">{L.buildCostWood(C.BUILD_COSTS.fence)}</span></span>
                <button disabled={!myInv || myInv.wood < C.BUILD_COSTS.fence} onClick={() => craftBuild("fence", 1)}>{L.buy1}</button>
                <button disabled={!myInv || myInv.wood < C.BUILD_COSTS.fence * 5} onClick={() => craftBuild("fence", 5)}>{L.buy5}</button>
              </div>
            )}
            {craftMenuOpen === "wood" && (
              <div className="ferme-craft-row">
                <Sprite img={spritesReady ? spritesRef.current.bridge : null} w={26} h={26} />
                <span className="name">{L.buildBridgeWoodLabel}<br /><span className="cost">{L.buildCostBridgeWood(C.BRIDGE_COST_WOOD)}</span></span>
                <button disabled={!myInv || myInv.wood < C.BRIDGE_COST_WOOD} onClick={() => equipBridge("wood")}>{L.equipBtn}</button>
              </div>
            )}
            {craftMenuOpen === "stone" && (
              <>
                <div className="ferme-craft-row">
                  <Sprite img={spritesReady ? spritesRef.current.wall : null} w={26} h={26} />
                  <span className="name">{L.buildWallLabel}<br /><span className="cost">{L.buildCostStone(C.BUILD_COSTS.wall)}</span></span>
                  <button disabled={!myInv || myInv.stone < C.BUILD_COSTS.wall} onClick={() => craftBuild("wall", 1)}>{L.buy1}</button>
                  <button disabled={!myInv || myInv.stone < C.BUILD_COSTS.wall * 5} onClick={() => craftBuild("wall", 5)}>{L.buy5}</button>
                </div>
                <div className="ferme-craft-row">
                  <Sprite img={spritesReady ? spritesRef.current.path : null} w={26} h={26} />
                  <span className="name">{L.buildPathLabel}<br /><span className="cost">{L.buildCostPath(C.BUILD_COSTS.path)}</span></span>
                  <button disabled={!myInv || myInv.stone < C.BUILD_COSTS.path} onClick={() => craftBuild("path", 1)}>{L.buy1}</button>
                  <button disabled={!myInv || myInv.stone < C.BUILD_COSTS.path * 5} onClick={() => craftBuild("path", 5)}>{L.buy5}</button>
                </div>
                <div className="ferme-craft-row">
                  <Sprite img={spritesReady ? spritesRef.current.bridgeStoneSprite : null} w={26} h={26} />
                  <span className="name">{L.buildBridgeStoneLabel}<br /><span className="cost">{L.buildCostBridgeStone(C.BRIDGE_COST_STONE)}</span></span>
                  <button disabled={!myInv || myInv.stone < C.BRIDGE_COST_STONE} onClick={() => equipBridge("stone")}>{L.equipBtn}</button>
                </div>
                <div className="ferme-craft-row">
                  <Sprite img={spritesReady ? spritesRef.current.bridgeStoneSprite : null} w={26} h={26} />
                  <span className="name">{L.buildBridgeRenovateLabel}<br /><span className="cost">{L.buildCostBridgeStone(C.BRIDGE_RENOVATE_COST_STONE)}</span></span>
                  <button disabled={!myInv || myInv.stone < C.BRIDGE_RENOVATE_COST_STONE} onClick={equipBridgeRenovate}>{L.equipBtn}</button>
                </div>
              </>
            )}
            {craftMenuOpen === "gems" && (
              <>
                {C.GEMS.map(gm => {
                  const n = gems ? (gems[gm.id] || 0) : 0;
                  return (
                    <div className="ferme-craft-row" key={"cg" + gm.id}>
                      <Sprite img={spritesReady ? spritesRef.current.gemIcons[gm.id] : null} w={26} h={26} />
                      <span className="name">{(lang === "en" ? gm.nameEn : gm.name)} × {n}<br /><span className="cost">{L.perPiece(gm.sell)}</span></span>
                      <button disabled={!n} onClick={() => sellGem(gm.id)}>{L.sellAll}</button>
                    </div>
                  );
                })}
              </>
            )}
            {craftMenuOpen === "flour" && (
              <div className="ferme-craft-row">
                <Sprite img={spritesReady ? spritesRef.current.icons.flour : null} w={26} h={26} />
                <span className="name">{L.flourItemName} × {flour || 0}<br /><span className="cost">{L.perPiece(C.FLOUR_SELL)}</span></span>
                <button disabled={!flour} onClick={() => sellFlour()}>{L.sellAll}</button>
              </div>
            )}
            {craftMenuOpen !== "gems" && craftMenuOpen !== "flour" && (
              <button className="ferme-btn ferme-craft-sell"
                disabled={!myInv || myInv[craftMenuOpen] === 0}
                onClick={() => { sellItem(craftMenuOpen); setCraftMenuOpen(null); }}>{L.sellAll}</button>
            )}
          </div>
        </div>
      )}

      {/* Panneau des quêtes de découverte (checklist cochable) */}
      {questOpen && myQuests && !questsHidden && (
        <div className="ferme-quests panel">
          <div className="ferme-quests-head">
            <b>{L.questTitle}</b>
            <button className="ferme-quests-x" onClick={() => setQuestOpen(false)}>✕</button>
          </div>
          {C.QUESTS.map(q => {
            const done = !!myQuests[q.id];
            return (
              <div key={q.id} className={"ferme-quest-row" + (done ? " done" : "")}>
                <span className="ferme-quest-check">{done ? "✅" : "⬜"}</span>
                <span className="ferme-quest-label">{L.questLabels[q.id]}</span>
                <span className="ferme-quest-reward">{L.questReward(q.reward)}</span>
              </div>
            );
          })}
          {C.QUESTS.every(q => myQuests[q.id]) && <div className="ferme-quest-alldone">{L.questAllDone}</div>}
        </div>
      )}
      {!questOpen && !questsHidden && <button className="ferme-btn ferme-quests-fab" onClick={() => setQuestOpen(true)}>{L.questBtn}</button>}

      {/* Panneau de la mission d'équipe en cours (v1 : bois/pierre à déposer au chantier) */}
      {coop && (() => {
        const def = C.COOP_MISSIONS.find(m2 => m2.id === coop.id);
        if (!def) return null;
        return (
          <div className="ferme-coop panel">
            <div className="ferme-quests-head"><b>{L.coopTitle}</b></div>
            <div className="ferme-coop-name">{lang === "en" ? def.nameEn : def.name}</div>
            {coop.parts.map((p, pi) => {
              const pd = def.parts[pi] || def.parts.find(x => x.id === p.id);
              const done = p.got >= p.target;
              return (
                <div key={p.id} className={"ferme-quest-row" + (done ? " done" : "")}>
                  <span className="ferme-quest-check">{done ? "✅" : (p.resource === "wood" ? "🪵" : "🪨")}</span>
                  <span className="ferme-quest-label">{lang === "en" ? pd.labelEn : pd.label}</span>
                  <span className="ferme-quest-reward">{p.got}/{p.target}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Défi "chasse aux lapins" en cours (chantier 2026-07) : progression
          PERSONNELLE du joueur affichant l'écran (chacun voit son propre
          compteur, pas celui des autres — suffisant pour "qui gagnera en
          premier", pas besoin d'un classement complet pour un mini-défi). */}
      {rabbitChallenge && rabbitChallenge.active && (
        <div className="ferme-rabbit-challenge panel">
          {L.rabbitChallengeProgress(Math.min((rabbitChallenge.catches && rabbitChallenge.catches[me.id]) || 0, C.RABBIT_CHALLENGE_TARGET), C.RABBIT_CHALLENGE_TARGET)}
        </div>
      )}

      {/* Popup de proposition du défi lapins, hôte uniquement (jamais montrée
          aux autres joueurs — c'est l'hôte seul qui choisit de l'activer). */}
      {isHost && rabbitChallengeOffer && (
        <div className="ferme-modal open" onClick={dismissRabbitChallengeOffer}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()} style={{ width: "min(360px, 92vw)", textAlign: "center" }}>
            <h2>{L.rabbitChallengeOfferTitle}</h2>
            <div className="ferme-hint">{L.rabbitChallengeOfferSub(C.RABBIT_CHALLENGE_TARGET)}</div>
            <button onClick={activateRabbitChallenge}>{L.rabbitChallengeActivate}</button>{" "}
            <button onClick={dismissRabbitChallengeOffer}>{L.rabbitChallengeIgnore}</button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="ferme-chatlog">{[...chat].reverse().map(c => <div key={c.id}><b>{c.from}</b> {c.msg}</div>)}</div>
      {chatOpen && <input ref={chatInputRef} className="ferme-chat-input" maxLength={120} placeholder={L.chatSend}
        onKeyDown={e => { if (e.key === "Enter") submitChat(); else if (e.key === "Escape") { setChatOpen(false); chatInputRef.current.blur(); } }} autoFocus />}

      {/* Blessure (morsure de loup, chantier 2026-07) : bannière rouge avec
          décompte, tant que injuredUntil (persistant, survit à un refresh)
          est dans le futur. Le tick HUD 1Hz (setHud plus haut) fait vivre le
          décompte sans minuterie dédiée. */}
      {injuredUntil > Date.now() && (() => {
        const left = Math.max(0, injuredUntil - Date.now());
        const mm = String(Math.floor(left / 60000)).padStart(2, "0");
        const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
        return (
          <div className="ferme-toast" style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
            background: "#7a1414", color: "#fff", fontWeight: "bold", zIndex: 50,
          }}>
            {L.injuredBanner(`${mm}:${ss}`)}
          </div>
        );
      })()}

      {/* Immunité (pommade de protection, chantier 2026-07) : bannière verte
          avec décompte, même principe que la bannière de blessure ci-dessus,
          tant qu'immunityUntil est dans le futur. */}
      {immunityUntil > Date.now() && (() => {
        const left = Math.max(0, immunityUntil - Date.now());
        const mm = String(Math.floor(left / 60000)).padStart(2, "0");
        const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
        return (
          <div className="ferme-toast" style={{
            position: "fixed", top: injuredUntil > Date.now() ? 52 : 12, left: "50%", transform: "translateX(-50%)",
            background: "#146a2e", color: "#fff", fontWeight: "bold", zIndex: 50,
          }}>
            {L.immunityBanner(`${mm}:${ss}`)}
          </div>
        );
      })()}

      {/* Toasts */}
      <div className="ferme-toasts">{toasts.map(t2 => <div key={t2.id} className="ferme-toast">{t2.msg}</div>)}</div>

      {/* Aide */}
      <div className="ferme-help">{L.help1}<br />{L.help2}</div>

      {/* Boutique */}
      {shopOpen && (
        <div className="ferme-modal open" onClick={() => setShopOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setShopOpen(false)}>✕</button>
            <h2>{L.shopTitle}</h2><div className="ferme-hint">{L.shopHint}</div>
            {/* Réorganisation de la boutique (demande Guillaume 2026-07) :
                sections thématiques — Graines & cultures, Animaux (le cheval y
                rejoint les autres bêtes, comme demandé), Outils, Constructions,
                Consommables & soins, Employés. Chaque ligne est STRICTEMENT la
                même qu'avant (mêmes libellés/actions/gardes), seuls l'ordre et
                les en-têtes de section changent. */}
            <div className="ferme-tools-header">{L.shopSeedsHeader}</div>
            <div className="ferme-usage">{L.seedsUsageHint}</div>
            {C.CROPS.filter(cr => !cr.unique).map(cr => (
              <div className="ferme-shop-row" key={"s" + cr.id}>
                <Sprite img={spritesReady ? spritesRef.current.crops[cr.id][C.CROP_STAGES - 1] : null} w={32} h={32} />
                <div className="info"><b>{L.seedCostLabel(cr)}</b><span>{L.seedRowSub(cr)}{myInv ? myInv.seeds[cr.id] : 0}</span></div>
                <button disabled={hud.money < cr.seedCost} onClick={() => buySeed(cr.id, 1)}>{L.buy1}</button>
                <button disabled={hud.money < cr.seedCost * 5} onClick={() => buySeed(cr.id, 5)}>{L.buy5}</button>
              </div>
            ))}
            {/* Engrais (chantier 2026-07, suite plan validé) : ligne visible
                UNIQUEMENT quand le stock boutique est non nul (ressource rare,
                pas disponible en permanence — voir FERTILIZER_RESTOCK_EVERY_N_DAYS). */}
            {fertilizerShop.stock > 0 && (
              <div className="ferme-shop-row">
                <span style={{ fontSize: 26, width: 32, textAlign: "center" }}>🌱</span>
                <div className="info">
                  <b>{L.fertilizerShopLabel}</b>
                  <span>{L.fertilizerShopStock(fertilizerShop.stock)}</span>
                  <span className="ferme-usage">{L.fertilizerOrderAvailable(gregStock.fertilizer || 0)}</span>
                </div>
                <button disabled={hud.money < C.FERTILIZER_COST} onClick={buyFertilizer}>{L.fertilizerShopBuy(C.FERTILIZER_COST)}</button>
                {sharedRef.current.greg && (gregStock.fertilizer || 0) > 0 && (
                  <button onClick={() => setFertilizerOrderOpen(true)}>{L.fertilizerOrderBtn}</button>
                )}
              </div>
            )}
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.grassPatch : null} w={16} h={16} />
              <div className="info"><b>{L.grassRowTitle(C.GRASS_COST)}</b><span>{L.grassRowSub(myInv ? (myInv.grass || 0) : 0)}</span></div>
              <button disabled={hud.money < C.GRASS_COST} onClick={() => buyGrass(1)}>{L.buy1}</button>
              <button disabled={hud.money < C.GRASS_COST * 5} onClick={() => buyGrass(5)}>{L.buy5}</button>
            </div>
            <div className="ferme-tools-header">{L.shopAnimalsHeader}</div>
            {C.ANIMALS.map(a => (
              <div className="ferme-shop-row" key={"an" + a.id}>
                <Sprite img={spritesReady ? spritesRef.current.animals[a.id][0] : null} w={32} h={28} />
                <div className="info"><b>{L.animalRowTitle(lang === "en" ? a.nameEn : a.name, a.cost)}</b><span>{L.animalRowSub(lang === "en" ? a.prodEn : a.prod, a.sell, Math.round(a.prodMs / 3600000))}</span></div>
                <button disabled={hud.money < a.cost || buildings.animalCount >= E.barnAnimalCap(barn ? barn.level : 0)} onClick={() => buyAnimal(a.id)}>{L.buyLabel}</button>
              </div>
            ))}
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.horse : null} w={36} h={30} />
              <div className="info"><b>{L.shopHorseTitle(C.HORSE_COSTS[Math.min(buildings.horseCount, C.HORSE_MAX_COUNT - 1)])}</b><span>{L.shopHorseSub}</span><span className="ferme-usage">{buildings.horseCount >= C.HORSE_MAX_COUNT ? L.shopHorseMax : L.shopHorseCount(buildings.horseCount, C.HORSE_MAX_COUNT)}</span></div>
              <button disabled={buildings.horseCount >= C.HORSE_MAX_COUNT || hud.money < C.HORSE_COSTS[Math.min(buildings.horseCount, C.HORSE_MAX_COUNT - 1)]} onClick={buyHorse}>{buildings.horseCount >= C.HORSE_MAX_COUNT ? L.maxLabel : L.buyLabel}</button>
            </div>
            <div className="ferme-tools-header">{L.toolsHeader}</div>
            {C.TOOLS.map(k => {
              const lvl = myTools[k], max = lvl >= C.TOOL_MAX_LEVEL, cost = max ? 0 : C.TOOL_UPGRADE_COST[lvl];
              return (
                <div className="ferme-shop-row" key={"t" + k}>
                  <Sprite img={spritesReady ? spritesRef.current.icons[k] : null} w={32} h={32} />
                  <div className="info"><b>{L.toolRowTitle(TOOL_NAMES[k], lvl)}</b><span>{max ? L.toolMaxSub : L.toolUpSub(lvl + 1, cost)}</span><span className="ferme-usage">{L.toolUsage[k]}</span></div>
                  <button disabled={max || hud.money < cost} onClick={() => buyTool(k)}>{max ? L.maxLabel : L.upgrade}</button>
                </div>
              );
            })}
            <div className="ferme-tools-header">{L.shopBuildHeader}</div>
            {/* Maison à niveaux (validation Guillaume 2026-07) : lancer les
                travaux du palier suivant depuis la boutique — statut/compte à
                rebours pendant les travaux, MAX au niveau 3. */}
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.houses[Math.min(Math.max(house.level, 1), C.HOUSE_MAX_LEVEL) - 1] : null} w={36} h={36} />
              <div className="info">
                <b>{L.houseRowTitle(house.level)}</b>
                {house.level >= C.HOUSE_MAX_LEVEL
                  ? <span>{L.houseRowMax}</span>
                  : house.upgradeUntil > Date.now()
                    ? <span>{L.houseUpgrading(Math.max(1, Math.ceil((house.upgradeUntil - Date.now()) / 60000)))}</span>
                    : <span>{L.houseRowCost(C.HOUSE_LEVELS[house.level - 1])}</span>}
                <span className="ferme-usage">{L.houseRowSub}</span>
              </div>
              {house.level < C.HOUSE_MAX_LEVEL && !(house.upgradeUntil > Date.now()) && (() => {
                const nx = C.HOUSE_LEVELS[house.level - 1];
                const ok = nx && hud.money >= nx.cost.money && myInv && (myInv.wood || 0) >= nx.cost.wood && (myInv.stone || 0) >= nx.cost.stone;
                return <button disabled={!ok} onClick={houseUpgrade}>{L.houseUpgradeBtn}</button>;
              })()}
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.well : null} w={26} h={32} />
              <div className="info"><b>{L.shopWellTitle(C.WELL_COST)}</b><span>{buildings.wellBuilt ? L.shopWellOwned : L.shopWellSub}</span></div>
              <button disabled={buildings.wellBuilt || hud.money < C.WELL_COST} onClick={buyWell}>{buildings.wellBuilt ? L.maxLabel : L.buyLabel}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.fence : null} w={32} h={32} />
              <div className="info"><b>{L.fenceRowTitle(C.FENCE_COST)}</b><span>{L.fenceRowSub(myInv ? (myInv.fence || 0) : 0)}</span></div>
              <button disabled={hud.money < C.FENCE_COST} onClick={() => buyFence(1)}>{L.buy1}</button>
              <button disabled={hud.money < C.FENCE_COST * 5} onClick={() => buyFence(5)}>{L.buy5}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.lamp : null} w={20} h={32} />
              <div className="info"><b>{L.lampRowTitle(C.LAMP_COST)}</b><span>{L.lampRowSub(myInv ? (myInv.lamp || 0) : 0)}</span></div>
              <button disabled={hud.money < C.LAMP_COST} onClick={() => buyLamp(1)}>{L.buy1}</button>
              <button disabled={hud.money < C.LAMP_COST * 5} onClick={() => buyLamp(5)}>{L.buy5}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.scarecrow : null} w={20} h={32} />
              <div className="info"><b>{L.scarecrowRowTitle(C.SCARECROW_COST)}</b><span>{L.scarecrowRowSub(myInv ? (myInv.scarecrow || 0) : 0)}</span></div>
              <button disabled={hud.money < C.SCARECROW_COST} onClick={() => buyScarecrow(1)}>{L.buy1}</button>
              <button disabled={hud.money < C.SCARECROW_COST * 5} onClick={() => buyScarecrow(5)}>{L.buy5}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.mill : null} w={30} h={36} />
              <div className="info"><b>{L.millRowTitle(C.MILL_COST)}</b><span>{L.millRowSub(myInv ? (myInv.mill || 0) : 0)}</span></div>
              <button disabled={hud.money < C.MILL_COST} onClick={() => buyMill(1)}>{L.buy1}</button>
            </div>
            {/* Zip 252 : ateliers d'artisans — visibles seulement quand l'artisan concerné vit chez nous. */}
            {(() => {
              const residents = (stationSt && stationSt.residents) || [];
              const hasSkill = (sk) => residents.some(r => (C.VISITOR_ROSTER[r.rid] || {}).skill === sk);
              const rows = Object.keys(C.ARTISAN_BUILDINGS).filter(bid => hasSkill(C.ARTISAN_BUILDINGS[bid].skill));
              if (!rows.length) return null;
              return (<>
                <div className="ferme-tools-header">{L.artisanShopTitle}</div>
                {rows.map(bid => {
                  const def = C.ARTISAN_BUILDINGS[bid];
                  const built = sharedRef.current.crafts && sharedRef.current.crafts[bid] && sharedRef.current.crafts[bid].built;
                  return (
                    <div className="ferme-shop-row" key={"art" + bid}>
                      <Sprite img={spritesReady ? spritesRef.current.artisan[bid] : null} w={34} h={30} />
                      <div className="info"><b>{L.buildingName(bid)} — {"\u{1FA99}"} {def.cost}</b><span>{built ? L.artisanOwnedBtn : (bid === "sawmill" ? L.sawmillShopSub : L.craftName(bid === "beehive" ? "honey" : bid === "fromagerie" ? "cheeseWheel" : "pastry"))}</span></div>
                      <button disabled={built || hud.money < def.cost} onClick={() => buyArtisanBuilding(bid)}>{built ? L.artisanOwnedBtn : L.artisanBuyBtn}</button>
                    </div>
                  );
                })}
              </>);
            })()}
            <div className="ferme-tools-header">{L.shopConsumablesHeader}</div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.icons.food : null} w={32} h={32} />
              <div className="info"><b>{L.foodRowTitle(C.FOOD_COST)}</b><span>{L.foodRowSub(C.FOOD_ENERGY, myInv ? myInv.food : 0)}</span></div>
              <button disabled={hud.money < C.FOOD_COST} onClick={buyFood}>{L.buyOne}</button>
            </div>
            <div className="ferme-shop-row">
              <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🩹</div>
              <div className="info"><b>{L.healKitRowTitle}</b><span>{L.healKitRowSub(myInv ? (myInv.healKit || 0) : 0)}</span></div>
              <button onClick={() => buyHealKit(1)}>{L.buy1}</button>
            </div>
            <div className="ferme-shop-row">
              <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧴</div>
              <div className="info"><b>{L.salveRowTitle}</b><span>{L.salveRowSub(myInv ? (myInv.salve || 0) : 0)}</span></div>
              <button disabled={!myInv || !(myInv.salve > 0)} onClick={useSalve}>{L.salveUseLabel}</button>
            </div>
            <div className="ferme-tools-header">{L.shopStaffHeader}</div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.getChar("m", 0) : null} w={26} h={32} />
              <div className="info">
                <b>{L.gregRowTitle(C.GREG_HIRE_COST)}</b>
                <span>{L.gregRowSub}</span>
                <span className="ferme-usage">{sharedRef.current.greg ? L.gregHiredUntil(Math.max(0, Math.ceil((sharedRef.current.greg.expiresAt - Date.now()) / 3600000))) : L.gregNotHiredSub}</span>
              </div>
              {sharedRef.current.greg
                ? <button onClick={() => setGregOrderOpen(true)}>{L.gregOrderBtn}</button>
                : <button disabled={hud.money < C.GREG_HIRE_COST} onClick={hireGreg}>{L.hireLabel}</button>}
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.getChar("m", 1) : null} w={26} h={32} />
              <div className="info">
                <b>{L.soanRowTitle(C.SOAN_HIRE_COST)}</b>
                <span>{L.soanRowSub}</span>
                <span className="ferme-usage">
                  {sharedRef.current.soan
                    ? L.soanHiredUntil(Math.max(0, Math.ceil((sharedRef.current.soan.expiresAt - Date.now()) / 3600000))) + " — " +
                      (sharedRef.current.soan.phase === "fishing" ? L.soanStatusFishing
                        : sharedRef.current.soan.phase === "break" ? L.soanStatusBreak
                        : sharedRef.current.soan.phase === "toRiver" ? L.soanStatusToRiver : L.soanStatusRoam)
                    : L.soanNotHiredSub}
                </span>
              </div>
              {sharedRef.current.soan
                ? (sharedRef.current.soan.phase === "roam"
                    ? <button onClick={soanOrder}>{L.soanOrderBtn}</button>
                    : <button onClick={soanRecall}>{L.soanRecallBtn}</button>)
                : <button disabled={hud.money < C.SOAN_HIRE_COST} onClick={hireSoan}>{L.hireLabel}</button>}
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.getChar("m", 6) : null} w={26} h={32} />
              <div className="info">
                <b>{L.haraldRowTitle(C.HARALD_HIRE_COST)}</b>
                <span>{L.haraldRowSub}</span>
                <span className="ferme-usage">{sharedRef.current.harald ? L.haraldHiredUntil(Math.max(0, Math.ceil((sharedRef.current.harald.expiresAt - Date.now()) / 3600000))) : L.haraldNotHiredSub}</span>
              </div>
              {sharedRef.current.harald
                ? <button disabled>{L.haraldWorkingBtn}</button>
                : <button disabled={hud.money < C.HARALD_HIRE_COST} onClick={hireHarald}>{L.hireLabel}</button>}
            </div>
          </div>
        </div>
      )}

      {/* Menu du chaudron (chantier 2026-07, refonte demande Guillaume) :
          "une fois la recette sélectionnée, le chaudron doit proposer de
          déposer les ingrédients ? Oui-Non [...] si tous les ingrédients
          sont là alors on peut cliquer sur prêt ! et puis le chaudron
          indiquera allumez le chaudron". Une seule entrée pour l'instant, la
          pommade magique. Même habillage modal que la boutique. N'apparaît
          plus du tout si une concoction est en cours/prête (voir
          tryOpenNearby : E gère alors directement attente/récupération). */}
      {cauldronMenuOpen && (() => {
        const st = salveRecipeStatus();
        return (
          <div className="ferme-modal open" onClick={() => setCauldronMenuOpen(false)}>
            <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
              <button className="ferme-close-x" onClick={() => setCauldronMenuOpen(false)}>✕</button>
              <h2>{L.cauldronMenuTitle}</h2>
              <div className="ferme-hint">{L.cauldronMenuHint}</div>
              {/* Recette en vieux parchemin (demande Guillaume 2026-07) : nom
                  de la concoction en haut, liste des ingrédients dessous
                  (avec l'avancement de l'équipe), effet en bas dans une
                  formulation volontairement voilée (pas de chiffres de
                  gameplay). */}
              <div className="ferme-parchment">
                <div className="ferme-parchment-title">{L.cauldronProductSalveName}</div>
                <ul className="ferme-parchment-ing">
                  <li>{L.scrollIngAmethyst(st.amethyst, st.rec.amethyst)}{st.amethyst >= st.rec.amethyst ? " ✓" : ""}</li>
                  <li>{L.scrollIngTrout(st.deposited.trout, st.rec.trout)}{st.deposited.trout >= st.rec.trout ? " ✓" : ""}</li>
                  <li>{L.scrollIngPike(st.deposited.pike, st.rec.pike)}{st.deposited.pike >= st.rec.pike ? " ✓" : ""}</li>
                </ul>
                <div className="ferme-parchment-effect">{L.cauldronScrollEffect}</div>
              </div>
              {!st.ready ? (
                // Verse d'un coup tout ce que le joueur porte d'encore UTILE
                // à la recette (cauldronPlaceIngredients, plafonné au manquant
                // côté hôte) — grisé s'il ne porte rien d'utile.
                <button className="ferme-cauldron-ready-btn" disabled={!st.canPlace} onClick={cauldronPlaceIngredients}>{L.cauldronAddBtn}</button>
              ) : (
                // Recette complète : bouton "Prêt !" — confirme puis ferme
                // le menu en rappelant d'aller allumer le chaudron (torche
                // en main) pour lancer la concoction, geste qui se fait
                // DANS le monde (voir tryOpenNearby/cauldronInteract).
                <button className="ferme-cauldron-ready-btn" onClick={() => { setCauldronMenuOpen(false); pushToast(L.cauldronReadyHint); }}>{L.cauldronReadyBtn}</button>
              )}
              {/* Si les poissons sont au complet mais qu'il manque l'améthyste
                  (réserve commune, non "versable"), expliquer pourquoi le
                  bouton est grisé. */}
              {!st.ready && st.deposited.trout >= st.rec.trout && st.deposited.pike >= st.rec.pike && st.amethyst < st.rec.amethyst && (
                <div className="ferme-hint">{L.cauldronNeedAmethyst}</div>
              )}
              {st.ready && (
                <div className="ferme-hint">
                  <Sprite img={spritesReady ? spritesRef.current.torch : null} w={16} h={22} /> {L.cauldronIgniteHint}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Bac de vente */}
      {/* Zip 236: personal bag modal (individual items). Communal loot stays
          in the selling stall (bin modal below). */}
      {bagOpen && (
        <div className="ferme-modal open" onClick={() => setBagOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setBagOpen(false)}>✕</button>
            <h2>{L.bagTitle}</h2>

            <div style={{ fontSize: 11, fontWeight: 700, opacity: .7, textTransform: "uppercase", letterSpacing: .5, marginTop: 6 }}>{L.bagPetsTitle(myPets.length, C.MAX_PETS)}</div>
            {myPets.length === 0 && <div className="ferme-hint">{L.bagNoPets}</div>}
            {myPets.map((pt, pi) => (
              <div className="ferme-shop-row" key={"pet" + pi}>
                <Sprite img={spritesReady ? spritesRef.current.pets[pt.id] : null} w={32} h={32} />
                <div className="info"><b>{C.petName(pt.id, lang === "en")}</b></div>
                <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="release" tone="bad" small label={L.bagReleaseBtn} onClick={() => sendReq({ kind: "releasePet", index: pi })} />
              </div>
            ))}

            {/* Zip 251 : décorations reçues en cadeau, déployables via l'outil main. */}
            <div style={{ fontSize: 11, fontWeight: 700, opacity: .7, textTransform: "uppercase", letterSpacing: .5, marginTop: 12 }}>{L.bagDecorTitle}</div>
            {(() => {
              const owned = C.UNIQUE_DECORATIONS.filter(d => myInv && myInv.decor && (myInv.decor[d.id] | 0) > 0);
              if (!owned.length) return <div className="ferme-hint">{L.bagNoDecor}</div>;
              return (<>
                {owned.map(d => (
                  <div className="ferme-shop-row" key={"decor" + d.id}>
                    <Sprite img={spritesReady ? spritesRef.current.decor[d.id] : null} w={32} h={32} />
                    <div className="info"><b>{(lang === "en" ? d.nameEn : d.name)} × {myInv.decor[d.id] | 0}</b></div>
                  </div>
                ))}
                <div className="ferme-hint">{L.bagDecorHint}</div>
              </>);
            })()}

            <div style={{ fontSize: 11, fontWeight: 700, opacity: .7, textTransform: "uppercase", letterSpacing: .5, marginTop: 12 }}>{L.bagHealTitle}</div>
            <div className="ferme-shop-row">
              <span style={{ fontSize: 26, width: 32, textAlign: "center" }}>🧪</span>
              <div className="info"><b>{L.bagSalveRow((myInv && myInv.salve) || 0)}</b><span>{L.bagSalveSub}</span></div>
            </div>
            <div className="ferme-shop-row">
              <span style={{ fontSize: 26, width: 32, textAlign: "center" }}>🩹</span>
              <div className="info"><b>{L.bagHealKitRow((myInv && myInv.healKit) || 0)}</b><span>{L.bagHealKitSub}</span></div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, opacity: .7, textTransform: "uppercase", letterSpacing: .5, marginTop: 12 }}>{L.bagEnergyTitle}</div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.icons.energy : null} w={32} h={32} />
              <div className="info"><b>{L.bagEnergyRow(Math.round(myEnergy), C.MAX_ENERGY)}</b><span>{L.bagSleepHint}</span></div>
            </div>
          </div>
        </div>
      )}
      {/* Zip 252 : fiche de dialogue d'un résident (Q à proximité).
          Zip 253 : fiche enrichie -> métier, ligne de besoin, ET état de
          production vivant (miel/fromage/pâtisserie/bois-pierre) lu sur l'état
          partagé. */}
      {residentCard != null && (() => {
        const ro = C.VISITOR_ROSTER[residentCard]; if (!ro) return null;
        const bid = C.SKILL_BUILDING[ro.skill];
        const built = bid && sharedRef.current.crafts && sharedRef.current.crafts[bid] && sharedRef.current.crafts[bid].built;
        let need;
        // Zip 258 : si la boulangerie est en alerte, la pâtissière explique
        // qu'il lui faut des ingrédients (demande Guillaume : "au clic, message
        // de la pâtissière").
        const bakerAlert = ro.skill === "baker" && built && sharedRef.current.crafts.bakery && sharedRef.current.crafts.bakery.alert;
        if (bakerAlert) need = L.bakeryAlertMsg;
        else if (ro.skill === "lumberjack") need = L.residentLumberjackLine;
        else if (bid) need = built ? L.residentBuildingReady(L.buildingName(bid)) : L.residentNeedBuilding(L.buildingName(bid));
        else need = "";
        const prod = residentProdLine(ro); // "" tant que l'atelier n'est pas bâti
        return (
          <div className="ferme-modal open" onClick={() => setResidentCard(null)}>
            <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
              <button className="ferme-close-x" onClick={() => setResidentCard(null)}>✕</button>
              <h2>{ro.name}</h2>
              <div className="ferme-shop-row">
                <Sprite img={spritesReady ? spritesRef.current.getChar(ro.gender, ro.outfit, ro.overalls, ro.cap) : null} sx={16} sy={24} w={40} h={60} />
                <div className="info"><b>{L.residentGreet(ro.name, ro.job)}</b><span>{need}</span></div>
              </div>
              <div className="ferme-shop-row">
                <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>🛠️</span>
                <div className="info"><b>{L.residentRoleTitle}</b><span>{prod || L.residentNotWorkingYet}</span></div>
              </div>
              <div style={{ marginTop: 10, textAlign: "right" }}>
                <PixBtn sprites={spritesReady ? spritesRef.current : null} tone="plain" label={L.residentCloseBtn} onClick={() => setResidentCard(null)} />
              </div>
            </div>
          </div>
        );
      })()}
      {/* Zip 252 : cadeau animal, sac plein -> libérer un compagnon ou refuser. */}
      {petChoice && (
        <div className="ferme-modal open" onClick={() => setPetChoice(null)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <h2>{L.petFullTitle}</h2>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.pets[petChoice.petId] : null} w={40} h={40} />
              <div className="info"><b>{L.petFullSub(C.petName(petChoice.petId, lang === "en"))}</b></div>
            </div>
            {myPets.map((pt, pi) => (
              <div className="ferme-shop-row" key={"pc" + pi}>
                <Sprite img={spritesReady ? spritesRef.current.pets[pt.id] : null} w={32} h={32} />
                <div className="info"><b>{C.petName(pt.id, lang === "en")}</b></div>
                <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="release" tone="good" small label={L.petFullRelease} onClick={() => acceptPetGift(pi)} />
              </div>
            ))}
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <PixBtn sprites={spritesReady ? spritesRef.current : null} tone="bad" label={L.petFullDecline} onClick={() => setPetChoice(null)} />
            </div>
          </div>
        </div>
      )}
      {binOpen && (
        <div className="ferme-modal open" onClick={() => setBinOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setBinOpen(false)}>✕</button>
            <h2>{L.binTitle}</h2><div className="ferme-hint">{L.binHint}</div>
            {C.CROPS.filter(cr => !cr.unique || (myInv && myInv.crops && myInv.crops[cr.id] > 0)).map(cr => {
              const n = myInv ? myInv.crops[cr.id] : 0;
              return (
                <div className="ferme-shop-row" key={"b" + cr.id}>
                  <Sprite img={spritesReady ? spritesRef.current.crops[cr.id][C.CROP_STAGES - 1] : null} w={32} h={32} />
                  <div className="info"><b>{L.cropRowTitle(cropName(cr.id), n)}</b><span>{L.cropRowSub(cr, n)}</span></div>
                  <button disabled={n === 0} onClick={() => sellItem("crop", cr.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {C.FISH.map(fs => {
              const n = myInv && myInv.fish ? myInv.fish[fs.id] : 0;
              return (
                <div className="ferme-shop-row" key={"f" + fs.id}>
                  <Sprite img={spritesReady ? spritesRef.current.fishIcons[fs.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? fs.nameEn : fs.name)} × {n}</b><span>{L.perPiece(fs.sell)}</span></div>
                  <button disabled={!n} onClick={() => sellFish(fs.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {/* 2026-07 station update: rare sea creatures (personal, sell-only).
                Rows only appear once you own at least one. */}
            {C.SEA_CREATURES.map(sc => {
              const n = myInv && myInv.seaCreatures ? myInv.seaCreatures[sc.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"sea" + sc.id}>
                  <Sprite img={spritesReady ? spritesRef.current.seaIcons[sc.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? sc.nameEn : sc.name)} × {n}</b><span>{L.perPiece(sc.sell)}</span><span className="ferme-usage">{L.seaSectionHint}</span></div>
                  <button disabled={!n} onClick={() => sellSea(sc.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {/* Zip 235: berry / fruit rows (only visible when owned). Icon
                reuses a crop sprite so no new asset is needed. */}
            {myInv && (myInv.berries || 0) > 0 && (
              <div className="ferme-shop-row" key="berry">
                <Sprite img={spritesReady ? spritesRef.current.berryBush : null} w={32} h={32} />
                <div className="info"><b>{L.berryLabel} × {myInv.berries}</b><span>{L.perPiece(C.BERRY_SELL)}</span></div>
                <button onClick={sellBerry}>{L.sellAll}</button>
              </div>
            )}
            {myInv && (myInv.fruit || 0) > 0 && (
              <div className="ferme-shop-row" key="fruit">
                <Sprite img={spritesReady ? spritesRef.current.crops[0][C.CROP_STAGES - 1] : null} w={32} h={32} />
                <div className="info"><b>{L.fruitLabel} × {myInv.fruit}</b><span>{L.perPiece(C.FRUIT_SELL)}</span></div>
                <button onClick={sellFruit}>{L.sellAll}</button>
              </div>
            )}
            {/* Poissons pêchés par Soan, pool COMMUN (chantier 2026-07,
                demande Guillaume : "le poisson est direct notre propriété et
                on peut aller le vendre") — même principe d'affichage que les
                gemmes du pool commun juste en dessous. Lignes visibles
                UNIQUEMENT si le stock commun contient au moins un poisson de
                cette espèce. */}
            {C.FISH.map(fs => {
              const n = gregStock.fish ? gregStock.fish[fs.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"cf" + fs.id}>
                  <Sprite img={spritesReady ? spritesRef.current.fishIcons[fs.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? fs.nameEn : fs.name)} × {n}</b><span>{L.perPiece(fs.sell)}</span><span className="ferme-usage">{L.soanFishSharedHint}</span></div>
                  <button disabled={!n} onClick={() => sellCommonFish(fs.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {/* Zip 260 : productions animales ramassées par Harald, pool COMMUN
                (œuf/lait/laine/truffe) — même affichage que les poissons de
                Soan. Visibles uniquement si le stock commun en contient. */}
            {C.ANIMALS.map(a => {
              const n = gregStock.animals ? gregStock.animals[a.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"ca" + a.id}>
                  <Sprite img={spritesReady ? spritesRef.current.products[a.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? a.prodEn : a.prod)} × {n}</b><span>{L.perPiece(a.sell)}</span><span className="ferme-usage">{L.haraldSharedHint}</span></div>
                  <button disabled={!n} onClick={() => sellCommonAnimal(a.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {C.GEMS.map(gm => {
              const n = gems ? gems[gm.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"g" + gm.id}>
                  <Sprite img={spritesReady ? spritesRef.current.gemIcons[gm.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? gm.nameEn : gm.name)} × {n}</b><span>{L.perPiece(gm.sell)}</span><span className="ferme-usage">{L.gemsSharedHint}</span></div>
                  <button disabled={!n} onClick={() => sellGem(gm.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {C.ANIMALS.map(a => {
              const n = myInv && myInv.products ? myInv.products[a.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"pr" + a.id}>
                  <Sprite img={spritesReady ? spritesRef.current.products[a.id] : null} w={32} h={32} />
                  <div className="info"><b>{L.prodRowTitle(lang === "en" ? a.prodEn : a.prod, n)}</b><span>{L.perPiece(a.sell)}</span></div>
                  <button disabled={!n} onClick={() => sellProduct(a.id)}>{L.sellAll}</button>
                </div>
              );
            })}
            {/* Zip 252 : produits d'artisans (réserve commune craftStock). */}
            {(() => {
              const cs = sharedRef.current.craftStock || {};
              const items = [["honey", C.HONEY_SELL], ["cheeseWheel", C.CHEESE_WHEEL_SELL], ["cheesePortion", C.CHEESE_PORTION_SELL], ["pastry", C.PASTRY_SELL]];
              const any = items.some(([k]) => (cs[k] | 0) > 0);
              if (!any) return null;
              return (<>
                <div className="ferme-tools-header">{L.craftSellTitle}</div>
                {items.map(([k, price]) => { const n = cs[k] | 0; if (!n) return null; return (
                  <div className="ferme-shop-row" key={"cs" + k}>
                    <Sprite img={spritesReady ? spritesRef.current.craftIcons[k] : null} w={32} h={32} />
                    <div className="info"><b>{L.craftRow(L.craftName(k), n)}</b><span>{L.perPiece(price)}</span></div>
                    <button disabled={!n} onClick={() => sellCraft(k)}>{L.sellAll}</button>
                  </div>
                ); })}
                {(cs.cheeseWheel | 0) > 0 && (
                  <div style={{ textAlign: "right", marginTop: 4 }}>
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} tone="plain" small label={L.craftPortionBtn(C.PORTIONS_PER_WHEEL)} onClick={cutCheese} />
                  </div>
                )}
              </>);
            })()}
          </div>
        </div>
      )}

      {/* Minijeu de pêche (difficulté selon le type de poisson) */}
      {/* -------- 2026-07 station update: panels -------- */}
      {adsOpen && (
        <div className="ferme-modal open" onClick={() => setAdsOpen(false)}>
          <div className="panel ferme-modal-panel ferme-ads-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setAdsOpen(false)}>✕</button>
            <h3 style={{ marginTop: 0 }}>{L.adsTitle}</h3>
            <p style={{ fontSize: 13, opacity: .85, lineHeight: 1.5, margin: "0 0 12px" }}>{L.adsIntro}</p>
            <div className="ferme-ads-cats">
              {C.AD_CATEGORIES.map(cat => {
                const label = { crops: L.adCatCrops, animal: L.adCatAnimal, fish: L.adCatFish, resources: L.adCatResources }[cat];
                const on = adsSel.includes(cat);
                return (
                  <label key={cat} className={"ferme-ads-cat" + (on ? " on" : "")} onClick={() => setAdsSel(sel => on ? sel.filter(c => c !== cat) : [...sel, cat])}>
                    <span className="ferme-ads-check">{on ? "\u2714" : ""}</span>
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
            <p style={{ fontSize: 12, opacity: .7, margin: "12px 0" }}>{L.adsFee(C.AD_FEE)}</p>
            <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="check" tone="good" block label={L.adsSave} onClick={() => { sendReq({ kind: "adsSet", ads: adsSel }); setAdsOpen(false); }} />

            <div className="ferme-ads-sep" />
            <h4 style={{ margin: "4px 0 8px" }}>{L.adsBlacklistTitle}</h4>
            {(!stationSt || !stationSt.blacklist || !stationSt.blacklist.length)
              ? <p style={{ fontSize: 12, opacity: .7, margin: "2px 0" }}>{L.adsBlacklistEmpty}</p>
              : <div className="ferme-ads-list">{stationSt.blacklist.map(rid => <div key={rid} className="ferme-ads-row">{"\u{1F6AB}"} {(C.VISITOR_ROSTER[rid] || {}).name || "?"}</div>)}</div>}
            <p style={{ fontSize: 11, opacity: .6, margin: "8px 0 0" }}>{L.adsBlacklistHint}</p>

            <div className="ferme-ads-sep" />
            <h4 style={{ margin: "4px 0 8px" }}>{L.adsGiftsTitle}</h4>
            {(!stationSt || !stationSt.pendingGifts || !stationSt.pendingGifts.length)
              ? <p style={{ fontSize: 12, opacity: .7, margin: "2px 0" }}>{L.adsGiftsEmpty}</p>
              : <div className="ferme-ads-list">{stationSt.pendingGifts.map((g, gi) => <div key={gi} className="ferme-ads-row">{"\u{1F381}"} {L.adsGiftRow(giftLabel(g), (C.VISITOR_ROSTER[g.from] || {}).name || "?")}</div>)}</div>}
          </div>
        </div>
      )}
      {visitorOpen && stationSt && (() => {
        const v = ((stationSt.visitors || []).find(x => x.rid === visitorRid)) || null;
        if (!v) return null;
        const ro = C.VISITOR_ROSTER[v.rid] || C.VISITOR_ROSTER[0];
        const o = v.offer || {};
        const rel = (stationSt.rel && stationSt.rel[v.rid]) || 0;
        const have = o.type === "buy" ? ((myInv && myInv.crops && myInv.crops[o.crop]) || 0) : 0;
        const enough = o.type === "buy" ? have >= (o.n || 0) : false;
        const paper = { background: "#f5eeda", color: "#1d1d1d" };
        const cropDef = o.type === "buy" ? (C.CROPS[o.crop] || C.CROPS[0]) : null;
        const cropImg = cropDef && spritesReady ? spritesRef.current.crops[cropDef.id][C.CROP_STAGES - 1] : null;
        const cropNm = cropDef ? (lang === "en" ? cropDef.nameEn : cropDef.name) : "";
        // Zip 234: pixel hearts (Stardew style) — REL_HEART friendship points
        // per heart, 5 hearts max, so progress stays readable at a glance.
        const hearts = Math.min(5, Math.floor(rel / C.REL_HEART));
        const chatSection = (
          <div style={{ borderTop: "1px solid #c9b98f", marginTop: 8, paddingTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: .7, textTransform: "uppercase", letterSpacing: .5 }}>{L.visitorChatTitle}</div>
            {(v.chatLog && v.chatLog.length > 0) && (
              <div style={{ maxHeight: 96, overflowY: "auto", margin: "6px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {v.chatLog.map((cl, ci) => (
                  <div key={ci} className="ferme-vbubble">{(L.visitorChatLines[cl.tier] || L.visitorChatLines[0])[cl.li]}</div>
                ))}
              </div>
            )}
            <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="speech" label={L.visitorChatBtn} onClick={() => sendReq({ kind: "visitorChat", rid: v.rid })} />
          </div>
        );
        return (
          <div className="ferme-modal open" onClick={() => setVisitorOpen(false)}>
            <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()} style={{ width: "min(440px, 94vw)", ...paper }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ background: "#e8dfc4", border: "2px solid #6b4a2e", borderRadius: 6, padding: "4px 6px 0" }}>
                  <Sprite img={spritesReady ? spritesRef.current.getChar(ro.gender, ro.outfit, ro.overalls, ro.cap) : null} sx={16} sy={24} w={32} h={48} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#1d1d1d" }}>{L.visitorPanelTitle(ro.name)}</h3>
                  <div style={{ fontSize: 14, letterSpacing: 1, lineHeight: 1.2 }}>
                    {[0, 1, 2, 3, 4].map(hi => <span key={hi} className="ferme-vheart" style={{ color: hi < hearts ? "#d0342c" : "#cbb894" }}>{"\u2665"}</span>)}
                    <span style={{ fontSize: 11, opacity: .7, marginLeft: 6 }}>{L.visitorRelation(rel)}</span>
                  </div>
                  {v.disp === "hostile" && <div style={{ fontSize: 12, color: "#a33a1f", fontWeight: 700 }}>{L.visitorUrgent}</div>}
                </div>
              </div>
              {/* Zip 252 : visiteur à skill non encore résident -> proposer d'emménager. */}
              {ro.skill && !((stationSt.residents || []).some(r => r.rid === v.rid)) && (
                <div style={{ marginTop: 8, background: "#eef3df", border: "1px solid #b9c99a", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>{L.residentGreet(ro.name, ro.job)}</span>
                  <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="check" tone="good" small label={L.recruitAsk} onClick={() => askResidentStay(v.rid)} />
                </div>
              )}
              <div style={{ margin: "10px 0 4px", fontSize: 14 }}>
                {o.type === "buy" && <>
                  {/* The ASK, as pixels: crop icon x quantity, then the money. */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#efe5c8", border: "1px solid #c9b98f", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Sprite img={cropImg} w={40} h={40} />
                      <span style={{ fontWeight: 800, fontSize: 18 }}>{"\u00D7"}{o.n}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                      <b>{cropNm}</b><br />
                      {"\u{1FA99} "}{L.visitorPerUnit(o.price)}<br />
                      <b>{"\u{1FA99} "}{L.visitorTotal(o.n * o.price + (o.bonus || 0))}</b>
                    </div>
                  </div>
                  {o.easy ? <p style={{ fontSize: 12, opacity: .8, margin: "6px 0 0" }}>{L.visitorEasyNote}</p> : o.prep ? <p style={{ fontSize: 12, opacity: .8, margin: "6px 0 0" }}>{L.visitorPrepNote}</p> : null}
                  {o.bonus ? <p style={{ color: "#8a5a00", fontWeight: 700, margin: "4px 0 0" }}>{L.visitorRichBonus(o.bonus)}</p> : null}
                  {o.reward && o.reward.kind !== "gold" ? <p style={{ color: "#7a3aa0", fontWeight: 700, margin: "4px 0 0" }}>{"\u{1F381} "}{L.visitorRewardGift(giftLabel(o.reward))}</p> : null}
                  {/* Inventory comparison: how much I carry vs what they want. */}
                  <div style={{ margin: "8px 0 2px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Sprite img={cropImg} w={22} h={22} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, opacity: .75 }}>{L.visitorPocket}</div>
                      <div className="ferme-vbar"><div style={{ width: `${Math.min(100, Math.round((have / Math.max(1, o.n)) * 100))}%`, background: enough ? "#4e9a3f" : "#c9812e" }} /></div>
                    </div>
                    <b style={{ color: enough ? "#1d6b2a" : "#a33a1f", fontSize: 15 }}>{have} / {o.n}</b>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="check" tone="good" disabled={!enough} label={L.visitorAccept} onClick={() => { sendReq({ kind: "visitorDeal", rid: v.rid }); setVisitorOpen(false); }} />
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="cross" tone="ghost" label={L.visitorCloseBtn} onClick={() => setVisitorOpen(false)} />
                  </div>
                  {chatSection}
                </>}
                {o.type === "swap" && (() => {
                  // Zip 237: barter card — what they want (from our produce) vs
                  // what they give. Pixel icons on both sides.
                  const w2 = o.want || {}; const give = o.give || {};
                  const wImg = !spritesReady ? null
                    : w2.kind === "crop" ? spritesRef.current.crops[w2.id][C.CROP_STAGES - 1]
                    : w2.kind === "fish" ? spritesRef.current.fishIcons[w2.id]
                    : spritesRef.current.products[w2.id];
                  const wName = w2.kind === "crop" ? cropName(w2.id)
                    : w2.kind === "fish" ? (lang === "en" ? (C.FISH[w2.id] || {}).nameEn : (C.FISH[w2.id] || {}).name)
                    : (lang === "en" ? (C.ANIMALS[w2.id] || {}).prodEn : (C.ANIMALS[w2.id] || {}).prod);
                  const haveW = !myInv ? 0 : w2.kind === "crop" ? ((myInv.crops || [])[w2.id] || 0)
                    : w2.kind === "fish" ? ((myInv.fish || [])[w2.id] || 0)
                    : ((myInv.products || [])[w2.id] || 0);
                  const okSwap = haveW >= (w2.n || 0);
                  const giveImg = !spritesReady ? null
                    : give.kind === "pet" ? spritesRef.current.pets[give.petId]
                    : give.kind === "seed" ? spritesRef.current.crops[give.cropId][C.CROP_STAGES - 1]
                    : give.kind === "useful" ? spritesRef.current.icons[give.item === "salve" ? "energy" : give.item === "healKit" ? "energy" : give.item] || spritesRef.current.icons.gold
                    : null;
                  return (<>
                    <h4 style={{ margin: "4px 0 8px" }}>{L.swapTitle(ro.name)}</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#efe5c8", border: "1px solid #c9b98f", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>{L.swapWantLabel}</div>
                        <Sprite img={wImg} w={40} h={40} />
                        <div style={{ fontWeight: 800 }}>{"\u00D7"}{w2.n} {wName}</div>
                      </div>
                      <div style={{ fontSize: 22 }}>{"\u{1F501}"}</div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 11, opacity: .7, marginBottom: 4 }}>{L.swapGiveLabel}</div>
                        {giveImg ? <Sprite img={giveImg} w={40} h={40} /> : <div style={{ fontSize: 30 }}>{"\u{1F381}"}</div>}
                        <div style={{ fontWeight: 800 }}>{giftLabel(give)}</div>
                      </div>
                    </div>
                    <div style={{ margin: "8px 0 2px", fontSize: 12, color: okSwap ? "#1d6b2a" : "#a33a1f", fontWeight: 700, textAlign: "right" }}>{L.swapPocket(haveW, w2.n)}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="swap" tone="good" disabled={!okSwap} label={L.swapAcceptBtn} onClick={() => { sendReq({ kind: "visitorSwap", rid: v.rid }); setVisitorOpen(false); }} />
                      <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="cross" tone="ghost" label={L.visitorCloseBtn} onClick={() => setVisitorOpen(false)} />
                    </div>
                    {chatSection}
                  </>);
                })()}
                {o.type === "chat" && <>
                  <p style={{ margin: "2px 0" }}>{L.visitorWantsChat(ro.name)}</p>
                  {chatSection}
                </>}
                {o.type === "demand" && <>
                  <p style={{ color: "#a33a1f", fontWeight: 700 }}>{L.visitorDemand(ro.name, o.gold)}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="coin2" tone="gold" label={L.visitorPayBtn(o.gold)} onClick={() => { sendReq({ kind: "visitorPay", rid: v.rid }); setVisitorOpen(false); }} />
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="cross" tone="bad" label={L.visitorRefuseBtn} onClick={() => { sendReq({ kind: "visitorRefuse", rid: v.rid }); setVisitorOpen(false); }} />
                  </div>
                </>}
                {o.type === "stay" && <>
                  <h4 style={{ margin: "4px 0" }}>{L.stayTitle(ro.name)}</h4>
                  <p>{L.stayProposal(ro.name, ro.job)}</p>
                  {myVote === null ? <div style={{ display: "flex", gap: 8 }}>
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="check" tone="good" label={L.voteYes} onClick={() => { setMyVote(true); sendReq({ kind: "visitorVote", rid: v.rid, v: true }); }} />
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="cross" tone="bad" label={L.voteNo} onClick={() => { setMyVote(false); sendReq({ kind: "visitorVote", rid: v.rid, v: false }); }} />
                  </div> : <p style={{ opacity: .8 }}>{L.voteWaiting}</p>}
                </>}
                {o.type === "plea" && <>
                  {/* Zip 259 : supplique d'un ex-résident exclu. Le ton dépend
                      de o.mood (touchant / aigri / sain). Oui = réintègre (si
                      maison libre), Non = il repart. */}
                  <h4 style={{ margin: "4px 0" }}>{L.pleaTitle(ro.name)}</h4>
                  <p style={{ fontStyle: "italic", color: o.mood === "bitter" ? "#a33a1f" : "#3a3a3a" }}>« {L.exilePlea(o.mood, o.vi | 0)} »</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="check" tone="good" label={L.pleaAccept} onClick={() => { sendReq({ kind: "pleaResolve", rid: v.rid, accept: true }); setVisitorOpen(false); }} />
                    <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="cross" tone="bad" label={L.pleaRefuse} onClick={() => { sendReq({ kind: "pleaResolve", rid: v.rid, accept: false }); setVisitorOpen(false); }} />
                  </div>
                </>}
                {o.type === "done" && <>
                  <p style={{ opacity: .85, margin: "2px 0" }}>{L.visitorThanks(ro.name)}</p>
                  {chatSection}
                </>}
              </div>
              <div style={{ marginTop: 10, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="bell" small label={L.meetAtHallBtn} onClick={() => { sendReq({ kind: "visitorRecall", rid: v.rid }); }} />
                <PixBtn sprites={spritesReady ? spritesRef.current : null} icon="ban" tone="bad" small label={L.visitorBlacklistBtn} onClick={() => { sendReq({ kind: "visitorBlacklist", rid: v.rid }); setVisitorOpen(false); }} />
              </div>
            </div>
          </div>
        );
      })()}
      {/* Corner notifications (zip 233): one paper card per waiting visitor
          (up to 3, then "+N more"), each with a remote "Meet me at townhall"
          button that opens the SAME visitor card without walking over -
          Guillaume: black text on paper, not yellow-on-dark. */}
      {stationSt && (stationSt.visitors || []).some(vv => vv.phase === "wait") && !visitorOpen && !nearHall && (() => {
        const waiting = (stationSt.visitors || []).filter(vv => vv.phase === "wait");
        const shown = waiting.slice(0, 3);
        const card = { background: "#f5eeda", border: "1px solid #6b4a2e", borderRadius: 10, padding: "8px 10px", display: "flex", gap: 10, alignItems: "center", color: "#1d1d1d" };
        return (
          <div style={{ position: "fixed", right: 12, top: 120, zIndex: 40, display: "flex", flexDirection: "column", gap: 6, maxWidth: 280 }}>
            {shown.map(vv => {
              const ro = C.VISITOR_ROSTER[vv.rid] || C.VISITOR_ROSTER[0];
              const o = vv.offer || {};
              const ask = o.type === "buy" ? L.notifWantsBuy(o.n, (lang === "en" ? (C.CROPS[o.crop] || {}).nameEn : (C.CROPS[o.crop] || {}).name))
                : o.type === "demand" ? L.notifDemand(o.gold)
                : o.type === "swap" ? L.notifSwap
                : o.type === "stay" ? L.notifStay : o.type === "plea" ? L.notifPlea : L.notifWantsChat;
              return (
                <div key={vv.rid} style={card}>
                  <Sprite img={spritesReady ? spritesRef.current.getChar(ro.gender, ro.outfit, ro.overalls, ro.cap) : null} sx={16} sy={24} w={24} h={36} />
                  <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                    <b>{L.notifAsk(ro.name)}</b><br />
                    {o.type === "buy" && spritesReady && <span style={{ verticalAlign: "middle", marginRight: 4, display: "inline-block" }}><Sprite img={spritesRef.current.crops[o.crop][C.CROP_STAGES - 1]} w={18} h={18} /></span>}
                    {ask}
                    {o.type === "demand" && <span style={{ color: "#a33a1f", fontWeight: 700 }}> · {L.visitorUrgent}</span>}
                    <br /><span style={{ display: "inline-block", marginTop: 4 }}><PixBtn sprites={spritesReady ? spritesRef.current : null} icon="bell" small label={L.meetBtn} onClick={() => { setMyVote(null); setVisitorRid(vv.rid); setVisitorOpen(true); sendReq({ kind: "visitorRecall", rid: vv.rid }); }} /></span>
                  </div>
                </div>
              );
            })}
            {waiting.length > 3 && <div style={{ ...card, fontSize: 12, padding: "4px 10px" }}>{L.notifMore(waiting.length - 3)}</div>}
          </div>
        );
      })()}
      {/* Zip 258 : notifications coin haut-droite "à côté de l'écran des
          employés" (demande Guillaume). (1) Alerte pâtissière quand le four est
          en rupture d'ingrédients — clic -> ouvre le menu Employés (badge sur
          la pâtissière). (2) Avis de retour d'Eduardo avec ce qu'il rapporte —
          clic -> ouvre le menu Employés puis se dissipe. */}
      {!employeesOpen && (() => {
        const crafts = sharedRef.current.crafts || {};
        const bakeryAlert = crafts.bakery && crafts.bakery.built && crafts.bakery.alert;
        const notice = stationSt && stationSt.voyagerNotice;
        if (!bakeryAlert && !notice) return null;
        const card = { background: "#f5eeda", border: "1px solid #6b4a2e", borderRadius: 10, padding: "8px 10px", color: "#1d1d1d", fontSize: 12, lineHeight: 1.35, cursor: "pointer" };
        return (
          <div style={{ position: "fixed", right: 12, top: 320, zIndex: 40, display: "flex", flexDirection: "column", gap: 6, maxWidth: 280 }}>
            {bakeryAlert && (
              <div style={{ ...card, borderColor: "#c0392b" }} onClick={() => setEmployeesOpen(true)}>
                <b>⚠️ {L.bakeryAlertTitle}</b><br />{L.bakeryAlertMsg}
              </div>
            )}
            {notice && (
              <div style={card} onClick={() => { sharedRef.current.station.voyagerNotice = null; setStationSt(s => s ? { ...s, voyagerNotice: null } : s); setEmployeesOpen(true); }}>
                <b>🧳 {L.voyagerReturnNotifTitle}</b><br />
                {Object.keys(notice.goods || {}).map(k => `${L.worldGoodName(k)} ×${notice.goods[k]}`).join(", ")}{notice.surprise ? L.voyagerSurpriseTag : ""}
              </div>
            )}
          </div>
        );
      })()}
      {/* Zip 259 : encart d'info production à l'approche d'un bâtiment
          d'artisan (ruche / fromagerie / boulangerie). Lecture seule de l'état
          partagé, affiché en bas au centre. */}
      {nearArtisan && (() => {
        const bid = nearArtisan;
        const crafts = sharedRef.current.crafts || {};
        if (!crafts[bid] || !crafts[bid].built) return null;
        const cs = sharedRef.current.craftStock || {};
        const line = bid === "beehive" ? L.residentProdHoney(cs.honey | 0)
          : bid === "fromagerie" ? L.residentProdCheese(cs.cheeseWheel | 0, cs.cheesePortion | 0)
          : (crafts.bakery && crafts.bakery.alert) ? L.bakeryAlertLine : L.residentProdPastry(cs.pastry | 0);
        const alert = bid === "bakery" && crafts.bakery && crafts.bakery.alert;
        return (
          <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 92, zIndex: 39, background: "#f5eeda", border: `1px solid ${alert ? "#c0392b" : "#6b4a2e"}`, borderRadius: 10, padding: "6px 12px", color: "#1d1d1d", fontSize: 12, maxWidth: 320, textAlign: "center", pointerEvents: "none" }}>
            <b>{L.buildingName(bid)}</b><br />{line}
          </div>
        );
      })()}
      {repairMini && <RepairMinigame name={repairMini.name} L={L} onDone={(win) => { setRepairMini(null); sendReq({ kind: "repairResult", win }); pushToast(win ? L.repairWin : L.repairFail); }} />}
      {fishMini && <FishMinigame mode={fishMini.mode} fish={fishMini.fish} L={L} lang={lang} onWin={fishWon} onFail={fishLost} />}
      {barnMini && <BarnMinigame level={barnMini.level} L={L} onWin={barnWon} onFail={barnLost} />}
      {wolfBite && <WolfBiteMinigame L={L} onWin={wolfBiteWon} onFail={wolfBiteLost} />}
      {evilBite && <EvilBiteMinigame L={L} onWin={evilBiteWon} onFail={evilBiteLost} />}

      {/* Carte plein écran (nouveauté) : positions live, fermeture au clic/Échap/M */}
      {mapOpen && (
        <div className="ferme-map-ov" onClick={() => setMapOpen(false)}>
          <div className="ferme-map-box panel" onClick={e => e.stopPropagation()}>
            <h2>{L.mapTitle}</h2>
            <canvas ref={mapCanvasRef} className="ferme-map-canvas" />
            <div className="ferme-map-close">{L.mapClose}</div>
            <button className="ferme-btn" style={{ marginTop: 8 }} onClick={() => setMapOpen(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );

  function seedName(i) { return lang === "en" ? C.CROPS[i].seedNameEn : C.CROPS[i].seedName; }
}

/* Petit composant : dessine un sprite (canvas hors-écran) à une taille donnée.
   sx/sy = découpe source (pour n'afficher qu'une frame d'une feuille). */
function Sprite({ img, w = 32, h = 32, sx, sy }) {
  const ref = useCallback((node) => {
    if (!node || !img) return;
    const sw = sx || img.width, sh = sy || img.height;
    node.width = sw; node.height = sh;
    const g = node.getContext("2d"); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, sw, sh);
    g.drawImage(img, 0, 0, sw, sh, 0, 0, sw, sh);
  }, [img, sx, sy]);
  return <canvas ref={ref} style={{ width: w, height: h, imageRendering: "pixelated" }} />;
}

/* Zip 237: pixel-themed button. Renders an optional pixel icon sprite next to
   a label inside a chunky beveled button (.ferme-pixbtn). `tone` picks the
   color variant (good/bad/gold/ghost/plain). Used to replace the old
   emoji-as-button rows across the visitor card and ad board. */
function PixBtn({ icon, label, tone = "plain", disabled, onClick, small, sprites, block }) {
  const img = icon && sprites ? sprites.icons[icon] : null;
  return (
    <button
      className={"ferme-pixbtn" + (tone ? " " + tone : "") + (small ? " small" : "") + (block ? " block" : "")}
      disabled={disabled}
      onClick={onClick}
    >
      {img && <span className="ferme-pixbtn-ico"><Sprite img={img} w={small ? 16 : 20} h={small ? 16 : 20} /></span>}
      <span className="ferme-pixbtn-label">{label}</span>
    </button>
  );
}

/* ============================================================================
   Minijeu de pêche : la difficulté dépend du type de poisson.
   mode 0 (gardon)  : barre de timing, cliquer dans la zone verte.
   mode 1 (truite)  : maintenir la barre sur le poisson jusqu'à remplir la jauge.
   mode 2 (brochet) : réaction, cliquer dès que le cadre devient vert.
   Entièrement local (clic ou Espace) ; sur victoire, le parent envoie la prise.
   ============================================================================ */
function FishMinigame({ mode, fish, L, lang, onWin, onFail }) {
  const [, force] = useState(0);
  const s = useRef(null);
  const done = useRef(false);
  const held = useRef(false);
  const fishInfo = C.FISH[fish] || C.FISH[0];

  const finish = (kind, tooSoon) => { if (done.current) return; done.current = true; if (kind === "win") onWin(); else onFail(!!tooSoon); };
  const press = () => {
    const st = s.current; if (!st || done.current) return;
    if (mode === 0) finish(st.cursor >= 0.37 && st.cursor <= 0.63 ? "win" : "fail");
    else if (mode === 2) finish(st.phase === "wait" ? "fail" : "win", st.phase === "wait");
  };

  useEffect(() => {
    const st = { t0: performance.now() };
    if (mode === 0) { st.cursor = 0; st.dir = 1; st.speed = 0.95; }
    else if (mode === 1) { st.fish = 0.5; st.fishV = 0; st.bar = 0.5; st.barV = 0; st.prog = 0.28; }
    else { st.phase = "wait"; st.goAt = performance.now() + 1200 + Math.random() * 1500; st.goShownAt = 0; }
    s.current = st;
    let raf = 0, last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st2 = s.current; if (!st2 || done.current) return;
      if (mode === 0) {
        st2.cursor += st2.dir * st2.speed * dt;
        if (st2.cursor > 1) { st2.cursor = 1; st2.dir = -1; } if (st2.cursor < 0) { st2.cursor = 0; st2.dir = 1; }
        if (now - st2.t0 > 8000) return finish("fail");
      } else if (mode === 1) {
        st2.fishV += (Math.random() - 0.5) * 1.1 * dt; st2.fishV *= 0.95; st2.fish += st2.fishV * dt;
        if (st2.fish < 0.06) { st2.fish = 0.06; st2.fishV = Math.abs(st2.fishV); } if (st2.fish > 0.94) { st2.fish = 0.94; st2.fishV = -Math.abs(st2.fishV); }
        st2.barV += (held.current ? -1.5 : 1.5) * dt; st2.barV *= 0.9; st2.bar += st2.barV * dt;
        if (st2.bar < 0.05) { st2.bar = 0.05; st2.barV = 0; } if (st2.bar > 0.95) { st2.bar = 0.95; st2.barV = 0; }
        const overlap = Math.abs(st2.bar - st2.fish) < 0.12;
        st2.prog += (overlap ? 0.55 : -0.32) * dt; st2.prog = Math.max(0, Math.min(1, st2.prog));
        if (st2.prog >= 1) return finish("win");
        if (now - st2.t0 > 13000) return finish("fail");
      } else {
        if (st2.phase === "wait" && now >= st2.goAt) { st2.phase = "go"; st2.goShownAt = now; }
        if (st2.phase === "go" && now - st2.goShownAt > 700) return finish("fail");
      }
      force(v => (v + 1) % 1000000);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) { held.current = true; press(); } } };
    const onKeyUp = (e) => { if (e.code === "Space") held.current = false; };
    const onUp = () => { held.current = false; };
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("pointerup", onUp);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("pointerup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const st = s.current;
  const title = mode === 0 ? L.fishTimingTitle : mode === 1 ? L.fishHoldTitle : L.fishReactTitle;
  const hint = mode === 0 ? L.fishTimingHint : mode === 1 ? L.fishHoldHint : L.fishReactHint;
  const onDown = (e) => { e.preventDefault(); held.current = true; press(); };

  return (
    <div className="ferme-fish-ov" onPointerDown={onDown}>
      <div className="ferme-fish-box panel" onPointerDown={onDown}>
        <div className="ferme-fish-title">{title}</div>
        <div className="ferme-fish-sub">{lang === "en" ? fishInfo.nameEn : fishInfo.name}</div>
        {mode === 0 && (
          <div className="ferme-fish-bar">
            <div className="ferme-fish-zone" />
            <div className="ferme-fish-cursor" style={{ left: `${(st ? st.cursor : 0) * 100}%` }} />
          </div>
        )}
        {mode === 1 && (
          <div className="ferme-fish-vwrap">
            <div className="ferme-fish-vbar">
              <div className="ferme-fish-vfish" style={{ top: `${(st ? st.fish : 0.5) * 100}%` }}>🐟</div>
              <div className="ferme-fish-vbracket" style={{ top: `${(st ? st.bar : 0.5) * 100}%` }} />
            </div>
            <div className="ferme-fish-prog"><div style={{ height: `${(st ? st.prog : 0) * 100}%` }} /></div>
          </div>
        )}
        {mode === 2 && (
          <div className={"ferme-fish-react" + (st && st.phase === "go" ? " go" : "")}>
            {st && st.phase === "go" ? L.fishReactNow : "..."}
          </div>
        )}
        <div className="ferme-fish-hint">{hint}</div>
      </div>
    </div>
  );
}

// Mini-jeu de construction de la grange (rythme, même famille que le mode 0
// de la pêche : un curseur oscille sur une barre, il faut cliquer/Espace
// pile dans la zone). Contrairement à la pêche, plusieurs réussites sont
// nécessaires (def.hits, croissant avec le palier) avant l'échéance, la
// vitesse du curseur augmente légèrement à chaque coup réussi pour donner
// un vrai sentiment de montée en difficulté au fil de la construction.
// Réutilise volontairement les classes CSS .ferme-fish-* existantes (même
// famille de mini-jeu plein écran), aucun nouveau style nécessaire.
function BarnMinigame({ level, L, onWin, onFail }) {
  const [, force] = useState(0);
  const s = useRef(null);
  const done = useRef(false);
  const def = C.BARN_LEVELS[level - 1] || C.BARN_LEVELS[0];
  const needed = def.hits;
  const timeLimit = 12000 + level * 3000;

  const finish = (kind) => { if (done.current) return; done.current = true; if (kind === "win") onWin(); else onFail(); };
  const press = () => {
    const st = s.current; if (!st || done.current) return;
    if (st.cursor >= 0.37 && st.cursor <= 0.63) {
      st.hits += 1; st.speed = Math.min(2.2, st.speed + 0.12);
      if (st.hits >= needed) finish("win");
    } else st.miss += 1;
  };

  useEffect(() => {
    const st = { t0: performance.now(), cursor: 0, dir: 1, speed: 0.9, hits: 0, miss: 0 };
    s.current = st;
    let raf = 0, last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st2 = s.current; if (!st2 || done.current) return;
      st2.cursor += st2.dir * st2.speed * dt;
      if (st2.cursor > 1) { st2.cursor = 1; st2.dir = -1; } if (st2.cursor < 0) { st2.cursor = 0; st2.dir = 1; }
      if (now - st2.t0 > timeLimit) return finish("fail");
      force(v => (v + 1) % 1000000);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); } };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const st = s.current;
  const onDown = (e) => { e.preventDefault(); press(); };

  return (
    <div className="ferme-fish-ov" onPointerDown={onDown}>
      <div className="ferme-fish-box panel" onPointerDown={onDown}>
        <div className="ferme-fish-title">{L.barnMiniTitle(level)}</div>
        <div className="ferme-fish-sub">{L.barnMiniSub(st ? st.hits : 0, needed)}</div>
        <div className="ferme-fish-bar">
          <div className="ferme-fish-zone" />
          <div className="ferme-fish-cursor" style={{ left: `${(st ? st.cursor : 0) * 100}%` }} />
        </div>
        <div className="ferme-fish-hint">{L.barnMiniHint}</div>
      </div>
    </div>
  );
}

/* ============================================================================
   Mini-jeu de morsure (loup agressif, chantier 2026-07, demande Guillaume) :
   plein écran, fond rouge. Il faut marteler Espace/clic pour faire monter la
   jauge de lutte jusqu'à 1 AVANT C.WOLF_BITE_REACT_MS, sans quoi (ou si le
   joueur ne réagit pas du tout) c'est un échec — voir onFail, qui se contente
   d'informer l'hôte : la blessure elle-même est appliquée côté hôte (délai de
   grâce wf.biteDeadline dans updateWolves), ce composant ne fait que tenter
   de la devancer.
   Rééquilibré 2026-07 (retour Guillaume : quasi impossible à gagner) : gain
   par appui relevé (0.11 -> 0.16) et décroissance de la jauge adoucie
   (0.55/s -> 0.38/s), en plus de la fenêtre allongée (C.WOLF_BITE_REACT_MS,
   voir fermeConstants.js). Reste un vrai mini-jeu (mash insuffisant = échec),
   mais un martelage normal (~5 appuis/s) suffit désormais à gagner.
   ============================================================================ */
function WolfBiteMinigame({ L, onWin, onFail }) {
  const [, force] = useState(0);
  const s = useRef(null);
  const done = useRef(false);

  const finish = (kind) => { if (done.current) return; done.current = true; if (kind === "win") onWin(); else onFail(); };
  const press = () => {
    const st = s.current; if (!st || done.current) return;
    st.prog = Math.min(1, st.prog + 0.16);
    if (st.prog >= 1) finish("win");
  };

  useEffect(() => {
    const st = { t0: performance.now(), prog: 0 };
    s.current = st;
    let raf = 0, last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st2 = s.current; if (!st2 || done.current) return;
      st2.prog = Math.max(0, st2.prog - 0.38 * dt); // décroissance adoucie : il faut marteler, mais un rythme normal suffit
      if (now - st2.t0 > C.WOLF_BITE_REACT_MS) return finish("fail");
      force(v => (v + 1) % 1000000);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); } };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = s.current;
  const prog = st ? st.prog : 0;
  const msLeft = st ? Math.max(0, C.WOLF_BITE_REACT_MS - (performance.now() - st.t0)) : C.WOLF_BITE_REACT_MS;
  const onDown = (e) => { e.preventDefault(); press(); };

  return (
    <div
      className="ferme-fish-ov"
      onPointerDown={onDown}
      style={{ background: "rgba(120,0,0,0.55)", animation: "fermeWolfBitePulse 0.5s infinite alternate" }}
    >
      <style>{`@keyframes fermeWolfBitePulse { from { background-color: rgba(120,0,0,0.55); } to { background-color: rgba(200,0,0,0.75); } }`}</style>
      <div className="ferme-fish-box panel" onPointerDown={onDown} style={{ borderColor: "#c0392b" }}>
        <div className="ferme-fish-title" style={{ color: "#ffdada" }}>{L.wolfBiteTitle}</div>
        <div className="ferme-fish-bar">
          <div className="ferme-fish-cursor" style={{ left: `${prog * 100}%`, background: "#ff3b3b" }} />
          <div style={{
            position: "absolute", inset: 0, background: "#ff5555",
            width: `${prog * 100}%`, opacity: 0.55, borderRadius: "inherit",
          }} />
        </div>
        <div className="ferme-fish-hint">{L.wolfBiteHint} ({Math.ceil(msLeft / 100) / 10}s)</div>
      </div>
    </div>
  );
}

/* ============================================================================
   Mini-jeu de morsure des créatures maléfiques (chantier 2026-07, demande
   Guillaume : "ajoute un minijeu pour résister à la morsure"). Même mécanique
   de martelage que WolfBiteMinigame ci-dessus (marteler Espace/clic pour
   faire monter la jauge avant C.EVIL_BITE_REACT_MS), copiée plutôt que
   généralisée en composant paramétrable pour ne pas risquer de régression
   sur le mini-jeu loup existant, déjà rééquilibré (voir commentaire de
   WolfBiteMinigame). Seule différence demandée par Guillaume : l'overlay
   n'est PAS rouge comme celui du loup, mais "en mode nuit" — un violet
   profond, cohérent avec la teinte déjà utilisée partout ailleurs dans le
   monde maléfique (lac, passage sombre, lueur des rochers, voir
   drawEvilFrame) plutôt qu'une nouvelle couleur inventée pour l'occasion.
   ============================================================================ */
function EvilBiteMinigame({ L, onWin, onFail }) {
  const [, force] = useState(0);
  const s = useRef(null);
  const done = useRef(false);

  const finish = (kind) => { if (done.current) return; done.current = true; if (kind === "win") onWin(); else onFail(); };
  const press = () => {
    const st = s.current; if (!st || done.current) return;
    st.prog = Math.min(1, st.prog + 0.16);
    if (st.prog >= 1) finish("win");
  };

  useEffect(() => {
    const st = { t0: performance.now(), prog: 0 };
    s.current = st;
    let raf = 0, last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const st2 = s.current; if (!st2 || done.current) return;
      st2.prog = Math.max(0, st2.prog - 0.38 * dt);
      if (now - st2.t0 > C.EVIL_BITE_REACT_MS) return finish("fail");
      force(v => (v + 1) % 1000000);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => { if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); } };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = s.current;
  const prog = st ? st.prog : 0;
  const msLeft = st ? Math.max(0, C.EVIL_BITE_REACT_MS - (performance.now() - st.t0)) : C.EVIL_BITE_REACT_MS;
  const onDown = (e) => { e.preventDefault(); press(); };

  return (
    <div
      className="ferme-fish-ov"
      onPointerDown={onDown}
      style={{ background: "rgba(30,10,60,0.72)", animation: "fermeEvilBitePulse 0.5s infinite alternate" }}
    >
      <style>{`@keyframes fermeEvilBitePulse { from { background-color: rgba(30,10,60,0.72); } to { background-color: rgba(70,25,120,0.85); } }`}</style>
      <div className="ferme-fish-box panel" onPointerDown={onDown} style={{ borderColor: "#8c5ae0" }}>
        <div className="ferme-fish-title" style={{ color: "#e6d9ff" }}>{L.evilBiteTitle}</div>
        <div className="ferme-fish-bar">
          <div className="ferme-fish-cursor" style={{ left: `${prog * 100}%`, background: "#a86bff" }} />
          <div style={{
            position: "absolute", inset: 0, background: "#8c5ae0",
            width: `${prog * 100}%`, opacity: 0.55, borderRadius: "inherit",
          }} />
        </div>
        <div className="ferme-fish-hint">{L.evilBiteHint} ({Math.ceil(msLeft / 100) / 10}s)</div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   2026-07 station update: co-op repair minigame after a hostile raid.
   Deliberately EASIER than the wolf-bite duel (Guillaume: "not too hard, not
   like the wolves"): a cursor sweeps a bar, click or press Space while it is
   inside the wide green zone. REPAIR_HITS hits win; 6 misses or 20 s fail.
   Each online player plays their own copy; the host counts the wins (2 needed,
   or a single one when playing solo) and restores 100% of the damage.
   -------------------------------------------------------------------------- */
function RepairMinigame({ name, L, onDone }) {
  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const stateRef = useRef({ pos: 0, hits: 0, misses: 0, done: false, t0: performance.now() });
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const st = stateRef.current;
      if (st.done) return;
      const t = (performance.now() - st.t0) / 1000;
      st.pos = (Math.sin(t * 2.4) + 1) / 2;
      setPos(st.pos);
      if (t > 20) { st.done = true; onDoneRef.current(false); }
    };
    raf = requestAnimationFrame(loop);
    const hit = () => {
      const st = stateRef.current;
      if (st.done) return;
      if (st.pos >= 0.36 && st.pos <= 0.64) {
        st.hits++; setHits(st.hits);
        if (st.hits >= C.REPAIR_HITS) { st.done = true; onDoneRef.current(true); }
      } else {
        st.misses++; setMisses(st.misses);
        if (st.misses >= 6) { st.done = true; onDoneRef.current(false); }
      }
    };
    const onKey = (e) => { if (e.code === "Space") { e.preventDefault(); hit(); } };
    const onClick = () => hit();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);
  return (
    <div className="ferme-modal open">
      <div className="panel ferme-modal-panel" style={{ width: "min(380px, 94vw)", textAlign: "center" }}>
        <h3 style={{ marginTop: 0 }}>{L.repairTitle}</h3>
        <p style={{ fontSize: 13 }}>{L.repairIntro(name)}</p>
        <div style={{ position: "relative", height: 26, background: "#2a2f3a", borderRadius: 8, overflow: "hidden", margin: "10px 0" }}>
          <div style={{ position: "absolute", left: "36%", width: "28%", top: 0, bottom: 0, background: "rgba(90,200,110,0.5)" }} />
          <div style={{ position: "absolute", left: `calc(${(pos * 100).toFixed(1)}% - 3px)`, width: 6, top: 0, bottom: 0, background: "#ffe060", borderRadius: 3 }} />
        </div>
        <p style={{ fontSize: 13 }}>{L.repairHits(hits, C.REPAIR_HITS)} · ❌ {misses}/6</p>
      </div>
    </div>
  );
}
