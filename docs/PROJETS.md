# PROJETS DÉCIDÉS, PAS COMMENCÉS (court et moyen terme)

> Créé le 2026-10-06, depuis une liste donnée par Guillaume. **Rien de ce qui est écrit ici n'est codé** ; chaque entrée dit ce qui existe
> aujourd'hui (vérifié dans le code ce jour-là), ce qui est décidé, ce qui reste à lui demander AVANT de dessiner (`CLAUDE.md` §2 : questions
> d'abord), et les pièges connus. Une entrée qui se réalise sort d'ici : son récit va en tête du README de la ferme, sa leçon dans le noyau.
> Ce qui attend seulement un JUGEMENT en jeu est dans `docs/A-JUGER.md`, pas ici.

---

## 1. Le catalogue de la Maison Garfield : mieux le présenter (court terme)

**Demande (2026-10-06)** : « amélioration de la présentation du catalogue Maison Garfield ». Aucune décision de forme n'est prise.

**Ce qui existe** (la vitrine de Carla, `boutiqueOpen` dans FermeGame.js — `node tools/doc-index.mjs components/ferme/FermeGame.js boutique`) :
- un panneau modal : le titre, l'or de la caisse commune, **Carla puis Léo** (leur portrait et une réplique tirée du temps, `L.carlaShopLines` /
  `L.leoUpsellLines`), **quatre onglets** (chapeau, écharpe, tenue, teinte), une ligne « Rien », puis **une ligne par article** : nom, prix,
  bouton Acheter / Porter / Retirer ;
- les catalogues : `WARDROBE_HATS` (5), `WARDROBE_SCARVES` (4), `WARDROBE_OUTFITS` (5), `WARDROBE_TINTS` (8) dans fermeConstants.js ;
- **aucune vignette** (seules les teintes ont une pastille de couleur), **aucun aperçu sur le personnage**, une liste verticale par onglet.

**Pistes, à soumettre par questions (rien n'est choisi)** : un aperçu du personnage qui essaie l'article avant achat ; des vignettes ; une grille
plutôt qu'une liste ; ce qu'on porte mis en évidence ; un classement par prix.

**Contraintes** : (1) ⚠️ **la vitrine ne débite rien** — elle affiche et envoie une `req`, l'hôte arbitre ; l'or, ce qu'on possède et ce qu'on
porte viennent TOUJOURS de `sharedRef`, jamais d'une copie locale (commentaire ZIP 427 du panneau) ; (2) la tenue est UNE chaîne
`"w<chapeau><écharpe><tenue><teinte>"` (`wardrobeLook`, fermeConstants.js ; relue par `parseLookWardrobe`, fermeArt.js) : **un aperçu se fait en
dessinant `getChar(…, look)` avec la chaîne candidate, sans rien envoyer** ; (3) textes FR et EN (`fermeStrings.js`, `verify-strings`) ;
(4) tactile : le panneau doit se lire et se toucher sur iPad (voir §3). ⚠️ La teinte d'un vêtement ne touche pas la peau (`WARDROBE_TINTS`) : un
aperçu qui teinterait la feuille entière peindrait le visage.

**Lien** : l'aperçu servira aussi à la création du personnage (§2).

---

## 2. Création du personnage : teinte de peau et coiffure (décidé, à coder plus tard)

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

**Pas fait** : tout. Premier pas raisonnable : une séance de vingt minutes sur iPad pour classer les lignes ci-dessus en « marche / gêne / cassé ».

---

## 4. Le marché et l'ancienne place : les suites (le marché est en haut toute l'année depuis le 2026-10-06)

- **Variantes saisonnières du marché** — « un AUTRE chantier » (Guillaume, 2026-10-06) : aujourd'hui le marché est « le même, sans le froid »
  (`townMarketWorld`) ; à dessiner : un caillebotis moins gris hors hiver (il est peint « pin délavé par l'hiver », `DUCK_RGB`), le potier et la
  charrette de fleurs de retour au printemps et l'été, le coin du feu et les ampoules gardés pour l'hiver, des étals de saison.
- **Les autres usages de l'ancienne place** — DÉCIDÉS le 2026-10-06 (Guillaume : « la place est le plus fun en hiver ; si on ne fait que du décor
  les autres saisons, ça ne va pas — il faut des activités fun », avec des MÉCANIQUES NOUVELLES, sans sortir de l'univers de VT, comme la patinoire
  ou les bonhommes de neige). Rien n'est dessiné ni codé. Trois lots, à découper et à lui faire valider chacun (questions de forme d'abord) :
  1. **Le skatepark (printemps/été, « super idée, géniale »).** Le dallage devient un skatepark : **rollers, vélo ET skate** (trois montures).
     Rampes, bancs, rails ; des **figures** neuves — slides, sauts, vrilles… — **sans obligation de réutiliser le moteur du patin** (`patin.js`) : il
     peut avoir ses propres règles. **Une équipe de nettoyage passe automatiquement à heure fixe** (comme la surfaceuse de la glace, mais horaire
     fixe, pas à la demande). Pistes non décidées : matériel prêté par le chalet ? chrono/slalom ? classement ?
  2. **Le miroir d'eau (été).** Une nappe d'eau peu profonde sur la place, avec des **geysers illuminés la nuit**. Idée gardée ; à questionner :
     on y marche ? jeux (se poursuivre, esquiver les jets) ? reflets (`eau.js` existe) ? cycle des jets ?
  3. **Les jeux de l'automne : Halloween et le spooky.** Chasse aux citrouilles, **bonhommes de citrouilles** (le pendant du bonhomme de neige,
     `bonhomme.js`), tas de feuilles, **lien avec la maison hantée** de la ville, décor et ambiance spooky la nuit. Mécaniques nouvelles, pas des
     décors. Printemps : des jeux du même esprit restent à trouver (cerf-volant, chasse aux œufs… simples pistes, non décidées).
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
