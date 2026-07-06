// Les 4 symboles utilisés pour les cadrans/plaques du Prologue. Volontairement
// construits en formes géométriques primitives (voir Symbol3D.js) — pas
// d'assets externes nécessaires pour cette v1. Remplaçable plus tard sans
// toucher à la logique de puzzle (puzzle.js ne connaît que ces 4 identifiants).
export const SYMBOLS = ["note", "rest", "sharp", "fermata"];

// Teinte de matière par symbole (utilisée à la fois par les cadrans 3D et,
// en cas de besoin futur, par l'UI HTML).
export const SYMBOL_COLORS = {
  note: "#e8e2d0",
  rest: "#9aa3b5",
  sharp: "#e0a458",
  fermata: "#b79ce0",
};
