/* ==========================================================================
   FERME VALLÉE (jeu 22) — libellés bilingues INTERNES au jeu.
   ==========================================================================
   Le jeu est très riche en texte (boutique, bac, aides, toasts). Pour ne pas
   gonfler lib/i18n.js (STR) de plusieurs dizaines de clés et risquer une
   asymétrie FR/EN, ces libellés propres au jeu vivent ici, en un dictionnaire
   { fr, en } auto-porté. Seuls le NOM et le TAG de la carte (nameFerme /
   tagFerme) sont dans lib/i18n.js, car page.js en a besoin hors du composant.

   Règle site : AUCUN tiret quadratin dans le texte FR joueur.
   `fstr(lang)` renvoie le bon jeu de libellés ; les fonctions acceptent des
   paramètres (niveau d'outil, gain, etc.).
   ========================================================================== */

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 444 — LES TEXTES DE LA QUÊTE DE L'ÉTOILE, EN ANGLAIS, UNE SEULE FOIS.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CE BLOC EST DÉFINI DEHORS ET RÉFÉRENCÉ PAR LES DEUX LANGUES, ET C'EST LA
   FAÇON LA MOINS DANGEREUSE DE LIVRER UNE PASSE « ANGLAIS SEULEMENT ».
   Consigne du chantier : cette passe est en anglais, la traduction française
   viendra dans une session à part. Trois façons de le faire, deux mauvaises :
     • n'écrire la clé que côté `en` → `L.star` vaut `undefined` en français, et
       le jeu plante à la première bulle. Non ;
     • RECOPIER le texte anglais dans le bloc `fr` → deux textes identiques à
       tenir d'accord, c'est-à-dire la divergence en attente du §8 de
       `CLAUDE.md` : le jour où l'on corrige une réplique, on en corrige une
       seule, et personne ne s'en aperçoit puisque personne ne relit l'autre ;
     • UNE SEULE table, référencée deux fois. Il n'existe qu'un texte, donc il
       ne peut pas diverger, `verify-strings` voit bien la clé `star` des deux
       côtés, et **l'état « pas encore traduit » est visible d'un coup d'œil**
       au lieu de se cacher dans quatre cents lignes qui se ressemblent.
   ⚠️ LA TRADUCTION FUTURE EST DONC : dupliquer cette table, la traduire, et
   remplacer `star: STAR_EN` par `star: STAR_FR` dans le bloc `fr`. Une ligne de
   branchement, pas un refactor — ce que la consigne demande.

   ⚠️⚠️ ET RIEN DE CE QUE LE JOUEUR LIT N'EST ÉCRIT AILLEURS QUE DANS CETTE
   TABLE. C'est la règle du 439 (`HALL_TOPICS` : la table d'un côté, le texte de
   l'autre), et elle est mesurable : `verify-strings.mjs` apparie les deux
   langues clé par clé, et il ne sait le faire que sur ce fichier.

   ⚠️ LE REGISTRE D'ÉCRITURE EST UNE CONTRAINTE DE CONCEPTION, PAS UN GOÛT :
   public de 7 à 27 ans. Phrases courtes, mots simples, présent. Pas de tournure
   alambiquée même bien tournée, et surtout **pas un mot d'administration** —
   c'est très exactement ce que l'enquête du 442 avait de trop. Ce qui doit être
   beau, c'est ce qui se passe, pas la façon de le dire.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ╔═══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 450 — LA QUÊTE PARLE ENFIN FRANÇAIS, ET C'ÉTAIT LE BLOCAGE N°1.
   ╚═══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ JUSQU'ICI LE BLOC `fr` CONTENAIT LITTÉRALEMENT `star: STAR_EN`. Le reste
   du fichier est bilingue sur 1 081 clés ; la quête, elle, était en anglais des
   DEUX côtés. Autrement dit : **le public visé — des enfants de sept ans — ne
   pouvait lire aucune ligne de la seule histoire du jeu.** `verify-strings` ne
   pouvait rien dire, et pour une bonne raison : il apparie les CLÉS, et les clés
   étaient appariées. *Un banc qui mesure la bonne chose ne voit pas ce qu'on ne lui
   a pas demandé de mesurer.*

   ⚠️ LE REGISTRE EST UNE CONTRAINTE DE CONCEPTION, PAS UN GOÛT, et il est plus dur
   en français qu'en anglais parce que la langue est plus longue :
     · six à huit mots par phrase, présent, mots d'enfant ;
     · **une action visible plutôt qu'une image poétique** — « écoute les ombres »
       se joue, une tournure abstraite se relit trois fois ;
     · pas un mot d'administration (le reproche exact fait à l'enquête du 442) ;
     · ⚠️ ET LES PHRASES DE BANDEAU RESTENT COURTES : 520 px, deux lignes de 12 px,
       et au-delà `text-overflow` les coupe EN SILENCE (449). Le français gonfle de
       15 à 20 % : plusieurs `goal` sont donc raccourcies, pas traduites mot à mot.

   ⚠️⚠️ ET LE TUTOIEMENT EST UN CHOIX, pas un oubli : le jeu s'adresse à un enfant
   qui joue avec un copain. Le vouvoiement mettrait une distance que l'anglais n'a
   pas et que la scène ne veut pas. */
/* ╔═══════════════════════════════════════════════════════════════════════════════
   ║ ZIP 453 — LES NOMBRES DE MORCEAUX SONT DES PARAMÈTRES, PLUS DES MOTS.
   ╚═══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️⚠️ TROIS PHRASES DISAIENT UN NOMBRE ÉCRIT EN TOUTES LETTRES (« Trois
   morceaux », « Quatre morceaux », « Cinq notes ») pendant que le navire, lui,
   comptait sur CINQ. Elles étaient vraies le jour où on les a écrites — le 444
   comptait quatre NOTES — et le 450 a posé un cinquième morceau sans les
   relire. *Un compteur ajouté ne recompte pas les phrases déjà écrites*, et
   aucun banc ne pouvait le voir : chaque compte était juste dans sa propre
   liste.
   ⚠️ LA PARADE EST DE NE PLUS JAMAIS ÉCRIRE LE NOMBRE ICI : toute phrase qui
   compte des morceaux est une FONCTION `(n, total)`, appelée avec
   `Q.starShipBuilt(e)` et `Q.STAR_SHIP_TOTAL`. `tools/verify-quete.mjs` refuse
   désormais tout nombre de morceaux littéral dans ces deux tables.
   ⚠️ `NUM` EXISTE POUR QUE LA PHRASE RESTE JOLIE. « Elle en a 1 » se lit comme
   un tableau de bord ; « Elle en a un » se lit comme un conte, et le public a
   sept ans. C'est la seule raison de cette table — elle ne décide de rien. */
const NUM_FR = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"];
const nfr = (n) => NUM_FR[n | 0] || String(n | 0);
const Nfr = (n) => { const s = nfr(n); return s.charAt(0).toUpperCase() + s.slice(1); };

const STAR_FR = {
  title: "Le Bateau des Étoiles",
  /* ⚠️⚠️ ZIP 472 (audit host-focus) — `hostAway` EST LE SEUL TEXTE DE CE BLOC.
     Masquer l'onglet de l'hôte arrête sa boucle de rendu (mesuré en Chrome
     réel) : ses IA autoritaires, dont l'arbitrage de la quête de l'étoile,
     cessent d'avancer tant qu'il reste masqué. Rien ne le disait — le
     bandeau de présence dépend de Presence, qui le voit « en ligne » quand
     même. Le message reste GÉNÉRAL (« certains habitants ») plutôt que de
     nommer la quête : le signal (`hostActivity`) est diffusé par la boucle
     réseau, pas par `quete.js`, et vaut pour toute IA simulée côté hôte. */
  net: {
    hostAway: "L'hôte est en arrière-plan, certains habitants peuvent ralentir.",
  },
  farm: {
    mapImpact: (n) => `Impact ${n}`,
    /* ⚠️ 2026-08-31 — L'ÉTAT FOUILLÉ NE PASSAIT QUE PAR LA COULEUR (pastille grise
       et fixe contre orange pulsante). C'est juste, et ça ne suffit pas : sur huit
       pastilles, savoir lesquelles restent demande de comparer des teintes plutôt
       que de lire. Le mot est ajouté À CÔTÉ de la couleur, il ne la remplace pas. */
    mapImpactSeen: (n) => `Impact ${n} — fouillé`,
    seen: "Ce point d'impact a déjà été fouillé.",
    /* ⚠️ ZIP 469 — `empty1`/`empty2` SONT PARTIES DANS `dig.bodyEmpty` : le vide
       ne se raconte plus en deux bulles après coup, il s'annonce dans l'overlay de
       fouille, au moment exact où l'on découvre qu'il n'y a rien. */
    starPeek: "Une petite lumière se tasse au fond dès que tu la regardes.",
    /* ⚠️ ZIP 479 — « une minute » DATAIT D'AVANT LE 478, qui a ramené la tenue solo
       à trente secondes (`STAR_CALM_SOLO_MS`). Un texte qui annonce le double de ce
       que le code demande fait attendre pour rien celui qui le croit — c'est la
       famille « un texte affirme » (448), sur un chiffre. */
    tameSolo: "Tourne-lui le dos et ne bouge plus. Seul, compte une demi-minute.",
    tameDuo: "Vous êtes plusieurs dans la ferme. Dix secondes sans la regarder suffiront.",
    material1: "Sous la cendre : une plaque noire, lisse seulement sur sa cassure.",
    material2: "Elle a reçu tout le choc sans le transmettre à la terre dessous.",
    material3: "Le bois sait plier ; cette matière sait tenir. Ensemble, ils résisteraient à bien davantage.",
    materialKeep: "Tu gardes la plaque. Elle n'a pas encore d'usage, mais elle en aura un.",
  },
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — LA FOUILLE. TROIS RÉSULTATS, ET LE VIDE EN EST UN.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ AUCUNE DE CES PHRASES NE DIT « TU AS PERDU ». Deux cratères sur cinq ne
     donnent rien, et c'est ce qui fait de la chasse une chasse (décision de
     Guillaume) : le texte du vide doit donc RÉCOMPENSER la fouille par autre chose
     qu'un objet — ici par ce qu'on apprend du ciel. Un « raté » écrit noir sur
     blanc apprendrait au joueur à ne plus creuser.
     ⚠️ ELLES NE NOMMENT PAS L'ÉTOILE AVANT DE L'AVOIR VUE. `title` est ce que
     l'overlay écrit en grand : « Une étoile. » n'apparaît qu'après le grattage,
     jamais dans une invite (voir la note de `prompt.impact`). */
  dig: {
    /* ⚠️⚠️ ZIP 476 (audit 2026-08-24, défaut #7) — « RESTE APPUYÉ » DÉCRIVAIT UN
       GESTE QUE LE JEU NE DEMANDE PAS. `starDigStep` ne relit jamais si la
       touche est tenue : une seule pression lance la fouille (`starDigStart`),
       puis il suffit de ne pas s'éloigner pendant les trois secondes de
       `Q.STAR_DIG_MS` — exactement le même geste que « E : fouiller » promet
       déjà (une pression, pas un maintien). Le texte dit maintenant l'immobilité
       qu'on demande vraiment, dans le même vocabulaire que `s2.calmStill`. */
    hint: "Ne bouge plus : il gratte la cendre.",
    /* ⚠️⚠️ ZIP 476 (défaut #6) — SEUL MESSAGE QUAND UNE FOUILLE EN COURS EST
       COUPÉE PAR L'OUVERTURE DE L'OVERLAY D'UN AUTRE TROU (voir `starDigStep`) :
       avant, cette interruption était totalement silencieuse. */
    blocked: "La fouille s'arrête : une annonce est affichée. Ferme-la (Échap) pour recommencer.",
    stopped: "Tu t'es relevé. Le cratère est toujours là.",
    titleStarLight: "Une étoile bleue.",
    titleStarWarm: "Une étoile rose.",
    titleStarLure: "Une étoile blanche.",
    /* ⚠️⚠️ ZIP 478 (audit 477, défaut #5) — LA PLAQUE ÉTAIT « FROIDE, DÉJÀ » ET
       « À FAIRE REFROIDIR » DANS LE MÊME PANNEAU. Les deux phrases s'affichent
       ensemble, et c'est le panneau qui ENSEIGNE le seul mini-jeu restant : le
       joueur y lisait donc, au même instant, qu'il n'y a rien à faire et qu'il
       faut faire quelque chose. La sortie ne demandait pas d'inventer : le
       mini-jeu de l'arrosoir refroidit à PETITS COUPS en visant une bande, ce qui
       n'a de sens que si la chaleur est DEDANS. La croûte a pris, le cœur brûle —
       une seule vérité, et elle explique enfin le geste qu'on va demander. */
    titleMaterial: "Une plaque noire.",
    titleEmpty: "Rien.",
    bodyStarLight: "Une petite lumière bleue se tasse au fond dès que tu la regardes.",
    bodyStarWarm: "Une petite lumière rose. Elle ne recule pas : elle renifle vers toi.",
    /* hors-zip — LE TEXTE SUIT LE DESSIN. Elle ne bondit plus latéralement (ancien
       texte, ancien visuel) : elle plonge sous la terre sur place dès qu'on
       l'approche à mains nues (`Q.starHideK`/`Q.starHideAnim` appliqués à la
       verticale, voir FermeGame.js). Un texte qui décrit un mouvement que
       l'écran ne montre plus dit d'emblée le POURQUOI (les mains vides), pas
       seulement le symptôme. */
    bodyStarLure: "Une petite lumière blanche. Elle plonge sous la terre dès que tu approches à mains nues.",
    bodyMaterial: "Sous la cendre : lisse seulement sur sa cassure. La croûte a pris ; le cœur brûle encore.",
    bodyEmpty: "De la cendre tiède, du sable vitrifié, et rien dedans. Toutes les lumières n'abritaient pas quelque chose.",
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 479 — L'OVERLAY DIT COMMENT L'APPRIVOISER, ET IL LE DIT PAR COULEUR.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ C'EST LE SEUL ENDROIT DU JEU OÙ L'ON REGARDE UNE ÉTOILE AVANT D'AVOIR
       À AGIR, donc c'est là que la règle doit s'apprendre. Avant ce zip il disait
       « elle ne sortira pas tant qu'on la regarde » sur les DEUX — vrai pour une
       seule, et le joueur passait vingt minutes à tourner le dos à la rose.
       ⚠️ CHACUNE NOMME SA MONNAIE : la bleue veut ce qu'on rapporte du défi de
       fuite, la rose veut ce qui sort du chaudron. Le bandeau redira le geste ;
       ici on donne la RAISON, ce que le bandeau n'a pas la place de faire. */
    nextStarLight: "Elle ne sortira pas tant qu'on la regarde — et elle a froid. Offre-lui de la lumière bleue : 60 bonbons du défi de fuite, rapportés depuis la chute.",
    nextStarWarm: "Le calme ne l'intéresse pas. Elle vient à la chaleur : cuisine-lui quelque chose au chaudron et porte-le-lui avant que ça refroidisse.",
    // Hors-zip — RESKIN (demande Guillaume) : la ressource se nomme désormais
    // les éclats de comète (petit tas de cailloux blancs et violets luisants,
    // ramassable en un point fixe du monde maléfique) plutôt que du "minerai
    // magique" générique. La phrase dit où chercher, comme le texte du
    // passage sombre pour le chaudron (voir hud.cauldronPassage).
    nextStarLure: "Elle fuit à mains nues. Il lui faut une Essence d'étoile : fouille les recoins du monde maléfique, tu y trouveras un tas d'éclats de comète — blancs et violets, luisants. Ramène-les avec une améthyste au chaudron pour les préparer, et reviens : avec la fiole, elle viendra d'elle-même. Reste vigilant.",
    nextMaterial: "Il faut la refroidir à cœur avant d'y toucher.",
    nextEmpty: "Un site de moins à écarter.",
    left: (n) => n > 0
      ? `Il reste ${nfr(n)} cratère${n > 1 ? "s" : ""} à fouiller sur la ferme.`
      : "Les huit sites de la ferme sont fouillés.",
  },
  hud: {
    goal: {
      /* ╔═══════════════════════════════════════════════════════════════════
         ║ ZIP 455 — PLUS CLAIRES, ET ELLES DISENT LE GESTE.
         ╚═══════════════════════════════════════════════════════════════════
         ⚠️⚠️ DEMANDE DE GUILLAUME : « Les indications des étoiles guide ne doivent
         pas être trop évasives, je préfère qu'elles soient plus claires. Qu'on
         sache quoi faire. Genre trouver l'ingénieur par exemple. ouvrir le plan
         avec P etc. » La règle du 449 (« OÙ et QUOI, jamais pourquoi ») tenait ;
         il lui manquait le troisième terme, **COMMENT** — la touche à presser.
         ⚠️ ET C'EST GRATUIT EN MYSTÈRE : ce que ces phrases disent est ce que le
         joueur ferait de toute façon, dix minutes plus tard, en tâtonnant. Le
         mystère du chantier n'est pas « quelle touche », il est « qu'est-ce que
         c'est » — et ça, aucune de ces phrases ne le dit.
         ⚠️ LE PLAFOND DE 80 SIGNES N'A PAS BOUGÉ : le bandeau rabote en silence
         (449), donc c'est le TEXTE qui tient la contrainte, jamais la coupe. */
      farmImpacts: "Huit impacts, sur les deux rives. Ouvre la carte et fouille-les.",
      /* ⚠️⚠️ ZIP 475 (audit 472, défaut #8) — DEUX PHRASES DE PLUS POUR UN
         TROU DÉJÀ FOUILLÉ. `farmImpacts` ne disait plus rien de vrai une fois
         le trou ouvert : il répétait « fouille-les » sur une étoile qui
         attendait déjà qu'on lui tourne le dos, ou sur une plaque qui
         attendait déjà d'être retravaillée. Voir la note de `starGoalKey`
         dans `quete.js`. */
      /* ╔═════════════════════════════════════════════════════════════════
         ║ ZIP 479 — SEPT PHRASES POUR DEUX ÉTOILES, ET C'EST LE LOT ENTIER.
         ╚═════════════════════════════════════════════════════════════════
         ⚠️⚠️⚠️ `farmImpactTame` COUVRAIT LES DEUX PETITES ÉTOILES, parce qu'on
         leur demandait la même chose. Elles ne font plus le même geste : la bleue
         veut de la LUMIÈRE (des bonbons rapportés depuis la chute), la rose veut
         de la CHALEUR (un plat cuisiné et porté). *Deux gestes différents donnent
         deux textes différents tout seuls* — c'est la seule façon de régler le
         défaut 9 de l'audit sans écrire trois variations sur la même phrase.
         ⚠️ CHAQUE ÉTAT A LA SIENNE (475, 478) : « ça mijote » n'est pas « c'est
         prêt », qui n'est pas « cours ». Un bandeau répond à *qu'est-ce que je
         peux faire MAINTENANT*, jamais à *où en est-on*.
         ⚠️ PLAFOND DE 80 SIGNES, tenu par le TEXTE (le bandeau rabote en silence). */
      /* 480 bis — RESKIN (demande de Guillaume) : le geste reste le même (60
         bonbons du défi de fuite, voir dig.nextStarLight qui garde le détail),
         mais le bandeau court parle de la LUMIÈRE, pas des bonbons — et dit où
         chercher : le monde maléfique, forcé pendant toute cette étape (voir
         starGoalKey/applyForcedWorld, FermeGame.js). */
      farmImpactLight: "Elle veut de la lumière bleue. Traverse le monde maléfique pour la trouver.",
      farmImpactLightPay: "Tu as sa lumière. Va la lui offrir au bord du trou (E).",
      farmImpactTame: "Une étoile guette dans ce trou fouillé. Tourne-lui le dos et attends.",
      farmImpactWarm: "La rose vient à la chaleur. Cuisine-lui un plat au chaudron (E).",
      farmImpactSimmer: "Ça mijote au chaudron. Ne va pas trop loin, ce sera vite prêt.",
      farmImpactTake: "Le plat est prêt au chaudron. Prends-le (E) et ne traîne pas.",
      farmImpactCarry: "Porte le plat à son cratère avant qu'il refroidisse (E).",
      /* hors-zip — DEUX PHRASES, PAS UNE (voir la note de `starTameGoalKey`,
         quete.js) : celle-ci tant que la fiole n'est pas prête (le chaudron
         est dans le monde maléfique, forcé pendant cette étape), l'autre
         (`farmImpactLureGive`) dès qu'elle l'est — signalé par Guillaume, le
         chevron restait planté sur le chaudron une fois la fiole en poche. */
      farmImpactLure: "Elle fuit à mains nues. Prépare une Essence d'étoile au chaudron (E).",
      /* hors-zip — AUCUN « (E) » : le geste est une simple approche, tenue
         immobile près du trou (voir `starCalmSelf`, FermeGame.js — la blanche
         ne demande pas qu'on lui tourne le dos, juste la proximité), pas une
         touche à presser. Même famille que `farmImpactTame`, qui ne mentionne
         pas non plus de touche pour la même raison. */
      farmImpactLureGive: "Tu as l'Essence d'étoile. Approche du trou blanc, elle viendra d'elle-même.",
      farmImpactCool: "La plaque noire refroidit. Examine-la ici (E) pour poursuivre.",
      /* ⚠️ hors-zip — « l'étoile insiste » retiré (Guillaume : la personnification
         était de trop) et « occupe-toi » remplacé par une suggestion CONCRÈTE —
         un bandeau qui dit quoi faire, pas seulement d'attendre (même exigence
         que la note du 455 juste au-dessus). Et DEUX phrases, pas une : celle-ci
         suppose qu'on n'est pas encore parti, `townWaitThere` (juste en dessous)
         parle à qui a déjà pris le train — voir la note de `starGoalKey`. */
      townWait: "Prends le train pour Valley Town. Reste actif 2 min : marche ou interagis.",
      townWaitThere: "Reste actif 2 min à Valley Town : marche, explore ou interagis.",
      craterHot: "À l'est de Valley Town, le trou brûle encore. Attends qu'il refroidisse.",
      /* ⚠️⚠️ ZIP 479 — LA REINE NE SE PREND PLUS EN DESCENDANT. « Descends :
         quelque chose se cache au fond » décrivait le geste d'avant ce lot, et le
         fond est très exactement l'endroit où le nouveau geste ne marche PAS (deux
         joueurs au fond sont côte à côte, jamais dos à dos). Un texte n'est pas un
         décor : il AFFIRME (448), et celui-ci aurait envoyé au mauvais endroit. */
      /* ╔══════════════════════════════════════════════════════════════════════
         ║ 2026-09-02 (lot A) — TROIS PHRASES DE PLUS : NOURRIR, PORTER, RÉVEILLER.
         ╚══════════════════════════════════════════════════════════════════════
         ⚠️⚠️ `crater` NE DEVAIT PLUS ÊTRE LA PREMIÈRE PHRASE DU CHAPITRE, et c'est
         la seule raison de ces trois clés : depuis que la reine se nourrit puis se
         réveille, « un à chaque bord, dos à dos » est le DERNIER conseil du
         chapitre, pas le premier. Une seule phrase pour trois gestes aurait envoyé
         planter un épouvantail quelqu'un à qui il manque 80 lumières — un objectif
         qui saute deux étapes est un objectif qui ment (448).
         ⚠️ MÊME PARTAGE QUE `farmImpactLight`/`farmImpactLightPay` : la première dit
         où CHERCHER (le défi de fuite, pas un lieu de la carte — d'où l'absence de
         chevron), la seconde dit où RAPPORTER. ⚠️ PLAFOND DE 80 SIGNES. */
      craterFeed: "La reine est éteinte. Rapporte-lui 80 lumières du défi de fuite.",
      craterFeedPay: "Tu as ses lumières. Va les lui offrir au bord du cratère (E).",
      /* ⚠️ ELLE NOMME LA TOUCHE ET LE GESTE, pas la mécanique : « au rythme de son
         cœur » est tout ce qu'il faut savoir avant de voir l'anneau, et l'anneau
         explique le reste tout seul. Un bandeau qui décrirait la bande cible ferait
         le travail que le dessin fait mieux. */
      craterWake: "Nourrie, elle dort encore. Réveille-la au rythme de son cœur (E).",
      crater:    "Le cratère a refroidi. Un à chaque bord, dos à dos : elle sortira.",
      craterAlone: "Personne en face ? Plante ton épouvantail au bord opposé (E).",
      /* ╔══════════════════════════════════════════════════════════════════════
         ║ 2026-09-02 (lot A2) — LA DISCRÈTE. DEUX PHRASES, UNE PAR ZONE.
         ╚══════════════════════════════════════════════════════════════════════
         ⚠️ AUCUNE DES DEUX NE DIT OÙ ELLE EST EXACTEMENT, et c'est tout le lot :
         le chevron mène à la place, le bandeau donne le SIGNALEMENT, et la
         trouver reste à l'œil. Un objectif qui dirait « va à telle case » aurait
         supprimé la seule chasse de la quête. ⚠️ PLAFOND DE 80 SIGNES. */
      townShyAway: "Une des siennes se cache à Valley Town. Prends le train.",
      townShy: "Chapeau et lunettes, entre la place et le parc. Regarde les passants.",
      /* ╔══════════════════════════════════════════════════════════════════════
         ║ 2026-09-03 (lot A3) — LA VERTE. TROIS PHRASES, ET AUCUNE NE DIT OÙ.
         ╚══════════════════════════════════════════════════════════════════════
         ⚠️⚠️ CELLE-CI NE DONNE PAS DE DOMAINE, contrairement à `townShy` juste
         au-dessus, et c'est la seule différence qui compte entre les deux
         chasses : la sixième se cherche DANS un endroit annoncé, la cinquième se
         piste. Elle dit donc le SIGNE (une plante qui bouge toute seule) et la
         ressource (la reine, touche G), jamais un lieu. ⚠️ PLAFOND DE 80 SIGNES. */
      townGreenAway: "La verte est restée à Valley Town. Prends le train.",
      townGreen: "Une plante qui remue sans vent. Demande un indice à la reine (G).",
      townGreenLed: "La reine a pris la tête. E pour l'arrêter, E pour repartir.",
      /* ⚠️ ZIP 469 — SIX OBJECTIFS SONT PARTIS AVEC LE DÉCHANT (`lean`,
         `leanAgain`, `lakeShard`, `beadShard`, `nestShard`, `belfry`, `song`).
         `STAR_GOAL_KEYS` les dérive de la table : le banc échouerait sur une clé
         orpheline de texte, il échoue aussi sur un texte orphelin de clé. */
      /* ⚠️ ZIP 454 — plus courtes que leurs sœurs : le français gonfle de 15 à
         20 %, et ces deux-là portent un nom propre qu'on ne peut pas raccourcir. */
      engineer:       "Va demander un ingénieur naval à la mairie (E).",
      /* ⚠️⚠️ ZIP 470 — `engineerWait` DEVIENT DEUX PHRASES, UNE PAR PHASE. Avant,
         la même phrase ("il dessine") couvrait le train ET le dessin, donc elle
         mentait pendant les trois premières minutes. Demande de Guillaume : dire
         d'abord qu'il est contacté et arrive bientôt, puis qu'il travaille près
         du pier et rendra son plan bientôt. */
      engineerTravel: "Kerguélen a été prévenu. Il arrive bientôt à Valley Town.",
      engineerWork:   "Kerguélen dessine près du ponton. Il rendra ses plans bientôt.",
      /* ⚠️ ZIP 480 — LA PASSE MAIRE. Le bandeau désigne l'action la plus proche :
         les plans sont rendus, la cale attend une signature. */
      mayor:          "Les plans sont prêts. Demande une audience au maire (mairie).",
      /* ⚠️⚠️ ZIP 475 (audit 472, défaut #20) — LA COMMANDE N'EST PAS UN
         DÉPLACEMENT. Cette phrase disait « à la ferme », ce qui laisse croire
         qu'un lieu existe à rejoindre — or la commande passe par le bouton
         de Tristan dans le menu Employés (👥), utilisable de n'importe où, et
         `starTargetPos("sawmill")` rend `null` tant que la scierie n'est pas
         bâtie : il n'y a jamais eu de chevron ici pour tenir la promesse.
         Le texte nomme donc le VRAI geste — ouvrir le menu Employés —
         au lieu d'une adresse que rien ne dessine. */
      /* ⚠️⚠️ ZIP 478 — TROIS PHRASES POUR TROIS ÉTATS (voir `starGoalKey`).
         L'ancienne disait « la pièce SUIVANTE » — vrai tant que Tristan travaillait
         dans l'ordre, faux depuis que les cinq se commandent ensemble — et elle
         envoyait au menu Employés un joueur dont la pièce attendait déjà sur la cale.
         ⚠️ PLAFOND DE 80 SIGNES, tenu par le TEXTE (le bandeau rabote en silence). */
      timberOrder:    "Commande les pièces à Tristan (menu Employés). Il peut tout mener.",
      timberWait:     "Tristan scie. Le bois ira sur la cale du lac, à Valley Town.",
      timberRaise:    "Une pièce t'attend sur la cale du lac. Va la monter (E).",
    },
    /* Hors-zip — REPLI DU CHEVRON QUAND LE CHAUDRON N'EST PAS ENCORE RAMASSÉ
       (demande de Guillaume, dictée mot pour mot). ⚠️ SEULE PHRASE DE `goal`
       QUI DÉPASSE VOLONTAIREMENT LE PLAFOND DE 80 SIGNES DES AUTRES : elle ne
       s'affiche qu'un temps, avant la toute première fois où le chaudron est
       ramassé dans le monde maléfique — jamais en régime permanent une fois
       la ferme équipée. Voir `starGoalText`, FermeGame.js. */
    cauldronPassage: "Fouillez les moindres recoins de cette forêt maudite et vous y trouverez un chaudron magique, mais restez vigilant.",
    /* hors-zip — L'INFOBULLE DES PUCES CLIQUABLES DU CHAPITRE 1. Une seule
       fonction, composée, jamais deux chaînes séparées qui pourraient finir
       par ne plus s'accorder (voir myStarFocusRef, FermeGame.js). */
    focusTip: (mine, shared) => (mine ? "Ton objectif personnel — reclique pour l'annuler" : "Viser ce trou en priorité, sans attendre les autres")
      + (shared ? " · un camarade vise le même" : ""),
    /* hors-zip — LE TOAST QUI ANNONCE LES PUCES CLIQUABLES, À PLUSIEURS
       SEULEMENT. Demande de Guillaume : sans lui, la fonctionnalité entière
       (myStarFocusRef, la puce cliquable ci-dessus) tenait sur une infobulle
       qu'il faut SURVOLER pour découvrir — donc jamais vue au doigt, et jamais
       vue par quelqu'un qui ne pense pas à passer la souris sur une puce déjà
       pleine. Un seul toast, une seule fois par partie (voir starFocusHintRef,
       FermeGame.js), déclenché dès que le chapitre 1 est actif ET qu'un
       camarade est là — jamais en solo, où la question ne se pose pas. */
    focusHint: "Vous êtes plusieurs. Clique une puce pour viser un trou en particulier.",
    /* HORS-ZIP — LE COMPTE À REBOURS DU GROS MÉTÉORE. Signalé par Guillaume :
       la chute semblait ne jamais arriver, faute d'affichage — le mécanisme
       (deux minutes de présence active en ville, voir STAR_TOWN_ACTIVE_MS
       dans quete.js) était déjà correct, il manquait juste d'être VU. Cette
       pastille ne s'affiche que côté hôte (lui seul tient l'horloge réelle,
       §3 de CLAUDE.md : on ne diffuse pas ce qui se déduit, mais ici rien ne
       se déduit chez l'invité, qui n'a pas cette horloge). */
    townFallCountdown: (mmss) => `Impact dans ${mmss} d'activité en ville.`,
    againTitle: "Prochaine étape",
    againClose: "Reprendre la quête",
    /* Le rappel nomme l'objet construit et traite zéro comme un vrai cas :
       « zéro morceau » était grammatical mais ne disait pas ce que le compteur
       changeait dans le monde. */
    again: (n, total) => n <= 0
      ? `Aucune des ${nfr(total)} pièces du bateau n'est encore montée. Les étoiles restent avec toi.`
      : `${nfr(n)} pièce${n > 1 ? "s" : ""} du bateau montée${n > 1 ? "s" : ""} sur ${nfr(total)}. Les étoiles restent avec toi.`,
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ AUDIT 2026-08-31 — CE QU'ELLE DIT PENDANT QU'ON JOUE. LE POSTE ÉTAIT VIDE
     ║ DEPUIS LE DÉCHANT (469).
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ INDEXÉ PAR LA CLÉ D'OBJECTIF, la même que `hud.goal` — donc la même source
     que le bandeau, jamais une seconde liste accrochée aux chapitres (449). Une
     clé sans phrase ici est un silence VOULU : elle ne parle pas tout le temps, et
     c'est ce qui donne du poids aux fois où elle parle.
     ⚠️⚠️ ELLE NE DIT JAMAIS QUOI FAIRE. Le bandeau répond à « qu'est-ce que je
     peux faire maintenant » ; elle dit ce qu'elle voit, ce qu'elle craint et ce
     qu'elle ne comprend pas de nous. Deux voix sur la même question auraient été
     deux réponses à comparer ; sur deux questions, c'est une scène.
     ⚠️ ET LE SECRET EST À ELLE AUSSI (§15.1) : c'est ELLE qui demande qu'on ne
     parle pas d'elle au maire. Le secret cesse d'être une règle de documentation,
     il devient une chose qu'un personnage veut. */
  frame: {
    /* Chapitre 1 — les huit trous. Le bateau n'existe pas encore ; elle cherche
       ses sœurs, et `farmImpactCool` est la première fois qu'il est question de
       fabriquer quelque chose. */
    farmImpacts:        "Elles sont tombées avec moi. Je les sens sous la terre, mais pas laquelle est où.",
    farmImpactTame:     "Celle-là est plus timide que moi. Fais comme si tu ne savais pas qu'elle est là.",
    farmImpactLight:    "Le bleu qu'elle veut ne pousse pas ici. Il faudra descendre le chercher.",
    farmImpactSimmer:   "Ça sent le sucre chaud. Elle viendra.",
    farmImpactCarry:    "Va vite, ça refroidit.",
    farmImpactLure:     "Elle a peur de tes mains. Il lui faut quelque chose qui brille plus fort.",
    farmImpactCool:     "Ce n'est pas une des nôtres — c'est du métal de ciel. Ça, ça se travaille.",
    /* Chapitre 2 — le cratère. `craterHot` couvre trois minutes d'attente pure. */
    craterHot:          "Elle est encore dedans. Laisse le trou refroidir.",
    /* 2026-09-02 (lot A) — LA VOIX DE LA PETITE ÉTOILE SUR LES TROIS NOUVEAUX
       ÉTATS. ⚠️ C'est elle qui EXPLIQUE le lien narratif que la mécanique pose :
       la lumière qu'on porte à la grande est celle de la petite. Sans ces trois
       phrases, « va chercher 80 bonbons » serait une corvée sans raison — et la
       raison est très exactement ce que Guillaume demande depuis le début (les
       petites aident à atteindre la grande). */
    craterFeed:         "Elle est vide. Ce qu'elle veut, c'est ma lumière à moi — descends la chercher.",
    craterFeedPay:      "Tu portes un peu de moi. Verse-le au bord, elle saura.",
    craterWake:         "Elle a de quoi brûler, mais rien ne bat. Frappe avec son cœur, pas plus vite.",
    crater:             "Celle-là nous a menées ici. C'est elle qui sait où on va.",
    craterAlone:        "Un seul dos ne suffira pas pour elle. Trouve-lui quelqu'un — ou quelque chose qui y ressemble.",
    /* 2026-09-02 (lot A2) — C'EST LA REINE QUI PARLE, et c'est elle qui apprend au
       joueur que la discrète existe : sans ces deux phrases, la sixième sœur
       apparaîtrait dans le bandeau sans que personne l'ait annoncée. */
    townShyAway:        "Une de mes sœurs est descendue en ville. Elle ne veut pas qu'on la voie.",
    townShy:            "Elle croit qu'un chapeau suffit à la cacher. Regarde qui ne bouge pas comme les autres.",
    /* 2026-09-03 (lot A3) — LA VERTE, PAR LA REINE. ⚠️ ELLE DIT CE QU'ELLE SENT,
       jamais où aller (règle du chapeau de `frame`) : le bandeau donne le signe,
       elle donne la raison de le chercher. Sans ces phrases, la cinquième sœur
       apparaîtrait dans le bandeau sans que personne ait dit qu'elle existe —
       c'est ce qu'on a corrigé pour la discrète au lot A2. */
    townGreenAway:      "La verte a pris la couleur des feuilles. Je ne la sens que de l'autre côté du rail.",
    townGreen:          "Elle est verte, alors elle se croit invisible dans un buisson. Un buisson qui remue sans vent, c'est elle.",
    townGreenLed:       "Je vais devant. Reste derrière moi, et regarde les plantes.",
    townWait:           "C'est de l'autre côté du rail que ça se passe maintenant.",
    townWaitThere:      "Reste près de moi. Personne ici ne me voit.",
    /* Chapitre 3 — LE CHANTIER. ⚠️ CHAQUE PHRASE RAMÈNE AU BATEAU, sans exception :
       c'est là que la quête se perdait, et une compagne qui philosophe pendant
       qu'on attend des planches ferait exactement le contraire de ce qu'on lui
       demande. Elle DIT L'ÉTAPE SUIVANTE à sa façon, elle ne médite pas. */
    engineer:           "Il nous faut des plans avant des planches. Va chercher l'ingénieur.",
    engineerTravel:     "Il arrive. Sans ses plans, ton bois ne sera que du bois.",
    engineerWork:       "Il dessine la coque. Quand il aura fini, on saura quoi demander à Tristan.",
    mayor:              "La cale est sur son quai : sans sa signature, personne ne montera rien dessus. Et ne lui parle pas de moi.",
    timberOrder:        "Tristan sait faire toutes les pièces — il lui faut du bois, et une raison.",
    timberWait:         "Il scie. Chaque trait, c'est un morceau de bateau en moins à attendre.",
    timberRaise:        "Elle est arrivée. Monte-la toi-même.",
  },
  guide: {
    go: "L'étoile reine prend la tête. Suis sa lumière.",
    offer: "L'étoile reine s'écarte du groupe. Elle veut te montrer le chemin.",
    stop: "L'étoile reine revient dans la constellation.",
    arrived: "L'étoile reine s'arrête ici. Le reste est à toi.",
    none: "Rien à chercher pour l'instant.",
    noQueen: "La grande étoile jaune n'est pas encore avec toi.",
  },
  chapter: {
    field:  "Chapitre Un — Les huit impacts",
    crater: "Chapitre Deux — Le cratère",
    /* ⚠️ ZIP 469 — trois chapitres au lieu de cinq. `build` remplace `note` :
       ce qui ferme la quête n'est plus une note trouvée, c'est un bateau fini. */
    build:  "Chapitre Trois — Le chantier",
    end:    "Le Bateau des Étoiles",
  },
  /* HORS-ZIP — L'OVERLAY DE VICTOIRE. Demande de Guillaume : une carte de
     félicitations pour les étapes difficiles du chapitre 3 (l'audience chez
     le maire, la commande à Kerguélen), qui restaient jusqu'ici sans le
     moindre repère à l'écran — seul un message de chat, vite noyé, disait
     qu'on venait de franchir la partie la plus dure de la quête.
     ⚠️ MÊME MISE EN SCÈNE QUE LA CARTE DE CHAPITRE (fondu, fermeture seule,
     même file d'attente `starShowCard`) : c'est la même chose, un texte plein
     écran qui marque un instant. Seul l'habillage change (`.win` en CSS). */
  win: {
    mayor:    { title: "Félicitations !", sub: "Le maire soutient votre projet." },
    engineer: { title: "Les plans sont prêts !", sub: "Kerguélen a dessiné le navire." },
  },
  fall: {
    agency: "L’Agence nationale d’astronomie avait prévu huit sites sur la ferme.",
    first: "Premier impact. Un site sur huit.",
    chain: "Deux autres fragments tombent coup sur coup.",
    aftershocks: "Cinq secousses encore, plus loin. Huit sites sont à explorer.",
    /* ⚠️ « d'est en ouest », comme l'anglais depuis le 448 : le sillon est plus
       profond à son bout ouest, donc la course s'y arrête. Le texte suit l'image. */
    line1: "Le ciel se déchire, d'est en ouest.",
    line2: "Cette fois, ce n’est pas un fragment.",
    line3: "Tous les oiseaux de la vallée s'envolent d'un coup.",
    /* ⚠️⚠️ ZIP 455 — CETTE PHRASE ÉTAIT DEVENUE FAUSSE LE JOUR MÊME OÙ ON L'A
       ENFIN AFFICHÉE. Elle disait « Personne ne sort regarder. Personne n'en dit
       un mot. » — or depuis ce zip toute la vallée l'attendait, et tous les PNJ
       ont un « ! » au-dessus de la tête à l'instant du contact. *Quand la fiction
       change, le texte qui la raconte fait partie de la livraison* (452).
       ⚠️ ET ELLE DIT MIEUX LE THÈME QU'AVANT : le silence n'est plus une absence,
       c'est un écart. Ils ont tous vu tomber la pierre ; pas un ne verra ce qui
       en est sorti. */
    quiet: "Tout le monde a vu tomber la pierre. Personne ne verra ce qu'il y avait dedans.",
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 458 — CE QUI TOMBE DANS LE CHAMP N'EST QU'UN ÉCLAT, ET ON LE DIT.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ DEMANDE DE GUILLAUME : « clairement faire comprendre que ce qui
       s'écrase à la ferme n'est qu'un fragment de la comète, mais que le vrai
       cratère est tombé quelque part autour de Valley Town ».
       ⚠️ LE CODE LE DISAIT DÉJÀ ET LE TEXTE, NON : `starFragments` fend la comète
       en vol depuis le 455, et on VOIT trois morceaux se séparer au-dessus du
       champ — mais aucune phrase ne reliait cette image à ce qu'on trouvait
       ensuite. Un joueur en concluait que tout était tombé chez lui, cherchait la
       suite dans ses champs, et ne prenait le train que parce que le bandeau le
       lui disait. *Une image qui n'est pas nommée ne raconte rien.*
       ⚠️ ELLE SE DIT À LA FERME SEULEMENT : en ville, on voit tomber le gros
       morceau, et lui annoncer qu'il n'a qu'un éclat serait faux. */
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 455 — LE TAMPON. LA PIERRE EST PUBLIQUE, L'ÉTOILE RESTE SECRÈTE.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ LA RÈGLE D'ÉCRITURE DE CE BLOC EST LA SEULE CHOSE À EN RETENIR, ET
     `verify-quete` LA TIENT : **aucune de ces phrases ne peut nommer l'étoile, ni
     dire où aller, ni dire quoi faire.** Les habitants parlent d'un CAILLOU
     annoncé par des astronomes ; ils ne savent rien d'autre, et ils ne sauront
     jamais rien d'autre. C'est ce qui permet à cette demande de coexister avec le
     thème du secret au lieu de le remplacer (voir l'en-tête de `quete.js`).
     ⚠️⚠️ LES `hint` SONT L'EXCEPTION QUI CONFIRME LA RÈGLE : ils annoncent une
     ÉTAPE À VENIR sans jamais dire qu'elle en est une. « Un ingénieur breton a
     posé ses valises » est un ragot de village ; il se trouve qu'il sera vrai. Un
     joueur qui a écouté a une minute d'avance, un joueur qui n'a rien écouté ne
     perd rien — c'est très exactement ce qu'on veut d'un indice, et c'est ce qui
     sépare un tampon JOUABLE d'un tampon décoratif.
     ⚠️ ET ILS SONT FIGÉS PAR PNJ (`starNerveSay`) : le même habitant redit
     toujours la même chose, donc on peut retourner le voir. Un tirage à chaque
     approche aurait fait une machine à phrases dont personne ne retient rien. */
  warn: {
    /* L'INVITE DE L'HÔTE. ⚠️ ELLE EST À LUI SEUL — c'est le seul panneau du jeu
       qui décide de quelque chose pour tout le monde, et le §3 est formel sur qui
       arbitre.
       ⚠️⚠️ ZIP 478 (audit 477, défaut #13) — « ENQUÊTE » DEVIENT « QUÊTE », ET CE
       N'EST PAS UN SYNONYME. Le libellé d'origine était celui de Guillaume mot pour
       mot, mais il datait de la quête CADASTRALE du 442, supprimée au 444 : on
       n'enquête sur rien ici, on répare un bateau. Un mot qui survit à la mécanique
       qu'il nommait ne décrit plus le jeu — il décrit le jeu d'avant, et le joueur
       est le seul à ne pas savoir lequel des deux il joue. */
    askTitle: "Commencer la quête « La Belle Étoile » ?",
    askBody: "Des astronomes annoncent une pluie d'astéroïdes au-dessus de la vallée. Si tu dis oui, la nouvelle se répand ce soir — et la nuit qui suit, quelque chose tombera.",
    askNote: "Tu peux dire non. On te le redemandera au crépuscule.",
    yes: "Oui",
    later: "Plus tard",
    laterToast: "Plus tard, alors. On te le redemandera au crépuscule.",
    /* LA CARTE D'ANNONCE, plein écran, sur fondu enchaîné. ⚠️ Elle ne dit PAS
       « quête commencée » : elle dit ce que la vallée apprend. Un panneau qui
       annonce une quête transforme une histoire en tâche. */
    cardTitle: "La Belle Étoile",
    cardSub: "Les astronomes ont prévenu. La vallée regarde le ciel.",
    chat: "Les astronomes ont prévenu la vallée : une pluie d'astéroïdes, cette nuit ou la prochaine.",
    /* L'AFFICHE. ⚠️ Elle se lit sur le tableau des nouvelles de Valley Town, qui
       existe depuis le 427 : zéro dessin, zéro message, et une raison d'aller en
       ville pendant le tampon. */
    boardTitle: "AVIS DE L'OBSERVATOIRE",
    boardBody: "Une pluie d'astéroïdes est attendue au-dessus de la vallée. Le risque est jugé ÉLEVÉ. Rentrez les bêtes. Ne restez pas sous les grands arbres. Ne regardez pas la lumière en face.",
    /* LES RUMEURS. ⚠️ De la peur, jamais un renseignement. */
    rumor: [
      "Les astronomes ont écrit à la mairie. Ils ont peur, eux aussi.",
      "Une pluie d'astéroïdes. C'est le mot qu'ils ont employé. Une pluie.",
      "J'ai rentré les bêtes deux heures plus tôt. On ne sait jamais.",
      "Ils disent que ça passera peut-être à côté. Peut-être.",
      "Je n'arrive plus à dormir. Je regarde le ciel toute la nuit.",
      "Le maire dit de rester calme. Il n'a pas l'air calme.",
      "Cette nuit, très loin, il y a eu un bruit. Personne n'a rien vu.",
      "Et si ça tombe sur les champs ? On recommencera, voilà tout.",
    ],
    /* LES INDICES. ⚠️ Chacun annonce une étape à venir, aucun ne le sait.
       ⚠️⚠️ ZIP 478 (audit 477, défaut #7) — TROIS DES SIX ENVOYAIENT VERS DES
       CHAPITRES SUPPRIMÉS AU 469 (la cloche fondue, la pie du verrier, le fond du
       lac). Un indice qui survit à son chapitre ne devient pas inoffensif : il
       envoie le joueur CURIEUX — celui qu'on veut — vers du décor muet, et c'est le
       seul joueur qui écoute les PNJ. Ils repartent vers les trois étapes encore
       vivantes qui n'avaient pas d'indice : la PLAQUE qu'on arrose, la CALE du lac,
       et TRISTAN. ⚠️ Les trois qui restent sont vérifiés vivants, pas supposés :
       l'ingénieur (chapitre 3), les lumières qui bougent (la chute), et le verre
       vert — qui décrit le bassin du grand cratère (s2.empty, craterPool), donc
       il annonce toujours quelque chose.
       ⚠️ ILS DISENT « BATEAU » ET JAMAIS « NAVIRE » : le mot de charpentier est
       banni par le banc du secret, celui du village ne l'est pas — et c'est le bon
       registre de toute façon. La pierre est publique, l'étoile reste secrète. */
    hint: [
      "Il paraît qu'un brillant ingénieur breton a posé ses valises à Valley Town.",
      "J'ai vu des étoiles bizarres dans le ciel, les nuits d'avant. Elles bougeaient.",
      "Mon grand-père arrosait les pierres tombées du ciel. Elles durcissaient noir.",
      "La cale du lac n'a pas vu une quille depuis vingt ans. Elle attend encore.",
      "Tristan dit qu'il saurait bâtir un bateau. Personne ne le lui a demandé.",
      "Quand une pierre brûlante tombe dans le sable, le sable devient du verre vert.",
    ],
  },
  /* ⚠️⚠️ ZIP 457 — POURQUOI ON REFROIDIT, ET CE QUE « VERS L'EST » VEUT DIRE.
     Retour de Guillaume après une vraie séance : le mini-jeu de l'arrosoir est
     agréable mais gratuit tant que rien ne dit pourquoi refroidir un bout
     d'étoile a un intérêt, et `east` était un vers énigmatique que même lui ne
     décodait plus. `tooHot` porte maintenant la raison AVANT le mini-jeu (un
     matériau pareil, une fois dur, vaut une proue increvable — une contrainte
     de CONSTRUCTION, pas un mystère gratuit), `got` la confirme APRÈS, et
     `east` dit clairement où aller (la ville) tout en plantant la graine du
     chantier des îles (§13 de CLAUDE.md) : les étoiles guideront un jour le
     navigateur. Un peu de magie, jamais au prix de la clarté — c'est le
     principe demandé. */
  s1: {
    coolTitle: "Fais-le refroidir",
    coolHint: "Garde la lueur dans le repère. Arrose à petits coups — un grand le fend.",
    coolCrack: "Crac. On recommence, plus doucement.",
    /* ⚠️⚠️ ZIP 478 (audit 477, défaut #6) — DEUX FAÇONS DE PERDRE, DEUX PHRASES.
       Les DEUX échecs par le haut (la surchauffe, et la manche qui s'achève hors
       du repère) rappelaient `coolHint`, c'est-à-dire LA CONSIGNE DE DÉPART. Or
       le cadre du canevas peint déjà `coolHint` en sous-titre en permanence : le
       joueur qui ratait voyait donc la MÊME phrase apparaître au pied de l'écran,
       à l'endroit où le jeu est censé lui dire ce qui vient de se passer. Il
       n'avait aucun moyen de savoir laquelle des deux fautes il faisait —
       mesuré : quatre manches d'affilée sans comprendre.
       ⚠️ LE PARTAGE EST MAINTENANT NET, ET C'EST LUI QUI COMPTE : le SOUS-TITRE
       porte la règle (permanente, on peut la relire), le PIED porte ce qui vient
       d'arriver (fugace). Une seule consigne à l'écran, jamais deux fois la même.
       ⚠️ ET CHAQUE FAUTE A AUSSI SON DESSIN : la fêlure avait déjà ses deux traits
       (458), la surchauffe a maintenant sa bouffée blanche — parce qu'un joueur
       qui regarde l'éclat ne lit pas le pied de l'écran au même instant. */
    coolBurn: "Elle repasse au blanc : tu n'arroses pas assez. Verse plus souvent.",
    coolMiss: "La manche s'achève hors du repère. Termine la descente dans l'anneau.",
    coolWin: "Le blanc devient orange, puis rouge, puis bleu. Ça ne siffle plus.",
    got: "La plaque noire et le bois de Tristan forment désormais une coque capable d'encaisser un choc immense.",
  },
  s2: {
    tooHot: "Le trou fume encore. Ce qui est au fond ne remontera pas.",
    empty: "Le cratère est vide. Du sable chaud, devenu du verre vert.",
    peek: "Quelque chose bouge au coin de l'œil. Tu regardes. C'est parti.",
    /* ╔═════════════════════════════════════════════════════════════════════
       ║ ZIP 456 — LES QUATRE ÉTATS DE LA POSTURE. UNE PHRASE PAR ÉTAT.
       ╚═════════════════════════════════════════════════════════════════════
       ⚠️⚠️ DEMANDE DE GUILLAUME : « on ne comprend pas si on fait les choses bien
       ou ce qu'il faut faire de ce cratère. » Le chapitre entier tenait sur une
       posture que rien ne commentait. Ces quatre phrases sont l'unique endroit du
       jeu qui répond en direct à « est-ce que je fais bien » — elles sortent de
       `starCalmStep` (une seule source, jamais deux listes) et s'affichent
       AU-DESSUS DU JOUEUR, pas au-dessus de l'étoile : l'étoile n'existe pas
       encore, c'est tout le sujet du chapitre.
       ⚠️ AUCUNE NE DIT CE QU'IL Y A AU FOND. Elles disent le GESTE, jamais la
       chose — le mystère du chantier n'est pas « quelle posture », il est
       « qu'est-ce que c'est » (§3 de `QUETE.md`). */
    calmHint: "Elle ne sort pas tant qu'on la regarde.",
    calmIn: "Descends jusqu'au fond du trou.",
    /* ⚠️⚠️ ZIP 476 (audit 2026-08-24, défaut #18) — `calmIn` NE VAUT QUE POUR LE
       CRATÈRE DE VALLEY TOWN, un vrai creux qu'on descend. `starCalmUi` sert
       aussi les cinq impacts de la FERME, de simples marques au sol : ce sont
       les mêmes états (« far » = pas encore assez près), pas le même décor. */
    calmNear: "Approche-toi de l'impact.",
    calmStill: "Ne bouge plus.",
    calmTurn: "Tourne-lui le dos.",
    calmHold: "Quelque chose remonte derrière toi.",
    calmBoth: "Tous les deux. Dos tourné. Ne bougez plus.",
    calmSolo: "Tout seul, c'est long. Reste retourné.",
    /* ╔═════════════════════════════════════════════════════════════════════
       ║ ZIP 479 — LES TROIS ÉTATS PROPRES À LA REINE (lot 3b, défaut 3).
       ╚═════════════════════════════════════════════════════════════════════
       ⚠️⚠️ SON GESTE N'EST PLUS CELUI DES PETITES : il faut DEUX présences, aux
       bords OPPOSÉS. Les trois états qui manquaient sont donc « il n'y a personne
       en face », « tu es au fond » et « vous êtes du même côté » — les trois seules
       façons de tout faire bien et de n'obtenir aucun résultat, c'est-à-dire les
       trois seules qui donneraient « le jeu est cassé ».
       ⚠️ LES QUATRE AUTRES ÉTATS RÉUTILISENT LES PHRASES DE LA POSTURE
       (`calmStill`, `calmTurn`, `calmHold`) : le geste est le même une fois qu'on
       est placé, et deux textes pour une seule chose auraient été deux textes à
       faire vieillir. */
    queenAlone: "Il faut quelqu'un en face. Un joueur — ou un épouvantail.",
    queenEdge: "Pas au fond : remonte sur la lèvre du cratère.",
    queenSide: "Du même côté, elle vous voit tous les deux. Va au bord d'en face.",
    /* ── LA LUMIÈRE BLEUE. ⚠️ ELLE DIT LE PRIX EN CHIFFRES : c'est le seul geste
       de la quête qui retire quelque chose au joueur, et un prix qu'on découvre en
       le payant est la définition du « le jeu propose et refuse » (426). */
    lightShort: (have, need) => `Il t'en faut ${nfr(need)} rapportés depuis la chute. Tu en as ${nfr(have)}.`,
    lightGiven: "La lumière bleue coule au fond du trou. Maintenant, tourne-toi.",
    /* ╔═════════════════════════════════════════════════════════════════════
       ║ 2026-09-02 (lot A) — `lightGiven` DISAIT « MAINTENANT, TOURNE-TOI »
       ║ AUX DEUX ÉTOILES, ET C'EST DEVENU FAUX POUR LA REINE.
       ╚═════════════════════════════════════════════════════════════════════
       ⚠️⚠️ C'est le défaut du 475 / 478 / 479 pris de vitesse : une phrase qui
       couvrait un geste en couvre soudain deux, et elle envoie faire l'étape
       d'APRÈS. La bleue se prend en se retournant, la reine demande encore un
       réveil — deux gestes, donc deux phrases, choisies par le lieu côté hôte
       (voir `starLightGiven`/`starQueenFed`, FermeGame.js).
       ⚠️ ELLE ANNONCE LE GESTE SUIVANT SANS DÉCRIRE LA MÉCANIQUE : l'anneau qui
       bat au-dessus du trou l'explique mieux qu'une phrase ne le ferait. */
    queenFed: "Les lumières coulent en elle. Elle a de quoi brûler — mais rien ne bat encore.",
    wokeHer: "Un battement. Puis un autre. Elle ouvre les yeux, et elle est jaune.",
    /* ⚠️ LE SEUL TEXTE QUI DÉCRIVE LA MÉCANIQUE, ET IL NE S'AFFICHE QU'UNE FOIS,
       À L'OUVERTURE DU GESTE : l'anneau fait le reste. Il dit la RÈGLE (frapper
       quand l'anneau touche la marque) et son piège (marteler ne sert à rien),
       parce que c'est très exactement ce qu'un joueur essaie en premier. */
    wakeHint: "Frappe quand l'anneau touche la marque. Marteler la fait retomber.",
    /* ── LE PLAT. ⚠️⚠️ AUCUNE NE NOMME UNE RECETTE : ce qu'on cuisine ne regarde
       personne, et l'inventer aurait demandé un ingrédient, donc un prix, donc un
       arbitrage que Guillaume n'a pas tranché. Le geste est le CHEMIN. */
    dishCook: "Le chaudron chauffe. Ça sent quelque chose qu'aucun livre ne donne.",
    dishSimmer: "Ça mijote.",
    dishReady: "C'est prêt, et ça fume.",
    dishTaken: "Tu portes le plat. Il refroidit à chaque pas.",
    dishPass: (who) => `${who} reprend le plat. Il est brûlant à nouveau.`,
    dishCooling: "Il refroidit. Presse le pas.",
    dishCold: "Le plat a refroidi. Elle n'a même pas levé la tête. Recommence.",
    /* ── DÉFAUT 10 : ELLE SE CACHE, ET LE JEU LE DIT UNE FOIS. ⚠️ « Elle
       disparaît » aurait été un constat d'affichage ; celle-ci est une raison, et
       c'est ce qui transforme une absence en intention. */
    hideOnly: "Elle glisse dans ton dos et s'éteint. Elle ne veut exister que pour toi.",
    /* ╔══════════════════════════════════════════════════════════════════════════
       ║ 2026-09-03 (lot A3) — LES INDICES DE LA REINE. C'EST ELLE QUI PARLE.
       ╚══════════════════════════════════════════════════════════════════════════
       ⚠️⚠️ LA TEMPÉRATURE ET LE CAP SONT DEUX PHRASES QU'ON ASSEMBLE, et ce n'est
       pas de la paresse : cinq températures × huit caps feraient quarante phrases
       à écrire, à traduire et à relire — c'est-à-dire quarante occasions de se
       tromper pour une information qui en porte deux. La reine dit ce qu'elle
       sent, puis d'où elle le sent.
       ⚠️ AUCUNE NE DONNE DE DISTANCE EN CASES : un nombre transformerait la piste
       en calcul, et Guillaume a demandé « chaud froid », pas un télémètre. */
    hintTemp: {
      burning: "Elle est là. À portée de main, et elle ne bouge plus.",
      hot: "Chaud. Elle est tout près — cherche une plante qui remue.",
      warm: "Tiède. Elle est dans ce coin de la ville.",
      cold: "Froid. Tu la cherches loin d'elle.",
      icy: "Glacé. Tu es à l'autre bout de la ville.",
    },
    hintWay: { n: "vers le nord", ne: "vers le nord-est", e: "vers l'est", se: "vers le sud-est",
               s: "vers le sud", sw: "vers le sud-ouest", w: "vers l'ouest", nw: "vers le nord-ouest" },
    /* ⚠️ ON ASSEMBLE ICI, PAS DANS LA VUE : deux fabriques de phrase (une par
       langue) qui vivraient dans `FermeGame.js` seraient un texte à trous rempli
       par du code, c'est-à-dire le défaut du 481 (« Scrutin dans Lui jours »). */
    hintSay: (temp, way) => `${temp} ${way}.`,
    hintLeft: (n) => n > 0 ? `Il reste ${n} indice${n > 1 ? "s" : ""}.` : "C'était le dernier indice. Demande encore, et je te mènerai.",
    hintLead: "Alors viens. Je passe devant — E pour t'arrêter, E pour repartir.",
    hintAway: "Elle n'est pas de ce côté du rail. Descends en ville d'abord.",
    /* ⚠️ ELLE SE TROUVE, ELLE NE SE GAGNE PAS : la phrase de la trouvaille dit
       ce qu'on a vu (une plante qui bougeait), pas ce qu'on a réussi. */
    greenGot: "Le buisson s'écarte tout seul. Elle était là depuis le début, verte sur vert.",
    noScarecrow: "Il te faut un épouvantail à planter. Il s'en achète un à la boutique.",
    /* ⚠️⚠️ ZIP 459 — LES DEUX PHRASES DE L'EFFORT, ET ELLES EXISTENT À CAUSE DU
       456 : *un geste continu qui ne rend rien ne se distingue pas d'un jeu
       bloqué.* Tenir une direction trois secondes en dérapant, c'est exactement
       ça — sauf que la jauge monte et que ces deux lignes disent laquelle des
       deux moitiés manque : garder le cap, puis ne pas lâcher.
       ⚠️ AUCUNE NE NOMME UNE TOUCHE. La direction, on la tient déjà ; nommer
       « ↑ » ferait croire à une commande neuve alors que le geste est le même
       que marcher (c'est le reproche du 456 à « E : ne plus bouger »). */
    slipHold: "Ça glisse. Garde le même cap, il va trouver une prise.",
    slipClimb: "Il tient. Ne lâche pas la direction.",
    meet1: "Celle-ci est plus grande que les autres. Sa lumière jaune remplit le cratère.",
    meet2: "Les deux petites étoiles de la ferme se rapprochent d'elle sans hésiter.",
    meet3: "L'étoile reine trace dans la poussière la silhouette d'un navire brisé.",
    /* ⚠️ « Elle n'en a que … » A ÉTÉ ÉCARTÉ : l'élision (« qu'un », « que deux »)
       demanderait une règle de grammaire dans une table de textes. « Elle en a
       un » dit la même chose et tient dans toutes les langues du fichier. */
    name: (n, total) => `Son bateau s'est cassé en tombant. ${Nfr(total)} morceaux. Elle en a ${nfr(n)}.`,
  },
  /* ╔══════════════════════════════════════════════════════════════════════════
     ║ ZIP 469 — CE QUI SURVIT DE `s3`, `s4` ET `s5` : LE COMPTE ET LA FIN.
     ╚══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ TROIS BLOCS DE TEXTE SONT PARTIS AVEC LE DÉCHANT, ET ILS PORTAIENT DEUX
     PHRASES QUI N'ONT RIEN À VOIR AVEC LE CHANT : le compte de morceaux qui monte
     (`got`), et **la résolution** — la seule scène de fin de toute la quête. Les
     laisser partir aurait rendu la fin MUETTE, ce qui est le défaut du 453 pris à
     l'envers : une scène sans texte au lieu d'un texte sans scène.
     ⚠️ `turn1..4` NE SONT PAS RESTÉES : elles racontaient le retournement (« il
     n'y a pas de cinquième, elle est tombée avant que son bateau ait une cloche »),
     qui n'existe plus. La scène `turn` est retirée avec elles. */
  ship: {
    got: (n, total) => `${Nfr(n)} morceaux sur ${nfr(total)}. Le bateau grandit.`,
    last: (n, total) => `${Nfr(n)} morceaux sur ${nfr(total)}. Il ne manque plus qu'une pièce.`,
  },
  /* ── LE RUBAN DE JALON (2026-09-01). ⚠️⚠️ IL NE DOUBLE PAS `ship.got` : le
     toast dit « le bateau grandit » PARTOUT, y compris à trois cents cases de
     la cale ; le ruban MONTRE la pièce sur le navire. Deux phrases pour deux
     rôles, jamais deux fois la même information — et c'est pour ça que le
     ruban ne compte pas, lui : il pointe.
     ⚠️ TROIS LIGNES COURTES, ET C'EST UN PLAFOND. Un accusé de réception qui
     tient quatre secondes se lit d'un regard ou ne se lit pas ; ce qui ne
     rentre pas ici n'a rien à y faire. */
  ribbon: {
    kicker: "Sur la cale",
    title: (name) => `${name} — en place`,
    /* La cinquième pièce ne compte plus : à ce moment-là il n'y a plus rien à
       compter, il y a un bateau. */
    last: "Le navire est entier.",
  },
  end: {
    end1: "Elle monte comme un ballon qu'on lâche. Doucement. Comme si elle avait toute la nuit.",
    /* ⚠️⚠️ 2026-08-31 — « IL FLOTTE ENFIN » ÉTAIT FAUX, ET C'EST LE TEXTE QUI AVAIT
       TORT, PAS LE DESSIN. Le placement du navire est délibérément une CALE à
       terre : `starShipPos` balaie jusqu'à une case libre, praticable et au bord
       de l'eau, `STAR_SHIP_WATER_MAX` bornant la distance à trois cases (voir sa
       note — « un navire posé au milieu d'un pré est un décor absurde »). Rien
       ne le met jamais à l'eau. On lisait donc, au moment le plus important de
       la quête, une phrase que l'écran contredisait. La coque prête à descendre
       dit la même fierté sans mentir — et elle prépare le départ d'Eduardo. */
    end2: "En bas, le bateau est entier, calé sur la grève, prêt à descendre. Il attend quelqu'un qui sache partir.",
    end3: "Le vent tombe. Plus personne ne dit rien.",
    gift: "Quelque chose d'elle est resté avec toi.",
    /* ⚠️ ZIP 479 — LA SEULE PHRASE DU JEU QUI NOMME DEUX JOUEURS. Elle ne se dit
       que si quelqu'un a vraiment tenu l'autre bord (ou porté le plat la moitié du
       chemin) : voir `found[*].with`. */
    together: (names) => `Ce qu'elle a reçu, elle l'a reçu à plusieurs mains : ${names}.`,
  },
  plan: {
    /* ── LE CONSEIL DE L'ÉTOILE. Demande de Guillaume : « sur conseil (guidé) de
       la première étoile récoltée dans le cratère ». C'est elle qui envoie, et
       elle le dit avec ses mots — elle ne connaît pas le mot « mairie ». */
    advise1: "Elle regarde la cale vide, au bord du lac. Elle secoue la tête.",
    advise2: "Elle ne sait pas comment on construit. Elle sait seulement à quoi ça ressemblait.",
    advise3: "Il faut quelqu'un qui dessine les bateaux. En ville, la grande maison où l'on demande.",
    /* ── LA MAIRIE. */
    hallIntro: "Un architecte naval ? Il en reste un, oui. Célestin Kerguélen. Il ne se dérange pas pour rien.",
    hallFee: (gold, crops, fish) => `Ses conditions : ${gold} or, ${crops} récoltes et ${fish} poissons. Payables d'avance.`,
    hallWhy: "Il dit qu'un plan se paie en une fois ou pas du tout. Il n'a jamais expliqué pourquoi.",
    hallSendBtn: "Faire venir l'ingénieur",
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 458 — LA TRANSACTION SE VOIT, SE COMPOSE, ET SE VALIDE.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ REPROCHE DE GUILLAUME : *« il me dit que je suis short alors que je
       crois tout avoir »*. Il avait raison de le croire : l'or se prend sur la
       CAISSE COMMUNE, les récoltes et les poissons dans SON SAC — trois
       provenances différentes, aucune écrite nulle part, et un refus d'une seule
       ligne (« il te manque de quoi payer ») qui ne disait ni QUOI ni COMBIEN.
       ⚠️ Ces libellés sont donc au nombre de trois familles : ce qu'on POSE sur
       la table (`dealHave`), ce qui MANQUE (`dealShort`), et ce que ça VEUT dire
       (`dealFrom*`). Aucune ne remplace l'arbitrage de l'hôte : il refuse
       toujours, mais il ne refuse plus en silence. */
    dealTitle: "La transaction",
    dealAdd: "Ajouter",
    dealAdded: "Posé sur la table",
    dealClear: "Tout reprendre",
    dealValidate: "Valider la transaction",
    dealGold: "Or",
    dealCrops: "Récoltes",
    dealFish: "Poissons",
    dealFromPurse: "caisse commune",
    dealFromBag: "ton sac",
    dealFromBagPool: "ton sac + réserve commune",
    dealHave: (have, need) => `${have} / ${need}`,
    dealShort: (n, what) => `Il manque ${n} ${what}.`,
    dealReady: "Kerguélen compte. Tout y est.",
    dealNotReady: "Il ne prendra pas la moitié. Complète, ou reviens plus tard.",
    hallPoor: "Il te manque de quoi payer. Il ne fera pas crédit.",
    hallSent: "C'est envoyé. Il prendra le premier train.",
    hallTravel: (d) => `Kerguélen est en route. Il arrive dans ${d}.`,
    hallWork: (d) => `Kerguélen dessine, sur la grève. Il rendra ses plans dans ${d}.`,
    hallReady: "Kerguélen a rendu ses plans et il est reparti.",
    /* ── L'INGÉNIEUR. Il est sec, précis, et il ne pose aucune question — c'est ce
       qui le rend supportable dans une histoire secrète. */
    engName: "Célestin Kerguélen",
    engRole: "architecte naval",
    engHello: "Ne me racontez rien. Montrez-moi la cale et laissez-moi travailler.",
    engWork: (d) => `Il mesure, il rature, il recommence. Encore ${d}.`,
    engBubble: "…et si la quille porte, le reste suivra.",
    /* ⚠️ ZIP 454 — CES DEUX PHRASES COMPTENT, DONC CE SONT DES FONCTIONS. Écrites
       « cinq pièces », elles auraient été la faute du 452 commise par le zip qui
       vient d'écrire la règle : un compteur ajouté ne recompte pas les phrases déjà
       écrites. `verify-quete` les a refusées à la première exécution. */
    /* ⚠️⚠️ ZIP 478 — « DANS CET ORDRE » DÉCRIVAIT LA FILE D'ATTENTE SUPPRIMÉE.
       Kerguélen ne dicte plus une séquence : il rend une LISTE, et chaque pièce
       demande du bois plus une chose que la ferme produit. C'est ce qui remplace
       les sabliers — la durée du chantier devient une fonction de la ferme, pas
       une constante (audit 477, écart n°1). */
    engDone: (total) => `Voilà. ${Nfr(total)} pièces, et ce qu'il faut pour chacune. Trouvez-vous un bon bûcheron.`,
    engGone: "Il a plié ses feuilles et il est parti sans se retourner.",
    /* ── LE PLAN. */
    ready: "Les plans sont à toi. Ouvre-les (P) pour voir le bateau.",
    openBtn: "📐 Le plan",
    panelTitle: (name) => `📐 Plans de construction — ${name}`,
    panelHint: (total) => `${Nfr(total)} pièces. Leur état suit directement les commandes de Tristan et la cale.`,
    panelAtLake: "Déplie-le au bord du lac : le bateau apparaîtra sur sa cale.",
    lakeToast: "Tu déplies le plan devant la cale. Le bateau se dessine dans l'air, en entier.",
    lakeClose: "Tu replies le plan. Le bateau s'efface.",
    none: "Tu n'as pas de plan. Personne ne sait à quoi ce bateau ressemblait.",
    /* ── LES CINQ PIÈCES. ⚠️ UN NOM DE PIÈCE, PAS UNE DESCRIPTION : elles sont
       lues dans un tableau de commande, à côté d'un prix et d'une durée. */
    part: (k) => ({
      hull: "Le bordé de la coque", rudder: "Le safran et sa barre",
      mast: "Le mât", sail: "La vergue", bell: "La chaise de cloche",
    }[k] || k),
    progressTitle: "Progression de la construction",
    progressPart: (k) => ({
      hull: "Coque", rudder: "Gouvernail", mast: "Mât", sail: "Voile", bell: "Cloche",
    }[k] || k),
    progressState: (state) => ({
      done: "ASSEMBLÉ", ready: "À MONTER", building: "EN FABRICATION",
      available: "À COMMANDER", locked: "À VENIR",
    }[state] || state),
    progressDetail: (state, detail) => state === "done" ? "En place sur la cale."
      : state === "ready" ? "Bois livré ; montage sur la cale."
      : state === "building" ? `Tristan travaille · ${detail}`
      : state === "available" ? detail
      : detail === "noPlan" ? "Plans nécessaires."
      : detail === "noMayor" ? "Accord du maire nécessaire."
      : detail === "noShard" ? "Éclat correspondant à retrouver."
      : "Étape encore verrouillée.",
    progressNext: (part) => `Prochaine transformation visible : ${part}.`,
    progressComplete: "Construction terminée : toutes les pièces sont sur la cale.",
    /* ── TRISTAN. */
    orderTitle: (name) => `🪵 Le chantier de ${name}`,
    /* ⚠️⚠️ ZIP 478 — CETTE PHRASE DÉCRIVAIT LA RÈGLE QU'ON VIENT DE SUPPRIMER.
       « Une pièce à la fois, et il ne commence pas la suivante avant d'avoir fini »
       était vrai, et c'était très exactement les 24 minutes de file d'attente que
       l'audit 477 a chiffrées. Les cinq berceaux se commandent maintenant ensemble ;
       ce qui limite n'est plus l'horloge, c'est la réserve. */
    orderHint: "Il peut mener les cinq de front. Ce qui manque, ce n'est plus le temps : c'est la réserve.",
    /* ⚠️ ZIP 478 — TROIS LIGNES, JAMAIS QUATRE (voir `STAR_TIMBER`). Le troisième
       terme est vide pour le mât, qui n'est que du bois — et la phrase le supporte
       sans cas particulier parce que l'appelant ne passe rien. */
    orderCost: (wood, d, extra) => `${wood} bois${extra ? ` · ${extra}` : ""} · ${d} de travail`,
    /* ⚠️ LE NOM DE LA CHOSE EN PLUS SE DÉRIVE DE LA TABLE, il n'est pas recopié :
       `STAR_TIMBER` porte `{kind, idx, n}`, cette fonction porte les mots. Deux
       listes auraient divergé au premier réglage (§8 de CLAUDE.md). */
    extraName: (ex) => !ex ? "" :
      ex.kind === "stone" ? `${ex.n} pierre`
      : ex.kind === "fish" ? `${ex.n} poissons`
      : ex.kind === "product" ? `${ex.n} ${["œufs", "laits de chèvre", "laine", "truffes", "laits"][ex.idx | 0] || "produits"}`
      : "",
    extraWhy: (ex) => !ex ? "" :
      ex.kind === "stone" ? "le lest, au fond de la coque"
      : ex.kind === "fish" ? "l'huile qui graisse la barre"
      : (ex.idx | 0) === 2 ? "la toile de la voile"
      : "la colle et le vernis",
    orderPoorExtra: (n, what) => `Il manque ${what}. ${n} en tout, dans la réserve ou dans ton sac.`,
    orderBtn: "Commander",
    orderSent: (part, d) => `${part} : Tristan s'y met. Ce sera prêt dans ${d}.`,
    /* ⚠️⚠️ ZIP 459 — CE QU'IL DIT EN RECEVANT LA COMMANDE, au-dessus de sa tête et
       pendant six secondes. Demande de Guillaume : « rends plus explicite la
       commande auprès de Tristan ». Une ligne de chat passe et se perd ; une bulle
       sur SA tête relie la dépense (140 bois) à quelqu'un.
       ⚠️ IL NOMME LA PIÈCE. « Je m'y mets » tout seul laisserait le joueur se
       demander laquelle des cinq — et c'est la question qu'il se pose, puisqu'il
       vient de choisir dans une liste. */
    tristanGo: (part) => `${part} ? Compte sur moi. J'attaque tout de suite.`,
    orderPoor: (wood) => `Il faut ${wood} bois dans la réserve. Abats des arbres, ou laisse-le en abattre.`,
    orderWait: (d) => `en cours — ${d}`,
    orderDone: "✅ livrée",
    /* ⚠️ CHAQUE REFUS DIT SA RAISON. Un bouton grisé sans explication, c'est « le
       jeu propose et refuse » (426) avec un pas d'avance. */
    blockNoPlan: "🔒 Il faut d'abord les plans",
    /* ⚠️ ZIP 480 — sans ce libellé, `noMayor` retombait sur `blockNoPlan` et le
       panneau réclamait des plans qu'on a déjà dans la poche. Un repli poli qui
       affirme une chose fausse est pire qu'un bouton muet (448). */
    blockNoMayor: "🔒 Le quai est public : il faut l'accord du maire",
    /* ⚠️⚠️ ZIP 478 — `blockPrev` (« la pièce précédente d'abord ») EST SUPPRIMÉE
       AVEC LA RÈGLE QU'ELLE EXPLIQUAIT, et pas laissée « au cas où » : une phrase
       sans chemin d'affichage est un lecteur qui ne s'exécute jamais (leçon 453).
       Sa place est prise par l'état qui la remplace : le bois est arrivé, il attend
       un marteau sur la cale. */
    blockRaise: "🔨 Livrée — va la monter sur la cale",
    blockNoShard: "🔒 Cette pièce n'est pas encore disponible",
    /* ⚠️ ZIP 478 — LIVRER N'EST PLUS POSER. Tristan dépose le bois au pied de la
       cale ; c'est le joueur qui monte la pièce, au marteau. Les deux phrases sont
       donc deux ÉVÉNEMENTS distincts, à deux moments différents et souvent par deux
       personnes — écrire une seule phrase pour les deux serait le défaut du 475
       (une phrase pour plusieurs états) rejoué sur le chantier. */
    delivered: (part) => `${part} — le bois est sur la cale. Il ne manque qu'un marteau.`,
    raised: (part, who) => `${part} — ${who} vient de la poser. Le bateau grandit pour de bon.`,
    raiseTitle: (part) => `🔨 Monter ${part}`,
    raiseSub: (n, total) => `coup ${n} sur ${total}`,
    raiseHint: "Frappe quand le maillet passe sur la zone claire. Un coup à côté ne compte pas.",
    raiseWin: "La pièce est en place. Elle ne bougera plus.",
    raiseFail: "Le bois a glissé. Reprends-le calmement.",
    lastOne: "La dernière pièce est en place. Le bateau est fini.",
    noTristan: "Personne à la ferme ne sait travailler le bois comme ça.",
    unbuilt: (n, total) => `La cloche a répondu, mais il manque encore du bois : ${n} pièces sur ${total}.`,
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ LOT E — LE SCIAGE CHEZ TRISTAN.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️ TOUT CE QUE LE JOUEUR LIT PENDANT LA MANCHE EST ICI, y compris les quatre
     verdicts : `scierie.js` ne connaît que des CLÉS (« perfect », « bind »),
     parce que c'est l'hôte qui les rejoue et qu'un arbitre ne doit pas dépendre
     d'une langue. C'est la même séparation que `maire.js`.
     ⚠️ LA PHRASE D'AIDE DIT LA RÈGLE ENTIÈRE EN UNE LIGNE, et elle le doit : le
     coincement est la seule sanction du jeu qui punisse un geste ACTIF, et un
     joueur qui ne sait pas pourquoi sa planche casse conclut que c'est aléatoire. */
  saw: {
    title: (part) => `${part} — au trait de scie`,
    him: (name) => `${name} cale le madrier sur les chevalets et te tend l'autre poignée.`,
    himSide: "lui",
    usSide: "toi",
    planks: (n, total) => `planche ${Math.min(n + 1, total)} sur ${total}`,
    broken: (n, max) => `${n} planche${n > 1 ? "s" : ""} fendue${n > 1 ? "s" : ""} sur ${max}`,
    combo: (n) => `${n} traits d'affilée`,
    stress: "Ce que la planche encaisse",
    pull: "TIRER",
    hint: "Tire quand la lame revient de son côté. Tirer pendant qu'il tire coince la lame.",
    quit: "← Laisser tomber",
    flat: "L'atelier ne s'affiche pas sur cette machine, mais la scie fonctionne : suis la lame sur la piste.",
    camHint: "Glisse pour regarder autour · Espace ou clic pour tirer",
    view: { poste: "\u{1FA9A} au poste", face: "\u{1F464} en face", atelier: "\u{1F3DA} l'atelier" },
    verdict: {
      perfect: "PARFAIT", good: "BON", weak: "MOU", bind: "ÇA COINCE !",
      dead: "", plank: "PLANCHE !", break: "ELLE SE FEND !",
    },
    /* ── CE QU'ON LIT EN SORTANT. ⚠️ LA NOTE EST TRADUITE EN MOTS, PAS EN
       POURCENTAGE : « 62 % » ne dit pas si c'est bien, et le joueur n'a aucun
       barème en tête à sa première manche. */
    grade: (n) => ["Il reprendra tout au rabot.", "Ça ira.", "Du beau travail.", "Du travail d'atelier."][n | 0] || "",
    stars: (n) => "★".repeat(n | 0) + "☆".repeat(3 - (n | 0)),
    win: (part, d) => `${part} : le bois est débité. Ce sera prêt dans ${d}.`,
    faster: (pct) => `Trait franc : ${pct} % de temps gagné sur la pièce.`,
    slower: (pct) => `Trait hésitant : ${pct} % de temps en plus.`,
    extraWood: (n) => `${n} bois partis dans les planches fendues.`,
    lost: "Trois planches fendues. La scie retourne au mur — rien n'a été prélevé, tu peux recommencer.",
    quitToast: "Tu reposes la poignée. Aucune commande n'est passée.",
    /* ⚠️ CE REFUS EXISTE PARCE QUE L'HÔTE REJOUE (voir `starTimberSaw`) : si sa
       manche ne finit pas comme la nôtre, il refuse — et il doit le DIRE, sinon
       le joueur voit un bouton qui ne fait rien. */
    refused: "La commande n'a pas été enregistrée. Reprends la scie.",
  },
  /* ⚠️ ZIP 453 — LE NAVIRE PREND LA MER AVEC EDUARDO (décision de Guillaume).
     Ces deux phrases REMPLACENT `voyagerDeparted` / `voyagerReturned` une fois
     la quête finie : elles ne coûtent donc pas un `send()` de plus, elles
     changent celui qui partait déjà (§3 de `CLAUDE.md`). */
  sail: {
    away: (d) => `Eduardo emmène le bateau des étoiles au large. Il veut voir ce qu'il y a de l'autre côté (retour dans ${d}).`,
    back: (goods) => `Le bateau des étoiles est rentré. Eduardo rapporte : ${goods}.`,
  },
  /* ⚠️⚠️⚠️ 2026-08-31 — LA PHRASE DU CHAT SORT DU MENU DÉVELOPPEUR, PARCE QU'ELLE
     N'EST PAS UN OUTIL. `STAR_FR.dev` POINTE SUR `STAR_EN.dev` (voir sa note) et
     c'est un choix assumé : un outil ne se traduit pas. Mais `dev.chat` était
     DIFFUSÉ — `broadcastChat` l'envoie à tout le salon — donc l'autre joueur,
     qui n'a jamais ouvert le menu, lisait « Guillaume touched the star quest »
     en plein milieu d'un jeu français. Une règle juste appliquée une clé trop
     loin. La PHRASE est donc ici, traduite ; le LIBELLÉ du bouton reste anglais
     et cité tel quel, parce que c'est le nom d'un outil et qu'il faut pouvoir le
     retrouver dans le menu. */
  devChat: (who, what) => `${who} a touché à la quête de l'étoile : ${what}.`,
  trace: {
    dawnBell: "La vieille cloche sonne une fois à l'aube. Elle a toujours fait ça, paraît-il.",
    newStar: "Il y a une étoile de plus au-dessus de la vallée. Une brillante. Elle vient du lac.",
    craterPool: "Le cratère a refroidi en bassin de verre vert. Il luit un peu la nuit.",
  },
  /* ⚠️⚠️ LE MENU DÉVELOPPEUR RESTE EN ANGLAIS, MÊME DANS CE BLOC, ET C'EST VOULU :
     c'est un OUTIL, pas du jeu. Le traduire donnerait deux libellés à maintenir pour
     un écran que seuls Guillaume et moi ouvrons — et le 442 l'avait déjà fait
     bilingue pour rien. On pointe donc la même table. */
  dev: null,        // rempli juste après, depuis STAR_EN (voir la note)
  chat: {
    start: "Quelque chose est tombé du ciel.",
    found: (who, n, total) => `${who} a trouvé un morceau. ${nfr(n)} sur ${nfr(total)}.`,
    chapter: (t) => `${t}`,
    crater: (who) => `${who} a apprivoisé l'étoile reine.`,
    // 2026-09-02 (lot A2) — la chasse s'arrête pour TOUT LE MONDE quand elle est
    // repérée : c'est ce qui justifie une ligne de chat (voir la note côté hôte).
    shySpotted: (who) => `${who} a démasqué la petite étoile au chapeau.`,
    /* 2026-09-03 (lot A3) — même exception motivée que `shySpotted` : la chasse
       s'arrête pour TOUT LE MONDE, et sans cette ligne l'autre joueur continuerait
       de fouiller les buissons d'un quartier vide. */
    greenTracked: (who) => `${who} a débusqué la petite étoile verte dans son buisson.`,
    tamed: (who) => `${who} a apprivoisé une petite étoile.`,
    /* ⚠️⚠️ ZIP 479 — LE SECOND JOUEUR EST NOMMÉ, ET C'EST LA MOITIÉ DU DÉFAUT
       « il ne reçoit rien » de l'audit 477. Il a tenu l'autre bord du cratère (ou
       porté le plat la moitié du chemin) et le chat annonçait le geste sous le
       seul nom de l'autre. Une variante à deux noms coûte une ligne ; ne pas
       l'écrire coûtait la seule chose qu'un second joueur emportait de la scène. */
    /* ⚠️ ZIP 479 — LE CHAUDRON SE DIT, L'OFFRANDE NON. Ce qui part au chat est ce
       dont l'AUTRE joueur a besoin pour agir : un plat qui mijote, il peut aller le
       chercher. La lumière bleue est un geste privé entre un joueur et une étoile,
       et l'annoncer aurait volé la seule scène intime de la quête. */
    cooking: (who) => `${who} met quelque chose au chaudron. Ça sent l'étoile.`,
    craterBoth: (a, b) => `${a} et ${b} ont apprivoisé l'étoile reine, chacun d'un bord.`,
    tamedBoth: (a, b) => `${a} et ${b} ont apprivoisé une petite étoile, à eux deux.`,
    /* ⚠️ ZIP 469 — `dug` REMPLACE `lean` ET `duet`. C'est la seule annonce de chat
       que la fouille produise, et elle ne dit JAMAIS ce qu'il y avait dedans :
       l'autre joueur apprend qu'un trou est retourné, il va voir lui-même. */
    dug: (who, left) => left > 0
      ? `${who} a fouillé un cratère. Il en reste ${nfr(left)}.`
      : `${who} a fouillé le dernier cratère de la ferme.`,
    /* ⚠️ ZIP 453 — « Le bateau a pris la mer » ÉTAIT FAUX : il restait à quai.
       Il est fini ; il partira avec Eduardo (voir `sail`). */
    done: "Le bateau est fini. L'étoile est rentrée.",
  },
  /* ⚠️ ZIP 479 — LE BOUTON DU CHAUDRON. Il nomme le plat sans donner de recette :
     ce qu'on met dedans ne regarde personne, et l'inventer aurait demandé un
     ingrédient, donc un prix, donc un arbitrage qui n'a pas été tranché. */
  cauldronBtn: "🍲 Cuisiner le plat de l'étoile",
  prompt: (k) => ({
    /* ⚠️⚠️ ZIP 469 — `impact` EST LA MÊME INVITE SUR LES CINQ CRATÈRES, ET C'EST
       LA CORRECTION DE FOND DE CETTE PASSE. Avant, `tame` et `material`
       s'affichaient AVANT la fouille : les deux cratères vides se reconnaissaient
       donc à leur invite, et on ne les ouvrait jamais. Elles ne servent plus qu'une
       fois le trou retourné. */
    impact: "E : fouiller le cratère",
    impactDig: "Fouille en cours…",
    /* ⚠️⚠️ ZIP 476 (audit 2026-08-24, défaut #19) — CETTE INVITE S'AFFICHE UNE
       FOIS L'IMPACT VIDÉ (voir `starNearby`, la branche `Q.starHas` juste après
       `Q.starDug`) : il n'y a plus rien à examiner, `E` ne fait plus que répéter
       `farm.seen`. « E : examiner les débris » promettait un geste que le trou
       ne peut plus rendre — même défaut que `impact`/`material` avant le 469,
       sur l'état d'après plutôt que d'avant. Sans « E : », comme `impactDig`
       juste au-dessus : les deux sont des CONSTATS, pas des invites. */
    impactSeen: "Site déjà fouillé",
    material: "E : examiner la matière noire",
    tame: "Tourne-lui le dos, ne bouge plus (E : pourquoi ?)",
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 479 — LES SIX INVITES DES DEUX NOUVEAUX VERBES.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️ MÊME RÈGLE QU'AU 456 : une invite nomme la TOUCHE quand il y en a une, et
       n'en nomme pas quand le geste est une posture ou une attente. `dishWait` est
       un CONSTAT, comme `impactDig` — sans « E : », parce qu'il n'y a rien à
       presser et qu'un joueur qui presse pour rien croit sa touche cassée. */
    light: "E : lui offrir de la lumière bleue",
    warm: "Elle attend quelque chose de chaud (E : pourquoi ?)",
    // 480 bis — la blanche : pas de touche non plus (une posture, la
    // proximité), même discipline que `tame`/`warm`.
    lure: "Elle se sauve sans la fiole (E : pourquoi ?)",
    cook: "E : cuisiner le plat de l'étoile",
    dishWait: "Ça mijote…",
    dishTake: "E : prendre le plat encore fumant",
    dishPass: "E : reprendre le plat",
    dishGive: "E : lui donner le plat",
    effigy: "E : planter l'épouvantail au bord",
    /* ⚠️⚠️ ZIP 456 — LE CRATÈRE NE PROMET PLUS UNE TOUCHE. « E : ne plus bouger »
       décrivait le seul geste du jeu qui n'A PAS de touche, avec le préfixe de
       toutes celles qui en ont une : le joueur pressait E, lisait deux phrases, et
       il ne se passait rien — donc il croyait la touche cassée. C'est le défaut du
       426 (« le jeu propose et refuse ») retourné : ici il proposait la mauvaise
       CHOSE. L'invite dit maintenant la posture, et garde E pour ce que E fait
       vraiment — expliquer POURQUOI. */
    /* ⚠️⚠️ ZIP 479 — LE CRATÈRE DEMANDE DEUX BORDS, DONC SON INVITE LE DIT. Elle
       disait la posture d'une seule personne, ce qui reste vrai et ne suffit plus :
       tout faire juste, tout seul, au même bord, ne donnait RIEN et n'expliquait
       rien — le « le jeu propose et refuse » du 426 sur la scène finale du
       chapitre 2. */
    crater: "Chacun un bord, dos à dos (E : pourquoi ?)",
    craterHot: "E : attendre que ça refroidisse",
    /* 2026-09-02 (lot A) — DEUX INVITES, DEUX TOUCHES RÉELLES. ⚠️ Contrairement à
       `crater` juste au-dessus (une posture, pas une touche), ces deux-là FONT
       quelque chose quand on presse E — donc elles le disent, règle du 456. */
    feed: "E : lui offrir la lumière bleue",
    wake: "E : la réveiller",
    /* 2026-09-02 (lot A2) — LA SEULE INVITE DE LA QUÊTE QUI SOIT UNE RÉCOMPENSE :
       la voir, c'est l'avoir. Elle ne s'affiche que si l'on est assez près, donc
       la lire signifie qu'on a déjà gagné la chasse. */
    shy: "E : lui dire que tu l'as reconnue",
    /* 2026-09-03 (lot A3) — MÊME FAMILLE QUE `shy` : la lire, c'est avoir gagné.
       Elle nomme le BUISSON et pas l'étoile, parce que c'est un buisson qu'on a
       sous les yeux — on ne l'a pas encore vue. */
    track: "E : écarter le feuillage",
    engineer: "E : parler à l'ingénieur",
    /* ⚠️ ZIP 478 — LA CALE. Elle nomme la TOUCHE et le GESTE (règle du 455 :
       OÙ, QUOI, COMMENT), et pas la pièce : le mini-jeu la nomme deux dixièmes de
       seconde plus tard, et une invite qui changerait de mot à chaque pièce
       clignoterait pendant qu'on tourne autour du chantier. */
    raise: "E : monter la pièce sur la cale",
  })[k] || "E",
};

/* ⚠️ `STAR_FR.dev` POINTE SUR `STAR_EN.dev`, IL N'EN EST PAS UNE COPIE. Une copie
   aurait divergé au premier bouton ajouté, et personne ne s'en apercevrait — c'est
   la divergence en attente du §8 de `CLAUDE.md`, sur le seul écran que le joueur ne
   voit jamais, donc celui où elle vivrait le plus longtemps. */
/* ⚠️ ZIP 453 — voir la note de `NUM_FR` : les nombres de morceaux ne s'écrivent
   plus dans une phrase, ils arrivent en paramètre. */
const NUM_EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const nen = (n) => NUM_EN[n | 0] || String(n | 0);
const Nen = (n) => { const s = nen(n); return s.charAt(0).toUpperCase() + s.slice(1); };

const STAR_EN = {
  title: "The Star Boat",
  net: {
    hostAway: "The host is in the background, some residents may slow down.",
  },
  farm: {
    mapImpact: (n) => `Impact ${n}`,
    mapImpactSeen: (n) => `Impact ${n} — searched`,
    seen: "This impact site has already been searched.",
    starPeek: "A little light shrinks into the crater whenever you look at it.",
    /* ⚠️ ZIP 479 — voir la note française : c'est une demi-minute depuis le 478. */
    tameSolo: "Turn your back and keep still. Alone, count half a minute.",
    tameDuo: "There are several of you on the farm. Ten seconds without looking will do.",
    material1: "Under the ash: a black plate, smooth only along the break.",
    material2: "It took the whole impact without passing the blow into the soil beneath.",
    material3: "Wood knows how to bend; this matter knows how to hold. Together, they could endure far more.",
    materialKeep: "You keep the plate. It has no use yet, but it will.",
  },
  /* ── LE PISTEUR. Une icône, des pastilles, UNE phrase. Jamais deux. */
  dig: {
    hint: "Stay still: he's scraping the ash away.",
    blocked: "The search stops: an announcement is on screen. Close it (Esc) to start again.",
    stopped: "You stood back up. The crater is still there.",
    titleStarLight: "A blue star.",
    titleStarWarm: "A pink star.",
    titleStarLure: "A white star.",
    titleMaterial: "A black plate.",
    titleEmpty: "Nothing.",
    bodyStarLight: "A small blue light huddles at the bottom the moment you look at it.",
    bodyStarWarm: "A small pink light. It does not shrink back: it sniffs towards you.",
    // hors-zip — see the FR block: she dives underground on the spot now, not sideways.
    bodyStarLure: "A small white light. It dives underground the moment you approach empty-handed.",
    bodyMaterial: "Under the ash: smooth only where it broke. The crust has set; the core still burns.",
    bodyEmpty: "Warm ash, glassed sand, and nothing inside. Not every light was hiding something.",
    /* ⚠️ ZIP 479 — voir la note française : l'overlay enseigne le geste, et il
       n'est pas le même selon la couleur. */
    nextStarLight: "It will not come out while anyone watches — and it is cold. Offer it blue light: 60 candies from the escape run, brought back since the fall.",
    nextStarWarm: "Quiet does nothing for this one. It comes to heat: cook something at the cauldron and carry it over before it goes cold.",
    nextStarLure: "It flees bare-handed. It needs a Star Essence: search the corners of the evil world, you'll find a pile of comet shards there — white and violet, glowing. Bring them with an amethyst to the cauldron to prepare it, then come back: with the vial, it will come on its own. Stay alert.",
    nextMaterial: "It has to cool all the way through before you can touch it.",
    nextEmpty: "One site fewer to rule out.",
    left: (n) => n > 0
      ? `${Nen(n)} crater${n > 1 ? "s" : ""} left to search on the farm.`
      : "All eight farm sites have been searched.",
  },
  hud: {
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 449 — UNE PHRASE PAR OBJECTIF, PLUS UNE PAR CHAPITRE.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ CES CINQ PHRASES ÉTAIENT CLASSÉES PAR CHAPITRE, ET DEUX CHAPITRES SUR
       CINQ EN CONTIENNENT PLUSIEURS : le bandeau redisait « Find where the rest
       of it fell. » longtemps après qu'on ait sorti l'étoile du cratère. Elles
       sont maintenant classées par OBJECTIF et choisies par `Q.starGoalKey`,
       qui lit la même liste que le chevron.
       ⚠️ ET ELLES NOMMENT L'ENDROIT, C'EST TOUT LE CHANTIER (demande de
       Guillaume : « moins mystérieux, plus guidant, sinon le jeune public va
       abandonner »). La règle qu'on se donne : **une phrase de bandeau dit OÙ
       et QUOI, jamais pourquoi.** Le mystère reste entier dans les bulles et
       dans les scènes, qui sont l'endroit où il fait plaisir ; il ne coûte plus
       une demi-heure d'errance et un aller-retour en train pour rien.
       ⚠️⚠️ ELLES SONT COURTES PARCE QUE LE BANDEAU EST ÉTROIT, ET C'EST MESURÉ :
       520 px pour deux lignes de 12 px, l'icône et les pastilles déduites. Au
       delà, `text-overflow` les coupe **en silence** — la famille exacte du
       « canevas qui découpe ce qui dépasse » (§4 de CLAUDE.md). `verify-quete`
       compte les signes, comme il le fait déjà pour les titres de mini-jeu. */
    goal: {
      /* ⚠️ ZIP 454 — « west field » → « north field » : le sillon a déménagé loin
         des potagers (voir `STAR_FURROW_X/Y`). Une phrase de bandeau qui nomme un
         endroit doit nommer le BON, sinon elle envoie chercher ailleurs — et c'est
         le seul texte qu'un joueur perdu relit. */
      /* ╔═══════════════════════════════════════════════════════════════════
         ║ ZIP 455 — PLUS CLAIRES, ET ELLES DISENT LE GESTE.
         ╚═══════════════════════════════════════════════════════════════════
         ⚠️⚠️ DEMANDE DE GUILLAUME : « Les indications des étoiles guide ne doivent
         pas être trop évasives, je préfère qu'elles soient plus claires. Qu'on
         sache quoi faire. Genre trouver l'ingénieur par exemple. ouvrir le plan
         avec P etc. » La règle du 449 (« OÙ et QUOI, jamais pourquoi ») tenait ;
         il lui manquait le troisième terme, **COMMENT** — la touche à presser.
         ⚠️ ET C'EST GRATUIT EN MYSTÈRE : ce que ces phrases disent est ce que le
         joueur ferait de toute façon, dix minutes plus tard, en tâtonnant. Le
         mystère du chantier n'est pas « quelle touche », il est « qu'est-ce que
         c'est » — et ça, aucune de ces phrases ne le dit.
         ⚠️ LE PLAFOND DE 80 SIGNES N'A PAS BOUGÉ : le bandeau rabote en silence
         (449), donc c'est le TEXTE qui tient la contrainte, jamais la coupe. */
      farmImpacts: "Eight impacts lie on both riverbanks. Open the map and search them.",
      /* ⚠️ ZIP 475 — voir la note française : un trou déjà fouillé n'a plus
         « fouille-les » à dire, qu'il attende un apprivoisement ou un
         refroidissement. */
      /* ⚠️ ZIP 479 — voir la note française : sept phrases pour deux étoiles, une
         par ÉTAT, parce qu'elles ne font plus le même geste. */
      farmImpactLight: "It wants blue light. Cross the evil world to find it.",
      farmImpactLightPay: "You have its light. Go and offer it at the hole (E).",
      farmImpactTame: "A star is hiding in that dug-up hole. Turn your back and wait.",
      farmImpactWarm: "The pink one comes to heat. Cook it a dish at the cauldron (E).",
      farmImpactSimmer: "It is simmering. Do not wander off, it will be ready soon.",
      farmImpactTake: "The dish is ready at the cauldron. Take it (E) and get going.",
      farmImpactCarry: "Carry the dish to its crater before it goes cold (E).",
      farmImpactLure: "It flees bare-handed. Brew a Star Essence at the cauldron (E).",
      // hors-zip — see the FR block: no "(E)", the gesture is a plain hold, not a keypress.
      farmImpactLureGive: "You have the Star Essence. Go near the white hole — she will come on her own.",
      farmImpactCool: "The black plate is cooling. Examine it here (E) to continue.",
      // hors-zip — see the FR block: no more "the star insists", and a concrete
      // suggestion instead of vague "keep busy"; two lines, one for before the
      // train, one for a player already there (see starGoalKey, quete.js).
      townWait: "Take the train to Valley Town. Stay active for 2 min: walk or interact.",
      townWaitThere: "Stay active in Valley Town for 2 min: walk, explore, or interact.",
      craterHot: "East of Valley Town the hole still burns. Wait for it to cool.",
      /* ⚠️ ZIP 479 — voir la note française : le fond du trou est l'endroit où le
         nouveau geste ne marche pas, ce texte y envoyait. */
      /* 2026-09-02 (lot A) — see the FR block: three gestures, three lines. */
      craterFeed: "The queen has gone out. Bring her 80 lights from the escape run.",
      craterFeedPay: "You have her lights. Go and offer them at the crater rim (E).",
      craterWake: "Fed, but still asleep. Wake her to the beat of her heart (E).",
      crater:    "The crater has cooled. One on each rim, backs turned: it will rise.",
      craterAlone: "Nobody across from you? Plant your scarecrow on the far rim (E).",
      /* 2026-09-02 (lot A2) — see the FR block: neither line says where she is. */
      townShyAway: "One of her sisters hides in Valley Town. Take the train.",
      townShy: "Hat and sunglasses, between the square and the park. Watch the passers-by.",
      // 2026-09-03 (lot A3) — see the French note: no district, only a sign and a
      // resource. The green one is TRACKED, the hidden one is SPOTTED.
      townGreenAway: "The green one stayed in Valley Town. Take the train.",
      townGreen: "A plant stirring with no wind. Ask the queen for a hint (G).",
      townGreenLed: "The queen leads. E to stop, E to set off again.",
      /* ⚠️ ZIP 469 — voir la note française : sept objectifs partent avec le déchant. */
      /* ⚠️⚠️ ZIP 454 — LES DEUX OBJECTIFS DE LA CONSTRUCTION. Ils suivent la même
         règle que les huit autres — OÙ et QUOI, jamais pourquoi — et ils sont plus
         courts que la moyenne parce qu'ils portent un NOM PROPRE, qui ne se coupe
         pas sans devenir illisible (le bandeau rabote en silence, 449). */
      engineer:       "Ask the town hall for a naval engineer (E).",
      engineerTravel: "Kerguélen has been notified. He'll reach Valley Town shortly.",
      engineerWork:   "Kerguélen is drawing by the pier. He'll hand over his plans soon.",
      mayor:          "The plans are ready. Ask the town hall for an audience with the mayor.",
      /* ⚠️ ZIP 475 — voir la note française : la commande passe par le menu
         Employés, pas par un lieu. */
      timberOrder:    "Order the pieces from Tristan (Employees menu). He can run all five.",
      timberWait:     "Tristan is sawing. The timber goes to the lake slipway, Valley Town.",
      timberRaise:    "A piece is waiting on the lake slipway. Go raise it (E).",
    },
    // Chevron fallback while the cauldron hasn't been picked up yet — see the
    // FR block for why this one line is allowed to run past the usual 80-char cap.
    cauldronPassage: "Search every corner of this cursed forest and you'll find a magic cauldron there — but stay alert.",
    // hors-zip — tooltip for the clickable chapter-1 pips, see the FR block.
    focusTip: (mine, shared) => (mine ? "Your personal target — click again to clear it" : "Aim for this hole first, without waiting on the others")
      + (shared ? " · a friend is aiming for the same one" : ""),
    // hors-zip — the multiplayer toast that announces the clickable pips, see the FR block.
    focusHint: "There's more than one of you. Click a dot to pick a hole of your own.",
    // The big meteor's countdown — host-side only, see the FR block for why.
    townFallCountdown: (mmss) => `Impact in ${mmss} of activity in town.`,
    /* Le rappel de reprise. ⚠️ UNE FOIS PAR SESSION, jamais deux — un « où en
       étions-nous » qui revient à chaque écran est une notification. */
    againTitle: "Your next step",
    againClose: "Resume the quest",
    again: (n, total) => n <= 0
      ? `None of the ship's ${nen(total)} parts has been installed yet. The stars are still with you.`
      : `${nen(n)} of the ship's ${nen(total)} parts ${n === 1 ? "is" : "are"} installed. The stars are still with you.`,
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 449 — LE FAMILIER QUI MÈNE. Trois lignes, pas une de plus.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️ IL NE PARLE PAS, ET C'EST TOUT L'INTÉRÊT (voir la note de `STAR_GUIDE_*`
     dans `quete.js`) : le thème de la quête est le secret, et un guide muet le
     garde. Ces phrases décrivent donc ce qu'on VOIT l'animal faire — elles ne
     sont jamais dans sa bouche.
     ⚠️ `offer` EST LE DÉPART SPONTANÉ, et il se lit comme une gentillesse plutôt
     que comme un aveu d'échec : le jeu ne dit jamais « tu es perdu ». */
  /* Voir la note de `frame` côté français : indexé par la clé d'objectif, jamais
     par le chapitre, et une clé sans phrase est un silence voulu. */
  frame: {
    farmImpacts:        "They fell with me. I can feel them under the soil, but not which is where.",
    farmImpactTame:     "That one is shyer than I am. Act as if you did not know it was there.",
    farmImpactLight:    "The blue it wants does not grow here. You will have to go down and fetch it.",
    farmImpactSimmer:   "It smells of hot sugar. She will come.",
    farmImpactCarry:    "Go quickly, it is cooling.",
    farmImpactLure:     "It is afraid of your hands. It needs something that shines brighter.",
    farmImpactCool:     "That is not one of us — that is sky metal. That can be worked.",
    craterHot:          "She is still inside. Let the hole cool down.",
    /* 2026-09-02 (lot A) — see the FR block: the little star explains that the
       light carried to the big one is her own. */
    craterFeed:         "She is empty. What she wants is my own light — go down and fetch it.",
    craterFeedPay:      "You are carrying a piece of me. Pour it at the rim; she will know.",
    craterWake:         "She has fuel, but nothing beats. Strike with her heart, no faster.",
    crater:             "That one led us here. She is the one who knows where we are going.",
    craterAlone:        "One back will not be enough for her. Find her someone — or something that looks like one.",
    /* 2026-09-02 (lot A2) — see the FR block: the queen is the one who tells you. */
    townShyAway:        "One of my sisters went down to the town. She does not want to be seen.",
    townShy:            "She thinks a hat is enough to hide her. Look for whoever does not move like the others.",
    // 2026-09-03 (lot A3) — the queen names the sign, never the place.
    townGreenAway:      "The green one took the colour of leaves. I only feel her past the rails.",
    townGreen:          "She is green, so she believes a bush makes her invisible. A bush stirring with no wind is her.",
    townGreenLed:       "I will go first. Stay behind me, and watch the plants.",
    townWait:           "It happens on the other side of the rails now.",
    townWaitThere:      "Stay close to me. Nobody here can see me.",
    /* Voir la note côté français : au chapitre 3, chaque line brings it back to
       the boat. She names the next step in her own way; she does not muse. */
    engineer:           "We need plans before we need planks. Go and fetch the engineer.",
    engineerTravel:     "He is coming. Without his plans your timber is only timber.",
    engineerWork:       "He is drawing the hull. When he is done we will know what to ask Tristan for.",
    mayor:              "The slipway is on his quay: without his signature nobody raises anything on it. And do not tell him about me.",
    timberOrder:        "Tristan can make every piece — he needs wood, and a reason.",
    timberWait:         "He is sawing. Every stroke is one less piece of boat to wait for.",
    timberRaise:        "It has arrived. Raise it yourself.",
  },
  guide: {
    go: "The queen star takes the lead. Follow its light.",
    offer: "The queen star drifts away from the group. It wants to show you the way.",
    stop: "The queen star returns to the constellation.",
    arrived: "The queen star stops here. The rest is yours.",
    none: "Nothing to look for right now.",
    noQueen: "The large yellow star is not with you yet.",
  },
  /* ── LES CARTES DE CHAPITRE. Le seul endroit du chantier où le jeu prend
     l'écran entier pour dire un titre. */
  chapter: {
    field:  "Chapter One — The Eight Impacts",
    crater: "Chapter Two — The Crater",
    build:  "Chapter Three — The Slipway",
    end:    "The Star Boat",
  },
  win: {
    mayor:    { title: "Congratulations!", sub: "The mayor supports your project." },
    engineer: { title: "The plans are ready!", sub: "Kerguélen has drawn up the ship." },
  },
  /* ── LA CHUTE. Personne d'autre ne la commente : c'est le thème (§3 de
     QUETE.md). Le silence de la ville EST la première chose étrange. */
  fall: {
    agency: "The National Astronomy Agency predicted eight sites across the farm.",
    first: "First impact. One site out of eight.",
    chain: "Two more fragments fall one after the other.",
    aftershocks: "Five more tremors, farther away. Eight sites remain to explore.",
    /* ⚠️⚠️ ZIP 448 — « west to east » ÉTAIT FAUX, ET ÇA S'EST VU À L'ÉCRAN AVANT
       DE SE VOIR ICI : la comète descend d'EST EN OUEST (le sillon est plus
       profond à son bout ouest, c'est là que la course s'arrête, et les deux
       modèles de Guillaume la montrent arrivant du haut-droite). Le texte disait
       donc le contraire de l'image, sous l'image. Un texte n'est pas un décor :
       il AFFIRME, et une affirmation fausse coûte plus cher qu'un dessin
       approximatif. */
    line1: "The sky tears open, east to west.",
    line2: "This time, it is not a fragment.",
    line3: "Every bird in the valley goes up at once.",
    quiet: "Everyone saw the stone fall. Nobody will ever see what was inside it.",
    /* ⚠️⚠️ ZIP 458 — voir la note française : ce qui tombe dans le champ n'est
       qu'un éclat, et le gros est passé au-dessus, vers Valley Town. */
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 455 — LE TAMPON. LA PIERRE EST PUBLIQUE, L'ÉTOILE RESTE SECRÈTE.
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️⚠️ LA RÈGLE D'ÉCRITURE DE CE BLOC EST LA SEULE CHOSE À EN RETENIR, ET
     `verify-quete` LA TIENT : **aucune de ces phrases ne peut nommer l'étoile, ni
     dire où aller, ni dire quoi faire.** Les habitants parlent d'un CAILLOU
     annoncé par des astronomes ; ils ne savent rien d'autre, et ils ne sauront
     jamais rien d'autre. C'est ce qui permet à cette demande de coexister avec le
     thème du secret au lieu de le remplacer (voir l'en-tête de `quete.js`).
     ⚠️⚠️ LES `hint` SONT L'EXCEPTION QUI CONFIRME LA RÈGLE : ils annoncent une
     ÉTAPE À VENIR sans jamais dire qu'elle en est une. « Un ingénieur breton a
     posé ses valises » est un ragot de village ; il se trouve qu'il sera vrai. Un
     joueur qui a écouté a une minute d'avance, un joueur qui n'a rien écouté ne
     perd rien — c'est très exactement ce qu'on veut d'un indice, et c'est ce qui
     sépare un tampon JOUABLE d'un tampon décoratif.
     ⚠️ ET ILS SONT FIGÉS PAR PNJ (`starNerveSay`) : le même habitant redit
     toujours la même chose, donc on peut retourner le voir. Un tirage à chaque
     approche aurait fait une machine à phrases dont personne ne retient rien. */
  warn: {
    askTitle: "Begin the “Beautiful Star” quest?",
    askBody: "Astronomers are announcing a shower of asteroids over the valley. Say yes and the news spreads tonight — and the night after that, something will fall.",
    askNote: "You can say no. We'll ask again at dusk.",
    yes: "Yes",
    later: "Later",
    laterToast: "Later, then. We'll ask again at dusk.",
    cardTitle: "The Beautiful Star",
    cardSub: "The astronomers have warned us. The valley is watching the sky.",
    chat: "The astronomers have warned the valley: a shower of asteroids, tonight or the next.",
    boardTitle: "OBSERVATORY NOTICE",
    boardBody: "A shower of asteroids is expected over the valley. The risk is judged HIGH. Bring your animals in. Do not stand under tall trees. Do not look straight at the light.",
    rumor: [
      "The astronomers wrote to the town hall. They're frightened too.",
      "A shower of asteroids. That's the word they used. A shower.",
      "I brought the animals in two hours early. You never know.",
      "They say it might pass us by. Might.",
      "I can't sleep any more. I watch the sky all night.",
      "The mayor says stay calm. He doesn't look calm.",
      "Last night, far away, there was a noise. Nobody saw anything.",
      "And if it lands on the fields? We start again, that's all.",
    ],
    hint: [
      "They say a brilliant engineer from Brittany has moved into Valley Town.",
      "I saw odd stars in the sky, the nights before. They were moving.",
      "My grandfather watered stones fallen from the sky. They hardened black.",
      "The lake slipway hasn't seen a keel in twenty years. It's still waiting.",
      "Tristan says he could build a boat. Nobody has ever asked him.",
      "When a burning stone lands in sand, the sand turns to green glass.",
    ],
  },
  /* ── ÉTAPE 1 : LE CHAMP. */
  /* ⚠️⚠️ ZIP 457 — voir la note française : `tooHot`/`got` disent maintenant
     pourquoi on refroidit (une proue increvable, pas un mystère gratuit), et
     `east` dit clairement où aller tout en plantant le futur navigateur. */
  s1: {
    coolTitle: "Cool it down",
    /* ⚠️⚠️ ZIP 449 — LES CONSIGNES DISENT LE BUT, PAS SEULEMENT LE GESTE
       (demande de Guillaume). Celle-ci savait déjà dire « à petits coups » ;
       elle ne disait pas ce qu'on VISE, c'est-à-dire la bande. Un joueur qui ne
       sait pas qu'il y a une cible à tenir croit qu'il faut vider l'arrosoir.
       ⚠️ ET AUCUNE NE NOMME UNE TOUCHE, décision de Guillaume : le reste du jeu
       n'écrit jamais ses commandes, et une consigne qui le ferait ici sonnerait
       comme un didacticiel collé sur un conte. */
    coolHint: "Keep the glow inside the mark. Pour in short bursts — a long one cracks it.",
    coolCrack: "Crack. Start again, gentler.",
    /* ⚠️⚠️ ZIP 478 — voir la note française : deux façons de perdre, deux phrases. */
    coolBurn: "It flares back to white: you're not pouring enough. Pour more often.",
    coolMiss: "The round ended outside the mark. Finish the descent inside the ring.",
    coolWin: "The white goes orange, then red, then blue. It stops hissing.",
    got: "The black plate and Tristan's timber now form a hull able to take an immense impact.",
  },
  /* ── ÉTAPE 2 : LE CRATÈRE. */
  s2: {
    /* ⚠️ ZIP 446 — LE CRATÈRE FUME AVANT DE RENDRE QUOI QUE CE SOIT. La phrase
       doit dire les DEUX choses en une ligne : rien à faire, et ça va passer.
       Une phrase qui ne dirait que « trop chaud » enverrait chercher un seau. */
    tooHot: "The hole is still smoking. Whatever is down there won't come up yet.",
    empty: "The crater is empty. Warm sand, turned to green glass.",
    peek: "Something moves at the edge of your eye. You look. It's gone.",
    calmHint: "It won't come out while it's being watched.",
    /* ⚠️ ZIP 456 — voir la note en face, côté français : les quatre états de la
       posture, dits au-dessus du joueur pendant qu'il les tient. */
    calmIn: "Climb down to the bottom.",
    calmNear: "Get closer to the impact.",
    calmStill: "Stop moving.",
    calmTurn: "Turn your back on it.",
    calmHold: "Something is climbing up behind you.",
    calmBoth: "Both of you. Backs turned. Don't move.",
    calmSolo: "Alone, this takes a while. Stay turned around.",
    /* ⚠️ ZIP 479 — voir la note française : les trois états propres à la reine, et
       les quatre autres réutilisent les phrases de la posture. */
    queenAlone: "Someone has to stand across. A player — or a scarecrow.",
    queenEdge: "Not at the bottom: climb back up to the rim.",
    queenSide: "Same side, and it sees you both. Go to the far rim.",
    lightShort: (have, need) => `You need ${nen(need)} brought back since the fall. You have ${nen(have)}.`,
    lightGiven: "Blue light pools at the bottom of the hole. Now turn around.",
    /* 2026-09-02 (lot A) — see the FR block: one line per gesture, because the
       queen still needs waking where the blue one only needed a turned back. */
    queenFed: "The lights pour into her. She has fuel now — but nothing beats yet.",
    wokeHer: "One beat. Then another. She opens her eyes, and she is yellow.",
    wakeHint: "Strike when the ring meets the mark. Hammering makes her sink back.",
    dishCook: "The cauldron heats up. It smells of something no book ever wrote down.",
    dishSimmer: "It is simmering.",
    dishReady: "It is ready, and steaming.",
    dishTaken: "You are carrying the dish. It cools with every step.",
    dishPass: (who) => `${who} takes the dish over. It is scalding again.`,
    dishCooling: "It is cooling. Pick up the pace.",
    dishCold: "The dish went cold. It did not even look up. Start again.",
    hideOnly: "It slips behind you and goes out. It only wants to exist for you.",
    /* 2026-09-03 (lot A3) — the queen's hints. Temperature and bearing are two
       sentences we assemble: five by eight would be forty lines to write, translate
       and keep in step, for information that carries two facts. */
    hintTemp: {
      burning: "She is here. Within arm's reach, and she has stopped moving.",
      hot: "Warm. She is very close — look for a plant that stirs.",
      warm: "Lukewarm. She is somewhere in this part of town.",
      cold: "Cold. You are looking far from her.",
      icy: "Freezing. You are at the other end of town.",
    },
    hintWay: { n: "to the north", ne: "to the north-east", e: "to the east", se: "to the south-east",
               s: "to the south", sw: "to the south-west", w: "to the west", nw: "to the north-west" },
    hintSay: (temp, way) => `${temp} ${way}.`,
    hintLeft: (n) => n > 0 ? `${n} hint${n > 1 ? "s" : ""} left.` : "That was the last hint. Ask again and I will lead you.",
    hintLead: "Then come. I will go ahead — E to stop, E to set off again.",
    hintAway: "She is not on this side of the rails. Go down to town first.",
    greenGot: "The bush parts on its own. She was there all along, green on green.",
    noScarecrow: "You need a scarecrow to plant. The shop sells them.",
    /* ⚠️ ZIP 459 — voir la note en face, côté français : les deux moitiés de
       l'effort, dites pendant qu'on le fournit. */
    slipHold: "You're sliding. Keep the same heading — he'll find a grip.",
    slipClimb: "He's holding on. Don't let go of the direction.",
    meet1: "This one is larger than the others. Its yellow light fills the crater.",
    meet2: "The two little farm stars move toward it without hesitation.",
    meet3: "The queen star traces the outline of a broken ship in the dust.",
    name: (n, total) => `Its boat broke when it fell. ${Nen(total)} pieces. It has ${nen(n)}.`,
  },
  /* ── ÉTAPE 3 : LE LAC. */
  ship: {
    got: (n, total) => `${Nen(n)} of ${nen(total)} pieces. The boat is growing.`,
    last: (n, total) => `${Nen(n)} of ${nen(total)} pieces. Only one piece left.`,
  },
  /* ── voir la note française : le toast COMPTE, le ruban MONTRE. */
  ribbon: {
    kicker: "On the slipway",
    title: (name) => `${name} — in place`,
    last: "The boat is whole.",
  },
  end: {
    end1: "It goes up the way a balloon does. Slowly. Like it has all night.",
    end2: "Down by the water, the boat is whole, cradled on the shore, ready to go down. It is waiting for someone who can sail.",
    end3: "The wind drops. Nobody says anything else.",
    gift: "Something of it stayed with you.",
    /* ⚠️ ZIP 479 — voir la note française : la seule phrase qui nomme deux joueurs. */
    together: (names) => `What it was given, it was given by more than one pair of hands: ${names}.`,
  },
  plan: {
    advise1: "It looks at the empty slipway by the lake. It shakes its head.",
    advise2: "It doesn't know how boats are built. It only knows what this one looked like.",
    advise3: "You need someone who draws boats. In town — the big house where you ask for things.",
    hallIntro: "A shipwright? There's one left, yes. Célestin Kerguélen. He doesn't travel for nothing.",
    hallFee: (gold, crops, fish) => `His terms: ${gold} gold, ${crops} crops and ${fish} fish. Paid up front.`,
    hallWhy: "He says a plan is paid all at once or not at all. He has never explained why.",
    hallSendBtn: "Send for the shipwright",
    /* ⚠️⚠️ ZIP 458 — voir la note française : la transaction se voit, se compose
       et se valide, et un refus dit QUOI et COMBIEN. */
    dealTitle: "The deal",
    dealAdd: "Add",
    dealAdded: "On the table",
    dealClear: "Take it all back",
    dealValidate: "Close the deal",
    dealGold: "Gold",
    dealCrops: "Crops",
    dealFish: "Fish",
    dealFromPurse: "common purse",
    dealFromBag: "your bag",
    dealFromBagPool: "your bag + common store",
    dealHave: (have, need) => `${have} / ${need}`,
    dealShort: (n, what) => `${n} ${what} short.`,
    dealReady: "Kerguélen counts it. It's all there.",
    dealNotReady: "He won't take half of it. Make it up, or come back later.",
    hallPoor: "You're short. He doesn't give credit.",
    hallSent: "It's sent. He'll take the first train.",
    hallTravel: (d) => `Kerguélen is on his way. He arrives in ${d}.`,
    hallWork: (d) => `Kerguélen is drawing, down on the shore. His plans will be ready in ${d}.`,
    hallReady: "Kerguélen handed over his plans and left.",
    engName: "Célestin Kerguélen",
    engRole: "naval architect",
    engHello: "Don't tell me anything. Show me the slipway and let me work.",
    engWork: (d) => `He measures, crosses out, starts again. ${d} to go.`,
    engBubble: "…and if the keel holds, the rest follows.",
    engDone: (total) => `There. ${Nen(total)} pieces, and what each one needs. Go and find yourself a good lumberjack.`,
    engGone: "He folded his sheets and left without looking back.",
    ready: "The plans are yours. Open them (P) to see the boat.",
    openBtn: "📐 The plan",
    panelTitle: (name) => `📐 Building plans — ${name}`,
    panelHint: (total) => `${Nen(total)} pieces. Their status comes straight from Tristan's orders and the slipway.`,
    panelAtLake: "Unfold it by the lake and the boat will stand on its slipway.",
    lakeToast: "You unfold the plan in front of the slipway. The whole boat draws itself in the air.",
    lakeClose: "You fold the plan away. The boat fades out.",
    none: "You have no plan. Nobody knows what this boat looked like.",
    part: (k) => ({
      hull: "Hull planking", rudder: "Rudder and tiller",
      mast: "The mast", sail: "The yard", bell: "The bell cradle",
    }[k] || k),
    progressTitle: "Construction progress",
    progressPart: (k) => ({
      hull: "Hull", rudder: "Rudder", mast: "Mast", sail: "Sail", bell: "Bell",
    }[k] || k),
    progressState: (state) => ({
      done: "ASSEMBLED", ready: "TO BE RAISED", building: "BEING MADE",
      available: "TO ORDER", locked: "UPCOMING",
    }[state] || state),
    progressDetail: (state, detail) => state === "done" ? "In place on the slipway."
      : state === "ready" ? "Timber delivered; raise it on the slipway."
      : state === "building" ? `Tristan is working · ${detail}`
      : state === "available" ? detail
      : detail === "noPlan" ? "Plans required."
      : detail === "noMayor" ? "The mayor's approval is required."
      : detail === "noShard" ? "Find the matching shard."
      : "This step is still locked.",
    progressNext: (part) => `Next visible change: ${part}.`,
    progressComplete: "Construction complete: every piece is on the slipway.",
    orderTitle: (name) => `🪵 ${name}'s workshop`,
    orderHint: "He can run all five at once. What's short isn't time any more: it's the stock.",
    orderCost: (wood, d, extra) => `${wood} wood${extra ? ` · ${extra}` : ""} · ${d} of work`,
    extraName: (ex) => !ex ? "" :
      ex.kind === "stone" ? `${ex.n} stone`
      : ex.kind === "fish" ? `${ex.n} fish`
      : ex.kind === "product" ? `${ex.n} ${["eggs", "goat milk", "wool", "truffles", "milk"][ex.idx | 0] || "produce"}`
      : "",
    extraWhy: (ex) => !ex ? "" :
      ex.kind === "stone" ? "ballast, down in the hull"
      : ex.kind === "fish" ? "oil for the tiller"
      : (ex.idx | 0) === 2 ? "cloth for the sail"
      : "glue and varnish",
    orderPoorExtra: (n, what) => `${what} missing. ${n} in all, from the store or your bag.`,
    orderBtn: "Order it",
    orderSent: (part, d) => `${part}: Tristan gets to it. Ready in ${d}.`,
    /* ⚠️ ZIP 459 — voir la note en face, côté français : ce qu'il dit en recevant
       la commande, au-dessus de sa tête, et il nomme la pièce. */
    tristanGo: (part) => `${part}? You've got it. Starting right now.`,
    orderPoor: (wood) => `You need ${wood} wood in the stores. Fell some trees, or let him fell them.`,
    orderWait: (d) => `under way — ${d}`,
    orderDone: "✅ delivered",
    blockNoPlan: "🔒 You need the plans first",
    blockNoMayor: "🔒 The quay is public: you need the mayor's approval",
    blockRaise: "🔨 Delivered — go raise it on the slipway",
    blockNoShard: "🔒 This piece isn't available yet",
    delivered: (part) => `${part} — the timber is on the slipway. All it needs is a hammer.`,
    raised: (part, who) => `${part} — ${who} just raised it. The boat is growing for real now.`,
    raiseTitle: (part) => `🔨 Raise ${part}`,
    raiseSub: (n, total) => `blow ${n} of ${total}`,
    raiseHint: "Strike when the mallet crosses the bright band. A blow off the mark doesn't count.",
    raiseWin: "The piece is home. It won't move again.",
    raiseFail: "The timber slipped. Take it up again, calmly.",
    lastOne: "The last piece is in place. The boat is finished.",
    noTristan: "Nobody on the farm can work timber like that.",
    unbuilt: (n, total) => `The bell has answered, but the wood is short: ${n} pieces of ${total}.`,
  },
  /* ⚠️ See the French note: the four verdicts are KEYS in `scierie.js` because
     the host replays them, and an arbiter must not depend on a language. */
  saw: {
    title: (part) => `${part} — on the saw line`,
    him: (name) => `${name} sets the beam on the trestles and hands you the far grip.`,
    himSide: "him",
    usSide: "you",
    planks: (n, total) => `board ${Math.min(n + 1, total)} of ${total}`,
    broken: (n, max) => `${n} board${n > 1 ? "s" : ""} split of ${max}`,
    combo: (n) => `${n} strokes in a row`,
    stress: "What the board is taking",
    pull: "PULL",
    hint: "Pull as the blade comes back from his side. Pulling while he pulls jams the blade.",
    quit: "← Leave it",
    flat: "The workshop will not draw on this machine, but the saw works: follow the blade on the track.",
    camHint: "Drag to look around · Space or click to pull",
    view: { poste: "\u{1FA9A} at the grip", face: "\u{1F464} across", atelier: "\u{1F3DA} the workshop" },
    verdict: {
      perfect: "PERFECT", good: "GOOD", weak: "SLACK", bind: "JAMMED!",
      dead: "", plank: "BOARD!", break: "IT SPLITS!",
    },
    grade: (n) => ["He will plane all of that again.", "That will do.", "Fine work.", "Workshop work."][n | 0] || "",
    stars: (n) => "★".repeat(n | 0) + "☆".repeat(3 - (n | 0)),
    win: (part, d) => `${part}: the timber is cut. Ready in ${d}.`,
    faster: (pct) => `Clean line: ${pct}% off the piece.`,
    slower: (pct) => `Ragged line: ${pct}% added.`,
    extraWood: (n) => `${n} wood lost in the split boards.`,
    lost: "Three boards split. The saw goes back on the wall — nothing was spent, you can try again.",
    quitToast: "You put the grip down. No order was placed.",
    refused: "The order was not recorded. Take the saw again.",
  },
  /* ⚠️ ZIP 453 — voir la note française : elles remplacent `voyagerDeparted` /
     `voyagerReturned` une fois la quête finie, donc zéro `send()` de plus. */
  sail: {
    away: (d) => `Eduardo takes the star boat out to sea. He wants to see what's on the other side (back in ${d}).`,
    back: (goods) => `The star boat is back. Eduardo brings: ${goods}.`,
  },
  /* ── CE QUE LA VILLE GARDE. */
  devChat: (who, what) => `${who} touched the star quest: ${what}.`,
  trace: {
    dawnBell: "The old bell rings once at dawn. It always has, people say.",
    newStar: "There's a new star over the valley. Bright one. It came from the lake.",
    craterPool: "The crater cooled into a pool of green glass. It glows a little at night.",
  },
  /* ── LE MENU DÉVELOPPEUR. ⚠️ Il est en anglais lui aussi : c'est un outil, il
     ne se traduit pas, et le 442 le laissait déjà bilingue pour rien. */
  dev: {
    section: "⭐ Star — The Star Boat",
    hint: "Start it, push it, replay a scene. ⚠️ None of these gives anything: you skip the playing, you don't earn a thing.",
    notStarted: "Not started",
    chapterAt: (k, n, total) => `Chapter ${k} · ${n}/${total} pieces`,
    op: (op) => ({
      reset: "↺ Wipe it",
      start: "▶ Start (the fall)",
      /* ⚠️ ZIP 455 — deux boutons pour deux choses : « Start » saute le tampon
         (annonce + chute d'un coup), « Announce » ne joue QUE le tampon. Sans le
         second, juger les PNJ nerveux demanderait une ferme à quatre artisans et
         cinq minutes d'attente réelle — c'est-à-dire qu'on ne les jugerait pas. */
      warn: "📣 Announce it (the buffer)",
      chapter: "⏭ Finish this chapter",
      skip: "⏩ Skip ahead one",
      /* ⚠️ ZIP 469 — `hint` (le croisement d'ombres) est sorti de STAR_DEV_OPS.
         « All but the duet » devient « All but the ending » : il n'y a plus de duo,
         et ce que le bouton laisse à jouer est bien la scène finale. */
      all: "⏭⏭ All but the ending",
      /* ⚠️ ZIP 454 — les deux étapes qui se comptent en MINUTES RÉELLES (15 pour
         les plans, 24 pour les cinq pièces de bois). Sans ces boutons, on ne
         regarderait le plan et le fantôme qu'une fois, donc on ne les jugerait
         qu'une fois — la raison d'être de tout ce menu. */
      plans: "📐 Hand me the plans",
      /* ⚠️ ZIP 478 — deux boutons pour deux états : « deliver » s'arrête AVANT le
         marteau (c'est le seul moyen de juger le mini-jeu de montage sans huit
         minutes de scie), « timber » pose les cinq pièces. */
      deliver: "🔨 Timber delivered, not yet raised",
      timber: "🪵 Deliver all the timber",
      appt: "🎩 An appointment with the Mayor, right now",
      unslam: "🚪 Make him forget the slammed door",
      /* ⚠️ ZIP 479 — les deux raccourcis des nouveaux verbes. Ils sautent la
         PRÉPARATION (une course de trois minutes, vingt secondes de cuisson) et
         jamais la scène : l'offrande reste à faire, le trajet reste à courir. */
      candy: "🍬 60 candies of blue light (the purse only)",
      dish: "🍲 A hot dish, ready to pick up",
      // 480 bis — same family: skips the mining + brewing, never the hold.
      lure: "✨ A Star Essence vial (the taming stays)",
      /* 2026-09-02 (lot A) — même famille que `candy`/`dish`/`lure` : on saute la
         corvée, jamais le geste. Le trou est froid et les lumières sont dans le
         flux ; l'offrande, le réveil au rythme et la posture restent à jouer.
         ⚠️ AUCUN CHIFFRE DANS LE LIBELLÉ : le prix vit dans `starOfferPrice`, et un
         « 80 » écrit ici serait faux le jour où il bouge (§8 de CLAUDE.md). */
      queen: "👑 The queen: cold crater + her lights (feed/wake stay)",
      /* 2026-09-02 (lot A2) — il apprivoise la reine et LAISSE LA CHASSE : le geste
         de la discrète est de la trouver, donc le bouton ne la trouve pas. */
      shy: "🕶️ Queen tamed — the hidden sister is still out there",
      /* 2026-09-03 (lot A3) — the green one needs her OWN shortcut: without it,
         judging her hunt would mean winning the hidden one's hunt first. Queen and
         hidden sister tamed, green one untouched, hints untouched. */
      green: "🌿 Queen + hidden one tamed — the green one is still hiding",
    }[op] || op),
    scene: (s) => ({ warn: "🎬 The announcement", fall: "🎬 The eight farm impacts", townFall: "🎬 The Valley Town meteor", end: "🎬 The ending" }[s] || s),
    sceneLabel: "Replay a scene",
    stand: "📍 Stand at the next little star",
    /* ⚠️ ZIP 481 — le téléport « Mairie — l'étage » dépose dans le COULOIR ; le
       bureau est deux pièces plus loin, derrière une porte. Sans ce bouton, chaque
       essai de l'audience commence par une promenade. */
    standMayor: "🎩 Stand at the Mayor's desk",
    /* ⚠️ LOT E — cet arrêt naît le MÊME JOUR que la scène de sciage. Leçon du
       425, écrite dans `CLAUDE.md` : un lieu qu'il faut quarante minutes de
       quête pour atteindre est un lieu qu'on ne va pas regarder — donc qu'on
       ne juge qu'une fois. */
    saw: "\u{1FA9A} Open Tristan's saw",
  },
  /* ── LES ANNONCES DE CHAT. ⚠️ SANS EMOJI EN TÊTE : `broadcastChat` en écrit
     déjà un, et le 442 a livré « 🔍 🔍 Joueur1 a trouvé… » sur six libellés
     avant qu'une séance à deux clients ne le montre. */
  chat: {
    start: "Something fell out of the sky.",
    found: (who, n, total) => `${who} found a piece. ${nen(n)} of ${nen(total)}.`,
    chapter: (t) => `${t}`,
    crater: (who) => `${who} tamed the queen star.`,
    // 2026-09-02 (lot A2) — see the FR block: the hunt ends for everyone.
    shySpotted: (who) => `${who} saw through the little star in the hat.`,
    // 2026-09-03 (lot A3) — same motivated exception as `shySpotted`: the hunt ends
    // for everyone, so the other player must not keep searching an empty district.
    greenTracked: (who) => `${who} flushed the little green star out of its bush.`,
    tamed: (who) => `${who} tamed a little star.`,
    /* ⚠️ ZIP 479 — voir la note française : le second joueur est nommé. */
    /* ⚠️ ZIP 479 — voir la note française : le chaudron se dit, l'offrande non. */
    cooking: (who) => `${who} puts something in the cauldron. It smells of star.`,
    craterBoth: (a, b) => `${a} and ${b} tamed the queen star, one on each rim.`,
    tamedBoth: (a, b) => `${a} and ${b} tamed a little star between them.`,
    dug: (who, left) => left > 0
      ? `${who} searched a crater. ${Nen(left)} left.`
      : `${who} searched the last crater on the farm.`,
    /* ⚠️ ZIP 453 — « The boat sailed » était faux : il restait à quai. */
    done: "The boat is finished. The star went home.",
  },
  /* ── LES INVITES, UNE SEULE CLÉ-FONCTION. ⚠️ Le préfixe `star:` est lu une
     fois, ici — six `if` répartis dans trois boucles de rendu finiraient par ne
     pas dire la même chose (c'est la convention posée par `enqPrompt` au 442,
     et c'est la seule chose de l'enquête qui survit telle quelle). */
  /* ⚠️ ZIP 479 — voir la note française. */
  cauldronBtn: "🍲 Cook the star's dish",
  prompt: (k) => ({
    impact: "E: search the crater",
    impactDig: "Searching…",
    impactSeen: "Site already searched",
    material: "E: examine the black matter",
    /* ⚠️ ZIP 479 — voir la note française : `dishWait` est un CONSTAT, pas une
       invite, donc il ne nomme aucune touche. */
    light: "E: offer it blue light",
    warm: "It is waiting for something warm (E: why?)",
    lure: "It flees without the vial (E: why?)",
    cook: "E: cook the star's dish",
    dishWait: "Simmering…",
    dishTake: "E: take the steaming dish",
    dishPass: "E: take the dish over",
    dishGive: "E: give it the dish",
    effigy: "E: plant the scarecrow on the rim",
    tame: "Turn your back, stand still (E: why?)",
    /* ⚠️ ZIP 479 — voir la note française : deux bords, pas une posture solitaire. */
    crater: "One on each rim, backs turned (E: why?)",
    craterHot: "E: wait for it to cool",
    // 2026-09-02 (lot A) — two real keys, see the FR block.
    feed: "E: offer it the blue light",
    wake: "E: wake her",
    // 2026-09-02 (lot A2) — see the FR block: reading it means you already won the hunt.
    shy: "E: tell her you recognised her",
    // 2026-09-03 (lot A3) — it names the BUSH, not the star: that is what is in
    // front of the player. She has not been seen yet.
    track: "E: part the leaves",
    engineer: "E: talk to the shipwright",
    raise: "E: raise the piece on the slipway",
  })[k] || "E",
};
/* ⚠️ LE MENU DÉVELOPPEUR EST LA MÊME TABLE DES DEUX CÔTÉS — pointée, jamais
   recopiée (voir la note au-dessus de `STAR_EN`). `verify-strings` apparie les
   clés : il voit `dev` des deux côtés, et il a raison, c'est le même objet. */
STAR_FR.dev = STAR_EN.dev;

/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 480 — LES TEXTES DE L'AUDIENCE, EN FRANÇAIS, UNE SEULE FOIS.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CETTE TABLE EST DÉFINIE UNE FOIS ET RÉFÉRENCÉE PAR LES DEUX LANGUES,
   exactement comme `STAR_EN` l'a été au 444 (dans l'autre sens). C'est la façon
   la moins dangereuse de livrer une passe « français seulement » : la clé
   `maire` existe des deux côtés, `verify-strings` l'apparie, le jeu ne plante
   pas chez un anglophone, il n'existe qu'UN texte donc il ne peut pas diverger,
   et l'état « pas encore traduit » se voit d'un coup d'œil au lieu de se cacher
   dans deux cents lignes qui se ressemblent.
   ⚠️ LA TRADUCTION FUTURE : dupliquer cette table, la traduire, remplacer
   `maire: MAIRE_FR` par `maire: MAIRE_EN` dans le bloc `en`. Une ligne.

   ⚠️⚠️⚠️ AUCUN TIRET QUADRATIN DANS LE TEXTE FRANÇAIS (règle du site). Les
   répliques sont donc entre guillemets français, et la didascalie qui les
   précède est une phrase à part entière.

   ⚠️⚠️ LE TON, ET C'EST UNE CONSIGNE DE GUILLAUME : « si les arguments sont
   drôles c'est encore mieux, mais faut garder à l'esprit que le ton est celui
   d'une réunion avec un élu ». Le comique est donc TOUJOURS dans le fond et
   jamais dans la forme : personne ne fait de mot d'esprit, tout le monde est
   poli, et c'est la situation qui est drôle. Un maire qui dit « j'ai un tiroir
   entier de choses qu'on verrait le moment venu » ne plaisante pas ; c'est nous
   qui rions. La seule réplique franchement énorme de l'arbre (« Dites votre
   prix ») est aussi la seule qui mette fin à l'entretien sur-le-champ, et c'est
   voulu : on paie ce qu'on s'est permis.

   ⚠️ CHAQUE RÉPLIQUE A SA JUSTIFICATION (`tell`), SANS EXCEPTION. Demande de
   Guillaume : « toujours avoir une justification de la réaction du maire ». Le
   banc refuse une clé de réplique sans `tell` ; c'est ce qui empêche d'écrire
   une bonne vanne dont personne ne comprend pourquoi elle marche.
   ═══════════════════════════════════════════════════════════════════════════ */
const MAIRE_FR = {
  /* ── le cadre ──────────────────────────────────────────────────────────── */
  title: "Audience",
  gauge: "Adhésion",
  streakHold: "Il ne décroche plus.",
  streakGain: "Il finit vos phrases.",
  slip: "Vous venez de perdre la salle.",
  bare: "Vous n'avez rien à poser sur ce bureau.",
  audienceDay: "C'est son jour d'audience. Il est préparé, et il a le temps.",
  busyDay: "Ce n'est pas son jour d'audience. Vous le prenez entre deux dossiers.",
  race: (d) => `Élections municipales dans ${d} jours.`,
  triesAt: (n) => n === 1 ? "Vous êtes déjà venu une fois." : `Vous êtes déjà venu ${n} fois.`,

  /* ── ZIP 481 — LE RENDEZ-VOUS, L'HUMEUR, ET LA PORTE ─────────────────────
     ⚠️ LA SECRÉTAIRE NE DIT PAS UN NIVEAU DE DIFFICULTÉ, ELLE DIT CE QU'ELLE A
     VU. « Il a ri au téléphone tout à l'heure » et « difficulté : facile » sont
     la même information ; une seule des deux est une mairie. */
  mood: {
    great: "Très favorable",
    good:  "Favorable",
    mid:   "Moyenne",
    bad:   "Mauvaise",
    awful: "Très mauvaise",
  },
  moodSay: {
    great: "« Vous tombez bien. Il a ri au téléphone il y a dix minutes, ça n'arrive pas tous les jours. »",
    good:  "« Il est de bonne composition ce matin. Le conseil s'est bien passé. »",
    mid:   "« Comme d'habitude. Ni bien ni mal. Il vous écoutera. »",
    bad:   "« Je vous préviens : la réunion de dix heures s'est mal terminée. Il n'est pas commode. »",
    awful: "« Franchement, je ne vous le conseille pas. Mais c'est vous qui voyez. »",
  },
  moodSour: "« Ah. C'est vous. » Elle ne dit rien de plus, et note quelque chose.",
  clerkAsk: "🎩 Demander une audience au maire",
  bookedWhen: (mmss) => `Il vous reçoit dans ${mmss}.`,
  bookedNow: "C'est l'heure. Son bureau est à l'étage, au fond du couloir.",
  bookedStale: "Vous avez laissé passer l'heure. Il faudra en redemander une.",
  bookedBy: (n) => `${n} a rendez-vous avec le maire.`,
  blockedFor: (mmss) => `Il ne vous recevra pas avant ${mmss}. « Il a demandé à ne pas être dérangé. »`,
  doorNotYet: "Le maire n'est pas disponible. Prenez rendez-vous à l'accueil.",
  doorWait: (mmss) => `Vous avez rendez-vous dans ${mmss}. Sa porte est encore fermée.`,
  doorOther: (n) => `C'est ${n} qui a rendez-vous, pas vous.`,

  slam: "🚪 Se lever et claquer la porte",
  slamHint: "Vous ne pourrez plus le voir avant un quart d'heure, et il s'en souviendra.",

  /* ── la caméra, et c'est la seule chose du jeu qui s'explique en un mot ── */
  camHint: "Glissez pour regarder autour de vous · molette pour approcher",
  camSeat: "🪑 Ma chaise",
  camWide: "🖼️ La pièce",
  camDesk: "📄 Le bureau",

  /* ── le spectateur ────────────────────────────────────────────────────── */
  watch: (n) => `👀 Voir la scène de ${n}`,
  watching: (n) => `Vous regardez l'audience de ${n}.`,
  watchEnd: "L'audience est terminée.",
  watchLeave: "Fermer",
  watchNoSay: "Vous regardez. C'est lui qui parle.",

  /* ── les boutons ───────────────────────────────────────────────────────── */
  layPlans: "📐 Dérouler les plans sur le bureau",
  settle: "🤝 « Je crois qu'on s'est compris. »",
  settleHint: "Signer maintenant. Vous ne saurez jamais jusqu'où il serait allé.",
  leave: "Se lever et partir",

  /* ── hors-zip — LA REPRISE, UNE FOIS PAR AUDIENCE. Demande de Guillaume :
     « si on déconne et on le vexe, permettre une seconde chance ». Offerte
     seulement sur une réponse qui casse quelque chose (`grade==="fault"`),
     avant qu'elle ne parte — décliner ne coûte rien, le budget ne se dépense
     qu'en la prenant. ── */
  redoOffer: "Vous avez contrarié le maire. Voulez-vous vous reprendre ?",
  redoYes: "↩️ Oui, je me reprends",
  redoNo: "Non, j'assume",

  /* ── les familles d'argument ───────────────────────────────────────────── */
  type: { money: "L'argent", risk: "La sûreté", town: "La ville", self: "Lui", heart: "Le fond" },

  /* ── les raisons, affichées à chaque coup ──────────────────────────────── */
  why: {
    "affinity+": (t) => `${t} : c'est son terrain. Il écoute autrement.`,
    "affinity-": (t) => `${t} : ce n'est pas son sujet, et ça s'entend.`,
    "race+": (d) => `Scrutin dans ${d} jours. Tout ce qui se verra pèse double.`,
    "race-": (d) => `Scrutin dans ${d} jours. Il ne veut surtout pas passer pour dépensier.`,
    again: "Deuxième fois de suite sur le même terrain. Il l'a remarqué, et il le montre.",
    slam: "Il ne vous recevra pas avant un quart d'heure, et il sera d'une humeur de chien.",
    heartAgain: "On ne se confie qu'une fois. La seconde, c'est un procédé.",
    burnt: "Il vous a déjà entendu dire ça, la dernière fois.",
    bareRisk: "Sans un plan sur la table, la sûreté n'est qu'une opinion.",
    plansNow: "Vous déroulez les plans à la seconde où il demandait à voir. Il se penche.",
    plansLate: "Il jette un œil au rouleau et ne le déroule pas. Ce n'était pas la question.",
  },

  /* ── ce qu'il demande ──────────────────────────────────────────────────── */
  ask: {
    m1: "Il ne lève pas les yeux tout de suite. Il finit sa ligne, repose son stylo, se cale en arrière. « Vous êtes le fermier du nord. On m'a annoncé un quart d'heure. Je vous écoute. »",
    m2: "« Avant qu'on aille plus loin. Pourquoi vous ? Pourquoi pas un armateur, un chantier, quelqu'un dont c'est le métier ? »",
    m3: "Du bout de l'index, il tapote la pile de dossiers ficelés posée à sa droite. « Un navire. Bien. Vous voyez ce tas ? C'est l'entretien du pont sud. On le repousse depuis deux ans, faute de six mille. Alors dites-moi qui paie le vôtre, et dites-le vite. »",
    m4: "« Admettons. Et après ? Un bateau, ça se répare, ça se cale, ça se garde, et ça se paie encore quand ça ne sert plus. Vous comptez laisser ça sur mon quai et rentrer chez vous ? »",
    m5: "« Qu'est-ce que vous voulez construire, au juste ? Une barque ? Un chalutier ? Vous me parlez d'un navire depuis dix minutes et je ne sais toujours pas de quoi il s'agit. »",
    m6: "Il repose son stylo pour de bon. « Kerguélen. Célestin Kerguélen ? Celui-là ne se dérange pas pour rien. »",
    m7: "Il tapote le sous-main, deux fois, du plat de la main. « Et si ça coule ? Qui signe, en bas de la page ? »",
    m8: "« Le quai est public. Vous savez ce que ça veut dire ? Que si quelqu'un se casse une jambe sur vos madriers, c'est la commune qui paie l'avocat. »",
    m9: "« Et qui va le mener en mer, votre navire ? Vous ? »",
    m10: "« Bon. Admettons que je signe. Qu'est-ce que la ville y gagne, elle ? »",
    m11: "Il ne sourit pas. « Et moi ? Vous n'avez pas fait la route pour le bien de Valley Town. Qu'est-ce que vous voulez de moi, exactement ? »",
    m12: "Il se lève, va à la fenêtre, et reste là, dos à vous. « Vous voyez le quai, d'ici ? »",
  },

  /* ── la phrase que le maire élu ajoute, et lui seul ────────────────────── */
  tint: {
    m2: {
      vasseur:   "Elle regarde vos mains avant de regarder votre visage. « Bon. »",
      lantier:   "« Le nord. Vous passez par le pont est, alors. Il tient toujours ? »",
      bonnefoy:  "Elle ouvre un registre, y note quelque chose, le referme. « Bien. »",
      delaunay:  "« Le nord. Vous descendez au lac, quelquefois ? »",
      toussaint: "« La ferme Vallée. Nous avons des relevés de chez vous qui datent de 1890. Personne ne les a jamais demandés. »",
    },
    m7: {
      vasseur:   "« J'ai signé pour un fossé de drainage, il y a vingt ans. Il a emporté trois hectares. J'y pense tous les matins. »",
      lantier:   "« J'ai fait construire deux ponts. Le premier, je l'ai signé sans le lire. »",
      bonnefoy:  "« Ma signature engage la commune. C'est écrit dans le code, pas dans ma tête. »",
      delaunay:  "« Il y a eu un noyé sur ce lac il y a onze ans. Vous ne le savez pas. Moi, si. »",
      toussaint: "« Tout est archivé, vous savez. Les bonnes décisions et les autres. Surtout les autres. »",
    },
    m12: {
      vasseur:   "« Mon père y a débarqué des betteraves pendant quarante ans. Il n'y a plus de betteraves. »",
      lantier:   "« Je l'ai fait repaver en première année. Vingt-deux mille. Pour quatre barques. »",
      bonnefoy:  "« Il figure à l'inventaire comme équipement portuaire. Il n'y a pas de port. »",
      delaunay:  "« Quand j'étais petite, il y avait des voiles. Trois, quatre. Plus maintenant. »",
      toussaint: "« Il existe une photo de 1911 aux archives. On y voit un mât. Un seul, mais un mât. »",
    },
  },

  /* ── ce qu'on répond ───────────────────────────────────────────────────── */
  say: {
    m1a: "« Je viens vous proposer un chantier. Pas vous demander une faveur. »",
    m1b: "« Honnêtement, je ne sais pas par où commencer. Il faudrait que je vous montre. »",
    m1c: "« Un quart d'heure ? J'ai fait deux heures de route pour venir vous voir. »",

    m2a: "« Parce que personne d'autre ne l'a proposé. Vous en avez vu passer beaucoup, des armateurs, ces dix dernières années ? »",
    m2b: "« Parce que j'ai le bois, les bras et le temps. C'est déjà plus que ce qu'a la commune. »",
    m2c: "« Parce que vous n'avez personne d'autre sous la main. »",

    m3a:  "« J'ai déjà payé. Vingt-quatre mille à Kerguélen, de ma poche. Le reste, c'est du bois et des bras. »",
    m3a0: "« Moi. Je n'ai pas encore le chiffre exact, mais la commune ne sortira pas un centime. »",
    m3b:  "« Votre pont sud tiendra bien deux ans de plus. Le mien, non. »",
    m3c:  "« Moi. Tout. La commune ne sortira pas un sou, jamais. »",

    m4a: "« Il ne restera pas sur votre quai. Il part. C'est même toute l'idée. »",
    m4b: "« Je l'entretiendrai. Vous pouvez l'écrire dans l'arrêté. »",
    m4c: "« On verra ça le moment venu. »",

    m5a:  "« Trente-deux pieds, coque de chêne, gréement aurique. Tout est chiffré, planche par planche. »",
    m5a0: "« Quelque chose capable de sortir du lac. C'est la seule chose qui compte. »",
    m5b:  "« Quelque chose qui tienne la mer. Je ne sais pas mieux le dire. »",
    m5c:  "« Ça, c'est mon affaire. Vous, vous signez. »",

    m6a:  "« Non. Il ne se dérange pas pour rien. Il s'est dérangé. »",
    m6a0: "« C'est à lui que je compte m'adresser. »",
    m6b:  "« Il a passé quinze jours sur la grève à mesurer votre lac. »",
    m6c:  "« Vous le connaissez ? Ça tombe bien : il a parlé de vous en très bons termes. »",

    m7a: "« Vous. Et c'est exactement pour ça que je suis venu avant d'abattre le premier arbre. »",
    m7b: "« Ça ne coulera pas. »",
    m7c: "« Personne n'a besoin de signer. On dira que le chantier était là avant vous. »",

    m8a: "« Alors faites-en un chantier de la commune. Barrières, panneau, arrêté, horaires. Je m'y plie. »",
    m8b: "« J'assurerai le chantier à mes frais. »",
    m8c: "« Franchement, personne ne va sur ce quai. Il n'y a rien à y voir. »",

    m9a: "« Eduardo Da Fonseca. Demandez-lui vous-même, il ne vous dira pas autre chose. »",
    m9b: "« Quelqu'un qui a déjà navigué. Pas moi. »",
    m9c: "« Est-ce que ça vous regarde ? »",

    m10a: "« Un chantier. Tristan occupé tout l'hiver, du monde sur le quai le dimanche, et quelque chose à regarder. »",
    m10b: "« Du commerce. Ce qui part d'ici finit toujours par revenir. »",
    m10c: "« Une belle ligne dans votre bilan de mandat. »",

    m11a: "« Votre nom en bas d'un arrêté que personne n'a osé prendre avant vous. »",
    m11b: "« Une signature. Rien d'autre. »",
    m11c: "« Dites votre prix. »",

    m12a: "« Je le vois. C'est pour ça que j'ai demandé ce rendez-vous, et pas un autre. »",
    m12b: "« On le verrait de la place, un mât. Même de loin. »",
    m12c: "« De là, on doit bien voir le pont sud, aussi. »",
  },

  /* ── pourquoi il réagit comme ça. Une par réplique, sans exception. ────── */
  tell: {
    m1a: "Vous êtes le premier de la matinée à ne pas demander une faveur. Il en a refusé quatre avant vous.",
    m1b: "Ça ne le braque pas. Mais il vous a donné un quart d'heure, et vous venez d'en dépenser une partie à annoncer que vous alliez parler.",
    m1c: "Vous lui présentez une facture avant d'avoir dit bonjour. Il reçoit soixante personnes par semaine, et toutes ont fait de la route.",

    m2a: "Il ne répond pas tout de suite. Non, il n'en a pas vu passer. Vous ne lui avez pas dit qu'il était démuni : vous lui avez dit que la ville l'était.",
    m2b: "C'est vrai, et c'est utile. Ça reste un inventaire. Il attendait une raison.",
    m2c: "Un mot d'écart avec ce qu'il fallait dire. « Personne ne l'a proposé » parle de la ville. « Vous n'avez personne » parle de lui, et c'est comme ça qu'il l'entend.",

    m3a:  "Vingt-quatre mille. Quatre fois son pont. Il ne demandait pas une promesse, il demandait une preuve, et la vôtre est plus grosse que son problème.",
    m3a0: "« Pas encore le chiffre exact » est la formule qu'il entend chaque fois qu'un chantier va coûter le double. Il vous croit. Pas assez.",
    m3b:  "C'est exact, et il le sait mieux que vous. On ne dit pas à un maire que ses priorités peuvent attendre. Surtout quand c'est vrai.",
    m3c:  "Vous venez de lui décrire un chantier privé sur un quai public. C'est l'objection qu'il cherchait depuis dix minutes, et vous la lui avez apportée vous-même.",

    m4a: "Il n'avait pas envisagé qu'on lui propose quelque chose qui s'en aille. Tout ce qu'on lui demande, d'habitude, reste, et il faut l'entretenir.",
    m4b: "Il note. Une promesse qu'on accepte de voir écrite vaut mieux qu'une promesse. Il ne signe pas des arrêtés pour se rassurer.",
    m4c: "C'est mot pour mot ce qu'on lui répond toute la journée. Il a un tiroir entier de choses qu'on verrait le moment venu.",

    m5a:  "Trois chiffres et un mot de métier. Il ignore ce qu'est un gréement aurique, et c'est précisément pour ça que ça marche : quelqu'un, quelque part, a fait le travail.",
    m5a0: "C'est une intention, pas un bateau. Assez pour qu'il ne vous mette pas dehors. Pas assez pour qu'il prenne un crayon.",
    m5b:  "Il apprécie qu'on n'invente pas. Il aurait quand même préféré une longueur.",
    m5c:  "Vous venez de lui expliquer son métier. Sa signature engage la commune sur un objet dont il ne connaît pas la taille, et c'est exactement ce qu'un maire n'a pas le droit de faire.",

    m6a:  "Sept mots. Il regarde le rouleau, puis vous. Il connaît les honoraires de Kerguélen : vous venez de lui dire ce que vaut votre sérieux sans prononcer un chiffre.",
    m6a0: "« Compter s'adresser » n'est pas « s'être adressé ». Il en a reçu, des projets au conditionnel.",
    m6b:  "Il ignorait qu'on mesurait son lac. Ça le flatte un peu et ça l'inquiète un peu, ce qui, au total, ne fait pas grand-chose.",
    m6c:  "Kerguélen n'a parlé de personne. Un maire reconnaît un compliment inventé à la même chose que tout le monde : il est trop bien tourné.",

    m7a: "Il se cale en arrière. Vous venez demander avant, pas après. C'est la première fois de la semaine, et il n'a rien à répondre à ça.",
    m7b: "Il aimerait vous croire. Ce n'est pas une réponse à la question qu'il a posée.",
    m7c: "Vous lui proposez de se couvrir. Autrement dit, vous venez de supposer qu'il a quelque chose à cacher, et vous l'avez dit à voix haute dans son bureau.",

    m8a: "Vous venez de lui rendre le quai. Un chantier qu'il encadre est un chantier qu'il contrôle, et un maire préfère toujours contrôler que subir.",
    m8b: "Correct. Une assurance règle un accident. Elle ne règle pas le conseil municipal.",
    m8c: "C'est vrai. C'est son quai, dans sa ville, et vous venez de lui expliquer que personne n'y va. Un fait exact peut être une insulte.",

    m9a: "Un nom, et quelqu'un à qui vérifier. Il note le nom. C'est la première chose de tout l'entretien qu'il peut contrôler sans vous.",
    m9b: "Il apprécie que vous ne vous imaginiez pas capitaine. Ça reste quelqu'un sans nom.",
    m9c: "Oui. Il délivre l'autorisation d'un navire qui partira de sa commune. Savoir qui le mène est très exactement son travail.",

    m10a: "Du travail, une promenade et un spectacle en une seule phrase. Il refait le calcul dans sa tête et ne trouve rien à retirer.",
    m10b: "Vrai à long terme. Un mandat dure trente jours.",
    m10c: "Il l'avait pensé. Il n'aime pas qu'on le pense à sa place, et encore moins qu'on le dise avant lui.",

    m11a: "Il a demandé. C'est le seul moment de l'entretien où lui parler de lui répond à sa question, et vous ne lui promettez pas une statue : vous lui promettez un risque.",
    m11b: "Sobre, et un peu court. Il vous tendait une perche.",
    m11c: "Il ne dit rien pendant trois secondes. Puis il se lève, ouvre la porte, et attend. Vous ne saurez jamais ce qu'il allait répondre.",

    m12a: "Il ne se retourne pas tout de suite. Vous venez de lui dire que vous étiez venu le voir lui, pour ça, et il n'a aucune raison d'en douter.",
    m12b: "Il aime l'image. Il aimerait aussi savoir combien elle coûte.",
    m12c: "Il rêvait. Vous venez de lui rappeler, au mot près, la seule chose qu'il n'a pas réussi à faire en deux ans.",
  },

  /* ── comment ça finit ──────────────────────────────────────────────────── */
  end: {
    plain: "Il tire le tampon vers lui, souffle dessus par habitude, et l'abat sur le coin de la feuille. « C'est un chantier de la commune. Ne me le faites pas regretter. »",
    good: "Il tamponne, signe, puis relit ce qu'il vient de signer, ce qu'il ne fait jamais. « Tenez-moi au courant. Vraiment. »",
    full: "Il tamponne sans regarder la feuille, parce qu'il vous regarde vous. « Quand vous aurez autre chose à me demander, prenez rendez-vous directement. Pas la peine de passer par l'accueil. »",
    out: "Il consulte l'horloge de la cheminée, se lève, et vous tend la main. « J'ai un conseil dans dix minutes. Repassez me voir. Je ne dis pas non, je dis pas aujourd'hui. »",
    walked: "Il ne dit plus rien depuis un moment. Il repousse le rouleau vers vous, du bout des doigts, et rouvre son dossier. L'entretien est fini, personne ne l'a annoncé.",
    slam: "Vous vous levez au milieu de sa phrase. La porte claque assez fort pour que la vitre du trumeau tremble. Dans le couloir, on a entendu.",
    thrown: "Il se lève, ouvre la porte de son bureau, et attend, la main sur la poignée, sans un mot.",
  },
  /* ⚠️ CE QUE LE JEU DIT APRÈS, ET C'EST LÀ QUE LA CONFIANCE DEVIENT VISIBLE.
     Une récompense qui ne se lit nulle part n'existe pas (leçon du 453 : chaque
     chose qu'un document dit visible doit avoir un chemin de code qui l'affiche). */
  after: {
    signed: "Le chantier naval est autorisé. Tristan peut commencer à débiter.",
    trust1: "Le maire se souviendra de vous.",
    trust2: "Le maire vous a à la bonne. La prochaine fois sera plus courte.",
    trust3: "Vous avez ses coudées franches. La prochaine fois, il écoutera avant de compter.",
    again: "Vous pouvez redemander une audience à l'accueil. Il se souvient de ce que vous lui avez déjà dit.",
    /* ⚠️⚠️ 2026-08-31 — CETTE LIGNE MANQUAIT, ET C'ÉTAIT LA SEULE FIN SUR SIX SANS
       CONCLUSION. `MaireScene` aiguille `over === "slam"` ici (et l'exclut de
       `again` juste après), donc la porte claquée affichait sa narration puis un
       blanc : le joueur voyait la vitre trembler et n'apprenait nulle part ce que
       ça lui coûtait. La sanction, elle, existait depuis le 480 — c'est la
       famille « un mécanisme sans affichage » du §4. */
    slam: "Il ne vous recevra pas avant un quart d'heure. Ninon vous redonnera un rendez-vous quand vous voudrez — mais il se souviendra de la porte.",
  },
  chat: {
    signed: (n) => `${n} a obtenu la signature du maire : le chantier naval est autorisé.`,
    failed: (n) => `${n} sort de la mairie sans signature.`,
    thrown: (n) => `${n} s'est fait raccompagner à la porte du bureau du maire.`,
    slam: (n) => `${n} a claqué la porte du bureau du maire.`,
    booked: (n) => `${n} a obtenu un rendez-vous avec le maire.`,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HORS-ZIP 2026-09-02 — QUAND LE MAIRE EST UNE FEMME.
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « créer une version féminine, quand le maire est une
   femme ».

   ⚠️⚠️⚠️ CE N'ÉTAIT PAS UNE VERSION À INVENTER, C'ÉTAIT UNE INCOHÉRENCE À
   RÉPARER. `L.candName` nomme **Odile** Vasseur, **Séverine** Bonnefoy et
   **Ninon** Delaunay depuis le 480 — TROIS maires sur cinq — pendant que la
   table ci-dessus écrivait « Il ouvre un registre, y note quelque chose » et que
   `buildMayor` ne savait dessiner qu'un homme. Le nom, le corps et le texte
   racontaient trois personnages différents, et personne ne pouvait le voir en
   relisant l'un des trois.

   ⚠️⚠️ LA FORME EST UNE SURCHARGE ÉPARSE, PAS UNE SECONDE TABLE. Recopier les
   cent quatre-vingt-douze clés au féminin aurait produit deux textes à tenir
   d'accord — c'est-à-dire le défaut décrit trois fois dans ce fichier (la quête
   restée anglaise, `MAIRE_EN` recopié, le chiffre de banc à deux endroits). Ici
   on n'écrit QUE ce qui change : les répliques du maire ne bougent pas d'un mot
   (ce qu'elle dit ne dépend pas de son sexe), seules changent les DIDASCALIES
   et les tournures qui la désignent.
   ⚠️ `verify-strings` vérifie que chaque clé de cette table existe dans
   `MAIRE_FR` : une clé mal orthographiée ici serait un texte féminin que
   personne ne verrait jamais, et rien ne le dirait.
   ⚠️ CE QUI N'EST **PAS** ICI, ET C'EST DÉLIBÉRÉ :
     · `say` — c'est LE JOUEUR qui parle, et les « il/lui » qu'on y lit désignent
       Kerguélen ou Eduardo, pas le maire. Les féminiser aurait changé de sujet ;
     · `tint` — ces répliques sont déjà indexées PAR MAIRE, donc les trois
       féminines se corrigent à leur place, dans la table de base. Une surcharge
       aurait été une seconde adresse pour la même ligne ;
     · `triesAt` — « vous êtes déjà venu » parle de VOUS.
   ═══════════════════════════════════════════════════════════════════════════ */
const MAIRE_FR_F = {
  streakHold: "Elle ne décroche plus.",
  streakGain: "Elle finit vos phrases.",
  audienceDay: "C'est son jour d'audience. Elle est préparée, et elle a le temps.",
  busyDay: "Ce n'est pas son jour d'audience. Vous la prenez entre deux dossiers.",
  moodSay: {
    great: "« Vous tombez bien. Elle a ri au téléphone il y a dix minutes, ça n'arrive pas tous les jours. »",
    good:  "« Elle est de bonne composition ce matin. Le conseil s'est bien passé. »",
    mid:   "« Comme d'habitude. Ni bien ni mal. Elle vous écoutera. »",
    bad:   "« Je vous préviens : la réunion de dix heures s'est mal terminée. Elle n'est pas commode. »",
  },
  clerkAsk: "🎩 Demander une audience à la maire",
  bookedWhen: (mmss) => `Elle vous reçoit dans ${mmss}.`,
  bookedBy: (n) => `${n} a rendez-vous avec la maire.`,
  blockedFor: (mmss) => `Elle ne vous recevra pas avant ${mmss}. « Elle a demandé à ne pas être dérangée. »`,
  doorNotYet: "La maire n'est pas disponible. Prenez rendez-vous à l'accueil.",
  slamHint: "Vous ne pourrez plus la voir avant un quart d'heure, et elle s'en souviendra.",
  watchNoSay: "Vous regardez. C'est elle qui parle.",
  settleHint: "Signer maintenant. Vous ne saurez jamais jusqu'où elle serait allée.",
  redoOffer: "Vous avez contrarié la maire. Voulez-vous vous reprendre ?",
  /* ⚠️ SEUL `self` CHANGE : les quatre autres familles d'argument n'ont pas de
     genre. Recopier les cinq aurait été quatre phrases identiques déguisées en
     traduction, et le banc les compte comme telles. */
  type: { self: "Elle" },
  why: {
    "affinity+": (t) => `${t} : c'est son terrain. Elle écoute autrement.`,
    "race-": (d) => `Scrutin dans ${d} jours. Elle ne veut surtout pas passer pour dépensière.`,
    again: "Deuxième fois de suite sur le même terrain. Elle l'a remarqué, et elle le montre.",
    slam: "Elle ne vous recevra pas avant un quart d'heure, et elle sera d'une humeur de chien.",
    burnt: "Elle vous a déjà entendu dire ça, la dernière fois.",
    plansNow: "Vous déroulez les plans à la seconde où elle demandait à voir. Elle se penche.",
    plansLate: "Elle jette un œil au rouleau et ne le déroule pas. Ce n'était pas la question.",
  },
  ask: {
    m1: "Elle ne lève pas les yeux tout de suite. Elle finit sa ligne, repose son stylo, se cale en arrière. « Vous êtes le fermier du nord. On m'a annoncé un quart d'heure. Je vous écoute. »",
    m3: "Du bout de l'index, elle tapote la pile de dossiers ficelés posée à sa droite. « Un navire. Bien. Vous voyez ce tas ? C'est l'entretien du pont sud. On le repousse depuis deux ans, faute de six mille. Alors dites-moi qui paie le vôtre, et dites-le vite. »",
    m6: "Elle repose son stylo pour de bon. « Kerguélen. Célestin Kerguélen ? Celui-là ne se dérange pas pour rien. »",
    m7: "Elle tapote le sous-main, deux fois, du plat de la main. « Et si ça coule ? Qui signe, en bas de la page ? »",
    m11: "Elle ne sourit pas. « Et moi ? Vous n'avez pas fait la route pour le bien de Valley Town. Qu'est-ce que vous voulez de moi, exactement ? »",
    m12: "Elle se lève, va à la fenêtre, et reste là, dos à vous. « Vous voyez le quai, d'ici ? »",
  },
  tell: {
    m1a: "Vous êtes le premier de la matinée à ne pas demander une faveur. Elle en a refusé quatre avant vous.",
    m1b: "Ça ne la braque pas. Mais elle vous a donné un quart d'heure, et vous venez d'en dépenser une partie à annoncer que vous alliez parler.",
    m1c: "Vous lui présentez une facture avant d'avoir dit bonjour. Elle reçoit soixante personnes par semaine, et toutes ont fait de la route.",
    m2a: "Elle ne répond pas tout de suite. Non, elle n'en a pas vu passer. Vous ne lui avez pas dit qu'elle était démunie : vous lui avez dit que la ville l'était.",
    m2b: "C'est vrai, et c'est utile. Ça reste un inventaire. Elle attendait une raison.",
    m2c: "Un mot d'écart avec ce qu'il fallait dire. « Personne ne l'a proposé » parle de la ville. « Vous n'avez personne » parle d'elle, et c'est comme ça qu'elle l'entend.",
    m3a:  "Vingt-quatre mille. Quatre fois son pont. Elle ne demandait pas une promesse, elle demandait une preuve, et la vôtre est plus grosse que son problème.",
    m3a0: "« Pas encore le chiffre exact » est la formule qu'elle entend chaque fois qu'un chantier va coûter le double. Elle vous croit. Pas assez.",
    m3b:  "C'est exact, et elle le sait mieux que vous. On ne dit pas à une maire que ses priorités peuvent attendre. Surtout quand c'est vrai.",
    m3c:  "Vous venez de lui décrire un chantier privé sur un quai public. C'est l'objection qu'elle cherchait depuis dix minutes, et vous la lui avez apportée vous-même.",
    m4a: "Elle n'avait pas envisagé qu'on lui propose quelque chose qui s'en aille. Tout ce qu'on lui demande, d'habitude, reste, et il faut l'entretenir.",
    m4b: "Elle note. Une promesse qu'on accepte de voir écrite vaut mieux qu'une promesse. Elle ne signe pas des arrêtés pour se rassurer.",
    m4c: "C'est mot pour mot ce qu'on lui répond toute la journée. Elle a un tiroir entier de choses qu'on verrait le moment venu.",
    m5a:  "Trois chiffres et un mot de métier. Elle ignore ce qu'est un gréement aurique, et c'est précisément pour ça que ça marche : quelqu'un, quelque part, a fait le travail.",
    m5a0: "C'est une intention, pas un bateau. Assez pour qu'elle ne vous mette pas dehors. Pas assez pour qu'elle prenne un crayon.",
    m5b:  "Elle apprécie qu'on n'invente pas. Elle aurait quand même préféré une longueur.",
    m5c:  "Vous venez de lui expliquer son métier. Sa signature engage la commune sur un objet dont elle ne connaît pas la taille, et c'est exactement ce qu'une maire n'a pas le droit de faire.",
    m6a:  "Sept mots. Elle regarde le rouleau, puis vous. Elle connaît les honoraires de Kerguélen : vous venez de lui dire ce que vaut votre sérieux sans prononcer un chiffre.",
    m6a0: "« Compter s'adresser » n'est pas « s'être adressé ». Elle en a reçu, des projets au conditionnel.",
    m6b:  "Elle ignorait qu'on mesurait son lac. Ça la flatte un peu et ça l'inquiète un peu, ce qui, au total, ne fait pas grand-chose.",
    m6c:  "Kerguélen n'a parlé de personne. Une maire reconnaît un compliment inventé à la même chose que tout le monde : il est trop bien tourné.",
    m7a: "Elle se cale en arrière. Vous venez demander avant, pas après. C'est la première fois de la semaine, et elle n'a rien à répondre à ça.",
    m7b: "Elle aimerait vous croire. Ce n'est pas une réponse à la question qu'elle a posée.",
    m7c: "Vous lui proposez de se couvrir. Autrement dit, vous venez de supposer qu'elle a quelque chose à cacher, et vous l'avez dit à voix haute dans son bureau.",
    m8a: "Vous venez de lui rendre le quai. Un chantier qu'elle encadre est un chantier qu'elle contrôle, et une maire préfère toujours contrôler que subir.",
    m9a: "Un nom, et quelqu'un à qui vérifier. Elle note le nom. C'est la première chose de tout l'entretien qu'elle peut contrôler sans vous.",
    m9b: "Elle apprécie que vous ne vous imaginiez pas capitaine. Ça reste quelqu'un sans nom.",
    m9c: "Oui. Elle délivre l'autorisation d'un navire qui partira de sa commune. Savoir qui le mène est très exactement son travail.",
    m10a: "Du travail, une promenade et un spectacle en une seule phrase. Elle refait le calcul dans sa tête et ne trouve rien à retirer.",
    m10c: "Elle l'avait pensé. Elle n'aime pas qu'on le pense à sa place, et encore moins qu'on le dise avant elle.",
    m11a: "Elle a demandé. C'est le seul moment de l'entretien où lui parler d'elle répond à sa question, et vous ne lui promettez pas une statue : vous lui promettez un risque.",
    m11b: "Sobre, et un peu court. Elle vous tendait une perche.",
    m11c: "Elle ne dit rien pendant trois secondes. Puis elle se lève, ouvre la porte, et attend. Vous ne saurez jamais ce qu'elle allait répondre.",
    m12a: "Elle ne se retourne pas tout de suite. Vous venez de lui dire que vous étiez venu la voir elle, pour ça, et elle n'a aucune raison d'en douter.",
    m12b: "Elle aime l'image. Elle aimerait aussi savoir combien elle coûte.",
    m12c: "Elle rêvait. Vous venez de lui rappeler, au mot près, la seule chose qu'elle n'a pas réussi à faire en deux ans.",
  },
  end: {
    plain: "Elle tire le tampon vers elle, souffle dessus par habitude, et l'abat sur le coin de la feuille. « C'est un chantier de la commune. Ne me le faites pas regretter. »",
    good: "Elle tamponne, signe, puis relit ce qu'elle vient de signer, ce qu'elle ne fait jamais. « Tenez-moi au courant. Vraiment. »",
    full: "Elle tamponne sans regarder la feuille, parce qu'elle vous regarde vous. « Quand vous aurez autre chose à me demander, prenez rendez-vous directement. Pas la peine de passer par l'accueil. »",
    out: "Elle consulte l'horloge de la cheminée, se lève, et vous tend la main. « J'ai un conseil dans dix minutes. Repassez me voir. Je ne dis pas non, je dis pas aujourd'hui. »",
    walked: "Elle ne dit plus rien depuis un moment. Elle repousse le rouleau vers vous, du bout des doigts, et rouvre son dossier. L'entretien est fini, personne ne l'a annoncé.",
    thrown: "Elle se lève, ouvre la porte de son bureau, et attend, la main sur la poignée, sans un mot.",
  },
  after: {
    trust1: "La maire se souviendra de vous.",
    trust2: "La maire vous a à la bonne. La prochaine fois sera plus courte.",
    trust3: "Vous avez ses coudées franches. La prochaine fois, elle écoutera avant de compter.",
    again: "Vous pouvez redemander une audience à l'accueil. Elle se souvient de ce que vous lui avez déjà dit.",
    slam: "Elle ne vous recevra pas avant un quart d'heure. L'accueil vous redonnera un rendez-vous quand vous voudrez — mais elle se souviendra de la porte.",
  },
  chat: {
    signed: (n) => `${n} a obtenu la signature de la maire : le chantier naval est autorisé.`,
    thrown: (n) => `${n} s'est fait raccompagner à la porte du bureau de la maire.`,
    slam: (n) => `${n} a claqué la porte du bureau de la maire.`,
    booked: (n) => `${n} a obtenu un rendez-vous avec la maire.`,
  },
};

/* ⚠️⚠️ LA FUSION EST FAITE UNE FOIS ET MISE EN CACHE, ET ELLE NE DESCEND QUE
   D'UN ÉTAGE — c'est tout ce dont cette table a besoin, et une fusion profonde
   générique serait du code qu'on ne peut pas relire. Chaque valeur de la
   surcharge remplace la sienne ; chaque sous-objet est fusionné clé à clé.
   ⚠️ ELLE NE MODIFIE JAMAIS `MAIRE_FR` : un étalement recopie les références des
   sous-objets, donc écrire dans le résultat écrirait dans la table de base — le
   défaut exact payé le 2026-08-31 sur `POSE.closed` (« une table de référence
   qu'on étale à plat est une table qu'on modifie »). On construit un objet neuf
   pour chaque sous-table touchée. */
const MAIRE_MERGED = {};
function maireFor(fem) {
  if (!fem) return MAIRE_FR;
  if (MAIRE_MERGED.f) return MAIRE_MERGED.f;
  const out = { ...MAIRE_FR };
  for (const k in MAIRE_FR_F) {
    const v = MAIRE_FR_F[k];
    out[k] = (v && typeof v === "object" && !Array.isArray(v) && typeof v !== "function")
      ? { ...MAIRE_FR[k], ...v } : v;
  }
  MAIRE_MERGED.f = out;
  return out;
}

/* ⚠️⚠️ ZIP 480 — L'AUDIENCE EST BILINGUE LE JOUR DE SA NAISSANCE, ET C'EST LE
   BANC QUI L'A EXIGÉ. Le premier jet référençait `MAIRE_FR` des deux côtés,
   sous une note qui expliquait bien pourquoi c'était acceptable ; `verify-strings`
   a refusé, et il avait raison : c'est très exactement le défaut qu'il a été
   écrit pour attraper (la quête est restée anglaise des deux côtés pendant six
   zips sous une note tout aussi bien tournée). *Une exception qu'on s'accorde à
   soi-même dans le zip où on écrit le texte est une exception qu'on n'écrira
   jamais.* Quatre-vingt-dix phrases traduites le jour même coûtent une heure ;
   traduites six zips plus tard, elles coûtent une relecture complète.
   ⚠️ Le comique reste dans le FOND, jamais dans la forme : personne ne fait de
   mot d'esprit, tout le monde est poli, c'est la situation qui est drôle. */
const MAIRE_EN = {
  title: "Audience",
  gauge: "Support",
  streakHold: "He has stopped drifting.",
  streakGain: "He is finishing your sentences.",
  slip: "You have just lost the room.",
  bare: "You have nothing to put on that desk.",
  audienceDay: "It is his audience day. He is prepared, and he has time.",
  busyDay: "This is not his audience day. You are catching him between two files.",
  race: (d) => `Municipal elections in ${d} days.`,
  triesAt: (n) => n === 1 ? "You have been here once before." : `You have been here ${n} times before.`,

  mood: {
    great: "Very favourable",
    good:  "Favourable",
    mid:   "Average",
    bad:   "Poor",
    awful: "Very poor",
  },
  moodSay: {
    great: "\"You have picked your day. He laughed on the telephone ten minutes ago, and that does not happen often.\"",
    good:  "\"He is in a good frame of mind this morning. The council went well.\"",
    mid:   "\"The usual. Neither one thing nor the other. He will hear you out.\"",
    bad:   "\"Fair warning: the ten o'clock meeting ended badly. He is not easy today.\"",
    awful: "\"Frankly, I would not advise it. But that is your business.\"",
  },
  moodSour: "\"Ah. It is you.\" She says nothing more, and writes something down.",
  clerkAsk: "🎩 Request an audience with the Mayor",
  bookedWhen: (mmss) => `He will see you in ${mmss}.`,
  bookedNow: "It is time. His office is upstairs, at the end of the corridor.",
  bookedStale: "You let the hour go by. You will have to ask for another one.",
  bookedBy: (n) => `${n} has an appointment with the Mayor.`,
  blockedFor: (mmss) => `He will not see you before ${mmss}. \"He asked not to be disturbed.\"`,
  doorNotYet: "The Mayor is not available. Make an appointment at the front desk.",
  doorWait: (mmss) => `Your appointment is in ${mmss}. His door is still shut.`,
  doorOther: (n) => `It is ${n} who has the appointment, not you.`,

  slam: "🚪 Stand up and slam the door",
  slamHint: "He will not see you for a quarter of an hour, and he will remember.",

  camHint: "Drag to look around · wheel to move closer",
  camSeat: "🪑 My chair",
  camWide: "🖼️ The room",
  camDesk: "📄 The desk",

  watch: (n) => `👀 Watch ${n}'s audience`,
  watching: (n) => `You are watching ${n}'s audience.`,
  watchEnd: "The audience is over.",
  watchLeave: "Close",
  watchNoSay: "You are watching. He is the one talking.",

  layPlans: "📐 Unroll the plans on the desk",
  settle: "🤝 \"I think we understand each other.\"",
  settleHint: "Sign now. You will never know how far he would have gone.",
  leave: "Stand up and leave",

  redoOffer: "You've upset the mayor. Do you want to take that back?",
  redoYes: "↩️ Yes, take it back",
  redoNo: "No, I'll own it",

  type: { money: "Money", risk: "Liability", town: "The town", self: "Himself", heart: "The truth" },

  why: {
    "affinity+": (t) => `${t}: that is his ground. He listens differently.`,
    "affinity-": (t) => `${t}: not his subject, and you can hear it.`,
    "race+": (d) => `Election in ${d} days. Anything that will be seen counts double.`,
    "race-": (d) => `Election in ${d} days. The last thing he wants is to look like a spender.`,
    again: "Second time running on the same ground. He noticed, and he lets you see that he noticed.",
    slam: "He will not see you for a quarter of an hour, and he will be in a foul temper.",
    heartAgain: "You only confide once. The second time it is a technique.",
    burnt: "He has heard you say that before, last time.",
    bareRisk: "With no drawing on the table, safety is just an opinion.",
    plansNow: "You unroll the plans the very second he asked to see. He leans in.",
    plansLate: "He glances at the roll and does not unroll it. That was not the question.",
  },

  ask: {
    m1: "He does not look up right away. He finishes his line, puts down his pen, leans back. \"You are the farmer from the north. I was told a quarter of an hour. I am listening.\"",
    m2: "\"Before we go any further. Why you? Why not a shipowner, a yard, someone who does this for a living?\"",
    m3: "With one fingertip he taps the stack of tied folders at his right. \"A ship. Fine. You see that pile? That is the south bridge maintenance. We have been putting it off for two years for want of six thousand. So tell me who pays for yours, and tell me quickly.\"",
    m4: "\"Say I grant that. And then? A boat gets repaired, chocked, guarded, and it still costs money once it is no use to anyone. Do you intend to leave that on my quay and go home?\"",
    m5: "\"What is it you want to build, exactly? A dinghy? A trawler? You have been saying the word ship for ten minutes and I still do not know what we are talking about.\"",
    m6: "He puts his pen down for good. \"Kerguélen. Célestin Kerguélen? That one does not travel for nothing.\"",
    m7: "He taps the desk pad twice, flat-handed. \"And if it sinks? Who signs, at the bottom of the page?\"",
    m8: "\"The quay is public. Do you know what that means? It means that if somebody breaks a leg on your timbers, the commune pays the lawyer.\"",
    m9: "\"And who is going to take it to sea, this ship of yours? You?\"",
    m10: "\"Right. Say I sign. What does the town get out of it?\"",
    m11: "He does not smile. \"And me? You did not make that journey for the good of Valley Town. What is it you want from me, exactly?\"",
    m12: "He stands, walks to the window, and stays there with his back to you. \"Can you see the quay from here?\"",
  },

  tint: {
    m2: {
      vasseur:   "He looks at your hands before he looks at your face. \"Right.\"",
      lantier:   "\"The north. So you come over the east bridge. Is it still holding?\"",
      bonnefoy:  "He opens a register, writes something in it, closes it again. \"Good.\"",
      delaunay:  "\"The north. Do you ever come down to the lake?\"",
      toussaint: "\"Valley Farm. We hold survey records of your land going back to 1890. Nobody has ever asked for them.\"",
    },
    m7: {
      vasseur:   "\"I signed for a drainage ditch, twenty years ago. It took three hectares with it. I think about it every morning.\"",
      lantier:   "\"I have had two bridges built. The first one I signed without reading it.\"",
      bonnefoy:  "\"My signature binds the commune. That is written in the code, not in my head.\"",
      delaunay:  "\"A man drowned in that lake eleven years ago. You do not know that. I do.\"",
      toussaint: "\"Everything is archived, you know. The good decisions and the other kind. Especially the other kind.\"",
    },
    m12: {
      vasseur:   "\"My father landed beet on it for forty years. There is no beet any more.\"",
      lantier:   "\"I had it repaved in my first year. Twenty-two thousand. For four rowing boats.\"",
      bonnefoy:  "\"It is listed in the inventory as harbour equipment. There is no harbour.\"",
      delaunay:  "\"When I was small there were sails on it. Three, four of them. Not any more.\"",
      toussaint: "\"There is a photograph from 1911 in the archive. You can see a mast in it. One mast, but a mast.\"",
    },
  },

  say: {
    m1a: "\"I have come to offer you a public works project. Not to ask you a favour.\"",
    m1b: "\"Honestly, I do not know where to start. I would rather show you.\"",
    m1c: "\"A quarter of an hour? I travelled two hours to come and see you.\"",

    m2a: "\"Because nobody else has offered. How many shipowners have you seen come through here in the last ten years?\"",
    m2b: "\"Because I have the timber, the hands and the time. That is already more than the commune has.\"",
    m2c: "\"Because you have got nobody else to hand.\"",

    m3a:  "\"I have already paid. Twenty-four thousand to Kerguélen, out of my own pocket. The rest is timber and labour.\"",
    m3a0: "\"I do. I do not have the exact figure yet, but the commune will not put in a penny.\"",
    m3b:  "\"Your south bridge will hold another two years. Mine will not.\"",
    m3c:  "\"I do. All of it. The commune will not pay a single coin, ever.\"",

    m4a: "\"It will not stay on your quay. It leaves. That is the entire point of it.\"",
    m4b: "\"I will maintain it. You can put that in the order.\"",
    m4c: "\"We will deal with that when the time comes.\"",

    m5a:  "\"Thirty-two feet, oak hull, gaff rig. Every plank is costed.\"",
    m5a0: "\"Something that can get out of the lake. That is the only thing that matters.\"",
    m5b:  "\"Something that will hold the sea. I cannot put it better than that.\"",
    m5c:  "\"That is my business. Yours is to sign.\"",

    m6a:  "\"No. He does not travel for nothing. He travelled.\"",
    m6a0: "\"He is the man I intend to approach.\"",
    m6b:  "\"He spent a fortnight on the shore measuring your lake.\"",
    m6c:  "\"You know him? That is lucky: he spoke very warmly of you.\"",

    m7a: "\"You do. And that is exactly why I came before felling the first tree.\"",
    m7b: "\"It will not sink.\"",
    m7c: "\"Nobody needs to sign. We will say the yard was there before you.\"",

    m8a: "\"Then make it a commune works site. Barriers, a notice, an order, opening hours. I will comply.\"",
    m8b: "\"I will insure the site at my own expense.\"",
    m8c: "\"Frankly, nobody goes on that quay. There is nothing to see.\"",

    m9a: "\"Eduardo Da Fonseca. Ask him yourself, he will tell you the same.\"",
    m9b: "\"Somebody who has sailed before. Not me.\"",
    m9c: "\"Is that any of your business?\"",

    m10a: "\"A works site. Tristan busy all winter, people on the quay on Sundays, and something to look at.\"",
    m10b: "\"Trade. What leaves this place always comes back to it.\"",
    m10c: "\"A very good line in your record of office.\"",

    m11a: "\"Your name at the bottom of an order nobody before you dared to sign.\"",
    m11b: "\"A signature. Nothing else.\"",
    m11c: "\"Name your price.\"",

    m12a: "\"I can see it. That is why I asked for this meeting and not another one.\"",
    m12b: "\"You would see a mast from the square. Even from that far.\"",
    m12c: "\"You must be able to see the south bridge from up here too.\"",
  },

  tell: {
    m1a: "You are the first person this morning not to ask him for a favour. He turned down four before you.",
    m1b: "It does not put him off. But he gave you a quarter of an hour, and you have just spent part of it announcing that you were about to speak.",
    m1c: "You have handed him an invoice before saying good morning. He receives sixty people a week, and every one of them travelled.",

    m2a: "He does not answer straight away. No, he has not seen any. You did not tell him he was helpless: you told him the town was.",
    m2b: "True, and useful. It is still an inventory. He was waiting for a reason.",
    m2c: "One word away from the right answer. \"Nobody has offered\" is about the town. \"You have nobody\" is about him, and that is how he hears it.",

    m3a:  "Twenty-four thousand. Four times his bridge. He was not asking for a promise, he was asking for proof, and yours is bigger than his problem.",
    m3a0: "\"Not the exact figure yet\" is the phrase he hears every time a project is about to cost double. He believes you. Not enough.",
    m3b:  "It is accurate, and he knows it better than you do. You do not tell a mayor his priorities can wait. Least of all when it is true.",
    m3c:  "You have just described a private yard on a public quay. That is the objection he has been hunting for ten minutes, and you brought it to him yourself.",

    m4a: "It had not occurred to him that anyone might offer him something that leaves. Everything people ask him for stays, and has to be maintained.",
    m4b: "He makes a note. A promise you are willing to see written down beats a promise. He does not sign orders to reassure himself.",
    m4c: "That is word for word what people answer him all day long. He has an entire drawer of things to be dealt with when the time comes.",

    m5a:  "Three figures and one word of trade. He has no idea what a gaff rig is, and that is precisely why it works: somebody, somewhere, did the work.",
    m5a0: "That is an intention, not a boat. Enough not to be shown the door. Not enough for him to pick up a pen.",
    m5b:  "He appreciates that you are not making things up. He would still have preferred a length.",
    m5c:  "You have just explained his own job to him. His signature binds the commune to an object whose size he does not know, which is exactly what a mayor is not allowed to do.",

    m6a:  "Seven words. He looks at the roll, then at you. He knows what Kerguélen charges: you have just told him what your seriousness is worth without naming a figure.",
    m6a0: "\"Intend to approach\" is not \"have approached\". He has had his share of projects in the conditional.",
    m6b:  "He did not know anyone was measuring his lake. It flatters him slightly and worries him slightly, which on balance comes to very little.",
    m6c:  "Kerguélen spoke of nobody. A mayor recognises an invented compliment the same way everyone else does: it is too well turned.",

    m7a: "He leans back. You are here to ask before, not after. That is a first this week, and he has nothing to say to it.",
    m7b: "He would like to believe you. It is not an answer to the question he asked.",
    m7c: "You are offering to cover for him. Which is to say you have just assumed he has something to hide, and said so out loud in his office.",

    m8a: "You have just handed him back the quay. A site he supervises is a site he controls, and a mayor would always rather control than endure.",
    m8b: "Correct. Insurance settles an accident. It does not settle the town council.",
    m8c: "It is true. It is his quay, in his town, and you have just explained to him that nobody goes there. An accurate fact can be an insult.",

    m9a: "A name, and somebody he can check with. He writes the name down. It is the first thing in the whole meeting he can verify without you.",
    m9b: "He appreciates that you do not imagine yourself a captain. It is still somebody without a name.",
    m9c: "Yes. He grants clearance for a ship leaving his commune. Knowing who takes it out is precisely his job.",

    m10a: "Work, a walk and a spectacle in a single sentence. He runs the sum again in his head and cannot find anything to take out of it.",
    m10b: "True in the long run. A term of office lasts thirty days.",
    m10c: "He had thought it himself. He does not care for having it thought on his behalf, and still less for hearing it said before he says it.",

    m11a: "He asked. This is the one moment in the meeting when talking about him answers his question, and you are not promising him a statue: you are promising him a risk.",
    m11b: "Plain, and a little short. He was holding out a hand.",
    m11c: "He says nothing for three seconds. Then he stands, opens the door, and waits. You will never know what he was about to say.",

    m12a: "He does not turn round straight away. You have just told him you came to see him, for this, and he has no reason to doubt it.",
    m12b: "He likes the picture. He would also like to know what it costs.",
    m12c: "He was daydreaming. You have just reminded him, word for word, of the one thing he failed to do in two years.",
  },

  end: {
    plain: "He pulls the stamp towards him, blows on it out of habit, and brings it down on the corner of the sheet. \"It is a commune works site. Do not make me regret it.\"",
    good: "He stamps, signs, then rereads what he has just signed, which he never does. \"Keep me informed. I mean that.\"",
    full: "He stamps without looking at the sheet, because he is looking at you. \"Next time you need something from me, book with me directly. No need to go through the front desk.\"",
    out: "He checks the mantel clock, stands, and holds out his hand. \"I have a council meeting in ten minutes. Come back and see me. I am not saying no, I am saying not today.\"",
    walked: "He has not said anything for a while. He pushes the roll back across to you with his fingertips and reopens his file. The meeting is over; nobody announced it.",
    slam: "You stand up in the middle of his sentence. The door slams hard enough to rattle the glass in the pier mirror. They heard it in the corridor.",
    thrown: "He stands, opens his office door, and waits with his hand on the handle, without a word.",
  },
  after: {
    signed: "The shipyard is authorised. Tristan can start cutting.",
    trust1: "The mayor will remember you.",
    trust2: "The mayor has taken to you. Next time will be shorter.",
    trust3: "You have a free hand with him. Next time he will listen before he counts.",
    again: "You can ask the front desk for another audience. He remembers what you have already told him.",
    slam: "He will not see you for a quarter of an hour. Ninon will book you again whenever you like — but he will remember the door.",
  },
  chat: {
    signed: (n) => `${n} secured the mayor's signature: the shipyard is authorised.`,
    failed: (n) => `${n} leaves the town hall without a signature.`,
    thrown: (n) => `${n} was shown the door of the mayor's office.`,
    slam: (n) => `${n} slammed the door of the Mayor's office.`,
    booked: (n) => `${n} got an appointment with the Mayor.`,
  },
};

export const FERME_STR = {
  fr: {
    /* ⚠️⚠️ ZIP 450 — LA QUÊTE EST TRADUITE. Cette ligne disait `star: STAR_EN`, et
       c'était la seule des 1 081 clés du fichier à ne pas être bilingue : le public
       visé ne pouvait lire aucune ligne de la seule histoire du jeu. */
    star: STAR_FR,
    /* ⚠️ ZIP 480 — l audience chez le maire. Une seule table, deux langues : voir
       la note au-dessus de MAIRE_FR. */
    maire: MAIRE_FR,
    /* ⚠️⚠️ HORS-ZIP 2026-09-02 — `maireFor(fem)` REND LA TABLE DU MAIRE **OU** DE
       LA MAIRE, et c'est par ELLE que la vue passe désormais. `maire` reste
       exposée (le masculin est le cas par défaut, et une clé qui disparaît est
       une clé que `verify-strings` réclame), mais tout ce qui s'affiche pendant
       une audience passe par `maireFor`.
       ⚠️ ELLE PREND UN BOOLÉEN, PAS UNE CLÉ DE MAIRE, et c'est délibéré : ce
       fichier n'importe RIEN (il est lu par le jeu, par les bancs et par les
       outils), et lui faire connaître `TOWN_CANDIDATES` créerait une seconde
       liste de qui est une femme — exactement le doublon que ce chantier vient
       de supprimer. L'unique source est `C.mayorIsFem` ; ici on ne fait que
       recevoir sa réponse. */
    maireFor: (fem) => maireFor(fem),
    /* ⚠️ LA SURCHARGE BRUTE, POUR LE BANC ET POUR LUI SEUL. `maireFor` rend la
       table FUSIONNÉE : on ne peut donc plus y distinguer ce qui a été décliné
       de ce qui a été hérité, et un contrôle qui compare la fusion à la base
       trouve forcément que « tout existe » — c'est-à-dire un contrôle qui ne
       peut pas échouer (441). Ce qu'il faut vérifier, c'est la LISTE de ce
       qu'on a écrit : chaque clé désigne-t-elle une clé réelle, et chacune
       change-t-elle vraiment quelque chose ? */
    maireFem: () => MAIRE_FR_F,
    // --- Mise à jour gare 2026-07 (créatures marines, canards, gare, visiteurs, saisons) ---
    seaCaught: (n) => `Prise rare : ${n} !`,
    seaBite: (n) => `Quelque chose d'inhabituel mord... ${n} ?!`,
    stationName: "Gare du village",
    promptStation: "E : panneau d'annonces de la gare",
    adsTitle: "🚉 Panneau d'annonces",
    adsIntro: "Affiche ce que la ferme vend pour attirer des visiteurs par le train. Chaque nouvelle annonce coûte des frais d'affichage (caisse commune). Les prix ne sont pas affichés : les visiteurs font leurs offres.",
    adsFee: (c) => `Frais : ${c} or par nouvelle annonce`,
    adsSave: "Afficher les annonces",
    adsSaved: (c) => c > 0 ? `Annonces affichées (${c} or de frais).` : "Annonces mises à jour.",
    adCatCrops: "🌾 Cultures et légumes",
    adCatAnimal: "🥚 Produits de la ferme",
    adCatFish: "🐟 Poissons et pêche",
    adCatResources: "🪵 Bois et pierre",
    adsBlacklistTitle: "🚫 Liste noire",
    adsBlacklistEmpty: "Personne n'est banni pour l'instant.",
    adsBlacklistHint: "Un visiteur banni ne reviendra plus jamais par le train.",
    visitorArrived: (n) => `🚂 ${n} arrive par le train !`,
    visitorsArrived: (ns) => `🚂 Des visiteurs arrivent par le train : ${ns} !`,
    visitorLeftChat: (n) => `${n} repart vers la gare.`,
    promptVisitor: (n) => `Q : parler à ${n}`,
    visitorPanelTitle: (n) => `🧳 ${n}`,
    visitorWantsBuy: (n, q, c, p) => `${n} veut acheter ${q} × ${c} et propose ${p} or pièce.`,
    visitorRichBonus: (b) => `Et ${b} or de prime si l'affaire est conclue !`,
    visitorWantsChat: (n) => `${n} est simplement venu(e) voir la ferme et discuter.`,
    visitorDemand: (n, g0) => `${n} exige ${g0} or de la caisse, sinon nos récoltes et notre or vont y passer !`,
    visitorUrgent: "URGENT",
    visitorAccept: "Conclure la vente",
    visitorChatBtn: "Discuter",
    visitorPayBtn: (g0) => `Payer ${g0} or`,
    visitorRefuseBtn: "Refuser",
    visitorBlacklistBtn: "Bannir ce visiteur",
    visitorNotEnough: "Tu n'as pas assez de cette culture sur toi.",
    visitorDealDone: (n, g0) => `Vente conclue avec ${n} : +${g0} or dans la caisse !`,
    visitorChatDone: (n) => `${n} a apprécié la discussion. (amitié +1)`,
    visitorPaid: (n, g0) => `${n} empoche ${g0} or et repart. Quel personnage...`,
    visitorRelation: (r) => `Amitié : ${r}`,
    visitorStock: (h, n) => `Tu portes ${h} / ${n} demandés.`,
    visitorEasyNote: "Commande facile : c'est déjà en stock, petit prix.",
    visitorPrepNote: "Commande à préparer : plus longue, mieux payée.",
    visitorRewardGift: (g) => `En plus de l'or, ${g} si l'affaire est conclue !`,
    visitorGiftGranted: (n, g) => `🎁 ${n} laisse un cadeau : ${g} !`,
    visitorGiftQueued: (n, g) => `🎁 ${n} promet un cadeau : ${g}. Il sera livré dès que possible !`,
    visitorGiftPromised: (n, g) => `🎁 ${n} promet de t'envoyer un cadeau : ${g}. Il arrivera dans quelques minutes !`, // zip 250
    visitorGiftDelivered: (n, g) => `🎁 Le cadeau promis par ${n} vient d'arriver dans ton sac : ${g} !`, // zip 250
    giftSeed: (s) => `des graines uniques (${s})`,
    giftDecor: (d) => `une décoration unique (${d})`,
    giftPet: (pt) => `un animal de compagnie (${pt})`,
    meetBtn: "Rejoindre à la mairie",
    // ⚠️ ZIP 392 : PLUS LUE NULLE PART. L'ancien empilement coupait la liste à
    // 3 cartes et résumait le reste par cette ligne. Le panneau repliable les
    // montre TOUTES (liste défilante) et porte le total sur sa pastille : il
    // n'y a plus de « reste » à annoncer. Conservée et commentée plutôt que
    // supprimée, même convention qu'PASSAGE_PET_CATCH_CHANCE au zip 388 —
    // elle documente l'ancien comportement, et la retirer ferait mentir le
    // comptage de parité sans rien gagner.
    notifMore: (n) => `+${n} autre(s) visiteur(s) en attente`,
    visitorChatSaid: (n, l0) => `${n} : ${l0}`,
    visitorChatLines: [
      [
        "Belle journée pour une balade, non ?",
        "Le train était plein aujourd'hui, votre ferme fait parler d'elle !",
        "Ça sent bon la terre fraîche par ici.",
        "Je ne fais que passer, mais l'endroit est charmant.",
      ],
      [
        "Content(e) de vous revoir ! Je pense souvent à cette ferme.",
        "J'ai raconté vos récoltes à tout le wagon, ils étaient jaloux.",
        "Vous m'offrez toujours un bon moment ici.",
        "La place de la mairie est mon coin préféré de la vallée.",
      ],
      [
        "Entre amis, pas besoin de marchander longtemps !",
        "Je garde toujours une place pour vous dans mes bagages... et un cadeau parfois.",
        "Cette ferme, c'est un peu ma deuxième maison maintenant.",
        "Si vous passez un jour à Valley Town, ma porte vous est ouverte.",
      ],
    ],
    // --- Zip 376 : Carla Garfield ---
    // Ses répliques de conversation remplacent visitorChatLines pour elle
    // seule (voir chatLinesFor dans FermeGame.js). MÊME FORME que le pool
    // générique — 3 paliers d'amitié x VISITOR_CHAT_LINES lignes — parce que
    // resolveVisitorChat tire l'indice sans savoir de qui il s'agit : changer
    // la forme casserait le tirage. Progression voulue : elle juge, puis elle
    // s'attendrit, puis elle laisse entendre qu'elle a une idée derrière la
    // tête (la proposition viendra à son propre chantier).
    carlaChatLines: [
      [
        "Ne le prenez pas mal, mais tout le monde ici s'habille comme un sac à patates.",
        "J'ai vu votre ferme depuis le train. J'ai surtout vu ce que vous portez.",
        "De la bonne terre, de belles bêtes, et pas un vêtement qui tienne debout. Quel gâchis.",
        "Carla Garfield. Retenez ce nom, vous en aurez besoin un jour.",
      ],
      [
        "Vous, au moins, vous m'écoutez. Ça vous changera de la coupe que vous avez là.",
        "Je commence à comprendre cet endroit. Il lui manque peu de chose, en vérité.",
        "Leo, note : la ferme a du potentiel. Non, pas sur ce carnet-là, l'autre !",
        "Un jour, je vous montrerai ce qu'on peut faire d'une silhouette pareille.",
      ],
      [
        "Je ne dis pas ça à tout le monde : vous, vous pourriez porter quelque chose de bien.",
        "J'ai des collections que personne dans cette vallée n'a jamais vues.",
        "Gardez vos pierres précieuses. Vous saurez bientôt quoi en faire.",
        "Nous reparlerons de tout ça, vous et moi. Leo, on y va — les malles ne se portent pas seules.",
      ],
    ],
    // Rembarrages lancés à Leo en pleine balade (bulle cosmétique, jouée
    // localement, aucun message réseau — voir C.CARLA_SCOLD_MS).
    carlaScoldLines: [
      "Leo. Les cartons. DROITS.",
      "Non, Leo, pas dans la boue.",
      "Tu respires trop fort, Leo.",
      "Plus vite, Leo, on n'a pas la journée.",
    ],
    carlaAssistant: "Accompagnée de Leo, son assistant.",
    leoName: "Leo",
    visitorThanks: (n) => `${n} vous remercie et flâne encore un peu sur la place.`,
    visitorHomeChat: (n) => `${n} rentre à la gare, ravi(e) de sa visite.`,
    visitorArrivalGift: (n, g) => `🎁 ${n} est venu(e) avec un cadeau : ${g} !`,
    visitorTotal: (t) => `${t} or au total`,
    visitorPerUnit: (p) => `${p} or / unité`,
    visitorPocket: "En poche",
    visitorCloseBtn: "Plus tard",
    visitorChatTitle: "Discussion",
    promptTrainRide: "E : prendre le train pour Valley Town",
    promptTrainBack: "E : reprendre le train vers la ferme",
    trainToTownToast: "🚆 Bienvenue à Valley Town !",
    trainToFarmToast: "🚆 Retour à la ferme.",
    promptTownHouse: (n) => `Maison de ${n}`,
    promptTownHouseSale: "Maison à vendre",
    promptTownSleep: "E : dormir chez soi",
    promptTownSleepFull: "Chez soi (pas fatigué)",
    toastYourHouse: "C'est votre maison à Valley Town. Aménagement intérieur à venir !",
    toastTheirHouse: (n) => `C'est la maison de ${n}.`,
    toastHouseSale: "Cette maison attend un nouveau fermier.",
    townSaleSign: "À vendre",
    /* Zip 425 — Valley Town refaite. ⚠️ LE MOT « MAIRIE » EST DÉSORMAIS PRIS :
       le bâtiment blanc à colonnes du zip 235 devient l'ÉGLISE (demande de
       Guillaume), et la mairie est un bâtiment NEUF, ailleurs. Les deux libellés
       doivent donc être aussi éloignés l'un de l'autre que les deux bâtiments. */
    promptTownChurch: "⛪ Église de Valley Town",
    promptTownHall: "🏛️ Hôtel de ville",
    promptTownCourt: "⚖️ Tribunal de Valley Town",
    /* ⚠️ L'INVITE DE SAUT EST LA SEULE FAÇON D'APPRENDRE LA MÉCANIQUE. Elle
       n'apparaît QUE lorsque le saut est réellement possible (voir tryTownJump) :
       une invite affichée en permanence deviendrait du décor, et une invite qui
       ment une fois n'est plus jamais crue. */
    promptTownJump: "Espace : sauter du rebord",
    /* Zip 432 — le taxi. Les noms d'arrêts sont indexés par la CLÉ que
       townTaxiStops dérive des constantes de lieux : ajouter un monument,
       c'est ajouter une ligne ici, et rien d'autre. */
    promptTaxiBoard: "E : monter dans le taxi",
    taxiBtn: "Taxi", taxiBtnCall: "Appeler un taxi", taxiBtnCancel: "Annuler la course",
    taxiCalled: "🚕 Taxi appelé — il arrive.",
    taxiNoRoad: "Il faut être au bord d'une rue pavée pour héler un taxi.",
    taxiNotHere: "Le taxi ne circule qu'à Valley Town.",
    taxiUnreachable: "Aucune rue accessible d'ici pour le taxi.",
    taxiAsk: "Où allez-vous ?",
    taxiTitle: "Où allez-vous ?",
    taxiHint: "Le taxi vous dépose au trottoir le plus proche.",
    taxiCancel: "Annuler",
    taxiArrived: "🚕 Nous y voilà. Bonne journée !",
    taxiDropped: "🚕 Vous descendez du taxi.",
    taxiStop: (k) => ({
      station: "La gare", plaza: "La grand-place", market: "Le champ de foire",
      hall: "L'hôtel de ville", church: "L'église", court: "Le tribunal",
      boutique: "La Maison Garfield", park: "Le parc et son kiosque",
      lake: "Le lac et son ponton", belvedere: "Le belvédère",
      artisans: "Le quartier des artisans", cemetery: "Le cimetière",
    })[k] || k,
    taxiWalk: (n) => n <= 1 ? "au pied" : ("≈ " + n + " pas à pied"),
    /* ═══════════════════════════════════════════════════════════════════════
       ZIP 426 — L'INTÉRIEUR DU TRIBUNAL.
       ⚠️ CHAQUE PIÈCE DIT CE QU'ELLE FERA, ET DIT QU'ELLE NE LE FAIT PAS
       ENCORE. C'est la demande explicite de Guillaume (« expliquer que le
       tribunal sera opérationnel bientôt ») et c'est aussi la seule façon de
       livrer un bâtiment vide sans qu'il passe pour cassé : un joueur à qui
       l'on annonce la suite attend, un joueur devant une porte muette croit à
       un bug (même raisonnement que `bridgeNoDest`, zip 386). */
    promptCourtEnter: "E : entrer au tribunal",
    promptCourtExit: "E : ressortir en ville",
    promptCourtBoard: "E : lire le panneau d'affichage",
    promptCourtDoor: (n) => `${n} — E : lire la plaque`,
    promptCourtStairsUp: "Monter à l'étage",
    promptCourtStairsDown: "Descendre au sous-sol",
    courtFloorName: (k) => ({ ground: "Rez-de-chaussée", upper: "Étage", basement: "Sous-sol", hall: "Hôtel de ville", hallUp: "Hôtel de ville — étage", church: "Église", churchLoft: "Tribune d'orgue", churchTower: "Beffroi" }[k] || k),   // 444 — sans lui le bandeau affiche la clé brute
    /* ═══ ZIP 441 — L'ÉGLISE. ════════════════════════════════════════════════
       ⚠️ AUCUNE DE CES PHRASES NE PROMET UN SERVICE, et c'est la décision de
       Guillaume : « décor de haute tenue plus ambiance jouable, SANS service ».
       Une église qui dirait « bientôt » relancerait l'attente que le 439 vient
       justement d'éteindre pour la mairie et le tribunal. Elle ne promet rien,
       elle donne trois gestes, et les trois marchent. */
    churchEnterToast: "⛪ Église de Valley Town. Le silence, la pierre fraîche, et l'orgue là-haut.",
    churchExitToast: "⛪ Vous ressortez sur le parvis.",
    churchSitToast: "🪑 Vous vous asseyez. Une touche de direction pour repartir.",
    churchCandleToast: "🕯️ Vous allumez un cierge.",
    churchCandleFull: "🕯️ Le râtelier est plein — les cierges se consumeront d'ici demain.",
    churchOrganToast: "🎹 Vous posez les mains sur les claviers.",
    /* ⚠️ ET CELLE-CI DIT LA VÉRITÉ SUR UNE ABSENCE. Le morceau est un fichier à
       déposer dans `public/sounds/` (voir CHURCH_ORGAN_SRC) ; tant qu'il n'y est
       pas, `playFile` avale le 404 sans un mot. Un silence non expliqué se lit
       comme une touche cassée — c'est la leçon des portes du 426, appliquée à
       du son. */
    churchOrganMute: "🎹 Vous jouez, mais la soufflerie est muette (le morceau n'est pas encore installé).",
    promptChurchStand: "Se lever",
    promptChurchOrgan: "S'asseoir à l'orgue",
    promptChurchCandle: "Allumer un cierge",
    promptChurchPew: "S'asseoir",
    // ZIP 438 — l'hôtel de ville.
    promptTownHallEnter: "Entrer à l'hôtel de ville",
    promptPriceBoard: "Lire le tableau des cours",
    hallEnterToast: "🏛️ Hôtel de ville de Valley Town.",
    hallExitToast: "🏛️ Vous ressortez de l'hôtel de ville.",
    priceBoardTitle: "📈 Tableau des cours",
    priceBoardIntro: "La criée affiche les cours annoncés pour les prochains jours. Ils valent pour tout le monde et ne changent pas d'ici là — de quoi décider ce qu'on charge dans le train.",
    priceBoardFamily: "Denrée",
    priceBoardToday: "Aujourd'hui",
    priceBoardInDays: (k) => k === 1 ? "Demain" : `Dans ${k} jours`,
    priceBoardFooter: "🎪 marque les jours de marché, où les cours sont relevés.",
    courtRoomName: (k) => ({
      cadastre: "🗺️ Cadastre",
      civil: "💍 Salle des mariages",
      prices: "📈 Salle des cours",
      welcome: "💁 Accueil",
      council: "🏛️ Salle du conseil",
      mayor: "🎩 Bureau du maire",
      cityarch: "🗄️ Archives municipales",
      surveyor: "📐 Bureau du géomètre",
      courtroom: "⚖️ Salle d'audience",
      witness: "🪑 Salle des témoins",
      clerk: "📜 Greffe",
      robing: "🧥 Vestiaire des robes",
      reception: "💁 Accueil",
      judge: "👩‍⚖️ Cabinet du juge",
      jury: "🤝 Salle du jury",
      library: "📚 Bibliothèque juridique",
      landreg: "🗺️ Cadastre",
      permits: "📐 Bureau des permis",
      notary: "✒️ Étude du notaire",
      registry: "💍 État civil",
      archives: "🗄️ Archives",
      evidence: "🔖 Salle des scellés",
      cells: "🔒 Cellules de garde à vue",
      lostfound: "🧺 Objets trouvés",
      boiler: "🔥 Chaufferie",
    }[k] || k),
    // ⚠️ CES DESCRIPTIONS SONT DES PROMESSES, DONC ELLES ENGAGENT. Chacune
    // décrit un usage déduit d'une mécanique qui EXISTE déjà (parcelles à
    // vendre, constructions, échanges, pertes d'objets) — aucune n'invente un
    // système entier, ce qui serait la meilleure façon de ne jamais tenir.
    courtRoomDesc: (k) => ({
      cadastre: "Le plan de Valley Town, parcelle par parcelle. C'est ici que se vendront les terrains dont les panneaux « à vendre » jalonnent la ville.",
      civil: "Unions, noms de ferme, déclarations de familiers. La salle est prête et les chaises alignées ; il manque la cérémonie.",
      prices: "La criée. Les cours des prochains jours y sont affichés au tableau — c'est le seul guichet de la ville qui fonctionne déjà.",
      welcome: "Le guichet d'accueil : on y demande son chemin, et on repart avec un formulaire.",
      council: "Le conseil municipal délibère autour de la table ovale. Personne n'y siège encore.",
      mayor: "Le bureau du maire. Le fauteuil est tourné vers la fenêtre, comme s'il venait de sortir.",
      cityarch: "Les archives de la ville : registres, cadastres anciens, comptes de la commune.",
      surveyor: "Le géomètre trace les limites et instruit les permis de construire.",
      courtroom: "Les litiges entre fermiers s'y trancheront : promesses non tenues, dégâts, amendes. Le public s'assied derrière la barre.",
      witness: "On y patiente avant d'être appelé à la barre.",
      clerk: "Le greffe enregistrera les plaintes et délivrera les copies d'actes.",
      robing: "Les robes des avocats et du juge. Fermé au public — mais la porte n'est pas verrouillée.",
      reception: "Le guichet d'accueil orientera les visiteurs vers le bon bureau.",
      judge: "Le cabinet du juge de Valley Town. Il n'a pas encore pris ses fonctions.",
      jury: "Les jurés s'y retireront pour délibérer, à huis clos.",
      library: "Le droit de la vallée, en trente volumes que personne n'a lus.",
      landreg: "Le cadastre vendra et enregistrera les parcelles de Valley Town — les panneaux « à vendre » attendent ce bureau.",
      permits: "Les permis de construire : granges, ponts, puits, agrandissements de maison.",
      notary: "Les contrats entre joueurs : échanges garantis, dépôts, ventes de parcelles.",
      registry: "L'état civil : nom de ferme, unions, déclaration des familiers.",
      archives: "Toute l'histoire de votre ferme, jour par jour, y sera consultable.",
      evidence: "Les pièces saisies dorment ici sous scellés.",
      cells: "Trois cellules pour ceux que l'audience condamnera.",
      lostfound: "Ce que l'on perd en chemin y sera rapporté — et récupérable contre une petite taxe.",
      boiler: "La chaudière du bâtiment. Rien à y faire, tout à y entendre.",
    }[k] || ""),
    courtSoon: "⏳ Service bientôt opérationnel",
    courtBoardTitle: "⚖️ Tribunal de Valley Town",
    courtBoardIntro: "Le bâtiment est ouvert à la visite : les trois niveaux se parcourent librement. Les services, eux, ouvriront prochainement — voici ce qui s'installera derrière chaque porte.",
    courtBoardFooter: "Aucun guichet n'est encore ouvert. Les travaux d'aménagement se poursuivent d'une mise à jour à l'autre.",
    courtEnterToast: "⚖️ Tribunal de Valley Town — visite libre, services à venir.",
    courtExitToast: "⚖️ Vous ressortez du tribunal.",
    courtRoomToast: (n) => `${n} — bientôt opérationnel.`,
    // ⚠️ ZIP 439 — la plaque d'un guichet OUVERT ne dit plus « bientôt ». La
    // salle des cours annonçait « bientôt opérationnel » suivi, dans la même
    // bulle, de « c'est le seul guichet de la ville qui fonctionne déjà ».
    courtRoomToastLive: (n) => `${n} — ouvert.`,
    /* ═══ ZIP 439 — L'ACCUEIL, LES ÉLECTIONS, LES REGISTRES ═══════════════ */
    hallClerkName: "Léonie Sarrazin",
    hallClerkRole: "hôtesse d'accueil",
    promptHallClerk: "Parler à l'accueil",
    promptMayorDoor: "E : entrer dans le bureau du maire",
    hallClerkHello: "Bonjour ! Que puis-je faire pour vous ?",
    hallClerkAgain: "Autre chose ?",
    hallClerkClose: "Merci, au revoir",
    // Ce que le JOUEUR dit. ⚠️ Écrit à la première personne : c'est une réponse
    // qu'on lui envoie, pas un bouton de menu.
    hallTopicAsk: (k) => ({
      mayor: "J'aimerais rencontrer le maire.",
      election: "Où en sont les élections ?",
      registry: "Puis-je consulter les registres ?",
      prices: "Je viens pour les cours du marché.",
      where: "Où se trouve tel ou tel service ?",
      wedding: "Je voudrais me marier.",
      land: "Je voudrais acheter une parcelle.",
      ballot: "Je viens voter.",
      fonds: "C'est quoi, le fonds de la halle ?",
      engineer: "Connaissez-vous quelqu'un qui dessine des bateaux ?",
    }[k] || k),
    hallTopicTitle: (k) => ({
      mayor: "🎩 Rencontrer le maire",
      election: "🗳️ Les élections municipales",
      registry: "📇 Les registres de la ville",
      wedding: "💍 Les mariages",
      land: "🗺️ Le cadastre",
      ballot: "🗳️ Le scrutin",
      fonds: "📜 Le fonds de la halle",
      engineer: "📐 L'architecte naval",   // 469 — la ligne était écrite DEUX fois (préexistant)
    }[k] || k),
    hallMayorNow: (e, n) => `Le maire en exercice est ${e} ${n}.`,
    hallMayorAudience: (d, k) => k === 0
      ? "Il reçoit AUJOURD'HUI, à son bureau, à l'étage."
      : k === 1 ? `Il reçoit demain (jour ${d}), à son bureau, à l'étage.`
      : `Il reçoit dans ${k} jours (jour ${d}), à son bureau, à l'étage.`,
    hallMayorHint: "Montez l'escalier d'honneur : son bureau est au fond, à gauche. Frappez avant d'entrer.",
    hallElecNext: (d, k) => k === 0
      ? "Le scrutin a lieu AUJOURD'HUI. Le dépouillement est affiché ci-dessous."
      : `Prochain scrutin dans ${k} jour(s), au jour ${d}.`,
    hallElecTerm: (t) => `Mandat n° ${t}`,
    hallElecVotes: "voix",
    hallElecMine: (n) => `dont ${n} de vos résidents`,
    hallElecNoResidents: "Aucun de vos résidents n'a encore pris part au scrutin — ils votent dès qu'ils s'installent à la ferme.",
    hallElecFooter: "Les cinq candidats se représentent à chaque mandat. La ville compte plusieurs centaines d'électeurs : vos résidents pèsent, ils ne décident pas.",
    hallRegistryTitle: "📇 Registre des habitants",
    hallRegistryIntro: "L'état civil tient la liste de celles et ceux qui vivent à la ferme. Elle sert aux convocations, aux publications de bans et aux listes électorales.",
    hallRegistryEmpty: "Le registre est vide : personne ne s'est encore installé à votre ferme.",
    hallRegistryCount: (n) => `${n} habitant(s) inscrit(s).`,
    hallRegistryVote: (e, n) => `a voté ${e} ${n}`,
    hallFondsIntro: "C'est lui qui garantit qu'on ne vend jamais en ville à moindre prix qu'à sa propre ferme. Personne ici ne sait ce qui l'alimente — les services n'ont jamais pu établir l'origine du revenu, et la ville s'apprête à le clore faute de titulaire connu.",
    hallFondsWhere: "L'avis est affiché au tableau des nouvelles, sur la place. Allez le lire, vous en saurez autant que moi.",
    hallSoonWedding: "Les publications de bans sont prêtes et la salle est dressée — il manque l'officier d'état civil. Revenez à la prochaine mise à jour : la salle des mariages est la deuxième porte à gauche.",
    hallSoonLand: "Le plan est affiché au cadastre, première porte à gauche. La vente, elle, passera par le notaire du tribunal : on choisit ici, on signe là-bas.",
    candName: (k) => ({
      vasseur: "Odile Vasseur", lantier: "Marceau Lantier", bonnefoy: "Séverine Bonnefoy",
      delaunay: "Ninon Delaunay", toussaint: "Basile Toussaint",
    }[k] || k),
    candPlatform: (k) => ({
      vasseur: "l'eau et les champs",
      lantier: "les ponts et les chemins",
      bonnefoy: "l'ordre et les comptes",
      delaunay: "le lac et le parc",
      toussaint: "l'école et les archives",
    }[k] || ""),
    hallBoardTitle: "🏛️ Hôtel de ville de Valley Town",
    hallBoardIntro: "Les services de la commune, étage par étage. L'accueil répond au rez-de-chaussée, à droite en entrant.",
    hallBoardFooter: "La salle des cours et l'accueil sont ouverts. Les autres guichets s'installent d'une mise à jour à l'autre.",
    courtOpenNow: "✅ Guichet ouvert",
    cropTipReady: "mûr !",
    cropTipWater: "à arroser",
    adsGiftsTitle: "🎁 Cadeaux promis",
    adsGiftsEmpty: "Aucun cadeau en attente.",
    adsGiftRow: (g, n) => `${g} (promis par ${n})`,
    hostileDamageChat: (n, g0, cr) => `⚠️ ${n} a frappé : ${g0} or volés, ${cr} culture(s) saccagée(s) ! Rassemblez-vous pour réparer !`,
    repairTitle: "🛠️ Réparer les dégâts",
    repairIntro: (n) => `${n} a saccagé la ferme ! Clique quand le curseur est dans la zone verte. Chaque joueur qui réussit rapproche la réparation totale.`,
    repairHits: (h, t) => `Réussites : ${h} / ${t}`,
    repairWin: "Bien joué ! Ta part de la réparation est faite.",
    repairFail: "Raté... réessaie si la fenêtre est encore ouverte.",
    repairProgress: (w0, n0) => `Réparation : ${w0} / ${n0} joueur(s). Encore un effort !`,
    repairDoneChat: (g0, cr) => `✅ Dégâts réparés ensemble : ${g0} or récupérés, ${cr} culture(s) replantée(s) !`,
    repairExpired: "La fenêtre de réparation est passée... les dégâts sont définitifs.",
    stayTitle: (n) => `🏠 ${n} veut s'installer !`,
    stayProposal: (n, j) => `${n} propose de rester vivre à la ferme et de contribuer : "${j}". Le vote doit être unanime. En cas d'égalité, un dé décidera.`,
    voteYes: "✅ Pour",
    voteNo: "❌ Contre",
    voteWaiting: "Vote enregistré, en attente des autres joueurs...",
    voteStayChat: (n) => `🎉 Vote unanime : ${n} s'installe à la ferme !`,
    residentStarted: (n, job) => `${n} s'installe dans une maison à vendre et se met au travail : ${job}.`,
    // Zip 252 : artisans / ateliers / produits.
    residentMovedIn: (n, job) => `🏡 ${n} a emménagé sur la ferme et va ${job}.`,
    residentNoRoom: "Plus de maison libre pour accueillir un résident.",
    artisanNoResident: "Il faut d'abord que l'artisan correspondant vive chez toi.",
    // Zip 302 : montgolfière (attraction touristique).
    balloonTitle: "🎈 Montgolfière",
    balloonPilotLabel: "Pilote",
    balloonNoPilot: "Aucun pilote désigné — le business est à l'arrêt.",
    balloonPilotAssigned: (n) => `🎈 ${n} prend les commandes de la montgolfière.`,
    balloonPilotRemoved: "🎈 Plus personne ne pilote la montgolfière pour l'instant.",
    balloonAssignBtn: "Désigner comme pilote",
    balloonUnassignBtn: "Retirer du poste",
    balloonPhaseIdle: (t) => `Prochain vol : ${t}`,
    balloonPhaseBoarding: (n, cap) => `Embarquement en cours — ${n}/${cap} places prises`,
    balloonPhaseFlying: "En plein vol au-dessus de la ferme...",
    balloonBoarding: (pilot) => `🎈 ${pilot} prépare la montgolfière — embarquement ouvert !`,
    balloonDeparted: (n, cap) => n > 0 ? `🎈 Décollage ! ${n}/${cap} passagers à bord.` : "🎈 La montgolfière décolle, sans passager cette fois.",
    balloonLanded: (n) => n > 0 ? `🎈 Atterrissage en douceur, ${n} passager${n > 1 ? "s" : ""} ravi${n > 1 ? "s" : ""} !` : "🎈 La montgolfière s'est posée.",
    balloonTicketSold: (name, n, cap) => `🎫 ${name} monte à bord (${n}/${cap}).`,
    balloonBuyBtn: (price) => `Réserver un tour — ${price}€`,
    balloonBuyForMeBtn: (price) => `Monter à bord (${price}€)`,
    balloonBuyForResidentBtn: (name, price) => `Envoyer ${name} (${price}€)`,
    balloonSoldToday: (n) => `${n} billet${n > 1 ? "s" : ""} vendu${n > 1 ? "s" : ""} aujourd'hui`,
    toastBalloonNotBoarding: "L'embarquement n'est pas ouvert pour l'instant.",
    toastBalloonFull: "La nacelle est complète (4 places) !",
    artisanBuilt: (b) => `🔨 ${b} construit(e) ! L'artisan peut se mettre à produire.`,
    buildingName: (bid) => ({ beehive: "Ruche", fromagerie: "Fromagerie", bakery: "Boulangerie", sawmill: "Scierie", sucrerie: "Sucrerie" }[bid] || bid),
    craftName: (item) => ({ honey: "Pot de miel", cheeseWheel: "Roue de fromage", cheesePortion: "Part de fromage", eclairChoco: "Éclair au chocolat", eclairVanilla: "Éclair à la vanille", flanVanilla: "Flan pâtissier vanille de Madagascar", gateauBasque: "Gâteau basque", butter: "Motte de beurre", bread: "Pain", croissant: "Croissant", chocolatine: "Chocolatine", painSuisse: "Pain suisse", yogurtNature: "Yaourt nature", yogurtVanilla: "Yaourt vanille" }[item] || item),
    craftSold: (name, n, gain) => `Vente : ${n} × ${name} (+${gain} or) ! Caisse commune enrichie.`,
    cheeseCut: (w, p) => `🧀 ${w} roue(s) découpée(s) en ${p} parts.`,
    promptResident: (n) => `Q — parler à ${n}`,
    recruitAsk: "Proposer d'emménager",
    residentGreet: (n, job) => `Bonjour ! Moi c'est ${n}. Mon métier, c'est ${job}.`,
    // Zip 262 (demande Guillaume) : les visiteurs À SKILL s'annoncent
    // clairement (« Je suis bûcheron et je souhaite vous aider à… »).
    skillLabel: (sk) => ({ beekeeper: "apiculteur", cheesemaker: "fromager", baker: "boulanger-pâtissier", lumberjack: "bûcheron", voyager: "marchand voyageur" }[sk] || sk),
    skillPitch: (sk, n) => ({
      beekeeper: `Bonjour ! Moi c'est ${n}, je suis apiculteur et je souhaite vous aider à récolter et mettre en pot le miel de la ferme.`,
      cheesemaker: `Bonjour ! Moi c'est ${n}, je suis fromager et je souhaite vous aider à transformer votre lait en fromage.`,
      baker: `Bonjour ! Moi c'est ${n}, je suis pâtissière et je souhaite vous aider à cuire pâtisseries et gâteaux.`,
      breadmaker: `${n}. Boulangère. Je fais le pain et les viennoiseries. Si vous avez du beurre, tant mieux ; sinon ce sera pain sec.`,
      lumberjack: `Bonjour ! Moi c'est ${n}, je suis bûcheron et je souhaite vous aider à abattre les arbres et casser les rochers.`,
      voyager: `Bonjour ! Moi c'est ${n}, je suis marchand voyageur et je souhaite parcourir le monde pour vous rapporter des denrées rares.`,
      // Zip suivant (demande Guillaume) : bio de Jérôme Martial, sucrier
      // martiniquais. Se présente sous son surnom, explique son parcours
      // (parti travailler ailleurs pour aider sa famille restée au pays) et
      // sa fierté d'apporter son savoir-faire à la ferme.
      sugarworker: `Bel bonjou ! Tu peux m'appeler Ti Jérôme. Je viens de Martinique — j'ai dû partir chercher du travail ailleurs pour aider ma famille restée au pays. Aujourd'hui je suis fier de faire partie de la ferme et d'y apporter mon savoir-faire de sucrier.`,
    }[sk] || `Bonjour ! Moi c'est ${n}.`),
    // Zip 299 (demande Guillaume) : petite réplique liée à son activité, affichée
    // en bulle au-dessus d'un artisan quand le joueur s'en approche.
    skillTalk: {
      beekeeper: ["Les abeilles sont de bonne humeur aujourd'hui !", "Encore quelques pots et le miel est prêt.", "Chut… n'effraie pas mes abeilles.", "Le miel coule bien cette saison."],
      cheesemaker: ["Ce fromage a besoin d'affiner encore un peu.", "Apporte-moi du lait, j'en fais des merveilles !", "Sens-moi cette meule, une pure merveille.", "La cave est à la bonne température."],
      baker: ["Bienvenue, quelle joie de te voir ! 🌞", "Le four est chaud, les gâteaux arrivent !", "Prends une brioche tant qu'elle est tiède, c'est offert !", "Ça sent bon la pâtisserie, non ? Sers-toi !"],
      // Zip 301 (demande Guillaume) : Rosalie, aigrie, parle rarement et de
      // façon désagréable (bulle affichée moins souvent, voir FermeGame.js).
      breadmaker: ["Quoi encore.", "Le pain sera prêt quand il sera prêt. Pas avant.", "Tu comptes rester planté là longtemps ?", "Pas de beurre, pas de viennoiseries. C'est comme ça.", "Hmph.", "Tu veux te battre, c'est ça ? Tu veux te battre ?", "...", "Tu veux que je te mette au four ?", "Recule"],
      lumberjack: ["J'abats, je scie, je casse du caillou !", "Encore un arbre et je fais une pause.", "Le bois part direct à la réserve commune.", "Ma hache n'a jamais été aussi affûtée."],
      voyager: ["Je repars bientôt pour des terres lointaines.", "J'ai rapporté des denrées rares du bout du monde.", "Passe commande, je te trouve ça !", "Le grand large me manque déjà."],
      // Zip suivant (demande Guillaume) : répliques créoles de Jérôme Martial
      // (sucrier), identiques FR/EN comme demandé — "Sawfe" (santé/salut) et
      // "pani tchak" restent en créole dans les deux langues.
      sugarworker: ["Bel bonjou !", "Sawfe", "pani tchak"],
    },
    // Zip 327 (demande Guillaume) : phases "renfermé"/bougon de René,
    // indépendantes du cycle travail/pause — voir RENE_GRUMPY_CYCLE_MS.
    skillTalkGrumpy: {
      beekeeper: ["...", "... Pas d'humeur, là, tout de suite. Me parle pas.", "Tu veux que je te pique ?"],
    },
    // Zip suivant (demande Guillaume) : scènes Chloé/Rosalie. Déclenchées quand
    // la bulle "rare" de Rosalie a fait 2 cycles à portée du joueur, Chloé
    // dehors (pas "à l'intérieur"). Chaque scène = suite de répliques
    // (who: "chloe"|"rosalie", text, ms) jouées en bulles successives.
    // La dernière (V11) est rare et évoque René, l'ex de Rosalie.
    chloeRosalieScenes: [
      [ // V1
        { who: "chloe", text: "ROSALIE ! Non mais on ne parle PAS comme ça aux gens, enfin !" },
        { who: "rosalie", text: "Je disais juste la vérité." },
        { who: "chloe", text: "On s'en fiche de la vérité, on est POLIS !" },
        { who: "rosalie", text: "...Bon, bon, ça va, j'ai compris." },
        { who: "chloe", text: "Pardon, elle a eu une nuit difficile..." },
      ],
      [ // V2
        { who: "chloe", text: "Alors là non, j'ai TOUT entendu depuis la boulangerie, figure-toi !" },
        { who: "rosalie", text: "J'ai le droit d'avoir un avis, non ?" },
        { who: "chloe", text: "Pas comme ça, tu ne parles pas aux clients comme ça, Rosalie, JAMAIS !" },
        { who: "rosalie", text: "C'est bon, c'est bon, j'ai compris..." },
        { who: "chloe", text: "Un peu de tenue, un tout petit peu !" },
        { who: "rosalie", text: "Il grogne, le levain, pas moi.", turn: true },
        { who: "chloe", text: "Pardon pour elle. Elle a bon fond, au fond du fond." },
        { who: "rosalie", text: "Hmph." },
      ],
      [ // V3
        { who: "chloe", text: "Encore UNE fois, une seule, et c'est TOI qui iras t'excuser au marché !" },
        { who: "rosalie", text: "Tu ne ferais jamais ça." },
        { who: "chloe", text: "Essaie voir." },
        { who: "rosalie", text: "...D'accord, d'accord, j'ai rien dit." },
        { who: "chloe", text: "Pardon pour elle. Le pain la rend... expressive." },
      ],
      [ // V4
        { who: "chloe", text: "Rosalie." },
        { who: "rosalie", text: "Quoi." },
        { who: "chloe", text: "Tu sais très bien quoi." },
        { who: "rosalie", text: "Je vois pas du tout." },
        { who: "chloe", text: "Rosalie." },
        { who: "rosalie", text: "...Bon, PEUT-ÊTRE que j'ai un peu exagéré." },
        { who: "chloe", text: "Désolée, c'était pas très gentil de sa part..." },
      ],
      [ // V5
        { who: "chloe", text: "On respecte les gens ici, Rosalie, un point c'est t—" },
        { who: "chloe", text: "OH MON PAIN !", ms: 1800 },
        { who: "rosalie", text: "...Sauvée par le gong.", turn: true },
        { who: "chloe", text: "Pardon quand même, hein !" },
      ],
      [ // V6
        { who: "chloe", text: "Alors ÇA, c'était vraiment, vraiment pas gentil !" },
        { who: "chloe", text: "Rosalie ?" },
        { who: "rosalie", text: "J'ai rien dit du tout." },
        { who: "chloe", text: "Justement. Tu vas t'excuser, un jour ?" },
        { who: "rosalie", text: "On verra.", turn: true },
        { who: "chloe", text: "...et moi, pardon pour le ton, mais fallait bien." },
      ],
      [ // V7
        { who: "chloe", text: "HÉ !", ms: 1600 },
        { who: "chloe", text: "C'est TOUT ce que t'as à dire pour ta défense ?!" },
        { who: "rosalie", text: "...Pardon." },
        { who: "chloe", text: "Bon. Voilà. C'était pas si compliqué." },
      ],
      [ // V8
        { who: "chloe", text: "On ne grogne pas sur les clients. ON. NE. GROGNE. PAS.", ms: 4200 },
        { who: "rosalie", text: "...T'as fini ta liste ?" },
        { who: "chloe", text: "Y'a un quatrième point si tu insistes." },
        { who: "rosalie", text: "Non, non, j'ai saisi l'esprit général." },
        { who: "chloe", text: "Pardon pour elle. Dure à l'extérieur, comme le seigle." },
        { who: "rosalie", text: "Merci... je crois." },
      ],
      [ // V9
        { who: "chloe", text: "Rosalie, sérieusement ! On ne parle pas comme ça aux gens !" },
        { who: "rosalie", text: "C'était rien du tout. Une remarque. Un fait." },
        { who: "chloe", text: "C'était pas rien." },
        { who: "chloe", text: "...Désolée quand même, c'était peut-être un peu fort." },
        { who: "rosalie", text: "...Bah. C'est rien." },
      ],
      [ // V10
        { who: "chloe", text: "NON MAIS OH ! On se CALME, Rosalie !" },
        { who: "rosalie", text: "Bon, ÇA VA, j'ai compris, pas la peine d'en faire un plat !" },
        { who: "chloe", text: "Pardon, je me suis emportée... viens là, un câlin ?" },
        { who: "rosalie", text: "NON." },
        { who: "chloe", text: "Bon, très bien, tant pis pour toi." },
      ],
      [ // V11 — RARE (René)
        { who: "chloe", text: "Rosalie, ÇA SUFFIT, tu ne peux pas passer tes nerfs sur tout le monde !" },
        { who: "rosalie", text: "Je passe rien du tout sur personne !" },
        { who: "chloe", text: "C'est pas parce que René t'a quittée que tu dois faire payer le village !" },
        { who: "rosalie", text: "On... on ne parle pas de René ici." },
        { who: "chloe", text: "Je sais. Mais tu ne peux pas rester fâchée avec la terre entière." },
        { who: "rosalie", text: "Je ne suis PAS fâchée. Je suis... occupée." },
        { who: "chloe", text: "Bien sûr." },
        { who: "rosalie", text: "...Retourne à ton four, Chloé.", turn: true },
        { who: "chloe", text: "Elle va mieux, en fait, croyez-le ou non." },
      ],
    ],
    // Chantier "rivalité Tristan/Jérôme" (2026-07, demande Guillaume) : scènes
    // de provocation jouées quand l'un débarque en trombe sur le stand de
    // l'autre (voir res.storming/stormKind==="tj"). Montée de tension en
    // bulles séquencées (who: "tristan"|"jerome") ; le jet de bagarre (30 %)
    // est tiré à CHAQUE étape franchie côté moteur (FermeGame.js), pas ici —
    // ces répliques ne décident donc jamais seules de l'issue. Insultes trop
    // crues rendues par une bulle de censure ("#%!&") plutôt que du texte cru.
    tristanJeromeScenes: [
      [ // T1 — Tristan vient chercher des noises
        { who: "tristan", text: "Encore à traîner autour de MA réserve de bois, Jérôme ?" },
        { who: "jerome", text: "Ta réserve ? Le village entier en profite, bûcheron du dimanche." },
        { who: "tristan", text: "Répète un peu ça." },
        { who: "jerome", text: "#%!&, tu m'as très bien entendu." },
        { who: "tristan", text: "C'est toi qui l'auras cherché." },
      ],
      [ // T2 — Jérôme vient chercher des noises
        { who: "jerome", text: "Tiens, le bûcheron qui pue la sciure. On vient renifler ma sucrerie ?" },
        { who: "tristan", text: "Je passais. Contrairement à toi, moi je TRAVAILLE." },
        { who: "jerome", text: "Travailler ? Tu casses des cailloux, Tristan, c'est pas un métier." },
        { who: "tristan", text: "Répète ça en face, pour voir." },
        { who: "jerome", text: "Avec plaisir, #%!& de bûcheron." },
        { who: "tristan", text: "Bon. Très bien." },
      ],
      [ // T3 — montée plus longue, plusieurs relances avant le clash
        { who: "tristan", text: "Jérôme." },
        { who: "jerome", text: "Quoi." },
        { who: "tristan", text: "Tu racontes quoi sur moi au marché, exactement ?" },
        { who: "jerome", text: "La vérité. Que t'as la carrure d'un bûcheron et la finesse d'une bûche." },
        { who: "tristan", text: "Très drôle. Vraiment très drôle." },
        { who: "jerome", text: "Je trouve aussi, oui." },
        { who: "tristan", text: "#%!&, tu vas voir ce que ça fait, une bûche." },
        { who: "jerome", text: "Essaie, pour voir." },
      ],
      [ // T4 — plus bref, clash quasi immédiat
        { who: "tristan", text: "T'as un problème avec moi, Jérôme ?" },
        { who: "jerome", text: "Toi, en entier, c'est mon problème." },
        { who: "tristan", text: "#%!&." },
        { who: "jerome", text: "Pareillement." },
      ],
      [ // T5 — demande Guillaume : Tristan traite Jérôme de mal élevé
        { who: "tristan", text: "T'as vraiment aucune éducation, Jérôme." },
        { who: "jerome", text: "Mal élevé, moi ? Au moins moi, je sais parler aux gens." },
        { who: "tristan", text: "Tu passes ton temps à insulter tout le village !" },
        { who: "jerome", text: "Et toi, tu passes le tien à rien faire d'utile." },
        { who: "tristan", text: "#%!&, répète ça." },
        { who: "jerome", text: "Volontiers." },
      ],
      [ // T6 — demande Guillaume : Jérôme traite Tristan d'inutile, jaloux qu'Ingrid l'apprécie
        { who: "jerome", text: "Franchement, Tristan, à quoi tu sers ici ?" },
        { who: "tristan", text: "Je bosse plus dur que toi, sucrier de pacotille." },
        { who: "jerome", text: "Tu bosses surtout à me suivre partout. T'es juste jaloux qu'Ingrid m'aime bien." },
        { who: "tristan", text: "N'importe quoi, ça n'a rien à voir !" },
        { who: "jerome", text: "Si, ça a tout à voir. T'es un inutile jaloux, voilà ce que t'es." },
        { who: "tristan", text: "#%!&, tu vas regretter d'avoir dit ça." },
        { who: "jerome", text: "On verra bien." },
      ],
      [ // T7 — scène plus longue : Tristan enchaîne "petit sucre" / "petit bonhomme ridicule"
        { who: "tristan", text: "Tiens, tiens. Le petit sucre d'orge qui sort enfin de sa boutique." },
        { who: "jerome", text: "Le petit sucre d'orge fait deux fois ton chiffre d'affaires, Tristan." },
        { who: "tristan", text: "Mon chiffre d'affaires, mon chiffre d'affaires... t'as que ce mot-là à la bouche." },
        { who: "jerome", text: "Parce que toi t'as que des bûches, justement." },
        { who: "tristan", text: "Répète un peu ça, espèce de petit bonhomme ridicule." },
        { who: "jerome", text: "Petit bonhomme ? T'as vu ta taille, toi, à côté de ton melon ?" },
        { who: "tristan", text: "#%!&, tu commences sérieusement à m'échauffer." },
        { who: "jerome", text: "Tant mieux, ça te changera de la sciure." },
        { who: "tristan", text: "C'est toi qui l'auras voulu." },
      ],
      [ // T8 — Jérôme charrie les muscles de Tristan, montée longue et comique
        { who: "jerome", text: "Alors, la bûche, on a bien dormi cette nuit ?" },
        { who: "tristan", text: "Toujours aussi charmant, Jérôme." },
        { who: "jerome", text: "Toujours aussi charmant. Et toi, toujours aussi... meuble." },
        { who: "tristan", text: "Un meuble ? Un meuble qui pourrait te plier en deux, tu veux dire." },
        { who: "jerome", text: "Essaie donc, gros bras, on verra qui plie qui." },
        { who: "tristan", text: "Pathétique petit bonhomme. Tu parles fort quand y'a du monde autour." },
        { who: "jerome", text: "Et toi tu réfléchis fort quand y'a personne pour t'entendre, apparemment." },
        { who: "tristan", text: "#%!&. Ça suffit, maintenant." },
        { who: "jerome", text: "Enfin une phrase courte, bravo." },
      ],
      [ // T9 — rancune Ingrid étirée sur plusieurs relances
        { who: "tristan", text: "Jérôme, j'ai entendu ce que t'as raconté à Ingrid hier." },
        { who: "jerome", text: "Ah oui ? Et alors, c'est pas comme si c'était faux." },
        { who: "tristan", text: "T'as dit que je savais compter que jusqu'à trois bûches." },
        { who: "jerome", text: "Et t'as prouvé le contraire depuis ?" },
        { who: "tristan", text: "Continue comme ça, petit sucre, continue." },
        { who: "jerome", text: "Petit sucre, petit sucre... t'as que ça en stock. La sucrerie, c'est moi, pas toi." },
        { who: "tristan", text: "Ridicule. Tu es ridicule, voilà ce que tu es." },
        { who: "jerome", text: "Ridicule mais aimé de tous. Toi t'es juste bûcheron. Et seul." },
        { who: "tristan", text: "#%!&, ça y est, t'as réussi ton coup." },
        { who: "jerome", text: "Enfin une victoire, aujourd'hui." },
      ],
      [ // T10 — bref et sec, clash quasi immédiat
        { who: "tristan", text: "Un problème, Jérôme ?" },
        { who: "jerome", text: "Toi. En intégralité. C'est mon problème depuis le début." },
        { who: "tristan", text: "Répète ça, espèce de pathétique petit bonhomme." },
        { who: "jerome", text: "Pathétique ? Regarde-toi, tu trembles déjà de rage." },
        { who: "tristan", text: "#%!&." },
        { who: "jerome", text: "Toujours aussi bavard, à ce que je vois." },
      ],
    ],
    // Toast global (visible par toute la room, PAS filtré par joueur — voir le
    // nouveau flag toast.broadcast) au départ en trombe de l'un vers l'autre :
    // sert de "cloche" pour venir assister au clash.
    toastTJStorm: (nom, cible) => `⚠️ ${nom} fonce droit sur ${cible}, ça va chauffer, venez voir !`,
    // Idem, au moment où la bagarre éclate réellement (pas à chaque scène : uniquement si le jet de 30 % réussit).
    toastTJBrawlStart: (nom1, nom2) => `💥 Bagarre entre ${nom1} et ${nom2} !`,
    // Chantier "bagarre = vrai événement, en public" (2026-07, demande
    // Guillaume) : commentaires inquiets des résidents/visiteurs attroupés
    // autour du clash, tant que la bagarre n'est pas encore résolue (voir
    // triggerTjCrowdReaction, FermeGame.js). Volontairement neutres (pas de
    // nom en dur) pour convenir à n'importe quel badaud.
    tjCrowdLines: [
      "Oh là là, ça chauffe !",
      "Ils vont vraiment en venir aux mains...",
      "Quelqu'un devrait les séparer !",
      "C'est pas beau à voir.",
      "Encore eux deux...",
      "J'espère que ça va s'arrêter là.",
      "Ça va mal finir.",
      "Restez calmes, tous les deux !",
      "Ohhhh !",
      "Ohhhh... ça, c'est envoyé.",
      "Ah j'aurais pas aimé qu'on m'dise çaaaaa, moi !",
      "Aïe aïe aïe, en plein dans le mille.",
      "Oh la la, ça pique !",
      "Direct dans l'ego, celle-là.",
      "Il a pas loupé sa sortie, dites donc.",
      "Ça, ça va laisser des traces.",
    ],
    // Mot de la fin, une fois la bagarre résolue (voir endTjCrowdReaction) —
    // avant que chacun ne reparte tranquillement à ses occupations.
    tjAfterLines: [
      "Bon, c'est fini...",
      "Il fallait s'y attendre.",
      "Pfff. Toujours pareil, ces deux-là.",
      "Bon, on retourne au travail.",
      "J'espère qu'ils vont se calmer, à la longue.",
      "Ah là là, ils savent y faire pour se blesser, ces deux-là.",
      "Franchement, j'aurais pas supporté qu'on m'parle comme ça.",
      "Bon sang, quel langage, ces deux-là.",
    ],
    // Idem, à l'issue : qui a écopé de l'ITT.
    toastTJBrawl: (perdant) => `🤕 ${perdant} en ressort méchamment sonné(e) et va rester cloué(e) sur place un moment.`,
    healResidentChat: (soigneur, blesse) => `🩹 ${soigneur} a bandé les plaies de ${blesse}, son immobilisation est réduite.`,
    healResidentPartialChat: (soigneur, blesse, mn) => `🩹 ${soigneur} a appliqué un pansement à ${blesse} : encore ${mn} min d'immobilisation (un autre pansement peut aider !)`,
    residentNeedBuilding: (b) => `Construis-moi une ${b} (achetable en or à la boutique) et je produirai pour la ferme !`,
    residentBuildingReady: (b) => `Ma ${b} tourne. Garde nos stocks remplis et je fais le reste !`,
    residentLumberjackLine: "Je coupe du bois, casse des cailloux et scie des planches toute la journée — tout va dans notre réserve commune.",
    residentCloseBtn: "À plus tard",
    // Chantier "relations entre résidents" (2026-07, demande Guillaume) :
    // petite section de la fiche listant qui il/elle apprécie ou évite.
    // Pensé pour évoluer au fil de l'histoire (voir RESIDENT_AFFINITIES).
    residentAffinitiesTitle: "Relations",
    residentAffinityAlly: (n) => `Ami(e) avec ${n}`,
    residentAffinityEnemy: (n) => `En froid avec ${n}`,
    // Demande Guillaume : interjection créole de Jérôme, parfois lâchée avant
    // de répondre à une remarque vexante de Tristan (pas systématique).
    jeromeInterjection: "Kisa i ka di mwen ?",
    // Zip 253 : fiche résident enrichie + onglet Employés.
    residentRoleTitle: "Production",
    residentNotWorkingYet: "Pas encore d'atelier — je m'installe.",
    residentProdHoney: (n) => `Ruche en route — ${n} pot(s) de miel en réserve.`,
    residentProdCheese: (w, p, b, yn, yv) => `Fromagerie active — ${w} roue(s), ${p} part(s), ${b | 0} beurre au frais, ${yn | 0} yaourt(s) nature, ${yv | 0} yaourt(s) vanille.`,
    residentProdPastry: (ec, ev, fl, gb) => `Le four tourne — ${ec} éclair(s) choco, ${ev} éclair(s) vanille, ${fl} flan(s) vanille Madagascar, ${gb} gâteau(x) basque prêt(s).`,
    // Zip 301 : filière pain + viennoiseries de Rosalie.
    residentProdBread: (pain, cr, ch, ps) => `Fournil — ${pain} pain(s), ${cr} croissant(s), ${ch} chocolatine(s), ${ps} pain(s) suisse(s).`,
    // Zip 301 : réglage du ratio fromage/beurre (fiche d'Ingrid).
    cheeseRatioTitle: "Répartition fromage / beurre",
    cheeseRatioLine: (cheese, butter) => `Fromage ${cheese}% · Beurre ${butter}%`,
    cheeseRatioButterShort: "Beurre",
    bakeryCustomerBought: (name, n, gain) => `Un client du matin a acheté ${n} × ${name} (+${gain} or) !`,
    bakeryPriceTitle: "Prix de vente",
    bakeryPriceLine: (name, price, def) => `${name} : ${price} or/pièce${price !== def ? ` (défaut ${def})` : ""}`,
    residentProdWood: (w, s, p) => `Réserve commune : ${w} bois, ${s} pierre(s), ${p} planche(s) rentrés.`,
    residentSeeBtn: "Voir",
    // Zip 258 : alerte pâtissière (rupture d'ingrédients en journée).
    bakeryAlertShort: "⚠️ Ingrédients manquants",
    // Petit changement (demande Guillaume) : on nomme les ingrédients qui
    // manquent au lieu d'un message générique. `list` est une chaîne déjà
    // formatée (ex. "farine, lait") produite par missingIngredientList().
    craftMissingIngredientName: (k) => ({
      flour: "farine", milk: "lait", egg: "œufs", cocoa: "cacao",
      vanilla: "vanille", tonka: "fève tonka", butter: "beurre",
    }[k] || "des ingrédients"),
    bakeryAlertLine: (list) => `⚠️ Four à l'arrêt — il me manque : ${list} !`,
    bakeryAlertTitle: "La pâtissière a besoin d'ingrédients",
    bakeryAlertMsg: (list) => `Impossible de continuer : il me manque ${list}. Remplis nos stocks et je m'y remets aussitôt !`,
    bakeryAlertToast: (list) => `🍰 La pâtissière n'a plus ${list} — production stoppée.`,
    bakeryNotifSee: "Voir",
    // Zip 280 : bijouterie (pas de rôle, ouverte à tous les joueurs).
    shopJewelryTitle: (cost) => `Bijouterie (${cost} or)`,
    shopJewelrySub: "Ouverte à tous — designe et vends des bijoux uniques.",
    shopJewelryOwned: "Construite",
    shopJewelryComingSoon: "Bientôt disponible — pas encore ouvert à l'achat.",
    comingSoonLabel: "À venir",
    jewelryDesignRowTitle: "Designer un bijou",
    jewelryDesignRowSub: "Choisis le type, la matière, la découpe et le prix.",
    jewelryDesignBtn: "Ouvrir",
    jewelryBuiltChat: "💍 La bijouterie est ouverte — à vos designs !",
    jewelryMadeChat: (name, typeName) => `💍 ${name} a designé : ${typeName}.`,
    jewelrySoldChat: (gain) => `💰 Bijou vendu : +${gain} or.`,
    jewelryTypeName: (id) => ({ earrings: "Boucles d'oreilles", bracelet: "Bracelet", necklace: "Collier", chain: "Chaîne en or" }[id] || id),
    jewelrySellTitle: "Bijoux en réserve (pool commun)",
    jewelryPieceTitle: (typeName, gemName) => `${typeName} (${gemName})`,
    jewelryMakerHint: (name) => `Designé par ${name}`,
    jewelrySellBtn: "Vendre",
    jewelryDesignTitle: "Designer un bijou",
    jewelryPreviewLine: (typeName, shapeName, gemName) => `${typeName} — découpe ${shapeName}, ${gemName}`,
    jewelryTypeLabel: "Type de bijou",
    jewelryMaterialLabel: "Matière (gemme)",
    jewelryShapeLabel: "Découpe",
    jewelryPriceLabel: "Prix de vente",
    jewelryStockLine: (goldHave, goldNeed, gemHave, gemNeed) => `Or disponible : ${goldHave}/${goldNeed} — Gemme choisie disponible : ${gemHave}/${gemNeed}`,
    jewelryNoGoldHint: "Pas assez d'or dans le stock commun.",
    jewelryNoGemHint: "Pas assez de cette gemme dans le stock commun.",
    jewelryMakeBtn: "Fabriquer",
    toastJewelryNoGold: "Pas assez d'or dans le stock commun.",
    toastJewelryNoGem: "Pas assez de cette gemme dans le stock commun.",
    toastCropWrongType: "Cette case a déjà une autre culture — récolte-la avant de semer autre chose.",
    toastCropMaxed: "Case déjà pleine (5 graines max).",
    // Zip 258 : Eduardo Da Fonseca, commerçant grand voyageur.
    voyagerStatusHome: "De retour au village — prêt à repartir en voyage.",
    voyagerStatusAway: (d) => `En voyage — retour dans ~${d}.`,
    voyagerOrderBtn: "Commander un voyage",
    voyagerSellBtn: "Revendre les produits",
    voyagerOrderTitle: "🌍 Commander un voyage à Eduardo",
    voyagerOrderHint: "Choisis les produits du monde à rapporter. Plus la région est lointaine, plus c'est cher et plus le voyage est long. Payé d'avance.",
    voyagerTripDays: (d) => `${d} jour(s) de voyage`,
    voyagerUnitCost: (c) => `${c} or/unité`,
    voyagerTotal: (c) => `Total : ${c} or`,
    voyagerSendBtn: "Envoyer Eduardo",
    voyagerCancelBtn: "Annuler",
    voyagerEmptyOrder: "Ajoute au moins un produit.",
    voyagerDeparted: (d) => `🐎 Eduardo part en voyage (retour dans ${d}). Bon vent !`,
    voyagerBusyToast: "Eduardo est déjà en voyage.",
    voyagerReturned: (goods) => `🧳 Eduardo est rentré avec : ${goods} !`,
    voyagerReturnNotifTitle: "Eduardo est de retour !",
    voyagerSurpriseTag: " (+ surprise)",
    voyagerSellTitle: "🌍 Produits du monde à revendre",
    voyagerSellRow: (name, n) => `${name} × ${n}`,
    // Zip 370 : `tonka` manquait ici alors que la fève de tonka est dans
    // WORLD_GOODS — la notification de retour d'Eduardo et le résumé de chat
    // affichaient la CLÉ INTERNE brute (« tonka ×3 »). Cette table doit couvrir
    // WORLD_GOODS en entier : tout produit ajouté là doit être ajouté ici, dans
    // les DEUX blocs, sans quoi l'échec est silencieux (`|| key`).
    worldGoodName: (key) => ({ vanilla: "Gousse de vanille", coffee: "Café", cinnamon: "Cannelle", cocoa: "Cacao", pineapple: "Ananas", coconut: "Noix de coco", tonka: "Fève de tonka" }[key] || key),
    voyagerProdLine: (n) => n > 0 ? `Comptoir du voyageur — ${n} produit(s) du monde en réserve.` : "Commerçant grand voyageur — prêt à partir.",
    // Zip 259 : exclusion d'un résident + retour de l'ex-résident.
    residentsSectionTitle: "Résidents",
    kickBtn: "Voter l'exclusion",
    kickTally: (n, m) => `Exclusion : ${n}/${m} voix`,
    kickedChat: (name) => `👋 ${name} a été exclu(e) et libère sa maison.`,
    kickVotedToast: "Ton vote d'exclusion est enregistré.",
    exileReturnChat: (name) => `${name} est revenu(e) au village et demande à vous parler…`,
    pleaTitle: (name) => `${name} est de retour`,
    pleaAccept: "Réintégrer",
    pleaRefuse: "Refuser",
    notifPlea: "revient vous parler",
    exileReacceptedChat: (name) => `🏡 ${name} réemménage — content(e) de le/la revoir !`,
    exileRefusedChat: (name) => `${name} repart pour de bon.`,
    exilePlea: (mood, vi) => (({
      touching: [
        "…Je ne comprends pas. J'étais si bien parmi vous. Est-ce que je peux revenir ? Je ferai des efforts, c'est promis.",
        "Vous m'avez manqué chaque jour. Cette ferme, c'était ma famille. Accordez-moi une seconde chance, je vous en supplie.",
        "Je n'ai pas fermé l'œil depuis mon départ. Dites-moi ce que j'ai mal fait et je le corrigerai, mais reprenez-moi.",
        "J'ai marché des heures pour revenir. Mon cœur est resté ici, avec vous. Laissez-moi rentrer à la maison…",
      ],
      bitter: [
        "Alors on jette les gens comme de vieux outils ? Vous le regretterez, croyez-moi.",
        "Je reviens, mais pas pour mendier. Vous avez été injustes, et vous le savez parfaitement.",
        "J'ai tout donné pour cette ferme, et voilà comment vous me remerciez. Minable.",
        "Ne croyez pas que j'oublierai. On récolte toujours ce que l'on sème.",
      ],
      healthy: [
        "Bonjour. Je respecte votre décision. Je passais juste dire au revoir proprement — et merci pour tout.",
        "Sans rancune, vraiment. J'ai adoré vivre ici. Si un jour une place se libère, pensez à moi.",
        "C'est la vie ! Je vais très bien. Je voulais simplement vous remercier avant de tourner la page.",
      ],
    }[mood] || [])[vi] || ""),
    exileYes: (mood) => ({ touching: "Oh, merci, merci ! Je ne vous décevrai pas cette fois, promis !", bitter: "…Bon. J'accepte. Mais qu'on ne m'y reprenne plus.", healthy: "Avec joie ! Merci de votre confiance — je reprends ma place le sourire aux lèvres." }[mood] || ""),
    exileNo: (mood) => ({ touching: "Je… je comprends. Prenez soin de la ferme. Adieu.", bitter: "C'est ça. Vous ne perdez rien pour attendre.", healthy: "Pas de souci, je m'y attendais. Portez-vous bien, sincèrement !" }[mood] || ""),
    artisanShopTitle: "🛠️ Ateliers d'artisans",
    artisanBuyBtn: "Construire",
    artisanOwnedBtn: "✅ Construit",
    artisanLockedRow: "🔒 Recrute l'artisan pour débloquer",
    craftSellTitle: "🧺 Produits d'artisans",
    craftRow: (name, n) => `${name} × ${n}`,
    craftPortionBtn: (n) => `Découper une roue → ${n} parts`,
    petFullTitle: "Sac de compagnons plein",
    // Zip 388 : le plafond était écrit « 2 » en dur, valeur d'avant le zip 368
    // (MAX_PETS est passé à 8 il y a vingt zips). Le texte mentait depuis.
    petFullSub: (petName, max) => `Un visiteur veut t'offrir ${petName}, mais tu as déjà ${max} compagnons. Libère-en un pour l'accueillir, ou refuse le cadeau.`,
    petFullRelease: "Libérer & accepter",
    petFullDecline: "Refuser le cadeau",
    voteDiceChat: (n, r, st) => `🎲 Vote partagé, le dé donne ${r} : ${n} ${st ? "reste !" : "repart..."}`,
    voteLeaveChat: (n) => `${n} repart, le vote n'a pas abouti.`,
    residentTag: (j) => `Habitant(e) : ${j}`,
    notifAsk: (n) => `${n} attend à la mairie`,
    notifWantsBuy: (q, c) => `Veut acheter ${q} × ${c}`,
    notifWantsChat: "Veut juste discuter",
    notifDemand: (g0) => `Exige ${g0} or !`,
    notifStay: "Demande à s'installer !",
    townhall: "Mairie",
    seaSectionHint: "Créature marine rare, se vend cher.",
    seasonSpring: "Printemps",
    seasonSummer: "Été",
    seasonAutumn: "Automne",
    seasonWinter: "Hiver",
    // Écran de code de ferme (hôte)
    codeTitle: "🌾 Ferme Vallée",
    codePrompt: "Entre un code de ferme pour continuer une partie existante, ou un nouveau code pour démarrer une nouvelle ferme. Le même code recharge toujours la même ferme.",
    codePlaceholder: "Code de la ferme (ex: potager)",
    codeLoad: "Ouvrir la ferme",
    codeLoading: "Chargement de la ferme…",
    codeEmpty: "Choisis un code de ferme.",
    codeDbError: "Sauvegarde des fermes indisponible. As-tu exécuté supabase/upgrade-005.sql ?",
    // Sélection de personnage
    csTitle: "🌾 Ferme Vallée",
    csSub: "Ferme coopérative : cultive, coupe, mine et vends avec ton équipe.",
    btnChangeChar: "🧑‍🌾 Changer de perso",
    namePlaceholder: "Ton prénom de fermier·e",
    fermier: "Fermier",
    fermiere: "Fermière",
    joinBtn: "Rejoindre la ferme !",
    connecting: "Connexion à la ferme…",
    waitWorld: "En attente de l'hôte pour ouvrir la ferme…",
    // HUD
    goldCommon: "or (caisse commune)",
    day: "Jour",
    playersOnline: (n) => `${n} joueur(s) en ligne`,
    // Barre d'outils
    seedsLabel: "Graines",
    foodLabel: "Casse-croûte",
    rodLabel: "Canne",
    seedTip: (name) => `${name} (clique pour choisir une autre graine)`,
    toolsTip: (name) => `${name} (touche 1 pour changer d'outil, clique pour choisir)`,
    foodTip: (e) => `Manger (casse-croûte, poisson ou production animale comestible)`,
    rodTip: "Canne à pêche : vise l'eau de la rivière pour pêcher",
    fenceTip: "Clôture : pose ou retire une section sur la case visée (touche R pour choisir son orientation avant de poser)",
    wallTip: "Mur : pose ou retire une section sur la case visée",
    pathTip: "Chemin : pose ou retire une dalle sur la case visée",
    bridgeTip: "Pont : construis une case de pont sur un site de chantier de la rivière (définitif, pas de retrait)",
    bridgeRenovateTip: "Rénover en pierre : améliore une case de pont bois déjà construite (aspect pierre, résiste à la dégradation nocturne)",
    lampTip: "Lampadaire : pose ou retire un lampadaire sur la case visée (chantier de 15 min réelles, puis fonctionnel : éclaire la nuit dans un rayon autour de lui)",
    scarecrowTip: "Épouvantail : pose ou retire un épouvantail sur la case visée (chantier de 10 secondes réelles). Ne bloque pas le passage.",
    // Zip 251 : outil main + décorations.
    handTip: "Main : pose une décoration du sac, déplace lampadaires/épouvantails/murs/moulins/chaudron/décos, ou reprends-les dans le sac (R, sauf moulin/chaudron : R annule juste la prise). Marche à la ferme et en ville.",
    // Demande Guillaume : trousse de soins armée depuis le sac (clic sur la
    // ligne "pansements") — le soin se déclenche automatiquement (E/Espace)
    // à l'approche d'un joueur ou résident blessé.
    healKitArmedTip: "Trousse de soins armée : approche-toi d'un joueur ou d'un résident blessé et appuie sur E (ou Espace) pour le soigner.",
    handMenuTitle: "🖐️ Décorations à poser",
    handMenuEmpty: "Aucune décoration en sac. On en reçoit en cadeau des visiteurs.",
    handMoveHint: "Clique un objet pour l'attraper, puis clique une case pour le poser (R = ranger dans le sac).",
    handHeldHint: "Clique une case pour déposer • R pour ranger dans le sac",
    moveConfirmBtn: "Valider",
    moveCancelBtn: "Annuler",
    handGrabbed: "Objet attrapé : clique une case pour le poser, ou R pour le ranger.",
    handNothing: "Rien à attraper ici. Arme une décoration ci-dessus pour la poser.",
    decorBadSpot: "Impossible de poser ici.",
    decorNone: "Tu n'as plus cette décoration en sac.",
    decorPicked: "Décoration rangée dans ton sac.",
    objReturned: "Objet rangé dans ton inventaire.",
    handToolName: "Main",
    grassTip: "Herbe : replante de l'herbe sur une case labourée (chantier de 5 secondes réelles, définitif, pas de retrait)",
    millTip: "Moulin : pose un moulin (chantier d'1 heure réelle, transforme le blé déposé en farine en continu, retrait possible seulement à vide)",
    sucrerieTip: "Sucrerie : pose une sucrerie (chantier d'1 heure réelle, transforme la canne à sucre déposée en sacs de sucre en continu tant que Jérôme Martial est installé, retrait possible seulement à vide)",
    herdTip: "Déplacer : clique un animal pour l'attraper, clique à nouveau pour le déposer où tu veux",
    fenceDirToast: (kind) => `Orientation de la clôture : ${kind === "h" ? "horizontale" : kind === "v" ? "verticale" : "automatique"}`,
    // Ressources (bois/pierre) et menu Construire/Vendre (chantier 2026-07)
    woodResTip: "Bois récolté : clique pour construire ou vendre",
    stoneResTip: "Pierre récoltée : clique pour construire ou vendre",
    gemsResTip: "Gemmes de la salle (partagées entre tous les joueurs) : clique pour vendre",
    flourResTip: "Sacs de farine de la salle (partagés entre tous les joueurs, produits par les moulins) : clique pour vendre",
    sugarResTip: "Sacs de sucre de la salle (partagés entre tous les joueurs, produits par les sucreries) : clique pour vendre",
    goldResTip: "Or de la ferme (trouvé en minant, partagé entre tous les joueurs) — utilisé par la bijouterie",
    craftMenuTitleWood: (n) => `🪵 Bois : ${n}`,
    craftMenuTitleStone: (n) => `🪨 Pierre : ${n}`,
    craftMenuTitleGems: () => `💎 Gemmes partagées`,
    craftMenuTitleFlour: () => `🌾 Farine partagée`,
    craftMenuTitleSugar: () => `🍬 Sucre partagé`,
    flourItemName: "Sac de farine",
    sugarItemName: "Sac de sucre",
    gemsSharedHint: "Partagées entre tous les joueurs de la ferme",
    soanFishSharedHint: "Pêchés par Soan, partagés entre tous les joueurs de la ferme",
    // Zip 260 : Harald, l'agent d'élevage.
    haraldRowTitle: (cost) => `🧺 Engager Harald : ${cost} or`,
    haraldRowSub: "Agent d'élevage — tourne autour de l'enclos et ramasse les productions des animaux (œufs, lait, laine, truffes) pour éviter toute perte.",
    haraldNotHiredSub: "Contrat de 24h",
    haraldHiredUntil: (h) => `Employé — encore ${h}h de contrat`,
    haraldWorkingBtn: "En rondes",
    haraldStatusRounds: "Fait ses rondes autour de l'enclos",
    haraldSharedHint: "Ramassés par Harald, partagés entre tous les joueurs de la ferme",
    employeesHaraldName: "Harald",
    sawmillShopSub: "Atelier du bûcheron",
    buildFenceLabel: "Clôture en bois",
    buildWallLabel: "Mur en pierre",
    buildPathLabel: "Chemin dallé",
    buildCostWood: (n) => `${n} bois la section`,
    buildCostStone: (n) => `${n} pierre la section`,
    buildCostPath: (n) => `${n} pierre la dalle`,
    buildBridgeWoodLabel: "Pont en bois",
    buildBridgeStoneLabel: "Pont en pierre",
    buildBridgeRenovateLabel: "Rénover en pierre",
    buildCostBridgeWood: (n) => `${n} bois la case`,
    buildCostBridgeStone: (n) => `${n} pierre la case`,
    equipBtn: "Équiper",
    // Menu de sélection des graines (clic sur la case graines)
    seedMenuTitle: "Choisir une graine",
    // Menu de sélection d'outil (clic sur la case outils : houe/hache/pioche)
    toolMenuTitle: "Choisir un outil",
    // Pêche / gemmes
    toastNeedWater: "Approche-toi de l'eau et vise la rivière pour pêcher !",
    fxGem: (name) => `Gemme : ${name} !`,
    fxBridge: "Pont !",
    fxLeverOpen: "Pont ouvert !",
    fxLeverClosed: "Pont fermé !",
    fxMillDeposit: (n) => `+${n} blé déposé`,
    fxSucrerieDeposit: (n) => `+${n} canne déposée`,
    fxFish: (name) => `+1 ${name.toLowerCase()}`,
    // Quêtes de découverte
    questTitle: "🎯 À faire : découvre la ferme",
    questBtn: "🎯 À faire",
    questReward: (n) => `+${n} or`,
    questDone: (label, n) => `Quête accomplie : ${label} (+${n} or) !`,
    questAllDone: "🎉 Bravo, tu as fait le tour des bases de la ferme !",
    questLabels: {
      till: "Laboure une case (houe)",
      plant: "Plante une graine",
      water: "Arrose une culture (arrosoir)",
      chop: "Coupe un arbre (hache)",
      mine: "Casse un rocher (pioche)",
      fish: "Pêche un poisson (canne)",
      sell: "Vends quelque chose au bac",
    },
    // Cheval / puits / téléport
    btnWell: "🪣 Puits",
    whistleTip: "Siffler pour rappeler les chevaux",
    mountPrompt: "[F] Monter à cheval",
    dismountPrompt: "[F] Descendre du cheval",
    wellToast: "🪣 Téléport au puits !",
    // Torche / loups (chantier 2026-07)
    torchTipOn: "Éteindre la torche",
    torchTipOff: "Sortir une torche (éloigne les loups)",
    wolfAteAnimal: () => "Un loup a emporté un animal de l'enclos, cette nuit !",
    // Loups agressifs / morsure (chantier 2026-07)
    wolfBiteTitle: "🐺 IL T'ATTAQUE !",
    wolfBiteHint: "Martèle Espace (ou clique) pour le repousser !",
    wolfBiteWin: "Tu as repoussé le loup !",
    wolfBiteFailChat: (who) => `🩸 ${who} a été mordu par un loup et ramené chez lui, blessé.`,
    wolfBiteWinChat: (who) => `🐺 ${who} a repoussé un loup agressif !`,
    // Mise à mort après 3 victoires (chantier 2026-07, demande Guillaume)
    wolfKilledChat: (who) => `🗡️ ${who} a terrassé un loup agressif après trois ripostes !`,
    // Créature maléfique / mini-jeu de morsure (chantier 2026-07)
    evilBiteTitle: "👹 ELLE T'ATTAQUE !",
    evilBiteHint: "Martèle Espace (ou clique) pour lui échapper !",
    evilBiteWin: "Tu as repoussé la créature !",
    evilKilledChat: (who) => `🗡️ ${who} a terrassé une créature maléfique après trois ripostes !`,
    rabbitCaughtChat: (who) => `🐇 ${who} a attrapé un lapin sauvage !`,
    injuredBanner: (mmss) => `🩸 Blessé — repos forcé (${mmss})`,
    toastInjured: "Tu es blessé, impossible d'agir pour le moment.",
    /* ⚠️⚠️ 2026-08-31 — LE REFUS QUI MANQUAIT. `toastInjured` s'affiche au moment
       où l'on est blessé ; celui-ci s'affiche à chaque fois qu'on ESSAIE d'agir
       pendant le repos forcé, parce que E ne répondait rien du tout — voir la
       garde `isInjured()` de `onKeyDown`. Il donne le décompte, sans quoi on ne
       sait pas s'il reste dix secondes ou dix minutes. */
    toastInjuredWait: (mmss) => `🩸 Tu es blessé — repos forcé encore ${mmss}. Ce que tu as rapporté t'attend.`,
    // Boutique : bâtiments et animaux
    buyLabel: "Acheter",
    shopHorseTitle: (cost) => `🐴 Cheval : ${cost} or`,
    shopHorseSub: "Se déplace bien plus vite une fois enfourché. Approche-toi et appuie sur F (peut porter deux cavaliers).",
    shopHorseCount: (n, max) => `Chevaux dans la ferme : ${n}/${max}`,
    shopHorseMax: "🐴 Nombre maximum de chevaux atteint.",
    horseCoatLabel: (coat) => coat === "black" ? "Acheter (noir)" : coat === "white" ? "Acheter (blanc)" : "Acheter (bai)",
    shopWellTitle: (cost) => `🪣 Puits : ${cost} or`,
    shopWellSub: "Ajoute un 2e point de téléport dans les champs (bouton 🪣).",
    shopWellOwned: "🪣 Puits déjà construit.",
    shopAnimalsHeader: "🐮 Marché aux animaux",
    // En-têtes de sections de la boutique réorganisée (demande Guillaume 2026-07)
    shopSeedsHeader: "🌱 Graines & cultures",
    shopBuildHeader: "🏗️ Constructions",
    shopConsumablesHeader: "🎒 Consommables & soins",
    shopStaffHeader: "🧑‍🌾 Employés",
    // Maison à niveaux (validation Guillaume 2026-07)
    houseRowTitle: (lvl) => `🏪 FARM MARKET STORE (niveau ${lvl})`, // zip 250 : renommage de la maison centrale (demande Guillaume)
    houseRowSub: "Améliore le FARM MARKET STORE de la ferme (nouveau visuel à chaque niveau). Bois/pierre prélevés sur TON inventaire, or sur la caisse commune.",
    houseRowCost: (pal) => `Passer au niveau ${pal.level} : ${pal.cost.money} or + ${pal.cost.wood} bois + ${pal.cost.stone} pierre. Travaux : ${Math.round(pal.durationMs / 3600000)} h`,
    houseRowMax: "Niveau maximum atteint !",
    houseUpgrading: (mn) => `🔨 Travaux en cours... fin dans ~${mn} min`,
    houseUpgradeBtn: "Lancer les travaux",
    houseWorksStarted: (name, lvl) => `${name} a lancé les travaux du FARM MARKET STORE (vers le niveau ${lvl}) !`,
    houseUpgraded: (lvl) => `🎉 Le FARM MARKET STORE est passé au niveau ${lvl} !`,
    animalRowTitle: (name, cost) => `${name} : ${cost} or`,
    animalRowSub: (prod, sell, hours) => `Produit toutes les ${hours} h : ${prod} (se vend ${sell} or)`,
    penFull: "L'enclos est plein !",
    chatAnimalBought: (name) => `${name} rejoint l'enclos !`,
    promptSellAnimal: (price) => `[E] Vendre l'animal (${price} or)`,
    chatAnimalSold: (name, price) => `💰 ${name} vendu(e) pour ${price} or.`,
    // Bac : productions d'élevage
    prodRowTitle: (name, n) => `${name} × ${n}`,
    fxProduct: (name) => `+1 ${name.toLowerCase()}`,
    fxCollect: "Ramassé !",
    // Minijeu de pêche
    fishBite: (name) => `Ça mord... un ${name.toLowerCase()} !`,
    fishTimingTitle: "🎣 Ferre le poisson !",
    fishTimingHint: "Clique ou Espace quand le curseur est dans la zone verte",
    fishHoldTitle: "🎣 Épuise le poisson !",
    fishHoldHint: "Maintiens (clic ou Espace) pour garder la barre sur le poisson",
    fishReactTitle: "🎣 Prépare-toi...",
    fishReactHint: "Clique DÈS que le cadre devient vert !",
    fishReactNow: "MAINTENANT !",
    fishWin: "Beau poisson !",
    fishFail: "Le poisson s'est échappé...",
    fishTooSoon: "Trop tôt ! Il a filé.",
    // Invites de proximité
    promptShop: "[E] Boutique",
    promptBin: "[E] Réserves",
    promptBarn: "[E] Déposer à la grange",
    promptBarnBuild: "[E] Construire (mini-jeu)",
    promptSleep: "[E] Dormir",
    promptWake: "[E] Se réveiller",
    // Dormir dans la maison (chantier 2026-07)
    toastSleepFull: "Tu n'es pas fatigué, pas besoin de dormir.",
    toastSleepDone: "Bien dormi ! Énergie remplie.",
    toastSleepEarly: "Réveil anticipé.",
    // Trousse de soins (chantier 2026-07) : un autre joueur blessé peut être
    // soigné (touche E à proximité), réduit son repos forcé à 1 minute.
    healKitRowTitle: "🩹 Trousse de soins (gratuite)",
    healKitRowSub: (n) => `Réduit à 1 min le repos forcé d'un coéquipier blessé (approche-toi, touche E). En stock : ${n}`,
    healChat: (healer, hurt) => `🩹 ${healer} a soigné ${hurt}, son repos forcé est réduit à 1 minute !`,
    toastNotInjured: "Ce fermier n'est plus blessé.",
    toastNoHealKit: "Il te faut une trousse de soins (achetable gratuitement au magasin).",
    toastHealTooFar: "Rapproche-toi du fermier blessé pour le soigner.",
    // Grange collaborative persistante (zip 158)
    barnHudLine: (level, max, cap) => `Grange ${level}/${max} · ${cap} animaux max`,
    barnDeposited: (who, n, res) => `${who} apporte ${n} ${res} à la grange.`,
    barnReadyChat: (money) => `🛖 La grange a assez de matériaux, ${money} or ont été prélevés dans la caisse commune : approchez-vous et faites [E] pour construire !`,
    barnBuilt: (who, level) => `🎉 ${who} a fait passer la grange au niveau ${level} !`,
    barnMiniFail: "Raté ! Reviens à la grange pour retenter.",
    barnMiniTitle: (level) => `🔨 Construction de la grange (palier ${level})`,
    barnMiniSub: (hits, needed) => `Coups réussis : ${hits}/${needed}`,
    barnMiniHint: "Clique ou appuie sur Espace quand le curseur est dans la zone verte.",
    toastBarnMax: "La grange est déjà à son niveau maximum.",
    toastFarBarn: "Approche-toi de la grange pour déposer.",
    toastBarnReadyWait: "La grange est prête à être construite : appuie sur E pour lancer le mini-jeu.",
    toastBarnNotReady: "Il manque encore des matériaux avant de pouvoir construire.",
    toastBarnNeedMoney: "Le bois et la pierre sont réunis, mais il manque de l'or dans la caisse commune pour lancer les travaux.",
    // Zip 368 : les textes de la mission d'équipe (coopTitle, coopStarted,
    // coopDeposited, coopDone, toastCoopNone, toastFarCoop) sont supprimés
    // avec la mission d'équipe. Les TROIS chaînes ci-dessous restent : le
    // dépôt à la GRANGE collaborative les réutilise (voir resolveBarnDeposit
    // et la ligne de chat barnDeposited). Leur nom en "coop"/"Label" est
    // historique, ne pas s'y fier.
    woodLabel: "bois",
    stoneLabel: "pierre",
    toastCoopNothing: "Tu n'as pas la ressource attendue sur toi (bois ou pierre).",
    // Boutique
    shopTitle: "🛒 Boutique de Pierre",
    shopHint: "Les achats sont payés avec la caisse commune de l'équipe.",
    seedsUsageHint: "Sème une graine sur une case labourée (houe), puis arrose-la (arrosoir équipé : marche dessus, ou vise-la) jusqu'à maturité. L'arrosage reste valable 10h réelles, à renouveler sinon la pousse se met en pause.",
    seedRowSub: (cr) => `Pousse en ${Math.round(cr.growMs / 3600000)} h (arrosée) · se vend ${cr.sell} or · en stock : `,
    seedCostLabel: (cr) => `${cr.seedName} : ${cr.seedCost} or`,
    foodRowTitle: (cost) => `Casse-croûte : ${cost} or`,
    foodRowSub: (e, stock) => `Rend ${e} énergie · en stock : ${stock}`,
    toolsHeader: "⚒ Améliorations d'outils (moins d'énergie, plus efficaces)",
    toolUsage: {
      hoe: "Laboure une case d'herbe pour pouvoir y semer une graine.",
      can: "Arrose une culture plantée pour qu'elle continue de pousser. L'arrosage reste valable 10h réelles, puis il faut réarroser (marcher dessus avec l'arrosoir équipé suffit).",
      axe: "Coupe les arbres pour récolter du bois. Chaque niveau donne aussi ×1,5 plus de bois par arbre.",
      pick: "Casse les rochers pour récolter de la pierre (et parfois une gemme). Chaque niveau donne aussi ×1,5 plus de pierre par rocher.",
    },
    toolRowTitle: (name, lvl) => `${name} : niveau ${lvl}`,
    toolMaxSub: "Niveau maximum atteint !",
    toolUpSub: (lvl, cost) => `Passer au niveau ${lvl} : ${cost} or`,
    buy1: "×1", buy5: "×5", buyOne: "Acheter",
    upgrade: "Améliorer", maxLabel: "MAX",
    /* ZIP 403 — la case fusionnée « porter », et les deux lignes de sac qui
       remplacent les cases nourriture et canne. */
    carryMenuTitle: "Que veux-tu porter ?",
    carryNames: { herd: "Troupeau", hand: "Main" },
    carrySubs: { herd: "attraper et déposer un animal", hand: "poser, déplacer, ranger un objet" },
    bagGearTitle: "En-cas et matériel",
    bagFoodRow: (n) => `Snacks × ${n}`,
    bagFoodSub: (e) => `Clique pour en manger un : ${e} points d'énergie.`,
    bagRodRow: "Canne à pêche",
    bagRodSub: "Clique pour la déployer, puis vise l'eau. Elle se range dès que tu changes de case.",
    rodArmedTip: "Déployée : vise une case d'eau.",
    rodArmedToast: "🎣 Canne déployée. Vise l'eau ; change de case pour la ranger.",
    /* ⚠️ ZIP 401 — LES NOMS COURTS DES VARIANTES DE CONSTRUCTION.
       Ils n'existaient pas : la case 6 n'avait que des INFOBULLES (wallTip,
       pathTip…), c'est-à-dire des phrases. Or une case d'inventaire de 44 px
       ne peut pas porter une phrase — et c'est une des raisons pour lesquelles
       personne ne pouvait deviner que cette case tournait. Un cycle dont on ne
       peut pas nommer les crans est un cycle invisible. */
    buildNames: {
      fence: "Clôture", wall: "Mur", path: "Pavage", lamp: "Lampadaire",
      scarecrow: "Épouvantail", grass: "Herbe", mill: "Moulin",
      cauldron: "Chaudron", bridgeWood: "Pont de bois",
      bridgeStone: "Pont de pierre", bridgeRenovate: "Rénover en pierre",
    },
    /* L'astuce qui manquait depuis le zip 251. Elle est affichée SOUS la case
       et dans l'infobulle : le joueur n'a aucun moyen de deviner qu'une touche
       déjà appuyée fait autre chose la deuxième fois. */
    cycleHint: (key) => `${key} à nouveau : variante suivante`,
    cycleList: (names, cur) => `Cycle : ${names.map(n => (n === cur ? `[${n}]` : n)).join(" → ")}`,
    cycleAlone: "Une seule variante en réserve : rien à faire tourner.",
    fenceRowTitle: (cost) => `Clôture : ${cost} or la section`,
    fenceRowSub: (n) => `Pose ou retire une section où tu veux (touche 4) · en stock : ${n}`,
    lampRowTitle: (cost) => `💡 Lampadaire : ${cost} or`,
    lampRowSub: (n) => `Chantier de 15 min réelles avant d'être fonctionnel, puis éclaire un rayon autour de lui la nuit. Pose ou retire où tu veux (touche 4) · en stock : ${n}`,
    scarecrowRowTitle: (cost) => `🌾 Épouvantail : ${cost} or`,
    scarecrowRowSub: (n) => `Chantier de 10 secondes réelles. Ne bloque pas le passage. Pose ou retire où tu veux (touche 4) · en stock : ${n}`,
    grassRowTitle: (cost) => `🌱 Herbe : ${cost} or l'unité`,
    grassRowSub: (n) => `Replante l'herbe sur une case labourée (chantier de 5 secondes réelles, définitif, pas de retrait) · en stock : ${n}`,
    millRowTitle: (cost) => `🏚️ Moulin : ${cost} or`,
    millRowSub: (n) => `Transforme le blé déposé en sacs de farine, en continu (chantier d'1 heure réelle) · en stock : ${n}`,
    sucrerieRowTitle: (cost) => `🏚️ Sucrerie : ${cost} or`,
    // Chantier "sucrerie déplaçable" : construction INSTANTANÉE désormais
    // (comme la ruche/fromagerie/boulangerie/scierie), plus de chantier d'1h.
    sucrerieRowSub: () => `Transforme la canne à sucre déposée en sacs de sucre, tant que Jérôme Martial est installé — déplaçable comme les autres ateliers`,
    // Bac de vente
    /* Zip 431 — le bac n'achète plus rien. ⚠️ IL GARDE SON NOM D'USAGE mais le
       texte dit ce qu'il est devenu : l'inventaire complet de la ferme, à
       consulter avant de prendre le train. Le renommer « inventaire » aurait
       cassé le repère de deux joueurs qui disent « je passe au bac » depuis des
       mois — c'est le lieu qui compte, pas l'étiquette. */
    binTitle: "🧾 Réserves de la ferme",
    binHint: "Tout ce que la ferme possède. La vente se fait désormais au marché du champ de foire, à Valley Town — prenez le train.",
    cropRowTitle: (name, n) => `${name} × ${n}`,
    cropRowSub: (cr, n) => `${cr.sell} or pièce · total ${n * cr.sell} or`,
    woodRowTitle: (n) => `Bois × ${n}`,
    stoneRowTitle: (n) => `Pierre × ${n}`,
    sellAll: "Tout vendre",
    // Carte plein écran
    mapTitle: "🗺️ Carte de la vallée",
    mapClose: "Clique n'importe où ou appuie sur Échap ou M pour fermer",
    mapYou: "toi",
    // Boutons flottants
    btnSettings: "Paramètres",
    btnHome: "🏠 Maison",
    btnMap: "🗺️ Carte",
    btnEmployees: "👥 Employés",
    btnChat: "💬 Chat",
    btnLeave: "Quitter",
    homeToast: "🏠 Retour devant la maison !",
    homeBlockedToast: "🌑 Impossible de rentrer d'ici... il faut retrouver le passage.",
    darkPassageToast: "🌑 Une obscurité glaciale t'avale...",
    darkPassageReturnToast: "☀️ Tu retrouves la lumière du jour.",
    evilMonsterCaughtToast: "👹 Une créature t'a happé... tu te réveilles chez toi, blessé.",
    // Zip 372 : défi de fuite (porte est du monde sombre). Les textes de la
    // course elle-même ne sont PAS ici : le défi est une page autonome servie
    // depuis public/templerun/, avec sa propre table FR/EN (js/strings.js).
    // Ces clés-ci ne couvrent que ce que la FERME affiche autour du défi.
    runEnteredChat: (name) => `🏃 ${name} franchit la porte et tente la fuite !`,
    // Zip 385 — Le Gourmandin (Pays des Bonbons).
    /* ⚠️ ZIP 411 — LE GOURMANDIN N'EST PLUS AU BOUT DU PONT. Le message le
       disait, il aurait menti. On ne laisse pas traîner un texte qui décrit
       l'ancienne carte : c'est ce qu'un joueur lit, et c'est ce qu'un modèle
       qui reprend le projet croira. */
    candyEnteredChat: (name) => `🍭 ${name} nourrit le gentil monstre Candy au milieu du lac.`,
    lugeEnteredChat: (name) => `🛷 ${name} traverse le pont arc-en-ciel et s'élance dans la Grande Descente.`,
    // L'invite du monstre du lac. Le mot « gentil » est de Guillaume, et il
    // compte : c'est lui qui dit qu'on n'est pas dans le monde sombre.
    candyMonsterAsk: "Donne à manger au gentil monstre Candy ?",
    candyMonsterSub: "Il garde l'entrée de son jeu au fond du lac de sirop.",
    yes: "Oui",
    no: "Non",
    lugeFinishToast: (gold) => `🛷 Descente terminée ! +${gold} pièces.`,
    lugeCandyToast: (gold) => `🍬 Bonbons rapportés : +${gold} pièces.`,
    lugeAgainToast: "La piste reste ouverte, mais la prime d'arrivée attendra ta prochaine venue.",
    lugeFinishChat: (name, gold) => `🛷 ${name} dévale la Grande Descente jusqu'en bas ! +${gold} pièces.`,
    // Zip 386 : pont construit, destination pas encore écrite.
    bridgeNoDest: "Le pont s'arrête là. Quelque chose viendra s'y installer.",
    /* Zip 393 — LE LABYRINTHE (au bout du pont de haies). Comme pour le défi
       et le Gourmandin, les textes DU JEU ne sont pas ici : il est servi
       depuis public/labyrinth/ avec sa propre table FR/EN (js/strings.js).
       Ces clés-ci ne couvrent que ce que la FERME affiche autour. */
    labEnteredChat: (name) => `🕯️ ${name} traverse le pont de haies et descend dans le labyrinthe.`,
    labLostChat: (name, shards) => shards > 0
      ? `🕯️ ${name} n'est pas ressorti du labyrinthe, mais rapporte ${shards} éclat(s).`
      : `🕯️ ${name} n'est pas ressorti du labyrinthe, les mains vides.`,
    labWonChat: (name, gold) => `🏛️ ${name} est ressorti du labyrinthe ! Le lac lui laisse ${gold} or.`,
    labLostToast: "🕯️ Le noir t'a eu... tu te réveilles à la ferme, blessé.",
    labShardsToast: (n) => `💎 +${n} éclat(s) rapporté(s) du labyrinthe !`,
    /* ⚠️ ZIP 418 — LA VALLÉE DE VERRE. Comme pour le défi de fuite et le
       labyrinthe, ces clés vivent ici alors que le jeu a sa propre table
       (public/crystal/js/strings.js) : ce sont les textes que la FERME affiche
       autour du mini-jeu, jamais ceux du mini-jeu lui-même. */
    cryEnteredChat: (name) => `❄️ ${name} traverse le pont de cristal et descend dans la vallée.`,
    cryLeftChat: (name) => `❄️ ${name} remonte de la vallée de verre.`,
    cryChapterToast: (n) => `📖 Chapitre ${n} terminé — la vallée se souvient de vous.`,
    cryShardsToast: (n) => `💎 +${n} éclat(s) de givre rapporté(s) de la vallée !`,
    labWonToast: "😮‍💨 Dehors. L'air du monde sombre n'a jamais paru aussi respirable.",
    labPrizeToast: (gold) => `🏛️ Prime de sortie : +${gold} or ! (une fois par venue du labyrinthe)`,
    bagLabTitle: "Labyrinthe",
    bagLabBestSub: (n) => n > 0 ? `Meilleur score : ${n}` : "Jamais entré.",
    candyGoldChat: (name, gold) => `🪙 ${name} a rassasié le Gourmandin jusqu'au niveau 10 : il recrache ${gold} pièces d'or !`,
    candyCatChat: (name) => `🐱 ${name} a terminé les quinze niveaux du Gourmandin et repart avec un chat berlingot.`,
    runLostChat: (name, candies) => candies > 0
      ? `🍬 ${name} s'est fait rattraper, mais rapporte ${candies} bonbon(s).`
      : `🍬 ${name} s'est fait rattraper, les mains vides.`,
    runLostToast: "🐺 La meute t'a eu... tu te réveilles à la ferme, blessé.",
    runCandiesToast: (n) => `🍬 +${n} bonbon(s) rapporté(s) du monde sombre !`,
    // Zip 375 : ressortir du menu du défi sans courir ne met pas la meute
    // en fuite pour autant. Le message doit dire les deux choses à la fois —
    // tu as reculé, ils sont toujours là.
    runAmbushToast: "🐺 Tu recules sur la berge... la meute, elle, n'a pas bougé.",
    // Zip 377 : sortie par la bifurcation offroad. Texte donné mot pour mot
    // par Guillaume — ne pas le réécrire.
    runEscapedToast: "😮‍💨 Ouf ! On n'est pas passé loin de la catastrophe. Vite, sortez de là et retrouvez vos résidents.",
    runEscapedChat: (name, candies) => candies > 0
      ? `🛤️ ${name} a quitté la piste par l'offroad et rentre avec ${candies} bonbon(s), sans une égratignure.`
      : `🛤️ ${name} a quitté la piste par l'offroad, sans une égratignure.`,
    bagRunTitle: "Défi de fuite",
    bagCandiesRow: (n) => `${n} bonbon(s)`,
    bagRunBestSub: (n) => n > 0 ? `Meilleur score : ${n}` : "Aucun score pour l'instant.",
    drownToast: "🌊 Glouglou... tu as coulé ! Ramené à la maison, blessé (1 min).",
    /* 2026-08-31 — la barque. ⚠️ LE REFUS DIT POURQUOI ET CE QU'IL FAUT FAIRE :
       « F » qui ne fait rien devant une touche qu'on vient d'apprendre est un
       bug aux yeux du joueur, pas une règle. */
    boatNoShore: "⛵ Trop loin de la berge pour débarquer — approche-toi du bord.",
    boatNotReady: "⛵ Le navire n'est pas encore en état de prendre l'eau.",
    /* Zip 449 — la brûlure du cratère. ⚠️ ELLE DIT LA CAUSE, PAS LA SANCTION : un
       joueur qui lit « blessé 10 minutes » sans comprendre POURQUOI croit à un
       bogue. Le texte du jeu est en français des deux côtés ici (les répliques de
       la quête, elles, sont encore en anglais dans STAR_EN — voir sa note). */
    burnToast: "🔥 Le fond est encore en fusion ! Brûlé, ramené à la maison (10 min).",
    mapDarkPassage: "Passage sombre",
    /* Zip 426 — les repères de la carte de Valley Town. ⚠️ CE SONT DES NOMS DE
       LIEUX, pas des libellés d'invite : « Tribunal », pas « E : entrer ». Une
       carte annonce où l'on est, elle ne propose rien. */
    mapTownStation: "Gare",
    mapTownPlaza: "Grand-Place",
    mapTownCourt: "Tribunal",
    mapTownHall: "Hôtel de ville",
    mapTownChurch: "Église",
    mapTownPark: "Parc",
    mapTownOrchard: "Verger",
    mapTownMarket: "Champ de foire",
    mapTownCemetery: "Cimetière",
    mapTownLake: "Lac",
    mapTownBelvedere: "Belvédère",
    healPartialChat: (soigneur, blesse, mn) => `${soigneur} a appliqué un pansement à ${blesse} : encore ${mn} min de repos (un autre pansement peut aider !)`,
    // Pommade de protection (chantier 2026-07) : achetable au magasin,
    // repousse les créatures maléfiques et immunise le joueur contre elles
    // pendant 10 minutes, pour explorer/farm côté maléfique sans crainte.
    salveRowTitle: "🧴 Pommade de protection",
    salveRowSub: (n) => `Utilisée : repousse les créatures maléfiques et t'immunise contre elles pendant 10 min. Se fabrique au chaudron (⚗️). En stock : ${n}`,
    salveUseLabel: "Utiliser",
    salveUsedToast: "🧴 Pommade appliquée : immunisé contre les créatures maléfiques pendant 10 minutes.",
    toastNoSalve: "Il te faut une pommade de protection (à fabriquer au chaudron).",
    immunityBanner: (t) => `🧴 Invisible et immunisé aux créatures maléfiques — ${t}`,
    // Chaudron de la pommade de protection (chantier 2026-07) : recette
    // coopérative (1 améthyste + 2 truites + 1 brochet), voir CAULDRON_SITE/
    // SALVE_RECIPE (fermeConstants.js) et resolveSalveDeposit/resolveSalveBrew
    // (fermeEngine.js).
    promptCauldron: "[E] Chaudron (concocter)",
    promptCauldronIgnite: "[E] Allumer le chaudron 🔥",
    promptCauldronBrewing: (s) => `⏳ Concoction en cours... ${s}s`,
    promptCauldronCollect: "[E] Récupérer la pommade",
    promptSalveDeposit: "[E] Déposer poisson au chaudron",
    promptSalveBrew: "[E] Lancer la concoction",
    salveDeposited: (who, n, res) => `${who} dépose ${n} ${res} au chaudron.`,
    salveIgnited: (who) => `🔥 ${who} allume le feu sous le chaudron ! Concoction en cours (1 min)...`,
    salveBrewed: (who) => `⚗️ ${who} récupère une pommade de protection au chaudron !`,
    // 480 bis — l'Essence d'étoile, même trio de phrases que la pommade.
    oreDeposited: (who, n) => `${who} dépose ${n} éclat${n > 1 ? "s" : ""} de comète au chaudron.`,
    lureIgnited: (who) => `🔥 ${who} allume le feu sous le chaudron ! Essence d'étoile en cours (1 min 30)...`,
    lureBrewed: (who) => `⚗️ ${who} récupère une Essence d'étoile au chaudron !`,
    toastFarCauldron: "Approche-toi du chaudron pour déposer ou concocter.",
    toastNoFishToDeposit: "Tu ne portes ni truite ni brochet à déposer.",
    toastNoOreToDeposit: "Tu ne portes pas d'éclats de comète à déposer.",
    toastCauldronMissing: "Il manque des ingrédients (1 améthyste, 2 truites, 1 brochet), ou le chaudron n'est pas encore posé.",
    toastCauldronBrewing: "⏳ La concoction est déjà en cours, reviens dans un instant.",
    toastCauldronNothingToCollect: "Rien à récupérer au chaudron pour l'instant.",
    toastCauldronNeedTorch: "Allume d'abord ta torche pour lancer le feu sous le chaudron !",
    toastCauldronHasEnough: "Le chaudron a déjà tout le poisson nécessaire pour cette recette.",
    cauldronNeedAmethyst: "Il manque une améthyste dans la réserve commune de gemmes pour lancer la recette.",
    troutLabel: "truite(s)",
    pikeLabel: "brochet(s)",
    // Menu du chaudron (chantier 2026-07, refonte demande Guillaume : "une
    // fois la recette sélectionnée, le chaudron doit proposer de déposer les
    // ingrédients ? Oui-Non [...] si tous les ingrédients sont là alors on
    // peut cliquer sur prêt ! et puis le chaudron indiquera allumez le
    // chaudron") : liste de produits (une seule entrée pour l'instant),
    // confirmation avant chaque dépôt, bouton "Prêt !" une fois la recette
    // complète, puis allumage effectif dans le monde (clic/E sur le
    // chaudron, torche en main) — voir cauldronPlaceIngredients/
    // igniteCauldron/tryOpenNearby, FermeGame.js.
    cauldronMenuTitle: "⚗️ Que voulez-vous concocter ?",
    cauldronMenuHint: "Réunis les ingrédients du parchemin, puis va allumer ta torche et clique sur le chaudron pour lancer le feu.",
    cauldronProductSalveName: "🧴 Pommade magique",
    // 480 bis — nouvelle concoction, ingrédients rares (éclats de comète du
    // monde maléfique + améthyste) : voir STAR_LURE_RECIPE, fermeConstants.js.
    cauldronProductLureName: "✨ Essence d'étoile",
    // Parchemin de recette (demande Guillaume 2026-07) : nom en haut, liste
    // des ingrédients (avec avancement), effet en bas dans une formulation
    // voilée, sans chiffres de gameplay.
    scrollIngAmethyst: (have, need) => `${need} améthyste de la réserve commune (${have}/${need})`,
    scrollIngTrout: (dep, need) => `${need} truites versées au chaudron (${dep}/${need})`,
    scrollIngPike: (dep, need) => `${need} brochet versé au chaudron (${dep}/${need})`,
    scrollIngOre: (dep, need) => `${need} éclat${need > 1 ? "s" : ""} de comète du monde maléfique (${dep}/${need})`,
    cauldronScrollEffect: "« Qui s'en oint la peau chemine un temps parmi les ombres, et les créatures de la nuit se détournent de son passage. »",
    cauldronLureScrollEffect: "« Ce que la fiole retient, nulle étoile ne le fuit plus : elle vient d'elle-même, à pas comptés. »",
    cauldronAddBtn: "🫗 Ajouter les ingrédients",
    cauldronReadyBtn: "✅ Prêt !",
    cauldronReadyHint: "Recette complète — va allumer ta torche puis clique sur le chaudron pour lancer la concoction !",
    cauldronIgniteHint: "Torche en main, clique sur le chaudron pour allumer le feu et lancer la concoction (1 min).",
    // Chaudron ramené du monde maléfique (chantier 2026-07, demande
    // Guillaume) : artéfact ramassable UNE SEULE fois côté maléfique, puis
    // posable où on veut côté ferme avec l'outil Construction (voir
    // O_CAULDRON/EVIL_CAULDRON_SPAWN, fermeConstants.js).
    promptEvilCauldronPickup: "[E] Ramasser le chaudron",
    // Zip 385. Les deux suivantes corrigent un défaut TROUVÉ EN CHEMIN : ni la
    // breloque ni le coffre du labyrinthe n'avaient d'invite propre, et
    // tombaient tous deux sur promptBin — s'approcher d'un trésor proposait
    // donc « vendre au bac » depuis le zip 235.
    promptMazePrize: "[E] Ouvrir le coffre",
    promptPassagePickup: "[E] Ramasser la breloque",
    evilCauldronPickedToast: "⚗️ Tu as récupéré le chaudron ! Ramène-le côté ferme et pose-le où tu veux (outil Construction).",
    toastCauldronAlreadyTaken: "Ce chaudron a déjà été récupéré.",
    // Éclats de comète (hors-zip, demande Guillaume) : même trio que le
    // chaudron-artéfact juste au-dessus.
    promptEvilShardsPickup: "[E] Ramasser les éclats de comète",
    evilShardsPickedToast: "✨ Tu as ramassé un tas d'éclats de comète ! Prépare-les avec une améthyste au chaudron pour l'Essence d'étoile.",
    toastShardsAlreadyTaken: "Ce tas d'éclats de comète a déjà été ramassé.",
    toastNoCauldronStock: "Tu ne portes pas de chaudron à poser.",
    toastCauldronNotEmpty: "Vide le chaudron (poisson déposé) avant de le déplacer.",
    cauldronRowTitle: "⚗️ Chaudron",
    cauldronRowSub: "Ramené du monde maléfique. Pose-le où tu veux avec l'outil Construction : il sert alors à fabriquer la pommade de protection ou l'Essence d'étoile.",
    // Aide
    help1: "ZQSD/WASD/Flèches : bouger (8 directions) · Espace/Clic : utiliser l'outil",
    help2: "1-8 : outils (5 = canne, 6 = construire) · E : interagir · Q : parler · F : cheval · T : chat · M : carte",
    // Toasts
    toastTired: "Trop de fatigue ! Mange un casse-croûte ou attends demain.",
    toastFarShop: "Approche-toi de la boutique !",
    toastFarBin: "Approche-toi du bac de vente !",
    toastNoGold: "Pas assez d'or !",
    toastToolMax: "Outil au niveau maximum !",
    toastNoFence: "Plus de section de clôture, achètes-en à la boutique !",
    toastNoWood: "Pas assez de bois !",
    toastNoStone: "Pas assez de pierre !",
    toastNoWallStock: "Plus de mur en stock, fabrique-en avec de la pierre !",
    toastNoPathStock: "Plus de dalle en stock, fabrique-en avec de la pierre !",
    toastNoLampStock: "Plus de lampadaire en stock, achètes-en à la boutique !",
    toastNoScarecrowStock: "Plus d'épouvantail en stock, achètes-en à la boutique !",
    toastNoGrassStock: "Plus d'herbe en stock, achètes-en à la boutique !",
    toastNoMillStock: "Plus de moulin en stock, achètes-en un à la boutique !",
    toastMillNotEmpty: "Vide d'abord le moulin (il reste du blé à transformer) avant de le retirer.",
    toastNoWheatToDeposit: "Tu n'as pas de blé récolté à déposer.",
    toastMillFull: "Le moulin est plein de blé, attends qu'il en transforme avant d'en redéposer.",
    /* ZIP 402 — les cinq phrases qui manquaient au moulin. Voir resolveAct :
       poser et retirer étaient le même geste muet, quinze sols refusaient sans
       rien dire, et déposer du blé sans moulin construit sortait en silence. */
    toastMillPlaced: "Moulin posé. Compte une heure de chantier avant qu'il tourne.",
    toastMillTaken: "Moulin repris dans ton sac.",
    toastMillGround: "Un moulin se pose sur de l'herbe ou sur une case labourée, pas ici.",
    toastMillOccupied: "Il y a déjà quelque chose sur cette case.",
    toastMillOnCrop: "Une culture pousse ici : récolte-la d'abord.",
    toastNoMillBuilt: "Aucun moulin terminé sur la ferme. Pose-en un et laisse le chantier finir.",
    toastMillBuilding: "Ce moulin est encore en chantier. Le compte à rebours au-dessus dit combien de temps il reste.",
    // Petit changement (demande Guillaume) : petite notification quand un
    // moulin s'arrête faute de blé à moudre.
    millStoppedToast: "🌾 Le moulin ne tourne plus — il n'a plus de blé à moudre.",
    // Sucrerie (chantier canne à sucre) : miroir exact des 4 toasts moulin ci-dessus.
    toastNoSucrerieStock: "Plus de sucrerie en stock, achètes-en une à la boutique !",
    toastSucrerieNotEmpty: "Vide d'abord la sucrerie (il reste de la canne à transformer) avant de la retirer.",
    // Petit changement (demande Guillaume) : idem moulin, côté sucrerie.
    sucrerieStoppedToast: "🎋 La sucrerie ne tourne plus — il n'y a plus de canne à presser.",
    toastNoCaneToDeposit: "Tu n'as pas de canne à sucre récoltée à déposer.",
    toastSucrerieFull: "La sucrerie est pleine de canne, attends qu'elle en transforme avant d'en redéposer.",
    toastActionFailed: "Action impossible, réessaie.",
    toastNewDay: (day) => `☀ Jour ${day} ! Énergie restaurée.`,
    // Chat système
    chatWelcome: "Bienvenue sur la ferme ! Appuie sur T pour discuter avec ton équipe.",
    chatToolUp: (name, lvl) => `${name} au niveau ${lvl} !`,
    chatSell: (gain, total) => `Vente : +${gain} or ! Caisse commune : ${total} or`,
    chatNewDay: (day) => `Jour ${day}, bonne journée à la ferme !`,
    chatStormyDay: "Le ciel se couvre... orage et pluie toute la journée, prends un imperméable !",
    chatJoin: (name) => `${name} rejoint la ferme.`,
    chatLeave: (name) => `${name} a quitté la ferme.`,
    // Effets flottants
    fxWood: (n) => `+${n} bois`,
    fxStone: (n) => `+${n} pierre`,
    fxMagicOre: (n) => `+${n} éclat${n > 1 ? "s" : ""} de comète`,
    fxHarvest: (name, n) => `+${n || 1} ${name.toLowerCase()}`,
    fxGold: (n) => `+${n} or`,
    fxEat: "Miam !",
    chatSend: "Message… (Entrée pour envoyer)",
    hireLabel: "Engager",
    gregRowTitle: (cost) => `🧑‍🌾 Engager Greg : ${cost} or`,
    gregRowSub: "Employé de champs — arrose tout automatiquement toutes les 10h, et exécute tes ordres de labour/plantation.",
    gregNotHiredSub: "Contrat de 2 jours",
    gregHiredUntil: (h) => `Employé — encore ${h}h de contrat`,
    gregOrderBtn: "Donner un ordre",
    gregOrderTitle: "Ordonner à Greg de labourer, planter puis arroser",
    gregOrderCountLabel: "Nombre de graines",
    gregOrderCost: (n) => `Coût : ${n} or`,
    gregOrderHint: "Greg labourera intelligemment autour de l'endroit où tu te trouveras quand tu lanceras l'ordre : il complète en priorité les cases déjà semées de la même espèce, puis sème sur de nouvelles cases (jusqu'à 5 graines chacune), jusqu'à épuiser les graines demandées.",
    gregOrderArmBtn: "Choisir cet ordre",
    gregOrderFab: "📍 Lancer Greg ici",
    gregOrderCancel: "Annuler l'ordre",
    /* ======================================================================
       ZIP 404 — GREG PLANTE LES VERGERS, ET LES ABAT SUR SÉLECTION.
       ====================================================================== */
    gregOrderSaplingTitle: "Plants de verger",
    gregOrderSaplingHint: (max) => `Greg pose un plant par case libre, serrés autour de l'endroit où tu lanceras l'ordre. Il n'y a pas de labour ni d'arrosage : un verger n'en a pas besoin. La ferme n'accepte que ${max} vergers en tout — il s'arrête net au plafond et te le dit.`,
    gregOrderSaplingCountLabel: "Nombre de plants",
    gregOrderSaplingRoom: (n) => `Places restantes sur la ferme : ${n}`,
    /* ⚠️ ABATTRE EST IRRÉVERSIBLE : des heures de pousse et jusqu'à 1 400 or.
       D'où la sélection au clic voulue par Guillaume plutôt qu'un ordre à
       l'aveugle — on désigne, on compte, on relit, PUIS on valide. */
    gregOrderChopBtn: "🪓 Marquer des vergers à abattre",
    gregChopArmHint: "Clique les vergers à abattre. Reclique pour retirer une marque.",
    gregChopCount: (n) => `${n} verger${n > 1 ? "s" : ""} marqué${n > 1 ? "s" : ""}`,
    gregChopFab: "🪓 Envoyer Greg abattre",
    gregChopNone: "Ce n'est pas un de tes vergers.",
    toastGregChopDone: (n) => `🪓 Greg s'y met : ${n} verger${n > 1 ? "s" : ""} à abattre.`,
    toastGregNoOrchardRoom: "La ferme a déjà tout son verger — Greg n'a plus où planter !",
    toastGregNotHired: "Greg n'est pas (ou plus) engagé !",
    toastGregBusy: "Greg finit déjà une commande, attends qu'il ait terminé !",
    toastGregNoRoom: "Greg ne trouve plus de place libre pour ça !",
    toastGregNoFertilizer: "Plus d'engrais en stock !",
    gregCoffeeBtn: "☕ Café (SuperGreg)",
    toastGregCoffeeCooldown: "Greg doit encore récupérer avant un nouveau café !",
    toastNoCoffee: "Plus de café d'Éthiopie en stock !",
    soanRowTitle: (cost) => `🎣 Engager Soan : ${cost} or`,
    soanRowSub: "Employé pêcheur — pêche à la rivière sur ton ordre, peut y rester toute la journée.",
    soanNotHiredSub: "Contrat de 24h",
    soanHiredUntil: (h) => `Employé — encore ${h}h de contrat`,
    soanOrderBtn: "Envoyer pêcher",
    soanRecallBtn: "Rappeler",
    soanStatusRoam: "Se balade, en attente d'ordre",
    soanStatusToRiver: "En route vers la rivière",
    soanStatusFishing: "Pêche à la rivière",
    soanStatusBreak: "En pause, il se balade",
    toastSoanNotHired: "Soan n'est pas (ou plus) engagé !",
    toastSoanNoRiver: "Soan ne trouve pas de rivière accessible !",
    soanCoffeeBtn: "☕ Café (SuperSoan)",
    toastSoanCoffeeCooldown: "Soan doit encore récupérer avant un nouveau café !",
    // Chantier 2026-07 (demande Guillaume) : René (apiculteur) fonctionne
    // désormais comme Soan — blocs de travail actif puis pause, envoyé par un
    // bouton (miroir soanOrder/soanRecall).
    beekeeperOrderBtn: "Envoyer récolter",
    beekeeperRecallBtn: "Rappeler",
    beekeeperStatusWorking: "Récolte le miel à la ruche",
    beekeeperStatusBreak: "En pause, il se balade",
    beekeeperStatusIdle: "En attente d'ordre",
    toastBeekeeperNoHive: "La ruche n'est pas encore construite !",
    toastBeekeeperBusy: "René est déjà à la récolte !",
    beekeeperBreakChat: (name) => `${name} fait une pause.`,
    // Zip suivant (demande Guillaume) : "SuperRené" — un café le fait travailler
    // en continu (aucune pause) et récolter le miel bien plus vite pendant 5h.
    reneCoffeeBtn: "☕ Café (SuperRené)",
    toastReneCoffeeCooldown: "René doit encore récupérer avant un nouveau café !",
    // Chantier "Super Tristan" (2026-07, effet café comique) : 20 cafés d'un
    // coup, façon "SuperGreg" (pas de jauge à cafés multiples comme René).
    tristanCoffeeBtn: "☕ Café ×20 (SuperTristan)",
    toastTristanCoffeeCooldown: "Tristan doit encore récupérer avant un nouveau café !",
    toastTristanNotHere: "Tristan n'a pas encore emménagé !",
    // Menu "Employés actifs" (chantier 2026-07, demande Guillaume) : liste
    // les employés sous contrat, avec accès direct à leurs ordres.
    employeesTitle: "👥 Employés actifs",
    employeesHint: "Les employés sous contrat en ce moment, avec un accès direct pour leur donner un ordre.",
    employeesGregName: "Greg",
    employeesSoanName: "Soan",
    fertilizerShopLabel: "Engrais",
    fertilizerShopBuy: (cost) => `Acheter (${cost} or)`,
    fertilizerShopStock: (n) => `Stock : ${n}`,
    fertilizerOrderBtn: "Épandre de l'engrais",
    fertilizerOrderTitle: "Ordonner à Greg d'épandre de l'engrais",
    fertilizerOrderCost: "Coût : 1 engrais (zone 5x5)",
    fertilizerOrderHint: "Greg accélère la pousse de toutes les cultures déjà plantées dans un carré de 5x5 cases autour de l'endroit où tu te trouveras quand tu lanceras l'ordre.",
    fertilizerOrderArmBtn: "Choisir cet ordre",
    fertilizerOrderAvailable: (n) => `Engrais disponible : ${n}`,
    // --- Zip 235 ---
    berryLabel: "Baies",
    /* ⚠️ ZIP 404 — DEUX CHOSES S'APPELAIENT « FRUIT », ET C'EST PROBABLEMENT
       LA VRAIE CAUSE DE LA QUESTION DE GUILLAUME (« je ne sais pas pourquoi
       les fruits apparaissent dans le bag »). Ici, la pomme ramassée sur un
       arbre de la forêt : 18 or, vendue au bac. Plus bas, `binFruitsTitle` :
       les citrons, fraises, framboises et myrtilles des vergers, 70 à 110 or.
       Deux stocks, deux prix, un seul mot à l'écran — et maintenant que les
       deux se vendent au MÊME endroit, le même mot deviendrait illisible. */
    fruitLabel: "Pommes des bois",
    perPiece: (p) => `${p} or / pièce`,
    toastBerriesPicked: (n) => `🫐 +${n} baie(s)`,
    toastFruitPicked: (n) => `🍎 +${n} pomme(s) des bois`,
    toastFruitCooldown: "L'arbre a déjà été cueilli aujourd'hui.",
    passageWorldToast: (name) => `🌀 Cette semaine, le passage mène à : ${name}.`,
    // --- Zip 392 : menu développeur (Cmd/Ctrl+Shift+X, hôte uniquement) ---
    /* ======================================================================
       ZIP 398 — VERGERS, FRUITS, BARQUETTES, PRODUITS, NOM DES FAMILIERS.
       ====================================================================== */
    orchardTip: (nom) => `${nom} — clique sur une case d'herbe ou de terre pour le planter. Il restera.`,
    orchardShopTitle: "Plants de verger",
    /* ⚠️ ZIP 404 — LE NUMÉRO DE TOUCHE N'EST PLUS ÉCRIT DANS LE TEXTE, IL EST
       PASSÉ EN PARAMÈTRE. Le 401 avait corrigé « touche 8 » en « touche 6 », le
       403 a dû recorriger « touche 6 » en « touche 4 », et le contrôle
       généralisé du 403 interdit désormais tout numéro qui ne soit pas celui de
       la construction — ce qui rendait cette phrase-ci impossible à écrire
       juste. La vraie leçon des trois : UN TEXTE QUI CONTIENT UN NUMÉRO DE
       TOUCHE EST UN TEXTE QUI PÉRIME. Celui-ci reçoit le sien de `SLOT_ORDER`,
       donc il ne peut plus mentir, et il n'y a plus rien à recorriger au
       prochain réordonnancement de la barre. */
    orchardShopHint: (touche) => `On les plante une fois. Ils demeurent, et donnent des fruits à chaque saison — sans jamais replanter. Choisis-les dans la case Graines (touche ${touche}), puis clique une case d'herbe ou de terre.`,
    orchardRowSub: (mature, cycle, min, max, fruit, saisons) =>
      `Mûr en ${mature} h · ${min}–${max} ${fruit.toLowerCase()}s toutes les ${cycle} h · ${saisons}`,
    orchardOwned: (n) => `En réserve : ${n}`,
    seasonName: (k) => ({ spring: "printemps", summer: "été", autumn: "automne", winter: "hiver" }[k] || k),
    toastOrchardBusy: "Cette case est déjà occupée.",
    toastOrchardGround: "Il faut de la terre ou de l'herbe pour planter un verger.",
    toastOrchardMax: "La ferme a déjà tout son verger.",
    toastOrchardNoSapling: "Tu n'as pas ce plant dans ta réserve.",
    toastOrchardYoung: "Ce plant est encore trop jeune.",
    toastOrchardNotReady: "Rien à cueillir pour le moment — il refait ses fruits.",
    toastOrchardOffSeason: "Ce n'est pas la saison de ce fruit.",
    toastFruitsPicked: (n, fruit) => `🧺 ${n} ${fruit.toLowerCase()}${n > 1 ? "s" : ""} ! L'arbre reste.`,
    /* ZIP 404 — les fruits de verger descendent AU BAC, avec les cultures, les
       poissons et les baies. Guillaume : « je ne sais pas pourquoi les fruits
       apparaissent dans le bag... » — il a raison, c'était une incohérence et
       pas un choix. Le sac garde ce qu'on FABRIQUE (confitures, yaourts,
       tarte), parce qu'un atelier n'est pas un stock. */
    binFruitsTitle: "Fruits de verger",
    binNoFruits: "Aucun fruit de verger. Plante un verger : il donnera sans qu'on replante.",
    seedMenuOrchardTitle: "Plants de verger",
    fruitRowSub: (unit, taille, prix) => `${unit} or l'unité · barquette de ${taille} : ${prix} or (+25 %)`,
    sellOneBtn: (or) => `Vendre ${or}`,
    sellPunnetBtn: (or) => `Barquette ${or}`,
    punnetShort: "Il n'y a pas de quoi remplir une barquette.",
    toastPunnetShort: "Il n'y a pas de quoi remplir une barquette.",
    fruitSoldChat: (qui, fruit, or) => `${qui} a vendu ${fruit.toLowerCase()} (+${or} or).`,
    punnetSoldChat: (qui, fruit, or) => `${qui} a vendu une barquette de ${fruit.toLowerCase()}s (+${or} or).`,
    bagProductsTitle: "Produits aux fruits",
    productRowSub: (nf, fruit, autres, or) =>
      `${nf} ${fruit.toLowerCase()}${nf > 1 ? "s" : ""}${autres ? " + " + autres : ""} → ${or} or`,
    ingSugar: (n) => `${n} sucre`,
    ingFlour: (n) => `${n} farine`,
    ingMilk: (n) => `${n} lait`,
    ingEgg: (n) => `${n} œuf`,
    productMakeBtn: "Préparer",
    productLack: (quoi) => ({ fruit: "Pas assez de fruits", sugar: "Pas de sucre", flour: "Pas de farine", milk: "Pas de lait", egg: "Pas d'œufs" }[quoi] || "Il manque un ingrédient"),
    toastProductNoFruit: "Pas assez de fruits pour cette recette.",
    toastProductNoSugar: "La ferme n'a pas assez de sucre.",
    toastProductNoFlour: "La ferme n'a pas assez de farine.",
    toastProductNoMilk: "Il te faut du lait.",
    toastProductNoEgg: "Il te faut des œufs.",
    toastProductMade: (nom) => `🍯 ${nom} !`,
    productSoldChat: (qui, nom, or) => `${qui} a vendu ${nom.toLowerCase()} (+${or} or).`,
    bagNameBtn: "Nommer",
    bagRenameBtn: "Renommer",
    petNameTitle: "Nommer ce compagnon",
    petNameHint: (max) => `Jusqu'à ${max} caractères. Laisse vide pour revenir à son nom d'espèce.`,
    petNameConfirm: "Donner ce nom",
    petNameClear: "Effacer le nom",
    petNamedToast: (nom) => `🐾 Il s'appelle ${nom}.`,
    devMenuTitle: "🛠️ Menu développeur",
    /* ZIP 398 — le menu s'ouvre pour tous : un forçage de terre change le
       monde de TOUT LE MONDE, et le bandeau permanent du 392 ne dit pas QUI
       l'a changé. Sans ces deux lignes de chat, un joueur voit la terre
       basculer sans explication et croit à un bug de rotation. */
    devWorldChat: (qui, terre) => `${qui} a forcé le passage vers ${terre}.`,
    devRotationChat: (qui) => `${qui} a rétabli la rotation normale du passage.`,
    devMenuHint: "Ouvert à tout joueur qui connaît le raccourci — le secret, c'est le raccourci. Les changements de monde sont arbitrés par l'hôte et visibles par tous.",
    devWorldSection: "Terre du passage",
    devWorldNatural: (name, day) => `Sans forçage, le passage mènerait aujourd'hui (jour ${day}) à : ${name}.`,
    devDestRun: "Pont : le défi de fuite",
    devDestCandy: "Pont : le Gourmandin",
    devDestNone: "Pont : sans destination pour l'instant",
    devForceBtn: "Forcer",
    devRotationTitle: "Retour à la rotation prévue",
    devRotationSub: (d) => `Le passage suit à nouveau le jour de jeu, ${d} jours par terre.`,
    devRotationBtn: "Rétablir",
    // --- Zip 392 : panneau de notifications repliable ---
    notifPanelLabel: (n) => n > 1 ? `${n} notifications. Survole pour les voir, clique pour les garder ouvertes.` : "1 notification. Survole pour la voir, clique pour la garder ouverte.",
    devHealSection: "Blessure",
    devHealTitle: "Se soigner instantanément",
    devHealNone: "Tu n'es pas blessé.",
    devHealRemaining: (mn) => mn > 1 ? `Repos forcé : encore ${mn} minutes.` : "Repos forcé : moins d'une minute.",
    devHealBtn: "Me soigner",
    devHealToast: "🛠️ Blessure soignée.",
    devTeleportSection: "Se téléporter",
    devTeleportHint: "Ne déplace que toi. Les autres joueurs restent où ils sont.",
    devTeleportName: (k) => ({
      farm: "🏠 La ferme",
      passage: "🌑 Devant le passage",
      town: "🚉 Valley Town — la gare",
      townPlaza: "⛲ Valley Town — la place",           // zip 425
      townCourt: "⚖️ Valley Town — le tribunal",
      townHall: "🏛️ Valley Town — l'hôtel de ville (perron)",
      townBelvedere: "🔭 Valley Town — le belvédère",
      townBoutique: "👗 Valley Town — la Haute-Ville",   // zip 427
      townMarket: "🎪 Valley Town — le champ de foire",   // zip 426
      townLake: "🏞️ Valley Town — le fleuve et le ponton",
      townPasse: "⛵ Valley Town — la passe (sortie vers la mer)",
      townCrater: "☄️ Valley Town — le cratère",   // 446 : on ne refait pas un décor qu'on met une minute à atteindre
      court: "⚖️ Tribunal — le hall",
      courtUpper: "🗂️ Tribunal — l'étage",
      courtBasement: "🔒 Tribunal — le sous-sol",
      hall: "🏛️ Mairie — le hall",                     // zip 442 (le bâtiment est ouvert depuis le 438)
      hallUpper: "📜 Mairie — l'étage",
      church: "⛪ Église — la nef",                      // zip 442 (ouverte au 441)
      churchLoft: "🎹 Église — la tribune d'orgue",
      /* ⚠️ ZIP 444 — LE BEFFROI. Sans cette ligne, le bouton s'affichait
         « churchTower » : le `|| k` de repli ne PLANTE pas, il montre la clé. Un
         libellé manquant est donc invisible à la relecture et parfaitement
         visible à l'écran — vu en jouant, comme il se doit. */
      churchTower: "🔔 Église — le beffroi",
      world: "🌀 La terre en cours",
      bridge: "🌉 Le pied du pont",
    }[k] || k),
    devWorldForcedToast: (name) => `🛠️ Le passage mène maintenant à : ${name}.`,
    devWorldRotationToast: "🛠️ Rotation rétablie : le passage suit de nouveau le jour de jeu.",
    devTeleportToast: (name) => `🛠️ Téléportation : ${name}.`,
    devBanner: (name) => `Terre forcée : ${name}`,
    devBannerTitle: "Le passage est forcé par le menu développeur. N'importe quel joueur peut rétablir la rotation avec Cmd/Ctrl+Shift+X.",
    passageLootToast: (gold) => `✨ +${gold} or !`,
    passagePetToast: (name) => `🐾 Vous avez apprivoisé un(e) ${name} !`,
    mazePrizeToast: (gold) => `🏆 Prix du labyrinthe : +${gold} or !`,
    candySpeedToast: "🍬 Bonbon vitesse : +50 % pendant 1 min !",
    sleepInHouseToast: "🛏️ Bonne nuit à Valley Town.",
    townHouseStyleChangeBtn: (n) => `Style de façade : ${n} / 10 (R pour changer)`,
    meetAtHallBtn: "Rejoindre à la mairie",
    seasonRotate: (name) => `🌦️ Nouvelle saison : ${name}.`,
    // --- Zip 236 : sac personnel ---
    bagBtn: "Sac",
    bagTitle: "Mon sac",
    bagPetsTitle: (n, max) => `Compagnons (${n} / ${max})`,
    bagNoPets: "Aucun compagnon pour l'instant. Attrape-en un dans le passage sombre !",
    bagDecorTitle: "Décorations",
    bagNoDecor: "Aucune décoration. Les visiteurs en offrent après un deal.",
    bagDecorHint: "Équipe l'outil main (8) pour les poser à la ferme ou en ville.",
    bagReleaseBtn: "Relâcher",
    bagReleasedToast: (name) => `👋 ${name} retourne à la vie sauvage.`,
    bagPetsFull: (max) => `Sac plein (${max} compagnons). Relâches-en un pour en attraper un autre.`,
    // Zip 368 : sac (C.MAX_PETS) et balade (C.MAX_PETS_WALKING) sont deux
    // plafonds distincts — un compagnon rangé reste à toi, il ne te suit plus.
    bagPetsWalkingLine: (n, max) => `En balade : ${n} / ${max}. Les autres t'attendent dans le sac.`,
    bagPetWalking: "En balade",
    bagPetStowed: "Dans le sac",
    bagWalkBtn: "Sortir",
    bagStowBtn: "Ranger",
    bagWalkFull: (max) => `Déjà ${max} compagnons en balade. Ranges-en un pour en sortir un autre.`,
    bagHealTitle: "Soins",
    bagSalveRow: (n) => `Baume d'immunité × ${n}`,
    bagSalveSub: "À utiliser avant d'entrer dans le passage sombre.",
    bagHealKitRow: (n) => `Pansements × ${n}`,
    bagHealKitSub: "Pour soigner un autre joueur blessé.",
    bagEnergyTitle: "Énergie",
    bagEnergyRow: (e, max) => `${e} / ${max}`,
    bagSleepHint: "Dors chez toi (ferme ou Valley Town, touche E) pour recharger sans acheter de snacks.",
    petCaughtToast: (name) => `🐾 ${name} rejoint ton sac !`,
    // --- Zip 237 : troc + pets communs ---
    giftUseful: (n, item) => `${n} ${item}`,
    swapTitle: (name) => `${name} propose un troc`,
    swapWantLabel: "Il/elle veut :",
    swapGiveLabel: "En échange :",
    swapAcceptBtn: "Troquer",
    swapNotEnough: "Tu n'as pas assez de marchandise pour ce troc.",
    swapDone: (name, give) => `Troc conclu avec ${name} : tu reçois ${give} !`,
    notifSwap: "propose un troc",
    swapPocket: (have, n) => `${have} / ${n} en poche`,
    /* ---- Zip 388 : fleurs en pots, vente de décos, familiers vivants ---- */
    // Vente d'une décoration (Guillaume : « sell with confirmation »).
    decorUnitPrice: (or) => `Revente : ${or} or pièce`,
    decorSellOne: "Vendre 1",
    decorSellAll: (n) => `Vendre les ${n}`,
    decorSellTitle: "Vendre une décoration",
    decorSellSub: (nom, n, total) => `Vendre ${n} × ${nom} pour ${total} or ?`,
    decorSellWarn: "Les décorations sont des cadeaux : elles ne se rachètent pas.",
    decorSellConfirm: "Vendre",
    decorSoldToast: (n, nom, or) => `💰 ${n} × ${nom} vendu${n > 1 ? "s" : ""} pour ${or} or.`,
    bagDecorSellHint: (n) => `${n} décoration${n > 1 ? "s" : ""} en sac. Vends celles qui s'accumulent — l'or va à la cagnotte commune.`,
    cancelBtn: "Annuler",
    // Familier proposé par un visiteur.
    petOfferTitle: "Un visiteur t'offre un compagnon",
    petOfferSub: (nom) => `On te propose ${nom}. À toi de voir.`,
    petOfferHint: (rel) => `Seuls les visiteurs devenus des amis (${rel} points d'amitié) confient un animal.`,
    petOfferAccept: "Accepter",
    // Relâcher un familier.
    petReleaseTitle: "Relâcher ce compagnon ?",
    petReleaseSub: (nom) => `${nom} repartira vivre dans la nature.`,
    petReleaseWarn: "C'est définitif : il ne reviendra pas.",
    petReleaseConfirm: "Relâcher",
    // Boutons de balade.
    bagWalkAllBtn: "Tous en balade",
    bagStowAllBtn: "Tous au sac",
    bagWalkFullBtn: (max) => `Déjà ${max} dehors`,
    // Zip 427 — les invites des nouveaux lieux de Valley Town.
    mapTownBoutique: "Maison Garfield",
    mapTownSalon: "Salon",
    devResidentsSection: "Peupler la ferme",
    devResidentsHint: (max) => `Installe des résidents d'un coup (${max} au maximum). Sert à voir vivre Valley Town sans attendre.`,
    devResidentsBtn: (n) => `${n} résidents`,
    devResidentsChat: (who, n) => `🛠️ ${who} a installé des résidents : la ferme en compte ${n}.`,
    devMoneySection: "Argent",
    devMoneyHint: "S'attribuer de l'or pour tester sans devoir le gagner. Arbitré par l'hôte, comme le reste.",
    devMoneyBtn: (n) => `+${n} or`,
    devMoneyChat: (who, n) => `🛠️ ${who} s'est attribué ${n} or.`,
    devBuildSection: "Constructions & cultures",
    devBuildHint: "Termine instantanément tout ce qui est en cours (lampadaires, épouvantails, moulin, chaudron, repousse d'herbe, cultures, production animale). Sert à tester une fonctionnalité sans attendre.",
    devBuildBtn: "Tout terminer",
    devBuildChat: (who, n) => n > 0 ? `🛠️ ${who} a terminé ${n} construction${n > 1 ? "s" : ""}/culture${n > 1 ? "s" : ""} en cours.` : `🛠️ ${who} a cherché des constructions en cours : il n'y en avait aucune.`,
    salonPlate: "OUVERTURE PROCHAINE",
    promptTownBoutique: "E : entrer à la Maison Garfield",
    promptTownBoutiqueShut: "E : Maison Garfield (fermée)",
    promptTownSalon: "E : salon de coiffure (ouverture prochaine)",
    promptTownNews: "E : lire le tableau des nouvelles",
    promptTownBench: "E : s'asseoir",
    promptTownWish: "E : faire un vœu",
    promptTownKiosk: "E : écouter le kiosque",
    promptTownPier: "E : faire des ricochets",
    promptTownView: "E : regarder la vallée",

    /* ═══ ZIP 427 — LA VIE SOCIALE DE VALLEY TOWN ═══
       ⚠️ LES RÉPLIQUES SONT DES TABLEAUX, ET L'INDICE EST DÉRIVÉ D'UNE GRAINE
       PARTAGÉE (le rid + l'heure de début de l'activité, tous deux déjà connus
       des deux clients). Aucune phrase ne voyage sur le réseau — même astuce que
       les rembarrages de Carla à Leo depuis le 376, et pour la même raison : le
       quota. Corollaire : une réplique ne doit JAMAIS dépendre d'un état local
       (l'or du joueur, sa saison), sinon les deux écrans divergent. */
    townActLines: {
      sit: ["On est bien, ici.", "Cinq minutes. Juste cinq minutes.", "Les pieds, à mon âge...", "Il passe du monde, aujourd'hui.", "Je ne bougerai pas d'ici avant midi.", "On voit tout le monde passer, de ce banc."],
      fountain: ["L'eau est fraîche.", "On dit qu'elle exauce les vœux. On dit tant de choses.", "Elle coule depuis plus longtemps que nous tous.", "Petite, on y jetait des sous.", "Ne buvez pas dedans, on vous aura prévenu."],
      kiosk: ["Ils devraient jouer plus souvent.", "Ça me rappelle quelque chose.", "Un jour, je monterai là-dessus.", "Il y avait un orchestre, avant.", "Ça manque de musique, cette ville."],
      stall: ["Trop cher. Comme toujours.", "Vous n'auriez pas plus mûr ?", "Je prends les deux. Non, les trois.", "C'est la saison, pourtant.", "Revenez demain, ce sera meilleur."],
      well: ["Elle est bonne, celle-là.", "Il faudrait la curer, un de ces jours.", "On ne s'en sert plus vraiment.", "Attention, la margelle glisse."],
      grave: ["Salut à toi.", "On pense à vous, vous savez.", "Ça fait un an, déjà.", "Je passe tous les dimanches."],
      pier: ["Ça mord, par là ?", "Le lac est plat comme une assiette.", "J'aime venir ici quand il n'y a personne.", "Vous avez pris une canne au moins ?", "Le ponton grince plus qu'avant."],
      view: ["De là-haut, on voit la ferme.", "Toute la vallée. Rien que pour nous.", "Ça valait la montée.", "Par temps clair, on voit le clocher.", "Ne vous approchez pas trop du bord."],
      window: ["Je n'oserais jamais porter ça.", "Un jour. Un jour.", "Vous avez vu le PRIX ?", "Elle a dû coûter une fortune.", "Regardez, la même en bleu."],
      board: ["Tiens donc.", "Encore une réunion...", "Ah, ça, c'est nouveau.", "Ils changent l'affiche chaque semaine.", "Il y a une annonce pour vous, tiens."],
      statue: ["Il avait plus de cheveux que ça.", "On ne sait même plus qui c'était.", "On devrait la nettoyer.", "Les pigeons ne le respectent pas beaucoup."],
      pray: ["Un peu de calme.", "Merci pour la récolte.", "Chacun sa manière.", "Ça fait du bien, deux minutes."],
      // Zip 428 : les six quartiers rendus vivants (voir E.townSpots).
      shore: ["L'autre rive a l'air plus verte.", "Il y a des jours où je resterais là.", "Ça sent la vase et c'est très bien.", "On dirait que le niveau a baissé.", "Il y avait un bateau, avant."],
      pond: ["Les canards ont doublé cette année.", "L'eau est basse.", "Il paraît qu'il y a des carpes.", "Ne les nourrissez pas trop.", "Un héron vient parfois, le matin."],
      orchard: ["Elles seront mûres dans dix jours.", "Personne ne taille jamais celui-ci.", "Une par personne, c'est la règle.", "Ne prenez pas les vertes.", "Le propriétaire ferme un œil."],
      craft: ["Ça tape fort, là-dedans.", "Il travaille bien, ce garçon.", "J'aurais dû apprendre un métier comme ça.", "Ça fait un boucan, cet atelier.", "Il n'a jamais un jour de repos."],
      fair: ["C'est plus grand que dans mon souvenir.", "On monte les tréteaux jeudi.", "Il faudra revenir un jour de foire.", "Il faudra des bras pour tout monter.", "L'an dernier, il avait plu toute la journée."],
      flowers: ["Qui s'en occupe, au fait ?", "Elles tiennent bien, cette année.", "Ça sent bon jusqu'ici.", "Il paraît que c'est nouveau, cette année.", "Ne les cueillez pas, on vous regarde."],
      stroll: ["Bon.", "Par où, déjà ?", "Il fait bon.", "Encore trois rues.", "Je ne cherche rien de particulier.", "Un peu d'air, ça fait du bien."],
      talk: [],
    },
    // Zip 431 : lignes du dialogue interactif (touche Q, § résident en ville) —
    // séparées de townActLines (bulles ambiantes, hachées et synchronisées) car
    // celles-ci sont tirées au hasard LOCALEMENT, sans contrainte réseau : la
    // fiche n'est vue que par le joueur qui appuie sur Q, rien ne circule.
    townChatGreet: ["Tiens, bonjour !", "Ah, vous voilà.", "Belle journée pour se promener, non ?", "Ça faisait longtemps.", "Vous êtes de la ferme, c'est ça ?", "Qu'est-ce qui vous amène par ici ?", "Content de vous voir.", "On se connaît, je crois."],
    townChatGeneric: ["Rien de neuf par ici.", "La ville n'a pas beaucoup changé.", "Toujours la même routine.", "Vous devriez repasser un jour de marché.", "On fait aller, comme on peut.", "Il ne se passe jamais grand-chose ici, et c'est très bien comme ça."],
    /* Les rencontres. Trois tons, et c'est TOUTE l'architecture sociale : on
       n'a pas besoin d'un moteur de dialogue pour qu'une ville ait l'air
       habitée, on a besoin que deux personnes qui s'aiment ne se parlent pas
       comme deux personnes qui se détestent. */
    townMeetAlly: [
      "Ah, te voilà ! Tu descends aussi ?",
      "Je te cherchais, justement.",
      "On prend un verre avant le train ?",
      "Tiens, garde ça pour toi. Je t'en referai.",
    ],
    townMeetFoe: [
      "Tiens. Toi.",
      "Je passais. Je ne reste pas.",
      "On ne va pas remettre ça ici.",
      "C'est une grande ville. Prends l'autre trottoir.",
    ],
    townMeetNeutral: [
      "Beau temps pour descendre.",
      "Vous aussi, la ferme vous laisse souffler ?",
      "On se voit tous les jours et on ne se parle jamais.",
      "Vous avez vu la nouvelle boutique, là-haut ?",
    ],
    // Les invités : la famille des résidents, en visite.
    townGuestRel: {
      spouse: "conjoint(e)", son: "fils", daughter: "fille", brother: "frère", sister: "sœur",
      grandmother: "grand-mère", grandson: "petit-fils", cousin: "cousin", assistant: "assistant",
    },
    townGuestOf: (rel, who) => `${rel} de ${who}`,
    townGuestLines: [
      "C'est donc ça, Valley Town.",
      "On m'en avait parlé. C'est plus grand que je croyais.",
      "Attends-moi !",
      "Je peux monter les marches ? Dis, je peux ?",
      "Une journée sans traire une vache. Le luxe.",
    ],
    townTripChat: (n) => `🚂 ${n} descend passer un moment à Valley Town.`,
    townTripBackChat: (n) => `🚂 ${n} est rentré(e) de Valley Town.`,
    townTripGuestChat: (n, g) => `🚂 ${n} descend à Valley Town, accompagné(e) de ${g}.`,
    /* Le tableau des nouvelles : c'est lui qui rend l'architecture sociale
       LISIBLE. Sans lui, les affinités restent un fichier de constantes que
       personne ne voit jamais — ce qu'elles étaient jusqu'ici. */
    newsBoardTitle: "Tableau des nouvelles",
    newsBoardSub: "Place de Valley Town",
    newsBoardInTown: "En ville en ce moment",
    newsBoardNobody: "Personne en ville. La place est à vous.",
    newsBoardWith: (g) => `avec ${g}`,
    newsBoardTies: "On en dit quoi",
    newsBoardAlly: (a, b) => `${a} et ${b} sont inséparables.`,
    newsBoardFoe: (a, b) => `${a} et ${b} ne se saluent plus.`,
    newsBoardNoTies: "Rien à signaler. Pour l'instant.",
    newsBoardNotices: "Affiché ce mois-ci",
    newsBoardSalon: "Salon de coiffure : ouverture prochaine, Haute-Ville.",
    newsBoardBoutique: "Maison Garfield : sur rendez-vous, Haute-Ville.",
    newsBoardBoutiqueSoon: "Maison Garfield : local loué. La propriétaire n'a pas encore emménagé.",
    newsBoardCourt: "Tribunal : services en cours d'installation.",
    newsBoardClose: "Fermer",
    // La boutique.
    boutiqueTitle: "Maison Garfield",
    boutiqueSub: "Haute-Ville — sur rendez-vous",
    boutiqueLockedToast: "🔒 Le local est loué, les malles sont dedans, et Carla Garfield vit encore ailleurs. Faites-en une résidente de la vallée et la porte s'ouvrira.",
    boutiqueSlotHat: "Chapeaux",
    boutiqueSlotScarf: "Écharpes",
    boutiqueSlotOutfit: "Tenues",
    boutiqueSlotTint: "Couleurs",
    boutiqueBuy: "Acheter",
    boutiqueWear: "Porter",
    boutiqueWorn: "Porté",
    boutiqueRemove: "Retirer",
    boutiqueOwned: "Acquis",
    boutiqueNoGold: "Pas assez d'or. Carla n'a pas eu l'air surprise.",
    boutiqueBought: (n) => `✨ ${n} — c'est à vous.`,
    boutiqueNothing: "Rien",
    boutiqueGold: (g) => `${g} or`,
    boutiqueClose: "Sortir",
    carlaShopLines: [
      "Enfin quelqu'un qui a compris où était la bonne adresse.",
      "Touchez, touchez. Vous n'abîmerez rien que vous ne puissiez payer.",
      "Ce n'est pas cher : c'est JUSTE.",
      "Non, je ne fais pas de remise. Leo, on ne fait pas de remise.",
      "Vous portez ça mieux que la moitié de mes clientes de la capitale.",
    ],
    leoUpsellLines: [
      "Madame a raison. Madame a toujours raison.",
      "Excellent choix ! Enfin, c'est Madame qui l'a choisi.",
      "Je l'emballe ? Je l'emballe. Je vais l'emballer.",
      "Madame porte le même. En plus beau, évidemment.",
      "C'est une pièce unique. Nous en avons quatorze.",
    ],
    leoRole: "Leo, à la caisse",
    // Le salon.
    salonToast: "💈 Salon de coiffure — ouverture prochaine. Les ciseaux sont déjà là, le coiffeur non.",
    // Les points d'intérêt.
    wishTitle: "Faire un vœu",
    wishToast: (c) => `🪙 Vous jetez ${c} or dans la fontaine.`,
    wishNoGold: (c) => `Il faut ${c} or pour un vœu. La fontaine ne fait pas crédit.`,
    wishCooldown: "La fontaine vous a déjà entendu aujourd'hui. Elle a horreur qu'on insiste.",
    wishBack: (g) => `✨ Une pièce remonte à la surface. Puis une autre. ${g} or.`,
    wishNothing: "✨ Rien ne se passe. C'était probablement le bon vœu, alors.",
    spyglassLines: [
      "🔭 D'ici, la ferme n'est qu'un carré vert avec de la fumée au-dessus. C'est joli.",
      "🔭 On voit le train arriver bien avant de l'entendre.",
      "🔭 Toute la vallée tient dans une seule respiration.",
      "🔭 Quelqu'un a laissé un champ non arrosé. On le voit d'ici.",
    ],
    kioskEmpty: "🎵 Le kiosque est vide. L'acoustique, elle, est excellente.",
    kioskLines: [
      "🎵 Un air démarre. Personne ne sait d'où il vient.",
      "🎵 Quelqu'un tape dans les mains. Puis tout le monde.",
      "🎵 Trois notes, et la place entière ralentit.",
    ],
    pierLines: [
      "🌊 Un ricochet. Deux. Trois. Le lac ne dit rien.",
      "🌊 L'eau est si plate qu'on voit le ciel dedans.",
      "🌊 Un poisson saute. Vous êtes le seul témoin.",
    ],
    benchToast: "🪑 Vous vous asseyez. Le monde continue sans vous, un moment.",
    townSitHint: "E : s'asseoir",
    // Zip 428 : le banc s'utilise vraiment. Le message DIT comment se relever —
    // une action dont on ne connaît pas la sortie est une action qu'on n'ose pas.
    benchSitToast: "🪑 Vous vous asseyez. Une touche de direction pour repartir.",
    benchFullToast: "🪑 Le banc est complet. Il y en a d'autres.",
    // Zip 429 : la boussole. ⚠️ Une distance sans unité ne se lit pas ; « m »
    // (une case = un pas) suffit et n'a rien à réconcilier.
    gpsDistance: (m) => m + " m",
    gpsSet: (m) => "🧭 Destination fixée — " + m + " m. Reclic au même endroit pour annuler.",
    gpsCleared: "🧭 Destination effacée.",
    gpsArrived: "🧭 Vous y êtes.",
    gpsHint: "Clic sur le plan : fixer une destination",
    /* Zip 430 — le marché du champ de foire. ⚠️ Les textes DISENT que le cours
       change chaque jour : un prix variable qu'on ne sait pas variable est un
       prix qui a l'air arbitraire. */
    marketTitle: "Marché du champ de foire",
    marketHint: "Les cours changent chaque jour. C'est le SEUL endroit où l'on écoule sa production — et on n'y paie jamais moins qu'au vieux bac de la ferme.",
    /* Zip 431 — les textes du panier. ⚠️ Ils DISENT le total, pas le prix
       unitaire : la question du joueur devant un marché n'est jamais « combien
       vaut un blé », c'est « combien je repars avec ». */
    marketFamAll: "Tout",
    marketMax: "Max",
    marketNoneInFamily: "Rien de cette famille dans vos réserves.",
    marketCartTotal: (n, or_) => n + (n > 1 ? " articles" : " article") + " · " + or_ + " or",
    marketCartBonus: (b) => "dont +" + b + " or grâce aux cours du jour",
    marketClear: "Vider",
    marketAllMax: "Tout au max",
    marketSellBtn: (or_) => "Vendre · " + or_ + " or",
    marketBuildWarn: "⚠️ Sert aussi à construire (clôtures, murs, chemins).",
    marketJewelryHint: "Prix fixé par son créateur — les cours ne s'y appliquent pas.",
    marketNothing: "Rien à vendre dans ce panier.",
    marketArchSign: "MARCHÉ",
    punnetRowLabel: (nom, n) => "Barquette de " + nom.toLowerCase() + " (×" + n + ")",
    sharedStockHint: "Réserve commune à la ferme.",
    /* ⚠️ Le jeton qui remplace les boutons « Tout vendre » de la ferme. Il dit
       OÙ, pas seulement NON : un refus qui n'indique pas la sortie passe pour
       une panne. */
    marketOnlyTag: "→ Marché de Valley Town",
    marketDayHint: "🎉 JOUR DE MARCHÉ. Les cours sont hauts aujourd'hui, toute la vallée est descendue.",
    marketEmpty: "Vos poches sont vides. Remontez avec quelque chose à vendre.",
    marketFamily: (f) => ({ crop: "Cultures", fish: "Pêche", product: "Ferme", forage: "Cueillette", material: "Matériaux" }[f] || f),
    marketUnitLine: (p, base) => p + " or pièce (bac : " + base + ")",
    marketBonus: (b) => "· +" + b + " par pièce",
    promptTownMarket: "E : vendre au marché",
    touchRun: "Courir (bascule)", touchMap: "Carte", touchAct: "Agir / sauter",
    /* Zip 430 — Carla est plus libre que les autres. ⚠️ Les deux messages
       DISENT la règle : un refus muet et une porte close sans raison passent
       tous les deux pour des bogues. */
    kickRefused: "💅 Carla Garfield n'est employée par personne ici. Elle partira si elle veut.",
    boutiqueClosedToast: (d) => d === 0
      ? "💅 La Maison Garfield ouvre aujourd'hui — Carla n'est pas encore arrivée."
      : "💅 Fermé. Carla ne tient boutique qu'un jour par semaine : rendez-vous dans " + d + " jour" + (d > 1 ? "s" : "") + ".",
    carlaOffDuty: "💅 Carla n'est pas de service aujourd'hui.",
    chatMarketSell: (gain, bonus, money) => "Vendu au marché : " + gain + " or (+" + bonus + " vs le bac). Caisse : " + money + ".",
    /* Zip 431 — ⚠️ CE MESSAGE EST DEVENU LA RÉPONSE À TOUTE VENTE TENTÉE
       DEPUIS LA FERME, pas seulement au marché mal placé. Il doit donc DIRE OÙ
       ALLER : un « impossible ici » sans destination passe pour une panne. */
    toastFarMarket: "🎪 On ne vend qu'au marché du champ de foire, à Valley Town. Prenez le train !",
    toastMarketNothing: "🎪 Votre panier est vide.",
    promptTownStand: "↑ ↓ ← → : se lever  ·  Espace : jeter du pain",
    birdCrumbsToast: "Vous émiettez un quignon. Les pigeons arrivent…",
  },
  en: {
    star: STAR_EN,
    maire: MAIRE_EN,
    /* ⚠️ CÔTÉ ANGLAIS, `maireFor` REND TOUJOURS LA TABLE ANGLAISE : la
       déclinaison féminine n'existe pas encore en anglais, et l'anglais n'en a
       pas le même besoin (« they » n'existe pas dans ces textes, mais « he »
       est le seul pronom écrit). ⚠️ C'est une DETTE, pas une propriété de la
       langue : le jour où `MAIRE_EN` est relu, il lui faut sa surcharge comme
       le français a la sienne. Écrit ici pour que la dette se voie à l'endroit
       où on la contracte. */
    maireFor: (fem) => (fem ? MAIRE_EN : MAIRE_EN),
    maireFem: () => null,          // pas encore de déclinaison anglaise (voir ci-dessus)
    // --- 2026-07 station update (sea creatures, ducks, station, visitors, seasons) ---
    seaCaught: (n) => `Rare catch: ${n}!`,
    seaBite: (n) => `Something unusual bites... ${n}?!`,
    stationName: "Village station",
    promptStation: "E: station ad board",
    adsTitle: "🚉 Ad board",
    adsIntro: "Post what the farm sells to attract visitors by train. Each new ad costs a posting fee (common chest). No prices are listed: visitors surprise us with their offers.",
    adsFee: (c) => `Fee: ${c} gold per new ad`,
    adsSave: "Post the ads",
    adsSaved: (c) => c > 0 ? `Ads posted (${c} gold in fees).` : "Ads updated.",
    adCatCrops: "🌾 Crops & vegetables",
    adCatAnimal: "🥚 Farm products",
    adCatFish: "🐟 Fish & fishing",
    adCatResources: "🪵 Wood & stone",
    adsBlacklistTitle: "🚫 Blacklist",
    adsBlacklistEmpty: "Nobody is banned yet.",
    adsBlacklistHint: "A banned visitor will never ride the train here again.",
    visitorArrived: (n) => `🚂 ${n} is arriving by train!`,
    visitorsArrived: (ns) => `🚂 Visitors are arriving by train: ${ns}!`,
    visitorLeftChat: (n) => `${n} heads back to the station.`,
    promptVisitor: (n) => `Q: talk to ${n}`,
    visitorPanelTitle: (n) => `🧳 ${n}`,
    visitorWantsBuy: (n, q, c, p) => `${n} wants to buy ${q} × ${c} and offers ${p} gold each.`,
    visitorRichBonus: (b) => `Plus a ${b} gold bonus if the deal is done!`,
    visitorWantsChat: (n) => `${n} just came to see the farm and chat.`,
    visitorDemand: (n, g0) => `${n} demands ${g0} gold from the chest, or our crops and gold will pay the price!`,
    visitorUrgent: "URGENT",
    visitorAccept: "Close the deal",
    visitorChatBtn: "Chat",
    visitorPayBtn: (g0) => `Pay ${g0} gold`,
    visitorRefuseBtn: "Refuse",
    visitorBlacklistBtn: "Blacklist this visitor",
    visitorNotEnough: "You don't carry enough of that crop.",
    visitorDealDone: (n, g0) => `Deal closed with ${n}: +${g0} gold to the chest!`,
    visitorChatDone: (n) => `${n} enjoyed the chat. (friendship +1)`,
    visitorPaid: (n, g0) => `${n} pockets ${g0} gold and leaves. What a character...`,
    visitorRelation: (r) => `Friendship: ${r}`,
    visitorStock: (h, n) => `You carry ${h} / ${n} asked.`,
    visitorEasyNote: "Easy order: already in stock, modest price.",
    visitorPrepNote: "An order to prepare: takes longer, pays better.",
    visitorRewardGift: (g) => `On top of the gold, ${g} if the deal is done!`,
    visitorGiftGranted: (n, g) => `🎁 ${n} leaves a gift: ${g}!`,
    visitorGiftQueued: (n, g) => `🎁 ${n} promises a gift: ${g}. It will be delivered as soon as possible!`,
    visitorGiftPromised: (n, g) => `🎁 ${n} promises to send you a gift: ${g}. It will arrive in a few minutes!`, // zip 250
    visitorGiftDelivered: (n, g) => `🎁 The gift promised by ${n} just landed in your bag: ${g}!`, // zip 250
    giftSeed: (s) => `unique seeds (${s})`,
    giftDecor: (d) => `a unique decoration (${d})`,
    giftPet: (pt) => `a pet (${pt})`,
    meetBtn: "Meet me at townhall",
    // ⚠️ ZIP 392: NO LONGER READ ANYWHERE. See the French block for why.
    notifMore: (n) => `+${n} more visitor(s) waiting`,
    visitorChatSaid: (n, l0) => `${n}: ${l0}`,
    visitorChatLines: [
      [
        "Lovely day for a stroll, isn't it?",
        "The train was packed today — your farm is getting famous!",
        "It smells like fresh soil around here. I like it.",
        "Just passing through, but this place is charming.",
      ],
      [
        "Good to see you again! I think about this farm often.",
        "I told the whole train car about your harvests. They were jealous.",
        "You always make my visits worth the ride.",
        "The townhall square is my favourite spot in the valley.",
      ],
      [
        "Between friends, no need to haggle for long!",
        "I always keep room in my bags for you... and sometimes a present.",
        "This farm feels like a second home to me now.",
        "If you ever come by Valley Town, my door is open.",
      ],
    ],
    // Zip 376 : Carla Garfield. Règle de traduction en vigueur depuis le zip
    // 371 — on traduit dans l'ESPRIT. "Comme des sacs à patates" devient
    // "like a sack of potatoes", qui existe tel quel en anglais et garde la
    // même brutalité ; la réplique à Leo sur le carnet garde le contretemps,
    // pas les mots.
    carlaChatLines: [
      [
        "Don't take this the wrong way, but everyone here dresses like a sack of potatoes.",
        "I saw your farm from the train. Mostly I saw what you're wearing.",
        "Good soil, fine animals, and not one garment that holds together. What a waste.",
        "Carla Garfield. Remember the name, you'll need it one day.",
      ],
      [
        "You, at least, listen to me. Which is more than that haircut does.",
        "I'm starting to understand this place. It needs very little, truth be told.",
        "Leo, take a note: the farm has potential. No, not in THAT notebook, the other one!",
        "One day I'll show you what can be done with a silhouette like yours.",
      ],
      [
        "I don't say this to everyone: you could actually carry something good.",
        "I have collections nobody in this valley has ever laid eyes on.",
        "Keep your gemstones. You'll know what to do with them soon enough.",
        "You and I will speak of this again. Leo, we're leaving — the trunks won't carry themselves.",
      ],
    ],
    carlaScoldLines: [
      "Leo. The boxes. STRAIGHT.",
      "Not in the mud, Leo.",
      "You're breathing too loudly, Leo.",
      "Faster, Leo, we haven't got all day.",
    ],
    carlaAssistant: "Accompanied by Leo, her assistant.",
    leoName: "Leo",
    visitorThanks: (n) => `${n} thanks you and strolls around the square a while longer.`,
    visitorHomeChat: (n) => `${n} heads back to the station, happy with the visit.`,
    visitorArrivalGift: (n, g) => `🎁 ${n} came bearing a gift: ${g}!`,
    visitorTotal: (t) => `${t} gold in total`,
    visitorPerUnit: (p) => `${p} gold / unit`,
    visitorPocket: "In your pocket",
    visitorCloseBtn: "Not now",
    visitorChatTitle: "Chat",
    promptTrainRide: "E: ride the train to Valley Town",
    promptTrainBack: "E: ride the train back to the farm",
    trainToTownToast: "🚆 Welcome to Valley Town!",
    trainToFarmToast: "🚆 Back at the farm.",
    promptTownHouse: (n) => `${n}'s house`,
    promptTownHouseSale: "House for sale",
    promptTownSleep: "E: sleep at home",
    promptTownSleepFull: "Your home (not tired)",
    toastYourHouse: "This is your Valley Town house. Interiors are coming soon!",
    toastTheirHouse: (n) => `This is ${n}'s house.`,
    toastHouseSale: "This house is waiting for a new farmer.",
    townSaleSign: "For sale",
    promptTownChurch: "⛪ Valley Town church",     // zip 425 : voir la note côté français
    promptTownHall: "🏛️ Town hall",
    promptTownCourt: "⚖️ Valley Town courthouse",
    promptTownJump: "Space: jump off the ledge",
    promptTaxiBoard: "E: get in the taxi",
    taxiBtn: "Taxi", taxiBtnCall: "Call a taxi", taxiBtnCancel: "Cancel the ride",
    taxiCalled: "🚕 Taxi called — on its way.",
    taxiNoRoad: "You must stand by a paved street to hail a taxi.",
    taxiNotHere: "Taxis only run in Valley Town.",
    taxiUnreachable: "No street the taxi can reach from here.",
    taxiAsk: "Where to?",
    taxiTitle: "Where to?",
    taxiHint: "The taxi drops you at the nearest kerb.",
    taxiCancel: "Cancel",
    taxiArrived: "🚕 Here we are. Have a good one!",
    taxiDropped: "🚕 You step out of the taxi.",
    taxiStop: (k) => ({
      station: "The station", plaza: "The main square", market: "The fairground",
      hall: "The town hall", church: "The church", court: "The courthouse",
      boutique: "Maison Garfield", park: "The park and bandstand",
      lake: "The lake and pier", belvedere: "The belvedere",
      artisans: "The artisan quarter", cemetery: "The cemetery",
    })[k] || k,
    taxiWalk: (n) => n <= 1 ? "right there" : ("≈ " + n + " steps away"),
    // Zip 426 — courthouse interior. Voir la longue note côté français : chaque
    // pièce annonce son service ET son ouverture à venir.
    promptCourtEnter: "E: enter the courthouse",
    promptCourtExit: "E: step back outside",
    promptCourtBoard: "E: read the notice board",
    promptCourtDoor: (n) => `${n} — E: read the plate`,
    promptCourtStairsUp: "Up to the first floor",
    promptCourtStairsDown: "Down to the basement",
    courtFloorName: (k) => ({ ground: "Ground floor", upper: "First floor", basement: "Basement", hall: "Town hall", hallUp: "Town hall — first floor", church: "Church", churchLoft: "Organ loft", churchTower: "Belfry" }[k] || k),   // 444
    // ZIP 441 — the church. See the French block for why none of these promises a service.
    churchEnterToast: "⛪ Valley Town church. Silence, cool stone, and the organ up there.",
    churchExitToast: "⛪ You step back out onto the forecourt.",
    churchSitToast: "🪑 You sit down. Any direction key to get going again.",
    churchCandleToast: "🕯️ You light a candle.",
    churchCandleFull: "🕯️ The rack is full — they will have burned down by tomorrow.",
    churchOrganToast: "🎹 You rest your hands on the keyboards.",
    churchOrganMute: "🎹 You play, but the bellows are silent (the piece is not installed yet).",
    promptChurchStand: "Stand up",
    promptChurchOrgan: "Sit at the organ",
    promptChurchCandle: "Light a candle",
    promptChurchPew: "Sit down",
    promptTownHallEnter: "Enter the town hall",
    promptPriceBoard: "Read the price board",
    hallEnterToast: "🏛️ Valley Town hall.",
    hallExitToast: "🏛️ You step out of the town hall.",
    priceBoardTitle: "📈 Price board",
    priceBoardIntro: "The town crier posts the rates announced for the coming days. They are the same for everyone and will not move — enough to decide what to load onto the train.",
    priceBoardFamily: "Goods",
    priceBoardToday: "Today",
    priceBoardInDays: (k) => k === 1 ? "Tomorrow" : `In ${k} days`,
    priceBoardFooter: "🎪 marks market days, when rates are raised.",
    courtRoomName: (k) => ({
      cadastre: "🗺️ Land registry",
      civil: "💍 Wedding hall",
      prices: "📈 Price hall",
      welcome: "💁 Front desk",
      council: "🏛️ Council chamber",
      mayor: "🎩 Mayor's office",
      cityarch: "🗄️ City archives",
      surveyor: "📐 Surveyor's office",
      courtroom: "⚖️ Courtroom",
      witness: "🪑 Witness room",
      clerk: "📜 Clerk's office",
      robing: "🧥 Robing room",
      reception: "💁 Reception",
      judge: "👩‍⚖️ Judge's chambers",
      jury: "🤝 Jury room",
      library: "📚 Law library",
      landreg: "🗺️ Land registry",
      permits: "📐 Permits office",
      notary: "✒️ Notary's office",
      registry: "💍 Civil registry",
      archives: "🗄️ Archives",
      evidence: "🔖 Evidence room",
      cells: "🔒 Holding cells",
      lostfound: "🧺 Lost & found",
      boiler: "🔥 Boiler room",
    }[k] || k),
    courtRoomDesc: (k) => ({
      cadastre: "The map of Valley Town, plot by plot. This is where the land behind every « for sale » sign will change hands.",
      civil: "Unions, farm names, companion declarations. The room is ready and the chairs are lined up; the ceremony is missing.",
      prices: "The crier's hall. The coming days' rates are chalked on the board — the only counter in town that already works.",
      welcome: "The front desk: you ask your way, and leave with a form.",
      council: "The town council deliberates around the oval table. Nobody sits there yet.",
      mayor: "The mayor's office. The chair faces the window, as if he had just stepped out.",
      cityarch: "The city archives: registers, old land books, communal accounts.",
      surveyor: "The surveyor draws the boundaries and reviews building permits.",
      courtroom: "Disputes between farmers will be settled here: broken promises, damage, fines. The public sits behind the bar.",
      witness: "Where you wait before being called to the stand.",
      clerk: "The clerk will file complaints and issue copies of deeds.",
      robing: "Robes for the judge and the lawyers. Staff only — though the door isn't locked.",
      reception: "The front desk will point visitors to the right office.",
      judge: "The chambers of the Valley Town judge. They haven't taken office yet.",
      jury: "Jurors will withdraw here to deliberate, behind closed doors.",
      library: "The law of the valley, in thirty volumes nobody has read.",
      landreg: "The land registry will sell and record Valley Town plots — every \"for sale\" sign is waiting on this desk.",
      permits: "Building permits: barns, bridges, wells, house upgrades.",
      notary: "Contracts between players: guaranteed trades, escrow, plot sales.",
      registry: "Civil records: farm name, unions, registering your pets.",
      archives: "Your farm's whole history, day by day, will be readable here.",
      evidence: "Seized items sleep here under seal.",
      cells: "Three cells for whoever the court convicts.",
      lostfound: "Whatever you drop along the way will end up here — reclaimable for a small fee.",
      boiler: "The building's boiler. Nothing to do, everything to hear.",
    }[k] || ""),
    courtSoon: "⏳ Service opening soon",
    courtBoardTitle: "⚖️ Valley Town courthouse",
    courtBoardIntro: "The building is open to visitors: all three floors can be walked freely. The services open soon — here is what will sit behind each door.",
    courtBoardFooter: "No desk is open yet. Fitting-out continues from one update to the next.",
    courtEnterToast: "⚖️ Valley Town courthouse — free to visit, services coming soon.",
    courtExitToast: "⚖️ You step back outside.",
    courtRoomToast: (n) => `${n} — opening soon.`,
    courtRoomToastLive: (n) => `${n} — open.`,
    /* ═══ ZIP 439 — front desk, elections, registers ═════════════════════ */
    hallClerkName: "Léonie Sarrazin",
    hallClerkRole: "front desk",
    promptHallClerk: "Talk to the front desk",
    promptMayorDoor: "E: enter the Mayor's office",
    hallClerkHello: "Good morning! What can I do for you?",
    hallClerkAgain: "Anything else?",
    hallClerkClose: "Thank you, goodbye",
    hallTopicAsk: (k) => ({
      mayor: "I would like to meet the mayor.",
      election: "How are the elections going?",
      registry: "May I see the registers?",
      prices: "I am here about the market rates.",
      where: "Where do I find a given service?",
      wedding: "I would like to get married.",
      land: "I would like to buy a plot.",
      ballot: "I am here to vote.",
      fonds: "What is the market hall fund?",
      engineer: "Do you know anyone who draws boats?",
    }[k] || k),
    hallTopicTitle: (k) => ({
      mayor: "🎩 Meeting the mayor",
      election: "🗳️ Town elections",
      registry: "📇 Town registers",
      wedding: "💍 Weddings",
      land: "🗺️ Land registry",
      ballot: "🗳️ The ballot",
      fonds: "📜 The market hall fund",
      engineer: "📐 The naval architect",
    }[k] || k),
    hallMayorNow: (e, n) => `The sitting mayor is ${e} ${n}.`,
    hallMayorAudience: (d, k) => k === 0
      ? "He receives TODAY, in his office upstairs."
      : k === 1 ? `He receives tomorrow (day ${d}), in his office upstairs.`
      : `He receives in ${k} days (day ${d}), in his office upstairs.`,
    hallMayorHint: "Take the main staircase: his office is at the far end, on the left. Knock before you enter.",
    hallElecNext: (d, k) => k === 0
      ? "The ballot is held TODAY. The count is shown below."
      : `Next ballot in ${k} day(s), on day ${d}.`,
    hallElecTerm: (t) => `Term no. ${t}`,
    hallElecVotes: "votes",
    hallElecMine: (n) => `including ${n} from your residents`,
    hallElecNoResidents: "None of your residents has taken part yet — they vote as soon as they settle on the farm.",
    hallElecFooter: "The five candidates stand again at every term. The town has several hundred voters: your residents count, they do not decide.",
    hallRegistryTitle: "📇 Register of inhabitants",
    hallRegistryIntro: "The civil registry keeps the list of those living on the farm. It is used for summons, banns and electoral rolls.",
    hallRegistryEmpty: "The register is empty: nobody has settled on your farm yet.",
    hallRegistryCount: (n) => `${n} inhabitant(s) on the roll.`,
    hallRegistryVote: (e, n) => `voted ${e} ${n}`,
    hallFondsIntro: "It's what guarantees nobody ever sells in town for less than at their own farm. Nobody here knows what feeds it — the services were never able to establish where the revenue comes from, and the town is about to close it for want of a known holder.",
    hallFondsWhere: "The notice is up on the news board, on the square. Go and read it; you'll know as much as I do.",
    hallSoonWedding: "The banns are ready and the room is set — the registrar is missing. Come back next update: the wedding room is the second door on the left.",
    hallSoonLand: "The plan is posted at the land registry, first door on the left. The sale itself goes through the courthouse notary: you choose here, you sign there.",
    candName: (k) => ({
      vasseur: "Odile Vasseur", lantier: "Marceau Lantier", bonnefoy: "Séverine Bonnefoy",
      delaunay: "Ninon Delaunay", toussaint: "Basile Toussaint",
    }[k] || k),
    candPlatform: (k) => ({
      vasseur: "water and fields",
      lantier: "bridges and paths",
      bonnefoy: "order and accounts",
      delaunay: "the lake and the park",
      toussaint: "schools and archives",
    }[k] || ""),
    hallBoardTitle: "🏛️ Valley Town hall",
    hallBoardIntro: "The town services, floor by floor. The front desk answers on the ground floor, to your right as you come in.",
    hallBoardFooter: "The rates room and the front desk are open. The other counters are being fitted out from one update to the next.",
    courtOpenNow: "✅ Desk open",
    cropTipReady: "ready!",
    cropTipWater: "needs water",
    adsGiftsTitle: "🎁 Promised gifts",
    adsGiftsEmpty: "No gift pending.",
    adsGiftRow: (g, n) => `${g} (promised by ${n})`,
    hostileDamageChat: (n, g0, cr) => `⚠️ ${n} struck: ${g0} gold stolen, ${cr} crop(s) ruined! Gather up to repair!`,
    repairTitle: "🛠️ Repair the damage",
    repairIntro: (n) => `${n} wrecked the farm! Click when the cursor is in the green zone. Every player who succeeds brings full repair closer.`,
    repairHits: (h, t) => `Hits: ${h} / ${t}`,
    repairWin: "Well done! Your share of the repair is complete.",
    repairFail: "Missed... try again while the window is still open.",
    repairProgress: (w0, n0) => `Repair: ${w0} / ${n0} player(s). Almost there!`,
    repairDoneChat: (g0, cr) => `✅ Damage repaired together: ${g0} gold recovered, ${cr} crop(s) replanted!`,
    repairExpired: "The repair window has closed... the damage is permanent.",
    stayTitle: (n) => `🏠 ${n} wants to move in!`,
    stayProposal: (n, j) => `${n} proposes to live on the farm and contribute: "${j}". The vote must be unanimous. On a split vote, a dice roll decides.`,
    voteYes: "✅ For",
    voteNo: "❌ Against",
    voteWaiting: "Vote recorded, waiting for the other players...",
    voteStayChat: (n) => `🎉 Unanimous vote: ${n} is moving in!`,
    residentStarted: (n, job) => `${n} moves into one of the houses for sale and gets to work: ${job}.`,
    // Zip 252: artisans / workshops / products.
    residentMovedIn: (n, job) => `🏡 ${n} moved onto the farm and will ${job}.`,
    residentNoRoom: "No free house left to take in a resident.",
    artisanNoResident: "You first need the matching artisan living with you.",
    // Zip 302: hot air balloon (tourist attraction).
    balloonTitle: "🎈 Hot Air Balloon",
    balloonPilotLabel: "Pilot",
    balloonNoPilot: "No pilot assigned — the business is on hold.",
    balloonPilotAssigned: (n) => `🎈 ${n} takes the controls of the balloon.`,
    balloonPilotRemoved: "🎈 Nobody is piloting the balloon for now.",
    balloonAssignBtn: "Assign as pilot",
    balloonUnassignBtn: "Remove from duty",
    balloonPhaseIdle: (t) => `Next flight: ${t}`,
    balloonPhaseBoarding: (n, cap) => `Boarding now — ${n}/${cap} seats taken`,
    balloonPhaseFlying: "Flying over the farm right now...",
    balloonBoarding: (pilot) => `🎈 ${pilot} readies the balloon — boarding is open!`,
    balloonDeparted: (n, cap) => n > 0 ? `🎈 Takeoff! ${n}/${cap} passengers aboard.` : "🎈 The balloon takes off, empty this time.",
    balloonLanded: (n) => n > 0 ? `🎈 Smooth landing, ${n} happy passenger${n > 1 ? "s" : ""}!` : "🎈 The balloon has landed.",
    balloonTicketSold: (name, n, cap) => `🎫 ${name} climbs aboard (${n}/${cap}).`,
    balloonBuyBtn: (price) => `Book a ride — €${price}`,
    balloonBuyForMeBtn: (price) => `Climb aboard (€${price})`,
    balloonBuyForResidentBtn: (name, price) => `Send ${name} (€${price})`,
    balloonSoldToday: (n) => `${n} ticket${n > 1 ? "s" : ""} sold today`,
    toastBalloonNotBoarding: "Boarding isn't open right now.",
    toastBalloonFull: "The basket is full (4 seats)!",
    artisanBuilt: (b) => `🔨 ${b} built! The artisan can start producing.`,
    buildingName: (bid) => ({ beehive: "Beehive", fromagerie: "Cheese dairy", bakery: "Bakery", sawmill: "Sawmill", sucrerie: "Sugar mill" }[bid] || bid),
    craftName: (item) => ({ honey: "Honey jar", cheeseWheel: "Cheese wheel", cheesePortion: "Cheese portion", eclairChoco: "Chocolate eclair", eclairVanilla: "Vanilla eclair", flanVanilla: "Madagascar vanilla flan", gateauBasque: "Basque cake", butter: "Butter block", bread: "Bread", croissant: "Croissant", chocolatine: "Pain au chocolat", painSuisse: "Pain suisse", yogurtNature: "Plain yogurt", yogurtVanilla: "Vanilla yogurt" }[item] || item),
    craftSold: (name, n, gain) => `Sold: ${n} × ${name} (+${gain} gold)! Common pot topped up.`,
    cheeseCut: (w, p) => `🧀 Cut ${w} wheel(s) into ${p} portions.`,
    promptResident: (n) => `Q — talk to ${n}`,
    recruitAsk: "Ask to move in",
    residentGreet: (n, job) => `Hi! I'm ${n}. My trade is: ${job}.`,
    // Zip 262: skilled visitors introduce their trade explicitly.
    skillLabel: (sk) => ({ beekeeper: "beekeeper", cheesemaker: "cheesemaker", baker: "pastry chef", breadmaker: "baker", lumberjack: "lumberjack", voyager: "traveling merchant" }[sk] || sk),
    skillPitch: (sk, n) => ({
      beekeeper: `Hi! I'm ${n}, I'm a beekeeper and I'd like to help you keep bees and jar honey.`,
      cheesemaker: `Hi! I'm ${n}, I'm a cheesemaker and I'd like to help you turn your milk into fine cheese.`,
      baker: `Hi! I'm ${n}, I'm the pastry chef and I'd like to help you bake pastries and cakes.`,
      breadmaker: `${n}. Baker. I make the bread and the viennoiseries. If you've got butter, good; otherwise it's plain bread.`,
      lumberjack: `Hi! I'm ${n}, I'm a lumberjack and I'd like to help you fell trees and break rocks.`,
      voyager: `Hi! I'm ${n}, I'm a traveling merchant and I'd like to sail the world to bring you rare goods.`,
      // Jérôme Martial's bio: introduces himself by his nickname, explains he
      // left Martinique to find work elsewhere and support his family back
      // home, and is proud to bring his sugar-making know-how to the farm.
      sugarworker: `Bel bonjou! You can call me Ti Jérôme. I'm from Martinique — I had to leave to find work elsewhere and support my family back home. Today I'm proud to be part of the farm and bring my sugar-making know-how.`,
    }[sk] || `Hi! I'm ${n}.`),
    // Zip 299: short activity-related line shown in a bubble above an artisan
    // when the player walks up to them.
    skillTalk: {
      beekeeper: ["The bees are in a good mood today!", "A few more jars and the honey's ready.", "Shh… don't spook my bees.", "The honey flows well this season."],
      cheesemaker: ["This wheel needs to age a little more.", "Bring me milk and I'll work wonders!", "Smell this wheel — pure delight.", "The cellar's at just the right temperature."],
      baker: ["Welcome, so lovely to see you! 🌞", "Oven's hot, the cakes are coming!", "Have a bun while it's warm — on the house!", "Smells like fresh pastry, doesn't it? Help yourself!"],
      // Zip 301: Rosalie — bitter, speaks rarely and curtly.
      breadmaker: ["What now.", "The bread's ready when it's ready. Not before.", "You planning to just stand there?", "No butter, no viennoiseries. That's how it is.", "Hmph.", "You want to fight, is that it? You want to fight?", "...", "Want me to put you in the oven?", "Back off."],
      lumberjack: ["I fell, I saw, I crack rocks!", "One more tree and I'll take a break.", "The wood goes straight to our common stock.", "My axe has never been sharper."],
      voyager: ["I set sail again soon for distant lands.", "I brought back rare goods from afar.", "Place an order and I'll find it for you!", "I already miss the open sea."],
      // Jérôme Martial's Creole lines — kept identical to the French version,
      // as requested ("Sawfe" and "pani tchak" are Creole, not translated).
      sugarworker: ["Bel bonjou !", "Sawfe", "pani tchak"],
    },
    // Zip 327: René's "withdrawn"/grumpy phases, independent of his work/
    // break cycle — see RENE_GRUMPY_CYCLE_MS.
    skillTalkGrumpy: {
      beekeeper: ["...", "... Not in the mood right now. Don't talk to me.", "Want me to sting you?"],
    },
    // Zip next: Chloé/Rosalie scenes. Zip 371: this block is NOT a fallback —
    // it is a full set, same scene count and same line count as fr. The former
    // "EN fallback / FR is the primary set" note was wrong and misleading.
    // Translation rule (Guillaume, zip 371): translate the EFFECT, not the words.
    // Where a literal rendering kills the joke, write a different joke that lands
    // in English. `turn: true` MUST mirror fr line for line — it drives an
    // animation (Rosalie turning away), and its absence was invisible in review.
    chloeRosalieScenes: [
      [{ who: "chloe", text: "Rosalie! We do NOT talk to people like that!" }, { who: "rosalie", text: "I was just telling the truth." }, { who: "chloe", text: "We don't do truth here, Rosalie. We do POLITE!" }, { who: "rosalie", text: "...Fine, fine, I get it." }, { who: "chloe", text: "Sorry, she had a rough night..." }],
      [{ who: "chloe", text: "I heard ALL of that from the bakery, you know!" }, { who: "rosalie", text: "I'm allowed an opinion, aren't I?" }, { who: "chloe", text: "Not like that, Rosalie, NEVER like that!" }, { who: "rosalie", text: "Okay, okay, got it..." }, { who: "chloe", text: "A bit of manners! Just a little bit!" }, { who: "rosalie", text: "That's the sourdough growling. Not me.", turn: true }, { who: "chloe", text: "Sorry about her. She's got a heart of gold. Under there. Somewhere." }, { who: "rosalie", text: "Hmph." }],
      [{ who: "chloe", text: "One more time, ONE, and you're the one apologizing at the market!" }, { who: "rosalie", text: "You'd never do that." }, { who: "chloe", text: "Try me." }, { who: "rosalie", text: "...Fine, fine, never mind." }, { who: "chloe", text: "Sorry about her. Bread makes her... expressive." }],
      [{ who: "chloe", text: "Rosalie." }, { who: "rosalie", text: "What." }, { who: "chloe", text: "You know exactly what." }, { who: "rosalie", text: "No idea." }, { who: "chloe", text: "Rosalie." }, { who: "rosalie", text: "...Fine, MAYBE I overreacted a bit." }, { who: "chloe", text: "Sorry, that wasn't very nice of her..." }],
      [{ who: "chloe", text: "We respect people here, Rosalie, end of st—" }, { who: "chloe", text: "OH MY BREAD!", ms: 1800 }, { who: "rosalie", text: "...Saved by the bell.", turn: true }, { who: "chloe", text: "Sorry anyway!" }],
      [{ who: "chloe", text: "That was really, really not nice!" }, { who: "chloe", text: "Rosalie?" }, { who: "rosalie", text: "I didn't say anything." }, { who: "chloe", text: "Exactly. Will you ever apologize?" }, { who: "rosalie", text: "We'll see.", turn: true }, { who: "chloe", text: "...and sorry for my tone, but someone had to." }],
      [{ who: "chloe", text: "HEY!", ms: 1600 }, { who: "chloe", text: "Is that ALL you have to say for yourself?!" }, { who: "rosalie", text: "...Sorry." }, { who: "chloe", text: "There. Wasn't so hard." }],
      [{ who: "chloe", text: "We do not grumble at customers. WE. DO. NOT. GRUMBLE.", ms: 4200 }, { who: "rosalie", text: "...Done with the list?" }, { who: "chloe", text: "There's a fourth point if you insist." }, { who: "rosalie", text: "No, no, I got the general idea." }, { who: "chloe", text: "Sorry about her. All crust." }, { who: "rosalie", text: "Thanks... I think." }],
      [{ who: "chloe", text: "Rosalie, seriously! We don't talk to people like that!" }, { who: "rosalie", text: "It was nothing. A remark. A fact." }, { who: "chloe", text: "It wasn't nothing." }, { who: "chloe", text: "...Sorry anyway, maybe that was a bit much." }, { who: "rosalie", text: "...Eh. It's fine." }],
      [{ who: "chloe", text: "EXCUSE ME?! Calm DOWN, Rosalie!" }, { who: "rosalie", text: "FINE, I get it, no need to make a meal of it!" }, { who: "chloe", text: "Sorry, I got carried away... come here. Hug it out?" }, { who: "rosalie", text: "NO." }, { who: "chloe", text: "Fine, suit yourself." }],
      [{ who: "chloe", text: "Rosalie, ENOUGH, you can't take it out on everyone!" }, { who: "rosalie", text: "I'm not taking anything out on anyone!" }, { who: "chloe", text: "It's not because René left you that the whole village must pay!" }, { who: "rosalie", text: "We... we don't talk about René here." }, { who: "chloe", text: "I know. But you can't stay mad at the whole world." }, { who: "rosalie", text: "I'm NOT mad. I'm... busy." }, { who: "chloe", text: "Of course." }, { who: "rosalie", text: "...Get back to your oven, Chloé.", turn: true }, { who: "chloe", text: "She's doing better, actually, believe it or not." }],
    ],
    // Tristan/Jérôme rivalry scenes. Zip 371: full set, not a fallback (see the
    // note on chloeRosalieScenes above). Nickname kept consistent across V7/V9:
    // "little lollipop" renders "petit sucre d'orge" — same cheap sugary object,
    // plus the English sense of "sucker", which the French does not carry.
    // "ridiculous little man" (V7) and "pathetic little man" (V8/V10) are kept
    // distinct, as in fr: reusing one for the other flattens all three scenes.
    tristanJeromeScenes: [
      [{ who: "tristan", text: "Hanging around my woodpile again, Jérôme?" }, { who: "jerome", text: "Your woodpile? The whole village shares it, weekend lumberjack." }, { who: "tristan", text: "Say that again." }, { who: "jerome", text: "#%!&, you heard me fine." }, { who: "tristan", text: "You asked for this." }],
      [{ who: "jerome", text: "Well, if it isn't the lumberjack. I can smell the sawdust from here. Come to sniff around MY sugar mill?" }, { who: "tristan", text: "Just passing by. Unlike you, I actually WORK." }, { who: "jerome", text: "Work? You crack rocks, Tristan, that's not a trade." }, { who: "tristan", text: "Say that to my face." }, { who: "jerome", text: "Gladly, you #%!& lumberjack." }, { who: "tristan", text: "Fine. Fine then." }],
      [{ who: "tristan", text: "Jérôme." }, { who: "jerome", text: "What." }, { who: "tristan", text: "What exactly are you telling people about me at the market?" }, { who: "jerome", text: "The truth. That you've got the build of a lumberjack and the wit of a log." }, { who: "tristan", text: "Very funny. No, really. Very funny." }, { who: "jerome", text: "I think so too, yes." }, { who: "tristan", text: "#%!&, you'll see what a log feels like." }, { who: "jerome", text: "Be my guest." }],
      [{ who: "tristan", text: "You got a problem with me, Jérôme?" }, { who: "jerome", text: "You, entirely, are my problem." }, { who: "tristan", text: "#%!&." }, { who: "jerome", text: "Likewise." }],
      [{ who: "tristan", text: "You really have no manners at all, Jérôme." }, { who: "jerome", text: "Rude, me? At least I know how to talk to people." }, { who: "tristan", text: "You spend your time insulting the whole village!" }, { who: "jerome", text: "And you spend yours doing nothing useful." }, { who: "tristan", text: "#%!&, say that again." }, { who: "jerome", text: "Gladly." }],
      [{ who: "jerome", text: "Honestly, Tristan, what use are you around here?" }, { who: "tristan", text: "I work harder than you, you two-bit sugar maker." }, { who: "jerome", text: "Mostly you work at following me around. You're just jealous that Ingrid likes me." }, { who: "tristan", text: "That's nonsense, it has nothing to do with it!" }, { who: "jerome", text: "It has everything to do with it. You're a jealous nobody, that's what you are." }, { who: "tristan", text: "#%!&, you'll regret saying that." }, { who: "jerome", text: "We'll see." }],
      [{ who: "tristan", text: "Well, well. If it isn't little lollipop, out of his shop for once." }, { who: "jerome", text: "Little lollipop makes twice your revenue, Tristan." }, { who: "tristan", text: "Your revenue, your revenue... that's the only word you know." }, { who: "jerome", text: "Because all you've got is logs, exactly." }, { who: "tristan", text: "Say that again, you ridiculous little man." }, { who: "jerome", text: "Little man? Look at the size of you next to the size of your head." }, { who: "tristan", text: "#%!&, you're really starting to fire me up." }, { who: "jerome", text: "Good, makes a change from sawdust." }, { who: "tristan", text: "You asked for this." }],
      [{ who: "jerome", text: "So, log-boy, sleep well last night?" }, { who: "tristan", text: "Always so charming, Jérôme." }, { who: "jerome", text: "Always so charming. And you, always so... furniture." }, { who: "tristan", text: "Furniture? Furniture that could fold you in half, you mean." }, { who: "jerome", text: "Go on then, muscles, we'll see who folds who." }, { who: "tristan", text: "Pathetic little man. You're very brave when there's a crowd around." }, { who: "jerome", text: "And you're very clever when there's nobody around to check, apparently." }, { who: "tristan", text: "#%!&. That's enough now." }, { who: "jerome", text: "Finally, a short sentence, well done." }],
      [{ who: "tristan", text: "Jérôme, I heard what you told Ingrid yesterday." }, { who: "jerome", text: "Oh yeah? Well, it's not like it was false." }, { who: "tristan", text: "You said I could only count up to three logs." }, { who: "jerome", text: "And have you proven otherwise since?" }, { who: "tristan", text: "Keep it up, little lollipop, keep it up." }, { who: "jerome", text: "Little lollipop, little lollipop... that's all you've got in stock. The sugar mill is mine, not yours." }, { who: "tristan", text: "Ridiculous. You're ridiculous, that's what you are." }, { who: "jerome", text: "Ridiculous but loved by everyone. You're just a lumberjack. And alone." }, { who: "tristan", text: "#%!&, there it is, you got me." }, { who: "jerome", text: "Finally, a win, for today." }],
      [{ who: "tristan", text: "You got a problem, Jérôme?" }, { who: "jerome", text: "You. Entirely. That's been my problem from the start." }, { who: "tristan", text: "Say that again, you pathetic little man." }, { who: "jerome", text: "Pathetic? Look at you, you're already shaking with rage." }, { who: "tristan", text: "#%!&." }, { who: "jerome", text: "Still so chatty, I see." }],
    ],
    toastTJStorm: (name, target) => `⚠️ ${name} is marching straight at ${target} — trouble's brewing, come see!`,
    toastTJBrawlStart: (n1, n2) => `💥 A brawl breaks out between ${n1} and ${n2}!`,
    tjCrowdLines: [
      "Uh oh, this is getting ugly!",
      "They're really going to fight...",
      "Someone should break this up!",
      "This isn't pretty to watch.",
      "Those two again...",
      "I hope it stops there.",
      "This is going to end badly.",
      "Calm down, you two!",
      "Ohhhh!",
      "Ohhhh, that one landed.",
      "Oof, I would NOT have liked to be told that!",
      "Ooooh, right in the ego.",
      "Ouch ouch ouch, dead center.",
      "That's gonna leave a mark.",
      "He did not hold back on that one.",
      "Well that escalated fast.",
    ],
    tjAfterLines: [
      "Well, that's that...",
      "Saw that coming.",
      "Ugh. Those two, always the same.",
      "Alright, back to work.",
      "Hope they calm down eventually.",
      "Those two really know how to wound each other.",
      "Honestly, I wouldn't have taken being talked to like that.",
      "Good grief, the mouths on those two.",
    ],
    toastTJBrawl: (loser) => `🤕 ${loser} got roughed up and will be stuck in place for a while.`,
    healResidentChat: (healer, hurt) => `🩹 ${healer} bandaged ${hurt}, reducing their downtime.`,
    healResidentPartialChat: (healer, hurt, mn) => `🩹 ${healer} applied a bandage to ${hurt}: ${mn} min of downtime left (another bandage can help!)`,
    residentNeedBuilding: (b) => `Build me a ${b} (buyable with gold at the shop) and I'll produce for the farm!`,
    residentBuildingReady: (b) => `My ${b} is running. Keep our stocks filled and I'll do the rest!`,
    residentLumberjackLine: "I fell trees, break rocks and saw planks all day — it all goes into our common stock.",
    residentCloseBtn: "See you later",
    // "Resident relationships" feature: small section listing who they get on
    // with or avoid. Meant to evolve over time (see RESIDENT_AFFINITIES).
    residentAffinitiesTitle: "Relationships",
    residentAffinityAlly: (n) => `Friends with ${n}`,
    residentAffinityEnemy: (n) => `At odds with ${n}`,
    // Jérôme's Creole interjection, occasionally used before replying to a
    // stinging remark from Tristan (not systematic) — kept identical to FR.
    jeromeInterjection: "Kisa i ka di mwen ?",
    // Zip 253: enriched resident card + Staff tab.
    residentRoleTitle: "Output",
    residentNotWorkingYet: "No workshop yet — still settling in.",
    residentProdHoney: (n) => `Hive humming — ${n} honey jar(s) in store.`,
    residentProdCheese: (w, p, b, yn, yv) => `Dairy running — ${w} wheel(s), ${p} portion(s), ${b | 0} butter in store, ${yn | 0} plain yogurt(s), ${yv | 0} vanilla yogurt(s).`,
    // Zip 301: Rosalie's bread + viennoiserie line.
    residentProdBread: (bread, cr, ch, ps) => `Bakehouse — ${bread} bread, ${cr} croissant(s), ${ch} pain(s) au chocolat, ${ps} pain(s) suisse(s).`,
    // Zip 301: cheese/butter ratio control (Ingrid's card).
    cheeseRatioTitle: "Cheese / butter split",
    cheeseRatioLine: (cheese, butter) => `Cheese ${cheese}% · Butter ${butter}%`,
    cheeseRatioButterShort: "Butter",
    bakeryCustomerBought: (name, n, gain) => `A morning customer bought ${n} × ${name} (+${gain} gold)!`,
    bakeryPriceTitle: "Selling prices",
    bakeryPriceLine: (name, price, def) => `${name}: ${price} gold/each${price !== def ? ` (default ${def})` : ""}`,
    residentProdPastry: (ec, ev, fl, gb) => `Oven's on — ${ec} chocolate eclair(s), ${ev} vanilla eclair(s), ${fl} Madagascar vanilla flan(s), ${gb} Basque cake(s) ready.`,
    residentProdWood: (w, s, p) => `Common stock: ${w} wood, ${s} stone, ${p} plank(s) brought in.`,
    residentSeeBtn: "View",
    // Zip 258: baker out-of-ingredients alert.
    bakeryAlertShort: "⚠️ Out of ingredients",
    craftMissingIngredientName: (k) => ({
      flour: "flour", milk: "milk", egg: "eggs", cocoa: "cocoa",
      vanilla: "vanilla", tonka: "tonka bean", butter: "butter",
    }[k] || "some ingredients"),
    bakeryAlertLine: (list) => `⚠️ Oven stopped — I'm out of ${list}!`,
    bakeryAlertTitle: "The baker needs ingredients",
    bakeryAlertMsg: (list) => `I can't carry on: I'm out of ${list}. Top up our stocks and I'll get right back to it!`,
    bakeryAlertToast: (list) => `🍰 The baker is out of ${list} — production stopped.`,
    bakeryNotifSee: "View",
    // Zip 280: jewelry workshop (no role, open to every player).
    shopJewelryTitle: (cost) => `Jewelry workshop (${cost} gold)`,
    shopJewelrySub: "Open to everyone — design and sell unique jewelry.",
    shopJewelryOwned: "Built",
    shopJewelryComingSoon: "Coming soon — not yet available for purchase.",
    comingSoonLabel: "Coming soon",
    jewelryDesignRowTitle: "Design a piece",
    jewelryDesignRowSub: "Pick the type, material, cut, and price.",
    jewelryDesignBtn: "Open",
    jewelryBuiltChat: "💍 The jewelry workshop is open — start designing!",
    jewelryMadeChat: (name, typeName) => `💍 ${name} designed: ${typeName}.`,
    jewelrySoldChat: (gain) => `💰 Jewelry sold: +${gain} gold.`,
    jewelryTypeName: (id) => ({ earrings: "Earrings", bracelet: "Bracelet", necklace: "Necklace", chain: "Gold chain" }[id] || id),
    jewelrySellTitle: "Jewelry in store (shared pool)",
    jewelryPieceTitle: (typeName, gemName) => `${typeName} (${gemName})`,
    jewelryMakerHint: (name) => `Designed by ${name}`,
    jewelrySellBtn: "Sell",
    jewelryDesignTitle: "Design a piece",
    jewelryPreviewLine: (typeName, shapeName, gemName) => `${typeName} — ${shapeName} cut, ${gemName}`,
    jewelryTypeLabel: "Jewelry type",
    jewelryMaterialLabel: "Material (gem)",
    jewelryShapeLabel: "Cut",
    jewelryPriceLabel: "Sale price",
    jewelryStockLine: (goldHave, goldNeed, gemHave, gemNeed) => `Gold available: ${goldHave}/${goldNeed} — Chosen gem available: ${gemHave}/${gemNeed}`,
    jewelryNoGoldHint: "Not enough gold in the shared stock.",
    jewelryNoGemHint: "Not enough of that gem in the shared stock.",
    jewelryMakeBtn: "Craft",
    toastJewelryNoGold: "Not enough gold in the shared stock.",
    toastJewelryNoGem: "Not enough of that gem in the shared stock.",
    toastCropWrongType: "This tile already has a different crop — harvest it before planting something else.",
    toastCropMaxed: "Tile already full (5 seeds max).",
    // Zip 258: Eduardo Da Fonseca, the great-voyager trader.
    voyagerStatusHome: "Back in the village — ready to set sail again.",
    voyagerStatusAway: (d) => `Away on a voyage — back in ~${d}.`,
    voyagerOrderBtn: "Order a voyage",
    voyagerSellBtn: "Resell the goods",
    voyagerOrderTitle: "🌍 Order a voyage from Eduardo",
    voyagerOrderHint: "Pick the world goods to bring back. The farther the region, the pricier the goods and the longer the trip. Paid up front.",
    voyagerTripDays: (d) => `${d} day(s) of travel`,
    voyagerUnitCost: (c) => `${c} gold/unit`,
    voyagerTotal: (c) => `Total: ${c} gold`,
    voyagerSendBtn: "Send Eduardo",
    voyagerCancelBtn: "Cancel",
    voyagerEmptyOrder: "Add at least one product.",
    voyagerDeparted: (d) => `🐎 Eduardo sets off (back in ${d}). Fair winds!`,
    voyagerBusyToast: "Eduardo is already away on a voyage.",
    voyagerReturned: (goods) => `🧳 Eduardo is back with: ${goods}!`,
    voyagerReturnNotifTitle: "Eduardo is back!",
    voyagerSurpriseTag: " (+ surprise)",
    voyagerSellTitle: "🌍 World goods to resell",
    voyagerSellRow: (name, n) => `${name} × ${n}`,
    // Zip 370: `tonka` was missing here even though the tonka bean is in
    // WORLD_GOODS — Eduardo's return notification showed the raw internal key
    // ("tonka ×3"). This table must cover WORLD_GOODS in full: any product added
    // there must be added here too, in BOTH blocks (the `|| key` fallback fails
    // silently).
    worldGoodName: (key) => ({ vanilla: "Vanilla pod", coffee: "Coffee", cinnamon: "Cinnamon", cocoa: "Cocoa", pineapple: "Pineapple", coconut: "Coconut", tonka: "Tonka bean" }[key] || key),
    voyagerProdLine: (n) => n > 0 ? `Voyager's counter — ${n} world good(s) in store.` : "Great-voyager trader — ready to depart.",
    // Zip 259: evict a resident + returning ex-resident.
    residentsSectionTitle: "Residents",
    kickBtn: "Vote to evict",
    kickTally: (n, m) => `Eviction: ${n}/${m} votes`,
    kickedChat: (name) => `👋 ${name} has been evicted and vacates their house.`,
    kickVotedToast: "Your eviction vote is recorded.",
    exileReturnChat: (name) => `${name} is back in the village and wants a word…`,
    pleaTitle: (name) => `${name} is back`,
    pleaAccept: "Take them back",
    pleaRefuse: "Refuse",
    notifPlea: "wants a word",
    exileReacceptedChat: (name) => `🏡 ${name} moves back in — good to see them again!`,
    exileRefusedChat: (name) => `${name} leaves for good.`,
    exilePlea: (mood, vi) => (({
      touching: [
        "…I don't understand. I was so happy with you. Could I come back? I'll do better, I promise.",
        "I missed you every single day. This farm was my family. Please, give me a second chance.",
        "I haven't slept since I left. Tell me what I did wrong and I'll fix it — just take me back.",
        "I walked for hours to come back. My heart stayed here, with you. Let me come home…",
      ],
      bitter: [
        "So you toss people out like worn-out tools? You'll regret this, believe me.",
        "I'm back, but not to beg. You were unfair, and you know it perfectly well.",
        "I gave everything to this farm, and this is how you thank me. Pathetic.",
        "Don't think I'll forget. You always reap what you sow.",
      ],
      healthy: [
        "Hello. I respect your decision. I just came to say a proper goodbye — and thank you for everything.",
        "No hard feelings, truly. I loved living here. If a spot ever opens up, think of me.",
        "That's life! I'm doing great. I only wanted to thank you before turning the page.",
      ],
    }[mood] || [])[vi] || ""),
    exileYes: (mood) => ({ touching: "Oh, thank you, thank you! I won't let you down this time, I promise!", bitter: "…Fine. I accept. But don't you do that to me again.", healthy: "Gladly! Thank you for your trust — I'll take my place back with a smile." }[mood] || ""),
    exileNo: (mood) => ({ touching: "I… I understand. Take care of the farm. Farewell.", bitter: "Right. You'll get what's coming to you.", healthy: "No worries, I expected as much. Take care, truly!" }[mood] || ""),
    artisanShopTitle: "🛠️ Artisan workshops",
    artisanBuyBtn: "Build",
    artisanOwnedBtn: "✅ Built",
    artisanLockedRow: "🔒 Recruit the artisan to unlock",
    craftSellTitle: "🧺 Artisan goods",
    craftRow: (name, n) => `${name} × ${n}`,
    craftPortionBtn: (n) => `Cut a wheel → ${n} portions`,
    petFullTitle: "Companion bag full",
    petFullSub: (petName, max) => `A visitor wants to give you ${petName}, but you already have ${max} companions. Release one to take it in, or decline the gift.`,
    petFullRelease: "Release & accept",
    petFullDecline: "Decline the gift",
    voteDiceChat: (n, r, st) => `🎲 Split vote, the die shows ${r}: ${n} ${st ? "stays!" : "leaves..."}`,
    voteLeaveChat: (n) => `${n} leaves, the vote did not pass.`,
    residentTag: (j) => `Resident: ${j}`,
    notifAsk: (n) => `${n} is waiting at the townhall`,
    notifWantsBuy: (q, c) => `Wants to buy ${q} × ${c}`,
    notifWantsChat: "Just wants to chat",
    notifDemand: (g0) => `Demands ${g0} gold!`,
    notifStay: "Asks to move in!",
    townhall: "Townhall",
    seaSectionHint: "Rare sea creature, sells high.",
    seasonSpring: "Spring",
    seasonSummer: "Summer",
    seasonAutumn: "Autumn",
    seasonWinter: "Winter",
    codeTitle: "🌾 Valley Farm",
    codePrompt: "Enter a farm code to continue an existing game, or a new code to start a new farm. The same code always reloads the same farm.",
    codePlaceholder: "Farm code (e.g. garden)",
    codeLoad: "Open the farm",
    codeLoading: "Loading the farm…",
    codeEmpty: "Choose a farm code.",
    codeDbError: "Farm saves unavailable. Did you run supabase/upgrade-005.sql?",
    csTitle: "🌾 Valley Farm",
    csSub: "Co-op farm: grow, chop, mine and sell with your team.",
    btnChangeChar: "🧑‍🌾 Change character",
    namePlaceholder: "Your farmer name",
    fermier: "Farmer (M)",
    fermiere: "Farmer (F)",
    joinBtn: "Join the farm!",
    connecting: "Connecting to the farm…",
    waitWorld: "Waiting for the host to open the farm…",
    goldCommon: "gold (shared pot)",
    day: "Day",
    playersOnline: (n) => `${n} player(s) online`,
    seedsLabel: "Seeds",
    foodLabel: "Snack",
    rodLabel: "Rod",
    seedTip: (name) => `${name} (click to pick another seed)`,
    toolsTip: (name) => `${name} (press 1 to switch tool, click to choose)`,
    foodTip: (e) => `Eat (snack, fish, or an edible animal product)`,
    rodTip: "Fishing rod: aim at the river water to fish",
    fenceTip: "Fence: place or remove a section on the targeted tile (press R to pick its orientation before placing)",
    wallTip: "Wall: place or remove a section on the targeted tile",
    pathTip: "Path: place or remove a tile on the targeted tile",
    bridgeTip: "Bridge: build a bridge tile on a river construction site (permanent, cannot be removed)",
    bridgeRenovateTip: "Renovate to stone: upgrades an already-built wooden bridge tile (stone look, resists nightly decay)",
    lampTip: "Lamp post: place or remove a lamp post on the targeted tile (15 real min to build, then functional: lights up an area at night)",
    scarecrowTip: "Scarecrow: place or remove a scarecrow on the targeted tile (10 real seconds to build). Does not block movement.",
    // Zip 251: hand tool + decorations.
    handTip: "Hand: place a decoration from your bag, move lamps/scarecrows/walls/mills/the cauldron/decorations, or store them back in your bag (R, except mill/cauldron: R just cancels the grab). Works on the farm and in town.",
    // Heal kit armed from the bag (click the "bandaids" row) — healing still
    // triggers automatically (E/Space) near an injured player or resident.
    healKitArmedTip: "Heal kit armed: walk up to an injured player or resident and press E (or Space) to heal them.",
    handMenuTitle: "🖐️ Decorations to place",
    handMenuEmpty: "No decorations in your bag. You get them as gifts from visitors.",
    handMoveHint: "Click an object to grab it, then click a tile to drop it (R = store in bag).",
    handHeldHint: "Click a tile to drop • R to store in your bag",
    moveConfirmBtn: "Confirm",
    moveCancelBtn: "Cancel",
    handGrabbed: "Object grabbed: click a tile to drop it, or R to store it.",
    handNothing: "Nothing to grab here. Arm a decoration above to place it.",
    decorBadSpot: "Can't place here.",
    decorNone: "You no longer have that decoration in your bag.",
    decorPicked: "Decoration stored in your bag.",
    objReturned: "Object stored in your inventory.",
    handToolName: "Hand",
    grassTip: "Grass: replant grass on a tilled tile (5 real seconds to build, permanent, cannot be removed)",
    millTip: "Mill: places a mill (1 real hour to build, continuously turns deposited wheat into flour, can only be removed once empty)",
    sucrerieTip: "Sugar mill: places a sugar mill (1 real hour to build, continuously turns deposited sugar cane into sugar sacks as long as Jérôme Martial lives there, can only be removed once empty)",
    herdTip: "Move: click an animal to pick it up, click again to drop it wherever you want",
    fenceDirToast: (kind) => `Fence orientation: ${kind === "h" ? "horizontal" : kind === "v" ? "vertical" : "automatic"}`,
    woodResTip: "Harvested wood: click to build or sell",
    stoneResTip: "Harvested stone: click to build or sell",
    gemsResTip: "Room gems (shared between all players): click to sell",
    flourResTip: "Room flour sacks (shared between all players, produced by mills): click to sell",
    sugarResTip: "Room sugar sacks (shared between all players, produced by sugarhouses): click to sell",
    goldResTip: "Farm gold (found while mining, shared between all players) — used by the jewelry workshop",
    craftMenuTitleWood: (n) => `🪵 Wood: ${n}`,
    craftMenuTitleStone: (n) => `🪨 Stone: ${n}`,
    craftMenuTitleGems: () => `💎 Shared gems`,
    craftMenuTitleFlour: () => `🌾 Shared flour`,
    craftMenuTitleSugar: () => `🍬 Shared sugar`,
    flourItemName: "Flour sack",
    sugarItemName: "Sugar sack",
    gemsSharedHint: "Shared between all players on the farm",
    soanFishSharedHint: "Caught by Soan, shared between all players on the farm",
    // Zip 260: Harald, the livestock agent.
    haraldRowTitle: (cost) => `🧺 Hire Harald: ${cost} gold`,
    haraldRowSub: "Livestock agent — roams the pen and collects animal produce (eggs, milk, wool, truffles) so nothing is wasted.",
    haraldNotHiredSub: "24h contract",
    haraldHiredUntil: (h) => `Hired — ${h}h left on contract`,
    haraldWorkingBtn: "On rounds",
    haraldStatusRounds: "Doing rounds around the pen",
    haraldSharedHint: "Collected by Harald, shared between all players on the farm",
    employeesHaraldName: "Harald",
    sawmillShopSub: "Lumberjack's workshop",
    buildFenceLabel: "Wooden fence",
    buildWallLabel: "Stone wall",
    buildPathLabel: "Paved path",
    buildCostWood: (n) => `${n} wood per section`,
    buildCostStone: (n) => `${n} stone per section`,
    buildCostPath: (n) => `${n} stone per tile`,
    buildBridgeWoodLabel: "Wooden bridge",
    buildBridgeStoneLabel: "Stone bridge",
    buildBridgeRenovateLabel: "Renovate to stone",
    buildCostBridgeWood: (n) => `${n} wood per tile`,
    buildCostBridgeStone: (n) => `${n} stone per tile`,
    equipBtn: "Equip",
    seedMenuTitle: "Choose a seed",
    toolMenuTitle: "Choose a tool",
    toastNeedWater: "Get close to the water and aim at the river to fish!",
    fxGem: (name) => `Gem: ${name}!`,
    fxBridge: "Bridge!",
    fxLeverOpen: "Bridge open!",
    fxLeverClosed: "Bridge closed!",
    fxMillDeposit: (n) => `+${n} wheat deposited`,
    fxSucrerieDeposit: (n) => `+${n} cane deposited`,
    fxFish: (name) => `+1 ${name.toLowerCase()}`,
    questTitle: "🎯 To do: discover the farm",
    questBtn: "🎯 To do",
    questReward: (n) => `+${n} gold`,
    questDone: (label, n) => `Quest done: ${label} (+${n} gold)!`,
    questAllDone: "🎉 Well done, you've covered the farm basics!",
    questLabels: {
      till: "Till a tile (hoe)",
      plant: "Plant a seed",
      water: "Water a crop (watering can)",
      chop: "Chop a tree (axe)",
      mine: "Break a rock (pickaxe)",
      fish: "Catch a fish (rod)",
      sell: "Sell something at the bin",
    },
    btnWell: "🪣 Well",
    whistleTip: "Whistle to call the horses back",
    mountPrompt: "[F] Mount the horse",
    dismountPrompt: "[F] Dismount",
    wellToast: "🪣 Teleported to the well!",
    torchTipOn: "Put out the torch",
    torchTipOff: "Take out a torch (scares wolves away)",
    wolfAteAnimal: () => "A wolf carried off a pen animal tonight!",
    // Aggressive wolves / bite (chantier 2026-07)
    wolfBiteTitle: "🐺 IT'S ATTACKING YOU!",
    wolfBiteHint: "Mash Space (or click) to fight it off!",
    wolfBiteWin: "You fought off the wolf!",
    wolfBiteFailChat: (who) => `🩸 ${who} was bitten by a wolf and dragged back home, injured.`,
    wolfBiteWinChat: (who) => `🐺 ${who} fought off an aggressive wolf!`,
    // Kill after 3 wins (chantier 2026-07, Guillaume's request)
    wolfKilledChat: (who) => `🗡️ ${who} slew an aggressive wolf after three fend-offs!`,
    // Evil creature / bite minigame (chantier 2026-07)
    evilBiteTitle: "👹 IT'S ATTACKING YOU!",
    evilBiteHint: "Mash Space (or click) to break free!",
    evilBiteWin: "You fought off the creature!",
    evilKilledChat: (who) => `🗡️ ${who} slew an evil creature after three fend-offs!`,
    rabbitCaughtChat: (who) => `🐇 ${who} caught a wild rabbit!`,
    injuredBanner: (mmss) => `🩸 Injured — forced rest (${mmss})`,
    toastInjured: "You're injured and can't act right now.",
    toastInjuredWait: (mmss) => `🩸 You're injured — ${mmss} of forced rest left. What you brought back is waiting for you.`,
    buyLabel: "Buy",
    shopHorseTitle: (cost) => `🐴 Horse: ${cost} gold`,
    shopHorseSub: "Moves much faster once mounted. Walk up to it and press F (can carry two riders).",
    shopHorseCount: (n, max) => `Horses on the farm: ${n}/${max}`,
    shopHorseMax: "🐴 Maximum number of horses reached.",
    horseCoatLabel: (coat) => coat === "black" ? "Buy (black)" : coat === "white" ? "Buy (white)" : "Buy (bay)",
    shopWellTitle: (cost) => `🪣 Well: ${cost} gold`,
    shopWellSub: "Adds a 2nd teleport point in the fields (🪣 button).",
    shopWellOwned: "🪣 Well already built.",
    shopAnimalsHeader: "🐮 Animal market",
    // Section headers of the reorganized shop (Guillaume's request 2026-07)
    shopSeedsHeader: "🌱 Seeds & crops",
    shopBuildHeader: "🏗️ Buildings",
    shopConsumablesHeader: "🎒 Consumables & care",
    shopStaffHeader: "🧑‍🌾 Employees",
    // House levels (Guillaume's validation 2026-07)
    houseRowTitle: (lvl) => `🏪 FARM MARKET STORE (level ${lvl})`, // zip 250: central house renamed (Guillaume)
    houseRowSub: "Upgrades the farm FARM MARKET STORE (new look at each level). Wood/stone taken from YOUR inventory, gold from the shared pot.",
    houseRowCost: (pal) => `Reach level ${pal.level}: ${pal.cost.money} gold + ${pal.cost.wood} wood + ${pal.cost.stone} stone — works: ${Math.round(pal.durationMs / 3600000)} h`,
    houseRowMax: "Maximum level reached!",
    houseUpgrading: (mn) => `🔨 Works in progress — done in ~${mn} min`,
    houseUpgradeBtn: "Start the works",
    houseWorksStarted: (name, lvl) => `${name} started the FARM MARKET STORE works (towards level ${lvl})!`,
    houseUpgraded: (lvl) => `🎉 The FARM MARKET STORE reached level ${lvl}!`,
    animalRowTitle: (name, cost) => `${name}: ${cost} gold`,
    animalRowSub: (prod, sell, hours) => `Produces every ${hours} h: ${prod} (sells for ${sell} gold)`,
    penFull: "The pen is full!",
    chatAnimalBought: (name) => `${name} joins the pen!`,
    promptSellAnimal: (price) => `[E] Sell the animal (${price} gold)`,
    chatAnimalSold: (name, price) => `💰 ${name} sold for ${price} gold.`,
    prodRowTitle: (name, n) => `${name} × ${n}`,
    fxProduct: (name) => `+1 ${name.toLowerCase()}`,
    fxCollect: "Collected!",
    fishBite: (name) => `A bite... a ${name.toLowerCase()}!`,
    fishTimingTitle: "🎣 Hook the fish!",
    fishTimingHint: "Click or Space when the cursor is in the green zone",
    fishHoldTitle: "🎣 Tire the fish out!",
    fishHoldHint: "Hold (click or Space) to keep the bar on the fish",
    fishReactTitle: "🎣 Get ready...",
    fishReactHint: "Click AS SOON AS the frame turns green!",
    fishReactNow: "NOW!",
    fishWin: "Nice catch!",
    fishFail: "The fish got away...",
    fishTooSoon: "Too soon! It escaped.",
    promptShop: "[E] Shop",
    promptBin: "[E] Stores",
    promptBarn: "[E] Deposit at barn",
    promptBarnBuild: "[E] Build (mini-game)",
    promptSleep: "[E] Sleep",
    promptWake: "[E] Wake up",
    // Sleeping in the house (2026-07 chantier)
    toastSleepFull: "You're not tired, no need to sleep.",
    toastSleepDone: "Slept well! Energy refilled.",
    toastSleepEarly: "Woke up early.",
    // Heal kit (2026-07 chantier): another injured player can be healed
    // (press E nearby), cutting their forced rest down to 1 minute.
    healKitRowTitle: "🩹 Heal kit (free)",
    healKitRowSub: (n) => `Cuts an injured teammate's forced rest to 1 min (walk up to them, press E). In stock: ${n}`,
    healChat: (healer, hurt) => `🩹 ${healer} healed ${hurt}, forced rest cut down to 1 minute!`,
    toastNotInjured: "That farmer isn't injured anymore.",
    toastNoHealKit: "You need a heal kit (free at the shop).",
    toastHealTooFar: "Get closer to the injured farmer to heal them.",
    // Persistent collaborative barn (zip 158)
    barnHudLine: (level, max, cap) => `Barn ${level}/${max} · ${cap} animals max`,
    barnDeposited: (who, n, res) => `${who} brings ${n} ${res} to the barn.`,
    barnReadyChat: (money) => `🛖 The barn has enough materials, ${money} gold was taken from the shared pot: come over and press [E] to build!`,
    barnBuilt: (who, level) => `🎉 ${who} upgraded the barn to level ${level}!`,
    barnMiniFail: "Missed it! Come back to the barn to try again.",
    barnMiniTitle: (level) => `🔨 Building the barn (tier ${level})`,
    barnMiniSub: (hits, needed) => `Successful hits: ${hits}/${needed}`,
    barnMiniHint: "Click or press Space when the cursor is in the green zone.",
    toastBarnMax: "The barn is already at its maximum level.",
    toastFarBarn: "Get closer to the barn to deposit.",
    toastBarnReadyWait: "The barn is ready to be built: press E to start the mini-game.",
    toastBarnNotReady: "Still missing some materials before you can build.",
    toastBarnNeedMoney: "Wood and stone are ready, but the shared pot doesn't have enough gold to start the work.",
    // Zip 368: team-mission strings removed with the feature itself. The three
    // below stay: the collaborative BARN deposit reuses them (resolveBarnDeposit
    // and the barnDeposited chat line). Their "coop" name is historical.
    woodLabel: "wood",
    stoneLabel: "stone",
    toastCoopNothing: "You're not carrying the needed resource (wood or stone).",
    shopTitle: "🛒 Pierre's Shop",
    shopHint: "Purchases are paid from the team's shared pot.",
    seedsUsageHint: "Plant a seed on a tilled tile (hoe), then water it (equip the watering can: walk over it, or aim at it) until it's mature. Watering stays valid for 10 real hours; renew it or growth pauses.",
    seedRowSub: (cr) => `Grows in ${Math.round(cr.growMs / 3600000)} h (watered) · sells for ${cr.sell} gold · in stock: `,
    seedCostLabel: (cr) => `${cr.seedNameEn} : ${cr.seedCost} gold`,
    foodRowTitle: (cost) => `Snack: ${cost} gold`,
    foodRowSub: (e, stock) => `Restores ${e} energy · in stock: ${stock}`,
    toolsHeader: "⚒ Tool upgrades (less energy, more efficient)",
    toolUsage: {
      hoe: "Tills a grass tile so you can plant a seed on it.",
      can: "Waters a planted crop so it keeps growing. Watering stays valid for 10 real hours, then it needs renewing (walking over it with the can equipped is enough).",
      axe: "Chops trees to harvest wood. Each level also gives ×1.5 more wood per tree.",
      pick: "Breaks rocks to harvest stone (and sometimes a gem). Each level also gives ×1.5 more stone per rock.",
    },
    toolRowTitle: (name, lvl) => `${name}: level ${lvl}`,
    toolMaxSub: "Maximum level reached!",
    toolUpSub: (lvl, cost) => `Upgrade to level ${lvl}: ${cost} gold`,
    buy1: "×1", buy5: "×5", buyOne: "Buy",
    upgrade: "Upgrade", maxLabel: "MAX",
    // ZIP 403 — the merged carry slot, and the two bag rows that replace the
    // food and rod slots (see the FR block).
    carryMenuTitle: "What do you want to carry?",
    carryNames: { herd: "Herding", hand: "Hand" },
    carrySubs: { herd: "pick up and set down an animal", hand: "place, move, stow an object" },
    bagGearTitle: "Snacks and gear",
    bagFoodRow: (n) => `Snacks × ${n}`,
    bagFoodSub: (e) => `Click to eat one: ${e} energy points.`,
    bagRodRow: "Fishing rod",
    bagRodSub: "Click to get it out, then aim at water. It goes away when you pick another slot.",
    rodArmedTip: "Out: aim at a water tile.",
    rodArmedToast: "🎣 Rod out. Aim at water; pick another slot to put it away.",
    // ZIP 401 — short names for the build variants (see the FR block).
    buildNames: {
      fence: "Fence", wall: "Wall", path: "Paving", lamp: "Lamp post",
      scarecrow: "Scarecrow", grass: "Grass", mill: "Mill",
      cauldron: "Cauldron", bridgeWood: "Wooden bridge",
      bridgeStone: "Stone bridge", bridgeRenovate: "Renovate in stone",
    },
    cycleHint: (key) => `${key} again: next variant`,
    cycleList: (names, cur) => `Cycle: ${names.map(n => (n === cur ? `[${n}]` : n)).join(" → ")}`,
    cycleAlone: "Only one variant in stock: nothing to cycle through.",
    fenceRowTitle: (cost) => `Fence: ${cost} gold per section`,
    fenceRowSub: (n) => `Place or remove a section anywhere (key 4) · in stock: ${n}`,
    lampRowTitle: (cost) => `💡 Lamp post: ${cost} gold`,
    lampRowSub: (n) => `15 real min to build before it's functional, then lights up an area around it at night. Place or remove anywhere (key 4) · in stock: ${n}`,
    scarecrowRowTitle: (cost) => `🌾 Scarecrow: ${cost} gold`,
    scarecrowRowSub: (n) => `10 real seconds to build. Does not block movement. Place or remove anywhere (key 4) · in stock: ${n}`,
    grassRowTitle: (cost) => `🌱 Grass: ${cost} gold per unit`,
    grassRowSub: (n) => `Replant grass on a tilled tile (5 real seconds to build, permanent, cannot be removed) · in stock: ${n}`,
    millRowTitle: (cost) => `🏚️ Mill: ${cost} gold`,
    millRowSub: (n) => `Continuously turns deposited wheat into flour sacks (1 real hour to build) · in stock: ${n}`,
    sucrerieRowTitle: (cost) => `🏚️ Sugar mill: ${cost} gold`,
    sucrerieRowSub: () => `Continuously turns deposited sugar cane into sugar sacks, as long as Jérôme Martial lives there — movable like the other workshops`,
    binTitle: "🧾 Farm stores",
    binHint: "Everything the farm owns. Selling now happens at the fairground market in Valley Town — take the train.",
    cropRowTitle: (name, n) => `${name} × ${n}`,
    cropRowSub: (cr, n) => `${cr.sell} gold each · total ${n * cr.sell} gold`,
    woodRowTitle: (n) => `Wood × ${n}`,
    stoneRowTitle: (n) => `Stone × ${n}`,
    sellAll: "Sell all",
    mapTitle: "🗺️ Valley map",
    mapClose: "Click anywhere or press Esc or M to close",
    mapYou: "you",
    btnSettings: "Settings",
    btnHome: "🏠 House",
    btnMap: "🗺️ Map",
    btnEmployees: "👥 Staff",
    btnChat: "💬 Chat",
    btnLeave: "Leave",
    homeToast: "🏠 Back to the house!",
    homeBlockedToast: "🌑 Can't teleport home from here... find the passage back.",
    darkPassageToast: "🌑 A cold darkness swallows you...",
    darkPassageReturnToast: "☀️ You find daylight again.",
    evilMonsterCaughtToast: "👹 A creature caught you... you wake up at home, injured.",
    // Zip 372: dark-world escape challenge (east gate). The run's own text is
    // NOT here — the challenge is a standalone page served from
    // public/templerun/, with its own FR/EN table (js/strings.js). These keys
    // only cover what the FARM shows around it.
    runEnteredChat: (name) => `🏃 ${name} steps through the gate and makes a run for it!`,
    // Zip 385 — The Muncher (Candy Land). Traduit dans l'esprit (règle zip
    // 371) : « rassasié jusqu'au niveau 10 » deviendrait lourd en anglais.
    candyEnteredChat: (name) => `🍭 ${name} feeds the friendly Candy monster in the middle of the lake.`,
    lugeEnteredChat: (name) => `🛷 ${name} crosses the rainbow bridge and drops into the Great Descent.`,
    candyMonsterAsk: "Feed the friendly Candy monster?",
    candyMonsterSub: "It guards the way into its game at the bottom of the syrup lake.",
    yes: "Yes",
    no: "No",
    lugeFinishToast: (gold) => `🛷 Run complete! +${gold} coins.`,
    lugeCandyToast: (gold) => `🍬 Sweets brought back: +${gold} coins.`,
    lugeAgainToast: "The slope stays open, but the finish bonus waits for your next visit.",
    lugeFinishChat: (name, gold) => `🛷 ${name} rode the Great Descent all the way down! +${gold} coins.`,
    // Zip 386 — see the French block.
    bridgeNoDest: "The bridge ends here. Something will move in one day.",
    // Zip 393 — The Labyrinth (end of the hedge bridge).
    labEnteredChat: (name) => `🕯️ ${name} crosses the hedge bridge and goes down into the labyrinth.`,
    labLostChat: (name, shards) => shards > 0
      ? `🕯️ ${name} never came back out of the labyrinth, but brings ${shards} shard(s).`
      : `🕯️ ${name} never came back out of the labyrinth, empty-handed.`,
    labWonChat: (name, gold) => `🏛️ ${name} made it out of the labyrinth! The lake gives up ${gold} gold.`,
    labLostToast: "🕯️ The dark got you... you wake up at the farm, hurt.",
    labShardsToast: (n) => `💎 +${n} shard(s) brought back from the labyrinth!`,
    // Zip 418 — The Glass Valley (public/crystal/).
    cryEnteredChat: (name) => `❄️ ${name} crosses the crystal bridge and goes down into the valley.`,
    cryLeftChat: (name) => `❄️ ${name} climbs back out of the glass valley.`,
    cryChapterToast: (n) => `📖 Chapter ${n} complete — the valley remembers you.`,
    cryShardsToast: (n) => `💎 +${n} frost shard(s) brought back from the valley!`,
    labWonToast: "😮‍💨 Out. The dark world's air has never felt so breathable.",
    labPrizeToast: (gold) => `🏛️ Way-out bounty: +${gold} gold! (once per visit to the labyrinth)`,
    bagLabTitle: "Labyrinth",
    bagLabBestSub: (n) => n > 0 ? `Best score: ${n}` : "Never went in.",
    candyGoldChat: (name, gold) => `🪙 ${name} fed the Muncher all the way to level 10 — out comes a treasure of ${gold} gold!`,
    candyCatChat: (name) => `🐱 ${name} cleared all fifteen Muncher levels and leaves with a candy cat.`,
    runLostChat: (name, candies) => candies > 0
      ? `🍬 ${name} got caught, but brought back ${candies} candy(ies).`
      : `🍬 ${name} got caught, empty-handed.`,
    runLostToast: "🐺 The pack got you... you wake up on the farm, injured.",
    runCandiesToast: (n) => `🍬 +${n} candy(ies) brought back from the dark world!`,
    // Zip 375. Traduit dans l'esprit et non littéralement (consigne du
    // zip 371) : le français joue sur le contraste entre "tu recules" et
    // "eux n'ont pas bougé", et c'est ce contraste qu'on garde.
    runAmbushToast: "🐺 You back off onto the bank... the pack doesn't.",
    // Zip 377. Traduit dans l'esprit (consigne du zip 371) : le français
    // enchaîne un soulagement puis une urgence, et c'est cet enchaînement
    // qu'on garde — « Phew! » puis un impératif sec.
    runEscapedToast: "😮‍💨 Phew! That was far too close. Now get out of here and find your residents.",
    runEscapedChat: (name, candies) => candies > 0
      ? `🛤️ ${name} took the side track and came back with ${candies} candy(ies), without a scratch.`
      : `🛤️ ${name} took the side track and came back without a scratch.`,
    bagRunTitle: "Escape challenge",
    bagCandiesRow: (n) => `${n} candy(ies)`,
    bagRunBestSub: (n) => n > 0 ? `Best score: ${n}` : "No score yet.",
    drownToast: "🌊 Glub glub... you sank! Carried back home, injured (1 min).",
    boatNoShore: "⛵ Too far from the bank to step out — get closer to the shore.",
    boatNotReady: "⛵ The ship isn't ready to take the water yet.",
    burnToast: "🔥 The bottom is still molten! Burned, carried back home (10 min).",   // zip 449 : voir la note côté français
    mapDarkPassage: "Dark passage",
    mapTownStation: "Station",          // zip 426 : voir la note côté français
    mapTownPlaza: "Main square",
    mapTownCourt: "Courthouse",
    mapTownHall: "Town hall",
    mapTownChurch: "Church",
    mapTownPark: "Park",
    mapTownOrchard: "Orchard",
    mapTownMarket: "Fairground",
    mapTownCemetery: "Cemetery",
    mapTownLake: "Lake",
    mapTownBelvedere: "Belvedere",
    healPartialChat: (healer, hurt, mn) => `${healer} applied a bandage to ${hurt}: ${mn} min of rest left (another bandage can help!)`,
    // Protection salve (2026-07 chantier): buyable at the shop, repels evil
    // creatures and makes the player immune to them for 10 minutes, so they
    // can explore/farm the evil side without worry.
    salveRowTitle: "🧴 Protection salve",
    salveRowSub: (n) => `When used: repels evil creatures and grants immunity to them for 10 min. Crafted at the cauldron (⚗️). In stock: ${n}`,
    salveUseLabel: "Use",
    salveUsedToast: "🧴 Salve applied: immune to evil creatures for 10 minutes.",
    toastNoSalve: "You need a protection salve (craft it at the cauldron).",
    immunityBanner: (t) => `🧴 Invisible and immune to evil creatures — ${t}`,
    // Protection salve cauldron (2026-07 chantier): cooperative recipe (1
    // amethyst + 2 trout + 1 pike).
    promptCauldron: "[E] Cauldron (brew)",
    promptCauldronIgnite: "[E] Light the cauldron 🔥",
    promptCauldronBrewing: (s) => `⏳ Brewing in progress... ${s}s`,
    promptCauldronCollect: "[E] Collect the salve",
    promptSalveDeposit: "[E] Deposit fish at the cauldron",
    promptSalveBrew: "[E] Start brewing",
    salveDeposited: (who, n, res) => `${who} deposits ${n} ${res} at the cauldron.`,
    salveIgnited: (who) => `🔥 ${who} lights the fire under the cauldron! Brewing in progress (1 min)...`,
    salveBrewed: (who) => `⚗️ ${who} collects a protection salve at the cauldron!`,
    // 480 bis — Star Essence, same trio of lines as the salve.
    oreDeposited: (who, n) => `${who} deposits ${n} comet shard${n > 1 ? "s" : ""} at the cauldron.`,
    lureIgnited: (who) => `🔥 ${who} lights the fire under the cauldron! Star Essence brewing (1 min 30)...`,
    lureBrewed: (who) => `⚗️ ${who} collects a Star Essence at the cauldron!`,
    toastFarCauldron: "Get closer to the cauldron to deposit or brew.",
    toastCauldronBrewing: "⏳ Already brewing, come back in a moment.",
    toastCauldronNothingToCollect: "Nothing to collect at the cauldron right now.",
    toastCauldronNeedTorch: "Light your torch first to start the fire under the cauldron!",
    toastCauldronHasEnough: "The cauldron already has all the fish it needs for this recipe.",
    cauldronNeedAmethyst: "The common gem reserve is missing an amethyst to start this recipe.",
    // Cauldron menu (2026-07 chantier, revamp): "deposit ingredients? Yes/No"
    // (becomes "Complete" once the team already started), then a "Ready!"
    // button once the recipe is complete — actually lighting the fire now
    // happens in the world (click/E on the cauldron, torch in hand), not
    // from a menu button. See cauldronPlaceIngredients/igniteCauldron/
    // tryOpenNearby, FermeGame.js.
    cauldronMenuTitle: "⚗️ What would you like to brew?",
    cauldronMenuHint: "Gather the ingredients on the scroll, then go light your torch and click the cauldron to start the fire.",
    cauldronProductSalveName: "🧴 Magic salve",
    cauldronProductLureName: "✨ Star Essence",
    scrollIngAmethyst: (have, need) => `${need} amethyst from the common reserve (${have}/${need})`,
    scrollIngTrout: (dep, need) => `${need} trout poured into the cauldron (${dep}/${need})`,
    scrollIngPike: (dep, need) => `${need} pike poured into the cauldron (${dep}/${need})`,
    scrollIngOre: (dep, need) => `${need} comet shard${need > 1 ? "s" : ""} from the evil world (${dep}/${need})`,
    cauldronScrollEffect: "“Who anoints their skin with it walks a while among the shadows, and the creatures of the night turn away from their path.”",
    cauldronLureScrollEffect: "“What the vial holds, no star flees any longer: it comes on its own, in measured steps.”",
    cauldronAddBtn: "🫗 Add the ingredients",
    cauldronReadyBtn: "✅ Ready!",
    cauldronReadyHint: "Recipe complete — go light your torch, then click the cauldron to start brewing!",
    cauldronIgniteHint: "Torch in hand, click the cauldron to light the fire and start brewing (1 min).",
    promptEvilCauldronPickup: "[E] Pick up the cauldron",
    // Zip 385 — see the French block: the last two fix a pre-existing
    // fall-through to promptBin ("sell at the bin") on trinkets and the maze
    // chest, live since zip 235.
    promptMazePrize: "[E] Open the chest",
    promptPassagePickup: "[E] Pick up the trinket",
    evilCauldronPickedToast: "⚗️ You picked up the cauldron! Bring it back to the farm and place it anywhere (Build tool).",
    toastCauldronAlreadyTaken: "This cauldron has already been picked up.",
    promptEvilShardsPickup: "[E] Pick up the comet shards",
    evilShardsPickedToast: "✨ You picked up a pile of comet shards! Prepare them with an amethyst at the cauldron for the Star Essence.",
    toastShardsAlreadyTaken: "This pile of comet shards has already been picked up.",
    toastNoCauldronStock: "You aren't carrying a cauldron to place.",
    toastCauldronNotEmpty: "Empty the cauldron (deposited fish) before moving it.",
    cauldronRowTitle: "⚗️ Cauldron",
    cauldronRowSub: "Brought back from the evil world. Place it anywhere with the Build tool: it's then used to craft the protection salve or the Star Essence.",
    toastNoFishToDeposit: "You're not carrying any trout or pike to deposit.",
    toastNoOreToDeposit: "You're not carrying any comet shards to deposit.",
    toastCauldronMissing: "Missing ingredients (1 amethyst, 2 trout, 1 pike), or the cauldron isn't placed yet.",
    troutLabel: "trout",
    pikeLabel: "pike",
    help1: "WASD/Arrows: move (8 directions) · Space/Click: use tool",
    help2: "1-8: tools (5 = rod, 6 = build) · E: interact · Q: talk · F: horse · T: chat · M: map",
    toastTired: "Too tired! Eat a snack or wait for tomorrow.",
    toastFarShop: "Get closer to the shop!",
    toastFarBin: "Get closer to the sell bin!",
    toastNoGold: "Not enough gold!",
    toastToolMax: "Tool already at max level!",
    toastNoFence: "Out of fence sections, buy more at the shop!",
    toastNoWood: "Not enough wood!",
    toastNoStone: "Not enough stone!",
    toastNoWallStock: "Out of wall sections, craft more from stone!",
    toastNoPathStock: "Out of path tiles, craft more from stone!",
    toastNoLampStock: "Out of lamp posts, buy more at the shop!",
    toastNoScarecrowStock: "Out of scarecrows, buy more at the shop!",
    toastNoGrassStock: "Out of grass, buy more at the shop!",
    toastNoMillStock: "Out of mills, buy one at the shop!",
    toastMillNotEmpty: "Empty the mill first (it still has wheat to grind) before removing it.",
    toastNoWheatToDeposit: "You don't have any harvested wheat to deposit.",
    toastMillFull: "The mill is full of wheat, wait for it to grind some before depositing more.",
    // ZIP 402 — the five sentences the mill was missing (see the FR block).
    toastMillPlaced: "Mill placed. It needs about an hour of building before it runs.",
    toastMillTaken: "Mill back in your bag.",
    toastMillGround: "A mill goes on grass or tilled soil, not here.",
    toastMillOccupied: "Something is already on this tile.",
    toastMillOnCrop: "A crop is growing here: harvest it first.",
    toastNoMillBuilt: "No finished mill on the farm. Place one and let the building finish.",
    toastMillBuilding: "This mill is still being built. The countdown above it tells you how long is left.",
    millStoppedToast: "🌾 The mill has stopped — it's out of wheat to grind.",
    // Sugarhouse (sugar cane chantier): exact mirror of the 4 mill toasts above.
    toastNoSucrerieStock: "Out of sugarhouses, buy one at the shop!",
    toastSucrerieNotEmpty: "Empty the sugarhouse first (it still has cane to press) before removing it.",
    sucrerieStoppedToast: "🎋 The sugarhouse has stopped — it's out of cane to press.",
    toastNoCaneToDeposit: "You don't have any harvested sugar cane to deposit.",
    toastSucrerieFull: "The sugarhouse is full of cane, wait for it to press some before depositing more.",
    toastActionFailed: "Couldn't do that, try again.",
    toastNewDay: (day) => `☀ Day ${day}! Energy restored.`,
    chatWelcome: "Welcome to the farm! Press T to chat with your team.",
    chatToolUp: (name, lvl) => `${name} upgraded to level ${lvl}!`,
    chatSell: (gain, total) => `Sale: +${gain} gold! Shared pot: ${total} gold`,
    chatNewDay: (day) => `Day ${day}, have a great day on the farm!`,
    chatStormyDay: "The sky is turning grey... storm and rain all day, grab a raincoat!",
    chatJoin: (name) => `${name} joined the farm.`,
    chatLeave: (name) => `${name} left the farm.`,
    fxWood: (n) => `+${n} wood`,
    fxStone: (n) => `+${n} stone`,
    fxMagicOre: (n) => `+${n} comet shard${n > 1 ? "s" : ""}`,
    fxHarvest: (name, n) => `+${n || 1} ${name.toLowerCase()}`,
    fxGold: (n) => `+${n} gold`,
    fxEat: "Yum!",
    chatSend: "Message… (Enter to send)",
    hireLabel: "Hire",
    gregRowTitle: (cost) => `🧑‍🌾 Hire Greg: ${cost} gold`,
    gregRowSub: "Field worker — auto-waters everything every 10h, and carries out your till/plant orders.",
    gregNotHiredSub: "2-day contract",
    gregHiredUntil: (h) => `Hired — ${h}h left on contract`,
    gregOrderBtn: "Give an order",
    gregOrderTitle: "Order Greg to till, plant then water",
    gregOrderCountLabel: "Number of seeds",
    gregOrderCost: (n) => `Cost: ${n} gold`,
    gregOrderHint: "Greg will till smartly around wherever you're standing when you launch the order: he tops up tiles already planted with the same crop first, then plants new tiles (up to 5 seeds each) until the requested seeds are used up.",
    gregOrderArmBtn: "Choose this order",
    gregOrderFab: "📍 Send Greg here",
    /* ZIP 404 — Greg plants orchards, and fells the ones you mark. */
    gregOrderSaplingTitle: "Orchard saplings",
    gregOrderSaplingHint: (max) => `Greg drops one sapling per free tile, packed tight around wherever you launch the order. No tilling, no watering: an orchard needs neither. The farm only takes ${max} orchards in all — he stops dead at the cap and says so.`,
    gregOrderSaplingCountLabel: "Number of saplings",
    gregOrderSaplingRoom: (n) => `Room left on the farm: ${n}`,
    /* ⚠️ FELLING IS IRREVERSIBLE: hours of growth and up to 1,400 gold. Hence
       Guillaume's click-selection rather than a blind order — you point, you
       count, you re-read, THEN you confirm. */
    gregOrderChopBtn: "🪓 Mark orchards to fell",
    gregChopArmHint: "Click the orchards to fell. Click again to unmark one.",
    gregChopCount: (n) => `${n} orchard${n > 1 ? "s" : ""} marked`,
    gregChopFab: "🪓 Send Greg to fell them",
    gregChopNone: "That's not one of your orchards.",
    toastGregChopDone: (n) => `🪓 Greg is on it: ${n} orchard${n > 1 ? "s" : ""} to fell.`,
    toastGregNoOrchardRoom: "The farm already has a full orchard — Greg has nowhere left to plant!",
    gregOrderCancel: "Cancel order",
    toastGregNotHired: "Greg isn't hired (anymore)!",
    toastGregBusy: "Greg is still finishing an order — wait until he's done!",
    toastGregNoRoom: "Greg can't find free space for that!",
    toastGregNoFertilizer: "No fertilizer left in stock!",
    gregCoffeeBtn: "☕ Coffee (SuperGreg)",
    toastGregCoffeeCooldown: "Greg still needs to recover before another coffee!",
    toastNoCoffee: "No Ethiopian coffee left in stock!",
    soanRowTitle: (cost) => `🎣 Hire Soan: ${cost} gold`,
    soanRowSub: "Fisher — fishes at the river on your order, can stay there all day.",
    soanNotHiredSub: "24h contract",
    soanHiredUntil: (h) => `Hired — ${h}h left on contract`,
    soanOrderBtn: "Send fishing",
    soanRecallBtn: "Recall",
    soanStatusRoam: "Wandering, waiting for orders",
    soanStatusToRiver: "Heading to the river",
    soanStatusFishing: "Fishing at the river",
    soanStatusBreak: "On break, taking a walk",
    toastSoanNotHired: "Soan isn't hired (anymore)!",
    toastSoanNoRiver: "Soan can't find a reachable river!",
    soanCoffeeBtn: "☕ Coffee (SuperSoan)",
    toastSoanCoffeeCooldown: "Soan still needs to recover before another coffee!",
    beekeeperOrderBtn: "Send to harvest",
    beekeeperRecallBtn: "Recall",
    beekeeperStatusWorking: "Harvesting honey at the hive",
    beekeeperStatusBreak: "On break, taking a walk",
    beekeeperStatusIdle: "Waiting for orders",
    toastBeekeeperNoHive: "The beehive isn't built yet!",
    toastBeekeeperBusy: "René is already harvesting!",
    beekeeperBreakChat: (name) => `${name} takes a break.`,
    // Next zip (Guillaume's request): "SuperRené" — coffee makes him work
    // non-stop (no breaks) and harvest honey much faster for 5h.
    reneCoffeeBtn: "☕ Coffee (SuperRené)",
    toastReneCoffeeCooldown: "René still needs to recover before another coffee!",
    // "Super Tristan" (2026-07, comic coffee effect): 20 coffees at once,
    // SuperGreg-style (no multi-step gauge like René's).
    tristanCoffeeBtn: "☕ Coffee ×20 (SuperTristan)",
    toastTristanCoffeeCooldown: "Tristan still needs to recover before another coffee!",
    toastTristanNotHere: "Tristan hasn't moved in yet!",
    employeesTitle: "👥 Active staff",
    employeesHint: "Employees currently under contract, with direct access to give them an order.",
    employeesGregName: "Greg",
    employeesSoanName: "Soan",
    fertilizerShopLabel: "Fertilizer",
    fertilizerShopBuy: (cost) => `Buy (${cost} gold)`,
    fertilizerShopStock: (n) => `Stock: ${n}`,
    fertilizerOrderBtn: "Spread fertilizer",
    fertilizerOrderTitle: "Order Greg to spread fertilizer",
    fertilizerOrderCost: "Cost: 1 fertilizer (5x5 area)",
    fertilizerOrderHint: "Greg will speed up the growth of every already-planted crop in a 5x5 square around wherever you're standing when you launch the order.",
    fertilizerOrderArmBtn: "Choose this order",
    fertilizerOrderAvailable: (n) => `Fertilizer available: ${n}`,
    // --- Zip 235 ---
    berryLabel: "Berries",
    /* ⚠️ ZIP 404 — see the French block: two different things were called
       "fruit". This one is the apple picked off a forest tree (18 gold); the
       orchard fruit lives under `binFruitsTitle` (70 to 110 gold). Now that
       both sell in the SAME place, one shared word would be unreadable. */
    fruitLabel: "Wild apples",
    perPiece: (p) => `${p} gold / each`,
    toastBerriesPicked: (n) => `🫐 +${n} berrie(s)`,
    toastFruitPicked: (n) => `🍎 +${n} wild apple(s)`,
    toastFruitCooldown: "This tree has already been picked today.",
    passageWorldToast: (name) => `🌀 This week the passage leads to: ${name}.`,
    // --- Zip 392: developer menu (Cmd/Ctrl+Shift+X, host only) ---
    /* ZIP 398 — orchards, fruit, punnets, products, pet names. */
    orchardTip: (name) => `${name} — click a grass or soil tile to plant it. It will stay.`,
    orchardShopTitle: "Orchard saplings",
    /* ⚠️ ZIP 404 — the key number is a PARAMETER now, not text. 401 fixed
       "key 8" into "key 6", 403 had to fix "key 6" into "key 4": a text that
       spells out a key number is a text that goes stale. This one gets its
       number from `SLOT_ORDER`, so it can no longer lie. */
    orchardShopHint: (key) => `Plant them once. They stay, and bear fruit every season — no replanting, ever. Pick them from the Seeds slot (key ${key}), then click a grass or soil tile.`,
    orchardRowSub: (mature, cycle, min, max, fruit, seasons) =>
      `Ripe in ${mature} h · ${min}–${max} ${fruit.toLowerCase()} every ${cycle} h · ${seasons}`,
    orchardOwned: (n) => `In store: ${n}`,
    seasonName: (k) => ({ spring: "spring", summer: "summer", autumn: "autumn", winter: "winter" }[k] || k),
    toastOrchardBusy: "That tile is already taken.",
    toastOrchardGround: "You need soil or grass to plant an orchard.",
    toastOrchardMax: "The farm already has a full orchard.",
    toastOrchardNoSapling: "You have no such sapling in store.",
    toastOrchardYoung: "This plant is still too young.",
    toastOrchardNotReady: "Nothing to pick yet — it is growing its fruit back.",
    toastOrchardOffSeason: "This fruit is out of season.",
    toastFruitsPicked: (n, fruit) => `🧺 ${n} ${fruit.toLowerCase()}${n > 1 ? "s" : ""}! The tree stays.`,
    /* ZIP 404 — orchard fruit moved down to the SELLING BIN, next to the crops,
       the fish and the berries. The bag keeps what you MAKE (jams, yoghurts,
       tart), because a workshop is not a stock. */
    binFruitsTitle: "Orchard fruit",
    binNoFruits: "No orchard fruit yet. Plant an orchard: it gives without replanting.",
    seedMenuOrchardTitle: "Orchard saplings",
    fruitRowSub: (unit, size, price) => `${unit} gold each · punnet of ${size}: ${price} gold (+25%)`,
    sellOneBtn: (gold) => `Sell ${gold}`,
    sellPunnetBtn: (gold) => `Punnet ${gold}`,
    punnetShort: "Not enough to fill a punnet.",
    toastPunnetShort: "Not enough to fill a punnet.",
    fruitSoldChat: (who, fruit, gold) => `${who} sold ${fruit.toLowerCase()} (+${gold} gold).`,
    punnetSoldChat: (who, fruit, gold) => `${who} sold a punnet of ${fruit.toLowerCase()} (+${gold} gold).`,
    bagProductsTitle: "Fruit products",
    productRowSub: (nf, fruit, others, gold) =>
      `${nf} ${fruit.toLowerCase()}${nf > 1 ? "s" : ""}${others ? " + " + others : ""} → ${gold} gold`,
    ingSugar: (n) => `${n} sugar`,
    ingFlour: (n) => `${n} flour`,
    ingMilk: (n) => `${n} milk`,
    ingEgg: (n) => `${n} egg`,
    productMakeBtn: "Make",
    productLack: (what) => ({ fruit: "Not enough fruit", sugar: "No sugar", flour: "No flour", milk: "No milk", egg: "No eggs" }[what] || "Missing an ingredient"),
    toastProductNoFruit: "Not enough fruit for that recipe.",
    toastProductNoSugar: "The farm is short on sugar.",
    toastProductNoFlour: "The farm is short on flour.",
    toastProductNoMilk: "You need milk.",
    toastProductNoEgg: "You need eggs.",
    toastProductMade: (name) => `🍯 ${name}!`,
    productSoldChat: (who, name, gold) => `${who} sold ${name.toLowerCase()} (+${gold} gold).`,
    bagNameBtn: "Name",
    bagRenameBtn: "Rename",
    petNameTitle: "Name this companion",
    petNameHint: (max) => `Up to ${max} characters. Leave empty to go back to its species name.`,
    petNameConfirm: "Give this name",
    petNameClear: "Clear the name",
    petNamedToast: (name) => `🐾 Its name is ${name}.`,
    devMenuTitle: "🛠️ Developer menu",
    devWorldChat: (who, land) => `${who} forced the passage to ${land}.`,
    devRotationChat: (who) => `${who} restored the normal passage rotation.`,
    devMenuHint: "Open to any player who knows the shortcut — the shortcut IS the secret. World changes are arbitrated by the host and visible to everyone.",
    devWorldSection: "Passage land",
    devWorldNatural: (name, day) => `Left alone, the passage would lead today (day ${day}) to: ${name}.`,
    devDestRun: "Bridge: the escape challenge",
    devDestCandy: "Bridge: the Sweet Tooth",
    devDestNone: "Bridge: no destination yet",
    devForceBtn: "Force",
    devRotationTitle: "Back to the normal rotation",
    devRotationSub: (d) => `The passage follows the game day again, ${d} days per land.`,
    devRotationBtn: "Restore",
    // --- Zip 392: collapsible notification panel ---
    notifPanelLabel: (n) => n > 1 ? `${n} notifications. Hover to see them, click to keep them open.` : "1 notification. Hover to see it, click to keep it open.",
    devHealSection: "Injury",
    devHealTitle: "Heal yourself instantly",
    devHealNone: "You're not injured.",
    devHealRemaining: (mn) => mn > 1 ? `Forced rest: ${mn} minutes left.` : "Forced rest: under a minute left.",
    devHealBtn: "Heal me",
    devHealToast: "🛠️ Injury healed.",
    devTeleportSection: "Teleport",
    devTeleportHint: "Moves you only. Everyone else stays where they are.",
    devTeleportName: (k) => ({
      farm: "🏠 The farm",
      passage: "🌑 By the passage",
      town: "🚉 Valley Town — the station",
      townPlaza: "⛲ Valley Town — the plaza",          // zip 425
      townCourt: "⚖️ Valley Town — the courthouse",
      townHall: "🏛️ Valley Town — the town hall (steps)",
      townBelvedere: "🔭 Valley Town — the belvedere",
      townBoutique: "👗 Valley Town — Upper Town",
      townMarket: "🎪 Valley Town — the fairground",      // zip 426
      townLake: "🏞️ Valley Town — the river and the pier",
      townPasse: "⛵ Valley Town — the narrows (way out to sea)",
      townCrater: "☄️ Valley Town — the crater",
      court: "⚖️ Courthouse — the hall",
      courtUpper: "🗂️ Courthouse — first floor",
      courtBasement: "🔒 Courthouse — basement",
      hall: "🏛️ Town hall — the hall",
      hallUpper: "📜 Town hall — upper floor",
      church: "⛪ Church — the nave",
      churchLoft: "🎹 Church — the organ loft",
      churchTower: "🔔 Church — the belfry",            // zip 444
      world: "🌀 The current land",
      bridge: "🌉 Foot of the bridge",
    }[k] || k),
    devWorldForcedToast: (name) => `🛠️ The passage now leads to: ${name}.`,
    devWorldRotationToast: "🛠️ Rotation restored: the passage follows the game day again.",
    devTeleportToast: (name) => `🛠️ Teleported: ${name}.`,
    devBanner: (name) => `Forced land: ${name}`,
    devBannerTitle: "The passage is forced from the developer menu. Any player can restore the rotation with Cmd/Ctrl+Shift+X.",
    passageLootToast: (gold) => `✨ +${gold} gold!`,
    passagePetToast: (name) => `🐾 You tamed a ${name}!`,
    mazePrizeToast: (gold) => `🏆 Maze prize: +${gold} gold!`,
    candySpeedToast: "🍬 Speed candy: +50% for 1 min!",
    sleepInHouseToast: "🛏️ Sleep well in Valley Town.",
    townHouseStyleChangeBtn: (n) => `Facade style: ${n} / 10 (R to change)`,
    meetAtHallBtn: "Meet at townhall",
    seasonRotate: (name) => `🌦️ New season: ${name}.`,
    // --- Zip 236: personal bag ---
    bagBtn: "Bag",
    bagTitle: "My bag",
    bagPetsTitle: (n, max) => `Companions (${n} / ${max})`,
    bagNoPets: "No companions yet. Catch one in the dark passage!",
    bagDecorTitle: "Decorations",
    bagNoDecor: "No decorations yet. Visitors gift them after a deal.",
    bagDecorHint: "Equip the hand tool (8) to place them on the farm or in town.",
    bagReleaseBtn: "Release",
    bagReleasedToast: (name) => `👋 ${name} returns to the wild.`,
    bagPetsFull: (max) => `Bag full (${max} companions). Release one to catch another.`,
    // Zip 368: bag capacity (C.MAX_PETS) and walking limit (C.MAX_PETS_WALKING)
    // are two separate caps — a stowed companion is still yours, it just
    // doesn't follow you around.
    bagPetsWalkingLine: (n, max) => `Out walking: ${n} / ${max}. The others wait in your bag.`,
    bagPetWalking: "Out walking",
    bagPetStowed: "In the bag",
    bagWalkBtn: "Walk",
    bagStowBtn: "Stow",
    bagWalkFull: (max) => `Already ${max} companions out walking. Stow one to take another.`,
    bagHealTitle: "Healing",
    bagSalveRow: (n) => `Immunity salve × ${n}`,
    bagSalveSub: "Use it before entering the dark passage.",
    bagHealKitRow: (n) => `Bandaids × ${n}`,
    bagHealKitSub: "Heal another injured player.",
    bagEnergyTitle: "Energy",
    bagEnergyRow: (e, max) => `${e} / ${max}`,
    bagSleepHint: "Sleep at home (farm or Valley Town, press E) to recharge without buying snacks.",
    petCaughtToast: (name) => `🐾 ${name} joins your bag!`,
    // --- Zip 237: barter + common pets ---
    giftUseful: (n, item) => `${n} ${item}`,
    swapTitle: (name) => `${name} offers a trade`,
    swapWantLabel: "They want:",
    swapGiveLabel: "In return:",
    swapAcceptBtn: "Trade",
    swapNotEnough: "You don't have enough goods for this trade.",
    swapDone: (name, give) => `Trade done with ${name}: you get ${give}!`,
    notifSwap: "offers a trade",
    swapPocket: (have, n) => `${have} / ${n} in pocket`,
    /* ---- Zip 388: potted flowers, selling decor, living companions ---- */
    decorUnitPrice: (gold) => `Resale: ${gold} gold each`,
    decorSellOne: "Sell 1",
    decorSellAll: (n) => `Sell all ${n}`,
    decorSellTitle: "Sell a decoration",
    decorSellSub: (name, n, total) => `Sell ${n} × ${name} for ${total} gold?`,
    decorSellWarn: "Decorations are gifts: you cannot buy them back.",
    decorSellConfirm: "Sell",
    decorSoldToast: (n, name, gold) => `💰 Sold ${n} × ${name} for ${gold} gold.`,
    bagDecorSellHint: (n) => `${n} decoration${n > 1 ? "s" : ""} in your bag. Sell the ones piling up — the gold goes to the shared purse.`,
    cancelBtn: "Cancel",
    petOfferTitle: "A visitor offers you a companion",
    petOfferSub: (name) => `They are offering you ${name}. Up to you.`,
    petOfferHint: (rel) => `Only visitors who have become friends (${rel} friendship points) will hand over an animal.`,
    petOfferAccept: "Accept",
    petReleaseTitle: "Release this companion?",
    petReleaseSub: (name) => `${name} will go back to living in the wild.`,
    petReleaseWarn: "This is permanent: it will not come back.",
    petReleaseConfirm: "Release",
    bagWalkAllBtn: "Walk them all",
    bagStowAllBtn: "Stow them all",
    bagWalkFullBtn: (max) => `${max} already out`,
    // Zip 427 — Valley Town prompts.
    mapTownBoutique: "Maison Garfield",
    mapTownSalon: "Salon",
    devResidentsSection: "Populate the farm",
    devResidentsHint: (max) => `Move residents in at once (${max} max). For seeing Valley Town come alive without the wait.`,
    devResidentsBtn: (n) => `${n} residents`,
    devResidentsChat: (who, n) => `🛠️ ${who} moved residents in: the farm now has ${n}.`,
    devMoneySection: "Money",
    devMoneyHint: "Give yourself gold to test without having to earn it. Arbitrated by the host, like everything else.",
    devMoneyBtn: (n) => `+${n} gold`,
    devMoneyChat: (who, n) => `🛠️ ${who} gave themselves ${n} gold.`,
    devBuildSection: "Constructions & crops",
    devBuildHint: "Instantly finishes anything in progress (lamp posts, scarecrows, mill, cauldron, grass regrowth, crops, animal production). For testing a feature without the wait.",
    devBuildBtn: "Finish everything",
    devBuildChat: (who, n) => n > 0 ? `🛠️ ${who} finished ${n} construction${n > 1 ? "s" : ""}/crop${n > 1 ? "s" : ""} in progress.` : `🛠️ ${who} looked for constructions in progress: there were none.`,
    salonPlate: "OPENING SOON",
    promptTownBoutique: "E: enter Maison Garfield",
    promptTownBoutiqueShut: "E: Maison Garfield (closed)",
    promptTownSalon: "E: hair salon (opening soon)",
    promptTownNews: "E: read the notice board",
    promptTownBench: "E: sit down",
    promptTownWish: "E: make a wish",
    promptTownKiosk: "E: listen to the bandstand",
    promptTownPier: "E: skip stones",
    promptTownView: "E: look over the valley",

    /* Zip 427 — Valley Town social life (see the FR block for the design note:
       lines are picked from a SHARED seed, never sent over the wire). */
    townActLines: {
      sit: ["This is the good life.", "Five minutes. Just five.", "My feet, at my age...", "Busy today, isn't it.", "Not moving from here till noon.", "You see the whole town pass by from this bench."],
      fountain: ["The water is cold.", "They say it grants wishes. They say a lot of things.", "It has been running longer than all of us.", "We used to toss coins in, as kids.", "Wouldn't drink from it, if I were you."],
      kiosk: ["They should play more often.", "This reminds me of something.", "One day I'll get up there.", "There used to be a band, you know.", "This town could use more music."],
      stall: ["Too dear. As always.", "Nothing riper than that?", "I'll take both. No, all three.", "It's the season, and yet.", "Come back tomorrow, it'll be better."],
      well: ["That one's good water.", "Wants dredging, one of these days.", "Nobody really uses it anymore.", "Mind the rim, it's slippery."],
      grave: ["Hello, you.", "We think of you, you know.", "A year already.", "I come by every Sunday."],
      pier: ["Anything biting out there?", "The lake is flat as a plate.", "I like it here when nobody's about.", "Got a rod, at least?", "This jetty creaks more than it used to."],
      view: ["You can see the farm from up here.", "The whole valley. All ours.", "Worth the climb.", "On a clear day you can see the bell tower.", "Don't get too close to the edge."],
      window: ["I'd never dare wear that.", "One day. One day.", "Have you SEEN the price?", "Must have cost a fortune.", "Look, the same one in blue."],
      board: ["Well now.", "Another meeting...", "Ah, that one's new.", "They change the notice every week.", "There's one about you, actually."],
      statue: ["He had more hair than that.", "Nobody even remembers who it was.", "Someone should clean that up.", "The pigeons don't show him much respect."],
      pray: ["A bit of quiet.", "Thank you for the harvest.", "To each their own way.", "Two minutes of peace does you good."],
      // Zip 428 : les six quartiers rendus vivants (voir E.townSpots).
      shore: ["The far bank always looks greener.", "Some days I'd just stay here.", "Smells of silt, and that's fine by me.", "Looks like the water's dropped.", "There used to be a boat here."],
      pond: ["Twice as many ducks this year.", "The water's low.", "They say there are carp in there.", "Don't overfeed them.", "A heron comes by some mornings."],
      orchard: ["Ripe in ten days or so.", "Nobody ever prunes this one.", "One each, that's the rule.", "Don't take the green ones.", "The owner looks the other way."],
      craft: ["They're hammering away in there.", "That lad does good work.", "I should have learned a trade like that.", "Noisy little workshop, that.", "Never a day off, that one."],
      fair: ["Bigger than I remembered.", "Trestles go up on Thursday.", "We'll have to come back on a fair day.", "Going to need hands to set it all up.", "Rained all day last year."],
      flowers: ["Who looks after these, anyway?", "They're holding up well this year.", "You can smell them from here.", "New this year, apparently.", "Don't pick them, someone's watching."],
      stroll: ["Right then.", "Which way was it again?", "Nice out.", "Three more streets.", "Not looking for anything in particular.", "Nice to get some air."],
      talk: [],
    },
    // Zip 431 — see the FR block for the design note: local random pick, no
    // network sync, only the pressing player sees this card.
    townChatGreet: ["Oh, hello there!", "Ah, it's you.", "Nice day for a walk, isn't it?", "Been a while.", "You're from the farm, aren't you?", "What brings you round here?", "Good to see you.", "I think we've met."],
    townChatGeneric: ["Nothing new around here.", "The town hasn't changed much.", "Same old routine.", "You should come back on market day.", "We manage, one way or another.", "Nothing much ever happens here, and that's just fine."],
    townMeetAlly: [
      "There you are! Down here too?",
      "I was just looking for you.",
      "Drink before the train?",
      "Here, keep this. I'll make you another.",
    ],
    townMeetFoe: [
      "Oh. You.",
      "Just passing. Not staying.",
      "We are not doing this here.",
      "It's a big town. Take the other pavement.",
    ],
    townMeetNeutral: [
      "Fine day to come down.",
      "Farm letting you breathe too?",
      "We see each other daily and never speak.",
      "Have you seen the new shop up top?",
    ],
    townGuestRel: {
      spouse: "partner", son: "son", daughter: "daughter", brother: "brother", sister: "sister",
      grandmother: "grandmother", grandson: "grandson", cousin: "cousin", assistant: "assistant",
    },
    townGuestOf: (rel, who) => `${who}'s ${rel}`,
    townGuestLines: [
      "So this is Valley Town.",
      "I'd heard about it. It's bigger than I thought.",
      "Wait for me!",
      "Can I go up the steps? Can I?",
      "A whole day without milking anything. Luxury.",
    ],
    townTripChat: (n) => `🚂 ${n} is heading down to Valley Town for a while.`,
    townTripBackChat: (n) => `🚂 ${n} is back from Valley Town.`,
    townTripGuestChat: (n, g) => `🚂 ${n} is off to Valley Town, with ${g} in tow.`,
    newsBoardTitle: "Notice board",
    newsBoardSub: "Valley Town square",
    newsBoardInTown: "In town right now",
    newsBoardNobody: "Nobody about. The square is yours.",
    newsBoardWith: (g) => `with ${g}`,
    newsBoardTies: "Word around town",
    newsBoardAlly: (a, b) => `${a} and ${b} are inseparable.`,
    newsBoardFoe: (a, b) => `${a} and ${b} no longer speak.`,
    newsBoardNoTies: "Nothing to report. For now.",
    newsBoardNotices: "Posted this month",
    newsBoardSalon: "Hair salon: opening soon, Upper Town.",
    newsBoardBoutique: "Maison Garfield: by appointment, Upper Town.",
    newsBoardBoutiqueSoon: "Maison Garfield: premises leased. The owner has not moved in yet.",
    newsBoardCourt: "Courthouse: services being installed.",
    newsBoardClose: "Close",
    boutiqueTitle: "Maison Garfield",
    boutiqueSub: "Upper Town — by appointment",
    boutiqueLockedToast: "🔒 The premises are leased, the trunks are inside, and Carla Garfield still lives elsewhere. Make her a resident of the valley and the door will open.",
    boutiqueSlotHat: "Hats",
    boutiqueSlotScarf: "Scarves",
    boutiqueSlotOutfit: "Outfits",
    boutiqueSlotTint: "Colours",
    boutiqueBuy: "Buy",
    boutiqueWear: "Wear",
    boutiqueWorn: "Worn",
    boutiqueRemove: "Take off",
    boutiqueOwned: "Owned",
    boutiqueNoGold: "Not enough gold. Carla did not look surprised.",
    boutiqueBought: (n) => `✨ ${n} — it's yours.`,
    boutiqueNothing: "None",
    boutiqueGold: (g) => `${g} gold`,
    boutiqueClose: "Leave",
    carlaShopLines: [
      "At last, someone who found the right address.",
      "Touch, touch. You cannot damage anything you could not pay for.",
      "It is not expensive: it is CORRECT.",
      "No, I do not do discounts. Leo, we do not do discounts.",
      "You wear that better than half my clients in the capital.",
    ],
    leoUpsellLines: [
      "Madame is right. Madame is always right.",
      "Excellent choice! Well — Madame chose it.",
      "Shall I wrap it? I'll wrap it. I'm wrapping it.",
      "Madame has the same one. Nicer, obviously.",
      "It is a unique piece. We have fourteen.",
    ],
    leoRole: "Leo, at the till",
    salonToast: "💈 Hair salon — opening soon. The scissors are here; the hairdresser is not.",
    wishTitle: "Make a wish",
    wishToast: (c) => `🪙 You toss ${c} gold into the fountain.`,
    wishNoGold: (c) => `A wish costs ${c} gold. The fountain does not do credit.`,
    wishCooldown: "The fountain has heard you already today. It hates being nagged.",
    wishBack: (g) => `✨ A coin floats up. Then another. ${g} gold.`,
    wishNothing: "✨ Nothing happens. So it was probably the right wish.",
    spyglassLines: [
      "🔭 From here the farm is a green square with smoke over it. It's lovely.",
      "🔭 You see the train long before you hear it.",
      "🔭 The whole valley fits in one breath.",
      "🔭 Someone left a field unwatered. You can see it from here.",
    ],
    kioskEmpty: "🎵 The bandstand is empty. The acoustics are excellent.",
    kioskLines: [
      "🎵 A tune starts up. Nobody knows where from.",
      "🎵 Someone claps. Then everyone does.",
      "🎵 Three notes, and the whole square slows down.",
    ],
    pierLines: [
      "🌊 One skip. Two. Three. The lake says nothing.",
      "🌊 The water is so flat you can see the sky in it.",
      "🌊 A fish jumps. You are the only witness.",
    ],
    benchToast: "🪑 You sit down. The world carries on without you for a moment.",
    townSitHint: "E: sit down",
    benchSitToast: "🪑 You sit down. Any direction key to get going again.",
    benchFullToast: "🪑 That bench is full. There are others.",
    gpsDistance: (m) => m + " m",
    gpsSet: (m) => "🧭 Destination set — " + m + " m. Click it again to cancel.",
    gpsCleared: "🧭 Destination cleared.",
    gpsArrived: "🧭 You have arrived.",
    gpsHint: "Click the map to set a destination",
    marketTitle: "Fairground market",
    marketHint: "Prices move every day. This is the ONLY place to sell your produce — and you never get less than the farm's old bin used to pay.",
    marketFamAll: "All",
    marketMax: "Max",
    marketNoneInFamily: "Nothing from that family in your stores.",
    marketCartTotal: (n, g) => n + (n > 1 ? " items" : " item") + " · " + g + " gold",
    marketCartBonus: (b) => "including +" + b + " gold from today's prices",
    marketClear: "Clear",
    marketAllMax: "Everything, max",
    marketSellBtn: (g) => "Sell · " + g + " gold",
    marketBuildWarn: "⚠️ Also used for building (fences, walls, paths).",
    marketJewelryHint: "Price set by its maker — market rates do not apply.",
    marketNothing: "Nothing to sell in that basket.",
    marketArchSign: "MARKET",
    punnetRowLabel: (name, n) => name + " punnet (\u00d7" + n + ")",
    sharedStockHint: "Shared farm store.",
    marketOnlyTag: "\u2192 Valley Town market",
    marketDayHint: "🎉 MARKET DAY. Prices are high today, the whole valley came down.",
    marketEmpty: "Your pockets are empty. Come back with something to sell.",
    marketFamily: (f) => ({ crop: "Crops", fish: "Fishing", product: "Farm", forage: "Foraging", material: "Materials" }[f] || f),
    marketUnitLine: (p, base) => p + " gold each (bin: " + base + ")",
    marketBonus: (b) => "· +" + b + " each",
    promptTownMarket: "E: sell at the market",
    touchRun: "Run (toggle)", touchMap: "Map", touchAct: "Act / jump",
    kickRefused: "💅 Carla Garfield works for nobody here. She'll leave when she chooses to.",
    boutiqueClosedToast: (d) => d === 0
      ? "💅 Maison Garfield opens today — Carla hasn't arrived yet."
      : "💅 Closed. Carla only keeps shop one day a week: come back in " + d + " day" + (d > 1 ? "s" : "") + ".",
    carlaOffDuty: "💅 Carla is off duty today.",
    chatMarketSell: (gain, bonus, money) => "Sold at the market: " + gain + " gold (+" + bonus + " vs the bin). Till: " + money + ".",
    toastFarMarket: "🎪 Selling only happens at the fairground market in Valley Town. Take the train!",
    toastMarketNothing: "🎪 Your basket is empty.",
    promptTownStand: "↑ ↓ ← → : stand up  ·  Space: throw bread",
    birdCrumbsToast: "You crumble a crust. The pigeons are coming…",
  },
};

export function fstr(lang) {
  return FERME_STR[lang === "en" ? "en" : "fr"];
}
