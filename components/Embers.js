"use client";

/* ==========================================================================
   EMBERS — braises décoratives qui montent sur le fond d'écran.
   Purement esthétique, aucune interaction (pointer-events:none).

   Les positions/tailles/durées sont FIXES (pas de Math.random au rendu) :
   indispensable avec Next.js pour que le HTML serveur et le HTML client
   soient identiques (sinon erreur d'hydratation). La variété vient du
   nombre et de la dispersion des valeurs choisies à la main.
   ========================================================================== */

const EMBERS = [
  { left: "4%",  w: 5, c: "#FFB37A", d: "5.2s",  delay: ".2s"  },
  { left: "11%", w: 3, c: "#FF8F6E", d: "7.1s",  delay: "2.8s" },
  { left: "18%", w: 4, c: "#FF9E6E", d: "6.4s",  delay: "1.6s" },
  { left: "26%", w: 6, c: "#FFC98A", d: "5.6s",  delay: "3.4s" },
  { left: "33%", w: 3, c: "#FFB37A", d: "7.8s",  delay: ".9s"  },
  { left: "41%", w: 5, c: "#FF9E6E", d: "6.0s",  delay: "4.1s" },
  { left: "49%", w: 4, c: "#FFD9A8", d: "6.9s",  delay: "2.2s" },
  { left: "57%", w: 3, c: "#FF8F6E", d: "5.4s",  delay: "5.0s" },
  { left: "64%", w: 6, c: "#FFC98A", d: "7.4s",  delay: ".5s"  },
  { left: "72%", w: 4, c: "#FFB37A", d: "5.8s",  delay: "2.4s" },
  { left: "79%", w: 3, c: "#FF9E6E", d: "6.6s",  delay: "3.9s" },
  { left: "86%", w: 5, c: "#FFD9A8", d: "5.0s",  delay: "1.2s" },
  { left: "92%", w: 4, c: "#FF8F6E", d: "7.0s",  delay: ".9s"  },
  { left: "97%", w: 3, c: "#FFC98A", d: "6.2s",  delay: "4.6s" },
];

export default function Embers() {
  return (
    <div className="embers" aria-hidden="true">
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: e.left, width: e.w, height: e.w, background: e.c,
            animationDuration: e.d, animationDelay: e.delay,
          }}
        />
      ))}
    </div>
  );
}
