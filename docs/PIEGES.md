# PIÈGES INVISIBLES — récits complets (§4)

> **Extrait SANS MODIFICATION de `CLAUDE.md` le 2026-10-03** (allègement du noyau : le contexte fixe passe de ~47 k à ~8 k tokens, estimés).
> Les numéros de § sont CONSERVÉS : tout « §N » cité dans le code, les README et les bancs reste valable (table dans `CLAUDE.md`).
> Ce fichier se lit À LA DEMANDE (voir le routeur de `CLAUDE.md`), jamais en bloc par défaut. Les TITRES de ces pièges sont dans `CLAUDE.md` §4 (déclencheurs) ; chercher un récit : `grep -n "DÉBUT DU TITRE" docs/PIEGES.md`.

---

## 4. Pièges invisibles — les casser ne produit aucune erreur

**Ailleurs, à côté de ce qu'ils décrivent** : les pièges de la ferme, de la ville et du tribunal
(`components/ferme/README.md` §15), du GÉNÉRATEUR (même fichier, §15 bis), et les règles de DESSIN
(`components/ferme/DESSIN.md`). Ne restent ici que la **CONCEPTION** et le **LANGAGE** (JavaScript,
three.js, canevas).

⚠️⚠️ **ET UN SEUL EST RESTÉ ICI BIEN QU'IL PARLE DES CARTES, parce qu'il a été payé SIX
fois** (425, 427, 430, 431, le 2026-09-25 dans une LISTE DE LUMIÈRES : deux halos de la mairie,
posés aux coordonnées de la ville, éclairaient chaque nuit un pré de la ferme ; et le 2026-09-29 : la CIBLE
d'une provocation descendait en ville en pleine course, et l'instigateur courait vers des coordonnées de
Valley Town lues sur la ferme — *ce qu'une action VISE ne change pas de carte tant qu'elle dure*) et qu'il touche l'architecture entière : **DEUX CARTES SANS REPÈRE
COMMUN FINISSENT PAR SE MÉLANGER, et ça ne se voit que quand la plus petite ne tient plus dans
la grande.** Dernière occurrence au 431, la plus chère : le rectangle du marché de la VILLE
tombe aussi au milieu des champs de la FERME, donc le contrôle « je suis au marché » passait
depuis un pré. **La parade est UNE position taguée par sa zone, jamais deux jeux de
coordonnées — et on teste la zone AVANT les distances.**

**Conception — vrai partout**

- ⚠️⚠️ **UN CONTRÔLE QUI COMPARE UNE MESURE À LA CONSTANTE QU'ELLE DOIT TENIR SUIT LA CONSTANTE** (météo par
  lieu, 2026-09-29). « Un jour sur cinq » comparé à `PLACE_SPLIT` restait vert à 0,35 : le banc mesurait que le
  code fait ce qu'il dit, pas qu'il fait ce que Guillaume a décidé. *Une DÉCISION s'écrit en clair dans le banc ;
  seule une grandeur dérivée se compare à sa constante.* Même famille, même jour : baisser un seuil pour rendre
  une négociation plus facile la rend aussi facile au jeu qu'on ne voulait pas récompenser — **on mesure les deux
  joueurs** (l'ordinaire ET le tout-tiède) avant de choisir le levier.
- ⚠️⚠️ **UN RÉGLAGE EN PIXELS D'ART NE SE LIT PAS SUR UNE IMAGE EN PIXELS D'ÉCRAN** (lampadaires, 2026-10-02). Le chapeau de
  neige (`snowCapPixels`) compte en pixels d'ART : épaisseur de 2, tirage par colonne, « dessus » = tout pixel sans voisin
  au-dessus. Rendu tel quel sur l'image d'écran, il blanchissait un bras de fer de 3 px, pointillait chaque marche d'un
  flanc incliné et enfouissait le dessous d'une lanterne suspendue (point le plus bas de SA colonne). Chaque grandeur se
  convertit (`k` px d'écran par pixel d'art), et ce que le sprite natif tenait par sa grossièreté (une marche = un pixel
  d'art, donc rien) se recompte en largeur. *Poser une image plus fine sur un traitement lu dans ses pixels, c'est
  réécrire ce traitement.* Et le cadre de l'image fine = le cadre du natif : tout ce qui est lu sur le natif (la lumière)
  en dépend, un banc le mesure (centre du verre, falsifié par un décalage).
- ⚠️⚠️ **UNE OPTION DE CATALOGUE QUE PERSONNE NE LIT EST UN MENSONGE DE DOCUMENTATION** (planche 3, 2026-09-29).
  `opt.step` figurait dans l'outil d'import, dans son en-tête et dans sa note (« se règle ici, par le champ
  `step` ») — et la découpe lisait la feuille échantillonnée au pas COMMUN : un objet à pas propre sortait
  décalé, sans une erreur. Elle n'a servi que le jour où on a voulu s'en servir. *Une option qu'on documente se
  branche et se teste le jour où on l'écrit.*
- ⚠️⚠️ **UNE SURFACE QUI REVIENT TOUT LE TEMPS À L'ÉCRAN NE SE JUGE PAS SUR LA PLANCHE DU BANC** (pluie, 2026-09-29).
  Dix-huit contrôles verts sur des flaques qui se lisaient « surélevées » : le banc mesurait la part de sol
  couverte, pas ce qu'est une flaque (un creux qui suit les joints et les ornières). La mesure qui compte est
  née du retour : *moins de 12 % des pixels d'une flaque ont un carré de 5 × 5 tout en eau* (44 % avec le
  premier jet, falsifié sur lui). Guillaume : « comme la pluie est fréquente, il est normal que je sois hyper
  exigeant sur l'aspect des surfaces ». ⚠️ **Repayé le 2026-09-30 sur la chute des feuilles** : vingt-deux
  contrôles verts mesuraient la PART tombée et ses plaques, et Guillaume a vu un arbre « rongé ». *Un banc de
  transition mesure ce que la chose EST à mi-chemin (ici : aucun éclat, un seul morceau, rien loin du bois), et
  rejoue le premier jet pour prouver qu'il le voit.*

Les cinq pièges du GÉNÉRATEUR (la case d'un décor, la liste noire, la passe qui pave, le second de
quelque chose, la variante de décor) décrivent tous `generateTownWorld` et vivent **à côté de lui**,
au **§15 bis de `components/ferme/README.md`**. ⚠️ **Ce qui suit est resté exprès** : ce ne sont pas
des règles de générateur, ce sont des règles de conception qui valent pour n'importe quel morceau du
dépôt.

- ⚠️⚠️ **UNE GRANDEUR DE DESSIN NE DOIT PAS ENTRER DANS LA COLLISION** (439). L'arc du pont ajouté
  à `playerElevTown` aurait été trois lignes plus court et aurait rendu les deux ponts
  **infranchissables** (`canStandTown` refuse tout pas au-delà de `TOWN_STEP_MAX`) : on aurait
  livré un mur en croyant dessiner une bosse, et le symptôme n'aurait ressemblé en rien à sa cause.
  Deux fonctions qui se ressemblent assez pour qu'on les confonde doivent porter la différence
  dans leur NOM, et un banc doit tenir les deux moitiés séparément.
- ⚠️⚠️⚠️ **UNE MÊME GRANDEUR ÉCRITE À SEPT ENDROITS RESTE JUSTE JUSQU'AU JOUR OÙ ELLE EST FAUSSE —
  ET ALORS ELLE EST FAUSSE SEPT FOIS** (2026-09-01). La semelle du personnage était recopiée dans
  `canStand`, `canStandMounted`, `canStandTown`, `townCanStand`, `canStandEvil`, `E.townBoxFree` et
  `verify-vallee` : sept copies identiques, donc sept fois le même décalage d'une demi-case par
  rapport au sprite. ⚠️ **Et le pire n'est pas la recopie, c'est la COMPENSATION** : vingt-huit
  autres endroits lisaient « la case sous ses pieds » avec le même décalage, si bien que les deux
  erreurs s'annulaient à peu près. *Corriger une moitié d'une paire d'erreurs qui se compensent
  casse ce qui marchait ;* les deux se corrigent dans le même geste, ou pas du tout.
- ⚠️⚠️ **UN SPRITE N'A PAS DE SENS INTERDIT, IL A UN SENS DESSINÉ** (2026-09-01). Une murette de
  42 px de large posée sur une file NORD-SUD couvre 2,6 cases pour une case de collision : vu en
  jeu, elle mange 0,8 case de sol praticable de chaque côté et le joueur passe DERRIÈRE un mur
  qu'il traverse. Deux parades, et il faut choisir : un dessin CARRÉ (qui n'a pas d'orientation)
  ou la TRANSPOSITION du dessin d'origine — *une haie qui tourne d'un quart de tour ne change pas
  de matière, elle change d'axe* (`townHedge.v`, transposée pixel à pixel de `hedgeMid` : même
  palette, elle boucle en y parce que la source boucle en x, et la lumière reste cohérente).
- ⚠️⚠️⚠️ **UNE PROPORTION N'EST PAS UNE DIMENSION, ET AUCUN BANC DU DÉPÔT NE MESURE UN RAPPORT
  ENTRE DEUX MORCEAUX** (Tristan le 2026-09-01, le maire le 2026-09-02). Les deux personnages
  articulés du jeu ont été livrés avec une tête trop grosse — 43 % de la carrure pour l'un, **47 %**
  pour l'autre, contre 34 % chez un humain — et les deux fois le banc restait au vert : il comptait
  les postures, les îlots, les mains, jamais un RAPPORT. Guillaume l'a vu en jouant, deux fois, avec
  le même mot (« on dirait un pantin »). ⚠️ **La parade est de DÉRIVER le corps d'une seule
  grandeur** : six étages en fraction de la stature qui somment à 1, d'où tombent les quatorze
  longueurs. La stature devient alors un réglage au lieu d'être quatorze occasions de se tromper —
  et le banc peut enfin comparer la stature RENDUE à la stature ÉCRITE, ce qui est la seule façon
  qu'un nombre appelé « taille » décrive vraiment quelque chose.
- ⚠️⚠️ **UNE TAILLE SE LIT CONTRE SES VOISINES : AGRANDIR LES VOISINS RAPETISSE CE QUI N'A PAS BOUGÉ**
  (2026-09-29). La phase 11 a planté cent grands arbres ×1,5 ; les saules, identiques au pixel, ont paru
  « rétrécis », « le même saule mais plus court » — douze sur seize avaient un grand arbre devant ou juste
  derrière eux. *Avant de retoucher un dessin qu'on dit changé, le mesurer contre sa version d'avant* (une
  copie de travail au commit voulu, le même script) : ce qui a changé est souvent autour de lui, et le
  retoucher aurait abîmé la seule chose qui était juste.
- ⚠️⚠️ **UN OBJET POSÉ SE PLACE PAR LA PORTÉE DU PLUS PETIT, PAS PAR L'ASPECT DU MEUBLE VU DE
  HAUT** (2026-09-02). Le jour où les cinq maires ont eu cinq tailles, le tampon du bureau s'est
  retrouvé à 64 cm de l'épaule d'une femme dont le bras en fait 56 — et une cinématique inverse
  BORNE une cible hors de portée au lieu de la refuser : la main s'arrêtait à neuf centimètres de
  l'objet, en silence, sur le geste qui conclut l'entretien. ⚠️ Corollaire, payé dans la même
  séance : *quand un geste demande un effort anormal, c'est l'objet qu'il faut regarder, pas la
  posture* — les 0,21 radians de penchant n'existaient que pour rattraper un objet mal posé.
- ⚠️⚠️ **UN PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER** (439). Un dialogue, un tableau, une
  plaque s'ouvrent avec E sans limite et sans arbitrage de l'hôte : tout ce qu'ils rendent doit
  être de l'INFORMATION ou une valeur DÉRIVÉE (une date, un cours). Ce qui récompense passe par une
  `req` arbitrée par l'hôte, comme la vente au marché. *La porte n'est jamais la caisse.*
- ⚠️⚠️ **UNE CONDITION DE PROXIMITÉ DOIT MESURER CE QUE L'ACTION MESURE, PAS UNE APPROXIMATION QUI
  SUPPOSE QU'ON PEUT S'EN APPROCHER** (lot C, 2026-09-03). La découverte de la septième sœur
  comparait MA position à un point de sauvetage posé en pleine eau — un point que rien ne permet
  jamais d'atteindre à pied. Le hasard de la canne, juste à côté, calculait déjà la bonne distance
  (celle de la case VISÉE par le lancer, pas celle du joueur) ; la découverte, qui arme ce même
  hasard, ne la lisait pas. *Deux formules voisines qui mesurent deux choses différentes se
  ressemblent assez pour qu'on ne les compare jamais* — et celle qui ne peut jamais être vraie ne
  lève aucune erreur : elle attend, silencieuse, une condition que personne n'atteindra.

- ⚠️⚠️⚠️ **UN RÉSOLVEUR QUI ÉCRIT UN CHAMP NEUF DOIT ÊTRE LIVRÉ DANS LE MÊME GESTE QUE SA
  DÉCLARATION *ET* SA MIGRATION** (audit 2026-09-12, le défaut le plus cher de tout le chantier
  quête). Une fonction de migration d'état ne RÉPARE pas l'objet reçu : elle en construit un NEUF
  et y recopie les champs qu'elle connaît, un par un — donc **tout champ qu'elle ignore est
  supprimé**. Et ces fonctions sont appelées en tête de chaque requête et de chaque `apply` : un
  champ non déclaré s'efface dans la milliseconde qui suit sa pose, chez tout le monde, *sans
  jamais lever d'erreur*. Ça a coûté une scène entière (quatre phases, un sprite, quatre phrases)
  qui ne pouvait pas partir, et une quête **infinissable** parce qu'une régression volontaire ne
  pouvait plus être levée. ⚠️ **Et aucun banc ne pouvait le voir** : aucun ne rejoue une migration
  APRÈS un résolveur. *Le seul contrôle qui l'attrape est « poser le champ, migrer, relire ».*
- ⚠️⚠️⚠️ **UN GARDE-FOU POSÉ SUR LA DEMANDE NE TIENT RIEN QUAND LES DEMANDES SONT PARALLÈLES**
  (audit 2026-09-12). Le verrou qui devait réserver la CONCLUSION d'un chantier comptait les pièces
  déjà posées *au moment de commander* — or les commandes tournent en parallèle depuis qu'on a
  retiré leur sérialisation : on les passe toutes alors que le compte vaut encore zéro. Le verrou
  n'a jamais refusé quoi que ce soit. *Un garde-fou se pose sur l'ÉVÉNEMENT qu'il protège, jamais
  sur la demande qui le précède* — et quand le client et l'hôte doivent tous deux le lire, il
  s'écrit UNE fois et se lit deux (§8).
- ⚠️⚠️ **UN REPLI `|| "quelque chose"` SUR UNE TABLE DE LIBELLÉS EST UN STUB MENTEUR** (audit
  2026-09-12). `({…})[k] || "E"` rend une invite PLAUSIBLE pour n'importe quelle clé inconnue :
  la clé manquante ne se signale jamais, et un banc qui vérifie que « chaque clé lue existe » la
  trouve toujours — grâce au repli. Vu à l'écran seulement : un « E » nu devant un PNJ qui hurle.
  *Une table dont le repli est indiscernable d'une vraie valeur doit être vérifiée SANS son repli.*
- ⚠️⚠️ **UNE CONDITION RECOPIÉE À LA MAIN À CÔTÉ DU PRÉDICAT QUI LA NOMME A DÉJÀ DIVERGÉ** (audit
  2026-09-12, payé sur `starEngineerUrgent`). Le DESSIN appelait le prédicat, l'INTERACTION en
  réécrivait une moitié, et un commentaire affirmait que les deux étaient « identiques ». Elles ne
  l'étaient pas : le PNJ était peint calme et ouvrait la scène d'urgence. *Un commentaire qui
  affirme une équivalence est l'endroit exact où il faut appeler la fonction au lieu de la
  recopier* — et la troisième copie, dans le bandeau, disait encore autre chose.
- ⚠️⚠️ **UN COMPTEUR RAFRAÎCHI SEULEMENT PAR DES ÉVÉNEMENTS PONCTUELS MENT POUR QUI ARRIVE APRÈS**
  (audit 2026-09-12, trouvé en jouant à deux). « 👥 1 joueur en ligne » chez l'invité, pour toute
  la soirée : le compte ne bougeait que sur `join`/`leave`, et l'hôte était là AVANT. *Un compteur
  se met à jour là où la CARTE change (l'unique fonction qui fait entrer une entité), jamais à côté
  d'un message particulier* — et il se DÉDUIT, il ne se diffuse pas (§3).
- ⚠️⚠️⚠️ **DÉPLACER UNE PORTE DE CHRONOLOGIE DANS UN RÉSOLVEUR SANS RELIRE LES PORTES D'INTERFACE
  QUI Y MÈNENT FERME UN CERCLE QUE TOUS LES BANCS VOIENT VERT** (audit 2026-09-13). L'annonce a exigé
  le maire ; le bouton du maire, écrit trois semaines plus tôt, exigeait le cratère — donc l'annonce.
  La quête ne démarrait plus et 870 contrôles passaient : ils appellent les résolveurs, jamais le JSX
  qui décide si un bouton existe. *Une porte se déplace avec toutes celles qui y mènent, JSX compris.*
  ⚠️ Même audit : **un seuil chiffré (`e.ch >= 1`) posé sur un geste qu'on n'atteint qu'après ce seuil
  ne garde rien.** Un verrou qui protège un moment de l'histoire s'écrit en morceau d'histoire (ce qui
  touche l'eau avant la pluie, le reste après la réparation), jamais en numéro de chapitre.
- ⚠️⚠️ **UNE CARTE QU'ON REGÉNÈRE DEPUIS SA GRAINE NE SUPPORTE AUCUN TIRAGE DE PLUS, ET UN INTERDIT DE
  PLACEMENT SE TIENT DES DEUX CÔTÉS** (2026-09-13, buissons de la ferme). La ferme n'est pas
  sauvegardée : elle est regénérée puis rejouée case par case — un `rnd()` inséré au milieu de la
  génération déplace les rochers de TOUTES les fermes existantes et fait « repousser » ailleurs les
  arbres coupés, sans une erreur. Un décor neuf s'y pose par HACHAGE de case, en dernier, et un banc
  compare l'empreinte d'avant. ⚠️ **Changer une case de `solid` en cours de génération déplace autant
  qu'un tirage** (les refus changent) : 717 cases de Valley Town pour une emprise de maison (2026-09-26) —
  une emprise qui change se pose en passe FINALE — et quand c'est le RELIEF qui change (569 décors déplacés
  le 2026-09-27), la génération garde l'ANCIENNE emprise comme graine (`TOWN_STAIR_SEED` ; l'anneau de haie des parcelles,
  2026-09-28) et la rend au terrain en dernière passe. ⚠️ Et « pas de buisson sous un arbre », tenu à la génération, a été
  violé 400 jours plus tard par la repousse des ARBRES : *une règle entre deux objets se vérifie chez
  les deux qui peuvent naître*, pas seulement chez le nouveau venu.
- ⚠️⚠️ **UNE CASE À DEUX SOLS (un pont qu'on passe dessus ET dessous) : `elev` y reste le SOL, et le niveau
  d'un marcheur se DÉDUIT de son pas précédent** (`E.townLevelE`, 2026-09-27). Tout ce qui lit `elev` tout court
  voit une chaussée — c'est voulu (taxi, rues, arbres inchangés) — mais tout MARCHEUR qui l'y lit voit le pont
  comme un mur : les deux bancs qui ont leur propre marcheur ont rougi pour ça, et un A* sur des cases seules
  « ferme » la marche dès qu'un trajet a longé le pont par dessous. Nœuds (case, niveau), mémoire par marcheur.
- ⚠️⚠️ **UNE TRANSITION QUI SE VOIT SE FAIT PAR UN ORDRE AU PIXEL OU PAR UNE DURÉE, JAMAIS PAR UN SEUIL
  COMMUN** (neige, 2026-09-28) : un seuil unique sur une grandeur continue bascule tous les pixels (ou tout
  l'arbre) dans la même image — la neige « tombait » d'un coup, un sapin heurté passait d'alourdi à léger
  sans transition. Chaque pixel a son seuil (un ordre fixe : plaques, grain), chaque décharge a sa durée.
- ⚠️⚠️⚠️ **UN GARDE-FOU « RIEN À FAIRE UNE FOIS FINI » DOIT ÊTRE REPRIS À L'ENDROIT EXACT OÙ IL
  COUPE, LE JOUR OÙ « FINI » GAGNE UNE SUITE** (2026-09-13, `starNearby()` de `FermeGame.js`).
  `if (!e || Q.starDone(e)) return null;` voulait dire « plus rien à faire une fois la quête finie » —
  vrai jusque-là, faux dès qu'un épilogue jouable existe APRÈS `doneAt` : les invites posées plus loin
  dans la même fonction étaient mortes dès l'instant où on en a besoin. Trouvé en jouant une vraie
  partie jusqu'au bout, jamais au banc — aucun banc n'appelle cette fonction, ils appellent les
  résolveurs directement.
- ⚠️⚠️ **UN DESSIN POSÉ PAR-DESSUS LE SOL N'EXISTE PAS POUR LA MÉTÉO TANT QU'IL NE PUBLIE PAS SES
  CREUX** (payé deux fois : le quai en bois de la gare, 2026-09-29 ; la rosace de la fontaine, 2026-10-04).
  La pluie et la neige lisent le sol par la carte et l'atlas de la case (`townSnowEnv.jointAt`, `wetCls`) :
  un calque peint au-dessus (planches, rosace) se fait traverser par les joints et les flaques du sol
  qu'il cache — la grille des grandes dalles à travers la rosace, des flaques sur un quai en bois. Tout
  calque de sol neuf publie ce que la météo lit (ses joints : `c.joints`, comme l'opus publie `c.stones`)
  ou se déclare d'une autre classe. Ça ne se voit qu'en jeu, sous l'orage : aucun banc ne compare le
  dessin sec et le dessin mouillé.
- ⚠️⚠️ **UNE GRANDEUR INTÉGRÉE SUR UNE FENÊTRE QUI REPART DE ZÉRO MONTE EN DENT DE SCIE : SEUILLÉE, ELLE BASCULE
  CHAQUE JOUR** (2026-10-05, le lac du sud). L'épaisseur de glace du manteau (`ice`, neige.js) s'intègre depuis
  « quatre jours plus tôt à 6 h » : elle monte toute la journée et perd d'un coup la journée qui sort de la fenêtre
  (~1,2 cm). Pour l'étang, peu importe (il gèle à moins de 2 cm, tout l'hiver) ; un seuil HAUT posé dessus pour
  faire geler le lac « rarement » le faisait geler et dégeler tous les jours, quatre minutes réelles à chaque fois —
  mesuré sur 900 jours d'hiver, jamais vu en relisant. Un seuil rare se pose sur une grandeur LISSE : une fenêtre
  glissante de jours ENTIERS, d'heure à heure (`lakeCold`), n'oscille plus qu'avec la météo.
- ⚠️⚠️ **UN CHAMP `id` DANS UNE `req` EST ÉCRASÉ PAR L'EXPÉDITEUR** (2026-10-05, le bonhomme de neige). `sendReq`
  construit `{ ...payload, id: me.id, … }` : l'hôte lit l'auteur dans `req.id`, donc l'`id` d'un objet visé est
  remplacé sans erreur. Le décor du bonhomme était envoyé par `id`, l'hôte cherchait un bonhomme nommé comme le
  joueur et répondait « introuvable » — un panneau qui s'ouvre, des choix qui s'allument, et rien ne change. Nommer
  la cible autrement (`sid`, `targetId`, `fromId`).
- ⚠️⚠️ **UNE GARDE D'AUDIENCE À L'ÉMISSION ET UNE INSCRIPTION QUI NE SE FAIT QU'À LA RÉCEPTION FONT UN SILENCE MUTUEL QUI NE SE ROMPT JAMAIS**
  (2026-10-05, la course à deux). `sendPos` et `hostSend` ne parlent que s'il y a quelqu'un dans la liste des joueurs (garde de
  quota), et un joueur n'entre dans cette liste que par un `pos` ou un `join` reçu — un ping, lui, ne réinscrit personne. Que les
  deux clients se retirent l'un l'autre au même moment (TTL de 60 s ; un portable hôte qui dort une minute, ou un harnais qui
  avance l'horloge) et chacun attend que l'autre parle d'abord : l'invitée jouait seule, sans plus jamais recevoir un `apply`,
  jusqu'au rechargement. Une garde qui coupe l'émission doit laisser passer CE QUI REMPLIT la condition de la garde : ici, un
  ping d'inconnu déclenche l'annonce de sa position, un `pos` d'inconnu reçoit une réponse (trois messages, mesuré au relais).

**JavaScript / three.js / canevas**
- ⚠️⚠️⚠️ **UN COMMENTAIRE QUI DIT « BORNÉ À [0,1] » N'EST VRAI QUE SI LE CODE CLAMPE — UN
  RETOUR ANTICIPÉ À CHAQUE EXTRÉMITÉ N'EST PAS LA MÊME CHOSE** (perron du tribunal, 2026-09-22
  ter). `courtDepthScale` rendait `1` (taille pleine) dès qu'un `if (t > 1) return 1` était
  franchi — sauf que le palier RÉEL dépassait `t=1` d'une fraction de case, donc le joueur
  regrandissait pile devant la porte, sous les yeux de qui regarde. Rien ne distingue au premier
  coup d'œil un `Math.min`/`Math.max` (qui clampe vraiment) d'un premier retour par extrémité
  (qui rejette au lieu de borner) : le second se lit aussi bien que le premier, et seul le fait
  de REJOUER la zone limite le révèle. ⚠️ **Corollaire, payé un jour plus tard sur le même
  bâtiment (2026-09-23), et c'est la même leçon sur un autre axe** : un bornage vérifié sur `y`
  ne dit rien de `x` — `courtDepthScale` fondait déjà `y` en continu mais coupait encore `x` en
  tout-ou-rien (0,84 → 1 d'un coup en longeant le socle des ailes), parce que corriger un axe ne
  corrige pas l'autre. **Les deux bords d'une même zone à effet (fondu, palier, seuil) se
  contrôlent séparément, jamais supposés symétriques parce que l'un des deux a déjà été corrigé.**
- ⚠️⚠️⚠️ **UN BOOLÉEN MIS EN CACHE POUR UNE VALEUR NATIVE VOLATILE (`document.hidden`) NE SE
  RESYNCHRONISE QUE SUR L'ÉVÉNEMENT QUI LE MET À JOUR — JAMAIS TOUT SEUL** (hors-zip, 2026-09-01,
  bug « gels de PNJ chez l'invité », §13 item n°1, six tentatives, jamais diagnostiqué avant).
  `netCanBroadcast()` lisait `hiddenRef.current`, écrit UNE fois au montage puis à chaque
  `visibilitychange` — jamais ailleurs. Si le composant montait pendant que l'onglet était
  RÉELLEMENT masqué (cas banal : ouvrir l'onglet invité juste après l'onglet hôte, exactement la
  manip que le §10 prescrit pour tester à deux), `hiddenRef.current` restait figé à `true` POUR
  TOUJOURS — aucun retour visuel sur l'onglet ne peut le corriger, seul un vrai événement
  `visibilitychange` le peut, et rien ne le redéclenche si la valeur était déjà fausse au départ.
  `broadcastStation()` refusait alors tout, silencieusement, pour toujours : la simulation de
  l'hôte continuait parfaitement EN LOCAL (aucun symptôme chez lui), et rien de ce qui passe par
  `station` (résidents, visiteurs, scènes, montgolfière) n'atteignait plus jamais l'invité.
  *Un état qui ne peut se corriger que par un événement est aussi fragile que l'événement qui
  peut ne jamais se reproduire.* ⚠️ La parade : `document.hidden` est un getter natif, aussi bon
  marché qu'une ref — on le LIT DIRECTEMENT à chaque appel au lieu de le mettre en cache. Rien ne
  peut plus désynchroniser une valeur de sa source si on ne la copie jamais.
- ⚠️⚠️⚠️ **UN COMPOSANT DÉCLARÉ DANS LE RENDU D'UN AUTRE EST UN TYPE NEUF À CHAQUE RENDU : REACT
  REMPLACE TOUS SES NŒUDS DOM** (échecs, 2026-09-24). Un clic n'existe que si l'appui et le
  relâchement tombent sur le MÊME nœud : le plateau, recréé à chaque seconde de pendule, perdait
  13 % des appuis — mesuré, invisible en relisant, et rapporté comme « bug de sélection ». Même
  famille : une transition CSS ne joue jamais sur un nœud recréé (le bocal d'Échos, même jour).
  ⚠️ Chercher ce motif ailleurs coûte une ligne : `grep -rnE "^ {2,}const [A-Z]\w* = \("` et
  `"^ {2,}function [A-Z]"` dans `components/`. Parade : composant au niveau du
  module, et ce qui tique (une pendule) dans SON propre composant, pour ne rien re-rendre d'autre.
- ⚠️⚠️ **UN EFFET MONTÉ UNE FOIS (le canal réseau) VOIT POUR TOUJOURS L'ÉTAT DE SON PREMIER RENDU**
  (échecs, 2026-09-24 : la sauvegarde y lisait `winner` — toujours null). Parade : l'effet n'appelle
  que `H.current.x(...)`, des gestionnaires réassignés à chaque rendu ; ce qu'arbitre l'hôte vit
  dans des refs. Et un GESTE (glisser, tracé) se suit dans une ref : deux événements rapprochés
  lisent un état React en retard d'un rendu.
- ⚠️⚠️⚠️ **UNE FONCTION DÉCLARÉE DANS LA CLOSURE DE LA BOUCLE DE RENDU N'EXISTE PAS POUR LE
  COMPOSANT** — payé au 430 (`tryTownJump`, saut de rebord mort) puis au 431
  (`canStandTown` appelée par `advanceRemote`, Valley Town injouable à deux). Le hissage des
  déclarations s'arrête à la fonction qui les contient ; l'appel depuis l'extérieur lève un
  `ReferenceError` **à l'exécution seulement**, donc ni le build, ni le lint, ni aucun banc ne
  le voient. Et l'exception ne s'arrête pas là où elle tombe : **elle emporte tout ce que la
  frame devait encore dessiner.** ⚠️ La parade est de PUBLIER la fonction dans un ref réassigné
  à chaque montage de la boucle (`townJumpApiRef`, `zoneCollideRef`) — jamais d'en écrire une
  seconde copie au niveau du composant, qui divergerait au premier réglage.
  ⚠️ **Corollaire de repli** : quand la carte d'une zone manque chez ce client, un test de
  collision doit ACCEPTER, pas refuser. Refuser épingle l'entité distante à sa dernière
  position connue — c'est-à-dire qu'on reproduit le bogue au lieu de le corriger.
- ⚠️⚠️ **ET L'INVERSE : UNE FONCTION DU COMPOSANT EST MASQUÉE PAR UNE VARIABLE DU MÊME NOM DANS LA
  BOUCLE** (météo, 2026-09-26 : `faunaEnvNow()` appelée là où la boucle de la ville déclarait
  `let faunaEnvNow = null` — « n'est pas une fonction » à la première image en ville, la frame
  emportée). Ni `no-undef` ni le bundle ne le voient : le nom EXISTE. Avant de nommer une fonction de
  composant appelée depuis la boucle : `grep -n "\bnom\b"` sur le fichier entier.
- ⚠️⚠️ **UN MOTIF DE SOL SE JUGE ASSEMBLÉ, ET SA PÉRIODE COMPTE PLUS QUE SES DÉTAILS** (434).
  Une tuile de 16 px se répète tous les 16 px : l'œil voit la grille avant le dessin, **quelle
  que soit sa finesse**. On dessine un pavé de 4×4 tuiles d'un seul tenant et on y découpe la
  case (`x % 4`, `y % 4`). ⚠️ Il doit **boucler sur lui-même** (toute forme peinte aussi à −N
  et +N), sinon on a déplacé la couture de 16 à 64 px — et une couture tous les quatre
  carreaux dessine une SECONDE grille, pire que la première.
- ⚠️⚠️ **UN ÉTALEMENT `{ ...table }` RECOPIE LES RÉFÉRENCES DE SES TABLEAUX : UNE TABLE DE
  RÉFÉRENCE QU'ON ÉTALE À PLAT EST UNE TABLE QU'ON MODIFIE** (2026-08-31). La vue de l'audience
  partait de `{ ...poseTarget("closed") }` et lissait dedans image par image : elle écrivait donc
  dans `POSE.closed` lui-même, la table se corrompait à la PREMIÈRE image, et la seconde audience
  de la session partait d'une posture que personne n'avait écrite. **Aucun symptôme sur le
  moment** — les nombres restaient plausibles. Parade : une copie explicite (`poseState`), et un
  contrôle qui rejoue deux cents images puis compare la table à elle-même.
- ⚠️⚠️⚠️ **UN EFFET REACT DONT LE NETTOYAGE A UN EFFET DE BORD SE DÉCLENCHERA AU DÉMONTAGE QU'ON
  N'AVAIT PAS PRÉVU** (2026-08-31). La scène de sciage rapportait sa manche depuis le `return` de
  son effet, « au cas où le joueur ferme en cours de route ». En développement, React 18 monte
  l'effet, le NETTOIE, puis le remonte : la scène se refermait donc toute seule dans la
  milliseconde, **sans une ligne d'erreur, sans rien dans la console**, et le bouton qui l'ouvrait
  avait l'air de ne rien faire. Une demi-heure perdue à chercher un bogue de rendu qui n'existait
  pas. ⚠️ Le nettoyage LIBÈRE (écouteurs, contexte WebGL, textures) ; il ne DÉCIDE de rien.
- ⚠️⚠️⚠️ **UNE ANIMATION CSS NE REDÉMARRE PAS PARCE QU'ON AJOUTE UNE CLASSE À UN NŒUD DÉJÀ
  MONTÉ** (2026-09-01). Le navigateur considère l'animation comme jouée et ne la rejoue pas. Ça ne
  se voit qu'à la SECONDE occurrence — donc jamais en relisant, et jamais dans un test qui ne
  déclenche l'effet qu'une fois. C'est le piège de tout accusé de réception qui peut arriver deux
  fois de suite. ⚠️ **La parade est un `key` React qui porte une séquence** : le nœud est remonté,
  l'animation repart de zéro, et le coût est nul quand le nœud est vide. Une classe qu'on retire
  puis qu'on remet marche aussi, mais elle demande de choisir un délai — c'est-à-dire un second
  nombre qui doit s'accorder avec la durée de l'animation (§8).
- ⚠️⚠️ **UN SÉLECTEUR CSS REDÉCLARÉ PLUS BAS DANS LA FEUILLE NE COMPLÈTE PAS LE PREMIER, IL LE
  CORRIGE** (2026-09-01, payé sur le bandeau de quête, sorti de l'écran par un `position:relative`
  qui écrasait un `position:fixed`). ⚠️ **Et rien dans ce dépôt ne peut l'attraper** : les
  vingt-deux bancs de rendu rastérisent du canevas, aucun ne met en page du CSS. *Toute la mise en
  page se juge à l'écran ou ne se juge pas* — corollaire direct du §10.
- ⚠️⚠️ **UN `max-width:calc(100vw − Npx)` SUPPOSE UN VIEWPORT LARGE, ET DEVIENT NÉGATIF EN DESSOUS —
  LE MOTEUR RAMÈNE ALORS LA VALEUR À 0, SANS ERREUR** (Où's that ?, 2026-09-06). Une bulle réglée
  pour rester étroite sur un écran large (`calc(100vw - 500px)`) devient invisible sur tout
  viewport plus étroit que la constante soustraite — c'est-à-dire tous les téléphones — et rien ne
  le signale : la règle est valide, juste toujours à zéro. La parade est `min(Npx, calc(100vw -
  margePx))` : un plafond ferme plutôt qu'une soustraction qui peut changer de signe.
- ⚠️⚠️ **UN CONTRÔLE DE TAILLE QUI COMPTE L'ALPHA MESURE LE HALO, PAS L'OBJET** (2026-09-13).
  `render-etoile` bornait la reine à « 21 à 28 px » en comptant l'alpha > 40 — seuil que le halo
  plat (alpha 51) franchissait partout. Le jour où le halo est devenu progressif, la reine a
  « rétréci » de six pixels sans qu'un pixel de matière bouge. *Une source de lumière se mesure
  sur sa MATIÈRE ; son halo est un autre objet, avec sa propre grandeur.*
- ⚠️⚠️ **UN BANC QUI CHERCHE UN NOM D'APPEL MESURE UNE ÉCRITURE, PAS UN AFFICHAGE** (2026-09-02).
  `verify-quete` déclare morte toute phrase du maire qu'aucun fichier ne lit — il les cherchait par
  `L.maire.<clé>`. Le jour où les appels sont devenus `LM.` et `maireL().` (le texte se décline
  selon le sexe de l'élu), le banc a annoncé cent quatre-vingts phrases mortes sur du code
  parfaitement juste : il est tombé à l'instant exact, pour la mauvaise raison. *Un banc qui lit du
  SOURCE doit énumérer toutes les écritures de ce qu'il cherche, ou n'en chercher aucune.*
- ⚠️⚠️ **`chaîne.replace("X", …)` NE REMPLACE QUE LA PREMIÈRE OCCURRENCE.**
- ⚠️⚠️ **UNE CLÉ EN DOUBLE DANS UN LITTÉRAL NE LÈVE RIEN : LA SECONDE GAGNE** (2026-09-28 : `townFence`, le cache
  des clôtures, écrasait la clôture de bois de la rive dans `buildSprites` — 900 lignes plus haut). Avant de
  nommer une clé de `buildSprites`, `grep -n "nom:"` sur le fichier ; `render-rive` l'a vu, pas la relecture.
- ⚠️⚠️ **UNE BORNE DE BOUCLE RECALCULÉE À CHAQUE TOUR SUR CE QUE LA BOUCLE MODIFIE S'ARRÊTE TROP TÔT, SANS
  ERREUR** (`for (k = 0; k < total - w[0] * n; k++) w[k]++`, `roadSplit`, 2026-09-27 : un reste de 4
  n'ajoutait qu'un pixel). Et un défaut vieux de vingt zips a des dessins RÉGLÉS DESSUS : le corriger en
  place les change (les marches du tribunal, 42 → 23 teintes) — on écrit la version juste À CÔTÉ.
- ⚠️⚠️ **UN `useProgram` QUI ÉCHOUE NE DÉLIE PAS LE PROGRAMME PRÉCÉDENT** : un shader qui ne
  compile pas fait dessiner l'objet SUIVANT avec les mauvais attributs. **Seul indice :
  `INVALID_OPERATION: program not valid` dans la console.**
- ⚠️⚠️ **UN EFFET QUI SE DESSINE AILLEURS QUE SON OBJET (un reflet, une ombre longue) N'EXISTE QUE SI LA
  FILE DE DESSIN CONNAÎT L'OBJET HORS CADRE** (2026-09-26, vu par Guillaume : le reflet d'un arbre
  apparaissait d'un coup quand le pied du tronc entrait à l'écran). La vue découpée à l'écran n'est pas
  la bonne marge : c'est la portée de l'effet qui la donne (`TOWN_REFL_ROWS`).
- ⚠️⚠️ **UN ÉTAT QU'ON RETIRE QUAND SA TAILLE CHANGE SE RETIRE À CHAQUE IMAGE D'UN FONDU** (pluie,
  2026-09-25, vu par Guillaume). Le nombre de gouttes suivait la surface visible, donc changeait à chaque
  image d'un zoom — et le tableau était régénéré au hasard : tout le rideau sautait. Ce qui dépend d'un
  paramètre CONTINU s'AJUSTE à la marge (on ajoute, on retire), et se range dans un repère qui ne bouge
  pas avec lui (fractions d'écran).
- ⚠️⚠️ **`floor(t × cadence)` AVEC `t` ABSOLU ET UNE CADENCE QUI VARIE TIRE UNE IMAGE AU HASARD**
  (faune, 2026-09-26) : `t` vaut ~10⁵ s, donc la moindre variation de la cadence déplace l'index de
  milliers d'images, à chaque rafraîchissement — c'était le « saccadé » du chat et des colverts, invisible
  en relisant. Une phase dont la vitesse change s'INTÈGRE (distance parcourue, ou accumulateur), elle ne
  se multiplie jamais par le temps absolu.
- ⚠️⚠️ **UN `const` DE HAUT NIVEAU N'EST PAS UNE PROPRIÉTÉ DE `window`.** Tester avec
  `typeof X !== "undefined"`.
- ⚠️⚠️ **UN CANEVAS DÉCOUPE EN SILENCE CE QUI DÉPASSE DE SON CADRE** (427) : une feuille de
  personnage fait 16×24 par pose, un chapeau posé au-dessus de y=0 sort décapité, et rien ne
  le dit. Le banc de rendu l'a montré, la relecture non.
  ⚠️⚠️ **PAYÉ TROIS FOIS DANS LE SEUL ZIP 433** — l'enseigne de toit du taxi en trois quarts,
  le drapeau de la mairie, le liseré des oiseaux. C'est le piège le plus répétitif du projet
  parce qu'il ne coûte RIEN sur le moment : le dessin est joli, il manque juste deux rangées
  que personne ne cherche. **Deux parades, et la seconde est la vraie :** dimensionner le
  canevas à partir de ce qui dépasse (le fuyant d'un trois-quarts se retrouve en HAUT, donc le
  canevas fait `24 + DROP`), et **dessiner serré, RECADRER, PUIS cerner** — cerné dans son
  cadre juste, le liseré d'un sprite qui touche le bord est lui-même découpé (`padOutline`).
  ⚠️ Un banc peut l'attraper en une ligne : aucun pixel peint sur le bord du canevas.
- ⚠️⚠️⚠️ **`ctx.drawImage` À 9 ARGUMENTS PREND UN RECTANGLE SOURCE EN PLUS DE LA DESTINATION —
  LES DEUX N'ONT PAS LE MÊME REPÈRE** (halage, 2026-09-04). Passer les coordonnées ÉCRAN comme
  rectangle source (au lieu d'une sous-région du sprite lui-même, 0..largeur native) fait lire
  hors de l'image : aucune exception, un `drawImage` qui ne dessine RIEN, silencieusement. Trouvé
  en jeu (une étoile posée sur la rive, invisible), pas en relisant le code — la ligne semblait
  juste. **La forme à 5 arguments (image entière, juste une destination) est celle qu'il faut par
  défaut** ; les 9 arguments ne se justifient que pour découper une VRAIE feuille de sprites, avec
  un rectangle source dans les dimensions natives de l'image, jamais dans celles du monde.
- ⚠️⚠️ **`ctx.fillText` N'EST PAS RASTÉRISABLE HORS NAVIGATEUR** (427) : un nom cuit dans un
  sprite fait planter `tools/render-*.mjs`, c'est-à-dire qu'on perd le seul moyen de REGARDER
  ce dessin. Les textes des bâtiments s'écrivent VIVANTS, au rendu — ce qui les rend en plus
  bilingues, ce qu'un sprite baké ne peut pas être. Idem `translate`/`rotate` : le faux canvas
  les ignore, un sprite qui en dépend se juge faux. Depuis le 2026-09-25, les NOMS s'écrivent en
  police pixel dessinée en code (`pixelFont.js`) : rastérisable, donc tenue par un banc (`verify-noms`).
- ⚠️⚠️ **À ÉCHELLE NON ENTIÈRE, LE NAVIGATEUR LISSE LES BORDS D'UN `drawImage`, MÊME
  `imageSmoothingEnabled` COUPÉ** (2026-09-25) : c'est la GÉOMÉTRIE qui est lissée, pas l'image. Deux
  tuiles voisines dont la jointure tombe sur un demi-pixel d'écran le couvrent chacune à moitié, et le
  fond transparaît : une couture d'un pixel (le « trait vert » de Valley Town, pendant chaque fondu de
  zoom). Invisible au repos, invisible au banc (le faux canvas ne lisse rien). Parade : pendant le
  fondu, caler chaque tuile sur des pixels d'écran ENTIERS (ses deux bords arrondis, pas sa taille).
- ⚠️⚠️ **UN `onLoad` D'IFRAME PROUVE QUE LE DOCUMENT S'EST OUVERT, JAMAIS QUE SON CONTENU EST
  VALIDE** (Où's that ?, 2026-09-06). Un panoId Street View retiré par Google sert quand même une
  page qui charge normalement — `onLoad` se déclenche à l'identique d'un vrai panorama, en
  silence. Aucun code ne peut lire l'intérieur d'un iframe cross-origin pour distinguer les deux ;
  seule une revue manuelle régulière du contenu attendu le peut.
- ⚠️ **TEINTER UN SPRITE AVEC UN `fillRect` DESSINE UNE BOÎTE.** Un sprite est transparent
  partout sauf sur lui-même ; l'assombrir passe par `ctx.filter` (et il FAUT le remettre à
  `"none"`, c'est un état du contexte). ⚠️ Même famille au 427 : teinter un VÊTEMENT ne se
  fait pas en repeignant la feuille (on colorerait la peau et les cheveux), mais en
  repeignant les blocs du vêtement à leurs coordonnées exactes.
- ⚠️⚠️ **`Array.prototype.sort` EST STABLE, MAIS UN ORDRE DE DESSIN NE SE FONDE PAS DESSUS**
  (431). Les files de rendu du projet trient par ancrage au sol ; deux éléments à la même
  hauteur gardent donc leur ordre d'insertion — jusqu'au jour où l'on réorganise une boucle,
  sans rien casser de visible ailleurs. Ce qui doit passer devant le dit avec un epsilon.
- ⚠️ **`stopPropagation` N'ARRÊTE PAS LES AUTRES ÉCOUTEURS DE LA MÊME CIBLE** (il faut
  `stopImmediatePropagation`).
- ⚠️ **UN EFFET À BOUFFÉES NE S'ÉTEINT PAS EN METTANT SON TAUX À ZÉRO.**
- ⚠️ **`*/` DANS UN COMMENTAIRE DE BLOC LE FERME** — `COURT_STAIR_*/COURT_LINKS` a cassé le
  build du 426. Les commentaires denses de ce projet en sont friands.
- **`Pix.rng(graine)` rend un générateur INDÉPENDANT** (`pix.js:40`).
- **`crystal` n'affiche AUCUNE image** : tampon 480×270 toujours opaque.
- **La caméra de `walk` est 2,6 unités DERRIÈRE le personnage.**
- **Rendre un objet invisible ne le retire pas du monde.**
- ⚠️⚠️ **`x | 0` SUR UN HORODATAGE EN MILLISECONDES LE TRONQUE À 32 BITS : UN ENTIER QUELCONQUE, PARFOIS NÉGATIF, QUI NE SE COMPARE PLUS À `Date.now()`** (2026-10-05, nuit fin quater). `Date.now()` vaut ~1,79 × 10¹² : `| 0` n'en garde
  que les 32 bits bas (ici ~2,3 × 10⁸, et NÉGATIF une moitié de chaque cycle de 49,7 jours). `skatesActive` refusait des patins
  loués pendant cette moitié-là, et le sac des autres, copié avec le même `| 0`, n'était jamais comparable à `Date.now()` — à deux, un
  invité ne voyait pas les patins de l'hôte ; ni erreur, ni avertissement, et le bug dépend de la DATE du jour (un banc vert un mois,
  rouge le suivant). Parade : comparer des nombres tels quels (`+x > 0`, `|| 0` pour un défaut), jamais `| 0` sur du temps ; et un
  banc qui joue la fonction à une vraie heure d'horloge dont les 32 bits bas sont négatifs (`verify-vallee`). ⚠️ Même motif repéré, pas
  corrigé : `f.injuredUntil | 0` (FermeGame.js, `resolveStarCandy`).
