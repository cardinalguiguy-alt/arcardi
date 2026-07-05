"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const AVATARS = ["🦊", "🐙", "🦖", "🐸", "🦄", "🐼", "🤖", "👾", "🐯", "🦉"];

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username || email.split("@")[0], avatar } }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="wrap">
        <div className="panel">
          <h1>📬 Vérifie tes emails</h1>
          <p className="hint">
            On a envoyé un lien de confirmation à <b>{email}</b>. Clique dessus pour activer ton compte,
            puis reviens te connecter.
          </p>
          <Link className="btn" href="/login">Aller à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="brand">
        <div className="tiles">{"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}</div>
      </div>
      <div className="panel">
        <h1>Créer un compte</h1>
        <p className="hint">Un compte par joueur — vos scores et records vous suivront à chaque soirée.</p>
        <form onSubmit={handleSignup}>
          <label>Pseudo</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ton pseudo" maxLength={20} required />

          <label>Avatar</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {AVATARS.map(a => (
              <button type="button" key={a} onClick={() => setAvatar(a)}
                style={{
                  fontSize: 22, padding: "8px 10px", borderRadius: 10,
                  border: a === avatar ? "2px solid var(--p2)" : "2px solid var(--line)",
                  background: a === avatar ? "rgba(62,219,240,.15)" : "rgba(255,255,255,.04)"
                }}>{a}</button>
            ))}
          </div>

          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

          <label>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />

          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={loading}>{loading ? "Création…" : "🚀 Créer mon compte"}</button>
        </form>
        <p className="switch-line">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
      </div>
    </div>
  );
}
