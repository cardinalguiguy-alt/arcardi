# ARCARDI 🎪

Soirée de mini-jeux multijoueurs **en ligne**, à distance, entre 2 et 4+ amis. Comptes email/mot de passe, salons avec code à partager, scores synchronisés en direct via Supabase Realtime.

## Statut actuel

✅ Comptes (inscription / connexion), profils (pseudo, avatar)
✅ Salons avec code à 6 caractères, joignables depuis n'importe où dans le monde
✅ Liste des joueurs et scores synchronisés en direct
✅ Interface bilingue FR/EN (bouton en haut à droite)
✅ **Quiz Éclair** 🧠 en réseau — 20 questions de culture générale, tout le monde répond en même temps (questions synchronisées par l'hôte, scores atomiques)
✅ **Mot Mystère** 🔤 — Wordle-like en réseau, chacun devine le même mot caché de son côté, le plus rapide marque le plus de points, progression des autres visible en direct
✅ **Worldle** 🌍 — devine le pays mystère à l'aide de la distance, de la direction et du % de proximité (~48 pays)
✅ **Piano Escape Room** 🎹 — escape game coopératif : 5 salles, piano jouable, énigmes de musique classique, code final. Le premier qui résout fait avancer toute l'équipe (+3 pour lui, +1 pour les autres).
✅ **Puissance 4** 🔴 — premier jeu de plateau à deux. Si le salon a exactement 2 joueurs, la partie démarre directement ; sinon l'hôte choisit qui affronte qui, les autres suivent le match en direct. Victoire +3, défaite +1, match nul +2.
✅ **Petits Chevaux** 🐴 — jeu de plateau classique, jusqu'à 4 joueurs. Si le salon a entre 2 et 4 joueurs, la partie démarre directement avec une couleur par joueur ; au-delà, l'hôte choisit qui joue (2 à 4), les autres suivent en direct. Dé arbitré par l'hôte, capture des pions adverses (sauf sur les cases étoilées), 3 x 6 d'affilée = tour perdu, victoire dès que les 4 pions d'une couleur sont rentrés (+3 pour le vainqueur, +1 pour les autres).
✅ Records : chaque partie enregistre les points dans `game_results`, et les totaux de profil se mettent à jour automatiquement (trigger SQL).
✅ Interface repensée : le jeu en cours prend toute la priorité visuelle (le salon se réduit en barre compacte), fondu enchaîné entre les écrans (salon ↔ jeu, changements de phase), grille de cartes pour choisir un jeu.
✅ Le code du salon devient une pastille discrète en haut à droite de l'écran une fois la partie lancée (`app/globals.css` → `.room-code-fab`), au lieu d'un bandeau au-dessus du jeu — priorité à la jouabilité, moins de distraction visuelle.
✅ Favicon/icône d'onglet propre à ARCARDI (mosaïque des 4 couleurs de tuiles de la marque), fini le "V" générique du navigateur — fichiers `app/icon.png` et `app/apple-icon.png`, détectés automatiquement par Next.js (aucun code à modifier pour ça).
🥚 Quelques easter eggs sont cachés dans le site (et sont volontairement plus rares qu'avant).
⏳ Prochains chantiers : Monopoly et Échecs (mêmes patterns réseau que Puissance 4 / Petits Chevaux), puis un nouveau jeu arcade façon escape room sur le thème de la musique, puis une refonte de Piano Escape Room pour le rendre plus stressant.

> ⚠️ Aucun script SQL supplémentaire n'est nécessaire pour cette mise à jour — `upgrade-001.sql` (déjà exécuté) suffit toujours, `game_id` étant un simple champ texte.

## 1. Configuration locale

```bash
npm install
cp .env.local.example .env.local
```

Remplis `.env.local` avec les valeurs de ton projet Supabase (Project Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

Lance en local :

```bash
npm run dev
```

Puis ouvre http://localhost:3000

## 2. Base de données Supabase

Dans le dashboard Supabase → **SQL Editor** → New query, colle tout le contenu de `supabase/schema.sql` et clique **Run**.

Ça crée :
- `profiles` — un profil par compte (pseudo, avatar, points cumulés)
- `rooms` — les salons de soirée (code à partager)
- `room_players` — qui est dans quel salon, avec son score
- `game_results` — historique des points gagnés par mini-jeu (pour les records)

Toutes les tables ont des règles de sécurité (Row Level Security) : chacun ne peut modifier que ses propres données, même si la clé publique est visible dans le code.

## 3. Déploiement sur Vercel

1. Va sur [vercel.com/new](https://vercel.com/new)
2. Importe ce dépôt GitHub (`arcardi`)
3. Dans **Environment Variables**, ajoute les deux mêmes variables que dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique **Deploy**

Une fois déployé, Vercel te donne une URL publique (ex: `arcardi.vercel.app`) — c'est ce lien que tu partages à tes amis, où qu'ils soient.

## Comment ça marche (architecture)

- **Auth** : Supabase Auth (email + mot de passe), avec confirmation par email.
- **Salons** : chaque salon a un code unique. Rejoindre = ajouter une ligne dans `room_players`.
- **Temps réel** : deux mécanismes complémentaires de Supabase Realtime :
  - *Postgres Changes* pour tout ce qui doit être persistant (liste des joueurs, scores) — écouté par tout le monde dans le salon.
  - *Broadcast* (canal éphémère, sans écriture en base) pour le déroulé rapide d'un mini-jeu (question actuelle, minuteur) — l'hôte du salon pilote le rythme du jeu et diffuse les événements aux autres écrans.
- Chaque joueur calcule sa propre réponse localement puis écrit son score dans `room_players` — protégé par une règle RLS qui empêche de modifier le score de quelqu'un d'autre.

## Ajouter un nouveau mini-jeu

Le pattern du `QuizGame` (dans `components/QuizGame.js`, aussi utilisé par `WordGuess.js` et `Worldle.js`) est réutilisable pour les prochains jeux "tout le monde joue en même temps" :
1. Créer `components/NomDuJeu.js` sur le même modèle (canal broadcast `nomdujeu_{room.id}`)
2. L'ajouter dans `GAME_META`/`GAME_ORDER` en haut de `app/room/[code]/page.js` (icône, couleur d'accent, clés i18n) + le rendu conditionnel selon `room.current_game`
3. Chaque bonne action du joueur met à jour `room_players.score` via Supabase

### Jeux de plateau (Puissance 4, Petits Chevaux, Monopoly, Échecs)

`components/ConnectFour.js` (2 joueurs) et `components/PetitsChevaux.js` (2 à 4 joueurs) servent de modèle pour tous les prochains jeux de plateau. Le principe, à répliquer :
- Le composant reçoit une prop `players` (liste complète du salon) en plus de `room`/`me`/`isHost`/`t`/`lang`/`onFinish`.
- **Choix des joueurs** : si le salon a exactement le bon nombre de joueurs pour le jeu (2 pour Puissance 4, 2 à 4 pour Petits Chevaux), la partie démarre automatiquement dès que le canal est prêt. S'il y a plus de joueurs que le maximum du jeu, l'hôte voit un écran de sélection avant de lancer — les autres suivent en spectateurs.
- **Arbitrage** : l'hôte reste la seule source de vérité du plateau (et du dé pour Petits Chevaux), qu'il joue ou non. Chaque action est envoyée en broadcast (`move_attempt`, `roll_attempt`), seul l'hôte la valide et rediffuse l'état à jour (`state`) ; tout le monde affiche uniquement ce qui revient par broadcast.
- **Points** : chaque joueur (pas l'hôte à leur place) écrit sa propre ligne dans `game_results` — obligatoire à cause des règles RLS.
- **Fondu enchaîné** : le composant `Crossfade` encapsule les transitions entre phases (`<Crossfade id={phase}>{contenu}</Crossfade>`) ; réutilise-le pour les prochains jeux de plateau plutôt que des coupures sèches.
- **Petits Chevaux en particulier** : la géométrie du plateau (piste commune de 56 cases, couloirs privés de 6 cases par couleur, cases sûres) est définie en haut de `components/PetitsChevaux.js` sous forme de données pures (`TRACK`, `COLORS`), avec des fonctions utilitaires testables séparément de l'affichage (`cellFor`, `canMoveToken`, `applyMove`). Si Monopoly ou Échecs ont besoin d'un plateau ou d'un moteur de règles complexe, ce découpage données/logique/affichage est le pattern à suivre.

Ce pattern permettra d'ajouter Monopoly et Échecs sans changer l'architecture du salon.
