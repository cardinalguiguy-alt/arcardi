# Où's that ?

Jeu de duel de géolocalisation 1 contre 1 intégré au salon Arcardi. Chaque
client reçoit le même panorama Google Street View, pose un marqueur sur une
carte Leaflet/OpenStreetMap, puis l'hôte arbitre le score, les dégâts, les PV,
les changements de manche et la victoire.

Pendant une manche, la carte est rétractée en un bouton rond pour laisser le
panorama respirer. Elle se déploie à la demande, peut passer en plein écran et
conserve le marqueur lorsqu'elle est refermée. La révélation remplace le point
réel générique par le drapeau du pays, sur la carte comme dans sa légende.

## Configuration locale

Le panorama utilise l'API **Google Maps Embed**, pas une clé ou un service de
WorldGuessr. Ajouter dans `.env.local`, puis redémarrer Next.js :

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=...
```

La clé est nécessairement publique dans le navigateur. Elle doit être limitée
à **Maps Embed API** et aux référents HTTP des domaines Arcardi (ainsi qu'à
`localhost` pour le développement). L'API Embed est annoncée sans frais et
sans limite quotidienne par Google à la date de cette livraison, mais elle
requiert un projet Google Cloud et une clé valide :
https://developers.google.com/maps/documentation/embed/usage-and-billing

Sans clé, l'écran de réglage reste utilisable et explique l'intervention
requise, mais le bouton de lancement est désactivé. Une iframe chargée signale
que le document Google s'est ouvert ; les navigateurs n'exposent pas la fin de
chargement de chaque tuile à la page parente. Le jeu masque donc le panorama
jusqu'à l'acquittement des deux iframes, ajoute 2,5 s de stabilisation, puis un
décompte de 3 s. C'est la synchronisation loyale réalisable avec une iframe
cross-origin, pas une preuve du dernier pixel rendu.

## Règles calculées

- 5 000 points jusqu'à 25 m inclus ; au-delà :
  `round(5000 × exp(-distanceKm / 2000))`, plafonné à 4 999.
- La distance est un Haversine avec rayon terrestre moyen de 6 371,0088 km et
  normalisation du passage à l'antiméridien.
- Dégâts : valeur absolue de l'écart entre les deux scores, multipliée par le
  multiplicateur de manche puis arrondie. Seul le score le plus faible perd
  ces PV. Une égalité ne fait aucun dégât.
- Une confirmation verrouille irréversiblement la réponse. Le premier verrou
  ramène l'échéance à `min(échéance initiale, maintenant + délai final)`.
- À l'expiration, le dernier marqueur proposé compte même s'il n'a pas été
  confirmé. L'absence de marqueur vaut 0.

Les bornes des réglages et tous les calculs purs vivent dans `rules.js`. Le
banc `node tools/verify-ousthat.mjs` les appelle réellement, y compris les cas
antiméridien, expiration, double résolution, multiplicateurs, drapeaux et victoire.

## Réseau et reprise

`OusThatGame.js` suit l'architecture d'autorité du dépôt : les invités
émettent des requêtes, l'hôte les valide, applique le nouvel état, le diffuse
et l'enregistre dans `rooms.game_state`. Les marqueurs ne partent qu'au clic ou
en fin de glissement et sont bridés sous 10 messages/s. Le chrono affiché par
un invité est reconstruit à la réception depuis une **durée restante** envoyée
par l'hôte ; les horloges de deux machines ne sont jamais comparées.

Une reconnexion demande l'instantané vivant à l'hôte. L'état persistant couvre
la manche, les lieux déjà consommés, les propositions, confirmations, PV et
réglages. Aucune migration Supabase supplémentaire n'est requise : le module
réutilise `rooms.game_state` et les RPC déjà utilisées par les autres jeux.

## Fournisseurs et licences

- Panorama : Google Maps Embed API, demandé par `pano` avec latitude/longitude
  conservées pour le calcul du score.
- Carte de réponse : Leaflet 1.9.4 et tuiles standard OpenStreetMap. Le crédit
  OpenStreetMap reste visible. Aucun préchargement, téléchargement en masse ou
  proxy de tuiles n'est effectué. Le service standard est communautaire et
  sans SLA ; pour une exploitation importante, prévoir un fournisseur de
  tuiles dédié conforme à la politique OSM.
- Sélection initiale : 40 enregistrements de panoramas extraits de la dernière
  révision WorldGuessr encore sous MIT. Aucun moteur, composant ou ajout publié
  sous PolyForm Noncommercial n'est repris.

Les révisions exactes, URLs, périmètres et textes de licence sont consignés
dans [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
