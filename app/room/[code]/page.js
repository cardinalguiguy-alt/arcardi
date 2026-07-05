"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QuizGame from "@/components/QuizGame";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const channelRef = useRef(null);

  useEffect(() => {
    let roomSub, playersSub;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(prof);

      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms").select("*").eq("code", String(code).toUpperCase()).single();
      if (roomErr || !roomRow) { setError("Ce salon n'existe pas ou plus."); return; }
      setRoom(roomRow);

      await loadPlayers(roomRow.id);

      // Live : changements sur les joueurs du salon (scores, arrivées, départs)
      playersSub = supabase
        .channel("room_players_" + roomRow.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomRow.id}` },
          () => loadPlayers(roomRow.id))
        .subscribe();

      // Live : changements sur le salon lui-même (jeu en cours, statut)
      roomSub = supabase
        .channel("room_" + roomRow.id)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomRow.id}` },
          payload => setRoom(payload.new))
        .subscribe();
    })();

    return () => {
      if (roomSub) supabase.removeChannel(roomSub);
      if (playersSub) supabase.removeChannel(playersSub);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [code, router]);

  async function loadPlayers(roomId) {
    const { data } = await supabase
      .from("room_players")
      .select("id, score, profile_id, profiles(username, avatar)")
      .eq("room_id", roomId)
      .order("score", { ascending: false });
    setPlayers(data || []);
  }

  async function startQuiz() {
    await supabase.from("rooms").update({ status: "playing", current_game: "quiz" }).eq("id", room.id);
  }

  async function backToLounge() {
    await supabase.from("rooms").update({ status: "lobby", current_game: null }).eq("id", room.id);
  }

  async function leaveRoom() {
    if (me && room) await supabase.from("room_players").delete().eq("room_id", room.id).eq("profile_id", me.id);
    router.push("/lounge");
  }

  if (error) return <div className="wrap"><div className="panel"><h1>😕 Oups</h1><p className="hint">{error}</p></div></div>;
  if (!room || !me) return <div className="wrap"><p className="muted">Chargement du salon…</p></div>;

  const isHost = room.host_id === me.id;

  return (
    <div className="wrap">
      <div className="brand" style={{ justifyContent: "space-between" }}>
        <div className="tiles">{"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}</div>
        <button className="btn ghost" style={{ width: "auto", margin: 0, padding: "8px 14px", fontSize: 13 }} onClick={leaveRoom}>
          Quitter le salon
        </button>
      </div>

      <div className="panel">
        <h1>🎪 Salon de {isHost ? "vous (hôte)" : "la soirée"}</h1>
        <p className="hint">Partage ce code à tes amis, où qu'ils soient dans le monde :</p>
        <div className="code-badge">{room.code}</div>
        <p className="muted">{players.length} joueur{players.length > 1 ? "s" : ""} connecté{players.length > 1 ? "s" : ""}</p>
        <div style={{ marginTop: 14 }}>
          {players.map(p => (
            <div className="player-chip" key={p.id}>
              <span style={{ fontSize: 20 }}>{p.profiles?.avatar}</span>
              <span>{p.profiles?.username}{p.profile_id === room.host_id ? " 👑" : ""}</span>
              <span className="pt">{p.score} pts</span>
            </div>
          ))}
        </div>

        {room.status === "lobby" && isHost && (
          <button className="btn" onClick={startQuiz} style={{ marginTop: 16 }}>🧠 Lancer le Quiz Éclair</button>
        )}
        {room.status === "lobby" && !isHost && (
          <p className="muted" style={{ marginTop: 16 }}>En attente que l'hôte lance un jeu…</p>
        )}
      </div>

      {room.status === "playing" && room.current_game === "quiz" && (
        <QuizGame room={room} me={me} isHost={isHost} onFinish={backToLounge} />
      )}
    </div>
  );
}
