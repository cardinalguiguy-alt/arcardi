"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resetRoomToLobby } from "@/lib/gameSync";
import { useLang } from "@/lib/i18n";
import { duckAmbienceForGame, resumeAmbienceForNav } from "@/lib/ambience";
import { playGameCardClick } from "@/lib/sfx";
import Brand from "@/components/Brand";
import Embers from "@/components/Embers";
import Crossfade from "@/components/Crossfade";
import QuizGame from "@/components/QuizGame";
import PianoEscape from "@/components/PianoEscape";
import WordGuess from "@/components/WordGuess";
import Worldle from "@/components/Worldle";
import ConnectFour from "@/components/ConnectFour";
import PetitsChevaux from "@/components/PetitsChevaux";
import EchoesRoom from "@/components/EchoesRoom";
import RoomChat from "@/components/RoomChat";
import DiapasonGame from "@/components/diapason/DiapasonGame";
import HeistRoom from "@/components/heist/HeistRoom";
import ChromatikGame from "@/components/cards/ChromatikGame";
import GoldMinesGame from "@/components/goldmines/GoldMinesGame";
import PresidentGame from "@/components/president/PresidentGame";
import PetitBacGame from "@/components/petitbac/PetitBacGame";
import YahtzeeGame from "@/components/yahtzee/YahtzeeGame";
import TenkGame from "@/components/tenk/TenkGame";
import DoorStage from "@/components/DoorStage";
import CurtainStage from "@/components/CurtainStage";
import FlashStage from "@/components/FlashStage";
import VideoStage from "@/components/VideoStage";

// Métadonnées d'affichage de chaque jeu : icône, couleur d'accent (variable
// CSS existante), clés i18n pour le nom / la description courte de la carte
// de sélection dans le salon, et habillage d'entrée ("stage") :
// - "door"    : porte en bois qui pivote, synchronisée avec un son de
//               portes coulissantes (voir DoorStage.js/lib/sfx.js) —
//               cartes/dés + jeux de plateau/société + jeux de mots.
// - "curtain" : rideau rouge qui se lève — jeux narratifs/performance et
//               Puissance 4.
// - "flash"   : flash + zoom — réservé à Petit Bac pour l'instant.
// - "video"   : pas de porte/rideau — la vidéo d'intro joue directement,
//               accélérée pour tenir 3s, fondu élégant vers le jeu ensuite
//               (voir VideoStage.js) — réservé à Worldle pour l'instant.
const GAME_META = {
  quiz:     { icon: "🧠", accent: "--acc-quiz",      nameKey: "nameQuiz",    tagKey: "tagQuiz", stage: "door" },
  wordle:   { icon: "🔤", accent: "--acc-wordle",    nameKey: "nameWordle",  tagKey: "tagWordle", stage: "door" },
  worldle:  { icon: "🌍", accent: "--acc-worldle",   nameKey: "nameWorldle", tagKey: "tagWorldle", stage: "video" },
  piano:    { icon: "🎹", accent: "--acc-piano",     nameKey: "namePiano",   tagKey: "tagPiano", stage: "curtain" },
  connect4: { icon: "🔴", accent: "--acc-c4",        nameKey: "nameC4",      tagKey: "tagC4", minPlayers: 2, stage: "curtain" },
  ludo:     { icon: "🐴", accent: "--acc-ludo",      nameKey: "nameLudo",    tagKey: "tagLudo", minPlayers: 2, stage: "door" },
  echoes:   { icon: "🌊", accent: "--acc-echoes",    nameKey: "nameEchoes",  tagKey: "tagEchoes", minPlayers: 2, stage: "curtain" },
  diapason: { icon: "🎼", accent: "--acc-diapason",  nameKey: "nameDiapason", tagKey: "tagDiapason", minPlayers: 2, stage: "curtain" },
  heist:    { icon: "🖼️", accent: "--acc-heist",     nameKey: "nameHeist",   tagKey: "tagHeist", minPlayers: 2, stage: "curtain" }, // "Le Louvre" (ex-Le Casse) — id technique inchangé
  chromatik: { icon: "🃏", accent: "--acc-chromatik", nameKey: "nameChromatik", tagKey: "tagChromatik", stage: "door" },
  goldmines: { icon: "⛏️", accent: "--acc-goldmines", nameKey: "nameGoldMines", tagKey: "tagGoldMines", stage: "door" },
  yahtzee:  { icon: "🎲", accent: "--acc-yahtzee",   nameKey: "nameYahtzee", tagKey: "tagYahtzee", stage: "door" },
  president: { icon: "🎩", accent: "--acc-president", nameKey: "namePresident", tagKey: "tagPresident", stage: "door" },
  tenk:      { icon: "🎰", accent: "--acc-tenk",      nameKey: "nameTenk",    tagKey: "tagTenk", stage: "door" },
  petitbac: { icon: "✏️", accent: "--acc-petitbac", nameKey: "namePetitBac", tagKey: "tagPetitBac", minPlayers: 2, stage: "flash" },
};
const STAGE_COMPONENT = { door: DoorStage, curtain: CurtainStage, flash: FlashStage, video: VideoStage };
const GAME_ORDER = ["quiz", "wordle", "worldle", "petitbac", "connect4", "ludo", "chromatik", "goldmines", "president", "yahtzee", "tenk", "piano", "echoes", "diapason", "heist"];

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Présence en temps réel : profile_id -> true si l'onglet du joueur est
  // actuellement connecté au salon. Alimenté par le canal presence Supabase.
  const [online, setOnline] = useState(null); // null = pas encore synchronisé
  // profile_id -> true si CE joueur a actuellement la fiche de règles d'un
  // jeu ouverte (voir GameRulesButton -> onOpenChange), portée par le MÊME
  // canal presence que la détection en ligne/hors ligne — pas besoin d'un
  // canal de plus. Sert à afficher "untel consulte les règles, veuillez
  // patienter" à tout le monde (dont l'hôte) sur l'écran "Jouer".
  const [rulesReaders, setRulesReaders] = useState({});
  const presenceChRef = useRef(null);
  const readingRulesRef = useRef(false);
  const [hostGone, setHostGone] = useState(false);
  // La colonne rooms.game_state existe-t-elle ? (migration upgrade-002.sql)
  const [hasGameStateCol, setHasGameStateCol] = useState(true);
  // Mode "agrandi" (demande 2026-07) : pendant une partie, masque l'en-tête
  // (logo, code, chips de score, fabs secondaires) pour donner TOUTE la
  // hauteur au jeu — objectif : zéro scroll sur laptop. Préférence mémorisée
  // dans localStorage, lue côté client uniquement (jamais au premier rendu
  // serveur, sinon hydratation désaccordée).
  const [stageFocus, setStageFocus] = useState(false);
  useEffect(() => {
    try { setStageFocus(localStorage.getItem("arcardi_stage_focus") === "1"); } catch {}
  }, []);
  function toggleStageFocus() {
    setStageFocus(prev => {
      const next = !prev;
      try { localStorage.setItem("arcardi_stage_focus", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  useEffect(() => {
    let roomSub, playersSub;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=" + encodeURIComponent("/room/" + String(code).toUpperCase()));
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(prof);

      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms").select("*").eq("code", String(code).toUpperCase()).single();
      if (roomErr || !roomRow) { setError(t("noRoom")); return; }
      setRoom(roomRow);
      // Vérification passive de la migration upgrade-002.sql : si la colonne
      // game_state n'apparaît pas dans la ligne renvoyée par `select *`,
      // c'est qu'elle n'existe pas encore en base -> avertir l'hôte au lobby
      // (la resynchronisation après rechargement ne marchera pas sans elle).
      setHasGameStateCol(Object.prototype.hasOwnProperty.call(roomRow, "game_state"));

      // Rejoint automatiquement le salon si ce n'est pas déjà fait — c'est
      // ce qui manquait pour que le lien d'invitation fonctionne vraiment :
      // avant, arriver directement sur /room/CODE affichait la page sans
      // jamais ajouter la personne à room_players (seul le passage par le
      // lounge le faisait). upsert = sans danger si déjà membre.
      await supabase.from("room_players").upsert(
        { room_id: roomRow.id, profile_id: session.user.id },
        { onConflict: "room_id,profile_id" }
      );

      await loadPlayers(roomRow.id);

      playersSub = supabase
        .channel("rp_" + roomRow.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomRow.id}` },
          () => loadPlayers(roomRow.id))
        .subscribe();

      roomSub = supabase
        .channel("r_" + roomRow.id)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomRow.id}` },
          payload => setRoom(payload.new))
        .subscribe();
    })();

    return () => {
      if (roomSub) supabase.removeChannel(roomSub);
      if (playersSub) supabase.removeChannel(playersSub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, router]);

  async function loadPlayers(roomId) {
    const { data } = await supabase
      .from("room_players")
      .select("id, score, profile_id, profiles(username, avatar)")
      .eq("room_id", roomId)
      .order("score", { ascending: false });
    setPlayers(data || []);
  }

  // ===== Présence (détection de déconnexion) =====
  // Chaque onglet connecté au salon se déclare sur un canal `presence` dédié
  // (clé = profile_id). Le callback `sync` reconstruit la liste des joueurs
  // réellement en ligne. Aucune table ni migration : c'est un mécanisme
  // éphémère de Supabase Realtime, comme le chat.
  useEffect(() => {
    if (!room?.id || !me?.id) return;
    const ch = supabase.channel("presence_" + room.id, {
      config: { presence: { key: me.id } },
    });
    presenceChRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const map = {};
      const readingMap = {};
      Object.keys(state).forEach(k => {
        map[k] = true;
        // Supabase garde un tableau de métas par clé (un par onglet ouvert
        // pour cette même personne) : "lit les règles" dès qu'AU MOINS un
        // de ses onglets a la fiche ouverte.
        if ((state[k] || []).some(meta => meta.readingRules)) readingMap[k] = true;
      });
      setOnline(map);
      setRulesReaders(readingMap);
    });
    ch.subscribe(status => {
      if (status === "SUBSCRIBED") ch.track({ at: Date.now(), readingRules: readingRulesRef.current });
    });
    return () => { presenceChRef.current = null; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, me?.id]);

  // Passé à chaque Stage (Door/Curtain/Flash/Video) -> GameRulesButton :
  // republie sa propre présence avec le drapeau readingRules à jour dès
  // qu'un joueur ouvre/ferme la fiche de règles depuis l'écran "Jouer".
  // IMPORTANT : identité STABLE (useCallback, aucune dépendance — tout ce
  // qu'elle touche est un ref) sinon GameRulesButton (qui la surveille dans
  // un useEffect) la relancerait à CHAQUE re-rendu de cette page (fréquents,
  // ex. à chaque sync de présence) -> nouveau track() -> nouveau sync ->
  // nouveau re-rendu -> boucle. Le garde-fou `isReading === ref.current`
  // évite en plus tout appel réseau redondant.
  const setReadingRules = useCallback((isReading) => {
    if (readingRulesRef.current === isReading) return;
    readingRulesRef.current = isReading;
    presenceChRef.current?.track({ at: Date.now(), readingRules: isReading });
  }, []);
  // Noms des AUTRES joueurs actuellement en train de lire les règles (jamais
  // soi-même) — c'est ce que la bannière "veuillez patienter" affiche.
  const rulesReaderNames = players
    .filter(p => p.profile_id !== me?.id && rulesReaders[p.profile_id])
    .map(p => p.profiles?.username)
    .filter(Boolean);

  // Bandeau "hôte déconnecté" côté invités, pendant une partie uniquement.
  // Délai de grâce de 8s : la présence met quelques secondes à se
  // synchroniser (et un simple changement d'onglet mobile peut couper la
  // connexion une poignée de secondes) — on n'alarme pas pour si peu.
  useEffect(() => {
    const isGuestPlaying = room && me && room.status === "playing" && room.host_id !== me.id;
    const hostOnline = online === null || !!online[room?.host_id];
    if (!isGuestPlaying || hostOnline) { setHostGone(false); return; }
    const tm = setTimeout(() => setHostGone(true), 8000);
    return () => clearTimeout(tm);
  }, [room, me, online]);

  // Ambiance sonore du site : silence délicat dès qu'une partie démarre
  // (pour host ET invités, tous les deux synchronisés sur room.status),
  // reprise en douceur au retour au lobby — jamais un redémarrage complet
  // (voir lib/ambience.js).
  useEffect(() => {
    if (!room) return;
    if (room.status === "playing") duckAmbienceForGame();
    else resumeAmbienceForNav();
  }, [room?.status]);

  async function launch(gameId) {
    await supabase.from("rooms").update({ status: "playing", current_game: gameId }).eq("id", room.id);
  }

  // Retour au lobby DEPUIS n'importe quel moment d'une partie (pas seulement
  // à la fin naturelle) : l'hôte peut ramener tout le monde au salon sans
  // que personne n'ait à quitter la room elle-même.
  async function backToLobby() {
    await resetRoomToLobby(room.id);
    // Mise à jour locale immédiate : ne dépend pas du round-trip Realtime,
    // donc fonctionne même si la réplication Postgres sur `rooms` a du
    // retard (l'hôte voit l'effet de son propre clic tout de suite).
    setRoom(r => (r ? { ...r, status: "lobby", current_game: null, game_state: null } : r));
  }

  // Callback passé à chaque jeu pour son bouton de fin de partie
  // ("Retour au salon" / "🏠"). Avant : un onFinish={() => {}} — un no-op qui
  // ne faisait STRICTEMENT rien, d'où le bouton qui semblait "sans effet"
  // même quand la mise à jour Supabase avait réussi.
  function handleGameFinish() {
    setRoom(r => (r ? { ...r, status: "lobby", current_game: null, game_state: null } : r));
  }

  // Clic sur le logo ARCARDI (en haut à gauche) :
  // - seul dans le salon  -> retour au menu principal (le lounge) ;
  // - en groupe, en pleine partie -> retour au lobby du salon. L'hôte ramène
  //   tout le monde (reset de la room), un invité revient à SA vue lobby
  //   sans toucher à la partie des autres (il resynchronisera au prochain
  //   changement d'état de la room côté hôte) ;
  // - en groupe, déjà au lobby -> rien à faire, on y est.
  function brandHome() {
    if (!room || !me) return;
    if (players.length <= 1) { router.push("/lounge"); return; }
    if (room.status === "playing") {
      if (room.host_id === me.id) backToLobby();
      else handleGameFinish();
    }
  }

  async function leaveRoom() {
    if (me && room) await supabase.from("room_players").delete().eq("room_id", room.id).eq("profile_id", me.id);
    router.push("/lounge");
  }

  async function copyInviteLink() {
    try {
      const url = `${window.location.origin}/room/${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {}
  }

  // Ambiance "lumière éteinte" du 10000 (demande 2026-07) : pendant une
  // partie de 10000, TOUT le thème feu de camp (fond marron, encarts,
  // pastilles) bascule en bleu marine profond, comme si on éteignait la
  // lumière pour jouer aux dés — ambiance clandestine, et l'encart néon du
  // jeu redevient cohérent avec la pièce. Une simple classe posée sur
  // <body> (les variables CSS font le reste, voir body.tenk-night dans
  // globals.css) ; les bulles champagne restent, recolorées en froid.
  // Hook placé AVANT les early returns (règle des hooks React).
  const tenkNight = !!(room && me && room.status === "playing" && room.current_game === "tenk");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("tenk-night", tenkNight);
    return () => document.body.classList.remove("tenk-night");
  }, [tenkNight]);

  // Ambiances dédiées Petit Bac (Categories) et Petits Chevaux (Ludo)
  // (demande 2026-07) : même mécanique que tenk-night, en plus discret —
  // ces deux jeux n'ont pas d'encart à fort contraste comme le 10000, un
  // simple glissement de teinte du fond (rose pour Categories, orangé
  // pour Ludo, voir body.pb-theme / body.ludo-theme dans globals.css)
  // suffit à leur donner une identité cohérente sans dénaturer le thème
  // feu de camp du reste du site.
  const pbTheme = !!(room && me && room.status === "playing" && room.current_game === "petitbac");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("pb-theme", pbTheme);
    return () => document.body.classList.remove("pb-theme");
  }, [pbTheme]);

  const ludoTheme = !!(room && me && room.status === "playing" && room.current_game === "ludo");
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("ludo-theme", ludoTheme);
    return () => document.body.classList.remove("ludo-theme");
  }, [ludoTheme]);

  // Mode agrandi : même mécanique de classe sur <body> que tenk-night —
  // uniquement pendant une partie (au lobby, l'en-tête reste toujours là).
  const focusActive = !!(room && me && room.status === "playing" && stageFocus);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("stage-focus", focusActive);
    return () => document.body.classList.remove("stage-focus");
  }, [focusActive]);

  // Mode agrandi, volet "zéro scroll" : si le jeu est plus HAUT que
  // l'écran, on le rétrécit d'un zoom CSS calculé pour tout faire tenir
  // (jamais sous 55 % : en-deçà, mieux vaut un peu de scroll qu'un jeu
  // illisible). Mesure via offsetHeight — exprimé dans les unités LOCALES
  // de l'élément, donc insensible au zoom qu'on lui applique : pas de
  // boucle de rétroaction avec le ResizeObserver. Le seuil de 2 % évite de
  // re-rendre pour des variations d'un pixel, et fait aussi office de
  // garde-fou anti-oscillation. Recalculé à chaque changement de jeu, de
  // taille de fenêtre, et de hauteur du contenu (mains qui grossissent,
  // récap de manche...) — l'ajustement suit le gameplay tout seul.
  const stageRef = useRef(null);
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    if (!focusActive || typeof window === "undefined") { setStageScale(1); return; }
    const el = stageRef.current;
    if (!el) return;
    // Recalcul TEMPORISÉ (150 ms) : les rafales de variations de hauteur
    // (fondu de Crossfade, cartes qui apparaissent une à une) sont
    // coalescées en UN seul ajustement une fois le layout posé — sans ça,
    // le cadre "sautait" instantanément à chaque micro-changement, effet
    // lag signalé 2026-07. Le changement de zoom lui-même est ANIMÉ en CSS
    // (transition sur zoom, voir body.stage-focus .game-stage) : quand un
    // ajustement est vraiment nécessaire, il glisse au lieu de claquer.
    let timer = 0;
    const compute = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const natural = el.offsetHeight;
        if (!natural) return;
        const avail = window.innerHeight - 20; // marge de respiration haut+bas
        // "Quand c'est vraiment nécessaire" : tant que ça tient, zoom 1 tout
        // rond ; sinon juste ce qu'il faut, avec un seuil de 3 % pour ne pas
        // re-rendre (ni re-glisser) pour deux pixels.
        const s = natural <= avail ? 1 : Math.max(0.55, avail / natural);
        setStageScale(prev => {
          if (s === 1) return 1;
          return Math.abs(prev - s) > 0.03 ? Math.round(s * 100) / 100 : prev;
        });
      }, 150);
    };
    compute();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", compute);
      clearTimeout(timer);
    };
  }, [focusActive, room?.current_game]);

  if (error) return <div className="wrap"><div className="panel"><h1>😕</h1><p className="hint">{error}</p></div></div>;
  if (!room || !me) return <div className="wrap"><p className="muted">…</p></div>;

  const isHost = room.host_id === me.id;
  const playing = room.status === "playing";
  // Tant que la présence n'a pas fait sa première synchro (online === null),
  // on considère tout le monde en ligne pour éviter un faux "hors ligne".
  const isOnline = pid => (online === null ? true : !!online[pid]);
  const meta = playing ? GAME_META[room.current_game] : null;
  // Clé de vue : change dès qu'on bascule lobby <-> scène, ou de jeu à jeu.
  // C'est ce qui déclenche le fondu enchaîné dans <Crossfade>.
  const viewKey = playing ? "stage-" + room.current_game : "lobby";

  return (
    <div className="wrap wrap-room">
      <Embers />
      <Brand lang={lang} setLang={setLang} t={t} onHome={brandHome} right={
        // Le code du salon vit maintenant en haut à droite (échange demandé
        // avec l'ancien bouton "Quitter le salon") : toujours consultable,
        // sans prendre de place au-dessus du jeu.
        <div className="room-code-pill">
          <span className="dot" />
          {room.code}
        </div>
      } />

      {/* Quitter le salon : symbole "sortie" rouge, discret, fixé en bas à
          gauche (ancienne place du code). Au survol, il s'allume et déplie
          le libellé complet — au doigt (pas de hover), il reste assez
          visible d'office. */}
      <button className="leave-room-fab" onClick={leaveRoom} title={t("leaveRoom")} aria-label={t("leaveRoom")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="leave-room-label">{t("leaveRoom")}</span>
      </button>

      {/* En partie : deux pastilles fixes en haut à droite (demande 2026-07).
          - "Retour au salon" (hôte) : réduit façon "Quitter le salon" mais en
            BLANC et toujours EN HAUT — libellé déplié au survol.
          - Mode agrandi (tout le monde) : masque l'en-tête et les vignettes
            pour donner toute la hauteur au jeu (voir body.stage-focus). */}
      {playing && isHost && (
        <button className="back-room-fab" onClick={backToLobby} title={t("backToLobbyAnytime")} aria-label={t("backLoungeShort")}>
          <span className="back-room-icon" aria-hidden="true">🎪</span>
          <span className="back-room-label">{t("backLoungeShort")}</span>
        </button>
      )}
      {playing && (
        <button
          className={"stage-zoom-fab" + (stageFocus ? " on" : "")}
          onClick={toggleStageFocus}
          title={stageFocus ? t("stageFocusOff") : t("stageFocusOn")}
          aria-pressed={stageFocus}
        >
          <span aria-hidden="true">⛶</span>
          <span className="stage-zoom-label">{stageFocus ? t("stageFocusOff") : t("stageFocusOn")}</span>
        </button>
      )}

      {hostGone && (
        // L'hôte est l'arbitre de tous les jeux : sans lui, la partie est
        // réellement figée. On le dit clairement aux invités au lieu de les
        // laisser attendre devant un jeu muet, avec une porte de sortie.
        <div className="host-offline-banner" role="alert">
          <span>{t("hostOffline")}</span>
          <button className="btn ghost" onClick={handleGameFinish}>
            🎪 {t("hostOfflineBack")}
          </button>
        </div>
      )}

      <Crossfade id={viewKey} duration={480}>
        {playing ? (
          // ===== MODE SCÈNE : le jeu en cours prend toute la priorité =====
          <div style={meta ? { "--accent": `var(${meta.accent})` } : undefined}>
            <div className="stage-bar">
              <div className="stage-bar-scores">
                {players.map(p => (
                  <span
                    className={"mini-chip" + (p.profile_id === me.id ? " me" : "") + (isOnline(p.profile_id) ? "" : " off")}
                    key={p.id}
                    title={isOnline(p.profile_id) ? undefined : t("offlineTag")}
                  >
                    <span className={"presence-dot" + (isOnline(p.profile_id) ? "" : " off")} />
                    <span>{p.profiles?.avatar}</span>
                    <span>{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
                    <b>{p.score}</b>
                  </span>
                ))}
              </div>
              {/* Le bouton "Retour au salon" a quitté cette barre : il vit
                  maintenant en pastille fixe en haut à droite (.back-room-fab)
                  pour libérer la largeur au profit des chips de score. */}
            </div>

            <div
              className="game-stage"
              ref={stageRef}
              /* Mode agrandi : zoom auto pour tout faire tenir à l'écran
                 (1 = taille normale, voir l'effet stageScale plus haut). */
              style={focusActive && stageScale < 1 ? { zoom: stageScale } : undefined}
            >
              {meta && (() => {
                const StageComponent = STAGE_COMPONENT[meta.stage] || DoorStage;
                return (
                <StageComponent gameId={room.current_game} icon={meta.icon} name={t(meta.nameKey)} accentVar={meta.accent} lang={lang} t={t} onRulesOpenChange={setReadingRules} rulesReaderNames={rulesReaderNames}>
                  {room.current_game === "quiz" && (
                    <QuizGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "piano" && (
                    <PianoEscape room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "wordle" && (
                    <WordGuess room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "worldle" && (
                    <Worldle room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "connect4" && (
                    <ConnectFour room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "ludo" && (
                    <PetitsChevaux room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "echoes" && (
                    <EchoesRoom room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "diapason" && (
                    <DiapasonGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "heist" && (
                    <HeistRoom room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "chromatik" && (
                    <ChromatikGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "goldmines" && (
                    <GoldMinesGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "yahtzee" && (
                    <YahtzeeGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "president" && (
                    <PresidentGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "tenk" && (
                    <TenkGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "petitbac" && (
                    <PetitBacGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                </StageComponent>
                );
              })()}
            </div>
          </div>
        ) : (
          // ===== MODE LOBBY : infos du salon + sélection du prochain jeu =====
          <div className="panel" style={{ maxWidth: "min(980px, 94vw)" }}>
            <h1>{isHost ? t("roomTitleHost") : t("roomTitle")}</h1>
            <p className="hint">{t("shareCode")}</p>
            <div className="code-badge">{room.code}</div>
            <button className="btn ghost" style={{ marginTop: 0 }} onClick={copyInviteLink}>
              {copied ? "✅ " + t("linkCopied") : "🔗 " + t("copyInviteLink")}
            </button>
            <p className="muted">{players.length} {t("players")} — {t("scoreLive")} :</p>
            <div style={{ marginTop: 10 }}>
              {players.map(p => (
                <div
                  className={"player-chip" + (isOnline(p.profile_id) ? "" : " off")}
                  key={p.id}
                  title={isOnline(p.profile_id) ? undefined : t("offlineTag")}
                >
                  <span className={"presence-dot" + (isOnline(p.profile_id) ? "" : " off")} />
                  <span style={{ fontSize: 20 }}>{p.profiles?.avatar}</span>
                  <span>{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
                  <span className="pt">{p.score} {t("pts")}</span>
                </div>
              ))}
            </div>

            {isHost && !hasGameStateCol && (
              // Avertissement visible UNIQUEMENT par l'hôte : la migration
              // upgrade-002.sql n'a pas été exécutée, la reprise de partie
              // après un rechargement (F5) ne fonctionnera pas.
              <div className="sql-warn">
                <b>{t("sqlWarnTitle")}</b><br />
                {t("sqlWarnBody")} <code>supabase/upgrade-002.sql</code>
              </div>
            )}

            {isHost ? (
              <>
                <p className="hint" style={{ marginTop: 22, marginBottom: 10 }}>{t("gamePicker")}</p>
                <div className="game-grid">
                  {GAME_ORDER.map(id => {
                    const g = GAME_META[id];
                    const disabled = g.minPlayers ? players.length < g.minPlayers : false;
                    return (
                      <button
                        key={id}
                        className="game-card"
                        style={{ "--accent": `var(${g.accent})`, opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                        onClick={() => { if (disabled) return; playGameCardClick(); launch(id); }}
                      >
                        <span className="game-card-icon">{g.icon}</span>
                        <span className="game-card-title">{t(g.nameKey)}</span>
                        <span className="game-card-tag">{t(g.tagKey)}</span>
                        <span className="game-card-cta">{disabled ? "🔒" : t("playCta") + " →"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>{t("moreGamesSoon")}</p>
              </>
            ) : (
              <p className="muted" style={{ marginTop: 16 }}>{t("waitHost")}</p>
            )}
          </div>
        )}
      </Crossfade>

      {/* Monté ici (hors Crossfade) pour ne jamais se démonter lors des
          transitions lobby <-> jeu : l'historique de discussion et la
          connexion au canal restent intacts pendant toute la session. */}
      <RoomChat room={room} me={me} t={t} />
    </div>
  );
}
