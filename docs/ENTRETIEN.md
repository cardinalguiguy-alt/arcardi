# MAINTENIR CLAUDE.md (§14)

> **Extrait SANS MODIFICATION de `CLAUDE.md` le 2026-10-03** (allègement du noyau : le contexte fixe passe de ~47 k à ~8 k tokens, estimés).
> Les numéros de § sont CONSERVÉS : tout « §N » cité dans le code, les README et les bancs reste valable (table dans `CLAUDE.md`).
> Ce fichier se lit À LA DEMANDE (voir le routeur de `CLAUDE.md`), jamais en bloc par défaut. À lire en FIN DE LIVRAISON (la mise à jour de CLAUDE.md en fait partie).

---

> ⚠️ **RÉGIME DEPUIS LE 2026-10-03 — LIRE AVANT LE §14.2 CI-DESSOUS.** Le seuil de « 200 lignes » visait UN fichier de 1 661 lignes. Il
> s'applique désormais au NOYAU de `CLAUDE.md` avec un plafond de **350 lignes**, tenu par `tools/verify-docs.mjs` (il rougit au-dessus :
> passe d'élagage, pas un seuil relevé). Les `docs/*.md` ne grossissent pas par livraison (on y range, on n'y raconte pas) ; ils se
> taillent comme les README, à la mesure (leçon n°6). Un piège neuf : récit dans `docs/PIEGES.md` + titre dans le §4 du noyau.
> Le bloc REPRISE et la liste « Toujours ouvert » : le premier reste dans le noyau (se REMPLACE), la seconde est dans `docs/A-JUGER.md`.

## 14. Comment maintenir ce fichier

1. **Remplacer, ne jamais empiler.** Ce fichier décrit le **présent**. Une information périmée
   se supprime, elle ne se date pas.
2. **200 lignes = passe d'élagage obligatoire. Ne pas relever le seuil.** L'élagage se fait
   AVANT d'ajouter.
   ⚠️⚠️⚠️ **QUARANTE-DEUX PASSES D'ÉLAGAGE ONT EU LIEU ; LEUR RÉCIT A ÉTÉ SUPPRIMÉ, PAS RÉSUMÉ.**
   Ce chapitre a porté jusqu'à quatre cent trente lignes de procès-verbaux — un tiers du fichier
   occupé à raconter comment on avait raccourci le fichier, dont la moitié désignait un objet
   supprimé depuis. *Le chapitre qui interdit de dater une information périmée était devenu le seul
   endroit du fichier entièrement fait d'informations périmées.* Seules survivent les leçons
   ci-dessous : vraies à l'échelle du projet, introuvables ailleurs, et payées.

   ⚠️ **LES SIX LEÇONS QUE CES PASSES ONT PAYÉES :**
   1. *Un chapitre qui grossit à chaque livraison décrit un code qui vit ailleurs : on le renvoie
      là-bas, jamais on ne le résume ici.* Six scissions l'ont prouvé (§6, §7, §4 trois fois, §10).
   2. *Un chiffre de banc recopié à deux endroits n'a pas deux chances d'être juste : il a deux
      endroits où mentir.* Payé six fois sur `verify-quete` et `verify-maire` — et une correction
      qui ne porte que sur l'un des deux apprend au chiffre un second endroit où mentir.
   3. *Une question à laquelle on a répondu ne sort pas du fichier toute seule : elle y reste, et
      elle ment.* Trois relectures du §13 l'ont trouvée à chaque fois.
   4. *Un récit s'allonge, une ligne de tableau non* — mais un tableau qu'on ne taille pas devient
      un récit à son tour. Le tableau des leçons a été ramené à quatre lignes onze fois avant de
      disparaître : la forme n'a jamais tenu toute seule.
   5. *Une leçon qu'on écrit sans l'appliquer dans la même livraison est une leçon qu'on repaiera.*
   6. ⚠️⚠️ **2026-09-05, ET C'EST LA PLUS CHÈRE DES SIX** : *un ordre d'élagage qui désigne un
      document par son NOM, et non par une mesure, peut viser le mauvais pendant sept passes.*
      « Relire `ferme/README.md` contre le code » a été reporté sept fois — et le jour où on a
      MESURÉ les trois documents, c'était le plus SAIN (5 symboles fantômes sur 381, contre **24
      sur 307** pour `QUETE.md`, 0 sur 80 pour `tools/README.md`). Sept passes de retard sur le
      mauvais fichier, pendant que le document qui pilote les séances de jeu de Guillaume
      pourrissait. **La passe suivante commence par la MESURE, jamais par la liste héritée.**

   ⚠️⚠️ **L'ORDRE OUVERT, ET IL EST MAINTENANT CHIFFRÉ (mesuré le 2026-09-12, pendant l'audit
   quête) : RELIRE `components/ferme/QUETE.md` CONTRE LE CODE.** La mesure d'abord, jamais la liste
   héritée — c'est la leçon n°6 ci-dessus. Symboles cités en backticks qui n'existent NULLE PART
   dans `components/ferme/*.js` :

   | document | symboles cités | fantômes |
   |---|---|---|
   | `components/ferme/QUETE.md` | 419 | **36** (8,6 %) |
   | `components/ferme/README.md` | 396 | 11 |
   | `CLAUDE.md` | 238 | 13 |
   | `tools/README.md` | 122 | 4 |
   | `components/ferme/DESSIN.md` | 2 | 0 |

   ⚠️ **`QUETE.md` EMPIRE** (24 sur 307 au 2026-09-05, 36 sur 419 aujourd'hui) et ses fantômes se
   rangent en **familles mortes, pas en fautes isolées** : la plongée (`STAR_DIVE_CURRENT`,
   `diveDeeper`, `promptDive`, `promptUp`), le duo (`resolveStarDuet`, `STAR_DUET_AIM_DRIFT`,
   `STAR_DUET_ALONE_MUL`, `starMiniPartner`), la pie et la verrerie (`STAR_MAGPIE_LAG`,
   `resolveStarShard`, `STAR_SWEEP_MIN`), les cloches et les « pourquoi » (`bell1`..`bell4`,
   `whyBell`, `whyDark`, `whyLean`, `whyMast`, `whySail`), plus des restes de l'enquête supprimée
   (`ENQ_STONE_ANCHORS`, `devEnq`). **Ce sont les chapitres tués par le déchant du 469** : le
   document décrit encore une quête en cinq chapitres là où le code en a trois. C'est le document
   qui pilote les séances de jeu de Guillaume — donc celui dont les mensonges coûtent le plus.
   ⚠️ **La grandeur à mesurer en premier reste celle qui a payé quatre fois** (453 sur le document,
   456 sur le code, 458 sur la coopération, **2026-09-12 sur `e.vandal`**) : *chaque chose que le
   document dit visible à l'écran a-t-elle un chemin de code qui l'affiche ?* — et son corollaire :
   *chaque chose qu'il dit JOUABLE existe-t-elle encore ?*

3. **Critère d'inclusion** : « est-ce vrai à l'échelle du projet, et invérifiable en ouvrant
   un seul fichier ? » Sinon, ça va dans un commentaire de code. **L'histoire d'un défaut
   corrigé n'y a pas sa place — seule sa LEÇON, en §4.**
4. **Écrire pour un modèle fort.** Densité maximale, phrases courtes, tableaux.
5. **Dire ce qui n'est PAS fait**, avant le reste.
6. ⚠️ **NE JAMAIS AFFIRMER QU'UN OUTIL EXISTE SANS L'AVOIR LANCÉ.** Le 425 décrivait
   `verify-vallee.mjs` « 74 contrôles, 74/74 » : le fichier n'existait pas. Un banc imaginaire
   fait passer pour testé ce qui ne l'est pas — c'est le stub menteur du §10, appliqué à la
   documentation elle-même. **Tout chiffre de banc écrit ici a été obtenu en le lançant.**
