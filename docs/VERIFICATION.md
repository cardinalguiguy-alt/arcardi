# VÉRIFICATION — bancs, jouer en local, automatisation du navigateur (§10)

> **Extrait SANS MODIFICATION de `CLAUDE.md` le 2026-10-03** (allègement du noyau : le contexte fixe passe de ~47 k à ~8 k tokens, estimés).
> Les numéros de § sont CONSERVÉS : tout « §N » cité dans le code, les README et les bancs reste valable (table dans `CLAUDE.md`).
> Ce fichier se lit À LA DEMANDE (voir le routeur de `CLAUDE.md`), jamais en bloc par défaut. Contient aussi « CE QUI N'EXISTE PAS ».

---

## 10. Vérification

⚠️ **`node` EST INSTALLÉ (v24, npm 11), `npm install` est fait.** On peut **bâtir et jouer**.

⚠️⚠️ **NE JAMAIS LANCER `npx next build` PENDANT QUE `npm run dev` TOURNE.** Les deux écrivent
dans le MÊME `.next/` : le navigateur reçoit des **404 sur les chunks**, la page se charge, le
HUD s'affiche, et le canevas reste vide — exactement comme si le rendu était cassé. Une
demi-session perdue au 426 sur un bogue qui n'existait pas. **Remède** : arrêter le serveur,
`rm -rf .next`, redémarrer.

**`npx next build`** compile tout : le contrôle le moins cher sur 25 000 lignes.
⚠️ L'avertissement `'G_SOIL' is not exported` est **PRÉEXISTANT**. ⚠️ **SANS `.env.local`, LE
BUILD S'ARRÊTE APRÈS LA COMPILATION** sur `Error: supabaseUrl is required` (pré-rendu de
`/login` et `/signup`) — ce n'est PAS une régression. **Ce qui compte est
`✓ Compiled successfully` juste avant.**

⚠️⚠️ **LES BANCS SONT DANS `tools/README.md` DEPUIS LE 432, ET CE CHAPITRE A ÉTÉ ÉLAGUÉ AU 444
SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 442** (reporté deux fois). ⚠️ **LE COMPTE ET LES CHIFFRES DU JOUR VIVENT
EN UN SEUL ENDROIT : le bloc ⏭️ REPRISE** (⚠️ 2026-09-25 : cette parenthèse en recopiait encore
un, périmé de douze jours — supprimé). Les recopier ici leur donnait un
second endroit où mentir (§14.2, leçon n°2) — ils y étaient restés au 2026-09-05, premier jour où
tous les bancs de contrôle avaient été relancés.
⚠️⚠️⚠️ **ET C'EST CE JOUR-LÀ QU'ON A APPRIS CE QUE « TOUS RELANCÉS » VALAIT : DEUX BANCS ÉTAIENT
ROUGES DEPUIS DES JOURS.** La phrase précédente disait « TOUS RELANCÉS LE 2026-09-03 » et en
nommait **huit sur vingt** — `verify-compo` et `verify-cycle` n'étaient dans aucune des deux
listes, donc personne ne les avait lancés. Aucun des deux ne signalait un défaut de JEU : les deux
étaient des bancs dont la règle avait vieilli sous une livraison plus récente (`verify-cycle`
rougissait sur un `slot` qui est un créneau de TEMPS ; `verify-compo` refusait une touffe d'herbe
au pied d'un arbre depuis l'arrivée de `TOWN_SOFT_PROPS`). ⚠️ **LA LEÇON EST LÀ, ET ELLE EST
GÉNÉRALE : UN BANC DÉJÀ ROUGE NE PEUT PLUS RIEN DIRE DU DÉFAUT SUIVANT.** Tant que `verify-cycle`
rougissait pour sa propre raison, la règle qu'il existe pour tenir — aucun indice de case en
chiffre, trente comparaisons dans `FermeGame.js` — n'était plus tenue par personne, et un vrai
`slotRef.current === 3` s'y serait ajouté sans rien changer à l'affichage. *Un banc rouge n'est pas
une dette qui attend : c'est une protection qui a déjà cessé.* ⚠️ **Corollaire d'écriture** : une
phrase qui dit « tous » et énumère huit sur vingt est plus dangereuse qu'une phrase qui n'énumère
rien — **on écrit le compte, ou on écrit la liste entière.**
⚠️ **`verify-strings` NE COMPTE PAS LES CLÉS DE LA QUÊTE** dans son 1 126 : sa parité de clés ne lit
que les tables `fr:`/`en:` indentées à quatre espaces, et `STAR_FR`/`STAR_EN` vivent hors de cette
plage. Son SECOND contrôle, lui (« aucune section identique dans les deux langues »), importe le
vrai module et les voit. *Le nombre ne bouge donc pas quand la quête gagne du texte — ce n'est pas
un banc qui rétrécit, c'est un banc qui ne regarde pas là.*
⚠️ *`verify-quete` était à 488 au 468 : le déchant a retiré les contrôles des quatre chapitres
supprimés et en a ajouté une trentaine sur la fouille. **Un banc qui rétrécit parce que le code
rétrécit est un banc en bonne santé** — ce qu'il ne faut pas, c'est qu'il rétrécisse tout seul.*
⚠️ **Six d'entre eux existent parce qu'un défaut vu par
Guillaume — ou vu à l'écran — n'était mesuré nulle part** : `verify-compo` (440), `verify-pont`
(441), `verify-portee` (443), et au 444 `render-etoile`, `verify-quete`, `render-beffroi`.
⚠️⚠️ **ET LE 480 EN AJOUTE UN QUI EST D'UNE AUTRE NATURE : `verify-maire` JOUE une mécanique de
bout en bout** — quatre cents entretiens par propriété, cinq maires × deux mondes × dix vitesses
de réflexion — au lieu de relire une table. Il a sorti quatre défauts de RÉGLAGE qu'aucune
relecture n'aurait vus, dont une négociation arithmétiquement ingagnable et une seconde moitié de
discussion devenue décorative. **C'est le premier banc du dépôt qui joue.** ⚠️ Ils sont **trois** depuis le
2026-09-02 : `verify-quete` joue à son tour le réveil de la reine, et il a servi tout de suite —
c'est lui qui prouve qu'un martèlement à 20 appuis/s place **zéro** battement en trente secondes,
donc que la mécanique est bien du rythme et pas de la vitesse.
⚠️⚠️⚠️ **ET LE 481 LUI A APPRIS DEUX CHOSES QUE 72 CONTRÔLES VERTS NE POUVAIENT PAS VOIR, ET LES
DEUX ONT ÉTÉ TROUVÉES EN JOUANT** (il est à **113/113**) : (1) **un banc qui manipule des dates doit
manipuler de VRAIES dates** — avec `at: 1000`, rien ne dit que `now | 0` tronque un horodatage de
1,78 × 10¹² à 32 bits, et la secrétaire annonçait « il vous reçoit dans 29778439:55 » ; (2) **un
texte à trous ne se vérifie pas en comptant ses clés, il se vérifie en le REMPLISSANT** — la vue
DEVINAIT quel argument passer à chaque justification, et le joueur lisait « Scrutin dans Lui
jours. » Toutes les clés étaient appariées, tous les textes affichés, tout comptait pour lu.
⚠️ Il importe désormais `maireBureau.js` pour tenir la jointure « sept postures de la mécanique =
sept postures dessinables » : c'est le seul contrôle du dépôt qui relie une règle à son DESSIN.
⚠️⚠️⚠️ **ET IL A APPRIS UNE LIMITE DE `verify-syntax` QU'IL FAUT CONNAÎTRE : IL ANALYSE FICHIER PAR
FICHIER, DONC IL NE PEUT PAS VOIR UN IMPORT QUI NE RÉSOUT PAS.** Un **bundle** —
`npx --yes esbuild@0.21.5 --bundle --loader:.js=jsx --format=esm --outfile=/dev/null
--external:react --external:'@supabase/*' --alias:@/lib/supabaseClient=./lib/supabaseClient.js
--alias:@/lib/realtimeQuota=./lib/realtimeQuota.js components/ferme/FermeGame.js` — a sorti en
96 ms un `A.drawStarCalmGlow` qui n'existe pas, c'est-à-dire **un crash de boucle de rendu vieux
de deux zips** (le piège n°1 de ce fichier, dans le zip même qui livrait la fonctionnalité). Ça ne
remplace pas `next build`, mais ça se lance PENDANT qu'un `next dev` tourne, et c'est le seul
contrôle du dépôt qui voie une liaison entre deux fichiers.
⚠️⚠️ **ET DEPUIS LE 2026-09-25, LE PIÈGE N°1 (`ReferenceError` à l'exécution) A UN CONTRÔLE — PONCTUEL,
PAS UN BANC** : `npx --yes eslint@8.57.0 --no-eslintrc --no-inline-config --parser-options=ecmaVersion:2022
--parser-options=sourceType:module --parser-options=ecmaFeatures:{jsx:true} --env browser,es2022,node
--rule 'no-undef: error' <fichiers>` — zéro configuration, zéro dépendance ajoutée, ~20 s sur
`FermeGame.js`. Il a attrapé en phase 1 un `day.width` resté dans le dessin de l'hôtel de ville, qui
aurait emporté toute l'image de la ville ; falsifié deux fois. **À lancer sur tout fichier du jeu
touché**, jusqu'à ce qu'il devienne un banc.
⚠️ **`verify-ludo` est le deuxième banc qui joue une mécanique de mini-jeu** : il balaie 1 000
plans légaux et tient les cinq chemins bot vers les arbitres de l'hôte. Son détail et ses limites
sont dans `tools/README.md`.
⚠️ **Le seul qui touche à de l'ARGENT est `verify-vallee`** (son compte du jour vit dans le bloc ⏭️ REPRISE, et NULLE PART AILLEURS — §14.2, leçon n°2 : ce chiffre a déjà eu deux endroits où mentir) : il joue des ventes,
compte les pièces, et vérifie que **le cours est bit à bit celui du 430** — contrôle hérité de
`verify-enquete`, sauvé de sa suppression parce qu'il protégeait le marché, pas l'enquête.
**Tout chiffre écrit là-bas a été obtenu en lançant le banc**, c'est sa règle d'entrée.

⚠️⚠️ **ET UN BANC QUI N'A JAMAIS PU ÉCHOUER NE VAUT RIEN** (441). Le garde-fou de source de
`verify-pont` annonçait « 0 appel fautif » alors que son motif ne pouvait matcher **aucun** appel
réel. **Tout banc qui compte des occurrences doit publier combien il en a LUES.**
⚠️⚠️⚠️ **ET IL A UN SECOND VISAGE, BEAUCOUP PLUS BÊTE, PAYÉ LE 2026-09-02 : LES ARGUMENTS INVERSÉS.**
Les `ok(...)` du dépôt ne prennent pas tous leurs paramètres dans le même ordre — `verify-quete` veut
`ok(nom, condition, détail)`, `render-etoile` veut `ok(condition, nom, détail)`. Six contrôles neufs
écrits dans le mauvais ordre ont passé au vert **en imprimant `OK true`** : la condition partait dans
la case du NOM (donc jamais évaluée) et le nom dans celle de la condition (une chaîne, donc toujours
vraie). Ils ne pouvaient pas échouer, et rien ne les distinguait des autres dans un compte qui monte.
⚠️⚠️⚠️ **ET UN TROISIÈME VISAGE, TROUVÉ LE 2026-09-03 : UN BANC PEUT EXIGER D'UN CADET CE QUE SES
AÎNÉS NE FONT PAS.** Trois mesures neuves ont rougi sur un dessin JUSTE, et la plus instructive
exigeait « aucun pixel sur le bord du canevas » d'une nouvelle étoile — alors que les SIX couleurs
en posent exactement douze depuis toujours (le halo commun). Exiger zéro, ce n'était pas mesurer un
défaut, c'était rejuger à l'occasion du cadet un choix accepté par cinq aînés. ⚠️ **La prise juste
est alors une COMPARAISON, jamais un seuil** : le nouveau venu doit se comporter *comme ses frères*,
ce qui attrape ce qui casserait vraiment (une palette qui déborde, un canevas changé pour lui seul)
sans rien exiger de neuf du dessin commun.
⚠️ **LA PARADE N'EST PAS DE RELIRE, C'EST DE FALSIFIER : on casse exprès la règle que le banc
prétend tenir, et on exige de le voir ROUGIR avant de le croire.** C'est ce qui a prouvé que la
pénalité du réveil sert vraiment à quelque chose (sans elle, le martèlement gagne en 6 s) — et c'est
la seule vérification qui aurait aussi attrapé l'inversion. *Un banc neuf se falsifie le jour où on
l'écrit, ou il n'est pas écrit.*
⚠️⚠️ **ET QUAND LE VRAI DÉFAUT EXISTE (le code d'avant), C'EST LUI QU'ON REJOUE** (2026-09-28, la couture
des clôtures) : la mesure a rougi sur sa falsification fabriquée — un trait plein — et restait verte sur le
vrai défaut, partiel. *Une falsification plus franche que le défaut prouve le banc contre un défaut qui
n'existe pas* ; le seuil se pose entre les deux mesures, celle du code fautif et celle du juste.

⚠️⚠️⚠️ **ET LE 444 A AJOUTÉ LA LIMITE DE FOND, CELLE QUI VAUT POUR TOUS : SIX BANCS AU VERT N'ONT
PAS VU DIX DÉFAUTS QU'UNE SÉANCE DE JEU DE VINGT MINUTES A TROUVÉS**, dont cinq qui rendaient un
lieu **inatteignable**. Ils mesuraient tous la bonne chose ; **aucun ne mesurait l'ARRIVÉE**.
Détail au §25 de `components/ferme/README.md`. *Un banc protège de ce qu'on a déjà compris ;
regarder l'écran est la seule chose qui trouve ce qu'on n'a pas encore compris.*

### ⚠️ CE QUI N'EXISTE PAS — ET C'EST LE POINT DE CE CHAPITRE

Une liste de ce qui existe se vérifie en la lançant ; une liste de ce qui n'existe pas ne se
vérifie jamais — c'est elle, et elle seule, qui protège du banc imaginaire (§14.6).

- ⚠️ **`verify-luge`, `verify-boot`, `preview-luge`, `preview.mjs`, `verify-perf` et
  `preview-fps` N'EXISTENT PAS** dans `tools/`.
- ⚠️⚠️⚠️ **AUCUN BANC NE COMPTE CE QUE LE CHARGEMENT COÛTE À LA MACHINE** : la mesure se refait à
  la main, en parcourant l'objet réellement retourné par `buildSprites()`. ⚠️ **CE QUI COMPTE N'EST
  PAS LA TAILLE, C'EST LE NOMBRE** : WebKit sur iPad alloue une surface minimale par canevas et
  plafonne le total, et le symptôme d'un dépassement n'est pas une erreur — c'est un onglet qui se
  ferme ou un canevas qui rend du blanc. Six mégaoctets répartis sur 1 842 canevas tuent une
  tablette que 6 Mo sur 779 ne dérangent pas. La parade est l'ATLAS (`makeAtlas`/`blitCell`,
  `fermeArt.js`) : une seule feuille, une lecture par rectangle source, et **les fonctions de
  dessin ne changent pas d'une ligne** — seul l'appelant qui les stocke change.
  ⚠️⚠️ **ÉTAT : 779 canevas retenus** (contre 1 842 avant le pavage de `townWater` et `petFrames`,
  hors-zip 2026-09-02). **Ce n'est pas une case cochée** : personne n'a rejoué la mesure sur un
  VRAI iPad, et 779 reste un nombre, pas un verdict. *C'est une mesure qui attend une confirmation
  humaine.* ⚠️ Restent non pavés `S.pets` (39 portraits — `Sprite` découpe depuis (0,0) et ne sait
  pas lire un rectangle source, donc les paver demanderait de toucher six appelants pour un gain
  négligeable) et tout le reste des 779, jamais mesuré famille par famille.
- ⚠️⚠️ **LE FAUX CANEVAS DES BANCS (`lib-canvas.mjs`) SAIT LES DÉGRADÉS DEPUIS LE 2026-09-25** (linéaire
  et radial, tenus par `verify-densite`) : `render-eau` et `render-parc`, morts depuis le 2026-09-02,
  tournent de nouveau, et les **24** `render-*` sont verts ce jour-là. ⚠️ **La leçon qui reste** : deux
  bancs rouges pour une raison d'OUTIL ont laissé l'eau sans aucun banc pendant trois semaines — et le
  jour où ils sont revenus, `render-eau` ET `render-oiseaux` avaient chacun un compte figé (4 massifs,
  2 volées) qu'une livraison voulue avait dépassé. *Un compte exact dans un banc vieillit à la première
  addition voulue ; on vérifie ce qui existe, pas combien il y en a.*
- ⚠️⚠️ **CE QUI N'EST PLUS VRAI DEPUIS LE 2026-09-01, ET IL FAUT LE DIRE** : la HAIE était le plus
  gros décor que personne ne regardait — 839 cases, le pourtour des vingt-sept parcelles, dessiné
  dans la closure du rendu depuis le 425. `render-haies` la regarde. ⚠️ **Ce qui reste dans la
  closure et n'a donc AUCUN banc** : les BÂTIMENTS de la ville, les PERSONNAGES, et **tous les
  props** — c'est-à-dire le belvédère refait le même jour, dont `verify-vallee` et `verify-compo`
  tiennent l'emprise mais dont personne ne voit le dessin.
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE — SAUF UNE LISIÈRE DEPUIS LE 2026-09-13**
  (`render-buissons` peint un morceau généré : herbe, arbres, rochers, buissons ; le reste de la
  ferme n'a toujours aucun banc) : les autres bancs de rendu ne dessinent que
  Valley Town, ses intérieurs, ses habitants et sa quête. Un décor de la ferme mal proportionné
  n'a, à ce jour, aucun endroit où se voir. ⚠️ **Et le SOL de la ferme non plus** : `render-rues`
  peint les rues de la ville, pas les chemins de la ferme, restés sur la tuile unique de 16 px du
  zip 232.
  ⚠️⚠️ **UNE EXCEPTION DEPUIS LE 454, ET ELLE A SERVI TOUT DE SUITE** : le SILLON de l'étoile est le
  premier décor de la FERME qu'un banc regarde (`render-etoile`, §5 bis). Il a fallu le sortir de la
  file de tri et en faire une fonction pour ça — et le jour où il est devenu regardable, on a
  découvert qu'il était PLAT depuis dix zips.
  ⚠️ **LE 455 A APPLIQUÉ LA LEÇON À L'ENDROIT** : la bulle « ! » des PNJ est née DANS `fermeArt` avec
  ses treize contrôles le jour de son écriture (§9 et §10 de `render-etoile`), et le banc a
  immédiatement supprimé un dessin mort (un « ? » que personne n'appelait).
  ⚠️⚠️ **L'ÉCART EST DEVENU FRAPPANT : la ferme garde les deux arbres du zip 232** (trois `arc()`
  et quatre triangles) **et son herbe en tuile de 16 px**, pendant que la ville a onze essences
  animées de 48×64 et un gazon au pavé de 64 px. C'est délibéré (décision du 424 : ne pas mêler
  deux changements visuels) et c'est **la dette la plus visible du projet** — un joueur qui prend
  le train voit deux niveaux de finition.
- ⚠️ **AUCUN BANC NE COMPOSE LA LUMIÈRE NI LES REFLETS** (phases 3 et 4) : le faux canevas ne sait ni
  `multiply` ni `lighter` ni `destination-out`/`destination-in` — la passe des reflets et les colonnes
  de nuit (`eau.js` § 7) ne se jugent qu'en jeu. `verify-lumiere` tient la DONNÉE (ciel, horaires, anneaux) et la
  GÉOMÉTRIE (ombres) ; le rendu lui-même — calage sur le pixel d'art, teintes, lisibilité — ne se juge
  qu'en jeu. ⚠️ **Pour le tester en jeu** : l'heure se déplace en décalant `Date.now` dans la page (le
  jeu la lit ; 800 ms réelles = 1 min de jeu) ; le changement de JOUR, lui, dépend du minuteur de
  l'hôte, qu'un onglet masqué étrangle. Pour voir un temps donné : menu dev « Météo et saison »
  (commande partagée, valable le jour en cours, qui MONTE — avancer `Date.now` de 1 à 2 min pour
  l'avoir au plus fort). ⚠️ Un onglet masqué ne JOUE aucun tonnerre (`document.hidden`) : pour le
  compter, redéfinir `document.hidden` à `false` et espionner `HTMLMediaElement.prototype.play`.
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** `render-mairie` (439) et
  `render-beffroi` (444) **appellent** les sols au lieu de les repeindre, donc ils jugent ce que
  le jeu dessine vraiment ; **ce qui manque est ce qui reste dans la closure : les BÂTIMENTS de la
  ville et les PERSONNAGES.** Les autres bancs approximent le décor autour de leur surface.
- ⚠️⚠️ **ET AUCUN BANC NE JOUE À DEUX CLIENTS.** `fake-supabase.mjs` le permet depuis le 432 et
  l'a fait pour la VILLE (trois défauts le premier jour), pour l'enquête au 442 (deux défauts) et
  **pour la quête de l'étoile au 458 — TROIS BLOCAGES DURS**, dont deux rendaient la quête
  infinissable dès qu'un second joueur se connectait (§12.0 de `QUETE.md`). ⚠️ *La séance à deux
  clients a désormais payé les trois fois sur trois où elle a eu lieu.* **Ce qui reste** : la
  moitié qui se joue FACE À FACE — ⚠️ **liste corrigée le 2026-09-05, trois des quatre postes qui
  étaient écrits ici avaient été supprimés au déchant du 469** : restent l'étoile timide dos à dos,
  le RELAIS du plat et les DEUX BORDS du cratère (ces deux-là ajoutés au 479) — et **la ferme
  PEUPLÉE**, jamais vue à deux.
- ⚠️⚠️ **`render-etoile` JOUE UN MOUVEMENT DU MONDE DEPUIS LE 459** : son §7 simule
  `starSlipStep` sur le vrai creux du cratère, 317 départs, et vérifie qu'on SORT du trou. Il a
  trouvé, avant d'être fini, que 219 départs sur 317 étaient bloqués. `verify-ludo` joue désormais
  aussi l'automate pur d'un bot et balaie 1 000 plans légaux ; aucun des deux ne tourne à deux
  clients.
- ⚠️ **AUCUN BANC NE JOUE UN MINI-JEU DANS SON DOM ET SON CANEVAS.** `verify-ludo` protège les
  décisions pures et le branchement aux arbitres ; le navigateur a seul validé le choix 1/2/3 et
  l'enchaînement humain → bot → humain du duel. Ce qui se juge là — *est-ce que c'est agréable ?*
  — ne se mesure toujours nulle part.

⚠️⚠️⚠️ **LE VOLET DU NAVIGATEUR PEUT ÊTRE MASQUÉ MÊME QUAND UN ONGLET EST « AU PREMIER PLAN » —
ET ALORS `requestAnimationFrame` EST GELÉ, DONC LE JEU NE TOURNE PAS** (audit 2026-09-12). Le
symptôme est trompeur : la lecture du DOM marche parfaitement, les textes sont à jour, les clics
passent — et un curseur de mini-jeu reste figé à 5 % pendant vingt secondes, ce qui ressemble trait
pour trait à une mécanique cassée. **On vérifie `document.hidden` AVANT de conclure quoi que ce
soit d'une mesure**, et on pose le worker du paragraphe ci-dessous **avant de rejoindre la ferme**
(une fois la boucle partie, la patcher ne la récupère pas : la dernière inscription reste orpheline
chez le `rAF` natif, exactement comme quand on `terminate()` le worker).
⚠️⚠️ **ET `fake-supabase.mjs` NE PERSISTE RIEN : il répond `[]` sur tout `/rest/v1/*`.** Donc un
rechargement repart TOUJOURS d'une ferme neuve — ne jamais conclure « l'état a survécu » d'un
comportement observé après reload (erreur commise pendant cet audit : on a cru à une persistance
là où le dev menu venait simplement d'être rejoué).
⚠️⚠️ **UNE SCÈNE EN FILE BLOQUE TOUTE L'INTERACTION QU'ELLE PRÉCÈDE, ET ÇA RESSEMBLE À UN BUG.**
`starImpactLandedNow()` exige que le joueur ait VU la cinématique du météore (marqueur local
comparé à `e.townFall`) ; un bouton dev qui pose un `townFall` neuf rend donc TOUTE l'interaction
d'étoile en ville muette jusqu'à ce que la scène ait joué. Et la scène ne joue que si aucun panneau
n'est ouvert : **une automatisation qui ouvre le menu dev juste après l'arrivée empêche
indéfiniment la scène, donc l'interaction.** Laisser trente secondes sans rien toucher.

⚠️⚠️ **JOUER À DEUX EN LOCAL : `node tools/fake-supabase.mjs`.** REST bidon **+ relais Realtime**,
donc deux onglets = deux joueurs, sans compte et sans consommer un message du quota. `LAT=90
JIT=60` simule une vraie liaison ; il imprime le débit réel PAR TYPE toutes les 5 s.
⚠️ **Le broadcast de supabase-js est BINAIRE**, pas JSON — un relais qui ne lit que les trames
texte voit tout se connecter et rien passer. Depuis le 2026-08-27, le relais mémorise aussi
`broadcast.self` à la jonction : une partie solo à client unique doit recevoir son propre état.

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** (recette resservie telle
quelle au 454 puis au 456) :
1. l'URL factice `http://127.0.0.1:54321` — ⚠️ **SANS RÉÉCRIRE `.env.local`, qui porte les vraies
   clés** : lancer `fake-supabase` puis `arcardi-local` (port 3100) depuis `.claude/launch.json`, qui
   passe l'URL en variable de PROCESSUS, prioritaire sur `.env.local` (2026-09-13) ; sans elle on reste bloqué à l'écran
   « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification — et commitée, elle peut arrêter TOUS les
   déploiements (2026-09-12 : un `useSearchParams()` sans `<Suspense>` a cassé le build Vercel
   entier, pas seulement sa route).

Puis ⌘⇧X → menu développeur → **20 arrêts** (ferme, passage, Valley Town ×7 dont **le cratère**
depuis le 446, et les **huit niveaux d'intérieur** : tribunal ×3, mairie ×2, église ×3 dont le
beffroi), **« Peupler la ferme »** et **« ⭐ Star »** (444 : effacer · lancer la chute · boucler le chapitre · sauter d'un
cran · marquer le lieu suivant · tout sauf le duo · **et REJOUER UNE SCÈNE isolée**).
⚠️ « Rejouer une scène » est le bouton qui change tout : sans lui, revoir une cinématique oblige à
remettre la quête à zéro, donc on ne la revoit qu'une fois, donc on ne la juge qu'une fois.
⚠️ **UN TÉLÉPORT DU MENU DEV QUI POSE LE JOUEUR DANS UNE ZONE QU'ON VIENT DE REJOINDRE RATE SON
COUP S'IL EST ENCHAÎNÉ SANS PAUSE** (« Stand at the Mayor's desk », « Stand at Kerguélen ») : le
monde n'a pas fini de s'installer, et le bouton ne fait rien, silencieusement — laisser une seconde
ou deux après le changement de zone avant de l'utiliser.
⚠️ **AUCUN BOUTON DE QUÊTE NE DONNE QUOI QUE CE SOIT** : le menu s'ouvre à tout joueur qui connaît
le raccourci (398). Le chemin développeur appelle les mêmes résolveurs et JETTE ce qu'ils rendent.
⚠️ **DEPUIS 2026-08, DEUX BOUTONS DU MENU DONNENT VOLONTAIREMENT QUELQUE CHOSE** — exception
délibérée à la ligne du dessus, sur demande de Guillaume : « Argent » (+100 000/+1 000 000/
+10 000 000 or, arbitré par l'hôte comme `devResidents`) et « Constructions & cultures → Tout terminer », qui
avance à MAINTENANT tout horodatage de construction en attente dans `w.objHp` (lampadaire,
épouvantail, moulin, chaudron, repousse d'herbe — voir `BUILD_TIMES`/`buildReady` dans
`fermeEngine.js`), toute culture (`bankedMs` porté à `growMs`) et toute production animale
(`readyAt`). Sert à tester une fonctionnalité de la ferme (bâtiments compris) sans attendre les
délais réels ni faire tourner l'économie à la main. Testé en session à 1 client
(`fake-supabase.mjs`) : l'or s'incrémente bien côté hôte, le bouton renvoie « aucune construction
en cours » sans rien casser quand il n'y a rien à finir.

⚠️⚠️ **AUTOMATISATION DU NAVIGATEUR — LA RECETTE COMPLÈTE, ET ELLE MARCHE DEPUIS LE 446.**
`window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}))` marche pour TOUTES les touches
(les frappes envoyées par l'outil, non). Le menu dev ouvert BLOQUE les déplacements (`if
(devMenuOpenRef.current …) return`) — il faut `Escape` avant de marcher. La capture d'écran
fonctionne.
⚠️⚠️ **UN CLAVIER SYNTHÉTIQUE EN LONGUE BOURRASQUE TRAVERSE UN MUR PLEIN EN UN PAS** (2026-09-22,
confirmé de nouveau le 2026-09-22 ter) : sans le throttle d'une vraie frappe, un `keydown` maintenu
programmatique fait avancer bien plus qu'un pas par image — artefact du harnais, pas du jeu (un
joueur réel avance ~1 px/frame). **Toute vérification de collision se fait par petits pas répétés
(`keydown` court, `keyup`, ré-essayer), jamais par une longue rafale.**
⚠️⚠️⚠️ **DANS UN ONGLET MASQUÉ, `requestAnimationFrame` NE SE DÉCLENCHE JAMAIS**
(`document.visibilityState === "hidden"`) : le monde ne tourne pas, le fermier ne bouge pas d'un
pixel, et **`getImageData` relit la dernière image composée** — deux mesures de suite rendent le
même nombre et on accuse le code qu'on vient d'écrire. **UNE LIGNE SUFFIT, ET SON FREIN EST DANS
SA FORME :**
`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);`
Mesuré au 446 : **31 à 36 images par 500 ms**, onglet masqué, monde qui tourne, marche, mesures.
⚠️ Le `MessageChannel` du 444 figeait l'onglet parce qu'un relais qui se repose un message à
chaque image n'a **pas** de frein ; `setTimeout(…, 16)` en est un par construction. **On pose le
patch AVANT de mesurer quoi que ce soit**, et on peut ensuite lire les pixels du canevas
(`getImageData`) pour mesurer ce qu'aucune capture ne montre — un décalage de sprite, par exemple.
⚠️ Un canevas mesuré pendant qu'un panneau est masqué sort à **0×0**, ce qui ressemble trait pour
trait à un rendu cassé.
⚠️⚠️ **ET DEPUIS LE 454, `setTimeout(…, 16)` NE SUFFIT PLUS : CHROME ÉTRANGLE LES TIMERS D'UN
ONGLET MASQUÉ À UN PAR SECONDE.** Le monde avance (l'horloge tourne) mais à ~1 image/s, ce qui donne
un jeu « qui marche » et des mesures fausses — une scène de chute défilait en douze images. **La
parade est un WORKER, qui n'est pas étranglé** :
`new Worker(URL.createObjectURL(new Blob(["setInterval(()=>postMessage(0),16);"])))`, dont chaque
message vide une file de callbacks `requestAnimationFrame`. C'est le frein du 446 (une file, pas un
relais qui se repose un message) avec une horloge qui ne dort pas. ⚠️ **Il a resservi tel quel au
456**, où il a fait tourner toute la séance.
⚠️⚠️ **RELIRE LE CANEVAS D'UN ONGLET MASQUÉ : MENTEUR AU 456, JUSTE LE 2026-09-13 — CE QUI SÉPARE LES
DEUX EST UN TÉMOIN.** Au 456, le hachage de l'écran entier ne bougeait pas sur un monde qui bougeait.
Le 2026-09-13, pane masqué (la capture d'écran REFUSE alors de s'exécuter), `toDataURL` du canevas de
jeu, worker en place, a suivi chaque pas d'une rafale de douze images. *Une relecture de canevas ne se
croit que si elle contient quelque chose qui DOIT changer* (le décor qui défile, un buisson témoin sur
la minimap). Recette : une route jetable `app/api/<nom>/route.js` qui écrit le PNG reçu dans le
scratchpad, puis PIL (`python3`) pour recadrer, aligner et mesurer — supprimée avec la page jetable.
⚠️ Deux onglets du même pane masqué ne se voient pas BOUGER : `netCanBroadcast` coupe la position
d'un onglet masqué (l'état partagé, lui, passe).
⚠️⚠️ **NE JAMAIS `terminate()` CE WORKER POUR « GELER » UNE IMAGE — MESURÉ LE 2026-09-04.** La
boucle de rendu se réarme elle-même via `requestAnimationFrame(loop)` à chaque image ; couper le
worker qui vide la file orpheline la toute dernière inscription, et en créer un SECOND ensuite ne
réarme rien — plus aucune image ne se dessine, plus aucun déplacement ne s'applique, **pour de
bon**, même après coup. Seul un rechargement complet répare (et reperd tout état non persisté).
La bonne parade pour figer une image le temps d'une capture : garder LE MÊME worker vivant, et lui
faire sauter les vidages via un simple drapeau (`onmessage` qui retourne tôt si `paused`) — la
file continue de s'alimenter, rien n'est perdu, une capture d'écran suffit ensuite pour regarder
l'image gelée à loisir.
⚠️⚠️⚠️ **AUTOMATISER UNE MARCHE DEPUIS `EVIL_SPAWN` (LAC MALÉFIQUE) SE FAIT MORDRE — MESURÉ LE
2026-09-04, ONZE TENTATIVES.** Dix trajets sur onze (directions et durées variées, cartes
régénérées) se sont fait intercepter par une créature en 1 à 3 s ; un seul est arrivé au lac. Le
joueur est pourtant bien plus rapide que la créature (`PLAYER_SPEED`=5,2 case/s contre
`EVIL_MONSTER_SPEED`=1,5) : **ce n'est pas un problème de vitesse, c'est qu'un script qui tient une
touche 1 à 3 s marche à l'aveugle sur toute sa durée**, sans capture entre temps pour voir venir la
créature et bifurquer — l'avantage de vitesse du joueur ne sert à rien si rien ne le pilote pendant
qu'il avance. **Aucune conclusion sur la difficulté en jeu réel** (Guillaume joue avec la carte sous
les yeux en continu, pas par rafales aveugles) : ce piège vaut pour l'AUTOMATISATION, pas
forcément pour lui. La parade, si le besoin revient : capturer après CHAQUE petite rafale (≤1 s),
jamais après une longue.
⚠️⚠️ **UNE CAPTURE D'ÉCRAN N'EST PAS FORCÉMENT DANS LE MÊME REPÈRE DE PIXELS QUE LE DOM DE LA
PAGE — MESURÉ LE 2026-09-04, ~6 % D'ÉCART.** `getBoundingClientRect()` sur le canevas de jeu a
donné 753×858, une capture d'écran prise au même instant 800×911 : caler un clic synthétique
(`MouseEvent({clientX,clientY})`) sur des coordonnées LUES SUR LA CAPTURE a manqué une cible de
1,6 case (quelques dizaines de pixels) alors que le point semblait juste à l'œil. **La parade qui
marche** : ne jamais recalculer soi-même une coordonnée depuis une capture — utiliser l'outil de
clic du navigateur avec les coordonnées de LA CAPTURE (il fait la conversion), ou mieux, chercher
l'élément DOM et l'appeler directement (`element.click()`, qui ne dépend d'aucune coordonnée).
⚠️⚠️ **UN ONGLET MASQUÉ QU'ON VIENT DE CHARGER N'A PAS D'HORLOGE D'ANIMATION — MESURÉ LE
2026-09-24** : `document.timeline.currentTime` reste à 0, une transition CSS existe (`getAnimations()`)
mais ne progresse jamais, et on croit la transition cassée. Une capture d'écran force une image et
relance l'horloge ; vérifier `document.timeline.currentTime > 0` AVANT de mesurer une transition.
⚠️⚠️ **`resize_window` À UNE TAILLE ÉMULÉE FAUSSE LES CLICS DE L'OUTIL — MESURÉ LE 2026-09-24** :
un clic visé en (321, 341) sur la capture est arrivé en (1255, 1333) dans la page. La capture reste
juste, le clic non. Pour cliquer : taille native du volet, ou `PointerEvent` scriptés sur l'élément
(`dispatchEvent`, avec bulles), espacés de quelques millisecondes.
⚠️⚠️⚠️ **UNE ÉDITION DE `FermeGame.js` PENDANT QUE `npm run dev` TOURNE PEUT COMPILER SANS QUE
LE COMPOSANT MONTÉ NE CHANGE DE COMPORTEMENT — MESURÉ LE 2026-09-04.** Le terminal annonce
`[Fast Refresh] done`, l'état du composant (position, inventaire) survit à l'édition — signe
qu'il n'y a PAS eu de remontage complet — et pourtant le nouveau code d'une fonction déclarée
dans l'unique gros effet du composant ne s'exécute pas : une correction ajoutée, une capture
prise dans la foulée, toujours l'ancien comportement. Aucune erreur, aucun avertissement. **La
seule parade fiable est un rechargement COMPLET de la page** (`navigate`, pas une édition à
chaud) avant de rejuger un changement dans ce fichier — le coût (refaire la mise en place :
rejoindre, menu dev, téléport) est faible à côté du temps perdu à chasser un défaut qui n'existe
que dans du code déjà remplacé.

⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas `fillText`**
— un sprite qui en dépend s'y juge faux. Ce n'est pas un bogue du jeu. ⚠️⚠️ **Et il
n'implémentait `drawImage` qu'à TROIS arguments jusqu'au 428** : toute découpe y dessinait la
feuille ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans
l'outil censé nous en protéger**. **Un banc de rendu se vérifie aussi.**

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**
