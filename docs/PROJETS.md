# PROJETS DÉCIDÉS, PAS COMMENCÉS (court et moyen terme)

> Créé le 2026-10-06, depuis une liste donnée par Guillaume. **Rien de ce qui est écrit ici n'est codé** ; chaque entrée dit ce qui existe
> aujourd'hui (vérifié dans le code ce jour-là), ce qui est décidé, ce qui reste à lui demander AVANT de dessiner (`CLAUDE.md` §2 : questions
> d'abord), et les pièges connus. Une entrée qui se réalise sort d'ici : son récit va en tête du README de la ferme, sa leçon dans le noyau.
> Ce qui attend seulement un JUGEMENT en jeu est dans `docs/A-JUGER.md`, pas ici.

---

## 1. Le catalogue de la Maison Garfield : mieux le présenter — FAIT le 2026-10-21, à juger

La cabine d'essayage (miroir, essais combinés, bustes) : récit en tête du README de la ferme, jugement dans `docs/A-JUGER.md`. Reste ouvert : de
nouveaux articles (chacun se dessine dans toutes les poses : marche, assis, nage, combinaison de patin, cheval) ; le déménagement de la garde-robe
au dressing (§6, lot 6) — la vitrine resterait le lieu où l'on ACHÈTE.

---

## 2. Création du personnage : teinte de peau et coiffure (décidé, à coder plus tard)

**2026-10-21 — LA COUPE PASSE PAR LE SALON, PAS PAR LA CRÉATION** (sa réponse : « salon seulement ») : les coupes, couleurs et barbes sont dessinées
(`coiffureArt.js`, journal du README de la ferme) ; le salon et son coiffeur (Froufrou) suivent en deux lots.

**FAIT le 2026-10-16 (teinte seulement, la coupe reste à faire)** : 8 teintes (`C.CHAR_SKIN_TONES`), choix gratuit à la création, puis `C.SKIN_CHANGES_MAX` = 2
changements, arbitrés par l'hôte (`skinSet`, FermeGame.js) ; état dans `wardrobe[id].skin` / `.skinChanges` (absent = jamais choisi) ; voyage dans `look`
sous la forme `~n` (`C.playerLook`, `lookSkin` dans fermeArt.js). Invite une fois par connexion aux anciens (« Plus tard » ne consomme rien) ; les
changements se font pour l'instant dans l'onglet « Teint » de la Maison Garfield. Vu : écran de choix + rendu du joueur (hôte). **Pas vu** : à deux
clients, iPad, pose assise / nage / combinaison de patin / cheval. **Prochain chantier décidé (Guillaume, 2026-10-16) : un DRESSING dans l'intérieur de
SA PROPRE maison, « comme dans GTA V »** — l'intérieur n'existe pas (entrer chez soi lance seulement le sommeil, `startSleep`) : à créer, puis y déplacer
l'onglet Teint et la garde-robe. **Cadré le même jour avec tous les intérieurs : §6.**

**Décision (2026-10-06)** : à la CRÉATION, le joueur choisit sa **teinte de peau** et sa **coupe de cheveux**. Pour les personnages DÉJÀ créés : **à la
prochaine connexion**, on leur propose de choisir **leur teinte de peau seulement** (pas la coupe : elle reste celle d'aujourd'hui). ⚠️ **Pas à
changer dans la session du 2026-10-06** : c'est une note pour les futurs changements d'Arcardi.

**Ce qui existe** :
- l'écran de choix (`phase === "select"`, FermeGame.js) ne demande que le **nom** et le **genre** (fermier / fermière) ; la **tenue** (`outfit`) n'est
  pas choisie : elle vient de l'ordre d'arrivée dans le salon (`myOutfit`) ;
- **une seule peau**, `CHAR_SKIN = "#f0c8a0"` (+ `SKIN_D`, l'ombre, dans `charSheet`, fermeArt.js) ; le seul précédent d'une autre peau est
  `MARTIAL_SKIN` pour le sucrier (`sugarWorker`) ;
- le fermier (nom, genre, tenue) est dans le JSON de `ferme_saves` (`farmersRef[me.id]`) ; **un personnage mémorisé rejoint DIRECTEMENT**, sans
  repasser par l'écran de choix (l'effet « Entrée directe », `doJoinWith`) — c'est pourquoi la teinte des anciens se demande « à la prochaine
  connexion » : il faut une invite à part, une seule fois, pour les fermiers qui n'ont pas encore de teinte ;
- la feuille de sprite est mise en cache par `S.getChar(gender, outfit, …, look)` (fermeArt.js) ; `look` (une chaîne) sert déjà à ne pas allonger
  la signature (Carla, Léo, la garde-robe).

**À demander à Guillaume avant de dessiner** : combien de teintes ; combien de coupes (les mêmes pour les deux genres ?) ; l'invite des anciens
est-elle ignorable (la valeur par défaut serait la peau actuelle) ; la coupe se changera-t-elle un jour (le salon de coiffure, `TOWN_SALON`, affiche
« ouverture prochaine » — une piste à lui SOUMETTRE, pas une décision).

**Pièges déjà connus** :
1. ⚠️ **la clé de cache de la feuille doit contenir la teinte ET la coupe**, sinon tout le monde partage la même feuille (rien ne lève d'erreur) ;
2. **ça voyage dans le paquet de position déjà émis** (`pubMe`) — jamais un message de plus (§3) ; champ absent = apparence d'aujourd'hui, comme la
   garde-robe (« une sauvegarde ancienne donne un fermier habillé comme avant ») ;
3. **aucune migration SQL attendue** (le fermier est dans le JSON) — mais la règle dure tient : validation de Guillaume avant tout schéma ;
4. **tout dessin qui peint la peau en dur doit lire la teinte du joueur** : `charSheet`, la pose assise, la nage, la combinaison de patin
   (`A.suitSheet`), le cheval, les portraits (`Sprite`), la garde-robe (qui ne teinte que le vêtement) ; chercher `SKIN` avant de coder ;
5. ⚠️ à vérifier **à deux clients** (le choix doit se voir chez l'autre) et **sur iPad** (l'écran de création au doigt) ;
6. l'aperçu du personnage de l'écran de choix existe déjà (`getChar("m", myOutfit)`) : il suffit de le rendre sensible au choix.

---

## 3. Tests iPad des fonctionnalités et des nouveautés (à faire, jamais fait)

**Demande (2026-10-06)** : « il faudra faire des tests pour iPad sur les fonctionnalités, les nouveautés, etc. **Le menu dev n'est pas important pour
les utilisateurs iPad.** » Donc : le menu développeur (⌘⇧X, clavier) est HORS PÉRIMÈTRE — ni à tester, ni à rendre tactile.

**Constat : le jeu n'a jamais été vu sur un vrai iPad.** Les mesures de performance sont celles d'un Mac (README de la ferme : pluie, lumière,
ombres — « rien vu sur iPad »), et le nombre de canevas (779) est « un nombre, pas un verdict » (`docs/VERIFICATION.md` §10 : WebKit sur iPad
plafonne le total de canevas ; un dépassement ne lève aucune erreur, c'est un onglet qui se ferme ou un canevas blanc).

**Ce qu'il faut couvrir** (une case par ligne ; chacune se note « vu / pas vu » avec ce qui a été observé) :
| Zone | À regarder sur l'iPad |
|---|---|
| Entrée et déplacement | le pavé flottant et `touch-action: none` (README ferme, « LE PAVÉ EST FLOTTANT ») ; l'écran de choix du personnage ; le bouton d'action contextuel, 🏃, 🗺️, ✋ et le zoom 🔍± (`ferme-touch-btns`) |
| Skatepark (printemps) | les boutons de monture (Sauter tenu pour charger, deux figures nommées, Pomper, Freiner, Descendre ; 2026-10-13 soir) : taille des cibles sous le pouce, le saut tenu pendant que l'autre pouce dirige, la ligne de figures atteignable en l'air ; « monter sur le skate » au bouton d'action ; le 360 au pavé (le tour des directions) |
| Patinoire d'hiver | la location au chalet et le lissage demandé au comptoir (panneaux au doigt) ; **le saut a son bouton tactile (✋, `pressJumpOrAct`), mais la vrille V, l'axel, la marche arrière B et le freinage brut C n'en ont aucun** (« V/B/C au tactile : pas fait ») ; l'aide « ? » (`SkateHelp.js`) cite des TOUCHES de clavier ; le HUD de course (`CourseHud.js`) |
| Marché du nord (toutes saisons) | vendre (« E : vendre au marché » au doigt), l'arche, le caillebotis ; la carte ouverte |
| Rendu | l'ombre portée du soleil (coût par image mesuré sur Mac seulement), la neige, la pluie, la lumière de nuit, les reflets, l'usure de la glace et la surfaceuse : la fluidité à zoom 2 à 4 |
| Mémoire | le nombre de canevas retenus (relancer la mesure de `docs/VERIFICATION.md`) ; un onglet qui se ferme ou un canevas blanc après quelques minutes de ville |
| Panneaux | la vitrine Garfield (§1), la boutique, la gazette, le sac : cibles tactiles, défilement, clavier virtuel pour les champs de texte (nom du personnage, chat) |
| Réseau | iPad invité d'un hôte Mac : le salon, l'arrivée, les autres joueurs (voir `tools/fake-supabase.mjs`, réseau local) |

**Méthode** : le plus fiable est un vrai iPad (Safari) sur le même réseau que le Mac (`next dev` écoute alors sur l'adresse du Mac, avec le
Supabase factice du dépôt). L'émulation « tablette » du volet de navigateur (`resize_window`, 768 × 1024) n'est qu'une APPROXIMATION de la mise en page :
ses clics sont des clics de souris, elle ne mesure ni la mémoire ni le coût d'un GPU d'iPad. **Mesures à relever** : ms par image, mémoire,
lisibilité des textes, taille des cibles tactiles.

**Premier passage SANS iPad (2026-10-06 nuit, volet navigateur 1180 × 820, Mac M4 — pas de Xcode, donc pas de simulateur ; détail : journal de la ferme)** :
| Ligne | Résultat |
|---|---|
| Entrée et déplacement | **marche** à VT en événements synthétiques (pavé, boutons) ; **gêne** à 744 × 1133 : le rang de boutons mord de 12 px sur la barre d'outils, l'invite « E : … » passe sous les boutons |
| Rendu | VT hiver nuit : zoom 3 = 4,5 ms/image (M4, JS seul), zoom 2 = 7,2, zoom 4 = 4,3, **zoom 1 = 21,5 : hors budget** ; 19 215 → 11 950 appels de dessin/image après la garde X des guirlandes |
| Mémoire | 905 canevas vivants, 89 Mo en ville (825 / 50 Mo à la ferme) — nombre, pas verdict |
| Patinoire, marché, panneaux, réseau | **pas vu** |
Reste vrai : un M4 est bien plus rapide qu'un iPad ordinaire (A14 ≈ 0,55 × en monocœur), et WebKit coûte plus cher par appel canevas ; **le zoom 1 serait à ~25 images/s sur un iPad d'entrée de gamme**, extrapolation et non mesure.

**Pas fait** : la séance sur un vrai iPad. Premier pas raisonnable : vingt minutes pour classer les lignes ci-dessus en « marche / gêne / cassé » ; décisions en attente : zoom 1 plafonné au tactile, pavé et boutons remontés, invite « E : » cachée au tactile, chaussée cuite dans l'atlas.

---

## 4. Le marché et l'ancienne place : les suites (le marché est en haut toute l'année depuis le 2026-10-06)

- **Variantes saisonnières du marché** — « un AUTRE chantier » (Guillaume, 2026-10-06) : aujourd'hui le marché est « le même, sans le froid »
  (`townMarketWorld`) ; à dessiner : un caillebotis moins gris hors hiver (il est peint « pin délavé par l'hiver », `DUCK_RGB`), le potier et la
  charrette de fleurs de retour au printemps et l'été, le coin du feu et les ampoules gardés pour l'hiver, des étals de saison.
- **Les autres usages de l'ancienne place** — DÉCIDÉS le 2026-10-06 (Guillaume : « la place est le plus fun en hiver ; si on ne fait que du décor
  les autres saisons, ça ne va pas — il faut des activités fun », avec des MÉCANIQUES NOUVELLES, sans sortir de l'univers de VT, comme la patinoire
  ou les bonhommes de neige). Seul le skatepark est commencé (2026-10-11). Trois lots, à découper et à lui faire valider chacun (questions de forme d'abord) :
  1. **Le skatepark — EN COURS depuis le 2026-10-11** (relief, quatre montures, cabane de location codés ; `components/ferme/README.md`, journal du 2026-10-11). Décidé avec Guillaume ce
     jour-là : **printemps seul** (l'été a les jeux d'eau, l'automne le festival d'Halloween) ; skate, rollers, trottinette, BMX ; bois clair sur acier ; piétons admis ; location sur place, on
     ne sort pas du park en roulant ; figures libres sans score (un mode chronométré à combos viendra plus tard, comme la course de la patinoire). **Le CHANTIER de 3 h est codé (2026-10-12**,
     journal du README de la ferme ; montage le lundi du printemps 14 h–17 h heure de Paris, démontage à l'envers au début de l'été). **Reste à faire, dans l'ordre** :
     (a) que Guillaume juge park et chantier en jeu (`docs/A-JUGER.md`) ; (b) l'équipe de nettoyage à heure fixe (décision du 2026-10-06) ; (c) les commandes tactiles
     (iPad) — CODÉES le 2026-10-13 soir (boutons libellés en monture), jamais vues sur un vrai iPad ;
     (d) faire resservir l'équipe (`CH.CREW`, les gestes de `chantierArt.js`) : le chantier de l'hiver (la patinoire montée), la voirie, les façades. (Le park est ouvert depuis le 2026-10-12 : `SPK.PARK_OPEN = true`.)
  2. **Le miroir d'eau — les jeux d'eau de l'été (confirmé le 2026-10-11).** Une nappe d'eau peu profonde sur la place, avec des **geysers illuminés la nuit**. Idée gardée ; à questionner :
     on y marche ? jeux (se poursuivre, esquiver les jets) ? reflets (`eau.js` existe) ? cycle des jets ?
  3. **Les jeux de l'automne : le festival d'Halloween (confirmé le 2026-10-11).** Chasse aux citrouilles, **bonhommes de citrouilles** (le pendant du bonhomme de neige,
     `bonhomme.js`), tas de feuilles, **lien avec la maison hantée** de la ville, décor et ambiance spooky la nuit. Mécaniques nouvelles, pas des
     décors.
  Principe : chaque saison a SON activité jouable, au niveau de finition de la patinoire (« AAA », §0 du noyau).

---

## 5. La piscine municipale — un centre aquatique permanent (décidé, GROS CHANTIER, rien de codé)

> Demandé le 2026-10-06 (« gros chantier mais super résultat »), inspiré des **Antilles de Jonzac** (centre thermal et de loisirs). Un bâtiment
> **TOTALEMENT NEUF**, ouvert toute l'année (aucune dépendance de saison), dans Valley Town.

- **Où** : au **nord-est** de la ville. Emplacement exact et emprise à choisir contre la carte (`docs/CARTE.md`, `fermeEngine.js` : le générateur,
  README ferme §15 bis) — un lieu dont le placement ne casse pas la génération (piège de la carte regénérée depuis sa graine).
- **L'extérieur** : un grand bâtiment **style années 30** (Art déco/paquebot), « magnifique de l'extérieur ». Image Gemini à envisager
  (`docs/IMAGES-ET-BLENDER.md`) : le prompt se PROPOSE à Guillaume, il ne l'appelle pas (noyau §2).
- **L'intérieur** : plusieurs **grandes salles**, des **fondus enchaînés** entre elles (mécanisme des intérieurs comme le tribunal — troisième
  carte, README ferme §22 — à relire avant de décider si la piscine est une quatrième carte ou une extension). **Des palmiers et une végétation
  tropicale À L'INTÉRIEUR.**
- **Ce qu'on y fait (beaucoup)** : hammam, sauna, jacuzzis, bains froids ; **un bassin olympique** (**courses** et **nage libre**) ; un **espace libre
  « tropical »** ; **toboggans** ; **plongeoirs**. Chaque activité doit être une MÉCANIQUE à elle, pas un décor (cf. la patinoire).
- **À lui demander AVANT de dessiner** : une ou plusieurs cartes ? maillots (garde-robe) et nage (animation du personnage, nouvelle) ? courses
  contre la montre à deux/trois (réutiliser `course.js` ou pas) ? entrée payante ? effets (vapeur, reflets : `eau.js`, `lumiere.js`) ?
  découpage en lots livrables (extérieur d'abord, puis salles).
- **Pièges prévisibles** : nouveau lieu = nouveau repère de carte (noyau §4 : une position taguée par sa zone) ; l'altitude/étage se déduit et ne se
  diffuse pas ; ≤ 10 messages/s par client.

---

## 6. Les intérieurs des maisons des joueurs (lots 0 à 2d et 4 FAITS — à juger en jeu ; lot 5, les rares, ensuite)

> Demande de Guillaume, 2026-10-16 : « designer l'intérieur des maisons. accès règlementé : sur invitation pour les maisons des autres,
> et accès libre pour sa maison. […] très poussé. Je veux des plans cohérents avec la taille des maisons, et une ambiance personnalisable.
> il faudra pouvoir commander des meubles, des décos, acheter ou troquer des objets de décoration rares […] HAUT niveau de détail ».
> Le DRESSING « comme GTA V » du §2 vit dans cette maison.

**Ce qui existe (vérifié ce jour-là)** : aucun intérieur de maison — la porte de SA parcelle lance le sommeil (`startSleep`, FermeGame.js) ;
les intérieurs du tribunal, de la mairie et de l'église sont des « premiers jets » (`docs/AUDIT-2026-10.md`, partie 2 : murs d'une case,
meubles = cases, aucune lumière) — **on n'en reprend pas le dessin**, seulement l'idée d'une carte unique aux niveaux empilés.

**⚠️ 2026-10-17 — L'ÉCHELLE DU PERSONNAGE, LE PLAN DE 9, LE GRAIN DE 64 (journal du README de la ferme)** : « mon joueur paraît gigantesque »,
« pas assez de détail », « pas assez grande ». Ses réponses (maquette ×1 / ×1,5 / ×2 montrée) : **×2** (`maison.HOME_K` : une case du plan vaut deux
cases du monde ; le plan reste à 1,18 m la case) ; **plus profonde aussi** (l'étroite passe à **5 × 9 cases**, même programme, pièces agrandies) ;
le détail manque **aux meubles, aux murs et sols, et les pièces sont trop nues**. Faits : ×2, le plan de 9, le grain de 64 px (murs, sols, meubles).
**Le soir même, sa réponse sur les pièces nues** : l'architecture (radiateurs sous les fenêtres, prises, interrupteurs, poutres des combles, appuis,
cheminée au séjour) ET cuisine et bains équipés de base — faits, ce sont des ÉQUIPEMENTS du plan (`maison.homeFixes`), pas des meubles : ils
amendent la décision 7 (la maison n'est plus vide au premier passage : elle est équipée, et seulement meublée d'un lit et d'une plante morte).
Les modèles des meubles enrichis ; « le fauteuil trop profond » : la profondeur se triche (`meubles.py`, en tête).
**L'échelle, mesurée (2026-10-16)** : le vantail fait 2,04 m (`TOWN_HOUSE_DOOR_PX`) → **1 case = 1,18 m**. Mur du rez-de-chaussée (`wall`, à l'échelle de
`townDoorScale`) : N1 6,4 m · N2 7,0 m · S2 (chaumière, RDC + combles) 7,6 m · S1 8,2 m · S4 8,3 m · S3 (maison de maître) 10,8 m ; les autres
ont RDC + étage + combles. ⚠️ **Les parcelles de rang 0 à 2 (les trois premiers joueurs) sont toutes ÉTROITES** (`TOWN_HOUSES`) : le premier plan
à dessiner est l'étroite, ~5 × 7 cases (49 m²) par niveau. Proposition montrée et non contestée : RDC entrée + séjour côté rue, cuisine-repas
au fond, WC, escalier droit le long du mur gauche ; étage chambre côté rue (deux fenêtres), bains et dressing au fond ; combles bureau et
chambre d'amis, bandes basses sous la pente. Les fenêtres côté rue sont CELLES DE LA FAÇADE (N1 et N2 n'ont pas les mêmes : le plan est
par LARGEUR, les ouvertures du mur côté rue par MODÈLE — la façade change avec R, pas le plan).

**Décisions de Guillaume (2026-10-16)** :
1. **Fabrication** : meubles modélisés sous **Blender**, rendus en sprites au pixel d'écran (orientations et coloris par rendu, même angle et
   même lumière pour tous) ; tableaux et objets rares en **images Gemini** (prompt proposé, Guillaume génère) ; murs, sols, papiers peints au
   **canevas**. **Une pièce témoin (le séjour) se juge avant la série.**
2. **Taille** : l'étroite d'abord ; **plus tard, déménager** dans une parcelle libre plus grande (S1, S4, S3), meubles compris — un but de long terme.
3. **Argent** : la **caisse commune** paie (comme la garde-robe) ; **chaque objet appartient à UN joueur** (d'où le troc).
4. **Visites** : chez soi, accès libre ; chez un autre, **sonnette** (le propriétaire en ligne ouvre ou refuse) **+ double des clés** confié et
   révocable (ouvre en son absence). Un visiteur regarde, s'assoit, joue des objets ; **il ne déplace rien**.
5. **Commandes** : un **catalogue chez soi, livré le lendemain matin** devant la porte ; **Marcel** (résident, « carve furniture ») fait des
   pièces sur commande, **Colette** (« sew and dye clothes ») les tissus — rideaux, coussins, teinture ; s'ils n'ont pas emménagé, le catalogue suffit.
6. **Rares — les quatre sources** : le **brocanteur du marché** (stock qui tourne chaque semaine, premier arrivé premier servi, l'hôte
   arbitre ; **Aurélien**, « appraise gems », estime) ; le **troc entre joueurs** (objet contre objet, accord des deux) ; les **trophées**
   d'activités (pêche rare, course, quête, park — ne s'achètent pas) ; les **séries de saison** (une saison, puis l'année suivante).
7. **Au premier passage de porte** : **VIDE, sauf un lit dans la chambre et une plante MORTE dans le séjour** (sa réponse, mot pour mot).
8. **Codex** : non — Claude seul.

**Acquis sans objection** : cloisons FINES (pas d'une case : sinon aucune pièce n'est à l'échelle) ; vue en COUPE (le mur du fond se voit sur
sa hauteur, le mur côté rue est coupé) ; toutes les maisons et leurs niveaux dans UNE carte, la maison et l'étage se DÉDUISENT de la position
(noyau §3 et §4 : une position taguée par sa zone, rien de plus sur le réseau) ; l'ambiance suit le monde (soleil par les fenêtres à l'heure
d'`ombres.js`, pluie et neige aux carreaux, lampe allumée dedans = fenêtre allumée dehors, feu dans la cheminée = fumée sur le toit,
`fumee.js`) ; on DORT dans son lit (fini le sommeil à la porte) ; l'onglet Teint et la garde-robe déménagent au dressing ; tout l'état vit
dans le JSON de `ferme_saves` — **aucune migration SQL**.

**Lots, dans l'ordre** : 0 la pièce témoin (Blender, à juger) · 1 la coque de l'étroite (plan, cloisons, portes, escalier, lumière, lit, entrer
et sortir) · 2 le mode déco (poser, tourner, ranger, garde-meuble ; murs, sols, peintures) · 3 catalogue, livraison, Marcel, Colette · 4 la
sonnette et le double des clés · 5 les rares (brocanteur, troc, trophées, saisons) · 6 le dressing · 7 le déménagement et les autres largeurs.

**Pièges prévisibles** : un sprite a un SENS DESSINÉ (face, côté, dos — le côté gauche n'est pas toujours le miroir du droit : une lampe
posée à droite d'un fauteuil) ; l'emprise d'un meuble n'est pas son dessin (la collision a son rectangle de pied, pas la case) ; un meuble
placé = UNE `req` au lâcher, jamais pendant qu'on le traîne (≤ 10 messages/s) ; le tri de dessin d'un meuble haut contre le mur du fond ;
WebKit sur iPad plafonne le nombre de canevas (des centaines de sprites de meubles × coloris : un atlas, pas un canevas par variante).

**Lot 0 — FAIT le 2026-10-16, à juger (`docs/A-JUGER.md`)** : le studio Blender (`tools/blender/studio.py`, `meubles.py`, `rendre_meubles.py`), 21 meubles
et variantes, les murs et sols au canevas (`components/ferme/maisonArt.js`), la pièce témoin (`tools/render-maison.mjs`). Détail : journal du README de la
ferme, 2026-10-16 (suite). **Décidé en l'écrivant, à lui soumettre** : murs latéraux et façade COUPÉS À 35 CM, mur du fond plein (une cloison pleine cache
sa propre porte dans cette projection) ; plus tard, le mur qui cache le joueur se coupe à son tour (quand il passe dans la pièce du fond).
Verdict de Guillaume sur le témoin (2026-10-16) : « Le style me va ».

**Lot 1 — FAIT le 2026-10-16, à juger en jeu** : la zone « home » (`components/ferme/maison.js`, `maisonArt.js`, `drawHomeFrame` dans FermeGame.js),
bancs `verify-maison` (62/62) et `render-maison`. Détail : journal du README de la ferme, 2026-10-16 (soir). **Décidé en l'écrivant, à lui
soumettre** : les faces façon Sims (pleins : le mur du fond de la maison et celui de la pièce où l'on est), les crans 2 et 4 seuls à l'intérieur,
l'aide de porte, pas de carte dedans, l'ampoule nue qui s'allume la nuit dans la pièce occupée. Retouche du même soir, à sa demande (« une vraie idée de profondeur ») : les murs
latéraux évasés et l'ombre au pied des murs — **validés par lui au banc, puis vus en jeu** (RDC à 14 h, étage à 22 h).

**Retours de jeu du 2026-10-17 (nuit) — FAITS, à juger** (journal du README de la ferme) : le cadrage se fait PAR PIÈCE (plan entier : bouton 📐 ou P, le
mode déco le prend aussi ; le cran manuel n'a plus cours chez soi), l'escalier se gravit en ~2,7 s marche par marche et ne se déclenche plus qu'à un geste
dans son sens, le lit n'est à portée que dans sa pièce, la salle de bain passe à 3,0 × 3,4 cases avec fenêtre, miroir et lavabo à hauteur du personnage
(0,85 m), le verre des fenêtres penche comme son cadre.
**Même jour, l'après-midi — FAIT, à juger** : les COTES D'USAGE de la cuisine et des bains se lisent contre le personnage (0,85 m à côté des murs) : plans, évier,
cuisinière, lavabo, toilettes, baignoire ×½ en hauteur (Blender, `meubles.ECHELLE_Z`), fenêtres, miroir, prises, interrupteurs, hotte, étagère abaissés
(`maison.ECHELLE_USAGE`) ; marche ralentie à ×0,75 dans la maison, l'escalier inchangé. Puis, sur son « oui », le séjour, la chambre et les radiateurs à la même
échelle (`maison.ECHELLE_Z_SPRITES` ; tapis, tableau et escalier exceptés ; cheminée à ×0,65). Tout NOUVEAU meuble du catalogue (lot 2b) se rend à ×½ : l'ajouter aux
deux listes (`verify-maison` §12 refuse l'oubli).

**2026-10-18 (suite) — LOT 2b FAIT, à juger** (journal du README de la ferme) : le catalogue au sol de l'entrée, onze articles en trois pages,
commande payée par la caisse, carton livré le lendemain devant la porte, rentré avec son propriétaire, déballé au garde-meuble. Avec : les
appliques murales à la place de l'ampoule pendante, le tuyau du poêle mené au mur, le dormeur dans un lit pivoté qui ferme les yeux. **Prochain : 2c**
(lumières à allumer — lampes, poêle, appliques —, objets de mur, revente).
**2026-10-18 (soir) — LES OMBRES PORTÉES, FAIT, à juger** (journal du README de la ferme) : `ombresMaison.js` — fenêtres le jour, appliques et lampes
la nuit ; les lampes s'allument avec la pièce (l'interrupteur reste au 2c).
**2026-10-18 — LA PERSPECTIVE, FAIT, à juger** (journal du README de la ferme) : coins de façade raccordés, cloisons coupées en volume (arase claire, ombre au
sol), lumière de profondeur (pieds et angles des murs, dégradé par pièce), évasement 0,11 → 0,17 (choisi sur maquette en jeu).

**2026-10-21 — LOT 2c FAIT, à juger** (journal du README de la ferme) : interrupteur par pièce (manuel et gardé ; une pièce jamais touchée
s'allume seule la nuit), lampes à la main, feu de cheminée et de poêle (4 h de jeu, braises), objets de mur (trois tableaux, miroir, horloge ;
toiles Gemini à venir : `refs/lot-gemini/F-tableaux-maison.md`), revente à moitié prix, vitres et fumée vues de la rue.
**2026-10-22 — LOT 2d FAIT, à juger** (journal du README de la ferme) : Colette (page du catalogue quand elle est résidente) — rideaux sur
mesure, teinture des tissus par PASSES Blender (`tools/blender/rendre_teintes.py`), rendue le lendemain en carton ; rideaux qu'on pend et
qu'on TIRE (E), vus de la rue, qui coupent le soleil. **Le lot 2 est fini.** Le lot 3 (catalogue, livraison, Marcel, Colette) est fait pour
le catalogue et Colette ; reste Marcel (pièces sur commande).
**2026-10-22 (suite) — LOT 4 FAIT, à juger** (journal du README de la ferme ; ses neuf réponses, toutes sur la recommandation) : la sonnette
(partout, 30 s, une visite), le double des clés au crochet de l'entrée (trois), s'asseoir (canapé, fauteuil), les gestes d'un invité (lumière,
rideaux, feu ; vérifiés par l'hôte à sa position), Raccompagner. Vu à deux clients. **Prochain selon l'ordre décidé : le lot 5, les rares**
(brocanteur, troc, trophées, séries de saison) — ou Marcel, reste du lot 3.
**Lot 2 — CADRÉ le 2026-10-16 (ses réponses, toutes sur les recommandations), RIEN DE CODÉ** :
1. **Un mode déco**, chez soi seulement (touche ou bouton) : caméra figée, grille légère, un meuble se prend au clic, se tourne, se pose ; une
   palette en bas montre le GARDE-MEUBLE (ce qu'on possède et qui n'est pas posé).
2. **Grille au quart de case** (30 cm) et quatre orientations ; une pose qui bloquerait une porte ou couperait une pièce est REFUSÉE (le
   remplissage de `verify-maison` devient une règle de jeu : toutes les pièces restent atteignables).
3. **Un premier catalogue dans le lot 2** : les meubles déjà rendus et une dizaine de nouveaux (Blender, `tools/blender/meubles.py`).
4. **Papiers, lambris et sols pièce par pièce, payants** (caisse commune), visibles aussitôt.
5. **Le catalogue est un objet CHEZ SOI** (dans l'entrée, E pour le feuilleter) : des pages par pièce, l'aperçu et les coloris ; une édition par saison.
6. **La livraison : des CARTONS devant la porte** le lendemain matin ; dedans, ils sont dans l'entrée, E pour déballer → le garde-meuble.
7. **Dès le lot 2, aussi** : les LUMIÈRES (lampes, poêle, plafonnier : E pour allumer ; la nuit, une pièce allumée allume sa fenêtre vue de la rue) ;
   les TABLEAUX et MIROIRS au mur (une couche d'objets de mur ; tableaux définitifs : Gemini) ; la REVENTE à moitié prix depuis le garde-meuble ;
   les RIDEAUX et TISSUS chez Colette (rideaux aux fenêtres, teinture des tissus).
8. **Prix à l'échelle de la garde-robe** (chapeaux et tenues de 1 200 à 14 000 or) : une plante ≈ un chapeau, un canapé cinq à dix fois plus.
**Découpage proposé (à livrer dans l'ordre, chacun vu en jeu)** : 2a le mode déco, le garde-meuble, les murs et sols payants · 2b le catalogue et
les cartons · 2c lumières, objets de mur, revente · 2d Colette (rideaux, teinture).
**2a FAIT le 2026-10-16 (nuit)** — journal du README de la ferme. Décidé en l'écrivant : l'aimant des murs (le geste reste au quart de case),
les murs du fond tous relevés en mode déco, le panneau en colonne à droite, le menu développeur « Garnir le garde-meuble » en attendant 2b.
**2b fait le 2026-10-18.** **Rien de tout l'état ne demande de migration** : la maison
de chacun (meubles posés, garde-meuble, décor des pièces, cartons) vit dans le JSON de `ferme_saves`, une `req` par geste (jamais pendant un
glisser), l'hôte arbitre l'or. ⚠️ Piège prévisible : « un résolveur qui écrit un champ neuf doit être livré dans le même geste que sa
déclaration et sa migration » (§4) — ici la déclaration et la lecture d'une sauvegarde ancienne (champ absent = maison de départ).


## 7. Chez soi entre joueurs : l'effraction, la police, les invitations (décidé le 2026-10-23, rien de codé)

Verdict de la passe de clôture (« le rôle de la maison ») : « L'important, c'est qu'il y ait un aspect INTERACTIF ENTRE JOUEURS. » Déjà là :
la sonnette, le double des clés, raccompagner (lot 4). À ajouter :
1. **Tenter d'entrer par effraction** : la tentative ALERTE le propriétaire (comme la sonnette, où qu'il soit), et elle peut ÉCHOUER — 90 % de
   chances d'être expulsé de Valley Town par une POLICE qui reste à créer (un chantier à part : qui, où, à quoi elle ressemble).
2. **Inviter** : le propriétaire envoie une invitation aux autres joueurs pour venir visiter sa maison.
3. Les autres pistes de l'audit, NON retenues pour l'instant : un coffre, les trophées de la quête exposés, un repos qui rend de l'énergie.
⚠️ Réseau : chaque geste est une `req` arbitrée par l'hôte (§3) ; l'expulsion est un état (jusqu'à quand), pas une suite de messages.

## 8. Skatepark : des niveaux d'expérience (idée du 2026-10-23, « pour plus tard »)

En jouant le park : « La méca, les figures sont super. » Idée : une expérience qui se gagne en roulant et débloque des figures plus rapides,
plus acrobatiques et plus complexes, ou une vitesse de déplacement plus grande. Rien n'est décidé au-delà : à cadrer avec lui (que débloque
chaque niveau, se perd-elle, est-elle partagée entre montures).

## 9. Les visages : ce qui viendra après les expressions automatiques (ses notes du 2026-10-23, rien de codé)

Les expressions automatiques sont branchées (README ferme, journal du 2026-10-23 « les visages s'animent » ; `components/ferme/expressions.js`).
Ses notes sur la page d'arbitrage, pour la suite :
- **Une roue d'émotes**, « comme sur GeoGuessr » : le joueur choisit lui-même une émotion. ⚠️ Décision structurante : contrairement aux
  expressions automatiques, une émote CHOISIE ne se déduit pas — il faut la diffuser (un champ dans le paquet de position qui part déjà,
  ou un message). À cadrer avec lui (quelles émotes, durée, touche ou bouton, iPad) avant de coder ; CLAUDE.md §3.
- **Les cœurs** (l'expression « amour », déjà dessinée) : « quand on aura ajouté les relations amoureuses dans le jeu ». Aujourd'hui, deux
  joueurs assis côte à côte ont la joie par moments, jamais le cœur.
- **La joie des PNJ selon leur caractère** : « aussi joie, mais pas pour tous ; certains sont un peu nerveux, il faudra pondérer en fonction
  du caractère et du contexte ». Aujourd'hui les PNJ ne font que cligner et s'assoupir.
- **Colère, tristesse, clin d'œil** : dessinés, aucun déclencheur — ils viendront avec les interactions entre personnages.
- **Les cheveux de profil « font casque »** : « la position des cheveux peut changer un peu aussi, à revoir à l'avenir ». Le 2026-10-23, le
  front a seulement été dégagé au-dessus de l'œil (`FRONT_SIDE`, persoHdArt.js) ; la forme des coupes de profil n'a pas changé.

## 10. La danse (idée du 2026-10-24, rien de codé)

Sur la maquette 2 de la marche réaliste (https://claude.ai/artifact/L4mrNwQSKMBGVnNyVK9tEA, ligne « Maquette 2 », feuilles
`img/maquette2-m.png` et `-f.png`), trop agitée pour une marche (« on dirait un pigeon ») : « de face, avec des extras mouvements de bras, ça
fait une super danse, à garder pour en faire une danse ». Ses réglages, par demi-foulée de 4 images (contact, amorti, passage, poussée) :
bassin `[0, 1, 0, −1]` px ; tête `[0, 2, 1, −1]` (elle s'enfonce d'un pixel de plus que le corps) ; balancement du buste `[0, −1, −1, 0]` px
vers la jambe d'appui, la tête `[0, 0, −1, −1]` (une image de retard : elle ballotte) ; de profil, tête `[0, 1, 1, 0]` vers l'avant ; bras en
pendule (épaule ±19°, coude 8 à 22°). À ajouter : des gestes de bras propres à la danse. Se joue sur place (les pieds marchent sans avancer).
Une danse CHOISIE se diffuse comme une émote (§9, la roue d'émotes ; CLAUDE.md §3) : à cadrer avec lui avant de coder.

## 11. Le boulodrome — la pétanque à Valley Town (décidé le 2026-10-25 ; lots 1 à 4 FAITS du 28 octobre au 1er novembre ; reste le lot 5)

Retenu dans une liste d'idées : « la pétanque c'est super, le boulodrome avec une vraie mécanique de jeu et de points. Tour à tour : sans bug et
sans latence, du coup. » Le jeu de soirée par excellence : on joue en parlant, au tour par tour, à deux ou trois, contre ou avec des habitants.
Trente décisions posées sur une page à boutons (https://claude.ai/artifact/6eTgpNk4QnpNX1Q2H67d94) ; il n'y a rien changé et a donné **carte
blanche le 2026-10-28** : toutes les recommandations font foi.

**Décidé** — *le lieu* : derrière l'hôtel de ville (prairie x 84..108, y 37..50, entre l'avenue du nord, la rue x ≈ 81 et `TOWN_HALL` ; le puits
reste au bord), deux pistes, des platanes par prompt Gemini (noyau §2). *La vue* : en ville, pas une scène à part (noyau §0.2) ; ×3 pendant la
partie (un cran ENTIER) ; les boules à l'échelle du poing (3 px d'art ≈ 22 cm, au double de finesse ; le cochonnet la moitié). *La règle* : trois
formats (tête-à-tête, doublette complétée par des habitants, à trois chacun pour soi), 13 points ou 7 au choix, le règlement gardé là où il
change une décision. *Les gestes* : roulette, demi-portée, plombée, tir (le carreau) ; la DONNÉE puis une jauge à un temps ; accroupi pour
pointer, debout pour tirer. *Le terrain* : posé à la main, fixe ; lourd après la pluie, fermé sous la neige ; une guirlande, ouvert la nuit. *Les
habitants* : boulistes à heures fixes, un niveau selon leur caractère, on peut en défier un seul. *L'enjeu* : une prime plafonnée contre les
habitants, rien entre joueurs ; l'ardoise, la gazette, un palmarès ; le concours plus tard. *Le folklore* : la mesure au mètre, Fanny dans sa
boîte à volet, l'aimant pour ramasser, des sons synthétisés. *Le réseau* : ci-dessous.

**Lot 1 FAIT (2026-10-28) : `components/ferme/petanque.js`, pur (n'importe rien), et `tools/verify-petanque.mjs` (80 contrôles, 1,3 s).** La
piste (15 × 4 m, deux reliefs posés à la main dans `PISTES`, que le lot 2 dessinera depuis les mêmes nombres), le vol, l'atterrissage, le
roulé sur le relief, les chocs au fer (3D) et à terre, le carreau ; la règle entière (le but, l'ordre de jeu, la boule et le but morts, le
comptage, Fanny, les trois formats) ; l'arbitre (`verifier`) ; les aides (`arretPlat`, `donneePour`, `jauge`). Ce qu'il en disait au lot 1 (avant le couloir ci-dessous), mesuré contre
un joueur simulé qui lâche à ±20 / 35 / 60 ms de la marque (habile, moyen, débutant) : sur le plat, la roulette est le geste sûr (28 / 35 /
48 cm du but) ; sur la piste du platane, la plombée le devient (37 / 46 / 61 cm contre 63 / 63 / 69) ; au tir, 81 / 56 / 30 % au fer, un
carreau sur six pour le moyen. **Rien à l'écran, aucun réseau, aucun habitant** ; rien n'importe ce fichier.

**Ce qui s'écarte de la page, et pourquoi** :
1. **La physique prend le rayon du DESSIN** (`BOULE_R` 11 cm, pas 3,75) : sinon deux boules qui se touchent à l'écran se recouvriraient.
   Conséquence : si le lot 2 change la taille en la regardant, relancer `verify-petanque` §9 et retoucher `kL`/`kA`.
2. **Le but sorti** : mène nulle si plusieurs camps ont encore des boules en main, mais un camp SEUL à en avoir marque ce qu'il lui reste (le
   règlement) — sinon on sortirait le but pour annuler une mène perdue.
3. **Le but se pose à 80 cm des côtés et 1,5 m du fond** (règlement : 50 cm et 1 m) : avec des boules trois fois trop grosses, il sortait au
   premier contact. Il freine aussi cinq à six fois plus vite qu'une boule.
4. **`lourd` (la pluie) est lu par l'hôte au lancer du but** et vaut pour la mène : aucun message de plus, mais il est dans l'état.
5. **Les durées** (estimées : 8 s de visée par lancer, la simulation, 25 s par mène) : tête-à-tête en 13 **≈ 25 min** (la page disait 15 à 20),
   en 7 ≈ 14 min ; doublette en 13 ≈ 40 min ; **à trois en 13 ≈ 46 min** (27 mènes : deux boules chacun) — **recommandé : 7 par défaut à trois**
   (à lui confirmer au lot 3).

**À voir en jouant** : en doublette, le but sort encore dans 29 % des mènes, parce que le joueur simulé tire une fois sur deux sans regarder si
le but est derrière sa cible. **Les habitants (lot 4) devront lire leur ligne de tir.** Le tête-à-tête est à 10 %.

**Réseau (§3), tel que le lot 3 l'écrira** (et l'en-tête de `petanque.js` le dit) : UNE `req` par lancer `{ coup, geste, donnee (mm), err (‰),
lourd }`, l'hôte la passe à `verifier` puis `jouer`, et UN `apply` rediffuse l'entrée ET l'état qui en sort. Chaque client anime le lancer
(`preparer`, `simPas`), puis adopte l'état de l'hôte, après avoir comparé son `empreinte` (un `console.warn` si elles diffèrent). Le lanceur
n'attend pas. `coup` écarte la seconde de deux demandes parallèles. L'état (entiers en mm, JSON) va dans `shared` et survit à un changement d'hôte
(banc §8 : une partie recopiée en JSON entre chaque lancer, ou rejouée depuis son seul journal, finit à l'identique). La visée ne voyage pas ;
la posture passe dans le paquet de position qui part déjà.

**Lot 2 — le terrain dans la ville : ses 17 verdicts du 2026-10-29** (https://claude.ai/artifact/3g7QNUgG7z7scwZdNMkXXz, base `verdicts/<id>`).
Il a ajouté : **« je veux une qualité graphique bluffante »**. **Mesuré** (le vrai monde, `generateTownWorld`, et deux captures en jeu,
`refs/lot-gemini/captures/cap-vt-13…`, `cap-vt-14…`) : la prairie est libre de x 83 à 121 et de y 36 à 48 ; le puits (86, 39), cinq massifs
(91-93, 41-45), deux arbres (86 et 92, 37) ; **le toit de la mairie déborde au-dessus de la prairie jusqu'à y ≈ 46,5 pour x 87..98**.
**Décidé** : deux pistes d'EST EN OUEST dans la moitié est (la hauteur de l'arc se lit vers le haut de l'écran, la longueur vers la droite) ;
le puits, les massifs et les deux arbres de l'ouest restent (le jardin de l'entrée) ; au nord « la piste du platane » (relief `b`, les
racines), au sud « la piste de la mairie » (relief `a`, ex-« du puits ») ; sol OCRE (sable stabilisé), relief DISCRET — sa note : « discret
sauf quand il y a des lancers longs et forts par exemple ; pas systématique » ; madriers bas qu'on enjambe, une bande d'herbe entre les
pistes ; **les arbres : une essence DÉJÀ DANS LE JEU** (ni platane par le code, ni Gemini — le prompt du platane reste dans
`refs/lot-gemini/B-arbres.md` pour la famille B), plantés comme le plan A (quatre au nord, un au bout est, jamais au sud) ; bancs de
planches au nord, entre les arbres, face aux pistes ; **pas de buvette pour l'instant** (l'ardoise du lot 5 cherchera une autre place) ;
une guirlande en zigzag la nuit ; on marche librement sur les pistes — sa note : « pendant la partie, on aura une vue agrandie de la
partie ; peut-être un fondu enchaîné ? » (lot 3) ; **à trois, 7 points par défaut** — sa note, qui vaut pour tout le boulodrome :
« meilleur choix jouabilité (jeu pour tous âges mais réaliste et beau, comme le skatepark qui est plaisant et simple à employer) ».

**Lot 2 FAIT le 2026-10-29 (README ferme, journal du jour ; à juger en jeu, `docs/A-JUGER.md`)** : `boulodrome.js` (pur : l'emprise
x 101..113,7 × y 39..46,6, le repère des pistes `pisteVersMonde`, ce qu'est chaque pixel `bouloAt`, le relief local `reliefLocal`) ;
`boulodromeArt.js` (le sable éclairé depuis la physique, les madriers, le banc de planches, le mât, la guirlande) ; une passe finale sans
tirage dans `generateTownWorld` (`tw.boulo`, tout ou rien) ; l'essence (érable) et la taille (grand, si la place le permet — ils sont
« adultes » : la clôture au nord de l'avenue est sous leur couronne) ; la neige et la pluie au pixel (`CL.SAND`) ; le plan ; `render-boulodrome`.
Les bancs sont des `bench` de la ville (`boulo: 1`) : on s'y assoit, les habitants et les pigeons s'en servent. **Pour le lot 3** : `pisteVersMonde`
place une boule ; la face du madrier du nord recouvre la première rangée de sable (une boule arrêtée contre lui y est dessinée par-dessus).
**Sa note « pas systématique », TRANCHÉE le 2026-10-29** (« une roulette sur deux passe sans être déviée », son accord) : au lot 1, la
roulette était déviée de plus de 15 cm (pointer à 6, 8, 10 m, 14 lignes) dans 71 / 100 / 100 % des lancers sur la piste du platane — sa pente
de 0,8 % allongeait ou raccourcissait CHAQUE roulette, et ses deux reliefs couvraient toute la largeur. La moitié de pente prévue n'y
suffisait pas (encore 100 % à 8 et 10 m) : **un quart de pente (0,2 %) et un couloir propre de 65 cm** entre les racines (x 0,75, r 0,65,
h 3,5 cm) et le creux (x 3,05, r 0,7) → **29 / 50 / 50 %**. La piste de la mairie, moitié de pente (0,3 %) : 57 / 64 / 57 % (son ornière est
faite pour être suivie ; à 10 m, la pente seule en déviait 93 %). La plombée reste peu déviée (0 à 43 %). `verify-petanque` (83/83) tient
ces seuils, et que le couloir soit la meilleure ligne pour la roulette, la plombée celle qui passe le relief. Le dessin a suivi seul ; les
racines se déduisent désormais de la bosse.

**Lot 3 — jouer : 15 décisions de forme posées le 2026-10-29** (https://claude.ai/artifact/TJ9wMuSQqTQfrzqMiuS1YX, base `verdicts/<id>`,
`meta/fin` ; maquettes sur le vrai sable). Le premier tour avait réglé la partie en ville, le ×3, les gestes, la donnée puis la jauge, les
postures et le réseau ; la page demande : ouvrir une partie (E au cercle), qui commence (une pièce), le départ d'un joueur (pause 10 min),
**jouer seul en attendant le lot 4** (une partie d'entraînement — sans elle, il ne pourrait pas l'essayer sans ami connecté), le fondu
enchaîné vers ×3, qui voit l'agrandi, les places des joueurs, les commandes, le guide de visée (arc + roulé sur le plat + boule fantôme ;
le relief reste à lire), la jauge au-dessus du joueur, la bande de couleur des boules, le cochonnet orange, l'ardoise et l'anneau du point,
la fin de mène sur le terrain, la revanche. Recommandations cochées ; rien n'est codé du lot 3.

**Lot 3 FAIT le 2026-10-31** (sa page n'a reçu aucun verdict : les 15 recommandations font foi). `bouloJeu.js` (pur : sessions, placement,
guide, ardoise, pause), `bouloJeuArt.js` (boules d'acier à bande rouge/bleu/or, cochonnet orange, guide, jauge, anneau du point, « +n »,
au pixel d'écran), `BouloHud.js` (ouvrir, salle, ardoise, gestes, revanche, abandon), `A.drawBouloPose` (accroupi / debout, le bras qui
balance), le mode `solo` de `petanque.js` (l'entraînement). Réseau : une requête par geste, un `apply` (session + entrée du lancer +
empreinte) ; la posture dans le paquet de position (`bp`) ; aucune migration. Bancs : `verify-boulo-jeu` 32/32 (dont 600+ lancers animés à
60 i/s qui concluent l'état de l'hôte au bit près), `render-boulo-jeu`, `verify-petanque` 83/83. Vu en jeu (harnais) : entraînement ; à
deux, salle, invitation, tours, pause et reprise, fin 7-6, revanche, abandon ; aucune erreur, aucun écart d'empreinte.
**Pas fait / pas vu** (repris le 2026-11-01 : au doigt, un premier toucher pose la donnée et un second la valide ; le spectateur assis sur un
banc a son ardoise et le cadre ×3 ; la nuit, la pluie — `lourd` lu à 3 — et la fermeture sous la neige vues au harnais) : le
fondu enchaîné pas jugé à l'œil ; le bras du geste est fin à ×2 ; un vrai iPad ; une partie entière jouée à la main (fin testée à 6-6).
**Le lâcher refait le 2026-11-01, sur son premier essai** (« on comprend pas quand lancer, il faudrait un timing parfait ») : la jauge au-dessus
de la tête était CACHÉE sous son nom (cote de tête en dur, d'avant le trait simple) et ne disait pas ce que l'aiguille changeait. Elle n'existe
plus : pendant le lâcher, le guide montre le VRAI point de chute de l'instant sur son RAIL (de « trop court » à « trop long », l'anneau doré au
milieu), l'arc et la boule fantôme le suivent ; on lâche quand il passe dans l'anneau ; un mot suit (« Pile ! », « Bien », « Court »/« Long »,
« Trop… »). Difficulté inchangée (périodes et `kL`/`kA` du banc §9, bots intacts) : on voit ce qu'on joue. `verify-boulo-jeu` 34/34 (le
guide du lâcher ne ment pas : 0,0 mm de la chute simulée). À juger en jeu : la vitesse du point (inchangée), la lisibilité du rail à ×3.

**Lot 4 — les habitants boulistes : ses 19 verdicts du 2026-11-01** (https://claude.ai/artifact/FjZkm6oWF1bGbDZs8vDRgd, base
`verdicts/<id>`, `meta/fin` ; rien n'est codé). Le premier tour avait dit : boulistes à heures fixes, un niveau selon leur caractère, on en
défie un seul, la doublette complétée, une prime plafonnée, rien entre joueurs. **Écart à ma recommandation** : le club n'est PAS fait
d'habitants du roster, ce sont **trois personnages NEUFS, des retraités de la ville** — le point « lesquels » (pensé pour le roster :
Gustave, Honoré, Sidonie) tombe ; noms, allure, anciens métiers et caractères sont À POSER avec lui au début du lot 4 (piste : ils habitent
les maisons de ville qui ne sont à personne, `TOWN_TOWNHOUSES`). **Décidé** : présents chaque jour de 14 h à 22 h de jeu (un jour = 16 min
réelles : l'heure ne fixe que l'ARRIVÉE ; ils finissent la partie commencée ; pas sous la neige, oui sous la pluie) ; E près d'un bouliste
libre, « Une partie ? » (en partie, il finit la sienne) ; tête-à-tête, et doublette complétée jusqu'à deux contre deux (seul : toi et un
habitant contre deux ; à deux : ensemble contre deux, ou chacun avec un habitant) — pas de « à trois » complété ; le partenaire joue à son
idée ; le club n'occupe qu'une piste ; une adresse FIXE par personne (fort, moyen, débutant) — **sa note : « le fort ne doit pas être
invincible, attention »** (à mesurer au banc : un joueur plausible moyen doit lui prendre des parties) ; une vraie tête (pointer ou tirer
selon le jeu, la ligne de tir lue — pas de tir quand le but est juste derrière —, le relief lu selon le niveau) ; 3 à 6 s avant de lancer ;
on ne voit pas sa visée (sa posture suffit) ; sans joueur, deux jouent une vraie partie (lancée par l'hôte, un message par boule, seulement
quand un joueur est en ville) et le troisième attend sur le banc, libre pour un défi ; s'asseoir sur un banc du boulodrome cadre la partie à
×3 ; des répliques rares, aux moments forts — **sa note : « ajoute de nouvelles répliques comiques, et même en anglais, avec des expressions
du sud de la France »** ; un joueur parti : la pause de dix minutes du lot 3 ; la prime 100 / 200 / 400 or selon l'adversaire (en doublette,
celle du plus fort des deux battus), la première victoire contre chacun chaque jour (heure de Paris), rien à perdre ; chacun retient ton
bilan contre lui et le dit quand tu le défies (sauvegarde de la ferme, aucune manipulation Supabase).

**Lot 4 FAIT le 2026-11-01** (README ferme, journal du jour ; à juger : `docs/A-JUGER.md`). **Le casting, tranché par moi** (« surprends-moi ») :
FERNAND, l'ancien géomètre du cadastre (le fort, ±26 ms, il lit le relief et tire, bougon), MIREILLE, l'institutrice (la moyenne, ±38 ms,
elle compte les points), TOINOU, l'ancien pêcheur du lac (le débutant, ±60 ms, il applaudit les beaux coups) ; ils habitent la ville et
arrivent par le jardin de la mairie. `bouloBot.js` (la tête, pure et déterministe : la posture de celui qui réfléchit se déduit partout),
`boulistes.js` (le club, l'horaire, la prime, le bilan, les répliques), la doublette dans `bouloJeu.js` (`dbl`, `equipes`, le lanceur
désigné qui alterne), le bloc « LE BOULODROME, LOT 4 » de FermeGame.js, le panneau du défi et le spectateur dans `BouloHud.js`.
`verify-boulo-bot` 49/49 (la mesure comprise). Le fort contre un joueur plausible moyen : 25 % pour le joueur (sa note : pas invincible), 48 % pour un habile.
**La part sonore du lot 5 aussi** (`sonBoules.js`, sans effet visuel : la règle « un changement visuel par livraison » tient) : la chute,
le clac de l'acier, le toc du buis, le carreau, le roulé — joués sur les événements datés de la simulation. **La mesure aussi** (2026-11-01 : le mètre sort quand le point se joue à moins de 3 cm, 7 %
des boules ; le ruban, le boîtier, une ardoise de cotes). Reste du lot 5 : Fanny, l'aimant, la gazette, l'ardoise du palmarès.
**Pas fait** : la nuit et la pluie avec le club vues au harnais seulement ; aucune partie entière jouée à la main contre Fernand ; les boulistes ne vont
nulle part ailleurs en ville (ni marché, ni café) ; pas de son (lot 5).

**Lots suivants (un changement visuel par livraison, noyau §2)** : (3) jouer à deux (visée, jauge, ×3 — sa note : « une vue agrandie de la partie, peut-être un fondu enchaîné » —, gestes en 32 × 48,
réseau) ; (4) les habitants boulistes et leur bot ; (5) la mesure, Fanny, l'aimant, les sons, la gazette, l'ardoise.

**Pièges prévisibles** : la carte se regénère depuis sa graine — poser l'emprise sans AUCUN tirage de plus, et l'interdit de placement des deux
côtés (noyau §4) ; une proportion n'est pas une dimension (boule, main, piste se jugent ensemble, sur l'écran) ; tout ce qui touche une position
reste en `+ − × ÷` et `sqrt` (`verify-petanque` §1 le lit) ; un gain d'or rejouable à volonté est un robinet.

## 12. Les personnages au TRAIT SIMPLE — BRANCHÉ le 2026-10-31, style par défaut (dit les 2026-10-29 et 30, jugé le 31)

Ses phrases : « on reviendra ensuite sur le niveau de détail des persos qui ressemblent à des jouets ; on cherchera un moyen de toggle on and
off les anciens graphismes » (2026-10-29) ; « le graphisme actuel s'écarte trop du style simple des anciens dessins originaux. Même si on veut
améliorer le nbre de pixels […], il faudrait garder au maximum la simplicité formelle » (2026-10-30).

**Ses verdicts (2026-10-31, page https://claude.ai/artifact/LQZXwr6nSchVo53dHS7ccP, collection `verdicts`)** : la colonne **Habit**, puis,
la page lui ayant mal expliqué que « Habit » = « Visage » + les signes de vêtement : « on détaille au mieux pour que les habits soient
beaux ». Marche à **huit images**, **tout le monde** (joueurs et habitants) — points non touchés, donc ma recommandation. L'interrupteur va
au **menu dev** et non dans ⚙️ : « le plus important est que le changement se fasse pour tout le monde sur toute la session ».

**Fait** :
- `drawCharFrame` (fermeArt.js) sait se peindre à ×2 (`fine` : son `P` double les rectangles) au DEMI-PAS (`step`, `bob` à 0,5) — la marche
  à huit images (`PERSO_SIMPLE_WALK`) — et y pose les **signes du vêtement** (`paintHabitFine`, persoSimpleArt.js) APRÈS les costumes et
  AVANT la garde-robe : col en V (ses pointes viennent du liseré de l'épaule), boutons, ceinture de cuir à boucle de laiton, poignets,
  poches, languettes et brides des souliers ; la robe : taille, nœud et boutons du dos, ourlet en liseré ; la salopette de Greg (boutons de
  métal, poche, revers roulés), la casquette (bouton, coutures), le carreau buffalo de Tristan au pixel fin, le tablier d'Ingrid (cordon,
  poche), le manteau de Carla (col en V à revers, boucle, fente), le gilet des ouvriers. Règles : aucune couleur inventée (±30 du vêtement,
  le cuir des souliers, un pixel de laiton ou de métal), des traits jamais des volumes, aucun pixel hors de la silhouette (banc).
- `persoSimpleArt.js` retouche ensuite l'image fine : coins arrondis (Scale2x « contre le vide », écrit au pixel fin), liserés, visage
  d'encre et ses onze expressions, semelles. Feuille : `makeCharSimple` (fermeArt.js), au gabarit `__hdK = 2` — 9 images de marche, 4 de
  poses, `__simple` (`drawPoseHD` ne lui pose pas de contour).
- Le style est un **état partagé** (`sharedRef.persoStyle` : "simple" par défaut, "detaille", "ancien") : menu dev → « Personnages (pour
  tous les joueurs) », requête `devPersoStyle`, l'hôte pose, persiste, diffuse dans `p.state`, le dit au chat ; l'arrivant le reçoit dans
  l'instantané. Aucune migration (un champ du JSON de la sauvegarde). L'ancien « ✨ Personnages fins » de ⚙️ (par appareil) est retiré.
- Bancs : `verify-perso-simple` (10/10 : le mode fin aux pas entiers = l'ancien ×2 au pixel près pour 88 tenues ; « net » = Scale2x ; aucun
  signe hors silhouette ; la feuille ; la marche), `render-perso-simple` (+ `perso-simple-habits.png`), `STYLE=simple render-poses-hd`.
  Vu en jeu le 2026-10-31 (harnais `audit-tmp`, `audit-duo`) : les trois styles basculent chez les deux joueurs dans les deux sens, l'arrivant
  reçoit le style, la ligne de chat, les habitants en costume, la nuit.

**Pas fait** : les expressions de profil (seuls l'œil ouvert et fermé) ; les mains jointes au repos (le détaillé les a, le simple non) ;
le bras des riders redessiné le long de l'os (ils recopient le bras par cases, comme l'ancien) ; les vêtements de la Maison Garfield
gardent leur drapé à quatre tons du 2026-10-21 (plus modelés que le reste : à reprendre au trait simple si ça détonne en jeu) ; Léo, Froufrou,
l'apiculteur et le vandale n'ont pas de signes neufs ; pas vu sous la pluie ni au cran 3 sur une capture du jeu (le cran 3 sur une capture
fixe : `perso-simple-ecran-*`). ⚠️ Écarté : le Scale2x complet (il arrondit aussi les frontières intérieures et fait bouder toutes les bouches).

## 13. Le réseau : jouer « à l'instant », sans se soucier des messages (proposé le 2026-11-01 — « pour plus tard », rien de codé)

Sa demande : « un meilleur rendu multijoueur instant, et ne pas avoir à se soucier de limite de messages » (gênes citées : la latence des
actions, les saccades, le quota). **Mesuré le 2026-11-01** (`app/audit-duo`, Supabase local, 20 résidents, deux joueurs qui marchent à la
ferme) : l'hôte émet **8,5 messages/s** (les résidents en font 6,9 : `residentPaths` 3,8, `residentStops` 3,05), l'invité 0,9 ; le
plafond client est de 10/s (`eventsPerSecond`) — on est au bord des messages jetés. Coût : ≈ 67 000 messages facturés par heure à deux
(chaque envoi compte une fois, plus une fois par destinataire), soit **≈ 30 h de ferme à deux par mois sur les 2 M gratuits, ≈ 18 h à
trois**. Immobiles : 3,9 messages/s. La ville n'est pas mesurée. **Vérifié** (docs Supabase) : Realtime est un réseau mondial, chacun se
branche au nœud le plus proche et les messages prennent la dorsale — la région du projet compte pour la base, pas pour les messages ; **le projet Supabase d'Arcardi est à SINGAPOUR** (sa réponse du 2026-11-01) : la base (sauvegardes, salons) est près de ses amis
d'Océanie et d'Asie de l'Est, à ~170 ms de l'Europe — à compter dans le chargement d'une ferme, pas dans les messages du jeu ; le
gratuit plafonne aussi à 100 messages/s pour tout le projet (au-delà, Supabase déconnecte). Relais TURN de Cloudflare : 1 000 Go gratuits,
puis 0,05 $/Go — facturable, donc hors du plan de base (noyau §0.3).
**La piste proposée : une liaison directe entre joueurs (WebRTC, canaux de données), Supabase gardé pour se trouver, les salons, les
sauvegardes et le REPLI** quand la liaison directe échoue (4G, réseaux d'entreprise). Messages directs gratuits, sans plafond ; un seul canal
FIABLE ET ORDONNÉ (la même sémantique qu'aujourd'hui : un `req` ne doit jamais doubler le `pos` qui a rapproché le joueur — l'hôte mesure la
proximité sur ce `pos`). Un module posé là où le canal est déjà enveloppé (`ch.send`, FermeGame.js, « Zip 364 — INSTRUMENTATION ») : les
~96 envois du jeu ne changent pas. Signalisation sans « trickle » (une offre et une réponse complètes : deux messages par liaison).
⚠️ Les pièges vus à l'étude, à régler AVANT d'écrire : (1) l'instantané part par Supabase pendant que la liaison directe s'ouvre — un `apply`
direct arrivé AVANT lui serait écrasé : l'émetteur ne passe en direct qu'après un repère `p2pGo` envoyé par Supabase, et le récepteur
retient les messages directs de cet émetteur jusqu'à ce repère (l'ordre d'un même émetteur est garanti sur chaque chemin, pas entre les
deux) ; (2) un émetteur ne passe en direct que si TOUS ses pairs le sont (les messages Supabase ne disent pas qui les envoie : pas de
dédoublonnage possible sans enveloppe) ; (3) un retour vers Supabase (liaison perdue, nouvel arrivant) se paie d'un instantané redemandé ;
(4) les gros messages (l'instantané) se découpent en morceaux de 16 Ko sur le canal direct ; (5) l'adresse IP de chacun est visible des autres.
**Ordre proposé** : R0 mesurer (un écran « Liaison » au menu dev : l'aller-retour réel par Supabase, la liaison directe tentée, son type et
son aller-retour — à faire jouer à un ami d'Océanie et sur un téléphone en 4G) ; R1 le transport direct + repli ; R2 lever les freins une
fois les messages gratuits (positions de 8 à 20 /s, tampon d'affichage plus court, résidents de 1,3 à 4 /s) ; R3 l'instantané : les gestes
de l'invité affichés tout de suite puis confirmés ou défaits par l'hôte (certains le sont déjà : neige, blessure), et l'hôte choisi au
centre (deux amis en Océanie et lui en Europe : l'hôte en Océanie). **Plan B** si le direct échoue souvent : regrouper les envois de l'hôte
en un message par battement (de 8,5 à ≈ 4 /s, plus de messages jetés) — `components/ferme/SECURITE.md` §5 le décrivait déjà.

## 14. La grande quête de l'étoile (les astéroïdes) : la rejouer pour voir comment elle tourne (dit le 2026-11-01, rien de fait)

Sa phrase : « on retravaillera aussi la grande quête des astéroïdes pour vérifier comment elle tourne. » Point de départ :
`components/ferme/QUETE.md` (l'AUTORITÉ du 2026-09-13 bis, D1–D15, et « ce qui reste codé mais n'a pas été vu en jeu ») ;
`verify-quete`, `render-etoile`, `render-navire`.
