/* =============================================================================
   story.js — LE CHAPITRE 1 : « LE FROID QUI SE SOUVIENT ».
   -----------------------------------------------------------------------------
   ⚠️ LE RÉCIT EST UNE DONNÉE, PAS DU CODE. Tout ce fichier est une liste
   d'instructions déclaratives que `cine.js` exécute sans rien savoir de la
   vallée. Conséquence directe : on peut ajouter un chapitre sans toucher au
   moteur, et un banc d'essai peut PARCOURIR le récit — vérifier que chaque
   branche se rejoint, qu'aucun drapeau n'est lu avant d'être posé, qu'aucune
   réplique n'existe en français sans exister en anglais.

   LES INSTRUCTIONS
     { t:"scene",   id, cam, fade }        pose un tableau (fade en ms)
     { t:"cam",     to, ms }               glissement de caméra, non bloquant
     { t:"say",     who, fr, en, if }      une réplique ; `who:""` = narration
     { t:"wait",    ms }
     { t:"fx",      set:{...}, ms }        anime un état de scène (l'aurore…)
     { t:"choice",  q, opts:[…] }          un choix ; chaque option pose un drapeau
     { t:"play",    id }                   rend la main au joueur
     { t:"chapter", fr, en }               le carton de fin de chapitre

   ⚠️ `if` PREND UN NOM DE DRAPEAU. La réplique n'est jouée que s'il est posé.
   C'est le seul mécanisme de branchement du jeu, et il est volontairement
   pauvre : trois chapitres plus loin, un système d'expressions serait devenu
   un petit langage que personne ne saurait relire.
   ========================================================================== */

const Story = (function () {

  /* ── LES PERSONNAGES ────────────────────────────────────────────────────── */
  const WHO = {
    "": { fr: "", en: "" },
    aubin: { fr: "?", en: "?" },          // il n'a pas encore de nom pour nous
    moi: { fr: "Vous", en: "You" },
  };

  const CH1 = [

    /* ═══ 0. LA COURSE ═════════════════════════════════════════════════════
       ⚠️ DÉCISION RENVERSÉE AU 421, ET LA PRÉCÉDENTE EST GARDÉE ICI PARCE
       QU'ELLE ÉTAIT BONNE. Le 418 avait écrit : « ON OUVRE SUR LE PAYSAGE,
       PAS SUR LE PASSAGE — le sujet du chapitre n'est pas *je suis passé*,
       c'est *ce que je découvre en arrivant*. » Le raisonnement tenait, et il
       tient toujours contre l'idée qu'il visait : montrer un tunnel, un noir,
       une arrivée.

       Ce n'est pas ce qu'on fait. On n'ouvre pas sur le PASSAGE, on ouvre sur
       une COURSE — et la différence est entière :

         - le passage est un événement passé, qu'on illustrerait ; la course
           est une action présente, que le joueur EXÉCUTE. La toute première
           chose qu'il fait dans ce jeu est d'avancer, pas de lire ;
         - elle ne montre rien avant la corniche. On court dans un couloir
           d'arbres, la vallée est cachée derrière le bord — et c'est
           l'ARRIVÉE au bord qui déclenche le tableau. La première image du
           monde cristal reste donc la plus belle qu'on sache faire, et elle
           arrive maintenant comme une RÉCOMPENSE au lieu d'un lever de rideau ;
         - on ne peut pas perdre, il n'y a ni HUD ni éclat à ramasser : la
           course n'est pas une épreuve, c'est une manière d'entrer.

       ⚠️ CE QUI SUIT NE DOIT PLUS PARLER DE PASSAGE. Les trois répliques du
       seuil disaient « le passage s'est refermé derrière vous » — elles ont
       été réécrites, sans quoi le texte raconterait une scène que le joueur
       vient de ne pas jouer. C'est le genre d'incohérence qui survit dix zips
       parce qu'aucun outil ne la voit. */
    { t: "play", id: "run" },

    /* ═══ I. LA CORNICHE ════════════════════════════════════════════════════ */
    { t: "scene", id: "seuil", cam: 0, fade: 3800 },
    { t: "cam", to: 24, ms: 18000 },
    { t: "wait", ms: 2400 },

    { t: "say", who: "", fr: "Vous vous arrêtez parce que le sol s'arrête. Pas parce que vous l'avez décidé.",
      en: "You stop because the ground stops. Not because you decided to." },
    { t: "say", who: "", fr: "Le froid n'est pas une température, ici. C'est une épaisseur. On le traverse.",
      en: "Cold isn't a temperature here. It's a thickness. You walk through it." },
    { t: "say", who: "", fr: "Et de l'autre côté du bord, il y a quelque chose de très grand et de très silencieux.",
      en: "And beyond the edge, there is something very large and very quiet." },

    { t: "scene", id: "corniche", cam: 0, fade: 2600 },
    { t: "cam", to: 92, ms: 26000 },
    { t: "wait", ms: 1600 },
    { t: "say", who: "", fr: "Et au-dessus, le ciel bouge.",
      en: "And above you, the sky is moving." },

    { t: "fx", set: { auroraGain: 1.55 }, ms: 2600 },
    { t: "wait", ms: 900 },
    { t: "say", who: "", fr: "Ce n'est pas le vent. Le vent est tombé depuis longtemps. C'est la lumière elle-même qui se replie, lentement, comme une étoffe qu'on range.",
      en: "It isn't the wind — the wind died long ago. It's the light itself, folding slowly, like cloth being put away." },
    { t: "fx", set: { auroraGain: 1 }, ms: 3200 },

    { t: "scene", id: "braseros", cam: 6, fade: 1500 },
    { t: "cam", to: 48, ms: 20000 },
    { t: "say", who: "", fr: "Deux feux brûlent de part et d'autre de vous. Ils ne réchauffent rien.",
      en: "Two fires burn on either side of you. They warm nothing." },
    { t: "say", who: "", fr: "Vous mettez un moment à comprendre pourquoi cela vous serre la gorge.",
      en: "It takes you a moment to understand why that tightens your throat." },
    { t: "say", who: "", fr: "Ce n'est pas vous qui les avez allumés.",
      en: "You are not the one who lit them." },

    /* ═══ LE PREMIER CHOIX ══════════════════════════════════════════════════
       ⚠️ AUCUNE DES TROIS OPTIONS N'EST « LA BONNE », ET AUCUNE NE COÛTE RIEN
       TOUT DE SUITE. Elles décident du RAPPORT du joueur à ce monde — la
       curiosité, les bêtes, ou l'homme — et ce rapport est relu jusqu'au
       chapitre 7. Un premier choix qui punit apprend au joueur à ne plus
       choisir ; un premier choix qui caractérise lui apprend qu'il existe. */
    { t: "choice",
      q: { fr: "Vous restez immobile un instant. Puis —", en: "You stand still for a moment. Then —" },
      opts: [
        { fr: "Approcher la main de la flamme bleue.", en: "Reach a hand toward the blue flame.",
          flag: "flamme", scene: "braseros", cam: 24,
          say: [
            { who: "", fr: "Vous approchez la paume. Rien. Pas de chaleur, pas de morsure — la flamme ne fait rien du tout.",
              en: "You bring your palm close. Nothing. No warmth, no bite — the flame does nothing at all." },
            { who: "", fr: "Puis elle se penche. Vers vous. Un demi-pouce, et elle se redresse.",
              en: "Then it leans. Toward you. Half an inch, and it straightens again." },
            { who: "", fr: "Ce feu n'éclaire pas. Il écoute.",
              en: "This fire doesn't give light. It listens." },
          ] },
        { fr: "Observer les bêtes, au loin sur la rivière.", en: "Watch the animals, far off on the river.",
          flag: "harde", scene: "harde", cam: 10, fade: 1400,
          say: [
            { who: "", fr: "Elles sont neuf. Vous les comptez deux fois, parce que la première fois vous n'y croyez pas.",
              en: "There are nine. You count twice, because the first time you don't believe it." },
            { who: "", fr: "Elles ne broutent pas — il n'y a rien à brouter. Elles ne dorment pas. Elles marchent.",
              en: "They aren't grazing — there's nothing to graze. They aren't sleeping. They're walking." },
            { who: "", fr: "Toutes dans la même direction, à la même allure, et depuis assez longtemps pour avoir tracé un sentier dans la neige.",
              en: "All the same way, at the same pace, and for long enough to have worn a path into the snow." },
            { who: "", fr: "Vers les feux.",
              en: "Toward the fires." },
          ] },
        { fr: "Regarder la lumière sur la crête.", en: "Look at the light up on the ridge.",
          flag: "cabane", scene: "crete", cam: 8, fade: 1400,
          say: [
            { who: "", fr: "Là-haut, entre deux masses d'arbres, il y a un carré jaune.",
              en: "Up there, between two masses of trees, there is a small yellow square." },
            { who: "", fr: "Vous n'aviez pas vu, en arrivant, à quel point tout le reste est bleu.",
              en: "You hadn't noticed, arriving, how completely blue everything else is." },
            { who: "", fr: "Une fenêtre. Quelqu'un a fait du feu — du vrai, celui qui chauffe — et il l'a fait ce soir.",
              en: "A window. Someone made a fire — a real one, the kind that warms — and they made it tonight." },
          ] },
      ] },

    { t: "scene", id: "corniche", cam: 118, fade: 1600 },
    { t: "cam", to: 150, ms: 16000 },
    { t: "wait", ms: 700 },
    { t: "say", who: "", fr: "Le sentier descend vers le lac. Il est balisé. Tous les vingt pas, un feu.",
      en: "The path goes down to the lake. It is marked out. Every twenty paces, a fire." },
    { t: "say", who: "", fr: "Quelqu'un a voulu qu'on puisse traverser sans se perdre. Ou qu'on ne s'arrête pas.",
      en: "Someone wanted this crossing to be walkable. Or wanted no one to stop." },

    /* ═══ II. LA MARCHE (JOUABLE) ═══════════════════════════════════════════
       ⚠️ QUESTION OUVERTE, LAISSÉE OUVERTE EXPRÈS (421). Le chapitre a
       désormais DEUX segments jouables : la course d'ouverture et celui-ci.
       Guillaume a demandé de trancher plus tard, en les voyant tourner tous
       les deux. Les deux options ont un coût :
         - les garder — le chapitre respire deux fois, mais la seconde marche
           risque de se lire comme une redite de la première, sur le même
           moteur et le même décor ;
         - supprimer celle-ci — le milieu du chapitre devient une longue suite
           de tableaux sans main rendue au joueur.
       ⚠️ NE PAS TRANCHER EN PASSANT. Retirer cette ligne retire aussi le seul
       endroit où l'on ramasse des éclats, donc le compte final de fin de
       chapitre (`finalShards`, game.js) et la jauge de Chant. */
    { t: "play", id: "walk" },

    /* ═══ III. LE PONT ══════════════════════════════════════════════════════ */
    { t: "scene", id: "pont", cam: 20, fade: 1400 },
    { t: "cam", to: 96, ms: 22000 },
    { t: "wait", ms: 1400 },

    { t: "say", who: "", fr: "De l'autre côté du lac, la forêt se referme, et la neige cesse d'être vierge.",
      en: "On the far side of the lake the forest closes in, and the snow stops being untouched." },
    { t: "say", who: "", fr: "Il y a eu une ville ici. Ou quelque chose qui en tenait lieu.",
      en: "There was a town here. Or something that served as one." },
    { t: "say", who: "", fr: "Des colonnes cassées à hauteur d'homme. Un linteau que plus rien ne soutient. Un pont, encore debout, qui enjambe un vide dont vous ne voyez pas le fond.",
      en: "Columns snapped off at head height. A lintel holding nothing up. A bridge, still standing, over a drop whose bottom you cannot see." },
    { t: "say", who: "", fr: "Et sur l'autre rive, deux formes pâles qui ne bougent pas.",
      en: "And on the far bank, two pale shapes that do not move." },

    { t: "scene", id: "chevaux", cam: 4, fade: 1800 },
    { t: "cam", to: 34, ms: 22000 },
    { t: "wait", ms: 1500 },
    { t: "say", who: "", fr: "Des chevaux. Ils vous regardaient déjà quand vous êtes arrivé.",
      en: "Horses. They were already watching you when you arrived." },

    /* ═══ LE DEUXIÈME CHOIX ═════════════════════════════════════════════════ */
    { t: "choice",
      q: { fr: "Ils attendent quelque chose de vous.", en: "They are waiting for something from you." },
      opts: [
        { fr: "Avancer lentement sur le pont.", en: "Walk slowly out onto the bridge.",
          flag: "approche",
          say: [
            { who: "", fr: "Vous posez un pied sur la première dalle. Ils ne reculent pas.",
              en: "You set a foot on the first slab. They don't back away." },
            { who: "", fr: "Vous en posez douze. Ils ne reculent toujours pas, et c'est cela qui vous arrête : un animal sauvage aurait dû partir depuis longtemps.",
              en: "You take twelve steps. They still don't back away, and that is what stops you: a wild animal should have gone long ago." },
            { who: "", fr: "Celui de gauche a de la glace prise dans la crinière. Beaucoup de glace. Il ne s'est pas mis à l'abri depuis très, très longtemps.",
              en: "The one on the left has ice caught in its mane. A great deal of ice. It has not been under shelter in a very, very long time." },
          ] },
        { fr: "Rester immobile et attendre.", en: "Stay still and wait.",
          flag: "confiance",
          say: [
            { who: "", fr: "Vous ne bougez plus. Vous laissez le froid vous trouver.",
              en: "You stop moving. You let the cold find you." },
            { who: "", fr: "Il faut longtemps. Assez longtemps pour que vous cessiez de compter.",
              en: "It takes a long time. Long enough that you stop counting." },
            { who: "", fr: "Puis l'un des deux traverse. Il ne se presse pas, il ne vous quitte pas des yeux, et il s'arrête à deux pas.",
              en: "Then one of them crosses. Unhurried, never taking its eyes off you, and stops two paces away." },
            { who: "", fr: "Il souffle une fois. Il n'y a pas de buée.",
              en: "It breathes out, once. There is no mist." },
          ] },
        { fr: "Descendre vers les cristaux, sous le pont.", en: "Climb down toward the crystals, under the bridge.",
          flag: "marque", scene: "pont", cam: 96, fade: 1400,
          say: [
            { who: "", fr: "Vous laissez les chevaux et vous descendez le long de la paroi, là où la glace fait des marches.",
              en: "You leave the horses and go down along the wall, where the ice makes steps." },
            { who: "", fr: "Les cristaux sortent de la roche par grappes. Ils ne sont pas froids. C'est la première chose de cette vallée qui ne soit pas froide.",
              en: "The crystals come out of the rock in clusters. They are not cold. They are the first thing in this valley that isn't." },
            { who: "", fr: "Et sur la face plate du plus gros, il y a une entaille. Faite à l'outil. Un trait, puis quatre, puis un trait en travers.",
              en: "And on the flat face of the largest, there is a notch. Cut with a tool. One stroke, then four, then one across." },
            { who: "", fr: "Quelqu'un compte les jours. Il y a beaucoup de traits.",
              en: "Someone is counting the days. There are a great many strokes." },
          ] },
      ] },

    /* ═══ IV. LE CHANT ══════════════════════════════════════════════════════
       ⚠️ LE PIVOT DU CHAPITRE, ET IL EST VISUEL AVANT D'ÊTRE ÉCRIT. L'aurore
       monte, se stabilise, et le texte se contente de nommer ce que le joueur
       est déjà en train de regarder. Une révélation qu'on lit sans la voir
       n'est qu'une information. */
    { t: "wait", ms: 1200 },
    { t: "say", who: "", fr: "Puis le ciel change.",
      en: "Then the sky changes." },
    /* ⚠️ LE TABLEAU DU PIVOT. `auroraGain` n'y pilote plus l'intensité du
       rideau mais la FORMATION de la procession (voir Shots.memoire) : la même
       clé, relue autrement par la scène qui la reçoit. C'est ce qui permet au
       récit de dire « le ciel change » sans savoir ce que ça veut dire ici. */
    { t: "scene", id: "memoire", cam: 0, fade: 2200 },
    { t: "cam", to: 26, ms: 24000 },
    { t: "fx", set: { auroraGain: 2.3 }, ms: 6500 },
    { t: "wait", ms: 2600 },

    { t: "say", who: "", fr: "Le rideau se resserre. Il perd ses plis. Il devient — et vous mettez plusieurs secondes à accepter le mot — il devient LISIBLE.",
      en: "The curtain draws in. It loses its folds. It becomes — and it takes you several seconds to accept the word — it becomes LEGIBLE." },
    { t: "say", who: "", fr: "Une file. Des gens qui marchent en file, avec des charges sur le dos, et une lumière portée en tête.",
      en: "A line. People walking in single file, loads on their backs, one light carried at the front." },
    { t: "say", who: "", fr: "Ils vont vers la gauche. Vers le passage.",
      en: "They are heading left. Toward the passage." },
    { t: "say", who: "", fr: "Ils s'en vont.",
      en: "They are leaving." },

    { t: "wait", ms: 1800 },
    { t: "say", who: "aubin", fr: "Ne la regarde pas trop longtemps.",
      en: "Don't look at it too long." },
    { t: "wait", ms: 1200 },
    { t: "say", who: "", fr: "La voix vient de derrière vous, et elle est calme, et elle n'a pas l'air surprise du tout.",
      en: "The voice comes from behind you, and it is calm, and it does not sound remotely surprised." },
    { t: "say", who: "aubin", fr: "Elle rejoue toujours la même. Onze ans que je la regarde et je n'ai jamais vu la fin.",
      en: "It always plays the same one. Eleven years I've watched it and I've never seen the end." },
    { t: "fx", set: { auroraGain: 1 }, ms: 4200 },

    /* ═══ LE TROISIÈME CHOIX ════════════════════════════════════════════════ */
    { t: "choice",
      q: { fr: "Vous ne vous êtes pas encore retourné.", en: "You still haven't turned around." },
      opts: [
        { fr: "« Qui sont-ils ? »", en: "\"Who are they?\"",
          flag: "demande",
          say: [
            { who: "aubin", fr: "Je ne sais pas. J'ai arrêté de me le demander vers la troisième année.",
              en: "I don't know. I stopped asking myself around the third year." },
            { who: "aubin", fr: "Ce qui m'occupe, c'est plutôt : qui reste.",
              en: "What occupies me these days is rather: who's left." },
          ] },
        { fr: "« Onze ans. »", en: "\"Eleven years.\"",
          flag: "onze",
          say: [
            { who: "", fr: "Un silence. Assez long pour que vous entendiez la neige tomber.",
              en: "A silence. Long enough for you to hear the snow falling." },
            { who: "aubin", fr: "Onze hivers. Il n'y a pas d'années ici, il n'y a que des hivers.",
              en: "Eleven winters. There are no years here, only winters." },
            { who: "aubin", fr: "Vous êtes le premier à faire la différence à voix haute.",
              en: "You're the first to say the difference out loud." },
          ] },
        { fr: "Ne rien dire.", en: "Say nothing.",
          flag: "silence",
          say: [
            { who: "", fr: "Vous ne dites rien. Vous continuez de regarder le ciel, et lui aussi.",
              en: "You say nothing. You keep watching the sky, and so does he." },
            { who: "", fr: "Il reste là, à quatre pas, sans approcher davantage.",
              en: "He stays there, four paces back, coming no closer." },
            { who: "aubin", fr: "Bien. Les bavards ne durent pas, ici.",
              en: "Good. Talkers don't last, here." },
          ] },
      ] },

    { t: "wait", ms: 1000 },
    { t: "say", who: "aubin", fr: "Il vous reste une heure avant que les feux du lac ne baissent. Après, on ne traverse plus.",
      en: "You've got an hour before the lake fires drop. After that, nobody crosses." },
    { t: "say", who: "aubin", fr: "Alors soit vous me suivez, soit vous restez ici et vous devenez une histoire que je raconterai à personne.",
      en: "So either you follow me, or you stay here and become a story I'll tell to nobody." },
    { t: "wait", ms: 900 },
    /* On ne le montre qu'ICI. Toute la scène précédente s'est jouée dos à lui,
       et c'est le seul moyen d'avoir un vrai plan de révélation dans un jeu où
       le joueur est toujours de dos. */
    { t: "scene", id: "aubin", cam: 4, fade: 2000 },
    { t: "cam", to: 30, ms: 20000 },
    { t: "say", who: "", fr: "Vous vous retournez enfin.",
      en: "You finally turn around." },
    { t: "say", who: "", fr: "Il est plus jeune que sa voix. Beaucoup plus jeune. Et il porte, accrochée à la ceinture, une lanterne dans laquelle il n'y a pas de flamme mais un éclat de cristal fêlé.",
      en: "He is younger than his voice. Much younger. And on his belt hangs a lantern that holds no flame — only a cracked shard of crystal." },

    { t: "chapter",
      fr: "CHAPITRE 2 — LA CABANE SOUS LA CRÊTE",
      en: "CHAPTER 2 — THE CABIN BELOW THE RIDGE" },
  ];

  return { WHO, CH1, chapters: { 1: CH1 } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Story;
