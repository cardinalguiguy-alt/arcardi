# LA QUÊTE DE L'ÉTOILE — « THE FALLEN STRING »

**Document de conception, zip 444.** Écrit sur disque exprès (consigne de reprise) : si la
session est interrompue, tout est ici, y compris l'**état d'avancement** (§10).

⚠️ **Le texte du JEU est en ANGLAIS et en anglais seulement** (cette passe). Ce document-ci est en
français comme le reste de la doc. Toutes les chaînes joueur vivent dans `fermeStrings.js` sous
une seule clé racine `star:` — la passe française sera un ajout de clés, pas un refactor.

⚠️⚠️ **RÉVISION APRÈS LE PREMIER RETOUR DE GUILLAUME**, et c'est la remarque la plus utile du
chantier : *« ne t'embête pas à recopier les mécaniques des autres jeux coopératifs, il faut
quelque chose de très bien intégré… il faut un thème type quête magique secrète ».* Le premier
jet posait un **bonneteau** et un **« 1, 2, 3, soleil »** — deux jeux de kermesse repeints en
magie. Ils sont sortis. **Toute la quête tient désormais sur UNE seule idée magique** (§4), et
elle est secrète (§3).

---

## 0. CE QUE CETTE QUÊTE REMPLACE — DÉCIDÉ

L'enquête « la parcelle qui n'existe pas » (442) est **retirée entièrement** (validé).

| | sort |
|---|---|
| cadre narratif, 21 lieux, 8 chapitres, 3 codes, Vigenère, deux issues | **supprimé** |
| `ENQ_MARKET_*` / `enqMarketMod` — l'issue qui touchait `marketRate` | **supprimé** (cette quête ne touche à AUCUN prix) |
| ⚠️ le plancher unifié dans `E.marketApply` | **conservé** — c'était une réparation, pas de l'enquête |
| ⚠️ « le cours est bit à bit celui du 430 » | **déplacé** dans `verify-vallee.mjs` — il protège le marché, pas l'enquête |
| `E.courtBoxFree`, `E.courtStairwellAt`, `E.courtRoomAt` | **conservées**, la quête s'en sert plus encore |
| les 4 arrêts de téléport d'intérieur du 442 | **conservés**, + le beffroi |
| la **forme** d'`enquete.js` (table pure, résolveurs purs, `migrate*` tolérant, dev-ops qui jettent le gain) | **réutilisée** — c'est le bébé, pas l'eau du bain |
| `townFindPath` / `townNav` / `townSpots` / `townSameArea` | **réutilisés**, aucun chemin refait |
| `tools/verify-enquete.mjs`, `tools/render-enquete.mjs` + 11 sprites | **supprimés** → `verify-quete.mjs`, `render-etoile.mjs`, `render-beffroi.mjs` |

---

## 1. L'HISTOIRE

Le ciel a une **Lyre**. Une lyre à qui il manque une corde ne joue pas.

Une nuit, la corde tombe. Elle traverse le ciel au-dessus de la vallée, se brise ; le gros du
morceau s'enfonce dans un pré à l'est de Valley Town, un éclat dépasse la ville et vient se
planter **dans le champ de la ferme**, encore brûlant.

L'étoile est vivante, petite, terrifiée. Elle ne rentre chez elle que si elle **chante son nom** —
chez les étoiles, un nom est une phrase de cinq notes. Elle en a perdu quatre dans sa chute.

Les joueurs les retrouvent une par une. Quand les quatre chantent enfin ensemble, la phrase
**s'arrête net** : l'étoile est tombée **avant qu'on lui donne sa cinquième note**. Elle ne sait
pas son propre nom. Le ciel ne peut pas la retrouver.

Et de l'autre bout de la ville, **la cloche de l'église sonne une fois, toute seule.**

La cloche a été fondue il y a cent ans dans une étoile tombée qui n'est jamais repartie — trop
lourde, coulée dans le bronze, restée. Elle connaît son nom. Elle a une note. **La donner veut
dire ne plus jamais pouvoir partir.**

Elle la donne.

---

## 2. POURQUOI CETTE HISTOIRE

- **L'enjeu tient en une phrase pour un enfant de 7 ans** : « une étoile est tombée, elle a
  oublié son nom, il faut le lui rendre ». Aucun vocabulaire à apprendre.
- **Pas de méchant, et pourtant une perte.** Ce qui coûte, c'est ce que la cloche donne. Un
  enfant le comprend tout de suite ; à 27 ans on y trouve le poids.
- **Tout rime avec ce qui existe.** La Lyre est un instrument → le nom est une chanson → il faut
  un instrument assez fort pour atteindre le ciel → **l'orgue de l'église**, déjà en jeu, dans la
  tribune, sous le clocher. Rien n'est plaqué.
- ⚠️ **Ça donne enfin une raison au fichier `public/sounds/church-organ.mp3`** que le 441 attend.
  Le son n'est pas dans cette passe ; la scène qui le justifie, si.
- **La ferme y gagne quelque chose** (le premier éclat, et la trace finale). Le 442 se reprochait
  de ne rien lui donner.
- **Le pré nu y gagne une raison d'être** — `CLAUDE.md` §13 pose la question depuis trois zips.

---

## 3. ⭐ LE THÈME : UNE QUÊTE MAGIQUE **SECRÈTE**

⚠️⚠️ **PERSONNE D'AUTRE NE VOIT L'ÉTOILE.** C'est la décision de ton retour, et elle change tout
le ton. Les résidents passent devant le cratère et n'y voient qu'un trou. Aucun panneau ne
l'annonce, aucun PNJ ne la donne, le tableau des nouvelles n'en dit pas un mot. Conséquences,
toutes bonnes :

- **La quête ne commence pas, elle ARRIVE.** Elle tombe du ciel pendant qu'on fait autre chose.
  *Une histoire qui n'existe que pour qui ouvre le bon panneau n'existe pas* — le reproche que le
  442 s'est fait à lui-même, réglé en le supprimant plutôt qu'en ajoutant un second panneau.
- **Aucun nouveau PNJ.** Le premier jet en posait un (une verrière). Il est supprimé : moins de
  travail, plus de secret, et surtout **plus juste**. Les deux seuls personnages sont l'étoile et
  la cloche — deux êtres magiques, et c'est très bien ainsi.
- ⚠️ **L'ÉTOILE SE CACHE QUAND QUELQU'UN APPROCHE.** Un résident passe à portée : elle glisse
  dans le col du joueur et s'éteint. Ça ne coûte rien (les positions des résidents sont déjà là),
  ça se voit tout de suite, et ça **montre** le secret au lieu de l'expliquer.
- **La seule chose que la ville partagera** est la cloche à l'aube, à la fin — sans jamais savoir
  pourquoi. Deux joueurs le sauront.

---

## 4. ⚠️⚠️⚠️ LA GRAMMAIRE MAGIQUE — UNE SEULE IDÉE, ET TOUT EN DÉCOULE

> **La lumière de l'étoile ne montre pas ce qu'une chose EST. Elle montre ce qu'une chose SE
> RAPPELLE.**

Une phrase. Un enfant de huit ans la comprend, et elle explique **les six mini-jeux, la
coopération, et pourquoi il faut être deux**. Il n'y a rien d'autre à retenir.

Trois usages, de plus en plus forts :

| | ce que fait la lumière | où |
|---|---|---|
| **une ombre qui MONTRE** | ton ombre au sol n'est pas ta forme : il y a quelqu'un de petit dessus | étape 1 |
| **une ombre qui PENCHE** | toutes les ombres de la ville se tournent vers les éclats perdus | étape 2 |
| **une lumière qui PORTE** | elle descend dans l'eau noire, elle monte dans les tuyaux d'orgue | étapes 3 et 5 |
| **une ombre qui MENT** | sur cent perles de verre, une seule projette l'ombre d'une étoile | étape 4 |

### ⚠️⚠️ ET LA COOPÉRATION N'EST PAS UNE SERRURE, C'EST UNE CONSÉQUENCE

**On ne peut pas tenir la lumière ET lire l'ombre.** Celui qui la tient est ébloui et a l'ombre
dans le dos ; celui qui lit est dans le noir et n'a pas de lampe. Deux personnes, deux postes,
**toujours** — et jamais parce qu'une porte a deux serrures.

C'est ce que le premier jet ratait : il **empruntait** des verrous coopératifs (deux clés, un
contrepoids, un guetteur). Ici la coopération **sort de la magie elle-même**, elle n'est ajoutée
nulle part. Et les deux joueurs **ne voient pas le même écran** — l'un a un écran ébloui, l'autre
un écran noir où quelque chose bouge.

### Ce que ça coûte au réseau : rien

⚠️ **La coopération se construit sur les POSITIONS, qui circulent déjà.** Qui est où, qui bouge,
qui est assis, dans quelle zone : tout est dans le paquet de `pubMe` depuis toujours. Une
mécanique fondée là-dessus coûte **zéro message** (§3 de `CLAUDE.md` : ce qui peut se déduire ne
se diffuse pas). Chaque client lit les positions distantes qu'il a déjà ; **l'hôte revérifie à sa
propre horloge** au moment du `req`. Un client qui mentirait ne serait pas cru.

### Le solo n'est jamais bloqué

Contrainte dure héritée du 442 : *un jeu qui exige un second joueur pour finir est un jeu qu'on
ne finit pas.* Partout, la parade solo est **de poser la lumière** — on la cale quelque part, elle
ne bouge plus, et il faut faire avec un faisceau fixe. C'est plus long et plus tendu, jamais
impossible. ⚠️ **Chaque fenêtre solo est MESURÉE par `verify-quete`** en rejouant le vrai trajet
avec la vraie collision et la vraie course — jamais réglée à l'œil (leçon du seuil d'axe du taxi,
434).

---

## 5. LE DÉROULÉ — CINQ ÉTAPES, ~55 MINUTES CUMULÉES

| # | titre (carte de chapitre) | où | min |
|---|---|---|---|
| 1 | **What Landed in the Field** | la ferme | 8 |
| 2 | **The Crater** | le pré à l'est de Valley Town | 10 |
| 3 | **What the Water Kept** | le lac du sud, le ponton | 10 |
| 4 | **The Thief's Two Prizes** | le quartier des artisans, la nuit | 13 |
| 5 | **The Fifth Note** | l'église : tribune + **beffroi** | 14 |

⚠️ **Rien ne s'ajoute sans en retirer.** C'est la première chose que le 442 n'a pas tenue.
⚠️ **Aucun minuteur d'échec nulle part.** Rater un mini-jeu recommence la manche, jamais l'étape.

---

### ⭐ OUVERTURE — LA CHUTE

⚠️ **C'est une SCÈNE, pas un message.** Elle se joue là où le joueur est — ferme, ville,
intérieur — et **au même instant pour tout le monde** : l'hôte décide, diffuse **un** `send()`,
chaque client date à SA réception et déroule sa chronologie (jamais de comparaison d'horloge, §3).
Le jeu tourne derrière ; on ne coupe pas la simulation.

| t | ce qui se passe | ce que ça réutilise |
|---|---|---|
| 0,0 s | le ciel s'assombrit d'un cran, les couleurs se désaturent | le voile de nuit existe, on le multiplie |
| 1,2 s | **un trait de lumière traverse le ciel**, ouest → est, la traîne s'effiloche | la couche de ciel est PARTAGÉE ferme/ville depuis le 429 : une seule écriture |
| 3,0 s | **flash blanc** (2 images) puis noir | l'alpha de `zoneTransRef`, inversé en blanc |
| 3,2 s | **la caméra tremble** (amorti, 1,2 s) | offset de caméra, jamais la position du joueur |
| 3,4 s | **tous les oiseaux décollent** | le système de nuées (§16 du README) |
| 4,5 s | à l'est, **une colonne de lumière** monte du pré — visible depuis la ferme ET depuis la ville | la fonction de ciel commune |
| 6,0 s | **carte de chapitre** : noir, un point de lumière, `Chapter One — What Landed in the Field` | overlay neuf, réutilisé 5 fois |

⚠️ **Puis personne ne dit rien.** Aucun résident ne commente. C'est la première chose étrange, et
c'est le thème (§3).

🔊 Accroches son, **vides et nommées** : `starSfx("fall")`, `starSfx("impact")`,
`starSfx("chapterCard")`.

**Déclenchement** : la quête s'arme toute seule à la première nuit où jour ≥ 3 et un joueur est en
ligne. **Personne n'a rien à trouver pour commencer : ça tombe du ciel.**

---

### ÉTAPE 1 — **WHAT LANDED IN THE FIELD** · la ferme · ~8 min

**Où.** Un sillon de terre brûlée dans les champs de l'ouest. ⚠️ **Position DÉRIVÉE, pas écrite** :
ancre au sud du puits, balayage déterministe en spirale jusqu'à la première case libre et
praticable (la leçon d'`ENQ_STONE_ANCHORS`). Elle **ne bloque pas** — une case qui change de sens
sur une carte labourée depuis des mois est un piège. Le banc vérifie qu'elle est libre,
praticable, et distincte de la boutique, du bac, du panneau de gare et du seuil de la maison.

**Ce qu'on voit.** Six cases de terre noire retournée, de l'herbe givrée de sel de verre, et au
bout un éclat **trop brillant pour être regardé**, qui fume.

> `star.s1.tooHot` — "It's too hot to look at. It hisses when the rain touches it."

**🎮 MINI-JEU 1 — « COOLING » · l'arrosoir**
Le joueur a déjà l'outil et il l'aime. On arrose **par à-coups** ; une jauge de chaleur doit rester
dans une bande étroite. Trop d'eau d'un coup et le verre **se fend** (la manche repart) ; pas assez
et il remonte au blanc.
- **En canevas**, pas en barres CSS : on voit l'éclat, la vapeur, la couleur descendre
  blanc → orange → rouge sombre → bleu. ⚠️ **Chaque impulsion fait un panache de vapeur qui masque
  la jauge une seconde** — c'est ça, la difficulté, et elle est diégétique.
- **Trois manches**, bande de 0,26 → 0,19 → 0,13.
- À deux : deux arrosoirs, bande 40 % plus large. Confort, pas obligation — c'est le tutoriel.

**LA PREMIÈRE MAGIE.** L'éclat refroidit, sa lumière s'allume — et **l'ombre du joueur au sol
n'est plus sa forme** : il y a quelqu'un de petit assis sur son épaule. On se retourne : il n'y a
personne.

> `star.s1.shadow` — "Your shadow has someone small sitting on its shoulder. You turn around.
> Nothing there."

**Ce que ça donne.** **Éclat 1.** Le pisteur apparaît. L'éclat penche vers l'est, toujours.
→ **prendre le train.**

---

### ÉTAPE 2 — **THE CRATER** · le pré à l'est · ~10 min

**Où.** Un cratère de neuf cases dans le pré entre le champ de foire et le bois (validé). ⚠️
**Dérivé** d'une ancre, recherche déterministe de la première zone dégagée. Le sentier de l'est
(440) passe à côté et cesse enfin de ne mener nulle part.

**Le décor est neuf et il doit être beau** : anneau de terre soulevée, herbe couchée **en étoile**
sur vingt cases, **sable fondu en verre vert** au fond, tiède, qui prend la lumière du ciel. La
nuit il luit ; au matin il fume. Voir §7.

**Ce qu'on voit d'abord.** Rien. Puis, **au bord de l'écran**, une lueur qui n'y est plus quand on
tourne la tête.

**🤝 COOPÉRATION — « THE SHY LIGHT »**
Elle ne sort **que si personne ne la regarde**. Les deux joueurs doivent lui tourner le dos, en
même temps. Elle apparaît alors **en périphérie**, dessinée en clair au bord de l'écran ; se
retourner l'efface.
- Sensation : deux personnes debout dans un cratère, dos à dos, à regarder ailleurs, pendant
  qu'un truc minuscule s'approche. **C'est drôle, c'est tendre, et ce n'est copié de rien.**
- Arbitrage : chaque client demande (`req starCalm`) quand SA condition tient ; **l'hôte
  revérifie les deux positions et les deux orientations à sa propre horloge**.
  ⚠️ **À CONFIRMER DANS LE CODE** : l'orientation est-elle dans `pubMe` ? Si non, la condition
  devient « immobile, dos au cratère » déduite du dernier déplacement — et si ça ne tient pas non
  plus, **on retombe sur l'immobilité seule** (`moving`, qui y est certainement). *On construit sur
  ce que le paquet porte déjà, jamais sur un champ ajouté* — un champ qui circule sans être lu est
  le défaut du 432.
- **Solo** : dos tourné et immobile **beaucoup plus longtemps** ; elle ressort si on rate.

**LA RENCONTRE.** Grosse comme un poing, elle tremble, elle parle **en bulles courtes** au-dessus
d'elle, comme les résidents. Elle voit l'éclat qu'on porte, **le reprend**, et pour la première
fois **deux notes chantent ensemble**. Elle arrête de trembler.

> `star.s2.meet1` — "It is smaller than a hen. It is shaking."
> `star.s2.meet2` — "You hold out the piece from your field. It takes it back."
> `star.s2.meet3` — "Two notes, together. It stops shaking."

**LE COMPAGNON.** ⚠️ **Sa position est DÉRIVÉE de celle de son porteur** (`trailFollow`, le
mécanisme des invités de famille depuis le 428) : **zéro message, aucune collision propre,
impossible de traverser un mur**. Elle brille près d'un éclat, **elle se cache quand un résident
approche** (§3), elle se pose sur le banc d'orgue à la fin. **C'est elle, l'interface qui
accompagne le joueur.**

**🎮 MINI-JEU 2 — « THE LEANING SHADOWS »**
L'étoile chante, et **toutes les ombres de la ville se tournent** — arbres, lampadaires, statues,
étals : elles cessent de suivre le soleil et penchent vers un éclat perdu. Mais **une direction
n'est pas un lieu**.
- Geste : `E` n'importe où → une onde part au sol, et les ombres autour de soi pivotent
  lentement, en montrant leur direction. **C'est le plus beau plan de la quête et il ne coûte
  qu'une rotation d'ombre.**
- **Deux lectures depuis deux endroits éloignés se croisent** → le lieu se marque, chez les deux,
  sur la boussole et la carte.
- Arbitrage : `req starLean` avec la case. L'hôte garde `{tile, hostNow}`. **Deux joueurs
  DISTINCTS, > 30 cases d'écart, dans une fenêtre de 20 s datée par l'HÔTE.**
- **Solo** : fenêtre 70 s, écart 45 cases — on lit, on traverse, on relit. L'étoile le dit :
  "Stay still. I'll try to remember which way it leaned."
- **Deux croisements** : le lac, puis le quartier des artisans. ⚠️ **Les deux se marquent ici** :
  on sait toujours ce qu'on cherche, jamais de mystère entretenu.

---

### ÉTAPE 3 — **WHAT THE WATER KEPT** · le lac du sud · ~10 min

**Où.** Sous le ponton (`TOWN_PIER`). L'eau du 435-436 est le plus beau morceau de la carte —
profondeur, reflets, haut-fond. On plonge dedans, enfin.

**🤝 COOPÉRATION — « THE LIGHT THAT LEADS »** — le cœur de l'étape, et l'usage le plus pur de la
grammaire.
L'eau est noire. **La lumière de l'étoile la traverse et fait une flaque claire au fond.** Celui
qui tient l'étoile marche sur le ponton ; **la flaque suit ses pas**. Celui qui plonge **ne voit
que l'intérieur de la flaque** — dehors, écran noir.
- Donc : **A éclaire le chemin de B, littéralement.** A voit la surface et devine ; B voit le fond
  et cherche. Aucun des deux ne peut faire les deux.
- Zéro message : la position de A circule déjà, le client de B dessine la flaque sous elle.
- **Solo** : on cale l'étoile sur la bitte d'amarrage. La flaque **ne bouge plus** ; l'éclat est à
  son bord, il faut plonger en biais, ressortir, recommencer. Trois essais au lieu d'un.

**🎮 MINI-JEU 3 — « THE DIVE »** — canevas plein écran, trois descentes :
1. **Le souffle** : un anneau de lumière se referme depuis le bord de l'écran. Seule limite.
2. **Le courant** : des veines sombres poussent de côté ; on corrige aux flèches, plus fort en
   descendant.
3. **Les obstacles** : pilotis, herbiers, une vieille barque. Un choc coûte du souffle, pas la
   manche.
4. **La prise** : l'éclat **pulse** toutes les 1,1 s ; il faut être dessus au bon battement.
   Rythme, pas réflexe.
- **Montée** : 22 m courant faible et aucune pulsation (on apprend) · 34 m courant moyen · 48 m
  courant fort, **et l'éclat glisse de deux cases quand on approche**.
- Feedback : bulles, assombrissement, le halo de A qui s'éloigne en surface, un battement visuel
  quand le souffle est court.
- Échec = on remonte, on souffle, on replonge. **Aucune perte.**

**Éclat 2.** En remontant : **une ombre traverse l'eau. Des ailes.**

> `star.s3.wings` — "A shadow crosses the water. Wings. Something small and bright goes east with
> it."

---

### ÉTAPE 4 — **THE THIEF'S TWO PRIZES** · les artisans, la nuit · ~13 min

⚠️ **Un seul lieu, une seule histoire, deux éclats.** Le premier jet en faisait deux étapes ; les
fusionner **raccourcit ET resserre** : une pie niche sur le toit de la verrerie. Elle a pris deux
éclats. Elle en a **laissé tomber un dans le sable** — fondu dans une perle. Elle a gardé l'autre.

**L'atelier est fermé et noir.** On entre la nuit. **Personne. Aucun PNJ** (§3).

**🤝 + 🎮 MINI-JEU 4 — « A SHADOW THAT LIES »**
Un râtelier de cent perles de verre. Toutes pareilles. A tient l'étoile et **balaie** le râtelier ;
les ombres défilent sur le mur du fond. **B regarde le mur.** À un seul angle, une perle projette
**l'ombre d'une étoile** au lieu de l'ombre d'une bille.
- ⚠️ **A ne peut pas voir le mur** (il est face au râtelier, ébloui) ; **B ne peut pas bouger la
  lumière**. C'est la grammaire, à l'état pur.
- Ça se JOUE : **la vitesse du balayage compte.** Trop vite, l'ombre passe et on la rate ; trop
  lentement, le verre chauffe et l'ombre **se brouille**. Il y a une bonne allure, et on la sent.
- **Trois râteliers** : 40 perles / 70 / 100, et l'ombre vraie tient de moins en moins longtemps.
- **Solo** : on coince l'étoile dans le châssis de la fenêtre. La lumière ne bouge plus, donc
  **c'est le râtelier qu'on tourne**, d'un cran à la fois, à la manivelle. Plus long, jouable.

**Éclat 3.**

**🤝 + 🎮 MINI-JEU 5 — « THE LURE »**
Le nid est sur le toit. **La pie suit la lumière** comme un chat suit une lampe de poche.
- A **emmène** la lumière — il faut *mener*, pas *tirer* : la pie a du retard et de la patience,
  elle décroche si la lumière s'arrête ou saute. Un vrai petit geste d'adresse.
- **B monte au nid** pendant ce temps. Si A perd la pie, elle remonte et B se fait voir : la
  manche repart.
- **Solo** : on pose l'étoile, la pie descend et **repart sur un minuteur mesuré**.

**Éclat 4.**

#### ⚡ LE RETOURNEMENT

Sur le toit, les **quatre notes chantent ensemble pour la première fois**. C'est beau, ça monte —
**et ça s'arrête net.** Blanc. Le décor se tait : les oiseaux, le vent (le voile de météo est déjà
là).

Elle a **quatre** notes. Un nom en fait **cinq**. Elle est tombée **avant qu'on lui donne la
sienne** — c'est pour ça qu'elle est tombée. Elle ne sait pas son nom. **Le ciel ne peut pas la
retrouver.**

Elle s'éteint presque. Puis, à l'autre bout de la ville, **la cloche sonne une fois, toute seule.**

> `star.s4.turn1` — "Four notes. It waits for the fifth."
> `star.s4.turn2` — "There is no fifth. It fell before anyone gave it one."
> `star.s4.turn3` — "A name it cannot say. A sky that cannot find it."
> `star.s4.turn4` — "Then, across the town, the church bell rings. Once. Nobody pulled it."

**Carte de chapitre : `Chapter Five — The Fifth Note`.** ⚠️ **Le pisteur change de sujet en même
temps que l'histoire** : les quatre pastilles d'éclats laissent place à **une seule, vide**, et à
une direction vers le clocher.

---

### ÉTAPE 5 — **THE FIFTH NOTE** · l'église · ~14 min

#### ⚠️ CE QUI N'EXISTE PAS ENCORE, ET QU'IL FAUT DIRE

**Le clocher n'est pas un lieu du jeu.** L'église a `church` + `churchLoft` ; la tribune contient
une **cage de vis** et une **corde de cloche** (441), mais **on ne monte pas**, il n'y a pas de
beffroi. La prémisse le suppose, le dépôt ne l'a pas. **Prix mesuré au 441 : une ligne dans
`COURT_FLOORS`** + un plan + le palier haut de la vis existante. Aucun `CT_*` de plus, aucune
zone, aucun champ réseau (l'étage se déduit de `y`). Validé.

**Le beffroi.** Huit cases sur dix : la **charpente de bois**, **la cloche** au centre, **quatre
abat-son** ouverts aux quatre vents, le palier de la vis, de la fiente de pigeon partout. ⚠️ **Ses
quatre ouvertures donnent sur la ville** — on la voit d'en haut, en petit, comme la tribune voit
la nef (441). **C'est la raison d'être du niveau**, et `render-beffroi.mjs` le contrôle : sans ça
on aura construit une pièce fermée en haut d'un escalier.

#### LA MONTÉE

La vis est étroite et noire ; **l'étoile éclaire**. Deux inscriptions à hauteur de main, gravées
par des sonneurs morts depuis longtemps. Court, savoureux, jamais obligatoire.

> `star.s5.stair1` — "Scratched in the stone: 'J.M. rang for the flood. 1889.'"
> `star.s5.stair2` — "Lower down, smaller: 'and for nothing at all, some days.'"

#### CE QUE DIT LA CLOCHE

Vieille, verte, immense. **Elle parle en vibrant** — le texte apparaît **dans le bronze**, pas dans
une bulle.

> `star.s5.bell1` — "I fell too. A long time ago. Before the town had a name."
> `star.s5.bell2` — "They found me warm in a field and they poured me into this shape."
> `star.s5.bell3` — "I am too heavy to go home now. But I kept my note."
> `star.s5.bell4` — "Small one. Take it. I have rung four thousand times and I am not tired of
> staying."

⚠️ **Aucun choix moral n'est proposé, et c'est délibéré.** La cloche décide. Un menu à deux
boutons transformerait un don en arbitrage — exactement ce qu'on retire au 442. Ce que les joueurs
font n'est pas *choisir*, c'est **sonner**, ensemble, pour que le don ait lieu. **On joue le geste
au lieu de cocher la case.**

#### 🎮 MINI-JEU 6 — « THE DUET » · le climax

**Deux pièces, deux jeux différents, un seul échec.** Les joueurs ne se voient pas.

⚠️ **L'orgue ne fait pas de son dans cette passe — il fait de la LUMIÈRE**, et c'est la grammaire
qui le permet. Chaque tuyau qui parle envoie **un rai de lumière** à travers le plancher de la
tribune, jusque dans le beffroi.

**Joueur A — à l'orgue** (`churchLoft`, sur `organBench`, qui existe déjà).
L'étoile chante une phrase ; A la **tient** — pas un Simon-dit muet : on **enfonce et on soutient**
les touches, comme à l'orgue, et **les rais qui montent disent lesquelles sont justes** (or =
juste, gris = fausse). On peut se rattraper, rien n'est perdu.

**Joueur B — au beffroi**, un étage plus haut.
Il tient les quatre éclats dans les rais qui percent le plancher, et **les renvoie par les
abat-son vers la Lyre — qui dérive**. Une visée lente à corriger sans arrêt, plus rapide à chaque
phrase.

⚠️ **Chacun VOIT l'effet de l'autre** : les rais de A **s'éteignent** si B décroche, le faisceau
de B **faiblit** si A se trompe. *Sans ça, ce sont deux mini-jeux côte à côte, pas une
coopération.*
- Arbitrage : les deux mini-jeux sont **locaux**. Chaque phrase réussie part en `req`, l'hôte
  compte et diffuse. Six phrases = 12 messages en tout.
- **Solo** : les **cales du sonneur** (des coins de bois — un vrai usage d'orgue) tiennent les
  touches. On cale, on court dans la vis, on vise, on redescend ; **la note faiblit pendant la
  montée**, fenêtre **mesurée** sur le trajet réel banc d'orgue → beffroi en courant. L'étoile le
  dit : "Go. I'll hold what I can."

#### 🌟 LA RÉSOLUTION

Cinq notes. La cloche donne la sienne — **elle sonne, et sa voix devient plus mate d'un demi-ton
pour toujours.**

1. Les quatre éclats **quittent les mains de B** et tournent autour de la cloche.
2. La caméra **dézoome** (le dézoom des monuments existe depuis le 428, on le pousse d'un cran).
3. Les abat-son s'ouvrent en grand : la lumière sort par les quatre côtés — **on voit la ville
   entière s'éclairer par en haut**, un mur après l'autre.
4. L'étoile monte. Lentement. **Comme un ballon qu'on lâche**, pas comme une fusée.
5. Le trou de la Lyre se referme. **Une étoile de plus dans le ciel, pour toujours.**
6. Fondu au blanc → **l'aube**. La ville vide au petit matin. La cloche sonne une fois. Carte de
   fin : `The Fallen String`.

> `star.end1` — "It goes up the way a balloon goes up. Slowly. Like it has all night."
> `star.end2` — "The gap in the Lyre closes."
> `star.end3` — "The bell doesn't say anything else."

#### LA TRACE

⚠️ **Une fin qui ne change rien n'a pas eu lieu.** Cinq traces permanentes, toutes lisibles sans
ouvrir un panneau :

| trace | où | coût |
|---|---|---|
| **une étoile de plus** la nuit, plus brillante que les autres | ville **et** ferme | la couche de ciel existe |
| **la cloche sonne une fois à chaque aube**, toute seule | toute la ville | un crochet d'aube existe déjà |
| **le cratère refroidit en bassin de verre vert** qui luit la nuit | le pré | variante de décor |
| **le beffroi reste ouvert** — la plus belle vue du jeu | l'église | le niveau est construit |
| **le sillon de la ferme se referme en herbe rase**, un éclat de verre dedans | la ferme | variante de décor |

#### 🎁 LA RÉCOMPENSE

⚠️ **Aucun or, aucune pièce, aucun gain économique.** Cette quête ne touche à aucun prix — donc
elle ne peut pas casser le marché, contrairement au 442 qui touchait `marketRate`.

Ce qu'on construit **maintenant** : `resolveStarGift(state, playerId, hostNow)`, **arbitré par
l'hôte**, appelé **une seule fois** au basculement de la scène finale, qui inscrit
`star.gift[playerId] = { at, kind: "starlight" }` dans l'état partagé persisté.

⚠️⚠️ **L'ARBITRAGE EST POSÉ MAINTENANT, LE CONTENU PLUS TARD** — la règle du 439 (« un panneau qui
s'ouvre à volonté ne doit rien donner ») appliquée à un crochet qui ne donne encore rien. Le jour
où la garde-robe cosmétique existera, elle lira `star.gift` : le chemin d'attribution sera déjà là,
déjà arbitré, déjà persisté, déjà mesuré. **Ce qu'on ne fait PAS** : le système de déblocage,
l'objet, son sprite, son panneau. Le jeu dit simplement, une fois :

> `star.gift` — "Something of it stayed with you."

---

## 6. L'INTERFACE QUI ACCOMPAGNE

1. **LE PISTEUR** — bandeau compact : ⭐ + quatre pastilles + **une phrase courte**, jamais deux.
   Il change de forme au retournement.
2. **LE COMPAGNON** — le vrai changement. Position dérivée, **zéro message**. Elle brille près
   d'un éclat, **se cache des résidents**, se pose sur le banc d'orgue. **C'est le pisteur, en
   vivant.**
3. **LES BULLES** — l'étoile parle au-dessus d'elle, comme les résidents. Phrases courtes, mots
   simples, **jamais un panneau quand une bulle suffit**.
4. **LES CARTES DE CHAPITRE** — cinq, plein écran, sur fondu. C'est la mise en scène JRPG, et
   c'est ce qui découpe l'heure en cinq soirées possibles.
5. **LE CIEL EST LE COMPTEUR** — dès la chute, la **Lyre** est visible la nuit, avec son trou. Elle
   dérive de nuit en nuit. À la fin, elle est complète.
6. **LES PANNEAUX D'ÉTOILE** ont leur habillage : fond de nuit, lumière, bordure claire — distinct
   du bois des panneaux de ferme. On sait de quel monde vient ce qu'on lit.
7. **LA REPRISE** — carte **« Previously »** : une ligne, le compte d'éclats, où l'on allait. Une
   fois par session.

---

## 7. LES DESSINS NEUFS, ET LE CHOIX DE NE PAS OUVRIR BLENDER

**Huit familles**, toutes en **canevas procédural** dans `fermeArt.js` :

| | quoi | la règle de `DESSIN.md` qui le gouverne |
|---|---|---|
| 1 | **l'étoile compagnon** — 4 poses × 3 états (calme / apeurée / éteinte) | ⚠️ **un cerne sert aussi sur fond clair** (441) : une étoile blanche sur un mur clair disparaît |
| 2 | **l'éclat**, 4 couleurs (une par note) | échelle jugée **contre le fermier**, pas contre d'autres décors (429) |
| 3 | **le sillon de la ferme**, chaud / refroidi | une usure a un bord flou (441) |
| 4 | **le cratère** : anneau, herbe couchée en étoile, verre fondu ; jour / nuit / après | ⚠️ un champ `s(x,y)` et son isoligne, **jamais une hauteur par colonne** (437) : un cratère est un ovale, et un ovale ne s'écrit pas `f(x)` |
| 5 | **la verrerie** : four éteint, râteliers de perles, châssis, manivelle | on ne meuble pas contre le mur (439) |
| 6 | **la pie et son nid** — de dos, tête tournée, envol | le canevas dimensionné **sur ce qui dépasse** (433, payé trois fois) |
| 7 | **le beffroi** : charpente, cloche, abat-son, palier | ⚠️ **la cloche est aussi haute qu'un mur, donc elle se dessine dans la passe des MURS** — le défaut exact de l'orgue au 441, connu d'avance |
| 8 | **la Lyre** dans le ciel, avec et sans son trou | période et bouclage du motif (434) |

⚠️ **Le PNJ neuf a disparu du chantier** avec le thème du secret (§3) : un dessin de moins, et
c'était le plus cher.

### BLENDER : NON POUR CETTE PASSE

Le §9 de `CLAUDE.md` a levé l'interdit au 443 : un bitmap est **autorisé**. Il reste **payant**, et
ici il perd :

1. **Le pipeline C n'existe nulle part** — ni chargeur, ni cache, ni convention, ni banc. Le §9 le
   dit : *« c'est un chantier, pas un import »*. Le poser coûterait plus que les huit dessins.
2. **Un bitmap sort du champ des bancs de rendu.** `render-*.mjs` appellent du code ; ils ne
   relisent pas un PNG. Un cratère importé **ne se dégraderait pas, il vieillirait** — le §« il
   fait vieillir » de l'en-tête, et ce chantier ajoute deux bancs de rendu pour ne pas y tomber.
3. **Le cratère et le beffroi doivent rester VIVANTS** : ils changent avec l'heure, la météo, la
   saison, et le cratère change d'état après la fin. Un bitmap fige, ou en demande quatre.
4. **À cette échelle, Blender achète l'ÉCLAIRAGE**, qui exige la passe de calibrage du §8. Mesuré
   au 426 sur la statue de la Justice : **écart-type 24,6 contre 47,7** en référence après deux
   passes — le sprite à la main gagnait.

⚠️ **Ce n'est pas un refus de principe.** Un essai calibré sur le seul cratère (rendu → PNG →
mesure L / écart-type / saturation contre la référence 480×270, comparé au procédural) est
faisable — **hors budget de cette quête**, à demander comme chantier à part.

---

## 8. LE CODE

### `components/ferme/quete.js` — la table et les résolveurs purs

Même forme qu'`enquete.js`, pour la même raison : **une quête = une ligne, pas un `if` de plus
dans un fichier de 24 000 lignes**, et surtout **un banc doit pouvoir l'appeler**. Aucun React,
aucun dessin.

- `STAR_SITES` — chaque lieu avec `zone` + `spot`. ⚠️ **La zone est testée AVANT toute distance** :
  seule parade au piège des deux cartes (§4 de `CLAUDE.md`).
- `STAR_CHAPTERS` — cinq entrées. ⚠️ **`starAdvance` est une BOUCLE, pas un `if`** (leçon du 442).
- `newStar()` / `migrateStar(saved)` — reprise **tolérante, pas confiante**.
- `resolveStarShard` · `resolveStarCalm` · `resolveStarLean` · `resolveStarDuet` ·
  `resolveStarGift` — ⚠️ **aucun ne crédite quoi que ce soit lui-même** : ils annoncent, l'hôte
  applique (le double crédit du 431 a coûté un banc dédié).
- `STAR_DEV_OPS` + `devStar(state, op)` — §9.
- **Fenêtres et distances = constantes exportées**, **lues par le jeu ET par le banc**, jamais
  recopiées (§8 de `CLAUDE.md` : ce qui double un autre paramètre est une divergence en attente).

### Réseau — le budget, compté

| moment | `send()` |
|---|---|
| la chute (hôte → tous) | 1 |
| chaque éclat / chapitre franchi | 1 `req` + 1 `apply` |
| le calme du cratère | 1 + 1 |
| chaque lecture d'ombres | 1 + 1 (×4 environ) |
| chaque phrase du duo | 1 + 1 (×6) |
| la scène finale + le don | 1 + 1 |
| **présence** (dos tourné, flaque de lumière, balayage, leurre) | **0** — déduit des positions déjà émises |
| **le compagnon** | **0** — position dérivée du porteur |
| **la Lyre, le ciel, les traces** | **0** — pures fonctions du jour et de l'état partagé |

**≈ 40 messages pour une partie entière**, aucun par image. ⚠️ **Aucun champ ajouté au paquet de
position** — le 432 a trouvé un champ (`sit`) qui circulait sans être lu : des octets pour rien.

### Persistance — décidé

`shared.star`, **un champ de plus dans le JSON de `ferme_saves`** — ⚠️ **AUCUNE MIGRATION SQL,
aucune manipulation Supabase**, exactement comme `townChop` (426), `wardrobe` (427) et `enquete`
(442). C'est le mécanisme réel de la ferme ; `saveGameState` est celui du **jeu courant du salon**
et se perdrait au premier changement de jeu.

**Checkpoints** : chaque chapitre franchi **force une écriture immédiate** (`persistFnRef`, en plus
du minuteur de 3 s). À la reprise, la carte « Previously ». ⚠️ **Aucune étape acquise n'est
rejouée, aucune n'est sautée visuellement** : on reprend au début du chapitre courant.

### Les bancs — `tools/`

**`tools/verify-quete.mjs`** (remplace `verify-enquete.mjs`) :
1. la chaîne des cinq chapitres : `devStar("all")` atteint la fin **sans sauter un indice** ;
2. `migrateStar` sur une sauvegarde **absente**, **vide**, **abîmée** ;
3. le placement dérivé des six lieux : libre, praticable, **atteignable** (vrai `townFindPath`),
   distinct de tout décor existant ;
4. ⚠️ **les fenêtres solo rejouées image par image** avec la vraie collision et la vraie course :
   il imprime le meilleur temps et **échoue si la fenêtre rend le geste impossible OU si elle est
   si large qu'elle ne demande plus rien** ;
5. l'écart minimal de lecture d'ombres est **réellement franchissable** ;
6. le beffroi : connexe, meublé, **et ses quatre ouvertures voient la ville** ;
7. la liste des niveaux == la liste des arrêts du menu dev, **dans les deux sens** (le défaut du
   442 : quatre arrêts manquants pendant deux zips) ;
8. ⚠️ **aucun résolveur ne crédite d'or** — scan de source **avec le compte de lignes LUES**
   (leçon du 441 : un banc qui compte doit publier ce qu'il a lu, sinon on ne s'aperçoit jamais
   qu'il ne scanne rien).

**`tools/render-etoile.mjs`** — les huit familles, avec les contrôles de `DESSIN.md` : aucun pixel
sur le bord HAUT, îlots flottant dans un aplat (connexité à 8), échelle contre le fermier, symétrie
déduite d'un centre.

**`tools/render-beffroi.mjs`** — le plan du niveau, sur le modèle de `render-eglise.mjs` : chaque
case atteignable, aucune poche murée, la cloche dans la passe des murs, et la vue plongeante
réellement peinte par les quatre ouvertures.

**Ce qu'aucun banc ne verra** : le plaisir. Les six mini-jeux sont joués à l'écran, un par un,
avant d'être considérés finis.

---

## 9. LE MENU DÉVELOPPEUR — CONSTRUIT EN PREMIER

Structure **reprise exactement** de la section « 🔍 Enquête » (⌘⇧X → `devEnq`), renommée
**« ⭐ Star »** :

| bouton | ce qu'il fait |
|---|---|
| **Reset** | `newStar()` — un objet neuf, jamais un défaire pièce à pièce |
| **Start** | joue la chute et ouvre le chapitre 1 |
| **Finish chapter** | donne exactement ce qui manque au chapitre COURANT |
| **Skip ahead** | avance d'un chapitre entier, scène comprise |
| **Give a hint** | rejoue le marquage du lieu courant |
| **All but the end** | tout jusqu'au pied du beffroi — s'arrête avant le duo |
| **Play scene…** | rejoue une cinématique isolée (chute · retournement · finale) — **c'est ce bouton qui rend la boucle de qualité tenable** |
| **+ arrêt de téléport** | `churchTower` (et le banc compare les deux listes) |

⚠️⚠️ **AUCUN NE DONNE RIEN.** Le menu s'ouvre à tout joueur qui connaît le raccourci (398). Le
chemin développeur appelle **les mêmes résolveurs** et **jette** ce qu'ils rendent, `resolveStarGift`
compris.

⚠️ **Il est construit AVANT la première scène** : sans lui, revoir la finale coûte cinquante
minutes, donc personne ne la reverrait.

---

## 10. ÉTAT D'AVANCEMENT

| étape | conçu | codé | **regardé à l'écran** | validé |
|---|---|---|---|---|
| **Retrait de l'enquête 442** | ✅ | ✅ | — | — |
| **`quete.js`** — table, résolveurs, dev-ops | ✅ | ✅ | ✅ (banc) | — |
| **Textes** (`STAR_EN`, une table, deux langues) | ✅ | ✅ | ✅ | — |
| **Beffroi** (`churchTower`, 3ᵉ niveau d'église) | ✅ | ✅ | ✅ | — |
| **Placement** cratère / verrerie / nid / sillon | ✅ | ✅ | ✅ (cratère, beffroi) | — |
| **Hôte** — 5 requêtes, une sortie, checkpoint forcé | ✅ | ✅ | ✅ | — |
| **Menu dev ⭐ Star** + arrêt beffroi + « rejouer une scène » | ✅ | ✅ | ✅ | — |
| Sprites (8 familles) | ✅ | ✅ | ✅ (compagne, beffroi, cratère) | — |
| **Mise en scène** (chute, cartes, retournement, finale) | ✅ | ✅ | ✅ chute + carte · ⚠️ **turn/end : non** | — |
| **Les cinq mini-jeux** | ✅ | ✅ | ✅ **dessinés** · ⚠️ **aucun joué jusqu'à la victoire** | — |
| **Interface** (pisteur, compagnon, ciel, reprise) | ✅ | ✅ | ✅ (sauf la Lyre, jamais vue de nuit) | — |
| **Bancs** (`verify-quete`, `render-etoile`, `render-beffroi`) | ✅ | ✅ | ✅ | ✅ |
| **Docs** (`README.md` §25, `CLAUDE.md`, `tools/README.md`) | ✅ | ✅ | — | — |
| **445 — la chute VUE** (file d'attente, rattrapage, caméra sur l'impact) | ✅ | ✅ | ✅ | ✅ |
| **445 — le CHEVRON** (repère directionnel de quête) | ✅ | ✅ | ✅ | ✅ |
| ⚠️ **La quête à DEUX CLIENTS** | ✅ | ✅ | ❌ **RIEN** | ❌ |

### Ce qui est vérifié à ce stade

| | |
|---|---|
| `npx next build` | **✓ Compiled successfully**, plus aucun avertissement nouveau (seul `G_SOIL` reste, préexistant §10 de CLAUDE.md) |
| `verify-syntax` | tout se parse, JSX compris |
| `verify-strings` | **1081 clés appariées** |
| **`verify-quete`** | **177/177** |
| `verify-vallee` | **200/200** |
| **`render-beffroi`** | **28/28**, planche `beffroi-plan.png` |
| `render-etoile` | tous contrôles verts, 3 planches |
| les 13 autres bancs de contrôle · les 16 autres bancs de rendu | OK |
| **séance de jeu réelle, un client** | chute · carte de chapitre · pisteur · rappel « Previously » · compagne · beffroi · les cinq mini-jeux dessinés |

### ⚠️⚠️ CE QUE LA SÉANCE DE JEU A TROUVÉ, ET QUE SIX BANCS VERTS N'AVAIENT PAS VU

**Dix défauts, dont cinq rendaient un lieu inatteignable.** Le tableau complet est au §25 de
`components/ferme/README.md` ; en une phrase : les bancs mesuraient tous la bonne chose, et aucun
ne mesurait **l'arrivée**. Les dix sont corrigés et figés — `verify-quete` est passé de 163 à
177 contrôles pendant cette seule séance.

⚠️ **Et le piège du banc de navigateur a encore mordu**, alors qu'il est écrit au §10 de
`CLAUDE.md` et qu'il avait été relu : panneau masqué, `rAF` ne tourne que pendant une capture, le
personnage n'avance pas et les mini-jeux sautent des manches entières entre deux clichés. ⚠️ **Le
remède du §10 — remplacer `rAF` par un `MessageChannel` — a FIGÉ l'onglet** écrit naïvement : un
relais qui se repose un message à chaque image tourne en boucle serrée. *Il lui faut un frein.*
**La parade qui a marché est ailleurs : monter les cinq mini-jeux ISOLÉMENT** sur une page jetable
(`StarMinigame` est exporté pour ça), où il n'y a ni monde ni caméra à faire tourner.

---

## 11. DÉCISIONS PRISES

1. ✅ **L'enquête 442 est retirée entièrement.**
2. ✅ **`shared.star` dans `ferme_saves`** — aucune manipulation Supabase.
3. ✅ **Le beffroi est un troisième niveau d'église** (`churchTower`, alt 2).
4. ✅ **Le cratère est dans le pré**, dérivé du parc, en (128,117) — mesuré, disque entier libre.
5. ✅ **Blender : non** pour cette passe (§7), essai calibré possible en chantier séparé.
6. ✅ **Aucune mécanique coopérative empruntée.** Tout sort de la grammaire du §4.
7. ✅ **Thème : quête magique SECRÈTE** (§3). Aucun nouveau PNJ, aucun panneau d'annonce.
8. ✅ **Pendant le duo, ce qui traverse le réseau est la PRÉSENCE, pas la performance**
   (`STAR_DUET_ALONE_MUL`). Une visée image par image coûterait un message par image, c'est-à-dire
   le plafond de 10/s crevé par un seul joueur — et dépassé silencieusement. Ce qui circule déjà,
   c'est *où est l'autre* : le faisceau faiblit quand il quitte son poste. Coopération réelle,
   zéro message. ⚠️ **C'est un écart assumé à la conception du §5**, et il est écrit ici pour
   qu'on ne le redécouvre pas comme un oubli.

---

## 12. REPRISE — OÙ ÇA EN EST, ET PAR OÙ CONTINUER

⚠️ **Rien n'est committé.** Tout est en fichiers modifiés / non indexés, prêt à relire.

### 12.1 Ce qui est FAIT

**La quête est jouable de bout en bout par un joueur seul.** La chute s'arme toute seule à la
première nuit du troisième jour, les cinq chapitres s'enchaînent, les cinq mini-jeux s'ouvrent et
se jouent, les trois scènes se jouent, le pisteur et la compagne suivent, la reprise redit où l'on
allait, et la fin laisse ses traces. Tout est arbitré par l'hôte, rien ne paie un or, aucune
migration SQL.

### 12.2 ⚠️⚠️ CE QUI RESTE, ET C'EST COURT — MAIS C'EST LE PLUS IMPORTANT

**A. LA SÉANCE À DEUX CLIENTS. C'est la passe qui manque, et c'est TOUTE la moitié coopérative.**
`node tools/fake-supabase.mjs` + deux onglets (recette du §10 de `CLAUDE.md`). Ce qui n'a jamais
été vu, pas une fois :
1. **l'étoile timide du cratère** — deux joueurs dos à dos, immobiles, quatre secondes. C'est la
   plus jolie mécanique du chantier et personne ne l'a jouée ;
2. **le croisement d'ombres** — deux lectures à plus de 30 cases d'écart dans une fenêtre de 20 s
   datée par l'hôte ;
3. **la flaque de lumière** — A marche sur le ponton, la flaque suit ses pas, B ne voit que
   dedans. `starMiniLead()` lit la position distante ; elle n'a jamais eu de position distante à
   lire ;
4. **le duo** — A à l'orgue, B au beffroi, et le faisceau qui faiblit quand l'autre quitte son
   poste (`starMiniPartner()`) ;
5. **la chute vue simultanément** par deux clients, chacun sur sa propre horloge.
⚠️ Et la ferme PEUPLÉE à deux clients n'a toujours jamais été jouée (§13 de `CLAUDE.md`, réclamé
depuis le 419) : **cette séance-là peut faire les deux d'un coup.**

**B. LES CINQ MINI-JEUX, JOUÉS JUSQU'À LA VICTOIRE, À CADENCE RÉELLE.** Ils sont dessinés et
vérifiés à l'écran, mais le banc de navigateur ne peut pas les JOUER (voir §10). Ce qu'il faut
juger, et qu'aucun banc ne verra jamais : **est-ce que c'est agréable ?** Les manches sont
réglées, pas éprouvées. Les nombres à surveiller en premier : `STAR_COOL_BAND` (la bande
se resserre-t-elle trop vite ?), `STAR_DIVE_CURRENT` (le courant du troisième palier),
`STAR_SWEEP_MIN`/`MAX` (la « bonne allure » se sent-elle ?), `STAR_MAGPIE_LAG`.

**C. LES DEUX SCÈNES JAMAIS VUES** : le retournement (fin du chapitre 4) et la finale. Le bouton
« 🎬 Rejouer une scène » du menu dev les joue isolément — c'est exactement pour ça qu'il existe.

**D. LA LYRE DANS LE CIEL, jamais vue** : elle ne se dessine que la NUIT (`E.isNightTime`), et la
séance s'est faite de jour. Elle porte le compteur d'éclats et son trou ; à regarder une nuit.

**E. LE MORCEAU D'ORGUE** — `public/sounds/church-organ.mp3`, toujours absent (décision du 441).
Rien à coder.

### 12.3 ⚠️ LE POINT QUI N'A PAS CONVERGÉ, ET LES DEUX DIRECTIONS

**L'étoile compagnon a demandé CINQ écritures et n'est pas encore juste.** ⚠️ **Vue en jeu
maintenant, et le diagnostic tient** : à côté du fermier elle se lit comme une petite bête dorée
attachante, mais **elle ne lit pas « étoile » d'emblée**, et son état ÉTEINT (chapitre 5) est un
petit tas gris qu'on perd de vue sur un plancher sombre.

⚠️ **LA CAUSE EST IDENTIFIÉE ET ELLE EST GÉNÉRALE** — c'est la vraie trouvaille de cette passe :
**un cerne d'un pixel impose une profondeur d'échancrure d'au moins trois pixels.** En dessous, le
contour rebouche la forme qu'il souligne. C'est ce qui a produit, tour à tour, une icône, un
biscuit, une amibe et un blob. *Le contour d'un dessin est une contrainte de FORME, pas une
finition.*

**Direction 1 — l'agrandir.** De 15 à 20-22 px (×0,85 d'un fermier). Les échancrures tiennent, le
visage tient. **Prix :** elle cesse d'être « quelque chose qu'on protège » et devient un familier
de la taille d'un chien ; il faut alors changer `star.s2.meet1` (« smaller than a hen »).

**Direction 2 — la dessiner à la main.** Quatre masques de pixels explicites (14×14, ~45 pixels
chacun), ce que fait un pixel-artiste à cette échelle. **Prix :** quatre masques à maintenir, et
les états ne se dérivent plus — soit douze masques.

⚠️ **Mon avis, si tu veux un arbitrage :** la direction 2, mais **seulement sur l'état CALME**
(quatre masques), en gardant la géométrie pour les deux autres, vus deux fois chacun dans toute la
quête. On paie le dessin là où le joueur regarde. ⚠️ **Et une troisième chose, indépendante des
deux :** l'état ÉTEINT a besoin d'un **cerne clair** plutôt que sombre — il est vu dans le
beffroi, sur du bois foncé, et un gris cerné de gris disparaît.

### 12.4 Ce qu'il faut savoir avant de rouvrir le chantier

- ⚠️⚠️ **LE BANC DE NAVIGATEUR NE JOUE PAS.** Panneau masqué = `rAF` par à-coups (§10 de
  `CLAUDE.md`). Deux conséquences mesurées : le personnage n'avance quasiment pas entre deux
  captures, et un mini-jeu saute des manches entières. ⚠️ **Le remède `MessageChannel` du §10 fige
  l'onglet s'il n'a pas de frein** (relais qui se repose un message à chaque image = boucle
  serrée). **La parade qui marche : monter le composant isolément** sur une page jetable —
  `StarMinigame` est exporté pour ça, et une page de quarante lignes suffit.
- ⚠️ **Les deux échafaudages du §10 sont SUPPRIMÉS** (`.env.local`, `app/starbench/`,
  `app/starmini/`). Les recréer prend deux minutes ; les laisser ouvre une ferme sans
  authentification en production.
- ⚠️ **`tools/.cache/` est un cache de modules transpilés.** En cas de doute : `rm -rf tools/.cache`.
- ⚠️ **`makeCanvas` ne rend PAS un canevas DOM** : `{ ctx, px, width, height }`. Et `scale` rend
  `{ px, W, H }` — un `writePNG` mal appelé produit une **image blanche** sans lever d'erreur.
- ⚠️ **Deux seuils d'opacité dans `render-etoile`, non interchangeables** : `silhouette` (40) = la
  surface occupée, halo compris ; `matter` (150) = la matière.
- ⚠️⚠️ **UNE POSITION D'ARRIVÉE NE S'ÉCRIT PLUS, ELLE SE DÉRIVE** (`E.courtFloorSpawn`). C'est la
  leçon la plus chère de la séance : le beffroi était connexe, meublé, mesuré vert par deux bancs,
  et on atterrissait dix cases à côté, dans le noir. *Une porte qui s'ouvre sur le vide passe tous
  les contrôles de la porte.*
- ⚠️ **Un repli en `|| clé` n'échoue pas, il MENT** : `devTeleportName` et `courtFloorName`
  affichaient « churchTower » en toutes lettres. `verify-quete` refuse maintenant les deux.
- ⚠️ **Le menu dev est la bonne porte d'entrée** : ⌘⇧X → « ⭐ Star ». Il appelle les vrais
  résolveurs et jette ce qu'ils rendent.

---

## 13. ZIP 445 — LA CHUTE EST VUE, ET LE CHEVRON MÈNE

**Demande de Guillaume :** *« quand la comète s'écrase, la scène doit être vue. Il doit y avoir un
indicateur style gps (forme spéciale) pour nous diriger vers l'impact ou le cratère. »*

### 13.1 Les quatre décisions

| | tranché |
|---|---|
| ce qu'on construit | **les deux** : la garantie que la scène a lieu **et** la caméra qui va voir l'impact |
| intérieur / menu / mini-jeu au moment de la chute | **on diffère** — elle attend et se joue à la première image où elle a un sens |
| la forme du repère | **un chevron blanc luisant** (le triangle ambre reste la boussole du joueur, 429) |
| l'autre carte | **rien ne s'affiche hors du monde de la cible — la comète comprise** |

### 13.2 ⚠️ CE QUE LE 444 FAISAIT VRAIMENT, ET POURQUOI C'ÉTAIT DEUX DÉFAUTS ET NON UN

1. **La scène pouvait ne pas avoir lieu.** Elle se jouait « là où le joueur est », donc parfois au
   troisième étage du tribunal (pas de ciel), derrière un menu, ou **jamais** — un joueur qui
   rejoint le salon le lendemain ne reçoit que l'ÉTAT, pas le `starScene` qui l'annonçait.
   *Une ouverture qui peut ne pas avoir lieu n'est pas une ouverture.*
2. ⚠️⚠️ **Et quand elle avait lieu, elle ne disait rien.** Le trait de lumière traversait l'écran à
   des coordonnées ARBITRAIRES et la colonne montait à `W × 0,86` : **aucun rapport avec le lieu de
   la chute**. C'était joli et muet. *Une cinématique d'ouverture doit répondre à « où ça ? ».*

### 13.3 Ce qui est construit

- **Une file** (`starScenePendRef`) : la chute est mise en attente à la réception, jamais jouée.
  `starScenePump()` bat dans la boucle, **toutes zones, avant toute sortie anticipée** — c'est le
  défaut d'`actAnimRef` du 426, connu d'avance.
- ⚠️ **Elle ne concerne QUE la chute.** Le retournement et la finale suivent un geste du joueur :
  il est présent par construction, et la finale se joue justement dans un intérieur (le beffroi).
- **Un rattrapage**, par le même code : une marque locale (`localStorage`, datée par `e.fall`)
  comparée à l'état partagé. Un joueur qui rejoint après voit la chute ; **la carte de chapitre
  affiche son chapitre COURANT**, plus « Chapter One » en dur.
- **Une caméra de scène** (`starCamNow`), **une seule écriture lue par `getCam` ET `getCamTown`**.
  Elle vole vers l'impact, s'y tient pendant le flash, revient. ⚠️ **Durée constante, jamais
  fonction de la distance** : le flash doit tomber à 3,0 s chez tout le monde.
- **La comète vise.** Trait, flash, **onde de choc au sol** (neuve) et colonne de lumière sont
  ancrés sur le point d'impact réel, recalculé à chaque image depuis la caméra.
- **Deux impacts, un par carte** : le sillon à la ferme, le cratère en ville — c'est l'histoire
  elle-même, et ça ne coûte pas un message de plus.
- **Le chevron** (`drawStarChevron`), frère de `drawGpsMarker` et jamais sa copie : deux chevrons
  ouverts, blancs, cerne sombre, halo autour ; orbite autour du joueur hors champ, se pose sur la
  cible à l'écran ; **orbite plus large que la boussole** pour qu'ils ne se recouvrent pas.

### 13.4 ⚠️ CE QUE LA SÉANCE A TROUVÉ, ET QU'AUCUN BANC N'AURAIT VU

**Le menu développeur n'était pas dans la garde de visibilité.** C'est le SEUL panneau depuis
lequel on déclenche la chute : elle se jouait donc derrière le menu qu'on venait d'utiliser pour
appuyer dessus. *Le chantier a reproduit, dans son premier jet, très exactement le défaut qu'il
corrigeait* — et il a fallu deux minutes à l'écran pour le voir, contre jamais pour un banc.
⚠️ Seconde leçon, moins grave et plus utile : **j'ai cru deux fois voir un défaut qui n'existait
pas** (le voile absent, le chevron gris). Les deux fois, la mesure a tranché contre l'œil — voile
L 72 contre 146, chevron 232 pixels à L > 215, max 255. *§8 de `CLAUDE.md` : on ne juge pas au
ressenti, y compris quand on croit voir un bogue.*

### 13.5 Vérifié

`verify-quete` **207/207** (177 + 30 neufs, tous sur l'ARRIVÉE) · `verify-syntax` ·
`npx next build` **✓ Compiled successfully** · les 14 autres bancs de contrôle · et **une séance
réelle** : chute différée dans le tribunal (rien ne se joue), jouée à la sortie sur la ferme,
comète ancrée sur le sillon, caméra revenue, chevron à 33 m puis 38 m à la ferme et 131 m vers le
cratère en ville, **et rien à la ferme quand la cible est en ville**.

⚠️ **Ce qui n'a PAS été vu, et qui reste au §12.2 :** la chute à DEUX clients (chacun sur sa carte,
chacun sa caméra, chacun son impact) — c'est la même séance qui manque depuis le 444.
