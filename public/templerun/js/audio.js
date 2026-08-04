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
    /* ══════════════════════════════════════════════════════════════════════
       LA COLLECTE DES BULLES BLEUES (416).
       ──────────────────────────────────────────────────────────────────────
       ⚠️ CES DEUX PISTES SONT LES PREMIÈRES DU JEU À ÊTRE DÉCLENCHÉES PAR UNE
       ACTION DU JOUEUR, et ça change tout leur cahier des charges. L'ouverture,
       le tonnerre et le souffle sont des sons d'AMBIANCE : ils arrivent quand
       ils veulent, une fois de temps en temps, et personne ne les relie à un
       geste. Une bulle, elle, doit sonner AU MOMENT où on la traverse, et il
       peut y en avoir neuf en trois secondes.

       Trois conséquences, et aucune n'était vraie des trois pistes existantes :
         1. IL FAUT PLUSIEURS VOIX. Un seul `<audio>` rejoué se coupe lui-même :
            on n'entendrait que la dernière bulle de chaque chapelet. Voir
            `VOICES` et `pick()`.
         2. IL FAUT QUE ÇA MONTE. Neuf fois exactement le même son, c'est neuf
            fois rien ; neuf fois le même son un demi-ton plus haut, c'est une
            phrase musicale et une récompense qui enfle. C'est le plus vieux
            truc du jeu de plateforme, et il n'a pas d'équivalent.
         3. IL FAUT UNE CHUTE. Un chapelet qui s'arrête sans conclure laisse
            l'oreille en suspens. `bubbleRun` est cet accord final.
       ══════════════════════════════════════════════════════════════════════ */
    bubble:    { file: "sounds/bubble.mp3",     vol: 0.55, voices: 6 },
    bubbleRun: { file: "sounds/bubble-run.mp3", vol: 0.7 },
  };

  const el = {};            // nom -> <audio>, rempli par init()
  const pool = {};          // nom -> [<audio>] pour les pistes à voix multiples
  const turn = {};          // nom -> index de la prochaine voix
  let thunderTimer = 0;     // setTimeout en attente entre l'éclair et son coup
  let breathAt = 0;         // date de la prochaine respiration ; 0 = désarmé
  let chainN = 0;           // longueur du chapelet de bulles en cours
  let chainAt = 0;          // date de la dernière bulle ramassée

  function init() {
    for (const name in TRACKS) {
      const t = TRACKS[name];
      const a = new window.Audio(t.file);
      a.preload = "auto";
      a.volume = t.vol;
      el[name] = a;
      /* ⚠️ LES VOIX SUPPLÉMENTAIRES SONT DES ÉLÉMENTS DISTINCTS, PAS DES
         `cloneNode()` FAITS AU MOMENT DU BESOIN. Cloner à chaud crée un élément
         par bulle, donc quelques centaines par course, chacun retéléchargeant
         éventuellement le fichier — c'est le défaut classique de cette API, et
         il se manifeste par un HOQUET au premier chapelet, quand le navigateur
         part chercher ce qu'il a déjà. Ici tout est en place au chargement,
         `pick()` ne fait plus que tourner. */
      if (t.voices > 1) {
        pool[name] = [a];
        turn[name] = 0;
        for (let i = 1; i < t.voices; i++) {
          const b = new window.Audio(t.file);
          b.preload = "auto";
          b.volume = t.vol;
          pool[name].push(b);
        }
      }
    }
  }

  /* La prochaine voix libre d'une piste, en tourniquet. ⚠️ ON NE CHERCHE PAS LA
     VOIX « QUI A FINI » : à six voix pour un son de 160 ms, un tourniquet ne
     rattrape jamais une voix encore en cours (il faudrait dix bulles par
     seconde). Chercher la voix libre coûterait une boucle et un test
     `a.ended` peu fiable selon les navigateurs, pour aucun gain. */
  function pick(name) {
    const p = pool[name];
    if (!p) return el[name];
    const a = p[turn[name] % p.length];
    turn[name]++;
    return a;
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

  /* ══════════════════════════════════════════════════════════════════════════
     LA BULLE BLEUE (416) — appelée par Game à chaque ramassage.
     ──────────────────────────────────────────────────────────────────────────
     Guillaume : « ajoute enfin quelques sons pour la collecte de bulles bleues
     dans le endless run ».

     ⚠️ LA MONTÉE SE FAIT PAR `playbackRate`, PAS PAR DES FICHIERS SÉPARÉS.
     Douze mp3 d'un demi-ton d'écart pèseraient douze fois plus et devraient
     être réenregistrés à chaque retouche du son. Le taux de lecture transpose
     et raccourcit à la fois — ce qui, pour un « plop » de 160 ms, est
     exactement l'effet voulu : plus la série s'allonge, plus les bulles
     deviennent claires ET brèves, donc pressées. On monte d'un demi-ton par
     bulle (2^(1/12) ≈ 1,0595) et on PLAFONNE : au-delà de sept demi-tons le
     son perd son corps et se met à claquer.

     ⚠️ ET LA SÉRIE SE ROMPT PAR LE TEMPS, PAS PAR LA GÉOMÉTRIE. On pourrait
     demander à track.js quel chapelet est en cours — ce serait plus exact et ce
     serait une faute : le son suivrait alors une structure que le joueur ne
     voit pas. Ce qu'il entend comme « une série », c'est « des bulles qui se
     suivent de près ». Deux chapelets ramassés coup sur coup DOIVENT sonner
     comme une seule montée, et une bulle isolée en fin de chapelet ne doit pas
     conclure quoi que ce soit. Le temps est le bon juge.

     ⚠️ AUCUN ÉTAT DU JEU N'EST LU ICI, conformément à la règle du fichier
     (« Audio n'observe rien : c'est Game qui appelle »). Le chapelet est un
     compte à rebours interne, comme la fenêtre de respiration. */
  function bubble(now) {
    const t = now === undefined ? Date.now() : now;
    if (t - chainAt > CFG.BUBBLE_CHAIN_MS) chainN = 0;
    chainAt = t;
    const step = Math.min(chainN, CFG.BUBBLE_MAX_STEPS);
    const a = pick("bubble");
    a.playbackRate = Math.pow(2, step / 12);
    /* Le volume monte un peu avec la série, mais BEAUCOUP moins que la
       hauteur : c'est la hauteur qui raconte la progression, le volume ne
       fait que l'accompagner. Une montée en volume seule finit par écraser
       le reste du mixage sans rien signifier. */
    a.volume = Math.min(1, TRACKS.bubble.vol * (1 + step * 0.045));
    a.currentTime = 0;
    a.play().catch(() => {});
    chainN++;
    /* L'accord de conclusion, quand la série a été assez longue pour qu'on
       l'ait remarquée. ⚠️ IL SE JOUE SUR LA DERNIÈRE BULLE ET NON APRÈS UN
       DÉLAI : un accord qui tomberait une demi-seconde plus tard, alors que le
       joueur saute déjà un obstacle, se lirait comme un son sans cause. */
    if (chainN === CFG.BUBBLE_RUN_AT) play("bubbleRun");
  }

  /* Appelé quand la course s'arrête : la prochaine partie ne doit pas hériter
     d'un chapelet à moitié entamé et démarrer sept demi-tons trop haut. */
  function resetChain() { chainN = 0; chainAt = 0; }

  /* ------------------------------------------------------------ SILENCE --
     Pause, mort, sortie offroad, retour à la ferme : plus un son de course, et
     surtout PLUS DE COUP DE TONNERRE EN ATTENTE. Sans le clearTimeout, un
     éclair survenu une demi-seconde avant la mort du joueur ferait tonner
     l'écran de fin. */
  function stopAll() {
    if (thunderTimer) { clearTimeout(thunderTimer); thunderTimer = 0; }
    breathAt = 0;
    resetChain();
    stop("thunder");
    stop("breath");
  }

  return { init, playOpening, thunder, armBreath, tickBreath, bubble, resetChain, stopAll };
})();
