"use client";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Ne bloque pas le build, mais avertit clairement en dev/prod si l'env manque.
  console.warn(
    "⚠️ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants. " +
    "Vérifie ton fichier .env.local (en local) ou les variables d'environnement Vercel (en prod)."
  );
}

// createClient() throws immediately if the URL is missing/invalid. Since this
// file runs during the Vercel build (prerendering), a missing env var would
// crash the whole build instead of just breaking the features that need it.
// Fall back to harmless placeholders so the build always succeeds.
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});
