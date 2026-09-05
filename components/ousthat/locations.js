/*
 * 40 panoramas issus de data/diverse-locations.json à la révision MIT
 * WorldGuessr ef88928c03a70d77ce5a1c86fddf74814ff67fc7. Un pays différent
 * par entrée pour obtenir une première sélection mondiale sans répétition.
 * Provenance et licence complètes : ./THIRD_PARTY_NOTICES.md.
 *
 * Les coordonnées restent celles du panorama identifié par panoId, sans
 * arrondi. pitch et fov sont fixés ici afin que tous les clients demandent
 * exactement la même vue initiale ; les mouvements de caméra restent locaux.
 */

const RAW = [
  ["GR",38.09794071723781,21.41533809512418,50,"NcoJdB2eZSNI3pu2sXLn4Q"],
  ["PA",7.720799390611916,-81.28070050453492,329,"ZPIXWk_cxzptC30XZYUpTA"],
  ["BT",27.59804593690841,90.71850930387379,120,"CYbZnXlvl7IDwGkQgfzCyg"],
  ["FI",63.741796138345165,23.45785769109084,303,"H7QVL0Ev-hm1NbecZoVuPw"],
  ["RW",-1.4931212579717026,29.608533461165358,279,"DdR9r4DylfdLxD_39bvgfA"],
  ["UG",0.3224683328104386,32.58646422192249,141,"wFeMmyo-5LBoh0vCkn1PQA"],
  ["IS",65.86552508267427,-19.722893831713613,300,"O3WoeGvcXXRAS-if7o4dOg"],
  ["EE",59.38707156224448,24.868470595974205,180,"PIR_1kB_1pTQyA6xERxLOw"],
  ["SK",48.47282480504339,17.778202964775023,205,"xkxgkVG6kvPJHi6MUxMi8g"],
  ["LV",56.519173343108115,27.067598799314485,7,"qJWBL1Q2-zTRPGDiPvjM5Q"],
  ["MY",2.8670119665411242,112.81033237516255,74,"EZdPvnifluXu9KXzEk4sEA"],
  ["IE",52.36209687927321,-8.662582887081811,57,"RXLZvJnGFND6SxI7SWGRVg"],
  ["UY",-34.04474280494128,-57.052976109246025,288,"YKhdR2osy0x9bM_MEWua5A"],
  ["QA",25.808204219083933,51.368158223136135,317,"qgx2ZAPXQmWKp8aC9XGz2Q"],
  ["LA",15.116353248296825,105.81926873293646,5,"57zMZk9QFheynTsKQCLjeg"],
  ["NZ",-36.8857152509417,174.7414486753889,284,"jOyNDblXhFsKPz6WNyhgtA"],
  ["CZ",49.688712443596465,15.856673502725851,92,"WNrXBaehB_S3Mmpixc13Rg"],
  ["NG",12.589125857277123,4.969343267330353,206,"MnZfWuM1xTA7mUVcA31Q7g"],
  ["EC",-1.0837965582824887,-80.68629956758294,62,"5cPEnn8xHd_EbUjy3xUi-g"],
  ["CH",47.056682914097905,8.169505611429546,329,"un9kx9-3gDs7p6I7Qf_AUQ"],
  ["SZ",-26.519788491646636,31.374655127046722,198,"cA-J5JZfjQaACLQUIeGT6w"],
  ["JO",32.01398092438247,35.87653648492203,337,"y0vLB9mebe612xC6hVHQVQ"],
  ["SI",46.63954534421098,16.233991129831974,81,"skbNF0AgVnRxUdKvLy2JgA"],
  ["BG",42.370290404617634,23.01200072810348,305,"FL64KbWtxgShsUD6m3mmKw"],
  ["LK",7.713678415617654,80.00061063843755,13,"a5tQSd0xHCB3QpWeFKFVbQ"],
  ["AT",48.287828182714414,16.330082965819507,180,"--Q6k-dX_L1lITAsqgRWtQ"],
  ["SN",14.2693909616509,-16.400863273311113,30,"RZj1J8wfDbEYFsakBwWi-Q"],
  ["DE",52.8292124159868,7.425134802360592,359,"t3bYaHpjrgbzHzfkSHgAOw"],
  ["CY",34.8949855464069,33.12263648481302,50,"HhQlLT53GotFv_LqOs3b8g"],
  ["BE",49.93259646642778,5.1983998104247675,47,"eMQ_nPJifbzbrc_q0OStmA"],
  ["PT",39.858927947166,-7.4936459022197734,266,"JF_d8WHzl1SOrAXZMcLuNQ"],
  ["LS",-28.897658462819813,28.803572844774703,191,"V9Z3k1IWoWX89nDeQcq2bQ"],
  ["ME",43.24663154053162,19.37869554324906,179,"XB5m5NIQ2wCfJjukDT-RvA"],
  ["BO",-17.889149311875105,-63.3071549689942,257,"SmKIeK2Rd348o6n1thWrcQ"],
  ["CR",9.99238643656763,-83.06450544260684,326,"v0JfEWMWzlyLqPN5-b3WBw"],
  ["GT",13.926713783339046,-90.38934535079791,191,"P6p8y3wzC73U8bOcYCyOGQ"],
  ["LU",49.89694748578,5.801207108108202,243,"kuxTQQWHyly51WPsHW_O_Q"],
  ["HR",43.92911659404249,16.45996373419789,229,"YfYvNiOgpDofeE76tUx-9w"],
  ["NL",52.728632434730976,4.967683604340568,60,"aGNXJ0Xgp2_d0-9x4nd_hg"],
  ["BD",25.11277262069851,91.1940152580006,17,"6HnPXYneUZMBj_OEFp3zQw"],
];

export const LOCATIONS = Object.freeze(RAW.map(([country, lat, lng, heading, panoId], index) => Object.freeze({
  id: `mit-${String(index + 1).padStart(2, "0")}`,
  country,
  lat,
  lng,
  heading,
  pitch: 0,
  fov: 82,
  panoId,
})));

export const LOCATION_BY_ID = Object.freeze(Object.fromEntries(LOCATIONS.map((location) => [location.id, location])));

export function countryFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
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

export function locationOrder(seed) {
  const ids = LOCATIONS.map((location) => location.id);
  const random = seededRandom(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
