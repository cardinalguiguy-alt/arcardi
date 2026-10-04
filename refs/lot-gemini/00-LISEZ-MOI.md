# LOT GEMINI — Arcardi (VT = Valley Town, VF = la ferme) — préparé le 2026-10-03

Rien ici ne touche au jeu. Chaque famille d'images s'intègre ensuite UNE par UNE (méthode des maisons : mesurer, fabriquer
une image par cran de zoom, poser à 1 px d'image = 1 px d'écran, juger EN JEU avant la suivante).

| Fichier | Contenu | Images | Priorité |
|---|---|---|---|
| `A-sols-vt.md` | pavements, goudron, herbe, gravier, terre de Valley Town (+ bordures, rosace, ponton, anti-répétition) | 14 + 8 images | **P1** |
| `B-arbres.md` | arbres de VT ET de la ferme : été, printemps, automne, MI-CHUTE, NU ; feuilles tombantes | 7 espèces × 5 états + 14 | **P1** (nu, mi-chute, automne d'abord ; chêne, érable, bouleau en premier) |
| `C-objets-vt.md` § **C0** | **les objets de jardin et de place DÉJÀ en jeu, à repeindre** (planche 3 : bûches, linge, boîtes aux lettres, brouette, tonneau, table, bain d'oiseaux, pots, balançoire, clapier, jardinières, vases, ronces, grille) | 6 feuilles | **P1** |
| `C-objets-vt.md` (reste) | marché, fontaine, mobilier, terrasse, herbes hautes, massifs, roseaux, arbustes, pierres, quai | ~34 images | P2 |
| `D-batiments-vt.md` | maisons larges (renvoie à `refs/prompts-maisons.md`), gare, café, restaurant, intérieurs | 9 images + séance de conception | P3 |
| `E-ferme-vf.md` | chêne de la ferme en 5 états (P1), cultures, vergers, icônes (pixel art) | ~15 planches | P3 (arbres : P1) |

**Dans ce dossier, déjà prêts** : `sols-ref/` (les 9 tuiles de sol de VT du jeu, agrandies, en 1 × 1 et 2 × 2) `arbres-ref/` (les 15
essences × 3 saisons du jeu, une image par arbre, 768 × 1024) et `objets-ref/` (six découpes propres de la planche 3 pour C0 : objets séparés, fond magenta). Générés depuis le code du jeu par un script jetable : je peux les régénérer.
**À créer par vous** : `captures/` (§2 ci-dessous), puis un dossier par famille (`sols/`, `arbres/<espèce>/`, `objets/`, `ferme/`).

⚠️ **Verdicts de vous (2026-10-04) qui priment sur tout le reste** : (1) « la netteté des maisons est super, mais **les sols et les objets de jardin ne sont pas assez détaillés** » → A (sols) et
**C0 (objets de jardin)** ; (2) **les arbres dégarnis d'automne** ne sont pas au niveau → B. Le défaut des arbres n'est pas la couleur : l'arbre « se ronge » au lieu de se dénuder. La parade de B : trois
images du MÊME arbre (feuillu d'automne / à moitié dégarni / nu) qui partagent le même squelette au pixel près ; le jeu les fond par bouquets, et la forme ne change jamais — seules les feuilles partent.
Le réseau de rues et de chemins est BON : rien ici ne touche au tracé.

---

## 1. Règles communes (valables pour TOUS les prompts)

1. **Une conversation Gemini neuve par famille** (par espèce d'arbre, par revêtement, par planche d'objets). Joindre les
   références DANS L'ORDRE indiqué, coller le prompt MAÎTRE de la famille, puis la ligne propre à l'objet **dans le même
   message** (le maître finit toujours par un « … : » qui attend la ligne).
2. **Plus haute résolution proposée.** Aucun agrandissement par un autre outil (il invente du détail, et je mesure le
   cadrage) : si l'image sort petite, relancer.
3. **3 à 4 tirages par image ; garder les 2 meilleurs** (`-a`, `-b`). Vous avez de l'usage : la variété coûte moins que
   la reprise d'une image moyenne.
4. **Ne retouchez rien à la main** (ni recadrage, ni couleur, ni nettoyage) : je mesure le cadrage et le fond. Rendez le
   fichier tel que Gemini l'a livré (JPG accepté, PNG mieux).
5. **Fonds** : tout OBJET (arbre, étal, mobilier) sur **magenta #FF00FF** uni — c'est le détourage des maisons. Toute TUILE
   de sol : plein cadre, pas de fond.
6. **Style commun** : « pixel art détaillé et peint » comme les maisons — pas une photo, pas un aplat vectoriel. Chaque
   prompt le dit ; si Gemini dérive vers la photo ou le dessin lisse, renvoyer : `Same image, but painted with the same
   crisp painted pixel-art finesse as the attached house image: visible small-scale brush texture, sharp edges, controlled
   rich colour. Not a photograph, not a smooth vector illustration.`
7. **Aucun texte, aucune lettre, aucun logo** nulle part (les enseignes restent vierges). **Aucune ombre portée** au sol
   (le jeu pose les siennes, et celles du soleil bougent) ; seul un très léger ombrage de relief côté nord-ouest.
8. **Lumière** : de jour, depuis le HAUT GAUCHE, neutre. Jamais de nuit, de pluie, de neige : le jeu les ajoute (la pluie
   et la neige sont dérivées de vos images ; elles ne se peignent pas).
9. **Vue** : VT = « élévation de face avec un léger basculement vers le haut » pour tout ce qui se dresse (maisons, arbres,
   mobilier) ; strictement « du dessus » pour tout ce qui est au sol. Si Gemini sort un objet de trois quarts :
   `Same object, but strictly from the front like the references: no side face, no corner, no perspective.`
10. **Quand une famille est finie** : dites-moi simplement « famille X faite » et les noms de fichiers. Je mesure, je fabrique,
    j'intègre, je vous dis ce qui cloche. Une famille à la fois.

## 2. Captures d'écran à prendre dans le jeu (menu dev « Météo et saison » pour la saison et l'heure)

Zoom MAXIMUM (cran 5), interface masquée si possible (sinon cadrer au centre : je recadre), **midi**, ciel dégagé, pas de
joueur ni de résident dans le cadre sauf mention. Format PNG, dossier `refs/lot-gemini/captures/`. Elles servent de
références pour Gemini (l'échelle et la caméra réelles du jeu) et pour moi (mesurer).

| Nom | Quoi | Saison | Sert à |
|---|---|---|---|
| `cap-vt-01-rue-maison.png` | une rue de goudron avec sa bordure et son trottoir, **une maison peinte entière à gauche** (S1 si possible) | été | A (netteté du sol à côté d'une maison) |
| `cap-vt-02-place-civique.png` | le dallage civique devant le tribunal ou la mairie, fontaine si elle tient | été | A, C |
| `cap-vt-03-marche.png` | les pavés en éventail et au moins deux étals, **un personnage au pied d'un étal pour l'échelle** | été | A, C |
| `cap-vt-04-terrasse.png` | dallage de terrasse (Haute-Ville, belvédère ou quai) | été | A |
| `cap-vt-05-parc.png` | pelouse + sentier de gravier + un massif fleuri | été | A, C |
| `cap-vt-06-rive.png` | berge, roseaux, un pont ou ponton, l'eau | été | A, C |
| `cap-vt-07-arbres-ete.png` | chêne, érable, bouleau **côte à côte**, un personnage devant l'un | été | B |
| `cap-vt-08-arbres-automne.png` | les mêmes arbres, feuillage d'automne plein | automne (début) | B |
| `cap-vt-09-arbres-michute.png` | les mêmes en pleine chute — **ne PAS joindre à Gemini : c'est le contre-exemple, pour moi** | automne (fin) | B (mon analyse) |
| `cap-vt-10-verger-parc.png` | pommier, cerisier, magnolia | printemps | B |
| `cap-vt-11-grande-rue.png` | la Grand-Rue, un commerce en façade avec son trottoir | été | D (café, restaurant) |
| `cap-vt-12-jardin.png` | un jardin de maison tel que le jeu le montre : boîte aux lettres, tas de bois, brouette, tonneau, table, clapier… (**le niveau de détail actuel**, pour moi et pour Gemini) | été | C0 |
| `cap-vf-01-ferme-large.png` | vue large de la ferme | été | E |
| `cap-vf-02-champs.png` | des champs avec le plus de cultures et de stades possible | été | E |
| `cap-vf-03-arbres-ferme-{ete,automne,michute,hiver}.png` | les chênes et pins de la ferme, quatre saisons (4 fichiers) | — | B, E |
| `cap-vf-04-batiments.png` | maison, grange, moulin, puits | été | E |
| `cap-vf-05-verger.png` | un verger (citronnier ou fraisiers, si vous en avez de plantés) | été | E |

## 3. Nommage et rangement

`refs/lot-gemini/<famille>/<famille>-<objet>-<état>[-a|-b].png` — minuscules, sans accent, tirets.
Exemples : `sols/sol-goudron-v1-a.png` · `arbres/arbre-chene-automne-a.png` · `arbres/arbre-chene-nu-a.png` ·
`objets/objet-etal-poissonnier-a.png` · `ferme/ferme-culture-ble-stade3-a.png`.
Les images d'un MÊME arbre vont ensemble dans `arbres/<espèce>/` avec le MÊME préfixe : je compare leur squelette.

## 4. Ce que je ferai à chaque retour

Mesurer (taille, bouclage des tuiles, écart de teinte avec l'actuel, cadrage, squelette identique d'un état à l'autre pour
les arbres), fabriquer les crans de zoom, brancher derrière un interrupteur de repli (l'ancien dessin reste le repli),
relancer les bancs (`verify-densite`, `verify-vallee`, `render-rues`, `render-arbres`…), **regarder en jeu**, puis rendre
compte avec ce que je n'ai PAS vu. Rien n'est commité sans vous.

## 5. Décisions que je n'ai pas prises (à trancher avec moi, jamais devinées)

1. **La ferme reste-t-elle en pixel art (grain de 16 px) ou passe-t-elle à l'image peinte « au pixel d'écran » comme VT ?**
   `E-ferme-vf.md` suppose le pixel art (c'est ce que le jeu fait aujourd'hui, et mélanger sol peint et sprites pixel dans
   la même scène se verrait). Si vous choisissez le peint, seul le prompt MAÎTRE change (un second est fourni).
2. **Les intérieurs (phase 8)** : vue de dessus ou trois quarts, pièces peintes ou assemblées, pièce pilote, qui entre.
   Aucun prompt tant que ce n'est pas décidé (voir `D-batiments-vt.md`, fin).
3. **Café « Chez Juliette » et restaurant** : fonction, bâtiment converti, carte, rôle du joueur — séance de conception.
4. **Les tailles d'arbres** (jeune / court / grand / grand saule) : je dérive depuis l'adulte peint par changement d'échelle ;
   si cela ne tient pas à l'œil, je demanderai des images propres — après avoir vu.
5. **L'herbe** : repeinte comme tuile pleine, avec les plaques (sec / luxuriant) dérivées par teinte — ou trois tuiles
   peintes. `A-sols-vt.md` demande les trois, vous garderez ce que je saurai fondre.
6. **Sols : images Gemini, PROCÉDURAL, ou panaché** (voir `A-sols-vt.md`, « Option procédurale ») — prototype proposé sur le dallage civique, comparé côte à côte avec la version Gemini.
7. **Les « petits bugs » du pavage** : à me nommer (capture) ou à chercher en jeu ; aucun n'est listé aujourd'hui.
