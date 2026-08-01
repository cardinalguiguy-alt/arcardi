/* =============================================================================
   levels.js — Les quinze niveaux (zip 385, refondus au zip 387).
   -----------------------------------------------------------------------------
   Données pures : aucune logique, aucun DOM. Repère fixe 800 x 600 (CFG.W/H),
   origine en haut à gauche, y vers le bas — le repère du canvas, pour qu'un
   niveau se lise à la même place qu'il se dessine.

   CHAQUE NIVEAU EST VÉRIFIÉ RÉSOLUBLE PAR LA MACHINE. `node tools/verify-
   levels.js` rejoue la vraie physique (js/physics.js, chargé tel quel) et
   cherche une suite d'actions — coupes, éclatements, souffles — qui gagne. Un
   niveau injouable ne peut donc pas partir en production « parce qu'on croyait
   qu'il passait ».

   VOCABULAIRE
     ropes   : { x, y, len }               ancre fixe et longueur
               + move: { ax, ay, speed, phase }     va-et-vient sinusoïdal
               + spin: { cx, cy, r, speed, phase }  révolution
               + auto: true, reach: <px>           ZIP 387 : corde AUTOMATIQUE,
                 non accrochée au départ, qui happe le bonbon au passage
     pins    : ZIP 387 — { x, y, r } points d'ENROULEMENT. La corde s'enroule
               autour, se raccourcit, et le bonbon accélère
     spiders : ZIP 387 — { rope, speed, start } descend la corde vers le
               bonbon ; couper la corde l'emporte, sinon c'est perdu
     blow    : ZIP 387 — true si le SOUFFLE est actif sur ce niveau
     stars   : sprinkles dorés, facultatifs — mais ils font les étoiles du
               niveau depuis le 387 (voir la carte des niveaux)
     spikes  : bonbons acidulés — contact = perdu
     bumpers : coussins de guimauve — rebond élastique
     bubbles : bulles de sucre — portent vers le haut, un clic crève
     fans    : souffleurs — rectangle qui pousse (dx, dy), `power` en option
     mouth   : la bouche du Gourmandin (le monstre est dessiné autour)

   PROGRESSION : un mécanisme neuf est TOUJOURS introduit seul, dans un niveau
   facile, avant d'être combiné. Épingle au 5, corde automatique au 7, bulle au
   8, araignée au 11, souffle au 13. Guillaume juge sur captures : un mécanisme
   qu'on découvre au milieu d'un niveau difficile est un mécanisme qu'on croit
   cassé.
   ========================================================================== */

const LEVELS = [
  /* 1 — Tutoriel. Une corde, la bouche juste dessous. */
  {
    n: 1,
    candy: { x: 400, y: 180 },
    mouth: { x: 400, y: 470, r: 36 },
    ropes: [{ x: 400, y: 90, len: 90 }],
    stars: [{ x: 400, y: 280 }, { x: 400, y: 340 }, { x: 400, y: 400 }],
  },

  /* 2 — Deux cordes. Un geste horizontal les tranche toutes les deux. */
  {
    n: 2,
    candy: { x: 400, y: 220 },
    mouth: { x: 400, y: 500, r: 36 },
    ropes: [{ x: 300, y: 100, len: 156 }, { x: 500, y: 100, len: 156 }],
    stars: [{ x: 400, y: 310 }, { x: 400, y: 370 }, { x: 400, y: 430 }],
  },

  /* 3 — Le balancier. Lâcher au bas de la course, quand toute la hauteur
     perdue est devenue de la vitesse. */
  {
    n: 3,
    candy: { x: 163, y: 110 },
    mouth: { x: 620, y: 470, r: 38 },
    ropes: [{ x: 280, y: 110, len: 117 }],
    stars: [{ x: 300, y: 250 }, { x: 420, y: 300 }, { x: 530, y: 380 }],
  },

  /* 4 — Deux ancres, un acidulé sur la route directe. */
  {
    n: 4,
    candy: { x: 300, y: 230 },
    mouth: { x: 560, y: 470, r: 38 },
    ropes: [{ x: 250, y: 110, len: 130 }, { x: 420, y: 140, len: 150 }],
    spikes: [{ x: 430, y: 340, r: 16 }],
    stars: [{ x: 350, y: 250 }, { x: 480, y: 270 }, { x: 560, y: 380 }],
  },

  /* 5 — L'ÉPINGLE (zip 387). La corde s'enroule autour, le rayon diminue, le
     bonbon accélère : c'est un fouet. Seule nouveauté du niveau, exprès. */
  {
    n: 5,
    candy: { x: 150, y: 150 },
    mouth: { x: 620, y: 470, r: 40 },
    ropes: [{ x: 250, y: 100, len: 112 }],
    pins: [{ x: 330, y: 175, r: 10 }],
    stars: [{ x: 330, y: 280 }, { x: 460, y: 330 }, { x: 570, y: 400 }],
  },

  /* 6 — Le coussin de guimauve : il rend de la hauteur. */
  {
    n: 6,
    candy: { x: 90, y: 90 },
    mouth: { x: 650, y: 520, r: 38 },
    ropes: [{ x: 200, y: 90, len: 110 }],
    bumpers: [{ x: 430, y: 420, r: 38 }],
    stars: [{ x: 250, y: 220 }, { x: 360, y: 300 }, { x: 560, y: 400 }],
  },

  /* 7 — LA CORDE AUTOMATIQUE (zip 387). Elle n'est accrochée à rien : elle
     happe le bonbon quand il passe à portée, et il repart en balançant. Rien
     à faire pour la déclencher — juste à comprendre qu'elle existe. */
  {
    n: 7,
    // Géométrie trouvée par BALAYAGE, pas à l'œil : la première version
    // sortait à 0,07 % des essais parce qu'elle enchaînait deux fenêtres
    // étroites (lâcher au bon moment, puis relâcher au bon moment sur une
    // corde courte et rapide). Ancre haute et portée large : la corde happe
    // tôt, la course est ample, et la fenêtre de sortie devient confortable.
    candy: { x: 150, y: 140 },
    mouth: { x: 560, y: 520, r: 46 },
    ropes: [
      { x: 250, y: 100, len: 108 },
      { x: 400, y: 200, len: 120, auto: true, reach: 100 },
    ],
    stars: [{ x: 300, y: 240 }, { x: 430, y: 330 }, { x: 540, y: 430 }],
  },

  /* 8 — La bulle, seule et sans piège. Elle porte vers le haut ; la bouche est
     au-dessus. Rien d'autre à comprendre, c'est le but. */
  {
    n: 8,
    candy: { x: 160, y: 430 },
    mouth: { x: 160, y: 140, r: 40 },
    ropes: [{ x: 160, y: 350, len: 80 }],
    bubbles: [{ x: 160, y: 430, r: 40 }],
    stars: [{ x: 160, y: 350 }, { x: 160, y: 280 }, { x: 160, y: 210 }],
  },

  /* 9 — Bulle + souffleur. On monte, on se laisse pousser, on crève au bon
     moment. Les acidulés de droite punissent celui qui pousse trop loin. */
  {
    n: 9,
    candy: { x: 120, y: 520 },
    mouth: { x: 430, y: 150, r: 40 },
    ropes: [{ x: 120, y: 450, len: 70 }],
    bubbles: [{ x: 120, y: 520, r: 40 }],
    fans: [{ x: 60, y: 120, w: 600, h: 430, dx: 1, dy: 0, power: 0.7 }],
    spikes: [{ x: 620, y: 220, r: 18 }, { x: 620, y: 290, r: 18 }],
    stars: [{ x: 200, y: 400 }, { x: 300, y: 300 }, { x: 390, y: 210 }],
  },

  /* 10 — NIVEAU DU TRÉSOR (10 000 or). Épingle ET corde automatique, les deux
     nouveautés déjà vues séparément, pour la première fois ensemble. */
  {
    n: 10,
    candy: { x: 290, y: 150 },
    mouth: { x: 700, y: 520, r: 40 },
    ropes: [
      { x: 400, y: 110, len: 117 },
      { x: 600, y: 330, len: 130, auto: true, reach: 80 },
    ],
    pins: [{ x: 450, y: 190, r: 10 }],
    spikes: [{ x: 520, y: 430, r: 18 }],
    stars: [{ x: 460, y: 260 }, { x: 600, y: 320 }, { x: 690, y: 430 }],
  },

  /* 11 — L'ARAIGNÉE (zip 387). Elle descend la corde vers le bonbon : couper
     l'emporte, la laisser arriver c'est perdu. Le niveau ne demande rien
     d'autre qu'un balancier — mais il le demande AVANT la fin du compte. */
  {
    n: 11,
    candy: { x: 285, y: 120 },
    mouth: { x: 620, y: 470, r: 40 },
    ropes: [{ x: 400, y: 120, len: 115 }],
    spiders: [{ rope: 0, speed: 0.42 }],
    stars: [{ x: 420, y: 260 }, { x: 520, y: 330 }, { x: 610, y: 400 }],
  },

  /* 12 — Ancre tournante + araignée. Le bonbon est fouetté, la fenêtre de
     coupe est courte, et quelque chose descend pendant qu'on attend. */
  {
    n: 12,
    candy: { x: 400, y: 340 },
    mouth: { x: 620, y: 520, r: 40 },
    ropes: [{ x: 400, y: 220, len: 150, spin: { cx: 400, cy: 220, r: 90, speed: 2.2, phase: 0 } }],
    spiders: [{ rope: 0, speed: 0.22 }],
    spikes: [{ x: 400, y: 490, r: 20 }],
    stars: [{ x: 500, y: 380 }, { x: 560, y: 440 }, { x: 620, y: 470 }],
  },

  /* 13 — LE SOUFFLE (zip 387). La chute droite tombe dans les acidulés : il
     FAUT pousser le bonbon en vol. Un coup sec de la souris (ou du doigt) près
     du bonbon, dans la direction voulue. Seul niveau où le souffle est
     obligatoire — ailleurs il aide, ici il décide. */
  {
    n: 13,
    blow: true,
    candy: { x: 300, y: 200 },
    mouth: { x: 560, y: 470, r: 44 },
    ropes: [{ x: 300, y: 110, len: 90 }],
    spikes: [{ x: 300, y: 430, r: 18 }, { x: 300, y: 490, r: 18 }, { x: 300, y: 550, r: 18 }],
    stars: [{ x: 380, y: 300 }, { x: 460, y: 370 }, { x: 540, y: 420 }],
  },

  /* 14 — Souffle + bulle + coussin. Trois façons de déplacer un bonbon qui ne
     tombe pas droit, et il faut les trois. */
  {
    n: 14,
    blow: true,
    candy: { x: 140, y: 420 },
    mouth: { x: 700, y: 520, r: 42 },
    ropes: [{ x: 140, y: 350, len: 70 }],
    bubbles: [{ x: 140, y: 420, r: 40 }],
    fans: [{ x: 60, y: 150, w: 520, h: 420, dx: 1, dy: 0, power: 0.55 }],
    bumpers: [{ x: 490, y: 440, r: 54 }],
    spikes: [{ x: 330, y: 560, r: 18 }],
    stars: [{ x: 250, y: 330 }, { x: 400, y: 260 }, { x: 620, y: 430 }],
  },

  /* 15 — FINALE (chat berlingot). Épingle, corde automatique et araignée,
     au-dessus d'un entonnoir d'acidulés. Tout ce que le jeu a appris, en une
     fois, avec un compte à rebours qui descend le long de la corde. */
  {
    n: 15,
    candy: { x: 270, y: 160 },
    mouth: { x: 400, y: 545, r: 34 },
    ropes: [
      { x: 380, y: 120, len: 117 },
      { x: 430, y: 330, len: 120, auto: true, reach: 76 },
    ],
    pins: [{ x: 440, y: 200, r: 10 }],
    spiders: [{ rope: 0, speed: 0.30 }],
    spikes: [
      { x: 300, y: 470, r: 18 }, { x: 500, y: 470, r: 18 },
      { x: 280, y: 530, r: 18 }, { x: 520, y: 530, r: 18 },
    ],
    stars: [{ x: 400, y: 300 }, { x: 400, y: 380 }, { x: 400, y: 450 }],
  },
];

if (typeof module !== "undefined" && module.exports) module.exports = LEVELS;
