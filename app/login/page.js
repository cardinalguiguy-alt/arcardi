"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/lounge");
  }

  return (
    <div className="wrap">
      <div className="brand">
        <div className="tiles">{"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}</div>
      </div>
      <div className="panel">
        <h1>Connexion</h1>
        <p className="hint">Retrouve tes soirées, tes points et tes records.</p>
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
        </form>
        <p className="switch-line">Pas encore de compte ? <Link href="/signup">Créer un compte</Link></p>
      </div>
    </div>
  );
}
