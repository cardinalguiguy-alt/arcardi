# CLAUDE.md — CONTEXTE ARCARDI

**Lis ce fichier en entier avant toute action. Puis arrête de lire et demande.**
Il remplace l'exploration du dépôt pour tout ce qui est global. Le README est un journal
chronologique inversé : c'est de l'**histoire**, pas de l'orientation.

---
## ⏭️ REPRISE — SI GUILLAUME DIT SEULEMENT « REPRENDS LE TRAVAIL », C'EST ICI

⚠️⚠️⚠️ **CE BLOC EST LE SEUL ENDROIT DU FICHIER QUI DÉSIGNE UNE ACTION SUIVANTE.** Il se
REMPLACE à chaque fin de livraison, il ne s'empile jamais. *Un fichier qui contient tout ne dit
rien tant qu'il ne dit pas par quoi commencer.*

⚠️⚠️ **LE PIPELINE PNG DE L'HÔTEL DE VILLE EST CONFIRMÉ KEEPER (hors-zip 2026-09-02).** Guillaume,
en autorisant le chantier suivant : « nous referons le tribunal comme nous avons refait le Town
hall ». Détail du pipeline (deux calques day/glow, le piège du calque-lueur non enregistré comme
source de lumière, le piège de la clé de tri sur un perron traversable) : `components/ferme/README.md`,
section « l'hôtel de ville en PNG confirmé ». `townHall2Sprite` (l'ancien canevas procédural, sans
appelant) reste à retirer au prochain passage qui touche ce fichier.

⚠️⚠️ **CETTE MÊME SESSION A CORRIGÉ DEUX DÉFAUTS TROUVÉS EN JOUANT, VÉRIFIÉS EN NAVIGATEUR ET PAR
LES BANCS — DÉTAIL DANS `components/ferme/README.md`, MÊME SECTION :**
1. **Le E du perron de l'hôtel de ville s'activait depuis le parvis, pas depuis la porte**
   (`nearCivicDoor` ignorait `TOWN_HALL_STEP_ROWS`, seul bâtiment à perron traversable). Corrigé.
2. **Le bloc d'escalier sous le tribunal — corrigé en DEUX passes, et la première avait tort sur
   les deux points.** Une première passe avait conclu « collision saine, la couleur seule est en
   cause » et livré un correctif de teinte. Guillaume a rejoué : « toujours un problème majeur de
   couleur […] on dirait qu'il y a un filtre » — et a montré une vraie collision fautive (un
   poteau qui bloque là où « une vision en perspective » dit que c'est dégagé). Les deux
   jugements de la première passe étaient faux. ⚠️ *Un banc qui teste SI un mur bloque ne dit rien
   de SI il bloque au bon endroit.* Détail des deux vraies causes (un poteau peint à x≈140,
   collision posée à x=141 ; deux désaturations empilées qui produisaient le « filtre ») et de
   leur correctif : `components/ferme/README.md`, même section. `render-escaliers` **35/35**
   (dont un contrôle neuf sur la rambarde, qui avait perdu 100 % de son opacité au premier
   correctif sans qu'aucun banc ne le voie), `verify-collision` **TOUT PASSE**, `verify-vallee`
   **223/223**, `next build` **✓ Compiled successfully**. Vérifié en superposant l'emprise de
   chaque poteau au bitmap affiché, pas en approchant seulement pour voir si ça bloque.

⚠️⚠️ **L'ÉCHELLE DES TROIS MONUMENTS CIVILS EST FAITE : +10 %, VISUEL SEUL, LES TROIS VÉRIFIÉES EN
JEU.** Guillaume a tranché court : « +10 pour les bâtiments officiels (pas maisons) […] assure-toi
que ça ne crée aucun problème visuel, ni de bug pour l'entrée, ou de collision ». `drawCivic`
(église, tribunal) et `drawTownHallBitmap` (mairie) grossissent leur dessin de 10 % dans un
`ctx.save()/scale/restore()` ancré sur le point de contact au sol — l'emprise, `nearCivicDoor` et
la clé de tri ne bougent pas d'un bit. Détail, chiffres et vérification aux trois portes :
`components/ferme/README.md`, même section.

⚠️⚠️⚠️ **ACTION SUIVANTE UNIQUE : LA VILLA, MÊME PIPELINE QUE L'HÔTEL DE VILLE.** Réf.
`refs/grandevilladeriches.png`, prompt Gemini avec référence (jamais d'appel API direct — §2),
puis retirer `townHall2Sprite` (canevas procédural devenu sans appelant). **Ensuite seulement** :
l'ombre portée dirigée générale (`drawCivic`, tous les bâtiments procéduraux) — correctif suivant
de la liste posée le 2026-09-02 matin (route → ombre → redessin → collisions → casseur de période
→ variantes), toujours en attente, non touché par cette session.
---

## 0. L'objectif de Guillaume — ce à quoi tout se mesure

**Une soirée de jeu entre amis, à deux ou trois, qui donne envie d'y revenir.** Arcardi n'est
pas une plateforme : c'est un salon qu'on ouvre un vendredi soir avec un code partagé. Tout
arbitrage se fait contre ce chiffre — **2 joueurs, occasionnellement 3**.

1. **La qualité avant le nombre.** 22 jeux existent ; ce qui compte est qu'un jeu donné soit
   *fini*. Depuis le 421, l'exigence est explicitement **AAA**.
2. **Le monde partagé est le cœur.** La ferme est un lieu qu'on habite ; les mini-jeux sont des
   portes qui s'y ouvrent, jamais des applications séparées.
3. **Rien ne doit casser pour les autres.** Le multijoueur est fragile et gratuit (§3).

---

## 1. Le projet

Next.js 14 (App Router, **JavaScript pur, pas de TypeScript**) + Supabase (auth, Postgres,
Realtime) + Vercel. Salons à code partagé, 22 jeux, scores synchronisés.

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
  peut plus juger lequel a produit quoi.
- **Commentaires systématiques** partout où il y a un *pourquoi*, une hypothèse écartée, un
  piège — avec le numéro de zip. C'est la mémoire longue du projet.
- **« caveman on »** inverse le contrat : exécuter, vite et bien, sans questions ni
  préambule. « caveman off » rétablit. Accuser réception en une ligne.
- ⚠️⚠️ **FIN DE LIVRAISON : METTRE CE FICHIER À JOUR FAIT PARTIE DE LA LIVRAISON, ÇA NE SE
  PROPOSE PAS** (ordre de Guillaume au 449 : « à toujours opérer quand tu finis un delivery »).
  La formulation d'avant disait « sur demande », et c'est ce qui a fait proposer au lieu de faire.
  ⚠️ **Dans cet ordre** : (1) réécrire le bloc **⏭️ REPRISE** en tête — il se REMPLACE, il ne
  s'empile pas, et il désigne UNE action suivante ; (2) faire la passe d'élagage du §14.2 **avant**
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
| Objectif, contraintes, pièges globaux, avancement | **ce fichier** |

Jamais de fichier de doc autonome à la racine (`AUDIT-X.md`, `NOTES.md`…).

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
- **Quota : 2 M messages/mois, plan gratuit**, déjà dépassé une fois — d'où
  `lib/realtimeQuota.js`.
- ⚠️ **CE QUI PEUT SE DÉDUIRE NE SE DIFFUSE PAS.** L'altitude d'un joueur en ville se lit
  sous ses pieds ; son ÉTAGE dans le tribunal se lit dans son `y` (§6). Un champ de plus,
  c'est surtout un champ à réconcilier.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

⚠️⚠️ **CE CHAPITRE A ÉTÉ SCINDÉ AU 431, SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 430.** Les pièges
de la FERME, de la VILLE et du TRIBUNAL sont partis dans **`components/ferme/README.md`**, qui
fait déjà autorité sur ce code — ils y sont **à côté de ce qu'ils décrivent**, et ce chapitre
avait atteint cent lignes en mélangeant deux sujets sans rapport. ⚠️ **Il a été scindé DEUX fois
depuis** — le DESSIN au 441 (`components/ferme/DESSIN.md`), le GÉNÉRATEUR au 449
(`components/ferme/README.md` §15 bis). Il ne reste ici que ce qui est vrai à l'échelle du
projet : la **CONCEPTION**, et le **LANGAGE** (JavaScript, three.js, canevas).

⚠️ **UN PIÈGE A ÉTÉ SUPPRIMÉ PLUTÔT QUE DÉPLACÉ, ET C'EST LE POINT DE LA VÉRIFICATION** : « la
boucle de nuages tourne à vide (`SKY_CLOUD_COUNT: 0`) » ne correspondait plus à rien — le
symbole n'existe nulle part dans le dépôt. Le §14.2 le disait : *un piège périmé recopié
ailleurs est pire qu'un piège supprimé.*

⚠️⚠️ **ET UN SEUL EST RESTÉ ICI BIEN QU'IL PARLE DES CARTES, parce qu'il a été payé QUATRE
fois** (425, 427, 430, 431) et qu'il touche l'architecture entière : **DEUX CARTES SANS REPÈRE
COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que quand la plus petite ne tient plus dans
la grande.** Dernière occurrence au 431, la plus chère : le rectangle du marché de la VILLE
tombe aussi au milieu des champs de la FERME, donc le contrôle « je suis au marché » passait
depuis un pré. **La parade est UNE position taguée par sa zone, jamais deux jeux de
coordonnées — et on teste la zone AVANT les distances.**

**Dessin — voir `components/ferme/DESSIN.md`**

⚠️⚠️ **CE BLOC EST PARTI AU 441, SUR L'ORDRE DU §14.2 DU 440 (reporté deux fois).** Les treize
règles de dessin — on assemble des masses et on ne texture pas une silhouette, une courbe `f(x)`
ne se replie pas, la période prime sur les détails, une position réglée à la main penchera, un
cerne sert aussi sur fond clair, un sprite haut contre le mur du fond avale ce qui passe
devant… — vivent désormais **à côté des dessins qu'elles gouvernent**. Rien n'a été recopié.
⚠️⚠️ **ET LA PHRASE QUI SUIVAIT ICI EST DEVENUE FAUSSE AU 449, PAR LE DÉPLACEMENT SUIVANT.** Elle
disait que « la case d'un décor n'est pas la surface qu'il couvre » restait ici parce que c'est une
règle du GÉNÉRATEUR et non du dessin — vrai au 441, périmé depuis que le générateur est parti à son
tour au §15 bis de `components/ferme/README.md`. *Un déplacement laisse toujours derrière lui une
phrase qui explique pourquoi quelque chose n'a pas bougé ; c'est elle qu'il faut relire en dernier.*


**Conception — vrai partout**

⚠️⚠️ **LES CINQ PIÈGES DU GÉNÉRATEUR SONT PARTIS AU 449, SUR L'ORDRE DU §14.2 DU 444** (reporté
quatre fois) : la case d'un décor, la liste noire, la passe qui pave, le second de quelque chose,
la variante de décor. Ils décrivent tous `generateTownWorld` et vivent désormais **à côté de lui**,
au **§15 bis de `components/ferme/README.md`** — même geste qu'au 431 (les zones) et au 441 (le
dessin). ⚠️ **Rien n'a été recopié, et un DOUBLON a été supprimé** : « une variante de décor est
une couche » était écrit deux fois dans ce chapitre, une fois court et une fois long.
⚠️ **Ce qui suit est resté exprès** : ce ne sont pas des règles de générateur, ce sont des règles
de conception qui valent pour n'importe quel morceau du dépôt.

- ⚠️⚠️ **UNE GRANDEUR DE DESSIN NE DOIT PAS ENTRER DANS LA COLLISION** (439). L'arc du pont ajouté
  à `playerElevTown` aurait été trois lignes plus court et aurait rendu les deux ponts
  **infranchissables** (`canStandTown` refuse tout pas au-delà de `TOWN_STEP_MAX`) : on aurait
  livré un mur en croyant dessiner une bosse, et le symptôme n'aurait ressemblé en rien à sa cause.
  Deux fonctions qui se ressemblent assez pour qu'on les confonde doivent porter la différence
  dans leur NOM, et un banc doit tenir les deux moitiés séparément.
- ⚠️⚠️⚠️ **UNE MÊME GRANDEUR ÉCRITE À SEPT ENDROITS RESTE JUSTE JUSQU'AU JOUR OÙ ELLE EST FAUSSE —
  ET ALORS ELLE EST FAUSSE SEPT FOIS** (2026-09-01). La semelle du personnage était recopiée dans
  `canStand`, `canStandMounted`, `canStandTown`, `townCanStand`, `canStandEvil`, `E.townBoxFree` et
  `verify-vallee` : sept copies identiques, donc sept fois le même décalage d'une demi-case par
  rapport au sprite. ⚠️ **Et le pire n'est pas la recopie, c'est la COMPENSATION** : vingt-huit
  autres endroits lisaient « la case sous ses pieds » avec le même décalage, si bien que les deux
  erreurs s'annulaient à peu près. *Corriger une moitié d'une paire d'erreurs qui se compensent
  casse ce qui marchait ;* les deux se corrigent dans le même geste, ou pas du tout.
- ⚠️⚠️ **UN SPRITE N'A PAS DE SENS INTERDIT, IL A UN SENS DESSINÉ** (2026-09-01). Une murette de
  42 px de large posée sur une file NORD-SUD couvre 2,6 cases pour une case de collision : vu en
  jeu, elle mange 0,8 case de sol praticable de chaque côté et le joueur passe DERRIÈRE un mur
  qu'il traverse. Deux parades, et il faut choisir : un dessin CARRÉ (qui n'a pas d'orientation)
  ou la TRANSPOSITION du dessin d'origine — *une haie qui tourne d'un quart de tour ne change pas
  de matière, elle change d'axe* (`townHedge.v`, transposée pixel à pixel de `hedgeMid` : même
  palette, elle boucle en y parce que la source boucle en x, et la lumière reste cohérente).
- ⚠️⚠️⚠️ **UNE PROPORTION N'EST PAS UNE DIMENSION, ET AUCUN BANC DU DÉPÔT NE MESURE UN RAPPORT
  ENTRE DEUX MORCEAUX** (Tristan le 2026-09-01, le maire le 2026-09-02). Les deux personnages
  articulés du jeu ont été livrés avec une tête trop grosse — 43 % de la carrure pour l'un, **47 %**
  pour l'autre, contre 34 % chez un humain — et les deux fois le banc restait au vert : il comptait
  les postures, les îlots, les mains, jamais un RAPPORT. Guillaume l'a vu en jouant, deux fois, avec
  le même mot (« on dirait un pantin »). ⚠️ **La parade est de DÉRIVER le corps d'une seule
  grandeur** : six étages en fraction de la stature qui somment à 1, d'où tombent les quatorze
  longueurs. La stature devient alors un réglage au lieu d'être quatorze occasions de se tromper —
  et le banc peut enfin comparer la stature RENDUE à la stature ÉCRITE, ce qui est la seule façon
  qu'un nombre appelé « taille » décrive vraiment quelque chose.
- ⚠️⚠️ **UN OBJET POSÉ SE PLACE PAR LA PORTÉE DU PLUS PETIT, PAS PAR L'ASPECT DU MEUBLE VU DE
  HAUT** (2026-09-02). Le jour où les cinq maires ont eu cinq tailles, le tampon du bureau s'est
  retrouvé à 64 cm de l'épaule d'une femme dont le bras en fait 56 — et une cinématique inverse
  BORNE une cible hors de portée au lieu de la refuser : la main s'arrêtait à neuf centimètres de
  l'objet, en silence, sur le geste qui conclut l'entretien. ⚠️ Corollaire, payé dans la même
  séance : *quand un geste demande un effort anormal, c'est l'objet qu'il faut regarder, pas la
  posture* — les 0,21 radians de penchant n'existaient que pour rattraper un objet mal posé.
- ⚠️⚠️ **UN PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER** (439). Un dialogue, un tableau, une
  plaque s'ouvrent avec E sans limite et sans arbitrage de l'hôte : tout ce qu'ils rendent doit
  être de l'INFORMATION ou une valeur DÉRIVÉE (une date, un cours). Ce qui récompense passe par une
  `req` arbitrée par l'hôte, comme la vente au marché. *La porte n'est jamais la caisse.*

**JavaScript / three.js / canevas**
- ⚠️⚠️⚠️ **UN BOOLÉEN MIS EN CACHE POUR UNE VALEUR NATIVE VOLATILE (`document.hidden`) NE SE
  RESYNCHRONISE QUE SUR L'ÉVÉNEMENT QUI LE MET À JOUR — JAMAIS TOUT SEUL** (hors-zip, 2026-09-01,
  bug « gels de PNJ chez l'invité », §13 item n°1, six tentatives, jamais diagnostiqué avant).
  `netCanBroadcast()` lisait `hiddenRef.current`, écrit UNE fois au montage puis à chaque
  `visibilitychange` — jamais ailleurs. Si le composant montait pendant que l'onglet était
  RÉELLEMENT masqué (cas banal : ouvrir l'onglet invité juste après l'onglet hôte, exactement la
  manip que le §10 prescrit pour tester à deux), `hiddenRef.current` restait figé à `true` POUR
  TOUJOURS — aucun retour visuel sur l'onglet ne peut le corriger, seul un vrai événement
  `visibilitychange` le peut, et rien ne le redéclenche si la valeur était déjà fausse au départ.
  `broadcastStation()` refusait alors tout, silencieusement, pour toujours : la simulation de
  l'hôte continuait parfaitement EN LOCAL (aucun symptôme chez lui), et rien de ce qui passe par
  `station` (résidents, visiteurs, scènes, montgolfière) n'atteignait plus jamais l'invité.
  *Un état qui ne peut se corriger que par un événement est aussi fragile que l'événement qui
  peut ne jamais se reproduire.* ⚠️ La parade : `document.hidden` est un getter natif, aussi bon
  marché qu'une ref — on le LIT DIRECTEMENT à chaque appel au lieu de le mettre en cache. Rien ne
  peut plus désynchroniser une valeur de sa source si on ne la copie jamais.
- ⚠️⚠️⚠️ **UNE FONCTION DÉCLARÉE DANS LA CLOSURE DE LA BOUCLE DE RENDU N'EXISTE PAS POUR LE
  COMPOSANT** — payé au 430 (`tryTownJump`, saut de rebord mort) puis au 431
  (`canStandTown` appelée par `advanceRemote`, Valley Town injouable à deux). Le hissage des
  déclarations s'arrête à la fonction qui les contient ; l'appel depuis l'extérieur lève un
  `ReferenceError` **à l'exécution seulement**, donc ni le build, ni le lint, ni aucun banc ne
  le voient. Et l'exception ne s'arrête pas là où elle tombe : **elle emporte tout ce que la
  frame devait encore dessiner.** ⚠️ La parade est de PUBLIER la fonction dans un ref réassigné
  à chaque montage de la boucle (`townJumpApiRef`, `zoneCollideRef`) — jamais d'en écrire une
  seconde copie au niveau du composant, qui divergerait au premier réglage.
  ⚠️ **Corollaire de repli** : quand la carte d'une zone manque chez ce client, un test de
  collision doit ACCEPTER, pas refuser. Refuser épingle l'entité distante à sa dernière
  position connue — c'est-à-dire qu'on reproduit le bogue au lieu de le corriger.
- ⚠️⚠️ **UN MOTIF DE SOL SE JUGE ASSEMBLÉ, ET SA PÉRIODE COMPTE PLUS QUE SES DÉTAILS** (434).
  Une tuile de 16 px se répète tous les 16 px : l'œil voit la grille avant le dessin, **quelle
  que soit sa finesse**. On dessine un pavé de 4×4 tuiles d'un seul tenant et on y découpe la
  case (`x % 4`, `y % 4`). ⚠️ Il doit **boucler sur lui-même** (toute forme peinte aussi à −N
  et +N), sinon on a déplacé la couture de 16 à 64 px — et une couture tous les quatre
  carreaux dessine une SECONDE grille, pire que la première.
- ⚠️⚠️ **UN ÉTALEMENT `{ ...table }` RECOPIE LES RÉFÉRENCES DE SES TABLEAUX : UNE TABLE DE
  RÉFÉRENCE QU'ON ÉTALE À PLAT EST UNE TABLE QU'ON MODIFIE** (2026-08-31). La vue de l'audience
  partait de `{ ...poseTarget("closed") }` et lissait dedans image par image : elle écrivait donc
  dans `POSE.closed` lui-même, la table se corrompait à la PREMIÈRE image, et la seconde audience
  de la session partait d'une posture que personne n'avait écrite. **Aucun symptôme sur le
  moment** — les nombres restaient plausibles. Parade : une copie explicite (`poseState`), et un
  contrôle qui rejoue deux cents images puis compare la table à elle-même.
- ⚠️⚠️⚠️ **UN EFFET REACT DONT LE NETTOYAGE A UN EFFET DE BORD SE DÉCLENCHERA AU DÉMONTAGE QU'ON
  N'AVAIT PAS PRÉVU** (2026-08-31). La scène de sciage rapportait sa manche depuis le `return` de
  son effet, « au cas où le joueur ferme en cours de route ». En développement, React 18 monte
  l'effet, le NETTOIE, puis le remonte : la scène se refermait donc toute seule dans la
  milliseconde, **sans une ligne d'erreur, sans rien dans la console**, et le bouton qui l'ouvrait
  avait l'air de ne rien faire. Une demi-heure perdue à chercher un bogue de rendu qui n'existait
  pas. ⚠️ Le nettoyage LIBÈRE (écouteurs, contexte WebGL, textures) ; il ne DÉCIDE de rien.
- ⚠️⚠️⚠️ **UNE ANIMATION CSS NE REDÉMARRE PAS PARCE QU'ON AJOUTE UNE CLASSE À UN NŒUD DÉJÀ
  MONTÉ** (2026-09-01). Le navigateur considère l'animation comme jouée et ne la rejoue pas. Ça ne
  se voit qu'à la SECONDE occurrence — donc jamais en relisant, et jamais dans un test qui ne
  déclenche l'effet qu'une fois. C'est le piège de tout accusé de réception qui peut arriver deux
  fois de suite. ⚠️ **La parade est un `key` React qui porte une séquence** : le nœud est remonté,
  l'animation repart de zéro, et le coût est nul quand le nœud est vide. Une classe qu'on retire
  puis qu'on remet marche aussi, mais elle demande de choisir un délai — c'est-à-dire un second
  nombre qui doit s'accorder avec la durée de l'animation (§8).
- ⚠️⚠️ **UN SÉLECTEUR CSS REDÉCLARÉ PLUS BAS DANS LA FEUILLE NE COMPLÈTE PAS LE PREMIER, IL LE
  CORRIGE** (2026-09-01, payé sur le bandeau de quête, sorti de l'écran par un `position:relative`
  qui écrasait un `position:fixed`). ⚠️ **Et rien dans ce dépôt ne peut l'attraper** : les
  vingt-deux bancs de rendu rastérisent du canevas, aucun ne met en page du CSS. *Toute la mise en
  page se juge à l'écran ou ne se juge pas* — corollaire direct du §10.
- ⚠️⚠️ **UN BANC QUI CHERCHE UN NOM D'APPEL MESURE UNE ÉCRITURE, PAS UN AFFICHAGE** (2026-09-02).
  `verify-quete` déclare morte toute phrase du maire qu'aucun fichier ne lit — il les cherchait par
  `L.maire.<clé>`. Le jour où les appels sont devenus `LM.` et `maireL().` (le texte se décline
  selon le sexe de l'élu), le banc a annoncé cent quatre-vingts phrases mortes sur du code
  parfaitement juste : il est tombé à l'instant exact, pour la mauvaise raison. *Un banc qui lit du
  SOURCE doit énumérer toutes les écritures de ce qu'il cherche, ou n'en chercher aucune.*
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️⚠️ **UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE** (427) : une feuille de
  personnage fait 16×24 par pose, un chapeau posé au-dessus de y=0 sort décapité, et rien ne
  le dit. Le banc de rendu l'a montré, la relecture non.
  ⚠️⚠️ **PAYÉ TROIS FOIS DANS LE SEUL ZIP 433** — l'enseigne de toit du taxi en trois quarts,
  le drapeau de la mairie, le liseré des oiseaux. C'est le piège le plus répétitif du projet
  parce qu'il ne coûte RIEN sur le moment : le dessin est joli, il manque juste deux rangées
  que personne ne cherche. **Deux parades, et la seconde est la vraie :** dimensionner le
  canevas à partir de ce qui dépasse (le fuyant d'un trois-quarts se retrouve en HAUT, donc le
  canevas fait `24 + DROP`), et **dessiner serré, RECADRER, PUIS cerner** — cerné dans son
  cadre juste, le liseré d'un sprite qui touche le bord est lui-même découpé (`padOutline`).
  ⚠️ Un banc peut l'attraper en une ligne : aucun pixel peint sur le bord du canevas.
- ⚠️⚠️ **`ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR** (427) : un nom cuit dans un
  sprite fait planter `tools/render-*.mjs`, c'est-à-dire qu'on perd le seul moyen de REGARDER
  ce dessin. Les textes des bâtiments s'écrivent VIVANTS, au rendu — ce qui les rend en plus
  bilingues, ce qu'un sprite baké ne peut pas être. Idem `translate`/`rotate` : le faux canvas
  les ignore, un sprite qui en dépend se juge faux.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte). ⚠️ Même famille au 427 : teinter un VÊTEMENT ne se
  fait pas en repeignant la feuille (on colorerait la peau et les cheveux), mais en
  repeignant les blocs du vêtement à leurs coordonnées exactes.
- ⚠️⚠️ **`Array.prototype.sort` EST STABLE, MAIS UN ORDRE DE DESSIN NE SE FONDE PAS DESSUS**
  (431). Les files de rendu du projet trient par ancrage au sol ; deux éléments à la même
  hauteur gardent donc leur ordre d'insertion — jusqu'au jour où l'on réorganise une boucle,
  sans rien casser de visible ailleurs. Ce qui doit passer devant le dit avec un epsilon.
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.**
- ⚠️ **`*/` DANS UN COMMENTAIRE DE BLOC LE FERME** — `COURT_STAIR_*/COURT_LINKS` a cassé le
  build du 426. Les commentaires denses de ce projet en sont friands.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**

---

## 5. Carte du territoire

| Fichier | Rôle |
|---|---|
| `components/ferme/FermeGame.js` | tout le jeu ferme + Valley Town + tribunal — **~20 500 l.** |
| `components/ferme/fermeEngine.js` | règles pures · `generateTownWorld()` · `generateCourtWorld()` · `townSpots()` · **`townNav()` / `townFindPath()`** · **`townRoadNav()` / `taxiStep()`** · **`townFlocks()` / `flockStep()`** |
| `components/ferme/quete.js` | **LA QUÊTE DE L'ÉTOILE : table, chronologies et résolveurs purs.** ⚠️ **469 — la FOUILLE (`STAR_DIG_MS`, `starDug`, `resolveStarDig`, `starDigResult`) et TROIS chapitres au lieu de cinq.** `STAR_FARM_IMPACTS` porte les **huit** cratères (3 étoiles / 2 matières / 3 vides — compté en important le module le 2026-08-30 ; il annonçait « cinq (2/1/2) » depuis le 480 bis), `resolveStarCalm` tient le barème 60/10 s et `resolveStarTownFall` sépare le gros météore. `STAR_FOLLOWER_SITES` dérive toutes les compagnes de `content:"star"`, `starFollowerAdded` identifie celle qui doit jouer son arrivée, `starFarmFlightPath` tient le cap stable des fragments et `queen` désigne l'unique reine. `starShipProgress` joint les cinq états du plan aux commandes et à la cale sans persistance supplémentaire. Aucun React, aucun dessin — `verify-quete.mjs` l'importe. |
| `components/ferme/maire.js` | **L'AUDIENCE CHEZ LE MAIRE (480) : la table des battements et les résolveurs purs.** Douze nœuds, cinq actes, cinq familles d'argument, la jauge d'adhésion qui FUIT, l'élan, la rejouabilité côté hôte (`mayorReplay` : le client envoie sa TRANSCRIPTION, l'hôte la rejoue). Aucun React, aucun dessin — `verify-maire.mjs` l'importe. ⚠️ **C'est un système de NÉGOCIATION, pas une scène** : la confiance gagnée sert les audiences futures, donc une commission ou le cadastre s'y ajouteront en une table de plus. |
| `components/ferme/MaireScene.js` | **la VUE de l'audience — le seul morceau de 3D du monde partagé.** Écran PLEIN, à la PREMIÈRE PERSONNE, caméra libre dans la pièce, bulles projetées, réponses en jaune, **mode spectateur** (`MayorWatch`), repli plat si WebGL manque. ⚠️ Il porte `mayorCtxOf`, **la fonction de contexte que le CLIENT et l'HÔTE appellent tous les deux** : leur accord est une propriété du code, pas une coïncidence. |
| `components/ferme/scierie.js` | **LA SCIE DE TRISTAN (lot E) : la simulation pure, à PAS FIXE.** Une lame qui a de l'inertie, un partenaire qui RÉPOND au lieu de mener, un mou qui referme la fenêtre parfaite, une contrainte qui fend la planche. ⚠️ **Aucune fonction transcendante dans le chemin de simulation** (`sin`/`pow`/`random` sont laissés à l'implémentation par la norme) : le hasard passe par un hachage entier, ce qui rend la manche rejouable **au bit près** par l'hôte à partir d'une liste de numéros de pas. Aucun React, aucun dessin — `verify-scierie.mjs` en joue des centaines. ⚠️ `sawPull(s, side)` est déjà symétrique : la seconde poignée du §17.6 s'ajoutera sans rouvrir la mécanique. |
| `components/ferme/scierieAtelier.js` | **L'ATELIER DE TRISTAN, EN CODE.** Le hangar et sa charpente apparente, les grumes, les piles de planches, l'établi, le poêle, les rais de poussière — et Tristan : pieds PLANTÉS, jambes et bras résolus en cinématique inverse, buste dont l'inclinaison est CALCULÉE pour que la main tombe à portée. La lame est **segmentée**, donc elle plie (ventre du coincement, fouet de la vitesse, affaissement du mou). ⚠️ Procédural comme `maireBureau.js`, `THREE` passé en paramètre, rien dans la closure de la boucle. |
| `components/ferme/ScierieScene.js` | **la VUE du sciage** : plein écran, simulation à pas fixe pilotée par une horloge réelle, journal de traits, repli jouable si WebGL manque. ⚠️ Elle n'envoie qu'**une seule `req` à la fin** — la transcription, jamais un résultat. |
| `components/ferme/rig3d.js` | **LA CINÉMATIQUE INVERSE, ÉCRITE UNE FOIS POUR LES DEUX PERSONNAGES** (le maire, Tristan). ⚠️ Elle a été SORTIE de `maireBureau.js` le jour où le second est arrivé : une loi des cosinus recopiée est une divergence en attente (§8). Les LONGUEURS d'os, elles, restent à côté des boîtes qu'elles mesurent. |
| `components/ferme/maireBureau.js` | **LE BUREAU DU MAIRE, EN CODE (481), ET LES CINQ CORPS DE SES ÉLUS (2026-09-02).** La pièce entière (parquet, boiseries, pilastres, fenêtre sur la place, bibliothèque, buste, lustre, porte qui claque), le meuble et ses objets — *chacun est une réplique de l'arbre* —, et le maire : sept postures, huit visages, cinématique inverse des bras. ⚠️⚠️ **LE CORPS EST DÉRIVÉ D'UNE STATURE**, pas posé boîte par boîte : `RATIO` (six étages qui somment à 1) × `mensurations(look)` rendent les quatorze longueurs, et `MAYOR_LOOKS` en décline **cinq silhouettes distinctes, dont trois femmes** (corpulence, coiffure, lunettes, barbe, jupe ou pantalon). C'est une JOINTURE avec `C.TOWN_CANDIDATES`, tenue par `verify-maire`. ⚠️ **PROCÉDURAL, comme `fermeArt.js` mais en 3D** : aucun fichier à charger, textures peintes au canevas 2D, `THREE` passé en paramètre. ⚠️ Rien n'y vit dans la closure de la boucle de rendu.
| `components/ferme/QUETE.md` | **la quête de l'étoile — autorité. Le §17 est le dossier cible « Port des Sept Sœurs » : une soirée, chronologie 5 + 3, sept étoiles, attentes actives, ancien port et lots A–G ; il distingue explicitement conception et code livré** |
| `components/ferme/README.md` | **Valley Town, le tribunal, l'HÔTEL DE VILLE, l'ÉGLISE, le BEFFROI, les habitants, la VENTE, les OISEAUX, les ÉLECTIONS et les PIÈGES de ces zones — autorité (428-444)** |
| `components/ferme/DESSIN.md` | **les règles de DESSIN, vraies partout — autorité (441, sorties du §4)** |
| `tools/README.md` | **les bancs, ce qu'ils attrapent et leurs chiffres — autorité (432-439)** |
| `tools/render-navire.mjs` | **LE NAVIRE, ET DEPUIS LE 2026-09-01 LA VIGNETTE DU RUBAN DE JALON** (§5 bis). Il rastérise les deux images que le ruban superpose — le navire AVANT et APRÈS, fantômes compris — et mesure en LUMINANCE ce que leur clignotement montre vraiment, pièce par pièce. C'est lui qui tient l'invariant « chaque morceau est soit assez large pour se voir seul, soit assez ramassé pour être cerclé par le halo », et c'est lui qui a exigé le halo. Sa planche `tools/out/navire-ruban.png` met les cinq paires côte à côte. |
| `tools/verify-scierie.mjs` · `tools/render-scierie.mjs` | **LES DEUX BANCS DE LA SCIE.** Le premier JOUE (déterminisme, accord direct/rejeu sur des images irrégulières, courbe de difficulté en fonction de la latence, martèlement, bornes, journaux malformés) ; le second RASTÉRISE l'atelier sans GPU et balaie la posture de Tristan sur **course de lame × profondeur de trait** — un carré, pas une liste, parce que sa posture est une fonction continue de deux variables. |
| `tools/lib-3d.mjs` · `tools/render-maire.mjs` | **REGARDER DE LA 3D SANS GPU (2026-08-31).** `lib-3d` charge le three.js **r128 vendorisé du dépôt** dans Node — la même bibliothèque que la page, à l'octet près — et rastérise à la main (projection, découpe au plan proche, tampon de profondeur, ombrage plat), plus le théorème des axes séparateurs pour mesurer une interpénétration en mètres. `render-maire` s'en sert pour peindre les sept postures côte à côte — et depuis le 2026-09-02 les **cinq maires** (`tools/out/maire-cinq.png`), avec le seul contrôle du dépôt qui mesure un RAPPORT entre deux morceaux (stature rendue contre stature écrite, tête contre carrure, pieds au parquet, quatorze mains à leur cible pour chacun des cinq corps). ⚠️ **Aucune dépendance npm, et surtout pas `three`** : une autre révision n'a pas la même atténuation de lumière (§11), donc mesurerait un autre programme. |
| `tools/verify-collision.mjs` · `tools/render-haies.mjs` | **LES DEUX BANCS DU 2026-09-01, ET LE PREMIER EST D'UNE NATURE NEUVE.** `verify-collision` ne demande pas si un obstacle refuse le pas, il demande **à quelle distance du dessin** il le refuse : il APPROCHE à la vitesse du jeu depuis les quatre côtés de chaque famille d'obstacle (haie, mur, berge, falaise), traverse les deux ponts, monte ET descend les quatre volées, franchit les vingt-cinq allées de parcelle, compare le jeu et le moteur sur 20 000 points, et vérifie qu'on se dégage TOUJOURS d'une position interdite. ⚠️ **Depuis le 2026-09-02 il mesure aussi le CONTRAIRE** : que les vingt-huit cases de végétation basse ne refusent RIEN, par les quatre côtés, et qu'aucune ne soit solide pour une autre raison que son buisson. `render-haies` est le premier banc qui regarde la haie — le décor le plus répandu de la ville, dessiné dans la closure du rendu depuis le 425, donc invisible pour les quarante et un autres. |
| `components/ferme/fermeConstants.js` | réglages · **tous les `TOWN_*`, `COURT_*`, `WARDROBE_*`, `TOWN_STALL_TRADES`** · **`TOWN_SOFT_PROPS`, `TOWN_BUSH_SLOW` et les trois nombres du frisson** (2026-09-02 : la végétation basse qu'on traverse) · **`mayorIsFem`, l'unique endroit qui sache lesquels des cinq maires sont des femmes** · **et depuis le 2026-09-01 LA SEMELLE (`bodyPoints`, `footX`/`footY`, `bodyFootTile`, `tileAnchor`) : l'unique description de l'empreinte au sol d'un personnage, dérivée de son ombre portée et lue par le jeu, le moteur ET les bancs** · depuis le 440 il **importe `planche.js`** : une portée de pont et une emprise de décor sont des grandeurs de DESSIN, on les dérive du sprite au lieu de les recopier |
| `components/ferme/planche.js` | **GÉNÉRÉ** par `tools/import-planche.mjs` — les sprites de la planche de Guillaume, en données. Ne pas éditer à la main |
| `components/ferme/fermeArt.js` | **tous** les sprites, en canevas procédural. `starWispColors` décline le vivant en jaune, bleu et rose ; `drawStarFragmentMeteor` fait tourner le petit caillou incandescent sur un centre stable et `drawStarFragmentImpact` dessine son choc de terre/poussière/braises, sans réutiliser la boule de feu de Valley Town. Les gros dessins de quête (`drawStarCrater`, comète, navire, jauge, poses) vivent ici pour rester regardables par les bancs. |
| `app/room/[code]/page.js` · `lib/gameSync.js` · `lib/realtimeQuota.js` | salon · synchro · quota |
| `components/PetitsChevaux.js` · `components/ludoBot.js` | **Ludo 2–4 humains ou 1 humain + 1 à 3 bots choisis avant le départ.** `ludoBot.js` ne connaît aucune règle de déplacement : il classe seulement le plan légal et les simulations que l'arbitre hôte lui remet |
| `public/candyluge/README.md` | **la dette et les 18 règles de la luge — autorité (427)** |
| `public/candyluge/js/` | `config.js` (tous les nombres) · `slope.js` (la piste) · `sled.js` · `world.js` |
| `public/vendor/three-r128/` | three.js r128 + GLTFLoader + EffectComposer, en local |

⚠️ **`scenes.js` contient 2 tableaux, `shots.js` en contient 7**, sur un `backdrop()` COMMUN.
**Lecture de `FermeGame.js` : étroit mais profond.** `grep` sur le symptôme, lire largement
autour, chercher les autres usages du symbole avant d'éditer.

---

## 6. Valley Town, le tribunal, les habitants — **voir `components/ferme/README.md`**

⚠️ **CE CHAPITRE A ÉTÉ SORTI D'ICI AU 428**, sur l'ordre laissé par le §14.2 du 427 et sur le
modèle de `candyluge` : il fait autorité **à côté du code qu'il décrit**. Un chapitre qui
grossit à chaque zip n'a rien à faire dans le fichier qu'on relit avant de travailler sur
autre chose. On n'en garde ici que l'orientation ; les pièges qui valent pour TOUT le projet
restent en §4, et rien n'est recopié aux deux endroits.
⚠️ **DEPUIS LE 431 IL PORTE AUSSI LES PIÈGES DE LA FERME, DE LA VILLE ET DU TRIBUNAL** (§15
là-bas), sortis de §4 sur l'ordre du §14.2 — et il décrit la vente, qui n'existe plus qu'au
marché (§14 là-bas).

**Ce qu'il faut savoir sans ouvrir le fichier :**

- **Carte 224×168**, graine fixe, **jamais persistée** — donc on peut tout refaire d'un bloc,
  sans migration.
- ⚠️ **L'ALTITUDE EST UNE PROPRIÉTÉ DE LA CASE** (`elev`), et **l'étage du tribunal se DÉDUIT
  de `y`**. Deux applications de la même idée : rien ne circule sur le réseau, rien à
  réconcilier.
- ⚠️ **UN RÉSIDENT A UNE ZONE, PAS DEUX POSITIONS** (`res.zone` + `res.x/y`). C'est la seule
  forme qui résiste au piège des deux cartes (§4).
- ⚠️⚠️ **LE 428 A INVERSÉ UNE DÉCISION DU 427** : les résidents ont un **vrai chemin**
  (`E.townFindPath`), pas un itinéraire d'escalier. Mesuré : **24 % → 100 %** d'arrivées, à
  coût réseau **strictement identique**. `townStairRoute` a été supprimée.
- ⚠️ **LA MAIRIE ET LE TRIBUNAL SE PARTAGENT UNE GRILLE ET NE SE PARTAGENT PLUS LEURS SERVICES**
  (439) : la mairie est ce qu'on DEMANDE, le tribunal ce qui se TRANCHE. Avant, quatre services
  étaient promis deux fois, mêmes emojis compris.
- ⚠️ **LES ÉLECTIONS SONT UNE PURE FONCTION DU JOUR, ET LE VIVIER DE CANDIDATS EST FIXE** — pas
  le roster, sinon accueillir un résident rerollerait le maire, y compris rétroactivement.
- **Ce qui n'est pas fait** : deux guichets ouverts seulement (la salle des cours et l'accueil),
  pas de coiffeur au salon, aucun résident n'ENTRE dans les deux bâtiments, pas d'intérieur de
  maison, la prairie nue (chiffre compté par `verify-vallee`), et les **commissions / rendez-vous
  datés sont décidés mais pas construits**.

---

## 7. `candyluge` — en pause depuis le 425

**Toute sa dette est passée dans `public/candyluge/README.md` (zip 427), qui fait autorité :**
les 18 « choses à ne pas défaire », les 5 chantiers non faits (⚠️ le n°1, la luge qui dérive
seule, rend la descente impraticable sans le menu dev), le bonbon empoisonné à concevoir, et le
mur de chantier (⌘⇧X deux fois en moins de 3,5 s). Rien n'en est recopié ici : un jeu à
l'arrêt n'a pas à occuper le fichier qu'on relit pour travailler sur autre chose.

---

## 8. Qualité d'image — la méthode

**Réduire la référence à 480×270, mesurer, comparer, corriger, re-mesurer. On ne juge pas au
ressenti.** ⚠️ **ET LA STATISTIQUE QUI COMPTE N'EST PAS LA MOYENNE** : au 421 la luminosité
moyenne était juste et l'image fausse — **pas un pixel sous L60**, donc aucune ombre. Il faut
un **écart**, pas un décalage. (Référence : L 180,6 / **écart-type 47,7** / saturation 27,8 % /
2,1 % sous L60.)

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
qu'elle soit un PNG avec vraie transparence. Convention de nommage amorcée
(`public/town/<bâtiment>-day.png` / `-glow.png`), pas encore éprouvée sur un second bâtiment.
⚠️ **AUCUN BANC NE REGARDE UN BITMAP** : toujours vrai, et ça n'a pas changé — un PNG importé se
vérifie en le regardant dans le jeu (§10), jamais par un `tools/render-*.mjs`.

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
SUR L'ORDRE LAISSÉ PAR LE §14.2 DU 442** (reporté deux fois). **20 bancs de contrôle et 22 bancs
de rendu**, comptés en listant `tools/`. **TOUS RELANCÉS LE 2026-09-02** :
`verify-quete` **631/631**, `verify-maire` **119/119**, `verify-vallee` **223/223**,
`verify-collision` **TOUT PASSE** (30 contrôles), `verify-strings` **1 108 clés appariées**,
`verify-scierie` **34/34**, `verify-ludo` **30/30**, `verify-taxi` **15/15**,
`render-maire` **86/86**, `render-etoile` **161/161** — et **vingt bancs de rendu sur vingt-deux**
seulement s'exécutent (voir l'entrée dédiée plus bas : `render-eau` et `render-parc` sont cassés
depuis avant cette livraison).
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
discussion devenue décorative. **C'est le premier banc du dépôt qui joue.**
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
⚠️ **`verify-ludo` est le deuxième banc qui joue une mécanique de mini-jeu** : il balaie 1 000
plans légaux et tient les cinq chemins bot vers les arbitres de l'hôte. Son détail et ses limites
sont dans `tools/README.md`.
⚠️ **Le seul qui touche à de l'ARGENT est `verify-vallee`** (**223/223** au 2026-08-31 ; 208 avant le fleuve et la barque) : il joue des ventes,
compte les pièces, et vérifie que **le cours est bit à bit celui du 430** — contrôle hérité de
`verify-enquete`, sauvé de sa suppression parce qu'il protégeait le marché, pas l'enquête.
**Tout chiffre écrit là-bas a été obtenu en lançant le banc**, c'est sa règle d'entrée.

⚠️⚠️ **ET UN BANC QUI N'A JAMAIS PU ÉCHOUER NE VAUT RIEN** (441). Le garde-fou de source de
`verify-pont` annonçait « 0 appel fautif » alors que son motif ne pouvait matcher **aucun** appel
réel. **Tout banc qui compte des occurrences doit publier combien il en a LUES.**

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
- ⚠️⚠️⚠️ **AUCUN BANC NE COMPTE CE QUE LE CHARGEMENT COÛTE À LA MACHINE, ET C'EST TOUJOURS VRAI**
  malgré le correctif ci-dessous — la mesure se refait à la main, comme au 481. `buildSprites()`
  RETENAIT **1 842 canevas 2D** distincts (mesuré hors-zip le 2026-09-02 en parcourant l'objet
  réellement retourné — le chiffre du 481, 1 829, datait et avait dérivé), dont `townWater` **636**
  (16 configurations × 2 variantes × 16 crans de profondeur, plus la berge et le tramage) et
  `petFrames` **468** (39 familiers × 4 directions × 3 images) — **60 % à eux deux**. En octets ce
  n'était rien (≈ 6 Mo) ; **ce qui compte n'est pas la taille, c'est le NOMBRE** : WebKit sur iPad
  alloue une surface minimale par canevas et plafonne le total, et le symptôme d'un dépassement
  n'est pas une erreur — c'est un onglet qui se ferme ou un canevas qui rend du blanc.
  ⚠️⚠️ **CORRIGÉ HORS-ZIP LE 2026-09-02, COMME LA PARADE DÉJÀ CONNUE LE DÉCRIVAIT** : `townWater`
  et `petFrames` sont désormais UN SEUL atlas chacun (`makeAtlas`, `fermeArt.js`), et la lecture
  passe par `blitCell` (neuf arguments à `drawImage` avec un rectangle source) au lieu de trois.
  Les fonctions qui dessinent une variante (`townWaterTile`, `petSprite`, etc.) **n'ont pas changé
  d'une ligne** — seul l'appelant qui les stocke a changé, exactement comme `RS.grass`/
  `drawTownGrassTile` le faisaient déjà pour l'herbe de la ville (le patron existait, il n'avait
  jamais été appliqué à ces deux familles). Retenu : **779 canevas** (townWater 1, petFrames 1,
  les 39 portraits `S.pets` gardés à part exprès — voir plus bas). ⚠️ **`S.pets[pid]` (le portrait
  au repos) N'A PAS ÉTÉ ATLASSÉ** : `Sprite` (le composant qui l'affiche à six endroits de
  l'interface) découpe toujours depuis (0,0) et ne sait pas lire un rectangle source — trente-neuf
  canevas de plus est un coût négligeable à côté du risque de toucher six appelants pour rien.
  ⚠️⚠️ **VÉRIFIÉ TROIS FOIS, PAS UNE** : (1) un parcours de l'objet réel retourné par
  `buildSprites()` confirme 636 et 468 cases pointant chacune vers exactement UN canevas partagé ;
  (2) `verify-syntax` et le bundle esbuild restent propres ; (3) **un rendu réel en navigateur**
  (bundle esbuild de `fermeArt.js` chargé dans une page jetable, jamais commitée) montre l'étang
  peint par la VRAIE `drawTownWaterTile`/`drawTownShoreTile` et une planche de familiers découpés
  depuis l'atlas — identiques à toujours, parce qu'aucun banc de ce dépôt ne peut juger un dessin
  au jugé (§8) et que `render-eau.mjs`/`render-rive.mjs`, qui auraient dû faire cette preuve,
  **étaient déjà cassés avant ce correctif** (voir l'entrée dédiée plus bas).
  ⚠️⚠️⚠️ **CE QUE ÇA NE PROUVE PAS** : que l'ami de Guillaume peut à nouveau jouer sur sa tablette.
  Personne n'a rejoué la mesure sur un vrai iPad, et 779 reste un nombre, pas un verdict — la seule
  chose qu'on sache est qu'il est très inférieur à 1 842. **C'est une mesure qui attend une
  confirmation humaine, pas une case cochée.**
  ⚠️ **CE QUI RESTE À PAVER, SI LE BESOIN REVIENT** : `S.pets` (39, décrit ci-dessus) et tout le
  reste des 779 — aucune autre famille n'a été mesurée individuellement cette fois-ci.
- ⚠️⚠️⚠️ **DEUX BANCS DE RENDU NE S'EXÉCUTENT PLUS DU TOUT, ET ÇA NE DATE D'AUCUNE DES
  LIVRAISONS QUI L'ONT CONSTATÉ.** ⚠️ **Ce sont `render-eau.mjs` ET `render-parc.mjs` — pas
  `render-rive.mjs`, qui passe** : le couple a changé entre le matin et le soir du 2026-09-02 sans
  que personne ne touche à ces fichiers, ce qui veut dire que la liste des bancs cassés se RELANCE,
  elle ne se recopie pas. Les deux plantent sur
  `ctx.createLinearGradient` — non implémenté par le faux canevas de `lib-canvas.mjs` — levé par
  `drawTownWaterSwellBand` (le reflet animé de la surface). **Reproduit sur `HEAD` tel quel, avant
  toute modification** (`git stash` puis relance, même trace) : ce n'est pas une régression de
  l'atlas, c'est une dette antérieure que personne n'avait vue faute d'avoir relancé ces deux bancs
  récemment — exactement le risque que le §10 nomme déjà (« affirmer qu'un outil existe sans
  l'avoir lancé »). ⚠️ **NON CORRIGÉ ICI** : `lib-canvas.mjs` sert des dizaines de bancs, et une
  implémentation hâtive du dégradé y introduirait un risque plus large que le gain de ce seul
  correctif — la vérification visuelle de ce zip est passée par un chemin qui ne dépend pas de ces
  deux outils (rendu réel en navigateur, ci-dessus). **À corriger séparément**, pas en même temps
  qu'un autre changement visuel.
- ⚠️⚠️ **CE QUI N'EST PLUS VRAI DEPUIS LE 2026-09-01, ET IL FAUT LE DIRE** : la HAIE était le plus
  gros décor que personne ne regardait — 839 cases, le pourtour des vingt-sept parcelles, dessiné
  dans la closure du rendu depuis le 425. `render-haies` la regarde. ⚠️ **Ce qui reste dans la
  closure et n'a donc AUCUN banc** : les BÂTIMENTS de la ville, les PERSONNAGES, et **tous les
  props** — c'est-à-dire le belvédère refait le même jour, dont `verify-vallee` et `verify-compo`
  tiennent l'emprise mais dont personne ne voit le dessin.
- ⚠️ **AUCUN BANC NE REGARDE LA FERME EN IMAGE** : les vingt-deux bancs de rendu ne dessinent que
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
- ⚠️ **AUCUN BANC NE REGARDE UNE FENÊTRE COMPLÈTE DE VALLEY TOWN.** `render-mairie` (439) et
  `render-beffroi` (444) **appellent** les sols au lieu de les repeindre, donc ils jugent ce que
  le jeu dessine vraiment ; **ce qui manque est ce qui reste dans la closure : les BÂTIMENTS de la
  ville et les PERSONNAGES.** Les autres bancs approximent le décor autour de leur surface.
- ⚠️⚠️ **ET AUCUN BANC NE JOUE À DEUX CLIENTS.** `fake-supabase.mjs` le permet depuis le 432 et
  l'a fait pour la VILLE (trois défauts le premier jour), pour l'enquête au 442 (deux défauts) et
  **pour la quête de l'étoile au 458 — TROIS BLOCAGES DURS**, dont deux rendaient la quête
  infinissable dès qu'un second joueur se connectait (§12.0 de `QUETE.md`). ⚠️ *La séance à deux
  clients a désormais payé les trois fois sur trois où elle a eu lieu.* **Ce qui reste** : la
  moitié qui se joue FACE À FACE (l'étoile timide dos à dos, le croisement d'ombres à deux, la
  flaque promenée sur le ponton, le duo) et **la ferme PEUPLÉE**, jamais vue à deux.
- ⚠️⚠️ **`render-etoile` JOUE UN MOUVEMENT DU MONDE DEPUIS LE 459** : son §7 simule
  `starSlipStep` sur le vrai creux du cratère, 317 départs, et vérifie qu'on SORT du trou. Il a
  trouvé, avant d'être fini, que 219 départs sur 317 étaient bloqués. `verify-ludo` joue désormais
  aussi l'automate pur d'un bot et balaie 1 000 plans légaux ; aucun des deux ne tourne à deux
  clients.
- ⚠️ **AUCUN BANC NE JOUE UN MINI-JEU DANS SON DOM ET SON CANEVAS.** `verify-ludo` protège les
  décisions pures et le branchement aux arbitres ; le navigateur a seul validé le choix 1/2/3 et
  l'enchaînement humain → bot → humain du duel. Ce qui se juge là — *est-ce que c'est agréable ?*
  — ne se mesure toujours nulle part.

⚠️⚠️ **JOUER À DEUX EN LOCAL : `node tools/fake-supabase.mjs`.** REST bidon **+ relais Realtime**,
donc deux onglets = deux joueurs, sans compte et sans consommer un message du quota. `LAT=90
JIT=60` simule une vraie liaison ; il imprime le débit réel PAR TYPE toutes les 5 s.
⚠️ **Le broadcast de supabase-js est BINAIRE**, pas JSON — un relais qui ne lit que les trames
texte voit tout se connecter et rien passer. Depuis le 2026-08-27, le relais mémorise aussi
`broadcast.self` à la jonction : une partie solo à client unique doit recevoir son propre état.

**Jouer en local** — deux échafaudages TEMPORAIRES, **à supprimer après** (recette resservie telle
quelle au 454 puis au 456) :
1. un `.env.local` pointant sur `http://127.0.0.1:54321` ; sans lui on reste bloqué à l'écran
   « code de ferme » ;
2. une page jetable `app/<nom>/page.js` montant `<FermeGame room={{id}} me={{id,username}}
   players={[{profile_id, username, joined_at}]} isHost savedCode="XXXX" />`.
   ⚠️ **`players` EST OBLIGATOIRE** (`[...players]` plante sans lui). ⚠️ **Un dossier `app/`
   préfixé par `_` n'est PAS une route.** ⚠️ **La supprimer avant de livrer** : en production
   elle ouvre une ferme sans authentification.

Puis ⌘⇧X → menu développeur → **20 arrêts** (ferme, passage, Valley Town ×7 dont **le cratère**
depuis le 446, et les **huit niveaux d'intérieur** : tribunal ×3, mairie ×2, église ×3 dont le
beffroi), **« Peupler la ferme »** et **« ⭐ Star »** (444 : effacer · lancer la chute · boucler le chapitre · sauter d'un
cran · marquer le lieu suivant · tout sauf le duo · **et REJOUER UNE SCÈNE isolée**).
⚠️ « Rejouer une scène » est le bouton qui change tout : sans lui, revoir une cinématique oblige à
remettre la quête à zéro, donc on ne la revoit qu'une fois, donc on ne la juge qu'une fois.
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
⚠️⚠️ **MAIS `getImageData` RESTE MENTEUR DANS UN ONGLET MASQUÉ — MESURÉ AU 456.** Avec le worker en
place, l'horloge avançait, les résidents se déplaçaient, et **le hachage de l'écran entier ne
changeait pas d'une image à l'autre** : on aurait conclu « les PNJ sont arrêtés » sur un monde qui
bougeait. **La capture d'écran, elle, est juste** : c'est elle qu'il faut échantillonner, pas les
pixels du canevas. *Deux mesures de suite qui rendent le même nombre ne prouvent rien ; deux
CAPTURES qui rendent la même image, si.*

⚠️ **Le faux canvas de `lib-canvas.mjs` IGNORE `translate`/`rotate` et ne connaît pas `fillText`**
— un sprite qui en dépend s'y juge faux. Ce n'est pas un bogue du jeu. ⚠️⚠️ **Et il
n'implémentait `drawImage` qu'à TROIS arguments jusqu'au 428** : toute découpe y dessinait la
feuille ENTIÈRE. Pas d'erreur, une image plausible, un verdict faux — le stub menteur, **dans
l'outil censé nous en protéger**. **Un banc de rendu se vérifie aussi.**

**Session manuelle à 2 joueurs — seule vraie validation du multijoueur.**
⚠️ **Un stub qui « retombe sur une valeur raisonnable » ment mieux qu'un stub qui plante.**
**Quand un outil et le jeu divergent, croire le jeu.**

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

---

## 12. Vocabulaire

- **« zip N »** : trace historique des livraisons (jusqu'au 426), **nommée d'après la
  fonctionnalité livrée, pas d'après la zone touchée**. Piège vérifié : le 418 « vallée de
  verre » désignait `public/crystal/`, pas la ferme.
- **hôte / invité** : rôles réseau, pas des personnes.
- **AOI** : rayon au-delà duquel on cesse de diffuser une entité.
- **PNJ nommés** : Greg, Soan, Harald, Rosalie, René (ferme). Aubin (crystal, ch. 1).
- **Les références de Guillaume sont des images GÉNÉRÉES** (concept art). Elles font autorité
  sur l'intention, **jamais sur l'interface**.

---

## 13. À compléter par Guillaume

⚠️⚠️⚠️ **CE QUI ATTEND UN JUGEMENT HUMAIN, PAS UN BANC — PAR ORDRE DE PRIORITÉ (diagnostic
2026-09-01, à la demande de Guillaume : « je veux savoir quelle direction donner au jeu, tout en
réglant l'aspect agréable ou pas, qui ne peut être vérifié que par moi-même »).** Un banc mesure
la mécanique ; il ne peut jamais dire si c'est AGRÉABLE — seule une vraie séance de jeu le peut,
et Guillaume est le seul à la faire (Claude ne lance pas de bancs ni de sessions de jeu de son
propre chef dans cette phase — **exception ponctuelle accordée hors-zip le 2026-09-01, sur
demande explicite répétée de Guillaume, pour le seul item n°1 ci-dessous** ; la règle reste « ne
pas se l'accorder soi-même » pour tout le reste). Cette liste ORDONNE ce qui est déjà détaillé
plus bas dans ce chapitre ; elle ne redit rien de leur contenu, elle priorise LEQUEL jouer en
premier.
1. **Gels de PNJ chez l'invité, ferme PEUPLÉE, à deux clients.** ✅ **MÉCANISME TESTÉ, DIAGNOSTIQUÉ
   ET CORRIGÉ hors-zip le 2026-09-01** (détail au §4) — `netCanBroadcast()`
   lisait un `hiddenRef` mis en cache jamais resynchronisé avec `document.hidden`, figé à `true`
   pour toujours si l'onglet hôte montait pendant qu'il était masqué. Plus aucun `broadcastStation()`
   ne partait ; les résidents (et tout le reste de `station`) restaient invisibles chez l'invité,
   sans aucun symptôme côté hôte. ⚠️ **CE QUI RESTE, ET C'EST TOUJOURS POUR GUILLAUME** : le
   mécanisme marche, le RESSENTI à deux (l'ambiance, ce qui se voit, ce qui manque encore) n'a
   toujours pas été jugé par une vraie séance de jeu — c'est cette moitié-là qui reste le socle des
   décisions sociales à venir (mariage, densification, relations résident-résident, transport du
   bois).
2. **Les cinq mini-jeux de la quête de l'étoile**, joués jusqu'à la victoire, à cadence réelle.
3. **La moitié « face à face » de la quête** : l'étoile timide dos à dos, le croisement d'ombres
   à deux, la flaque du ponton, le duo orgue/beffroi. ⚠️ Pas testable seul, dépend du n°1.
4. **Les trois nombres de la scierie de Tristan** (tempo, durée de manche, prix de planche
   fendue) — aucun ne doit bouger avant d'avoir été joué. ✅ **Diagnostiqué en solo (2026-09-01)** :
   la mécanique n'est pas déplaisante mais reste peu claire, à rendre plus accessible pour de
   jeunes joueurs ; le refroidissement ennuie ; la pose des planches est répétitive mais acceptée
   comme compromis. **Le point commun aux trois : le manque d'ANIMATION**, pas une nouvelle
   mécanique — reste en réserve derrière cette liste (décision de Guillaume).
5. **Les trois nombres du navire** (prix de Kerguélen, les quinze minutes de plans, les cinq
   commandes de bois). ✅ **Le prix de Kerguélen est confirmé accepté** : cher et pas agréable,
   mais voulu pour la cohérence narrative — ne pas l'adoucir sans raison narrative. Les deux
   autres nombres restent à juger.
6. ✅ **Le bureau du maire — REJOUÉ À L'ÉCRAN le 2026-09-02**, en séance réelle, avec **Ninon Delaunay**. La passe d'anthropométrie y a été jugée et corrigée quatre fois de suite sur ce que montrait l'écran. ⚠️ **CE QUI RESTE POUR TOI, ET C'EST DU RÉGLAGE** : les **quatre autres maires** n'ont été vus que sur la planche du banc, qui ne juge ni la lumière ni les textures (§10) — et une silhouette qui tient en ombrage plat peut se lire tout autrement sous les quatre lampes de la pièce.
7. **Le voyage en train** — ✅ **confirmé bon** (2026-09-01) : pas une corvée, pas coûteux, item
   clos.
8. **Le pain des pigeons et le partage des oiseaux**, à deux, pour savoir si l'écart se remarque.

**Tant que le n°1 n'est pas fait, aucune décision de conception sociale (mariage — proche mais
pas à livrer tout de suite —, densification, commissions) ne doit être considérée fiable.**
Guillaume joue lui-même (recette au §10 : `fake-supabase.mjs`, échafaudage temporaire,
« Peupler la ferme », deux onglets) ; Claude fournit les commandes exactes si besoin, jamais ne
les exécute à sa place sur ce chantier.

✅ **BUG DU RÉSIDENT SUCRIER — RÉSOLU (2026-09-01).** Ce n'était pas un bug de déplacement : le
résident sucrier (Jérôme Martial) « figé » avait perdu une bagarre de la rivalité Tristan/Jérôme
et purgeait son ITT (`TJ_BRAWL_ITT_MS`), qui se levait correctement seule mais durait 16 MINUTES
RÉELLES sans que le toast n'indique une durée ni la possibilité de le soigner au pansement — d'où
l'impression de PNJ cassé. Ramené à 3 minutes réelles sur demande de Guillaume. Détail au
commentaire daté de `fermeConstants.js` (`TJ_BRAWL_ITT_MS`). Retour général sur toutes les
activités testées, toujours ouvert : plus d'indicateurs visuels de progression et plus
d'animations demandés.

⚠️ **DEUX IDÉES DU MÊME DÉBRIEF, TRANCHÉES SUR LEUR SORT IMMÉDIAT, PAS SUR LEUR CONTENU** :
· **Visiteurs célèbres** (noms et sprites de vraies personnes) — **à explorer plus tard**,
  volontairement pas cadré maintenant. ⚠️ Le risque de droit à l'image a été nommé (ça compte
  double avec les plans de commercialisation, voir mémoire) ; à trancher AVANT tout travail
  dessus, pas après.
· ✅ **RELATIONS RÉSIDENT-RÉSIDENT — DIRECTION TRANCHÉE, NON CONSTRUITE (2026-09-01).** Guillaume
  veut un vrai système : affinités et inimitiés qui ÉVOLUENT avec les actions des joueurs
  (services rendus, etc.), pas un décor social statique. Exemple donné mot pour mot : *« rosalie
  qui est énervée à cause d'une histoire de cœur, il faut que ça mène (dans le futur) à une quête
  de réconciliation ou un truc du genre »* — un différend entre résidents devient une porte de
  quête, pas juste une ligne de dialogue. ⚠️ **NE PAS COMMENCER avant le n°1 de la liste ci-dessus**
  (résidents jamais vus se comporter à deux clients) : construire un système de relations sur un
  comportement de PNJ jamais éprouvé à plusieurs serait fabriquer la mauvaise abstraction, comme
  le dit déjà l'avertissement sur `MAYOR_NODE` plus haut dans ce fichier.

✅ **CHAÎNE DE TRANSPORT DU BOIS DU BATEAU — DIRECTION TRANCHÉE, NON CONSTRUITE (2026-09-01).**
Quatre décisions actées avec Guillaume, à respecter le jour où ce chantier s'ouvre :
1. **Elle REMPLACE le mécanisme actuel**, pas un habillage cosmétique par-dessus : la progression
   d'une pièce du bateau dépendra de l'arrivée physique de la pièce transportée, plus seulement
   d'un total de bois abstrait. ⚠️ Ceci touche un système déjà vérifié (`verify-scierie`,
   `verify-quete`, `starShipProgress`) — l'implémentation devra ADAPTER ces deux bancs au nouveau
   critère de progression, jamais les contourner.
2. **Le trajet est automatique et simulé**, pas un mini-jeu de conduite : on dépose la pièce, elle
   progresse seule sur une durée (même famille que le pathfinding des résidents,
   `E.townFindPath`), et arrive.
3. **La pièce transportée est EMBALLÉE** : une forme générale reconnaissable (longue, courbe…)
   mais pas la silhouette finale à nu — un nouveau sprite à dessiner, pas une réutilisation du
   dessin du bateau fini. ⚠️ **Guillaume peut fournir des images de référence pour ce sprite** —
   à demander précisément le jour où ce chantier s'ouvre (règle Blender/sprite complexe du §2 : un
   prompt Gemini avec référence, jamais un appel API automatisé).
4. **Ordre de construction, par le bout visible d'abord, chaque étape jouable seule** :
   étape 1 — les pièces arrivent et restent VISIBLES sur le quai jusqu'au hissage (le plus proche
   de ce qui existe déjà, le bateau grandit déjà sur le quai) ; étape 2 — le trajet gare de Valley
   Town → quai ; étape 3 — le trajet scierie → gare.
⚠️ **NE PAS COMMENCER avant que la liste « à jouer » ci-dessus ait avancé**, en particulier le n°1
(résidents à deux clients) et le n°5 (les trois nombres du bateau, dont le rythme des cinq
commandes) — ce chantier remplace justement le mécanisme que le n°5 doit d'abord juger tel quel.
⚠️ Ce bloc fixe la DIRECTION, pas le code : le détail d'implémentation (fichiers, fonctions) reste
à écrire dans `QUETE.md` au moment où le chantier s'ouvre pour de vrai.

- ⚠️ **DETTE GRAPHIQUE, 2026-09-01 — LE CŒUR DE L'ÉTANG DU PARC SE LIT COMME UN BLOC NET, PAS
  COMME UN DÉGRADÉ.** Mesuré sur le vrai générateur (`TOWN_POND`, pas une supposition) : la
  profondeur EST un vrai dégradé de crans (00→04→10→14→15 autour du centre), ce n'est donc pas un
  bug de données. La cause est un compromis déjà arbitré deux fois par le passé (zip 436) :
  `TOWN_WATER_SHELF` (largeur où la teinte continue de bouger) a été resserré à 1,5 case
  *spécifiquement pour ce petit étang* (rx=ry=4,6 cases), sinon il n'avait aucune zone « large »
  du tout. Sur un si petit plan d'eau, cette zone « large » — quasi plate — occupe une grosse part
  de sa surface visible, et ses crans voisins sont proches sur la rampe de couleur (`WAT_STOPS`,
  `fermeArt.js`), donc l'œil les lit comme un bloc plutôt qu'un dégradé.
  Guillaume a choisi la direction : **rendre `WAT_STOPS`/`WAT_RAMP` plus progressive dans le
  registre foncé** (crans ~8-15, ceux qu'un petit étang atteint réellement), plutôt que de rouvrir
  le compromis de largeur (déjà rejeté au 436) ou d'agrandir l'étang (change la carte). ⚠️ **NON
  FAIT** : `WAT_RAMP` sert TOUTE l'eau de la ville et est mesurée par `render-eau.mjs` avec des
  chiffres de contraste précis (luminance large/bord, écart-type) déjà arbitrés à deux reprises —
  la corriger sans boucle de réglage visuel risquerait de déplacer le défaut ailleurs sur un grand
  plan d'eau sans qu'on le voie. Une piste : une courbe gamma sur `k/(WAT_DEPTH-1)` avant de
  l'indexer dans `WAT_STOPS` (repousse plus de contraste vers les crans profonds sans toucher aux
  deux couleurs d'extrémité), à valider avec `render-eau.mjs` PUIS à l'écran avant de livrer.
- ⚠️ **DETTE GRAPHIQUE, 2026-09-01 — DES DÉLIMITATIONS DE ZONE PEINTES SUR DES REBORDS SONT
  DROITES, PAS COURBES.** Localisé par une capture de Guillaume : **la berge de l'étang du parc**,
  là où l'allée qui le longe change de revêtement — dallage clair tramé (`G_PATH_STONE`) contre
  chemin de terre (`G_PATH`). La capture montre une COUTURE VERTICALE NETTE entre les deux
  revêtements, sans transition ni bordure, exactement le défaut « escalier de 16 px » que la rive
  eau/terre elle-même a déjà résolu (voir §4, `drawTownShoreTile`, les carrés marcheurs sur les
  coins). ⚠️ **NON FAIT** : `drawTownRoadTile`/`drawTownFlagTile` (`fermeArt.js`) n'ont
  apparemment pas ce traitement à la jonction `G_PATH`/`G_PATH_STONE` — à vérifier si c'est un
  oubli (les deux revêtements gagneraient le même isocontour/kerb que la rive) ou un choix
  déjà arbitré ailleurs (une allée peut légitimement changer de matière net, comme un trottoir
  contre un chemin). **Ne pas deviner lequel avant de l'ouvrir** — c'est la question à trancher en
  premier.


- ✅ **LE LAC-OCÉAN — TRANCHÉ ET À MOITIÉ CONSTRUIT LE 2026-08-31.** *« Je veux que l'on considère
  le lake and pier plutôt comme un accès à l'océan, et donc le port de Valley Town »* · *« une
  sorte de fleuve qui mène à une sortie ; par la droite. ensable un peu »* · *« il y aura un mode
  de navigation jouable bientôt, mais pour l'instant juste faire un fondu enchaîné, avec décor
  marin générique »* · *« eduardo peut utiliser le navire. mais nous aussi en montant dedans :
  soigner les sprites. anatomiquement cohérentes dans un bateau, mouvements cohérents »*.
  **Le fleuve et sa passe sont faits** (§32 de `components/ferme/README.md`). **Restent les poses à
  bord et le fondu**, une livraison chacun — c'est le bloc ⏭️ REPRISE.
  ⚠️ Ce qui reste une VRAIE question ouverte, et elle n'a rien de technique : **ce qu'on voit après
  le fondu**. Un décor marin générique tient une fois ; à la seconde, le joueur veut savoir où il
  va. Les trois îles de la carte d'Eduardo (§17.5) sont écrites mais rien ne dit encore ce qu'on y
  fait — et c'est cette réponse-là qui décide si le navire est une fin ou une porte.


- ⚠️ **LE CADASTRE ET LE NOTAIRE SONT DES GUICHETS FERMÉS** : les deux pièces existent, meublées,
  et ne rendent aucun service depuis que le 444 a retiré l'histoire qui les employait. La question
  est donc entière : **acheter une parcelle, avec un prix, un titre et une conséquence sur la
  carte.** ⚠️ La FORME est acquise et mesurée (une `req` arbitrée par l'hôte, un état partagé dans
  `ferme_saves`, aucune migration SQL) ; c'est le contenu qui manque.
  ⚠️ **Le MARIAGE n'a toujours pas bougé** — la salle est dressée, les bans sont prêts, il manque
  l'officier depuis le 439. C'est le seul endroit du jeu où deux joueurs feraient quelque chose
  ENSEMBLE qui ne soit pas du commerce, et aucune des deux quêtes ne l'a remplacé : elles se
  MÈNENT à deux, elles ne se CÉLÈBRENT pas.
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- ⚠️ **LE MORCEAU D'ORGUE (441) : UN FICHIER, PAS UNE DÉCISION.** Tu as choisi un vrai morceau
  plutôt qu'une synthèse ; il se dépose dans **`public/sounds/church-organ.mp3`** et rien d'autre
  n'est à faire — la scène, le banc, le toast et la coupure au lever sont branchés. En attendant,
  le jeu dit que la soufflerie est muette, une seule fois, plutôt que de laisser croire à une
  touche cassée.
- ⚠️ **L'ÉGLISE EST OUVERTE ET NE REND AUCUN SERVICE** (441, ta décision) : trois gestes, aucun
  or. Le 442 lui a donné **deux inscriptions à lire** dans la tribune (la cloche et la plaque du
  facteur d'orgues) : c'est la première fois qu'on y monte pour autre chose que la vue, et ça n'a
  rien coûté — les deux se lisent sur des décors qui étaient déjà là.
- **Valley Town : qui HABITE la ville à demeure ?** Les résidents ne font qu'y passer. Le 439 y
  pose **Léonie Sarrazin** à l'accueil de la mairie — mais c'est un décor qui parle, pas une
  habitante : elle ne bouge pas, et `res.zone` ne connaît toujours que « farm » et « town ».
  Faire ENTRER un résident dans un bâtiment est une décision, pas un réglage : il faudrait une
  troisième valeur de zone, donc une position à réconcilier.
  ⚠️ **Et la prairie : le nombre de blocs de 28×28 encore nus est compté par `verify-vallee.mjs`
  à chaque exécution** — on le lit là, on ne le recopie pas ici (le 437 a perdu du temps sur un
  chiffre périmé). On n'y a délibérément posé AUCUN endroit de vie : des résidents qui vont
  contempler un champ vide, c'est du remplissage. La question n'est donc pas « comment les
  meubler » mais **« qu'est-ce qu'on construit là »**.
  ⚠️⚠️ **LE 440 A RÉPONDU POUR LE COIN SUD-EST, ET LA RÉPONSE EST « RIEN, EXPRÈS »** : un bois y a
  été creusé et le sentier de la rive est va s'y perdre — sans un seul endroit de vie, sur demande
  de Guillaume (« pas une zone très fréquentée, un peu sauvage »). C'est le premier morceau de
  carte assumé comme un **vide habité par le décor** plutôt que par des gens, et c'est une réponse
  possible pour les blocs qui restent. `verify-vallee` a donc appris une troisième catégorie (bâti
  / prairie / bois) : sans elle, il réclamait « une raison qu'on y aille » pour une forêt.
- ⚠️⚠️ **LA SCIE DE TRISTAN EST LIVRÉE (lot E, 2026-08-31) ET ELLE ATTEND TON JUGEMENT SUR TROIS
  NOMBRES, PAS SUR SON CODE** — le tempo qui accélère, la durée d'une manche, le prix d'une planche
  fendue. Ils sont détaillés dans le bloc ⏭️ REPRISE, et **aucun ne doit bouger avant que tu aies
  joué** (règle du voyage en train, 431).
  ⚠️ **Ce qui reste une VRAIE décision, en revanche : la seconde poignée.** Le §17.6 de `QUETE.md`
  promet deux joueurs sur la même scie — l'un tire quand l'autre pousse — et la mécanique est déjà
  écrite pour ça (`sawPull(s, side)`). Ce qui manque est le transport du second journal, et surtout
  la réponse à une question qui n'est pas technique : **est-ce qu'on veut que la commande de bois
  DEMANDE deux joueurs**, ou qu'elle soit seulement meilleure à deux ? Le §0 dit « 2 joueurs,
  occasionnellement 3 » ; une serrure à deux sur une étape obligatoire de la quête serait la
  première du jeu, et le §17 s'interdit explicitement d'en poser.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 et **devenu le SEUL guichet au 431** : la ferme montre et transforme, la ville achète.
  L'économie existe donc vraiment, et le **jour de marché** hebdomadaire est déjà un
  rendez-vous daté. Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais. ⚠️ **LE PATRON EXISTE ET IL EST MESURÉ** : `components/ferme/quete.js` est une table
  de lieux, une table de chapitres, des résolveurs purs qu'un banc peut appeler, et un état
  partagé qui voyage dans un `apply` qui partait déjà — zéro message dédié. Une commission, c'est
  la même chose en beaucoup plus court ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron est
  désormais écrit **cinq fois** (jour de marché, service de Carla, jour d'orage, cours du marché,
  et au 439 les **élections municipales** + le jour d'audience du maire) : **une pure fonction du
  numéro de jour, jamais un état**. Les élections sont le premier de ces rendez-vous qui ait un
  RÉSULTAT visible dans le monde (le portrait officiel) — c'est le modèle à copier.
- ⚠️⚠️ **LE TACTILE NE COUVRE QUE LA FERME, LA VILLE ET LE TRIBUNAL** (430). Les 21 autres jeux
  de la plateforme n'ont pas été audités au doigt. Certains ont déjà des `pointer*` (puzzle,
  naval, yahtzee), d'autres non — **personne ne sait lesquels**, et c'est exactement l'angle
  mort qui a laissé la ferme injouable pendant des années.
- ⚠️⚠️ **LE VOYAGE EST-IL DEVENU UNE CORVÉE ?** (431, à jouer, c'est la question de ce zip.)
  Vendre exige maintenant de prendre le train : c'est ce qui donne son sens à la ville, mais
  personne ne l'a encore vécu sur une soirée entière. Deux réglages existent si c'est pénible —
  élargir la portée du marché, ou raccourcir le trajet — et **aucun ne doit être touché avant
  d'avoir joué**. On a délibérément conservé la prime de cours (jusqu'à +35 %) comme
  contrepartie : le voyage doit PAYER, pas seulement coûter.
  ⚠️ **ET IL Y A DÉSORMAIS UNE SECONDE RAISON D'Y ALLER, QUI N'EST PAS DE L'ARGENT** : la quête
  de l'étoile fait faire l'aller-retour (le sillon est à la ferme, tout le reste est en ville), et
  depuis le 451 **le NAVIRE donne une raison de revenir voir** — il grandit sur le quai du lac à
  chaque morceau rapporté. Si le voyage cesse d'être une corvée, ce sera peut-être pour cette
  raison-là plutôt que par un réglage — à juger en jouant, comme prévu.
- ⚠️ **LE PAIN DES PIGEONS EST GRATUIT (433) — ARBITRAGE TOUJOURS À TRANCHER**, mais la scène
  MARCHE depuis le 439 (assis, treize pigeons viennent manger ; se lever en fait partir dix sur
  quatorze). L'objection « un joueur qui appuie sans rien voir se passer croit que la touche est
  cassée » ne tient donc plus : il se passe quelque chose. Reste la vraie question — gager le
  geste sur un `bread` du stock lierait la scène à l'économie (joli) mais changerait une ambiance
  en dépense. **Question de conception, pas de technique.**
- ⚠️ **LES OISEAUX NE SONT PAS PARTAGÉS ENTRE LES DEUX JOUEURS** (433, décision de Guillaume :
  « leur comportement doit pas être exactement partagé »). Les emplacements se déduisent de la
  carte, mais le nombre et les activités sont tirés chez chaque client — deux joueurs sur la
  même place ne comptent pas les mêmes pigeons. **À JOUER À DEUX** pour dire si ça se remarque ;
  si oui, le pain seul mérite d'être diffusé (un `send` de trois nombres), pas les oiseaux.
- ⚠️⚠️⚠️ **LA QUÊTE DE L'ÉTOILE (444) — LA SÉANCE À DEUX CLIENTS A ENFIN COMMENCÉ AU 458, ET ELLE A
  PAYÉ IMMÉDIATEMENT.** Deux clients ont tourné ensemble pour la première fois et ont trouvé **trois
  blocages durs**, dont deux rendaient la quête **infinissable dès qu'un second joueur se
  connectait** (§12.0 de `QUETE.md`). ⚠️ **Ce qui n'a TOUJOURS pas été joué est la moitié qui se
  joue FACE À FACE** : l'étoile timide dos à dos, le croisement d'ombres à deux (barème court, 30
  cases / 20 s), la flaque que l'un promène sur le ponton pour l'autre, le duo orgue/beffroi. Le
  code est là et il est corrigé ; les postes n'ont jamais été tenus. ⚠️ **Et la même séance doit
  faire la ferme PEUPLÉE**, réclamée depuis le 419. Voir `components/ferme/QUETE.md` §12.2.
  **Ce qui attend une DÉCISION de ta part, et rien d'autre :**
  **1. Le dessin de la compagne.** Cinq écritures, vue en jeu, pas encore juste : deux directions
  chiffrées dans `QUETE.md` §12.3 (l'agrandir, ou quatre masques de pixels à la main).
  **2. La récompense cosmétique.** L'arbitrage est POSÉ et VIDE (`resolveStarGift` écrit
  `star.gift[joueur]`, une fois, côté hôte, persisté). Reste à décider CE QU'ON DÉBLOQUE — le jour
  où la garde-robe cosmétique lira ce champ, elle n'aura pas à inventer un chemin d'attribution,
  et c'est au moment où l'on en invente un qu'on se trompe.
  **3. Le réglage des cinq mini-jeux.** Ils sont dessinés et vérifiés, jamais joués jusqu'à la
  victoire à cadence réelle. Ce qui s'y juge — *est-ce que c'est agréable ?* — n'est mesuré nulle
  part et ne le sera jamais.
  **4. ✅ CE QUE LE NAVIRE FAIT UNE FOIS FINI — TRANCHÉ AU 453 PAR TOI.** *« Le bateau est construit
  et réel. Eduardo Da Fonseca le prend et part au large […] ça laisse de la marge narrative, pour
  développer de nouveaux mondes et ensuite permettre au bateau de revenir. »* C'est fait, et ça n'a
  coûté ni état ni message : la cale se vide pendant ses voyages. ⚠️ **Ce qui reste ouvert est la
  SUITE, et c'est un vrai chantier** : les îles. Le navire est le premier objet du jeu qui promette
  un ailleurs, et il le promet maintenant par la bouche de quelqu'un.
  **5. ⚠️⚠️ CE QUI ATTEND UN AVIS APRÈS LE 454, ET C'EST DU RÉGLAGE, PAS DE LA CONCEPTION.** Trois
  nombres ont été posés par déduction et une seule séance ne suffira pas à les juger : le **prix de
  Kerguélen** (24 000 or + 60 récoltes + 12 poissons — « forte rémunération », mais sur une ferme à
  quatre artisans, est-ce une soirée ou une semaine ?), les **quinze minutes** de plans (c'est ton
  chiffre ; les deux croisements d'ombres tiennent dedans, à vérifier en jouant) et les **cinq
  commandes de bois** (140 + 45 + 110 + 60 + 40 bois, 3 à 8 min chacune : est-ce que ça donne un
  chantier qu'on suit, ou une file d'attente ?). ⚠️ **Aucun ne doit bouger avant d'avoir joué** —
  c'est la règle du voyage en train (431), et elle a eu raison deux fois.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **Gels de PNJ chez l'invité** (359-365) : encore observés ? Vérification demandée depuis le
  419 — session réelle à 2, **ferme PEUPLÉE**, console de l'hôte ouverte. ⚠️⚠️ **C'EST TOUJOURS
  LA PASSE LA PLUS URGENTE DE CE FICHIER**, et aucune des six séances à deux clients (432, 442,
  458) ne l'a faite : elles ont validé des chaînes réseau sur une ferme VIDE, ce qui ne dit rien
  des vingt résidents. ⚠️ **Le 458 est passé à côté pour une raison bête et réparable** : le faux
  Supabase ne persiste pas l'état, donc chaque rechargement repartait d'une ferme neuve — peupler
  puis recharger efface le peuplement. *Peupler EN PREMIER, et ne plus recharger.* ⚠️ **L'EXCUSE TECHNIQUE EST TOMBÉE POUR DE BON AU 432** : `fake-supabase.mjs`
  fait tourner deux clients en local (§10), et la première séance a immédiatement trouvé trois
  défauts du multijoueur de la VILLE. Ce qui n'a jamais été vu à deux : les vingt résidents que le
  428 fait circuler, et le champ d'assise qu'il diffuse. **Les bancs mesurent la simulation de
  l'hôte, jamais ce que voit l'invité.**
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
- ⚠️ **VERCEL NE DÉPLOIE PLUS AUTOMATIQUEMENT depuis le 425**, et **ce n'est pas le dépôt** :
  `origin/main` porte bien le commit, il n'y a ni `vercel.json` ni étape ignorée, et le projet
  compile. Le lien Git du projet est à vérifier côté tableau de bord. Un `vercel --prod` depuis
  le terminal **ne rétablit rien** : une livraison CLI n'est pas une livraison Git.

---

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter.
   ⚠️⚠️⚠️ **LE 439 A ÉLAGUÉ, ET C'EST LE PLUS GROS RÉTRÉCISSEMENT DE L'HISTOIRE DU FICHIER :
   687 → 661 lignes, dont un EN-TÊTE passé de 151 à 50.** Cet en-tête était devenu un mur de
   cinquante lignes d'avertissements avant le premier chapitre — c'est-à-dire la partie qu'on lit
   le moins bien, occupée par ce qu'on veut qu'on lise le mieux. Les leçons de DESSIN sont
   descendues en §4 (elles y sont à côté des pièges de dessin), les leçons de BANC sont restées
   en tête sous une seule forme (« un banc qui passe ne veut pas dire que la chose est bonne »)
   avec ses quatre variantes connues, et **trois blocs qui redisaient la même chose que §4 ont
   été supprimés, pas déplacés**.
   ⚠️⚠️⚠️ **LE 449 A EXÉCUTÉ L'ORDRE DU 444, QUATRE FOIS REPORTÉ (446, 447, 448) : §4 EST SCINDÉ
   UNE TROISIÈME FOIS.** Les cinq pièges du GÉNÉRATEUR sont partis au §15 bis de
   `components/ferme/README.md` ; les deux règles de CONCEPTION sont restées, parce qu'elles ne
   parlent pas du générateur. ⚠️ **Et l'élagage a trouvé ce qu'un élagage doit trouver : un
   DOUBLON.** « Une variante de décor est une couche » était écrit DEUX fois dans le même
   chapitre — une version courte en Architecture, une longue en JavaScript — et personne ne
   pouvait s'en apercevoir en lisant, puisque cent lignes les séparaient. La longue a survécu.
   ⚠️⚠️ **ET L'EN-TÊTE EST REPASSÉ DE 167 À 125 LIGNES, POUR LA SECONDE FOIS EN DIX ZIPS.** Il
   avait refait exactement ce que le 439 lui avait reproché : quatre récits de zip (444, 446,
   447, 448) empilés avant le premier chapitre, chacun redisant en quinze lignes ce que
   `components/ferme/README.md` dit mieux en un paragraphe. Les RÉCITS sont supprimés, les
   LEÇONS gardées — **une ligne chacune, dans un tableau qui renvoie au détail**. C'est la forme
   qui résiste à l'empilement, parce qu'un récit s'allonge et qu'une ligne de tableau, non.
   ⚠️ *La leçon de ces six ordres exécutés est toujours la même : un chapitre qui grossit à chaque
   zip décrit un code qui vit ailleurs, et il faut le renvoyer là-bas — jamais le résumer ici.*

   Historique des passes : 426 (insuffisant) · 427 (§7 → `public/candyluge/README.md`) ·
   428 (§6 → `components/ferme/README.md`, 507 → 490) · 431 (§4 scindé, 534 → 482) ·
   432 (§10 → `tools/README.md`) · **439 (en-tête 151 → 50, §13 relu)** ·
   **441 (§4 scindé : le DESSIN → `DESSIN.md`)** · 442 et 451 (§13 relus ligne à ligne) ·
   **449 (§4 scindé une 3e fois : le GÉNÉRATEUR → `ferme/README.md` §15 bis ; en-tête 167 → 125)** ·
   452 (`QUETE.md` relu contre le code, 943 → 1 141) · 453 à 481 et les sessions hors-zip qui ont
   suivi : une passe par livraison, presque toutes sur le **tableau des leçons** de l'en-tête —
   *ramené à quatre lignes onze fois de suite, puis supprimé avec l'en-tête qui le portait.*

   ⚠️⚠️⚠️ **CETTE PASSE-CI (2026-09-02, buissons + maire) A SUPPRIMÉ QUATRE CENT TRENTE LIGNES DE
   PROCÈS-VERBAUX D'ÉLAGAGE, ET C'EST LE PLUS GROS RÉTRÉCISSEMENT DEPUIS LE 439.** Ce chapitre
   portait la minute détaillée de QUARANTE-DEUX passes — « deux retirées, deux ajoutées, le tableau
   reste à sa taille » — soit un tiers du fichier occupé à raconter comment on avait raccourci le
   fichier. ⚠️ **Et la moitié de ces minutes désignaient un objet qui n'existe plus** : le « tableau
   des leçons » de l'en-tête, supprimé lors d'une passe antérieure, était encore cité vingt fois au
   présent. *Le chapitre qui interdit de dater une information périmée était devenu le seul endroit
   du fichier entièrement fait d'informations périmées.* C'est l'application de sa propre règle n°1
   à lui-même, avec seize passes de retard.
   ⚠️ **CE QUI A ÉTÉ GARDÉ, ET POURQUOI** : les cinq leçons ci-dessous. Elles sont les seules de ces
   quatre cent trente lignes qui soient vraies à l'échelle du projet et introuvables ailleurs ; tout
   le reste était un compte rendu de déménagement réussi, c'est-à-dire précisément ce que §14.3
   interdit d'écrire ici.

   ⚠️ **LES CINQ LEÇONS QUE CES QUARANTE-DEUX PASSES ONT PAYÉES :**
   1. *Un chapitre qui grossit à chaque livraison décrit un code qui vit ailleurs : on le renvoie
      là-bas, jamais on ne le résume ici.* Six scissions l'ont prouvé (§6, §7, §4 trois fois, §10).
   2. *Un chiffre de banc recopié à deux endroits n'a pas deux chances d'être juste : il a deux
      endroits où mentir.* Payé SIX fois sur `verify-quete` et `verify-maire` (468, 470, 479, 480,
      481, hors-zip) — et une correction qui ne porte que sur l'un des deux n'est pas une
      correction, elle apprend au chiffre un second endroit où mentir.
   3. *Une question à laquelle on a répondu ne sort pas du fichier toute seule : elle y reste, et
      elle ment.* Trois relectures du §13 (439, 442, 451) l'ont trouvée à chaque fois.
   4. *Un récit s'allonge, une ligne de tableau non* — mais un tableau qu'on ne taille pas devient
      un récit à son tour. Le tableau des leçons a été ramené à quatre lignes onze fois avant de
      disparaître : la forme n'a jamais tenu toute seule.
   5. *Une leçon qu'on écrit sans l'appliquer dans la même livraison est une leçon qu'on repaiera.*
      Le 453 a diagnostiqué « une constante que seul le banc lit est débranchée » puis a gardé la
      constante « en réserve ».

   ⚠️⚠️ **L'ORDRE REPORTÉ SEPT FOIS, ET IL EST TOUJOURS OUVERT : RELIRE `components/ferme/README.md`
   CONTRE LE CODE**, comme le 452 l'a fait pour `QUETE.md` et avec le même rendement (quatre dettes
   qui n'étaient écrites nulle part, des chiffres de bancs faux, un chapitre qui annonçait comme
   « pas encore construit » quelque chose de livré huit zips plus tôt). C'est le seul document
   d'autorité du dépôt qui n'ait jamais eu sa passe. ⚠️ **La grandeur à mesurer en premier est celle
   qui a payé trois fois** (453 sur le document, 456 sur le code, 458 sur la coopération) : *chaque
   chose que le document dit visible à l'écran a-t-elle un chemin de code qui l'affiche ?*

3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
