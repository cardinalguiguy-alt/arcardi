"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resetRoomToLobby, launchGame, launchStage, clearGameState, nominateHost, leaveRoomAndHandoff, claimAbandonedHost, GAME_LAUNCH_BUFFER_MS, STAGE_LAUNCH_BUFFER_MS } from "@/lib/gameSync";
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
import TuPreferesGame from "@/components/tupreferes/TuPreferesGame";
import ChessGame from "@/components/chess/ChessGame";
import RamiGame from "@/components/rami/RamiGame";
import NavalGame from "@/components/naval/NavalGame";
import CalcRaceGame from "@/components/calcrace/CalcRaceGame";
import PuzzleGame from "@/components/puzzle/PuzzleGame";
import FermeGame from "@/components/ferme/FermeGame";
import GameErrorBoundary from "@/components/GameErrorBoundary";
import DoorStage from "@/components/DoorStage";
import CurtainStage from "@/components/CurtainStage";
import FlashStage from "@/components/FlashStage";
import VideoStage from "@/components/VideoStage";
import OceanStage from "@/components/OceanStage";

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
  connect4: { icon: "🔴", accent: "--acc-c4",        nameKey: "nameC4",      tagKey: "tagC4", stage: "curtain" }, // pas de minPlayers : jouable en solo contre un bot (2026-07)
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
  tupreferes: { icon: "🤔", accent: "--acc-tupreferes", nameKey: "nameTuPreferes", tagKey: "tagTuPreferes", minPlayers: 2, stage: "curtain" },
  chess:    { icon: "♟️", accent: "--acc-chess",     nameKey: "nameChess",   tagKey: "tagChess", minPlayers: 2, maxPlayers: 2, stage: "door" },
  rami:     { icon: "🃏", accent: "--acc-rami",      nameKey: "nameRami",    tagKey: "tagRami", minPlayers: 2, maxPlayers: 6, stage: "door" },
  naval:    { icon: "⚓", accent: "--acc-naval",     nameKey: "nameNaval",   tagKey: "tagNaval", maxPlayers: 2, stage: "ocean" }, // pas de minPlayers : jouable en solo contre un bot (comme Gold Mines) ; stage "ocean" (sonar puis vague, 2026-07)
  calcrace: { icon: "🏎️", accent: "--acc-calcrace", nameKey: "nameCalcRace", tagKey: "tagCalcRace", maxPlayers: 10, stage: "curtain" }, // pas de minPlayers : jouable seul en contre-la-montre (jeu n°20)
  puzzle:   { icon: "🧩", accent: "--acc-puzzle", nameKey: "namePuzzle", tagKey: "tagPuzzle", stage: "door" }, // pas de minPlayers : jouable seul (jeu n°21) ; mode collaboratif prévu dans un prochain zip
  ferme:    { icon: "🌾", accent: "--acc-ferme", nameKey: "nameFerme", tagKey: "tagFerme", maxPlayers: 8, stage: "door" }, // "Ferme Vallée" (jeu n°22) : ferme coopérative temps réel, jouable seul aussi ; monde partagé host-authoritative
};
const STAGE_COMPONENT = { door: DoorStage, curtain: CurtainStage, flash: FlashStage, video: VideoStage, ocean: OceanStage };
const GAME_ORDER = ["quiz", "wordle", "worldle", "petitbac", "tupreferes", "connect4", "chess", "ludo", "naval", "chromatik", "president", "rami", "goldmines", "yahtzee", "tenk", "piano", "echoes", "diapason", "heist", "calcrace", "puzzle", "ferme"];

// Victoires/Défaites, en discret (demande 2026-07) : remplace les deux chips
// "✓N/✕N" auparavant affichées EN PERMANENCE sur chaque ligne joueur du
// salon par une seule petite icône trophée — le détail n'apparaît qu'au
// survol (overlay miniature), jamais affiché par défaut. Uniquement sur la
// page de la room (ici, vue lobby) : les vignettes joueurs affichées PENDANT
// une partie (.stage-bar/.mini-chip, plus bas dans ce fichier) n'affichent
// plus aucune info de record, même pas ce trophée — demande explicite.
// `pinned` (état local) permet aussi un TAP sur tactile (pas de vrai hover)
// pour ouvrir/fermer l'overlay, en plus du survol classique en CSS pur.
function TrophyBadge({ wins, losses, t }) {
  const [pinned, setPinned] = useState(false);
  return (
    <span
      className={"trophy-wl" + (pinned ? " pinned" : "")}
      onClick={() => setPinned(p => !p)}
      onMouseLeave={() => setPinned(false)}
      title={`${t("winsLabel")} ✓${wins} · ${t("lossesLabel")} ✕${losses}`}
      role="button"
      tabIndex={0}
    >
      <span className="trophy-wl-icon" aria-hidden="true">🏆</span>
      <span className="trophy-wl-pop" role="status">
        <b className="win">✓ {wins} {t("winsLabel")}</b>
        <b className="loss">✕ {losses} {t("lossesLabel")}</b>
      </span>
    </span>
  );
}

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
  // Rejoindre la ferme librement, y compris pour l'HÔTE (demande 2026-07,
  // révisée) : Ferme Vallée est un monde partagé PERSISTANT (sauvegardé
  // dans ferme_saves, hors rooms.game_state) et HOST-AUTHORITATIVE (l'hôte
  // simule le monde et répond aux requêtes des autres joueurs — voir
  // FermeGame.js). Deux besoins distincts couverts par le même instantané
  // `fermeAway` (current_game/launch_at/stage_launch_at) :
  // 1. Un INVITÉ qui clique "Retour au salon" (🏠) DEPUIS la ferme ne
  //    touche jamais `rooms` en base (voir handleGameFinish) : ça ne fait
  //    que ramener CET invité à SA vue lobby locale. Sans instantané, il
  //    restait bloqué sur "En attente que l'hôte…" jusqu'à ce que l'hôte
  //    relance une partie pour tout le monde — inutile, la ferme continue.
  // 2. L'HÔTE lui-même, en revenant au salon (🎪 ou "Quitter" dans la
  //    ferme), NE DOIT PLUS forcer tout le monde à quitter : seul un vrai
  //    "📣 Rassembler tout le monde" (gatherFerme) le fait désormais. Le
  //    problème est que l'hôte, contrairement à un invité, EST le monde :
  //    démonter son FermeGame arrêterait la simulation pour tout le monde.
  //    Solution : dès que l'hôte quitte la vue, on garde une instance
  //    CACHÉE (display:none) de FermeGame montée en arrière-plan — voir
  //    plus bas, juste avant </RoomChat> — tant que `fermeAway` est
  //    renseigné ; la simulation continue exactement comme si de rien
  //    n'était, seule la vue de l'hôte a changé.
  // Dans les deux cas, un bouton dédié ("🌾 Rejoindre la ferme") restaure
  // l'instantané d'un clic (rejoinFerme), sans dépendre du round-trip
  // Realtime. Effacé dès qu'un VRAI changement de `rooms` arrive (voir
  // l'abonnement Realtime plus haut) ou dès que "Rassembler tout le monde"
  // est utilisé (l'état serveur fait alors autorité de nouveau).
  const [fermeAway, setFermeAway] = useState(null);
  // Correctif 2026-07 (bouton "Quitter" de Ferme Vallée inopérant par
  // intermittence) : l'abonnement Realtime `rooms` ci-dessous vit dans un
  // effet à deps figées ([code, router]), donc son callback ne voit JAMAIS
  // la valeur à jour de `fermeAway` (fermeture sur le `null` initial) — une
  // ref est nécessaire pour qu'il lise l'état courant à chaque évènement.
  const fermeAwayRef = useRef(null);
  useEffect(() => { fermeAwayRef.current = fermeAway; }, [fermeAway]);
  // Correctif 2026-07 : mémorise le code de la ferme durable une fois chargé
  // par FermeGame (voir `onCodeLoaded`), pour le repasser en `savedCode` à
  // toute nouvelle instance côté hôte (instance cachée en arrière-plan,
  // remontage lors d'un "Rejoindre la ferme") — sans quoi ces remontages
  // restaient bloqués sur l'écran "entrez le code", jamais cliqué puisque
  // soit invisible (display:none), soit sauté trop vite par l'utilisateur.
  const fermeCodeRef = useRef("");
  // Garde anti-double-appel pour la succession automatique de l'hôte
  // (point 5) : un seul essai par période "hôte disparu" détectée.
  const hostSuccessionRef = useRef(false);
  // Migrations Supabase optionnelles dont l'absence casse silencieusement le
  // lancement d'une partie : liste les fichiers upgrade-00N.sql manquants,
  // détectés en regardant si leurs colonnes apparaissent dans la ligne
  // `rooms` reçue au chargement (voir plus bas, `select *`). AVANT ce
  // correctif (2026-07), seule rooms.game_state (upgrade-002.sql) était
  // vérifiée : si launch_at (upgrade-003.sql) ou surtout stage_launch_at
  // (upgrade-004.sql) manquait, RIEN ne le signalait à l'hôte — l'écriture
  // de stage_launch_at échouait en silence (voir openStage plus bas),
  // l'hôte avançait seul (mise à jour locale optimiste) tandis que ses
  // invités restaient bloqués pour toujours sur "En attente que l'hôte
  // lance la partie…", sans que personne ne comprenne pourquoi.
  const [missingMigrations, setMissingMigrations] = useState([]);
  // Mode "agrandi" (demande 2026-07) : pendant une partie, masque l'en-tête
  // (logo, code, fabs secondaires) pour donner TOUTE la hauteur au jeu —
  // objectif : zéro scroll sur laptop.
  // PAR DÉFAUT (demande 2026-07) : le mode agrandi est ACTIF à chaque
  // chargement/rechargement de la page de jeu — plus de préférence
  // localStorage : la bascule ne vaut que pour la session de l'onglet
  // (activé au montage client uniquement, jamais au rendu serveur, sinon
  // hydratation désaccordée).
  const [stageFocus, setStageFocus] = useState(false);
  useEffect(() => { setStageFocus(true); }, []);
  function toggleStageFocus() {
    setStageFocus(prev => !prev);
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
      // Vérification passive des migrations 002/003/004 : si une colonne
      // n'apparaît pas dans la ligne renvoyée par `select *`, c'est qu'elle
      // n'existe pas encore en base -> avertir l'hôte au lobby AVANT qu'il
      // ne lance quoi que ce soit, plutôt que de le laisser découvrir la
      // panne en pleine soirée avec des invités bloqués.
      const missing = [];
      if (!Object.prototype.hasOwnProperty.call(roomRow, "game_state")) missing.push("supabase/upgrade-002.sql");
      if (!Object.prototype.hasOwnProperty.call(roomRow, "launch_at")) missing.push("supabase/upgrade-003.sql");
      if (!Object.prototype.hasOwnProperty.call(roomRow, "stage_launch_at")) missing.push("supabase/upgrade-004.sql");
      setMissingMigrations(missing);

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
          payload => {
            // Correctif 2026-07 : un invité (ou l'hôte) qui a quitté Ferme
            // Vallée via le bouton "Quitter" n'a RIEN écrit en base (voir
            // handleGameFinish/backToLobby) — `rooms.current_game` reste
            // "ferme" côté serveur, seule la vue locale est passée à
            // "lobby" (+ instantané `fermeAway`). Avant ce correctif, le
            // moindre UPDATE de `rooms` SANS RAPPORT avec la ferme
            // (nomination d'hôte, etc. — n'importe quel autre joueur peut
            // le déclencher, à n'importe quel moment) écrasait aveuglément
            // ce départ local en réappliquant `payload.new` tel quel :
            // l'invité se retrouvait renvoyé de force dans la ferme, et
            // "Quitter" semblait n'avoir fonctionné qu'une fois sur deux.
            // Tant que la base dit encore "ferme" en cours, on conserve
            // donc la vue "lobby" locale (et l'instantané `fermeAway`) —
            // seul un VRAI changement de jeu/statut en base (typiquement
            // "📣 Rassembler tout le monde", qui écrit current_game=null)
            // doit nous en faire sortir.
            if (fermeAwayRef.current && payload.new.current_game === "ferme") {
              setRoom(r => ({ ...payload.new, status: "lobby", current_game: null, game_state: null }));
              return;
            }
            setRoom(payload.new);
            setFermeAway(null);
          })
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
      .select("id, wins, losses, joined_at, profile_id, profiles(username, avatar)")
      .eq("room_id", roomId)
      .order("wins", { ascending: false });
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
    // "Terminer la partie" (avortée par l'hôte, demande 2026-07) : diffusée
    // sur ce MÊME canal presence déjà ouvert pour tout le monde — pas besoin
    // d'un canal dédié de plus pour ce simple message d'information, purement
    // cosmétique (voir showEndNotice). broadcast.self n'étant pas activé sur
    // ce canal, l'hôte lui-même déclenche son propre toast localement, voir
    // confirmEndGame plus bas.
    ch.on("broadcast", { event: "game_ended" }, () => { showEndNotice(); });
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

  // Succession automatique de l'hôte (demande 2026-07, point 5) : une room
  // vivante ne doit jamais rester sans hôte. Si la présence Realtime montre
  // que l'hôte est hors ligne depuis 8s (même délai de grâce que la bannière
  // ci-dessus, pour ne pas réagir à une simple coupure d'un instant), le
  // joueur en ligne présent depuis le plus longtemps (joined_at le plus
  // ancien) se revendique lui-même hôte via une RPC dédiée. Chaque client en
  // ligne fait le même calcul déterministe à partir des mêmes données
  // (room_players + presence) : un seul d'entre eux se reconnaît comme le
  // "prochain" et agit, les autres ne font rien. Fonctionne quel que soit
  // l'état de la room (lobby ou en pleine partie) — contrairement à la
  // bannière "hôte hors ligne" ci-dessus, réservée à l'affichage en jeu.
  useEffect(() => {
    if (!room || !me || online === null) return;
    if (room.host_id === me.id) { hostSuccessionRef.current = false; return; }
    if (online[room.host_id]) { hostSuccessionRef.current = false; return; }
    const tm = setTimeout(() => {
      if (hostSuccessionRef.current) return;
      const onlineOthers = players.filter(p => p.profile_id !== room.host_id && online[p.profile_id]);
      if (!onlineOthers.length) return;
      const successor = [...onlineOthers].sort(
        (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      )[0];
      if (successor.profile_id !== me.id) return;
      hostSuccessionRef.current = true;
      claimAbandonedHost(room.id).then(ok => {
        if (ok) setRoom(r => (r ? { ...r, host_id: me.id } : r));
      });
    }, 8000);
    return () => clearTimeout(tm);
  }, [room, me, online, players]);

  // Ambiance sonore du site : silence délicat dès qu'une partie démarre
  // (pour host ET invités, tous les deux synchronisés sur room.status),
  // reprise en douceur au retour au lobby — jamais un redémarrage complet
  // (voir lib/ambience.js).
  useEffect(() => {
    if (!room) return;
    if (room.status === "playing") duckAmbienceForGame();
    else resumeAmbienceForNav();
  }, [room?.status]);

  // Lancement d'une partie (demande 2026-07, point 2) : seul l'hôte a accès
  // au sélecteur de jeu (voir plus bas, `isHost ? ... : t("waitHost")`), donc
  // ce bouton EST le bouton "Jouer" unique de l'hôte. `launchGame` écrit en
  // même temps un horodatage cible (`launch_at`) que tous les clients (hôte
  // compris) attendent avant de révéler le jeu — voir `launching` plus bas —
  // pour une ouverture réellement simultanée, tolérante à un léger délai
  // réseau sur la réception du changement.
  // Correctif URGENT 2026-07 (site injouable : invités bloqués sur "En
  // attente que l'hôte lance la partie…", hôte seul en jeu) : cette
  // fonction n'appliquait AVANT aucune mise à jour locale, contrairement à
  // openStage/backToLobby/confirmEndGame juste en dessous — l'hôte
  // attendait donc lui aussi le round-trip Realtime complet avant de voir
  // quoi que ce soit changer, d'où la latence perçue au premier clic
  // "Jouer" du salon. `ok:false` (voir lib/gameSync.js) signale en plus un
  // échec d'écriture réel (jamais vu en pratique si les migrations sont à
  // jour) : dans ce cas on n'avance pas et on prévient l'hôte au lieu de le
  // laisser croire que la partie a démarré pour tout le monde.
  // Correctif latence hôte 2026-07 : AVANT, la mise à jour locale n'était
  // appliquée qu'APRÈS le await de l'écriture Supabase — l'hôte attendait
  // donc le round-trip réseau (100-400 ms, davantage sur une connexion
  // lente) avant de voir sa propre transition démarrer, d'où le "délai au
  // clic Jouer" signalé. Or l'horodatage cible (`launch_at`) est calculé
  // CÔTÉ CLIENT : on peut l'appliquer TOUT DE SUITE (l'animation part au
  // clic) puis lancer l'écriture en arrière-plan, en repassant le MÊME
  // horodatage à launchGame pour que la base écrive la valeur exacte que
  // l'hôte utilise déjà (invités parfaitement synchrones). Le garde-fou du
  // zip 111 est préservé autrement : si l'écriture échoue VRAIMENT
  // (`ok:false`), on ANNULE la transition optimiste (rollback) et on
  // prévient l'hôte, au lieu de le laisser avancer seul pendant que les
  // invités ne reçoivent jamais rien.
  async function launch(gameId, opts = {}) {
    const prevRoom = room;
    setSoloChess(!!opts.solo);
    const launchAt = new Date(Date.now() + GAME_LAUNCH_BUFFER_MS).toISOString();
    setRoom(r => (r ? { ...r, status: "playing", current_game: gameId, launch_at: launchAt, stage_launch_at: null, game_state: null } : r));
    const { ok } = await launchGame(room.id, gameId, launchAt);
    if (!ok) { setRoom(prevRoom); setSoloChess(false); setLaunchWriteError(true); }
  }

  // Ouverture synchronisée de la scène (demande 2026-07) : le bouton
  // "Jouer" de la porte/rideau/flash/vidéo (DoorStage.js et copies) n'est
  // plus un simple clic LOCAL qui n'ouvrait que la porte de celui qui
  // cliquait — seul l'hôte peut désormais cliquer, et `launchStage` écrit
  // l'horodatage cible que chaque Stage (hôte compris) attend avant de
  // faire pivoter sa porte, exactement le même principe que `launch`
  // ci-dessus pour le lancement de la partie. Mise à jour locale
  // immédiate : l'hôte n'attend pas le round-trip Realtime pour voir sa
  // propre porte s'animer.
  // Correctif URGENT 2026-07 (CAUSE RACINE du blocage) : `launchStage`
  // renvoyait AVANT un simple horodatage, présenté comme valide même quand
  // l'écriture Supabase avait réellement échoué (typiquement : colonne
  // rooms.stage_launch_at absente faute d'avoir exécuté
  // supabase/upgrade-004.sql). La ligne `setRoom` locale s'exécutait alors
  // quand même : la porte de L'HÔTE s'ouvrait (état local, sans dépendre du
  // réseau), mais comme RIEN n'avait été écrit en base, aucun invité ne
  // recevait jamais le moindre changement par Realtime -> porte fermée pour
  // toujours de leur côté, hôte seul en jeu. Le garde `if (!ok) return`
  // ci-dessous empêche cette divergence silencieuse : si l'écriture échoue
  // vraiment, l'hôte reste bloqué lui aussi (comme ses invités) et voit un
  // message clair au lieu d'avancer seul sans le savoir.
  // Correctif latence hôte 2026-07 (même principe que `launch` ci-dessus,
  // appliqué à l'ouverture de la scène) : c'est CE clic qui déclenche
  // l'animation d'ouverture de la porte/rideau, et il était le plus ressenti
  // comme "mort" — buffer scène de 900 ms n'affichant rien, PRÉCÉDÉ du
  // round-trip réseau avant même de démarrer. On applique désormais
  // l'horodatage local immédiatement (la porte de l'hôte commence à pivoter
  // au clic), on écrit en arrière-plan avec le même `openAt`, et on annule
  // (rollback à l'état porte fermée précédent) uniquement si l'écriture
  // échoue vraiment — garde-fou anti-blocage du zip 111 préservé.
  async function openStage() {
    if (!isHost) return;
    const prevStageLaunchAt = room?.stage_launch_at ?? null;
    const openAt = new Date(Date.now() + STAGE_LAUNCH_BUFFER_MS).toISOString();
    setRoom(r => (r ? { ...r, stage_launch_at: openAt } : r));
    const { ok } = await launchStage(room.id, openAt);
    if (!ok) { setRoom(r => (r ? { ...r, stage_launch_at: prevStageLaunchAt } : r)); setLaunchWriteError(true); }
  }

  // "Nommer comme host" (demande 2026-07, point 4) : transfert volontaire et
  // immédiat, via une RPC dédiée (la policy RLS empêcherait sinon l'hôte
  // d'écrire un host_id différent du sien). Mise à jour locale immédiate en
  // plus du round-trip Realtime, comme backToLobby ci-dessous.
  async function doNominateHost(profileId) {
    if (!room || !me || room.host_id !== me.id || profileId === me.id) return;
    const ok = await nominateHost(room.id, profileId);
    if (ok) setRoom(r => (r ? { ...r, host_id: profileId } : r));
  }

  // Retour au lobby DEPUIS n'importe quel moment d'une partie (pas seulement
  // à la fin naturelle) : l'hôte peut ramener tout le monde au salon sans
  // que personne n'ait à quitter la room elle-même. Utilisé par le logo
  // ARCARDI (brandHome ci-dessous) — PAS par la pastille "Terminer la
  // partie" (voir endCurrentGame juste après), qui a une sémantique
  // volontairement différente depuis la demande 2026-07 (ne quitte jamais
  // la scène).
  async function backToLobby() {
    // Ferme Vallée (demande 2026-07, révisée) : "Retour au salon" ne doit
    // PLUS entraîner tout le monde automatiquement quand c'est l'HÔTE qui
    // quitte la ferme — seul "📣 Rassembler tout le monde" (gatherFerme,
    // plus bas) le fait désormais. On délègue donc au même chemin local
    // que pour un invité (handleGameFinish), qui garde en plus une
    // instance cachée de la ferme active en arrière-plan pour l'hôte (voir
    // le commentaire de `fermeAway` plus haut). Comportement INCHANGÉ pour
    // les 21 autres jeux : reset global classique, comme avant.
    if (room?.current_game === "ferme") { handleGameFinish(); return; }
    await resetRoomToLobby(room.id);
    // Mise à jour locale immédiate : ne dépend pas du round-trip Realtime,
    // donc fonctionne même si la réplication Postgres sur `rooms` a du
    // retard (l'hôte voit l'effet de son propre clic tout de suite).
    setRoom(r => (r ? { ...r, status: "lobby", current_game: null, game_state: null } : r));
  }

  // "📣 Rassembler tout le monde" (demande 2026-07) : LA seule action qui
  // referme réellement Ferme Vallée pour tout le monde — écrit `rooms` en
  // base (comme l'ancien backToLobby), ce qui ramène tous les invités au
  // salon via Realtime (leur `fermeAway` est effacé au passage, voir
  // l'abonnement plus haut) et arrête l'instance cachée de l'hôte.
  async function gatherFerme() {
    if (!isHost || room?.current_game !== "ferme") return;
    setFermeAway(null);
    await resetRoomToLobby(room.id);
    setRoom(r => (r ? { ...r, status: "lobby", current_game: null, game_state: null } : r));
  }

  // "Terminer la partie" (demande 2026-07, révisée) : ANNULE la partie EN
  // COURS — avec CONFIRMATION explicite (risque de perte de progression pour
  // tout le monde, pas un geste anodin) — puis prévient tous les joueurs et
  // ramène TOUT LE MONDE à l'écran de lancement du jeu (porte/rideau fermé,
  // bouton "Jouer" du Stage), jamais jusqu'au salon de sélection — cette
  // dernière action reste l'exclusivité de la pastille "Retour au salon"
  // (🎪, voir backToLobby plus haut).
  //
  // Mécanisme : on réutilise TEL QUEL le palier de lancement synchronisé
  // déjà en place pour le bouton "Jouer" du salon (launchGame écrit un
  // launch_at proche dans le futur ; TOUS les clients, hôte compris,
  // affichent alors le palier "Ça commence…" puis démontent et remontent
  // .game-stage une fois l'horodatage atteint — voir plus bas, `launching`).
  // Remonter .game-stage crée une INSTANCE FRAÎCHE du Stage (porte/rideau
  // toujours fermée à l'initialisation) SANS remonter le jeu qu'elle
  // contient : DoorStage/CurtainStage/etc. ne rendent leurs `children` que
  // lorsque doorState==='open', donc le composant de jeu réel (YahtzeeGame
  // etc.) ne se monte qu'au clic LOCAL sur "Jouer" de chaque joueur, comme au
  // tout premier lancement — exactement l'écran demandé. `clearGameState`
  // (déjà existant dans gameSync.js, utilisé jusqu'ici seulement en
  // filet de sécurité) efface au passage l'ancienne partie persistée : sans
  // ça, le jeu la restaurerait telle quelle à la réouverture de la porte
  // (voir readGameState dans chaque XxxGame.js) au lieu d'attendre un
  // nouveau `match_start` — l'aurait "annulée" en apparence seulement, la
  // vraie progression aurait repris pile où elle en était. Zéro changement
  // de schéma Supabase : les deux colonnes utilisées (game_state, launch_at)
  // existent déjà et servent déjà à d'autres mécaniques du site.
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endNotice, setEndNotice] = useState(false);
  // Correctif URGENT 2026-07 : bannière visible par l'hôte SEUL (lui seul
  // peut agir) quand launchGame/launchStage signalent un échec d'écriture
  // réel (voir lib/gameSync.js) — au lieu de le laisser avancer seul en
  // silence pendant que ses invités restent bloqués sans explication.
  const [launchWriteError, setLaunchWriteError] = useState(false);
  // Verrou "Tu Préfères" (demande 2026-07) : ce jeu ne se lance pas librement.
  // Au clic sur sa carte, l'hôte doit saisir un code secret ("grenadine") dans
  // une modale ; code redemandé à CHAQUE lancement (aucune persistance).
  const [codeGate, setCodeGate] = useState(null); // { gameId, solo } | null
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const TUPREF_CODE = "grenadine";
  function submitCodeGate() {
    if (!codeGate) return;
    if (codeInput.trim().toLowerCase() === TUPREF_CODE) {
      const { gameId, solo } = codeGate;
      setCodeGate(null); setCodeInput(""); setCodeError(false);
      launch(gameId, { solo });
    } else {
      setCodeError(true);
    }
  }
  // Mode solo échecs (demande 2026-07) : mémorise que le prochain lancement
  // d'échecs se fait contre le bot (siège tenu par l'IA côté hôte). Passé en
  // prop à ChessGame ; la persistance en cas de rechargement vient du
  // game_state (flag solo) lu par ChessGame lui-même.
  const [soloChess, setSoloChess] = useState(false);
  const noticeTimerRef = useRef(null);
  const showEndNotice = useCallback(() => {
    setEndNotice(true);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setEndNotice(false), 3400);
  }, []);
  function endCurrentGame() {
    if (!isHost) return;
    setConfirmEndOpen(true);
  }
  function cancelEndGame() {
    setConfirmEndOpen(false);
  }
  async function confirmEndGame() {
    setConfirmEndOpen(false);
    if (!isHost || !room?.current_game) return;
    const gameId = room.current_game;
    // Le message d'information part IMMÉDIATEMENT (avant même les écritures
    // réseau ci-dessous) : c'est un simple avertissement cosmétique, il n'a
    // aucune raison d'attendre le round-trip Supabase. Diffusé aux autres via
    // le canal presence déjà ouvert ; déclenché localement pour l'hôte
    // lui-même (ce canal n'a pas broadcast.self activé, voir plus haut).
    presenceChRef.current?.send({ type: "broadcast", event: "game_ended", payload: {} });
    showEndNotice();
    await clearGameState(room.id);
    const { launchAt, ok } = await launchGame(room.id, gameId);
    if (!ok) { setLaunchWriteError(true); return; }
    // Mise à jour locale immédiate côté hôte (même filet que backToLobby) :
    // ne dépend pas du round-trip Realtime pour voir l'effet de son propre clic.
    // stage_launch_at repart à null : la scène redémarre porte fermée, en
    // attente d'un nouveau clic "Jouer" (voir launchGame dans gameSync.js).
    setRoom(r => (r ? { ...r, status: "playing", current_game: gameId, launch_at: launchAt, game_state: null, stage_launch_at: null } : r));
  }

  // Callback passé à chaque jeu pour son bouton de fin de partie
  // ("Retour au salon" / "🏠"). Avant : un onFinish={() => {}} — un no-op qui
  // ne faisait STRICTEMENT rien, d'où le bouton qui semblait "sans effet"
  // même quand la mise à jour Supabase avait réussi.
  // Correctif 2026-07 (bug remonté par Guillaume : "bouton leave qui ne
  // ramène pas au lobby", reproduit côté hôte) : `setFermeAway(...)` était
  // appelé DEPUIS la fonction de mise à jour passée à `setRoom(r => ...)`.
  // Ce genre d'effet de bord dans une fonction censée être pure est
  // dangereux avec React 18/StrictMode (activé par défaut en dev
  // Next.js) : la fonction de mise à jour peut être invoquée plusieurs
  // fois pour un même rendu, ce qui pouvait déclencher `setFermeAway`
  // deux fois (ou dans un ordre imprévisible par rapport à `setRoom`) et
  // laisser l'hôte bloqué sur la vue ferme au lieu de revenir au lobby.
  // On lit maintenant `room` directement (fermeture sur l'état du rendu en
  // cours, toujours à jour au moment du clic) AVANT de déclencher les deux
  // mises à jour d'état, l'une après l'autre, toutes deux pures.
  function handleGameFinish() {
    if (room && room.status === "playing" && room.current_game === "ferme") {
      // Instantané pris pour TOUT joueur qui quitte la vue ferme (hôte
      // compris depuis la révision 2026-07) — voir le commentaire de
      // `fermeAway` plus haut pour le détail des deux usages (invité vs
      // hôte).
      setFermeAway({ current_game: room.current_game, launch_at: room.launch_at, stage_launch_at: room.stage_launch_at });
    }
    setRoom(r => (r ? { ...r, status: "lobby", current_game: null, game_state: null } : r));
  }

  // Rejoindre la ferme d'un clic (demande 2026-07) : restaure localement
  // l'instantané pris juste avant le retour au salon — aucune écriture
  // Supabase nécessaire. Pour un invité, la ferme n'a jamais quitté son
  // état "playing" côté hôte/serveur. Pour l'hôte lui-même, c'est
  // l'instance cachée (voir plus bas, avant </RoomChat>) qui a continué de
  // la simuler pendant son absence : ce clic ne fait que remonter la vue
  // visible.
  function rejoinFerme() {
    if (!fermeAway) return;
    const snap = fermeAway;
    setFermeAway(null);
    setRoom(r => (r ? { ...r, status: "playing", current_game: snap.current_game, launch_at: snap.launch_at, stage_launch_at: snap.stage_launch_at } : r));
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
    // Remplace le simple DELETE : si le partant est l'hôte, la RPC
    // `leave_room` promeut automatiquement le joueur présent depuis le plus
    // longtemps parmi ceux qui restent (demande 2026-07, point 5).
    if (me && room) await leaveRoomAndHandoff(room.id);
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

  // Ambiances de pièce (généralisé 2026-07) : pendant une partie, le thème
  // feu de camp (fond, encarts, pastilles, bulles champagne) glisse vers une
  // teinte propre au jeu en cours — mécanique unique pour les 15 jeux
  // concernés, une classe sur <body>, les variables CSS font le reste (voir
  // body.<x>-theme dans globals.css). Le 10000 ("lumière éteinte", bleu
  // marine) et les 3 autres ambiances d'origine (Petit Bac, Ludo, Worldle)
  // gardent exactement leurs noms de classe historiques ; les 11 nouveaux
  // jeux reprennent le même schéma <gameId>-theme. Yahtzee est volontairement
  // exclu (garde le feu de camp par défaut, demande explicite).
  // Hook placé AVANT les early returns (règle des hooks React).
  const ROOM_THEME_CLASS = {
    tenk: "tenk-night",
    petitbac: "pb-theme",
    ludo: "ludo-theme",
    worldle: "worldle-theme",
    quiz: "quiz-theme",
    wordle: "wordle-theme",
    piano: "piano-theme",
    connect4: "connect4-theme",
    echoes: "echoes-theme",
    diapason: "diapason-theme",
    heist: "heist-theme",
    chromatik: "chromatik-theme",
    goldmines: "goldmines-theme",
    president: "president-theme",
    tupreferes: "tupreferes-theme",
    // yahtzee : pas d'entrée — reste au thème feu de camp par défaut.
  };
  const playingThemeClass = (room && me && room.status === "playing" && ROOM_THEME_CLASS[room.current_game]) || null;
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (playingThemeClass) document.body.classList.add(playingThemeClass);
    return () => { if (playingThemeClass) document.body.classList.remove(playingThemeClass); };
  }, [playingThemeClass]);

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
  //
  // Correctif (dimensionnement ignoré au lancement) : `.game-stage` (voir
  // plus bas, `ref={stageRef}`) ne monte QU'une fois le palier de lancement
  // synchronisé terminé (`playing && !launching`, voir plus bas), alors que
  // `focusActive` (donc cet effet) devient vrai dès `room.status ===
  // "playing"` — c'est-à-dire PENDANT ce palier, avant que `.game-stage`
  // n'existe dans le DOM. Avec un simple `useRef`, l'effet se déclenchait
  // alors une fois, trouvait `stageRef.current === null`, et abandonnait
  // (`if (!el) return;`) SANS jamais installer le ResizeObserver — et comme
  // les refs ne font pas partie des dépendances de l'effet, React ne le
  // relançait jamais quand `.game-stage` apparaissait enfin quelques
  // centaines de ms plus tard : plus aucun recalcul de zoom pour toute la
  // partie, le jeu restait à la taille (souvent incorrecte) figée au tout
  // premier essai. Décrit exactement le symptôme signalé : la mise à
  // l'échelle "ignore" la vraie taille de page au lancement, mais se
  // recalibre dès qu'on rebascule le mode agrandi (ce qui refait tourner cet
  // effet à un moment où `.game-stage` est, lui, déjà bien monté).
  // Remplacé par une ref-callback (état React) : `stageEl` entre dans le
  // tableau de dépendances, donc l'effet se relance de lui-même dès que
  // `.game-stage` apparaît (ou disparaît) dans le DOM, plus besoin de
  // rebasculer quoi que ce soit manuellement.
  const [stageEl, setStageEl] = useState(null);
  const [stageScale, setStageScale] = useState(1);
  useEffect(() => {
    if (!focusActive || typeof window === "undefined") { setStageScale(1); return; }
    const el = stageEl;
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
        setStageScale(prev => {
          if (natural > avail) {
            // Ça déborde : on réduit tout de suite, jamais de zone tampon
            // ici (mieux vaut un jeu clairement réduit que du contenu coupé
            // en bas d'écran) — seuil de 3 % pour ne pas re-rendre (ni
            // re-glisser) pour deux pixels.
            const s = Math.max(0.55, avail / natural);
            return Math.abs(prev - s) > 0.03 ? Math.round(s * 100) / 100 : prev;
          }
          // Ça tient dans l'écran : AVANT de remonter à l'échelle 1 tout
          // rond, exige une vraie marge de confort (HYSTERESIS_PX) quand on
          // était déjà réduit — correctif "aller-retour" 2026-07. Sans
          // cette marge, un contenu qui gagne/perd quelques pixels PILE au
          // seuil (ex. Ludo : le plateau de dés se cache et le texte de
          // statut change pendant la roue de la fortune) faisait osciller
          // le zoom entre 1 et une échelle réduite à chaque petite
          // variation, au lieu de se stabiliser.
          if (prev === 1) return 1;
          const HYSTERESIS_PX = 32;
          return (avail - natural) > HYSTERESIS_PX ? 1 : prev;
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
  }, [focusActive, stageEl, room?.current_game]);

  // Lancement synchronisé (demande 2026-07, point 2) : tant que l'horodatage
  // cible `launch_at` écrit par l'hôte n'est pas atteint, on affiche un
  // court palier d'attente au lieu du jeu (voir `launching` plus bas).
  //
  // Réécrit (correctifs 2026-07) : un simple booléen posé par timeout, au
  // lieu de l'ancien intervalle de 100 ms qui, une fois la cible atteinte,
  // ne se coupait jamais (ses dépendances ne changeaient pas à cet instant)
  // et re-rendait toute la page 10 fois par seconde pendant TOUTE la partie.
  // La durée est de plus BORNÉE par GAME_LAUNCH_BUFFER_MS : `launch_at` est
  // écrit avec l'horloge de l'HÔTE et comparé à l'horloge LOCALE — à la
  // moindre dérive entre machines, un invité pouvait rester coincé sur
  // "Ça commence…" pendant des minutes (l'un des deux visages du blocage
  // signalé). Au pire, le palier dure maintenant son budget nominal, puis
  // s'efface. Un client qui (re)charge après coup (delay nul) n'a aucun
  // palier, comme avant.
  const [launchHold, setLaunchHold] = useState(false);
  useEffect(() => {
    if (!room?.launch_at || room.status !== "playing") { setLaunchHold(false); return; }
    // Correctif latence hôte 2026-07 : l'HÔTE vient de cliquer "Jouer" et a
    // déjà appliqué la transition optimiste (voir launch/openStage) -> il ne
    // doit subir AUCUN palier d'attente, sa scène se révèle instantanément.
    // Le tampon GAME_LAUNCH_BUFFER_MS n'a de sens que pour laisser les INVITÉS
    // se resynchroniser sur l'horodatage cible ; il ne s'applique donc qu'à
    // eux. La synchro des animations (porte/rideau) reste pilotée séparément
    // par stage_launch_at, inchangée.
    if (me && room.host_id === me.id) { setLaunchHold(false); return; }
    const target = new Date(room.launch_at).getTime();
    const delay = Math.max(0, Math.min(target - Date.now(), GAME_LAUNCH_BUFFER_MS));
    if (!delay) { setLaunchHold(false); return; }
    setLaunchHold(true);
    const tm = setTimeout(() => setLaunchHold(false), delay);
    return () => clearTimeout(tm);
  }, [room?.launch_at, room?.status, room?.host_id, me?.id]);

  if (error) return <div className="wrap"><div className="panel"><h1>😕</h1><p className="hint">{error}</p></div></div>;
  if (!room || !me) return <div className="wrap"><p className="muted">…</p></div>;

  const isHost = room.host_id === me.id;
  const playing = room.status === "playing";
  const launching = playing && launchHold;
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

      {/* En partie : jusqu'à trois pastilles fixes empilées en haut à droite
          (demande 2026-07, révisée) — regroupées dans .stage-fabs (voir
          globals.css) qui gère à elle seule le positionnement (colonne,
          ancrée à droite) : chaque bouton n'a plus qu'à s'empiler dedans,
          plus besoin de coordonner un `top` par bouton et par mode.
          - "Terminer la partie" (hôte SEUL, à tout moment) : demande
            confirmation (voulez-vous avorter la partie ?), PUIS prévient
            tous les joueurs et ramène TOUT LE MONDE à l'écran de lancement
            du jeu (porte/rideau fermé, bouton "Jouer") — jamais jusqu'au
            salon de sélection (voir confirmEndGame plus haut).
          - "Retour au salon" (hôte SEUL, 🎪) : ramène l'hôte au salon de
            sélection de jeu — même action que backToLobby (logo ARCARDI).
            Pour Ferme Vallée (demande 2026-07, révisée) : ne ramène QUE
            l'hôte, la ferme continue de tourner pour les autres (voir
            backToLobby/fermeAway) ; pour les 21 autres jeux, comportement
            inchangé, ramène tout le monde.
          - "📣 Rassembler tout le monde" (hôte SEUL, Ferme Vallée
            uniquement, demande 2026-07) : LA seule action qui referme
            réellement la ferme pour tout le monde (voir gatherFerme).
          - Mode agrandi (tout le monde) : masque l'en-tête et les vignettes
            pour donner toute la hauteur au jeu (voir body.stage-focus). */}
      {playing && (
        <div className="stage-fabs">
          {isHost && (
            <button
              className="back-room-fab"
              onClick={endCurrentGame}
              title={t("endGameTooltip")}
              aria-label={t("endGameShort")}
              style={meta ? { borderColor: `var(${meta.accent})` } : undefined}
            >
              <svg className="back-room-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="2.5" />
              </svg>
              <span className="back-room-label">{t("endGameShort")}</span>
            </button>
          )}
          {isHost && room.current_game === "ferme" && (
            <button
              className="back-room-fab"
              onClick={gatherFerme}
              title={t("gatherFermeTooltip")}
              aria-label={t("gatherFermeShort")}
              style={meta ? { borderColor: `var(${meta.accent})` } : undefined}
            >
              <span className="back-room-icon" aria-hidden="true">📣</span>
              <span className="back-room-label">{t("gatherFermeShort")}</span>
            </button>
          )}
          {isHost && (
            <button
              className="back-room-fab"
              onClick={backToLobby}
              title={t("backSalonTooltip")}
              aria-label={t("c4BackToRoom")}
              style={meta ? { borderColor: `var(${meta.accent})` } : undefined}
            >
              <span className="back-room-icon" aria-hidden="true">🎪</span>
              <span className="back-room-label">{t("c4BackToRoom")}</span>
            </button>
          )}
          <button
            className={"stage-zoom-fab" + (stageFocus ? " on" : "")}
            onClick={toggleStageFocus}
            title={stageFocus ? t("stageFocusOff") : t("stageFocusOn")}
            aria-pressed={stageFocus}
          >
            <span aria-hidden="true">⛶</span>
            <span className="stage-zoom-label">{stageFocus ? t("stageFocusOff") : t("stageFocusOn")}</span>
          </button>
        </div>
      )}

      {/* Confirmation avant d'avorter la partie (demande 2026-07) : portée
          hors de l'arborescence de la scène via un portail React — même
          raison que GameRulesButton (un ancêtre en `transform` casserait le
          `position:fixed` de l'overlay, voir ce fichier pour le détail). */}
      {confirmEndOpen && typeof document !== "undefined" && createPortal(
        <div className="confirm-modal-overlay" onClick={cancelEndGame}>
          <div
            className="confirm-modal"
            onClick={e => e.stopPropagation()}
            style={meta ? { "--accent": `var(${meta.accent})` } : undefined}
          >
            <h2 className="confirm-modal-title">{t("endGameConfirmTitle")}</h2>
            <p className="confirm-modal-text">{t("endGameConfirmText")}</p>
            <div className="confirm-modal-actions">
              <button className="btn ghost" onClick={cancelEndGame}>{t("endGameConfirmNo")}</button>
              <button className="btn" onClick={confirmEndGame}>{t("endGameConfirmYes")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Message d'information à TOUS les joueurs (demande 2026-07) : "la
          partie est terminée" — diffusé par confirmEndGame, reçu ici via le
          canal presence (voir l'effet ci-dessus, event "game_ended").
          Toast auto-disparaissant, jamais bloquant. */}
      {endNotice && (
        <div className="system-notice-banner" role="status">
          <span>🏳️ {t("gameEndedNotice")}</span>
        </div>
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

      {launchWriteError && isHost && (
        // Correctif URGENT 2026-07 : visible UNIQUEMENT par l'hôte (lui
        // seul peut agir, en exécutant la migration Supabase manquante) —
        // évite qu'il avance seul en jeu sans savoir que ses invités, eux,
        // ne recevront jamais rien (voir openStage/launch plus haut).
        <div className="host-offline-banner" role="alert">
          <span>{t("launchWriteErrorBanner")}</span>
          <button className="btn ghost" onClick={() => setLaunchWriteError(false)}>
            {t("launchWriteErrorDismiss")}
          </button>
        </div>
      )}

      <Crossfade id={viewKey} duration={480}>
        {playing && launching ? (
          // ===== PALIER DE LANCEMENT SYNCHRONISÉ (demande 2026-07, point 2) =====
          // Affiché chez TOUS les clients (hôte compris) tant que l'horodatage
          // `launch_at` écrit par l'hôte n'est pas atteint localement — le jeu
          // en dessous ne monte donc jamais avant cet instant commun, même si
          // ce client a reçu le changement Realtime un peu en avance sur les
          // autres.
          <div className="panel game-launch-panel" style={meta ? { "--accent": `var(${meta.accent})` } : undefined}>
            <span className="game-launch-icon">{meta?.icon}</span>
            <h1>{meta ? t(meta.nameKey) : ""}</h1>
            <p className="hint">{t("gameLaunchingIn")}</p>
          </div>
        ) : playing ? (
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
                    {/* Victoires/Défaites retirées d'ici (demande 2026-07) :
                        jamais affichées sur les chips joueurs pendant une
                        partie, disponibles uniquement sur la page du salon
                        via le trophée discret (voir TrophyBadge plus haut). */}
                  </span>
                ))}
              </div>
              {/* Le bouton "Retour au salon" a quitté cette barre : il vit
                  maintenant en pastille fixe en haut à droite (.back-room-fab)
                  pour libérer la largeur au profit des chips de score. */}
            </div>

            <div
              className="game-stage"
              ref={setStageEl}
              /* Mode agrandi : zoom auto pour tout faire tenir à l'écran
                 (1 = taille normale, voir l'effet stageScale plus haut). */
              style={focusActive && stageScale < 1 ? { zoom: stageScale } : undefined}
            >
              {meta && (() => {
                const StageComponent = STAGE_COMPONENT[meta.stage] || DoorStage;
                return (
                // Filet de sécurité (2026-07) : si le moteur du jeu (ou sa
                // scène) lève une exception, seul cet encart est remplacé
                // par un message + un bouton de sortie, au lieu d'un écran
                // blanc pour toute la page. La `key` (jeu + launch_at) jette
                // le boundary cassé dès que l'hôte relance : instance
                // fraîche, plus d'état "planté" résiduel. onBack : l'hôte
                // ramène tout le monde au salon (reset room), un invité ne
                // quitte que SA vue (même distinction que brandHome).
                <GameErrorBoundary key={room.current_game + "|" + (room.launch_at || "")} t={t} onBack={() => { if (isHost) backToLobby(); else handleGameFinish(); }}>
                <StageComponent gameId={room.current_game} icon={meta.icon} name={t(meta.nameKey)} accentVar={meta.accent} lang={lang} t={t} onRulesOpenChange={setReadingRules} rulesReaderNames={rulesReaderNames} isHost={isHost} stageLaunchAt={room.stage_launch_at} onHostOpen={openStage}>
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
                  {room.current_game === "tupreferes" && (
                    <TuPreferesGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "chess" && (
                    <ChessGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} solo={soloChess} />
                  )}
                  {room.current_game === "rami" && (
                    <RamiGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "naval" && (
                    <NavalGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "calcrace" && (
                    <CalcRaceGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "puzzle" && (
                    <PuzzleGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
                  )}
                  {room.current_game === "ferme" && (
                    <FermeGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} savedCode={fermeCodeRef.current} onCodeLoaded={(c) => { fermeCodeRef.current = c; }} />
                  )}
                </StageComponent>
                </GameErrorBoundary>
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
                  <TrophyBadge wins={p.wins} losses={p.losses} t={t} />
                  {/* "Nommer comme host" (demande 2026-07, point 4) : action de
                      transfert visible uniquement pour l'hôte actuel, sur les
                      AUTRES joueurs en ligne — se transférer le rôle à
                      soi-même n'a pas de sens, et un joueur hors ligne ne
                      peut pas assumer le rôle tout de suite. */}
                  {isHost && p.profile_id !== me.id && isOnline(p.profile_id) && (
                    <button
                      className="nominate-host-btn"
                      onClick={() => doNominateHost(p.profile_id)}
                      title={t("nominateHostAction")}
                    >
                      👑 {t("nominateHostAction")}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isHost && missingMigrations.length > 0 && (
              // Avertissement visible UNIQUEMENT par l'hôte : une ou
              // plusieurs migrations n'ont pas été exécutées. AVANT ce
              // correctif, seule rooms.game_state (upgrade-002.sql) était
              // vérifiée ici -> une migration 003/004 manquante (celle qui a
              // rendu le site injouable, voir openStage dans ce fichier)
              // passait totalement inaperçue, sans le moindre signal.
              <div className="sql-warn">
                <b>{t("sqlWarnTitle")}</b><br />
                {t("sqlWarnBody")}{" "}
                {missingMigrations.map((m, i) => (
                  <span key={m}>{i > 0 ? ", " : ""}<code>{m}</code></span>
                ))}
              </div>
            )}

            {isHost && fermeAway ? (
              // L'hôte est revenu au salon SANS faire quitter tout le
              // monde (demande 2026-07, révisée) : la ferme continue de
              // tourner en arrière-plan (instance cachée, voir plus bas
              // avant </RoomChat>). On masque donc le sélecteur de jeu
              // habituel (lancer un AUTRE jeu pendant que la ferme tourne
              // n'aurait pas de sens) au profit d'un rappel + des deux
              // seules actions pertinentes ici : reprendre, ou rassembler
              // tout le monde pour de bon.
              <div className="ferme-rejoin-cta" style={{ marginTop: 16, textAlign: "center" }}>
                <p className="hint" style={{ marginBottom: 10 }}>{t("hostFermeAwayHint")}</p>
                <button className="btn" style={{ width: "auto", padding: "10px 22px" }} onClick={rejoinFerme}>
                  {t("rejoinFerme")}
                </button>
                <button className="btn ghost" style={{ width: "auto", padding: "10px 22px", marginTop: 10 }} onClick={gatherFerme}>
                  📣 {t("gatherFermeShort")}
                </button>
              </div>
            ) : isHost ? (
              <>
                <p className="hint" style={{ marginTop: 22, marginBottom: 10 }}>{t("gamePicker")}</p>
                <div className="game-grid">
                  {GAME_ORDER.map(id => {
                    const g = GAME_META[id];
                    // Correctif 2026-07 : le verrou minPlayers compte les
                    // joueurs EN LIGNE (map presence), plus room_players
                    // brut — avant, un salon de 2 inscrits dont 1 déconnecté
                    // laissait lancer un jeu à 2 joueurs qui démarrait figé.
                    // Tant que la presence n'a pas fait sa première synchro
                    // (online === null), isOnline considère tout le monde en
                    // ligne : même comportement qu'avant, jamais de faux
                    // verrou au chargement de la page.
                    const onlineCount = players.filter(p => isOnline(p.profile_id)).length;
                    // Échecs : jeu à DEUX joueurs pile (g.maxPlayers) — verrouillé
                    // aussi quand le salon dépasse le maximum, en plus du minimum.
                    // Solo (demande 2026-07) : quand l'hôte est SEUL en ligne, la
                    // carte Échecs devient "vs Ordinateur" et lance une partie
                    // contre le bot au lieu d'afficher le cadenas.
                    const soloEligible = id === "chess" && onlineCount === 1;
                    const disabled = soloEligible ? false : ((g.minPlayers && onlineCount < g.minPlayers) || (g.maxPlayers && onlineCount > g.maxPlayers) || false);
                    const cta = disabled ? "🔒" : soloEligible ? ("🤖 " + t("chessVsBot")) : (t("playCta") + " →");
                    return (
                      <button
                        key={id}
                        className="game-card"
                        style={{ "--accent": `var(${g.accent})`, opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                        onClick={() => {
                          if (disabled) return;
                          playGameCardClick();
                          // Tu Préfères : verrouillé par code, on ouvre la modale au lieu de lancer.
                          if (id === "tupreferes") { setCodeInput(""); setCodeError(false); setCodeGate({ gameId: id, solo: soloEligible }); return; }
                          launch(id, { solo: soloEligible });
                        }}
                      >
                        <span className="game-card-icon">{g.icon}</span>
                        <span className="game-card-title">{t(g.nameKey)}</span>
                        <span className="game-card-tag">{t(g.tagKey)}</span>
                        <span className="game-card-cta">{cta}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>{t("moreGamesSoon")}</p>
              </>
            ) : fermeAway && isOnline(room.host_id) ? (
              // Ferme Vallée continue de tourner sans cet invité : bouton
              // autonome pour la rejoindre, sans attendre l'hôte — affiché
              // uniquement tant que l'hôte est en ligne (sinon le monde
              // host-authoritative n'est plus animé côté serveur, rejoindre
              // n'aurait aucun sens ; on retombe alors sur le message
              // d'attente standard ci-dessous).
              <div className="ferme-rejoin-cta" style={{ marginTop: 16, textAlign: "center" }}>
                <p className="hint" style={{ marginBottom: 10 }}>{t("rejoinFermeHint")}</p>
                <button className="btn" style={{ width: "auto", padding: "10px 22px" }} onClick={rejoinFerme}>
                  {t("rejoinFerme")}
                </button>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 16 }}>{t("waitHost")}</p>
            )}
          </div>
        )}
      </Crossfade>

      {/* Verrou "Tu Préfères" : modale de code (hôte). Le bon code lance la
          partie ; il est redemandé à chaque lancement. */}
      {codeGate && (
        <div className="code-gate-ov" onClick={() => { setCodeGate(null); setCodeError(false); }}>
          <div className="code-gate" onClick={e => e.stopPropagation()}>
            <div className="code-gate-icon">🔒</div>
            <h3>{t("tuprefCodeTitle")}</h3>
            <p className="muted">{t("tuprefCodePrompt")}</p>
            <input
              autoFocus
              className="code-gate-input"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(false); }}
              onKeyDown={e => { if (e.key === "Enter") submitCodeGate(); }}
              placeholder={t("tuprefCodePlaceholder")}
              aria-label={t("tuprefCodeTitle")}
            />
            {codeError && <p className="code-gate-error">{t("tuprefCodeWrong")}</p>}
            <div className="code-gate-actions">
              <button className="btn" style={{ width: "auto", padding: "10px 20px", marginTop: 0 }} onClick={submitCodeGate}>{t("tuprefCodeValidate")}</button>
              <button className="btn ghost" style={{ width: "auto", padding: "10px 20px", marginTop: 0 }} onClick={() => { setCodeGate(null); setCodeError(false); }}>{t("tuprefCodeCancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Instance CACHÉE de Ferme Vallée (demande 2026-07, révisée) : montée
          hors du Crossfade, indépendamment de la vue visible, tant que
          l'HÔTE est "away" (fermeAway renseigné) — c'est-à-dire qu'il a
          quitté la scène (🎪/Quitter) SANS utiliser "Rassembler tout le
          monde". Ferme Vallée est host-authoritative (simulation, réponse
          aux requêtes des autres joueurs) : si on laissait le composant se
          démonter comme pour un simple invité, le monde s'arrêterait pour
          TOUT LE MONDE dès que l'hôte regarde ailleurs. `display:none`
          suffit à la garder active (les intervalles/effets React tournent
          normalement sur un noeud caché) sans rien afficher. `room` n'a
          besoin que de `room.id` (stable) côté FermeGame — inutile de lui
          repasser l'instantané `fermeAway`. `onFinish` est un no-op : cette
          instance ne doit jamais déclencher elle-même de transition de vue
          (seuls les boutons visibles, rejoinFerme/gatherFerme, le font). */}
      {isHost && fermeAway && room && (
        <div style={{ display: "none" }} aria-hidden="true">
          <FermeGame room={room} me={me} isHost={true} players={players} t={t} lang={lang} onFinish={() => {}} savedCode={fermeCodeRef.current} onCodeLoaded={(c) => { fermeCodeRef.current = c; }} />
        </div>
      )}

      {/* Monté ici (hors Crossfade) pour ne jamais se démonter lors des
          transitions lobby <-> jeu : l'historique de discussion et la
          connexion au canal restent intacts pendant toute la session. */}
      <RoomChat room={room} me={me} t={t} />
    </div>
  );
}
