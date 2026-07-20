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

export default function FermeGame({ room, me, isHost, players, t, lang, onFinish }) {
  const L = fstr(lang);

  // -------- État React (piloté par évènements, basse fréquence) --------
  // Phases : "code" (hôte : saisit le code de ferme) -> "select" (choix du
  // perso, sauté si déjà mémorisé) -> "playing". L'invité démarre en "select"
  // (il attend l'instantané de l'hôte, sans saisir de code).
  const [phase, setPhase] = useState(isHost ? "code" : "select");
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
  const [shopOpen, setShopOpen] = useState(false);
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
  const [gems, setGems] = useState(() => C.GEMS.map(() => 0)); // miroir React de sharedRef.current.gems (pool commun à la salle)
  const [flour, setFlour] = useState(0); // miroir React de sharedRef.current.flour (sacs de farine, pool commun à la salle, chantier 2026-07)

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
  const chatInputRef = useRef(null);
  const channelRef = useRef(null);
  const spritesRef = useRef(null);
  const worldRef = useRef(null);
  const meRef = useRef(null);
  const playersRef = useRef(new Map()); // id -> remote farmer render data
  const farmersRef = useRef({});        // hôte : id -> état privé arbitré
  const sharedRef = useRef({ seed: 0, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), flour: 0, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [] });
  const invRef = useRef(null);
  const toolsRef = useRef({ hoe: 1, can: 1, axe: 1, pick: 1 });
  const energyRef = useRef(C.MAX_ENERGY);
  const keysRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const slotRef = useRef(0);
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

  useEffect(() => { fishMiniRef.current = !!fishMini || !!barnMini || !!wolfBite; }, [fishMini, barnMini, wolfBite]);
  useEffect(() => { injuredUntilRef.current = injuredUntil || 0; }, [injuredUntil]);
  useEffect(() => { mapOpenRef.current = mapOpen; }, [mapOpen]);
  useEffect(() => { shopOpenRef.current = shopOpen; }, [shopOpen]);
  useEffect(() => { binOpenRef.current = binOpen; }, [binOpen]);
  useEffect(() => { slotRef.current = slot; }, [slot]);
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
        gems: migrateGems(saved),
        flour: saved.flour || 0,
        wolves: [], wolfNight: { active: false, kills: 0 }, // repartent à zéro à la reprise, respawn dérivé de l'heure courante
        rabbits: [], // même principe : repartent à zéro, repop dérivé de l'heure courante (voir updateRabbits)
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
      sharedRef.current = { seed, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horses: [], animals: [], wellBuilt: false, coop: null, barn: E.newBarnState(), gems: C.GEMS.map(() => 0), flour: 0, wolves: [], wolfNight: { active: false, kills: 0 }, rabbits: [] };
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
    }
    setCodeLoading(false);
    setHud(h => ({ ...h, money: sharedRef.current.money, day: sharedRef.current.day }));
    setCoop(sharedRef.current.coop);
    setBarn(sharedRef.current.barn);
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
    syncBuildings();
    setWorldReady(true);
    setPhase("select"); // l'effet d'auto-spawn décidera de sauter cet écran
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
      if (o === C.O_TREE || o === C.O_TREE2) col = [46, 106, 40];
      else if (o === C.O_ROCK || o === C.O_WALL) col = [130, 130, 138];
      else if (o === C.O_LAMP) col = [230, 200, 100];
      else if (o === C.O_SCARECROW) col = [212, 178, 90];
      else if (o === C.O_LEVER) col = [80, 80, 88];
      else if (o === C.O_MILL) col = [169, 119, 63];
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
      gems: migrateGems(payload),
      flour: payload.flour || 0,
      wolves: payload.wolves || [], wolfNight: { active: !!(payload.wolves && payload.wolves.length), kills: 0 },
      rabbits: payload.rabbits || [],
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
        if (rp) rp.injuredUntil = farmersRef.current[id].injuredUntil || 0;
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
    }
    minimapDirtyRef.current = true;
    setHud(h => ({ ...h, money: payload.money, day: payload.day }));
    setCoop(sharedRef.current.coop);
    setBarn(sharedRef.current.barn);
    setGems(sharedRef.current.gems);
    setFlour(sharedRef.current.flour || 0);
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
      r.torch = !!payload.torch;
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
      playersRef.current.set(p.id, { id: p.id, name: p.name, gender: p.gender || "m", outfit: p.outfit || 0, x: p.x ?? C.SPAWN.x, y: p.y ?? C.SPAWN.y, tx: p.x ?? C.SPAWN.x, ty: p.y ?? C.SPAWN.y, dir: p.dir || 0, moving: false, tool: 0, animT: 0, sleeping: false, torch: false });
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
      horses: s.horses, animals: s.animals, wellBuilt: s.wellBuilt, coop: s.coop, barn: s.barn, gems: s.gems, flour: s.flour, wolves: s.wolves,
      rabbits: s.rabbits,
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
    const out = { tiles: [], crops: [], mills: null, fx: [], state: null, farmer: null, toast: null, chat: null, horses: null, animals: null, wellBuilt: false, coop: undefined, barn: undefined };
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
    if (p.wellBuilt) { sharedRef.current.wellBuilt = true; minimapDirtyRef.current = true; syncBuildings(); }
    if (p.coop !== undefined) { sharedRef.current.coop = p.coop; setCoop(p.coop); }
    if (p.barn !== undefined) { sharedRef.current.barn = p.barn; setBarn(p.barn); minimapDirtyRef.current = true; }
    if (p.gems) { sharedRef.current.gems = p.gems; setGems(p.gems); }
    if (p.flour !== undefined) { sharedRef.current.flour = p.flour; setFlour(p.flour); }
  }
  function applyNewDay(p) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current; s.day = p.day; s.dayStartAt = p.dayStartAt;
    if (p.tiles) for (const tl of p.tiles) { w.ground[tl.i] = tl.g; w.objects[tl.i] = tl.o; if (tl.o !== C.O_NONE && tl.o !== C.O_STUMP) w.objHp.set(tl.i, tl.o === C.O_ROCK ? C.ROCK_HP : C.TREE_HP); minimapDirtyRef.current = true; }
    if (p.crops) for (const cr of p.crops) { if (cr.c) w.crops.set(cr.i, { t: cr.c.t, bankedMs: cr.c.bankedMs || 0, wateredAt: cr.c.wateredAt || null }); else w.crops.delete(cr.i); }
    // Énergie restaurée pour tous (accord avec l'hôte).
    energyRef.current = C.MAX_ENERGY; setMyEnergy(C.MAX_ENERGY);
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    setHud(h => ({ ...h, day: p.day }));
    pushToast(L.toastNewDay(p.day));
  }
  function toastMsg(key) {
    return { tired: L.toastTired, farShop: L.toastFarShop, farBin: L.toastFarBin, noGold: L.toastNoGold, toolMax: L.toastToolMax, needWater: L.toastNeedWater, penFull: L.penFull, noFence: L.toastNoFence, noWood: L.toastNoWood, noStone: L.toastNoStone, noWallStock: L.toastNoWallStock, noPathStock: L.toastNoPathStock, noLampStock: L.toastNoLampStock, noScarecrowStock: L.toastNoScarecrowStock, noGrassStock: L.toastNoGrassStock, noMillStock: L.toastNoMillStock, millNotEmpty: L.toastMillNotEmpty, noWheatToDeposit: L.toastNoWheatToDeposit, millFull: L.toastMillFull, actionFailed: L.toastActionFailed, coopNone: L.toastCoopNone, farCoop: L.toastFarCoop, coopNothing: L.toastCoopNothing, barnMax: L.toastBarnMax, farBarn: L.toastFarBarn, barnReady: L.toastBarnReadyWait, barnNotReady: L.toastBarnNotReady, barnNeedMoney: L.toastBarnNeedMoney, sleepFull: L.toastSleepFull, notInjured: L.toastNotInjured, noHealKit: L.toastNoHealKit, healTooFar: L.toastHealTooFar }[key] || "";
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
        const tilesOut = tiles.map(i => { recordTileOverride(i); return { i, g: w.ground[i], o: w.objects[i] }; });
        // Depuis le zip 151, la pousse/l'arrosage/la production animale sont en
        // temps réel (voir cropGrowState/animalReady) : ce passage de jour ne
        // fait plus produire les animaux, il ne fait que régénérer un peu de
        // nature et restaurer l'énergie (voir E.newDay).
        dirtyRef.current = true;
        channelRef.current?.send({ type: "broadcast", event: "newday", payload: { day: s.day, dayStartAt: s.dayStartAt, tiles: tilesOut, crops: [], animals: s.animals } });
        channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: "☀", msg: L.chatNewDay(s.day) } });
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
    meRef.current = { id: me.id, name, gender: g === "f" ? "f" : "m", outfit: outfit | 0, x: C.SPAWN.x, y: C.SPAWN.y, dir: 0, moving: false, animT: 0, sleeping: false };
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
    return { id: m.id, name: m.name, gender: m.gender, outfit: m.outfit, x: +m.x.toFixed(2), y: +m.y.toFixed(2), dir: m.dir, moving: m.moving, tool: slotRef.current, sleeping: !!m.sleeping, torch: !!torchOnRef.current };
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
    const w = worldRef.current; if (!w) return;
    // Priorité : ramasser la production d'un animal proche.
    const ai = nearestCollectable();
    if (ai >= 0) { actAnimRef.current = 0.28; sendReq({ kind: "collect", animal: ai }); return; }
    const tt = targetTile();
    if (!inMap(tt.x, tt.y)) return;
    const i = idxOf(tt.x, tt.y);
    const sl = slotRef.current;
    if (sl === 6) { startFishing(tt); return; } // pêche = minijeu
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
    // (case 8), auquel cas le clic sert à retirer/reposer le moulin lui-même
    // (voir resolveAct cas "mill", branche sl===7 plus bas).
    if (w.objects[i] === C.O_MILL && E.buildReady(w.objHp.get(i), Date.now()) && !(sl === 7 && buildKindRef.current === "mill")) {
      return sendReq({ kind: "act", action: "millDeposit", x: tt.x, y: tt.y });
    }
    if (sl === 0) sendReq({ kind: "act", action: "till", x: tt.x, y: tt.y });
    else if (sl === 1) sendReq({ kind: "act", action: "water", x: tt.x, y: tt.y });
    else if (sl === 2) sendReq({ kind: "act", action: "chop", x: tt.x, y: tt.y });
    else if (sl === 3) sendReq({ kind: "act", action: "mine", x: tt.x, y: tt.y });
    else if (sl === 4) sendReq({ kind: "act", action: "plant", seed: seedSelRef.current, x: tt.x, y: tt.y });
    else if (sl === 5) sendReq({ kind: "eat" });
    else if (sl === 7) {
      // Outil "Construction" (case 8) : variante choisie via le menu
      // Construire/Vendre (fence = clôture bois, wall = mur pierre,
      // path = chemin dallé, lamp = lampadaire acheté en or, scarecrow =
      // épouvantail acheté en or, bridgeWood/bridgeStone = case de pont,
      // chantier 2026-07). L'orientation (dir) n'a de sens que pour la
      // clôture ; l'envoyer pour les autres variantes est sans effet. Le
      // pont n'a pas de stock à part : le coût (bois ou pierre) est prélevé
      // directement à la pose côté hôte (voir resolveAct cas "bridge").
      const bk = buildKindRef.current;
      const action = bk === "wall" ? "wall" : bk === "path" ? "path" : bk === "lamp" ? "lamp" : bk === "scarecrow" ? "scarecrow"
        : bk === "grass" ? "grass" : bk === "mill" ? "mill"
        : (bk === "bridgeWood" || bk === "bridgeStone") ? "bridge" : "fence";
      sendReq({ kind: "act", action, x: tt.x, y: tt.y, dir: fenceDirRef.current, material: bk === "bridgeStone" ? "stone" : "wood" });
    }
    else if (sl === 8) {
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
  function teleportWell() {
    const m = meRef.current; if (!m || !sharedRef.current.wellBuilt) return;
    m.x = C.WELL_SPAWN.x; m.y = C.WELL_SPAWN.y; m.moving = false;
    sendPos(); pushToast(L.wellToast);
  }
  const buyHorse = () => sendReq({ kind: "buyHorse" });
  const buyWell = () => sendReq({ kind: "buyWell" });
  const buyAnimal = (type) => sendReq({ kind: "buyAnimal", animal: type });
  const sellProduct = (type) => sendReq({ kind: "sell", item: "product", product: type, n: 9999 });

  // -------- Téléport maison (nouveauté) --------
  function teleportHome() {
    const m = meRef.current; if (!m) return;
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
      if (e.code >= "Digit1" && e.code <= "Digit9") selectSlot(+e.code.slice(5) - 1);
      if (e.code === "Space") { e.preventDefault(); doAction(); }
      if (e.code === "KeyE") tryOpenNearby();
      if (e.code === "KeyF") toggleMount();
      if (e.code === "KeyR" && slotRef.current === 7 && buildKindRef.current === "fence") {
        fenceDirRef.current = fenceDirRef.current === "auto" ? "h" : fenceDirRef.current === "h" ? "v" : "auto";
        setFenceDir(fenceDirRef.current);
        pushToast(L.fenceDirToast(fenceDirRef.current));
      }
      if (e.code === "KeyT") { e.preventDefault(); setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 0); }
      if (e.code === "KeyM") setMapOpen(o => !o);
      if (e.code === "Escape") { setShopOpen(false); setBinOpen(false); setMapOpen(false); setSeedMenuOpen(false); setCraftMenuOpen(null); }
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
        else if (g === C.G_BRIDGE_SITE) img = sprites.bridgeRuin;
        else if (g === C.G_GRASS_GROWING) img = sprites.tilled;
        else img = sprites.path;
        ctx.drawImage(img, x * T, y * T);
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
        if (g === C.G_BRIDGE_CLOSED) {
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
          const closed = k >= 0 && w.ground[w.bridgeSites[k][0]] === C.G_BRIDGE_CLOSED;
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
          const px = Math.round(rb.x * T - 8), py = Math.round(rb.y * T - 7);
          if (rb.dir === 2) { ctx.save(); ctx.translate(px + 16, py); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
          else ctx.drawImage(img, px, py);
        } });
      }
      if (!m.sleeping) draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) });
      for (const p of playersRef.current.values()) if (!p.sleeping) draws.push({ y: (p.y + 1) * T, fn: () => drawRemote(p) });
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

      // Invite boutique/bac
      let pk = null;
      if (nearTile(C.SHOP)) pk = "shop"; else if (nearTile(C.BIN)) pk = "bin";
      else if (nearTile(C.HOUSE_DOOR)) pk = m.sleeping ? "wake" : "sleep";
      else if (nearTile(C.COOP_SITE) && sharedRef.current.coop) pk = "coop";
      else if (nearTile(C.BARN_SITE)) { const b = sharedRef.current.barn; if (b && b.level < C.BARN_LEVELS.length) pk = b.ready ? "barnBuild" : "barn"; }
      setPromptKeyThrottled(pk);
      // Invite cheval (monter/descendre) : plusieurs chevaux possibles.
      const hs = sharedRef.current.horses || []; let mp = null;
      if (hs.some(h => h.rider === me.id || h.rider2 === me.id)) mp = "dismount";
      else if (nearestMountableHorse() >= 0) mp = "mount";
      setMountPromptThrottled(mp);

      if (mapOpenRef.current) drawFullMap();
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
    function updateMe(dt) {
      const m = meRef.current, w = worldRef.current, keys = keysRef.current;
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
      if (actAnimRef.current > 0 && slotRef.current < 4) {
        const sprites = spritesRef.current;
        const key = ["hoe", "can", "axe", "pick"][slotRef.current];
        const px = Math.round(m.x * T), py = Math.round(m.y * T);
        const fx2 = [0, 0, -1, 1][m.dir], fy2 = [1, -1, 0, 0][m.dir];
        ctx.drawImage(sprites.icons[key], px + fx2 * 10 + 2, py + fy2 * 8 - 4);
      }
    }
    function drawRemote(p) { drawCharacter(p, false); }
    function drawCharacter(p, isSelf) {
      const sprites = spritesRef.current;
      const sheet = sprites.getChar(p.gender, p.outfit);
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
  // Case graines : au lieu de cycler à l'aveugle, un clic ouvre/ferme un
  // petit menu listant chaque graine (icône, nom, quantité) pour choisir
  // directement. Les autres emplacements ferment le menu s'il était ouvert.
  function selectSlot(s) {
    if (s === 4) setSeedMenuOpen(o => (slotRef.current === 4 ? !o : true));
    else setSeedMenuOpen(false);
    setCraftMenuOpen(null);
    // Changer d'outil en portant un animal l'annule (relâché sans être
    // déplacé), pour ne jamais le laisser "coincé" en main d'un joueur.
    if (s !== 8 && heldAnimalRef.current !== -1) {
      sendReq({ kind: "dropAnimal", animal: heldAnimalRef.current });
      heldAnimalRef.current = -1; setCarryingAnimal(false);
    }
    setSlot(s);
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
    if (isHost) { onFinish && onFinish(); return; }
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
  const sellFlour = () => sendReq({ kind: "sell", item: "flour", n: 9999 });
  const sellItem = (item, crop) => sendReq({ kind: "sell", item, crop, n: 9999 });
  // Menu Construire (clic sur bois/pierre du HUD) : fabrique `n` sections de
  // `item` (fence/wall/path) depuis le bois/la pierre récoltés, puis équipe
  // directement l'outil Construction (case 8) sur cette variante, prêt à
  // poser au prochain clic sur une case.
  function craftBuild(item, n) {
    sendReq({ kind: "craft", item, n });
    buildKindRef.current = item; setBuildKind(item);
    selectSlot(7);
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
    selectSlot(7);
    setCraftMenuOpen(null);
  }
  const sellFish = (fishId) => sendReq({ kind: "sell", item: "fish", fish: fishId, n: 9999 });
  const sellGem = (gemId) => sendReq({ kind: "sell", item: "gem", gem: gemId, n: 9999 });

  // -------- Rendu React (UI par-dessus le canvas) --------
  const TOOL_NAMES = lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES;
  const slots = [
    { key: "hoe", icon: "hoe" }, { key: "can", icon: "can" }, { key: "axe", icon: "axe" },
    { key: "pick", icon: "pick" }, { key: "seeds", icon: "seeds" }, { key: "food", icon: "food" },
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

      {/* Boutons flottants (nouveautés incluses) */}
      <div className="ferme-actions">
        <button className="ferme-btn" onClick={teleportHome}>{L.btnHome}</button>
        {buildings.wellBuilt && <button className="ferme-btn" onClick={teleportWell}>{L.btnWell}</button>}
        <button className="ferme-btn" onClick={() => setMapOpen(true)}>{L.btnMap}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={changeCharacter}>{L.btnChangeChar}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={leaveGame}>{L.btnLeave}</button>
      </div>

      {/* Invite proximité */}
      {promptKey && <div className="ferme-prompt">{promptKey === "shop" ? L.promptShop : promptKey === "coop" ? L.promptCoop : promptKey === "barn" ? L.promptBarn : promptKey === "barnBuild" ? L.promptBarnBuild : promptKey === "sleep" ? L.promptSleep : promptKey === "wake" ? L.promptWake : L.promptBin}</div>}
      {mountPrompt && <div className="ferme-prompt ferme-prompt-mount">{mountPrompt === "mount" ? L.mountPrompt : L.dismountPrompt}</div>}

      {/* Barre d'outils */}
      <div className="ferme-toolbar panel">
        {slots.map((s, i) => {
          const isSeed = s.key === "seeds", isFood = s.key === "food", isRod = s.key === "rod", isFence = s.key === "fence", isHerd = s.key === "herd";
          let count = "", lvl = "", img = spritesReady ? spritesRef.current.icons[s.icon] : null;
          if (isSeed) { count = myInv ? myInv.seeds[seedSel] : ""; img = spritesReady ? spritesRef.current.crops[seedSel][C.CROP_STAGES - 1] : null; }
          else if (isFood) count = myInv ? myInv.food : "";
          else if (isRod) { /* pas de niveau ni de compteur */ }
          else if (isFence) {
            // Outil "Construction" générique (chantier 2026-07) : icône,
            // compteur et infobulle dépendent de la variante choisie via le
            // menu Construire/Vendre (fence/wall/path/lamp/scarecrow), pas
            // seulement clôture.
            const bkImg = buildKind === "wall" ? "wall" : buildKind === "path" ? "path" : buildKind === "lamp" ? "lamp" : buildKind === "scarecrow" ? "scarecrow"
              : buildKind === "grass" ? "grassPatch" : buildKind === "mill" ? "mill"
              : (buildKind === "bridgeWood" || buildKind === "bridgeStone") ? "bridge" : "fence";
            // Pour le pont, pas de stock dédié (voir craft menu) : le compteur
            // affiche directement le bois/la pierre disponible pour la
            // variante choisie, cohérent avec le coût prélevé à la pose.
            count = myInv ? (buildKind === "wall" ? (myInv.wall || 0) : buildKind === "path" ? (myInv.path || 0) : buildKind === "lamp" ? (myInv.lamp || 0) : buildKind === "scarecrow" ? (myInv.scarecrow || 0)
              : buildKind === "grass" ? (myInv.grass || 0) : buildKind === "mill" ? (myInv.mill || 0)
              : buildKind === "bridgeWood" ? (myInv.wood || 0) : buildKind === "bridgeStone" ? (myInv.stone || 0) : (myInv.fence || 0)) : "";
            img = spritesReady ? spritesRef.current[bkImg] : null;
            lvl = buildKind === "fence" ? (fenceDir === "h" ? "↔" : fenceDir === "v" ? "↕" : "R") : "";
          }
          else if (isHerd) { if (carryingAnimal) lvl = "●"; }
          else lvl = "N" + (myTools[s.key] || 1);
          const title = isSeed ? L.seedTip(seedName(seedSel)) : isFood ? L.foodTip(C.FOOD_ENERGY) : isRod ? L.rodTip
            : isFence ? (buildKind === "wall" ? L.wallTip : buildKind === "path" ? L.pathTip : buildKind === "lamp" ? L.lampTip : buildKind === "scarecrow" ? L.scarecrowTip
              : buildKind === "grass" ? L.grassTip : buildKind === "mill" ? L.millTip
              : (buildKind === "bridgeWood" || buildKind === "bridgeStone") ? L.bridgeTip : L.fenceTip)
            : isHerd ? L.herdTip : TOOL_NAMES[s.key];
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

      {/* Menu Construire/Vendre (clic sur bois ou pierre du HUD) : choisir de
          fabriquer des sections de construction (clôture/mur/chemin) depuis
          la ressource récoltée, ou de tout vendre au bac (chantier 2026-07). */}
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
                  <Sprite img={spritesReady ? spritesRef.current.bridge : null} w={26} h={26} />
                  <span className="name">{L.buildBridgeStoneLabel}<br /><span className="cost">{L.buildCostBridgeStone(C.BRIDGE_COST_STONE)}</span></span>
                  <button disabled={!myInv || myInv.stone < C.BRIDGE_COST_STONE} onClick={() => equipBridge("stone")}>{L.equipBtn}</button>
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
   plein écran, fond rouge, très difficile à dessein (fenêtre courte +
   décroissance rapide de la jauge). Il faut marteler Espace/clic pour faire
   monter la jauge de lutte jusqu'à 1 AVANT C.WOLF_BITE_REACT_MS, sans quoi
   (ou si le joueur ne réagit pas du tout) c'est un échec — voir onFail, qui
   se contente d'informer l'hôte : la blessure elle-même est appliquée côté
   hôte (délai de grâce wf.biteDeadline dans updateWolves), ce composant ne
   fait que tenter de la devancer.
   ============================================================================ */
function WolfBiteMinigame({ L, onWin, onFail }) {
  const [, force] = useState(0);
  const s = useRef(null);
  const done = useRef(false);

  const finish = (kind) => { if (done.current) return; done.current = true; if (kind === "win") onWin(); else onFail(); };
  const press = () => {
    const st = s.current; if (!st || done.current) return;
    st.prog = Math.min(1, st.prog + 0.11);
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
      st2.prog = Math.max(0, st2.prog - 0.55 * dt); // décroissance rapide : il faut marteler en continu
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
