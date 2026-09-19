# Où's that ?

Jeu de géolocalisation Arcardi jouable seul ou de 2 à 8 joueurs. Tous les
clients reçoivent le même panorama Google Street View ; l'hôte arbitre les
réponses, les changements de manche et la fin de partie.

## Audit comparatif du 2026-09-19 — jeu réel, Street View chargé, solo puis 1v1

**Audit du matin : aucune ligne de code modifiée.** Constats et propositions ; chaque correction
attend l'accord de Guillaume (CLAUDE.md §2). Aucune manipulation Supabase. ✅ **B1–B8 et M1–M3
corrigés l'après-midi même, sur sa commande** — voir « Corrections du 2026-09-19 » ci-dessous.

**Joué** (navigateur intégré, `fake-supabase` + `npm run dev` sur le **port 3000** — le seul port
local que la clé Maps Embed autorise d'après la section « Configuration locale » ; `arcardi-local`
(3100) n'a pas été essayé —, page jetable supprimée) : solo Pinpoint (5 manches, deux parties), Country Streak QCM, passage en 375×812,
duel Pinpoint (3 manches jusqu'à l'élimination, revanche, rechargement de l'invité en pleine manche :
resynchronisé), duel « Devinez le pays » en recherche et en illimité. **Premier audit où les
panoramas s'affichent** (celui du 09-11 tournait sans réseau).
⚠️ Le navigateur d'audit gèle la page entre deux actions (horloge `performance` arrêtée, 815 s de
gel mesurées) : un chrono qui affiche 0:00 sans résoudre et un panorama noir au départ de manche y
ont été vus, **attribués à ce gel, pas au jeu** — à confirmer sur une vraie machine.

### Bogues reproduits (état du matin — tous corrigés depuis, voir plus bas)

| # | Constat | Mesure | Cause probable → piste |
|---|---|---|---|
| ✅ B1 | Après la carte **agrandie**, la révélation cadre à côté : vrai lieu (parfois les deux épingles) hors champ | 2/2 ; canevas 444×302, cible à x=1130, puis x=219/y=550. Vu aussi 1× sur l'écran de fin de duel côté hôte (carte restée sur le dernier cadrage du joueur, aucune épingle visible) | `drawReveal` lance `fitBounds` alors que le portail a encore la géométrie de l'ancre précédente ; le `ResizeObserver` ne fait que `map.resize()` → recadrer (`duration:0`) à chaque redimensionnement tant qu'une révélation est affichée ; mémoïser `reveal` (objet neuf à chaque rendu) |
| ✅ B2 | La pastille « drapeau + Lieu réel » n'est jamais visible | `elementFromPoint` au centre de la pastille → `maplibregl-canvas` | elle vit dans l'ancre, sous le portail (z-index 85 hors de `.ot-root`) depuis le 2026-09-12 |
| ✅ B3 | Duel : « Manche suivante » hors écran à 1280×800 | panneau 598 px, contenu 758–778 px, bouton à y=886 | pied d'actions collant, ou contenu raccourci |
| ✅ B4 | Carte agrandie : l'alerte « Robin a joué — 9 s » est cachée sous la barre d'actions de la carte | 2 sondes sur 3 tombent sur `.ot-map-actions` | l'urgence doit vivre DANS le dock (ou au-dessus du portail) |
| ✅ B5 | Réglages multi Pinpoint : « Lancer la partie » sous le pli pour une fenêtre de ~781 à ~980 px de haut | y=815 à 1280×800 ; le resserrement n'existe que sous `max-height:780px` | pied de carte collant plutôt qu'un seuil |
| ✅ B6 | « Devinez le pays » + carte Australie : la réponse est toujours Australie | 30 167 lieux, tous `AU` ou `null` | griser la carte en mode Pays |
| ✅ B7 | En 1v1, le champ « Délai après la première réponse » est ignoré (10 s fixes) et son aide « Sans effet en durée illimitée » est fausse (les 10 s s'appliquent) | `hostHandleRequest` + écran de réglages | masquer le champ à 2 joueurs ou écrire « Duel : 10 s » |
| ✅ B8 | Premier chiffre du décompte faux pendant ~100 ms (« 38 », « 22 ») | trace DOM : `38` à 9 297 ms, `3` à 9 399 ms | `tick` n'avance qu'en countdown/playing : il est périmé au premier rendu |

Mineurs : le toast « Réponse verrouillée » recouvre la bulle pays repliée (✅ M2) ; la phrase technique
« l'iframe confirme l'ouverture, pas le dernier pixel » s'affiche à chaque manche ; « Mettre en pause »
proposé en solo (✅ M1) ; total solo affiché deux fois ; carte recréée à chaque manche (`MapPortal` démonté en
preparing/countdown, contrairement au « seul montage » décrit plus bas — ✅ M3, phrase corrigée) ; la révélation zoome jusqu'à
17,7 (91 m d'écart : deux épingles sur un aplat, aucun nom de lieu) ou 15 sans réponse (aplat beige).

### Corrections du 2026-09-19 — B1–B8 puis M1–M3, vérifiées en jeu

**Joué** : deux clients (hôte et invité) dans un même onglet, chacun dans une iframe à la taille
testée (1280×720, 1280×800, 1366×768, 1440×900, 375×812) ; `fake-supabase` + `npm run dev` sur le
port 3000 ; page jetable supprimée. Chaque bogue reproduit et mesuré AVANT correction. Mesures par le
DOM (`getBoundingClientRect`, `elementFromPoint`, `transform` des épingles), jamais sur capture.

| # | Correctif | Avant → après (mesuré en jeu) |
|---|---|---|
| ✅ B1 | `GuessMap.js` : révélation recadrée à chaque redimensionnement (`duration:0`), sauf après un geste du joueur (`originalEvent`) et jamais en plein vol (rattrapée à `moveend`) ; `map.resize()` juste avant le vol ; marges lues dans le DOM (colonne +/− : 41 px ; hauteur de la pastille). `MapPortal.js` : pose sur l'ancre en `useLayoutEffect`, portail rendu APRÈS les docks ; taille de mise en page (le `scale(.94)` d'entrée du dock ne la change plus). `OusThatGame.js` : `reveal` mémoïsé | carte agrandie puis validée : canevas 444×302, cible (556, 365) et réponse (−114, −64) hors champ ; fin de duel cadrée sur la taille périmée (zoom 9,98 chez l'hôte contre 9,09), épingle rognée en haut → dock normal, dock agrandi, expiration carte agrandie ouverte, fin de duel hôte et invité : toutes les épingles dans le canevas, aucune sous les +/− ni sous la pastille ; recadrées après chacun des 5 formats ; un clic sur « + » suspend le recadrage ; un nouveau rendu garde épingles et caméra ; vol toujours animé (zoom 6,98 → 2,85 en ~1,1 s) |
| ✅ B2 | la pastille vit dans le portail (`overlay` de `MapPortal`), retirée des ancres | centre de la pastille : `maplibregl-canvas` → la pastille, en révélation et en fin de partie, aux 5 formats. ⚠️ Enfin visible, elle recouvrait la tête de l'épingle cible cadrée dans le coin haut-gauche (pastille 12→40 px, épingle 23→77) : d'où la réserve de hauteur de B1 |
| ✅ B3 | `.ot-reveal-dock .ot-reveal-actions` collant, fond du panneau, fin séparateur | « Manche suivante » à y=886–929 (panneau 598 px pour 758) → visible et atteint dans 30 cas sur 30 (duel Pinpoint et Pays × hôte/invité × 5 formats ; solo Pinpoint et Pays × 5 formats) ; panneau qui déborde : barre à 0 px du bord |
| ✅ B4 | en-tête du dock ouvert ou agrandi : le texte de la pastille (`finalAlertText`, même `seconds`) à la place de l'aide, couleur « urgent » du chrono (#ffca5f) | carte agrandie : 3 sondes sur 3 sur `.ot-map-actions` → texte visible dock fermé (pastille), ouvert et agrandi (en-tête), à 1280×800 et 375×812 |
| ✅ B5 | `.ot-setup-actions` collant au bas de `.ot-setup-root`, fond de la carte, séparateur | 815–858 à 1280×800, et sous le pli à toutes les tailles volet avancé ouvert → 25 cas sur 25 visibles sans défilement (multi Pinpoint/Pays × volet fermé/ouvert, solo Pinpoint/Pays, 5 formats) ; en fin de défilement, aucun contrôle sous la barre |
| ✅ B6 | `countryModeAvailable(mapId)` (`locations.js`, dérivé des données, mémoïsé) ; carte grisée avec sa raison (FR/EN) ; passage en mode Pays → carte par défaut ; refus de l'hôte | Australie : 29 896 lieux AU + 271 sans pays, un seul pays → grisée ; clic forcé ignoré ; requête `start` forgée Pays + Australie refusée par l'hôte (reste en réglages), la même sur Beautiful World démarre |
| ✅ B7 | 2 sièges : ligne fixe « 10 s (duel) » ; 3+ en illimité : « Sans effet en durée illimitée, sauf à deux joueurs restants : 10 s » en Pinpoint, ancienne aide en mode Pays (personne n'y est éliminé : elle y reste vraie) | champ 15 s et « Sans effet… » alors que l'alerte disait 10 s → ligne fixe à 2 sièges (FR et EN, deux modes, 120 s et illimité) ; à 3 sièges, l'aide juste selon le mode |
| ✅ B8 | `setTick(Date.now())` dans `applyIncoming` (countdown/playing), même lot que les échéances locales | « 12 » ~100 ms avant « 3 », premier chrono « 2:01 » pour 2:00 → 11 transitions (6 chez l'hôte, 5 chez l'invité) : 3, 2, 1 à chaque fois, premier chrono « 2:00 » |

Facultatifs, après B1–B8 verts : ✅ **M1** « Mettre en pause » masqué en solo (duel : hôte seul,
inchangé) ; ✅ **M2** en mode Pays, le toast « Réponse verrouillée » passe au-dessus de la bulle repliée
(y=691–722 contre 730–786 à 1280×800 ; 691–734 contre 747–803 à 375×812) ; ✅ **M3** phrase du « seul
montage » corrigée plus bas.

**Bancs** : `node tools/verify-ousthat.mjs` **162/162** (144 → 162 : 18 contrôles neufs sur B1–B8 ;
trois contrôles adaptés à la nouvelle intention, aucun supprimé) ; `--falsify` : sortie 1, « 3 ÉCHEC(S)
sur 162 ». Chaque contrôle neuf ou adapté a été falsifié (32 mutations, toutes rouges) — l'une a
trouvé un contrôle B7 aveugle à un texte figé sur « 10 », renforcé depuis. Bundle esbuild : 0 erreur.
`npx next build` : `✓ Compiled successfully`, 9/9 pages (avertissement `G_SOIL` préexistant).

**À juger par Guillaume** : réglages — barre « Valeurs par défaut / Lancer la partie » collée en bas,
fond brun uni, fin séparateur ; « 10 s (duel) » à la place du champ à deux ; Australie grisée en mode
Pays. Révélation — pied d'actions collé ; pastille « Lieu réel » enfin visible ; cadrage un peu plus
reculé (marges haut 100 px et droite 87 px au lieu de 46). En jeu — l'urgence en ambre dans l'en-tête de
la carte ouverte, en 8 px comme l'aide qu'elle remplace (lisibilité à juger). Mode Pays — toast
au-dessus de la bulle.

**Non vérifié** : un vrai appareil tactile ; la production ; un duel à 3+ joué jusqu'à « deux joueurs
restants » (l'aide B7 a été lue à l'écran ; la règle n'a pas changé). ⚠️ Le navigateur intégré a cette
fois bridé `requestAnimationFrame` à 1–2 images/s une fois son volet masqué (120 Hz au départ, aucun
gel de l'horloge) : la parade du worker (CLAUDE.md §10) a rétabli ~63 Hz, puis la capture d'écran a
refusé de s'exécuter — les preuves ci-dessus sont des mesures du DOM.

**Trouvé en vérifiant M2, hors périmètre — ✅ corrigé le 2026-09-19, sur commande de Guillaume** : en
mode Pays, pendant les 10 s, la pastille d'alerte de l'invité recouvrait entièrement sa bulle repliée
(5 sondes sur 5, à 1280×800 et 375×812) : au doigt, impossible d'ouvrir le panneau en touchant la
bulle pendant le délai (à la souris, ses bords l'ouvraient encore au survol). Préexistant.
`.ot-final-alert` vivait au même coin bas-centre que `.ot-locked-toast`, mais n'avait pas reçu le
78 px de M2 (`app/globals.css`, `.ot-arena.country`) — corrigé en l'ajoutant au même sélecteur, donc
avec le même 78 px déjà mesuré juste par M2. Revérifié géométriquement (pas en jeu à deux clients
cette fois : une page statique hors dépôt, servie depuis `public/` le temps du test puis supprimée,
qui rejoue tel quel l'extrait de CSS concerné) à 1280×800 et 375×812 : aucun recouvrement vertical
entre la pastille et la bulle, et `elementFromPoint` au centre de la bulle retombe désormais sur le
bouton, plus sur la pastille. `verify-ousthat` toujours 162/162 (aucun contrôle dédié, comme M1–M3),
`next build` vert. ⚠️ **Ce qui reste comme avant, volontairement pas repris** : la même règle
s'applique aussi quand le panneau est OUVERT (le sélecteur ne distingue pas `.open` de `.collapsed`),
donc la pastille peut retomber DANS le panneau ouvert plutôt qu'au-dessus — exactement le
comportement déjà en place pour `.ot-locked-toast` depuis M2, jamais mesuré non plus dans ce cas.
Même limite, pas une régression neuve.

### Écarts avec GeoGuessr et WorldGuessr

| Sujet | GeoGuessr / WorldGuessr | Où's that aujourd'hui |
|---|---|---|
| Rythme du duel | GeoGuessr : manche suivante automatique, 15 s après le premier guess | 10 s ✓ ; mais l'hôte doit cliquer « Manche suivante » (hors écran à 1280×800), puis 2,5 s + 3 s de décompte, y compris en solo |
| Mini-carte | GeoGuessr : grandit au survol, rétrécit en sortant, épinglable, plusieurs tailles | s'ouvre au survol mais ne se referme pas ; agrandie, elle cache tout le panorama ; attribution dépliée sur ~20–30 % de sa surface |
| Déplacement | Moving / No Move / NMPZ dans les deux (WorldGuessr dessine NM/NMPZ lui-même) ; retour au départ (GeoGuessr) | Moving seul, aucun retour au départ ; 10 panoramas sur 14 étaient des photosphères de particuliers, 9 de ces 10 sans flèche de déplacement visible |
| Fin de partie | GeoGuessr : carte récapitulative de toutes les manches, relecture (Game Review) | solo : 5 tuiles (distances en 8 px) ; duel : seule la dernière manche, aucun historique de PV |
| Cartes | WorldGuessr : 93 cartes pays + ~73 700 cartes communautaires | 2 cartes ; Beautiful World : 24 % de lieux sans pays, France = 11 % du stock |
| Score | décroissance mise à l'échelle de la carte (formule communautaire) | 2 000 km fixes : en Australie, 1 000 km d'erreur = 3 033 pts contre ~664 mis à l'échelle (diagonale 4 953 km) → duels longs, précision peu payée |
| Rendez-vous | défi quotidien (les deux) | aucun — alors que le patron « pure fonction du jour » existe déjà dans le dépôt |
| Social | chat et emotes en partie (WorldGuessr), chat en jeu (Party GeoGuessr) | chat du salon masqué pendant la partie (`body.ousthat-active`) |
| Mobile | apps natives (WorldGuessr) | 375×812 : carte 353×208 dont 44 px d'attribution ; boutons d'angle 24–30 px de haut, texte 8 px ; plein écran inopérant sur iPhone |

### Lisibilité mesurée (1280×800)

Textes à 8–9 px : aide de la carte, boutons d'angle, noms du QCM (9 px), distances et numéros de
manche de la fin solo (8 px), libellé du chrono (9 px). Panneaux QCM et révélation Pays à hauteur fixe :
~35–40 % de vide qui masque le panorama. Dans la révélation invitée, le seul gros bouton est
« Retour au salon » ; côté hôte, il renvoie tout le monde au salon sans confirmation.

### Ordre proposé (une livraison visuelle à la fois)

1. ✅ **Bogues B1–B8**, sans refonte visuelle (2026-09-19, voir ci-dessous).
2. **Rythme** : enchaînement automatique avec compte à rebours visible et pause, pas de décompte en
   solo, Espace/Entrée pour « suivant », Entrée et 1–4 au clavier en mode Pays.
3. **Mini-carte** à la GeoGuessr (survol, épingle, taille mémorisée), attribution compacte, vue de départ
   par carte (Australie).
4. **Fin de partie** : carte de toutes les manches, historique des PV du duel.
5. **Contenu** : carte « couverture officielle » (export GeoGuessr + `import-map.mjs`), décroissance
   mise à l'échelle de la carte, défi du jour.
6. **Modes** : NMPZ par un calque transparent sur l'iframe, « retour au départ » par remontage de
   l'iframe (coût : un rechargement).

### Non vérifié

Le son (jamais entendu), un vrai appareil tactile, la production Vercel, 3 joueurs et plus, le contenu
exact du lien Google « Signaler un problème » (il ouvre bien une page google.com ; qu'elle montre le
lieu est probable, pas vérifié).

## Audit comparatif du 2026-09-11 — avant corrections

⚠️ **Historique.** L'état actuel des écarts est l'audit du 2026-09-19 ci-dessus.

**Non livré :** aucune correction de gameplay ni refonte graphique. Cet audit
cherche les écarts de jouabilité, fluidité et lisibilité pour une soirée à
deux. Les **10 secondes** sont demandées par Guillaume ; les autres changements
ci-dessous sont des propositions à cadrer, pas des décisions actées.

**Vérifié :** `node tools/verify-ousthat.mjs` : **105/105**. Écrans examinés à
1280 × 720, deux clients sur le relais Supabase local. Street View est resté
vide dans le navigateur d'audit : son chargement réel et sa navigation ne
sont pas validés. Les échanges et le chrono ont donc été joués sur deux
manches préparées artificiellement, l'une illimitée, l'autre de 120 s.
La page temporaire a été supprimée. Pas de test tactile physique ni de
session GeoGuessr jouée ; comparaison avec ses sources officielles.

### Les écarts, par priorité

| Priorité | Écart constaté | Effet pour le joueur et correction proposée |
|---|---|---|
| P0 | **La carte recouvre ses commandes**, reproduit à l'écran. React remplace la classe ajoutée par MapLibre par `ot-map-canvas ready` (`GuessMap.js`, rendu final). Le conteneur perd `maplibregl-map` et son positionnement relatif. | La carte remonte sur son en-tête et l'attribution gêne la confirmation. Mesuré : en-tête à y=347, zone de carte à y=399, dessin remontant sur l'en-tête. Conserver explicitement la classe du conteneur et vérifier les limites de chaque zone à l'écran. |
| P0 | **L'état Australie dépasse la taille d'un broadcast Free.** Les seuls 30 167 identifiants dans `locationOrder` pèsent **533 008 octets** en JSON (Beautiful World : 15 473). `emitState` transmet la liste entière ; `saveHostOnly` la sauvegarde à chaque proposition. | Risque de partie qui avance chez l'hôte sans suivre chez l'invité. La limite Supabase Free documentée est **256 KB**. Dépassement mesuré, refus non reproduit en production : le relais local n'applique pas cette limite. Transmettre graine/curseur ou sélection bornée et mesurer le message complet, sans changer d'abonnement. |
| P1 | **Le duel illimité désactive le délai après réponse.** `finalSeconds` vaut 15 et `finalDeadline(..., null, ...)` retourne `null`. Reproduit à deux : l'invité reste à ∞ après confirmation de l'hôte. | La réponse rapide ne met aucune pression. En durée limitée, le délai puis la révélation fonctionnent. Cible demandée : **10 s même sans chrono initial**. Modifier ensemble règle, affichage ∞, texte du réglage et tests : plusieurs tests exigent aujourd'hui le comportement contraire. |
| P1 | **Le rythme s'interrompt à chaque tour.** Chargement puis **2,5 s de stabilisation + 3 s de décompte** ; après le résultat, l'hôte seul peut relancer. La carte de réponse est démontée, une autre créée pour le résultat, puis encore une au tour suivant. | Attente répétée, pas de signal « prêt » de l'invité, taille/ouverture réinitialisées. Conserver la carte et ses préférences, préparer le prochain tour pendant le résultat, prévoir une transition commune avec pause. Les 5,5 s sont un coût programmé, pas un chargement réel mesuré ; ne pas les supprimer à l'aveugle. |
| P1 | **Urgence et résultats peu personnels.** Alerte de 9 px en bas : « Un joueur a répondu : délai final déclenché. ». Aucun son dédié. Les deux joueurs sont à gauche, le chrono à droite. La révélation dit « Dégâts maximum » ; repliée, elle prend le score du premier siège, même chez l'invité. | Mettre les adversaires face à face, le chrono au centre, « Robin a joué — 10 s », un son discret réglable. Montrer qui perd les PV et combien ; la pastille repliée doit garder MON résultat. Les barres animées existent déjà et sont à conserver. |
| P1 | **L'interface ressemble à un tableau de réglages.** Space Mono partout, aides de 8–11 px, nombreux cadres, réglages avancés exposés dès l'entrée. À 1280 × 720, « Lancer la partie » est sous le pli. | Prioriser mode/carte/Jouer et ranger les multiplicateurs dans un volet. Retrouver la typographie et la chaleur du salon ; retirer de l'écran de jeu le texte technique sur l'iframe et les coordonnées à cinq décimales. |
| P1 | **Le signalement peut rester sans effet.** Pendant `playing`, `canVoidLocation` compare `now <= currentLimit(current)` : en illimité c'est `now <= null`, donc faux. Après une confirmation, la requête est également refusée alors que le bouton reste affiché. | Rendre les actions disponibles cohérentes avec les règles et annoncer les refus. L'événement `onLoad` ne prouve pas un panorama exploitable ; le délai de 18 s ne couvre que son absence. La panne locale observée ne prouve pas une panne du jeu déployé. |
| P2 | **Exploration et relecture limitées.** Pas de modes de déplacement explicites, ni retour au départ Arcardi, ni historique détaillé de duel (`history` n'est alimenté qu'en solo Pinpoint ou en Pays). La carte commence toujours sur `[4,18]`, zoom 1,6, même en Australie. | Commencer par cadrer la carte sélectionnée et permettre la relecture des manches. Étudier séparément les contrôles de caméra : une iframe Maps Embed ne donne pas le pilotage complet du panorama. Ne pas promettre une parité avec Moving/No Move/NMPZ par simple CSS. |

### Contrat proposé pour les 10 secondes

- En 1VS1, la **première validation**, pas le simple placement du marqueur,
  lance 10 secondes pour l'autre joueur, y compris en durée initiale illimitée.
- S'il reste moins de 10 s sur le chrono initial, conserver la fin la plus proche.
- La deuxième validation termine immédiatement la manche. À expiration, le
  dernier marqueur proposé compte ; sans marqueur, le score est nul.
- Un doublon ou une reconnexion ne doit jamais réarmer le délai. L'hôte
  arbitre ; l'invité reconstruit une durée restante à la réception.
- Vérifier les deux sens (hôte puis invité, invité puis hôte), l'expiration,
  la validation simultanée, les réponses tardives et la reconnexion avec latence.
- La demande vise le 1VS1 ; l'extension à 3+ et aux finales à deux d'une partie
  commencée à plusieurs reste à cadrer.

### Proposition graphique Arcardi

**Bungee pour le titre, Outfit pour lire et agir**, chiffres tabulaires pour
le chrono. Ces polices existent déjà dans le salon : aucune nouvelle police
n'est nécessaire pour la première passe. Textes usuels autour de 14–16 px,
labels secondaires autour de 12–13 px, à juger en situation. Moins de
majuscules, de lueurs et de panneaux imbriqués ; crème, ambre, mascottes et
cyan en accent. Garder le panorama dominant. Livrer la typographie puis la
composition séparément, conformément à CLAUDE.md §2.

**Ordre proposé :** géométrie de carte et états réseau → règle des 10 s et
retour clair → typographie → transitions et composition. À cadrer avant la
refonte : palette sombre actuelle ou plus proche du salon, enchaînement
automatique avec pause ou accord « prêts ». Le choix des 10 s est déjà exprimé.

### Sources et limites de la comparaison

Le support GeoGuessr indique **15 secondes** après le guess adverse : les
**10 secondes** sont ici un réglage Arcardi avec le même principe de pression.
[Support GeoGuessr](https://geoguessr.freshdesk.com/support/solutions/articles/206000056716-troubleshooting-for-common-issues).
GeoGuessr décrit un flash d'urgence en Party Duels, le détail des dégâts et
la relecture des positions. Ses multiplicateurs ont évolué ; copier son
ancien barème n'est pas un préalable à améliorer notre fluidité.
[Notes officielles du 17 avril 2026](https://geoguessr.canny.io/changelog/patch-notes-17th-april-2026).
Moving, No Move et NMPZ sont listés dans le
[guide officiel du jeu classé](https://www.geoguessr.support/support/solutions/articles/206000056733-a-guide-to-geoguessr-s-ranked-play).
Les limites techniques viennent des documentations
[Supabase Realtime](https://supabase.com/docs/guides/realtime/limits) et
[Google Maps Embed](https://developers.google.com/maps/documentation/embed/embedding-map#streetview_mode).

Aucune manipulation Supabase effectuée. Les corrections prioritaires proposées
ne demandent ni changement de schéma, ni nouvelle API, ni abonnement payant.

### Corrections appliquées

- ✅ **P0 — géométrie de la carte** (2026-09-11) : `GuessMap.js` gardait le `className` React
  comme seule source de vérité sur le conteneur MapLibre, effaçant `maplibregl-map` — donc son
  `position:relative` — à chaque passage de `mapReady`. La classe "ready" passe désormais par
  `classList.toggle` dans un effet ; le `className` JSX reste stable, MapLibre garde la sienne.
  Confirmé à l'écran avant/après (page jetable, supprimée après usage).
- ✅ **P0 — volume réseau Australie** (2026-09-11) : `locationOrder` (533 008 octets mesurés
  pour les 30 167 identifiants) n'est plus stocké dans l'état diffusé ni persisté.
  `orderForMatch(matchId, mode, mapId)` (`locations.js`) le redérive localement, mémoïsé à une
  seule entrée — hôte et invité recalculent bit à bit le même tableau depuis `matchId`/
  `config`, déjà dans l'état partagé. Mesuré après coup : 908 octets pour un état de manche
  typique.
- ✅ **P1 — les 10 secondes après la première validation, même en durée illimitée**
  (2026-09-11) : tranché par Guillaume, **duel 1v1 uniquement**. `DUEL_FINAL_SECONDS = 10`
  (`rules.js`) s'arme dès que `eligible.length === 2`, y compris quand `current.deadline`
  est `null` (illimité) — les parties à 3+ gardent `finalSeconds` (15 s par défaut),
  inchangé, extension hors scope. Le HUD bascule de "∞" au compte à rebours réel dès que
  `state.finalDeadline` est posé. `tools/verify-ousthat.mjs` : **106/106** (chiffre final des
  trois corrections ci-dessus, ne pas recopier un compte intermédiaire).
- ⚠️ **Vérification partielle sur ces trois points** : le premier a été confirmé à l'écran
  (page jetable, supprimée après usage) ; les deux autres ne le sont que par le banc et une
  mesure en Node (octets, déterminisme hôte/invité) — **aucun n'a tourné en session réelle à
  2 clients** (`fake-supabase.mjs`, CLAUDE.md §10). Le duel 10 s n'a jamais été joué dans un
  vrai navigateur : les deux sens hôte/invité, la validation simultanée, les réponses
  tardives et la reconnexion avec latence restent à voir avant de le considérer acquis.
- ✅ **P1 — le signalement peut rester sans effet en durée illimitée** (2026-09-11) : tranché
  par Guillaume, activer plutôt que masquer. `canVoidLocation` compare `now` à `currentLimit`,
  qui vaut `null` tant que personne n'a confirmé en illimité — `now <= null` vaut `now <= 0`,
  toujours faux. Extrait en règle pure dans `rules.js` (même garde que `canAcceptAnswer` :
  `limit === null` veut dire « rien à comparer », pas « déjà expiré ») pour que le banc puisse
  la jouer sans passer par le composant. **Vérifié en session réelle à 2 clients**
  (`fake-supabase.mjs`) : un signalement pendant `playing`, en illimité, avant toute
  confirmation, change bien le panorama chez l'hôte ET chez l'invité — c'est la première fois
  qu'un point de cet audit tourne dans un vrai navigateur à deux, pas seulement au banc.
- ✅ **P1 — l'interface ressemble à un tableau de réglages** (2026-09-11) : tranché par
  Guillaume, « typo seule d'abord, palette dans une livraison séparée ». Bungee/Outfit
  remplace Space Mono sur l'écran de réglages seul (`.ot-setup-root`, pas `.ot-root` : le HUD
  et la révélation gardent Space Mono, à traiter avec la composition, pas la typo) ; les
  multiplicateurs vivent dans un volet replié par défaut (`.ot-advanced`, jamais replié sur
  une erreur de validation) ; les coordonnées à cinq décimales du marqueur de réponse ont
  disparu, remplacées par `c.markerPlaced`. ⚠️ Mettre le curseur de durée EN PREMIER dans la
  grille — il forçait vie/délai sur deux rangées séparées à moitié vides quand il coupait entre
  eux — a rendu 144 px à lui seul ; avec un resserrement de marges ciblé sous 780 px de hauteur,
  « Lancer la partie » tient au-dessus du pli à 1280×720, **mesuré** (`getBoundingClientRect`),
  pas supposé. Guillaume a aussi demandé en direct un geste sur les bandeaux de joueurs du HUD
  (police, espacement) : fait en petit, ce n'est pas la refonte face-à-face ci-dessous.
  `tools/verify-ousthat.mjs` : **116/116**.
- ✅ **P1 — le rythme des tours, « carte persistante + pause »** (2026-09-12) : tranché par
  Guillaume, préchargement + pause sur l'attente, dock qui referme son ouverture mais garde sa
  taille. Les trois `<GuessMap>` (dock de jeu, dock de révélation, modale de fin — trois
  géométries CSS différentes, dont une dépend de la hauteur d'un texte voisin) sont remplacés par
  UN SEUL montage PAR MANCHE, porté par `MapPortal.js` : trois ancres vides, une couche
  `position:fixed` resynchronisée sur l'ancre active à chaque image (measure, jamais un calcul CSS
  statique). ⚠️ *Corrigé le 2026-09-19 (M3) : ce texte disait « un seul montage » tout court.* Le
  portail n'est rendu qu'en `playing`/`reveal`/`finished` (`mapActive`) : il est démonté en
  `preparing`/`countdown`, donc la carte MapLibre est recréée à chaque manche — la même carte ne
  sert qu'entre le jeu d'une manche et sa révélation (ou la fin de partie).
  `GuessMap.js` perd son prop `expanded` (devenu inutile) pour un `ResizeObserver` qui réagit à
  n'importe quelle cause de redimensionnement, pas seulement l'ouverture du dock de jeu.
  Le panorama de la manche suivante charge caché (iframe hors écran) PENDANT la révélation —
  aucun protocole réseau nouveau, chaque client rattrape son propre accusé `panorama_loaded` dès
  que la manche prédite devient réelle. Le décompte (`countdown`, jamais `preparing`, qui n'a pas
  d'horloge visible) se met en pause côté hôte (`toggleTransitionPause`, règle pure de
  `rules.js`) : une DURÉE figée, jamais une horloge comparée entre clients. ⚠️ **Bogue trouvé EN
  JOUANT, invisible en relisant** : `.ot-map-portal` avait un z-index de 20, qui ne bat que ses
  frères dans son propre contexte d'empilement — or `.ot-root` (l'écran de jeu entier) est en
  `position:fixed;z-index:80`, donc tout ce qu'il contient passait au-dessus du portail quel que
  soit son z-index local. Le clic atterrissait sur l'ancre vide, jamais sur la vraie carte,
  **sans aucune erreur** : le marqueur ne se posait tout simplement jamais. Corrigé (z-index:85,
  au-dessus de `.ot-root`). **Vérifié en session réelle à 2 clients** (`fake-supabase.mjs`) sur
  trois manches jouées : carte cliquable, révélation avec pins/lignes sur les vraies tuiles,
  pause/reprise avec le même nombre figé chez l'hôte ET l'invité, dock qui rouvre en plein écran
  après une manche où il l'était déjà. `tools/verify-ousthat.mjs` : **134/134**.
- ✅ **P1 — typographie sur le reste du jeu** (2026-09-12) : `.ot-root` passe à son tour d'Space
  Mono à Outfit — le HUD, la révélation et la fin de partie rejoignent l'écran de réglages, qui
  l'était déjà depuis le 2026-09-11. **Seul le chrono (`.ot-round-clock`) reste épinglé en Space
  Mono**, sur demande explicite de Guillaume (« touche pas au décompte, il est bien ») : sélecteur
  dédié, mécanisme (`toggleTransitionPause`, `pausedCountdownMs`) intouché. Quelques nombres
  (dégâts, scores, historique) gagnent `font-variant-numeric:tabular-nums`, déjà en place ailleurs
  (curseur de durée, PV des joueurs). `tools/verify-ousthat.mjs` : **134/134**.
- ✅ **P1 — urgence et résultats, face à face/chrono central/son/pastille personnelle**
  (2026-09-12) : direction tranchée par Guillaume (bloc ⏭️ REPRISE de CLAUDE.md), codée le même
  jour. Le duel (exactement deux sièges, la même borne que `DUEL_FINAL_SECONDS`) retrouve un HUD
  face à face avec le chrono au centre — pas une nouvelle disposition : la réactivation de
  `.ot-hud` SANS `.ot-hud-many` (grid à trois colonnes, miroir `nth-child(3)`), orpheline dans le
  CSS depuis le passage au roster horizontal (v2) mais jamais supprimée. Les parties à 3+ gardent
  ce roster, inchangé. L'alerte 9 px générique (« Un joueur a répondu ») devient un message nommé
  et vivant (« Robin a joué — 10 s »), qui relit le même compte à rebours que le chrono — aucune
  horloge dupliquée. Un bip discret et réglable (icône 🔊/🔇, synthétisé par Web Audio, aucun
  fichier à livrer) sonne une fois par manche pour le seul joueur qui doit se presser ; la
  préférence vit dans `localStorage`, PAR SPECTATEUR, jamais dans l'état de partie diffusé. La
  pastille repliée de la révélation gardait le score du premier siège pour tout le monde : elle
  garde maintenant MON résultat (`myId`, retombe sur `players[0]` seulement si `myId` est absent).
  `tools/verify-ousthat.mjs` : **144/144**, dix contrôles neufs falsifiés un par un avant d'être
  crus. `npx next build` (worktree isolé) : `✓ Compiled successfully`, 9/9 pages. **Vérifié en
  session à 2 clients** (deux onglets, `fake-supabase.mjs`) : HUD face à face confirmé à l'écran
  des deux côtés, alerte nommée avec décompte réel, pastille distincte par joueur (240 côté hôte,
  0 côté invité sur la même manche), aucune erreur console. Le cas à 3 joueurs a aussi été rejoué
  pour confirmer que le roster horizontal n'a pas bougé. ⚠️ **Ce qu'aucun banc ni session
  automatisée ne peut juger** : le son n'a jamais été ÉCOUTÉ par un humain, et le ton du message
  comme l'équilibre visuel du nouveau face-à-face n'ont été jugés par personne — reste à Guillaume
  de jouer une vraie session (voir le bloc ⏭️ REPRISE de CLAUDE.md).
- ⚠️ **Séance complémentaire à 2 clients, JOUÉE PAR CLAUDE sur demande explicite de Guillaume**
  (2026-09-12, « joue une vraie session à deux pour juger » — précédent identique à l'exception du
  2026-09-01, §13). Cinq manches (Pinpoint et Pays), les DEUX sens du duel (le second, invité
  confirme en premier, restait explicitement à voir), plusieurs transitions de manche, un passage
  en viewport mobile (375 px). Tout tient : HUD face à face lisible aux deux formats, alerte nommée
  correcte dans les deux sens et les deux modes, pastille distincte par joueur confirmée une
  seconde fois, aucune erreur console (à part `ERR_CONNECTION_REFUSED` sur l'iframe Street View —
  panne du bac à sable sans réseau réel, déjà documentée le 2026-09-11). ⚠️⚠️ Cette séance ne
  change rien à la limite ci-dessus : elle ne prouve toujours pas que le son est agréable à
  l'oreille ni que le ton/l'équilibre visuel plaisent — Claude ne peut ni les entendre ni les juger.
- ✅ **P1 — palette du salon, écran de réglages seulement** (2026-09-12) : deux décisions listées
  et tranchées par Guillaume avant tout code (§2) — **portée** : réglages d'abord, comme la typo,
  pas encore le HUD/révélation/fin de partie ; **fidélité** : une variante nocturne propre au jeu
  (pas un alias direct des variables globales `--ink`/`--p2`/`--acc-ousthat` du reste du site).
  Fond gardé sombre (le panorama ailleurs en a besoin) mais réchauffé — bleu nuit (`#060914`) vers
  brun sombre chaud (`#100a06`/`#241a10`). Le cyan qui dominait sélections, focus et libellés
  devient de l'ambre (`--ot-gold`) ; **cyan gardé sur un seul rôle** (le curseur de durée),
  conformément à « crème, ambre, mascottes et cyan EN ACCENT » de la proposition d'origine.
  Nouvelles variables `--ot-cream`/`-dim`/`-mute`, toutes redéclarées SUR `.ot-setup-root` — le
  HUD/révélation/fin de partie, en dehors de ce sélecteur, ne les voient pas et gardent leur bleu
  nuit actuel. `.ot-orbit`/`.ot-text-button` (partagés avec le reste du jeu) sont surchargés
  localement plutôt que modifiés à la source. **Regardé à l'écran** (page jetable, supprimée après
  usage), Pinpoint et Pays, réglages avancés compris : cohérent, aucune régression de lisibilité.
  `tools/verify-ousthat.mjs` : **144/144** (rien à mesurer côté banc, c'est de la couleur pure).
  `npx next build` (worktree isolé) : `✓ Compiled successfully`, 9/9 pages. ⚠️ **Ce que ça ne
  prouve pas** : que ce ton plaît — seul Guillaume le juge, en jouant (§13).

**Étape suivante, pour Guillaume seul** : jouer une vraie session à deux (recette §10,
`fake-supabase.mjs`) et juger les trois livraisons du jour — le duel face-à-face, le message et
le son, la palette du réglages. Si elle convainc, l'étendre au HUD/révélation/fin de partie sera
une **nouvelle** livraison visuelle, séparée (§2), pas un prolongement silencieux de celle-ci.

## Parcours de jeu

- **Solo — Country Streak** : trouver le pays jusqu'à la première erreur.
  L'écran de départ permet de choisir entre quatre drapeaux en QCM ou une
  recherche dans les 114 pays et territoires de l'Explorer GeoGuessr relevés
  le 2026-09-06. Le pays correct et la réponse sont révélés après chaque tour.
- **Solo — Pinpoint** : placer cinq points sur la carte, puis obtenir un total
  final sur 25 000 et le détail des cinq manches. À la révélation, la position
  réelle porte une épingle verte ancrée par sa pointe, avec le drapeau à côté ;
  les réponses conservent les mascottes des joueurs.
- **Multi — Pays** : cinq manches, un point par bonne réponse, classement final
  et ex aequo conservés.
- **Multi — Pinpoint** : le meilleur score de chaque manche ne perd rien ;
  chaque adversaire moins précis perd son propre écart au meilleur, multiplié
  par le coefficient courant. Un joueur à 0 PV devient spectateur. Le dernier
  encore en vie gagne.

Le dernier choix proposé compte à l'expiration même s'il n'a pas été confirmé.
Une confirmation est définitive. En multi à durée limitée, la première
confirmation raccourcit l'échéance sans jamais la rallonger. En duel (deux
joueurs), la première confirmation donne toujours 10 s à l'autre, même en
illimité (`DUEL_FINAL_SECONDS`) ; à trois et plus, le délai final reste
désactivé en illimité.

L'hôte règle la durée entre 20 et 300 secondes ou choisit Illimité (valeur 0),
en solo comme en multi. Une durée limitée devient une échéance côté hôte ;
les invités ne comparent jamais directement leurs horloges.

## Cartes (2026-09-06)

Le tirage des lieux se fait dans une **carte** choisie à l'écran de réglages
(les deux modes, Pays et Pinpoint, s'y réfèrent). Deux cartes sont présentes :
**Beautiful World** (1 551 lieux) et **Australie** (30 167 lieux) — voir
`maps.js` pour le registre et `locationOrder(seed, mode, mapId)`
(`locations.js`) pour le tirage borné à la carte choisie.

Ajouter une carte future (à partir d'un export GeoGuessr que Guillaume
fournit, même format que celui déjà utilisé) :

1. `node tools/import-map.mjs <source.json> <id-de-carte> "<Nom affiché>"`
   → écrit `components/ousthat/mapData.<id>.js` (généré, ne pas éditer).
2. Importer ce fichier dans `maps.js` et l'ajouter à `MAPS`.
3. Ajouter `<id-de-carte>` à `GAME_MAP_IDS` dans `rules.js`.

Rien d'autre à toucher : le sélecteur du setup, la validation de config et
`tools/verify-ousthat.mjs` lisent tous le registre, pas une liste recopiée.
Un `mapId` inconnu ou un croisement mode/carte sans aucun lieu retombe sur
la carte par défaut côté moteur, et est refusé avec un message côté client
avant même d'envoyer la requête de lancement.

## Configuration locale

Le jeu utilise les variables publiques suivantes dans `.env.local` :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=VOTRE_CLE_MAPS_EMBED
```

Ne jamais mettre de clé `service_role` dans une variable `NEXT_PUBLIC_*`.
La clé Maps Embed est nécessairement visible dans le navigateur : elle doit
être restreinte à **Maps Embed API** et aux seuls référents exacts
`https://arcardi.vercel.app` et `http://localhost:3000`. Ne jamais ajouter de
joker de domaine ni activer une autre API sur cette clé. La documentation de
facturation Google Maps Embed est :
https://developers.google.com/maps/documentation/embed/usage-and-billing

En production, Vercel porte les vraies variables publiques Supabase et Maps
Embed. Le `.env.local` du dépôt reste volontairement factice pour la recette :
ne pas y recopier les valeurs du Dashboard. L'architecture doit rester gratuite
: Vercel **Hobby**, Supabase **Free** avec spend cap activé, Maps Embed seulement,
et OpenFreeMap sans compte ni clé. Un quota atteint doit interrompre ou
restreindre le service, jamais produire un dépassement facturé.

## Supabase existant

Aucune nouvelle table, colonne, policy ou fonction n'est requise pour ces
modes. Le jeu réutilise :

- `rooms.game_state` pour l'instantané persistant ;
- Realtime sur `rooms` et `room_players` ;
- `rooms.launch_at` et `rooms.stage_launch_at` pour les transitions partagées ;
- `room_players.wins`, `room_players.losses` et `add_game_result` pour les
  parties multi uniquement. Une partie solo ne modifie jamais ces compteurs.

Pour auditer un projet déjà créé sans le modifier, exécuter
`supabase/verify-ousthat.sql` dans le SQL Editor. Toutes les lignes de la
colonne `ok` doivent être vraies. Si une ligne manque, appliquer seulement la
mise à niveau correspondante, dans l'ordre : `upgrade-002.sql`,
`upgrade-003.sql`, puis `upgrade-004.sql`. Ne pas rejouer `schema.sql` au hasard
sur un projet existant : certaines policies de base ne sont pas recréables.

État du projet Supabase Arcardi au 2026-09-06 : audit final 10/10. Les seules
corrections nécessaires étaient l'ajout de `rooms` et `room_players` à la
publication `supabase_realtime` ; elles ont été appliquées sans modification
de données.

## Règles Pinpoint calculées

- 5 000 points jusqu'à 25 m inclus ; au-delà :
  `round(5000 × exp(-distanceKm / 2000))`, plafonné à 4 999.
- La distance est un Haversine avec rayon terrestre moyen de 6 371,0088 km et
  normalisation du passage à l'antiméridien.
- À l'expiration, le dernier marqueur proposé compte même s'il n'a pas été
  confirmé. L'absence de marqueur vaut 0.

Les bornes des réglages et les calculs purs vivent dans `rules.js`. Le banc
`node tools/verify-ousthat.mjs` couvre notamment score, dégâts à plusieurs,
élimination, séries, QCM, cinq manches, expiration, reprise et branchements.

## Réseau et reprise

Les invités n'envoient que des requêtes ; l'hôte les valide, diffuse le nouvel
état et l'enregistre dans `rooms.game_state`. Les propositions de carte sont
bridées sous 10 messages/s. Le chrono invité est reconstruit à la réception à
partir d'une durée restante : deux horloges de machines ne sont jamais
comparées. Une reconnexion demande l'instantané vivant à l'hôte.

Le panorama reste masqué jusqu'à l'acquittement des joueurs connectés, ajoute
2,5 s de stabilisation, puis un décompte de 3 s. Une iframe chargée prouve que
le document Google s'est ouvert, pas que sa dernière tuile est rendue.

## Interface : masque, plein écran, fin de partie (2026-09-06)

L'iframe Street View n'a **jamais** `allowFullScreen` : Google y promeut SON
contenu seul dans le calque plein écran, hors de portée d'un masque posé en
frère dans le DOM. Le plein écran est donc rendu par Arcardi lui-même
(`requestFullscreen()` sur `ot-arena`, bouton dédié dans le coin) — masque et
HUD sont des **descendants** de l'élément promu, ils restent affichés par-
dessus à n'importe quelle taille. `toggleFullscreen` encaisse un refus
(Permissions-Policy, iframe sans `allow="fullscreen"`) par `try/catch` et
`.catch()` : Chrome peut lever un `TypeError` **synchrone**
(« Permissions check failed »), pas seulement rejeter une promesse — trouvé
en jouant, pas en relisant.

Le masque d'adresse (`ot-google-place-mask`) est en `pointer-events:auto` : un
masque qui laisse passer le clic n'est qu'un habillage visuel, pas un
bouclier. Son empreinte (position, taille, dégradé) ne se retouche pas — elle
couvre exactement le texte de Google. Seul l'habillage (coin arrondi, liseré,
glyphe à faible opacité) peut changer.

La fin de partie s'incruste sur le dernier panorama (`FinishedDock`, voile +
carte flottante), au lieu d'une page séparée — même principe que la
révélation manche par manche (`RevealDock`), qui avait déjà quitté ce travers
le même jour.

## Fournisseurs et licences

- Panorama : Google Maps Embed API, demandé par identifiant de panorama.
- Carte de réponse : MapLibre GL JS 4.7.1 avec un style VECTORIEL écrit à la
  main (`guessMapStyle.js`, 2026-09-07, remplace le raster OpenTopoMap) sur
  les tuiles gratuites et sans clé de l'OpenStreetMap US Tileservice —
  frontières, libellés pays/capitales/villes bilingues FR/EN, rues nommées.
  Les numéros de route portent le VRAI code couleur du pays (rouge/blanc
  pour une autoroute française, jaune/noir pour une route de voïvodie
  polonaise, bouclier bleu pour une Interstate US…) via la bibliothèque CC0
  `@americana/maplibre-shield-generator` et ses ~1 900 définitions de réseaux
  routiers, vendorisées dans `public/ousthat/shields/` — voir
  `shieldLayer.js` et THIRD_PARTY_NOTICES.md. Un réseau routier absent de
  cette table retombe sur un panneau générique (numéro seul), jamais sur rien.
  Le zoom continu accepte pavé tactile, molette, pincement et boutons ; les
  pins portent les mascottes Arcardi pour les réponses, tandis que le vrai
  lieu est une épingle verte avec drapeau séparé. Aucun compte, clé ou moyen
  de paiement requis ; l'attribution (OSM + OpenStreetMap US + Americana)
  reste visible et aucune tuile n'est préchargée ou relayée par Arcardi.
  ⚠️ Piège mesuré en construisant ce style : l'événement MapLibre "load"
  attend que TOUTES les tuiles de la vue courante arrivent — au zoom monde de
  départ, ça veut dire le monde entier, plusieurs secondes avec du vectoriel.
  `GuessMap.js` attend seulement `isStyleLoaded()` (le squelette du style,
  indépendant des tuiles) avant d'afficher la carte ou de lancer le vol vers
  la cible d'une révélation.
- Panoramas : 38 enregistrements tirés de la dernière révision WorldGuessr
  encore sous MIT, complétés le 2026-09-06 par la carte personnelle que
  Guillaume a construite dans l'éditeur GeoGuessr (~1500 lieux après
  déduplication — voir `tools/import-locations.mjs`). Aucun ajout PolyForm
  Noncommercial n'est repris. La majorité des lieux ajoutés n'ont pas de
  panorama figé : `streetViewUrl` demande alors `location=lat,lng` plutôt que
  `pano=<id>`, et Google résout lui-même le panorama le plus proche — c'est le
  fonctionnement natif de la plupart des lieux GeoGuessr eux-mêmes. Le
  rattachement pays se fait hors ligne, par point-dans-polygone contre les
  frontières Natural Earth (voir THIRD_PARTY_NOTICES.md) : un lieu non
  rattachable reste jouable en Pinpoint mais n'est jamais tiré en mode Pays
  (`locationOrder(seed, "country")` filtre sur ce champ).
- Vocabulaire pays/territoires : liste factuelle de l'Explorer officiel
  GeoGuessr relevée le 2026-09-06 ; aucun code ni visuel GeoGuessr n'est repris.

Les révisions, URLs, périmètres et textes de licence sont consignés dans
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
