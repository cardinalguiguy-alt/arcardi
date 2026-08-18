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
       se joue, « la lumière montre ce dont une chose se souvient » se relit trois
       fois ;
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
      furrow:    "Quelque chose brûle au nord de la ferme. Va voir (E).",
      craterHot: "À l'est de Valley Town, le trou brûle encore. Attends qu'il refroidisse.",
      crater:    "Le cratère a refroidi. Descends : quelque chose se cache au fond.",
      lean:      "Écoute les ombres ici (E), puis à l'autre bout de la ville. Vite.",
      leanAgain: "Un endroit marqué. Traverse la ville et réécoute les ombres (E).",
      lakeShard: "Emmène l'étoile au ponton du lac, et plonge (E).",
      beadShard: "La verrerie, à l'est de la ville. Cherche la perle à la lumière (E).",
      nestShard: "Le nid de la pie, en haut de l'arbre. Éloigne l'oiseau (E).",
      belfry:    "Monte l'étoile en haut du clocher de l'église (E).",
      /* ⚠️ ZIP 453 — « la cinquième note » → « la dernière note ». L'ordinal
         était vrai tant que le bateau avait cinq morceaux ; « dernière » l'est
         quel que soit leur nombre, et se lit exactement pareil. */
      song:      "La cloche a la dernière note. Un à l'orgue, un au beffroi (E).",
      /* ⚠️ ZIP 454 — plus courtes que leurs sœurs : le français gonfle de 15 à
         20 %, et ces deux-là portent un nom propre qu'on ne peut pas raccourcir. */
      engineer:     "Va demander un ingénieur naval à la mairie (E). L'étoile insiste.",
      engineerWait: "Kerguélen dessine sur la grève du lac. Reviens dans quelques minutes.",
      timber:       "Commande la pièce suivante à Tristan, à la ferme. Le plan : touche P.",
    },
    againTitle: "Où tu en étais",
    /* ⚠️ ZIP 453 — LE PLURIEL EST DÉRIVÉ, LUI AUSSI : cette phrase écrivait
       « Tu as 1 morceaux » au premier morceau, ce qu'aucun banc ne regardait. */
    again: (n, total) => `Tu as ${nfr(n)} morceau${n > 1 ? "x" : ""} sur ${nfr(total)}. La petite étoile est toujours là.`,
  },
  guide: {
    go: (pet) => `${pet} part devant toi et se retourne.`,
    offer: (pet) => `${pet} t'attend près de la barrière. Il veut te montrer quelque chose.`,
    stop: (pet) => `${pet} revient à tes pieds.`,
    arrived: (pet) => `${pet} s'arrête ici et s'assied. Le reste est à toi.`,
    none: "Rien à chercher pour l'instant.",
    noPet: "Aucun animal avec toi. L'un d'eux connaîtrait le chemin.",
  },
  chapter: {
    field:  "Chapitre Un — Ce qui est tombé dans le champ",
    crater: "Chapitre Deux — Le cratère",
    water:  "Chapitre Trois — Ce que l'eau gardait",
    thief:  "Chapitre Quatre — Les deux trésors de la voleuse",
    note:   "Chapitre Cinq — La cinquième note",
    end:    "Le Bateau des Étoiles",
  },
  fall: {
    /* ⚠️ « d'est en ouest », comme l'anglais depuis le 448 : le sillon est plus
       profond à son bout ouest, donc la course s'y arrête. Le texte suit l'image. */
    line1: "Le ciel se déchire, d'est en ouest.",
    line2: "Quelque chose s'écrase au loin. Les vitres tremblent.",
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
       arbitre. Le libellé est celui de Guillaume, mot pour mot. */
    askTitle: "Démarrer l'enquête « La Belle Étoile » ?",
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
    /* LES INDICES. ⚠️ Chacun annonce une étape à venir, aucun ne le sait. */
    hint: [
      "Il paraît qu'un brillant ingénieur breton a posé ses valises à Valley Town.",
      "J'ai vu des étoiles bizarres dans le ciel, les nuits d'avant. Elles bougeaient.",
      "La cloche de l'église a été fondue dans une pierre du ciel. Il y a cent ans.",
      "La pie du verrier vole tout ce qui brille. Son nid est dans le grand arbre.",
      "Sous le ponton, le lac est très profond. Personne n'est allé au fond.",
      "Quand une pierre brûlante tombe dans le sable, le sable devient du verre vert.",
    ],
  },
  s1: {
    tooHot: "C'est trop brûlant pour regarder. Ça siffle sous la pluie.",
    coolTitle: "Fais-le refroidir",
    coolHint: "Garde la lueur dans le repère. Arrose à petits coups — un grand le fend.",
    coolCrack: "Crac. On recommence, plus doucement.",
    coolWin: "Le blanc devient orange, puis rouge, puis bleu. Ça ne siffle plus.",
    shadow: "Ton ombre a quelqu'un de tout petit assis sur son épaule. Tu te retournes. Il n'y a personne.",
    got: "Un morceau du bateau. Il chante une note quand on le touche.",
    east: "Il penche vers l'est. Toujours vers l'est.",
  },
  s2: {
    tooHot: "Le trou fume encore. Ce qui est au fond ne remontera pas.",
    empty: "Le cratère est vide. Du sable chaud, devenu du verre vert.",
    peek: "Quelque chose bouge au coin de l'œil. Tu regardes. C'est parti.",
    calmHint: "Elle ne sort pas tant qu'on la regarde.",
    calmBoth: "Tous les deux. Dos tourné. Ne bougez plus.",
    calmSolo: "Tout seul, c'est long. Reste retourné.",
    meet1: "Elle est plus petite qu'une poule. Elle tremble.",
    meet2: "Tu tends le morceau de ton champ. Elle le reprend.",
    /* ⚠️ ZIP 453 — « Deux notes, ensemble » DISAIT DEUX MORCEAUX LÀ OÙ LE
       NAVIRE EN MONTRE UN. Elle chante avec le morceau qu'on vient de lui
       rendre : c'est ça qu'on entend, et ça ne compte rien. */
    meet3: "Le morceau chante avec elle. Elle arrête de trembler.",
    /* ⚠️ « Elle n'en a que … » A ÉTÉ ÉCARTÉ : l'élision (« qu'un », « que deux »)
       demanderait une règle de grammaire dans une table de textes. « Elle en a
       un » dit la même chose et tient dans toutes les langues du fichier. */
    name: (n, total) => `Son bateau s'est cassé en tombant. ${Nfr(total)} morceaux. Elle en a ${nfr(n)}.`,
    leanHint: "Une ombre est une direction. Deux font un endroit. Écoute ici, puis tout à l'autre bout de la ville.",
    leanArmed: "Les ombres penchent. D'ici, c'est tout ce qu'on peut dire.",
    leanSoloArmed: "Retiens la direction. Traverse la ville et réécoute, avant que ça s'efface.",
    leanTooClose: "Trop près l'une de l'autre. Les deux directions n'en font qu'une.",
    leanFound: "Deux traits se croisent. Tu sais où chercher maintenant.",
    markLake: "Sous le ponton, dans le lac.",
    markGlass: "La verrerie, à l'est de la ville.",
  },
  s3: {
    dark: "L'eau est noire. Tu ne vois même pas tes mains.",
    poolHint: "Sa lumière traverse l'eau et fait une flaque claire au fond.",
    poolLead: "Celui qui tient l'étoile marche sur le ponton. La flaque suit. Le plongeur ne voit que dedans.",
    poolSolo: "Tu cales l'étoile sur la bitte. La flaque ne bouge plus. Il faudra plonger en biais.",
    diveTitle: (n) => `Plongée ${n}`,
    diveHint: "Tu coules tout seul — tu ne fais que diriger. L'anneau est ton souffle. Le morceau clignote.",
    diveDeeper: "Il a glissé plus bas.",
    diveUp: "Tu remontes les mains vides. Respire. Replonge.",
    /* ⚠️⚠️ ZIP 453 — CETTE PHRASE SERVAIT DE MESSAGE DE FIN DE MANCHE, donc elle
       s'affichait APRÈS CHAQUE plongée, y compris la première : « Trois
       morceaux » alors qu'on n'en avait aucun de plus. Elle ne se dit plus qu'au
       moment où le morceau est vraiment posé sur le navire (voir `starWatch`),
       et c'est `diveDeeper` qui ferme les manches — ce qu'elle décrit. */
    got: (n, total) => `${Nfr(n)} morceaux sur ${nfr(total)}. Le bateau grandit.`,
    wings: "Une ombre traverse l'eau. Des ailes. Quelque chose de petit et brillant part vers l'est.",
  },
  s4: {
    shut: "La verrerie est fermée pour la nuit. Le four est froid. Il n'y a personne.",
    rackTitle: "Une ombre qui ment",
    lureTitle: "Le leurre",
    sand: "Il y a un nid de pie dans l'arbre dehors. Et un caillou brillant fondu dans des perles.",
    rackHint: "Une de ces perles était une étoile. Son ombre s'en souvient ; le verre, non.",
    sweepHint: "Promène la lumière le long du râtelier et regarde le mur. Ni trop vite, ni trop lentement.",
    sweepTooFast: "Trop vite. Les ombres passent sans qu'on les voie.",
    sweepTooSlow: "Trop lentement. Le verre chauffe et l'ombre se brouille.",
    watchHint: "Regarde le mur. Une ombre ne sera pas une perle.",
    rackWrong: "Juste une perle. Essaie le râtelier suivant.",
    rackWin: "Là. Une ombre avec des pointes.",
    rackSolo: "Tu coinces l'étoile dans la fenêtre et tu tournes le râtelier. Un cran à la fois.",
    lureHint: "Elle suit la lumière. Continue d'avancer, sans à-coups, et éloigne-la du nid.",
    lureLost: "Elle s'est lassée et elle est remontée.",
    lureSolo: "Tu poses l'étoile. La pie descend. Elle ne restera pas longtemps.",
    climbHint: "Grimpe pendant que la pie est loin. Arrête-toi si elle lève la tête.",
    climbSeen: "Elle a levé la tête. Redescends.",
    got: (n, total) => `${Nfr(n)} morceaux sur ${nfr(total)}. Il ne manque plus que la cloche.`,
    /* ⚠️ « le cinquième » DEMANDAIT UN ORDINAL, donc une seconde table de mots à
       tenir juste. « le dernier » est vrai quel que soit le nombre de morceaux,
       et c'est exactement ce que le retournement raconte. */
    turn1: (n, total) => `${Nfr(n)} morceaux sur ${nfr(total)} chantent ensemble. Le bateau attend le dernier.`,
    turn2: "Il n'y en a pas. Elle est tombée avant que son bateau ait une cloche.",
    turn3: "Un bateau qui ne peut pas sonner. Une mer qu'il ne peut pas traverser.",
    turn4: "Alors, à l'autre bout de la ville, la cloche de l'église sonne. Une fois. Personne ne l'a tirée.",
  },
  s5: {
    stair1: "Gravé dans la pierre : « J.M. a sonné pour la crue. 1889. »",
    stair2: "Plus bas, en plus petit : « et pour rien du tout, certains jours. »",
    bell1: "Je suis tombée aussi. Il y a très longtemps. Avant que la ville ait un nom.",
    bell2: "On m'a trouvée tiède dans un champ, et on m'a coulée dans cette forme.",
    bell3: "Je suis trop lourde pour rentrer. Mais je ne suis jamais allée en mer.",
    bell4: "Petite. Emmène-moi. J'ai sonné quatre mille fois de la même poutre.",
    duetTitle: "Le duo",
    duetOrgan: "Répète les notes qu'elle chante, dans l'ordre. Les tuyaux s'allument quand c'est juste.",
    duetAim: "Tiens les morceaux dans la lumière jusqu'au bout de la phrase. Le vent tourne sans arrêt.",
    duetDropped: "La lumière s'est éteinte. On recommence, ensemble.",
    duetPhrase: (n, total) => `Phrase ${n} sur ${total}`,
    duetSolo: "Tu cales les touches et tu cours dans l'escalier. La note faiblit déjà.",
    duetWin: (total) => `${Nfr(total)} notes. Le bateau entier, qui chante d'un coup, pour la première fois.`,
    /* ╔═══════════════════════════════════════════════════════════════════════
       ║ ZIP 453 — LA FIN NE MENT PLUS SUR CE QU'ELLE MONTRE.
       ╚═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ `end1` DÉCRIVAIT LE BATEAU QUI LARGUE LES AMARRES ; le dessin de la
       scène, lui, montre L'ÉTOILE qui monte, et le navire — six cents pixels
       plus bas, au bord du lac — ne bougeait jamais. Deux affirmations fausses
       dans deux phrases sur trois. Décision de Guillaume : **le bateau reste,
       entier et réel, et c'est Eduardo Da Fonseca qui le prendra** pour aller
       voir le large. Les deux phrases disent donc ce qu'on voit : elle rentre,
       le bateau attend. Le départ a maintenant un porteur et une suite. */
    end1: "Elle monte comme un ballon qu'on lâche. Doucement. Comme si elle avait toute la nuit.",
    end2: "En bas, le bateau est entier. Il flotte enfin. Il attend quelqu'un qui sache partir.",
    end3: "La cloche ne dit rien d'autre.",
    gift: "Quelque chose d'elle est resté avec toi.",
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — LES PLANS, L'INGÉNIEUR ET LE BOIS. « ON NE CONSTRUIT PAS UN
     ║ BATEAU EN LE REGARDANT. »
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CES PHRASES SONT LE SEUL ENDROIT DE LA QUÊTE OÙ QUELQU'UN D'AUTRE EST AU
     COURANT, et c'est une entorse ASSUMÉE au thème du secret (§3 de `QUETE.md`).
     Elle est possible parce qu'elle ne trahit rien : l'hôtesse de mairie et
     l'ingénieur entendent parler d'un BATEAU, pas d'une étoile. Kerguélen dessine
     une coque pour des fermiers fortunés et repart ; Tristan scie des bordages. Le
     secret tient, et la vallée cesse d'être un endroit où personne ne remarque
     jamais rien — ce qui, à force, était devenu invraisemblable plutôt que
     mystérieux.
     ⚠️ ET AUCUNE NE DIT « L'ÉTOILE » À UN PNJ. C'est la règle de ce bloc, et elle
     se vérifie en le relisant : le joueur sait, les habitants non. */
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
    engDone: (total) => `Voilà. ${Nfr(total)} pièces, dans cet ordre. Trouvez-vous un bon bûcheron.`,
    engGone: "Il a plié ses feuilles et il est parti sans se retourner.",
    /* ── LE PLAN. */
    ready: "Les plans sont à toi. Ouvre-les (P) pour voir le bateau.",
    openBtn: "📐 Le plan",
    panelTitle: (name) => `📐 Plans de construction — ${name}`,
    panelHint: (total) => `${Nfr(total)} pièces, dans l'ordre. L'étoile se souvient de la forme ; le bois, il faut le tailler.`,
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
    /* ── TRISTAN. */
    orderTitle: (name) => `🪵 Le chantier de ${name}`,
    orderHint: "Il travaille dans l'ordre du plan. Une pièce à la fois, et il ne commence pas la suivante avant d'avoir fini.",
    orderCost: (wood, d) => `${wood} bois · ${d} de travail`,
    orderBtn: "Commander",
    orderSent: (part, d) => `${part} : Tristan s'y met. Ce sera prêt dans ${d}.`,
    orderPoor: (wood) => `Il faut ${wood} bois dans la réserve. Abats des arbres, ou laisse-le en abattre.`,
    orderWait: (d) => `en cours — ${d}`,
    orderDone: "✅ livrée",
    /* ⚠️ CHAQUE REFUS DIT SA RAISON. Un bouton grisé sans explication, c'est « le
       jeu propose et refuse » (426) avec un pas d'avance. */
    blockNoPlan: "🔒 Il faut d'abord les plans",
    blockPrev: "🔒 La pièce précédente d'abord",
    blockNoShard: "🔒 L'étoile ne se rappelle pas encore cette pièce",
    delivered: (part) => `${part} — livrée sur la cale. Le bateau grandit pour de bon.`,
    lastOne: "La dernière pièce est en place. Le bateau est fini.",
    noTristan: "Personne à la ferme ne sait travailler le bois comme ça.",
    unbuilt: (n, total) => `La cloche a chanté, mais il manque encore du bois : ${n} pièces sur ${total}.`,
  },
  /* ⚠️ ZIP 453 — LE NAVIRE PREND LA MER AVEC EDUARDO (décision de Guillaume).
     Ces deux phrases REMPLACENT `voyagerDeparted` / `voyagerReturned` une fois
     la quête finie : elles ne coûtent donc pas un `send()` de plus, elles
     changent celui qui partait déjà (§3 de `CLAUDE.md`). */
  sail: {
    away: (d) => `Eduardo emmène le bateau des étoiles au large. Il veut voir ce qu'il y a de l'autre côté (retour dans ${d}).`,
    back: (goods) => `Le bateau des étoiles est rentré. Eduardo rapporte : ${goods}.`,
  },
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
    crater: (who) => `${who} a fait sortir la petite étoile du cratère.`,
    lean: (who) => `${who} a croisé les ombres. Un nouvel endroit est marqué.`,
    duet: (n, total) => `Phrase ${n} sur ${total}.`,
    /* ⚠️ ZIP 453 — « Le bateau a pris la mer » ÉTAIT FAUX : il restait à quai.
       Il est fini ; il partira avec Eduardo (voir `sail`). */
    done: "Le bateau est fini. L'étoile est rentrée.",
  },
  prompt: (k) => ({
    furrow: "E : regarder",
    crater: "E : ne plus bouger",
    craterHot: "E : attendre que ça refroidisse",
    lean: "E : la laisser chanter",
    dive: "E : plonger",
    sweep: "E : lever l'étoile",
    lure: "E : l'emmener plus loin",
    climb: "E : grimper",
    bell: "E : écouter",
    organ: "E : s'asseoir à l'orgue",
    engineer: "E : parler à l'ingénieur",
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
  /* ── LE PISTEUR. Une icône, des pastilles, UNE phrase. Jamais deux. */
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
      furrow:    "Something is burning north of the farm. Go and look (E).",
      craterHot: "East of Valley Town the hole still burns. Wait for it to cool.",
      crater:    "The crater has cooled. Climb down: something hides at the bottom.",
      lean:      "Listen to the shadows here (E), then right across town. Be quick.",
      leanAgain: "One place marked. Cross the town and listen to the shadows again (E).",
      lakeShard: "Take the star to the lake pier, then dive (E).",
      beadShard: "The glassworks, east of town. Sweep the beads with the light (E).",
      /* ⚠️ ZIP 449 — « ON THE ROOF » ÉTAIT FAUX, ET IL L'ÉTAIT DÉJÀ DANS `s4.sand`
         (corrigé là-bas aussi). Le nid est dans un ARBRE planté contre la
         verrerie (`starNestTree`, posé à `STAR_NEST_DX/DY` du four) : le sprite
         est un arbre dégagé dont la boule de brindilles est le seul détail qu'on
         doive lire de loin. Envoyer le joueur sur un toit qui n'existe pas est la
         faute du 448 — un dessin approximatif se pardonne, une phrase fausse
         sous l'image, non. */
      nestShard: "The magpie's nest, up the tree by the glassworks. Lure the bird off (E).",
      belfry:    "Carry the star to the top of the church bell tower (E).",
      /* ⚠️ ZIP 453 — « the fifth note » → « the last note » : l'ordinal vieillit
         avec le nombre de morceaux, « last » non. */
      song:      "The bell knows the last note. One at the organ, one in the belfry (E).",
      /* ⚠️⚠️ ZIP 454 — LES DEUX OBJECTIFS DE LA CONSTRUCTION. Ils suivent la même
         règle que les huit autres — OÙ et QUOI, jamais pourquoi — et ils sont plus
         courts que la moyenne parce qu'ils portent un NOM PROPRE, qui ne se coupe
         pas sans devenir illisible (le bandeau rabote en silence, 449). */
      engineer:     "Ask the town hall for a naval engineer (E). The star insists.",
      engineerWait: "Kerguélen is drawing on the lake shore. Come back in a few minutes.",
      timber:       "Order the next piece from Tristan, at the farm. The plan: press P.",
    },
    /* Le rappel de reprise. ⚠️ UNE FOIS PAR SESSION, jamais deux — un « où en
       étions-nous » qui revient à chaque écran est une notification. */
    againTitle: "Where you were",
    again: (n, total) => `You have ${nen(n)} of ${nen(total)} piece${n > 1 ? "s" : ""}. The little star is still with you.`,
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
  guide: {
    go: (pet) => `${pet} trots out ahead of you and looks back.`,
    offer: (pet) => `${pet} has been waiting by the gate. It wants to show you something.`,
    stop: (pet) => `${pet} comes back to your heel.`,
    arrived: (pet) => `${pet} stops here and sits down. The rest is yours.`,
    none: "Nothing to look for right now.",
    noPet: "No pet is with you. One of them would know the way.",
  },
  /* ── LES CARTES DE CHAPITRE. Le seul endroit du chantier où le jeu prend
     l'écran entier pour dire un titre. */
  chapter: {
    field:  "Chapter One — What Landed in the Field",
    crater: "Chapter Two — The Crater",
    water:  "Chapter Three — What the Water Kept",
    thief:  "Chapter Four — The Thief's Two Prizes",
    note:   "Chapter Five — The Fifth Note",
    end:    "The Star Boat",
  },
  /* ── LA CHUTE. Personne d'autre ne la commente : c'est le thème (§3 de
     QUETE.md). Le silence de la ville EST la première chose étrange. */
  fall: {
    /* ⚠️⚠️ ZIP 448 — « west to east » ÉTAIT FAUX, ET ÇA S'EST VU À L'ÉCRAN AVANT
       DE SE VOIR ICI : la comète descend d'EST EN OUEST (le sillon est plus
       profond à son bout ouest, c'est là que la course s'arrête, et les deux
       modèles de Guillaume la montrent arrivant du haut-droite). Le texte disait
       donc le contraire de l'image, sous l'image. Un texte n'est pas un décor :
       il AFFIRME, et une affirmation fausse coûte plus cher qu'un dessin
       approximatif. */
    line1: "The sky tears open, east to west.",
    line2: "Something hits the ground far away. The windows rattle.",
    line3: "Every bird in the valley goes up at once.",
    quiet: "Everyone saw the stone fall. Nobody will ever see what was inside it.",
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
    askTitle: "Start the “Beautiful Star” investigation?",
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
      "The church bell was cast from a stone that fell from the sky. A hundred years ago.",
      "The glassblower's magpie steals anything that shines. Its nest is up the big tree.",
      "Under the pier the lake is very deep. Nobody has ever reached the bottom.",
      "When a burning stone lands in sand, the sand turns to green glass.",
    ],
  },
  /* ── ÉTAPE 1 : LE CHAMP. */
  s1: {
    tooHot: "It's too hot to look at. It hisses when the rain touches it.",
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
    coolWin: "The white goes orange, then red, then blue. It stops hissing.",
    shadow: "Your shadow has someone small sitting on its shoulder. You turn around. Nothing there.",
    got: "One piece of the boat. It hums a note when you touch it.",
    east: "It leans east. Always east.",
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
    calmBoth: "Both of you. Backs turned. Don't move.",
    calmSolo: "Alone, this takes a while. Stay turned around.",
    meet1: "It is smaller than a hen. It is shaking.",
    meet2: "You hold out the piece from your field. It takes it back.",
    /* ⚠️ ZIP 453 — voir la note française : « two notes » comptait deux morceaux
       là où le navire en montre un. */
    meet3: "The piece sings with it. It stops shaking.",
    name: (n, total) => `Its boat broke when it fell. ${Nen(total)} pieces. It has ${nen(n)}.`,
    /* ⚠️⚠️ ZIP 449 — C'EST ICI QUE LE JEUNE PUBLIC ABANDONNAIT, ET C'ÉTAIT
       PRÉVISIBLE : l'écoute des ombres est le SEUL moment de la quête sans
       chevron (`spot: "*lean"` ne rend aucune position, et c'est délibéré). Le
       texte expliquait joliment la magie — « une ombre est une direction, deux
       sont un lieu » — sans jamais dire les trois choses qu'il faut FAIRE :
       écouter, s'éloigner beaucoup, réécouter vite. Trente cases et vingt-six
       secondes sont mesurées par le banc ; elles n'étaient écrites nulle part.
       ⚠️ On dit « the far side of town » plutôt que « 30 tiles » : la grandeur
       exacte est un réglage (elle a déjà bougé de 45 à 30), la consigne est une
       phrase. Recopier le nombre ici serait le doublon du §8 de CLAUDE.md. */
    leanHint: "One shadow is a direction. Two are a place. Listen here, then again from the far side of town.",
    leanArmed: "The shadows lean. From here, that's all you can tell.",
    leanSoloArmed: "Remember which way. Now cross town and listen again, before it fades.",
    leanTooClose: "Too close together. The two directions are the same direction.",
    leanFound: "Two lines cross. You know where to look now.",
    markLake: "Under the pier, in the lake.",
    markGlass: "The glassworks, east of town.",
  },
  /* ── ÉTAPE 3 : LE LAC. */
  s3: {
    dark: "The water is black. You can't see your own hands.",
    poolHint: "Its light goes through the water and makes a bright pool on the bottom.",
    poolLead: "Whoever holds the star walks the pier. The pool follows. The diver can only see inside it.",
    poolSolo: "You wedge the star on the bollard. The pool stops moving. You'll have to dive at an angle.",
    diveTitle: (n) => `Dive ${n}`,
    /* ⚠️ ZIP 449 — TROIS CHOSES EN UNE LIGNE, ET LA TROISIÈME MANQUAIT : on
       coule tout seul (`STAR_DIVE_SINK`), on ne pilote que la dérive, et l'éclat
       BAT (`STAR_DIVE_PULSE_MS`) — c'est au battement qu'on le voit. Un joueur
       qui ignore le battement croit que le fond est vide et remonte. */
    diveHint: "You sink on your own — just steer. The ring is your breath. The piece blinks.",
    diveDeeper: "It slid deeper.",
    diveUp: "You come up empty. Breathe. Go again.",
    /* ⚠️⚠️ ZIP 453 — voir la note française : elle servait de message de FIN DE
       MANCHE et s'affichait donc après chaque plongée, y compris la première. */
    got: (n, total) => `${Nen(n)} of ${nen(total)} pieces. The boat is growing.`,
    wings: "A shadow crosses the water. Wings. Something small and bright goes east with it.",
  },
  /* ── ÉTAPE 4 : LA VERRERIE ET LA PIE. */
  s4: {
    shut: "The glassworks is shut for the night. The furnace is cold. Nobody's here.",
    /* ⚠️ DEUX TITRES COURTS, ET ILS ONT ÉTÉ AJOUTÉS EN REGARDANT L'ÉCRAN. Le
       premier jet prenait `rackHint` et `lureHint` comme titres de mini-jeu :
       ce sont des PHRASES, elles débordaient du canevas et se faisaient couper
       en plein mot. Un titre est un nom, une consigne est une phrase — les
       confondre ne lève rien et se voit tout de suite. */
    rackTitle: "A shadow that lies",
    lureTitle: "The lure",
    /* ⚠️ ZIP 449 — « ON THE ROOF » CORRIGÉ : le nid est dans l'ARBRE planté
       contre la verrerie (`starNestTree`). Voir la note de `hud.goal.nestShard`. */
    sand: "There's a magpie's nest in the tree outside. And a bright pebble melted into somebody's beads.",
    rackHint: "One of these beads used to be a star. Its shadow remembers; the glass doesn't.",
    /* ⚠️ ZIP 449 — LE BUT AVANT LE GESTE. « Sweep the light » ne disait pas ce
       qu'on cherche : c'est l'OMBRE au mur qui trahit, jamais la perle. */
    sweepHint: "Sweep the light along the rack and watch the wall. Not too fast, not too slow.",
    sweepTooFast: "Too fast. The shadows blur past.",
    sweepTooSlow: "Too slow. The glass warms up and the shadow goes soft.",
    watchHint: "Watch the wall. One shadow won't be a bead.",
    rackWrong: "Just a bead. Try the next rack.",
    rackWin: "There. A shadow with points on it.",
    rackSolo: "You wedge the star in the window frame and turn the rack instead. One notch at a time.",
    /* ⚠️ ZIP 449 — LES TROIS FAÇONS DE PERDRE LA PIE SONT DES RÈGLES ÉCRITES
       (`STAR_MAGPIE_PATIENCE_MS`, `_JUMP_TILES`, `_NEST_R`) et aucune n'était
       dite. « Lead it — don't yank it » est joli et ne s'enseigne pas ; un joueur
       qui s'arrête deux secondes la perd sans comprendre pourquoi. */
    lureHint: "It follows light. Keep moving, keep it smooth, and take it away from the nest.",
    lureLost: "It lost interest and went back up.",
    lureSolo: "You set the star down. The magpie comes. It won't stay long.",
    /* ⚠️ « Up while it's down » est une devinette de quatre mots pour un geste
       qui a une fenêtre : on grimpe PENDANT que l'autre tient l'oiseau à l'écart. */
    climbHint: "Climb while the magpie is away. Stop if it looks up.",
    climbSeen: "It looked up. Down you go.",
    got: (n, total) => `${Nen(n)} of ${nen(total)} pieces. The boat only needs its bell now.`,
    /* Le retournement. ⚠️ ZIP 453 — « the fifth » demandait un ordinal, donc une
       seconde table de mots ; « the last one » est vrai quel que soit le total. */
    turn1: (n, total) => `${Nen(n)} of ${nen(total)} pieces sing together. The boat waits for the last one.`,
    turn2: "There is no fifth. It fell before its boat ever had a bell.",
    turn3: "A boat that cannot ring. A sea it cannot cross.",
    turn4: "Then, across the town, the church bell rings. Once. Nobody pulled it.",
  },
  /* ── ÉTAPE 5 : LE BEFFROI. */
  s5: {
    stair1: "Scratched in the stone: \"J.M. rang for the flood. 1889.\"",
    stair2: "Lower down, smaller: \"and for nothing at all, some days.\"",
    bell1: "I fell too. A long time ago. Before the town had a name.",
    bell2: "They found me warm in a field and they poured me into this shape.",
    bell3: "I am too heavy to go home now. But I have never been to sea.",
    bell4: "Small one. Take me with you. I have rung four thousand times from the same beam.",
    duetTitle: "The duet",
    /* ⚠️ ZIP 449 — CHAQUE POSTE DIT CE QU'IL FAIT *ET* CE QU'IL DOIT TENIR : le
       duo est le seul endroit où deux joueurs lisent DEUX consignes différentes
       en même temps, donc le seul où « je croyais que c'était toi » coûte la
       phrase entière. */
    duetOrgan: "Repeat the notes it sings, in order. The pipes light up when you're right.",
    duetAim: "Hold the pieces in the light until the phrase goes out. The wind keeps turning.",
    duetDropped: "The light died. Again, together.",
    duetPhrase: (n, total) => `Phrase ${n} of ${total}`,
    duetSolo: "You wedge the keys down and run for the stairs. The note is already fading.",
    duetWin: (total) => `${Nen(total)} notes. The whole boat, singing at once, for the first time.`,
    /* La résolution. ⚠️⚠️ ZIP 453 — voir la note française : `end1` racontait un
       appareillage que le dessin ne montrait pas et que le navire ne faisait
       jamais. Le bateau reste, entier ; Eduardo l'emmènera. */
    end1: "It goes up the way a balloon does. Slowly. Like it has all night.",
    end2: "Down by the water, the boat is whole. It floats at last. It is waiting for someone who can sail.",
    end3: "The bell doesn't say anything else.",
    /* ⚠️ LE CROCHET COSMÉTIQUE. Il ne donne encore RIEN — l'arbitrage est posé,
       le contenu viendra (voir `resolveStarGift`). La phrase est donc vraie
       aujourd'hui et le restera quand l'objet existera. */
    gift: "Something of it stayed with you.",
  },
  /* ╔═══════════════════════════════════════════════════════════════════════════
     ║ ZIP 454 — LES PLANS, L'INGÉNIEUR ET LE BOIS. « ON NE CONSTRUIT PAS UN
     ║ BATEAU EN LE REGARDANT. »
     ╚═══════════════════════════════════════════════════════════════════════════
     ⚠️⚠️ CES PHRASES SONT LE SEUL ENDROIT DE LA QUÊTE OÙ QUELQU'UN D'AUTRE EST AU
     COURANT, et c'est une entorse ASSUMÉE au thème du secret (§3 de `QUETE.md`).
     Elle est possible parce qu'elle ne trahit rien : l'hôtesse de mairie et
     l'ingénieur entendent parler d'un BATEAU, pas d'une étoile. Kerguélen dessine
     une coque pour des fermiers fortunés et repart ; Tristan scie des bordages. Le
     secret tient, et la vallée cesse d'être un endroit où personne ne remarque
     jamais rien — ce qui, à force, était devenu invraisemblable plutôt que
     mystérieux.
     ⚠️ ET AUCUNE NE DIT « L'ÉTOILE » À UN PNJ. C'est la règle de ce bloc, et elle
     se vérifie en le relisant : le joueur sait, les habitants non. */
  plan: {
    advise1: "It looks at the empty slipway by the lake. It shakes its head.",
    advise2: "It doesn't know how boats are built. It only knows what this one looked like.",
    advise3: "You need someone who draws boats. In town — the big house where you ask for things.",
    hallIntro: "A shipwright? There's one left, yes. Célestin Kerguélen. He doesn't travel for nothing.",
    hallFee: (gold, crops, fish) => `His terms: ${gold} gold, ${crops} crops and ${fish} fish. Paid up front.`,
    hallWhy: "He says a plan is paid all at once or not at all. He has never explained why.",
    hallSendBtn: "Send for the shipwright",
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
    engDone: (total) => `There. ${Nen(total)} pieces, in that order. Go and find yourself a good lumberjack.`,
    engGone: "He folded his sheets and left without looking back.",
    ready: "The plans are yours. Open them (P) to see the boat.",
    openBtn: "📐 The plan",
    panelTitle: (name) => `📐 Building plans — ${name}`,
    panelHint: (total) => `${Nen(total)} pieces, in order. The star remembers the shape; the wood still has to be cut.`,
    panelAtLake: "Unfold it by the lake and the boat will stand on its slipway.",
    lakeToast: "You unfold the plan in front of the slipway. The whole boat draws itself in the air.",
    lakeClose: "You fold the plan away. The boat fades out.",
    none: "You have no plan. Nobody knows what this boat looked like.",
    part: (k) => ({
      hull: "Hull planking", rudder: "Rudder and tiller",
      mast: "The mast", sail: "The yard", bell: "The bell cradle",
    }[k] || k),
    orderTitle: (name) => `🪵 ${name}'s workshop`,
    orderHint: "He works in the order of the plan. One piece at a time, and he won't start the next before he's done.",
    orderCost: (wood, d) => `${wood} wood · ${d} of work`,
    orderBtn: "Order it",
    orderSent: (part, d) => `${part}: Tristan gets to it. Ready in ${d}.`,
    orderPoor: (wood) => `You need ${wood} wood in the stores. Fell some trees, or let him fell them.`,
    orderWait: (d) => `under way — ${d}`,
    orderDone: "✅ delivered",
    blockNoPlan: "🔒 You need the plans first",
    blockPrev: "🔒 The previous piece first",
    blockNoShard: "🔒 The star doesn't remember that piece yet",
    delivered: (part) => `${part} — set on the slipway. The boat is growing for real now.`,
    lastOne: "The last piece is in place. The boat is finished.",
    noTristan: "Nobody on the farm can work timber like that.",
    unbuilt: (n, total) => `The bell has sung, but the wood is short: ${n} pieces of ${total}.`,
  },
  /* ⚠️ ZIP 453 — voir la note française : elles remplacent `voyagerDeparted` /
     `voyagerReturned` une fois la quête finie, donc zéro `send()` de plus. */
  sail: {
    away: (d) => `Eduardo takes the star boat out to sea. He wants to see what's on the other side (back in ${d}).`,
    back: (goods) => `The star boat is back. Eduardo brings: ${goods}.`,
  },
  /* ── CE QUE LA VILLE GARDE. */
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
      hint: "💡 Mark the next place",
      all: "⏭⏭ All but the duet",
      /* ⚠️ ZIP 454 — les deux étapes qui se comptent en MINUTES RÉELLES (15 pour
         les plans, 24 pour les cinq pièces de bois). Sans ces boutons, on ne
         regarderait le plan et le fantôme qu'une fois, donc on ne les jugerait
         qu'une fois — la raison d'être de tout ce menu. */
      plans: "📐 Hand me the plans",
      timber: "🪵 Deliver all the timber",
    }[op] || op),
    scene: (s) => ({ warn: "🎬 The announcement", fall: "🎬 The fall", turn: "🎬 The turn", end: "🎬 The ending" }[s] || s),
    sceneLabel: "Replay a scene",
    chat: (who, what) => `${who} touched the star quest: ${what}.`,
  },
  /* ── LES ANNONCES DE CHAT. ⚠️ SANS EMOJI EN TÊTE : `broadcastChat` en écrit
     déjà un, et le 442 a livré « 🔍 🔍 Joueur1 a trouvé… » sur six libellés
     avant qu'une séance à deux clients ne le montre. */
  chat: {
    start: "Something fell out of the sky.",
    found: (who, n, total) => `${who} found a piece. ${nen(n)} of ${nen(total)}.`,
    chapter: (t) => `${t}`,
    crater: (who) => `${who} coaxed the little star out of the crater.`,
    lean: (who) => `${who} crossed the shadows. A new place is marked.`,
    duet: (n, total) => `Phrase ${n} of ${total}.`,
    /* ⚠️ ZIP 453 — « The boat sailed » était faux : il restait à quai. */
    done: "The boat is finished. The star went home.",
  },
  /* ── LES INVITES, UNE SEULE CLÉ-FONCTION. ⚠️ Le préfixe `star:` est lu une
     fois, ici — six `if` répartis dans trois boucles de rendu finiraient par ne
     pas dire la même chose (c'est la convention posée par `enqPrompt` au 442,
     et c'est la seule chose de l'enquête qui survit telle quelle). */
  prompt: (k) => ({
    furrow: "E: look at it",
    crater: "E: stand still",
    craterHot: "E: wait for it to cool",
    lean: "E: let it sing",
    dive: "E: dive",
    sweep: "E: hold the star up",
    lure: "E: lead it away",
    climb: "E: climb",
    bell: "E: listen",
    organ: "E: sit at the organ",
    engineer: "E: talk to the shipwright",
  })[k] || "E",
};
/* ⚠️ LE MENU DÉVELOPPEUR EST LA MÊME TABLE DES DEUX CÔTÉS — pointée, jamais
   recopiée (voir la note au-dessus de `STAR_EN`). `verify-strings` apparie les
   clés : il voit `dev` des deux côtés, et il a raison, c'est le même objet. */
STAR_FR.dev = STAR_EN.dev;

export const FERME_STR = {
  fr: {
    /* ⚠️⚠️ ZIP 450 — LA QUÊTE EST TRADUITE. Cette ligne disait `star: STAR_EN`, et
       c'était la seule des 1 081 clés du fichier à ne pas être bilingue : le public
       visé ne pouvait lire aucune ligne de la seule histoire du jeu. */
    star: STAR_FR,
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
      engineer: "📐 L'architecte naval",
      engineer: "📐 L'architecte naval",
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
    // Boutique : bâtiments et animaux
    buyLabel: "Acheter",
    shopHorseTitle: (cost) => `🐴 Cheval : ${cost} or`,
    shopHorseSub: "Se déplace bien plus vite une fois enfourché. Approche-toi et appuie sur F (peut porter deux cavaliers).",
    shopHorseCount: (n, max) => `Chevaux dans la ferme : ${n}/${max}`,
    shopHorseMax: "🐴 Nombre maximum de chevaux atteint.",
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
    toastFarCauldron: "Approche-toi du chaudron pour déposer ou concocter.",
    toastNoFishToDeposit: "Tu ne portes ni truite ni brochet à déposer.",
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
    // Parchemin de recette (demande Guillaume 2026-07) : nom en haut, liste
    // des ingrédients (avec avancement), effet en bas dans une formulation
    // voilée, sans chiffres de gameplay.
    scrollIngAmethyst: (have, need) => `${need} améthyste de la réserve commune (${have}/${need})`,
    scrollIngTrout: (dep, need) => `${need} truites versées au chaudron (${dep}/${need})`,
    scrollIngPike: (dep, need) => `${need} brochet versé au chaudron (${dep}/${need})`,
    cauldronScrollEffect: "« Qui s'en oint la peau chemine un temps parmi les ombres, et les créatures de la nuit se détournent de son passage. »",
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
    toastNoCauldronStock: "Tu ne portes pas de chaudron à poser.",
    toastCauldronNotEmpty: "Vide le chaudron (poisson déposé) avant de le déplacer.",
    cauldronRowTitle: "⚗️ Chaudron",
    cauldronRowSub: "Ramené du monde maléfique. Pose-le où tu veux avec l'outil Construction : il sert alors à fabriquer la pommade de protection.",
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
    fxMagicOre: (n) => `+${n} minerai magique`,
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
      townBelvedere: "🔭 Valley Town — le belvédère",
      townBoutique: "👗 Valley Town — la Haute-Ville",   // zip 427
      townMarket: "🎪 Valley Town — le champ de foire",   // zip 426
      townLake: "🏞️ Valley Town — le lac",
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
    buyLabel: "Buy",
    shopHorseTitle: (cost) => `🐴 Horse: ${cost} gold`,
    shopHorseSub: "Moves much faster once mounted. Walk up to it and press F (can carry two riders).",
    shopHorseCount: (n, max) => `Horses on the farm: ${n}/${max}`,
    shopHorseMax: "🐴 Maximum number of horses reached.",
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
    scrollIngAmethyst: (have, need) => `${need} amethyst from the common reserve (${have}/${need})`,
    scrollIngTrout: (dep, need) => `${need} trout poured into the cauldron (${dep}/${need})`,
    scrollIngPike: (dep, need) => `${need} pike poured into the cauldron (${dep}/${need})`,
    cauldronScrollEffect: "“Who anoints their skin with it walks a while among the shadows, and the creatures of the night turn away from their path.”",
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
    toastNoCauldronStock: "You aren't carrying a cauldron to place.",
    toastCauldronNotEmpty: "Empty the cauldron (deposited fish) before moving it.",
    cauldronRowTitle: "⚗️ Cauldron",
    cauldronRowSub: "Brought back from the evil world. Place it anywhere with the Build tool: it's then used to craft the protection salve.",
    toastNoFishToDeposit: "You're not carrying any trout or pike to deposit.",
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
    fxMagicOre: (n) => `+${n} magic ore`,
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
      townBelvedere: "🔭 Valley Town — the belvedere",
      townBoutique: "👗 Valley Town — Upper Town",
      townMarket: "🎪 Valley Town — the fairground",      // zip 426
      townLake: "🏞️ Valley Town — the lake",
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
