"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n";
import Brand from "@/components/Brand";
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
import YahtzeeGame from "@/components/yahtzee/YahtzeeGame";

// Métadonnées d'affichage de chaque jeu : icône, couleur d'accent (variable
// CSS existante), et clés i18n pour le nom / la description courte de la
// carte de sélection dans le salon.
const GAME_META = {
  quiz:     { icon: "🧠", accent: "--p2", nameKey: "nameQuiz",    tagKey: "tagQuiz" },
  wordle:   { icon: "🔤", accent: "--p4", nameKey: "nameWordle",  tagKey: "tagWordle" },
  worldle:  { icon: "🌍", accent: "--p5", nameKey: "nameWorldle", tagKey: "tagWorldle" },
  piano:    { icon: "🎹", accent: "--p1", nameKey: "namePiano",   tagKey: "tagPiano" },
  connect4: { icon: "🔴", accent: "--p1", nameKey: "nameC4",      tagKey: "tagC4", minPlayers: 2 },
  ludo:     { icon: "🐴", accent: "--ludoY", nameKey: "nameLudo", tagKey: "tagLudo", minPlayers: 2 },
  echoes:   { icon: "🌊", accent: "--p5", nameKey: "nameEchoes",  tagKey: "tagEchoes", minPlayers: 2 },
  diapason: { icon: "🎼", accent: "--dia", nameKey: "nameDiapason", tagKey: "tagDiapason", minPlayers: 2 },
  chromatik: { icon: "🃏", accent: "--p3", nameKey: "nameChromatik", tagKey: "tagChromatik" },
  yahtzee:  { icon: "🎲", accent: "--p4", nameKey: "nameYahtzee", tagKey: "tagYahtzee" },
};
const GAME_ORDER = ["quiz", "wordle", "worldle", "piano", "connect4", "ludo", "echoes", "diapason", "chromatik", "yahtzee"];

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  async function launch(gameId) {
    await supabase.from("rooms").update({ status: "playing", current_game: gameId }).eq("id", room.id);
  }

  // Retour au lobby DEPUIS n'importe quel moment d'une partie (pas seulement
  // à la fin naturelle) : l'hôte peut ramener tout le monde au salon sans
  // que personne n'ait à quitter la room elle-même.
  async function backToLobby() {
    await supabase.from("rooms").update({ status: "lobby", current_game: null, game_state: null }).eq("id", room.id);
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
  const meta = playing ? GAME_META[room.current_game] : null;
  // Clé de vue : change dès qu'on bascule lobby <-> scène, ou de jeu à jeu.
  // C'est ce qui déclenche le fondu enchaîné dans <Crossfade>.
  const viewKey = playing ? "stage-" + room.current_game : "lobby";

  return (
    <div className="wrap wrap-room">
      <Brand lang={lang} setLang={setLang} t={t} right={
        <button className="btn ghost" style={{ width: "auto", margin: 0, padding: "8px 14px", fontSize: 13 }} onClick={leaveRoom}>
          {t("leaveRoom")}
        </button>
      } />

      {playing && (
        // Le code du salon reste consultable, mais discret : une pastille
        // fixée en haut à droite de l'écran, hors du flux, qui ne prend
        // pas de place au-dessus du jeu (priorité : jouabilité).
        <div className="room-code-fab">
          <span className="dot" />
          {room.code}
        </div>
      )}

      <Crossfade id={viewKey} duration={480}>
        {playing ? (
          // ===== MODE SCÈNE : le jeu en cours prend toute la priorité =====
          <div style={meta ? { "--accent": `var(${meta.accent})` } : undefined}>
            <div className="stage-bar">
              <div className="stage-bar-scores">
                {players.map(p => (
                  <span className={"mini-chip" + (p.profile_id === me.id ? " me" : "")} key={p.id}>
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
              {room.current_game === "quiz" && (
                <QuizGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "piano" && (
                <PianoEscape room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "wordle" && (
                <WordGuess room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "worldle" && (
                <Worldle room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "connect4" && (
                <ConnectFour room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "ludo" && (
                <PetitsChevaux room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "echoes" && (
                <EchoesRoom room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "diapason" && (
                <DiapasonGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "chromatik" && (
                <ChromatikGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
              {room.current_game === "yahtzee" && (
                <YahtzeeGame room={room} me={me} isHost={isHost} players={players} t={t} lang={lang} onFinish={() => {}} />
              )}
            </div>
          </div>
        ) : (
          // ===== MODE LOBBY : infos du salon + sélection du prochain jeu =====
          <div className="panel" style={{ maxWidth: "min(760px, 94vw)" }}>
            <h1>{isHost ? t("roomTitleHost") : t("roomTitle")}</h1>
            <p className="hint">{t("shareCode")}</p>
            <div className="code-badge">{room.code}</div>
            <button className="btn ghost" style={{ marginTop: 0 }} onClick={copyInviteLink}>
              {copied ? "✅ " + t("linkCopied") : "🔗 " + t("copyInviteLink")}
            </button>
            <p className="muted">{players.length} {t("players")} — {t("scoreLive")} :</p>
            <div style={{ marginTop: 10 }}>
              {players.map(p => (
                <div className="player-chip" key={p.id}>
                  <span style={{ fontSize: 20 }}>{p.profiles?.avatar}</span>
                  <span>{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
                  <span className="pt">{p.score} {t("pts")}</span>
                </div>
              ))}
            </div>

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
                        onClick={() => { if (!disabled) launch(id); }}
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
