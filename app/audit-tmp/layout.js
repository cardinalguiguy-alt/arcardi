/* 2026-11-21 — LES PAGES DE TEST N'EXISTENT PAS EN PRODUCTION (docs/PROJETS.md §0, lot 2, point 2 — décidé par Guillaume le
   2026-11-15). En ligne : « page introuvable » ; en local (`next dev`), le harnais reste tel quel (docs/VERIFICATION.md §10).
   Un gabarit SERVEUR autour de la page cliente : la page elle-même n'est pas touchée, et pour défaire il suffit d'effacer ce fichier. */
import { notFound } from "next/navigation";

export default function HorsProduction({ children }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
