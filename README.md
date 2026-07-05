# ARCARDI 🎪

Soirée de mini-jeux multijoueurs **en ligne**, à distance, entre 2 et 4+ amis. Comptes email/mot de passe, salons avec code à partager, scores synchronisés en direct via Supabase Realtime.

## Statut actuel

✅ Comptes (inscription / connexion), profils (pseudo, avatar)
✅ Salons avec code à 6 caractères, joignables depuis n'importe où dans le monde
✅ Liste des joueurs et scores synchronisés en direct
✅ Interface bilingue FR/EN (bouton en haut à droite)
✅ **Quiz Éclair** en réseau (questions synchronisées par l'hôte, scores atomiques)
✅ **Piano Escape Room** 🎹 — escape game coopératif : 5 salles, piano jouable, énigmes de musique classique, code final. Le premier qui résout fait avancer toute l'équipe (+3 pour lui, +1 pour les autres).
✅ Records : chaque partie enregistre les points dans `game_results`, et les totaux de profil se mettent à jour automatiquement (trigger SQL).
🥚 Quelques easter eggs sont cachés dans le site. Indice : les grands compositeurs ne font pas de soupe.
⏳ Prochains portages possibles : Mot Mystère, Puissance 4, Réflexes, Memory, Simon, Calcul.

> ⚠️ Après chaque mise à jour du code, pensez à exécuter les éventuels fichiers `supabase/upgrade-XXX.sql` dans le SQL Editor de Supabase. Pour cette version : `upgrade-001.sql`.

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

Le pattern du `QuizGame` (dans `components/QuizGame.js`) est réutilisable pour les 7 autres jeux :
1. Créer `components/NomDuJeu.js` sur le même modèle (canal broadcast `nomdujeu_{room.id}`)
2. L'ajouter dans `app/room/[code]/page.js` (bouton de lancement + rendu conditionnel selon `room.current_game`)
3. Chaque bonne action du joueur met à jour `room_players.score` via Supabase
