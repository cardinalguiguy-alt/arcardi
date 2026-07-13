"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import FlagIcon from "./FlagIcon";

const MAX_TRIES = 10;
const ROUND_MS = 180000; // 3 min

// Confettis de victoire (demande 2026-07) : palette VERT/BLEU du thème
// Worldle — mêmes pièces réutilisables que Puissance 4 (.confetti-piece).
const CONFETTI_COLORS = ["#4CC38A", "#6FA8FF", "#8FE0A8", "#4C8DFF", "#ffffff"];

const CONT = {
  EU: { fr: "Europe", en: "Europe" },
  NA: { fr: "Amérique du Nord", en: "North America" },
  SA: { fr: "Amérique du Sud", en: "South America" },
  AS: { fr: "Asie", en: "Asia" },
  AF: { fr: "Afrique", en: "Africa" },
  OC: { fr: "Océanie", en: "Oceania" }
};

// lat/lng approximatifs de la capitale — suffisant pour un jeu entre amis.
// Liste : les 193 États membres de l'ONU + 4 ajouts hors ONU (les 2 États
// observateurs — Vatican et Palestine — et 2 États partiellement reconnus
// très connus — Kosovo et Taïwan). N'importe lequel peut être la cible ET
// n'importe lequel doit pouvoir être proposé en réponse. Les noms anglais
// sont les formes courtes officielles (Côte d'Ivoire, Türkiye…) avec des
// alias de recherche (`alt`) pour les noms d'usage (Ivory Coast, Turkey…).
const COUNTRIES = [
  // --- Afrique (54) ---
  { id: "dz", fr: "Algérie", en: "Algeria", lat: 36.7538, lng: 3.0588, c: "AF" },
  { id: "ao", fr: "Angola", en: "Angola", lat: -8.8390, lng: 13.2894, c: "AF" },
  { id: "bj", fr: "Bénin", en: "Benin", lat: 6.4969, lng: 2.6289, c: "AF" },
  { id: "bw", fr: "Botswana", en: "Botswana", lat: -24.6282, lng: 25.9231, c: "AF" },
  { id: "bf", fr: "Burkina Faso", en: "Burkina Faso", lat: 12.3714, lng: -1.5197, c: "AF" },
  { id: "bi", fr: "Burundi", en: "Burundi", lat: -3.4264, lng: 29.9306, c: "AF" },
  { id: "cv", fr: "Cap-Vert", en: "Cabo Verde", alt: ["Cape Verde"], lat: 14.9330, lng: -23.5133, c: "AF" },
  { id: "cm", fr: "Cameroun", en: "Cameroon", lat: 3.8480, lng: 11.5021, c: "AF" },
  { id: "cf", fr: "République centrafricaine", en: "Central African Republic", lat: 4.3947, lng: 18.5582, c: "AF" },
  { id: "td", fr: "Tchad", en: "Chad", lat: 12.1348, lng: 15.0557, c: "AF" },
  { id: "km", fr: "Comores", en: "Comoros", lat: -11.7042, lng: 43.2402, c: "AF" },
  { id: "cg", fr: "Congo", en: "Republic of the Congo", alt: ["Congo-Brazzaville"], lat: -4.2634, lng: 15.2429, c: "AF" },
  { id: "cd", fr: "République démocratique du Congo", en: "Democratic Republic of the Congo", alt: ["DR Congo", "DRC", "Congo-Kinshasa"], lat: -4.4419, lng: 15.2663, c: "AF" },
  { id: "dj", fr: "Djibouti", en: "Djibouti", lat: 11.5721, lng: 43.1456, c: "AF" },
  { id: "eg", fr: "Égypte", en: "Egypt", lat: 30.0444, lng: 31.2357, c: "AF" },
  { id: "gq", fr: "Guinée équatoriale", en: "Equatorial Guinea", lat: 3.7504, lng: 8.7371, c: "AF" },
  { id: "er", fr: "Érythrée", en: "Eritrea", lat: 15.3229, lng: 38.9251, c: "AF" },
  { id: "sz", fr: "Eswatini", en: "Eswatini", alt: ["Swaziland"], lat: -26.3054, lng: 31.1367, c: "AF" },
  { id: "et", fr: "Éthiopie", en: "Ethiopia", lat: 9.0300, lng: 38.7400, c: "AF" },
  { id: "ga", fr: "Gabon", en: "Gabon", lat: 0.4162, lng: 9.4673, c: "AF" },
  { id: "gm", fr: "Gambie", en: "Gambia", lat: 13.4549, lng: -16.5790, c: "AF" },
  { id: "gh", fr: "Ghana", en: "Ghana", lat: 5.6037, lng: -0.1870, c: "AF" },
  { id: "gn", fr: "Guinée", en: "Guinea", lat: 9.6412, lng: -13.5784, c: "AF" },
  { id: "gw", fr: "Guinée-Bissau", en: "Guinea-Bissau", lat: 11.8636, lng: -15.5977, c: "AF" },
  { id: "ci", fr: "Côte d'Ivoire", en: "Côte d'Ivoire", alt: ["Ivory Coast"], lat: 6.8276, lng: -5.2893, c: "AF" },
  { id: "ke", fr: "Kenya", en: "Kenya", lat: -1.2921, lng: 36.8219, c: "AF" },
  { id: "ls", fr: "Lesotho", en: "Lesotho", lat: -29.3151, lng: 27.4869, c: "AF" },
  { id: "lr", fr: "Liberia", en: "Liberia", lat: 6.2907, lng: -10.7605, c: "AF" },
  { id: "ly", fr: "Libye", en: "Libya", lat: 32.8872, lng: 13.1913, c: "AF" },
  { id: "mg", fr: "Madagascar", en: "Madagascar", lat: -18.8792, lng: 47.5079, c: "AF" },
  { id: "mw", fr: "Malawi", en: "Malawi", lat: -13.9626, lng: 33.7741, c: "AF" },
  { id: "ml", fr: "Mali", en: "Mali", lat: 12.6392, lng: -8.0029, c: "AF" },
  { id: "mr", fr: "Mauritanie", en: "Mauritania", lat: 18.0735, lng: -15.9582, c: "AF" },
  { id: "mu", fr: "Maurice", en: "Mauritius", lat: -20.1609, lng: 57.5012, c: "AF" },
  { id: "ma", fr: "Maroc", en: "Morocco", lat: 34.0209, lng: -6.8417, c: "AF" },
  { id: "mz", fr: "Mozambique", en: "Mozambique", lat: -25.9692, lng: 32.5732, c: "AF" },
  { id: "na", fr: "Namibie", en: "Namibia", lat: -22.5609, lng: 17.0658, c: "AF" },
  { id: "ne", fr: "Niger", en: "Niger", lat: 13.5117, lng: 2.1251, c: "AF" },
  { id: "ng", fr: "Nigéria", en: "Nigeria", lat: 9.0765, lng: 7.3986, c: "AF" },
  { id: "rw", fr: "Rwanda", en: "Rwanda", lat: -1.9403, lng: 30.0596, c: "AF" },
  { id: "st", fr: "Sao Tomé-et-Principe", en: "Sao Tome and Principe", lat: 0.3365, lng: 6.7273, c: "AF" },
  { id: "sn", fr: "Sénégal", en: "Senegal", lat: 14.7167, lng: -17.4677, c: "AF" },
  { id: "sc", fr: "Seychelles", en: "Seychelles", lat: -4.6191, lng: 55.4513, c: "AF" },
  { id: "sl", fr: "Sierra Leone", en: "Sierra Leone", lat: 8.4657, lng: -13.2317, c: "AF" },
  { id: "so", fr: "Somalie", en: "Somalia", lat: 2.0469, lng: 45.3182, c: "AF" },
  { id: "za", fr: "Afrique du Sud", en: "South Africa", lat: -25.7479, lng: 28.2293, c: "AF" },
  { id: "ss", fr: "Soudan du Sud", en: "South Sudan", lat: 4.8594, lng: 31.5713, c: "AF" },
  { id: "sd", fr: "Soudan", en: "Sudan", lat: 15.5007, lng: 32.5599, c: "AF" },
  { id: "tz", fr: "Tanzanie", en: "Tanzania", lat: -6.1630, lng: 35.7516, c: "AF" },
  { id: "tg", fr: "Togo", en: "Togo", lat: 6.1725, lng: 1.2314, c: "AF" },
  { id: "tn", fr: "Tunisie", en: "Tunisia", lat: 36.8065, lng: 10.1815, c: "AF" },
  { id: "ug", fr: "Ouganda", en: "Uganda", lat: 0.3476, lng: 32.5825, c: "AF" },
  { id: "zm", fr: "Zambie", en: "Zambia", lat: -15.3875, lng: 28.3228, c: "AF" },
  { id: "zw", fr: "Zimbabwe", en: "Zimbabwe", lat: -17.8252, lng: 31.0335, c: "AF" },

  // --- Asie, Moyen-Orient inclus (47) ---
  { id: "af", fr: "Afghanistan", en: "Afghanistan", lat: 34.5553, lng: 69.2075, c: "AS" },
  { id: "am", fr: "Arménie", en: "Armenia", lat: 40.1792, lng: 44.4991, c: "AS" },
  { id: "az", fr: "Azerbaïdjan", en: "Azerbaijan", lat: 40.4093, lng: 49.8671, c: "AS" },
  { id: "bh", fr: "Bahreïn", en: "Bahrain", lat: 26.2285, lng: 50.5860, c: "AS" },
  { id: "bd", fr: "Bangladesh", en: "Bangladesh", lat: 23.8103, lng: 90.4125, c: "AS" },
  { id: "bt", fr: "Bhoutan", en: "Bhutan", lat: 27.4728, lng: 89.6390, c: "AS" },
  { id: "bn", fr: "Brunei", en: "Brunei", lat: 4.9031, lng: 114.9398, c: "AS" },
  { id: "kh", fr: "Cambodge", en: "Cambodia", lat: 11.5564, lng: 104.9282, c: "AS" },
  { id: "cn", fr: "Chine", en: "China", lat: 39.9042, lng: 116.4074, c: "AS" },
  { id: "cy", fr: "Chypre", en: "Cyprus", lat: 35.1856, lng: 33.3823, c: "AS" },
  { id: "ge", fr: "Géorgie", en: "Georgia", lat: 41.7151, lng: 44.8271, c: "AS" },
  { id: "in", fr: "Inde", en: "India", lat: 28.6139, lng: 77.2090, c: "AS" },
  { id: "id", fr: "Indonésie", en: "Indonesia", lat: -6.2088, lng: 106.8456, c: "AS" },
  { id: "ir", fr: "Iran", en: "Iran", lat: 35.6892, lng: 51.3890, c: "AS" },
  { id: "iq", fr: "Irak", en: "Iraq", lat: 33.3152, lng: 44.3661, c: "AS" },
  { id: "il", fr: "Israël", en: "Israel", lat: 31.7683, lng: 35.2137, c: "AS" },
  { id: "jp", fr: "Japon", en: "Japan", lat: 35.6762, lng: 139.6503, c: "AS" },
  { id: "jo", fr: "Jordanie", en: "Jordan", lat: 31.9454, lng: 35.9284, c: "AS" },
  { id: "kz", fr: "Kazakhstan", en: "Kazakhstan", lat: 51.1605, lng: 71.4704, c: "AS" },
  { id: "kw", fr: "Koweït", en: "Kuwait", lat: 29.3759, lng: 47.9774, c: "AS" },
  { id: "kg", fr: "Kirghizistan", en: "Kyrgyzstan", lat: 42.8746, lng: 74.5698, c: "AS" },
  { id: "la", fr: "Laos", en: "Laos", lat: 17.9757, lng: 102.6331, c: "AS" },
  { id: "lb", fr: "Liban", en: "Lebanon", lat: 33.8938, lng: 35.5018, c: "AS" },
  { id: "my", fr: "Malaisie", en: "Malaysia", lat: 3.1390, lng: 101.6869, c: "AS" },
  { id: "mv", fr: "Maldives", en: "Maldives", lat: 4.1755, lng: 73.5093, c: "AS" },
  { id: "mn", fr: "Mongolie", en: "Mongolia", lat: 47.8864, lng: 106.9057, c: "AS" },
  { id: "mm", fr: "Myanmar", en: "Myanmar", alt: ["Burma", "Birmanie"], lat: 19.7633, lng: 96.0785, c: "AS" },
  { id: "np", fr: "Népal", en: "Nepal", lat: 27.7172, lng: 85.3240, c: "AS" },
  { id: "kp", fr: "Corée du Nord", en: "North Korea", lat: 39.0392, lng: 125.7625, c: "AS" },
  { id: "om", fr: "Oman", en: "Oman", lat: 23.5880, lng: 58.3829, c: "AS" },
  { id: "pk", fr: "Pakistan", en: "Pakistan", lat: 33.6844, lng: 73.0479, c: "AS" },
  { id: "ph", fr: "Philippines", en: "Philippines", lat: 14.5995, lng: 120.9842, c: "AS" },
  { id: "qa", fr: "Qatar", en: "Qatar", lat: 25.2854, lng: 51.5310, c: "AS" },
  { id: "sa", fr: "Arabie saoudite", en: "Saudi Arabia", lat: 24.7136, lng: 46.6753, c: "AS" },
  { id: "sg", fr: "Singapour", en: "Singapore", lat: 1.3521, lng: 103.8198, c: "AS" },
  { id: "kr", fr: "Corée du Sud", en: "South Korea", lat: 37.5665, lng: 126.9780, c: "AS" },
  { id: "lk", fr: "Sri Lanka", en: "Sri Lanka", lat: 6.9271, lng: 79.8612, c: "AS" },
  { id: "sy", fr: "Syrie", en: "Syria", lat: 33.5138, lng: 36.2765, c: "AS" },
  { id: "tj", fr: "Tadjikistan", en: "Tajikistan", lat: 38.5598, lng: 68.7870, c: "AS" },
  { id: "th", fr: "Thaïlande", en: "Thailand", lat: 13.7563, lng: 100.5018, c: "AS" },
  { id: "tl", fr: "Timor oriental", en: "Timor-Leste", alt: ["East Timor", "Timor oriental"], lat: -8.5569, lng: 125.5603, c: "AS" },
  { id: "tr", fr: "Turquie", en: "Türkiye", alt: ["Turkey"], lat: 39.9334, lng: 32.8597, c: "AS" },
  { id: "tm", fr: "Turkménistan", en: "Turkmenistan", lat: 37.9601, lng: 58.3261, c: "AS" },
  { id: "ae", fr: "Émirats arabes unis", en: "United Arab Emirates", alt: ["UAE"], lat: 24.4539, lng: 54.3773, c: "AS" },
  { id: "uz", fr: "Ouzbékistan", en: "Uzbekistan", lat: 41.2995, lng: 69.2401, c: "AS" },
  { id: "vn", fr: "Vietnam", en: "Vietnam", lat: 21.0285, lng: 105.8542, c: "AS" },
  { id: "ye", fr: "Yémen", en: "Yemen", lat: 15.3694, lng: 44.1910, c: "AS" },

  // --- Océanie (14) ---
  { id: "au", fr: "Australie", en: "Australia", lat: -35.2809, lng: 149.1300, c: "OC" },
  { id: "fj", fr: "Fidji", en: "Fiji", lat: -18.1416, lng: 178.4419, c: "OC" },
  { id: "ki", fr: "Kiribati", en: "Kiribati", lat: 1.3291, lng: 172.9790, c: "OC" },
  { id: "mh", fr: "Îles Marshall", en: "Marshall Islands", lat: 7.1164, lng: 171.1858, c: "OC" },
  { id: "fm", fr: "Micronésie", en: "Micronesia", lat: 6.9147, lng: 158.1610, c: "OC" },
  { id: "nr", fr: "Nauru", en: "Nauru", lat: -0.5477, lng: 166.9209, c: "OC" },
  { id: "nz", fr: "Nouvelle-Zélande", en: "New Zealand", lat: -41.2865, lng: 174.7762, c: "OC" },
  { id: "pw", fr: "Palaos", en: "Palau", lat: 7.5006, lng: 134.6242, c: "OC" },
  { id: "pg", fr: "Papouasie-Nouvelle-Guinée", en: "Papua New Guinea", lat: -9.4438, lng: 147.1803, c: "OC" },
  { id: "ws", fr: "Samoa", en: "Samoa", lat: -13.8506, lng: -171.7513, c: "OC" },
  { id: "sb", fr: "Îles Salomon", en: "Solomon Islands", lat: -9.4280, lng: 159.9498, c: "OC" },
  { id: "to", fr: "Tonga", en: "Tonga", lat: -21.1789, lng: -175.1982, c: "OC" },
  { id: "tv", fr: "Tuvalu", en: "Tuvalu", lat: -8.5211, lng: 179.1962, c: "OC" },
  { id: "vu", fr: "Vanuatu", en: "Vanuatu", lat: -17.7334, lng: 168.3273, c: "OC" },

  // --- Europe (43) ---
  { id: "al", fr: "Albanie", en: "Albania", lat: 41.3275, lng: 19.8187, c: "EU" },
  { id: "ad", fr: "Andorre", en: "Andorra", lat: 42.5063, lng: 1.5218, c: "EU" },
  { id: "at", fr: "Autriche", en: "Austria", lat: 48.2082, lng: 16.3738, c: "EU" },
  { id: "by", fr: "Biélorussie", en: "Belarus", lat: 53.9006, lng: 27.5590, c: "EU" },
  { id: "be", fr: "Belgique", en: "Belgium", lat: 50.8503, lng: 4.3517, c: "EU" },
  { id: "ba", fr: "Bosnie-Herzégovine", en: "Bosnia and Herzegovina", lat: 43.8563, lng: 18.4131, c: "EU" },
  { id: "bg", fr: "Bulgarie", en: "Bulgaria", lat: 42.6977, lng: 23.3219, c: "EU" },
  { id: "hr", fr: "Croatie", en: "Croatia", lat: 45.8150, lng: 15.9819, c: "EU" },
  { id: "cz", fr: "Tchéquie", en: "Czechia", alt: ["Czech Republic"], lat: 50.0755, lng: 14.4378, c: "EU" },
  { id: "dk", fr: "Danemark", en: "Denmark", lat: 55.6761, lng: 12.5683, c: "EU" },
  { id: "ee", fr: "Estonie", en: "Estonia", lat: 59.4370, lng: 24.7536, c: "EU" },
  { id: "fi", fr: "Finlande", en: "Finland", lat: 60.1699, lng: 24.9384, c: "EU" },
  { id: "fr", fr: "France", en: "France", lat: 48.8566, lng: 2.3522, c: "EU" },
  { id: "de", fr: "Allemagne", en: "Germany", lat: 52.5200, lng: 13.4050, c: "EU" },
  { id: "gr", fr: "Grèce", en: "Greece", lat: 37.9838, lng: 23.7275, c: "EU" },
  { id: "hu", fr: "Hongrie", en: "Hungary", lat: 47.4979, lng: 19.0402, c: "EU" },
  { id: "is", fr: "Islande", en: "Iceland", lat: 64.1466, lng: -21.9426, c: "EU" },
  { id: "ie", fr: "Irlande", en: "Ireland", lat: 53.3498, lng: -6.2603, c: "EU" },
  { id: "it", fr: "Italie", en: "Italy", lat: 41.9028, lng: 12.4964, c: "EU" },
  { id: "lv", fr: "Lettonie", en: "Latvia", lat: 56.9496, lng: 24.1052, c: "EU" },
  { id: "li", fr: "Liechtenstein", en: "Liechtenstein", lat: 47.1410, lng: 9.5209, c: "EU" },
  { id: "lt", fr: "Lituanie", en: "Lithuania", lat: 54.6872, lng: 25.2797, c: "EU" },
  { id: "lu", fr: "Luxembourg", en: "Luxembourg", lat: 49.6116, lng: 6.1319, c: "EU" },
  { id: "mt", fr: "Malte", en: "Malta", lat: 35.8989, lng: 14.5146, c: "EU" },
  { id: "md", fr: "Moldavie", en: "Moldova", lat: 47.0105, lng: 28.8638, c: "EU" },
  { id: "mc", fr: "Monaco", en: "Monaco", lat: 43.7384, lng: 7.4246, c: "EU" },
  { id: "me", fr: "Monténégro", en: "Montenegro", lat: 42.4304, lng: 19.2594, c: "EU" },
  { id: "nl", fr: "Pays-Bas", en: "Netherlands", alt: ["Holland", "Hollande"], lat: 52.3676, lng: 4.9041, c: "EU" },
  { id: "mk", fr: "Macédoine du Nord", en: "North Macedonia", alt: ["Macedonia"], lat: 41.9981, lng: 21.4254, c: "EU" },
  { id: "no", fr: "Norvège", en: "Norway", lat: 59.9139, lng: 10.7522, c: "EU" },
  { id: "pl", fr: "Pologne", en: "Poland", lat: 52.2297, lng: 21.0122, c: "EU" },
  { id: "pt", fr: "Portugal", en: "Portugal", lat: 38.7223, lng: -9.1393, c: "EU" },
  { id: "ro", fr: "Roumanie", en: "Romania", lat: 44.4268, lng: 26.1025, c: "EU" },
  { id: "ru", fr: "Russie", en: "Russia", lat: 55.7558, lng: 37.6173, c: "EU" },
  { id: "sm", fr: "Saint-Marin", en: "San Marino", lat: 43.9424, lng: 12.4578, c: "EU" },
  { id: "rs", fr: "Serbie", en: "Serbia", lat: 44.7866, lng: 20.4489, c: "EU" },
  { id: "sk", fr: "Slovaquie", en: "Slovakia", lat: 48.1486, lng: 17.1077, c: "EU" },
  { id: "si", fr: "Slovénie", en: "Slovenia", lat: 46.0569, lng: 14.5058, c: "EU" },
  { id: "es", fr: "Espagne", en: "Spain", lat: 40.4168, lng: -3.7038, c: "EU" },
  { id: "se", fr: "Suède", en: "Sweden", lat: 59.3293, lng: 18.0686, c: "EU" },
  { id: "ch", fr: "Suisse", en: "Switzerland", lat: 46.9480, lng: 7.4474, c: "EU" },
  { id: "ua", fr: "Ukraine", en: "Ukraine", lat: 50.4501, lng: 30.5234, c: "EU" },
  { id: "gb", fr: "Royaume-Uni", en: "United Kingdom", alt: ["UK", "Great Britain"], lat: 51.5074, lng: -0.1278, c: "EU" },

  // --- Amérique du Nord, Amérique centrale et Caraïbes (23) ---
  { id: "ag", fr: "Antigua-et-Barbuda", en: "Antigua and Barbuda", lat: 17.1274, lng: -61.8468, c: "NA" },
  { id: "bs", fr: "Bahamas", en: "Bahamas", lat: 25.0343, lng: -77.3963, c: "NA" },
  { id: "bb", fr: "Barbade", en: "Barbados", lat: 13.1132, lng: -59.5988, c: "NA" },
  { id: "bz", fr: "Belize", en: "Belize", lat: 17.2510, lng: -88.7590, c: "NA" },
  { id: "ca", fr: "Canada", en: "Canada", lat: 45.4215, lng: -75.6972, c: "NA" },
  { id: "cr", fr: "Costa Rica", en: "Costa Rica", lat: 9.9281, lng: -84.0907, c: "NA" },
  { id: "cu", fr: "Cuba", en: "Cuba", lat: 23.1136, lng: -82.3666, c: "NA" },
  { id: "dm", fr: "Dominique", en: "Dominica", lat: 15.3092, lng: -61.3790, c: "NA" },
  { id: "do", fr: "République dominicaine", en: "Dominican Republic", lat: 18.4861, lng: -69.9312, c: "NA" },
  { id: "sv", fr: "Salvador", en: "El Salvador", lat: 13.6929, lng: -89.2182, c: "NA" },
  { id: "gd", fr: "Grenade", en: "Grenada", lat: 12.0561, lng: -61.7488, c: "NA" },
  { id: "gt", fr: "Guatemala", en: "Guatemala", lat: 14.6349, lng: -90.5069, c: "NA" },
  { id: "ht", fr: "Haïti", en: "Haiti", lat: 18.5944, lng: -72.3074, c: "NA" },
  { id: "hn", fr: "Honduras", en: "Honduras", lat: 14.0723, lng: -87.1921, c: "NA" },
  { id: "jm", fr: "Jamaïque", en: "Jamaica", lat: 17.9712, lng: -76.7936, c: "NA" },
  { id: "mx", fr: "Mexique", en: "Mexico", lat: 19.4326, lng: -99.1332, c: "NA" },
  { id: "ni", fr: "Nicaragua", en: "Nicaragua", lat: 12.1364, lng: -86.2514, c: "NA" },
  { id: "pa", fr: "Panama", en: "Panama", lat: 8.9824, lng: -79.5199, c: "NA" },
  { id: "kn", fr: "Saint-Christophe-et-Niévès", en: "Saint Kitts and Nevis", lat: 17.3026, lng: -62.7177, c: "NA" },
  { id: "lc", fr: "Sainte-Lucie", en: "Saint Lucia", lat: 14.0101, lng: -60.9875, c: "NA" },
  { id: "vc", fr: "Saint-Vincent-et-les-Grenadines", en: "Saint Vincent and the Grenadines", lat: 13.1600, lng: -61.2248, c: "NA" },
  { id: "tt", fr: "Trinité-et-Tobago", en: "Trinidad and Tobago", lat: 10.6596, lng: -61.5019, c: "NA" },
  { id: "us", fr: "États-Unis", en: "United States", alt: ["USA", "United States of America", "America"], lat: 38.9072, lng: -77.0369, c: "NA" },

  // --- Amérique du Sud (12) ---
  { id: "ar", fr: "Argentine", en: "Argentina", lat: -34.6037, lng: -58.3816, c: "SA" },
  { id: "bo", fr: "Bolivie", en: "Bolivia", lat: -16.5000, lng: -68.1500, c: "SA" },
  { id: "br", fr: "Brésil", en: "Brazil", lat: -15.8267, lng: -47.9218, c: "SA" },
  { id: "cl", fr: "Chili", en: "Chile", lat: -33.4489, lng: -70.6693, c: "SA" },
  { id: "co", fr: "Colombie", en: "Colombia", lat: 4.7110, lng: -74.0721, c: "SA" },
  { id: "ec", fr: "Équateur", en: "Ecuador", lat: -0.1807, lng: -78.4678, c: "SA" },
  { id: "gy", fr: "Guyana", en: "Guyana", lat: 6.8013, lng: -58.1551, c: "SA" },
  { id: "py", fr: "Paraguay", en: "Paraguay", lat: -25.2637, lng: -57.5759, c: "SA" },
  { id: "pe", fr: "Pérou", en: "Peru", lat: -12.0464, lng: -77.0428, c: "SA" },
  { id: "sr", fr: "Suriname", en: "Suriname", lat: 5.8520, lng: -55.2038, c: "SA" },
  { id: "uy", fr: "Uruguay", en: "Uruguay", lat: -34.9011, lng: -56.1645, c: "SA" },
  { id: "ve", fr: "Venezuela", en: "Venezuela", lat: 10.4806, lng: -66.9036, c: "SA" },
  // --- Hors ONU : observateurs + partiellement reconnus (4) ---
  { id: "va", fr: "Vatican", en: "Vatican City", alt: ["Holy See", "Saint-Siège"], lat: 41.9029, lng: 12.4534, c: "EU" },
  { id: "ps", fr: "Palestine", en: "Palestine", alt: ["State of Palestine"], lat: 31.9038, lng: 35.2034, c: "AS" },
  { id: "xk", fr: "Kosovo", en: "Kosovo", lat: 42.6629, lng: 21.1655, c: "EU" },
  { id: "tw", fr: "Taïwan", en: "Taiwan", alt: ["Chinese Taipei", "Formosa"], lat: 25.0330, lng: 121.5654, c: "AS" },
];

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function distanceKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function bearing(a, b) {
  const toRad = d => d * Math.PI / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const ARROWS = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
function arrowFor(deg) { return ARROWS[Math.round(deg / 45) % 8]; }
function proximityPct(km) { return Math.max(0, Math.round(100 - (km / 20015) * 100)); }

// Seuils de compacité de la liste des tentatives (2026-07, demande
// explicite) : plus il y a d'essais, plus chaque ligne se réduit — jamais
// de scroll vertical même à 10/10 essais (MAX_TRIES). Trois paliers :
// normal (<5), compact (5-7, l'indice continent disparaît), tiny (8-10,
// barre de progression retirée aussi — ne reste que l'essentiel lisible :
// pays, distance, direction, %).
const GUESS_COMPACT_AT = 5;
const GUESS_TINY_AT = 8;

export default function Worldle({ room, me, isHost, players, onFinish, t, lang, restartToken }) {
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [target, setTarget] = useState(null); // objet pays
  const [guesses, setGuesses] = useState([]); // [{ country, km, deg, pct }]
  const [query, setQuery] = useState("");
  const [finished, setFinished] = useState(false);
  const [opponents, setOpponents] = useState({});
  const [highlight, setHighlight] = useState(0);
  const [confetti, setConfetti] = useState([]); // pièces locales, victoire uniquement
  // Instantané de révélation (2026-07, demande explicite) : la carte de fin
  // de manche vit maintenant dans un OVERLAY monté en permanence dès qu'une
  // cible existe (classe .show togglée par `finished`) pour permettre une
  // disparition en fondu, pas seulement une apparition — sans ce cliché,
  // le contenu affiché pendant le fondu de SORTIE serait déjà celui de la
  // manche SUIVANTE (target/myResult sont remis à zéro dès le "start"
  // suivant, qui arrive en même temps que finished repasse à false).
  const [revealSnapshot, setRevealSnapshot] = useState(null);
  const confettiTimer = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const myResult = useRef({ solved: false, tries: 0, bestPct: 0 });
  const roundTimeout = useRef(null);
  const doneSetRef = useRef(new Set());
  const restoredRef = useRef(false);

  useEffect(() => {
    const ch = supabase.channel("worldle_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setTarget(COUNTRIES.find(c => c.id === payload.targetId));
      setDeadline(Date.now() + payload.remaining);
      setGuesses([]); setQuery(""); setFinished(false); setOpponents({});
      myResult.current = { solved: false, tries: 0, bestPct: 0 };
      doneSetRef.current = new Set();
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
      if (isHost) {
        saveGameState(room.id, "worldle", {
          phase: "playing", targetId: payload.targetId,
          deadlineAt: Date.now() + payload.remaining, finished: false,
        });
      }
    });
    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      // Fin de manche anticipée : dès que tout le monde a fini, pas besoin
      // d'attendre le chrono complet.
      if (payload.solved || payload.failed) {
        doneSetRef.current.add(payload.profile_id);
        if (isHost && players?.length > 0 && doneSetRef.current.size >= players.length) {
          hostEndRound();
        }
      }
      if (payload.profile_id === me.id) return;
      setOpponents(prev => ({ ...prev, [payload.profile_id]: payload }));
    });
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      if (isHost) saveGameState(room.id, "worldle", { phase: "finished", finished: true });
      // Victoire/défaite ARCARDI : gagné = pays trouvé avant la fin du chrono.
      recordMatchResult(room.id, myResult.current.solved);
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED" || restoredRef.current) return;
      restoredRef.current = true;
      // Resynchronisation : le pays cible et le chrono partagés sont
      // restaurés immédiatement après un rechargement de page. Seule la
      // progression PRIVÉE du joueur (ses propres essais) repart de zéro
      // (RLS : seul l'hôte écrit sur le salon).
      const saved = readGameState(room, "worldle");
      if (!saved) return;
      if (saved.finished) { setFinished(true); return; }
      if (!saved.targetId) return;
      setTarget(COUNTRIES.find(c => c.id === saved.targetId));
      setDeadline(saved.deadlineAt);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
      if (isHost) {
        const msLeft = Math.max(0, saved.deadlineAt - Date.now());
        roundTimeout.current = setTimeout(hostEndRound, msLeft);
      }
    });
    return () => { clearTimeout(roundTimeout.current); supabase.removeChannel(ch); };
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

  useEffect(() => () => clearTimeout(confettiTimer.current), []);

  // Capture le cliché de révélation UNE FOIS, au moment précis où la manche
  // se termine — jamais mis à jour ensuite tant qu'une nouvelle manche n'est
  // pas elle-même terminée (voir commentaire sur revealSnapshot plus haut).
  useEffect(() => {
    if (!finished || !target) return;
    setRevealSnapshot({
      solved: myResult.current.solved,
      tries: myResult.current.tries,
      target,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function hostStart() {
    const targetC = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    channelRef.current.send({ type: "broadcast", event: "start", payload: { targetId: targetC.id, remaining: ROUND_MS } });
    roundTimeout.current = setTimeout(hostEndRound, ROUND_MS);
  }

  function hostEndRound() {
    clearTimeout(roundTimeout.current);
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
  }

  function rejouer() {
    if (!isHost) return;
    hostStart();
  }

  // "Terminer la partie" (demande 2026-07, page du salon) : la pastille
  // globale rappelle rejouer() via ce jeton — voir DiapasonGame.js pour le
  // détail du mécanisme (identique dans tous les jeux).
  useEffect(() => {
    if (!restartToken) return;
    rejouer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartToken]);

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  const suggestions = useMemo(() => {
    if (!query || query.length < 1) return [];
    const nq = normalize(query);
    const already = new Set(guesses.map(g => g.country.id));
    return COUNTRIES.filter(c => !already.has(c.id) && (
      normalize(c[lang] || c.fr).includes(nq) ||
      (c.alt || []).some(a => normalize(a).includes(nq))
    )).slice(0, 6);
  }, [query, guesses, lang]);

  function guessCountry(c) {
    if (myResult.current.solved || finished || guesses.length >= MAX_TRIES) return;
    const km = Math.round(distanceKm(c, target));
    const deg = bearing(c, target);
    const pct = c.id === target.id ? 100 : proximityPct(km);
    const sameContinent = c.c === target.c;
    const nextGuesses = [...guesses, { country: c, km, deg, pct, sameContinent }];
    setGuesses(nextGuesses);
    setQuery(""); setHighlight(0);
    const solved = c.id === target.id;
    const bestPct = Math.max(myResult.current.bestPct, pct);
    myResult.current = { solved, tries: nextGuesses.length, bestPct };
    // Confettis (demande 2026-07) : pluie vert/bleu locale au joueur qui
    // vient de trouver le bon pays — même recette que Puissance 4.
    if (solved) {
      const pieces = Array.from({ length: 55 }, (_, i) => {
        const big = Math.random() < 0.3;
        return {
          key: "w-" + i + "-" + Date.now(),
          left: Math.round(Math.random() * 100),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: (Math.random() * 0.5).toFixed(2),
          duration: (1.6 + Math.random() * 1.3).toFixed(2),
          size: big ? 13 : 7 + Math.round(Math.random() * 4),
          round: i % 3 === 0,
          drift: Math.round((Math.random() - 0.5) * 140),
        };
      });
      setConfetti(pieces);
      clearTimeout(confettiTimer.current);
      confettiTimer.current = setTimeout(() => setConfetti([]), 3200);
    }
    const failed = !solved && nextGuesses.length >= MAX_TRIES;
    channelRef.current.send({
      type: "broadcast", event: "progress",
      payload: { profile_id: me.id, username: me.username, avatar: me.avatar, tries: nextGuesses.length, solved, failed, bestPct }
    });
  }

  const done = myResult.current.solved || guesses.length >= MAX_TRIES;

  return (
    // position:relative + overflow:hidden : contient la pluie de confettis
    // de victoire dans le panneau (jamais par-dessus le reste de la page).
    <div className="panel worldle-panel" style={{ maxWidth: "min(640px, 92vw)", position: "relative", overflow: "hidden" }}>
      <h1>{t("worldleTitle")}</h1>
      {!target && isHost && (
        <>
          <p className="hint">{MAX_TRIES} {t("worldleIntro")}</p>
          <button className="btn" onClick={hostStart}>{t("start")}</button>
        </>
      )}
      {!target && !isHost && <p className="muted">{t("waitStart")}</p>}

      {target && (
        <>
          {/* Thème vert/bleu (harmonisation 2026-07) : la barre de temps suit
              l'identité du jeu (vert -> bleu) au lieu du duo générique
              vert fluo / rouge. */}
          <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "10px 0 16px" }}>
            <div style={{ height: "100%", width: (timeLeft / ROUND_MS * 100) + "%", background: "linear-gradient(90deg, var(--ok), var(--acc-worldle))", transition: "width .1s linear" }} />
          </div>

          {!done && !finished && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              {/* Audit mobile 2026-07 : l'autocorrection iOS remplaçait les noms de
                  pays en cours de frappe et ses suggestions système faisaient
                  doublon avec la liste d'autocomplétion maison juste en dessous. */}
              <input ref={inputRef} type="text" placeholder={t("worldlePlaceholder")} value={query}
                autoCorrect="off" spellCheck={false} autoComplete="off" enterKeyHint="done"
                onChange={e => { setQuery(e.target.value); setHighlight(0); }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
                  else if (e.key === "Enter" && suggestions.length > 0) guessCountry(suggestions[highlight] || suggestions[0]);
                }} />
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card2)", border: "2px solid var(--line)", borderRadius: 10, marginTop: 4, overflow: "hidden", zIndex: 5 }}>
                  {suggestions.map((c, i) => (
                    <button key={c.id} onClick={() => guessCountry(c)}
                      style={{ display: "flex", gap: 8, width: "100%", padding: "10px 12px", textAlign: "left", background: i === highlight ? "rgba(255,255,255,.08)" : "transparent" }}>
                      <span><FlagIcon code={c.id} /></span><span>{c[lang] || c.fr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!done && !finished && (
            <p className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
              {t("wordleLiveHint")} <b style={{ color: "var(--ok)" }}>+{Math.max(11 - (guesses.length + 1), 1)} {t("pts")}</b>
            </p>
          )}

          {/* Liste des tentatives : se COMPACTE progressivement à mesure
              qu'elle grandit (voir GUESS_COMPACT_AT/GUESS_TINY_AT) — jamais
              de scroll vertical même à 10/10 essais, l'info essentielle
              (pays, distance, direction, %) reste lisible dans tous les cas,
              seuls le détachement du continent puis la barre de progression
              disparaissent aux paliers les plus serrés. */}
          <div className={"worldle-guesses"
            + (guesses.length >= GUESS_TINY_AT ? " tiny" : guesses.length >= GUESS_COMPACT_AT ? " compact" : "")}>
            {guesses.slice().reverse().map((g, i) => {
              const isHit = g.country.id === target.id;
              const isBest = !isHit && g.pct === myResult.current.bestPct;
              return (
                <div key={i} className={"worldle-guess-row stage-enter" + (isHit ? " hit" : isBest ? " best" : "")}>
                  <div className="worldle-guess-top">
                    <span className="worldle-guess-name"><FlagIcon code={g.country.id} /> {g.country[lang] || g.country.fr}</span>
                    {isHit
                      ? <span className="worldle-guess-hitmark">🎯</span>
                      : <span className="worldle-guess-meta">
                          <span>{g.km} km</span><span>{arrowFor(g.deg)}</span>
                          <span className={isBest ? "best" : ""}>{g.pct}%</span>
                        </span>}
                  </div>
                  {!isHit && (
                    <>
                      <div className="worldle-guess-bar-track">
                        <div className={"worldle-guess-bar" + (isBest ? " best" : "")} style={{ width: g.pct + "%" }} />
                      </div>
                      <p className="worldle-guess-continent">
                        {g.sameContinent ? "🌍 " + t("worldleSameCont") : "🌐 " + t("worldleDiffCont")}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {!finished && done && !myResult.current.solved && <p className="muted" style={{ marginTop: 10 }}>{t("wordleWaitOthers")}</p>}
          {!finished && done && myResult.current.solved && (
            <p style={{ color: "var(--p3)", fontWeight: 800, marginTop: 10 }}>{t("foundInPre")} {myResult.current.tries} {t("foundInSuffix")}</p>
          )}

          {Object.keys(opponents).length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <p className="muted" style={{ marginBottom: 8 }}>{t("wordleOpponents")}</p>
              {Object.values(opponents).map(o => (
                <div className="player-chip" key={o.profile_id} style={{ padding: "6px 10px" }}>
                  <span>{o.avatar}</span><span>{o.username}</span>
                  <span className="pt">{o.solved ? "✅ " + o.tries + "/" + MAX_TRIES : (o.failed ? "❌" : (o.bestPct + "%"))}</span>
                </div>
              ))}
            </div>
          )}
          {isHost && !finished && (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={hostEndRound}>⏭️ {t("endRoundNow")}</button>
          )}
        </>
      )}

      {/* Révélation de fin de manche (2026-07, demande explicite) : OVERLAY
          dédié par-dessus le panneau (jamais un bloc dans le flux normal),
          avec une apparition ET une disparition en fondu — monté dès qu'un
          instantané existe (voir revealSnapshot), sa VISIBILITÉ (classe
          .show) suit `finished` pour permettre la transition CSS dans les
          deux sens. Le contenu vient du cliché, jamais de `target`/
          `myResult` en direct, pour ne jamais flasher la manche suivante
          pendant le fondu de sortie. */}
      {revealSnapshot && (
        <div className={"worldle-reveal-overlay" + (finished ? " show" : "")}>
          <div className="worldle-reveal-card">
            {revealSnapshot.solved
              ? <p className="hint">{t("foundInPre")} {revealSnapshot.tries} {t("foundInSuffix")}</p>
              : <p className="hint">{t("worldleFailedPre")} <b style={{ color: "var(--p2)" }}>{revealSnapshot.target[lang] || revealSnapshot.target.fr} <FlagIcon code={revealSnapshot.target.id} /></b></p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
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
        </div>
      )}

      {/* Confettis de victoire (vert/bleu) : purement décoratifs, locaux au
          joueur qui a trouvé — voir guessCountry. */}
      {confetti.map(p => (
        <span
          key={p.key}
          className="confetti-piece"
          style={{
            left: p.left + "%", width: p.size, height: p.size * 1.4,
            borderRadius: p.round ? "50%" : 2, background: p.color,
            "--drift": p.drift + "px",
            animationDuration: p.duration + "s", animationDelay: p.delay + "s",
          }}
        />
      ))}
    </div>
  );
}
