"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLang } from "@/lib/i18n";
import Brand from "@/components/Brand";

// useSearchParams() exige une limite <Suspense> dans l'App Router de
// Next.js (sinon le build échoue) : on isole donc la logique dans un
// composant interne, enveloppé ci-dessous.
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    // Si on est arrivé ici via un lien d'invitation à un salon (redirigé
    // depuis /room/CODE faute de session), on y retourne directement au
    // lieu de systématiquement atterrir dans le lounge.
    const redirect = searchParams.get("redirect");
    router.push(redirect || "/lounge");
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

export default function Login() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">…</p></div>}>
      <LoginInner />
    </Suspense>
  );
}
