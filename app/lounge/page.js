"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function Lounge() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(prof);
    })();
  }, [router]);

  async function createRoom() {
    setBusy(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    let code = randomCode();
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({ code, host_id: session.user.id })
      .select()
      .single();

    if (roomErr) { setError("Impossible de créer le salon : " + roomErr.message); setBusy(false); return; }

    const { error: joinErr } = await supabase
      .from("room_players")
      .insert({ room_id: room.id, profile_id: session.user.id });

    if (joinErr) { setError("Salon créé mais impossible d'y entrer : " + joinErr.message); setBusy(false); return; }

    router.push("/room/" + room.code);
  }

  async function joinRoom(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const code = joinCode.trim().toUpperCase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data: room, error: findErr } = await supabase
      .from("rooms").select("*").eq("code", code).single();

    if (findErr || !room) { setError("Aucun salon avec ce code."); setBusy(false); return; }

    const { error: joinErr } = await supabase
      .from("room_players")
      .upsert({ room_id: room.id, profile_id: session.user.id }, { onConflict: "room_id,profile_id" });

    if (joinErr) { setError("Impossible de rejoindre : " + joinErr.message); setBusy(false); return; }

    router.push("/room/" + room.code);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!profile) return <div className="wrap"><p className="muted">Chargement…</p></div>;

  return (
    <div className="wrap">
      <div className="brand" style={{ justifyContent: "space-between" }}>
        <div className="tiles">{"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}</div>
        <button className="btn ghost" style={{ width: "auto", margin: 0, padding: "8px 14px", fontSize: 13 }} onClick={logout}>
          {profile.avatar} {profile.username} · Déconnexion
        </button>
      </div>

      <div className="panel">
        <h1>🎪 Créer une soirée</h1>
        <p className="hint">Tu deviens l'hôte. Un code à 6 caractères sera généré pour que tes amis rejoignent, où qu'ils soient.</p>
        <button className="btn" onClick={createRoom} disabled={busy}>{busy ? "Création…" : "🚀 Créer un salon"}</button>
      </div>

      <div className="panel">
        <h1>🔑 Rejoindre une soirée</h1>
        <p className="hint">Entre le code que ton hôte t'a partagé.</p>
        <form onSubmit={joinRoom}>
          <input
            type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="EX: 7F2K9Q" maxLength={6}
            style={{ textAlign: "center", fontFamily: "'Space Mono'", fontSize: 20, letterSpacing: "0.15em", textTransform: "uppercase" }}
          />
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy || joinCode.trim().length < 4}>{busy ? "Connexion…" : "Rejoindre"}</button>
        </form>
      </div>
    </div>
  );
}
