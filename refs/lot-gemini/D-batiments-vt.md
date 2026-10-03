# D — LES BÂTIMENTS DE VALLEY TOWN QUI RESTENT (P3)

Les prompts des maisons existent déjà et ont fait leurs preuves : **ne pas les réécrire**, les relancer depuis
`refs/prompts-maisons.md` (BASE, ENRICHIE, RICHE, lignes par modèle, relances de cadrage et de fond). Ce fichier ne dit que
QUOI faire, DANS QUEL ORDRE et AVEC QUELLE 4e image.

## D1 — Les maisons larges (9 cases) : 9 images
Méthode du fichier : une conversation neuve par maison ; joindre `refs/hdv.jpg`, `refs/eglise-nouvelle.jpg`,
`refs/tributribu.jpg`, puis la 4e image ; coller la BASE puis la ligne du modèle ; ensuite l'ENRICHIE (même conversation), puis
la RICHE (en re-joignant l'image simple).
| Modèle | 4e image | À enregistrer | Lignes |
|---|---|---|---|
| W1 (fixe l'emprise large : porte au tiers gauche) | `refs/maison-s3.jpeg` | `maison-w1.jpg`, `-enrichie`, `-riche` | `prompts-maisons.md` § Larges, W1 |
| W2 | `refs/maison-s3.jpeg` | idem en `w2` | idem, W2 |
| W3 | `refs/maison-s3.jpeg` | idem en `w3` | idem, W3 |
⚠️ Mesurer la porte AVANT de me les rendre est inutile : je mesure (porte, vantail, pied du mur, vitres) — c'est la règle d'intégration
de `docs/IMAGES-ET-BLENDER.md`.

## D2 — Mises de côté ou en attente d'un emplacement (ne pas lancer sans me le dire)
- **N3** (étroite à tourelle) : mise de côté par vous le 2026-09-27.
- **Gare** : en attente (emplacement de 4 cases, 2,3 H de porte) — ligne dans `prompts-maisons.md` § Phase 6b.
- **Boutique d'objets de plage** : attend un emplacement sur la carte.

## D3 — Café « Chez Juliette » et restaurant : SÉANCE DE CONCEPTION D'ABORD (CLAUDE.md §2 — je ne devine pas)
À trancher avec vous, dans cet ordre (réponses courtes suffisent) :
1. **Quel bâtiment est converti** (`TOWN_SHOP_MODELS` a `garfield` 8 × 5 cases et `salon` 7 × 4) ou un modèle neuf ; quelle emprise.
2. **La fonction** : le café vend des boissons en tout genre ; le restaurant des repas ; lieu de rencontre ET de narration (missions
   futures). Quel rôle pour les résidents.
3. **Le rôle de barman ou de vendeur, accessible aux joueurs SANS casser la mécanique** : toute vente passe par une `req` arbitrée
   par l'hôte comme le marché ; la porte n'est jamais la caisse. L'état vit dans `ferme_saves`. **Aucune migration SQL sans votre validation.**
4. **La carte** (boissons, plats) et ses prix.
5. **L'ambiance** de chaque lieu, en trois mots (café « superbe, cosy, bobo » ; restaurant ?).
6. **Terrasse ou non** (les meubles de la planche C4 existent déjà).
7. **Les intérieurs** : voir D4 — le café en serait la pièce pilote naturelle.

**Façade — ligne PROVISOIRE, à ne coller qu'après la séance** (même BASE, une seule image, 4e image = la boutique dont on prend
l'emprise : `refs/boutique-garfield.jpg` ou `refs/Salon.jpg`) :
- café : `a cosy café-bar: a dark-green painted timber shopfront with large multi-pane display windows, a warm cream upper storey, a blank gilded signboard above the shopfront, a scalloped striped cream-and-sage canvas awning, a blank chalkboard menu by the door, small flower boxes on the upper windows. The front door is left of centre at the same place and the same size as the door of the fourth house.`
- restaurant : `a restaurant with a more formal, warmer façade: a deep burgundy painted shopfront with arched windows with fine glazing bars, a blank brass-framed signboard, a lantern on each side of the door, a pair of potted bay trees by the door, cream stone upper storeys with a wrought-iron balconette. The front door is at the same place and the same size as the door of the fourth house.`

## D4 — Les intérieurs (phase 8) : AUCUN PROMPT TANT QUE CES POINTS NE SONT PAS TRANCHÉS
1. Vue de dessus ou trois quarts.
2. Pièces PEINTES (Gemini, prompts que VOUS collez) ou ASSEMBLÉES (kit de sols, murs, meubles).
3. Pièce pilote.
4. Qui entre : aucun résident n'entre dans un bâtiment aujourd'hui (`res.zone` n'a que `farm` et `town`) ; état, collisions, éclairage
   de nuit (la fenêtre allumée de l'extérieur doit correspondre à l'intérieur).
Quand vous aurez choisi : captures des intérieurs existants (tribunal, mairie, église) à joindre, et je rédige trois familles de
prompts (sols d'intérieur, murs, mobilier) sur le modèle de `A-sols-vt.md` et `C-objets-vt.md`.
