# AUDIT EN JEU — LA QUÊTE DU BATEAU DES ÉTOILES (2026-11-07)

> Joué en local (dépôt au commit d1b8f5c, serveur local (faux Supabase), harnais app/audit-tmp et app/audit-duo). Deux parties en local, jouées comme un joueur qui découvre la quête, puis vérification de chaque défaut dans le code. Les étapes trop longues ou bloquées ont été posées par le menu dev (« Star »), qui prépare l'état et laisse jouer le geste.
> Page de tri (verdicts de Guillaume) : https://claude.ai/artifact/1DCjUgQXtkGhrwET3ffKWS — relire ses verdicts (`ArtifactData`, collection `verdicts`, doc `meta/done`) avant toute correction.

**Bilan** : 3 bloquants, 14 graves, 18 moyens. Les bancs (`verify-quete` 954/954, `verify-jalons` 135/135, relancés le 2026-11-07) restent verts sur les trois bloquants : ils appellent les résolveurs, jamais le geste ni la rotation du passage.

## VERDICTS ET SUITE DONNÉE (2026-11-07, le soir même)

Verdicts lus sur la page de tri (`meta/done` posé à 17 h 51). **21 corrigés, 1 vérifié, 6 à discuter, 7 plus tard.**
Bancs après correction, relancés : `verify-quete` 967/967, `verify-jalons` 144/144, `verify-maire` 139/139, `verify-scierie` 37/37,
`verify-strings`, `verify-portee`, `verify-noms` verts. Chacun des trois bloquants a maintenant un contrôle qui ÉCHOUE sur l'ancien code
(plaques jouées par le geste `starCoolStart`/`starCoolFoundSite` ; `starNeedsEvil` ; la scie qui se fige).

| Constat | Verdict | État |
|---|---|---|
| B1 plaque | corriger (« sans casser la logique ni la narration ») | corrigé — **vu en jeu** : la seconde plaque refroidie d'abord, puis la première, toutes deux créditées |
| B2 rose, B3 septième | corriger | `Q.starNeedsEvil` lit l'état, plus la clé du bandeau ; on ne relâche jamais le monde sous les pieds d'un joueur — **vu en jeu** (rose fouillée → forcé ; jour suivant → toujours forcé ; septième réanimée → relâché) |
| G1 touche du réveil | corriger | E frappe aussi, anneau ouvert — **vu en jeu** (8 appuis sur E, la reine se réveille) |
| G2 épilogue muet | corriger | bandeau et chevron jusqu'à l'inauguration (`starQuestQuiet`) — **vu en jeu** |
| G3 ancien ordre | corriger | conseil `advise1-3` retiré ; le maire SUGGÈRE Kerguélen (m6) ; signature → « demandez l'architecte » ; gazette et avis sans « le maire attend » ; vandale sans piste ouverte |
| G4 plaque inutile | corriger (« clair, pas bavard ») | **décision de Guillaume : les deux plaques deviennent la cloche du bateau** (Tristan taille la chaise) — dit avant et après le refroidissement (vu en jeu), et au montage de la cloche (pas vu en jeu) |
| G5 maire | « gardons le masculin, madame le maire » | « madame le maire » dans la surcharge féminine, « un maire » au générique, pronoms « elle » ; guichet vu en jeu |
| G6 scie | corriger | Tristan reprend une lame endormie au milieu ; aide reformulée ; message propre au plafond des 3 min ; la scie à deux annoncée dans le panneau. Banc oui, **scène pas rejouée** |
| G7 canne | « l'échec doit rester possible ; n'expliquer qu'après » | bandeau « Pourvu que ta canne tienne… » ; après la casse : toast + objectif `evilRodProtect` (chevron au chaudron). Banc oui, **pas pêché en jeu** |
| G12 « E » nu, G13 safran | corriger | clé `dock` + contrôle qui balaie `starNearby` ; `hullBefore` |
| G14 bonbons | corriger | « (22/60 🍬) » dans le bandeau (vu en jeu) ; l'accueil du défi rappelle l'objectif (**défi pas ouvert en jeu**) |
| M1, M10, M11, M12 | corriger | tutoiement (bandeau, défi de fuite) ; « petites étoiles » sans nombre ; invites au format « E : … » ; la quête avant la neige ; épouvantail seulement s'il y en a un dans le sac (vu en jeu) ; jour d'audience distinct du rendez-vous ; toast à l'heure du rendez-vous |
| M2 Kerguélen | corriger | sur le quai (`STAR_ENG_DY` −1, `starEngSpot`) — **vu en jeu** |
| M3 panneau Tristan | corriger | colonne élastique — **vu sur une maquette du panneau** (pas de Tristan dans la ferme de test) |
| M8 chevron, M9 pastille | corriger | chevron vers le passage pour la lumière bleue, dans la mairie (escalier puis bureau), distance hors de la tête, légende des ronds ; pastille de quête 🌀 — **vus en jeu** |
| M16 indice G | vérifier | **pas un défaut** : un vrai appui donne l'indice ; mon harnais l'envoyait mal. Vu en passant : « …de la ville. vers l'est. » → corrigé |

**G9 + G10 + G11 — FAITS LE 2026-11-08** : tranchés en 22 décisions (page https://claude.ai/artifact/Tmmw7M8JRWpFTgZxbAXkL7, autorité
recopiée en tête de `components/ferme/QUETE.md`), puis construits d'un bloc : la fête du navire (`fete.js`, `feteArt.js`, `sonFete.js`).
Vue en jeu de bout en bout à un client, et le vote à deux (égalité tirée au sort). Les paragraphes G9-G11 ci-dessous décrivent l'état AVANT.

**G8, M7 et M13 — FAITS LE 2026-11-08 (suite)** (M13 : Guillaume a choisi « plus cher » après le chiffrage, voir plus bas).
- ~~**G8**~~ — sa règle : « s'en sortir techniquement, pas de blocage total ou répété ». (1) Pendant le halage (le seul geste ANCRÉ du
  monde maléfique) et 3 s après, la lumière de la septième sœur écarte les créatures : dans 4,5 cases elles reculent, au bord elles
  rôdent (`Q.evilHaloStep`, l'hôte l'applique ; `pub.halo` porté par la position, aucun message de plus). (2) Tant qu'elle est à
  sauver, une capture dure 10 min au lieu de 30 (`Q.starEvilInjuryMs`, la durée du labyrinthe : « retenter dans la soirée »).
  (3) Sa recommandation : en entrant dans le monde maléfique pendant cette étape, un toast rappelle la pommade (ou dit de la mettre).
  **Vu en jeu** : trois créatures posées à 2, 6 et 7 cases finissent à 4,8 et y tournent ; lumière éteinte, elles mordent. Banc :
  `verify-quete` (une minute de poursuite, jamais sous 4,5 cases). **Pas vu** : un halage complet joué au clavier, à deux.
- ~~**M7**~~ — (1) le météore de Valley Town tombait sur du NOIR : le fondu de sortie multipliait le voile par (durée − t)/2 sans
  borne (opacité 1,6 de 7 à 10,7 s) ; borné, le pré est là ; la colonne de lumière n'est plus un rectangle à bords francs. (2) À la
  ferme, le plan recule de 2,4 cases vers d'où vient la pierre et la course démarre plus près : à l'écran 68 % du vol (38 % avant,
  banc) ; le sol s'éclaire avant le choc. (3) L'interface se tait pendant les plans des deux chutes (comme à la fête). (4) Sous la
  neige, la fonte d'un cratère montre boue et paille (`THAW_MUD`, `THAW_STRAW`, `neige.js`), plus l'anneau d'herbe d'été.
  **Vu en jeu** (neige 4 cm, midi ; nuit en ville). **Pas fait** : les arbres feuillus de la FERME gardent leurs feuilles en hiver
  (dette du zip 232, toute la ferme, pas seulement les chutes) — chantier graphique à part.
- ~~**G9**~~ (fait le 2026-11-08) — proposition de Guillaume (résumée) : trois noms au baptême (« La Belle Étoile » ; « L'Épave hasardeuse » ; « Le bout de bois qui flotte mal »). Un mauvais nom déclenche une contestation de la population (quelques lèche-bottes d'accord, la plupart indignés). Écouter la colère → « La Belle Étoile ». Refuser → tout le monde part, seul avec le maire sur le quai ; le bateau prend l'eau et un orage violent arrive en quelques secondes, la foudre le coule. Puis mission de réparation à concevoir, ou retour à la contestation. **3 chances sur 4** que le mauvais nom coule le bateau, 1 sur 4 que ça passe ; baptême rejouable jusqu'au succès.
- ~~**G10** et **G11**~~ (faits le 2026-11-08) — (navire à quai pendant le plan final) et : « une vraie scène d'inauguration festive qui attire du monde (résidents, famille, visiteurs), pour que les scènes qu'on veut faire soient simplement possibles » — G9, G10 et G11 forment UN chantier (la foule, le baptême, l'orage, le départ).
- ~~**M13**~~ (coût) : « il faudrait que ce soit plus cher ? Nous en discuterons plus tard. » — **chiffré puis tranché le 2026-11-08** (constantes, pas
  une partie jouée de bout en bout) : seul l'or OBLIGATOIRE est le prix des plans (24 000, plus 60 récoltes et 12 poissons dans le
  sac) ; la reconstruction se paie (135 000 à 225 000 selon la signature) OU s'attend (pièces en parallèle, 40 min au plus, ~10 min
  avec la scie). Les attentes réelles imposées en série : trois audiences (9 à 15 min), les plans (6), l'annonce → la chute (5 à 16),
  le cratère (3), l'activité en ville (2), la reconstruction (10 à 40), la fête (3 à 16, puis ~5) — **45 min à 1 h 50 d'horloge**, sans
  compter le jeu lui-même. La cible de conception (2026-08-26) était « une soirée, 55 à 65 min » : la quête a depuis gagné les sept
  sœurs, la reconstruction et la fête. Ma recommandation était de ne pas l'enchérir ; **Guillaume a choisi « plus cher »** : les plans
  passent à **60 000 or, 100 récoltes, 20 poissons** (plus que la sucrerie, le plus gros bâtiment), le navire entier à **450 000 or**
  (×1,5, mêmes proportions). Les attentes ne bougent pas ; la reconstruction peut toujours s'attendre au lieu de se payer. Au passage
  (M15) : les montants s'écrivent groupés (« 60 000 ») et la jauge du guichet est plafonnée au besoin.

**Plus tard** : M4, M5, M6, M15, M18 ; ~~**M14 en priorité**~~ (FAIT le 2026-11-08 : le navire redessiné, le nom peint en lettres d'or — voir `QUETE.md`) (« le bateau doit être MAGNIFIQUE : la récompense de la quête, l'élément central, pas cheap ») ; **M17** : faire la visite chez le maire à plusieurs, ou proposer aux autres joueurs d'assister au rendez-vous.

## Bloquants

_Un joueur réel ne peut pas finir, ou reste coincé des heures._

### B1 — La seconde plaque noire ne peut jamais être créditée : la quête s'arrête au chapitre 1

- **Vu** : J'ai refroidi la plaque du cratère où j'étais (farmMaterialB) : c'est l'autre plaque (farmMaterial, cratère jamais visité) qui a été créditée et marquée fouillée. Revenu sur la première, E affiche seulement « Tu gardes la plaque… », sans mini-jeu. Le chapitre « champ » exige les deux plaques, et le météore de Valley Town exige ce chapitre : il ne tombe jamais.
- **Où** : FermeGame.js : starMiniWon (envoie toujours site "farmMaterial"), starTouchFurrow (teste seulement farmMaterial) ; quete.js : STAR_CHAPTERS.field, resolveStarTownFall (e.ch < 1).
- **Correctif proposé** : Garder l'id du cratère dans setStarMini et l'envoyer à la victoire ; tester la plaque du cratère touché. Ajouter au banc un contrôle qui passe par le geste (verify-jalons appelle resolveStarFound directement, c'est pour ça qu'il est vert).
- **Recommandation** : Corriger

### B2 — La rose attend un chaudron qui n'existe que dans les Terres Maléfiques, et la quête ne force pas ce monde pour elle

- **Vu** : Après l'étoile bleue, le forçage du monde maléfique s'arrête. Le passage menait au Pays du Labyrinthe : pas de chaudron, et le bandeau continue d'envoyer « fouiller la forêt maudite ». Les 5 terres tournent tous les 3 jours : le monde maléfique revient tous les 15 jours de jeu, environ 4 h réelles.
- **Où** : FermeGame.js : needsEvil = farmImpactLight || farmImpactLure (pas farmImpactWarm) ; ramassage du chaudron conditionné à passSpec.key === "evil".
- **Correctif proposé** : Forcer le monde maléfique tant qu'un objectif a besoin du chaudron et que salveCraft.cauldronUnlocked est faux (rose, protection de la canne).
- **Recommandation** : Corriger

### B3 — La septième sœur dépend aussi de la rotation du passage

- **Vu** : Jour 3, Terres Maléfiques : j'ai vu la septième au lac. Une créature m'attrape (30 min de repos forcé) : on passe au jour 4, « le passage mène à : Pays des Bonbons », sans forçage. Plus de chaudron pour protéger la canne, plus de lac maléfique pendant ~3 h réelles.
- **Où** : FermeGame.js : même liste needsEvil (evilSeek, evilHaul, evilRevive absents).
- **Correctif proposé** : Même correctif que B2 : forcer le monde maléfique tant que l'objectif courant se joue là-bas.
- **Recommandation** : Corriger

## Graves

_Le joueur est trompé, perdu, ou le moment clé tombe à plat._

### G1 — Le bandeau annonce la mauvaise touche pour réveiller la reine

- **Vu** : « Réveille-la au rythme de son cœur (E). » Mais E ne fait qu'ouvrir l'anneau (et le rouvre à zéro) ; seule la barre Espace frappe. Avec E, zéro battement compté.
- **Où** : FermeGame.js : KeyE → tryOpenNearby, Space → pressJumpOrAct → starWakePress ; texte du bandeau de réveil dans fermeStrings.js.
- **Correctif proposé** : Écrire « (Espace) » dans le bandeau et l'aide, ou faire frapper E aussi quand l'anneau est ouvert.
- **Recommandation** : Corriger

### G2 — Après la dernière pièce, plus de bandeau ni de chevron pour la convocation, le baptême et l'inauguration

- **Vu** : Dès le navire fini, le bandeau disparaît partout. Le joueur n'a qu'un toast (« Le maire vous fait dire de passer le voir ») et la phrase de la maire. Les phrases de bandeau de l'épilogue existent mais ne s'affichent jamais.
- **Où** : FermeGame.js : rendu du bandeau `if (!e || Q.starDone(e) || …) return null` et starGuideTarget (même garde). C'est le piège du §4 « garde-fou rien à faire une fois fini », revenu.
- **Correctif proposé** : Laisser le bandeau et le chevron vivre tant que l'épilogue n'est pas joué (finale.inaugAt nul).
- **Recommandation** : Corriger

### G3 — Plusieurs textes racontent encore l'ancien ordre de la quête

- **Vu** : À la sortie de la reine : « Elle regarde la cale vide… Il faut quelqu'un qui dessine les bateaux. En ville, la grande maison où l'on demande. » (plans livrés, coque montée). Dans le premier entretien, la maire cite « Célestin Kerguélen » avant toute présentation, et deux réponses sur trois supposent qu'on le connaît. Après la signature : « Tristan peut commencer à débiter » (l'étape suivante, c'est l'ingénieur). La gazette affiche « Le maire attend sa visite » après la signature. Après le budget : « Il nous a semés… Mais qui est ce vandale ? », une piste jamais résolue.
- **Où** : fermeStrings.js : plan.advise1-3 (lus par starWatch à la sortie de la reine), MAYOR nodes « Kerguélen », chaîne de signature, gazette, hud.goal du vandale.
- **Correctif proposé** : Relire tous les textes du prélude et de la reine contre la séquence du 2026-09-13 ; retirer advise1-3 ; faire présenter Kerguélen par la maire comme une suggestion.
- **Recommandation** : Corriger

### G4 — Le refroidissement de la plaque ne sert plus à rien, et le jeu l'écrit

- **Vu** : Conclusion du mini-jeu : « Tu gardes la plaque. Elle n'a pas encore d'usage, mais elle en aura un. » La justification ajoutée au zip 457 (matériau de la proue) a disparu quand la réparation est devenue un marteau.
- **Où** : fermeStrings.js : farm.materialKeep ; aucune lecture de farmMaterial dans le chantier.
- **Correctif proposé** : Redonner un usage concret (renfort de la proue, réduction du prix d'une pièce, cloche coulée dans la plaque…) et le dire avant et après le geste.
- **Recommandation** : Corriger

### G5 — La maire est une femme, mais une partie des textes parle « du maire »

- **Vu** : Au guichet : « Le maire en exercice est Ninon Delaunay. Il reçoit dans 3 jours… » puis « Vous la prenez entre deux dossiers » et « Demander une audience à la maire ». Bandeau « monte au bureau du maire », carte « Le maire soutient votre projet », toast « Le maire vous fait dire… », invite « E : entrer dans le bureau du maire ».
- **Où** : fermeStrings.js : hallMayorNow, hallMayorAudience, hallMayorHint, bandeaux mayor*, carte de victoire, finaleSummon, invite mayorDoor ; la surcharge féminine MAIRE_FR_F ne couvre que la scène.
- **Correctif proposé** : Passer ces textes par la même surcharge (ou des formes neutres : « la mairie », « votre rendez-vous »).
- **Recommandation** : Corriger

### G6 — Scie de Tristan : le premier trait cale la lame au milieu, et l'aide ne le dit pas

- **Vu** : Tristan ouvre, la lame s'endort chez lui ; au-delà de ~0,44 s, le trait est « mou » et la lame s'arrête à 57 % du rail. Tristan n'attaque que si la lame est arrivée de ton côté : tout s'immobilise. L'aide dit « Tire quand la lame revient de son côté ». Au plafond de 3 min, le jeu affiche « Tu reposes la poignée », ce qui est faux. Rien n'annonce le mini-jeu avant « Commander ». Chaque pièce rejoue la même manche de ~80 s, et « Aider Tristan » coûte 80 s pour 3 min gagnées (★).
- **Où** : scierie.js : sawWould (mou), sawMate (n'engage que bx > END − 0,10) ; FermeGame.js : onDone de SawScene (timeout → quitToast).
- **Correctif proposé** : Faire reprendre Tristan quand la lame dort au milieu, ou dire « Tire encore » ; message propre au plafond ; annoncer le mini-jeu dans le panneau.
- **Recommandation** : Corriger

### G7 — Le bandeau pousse à casser la canne avant de prévenir qu'il faut la protéger

- **Vu** : « Lance ta ligne sur la lueur du lac maléfique… » Je lance : « Ta canne s'est brisée dans cette eau maudite… Il faudra d'abord la protéger — direction le chaudron. » La canne disparaît de l'inventaire et le bandeau reste sur « Lance ta ligne ».
- **Où** : quete.js : objectif evilHaul ; FermeGame.js : startFishingEvil (canne nue).
- **Correctif proposé** : Un objectif « Protège ta canne au chaudron » avant evilHaul quand la protection manque.
- **Recommandation** : Corriger

### G8 — La septième sœur se pêche immobile dans un monde où les créatures coûtent 30 minutes

- **Vu** : Il faut rester sur la rive plusieurs lancers (3 à 6 poissons-squelettes, puis la jauge). J'ai été attrapé trois fois en trois visites (près du chaudron, à la rive, en allant chercher l'étoile) : 30 min de repos forcé à chaque fois. Avec mon outil de marche, pas avec tes yeux : à juger en jouant.
- **Où** : C.EVIL_INJURED_MS, créatures de la carte maléfique, point de sauvetage à 3 cases de la rive.
- **Correctif proposé** : À décider : écarter les créatures du lac pendant le halage, ou une peine plus courte pendant la quête.
- **Recommandation** : À discuter

### G9 — Le baptême promet un nom à choisir, puis l'impose sans cérémonie

- **Vu** : La maire : « Je vous laisse le baptiser vous-même — c'est à vous de choisir son nom. » À la cale, E affiche aussitôt « Le navire s'appelle désormais La Belle Étoile. » Pas de saisie, pas de bouteille, pas d'animation. À deux, l'hôte a baptisé seul (la règle « tout le monde » ne couvre pas le baptême).
- **Où** : MaireScene.js (MayorFinale), fermeStrings.js ; FermeGame.js : branche finaleBaptize de starNearby.
- **Correctif proposé** : Retirer la promesse ou proposer le nom ; une courte mise en scène ; appliquer starFinaleMissing au baptême aussi.
- **Recommandation** : Corriger

### G10 — La fin montre le navire à quai pendant que le texte le dit au large

- **Vu** : Après la mise à l'eau, « La Belle Étoile » est de nouveau à quai. Pendant la cinématique, un second navire lumineux se superpose au premier (deux étiquettes à l'écran) pendant « Au loin, La Belle Étoile fend déjà l'eau sombre… ». Pas de fond bleu nuit plein, pas de constellation de la Brebis qui se forme.
- **Où** : FermeGame.js : starFinaleLaunchK (glissement de 3 s), scène end ; fermeArt.js : drawStarShip.
- **Correctif proposé** : Après le départ, laisser la cale vide (ou le navire au mouillage, voiles gonflées) ; refaire le plan final sur fond nuit avec la Brebis qui s'allume.
- **Recommandation** : À discuter

### G11 — L'inauguration publique est presque invisible

- **Vu** : De 15 à 75 s après « E : lancer l'inauguration » : deux petits mâts à fanions aux bouts du navire, pas de guirlande tendue, pas de confettis sur mes images, aucun habitant à moins de 15 cases, pas de maire sur le quai (« je veux être sur le quai »).
- **Où** : FermeGame.js : townDecideGatherDestination, drawFestivalBunting, drawStarConfetti ; STAR_FINALE_INAUG_MS = 30 s.
- **Correctif proposé** : Rassembler les habitants avant le départ (ou les téléporter hors champ), poser la maire, allonger la fête au-delà de 30 s.
- **Recommandation** : À discuter

### G12 — Au ponton, l'invite n'affiche qu'un « E » nu

- **Vu** : La clé « dock » manque dans la table des invites ; le repli || "E" la masque. Le commentaire de fermeStrings.js affirme qu'un banc compare les invites du jeu à cette table : ce contrôle n'existe pas (verify-quete teste 11 clés écrites à la main ; 954/954 vert).
- **Où** : fermeStrings.js : star.prompt (repli || "E") ; tools/verify-quete.mjs.
- **Correctif proposé** : Ajouter la clé, et le contrôle promis (scanner les `p: "…"` de FermeGame.js).
- **Recommandation** : Corriger

### G13 — On peut monter le safran avant que la coque existe

- **Vu** : Le safran était prêt avant la coque ; « E : monter la pièce » l'a posé sur la carcasse vide. La plaque du chantier annonce pourtant l'ordre « 1 coque, 2 safran ».
- **Où** : quete.js : starRaiseBlock (hullFirst ne vise que mât, vergue, cloche).
- **Correctif proposé** : Exiger la coque avant le safran, ou dire pourquoi l'ordre n'importe pas.
- **Recommandation** : Corriger

### G14 — Les bonbons de l'étoile bleue ne se comptent nulle part, et une course ratée coûte 10 minutes

- **Vu** : Une course sans aucune commande rapporte 22 bonbons ; le bandeau ne dit jamais « 22/60 ». Chaque défaite impose 10 min de repos forcé. L'écran du défi ne rappelle pas l'objectif de la quête.
- **Où** : quete.js : STAR_CANDY_PRICE, resolveStarCandy ; public/templerun (accueil du défi).
- **Correctif proposé** : Afficher le compte dans le bandeau ; rappeler l'objectif à l'accueil du défi.
- **Recommandation** : Corriger

## Moyens

_Finition, cohérence, lisibilité._

### M1 — Tutoiement et vouvoiement mêlés, et un bandeau qui colle deux consignes

- **Vu** : « Une étoile guette dans ce trou fouillé. Tourne-lui le dos et attends. Fouillez les moindres recoins de cette forêt maudite et vous y trouverez un chaudron magique, mais restez vigilant. » Le défi de fuite vouvoie aussi.
- **Où** : fermeStrings.js : hud.cauldronPassage et assemblage du bandeau ; public/templerun/js/strings.js.
- **Correctif proposé** : Tutoyer partout ; une seule consigne par bandeau, celle de l'objectif courant.
- **Recommandation** : Corriger

### M2 — Kerguélen se tient debout dans l'eau, et sa bulle cache son nom

- **Vu** : Au quai (plans, puis épave), il est sous la ligne du quai, les jambes dans le lac.
- **Où** : C.STAR_ENG_DX/DY (cale + 4, + 1) posé sur une case d'eau depuis le redessin de la rive.
- **Correctif proposé** : Le poser sur la dernière case de quai, comme le point de sauvetage de la septième.
- **Recommandation** : Corriger

### M3 — Panneau « Le chantier de Tristan » : mise en page et formulations

- **Vu** : Colonne de gauche d'environ 50 px : « Le bordé de la coque » s'écrit un mot par ligne. « Il peut mener les cinq de front » alors que trois pièces affichent « Plus tard : la coque doit d'abord tenir l'eau ». « en cours — 7 min » répété deux fois. Mini-jeu « Monter Le safran » (majuscule).
- **Où** : FermeGame.js : panneau timberOpen ; fermeStrings.js : star.saw / plan.
- **Correctif proposé** : Colonne de texte élastique, boutons sous le texte en largeur étroite ; corriger les trois textes.
- **Recommandation** : Corriger

### M4 — Bureau de la maire : gestes annoncés que la 3D ne montre pas

- **Vu** : « Elle se lève, va à la fenêtre, et reste là, dos à vous » : elle reste de face devant sa chaise. « Elle tamponne, signe » : aucune animation. « 📐 Déplier les plans chiffrés » pose une feuille blanche vierge. L'aide « Glissez pour regarder autour de vous » passe sous la bulle.
- **Où** : MaireScene.js, maireBureau.js (postures, buildInvoices).
- **Correctif proposé** : Une posture « à la fenêtre », un geste de signature, un plan dessiné ; décaler l'aide.
- **Recommandation** : Plus tard

### M5 — La lueur « l'épave est sauvée » est imperceptible

- **Vu** : Elle dure 1,6 s ; je ne la distingue pas sur des images prises toutes les 0,5 s, et l'épave reste identique avant et après.
- **Où** : C.VANDAL_FIX_VFX_MS, drawStarHullFixGlow.
- **Correctif proposé** : Allonger (3 à 4 s) et changer un détail durable de l'épave (planches redressées).
- **Recommandation** : Plus tard

### M6 — Le plan du navire (P) est un damier à 50 %

- **Vu** : Le fantôme du navire est tramé en damier, peu lisible de nuit, en dessous du reste du jeu.
- **Où** : fermeArt.js : dessin du fantôme du plan.
- **Correctif proposé** : Un rendu « bleu d'architecte » (aplat translucide et traits clairs).
- **Recommandation** : Plus tard

### M7 — Les deux grandes chutes ne montrent pas bien ce qui se passe

- **Vu** : Pluie sur la ferme : sol taupe uni, arbres feuillus verts sous la neige, plans cadrés sur du sol vide pendant qu'un fragment tombe dans un coin ; les cratères gardent une auréole d'herbe verte sur la neige. Météore de Valley Town : l'impact est un anneau sur fond noir, sans paysage.
- **Où** : Scène fall / townFall ; drawStarFragmentImpact ; arbres de la ferme (dette connue du zip 232).
- **Correctif proposé** : Cadrer chaque impact avant l'arrivée du fragment ; cratère qui suit la saison ; décor de ville sous le météore.
- **Recommandation** : Plus tard

### M8 — Chevron et rangée de ronds du bandeau

- **Vu** : Bandeau « Traverse le monde maléfique » mais chevron vers l'étoile déjà trouvée (165 m) au lieu du passage. Chevron absent dans la mairie (il faut trouver Léonie et l'escalier seul). Sa distance s'écrit sur la tête du personnage. La rangée de ronds compte 5 pièces, puis 8 impacts, sans légende.
- **Où** : FermeGame.js : starGuideTarget, drawStarChevron (filtre de zone), pastilles du bandeau.
- **Correctif proposé** : Pointer le passage quand le geste est de l'autre côté ; un chevron d'étage dans la mairie ; une légende au survol des ronds.
- **Recommandation** : Corriger

### M9 — Le forçage de la quête s'affiche avec la pastille du menu dev

- **Vu** : « 🪄 Terre forcée : Terres Maléfiques », infobulle « Le menu développeur force le monde », devant tous les joueurs.
- **Où** : FermeGame.js : starForcedByQuestRef et devBanner.
- **Correctif proposé** : Un libellé de quête (« Le passage reste ouvert sur les Terres Maléfiques ») quand c'est la quête qui force.
- **Recommandation** : Corriger

### M10 — Textes faux sur l'état présent

- **Vu** : Invite de la blanche « Elle se sauve sans la fiole » même fiole en main. « Les deux petites étoiles de la ferme » (il y en a trois). « Les huit sites de la ferme sont fouillés » après 7 visites (conséquence de B1). « Quelque chose d'elle est resté avec toi » (le don, encore non tranché) sans suite. « Ne bouge plus : il gratte la cendre » (qui est « il » ?).
- **Où** : fermeStrings.js : star.prompt.lure, s2.meet2, dig.left, la ligne gift (« Quelque chose d'elle… »), dig.hint (« il gratte la cendre »).
- **Correctif proposé** : Invite selon l'état ; compter les étoiles ; retirer la phrase du don tant qu'il n'existe pas.
- **Recommandation** : Corriger

### M11 — Invites incohérentes et qui passent devant la quête

- **Vu** : Formats mêlés : « E : … », « [E] Déployer la canne », « Parler à l'accueil », « Entrer à l'hôtel de ville ». Dans le bureau : « E : entrer dans le bureau du maire » et « Sa porte est encore fermée » alors qu'on y est. Sur les cratères, « E : façonner une boule de neige » passe devant « E : fouiller le cratère ». L'invite de l'épouvantail reste après la plantation et propose sans épouvantail en poche.
- **Où** : FermeGame.js : ordre des invites (neige avant étoile), invites de la mairie et de la pêche.
- **Correctif proposé** : Un seul format « E : … » ; la quête avant la neige ; textes de bureau selon la position.
- **Recommandation** : Corriger

### M12 — Attentes mal annoncées

- **Vu** : Guichet : « Il reçoit dans 3 jours (jour 6) » et, dessous, « Elle vous reçoit dans 4:59 ». À l'heure dite, la pastille disparaît sans « elle vous attend ». « La réunion de dix heures s'est mal terminée » dit à 20 h. Avis lu de nuit : la pluie attend la nuit suivante, ~16 min réelles sans geste de quête.
- **Où** : fermeStrings.js : hallMayorAudience, moodSay ; starFallDue.
- **Correctif proposé** : Un seul délai affiché, un toast à l'heure du rendez-vous, des répliques sans heure fixe.
- **Recommandation** : Corriger

### M13 — Le coût de la quête face à une soirée entre amis

- **Vu** : Plans : 24 000 or + 60 récoltes + 12 poissons (la ferme du jour 3 a ~800 or). Reconstruction : 180 000 or avec 40 % de la mairie, ou jusqu'à 40 min d'attente. Plus les attentes réelles (rendez-vous 5 min, plans 6 min, pluie jusqu'à 16 min, refroidissement du cratère 3 min).
- **Où** : C.STAR_ENG_FEE_*, C.STAR_REBUILD_GOLD, C.STAR_REBUILD_WAIT_MS.
- **Correctif proposé** : À décider avec un chiffre : combien de soirées pour finir la quête à deux ?
- **Recommandation** : À discuter

### M14 — Le nom du navire est une étiquette d'interface collée sur la coque

- **Vu** : Grand cadre sombre bordé d'or, police lisse non pixel, qui masque les hublots.
- **Où** : fermeArt.js : drawStarShipName.
- **Correctif proposé** : Lettres peintes à la main, en pixels, sur le bordé.
- **Recommandation** : Plus tard

### M15 — Petits défauts de lieu et de texte

- **Vu** : Une haie barre l'accès direct au ponton depuis l'artère. Le fronton de la mairie dit « TOWN HALL » en anglais. Le défi : « Rattrapé — Vous êtes tombé dans le vide ». La gazette : « cousin de Eduardo ». Les nombres : « 24000 », « 101256 / 24000 ».
- **Où** : Générateur de la rive, sprite de la mairie, public/templerun, gazette, panneau des plans.
- **Correctif proposé** : Ouvrir la haie face au ponton ; élision ; espaces fines dans les nombres ; plafonner la jauge d'or à 24 000 / 24 000.
- **Recommandation** : Plus tard

### M16 — L'indice de la reine (G) n'a rien donné

- **Vu** : Cinq appuis sur G pendant « Demande un indice à la reine (G) » : aucun indice, aucune bulle, star.hints reste vide. Le résolveur seul accorde bien les indices : le blocage est entre la touche et l'hôte, cause non trouvée (peut-être mon harnais).
- **Où** : FermeGame.js : starGreenAsk, branche starHint de hostHandleReq.
- **Correctif proposé** : À vérifier au clavier réel avant tout correctif.
- **Recommandation** : À vérifier

### M17 — À deux, l'invitée ne voit pas la scène chez la maire

- **Vu** : L'hôte entre dans l'entrevue finale ; l'invitée, debout à côté, ne voit rien (pas de spectateur comme pour les négociations).
- **Où** : MayorFinale (pas de mayorLive).
- **Correctif proposé** : Rediffuser l'entrevue finale en spectateur, comme les négociations.
- **Recommandation** : Plus tard

### M18 — Hors quête, vus en chemin

- **Vu** : Métiers en anglais dans Employés et la gazette (« press cane and cook sugar »). Sous Froufrou, le message de Carla Garfield. Outil dev « 📍 Stand at the next little star » : m'a posé sur la ferme aux coordonnées du cratère de la ville, hors carte.
- **Où** : C.VISITOR_ROSTER (job), residentTag ; panneau Employés ; outil dev de téléport.
- **Correctif proposé** : Traduire les métiers ; corriger la ligne de Froufrou ; téléport dev avec la zone.
- **Recommandation** : Plus tard

## Ce qui marche

- L'accroche d'Eduardo est simple et ancrée dans le jeu (son bateau, ses voyages), et le quai propose clairement le choix.
- Les deux négociations chez la maire sont très bien écrites : un personnage, un décor 3D soigné (globe, buste, liasse ficelée « CRATÈRE EST »), une jauge qui répond.
- Le refroidissement et le réveil au rythme sont deux mini-jeux justes et agréables.
- Les justifications des matériaux sont bonnes : pierre = lest, poissons = huile de la barre, laine = voile, œufs = colle et vernis.
- La panique fonctionne : avis à la gazette, carte de chapitre, habitants inquiets qui parlent (« Elles bougeaient. »).
- La pastille « ☄ Impact dans 0:41 d'activité en ville » est un excellent retour.
- Le récit de l'épave est fort (« on a sauvé la quille de la noyade… quelqu'un a tout cassé cette nuit. Tout. »).
- Les étoiles compagnes ont un visage et parlent (« Tu portes un peu de moi. Verse-le au bord, elle saura. »).
- Le navire achevé est lisible et charmant ; la façade de la mairie et le quai de nuit sont superbes.
- La règle « il manque du monde » est claire côté hôte (« Pas sans tout le monde : il manque Amie. »), et la cinématique de fin joue chez les deux clients.
- Le paiement à la scie n'est débité qu'à la fin de la manche : abandonner ne coûte rien.
- Fluidité : 5 à 11 ms par image pendant la fête et la fin, aucun pic au-delà de 41 ms.

## Couverture

**Joué à la main**

- Proposition d'Eduardo (fiche et bulle), le vieux quai, « On s'en occupe »
- Guichet de Léonie, rendez-vous, négociation n°1 avec la maire (adhésion 14 → 94)
- Commande des plans à Kerguélen (24 000 or, 60 récoltes, 12 poissons), plans rendus, plan en fantôme (P), plaque du chantier
- Scie de Tristan (5 manches complètes), montage au marteau (coque, safran, mât, vergue, chaise de cloche)
- Avis de l'observatoire, carte « La Panique », PNJ inquiets, pluie sur la ferme (filmée à 2,5 s)
- Fouille des 8 impacts, refroidissement de la plaque, défi de fuite (une course), étoile bleue (offrande + dos tourné), étoile blanche (fiole)
- Météore de Valley Town (2 min d'activité), reine : offrande, réveil au rythme, épouvantail, dos-à-dos solo (60 s)
- Discrète (capturée au contact), épave et marteau avec Kerguélen, fuite du vandale (bandeau), négociation du budget (adhésion 100)
- Reconstruction : payer (72 000 or), attendre les fonds, aider Tristan
- Septième sœur : découverte au lac, canne nue qui casse, ramassage du chaudron (interrompu par une créature)
- Fin du chantier, convocation, baptême, inauguration, cinématique de fin (en direct puis rejouée)
- À deux joueurs : refus « il manque Amie », ouverture à deux, inauguration et cinématique chez les deux clients

**Posé par le menu dev**

- Rose (cuisine au chaudron) : chaudron inaccessible cette semaine-là (voir B2)
- Verte (buissons des quais) : indice de la reine (G) sans effet observé, étape posée par le menu dev
- Halage et réanimation de la septième sœur : créatures, trois captures en trois visites (voir G8)

**Pas joué**

- La cuisine du plat de la rose, son transport « avant que ça refroidisse »
- Le halage complet (poissons-squelettes, jauge) et la réanimation au rythme
- La scie à deux joueurs (non transportée sur le réseau, dette connue)
- Une vraie séance à deux sur deux appareils (le harnais à deux clients sature la mémoire des canevas)
- Téléphone et iPad (doigt)
