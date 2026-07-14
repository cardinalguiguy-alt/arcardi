/* ==========================================================================
   tuPreferesQuestions — banque de questions du jeu "Tu préfères ?"
   (composant components/tupreferes/TuPreferesGame.js).
   ==========================================================================

   FORMAT D'UNE QUESTION (bilingue, sans "ni l'un ni l'autre" possible) :
     {
       id:  "c001",            // identifiant STABLE et UNIQUE (sert de clé
                               //   réseau + persistance). Préfixe = catégorie
                               //   (c = classic, s = strange, p = power,
                               //   d = dilemma). Ne JAMAIS réutiliser un id.
       cat: "classic",         // une des CATEGORIES ci-dessous
       fr:  ["option A", "option B"],   // s'affiche après "Tu préfères : …"
       en:  ["option A", "option B"],   // même ordre A/B que le français
     }

   AJOUTER DES QUESTIONS (des milliers possibles) :
     1. Choisis la bonne catégorie (ou ajoute-en une dans CATEGORIES).
     2. Ajoute un objet à QUESTIONS avec un id unique (incrémente le numéro
        du préfixe de la catégorie — le prochain libre est indiqué en fin de
        chaque bloc).
     3. Garde l'ORDRE A/B identique entre `fr` et `en` (la révélation et les
        devinettes reposent sur l'index 0 = A / 1 = B).
     4. Reste concis : chaque option tient sur une carte.
     Rien d'autre à toucher : le filtre de début de partie, le menu et le
     tirage aléatoire dérivent tout dynamiquement de ce fichier.

   ESPRIT DES CARTES (demande de l'hôte du projet) :
     - Ne pas rater les grands classiques du genre (mer/montagne, voler/
       invisible, lire les pensées/voyager dans le temps, le wagon fou…).
     - Assumer les cartes INTENSES : vrais dilemmes moraux, gross-out,
       sacrifices. Registre "soirée entre adultes", jamais gratuitement
       choquant.
     - Beaucoup de "deux options POSITIVES qui s'excluent" (il faut trancher
       entre deux plaisirs), pas seulement du "moins pire".
   ========================================================================== */

// Catégories proposées au filtre de début de partie. `id` sert de clé
// réseau/persistance ; icon + libellés bilingues pour l'UI.
export const CATEGORIES = [
  { id: "classic", icon: "🌤️", fr: "Classique",         en: "Classic" },
  { id: "strange", icon: "🤪", fr: "Absurde & étrange", en: "Strange & absurd" },
  { id: "power",   icon: "⚡", fr: "Super-pouvoirs",     en: "Superpowers" },
  { id: "dilemma", icon: "⚖️", fr: "Dilemmes & gourmandise", en: "Dilemmas & food" },
];

export const CATEGORY_IDS = CATEGORIES.map(c => c.id);

export const QUESTIONS = [
  // ======================= CLASSIQUE (c) ==============================
  // Choix de vie, préférences du quotidien, "deux plaisirs qui s'excluent",
  // quelques arbitrages de valeurs (argent/amour, gloire/tranquillité).
  { id: "c001", cat: "classic", fr: ["la mer", "la montagne"], en: ["the sea", "the mountains"] },
  { id: "c002", cat: "classic", fr: ["l'été toute l'année", "l'hiver toute l'année"], en: ["endless summer", "endless winter"] },
  { id: "c003", cat: "classic", fr: ["le sucré", "le salé"], en: ["sweet", "savory"] },
  { id: "c004", cat: "classic", fr: ["les chiens", "les chats"], en: ["dogs", "cats"] },
  { id: "c005", cat: "classic", fr: ["le café", "le thé"], en: ["coffee", "tea"] },
  { id: "c006", cat: "classic", fr: ["vivre à la campagne", "vivre en ville"], en: ["living in the countryside", "living in the city"] },
  { id: "c007", cat: "classic", fr: ["lire un grand roman", "regarder un grand film"], en: ["reading a great novel", "watching a great film"] },
  { id: "c008", cat: "classic", fr: ["le soleil", "la pluie"], en: ["sunshine", "rain"] },
  { id: "c009", cat: "classic", fr: ["partir en voyage sans jamais rentrer", "rester chez toi entouré des tiens"], en: ["travelling forever without returning", "staying home surrounded by loved ones"] },
  { id: "c010", cat: "classic", fr: ["être riche mais seul", "pauvre mais très entouré"], en: ["rich but alone", "poor but deeply loved"] },
  { id: "c011", cat: "classic", fr: ["parler toutes les langues du monde", "jouer de tous les instruments"], en: ["speaking every language on Earth", "playing every instrument"] },
  { id: "c012", cat: "classic", fr: ["une mémoire parfaite", "un charisme irrésistible"], en: ["a perfect memory", "irresistible charisma"] },
  { id: "c013", cat: "classic", fr: ["le petit-déjeuner à volonté", "le dessert à volonté"], en: ["unlimited breakfast", "unlimited dessert"] },
  { id: "c014", cat: "classic", fr: ["voyager dans le passé", "voyager dans le futur"], en: ["travelling to the past", "travelling to the future"] },
  { id: "c015", cat: "classic", fr: ["vivre au bord de la mer", "vivre au cœur d'une grande ville"], en: ["living by the sea", "living in the heart of a big city"] },
  { id: "c016", cat: "classic", fr: ["ne plus jamais avoir froid", "ne plus jamais avoir chaud"], en: ["never being cold again", "never being hot again"] },
  { id: "c017", cat: "classic", fr: ["gagner au loto demain", "trouver le grand amour dans un an"], en: ["winning the lottery tomorrow", "finding true love in a year"] },
  { id: "c018", cat: "classic", fr: ["être toujours 20 min en avance", "toujours 10 min en retard"], en: ["always being 20 min early", "always being 10 min late"] },
  { id: "c019", cat: "classic", fr: ["un talent artistique rare", "une intelligence hors norme"], en: ["a rare artistic talent", "extraordinary intelligence"] },
  { id: "c020", cat: "classic", fr: ["la montagne l'hiver", "la plage l'été"], en: ["the mountains in winter", "the beach in summer"] },
  { id: "c021", cat: "classic", fr: ["un grand appartement en ville", "une maison avec jardin en banlieue"], en: ["a big apartment downtown", "a house with a garden in the suburbs"] },
  { id: "c022", cat: "classic", fr: ["un métier passionnant mal payé", "un métier ennuyeux très bien payé"], en: ["a thrilling job with low pay", "a boring job with great pay"] },
  { id: "c023", cat: "classic", fr: ["voler gratuitement partout à vie", "manger au restaurant gratuitement à vie"], en: ["free flights anywhere for life", "free restaurant meals for life"] },
  { id: "c024", cat: "classic", fr: ["être célèbre et admiré", "être riche et anonyme"], en: ["being famous and admired", "being rich and anonymous"] },
  { id: "c025", cat: "classic", fr: ["vivre 100 ans en pleine santé", "150 ans en santé fragile"], en: ["living 100 healthy years", "150 fragile years"] },
  { id: "c026", cat: "classic", fr: ["le grand froid du Nord", "la chaleur des tropiques"], en: ["the deep cold of the North", "the heat of the tropics"] },
  { id: "c027", cat: "classic", fr: ["une soirée entre amis", "une soirée en amoureux"], en: ["a night out with friends", "a romantic evening"] },
  { id: "c028", cat: "classic", fr: ["cuisiner comme un chef", "danser comme un pro"], en: ["cooking like a chef", "dancing like a pro"] },
  { id: "c029", cat: "classic", fr: ["ne plus jamais devoir dormir", "ne plus jamais devoir manger"], en: ["never needing to sleep again", "never needing to eat again"] },
  { id: "c030", cat: "classic", fr: ["avoir toujours raison", "être toujours heureux"], en: ["always being right", "always being happy"] },
  { id: "c031", cat: "classic", fr: ["renoncer à la musique pour toujours", "renoncer au cinéma pour toujours"], en: ["giving up music forever", "giving up cinema forever"] },
  { id: "c032", cat: "classic", fr: ["une terrasse ensoleillée l'hiver", "un jardin ombragé l'été"], en: ["a sunny terrace in winter", "a shady garden in summer"] },
  { id: "c033", cat: "classic", fr: ["un road trip en van", "un séjour dans un palace"], en: ["a van road trip", "a stay in a luxury palace"] },
  { id: "c034", cat: "classic", fr: ["la pizza à vie", "les sushis à vie"], en: ["pizza for life", "sushi for life"] },
  { id: "c035", cat: "classic", fr: ["gagner un an de vacances", "gagner dix ans de salaire"], en: ["winning a year of vacation", "winning ten years of salary"] },
  { id: "c036", cat: "classic", fr: ["rire aux éclats tous les jours", "pleurer de joie une fois par an"], en: ["laughing out loud every day", "crying with joy once a year"] },
  { id: "c037", cat: "classic", fr: ["un feu de cheminée en hiver", "une baignade nocturne en été"], en: ["a fireplace in winter", "a midnight swim in summer"] },
  { id: "c038", cat: "classic", fr: ["revivre à jamais tes plus beaux souvenirs", "découvrir sans cesse du nouveau"], en: ["reliving your best memories forever", "endlessly discovering new things"] },
  { id: "c039", cat: "classic", fr: ["un ami dans chaque pays", "une maison dans chaque pays"], en: ["a friend in every country", "a home in every country"] },
  { id: "c040", cat: "classic", fr: ["le calme absolu d'une île déserte", "l'effervescence d'une capitale"], en: ["the total calm of a desert island", "the buzz of a capital city"] },
  { id: "c041", cat: "classic", fr: ["ne plus jamais tomber malade", "ne plus jamais être fatigué"], en: ["never getting sick again", "never being tired again"] },
  { id: "c042", cat: "classic", fr: ["comprendre le langage des animaux", "parler dix langues couramment"], en: ["understanding animal language", "speaking ten languages fluently"] },
  { id: "c043", cat: "classic", fr: ["un dîner avec ton idole", "une journée avec un proche disparu"], en: ["a dinner with your idol", "a day with a departed loved one"] },
  { id: "c044", cat: "classic", fr: ["être le meilleur du monde dans un domaine", "être bon dans absolument tout"], en: ["being the world's best at one thing", "being good at absolutely everything"] },
  { id: "c045", cat: "classic", fr: ["avoir toujours la bonne réponse", "poser toujours la bonne question"], en: ["always having the right answer", "always asking the right question"] },
  { id: "c046", cat: "classic", fr: ["une grande histoire d'amour qui finit mal", "une vie tranquille sans passion"], en: ["a great love that ends badly", "a calm life without passion"] },
  { id: "c047", cat: "classic", fr: ["le luxe sans le temps d'en profiter", "le temps libre sans le luxe"], en: ["luxury with no time to enjoy it", "free time without the luxury"] },
  { id: "c048", cat: "classic", fr: ["un talent de conteur qui captive", "une écoute qui apaise tout le monde"], en: ["a captivating gift for storytelling", "a listening ear that soothes everyone"] },
  { id: "c049", cat: "classic", fr: ["voir le monde entier une seule fois", "connaître ta région par cœur pour toujours"], en: ["seeing the whole world once", "knowing your home region by heart forever"] },
  { id: "c050", cat: "classic", fr: ["le silence de la nature", "le brouhaha d'un marché animé"], en: ["the silence of nature", "the hum of a lively market"] },
  { id: "c051", cat: "classic", fr: ["un métier qui aide les gens", "un métier qui te rend célèbre"], en: ["a job that helps people", "a job that makes you famous"] },
  { id: "c052", cat: "classic", fr: ["ne jamais oublier un visage", "ne jamais oublier un nom"], en: ["never forgetting a face", "never forgetting a name"] },
  { id: "c053", cat: "classic", fr: ["manger sans jamais grossir", "dormir peu sans jamais être fatigué"], en: ["eating without ever gaining weight", "sleeping little without ever tiring"] },
  { id: "c054", cat: "classic", fr: ["vivre chaque jour comme le dernier", "vivre comme si tu étais éternel"], en: ["living each day as your last", "living as if you were immortal"] },
  { id: "c055", cat: "classic", fr: ["un grand talent que personne ne voit", "une réussite modeste reconnue de tous"], en: ["a great hidden talent", "modest success everyone recognizes"] },
  { id: "c056", cat: "classic", fr: ["gagner tout ce que tu entreprends", "apprendre de chaque échec"], en: ["winning at everything you try", "learning from every failure"] },
  { id: "c057", cat: "classic", fr: ["le premier café du matin", "le dernier verre entre amis le soir"], en: ["the first coffee of the morning", "the last drink with friends at night"] },
  { id: "c058", cat: "classic", fr: ["une vie d'aventures risquées", "une vie douce et sûre"], en: ["a life of risky adventures", "a soft and safe life"] },
  { id: "c059", cat: "classic", fr: ["figer un instant de bonheur pour toujours", "en vivre mille autres"], en: ["freezing one happy moment forever", "living a thousand more of them"] },
  { id: "c060", cat: "classic", fr: ["la maison la plus modeste d'un beau quartier", "la plus belle maison d'un quartier lugubre"], en: ["the humblest house in a lovely area", "the finest house in a grim area"] },
  { id: "c061", cat: "classic", fr: ["ne plus jamais te tromper de chemin", "ne plus jamais oublier un anniversaire"], en: ["never taking a wrong turn again", "never forgetting a birthday again"] },
  { id: "c062", cat: "classic", fr: ["un chalet à la montagne", "une villa au bord de l'océan"], en: ["a cabin in the mountains", "a villa by the ocean"] },
  // prochain id classic libre : c063

  // ===================== ABSURDE & ÉTRANGE (s) ========================
  // Corps bizarre, gross-out, situations décalées. Registre "cartes qui
  // font rire ou grimacer".
  { id: "s001", cat: "strange", fr: ["vivre avec des dents de lait qui bougent toute ta vie", "avoir quinze orteils à chaque pied"], en: ["living with wobbly baby teeth your whole life", "having fifteen toes on each foot"] },
  { id: "s002", cat: "strange", fr: ["des doigts en spaghetti", "des cheveux en fil de fer"], en: ["spaghetti fingers", "wire hair"] },
  { id: "s003", cat: "strange", fr: ["éternuer du glitter à chaque fois", "transpirer du sirop d'érable"], en: ["sneezing glitter every time", "sweating maple syrup"] },
  { id: "s004", cat: "strange", fr: ["une main géante et une main minuscule", "une jambe géante et une jambe minuscule"], en: ["one giant hand and one tiny hand", "one giant leg and one tiny leg"] },
  { id: "s005", cat: "strange", fr: ["ne parler qu'en chuchotant", "ne parler qu'en criant"], en: ["only ever whispering", "only ever shouting"] },
  { id: "s006", cat: "strange", fr: ["la langue d'un caméléon", "les yeux indépendants d'un caméléon"], en: ["a chameleon's tongue", "a chameleon's independent eyes"] },
  { id: "s007", cat: "strange", fr: ["des pieds qui sentent le vieux fromage", "une haleine de poubelle"], en: ["feet that smell of old cheese", "garbage breath"] },
  { id: "s008", cat: "strange", fr: ["un troisième œil sur la nuque", "une troisième oreille dans la paume"], en: ["a third eye on the back of your neck", "a third ear in your palm"] },
  { id: "s009", cat: "strange", fr: ["ne plus jamais pouvoir fermer la bouche", "ne plus jamais pouvoir ouvrir grand les yeux"], en: ["never being able to close your mouth again", "never being able to open your eyes wide again"] },
  { id: "s010", cat: "strange", fr: ["des ongles qui poussent d'un cm par heure", "des cheveux qui poussent d'un cm par heure"], en: ["nails growing 1 cm per hour", "hair growing 1 cm per hour"] },
  { id: "s011", cat: "strange", fr: ["ne marcher qu'en arrière", "ne marcher qu'en crabe, de côté"], en: ["only ever walking backwards", "only ever walking sideways like a crab"] },
  { id: "s012", cat: "strange", fr: ["la peau qui change de couleur selon ton humeur", "la voix qui change de ton selon ton humeur"], en: ["skin that changes color with your mood", "a voice that changes pitch with your mood"] },
  { id: "s013", cat: "strange", fr: ["manger toute soupe à la fourchette", "manger toute pâte à la paille"], en: ["eating all soup with a fork", "eating all pasta through a straw"] },
  { id: "s014", cat: "strange", fr: ["une chanson horripilante en tête en permanence", "un caillou dans la chaussure en permanence"], en: ["an annoying song stuck in your head forever", "a pebble in your shoe forever"] },
  { id: "s015", cat: "strange", fr: ["te réveiller chaque matin dans un pays au hasard", "te réveiller chaque matin avec un accent différent"], en: ["waking each morning in a random country", "waking each morning with a different accent"] },
  { id: "s016", cat: "strange", fr: ["des mini-bras de T-rex", "un très long cou de girafe"], en: ["tiny T-rex arms", "a very long giraffe neck"] },
  { id: "s017", cat: "strange", fr: ["tousser des bulles de savon", "cracher des confettis"], en: ["coughing up soap bubbles", "spitting confetti"] },
  { id: "s018", cat: "strange", fr: ["une queue de lézard qui repousse", "des oreilles de lapin qui bougent"], en: ["a regrowing lizard tail", "twitching rabbit ears"] },
  { id: "s019", cat: "strange", fr: ["sentir une odeur de poisson que toi seul perçois", "entendre un léger sifflement constant"], en: ["smelling a fish odor only you can detect", "hearing a faint constant whistle"] },
  { id: "s020", cat: "strange", fr: ["des dents qui brillent dans le noir", "des yeux qui clignotent quand tu mens"], en: ["teeth that glow in the dark", "eyes that blink when you lie"] },
  { id: "s021", cat: "strange", fr: ["sautiller au lieu de marcher", "ramper au lieu de t'asseoir"], en: ["hopping instead of walking", "crawling instead of sitting"] },
  { id: "s022", cat: "strange", fr: ["la peau couverte d'écailles", "la peau couverte de plumes"], en: ["skin covered in scales", "skin covered in feathers"] },
  { id: "s023", cat: "strange", fr: ["éternuer toutes les cinq minutes", "avoir le hoquet une heure par jour"], en: ["sneezing every five minutes", "hiccupping one hour a day"] },
  { id: "s024", cat: "strange", fr: ["des mains à la place des pieds", "des pieds à la place des mains"], en: ["hands where your feet should be", "feet where your hands should be"] },
  { id: "s025", cat: "strange", fr: ["devoir lécher ton coude chaque heure", "devoir cligner d'un œil chaque fois qu'on te parle"], en: ["having to lick your elbow every hour", "having to wink whenever someone talks to you"] },
  { id: "s026", cat: "strange", fr: ["une tête deux fois plus grosse", "un corps deux fois plus petit"], en: ["a head twice as big", "a body twice as small"] },
  { id: "s027", cat: "strange", fr: ["baver comme un escargot", "muer comme un serpent une fois par mois"], en: ["leaving a snail trail everywhere", "shedding your skin like a snake monthly"] },
  { id: "s028", cat: "strange", fr: ["des sourcils qui touchent le sol", "une barbe qui repousse en une nuit"], en: ["eyebrows that reach the floor", "a beard that grows back overnight"] },
  { id: "s029", cat: "strange", fr: ["ne communiquer que par mime", "ne communiquer qu'en chantant"], en: ["communicating only by mime", "communicating only by singing"] },
  { id: "s030", cat: "strange", fr: ["un nez qui s'allonge quand tu mens", "des joues qui rougissent fluo"], en: ["a nose that grows when you lie", "cheeks that blush neon"] },
  { id: "s031", cat: "strange", fr: ["porter les mêmes chaussettes mouillées à vie", "porter le même pull qui gratte à vie"], en: ["wearing the same wet socks forever", "wearing the same itchy sweater forever"] },
  { id: "s032", cat: "strange", fr: ["des antennes d'insecte", "une carapace de tortue"], en: ["insect antennae", "a turtle shell"] },
  { id: "s033", cat: "strange", fr: ["dormir la tête en bas comme une chauve-souris", "dormir debout comme un cheval"], en: ["sleeping upside down like a bat", "sleeping standing up like a horse"] },
  { id: "s034", cat: "strange", fr: ["un rire de hyène incontrôlable", "un cri de mouette quand tu es surpris"], en: ["an uncontrollable hyena laugh", "a seagull screech when startled"] },
  { id: "s035", cat: "strange", fr: ["sentir la barbe à papa en permanence", "sentir le pain grillé en permanence"], en: ["always smelling of cotton candy", "always smelling of toast"] },
  { id: "s036", cat: "strange", fr: ["des doigts palmés", "des orteils préhensiles comme un singe"], en: ["webbed fingers", "grasping toes like a monkey"] },
  { id: "s037", cat: "strange", fr: ["pleurer des larmes de lait", "saigner du jus d'orange"], en: ["crying tears of milk", "bleeding orange juice"] },
  { id: "s038", cat: "strange", fr: ["une seule narine géante", "une seule dent immense mais parfaite"], en: ["one giant nostril", "one huge but perfect tooth"] },
  { id: "s039", cat: "strange", fr: ["répéter le dernier mot de chaque phrase", "commencer chaque phrase par « bref »"], en: ["repeating the last word of every sentence", "starting every sentence with “anyway”"] },
  { id: "s040", cat: "strange", fr: ["la peau qui pèle comme un coup de soleil éternel", "la peau qui gratte comme une piqûre éternelle"], en: ["skin that peels like an eternal sunburn", "skin that itches like an eternal bug bite"] },
  { id: "s041", cat: "strange", fr: ["des cheveux qui changent de couleur chaque jour", "des yeux qui changent de couleur chaque heure"], en: ["hair that changes color every day", "eyes that change color every hour"] },
  { id: "s042", cat: "strange", fr: ["porter un costume de banane tous les jours", "porter un masque de clown toute ta vie"], en: ["wearing a banana suit every day", "wearing a clown mask your whole life"] },
  { id: "s043", cat: "strange", fr: ["des jambes de flamant rose", "des bras de pieuvre, souples et longs"], en: ["flamingo legs", "long, boneless octopus arms"] },
  { id: "s044", cat: "strange", fr: ["renifler tout ce que tu touches", "lécher tout ce que tu manges pour l'identifier"], en: ["sniffing everything you touch", "licking everything you eat to identify it"] },
  { id: "s045", cat: "strange", fr: ["un hoquet qui fait un bruit de klaxon", "des éternuements qui font vaciller les lumières"], en: ["hiccups that honk like a car horn", "sneezes that make the lights flicker"] },
  { id: "s046", cat: "strange", fr: ["grandir de dix cm chaque année", "rétrécir de deux cm chaque année"], en: ["growing 10 cm taller every year", "shrinking 2 cm every year"] },
  { id: "s047", cat: "strange", fr: ["une main collante comme du velcro", "des pieds aimantés à tout le métal"], en: ["a hand as sticky as velcro", "feet magnetized to all metal"] },
  { id: "s048", cat: "strange", fr: ["manger une cuillère de sable par jour", "boire un verre d'eau de mer par jour"], en: ["eating a spoon of sand each day", "drinking a glass of seawater each day"] },
  { id: "s049", cat: "strange", fr: ["des paupières transparentes", "des joues transparentes qui montrent ce que tu manges"], en: ["transparent eyelids", "transparent cheeks that show what you're eating"] },
  { id: "s050", cat: "strange", fr: ["la démarche dandinante d'un pingouin", "le sautillement d'un kangourou"], en: ["a penguin's waddle", "a kangaroo's hop"] },
  { id: "s051", cat: "strange", fr: ["une auréole de moustiques les jours tristes", "un nuage de mouches les jours heureux"], en: ["a halo of mosquitoes on sad days", "a cloud of flies on happy days"] },
  { id: "s052", cat: "strange", fr: ["des dents de castor qui poussent sans fin", "des griffes qu'il faut limer chaque jour"], en: ["endless beaver teeth", "claws you must file every day"] },
  { id: "s053", cat: "strange", fr: ["chanter tout ce que tu dis en public", "danser à chaque fois que tu marches"], en: ["singing everything you say in public", "dancing every time you walk"] },
  { id: "s054", cat: "strange", fr: ["un doigt en plus à chaque main", "un orteil en moins à chaque pied"], en: ["an extra finger on each hand", "one fewer toe on each foot"] },
  { id: "s055", cat: "strange", fr: ["un rire silencieux mais des larmes qui giclent", "un rire tonitruant sans aucune larme"], en: ["a silent laugh but squirting tears", "a booming laugh with no tears at all"] },
  { id: "s056", cat: "strange", fr: ["la peau qui grince quand tu bouges", "les articulations qui craquent comme du pop-corn"], en: ["skin that squeaks when you move", "joints that crackle like popcorn"] },
  { id: "s057", cat: "strange", fr: ["un mini-nuage de pluie au-dessus de toi les jours tristes", "un petit soleil brûlant les jours heureux"], en: ["a tiny rain cloud over you on sad days", "a small scorching sun on happy days"] },
  { id: "s058", cat: "strange", fr: ["porter tes vêtements à l'envers à vie", "porter tes chaussures au mauvais pied à vie"], en: ["wearing your clothes inside out forever", "wearing your shoes on the wrong feet forever"] },
  { id: "s059", cat: "strange", fr: ["une langue de trente centimètres", "des oreilles d'éléphant"], en: ["a thirty-centimeter tongue", "elephant ears"] },
  { id: "s060", cat: "strange", fr: ["des taches qui apparaissent quand tu mens", "des rayures qui apparaissent quand tu as peur"], en: ["spots that appear when you lie", "stripes that appear when you're scared"] },
  { id: "s061", cat: "strange", fr: ["faire bâiller tout le monde à cent mètres à la ronde", "faire éternuer tous ceux qui t'approchent"], en: ["making everyone within 100 m yawn", "making everyone near you sneeze"] },
  { id: "s062", cat: "strange", fr: ["un pouce géant", "un auriculaire aussi long qu'un bras"], en: ["a giant thumb", "a pinky as long as an arm"] },
  // prochain id strange libre : s063

  // ================== SUPER-POUVOIRS & FANTASTIQUE (p) =================
  // Les grands duels de pouvoirs, avec ou sans contrepartie (drawback).
  { id: "p001", cat: "power", fr: ["voler", "être invisible"], en: ["flying", "being invisible"] },
  { id: "p002", cat: "power", fr: ["lire dans les pensées", "voyager dans le temps"], en: ["reading minds", "travelling through time"] },
  { id: "p003", cat: "power", fr: ["la téléportation", "arrêter le temps"], en: ["teleportation", "stopping time"] },
  { id: "p004", cat: "power", fr: ["la super-force", "la super-vitesse"], en: ["super strength", "super speed"] },
  { id: "p005", cat: "power", fr: ["la télékinésie", "la télépathie"], en: ["telekinesis", "telepathy"] },
  { id: "p006", cat: "power", fr: ["parler à tous les animaux", "parler toutes les langues humaines"], en: ["talking to all animals", "speaking all human languages"] },
  { id: "p007", cat: "power", fr: ["respirer sous l'eau", "survivre dans l'espace sans combinaison"], en: ["breathing underwater", "surviving in space with no suit"] },
  { id: "p008", cat: "power", fr: ["devenir invisible mais tout nu", "voler mais à dix cm du sol seulement"], en: ["turning invisible but fully naked", "flying but only 10 cm off the ground"] },
  { id: "p009", cat: "power", fr: ["arrêter le temps mais vieillir deux fois plus vite", "revenir en arrière mais oublier pourquoi"], en: ["stopping time but ageing twice as fast", "rewinding time but forgetting why"] },
  { id: "p010", cat: "power", fr: ["te téléporter partout mais arriver trempé", "voler partout mais toujours à contre-vent"], en: ["teleporting anywhere but arriving soaked", "flying anywhere but always against the wind"] },
  { id: "p011", cat: "power", fr: ["lire les pensées sans pouvoir les éteindre", "voir l'avenir mais seulement les mauvaises nouvelles"], en: ["reading minds with no off switch", "seeing the future but only bad news"] },
  { id: "p012", cat: "power", fr: ["guérir n'importe quelle blessure des autres", "te guérir toi-même instantanément"], en: ["healing anyone else's wounds", "healing yourself instantly"] },
  { id: "p013", cat: "power", fr: ["être immortel mais seul", "vivre une vie normale entouré des tiens"], en: ["being immortal but alone", "living a normal life surrounded by loved ones"] },
  { id: "p014", cat: "power", fr: ["être invincible mais mortel", "être immortel mais vulnérable"], en: ["being invincible but mortal", "being immortal but vulnerable"] },
  { id: "p015", cat: "power", fr: ["contrôler le feu", "contrôler l'eau"], en: ["controlling fire", "controlling water"] },
  { id: "p016", cat: "power", fr: ["contrôler la météo", "contrôler les rêves des gens"], en: ["controlling the weather", "controlling people's dreams"] },
  { id: "p017", cat: "power", fr: ["une mémoire photographique", "apprendre n'importe quelle compétence en une heure"], en: ["a photographic memory", "learning any skill in one hour"] },
  { id: "p018", cat: "power", fr: ["te dédoubler en clones", "te transformer en n'importe quel animal"], en: ["duplicating yourself into clones", "shapeshifting into any animal"] },
  { id: "p019", cat: "power", fr: ["devenir géant à volonté", "devenir minuscule à volonté"], en: ["becoming giant at will", "becoming tiny at will"] },
  { id: "p020", cat: "power", fr: ["une super-ouïe qui entend tout au loin", "une super-vue qui voit à des kilomètres"], en: ["super hearing that catches everything far away", "super sight that sees for miles"] },
  { id: "p021", cat: "power", fr: ["voler mais pas plus vite qu'à pied", "te téléporter mais seulement où tu es déjà allé"], en: ["flying but no faster than walking", "teleporting but only to places you've been"] },
  { id: "p022", cat: "power", fr: ["être invisible une heure par jour", "arrêter le temps une minute par jour"], en: ["being invisible one hour a day", "stopping time one minute a day"] },
  { id: "p023", cat: "power", fr: ["tout changer en or d'un toucher, même la nourriture", "faire pousser n'importe quoi instantanément"], en: ["turning anything to gold by touch, even food", "growing anything instantly"] },
  { id: "p024", cat: "power", fr: ["cracher du feu", "cracher de la glace"], en: ["breathing fire", "spitting ice"] },
  { id: "p025", cat: "power", fr: ["marcher sur l'eau", "marcher dans les airs sur des marches invisibles"], en: ["walking on water", "walking on air up invisible steps"] },
  { id: "p026", cat: "power", fr: ["incassablement fort mais lent", "incroyablement rapide mais fragile"], en: ["unbreakably strong but slow", "incredibly fast but fragile"] },
  { id: "p027", cat: "power", fr: ["lire l'avenir d'une seule personne", "effacer un souvenir chez quiconque"], en: ["reading one person's future", "erasing a memory from anyone"] },
  { id: "p028", cat: "power", fr: ["invisible mais tes vêtements restent visibles", "voler mais seulement la nuit"], en: ["invisible but your clothes stay visible", "flying but only at night"] },
  { id: "p029", cat: "power", fr: ["un dragon de compagnie", "un phénix familier immortel"], en: ["a pet dragon", "an immortal phoenix familiar"] },
  { id: "p030", cat: "power", fr: ["tout réparer d'un toucher", "tout construire d'une pensée"], en: ["fixing anything with a touch", "building anything with a thought"] },
  { id: "p031", cat: "power", fr: ["rejouer toute musique après l'avoir entendue une fois", "peindre instantanément tout ce que tu imagines"], en: ["replaying any music after hearing it once", "instantly painting anything you imagine"] },
  { id: "p032", cat: "power", fr: ["devenir le plus intelligent du monde", "devenir le plus chanceux du monde"], en: ["becoming the smartest person alive", "becoming the luckiest person alive"] },
  { id: "p033", cat: "power", fr: ["contrôler la gravité autour de toi", "contrôler le magnétisme"], en: ["controlling gravity around you", "controlling magnetism"] },
  { id: "p034", cat: "power", fr: ["parler aux morts", "voir dix secondes dans le futur"], en: ["speaking with the dead", "seeing ten seconds into the future"] },
  { id: "p035", cat: "power", fr: ["voler à la vitesse du son", "plonger jusqu'au fond des océans sans danger"], en: ["flying at the speed of sound", "diving to the ocean floor unharmed"] },
  { id: "p036", cat: "power", fr: ["un pouvoir immense que tu ne contrôles pas", "un petit pouvoir parfaitement maîtrisé"], en: ["a huge power you can't control", "a tiny power perfectly mastered"] },
  { id: "p037", cat: "power", fr: ["te régénérer mais ressentir chaque douleur", "ne rien ressentir mais ne jamais cicatriser"], en: ["regenerating but feeling every pain", "feeling nothing but never healing"] },
  { id: "p038", cat: "power", fr: ["rendre quiconque heureux d'un toucher", "t'effacer de la mémoire de quiconque à volonté"], en: ["making anyone happy with a touch", "erasing yourself from anyone's memory at will"] },
  { id: "p039", cat: "power", fr: ["des ailes magnifiques mais encombrantes", "une cape d'invisibilité qu'on peut te voler"], en: ["magnificent but cumbersome wings", "an invisibility cloak that can be stolen from you"] },
  { id: "p040", cat: "power", fr: ["arrêter le temps pour tous sauf toi", "accélérer le temps quand tu t'ennuies"], en: ["stopping time for everyone but you", "fast-forwarding time when you're bored"] },
  { id: "p041", cat: "power", fr: ["parler à ton toi du passé, une fois", "parler à ton toi du futur, une fois"], en: ["speaking to your past self, once", "speaking to your future self, once"] },
  { id: "p042", cat: "power", fr: ["lancer des éclairs", "briller comme le soleil"], en: ["throwing lightning bolts", "glowing like the sun"] },
  { id: "p043", cat: "power", fr: ["devenir intangible et traverser les murs", "devenir indestructible et rien ne t'atteint"], en: ["turning intangible and passing through walls", "turning indestructible so nothing can hurt you"] },
  { id: "p044", cat: "power", fr: ["voler mais avoir le vertige", "respirer sous l'eau mais avoir peur de l'eau"], en: ["flying but being afraid of heights", "breathing underwater but fearing water"] },
  { id: "p045", cat: "power", fr: ["comprendre l'univers mais ne rien pouvoir expliquer", "tout expliquer mais ne rien comprendre"], en: ["understanding the universe but explaining nothing", "explaining anything but understanding nothing"] },
  { id: "p046", cat: "power", fr: ["changer d'apparence à volonté", "changer de voix à volonté"], en: ["changing your appearance at will", "changing your voice at will"] },
  { id: "p047", cat: "power", fr: ["une chance insolente à tous les jeux", "un flair infaillible pour la vérité"], en: ["outrageous luck at every game", "an infallible nose for the truth"] },
  { id: "p048", cat: "power", fr: ["figer tes adversaires d'un regard", "lire leurs intentions avant qu'ils agissent"], en: ["freezing your rivals with a glare", "reading their intentions before they act"] },
  { id: "p049", cat: "power", fr: ["le héros que tout le monde acclame", "l'ombre discrète qui sauve sans être vue"], en: ["the hero everyone cheers for", "the quiet shadow who saves unseen"] },
  { id: "p050", cat: "power", fr: ["ramener une personne d'entre les morts, une seule fois", "empêcher une catastrophe, une seule fois"], en: ["bringing one person back from the dead, once", "preventing one disaster, once"] },
  { id: "p051", cat: "power", fr: ["maîtriser la foudre mais attirer les orages", "maîtriser le froid mais geler tout ce que tu touches"], en: ["mastering lightning but attracting storms", "mastering cold but freezing all you touch"] },
  { id: "p052", cat: "power", fr: ["être invisible aux caméras", "être inaudible aux micros"], en: ["being invisible to cameras", "being inaudible to microphones"] },
  { id: "p053", cat: "power", fr: ["la force de soulever une voiture", "l'agilité d'esquiver une balle"], en: ["the strength to lift a car", "the agility to dodge a bullet"] },
  { id: "p054", cat: "power", fr: ["voyager entre les mondes des rêves", "voyager entre les époques de l'Histoire"], en: ["travelling between dream worlds", "travelling between eras of history"] },
  { id: "p055", cat: "power", fr: ["soigner les cœurs brisés d'un mot", "réparer les objets cassés d'un souffle"], en: ["healing broken hearts with a word", "mending broken things with a breath"] },
  { id: "p056", cat: "power", fr: ["maître du temps mais figé à ton âge", "maître de l'espace mais incapable de rester en place"], en: ["master of time but frozen at your age", "master of space but unable to stay still"] },
  { id: "p057", cat: "power", fr: ["voler sans jamais te fatiguer", "courir sans jamais t'essouffler"], en: ["flying without ever tiring", "running without ever getting winded"] },
  { id: "p058", cat: "power", fr: ["lire dans le cœur des gens", "lire les livres pas encore écrits"], en: ["reading people's hearts", "reading books not yet written"] },
  { id: "p059", cat: "power", fr: ["invisible mais incapable de rien toucher", "tangible mais visible de tous"], en: ["invisible but unable to touch anything", "tangible but visible to everyone"] },
  { id: "p060", cat: "power", fr: ["un pouvoir qui s'affaiblit quand tu l'utilises", "un pouvoir qui se renforce mais te fait vieillir"], en: ["a power that weakens each time you use it", "a power that strengthens but ages you"] },
  { id: "p061", cat: "power", fr: ["arrêter une guerre par la seule parole", "nourrir un pays entier d'un geste"], en: ["ending a war with words alone", "feeding an entire nation with a gesture"] },
  { id: "p062", cat: "power", fr: ["devenir la personne la plus aimée du monde", "devenir la personne la plus libre du monde"], en: ["becoming the most loved person in the world", "becoming the freest person in the world"] },
  // prochain id power libre : p063

  // ================== DILEMMES & GOURMANDISE (d) =======================
  // Vrais dilemmes moraux intenses + grands classiques du genre, puis une
  // série "food" (choix de gourmand, plaisirs qui s'excluent).
  { id: "d001", cat: "dilemma", fr: ["sauver cinq inconnus", "sauver l'être qui t'est le plus cher"], en: ["saving five strangers", "saving the one dearest to you"] },
  { id: "d002", cat: "dilemma", fr: ["connaître la date de ta mort", "connaître la cause de ta mort"], en: ["knowing the date of your death", "knowing the cause of your death"] },
  { id: "d003", cat: "dilemma", fr: ["mettre fin à la faim dans le monde mais perdre un être cher", "garder tous ceux que tu aimes mais la faim persiste"], en: ["ending world hunger but losing a loved one", "keeping everyone you love but hunger remains"] },
  { id: "d004", cat: "dilemma", fr: ["sauver trois membres de ta famille", "sauver mille inconnus que tu ne verras jamais"], en: ["saving three of your family", "saving a thousand strangers you'll never meet"] },
  { id: "d005", cat: "dilemma", fr: ["connaître la vérité absolue mais que personne ne te croie", "être cru de tous mais ne jamais connaître la vérité"], en: ["knowing the absolute truth but no one believing you", "being believed by all but never knowing the truth"] },
  { id: "d006", cat: "dilemma", fr: ["sauver l'humanité en gardant le secret toute ta vie", "être adulé pour un exploit que tu n'as pas accompli"], en: ["saving humanity but keeping it secret your whole life", "being adored for a feat you never achieved"] },
  { id: "d007", cat: "dilemma", fr: ["revivre le pire jour de ta vie chaque année", "oublier ton plus beau souvenir pour toujours"], en: ["reliving your worst day every year", "forgetting your best memory forever"] },
  { id: "d008", cat: "dilemma", fr: ["dire toujours la vérité, même cruelle", "mentir en permanence, même pour le bien"], en: ["always telling the truth, even when cruel", "always lying, even for good reasons"] },
  { id: "d009", cat: "dilemma", fr: ["donner un an de ta vie pour ajouter dix ans à celle d'un inconnu", "garder ton année et le laisser mourir"], en: ["giving a year of your life to add ten to a stranger's", "keeping your year and letting them die"] },
  { id: "d010", cat: "dilemma", fr: ["vivre dans un monde parfait sans liberté", "un monde libre mais profondément injuste"], en: ["living in a perfect world without freedom", "a free but deeply unjust world"] },
  { id: "d011", cat: "dilemma", fr: ["effacer une guerre de l'Histoire au risque d'en créer une pire", "ne rien changer du tout"], en: ["erasing one war from history, risking a worse one", "changing nothing at all"] },
  { id: "d012", cat: "dilemma", fr: ["connaître toutes les réponses", "poser les questions qui changent le monde"], en: ["knowing all the answers", "asking the questions that change the world"] },
  { id: "d013", cat: "dilemma", fr: ["être aimé sans jamais aimer en retour", "aimer profondément sans jamais être aimé"], en: ["being loved without ever loving back", "loving deeply without ever being loved"] },
  { id: "d014", cat: "dilemma", fr: ["pouvoir lire dans les pensées de ton partenaire", "qu'il puisse lire dans les tiennes"], en: ["being able to read your partner's mind", "letting them read yours"] },
  { id: "d015", cat: "dilemma", fr: ["abandonner tes rêves pour sauver ceux d'un proche", "poursuivre les tiens en le laissant renoncer"], en: ["giving up your dreams to save a loved one's", "chasing yours and letting them give up"] },
  { id: "d016", cat: "dilemma", fr: ["corriger ta plus grande erreur mais perdre le bonheur qui a suivi", "tout garder, erreur comprise"], en: ["undoing your biggest mistake but losing the joy that followed", "keeping it all, mistake included"] },
  { id: "d017", cat: "dilemma", fr: ["sauver ton animal adoré", "sauver un inconnu que tu ne connaîtras jamais"], en: ["saving your beloved pet", "saving a stranger you'll never know"] },
  { id: "d018", cat: "dilemma", fr: ["dénoncer un ami coupable d'une faute grave", "le couvrir et porter le poids du secret"], en: ["reporting a friend guilty of something serious", "covering for them and carrying the secret"] },
  { id: "d019", cat: "dilemma", fr: ["offrir une vie heureuse à un inconnu", "t'offrir une vie confortable à toi-même"], en: ["giving a happy life to a stranger", "giving a comfortable life to yourself"] },
  { id: "d020", cat: "dilemma", fr: ["connaître le jour où le monde finira", "connaître le jour où tu tomberas amoureux"], en: ["knowing the day the world ends", "knowing the day you'll fall in love"] },
  { id: "d021", cat: "dilemma", fr: ["supprimer toute douleur physique de l'humanité", "supprimer toute tristesse de l'humanité"], en: ["removing all physical pain from humanity", "removing all sadness from humanity"] },
  { id: "d022", cat: "dilemma", fr: ["vivre heureux dans l'ignorance", "vivre lucide mais tourmenté"], en: ["living happy in ignorance", "living clear-eyed but tormented"] },
  { id: "d023", cat: "dilemma", fr: ["rendre tout le monde un peu plus heureux", "rendre une seule personne infiniment heureuse"], en: ["making everyone a little happier", "making one person infinitely happy"] },
  { id: "d024", cat: "dilemma", fr: ["être le dernier humain sur Terre", "ne plus jamais être seul une seule seconde"], en: ["being the last human on Earth", "never being alone for a single second again"] },
  { id: "d025", cat: "dilemma", fr: ["sacrifier ta réputation pour une cause juste", "garder ta réputation en te taisant"], en: ["sacrificing your reputation for a just cause", "keeping your reputation by staying silent"] },
  { id: "d026", cat: "dilemma", fr: ["pardonner l'impardonnable", "oublier complètement ce qui t'a blessé"], en: ["forgiving the unforgivable", "completely forgetting what hurt you"] },
  { id: "d027", cat: "dilemma", fr: ["offrir dix ans de bonheur garanti à ton pire ennemi", "t'en priver toi-même"], en: ["granting ten guaranteed happy years to your worst enemy", "denying them to yourself"] },
  { id: "d028", cat: "dilemma", fr: ["connaître les pensées secrètes de ceux que tu aimes", "rester dans une douce ignorance"], en: ["knowing the secret thoughts of those you love", "staying in blissful ignorance"] },
  { id: "d029", cat: "dilemma", fr: ["sauver le chef-d'œuvre le plus précieux du monde", "sauver un inconnu piégé dans le même incendie"], en: ["saving the world's most precious masterpiece", "saving a stranger trapped in the same fire"] },
  { id: "d030", cat: "dilemma", fr: ["ne plus jamais entendre de musique", "ne plus jamais voir les couleurs"], en: ["never hearing music again", "never seeing colors again"] },
  { id: "d031", cat: "dilemma", fr: ["ne manger que du salé toute ta vie", "ne manger que du sucré toute ta vie"], en: ["only ever eating savory food", "only ever eating sweet food"] },
  { id: "d032", cat: "dilemma", fr: ["ne plus jamais manger de fromage", "ne plus jamais manger de chocolat"], en: ["never eating cheese again", "never eating chocolate again"] },
  { id: "d033", cat: "dilemma", fr: ["le meilleur repas du monde une fois par an", "un repas correct tous les jours"], en: ["the world's best meal once a year", "a decent meal every single day"] },
  { id: "d034", cat: "dilemma", fr: ["manger ton plat préféré à chaque repas jusqu'à l'écœurement", "ne plus jamais y avoir droit"], en: ["eating your favorite dish every meal until sick of it", "never being allowed it again"] },
  { id: "d035", cat: "dilemma", fr: ["ne boire que de l'eau à vie", "ne boire que des sodas sucrés à vie"], en: ["drinking only water for life", "drinking only sugary sodas for life"] },
  { id: "d036", cat: "dilemma", fr: ["des frites illimitées mais toujours froides", "une seule frite parfaite et brûlante par jour"], en: ["unlimited fries but always cold", "one perfect piping-hot fry a day"] },
  { id: "d037", cat: "dilemma", fr: ["goûter tous les plats du monde une fois", "maîtriser trois recettes à la perfection pour toujours"], en: ["tasting every dish in the world once", "mastering three recipes perfectly forever"] },
  { id: "d038", cat: "dilemma", fr: ["ne manger que des aliments verts", "ne manger que des aliments sains que tu n'aimes pas"], en: ["eating only green foods", "eating only healthy foods you dislike"] },
  { id: "d039", cat: "dilemma", fr: ["un dîner gastronomique seul", "un pique-nique tout simple entouré de tes amis"], en: ["a gourmet dinner alone", "a simple picnic surrounded by your friends"] },
  { id: "d040", cat: "dilemma", fr: ["un chef étoilé à domicile mais un seul plat imposé", "cuisiner toi-même tout ce que tu veux"], en: ["a private Michelin chef but one imposed dish", "cooking anything you want yourself"] },
  { id: "d041", cat: "dilemma", fr: ["ne plus jamais manger ton dessert préféré", "devoir en manger à chaque repas"], en: ["never eating your favorite dessert again", "having to eat it at every meal"] },
  { id: "d042", cat: "dilemma", fr: ["avaler un insecte vivant pour mille euros", "rester à jeun quarante-huit heures pour rien"], en: ["swallowing a live insect for a thousand euros", "fasting forty-eight hours for nothing"] },
  { id: "d043", cat: "dilemma", fr: ["goûter le plat le plus délicieux mais ne jamais en reparler", "un plat banal dont tu pourras te vanter"], en: ["tasting the most delicious dish but never speaking of it", "a plain dish you can brag about"] },
  { id: "d044", cat: "dilemma", fr: ["une cuillère du piment le plus fort du monde", "une cuillère de sel pur"], en: ["a spoon of the world's hottest chili", "a spoon of pure salt"] },
  { id: "d045", cat: "dilemma", fr: ["ne manger que des plats sans aucun sel", "ne manger que des plats beaucoup trop salés"], en: ["eating only completely unsalted food", "eating only far too salty food"] },
  { id: "d046", cat: "dilemma", fr: ["un buffet à volonté mais tu dois tout goûter, même l'infâme", "un menu unique mais délicieux"], en: ["an all-you-can-eat buffet but you must taste everything, even the vile", "one set menu but delicious"] },
  { id: "d047", cat: "dilemma", fr: ["le même petit-déjeuner parfait chaque jour", "un petit-déjeuner différent mais parfois raté"], en: ["the same perfect breakfast every day", "a different breakfast but sometimes a flop"] },
  { id: "d048", cat: "dilemma", fr: ["manger n'importe quoi sans conséquence", "ne jamais avoir faim mais ne plus rien goûter"], en: ["eating anything with no consequences", "never being hungry but tasting nothing"] },
  { id: "d049", cat: "dilemma", fr: ["un carré de chocolat à chaque bonne nouvelle", "un grand festin une seule fois l'an"], en: ["a square of chocolate at every piece of good news", "a great feast just once a year"] },
  { id: "d050", cat: "dilemma", fr: ["renoncer au café pour toujours", "renoncer au vin et à tout alcool pour toujours"], en: ["giving up coffee forever", "giving up wine and all alcohol forever"] },
  { id: "d051", cat: "dilemma", fr: ["une glace dehors en plein hiver", "une soupe brûlante en pleine canicule"], en: ["ice cream outdoors in deep winter", "scalding soup in a heatwave"] },
  { id: "d052", cat: "dilemma", fr: ["perdre l'odorat mais garder un goût parfait", "garder l'odorat mais perdre tout le goût"], en: ["losing your smell but keeping perfect taste", "keeping smell but losing all taste"] },
  { id: "d053", cat: "dilemma", fr: ["apprendre que ton plat préféré est mauvais pour toi", "qu'un plat que tu détestes te rendrait heureux"], en: ["learning your favorite dish is bad for you", "that a dish you hate would make you happy"] },
  { id: "d054", cat: "dilemma", fr: ["partager ton dernier carré de chocolat avec un inconnu affamé", "le garder entièrement pour toi"], en: ["sharing your last chocolate square with a hungry stranger", "keeping it entirely for yourself"] },
  { id: "d055", cat: "dilemma", fr: ["des repas gratuits à vie mais toujours seul", "payer tes repas mais toujours accompagné"], en: ["free meals for life but always alone", "paying for meals but always with company"] },
  { id: "d056", cat: "dilemma", fr: ["goûter le mets des dieux une fois puis plus jamais rien d'aussi bon", "ne jamais connaître ce goût"], en: ["tasting the food of the gods once, then nothing ever as good", "never knowing that taste"] },
  { id: "d057", cat: "dilemma", fr: ["manger épicé à en pleurer à chaque repas", "manger fade à s'endormir à chaque repas"], en: ["eating cry-inducing spicy food every meal", "eating sleep-inducing bland food every meal"] },
  { id: "d058", cat: "dilemma", fr: ["offrir le dernier repas parfait à un condamné", "le savourer toi-même"], en: ["giving the perfect last meal to a condemned person", "savoring it yourself"] },
  { id: "d059", cat: "dilemma", fr: ["renoncer à tous les plats de ton enfance", "renoncer à tous les plats que tu n'as pas encore goûtés"], en: ["giving up every dish of your childhood", "giving up every dish you haven't tasted yet"] },
  { id: "d060", cat: "dilemma", fr: ["un gâteau immense mais que tu manges seul", "une petite part partagée avec ceux que tu aimes"], en: ["a huge cake you eat all alone", "a small slice shared with those you love"] },
  { id: "d061", cat: "dilemma", fr: ["connaître la recette secrète de n'importe quel chef", "recréer n'importe quel plat rien qu'en le goûtant"], en: ["knowing any chef's secret recipe", "recreating any dish just by tasting it"] },
  { id: "d062", cat: "dilemma", fr: ["renoncer au petit plaisir sucré de fin de journée", "renoncer au grand repas de fête annuel"], en: ["giving up your little daily sweet treat", "giving up your big annual celebration feast"] },
  // prochain id dilemma libre : d063
];

// Pool filtré par catégories sélectionnées (toutes si vide/nul). Utilisé
// par le composant pour le tirage aléatoire d'une manche.
export function getQuestionPool(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return QUESTIONS.slice();
  const set = new Set(categoryIds);
  return QUESTIONS.filter(q => set.has(q.cat));
}

// Recherche d'une question par id (pour restaurer une manche après un
// rechargement de page — seul l'id transite/persiste, pas tout l'objet).
export function questionById(id) {
  return QUESTIONS.find(q => q.id === id) || null;
}
