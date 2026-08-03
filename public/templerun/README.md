# Défi de fuite — monde sombre de Ferme Vallée

> **ZIP 400 — LE CIEL, LES TRONCS, LA PLUIE ET LE MESSAGE DE SORTIE.**
> Retour de Guillaume : « au dessus des montagnes s'affichent des triangles
> retournés oranges qui sont pas beaux. la teinte orange rougeâtre doit être
> entre les montagnes, pas partir de leur cime (…) tu peux ajouter de la pluie
> tu crois ? (…) l'indication du offroad au centre de l'écran comme un message
> QUI NE GÊNE PAS POUR LA VISIBILITÉ (…) ajouter des troncs d'arbres morts en
> travers la route ».
>
> **Le triangle orange n'était pas un problème de couleur, et le zip 383 s'y
> était trompé** en désaturant la bande chaude. C'est un problème d'ORDRE DE
> PEINTURE, et il a fallu un outil neuf pour le voir : `tools/preview-sky.js`
> découpe la lanière du dôme réellement visible — **les lignes 202 à 266 sur
> 512, soit 16 % du dessin** — et l'étire aux proportions de l'écran. Sur cette
> lanière, les sommets de la chaîne lointaine sont HORS CADRE : on n'en voit
> que les versants, qui se croisent deux à deux et dessinent des V pointe en
> bas. La bande chaude, peinte avant tout le relief, se voyait au travers.
> Deux corrections, toutes deux géométriques : la bande passe **après** la
> chaîne lointaine, et le dégradé de fond reste **froid** jusqu'à la crête la
> plus basse du plan proche. Les deux bornes sont DÉRIVÉES des hauteurs de
> cette chaîne, jamais écrites en dur.
>
> **Les troncs morts ne sont pas une famille d'obstacles neuve, et c'est
> délibéré** : ce sont deux habillages — une barrière basse pleine largeur
> (à sauter) et un bloc (à contourner). Le tirage est semé sur la POSITION,
> jamais sur le flux partagé (règle du 381). Preuve que rien n'a bougé :
> `simulate-run.js` rend **exactement** les mêmes chiffres qu'au 399 —
> 5018 m, 137,4 pièces, 0,03 trébuchement, mort passive à 14,6 s.
> Et `smoke-render.js` a refusé la première version du tronc : 202 objets pour
> 100 unités contre un plafond de 200. Six volumes sont devenus quatre.
>
> **Le pont du Pays du Labyrinthe passe de la haie tressée à la pierre du
> dédale** (`mazeStoneDeckTile`), avec `tools/render-maze-bridge.mjs` pour le
> regarder — et il a servi tout de suite : la première version alignait ses
> blocs sur les bords de case, et **on lisait la grille du monde à travers son
> propre pont**.


Endless runner 3D façon Temple Run, intégré à Ferme Vallée comme défi du monde
sombre.

## La progression du décor (zips 379-380)

La course commence sur une **chaussée de pierre à rambardes**, traduction 3D de
la jetée 2D du monde sombre : gros blocs taillés, mortier, pierre de
couronnement, torches allumées, blocs tombés à l'eau. Elle court **jusqu'au
premier virage** (188 à 700 m selon la graine, 420 en moyenne), puis se délite
sur 340 m jusqu'à la **plateforme AA** — la passerelle usée, sombre et
minimaliste, torches éteintes.

Tout tient dans un paramètre continu, `stage`, de 0 à 1. L'« hybride » n'est
pas un troisième décor : c'est `stage ≈ 0,5`. Rien ne bascule nulle part —
la rambarde s'affaisse, les dalles se délitent, le couronnement tombe, les
flammes meurent, les champignons prennent le relais. Le pavage lui-même se
mélange **dalle par dalle** par tirage, ce qui entremêle les deux matières sur
une trentaine de mètres au lieu de les séparer par une ligne.

**Aucun volume n'est en couleur unie** (zip 380). Rambarde, couronnement,
poutres, troncs et mâts de torche ont leur maçonnerie ou leur fil de bois,
peints par deux fonctions génériques — une par objet aurait produit douze
dessins qui divergent, alors que la carrière doit être la même partout.
Les pierres du pavage font 1,40 × 1,33 m, l'échelle de la jetée 2D.

La **brume** suit son propre cycle, de période 4000 m — celle des bifurcations
offroad. Elle est donc au plus épais pile sur les embranchements, qu'elle
annonce plusieurs centaines de mètres à l'avance.

---

## Comment on y joue, dans le jeu

Franchir le passage sombre, puis marcher vers l'**est** jusqu'à la chaussée de
pierre qui enjambe le lac violet et sort de la carte. Un couloir dégagé y mène
depuis l'arrivée, sur les cinq mondes du passage — y compris le labyrinthe.

La chaussée (`G_RUN_JETTY`, cinq cases de large : trois praticables entre deux
rangées de blocs bas) est une **réduction 2D de la plateforme du défi** —
mêmes dalles à trois paliers d'usure, mêmes joints moussus, mêmes stèles à
runes, mêmes torches, mêmes champignons luminescents, et la même pierre
(tools/verify-deck.mjs compare les deux palettes). Elle est posée SUR le lac :
ombre portée au sud, liseré violet au nord.

S'avancer dessus jusqu'à `C.RUN_GATE` déclenche l'embuscade puis le défi.
**Rien ne marque cette case** (décision Guillaume, zip 378) : c'est une dalle
comme les autres, la chaussée continue derrière elle jusqu'au bord du monde. En cas de défaite :
écran de fin, puis retour à la ferme **blessé 10 minutes** (`RUN_INJURED_MS`),
avec les **bonbons** ramassés. Abandonner une course en cours compte comme une
défaite ; ressortir depuis l'écran-titre est gratuit.

**Sortie offroad (zip 377).** Tous les **4000 mètres**, un embranchement s'ouvre
sur le côté de la piste : bordure interrompue, stèle à runes au glow renforcé,
deux torches rapprochées, et un chemin de champignons luminescents qui s'y
engage. Tourner vers lui **quitte la course sain et sauf** — le fermier se
retourne, la caméra **marque un temps** sur la meute qui traverse
l'embranchement et file tout droit, puis il **ralentit jusqu'au trot** et un
fondu enchaîné le ramène **au pied de la jetée, sans un loup**. 4,4 secondes en
tout.

C'est la seule issue du défi qui ne soit pas une défaite : **aucune blessure**,
bonbons conservés, et le score compte pour le record. Il s'arrête en revanche
**au virage** — il mesure la distance parcourue *en danger*. Ne rien faire
devant un embranchement n'a strictement aucune conséquence : la course continue,
et le suivant est 4000 mètres plus loin.

**Le fermier du défi porte la tenue du joueur** (zip 377) : genre et couleurs
(chemise, pantalon, cheveux) voyagent dans `vf-run-init`.

## Y jouer seul, pour itérer sur le gameplay

Double-cliquer sur **`index.html`**. Pas de build, pas de serveur. Le défi
détecte qu'il n'est pas embarqué : français, record en `localStorage`, aucune
conséquence.

> **Une dépendance externe** : `three.js` vient du CDN cdnjs, donc accès
> internet au premier chargement. Il est chargé DANS l'iframe, jamais dans le
> bundle Next : rien à ajouter à `package.json`, et un CDN muet ne casse que le
> défi, pas la ferme. Pour rendre le tout autonome, déposer `three.min.js` ici
> et changer une ligne d'`index.html`.

---

## Commandes

| Touche | Effet |
|---|---|
| **← →** ou **A D** | changer de voie — **et tourner** aux intersections |
| **↑**, **W** ou **Espace** | sauter |
| **↓** ou **S** | glisser |
| **Échap** | pause |

AZERTY (**Q/Z/S/D**) et tactile (glissements) fonctionnent aussi.

**Percuter un obstacle ne tue pas** : on trébuche, on perd de la vitesse, et la
meute reprend 8 unités. Ce sont les loups qui tuent. Seuls les trous et les
virages manqués sont fatals sur le coup.

---

## Architecture

Un fichier = un système. Scripts classiques (pas de modules ES) : c'est ce qui
permet le double-clic sans serveur.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **tous** les réglages de gameplay + la palette du monde sombre |
| `js/strings.js` | textes FR/EN du défi (la ferme impose la langue) |
| `js/bridge.js` | dialogue postMessage avec la ferme |
| `js/input.js` | clavier et tactile → actions, avec tampon d'entrée |
| `js/track.js` | génération procédurale, obstacles, pièces, règles d'équité |
| `js/player.js` | déplacement, saut, glissade, virages, collisions |
| `js/wolves.js` | la poursuite |
| `js/camera.js` | caméra de poursuite |
| `js/world.js` | tout Three.js : scène, matériaux, construction des tronçons |
| `js/ui.js` | écrans, compteurs, langue, record |
| `js/game.js` | machine à états et boucle principale |

**Pour régler le jeu, on n'ouvre que `config.js`.** Rien d'autre ne contient de
nombre de gameplay.

### Protocole avec la ferme

```
ferme -> défi : { type:"vf-run-init", lang, best,
                  skin:{ gender, shirt, pants, hair, skin } }
défi -> ferme : { type:"vf-run-ready" }
                { type:"vf-run-over",   score, candies, distance, cause }
                { type:"vf-run-escape", score, candies, distance }
                { type:"vf-run-exit" }
```

`skin` tranche le point d'architecture laissé ouvert au §8 du contexte : c'est
la **tenue** qui voyage, pas une image de sprite. Le défi ne peut pas lire
`fermeArt.js`, mais quatre couleurs et un genre suffisent à rhabiller son
squelette 3D — et le jour où Carla vendra des chapeaux, on ajoute un champ ici.

`vf-run-escape` obéit à la règle **inverse** de `vf-run-over` : il part à la fin
du fondu, sans écran intermédiaire. Le joueur n'a pas de score à encaisser du
regard — il a fui, et le rythme doit rester celui d'une fuite.

`vf-run-over` part quand le joueur ferme l'écran de fin, pas à sa mort : il doit
pouvoir lire son score avant que la ferme enchaîne son fondu au noir. Les deux
côtés vérifient `event.origin` — la page est servie par la ferme, donc même
origine.

---

## Vérification

Onze scripts Node, depuis ce dossier. Aucune dépendance, moins de 40 secondes
en tout — **les relancer tous à chaque livraison**. Un outil qu'on saute n'est
pas un filet de sécurité, c'est un fichier mort (leçon du zip 375).

```
node tools/verify-fairness.js    # équité de la génération (≈ 21 700 km)
node tools/simulate-run.js       # 120 parties complètes, sans navigateur
node tools/smoke-render.js       # rendu exercé avec un faux Three.js
node tools/check-strings.js      # parité FR/EN + ui.js exécuté contre un faux DOM
node tools/verify-offroad.js     # la bifurcation, vérifiée en la JOUANT (zip 377)
node tools/verify-skin.js        # la tenue du joueur, de la ferme au défi (zip 377)
node tools/render-runner.js      # fermier, flammes ET chaussée 3D en PNG — À REGARDER (377/379)
node tools/render-textures.js    # toutes les textures peintes en PNG — À REGARDER (379/380)
node tools/verify-deck.mjs       # la chaussée 2D : bord atteint, palettes accordées (zip 378)
node tools/render-jetty.mjs      # rend la chaussée 2D en PNG — À REGARDER (zip 378)
```

`verify-fairness.js` ne vérifie pas une règle arbitraire mais une **simulation
de disponibilité** : chaque parade occupe le joueur pendant une durée connue
(saut 0,71 s, glissade 0,62 s, voie 0,20 s), et à 34 u/s un saut consomme 24
unités de piste. L'espacement minimal entre obstacles est donc *calculé* à
partir de la physique du joueur, pas choisi à la main.

`verify-offroad.js` suit le même principe : il ne relit aucune condition, il
**joue**. Il fait prendre la sortie à un joueur, déroule la séquence image par
image, et vérifie ce qui est arrivé — cadence tenue sans dérive, aucun appui
latéral *nécessaire* dans la fenêtre d'armement (donc aucune sortie
accidentelle possible), meute jamais posée sur la branche et toujours en train
de s'éloigner, bout de la branche jamais atteint, score bien figé au virage.

`render-textures.js` fournit un contexte 2D assez complet (dégradés, tracés,
arcs, alpha) pour rejouer **toutes les fonctions de peinture** de world.js et
les écrire en PNG : le ciel, les neuf pavés, les dalles AA, la bordure, les
arbres. Jusqu'au zip 379, aucun de ces dessins n'était visible ailleurs que
dans une partie.

`render-runner.js` **rend en PNG** (rasteriseur maison, zéro dépendance) le
fermier 3D sous trois angles et trois poses pour les deux genres, et les
quatre découpes de flamme de torche avec leur cœur. Il ne prouve rien : il
donne à regarder. **Trois** corrections du zip 377 viennent de là, et aucune ne
levait la moindre erreur : la nuque du fermier posée du côté du visage depuis
le zip 374, les mèches longues qui mangeaient le profil, et la flamme peinte à
l'envers (ventre en haut, pointe sur la mèche — un panache de fumée suspendu
au-dessus du bâton).

`render-jetty.mjs` fait pour la carte 2D ce que `render-runner.js` fait pour
le fermier : il rejoue la vraie génération et le vrai dessin contre un
contexte 2D maison (fillRect seul, zéro dépendance) et écrit un PNG de la rive
est. Les quatre corrections de la chaussée du zip 378 — pierre trop claire,
fêlures en vermisseaux, bordures illisibles, halos en rectangles emboîtés —
viennent toutes de là.

Côté ferme, `verify-gate` (dans le zip de livraison) refait un parcours en
largeur depuis l'arrivée du monde sombre jusqu'à la porte, avec le vrai test de
collision du jeu, sur les six cartes.

---

## Ce qui reste à faire

- ~~**Les torches flottantes**~~ : *fait au zip 379* — chaque torche est portée
  par un pilier de pierre qui descend jusqu'à la chaussée, et `smoke-render.js`
  vérifie cette continuité pour CHACUNE, sur les deux extrêmes du fondu. C'est
  ce contrôle qui a trouvé le mât suspendu 34 cm au-dessus de son propre pilier.
- ~~**Le sprite du fermier**~~ : *fait au zip 377* — il porte la tenue et le
  genre du joueur. Reste une silhouette en boîtes articulées, mais c'est
  désormais un choix (l'animation du zip 374 en dépend), plus un placeholder.
- **Les loups** : trois boîtes noires à yeux rouges. Le sprite existe dans
  `fermeArt.js`.
- **Le décor** : arbres morts, colonnes, runes sont des boîtes. La palette, elle,
  est la bonne (relevée dans `drawEvilFrame`). Les **torches** font exception
  depuis le zip 377 : fût + tête carbonisée + corps de flamme peint + cœur
  additif, avec quatre découpes, quatre jeux d'oscillateurs par flamme et
  quatre cadences de respiration — deux torches ne vacillent jamais ensemble.
  Financé en ramenant `DECOR_PROPS` de 14 à 12 et `TREE_BRANCHES` de 3 à 2.
- **Le son** : rien.
- **Les bonbons** : ramassés et comptés, mais on n'en fait encore rien.
- **La progression de la meute** : `CHASE_RECOVER` et `CHASE_LOSS_ON_STUMBLE`
  sont fixes du début à la fin d'une course (voir l'audit).

---

# ZIP 406 — LE CIEL TIENT DANS LE CADRE, ET LA PLUIE TOMBE

Guillaume, après avoir joué au 405, avec deux captures :

> « il existe toujours un problème géométrique sur le endless run, les triangles
> lumineux sont pas beaux. harmonise tout ça. (…) s'assurer que le fond reste
> stylisé comme tu l'as fait mais sans le triangle lumineux violet, tu peux
> avoir une meilleure façon d'intégrer la lumière dégradée, discrète. »
> « les rambardes en pierre au début ne sont pas assez réalistes (trop plates,
> pas d'aspérités, on dirait des boîtes en bois plus que des empilements de
> pierres). »
> « La pluie tombe à l'envers (bas vers le haut) ; à changer. Mais elle doit
> surtout disparaître progressivement de 3000 à 5000 mètres. »
> « les bras du personnage semblent s'articuler à l'envers (avant-bras qui
> s'orientent dans le mauvais sens pendant la course) »

## 0. La dette qu'il fallait payer d'abord — L'OUTIL ÉTAIT MORT

**`preview-sky.js` jetait depuis le zip 400.** Le 400 a ajouté la pluie ;
`buildRain()` clone la texture d'une nappe par couche ; le faux Three.js de
preview-sky n'avait pas `clone()`. Il levait donc `texR.clone is not a function`
à sa première ligne utile.

Ce n'est pas une anecdote : **c'est CET outil qui avait trouvé le triangle
orange du 400**, en découpant la lanière de ciel réellement visible. Il est mort
le jour même où il a servi, et pendant cinq zips personne ne l'a relancé —
pendant que Guillaume continuait, lui, de voir des triangles.

> **Un outil qu'on saute n'est pas un filet de sécurité, c'est un fichier mort.
> Un outil qui JETTE et qu'on ne relance pas est PIRE : il donne l'impression
> qu'il existe.**

**Et une fois réparé, il mentait.** Il découpait bien la lanière visible en
HAUTEUR, mais étalait les 1024 colonnes de la texture sur toute la largeur de la
planche — alors que le champ horizontal n'en couvre que 297. L'image était donc
écrasée d'un facteur sept en largeur, et présentait comme un remplissage serré
de petits pics ce qui est à l'écran quatre grandes pyramides. C'est très
exactement la leçon du 400 — *une planche à plat peut mentir sur un cadrage* —
appliquée à l'outil qui avait servi à l'énoncer.

## 1. Les triangles — trois zips, trois hypothèses, et la bonne est la TAILLE

| zip | hypothèse | résultat |
|---|---|---|
| 383 | c'est la COULEUR | désaturé, le triangle reste |
| 400 | c'est l'ORDRE DE PEINTURE | il cesse d'être ORANGE, il reste un triangle |
| **406** | **c'est le CADRAGE** | il n'y a plus de triangle : on voit les sommets |

La mesure, faite et non supposée :

* la caméra vise 17,3° vers le bas, champ vertical 72°. Sur un dôme de 1024×512
  dont l'horizon est peint à la ligne 266, **le joueur ne voit que les lignes
  202 à 282** — soixante-quatre lignes de ciel ;
* la chaîne lointaine montait à **62-132 px**, la proche à **42-96**. Leurs
  sommets étaient donc **au-dessus du cadre**. Ce qui restait à l'écran n'était
  pas un relief : c'étaient deux versants qui se croisent, et entre eux un V ;
* horizontalement, une montagne lointaine faisait jusqu'à **300 px de large**
  pour **297 px de champ visible**. Une seule montagne pouvait occuper tout
  l'écran. Un versant plein écran ne se lit pas comme un relief.

**La correction est une mise à l'échelle, pas un repeint.** Huit nombres passent
de world.js à config.js — où l'on peut enfin les trouver — et sont calés pour que
le relief occupe ~60 % de la lanière visible (la proportion relevée sur la
référence de Guillaume) avec quatre à cinq sommets à l'écran.

**⚠️ Les deux échelles ne sont pas la même**, et c'est le piège de ce réglage :
sur une équirectangulaire, 1 px de texture vaut ~4,7 px d'écran en horizontal et
~11,7 en vertical. **Ne jamais juger ces nombres sur la texture.**

**La palette n'a pas bougé d'un bit** — consigne explicite : « ne change pas la
palette relevée ». Seule la géométrie change, et la RÉPARTITION du dégradé de
fond : `mid` tenait jusqu'à 86 % de la hauteur puis basculait sur `horizon` dans
les 36 derniers pixels. Un aplat plus une bascule, ce n'est pas un dégradé.

**Et le rougeoiement devient un vrai dégradé.** Le 400 avait dû le BORNER à la
hauteur du col le plus bas, parce qu'un aplat a un bord et qu'un bord dessine une
forme. Un dégradé qui part de zéro d'opacité n'a pas de bord : il ne peut donc
rien dessiner, et il n'a plus besoin d'être borné. C'est la « lumière évoquée par
dégradé » demandée — et il reste peint ENTRE les deux chaînes, ce qui est le
correctif du 400 et n'a pas bougé.

## 2. Les rambardes — « pas d'aspérités » décrit une SILHOUETTE

Deux causes, et la texture n'est que la seconde.

**La silhouette.** Une seule boîte par intervalle, donc une arête parfaitement
droite sur tout le tronçon. Aucune texture n'y peut rien : un contour droit reste
un contour droit, et un volume long, droit et lisse, l'œil le lit comme une
planche — d'où « boîtes en bois ». Deux familles de saillies, et il faut les
deux : un **couronnement dentelé** (ce qui casse la ligne du haut, celle qu'on
suit du regard en courant) et des **pierres déboîtées** sortant du parement.

**La texture.** 32 px pour deux assises de deux blocs = 14×14 px par pierre : il
n'y a physiquement pas la place d'y mettre un bord éclairé, un bord d'ombre, un
éclat et un grain. Il ne reste qu'un rectangle uni bordé d'un trait, c'est-à-dire
la façon dont on dessine une PLANCHE. Passée à 64 px, trois assises, mortier
creusé sur deux pixels, grain par bloc, éclats de coin.

### ⚠️ LE BUDGET A REFUSÉ LA PREMIÈRE VERSION, ET IL AVAIT RAISON

`smoke-render.js` : **255 objets / 100 u sur la chaussée de pierre, plafond
200.** Son commentaire dit pourquoi mieux que moi — cette section « doit tenir
dans le MÊME plafond que les autres, sans quoi les images par seconde tomberaient
pile sur les premières secondes de course ». C'est-à-dire là où Guillaume regarde
la rambarde.

Relâcher le plafond, c'était rendre le contrôle muet (leçon du 404). **On a donc
changé la chose.** Mesure : la chaussée de pierre était déjà à **195 sur 200**
avant ce zip — il n'y avait pas cinq objets de marge, il fallait en LIBÉRER. Or
quand la rambarde est neuve elle est CONTINUE : rien à l'écran ne distingue un
bloc de 17,6 unités de deux blocs de 8,8 accolés. On en pose donc un sur deux,
deux fois plus long, et on dépense ce qu'on vient d'économiser en pierres qui
dépassent.

**195 avant, 185 après la fusion, 199 avec les saillies.**

### ⚠️ ET J'AI ENFREINT LA RÈGLE DU 381 EN CHEMIN

Les saillies tiraient dans `rng`, le flux du tronçon. Le budget mesuré est passé
de 200 à 209 objets **sans qu'une seule saillie soit ajoutée** : ce n'était pas
le coût des cailloux, c'était le décor entier qui avait changé de tirage — quelles
bordures deviennent des stèles, où tombent les fissures. Un flux dédié
(`rngAsp`), et les mesures redeviennent comparables. *Ne jamais ajouter un tirage
dans un flux aléatoire partagé (381).*

## 3. La pluie — un signe, et une fin

`offset.y` décroissait avec le temps. La règle, pour n'avoir plus jamais à la
refaire : le shader échantillonne `uv + offset` ; quand `offset.y` augmente, un
même point de l'écran lit un texel plus haut, donc le motif DESCEND. Sur un
PlaneGeometry v croît vers le haut et une CanvasTexture a flipY à vrai : les deux
inversions se compensent. **offset.y qui monte = la pluie qui tombe.**

C'est un défaut qu'on ne voit ni en relisant (la ligne est parfaitement écrite),
ni sur une image fixe. **Il faut regarder BOUGER.**

La courbe, choisie par Guillaume : pleine de **2 200 à 3 500 m**, puis extinction
progressive jusqu'à **6 000 m**, et plus rien ensuite. Elle se lit avec deux
autres nombres : la partie moyenne fait 5 018 m (l'orage couvre donc toute la
partie type) et `DAY_PREDAWN_AT` vaut 10 000 (la pluie cesse quatre mille mètres
avant que le ciel pâlisse, ce qui fait de sa fin l'ANNONCE de l'éclaircie).

## 4. Les bras — le piège du 396, jamais appliqué ici

> « PIÈGE DE SIGNE D'ARTICULATION (396) : le genou plie en NÉGATIF et le coude en
> POSITIF, signes opposés. »

Écrit au 396 **pour le labyrinthe**, jamais vérifié sur le défi de fuite — dont
le fermier a pourtant exactement la même construction à deux segments. Les trois
angles de coude étaient négatifs **depuis le zip 374** : les avant-bras se
repliaient comme des tibias.

La géométrie, posée une fois pour toutes : dans `limb2()` le segment inférieur
pend vers -Y ; une rotation de θ autour de +X envoie (0,-1,0) sur
(0, -cos θ, -sin θ), donc **θ positif pousse vers -Z, c'est-à-dire vers l'avant**.
Le genou replie le tibia vers l'arrière (négatif), le coude replie l'avant-bras
vers l'avant (positif).

**⚠️ Pourquoi ça a tenu trente zips : les DEUX bras étaient faux du même côté.**
Une asymétrie saute aux yeux ; une symétrie fausse se lit comme un parti pris.
C'est le mode de panne le plus durable d'une animation.

## Les VINGT-ET-UN outils du défi de fuite

```
node tools/verify-ambiance.mjs   # NEUF (406) : sommets dans le cadre, pluie qui tombe
node tools/verify-pose.mjs       # NEUF (406) : coude positif, genou négatif
node tools/preview-sky.js        # RÉPARÉ (406) : il jetait depuis le 400, et il mentait sur les largeurs
```

### Trois fois où le contrôle avait tort, encore

* `verify-ambiance` situait le rougeoiement par rapport à `SKY_NEAR_H_MIN` avec
  `indexOf` — et trouvait sa première mention, qui est un CALCUL en haut de
  paintSky, pas le DESSIN. Il sonnait sur du code juste. Même famille qu'au 405 ;
* `verify-pose` échappait deux fois ses expressions régulières et déclarait
  « introuvables » trois angles parfaitement présents : **un contrôle qui accuse
  le jeu de sa propre faute**, la pire des sorties ;
* et `RAIL_MERGE` a été inséré au mauvais endroit de config.js : la constante
  n'existait pas, `len` valait **NaN**, et les blocs de rambarde étaient
  construits avec une longueur non finie. Rien n'a levé. C'est le budget mesuré,
  incohérent avec la mesure précédente, qui l'a trahi. *Une constante absente ne
  fait pas d'erreur en JavaScript : elle fait du NaN, et le NaN se propage en
  silence.*

## Ce qui n'a PAS été fait au 406

* **Les pièces qui flottent dans les airs.** Guillaume a mentionné une troisième
  capture qui n'est pas arrivée, et sa phrase se coupe. Sur options, il a choisi
  de reporter — **c'est un chantier du 407**. Ne pas corriger une pente au
  jugé : demander la capture (leçon du 402).
* **Le joystick tactile.** Quatorzième zip. La forme est désormais ARRÊTÉE par
  Guillaume, et elle n'est plus la même pour les deux jeux :
  * **défi de fuite** — les commandes de Temple Run : des BALAYAGES. Gauche/droite
    pour changer de voie, haut pour sauter, bas pour glisser. Pas de joystick.
  * **labyrinthe** — un joystick pour se déplacer, le balayage pour tourner la
    caméra (« pas trop vite »), et **taper sur l'ennemi pour le frapper**.
* **Regarder le ciel corrigé DANS LE JEU.** `preview-sky.js` montre le cadrage,
  pas la course : ni brouillard, ni lac, ni torches, ni jetée. La preuve du 406
  est géométrique et graphique en planche, **pas une capture d'écran.**

---

# ZIP 407 — LA PLUIE, REFAITE SUR QUATRE REPROCHES

Le 406 avait redressé le sens de la pluie et lui avait donné une fin. Guillaume
a joué, et les quatre phrases suivantes disent que ça ne suffisait pas :

> « la pluie n'est pas satisfaisante. la réduire en intensité — et elle ne
> disparaît pas comme convenu ?? on a dit disparition progressive à partir de
> 3000 m. et son étendue ne couvre pas tout l'écran ; et le sens du vent que son
> orientation oblique évoque est incohérent, car lorsqu'on tourne, les gouttes
> tombent toujours direction NO-SE. »

**Trois des quatre causes sont des nombres posés à la main là où il fallait un
calcul.** C'est le motif de ce zip, et il vaut au-delà de la pluie.

## 1. L'intensité — et la réponse hors options

Trois intensités lui étaient proposées. Il a répondu à côté des trois :
**« un crachin, mais la vitesse de chute des gouttes doit être bien plus
rapide »** — et c'est meilleur que les trois, pour une raison qui n'était dans
aucune : **ce n'est pas l'opacité qui dit « il pleut », c'est la vitesse.** Une
goutte pâle et lente se lit comme du bruit d'image ; une goutte pâle et rapide
se lit comme de la pluie.

L'opacité tombe donc de 0,55 à **0,18**, et la chute passe de « 1,35 » — un
coefficient de défilement de texture, c'est-à-dire un nombre qui ne veut rien
dire tant qu'on ne connaît ni la taille de la nappe ni sa répétition — à
**32 unités par seconde**, une vraie vitesse, qui se compare aux 34 u/s de la
course. Et les traînées s'allongent dans la même proportion : ce qui dit la
vitesse à l'œil, c'est le FILÉ.

**Conséquence de bord, et elle était fausse depuis le 400 :** les trois nappes
avaient chacune leur facteur `sp`, donc trois vitesses sans rapport entre elles,
et des répétitions choisies à la main qui rendaient les gouttes du FOND plus
grosses que celles du premier plan — l'inverse de la perspective. Elles tombent
maintenant à la même vitesse dans le monde, avec des tuiles de la même taille
réelle : la parallaxe vient de la distance, comme dans la vraie vie.

## 2. La décrue commençait à 3 500

Sa demande d'origine disait « de 3 000 à 5 000 ». L'option qu'il avait cochée au
406 disait 3 500 → 6 000. Il revient à sa demande d'origine.

> **Quand il rappelle un nombre qu'il avait donné en clair, c'est celui-là.**

Pleine de 2 200 à **3 000**, éteinte à **5 000**. La partie moyenne fait
5 018 m : l'averse finit donc pile où la course type se termine.

## 3. L'étendue — le quart bas de l'image n'avait pas de pluie

Les trois nappes étaient posées à `camera.position.y + 1,6` avec des tailles
écrites à la main (22×15, 40×24, 66×38). Or **la caméra regarde vers le bas de
17,3°** avec un demi-champ vertical de 36° : le bord bas de l'écran est donc à
−53,3° sous l'horizontale, quand une nappe posée 1,6 au-dessus de la caméra ne
descend qu'à −47°.

| nappe | manquait en bas |
|---|---|
| proche (d = 5,5) | **6,3°** |
| médiane (d = 12) | **12,4°** |
| lointaine (d = 22) | **14,9°** |

C'est tout le quart bas de l'image — celui où se trouve la chaussée,
c'est-à-dire celui qu'on regarde en courant.

**Les six nombres sont remplacés par une règle** : à la distance d, le tronc de
vue occupe de `d·tan(tangage − demi-champ)` à `d·tan(tangage + demi-champ)`. On
dimensionne et on CENTRE là-dessus, avec 12 % de marge pour les écrans plus
larges que le 16/9. Le jour où quelqu'un touche au tangage ou au champ, les
nappes suivent toutes seules. Marge obtenue : 2,0° en bas, 3,1° sur les côtés.

## 4. Le vent qui tourne avec le joueur

Trois choses donnaient une direction à la pluie, et il fallait les retirer
toutes les trois :

* **l'obliquité peinte dans la texture** (`x0 + ((k / 4) | 0)`, soit ~14°). La
  nappe faisant face à la caméra, cette inclinaison était fixe à l'ÉCRAN : le
  vent tournait donc avec le joueur. C'est très exactement « les gouttes tombent
  toujours direction NO-SE » ;
* **la dérive latérale** de `offset.x`, qui ajoutait un souffle constant ;
* **`lookAt(camera.position)`**, qui inclinait la nappe vers la caméra et faisait
  donc tomber les gouttes le long de l'AXE DE VUE — 17,3° de travers par rapport
  aux murs et à la chaussée. Sans le retirer, « la pluie tombe droit » aurait
  voulu dire « droit à l'écran ». La nappe ne pivote plus qu'en **lacet**.

Guillaume a tranché : **pas de vent.** Une traînée parfaitement verticale
n'évoque aucune direction, donc n'en contredit aucune.

## Le contrôle

`verify-ambiance.mjs` passe de 19 à **31 contrôles**, dont **12 échouaient sur
le 406**. Le plus utile refait la projection de la caméra et vérifie que chaque
nappe couvre le tronc de vue — un contrôle qu'on ne POUVAIT PAS écrire tant que
les tailles étaient des nombres posés à la main : il n'y avait rien à comparer.

> **⚠️ Et il a fallu le corriger une fois de plus.** La boucle de couverture
> parcourait `CFG.RAIN_LAYER_D` — qui n'existe pas sur le 406. La boucle ne
> tournait donc pas, `allOk` restait vrai, et le contrôle **passait** sur du code
> où la pluie ne couvre justement pas l'écran. **Un contrôle qui parcourt une
> liste doit exiger que la liste existe** : c'est la version « boucle » du
> contrôle muet du 404.

`simulate-run.js` rend exactement les mêmes chiffres qu'au 399 : 5 018 m,
137,4 pièces, 0,03 trébuchement, mort passive à 14,6 s.

## Ce qui n'a PAS été fait au 407

* **Les pièces qui flottent dans les airs.** Toujours en attente de la capture
  qui n'est jamais arrivée. Ne pas corriger une pente au jugé (leçon du 402).
* **Le joystick tactile.** Quinzième zip. Trois chantiers distincts, forme
  arrêtée par Guillaume au 406 : balayages pour le défi de fuite, joystick +
  balayage caméra + tap sur l'ennemi pour le labyrinthe, et la demande d'origine
  du 387 pour la ferme.
* **Regarder la pluie tourner.** Aucun outil ne rend une image animée : la preuve
  du 407 est géométrique. **Un défaut de mouvement ne se voit qu'en jouant** —
  c'est ce qui a fait vivre le sens inversé jusqu'au 406.
