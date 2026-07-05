"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n";
import Brand from "@/components/Brand";

export default function Login() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
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
      <Brand lang={lang} setLang={setLang} t={t} />
      <div className="panel">
        <h1>{t("login")}</h1>
        <p className="hint">{t("loginHint")}</p>
        <form onSubmit={handleLogin}>
          <label>{t("email")}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>{t("password")}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={loading}>{loading ? "…" : t("loginBtn")}</button>
        </form>
        <p className="switch-line">{t("noAccount")} <Link href="/signup">{t("signup")}</Link></p>
      </div>
    </div>
  );
}
