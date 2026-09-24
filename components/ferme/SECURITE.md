# SECURITE.md — sécurité et synchro multijoueur de la ferme (audit du 2026-09-24)

**Autorité pour tout ce qui touche à qui peut lire/écrire une ferme, à la confiance entre clients,
et à la fluidité réseau du multi.** Né d'une conversation de Guillaume (« qu'est-ce qui pose un
problème de sécurité ou de synchro en multi ? »). **RIEN N'EST CODÉ, AUCUNE MIGRATION N'A ÉTÉ
ÉCRITE OU EXÉCUTÉE** : c'est un dossier prêt pour le jour où Guillaume veut s'en occuper. Règle du
projet (CLAUDE.md §2) : aucune migration SQL sans sa validation préalable.

⚠️ **Méthode et limites.** Lecture de code uniquement (`FermeGame.js`, `fermeConstants.js`,
`lib/supabaseClient.js`, `supabase/schema.sql`, `supabase/upgrade-005.sql`). **Aucune séance à
deux clients, aucune mesure de débit.** Les numéros de ligne dérivent : chercher par SYMBOLE.
Contrainte permanente de Guillaume : **architecture durablement gratuite** (CLAUDE.md §0, §3 — un
quota peut interrompre, jamais facturer).

## 1. Constat sécurité, par gravité réelle (jeu de 2-3 amis)

1. ⚠️ **`ferme_saves` est lisible ET écrasable par tout compte connecté, pour n'importe quel code
   de ferme** (`upgrade-005.sql` : trois politiques `to authenticated … using (true)` /
   `with check (true)`, commentaire « volontairement permissive »). Le code choisi par l'hôte est
   la seule clé (`loadFarmByCode` lit, `persistFarm` fait `upsert … onConflict: "code"`).
   Un code deviné = des semaines de ferme écrasées. **Seul risque de perte irréversible.**
2. **Le canal Realtime est public** : `supabase.channel(GAME_ID + "_" + room.id)`, aucune
   autorisation. Tout client avec la clé anon et l'id du salon (les `rooms` sont en lecture
   publique) peut émettre `apply`, que TOUS les clients appliquent sans contrôle (`applyDeltas`) :
   or, tuiles, cultures. Correctif possible : canaux `private` + Realtime Authorization (gratuit,
   demande une migration). Ça ne lie PAS le contenu d'un message à un compte (une RLS sur
   `realtime.messages` ne voit que le topic) — voir 3.
3. **Les identités et positions sont déclaratives.** `req.id`, `pos.id`, `leave.id` viennent du
   client et `hostHandleReqUnsafe` les croit ; `px/py/pz` aussi, donc le contrôle « je suis au
   marché » (`E.atMarket`, zip 431) se contourne avec un client modifié. **Accepté entre amis**
   (l'hôte est un navigateur et fait autorité : il peut aussi tricher). Seul un serveur blindait
   ça, et ce n'est pas gratuit.
4. **L'hôte est un point de défaillance unique** : onglet fermé / tablette verrouillée ⇒ les `req`
   des invités restent sans réponse, l'état n'est plus sauvegardé (une bannière « hôte absent »
   existe : `hostActivity`/`hostAway`). Migration d'hôte = gros chantier, **non recommandée**.

## 2. Décisions prises en conversation — à ne pas rejouer

- ❌ **`owner_id` verrouillé sur le compte de l'hôte : REJETÉ.** Le flux réel est que n'importe
  quelle personne connaissant le code charge la ferme depuis son PROPRE salon et sauvegarde avec
  ce code (Guillaume peut être absent, son amie « gère la ferme pour nous »). Un propriétaire
  unique lui interdirait d'écrire : ses navets ne seraient pas sauvegardés. **Modèle voulu : le
  secret partagé (nom + mot de passe) donne le droit de gérer, pas un compte.**
- ✅ **Les invités n'ont besoin d'aucun mot de passe** : ils rejoignent le salon de l'hôte ; leurs
  actions passent par `req` → l'hôte arbitre et sauvegarde. Seul l'HÔTE saisit nom + mot de passe.
- ✅ **Idée retenue par Guillaume : ajouter un mot de passe (ou PIN) au nom de ferme.** Utile,
  À CONDITION d'être vérifié **côté base** : un contrôle seulement dans le jeu se contourne en
  appelant la table directement (elle est ouverte à tout compte connecté).

## 3. Conception du mot de passe de ferme (esquisse, non écrite)

1. Une colonne `pin_hash` (bcrypt via `pgcrypto`, jamais en clair) sur `ferme_saves`.
2. Deux fonctions `SECURITY DEFINER` : `load_farm(nom, mdp)` et `save_farm(nom, mdp, état)`. Même
   erreur pour « nom inconnu » et « mauvais mot de passe » (pas d'énumération des fermes).
3. **Retirer les trois politiques `using (true)`** : plus aucun accès direct à la table.
4. **Blocage des essais ratés** par ferme (compteur + `locked_until`). Sans lui, un PIN à 4
   chiffres (10 000 combinaisons) se force en minutes. Préférer un mot de passe libre, ou PIN ≥ 6
   chiffres AVEC blocage. **Question restée ouverte : mot de passe libre ou PIN ?**
5. **Coût : nul.** Ce sont des appels REST `rpc`, pas des messages Realtime : ni quota de 2 M, ni
   spend cap concernés.
6. ⚠️ **Migration des fermes existantes** : Guillaume doit poser LUI-MÊME le mot de passe de
   chacune de ses fermes dans le SQL Editor AU MOMENT de la migration. Sinon la première personne
   qui « réclame » un nom sans mot de passe en prend possession.
7. **Mot de passe oublié = récupération par Guillaume dans le SQL Editor** (pas d'e-mail de
   réinitialisation). La mémorisation côté appareil stockerait le mot de passe EN CLAIR dans
   `localStorage`, comme le fait déjà `ferme_lastcode` pour le code.
8. **Tous les points d'accès à `ferme_saves` sont à basculer sur les fonctions** : `loadFarmByCode`
   (lecture), `persistFarm` (écriture), et le contrôle d'existence de la table dans
   `app/room/[code]/page.js` (`select("code").limit(1)`). **Relancer un `grep` complet avant de
   commencer** : je n'en ai vu que trois, sans garantie d'exhaustivité.
9. ⚠️ **Ce que ça ne règle PAS** : le canal Realtime en direct reste public (constat 2), et le
   **double-hôte** ci-dessous.

## 4. Historique des sauvegardes (indépendant du mot de passe, à faire avec)

- **Double-hôte** : si deux personnes ouvrent la même ferme en même temps (chacune dans son
  salon, même code), chacune écrase l'autre — cas plus probable qu'une attaque. Aucun mot de
  passe n'y change rien.
- Parade : une table d'historique (les 5 à 10 dernières versions par ferme), écrite par
  `save_farm`. Stockage négligeable à cette échelle, gratuit. Restauration par le SQL Editor.
- **Variante sans schéma pour le point 1 seulement** : rendre le code de ferme difficile à
  deviner (généré ou longueur minimale). Moins fort qu'un mot de passe vérifié en base, mais rien
  à migrer.

## 5. Synchro — points de lecture et pistes gratuites

- ⚠️ **`apply` sans accusé ni séquence** : un message perdu (plafond `eventsPerSecond: 10`
  silencieux, micro-coupure) désynchronise un invité jusqu'au rechargement. Piste : un compteur
  `seq` dans les `apply` (coût nul : seul le nombre de `send()` compte, CLAUDE.md §3) ; un trou
  déclenche le `hello` → `snapshot` qui existe déjà.
- ⚠️ **Le mouvement des joueurs est déjà bien conçu** (émission à l'intention `maybeSendPos`,
  vitesse transmise `pubMe.vx/vy`, tampon adaptatif `remoteBufferMs`, extrapolation
  `advanceRemote`, `POS_TICK_HZ = 8`). Aucun défaut évident à la lecture.
- **HYPOTHÈSE NON MESURÉE des saccades** (Guillaume les constate à plusieurs) : le plafond de
  10 msg/s est PARTAGÉ entre la position de l'hôte (8 Hz) et tous ses flux périodiques — loups
  (0,5 s), chevaux (0,7 s), Greg/Soan (0,7 s), Harald (0,5 s), `visitorSim` (750 ms), `apply` d'actions,
  `station`. Somme estimée > 10/s quand tout est à portée (les gardes AOI en retirent une partie) ;
  l'excédent est perdu SANS ERREUR. Signature attendue si vrai : **l'invité voit l'hôte et les
  bêtes saccader plus que l'inverse.** ⚠️ **À vérifier d'abord** : de quoi Guillaume parle-t-il
  exactement (l'autre joueur ? les PNJ et animaux ?), puis instrumenter les intervalles
  d'arrivée par type d'événement avant de toucher au code.
- **Leviers gratuits** (seul le nombre de `send()` compte) : (1) **fusionner tous les flux
  périodiques de l'hôte en UN message par tick** ; (2) étendre aux animaux/loups/chevaux/PNJ le
  `netPath` + `netPathStartAt` que les résidents utilisent déjà (waypoints + vitesse, rejoués
  localement) ; (3) *dead reckoning* côté émetteur : n'émettre que si l'écart avec ce que le
  récepteur extrapole dépasse un seuil — remplace le keep-alive de 2 s et corrige les glissements
  le long des murs.

## 6. Idées d'expérience à plusieurs (pistes, rien décidé, rien construit)

Gouvernées par l'objectif §0 (amis qui se voient peu, 2-3 joueurs) et par le retour le plus
répété de Guillaume (plus d'indicateurs de progression). Coût réseau nul ou d'une `req`.
1. **Carnet de ferme asynchrone** (« pendant ton absence, X a récolté, Y a réparé ») — vit dans
   `ferme_saves`, aucun coût réseau, donne envie de revenir. **Premier choix proposé.**
2. Gestes qui demandent deux personnes : scie à deux poignées (déjà prévue, CLAUDE.md §13),
   porter un tronc, tirer une charrette, four dont l'un allume et l'autre alimente.
3. Menaces qui obligent à se répartir : orage (cultures / bêtes), loups repoussés à deux positions.
4. Jauge commune avec récompense visible dans le monde (fête de la récolte, commissions).
5. Signaux de présence légers : « viens ici » sur la carte, émotes, icône de l'action de l'autre.
6. Spécialités complémentaires (recettes à deux métiers). **Non vérifié** : ce qui existe déjà
   comme échange de stock entre joueurs.

## 7. Ordre proposé (Guillaume n'a encore rien tranché)

(a) protéger `ferme_saves` (mot de passe vérifié en base + historique) — migration à valider ;
(b) fusionner les flux périodiques de l'hôte ; (c) `seq` sur les `apply` ; (d) carnet de ferme.
**Avant (b) : mesurer** (§5). **Le jour où ce chantier s'ouvre, DEMANDER par lequel commencer et
mot de passe libre ou PIN** — ne pas choisir seul (CLAUDE.md §2).
