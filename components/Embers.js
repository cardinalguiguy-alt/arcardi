"use client";

/* ==========================================================================
   EMBERS — bulles décoratives qui montent sur le fond d'écran, façon
   BULLES DE CHAMPAGNE sur la paroi d'un verre. Purement esthétique,
   aucune interaction (pointer-events:none).

   Physique imitée (modèle champagne) :
   - chaque bulle naît sur un "site de nucléation" fixe (left) et remonte
     en ACCÉLÉRANT (ease-in sur la montée) ;
   - elle GROSSIT en montant (le gaz se dilate) : scale dans emberRise ;
   - elle OSCILLE latéralement pendant la montée (zigzag doux, jamais une
     trajectoire parfaitement verticale) : animation emberSway séparée sur
     un élément interne, avec sa propre période et sa propre amplitude —
     les deux mouvements composés donnent la trajectoire sinueuse ;
   - petit reflet lumineux en haut de bulle (radial-gradient).

   Les positions/tailles/durées/amplitudes sont FIXES (pas de Math.random
   au rendu) : indispensable avec Next.js pour que le HTML serveur et le
   HTML client soient identiques (sinon erreur d'hydratation). La variété
   vient de la dispersion des valeurs choisies à la main : périodes de
   montée ET d'oscillation toutes différentes, donc aucun motif répétitif
   perceptible.
   ========================================================================== */

const EMBERS = [
  // left = site de nucléation ; w = taille ; d/delay = montée ; sway =
  // amplitude latérale (px) ; sd = période d'oscillation.
  { left: "4%",  w: 5, c: "#FFB37A", d: "6.6s", delay: ".2s",  sway: 5, sd: ".9s"  },
  { left: "11%", w: 3, c: "#FF8F6E", d: "9.2s", delay: "2.8s", sway: 4, sd: "1.2s" },
  { left: "18%", w: 4, c: "#FF9E6E", d: "8.3s", delay: "1.6s", sway: 6, sd: ".8s"  },
  { left: "26%", w: 6, c: "#FFC98A", d: "7.2s", delay: "3.4s", sway: 5, sd: "1.1s" },
  { left: "33%", w: 3, c: "#FFB37A", d: "10.1s", delay: ".9s",  sway: 7, sd: "1.3s" },
  { left: "41%", w: 5, c: "#FF9E6E", d: "7.7s", delay: "4.1s", sway: 4, sd: ".7s"  },
  { left: "49%", w: 4, c: "#FFD9A8", d: "8.9s", delay: "2.2s", sway: 6, sd: "1.0s" },
  { left: "57%", w: 3, c: "#FF8F6E", d: "7.0s", delay: "5.0s", sway: 5, sd: "1.25s"},
  { left: "64%", w: 6, c: "#FFC98A", d: "9.6s", delay: ".5s",  sway: 4, sd: ".85s" },
  { left: "72%", w: 4, c: "#FFB37A", d: "7.5s", delay: "2.4s", sway: 7, sd: "1.15s"},
  { left: "79%", w: 3, c: "#FF9E6E", d: "8.5s", delay: "3.9s", sway: 5, sd: ".95s" },
  { left: "86%", w: 5, c: "#FFD9A8", d: "6.5s", delay: "1.2s", sway: 6, sd: "1.05s"},
  { left: "92%", w: 4, c: "#FF8F6E", d: "9.0s", delay: ".9s",  sway: 4, sd: "1.35s"},
  { left: "97%", w: 3, c: "#FFC98A", d: "8.0s", delay: "4.6s", sway: 5, sd: ".75s" },
];

export default function Embers() {
  return (
    <div className="embers" aria-hidden="true">
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: e.left, width: e.w, height: e.w,
            animationDuration: e.d, animationDelay: e.delay,
          }}
        >
          <i
            className="ember-dot"
            style={{
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85) 0%, ${e.c} 45%, ${e.c} 100%)`,
              boxShadow: `0 0 ${e.w + 2}px ${e.c}55`,
              "--sway": e.sway + "px",
              animationDuration: e.sd,
              animationDelay: e.delay,
            }}
          />
        </span>
      ))}
    </div>
  );
}
