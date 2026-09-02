// Pipeline C (§9 de CLAUDE.md) — chargeur/cache pour les sprites PNG
// importés (par opposition au canevas procédural de fermeArt.js). PREMIER
// USAGE : rien n'existait avant l'hôtel de ville de test (2026-09-02).
//
// Chargement asynchrone, mis en cache par URL. Tant qu'une image n'est pas
// prête, `loadBitmap` rend `null` — les appelants doivent tolérer ce cas
// exactement comme `drawCivic` tolère déjà `img` absent (fermeArt.js n'a
// jamais eu à gérer un sprite qui n'existe pas encore : le canevas
// procédural est toujours prêt de suite). Aucune replanification de rendu
// n'est nécessaire : la boucle de jeu tourne déjà en continu
// (`requestAnimationFrame`), donc l'image apparaît d'elle-même dès la frame
// suivant son chargement.
const cache = new Map();

export function loadBitmap(url) {
  let entry = cache.get(url);
  if (entry) return entry.img;
  entry = { img: null };
  cache.set(url, entry);
  if (typeof window === "undefined") return null; // rendu serveur : rien à charger
  const im = new window.Image();
  im.onload = () => { entry.img = im; };
  im.onerror = () => { console.warn("bitmapAssets: introuvable —", url); };
  im.src = url;
  return null;
}
