"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n";
import Brand from "@/components/Brand";
import QuizGame from "@/components/QuizGame";
import PianoEscape from "@/components/PianoEscape";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let roomSub, playersSub;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(prof);

      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms").select("*").eq("code", String(code).toUpperCase()).single();
      if (roomErr || !roomRow) { setError(t("noRoom")); return; }
      setRoom(roomRow);

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

  async function leaveRoom() {
    if (me && room) await supabase.from("room_players").delete().eq("room_id", room.id).eq("profile_id", me.id);
    router.push("/lounge");
  }

  if (error) return <div className="wrap"><div className="panel"><h1>😕</h1><p className="hint">{error}</p></div></div>;
  if (!room || !me) return <div className="wrap"><p className="muted">…</p></div>;

  const isHost = room.host_id === me.id;
  const playing = room.status === "playing";

  return (
    <div className="wrap">
      <Brand lang={lang} setLang={setLang} t={t} right={
        <button className="btn ghost" style={{ width: "auto", margin: 0, padding: "8px 14px", fontSize: 13 }} onClick={leaveRoom}>
          {t("leaveRoom")}
        </button>
      } />

      <div className="panel">
        <h1>{isHost ? t("roomTitleHost") : t("roomTitle")}</h1>
        <p className="hint">{t("shareCode")}</p>
        <div className="code-badge">{room.code}</div>
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

        {!playing && isHost && (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <button className="btn" onClick={() => launch("quiz")}>{t("launchQuiz")}</button>
            <button className="btn" style={{ background: "linear-gradient(135deg, var(--p5), var(--p2))" }} onClick={() => launch("piano")}>{t("launchPiano")}</button>
          </div>
        )}
        {!playing && !isHost && <p className="muted" style={{ marginTop: 16 }}>{t("waitHost")}</p>}
      </div>

      {playing && room.current_game === "quiz" && (
        <QuizGame room={room} me={me} isHost={isHost} t={t} lang={lang} onFinish={() => {}} />
      )}
      {playing && room.current_game === "piano" && (
        <PianoEscape room={room} me={me} isHost={isHost} t={t} lang={lang} onFinish={() => {}} />
      )}
    </div>
  );
}
