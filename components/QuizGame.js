"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "./Crossfade";

/* ==========================================================================
   Catégories de questions (demande 2026-07) : chaque question porte une
   CHIP de catégorie (Musique, Arts, Histoire, Langues, Géographie, Maths,
   Sports…). Deux sources :
   - un 6e élément optionnel dans la question ([texte, bonne, m1, m2, m3,
     "cat"]) — utilisé par toutes les questions AJOUTÉES en 2026-07 ;
   - sinon, une déduction par mots-clés (guessQuizCategory) pour les ~360
     questions historiques, plutôt que d'éditer chaque ligne à la main —
     déterministe, même résultat chez tous les clients (la catégorie est de
     toute façon calculée UNE fois par l'hôte et diffusée dans le payload).
   ========================================================================== */
const QUIZ_CATS = {
  geo:     { icon: "🌍", fr: "Géographie", en: "Geography" },
  hist:    { icon: "🏛️", fr: "Histoire", en: "History" },
  sci:     { icon: "🔬", fr: "Sciences", en: "Science" },
  music:   { icon: "🎵", fr: "Musique", en: "Music" },
  arts:    { icon: "🎨", fr: "Arts", en: "Arts" },
  lit:     { icon: "📖", fr: "Littérature", en: "Literature" },
  sport:   { icon: "⚽", fr: "Sports", en: "Sports" },
  lang:    { icon: "🗣️", fr: "Langues", en: "Languages" },
  maths:   { icon: "🔢", fr: "Maths", en: "Maths" },
  nature:  { icon: "🐾", fr: "Nature", en: "Nature" },
  culture: { icon: "💡", fr: "Culture G", en: "Trivia" },
};

// Déduction par mots-clés (FR + EN mélangés : une seule fonction pour les
// deux banques). ORDRE IMPORTANT : du plus spécifique au plus générique —
// "langue la plus parlée au monde" doit tomber sur Langues, pas Géographie.
const QUIZ_CAT_RULES = [
  ["music", /compos|opéra|opera|musiq|music|instrument|piano|guitare|guitar|cordes|strings|touches|keys|symphon|orchestr|chant[ée]/i],
  ["arts",  /peint|paint|joconde|mona lisa|courant artistique|art movement|sculpt|tableau/i],
  ["lit",   /écrit « |wrote '|roman|novel|poète|poet|sherlock|bd |comic/i],
  ["sport", /sport|football|soccer|match|équipe|team|olympique|olympic|judo|sumo|baseball|tennis|raquette|racket/i],
  ["lang",  /langue|language|locuteurs|speakers|dit-on|say ['"«]/i],
  ["maths", /zéros|zeros|hexagone|hexagon|côtés|sides|triangle|théorème|theorem|mathémat|mathemat|chiffres romains|roman numeral|nombre premier|prime number|carré \(|squared/i],
  ["hist",  /guerre|war |traité|treaty|bataille|battle|roi |king|reine|queen of|empereur|emperor|empire|révolution|revolution|dynastie|dynasty|napoléon|napoleon|mur de berlin|berlin wall|onu|united nations|expédition|expedition|explorateur|explorer|civilisation|civilization|colomb|columbus|pompéi|pompeii|en quelle année|in what year|1[0-9]{3}|monde en bateau|circumnavigate/i],
  ["sci",   /planète|planet|chimique|chemical|élément|element|corps humain|human body|os |bone|organe|organ|cerveau|brain|cœur|heart|poumon|lung|étoile|star|supernova|espace|space|vaisseau|spacecraft|vitesse|speed|gaz|gas|photosynthèse|photosynthesis|radioactivité|radioactivity|particule|particle|scientifique|scientist|physicien|physicist|dents|teeth|grossesse|pregnancy|satellite|lune|moon|soleil|sun |lumière|sunlight|boson|évolution|evolution|pénicilline|penicillin|ampoule|light bulb|nucléaire|nuclear|fusion|supercontinent|pangée|pangaea|thermomètre|thermometer|température|temperature|sang|blood|veines|veins|doigts|fingers|pattes|legs does an insect/i],
  ["nature", /animal|mammifère|mammal|insecte|insect|oiseau|bird|chauve-souris|bat |guépard|cheetah|fruit|légume|vegetable|oignon|onion|chien|dog|jungle|arc-en-ciel|rainbow|saison|season/i],
  ["geo",   /capitale|capital|pays|country|fleuve|river|lac |lake|mer |sea|océan|ocean|désert|desert|montagne|mountain|sommet|peak|alpes|alps|volcan|volcano|île|island|continent|détroit|strait|récif|reef|fuseaux|time zones|ville|city|monnaie|currency|tour eiffel|eiffel|statue de la liberté|statue of liberty|grande muraille|great wall|botte|boot/i],
];
function guessQuizCategory(text) {
  for (const [id, re] of QUIZ_CAT_RULES) { if (re.test(text)) return id; }
  return "culture";
}

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
    // ----- Ajouts 2026-07 (catégorie explicite en 6e position) -----
    ["Combien font 7 × 8 ?", "56", "54", "48", "64", "maths"],
    ["Combien font 100 divisé par 4 ?", "25", "20", "40", "50", "maths"],
    ["Quel sport se joue avec une raquette et un volant ?", "Le badminton", "Le tennis", "Le squash", "Le ping-pong", "sport"],
    ["Dans quel sport marque-t-on des paniers ?", "Le basket-ball", "Le handball", "Le volley", "Le rugby", "sport"],
    ["Quelle note de musique vient juste après le do ?", "Ré", "Mi", "Fa", "Si", "music"],
    ["Quel instrument le batteur d'un groupe joue-t-il ?", "La batterie", "La basse", "Le clavier", "Le triangle", "music"],
    ["Qui a peint des tournesols célèbres ?", "Van Gogh", "Picasso", "Monet", "Dalí", "arts"],
    ["Quelle couleur obtient-on en mélangeant du rouge et du blanc ?", "Le rose", "Le violet", "L'orange", "Le marron", "arts"],
    ["Comment dit-on « merci » en espagnol ?", "Gracias", "Grazie", "Danke", "Obrigado", "lang"],
    ["Quelle langue parle-t-on au Mexique ?", "L'espagnol", "Le portugais", "Le mexicain", "Le français", "lang"],
  
    // ----- Ajouts zip 121 (culture G) -----
    ["Quelle est la capitale du Royaume-Uni ?", "Londres", "Manchester", "Édimbourg", "Dublin", "geo"],
    ["Quelle est la capitale des États-Unis ?", "Washington", "New York", "Los Angeles", "Chicago", "geo"],
    ["Quel pays a la forme d'un hexagone ?", "La France", "L'Espagne", "L'Allemagne", "La Pologne", "geo"],
    ["Quelle est la capitale de la Belgique ?", "Bruxelles", "Anvers", "Liège", "Gand", "geo"],
    ["Quel fleuve traverse Paris ?", "La Seine", "La Loire", "Le Rhône", "La Garonne", "geo"],
    ["Quel pays d'Amérique du Sud a La Paz pour siège du gouvernement ?", "La Bolivie", "Le Chili", "L'Équateur", "Le Paraguay", "geo"],
    ["Dans quel pays se trouve la ville de Venise ?", "L'Italie", "La Grèce", "La Croatie", "L'Espagne", "geo"],
    ["Quelle chaîne de montagnes sépare la France de l'Espagne ?", "Les Pyrénées", "Les Alpes", "Le Jura", "Les Vosges", "geo"],
    ["Quel désert couvre une grande partie de l'Afrique du Nord ?", "Le Sahara", "Le Gobi", "L'Atacama", "Le Kalahari", "geo"],
    ["Sur quel continent se trouve l'Inde ?", "L'Asie", "L'Afrique", "L'Europe", "L'Océanie", "geo"],
    ["Dans quel pays se trouve la ville de Barcelone ?", "L'Espagne", "Le Portugal", "L'Italie", "La France", "geo"],
    ["Quel pays est célèbre pour ses tulipes et ses moulins ?", "Les Pays-Bas", "La Belgique", "Le Danemark", "L'Autriche", "geo"],
    ["Quelle ville est surnommée la Ville éternelle ?", "Rome", "Athènes", "Le Caire", "Jérusalem", "geo"],
    ["Quel océan sépare l'Europe de l'Amérique ?", "L'Atlantique", "Le Pacifique", "L'Indien", "L'Arctique", "geo"],
    ["Quelle est la capitale de la Norvège ?", "Oslo", "Stockholm", "Helsinki", "Copenhague", "geo"],
    ["Quelle est l'étoile la plus proche de la Terre ?", "Le Soleil", "Sirius", "Alpha du Centaure", "L'étoile Polaire", "sci"],
    ["Combien de planètes compte le système solaire ?", "8", "9", "7", "10", "sci"],
    ["Quel gaz les êtres humains respirent-ils pour vivre ?", "L'oxygène", "L'azote", "Le dioxyde de carbone", "L'hélium", "sci"],
    ["À quelle température l'eau bout-elle au niveau de la mer ?", "100 °C", "90 °C", "120 °C", "80 °C", "sci"],
    ["Quelle planète est la plus proche du Soleil ?", "Mercure", "Vénus", "La Terre", "Mars", "sci"],
    ["Quel scientifique a énoncé la théorie de la gravité en voyant une pomme tomber, selon la légende ?", "Newton", "Einstein", "Galilée", "Darwin", "sci"],
    ["Quel organe humain est protégé par la boîte crânienne ?", "Le cerveau", "Le cœur", "Le foie", "L'estomac", "sci"],
    ["Quel métal est liquide à température ambiante ?", "Le mercure", "Le fer", "Le cuivre", "L'aluminium", "sci"],
    ["Comment appelle-t-on la force qui nous attire vers le sol ?", "La gravité", "Le magnétisme", "La friction", "L'électricité", "sci"],
    ["Quel est le plus grand os du corps humain ?", "Le fémur", "Le tibia", "L'humérus", "La clavicule", "sci"],
    ["Quelle planète est entourée d'anneaux bien visibles ?", "Saturne", "Mars", "Vénus", "Mercure", "sci"],
    ["Quel oiseau ne peut pas voler mais court très vite ?", "L'autruche", "L'aigle", "Le faucon", "Le hibou", "nature"],
    ["Quel animal produit le miel ?", "L'abeille", "La guêpe", "La fourmi", "Le papillon", "nature"],
    ["Quel animal est connu pour changer de couleur ?", "Le caméléon", "Le crocodile", "Le lézard vert", "La tortue", "nature"],
    ["Quel animal marin possède huit bras ?", "La pieuvre", "L'étoile de mer", "Le crabe", "La méduse", "nature"],
    ["De quel arbre proviennent les glands ?", "Le chêne", "Le sapin", "Le bouleau", "Le saule", "nature"],
    ["Quel animal est surnommé le vaisseau du désert ?", "Le chameau", "Le cheval", "L'âne", "Le lama", "nature"],
    ["Quel est le plus grand félin du monde ?", "Le tigre", "Le lion", "Le léopard", "Le guépard", "nature"],
    ["Quel mammifère marin est connu pour son chant et sa taille énorme ?", "La baleine", "Le dauphin", "Le phoque", "La loutre", "nature"],
    ["Quelle fleur suit la course du soleil dans le ciel ?", "Le tournesol", "La rose", "La tulipe", "Le coquelicot", "nature"],
    ["Quel insecte est célèbre pour transformer une chenille en insecte ailé ?", "Le papillon", "La coccinelle", "La libellule", "Le criquet", "nature"],
    ["Quel animal est le symbole de la sagesse et voit bien la nuit ?", "Le hibou", "Le corbeau", "Le pigeon", "Le paon", "nature"],
    ["Qui était le premier président des États-Unis ?", "George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams", "hist"],
    ["Quel peuple antique a construit les pyramides de Gizeh ?", "Les Égyptiens", "Les Romains", "Les Grecs", "Les Perses", "hist"],
    ["Dans quel pays sont nés les Jeux olympiques antiques ?", "La Grèce", "L'Italie", "L'Égypte", "La Turquie", "hist"],
    ["Quel empereur français a été vaincu à Waterloo ?", "Napoléon", "Louis XIV", "Charlemagne", "Jules César", "hist"],
    ["Quel navire a coulé en 1912 après avoir heurté un iceberg ?", "Le Titanic", "Le Lusitania", "Le Mayflower", "Le Queen Mary", "hist"],
    ["Quel roi de France était surnommé le Roi-Soleil ?", "Louis XIV", "Louis XVI", "François Ier", "Henri IV", "hist"],
    ["Quelle grande muraille est visible en Chine ?", "La Grande Muraille", "Le mur d'Hadrien", "Le mur de Berlin", "Le limes", "hist"],
    ["Quel explorateur génois a atteint l'Amérique en 1492 ?", "Christophe Colomb", "Vasco de Gama", "Magellan", "Marco Polo", "hist"],
    ["Quel ustensile le peintre utilise-t-il pour mélanger ses couleurs ?", "La palette", "Le chevalet", "Le cadre", "Le vernis", "arts"],
    ["Quel instrument possède des cordes et se joue avec un archet ?", "Le violon", "La flûte", "La trompette", "Le tambour", "music"],
    ["Combien de musiciens forment un quatuor ?", "4", "3", "5", "2", "music"],
    ["Quel personnage de conte voit son nez grandir quand il ment ?", "Pinocchio", "Peter Pan", "Aladdin", "Bambi", "lit"],
    ["Quel détective anglais habite au 221B Baker Street ?", "Sherlock Holmes", "Hercule Poirot", "James Bond", "Arsène Lupin", "lit"],
    ["Quelles couleurs mélange-t-on pour obtenir de l'orange ?", "Rouge et jaune", "Bleu et jaune", "Rouge et bleu", "Bleu et blanc", "arts"],
    ["Dans quel musée parisien est exposée la Joconde ?", "Le Louvre", "Le musée d'Orsay", "Le Centre Pompidou", "Le château de Versailles", "arts"],
    ["Combien de joueurs une équipe de basket aligne-t-elle sur le terrain ?", "5", "6", "7", "4", "sport"],
    ["Dans quel sport utilise-t-on un filet, une raquette et des balles jaunes ?", "Le tennis", "Le golf", "Le rugby", "Le hockey", "sport"],
    ["Combien de trous compte un parcours de golf classique ?", "18", "9", "12", "24", "sport"],
    ["Quel pays a inventé le football moderne ?", "L'Angleterre", "Le Brésil", "L'Italie", "L'Espagne", "sport"],
    ["Dans quel sport peut-on marquer un essai ?", "Le rugby", "Le tennis", "Le basket", "Le judo", "sport"],
    ["Quelle course cycliste française est la plus célèbre ?", "Le Tour de France", "Le Giro", "La Vuelta", "Paris-Roubaix", "sport"],
    ["Dans quel pays le portugais est-il la langue officielle ?", "Le Portugal", "L'Espagne", "L'Italie", "La Roumanie", "lang"],
    ["Comment dit-on « merci » en allemand ?", "Danke", "Gracias", "Grazie", "Merci beaucoup", "lang"],
    ["Quelle langue est parlée officiellement au Brésil ?", "Le portugais", "L'espagnol", "Le français", "L'anglais", "lang"],
    ["Combien font 12 × 12 ?", "144", "124", "132", "121", "maths"],
    ["Combien de secondes y a-t-il dans deux minutes ?", "120", "100", "60", "180", "maths"],
    ["Combien vaut la moitié de 250 ?", "125", "120", "130", "150", "maths"],
    ["Combien de faces possède un dé classique ?", "6", "4", "8", "12", "maths"],
    ["Quelle boisson chaude provient de grains torréfiés ?", "Le café", "Le lait", "Le jus d'orange", "Le thé vert", "culture"],
    ["De quel pays la pizza est-elle originaire ?", "L'Italie", "La France", "La Grèce", "L'Espagne", "culture"],
    ["Combien de cartes compte un jeu classique sans les jokers ?", "52", "54", "48", "60", "culture"],
    ["Quelle épice précieuse provient d'une fleur et colore le riz en jaune ?", "Le safran", "Le paprika", "Le curcuma", "La cannelle", "culture"],
    ["Quelle est la capitale du Danemark ?", "Copenhague", "Oslo", "Stockholm", "Helsinki", "geo"],
    ["Quel pays est en forme de botte ?", "L'Italie", "La Grèce", "L'Espagne", "Le Portugal", "geo"],
    ["Quelle est la capitale de la Pologne ?", "Varsovie", "Cracovie", "Gdansk", "Poznan", "geo"],
    ["Quel pays possède la plus grande population du monde en Europe ?", "La Russie", "L'Allemagne", "La France", "L'Italie", "geo"],
    ["Quelle mer se trouve entre l'Europe et l'Afrique ?", "La Méditerranée", "La mer Noire", "La mer Baltique", "La mer du Nord", "geo"],
    ["Quelle est la capitale de la Slovaquie ?", "Bratislava", "Prague", "Ljubljana", "Zagreb", "geo"],
    ["Dans quel pays se trouve la ville de Marrakech ?", "Le Maroc", "L'Algérie", "La Tunisie", "L'Égypte", "geo"],
    ["Quel est le plus petit continent du monde ?", "L'Océanie", "L'Europe", "L'Antarctique", "L'Amérique du Sud", "geo"],
    ["Quelle ville américaine est surnommée la Grosse Pomme ?", "New York", "Los Angeles", "Chicago", "Boston", "geo"],
    ["Quel appareil sert à voir les objets très lointains dans le ciel ?", "Le télescope", "Le microscope", "Le thermomètre", "La boussole", "sci"],
    ["Combien de couleurs distingue-t-on dans un arc-en-ciel ?", "7", "5", "6", "8", "sci"],
    ["Quel est le gaz que les plantes rejettent le jour ?", "L'oxygène", "Le méthane", "L'hélium", "L'hydrogène", "sci"],
    ["Quel organe filtre le sang et produit l'urine ?", "Les reins", "Le cœur", "Les poumons", "Le cerveau", "sci"],
    ["Quelle est la vitesse la plus rapide de l'univers ?", "La lumière", "Le son", "Le vent", "Une fusée", "sci"],
    ["Quel savant a rendu célèbre la formule E = mc² ?", "Einstein", "Newton", "Darwin", "Galilée", "sci"],
    ["Quelle planète est surnommée la géante gazeuse la plus grande ?", "Jupiter", "Mars", "Vénus", "Mercure", "sci"],
    ["Comment appelle-t-on la couche qui protège la Terre des rayons du Soleil ?", "La couche d'ozone", "La stratosphère nulle", "Le champ nul", "La ionosphère faible", "sci"],
    ["Quel est l'animal le plus grand qui vit sur la terre ferme ?", "L'éléphant", "La girafe", "L'hippopotame", "Le rhinocéros", "nature"],
    ["Quel animal dort la tête en bas dans les grottes ?", "La chauve-souris", "Le hibou", "L'écureuil", "La taupe", "nature"],
    ["Quel reptile possède une carapace ?", "La tortue", "Le serpent", "Le lézard", "Le crocodile", "nature"],
    ["Quel grand animal noir et blanc mange surtout du bambou ?", "Le panda", "Le zèbre", "Le pingouin", "Le tapir", "nature"],
    ["Quel oiseau est le symbole de la France ?", "Le coq", "L'aigle", "La colombe", "Le corbeau", "nature"],
    ["Quel animal change sa fourrure en blanc l'hiver dans le Grand Nord ?", "Le renard polaire", "Le loup gris", "Le castor", "Le raton laveur", "nature"],
    ["Combien de bosses possède un dromadaire ?", "1", "2", "3", "0", "nature"],
    ["Quelle Révolution a débuté en France en 1789 ?", "La Révolution française", "La Révolution russe", "La Révolution industrielle", "La Commune", "hist"],
    ["Quel mur, symbole de la guerre froide, est tombé en 1989 ?", "Le mur de Berlin", "La Grande Muraille", "Le mur d'Hadrien", "Le mur des Lamentations", "hist"],
    ["Quelle héroïne française a mené les armées durant la guerre de Cent Ans ?", "Jeanne d'Arc", "Marie-Antoinette", "Catherine de Médicis", "Aliénor d'Aquitaine", "hist"],
    ["Quelle ville italienne fut le cœur de l'Empire romain ?", "Rome", "Milan", "Naples", "Venise", "hist"],
    ["Quel président américain a aboli l'esclavage ?", "Abraham Lincoln", "George Washington", "Franklin Roosevelt", "John Kennedy", "hist"],
    ["Sur quel continent la civilisation maya s'est-elle développée ?", "L'Amérique", "L'Asie", "L'Afrique", "L'Europe", "hist"],
    ["Combien de cordes possède un violon ?", "4", "6", "5", "3", "music"],
    ["Quel groupe de rock britannique a chanté « Yesterday » ?", "Les Beatles", "Queen", "U2", "Les Rolling Stones", "music"],
    ["Quel peintre espagnol a cofondé le cubisme ?", "Picasso", "Dalí", "Miró", "Goya", "arts"],
    ["Qui a écrit les aventures d'un jeune sorcier nommé Harry Potter ?", "J.K. Rowling", "Roald Dahl", "Tolkien", "C.S. Lewis", "lit"],
    ["Dans quelle ville se déroule l'histoire de Roméo et Juliette ?", "Vérone", "Venise", "Rome", "Florence", "lit"],
    ["De quelle couleur est le célèbre pont Golden Gate de San Francisco ?", "Orange", "Rouge", "Jaune", "Bleu", "arts"],
    ["Quel maillot le meneur du Tour de France porte-t-il ?", "Le maillot jaune", "Le maillot vert", "Le maillot rouge", "Le maillot bleu", "sport"],
    ["Dans quel sport porte-t-on des gants et monte-t-on sur un ring ?", "La boxe", "Le tennis", "Le cyclisme", "La natation", "sport"],
    ["Quel objet frappe-t-on avec un club au golf ?", "La balle", "Le volant", "La rondelle", "Le ballon", "sport"],
    ["Combien de temps dure une mi-temps au football ?", "45 minutes", "30 minutes", "60 minutes", "20 minutes", "sport"],
    ["Dans quel sport parle-t-on de service, de ace et de filet ?", "Le tennis", "Le football", "Le rugby", "Le judo", "sport"],
    ["Comment dit-on « au revoir » en italien ?", "Arrivederci", "Adios", "Auf Wiedersehen", "Tot ziens", "lang"],
    ["Quelle langue est parlée officiellement en Autriche ?", "L'allemand", "L'autrichien", "Le hongrois", "L'italien", "lang"],
    ["Dans quel pays parle-t-on principalement le japonais ?", "Le Japon", "La Chine", "La Corée", "La Thaïlande", "lang"],
    ["Combien font 15 × 4 ?", "60", "45", "50", "65", "maths"],
    ["Combien de degrés fait un angle droit ?", "90", "45", "180", "360", "maths"],
    ["Combien de zéros y a-t-il dans mille ?", "3", "2", "4", "5", "maths"],
    ["Quel est le résultat de 8 au carré ?", "64", "16", "48", "81", "maths"],
    ["Combien de côtés a un pentagone ?", "5", "6", "4", "7", "maths"],
    ["De quel pays le sushi est-il originaire ?", "Le Japon", "La Chine", "La Thaïlande", "La Corée", "culture"],
    ["Quel jour de la semaine vient après le mercredi ?", "Le jeudi", "Le mardi", "Le vendredi", "Le lundi", "culture"],
    ["Combien de pièces compose un jeu d'échecs par joueur au départ ?", "16", "12", "20", "8", "culture"],
    ["Quelle fête célèbre-t-on le 25 décembre ?", "Noël", "Pâques", "Halloween", "Le Nouvel An", "culture"],
    ["Quel condiment rouge accompagne souvent les frites ?", "Le ketchup", "La moutarde", "Le vinaigre", "Le miel", "culture"],
    ["Quelle est la couleur traditionnelle du rubis ?", "Rouge", "Bleu", "Vert", "Jaune", "culture"],
    ["Quel sens permet de percevoir les sons ?", "L'ouïe", "La vue", "Le goût", "L'odorat", "sci"],
    ["Quelle est la capitale de l'Irlande ?", "Dublin", "Belfast", "Cork", "Galway", "geo"],
    ["Quel animal est réputé pour sa mémoire et sa trompe ?", "L'éléphant", "Le singe", "Le dauphin", "Le perroquet", "nature"],
    ["Quel pharaon est célèbre pour son masque funéraire en or ?", "Toutânkhamon", "Ramsès III", "Khéops", "Néfertiti", "hist"],
    ["Quel sport se joue avec une crosse et une rondelle sur la glace ?", "Le hockey sur glace", "Le curling", "Le patinage", "Le bobsleigh", "sport"],
    ["Quelle est la capitale de la Hongrie ?", "Budapest", "Vienne", "Prague", "Bratislava", "geo"],
    ["Quel pays d'Amérique du Nord a pour capitale Ottawa ?", "Le Canada", "Les États-Unis", "Le Mexique", "Cuba", "geo"],
    ["Quelle partie de la plante pousse sous la terre ?", "La racine", "La fleur", "La feuille", "Le fruit", "sci"],
    ["Quel appareil indique le Nord ?", "La boussole", "Le baromètre", "Le thermomètre", "L'altimètre", "sci"],
    ["Quel animal est le plus rapide dans les airs en piqué ?", "Le faucon pèlerin", "Le moineau", "Le pigeon", "La mouette", "nature"],
    ["Quelle ancienne cité est célèbre pour son Colisée ?", "Rome", "Athènes", "Sparte", "Carthage", "hist"],
    ["Quel instrument à vent est doré et possède un pavillon ?", "La trompette", "Le violon", "Le piano", "La harpe", "music"],
    ["Quel artiste néerlandais s'est coupé une oreille ?", "Van Gogh", "Rembrandt", "Vermeer", "Mondrian", "arts"],
    ["Quel trophée récompense le vainqueur de la Coupe du monde de football ?", "La coupe du monde", "Le ballon d'or", "La coupe Davis", "Le maillot jaune", "sport"],
    ["Comment dit-on « chat » en anglais ?", "Cat", "Dog", "Cow", "Fish", "lang"],
    ["Combien font 144 divisé par 12 ?", "12", "14", "11", "24", "maths"],
    ["Quelle célèbre tour penche en Italie ?", "La tour de Pise", "La tour Eiffel", "Big Ben", "La tour de Londres", "culture"],
    ["Quel métal précieux jaune est le plus recherché en bijouterie ?", "L'or", "Le fer", "Le zinc", "L'étain", "culture"],
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
    // ----- Ajouts 2026-07 (catégorie explicite en 6e position) -----
    ["Combien font 12 au carré ?", "144", "124", "132", "154", "maths"],
    ["Quel est le seul nombre premier pair ?", "2", "1", "4", "9", "maths"],
    ["Quel compositeur a écrit la « Lettre à Élise » ?", "Beethoven", "Mozart", "Chopin", "Liszt", "music"],
    ["Quel groupe britannique a chanté « Hey Jude » ?", "Les Beatles", "Les Rolling Stones", "Queen", "Pink Floyd", "music"],
    ["Quel peintre est célèbre pour ses nénuphars ?", "Claude Monet", "Édouard Manet", "Auguste Renoir", "Paul Cézanne", "arts"],
    ["Quel sculpteur a réalisé « Le Penseur » ?", "Auguste Rodin", "Camille Claudel", "Michel-Ange", "Constantin Brancusi", "arts"],
    ["Dans quel sport peut-on réussir un « grand chelem » de quatre tournois majeurs ?", "Le tennis", "Le golf", "La boxe", "L'escrime", "sport"],
    ["Tous les combien d'années ont lieu les Jeux olympiques d'été ?", "4 ans", "2 ans", "5 ans", "6 ans", "sport"],
    ["Combien de langues officielles compte la Suisse ?", "4", "2", "3", "5", "lang"],
    ["Comment dit-on « bonjour » en italien ?", "Buongiorno", "Buenos días", "Guten Tag", "Bom dia", "lang"],
  
    // ----- Ajouts zip 121 (culture G) -----
    ["Quelle est la capitale de l'Argentine ?", "Buenos Aires", "Santiago", "Montevideo", "Lima", "geo"],
    ["Quel pays possède le plus de fuseaux horaires métropolitains d'un seul tenant ?", "La Russie", "Le Canada", "La Chine", "Le Brésil", "geo"],
    ["Sur quel fleuve est bâtie la ville du Caire ?", "Le Nil", "Le Tigre", "L'Euphrate", "Le Congo", "geo"],
    ["Quelle est la capitale du Venezuela ?", "Caracas", "Maracaibo", "Valencia", "Bogota", "geo"],
    ["Quelle est la capitale de la Croatie ?", "Zagreb", "Split", "Dubrovnik", "Rijeka", "geo"],
    ["Quelle est la plus longue chaîne de montagnes émergée du monde ?", "Les Andes", "L'Himalaya", "Les Rocheuses", "Les Alpes", "geo"],
    ["Quel pays africain a pour capitale Le Caire ?", "L'Égypte", "Le Soudan", "La Libye", "Le Maroc", "geo"],
    ["Quelle est la capitale de la Finlande ?", "Helsinki", "Oslo", "Stockholm", "Tallinn", "geo"],
    ["Quel pays est traversé par le plus long fleuve du monde, l'Amazone ?", "Le Brésil", "La Colombie", "Le Venezuela", "L'Équateur", "geo"],
    ["Quelle ville est bâtie sur cent îles reliées par des canaux, en Italie ?", "Venise", "Naples", "Gênes", "Pise", "geo"],
    ["Quel pays possède les villes de Bombay et de New Delhi ?", "L'Inde", "Le Pakistan", "Le Bangladesh", "Le Sri Lanka", "geo"],
    ["Quelle est la capitale de l'Écosse ?", "Édimbourg", "Glasgow", "Dublin", "Cardiff", "geo"],
    ["En quelle année a commencé la Première Guerre mondiale ?", "1914", "1918", "1939", "1905", "hist"],
    ["Quel général romain a franchi le Rubicon ?", "Jules César", "Auguste", "Pompée", "Marc Antoine", "hist"],
    ["Quelle reine d'Égypte s'est alliée à César puis à Marc Antoine ?", "Cléopâtre", "Néfertiti", "Hatchepsout", "Isis", "hist"],
    ["Quel roi de France a été guillotiné pendant la Révolution ?", "Louis XVI", "Louis XIV", "Charles X", "Louis XV", "hist"],
    ["En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?", "1969", "1961", "1972", "1957", "hist"],
    ["Quel empire était dirigé depuis Constantinople ?", "L'Empire byzantin", "L'Empire mongol", "L'Empire aztèque", "L'Empire zoulou", "hist"],
    ["Quelle catastrophe a détruit la ville de Pompéi en l'an 79 ?", "L'éruption du Vésuve", "Un tremblement de terre", "Un raz-de-marée", "Un incendie", "hist"],
    ["Quel navigateur portugais a lancé le premier tour du monde en bateau ?", "Magellan", "Vasco de Gama", "Christophe Colomb", "Amerigo Vespucci", "hist"],
    ["Quelle dynastie chinoise a donné son nom à la majeure partie de la Grande Muraille visible aujourd'hui ?", "Les Ming", "Les Qing", "Les Han", "Les Tang", "hist"],
    ["Quel scientifique italien a défendu que la Terre tourne autour du Soleil ?", "Galilée", "Copernic", "Kepler", "Newton", "hist"],
    ["Quel est le symbole chimique du fer ?", "Fe", "Fr", "Ir", "Al", "sci"],
    ["Combien de chromosomes possède un être humain ?", "46", "23", "48", "44", "sci"],
    ["Quelle planète est surnommée l'étoile du Berger, bien qu'elle ne soit pas une étoile ?", "Vénus", "Mars", "Jupiter", "Saturne", "sci"],
    ["Quel gaz est responsable de l'effet de serre le plus connu ?", "Le dioxyde de carbone", "L'oxygène", "L'hélium", "L'azote", "sci"],
    ["Quel savant a formulé les trois lois du mouvement ?", "Newton", "Einstein", "Bohr", "Hawking", "sci"],
    ["Quel est l'organe le plus grand du corps humain ?", "La peau", "Le foie", "Les poumons", "Le cerveau", "sci"],
    ["Comment appelle-t-on un animal qui mange uniquement des plantes ?", "Un herbivore", "Un carnivore", "Un omnivore", "Un insectivore", "sci"],
    ["Quelle est l'unité de mesure de la force électrique appelée intensité ?", "L'ampère", "Le volt", "Le watt", "Le joule", "sci"],
    ["Quel scientifique a découvert la pénicilline ?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Robert Koch", "sci"],
    ["Combien de temps met la lumière du Soleil pour atteindre la Terre, environ ?", "8 minutes", "1 minute", "1 heure", "1 seconde", "sci"],
    ["Quel métal les aimants attirent-ils le plus facilement ?", "Le fer", "L'or", "Le cuivre", "L'argent", "sci"],
    ["Qui a peint « La Nuit étoilée » ?", "Van Gogh", "Monet", "Cézanne", "Gauguin", "arts"],
    ["Quel courant artistique est associé à Claude Monet ?", "L'impressionnisme", "Le cubisme", "Le surréalisme", "Le baroque", "arts"],
    ["Quel compositeur autrichien a écrit « La Flûte enchantée » ?", "Mozart", "Beethoven", "Bach", "Vivaldi", "music"],
    ["De quel pays le tango est-il originaire ?", "L'Argentine", "L'Espagne", "Le Brésil", "Le Mexique", "music"],
    ["Qui a écrit le roman « Madame Bovary » ?", "Gustave Flaubert", "Émile Zola", "Stendhal", "Balzac", "lit"],
    ["Quel écrivain a créé le personnage de Sherlock Holmes ?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Jules Verne", "lit"],
    ["Quel auteur français a écrit « Vingt mille lieues sous les mers » ?", "Jules Verne", "Victor Hugo", "Molière", "Voltaire", "lit"],
    ["Quel sculpteur français a réalisé « Le Penseur » ?", "Rodin", "Camille Claudel", "Michel-Ange", "Giacometti", "arts"],
    ["Dans quel sport peut-on réaliser un « grand chelem » de quatre tournois majeurs ?", "Le tennis", "Le football", "Le basket", "Le cyclisme", "sport"],
    ["Combien de joueurs compose une équipe de rugby à XV sur le terrain ?", "15", "13", "11", "7", "sport"],
    ["Quel pays a inventé le judo ?", "Le Japon", "La Chine", "La Corée", "La Thaïlande", "sport"],
    ["Quelle distance parcourt-on lors d'un marathon officiel ?", "42 km", "21 km", "50 km", "30 km", "sport"],
    ["Quel joueur argentin a marqué le but de la « main de Dieu » en 1986 ?", "Maradona", "Messi", "Pelé", "Zidane", "sport"],
    ["Combien de langues officielles compte la Belgique ?", "3", "2", "1", "4", "lang"],
    ["De quelle langue le mot « pyjama » est-il originaire ?", "Le persan", "Le latin", "Le grec", "L'arabe", "lang"],
    ["Quelle est la valeur approximative du nombre Pi ?", "3,14", "2,72", "1,61", "3,41", "maths"],
    ["Combien de faces possède un cube ?", "6", "8", "4", "12", "maths"],
    ["Comment appelle-t-on un triangle dont les trois côtés sont égaux ?", "Équilatéral", "Isocèle", "Rectangle", "Scalène", "maths"],
    ["Quel est le plus grand oiseau du monde ?", "L'autruche", "L'aigle royal", "Le condor", "Le pélican", "nature"],
    ["Quel animal possède le cou le plus long ?", "La girafe", "L'autruche", "Le flamant rose", "Le lama", "nature"],
    ["Quelle est la seule espèce de manchot vivant naturellement à l'équateur ?", "Le manchot des Galapagos", "Le manchot empereur", "Le manchot royal", "Le gorfou", "nature"],
    ["Quel pays est le berceau des Jeux olympiques modernes, relancés en 1896 ?", "La Grèce", "La France", "l'Italie", "Le Royaume-Uni", "culture"],
    ["Quel plat italien à base de pâtes fines se sert souvent à la bolognaise ?", "Les spaghettis", "Le risotto", "La polenta", "Les gnocchis", "culture"],
    ["Quelle boisson pétillante française porte le nom d'une région viticole ?", "Le champagne", "Le porto", "Le whisky", "La vodka", "culture"],
    ["Quelle est la capitale de la Thaïlande ?", "Bangkok", "Chiang Mai", "Phuket", "Pattaya", "geo"],
    ["Quel pays possède la plus grande superficie du monde ?", "La Russie", "Le Canada", "La Chine", "Les États-Unis", "geo"],
    ["Quel désert froid s'étend en Mongolie et en Chine ?", "Le Gobi", "Le Sahara", "Le Kalahari", "L'Atacama", "geo"],
    ["Quelle est la capitale de la Bulgarie ?", "Sofia", "Bucarest", "Belgrade", "Skopje", "geo"],
    ["Quel canal relie la Méditerranée à la mer Rouge ?", "Le canal de Suez", "Le canal de Panama", "Le canal de Corinthe", "Le canal de Kiel", "geo"],
    ["Quel pays a la forme d'une longue bande le long de l'océan Pacifique ?", "Le Chili", "Le Pérou", "L'Argentine", "La Bolivie", "geo"],
    ["Quelle est la capitale de l'Inde ?", "New Delhi", "Bombay", "Calcutta", "Bangalore", "geo"],
    ["Quel pays scandinave a pour capitale Stockholm ?", "La Suède", "La Norvège", "Le Danemark", "La Finlande", "geo"],
    ["Quelle grande île se trouve au sud-est de l'Afrique ?", "Madagascar", "Le Sri Lanka", "La Sardaigne", "Zanzibar", "geo"],
    ["Quelle est la capitale du Mexique ?", "Mexico", "Guadalajara", "Cancun", "Monterrey", "geo"],
    ["Quelle guerre a opposé les États-Unis du Nord et du Sud ?", "La guerre de Sécession", "La guerre d'indépendance", "La guerre du Vietnam", "La guerre de 1812", "hist"],
    ["Quel savant grec a crié « Eurêka » dans son bain ?", "Archimède", "Pythagore", "Aristote", "Thalès", "hist"],
    ["Quelle bataille de 1815 a scellé le sort de Napoléon ?", "Waterloo", "Austerlitz", "Iéna", "Marengo", "hist"],
    ["Quel roi anglais a fondé l'Église anglicane pour divorcer ?", "Henri VIII", "Richard Cœur de Lion", "Georges III", "Guillaume le Conquérant", "hist"],
    ["Quelle civilisation a bâti le Machu Picchu au Pérou ?", "Les Incas", "Les Mayas", "Les Aztèques", "Les Olmèques", "hist"],
    ["En quelle année la Seconde Guerre mondiale s'est-elle terminée ?", "1945", "1939", "1918", "1950", "hist"],
    ["Quel empereur a fait construire le Colisée à Rome ?", "Vespasien", "Néron", "Trajan", "Auguste", "hist"],
    ["Quel explorateur vénitien a voyagé jusqu'en Chine au XIIIe siècle ?", "Marco Polo", "Christophe Colomb", "Magellan", "Vasco de Gama", "hist"],
    ["Quelle femme scientifique a reçu deux prix Nobel ?", "Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Lise Meitner", "hist"],
    ["Quel est le symbole chimique de l'oxygène ?", "O", "Ox", "Og", "Om", "sci"],
    ["Quelle est la planète la plus chaude du système solaire ?", "Vénus", "Mercure", "Mars", "Jupiter", "sci"],
    ["Comment appelle-t-on la transformation d'un liquide en gaz ?", "L'évaporation", "La condensation", "La fusion", "La solidification", "sci"],
    ["Quel savant a énoncé le principe de la poussée sur un corps plongé dans un fluide ?", "Archimède", "Newton", "Pascal", "Bernoulli", "sci"],
    ["Quel est le composant principal du Soleil ?", "L'hydrogène", "L'oxygène", "Le fer", "Le carbone", "sci"],
    ["Combien de paires de côtes possède un être humain en général ?", "12", "10", "14", "8", "sci"],
    ["Quel scientifique danois a donné son nom à une échelle de température ?", "Celsius (suédois)", "Kelvin", "Fahrenheit", "Newton", "sci"],
    ["Quelle est la partie du cerveau associée à l'équilibre et à la coordination ?", "Le cervelet", "Le cortex", "L'hypophyse", "Le bulbe", "sci"],
    ["Quel phénomène provoque les marées ?", "L'attraction de la Lune", "Le vent", "La rotation des nuages", "Les courants chauds", "sci"],
    ["Quel gaz rend l'eau gazeuse pétillante ?", "Le dioxyde de carbone", "L'oxygène", "L'hydrogène", "L'azote", "sci"],
    ["Quel peintre a réalisé le plafond de la chapelle Sixtine ?", "Michel-Ange", "Raphaël", "Léonard de Vinci", "Le Caravage", "arts"],
    ["Quel compositeur baroque a écrit l'oratorio « Le Messie » ?", "Haendel", "Bach", "Telemann", "Purcell", "music"],
    ["Quel instrument à clavier possède des marteaux frappant des cordes ?", "Le piano", "L'orgue", "L'accordéon", "Le clavecin", "music"],
    ["Qui a écrit la pièce « Roméo et Juliette » ?", "Shakespeare", "Molière", "Racine", "Corneille", "lit"],
    ["Quel auteur a écrit « Le Petit Prince » ?", "Saint-Exupéry", "Camus", "Sartre", "Proust", "lit"],
    ["De quel pays est originaire le peintre Salvador Dalí ?", "L'Espagne", "L'Italie", "La France", "Le Portugal", "arts"],
    ["Quel style musical est né à La Nouvelle-Orléans au début du XXe siècle ?", "Le jazz", "Le reggae", "La techno", "Le flamenco", "music"],
    ["Combien de bases compte un terrain de baseball ?", "4", "3", "5", "2", "sport"],
    ["Dans quel pays s'est tenue la première Coupe du monde de football, en 1930 ?", "L'Uruguay", "Le Brésil", "L'Italie", "La France", "sport"],
    ["Dans quel sport le Tour de France est-il l'épreuve reine ?", "Le cyclisme", "La course à pied", "La natation", "L'aviron", "sport"],
    ["Combien de points vaut un panier à trois points au basket ?", "3", "2", "1", "4", "sport"],
    ["Quel sport de combat japonais oppose deux lutteurs très corpulents ?", "Le sumo", "Le karaté", "L'aïkido", "Le kendo", "sport"],
    ["Quelle langue compte le plus de locuteurs natifs dans le monde ?", "Le mandarin", "L'anglais", "L'espagnol", "L'hindi", "lang"],
    ["De quelle langue ancienne le français est-il principalement issu ?", "Le latin", "Le grec", "Le celte", "Le germanique", "lang"],
    ["Comment appelle-t-on un nombre divisible uniquement par 1 et par lui-même ?", "Un nombre premier", "Un nombre pair", "Un nombre carré", "Un nombre décimal", "maths"],
    ["Combien vaut 2 puissance 10 ?", "1024", "512", "2048", "100", "maths"],
    ["Combien de diagonales possède un carré ?", "2", "4", "1", "3", "maths"],
    ["Quel animal terrestre a la plus longue durée de gestation ?", "L'éléphant", "La girafe", "Le cheval", "L'ours", "nature"],
    ["Quel arbre peut vivre plusieurs milliers d'années et pousse en Californie ?", "Le séquoia", "Le chêne", "Le baobab", "Le pin", "nature"],
    ["Quel venin d'animal marin peut être mortel malgré sa forme de méduse ?", "La méduse-boîte", "L'étoile de mer", "Le corail", "L'anémone", "nature"],
    ["Quel pays est le principal producteur de café au monde ?", "Le Brésil", "La Colombie", "L'Éthiopie", "Le Vietnam", "culture"],
    ["Quelle monnaie est utilisée au Japon ?", "Le yen", "Le won", "Le yuan", "Le baht", "culture"],
    ["Quel fromage à trous est emblématique de la Suisse ?", "L'emmental", "Le camembert", "Le roquefort", "La mozzarella", "culture"],
    ["Quelle fête irlandaise célèbre-t-on le 17 mars ?", "La Saint-Patrick", "Halloween", "Thanksgiving", "Pâques", "culture"],
    ["Quelle est la capitale de l'Algérie ?", "Alger", "Oran", "Constantine", "Annaba", "geo"],
    ["Quelle ville allemande fut divisée par un mur pendant la guerre froide ?", "Berlin", "Munich", "Hambourg", "Francfort", "hist"],
    ["Quel scientifique a inventé le paratonnerre ?", "Benjamin Franklin", "Thomas Edison", "Nikola Tesla", "Michael Faraday", "sci"],
    ["Dans quelle ville se trouve le musée du Prado ?", "Madrid", "Barcelone", "Rome", "Lisbonne", "arts"],
    ["Quel poète italien a écrit « La Divine Comédie » ?", "Dante", "Pétrarque", "Boccace", "Virgile", "lit"],
    ["Quelle épreuve d'athlétisme consiste à lancer un disque le plus loin possible ?", "Le lancer du disque", "Le saut en hauteur", "Le triple saut", "Le 100 mètres", "sport"],
    ["Quel insecte vit dans une ruche organisée autour d'une reine ?", "L'abeille", "La fourmi", "La sauterelle", "Le moustique", "nature"],
    ["Quel mathématicien grec est connu pour un théorème sur les triangles rectangles ?", "Pythagore", "Euclide", "Archimède", "Thalès", "maths"],
    ["De quel pays le flamenco est-il une danse traditionnelle ?", "L'Espagne", "Le Portugal", "L'Italie", "La Grèce", "culture"],
    ["Quel organe du corps humain produit l'insuline ?", "Le pancréas", "Le foie", "La rate", "Les reins", "sci"],
    ["Quel minéral constitue le composant principal du sable commun ?", "La silice", "Le calcaire", "Le gypse", "L'argile", "sci"],
    ["Quel métal est principalement extrait du minerai appelé bauxite ?", "L'aluminium", "Le fer", "Le cuivre", "Le zinc", "sci"],
    ["De combien de cavités se compose le cœur humain ?", "4", "2", "3", "5", "sci"],
    ["Quel peintre français est réputé pour ses tableaux de danseuses ?", "Edgar Degas", "Auguste Renoir", "Claude Monet", "Édouard Manet", "arts"],
    ["Qui est l'auteur du recueil « Les Fleurs du mal » ?", "Charles Baudelaire", "Arthur Rimbaud", "Paul Verlaine", "Stéphane Mallarmé", "lit"],
    ["Comment appelle-t-on un mot qui se lit pareil dans les deux sens ?", "Un palindrome", "Un pléonasme", "Un synonyme", "Un homonyme", "lang"],
    ["Quel pays a une feuille d'érable rouge sur son drapeau ?", "Le Canada", "La Suisse", "Le Japon", "Le Liban", "geo"],
    ["Quelle note de musique se trouve entre le fa et le la ?", "Le sol", "Le do", "Le si", "Le mi", "music"],
    ["Quel métal est le meilleur conducteur électrique ?", "L'argent", "Le cuivre", "L'or", "L'aluminium", "sci"],
    ["Quel sport de glisse se pratique sur une planche unique fixée aux pieds ?", "Le snowboard", "Le ski alpin", "La luge", "Le bobsleigh", "sport"],
    ["Dans quelle ville brésilienne se déroule le carnaval le plus célèbre ?", "Rio de Janeiro", "Salvador", "São Paulo", "Recife", "geo"],
    ["Quel écrivain britannique a publié le roman « 1984 » ?", "George Orwell", "Aldous Huxley", "H.G. Wells", "Ray Bradbury", "lit"],
    ["Quel est le point culminant de l'Europe occidentale ?", "Le Mont Blanc", "Le Cervin", "Le mont Elbrouz", "L'Aconcagua", "geo"],
    ["Quelle vitamine est principalement produite par la peau au soleil ?", "La vitamine D", "La vitamine C", "La vitamine A", "La vitamine B12", "sci"],
    ["Quel savant a été récompensé pour ses travaux et est mort en 1955, célèbre pour la relativité ?", "Einstein", "Bohr", "Planck", "Fermi", "hist"],
    ["Quel peintre néerlandais est célèbre pour « La Jeune Fille à la perle » ?", "Vermeer", "Rembrandt", "Van Gogh", "Mondrian", "arts"],
    ["Quel gaz plus léger que l'air était utilisé dans les dirigeables ?", "L'hélium", "Le dioxyde de carbone", "L'oxygène", "Le méthane", "sci"],
    ["Quel canal artificiel relie l'Atlantique au Pacifique en Amérique centrale ?", "Le canal de Panama", "Le canal de Suez", "Le canal de Corinthe", "Le canal de Kiel", "geo"],
    ["Quel fromage suisse est célèbre pour ses trous ?", "L'emmental", "Le gruyère", "Le comté", "Le brie", "culture"],
    ["Quel est le plus long os du squelette humain ?", "Le fémur", "Le tibia", "L'humérus", "Le péroné", "sci"],
    ["Quel roi de France était surnommé le Bien-Aimé au début de son règne ?", "Louis XV", "Louis XIII", "Charles VII", "Philippe le Bel", "hist"],
    ["Combien font 15 % de 200 ?", "30", "25", "35", "20", "maths"],
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
    // ----- Ajouts 2026-07 (catégorie explicite en 6e position) -----
    ["Combien vaut la somme des angles d'un triangle ?", "180 degrés", "90 degrés", "270 degrés", "360 degrés", "maths"],
    ["Quel nombre est représenté par la lettre M en chiffres romains ?", "1000", "500", "100", "50", "maths"],
    ["Quel compositeur français a écrit le « Boléro » ?", "Maurice Ravel", "Claude Debussy", "Erik Satie", "Gabriel Fauré", "music"],
    ["Combien de symphonies Beethoven a-t-il achevées ?", "9", "7", "10", "12", "music"],
    ["Quel peintre néerlandais a réalisé « La Jeune Fille à la perle » ?", "Vermeer", "Rembrandt", "Van Eyck", "Bruegel", "arts"],
    ["Quel mouvement artistique Claude Monet a-t-il contribué à fonder ?", "L'impressionnisme", "Le cubisme", "Le romantisme", "Le réalisme", "arts"],
    ["Quel pays a remporté la première Coupe du monde de football, en 1930 ?", "L'Uruguay", "Le Brésil", "L'Argentine", "L'Italie", "sport"],
    ["En tennis, combien de tournois composent le Grand Chelem ?", "4", "3", "5", "6", "sport"],
    ["Quelle est la langue officielle de l'Iran ?", "Le persan", "L'arabe", "Le turc", "Le kurde", "lang"],
    ["Quelle famille de langues comprend le finnois et le hongrois ?", "Les langues ouraliennes", "Les langues slaves", "Les langues germaniques", "Les langues romanes", "lang"],
  
    // ----- Ajouts zip 121 (culture G) -----
    ["Quelle est la capitale de l'Indonésie ?", "Jakarta", "Bali", "Surabaya", "Bandung", "geo"],
    ["Quel pays possède le plus de volcans actifs au monde ?", "L'Indonésie", "Le Japon", "L'Islande", "Le Chili", "geo"],
    ["Quelle est la capitale de l'Ouzbékistan ?", "Tachkent", "Astana", "Bakou", "Achgabat", "geo"],
    ["Quel fleuve traverse la ville de Bagdad ?", "Le Tigre", "L'Euphrate", "Le Jourdain", "L'Indus", "geo"],
    ["Quel pays d'Afrique était autrefois appelé Abyssinie ?", "L'Éthiopie", "Le Kenya", "Le Soudan", "Le Ghana", "geo"],
    ["Quelle est la capitale de l'Azerbaïdjan ?", "Bakou", "Tbilissi", "Erevan", "Astana", "geo"],
    ["Quel est le lac le plus profond du monde ?", "Le lac Baïkal", "Le lac Tanganyika", "Le lac Supérieur", "La mer Caspienne", "geo"],
    ["Quelle capitale européenne est traversée par le Danube et le fleuve la coupe en Buda et Pest ?", "Budapest", "Vienne", "Belgrade", "Bratislava", "geo"],
    ["Quel pays possède la plus longue façade côtière du monde ?", "Le Canada", "La Russie", "L'Australie", "L'Indonésie", "geo"],
    ["Quelle est la capitale administrative de la Bolivie ?", "Sucre", "La Paz", "Santa Cruz", "Cochabamba", "geo"],
    ["Dans quel pays se trouve l'ancienne cité de Petra ?", "La Jordanie", "L'Égypte", "Le Liban", "La Syrie", "geo"],
    ["Quel détroit sépare l'Asie de l'Amérique du Nord ?", "Le détroit de Béring", "Le détroit de Malacca", "Le détroit d'Ormuz", "Le détroit de Torres", "geo"],
    ["Quel traité a mis fin à la Première Guerre mondiale en 1919 ?", "Le traité de Versailles", "Le traité de Vienne", "Le traité de Westphalie", "Le traité de Trianon", "hist"],
    ["Quel accord de 1801, signé par Bonaparte, a rétabli la paix religieuse avec le pape ?", "Le Concordat", "L'édit de Nantes", "La paix d'Augsbourg", "Le traité de Tolentino", "hist"],
    ["Quel empereur romain a légalisé le christianisme par l'édit de Milan ?", "Constantin", "Néron", "Auguste", "Dioclétien", "hist"],
    ["Quelle reine a régné sur l'Angleterre pendant plus de soixante ans au XIXe siècle ?", "Victoria", "Élisabeth Ire", "Marie Ire", "Anne", "hist"],
    ["En quelle année la Révolution russe a-t-elle renversé le tsar ?", "1917", "1905", "1922", "1914", "hist"],
    ["Quel roi babylonien est célèbre pour son code de lois gravé sur une stèle ?", "Hammurabi", "Nabuchodonosor", "Cyrus", "Sargon", "hist"],
    ["Quel explorateur a été le premier Européen à atteindre l'Inde par la mer, en 1498 ?", "Vasco de Gama", "Christophe Colomb", "Magellan", "Bartolomeu Dias", "hist"],
    ["Quelle dynastie régnait en France avant la Révolution de 1789 ?", "Les Bourbons", "Les Valois", "Les Capétiens directs", "Les Carolingiens", "hist"],
    ["Quel conquérant macédonien a bâti un immense empire jusqu'en Inde au IVe siècle av. J.-C. ?", "Alexandre le Grand", "Jules César", "Darius", "Hannibal", "hist"],
    ["Quelle cité-État grecque était réputée pour l'éducation militaire de ses citoyens ?", "Sparte", "Athènes", "Corinthe", "Thèbes", "hist"],
    ["Quel savant italien fut condamné par l'Inquisition pour avoir soutenu l'héliocentrisme ?", "Galilée", "Giordano Bruno", "Copernic", "Kepler", "hist"],
    ["Quel est l'élément chimique le plus abondant dans la croûte terrestre ?", "L'oxygène", "Le silicium", "Le fer", "L'aluminium", "sci"],
    ["Quelle particule a été surnommée la « particule de Dieu » ?", "Le boson de Higgs", "Le neutrino", "Le quark", "Le photon", "sci"],
    ["Quel scientifique a établi le tableau périodique des éléments ?", "Mendeleïev", "Lavoisier", "Bohr", "Rutherford", "sci"],
    ["Quelle est l'unité de mesure de la résistance électrique ?", "L'ohm", "Le volt", "L'ampère", "Le watt", "sci"],
    ["Quel est l'élément chimique dont le symbole est Na ?", "Le sodium", "L'azote", "Le nickel", "Le néon", "sci"],
    ["Comment appelle-t-on la mesure de l'acidité d'une solution ?", "Le pH", "La densité", "La viscosité", "La molarité", "sci"],
    ["Quel astronome a découvert que les planètes suivent des orbites elliptiques ?", "Kepler", "Copernic", "Galilée", "Tycho Brahe", "sci"],
    ["Quel est le métal liquide à température ambiante, de symbole Hg ?", "Le mercure", "Le plomb", "L'étain", "Le gallium", "sci"],
    ["Quel savant français est considéré comme le père de la chimie moderne ?", "Lavoisier", "Pasteur", "Ampère", "Becquerel", "sci"],
    ["Quel phénomène décrit la déviation de la lumière en passant d'un milieu à un autre ?", "La réfraction", "La réflexion", "La diffraction", "La diffusion", "sci"],
    ["Quelle est la vitesse approximative de la lumière dans le vide ?", "300 000 km/s", "30 000 km/s", "3 000 km/s", "3 millions km/s", "sci"],
    ["Quel scientifique a énoncé le principe d'incertitude en physique quantique ?", "Heisenberg", "Schrödinger", "Dirac", "Pauli", "sci"],
    ["Quel artiste espagnol a peint « Guernica » ?", "Picasso", "Dalí", "Miró", "Velázquez", "arts"],
    ["À quel mouvement appartient le tableau « Impression, soleil levant » de Monet ?", "L'impressionnisme", "Le fauvisme", "Le cubisme", "Le romantisme", "arts"],
    ["Quel compositeur allemand a écrit « La Passion selon saint Matthieu » ?", "Jean-Sébastien Bach", "Haendel", "Brahms", "Wagner", "music"],
    ["Quel compositeur russe a composé le ballet « Le Lac des cygnes » ?", "Tchaïkovski", "Stravinski", "Rachmaninov", "Prokofiev", "music"],
    ["Quel écrivain russe a écrit « Guerre et Paix » ?", "Tolstoï", "Dostoïevski", "Tchekhov", "Tourgueniev", "lit"],
    ["Quel écrivain espagnol a écrit « Don Quichotte » ?", "Cervantès", "Lope de Vega", "Federico Garcia Lorca", "Jorge Luis Borges", "lit"],
    ["Quel dramaturge français a écrit « Le Misanthrope » ?", "Molière", "Racine", "Corneille", "Marivaux", "lit"],
    ["Quel architecte a conçu la Sagrada Família à Barcelone ?", "Gaudí", "Le Corbusier", "Niemeyer", "Foster", "arts"],
    ["Quel auteur colombien a écrit « Cent ans de solitude » ?", "Gabriel García Márquez", "Jorge Luis Borges", "Pablo Neruda", "Mario Vargas Llosa", "lit"],
    ["Combien de joueurs compose une équipe de water-polo dans l'eau ?", "7", "6", "5", "8", "sport"],
    ["Dans quel pays ont eu lieu les premiers Jeux olympiques modernes, en 1896 ?", "La Grèce", "La France", "Les États-Unis", "Le Royaume-Uni", "sport"],
    ["Quel coureur jamaïcain détient le record du monde du 100 mètres ?", "Usain Bolt", "Carl Lewis", "Yohan Blake", "Tyson Gay", "sport"],
    ["Combien de manches (sets) faut-il gagner pour remporter un match masculin en Grand Chelem de tennis ?", "3", "2", "4", "5", "sport"],
    ["Quel pays a remporté le plus de Coupes du monde de football ?", "Le Brésil", "L'Allemagne", "L'Italie", "L'Argentine", "sport"],
    ["De quelle langue le mot « algèbre » est-il issu ?", "L'arabe", "Le grec", "Le latin", "Le persan", "lang"],
    ["Quelle langue, sans lien avec ses voisines, est parlée au Pays basque ?", "Le basque", "Le catalan", "Le galicien", "Le breton", "lang"],
    ["Quelle famille de langues regroupe le finnois, le hongrois et l'estonien ?", "Les langues finno-ougriennes", "Les langues slaves", "Les langues baltes", "Les langues celtiques", "lang"],
    ["Quelle est la valeur approximative du nombre d'or ?", "1,618", "2,718", "3,141", "1,414", "maths"],
    ["Comment appelle-t-on un polygone à douze côtés ?", "Un dodécagone", "Un décagone", "Un hendécagone", "Un icosagone", "maths"],
    ["Quelle constante mathématique vaut environ 2,718 ?", "Le nombre e", "Le nombre Pi", "Le nombre d'or", "La racine de 2", "maths"],
    ["Quel est l'animal le plus venimeux du monde selon de nombreux classements ?", "La méduse-boîte", "Le cobra royal", "La veuve noire", "Le scorpion", "nature"],
    ["Quel oiseau est capable de voler en marche arrière ?", "Le colibri", "Le martinet", "Le faucon", "Le héron", "nature"],
    ["Quel est le seul mammifère qui pond des œufs, avec l'échidné ?", "L'ornithorynque", "Le pangolin", "Le paresseux", "La taupe", "nature"],
    ["Quel philosophe grec est l'auteur de « La République » ?", "Platon", "Aristote", "Socrate", "Épicure", "culture"],
    ["Quelle langue liturgique était utilisée dans l'Empire byzantin ?", "Le grec", "Le latin", "L'araméen", "Le copte", "culture"],
    ["Quel est le nom du système d'écriture cunéiforme originaire de Mésopotamie ?", "Le cunéiforme", "Les hiéroglyphes", "Le linéaire B", "L'alphabet phénicien", "culture"],
    ["Quelle est la capitale du Sénégal ?", "Dakar", "Bamako", "Abidjan", "Conakry", "geo"],
    ["Quel pays possède la plus grande forêt tropicale du monde ?", "Le Brésil", "L'Indonésie", "La RD Congo", "Le Pérou", "geo"],
    ["Quelle est la capitale de la Tunisie ?", "Tunis", "Sfax", "Sousse", "Bizerte", "geo"],
    ["Quel pays est enclavé et entièrement entouré par l'Afrique du Sud ?", "Le Lesotho", "Le Swaziland", "Le Botswana", "Le Zimbabwe", "geo"],
    ["Quel est le plus long fleuve du monde selon la plupart des mesures ?", "Le Nil", "L'Amazone", "Le Yangtsé", "Le Mississippi", "geo"],
    ["Quelle mer intérieure, entre l'Asie centrale, a fortement rétréci à cause de l'irrigation ?", "La mer d'Aral", "La mer Caspienne", "La mer Morte", "Le lac Balkhach", "geo"],
    ["Quelle est la capitale de l'Uruguay ?", "Montevideo", "Asunción", "Buenos Aires", "Santiago", "geo"],
    ["Quel désert d'Amérique du Sud est le plus aride du monde ?", "L'Atacama", "La Patagonie", "Le Sertão", "Le Gran Chaco", "geo"],
    ["Quelle chaîne de montagnes sépare l'Europe de l'Asie ?", "L'Oural", "Le Caucase", "Les Carpates", "L'Altaï", "geo"],
    ["Quelle est la capitale de l'Islande ?", "Reykjavik", "Oslo", "Helsinki", "Tórshavn", "geo"],
    ["Quel pharaon a fait construire la Grande Pyramide de Gizeh ?", "Khéops", "Toutânkhamon", "Ramsès II", "Djéser", "hist"],
    ["Quelle bataille de 1066 a permis à Guillaume de conquérir l'Angleterre ?", "La bataille de Hastings", "La bataille d'Azincourt", "La bataille de Bouvines", "La bataille de Crécy", "hist"],
    ["Quel empereur français a vendu la Louisiane aux États-Unis en 1803 ?", "Napoléon Ier", "Louis XVI", "Charles X", "Louis-Philippe", "hist"],
    ["Quelle civilisation a inventé l'écriture cunéiforme en Mésopotamie ?", "Les Sumériens", "Les Égyptiens", "Les Phéniciens", "Les Hittites", "hist"],
    ["Quel roi wisigoth a pillé Rome en 410 ?", "Alaric", "Attila", "Odoacre", "Théodoric", "hist"],
    ["En quelle année Christophe Colomb a-t-il atteint l'Amérique ?", "1492", "1498", "1453", "1519", "hist"],
    ["Quel chancelier a unifié l'Allemagne en 1871 ?", "Bismarck", "Metternich", "Guillaume II", "Adenauer", "hist"],
    ["Quelle guerre a opposé Athènes et Sparte au Ve siècle av. J.-C. ?", "La guerre du Péloponnèse", "Les guerres médiques", "La guerre de Troie", "Les guerres puniques", "hist"],
    ["Quel empire précolombien avait Tenochtitlan pour capitale ?", "L'Empire aztèque", "L'Empire inca", "La civilisation maya", "Les Olmèques", "hist"],
    ["Quel général carthaginois a traversé les Alpes avec des éléphants ?", "Hannibal", "Scipion", "Hamilcar", "Hasdrubal", "hist"],
    ["Quel gaz noble est utilisé dans les enseignes lumineuses rouges ?", "Le néon", "L'argon", "Le krypton", "Le xénon", "sci"],
    ["Quel scientifique a formulé la loi de la gravitation universelle ?", "Newton", "Einstein", "Galilée", "Copernic", "sci"],
    ["Quelle molécule transporte l'oxygène dans le sang ?", "L'hémoglobine", "L'insuline", "L'adrénaline", "La kératine", "sci"],
    ["Quel est le symbole chimique du potassium ?", "K", "P", "Po", "Pt", "sci"],
    ["Quel type de roche naît du refroidissement du magma ?", "Une roche magmatique", "Une roche sédimentaire", "Une roche métamorphique", "Une roche calcaire", "sci"],
    ["Comment appelle-t-on l'étude des champignons ?", "La mycologie", "L'entomologie", "La botanique", "L'ornithologie", "sci"],
    ["Quelle grandeur physique se mesure en pascals ?", "La pression", "La force", "L'énergie", "La puissance", "sci"],
    ["Quel scientifique a développé la théorie de la relativité générale ?", "Einstein", "Newton", "Maxwell", "Feynman", "sci"],
    ["Quel est le plus petit os du corps humain, situé dans l'oreille ?", "L'étrier", "Le marteau", "L'enclume", "Le fémur", "sci"],
    ["Quel processus permet aux plantes vertes de fabriquer leur nourriture ?", "La photosynthèse", "La respiration", "La fermentation", "La digestion", "sci"],
    ["Quelle est l'unité de mesure de la fréquence ?", "Le hertz", "Le watt", "Le joule", "Le newton", "sci"],
    ["Quel élément radioactif Marie Curie a-t-elle découvert et nommé d'après son pays natal ?", "Le polonium", "Le radium", "L'uranium", "Le thorium", "sci"],
    ["Quel peintre norvégien a réalisé « Le Cri » ?", "Edvard Munch", "Gustav Klimt", "Egon Schiele", "Kandinsky", "arts"],
    ["Quel compositeur italien a écrit l'opéra « La Traviata » ?", "Verdi", "Puccini", "Rossini", "Donizetti", "music"],
    ["Quel compositeur a écrit « Le Boléro » ?", "Maurice Ravel", "Claude Debussy", "Erik Satie", "Camille Saint-Saëns", "music"],
    ["Quel écrivain russe a écrit « Crime et Châtiment » ?", "Dostoïevski", "Tolstoï", "Gogol", "Pouchkine", "lit"],
    ["Quel auteur grec est traditionnellement crédité de « L'Iliade » ?", "Homère", "Sophocle", "Eschyle", "Hérodote", "lit"],
    ["Dans quel musée se trouve la fresque « La Cène » de Léonard de Vinci ?", "À Milan", "À Rome", "À Florence", "À Venise", "arts"],
    ["Quel philosophe allemand a écrit « Ainsi parlait Zarathoustra » ?", "Nietzsche", "Kant", "Hegel", "Schopenhauer", "lit"],
    ["Quel instrument à vent en bois possède une anche double ?", "Le hautbois", "La flûte traversière", "La clarinette", "Le saxophone", "music"],
    ["Quel pilote de Formule 1 détient le record de sept titres mondiaux, à égalité avec Schumacher ?", "Lewis Hamilton", "Sebastian Vettel", "Ayrton Senna", "Alain Prost", "sport"],
    ["Dans quelle ville se sont tenus les Jeux olympiques d'été de 1936 ?", "Berlin", "Los Angeles", "Amsterdam", "Anvers", "sport"],
    ["Combien de joueurs compte une équipe de cricket ?", "11", "9", "13", "15", "sport"],
    ["Quel boxeur américain se surnommait « The Greatest » ?", "Mohamed Ali", "Mike Tyson", "Joe Frazier", "George Foreman", "sport"],
    ["Dans quel sport décerne-t-on la Coupe Stanley ?", "Le hockey sur glace", "Le baseball", "Le basket-ball", "Le football américain", "sport"],
    ["Quel alphabet est utilisé pour écrire le russe ?", "Le cyrillique", "Le latin", "Le grec", "L'arabe", "lang"],
    ["Combien de lettres compte l'alphabet grec ?", "24", "26", "28", "22", "lang"],
    ["Combien vaut la factorielle de 5 (5!) ?", "120", "25", "60", "720", "maths"],
    ["Quel nombre est représenté par « C » en chiffres romains ?", "100", "50", "500", "1000", "maths"],
    ["Comment appelle-t-on la ligne qui touche un cercle en un seul point ?", "Une tangente", "Une sécante", "Une corde", "Un rayon", "maths"],
    ["Quel est le plus grand reptile vivant du monde ?", "Le crocodile marin", "Le python", "Le dragon de Komodo", "L'anaconda", "nature"],
    ["Quel arbre africain, au tronc massif, est surnommé l'arbre à l'envers ?", "Le baobab", "L'acacia", "Le manguier", "Le palmier", "nature"],
    ["Combien de cœurs possède une pieuvre ?", "3", "1", "2", "4", "nature"],
    ["Quel philosophe grec a été condamné à boire la ciguë ?", "Socrate", "Platon", "Aristote", "Diogène", "culture"],
    ["Quelle épice est tirée du safran, la plus chère au monde ?", "Le safran", "Le curcuma", "Le paprika", "La cardamome", "culture"],
    ["De quel pays le haggis est-il un plat traditionnel ?", "L'Écosse", "L'Irlande", "Le pays de Galles", "La Norvège", "culture"],
    ["Quel empereur mongol a fondé le plus vaste empire d'un seul tenant de l'histoire ?", "Gengis Khan", "Kubilai Khan", "Tamerlan", "Attila", "hist"],
    ["Quelle planète possède la plus grande montagne du système solaire, le mont Olympe ?", "Mars", "Vénus", "Jupiter", "Mercure", "sci"],
    ["Quel courant du début du XXe siècle Marcel Duchamp incarne-t-il avec ses ready-made ?", "Le dadaïsme", "Le futurisme", "L'expressionnisme", "Le pointillisme", "arts"],
    ["Quelle est la capitale du Vietnam ?", "Hanoï", "Hô Chi Minh-Ville", "Hué", "Da Nang", "geo"],
    ["Quel pays possède le plus grand nombre d'îles au monde ?", "La Suède", "L'Indonésie", "Les Philippines", "Le Canada", "geo"],
    ["Quelle est la capitale de l'Équateur ?", "Quito", "Guayaquil", "Lima", "Bogota", "geo"],
    ["Quel empereur byzantin a fait codifier le droit romain au VIe siècle ?", "Justinien", "Constantin", "Basile II", "Héraclius", "hist"],
    ["Quelle révolte d'esclaves, menée par Spartacus, a secoué Rome ?", "La troisième guerre servile", "La guerre des Gaules", "La conjuration de Catilina", "La guerre sociale", "hist"],
    ["Quel roi de France signa l'édit de Nantes en 1598 ?", "Henri IV", "Louis XIII", "François Ier", "Charles IX", "hist"],
    ["Quel savant a inventé le premier vaccin, contre la variole ?", "Edward Jenner", "Louis Pasteur", "Robert Koch", "Alexander Fleming", "sci"],
    ["Comment appelle-t-on la couche externe gazeuse du Soleil visible pendant une éclipse ?", "La couronne", "La photosphère", "La chromosphère", "Le noyau", "sci"],
    ["Quel scientifique a énoncé les lois de l'hérédité en étudiant des petits pois ?", "Gregor Mendel", "Charles Darwin", "Louis Pasteur", "James Watson", "sci"],
    ["Quel est le seul métal qui n'est pas gris ou argenté, avec l'or ?", "Le cuivre", "Le fer", "Le nickel", "Le platine", "sci"],
    ["Quel sculpteur italien de la Renaissance a réalisé le « David » de marbre ?", "Michel-Ange", "Donatello", "Bernin", "Cellini", "arts"],
    ["Quel écrivain irlandais a écrit « Ulysse » ?", "James Joyce", "Oscar Wilde", "Samuel Beckett", "W.B. Yeats", "lit"],
    ["Quel compositeur hongrois est célèbre pour ses « Rhapsodies hongroises » ?", "Franz Liszt", "Béla Bartók", "Antonín Dvořák", "Johannes Brahms", "music"],
    ["Quel est le cas grammatical qui marque le complément d'objet direct en latin ?", "L'accusatif", "Le nominatif", "Le génitif", "Le datif", "lang"],
    ["Quel mathématicien est considéré comme le père de la géométrie avec ses « Éléments » ?", "Euclide", "Pythagore", "Thalès", "Archimède", "maths"],
    ["Comment appelle-t-on un nombre entier égal à la somme de ses diviseurs propres, comme 6 ?", "Un nombre parfait", "Un nombre premier", "Un nombre carré", "Un nombre amical", "maths"],
    ["Quel grand singe partage le plus de gènes avec l'être humain ?", "Le chimpanzé", "Le gorille", "L'orang-outan", "Le gibbon", "nature"],
    ["Quelle est la plante à la croissance la plus rapide du monde ?", "Le bambou", "Le lierre", "Le nénuphar", "La fougère", "nature"],
    ["Quel dieu grec était le roi de l'Olympe et maître de la foudre ?", "Zeus", "Poséidon", "Apollon", "Hadès", "culture"],
    ["Dans la mythologie nordique, quel dieu manie le marteau Mjöllnir ?", "Thor", "Odin", "Loki", "Freyr", "culture"],
    ["Quelle expédition a atteint le pôle Sud la première, en 1911 ?", "Celle de Roald Amundsen", "Celle de Robert Scott", "Celle d'Ernest Shackleton", "Celle de James Cook", "hist"],
    ["Quel scientifique néo-zélandais est considéré comme le père de la physique nucléaire ?", "Ernest Rutherford", "Niels Bohr", "J.J. Thomson", "Enrico Fermi", "sci"],
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
    // ----- Added 2026-07 (explicit category as 6th item) -----
    ["What is 7 × 8?", "56", "54", "48", "64", "maths"],
    ["What is 100 divided by 4?", "25", "20", "40", "50", "maths"],
    ["Which sport is played with a racket and a shuttlecock?", "Badminton", "Tennis", "Squash", "Table tennis", "sport"],
    ["In which sport do you score baskets?", "Basketball", "Handball", "Volleyball", "Rugby", "sport"],
    ["Which musical note comes right after do (C)?", "Re (D)", "Mi (E)", "Fa (F)", "Ti (B)", "music"],
    ["Which instrument does a band's drummer play?", "The drums", "The bass", "The keyboard", "The triangle", "music"],
    ["Who painted famous sunflowers?", "Van Gogh", "Picasso", "Monet", "Dalí", "arts"],
    ["What colour do you get by mixing red and white?", "Pink", "Purple", "Orange", "Brown", "arts"],
    ["How do you say 'thank you' in Spanish?", "Gracias", "Grazie", "Danke", "Obrigado", "lang"],
    ["What language is spoken in Mexico?", "Spanish", "Portuguese", "Mexican", "French", "lang"],
  
    // ----- Additions zip 121 (trivia) -----
    ["What is the capital of the United Kingdom?", "London", "Manchester", "Edinburgh", "Dublin", "geo"],
    ["What is the capital of the United States?", "Washington", "New York", "Los Angeles", "Chicago", "geo"],
    ["Which country is often described as a hexagon?", "France", "Spain", "Germany", "Poland", "geo"],
    ["What is the capital of Belgium?", "Brussels", "Antwerp", "Liege", "Ghent", "geo"],
    ["Which river flows through Paris?", "The Seine", "The Loire", "The Rhone", "The Garonne", "geo"],
    ["Which South American country has La Paz as its seat of government?", "Bolivia", "Chile", "Ecuador", "Paraguay", "geo"],
    ["In which country is the city of Venice?", "Italy", "Greece", "Croatia", "Spain", "geo"],
    ["Which mountain range separates France from Spain?", "The Pyrenees", "The Alps", "The Jura", "The Vosges", "geo"],
    ["Which desert covers much of North Africa?", "The Sahara", "The Gobi", "The Atacama", "The Kalahari", "geo"],
    ["On which continent is India located?", "Asia", "Africa", "Europe", "Oceania", "geo"],
    ["In which country is the city of Barcelona?", "Spain", "Portugal", "Italy", "France", "geo"],
    ["Which country is famous for tulips and windmills?", "The Netherlands", "Belgium", "Denmark", "Austria", "geo"],
    ["Which city is nicknamed the Eternal City?", "Rome", "Athens", "Cairo", "Jerusalem", "geo"],
    ["Which ocean separates Europe from America?", "The Atlantic", "The Pacific", "The Indian", "The Arctic", "geo"],
    ["What is the capital of Norway?", "Oslo", "Stockholm", "Helsinki", "Copenhagen", "geo"],
    ["What is the closest star to Earth?", "The Sun", "Sirius", "Alpha Centauri", "Polaris", "sci"],
    ["How many planets are in the solar system?", "8", "9", "7", "10", "sci"],
    ["Which gas do humans breathe to live?", "Oxygen", "Nitrogen", "Carbon dioxide", "Helium", "sci"],
    ["At what temperature does water boil at sea level?", "100°C", "90°C", "120°C", "80°C", "sci"],
    ["Which planet is closest to the Sun?", "Mercury", "Venus", "Earth", "Mars", "sci"],
    ["Which scientist explained gravity after seeing an apple fall, per legend?", "Newton", "Einstein", "Galileo", "Darwin", "sci"],
    ["Which human organ is protected by the skull?", "The brain", "The heart", "The liver", "The stomach", "sci"],
    ["Which metal is liquid at room temperature?", "Mercury", "Iron", "Copper", "Aluminium", "sci"],
    ["What is the force that pulls us toward the ground?", "Gravity", "Magnetism", "Friction", "Electricity", "sci"],
    ["What is the largest bone in the human body?", "The femur", "The tibia", "The humerus", "The collarbone", "sci"],
    ["Which planet has clearly visible rings?", "Saturn", "Mars", "Venus", "Mercury", "sci"],
    ["Which bird cannot fly but runs very fast?", "The ostrich", "The eagle", "The falcon", "The owl", "nature"],
    ["Which animal makes honey?", "The bee", "The wasp", "The ant", "The butterfly", "nature"],
    ["Which animal is known for changing color?", "The chameleon", "The crocodile", "The green lizard", "The turtle", "nature"],
    ["Which sea animal has eight arms?", "The octopus", "The starfish", "The crab", "The jellyfish", "nature"],
    ["Acorns come from which tree?", "The oak", "The fir", "The birch", "The willow", "nature"],
    ["Which animal is called the ship of the desert?", "The camel", "The horse", "The donkey", "The llama", "nature"],
    ["What is the largest cat species in the world?", "The tiger", "The lion", "The leopard", "The cheetah", "nature"],
    ["Which sea mammal is known for its song and huge size?", "The whale", "The dolphin", "The seal", "The otter", "nature"],
    ["Which flower turns to follow the sun?", "The sunflower", "The rose", "The tulip", "The poppy", "nature"],
    ["Which insect turns from a caterpillar into a winged adult?", "The butterfly", "The ladybug", "The dragonfly", "The grasshopper", "nature"],
    ["Which animal symbolizes wisdom and sees well at night?", "The owl", "The crow", "The pigeon", "The peacock", "nature"],
    ["Who was the first U.S. president?", "George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams", "hist"],
    ["Which ancient people built the pyramids of Giza?", "The Egyptians", "The Romans", "The Greeks", "The Persians", "hist"],
    ["In which country were the ancient Olympic Games born?", "Greece", "Italy", "Egypt", "Turkey", "hist"],
    ["Which French emperor was defeated at Waterloo?", "Napoleon", "Louis XIV", "Charlemagne", "Julius Caesar", "hist"],
    ["Which ship sank in 1912 after hitting an iceberg?", "The Titanic", "The Lusitania", "The Mayflower", "The Queen Mary", "hist"],
    ["Which French king was called the Sun King?", "Louis XIV", "Louis XVI", "Francis I", "Henry IV", "hist"],
    ["Which great wall stands in China?", "The Great Wall", "Hadrian's Wall", "The Berlin Wall", "The limes", "hist"],
    ["Which Genoese explorer reached America in 1492?", "Christopher Columbus", "Vasco da Gama", "Magellan", "Marco Polo", "hist"],
    ["What does a painter use to mix colors?", "The palette", "The easel", "The frame", "The varnish", "arts"],
    ["Which instrument has strings and is played with a bow?", "The violin", "The flute", "The trumpet", "The drum", "music"],
    ["How many musicians make up a quartet?", "4", "3", "5", "2", "music"],
    ["Which fairy-tale character's nose grows when he lies?", "Pinocchio", "Peter Pan", "Aladdin", "Bambi", "lit"],
    ["Which English detective lives at 221B Baker Street?", "Sherlock Holmes", "Hercule Poirot", "James Bond", "Arsene Lupin", "lit"],
    ["Which colors mix to make orange?", "Red and yellow", "Blue and yellow", "Red and blue", "Blue and white", "arts"],
    ["In which Paris museum is the Mona Lisa displayed?", "The Louvre", "The Orsay Museum", "The Pompidou Centre", "The Palace of Versailles", "arts"],
    ["How many players does a basketball team field on court?", "5", "6", "7", "4", "sport"],
    ["Which sport uses a net, a racket and yellow balls?", "Tennis", "Golf", "Rugby", "Hockey", "sport"],
    ["How many holes are on a standard golf course?", "18", "9", "12", "24", "sport"],
    ["Which country invented modern football?", "England", "Brazil", "Italy", "Spain", "sport"],
    ["In which sport can you score a try?", "Rugby", "Tennis", "Basketball", "Judo", "sport"],
    ["Which French cycling race is the most famous?", "The Tour de France", "The Giro", "The Vuelta", "Paris-Roubaix", "sport"],
    ["In which country is Portuguese the official language?", "Portugal", "Spain", "Italy", "Romania", "lang"],
    ["How do you say 'thank you' in German?", "Danke", "Gracias", "Grazie", "Merci", "lang"],
    ["Which language is official in Brazil?", "Portuguese", "Spanish", "French", "English", "lang"],
    ["What is 12 × 12?", "144", "124", "132", "121", "maths"],
    ["How many seconds are in two minutes?", "120", "100", "60", "180", "maths"],
    ["What is half of 250?", "125", "120", "130", "150", "maths"],
    ["How many faces does a standard die have?", "6", "4", "8", "12", "maths"],
    ["Which hot drink is made from roasted beans?", "Coffee", "Milk", "Orange juice", "Green tea", "culture"],
    ["Which country is pizza originally from?", "Italy", "France", "Greece", "Spain", "culture"],
    ["How many cards are in a standard deck without jokers?", "52", "54", "48", "60", "culture"],
    ["Which precious spice comes from a flower and turns rice yellow?", "Saffron", "Paprika", "Turmeric", "Cinnamon", "culture"],
    ["What is the capital of Denmark?", "Copenhagen", "Oslo", "Stockholm", "Helsinki", "geo"],
    ["Which country is shaped like a boot?", "Italy", "Greece", "Spain", "Portugal", "geo"],
    ["What is the capital of Poland?", "Warsaw", "Krakow", "Gdansk", "Poznan", "geo"],
    ["Which European country has the largest population?", "Russia", "Germany", "France", "Italy", "geo"],
    ["Which sea lies between Europe and Africa?", "The Mediterranean", "The Black Sea", "The Baltic Sea", "The North Sea", "geo"],
    ["What is the capital of Slovakia?", "Bratislava", "Prague", "Ljubljana", "Zagreb", "geo"],
    ["In which country is the city of Marrakesh?", "Morocco", "Algeria", "Tunisia", "Egypt", "geo"],
    ["What is the smallest continent in the world?", "Oceania", "Europe", "Antarctica", "South America", "geo"],
    ["Which U.S. city is nicknamed the Big Apple?", "New York", "Los Angeles", "Chicago", "Boston", "geo"],
    ["Which device is used to view distant objects in the sky?", "The telescope", "The microscope", "The thermometer", "The compass", "sci"],
    ["How many colors are traditionally counted in a rainbow?", "7", "5", "6", "8", "sci"],
    ["Which gas do plants release during the day?", "Oxygen", "Methane", "Helium", "Hydrogen", "sci"],
    ["Which organ filters blood and makes urine?", "The kidneys", "The heart", "The lungs", "The brain", "sci"],
    ["What is the fastest speed in the universe?", "Light", "Sound", "Wind", "A rocket", "sci"],
    ["Which scientist made the formula E = mc² famous?", "Einstein", "Newton", "Darwin", "Galileo", "sci"],
    ["Which planet is the largest gas giant?", "Jupiter", "Mars", "Venus", "Mercury", "sci"],
    ["What layer protects Earth from the Sun's rays?", "The ozone layer", "The null stratosphere", "The weak field", "The low ionosphere", "sci"],
    ["What is the largest animal living on land?", "The elephant", "The giraffe", "The hippo", "The rhino", "nature"],
    ["Which animal sleeps upside down in caves?", "The bat", "The owl", "The squirrel", "The mole", "nature"],
    ["Which reptile has a shell?", "The tortoise", "The snake", "The lizard", "The crocodile", "nature"],
    ["Which black-and-white animal mostly eats bamboo?", "The panda", "The zebra", "The penguin", "The tapir", "nature"],
    ["Which bird is a symbol of France?", "The rooster", "The eagle", "The dove", "The crow", "nature"],
    ["Which Arctic animal turns white in winter?", "The Arctic fox", "The grey wolf", "The beaver", "The raccoon", "nature"],
    ["How many humps does a dromedary have?", "1", "2", "3", "0", "nature"],
    ["Which revolution began in France in 1789?", "The French Revolution", "The Russian Revolution", "The Industrial Revolution", "The Commune", "hist"],
    ["Which Cold War wall fell in 1989?", "The Berlin Wall", "The Great Wall", "Hadrian's Wall", "The Western Wall", "hist"],
    ["Which French heroine led armies during the Hundred Years' War?", "Joan of Arc", "Marie Antoinette", "Catherine de Medici", "Eleanor of Aquitaine", "hist"],
    ["Which Italian city was the heart of the Roman Empire?", "Rome", "Milan", "Naples", "Venice", "hist"],
    ["Which U.S. president abolished slavery?", "Abraham Lincoln", "George Washington", "Franklin Roosevelt", "John Kennedy", "hist"],
    ["On which continent did the Maya civilization develop?", "America", "Asia", "Africa", "Europe", "hist"],
    ["How many strings does a violin have?", "4", "6", "5", "3", "music"],
    ["Which British rock band sang 'Yesterday'?", "The Beatles", "Queen", "U2", "The Rolling Stones", "music"],
    ["Which Spanish painter co-founded Cubism?", "Picasso", "Dali", "Miro", "Goya", "arts"],
    ["Who wrote the adventures of a young wizard named Harry Potter?", "J.K. Rowling", "Roald Dahl", "Tolkien", "C.S. Lewis", "lit"],
    ["In which city is Romeo and Juliet set?", "Verona", "Venice", "Rome", "Florence", "lit"],
    ["What color is San Francisco's famous Golden Gate Bridge?", "Orange", "Red", "Yellow", "Blue", "arts"],
    ["Which jersey does the Tour de France leader wear?", "The yellow jersey", "The green jersey", "The red jersey", "The blue jersey", "sport"],
    ["In which sport do you wear gloves and step into a ring?", "Boxing", "Tennis", "Cycling", "Swimming", "sport"],
    ["Which object do you hit with a club in golf?", "The ball", "The shuttlecock", "The puck", "The ball (soccer)", "sport"],
    ["How long is one half in football (soccer)?", "45 minutes", "30 minutes", "60 minutes", "20 minutes", "sport"],
    ["Which sport features a serve, an ace and a net?", "Tennis", "Football", "Rugby", "Judo", "sport"],
    ["How do you say 'goodbye' in Italian?", "Arrivederci", "Adios", "Auf Wiedersehen", "Tot ziens", "lang"],
    ["Which language is official in Austria?", "German", "Austrian", "Hungarian", "Italian", "lang"],
    ["In which country is Japanese mainly spoken?", "Japan", "China", "Korea", "Thailand", "lang"],
    ["What is 15 × 4?", "60", "45", "50", "65", "maths"],
    ["How many degrees is a right angle?", "90", "45", "180", "360", "maths"],
    ["How many zeros are in one thousand?", "3", "2", "4", "5", "maths"],
    ["What is 8 squared?", "64", "16", "48", "81", "maths"],
    ["How many sides does a pentagon have?", "5", "6", "4", "7", "maths"],
    ["Which country is sushi originally from?", "Japan", "China", "Thailand", "Korea", "culture"],
    ["Which day comes after Wednesday?", "Thursday", "Tuesday", "Friday", "Monday", "culture"],
    ["How many pieces does each player start with in chess?", "16", "12", "20", "8", "culture"],
    ["Which holiday is celebrated on 25 December?", "Christmas", "Easter", "Halloween", "New Year", "culture"],
    ["Which red condiment often goes with fries?", "Ketchup", "Mustard", "Vinegar", "Honey", "culture"],
    ["What is the traditional color of a ruby?", "Red", "Blue", "Green", "Yellow", "culture"],
    ["Which sense lets us perceive sounds?", "Hearing", "Sight", "Taste", "Smell", "sci"],
    ["What is the capital of Ireland?", "Dublin", "Belfast", "Cork", "Galway", "geo"],
    ["Which animal is famed for its memory and its trunk?", "The elephant", "The monkey", "The dolphin", "The parrot", "nature"],
    ["Which pharaoh is famous for his golden funerary mask?", "Tutankhamun", "Ramesses III", "Khufu", "Nefertiti", "hist"],
    ["Which sport uses a stick and a puck on ice?", "Ice hockey", "Curling", "Skating", "Bobsleigh", "sport"],
    ["What is the capital of Hungary?", "Budapest", "Vienna", "Prague", "Bratislava", "geo"],
    ["Which North American country has Ottawa as its capital?", "Canada", "The United States", "Mexico", "Cuba", "geo"],
    ["Which part of a plant grows underground?", "The root", "The flower", "The leaf", "The fruit", "sci"],
    ["Which device points to the North?", "The compass", "The barometer", "The thermometer", "The altimeter", "sci"],
    ["Which animal is the fastest in a dive through the air?", "The peregrine falcon", "The sparrow", "The pigeon", "The seagull", "nature"],
    ["Which ancient city is famous for its Colosseum?", "Rome", "Athens", "Sparta", "Carthage", "hist"],
    ["Which brass instrument is golden with a bell?", "The trumpet", "The violin", "The piano", "The harp", "music"],
    ["Which Dutch artist cut off his own ear?", "Van Gogh", "Rembrandt", "Vermeer", "Mondrian", "arts"],
    ["Which trophy is awarded to the football World Cup winner?", "The World Cup trophy", "The Ballon d'Or", "The Davis Cup", "The yellow jersey", "sport"],
    ["How do you say 'chat' (the animal) in English?", "Cat", "Dog", "Cow", "Fish", "lang"],
    ["What is 144 divided by 12?", "12", "14", "11", "24", "maths"],
    ["Which famous tower leans in Italy?", "The Tower of Pisa", "The Eiffel Tower", "Big Ben", "The Tower of London", "culture"],
    ["Which yellow precious metal is most sought after in jewelry?", "Gold", "Iron", "Zinc", "Tin", "culture"],
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
    // ----- Added 2026-07 (explicit category as 6th item) -----
    ["What is 12 squared?", "144", "124", "132", "154", "maths"],
    ["What is the only even prime number?", "2", "1", "4", "9", "maths"],
    ["Which composer wrote 'Für Elise'?", "Beethoven", "Mozart", "Chopin", "Liszt", "music"],
    ["Which British band sang 'Hey Jude'?", "The Beatles", "The Rolling Stones", "Queen", "Pink Floyd", "music"],
    ["Which painter is famous for his water lilies?", "Claude Monet", "Édouard Manet", "Auguste Renoir", "Paul Cézanne", "arts"],
    ["Which sculptor created 'The Thinker'?", "Auguste Rodin", "Camille Claudel", "Michelangelo", "Constantin Brancusi", "arts"],
    ["In which sport can you win a 'Grand Slam' of four major tournaments?", "Tennis", "Golf", "Boxing", "Fencing", "sport"],
    ["How often are the Summer Olympic Games held?", "Every 4 years", "Every 2 years", "Every 5 years", "Every 6 years", "sport"],
    ["How many official languages does Switzerland have?", "4", "2", "3", "5", "lang"],
    ["How do you say 'good morning' in Italian?", "Buongiorno", "Buenos días", "Guten Tag", "Bom dia", "lang"],
  
    // ----- Additions zip 121 (trivia) -----
    ["What is the capital of Argentina?", "Buenos Aires", "Santiago", "Montevideo", "Lima", "geo"],
    ["Which country spans the most contiguous time zones on its mainland?", "Russia", "Canada", "China", "Brazil", "geo"],
    ["On which river is Cairo built?", "The Nile", "The Tigris", "The Euphrates", "The Congo", "geo"],
    ["What is the capital of Venezuela?", "Caracas", "Maracaibo", "Valencia", "Bogota", "geo"],
    ["What is the capital of Croatia?", "Zagreb", "Split", "Dubrovnik", "Rijeka", "geo"],
    ["What is the longest above-water mountain range in the world?", "The Andes", "The Himalayas", "The Rockies", "The Alps", "geo"],
    ["Which African country has Cairo as its capital?", "Egypt", "Sudan", "Libya", "Morocco", "geo"],
    ["What is the capital of Finland?", "Helsinki", "Oslo", "Stockholm", "Tallinn", "geo"],
    ["Which country is crossed by the Amazon, one of the world's longest rivers?", "Brazil", "Colombia", "Venezuela", "Ecuador", "geo"],
    ["Which Italian city is built on many islands linked by canals?", "Venice", "Naples", "Genoa", "Pisa", "geo"],
    ["Which country contains Mumbai and New Delhi?", "India", "Pakistan", "Bangladesh", "Sri Lanka", "geo"],
    ["What is the capital of Scotland?", "Edinburgh", "Glasgow", "Dublin", "Cardiff", "geo"],
    ["In which year did World War I begin?", "1914", "1918", "1939", "1905", "hist"],
    ["Which Roman general crossed the Rubicon?", "Julius Caesar", "Augustus", "Pompey", "Mark Antony", "hist"],
    ["Which queen of Egypt allied with Caesar then Mark Antony?", "Cleopatra", "Nefertiti", "Hatshepsut", "Isis", "hist"],
    ["Which king of France was guillotined during the Revolution?", "Louis XVI", "Louis XIV", "Charles X", "Louis XV", "hist"],
    ["In which year did humans first walk on the Moon?", "1969", "1961", "1972", "1957", "hist"],
    ["Which empire was ruled from Constantinople?", "The Byzantine Empire", "The Mongol Empire", "The Aztec Empire", "The Zulu Empire", "hist"],
    ["Which disaster destroyed Pompeii in 79 AD?", "The eruption of Vesuvius", "An earthquake", "A tsunami", "A fire", "hist"],
    ["Which Portuguese navigator launched the first circumnavigation of the globe?", "Magellan", "Vasco da Gama", "Christopher Columbus", "Amerigo Vespucci", "hist"],
    ["Which Chinese dynasty is credited with most of the Great Wall seen today?", "The Ming", "The Qing", "The Han", "The Tang", "hist"],
    ["Which Italian scientist defended that Earth orbits the Sun?", "Galileo", "Copernicus", "Kepler", "Newton", "hist"],
    ["What is the chemical symbol for iron?", "Fe", "Fr", "Ir", "Al", "sci"],
    ["How many chromosomes does a human have?", "46", "23", "48", "44", "sci"],
    ["Which planet is nicknamed the Shepherd's Star though it is not a star?", "Venus", "Mars", "Jupiter", "Saturn", "sci"],
    ["Which gas is the best-known driver of the greenhouse effect?", "Carbon dioxide", "Oxygen", "Helium", "Nitrogen", "sci"],
    ["Which scientist formulated the three laws of motion?", "Newton", "Einstein", "Bohr", "Hawking", "sci"],
    ["What is the largest organ of the human body?", "The skin", "The liver", "The lungs", "The brain", "sci"],
    ["What do we call an animal that eats only plants?", "A herbivore", "A carnivore", "An omnivore", "An insectivore", "sci"],
    ["Which unit measures electric current (intensity)?", "The ampere", "The volt", "The watt", "The joule", "sci"],
    ["Which scientist discovered penicillin?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Robert Koch", "sci"],
    ["Roughly how long does sunlight take to reach Earth?", "8 minutes", "1 minute", "1 hour", "1 second", "sci"],
    ["Which metal do magnets attract most easily?", "Iron", "Gold", "Copper", "Silver", "sci"],
    ["Who painted 'The Starry Night'?", "Van Gogh", "Monet", "Cezanne", "Gauguin", "arts"],
    ["Which art movement is associated with Claude Monet?", "Impressionism", "Cubism", "Surrealism", "Baroque", "arts"],
    ["Which Austrian composer wrote 'The Magic Flute'?", "Mozart", "Beethoven", "Bach", "Vivaldi", "music"],
    ["Which country is the tango originally from?", "Argentina", "Spain", "Brazil", "Mexico", "music"],
    ["Who wrote the novel 'Madame Bovary'?", "Gustave Flaubert", "Emile Zola", "Stendhal", "Balzac", "lit"],
    ["Which writer created Sherlock Holmes?", "Arthur Conan Doyle", "Agatha Christie", "Charles Dickens", "Jules Verne", "lit"],
    ["Which French author wrote 'Twenty Thousand Leagues Under the Seas'?", "Jules Verne", "Victor Hugo", "Moliere", "Voltaire", "lit"],
    ["Which French sculptor made 'The Thinker'?", "Rodin", "Camille Claudel", "Michelangelo", "Giacometti", "arts"],
    ["In which sport can you win a Grand Slam of four majors?", "Tennis", "Football", "Basketball", "Cycling", "sport"],
    ["How many players are on a rugby union team on the field?", "15", "13", "11", "7", "sport"],
    ["Which country invented judo?", "Japan", "China", "Korea", "Thailand", "sport"],
    ["How far is an official marathon?", "42 km", "21 km", "50 km", "30 km", "sport"],
    ["Which Argentine scored the 'Hand of God' goal in 1986?", "Maradona", "Messi", "Pele", "Zidane", "sport"],
    ["How many official languages does Belgium have?", "3", "2", "1", "4", "lang"],
    ["Which language does the word 'pyjama' come from?", "Persian", "Latin", "Greek", "Arabic", "lang"],
    ["What is the approximate value of Pi?", "3.14", "2.72", "1.61", "3.41", "maths"],
    ["How many faces does a cube have?", "6", "8", "4", "12", "maths"],
    ["What do we call a triangle with three equal sides?", "Equilateral", "Isosceles", "Right", "Scalene", "maths"],
    ["What is the largest bird in the world?", "The ostrich", "The golden eagle", "The condor", "The pelican", "nature"],
    ["Which animal has the longest neck?", "The giraffe", "The ostrich", "The flamingo", "The llama", "nature"],
    ["Which is the only penguin living naturally at the equator?", "The Galapagos penguin", "The emperor penguin", "The king penguin", "The rockhopper", "nature"],
    ["Which country hosted the first modern Olympic Games in 1896?", "Greece", "France", "Italy", "The United Kingdom", "culture"],
    ["Which thin Italian pasta dish is often served bolognese?", "Spaghetti", "Risotto", "Polenta", "Gnocchi", "culture"],
    ["Which French sparkling drink is named after a wine region?", "Champagne", "Port", "Whisky", "Vodka", "culture"],
    ["What is the capital of Thailand?", "Bangkok", "Chiang Mai", "Phuket", "Pattaya", "geo"],
    ["Which country has the largest area in the world?", "Russia", "Canada", "China", "The United States", "geo"],
    ["Which cold desert stretches across Mongolia and China?", "The Gobi", "The Sahara", "The Kalahari", "The Atacama", "geo"],
    ["What is the capital of Bulgaria?", "Sofia", "Bucharest", "Belgrade", "Skopje", "geo"],
    ["Which canal links the Mediterranean to the Red Sea?", "The Suez Canal", "The Panama Canal", "The Corinth Canal", "The Kiel Canal", "geo"],
    ["Which country is a long strip along the Pacific Ocean?", "Chile", "Peru", "Argentina", "Bolivia", "geo"],
    ["What is the capital of India?", "New Delhi", "Mumbai", "Kolkata", "Bangalore", "geo"],
    ["Which Scandinavian country has Stockholm as its capital?", "Sweden", "Norway", "Denmark", "Finland", "geo"],
    ["Which large island lies off southeastern Africa?", "Madagascar", "Sri Lanka", "Sardinia", "Zanzibar", "geo"],
    ["What is the capital of Mexico?", "Mexico City", "Guadalajara", "Cancun", "Monterrey", "geo"],
    ["Which war pitted the U.S. North against the South?", "The Civil War", "The War of Independence", "The Vietnam War", "The War of 1812", "hist"],
    ["Which Greek scholar shouted 'Eureka' in his bath?", "Archimedes", "Pythagoras", "Aristotle", "Thales", "hist"],
    ["Which 1815 battle sealed Napoleon's fate?", "Waterloo", "Austerlitz", "Jena", "Marengo", "hist"],
    ["Which English king founded the Church of England to divorce?", "Henry VIII", "Richard the Lionheart", "George III", "William the Conqueror", "hist"],
    ["Which civilization built Machu Picchu in Peru?", "The Incas", "The Maya", "The Aztecs", "The Olmecs", "hist"],
    ["In which year did World War II end?", "1945", "1939", "1918", "1950", "hist"],
    ["Which emperor had the Colosseum built in Rome?", "Vespasian", "Nero", "Trajan", "Augustus", "hist"],
    ["Which Venetian explorer traveled to China in the 13th century?", "Marco Polo", "Christopher Columbus", "Magellan", "Vasco da Gama", "hist"],
    ["Which female scientist won two Nobel Prizes?", "Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Lise Meitner", "hist"],
    ["What is the chemical symbol for oxygen?", "O", "Ox", "Og", "Om", "sci"],
    ["Which is the hottest planet in the solar system?", "Venus", "Mercury", "Mars", "Jupiter", "sci"],
    ["What is the change from liquid to gas called?", "Evaporation", "Condensation", "Melting", "Freezing", "sci"],
    ["Which scholar stated the buoyancy principle on a submerged body?", "Archimedes", "Newton", "Pascal", "Bernoulli", "sci"],
    ["What is the main component of the Sun?", "Hydrogen", "Oxygen", "Iron", "Carbon", "sci"],
    ["How many pairs of ribs does a human usually have?", "12", "10", "14", "8", "sci"],
    ["Which scale of temperature is named after a Swedish astronomer?", "Celsius", "Kelvin", "Fahrenheit", "Newton", "sci"],
    ["Which part of the brain handles balance and coordination?", "The cerebellum", "The cortex", "The pituitary", "The medulla", "sci"],
    ["What causes the tides?", "The Moon's gravity", "The wind", "Cloud rotation", "Warm currents", "sci"],
    ["Which gas makes sparkling water fizzy?", "Carbon dioxide", "Oxygen", "Hydrogen", "Nitrogen", "sci"],
    ["Who painted the ceiling of the Sistine Chapel?", "Michelangelo", "Raphael", "Leonardo da Vinci", "Caravaggio", "arts"],
    ["Which Baroque composer wrote the oratorio 'Messiah'?", "Handel", "Bach", "Telemann", "Purcell", "music"],
    ["Which keyboard instrument has hammers striking strings?", "The piano", "The organ", "The accordion", "The harpsichord", "music"],
    ["Who wrote the play 'Romeo and Juliet'?", "Shakespeare", "Moliere", "Racine", "Corneille", "lit"],
    ["Which author wrote 'The Little Prince'?", "Saint-Exupery", "Camus", "Sartre", "Proust", "lit"],
    ["Which country is the painter Salvador Dali from?", "Spain", "Italy", "France", "Portugal", "arts"],
    ["Which music style was born in New Orleans in the early 20th century?", "Jazz", "Reggae", "Techno", "Flamenco", "music"],
    ["How many bases are on a baseball field?", "4", "3", "5", "2", "sport"],
    ["Which country hosted the first football World Cup, in 1930?", "Uruguay", "Brazil", "Italy", "France", "sport"],
    ["In which sport is the Tour de France the flagship event?", "Cycling", "Running", "Swimming", "Rowing", "sport"],
    ["How many points is a three-pointer worth in basketball?", "3", "2", "1", "4", "sport"],
    ["Which Japanese combat sport features two very heavy wrestlers?", "Sumo", "Karate", "Aikido", "Kendo", "sport"],
    ["Which language has the most native speakers worldwide?", "Mandarin", "English", "Spanish", "Hindi", "lang"],
    ["Which ancient language is French mainly derived from?", "Latin", "Greek", "Celtic", "Germanic", "lang"],
    ["What is a number divisible only by 1 and itself called?", "A prime number", "An even number", "A square number", "A decimal", "maths"],
    ["What is 2 to the power of 10?", "1024", "512", "2048", "100", "maths"],
    ["How many diagonals does a square have?", "2", "4", "1", "3", "maths"],
    ["Which land animal has the longest pregnancy?", "The elephant", "The giraffe", "The horse", "The bear", "nature"],
    ["Which tree can live thousands of years and grows in California?", "The sequoia", "The oak", "The baobab", "The pine", "nature"],
    ["Which jellyfish-like sea animal can be deadly?", "The box jellyfish", "The starfish", "The coral", "The anemone", "nature"],
    ["Which country is the world's top coffee producer?", "Brazil", "Colombia", "Ethiopia", "Vietnam", "culture"],
    ["Which currency is used in Japan?", "The yen", "The won", "The yuan", "The baht", "culture"],
    ["Which holey cheese is emblematic of Switzerland?", "Emmental", "Camembert", "Roquefort", "Mozzarella", "culture"],
    ["Which Irish holiday is celebrated on 17 March?", "St. Patrick's Day", "Halloween", "Thanksgiving", "Easter", "culture"],
    ["What is the capital of Algeria?", "Algiers", "Oran", "Constantine", "Annaba", "geo"],
    ["Which German city was split by a wall during the Cold War?", "Berlin", "Munich", "Hamburg", "Frankfurt", "hist"],
    ["Which scientist invented the lightning rod?", "Benjamin Franklin", "Thomas Edison", "Nikola Tesla", "Michael Faraday", "sci"],
    ["In which city is the Prado Museum?", "Madrid", "Barcelona", "Rome", "Lisbon", "arts"],
    ["Which Italian poet wrote 'The Divine Comedy'?", "Dante", "Petrarch", "Boccaccio", "Virgil", "lit"],
    ["Which athletics event involves throwing a disc as far as possible?", "The discus throw", "The high jump", "The triple jump", "The 100 meters", "sport"],
    ["Which insect lives in a hive organized around a queen?", "The bee", "The ant", "The grasshopper", "The mosquito", "nature"],
    ["Which Greek mathematician is known for a theorem on right triangles?", "Pythagoras", "Euclid", "Archimedes", "Thales", "maths"],
    ["Which country's traditional dance is flamenco?", "Spain", "Portugal", "Italy", "Greece", "culture"],
    ["Which human organ produces insulin?", "The pancreas", "The liver", "The spleen", "The kidneys", "sci"],
    ["Which mineral is the main component of common sand?", "Silica", "Limestone", "Gypsum", "Clay", "sci"],
    ["Which metal is mainly extracted from bauxite ore?", "Aluminium", "Iron", "Copper", "Zinc", "sci"],
    ["How many chambers does the human heart have?", "4", "2", "3", "5", "sci"],
    ["Which French painter is known for his paintings of dancers?", "Edgar Degas", "Auguste Renoir", "Claude Monet", "Edouard Manet", "arts"],
    ["Who wrote the poetry collection 'Les Fleurs du mal'?", "Charles Baudelaire", "Arthur Rimbaud", "Paul Verlaine", "Stephane Mallarme", "lit"],
    ["What is a word that reads the same in both directions called?", "A palindrome", "A pleonasm", "A synonym", "A homonym", "lang"],
    ["Which country has a red maple leaf on its flag?", "Canada", "Switzerland", "Japan", "Lebanon", "geo"],
    ["Which musical note lies between fa and la?", "Sol", "Do", "Si", "Mi", "music"],
    ["Which metal is the best electrical conductor?", "Silver", "Copper", "Gold", "Aluminium", "sci"],
    ["Which snow sport uses a single board fixed to the feet?", "Snowboarding", "Alpine skiing", "Luge", "Bobsleigh", "sport"],
    ["In which Brazilian city is the most famous carnival held?", "Rio de Janeiro", "Salvador", "Sao Paulo", "Recife", "geo"],
    ["Which British writer published the novel '1984'?", "George Orwell", "Aldous Huxley", "H.G. Wells", "Ray Bradbury", "lit"],
    ["What is the highest peak in Western Europe?", "Mont Blanc", "The Matterhorn", "Mount Elbrus", "Aconcagua", "geo"],
    ["Which vitamin does the skin mainly produce in sunlight?", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin B12", "sci"],
    ["Which scientist, famous for relativity, died in 1955?", "Einstein", "Bohr", "Planck", "Fermi", "hist"],
    ["Which Dutch painter is famous for 'Girl with a Pearl Earring'?", "Vermeer", "Rembrandt", "Van Gogh", "Mondrian", "arts"],
    ["Which gas lighter than air was used in airships?", "Helium", "Carbon dioxide", "Oxygen", "Methane", "sci"],
    ["Which artificial canal links the Atlantic to the Pacific in Central America?", "The Panama Canal", "The Suez Canal", "The Corinth Canal", "The Kiel Canal", "geo"],
    ["Which Swiss cheese is famous for its holes?", "Emmental", "Gruyere", "Comte", "Brie", "culture"],
    ["What is the longest bone in the human skeleton?", "The femur", "The tibia", "The humerus", "The fibula", "sci"],
    ["Which French king was nicknamed the Beloved early in his reign?", "Louis XV", "Louis XIII", "Charles VII", "Philip the Fair", "hist"],
    ["What is 15% of 200?", "30", "25", "35", "20", "maths"],
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
    // ----- Added 2026-07 (explicit category as 6th item) -----
    ["What is the sum of the angles of a triangle?", "180 degrees", "90 degrees", "270 degrees", "360 degrees", "maths"],
    ["Which number does the letter M represent in Roman numerals?", "1000", "500", "100", "50", "maths"],
    ["Which French composer wrote the 'Boléro'?", "Maurice Ravel", "Claude Debussy", "Erik Satie", "Gabriel Fauré", "music"],
    ["How many symphonies did Beethoven complete?", "9", "7", "10", "12", "music"],
    ["Which Dutch painter created 'Girl with a Pearl Earring'?", "Vermeer", "Rembrandt", "Van Eyck", "Bruegel", "arts"],
    ["Which art movement did Claude Monet help to found?", "Impressionism", "Cubism", "Romanticism", "Realism", "arts"],
    ["Which country won the first football World Cup, in 1930?", "Uruguay", "Brazil", "Argentina", "Italy", "sport"],
    ["In tennis, how many tournaments make up the Grand Slam?", "4", "3", "5", "6", "sport"],
    ["What is the official language of Iran?", "Persian", "Arabic", "Turkish", "Kurdish", "lang"],
    ["Which language family includes Finnish and Hungarian?", "The Uralic languages", "The Slavic languages", "The Germanic languages", "The Romance languages", "lang"],
  
    // ----- Additions zip 121 (trivia) -----
    ["What is the capital of Indonesia?", "Jakarta", "Bali", "Surabaya", "Bandung", "geo"],
    ["Which country has the most active volcanoes in the world?", "Indonesia", "Japan", "Iceland", "Chile", "geo"],
    ["What is the capital of Uzbekistan?", "Tashkent", "Astana", "Baku", "Ashgabat", "geo"],
    ["Which river flows through Baghdad?", "The Tigris", "The Euphrates", "The Jordan", "The Indus", "geo"],
    ["Which African country was formerly called Abyssinia?", "Ethiopia", "Kenya", "Sudan", "Ghana", "geo"],
    ["What is the capital of Azerbaijan?", "Baku", "Tbilisi", "Yerevan", "Astana", "geo"],
    ["What is the deepest lake in the world?", "Lake Baikal", "Lake Tanganyika", "Lake Superior", "The Caspian Sea", "geo"],
    ["Which European capital is split by the Danube into Buda and Pest?", "Budapest", "Vienna", "Belgrade", "Bratislava", "geo"],
    ["Which country has the longest coastline in the world?", "Canada", "Russia", "Australia", "Indonesia", "geo"],
    ["What is the constitutional capital of Bolivia?", "Sucre", "La Paz", "Santa Cruz", "Cochabamba", "geo"],
    ["In which country is the ancient city of Petra?", "Jordan", "Egypt", "Lebanon", "Syria", "geo"],
    ["Which strait separates Asia from North America?", "The Bering Strait", "The Strait of Malacca", "The Strait of Hormuz", "The Torres Strait", "geo"],
    ["Which treaty ended World War I in 1919?", "The Treaty of Versailles", "The Treaty of Vienna", "The Peace of Westphalia", "The Treaty of Trianon", "hist"],
    ["Which 1801 agreement by Bonaparte restored religious peace with the Pope?", "The Concordat", "The Edict of Nantes", "The Peace of Augsburg", "The Treaty of Tolentino", "hist"],
    ["Which Roman emperor legalized Christianity with the Edict of Milan?", "Constantine", "Nero", "Augustus", "Diocletian", "hist"],
    ["Which queen reigned over England for over sixty years in the 19th century?", "Victoria", "Elizabeth I", "Mary I", "Anne", "hist"],
    ["In which year did the Russian Revolution overthrow the tsar?", "1917", "1905", "1922", "1914", "hist"],
    ["Which Babylonian king is famous for his code of laws carved on a stele?", "Hammurabi", "Nebuchadnezzar", "Cyrus", "Sargon", "hist"],
    ["Which explorer was the first European to reach India by sea, in 1498?", "Vasco da Gama", "Christopher Columbus", "Magellan", "Bartolomeu Dias", "hist"],
    ["Which dynasty ruled France before the 1789 Revolution?", "The Bourbons", "The Valois", "The direct Capetians", "The Carolingians", "hist"],
    ["Which Macedonian conqueror built a vast empire reaching India in the 4th century BC?", "Alexander the Great", "Julius Caesar", "Darius", "Hannibal", "hist"],
    ["Which Greek city-state was known for its military upbringing?", "Sparta", "Athens", "Corinth", "Thebes", "hist"],
    ["Which Italian scholar was condemned by the Inquisition for supporting heliocentrism?", "Galileo", "Giordano Bruno", "Copernicus", "Kepler", "hist"],
    ["Which chemical element is most abundant in Earth's crust?", "Oxygen", "Silicon", "Iron", "Aluminium", "sci"],
    ["Which particle was nicknamed the 'God particle'?", "The Higgs boson", "The neutrino", "The quark", "The photon", "sci"],
    ["Which scientist created the periodic table of elements?", "Mendeleev", "Lavoisier", "Bohr", "Rutherford", "sci"],
    ["What is the unit of electrical resistance?", "The ohm", "The volt", "The ampere", "The watt", "sci"],
    ["Which chemical element has the symbol Na?", "Sodium", "Nitrogen", "Nickel", "Neon", "sci"],
    ["What measures the acidity of a solution?", "The pH", "The density", "The viscosity", "The molarity", "sci"],
    ["Which astronomer found that planets follow elliptical orbits?", "Kepler", "Copernicus", "Galileo", "Tycho Brahe", "sci"],
    ["Which metal, symbol Hg, is liquid at room temperature?", "Mercury", "Lead", "Tin", "Gallium", "sci"],
    ["Which French scientist is regarded as the father of modern chemistry?", "Lavoisier", "Pasteur", "Ampere", "Becquerel", "sci"],
    ["Which phenomenon describes light bending as it passes between media?", "Refraction", "Reflection", "Diffraction", "Scattering", "sci"],
    ["What is the approximate speed of light in a vacuum?", "300,000 km/s", "30,000 km/s", "3,000 km/s", "3 million km/s", "sci"],
    ["Which scientist stated the uncertainty principle in quantum physics?", "Heisenberg", "Schrodinger", "Dirac", "Pauli", "sci"],
    ["Which Spanish artist painted 'Guernica'?", "Picasso", "Dali", "Miro", "Velazquez", "arts"],
    ["Which movement does Monet's 'Impression, Sunrise' belong to?", "Impressionism", "Fauvism", "Cubism", "Romanticism", "arts"],
    ["Which German composer wrote the 'St Matthew Passion'?", "Johann Sebastian Bach", "Handel", "Brahms", "Wagner", "music"],
    ["Which Russian composer wrote the ballet 'Swan Lake'?", "Tchaikovsky", "Stravinsky", "Rachmaninoff", "Prokofiev", "music"],
    ["Which Russian writer wrote 'War and Peace'?", "Tolstoy", "Dostoevsky", "Chekhov", "Turgenev", "lit"],
    ["Which Spanish writer wrote 'Don Quixote'?", "Cervantes", "Lope de Vega", "Federico Garcia Lorca", "Jorge Luis Borges", "lit"],
    ["Which French playwright wrote 'The Misanthrope'?", "Moliere", "Racine", "Corneille", "Marivaux", "lit"],
    ["Which architect designed the Sagrada Familia in Barcelona?", "Gaudi", "Le Corbusier", "Niemeyer", "Foster", "arts"],
    ["Which Colombian author wrote 'One Hundred Years of Solitude'?", "Gabriel Garcia Marquez", "Jorge Luis Borges", "Pablo Neruda", "Mario Vargas Llosa", "lit"],
    ["How many players are in a water polo team in the water?", "7", "6", "5", "8", "sport"],
    ["In which country were the first modern Olympics held, in 1896?", "Greece", "France", "The United States", "The United Kingdom", "sport"],
    ["Which Jamaican sprinter holds the 100 m world record?", "Usain Bolt", "Carl Lewis", "Yohan Blake", "Tyson Gay", "sport"],
    ["How many sets must a man win to take a Grand Slam tennis match?", "3", "2", "4", "5", "sport"],
    ["Which country has won the most football World Cups?", "Brazil", "Germany", "Italy", "Argentina", "sport"],
    ["Which language does the word 'algebra' come from?", "Arabic", "Greek", "Latin", "Persian", "lang"],
    ["Which language, unrelated to its neighbors, is spoken in the Basque Country?", "Basque", "Catalan", "Galician", "Breton", "lang"],
    ["Which language family includes Finnish, Hungarian and Estonian?", "Finno-Ugric languages", "Slavic languages", "Baltic languages", "Celtic languages", "lang"],
    ["What is the approximate value of the golden ratio?", "1.618", "2.718", "3.141", "1.414", "maths"],
    ["What is a twelve-sided polygon called?", "A dodecagon", "A decagon", "A hendecagon", "An icosagon", "maths"],
    ["Which mathematical constant is approximately 2.718?", "The number e", "Pi", "The golden ratio", "The square root of 2", "maths"],
    ["Which animal is often ranked the most venomous in the world?", "The box jellyfish", "The king cobra", "The black widow", "The scorpion", "nature"],
    ["Which bird can fly backwards?", "The hummingbird", "The swift", "The falcon", "The heron", "nature"],
    ["Which egg-laying mammal, besides the echidna, exists?", "The platypus", "The pangolin", "The sloth", "The mole", "nature"],
    ["Which Greek philosopher wrote 'The Republic'?", "Plato", "Aristotle", "Socrates", "Epicurus", "culture"],
    ["Which liturgical language was used in the Byzantine Empire?", "Greek", "Latin", "Aramaic", "Coptic", "culture"],
    ["What is the name of the wedge-shaped writing from Mesopotamia?", "Cuneiform", "Hieroglyphs", "Linear B", "The Phoenician alphabet", "culture"],
    ["What is the capital of Senegal?", "Dakar", "Bamako", "Abidjan", "Conakry", "geo"],
    ["Which country has the world's largest rainforest?", "Brazil", "Indonesia", "DR Congo", "Peru", "geo"],
    ["What is the capital of Tunisia?", "Tunis", "Sfax", "Sousse", "Bizerte", "geo"],
    ["Which country is landlocked and entirely surrounded by South Africa?", "Lesotho", "Eswatini", "Botswana", "Zimbabwe", "geo"],
    ["What is the longest river in the world by most measures?", "The Nile", "The Amazon", "The Yangtze", "The Mississippi", "geo"],
    ["Which inland sea in Central Asia shrank drastically due to irrigation?", "The Aral Sea", "The Caspian Sea", "The Dead Sea", "Lake Balkhash", "geo"],
    ["What is the capital of Uruguay?", "Montevideo", "Asuncion", "Buenos Aires", "Santiago", "geo"],
    ["Which South American desert is the driest in the world?", "The Atacama", "Patagonia", "The Sertao", "The Gran Chaco", "geo"],
    ["Which mountain range separates Europe from Asia?", "The Urals", "The Caucasus", "The Carpathians", "The Altai", "geo"],
    ["What is the capital of Iceland?", "Reykjavik", "Oslo", "Helsinki", "Torshavn", "geo"],
    ["Which pharaoh had the Great Pyramid of Giza built?", "Khufu", "Tutankhamun", "Ramesses II", "Djoser", "hist"],
    ["Which 1066 battle let William conquer England?", "The Battle of Hastings", "The Battle of Agincourt", "The Battle of Bouvines", "The Battle of Crecy", "hist"],
    ["Which French leader sold Louisiana to the U.S. in 1803?", "Napoleon I", "Louis XVI", "Charles X", "Louis-Philippe", "hist"],
    ["Which civilization invented cuneiform writing in Mesopotamia?", "The Sumerians", "The Egyptians", "The Phoenicians", "The Hittites", "hist"],
    ["Which Visigothic king sacked Rome in 410?", "Alaric", "Attila", "Odoacer", "Theodoric", "hist"],
    ["In which year did Columbus reach America?", "1492", "1498", "1453", "1519", "hist"],
    ["Which chancellor unified Germany in 1871?", "Bismarck", "Metternich", "Wilhelm II", "Adenauer", "hist"],
    ["Which war pitted Athens against Sparta in the 5th century BC?", "The Peloponnesian War", "The Persian Wars", "The Trojan War", "The Punic Wars", "hist"],
    ["Which pre-Columbian empire had Tenochtitlan as its capital?", "The Aztec Empire", "The Inca Empire", "The Maya", "The Olmecs", "hist"],
    ["Which Carthaginian general crossed the Alps with elephants?", "Hannibal", "Scipio", "Hamilcar", "Hasdrubal", "hist"],
    ["Which noble gas is used in red neon signs?", "Neon", "Argon", "Krypton", "Xenon", "sci"],
    ["Which scientist formulated the law of universal gravitation?", "Newton", "Einstein", "Galileo", "Copernicus", "sci"],
    ["Which molecule carries oxygen in the blood?", "Hemoglobin", "Insulin", "Adrenaline", "Keratin", "sci"],
    ["What is the chemical symbol for potassium?", "K", "P", "Po", "Pt", "sci"],
    ["Which rock type forms from cooling magma?", "An igneous rock", "A sedimentary rock", "A metamorphic rock", "A limestone", "sci"],
    ["What is the study of fungi called?", "Mycology", "Entomology", "Botany", "Ornithology", "sci"],
    ["Which physical quantity is measured in pascals?", "Pressure", "Force", "Energy", "Power", "sci"],
    ["Which scientist developed the theory of general relativity?", "Einstein", "Newton", "Maxwell", "Feynman", "sci"],
    ["What is the smallest bone in the human body, in the ear?", "The stapes", "The malleus", "The incus", "The femur", "sci"],
    ["Which process lets green plants make their own food?", "Photosynthesis", "Respiration", "Fermentation", "Digestion", "sci"],
    ["What is the unit of frequency?", "The hertz", "The watt", "The joule", "The newton", "sci"],
    ["Which radioactive element did Marie Curie name after her homeland?", "Polonium", "Radium", "Uranium", "Thorium", "sci"],
    ["Which Norwegian painter created 'The Scream'?", "Edvard Munch", "Gustav Klimt", "Egon Schiele", "Kandinsky", "arts"],
    ["Which Italian composer wrote the opera 'La Traviata'?", "Verdi", "Puccini", "Rossini", "Donizetti", "music"],
    ["Which composer wrote 'Bolero'?", "Maurice Ravel", "Claude Debussy", "Erik Satie", "Camille Saint-Saens", "music"],
    ["Which Russian writer wrote 'Crime and Punishment'?", "Dostoevsky", "Tolstoy", "Gogol", "Pushkin", "lit"],
    ["Which Greek author is traditionally credited with 'The Iliad'?", "Homer", "Sophocles", "Aeschylus", "Herodotus", "lit"],
    ["In which city is Leonardo da Vinci's mural 'The Last Supper'?", "Milan", "Rome", "Florence", "Venice", "arts"],
    ["Which German philosopher wrote 'Thus Spoke Zarathustra'?", "Nietzsche", "Kant", "Hegel", "Schopenhauer", "lit"],
    ["Which woodwind instrument has a double reed?", "The oboe", "The flute", "The clarinet", "The saxophone", "music"],
    ["Which F1 driver ties Schumacher's record of seven world titles?", "Lewis Hamilton", "Sebastian Vettel", "Ayrton Senna", "Alain Prost", "sport"],
    ["Which city hosted the 1936 Summer Olympics?", "Berlin", "Los Angeles", "Amsterdam", "Antwerp", "sport"],
    ["How many players are on a cricket team?", "11", "9", "13", "15", "sport"],
    ["Which American boxer called himself 'The Greatest'?", "Muhammad Ali", "Mike Tyson", "Joe Frazier", "George Foreman", "sport"],
    ["In which sport is the Stanley Cup awarded?", "Ice hockey", "Baseball", "Basketball", "American football", "sport"],
    ["Which alphabet is used to write Russian?", "Cyrillic", "Latin", "Greek", "Arabic", "lang"],
    ["How many letters are in the Greek alphabet?", "24", "26", "28", "22", "lang"],
    ["What is the factorial of 5 (5!)?", "120", "25", "60", "720", "maths"],
    ["Which number is 'C' in Roman numerals?", "100", "50", "500", "1000", "maths"],
    ["What is the line touching a circle at exactly one point called?", "A tangent", "A secant", "A chord", "A radius", "maths"],
    ["What is the largest living reptile in the world?", "The saltwater crocodile", "The python", "The Komodo dragon", "The anaconda", "nature"],
    ["Which African tree with a massive trunk is called the upside-down tree?", "The baobab", "The acacia", "The mango tree", "The palm", "nature"],
    ["How many hearts does an octopus have?", "3", "1", "2", "4", "nature"],
    ["Which Greek philosopher was sentenced to drink hemlock?", "Socrates", "Plato", "Aristotle", "Diogenes", "culture"],
    ["Which spice, the most expensive in the world, comes from a crocus flower?", "Saffron", "Turmeric", "Paprika", "Cardamom", "culture"],
    ["Haggis is a traditional dish of which country?", "Scotland", "Ireland", "Wales", "Norway", "culture"],
    ["Which Mongol ruler founded the largest contiguous empire in history?", "Genghis Khan", "Kublai Khan", "Tamerlane", "Attila", "hist"],
    ["Which planet has the solar system's tallest mountain, Olympus Mons?", "Mars", "Venus", "Jupiter", "Mercury", "sci"],
    ["Which early-20th-century movement does Duchamp embody with his ready-mades?", "Dadaism", "Futurism", "Expressionism", "Pointillism", "arts"],
    ["What is the capital of Vietnam?", "Hanoi", "Ho Chi Minh City", "Hue", "Da Nang", "geo"],
    ["Which country has the most islands in the world?", "Sweden", "Indonesia", "The Philippines", "Canada", "geo"],
    ["What is the capital of Ecuador?", "Quito", "Guayaquil", "Lima", "Bogota", "geo"],
    ["Which Byzantine emperor codified Roman law in the 6th century?", "Justinian", "Constantine", "Basil II", "Heraclius", "hist"],
    ["Which slave revolt, led by Spartacus, shook Rome?", "The Third Servile War", "The Gallic Wars", "The Catiline Conspiracy", "The Social War", "hist"],
    ["Which French king signed the Edict of Nantes in 1598?", "Henry IV", "Louis XIII", "Francis I", "Charles IX", "hist"],
    ["Which scientist created the first vaccine, against smallpox?", "Edward Jenner", "Louis Pasteur", "Robert Koch", "Alexander Fleming", "sci"],
    ["What is the outer gaseous layer of the Sun visible during an eclipse?", "The corona", "The photosphere", "The chromosphere", "The core", "sci"],
    ["Which scientist stated the laws of heredity by studying pea plants?", "Gregor Mendel", "Charles Darwin", "Louis Pasteur", "James Watson", "sci"],
    ["Which metal, besides gold, is not grey or silver colored?", "Copper", "Iron", "Nickel", "Platinum", "sci"],
    ["Which Renaissance Italian sculptor carved the marble 'David'?", "Michelangelo", "Donatello", "Bernini", "Cellini", "arts"],
    ["Which Irish writer wrote 'Ulysses'?", "James Joyce", "Oscar Wilde", "Samuel Beckett", "W.B. Yeats", "lit"],
    ["Which Hungarian composer is famous for his 'Hungarian Rhapsodies'?", "Franz Liszt", "Bela Bartok", "Antonin Dvorak", "Johannes Brahms", "music"],
    ["Which Latin grammatical case marks the direct object?", "The accusative", "The nominative", "The genitive", "The dative", "lang"],
    ["Which mathematician is called the father of geometry, author of 'Elements'?", "Euclid", "Pythagoras", "Thales", "Archimedes", "maths"],
    ["What is a number equal to the sum of its proper divisors, like 6, called?", "A perfect number", "A prime number", "A square number", "An amicable number", "maths"],
    ["Which great ape shares the most genes with humans?", "The chimpanzee", "The gorilla", "The orangutan", "The gibbon", "nature"],
    ["What is the fastest-growing plant in the world?", "Bamboo", "Ivy", "The water lily", "The fern", "nature"],
    ["Which Greek god was king of Olympus and master of thunder?", "Zeus", "Poseidon", "Apollo", "Hades", "culture"],
    ["In Norse mythology, which god wields the hammer Mjolnir?", "Thor", "Odin", "Loki", "Freyr", "culture"],
    ["Which expedition first reached the South Pole, in 1911?", "Roald Amundsen's", "Robert Scott's", "Ernest Shackleton's", "James Cook's", "hist"],
    ["Which New Zealand scientist is called the father of nuclear physics?", "Ernest Rutherford", "Niels Bohr", "J.J. Thomson", "Enrico Fermi", "sci"],
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
  const [myWin, setMyWin] = useState(false);
  const [points, setPoints] = useState(0);
  const [roundResults, setRoundResults] = useState([]); // qui a répondu juste/faux cette manche-ci
  // ----- Bonus d'enchaînement (streak) -----
  // 3 bonnes réponses D'AFFILÉE = 1 jeton de bonus, utilisable UNE fois sur
  // n'importe quelle question suivante (au choix : 50/50 ou attaque de temps).
  // Auto-déclaré (comme le score de cette manche) : cohérent avec le modèle
  // de confiance déjà en place pour "answer_result" — aucune vérité réseau
  // supplémentaire nécessaire, ce n'est qu'un bonus cosmétique/social.
  const [streak, setStreak] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [usedBonusThisQ, setUsedBonusThisQ] = useState(false);
  const [fiftyHidden, setFiftyHidden] = useState([]); // choix masqués localement (50/50), jamais envoyés en réseau
  const [bonusNotice, setBonusNotice] = useState(null); // { kind, username } — notif passagère
  const streakRef = useRef(0);
  const tokensRef = useRef(0);
  const roundTotalRef = useRef(ROUND_MS_BY_DIFF.easy);
  const bonusNoticeTimerRef = useRef(null);
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
  // Victoire/défaite ARCARDI (remplace l'ancien add_points par question) :
  // total de points de CHAQUE joueur, reconstruit localement à partir des
  // broadcasts "answer_result" (diffusés à tous, self:true inclus) — tous
  // les clients reçoivent exactement les mêmes messages, donc calculent le
  // même classement final. Gagne qui a le total le plus haut à la fin des
  // N_QUESTIONS (égalité = tous gagnants).
  const totalsRef = useRef({});
  const timeouts = useRef([]);
  const restoredRef = useRef(false);
  // Miroirs toujours à jour de q/picked pour le handler "reveal" (évite les closures figées).
  const qRef = useRef(null);
  const pickedRef = useRef(null);
  const revealedRef = useRef(false);
  const lastDiffRef = useRef("easy");

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { lockedMineRef.current = lockedMine; }, [lockedMine]);
  useEffect(() => { roundTotalRef.current = roundTotal; }, [roundTotal]);

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
      setUsedBonusThisQ(false);
      setFiftyHidden([]);
      if (payload.index === 0) {
        myGain.current = 0; setPoints(0);
        streakRef.current = 0; setStreak(0);
        tokensRef.current = 0; setTokens(0);
        totalsRef.current = {};
        setMyWin(false);
      }
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
        const newStreak = streakRef.current + 1;
        if (newStreak >= 3) {
          streakRef.current = 0; setStreak(0);
          tokensRef.current += 1; setTokens(tokensRef.current);
        } else {
          streakRef.current = newStreak; setStreak(newStreak);
        }
      } else {
        streakRef.current = 0; setStreak(0);
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
      // Tally partagé (identique chez tous les clients, mêmes messages
      // reçus par tous) : sert à déterminer le/les gagnant(s) à la fin.
      if (payload.correct) {
        const gain = POINTS_BY_DIFF[qRef.current?.diff] || 2;
        totalsRef.current[payload.profile_id] = (totalsRef.current[payload.profile_id] || 0) + gain;
      } else if (totalsRef.current[payload.profile_id] === undefined) {
        totalsRef.current[payload.profile_id] = 0;
      }
    });
    // Bonus utilisé par un joueur : le 50/50 est purement local à qui l'a
    // activé (rien à propager, juste une notif sociale) ; l'attaque de
    // temps, elle, réduit RÉELLEMENT le temps des AUTRES joueurs sur la
    // question en cours — leur temps restant est ramené à la moitié du
    // temps de DÉPART (pas de la moitié du temps déjà restant), sans
    // jamais repasser sous "maintenant" (pas de révélation instantanée
    // injuste).
    ch.on("broadcast", { event: "bonus" }, ({ payload }) => {
      setBonusNotice({ kind: payload.kind, username: payload.username });
      clearTimeout(bonusNoticeTimerRef.current);
      bonusNoticeTimerRef.current = setTimeout(() => setBonusNotice(null), 2600);
      if (payload.kind === "attack" && payload.profile_id !== me.id) {
        setDeadline(d => {
          if (!d) return d;
          const half = d - roundTotalRef.current / 2;
          return Math.max(Date.now() + 300, Math.min(d, half));
        });
      }
    });
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      if (isHost) persistState(null, null, false, true);
      // Victoire/défaite ARCARDI : gagne qui a le plus haut total sur les
      // N_QUESTIONS (calculé depuis le même tally reçu par tous les
      // clients ci-dessus) — égalité = tous gagnants.
      const ids = (playersRef.current || []).map(p => p.profile_id);
      const best = Math.max(0, ...ids.map(id => totalsRef.current[id] || 0));
      const won = (totalsRef.current[me.id] || 0) === best;
      setMyWin(won);
      recordMatchResult(room.id, won);
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
      clearTimeout(bonusNoticeTimerRef.current);
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
      // slice(1, 5) et JAMAIS slice(1) : le 6e élément optionnel est la
      // CATÉGORIE (chip), pas une proposition de réponse — sans cette borne,
      // "maths" apparaîtrait comme 5e choix cliquable.
      choices: shuffle(item.slice(1, 5)),
      // Chip de catégorie (demande 2026-07) : explicite (6e élément) pour les
      // questions récentes, déduite par mots-clés pour les historiques —
      // calculée UNE fois ici par l'hôte, identique chez tous les clients.
      cat: item[5] || guessQuizCategory(item[0]),
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

  // 50/50 : élimine 2 des 3 mauvaises réponses, purement en local (l'état
  // "bonne réponse" est déjà connu du client — voir la validation à la
  // révélation plus haut — donc aucune requête réseau n'est nécessaire ici).
  function useFiftyFifty() {
    if (!q || revealed || lockedMineRef.current || usedBonusThisQ || tokensRef.current <= 0) return;
    const wrongs = q.choices.filter(c => c !== q.good);
    const keepWrong = wrongs[Math.floor(Math.random() * wrongs.length)];
    setFiftyHidden(wrongs.filter(c => c !== keepWrong));
    setUsedBonusThisQ(true);
    tokensRef.current -= 1; setTokens(tokensRef.current);
    channelRef.current?.send({
      type: "broadcast", event: "bonus",
      payload: { profile_id: me.id, username: me.username, kind: "fifty" },
    });
  }

  // Attaque de temps : réduit le temps des AUTRES joueurs à la moitié du
  // temps de départ pour cette question (voir handler "bonus" plus haut).
  // N'affecte jamais son propre chrono.
  function useAttack() {
    if (!q || revealed || usedBonusThisQ || tokensRef.current <= 0) return;
    setUsedBonusThisQ(true);
    tokensRef.current -= 1; setTokens(tokensRef.current);
    channelRef.current?.send({
      type: "broadcast", event: "bonus",
      payload: { profile_id: me.id, username: me.username, kind: "attack" },
    });
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
            <p style={{ fontWeight: 800 }}>
              <span style={{ color: myWin ? "var(--ok)" : "#e05555" }}>{myWin ? t("yzEndWinBanner") : t("yzEndLoseBanner")}</span>
              {" — "}<span style={{ fontFamily: "'Space Mono'" }}>{points} {t("pts")}</span>
            </p>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <p className="muted" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {t("question")} {q.index + 1} / {q.total}
                {/* Chip de catégorie (demande 2026-07) : Musique, Arts,
                    Histoire, Langues, Géographie, Maths, Sports… — remonte
                    avec la question elle-même (payload.cat, calculé par
                    l'hôte), remontée à chaque question via key. */}
                {q.cat && QUIZ_CATS[q.cat] && (
                  <span className="quiz-cat-chip" key={q.index}>
                    {QUIZ_CATS[q.cat].icon} {lang === "en" ? QUIZ_CATS[q.cat].en : QUIZ_CATS[q.cat].fr}
                  </span>
                )}
              </p>
              <span style={{
                fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em",
                color: DIFFS.find(d => d.id === q.diff)?.color, opacity: .85
              }}>{DIFFS.find(d => d.id === q.diff)?.label}</span>
            </div>

            {/* Barre de bonus : progression de l'enchaînement (3 bonnes
                réponses d'affilée = 1 jeton), et les 2 bonus utilisables
                avec un jeton — 50/50 (pour soi) ou attaque de temps (contre
                les autres). Un seul bonus utilisable par question. */}
            <div className="quiz-bonus-bar">
              <span className="quiz-streak" title={t("quizStreakHint")}>
                🔥 {Math.min(streak, 3)}/3
              </span>
              {tokens > 0 && !revealed && (
                <>
                  <button type="button" className="quiz-bonus-btn" disabled={usedBonusThisQ || lockedMine}
                    onClick={useFiftyFifty} title={t("quizBonusFiftyHint")}>
                    🃏 50/50
                  </button>
                  <button type="button" className="quiz-bonus-btn attack" disabled={usedBonusThisQ}
                    onClick={useAttack} title={t("quizBonusAttackHint")}>
                    ⏱️ {t("quizBonusAttack")}
                  </button>
                  <span className="quiz-token-count">×{tokens}</span>
                </>
              )}
            </div>
            {bonusNotice && (
              <p className="quiz-bonus-notice">
                {bonusNotice.kind === "attack"
                  ? `⏱️ ${bonusNotice.username} ${t("quizBonusAttackUsed")}`
                  : `🃏 ${bonusNotice.username} ${t("quizBonusFiftyUsed")}`}
              </p>
            )}

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
              {q.choices.filter(text => !fiftyHidden.includes(text)).map((text, i) => {
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
