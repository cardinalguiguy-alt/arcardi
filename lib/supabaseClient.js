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

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});
