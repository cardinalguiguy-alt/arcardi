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
import { resetRoomToLobby } from "@/lib/gameSync";
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
  const [slot, setSlot] = useState(0);
  const [seedSel, setSeedSel] = useState(0);
  const [buildings, setBuildings] = useState({ horseOwned: false, wellBuilt: false, animalCount: 0 });
  const [onHorse, setOnHorse] = useState(false);
  const [fishMini, setFishMini] = useState(null); // {mode, fish} pendant le minijeu, sinon null
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

  // -------- Refs (état du jeu, lus par la boucle de rendu) --------
  const canvasRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const chatInputRef = useRef(null);
  const channelRef = useRef(null);
  const spritesRef = useRef(null);
  const worldRef = useRef(null);
  const meRef = useRef(null);
  const playersRef = useRef(new Map()); // id -> remote farmer render data
  const farmersRef = useRef({});        // hôte : id -> état privé arbitré
  const sharedRef = useRef({ seed: 0, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horse: { owned: false, x: C.SPAWN.x + 2, y: C.SPAWN.y, rider: null }, animals: [], wellBuilt: false });
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
  const fishMiniRef = useRef(false);   // minijeu de pêche en cours (bloque le reste)

  useEffect(() => { fishMiniRef.current = !!fishMini; }, [fishMini]);
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
      E.applyOverrides(w, { groundOv: saved.groundOv, objectOv: saved.objectOv, crops: saved.crops });
      worldRef.current = w;
      overridesRef.current = { ground: { ...(saved.groundOv || {}) }, object: { ...(saved.objectOv || {}) } };
      sharedRef.current = {
        seed: saved.seed, money: saved.money, day: saved.day, dayStartAt: saved.dayStartAt, totalEarned: saved.totalEarned,
        horse: saved.horse || { owned: false, x: C.SPAWN.x + 2, y: C.SPAWN.y, rider: null },
        animals: saved.animals || [], wellBuilt: !!saved.wellBuilt,
      };
      // Le cavalier repart à pied à la reprise (aucun joueur monté au chargement).
      if (sharedRef.current.horse) sharedRef.current.horse.rider = null;
      farmersRef.current = saved.farmers || {};
    } else {
      const seed = hashSeed(code);
      worldRef.current = E.generateWorld(seed);
      overridesRef.current = { ground: {}, object: {} };
      sharedRef.current = { seed, money: C.START_MONEY, day: 1, dayStartAt: Date.now(), totalEarned: 0, horse: { owned: false, x: C.SPAWN.x + 2, y: C.SPAWN.y, rider: null }, animals: [], wellBuilt: false };
      farmersRef.current = {};
      // Crée tout de suite l'enregistrement pour réserver le code.
      persistFarm();
    }
    minimapDirtyRef.current = true;
    restoredRef.current = true;
    setCodeLoading(false);
    setHud(h => ({ ...h, money: sharedRef.current.money, day: sharedRef.current.day }));
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
      else if (gr === C.G_BRIDGE || gr === C.G_PATH) col = [154, 107, 63];
      if (o === C.O_TREE || o === C.O_TREE2) col = [46, 106, 40];
      else if (o === C.O_ROCK) col = [130, 130, 138];
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
    E.applyOverrides(w, { groundOv: payload.groundOv, objectOv: payload.objectOv, crops: payload.crops });
    worldRef.current = w;
    overridesRef.current = { ground: { ...(payload.groundOv || {}) }, object: { ...(payload.objectOv || {}) } };
    sharedRef.current = {
      seed: payload.seed, money: payload.money, day: payload.day, dayStartAt: payload.dayStartAt, totalEarned: payload.totalEarned,
      horse: payload.horse || { owned: false, x: C.SPAWN.x + 2, y: C.SPAWN.y, rider: null },
      animals: payload.animals || [], wellBuilt: !!payload.wellBuilt,
    };
    if (payload.farmers) farmersRef.current = payload.farmers;
    // Mon propre fermier (reprise) si présent
    const mine = payload.farmers && payload.farmers[me.id];
    if (mine) { invRef.current = mine.inv; toolsRef.current = mine.tools; energyRef.current = mine.energy; setMyInv(mine.inv); setMyTools(mine.tools); setMyEnergy(mine.energy); if (mine.quests) setMyQuests(mine.quests); }
    minimapDirtyRef.current = true;
    setHud(h => ({ ...h, money: payload.money, day: payload.day }));
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
    });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      if (isHost && farmersRef.current[payload.id]) { farmersRef.current[payload.id].x = payload.x; farmersRef.current[payload.id].y = payload.y; }
      if (payload.id === me.id) return;
      ensureRemote(payload);
      const r = playersRef.current.get(payload.id);
      r.tx = payload.x; r.ty = payload.y; r.dir = payload.dir; r.moving = payload.moving; r.tool = payload.tool;
      r.gender = payload.gender; r.outfit = payload.outfit; r.name = payload.name;
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
      playersRef.current.set(p.id, { id: p.id, name: p.name, gender: p.gender || "m", outfit: p.outfit || 0, x: p.x ?? C.SPAWN.x, y: p.y ?? C.SPAWN.y, tx: p.x ?? C.SPAWN.x, ty: p.y ?? C.SPAWN.y, dir: p.dir || 0, moving: false, tool: 0, animT: 0 });
    }
  }

  // -------- Hôte : construction de l'instantané + persistance --------
  function currentSnapshot() {
    const s = sharedRef.current;
    return {
      seed: s.seed, money: s.money, day: s.day, dayStartAt: s.dayStartAt, totalEarned: s.totalEarned,
      groundOv: overridesRef.current.ground, objectOv: overridesRef.current.object,
      crops: worldRef.current ? E.serializeCrops(worldRef.current) : [],
      farmers: farmersRef.current,
      horse: s.horse, animals: s.animals, wellBuilt: s.wellBuilt,
    };
  }
  function syncBuildings() {
    const s = sharedRef.current;
    setBuildings({ horseOwned: !!(s.horse && s.horse.owned), wellBuilt: !!s.wellBuilt, animalCount: (s.animals || []).length });
    setOnHorse(!!(s.horse && s.horse.rider === me.id));
  }
  function broadcastSnapshot() {
    if (!worldRef.current) return;
    channelRef.current?.send({ type: "broadcast", event: "snapshot", payload: currentSnapshot() });
  }
  function hostEnsureFarmer(id, name, gender, outfit) {
    if (farmersRef.current[id]) return farmersRef.current[id];
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
  function hostHandleReq(req) {
    const w = worldRef.current; if (!w) return;
    const f = hostEnsureFarmer(req.id, req.name);
    if (typeof req.px === "number") { f.x = req.px; f.y = req.py; }
    const s = sharedRef.current;
    const out = { tiles: [], crops: [], fx: [], state: null, farmer: null, toast: null, chat: null, horse: null, animals: null, wellBuilt: false };
    let questId = null; // action réussie -> quête à valider éventuellement
    const px = typeof req.px === "number" ? req.px : f.x, py = typeof req.py === "number" ? req.py : f.y;

    if (req.kind === "act") {
      const r = E.resolveAct(w, f, req);
      for (const i of r.tiles) { recordTileOverride(i); out.tiles.push({ i, g: w.ground[i], o: w.objects[i] }); }
      for (const i of r.cropTiles) { const c = w.crops.get(i); out.crops.push({ i, c: c ? { t: c.t, s: c.s } : null }); }
      out.fx = r.fx;
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.did) questId = r.did;
    } else if (req.kind === "buy") {
      const r = E.resolveBuy(f, s.money, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; out.state = shareState(); }
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.chat) out.chat = { from: r.chat.from, msg: L.chatToolUp(toolName(r.chat.tool), r.chat.lvl) };
    } else if (req.kind === "sell") {
      const r = E.resolveSell(f, req);
      if (r.moneyDelta) { s.money += r.moneyDelta; s.totalEarned += r.earnedDelta; out.state = shareState(); }
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.toast) out.toast = { id: f.id, key: r.toast };
      if (r.gain > 0) { out.fx.push({ k: "sell", x: C.BIN.x, y: C.BIN.y, gain: r.gain }); out.chat = { from: "💰", msg: L.chatSell(r.gain, s.money) }; questId = "sell"; }
    } else if (req.kind === "eat") {
      const r = E.resolveEat(f);
      if (r.invChanged) out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
      if (r.fx) out.fx.push(r.fx);
    } else if (req.kind === "buyHorse") {
      const h = s.horse;
      if (!h.owned && s.money >= C.HORSE_COST) {
        s.money -= C.HORSE_COST; h.owned = true; h.x = C.SPAWN.x + 2; h.y = C.SPAWN.y; h.rider = null;
        out.state = shareState(); out.horse = h;
        out.chat = { from: "🐴", msg: L.chatAnimalBought(lang === "en" ? "Horse" : "Cheval") };
      } else if (!h.owned) out.toast = { id: f.id, key: "noGold" };
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
        if (s.animals.length >= C.MAX_ANIMALS) out.toast = { id: f.id, key: "penFull" };
        else if (s.money < C.ANIMALS[at].cost) out.toast = { id: f.id, key: "noGold" };
        else {
          s.money -= C.ANIMALS[at].cost;
          const ax = C.PEN.x + 1 + Math.floor(Math.random() * (C.PEN.w - 2));
          const ay = C.PEN.y + 1 + Math.floor(Math.random() * (C.PEN.h - 2));
          s.animals.push({ type: at, x: ax, y: ay, hasProduct: true });
          out.state = shareState(); out.animals = s.animals;
          out.chat = { from: "🐮", msg: L.chatAnimalBought(lang === "en" ? C.ANIMALS[at].nameEn : C.ANIMALS[at].name) };
        }
      }
    } else if (req.kind === "mount") {
      const h = s.horse;
      if (h.owned && !h.rider && Math.abs(px - h.x) <= C.MOUNT_RANGE && Math.abs(py - h.y) <= C.MOUNT_RANGE) { h.rider = req.id; out.horse = h; }
    } else if (req.kind === "dismount") {
      const h = s.horse;
      if (h.rider === req.id) { h.rider = null; h.x = px; h.y = py; out.horse = h; }
    } else if (req.kind === "collect") {
      const ai = req.animal | 0, an = s.animals[ai];
      if (an && an.hasProduct && Math.abs(px - an.x) <= C.COLLECT_RANGE && Math.abs(py - an.y) <= C.COLLECT_RANGE) {
        an.hasProduct = false;
        f.inv.products[an.type] = (f.inv.products[an.type] || 0) + 1;
        out.farmer = { id: f.id, energy: f.energy, tools: f.tools, inv: f.inv };
        out.animals = s.animals;
        out.fx.push({ k: "product", x: an.x, y: an.y, product: an.type });
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

    if (out.tiles.length || out.state || out.horse || out.animals || out.wellBuilt) dirtyRef.current = true;
    channelRef.current?.send({ type: "broadcast", event: "apply", payload: out });
  }
  function shareState() { const s = sharedRef.current; return { money: s.money, day: s.day, dayStartAt: s.dayStartAt, totalEarned: s.totalEarned }; }
  function toolName(k) { return (lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES)[k]; }

  // -------- Tous : application des deltas reçus --------
  function applyDeltas(p) {
    const w = worldRef.current;
    if (w && p.tiles) for (const tl of p.tiles) { w.ground[idxOf(E.xOf(tl.i), E.yOf(tl.i))] = tl.g; w.objects[tl.i] = tl.o; if (tl.o === C.O_STUMP) w.objHp.set(tl.i, 2); minimapDirtyRef.current = true; }
    if (w && p.crops) for (const cr of p.crops) { if (cr.c) w.crops.set(cr.i, { ...(w.crops.get(cr.i) || {}), t: cr.c.t, s: cr.c.s }); else w.crops.delete(cr.i); }
    if (p.state) { const s = sharedRef.current; s.money = p.state.money; s.day = p.state.day; s.dayStartAt = p.state.dayStartAt; s.totalEarned = p.state.totalEarned; setHud(h => ({ ...h, money: s.money, day: s.day })); }
    if (p.farmer && p.farmer.id === me.id) { invRef.current = p.farmer.inv; toolsRef.current = p.farmer.tools; energyRef.current = p.farmer.energy; setMyInv(p.farmer.inv); setMyTools(p.farmer.tools); setMyEnergy(p.farmer.energy); if (p.farmer.quests) setMyQuests(p.farmer.quests); }
    if (p.toast && p.toast.id === me.id) pushToast(toastMsg(p.toast.key));
    if (p.chat) addChat(p.chat.from, p.chat.msg);
    if (p.fx) for (const f of p.fx) spawnFx(f);
    if (p.horse) { sharedRef.current.horse = p.horse; syncBuildings(); }
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    if (p.wellBuilt) { sharedRef.current.wellBuilt = true; minimapDirtyRef.current = true; syncBuildings(); }
  }
  function applyNewDay(p) {
    const w = worldRef.current; if (!w) return;
    const s = sharedRef.current; s.day = p.day; s.dayStartAt = p.dayStartAt;
    if (p.tiles) for (const tl of p.tiles) { w.ground[tl.i] = tl.g; w.objects[tl.i] = tl.o; if (tl.o !== C.O_NONE && tl.o !== C.O_STUMP) w.objHp.set(tl.i, tl.o === C.O_ROCK ? C.ROCK_HP : C.TREE_HP); minimapDirtyRef.current = true; }
    if (p.crops) for (const cr of p.crops) { if (cr.c) w.crops.set(cr.i, { ...(w.crops.get(cr.i) || {}), t: cr.c.t, s: cr.c.s, watered: false }); else w.crops.delete(cr.i); }
    // Énergie restaurée pour tous (accord avec l'hôte).
    energyRef.current = C.MAX_ENERGY; setMyEnergy(C.MAX_ENERGY);
    if (p.animals) { sharedRef.current.animals = p.animals; syncBuildings(); }
    setHud(h => ({ ...h, day: p.day }));
    pushToast(L.toastNewDay(p.day));
  }
  function toastMsg(key) {
    return { tired: L.toastTired, farShop: L.toastFarShop, farBin: L.toastFarBin, noGold: L.toastNoGold, toolMax: L.toastToolMax, needWater: L.toastNeedWater, penFull: L.penFull }[key] || "";
  }

  // -------- Hôte : boucle temps + persistance --------
  useEffect(() => {
    if (!isHost) return;
    const dayTimer = setInterval(() => {
      const s = sharedRef.current, w = worldRef.current;
      if (!w) return;
      if (Date.now() - s.dayStartAt >= C.DAY_REAL_MS) {
        const { tiles, cropTiles } = E.newDay(w, farmersRef.current, s.day, s.seed);
        s.day += 1; s.dayStartAt = Date.now();
        const tilesOut = tiles.map(i => { recordTileOverride(i); return { i, g: w.ground[i], o: w.objects[i] }; });
        const cropsOut = cropTiles.map(i => { const c = w.crops.get(i); return { i, c: c ? { t: c.t, s: c.s } : null }; });
        // Chaque animal produit son bien du matin.
        for (const an of s.animals) an.hasProduct = true;
        dirtyRef.current = true;
        channelRef.current?.send({ type: "broadcast", event: "newday", payload: { day: s.day, dayStartAt: s.dayStartAt, tiles: tilesOut, crops: cropsOut, animals: s.animals } });
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
    meRef.current = { id: me.id, name, gender: g === "f" ? "f" : "m", outfit: outfit | 0, x: C.SPAWN.x, y: C.SPAWN.y, dir: 0, moving: false, animT: 0 };
    invRef.current = invRef.current || { wood: 0, stone: 0, food: 0, seeds: [5, 0, 0, 0], crops: [0, 0, 0, 0], gems: C.GEMS.map(() => 0), fish: C.FISH.map(() => 0) };
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
    return { id: m.id, name: m.name, gender: m.gender, outfit: m.outfit, x: +m.x.toFixed(2), y: +m.y.toFixed(2), dir: m.dir, moving: m.moving, tool: slotRef.current };
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
  function doAction() {
    const m = meRef.current; if (!m || actAnimRef.current > 0 || fishMiniRef.current) return;
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
    if (c && c.s >= C.CROP_STAGES - 1) return sendReq({ kind: "act", action: "harvest", x: tt.x, y: tt.y });
    if (sl === 0) sendReq({ kind: "act", action: "till", x: tt.x, y: tt.y });
    else if (sl === 1) sendReq({ kind: "act", action: "water", x: tt.x, y: tt.y });
    else if (sl === 2) sendReq({ kind: "act", action: "chop", x: tt.x, y: tt.y });
    else if (sl === 3) sendReq({ kind: "act", action: "mine", x: tt.x, y: tt.y });
    else if (sl === 4) sendReq({ kind: "act", action: "plant", seed: seedSelRef.current, x: tt.x, y: tt.y });
    else if (sl === 5) sendReq({ kind: "eat" });
  }
  // Index d'un animal (dans sharedRef.animals) à portée et prêt à ramasser.
  function nearestCollectable() {
    const m = meRef.current, animals = sharedRef.current.animals || [];
    let best = -1, bd = C.COLLECT_RANGE;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i]; if (!a.hasProduct) continue;
      const d = Math.abs(m.x - a.x) + Math.abs(m.y - a.y);
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

  // Monter / descendre du cheval (touche F).
  function toggleMount() {
    const h = sharedRef.current.horse, m = meRef.current; if (!h || !h.owned || !m) return;
    if (h.rider === me.id) { sendReq({ kind: "dismount" }); }
    else if (!h.rider && Math.abs(m.x - h.x) <= C.MOUNT_RANGE && Math.abs(m.y - h.y) <= C.MOUNT_RANGE) { sendReq({ kind: "mount" }); }
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
      if (fishMiniRef.current) return; // le minijeu de pêche gère ses entrées
      keysRef.current[e.code] = true;
      if (e.code >= "Digit1" && e.code <= "Digit7") selectSlot(+e.code.slice(5) - 1);
      if (e.code === "Space") { e.preventDefault(); doAction(); }
      if (e.code === "KeyE") tryOpenNearby();
      if (e.code === "KeyF") toggleMount();
      if (e.code === "KeyT") { e.preventDefault(); setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 0); }
      if (e.code === "KeyM") setMapOpen(o => !o);
      if (e.code === "Escape") { setShopOpen(false); setBinOpen(false); setMapOpen(false); }
    }
    function onKeyUp(e) { keysRef.current[e.code] = false; }
    function onMove(e) { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; }
    function onDown(e) { if (e.button === 0 && !mapOpenRef.current && !shopOpenRef.current && !binOpenRef.current && !fishMiniRef.current) doAction(); }
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
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const w = worldRef.current, m = meRef.current, sprites = spritesRef.current;
      if (!w || !m || !sprites) return;

      updateMe(dt);
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
        else img = sprites.path;
        ctx.drawImage(img, x * T, y * T);
        const c = w.crops.get(i);
        if (c) ctx.drawImage(sprites.crops[c.t][c.s], x * T, y * T);
        const o = w.objects[i];
        if (o === C.O_ROCK) ctx.drawImage(sprites.rock, x * T, y * T);
        else if (o === C.O_STUMP) ctx.drawImage(sprites.stump, x * T, y * T);
        // Clôture de l'enclos (bordure), décorative et plate.
        if (onPenBorder(x, y)) ctx.drawImage(sprites.fence, x * T, y * T);
      }

      const tt = targetTile();
      if (inMap(tt.x, tt.y)) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(tt.x * T + 0.5, tt.y * T + 0.5, T - 1, T - 1); }

      const draws = [];
      draws.push({ y: (C.HOUSE.y + C.HOUSE.h) * T, fn: () => ctx.drawImage(sprites.house, C.HOUSE.x * T, (C.HOUSE.y + C.HOUSE.h) * T - 96) });
      draws.push({ y: (C.SHOP.y + 1) * T, fn: () => ctx.drawImage(sprites.shop, C.SHOP.x * T - 4, (C.SHOP.y + 1) * T - 28) });
      draws.push({ y: (C.BIN.y + 1) * T, fn: () => ctx.drawImage(sprites.bin, C.BIN.x * T - 2, (C.BIN.y + 1) * T - 18) });
      for (let y = y0 - 1; y <= Math.min(w.h - 1, y1 + 2); y++) for (let x = x0 - 1; x <= Math.min(w.w - 1, x1 + 1); x++) {
        if (!inMap(x, y)) continue;
        const o = w.objects[idxOf(x, y)];
        if (o === C.O_TREE || o === C.O_TREE2) { const img = o === C.O_TREE ? sprites.oak : sprites.pine; draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(img, x * T - 8, (y + 1) * T - 48) }); }
        else if (o === C.O_WELL) draws.push({ y: (y + 1) * T, fn: () => ctx.drawImage(sprites.well, x * T - 4, (y + 1) * T - 30) });
      }
      // Animaux d'élevage (+ indicateur de production à ramasser).
      for (const an of (sharedRef.current.animals || [])) {
        draws.push({ y: (an.y + 1) * T, fn: () => {
          ctx.drawImage(sprites.animals[an.type], an.x * T, an.y * T);
          if (an.hasProduct) { const bob = Math.sin(now / 260) * 1.5; ctx.drawImage(sprites.products[an.type], an.x * T + 3, an.y * T - 12 + bob, 12, 12); }
        } });
      }
      // Cheval libre (non monté).
      const horse = sharedRef.current.horse;
      if (horse && horse.owned && !horse.rider) draws.push({ y: (horse.y + 1) * T, fn: () => ctx.drawImage(sprites.horse, horse.x * T - 6, horse.y * T - 10) });
      draws.push({ y: (m.y + 1) * T, fn: () => drawSelf(m) });
      for (const p of playersRef.current.values()) draws.push({ y: (p.y + 1) * T, fn: () => drawRemote(p) });
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
      if (na > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(16,20,60,${na})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }

      // Invite boutique/bac
      let pk = null;
      if (nearTile(C.SHOP)) pk = "shop"; else if (nearTile(C.BIN)) pk = "bin";
      setPromptKeyThrottled(pk);
      // Invite cheval (monter/descendre)
      const hh = sharedRef.current.horse; let mp = null;
      if (hh && hh.owned) {
        if (hh.rider === me.id) mp = "dismount";
        else if (!hh.rider && Math.abs(m.x - hh.x) <= C.MOUNT_RANGE && Math.abs(m.y - hh.y) <= C.MOUNT_RANGE) mp = "mount";
      }
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
    function updateMe(dt) {
      const m = meRef.current, w = worldRef.current, keys = keysRef.current;
      const uiBlocked = shopOpenRef.current || binOpenRef.current || mapOpenRef.current || fishMiniRef.current || document.activeElement === chatInputRef.current;
      let dx = 0, dy = 0;
      if (!uiBlocked) {
        if (keys["ArrowUp"] || keys["KeyW"] || keys["KeyZ"]) dy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
        if (keys["ArrowLeft"] || keys["KeyA"] || keys["KeyQ"]) dx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
      }
      const mounted = sharedRef.current.horse && sharedRef.current.horse.rider === me.id;
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
      const px = Math.round(p.x * T), py = Math.round(p.y * T);
      const flip = p.dir === 2;
      const horse = sharedRef.current.horse;
      const riding = horse && horse.rider === p.id;
      const lift = riding ? 8 : 0; // le cavalier est surélevé sur la monture
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(px + 8, py + 15, riding ? 9 : 6, riding ? 3 : 2.5, 0, 0, 7); ctx.fill();
      if (riding) ctx.drawImage(spritesRef.current.horse, px - 6, py - 6);
      ctx.save();
      if (flip) { ctx.translate(px + 16, py - 8 - lift); ctx.scale(-1, 1); ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, 0, 0, 16, 24); }
      else ctx.drawImage(sheet, frame * 16, row * 24, 16, 24, px, py - 8 - lift, 16, 24);
      ctx.restore();
      ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "#00000090"; ctx.fillText(p.name, px + 8 + 1, py - 10 + 1);
      ctx.fillStyle = isSelf ? "#ffffff" : "#ffe9a8"; ctx.fillText(p.name, px + 8, py - 10);
    }
    function nightAlpha() {
      const tmin = E.gameTimeMin(sharedRef.current.dayStartAt, Date.now());
      if (tmin < 17 * 60) return 0;
      if (tmin < 20 * 60) return ((tmin - 17 * 60) / 180) * 0.25;
      return 0.25 + Math.min(1, (tmin - 20 * 60) / 300) * 0.35;
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
  function blocked(w, x, y) { return E.blockedTile(w, x, y); }
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
  // Bordure de l'enclos (clôture décorative), avec une ouverture en bas au centre.
  function onPenBorder(x, y) {
    const p = C.PEN;
    if (x < p.x || x >= p.x + p.w || y < p.y || y >= p.y + p.h) return false;
    const border = x === p.x || x === p.x + p.w - 1 || y === p.y || y === p.y + p.h - 1;
    if (y === p.y + p.h - 1 && x === p.x + Math.floor(p.w / 2)) return false; // portail
    return border;
  }
  function tryOpenNearby() { if (nearTile(C.SHOP)) setShopOpen(true); else if (nearTile(C.BIN)) setBinOpen(true); }

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
      default: break;
    }
  }
  function cropName(t) { return lang === "en" ? C.CROPS[t].nameEn : C.CROPS[t].name; }

  // -------- Interactions UI --------
  function selectSlot(s) { if (s === 4 && slotRef.current === 4) setSeedSel(v => (v + 1) % C.CROPS.length); setSlot(s); }
  function submitChat() {
    const v = chatInputRef.current?.value.trim();
    if (v) channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: meRef.current.name, msg: v.slice(0, 120) } });
    if (chatInputRef.current) chatInputRef.current.value = "";
    setChatOpen(false); chatInputRef.current?.blur();
  }
  async function leaveGame() {
    joinedRef.current = false;
    channelRef.current?.send({ type: "broadcast", event: "leave", payload: { id: me.id } });
    if (isHost) {
      // La ferme est stockée DURABLEMENT dans ferme_saves (par code), pas dans
      // rooms.game_state : on sauvegarde une dernière fois, puis le retour au
      // salon standard n'efface PLUS la ferme. Elle se recharge par son code.
      try { await persistFarm(); } catch (e) { /* non bloquant */ }
      await resetRoomToLobby(room.id);
    }
    onFinish && onFinish();
  }

  // Actions boutique/bac
  const buySeed = (t2, n) => sendReq({ kind: "buy", item: "seed", crop: t2, n });
  const buyFood = () => sendReq({ kind: "buy", item: "food" });
  const buyTool = (k) => sendReq({ kind: "buy", item: "tool", tool: k });
  const sellItem = (item, crop) => sendReq({ kind: "sell", item, crop, n: 9999 });
  const sellFish = (fishId) => sendReq({ kind: "sell", item: "fish", fish: fishId, n: 9999 });
  const sellGem = (gemId) => sendReq({ kind: "sell", item: "gem", gem: gemId, n: 9999 });

  // -------- Rendu React (UI par-dessus le canvas) --------
  const TOOL_NAMES = lang === "en" ? C.TOOL_NAMES_EN : C.TOOL_NAMES;
  const slots = [
    { key: "hoe", icon: "hoe" }, { key: "can", icon: "can" }, { key: "axe", icon: "axe" },
    { key: "pick", icon: "pick" }, { key: "seeds", icon: "seeds" }, { key: "food", icon: "food" },
    { key: "rod", icon: "rod" },
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
      </div>

      {/* Énergie */}
      <div className="ferme-energy-wrap panel"><div className="ferme-energy-bar" style={{ height: Math.max(0, (myEnergy / C.MAX_ENERGY) * 100) + "%" }} /></div>

      {/* Boutons flottants (nouveautés incluses) */}
      <div className="ferme-actions">
        <button className="ferme-btn" onClick={teleportHome}>{L.btnHome}</button>
        {buildings.wellBuilt && <button className="ferme-btn" onClick={teleportWell}>{L.btnWell}</button>}
        <button className="ferme-btn" onClick={() => setMapOpen(true)}>{L.btnMap}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={changeCharacter}>{L.btnChangeChar}</button>
        <button className="ferme-btn ferme-btn-ghost" onClick={leaveGame}>{L.btnLeave}</button>
      </div>

      {/* Invite proximité */}
      {promptKey && <div className="ferme-prompt">{promptKey === "shop" ? L.promptShop : L.promptBin}</div>}
      {mountPrompt && <div className="ferme-prompt ferme-prompt-mount">{mountPrompt === "mount" ? L.mountPrompt : L.dismountPrompt}</div>}

      {/* Barre d'outils */}
      <div className="ferme-toolbar panel">
        {slots.map((s, i) => {
          const isSeed = s.key === "seeds", isFood = s.key === "food", isRod = s.key === "rod";
          let count = "", lvl = "", img = spritesReady ? spritesRef.current.icons[s.icon] : null;
          if (isSeed) { count = myInv ? myInv.seeds[seedSel] : ""; img = spritesReady ? spritesRef.current.crops[seedSel][C.CROP_STAGES - 1] : null; }
          else if (isFood) count = myInv ? myInv.food : "";
          else if (isRod) { /* pas de niveau ni de compteur */ }
          else lvl = "N" + (myTools[s.key] || 1);
          const title = isSeed ? L.seedTip(seedName(seedSel)) : isFood ? L.foodTip(C.FOOD_ENERGY) : isRod ? L.rodTip : TOOL_NAMES[s.key];
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

      {/* Panneau des quêtes de découverte (checklist cochable) */}
      {questOpen && myQuests && (
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
      {!questOpen && <button className="ferme-btn ferme-quests-fab" onClick={() => setQuestOpen(true)}>{L.questBtn}</button>}

      {/* Chat */}
      <div className="ferme-chatlog">{[...chat].reverse().map(c => <div key={c.id}><b>{c.from}</b> {c.msg}</div>)}</div>
      {chatOpen && <input ref={chatInputRef} className="ferme-chat-input" maxLength={120} placeholder={L.chatSend}
        onKeyDown={e => { if (e.key === "Enter") submitChat(); else if (e.key === "Escape") { setChatOpen(false); chatInputRef.current.blur(); } }} autoFocus />}

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
                  <div className="info"><b>{L.toolRowTitle(TOOL_NAMES[k], lvl)}</b><span>{max ? L.toolMaxSub : L.toolUpSub(lvl + 1, cost)}</span></div>
                  <button disabled={max || hud.money < cost} onClick={() => buyTool(k)}>{max ? L.maxLabel : L.upgrade}</button>
                </div>
              );
            })}
            <div className="ferme-tools-header">🏗️</div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.horse : null} w={36} h={30} />
              <div className="info"><b>{L.shopHorseTitle(C.HORSE_COST)}</b><span>{buildings.horseOwned ? L.shopHorseOwned : L.shopHorseSub}</span></div>
              <button disabled={buildings.horseOwned || hud.money < C.HORSE_COST} onClick={buyHorse}>{buildings.horseOwned ? L.maxLabel : L.buyLabel}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.well : null} w={26} h={32} />
              <div className="info"><b>{L.shopWellTitle(C.WELL_COST)}</b><span>{buildings.wellBuilt ? L.shopWellOwned : L.shopWellSub}</span></div>
              <button disabled={buildings.wellBuilt || hud.money < C.WELL_COST} onClick={buyWell}>{buildings.wellBuilt ? L.maxLabel : L.buyLabel}</button>
            </div>
            <div className="ferme-tools-header">{L.shopAnimalsHeader}</div>
            {C.ANIMALS.map(a => (
              <div className="ferme-shop-row" key={"an" + a.id}>
                <Sprite img={spritesReady ? spritesRef.current.animals[a.id] : null} w={32} h={28} />
                <div className="info"><b>{L.animalRowTitle(lang === "en" ? a.nameEn : a.name, a.cost)}</b><span>{L.animalRowSub(lang === "en" ? a.prodEn : a.prod, a.sell)}</span></div>
                <button disabled={hud.money < a.cost || buildings.animalCount >= C.MAX_ANIMALS} onClick={() => buyAnimal(a.id)}>{L.buyLabel}</button>
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
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.icons.wood : null} w={32} h={32} />
              <div className="info"><b>{L.woodRowTitle(myInv ? myInv.wood : 0)}</b><span>{L.perPiece(C.WOOD_SELL)}</span></div>
              <button disabled={!myInv || myInv.wood === 0} onClick={() => sellItem("wood")}>{L.sellAll}</button>
            </div>
            <div className="ferme-shop-row">
              <Sprite img={spritesReady ? spritesRef.current.icons.stone : null} w={32} h={32} />
              <div className="info"><b>{L.stoneRowTitle(myInv ? myInv.stone : 0)}</b><span>{L.perPiece(C.STONE_SELL)}</span></div>
              <button disabled={!myInv || myInv.stone === 0} onClick={() => sellItem("stone")}>{L.sellAll}</button>
            </div>
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
              const n = myInv && myInv.gems ? myInv.gems[gm.id] : 0;
              if (!n) return null;
              return (
                <div className="ferme-shop-row" key={"g" + gm.id}>
                  <Sprite img={spritesReady ? spritesRef.current.gemIcons[gm.id] : null} w={32} h={32} />
                  <div className="info"><b>{(lang === "en" ? gm.nameEn : gm.name)} × {n}</b><span>{L.perPiece(gm.sell)}</span></div>
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
