/*
 * Pays et territoires proposés par le mode Country Streak.
 *
 * La liste suit les destinations actuellement publiées par l'Explorer
 * officiel de GeoGuessr (relevé 2026-09-06). Elle est volontairement séparée
 * des 40 panoramas de locations.js : le champ de recherche doit montrer tout
 * le vocabulaire admis, même si la sélection Arcardi actuelle n'en tire
 * encore qu'un sous-ensemble. Les noms viennent d'Intl.DisplayNames pour ne
 * pas maintenir deux traductions qui finiraient par diverger.
 */

const BY_REGION = Object.freeze({
  africa: ["BW", "SZ", "GH", "KE", "LS", "MG", "NA", "NG", "RW", "ST", "SN", "ZA", "TN", "UG"],
  asia: ["BD", "BT", "KH", "CX", "CY", "GE", "HK", "IN", "ID", "IL", "JP", "JO", "KZ", "KG", "LA", "LB", "MY", "MN", "NP", "OM", "PH", "QA", "RU", "SG", "KR", "LK", "TW", "TH", "AE", "VN"],
  europe: ["AL", "AD", "AT", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FO", "FI", "FR", "DE", "GI", "GR", "HU", "IS", "IE", "IM", "IT", "JE", "LV", "LI", "LT", "LU", "MT", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "TR", "UA", "GB"],
  northAmerica: ["CA", "CR", "CW", "DO", "GL", "GT", "MX", "PA", "PR", "US", "VI"],
  oceania: ["AS", "AU", "GU", "NZ", "MP"],
  southAmerica: ["AR", "BO", "BR", "CL", "CO", "EC", "PY", "PE", "UY"],
});

export const COUNTRIES = Object.freeze(Object.entries(BY_REGION).flatMap(([region, codes]) => (
  codes.map((code) => Object.freeze({ code, region }))
)));

export const COUNTRY_BY_CODE = Object.freeze(Object.fromEntries(COUNTRIES.map((country) => [country.code, country])));

const FALLBACK_NAMES = Object.freeze({
  CW: { fr: "Curaçao", en: "Curaçao" },
  SZ: { fr: "Eswatini", en: "Eswatini" },
  MK: { fr: "Macédoine du Nord", en: "North Macedonia" },
  KR: { fr: "Corée du Sud", en: "South Korea" },
  VI: { fr: "Îles Vierges américaines", en: "United States Virgin Islands" },
});

export function countryName(code, lang = "fr") {
  const clean = String(code || "").toUpperCase();
  const locale = lang === "en" ? "en" : "fr";
  if (FALLBACK_NAMES[clean]?.[locale]) return FALLBACK_NAMES[clean][locale];
  try {
    const value = new Intl.DisplayNames([locale], { type: "region" }).of(clean);
    if (value && value !== clean) return value;
  } catch (error) {}
  return clean || "—";
}

export function countryFlag(code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "🏳️";
  return String.fromCodePoint(...[...clean].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function normalizeCountryCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return COUNTRY_BY_CODE[code] ? code : null;
}

export function searchableCountryText(country, lang = "fr") {
  const aliases = {
    CZ: "czechia czech republic republique tcheque tchequie",
    GB: "uk united kingdom great britain royaume uni grande bretagne",
    KR: "south korea coree du sud republic of korea",
    TR: "turkey turkiye turquie",
    US: "usa united states america etats unis amerique",
    VI: "us virgin islands iles vierges americaines",
  };
  return `${country.code} ${countryName(country.code, lang)} ${aliases[country.code] || ""}`;
}

function hashSeed(seed) {
  let h = 2166136261;
  for (const char of String(seed)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let x = hashSeed(seed) || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function shuffle(values, random) {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function countryChoices(targetCode, seed, count = 4) {
  const target = COUNTRY_BY_CODE[normalizeCountryCode(targetCode)];
  if (!target) return [];
  const random = seededRandom(`${seed}:${target.code}`);
  // Les premiers leurres viennent du même continent : un QCM où trois
  // drapeaux sont manifestement impossibles ne mesure pas la lecture du lieu.
  const regional = shuffle(COUNTRIES.filter((item) => item.region === target.region && item.code !== target.code), random);
  const global = shuffle(COUNTRIES.filter((item) => item.region !== target.region), random);
  return shuffle([target.code, ...regional.map((item) => item.code), ...global.map((item) => item.code)].slice(0, Math.max(2, count)), random);
}
