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
  final sur 25 000 et le détail des cinq manches.
- **Multi — Pays** : cinq manches, un point par bonne réponse, classement final
  et ex aequo conservés.
- **Multi — Pinpoint** : le meilleur score de chaque manche ne perd rien ;
  chaque adversaire moins précis perd son propre écart au meilleur, multiplié
  par le coefficient courant. Un joueur à 0 PV devient spectateur. Le dernier
  encore en vie gagne.

Le dernier choix proposé compte à l'expiration même s'il n'a pas été confirmé.
Une confirmation est définitive. En multi, la première confirmation raccourcit
l'échéance sans jamais la rallonger.

## Configuration locale

Le jeu utilise les variables publiques suivantes dans `.env.local` :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=VOTRE_CLE_MAPS_EMBED
```

Ne jamais mettre de clé `service_role` dans une variable `NEXT_PUBLIC_*`.
La clé Maps Embed est nécessairement visible dans le navigateur : elle doit
être restreinte à **Maps Embed API** et aux référents HTTP des domaines Arcardi
ainsi qu'à `localhost` pour le développement. La documentation de facturation
Google Maps Embed est :
https://developers.google.com/maps/documentation/embed/usage-and-billing

Si le dépôt local contient encore une URL Supabase factice, le propriétaire du
projet doit remplacer lui-même les deux valeurs Supabase dans `.env.local` et
dans les variables d'environnement de l'hébergeur, puis redémarrer Next.js.

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

## Fournisseurs et licences

- Panorama : Google Maps Embed API, demandé par identifiant de panorama.
- Carte de réponse : Leaflet 1.9.4 et tuiles standard OpenStreetMap, avec
  attribution visible et sans préchargement ni proxy.
- Panoramas : 40 enregistrements tirés de la dernière révision WorldGuessr
  encore sous MIT. Aucun ajout PolyForm Noncommercial n'est repris.
- Vocabulaire pays/territoires : liste factuelle de l'Explorer officiel
  GeoGuessr relevée le 2026-09-06 ; aucun code ni visuel GeoGuessr n'est repris.

Les révisions, URLs, périmètres et textes de licence sont consignés dans
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
