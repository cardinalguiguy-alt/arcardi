# ARCARDI 🎪

> **ZIP 431 — ON NE VEND PLUS DEPUIS SON CANAPÉ, ET LA FOIRE RESSEMBLE ENFIN À UNE FOIRE.**
>
> Le 430 avait ouvert le marché ; il restait un menu de plus. **La vente déménage
> ENTIÈREMENT à Valley Town** : les neuf guichets de la ferme — le bac, les gemmes, la
> farine, le sucre, les prises de Soan, les productions de Harald, les vergers, les
> artisans, la bijouterie — n'achètent plus rien. Ils **montrent**. On consulte ses
> réserves, on transforme (la meule, les parts de fromage, les confitures), et on prend le
> train pour encaisser. Seuls les **visiteurs** achètent encore à la ferme, un à un, pour
> répondre à leur demande — ce n'est pas écouler une récolte, c'est rendre service.
>
> **Retirer les boutons n'aurait rien garanti.** Un onglet resté ouvert sur la version
> d'avant continuerait d'envoyer les vieilles requêtes, et l'or est partagé. Le verrou est
> donc chez l'hôte, en **un seul point d'entrée**, avant les trois sous-traitants.
> ⚠️ Et il a fallu boucher un trou au passage : le champ de foire occupe x∈[34;68],
> y∈[70;104] **en coordonnées de ville** — des coordonnées qui existent aussi au milieu des
> champs de la ferme, qui fait 180×140. Un fermier planté au bon endroit de son pré passait
> le contrôle « je suis au marché » sans avoir jamais pris le train. La position transporte
> désormais **sa zone**, et la zone se teste avant les distances.
>
> **Le comptoir devient un panier.** Le 430 vendait une ligne par clic, tout le stock d'un
> coup : impossible de garder trois blés pour semer. Chaque ligne a maintenant son
> sélecteur (− / champ libre / + / Max), son total vivant, et les cinq familles servent de
> **filtre** en plus d'afficher le cours du jour. Le total du panier est affiché en
> permanence, parce que la question devant un marché n'est jamais « combien vaut un blé »
> mais « combien je repars avec ».
> ⚠️ Et tout le panier part en **UNE requête**. Ce n'est pas du confort : quarante lignes
> vendues une par une feraient quarante messages contre un plafond dur de dix par seconde,
> **dépassé silencieusement** — la moitié du panier serait partie dans le vide, sans un mot.
>
> **La foire, elle, vendait la même chose dans quatre couleurs.** Les dix étals étaient
> corrects — bonnes proportions, bâche festonnée — et l'ensemble restait un parking à
> barnums, parce qu'on ne reconnaissait aucun commerce en passant devant. Ils sont
> désormais **six métiers** : primeur, poissonnier, boulanger, fleuriste, fromager, potier,
> lisibles à trois distances — la bâche donne la couleur, la marchandise **pendue** donne le
> métier, l'étalage donne le détail. Deux voisins ne font jamais le même. S'y ajoutent une
> **arche d'entrée** (deux poteaux solides, on passe entre eux, le nom écrit vivant sur son
> panneau), des **guirlandes de fanions** tendues d'un étal à l'autre sur leurs mâts, une
> charrette à fleurs, des tonneaux et des sacs de grain.
>
> **Guillaume a vu en jeu deux décalages que trois bancs regardaient sans les voir.** La
> rangée d'étals commençait à une marge fixe et non au centre : elle penchait d'une case et
> demie vers l'ouest, et le premier étal mordait sur le bord du dallage. Et la colonnade du
> tribunal partait de x = 18 au lieu de 12 — huit fûts parfaitement réguliers, **six pixels à
> droite du fronton qui les couronne**. Aucun des deux ne se voit en regardant l'élément
> fautif : ce qui est faux, c'est son rapport à l'axe. Tout part maintenant d'un centre
> DÉDUIT, le dallage a un nombre **impair** de colonnes pour que son axe soit une colonne et
> pas un joint, et un contrôle de symétrie est entré au banc de rendu.
>
> **Le saut de rebord était mort depuis le 430, partout en ville.** `tryTownJump` vit dans la
> closure de la boucle de rendu ; le 430 lui a donné deux appelants nés au niveau du
> composant (la touche Espace, le bouton tactile). Chaque appui levait un
> `ReferenceError` — donc le repli `doAction()` ne s'exécutait pas non plus. On l'a remarqué
> au belvédère parce que c'est là qu'on essaie de sauter. Rien à l'écran ne le disait ; seule
> la console en parlait.
>
> Et **l'herbe de Valley Town est plus sombre que celle de la ferme** : même dessin, même
> grain, même graine de tirage, palette assombrie de 10 % avec un demi-pas vers le bleu.
> Assez pour sentir qu'on a changé d'endroit en descendant du train, pas assez pour croire à
> une autre saison.
>
> **Bancs : 172/172 sur `verify-vallee` (137 au 430)** — dont, pour la première fois, six
> contrôles qui JOUENT une vente et comptent les pièces : l'or crédité, le stock retiré, le
> panier multi-lignes, le double crédit de la barquette, et le refus depuis la ferme qui ne
> doit RIEN changer. `tools/render-foire.mjs` est neuf.

> **ZIP 430 — LE TRAIN A ENFIN UNE RAISON D'ÊTRE PRIS, ET L'IPAD N'A PLUS BESOIN DE CLAVIER.**
>
> **Valley Town était un beau décor qu'on visite.** On y montait par curiosité, on
> redescendait, et la ferme continuait sans elle : rien, dans toute la ville, ne valait le
> voyage. Les dix étals du champ de foire existaient depuis quatre zips et ne servaient à rien.
> **Le marché ouvre** : on y vend tout ce qui se vend au bac de la ferme, à un cours qui change
> chaque jour et qui n'est **jamais inférieur** à celui du bac — au pire on ne gagne rien de
> plus, jamais on ne perd. Un jour par semaine, c'est **jour de marché** et toute la vallée
> descend.
>
> Le cours n'est stocké nulle part. Il est **haché à partir du numéro de jour** : deux joueurs
> à deux bouts du monde lisent le même chiffre sans qu'un octet ne circule. Pas un champ de
> sauvegarde, pas un message, pas une migration. Et le panneau affiche l'**écart** avec le prix
> de la ferme, pas le prix — parce que personne ne connaît par cœur le prix du bac, et que
> c'est le « +18 % » qui transforme une liste de chiffres en décision.
>
> **La ferme était injouable sans clavier, et personne ne l'avait écrit.** Vérification faite :
> aucun écouteur tactile dans tout son rendu. Un tap permettait d'utiliser un outil, mais rien
> — strictement rien — ne permettait de se déplacer ni d'interagir. L'un des trois joueurs les
> plus actifs devait brancher un clavier Bluetooth pour entrer dans le seul monde partagé du
> projet. Il y a maintenant un **pavé directionnel flottant** (son centre se pose là où le
> pouce se pose : sur un iPad tenu à deux mains, on ne regarde pas ses pouces) et un **bouton
> d'action qui porte le nom de ce qu'il va faire** — « s'asseoir », « entrer au tribunal »,
> « vendre au marché ». Il ne le calcule pas : le jeu le sait déjà à chaque image depuis le 426.
>
> **L'affichage suit la dernière entrée utilisée, il ne se règle pas.** Un doigt allume les
> commandes, une touche du clavier les éteint. Ce joueur-là rebranche son clavier une fois sur
> deux ; un réglage l'aurait obligé à le changer deux fois par soirée.
>
> Et le pavé écrit **les quatre mêmes booléens que les flèches**. C'est la décision qui rend
> tout le chantier petit : le jeu a trois boucles de déplacement, un second canal d'entrée
> aurait voulu dire les modifier toutes les trois — puis oublier la quatrième. En partageant la
> variable, le doigt ne *peut pas* se comporter autrement que le clavier.
>
> **Carla Garfield est plus libre que les autres.** Son statut était à jour dans le code et
> FAUX dans le commentaire qui le décrit : il annonçait encore, trois zips après, deux verrous
> retirés depuis longtemps. Désormais elle est **inexpulsable** — le vote d'exclusion envoie un
> résident supplier qu'on le reprenne, ce qui n'a aucun sens pour quelqu'un qui a sa propre
> boutique en ville et n'a jamais eu besoin de la ferme ; partir sera sa décision — et elle
> **ne tient boutique qu'un jour par semaine**. Les autres jours, la Maison Garfield est
> fermée, et la porte dit dans combien de jours elle rouvre. Ce jour-là, elle descend en ville
> d'office : une boutique ouverte sans commerçante dedans n'aurait été qu'un détail de plus à
> corriger plus tard.

> **ZIP 429 — LA VILLE A UN CIEL, DES JAMBES, ET UNE BOUSSOLE.**
>
> **Il faisait midi de printemps à Valley Town depuis le zip 234.** Pas par choix : le voile
> de nuit, la pluie d'orage, la teinte de saison et la neige étaient écrits dans le corps du
> rendu de la ferme, et la ville a sa propre boucle depuis qu'elle existe. Le symptôme était
> pourtant déjà dessiné — le générateur pose des dizaines de lampadaires le long des avenues,
> de la promenade du lac et du quartier des artisans depuis le 425, et **aucun n'a jamais
> éclairé quoi que ce soit.** Un décor qui existe pour une mécanique absente est plus trompeur
> qu'un décor manquant. C'est la troisième fois qu'une zone n'hérite pas de ce que la boucle
> commune faisait pour elle ; cette fois le code a été SORTI plutôt que recopié.
>
> **On court** (Maj, ×1,75, dans les trois zones, contre de l'énergie). C'est un mode de
> déplacement et pas un véhicule, et c'est un choix : un vélo aurait demandé un sprite par
> orientation, un état partagé « qui l'utilise » à arbitrer par l'hôte, des stationnements et
> une réconciliation à la déconnexion. La course ne coûte aucun de ces états — elle multiplie
> une vitesse qui voyage déjà dans le paquet de position depuis le 365, donc **les autres
> joueurs voient quelqu'un courir sans une ligne de réseau en plus.**
>
> **On ouvre le plan, on clique où l'on veut aller.** Un triangle ambré orbite autour du
> personnage en pointant la destination, la distance dessous ; quand elle entre à l'écran, il
> se pose dessus et respire. Reclic pour annuler, effacement à l'arrivée. **Rien ne part sur le
> réseau** : une destination est une intention, elle n'a de sens que pour celui qui l'a posée,
> et la diffuser en ferait un état à réconcilier pour rien. Elle porte sa zone — sans quoi une
> boussole posée devant l'église pointerait, une fois rentré, un point au hasard du champ de
> blé, en ayant l'air de marcher.
>
> **On s'assoit à trois sur un banc**, et le banc a été redessiné parce qu'il était **trop
> grand** : 22 pixels de dossier pour un personnage qui en fait 23 — l'appui-dos arrivait au
> sommet du crâne d'un adulte debout. Il fait maintenant 18 de haut et 52 de large, et trois
> personnes s'y chevauchent aux épaules comme trois personnes sur un banc.
>
> **Ce défaut-là en cachait d'autres, et il a fallu un outil pour les voir.** Tous les bancs de
> rendu du projet dessinaient les meubles ENTRE EUX : c'est ce qu'il faut pour juger une
> palette, et ça ne dit rien d'une échelle — un objet deux fois trop grand au milieu d'objets
> deux fois trop grands a l'air parfaitement juste. Un décor se juge **contre le personnage qui
> s'en sert**. Mesuré : l'étal du marché faisait 1,3 fois la taille d'un adulte au lieu de 2,1
> (les dix étals de la foire arrivaient à l'épaule du marchand), et la fontaine 2,35 au lieu de
> 1,6. Corrigés. La fontaine a d'ailleurs révélé au passage que ses cotes étaient recopiées à
> quatre cents lignes de distance : en la rabaissant, l'eau serait restée à mi-hauteur de l'air
> et le jet aurait jailli vingt pixels au-dessus de sa colonne, sans la moindre erreur.
>
> **Et l'église était une mairie.** Littéralement : le dessin du zip 235 — fronton à colonnes,
> horloge, drapeau — renommé « église » au 425 sans qu'un pixel bouge, sa propre note le dit.
> Valley Town a eu deux mairies pendant quatre zips, dont l'une s'appelait église. Elle a
> maintenant un clocher décalé, une flèche, une croix, une rosace et des arcs brisés — quatre
> choses dont aucune n'était là, et dont la première suffit : c'est la silhouette qui identifie
> un bâtiment, pas le détail.
>
> **Les haies, enfin, savent où elles s'arrêtent** — et c'était un défaut pratique, pas
> esthétique. Trente cases de rectangles identiques se lisaient comme un mur vert lisse, et
> **on ne voyait pas les passages** : les 27 parcelles ont chacune une entrée percée dans leur
> haie, et ce trou d'une case ne se distinguait de rien. On longeait.

> **ZIP 428 — ON A MESURÉ VALLEY TOWN, ET ELLE NE MARCHAIT PAS.**
>
> **Quatre trajets de résident sur cinq n'aboutissaient pas.** Pas « parfois » : 24 %
> d'arrivées, mesuré en rejouant le vrai code de déplacement sur la vraie carte, image par
> image. Et le symptôme MENTAIT — à l'abandon, le résident jouait quand même son activité sur
> place, sept à vingt-six secondes. Un résident bloqué contre une haie n'avait pas l'air
> bloqué : il avait l'air de contempler une haie. Ça a duré deux zips.
>
> La ville était pourtant parfaitement connexe (33 198 des 33 199 cases praticables
> atteignables depuis le quai, détour médian 1,28× la ligne droite). Ce n'étaient pas les
> escaliers — c'étaient les vingt-sept haies, les bâtiments et l'étang. Le zip 427 avait écrit
> noir sur blanc « la parade n'est pas un A\*, c'est un itinéraire » ; il avait tort, et il
> aura fallu un chiffre pour le savoir. **Les résidents ont maintenant un vrai chemin :
> 100 % d'arrivées, sur les 16 002 trajets possibles d'un endroit à un autre, et pas un
> message réseau de plus** (le chemin est réduit à sept points de passage en médiane avant de
> partir dans le message qui partait déjà).
>
> **Cinq défauts ont été trouvés par le banc et par lui seul, aucun n'ayant jamais levé
> d'erreur** : une heuristique de recherche inconsistante qui rendait « pas de chemin » comme
> si c'était une réponse ; un tas qui débordait en silence hors des bornes d'un tableau typé ;
> une altitude de référence décalée d'un échantillon, qui faisait franchir un escalier en
> biais ; une réduction de chemin qui pouvait cesser d'avancer ; et une position, au bas des
> marches, où l'on pouvait entrer mais plus jamais repartir.
>
> **La ville était aussi vide aux trois quarts, et personne ne l'avait compté.** 33 des 48
> blocs ouverts n'avaient aucun endroit de vie ; seize des soixante et un endroits étaient des
> tombes, si bien qu'un quart de la vie sociale de Valley Town se passait au cimetière — sans
> que ce soit l'intention de personne. La promenade du lac, le verger, l'étang, les artisans,
> la foire, les parterres et les carrefours en ont désormais. **127 endroits, tous dérivés de
> la carte**, et un contrôle qui refuse qu'une seule activité écrase les autres (il a d'ailleurs
> attrapé le premier jet, qui mettait 39 % des endroits sur le trottoir). **Les trois bancs du
> bord du lac étaient morts** depuis toujours : on ne pouvait s'asseoir que par le sud, et au
> bord de l'eau, le sud c'est le lac.
>
> **On s'assoit pour de bon.** Ce que faisait le 427 n'était pas une pose, c'était une coupe :
> les dix-sept pixels du haut du sprite, posés quatre pixels plus bas. Un buste tronqué à
> mi-cuisse. La vraie pose découpe trois tranches dans la feuille du personnage lui-même —
> buste, cuisses en raccourci, mollets rétrécis — donc elle hérite gratuitement de la tenue, de
> la salopette et des articles achetés chez Carla, dont la teinte est cuite dans la feuille.
> **Et le joueur peut s'asseoir**, ce que le banc ne permettait pas : `E` sur un banc, une
> touche de direction pour repartir.
>
> **Les grands bâtiments se voient enfin en entier.** Le tribunal fait onze cases de haut ; le
> joueur, au centre de l'écran et au pied du perron, n'en voyait que neuf sur une fenêtre de
> 900 px, sept et demie sur 720. La caméra recule à leur approche, et aux points de vue —
> belvédère, ponton, place. Rien du gameplay ne bouge : aucun rayon d'interaction de ce jeu
> n'est en pixels.
>
> **Et le banc de rendu mentait.** Son faux canevas n'implémentait `drawImage` qu'à trois
> arguments et ignorait silencieusement les autres : toute découpe dans une feuille de sprite
> — c'est-à-dire toute pose de personnage — y était rendue en dessinant la feuille entière.
> Pas d'erreur, une image plausible, un verdict faux. C'est le défaut que le projet se répète
> depuis des zips, cette fois dans l'outil censé nous en protéger.
>
> Enfin, `CLAUDE.md` **rétrécit pour la première fois** (507 → 490 lignes) : Valley Town, le
> tribunal et leurs habitants ont leur propre fichier, `components/ferme/README.md`, à côté du
> code qu'ils décrivent.
>
> **Décidé, pas construit** : le marché du champ de foire, les commissions du tableau des
> nouvelles, les rendez-vous datés. Le socle sur lequel ils reposeront est en place et mesuré.

> **ZIP 427 — VALLEY TOWN SE MET À VIVRE.**
>
> **Vingt résidents au lieu de dix, et zéro message réseau de plus.** La seule question
> qui comptait pour doubler la population était « combien de `send()` en plus ? ». La réponse,
> mesurée sur le code et pas au jugé, est *aucun* : depuis le zip 364, tout ce qui bouge chez
> un résident tient dans **un seul message groupé par image**, et la taille d'un paquet n'est
> pas facturée. Le vrai coût du passage à vingt est du calcul chez l'hôte. C'est le bon
> échange : le processeur est gratuit, le quota Supabase non.
>
> **Les résidents descendent à Valley Town.** Ils prennent le train (six en même temps au
> plus, pour un séjour de trois à dix minutes), ils s'éparpillent, ils choisissent un endroit
> et ils y font quelque chose : s'asseoir sur un banc, regarder la fontaine, faire leur
> marché, tirer de l'eau au puits, se recueillir au cimetière, écouter le kiosque, lécher la
> vitrine, monter au belvédère, aller au bout du ponton. Pendant ce temps ils **ne travaillent
> pas** à la ferme — c'est le prix du voyage, il est explicite. Les endroits où l'on s'arrête
> ne sont écrits nulle part : ils sont **déduits de la carte elle-même**, si bien que déplacer
> un banc déplace l'endroit où l'on s'assoit, et qu'aucune liste ne peut mentir.
>
> **Ils montent les escaliers.** Ça a l'air d'un détail, c'en est un piège : un personnage
> qui marche en ligne droite ne trouve jamais une volée de marches. Il se colle au pied de la
> falaise et abandonne, sans la moindre erreur — et le symptôme, « personne ne va jamais en
> Haute-Ville », ressemble à un choix de conception. La réponse n'est pas un algorithme de
> recherche de chemin mais un **itinéraire déduit de la table des escaliers**, qui tient dans
> le message de trajet existant : monter au belvédère coûte exactement autant que traverser
> la place.
>
> **Ils se parlent, et ce qu'ils se disent dépend de qui ils sont.** Deux résidents qui se
> croisent engagent la conversation, sur un ton amical, froid ou neutre selon la table
> d'affinités qui existait depuis longtemps et que personne ne voyait jamais. Le **tableau des
> nouvelles** planté sur la place la rend enfin lisible : qui est en ville, avec qui, et qui
> ne se salue plus. Aucune réplique ne circule sur le réseau — les deux joueurs lisent la même
> phrase au même moment parce qu'elle est tirée d'une graine qu'ils possèdent déjà tous les
> deux.
>
> **De la famille en visite.** Certains résidents descendent accompagnés : une épouse, un
> frère, une grand-mère, un petit-fils, un cousin. Ce sont de nouveaux personnages, et ils ne
> coûtent rien : leur position est **dérivée** de celle de la personne qu'ils suivent, exactement
> comme Leo marche dans les pas de Carla depuis le zip 376. Zéro message, aucune collision à
> calculer, et l'impossibilité de traverser un mur puisqu'ils rejouent un chemin déjà validé.
> Les enfants sont dessinés à la même feuille de sprite, en plus petit.
>
> **La Maison Garfield ouvre — si Carla habite la vallée.** Elle n'était jusqu'ici qu'une
> visiteuse qui ne pouvait pas emménager, avec pour raison écrite qu'elle « a une boutique et
> une vie ailleurs ». Cette raison tombe : la boutique est ici, en Haute-Ville, à côté du
> tribunal, parce que les hauteurs sont les belles adresses et qu'une boutique chic au ras de
> la rue n'est qu'une échoppe de plus. Carla devient donc recrutable, et tant qu'elle n'a pas
> emménagé la porte le DIT au lieu de rester muette. Dedans : chapeaux, écharpes, tenues et
> couleurs, tout très cher, Carla qui juge et **Leo à la caisse qui approuve absolument tout**
> (« C'est une pièce unique. Nous en avons quatorze. »). Toute la tenue d'un joueur tient dans
> une chaîne de cinq caractères, qui voyage dans le paquet de position déjà émis.
>
> **Un salon de coiffure, volontairement inachevé, et qui le dit** : banderole en travers,
> vitrines passées au blanc d'Espagne, porte condamnée par une planche, échafaudage sur le
> pignon. L'enseigne et le mât de barbier sont déjà là. Il manque le coiffeur, et c'est
> assumé.
>
> **Et la gare de Valley Town cesse d'être le parent pauvre.** Depuis le zip 234, la ville
> peignait ses rails à la main — un ballast plat, une traverse une rangée sur deux — pendant
> que la ferme posait le vrai sprite de voie ferrée du zip 232. Deux dessins du même objet,
> dont un deux fois moins soigné, et rien pour le signaler tant qu'on ne comparait pas les
> deux écrans. La ville réutilise désormais les rails, le quai et le bâtiment de la ferme,
> tels quels : la cohérence est garantie par construction, pas par relecture.
>
> *Vérifié : `verify-vallee.mjs` passe de 88 à **113 contrôles, 113/113** — il a sorti tout
> seul les quatre-vingts cases bloquantes des trois nouveaux bâtiments avant qu'elles
> n'arrivent en jeu, et il refuse maintenant un endroit d'activité inatteignable ou un
> itinéraire d'escalier qui n'arrive nulle part. Le banc de rendu a montré un haut-de-forme
> décapité par le cadre du sprite et deux défauts de façade du salon. Deux défauts trouvés en
> jouant : l'ombre de la gare qui faisait une tache sur le quai clair, et cinq résidents qui
> se saluaient en boucle sur le quai sans jamais partir.*
> **Aucune migration Supabase.**


> **ZIP 426 — LE TRIBUNAL S'OUVRE (ET IL EST VIDE, ET IL LE DIT).**
>
> **Un intérieur complet, sur trois niveaux.** Le tribunal de Valley Town avait
> une façade et rien derrière. Il a maintenant dix-sept pièces : au
> rez-de-chaussée le hall à colonnes, la salle d'audience (estrade, barre, banc
> des jurés, bancs du public), la salle des témoins, le greffe, le vestiaire des
> robes et l'accueil ; à l'étage le cabinet du juge, la salle du jury, la
> bibliothèque, le cadastre, les permis, le notaire et l'état civil ; au sous-sol
> les archives, les scellés, trois cellules à grilles, les objets trouvés et la
> chaufferie.
>
> **Le plan a été déduit des USAGES, pas l'inverse.** Chaque bureau répond à une
> mécanique qui existe déjà et qui n'a nulle part où se faire : les parcelles de
> Valley Town affichent « à vendre » depuis le zip 234 sans qu'on puisse en
> acheter une (→ le cadastre), la ferme ne sait construire que par l'argent
> (→ les permis), deux joueurs ne peuvent pas s'échanger quoi que ce soit
> (→ le notaire), on perd des objets sans jamais les retrouver (→ les objets
> trouvés). **Rien de tout cela ne fonctionne encore, et le jeu le dit** : une
> plaque sur chaque porte, une description et un « bientôt opérationnel » à la
> touche E, et un panneau d'affichage dans le hall qui récapitule les dix
> services à venir avec leur étage. Un bâtiment muet passe pour cassé ; un
> bâtiment qui annonce sa suite est une promesse.
>
> **Trois étages, aucune coordonnée d'étage.** Les niveaux sont empilés dans la
> même grille et l'étage se DÉDUIT du `y` — exactement comme l'altitude de la
> ville se lit sous les pieds du joueur depuis le 425. Conséquence gratuite :
> deux joueurs se voient au bon étage sans qu'un seul octet de plus ne circule.
>
> **La ville s'agrandit une seconde fois : 192×144 → 224×168.** Et elle
> s'agrandit AVEC de quoi la remplir, parce que le 425 avait montré ce que coûte
> l'inverse. Au sud : une cinquième avenue, une rangée de parcelles, un lac avec
> sa promenade et son ponton. À l'est : une quatrième artère et le quartier des
> artisans. Au centre : le champ de foire enfin garni (dix étals, un puits), un
> cimetière derrière l'église, un kiosque à musique dans le parc, des jardinières
> sur la place, des panneaux aux carrefours, des statues en Haute-Ville. Vingt
> parcelles deviennent vingt-sept.
>
> **La carte n'est plus un écran noir en ville.** Le défaut n'était pas dans son
> dessin : `drawFullMap` n'était tout simplement JAMAIS APPELÉE depuis que la
> ville a sa propre boucle de rendu. Elle affiche désormais la ville avec ses
> onze repères nommés et son relief, et le PLAN du tribunal étage par étage
> (pièces, portes, escaliers, seuil).
>
> **Et un banc de contrôle qui n'existait pas.** Le contexte affirmait depuis le
> 425 que `tools/verify-vallee.mjs` tournait avec 74 contrôles ; le fichier
> n'existait pas. Il existe maintenant (75 contrôles, 75/75), il importe le vrai
> moteur et PARCOURT la ville comme un joueur. Il a trouvé six défauts que
> personne ne pouvait voir à la relecture : un lampadaire planté au milieu de la
> nouvelle artère, six pièces du tribunal murées par les colonnes du couloir, un
> escalier qui montait dans un mur, une porte de cellules ouvrant sur une
> cloison, deux cases prises au piège entre deux armoires, et un banc traversable
> posé sur le ponton. Tous corrigés — aucun n'aurait levé la moindre erreur.
>
> **Et on coupe enfin du bois en ville.** Quatre décisions prises explicitement :
> la coupe est PARTAGÉE et SAUVEGARDÉE (l'hôte arbitre, ça survit à la session),
> tous les arbres sont coupables, ça REPOUSSE au bout de deux jours de jeu, et
> seule la HACHE est réactivée en ville — houe, arrosoir et pioche restent
> inertes, parce qu'il n'y a rien à labourer sur du pavé. Même coût d'énergie,
> même rendement et même quête « chop » qu'à la ferme : un second équilibrage
> aurait juste créé des allers-retours en train. ⚠️ La carte de la ville n'est
> JAMAIS mutée — elle est partagée par tous les remontages de l'onglet, et y
> écrire ferait arriver déboisée la prochaine ferme chargée dans le même onglet.
>
> **Et un dernier défaut, trouvé en jouant** : le verrou anti-répétition des
> actions n'était décrémenté que dans la boucle de la FERME. En ville, le premier
> coup de hache le bloquait pour toujours — un seul coup par visite, sans le
> moindre message. Même famille que la carte restée noire : une zone qui gagne sa
> propre boucle hérite de tout ce que la boucle commune faisait pour elle.
>
> ⚠️ **Aucune manipulation Supabase n'est nécessaire** : Valley Town et le
> tribunal sont regénérés à graine fixe et ne sont jamais persistés ; les arbres
> coupés voyagent dans le JSON de `ferme_saves` qui existe déjà.

> **ZIP 422 — LA GRANDE DESCENTE SORT DE LA BÊTA, ET LE COUPABLE ÉTAIT LA
> CHAÎNE COLORIMÉTRIQUE.**
>
> **Le Gourmandin d'abord, parce que c'était une ligne.** Depuis le 411,
> l'approche du monstre du lac arme un fondu enchaîné puis appelle
> `openCandyGame()` **à mi-fondu** — or la garde de cette fonction refusait
> d'ouvrir quand une transition est active. L'appelant était devenu sa propre
> cause de refus : le fondu jouait en entier, et rien ne s'ouvrait. Le défi de
> fuite n'avait pas le problème parce qu'il n'est jamais ouvert à mi-fondu ; le
> Gourmandin est le seul, et c'est aussi la seule destination du fondu qui ne
> change pas de zone.
>
> **Et maintenant le gros morceau.** `public/candyluge/` rendait **en espace
> gamma** : three.js multipliait des octets déjà encodés par un facteur
> d'éclairage, ce qui n'a aucun sens physique. Trois conséquences, toutes
> visibles sur les planches du 421 et aucune attribuable à une couleur en
> particulier — d'où quatre zips passés à régler des teintes sans jamais
> attraper la cause :
>
> * aucune haute lumière ne pouvait exister (tout sature à 1,0 d'un coup) ;
> * deux lumières qui se croisent donnaient une valeur trop claire ;
> * les dégradés d'ombre viraient au sale.
>
> Le 422 remet la chaîne à l'endroit : couleurs converties en linéaire à la
> création, éclairage en linéaire **sans plafond**, tone mapping **ACES
> Filmic**, encodage sRGB en sortie. ⚠️ **Les quatre étapes ne sont correctes
> qu'ensemble** — à trois sur quatre l'image est soit délavée soit noire, et les
> deux ressemblent assez à « un réglage de couleur à retoucher » pour qu'on
> perde une journée à chercher ailleurs.
>
> **Le résultat est chiffré, méthode du 421 (réduction à 480×270).** Moyenne sur
> cinq planches, contre la référence de Guillaume :
>
> | | référence | 421 | 422 |
> |---|---|---|---|
> | L global | 180,6 | 177,9 | **174,4** |
> | **écart-type de L** | **47,7** | **28,4** | **36,5** |
> | saturation moyenne | 27,8 % | 22,1 % | **26,3 %** |
> | pixels > L230 | 7,7 % | 5,2 % | **10,1 %** |
> | pixels < L60 | 2,1 % | **0,0 %** | 0,3 % |
>
> **La ligne qui explique tout est la deuxième.** Au 421, la luminosité MOYENNE
> était déjà juste — et l'image était fausse : **écart-type moitié moindre, et
> pas un seul pixel sous L60**. Une image sans aucun noir n'a pas d'ombre, donc
> pas de volume, quelle que soit la qualité de son éclairage. C'est la leçon du
> 421 sous une autre forme : là-bas le jeu n'était pas trop sombre, il était
> sombre **à l'envers** ; ici il n'est pas trop clair, il est **plat**.
> ⚠️ On ne corrige pas ça en baissant l'exposition — on obtient la même image en
> plus sombre, écart-type inchangé. Il faut un **écart**, pas un décalage.
> ⚠️ Et l'écart-type reste **sous** la référence : voir « ce qui n'y est pas ».
>
> **Ce que le zip a fait, dans l'ordre du chantier :**
>
> 1. **Matériaux PBR et lumière** — `MeshLambertMaterial` → `MeshStandard` /
>    `MeshPhysical` partout, rugosité par famille, vernis (`clearcoat`) sur les
>    bonbons et le sucre d'orge, patins à demi métalliques. ⚠️ **Un PBR sans
>    environnement est une RÉGRESSION** : une surface vernie sans ciel à
>    réfléchir réfléchit du noir. `buildEnvironment()` fabrique donc un
>    environnement PMREM **à partir de la texture de ciel déjà peinte** — zéro
>    fichier, et il reste d'accord avec le ciel par construction.
>    Le contre-jour froid est passé de *sous* l'horizon à *derrière* : depuis
>    qu'il y a de vraies ombres, un faux-jour venu d'en bas efface le contact au
>    sol, c'est-à-dire l'information que l'ombre porte.
> 2. **Ombres** — de vraies shadow maps, **et elles tiennent parce que le volume
>    d'ombre suit la luge**. Une carte couvrant les 900 unités de tirage donnerait
>    0,44 unité par texel ; une boîte de 92 unités recentrée sur la luge à chaque
>    image en donne 4,5 cm. C'est une cascade à un seul étage, et c'est le bon
>    nombre d'étages quand la caméra ne quitte jamais son sujet. ⚠️ Le centre est
>    **quantifié au texel**, sinon le bord des ombres chatoie dès qu'on accélère.
>    Les décalques du 416 **restent**, et se relaient avec la carte : éteints
>    dessous, seuls au-delà — chacun là où il est bon.
> 3. **Décors modelés** — dix accessoires refaits sous Blender, exportés en glTF.
>    ⚠️ **Aucune couleur n'est dans les binaires** : les maillages sont nommés
>    `part_<clé>` et `models.js` rebranche les matériaux du jeu. La palette reste
>    entièrement dans `config.js`, ce que la sensibilité aux couleurs du projet
>    (405-408) rendait non négociable. Le repli sur les primitives du 416 est
>    conservé et n'est pas du code mort.
> 4. **Post-traitement** — `EffectComposer` : bloom **à seuil haut** (0,92 : à
>    0,6 tout le champ de neige déborde et on obtient le voile laiteux qu'on
>    reconnaît partout), puis une passe unique qui enchaîne ACES, étalonnage
>    chaud/froid, contraste, vignette, grain et encodage sRGB. Une seule passe,
>    parce que quatre petits effets en quatre passes coûtent quatre fois la
>    bande passante d'un shader qui les enchaîne en registres.
> 5. **Particules** — taille **par grain**, ce que `PointsMaterial` ne sait pas
>    faire : il a fallu passer à un `ShaderMaterial`. Trois cents grains
>    identiques se lisent comme un motif, pas comme de la matière. La
>    distribution est biaisée vers le petit (`r³`) : beaucoup de poussière,
>    quelques mottes — et la taille des mottes suit la charge sur la carre.
> 6. **Atmosphère** — un vrai soleil dans la scène (une tache peinte dans la
>    texture de ciel est plafonnée à 1,0, donc elle ne peut pas rayonner), son
>    halo, et un plan de **poussières de sucre** tout près de l'objectif : le
>    cadre commençait à dix mètres.
> 7. **La luge** — remodelée, patins recourbés d'un seul tenant, tablier à
>    lattes, pilote assis aux volumes arrondis. ⚠️ **Le squelette du 417 est
>    intact** : pivot de lacet aux patins arrière, buste qui se penche. On a
>    remplacé la géométrie, pas la conduite.
>
> **Trois pièges valent d'être connus, parce qu'ils étaient tous MUETS :**
>
> | où | ce qui se passait | pourquoi invisible |
> |---|---|---|
> | `preview-luge.js` | le stub de matériau n'acceptait qu'un **nombre** comme couleur ; depuis `sc()` c'est un **objet** → tout le monde retombait sur blanc | l'image restait plausible : bien éclairée, bien ombrée, bien exposée — et entièrement blanche. On a d'abord accusé le tone mapping, puis la saturation, puis l'exposition |
> | `applySkin()` | `color.setHex()` écrasait la conversion linéaire | le fermier sortait délavé **et lui seul**, uniquement depuis la ferme, jamais en ouvrant la page nue |
> | la luge sous Blender | écrite en Y-up (repère du jeu) dans un logiciel Z-up | l'exporteur convertit **fidèlement** une orientation fausse : la luge sortait debout sur le nez, sans le moindre avertissement |
>
> **Ce qui n'y est pas, et il faut le dire :** le framerate **n'a pas été
> mesuré** — ce zip a été écrit sans navigateur, et un rasteriseur logiciel ne
> dit rien d'un GPU. On livre donc l'instrument et pas le résultat :
> `__lugePerf()` dans la console de l'iframe rend les images par seconde, le
> palier de qualité, les appels de dessin et les triangles réellement soumis.
> Un palier de qualité **automatique** (bloom coupé, puis ombres) est en place
> précisément parce que la mesure manque. Et l'écart-type de luminance reste à
> 36,5 contre 47,7 : il manque des **noirs**, que seuls des volumes plus
> contrastés au premier plan apporteront.
>
> `verify-luge.mjs` : **34/34**. La physique, la piste, les gourmands et les
> checkpoints n'ont pas été touchés.

> **ZIP 421 — LA COURSE OUVRE LE CHAPITRE, ET L'IMAGE ÉTAIT CINQUANTE ET UN
> POINTS TROP SOMBRE.**
>
> **Une décision écrite a été renversée, et elle est conservée dans le code.**
> `story.js` portait depuis le 418 : « ON OUVRE SUR LE PAYSAGE, PAS SUR LE
> PASSAGE ». Le chapitre 1 s'ouvre désormais sur la course. Le raisonnement
> d'origine tenait — et il tient toujours contre ce qu'il visait, qui était de
> montrer un tunnel et une arrivée. Ce n'est pas ce qu'on fait : on n'ouvre pas
> sur un événement passé qu'on illustre, on ouvre sur une action que le joueur
> **exécute**. La course ne montre rien de la vallée ; elle court dans un
> couloir d'arbres, et c'est l'**arrivée au bord de la falaise** qui déclenche
> le tableau. La plus belle image du jeu arrive maintenant comme une
> récompense au lieu d'un lever de rideau. Les trois répliques du seuil, qui
> parlaient d'un passage refermé, ont été réécrites — sans quoi le texte
> racontait une scène que le joueur venait de ne pas jouer.
>
> **Le vrai résultat du zip est chiffré.** Les références de Guillaume réduites
> à 480×270 et comparées bande par bande aux planches de `preview.mjs` :
>
> | | référence | jeu (419) | jeu (421) |
> |---|---|---|---|
> | L global | 135,2 | 84,1 | **117,0** |
> | bande y 0–45 | 106,9 | 37,7 | **79,2** |
> | haut gauche / centre / droite | 118 / 61 / 142 | 30 / 55 / 28 | **95 / 52 / 91** |
> | pixels sous L30 | 2,5 % | **21,8 %** | **1,9 %** |
>
> **La ligne qui compte est la troisième.** Le jeu n'était pas seulement trop
> sombre : il était sombre **au mauvais endroit**. La référence a les coins
> hauts clairs et le centre sombre — des arbres noyés de brume qui ferment le
> cadre, et un ciel dégagé pour l'aurore. Le jeu faisait exactement l'inverse.
> Aucune correction de couleur ne répare ça : **il manquait de la matière**,
> et le 420 avait déjà mesuré que monter le ciel d'un cran rendait +5,7 et
> doubler le halo d'aurore +0,1.
>
> **Trois trouvailles, dont deux n'étaient visibles que sur planche.**
> 1. *La canopée peinte à l'envers.* Deux planches perdues à densifier des
>    traits clairs sur un ciel noir — à 700 puis 1 900 troncs, on lisait de la
>    **pluie verticale**. Une forêt noyée n'est pas un fond sombre rayé de
>    clair : c'est un **champ clair** où les troncs creusent des vides. On pose
>    le lavis d'abord, les troncs ensuite. Tant qu'on peint la figure au lieu du
>    fond, aucune densité ne suffit.
> 2. *La vignette se battait contre la correction.* Elle assombrissait les
>    coins avec `sky0` — précisément les quatre zones qu'on venait de remplir.
>    0,46 → 0,22 : ce qui ferme les coins, désormais, c'est de la matière.
> 3. *Le noir est une ressource rare.* Les arbres de bord de route tiraient
>    vers `sil1`, la valeur des branches de **cadrage**. Quand le décor courant
>    utilise le noir du cadrage, le cadrage ne découpe plus rien.
>
> **Et un défaut que seul le banc d'essai pouvait trouver.** L'ouverture ne
> DESSINE pas les éclats de givre — on en avait conclu qu'ils n'existaient pas.
> Ils existaient, et on les **ramassait invisibles** : le compteur de fin de
> chapitre partait à trois ou quatre sans que rien n'apparaisse à l'écran.
> `verify-vallee.mjs` compte désormais 74 contrôles (+14), dont celui qui
> vérifie que **le personnage** — et pas la caméra, qui est 2,6 unités derrière
> lui — reste en deçà du bord.
>
> **La falaise a été recadrée sur la composition, pas sur la vraisemblance.**
> Arrêter le personnage « au bord » (3,7 unités) plaçait la lèvre aux quatre
> cinquièmes du cadre : trois bandes horizontales empilées, tenues deux
> secondes, pour le plan le plus important de l'ouverture. À 8 unités il
> s'arrête à une trentaine de mètres du vide — personne ne le remarque, tout le
> monde voit la différence de cadrage.
>
> **Fichiers touchés : sept, tous dans `public/crystal/`.** `config.js`,
> `flora.js` (nouveau `Flora.canopy`), `walk.js`, `story.js`, `game.js`,
> `tools/preview.mjs`, `tools/verify-vallee.mjs`. Aucun fichier Next.js, aucun
> composant, **aucune migration Supabase**.
>
> **⚠️ RESTE OUVERT :** le chapitre a maintenant **deux** segments jouables. Le
> second (`story.js`, beat `play id:"walk"`) est conservé en attendant de les
> voir tourner tous les deux. Le retirer retirerait aussi le seul endroit où
> l'on ramasse des éclats, donc `finalShards` et la jauge de Chant.
>
> **⚠️ NON PROPAGÉ :** `Flora.canopy` n'est appelée que par `walk.js`. Les neuf
> tableaux de `scenes.js` et `shots.js` ont le même défaut de coins hauts, et la
> même correction les attend — mais elle n'a pas été appliquée sans validation
> visuelle, et `seuil` (« presque noir », délibéré) comme `memoire` (le pivot,
> l'aurore doit y être seule) devront probablement en être exclus.

---

> **ZIP 419 — AUDIT REALTIME : UNE FUITE, DES MESSAGES JETÉS EN SILENCE, ET UN
> QUOTA PLUS SERRÉ QU'ON NE CROYAIT.**
> Guillaume, après la migration Supabase forcée par un dépassement à ~7 M
> messages/mois : « il faut être beaucoup plus vigilant sur tout ce qui touche
> au Realtime. Donner une estimation du volume pour vérifier qu'on reste très
> en dessous des 2 M/mois. »
>
> **On n'y est pas « très en dessous ». C'est le résultat principal de l'audit.**
> La règle de facturation Supabase explique tout, et elle n'est pas intuitive :
> un broadcast coûte **1 message pour l'envoi + 1 par client abonné**. À deux
> joueurs, un seul `send()` coûte donc 3 messages en `self:true`, 2 en
> `self:false` — ce qui valide rétroactivement le « FIX 243 : self:false
> (-33 % à 2j) », 3 → 2 exactement. **Corollaire à retenir : seul le NOMBRE de
> `send()` compte, jamais la taille des payloads.** Alléger un message sans en
> réduire le nombre ne rapporte rien.
>
> | | msg/heure | heures avant 2 M |
> |---|---|---|
> | ferme calme, 2 joueurs | ~43 000 | ~46 h |
> | **ferme peuplée, 2 joueurs** | **~101 000** | **~20 h** |
> | ferme peuplée, 3 joueurs | ~194 000 | ~10 h |
> | soirée de 10 mini-jeux tour par tour | ~10 000 au total | négligeable |
>
> **La ferme pèse ~99 % de la consommation. Tout le reste est du bruit.**
>
> **Une seule vraie fuite, et elle était structurelle.** Dans
> `app/room/[code]/page.js`, les deux abonnements `postgres_changes` étaient
> créés après cinq aller-retours réseau dans une IIFE `async`. Démontage pendant
> les `await` → le cleanup lisait des variables encore `undefined`, ne supprimait
> rien, et les canaux créés ensuite n'étaient **jamais fermés**. Systématique en
> dev sous StrictMode. Corrigé par un drapeau `cancelled` qui ferme les deux
> fenêtres de course. Pour le reste, le cycle de vie des canaux est sain : 24
> canaux, un `removeChannel` par `channel()`, dépendances d'effets stables, aucun
> `send()` dans un `requestAnimationFrame` ni un `pointermove`.
>
> **Le point le plus important n'est pas le quota.** `eventsPerSecond: 10` est un
> plafond CÔTÉ CLIENT : au-delà, `send()` ne transmet rien et résout
> silencieusement sur `"rate limited"`. Aucun des ~57 sites d'émission de
> `FermeGame.js` ne lisait ce retour. Or l'hôte **dépasse ce plafond en régime
> normal** — ~8,2 Hz de simulation permanente (visiteurs, loups, créatures, Greg,
> Soan, Harald) plus ~4 Hz de position. Un `residentPath` perdu = un PNJ figé
> chez l'invité, sans trace. **C'est très probablement la famille de bugs
> poursuivie des zips 359 à 365.** Le zip 419 ne la corrige pas : il la rend
> visible, par un `console.warn` automatique à chaque message jeté.
>
> **Supabase n'offre aucune alerte de seuil** — la doc est explicite, le Spend Cap
> « doesn't allow for [...] receiving notifications when certain costs are
> reached », et il est réservé au plan Pro. D'où `lib/realtimeQuota.js` et son
> badge : le seul avertissement automatique possible avant le mur.
>
> Trois gaspillages supprimés au passage. **`hostSend`** (51 appels) n'avait
> aucune garde d'audience : un hôte jouant seul émettait un message par action,
> facturé même sans destinataire. Nouvelle garde `netHasAudience()`, volontairement
> distincte de `netCanBroadcast()` — elle ne teste PAS `hiddenRef`, car couper la
> simulation décorative est gratuit mais couper l'état de jeu partagé
> désynchroniserait les invités. **La boucle `hello`** tournait à 1,2 s
> indéfiniment pendant que l'hôte saisissait son code, ~400 messages par
> démarrage : backoff jusqu'à 6 s, -78 %. **La pendule d'échecs** diffusait chaque
> seconde, ~3 600 messages par partie de 20 min : diffusion toutes les 10 s et
> interpolation locale sur tous les clients, l'hôte restant seul juge de la chute
> du drapeau. -90 %.
>
> **Ce qui n'a PAS été touché, sciemment** : l'instance cachée de la ferme
> (`display:none` quand l'hôte revient au salon) continue de simuler et de
> diffuser. Ce n'est pas un bug — les invités restés à la ferme en ont besoin —
> mais le compteur tourne pendant que l'hôte croit avoir quitté.

> **ZIP 408 — NUIT D'ENCRE, RELIEF REMONTÉ, NUAGES RETIRÉS.**
> Guillaume : « la palette de ciel et montagnes est encore trop lumineuse
> (surtout à cause de la réduction de la taille des montagnes opérée quelques
> zips auparavant…), cela rend le jeu moins effrayant. »
>
> **Sa cause est la bonne, et j'en avais ajouté une seconde au 406 sans la
> voir.** Tant que les montagnes montaient hors cadre, elles MASQUAIENT le
> ciel : la palette pouvait être ce qu'elle voulait, on ne la voyait pas. En
> les rentrant dans le cadre (406) on a exposé 40 % de ciel qui n'avait jamais
> été jugé. Et en redistribuant le dégradé de fond — `mid` à 42 % au lieu de
> 86 % — j'avais fait glisser toute la lanière visible vers `horizon`, la
> teinte la plus chaude de la palette. **Deux causes, et la seconde est de
> moi.**
>
> | | avant | après |
> |---|---|---|
> | zénith / corps / horizon | 0x0e0818 · 0x1a1029 · 0x2b1526 | **0x070410 · 0x0d0817 · 0x150a14** |
> | rougeoiement bas | 0,42 → 0,62 d'alpha sur 34 px | **0,12 → 0,18 sur 20 px** |
> | répartition du dégradé | `mid` à 42 % | **76 %** |
> | chaîne lointaine | 20-38 px | **28-50 px** |
> | chaîne proche | 16-34 px | **22-44 px**, et **0x030207** (elle était 0x0c0a15) |
> | nuages | 26 | **0** |
>
> **Et il a fallu une seconde passe, trouvée en regardant.** Une fois le ciel
> noirci, la chaîne LOINTAINE — inchangée depuis le 379 — composait plus CLAIR
> que le fond : des triangles **pâles** sur du noir, c'est-à-dire très
> exactement le mot que Guillaume employait aux 383, 400 et 405, retrouvé par
> l'autre bout. **Une teinte n'est jamais claire ou sombre en soi : elle l'est
> par rapport à ce qu'il y a derrière.** En noircissant un ciel, il faut
> noircir ce qui s'y découpe.
>
> Les nuages sont éteints par un compte (`SKY_CLOUD_COUNT: 0`) et non
> supprimés : **la boucle tourne encore à vide**, parce que ses tirages
> appartiennent au flux aléatoire partagé du ciel et qu'en retirer un
> décalerait les montagnes. C'est la règle du 381, appliquée à l'envers.

> **ZIP 407 — LA PLUIE, REFAITE EN ENTIER SUR QUATRE REPROCHES.**
> Guillaume, après le 406 : « la pluie n'est pas satisfaisante. la réduire en
> intensité — et elle ne disparaît pas comme convenu ?? on a dit disparition
> progressive à partir de 3000 m. et son étendue ne couvre pas tout l'écran ;
> et le sens du vent que son orientation oblique évoque est incohérent, car
> lorsqu'on tourne, les gouttes tombent toujours direction NO-SE. »
>
> **Quatre reproches, quatre causes, et trois d'entre elles sont des nombres
> posés à la main là où il fallait un calcul.**
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | trop intense | 0,55 d'opacité en additif sur trois nappes superposées | **0,18 — un crachin.** Mais **32 u/s de chute** au lieu d'un coefficient de défilement sans unité : une goutte pâle et LENTE se lit comme du bruit d'image, une goutte pâle et RAPIDE se lit comme de la pluie |
> | « elle ne disparaît pas à 3 000 » | la décrue commençait à **3 500** — sa demande d'origine disait 3 000 | pleine de 2 200 à **3 000**, éteinte à **5 000** |
> | « son étendue ne couvre pas tout l'écran » | les nappes étaient posées à `camera.y + 1,6`, hauteur au jugé, avec des tailles au jugé. **Il manquait 6,3° de pluie en bas pour la nappe proche, 12,4° pour la médiane, 14,9° pour la lointaine** — tout le quart bas de l'image, celui où se trouve la chaussée | tailles et hauteur **DÉDUITES du tronc de vue** : 2,0° de marge en bas, 3,1° sur les côtés |
> | « le vent tourne avec moi » | l'obliquité était peinte dans la TEXTURE et la nappe faisait face à la caméra : l'inclinaison était donc fixe à l'ÉCRAN | traînées verticales, plus de dérive latérale, et la nappe ne pivote plus qu'en **lacet** — elle basculait aussi en tangage, ce qui faisait tomber les gouttes 17,3° de travers |
>
> **Sa réponse était encore hors options, et encore meilleure.** Aux trois
> intensités proposées il a répondu « **un crachin, mais la vitesse de chute
> doit être bien plus rapide** ». Ce n'est pas l'opacité qui dit « il pleut »,
> c'est la vitesse — et aucune des trois options ne le voyait.
>
> **`verify-ambiance.mjs` passe de 19 à 31 contrôles, dont 12 échouaient sur le
> 406.** Il refait la projection de la caméra pour vérifier que chaque nappe
> couvre le cadre, y compris le bas.

> **ZIP 406 — LE CIEL TIENT ENFIN DANS LE CADRE, ET LA PLUIE TOMBE DANS LE BON SENS.**
> Quatre chantiers sur le défi de fuite, et **le premier durait depuis trois zips
> parce qu'on cherchait au mauvais endroit.**
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | « les triangles lumineux ne sont pas beaux » | pas la couleur (383), pas l'ordre de peinture (400) : **la TAILLE**. Les montagnes montaient à 132 px quand le joueur n'en voit que 64 — leurs sommets étaient hors cadre et il ne restait à l'écran que les V entre les versants | des montagnes ENTIÈRES, 4 à 5 par écran, 37 % de ciel libre au-dessus |
> | *(même reproche)* | une seule montagne pouvait faire 300 px de large pour 297 px de champ visible : **un versant plein écran** | largeurs divisées par deux |
> | « une luminosité évoquée par dégradé » | la bande chaude était un APLAT, et un aplat a un bord, et un bord dessine une forme | un dégradé qui part de zéro d'opacité : plus de bord, donc plus rien à dessiner |
> | « les rambardes… trop plates, pas d'aspérités » | une SEULE boîte par intervalle, texture de 32 px | des pierres qui dépassent, un couronnement dentelé, une texture de 64 px à trois assises |
> | « la pluie tombe à l'envers » | un signe de trop sur `offset.y` | elle tombe — et elle s'éteint de 3 500 à 6 000 m |
> | « les bras s'articulent à l'envers » | **le piège du 396 n'avait jamais été appliqué ici** : les trois coudes étaient négatifs, comme des genoux | coude positif, genou négatif, contrôlés sur toute la foulée |
>
> **Deux outils étaient morts, et c'est la découverte du zip.**
> `preview-sky.js` — celui-là même qui avait trouvé le triangle orange au 400 —
> **jetait depuis le zip 400** : la pluie ajoutée ce jour-là clone sa texture, et
> son faux Three.js n'avait pas `clone()`. L'outil qui voit les défauts du ciel
> est mort le jour où il a servi, et personne ne l'a relancé pendant cinq zips.
> Et une fois réparé, il **mentait sur les largeurs** : il découpait la lanière
> visible en hauteur mais étalait les 1024 colonnes de la texture sur toute la
> planche, soit un écrasement de sept fois. La leçon du 400 — « une planche à
> plat peut mentir sur un cadrage » — s'appliquait à l'outil qui l'avait énoncée.
>
> **Deux outils neufs :** `verify-ambiance.mjs` (19 contrôles, **15 échouaient
> sur le 405**) et `verify-pose.mjs` (8 contrôles, **5 échouaient**).
>
> **Le budget d'objets a refusé la première rambarde** — 255 pour un plafond de
> 200 — et il avait raison : c'est la section où la partie commence. On n'a pas
> relâché le plafond, on a payé : un bloc de rambarde neuve en couvre désormais
> deux, ce qui est invisible à l'écran puisqu'elle est continue, et les volumes
> ainsi libérés financent les pierres saillantes. **195 avant le zip, 199 après.**

> **ZIP 405 — LE DÉCOR CESSE DE MENTIR, ET LE COMBAT CESSE DE SE FIGER.**
> Quatre défauts signalés par Guillaume en jouant au labyrinthe, et **cinq
> causes** — deux d'entre elles se cachaient derrière le même symptôme.
>
> | ce qu'il a vu | la cause | après |
> |---|---|---|
> | « je suis mort en tombant dans le lac alors que je ne suis pas allé dans la crevasse » | le trou **dessiné** faisait 3 à 5 unités, le trou **qui tue** faisait la cellule entière (11,5) | une seule description, lue par le dessin ET par le moteur |
> | *(même symptôme, autre cause)* | une dalle effondrée **restait dessinée pour toujours** — `buildFloor` était appelé sans qu'on garde son résultat | elle tremble, elle tombe, elle disparaît, un fût violet la remplace |
> | « leurs déplacements sont absurdes pendant le combat » | `pathTo` rend `[]` quand la créature est dans VOTRE case : elle **se figeait**. Mesuré : **0,000 unité en 2 secondes** | elle marche droit sur vous dès qu'aucun mur ne s'interpose |
> | « ils finissent par gagner ou despawn sans vraiment mourir » | joueur injoignable → chemin `null` → `\|\| []` → statue définitive | elle rentre chez elle, ce qui se voit |
> | « des interstices où l'on voit le lac » | pourtour en **44**-gone contre gradins en **40**-gones, et 40 cm de sol manquants **aux quatre portes** | un seul pas de découpe (64), et le pourtour couvre les seuils |
> | « au centre on s'enfonce un peu dans le sol » | les 3 gradins étaient des cylindres **pleins** : le premier masquait les deux autres. On marchait **2,34 unités sous le sol visible** | des anneaux et des contremarches ouvertes — **0/2 688 points** hors tolérance |
> | « l'arbalète doit tirer à distance et one shot les monstres » | l'assistance à la visée n'avait jamais été branchée sur le tir, et la portée (86,8) tenait à 1,8 unité de la portée de vue (85) | elle vise comme l'épée, elle porte à 105, et **elle seule** peut abattre le traqueur |
>
> **Décision de Guillaume au 405 : le traqueur devient tuable, en plusieurs
> carreaux.** L'épée le repousse toujours sans l'entamer. C'est la première fois
> depuis le 393 que les deux armes disent deux choses différentes.
>
> **Deux outils neufs, et les deux ont trouvé plus que ce qu'on leur demandait :**
> `verify-crevasse.mjs` (17 contrôles — **13 échouaient sur le 404**) et
> `verify-rotonde.mjs` (7 contrôles — **6 échouaient**, dont 792 points de
> mesure sur 1 520). Plus `preview-rotonde.mjs`, qui DESSINE la coupe de la
> salle : c'est lui qui a trouvé le troisième défaut de la rotonde, celui que
> personne n'avait signalé.
>
> **Équilibrage : 72,0 % de sortie sur 100 parties** (73,3 % sur 120 au 404).
> Les chutes passent de **12,5 % à 9,0 %** des fins de partie, et les créatures
> tuent enfin — elles ne le faisaient jamais, puisqu'elles se figeaient.

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
