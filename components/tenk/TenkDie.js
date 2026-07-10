"use client";

/* ==========================================================================
   TenkDie — dé du jeu 10000 : corps NOIR façon casino nocturne, points
   ("pips") en points lumineux néon rose/magenta, halo en rayons ("burst")
   qui apparaît autour du dé dès qu'il fait partie de la sélection en cours
   (inspiration fournie par le porteur de projet : un vieux site de dés en
   ligne, halo rose en rayons autour du dé quand une combinaison apparaît).

   Les dés de valeur 1 ET 5 sont un cas particulier demandé explicitement :
   ce sont les deux seules valeurs qui rapportent des points seules (100 et
   50 pts), donc les deux faces qu'un joueur doit repérer en un coup d'œil.
   Au lieu du pip classique, on affiche le CHIFFRE ("1" ou "5") en néon
   rose — même traitement lumineux (glow) que les pips, juste un glyphe au
   lieu d'un point, pour les distinguer sans ambiguïté des dés de moindre
   valeur (2, 3, 4, 6) qui eux gardent la grille de pips habituelle.

   Copie volontairement À PART de components/yahtzee/Die.js (même grille de
   points 3×3, mais identité visuelle et logique d'interaction différentes :
   ici un dé peut être "sélectionné" (fait partie du choix en cours, encore
   annulable) OU "mort" (secousse rouge, appartient à une sélection devenue
   invalide) OU simplement cliquable/désactivé selon le tour).
   ========================================================================== */

const PIPS = {
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const DIGIT_FACES = new Set([1, 5]);

export default function TenkDie({ value, selected, dead, rolling, kept, onClick, disabled, ghost, style }) {
  const clickable = !!onClick && !disabled;
  const cls = "tenk-die"
    + (selected ? " selected" : "")
    + (dead ? " dead" : "")
    + (rolling ? " rolling" : "")
    + (kept ? " kept" : "")
    + (clickable ? " clickable" : "")
    + (ghost ? " ghost" : "");

  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      aria-pressed={!!selected}
      aria-label={ghost ? "?" : String(value)}
    >
      <span className="tenk-die-burst" aria-hidden="true" />
      <span className="tenk-die-body">
        {ghost ? (
          <span className="tenk-die-ghost">?</span>
        ) : (
          <span className="tenk-die-face">
            {DIGIT_FACES.has(value) ? (
              <span className="tenk-die-digit" aria-hidden="true">{value}</span>
            ) : (
              [1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                <span key={cell} className={"tenk-pip-cell" + (PIPS[value]?.includes(cell) ? " on" : "")} />
              ))
            )}
          </span>
        )}
      </span>
      {selected && <span className="tenk-die-check" aria-hidden="true">✓</span>}
    </button>
  );
}
