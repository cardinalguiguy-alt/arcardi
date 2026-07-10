/* ==========================================================================
   RÈGLES SYNTHÉTIQUES DES JEUX — contenu affiché par GameRulesButton /
   GameRulesModal (voir components/GameRulesButton.js), accessible via le
   bouton discret "i" présent dans chaque jeu (au même endroit que le bouton
   "revoir l'entrée", dans les 4 stages : Door/Curtain/Flash/VideoStage).

   Volontairement séparé de lib/i18n.js (STR) : ce sont de gros pavés de
   texte structuré (pas de simples libellés courts), et les garder à part
   évite de faire gonfler l'objet STR existant. Bilingue FR/EN, comme le
   reste du site — chaque entrée expose { fr, en } avec la même forme :
     - title   : titre affiché en tête de la fenêtre de règles
     - intro   : court chapeau d'1-2 phrases
     - sections: [{ h: titre de section, items: [phrases courtes] }]
     - table   : optionnel — { headers: [...], rows: [[...], ...] } pour
       une petite "illustration" tabulaire (ex : combinaisons du Yahtzee,
       cartes spéciales de Chromatik, force des cartes au Président) —
       reprend le VOCABULAIRE VISUEL déjà connu du joueur (valeurs de dés,
       couleurs de cartes) plutôt que de nouvelles illustrations graphiques.

   Pas de spoil des énigmes narratives (Piano Escape Room, Échos, Diapason) :
   uniquement le FORMAT et les mécaniques de communication/coopération,
   jamais les solutions.
   ========================================================================== */

export const GAME_RULES = {
  quiz: {
    fr: {
      title: "🧠 Quiz Éclair — règles",
      intro: "10 questions à choix multiples : tout le monde répond en même temps, chacun sur son écran.",
      sections: [
        { h: "Déroulé", items: [
          "Chaque question propose 4 réponses. Verrouillez la vôtre d'un clic (ou barre Espace).",
          "Dès que tout le monde a verrouillé, la question se termine aussitôt — pas besoin d'attendre le chrono.",
        ] },
        { h: "Score", items: [
          "Plus vous répondez vite ET juste, plus vous marquez de points.",
        ] },
        { h: "Bonus d'enchaînement", items: [
          "3 bonnes réponses d'affilée = 1 jeton de bonus, utilisable une fois par question.",
          "50/50 : élimine 2 des 3 mauvaises réponses.",
          "Attaque de temps : réduit de moitié le temps des AUTRES joueurs sur cette question (jamais le vôtre).",
        ] },
      ],
    },
    en: {
      title: "🧠 Quiz Éclair — rules",
      intro: "10 multiple-choice questions: everyone answers at the same time, each on their own screen.",
      sections: [
        { h: "How it works", items: [
          "Each question has 4 answers. Lock yours in with a click (or the Space bar).",
          "As soon as everyone has locked in, the question ends immediately — no need to wait for the clock.",
        ] },
        { h: "Scoring", items: [
          "The faster AND more accurate you are, the more points you score.",
        ] },
        { h: "Streak bonus", items: [
          "3 correct answers in a row = 1 bonus token, usable once per question.",
          "50/50: removes 2 of the 3 wrong answers.",
          "Time attack: halves the OTHER players' time on this question (never your own).",
        ] },
      ],
    },
  },

  wordle: {
    fr: {
      title: "🔤 Mot Mystère — règles",
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
      title: "🔤 Mot Mystère — rules",
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
      title: "🌍 Worldle — règles",
      intro: "Un pays mystère à deviner en 10 essais grâce à des indices de distance et de direction.",
      sections: [
        { h: "Un essai", items: [
          "Proposez un pays : vous recevez sa distance (en km) jusqu'au pays cible, une flèche de direction, et un pourcentage de proximité.",
          "Une pastille indique si votre proposition est sur le même continent que la cible.",
        ] },
        { h: "Score", items: [
          "Trouvez le pays en peu d'essais pour marquer un maximum de points.",
        ] },
      ],
    },
    en: {
      title: "🌍 Worldle — rules",
      intro: "A mystery country to guess in 10 tries, using distance and direction hints.",
      sections: [
        { h: "A guess", items: [
          "Propose a country: you get its distance (in km) to the target, a direction arrow, and a proximity percentage.",
          "A badge shows whether your guess is on the same continent as the target.",
        ] },
        { h: "Scoring", items: [
          "Find the country in as few tries as possible to score the most points.",
        ] },
      ],
    },
  },

  piano: {
    fr: {
      title: "🎹 Piano Escape Room — règles",
      intro: "Escape game musical coopératif à 5 salles, à résoudre tous ensemble.",
      sections: [
        { h: "But", items: [
          "Progressez de salle en salle en résolvant des énigmes sonores : écouter, reconnaître et rejouer des notes sur le clavier virtuel.",
        ] },
        { h: "Coopération", items: [
          "Tout le monde voit et entend la même chose en même temps — communiquez à voix haute pour avancer ensemble.",
        ] },
      ],
    },
    en: {
      title: "🎹 Piano Escape Room — rules",
      intro: "A cooperative musical escape game with 5 rooms, to solve together.",
      sections: [
        { h: "Goal", items: [
          "Move from room to room by solving sound puzzles: listen, recognise and replay notes on the virtual keyboard.",
        ] },
        { h: "Cooperation", items: [
          "Everyone sees and hears the same thing at the same time — talk it through together to move forward.",
        ] },
      ],
    },
  },

  connect4: {
    fr: {
      title: "🔴 Puissance 4 — règles",
      intro: "Le classique Puissance 4, à 2 joueurs, sur une grille de 7 colonnes × 6 lignes.",
      sections: [
        { h: "But", items: [
          "Alignez 4 jetons de votre couleur — horizontalement, verticalement ou en diagonale — avant votre adversaire.",
        ] },
        { h: "Score", items: [
          "Victoire, défaite ou match nul rapportent des points différents.",
        ] },
      ],
    },
    en: {
      title: "🔴 Connect Four — rules",
      intro: "The classic Connect Four, 2 players, on a 7-column × 6-row grid.",
      sections: [
        { h: "Goal", items: [
          "Line up 4 tokens of your colour — horizontally, vertically or diagonally — before your opponent.",
        ] },
        { h: "Scoring", items: [
          "Win, loss or draw each award a different number of points.",
        ] },
      ],
    },
  },

  ludo: {
    fr: {
      title: "🐴 Petits Chevaux — règles",
      intro: "Le jeu des petits chevaux classique, 2 à 4 joueurs, sur un plateau partagé.",
      sections: [
        { h: "But", items: [
          "Faites sortir vos 4 pions de leur enclos, faites-en le tour du plateau, puis ramenez-les au centre — le premier arrivé gagne.",
        ] },
        { h: "Cases sûres", items: [
          "Certaines cases protègent vos pions : un adversaire ne peut pas vous y capturer.",
        ] },
      ],
    },
    en: {
      title: "🐴 Petits Chevaux — rules",
      intro: "The classic Ludo game, 2 to 4 players, on a shared board.",
      sections: [
        { h: "Goal", items: [
          "Get your 4 pawns out of their yard, race them around the board, then bring them home to the centre — first one there wins.",
        ] },
        { h: "Safe spots", items: [
          "Some spaces protect your pawns: opponents can't capture you there.",
        ] },
      ],
    },
  },

  echoes: {
    fr: {
      title: "🌊 Échos — règles",
      intro: "Escape room coopératif ASYMÉTRIQUE à 2 joueurs — chacun enfermé dans sa propre pièce, sans rien voir de celle de l'autre.",
      sections: [
        { h: "But", items: [
          "7 chapitres à résoudre en communiquant (voix ou chat) ce que chacun voit de son côté — aucun des deux n'a jamais toute l'information seul.",
        ] },
        { h: "Chrono commun", items: [
          "15 minutes pour tout le monde. Une mauvaise tentative fait perdre du temps à l'équipe entière.",
        ] },
      ],
    },
    en: {
      title: "🌊 Échos — rules",
      intro: "An ASYMMETRIC cooperative escape room for 2 players — each locked in their own room, with no view of the other's.",
      sections: [
        { h: "Goal", items: [
          "7 chapters to solve by describing to each other (voice or chat) what you each see on your side — neither of you ever has the full picture alone.",
        ] },
        { h: "Shared timer", items: [
          "15 minutes for the whole team. A wrong attempt costs the whole team time.",
        ] },
      ],
    },
  },

  diapason: {
    fr: {
      title: "🎼 Diapason — règles",
      intro: "Prologue narratif coopératif à 2 joueurs, en 3 épreuves : Le Réveil, La Clé, Le Cadenas.",
      sections: [
        { h: "But", items: [
          "Chacun est enfermé dans sa propre salle (Est / Ouest), sans rien voir de celle de l'autre.",
          "À chaque épreuve, ce que VOUS voyez chez vous ne vous sert jamais à vous — décrivez-le à voix haute (ou au chat) à votre partenaire, c'est LUI que ça aide, et réciproquement.",
        ] },
        { h: "Progression", items: [
          "Le Réveil : trouvez l'interrupteur, puis réglez les cadrans de votre porte sur le code décrit par votre partenaire.",
          "La Clé : trouvez la bonne cachette dans le débarras, puis déverrouillez votre grille.",
          "Le Cadenas : réglez les 4 anneaux du cadenas final sur le code décrit par votre partenaire.",
        ] },
        { h: "Pas de chrono", items: [
          "Une scène d'ouverture atmosphérique, pas une épreuve contre la montre — prenez votre temps.",
        ] },
      ],
    },
    en: {
      title: "🎼 Diapason — rules",
      intro: "A cooperative narrative prologue for 2 players, in 3 trials: The Awakening, The Key, The Padlock.",
      sections: [
        { h: "Goal", items: [
          "Each of you is locked in your own room (East / West), with no view of the other's.",
          "In every trial, what YOU see in your room is never useful to YOU — describe it out loud (or via chat) to your partner, it helps THEM, and vice versa.",
        ] },
        { h: "Progression", items: [
          "The Awakening: find the light switch, then set your door's dials to the code your partner describes.",
          "The Key: find the right hiding spot in the storage room, then unlock your gate.",
          "The Padlock: set the final padlock's 4 rings to the code your partner describes.",
        ] },
        { h: "No timer", items: [
          "An atmospheric opening scene, not a race against the clock — take your time.",
        ] },
      ],
    },
  },

  chromatik: {
    fr: {
      title: "🃏 Chromatik — règles",
      intro: "Jeu de cartes à défausse colorée, 2 à 4 joueurs (les sièges vides sont comblés par des bots).",
      sections: [
        { h: "But", items: [
          "Soyez le premier à vider votre main.",
        ] },
        { h: "Jouer une carte", items: [
          "Posez une carte de la même couleur, de la même valeur, ou une carte spéciale/joker que la dernière carte défaussée.",
          "Si vous ne pouvez ou ne voulez pas jouer : piochez une carte — ça termine votre tour.",
        ] },
      ],
      table: {
        headers: ["Carte", "Effet"],
        rows: [
          ["⏭ Passe", "Le joueur suivant passe son tour."],
          ["🔄 Inverse", "Le sens du jeu change."],
          ["+2", "Le joueur suivant pioche 2 cartes et passe son tour."],
          ["🃏 Joker", "Vous choisissez la couleur en cours."],
          ["🃏 +4", "Vous choisissez la couleur ; le joueur suivant pioche 4 cartes et passe son tour."],
        ],
      },
    },
    en: {
      title: "🃏 Chromatik — rules",
      intro: "A colour-matching card game, 2 to 4 players (empty seats are filled by bots).",
      sections: [
        { h: "Goal", items: [
          "Be the first to empty your hand.",
        ] },
        { h: "Playing a card", items: [
          "Play a card matching the colour, the value, or a special/wild card, of the last discarded card.",
          "If you can't or don't want to play: draw a card — that ends your turn.",
        ] },
      ],
      table: {
        headers: ["Card", "Effect"],
        rows: [
          ["⏭ Skip", "The next player's turn is skipped."],
          ["🔄 Reverse", "Play direction switches."],
          ["+2", "The next player draws 2 cards and their turn is skipped."],
          ["🃏 Wild", "You choose the current colour."],
          ["🃏 Wild +4", "You choose the colour; the next player draws 4 cards and their turn is skipped."],
        ],
      },
    },
  },

  yahtzee: {
    fr: {
      title: "🎲 Yahtzee — règles",
      intro: "Jeu de dés au tour par tour : 5 dés, jusqu'à 3 lancers par tour, 13 catégories à remplir sur votre feuille de score.",
      sections: [
        { h: "Un tour", items: [
          "Lancez les 5 dés, puis relancez ceux que vous voulez (jusqu'à 2 fois de plus).",
          "Inscrivez ensuite le résultat dans UNE seule catégorie encore libre de votre feuille.",
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
      title: "🎲 Yahtzee — rules",
      intro: "A turn-based dice game: 5 dice, up to 3 rolls per turn, 13 categories to fill on your scorecard.",
      sections: [
        { h: "A turn", items: [
          "Roll the 5 dice, then re-roll any you like (up to 2 more times).",
          "Then record the result in ONE still-open category on your scorecard.",
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
      title: "🎩 Président — règles",
      intro: "Jeu de plis à combinaisons, 2 à 4 joueurs (les sièges vides sont comblés par des bots).",
      sections: [
        { h: "Un tour", items: [
          "Le meneur pose 1 à 4 cartes de MÊME valeur. Chacun à son tour doit poser LE MÊME NOMBRE de cartes, de valeur égale ou supérieure — sinon il passe.",
          "Le(s) 2 brûle(nt) le pli immédiatement : la même personne rejoue aussitôt.",
          "Quand tout le monde a passé, celui qui a posé en dernier ramasse le pli (vide) et ouvre le suivant.",
        ] },
        { h: "Fin de manche", items: [
          "Premier à vider sa main = Président. Dernier = Trou.",
          "À partir de la 2ᵉ manche : le Trou donne ses 2 meilleures cartes au Président (qui rend 2 cartes de son choix) ; à 4 joueurs, le Vice-Trou fait de même avec le Vice-Président (1 carte).",
        ] },
        { h: "Victoire du match", items: [
          "Chaque manche terminée EN TANT QUE PRÉSIDENT rapporte un mandat (le Vice-Président n'en rapporte jamais).",
          "Le premier siège à atteindre le nombre de mandats fixé par l'hôte devient Dictateur et remporte le match.",
        ] },
      ],
      table: {
        headers: ["Force des cartes (croissante)"],
        rows: [["3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · V · D · R · As · 2 (la plus forte)"]],
      },
    },
    en: {
      title: "🎩 President — rules",
      intro: "A trick-taking card game, 2 to 4 players (empty seats are filled by bots).",
      sections: [
        { h: "A turn", items: [
          "The leader plays 1 to 4 cards of the SAME rank. Each player in turn must play the SAME NUMBER of cards, of equal or higher rank — or pass.",
          "Playing a 2 (or several) burns the trick immediately: the same person plays again right away.",
          "Once everyone else has passed, the last player to have played picks up the (empty) trick and opens the next one.",
        ] },
        { h: "End of round", items: [
          "First to empty their hand = President. Last = Scum.",
          "From the 2nd round on: the Scum gives their 2 best cards to the President (who returns 2 cards of their choice); with 4 players, the Vice-Scum does the same with the Vice-President (1 card).",
        ] },
        { h: "Winning the match", items: [
          "Each round finished AS PRESIDENT earns one term (the Vice-President never earns any).",
          "The first seat to reach the number of terms set by the host becomes Dictator and wins the match.",
        ] },
      ],
      table: {
        headers: ["Card strength (ascending)"],
        rows: [["3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · J · Q · K · A · 2 (strongest)"]],
      },
    },
  },

  tenk: {
    fr: {
      title: "🎰 10 000 — règles",
      intro: "Jeu de dés multijoueur au tour par tour (6 dés, 2 à 4 joueurs, bots pour compléter la table). But du jeu : être le premier à atteindre l'objectif fixé par l'hôte (5000 ou 10000 pts). L'atteindre déclenche un dernier tour pour tout le monde — le meilleur score total à l'issue de ce tour remporte la partie.",
      sections: [
        { h: "Un tour", items: [
          "Lancez les dés actifs (6 au départ) : gardez ceux qui rapportent des points, les autres se relancent. Vous choisissez vous-même lesquels garder parmi les combinaisons valables — le score correspondant s'affiche en direct.",
          "Un dé qui ne rapporte rien seul (ex. un 4 isolé) reste sélectionnable mais bloque la validation tant qu'il traîne dans votre sélection : retirez-le.",
          "Dès que le score du tour atteint 300 pts, vous pouvez vous arrêter quand vous voulez et banquer plutôt que de risquer de tout perdre : le score est ajouté à votre total et le tour passe au joueur suivant. En dessous de 300 pts, impossible de banquer — il faut continuer à lancer.",
          "Hot dice : si les 6 dés ont été mis de côté (en un ou plusieurs lancers), ils repartent tous ensemble et le score du tour continue de grimper.",
          "Farkle (lancer blanc) : si un lancer ne rapporte aucun point, le tour s'arrête aussitôt, vous passez votre tour et tout le score du tour non banqué est perdu.",
          "Attention : trois lancers blancs de suite (même sur des tours différents) vous font perdre 500 pts sur votre score total — un lancer qui rapporte de nouveau des points remet ce compteur à zéro.",
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
      title: "🎰 10,000 — rules",
      intro: "A turn-based multiplayer dice game (6 dice, 2 to 4 players, bots fill empty seats). Goal: be the first to reach the host's target (5000 or 10000 pts). Reaching it triggers one final round for everyone — the best total score at the end of that round wins the match.",
      sections: [
        { h: "A turn", items: [
          "Roll the active dice (6 at the start): keep the ones worth points, re-roll the rest. You choose which dice to keep among the valid combinations — the score updates live.",
          "A die that scores nothing on its own (e.g. a lone 4) stays selectable but blocks confirmation while it's in your selection: deselect it.",
          "Once the turn score reaches 300 pts, you can stop whenever you like and bank instead of risking it all: the score is added to your total and the turn passes to the next player. Below 300 pts, banking isn't allowed — you have to keep rolling.",
          "Hot dice: once all 6 dice have been set aside (across one or more rolls), all 6 come back into play and the turn score keeps growing.",
          "Farkle (blank roll): if a roll scores no points at all, the turn ends immediately, you score nothing this turn, and the whole unbanked turn score is lost.",
          "Watch out: three blank rolls in a row (even across different turns) cost you 500 pts off your total score — a roll that scores again resets this counter to zero.",
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
      title: "✏️ Petit Bac — règles",
      intro: "Le Petit Bac (Scattergories) classique, 2 joueurs et plus, en français ou en anglais.",
      sections: [
        { h: "Une manche", items: [
          "Une lettre est tirée au sort. Remplissez votre grille de catégories avec des mots commençant par cette lettre.",
          "Dès qu'un joueur clique « J'ai fini », un compte à rebours de 10 secondes démarre pour tous les autres.",
        ] },
        { h: "Points", items: [
          "Réponse valable et unique : 2 points.",
          "Réponse identique à celle d'un autre joueur : 1 point chacun.",
          "Réponse vide ou refusée : 0 point.",
          "L'hôte peut trancher les litiges en touchant une case pour inverser accepté/refusé.",
        ] },
      ],
    },
    en: {
      title: "✏️ Petit Bac — rules",
      intro: "The classic Scattergories game, 2+ players, in French or English.",
      sections: [
        { h: "A round", items: [
          "A letter is drawn at random. Fill your grid of categories with words starting with that letter.",
          "As soon as one player clicks “I'm done”, a 10-second countdown starts for everyone else.",
        ] },
        { h: "Scoring", items: [
          "Valid, unique answer: 2 points.",
          "Same answer as another player: 1 point each.",
          "Empty or rejected answer: 0 points.",
          "The host can settle disputes by tapping a cell to flip accepted/rejected.",
        ] },
      ],
    },
  },
};
