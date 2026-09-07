# Où's that ?

Jeu de géolocalisation Arcardi jouable seul ou de 2 à 8 joueurs. Tous les
clients reçoivent le même panorama Google Street View ; l'hôte arbitre les
réponses, les changements de manche et la fin de partie.

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
Une confirmation est définitive. En multi, la première confirmation raccourcit
l'échéance sans jamais la rallonger.

L'hôte règle la durée de chaque manche entre 20 et 300 secondes, en solo comme
en multi. Cette valeur est validée par les règles puis transformée en échéance
par l'hôte ; les invités ne comparent jamais directement leurs horloges.

## Cartes (2026-09-06)

Le tirage des lieux se fait dans une **carte** choisie à l'écran de réglages
(les deux modes, Pays et Pinpoint, s'y réfèrent). Une seule à ce jour,
**Beautiful World**, qui couvre tout le stock historique (1 551 lieux) — voir
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
