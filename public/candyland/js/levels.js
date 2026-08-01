/* =============================================================================
   levels.js — Les quinze niveaux (zip 385).
   -----------------------------------------------------------------------------
   Données pures : aucune logique, aucun DOM. Repère fixe 800 x 600 (CFG.W/H),
   origine en haut à gauche, y vers le bas — le repère du canvas, pour qu'un
   niveau se lise à la même place qu'il se dessine.

   CHAQUE NIVEAU EST VÉRIFIÉ RÉSOLUBLE PAR LA MACHINE. `node tools/verify-
   levels.js` rejoue la vraie physique (js/physics.js, chargé tel quel) et
   cherche une suite de coupes qui gagne. Un niveau injouable ne peut donc pas
   partir en production « parce qu'on croyait qu'il passait » — c'est le même
   raisonnement que verify-fairness.js pour la piste du défi de fuite.

   VOCABULAIRE
     ropes   : { x, y, len }              ancre fixe et longueur de corde
               + move: { ax, ay, speed, phase }   va-et-vient sinusoïdal
               + spin: { cx, cy, r, speed, phase } révolution autour d'un point
     stars   : sprinkles dorés, FACULTATIFS (ils ne débloquent rien)
     spikes  : bonbons acidulés — contact = perdu
     bumpers : coussins de guimauve — rebond élastique
     bubbles : bulles de sucre — portent le bonbon vers le haut, un clic crève
     fans    : souffleurs de sucre glace — rectangle qui pousse (dx, dy)
     mouth   : la bouche du Gourmandin (le monstre est dessiné autour)

   PROGRESSION VOULUE : un mécanisme neuf est TOUJOURS introduit seul, dans un
   niveau facile, avant d'être combiné. Le niveau 8 n'a qu'une bulle et rien
   d'autre ; le 9 y ajoute le souffleur ; le 11 le coussin. Guillaume juge sur
   captures : un mécanisme qu'on découvre au milieu d'un niveau difficile est
   un mécanisme qu'on croit cassé.
   ========================================================================== */

const LEVELS = [
  /* 1 — Tutoriel. Une corde, la bouche juste dessous. On coupe, ça tombe. */
  {
    n: 1,
    candy: { x: 400, y: 180 },
    mouth: { x: 400, y: 470, r: 36 },
    ropes: [{ x: 400, y: 90, len: 90 }],
    stars: [{ x: 400, y: 280 }, { x: 400, y: 340 }, { x: 400, y: 400 }],
  },

  /* 2 — Deux cordes. Un seul geste horizontal les tranche toutes les deux ;
     les couper l'une après l'autre marche aussi, en balançant. */
  {
    n: 2,
    candy: { x: 400, y: 220 },
    mouth: { x: 400, y: 500, r: 36 },
    ropes: [{ x: 300, y: 100, len: 156 }, { x: 500, y: 100, len: 156 }],
    stars: [{ x: 400, y: 310 }, { x: 400, y: 370 }, { x: 400, y: 430 }],
  },

  /* 3 — Le balancier. Le bonbon part à l'horizontale : il faut lâcher au bas
     de la course, quand toute la hauteur perdue est devenue de la vitesse. */
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

  /* 5 — Trois cordes et un acidulé pile sous le point de départ : la chute
     droite est fermée, il faut sortir par le côté. */
  {
    n: 5,
    candy: { x: 400, y: 230 },
    mouth: { x: 620, y: 500, r: 38 },
    ropes: [
      { x: 300, y: 110, len: 156 },
      { x: 500, y: 110, len: 156 },
      { x: 400, y: 70, len: 170 },
    ],
    spikes: [{ x: 400, y: 380, r: 18 }],
    stars: [{ x: 500, y: 260 }, { x: 570, y: 340 }, { x: 620, y: 420 }],
  },

  /* 6 — Le coussin de guimauve. Il rend de la hauteur : le rebond porte plus
     loin que la trajectoire directe. */
  {
    n: 6,
    candy: { x: 90, y: 90 },
    mouth: { x: 650, y: 520, r: 38 },
    ropes: [{ x: 200, y: 90, len: 110 }],
    bumpers: [{ x: 430, y: 420, r: 38 }],
    stars: [{ x: 250, y: 220 }, { x: 360, y: 300 }, { x: 560, y: 400 }],
  },

  /* 7 — Ancre mobile. Le point d'accroche balaie de gauche à droite : le
     bonbon a déjà de la vitesse avant qu'on ait rien coupé. */
  {
    n: 7,
    candy: { x: 400, y: 270 },
    mouth: { x: 640, y: 500, r: 38 },
    ropes: [{ x: 400, y: 100, len: 170, move: { ax: 130, ay: 0, speed: 1.7, phase: 0 } }],
    stars: [{ x: 480, y: 320 }, { x: 560, y: 390 }, { x: 630, y: 440 }],
  },

  /* 8 — La bulle, seule et sans piège. Elle porte vers le haut ; la bouche est
     au-dessus. Rien d'autre à comprendre dans ce niveau, c'est le but. */
  {
    n: 8,
    candy: { x: 160, y: 430 },
    mouth: { x: 160, y: 140, r: 40 },
    ropes: [{ x: 160, y: 350, len: 80 }],
    bubbles: [{ x: 160, y: 430, r: 40 }],
    stars: [{ x: 160, y: 350 }, { x: 160, y: 280 }, { x: 160, y: 210 }],
  },

  /* 9 — Bulle + souffleur. La bulle monte, le souffle pousse : la bouche est
     en haut à droite et on l'atteint SANS jamais toucher le sol. Crever la
     bulle plus tôt aplatit la trajectoire — c'est la vraie commande du niveau,
     et les acidulés de droite punissent celui qui pousse trop loin. */
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

  /* 10 — NIVEAU DU TRÉSOR (10 000 or, voir CANDY_GAME_GOLD). Deux cordes, une
     arche à franchir au-dessus de deux acidulés. Il doit être franchement
     difficile : c'est le premier vrai palier. */
  {
    n: 10,
    candy: { x: 400, y: 250 },
    mouth: { x: 680, y: 520, r: 38 },
    ropes: [{ x: 300, y: 120, len: 164 }, { x: 520, y: 120, len: 180 }],
    spikes: [{ x: 560, y: 380, r: 18 }, { x: 600, y: 430, r: 18 }],
    stars: [{ x: 480, y: 260 }, { x: 600, y: 300 }, { x: 680, y: 420 }],
  },

  /* 11 — Bulle + coussin. La bulle et le souffle donnent la hauteur et la
     direction, le coussin fait le reste du chemin. Crever trop tard, et on
     passe au-dessus du coussin sans le toucher. */
  {
    n: 11,
    candy: { x: 140, y: 420 },
    mouth: { x: 680, y: 520, r: 44 },
    ropes: [{ x: 140, y: 350, len: 70 }],
    bubbles: [{ x: 140, y: 420, r: 40 }],
    fans: [{ x: 60, y: 150, w: 520, h: 420, dx: 1, dy: 0, power: 0.55 }],
    bumpers: [{ x: 490, y: 440, r: 54 }],
    spikes: [{ x: 330, y: 560, r: 18 }],
    stars: [{ x: 250, y: 330 }, { x: 400, y: 260 }, { x: 620, y: 430 }],
  },

  /* 12 — Ancre tournante. Le bonbon est fouetté ; l'instant de la coupe décide
     de tout, et la fenêtre est courte. */
  {
    n: 12,
    candy: { x: 400, y: 340 },
    mouth: { x: 620, y: 520, r: 38 },
    ropes: [{ x: 400, y: 220, len: 150, spin: { cx: 400, cy: 220, r: 90, speed: 2.2, phase: 0 } }],
    spikes: [{ x: 400, y: 490, r: 20 }],
    stars: [{ x: 500, y: 380 }, { x: 560, y: 440 }, { x: 620, y: 470 }],
  },

  /* 13 — Relais de bulles. La première monte en dérivant, la seconde attend
     plus loin et remonte tout droit vers la bouche. Crever la première trop
     tôt ou trop tard, et le bonbon tombe à côté de la seconde. Les deux ont
     une poussée réduite (`lift`) : à pleine puissance le bonbon sortirait par
     le haut avant d'avoir dérivé jusqu'au relais. */
  {
    n: 13,
    candy: { x: 120, y: 540 },
    mouth: { x: 470, y: 140, r: 40 },
    ropes: [{ x: 120, y: 470, len: 70 }],
    bubbles: [
      { x: 120, y: 540, r: 38, lift: 0.45 },
      { x: 470, y: 420, r: 46, lift: 0.7 },
    ],
    fans: [{ x: 60, y: 240, w: 330, h: 340, dx: 1, dy: 0, power: 0.5 }],
    spikes: [{ x: 300, y: 560, r: 18 }, { x: 350, y: 560, r: 18 }],
    stars: [{ x: 220, y: 430 }, { x: 350, y: 330 }, { x: 470, y: 260 }],
  },

  /* 14 — Tout ensemble : ancre qui respire, coussin, souffleur, acidulés. */
  {
    n: 14,
    candy: { x: 220, y: 250 },
    mouth: { x: 660, y: 480, r: 40 },
    ropes: [
      { x: 220, y: 130, len: 120, move: { ax: 0, ay: 60, speed: 1.8, phase: 0 } },
      { x: 430, y: 180, len: 225 },
    ],
    bumpers: [{ x: 520, y: 445, r: 40 }],
    spikes: [{ x: 360, y: 330, r: 16 }, { x: 630, y: 300, r: 16 }],
    stars: [{ x: 330, y: 240 }, { x: 520, y: 300 }, { x: 660, y: 400 }],
  },

  /* 15 — FINALE (chat berlingot, voir CANDY_GAME_PET_LEVEL). Trois cordes et
     un entonnoir d'acidulés : la chute droite passe, mais elle ne passe QUE si
     le bonbon ne balance pas. Il faut donc trancher les trois d'un seul geste.
     Le niveau récompense un geste franc, pas une série de petits coups. */
  {
    n: 15,
    candy: { x: 400, y: 200 },
    mouth: { x: 400, y: 545, r: 32 },
    ropes: [
      { x: 250, y: 110, len: 175 },
      { x: 550, y: 110, len: 175 },
      { x: 400, y: 80, len: 120 },
    ],
    spikes: [
      { x: 318, y: 430, r: 18 }, { x: 482, y: 430, r: 18 },
      { x: 300, y: 495, r: 18 }, { x: 500, y: 495, r: 18 },
    ],
    stars: [{ x: 400, y: 300 }, { x: 400, y: 380 }, { x: 400, y: 460 }],
  },
];

if (typeof module !== "undefined" && module.exports) module.exports = LEVELS;
