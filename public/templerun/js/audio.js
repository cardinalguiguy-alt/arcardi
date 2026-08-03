/* =============================================================================
   audio.js — Sons du endless run.
   -----------------------------------------------------------------------------
   Toujours minimal : des <audio> HTML, pas de Web Audio API, pas de mixeur.
   Mais depuis le 410 les pistes sont décrites par UNE TABLE `{nom: réglages}`
   et non plus par une variable chacune — c'était la consigne laissée au 409 dès
   qu'une troisième piste apparaîtrait. Ajouter un son se fait désormais en
   ajoutant une ligne à TRACKS, sans toucher au reste du fichier.

   LES TROIS PISTES DU 410 :

   - OPENING  : jouée une seule fois, au lancement de la course (Game.start).
   - THUNDER  : déclenchée par l'ÉCLAIR, mais APRÈS UN DÉLAI. Voir thunder().
   - BREATH   : le fermier qui souffle, par moments, pendant la course. Voir
     armBreath()/tickBreath().

   ⚠️ LES PAS ONT ÉTÉ RETIRÉS AU 410. `footsteps.mp3` est supprimé, et toute
   l'API `startFootsteps/setFootsteps/stopFootsteps` avec lui. Ce n'était pas
   une piste qui déplaisait à moitié : Guillaume l'a retirée, il n'en reste
   donc rien — ni fichier, ni fonction morte, ni appel commenté dans game.js.

   QUI PILOTE QUOI. Comme au 409, Audio n'observe rien : c'est Game qui appelle,
   frame par frame ou sur événement. La seule chose qu'Audio décide tout seul,
   c'est QUAND souffler dans la fenêtre aléatoire que la config lui donne — un
   compte à rebours interne, pas une lecture de l'état du jeu.
   ========================================================================== */

const AudioFX = (function () {
  /* La table. `vol` est le volume de repos de la piste : c'est ici, et nulle
     part ailleurs, qu'on rééquilibre deux sons l'un par rapport à l'autre
     (point 2 laissé en suspens au 409). Le tonnerre, lui, module le sien à
     chaque coup — voir thunder(). */
  const TRACKS = {
    opening: { file: "sounds/opening.mp3", vol: 1.0 },
    thunder: { file: "sounds/thunder.mp3", vol: 0.85 },
    breath:  { file: "sounds/breath.mp3",  vol: 0.85 },
  };

  const el = {};            // nom -> <audio>, rempli par init()
  let thunderTimer = 0;     // setTimeout en attente entre l'éclair et son coup
  let breathAt = 0;         // date de la prochaine respiration ; 0 = désarmé

  function init() {
    for (const name in TRACKS) {
      const t = TRACKS[name];
      const a = new window.Audio(t.file);
      a.preload = "auto";
      a.volume = t.vol;
      el[name] = a;
    }
  }

  /* Joue une piste depuis le début. `vol` est optionnel : sans lui, la piste
     garde le volume de sa table. L'autoplay peut être refusé par le navigateur
     tant qu'aucun geste utilisateur n'a eu lieu ; ici Game.start() vient d'un
     clic, donc le cas ne se présente pas — on ignore le rejet en silence. */
  function play(name, vol) {
    const a = el[name];
    if (!a) return;
    if (vol !== undefined) a.volume = vol;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function stop(name) {
    const a = el[name];
    if (!a) return;
    a.pause();
  }

  /* ------------------------------------------------------------ OUVERTURE */
  function playOpening() { play("opening"); }

  /* --------------------------------------------------------------- ORAGE --
     ⚠️ LE TONNERRE NE PART PAS AVEC L'ÉCLAIR — C'EST TOUT L'INTÉRÊT.
     La lumière arrive tout de suite, le son met une seconde à parcourir trois
     cents mètres. Un coup de tonnerre simultané au flash ne se lit pas comme un
     orage : il se lit comme un bruitage collé sur une animation. Le délai EST
     l'effet.

     Deuxième conséquence, gratuite : le délai dit la distance, donc il dit
     aussi le volume. Un coup qui tarde vient de loin, il doit être plus sourd.
     Les deux sont tirés d'un SEUL nombre aléatoire — sans ça on obtiendrait un
     éclair lointain qui claque à côté de l'oreille une fois sur deux. */
  function thunder() {
    const lo = CFG.THUNDER_DELAY_MIN_MS;
    const hi = CFG.THUNDER_DELAY_MAX_MS;
    const d = lo + Math.random() * (hi - lo);
    const far = (d - lo) / Math.max(1, hi - lo);        // 0 = tout près, 1 = au loin
    const vol = CFG.THUNDER_VOL_NEAR + (CFG.THUNDER_VOL_FAR - CFG.THUNDER_VOL_NEAR) * far;

    /* Un seul coup en attente à la fois. Les éclairs sont espacés d'au moins
       LIGHTNING_MIN_MS (7 s) et le délai plafonne bien en dessous, donc le cas
       ne devrait jamais arriver ; le clearTimeout est là pour que, s'il
       arrivait, le compte à rebours reparte du dernier éclair vu plutôt que de
       laisser deux minuteurs vivre en parallèle sur un unique <audio>. */
    if (thunderTimer) clearTimeout(thunderTimer);
    thunderTimer = setTimeout(function () {
      thunderTimer = 0;
      play("thunder", vol);
    }, d);
  }

  /* --------------------------------------------------------- RESPIRATION --
     « Par moments » : ni en boucle, ni à chaque saut. Le fichier est le DÉBUT
     de l'enregistrement fourni — quelques souffles courts — et pas les
     respirations lourdes de la fin, qui sonnaient comme un autre personnage.

     armBreath() pose la première échéance, tickBreath() est appelée à chaque
     frame par Game et ne fait rien 99 % du temps. Le premier souffle est
     volontairement retardé (BREATH_FIRST_MS) : on ne s'essouffle pas au
     troisième pas, et le son d'ouverture a le temps de finir. */
  function armBreath(now) {
    breathAt = now + CFG.BREATH_FIRST_MS + Math.random() * CFG.BREATH_SPREAD_MS;
  }

  function tickBreath(now) {
    if (!breathAt || now < breathAt) return;
    play("breath");
    breathAt = now + CFG.BREATH_MIN_MS
      + Math.random() * (CFG.BREATH_MAX_MS - CFG.BREATH_MIN_MS);
  }

  /* ------------------------------------------------------------ SILENCE --
     Pause, mort, sortie offroad, retour à la ferme : plus un son de course, et
     surtout PLUS DE COUP DE TONNERRE EN ATTENTE. Sans le clearTimeout, un
     éclair survenu une demi-seconde avant la mort du joueur ferait tonner
     l'écran de fin. */
  function stopAll() {
    if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = 0; }
    breathAt = 0;
    stop("thunder");
    stop("breath");
  }

  return { init, playOpening, thunder, armBreath, tickBreath, stopAll };
})();
