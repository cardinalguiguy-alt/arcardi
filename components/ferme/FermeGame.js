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

export default function FermeGame({ room, me, isHost, players, t, lang, onFinish, savedCode, onCodeLoaded }) {
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
  const [injuredUntil, setInjuredUntil] = useState(0); // horodatage de fin d'indisponibilité (0 = pas blessé), survit à un refresh (voir farmer.injuredUntil)
  const [immunityUntil, setImmunityUntil] = useState(0); // pommade de protection (chantier 2026-07) : horodatage de fin d'immunité/répulsion aux créatures maléfiques (0 = inactif), effet purement local, ne survit pas à un refresh
  const [shopOpen, setShopOpen] = useState(false);
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
  const [mapOpen, setMapOpen] = useState(false);
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
  const [gems, setGems] = useState(() => C.GEMS.map(() => 0)); // miroir React de sharedRef.current.gems (pool commun à la salle)
  const [flour, setFlour] = useState(0); // miroir React de sharedRef.current.flour (sacs de farine, pool commun à la salle, chantier 2026-07)
  const [gregStock, setGregStock] = useState(() => ({ wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) })); // miroir React de sharedRef.current.gregStock (bois/pierre récoltés par Greg + engrais acheté + poissons pêchés par Soan, pool commun, chantier 2026-07)
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
  // Transition en fondu au noir (aller ET retour) : { active, t0, toEvil,
  // swapped }. `swapped` marque le moment (mi-fondu, écran totalement noir)
  // où la téléportation réelle a lieu, pour qu'elle soit invisible.
  const zoneTransRef = useRef({ active: false, t0: 0, toEvil: false, swapped: false });
  const meRef = useRef(null);
  const playersRef = useRef(new Map()); // id -> remote farmer render data
  const farmersRef = useRef({});        // hôte : id -> état privé arbitré
  const sharedRef = useRef({ seed: 0, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), salveCraft: E.newSalveCraftState(), flour: 0, gregStock: { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) }, fertilizerShop: { stock: 0, lastRestockDay: 0 }, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [], rabbitChallenge: null, greg: null, soan: null });
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
  const mapOpenRef = useRef(false);
  const shopOpenRef = useRef(false);
  const binOpenRef = useRef(false);
  const toastIdRef = useRef(0);
  const chatIdRef = useRef(0);
  const farmCodeRef = useRef("");      // code de la ferme durable en cours
  const autoJoinTriedRef = useRef(false);
  const fishTileRef = useRef(null);    // case d'eau ciblée par le minijeu de pêche
  const fishMiniRef = useRef(false);   // un mini-jeu plein écran est en cours (pêche OU construction de la grange) : bloque le reste
  const autoHarvestPendingRef = useRef(new Set()); // tuiles de récolte auto déjà demandées (anti-spam)
  const autoWaterPendingRef = useRef(new Set());   // tuiles d'arrosage auto déjà demandées (anti-spam)
  const autoCollectPendingRef = useRef(new Set()); // animaux de collecte auto déjà demandés (anti-spam)
  const fenceDirRef = useRef("auto"); // orientation choisie pour la prochaine clôture posée ("auto"|"h"|"v")
  const buildKindRef = useRef("fence"); // miroir synchrone de buildKind ("fence"|"wall"|"path"|"lamp"|"scarecrow"|"grass"|"mill"|"bridgeWood"|"bridgeStone")
  const heldAnimalRef = useRef(-1);   // index (dans sharedRef.animals) de l'animal actuellement porté par CE joueur, -1 sinon
  const horseCallAccumRef = useRef(0); // accumulateur (secondes) pour throttler la diffusion réseau des chevaux sifflés en course
  const wolfAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour les loups simulés côté hôte
  const rabbitAccumRef = useRef(0);    // accumulateur (secondes), même throttle réseau pour les lapins simulés côté hôte
  const gregAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour Greg simulé côté hôte
  const soanAccumRef = useRef(0);      // accumulateur (secondes), même throttle réseau pour Soan simulé côté hôte
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

  useEffect(() => { fishMiniRef.current = !!fishMini || !!barnMini || !!wolfBite; }, [fishMini, barnMini, wolfBite]);
  useEffect(() => { injuredUntilRef.current = injuredUntil || 0; }, [injuredUntil]);
  useEffect(() => { immunityUntilRef.current = immunityUntil || 0; }, [immunityUntil]);
  useEffect(() => { hatUntilRef.current = hatUntil || 0; }, [hatUntil]);
  useEffect(() => { rabbitChallengeOfferRef.current = !!rabbitChallengeOffer; }, [rabbitChallengeOffer]);
  useEffect(() => { mapOpenRef.current = mapOpen; }, [mapOpen]);
  useEffect(() => { shopOpenRef.current = shopOpen; }, [shopOpen]);
  useEffect(() => { binOpenRef.current = binOpen; }, [binOpen]);
  useEffect(() => { slotRef.current = slot; }, [slot]);
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
  const wrap = (node) => (mounted && typeof document !== "undefined" ? createPortal(node, document.body) : null);

  // -------- Hôte : charge (ou crée) une ferme durable depuis son CODE --------
  // Charge la sauvegarde de la table ferme_saves indexée par le code saisi.
  // Si le code n'existe pas encore, crée une nouvelle ferme (seed dérivée du
  // code, donc reproductible). Puis diffuse un instantané aux invités.
  async function loadFarmByCode(rawCode) {
    const code = String(rawCode || "").trim().toLowerCase();
    if (!code) { setCodeError(L.codeEmpty); return; }
    setCodeError(""); setCodeLoading(true);
    let saved = null;
    try {
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
      overridesRef.current = { ground: { ...(saved.groundOv || {}) }, object: { ...(saved.objectOv || {}) } };
      sharedRef.current = {
        seed: saved.seed, money: saved.money, day: saved.day, dayStartAt: saved.dayStartAt, totalEarned: saved.totalEarned,
        horses: migrateHorses(saved),
        animals: saved.animals || [], wellBuilt: !!saved.wellBuilt, coop: saved.coop || null,
        barn: saved.barn || E.newBarnState(),
        salveCraft: saved.salveCraft || E.newSalveCraftState(),
        gems: migrateGems(saved),
        flour: saved.flour || 0,
        // Stock commun de bois/pierre récoltés par Greg (chantier 2026-07,
        // "étendre son champ") : survit à une reprise, comme flour/gems.
        gregStock: { wood: (saved.gregStock && saved.gregStock.wood) || 0, stone: (saved.gregStock && saved.gregStock.stone) || 0, fertilizer: (saved.gregStock && saved.gregStock.fertilizer) || 0, fish: C.FISH.map((_, i) => (saved.gregStock && saved.gregStock.fish && saved.gregStock.fish[i]) || 0) },
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
        greg: (saved.greg && saved.greg.expiresAt > Date.now())
          ? { ...saved.greg, taskQueue: [], phase: "roam", roamTarget: null, nextRoamAt: 0 } : null,
        // Soan (chantier 2026-07) : même principe que Greg ci-dessus — contrat
        // réel de 24h qui DOIT survivre à une reprise, mais repart en rôdaille
        // (pas en pleine pêche) au chargement, le trajet vers la rivière
        // n'ayant pas de sens à restaurer tel quel.
        soan: (saved.soan && saved.soan.expiresAt > Date.now())
          ? { ...saved.soan, phase: "roam", roamTarget: null, nextRoamAt: 0, riverSpot: null } : null,
      };
      // Les cavaliers repartent à pied à la reprise (aucun joueur monté au chargement).
      for (const h of sharedRef.current.horses) { h.rider = null; h.rider2 = null; h.callTarget = null; }
      farmersRef.current = saved.farmers || {};
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
      overridesRef.current = { ground: {}, object: {} };
      sharedRef.current = { seed, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), salveCraft: E.newSalveCraftState(), gems: C.GEMS.map(() => 0), flour: 0, gregStock: { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) }, fertilizerShop: { stock: 0, lastRestockDay: 0 }, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [], rabbitChallenge: null, greg: null, soan: null };
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
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
    setGregStock(sharedRef.current.gregStock || { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) });
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
      salveCraft: payload.salveCraft || E.newSalveCraftState(),
      gems: migrateGems(payload),
      flour: payload.flour || 0,
      gregStock: { wood: (payload.gregStock && payload.gregStock.wood) || 0, stone: (payload.gregStock && payload.gregStock.stone) || 0, fertilizer: (payload.gregStock && payload.gregStock.fertilizer) || 0, fish: C.FISH.map((_, i) => (payload.gregStock && payload.gregStock.fish && payload.gregStock.fish[i]) || 0) },
      fertilizerShop: { stock: (payload.fertilizerShop && payload.fertilizerShop.stock) || 0, lastRestockDay: (payload.fertilizerShop && payload.fertilizerShop.lastRestockDay) || 0 },
      wolves: payload.wolves || [], wolfNight: { active: !!(payload.wolves && payload.wolves.length), kills: 0 },
      rabbits: payload.rabbits || [], rabbitChallenge: payload.rabbitChallenge || null,
      greg: payload.greg || null,
      soan: payload.soan || null,
    };
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
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
    setGregStock(sharedRef.current.gregStock || { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) });
    setFertilizerShop(sharedRef.current.fertilizerShop || { stock: 0, lastRestockDay: 0 });
    setRabbitChallenge(sharedRef.current.rabbitChallenge);
    syncBuildings();
    setWorldReady(true);
  }

  // -------- Réseau : canal, souscription, évènements --------
  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "hello", }, ({ payload }) => {
      if (!isHost) return;
      // Un joueur demande l'instantané : l'hôte le renvoie.
      broadcastSnapshot();
    });
    ch.on("broadcast", { event: "snapshot" }, ({ payload }) => {
      // L'hôte ignore l'écho de son propre snapshot (il a déjà le monde).
      if (isHost && worldRef.current) return;
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
      }
      setHud(h => ({ ...h, players: playersRef.current.size + 1 }));
    });
    ch.on("broadcast", { event: "leave" }, ({ payload }) => {
      if (payload.id === me.id) return;
      const r = playersRef.current.get(payload.id);
      playersRef.current.delete(payload.id);
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
      r.tx = payload.x; r.ty = payload.y; r.dir = payload.dir; r.moving = payload.moving; r.tool = payload.tool;
      r.gender = payload.gender; r.outfit = payload.outfit; r.name = payload.name; r.sleeping = !!payload.sleeping;
      r.torch = !!payload.torch; r.zone = payload.zone || "farm";
    });
    ch.on("broadcast", { event: "req" }, ({ payload }) => { if (isHost) hostHandleReq(payload); });
    ch.on("broadcast", { event: "apply" }, ({ payload }) => applyDeltas(payload));
    ch.on("broadcast", { event: "newday" }, ({ payload }) => applyNewDay(payload));
    ch.on("broadcast", { event: "chat" }, ({ payload }) => addChat(payload.from, payload.msg));

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED") return;
      channelReadyRef.current = true;
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

  function ensureRemote(p) {
    if (p.id === me.id) return;
    if (!playersRef.current.has(p.id)) {
      playersRef.current.set(p.id, { id: p.id, name: p.name, gender: p.gender || "m", outfit: p.outfit || 0, x: p.x ?? C.SPAWN.x, y: p.y ?? C.SPAWN.y, tx: p.x ?? C.SPAWN.x, ty: p.y ?? C.SPAWN.y, dir: p.dir || 0, moving: false, tool: 0, animT: 0, sleeping: false, torch: false, hatUntil: (farmersRef.current[p.id] && farmersRef.current[p.id].hatUntil) || 0, zone: "farm" });
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
      horses: s.horses, animals: s.animals, wellBuilt: s.wellBuilt, coop: s.coop, barn: s.barn, salveCraft: s.salveCraft, gems: s.gems, flour: s.flour, gregStock: s.gregStock, fertilizerShop: s.fertilizerShop, wolves: s.wolves, greg: s.greg, soan: s.soan,
      rabbits: s.rabbits, rabbitChallenge: s.rabbitChallenge,
    };
  }
  function syncBuildings() {
    const s = sharedRef.current;
    const hs = s.horses || [];
    setBuildings({ horseCount: hs.length, wellBuilt: !!s.wellBuilt, animalCount: (s.animals || []).length });
    setOnHorse(hs.some(h => h.rider === me.id || h.rider2 === me.id));
  }
  function broadcastSnapshot() {
    if (!worldRef.current) return;
    channelRef.current?.send({ type: "broadcast", event: "snapshot", payload: currentSnapshot() });
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
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: { farmer: { id, energy: f.energy, tools: f.tools, inv: f.inv } } });
    return f;
  }
  // Sauvegarde DURABLE de la ferme dans la table ferme_saves (indexée par le
  // code). Remplace l'ancien rooms.game_state éphémère : survit au retour au
  // salon et se recharge par le même code, sur des semaines.
  async function persistFarm() {
    if (!isHost || !farmCodeRef.current || !worldRef.current) return;
    try {
      await supabase.from("ferme_saves").upsert(
        { code: farmCodeRef.current, state: currentSnapshot(), updated_at: new Date().toISOString() },
        { onConflict: "code" }
      );
    } catch (e) {
      console.error("[FERME] Sauvegarde impossible (table ferme_saves absente ? exécute supabase/upgrade-005.sql).", e);
    }
  }

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
  function hostHandleReq(req) {
    try { hostHandleReqUnsafe(req); }
    catch (e) {
      console.error("[FERME] hostHandleReq: échec de traitement, action ignorée.", req, e);
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { toast: { id: req.id, key: "actionFailed" } } });
    }
  }
  function hostHandleReqUnsafe(req) {
    const w = worldRef.current; if (!w) return;
    const f = hostEnsureFarmer(req.id, req.name);
    if (typeof req.px === "number") { f.x = req.px; f.y = req.py; }
    const s = sharedRef.current;
    const out = { tiles: [], crops: [], mills: null, fx: [], state: null, farmer: null, toast: null, chat: null, horses: null, animals: null, wellBuilt: false, coop: undefined, barn: undefined, salveCraft: undefined };
    let questId = null; // action réussie -> quête à valider éventuellement
    const px = typeof req.px === "number" ? req.px : f.x, py = typeof req.py === "number" ? req.py : f.y;

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
        const reduced = Date.now() + C.HEAL_REDUCE_MS;
        if (target.injuredUntil > reduced) target.injuredUntil = reduced;
        dirtyRef.current = true;
        channelRef.current?.send({
          type: "broadcast", event: "apply",
          payload: {
            farmer: { id: target.id, energy: target.energy, tools: target.tools, inv: target.inv, injuredUntil: target.injuredUntil },
            injured: { id: target.id, until: target.injuredUntil },
          },
        });
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "💊", msg: L.healChat(f.name, target.name) } });
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
      dirtyRef.current = true;
      channelRef.current?.send({
        type: "broadcast", event: "apply",
        payload: { injured: { id: f.id, until: f.injuredUntil } },
      });
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
      const stock = s.gregStock || (s.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) });
      const r = E.resolveSellCommonFish(stock, req);
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
            for (const i of tiles) g.taskQueue.push({ a: "till", i }, { a: "plant", i, crop: cropIdx }, { a: "water", i });
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
        const spot = E.findRiverbankTile(w2, so.roamAnchor || C.SOAN_ANCHOR);
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
      if (rb && rb.phase !== "flee" && Math.hypot(px - rb.x, py - rb.y) <= C.RABBIT_CATCH_RANGE) {
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
          channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🎉", msg: L.coopDone(lang === "en" ? def.nameEn : def.name, reward) } });
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
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🛖", msg: L.barnReadyChat(r.moneySpent) } });
        dirtyRef.current = true;
      }
    } else if (req.kind === "barnBuild") {
      const r = E.resolveBarnBuild(f, s.barn);
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.built) {
        out.barn = s.barn;
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🎉", msg: L.barnBuilt(f.name, r.level) } });
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
      // Lancement de la concoction (chantier 2026-07) : consomme la recette
      // (poissons déposés au chaudron + améthyste dans la réserve commune de
      // gemmes) et crédite 1 pommade dans l'inventaire du fermier présent.
      const r = E.resolveSalveBrew(f, s.salveCraft, s.gems, w);
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.brewed) {
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.salveCraft = s.salveCraft; out.gems = s.gems;
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🧪", msg: L.salveBrewed(f.name) } });
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
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🎯", msg: L.questDone(label, q.reward) } });
        dirtyRef.current = true;
      }
    }
    // Les quêtes accomplies voyagent avec l'état privé du fermier.
    if (out.farmer) out.farmer.quests = f.quests;

    if (out.tiles.length || out.state || out.horses || out.animals || out.wellBuilt || out.gems || out.mills || out.flour !== undefined) dirtyRef.current = true;
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: out });
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
    if (p.farmer && p.farmer.id === me.id) {
      invRef.current = p.farmer.inv; toolsRef.current = p.farmer.tools; energyRef.current = p.farmer.energy;
      setMyInv(p.farmer.inv); setMyTools(p.farmer.tools); setMyEnergy(p.farmer.energy); if (p.farmer.quests) setMyQuests(p.farmer.quests);
      if (typeof p.farmer.injuredUntil === "number" && p.farmer.injuredUntil !== injuredUntilRef.current) {
        const wasInjured = injuredUntilRef.current > Date.now();
        injuredUntilRef.current = p.farmer.injuredUntil; setInjuredUntil(p.farmer.injuredUntil);
        // Nouvelle blessure (pas déjà blessé) : le loup vient de mordre -> on
        // ramène le fermier chez lui, incapable d'agir pendant C.INJURED_MS.
        if (!wasInjured && p.farmer.injuredUntil > Date.now()) {
          const m = meRef.current;
          if (m) { m.x = C.SPAWN.x; m.y = C.SPAWN.y; m.moving = false; sendPos(); }
          setWolfBite(null);
          pushToast(L.toastInjured);
        }
      }
    }
    if (p.wolfBite && p.wolfBite.id === me.id && !isInjured()) setWolfBite({ wolfId: p.wolfBite.wolfId });
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
    if (p.toast && p.toast.id === me.id) pushToast(toastMsg(p.toast.key));
    if (p.chat) addChat(p.chat.from, p.chat.msg);
    if (p.fx) for (const f of p.fx) spawnFx(f);
    if (p.horses) { sharedRef.current.horses = p.horses; syncBuildings(); }
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    if (p.wolves) { sharedRef.current.wolves = p.wolves; minimapDirtyRef.current = true; }
    if (p.rabbits) { sharedRef.current.rabbits = p.rabbits; minimapDirtyRef.current = true; }
    if (p.greg !== undefined) { sharedRef.current.greg = p.greg; minimapDirtyRef.current = true; }
    if (p.soan !== undefined) { sharedRef.current.soan = p.soan; minimapDirtyRef.current = true; }
    if (p.wellBuilt) { sharedRef.current.wellBuilt = true; minimapDirtyRef.current = true; syncBuildings(); }
    if (p.coop !== undefined) { sharedRef.current.coop = p.coop; setCoop(p.coop); }
    if (p.barn !== undefined) { sharedRef.current.barn = p.barn; setBarn(p.barn); minimapDirtyRef.current = true; }
    if (p.salveCraft !== undefined) { sharedRef.current.salveCraft = p.salveCraft; setSalveCraft(p.salveCraft); }
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
  function toastMsg(key) {
    return { tired: L.toastTired, farShop: L.toastFarShop, farBin: L.toastFarBin, noGold: L.toastNoGold, toolMax: L.toastToolMax, needWater: L.toastNeedWater, penFull: L.penFull, noFence: L.toastNoFence, noWood: L.toastNoWood, noStone: L.toastNoStone, noWallStock: L.toastNoWallStock, noPathStock: L.toastNoPathStock, noLampStock: L.toastNoLampStock, noScarecrowStock: L.toastNoScarecrowStock, noGrassStock: L.toastNoGrassStock, noMillStock: L.toastNoMillStock, millNotEmpty: L.toastMillNotEmpty, noWheatToDeposit: L.toastNoWheatToDeposit, millFull: L.toastMillFull, actionFailed: L.toastActionFailed, coopNone: L.toastCoopNone, farCoop: L.toastFarCoop, coopNothing: L.toastCoopNothing, barnMax: L.toastBarnMax, farBarn: L.toastFarBarn, barnReady: L.toastBarnReadyWait, barnNotReady: L.toastBarnNotReady, barnNeedMoney: L.toastBarnNeedMoney, sleepFull: L.toastSleepFull, notInjured: L.toastNotInjured, noHealKit: L.toastNoHealKit, healTooFar: L.toastHealTooFar, gregNotHired: L.toastGregNotHired, gregNoRoom: L.toastGregNoRoom, gregNoFertilizer: L.toastGregNoFertilizer, soanNotHired: L.toastSoanNotHired, soanNoRiver: L.toastSoanNoRiver, farCauldron: L.toastFarCauldron, noFishToDeposit: L.toastNoFishToDeposit, cauldronMissing: L.toastCauldronMissing, cauldronAlreadyTaken: L.toastCauldronAlreadyTaken, noCauldronStock: L.toastNoCauldronStock, cauldronNotEmpty: L.toastCauldronNotEmpty }[key] || "";
  }

  // -------- Hôte : boucle temps + persistance --------
  useEffect(() => {
    if (!isHost) return;
    const dayTimer = setInterval(() => {
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
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🚧", msg: L.coopStarted(lang === "en" ? def.nameEn : def.name) } });
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
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "☀", msg: L.chatNewDay(s.day) } });
        if (E.isStormyDay(s.day)) {
          channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "⛈", msg: L.chatStormyDay } });
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
    return { id: m.id, name: m.name, gender: m.gender, outfit: m.outfit, x: +px.toFixed(2), y: +py.toFixed(2), dir: m.dir, moving: m.zone === "evil" ? false : m.moving, tool: slotRef.current, sleeping: !!m.sleeping, torch: !!torchOnRef.current, zone: m.zone || "farm" };
  }
  function sendPos() { channelRef.current?.send({ type: "broadcast", event: "pos", payload: pubMe() }); }

  // -------- Actions joueur (envoi au host) --------
  // La requête porte DEUX jeux de coordonnées : px/py = position du joueur
  // (pour la vérification de portée côté hôte) et x/y = case ciblée (lue par
  // fermeEngine.resolveAct). Les deux sont distincts et ne doivent jamais être
  // confondus.
  function sendReq(payload) {
    const m = meRef.current;
    channelRef.current?.send({ type: "broadcast", event: "req", payload: { ...payload, id: me.id, name: m.name, px: +m.x.toFixed(2), py: +m.y.toFixed(2) } });
  }
  function isInjured() { return Date.now() < injuredUntilRef.current; }
  function doAction() {
    const m = meRef.current; if (!m || actAnimRef.current > 0 || fishMiniRef.current || m.sleeping || isInjured()) return;
    if (m.zone === "evil") return doActionEvil();
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
  // Seule la hache agit ici (pas de récolte/arrosage/pioche/construction en
  // zone maléfique, hors périmètre de la demande).
  function doActionEvil() {
    const m = meRef.current; if (!m || actAnimRef.current > 0) return;
    const ew = evilWorldRef.current; if (!ew) return;
    if (slotRef.current !== 0 || toolKindRef.current !== "axe") return;
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
    let best = null, bd = 1.3;
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
    fishTileRef.current = { x: tt.x, y: tt.y };
    pushToast(L.fishBite(lang === "en" ? C.FISH[ft].nameEn : C.FISH[ft].name));
    setFishMini({ mode: ft, fish: ft });
  }
  function fishWon() {
    const ft = fishMini ? fishMini.fish : 0, tt = fishTileRef.current;
    setFishMini(null);
    if (tt) sendReq({ kind: "act", action: "fish", x: tt.x, y: tt.y, fish: ft });
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
    if (myHorse()) { sendReq({ kind: "dismount" }); return; }
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
    let moved = false;
    const speed = C.PLAYER_SPEED * C.HORSE_SPEED_MULT;
    for (const h of hs) {
      if (h.rider) { if (h.callTarget) h.callTarget = null; continue; } // monté entre-temps : annule l'appel
      if (!h.callTarget) continue;
      const dx = h.callTarget.x - h.x, dy = h.callTarget.y - h.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.12) { h.x = h.callTarget.x; h.y = h.callTarget.y; h.callTarget = null; }
      else { const step = Math.min(speed * dt, d); h.x += (dx / d) * step; h.y += (dy / d) * step; }
      moved = true;
    }
    if (moved) {
      minimapDirtyRef.current = true;
      horseCallAccumRef.current += dt;
      if (horseCallAccumRef.current >= 0.15) {
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
    const targetId = wf.biteTargetId || wf.attackTargetId;
    wf.attackTargetId = null; wf.biteTargetId = null; wf.biteDeadline = 0; wf.huntAnimalIdx = -1;
    if (result === "win") {
      wf.phase = "flee"; wf.fleeUntil = Date.now() + C.WOLF_FLEE_COOLDOWN_MS;
      const target = targetId ? livePlayerPos(targetId) : null;
      if (target) {
        const dx = wf.x - target.x, dy = wf.y - target.y, d = Math.hypot(dx, dy) || 1;
        wf.tx = wf.x + (dx / d) * 4; wf.ty = wf.y + (dy / d) * 4;
      }
      wf.state = "run";
      if (targetId) {
        const nm = (playersRef.current.get(targetId) || (meRef.current?.id === targetId ? meRef.current : null) || {}).name || "?";
        addChat("🐺", L.wolfBiteWinChat(nm));
      }
      return;
    }
    // "fail" : blesse le fermier visé s'il existe encore (peut avoir quitté).
    if (targetId) {
      const f = E.normalizeFarmer(farmersRef.current[targetId]);
      if (f) {
        f.injuredUntil = Date.now() + C.INJURED_MS;
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
        else { rb.phase = "roam"; rb.roamAnchor = { x: rb.x, y: rb.y }; }
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
      if (speed > 0 && rb.tx !== undefined) {
        const dx = rb.tx - rb.x, dy = rb.ty - rb.y, d = Math.hypot(dx, dy);
        if (d > 0.02) {
          const step = Math.min(speed * dt, d);
          const nx = rb.x + (dx / d) * step, ny = rb.y + (dy / d) * step;
          if (!E.blockedTile(w, nx, ny) && !E.isWaterTile(w, nx, ny)) {
            rb.x = nx; rb.y = ny;
            rb.dir = dx < 0 ? 2 : 3;
            rb.animT += dt * (speed >= C.RABBIT_SPEED_FLEE ? 9 : 4);
            moved = true;
          } else { rb.tx = rb.x; rb.ty = rb.y; rb.animT = 0; }
        }
      } else rb.animT = 0;
    }
    if (moved) minimapDirtyRef.current = true;
    rabbitAccumRef.current += dt;
    if (rabbitAccumRef.current >= 0.15) {
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

    let animalsChanged = false, moved = false;
    for (const wf of s.wolves) {
      let scare = null, scareD = Infinity;
      for (const t of torchBearers) {
        const d = Math.hypot(t.x - wf.x, t.y - wf.y);
        if (d < C.WOLF_TORCH_RANGE && d < scareD) { scareD = d; scare = t; }
      }
      let speed = 0;
      if (scare) {
        if (wf.aggressive && wf.phase !== "attack" && wf.phase !== "biting") {
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
        if (!target) { wf.phase = "roam"; }
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
            if (wf.bridgeIdx < 0) { wf.tx = wf.x; wf.ty = wf.y; speed = 0; wf.state = "stop"; }
            else { const p = E.bridgeCrossPoint(w, wf.bridgeIdx); wf.tx = p.x + 4; wf.ty = p.y; }
          }
        }
      }
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
          if (!E.isWaterTile(w, nx, ny)) {
            wf.x = nx; wf.y = ny;
            wf.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
            wf.animT += dt * (speed >= C.WOLF_SPEED_FAST ? 10 : 5);
            moved = true;
          } else {
            wf.animT = 0;
          }
        }
      } else wf.animT = 0;
    }
    if (moved) minimapDirtyRef.current = true;
    if (animalsChanged) {
      dirtyRef.current = true;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { animals: s.animals, wolves: s.wolves } });
      wolfAccumRef.current = 0;
      return;
    }
    wolfAccumRef.current += dt;
    if (wolfAccumRef.current >= 0.15) {
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
      g.tx = tx; g.ty = ty; speed = C.GREG_SPEED; g.phase = "task";
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
      speed = C.GREG_SPEED * 0.55; // rôdaille plus lente que le trajet vers une tâche
      if (!g.roamTarget || Math.hypot(g.roamTarget.x - g.x, g.roamTarget.y - g.y) < 0.3 || now >= (g.nextRoamAt || 0)) {
        const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * C.GREG_ROAM_RADIUS;
        g.roamTarget = { x: g.roamAnchor.x + Math.cos(a) * d, y: g.roamAnchor.y + Math.sin(a) * d };
        g.nextRoamAt = now + 1500 + Math.random() * 2500;
      }
      g.tx = g.roamTarget.x; g.ty = g.roamTarget.y;
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
    if (gregAccumRef.current >= 0.15) {
      gregAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { greg: g } });
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
        const stock = sharedRef.current.gregStock || (sharedRef.current.gregStock = { wood: 0, stone: 0, fertilizer: 0, fish: C.FISH.map(() => 0) });
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
    if (soanAccumRef.current >= 0.15) {
      soanAccumRef.current = 0;
      channelRef.current?.send({ type: "broadcast", event: "apply", payload: { soan: so } });
    }
  }
  function teleportWell() {
    const m = meRef.current; if (!m || !sharedRef.current.wellBuilt) return;
    m.x = C.WELL_SPAWN.x; m.y = C.WELL_SPAWN.y; m.moving = false;
    sendPos(); pushToast(L.wellToast);
  }
  const buyHorse = () => sendReq({ kind: "buyHorse" });
  const buyWell = () => sendReq({ kind: "buyWell" });
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
  const soanOrder = () => sendReq({ kind: "soanOrder" });
  const soanRecall = () => sendReq({ kind: "soanRecall" });
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
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "🐇", msg: L.rabbitChallengeStarted(C.RABBIT_CHALLENGE_TARGET) } });
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
  function crossPassage(toEvil, viaMonster) {
    if (zoneTransRef.current.active) return; // déjà en transition : ignore un nouveau déclenchement
    zoneTransRef.current = { active: true, t0: performance.now(), toEvil, swapped: false, viaMonster: !!viaMonster };
  }
  function updateZoneTransition() {
    const zt = zoneTransRef.current;
    if (!zt.active) return;
    const elapsed = performance.now() - zt.t0;
    if (!zt.swapped && elapsed >= C.ZONE_FADE_MS) {
      zt.swapped = true;
      const m = meRef.current;
      if (zt.toEvil) {
        if (!evilWorldRef.current) evilWorldRef.current = E.generateEvilWorld();
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
    if (m.zone === "evil") { pushToast(L.homeBlockedToast); return; }
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
      if (e.code === "Space") { e.preventDefault(); doAction(); }
      if (e.code === "KeyE") tryOpenNearby();
      if (e.code === "KeyF") toggleMount();
      if (e.code === "KeyR" && slotRef.current === 5 && buildKindRef.current === "fence") {
        fenceDirRef.current = fenceDirRef.current === "auto" ? "h" : fenceDirRef.current === "h" ? "v" : "auto";
        setFenceDir(fenceDirRef.current);
        pushToast(L.fenceDirToast(fenceDirRef.current));
      }
      if (e.code === "KeyT") { e.preventDefault(); setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 0); }
      if (e.code === "KeyM") setMapOpen(o => !o);
      if (e.code === "Escape") { setShopOpen(false); setBinOpen(false); setMapOpen(false); setSeedMenuOpen(false); setToolMenuOpen(false); setCraftMenuOpen(null); }
    }
    function onKeyUp(e) { keysRef.current[e.code] = false; }
    function onMove(e) { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; }
    function onDown(e) { if (e.button === 0 && !mapOpenRef.current && !shopOpenRef.current && !binOpenRef.current && !fishMiniRef.current && !isInjured()) doAction(); }
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
      if (isHost) updateGreg(dt);
      if (isHost) updateSoan(dt);
      // Simulation hôte toujours sur worldRef.current (la ferme), quoi qu'il
      // arrive : rien ci-dessus ne dépend de la zone du joueur LOCAL. Seul
      // ce qui suit (mouvement/rendu propres à CE client) bascule sur la
      // carte maléfique si m.zone==="evil" — voir crossPassage plus haut.
      updateZoneTransition();
      checkWalkOverPassage();
      if (m.zone === "evil") {
        drawEvilFrame(now);
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
        p.x += (p.tx - p.x) * Math.min(1, dt * 12);
        p.y += (p.ty - p.y) * Math.min(1, dt * 12);
        p.animT = p.moving ? (p.animT || 0) + dt * 9 : 0;
      }
      const gregNow = sharedRef.current.greg;
      if (gregNow && !isHost) {
        if (gregNow.rx === undefined) { gregNow.rx = gregNow.x; gregNow.ry = gregNow.y; }
        gregNow.rx += (gregNow.x - gregNow.rx) * Math.min(1, dt * 8);
        gregNow.ry += (gregNow.y - gregNow.ry) * Math.min(1, dt * 8);
      }
      const soanNow = sharedRef.current.soan;
      if (soanNow && !isHost) {
        if (soanNow.rx === undefined) { soanNow.rx = soanNow.x; soanNow.ry = soanNow.y; }
        soanNow.rx += (soanNow.x - soanNow.rx) * Math.min(1, dt * 8);
        soanNow.ry += (soanNow.y - soanNow.ry) * Math.min(1, dt * 8);
      }

      const cam = getCam();
      ctx.setTransform(ZOOM, 0, 0, ZOOM, -Math.round(cam.x * ZOOM), -Math.round(cam.y * ZOOM));
      ctx.clearRect(cam.x, cam.y, cam.vw, cam.vh);
      const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(w.w - 1, Math.ceil((cam.x + cam.vw) / T));
      const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(w.h - 1, Math.ceil((cam.y + cam.vh) / T));
      const waterFrame = Math.floor(now / 600) % 2;

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
          ctx.drawImage(sprites.crops[c.t][gs.stage], x * T, y * T);
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
      }

      const tt = targetTile();
      if (inMap(tt.x, tt.y)) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(tt.x * T + 0.5, tt.y * T + 0.5, T - 1, T - 1); }

      const draws = [];
      draws.push({ y: (C.HOUSE.y + C.HOUSE.h) * T, fn: () => ctx.drawImage(sprites.house, C.HOUSE.x * T, (C.HOUSE.y + C.HOUSE.h) * T - 96) });
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
        if (o === C.O_TREE || o === C.O_TREE2) { const img = o === C.O_TREE ? sprites.oak : sprites.pine; draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(img, x * T - 8, (y + 1) * T - 48) }); }
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
        } else {
          const apos = E.animalPos(an, epochNow); ax = apos.x; ay = apos.y;
        }
        draws.push({ y: (ay + 1) * T, fn: () => {
          ctx.drawImage(sprites.animals[an.type], ax * T, ay * T);
          if (!an.carriedBy && E.animalReady(an, epochNow)) { const bob = Math.sin(now / 260) * 1.5; ctx.drawImage(sprites.products[an.type], ax * T + 3, ay * T - 12 + bob, 12, 12); }
        } });
      }
      // Chevaux libres (non montés) : plusieurs possibles désormais.
      for (const horse of (sharedRef.current.horses || [])) {
        if (!horse.rider) draws.push({ y: (horse.y + 1) * T, fn: () => ctx.drawImage(sprites.horse, horse.x * T - 6, horse.y * T - 10) });
      }
      // Loups (chantier 2026-07) : 4 frames de marche, vitesse du cycle
      // dépendante de l'état (arrêté/lent/rapide, voir updateWolves) plutôt
      // que des frames différentes — même mécanique que l'animation des
      // fermiers (animT).
      for (const wf of (sharedRef.current.wolves || [])) {
        draws.push({ y: (wf.y + 1) * T, fn: () => {
          const frame = wf.state === "stop" ? 0 : Math.floor((wf.animT || 0) % 4);
          const img = sprites.wolf[frame];
          const px = Math.round(wf.x * T - 14), py = Math.round(wf.y * T - 9);
          if (wf.dir === 2) { ctx.save(); ctx.translate(px + 30, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
          else ctx.drawImage(img, px, py);
        } });
      }
      // Lapins (chantier 2026-07) : 3 frames de bond, même mécanique
      // d'animation que les loups (cycle piloté par animT/state), silhouette
      // bien plus petite/basse.
      for (const rb of (sharedRef.current.rabbits || [])) {
        draws.push({ y: (rb.y + 1) * T, fn: () => {
          const frame = rb.state === "stop" ? 0 : Math.floor((rb.animT || 0) % 3);
          const img = sprites.rabbit[frame];
          const px = Math.round(rb.x * T - 8);
          // Bond visuel uniquement EN FUITE (rb.state === "run", jamais en
          // roam/stop — demande 2026-07 : "les changer pas dans leur état
          // normal, mais qu'ils aient l'air de sautiller en fuite"). Arc
          // simple dérivé du même animT que le cycle de frames, donc
          // toujours en phase avec l'anim des pattes.
          const hop = rb.state === "run" ? Math.abs(Math.sin((rb.animT || 0) * Math.PI)) * C.RABBIT_FLEE_HOP_PX : 0;
          const py = Math.round(rb.y * T - 7 - hop);
          if (rb.dir === 2) { ctx.save(); ctx.translate(px + 16, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
          else ctx.drawImage(img, px, py);
        } });
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
          const gx = isHost ? g.x : (g.rx ?? g.x), gy = isHost ? g.y : (g.ry ?? g.y);
          draws.push({ y: (gy + 1) * T, fn: () => drawCharacter({ id: "greg", name: "Greg", x: gx, y: gy, dir: g.dir || 0, moving: !!g.moving, animT: g.animT || 0, gender: "m", outfit: 0, overalls: true }, false) });
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
          const sx = isHost ? so.x : (so.rx ?? so.x), sy = isHost ? so.y : (so.ry ?? so.y);
          draws.push({ y: (sy + 1) * T, fn: () => drawCharacter({ id: "soan", name: "Soan", x: sx, y: sy, dir: so.dir || 0, moving: !!so.moving, animT: so.animT || 0, gender: "m", outfit: 1, cap: true, fishing: so.phase === "fishing" }, false) });
        }
      }
      if (!m.sleeping) draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) });
      for (const p of playersRef.current.values()) if (!p.sleeping && p.zone !== "evil") draws.push({ y: (p.y + 1) * T, fn: () => drawRemote(p) });
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
      draws.sort((a, b) => a.y - b.y);
      for (const d of draws) d.fn();

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

      // Invite boutique/bac
      let pk = null;
      const cauldronTile = findCauldronTile();
      if (heldAnimalRef.current !== -1) pk = "sellAnimal";
      else if (nearTile(C.SHOP)) pk = "shop"; else if (nearTile(C.BIN)) pk = "bin";
      else if (nearTile(C.HOUSE_DOOR)) pk = m.sleeping ? "wake" : "sleep";
      else if (nearTile(C.COOP_SITE) && sharedRef.current.coop) pk = "coop";
      else if (nearTile(C.BARN_SITE)) { const b = sharedRef.current.barn; if (b && b.level < C.BARN_LEVELS.length) pk = b.ready ? "barnBuild" : "barn"; }
      else if (cauldronTile && nearTile(cauldronTile)) {
        const sc = sharedRef.current.salveCraft || { trout: 0, pike: 0 };
        const rec = C.SALVE_RECIPE, gemsNow = (sharedRef.current.gems && sharedRef.current.gems[0]) || 0;
        const ready = sc.trout >= rec.trout && sc.pike >= rec.pike && gemsNow >= rec.amethyst;
        const carryingFish = myInv && ((myInv.fish && (myInv.fish[1] || myInv.fish[2])) || 0);
        pk = ready ? "salveBrew" : (carryingFish ? "salveDeposit" : "cauldron");
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
      if (!m || !w || fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current) return;
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
      if (!m || !w || slotRef.current !== 1 || fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current) return;
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
      if (fishMiniRef.current || shopOpenRef.current || binOpenRef.current || mapOpenRef.current) return;
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
        else if (o === C.O_ROCK) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.rock, x * T, y * T) });
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
      for (const mo of (ew.monsters || [])) {
        draws.push({ y: (mo.y + 1) * T, fn: () => {
          const frame = Math.floor((mo.animT || 0) % 4);
          const img = sprites.wolf[frame];
          const px = Math.round(mo.x * T - 14), py = Math.round(mo.y * T - 9);
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
          ctx.save();
          ctx.filter = "brightness(0.55) saturate(2.2) hue-rotate(235deg)";
          if (mo.dir === 2) { ctx.translate(px + 30, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); }
          else ctx.drawImage(img, px, py);
          ctx.restore();
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
      setPromptKeyThrottled(!already && nearTile(C.EVIL_CAULDRON_SPAWN) ? "evilCauldronPickup" : null);
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
    // them for 10 minutes, so the player can explore/farm that side"). Tant
    // que immunityUntilRef est dans le futur : aucun contact ne déclenche
    // plus caughtByMonster (immunité), ET toute créature qui aurait
    // autrement chargé le joueur s'en éloigne au contraire, à la même
    // vitesse (répulsion) — les deux formulations de la demande couvertes
    // par un seul et même effet, plutôt que de choisir entre elles.
    function updateEvilMonsters(dt) {
      const ew = evilWorldRef.current, m = meRef.current;
      if (!ew || !ew.monsters || !ew.monsters.length) return;
      const immune = Date.now() < immunityUntilRef.current;
      for (const mo of ew.monsters) {
        mo.animT = (mo.animT || 0) + dt * 6;
        const ddx = m.x - mo.x, ddy = m.y - mo.y, dist = Math.hypot(ddx, ddy) || 0.0001;
        if (!immune && dist <= C.EVIL_MONSTER_CATCH_RADIUS) { caughtByMonster(); return; }
        if (dist <= C.EVIL_MONSTER_DETECT_RADIUS) {
          const speed = C.EVIL_MONSTER_SPEED * dt;
          const sign = immune ? -1 : 1;
          mo.x += sign * (ddx / dist) * speed; mo.y += sign * (ddy / dist) * speed;
          mo.dir = (sign * ddx) < 0 ? 2 : 3;
          mo.chasing = !immune;
          mo.fleeing = immune;
        } else {
          mo.chasing = false;
          mo.fleeing = false;
        }
      }
    }
    function updateMeEvil(dt) {
      const m = meRef.current, ew = evilWorldRef.current, keys = keysRef.current;
      if (!ew) return;
      updateEvilMonsters(dt);
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
        const sp = C.PLAYER_SPEED * dt;
        const nx = m.x + dx * sp, ny = m.y + dy * sp;
        if (canStandEvil(ew, nx, m.y)) m.x = nx;
        if (canStandEvil(ew, m.x, ny)) m.y = ny;
        if (dx < 0) m.dir = 2; else if (dx > 0) m.dir = 3; else if (dy < 0) m.dir = 1; else if (dy > 0) m.dir = 0;
        m.animT += dt * 9;
      } else m.animT = 0;
      m.moving = !!moving;
      // Pas de sendPos ici : ce joueur est seul sur cette carte (voir
      // pubMe/crossPassage) — sa position publique reste figée sur la case
      // du passage côté ferme tant qu'il n'est pas revenu.
    }
    function updateMe(dt) {
      const m = meRef.current, keys = keysRef.current;
      if (m.zone === "evil") { updateMeEvil(dt); return; }
      const w = worldRef.current;
      const horseNow = (sharedRef.current.horses || []).find(h => h.rider2 === me.id);
      if (horseNow) {
        // Passager : ne pilote pas, suit simplement la position vivante du
        // cavalier principal (aucune touche de déplacement à traiter ici ;
        // F reste actif pour descendre, géré ailleurs par toggleMount()).
        const driver = playersRef.current.get(horseNow.rider);
        if (driver) { m.x = driver.x; m.y = driver.y; m.dir = driver.dir; m.moving = driver.moving; m.animT = driver.animT || 0; }
        const now2 = performance.now();
        if (now2 - lastPosSentRef.current > 1000 / C.POS_TICK_HZ) { lastPosSentRef.current = now2; sendPos(); }
        return;
      }
      const uiBlocked = shopOpenRef.current || binOpenRef.current || mapOpenRef.current || fishMiniRef.current || document.activeElement === chatInputRef.current || m.sleeping || isInjured();
      let dx = 0, dy = 0;
      if (!uiBlocked) {
        if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyZ"]) dy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
        if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyQ"]) dx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
      }
      const mounted = (sharedRef.current.horses || []).some(h => h.rider === me.id);
      const moving = (dx || dy) && actAnimRef.current <= 0;
      if (moving) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        const sp = C.PLAYER_SPEED * (mounted ? C.HORSE_SPEED_MULT : 1) * dt;
        const nx = m.x + dx * sp, ny = m.y + dy * sp;
        if (canStand(w, nx, m.y)) m.x = nx;
        if (canStand(w, m.x, ny)) m.y = ny;
        if (dx < 0) m.dir = 2; else if (dx > 0) m.dir = 3; else if (dy < 0) m.dir = 1; else if (dy > 0) m.dir = 0;
        m.animT += dt * 9;
      } else m.animT = 0;
      m.moving = !!moving;
      const now = performance.now();
      if (now - lastPosSentRef.current > 1000 / C.POS_TICK_HZ) { lastPosSentRef.current = now; sendPos(); }
    }
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
      const lift = riding ? 8 : 0; // le cavalier est surélevé sur la monture
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(px + 8, py + 15, riding ? 9 : 6, riding ? 3 : 2.5, 0, 0, 7); ctx.fill();
      if (isPrimaryRider) {
        // Le cheval n'est dessiné qu'une fois, porté par le cavalier
        // principal, et se retourne avec lui selon le sens de la marche.
        ctx.save();
        if (flip) { ctx.translate(basePx + 22, py - 6); ctx.scale(-1, 1); ctx.drawImage(sprites.horse, 0, 0); }
        else ctx.drawImage(sprites.horse, basePx - 6, py - 6);
        ctx.restore();
      }
      ctx.save();
      if (flip) { ctx.translate(px + 16, py - 8 - lift); ctx.scale(-1, 1); ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, 0, 0, 16, 24); }
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
  // Position du chaudron ramené (chantier 2026-07, demande Guillaume) : posé
  // n'importe où par un joueur, retrouvée en scannant w.objects — un seul
  // chaudron possible pour toute la ferme (voir resolveCauldronPlace côté
  // hôte), le scan reste donc négligeable (appelé seulement pour le prompt E
  // et l'interaction, jamais par tick). Renvoie null si pas encore posé.
  function findCauldronTile() {
    const w = worldRef.current; if (!w) return null;
    for (let i = 0; i < w.objects.length; i++) if (w.objects[i] === C.O_CAULDRON) return { x: E.xOf(i), y: E.yOf(i) };
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
      const already = sharedRef.current.salveCraft && sharedRef.current.salveCraft.cauldronUnlocked;
      if (!already && nearTile(C.EVIL_CAULDRON_SPAWN)) evilCauldronPickup();
      return;
    }
    // Vendre l'animal porté (outil "déplacer") est prioritaire sur toute
    // autre interaction : un joueur les mains prises ne peut de toute façon
    // rien faire d'autre tant qu'il n'a pas déposé ou vendu l'animal, comme
    // le montre déjà `selectSlot` qui relâche l'animal au changement d'outil.
    if (heldAnimalRef.current !== -1) {
      sendReq({ kind: "sellAnimal", animal: heldAnimalRef.current });
      heldAnimalRef.current = -1; setCarryingAnimal(false);
      return;
    }
    const injured = nearestInjuredPlayer();
    if (injured && !isInjured()) sendReq({ kind: "heal", targetId: injured.id });
    else if (nearTile(C.SHOP)) setShopOpen(true);
    else if (nearTile(C.BIN)) setBinOpen(true);
    else if (nearTile(C.HOUSE_DOOR)) { if (meRef.current.sleeping) wakeUp(false); else startSleep(); }
    else if (nearTile(C.COOP_SITE) && sharedRef.current.coop) sendReq({ kind: "coopDeposit" });
    else if (nearTile(C.BARN_SITE)) {
      const b = sharedRef.current.barn;
      if (!b || b.level >= C.BARN_LEVELS.length) pushToast(L.toastBarnMax);
      else if (b.ready) setBarnMini({ level: b.level + 1 });
      else sendReq({ kind: "barnDeposit" });
    }
    else if (findCauldronTile() && nearTile(findCauldronTile())) {
      const sc = sharedRef.current.salveCraft || { trout: 0, pike: 0 };
      const rec = C.SALVE_RECIPE, gemsNow = (sharedRef.current.gems && sharedRef.current.gems[0]) || 0;
      const ready = sc.trout >= rec.trout && sc.pike >= rec.pike && gemsNow >= rec.amethyst;
      if (ready) { salveBrew(); return; }
      const hasTrout = myInv && (myInv.fish && myInv.fish[1] || 0) > 0;
      const hasPike = myInv && (myInv.fish && myInv.fish[2] || 0) > 0;
      if (hasTrout) salveDeposit("trout");
      else if (hasPike) salveDeposit("pike");
      else pushToast(L.toastCauldronMissing);
    }
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
    if (v) channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: meRef.current.name, msg: v.slice(0, 120) } });
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
  const sellCommonFish = (fishId) => sendReq({ kind: "sell", item: "commonFish", fish: fishId, n: 9999 });
  const sellGem = (gemId) => sendReq({ kind: "sell", item: "gem", gem: gemId, n: 9999 });

  // -------- Rendu React (UI par-dessus le canvas) --------
  const TOOL_NAMES = lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES;
  const slots = [
    { key: "tools", icon: toolKind }, { key: "can", icon: "can" },
    { key: "seeds", icon: "seeds" }, { key: "food", icon: "food" },
    { key: "rod", icon: "rod" }, { key: "fence", icon: "fence" }, { key: "herd", icon: "herd" },
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
            <div className="ferme-join-err">{!worldReady ? L.connecting : ""}</div>
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
        <div className="row">📅 {L.day} {hud.day} &nbsp; 🕐 {clockStr}</div>
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
        <button className="ferme-btn ferme-btn-ghost" onClick={changeCharacter}>{L.btnChangeChar}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={leaveGame}>{L.btnLeave}</button>
      </div>

      {/* Invite proximité */}
      {promptKey && <div className="ferme-prompt">{promptKey === "sellAnimal" ? L.promptSellAnimal(Math.round(((C.ANIMALS[(sharedRef.current.animals[heldAnimalRef.current] || {}).type] || {}).cost || 0) / 3)) : promptKey === "shop" ? L.promptShop : promptKey === "coop" ? L.promptCoop : promptKey === "barn" ? L.promptBarn : promptKey === "barnBuild" ? L.promptBarnBuild : promptKey === "cauldron" ? L.promptCauldron : promptKey === "salveDeposit" ? L.promptSalveDeposit : promptKey === "salveBrew" ? L.promptSalveBrew : promptKey === "evilCauldronPickup" ? L.promptEvilCauldronPickup : promptKey === "sleep" ? L.promptSleep : promptKey === "wake" ? L.promptWake : L.promptBin}</div>}
      {mountPrompt && <div className="ferme-prompt ferme-prompt-mount">{mountPrompt === "mount" ? L.mountPrompt : L.dismountPrompt}</div>}

      {/* Barre d'outils */}
      <div className="ferme-toolbar panel">
        {slots.map((s, i) => {
          const isSeed = s.key === "seeds", isFood = s.key === "food", isRod = s.key === "rod", isFence = s.key === "fence", isHerd = s.key === "herd", isTools = s.key === "tools";
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
          else lvl = "N" + (myTools[s.key] || 1);
          const title = isSeed ? L.seedTip(seedName(seedSel)) : isFood ? L.foodTip(C.FOOD_ENERGY) : isRod ? L.rodTip
            : isFence ? (buildKind === "wall" ? L.wallTip : buildKind === "path" ? L.pathTip : buildKind === "lamp" ? L.lampTip : buildKind === "scarecrow" ? L.scarecrowTip
              : buildKind === "grass" ? L.grassTip : buildKind === "mill" ? L.millTip : buildKind === "cauldron" ? L.cauldronRowSub
              : buildKind === "bridgeRenovate" ? L.bridgeRenovateTip
              : (buildKind === "bridgeWood" || buildKind === "bridgeStone") ? L.bridgeTip : L.fenceTip)
            : isHerd ? L.herdTip : isTools ? L.toolsTip(TOOL_NAMES[toolKind]) : TOOL_NAMES[s.key];
          return (
            <div key={s.key} className={"ferme-slot" + (i === slot ? " sel" : "")} onClick={() => selectSlot(i)} title={title}>
              <span className="ferme-slot-key">{i + 1}</span>
              <Sprite img={img} w={32} h={32} />
              {count !== "" && <span className="ferme-slot-count">{count}</span>}
              {lvl && <span className="ferme-slot-lvl">{lvl}</span>}
            </div>
          );
        })}
      </div>

      {/* Mini-menu de choix de graine (clic sur la case graines) : liste
          cliquable avec icône, nom et quantité, plutôt qu'un cycle à l'aveugle. */}
      {seedMenuOpen && (
        <div className="ferme-seed-menu-ov" onClick={() => setSeedMenuOpen(false)}>
          <div className="ferme-seed-menu panel" onClick={e => e.stopPropagation()}>
            <div className="ferme-seed-menu-title">{L.seedMenuTitle}</div>
            {C.CROPS.map(cr => (
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
            {C.CROPS.map(cr => (
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
            <div className="ferme-usage">{L.seedsUsageHint}</div>
            {C.CROPS.map(cr => (
              <div className="ferme-shop-row" key={"s" + cr.id}>
                <Sprite img={spritesReady ? spritesRef.current.crops[cr.id][C.CROP_STAGES - 1] : null} w={32} h={32} />
                <div className="info"><b>{L.seedCostLabel(cr)}</b><span>{L.seedRowSub(cr)}{myInv ? myInv.seeds[cr.id] : 0}</span></div>
                <button disabled={hud.money < cr.seedCost} onClick={() => buySeed(cr.id, 1)}>{L.buy1}</button>
                <button disabled={hud.money < cr.seedCost * 5} onClick={() => buySeed(cr.id, 5)}>{L.buy5}</button>
              </div>
            ))}
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.icons.food : null} w={32} h={32} />
              <div className="info"><b>{L.foodRowTitle(C.FOOD_COST)}</b><span>{L.foodRowSub(C.FOOD_ENERGY, myInv ? myInv.food : 0)}</span></div>
              <button disabled={hud.money < C.FOOD_COST} onClick={buyFood}>{L.buyOne}</button>
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
            <div className="ferme-tools-header">🏗️</div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.horse : null} w={36} h={30} />
              <div className="info"><b>{L.shopHorseTitle(C.HORSE_COSTS[Math.min(buildings.horseCount, C.HORSE_MAX_COUNT - 1)])}</b><span>{L.shopHorseSub}</span><span className="ferme-usage">{buildings.horseCount >= C.HORSE_MAX_COUNT ? L.shopHorseMax : L.shopHorseCount(buildings.horseCount, C.HORSE_MAX_COUNT)}</span></div>
              <button disabled={buildings.horseCount >= C.HORSE_MAX_COUNT || hud.money < C.HORSE_COSTS[Math.min(buildings.horseCount, C.HORSE_MAX_COUNT - 1)]} onClick={buyHorse}>{buildings.horseCount >= C.HORSE_MAX_COUNT ? L.maxLabel : L.buyLabel}</button>
            </div>
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
              <Sprite img={spritesReady ? spritesRef.current.grassPatch : null} w={16} h={16} />
              <div className="info"><b>{L.grassRowTitle(C.GRASS_COST)}</b><span>{L.grassRowSub(myInv ? (myInv.grass || 0) : 0)}</span></div>
              <button disabled={hud.money < C.GRASS_COST} onClick={() => buyGrass(1)}>{L.buy1}</button>
              <button disabled={hud.money < C.GRASS_COST * 5} onClick={() => buyGrass(5)}>{L.buy5}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.mill : null} w={30} h={36} />
              <div className="info"><b>{L.millRowTitle(C.MILL_COST)}</b><span>{L.millRowSub(myInv ? (myInv.mill || 0) : 0)}</span></div>
              <button disabled={hud.money < C.MILL_COST} onClick={() => buyMill(1)}>{L.buy1}</button>
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
            <div className="ferme-tools-header">{L.shopAnimalsHeader}</div>
            {C.ANIMALS.map(a => (
              <div className="ferme-shop-row" key={"an" + a.id}>
                <Sprite img={spritesReady ? spritesRef.current.animals[a.id] : null} w={32} h={28} />
                <div className="info"><b>{L.animalRowTitle(lang === "en" ? a.nameEn : a.name, a.cost)}</b><span>{L.animalRowSub(lang === "en" ? a.prodEn : a.prod, a.sell, Math.round(a.prodMs / 3600000))}</span></div>
                <button disabled={hud.money < a.cost || buildings.animalCount >= E.barnAnimalCap(barn ? barn.level : 0)} onClick={() => buyAnimal(a.id)}>{L.buyLabel}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bac de vente */}
      {binOpen && (
        <div className="ferme-modal open" onClick={() => setBinOpen(false)}>
          <div className="panel ferme-modal-panel" onClick={e => e.stopPropagation()}>
            <button className="ferme-close-x" onClick={() => setBinOpen(false)}>✕</button>
            <h2>{L.binTitle}</h2><div className="ferme-hint">{L.binHint}</div>
            {C.CROPS.map(cr => {
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
          </div>
        </div>
      )}

      {/* Minijeu de pêche (difficulté selon le type de poisson) */}
      {fishMini && <FishMinigame mode={fishMini.mode} fish={fishMini.fish} L={L} lang={lang} onWin={fishWon} onFail={fishLost} />}
      {barnMini && <BarnMinigame level={barnMini.level} L={L} onWin={barnWon} onFail={barnLost} />}
      {wolfBite && <WolfBiteMinigame L={L} onWin={wolfBiteWon} onFail={wolfBiteLost} />}

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
