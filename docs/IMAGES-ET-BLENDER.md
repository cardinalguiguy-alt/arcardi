# IMAGES, BLENDER ET BITMAPS (§8, §9, §11 + notes d'intégration)

> **Extrait SANS MODIFICATION de `CLAUDE.md` le 2026-10-03** (allègement du noyau : le contexte fixe passe de ~47 k à ~8 k tokens, estimés).
> Les numéros de § sont CONSERVÉS : tout « §N » cité dans le code, les README et les bancs reste valable (table dans `CLAUDE.md`).
> Ce fichier se lit À LA DEMANDE (voir le routeur de `CLAUDE.md`), jamais en bloc par défaut. Commencer par « Notes qui restent vraies » pour toute intégration d'image (mesurer porte ET cadrage).

---

### Notes qui restent vraies d'une reprise à l'autre (commerces, intégration d'images)

**⏳ PROMPT GEMINI EN ATTENTE (2026-10-05) — LE CHALET DES PATINS DU LAC.** Le chalet en jeu est PROCÉDURAL et provisoire
(`townSkateChaletSprite`, fermeArt.js ; planche `tools/out/chalet-patins.png`, ouvert à gauche, fermé à droite). Images de référence à
joindre : `tools/out/chalet-patins.png` (la composition et l'emprise), `refs/boutique-garfield.jpg` (le niveau de finition accepté). Il en
faut DEUX états (ouvert l'hiver, volets clos le reste de l'année), même cadre au pixel près — même règle que les lampadaires. À coller :
> *A small, very elegant covered winter kiosk for renting and selling ice skates, for a cozy top-down 3/4 pixel-art farming game (same
> style and light as the reference shop: light from the upper left, soft blue-tinted shadows). Footprint 4 tiles wide by 2 tiles deep
> (wide rectangle), seen from slightly above. Forest-green painted wood boarding with cream trim, a slate-shingle roof with a small
> central gable carrying a gold skate emblem (NO lettering, no text anywhere), a wide serving counter under a scalloped burgundy-and-cream
> striped valance, white figure skates hanging on a rail inside the warmly lit window, a fir garland with red bows and warm bulbs along
> the eaves, a black lantern on each front corner post, a stone plinth. Second image, exact same framing: same kiosk closed for the season —
> green wooden shutters over the counter, valance rolled up, no garland, lanterns unlit. Plain flat magenta background (#FF00FF), no ground,
> no shadow beyond the building's own contact shadow.*
L'intégration suit la règle des bitmaps (§9) : regardé à l'écran le jour même, sous la neige (les toits peints ont leur calque,
`tools/build-snow-roofs.mjs`), et la nuit (les lanternes et la vitrine s'allument par `tools/lib-glow.mjs`, comme la Maison Garfield).

**⚠️ PRIORITÉ DE DOCUMENTATION, PAS À FAIRE TOUT DE SUITE — LES COMMERCES DE LA GRAND-RUE (décidé avec lui le
2026-09-29) : LE CAFÉ « CHEZ JULIETTE » ET LE RESTAURANT.** Il faut être PRÊT : une séance de conception à part (§2 :
LISTER les décisions structurantes et ATTENDRE). Le café : un intérieur « superbe, cosy, bobo » où l'on vend des
BOISSONS en tout genre ; **le rôle de barman ou de vendeur doit être accessible aux joueurs SANS CASSER LA
MÉCANIQUE** (toute vente passe par une `req` arbitrée par l'hôte, comme le marché : la porte n'est jamais la caisse,
§4) ; **un lieu de rencontre entre résidents et un lieu de développement narratif** pour de futures missions ou
quêtes. Le restaurant : même principe. À décider : la fonction de chaque lieu, quel bâtiment est converti
(`TOWN_SHOP_MODELS` a `garfield` et `salon`), l'intérieur (la phase 8 : les sols d'intérieur existent pour le
tribunal, la mairie, l'église), la carte des boissons et ses prix, le rôle du joueur (état dans `ferme_saves`, aucune
migration SQL sans validation), et un prompt Gemini avec références pour l'intérieur (jamais un appel
automatique). Ligne 15 du tableau des phases de `components/ferme/README.md`.
**La planche 3** : branchée ; il reste la boîte aux lettres en tôle à drapeau (non tranchée : elle lit
américaine ; les trois modèles sont en jeu) et les deux bancs écartés (« les bancs du jeu sont très bien »).
`tools/import-planche3.mjs` se relance en une commande (les JPG restent dans `refs/`).
Intégrer au fil de l'eau ses images si elles tombent dans `refs/`.
⚠️ **Avant d'intégrer une image, mesurer sa porte en H ET son cadrage** : la ligne du prompt ne garantit
rien, et une retouche de Gemini peut décaler le dessin dans son fichier (`at`, mesuré par recouvrement
des silhouettes avec le fond propre à CHAQUE image — leurs magentas diffèrent). Chaque modèle : porte,
VANTAIL (`doorH`), pied (dernière rangée de plinthe au-dessus du trait sombre : 948 chez S1, 937 chez
S2), mur, vitres (verre + 2 px de chaque côté ; lanterne = son verre seul ; vitrine = `show`) →
`TOWN_HOUSE_MODELS` / `TOWN_SHOP_MODELS` → `build-maison-sprites` → planche → jeu ; chaque modèle couvre
≥ 30 % de chaque case de sa largeur (`verify-vallee`). Une porte qui ne tombe pas dans une largeur
existante ne s'y force pas : elle a sa largeur (comme S2). Le cheval de bataille reste : lui faire JOUER
phases 1-5, météo, 6c, 6a, 10 et les commerces en vraie séance.
⚠️ Dette laissée : les dix façades procédurales (`townHouseVariant`, `S.townHouses`), `S.townBoutique` et
`S.townSalon` sont encore fabriquées au chargement sans plus être dessinées — `verify-lumiere` lit les
fenêtres des premières, `render-echelle`/`render-tribunal` mesurent les deux autres ; les retirer demande
de réécrire ces sections de banc.
⚠️ **NETTETÉ — ce qui est posé au pixel d'écran et ce qui ne l'est pas** (verdict de Guillaume, 2026-10-04 : « la netteté des maisons est super, mais les sols et les objets de jardin ne sont pas assez
détaillés »). Au pixel d'écran : maisons, commerces, monuments, lampadaires (`townBitmapMip`, `TOWN_LAMP_BITMAPS`). À la grille des pixels d'art : les sols (tuiles de 64 px) et tous les autres objets
des planches 1 à 3 (`planche*.js`). **LEÇON : une image haute résolution qu'on ramène à la grille du jeu devient floue à côté des maisons — mais une image qui est DÉJÀ un pixel art à gros blocs
(les planches 1 à 3, 8 à 12 px image par pixel de jeu) ne s'améliore PAS par un meilleur rééchantillonnage : il faut la repeindre.** Avant de proposer « le même procédé que les lampadaires »,
ouvrir la planche source et regarder si elle contient le détail. Chantier : `refs/lot-gemini/` (A sols, C0 objets de jardin).
⚠️ Le jour où un nouveau sprite bitmap arrive, mesurer son sprite AVANT de poser sa collision, et
vérifier tout bornage sur les DEUX axes séparément (§4).


## 8. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE** : au 421 la luminosité
moyenne était juste et l'image fausse — **pas un pixel sous L60**, donc aucune ombre. Il faut
un **écart**, pas un décalage. (Référence : L 180,6 / **écart-type 47,7** / saturation 27,8 % /
2,1 % sous L60.)

⚠️⚠️⚠️ **QUAND UNE PRISE DEMANDE UN SEUIL, C'EST SOUVENT QU'ON N'A PAS TROUVÉ LA BONNE PRISE**
(2026-09-02, quatre mesures refusées en deux lots). Pour vérifier qu'un chapeau ne bouge pas d'une
pose à l'autre, deux écritures ont échoué sur un dessin JUSTE : « les rangées du haut » attrapait la
pointe de l'étoile, qui change de longueur exprès ; « les pixels sombres du haut » attrapait le
cerne de cette même pointe. La prise juste ne demandait aucun seuil — **une DIFFÉRENCE** entre le
sprite nu et le sprite déguisé, dont le reste EST le déguisement, par construction. Même famille sur
l'anneau du réveil, où « le pixel peint le plus loin du centre » mesurait la couronne des battements
et non l'anneau. ⚠️ **Corollaire de fond : le fond d'une mesure de COUVERTURE n'est pas le fond
d'une mesure de COULEUR** — sur le vert pur qui sert à compter les pixels peints, les bords
semi-transparents se mélangent au fond, et deux étoiles chaudes ressortent « plus vertes que
rouges ».

⚠️⚠️⚠️ **ET UNE MESURE QUI CONFOND DEUX PROPRIÉTÉS VALIDE LE DÉFAUT QU'ELLE CHERCHE** (2026-09-02).
Pour prouver qu'une réussite et un raté ne se ressemblent pas, on a d'abord mesuré la « chaleur »
(rouge moins bleu) des deux images : **le raté est sorti plus CHAUD que la réussite**, parce que son
anneau est ROUGE et qu'un rouge a lui aussi du rouge en excès. La mesure aurait donc validé un
dessin où les deux retours se confondent — c'est-à-dire le seul défaut qui comptait. *Avant de
mesurer, il faut nommer ce qui SÉPARE vraiment les deux cas* : ici le rouge FRANC (rouge moins
**vert**), que rien d'autre dans ce dessin ne porte. Même famille que l'écart-type ci-dessus : une
statistique juste sur une grandeur mal choisie est une statistique fausse. ⚠️ **REPAYÉE LE
2026-09-03**, sur l'étoile verte : pour prouver qu'elle ne se confond pas avec une étoile ÉTEINTE,
la LUMINANCE ne dit rien (196 contre 176 — le cœur de l'état éteint est un gris très pâle) ; ce qui
les sépare est le vert FRANC (94 contre 12). Deux fois de suite, la grandeur évidente était la
mauvaise.

⚠️⚠️ **LA LEÇON LA PLUS COÛTEUSE, ET ELLE EST GÉNÉRALE : un paramètre qui DOUBLE un autre
paramètre est une divergence en attente. Il doit être DÉRIVÉ, jamais réglé.**
En place : `Slope.finishSAt()`, `Slope.cpEvery()`, `Models.fit()`, `trailTint()`,
`COURT_STAIRWELLS`, la couleur des étals.

⚠️ **Fausses pistes MESURÉES, ne pas les refaire :** monter le dégradé du ciel de crystal ·
doubler `BLOOM_H`/`BLOOM_K` (**ne pas y toucher**) · compenser le linéaire en montant les
intensités « au jugé » (soleil à 2,45 → image **entièrement blanche** ; repère : neige au
soleil ≈ **1,15 linéaire**, à l'ombre ≈ **0,40**) · peindre des veines cyan sur la piste rose
(le mélange passe par le **gris** ; la sortie est dans la VALEUR) · deux couleurs réglées à
l'œil côte à côte ne gardent pas leur écart une fois le rendu passé en linéaire.

**Côté `crystal`, NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js` ; `corniche`
et `pont` sont **bit à bit identiques** au 419.

---

## 9. Blender — cinq pièges, et un endroit où il ne paie pas

⚠️⚠️⚠️ **LE 443 A LEVÉ UN INTERDIT DE PRINCIPE : UN ASSET BITMAP EST DÉSORMAIS AUTORISÉ**
(décision de Guillaume). Jusqu'ici « aucune image dans le jeu » était une **règle** ; c'est
maintenant un **défaut**. Un décor complexe — typiquement un intérieur isométrique — peut être
modélisé sous Blender et intégré en **PNG / feuille de sprites** quand c'est le moyen le plus
pertinent d'obtenir le résultat visé.
⚠️ **Ce n'est ni une norme ni un passage obligé.** Le canevas procédural de `fermeArt.js` reste
la voie par défaut partout ailleurs et n'est pas en sursis : les deux approches **coexistent**,
l'arbitrage se fait **au cas par cas**, module par module, contre le §0 (est-ce que ça rend le
jeu plus fini ?) et non contre une doctrine.
⚠️⚠️⚠️ **LE PIPELINE C A EU SON PREMIER USAGE AU 480, ET IL A ÉCHOUÉ — C'EST LA LEÇON LA PLUS
CHÈRE DU 481.** Le bureau du maire a été bloqué sous Blender et exporté en glTF ; le fichier est
arrivé dans le dépôt avec ses nœuds `rig_*` doublement décalés, il a été chargé par le jeu, décrit
sur deux lignes de documentation, et **jamais ouvert dans un canevas pendant un zip entier**. Le
maire flottait deux mètres derrière le mur du fond. **Aucun outil du dépôt ne pouvait le dire** :
un glTF est de la DONNÉE, `verify-syntax` lit du JavaScript, le bundle lit des imports, et les
bancs de rendu appellent du CODE. Le bureau est aujourd'hui procédural (`maireBureau.js`).
⚠️ **CE QU'IL FAUT EN RETENIR AVANT LE PROCHAIN IMPORT** : le §9 disait qu'un asset importé
« vieillit » ; il peut aussi **naître faux**, et c'est pire, parce qu'on croit avoir livré. *Un
asset importé se REGARDE le jour de sa livraison, dans le jeu, ou il n'est pas livré.* Le
chargeur, le cache, la convention de nommage et le banc que le premier usage devait poser n'ont
jamais été posés — le chantier reste donc entier.

⚠️ **Ce que le basculement ne change PAS, et qu'il faut lire avant d'ouvrir Blender :** les
raisons TECHNIQUES du choix procédural restent vraies et se paient toujours — un bitmap apporte
un chargement, un cache, une palette hors-fichier, une échelle à tenir, et **il sort du champ
des bancs de rendu** (`tools/render-*.mjs` appellent du code, ils ne relisent pas un PNG : un
asset importé ne se dégrade pas, il **vieillit**, exactement comme le §« il fait vieillir » de
l'en-tête). ⚠️ Et il reste **irrecevable là où le dessin doit être bilingue ou vivant** (§4 :
un texte cuit dans une image ne peut pas être traduit au rendu). Le prix n'a pas disparu ; il
est simplement devenu **payable** quand le résultat le vaut.

BlenderMCP est installé (Blender 5.2 LTS) et **répond**. Trois pipelines : **A** vers `crystal`
(on modélise, on rend, on **transcrit en table de données** — pas d'image dans `crystal`, dont
le tampon 480×270 n'en affiche aucune ; ombrage plat pur, **aucun** anticrénelage, quantification
LINÉAIRE, courbe `Standard`, lampes Soleil) ; **B** vers les jeux three.js en glTF
(`candyluge_props.py`, hors dépôt, export sans matériaux, maillages `part_<clé>`, 200-900
triangles) ; **C, ouvert au 443** — rendu Blender → **PNG / feuille de sprites** chargé par le
jeu. ⚠️ **C a eu son premier usage le 2026-09-02 — pas depuis Blender, depuis Gemini** (l'hôtel de
ville de Valley Town, voir le bloc ⏭️ REPRISE en tête de fichier) : le chargeur/cache existent
maintenant (`components/ferme/bitmapAssets.js`), la source de l'image importe moins que le fait
qu'elle soit un PNG avec vraie transparence.
⚠️⚠️ **DEPUIS LE 2026-09-25, UN MONUMENT PEINT N'EST PLUS UNE IMAGE MAIS UNE PAR CRAN DE ZOOM**
(`public/town/<bâtiment>-day-z<N>.png` / `-glow-z<N>.png`), fabriquée hors ligne depuis la référence à
sa taille d'écran exacte (`tools/lib-mip.mjs`) et posée à 1 px d'image = 1 px d'écran, sans lissage.
Tout bitmap se déclare dans `TOWN_BITMAPS` (fermeConstants.js). ⚠️ **La leçon qui l'a imposé** :
*une peinture ramenée à la grille d'art perd du vrai détail ; une peinture agrandie ou réduite au
dessin, lissée ou non, est floue ou a des pixels doublés* — la seule pose sans perte est 1:1 à
l'écran. ⚠️ **Le prix, accepté par Guillaume** (« pas de perte de qualité ») : le monument reste plus
FIN que le décor en gros pixels. ⚠️ **Un PNG importé peut avoir été retouché À LA MAIN après son
script** (le tribunal l'était : une colonne de damier gommée) — regénérer depuis la référence sans
comparer d'abord au fichier versionné efface la retouche en silence.
⚠️ **Détourer un damier peint (Gemini) : par la couleur PRÉVUE à cet endroit, jamais par la couleur
seule ni par un test local** (tribunal, 2026-09-25). « Neutre et clair » mange la pierre claire ; « alterne
avec son voisin à ±1 case » la mange aussi dès qu'elle touche une case sombre. La grille est régulière,
donc chaque pixel a UNE couleur de fond attendue — mais la PARITÉ se lit case par case (Gemini peint des
coutures). Méthode dans `tools/build-tribunal-sprite.mjs`.
⚠️ **UNE IMAGE DE JOUR DONT UN SCRIPT A ÉTEINT DES PIXELS NE SE RELIT PAS SEULE** (2026-09-25) : les
scripts de l'église et de la mairie grisent dans le JOUR les vitres qu'ils mettent dans la NUIT — la
vraie couleur de ces pixels n'est plus que dans le calque de nuit. Relire le jour seul donnait des
carrés gris au milieu des vitraux. Chaîne : `build-eglise-sprite` / `build-townhall-sprite`, PUIS
`build-monument-glow` (qui lit les images de jour versionnées, donc garde toute retouche à la main).
⚠️ **`verify-densite` tient les TAILLES et la DENSITÉ des bitmaps, pas leur ASPECT** : un PNG importé
se regarde toujours dans le jeu (§10), jamais par un `tools/render-*.mjs`.

⚠️ **BLENDER EST Z-UP, THREE.JS Y-UP, ET L'EXPORTEUR CONVERTIT FIDÈLEMENT UNE ORIENTATION
FAUSSE** (`yup_authoring()`).
⚠️ **L'export glTF EXIGE un contexte** (`temp_override(…, area=VIEW_3D, region)`) **et de
désélectionner** — sinon échec au **deuxième** accessoire seulement.
⚠️ **L'échelle se DÉRIVE du gabarit** (`Models.fit`), jamais devinée dans l'appelant.
⚠️⚠️ **À 32 px, ce qu'on achète avec Blender est l'ÉCLAIRAGE, PAS LA GÉOMÉTRIE** — et cet
éclairage demande la même passe de calibrage que §8. Mesuré au 426 sur la statue de la Justice :
le pipeline fonctionne, mais après deux passes le rendu restait à **écart-type 24,6** contre
47,7 en référence. Le sprite dessiné à la main était meilleur. Compter plusieurs itérations, ou
dessiner à la main.
⚠️ **Tous les sprites de la ferme, de Valley Town et du tribunal sont, à ce jour, des canevas
procéduraux** dans `fermeArt.js` — c'est un **état**, plus une règle depuis le 443. Le coût d'y
introduire un bitmap est celui décrit en tête de chapitre ; il se juge contre le gain visuel du
décor visé, et **le mesurer d'abord reste la méthode** (§8) : un rendu Blender non calibré perd
encore contre un sprite dessiné à la main.


## 11. Modes 3D autonomes

`templerun` et `labyrinth` chargent encore **r128 depuis cdnjs sans `integrity`**.
`candyluge` est passé au **local** au 422. `candyland` est du canvas 2D pur.

⚠️ **UNE MIGRATION VERS UN THREE.JS MODERNE N'EST PAS UN PRÉALABLE** aux glTF ni au
post-traitement : r128 expédie elle-même `GLTFLoader`, `EffectComposer`, `UnrealBloomPass` et
`ShaderPass`, seulement absents du miroir cdnjs (copiés depuis npm `three@0.128.0` : **zéro
déplacement de teinte**). ⚠️ **Le vrai obstacle n'est pas colorimétrique** :
`labyrinth/js/world.js:370-382` recopie l'atténuation r128 `(1 − d/portée)^decay` pour classer
les lumières ; cette formule disparaît vers r155 et le classement continuera de tourner **sans
erreur** en choisissant mal.
