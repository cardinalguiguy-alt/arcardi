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

// Épreuve 2 "L'Accord" — trois intervalles nettement distincts à l'oreille.
// La note fondamentale et le nombre de demi-tons servent à synthétiser les
// deux sons (Web Audio) : freq = base × 2^(demi-tons/12).
export const INTERVALS = ["third", "fifth", "octave"];
export const INTERVAL_SEMITONES = { third: 4, fifth: 7, octave: 12 };
export const INTERVAL_BASE_HZ = 220; // La3

// Nombre de "cordes" (vies) partagées : chaque mauvaise tentative en casse
// une. À zéro, l'instrument est brisé — la partie est perdue (on peut la
// relancer). Empêche d'enchaîner les essais au hasard sur les cadrans.
export const MAX_CORDES = 3;
