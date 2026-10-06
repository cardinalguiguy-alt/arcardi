# CLAUDE.md — CONTEXTE ARCARDI (NOYAU)

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il est volontairement COURT : c'est le noyau, vrai pour toute tâche. Le détail vit dans `docs/` et dans les
README à côté du code ; le **ROUTEUR** ci-dessous dit quoi lire selon la tâche. Le README de la ferme est un
journal chronologique inversé : c'est de l'**histoire**, pas de l'orientation.
**Neutre vis-à-vis de l'agent** (Claude Code, Codex) : des fichiers markdown ordinaires et deux commandes
`node`, aucun mécanisme propre à un outil — c'est ce qui garde ce fichier source unique (§2, `AGENTS.md`).

---

## ⏭️ REPRISE — SI GUILLAUME DIT SEULEMENT « REPRENDS LE TRAVAIL », C'EST ICI

### 2026-10-06 (nuit) — iPAD : AUDIT FAIT SANS iPAD, UN CORRECTIF DE FLUIDITÉ À VT — DANS L'ARBRE, NON COMMITÉ

Récit : README de la ferme, journal « 2026-10-06 (nuit) » ; résultats ligne par ligne : `docs/PROJETS.md` §3. **Supabase : rien.** Les lots d'avant (marché en haut,
ombre du saut, patin, figures à deux, reflets) sont COMMITÉS ; leurs jugements et leurs « pas vu » : tête de `docs/A-JUGER.md` et journal 2026-10-06 du README.
**Pas de Xcode ici (`simctl` absent) : aucun simulateur, et le jeu n'a TOUJOURS jamais été vu sur un vrai iPad.** Mesuré dans le volet navigateur (1180 × 820, Mac M4,
Chromium), Valley Town, hiver, nuit : (1) JS par image, zoom 3 : 5,7 → **4,5 ms** après correctif (marche, p95 : 10,9 → 5,5) ; zoom 2 : 7,2 ; zoom 4 : 4,3 ;
**zoom 1 : 21,5 ms, hors du budget de 16,7 ms, sur un M4** ; (2) ≈ 19 200 → **11 950 appels de dessin par image** : `drawRinkGarland` n'était écarté que selon Y — garde X
ajoutée dans `FermeGame.js` (étendue du fil, rendu identique, vu en jeu au centre et au bord) ; (3) **905 canevas vivants, 89 Mo** en ville (50 Mo à la ferme) ; (4) pavé,
boutons, zoom 🔍 : marchent (événements pointeur synthétiques) ; (5) mise en page 1180 × 820 : bonne ; **744 × 1133 : le rang de boutons mord de 12 px sur la barre d'outils
et l'invite « E : … » passe sous les boutons** — NON corrigé (visuel, à décider avec lui). **Pas vu** : Safari/WebKit réel (coût par appel canevas ; `ctx.filter` absent ou non ?
il n'agit à VT que sur l'arbre entamé), mémoire iPad, tactile réel (multi-touch, clavier virtuel), réseau, deux clients. Contrôles : `no-undef` sur FermeGame.js, 0 erreur (falsifié) ;
`verify-*` non relancés (dessin seul, aucune logique).
⚠️ `app/audit-tmp` (un compteur de canevas y est ajouté : `window.__cvLog`), `app/audit-duo`, `app/api/audit-cap` (SUIVIS PAR GIT) : **à supprimer avant déploiement**. ⚠️ Les bancs réécrivent
`tools/.cache/*.mjs` (suivi par git). ⚠️ Recharger la page après toute édition de `FermeGame.js` (boucle montée une fois). ⚠️ Un invité immobile n'émet aucun `pos`. ⚠️ Les numéros de
ligne d'une pile d'appels du navigateur (webpack « eval ») NE SONT PAS ceux du source : se fier aux NOMS de fonctions. Pas corrigés : `f.injuredUntil | 0` ; `C.G_SOIL` n'existe pas
(`orchardRefusal`) ; `TOWN_SPEED_MULT` est mort ; la bascule de saison est instantanée.

### ⏭️ ACTION SUIVANTE — UNE SÉANCE SUR UN VRAI iPAD, ET TRANCHER LE ZOOM 1

(1) Vingt minutes sur un vrai iPad (Safari, même réseau, `next dev` + `tools/fake-supabase.mjs`) : `docs/PROJETS.md` §3. (2) À décider avec Guillaume (rien de codé) : zoom 1 plafonné à 2 au tactile
(le seul gros dépassement) ; pavé et boutons remontés de ~20 px (chevauchement de la barre d'outils en portrait) ; l'invite « E : » cachée au tactile ; **cuire dans l'atlas, à rendu identique,
la chaussée (`drawTownRoadTile` : traces de roues, caniveau, ≈ 12 % des appels) et la fumée des cheminées**, redessinées case par case à chaque image. (3) Puis comme avant : juger les lots du
patin et du marché (`docs/A-JUGER.md`), le catalogue de la Maison Garfield (`docs/PROJETS.md` §1).

## 🧭 ROUTEUR — QUOI LIRE SELON LA TÂCHE (2026-10-03)

**On lit ce qui est écrit pour la tâche, pas le dépôt.** Ce noyau + la ligne de la tâche ci-dessous suffisent pour
démarrer. Les titres du §4 sont des **déclencheurs** : si l'un « sonne » avec ce qu'on écrit, on ouvre son récit
(`docs/PIEGES.md`) AVANT d'éditer — c'est ce qui garde la précision sans payer 25 k tokens à chaque tâche.

### Méthode de lecture (un gros fichier coûte des centaines de milliers de tokens)
1. **Jamais un gros fichier en entier.** `FermeGame.js` ≈ 41 000 l., `fermeArt.js` ≈ 20 000, `fermeEngine.js` ≈ 13 000,
   `fermeConstants.js` ≈ 9 000, `fermeStrings.js` ≈ 7 000, `quete.js` ≈ 5 700 ; README de la ferme ≈ 5 600, `QUETE.md` ≈ 3 500,
   `tools/README.md` ≈ 1 800.
2. **`node tools/doc-index.mjs <fichier> [motif]`** rend `début-fin` de chaque fonction (.js) ou section (.md) : on lit
   CETTE plage (`Read` offset/limit, ou `sed -n 'a,bp'`), pas « largement autour ». Calculé à la demande : jamais périmé.
3. **Le README de la ferme se lit par section.** Ses ~2 400 premières lignes sont le JOURNAL (une entrée par livraison,
   la plus récente en tête) ; les sections numérotées 1 à 23 qui suivent sont l'ÉTAT. `doc-index.mjs components/ferme/README.md <mot>`.
4. **`grep` avant de lire**, et chercher les AUTRES usages d'un symbole avant de l'éditer (§4 : closure de la boucle, clés en double…).
5. **Exploration large** (« où est utilisé X dans tout le dépôt ? ») : un sous-agent d'exploration, si l'outil en propose, qui
   rend une CONCLUSION et non les fichiers ; les éditions restent dans la conversation principale.
6. Ne pas relire ce qu'on vient d'écrire ni ce que la conversation contient déjà.

<!-- routeur:début -->
| Tâche | Lire, dans l'ordre | Bancs à relancer |
|---|---|---|
| Neige, hiver, glace, feuilles mortes | `components/ferme/neige.js`, `glace.js`, `feuilles.js` ; README ferme (journal 12a, 2026-09-29, 2026-09-30) | `verify-neige`, `render-neige`, `render-neige-ferme`, `render-glace`, `verify-feuilles` |
| Patin, matériel (paires, combinaison, couleurs), figures (vrille emballée, freinage brut, FIGURES À DEUX : `components/ferme/duo.js`), gerbe, aide « ? », glace du lac, chalets, collision de la bande, chute sans patins | `components/ferme/patin.js`, `SkateHelp.js`, `glace.js` (le lac : `lakeIceEq`, `frozenAt`), `neige.js` (`lakeCold`) ; README ferme (journaux 2026-10-06 et 2026-10-05 « fin quater ») ; `C.rinkBandSolid` (fermeConstants.js) | `verify-patin`, `verify-duo`, `verify-surfaceuse` (§7), `render-patin`, `render-glace`, `verify-vallee` |
| Usure de la glace (quatre états), surfaceuse, lissage demandé au chalet, guirlandes de la patinoire | `components/ferme/surfaceuse.js` (pur) ; `rinkWearCanvas`, `drawRinkWearAt`, `drawRinkSurfacer`, `drawRinkGarland` dans fermeArt.js ; `iceApply`, `hostIceTick`, `hostRinkSmooth` dans FermeGame.js (`node tools/doc-index.mjs components/ferme/FermeGame.js Ice`) ; README ferme (journal 2026-10-06) | `verify-surfaceuse`, `render-patinoire` ; à deux : `app/audit-duo` |
| Bonhomme de neige (coups de pied, boule portée, chapeaux) | `components/ferme/bonhomme.js` ; `drawSnowman` dans fermeArt.js ; README ferme (journal 2026-10-05) | `verify-bonhomme`, `render-bonhomme` |
| Pluie, flaques, sol mouillé | `components/ferme/pluie.js` ; README ferme (« PLUIE », 12b) ; piège « surface qui revient » | `verify-pluie`, `render-pluie` |
| Lumière, nuit, fenêtres, cheminées | `components/ferme/lumiere.js`, `fumee.js` ; README ferme (« PHASE 3 », 12c) | `verify-lumiere`, `verify-jour`, `render-fumee` |
| Lampadaires, planche 3, jardins | README ferme (en tête) ; `tools/build-lampadaires.mjs`, `import-planche3.mjs` | `verify-planche3`, `verify-densite` |
| Course de la patinoire, contre-la-montre | `components/ferme/course.js`, `CourseHud.js` ; `hostRinkReq` dans FermeGame.js (`node tools/doc-index.mjs components/ferme/FermeGame.js Rink`) ; README ferme (journal 2026-10-05 nuit, fin ter) | `verify-course`, `render-patinoire` ; à deux : `app/audit-duo` |
| Ombres portées du soleil (heure, saison, ciel) | `components/ferme/ombres.js` ; `sunShadowPass` dans FermeGame.js (`node tools/doc-index.mjs components/ferme/FermeGame.js sunShadowPass`) | `verify-ombres` |
| Marché (en haut TOUTE l'année), mondes de saison de la ville (calque : marché + patinoire l'hiver), ancienne place vide | `townSeasonWorld` (`townMarketWorld`, `townWinterWorld`) dans fermeEngine.js ; `getTownWorldCached` dans FermeGame.js ; `TOWN_WINTER_MARKET` dans fermeConstants.js ; README ferme (journaux 2026-10-06 suite et 2026-10-05 nuit fin) | `verify-vallee`, `render-marche-hiver` |
| Météo, saisons, fin de saison, température, gelée, bourgeons | `components/ferme/meteo.js` (§ 0 bis, § 9, § 10), `neige.js` ; `makeWinterTrees` dans fermeArt.js | `verify-meteo`, `verify-neige` |
| Carte ouverte (plan de Valley Town) | `components/ferme/planVille.js` ; `drawTownMap` dans FermeGame.js (`node tools/doc-index.mjs components/ferme/FermeGame.js Map`) ; README ferme (journal 2026-10-03) | `render-plan` |
| Sols de VT (pavements, herbe), arbres, intégrer une image Gemini de sol ou d'arbre | `refs/lot-gemini/00-LISEZ-MOI.md`, puis `refs/lot-gemini/A-sols-vt.md` ou `refs/lot-gemini/B-arbres.md` ; `tools/lib-mip.mjs`, `tools/build-lampadaires.mjs` (le modèle) | `render-rues`, `render-arbres`, `verify-densite` |
| Eau, reflets, berges, parc | `components/ferme/eau.js` ; README ferme §18-§20 | `render-eau`, `render-rive`, `render-parc` |
| Faune (colverts, chats, LAPINS de VT, lucioles) | `components/ferme/faune.js` (§ 10 bis), `fauneArt.js` (§ 6) | `verify-faune`, `render-lapins` |
| Maisons, façades, image Gemini à intégrer | `docs/IMAGES-ET-BLENDER.md` (d'abord « Notes qui restent vraies »), `fermeConstants.js` (`TOWN_HOUSE_MODELS`, `TOWN_SHOP_MODELS`), `tools/build-maison-sprites.mjs` | `verify-vallee`, `verify-densite`, `verify-compo` |
| Clôtures, buis, haies | `components/ferme/clotures.js`, `buis.js` | `render-haies`, `render-buis` |
| Génération de la ville, rues, collision, marche | `components/ferme/fermeEngine.js` ; README ferme §15 et §15 bis (pièges) | `verify-vallee`, `verify-collision`, `verify-compo`, `render-rues` |
| Tribunal, mairie, église, beffroi, escaliers | README ferme §7, §22 ; `components/ferme/DESSIN.md` | `render-tribunal`, `render-mairie`, `render-eglise`, `render-beffroi`, `render-escaliers` |
| Quête de l'étoile, navire | `components/ferme/QUETE.md` (§17 d'abord), `quete.js` | `verify-quete`, `render-etoile`, `render-navire` |
| Maire, élections, audience | `components/ferme/maire.js`, `MaireScene.js`, `maireBureau.js` | `verify-maire`, `render-maire` |
| Scierie de Tristan | `components/ferme/scierie.js`, `scierieAtelier.js`, `ScierieScene.js` | `verify-scierie`, `render-scierie` |
| Marché, vente, économie | README ferme §14 ; `fermeEngine.js` | `verify-vallee` |
| Réseau, salons, sauvegardes | §3 ci-dessous ; `lib/gameSync.js`, `lib/realtimeQuota.js` ; `components/ferme/SECURITE.md` | (aucun banc réseau) `tools/fake-supabase.mjs` pour jouer à deux |
| Textes, traduction | `components/ferme/fermeStrings.js` | `verify-strings` |
| Noms au-dessus des personnages | `components/ferme/pixelFont.js` | `verify-noms` |
| Dessin procédural d'un sprite | `components/ferme/DESSIN.md`, `fermeArt.js` | le `render-*` du sujet |
| Autres jeux | `components/chess/`, `components/PetitsChevaux.js` + `ludoBot.js`, `public/candyluge/README.md` | `verify-echecs`, `verify-ludo`, `verify-ousthat` |
| Jouer / vérifier à l'écran | `docs/VERIFICATION.md` (§10) | — |
| Quel banc pour ceci ? | `node tools/doc-index.mjs tools/README.md <mot>` | — |
| « Reprends le travail » / choisir un chantier | le bloc REPRISE ci-dessus, puis `docs/A-JUGER.md` ; les projets décidés pas commencés : `docs/PROJETS.md` | — |
| Catalogue Maison Garfield, création du personnage (teinte de peau, coiffure), tests iPad, **usages de la place hors hiver (skatepark, miroir d'eau, Halloween), piscine municipale (centre aquatique, nord-est)** | `docs/PROJETS.md` (§1 à §5) puis `components/ferme/README.md` (garde-robe, §12) | — (rien n'est codé) |
<!-- routeur:fin -->


---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi n'est
pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code partagé. Tout
arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

1. **La qualité avant le nombre.** 23 jeux existent ; ce qui compte est qu'un jeu donné soit
   *fini*. Depuis le 421, l'exigence est explicitement **AAA**.
2. **Le monde partagé est le cœur.** La ferme est un lieu qu'on habite ; les mini-jeux sont des
   portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et l'architecture doit rester
   durablement gratuite : un quota peut interrompre le service, jamais déclencher une facturation.

---

## 1. Le projet

Next.js 14 (App Router, **JavaScript pur, pas de TypeScript**) + Supabase (auth, Postgres,
Realtime) + Vercel. Salons à code partagé, 23 jeux, scores synchronisés.

**La ferme** (`GAME_ID = "ferme"`) est un monde partagé persistant, ~99 % du trafic réseau.
**Valley Town** en est la seconde carte, multijoueur, atteinte par le train ; **l'intérieur du
tribunal** en est la troisième. **`candyluge`** est une descente 3D solo en three.js.
**`crystal`** est un jeu narratif solo à rastériseur logiciel.

---

## 2. Travailler avec Guillaume

- **Avant toute production créative, poser des questions.** C'est la consigne la plus souvent
  oubliée. Pour tout changement important, **LISTER les décisions structurantes et ATTENDRE**.
- **Il aide volontiers si on demande** (il a installé `node` en cours de session au 425).
  **Demander tôt plutôt que de contourner.**
- ⚠️ **NE PAS SAISIR SES IDENTIFIANTS**, même proposés. Ils ne débloquent d'ailleurs rien en
  local : le Supabase local est factice (§10).
- **Ne pas mêler deux changements visuels dans la même livraison** (décision du 424) : il ne
  peut plus juger lequel a produit quoi. ⚠️ **Levée par lui pour la feuille de route graphique de
  Valley Town (2026-09-25)** : là, une phase se livre d'un bloc. Partout ailleurs, la règle tient.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée, un
  piège — avec le numéro de zip. C'est la mémoire longue du projet.
- **« caveman on »** inverse le contrat : exécuter, vite et bien, sans questions ni
  préambule. « caveman off » rétablit. Accuser réception en une ligne.
- ⚠️⚠️ **FIN DE LIVRAISON : METTRE CE FICHIER À JOUR FAIT PARTIE DE LA LIVRAISON, ÇA NE SE
  PROPOSE PAS** (ordre de Guillaume au 449 : « à toujours opérer quand tu finis un delivery »).
  La formulation d'avant disait « sur demande », et c'est ce qui a fait proposer au lieu de faire.
  ⚠️ **Dans cet ordre** : (1) réécrire le bloc **⏭️ REPRISE** en tête — il se REMPLACE, il ne
  s'empile pas, et il désigne UNE action suivante ; (2) faire la passe d'élagage (§14, `docs/ENTRETIEN.md`) **avant**
  d'ajouter quoi que ce soit ; (3) n'inscrire que la **LEÇON** d'un défaut, jamais son histoire —
  celle-ci va en commentaire de code avec le n° de zip, ou dans le README du module concerné.
  **Commits et push restent à
  Guillaume** (GitHub Desktop). **Dire si une manipulation Supabase est nécessaire — et le dire
  aussi quand elle ne l'est pas.**
- **Règle dure : aucune migration SQL ni changement de schéma sans validation préalable.**

| Quoi | Où |
|---|---|
| Récit d'une étape | **en tête du README** |
| Le *pourquoi* d'une ligne, un piège local | **commentaire de code**, avec le n° de zip |
| Objectif, contraintes, avancement, TITRES des pièges, routeur | **ce fichier** (noyau court) |
| Récits complets des pièges, vérification, images, carte, jugements en attente | **`docs/`** (voir la table du §5 à 13) |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…) : `docs/` est le seul dossier de docs transverses.

⚠️⚠️ **EXCEPTION DATÉE À LA RÈGLE CI-DESSUS : `AGENTS.md`, À LA RACINE, N'EST PAS UN DOC DE PLUS —
C'EST LE POINT D'ENTRÉE DE CODEX, L'AGENT QUI PREND LE RELAIS SUR CE DÉPÔT QUAND CE N'EST PAS
CLAUDE CODE.** Guillaume l'a déjà posé, volontairement vide de contenu projet : il dit seulement
« lis `CLAUDE.md` en entier avant toute action, applique ses instructions » et « n'ajoute aucun
contexte projet ici ». **Ne JAMAIS l'étoffer** — le jour où `AGENTS.md` porterait sa propre
version des pièges/leçons/état d'avancement, ce fichier-ci cesserait d'être la source unique, et
les deux divergeraient exactement comme le §4 le décrit pour deux cartes sans repère commun. Trois
règles, symétriques dans les deux sens :
1. **Codex lit CE fichier en entier avant d'agir**, exactement comme le demande la première ligne
   de ce document — `AGENTS.md` ne fait que le rediriger ici, il ne le remplace pas.
2. **Codex met CE fichier à jour en fin de livraison, EN SUIVANT SON PROPRE §14** — français,
   dense, le bloc ⏭️ REPRISE qui se REMPLACE et ne s'empile jamais, la passe d'élagage avant
   d'ajouter, la LEÇON seule (jamais son histoire). Rien de spécifique à Codex (nom d'un outil,
   d'un mode d'exécution, d'un détail de sandbox) n'a sa place ici : ce fichier reste lisible et
   actionnable par n'importe quel agent, Claude compris à la reprise suivante.
3. **Une session Claude qui reprend après Codex ignore `AGENTS.md`** — il n'est jamais lu
   automatiquement par Claude Code, et il ne contient de toute façon aucun fait projet à perdre.
   Seul CE fichier fait foi, pour Claude comme pour Codex, dans les deux sens de la passation.

⚠️ **UN AUTRE RISQUE, PUREMENT MÉCANIQUE : DEUX AGENTS SUR LE MÊME ARBRE DE TRAVAIL NON COMMITÉ.**
Ni Claude ni Codex ne commit ni ne push de sa propre initiative (règle ci-dessus, inchangée) — donc
un arbre de travail peut rester durablement modifié entre deux sessions. **Avant de faire démarrer
l'un après l'autre, vérifier `git status`/`git diff`** : l'agent qui commence une session doit
comprendre ce qui est déjà là (souvent le travail non revu de l'agent précédent, décrit dans le
bloc ⏭️ REPRISE) avant d'y toucher, jamais le nettoyer ou l'écraser sans le comprendre.

⚠️ **CODEX COMME AGENT SECONDAIRE, DANS LA MÊME CONVERSATION — SEULEMENT SUR UN GROS CHANTIER.**
Guillaume utilise ponctuellement Codex (GPT-5.1, dans le rôle Sol ou Terra) en appoint de Claude
Code, pour délester des tests longs, de l'orchestration ou un audit indépendant et économiser des
tokens côté Claude. **Sur un gros chantier** (audit large, batterie de tests, tâche parallélisable
qui coûterait cher en tokens) : Claude DEMANDE si Codex est disponible avant de s'engager. **Sur
tout le reste : Claude travaille seul, sans le demander** — ce n'est pas une question systématique
en début de conversation. Si Guillaume confirme la disponibilité de Codex, Claude rédige lui-même
le prompt de passation, avec précision : portée exacte, fichiers concernés, format de retour
attendu — et il couvre le risque du paragraphe ci-dessus (arbre non commité partagé) pour que le
travail circule sans accroc de Claude à Codex et de Codex à Claude.
⚠️ **L'ASPECT GRAPHIQUE RESTE ENTRE LES MAINS DE CLAUDE CODE, MÊME SUR UN GROS CHANTIER.** Dessin
procédural (`fermeArt.js`, `maireBureau.js`…), règles de `DESSIN.md`, tout jugement visuel : ne
JAMAIS déléguer à Codex, quelle que soit la taille du chantier. Codex reste cantonné aux tests,
à l'orchestration et à l'audit non visuel.
⚠️ **SPRITE COMPLEXE NOUVEAU (végétation, infrastructures de ville…) : PROPOSER UN PROMPT GEMINI,
JAMAIS L'APPELER SOI-MÊME.** Quand le décor à créer n'existe pas encore et sort du procédural
simple (une haie, un pont, un bâtiment détaillé — pas une teinte ou un décalage de pose), Claude
rédige un prompt prêt à coller dans Gemini, accompagné d'une ou plusieurs images de référence
(Gemini rend mieux avec référence que texte seul) — et **s'arrête là** : c'est Guillaume qui colle
le prompt et récupère le résultat, pas un appel API automatisé. L'intégration du PNG obtenu suit
ensuite la même rigueur que tout asset bitmap (§9) : regardé à l'écran le jour de sa livraison,
chargeur/cache/nommage posés au premier usage.

---

## 3. Contraintes réseau — avant de toucher au moindre `send()`

- **L'hôte est l'autorité, toujours.** L'invité émet un `req`, l'hôte arbitre, rediffuse un
  `apply`.
- **Plafond dur de 10 messages/s par client** (`eventsPerSecond`). Dépassement
  **silencieux** ; depuis le 419 un `console.warn` le signale.
- **Facturation** : 1 broadcast = 1 message + 1 par client abonné. **Seul le nombre de
  `send()` compte, jamais la taille des payloads.**
- **La ferme est le seul canal en `self:false`** ; écho local à la main (`broadcastChat`).
- **Ne jamais comparer une horloge hôte à une horloge invité.** Dater à la réception.
- **Quota : 2 M messages/mois, Supabase Free avec spend cap activé**, déjà dépassé une fois —
  d'où `lib/realtimeQuota.js`. Ne jamais désactiver le spend cap.
- ⚠️ **CE QUI PEUT SE DÉDUIRE NE SE DIFFUSE PAS.** L'altitude d'un joueur en ville se lit
  sous ses pieds ; son ÉTAGE dans le tribunal se lit dans son `y` (§6). Un champ de plus,
  c'est surtout un champ à réconcilier.
- ⚠️ **UNE PENDULE SE DIFFUSE COMME UN ÉTAT — ce qui reste, qui est au trait, depuis quand — DANS
  LE MESSAGE QUI PART DÉJÀ À CHAQUE COUP, jamais en tops périodiques** (échecs, 2026-09-24 : plus
  aucun message `clock`, et la précision passe de ±1 s par coup à la milliseconde). Seules des
  DURÉES traversent le réseau ; chaque client date à la réception.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

⚠️ **TITRES SEULS ICI ; RÉCITS COMPLETS dans `docs/PIEGES.md`** (sortis du noyau le 2026-10-03). Un titre est un
DÉCLENCHEUR : s'il ressemble à ce qu'on est en train d'écrire, on ouvre son récit (`grep -n "DÉBUT DU TITRE" docs/PIEGES.md`)
avant d'éditer. Ailleurs, à côté de ce qu'ils décrivent : les pièges de la ferme, de la ville et du tribunal
(`components/ferme/README.md` §15), du GÉNÉRATEUR (§15 bis du même fichier), les règles de DESSIN (`components/ferme/DESSIN.md`).

<!-- pieges:début -->
- DEUX CARTES SANS REPÈRE COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que quand la plus petite ne tient plus dans la grande.
- La parade est UNE position taguée par sa zone, jamais deux jeux de coordonnées — et on teste la zone AVANT les distances.

**Conception — vrai partout**

- UN CONTRÔLE QUI COMPARE UNE MESURE À LA CONSTANTE QU'ELLE DOIT TENIR SUIT LA CONSTANTE
- UN RÉGLAGE EN PIXELS D'ART NE SE LIT PAS SUR UNE IMAGE EN PIXELS D'ÉCRAN
- UNE OPTION DE CATALOGUE QUE PERSONNE NE LIT EST UN MENSONGE DE DOCUMENTATION
- UNE SURFACE QUI REVIENT TOUT LE TEMPS À L'ÉCRAN NE SE JUGE PAS SUR LA PLANCHE DU BANC
- UNE GRANDEUR DE DESSIN NE DOIT PAS ENTRER DANS LA COLLISION
- UNE MÊME GRANDEUR ÉCRITE À SEPT ENDROITS RESTE JUSTE JUSQU'AU JOUR OÙ ELLE EST FAUSSE — ET ALORS ELLE EST FAUSSE SEPT FOIS
- UN SPRITE N'A PAS DE SENS INTERDIT, IL A UN SENS DESSINÉ
- UNE PROPORTION N'EST PAS UNE DIMENSION, ET AUCUN BANC DU DÉPÔT NE MESURE UN RAPPORT ENTRE DEUX MORCEAUX
- UNE TAILLE SE LIT CONTRE SES VOISINES : AGRANDIR LES VOISINS RAPETISSE CE QUI N'A PAS BOUGÉ
- UN OBJET POSÉ SE PLACE PAR LA PORTÉE DU PLUS PETIT, PAS PAR L'ASPECT DU MEUBLE VU DE HAUT
- UN PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER
- UNE CONDITION DE PROXIMITÉ DOIT MESURER CE QUE L'ACTION MESURE, PAS UNE APPROXIMATION QUI SUPPOSE QU'ON PEUT S'EN APPROCHER
- UN RÉSOLVEUR QUI ÉCRIT UN CHAMP NEUF DOIT ÊTRE LIVRÉ DANS LE MÊME GESTE QUE SA DÉCLARATION *ET* SA MIGRATION
- UN GARDE-FOU POSÉ SUR LA DEMANDE NE TIENT RIEN QUAND LES DEMANDES SONT PARALLÈLES
- UN REPLI `|| "quelque chose"` SUR UNE TABLE DE LIBELLÉS EST UN STUB MENTEUR
- UNE CONDITION RECOPIÉE À LA MAIN À CÔTÉ DU PRÉDICAT QUI LA NOMME A DÉJÀ DIVERGÉ
- UN COMPTEUR RAFRAÎCHI SEULEMENT PAR DES ÉVÉNEMENTS PONCTUELS MENT POUR QUI ARRIVE APRÈS
- DÉPLACER UNE PORTE DE CHRONOLOGIE DANS UN RÉSOLVEUR SANS RELIRE LES PORTES D'INTERFACE QUI Y MÈNENT FERME UN CERCLE QUE TOUS LES BANCS VOIENT VERT
- UNE CARTE QU'ON REGÉNÈRE DEPUIS SA GRAINE NE SUPPORTE AUCUN TIRAGE DE PLUS, ET UN INTERDIT DE PLACEMENT SE TIENT DES DEUX CÔTÉS
- UNE CASE À DEUX SOLS (un pont qu'on passe dessus ET dessous) : `elev` y reste le SOL, et le niveau d'un marcheur se DÉDUIT de son pas précédent
- UNE TRANSITION QUI SE VOIT SE FAIT PAR UN ORDRE AU PIXEL OU PAR UNE DURÉE, JAMAIS PAR UN SEUIL COMMUN
- UN GARDE-FOU « RIEN À FAIRE UNE FOIS FINI » DOIT ÊTRE REPRIS À L'ENDROIT EXACT OÙ IL COUPE, LE JOUR OÙ « FINI » GAGNE UNE SUITE
- UN DESSIN POSÉ PAR-DESSUS LE SOL N'EXISTE PAS POUR LA MÉTÉO TANT QU'IL NE PUBLIE PAS SES CREUX
- UNE GRANDEUR INTÉGRÉE SUR UNE FENÊTRE QUI REPART DE ZÉRO MONTE EN DENT DE SCIE : SEUILLÉE, ELLE BASCULE CHAQUE JOUR
- UN CHAMP `id` DANS UNE `req` EST ÉCRASÉ PAR L'EXPÉDITEUR
- UNE GARDE D'AUDIENCE À L'ÉMISSION ET UNE INSCRIPTION QUI NE SE FAIT QU'À LA RÉCEPTION FONT UN SILENCE MUTUEL QUI NE SE ROMPT JAMAIS

**JavaScript / three.js / canevas**

- UN COMMENTAIRE QUI DIT « BORNÉ À [0,1] » N'EST VRAI QUE SI LE CODE CLAMPE — UN RETOUR ANTICIPÉ À CHAQUE EXTRÉMITÉ N'EST PAS LA MÊME CHOSE
- UN BOOLÉEN MIS EN CACHE POUR UNE VALEUR NATIVE VOLATILE (`document.hidden`) NE SE RESYNCHRONISE QUE SUR L'ÉVÉNEMENT QUI LE MET À JOUR — JAMAIS TOUT SEUL
- UN COMPOSANT DÉCLARÉ DANS LE RENDU D'UN AUTRE EST UN TYPE NEUF À CHAQUE RENDU : REACT REMPLACE TOUS SES NŒUDS DOM
- UN EFFET MONTÉ UNE FOIS (le canal réseau) VOIT POUR TOUJOURS L'ÉTAT DE SON PREMIER RENDU
- UNE BLESSURE QUI REFUSE LES NOUVELLES ENTRÉES NE LÂCHE PAS LES TOUCHES DÉJÀ TENUES
- UNE FONCTION DÉCLARÉE DANS LA CLOSURE DE LA BOUCLE DE RENDU N'EXISTE PAS POUR LE COMPOSANT
- ET L'INVERSE : UNE FONCTION DU COMPOSANT EST MASQUÉE PAR UNE VARIABLE DU MÊME NOM DANS LA BOUCLE
- UN MOTIF DE SOL SE JUGE ASSEMBLÉ, ET SA PÉRIODE COMPTE PLUS QUE SES DÉTAILS
- UN ÉTALEMENT `{ ...table }` RECOPIE LES RÉFÉRENCES DE SES TABLEAUX : UNE TABLE DE RÉFÉRENCE QU'ON ÉTALE À PLAT EST UNE TABLE QU'ON MODIFIE
- UN EFFET REACT DONT LE NETTOYAGE A UN EFFET DE BORD SE DÉCLENCHERA AU DÉMONTAGE QU'ON N'AVAIT PAS PRÉVU
- UNE ANIMATION CSS NE REDÉMARRE PAS PARCE QU'ON AJOUTE UNE CLASSE À UN NŒUD DÉJÀ MONTÉ
- UN SÉLECTEUR CSS REDÉCLARÉ PLUS BAS DANS LA FEUILLE NE COMPLÈTE PAS LE PREMIER, IL LE CORRIGE
- UN `max-width:calc(100vw − Npx)` SUPPOSE UN VIEWPORT LARGE, ET DEVIENT NÉGATIF EN DESSOUS — LE MOTEUR RAMÈNE ALORS LA VALEUR À 0, SANS ERREUR
- UN CONTRÔLE DE TAILLE QUI COMPTE L'ALPHA MESURE LE HALO, PAS L'OBJET
- UN BANC QUI CHERCHE UN NOM D'APPEL MESURE UNE ÉCRITURE, PAS UN AFFICHAGE
- `chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.
- UNE CLÉ EN DOUBLE DANS UN LITTÉRAL NE LÈVE RIEN : LA SECONDE GAGNE
- `x | 0` SUR UN HORODATAGE EN MILLISECONDES LE TRONQUE À 32 BITS : UN ENTIER QUELCONQUE, PARFOIS NÉGATIF, QUI NE SE COMPARE PLUS À `Date.now()`
- UNE BORNE DE BOUCLE RECALCULÉE À CHAQUE TOUR SUR CE QUE LA BOUCLE MODIFIE S'ARRÊTE TROP TÔT, SANS ERREUR
- UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT
- UN EFFET QUI SE DESSINE AILLEURS QUE SON OBJET (un reflet, une ombre longue) N'EXISTE QUE SI LA FILE DE DESSIN CONNAÎT L'OBJET HORS CADRE
- UN DESSIN REJOUÉ EN OMBRE REJOUE AUSSI SES DÉCALAGES DE HAUTEUR : LE CORPS MONTE, SON OMBRE DOIT RESTER AU SOL
- UN ÉTAT QU'ON RETIRE QUAND SA TAILLE CHANGE SE RETIRE À CHAQUE IMAGE D'UN FONDU
- `floor(t × cadence)` AVEC `t` ABSOLU ET UNE CADENCE QUI VARIE TIRE UNE IMAGE AU HASARD
- UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.
- UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE
- `ctx.drawImage` À 9 ARGUMENTS PREND UN RECTANGLE SOURCE EN PLUS DE LA DESTINATION — LES DEUX N'ONT PAS LE MÊME REPÈRE
- `ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR
- À ÉCHELLE NON ENTIÈRE, LE NAVIGATEUR LISSE LES BORDS D'UN `drawImage`, MÊME `imageSmoothingEnabled` COUPÉ
- UN `onLoad` D'IFRAME PROUVE QUE LE DOCUMENT S'EST OUVERT, JAMAIS QUE SON CONTENU EST VALIDE
- TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.
- `Array.prototype.sort` EST STABLE, MAIS UN ORDRE DE DESSIN NE SE FONDE PAS DESSUS
- `stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE
- UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.
- `*/` DANS UN COMMENTAIRE DE BLOC LE FERME
- `Pix.rng(graine)` rend un générateur INDÉPENDANT
- `crystal` n'affiche AUCUNE image
- La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.
- Rendre un objet invisible ne le retire pas du monde.

<!-- pieges:fin -->

---

## 5 à 13. SORTIS DANS `docs/` — NUMÉROS CONSERVÉS (2026-10-03)

Tout « §N » cité dans le code, les README et les bancs reste valable : on le résout par cette table.

| § | Sujet | Fichier |
|---|---|---|
| 4 | pièges, récits complets | `docs/PIEGES.md` |
| 5 · 6 · 7 · 12 | carte du territoire (rôle de chaque fichier), Valley Town (orientation), `candyluge`, vocabulaire | `docs/CARTE.md` |
| 8 · 9 · 11 | qualité d'image (méthode de mesure), Blender et bitmaps (pipeline C), modes 3D autonomes ; **notes d'intégration d'image** | `docs/IMAGES-ET-BLENDER.md` |
| 10 | vérification : bancs, jouer en local, automatisation du navigateur, « ce qui n'existe pas » | `docs/VERIFICATION.md` |
| 13 · REPRISE « Toujours ouvert » | ce qui attend un jugement humain | `docs/A-JUGER.md` |
| — | projets décidés, pas commencés (catalogue Garfield, création du personnage, iPad, place hors hiver, piscine) | `docs/PROJETS.md` |
| 14 | maintenir ce fichier (règles et leçons complètes) | `docs/ENTRETIEN.md` |
| — | audit 2026-10 : graphismes (ferme, ville, intérieurs), fluidité à deux, corrections FIX-… | `docs/AUDIT-2026-10.md` |

## 14. Maintenir ce fichier — RÉSUMÉ (règles et leçons complètes : `docs/ENTRETIEN.md`, à lire en fin de livraison)

1. **Remplacer, ne jamais empiler.** Le bloc REPRISE se remplace ; une information périmée se supprime.
2. **Le noyau reste COURT** : `tools/verify-docs.mjs` échoue au-dessus de 350 lignes. Ce qui grossit va dans `docs/` ou dans le
   README du module — passe d'élagage AVANT d'ajouter.
3. **Un piège neuf** : le récit dans `docs/PIEGES.md`, son TITRE dans la liste du §4 ci-dessus (`verify-docs` tient les deux).
4. **Une ligne neuve du routeur** désigne des fichiers qui existent (`verify-docs` le vérifie).
5. Critère d'inclusion : vrai à l'échelle du projet ET invérifiable en ouvrant un seul fichier ; sinon, commentaire de code.
   Seule la LEÇON d'un défaut est écrite, jamais son histoire. Dire ce qui n'est PAS fait. **Tout chiffre de banc a été obtenu en le lançant.**
