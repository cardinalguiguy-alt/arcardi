/* ==========================================================================
   petitbacFavorites — "listes favorites" de catégories Petit Bac (demande
   2026-07) : l'hôte peut sauvegarder la liste de catégories qu'il vient de
   valider/personnaliser sur l'écran d'accueil, pour la retrouver et la
   relancer telle quelle lors d'une prochaine partie, sans repasser par un
   tirage aléatoire.

   Stockage volontairement CLIENT (localStorage), comme le reste des
   réglages purement locaux du site (ambiance, etc.) : ce sont des listes
   personnelles de CE navigateur, pas une donnée de salon partagée — aucune
   table Supabase n'est nécessaire. Un hôte qui change d'appareil ne
   retrouve pas ses listes ailleurs ; compromis assumé pour éviter toute
   migration de base pour une fonctionnalité de confort.
   ========================================================================== */

const KEY = "arcardi_pb_favorites_v1";

function safeParse(json) {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export function loadFavorites() {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY) || "[]");
}

// `categories` : liste d'objets {id, icon, fr, en, custom} telle
// qu'affichée/validée sur l'écran d'accueil — sauvegardée telle quelle,
// custom compris (les libellés personnalisés du dernier passage sont
// donc conservés dans la liste favorite).
export function saveFavorite(name, categories) {
  if (typeof window === "undefined") return [];
  const list = loadFavorites();
  const entry = { id: "fav_" + Date.now(), name: (name || "").trim() || "Sans nom", categories, savedAt: Date.now() };
  const next = [entry, ...list].slice(0, 20); // limite raisonnable, pas de collection infinie
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteFavorite(id) {
  if (typeof window === "undefined") return [];
  const next = loadFavorites().filter(f => f.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
