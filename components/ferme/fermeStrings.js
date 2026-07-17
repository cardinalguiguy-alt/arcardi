/* ==========================================================================
   FERME VALLÉE (jeu 22) — libellés bilingues INTERNES au jeu.
   ==========================================================================
   Le jeu est très riche en texte (boutique, bac, aides, toasts). Pour ne pas
   gonfler lib/i18n.js (STR) de plusieurs dizaines de clés et risquer une
   asymétrie FR/EN, ces libellés propres au jeu vivent ici, en un dictionnaire
   { fr, en } auto-porté. Seuls le NOM et le TAG de la carte (nameFerme /
   tagFerme) sont dans lib/i18n.js, car page.js en a besoin hors du composant.

   Règle site : AUCUN tiret quadratin dans le texte FR joueur.
   `fstr(lang)` renvoie le bon jeu de libellés ; les fonctions acceptent des
   paramètres (niveau d'outil, gain, etc.).
   ========================================================================== */

export const FERME_STR = {
  fr: {
    // Sélection de personnage
    csTitle: "🌾 Ferme Vallée",
    csSub: "Ferme coopérative : cultive, coupe, mine et vends avec ton équipe.",
    namePlaceholder: "Ton prénom de fermier·e",
    fermier: "Fermier",
    fermiere: "Fermière",
    joinBtn: "Rejoindre la ferme !",
    connecting: "Connexion à la ferme…",
    waitWorld: "En attente de l'hôte pour ouvrir la ferme…",
    // HUD
    goldCommon: "or (caisse commune)",
    day: "Jour",
    playersOnline: (n) => `${n} joueur(s) en ligne`,
    // Barre d'outils
    seedsLabel: "Graines",
    foodLabel: "Casse-croûte",
    seedTip: (name) => `${name} (appuie encore sur 5 pour changer de graine)`,
    foodTip: (e) => `Manger (+${e} énergie)`,
    // Invites de proximité
    promptShop: "[E] Boutique",
    promptBin: "[E] Vendre",
    // Boutique
    shopTitle: "🛒 Boutique de Pierre",
    shopHint: "Les achats sont payés avec la caisse commune de l'équipe.",
    seedRowSub: (cr) => `Pousse en ${cr.growDays} j (arrosée) · se vend ${cr.sell} or · en stock : `,
    seedCostLabel: (cr) => `${cr.seedName} : ${cr.seedCost} or`,
    foodRowTitle: (cost) => `Casse-croûte : ${cost} or`,
    foodRowSub: (e, stock) => `Rend ${e} énergie · en stock : ${stock}`,
    toolsHeader: "⚒ Améliorations d'outils (moins d'énergie, plus efficaces)",
    toolRowTitle: (name, lvl) => `${name} : niveau ${lvl}`,
    toolMaxSub: "Niveau maximum atteint !",
    toolUpSub: (lvl, cost) => `Passer au niveau ${lvl} : ${cost} or`,
    buy1: "×1", buy5: "×5", buyOne: "Acheter",
    upgrade: "Améliorer", maxLabel: "MAX",
    // Bac de vente
    binTitle: "💰 Bac de vente",
    binHint: "L'or gagné va dans la caisse commune de l'équipe.",
    cropRowTitle: (name, n) => `${name} × ${n}`,
    cropRowSub: (cr, n) => `${cr.sell} or pièce · total ${n * cr.sell} or`,
    woodRowTitle: (n) => `Bois × ${n}`,
    stoneRowTitle: (n) => `Pierre × ${n}`,
    perPiece: (v) => `${v} or pièce`,
    sellAll: "Tout vendre",
    // Carte plein écran
    mapTitle: "🗺️ Carte de la vallée",
    mapClose: "Clique n'importe où ou appuie sur Échap ou M pour fermer",
    mapYou: "toi",
    // Boutons flottants
    btnHome: "🏠 Maison",
    btnMap: "🗺️ Carte",
    btnChat: "💬 Chat",
    btnLeave: "Quitter",
    homeToast: "🏠 Retour devant la maison !",
    // Aide
    help1: "ZQSD/WASD/Flèches : bouger (8 directions) · Espace/Clic : utiliser l'outil",
    help2: "1-6 : outils · E : boutique/vente · T : chat · M : carte · 🏠 : maison",
    // Toasts
    toastTired: "Trop de fatigue ! Mange un casse-croûte ou attends demain.",
    toastFarShop: "Approche-toi de la boutique !",
    toastFarBin: "Approche-toi du bac de vente !",
    toastNoGold: "Pas assez d'or !",
    toastToolMax: "Outil au niveau maximum !",
    toastNewDay: (day) => `☀ Jour ${day} ! Énergie restaurée, les cultures arrosées ont poussé.`,
    // Chat système
    chatWelcome: "Bienvenue sur la ferme ! Appuie sur T pour discuter avec ton équipe.",
    chatToolUp: (name, lvl) => `${name} au niveau ${lvl} !`,
    chatSell: (gain, total) => `Vente : +${gain} or ! Caisse commune : ${total} or`,
    chatNewDay: (day) => `Jour ${day}, bonne journée à la ferme !`,
    chatJoin: (name) => `${name} rejoint la ferme.`,
    chatLeave: (name) => `${name} a quitté la ferme.`,
    // Effets flottants
    fxWood: (n) => `+${n} bois`,
    fxStone: (n) => `+${n} pierre`,
    fxHarvest: (name) => `+1 ${name.toLowerCase()}`,
    fxGold: (n) => `+${n} or`,
    fxEat: "Miam !",
    chatSend: "Message… (Entrée pour envoyer)",
  },
  en: {
    csTitle: "🌾 Valley Farm",
    csSub: "Co-op farm: grow, chop, mine and sell with your team.",
    namePlaceholder: "Your farmer name",
    fermier: "Farmer (M)",
    fermiere: "Farmer (F)",
    joinBtn: "Join the farm!",
    connecting: "Connecting to the farm…",
    waitWorld: "Waiting for the host to open the farm…",
    goldCommon: "gold (shared pot)",
    day: "Day",
    playersOnline: (n) => `${n} player(s) online`,
    seedsLabel: "Seeds",
    foodLabel: "Snack",
    seedTip: (name) => `${name} (press 5 again to switch seed)`,
    foodTip: (e) => `Eat (+${e} energy)`,
    promptShop: "[E] Shop",
    promptBin: "[E] Sell",
    shopTitle: "🛒 Pierre's Shop",
    shopHint: "Purchases are paid from the team's shared pot.",
    seedRowSub: (cr) => `Grows in ${cr.growDays} d (watered) · sells for ${cr.sell} gold · in stock: `,
    seedCostLabel: (cr) => `${cr.seedNameEn} : ${cr.seedCost} gold`,
    foodRowTitle: (cost) => `Snack: ${cost} gold`,
    foodRowSub: (e, stock) => `Restores ${e} energy · in stock: ${stock}`,
    toolsHeader: "⚒ Tool upgrades (less energy, more efficient)",
    toolRowTitle: (name, lvl) => `${name}: level ${lvl}`,
    toolMaxSub: "Maximum level reached!",
    toolUpSub: (lvl, cost) => `Upgrade to level ${lvl}: ${cost} gold`,
    buy1: "×1", buy5: "×5", buyOne: "Buy",
    upgrade: "Upgrade", maxLabel: "MAX",
    binTitle: "💰 Sell bin",
    binHint: "Gold earned goes into the team's shared pot.",
    cropRowTitle: (name, n) => `${name} × ${n}`,
    cropRowSub: (cr, n) => `${cr.sell} gold each · total ${n * cr.sell} gold`,
    woodRowTitle: (n) => `Wood × ${n}`,
    stoneRowTitle: (n) => `Stone × ${n}`,
    perPiece: (v) => `${v} gold each`,
    sellAll: "Sell all",
    mapTitle: "🗺️ Valley map",
    mapClose: "Click anywhere or press Esc or M to close",
    mapYou: "you",
    btnHome: "🏠 House",
    btnMap: "🗺️ Map",
    btnChat: "💬 Chat",
    btnLeave: "Leave",
    homeToast: "🏠 Back to the house!",
    help1: "WASD/Arrows: move (8 directions) · Space/Click: use tool",
    help2: "1-6: tools · E: shop/sell · T: chat · M: map · 🏠: house",
    toastTired: "Too tired! Eat a snack or wait for tomorrow.",
    toastFarShop: "Get closer to the shop!",
    toastFarBin: "Get closer to the sell bin!",
    toastNoGold: "Not enough gold!",
    toastToolMax: "Tool already at max level!",
    toastNewDay: (day) => `☀ Day ${day}! Energy restored, watered crops have grown.`,
    chatWelcome: "Welcome to the farm! Press T to chat with your team.",
    chatToolUp: (name, lvl) => `${name} upgraded to level ${lvl}!`,
    chatSell: (gain, total) => `Sale: +${gain} gold! Shared pot: ${total} gold`,
    chatNewDay: (day) => `Day ${day}, have a great day on the farm!`,
    chatJoin: (name) => `${name} joined the farm.`,
    chatLeave: (name) => `${name} left the farm.`,
    fxWood: (n) => `+${n} wood`,
    fxStone: (n) => `+${n} stone`,
    fxHarvest: (name) => `+1 ${name.toLowerCase()}`,
    fxGold: (n) => `+${n} gold`,
    fxEat: "Yum!",
    chatSend: "Message… (Enter to send)",
  },
};

export function fstr(lang) {
  return FERME_STR[lang === "en" ? "en" : "fr"];
}
