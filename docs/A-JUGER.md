# CE QUI ATTEND UN JUGEMENT HUMAIN (REPRISE « Toujours ouvert » + §13)

> **Extrait SANS MODIFICATION de `CLAUDE.md` le 2026-10-03** (allègement du noyau : le contexte fixe passe de ~47 k à ~8 k tokens, estimés).
> Les numéros de § sont CONSERVÉS : tout « §N » cité dans le code, les README et les bancs reste valable (table dans `CLAUDE.md`).
> Ce fichier se lit À LA DEMANDE (voir le routeur de `CLAUDE.md`), jamais en bloc par défaut. À lire pour « reprends le travail », ou pour choisir un chantier — pas pour une tâche de code ciblée.

---

### Jugé le 2026-10-06 (soir) — verdicts de Guillaume sur le lot du patin et du marché (seul à jouer : RIEN n'est vu à deux clients)

**OK, plus rien à juger** : la gerbe (visible de jour), l'aide « ? » (fonctionne), les guirlandes (« ok pour l'instant »), l'usure de la glace, la location à 15 min (« très bon »), la chute
sans patins, la fin de location qui fait tomber sur la glace, les prix du matériel, la bande, **la course (« super »)**, le bonhomme de neige (« ok pour l'instant »), les ombres du soleil
(« pas mal, la logique générale est bonne » — des bugs à rapporter PAR LUI, plus tard, en détail : rien à chercher ici).
**À corriger, corrigé dans l'arbre, à revoir en jeu** : la vrille emballée (« sympa, mais elle ne devrait pas s'arrêter d'un coup » → décélération), la surfaceuse (« coupée dans les angles,
problème de collision » → trajet qui suit les coins), le lac du sud (« averti par un message quand il gèle ; le dégel ne doit pas être trop court » → toast + dégel étiré à 0,06 K/min).
**Reporté** : la place vide hors hiver (« réglé dans les futures séances » : `docs/PROJETS.md` §4), les petits personnages en ville (« on les jugera plus tard »).
**Pas jugé** : tout ce qui demande deux clients (le `snowFx` d'un autre, l'invité qui regarde une course ou une passe de surfaceuse) ; la nuit pour le bonhomme de neige et le patin.

### Jugé le 2026-10-04 — À REFAIRE (verdict de Guillaume, en jouant)

« La netteté des maisons est super, mais les sols et les objets de jardin ne sont pas assez détaillés. » (Avant : « le réseau de chemins et de rues est super, le
seul souci est le niveau de détail. ») Un seul verdict, deux familles — et **les arbres dégarnis d'automne « ne sont pas au niveau de [ses] attentes »** :
- **Les sols de Valley Town** (goudron, pavés, dallages, briques, gravier, terre, herbe) : tuiles de 64 px d'art (4 × 4 cases) dessinées en code et agrandies par le zoom ; à côté
  des maisons posées au pixel d'écran, elles manquent de détail et de netteté. Le TRACÉ des rues et des chemins est bon : on n'y touche pas. Les « petits bugs » du pavage : **à nommer par Guillaume**
  (ou à chercher en jeu) — rien n'est listé.
- **Les objets de jardin et de place** (planche 3 : bûches, linge, boîtes aux lettres, brouette, tonneau, table, bain d'oiseaux, pots, balançoire, clapier, jardinières, vases, ronces, grille, hautes herbes ;
  puis les objets des planches 1 et 2 : bancs, bacs, bonsaï, haies…). Ils viennent de planches Gemini en **pixel art à GROS BLOCS** (8 à 12 px image par pixel de jeu) : **les reconstruire au pixel d'écran,
  comme les lampadaires, ne leur donnerait aucun détail — il faut les REPEINDRE.** Seuls les deux lampadaires de la planche 3, peints plus fin, échappent à ce constat (`c067d98`).
- **Les arbres dégarnis d'automne** : la chute « ronge » la couronne parce que l'arbre n'a pas de charpente cachée sous ses feuilles (`bareTree`, `makeFallTrees`, `fermeArt.js`).
- **Chantier** : `refs/lot-gemini/` — A (sols repeints, plan conservé), B (arbres : feuillu / mi-chute / nu au squelette identique), C0 (objets de jardin à repeindre depuis `objets-ref/`).
  **Sols : tranché le 2026-10-04 (nuit)** — le dallage civique procédural HD (FIX-004) est gardé et devient le MODÈLE des autres revêtements.
  Arbres et objets de jardin : rien n'est codé ni intégré.

### Toujours ouvert — livré, jamais jugé par Guillaume en vraie séance

- **Le 2026-10-06 (suite)** — verdicts du soir dans le bloc en tête ; **reste à juger** : le marché hors hiver (place vide, caillebotis sombre sur l'herbe d'été : traités aux futures séances,
  `docs/PROJETS.md` §4), **l'ombre au saut** (le corps monte, l'ombre reste au sol ; elle ne rétrécit pas avec la hauteur : voulu ? — « quelques bugs » d'ombre à venir de lui), **le lac du
  sud** (il gèle depuis la rive 12,9 % de l'hiver ; message de gel et dégel étiré : **à voir en jeu**, menu dev « ⛸️ Lac gelé » pour le décor mais il ne déclenche pas le message).
- **Le 2026-10-06** — OK de Guillaume (gerbe, vrille, « ? », guirlandes, usure, surfaceuse, location, chute) : voir le bloc en tête. **Reste à revoir en jeu après correction** : la vrille qui
  ralentit à l'arrivée, la surfaceuse dans les coins (et si son sprite haut mord sur la planche : non touché), **la combinaison seulement sur la patinoire** (pas dans ses réponses).
- **Le 2026-10-05 (nuit, fin quater)** (« caveman on » : tout exécuté sans questions, donc TOUT À JUGER) : **le chalet de la patinoire collé à la
  glace** (au nord du portillon est ; celui du lac n'a pas bougé), **quatre braseros** aux portillons nord et sud, **la bande qui ne bloque plus que sa
  planche** (plus de mur invisible autour, plus de trou aux coins — à marcher le long de la bande, de jour et de nuit), **la glace rayée** (rayures,
  passes de surfaceuse, médaillon — très discret : assez ?), **le matériel** (patins de course : +10 % et virages en carres ; combinaison : +5 % ; huit
  couleurs ; prix 60 / 120 / 165 or : trop ? pas assez de différence ?), **les figures** (Espace saut, V vrille, les deux axel, B tenue à reculons, le
  cygne tout seul — la hauteur du saut, la durée, la lisibilité de la vrille, l'enchaînement affiché), **la gerbe derrière les lames** (assez visible
  sur une glace aussi pâle ? trop ?). Questions ouvertes : le matériel doit-il compter dans la COURSE (il y compte ; les résidents ont du matériel
  neutre, on les bat plus facilement) ? un casque avec la combinaison ? V/B au tactile ? les figures aussi sur le lac ? (elles y marchent déjà).
- **Le 2026-10-05 (nuit, fin ter)** — « la course est super » (2026-10-06 soir) ; reste la difficulté des résidents : **la course de la patinoire et le contre-la-montre** — privatiser au chalet (40 or), grille de 30 s,
  toujours quatre au départ (des résidents complètent), 5 tours autour de l'îlot de plots, aspiration, chute contre la bande au-dessus de
  6,4 cases/s ; l'écran de course (compte à rebours, tours, chrono, place, mini-carte, classement en direct, résultats, podium) ; le
  contre-la-montre seul contre le fantôme du record. Vu en jeu seul ET à deux (mêmes résultats au centième). À juger : la difficulté des
  résidents — ⚠️ le plus fort (24,55 s) n'est qu'à 0,2 % de la ligne idéale du banc (24,50 s) : il faut une course presque parfaite
  pour le battre (le pilote automatique du test, maladroit, met ~41 s) ; à desserrer ? —, 5 tours (≈ 25-40 s : court ?), le prix,
  le seuil de chute, la lisibilité de l'écran sur un portable étroit.
- **Le 2026-10-05 (nuit)** : **l'essai « petits personnages » en ville** (menu dev, interrupteur LOCAL, éteint par défaut) — jugé une première fois : marche
  ×0,5 « parfaite », taille ×0,68 « un peu trop petite » → **×0,8** (même nuit). À rejuger à ×0,8 ; puis : garder ? pour les résidents aussi ? Si oui, le vrai
  chantier : cadence des pas, portées d'interaction, bancs, et un dessin natif plutôt qu'un `ctx.scale`.
- **Le 2026-10-05 (nuit, fin)** : **la patinoire** (le lieu) — la glace (voiles, flocon peint, reflet de la bande), la bande (crème,
  rambarde rouge, panneaux des commerçants, guirlande de sapin), six mâts et trois guirlandes colorées, le chalet à l'est. À juger : de
  jour et de nuit ; le portillon sans patins (1,1 s d'insistance) et la CHUTE qui suit — c'est la blessure du lac (15 min, retour à la
  maison) : trop dur pour une patinoire de place ? Planche : `tools/out/patinoire-*.png`.
- **Le 2026-10-05 (nuit, fin)** : **le marché d'hiver dans la prairie** — la place (arche entre deux tilleuls, caillebotis jusqu'à
  l'escalier ouest, deux rangées, coin du feu), les ampoules sur la corde des fanions, le brasero, les lanternes. Vu en jeu de jour et de
  nuit. À juger : la place elle-même, le potier qui hiverne (9 étals), la bascule instantanée au changement de saison. Planches :
  `tools/out/marche-hiver-*.png`.
- **Le 2026-10-05 (nuit, fin)** : **les ombres portées du soleil** (ville et ferme) — direction et longueur selon l'heure et la saison,
  force selon le ciel. À juger : la force (0,30), la longueur d'hiver (×1,6 à midi : un soleil stylisé à 32°), la pente de midi (sud-est), la
  teinte (bleu de ciel assombri). Pas d'ombre aux haies, clôtures, fanions.
- **Le 2026-10-05 (nuit)** : **la neige au bord des rues pavées** — la rue lue au pixel (fini l'escalier de cases et les carrés verts), les ornières
  parallèles qui suivent la courbe, la lisière qui recule par anses contre la bordure (1 à 10 px). Vu en jeu sous 12 cm (rue de l'ouest) et au banc à la
  fonte (`render-neige biais|nord`, `FONTE=1`). À juger en vraie fonte : la largeur des anses ; la lisière se voit aussi sous neige épaisse (sel, éclaboussures).
- **Le 2026-10-05 (soir)** : **les lapins de Valley Town** — l'échelle est TRANCHÉE (la nuit même : « à la taille des pigeons », redessinés, assis 7 px) ; la tête de face (ovale, yeux sur
  les côtés), le « fluffy » (contour teinté + touches claires), les 4 robes, les trajets (ondulation, rafales de bonds, pauses), le nombre (10), les jardins
  (14 % des créneaux de l'aube et du crépuscule), la fuite en zigzag, le lapin hardi. Planche : `tools/out/lapins-planche.png`. Pas vus : la nuit, sous la neige
  (ils laissent des empreintes de chat), un jardin, à deux clients.
- **Le 2026-10-05 (soir)** : **les patins loués** — 60 or / 10 minutes réelles : le prix, la durée, les avertissements (60 s, 15 s) ; ⚠️ la fin de location
  PENDANT qu'on est sur la glace fait tomber (blessure de 15 min) — trop dur ? une tolérance (finir la glissade) est possible.
- **Le 2026-10-05 (soir)** : **la canne qui se range toute seule** (15 s à plus de 4 cases de l'eau) — vue en jeu (rangée à 16 s), à juger : 15 s et 4 cases.
- **Le 2026-10-05 (soir)** : **le bonhomme cassable et les boules portées** — K (coup de pied : une boule seule en 1 à 3 coups ; un bonhomme encaisse, la tête
  tombe de plus en plus souvent, il s'écroule aux coups rapprochés), R (soulever ↔ rouler), la marche plus lente en poussant (−72 % au maximum), les chapeaux et
  l'écharpe posés sur la tête mesurée. Vus en jeu à un client (boule roulée, soulevée, posée, écrasée en 3 coups ; bonhomme décoré cassé en 7 coups). Pas vus : à deux
  clients (le `snowFx` d'un autre), la nuit, sous le dégel ; **pas de touche tactile** pour K et R ; **tout le monde peut casser le bonhomme de tout le monde** (à trancher).

- **Le 2026-10-05** : **le bonhomme de neige** — le geste (façonner, rouler, poser, empiler : la vitesse de croissance, le ralentissement),
  la traînée dans la neige, le dessin (taille contre le joueur, sphères, accessoires — planche `tools/out/bonhomme-planche.png`), le panneau du
  décor et son aperçu, la durée du dégel (une journée de jeu) et son affaissement. Pas vus : à deux vrais clients, la nuit.

- **Le 2026-10-05** : **le patin et le lac gelé** — la sensation de glisse (croisière 7,6, ~9 cases de lancée, virage large, arrêt en
  travers), les poses (poussée, moulinet, chute assise et ses étoiles), les traces de lames, la descente du quai ; le prix (450 or) ;
  la rareté du gel du lac (12,9 % du temps d'hiver, par vagues de ~1 à 6 jours de jeu) et la largeur de la bande de rive ; **le chalet
  des patins, PROVISOIRE** (procédural, prompt Gemini dans `docs/IMAGES-ET-BLENDER.md`). Pas vus : à deux vrais clients, la nuit.
- **Le 2026-10-05** : **les bois des coins ouest** (sud-ouest en forêt, nord-ouest épaissi) — leur taille, leur densité, la part de
  conifères au nord-ouest ; vus en automne seulement.

- **Le 2026-10-04 (nuit, suite)** : **l'obélisque** — vu à l'écran par Guillaume (« ok ») ; restent à juger en jouant : sous la neige et la nuit, la
  nouvelle place des bancs (un rang plus au nord) et des lampadaires (aux coins de devant de l'enclos), la taille des bornes et des chaînes.
- **Le 2026-10-04 (nuit)** : **l'étoile reine à flancs droits** (creux 0,46, choisie sur planche) — à revoir EN JEU : en ville, la nuit
  (son halo autour des pointes), à côté des petites sœurs.
- **Le 2026-10-04 (soir)** : **la rosace en pierre blonde** (teinte, saturation — 28 % en jeu contre 13 % au dallage —, joints adoucis, bordure ;
  l'eau qui suit ses anneaux sous la pluie) ; **le parvis du tribunal d'un seul dallage** et **la cour du Salon de coiffure passée en dallage
  civique** (elle touche le parvis de l'église : conséquence de la règle « une zone, une famille »).
- **Le 2026-10-04 (nuit)** : la frise de la quête au menu dev, les médailles, les bousculades, la poussière, la fontaine au pixel d'écran, le
  tableau des nouvelles (gazette, petites annonces). Pas vus : bousculades et annonces côté invité, poussière à la ferme, fontaine la nuit.
- **Le 2026-10-03** : **le plan illustré de Valley Town** (carte ouverte) — le dessin des toits (teinte par quartier, cheminée, porte), la
  ligne médiane de l'avenue, les berges, le relief et son halo sombre autour de la terrasse, les pastilles des repères, la taille d'affichage
  (largeur ET hauteur de fenêtre). Pas retenus à ce stade : zoom, noms de rues, légende, parchemin.
- **Le 2026-10-02** : **les lampadaires au pixel d'écran** (la finesse du fût et des lanternes à chaque cran, le verre éteint de
  jour — gris-bleu, barreaux ambre —, la neige : fine ligne sur les bras, mamelon au pied, poutre et poteau du modeste).
- **Le 2026-09-30** : **la glace** (le rythme du gel — deux nuits froides —, la teinte, les fenêtres noires, la part
  de neige sur la glace), **la glisse des canards** (un pas sur trois environ), **les feuilles mortes** (la chute
  PAR BOUQUETS de la reprise, sa date — 50 → 92 % de l'automne —, le moment où il ne reste que des grappes ; la
  densité du tapis ; le nombre de feuilles en l'air sous l'orage), **le pommier d'hiver** (tronc chaulé, nichoir),
  **les herbes hautes en paille** l'hiver.
- **Le 2026-09-29 (jour)** : **la météo par lieu** (un jour sur cinq, ses quatre formes, la prévision « En ville »),
  **la neige de la ferme** (le champ à rayures, la berge de sable, le quai balayé, les ombres, les chapeaux, les
  buissons d'hiver — ils hivernent désormais aussi sans neige, comme en ville), **la fonte des cratères**, et **le
  maire plus facile** (75 % des essais ordinaires signent avec les plans en humeur moyenne : trop, pas assez ?).
- **Le 2026-09-29 (nuit, suite)** : **TOUT LE NEUF** — la taille de chaque objet de la planche 3 contre un
  personnage (`step` du catalogue, réglé à l'œil sur trois écrans), la place et le nombre des objets de jardin, le
  candélabre (4,2 m) et ses deux flaques de lumière, le portail de la maison hantée ; **la pluie** : la force du
  mouillé (trois niveaux), les flaques (`puddleThr`, jusqu'à ~19 % du sol dur à pleine flaque), leur durée (7 h de
  jeu sous ciel d'automne, 2 h l'été), l'eau qui coule au caniveau, les ronds, la lumière des lampadaires sur sol
  mouillé ; **les saisons** : les heures de lever et de coucher (`SUN_HOURS` — le jour de jeu commence à 6 h : en
  hiver il fait encore noir jusqu'à 8 h 30) ; **les cheminées** : la fréquence du feu par saison, la taille et la
  visibilité de la fumée. **Le 2026-09-29 (jour)** : les deux grands saules (l'étang du parc, la rive sud) et le
  saule d'hiver doré ; les lampadaires (paires de l'avenue, carrefours, portails par rang) ; les bancs recentrés ;
  les dalles de l'allée hantée ; **la scène Tristan/Jérôme à deux clients**.
- **La neige (2026-09-28, soir)** : tout est réglage, à juger à l'écran — la force des ombres portées
  (`NEIGE.SHADOW_K` 0,45, bloc de 40 px pour une maison), le grain (un tiers de ton), la vitesse du dépôt
  (`COV0`/`COVR`, couvert vers 2,5 cm), la chaussée et ses ornières, les calques de toit (dont les liserés
  de l'église), les sapins alourdis, les buissons ajourés, les piquets, la fontaine gelée.
- **Les clôtures et les façades (2026-09-28)** : la matière de chaque clôture (grille, blanc, planches, fil — la
  haie a repris son ancienne matière, les buis étant désactivés), la part de jardins ouverts (11 sur 34), les potagers, les portails (six poses, 0,4 s pour s'ouvrir, une
  seconde avant de se refermer), le pilier de grille tous les quatre ; l'or des façades, leur force (`floodK`),
  les vitraux éteints ; le poids des 15 calques de façade (11 Mo, un cran chargé à la fois).
- **Le grand escalier (2026-09-27, nuit)** : la lecture du passage dessous (le passant découpé, la bouche
  assombrie, son nom qui reste), les rampes en bandeau et les piliers dessinés en code (le reste du bloc 467
  est parti, sauf son pot), le palier de 12 cases, les deux points de vue (`view`) à côté des piliers de tête,
  le pied de sable et ses deux lanternes, le mail redressé (ses tilleuls ont bougé avec lui).
- **La phase 7a (2026-09-27, soir)** : le tracé des rues et leur bord pavé courbe, l'église ×1,5 (au cran 5
  son image dépasse la référence de ×1,58), le palais sur sa place, le mail, les rangées de maisons de ville,
  les placettes ; les parcelles des joueurs 3+ ont déménagé.
- **La phase 11 (2026-09-27, nuit, suite)** : les proportions des quatre tailles, leur répartition
  (108 grands, 142 jeunes, 75 trapus sur 844), le magnolia (été avec fleurs gardé exprès, pour le parc),
  le repère de L (2,6 s, pas de bouton tactile), le vent à cinq poses.
- **Le 2026-09-27 (6a, 6b)** : l'échelle des maisons (porte de 2,04 m), S3 en LARGE et le choix de ses
  cinq parcelles, l'ombre de contact et les touffes (pas d'ombre orientée, exprès), le salon (enseigne,
  barbier, vitrines allumées sans coiffeur), le reflet du pont ; la boutique (×1,42, porte de 2,95 m) et
  ses vitrines ; le puits et l'arbre de la pie de la parcelle #20 à demi derrière le toit. **La nuit du
  2026-09-27** : les étapes de la Maison Garfield (deux jours de travaux, le badigeon allumé jusqu'à
  23 h, le rideau en ~2,8 s, les fondus d'1,5 s), S2 et ses quatre parcelles, les seuils du prestige
  (17 / 30, +10 pour marché et lac).
- **La nuit du 2026-09-26 (6a)** : N2, les étroites de la vieille ville, la maison hantée et la fréquence
  de sa lueur (`LUM.ruinGhostOn`).
- **Le soir du 2026-09-26** : les vitraux en couleurs (composition dessinée : fond bleu, bordure rubis,
  médaillons ; à juger à l'écran), les horaires des pièces (`monumentWindowLevel`), le reflet du pont
  (`TOWN_BRIDGE_REFL_UP`), la portée de l'épuisette (1,3 papillon / 2,6 carpe), les chances (55 / 40 %),
  le prix (300), le chat adopté en trois jours et son gardon un jour sur deux.
- **La météo** : les fréquences par saison (`SEASON_ODDS`, parts imprimées par `verify-meteo`), la durée
  de montée d'un orage (~1 min 30 réelle), la densité de la neige forte et de la grêle, le volume du
  tonnerre (0,35 loin → 0,9 près), le ciel d'orage ~23 % plus sombre.
- **Les retouches de la faune** : la taille du colvert (16 px, après « trop grand » à 17 et « pas assez
  détaillé » à 14), la cane qui broute (tête brun sur brun), la fréquence des sorties, les insectes des
  lampes (discrets exprès) ; et la fluidité du chat et des colverts (2026-09-26, nuit : mesurée au banc,
  pas à l'écran en mouvement) ; les nénuphars écartés (jamais vus bouger à l'écran) et le sommeil sur la
  berge (vu à 23 h 30).
- **Les phases 1 à 5 de Valley Town**, à jouer. Phase 5 : les enchaînements des colverts, la taille des
  bêtes, la fréquence des gestes gratuits (le chat qui salue, les goélands du pêcheur), les papillons
  (assez visibles ?), la synchronisation des lucioles certaines nuits. **Pas fait en phase 5** : l'éclat
  des yeux des chats la nuit, les papillons en couple, les chats face aux chiens des joueurs, la faune de
  la ferme. Phase 4, pas fait : bittes d'amarrage ; reflets du navire et des fenêtres ; chemins de désir. Phase 3 : ⚠️ un personnage DEVANT une fenêtre allumée s'éclaire à sa forme (limite connue).
- Le perron du tribunal, le zoom manuel, les pets ancrés sur le maître, Eduardo et le port
  (`starYardHookActive`), le belvédère enrichi ; plus anciens : pin, bois du sud-est, cœur de ville,
  « changer de ferme », chantier naval, repousse des buissons.
- **À décider avec lui, jamais seul (§2)** : la gare (halte minuscule ou `TOWN_STATION` élargie à 6 cases) ;
  quel bâtiment après le tribunal (Gemini) ; traduction des
  métiers (`job` de `TOWN_RESIDENTS`, une table `jobFr`) ; le jour entre les arcs-boutants de l'église ;
  sécurité et synchro multi de la ferme (`components/ferme/SECURITE.md`, RIEN codé).
- ⚠️ Dette Google Cloud d'Où's That, À FAIRE AVEC CODEX ET GUILLAUME DEVANT LA CONSOLE (il se
  connecte lui-même, aucun identifiant transmis) : facturation dans l'EEE ; clé dédiée ; restriction
  à **Maps Embed API seule** ; référents limités aux domaines Arcardi ; aucune API payante sur ce
  projet ; rapport de facturation à zéro. Un budget d'alerte n'est pas un plafond. Close seulement
  après lecture des écrans réels, jamais par déduction depuis `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`.
- §13 tient le reste (îles, transport du bois, mariage/cadastre/coiffure, ferme peuplée à deux, et les
  projets mis en réserve le 2026-09-26).


## 13. À compléter par Guillaume

⚠️⚠️⚠️ **CE QUI ATTEND UN JUGEMENT HUMAIN, PAS UN BANC — PAR ORDRE DE PRIORITÉ (diagnostic
2026-09-01, à la demande de Guillaume : « je veux savoir quelle direction donner au jeu, tout en
réglant l'aspect agréable ou pas, qui ne peut être vérifié que par moi-même »).** Un banc mesure
la mécanique ; il ne peut jamais dire si c'est AGRÉABLE — seule une vraie séance de jeu le peut,
et Guillaume est le seul à la faire (Claude ne lance pas de bancs ni de sessions de jeu de son
propre chef dans cette phase — **exception ponctuelle accordée hors-zip le 2026-09-01, sur
demande explicite répétée de Guillaume, pour le seul item n°1 ci-dessous** ; la règle reste « ne
pas se l'accorder soi-même » pour tout le reste). Cette liste ORDONNE ce qui est déjà détaillé
plus bas dans ce chapitre ; elle ne redit rien de leur contenu, elle priorise LEQUEL jouer en
premier.
1. **Gels de PNJ chez l'invité, ferme PEUPLÉE, à deux clients.** ✅ **MÉCANISME TESTÉ, DIAGNOSTIQUÉ
   ET CORRIGÉ hors-zip le 2026-09-01** (détail au §4) — `netCanBroadcast()`
   lisait un `hiddenRef` mis en cache jamais resynchronisé avec `document.hidden`, figé à `true`
   pour toujours si l'onglet hôte montait pendant qu'il était masqué. Plus aucun `broadcastStation()`
   ne partait ; les résidents (et tout le reste de `station`) restaient invisibles chez l'invité,
   sans aucun symptôme côté hôte. ⚠️ **CE QUI RESTE, ET C'EST TOUJOURS POUR GUILLAUME** : le
   mécanisme marche, le RESSENTI à deux (l'ambiance, ce qui se voit, ce qui manque encore) n'a
   toujours pas été jugé par une vraie séance de jeu — c'est cette moitié-là qui reste le socle des
   décisions sociales à venir (mariage, densification, relations résident-résident, transport du
   bois). ⚠️ **Deux pièges de la manip, payés en 2026-08 :** le faux Supabase ne persiste rien,
   donc *peupler EN PREMIER et ne plus recharger* (un rechargement repart d'une ferme neuve) ; et
   les trois séances à deux clients faites jusqu'ici l'ont été sur une ferme VIDE, ce qui ne dit
   rien des vingt résidents. **Les bancs mesurent la simulation de l'hôte, jamais ce que voit
   l'invité.**
2. ⚠️ **LE MINI-JEU DE LA QUÊTE — IL N'EN RESTE QU'UN**, le refroidissement du cratère, joué
   jusqu'à la victoire à cadence réelle. *Cette ligne disait « les cinq » jusqu'au 2026-09-05 :
   quatre ont été supprimés par le déchant du 469 et la liste ne l'avait pas appris.* Le seul
   nombre encore réel à surveiller est `STAR_COOL_BAND` — la bande se resserre-t-elle trop vite ?
3. **Les postes à deux, jamais tenus** — et la liste a changé au 2026-09-05 : **l'étoile timide
   dos à dos** (verbe `pair` de la reine) est le seul survivant des quatre qui étaient écrits ici ;
   le croisement d'ombres, la flaque du ponton et le duo orgue/beffroi **n'existent plus dans le
   code**. ⚠️ **En revanche le 479 en a AJOUTÉ deux que personne n'avait inscrits** : le RELAIS du
   plat (l'un cuisine, l'autre court) et les DEUX BORDS du cratère. ⚠️ Pas testable seul, dépend
   du n°1.
4. **Les trois nombres de la scierie de Tristan** (tempo, durée de manche, prix de planche
   fendue) — aucun ne doit bouger avant d'avoir été joué. ✅ **Diagnostiqué en solo (2026-09-01)** :
   la mécanique n'est pas déplaisante mais reste peu claire, à rendre plus accessible pour de
   jeunes joueurs ; le refroidissement ennuie ; la pose des planches est répétitive mais acceptée
   comme compromis. **Le point commun aux trois : le manque d'ANIMATION**, pas une nouvelle
   mécanique — reste en réserve derrière cette liste (décision de Guillaume). ⚠️ **DETTE PRÉCISÉE
   LE 2026-09-03, EN JOUANT** : les épaules de Tristan sont trop géométriques, le geste ne se lit
   pas clairement, et les planches de bois SE TÉLÉPORTENT au lieu d'être transportées — manque de
   réalisme et de poids. Touche `scierieAtelier.js` (posture, épaules) et `ScierieScene.js`
   (dépôt des planches). Pas encore commencé.
5. **Les trois nombres du navire** (prix de Kerguélen, les quinze minutes de plans, les cinq
   commandes de bois). ✅ **Le prix de Kerguélen est confirmé accepté** : cher et pas agréable,
   mais voulu pour la cohérence narrative — ne pas l'adoucir sans raison narrative. Les deux
   autres nombres restent à juger.
6. ✅ **Le bureau du maire — REJOUÉ À L'ÉCRAN le 2026-09-02**, en séance réelle, avec **Ninon Delaunay**. La passe d'anthropométrie y a été jugée et corrigée quatre fois de suite sur ce que montrait l'écran. ⚠️ **CE QUI RESTE POUR TOI, ET C'EST DU RÉGLAGE** : les **quatre autres maires** n'ont été vus que sur la planche du banc, qui ne juge ni la lumière ni les textures (§10) — et une silhouette qui tient en ombrage plat peut se lire tout autrement sous les quatre lampes de la pièce.
7. **Le voyage en train** — ✅ **confirmé bon** (2026-09-01) : pas une corvée, pas coûteux, item
   clos.
8. **Le pain des pigeons et le partage des oiseaux**, à deux, pour savoir si l'écart se remarque.

**Tant que le n°1 n'est pas fait, aucune décision de conception sociale (mariage — proche mais
pas à livrer tout de suite —, densification, commissions) ne doit être considérée fiable.**
Guillaume joue lui-même (recette au §10 : `fake-supabase.mjs`, échafaudage temporaire,
« Peupler la ferme », deux onglets) ; Claude fournit les commandes exactes si besoin, jamais ne
les exécute à sa place sur ce chantier.

⚠️⚠️ **LE RETOUR LE PLUS RÉPÉTÉ DE GUILLAUME, ET IL EST TOUJOURS OUVERT : PLUS D'INDICATEURS
VISUELS DE PROGRESSION, PLUS D'ANIMATIONS.** Il est sorti de trois séances distinctes (la scierie,
les activités de la ferme, le résident « figé » qui purgeait en fait une blessure sans que rien ne
le dise). *Une mécanique qui tourne sans rien montrer ne se distingue pas d'un jeu bloqué* — c'est
le même défaut que le cratère muet du 456, et il se paie à chaque nouveau système.

⚠️ **DEUX IDÉES DU MÊME DÉBRIEF, TRANCHÉES SUR LEUR SORT IMMÉDIAT, PAS SUR LEUR CONTENU** :
· **Visiteurs célèbres** (noms et sprites de vraies personnes) — **à explorer plus tard**,
  volontairement pas cadré maintenant. ⚠️ Le risque de droit à l'image a été nommé (ça compte
  double avec les plans de commercialisation, voir mémoire) ; à trancher AVANT tout travail
  dessus, pas après.
· ✅ **RELATIONS RÉSIDENT-RÉSIDENT — DIRECTION TRANCHÉE, NON CONSTRUITE (2026-09-01).** Guillaume
  veut un vrai système : affinités et inimitiés qui ÉVOLUENT avec les actions des joueurs
  (services rendus, etc.), pas un décor social statique. Exemple donné mot pour mot : *« rosalie
  qui est énervée à cause d'une histoire de cœur, il faut que ça mène (dans le futur) à une quête
  de réconciliation ou un truc du genre »* — un différend entre résidents devient une porte de
  quête, pas juste une ligne de dialogue. ⚠️ **NE PAS COMMENCER avant le n°1 de la liste ci-dessus**
  (résidents jamais vus se comporter à deux clients) : construire un système de relations sur un
  comportement de PNJ jamais éprouvé à plusieurs serait fabriquer la mauvaise abstraction, comme
  le dit déjà l'avertissement sur `MAYOR_NODE` plus haut dans ce fichier.

⚠️ **MARCHER SUR L'ÉTANG GELÉ — MOYEN OU LONG TERME, PAS MAINTENANT (Guillaume, 2026-09-30).** La glace est un
décor (collision inchangée) ; la rendre praticable touche la collision et le mouvement (glisse), donc les bancs de
collision. La règle de gel existe déjà au point (`GL.pondFrozenAt`) : c'est elle qu'une collision lirait.

⚠️ **RÉSEAU, DEMANDE OUVERTE DE GUILLAUME (2026-09-28), APRÈS UNE SESSION DE JEU** : trouver une
architecture réseau qui reste **gratuite durablement** ET qui minimise le lag / les sauts en jouant
à plusieurs entre l'Europe, l'Asie de l'Est et l'Australie (voir la géographie réelle des joueurs,
mémoire `project_multijoueur_geographie_intercontinentale`). ⚠️ Rappel de cette mémoire : une part
du délai est un plancher PHYSIQUE (~150-300 ms Europe↔Australie/Hong Kong, vitesse de la lumière en
fibre) qu'aucune architecture ne supprime — l'objectif atteignable est un rendu lisse malgré ce
délai connu, pas son élimination. Rien d'engagé, aucune piste tranchée : à étudier.

⚠️ **PROJETS À MOYEN TERME AJOUTÉS LE 2026-10-05 (Guillaume)** : (1) **LA BOUTIQUE D'HIVER « bien plus belle que ça »** — le chalet des patins est procédural et
provisoire (prompt Gemini dans `docs/IMAGES-ET-BLENDER.md`) : un vrai bâtiment peint au pixel d'écran, son intérieur, son enseigne, la location en comptoir vivant ; à
faire avec le lot D de `refs/lot-gemini/` (bâtiments) ; rien de codé. (2) **LA VÉGÉTATION DE VALLEY TOWN SUR LA FERME — ÉCARTÉE POUR L'INSTANT** (question de Guillaume :
« si ça pose le moindre problème, on ne fait pas ») : les arbres de la ferme sont des OBJETS DE JEU (`objHp`, on les coupe, ils repoussent, collision d'une case) et leur
grain est celui de la ferme (16 px d'art, personnages et cultures à la même échelle) ; les essences de la ville (15, quatre tailles, 13,5 px/m) ne se posent pas dessus sans
toucher à la collision et à l'échelle, et la décision d'orientation « la ferme reste en pixel art ou passe au peint » (`refs/lot-gemini/E-ferme-vf.md`) n'est pas prise. La
voie propre reste le lot E (chêne de la ferme en 5 états, au grain de la ferme).
⚠️ **PROJETS MIS EN RÉSERVE PAR GUILLAUME LE 2026-09-27 (après la phase 7a), À NE PAS PERDRE** — détail au
tableau des phases de `components/ferme/README.md` : **UN TERRAIN DE FOOT** dans une prairie vide (idée de
Guillaume) — emplacement, fonction et style À TRANCHER AVEC LUI (options au README). (Les clôtures par quartier :
faites le 2026-09-28 ; l'ordre haies → neige : tranché par lui le même jour.)
⚠️ **PROJETS MIS EN RÉSERVE PAR GUILLAUME LE 2026-09-26, À NE PAS PERDRE** : (1) le GAMEPLAY de la
faune — bocal de lucioles, chat adopté, carpes pêchées à vue (« intéressant pour le futur ») ; (2) les
MAISONS de Valley Town, « cheap » : à refaire différentes et détaillées, avec l'éclairage de leurs
fenêtres (phase 6) ; (3) les restes de la phase 4 (bittes d'amarrage,
reflets du navire et des fenêtres, chemins de désir).

⚠️ **L'ÉCHELLE DES ARBRES DE VALLEY TOWN — FAITE (phase 11, 2026-09-27).** Mesure : 13,5 px/m
(personnage 23 px = 1,70 m), maisons 8,9–10,7 m, adulte 4,7 m. ⚠️ **Écarté** : réduire personnages et
mobilier (un sprite réduit perd les ¾ de ses pixels). **Fait** : tailles redessinées à la même densité,
marges de vue et de reflets ; un joueur caché se retrouve avec L (Guillaume ne veut pas de feuillage
transparent). **Reste** : ombres portées recalées
(phase 13), bois éclaircis (phase 7) ; optionnel : vitesse vers 4 cases/s, flèches d'église.

✅ **RECENTRAGE DE LA QUÊTE AUTOUR DU BATEAU — TRANCHÉ ET CODÉ** (2026-09-12/13 ; ce qui reste :
bloc ⏭️ REPRISE et `QUETE.md`, autorité 2026-09-13 bis). ⚠️ **Le vandale reste anonyme, jamais
élucidé dans cette quête** — réservé à une quête future ; ne jamais lui donner d'identité.

✅ **CHAÎNE DE TRANSPORT DU BOIS DU BATEAU — DIRECTION TRANCHÉE, NON CONSTRUITE (2026-09-01).**
Quatre décisions actées avec Guillaume, à respecter le jour où ce chantier s'ouvre :
1. **Elle REMPLACE le mécanisme actuel**, pas un habillage cosmétique par-dessus : la progression
   d'une pièce du bateau dépendra de l'arrivée physique de la pièce transportée, plus seulement
   d'un total de bois abstrait. ⚠️ Ceci touche un système déjà vérifié (`verify-scierie`,
   `verify-quete`, `starShipProgress`) — l'implémentation devra ADAPTER ces deux bancs au nouveau
   critère de progression, jamais les contourner.
2. **Le trajet est automatique et simulé**, pas un mini-jeu de conduite : on dépose la pièce, elle
   progresse seule sur une durée (même famille que le pathfinding des résidents,
   `E.townFindPath`), et arrive.
3. **La pièce transportée est EMBALLÉE** : une forme générale reconnaissable (longue, courbe…)
   mais pas la silhouette finale à nu — un nouveau sprite à dessiner, pas une réutilisation du
   dessin du bateau fini. ⚠️ **Guillaume peut fournir des images de référence pour ce sprite** —
   à demander précisément le jour où ce chantier s'ouvre (règle Blender/sprite complexe du §2 : un
   prompt Gemini avec référence, jamais un appel API automatisé).
4. **Ordre de construction, par le bout visible d'abord, chaque étape jouable seule** :
   étape 1 — les pièces arrivent et restent VISIBLES sur le quai jusqu'au hissage (le plus proche
   de ce qui existe déjà, le bateau grandit déjà sur le quai) ; étape 2 — le trajet gare de Valley
   Town → quai ; étape 3 — le trajet scierie → gare.
⚠️ **NE PAS COMMENCER avant que la liste « à jouer » ci-dessus ait avancé**, en particulier le n°1
(résidents à deux clients) et le n°5 (les trois nombres du bateau, dont le rythme des cinq
commandes) — ce chantier remplace justement le mécanisme que le n°5 doit d'abord juger tel quel.
⚠️ Ce bloc fixe la DIRECTION, pas le code : le détail d'implémentation (fichiers, fonctions) reste
à écrire dans `QUETE.md` au moment où le chantier s'ouvre pour de vrai.

- ✅ **LE LAC-OCÉAN — TRANCHÉ ET À MOITIÉ CONSTRUIT LE 2026-08-31.** *« Je veux que l'on considère
  le lake and pier plutôt comme un accès à l'océan, et donc le port de Valley Town »* · *« une
  sorte de fleuve qui mène à une sortie ; par la droite. ensable un peu »* · *« il y aura un mode
  de navigation jouable bientôt, mais pour l'instant juste faire un fondu enchaîné, avec décor
  marin générique »* · *« eduardo peut utiliser le navire. mais nous aussi en montant dedans :
  soigner les sprites. anatomiquement cohérentes dans un bateau, mouvements cohérents »*.
  **Le fleuve et sa passe sont faits** (§32 de `components/ferme/README.md`). **Restent les poses à
  bord et le fondu**, une livraison chacun — c'est le bloc ⏭️ REPRISE.
  ⚠️ Ce qui reste une VRAIE question ouverte, et elle n'a rien de technique : **ce qu'on voit après
  le fondu**. Un décor marin générique tient une fois ; à la seconde, le joueur veut savoir où il
  va. Les trois îles de la carte d'Eduardo (§17.5) sont écrites mais rien ne dit encore ce qu'on y
  fait — et c'est cette réponse-là qui décide si le navire est une fin ou une porte.


- ⚠️⚠️ **LE CAFÉ « CHEZ JULIETTE » ET LE RESTAURANT — PRIORITÉ DE DOCUMENTATION, PAS À FAIRE TOUT DE SUITE
  (Guillaume, 2026-09-29).** Il faut être PRÊT : séance de conception à part, LISTER les décisions et ATTENDRE. Le
  café : un intérieur « superbe, cosy, bobo », des boissons en tout genre ; le rôle de barman ou de vendeur
  accessible aux joueurs SANS CASSER LA MÉCANIQUE (toute vente = une `req` arbitrée par l'hôte, comme le marché) ;
  un lieu de rencontre entre résidents et de développement narratif pour de futures missions ou quêtes. Le
  restaurant : même principe. Détail et questions ouvertes : « ⏭️ ACTION SUIVANTE » ci-dessus et la ligne 15 du
  tableau des phases de `components/ferme/README.md`.
- ⚠️ **LE CADASTRE ET LE NOTAIRE SONT DES GUICHETS FERMÉS** : les deux pièces existent, meublées,
  et ne rendent aucun service depuis que le 444 a retiré l'histoire qui les employait. La question
  est donc entière : **acheter une parcelle, avec un prix, un titre et une conséquence sur la
  carte.** ⚠️ La FORME est acquise et mesurée (une `req` arbitrée par l'hôte, un état partagé dans
  `ferme_saves`, aucune migration SQL) ; c'est le contenu qui manque.
  ⚠️ **Le MARIAGE n'a toujours pas bougé** — la salle est dressée, les bans sont prêts, il manque
  l'officier depuis le 439. C'est le seul endroit du jeu où deux joueurs feraient quelque chose
  ENSEMBLE qui ne soit pas du commerce, et aucune des deux quêtes ne l'a remplacé : elles se
  MÈNENT à deux, elles ne se CÉLÈBRENT pas.
- **Le salon de coiffure** (427) : **qui coiffe, et comment ça marche ?** Le bâtiment,
  l'enseigne et la banderole « ouverture prochaine » sont posés ; il manque la décision.
- ⚠️ **LE MORCEAU D'ORGUE (441) : UN FICHIER, PAS UNE DÉCISION.** Tu as choisi un vrai morceau
  plutôt qu'une synthèse ; il se dépose dans **`public/sounds/church-organ.mp3`** et rien d'autre
  n'est à faire — la scène, le banc, le toast et la coupure au lever sont branchés. En attendant,
  le jeu dit que la soufflerie est muette, une seule fois, plutôt que de laisser croire à une
  touche cassée.
- ⚠️ **L'ÉGLISE EST OUVERTE ET NE REND AUCUN SERVICE** (441, ta décision) : trois gestes, aucun
  or. Le 442 lui a donné **deux inscriptions à lire** dans la tribune (la cloche et la plaque du
  facteur d'orgues) : c'est la première fois qu'on y monte pour autre chose que la vue, et ça n'a
  rien coûté — les deux se lisent sur des décors qui étaient déjà là.
- ⚠️ **DETTE GRAPHIQUE : LE MAIRE DU BUREAU** (`maireBureau.js`, vue 3D de `MaireScene.js` ;
  Guillaume, 2026-09-13 : « immonde et incohérent anatomiquement »). Repris et revu en jeu le
  2026-09-15 : le cou (il n'avançait pas jusque sous le menton), le buste de la pièce, les sourcils, un
  sursaut à une réponse « ideal » — le détail vit dans les commentaires de `maireBureau.js`. **Reste** :
  le buste du personnage bascule en UN bloc depuis la taille. ⚠️ Écarté exprès : `torso` porte toute
  la chaîne que `solveArm` lit (§8bis du fichier), payée cher à stabiliser ; à reprendre avec une vraie
  référence de penché, pas à l'aveugle. Les planches Gemini du 2026-09-15 font autorité sur
  l'INTENTION, jamais sur l'échelle. ⚠️ **Leçon : une critique écrite avant d'avoir zoomé peut
  recopier un défaut qui n'existe plus** (trois des griefs du matin étaient déjà corrigés).
- ✅ **LES TROIS MONUMENTS ONT LEUR SPRITE PEINT** (église 2026-09-20, tribunal ensuite ; pipeline C,
  §9). ⚠️ **LA MÉTHODE DE PROMPT QUI A MARCHÉ, POUR LE PROCHAIN BÂTIMENT** : pas de prompt qui décrit
  l'ancien sprite ni sa composition — un thème, une ambition, une teinte distincte des voisins, vue de
  face sur damier ; Guillaume : « l'hôtel de ville est réussi car il est très différent de
  l'original ». ⚠️ **Piège d'import** : au zoom de monument, le sommet d'un dessin haut sort du canevas
  (vu en jeu, jamais sur le PNG seul, et le zoom bouge encore 2 à 3 s après un téléport) — ce qui doit
  rester visible s'ancre sous la pointe du dessin.
- **Valley Town : qui HABITE la ville à demeure ?** Les résidents ne font qu'y passer. Le 439 y
  pose **Léonie Sarrazin** à l'accueil de la mairie — mais c'est un décor qui parle, pas une
  habitante : elle ne bouge pas, et `res.zone` ne connaît toujours que « farm » et « town ».
  Faire ENTRER un résident dans un bâtiment est une décision, pas un réglage : il faudrait une
  troisième valeur de zone, donc une position à réconcilier.
  ⚠️ **Et la prairie : le nombre de blocs de 28×28 encore nus est compté par `verify-vallee.mjs`
  à chaque exécution** — on le lit là, on ne le recopie pas ici (le 437 a perdu du temps sur un
  chiffre périmé). On n'y a délibérément posé AUCUN endroit de vie : des résidents qui vont
  contempler un champ vide, c'est du remplissage. La question n'est donc pas « comment les
  meubler » mais **« qu'est-ce qu'on construit là »**.
  ⚠️⚠️ **LE 440 A RÉPONDU POUR LE COIN SUD-EST, ET LA RÉPONSE EST « RIEN, EXPRÈS »** : un bois y a
  été creusé et le sentier de la rive est va s'y perdre — sans un seul endroit de vie, sur demande
  de Guillaume (« pas une zone très fréquentée, un peu sauvage »). C'est le premier morceau de
  carte assumé comme un **vide habité par le décor** plutôt que par des gens, et c'est une réponse
  possible pour les blocs qui restent. `verify-vallee` a donc appris une troisième catégorie (bâti
  / prairie / bois) : sans elle, il réclamait « une raison qu'on y aille » pour une forêt.
- ⚠️⚠️ **LA SCIE DE TRISTAN EST LIVRÉE (lot E, 2026-08-31) ET ELLE ATTEND TON JUGEMENT SUR TROIS
  NOMBRES, PAS SUR SON CODE** — le tempo qui accélère, la durée d'une manche, le prix d'une planche
  fendue. Ils sont détaillés dans le bloc ⏭️ REPRISE, et **aucun ne doit bouger avant que tu aies
  joué** (règle du voyage en train, 431).
  ⚠️ **Ce qui reste une VRAIE décision, en revanche : la seconde poignée.** Le §17.6 de `QUETE.md`
  promet deux joueurs sur la même scie — l'un tire quand l'autre pousse — et la mécanique est déjà
  écrite pour ça (`sawPull(s, side)`). Ce qui manque est le transport du second journal, et surtout
  la réponse à une question qui n'est pas technique : **est-ce qu'on veut que la commande de bois
  DEMANDE deux joueurs**, ou qu'elle soit seulement meilleure à deux ? Le §0 dit « 2 joueurs,
  occasionnellement 3 » ; une serrure à deux sur une étape obligatoire de la quête serait la
  première du jeu, et le §17 s'interdit explicitement d'en poser.
- ⚠️ **DEUX DES TROIS CHANTIERS DE JOUABILITÉ RESTENT À CONSTRUIRE.** Le marché est livré au
  430 et **devenu le SEUL guichet au 431** : la ferme montre et transforme, la ville achète.
  L'économie existe donc vraiment, et le **jour de marché** hebdomadaire est déjà un
  rendez-vous daté. Restent :
  **1. les commissions** — le tableau des nouvelles distribue des demandes de la ville, qu'on
  remplit depuis la ferme, à deux, contre paiement. Elles s'appuient sur l'économie qui existe
  désormais. ⚠️ **LE PATRON EXISTE ET IL EST MESURÉ** : `components/ferme/quete.js` est une table
  de lieux, une table de chapitres, des résolveurs purs qu'un banc peut appeler, et un état
  partagé qui voyage dans un `apply` qui partait déjà — zéro message dédié. Une commission, c'est
  la même chose en beaucoup plus court ;
  **2. les rendez-vous datés** — concert au kiosque, foire : des événements au calendrier
  partagé qui rassemblent résidents ET joueurs au même endroit à la même heure. ⚠️ Le patron est
  désormais écrit **cinq fois** (jour de marché, service de Carla, jour d'orage, cours du marché,
  et au 439 les **élections municipales** + le jour d'audience du maire) : **une pure fonction du
  numéro de jour, jamais un état**. Les élections sont le premier de ces rendez-vous qui ait un
  RÉSULTAT visible dans le monde (le portrait officiel) — c'est le modèle à copier.
- ⚠️⚠️ **LE TACTILE NE COUVRE QUE LA FERME, LA VILLE, LE TRIBUNAL ET LES ÉCHECS** (430 ; échecs
  2026-09-24, Pointer Events : clic-clic et glisser au doigt). Les 21 autres jeux de la plateforme
  n'ont pas été audités au doigt. Certains ont déjà des `pointer*` (puzzle, naval, yahtzee),
  d'autres non — **personne ne sait lesquels**, et c'est exactement l'angle mort qui a laissé la
  ferme injouable pendant des années.
- ⚠️ **LE PAIN DES PIGEONS EST GRATUIT (433) — ARBITRAGE TOUJOURS À TRANCHER**, mais la scène
  MARCHE depuis le 439 (assis, treize pigeons viennent manger ; se lever en fait partir dix sur
  quatorze). L'objection « un joueur qui appuie sans rien voir se passer croit que la touche est
  cassée » ne tient donc plus : il se passe quelque chose. Reste la vraie question — gager le
  geste sur un `bread` du stock lierait la scène à l'économie (joli) mais changerait une ambiance
  en dépense. **Question de conception, pas de technique.**
- ⚠️ **LES OISEAUX NE SONT PAS PARTAGÉS ENTRE LES DEUX JOUEURS** (433, décision de Guillaume :
  « leur comportement doit pas être exactement partagé »). Les emplacements se déduisent de la
  carte, mais le nombre et les activités sont tirés chez chaque client — deux joueurs sur la
  même place ne comptent pas les mêmes pigeons. **À JOUER À DEUX** pour dire si ça se remarque ;
  si oui, le pain seul mérite d'être diffusé (un `send` de trois nombres), pas les oiseaux.
- ⚠️⚠️⚠️ **LA QUÊTE DE L'ÉTOILE (444) — LA SÉANCE À DEUX CLIENTS A ENFIN COMMENCÉ AU 458, ET ELLE A
  PAYÉ IMMÉDIATEMENT.** Deux clients ont tourné ensemble pour la première fois et ont trouvé **trois
  blocages durs**, dont deux rendaient la quête **infinissable dès qu'un second joueur se
  connectait** (§12.0 de `QUETE.md`). ⚠️ **Ce qui n'a TOUJOURS pas été joué est la moitié qui se
  joue FACE À FACE** : l'étoile timide dos à dos, le RELAIS du plat et les DEUX BORDS du cratère.
  ⚠️ *Cette liste nommait aussi le croisement d'ombres, la flaque du ponton et le duo orgue/beffroi
  jusqu'au 2026-09-05 — supprimés au déchant du 469, ils envoyaient Guillaume chercher des
  mécaniques qui n'existent plus.* Le code des trois restants est là et corrigé ; les postes n'ont
  jamais été tenus. ⚠️ **Et la même séance doit
  faire la ferme PEUPLÉE**, réclamée depuis le 419. Voir `components/ferme/QUETE.md` §12.2.
  **Ce qui attend une DÉCISION de ta part, et rien d'autre :**
  **1. ✅ LE DESSIN DE LA COMPAGNE, CORRIGÉ LE 2026-09-07** (`QUETE.md` §12.3) : masques dessinés à
  la main sur l'état calme, ton arbitrage suivi au mot (direction 2, calme seulement). À juger à
  l'écran, en vraie séance — le banc dit que ça mesure juste, pas que ça plaît.
  **2. La récompense cosmétique.** L'arbitrage est POSÉ et VIDE (`resolveStarGift` écrit
  `star.gift[joueur]`, une fois, côté hôte, persisté). Reste à décider CE QU'ON DÉBLOQUE — le jour
  où la garde-robe cosmétique lira ce champ, elle n'aura pas à inventer un chemin d'attribution,
  et c'est au moment où l'on en invente un qu'on se trompe.
  **3. Le réglage du mini-jeu qui reste** (le refroidissement — les quatre autres sont morts au
  déchant du 469). Il est dessiné et vérifié, jamais joué jusqu'à la
  victoire à cadence réelle. Ce qui s'y juge — *est-ce que c'est agréable ?* — n'est mesuré nulle
  part et ne le sera jamais.
  **4. ✅ CE QUE LE NAVIRE FAIT UNE FOIS FINI — TRANCHÉ AU 453 PAR TOI.** *« Le bateau est construit
  et réel. Eduardo Da Fonseca le prend et part au large […] ça laisse de la marge narrative, pour
  développer de nouveaux mondes et ensuite permettre au bateau de revenir. »* C'est fait, et ça n'a
  coûté ni état ni message : la cale se vide pendant ses voyages. ⚠️ **Ce qui reste ouvert est la
  SUITE, et c'est un vrai chantier** : les îles. Le navire est le premier objet du jeu qui promette
  un ailleurs, et il le promet maintenant par la bouche de quelqu'un.
  **5. ⚠️⚠️ CE QUI ATTEND UN AVIS APRÈS LE 454, ET C'EST DU RÉGLAGE, PAS DE LA CONCEPTION.** Trois
  nombres ont été posés par déduction et une seule séance ne suffira pas à les juger : le **prix de
  Kerguélen** (24 000 or + 60 récoltes + 12 poissons — « forte rémunération », mais sur une ferme à
  quatre artisans, est-ce une soirée ou une semaine ?), les **quinze minutes** de plans (c'est ton
  chiffre ; les deux croisements d'ombres tiennent dedans, à vérifier en jouant) et les **cinq
  commandes de bois** (140 + 45 + 110 + 60 + 40 bois, 3 à 8 min chacune : est-ce que ça donne un
  chantier qu'on suit, ou une file d'attente ?). ⚠️ **Aucun ne doit bouger avant d'avoir joué** —
  c'est la règle du voyage en train (431), et elle a eu raison deux fois.
- **La garde-robe** (427) : les prix sont volontairement très hauts. À jouer pour savoir si
  « très cher » veut dire « on économise pour » ou « on n'y va jamais ».
- **`candyluge`** : voir `public/candyluge/README.md`, qui fait autorité. La décision qui
  manque est de CONCEPTION (le bonbon empoisonné), pas de technique.
- **`crystal`** : le chapitre a **deux** segments jouables (`play run` et `play walk`).
  Retirer le second retire le seul endroit où l'on ramasse des éclats.
