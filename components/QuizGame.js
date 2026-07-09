"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
import Crossfade from "./Crossfade";

const QUESTIONS_FR = {
  easy: [
    ["Combien y a-t-il de continents sur Terre ?", "7", "5", "6", "8"],
    ["Quel est l'animal terrestre le plus rapide ?", "Le guépard", "Le lion", "Le cheval", "L'autruche"],
    ["Combien de jours compte une année bissextile ?", "366", "365", "364", "367"],
    ["Dans quel pays se trouve la tour Eiffel ?", "La France", "La Belgique", "L'Italie", "L'Espagne"],
    ["Quelle est la plus grande planète du système solaire ?", "Jupiter", "Saturne", "Neptune", "Uranus"],
    ["Combien de couleurs compte un arc-en-ciel, traditionnellement ?", "7", "5", "6", "8"],
    ["Quel est le plus grand désert froid du monde ?", "L'Antarctique", "Le Sahara", "Le Gobi", "L'Arctique"],
    ["Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?", "11", "10", "9", "12"],
    ["Quelle est la capitale de l'Espagne ?", "Madrid", "Barcelone", "Séville", "Valence"],
    ["Quel fruit jaune, souvent associé aux singes, se pèle avant d'être mangé ?", "La banane", "La mangue", "L'ananas", "La papaye"],
    ["Combien de pattes possède un insecte ?", "6", "8", "4", "10"],
    ["Quel est le plus long fleuve d'Afrique ?", "Le Nil", "Le Congo", "Le Niger", "Le Zambèze"],
    ["Quelle mer borde Nice et Marseille ?", "La Méditerranée", "L'Atlantique", "La mer du Nord", "La mer Rouge"],
    ["Combien de temps dure un match de football en temps réglementaire ?", "90 minutes", "60 minutes", "120 minutes", "45 minutes"],
    ["Quel est le symbole chimique de l'eau ?", "H2O", "CO2", "O2", "NaCl"],
    ["Quelle BD met en scène un village gaulois qui résiste aux Romains ?", "Astérix", "Tintin", "Lucky Luke", "Spirou"],
    ["Quelle est la capitale de l'Italie ?", "Rome", "Milan", "Venise", "Naples"],
    ["Combien de côtés a un hexagone ?", "6", "5", "7", "8"],
    ["Quel organe pompe le sang dans tout le corps ?", "Le cœur", "Le foie", "Le poumon", "Le rein"],
    ["Quelle couleur obtient-on en mélangeant du bleu et du jaune ?", "Le vert", "L'orange", "Le violet", "Le marron"],
    ["Combien de minutes y a-t-il dans une heure ?", "60", "100", "50", "30"],
    ["Quel est le plus grand océan du monde ?", "Le Pacifique", "L'Atlantique", "L'Indien", "L'Arctique"],
    ["Quel animal est surnommé le roi de la jungle ?", "Le lion", "Le tigre", "L'éléphant", "Le gorille"],
    ["Quelle est la capitale du Japon ?", "Tokyo", "Osaka", "Kyoto", "Hiroshima"],
    ["Quel est le plus grand mammifère du monde ?", "La baleine bleue", "L'éléphant", "La girafe", "Le rhinocéros"],
    ["Combien de doigts avons-nous sur une main ?", "5", "4", "6", "10"],
    ["Quelle planète est surnommée la planète rouge ?", "Mars", "Vénus", "Jupiter", "Mercure"],
    ["Quel est l'ingrédient principal du pain ?", "La farine", "Le sucre", "Le sel", "Le beurre"],
    ["Combien de jours compte février une année normale ?", "28", "29", "30", "31"],
    ["Quel est le plus petit pays du monde ?", "Le Vatican", "Monaco", "Saint-Marin", "Le Liechtenstein"],
    ["Quelle langue a le plus de locuteurs natifs dans le monde ?", "Le mandarin", "L'anglais", "L'espagnol", "L'hindi"],
    ["Quel instrument de musique possède 88 touches ?", "Le piano", "La guitare", "Le violon", "La harpe"],
    ["Quelle est la capitale de l'Allemagne ?", "Berlin", "Munich", "Francfort", "Hambourg"],
    ["Combien de temps met la Terre pour faire un tour sur elle-même ?", "24 heures", "12 heures", "365 jours", "1 heure"],
    ["Quel est le sport traditionnel emblématique du Japon ?", "Le sumo", "Le judo", "Le karaté", "Le baseball"],
    ["Quelle est la plus haute montagne du monde ?", "L'Everest", "Le Kilimandjaro", "Le Mont Blanc", "Le K2"],
    ["Quel légume fait pleurer quand on le coupe ?", "L'oignon", "La carotte", "La pomme de terre", "Le poireau"],
    ["Combien de cordes possède une guitare classique ?", "6", "4", "8", "5"],
    ["Quelle est la capitale du Canada ?", "Ottawa", "Toronto", "Montréal", "Vancouver"],
    ["Quel animal est surnommé le meilleur ami de l'homme ?", "Le chien", "Le chat", "Le cheval", "L'oiseau"],
    ["Quelle forme géométrique a exactement 3 côtés ?", "Le triangle", "Le carré", "Le cercle", "Le rectangle"],
    ["Quel est le plus grand pays du monde par sa superficie ?", "La Russie", "Le Canada", "La Chine", "Les États-Unis"],
    ["Quelle est la capitale de la Russie ?", "Moscou", "Saint-Pétersbourg", "Novossibirsk", "Kiev"],
    ["Quel liquide vital circule dans nos veines ?", "Le sang", "L'eau", "La lymphe", "Le plasma"],
    ["Combien de zéros compte le nombre un million ?", "6", "5", "7", "9"],
    ["Quel instrument sert à mesurer la température ?", "Le thermomètre", "Le baromètre", "L'altimètre", "Le sismographe"],
    ["Quelle saison suit l'hiver ?", "Le printemps", "L'été", "L'automne", "L'hiver"],
    ["Quel est le plus grand désert chaud du monde ?", "Le Sahara", "Le Gobi", "Le Kalahari", "Le désert d'Arabie"],
    ["Quelle partie du corps sert à sentir les odeurs ?", "Le nez", "La bouche", "Les oreilles", "Les yeux"],
    ["Quelle est la capitale du Portugal ?", "Lisbonne", "Porto", "Faro", "Coimbra"],
    ["Quel est le nom du satellite naturel de la Terre ?", "La Lune", "Mars", "Le Soleil", "Vénus"],
    ["Quel est le plus grand lac d'Afrique ?", "Le lac Victoria", "Le lac Tanganyika", "Le lac Malawi", "Le lac Tchad"],
    ["Quel volcan a détruit Pompéi en l'an 79 ?", "Le Vésuve", "L'Etna", "Le Stromboli", "Le Vulcano"],
    ["Quelle est la capitale de la Suisse ?", "Berne", "Zurich", "Genève", "Lausanne"],
    ["Quel grand lac sépare la France et la Suisse ?", "Le lac Léman", "Le lac d'Annecy", "Le lac du Bourget", "Le lac de Constance"],
    ["Dans quel pays se trouve le volcan Etna ?", "L'Italie", "La Grèce", "L'Espagne", "Le Portugal"],
    ["Quelle est la capitale de l'Autriche ?", "Vienne", "Salzbourg", "Innsbruck", "Graz"],
    ["Quel est le plus long fleuve entièrement situé en France ?", "La Loire", "La Seine", "Le Rhône", "La Garonne"],
    ["Quelle est la capitale du Maroc ?", "Rabat", "Casablanca", "Marrakech", "Fès"],
    ["Quelle mer fermée est en réalité le plus grand lac du monde ?", "La mer Caspienne", "La mer Morte", "La mer d'Aral", "La mer Noire"],
  ],
  medium: [
    ["Quel pays a la forme d'une botte sur la carte de l'Europe ?", "L'Italie", "La Grèce", "Le Portugal", "La Croatie"],
    ["Environ combien de temps met la lumière du Soleil pour atteindre la Terre ?", "8 minutes", "1 minute", "1 heure", "8 secondes"],
    ["Qui a écrit « Les Misérables » ?", "Victor Hugo", "Émile Zola", "Alexandre Dumas", "Gustave Flaubert"],
    ["Quelle est la capitale du Brésil ?", "Brasilia", "Rio de Janeiro", "São Paulo", "Salvador"],
    ["En quelle année le mur de Berlin est-il tombé ?", "1989", "1991", "1985", "1993"],
    ["Quel est le plus grand organe du corps humain ?", "La peau", "Le foie", "Le cœur", "Le cerveau"],
    ["Quel peintre a réalisé « La Nuit étoilée » ?", "Van Gogh", "Monet", "Picasso", "Renoir"],
    ["Quelle est la monnaie officielle du Royaume-Uni ?", "La livre sterling", "L'euro", "Le dollar", "Le franc"],
    ["Combien d'anneaux compte le drapeau olympique ?", "5", "4", "6", "7"],
    ["Quel est l'océan le plus profond ?", "Le Pacifique", "L'Atlantique", "L'Indien", "L'Arctique"],
    ["Comment appelle-t-on le processus par lequel les plantes produisent de l'énergie grâce à la lumière ?", "La photosynthèse", "La respiration", "La fermentation", "La transpiration"],
    ["Quel pays est le berceau du tango ?", "L'Argentine", "Le Brésil", "L'Espagne", "Le Mexique"],
    ["Environ combien de temps met la Lune pour faire le tour de la Terre ?", "27 jours", "7 jours", "100 jours", "365 jours"],
    ["Quel écrivain britannique a créé Sherlock Holmes ?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Oscar Wilde"],
    ["Quelle est la langue officielle du Brésil ?", "Le portugais", "L'espagnol", "Le français", "L'italien"],
    ["Quel grand compositeur est devenu sourd à la fin de sa vie ?", "Beethoven", "Mozart", "Bach", "Chopin"],
    ["Qui a peint la Joconde ?", "Léonard de Vinci", "Michel-Ange", "Raphaël", "Botticelli"],
    ["Quelle est la capitale de l'Australie ?", "Canberra", "Sydney", "Melbourne", "Perth"],
    ["En quelle année a éclaté la Révolution française ?", "1789", "1799", "1804", "1776"],
    ["Quelle est la capitale de l'Égypte ?", "Le Caire", "Alexandrie", "Louxor", "Gizeh"],
    ["Qui a écrit « Roméo et Juliette » ?", "Shakespeare", "Molière", "Victor Hugo", "Racine"],
    ["Quel pays a offert la statue de la Liberté aux États-Unis ?", "La France", "Le Royaume-Uni", "L'Espagne", "L'Italie"],
    ["Quelle est la monnaie officielle du Japon ?", "Le yen", "Le won", "Le yuan", "Le ringgit"],
    ["Environ combien de temps met la Terre pour faire le tour du Soleil ?", "365 jours", "30 jours", "100 jours", "24 heures"],
    ["Quel est le plus grand pays d'Amérique du Sud ?", "Le Brésil", "L'Argentine", "La Colombie", "Le Pérou"],
    ["Qui a découvert la pénicilline ?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Robert Koch"],
    ["Quelle est la capitale de la Grèce ?", "Athènes", "Thessalonique", "Sparte", "Corinthe"],
    ["Combien de dents un adulte possède-t-il en général ?", "32", "28", "36", "24"],
    ["Quel courant artistique est associé à Salvador Dalí ?", "Le surréalisme", "Le cubisme", "L'impressionnisme", "Le fauvisme"],
    ["Quelle est la plus grande île du monde ?", "Le Groenland", "Madagascar", "Bornéo", "L'Islande"],
    ["Quel compositeur autrichien a écrit plus de 600 œuvres avant de mourir à 35 ans ?", "Mozart", "Beethoven", "Haydn", "Schubert"],
    ["Quelle est la capitale de la Corée du Sud ?", "Séoul", "Busan", "Incheon", "Daegu"],
    ["Quel est le plus haut sommet des Alpes ?", "Le Mont Blanc", "Le Cervin", "Le Mont Rose", "Le Grand Paradis"],
    ["Qui a écrit le roman « 1984 » ?", "George Orwell", "Aldous Huxley", "Ray Bradbury", "H.G. Wells"],
    ["Quelle est la capitale de la Chine ?", "Pékin", "Shanghai", "Hong Kong", "Canton"],
    ["Quel est le plus grand lac d'eau douce du monde en volume ?", "Le lac Baïkal", "Le lac Supérieur", "Le lac Victoria", "Le lac Tanganyika"],
    ["Quelle guerre a opposé le Nord et le Sud des États-Unis ?", "La guerre de Sécession", "La guerre d'indépendance", "La guerre hispano-américaine", "La guerre de 1812"],
    ["Quel est le symbole chimique de l'or ?", "Au", "Ag", "Fe", "Pb"],
    ["Quelle est la capitale des Pays-Bas ?", "Amsterdam", "Rotterdam", "La Haye", "Utrecht"],
    ["Qui a peint « Guernica » ?", "Pablo Picasso", "Salvador Dalí", "Joan Miró", "Diego Rivera"],
    ["Combien de temps dure une grossesse humaine en moyenne ?", "9 mois", "7 mois", "10 mois", "12 mois"],
    ["Quelle est la capitale de la Turquie ?", "Ankara", "Istanbul", "Izmir", "Antalya"],
    ["Quel physicien a formulé la théorie de la relativité ?", "Albert Einstein", "Isaac Newton", "Niels Bohr", "Stephen Hawking"],
    ["Quel est le plus petit os du corps humain ?", "L'étrier", "Le fémur", "La rotule", "Le tibia"],
    ["Quelle expédition a atteint le pôle Sud en premier, en 1911 ?", "Celle de Roald Amundsen", "Celle de Robert Scott", "Celle d'Ernest Shackleton", "Celle de James Cook"],
    ["Quel est le pays le plus peuplé du monde aujourd'hui ?", "L'Inde", "La Chine", "Les États-Unis", "L'Indonésie"],
    ["Quelle est la capitale de la Suède ?", "Stockholm", "Oslo", "Copenhague", "Helsinki"],
    ["Qui a mis au point la première ampoule électrique commercialement viable ?", "Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Benjamin Franklin"],
    ["Quel est le plus grand récif corallien du monde ?", "La Grande Barrière de corail", "Le récif de Belize", "Le triangle de corail", "La barrière de Floride"],
    ["Quelle est la capitale du Kenya ?", "Nairobi", "Mombasa", "Kisumu", "Nakuru"],
    ["Quel lac navigable est le plus haut du monde, entre le Pérou et la Bolivie ?", "Le lac Titicaca", "Le lac Poopó", "Le lac Atitlán", "Le lac de Junín"],
    ["Quel volcan est le point culminant du Japon ?", "Le mont Fuji", "Le mont Aso", "Le Sakurajima", "Le mont Ontake"],
    ["Quelle est la capitale de la Nouvelle-Zélande ?", "Wellington", "Auckland", "Christchurch", "Hamilton"],
    ["Quel volcan islandais a paralysé le trafic aérien européen en 2010 ?", "L'Eyjafjallajökull", "L'Hekla", "Le Katla", "Le Grímsvötn"],
    ["Quel lac très salé, entre Israël et la Jordanie, est le point émergé le plus bas du globe ?", "La mer Morte", "Le lac de Tibériade", "La mer Caspienne", "Le grand lac Salé"],
    ["Quel est le plus grand lac d'Amérique du Nord ?", "Le lac Supérieur", "Le lac Michigan", "Le lac Huron", "Le Grand lac de l'Ours"],
    ["Quelle est la capitale de la Colombie ?", "Bogota", "Medellín", "Cali", "Carthagène"],
    ["Quel volcan de l'État de Washington est entré en éruption de façon spectaculaire en 1980 ?", "Le mont Saint Helens", "Le mont Rainier", "Le mont Hood", "Le mont Shasta"],
    ["Quelle ville est la capitale administrative de l'Afrique du Sud, siège du gouvernement ?", "Pretoria", "Le Cap", "Johannesburg", "Durban"],
  ],
  hard: [
    ["Quel est le seul mammifère capable de voler activement (et non de planer) ?", "La chauve-souris", "L'écureuil volant", "La roussette", "Le phalanger"],
    ["Quelle est la capitale du Kazakhstan ?", "Astana", "Almaty", "Bichkek", "Tachkent"],
    ["Quel traité a officiellement mis fin à la Première Guerre mondiale ?", "Le traité de Versailles", "Le traité de Vienne", "Le traité de Westphalie", "Le traité d'Utrecht"],
    ["Environ combien d'os un nouveau-né possède-t-il, soit plus que l'adulte ?", "Environ 300", "Environ 206", "Environ 150", "Environ 400"],
    ["Quel est l'élément chimique le plus abondant dans l'univers ?", "L'hydrogène", "L'hélium", "L'oxygène", "Le carbone"],
    ["Qui a composé l'opéra « La Flûte enchantée » ?", "Mozart", "Beethoven", "Wagner", "Verdi"],
    ["Quelle bataille a marqué la défaite finale de Napoléon ?", "Waterloo", "Austerlitz", "Trafalgar", "Iéna"],
    ["Quel pays compte le plus de fuseaux horaires, grâce à ses territoires d'outre-mer ?", "La France", "La Russie", "Les États-Unis", "Le Royaume-Uni"],
    ["Quel est le point culminant du continent africain ?", "Le Kilimandjaro", "Le mont Kenya", "Le mont Stanley", "L'Atlas"],
    ["Dans quelle ville siège la Cour pénale internationale ?", "La Haye", "Genève", "Bruxelles", "Strasbourg"],
    ["Qui a composé « Les Quatre Saisons » ?", "Vivaldi", "Bach", "Haendel", "Corelli"],
    ["Quel traité de 1494 a partagé le Nouveau Monde entre l'Espagne et le Portugal ?", "Le traité de Tordesillas", "Le traité de Madrid", "Le traité d'Utrecht", "Le traité de Saragosse"],
    ["Quelle est la particularité insolite de la planète Vénus ?", "Son jour dure plus longtemps que son année", "Elle n'a pas d'atmosphère", "Elle tourne à la même vitesse que la Terre", "C'est la planète la plus froide"],
    ["Quel explorateur a mené l'expédition qui a réalisé le premier tour du monde en bateau (achevé après sa mort) ?", "Magellan", "Christophe Colomb", "Vasco de Gama", "James Cook"],
    ["Quel est le plus grand désert du monde, déserts polaires exclus ?", "Le Sahara", "Le désert de Gobi", "Le désert d'Arabie", "Le Kalahari"],
    ["Quelle est, environ, la vitesse du son dans l'air à température ambiante ?", "340 m/s", "150 m/s", "500 m/s", "1000 m/s"],
    ["Quel est l'élément chimique naturel le plus dense sur Terre ?", "L'osmium", "Le plomb", "L'or", "Le platine"],
    ["Quelle bataille est considérée comme le tournant de la Seconde Guerre mondiale sur le front de l'Est ?", "La bataille de Stalingrad", "La bataille de Koursk", "Le siège de Leningrad", "La bataille de Moscou"],
    ["Quelle est la capitale de la Mongolie ?", "Oulan-Bator", "Astana", "Bichkek", "Tachkent"],
    ["Quel roi de France est resté sur le trône le plus longtemps ?", "Louis XIV", "Louis XV", "François Ier", "Louis XVI"],
    ["Quel processus permet aux étoiles de produire leur énergie ?", "La fusion nucléaire", "La fission nucléaire", "La combustion", "L'ionisation"],
    ["Quelle est la capitale de l'Éthiopie ?", "Addis-Abeba", "Nairobi", "Khartoum", "Kampala"],
    ["Quel philosophe grec fut le précepteur d'Alexandre le Grand ?", "Aristote", "Platon", "Socrate", "Pythagore"],
    ["Où se situe le point le plus profond des océans ?", "La fosse des Mariannes", "La fosse de Porto Rico", "La fosse du Japon", "La fosse des Kouriles"],
    ["En quelle année l'ONU a-t-elle été fondée ?", "1945", "1919", "1950", "1939"],
    ["Quel nom porte la particule découverte au CERN en 2012, surnommée « particule de Dieu » ?", "Le boson de Higgs", "Le boson W", "Le quark top", "Le neutrino"],
    ["Quelle dynastie chinoise a construit la majeure partie de la Grande Muraille actuelle ?", "La dynastie Ming", "La dynastie Qin", "La dynastie Han", "La dynastie Tang"],
    ["Quel a été le plus grand empire continu (d'un seul tenant) de l'histoire ?", "L'Empire mongol", "L'Empire britannique", "L'Empire romain", "L'Empire perse"],
    ["Quel savant a formulé les lois du mouvement et de la gravitation universelle ?", "Isaac Newton", "Galilée", "Albert Einstein", "Johannes Kepler"],
    ["Quelle est la capitale de l'Afghanistan ?", "Kaboul", "Kandahar", "Herat", "Mazar-i-Sharif"],
    ["Quel traité a mis fin à la guerre de Trente Ans en 1648 ?", "Le traité de Westphalie", "Le traité d'Utrecht", "Le traité de Vienne", "Le traité de Tordesillas"],
    ["Quel vaisseau spatial a emmené les premiers hommes sur la Lune en 1969 ?", "Apollo 11", "Apollo 13", "Gemini 8", "Soyouz 1"],
    ["Quelle est la plus longue chaîne de montagnes du monde, en grande partie sous-marine ?", "La dorsale médio-océanique", "L'Himalaya", "Les Andes", "Les Rocheuses"],
    ["Quel empereur romain a divisé durablement l'Empire romain en deux, en 395 ?", "Théodose Ier", "Constantin", "Dioclétien", "Auguste"],
    ["Quelle est la capitale du Chili ?", "Santiago", "Valparaíso", "Concepción", "Antofagasta"],
    ["Quel scientifique a proposé la théorie de l'évolution par sélection naturelle ?", "Charles Darwin", "Gregor Mendel", "Jean-Baptiste Lamarck", "Alfred Wallace"],
    ["Quel nom porte le supercontinent qui regroupait les terres émergées il y a environ 300 millions d'années ?", "La Pangée", "Le Gondwana", "La Laurasia", "Rodinia"],
    ["Quelle bataille de 202 av. J.-C. a définitivement mis fin aux ambitions d'Hannibal contre Rome ?", "La bataille de Zama", "La bataille de Cannes", "La bataille du lac Trasimène", "La bataille de la Trébie"],
    ["Quelle est la capitale du Pérou ?", "Lima", "Cusco", "Arequipa", "Trujillo"],
    ["Quel physicien a découvert la radioactivité, en 1896 ?", "Henri Becquerel", "Marie Curie", "Pierre Curie", "Ernest Rutherford"],
    ["Quel détroit sépare l'Europe de l'Afrique ?", "Le détroit de Gibraltar", "Le Bosphore", "Le pas de Calais", "Le détroit de Messine"],
    ["Quelle civilisation précolombienne a construit le Machu Picchu ?", "Les Incas", "Les Mayas", "Les Aztèques", "Les Olmèques"],
    ["Quel est l'os le plus long du corps humain ?", "Le fémur", "Le tibia", "L'humérus", "Le péroné"],
    ["Quelle est la capitale de l'Irak ?", "Bagdad", "Bassora", "Mossoul", "Erbil"],
    ["Quel mathématicien grec est célèbre pour son théorème sur les triangles rectangles ?", "Pythagore", "Euclide", "Archimède", "Thalès"],
    ["Quelle guerre a opposé l'Angleterre et la France de 1337 à 1453 ?", "La guerre de Cent Ans", "La guerre de Sept Ans", "La guerre des Deux-Roses", "La guerre de Succession d'Espagne"],
    ["Comment appelle-t-on l'explosion qui marque la fin de vie d'une étoile massive ?", "Une supernova", "Une nova", "Un trou noir", "Une nébuleuse"],
    ["Quelle est la capitale de la Roumanie ?", "Bucarest", "Budapest", "Sofia", "Belgrade"],
    ["Quel explorateur portugais fut le premier Européen à atteindre l'Inde par la mer, en 1498 ?", "Vasco de Gama", "Christophe Colomb", "Magellan", "Bartolomeu Dias"],
    ["Quel est le gaz le plus abondant dans l'atmosphère terrestre ?", "L'azote", "L'oxygène", "Le dioxyde de carbone", "L'argon"],
    ["Quelle est la capitale officielle de la Birmanie (Myanmar) depuis 2005 ?", "Naypyidaw", "Rangoun", "Mandalay", "Bago"],
    ["Sous quel parc national américain sommeille un supervolcan ?", "Yellowstone", "Yosemite", "Le Grand Canyon", "Les Everglades"],
    ["Quel lac d'Asie centrale a presque disparu à cause du détournement de ses fleuves pour l'irrigation ?", "La mer d'Aral", "Le lac Balkhach", "La mer Caspienne", "Le lac Issyk-Koul"],
    ["Dans quel pays actuel a eu lieu l'éruption cataclysmique du Krakatoa en 1883 ?", "L'Indonésie", "Les Philippines", "Le Japon", "La Papouasie-Nouvelle-Guinée"],
    ["Quel est le plus grand lac entièrement situé au Canada ?", "Le Grand lac de l'Ours", "Le Grand lac des Esclaves", "Le lac Winnipeg", "Le lac Athabasca"],
    ["Quel est le plus haut volcan actif du monde, à la frontière Chili-Argentine ?", "L'Ojos del Salado", "Le Cotopaxi", "Le Mauna Loa", "L'Aconcagua"],
    ["Quelle est la capitale officielle de la Tanzanie ?", "Dodoma", "Dar es Salaam", "Arusha", "Zanzibar"],
    ["L'éruption de quel volcan indonésien, en 1815, a provoqué « l'année sans été » ?", "Le Tambora", "Le Krakatoa", "Le Merapi", "Le Sinabung"],
    ["Quelle est la capitale du Bhoutan ?", "Thimphou", "Katmandou", "Dacca", "Paro"],
    ["Quel lac sibérien contient à lui seul environ 20 % de l'eau douce liquide de surface du globe ?", "Le lac Baïkal", "Le lac Ladoga", "Le lac Onega", "Le lac Taïmyr"],
  ],
};
const QUESTIONS_EN = {
  easy: [
    ["How many continents are there on Earth?", "7", "5", "6", "8"],
    ["What is the fastest land animal?", "The cheetah", "The lion", "The horse", "The ostrich"],
    ["How many days are in a leap year?", "366", "365", "364", "367"],
    ["In which country is the Eiffel Tower located?", "France", "Belgium", "Italy", "Spain"],
    ["What is the largest planet in the solar system?", "Jupiter", "Saturn", "Neptune", "Uranus"],
    ["How many colors does a rainbow traditionally have?", "7", "5", "6", "8"],
    ["What is the largest cold desert in the world?", "Antarctica", "The Sahara", "The Gobi", "The Arctic"],
    ["How many players does a football (soccer) team have on the field?", "11", "10", "9", "12"],
    ["What is the capital of Spain?", "Madrid", "Barcelona", "Seville", "Valencia"],
    ["What yellow fruit, often linked to monkeys, is peeled before eating?", "The banana", "The mango", "The pineapple", "The papaya"],
    ["How many legs does an insect have?", "6", "8", "4", "10"],
    ["What is the longest river in Africa?", "The Nile", "The Congo", "The Niger", "The Zambezi"],
    ["Which sea borders Nice and Marseille?", "The Mediterranean", "The Atlantic", "The North Sea", "The Red Sea"],
    ["How long is a regulation football (soccer) match?", "90 minutes", "60 minutes", "120 minutes", "45 minutes"],
    ["What is the chemical symbol for water?", "H2O", "CO2", "O2", "NaCl"],
    ["Which comic series features a small Gaulish village resisting the Romans?", "Asterix", "Tintin", "Lucky Luke", "Spirou"],
    ["What is the capital of Italy?", "Rome", "Milan", "Venice", "Naples"],
    ["How many sides does a hexagon have?", "6", "5", "7", "8"],
    ["Which organ pumps blood around the body?", "The heart", "The liver", "The lungs", "The kidneys"],
    ["What color do you get by mixing blue and yellow?", "Green", "Orange", "Purple", "Brown"],
    ["How many minutes are there in an hour?", "60", "100", "50", "30"],
    ["What is the largest ocean in the world?", "The Pacific", "The Atlantic", "The Indian", "The Arctic"],
    ["Which animal is known as the king of the jungle?", "The lion", "The tiger", "The elephant", "The gorilla"],
    ["What is the capital of Japan?", "Tokyo", "Osaka", "Kyoto", "Hiroshima"],
    ["What is the largest mammal in the world?", "The blue whale", "The elephant", "The giraffe", "The rhinoceros"],
    ["How many fingers do we have on one hand?", "5", "4", "6", "10"],
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
    ["What is the main ingredient in bread?", "Flour", "Sugar", "Salt", "Butter"],
    ["How many days does February have in a normal year?", "28", "29", "30", "31"],
    ["What is the smallest country in the world?", "The Vatican", "Monaco", "San Marino", "Liechtenstein"],
    ["Which language has the most native speakers in the world?", "Mandarin", "English", "Spanish", "Hindi"],
    ["Which musical instrument has 88 keys?", "The piano", "The guitar", "The violin", "The harp"],
    ["What is the capital of Germany?", "Berlin", "Munich", "Frankfurt", "Hamburg"],
    ["How long does it take the Earth to complete one full spin on its axis?", "24 hours", "12 hours", "365 days", "1 hour"],
    ["What is Japan's traditional national sport?", "Sumo", "Judo", "Karate", "Baseball"],
    ["What is the highest mountain in the world?", "Everest", "Kilimanjaro", "Mont Blanc", "K2"],
    ["Which vegetable makes you cry when you cut it?", "Onion", "Carrot", "Potato", "Leek"],
    ["How many strings does a classical guitar have?", "6", "4", "8", "5"],
    ["What is the capital of Canada?", "Ottawa", "Toronto", "Montreal", "Vancouver"],
    ["Which animal is known as man's best friend?", "The dog", "The cat", "The horse", "The bird"],
    ["Which geometric shape has exactly 3 sides?", "The triangle", "The square", "The circle", "The rectangle"],
    ["What is the largest country in the world by area?", "Russia", "Canada", "China", "The United States"],
    ["What is the capital of Russia?", "Moscow", "Saint Petersburg", "Novosibirsk", "Kyiv"],
    ["What vital liquid flows through our veins?", "Blood", "Water", "Lymph", "Plasma"],
    ["How many zeros are in the number one million?", "6", "5", "7", "9"],
    ["What instrument is used to measure temperature?", "A thermometer", "A barometer", "An altimeter", "A seismograph"],
    ["Which season follows winter?", "Spring", "Summer", "Autumn", "Winter"],
    ["What is the largest hot desert in the world?", "The Sahara", "The Gobi", "The Kalahari", "The Arabian Desert"],
    ["Which body part is used to smell?", "The nose", "The mouth", "The ears", "The eyes"],
    ["What is the capital of Portugal?", "Lisbon", "Porto", "Faro", "Coimbra"],
    ["What is the name of Earth's natural satellite?", "The Moon", "Mars", "The Sun", "Venus"],
    ["What is the largest lake in Africa?", "Lake Victoria", "Lake Tanganyika", "Lake Malawi", "Lake Chad"],
    ["Which volcano destroyed Pompeii in 79 AD?", "Vesuvius", "Etna", "Stromboli", "Vulcano"],
    ["What is the capital of Switzerland?", "Bern", "Zurich", "Geneva", "Lausanne"],
    ["Which large lake lies between France and Switzerland?", "Lake Geneva", "Lake Annecy", "Lake Bourget", "Lake Constance"],
    ["In which country is the volcano Etna located?", "Italy", "Greece", "Spain", "Portugal"],
    ["What is the capital of Austria?", "Vienna", "Salzburg", "Innsbruck", "Graz"],
    ["What is the longest river located entirely in France?", "The Loire", "The Seine", "The Rhône", "The Garonne"],
    ["What is the capital of Morocco?", "Rabat", "Casablanca", "Marrakesh", "Fez"],
    ["Which enclosed sea is actually the largest lake in the world?", "The Caspian Sea", "The Dead Sea", "The Aral Sea", "The Black Sea"],
  ],
  medium: [
    ["Which country is shaped like a boot on the map of Europe?", "Italy", "Greece", "Portugal", "Croatia"],
    ["About how long does sunlight take to reach Earth?", "8 minutes", "1 minute", "1 hour", "8 seconds"],
    ["Who wrote 'Les Misérables'?", "Victor Hugo", "Émile Zola", "Alexandre Dumas", "Gustave Flaubert"],
    ["What is the capital of Brazil?", "Brasília", "Rio de Janeiro", "São Paulo", "Salvador"],
    ["In what year did the Berlin Wall fall?", "1989", "1991", "1985", "1993"],
    ["What is the largest organ in the human body?", "The skin", "The liver", "The heart", "The brain"],
    ["Which painter is known for 'The Starry Night'?", "Van Gogh", "Monet", "Picasso", "Renoir"],
    ["What is the official currency of the United Kingdom?", "The pound sterling", "The euro", "The dollar", "The franc"],
    ["How many rings are on the Olympic flag?", "5", "4", "6", "7"],
    ["Which ocean is the deepest?", "The Pacific", "The Atlantic", "The Indian", "The Arctic"],
    ["What is the process by which plants produce energy from light called?", "Photosynthesis", "Respiration", "Fermentation", "Transpiration"],
    ["Which country is the birthplace of the tango?", "Argentina", "Brazil", "Spain", "Mexico"],
    ["About how long does it take the Moon to orbit the Earth once?", "27 days", "7 days", "100 days", "365 days"],
    ["Which British writer created Sherlock Holmes?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Oscar Wilde"],
    ["What is the official language of Brazil?", "Portuguese", "Spanish", "French", "Italian"],
    ["Which great composer became deaf later in life?", "Beethoven", "Mozart", "Bach", "Chopin"],
    ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Raphael", "Botticelli"],
    ["What is the capital of Australia?", "Canberra", "Sydney", "Melbourne", "Perth"],
    ["In what year did the French Revolution begin?", "1789", "1799", "1804", "1776"],
    ["What is the capital of Egypt?", "Cairo", "Alexandria", "Luxor", "Giza"],
    ["Who wrote 'Romeo and Juliet'?", "Shakespeare", "Molière", "Victor Hugo", "Racine"],
    ["Which country gifted the Statue of Liberty to the United States?", "France", "The United Kingdom", "Spain", "Italy"],
    ["What is the official currency of Japan?", "The yen", "The won", "The yuan", "The ringgit"],
    ["About how long does it take the Earth to orbit the Sun?", "365 days", "30 days", "100 days", "24 hours"],
    ["What is the largest country in South America?", "Brazil", "Argentina", "Colombia", "Peru"],
    ["Who discovered penicillin?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Robert Koch"],
    ["What is the capital of Greece?", "Athens", "Thessaloniki", "Sparta", "Corinth"],
    ["How many teeth does an adult typically have?", "32", "28", "36", "24"],
    ["Which art movement is Salvador Dalí associated with?", "Surrealism", "Cubism", "Impressionism", "Fauvism"],
    ["What is the largest island in the world?", "Greenland", "Madagascar", "Borneo", "Iceland"],
    ["Which Austrian composer wrote over 600 works before dying at 35?", "Mozart", "Beethoven", "Haydn", "Schubert"],
    ["What is the capital of South Korea?", "Seoul", "Busan", "Incheon", "Daegu"],
    ["What is the highest peak in the Alps?", "Mont Blanc", "The Matterhorn", "Monte Rosa", "Gran Paradiso"],
    ["Who wrote the novel '1984'?", "George Orwell", "Aldous Huxley", "Ray Bradbury", "H.G. Wells"],
    ["What is the capital of China?", "Beijing", "Shanghai", "Hong Kong", "Guangzhou"],
    ["What is the largest freshwater lake in the world by volume?", "Lake Baikal", "Lake Superior", "Lake Victoria", "Lake Tanganyika"],
    ["Which war was fought between the North and South of the United States?", "The Civil War", "The War of Independence", "The Spanish-American War", "The War of 1812"],
    ["What is the chemical symbol for gold?", "Au", "Ag", "Fe", "Pb"],
    ["What is the capital of the Netherlands?", "Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
    ["Who painted 'Guernica'?", "Pablo Picasso", "Salvador Dalí", "Joan Miró", "Diego Rivera"],
    ["How long does a human pregnancy last on average?", "9 months", "7 months", "10 months", "12 months"],
    ["What is the capital of Turkey?", "Ankara", "Istanbul", "Izmir", "Antalya"],
    ["Which physicist formulated the theory of relativity?", "Albert Einstein", "Isaac Newton", "Niels Bohr", "Stephen Hawking"],
    ["What is the smallest bone in the human body?", "The stapes", "The femur", "The kneecap", "The tibia"],
    ["Which expedition was first to reach the South Pole, in 1911?", "Roald Amundsen's", "Robert Scott's", "Ernest Shackleton's", "James Cook's"],
    ["What is the most populous country in the world today?", "India", "China", "The United States", "Indonesia"],
    ["What is the capital of Sweden?", "Stockholm", "Oslo", "Copenhagen", "Helsinki"],
    ["Who developed the first commercially viable electric light bulb?", "Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Benjamin Franklin"],
    ["What is the largest coral reef system in the world?", "The Great Barrier Reef", "The Belize Barrier Reef", "The Coral Triangle", "The Florida Reef"],
    ["What is the capital of Kenya?", "Nairobi", "Mombasa", "Kisumu", "Nakuru"],
    ["Which navigable lake, between Peru and Bolivia, is the highest in the world?", "Lake Titicaca", "Lake Poopó", "Lake Atitlán", "Lake Junín"],
    ["Which volcano is the highest peak in Japan?", "Mount Fuji", "Mount Aso", "Sakurajima", "Mount Ontake"],
    ["What is the capital of New Zealand?", "Wellington", "Auckland", "Christchurch", "Hamilton"],
    ["Which Icelandic volcano grounded European air traffic in 2010?", "Eyjafjallajökull", "Hekla", "Katla", "Grímsvötn"],
    ["Which extremely salty lake, between Israel and Jordan, is the lowest point on land?", "The Dead Sea", "The Sea of Galilee", "The Caspian Sea", "The Great Salt Lake"],
    ["What is the largest lake in North America?", "Lake Superior", "Lake Michigan", "Lake Huron", "Great Bear Lake"],
    ["What is the capital of Colombia?", "Bogotá", "Medellín", "Cali", "Cartagena"],
    ["Which Washington State volcano erupted spectacularly in 1980?", "Mount St. Helens", "Mount Rainier", "Mount Hood", "Mount Shasta"],
    ["Which city is South Africa's administrative capital, seat of the government?", "Pretoria", "Cape Town", "Johannesburg", "Durban"],
  ],
  hard: [
    ["What is the only mammal capable of true powered flight (not just gliding)?", "The bat", "The flying squirrel", "The flying fox", "The sugar glider"],
    ["What is the capital of Kazakhstan?", "Astana", "Almaty", "Bishkek", "Tashkent"],
    ["Which treaty officially ended World War I?", "The Treaty of Versailles", "The Treaty of Vienna", "The Treaty of Westphalia", "The Treaty of Utrecht"],
    ["About how many bones does a newborn baby have, more than an adult?", "About 300", "About 206", "About 150", "About 400"],
    ["What is the most abundant element in the universe?", "Hydrogen", "Helium", "Oxygen", "Carbon"],
    ["Who composed the opera 'The Magic Flute'?", "Mozart", "Beethoven", "Wagner", "Verdi"],
    ["Which battle marked Napoleon's final defeat?", "Waterloo", "Austerlitz", "Trafalgar", "Jena"],
    ["Which country has the most time zones, thanks to its overseas territories?", "France", "Russia", "The United States", "The United Kingdom"],
    ["What is the highest point on the African continent?", "Kilimanjaro", "Mount Kenya", "Mount Stanley", "The Atlas Mountains"],
    ["In which city is the International Criminal Court headquartered?", "The Hague", "Geneva", "Brussels", "Strasbourg"],
    ["Who composed 'The Four Seasons'?", "Vivaldi", "Bach", "Handel", "Corelli"],
    ["Which 1494 treaty divided the New World between Spain and Portugal?", "The Treaty of Tordesillas", "The Treaty of Madrid", "The Treaty of Utrecht", "The Treaty of Zaragoza"],
    ["What is the unusual fact about the planet Venus?", "Its day is longer than its year", "It has no atmosphere", "It rotates at the same speed as Earth", "It's the coldest planet"],
    ["Whose expedition was the first to circumnavigate the globe, completed after his death?", "Magellan", "Christopher Columbus", "Vasco da Gama", "James Cook"],
    ["What is the largest desert in the world, excluding polar deserts?", "The Sahara", "The Gobi Desert", "The Arabian Desert", "The Kalahari"],
    ["What is approximately the speed of sound in air at room temperature?", "340 m/s", "150 m/s", "500 m/s", "1000 m/s"],
    ["What is the densest naturally occurring chemical element on Earth?", "Osmium", "Lead", "Gold", "Platinum"],
    ["Which battle is considered the turning point of World War II on the Eastern Front?", "The Battle of Stalingrad", "The Battle of Kursk", "The Siege of Leningrad", "The Battle of Moscow"],
    ["What is the capital of Mongolia?", "Ulaanbaatar", "Astana", "Bishkek", "Tashkent"],
    ["Which King of France had the longest reign?", "Louis XIV", "Louis XV", "Francis I", "Louis XVI"],
    ["What process allows stars to produce their energy?", "Nuclear fusion", "Nuclear fission", "Combustion", "Ionization"],
    ["What is the capital of Ethiopia?", "Addis Ababa", "Nairobi", "Khartoum", "Kampala"],
    ["Which Greek philosopher tutored Alexander the Great?", "Aristotle", "Plato", "Socrates", "Pythagoras"],
    ["Where is the deepest point in the world's oceans located?", "The Mariana Trench", "The Puerto Rico Trench", "The Japan Trench", "The Kuril Trench"],
    ["In what year was the United Nations founded?", "1945", "1919", "1950", "1939"],
    ["What is the name of the particle discovered at CERN in 2012, nicknamed the 'God particle'?", "The Higgs boson", "The W boson", "The top quark", "The neutrino"],
    ["Which Chinese dynasty built most of the Great Wall as it stands today?", "The Ming dynasty", "The Qin dynasty", "The Han dynasty", "The Tang dynasty"],
    ["What was the largest contiguous land empire in history?", "The Mongol Empire", "The British Empire", "The Roman Empire", "The Persian Empire"],
    ["Which scientist formulated the laws of motion and universal gravitation?", "Isaac Newton", "Galileo", "Albert Einstein", "Johannes Kepler"],
    ["What is the capital of Afghanistan?", "Kabul", "Kandahar", "Herat", "Mazar-i-Sharif"],
    ["Which treaty ended the Thirty Years' War in 1648?", "The Peace of Westphalia", "The Treaty of Utrecht", "The Treaty of Vienna", "The Treaty of Tordesillas"],
    ["Which spacecraft carried the first humans to the Moon in 1969?", "Apollo 11", "Apollo 13", "Gemini 8", "Soyuz 1"],
    ["What is the longest mountain range in the world, mostly underwater?", "The Mid-Ocean Ridge", "The Himalayas", "The Andes", "The Rocky Mountains"],
    ["Which Roman emperor permanently split the Roman Empire in two, in 395?", "Theodosius I", "Constantine", "Diocletian", "Augustus"],
    ["What is the capital of Chile?", "Santiago", "Valparaíso", "Concepción", "Antofagasta"],
    ["Which scientist proposed the theory of evolution by natural selection?", "Charles Darwin", "Gregor Mendel", "Jean-Baptiste Lamarck", "Alfred Wallace"],
    ["What was the name of the supercontinent that held together all landmasses about 300 million years ago?", "Pangaea", "Gondwana", "Laurasia", "Rodinia"],
    ["Which 202 BC battle permanently ended Hannibal's ambitions against Rome?", "The Battle of Zama", "The Battle of Cannae", "The Battle of Lake Trasimene", "The Battle of the Trebia"],
    ["What is the capital of Peru?", "Lima", "Cusco", "Arequipa", "Trujillo"],
    ["Which physicist discovered radioactivity, in 1896?", "Henri Becquerel", "Marie Curie", "Pierre Curie", "Ernest Rutherford"],
    ["Which strait separates Europe from Africa?", "The Strait of Gibraltar", "The Bosphorus", "The Strait of Dover", "The Strait of Messina"],
    ["Which pre-Columbian civilization built Machu Picchu?", "The Incas", "The Mayans", "The Aztecs", "The Olmecs"],
    ["What is the longest bone in the human body?", "The femur", "The tibia", "The humerus", "The fibula"],
    ["What is the capital of Iraq?", "Baghdad", "Basra", "Mosul", "Erbil"],
    ["Which Greek mathematician is famous for his theorem about right triangles?", "Pythagoras", "Euclid", "Archimedes", "Thales"],
    ["Which war was fought between England and France from 1337 to 1453?", "The Hundred Years' War", "The Seven Years' War", "The Wars of the Roses", "The War of the Spanish Succession"],
    ["What is the explosive death of a massive star called?", "A supernova", "A nova", "A black hole", "A nebula"],
    ["What is the capital of Romania?", "Bucharest", "Budapest", "Sofia", "Belgrade"],
    ["Which Portuguese explorer was the first European to reach India by sea, in 1498?", "Vasco da Gama", "Christopher Columbus", "Magellan", "Bartolomeu Dias"],
    ["What is the most abundant gas in Earth's atmosphere?", "Nitrogen", "Oxygen", "Carbon dioxide", "Argon"],
    ["What has been the official capital of Myanmar (Burma) since 2005?", "Naypyidaw", "Yangon", "Mandalay", "Bago"],
    ["Beneath which US national park lies a supervolcano?", "Yellowstone", "Yosemite", "The Grand Canyon", "The Everglades"],
    ["Which Central Asian lake nearly vanished after its rivers were diverted for irrigation?", "The Aral Sea", "Lake Balkhash", "The Caspian Sea", "Lake Issyk-Kul"],
    ["In which present-day country did the cataclysmic 1883 eruption of Krakatoa take place?", "Indonesia", "The Philippines", "Japan", "Papua New Guinea"],
    ["What is the largest lake located entirely within Canada?", "Great Bear Lake", "Great Slave Lake", "Lake Winnipeg", "Lake Athabasca"],
    ["What is the highest active volcano in the world, on the Chile-Argentina border?", "Ojos del Salado", "Cotopaxi", "Mauna Loa", "Aconcagua"],
    ["What is the official capital of Tanzania?", "Dodoma", "Dar es Salaam", "Arusha", "Zanzibar"],
    ["The 1815 eruption of which Indonesian volcano caused the 'Year Without a Summer'?", "Tambora", "Krakatoa", "Merapi", "Sinabung"],
    ["What is the capital of Bhutan?", "Thimphu", "Kathmandu", "Dhaka", "Paro"],
    ["Which Siberian lake alone holds about 20% of the world's unfrozen surface fresh water?", "Lake Baikal", "Lake Ladoga", "Lake Onega", "Lake Taymyr"],
  ],
};

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

const ROUND_MS_BY_DIFF = { easy: 11000, medium: 8500, hard: 6500 };
const POINTS_BY_DIFF = { easy: 1, medium: 2, hard: 3 };
const N_QUESTIONS = 10;
// Pause de lecture entre la révélation de la bonne réponse et la question
// suivante : allongée (2s -> 3,8s) pour laisser le temps de réagir à voix
// haute entre amis, sans que la question suivante n'arrive déjà dessus.
const REVEAL_PAUSE_MS = 3800;

export default function QuizGame({ room, me, isHost, players, onFinish, t, lang }) {
  // Le paquet n'existe QUE chez l'hôte : les autres reçoivent tout par broadcast.
  const deckRef = useRef(null);
  const [q, setQ] = useState(null);          // { index, text, choices[], good, diff, roundMs }
  const [deadline, setDeadline] = useState(null);
  const [roundTotal, setRoundTotal] = useState(ROUND_MS_BY_DIFF.easy);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [points, setPoints] = useState(0);
  const [roundResults, setRoundResults] = useState([]); // qui a répondu juste/faux cette manche-ci
  // ----- Verrouillage de réponse ("lock") -----
  // Cliquer SÉLECTIONNE (modifiable) ; verrouiller (barre Espace ou bouton)
  // FIGE la réponse. Quand TOUS les joueurs du salon ont verrouillé, l'hôte
  // révèle immédiatement sans attendre la fin du chrono — pour enchaîner
  // plus vite quand tout le monde est sûr de lui.
  const [lockedMine, setLockedMine] = useState(false);
  const [lockedList, setLockedList] = useState([]); // qui a verrouillé (affichage)
  const lockedMineRef = useRef(false);
  const lockedIdsRef = useRef(new Set());   // côté hôte : ids verrouillés
  const revealTimeoutRef = useRef(null);    // côté hôte : chrono de révélation annulable
  const revealFiredRef = useRef(false);     // côté hôte : garde anti double-révélation
  const playersRef = useRef(players);
  const channelRef = useRef(null);
  const myGain = useRef(0);
  const timeouts = useRef([]);
  const restoredRef = useRef(false);
  // Miroirs toujours à jour de q/picked pour le handler "reveal" (évite les closures figées).
  const qRef = useRef(null);
  const pickedRef = useRef(null);
  const revealedRef = useRef(false);
  const lastDiffRef = useRef("easy");

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { lockedMineRef.current = lockedMine; }, [lockedMine]);

  function persistState(qPayload, deadlineAt, revealedFlag, finishedFlag) {
    if (!isHost) return;
    saveGameState(room.id, "quiz", {
      phase: finishedFlag ? "finished" : "playing",
      q: qPayload, deadlineAt, revealed: revealedFlag, finished: finishedFlag,
      deck: deckRef.current, diff: qPayload?.diff,
    });
  }

  useEffect(() => {
    const ch = supabase.channel("quiz_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "question" }, ({ payload }) => {
      qRef.current = payload;
      pickedRef.current = null;
      setQ(payload);
      setRoundTotal(payload.remaining);
      setDeadline(Date.now() + payload.remaining);
      setPicked(null);
      setRevealed(false);
      revealedRef.current = false;
      setRoundResults([]);
      setFinished(false);
      setLockedMine(false);
      setLockedList([]);
      lockedIdsRef.current = new Set();
      revealFiredRef.current = false;
      if (payload.index === 0) { myGain.current = 0; setPoints(0); }
    });
    // Un joueur a verrouillé sa réponse : tout le monde l'affiche ; l'hôte
    // compte, et révèle immédiatement si TOUS les joueurs du salon ont
    // verrouillé (le chrono en cours est annulé).
    ch.on("broadcast", { event: "lock" }, ({ payload }) => {
      setLockedList(prev => (prev.some(r => r.profile_id === payload.profile_id) ? prev : [...prev, payload]));
      if (!isHost) return;
      lockedIdsRef.current.add(payload.profile_id);
      const ids = (playersRef.current || []).map(p => p.profile_id);
      if (ids.length > 0 && ids.every(id => lockedIdsRef.current.has(id))) {
        clearTimeout(revealTimeoutRef.current);
        const cur = qRef.current;
        if (cur) hostReveal(cur.index, cur.diff);
      }
    });
    ch.on("broadcast", { event: "reveal" }, async () => {
      setRevealed(true);
      revealedRef.current = true;
      // Validation du résultat UNIQUEMENT à l'issue du timer, sur la dernière réponse choisie.
      const finalPick = pickedRef.current;
      const currentQ = qRef.current;
      const correct = !!(finalPick && currentQ && finalPick === currentQ.good);
      if (correct) {
        const gain = POINTS_BY_DIFF[currentQ.diff] || 2;
        myGain.current += gain;
        setPoints(p => p + gain);
        try {
          // RPC atomique : pas d'écrasement de score en cas de réponses simultanées.
          await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
        } catch (e) {}
      }
      // Retour social : chacun diffuse SON propre résultat pour cette question,
      // pour que tout le monde voie en direct qui a trouvé la bonne réponse.
      if (finalPick) {
        channelRef.current?.send({
          type: "broadcast", event: "answer_result",
          payload: { profile_id: me.id, username: me.username, avatar: me.avatar, correct },
        });
      }
      if (isHost) persistState(currentQ, Date.now(), true, false);
    });
    ch.on("broadcast", { event: "answer_result" }, ({ payload }) => {
      setRoundResults(prev => (prev.some(r => r.profile_id === payload.profile_id) ? prev : [...prev, payload]));
    });
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      if (isHost) persistState(null, null, false, true);
      // Chaque joueur enregistre SON résultat (RLS : on ne peut écrire que le sien).
      try {
        await supabase.from("game_results").insert({
          room_id: room.id, profile_id: me.id, game_id: "quiz", points: myGain.current
        });
      } catch (e) {}
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED" || restoredRef.current) return;
      restoredRef.current = true;
      // Resynchronisation : une manche en cours (rechargement de page) est
      // restaurée immédiatement. Le compteur de points de CETTE partie
      // (affiché en haut à droite) ne peut pas être restauré à l'identique
      // (il est calculé localement au fil des révélations) — le score
      // réel du salon, lui, n'est jamais affecté et reste intact.
      const saved = readGameState(room, "quiz");
      if (!saved) return;
      if (saved.finished) { setFinished(true); return; }
      if (!saved.q) return;
      qRef.current = saved.q;
      setQ(saved.q);
      setRoundTotal(saved.q.remaining);
      setRoundResults([]);
      if (saved.revealed) {
        setRevealed(true);
        revealedRef.current = true;
        setDeadline(Date.now());
      } else {
        setDeadline(saved.deadlineAt);
        setRevealed(false);
        if (isHost && saved.deck) {
          deckRef.current = saved.deck;
          const msLeft = Math.max(0, saved.deadlineAt - Date.now());
          revealTimeoutRef.current = setTimeout(() => hostReveal(saved.q.index, saved.diff), msLeft);
          timeouts.current.push(revealTimeoutRef.current);
        }
      }
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [deadline]);

  function hostStart(diff) {
    lastDiffRef.current = diff;
    const bank = (lang === "en" ? QUESTIONS_EN : QUESTIONS_FR)[diff];
    deckRef.current = shuffle(bank).slice(0, N_QUESTIONS);
    hostSend(0, diff);
  }

  // Révélation côté hôte, factorisée : appelée soit par le chrono normal,
  // soit par anticipation quand tout le monde a verrouillé. La garde
  // revealFiredRef empêche toute double révélation de la même question
  // (chrono ET verrouillage simultanés).
  function hostReveal(index, diff) {
    if (revealFiredRef.current) return;
    revealFiredRef.current = true;
    channelRef.current.send({ type: "broadcast", event: "reveal", payload: {} });
    timeouts.current.push(setTimeout(() => {
      if (index + 1 < deckRef.current.length) hostSend(index + 1, diff);
      else hostFinish();
    }, REVEAL_PAUSE_MS));
  }

  function hostSend(index, diff) {
    const item = deckRef.current[index];
    const roundMs = ROUND_MS_BY_DIFF[diff];
    const payload = {
      index,
      total: deckRef.current.length,
      text: item[0],
      good: item[1],
      choices: shuffle(item.slice(1)),
      remaining: roundMs,
      diff
    };
    channelRef.current.send({ type: "broadcast", event: "question", payload });
    const deadlineAt = Date.now() + roundMs;
    persistState(payload, deadlineAt, false, false);
    revealTimeoutRef.current = setTimeout(() => hostReveal(index, diff), roundMs);
    timeouts.current.push(revealTimeoutRef.current);
  }

  async function hostFinish() {
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  function rejouer() {
    if (!isHost) return;
    hostStart(lastDiffRef.current);
  }

  function pick(text) {
    // Sélection libre et modifiable tant que le timer n'est pas écoulé…
    // sauf si le joueur a VERROUILLÉ sa réponse (barre Espace ou bouton).
    // Aucun point n'est attribué ici : la validation se fait à la réception de "reveal".
    if (revealed || !q || lockedMineRef.current) return;
    pickedRef.current = text;
    setPicked(text);
  }

  function lockMine() {
    // Verrouiller = figer sa réponse. Quand tous les joueurs l'ont fait,
    // l'hôte termine la question sans attendre le chrono.
    if (!qRef.current || lockedMineRef.current || !pickedRef.current) return;
    if (revealedRef.current) return; // pause de révélation : trop tard pour verrouiller
    setLockedMine(true);
    lockedMineRef.current = true;
    channelRef.current?.send({
      type: "broadcast", event: "lock",
      payload: { profile_id: me.id, username: me.username, avatar: me.avatar },
    });
  }

  // Barre Espace = verrouiller. preventDefault : sans lui, Espace
  // ré-activerait le bouton de réponse encore focalisé après le clic
  // (comportement natif des <button>) et ferait défiler la page.
  useEffect(() => {
    function onKey(e) {
      if (e.code !== "Space" && e.key !== " ") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return; // ne jamais voler l'espace d'un champ (ex: chat)
      e.preventDefault();
      lockMine();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const DIFFS = [
    { id: "easy", label: t("diffEasy"), color: "var(--p3)", grad: "linear-gradient(135deg, var(--p3), #7fd9c4)" },
    { id: "medium", label: t("diffMedium"), color: "var(--p4)", grad: "linear-gradient(135deg, var(--p4), var(--p2))" },
    { id: "hard", label: t("diffHard"), color: "var(--p1)", grad: "linear-gradient(135deg, var(--p1), var(--p5))" },
  ];
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const isUrgent = q && !revealed && timeLeft > 0 && timeLeft < 3000;
  // Phase courante : sert de clé au fondu enchaîné (intro -> question N -> fin).
  const phaseKey = finished ? "finished" : q ? "q" + q.index : "intro";

  return (
    <div className="panel" style={{ maxWidth: "min(720px, 92vw)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h1>{t("quizTitle")}</h1>
        {points > 0 && (
          <span style={{
            fontFamily: "'Space Mono'", fontWeight: 700, color: "var(--p3)",
            background: "rgba(182,240,76,.12)", border: "1.5px solid var(--p3)",
            borderRadius: 99, padding: "4px 10px", fontSize: 13, animation: "popIn .3s ease both"
          }} key={points}>+{points} {t("pts")}</span>
        )}
      </div>

      <Crossfade id={phaseKey}>
        {finished ? (
          <div>
            <p className="hint">{t("quizDone")}</p>
            <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{points} {t("pts")}</span></p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {isHost ? (
                <>
                  <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
                </>
              ) : (
                <p className="muted">{t("c4RejouerWait")}</p>
              )}
            </div>
          </div>
        ) : !q ? (
          isHost ? (
            <div>
              <p className="hint">{N_QUESTIONS} {t("quizIntro")}</p>
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                {DIFFS.map(d => (
                  <button key={d.id} className="btn" style={{ background: d.grad }} onClick={() => hostStart(d.id)}>
                    {d.label} <span style={{ opacity: .75, fontWeight: 600 }}>· {Math.round(ROUND_MS_BY_DIFF[d.id] / 1000)}s · +{POINTS_BY_DIFF[d.id]}{t("pts")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted">{t("waitStart")}</p>
          )
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p className="muted" style={{ margin: 0 }}>{t("question")} {q.index + 1} / {q.total}</p>
              <span style={{
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em",
                color: DIFFS.find(d => d.id === q.diff)?.color, opacity: .85
              }}>{DIFFS.find(d => d.id === q.diff)?.label}</span>
            </div>

            <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "0 0 18px" }}>
              <div style={{
                height: "100%", width: (timeLeft / roundTotal * 100) + "%",
                background: timeLeft < 3000 ? "var(--p1)" : timeLeft < roundTotal * 0.4 ? "var(--p4)" : "linear-gradient(90deg,var(--p3),var(--p1))",
                transition: "width .1s linear", animation: isUrgent ? "urgentPulse .4s ease-in-out infinite" : "none"
              }} />
            </div>

            <div style={{ position: "relative", minHeight: 78, display: "flex", alignItems: "center", marginBottom: 18 }}>
              <p style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.35, margin: 0, paddingRight: isUrgent ? 54 : 0 }}>{q.text}</p>
              {isUrgent && (
                <span key={secondsLeft} style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  fontFamily: "'Space Mono'", fontWeight: 800, fontSize: 34, color: "var(--p1)",
                  animation: "popIn .35s ease both"
                }}>{secondsLeft}</span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {q.choices.map((text, i) => {
                let bg = "rgba(255,255,255,.05)", border = "var(--line)", color = "var(--ink)", scale = 1;
                const isGood = revealed && text === q.good;
                const isWrongPick = revealed && picked === text && text !== q.good;
                if (isGood) { bg = "rgba(182,240,76,.18)"; border = "var(--p3)"; color = "var(--p3)"; scale = 1.03; }
                else if (isWrongPick) { bg = "rgba(255,93,115,.15)"; border = "var(--p1)"; color = "var(--p1)"; }
                else if (picked === text) { border = "var(--p2)"; }
                return (
                  <button key={i} disabled={revealed || lockedMine} onClick={() => pick(text)}
                    style={{
                      minHeight: 64, padding: "14px 12px", borderRadius: 14, border: `2.5px solid ${border}`, background: bg, color, fontWeight: 800, fontSize: 15,
                      transform: `scale(${scale})`, transition: "transform .2s, background .2s, border-color .2s",
                      opacity: lockedMine && !revealed && picked !== text ? .55 : 1
                    }}>
                    {isGood ? "✅ " : isWrongPick ? "❌ " : lockedMine && !revealed && picked === text ? "🔒 " : ""}{text}
                  </button>
                );
              })}
            </div>

            {!revealed && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button className="btn ghost" disabled={!picked || lockedMine} onClick={lockMine}
                    style={{ width: "auto", padding: "10px 20px", marginTop: 0, opacity: !picked && !lockedMine ? .45 : 1 }}>
                    {lockedMine ? "🔒 " + t("quizLocked") : "🔓 " + t("quizLock")}
                  </button>
                </div>
                <p className="muted" style={{ textAlign: "center", fontSize: 11.5, marginTop: 6 }}>{t("quizLockHint")}</p>
                {lockedList.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
                    {lockedList.map(r => (
                      <span key={r.profile_id} className="quiz-result-chip" style={{ borderColor: "var(--p2)" }}>
                        🔒 {r.avatar} {r.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {revealed && picked !== q.good && (
              <p className="muted" style={{ marginTop: 14 }}>
                {picked ? "" : t("tooSlow") + " "} {t("rightAnswer")} <b style={{ color: "var(--p3)" }}>{q.good}</b>
              </p>
            )}
            {revealed && roundResults.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {roundResults.map(r => (
                  <span key={r.profile_id} className="quiz-result-chip" style={{ borderColor: r.correct ? "var(--p3)" : "var(--p1)" }}>
                    {r.avatar} {r.username} {r.correct ? "✅" : "❌"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Crossfade>
    </div>
  );
}
