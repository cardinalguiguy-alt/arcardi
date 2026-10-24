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
