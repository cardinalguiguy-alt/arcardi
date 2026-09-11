# Où's that ?

Jeu de géolocalisation Arcardi jouable seul ou de 2 à 8 joueurs. Tous les
clients reçoivent le même panorama Google Street View ; l'hôte arbitre les
réponses, les changements de manche et la fin de partie.

## Audit comparatif du 2026-09-11 — avant corrections

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
- ⏳ **Restent : le rythme des tours (« carte persistante + pause ») et l'urgence/résultats
  (face à face, chrono central, son)** — tranchés par Guillaume, pas codés. Voir le bloc
  ⏭️ REPRISE de CLAUDE.md pour le détail exact et l'ordre. La palette du salon reste une
  troisième livraison séparée, décidée mais pas commencée.

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
confirmation raccourcit l'échéance sans jamais la rallonger. En illimité, le
délai final reste actuellement désactivé (voir l'audit ci-dessus).

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
