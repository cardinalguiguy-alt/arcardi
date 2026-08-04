/* =============================================================================
   input.js — Clavier et souris.
   -----------------------------------------------------------------------------
   ⚠️ LES COMMANDES SONT CELLES DU DÉFI DE FUITE, MOT POUR MOT. C'est une
   demande explicite de Guillaume (« mêmes contrôles que le endless run »), et
   c'est aussi la seule bonne réponse : ce sont les deux jeux 3D de la ferme, ils
   se jouent à quelques minutes d'intervalle, et deux schémas de touches
   différents feraient perdre la première descente à chaque fois.

     ← →  poser la carre     ↑  sauter (pression) / œuf (maintien)
     ↓   frein à main         Échap  pause

   DEUX DIFFÉRENCES, ET ELLES VIENNENT DE LA NATURE DU JEU :

     1. LES FLÈCHES SONT TENUES, PAS PRESSÉES. Au défi de fuite, ← est un
        ÉVÉNEMENT : on change de voie. Ici c'est un ÉTAT : on tient le virage.
        D'où `axis()` (un nombre entre -1 et 1) à côté de `consume()`. Traiter
        la direction en événements donnerait une luge qui tourne par à-coups,
        et interdirait le dérapage — qui n'existe que parce qu'on tient.

     2. LA SOURIS DIRIGE AUSSI. Demande de Guillaume pour le Gourmandin
        (« qu'on le joue avec un clavier et une souris ») ; on l'applique ici
        d'entrée plutôt que de l'ajouter après coup. Le déplacement horizontal
        du curseur pilote le même axe que les flèches, sur la moitié centrale
        de l'écran — les bords sont volontairement morts, sinon la luge braque
        à fond dès qu'on sort la souris du cadre.

   ⚠️ LES DEUX SOURCES SE COMBINENT PAR LE PLUS GRAND EN VALEUR ABSOLUE, pas
   par une somme. Une somme ferait qu'une souris posée à droite empêcherait de
   braquer à gauche au clavier — le pire des deux mondes pour qui touche
   accidentellement la souris.
   ========================================================================== */

const Input = (function () {
  const held = {};          // état des touches maintenues
  const pressed = {};       // événements en attente de consommation
  let mouseAxis = 0;
  let mouseSeen = false;    // tant que la souris n'a pas bougé, elle ne pilote rien
  let onPause = null;

  const KEY_LEFT = ["ArrowLeft", "KeyA", "KeyQ"];
  const KEY_RIGHT = ["ArrowRight", "KeyD"];
  const KEY_UP = ["ArrowUp", "KeyW", "KeyZ", "Space"];
  const KEY_DOWN = ["ArrowDown", "KeyS"];

  const any = (list) => list.some((k) => held[k]);

  function init(pauseCb) {
    onPause = pauseCb;
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") { if (onPause) onPause(); return; }
      // Les flèches et l'espace défilent la page dans une iframe : on les
      // retient ici, sinon le cadre du jeu saute à chaque saut de luge.
      if (KEY_LEFT.concat(KEY_RIGHT, KEY_UP, KEY_DOWN).includes(e.code)) e.preventDefault();
      if (!held[e.code]) pressed[e.code] = true;
      held[e.code] = true;
    });
    window.addEventListener("keyup", (e) => { held[e.code] = false; });
    // Une iframe qui perd le focus garde ses touches « collées » : le lugeur
    // partirait tout seul à gauche pendant que le joueur clique ailleurs.
    window.addEventListener("blur", clear);

    window.addEventListener("mousemove", (e) => {
      mouseSeen = true;
      const half = window.innerWidth / 2;
      // Zone morte de 6 % au centre (on ne braque pas en effleurant) et pleine
      // butée à 55 % de la demi-largeur (on ne doit pas avoir à sortir du cadre
      // pour braquer à fond).
      const raw = (e.clientX - half) / (half * 0.55);
      const dead = 0.06;
      const a = Math.abs(raw) < dead ? 0 : (raw - Math.sign(raw) * dead) / (1 - dead);
      mouseAxis = Math.max(-1, Math.min(1, a));
    });
    window.addEventListener("mouseleave", () => { mouseAxis = 0; });
    // Clic gauche = freiner/déraper, clic droit = sauter : la descente doit
    // être jouable à la souris seule, une main sur la table.
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) { held.MouseSlide = true; }
      else if (e.button === 2) { held.MouseJump = true; pressed.MouseJump = true; }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) held.MouseSlide = false;
      else if (e.button === 2) held.MouseJump = false;
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* L'axe de direction, -1 (gauche) à +1 (droite). */
  function axis() {
    let k = 0;
    if (any(KEY_LEFT)) k -= 1;
    if (any(KEY_RIGHT)) k += 1;
    if (!mouseSeen) return k;
    return Math.abs(mouseAxis) > Math.abs(k) ? mouseAxis : k;
  }

  const jumpPressed = () => {
    const p = KEY_UP.some((c) => pressed[c]) || !!pressed.MouseJump;
    for (const c of KEY_UP) pressed[c] = false;
    pressed.MouseJump = false;
    return p;
  };
  const sliding = () => any(KEY_DOWN) || !!held.MouseSlide;
  /* ⚠️ LA FLÈCHE HAUT A DEUX SENS DEPUIS LE 413, et ce n'est pas une
     surcharge maladroite : c'est le même geste physique. Une PRESSION fait
     sauter (impulsion), le MAINTIEN met en position d'œuf (on rentre la tête,
     on coupe le vent). Un lugeur qui veut aller vite se ramasse ; un lugeur
     qui veut sauter se détend. La touche unique dit exactement ça, et elle
     évite d'ajouter une cinquième commande à un jeu qui doit rester jouable
     d'une main. */
  const tucking = () => any(KEY_UP) || !!held.MouseJump;

  function clear() {
    for (const k in held) held[k] = false;
    for (const k in pressed) pressed[k] = false;
    mouseAxis = 0;
  }

  return { init, axis, jumpPressed, sliding, tucking, clear };
})();
