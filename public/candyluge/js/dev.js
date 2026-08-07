/* =============================================================================
   dev.js — LE MENU DÉVELOPPEUR DE LA DESCENTE (425). Demande de Guillaume.
   -----------------------------------------------------------------------------
   ⌘⇧X (ou Ctrl+Maj+X) une fois le mur de chantier franchi : un panneau s'ouvre,
   la partie se fige, et on peut sauter à n'importe lequel des dix fanions ou
   avancer d'un bloc. Re-⌘⇧X, ou Échap, et on referme.

   ⚠️ POURQUOI CE FICHIER EXISTE, ET C'EST LA VRAIE RAISON. La dette n°1 de
   candyluge (voir CLAUDE.md §6) rend la descente IMPARCOURABLE sans pilote : une
   luge lâchée dérive et percute la barrière en quelques secondes. Vérifier quoi
   que ce soit dans le bas de la piste — l'arrivée, le ruban, les confettis, le
   dernier fanion — obligeait donc à jouer proprement pendant trois minutes, ou à
   bidouiller `CFG.DESCENT_LENGTH` dans la console et à ne surtout pas oublier de
   la remettre. Les deux sont des façons de ne pas vérifier.

   ⚠️ ET C'EST LA MÊME LEÇON QUE LE 424 : « quand un outil et le jeu divergent,
   croire le jeu ». Un outil qui simule la fin de course ne prouve rien sur la
   fin de course. Celui-ci ne simule RIEN — il déplace la vraie luge, dans la
   vraie partie, par le même chemin qu'une remise en place après une chute.

   ⚠️ TROIS CHOSES QU'IL NE FAIT PAS, VOLONTAIREMENT :
     * il ne triche pas sur le score, le chrono ni le record. Un menu qui
       fabriquerait un temps rendrait le record inutilisable, et le record est
       la seule mesure de progrès du jeu ;
     * il ne touche à AUCUNE constante. Un réglage modifié depuis un menu
       survit à la partie et rend la suivante incompréhensible ;
     * il ne connaît ni `sled`, ni `slope`, ni `state`. Il APPELLE game.js, qui
       possède tout ça (voir devWarp/devFreeze). Un menu qui manipulerait la
       physique en direct serait un deuxième jeu, à maintenir en parallèle.

   ⚠️ LES TEXTES SONT EN DUR ICI, ET C'EST LA SEULE EXCEPTION À LA RÈGLE DE
   strings.js. Ce panneau n'est jamais montré à un joueur : le traduire coûterait
   deux entrées par ligne dans un fichier que l'on relit à chaque zip, pour un
   texte que seul Guillaume lira. Il doit surtout rester lisible même quand la
   ferme impose l'anglais — un outil de contrôle qui change de langue selon le
   contexte est un outil de moins.
   ========================================================================== */

const Dev = (function () {
  let api = null;          // { warp, freeze, info, unlocked } — fourni par game.js
  let root = null;         // le panneau, construit à la première ouverture
  let readout = null;
  let open = false;
  let tick = 0;

  /* Les sauts proposés. ⚠️ ILS SONT EN UNITÉS DE PISTE, PAS EN POURCENTAGE :
     tout le jeu raisonne en `s`, et un menu qui parlerait en pourcentage
     obligerait à convertir de tête pour recouper avec la console. */
  const HOPS = [
    { label: "− 200", d: -200 },
    { label: "+ 200", d: 200 },
    { label: "+ 600", d: 600 },
  ];

  function init(hooks) {
    api = hooks;
    /* ⚠️ EN PHASE DE CAPTURE, comme le mur et pour la même raison : input.js
       appelle preventDefault sur une partie du clavier, et un menu de contrôle
       ne doit pas dépendre de l'ordre de chargement des fichiers. */
    window.addEventListener("keydown", onKey, true);
  }

  function onKey(e) {
    /* ⚠️ TANT QUE LE MUR EST DEBOUT, ON NE FAIT RIEN. Le mur s'inscrit avant
       nous et consomme la touche (voir game.js), mais on ne s'appuie pas
       uniquement là-dessus : le jour où l'un des deux écouteurs bouge, le pire
       qui puisse arriver est que le menu s'ouvre par-dessus le panneau « jeu en
       construction » — c'est-à-dire que le mur ne serve plus à rien. */
    if (!api || !api.unlocked()) return;

    /* ⚠️⚠️ 425 — LE PIÈGE, ET IL NE S'EST VU QU'AU NAVIGATEUR : `stopPropagation`
       N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE. Le mur et ce menu sont
       tous les deux inscrits sur `window` en capture. Sur la DEUXIÈME pression du
       code secret, le mur écrit son jeton de session puis appelle
       `stopPropagation` — ce qui ne nous empêche nullement d'être appelés à notre
       tour, et à cet instant `unlocked()` vient tout juste de devenir vrai. Le
       menu s'ouvrait donc dans le même geste que le déverrouillage, par-dessus un
       écran-titre qu'on venait à peine de découvrir.

       Il aurait fallu `stopImmediatePropagation` côté mur — mais on ne va pas
       durcir le mur pour l'agrément du menu : c'est au dernier arrivé de ne pas
       déranger. `defaultPrevented` dit exactement ce qu'on veut savoir (« quelqu'un
       a déjà traité cette touche »), et il reste vrai quel que soit l'ordre
       d'inscription des écouteurs. Une fois le mur franchi il retire son écouteur :
       plus personne ne préempte la touche, et le menu en hérite. */
    if (e.defaultPrevented) return;

    if (e.code === "KeyX" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); e.stopPropagation();
      toggle();
      return;
    }
    if (!open) return;

    // Échap referme le menu SANS ouvrir la pause : input.js écoute la même
    // touche, on lui coupe donc l'herbe sous le pied tant qu'on est ouverts.
    if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); toggle(); return; }

    /* Les chiffres, parce qu'un aller-retour à la souris entre le panneau et la
       piste casse le rythme quand on compare deux fanions. 0 = le dixième :
       c'est la disposition du clavier, pas un caprice. */
    const m = /^Digit([0-9])$/.exec(e.code);
    if (m) {
      e.preventDefault(); e.stopPropagation();
      const n = m[1] === "0" ? 10 : parseInt(m[1], 10);
      goFlag(n);
    }
  }

  /* -------------------------------------------------------------- ACTIONS */

  /* ⚠️ ON SE POSE EN AMONT DU FANION, PAS DESSUS. C'est déjà ce que fait la
     remise en place après une chute (CP_BACK), et pour une raison qui vaut
     encore plus ici : arriver PILE sur la porte la fait défiler derrière soi
     sans qu'on la voie, et la bannière « FANION n/10 » ne se déclenche pas —
     `checkpointIndexAt` la considère déjà franchie. On veut la voir passer. */
  function goFlag(n) {
    const i = Math.max(1, Math.min(Slope.checkpointCount(), n | 0)) - 1;
    api.warp(Slope.checkpointAt(i) - CFG.CP_BACK - 30);
    refresh();
  }

  function hop(d) {
    api.warp(api.info().s + d);
    refresh();
  }

  /* ⚠️ L'ARRIVÉE SE VISE AVANT LA LIGNE, ET C'EST TOUT L'INTÉRÊT DU BOUTON.
     Se poser DANS la zone d'arrivée met `sled.finished` à vrai d'entrée : on
     verrait le panneau de score, mais ni le ruban se rompre, ni la bannière, ni
     les confettis, ni les ballons — c'est-à-dire rien de ce que le 424 a écrit.
     On se pose donc en amont, LANCÉ, et on franchit vraiment la ligne.
     ⚠️ L'abscisse est DÉRIVÉE de Slope.finishSAt(), jamais recopiée (§7). */
  function goFinish() {
    api.warp(Slope.finishSAt() - CFG.DEV_FINISH_RUNUP, CFG.DEV_FINISH_SPEED);
    refresh();
  }

  /* ---------------------------------------------------------- LE PANNEAU */

  function toggle() {
    open = !open;
    if (!root) build();
    root.classList.toggle("visible", open);
    api.freeze(open);
    if (open) refresh();
  }

  function btn(parent, label, cb, cls) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener("click", cb);
    parent.appendChild(b);
    return b;
  }

  function build() {
    root = document.createElement("div");
    root.id = "devMenu";

    const h = document.createElement("h2");
    h.textContent = "MENU DÉVELOPPEUR";
    root.appendChild(h);

    readout = document.createElement("div");
    readout.className = "dev-readout";
    root.appendChild(readout);

    const lFlags = document.createElement("div");
    lFlags.className = "dev-label";
    lFlags.textContent = "Se téléporter au fanion (touches 1…9, 0 = 10)";
    root.appendChild(lFlags);

    const flags = document.createElement("div");
    flags.className = "dev-grid";
    /* ⚠️ LE NOMBRE DE BOUTONS EST LU, PAS ÉCRIT. Guillaume demande dix fanions,
       et il y en a dix — mais c'est CP_COUNT qui le dit (config.js). Écrire
       « 10 » ici serait le quatrième endroit à mettre à jour le jour où il en
       veut douze, et le seul qui ne lèverait aucune erreur : on aurait
       simplement deux fanions inatteignables depuis le menu. */
    for (let n = 1; n <= Slope.checkpointCount(); n++) {
      btn(flags, String(n), () => goFlag(n));
    }
    root.appendChild(flags);

    const lHop = document.createElement("div");
    lHop.className = "dev-label";
    lHop.textContent = "Avancer / reculer sur la piste";
    root.appendChild(lHop);

    const hops = document.createElement("div");
    hops.className = "dev-grid wide";
    for (const h2 of HOPS) btn(hops, h2.label, () => hop(h2.d));
    btn(hops, "Départ", () => { api.warp(0); refresh(); });
    btn(hops, "ARRIVÉE", goFinish, "hot");
    root.appendChild(hops);

    const hint = document.createElement("p");
    hint.className = "dev-hint";
    hint.textContent = "⌘⇧X ou Échap : fermer. La partie est figée tant que ce panneau est ouvert.";
    root.appendChild(hint);

    document.body.appendChild(root);
  }

  /* Le relevé. Il se rafraîchit à l'ouverture ET après chaque action : le jeu
     est figé pendant ce temps, une boucle d'animation ne servirait à rien. */
  function refresh() {
    if (!readout) return;
    const i = api.info();
    const pct = Math.min(100, (i.s / CFG.DESCENT_LENGTH) * 100);
    readout.textContent =
      `s = ${i.s.toFixed(0)} / ${CFG.DESCENT_LENGTH}  (${pct.toFixed(0)} %)`
      + `   ·   fanion ${i.flag}/${i.count}`
      + `   ·   ligne à ${Slope.finishSAt().toFixed(0)}`;
    tick++;
  }

  return { init, get open() { return open; }, get ticks() { return tick; } };
})();
