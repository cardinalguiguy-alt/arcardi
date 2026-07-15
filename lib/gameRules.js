/* ==========================================================================
   RÈGLES SYNTHÉTIQUES DES JEUX. Contenu affiché par GameRulesButton /
   GameRulesModal (voir components/GameRulesButton.js), accessible via le
   bouton discret "i" présent dans chaque jeu, au même endroit que le bouton
   "revoir l'entrée", dans les 4 stages : Door/Curtain/Flash/VideoStage.

   Volontairement séparé de lib/i18n.js (STR) : ce sont de gros pavés de
   texte structuré, pas de simples libellés courts, et les garder à part
   évite de faire gonfler l'objet STR existant. Bilingue FR/EN, comme le
   reste du site. Chaque entrée expose { fr, en } avec la même forme :
     - title   : titre affiché en tête de la fenêtre de règles
     - intro   : court chapeau d'1-2 phrases
     - sections: [{ h: titre de section, items: [phrases courtes] }]
     - table   : optionnel, { headers: [...], rows: [[...], ...] } pour une
       petite illustration tabulaire (ex : combinaisons du Yahtzee, cartes
       spéciales de Chromatik, force des cartes au Président). Reprend le
       vocabulaire visuel déjà connu du joueur (valeurs de dés, couleurs de
       cartes) plutôt que de nouvelles illustrations graphiques.

   Pas de spoil des énigmes narratives (Piano Escape Room, Échos, Diapason) :
   uniquement le format et les mécaniques de communication/coopération,
   jamais les solutions.

   PASSE DE FORME (2026-07) : le contenu de chaque jeu a été relu et
   retravaillé dans sa présentation uniquement, jamais dans le fond. Trois
   règles suivies partout : pas de tiret quadratin, des phrases courtes et
   simples, et un ordre de lecture qui va du plus simple (but, tour de base)
   au plus compliqué (cas spéciaux, bonus rares, tableaux de référence).
   ========================================================================== */

export const GAME_RULES = {
  quiz: {
    fr: {
      title: "🧠 Quiz Éclair · règles",
      intro: "Répondez vite et juste pour marquer plus de points que les autres. 10 questions à choix multiples, tout le monde répond en même temps, chacun sur son écran.",
      sections: [
        { h: "Déroulé", items: [
          "Chaque question propose 4 réponses. Verrouillez la vôtre d'un clic (ou barre Espace).",
          "Dès que tout le monde a verrouillé, la question se termine aussitôt : pas besoin d'attendre le chrono.",
        ] },
        { h: "Score", items: [
          "Une bonne réponse rapporte des points. Plus vous répondez vite, plus elle en rapporte.",
        ] },
        { h: "Bonus d'enchaînement", items: [
          "3 bonnes réponses d'affilée donnent 1 jeton de bonus, utilisable une fois par question.",
          "50/50 : élimine 2 des 3 mauvaises réponses.",
          "Attaque de temps : réduit de moitié le temps des autres joueurs sur cette question, jamais le vôtre.",
        ] },
      ],
    },
    en: {
      title: "🧠 Quiz Éclair · rules",
      intro: "Answer fast and right to score more points than everyone else. 10 multiple-choice questions, everyone answers at the same time, each on their own screen.",
      sections: [
        { h: "How it works", items: [
          "Each question has 4 answers. Lock yours in with a click (or the Space bar).",
          "As soon as everyone has locked in, the question ends right away: no need to wait for the clock.",
        ] },
        { h: "Scoring", items: [
          "A correct answer scores points. The faster you answer, the more it's worth.",
        ] },
        { h: "Streak bonus", items: [
          "3 correct answers in a row give you 1 bonus token, usable once per question.",
          "50/50: removes 2 of the 3 wrong answers.",
          "Time attack: halves the other players' time on this question, never your own.",
        ] },
      ],
    },
  },

  wordle: {
    fr: {
      title: "🔤 Mot Mystère · règles",
      intro: "Un mot caché de 5 lettres : devinez-le avant tout le monde, chacun sur son écran, en 6 essais maximum.",
      sections: [
        { h: "Indices de couleur", items: [
          "🟩 lettre correcte, bien placée.",
          "🟨 lettre présente dans le mot, mais mal placée.",
          "⬜ lettre absente du mot.",
        ] },
        { h: "Score", items: [
          "Moins vous utilisez d'essais pour trouver le mot, plus vous marquez de points.",
        ] },
      ],
    },
    en: {
      title: "🔤 Mot Mystère · rules",
      intro: "A hidden 5-letter word: guess it before everyone else, each on your own screen, in 6 tries max.",
      sections: [
        { h: "Colour hints", items: [
          "🟩 correct letter, right spot.",
          "🟨 letter is in the word, wrong spot.",
          "⬜ letter isn't in the word.",
        ] },
        { h: "Scoring", items: [
          "The fewer tries you need, the more points you score.",
        ] },
      ],
    },
  },

  worldle: {
    fr: {
      title: "🌍 Worldle · règles",
      intro: "Un pays mystère à deviner en 10 essais grâce à des indices de distance et de direction.",
      sections: [
        { h: "Un essai", items: [
          "Proposez un pays : vous recevez sa distance (en km) jusqu'au pays cible, une flèche de direction, et un pourcentage de proximité.",
          "Une pastille indique si votre proposition est sur le même continent que la cible.",
        ] },
        { h: "Score", items: [
          "Chaque essai en plus coûte 1 point : 10 points au 1er essai, 9 au 2e, et ainsi de suite jusqu'à 1 point au 10e. Aucun point si vous n'avez pas trouvé après 10 essais.",
        ] },
      ],
    },
    en: {
      title: "🌍 Worldle · rules",
      intro: "A mystery country to guess in 10 tries, using distance and direction hints.",
      sections: [
        { h: "A guess", items: [
          "Propose a country: you get its distance (in km) to the target, a direction arrow, and a proximity percentage.",
          "A badge shows whether your guess is on the same continent as the target.",
        ] },
        { h: "Scoring", items: [
          "Each extra try costs 1 point: 10 points on try 1, 9 on try 2, and so on down to 1 point on try 10. No points if you haven't found it after 10 tries.",
        ] },
      ],
    },
  },

  piano: {
    fr: {
      title: "🎹 Piano Escape Room · règles",
      intro: "Résolvez ensemble les énigmes musicales des 5 salles pour vous échapper. Escape game coopératif, tout le monde voit et entend la même chose.",
      sections: [
        { h: "But", items: [
          "Progressez de salle en salle en résolvant des énigmes sonores : écouter, reconnaître et rejouer des notes sur le clavier virtuel.",
        ] },
        { h: "Coopération", items: [
          "Tout le monde voit et entend la même chose en même temps : communiquez à voix haute pour avancer ensemble.",
        ] },
      ],
    },
    en: {
      title: "🎹 Piano Escape Room · rules",
      intro: "Solve the musical puzzles of all 5 rooms together to escape. A cooperative escape game, everyone sees and hears the same thing.",
      sections: [
        { h: "Goal", items: [
          "Move from room to room by solving sound puzzles: listen, recognise and replay notes on the virtual keyboard.",
        ] },
        { h: "Cooperation", items: [
          "Everyone sees and hears the same thing at the same time : talk it through together to move forward.",
        ] },
      ],
    },
  },

  connect4: {
    fr: {
      title: "🔴 Puissance 4 · règles",
      intro: "Alignez 4 jetons de votre couleur avant votre adversaire. Le classique, à 2 joueurs, sur une grille de 7 colonnes × 6 lignes.",
      sections: [
        { h: "But", items: [
          "Alignez 4 jetons de votre couleur (horizontalement, verticalement ou en diagonale) avant votre adversaire.",
        ] },
        { h: "Score", items: [
          "Victoire, défaite ou match nul rapportent des points différents.",
        ] },
      ],
    },
    en: {
      title: "🔴 Connect Four · rules",
      intro: "Line up 4 tokens of your colour before your opponent does. The classic, 2 players, on a 7-column × 6-row grid.",
      sections: [
        { h: "Goal", items: [
          "Line up 4 tokens of your colour (horizontally, vertically or diagonally) before your opponent.",
        ] },
        { h: "Scoring", items: [
          "Win, loss or draw each award a different number of points.",
        ] },
      ],
    },
  },

  tupreferes: {
    fr: {
      title: "🤔 Tu préfères ? · règles",
      intro: "Un duel de dilemmes à deux joueurs. À chaque manche, une question « Tu préfères A ou B ? » : vous choisissez en secret, puis vous devinez ce que l'autre a choisi.",
      sections: [
        { h: "Déroulé d'une manche", items: [
          "Une question apparaît : Tu préfères A ou B ?",
          "Chacun choisit sa réponse en secret, puis verrouille son choix.",
          "Chacun essaie ensuite de deviner le choix de l'autre, et verrouille sa devinette.",
          "Les deux choix et les deux devinettes sont révélés en même temps.",
        ] },
        { h: "Score", items: [
          "1 point chacun si vous avez choisi la même réponse : c'est le point de compatibilité.",
          "1 point pour vous si vous avez deviné juste le choix de l'adversaire.",
          "Donc 0, 1 ou 2 points par manche et par joueur.",
        ] },
        { h: "Fin de partie", items: [
          "Les manches s'enchaînent jusqu'à ce qu'un joueur atteigne le score cible avec au moins un point d'avance. Pas de victoire à égalité.",
          "Avant de lancer la partie, l'hôte choisit le score à atteindre, le temps de chaque phase et les types de questions.",
        ] },
      ],
    },
    en: {
      title: "🤔 Would You Rather? · rules",
      intro: "A two-player dilemma duel. Each round, a “Would you rather A or B?” question: you choose in secret, then guess what the other picked.",
      sections: [
        { h: "How a round works", items: [
          "A question appears: Would you rather A or B?",
          "Each of you picks an answer in secret, then locks it in.",
          "Each of you then tries to guess the other's pick, and locks the guess in.",
          "Both picks and both guesses are revealed at the same time.",
        ] },
        { h: "Scoring", items: [
          "1 point each if you both picked the same answer: that's the compatibility point.",
          "1 point for you if you correctly guessed the opponent's pick.",
          "So 0, 1 or 2 points per round per player.",
        ] },
        { h: "End of game", items: [
          "Rounds continue until one player reaches the target score with at least a one-point lead. No win on a tie.",
          "Before starting, the host sets the target score, the time per phase, and the question types.",
        ] },
      ],
    },
  },

  ludo: {
    fr: {
      title: "🐴 Petits Chevaux · règles",
      intro: "Soyez le premier à faire faire le tour du plateau à vos 4 pions et à les ramener au centre. Le jeu classique, 2 à 4 joueurs, sur un plateau partagé.",
      sections: [
        { h: "But", items: [
          "Faites sortir vos 4 pions de leur enclos, faites le tour du plateau, puis ramenez-les dans la zone d'arrivée au centre. Le premier arrivé gagne.",
          "En duel (1 contre 1), les deux joueurs partent d'enclos diagonalement opposés, face à face, à une demi-piste d'écart.",
        ] },
        { h: "Le tour", items: [
          "À chaque tour, vous lancez deux dés. Additionnez-les pour avancer un seul pion, ou jouez chaque dé séparément sur deux pions différents (un 3 et un 5 avancent soit un pion de 8, soit un pion de 3 et un autre de 5).",
          "Vous avez 20 secondes pour jouer, dès le début de votre tour, pas seulement après avoir lancé. Le minuteur repart à zéro à chaque coup joué et à chaque relance méritée.",
        ] },
        { h: "Sortie de l'enclos et relances", items: [
          "Sortir un pion demande un 6 sur un seul dé, jamais sur la somme des deux. Seul ce dé est alors utilisé, l'autre reste à jouer normalement.",
          "Un seul 6 dans le tirage offre une relance d'un seul dé en fin de tour. Deux 6 offrent une relance complète des deux dés. Mais trois lancers d'affilée avec un 6 font perdre le tour.",
        ] },
        { h: "Cases sûres et cases « ? »", items: [
          "Les cases étoilées protègent vos pions : un adversaire ne peut pas vous y capturer.",
          "Atterrir pile sur une case « ? » ouvre la roue de la fortune. Cliquez dessus (ou appuyez sur Espace) pour la lancer. Le résultat ne se révèle qu'à la fin de sa rotation, et tout le monde la voit tourner.",
          "Bonus et malus classiques : +3 cases, recul de 4, un seul dé pour le joueur suivant, ou une relance offerte.",
          "Bonus et malus extrêmes, bien plus rares : un bond de +8 cases, un autre pion libéré directement de l'enclos, un pion renvoyé à l'enclos, ou un recul de 8 cases.",
        ] },
        { h: "Astuce", items: [
          "À votre tour, la barre Espace lance les dés. Elle sert aussi à lancer la roue de la fortune quand une case « ? » l'exige.",
        ] },
      ],
    },
    en: {
      title: "🐴 Petits Chevaux · rules",
      intro: "Be the first to race your 4 pawns around the board and bring them home to the centre. The classic game, 2 to 4 players, on a shared board.",
      sections: [
        { h: "Goal", items: [
          "Get your 4 pawns out of their yard, race them around the board, then bring them home to the finish zone in the centre. First one there wins.",
          "In a duel (1 vs 1), both players start from diagonally opposite yards, face to face, half a track apart.",
        ] },
        { h: "Your turn", items: [
          "Each turn you roll two dice. Add them up to move a single pawn, or play each die separately on two different pawns (a 3 and a 5 move either one pawn by 8, or one pawn by 3 and another by 5).",
          "You have 20 seconds to play, starting right at the beginning of your turn, not only after rolling. The timer resets fully on every move and every earned re-roll.",
        ] },
        { h: "Leaving the yard and re-rolls", items: [
          "Leaving the yard requires a 6 on one die, never on the sum of both. Only that die is used, the other is still yours to play normally.",
          "A single 6 in the roll grants a re-roll of one die at the end of your turn. Two 6s grant a full re-roll of both dice. But three rolls in a row with a 6 forfeit the turn.",
        ] },
        { h: "Safe spots and « ? » tiles", items: [
          "Starred spaces protect your pawns: opponents can't capture you there.",
          "Landing exactly on a « ? » tile opens the wheel of fortune. Click it (or press Space) to spin. The result is only revealed once it stops, and everyone watches it turn.",
          "Classic bonuses and penalties: +3 spaces, 4 spaces back, a single die for the next player, or a free re-roll.",
          "Extreme bonuses and penalties, much rarer: an 8-space leap, another token freed straight from the yard, a token sent back to the yard, or an 8-space setback.",
        ] },
        { h: "Tip", items: [
          "On your turn, the Space bar rolls the dice. It also spins the wheel of fortune whenever a « ? » tile calls for it.",
        ] },
      ],
    },
  },

  echoes: {
    fr: {
      title: "🌊 Échos · règles",
      intro: "Escape room coopératif et asymétrique à 2 joueurs : chacun enfermé dans sa propre pièce, sans rien voir de celle de l'autre.",
      sections: [
        { h: "But", items: [
          "10 chapitres à résoudre en communiquant (voix ou chat) ce que chacun voit de son côté : aucun des deux n'a jamais toute l'information seul.",
          "Au programme : code des lanternes, rouages, mémoire, vannes de la salle des machines, cadran, décor mouvant, lampisterie à bascule, chiffre du gardien, carte des étoiles, puis les deux leviers à actionner en même temps.",
        ] },
        { h: "Chrono commun", items: [
          "18 minutes pour tout le monde. Une mauvaise tentative fait perdre du temps à l'équipe entière.",
        ] },
      ],
    },
    en: {
      title: "🌊 Échos · rules",
      intro: "An asymmetric cooperative escape room for 2 players: each locked in their own room, with no view of the other's.",
      sections: [
        { h: "Goal", items: [
          "10 chapters to solve by describing to each other (voice or chat) what you each see on your side : neither of you ever has the full picture alone.",
          "On the menu: lantern code, gears, memory, engine-room valves, dial, moving décor, flip-the-lamps board, the keeper's cipher, the star chart, then both levers to pull at the same time.",
        ] },
        { h: "Shared timer", items: [
          "18 minutes for the whole team. A wrong attempt costs the whole team time.",
        ] },
      ],
    },
  },

  diapason: {
    fr: {
      title: "🎼 Diapason · règles",
      intro: "Prologue narratif coopératif à 2 joueurs, en 3 épreuves : Le Réveil, L'Accord, Le Cadenas.",
      sections: [
        { h: "But", items: [
          "Chacun est enfermé dans sa propre salle, Est ou Ouest, sans rien voir de celle de l'autre.",
          "Ce que vous voyez chez vous ne vous sert jamais à vous. Décrivez-le à voix haute (ou au chat) à votre partenaire : c'est lui que ça aide, et réciproquement.",
        ] },
        { h: "Progression", items: [
          "Le Réveil : trouvez l'interrupteur, puis réglez les cadrans de votre porte sur le code décrit par votre partenaire.",
          "L'Accord : tournez la manivelle de votre boîte à musique. L'accord ne se joue que chez votre partenaire, qui doit l'identifier : validez l'intervalle qu'il vous annonce.",
          "Le Cadenas : allumez le candélabre pour révéler la tablette gravée, puis réglez les 4 anneaux du cadenas final.",
        ] },
        { h: "Cordes (vies)", items: [
          "Pas de chrono, mais 3 cordes partagées. Chaque mauvaise tentative en casse une. À zéro corde, l'instrument se brise et il faut recommencer : réfléchissez avant de valider.",
        ] },
      ],
    },
    en: {
      title: "🎼 Diapason · rules",
      intro: "A cooperative narrative prologue for 2 players, in 3 trials: The Awakening, The Chord, The Padlock.",
      sections: [
        { h: "Goal", items: [
          "Each of you is locked in your own room, East or West, with no view of the other's.",
          "What you see in your room is never useful to you. Describe it out loud (or via chat) to your partner: it helps them, and vice versa.",
        ] },
        { h: "Progression", items: [
          "The Awakening: find the light switch, then set your door's dials to the code your partner describes.",
          "The Chord: turn your music box's crank. The chord only plays on your partner's side, and they must identify it: confirm the interval they call out.",
          "The Padlock: light the candelabra to reveal the engraved tablet, then set the final padlock's 4 rings.",
        ] },
        { h: "Strings (lives)", items: [
          "No timer, but 3 shared strings. Each wrong attempt snaps one. At zero strings the instrument breaks and you must start over: think before you confirm.",
        ] },
      ],
    },
  },

  heist: {
    fr: {
      title: "🖼️ Le Louvre · règles",
      intro: "Escape room coopératif, asymétrique et nerveux à 2 joueurs : deux cambrioleurs infiltrés chacun dans une aile du Louvre (Denon / Richelieu), sans rien voir de l'autre.",
      sections: [
        { h: "But", items: [
          "6 coups à réussir en communiquant (voix ou chat) ce que chacun voit. Aucun des deux n'a jamais toute l'information seul.",
          "Boîtier d'alarme, champ de lasers, coffre, pièce authentique, ronde du gardien, puis la Joconde : le coup final, le plus long. Deux codes de 5 symboles à information croisée (l'indice de chacun s'affiche chez l'autre), puis un décrochage parfaitement synchronisé. Gardez du temps pour elle.",
        ] },
        { h: "Deux façons de tout perdre", items: [
          "La ronde du gardien dure 6 minutes. Si le temps s'écoule, vous êtes cueillis à l'intérieur.",
          "La jauge d'alerte monte à chaque faux pas. À 100 %, vous êtes repérés, c'est fini. Ne tentez pas au hasard.",
        ] },
      ],
    },
    en: {
      title: "🖼️ The Louvre · rules",
      intro: "A tense, asymmetric cooperative escape room for 2 players: two burglars each infiltrated in a wing of the Louvre (Denon / Richelieu), blind to the other's side.",
      sections: [
        { h: "Goal", items: [
          "6 jobs to pull off by describing to each other (voice or chat) what you each see. Neither of you ever has the full picture alone.",
          "Alarm box, laser field, vault, genuine piece, guard's round, then the Mona Lisa: the final and longest job. Two 5-symbol codes with crossed clues (each code's clue shows on the other's side), then a perfectly synchronized lift. Save time for her.",
        ] },
        { h: "Two ways to lose everything", items: [
          "The guard's round lasts 6 minutes. If time runs out, you're caught inside.",
          "The alert gauge rises on every misstep. At 100% you're spotted, game over. Don't guess blindly.",
        ] },
      ],
    },
  },

  goldmines: {
    fr: {
      title: "⛏️ Jean-Jacques GoldMines · règles",
      intro: "Le démineur à l'envers, en duel : au lieu d'éviter des mines, cherchez l'or. Premier mineur à 13 pépites remporte la partie (contre un autre joueur ou un bot).",
      sections: [
        { h: "Le coup de pioche", items: [
          "Chacun son tour, cliquez une case du plateau (11×11, 25 pépites cachées). Trois résultats sont possibles.",
          "Pépite : votre score augmente de 1 et vous rejouez aussitôt.",
          "Chiffre : indique le nombre de pépites dans les 8 cases adjacentes, puis le tour passe à l'adversaire.",
          "Case vide : toute la zone vide voisine se dévoile d'un coup, puis le tour passe à l'adversaire. Attention, ça lui offre des indices.",
        ] },
        { h: "La dynamite", items: [
          "Une seule par joueur et par partie. Elle remplace votre coup et creuse les 9 cases d'un carré 3×3 d'un seul coup.",
          "Les pépites soufflées sont pour vous. S'il y en a au moins une, vous rejouez.",
          "Utilisez-la au bon moment : mal placée, elle ne révèle des indices que pour votre adversaire.",
        ] },
        { h: "Victoire", items: [
          "Le premier à 13 pépites gagne immédiatement : 13 sur 25, c'est la majorité absolue, un vainqueur est garanti.",
          "Trop lent ? Au bout de 30 secondes, la pioche part toute seule au hasard (5 secondes en cas de récidive).",
        ] },
      ],
    },
    en: {
      title: "⛏️ Gold Mines · rules",
      intro: "Minesweeper in reverse, as a duel: instead of avoiding mines, hunt for gold. First miner to 13 nuggets wins the game (against another player or a bot).",
      sections: [
        { h: "The dig", items: [
          "Each in turn, click a tile on the board (11×11, 25 hidden nuggets). Three outcomes are possible.",
          "Nugget: your score goes up by 1 and you immediately dig again.",
          "Number: tells you how many nuggets sit in the 8 adjacent tiles, then the turn passes to your opponent.",
          "Empty tile: the whole neighbouring empty area opens up at once, then the turn passes to your opponent. Careful, that hands them clues.",
        ] },
        { h: "The dynamite", items: [
          "Only one per player per game. It replaces your dig and blasts the 9 tiles of a 3×3 square at once.",
          "Blasted nuggets are yours. If there is at least one, you dig again.",
          "Time it well: badly placed, it only reveals clues for your opponent.",
        ] },
        { h: "Winning", items: [
          "First to 13 nuggets wins on the spot: 13 out of 25 is an absolute majority, a winner is guaranteed.",
          "Too slow? After 30 seconds the dig happens randomly on its own (5 seconds for repeat offenders).",
        ] },
      ],
    },
  },

  chromatik: {
    fr: {
      title: "🃏 Uno Chromatik · règles",
      intro: "Videz votre main avant les autres, manche après manche : le score cumulé le plus BAS gagne la partie. Jeu de cartes à défausse colorée, 2 à 4 joueurs (les sièges vides sont comblés par des bots), en 5, 7 ou 10 manches au choix de l'hôte.",
      sections: [
        { h: "But", items: [
          "Sur chaque manche, soyez le premier à vider votre main. Le joueur qui ouvre la manche change à chaque manche.",
        ] },
        { h: "Jouer une carte", items: [
          "Posez une carte de la même couleur, de la même valeur, ou une carte spéciale/joker, par rapport à la dernière carte défaussée.",
          "Si vous ne pouvez pas ou ne voulez pas jouer, piochez une carte : cela termine votre tour.",
        ] },
        { h: "Score", items: [
          "À la fin de chaque manche, chacun ajoute à son score de partie la valeur des cartes qui lui restent en main (voir le tableau plus bas). Celui qui a vidé sa main ajoute 0.",
          "Une fois toutes les manches jouées, le score de partie le plus bas gagne : mieux vaut se débarrasser tôt des cartes qui coûtent cher.",
        ] },
        { h: "Surenchère +2 / +4", items: [
          "Un +2 reçu peut être contré par un autre +2 ou par un +4. Le total à piocher s'additionne et passe au joueur suivant.",
          "Un +4 reçu ne peut être contré que par un autre +4.",
          "Un +2 ne peut pas contrer un +4 : seul un +4 arrête un +4.",
          "Impossible de contrer ? Piochez le total accumulé, votre tour s'arrête là.",
        ] },
        { h: "Annonce UNO", items: [
          "Dès qu'il ne vous reste qu'une carte, un petit bouton \"UNO !\" apparaît. Pressez-le avant de poser cette dernière carte.",
          "Oubli ? Si vous vous débarrassez de votre dernière carte sans avoir annoncé UNO, vous piochez 2 cartes et la manche continue.",
        ] },
      ],
      table: {
        headers: ["Carte", "Effet de jeu", "Valeur en fin de manche"],
        rows: [
          ["0 à 9", "Aucun effet spécial.", "Valeur du chiffre (0 à 9 pts)"],
          ["⏭ Passe", "Le joueur suivant passe son tour.", "20 pts"],
          ["🔄 Inverse", "Le sens du jeu change.", "20 pts"],
          ["+2", "Le joueur suivant pioche 2 (ou contre avec son propre +2/+4).", "20 pts"],
          ["🃏 Joker", "Vous choisissez la couleur en cours.", "50 pts"],
          ["🃏 +4", "Vous choisissez la couleur ; le joueur suivant pioche 4 (ou contre avec un +4).", "50 pts"],
        ],
      },
    },
    en: {
      title: "🃏 Uno Chromatik · rules",
      intro: "Empty your hand before the others, round after round: the LOWEST cumulative score wins the match. A colour-matching card game, 2 to 4 players (empty seats are filled by bots), over 5, 7 or 10 rounds chosen by the host.",
      sections: [
        { h: "Goal", items: [
          "Each round, be the first to empty your hand. The opening player rotates every round.",
        ] },
        { h: "Playing a card", items: [
          "Play a card matching the colour, the value, or a special/wild card, compared to the last discarded card.",
          "If you can't or don't want to play, draw a card: that ends your turn.",
        ] },
        { h: "Scoring", items: [
          "At the end of every round, everyone adds the value of the cards left in their hand to their match score (see the table below). Whoever emptied their hand adds 0.",
          "Once all rounds are played, the lowest match score wins: get rid of expensive cards early.",
        ] },
        { h: "+2 / +4 stacking", items: [
          "A +2 you receive can be countered with another +2 or a +4. The draw total adds up and passes to the next player.",
          "A +4 you receive can only be countered with another +4.",
          "A +2 cannot counter a +4: only a +4 stops a +4.",
          "Can't counter? Draw the accumulated total, your turn ends there.",
        ] },
        { h: "UNO call", items: [
          "The moment you're down to one card, a small \"UNO!\" button appears. Press it before playing that last card.",
          "Forgot? If you play your last card without having called UNO, you draw 2 cards and the round continues.",
        ] },
      ],
      table: {
        headers: ["Card", "In-game effect", "End-of-round value"],
        rows: [
          ["0 to 9", "No special effect.", "Face value (0 to 9 pts)"],
          ["⏭ Skip", "The next player's turn is skipped.", "20 pts"],
          ["🔄 Reverse", "Play direction switches.", "20 pts"],
          ["+2", "The next player draws 2 (or counters with their own +2/+4).", "20 pts"],
          ["🃏 Wild", "You choose the current colour.", "50 pts"],
          ["🃏 Wild +4", "You choose the colour; the next player draws 4 (or counters with a +4).", "50 pts"],
        ],
      },
    },
  },

  yahtzee: {
    fr: {
      title: "🎲 Yahtzee · règles",
      intro: "Remplissez au mieux vos 13 catégories : le meilleur total de feuille gagne. Jeu de dés au tour par tour, 5 dés, jusqu'à 3 lancers par tour.",
      sections: [
        { h: "Un tour", items: [
          "Lancez les 5 dés, puis relancez ceux que vous voulez (jusqu'à 2 fois de plus).",
          "Inscrivez ensuite le résultat dans une seule catégorie encore libre de votre feuille.",
        ] },
        { h: "Section supérieure", items: [
          "Catégories 1 à 6 : la somme des dés montrant cette valeur.",
          "Bonus de +35 points si le sous-total de la section supérieure atteint 63.",
        ] },
      ],
      table: {
        headers: ["Combinaison", "Points"],
        rows: [
          ["🎲 Brelan (≥3 identiques)", "Somme de TOUS les dés"],
          ["🎲 Carré (≥4 identiques)", "Somme de TOUS les dés"],
          ["🎲 Full (brelan + paire)", "25 pts"],
          ["🎲 Petite suite (4 valeurs de suite)", "30 pts"],
          ["🎲 Grande suite (5 valeurs de suite)", "40 pts"],
          ["🎲 Yahtzee (5 identiques)", "50 pts (+100 par Yahtzee supplémentaire)"],
          ["🎲 Chance", "Somme de tous les dés"],
        ],
      },
    },
    en: {
      title: "🎲 Yahtzee · rules",
      intro: "Fill your 13 categories as well as you can: the best scorecard total wins. A turn-based dice game, 5 dice, up to 3 rolls per turn.",
      sections: [
        { h: "A turn", items: [
          "Roll the 5 dice, then re-roll any you like (up to 2 more times).",
          "Then record the result in one still-open category on your scorecard.",
        ] },
        { h: "Upper section", items: [
          "Categories 1 to 6: the sum of the dice showing that value.",
          "+35 bonus points if the upper section subtotal reaches 63.",
        ] },
      ],
      table: {
        headers: ["Combination", "Points"],
        rows: [
          ["🎲 Three of a kind (≥3 matching)", "Sum of ALL dice"],
          ["🎲 Four of a kind (≥4 matching)", "Sum of ALL dice"],
          ["🎲 Full house (3 + 2)", "25 pts"],
          ["🎲 Small straight (4 in a row)", "30 pts"],
          ["🎲 Large straight (5 in a row)", "40 pts"],
          ["🎲 Yahtzee (5 matching)", "50 pts (+100 per extra Yahtzee)"],
          ["🎲 Chance", "Sum of all dice"],
        ],
      },
    },
  },

  president: {
    fr: {
      title: "🎩 Président · règles",
      intro: "Débarrassez-vous de toutes vos cartes avant les autres pour devenir Président, et gardez le titre manche après manche. Jeu de plis à combinaisons, 2 à 4 joueurs (les sièges vides sont comblés par des bots).",
      sections: [
        { h: "Un tour", items: [
          "Le meneur pose 1 à 4 cartes de même valeur. Chacun à son tour doit poser le même nombre de cartes, de valeur égale ou supérieure, sinon il passe.",
          "Un ou plusieurs 2 brûlent le pli immédiatement : la même personne rejoue aussitôt.",
          "Quand tout le monde a passé, celui qui a posé en dernier ramasse le pli, qui est vide, et ouvre le suivant.",
        ] },
        { h: "Fin de manche", items: [
          "Premier à vider sa main : Président. Dernier : Trou.",
          "À partir de la 2ᵉ manche, le Trou donne ses 2 meilleures cartes au Président, qui rend 2 cartes de son choix.",
          "À 4 joueurs, le Vice-Trou fait de même avec le Vice-Président, avec 1 carte.",
        ] },
        { h: "Victoire du match", items: [
          "Chaque manche terminée en tant que Président rapporte un mandat. Le Vice-Président n'en rapporte jamais.",
          "Le premier siège à atteindre le nombre de mandats fixé par l'hôte devient Dictateur et remporte le match.",
        ] },
      ],
      table: {
        headers: ["Force des cartes (croissante)"],
        rows: [["3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · V · D · R · As · 2 (la plus forte)"]],
      },
    },
    en: {
      title: "🎩 President · rules",
      intro: "Shed all your cards before everyone else to become President, and hold the title round after round. A trick-taking card game, 2 to 4 players (empty seats are filled by bots).",
      sections: [
        { h: "A turn", items: [
          "The leader plays 1 to 4 cards of the same rank. Each player in turn must play the same number of cards, of equal or higher rank, or pass.",
          "One or more 2s burn the trick immediately: the same person plays again right away.",
          "Once everyone else has passed, the last player to have played picks up the trick, which is empty, and opens the next one.",
        ] },
        { h: "End of round", items: [
          "First to empty their hand: President. Last: Scum.",
          "From the 2nd round on, the Scum gives their 2 best cards to the President, who returns 2 cards of their choice.",
          "With 4 players, the Vice-Scum does the same with the Vice-President, with 1 card.",
        ] },
        { h: "Winning the match", items: [
          "Each round finished as President earns one term. The Vice-President never earns any.",
          "The first seat to reach the number of terms set by the host becomes Dictator and wins the match.",
        ] },
      ],
      table: {
        headers: ["Card strength (ascending)"],
        rows: [["3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · J · Q · K · A · 2 (strongest)"]],
      },
    },
  },

  rami: {
    fr: {
      title: "🃏 Rami · règles",
      intro: "Débarrassez-vous de toutes vos cartes en formant des combinaisons. 2 à 6 joueurs. Un paquet de 54 cartes jusqu'à 4 joueurs, deux paquets au-delà.",
      sections: [
        { h: "Les combinaisons", items: [
          "Brelan ou carré : 3 ou 4 cartes de même valeur, d'enseignes différentes.",
          "Suite : au moins 3 cartes qui se suivent, de la même enseigne. L'As se place avant le 2 ou après le Roi, jamais les deux à la fois.",
          "Le joker remplace n'importe quelle carte et en prend la valeur. Au plus un joker par combinaison.",
        ] },
        { h: "Un tour", items: [
          "Piochez une carte, au talon ou sur la défausse.",
          "Posez éventuellement des combinaisons, et complétez celles déjà sur le tapis une fois que vous avez ouvert.",
          "Terminez votre tour en défaussant une carte.",
        ] },
        { h: "Ouvrir et compléter", items: [
          "Votre première pose doit totaliser au moins 31 points.",
          "Une fois ouvert, vous pouvez ajouter des cartes à n'importe quelle combinaison du tapis, et reprendre un joker en le remplaçant par la vraie carte.",
        ] },
        { h: "Fin de manche et partie", items: [
          "La manche s'arrête dès qu'un joueur pose et défausse sa dernière carte.",
          "Les autres comptent les points restés en main (pénalité). L'objectif est d'en avoir le moins possible.",
          "En manche unique, le premier à faire Rami gagne. Au score, on enchaîne les manches jusqu'à ce qu'un joueur atteigne 51 ou 101 points : le plus bas score l'emporte.",
        ] },
      ],
      table: {
        headers: ["Valeur des cartes"],
        rows: [["As = 11 (1 devant un 2) · figures = 10 · 2 à 10 = leur valeur · joker en main = 25"]],
      },
    },
    en: {
      title: "🃏 Rummy · rules",
      intro: "Get rid of all your cards by forming combinations. 2 to 6 players. One 54-card deck up to 4 players, two decks beyond.",
      sections: [
        { h: "Combinations", items: [
          "Set: 3 or 4 cards of the same rank, of different suits.",
          "Run: at least 3 consecutive cards of the same suit. The Ace sits before the 2 or after the King, never both at once.",
          "The joker replaces any card and takes its value. At most one joker per combination.",
        ] },
        { h: "A turn", items: [
          "Draw a card, from the stock or the discard.",
          "Optionally lay down combinations, and add on to those already on the table once you have opened.",
          "End your turn by discarding one card.",
        ] },
        { h: "Opening and adding on", items: [
          "Your first meld must total at least 31 points.",
          "Once you have opened, you can add cards to any combination on the table, and take a joker back by replacing it with the real card.",
        ] },
        { h: "End of round and game", items: [
          "The round ends as soon as a player lays down and discards their last card.",
          "The others count the points left in hand (penalty). The goal is to have as few as possible.",
          "In a single round, the first to go out wins. By score, rounds continue until a player reaches 51 or 101 points: the lowest score wins.",
        ] },
      ],
      table: {
        headers: ["Card values"],
        rows: [["Ace = 11 (1 before a 2) · face cards = 10 · 2 to 10 = their value · joker in hand = 25"]],
      },
    },
  },

  tenk: {
    fr: {
      title: "🎰 10 000 · règles",
      intro: "Jeu de dés multijoueur au tour par tour : 6 dés, 2 à 4 joueurs, des bots complètent la table si besoin.",
      sections: [
        { h: "But", items: [
          "Soyez le premier à atteindre l'objectif fixé par l'hôte : 5000 ou 10000 points.",
          "L'atteindre déclenche un dernier tour pour tout le monde. Le meilleur score total à l'issue de ce tour remporte la partie.",
        ] },
        { h: "Un lancer", items: [
          "Lancez les dés actifs, 6 au départ. Gardez ceux qui rapportent des points, les autres se relancent.",
          "Vous choisissez vous-même lesquels garder parmi les combinaisons valables. Le score correspondant s'affiche en direct.",
          "Un dé qui ne rapporte rien seul, par exemple un 4 isolé, reste sélectionnable mais bloque la validation tant qu'il traîne dans votre sélection. Retirez-le avant de continuer.",
        ] },
        { h: "Banquer ou continuer", items: [
          "Dès que le score du tour atteint 300 points, vous pouvez vous arrêter et banquer au lieu de risquer de tout perdre. Le score est ajouté à votre total et le tour passe au joueur suivant.",
          "En dessous de 300 points, impossible de banquer : il faut continuer à lancer.",
        ] },
        { h: "Hot dice et Farkle", items: [
          "Hot dice : si les 6 dés ont tous été mis de côté, en un ou plusieurs lancers, ils repartent tous ensemble et le score du tour continue de grimper.",
          "Farkle, ou lancer blanc : si un lancer ne rapporte aucun point, le tour s'arrête aussitôt. Vous ne marquez rien ce tour, et tout le score non banqué est perdu.",
          "Trois lancers blancs de suite, même sur des tours différents, vous font perdre 500 points sur votre score total. Un lancer qui rapporte de nouveau des points remet ce compteur à zéro.",
        ] },
        { h: "Astuce", items: [
          "À votre tour, la barre Espace lance les dés, en plus du bouton 🎲.",
        ] },
      ],
      table: {
        headers: ["Combinaison", "Points"],
        rows: [
          ["🎲 Un seul 1", "100 pts"],
          ["🎲 Un seul 5", "50 pts"],
          ["🎲 Brelan de 1 (111)", "1000 pts"],
          ["🎲 Brelan d'une autre valeur (ex. 333)", "valeur × 100 (200 à 600)"],
          ["🎲 4 identiques", "brelan × 2"],
          ["🎲 5 identiques", "brelan × 4"],
          ["🎲 6 identiques", "brelan × 8"],
          ["🎲 Suite de 5 dés (1-2-3-4-5 ou 2-3-4-5-6)", "1500 pts"],
          ["🎲 Suite complète des 6 dés (1-2-3-4-5-6)", "1500 pts"],
          ["🎲 Trois paires (les 6 dés)", "750 pts"],
        ],
      },
    },
    en: {
      title: "🎰 10,000 · rules",
      intro: "A turn-based multiplayer dice game: 6 dice, 2 to 4 players, bots fill empty seats if needed.",
      sections: [
        { h: "Goal", items: [
          "Be the first to reach the host's target: 5000 or 10000 points.",
          "Reaching it triggers one final round for everyone. The best total score at the end of that round wins the match.",
        ] },
        { h: "A roll", items: [
          "Roll the active dice, 6 at the start. Keep the ones worth points, re-roll the rest.",
          "You choose which dice to keep among the valid combinations. The score updates live.",
          "A die that scores nothing on its own, for example a lone 4, stays selectable but blocks confirmation while it's in your selection. Deselect it before continuing.",
        ] },
        { h: "Bank or keep rolling", items: [
          "Once the turn score reaches 300 points, you can stop and bank instead of risking it all. The score is added to your total and the turn passes to the next player.",
          "Below 300 points, banking isn't allowed: you have to keep rolling.",
        ] },
        { h: "Hot dice and Farkle", items: [
          "Hot dice: once all 6 dice have been set aside, across one or more rolls, all 6 come back into play and the turn score keeps growing.",
          "Farkle, or blank roll: if a roll scores no points at all, the turn ends immediately. You score nothing this turn, and the whole unbanked turn score is lost.",
          "Three blank rolls in a row, even across different turns, cost you 500 points off your total score. A roll that scores again resets this counter to zero.",
        ] },
        { h: "Tip", items: [
          "On your turn, the Space bar rolls the dice, in addition to the 🎲 button.",
        ] },
      ],
      table: {
        headers: ["Combination", "Points"],
        rows: [
          ["🎲 A single 1", "100 pts"],
          ["🎲 A single 5", "50 pts"],
          ["🎲 Three 1s (111)", "1000 pts"],
          ["🎲 Three of another value (e.g. 333)", "value × 100 (200 to 600)"],
          ["🎲 Four of a kind", "triple × 2"],
          ["🎲 Five of a kind", "triple × 4"],
          ["🎲 Six of a kind", "triple × 8"],
          ["🎲 5-dice straight (1-2-3-4-5 or 2-3-4-5-6)", "1500 pts"],
          ["🎲 Full straight, all 6 dice (1-2-3-4-5-6)", "1500 pts"],
          ["🎲 Three pairs (all 6 dice)", "750 pts"],
        ],
      },
    },
  },

  petitbac: {
    fr: {
      title: "✏️ Petit Bac · règles",
      intro: "Trouvez un mot par catégorie commençant par la lettre tirée, plus vite que les autres. Le Petit Bac (Scattergories) classique, de 2 à 10 joueurs, en français ou en anglais.",
      sections: [
        { h: "Une manche", items: [
          "Une lettre est tirée au sort. Remplissez votre grille de catégories avec des mots commençant par cette lettre.",
          "Dès qu'un joueur clique « J'ai fini », un compte à rebours de 10 secondes démarre pour tous les autres.",
        ] },
        { h: "Points", items: [
          "Réponse correcte et unique : 2 points.",
          "Réponse identique à celle d'un autre joueur : 1 point chacun.",
          "Réponse vide ou refusée : 0 point.",
          "L'hôte peut trancher les litiges en touchant une case pour inverser accepté et refusé, et accorder un bonus de +1 (étoile ⭐) aux réponses les plus brillantes.",
        ] },
        { h: "Avant de commencer", items: [
          "L'hôte choisit le nombre de catégories, puis approuve, personnalise ou permute chaque catégorie d'un tirage aléatoire, depuis l'écran d'accueil.",
          "Il peut aussi sauvegarder sa liste comme favorite, ou en recharger une déjà enregistrée.",
        ] },
      ],
    },
    en: {
      title: "✏️ Petit Bac · rules",
      intro: "Find one word per category starting with the drawn letter, faster than everyone else. The classic Scattergories game, 2 to 10 players, in French or English.",
      sections: [
        { h: "A round", items: [
          "A letter is drawn at random. Fill your grid of categories with words starting with that letter.",
          "As soon as one player clicks “I'm done”, a 10-second countdown starts for everyone else.",
        ] },
        { h: "Scoring", items: [
          "Correct, unique answer: 2 points.",
          "Same answer as another player: 1 point each.",
          "Empty or rejected answer: 0 points.",
          "The host can settle disputes by tapping a cell to flip accepted and rejected, and award a +1 bonus (⭐ star) to the most brilliant answers.",
        ] },
        { h: "Before you start", items: [
          "The host picks how many categories, then approves, customizes, or swaps each one from a random draw, from the home screen.",
          "They can also save their list as a favorite, or reload one saved earlier.",
        ] },
      ],
    },
  },
  chess: {
    fr: {
      title: "♟️ Échecs · règles",
      intro: "Un duel d'échecs à deux. Le but : mettre le roi adverse en échec et mat. Les coups illégaux sont refusés automatiquement.",
      sections: [
        { h: "Déroulé", items: [
          "Les Blancs commencent, puis on joue chacun son tour.",
          "Cliquez une de vos pièces pour voir ses coups possibles (les points), puis cliquez la case d'arrivée.",
          "Chaque joueur a une pendule : si votre temps tombe à zéro, vous perdez.",
        ] },
        { h: "Fin de partie", items: [
          "Échec et mat : le roi est attaqué et ne peut plus être sauvé, la partie est gagnée.",
          "Pat : le joueur au trait n'a aucun coup légal mais n'est pas en échec, c'est nulle.",
          "Nulle aussi par manque de matériel, répétition de position, ou règle des 50 coups.",
        ] },
        { h: "Coups spéciaux", items: [
          "Roque, prise en passant et promotion du pion sont gérés automatiquement.",
          "À la promotion, choisissez la pièce voulue (la Dame le plus souvent).",
          "Takeback : proposez d'annuler votre dernier coup, l'adversaire doit l'accepter.",
        ] },
      ],
    },
    en: {
      title: "♟️ Chess · rules",
      intro: "A two-player chess duel. The goal: checkmate your opponent's king. Illegal moves are refused automatically.",
      sections: [
        { h: "How to play", items: [
          "White moves first, then players alternate turns.",
          "Click one of your pieces to see its available moves (the dots), then click the destination square.",
          "Each player has a clock: if your time runs out, you lose.",
        ] },
        { h: "Ending the game", items: [
          "Checkmate: the king is attacked and cannot be saved, the game is won.",
          "Stalemate: the player to move has no legal move but is not in check, it's a draw.",
          "Also a draw by insufficient material, threefold repetition, or the 50-move rule.",
        ] },
        { h: "Special moves", items: [
          "Castling, en passant and pawn promotion are handled automatically.",
          "On promotion, pick the piece you want (usually the Queen).",
          "Takeback: offer to undo your last move, your opponent has to accept.",
        ] },
      ],
    },
  },
};
