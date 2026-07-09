"use client";
import { useEffect, useState } from "react";
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
import ChromatikGame from "@/components/cards/ChromatikGame";
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
  chromatik: { icon: "🃏", accent: "--acc-chromatik", nameKey: "nameChromatik", tagKey: "tagChromatik", stage: "door" },
  yahtzee:  { icon: "🎲", accent: "--acc-yahtzee",   nameKey: "nameYahtzee", tagKey: "tagYahtzee", stage: "door" },
  president: { icon: "🎩", accent: "--acc-president", nameKey: "namePresident", tagKey: "tagPresident", stage: "door" },
  tenk:      { icon: "🎰", accent: "--acc-tenk",      nameKey: "nameTenk",    tagKey: "tagTenk", stage: "door" },
  petitbac: { icon: "✏️", accent: "--acc-petitbac", nameKey: "namePetitBac", tagKey: "tagPetitBac", minPlayers: 2, stage: "flash" },
};
const STAGE_COMPONENT = { door: DoorStage, curtain: CurtainStage, flash: FlashStage, video: VideoStage };
const GAME_ORDER = ["quiz", "wordle", "worldle", "petitbac", "connect4", "ludo", "chromatik", "president", "yahtzee", "tenk", "piano", "echoes", "diapason"];

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
  const [hostGone, setHostGone] = useState(false);
  // La colonne rooms.game_state existe-t-elle ? (migration upgrade-002.sql)
  const [hasGameStateCol, setHasGameStateCol] = useState(true);

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
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const map = {};
      Object.keys(state).forEach(k => { map[k] = true; });
      setOnline(map);
    });
    ch.subscribe(status => {
      if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, me?.id]);

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
        <button className="btn ghost" style={{ width: "auto", margin: 0, padding: "8px 14px", fontSize: 13 }} onClick={leaveRoom}>
          {t("leaveRoom")}
        </button>
      } />

      {playing && (
        // Le code du salon reste consultable, mais discret : une pastille
        // fixée en bas à gauche de l'écran, hors du flux, qui ne prend
        // pas de place au-dessus du jeu (priorité : jouabilité).
        <div className="room-code-fab">
          <span className="dot" />
          {room.code}
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
              {isHost && (
                <button className="btn ghost stage-bar-lobby-btn" onClick={backToLobby} title={t("backToLobbyAnytime")}>
                  {t("backLounge")}
                </button>
              )}
            </div>

            <div className="game-stage">
              {meta && (() => {
                const StageComponent = STAGE_COMPONENT[meta.stage] || DoorStage;
                return (
                <StageComponent gameId={room.current_game} icon={meta.icon} name={t(meta.nameKey)} accentVar={meta.accent} lang={lang} t={t}>
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
                  {room.current_game === "chromatik" && (
                    <ChromatikGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={handleGameFinish} />
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
