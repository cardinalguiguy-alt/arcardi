"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n";
import Brand from "@/components/Brand";
import Embers from "@/components/Embers";

const AVATARS = ["🦊", "🐙", "🦖", "🐸", "🦄", "🐼", "🤖", "👾", "🐯", "🦉"];

export default function Signup() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
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
      <Embers />
        <Brand lang={lang} setLang={setLang} t={t} onHome={() => router.push("/")} />
        <div className="panel">
          <h1>{t("checkEmail")}</h1>
          <p className="hint">{t("checkEmailHint")} <b>{email}</b>. {t("checkEmailHint2")}</p>
          <Link className="btn" href="/login">{t("goLogin")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Embers />
      <Brand lang={lang} setLang={setLang} t={t} onHome={() => router.push("/")} />
      <div className="panel">
        <h1>{t("signup")}</h1>
        <p className="hint">{t("signupHint")}</p>
        <form onSubmit={handleSignup}>
          <label>{t("username")}</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} maxLength={20} required />

          <label>{t("avatar")}</label>
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

          <label>{t("email")}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

          <label>{t("password")}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />

          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={loading}>{loading ? "…" : t("signupBtn")}</button>
        </form>
        <p className="switch-line">{t("hasAccount")} <Link href="/login">{t("login")}</Link></p>
      </div>
    </div>
  );
}
