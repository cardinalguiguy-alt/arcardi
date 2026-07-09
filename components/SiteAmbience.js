"use client";
import { useEffect } from "react";
import { initAmbience } from "@/lib/ambience";

// Ne rend rien à l'écran : démarre juste l'ambiance sonore du site (voir
// lib/ambience.js). Monté une seule fois dans le layout racine, qui ne se
// remonte jamais lors d'une navigation interne Next.js — seule une
// actualisation complète de la page relance le cycle depuis le début.
export default function SiteAmbience() {
  useEffect(() => {
    initAmbience();
  }, []);
  return null;
}
