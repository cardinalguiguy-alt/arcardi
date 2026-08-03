# ARCARDI 🎪

> **ZIP 404 — LE VERGER SE SÈME COMME UNE GRAINE, ET LES FRUITS DESCENDENT AU BAC.**
> Demande de Guillaume : « pour les nouveaux arbustes fruitiers et buissons, il
> faut que greg puisse aussi les planter. Donc **même mécanisme que les seeds et
> crops habituels**, pour qu'ils apparaissent au même endroit dans le shop, et
> que greg puisse les planter. aussi, **je ne sais pas pourquoi les fruits
> apparaissent dans le bag...** »
>
> | | avant | après |
> |---|---|---|
> | **on plante un plant** | case 4 (Construction) | **case 3 (Graines)**, dans le même menu |
> | **on l'achète** | section Constructions | **section Graines & cultures** |
> | **Greg** | ne sait pas | **plante, et abat sur sélection** |
> | **on vend un fruit** | dans le sac | **au bac**, avec les cultures |
>
> ⚠️ **CE QUI NE POUVAIT PAS ÊTRE FAIT, ET POURQUOI CE N'EST PAS GRAVE.** Le 398
> a sorti les vergers de `CROPS` exprès : le pipeline des cultures tient sur une
> hypothèse gravée partout — *une culture disparaît quand on la récolte*. Un
> pérenne dans `CROPS` demanderait un drapeau lu à sept endroits dont trois qui
> ne se connaissent pas. Mais la demande porte sur le **geste**, pas sur la table
> de données : où on l'achète, avec quelle touche on le pose, qui d'autre sait le
> poser. Tout cela a été rattrapé **sans toucher au modèle et sans un seul
> message réseau neuf** — un plant part en `plantOrchard`, la requête que l'hôte
> connaît depuis le 398.
>
> ⚠️ **DEUX CHOSES S'APPELAIENT « FRUIT », ET C'EST PROBABLEMENT LA VRAIE CAUSE
> DE SA QUESTION.** `f.inv.fruit`, la pomme ramassée sur un arbre de la forêt,
> 18 or, vendue **au bac** sous le libellé « Fruit ». Et `f.inv.fruits`, les
> citrons/fraises/framboises/myrtilles des vergers, 70 à 110 or, vendus **dans le
> sac**. Deux stocks, deux prix, un seul mot à l'écran. **Mon propre contrôle est
> tombé dans le piège** : écrit avant la correction, il a cru les fruits de
> verger déjà au bac — il avait trouvé le bouton de la POMME. Une collision de
> noms qui trompe l'outil chargé de la détecter trompe aussi le joueur. La pomme
> s'appelle désormais « pomme des bois », et `sellFruit` s'appelle
> `sellWildApple`.
>
> **Greg abat sur sélection au clic**, hors des options proposées et il a eu
> raison : abattre est irréversible — des heures de pousse et jusqu'à 1 400 or.
> On marque les arbres un par un (cadre rouge + croix), le panneau compte, et on
> valide. **L'hôte revalide chaque case** avec la même fonction que le marquage.
>
> ⚠️ **TROUVÉ EN CHEMIN, HORS DE LA DEMANDE : UN INDICE EN DUR AVAIT SURVÉCU AU
> 403 ET LÂCHAIT L'ANIMAL QU'ON PORTE.** `selectSlot` testait `s !== 6`. La case
> troupeau était l'indice 6 avant le 403 ; depuis, l'indice le plus haut est 4,
> donc la condition était **toujours vraie** : porter un agneau et cliquer sur sa
> propre case pour ouvrir le menu — geste que le 403 a précisément rendu normal —
> le reposait au sol **sans un mot**. Le contrôle du 403 cherchait quatre formes
> (`slotRef.current === N`, `sl === N`, `slot === N`, `selectSlot(N)`) et le
> paramètre s'appelle `s`. **Un contrôle qui énumère des formes ne protège que
> des formes énumérées** — `verify-cycle.mjs` couvre `s` et `setSlot(` depuis ce
> zip.
>
> ⚠️ **ET J'AI ÉCRIT LE PIÈGE 375 MOI-MÊME, EN DIRECT.** La marque d'abattage
> était dessinée en lisant l'état React `gregChopMarks` — or le dessin vit dans
> la closure du gros `useEffect`. Le compte du panneau flottant aurait augmenté à
> chaque clic et **aucune marque ne serait apparue sur la ferme** : la moitié
> visible de la fonctionnalité marche, donc on cherche le défaut partout sauf là.
> Corrigé en refs, et `verify-vergers.mjs` interdit le retour de l'état React à
> cet endroit.
>
> **Le numéro de touche a quitté les textes.** Le 401 a corrigé « touche 8 » en
> « touche 6 », le 403 a dû recorriger en « touche 4 », et le contrôle généralisé
> du 403 rendait la phrase des vergers littéralement impossible à écrire juste,
> puisqu'elle parle d'une AUTRE case. `orchardShopHint` reçoit désormais sa
> touche de `SLOT_ORDER`. **Un texte qui contient un numéro de touche est un
> texte qui périme.**
>
> **Un outil neuf** : `tools/verify-vergers.mjs` — 58 contrôles,
> écrit AVANT la correction, **16 échecs au premier lancement**.


> **ZIP 403 — LA BARRE PASSE DE HUIT CASES À CINQ.**
> Demande de Guillaume : « 4 5 7 et 8 doivent être fusionnés avec rotation »,
> puis, mis en options, une réponse qui sort du cadre et qui fait foi :
> « **Mettre la canne, les snacks dans le bag finalement. Au clic, on pourra
> les consommer (snacks) ou les déployer ; et retirer les cases qui étaient
> attribuées.** »
>
> | avant | après |
> |---|---|
> | 1 outils ⟳ · 2 arrosoir · 3 graines · 4 nourriture · 5 canne · 6 **construction** ⟳ · 7 troupeau · 8 main | 1 outils ⟳ · 2 arrosoir · 3 graines · 4 **construction** ⟳ · 5 troupeau/main ⟳ |
>
> **Manger et pêcher ne sont pas des outils qu'on tient, ce sont des gestes
> qu'on fait de temps en temps.** Ils descendent dans le sac, en deux lignes
> cliquables copiées sur celle de la trousse de soins : le joueur connaît déjà
> ce geste. « Déployer » la canne l'ARME ; elle se range dès qu'on choisit une
> case, sans quoi on pêcherait en croyant labourer.
>
> ⚠️ **LE VRAI CHANTIER N'ÉTAIT PAS LA BARRE, C'ÉTAIT LES TRENTE INDICES EN
> DUR.** La position d'une case était comparée EN CHIFFRE à trente endroits de
> `FermeGame.js` : réordonner la barre, c'était retrouver trente comparaisons
> dans seize mille lignes, et **une seule oubliée donne une touche qui fait
> silencieusement autre chose**. L'ordre est donc décrit **une fois**
> (`SLOT_ORDER`), tout le reste le lit, et `verify-cycle.mjs` **interdit qu'un
> seul indice en chiffre revienne** — le contrôle a été écrit AVANT la
> correction, et il a échoué, ce qui est la seule preuve qu'il mesure quelque
> chose.
>
> Le contrôle des touches annoncées dans les textes a été **généralisé** : il
> compare à la position RÉELLE de la case au lieu de chercher un chiffre écrit
> en dur. Celui du 401 cherchait « touche 8 » et aurait laissé passer
> « touche 6 », qui est devenue fausse à son tour.
>
> **Trouvé en relisant, pas en jouant :** la première écriture des menus rendait
> le panneau des décorations **inatteignable** — plus personne n'appelait
> `setHandMenuOpen(true)`. Règle retenue : *le premier clic demande ce qu'on
> veut porter, les suivants ouvrent ce qu'on porte.*


> **ZIP 402 — LE MOULIN NE REFUSAIT PLUS RIEN EN SILENCE.**
> Retour de Guillaume : « vérifie la posabilité des moulins. il y a une ferme
> où c'est buggé. j'en pose ils disparaissent aussitôt. Et après on me dit que
> le nombre max est atteint. »
>
> Le moteur a été **interrogé** plutôt que relu (`tools/verify-cycle.mjs`), et
> il a répondu **quatre** fois :
>
> 1. **le deuxième clic reprenait le moulin, sans un mot** — poser et retirer
>    sont le même geste sur la même case ; mesuré : 1er clic → moulin au sol,
>    stock 5→4 ; 2e clic → plus rien, stock 4→5. C'est littéralement « j'en
>    pose ils disparaissent aussitôt » ;
> 2. **quinze sols le refusaient sans rien dire** — pavage, sable, rive, ponts,
>    jetée. Sur une ferme dont la place libre est pavée, poser un moulin ne
>    fait *rien*, et rien ne l'explique ;
> 3. **déposer du blé sans moulin terminé sortait en silence**, et quand un
>    moulin est plein le message est « Le moulin est plein » — ce qui se lit
>    très exactement comme « le nombre maximum est atteint » ;
> 4. **cliquer un moulin encore en chantier ne faisait rien du tout** — et
>    c'est le moment précis où l'on clique dessus.
>
> ⚠️ **Aucune règle de jeu ne change** : ni plafond, ni verrou, ni délai. Ce
> sont les six phrases qui manquaient. Un jeu qui refuse sans le dire est
> indiscernable d'un jeu cassé — et c'est bien pour un jeu cassé qu'il l'a pris.
>
> Corrigé aussi : le rebasculement de juillet, qui repassait sur « clôture »
> après CHAQUE pose et cassait la pose en série. Il ne rebascule plus qu'au
> dernier moulin du sac. Et le cycle de la case 6 accueille enfin le **chaudron**
> et les **trois variantes de pont** — les ponts n'ont pas de stock propre, ils
> apparaissent selon le bois et la pierre disponibles.


> **ZIP 401 — LES ARBUSTES SE TRAVERSENT, ET LA ROTATION SE VOIT.**
> Deux demandes de Guillaume, et deux défauts de nature opposée.
>
> **Les arbustes fruitiers** — « ils sont en dur, provoquent une collision or
> je veux pas cela ». `O_ORCHARD` et `O_BERRY_BUSH` sortent des DEUX listes de
> collision, à pied comme à cheval. Ce sont les seuls objets du jeu dont on
> récolte sans les détruire : on revient dessus tous les jours. Ce qui prend du
> temps n'est pas de retirer deux identifiants, c'est de savoir ce que ça
> casse — `tools/verify-cycle.mjs` le demande au moteur : on cueille encore un
> verger **debout dessus**, et un rocher bloque toujours.
>
> **La rotation de la case 6** — elle EXISTAIT depuis juillet et Guillaume ne
> l'avait jamais trouvée. Le défaut n'était pas le mécanisme, c'était
> l'affordance : rien ne disait qu'appuyer une deuxième fois sur 6 changeait
> quelque chose, et **trois textes de la boutique annonçaient la touche 8**,
> qui n'est plus la bonne depuis la réorganisation de la barre. Un chevron ⟳
> sur les cases qui tournent, le nom de la variante tenue au-dessus de la case
> sélectionnée, et une infobulle qui liste tout le cycle.
>
> ⚠️ **La liste affichée EST la liste qui tourne.** `buildCycle()` et
> `toolCycle()` sont appelées par la touche et par l'affichage. Recopier la
> liste dans l'interface aurait produit, au premier ajout de variante, une case
> qui en annonce une de moins qu'elle n'en propose. `verify-cycle.mjs` compte
> les listes littérales : il doit y en avoir exactement UNE.


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
