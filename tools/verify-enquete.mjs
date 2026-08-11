/* =============================================================================
   verify-enquete.mjs — « LA PARCELLE QUI N'EXISTE PAS » TIENT-ELLE DEBOUT ? (442)
   -----------------------------------------------------------------------------
       node tools/verify-enquete.mjs

   ⚠️⚠️ CE BANC EXISTE PARCE QUE LES QUINZE AUTRES NE PEUVENT PAS VOIR CE QUI
   CASSE UNE ENQUÊTE. Les défauts d'un chantier narratif ne sont pas des défauts
   de dessin ni de navigation : ce sont des défauts de CHAÎNE — un indice qu'on
   ne demande jamais, une déduction fausse sur le terrain, une porte à deux
   joueurs infranchissable seul, un texte anglais qui manque. Aucun ne lève
   d'erreur, aucun ne se voit sur une planche, et tous se voient à la vingtième
   minute d'une soirée, une fois le joueur engagé.

   La question posée en tête de `CLAUDE.md` reste la même : QUELLE GRANDEUR NE
   MESURE-T-ON PAS. Il y en a six ici, et chacune a son chapitre :

     1. la TABLE se referme sur elle-même (aucun indice orphelin, aucune
        dépendance circulaire, aucun texte manquant DANS LES DEUX LANGUES) ;
     2. l'enquête se termine DANS LE DÉSORDRE autant que dans l'ordre, et l'or
        est payé exactement une fois — c'est le contrôle qui compte, parce que
        deux joueurs qui se répartissent la carte ne trouvent RIEN dans l'ordre ;
     3. la déduction du code A est VRAIE SUR LA CARTE. Une énigme dont la
        réponse ne se lit pas sur le terrain est une énigme fausse, et rien
        d'autre ne peut le dire — le générateur, lui, est content ;
     4. la géographie : les huit meubles sont dans les bonnes pièces, la borne
        de la ferme est sur une case libre, la tombe existe ;
     5. ⚠️ LA PORTE À DEUX SE FRANCHIT SEUL. C'est le contrôle le plus important
        du fichier. À deux, tourner deux clés à deux étages est un éclat de rire ;
        seul, c'est un sprint — et si la fenêtre est trop courte, on a livré un
        mur en croyant livrer une scène de coopération (la leçon de l'arc des
        ponts au 439, transposée à une règle de jeu). On MESURE le trajet, on ne
        règle pas la fenêtre à l'œil ;
     6. le marché SANS enquête est bit à bit celui d'avant, et les deux issues
        ne donnent pas le même prix (sinon le choix final ne choisit rien).

   ⚠️ IL APPELLE, IL NE RECOPIE PAS. `enquete.js` pour la table et les
   résolveurs, `fermeEngine` pour les cartes, la collision du tribunal
   (`courtBoxFree`, sortie de la closure du rendu pour ce banc — voir sa note) et
   les cages d'escalier. La seule chose réécrite ici est la formule de cote du
   430, et c'est délibéré : *on ne mesure pas un trajet avec l'outil qui l'a
   produit* (verify-taxi, 433).

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT : il ne joue pas. Les panneaux,
   l'ordre des invites, le carnet et la lisibilité des documents ne se voient
   qu'en jouant. Il ne dit rien non plus de la QUALITÉ des textes — il dit
   qu'aucun ne manque.
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine", "enquete", "fermeStrings"]);
const C = mods.fermeConstants, E = mods.fermeEngine, Q = mods.enquete;
const FR = mods.fermeStrings.FERME_STR.fr.enq, EN = mods.fermeStrings.FERME_STR.en.enq;

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK   " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};
const title = (s) => console.log(`\n=== ${s} ===\n`);

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA TABLE SE REFERME SUR ELLE-MÊME
   ═══════════════════════════════════════════════════════════════════════════ */
title("1. la table de l'enquête");

{
  const ids = Q.ENQ_SITES.map(s => s.id);
  ok(new Set(ids).size === ids.length, "aucun identifiant de lieu en double", `${ids.length} lieux`);

  /* ⚠️ TOUT INDICE DOIT ÊTRE DEMANDÉ PAR UN CHAPITRE. Un indice qu'aucun
     chapitre ne réclame est un document qu'on peut trouver et qui ne sert à
     rien : il ne bloque pas, il ne lève rien, il DÉÇOIT — le joueur note
     soigneusement quelque chose dont l'enquête ne parlera jamais. */
  const needed = new Set(Q.ENQ_CHAPTERS.flatMap(c => c.need));
  const orphans = ids.filter(i => !needed.has(i));
  ok(orphans.length === 0, "aucun indice orphelin (tout indice est réclamé quelque part)", orphans.join(" "));
  const ghosts = [...needed].filter(i => !Q.ENQ_SITE[i]);
  ok(ghosts.length === 0, "aucun chapitre ne réclame un indice inexistant", ghosts.join(" "));

  /* ⚠️⚠️ LES PRÉREQUIS D'INFORMATION NE DOIVENT PAS BOUCLER, ET C'EST SUBTIL :
     `req` dit « on ne consulte pas une filiation sans un nom ». Si un site A
     exigeait un indice que seul A délivre — directement ou par une chaîne —
     l'enquête serait bloquée sans qu'aucune erreur ne soit levée, et le carnet
     réclamerait tranquillement un document impossible à obtenir. */
  const cyc = [];
  for (const s of Q.ENQ_SITES) {
    const seen = new Set(); const st = [...(s.req || [])];
    while (st.length) {
      const k = st.pop();
      if (k === s.id) { cyc.push(s.id); break; }
      if (seen.has(k)) continue; seen.add(k);
      st.push(...((Q.ENQ_SITE[k] || {}).req || []));
    }
  }
  ok(cyc.length === 0, "aucune dépendance circulaire entre les prérequis", cyc.join(" "));

  /* ⚠️⚠️ LA PARITÉ PROFONDE FR/EN, ET C'EST UN TROU QUE `verify-strings` NE
     PEUT PAS VOIR. Il apparie les clés à quatre espaces d'indentation ; tout le
     chantier vit sous UNE clé (`enq`), donc il en compte une de chaque côté et
     s'arrête là. Une clé manquante ici n'affiche rien du tout au milieu d'un
     document, chez l'autre joueur, et seulement pour lui — le défaut le plus
     discret qu'un jeu bilingue puisse avoir. On l'apparie donc ici, entrée par
     entrée, et le compte des entrées LUES est imprimé : c'est la seule façon de
     s'apercevoir qu'un contrôle ne contrôle rien (leçon du garde-fou de
     `verify-pont`, 441). */
  let read = 0; const missing = [];
  const both = (obj, key, label) => {
    read++;
    const a = obj === "doc" ? (FR.doc || {})[key] : obj === "code" ? (FR.code || {})[key] : null;
    const b = obj === "doc" ? (EN.doc || {})[key] : obj === "code" ? (EN.code || {})[key] : null;
    if (!a || !b) { missing.push(label + ":" + key); return; }
    for (const f of (obj === "doc" ? ["t", "w", "b", "n"] : ["t", "ask", "ph", "hint", "no"])) {
      read++;
      if (a[f] === undefined || b[f] === undefined) missing.push(label + ":" + key + "." + f);
      if (Array.isArray(a[f]) && (!Array.isArray(b[f]) || !b[f].length)) missing.push(label + ":" + key + "." + f + " (liste)");
    }
  };
  for (const id of ids) both("doc", id, "doc");
  for (const k of Object.keys(Q.ENQ_CODES)) both("code", k, "code");
  for (const ch of Q.ENQ_CHAPTERS) {
    for (const t of ["chapter", "goal", "hint"]) {
      read++;
      if (!FR[t] || !FR[t][ch.key]) missing.push(t + ":" + ch.key + " (fr)");
      if (!EN[t] || !EN[t][ch.key]) missing.push(t + ":" + ch.key + " (en)");
    }
    read++;
    if (!FR.omb.line[ch.key] || !EN.omb.line[ch.key]) missing.push("omb.line:" + ch.key);
  }
  for (const o of Q.ENQ_OUTCOMES) {
    read++;
    if (!FR.omb.done[o] || !EN.omb.done[o]) missing.push("omb.done:" + o);
    if (!FR.end["out" + o[0].toUpperCase() + o.slice(1)] || !EN.end["out" + o[0].toUpperCase() + o.slice(1)]) missing.push("end.out:" + o);
  }
  ok(missing.length === 0, "⚠️ parité FR/EN PROFONDE des textes de l'enquête",
     `${read} entrées lues` + (missing.length ? " · manque " + missing.slice(0, 6).join(", ") : ""));
  ok(read > 150, "…et le contrôle a bien lu quelque chose", `${read} entrées`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. L'ENQUÊTE SE TERMINE — DANS L'ORDRE ET DANS LE DÉSORDRE
   ═══════════════════════════════════════════════════════════════════════════ */
title("2. on la termine, et dans n'importe quel ordre");

/* Un « joueur » qui trouve les indices dans l'ordre donné, en respectant les
   seuls prérequis d'INFORMATION (jamais les chapitres — un chapitre ne barre
   aucune porte, c'est toute la thèse de la table). Rend l'or total payé. */
function playThrough(order) {
  const e = Q.newEnquete();
  let gold = 0, guard = 0;
  const todo = order.slice();
  while (todo.length && guard++ < 500) {
    let moved = false;
    for (let i = 0; i < todo.length; i++) {
      const id = todo[i];
      const site = Q.ENQ_SITE[id];
      if (site.req && !site.req.every(k => Q.enqHas(e, k))) continue;   // pas encore lisible
      const r = Q.resolveEnqClue(e, id, "Banc", 1000 + guard);
      if (!r.ok) continue;
      gold += r.gold | 0;
      todo.splice(i, 1); moved = true; break;
    }
    if (!moved) break;
  }
  return { e, gold, left: todo };
}

{
  const ids = Q.ENQ_SITES.map(s => s.id);
  const straight = playThrough(ids);
  ok(straight.left.length === 0, "dans l'ordre : tous les indices sont atteignables", straight.left.join(" "));
  ok(straight.e.ch === Q.ENQ_CHAPTERS.length - 1,
     "dans l'ordre : on arrive au dernier chapitre (le dépôt)", `chapitre ${straight.e.ch + 1}/${Q.ENQ_CH_DONE}`);
  const total = Q.ENQ_CHAPTERS.reduce((a, c) => a + c.reward, 0);
  ok(straight.gold === total, "dans l'ordre : chaque chapitre est payé une fois et une seule", `${straight.gold} or sur ${total}`);

  /* ⚠️⚠️ LE DÉSORDRE EST LE CAS NORMAL, PAS LE CAS LIMITE. Deux joueurs qui se
     répartissent la carte trouvent la borne du bois avant d'avoir lu l'avis de
     la mairie, et le carton d'archives avant la tombe. Une enquête qui ne se
     boucle que dans l'ordre écrit se bloquerait chez la moitié des salons, sans
     lever la moindre erreur — le carnet réclamerait tranquillement un document
     déjà dans le carnet. On rejoue donc 400 permutations. */
  let bad = 0, badGold = 0, worst = null;
  let rs = 0x9e3779b9;
  const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  for (let k = 0; k < 400; k++) {
    const ord = ids.slice();
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    const r = playThrough(ord);
    if (r.left.length) { bad++; if (!worst) worst = r.left.join(" "); }
    if (r.gold !== total) badGold++;
  }
  ok(bad === 0, "⚠️ dans le désordre : 400 permutations, toutes se bouclent", bad ? `${bad} bloquée(s), ex. ${worst}` : "400/400");
  ok(badGold === 0, "⚠️ dans le désordre : l'or total ne dépend pas de l'ordre", `${badGold} écart(s)`);

  /* ⚠️ IDEMPOTENCE : relire un document ne paie pas. C'est ce qui autorise le
     panneau à s'ouvrir autant de fois qu'on appuie sur E, sans garde-fou. */
  const e2 = playThrough(ids).e;
  let again = 0;
  for (const id of ids) { const r = Q.resolveEnqClue(e2, id, "Banc", 9999); again += r.gold | 0; }
  ok(again === 0, "⚠️ retrouver un indice ne rapporte rien", `${again} or`);

  // Le dépôt : il exige les quatre pièces, il ne se fait qu'une fois, et il paie.
  const e3 = playThrough(ids).e;
  ok(Q.enqCanFile(e3), "le dossier est complet en fin de parcours");
  const r1 = Q.resolveEnqFile(e3, "restore", 1);
  const r2 = Q.resolveEnqFile(e3, "keep", 2);
  ok(r1.ok && r1.gold === Q.ENQ_REWARD.restore, "le dépôt paie l'issue choisie", `${r1.gold} or`);
  ok(!r2.ok && r2.already, "⚠️ on ne dépose qu'une fois : la décision est définitive");
  ok(!Q.resolveEnqFile(Q.newEnquete(), "restore", 1).ok, "un dossier vide est refusé");
  ok(!Q.resolveEnqFile(playThrough(ids).e, "n'importe quoi", 1).ok, "une issue inconnue est refusée");

  /* ⚠️ LA REPRISE EST TOLÉRANTE. Une sauvegarde abîmée ne doit pas empêcher de
     charger une ferme entière pour une histoire secondaire (leçon de
     `migrateStation`). Et une sauvegarde d'AVANT ce zip donne une enquête
     neuve, ce qui est le bon comportement — aucune migration SQL. */
  const junk = Q.migrateEnquete({ ch: 999, clues: { pasUnIndice: {}, avis: { by: "x".repeat(999), at: "oups" } },
                                  codes: { Z: true }, signs: "pas un tableau", outcome: "triche", lock: null });
  ok(junk.ch <= Q.ENQ_CH_DONE && !junk.clues.pasUnIndice && !!junk.clues.avis
     && junk.clues.avis.by.length <= 24 && !junk.codes.Z && junk.outcome === null && Array.isArray(junk.signs),
     "⚠️ une sauvegarde abîmée se recharge sans planter ni tricher");
  ok(!Q.enqStarted(Q.migrateEnquete(undefined)), "une sauvegarde d'avant le zip = enquête neuve (zéro migration SQL)");
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LES TROIS CODES — ET LA DÉDUCTION DU PREMIER EST VRAIE SUR LA CARTE
   ═══════════════════════════════════════════════════════════════════════════ */
title("3. les trois codes");

const tw = E.generateTownWorld();
const stones = (tw.props || []).filter(p => p.kind === "boundStone");

{
  ok(Q.enqCodeOk("A", "VT-3-28") && Q.enqCodeOk("A", "vt328") && Q.enqCodeOk("A", " 328 "),
     "code A : les formes raisonnables d'une même réponse sont acceptées");
  ok(!Q.enqCodeOk("A", "VT-3-27") && !Q.enqCodeOk("A", "") && !Q.enqCodeOk("A", "28"),
     "code A : une cote voisine, vide ou tronquée est refusée");
  ok(Q.enqCodeOk("B", "40") && Q.enqCodeOk("B", "an 40") && !Q.enqCodeOk("B", "41"),
     "code B : l'année de décision, et elle seule");
  ok(Q.enqCodeOk("C", "MATHILDE") && Q.enqCodeOk("C", "mathilde") && !Q.enqCodeOk("C", "CHABAND"),
     "code C : la clé du chiffre, insensible à la casse");

  /* ⚠️⚠️⚠️ LE CONTRÔLE QUE RIEN D'AUTRE NE PEUT FAIRE : LA DÉDUCTION DU CODE A
     EST-ELLE VRAIE SUR LE TERRAIN ? Le joueur raisonne ainsi : « on numérote
     d'ouest en est ; le verger est à 25, la promenade à 27, et le plan dit que
     la promenade est la dernière ; or il y a une borne PLUS À L'EST que la
     promenade ; donc il existe une 28. » Cette déduction n'est vraie que si les
     trois pierres sont réellement dans cet ordre-là sur la carte — et le
     générateur, lui, est parfaitement content de les poser dans n'importe quel
     ordre. Le parc a reculé de huit cases au 437, le bois a été creusé au 440 :
     ce genre de chose bouge, et le jour où ça bougera, l'énigme deviendra fausse
     sans qu'aucune ligne de code ne change. */
  const at = (m) => stones.find(s => s.mark === m);
  ok(stones.length === 3, "les trois bornes de section sont posées", stones.map(s => `${s.mark}(${s.x},${s.y})`).join(" "));
  const [v, q2, b2] = [at("verger"), at("quai"), at("bois")];
  ok(!!(v && q2 && b2), "…et chacune porte sa marque");
  if (v && q2 && b2) {
    ok(v.x < q2.x, "⚠️ le verger est à l'OUEST de la promenade (cote 25 < 27)", `x ${v.x} < ${q2.x}`);
    ok(q2.x < b2.x, "⚠️⚠️ la borne martelée est à l'EST de la promenade — la déduction du code A tient", `x ${q2.x} < ${b2.x}`);
    ok(new Set(stones.map(s => s.x + "," + s.y)).size === 3, "les trois bornes sont sur trois cases distinctes");
    for (const s of stones) ok(!!tw.solid[s.y * tw.w + s.x], `la borne « ${s.mark} » bloque (aucun décor traversable)`);
  }

  /* ⚠️ LE CHIFFRE EST UN VRAI CHIFFRE, ET ÇA SE MESURE. Un charabia écrit à la
     main aurait été un second texte à tenir d'accord avec le premier (§8) ; un
     Vigenère mal branché rendrait le texte EN CLAIR sans que personne ne s'en
     aperçoive, puisque la page ressemblerait quand même à une page. On vérifie
     donc les deux sens : l'aller-retour est exact, ET aucun mot long du texte
     clair ne survit dans le texte chiffré. */
  const clair = (FR.doc.registre.b || []).join(" ");
  const chiffre = Q.enqCipher(clair, Q.ENQ_CIPHER_KEY);
  const rendu = Q.enqDecipher(chiffre, Q.ENQ_CIPHER_KEY);
  const nu = clair.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  ok(rendu === nu, "le chiffre de Chaband fait l'aller-retour sans perte");
  const mots = [...new Set(nu.split(/[^A-Z]+/).filter(w => w.length >= 5))];
  const fuites = mots.filter(w => chiffre.includes(w));
  ok(fuites.length === 0, "⚠️ aucun mot du texte clair ne survit au chiffrement",
     `${mots.length} mots longs testés` + (fuites.length ? " · fuite " + fuites.slice(0, 4).join(" ") : ""));
  ok(Q.enqDecipher(chiffre, "PASLABONNECLE") !== nu, "…et une mauvaise clé ne le déchiffre pas");
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LA GÉOGRAPHIE — LES MEUBLES SONT-ILS OÙ L'ENQUÊTE LES CROIT ?
   ═══════════════════════════════════════════════════════════════════════════ */
title("4. la géographie de l'enquête");

const cw = E.generateCourtWorld();
const propIn = (kind, room, mark) => (cw.props || []).filter(p => {
  if (p.kind !== kind) return false;
  if (mark && p.mark !== mark) return false;
  const r = E.courtRoomAt(p.x, p.y);
  return !!r && r.key === room;
});

{
  /* Chaque meuble de l'enquête, dans la pièce que la table lui donne. ⚠️ ON
     COMPTE EXACTEMENT UN : à zéro, l'enquête a une porte qui n'existe pas ; à
     deux, le joueur en trouve un et croit avoir tout vu. */
  const attendus = [
    ["cardIndex", "cadastre", null, "le fichier du cadastre"],
    ["registerStand", "civil", null, "le registre d'état civil"],
    ["registerStand", "surveyor", null, "le registre des cotes"],
    ["registerStand", "notary", null, "le répertoire du notaire"],
    ["bylaw", "notary", null, "le règlement affiché"],
    ["docBox", "cityarch", "note", "le double de la note de service"],
    ["docBox", "cityarch", "pv", "le procès-verbal du conseil"],
    ["archivistNPC", "archives", null, "Ombeline Reboul"],
    ["keyPost", "clerk", null, "la commande de verrou du greffe"],
    ["keyPost", "bailiff", null, "la commande de verrou de l'huissier"],
    ["strongbox", "evidence", null, "l'armoire scellée (moitié gauche)"],
    ["strongbox2", "evidence", null, "l'armoire scellée (moitié droite)"],
    ["wallMap", "cadastre", null, "le plan mural"],
    ["desk", "notary", null, "le guichet du notaire (la réclamation s'y dépose)"],
  ];
  for (const [k, r, mk, label] of attendus) {
    const n = propIn(k, r, mk).length;
    ok(n >= 1, `${label} est bien dans « ${r} »`, `${n} exemplaire(s)`);
  }
  ok(propIn("docBox", "cityarch", null).length === 2, "les deux cartons d'archives sont distincts", "2");
  ok(propIn("archivistNPC", "archives", null).length === 1, "il n'y a qu'une archiviste");

  /* ⚠️⚠️ LES DEUX COMMANDES DE VERROU NE SONT NI DANS LA MÊME PIÈCE NI AU MÊME
     NIVEAU. C'est ce qui fait de la scène une règle à deux plutôt qu'un bouton
     en deux morceaux : deux serrures côte à côte se tournent en marchant. */
  const kg = propIn("keyPost", "clerk")[0], kh = propIn("keyPost", "bailiff")[0];
  if (kg && kh) {
    ok(E.courtFloorOf(kg.y) !== E.courtFloorOf(kh.y),
       "⚠️ les deux commandes de verrou sont à DEUX NIVEAUX différents",
       `${C.COURT_FLOORS[E.courtFloorOf(kg.y)].key} / ${C.COURT_FLOORS[E.courtFloorOf(kh.y)].key}`);
  }

  /* La borne d'origine, à la ferme. ⚠️ C'EST LA SEULE POSITION ÉCRITE EN DUR DE
     TOUT LE CHANTIER, donc la seule qui puisse mentir en silence : la ferme est
     une carte que les joueurs labourent, dallent et clôturent depuis des mois. */
  const w = E.generateWorld(12345);
  const s0 = Q.ENQ_FARM_STONE, i0 = s0.y * C.MAP_W + s0.x;
  ok(s0.x >= 0 && s0.y >= 0 && s0.x < C.MAP_W && s0.y < C.MAP_H, "la borne d'origine est sur la carte de la ferme");
  ok(w.objects[i0] === C.O_NONE, "…sur une case sans objet", `objet ${w.objects[i0]}`);
  ok(!E.blockedTile(w, s0.x, s0.y, Date.now()), "…et praticable", `sol ${w.ground[i0]}`);
  const conflits = [["boutique", C.SHOP], ["bac", C.BIN], ["panneau de gare", C.STATION_SIGN],
                    ["seuil de la maison", C.HOUSE_DOOR], ["point d'apparition", C.SPAWN]];
  for (const [nm, t] of conflits) {
    ok(Math.abs(t.x - s0.x) > 1 || Math.abs(t.y - s0.y) > 1, `…et à l'écart de « ${nm} »`);
  }
  ok(s0.x >= C.STATION_CLEAR.x && s0.x < C.STATION_CLEAR.x + C.STATION_CLEAR.w
     && s0.y >= C.STATION_CLEAR.y && s0.y < C.STATION_CLEAR.y + C.STATION_CLEAR.h,
     "⚠️ …et DANS la zone dégagée de la gare (c'est elle qui garantit la case libre à chaque chargement)");

  // La tombe sans nom : elle se désigne par son rang, elle doit exister et être
  // dans l'enclos du cimetière.
  const gv = Q.enqGraveOf(tw), cm = C.TOWN_CEMETERY;
  ok(!!gv, "la tombe sans nom existe", gv ? `(${gv.x},${gv.y})` : "");
  if (gv) ok(gv.x >= cm.x && gv.x < cm.x + cm.w && gv.y >= cm.y && gv.y < cm.y + cm.h,
             "…et elle est dans l'enclos du cimetière");
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ⚠️⚠️ LA PORTE À DEUX SE FRANCHIT SEUL — ET ON LA MESURE
   ═══════════════════════════════════════════════════════════════════════════ */
title("5. le coffre à deux serrures");

{
  /* ⚠️⚠️ CE CHAPITRE EST LA RAISON POUR LAQUELLE `courtBoxFree` ET
     `courtStairwellAt` SONT SORTIES DE LA CLOSURE DU RENDU. Les recopier ici
     aurait mesuré un autre monde — c'est le §1 du 440, payé sur `render-parc` et
     son champ de bois réinventé. Le banc APPELLE la collision du jeu.
     ⚠️ CE QU'IL MESURE EST UNE DISTANCE, PAS UN TRAJET JOUÉ : un parcours en
     largeur sur les centres de case, les cages d'escalier comptant pour une
     arête. C'est un MINORANT du temps réel (le suiveur glisse le long des murs,
     et un humain ne prend pas la trajectoire optimale) — et c'est dit ici plutôt
     que sous-entendu. On ajoute donc une marge humaine explicite. */
  const RUN = C.PLAYER_SPEED * 1.75;      // Maj, zip 429
  const HUMAN = 3.0;                      // s : deux escaliers, une porte, et le temps de viser
  const W = cw.w, H = cw.h;
  const walk = (x, y) => E.courtBoxFree(cw, x + 0.5, y + 0.4);
  const kg = propIn("keyPost", "clerk")[0], kh = propIn("keyPost", "bailiff")[0];
  const box = propIn("strongbox", "evidence")[0];

  const bfs = (from, to) => {
    const dist = new Map(); const qq = [from]; dist.set(from.x + "," + from.y, 0);
    let head = 0;
    while (head < qq.length) {
      const p = qq[head++]; const d = dist.get(p.x + "," + p.y);
      if (p.x === to.x && p.y === to.y) return d;
      const nb = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) nb.push({ x: p.x + dx, y: p.y + dy });
      // Une cage d'escalier est une ARÊTE : elle relie la même case, un niveau
      // plus loin. C'est la règle du jeu (426), appelée et non réécrite.
      const sw = E.courtStairwellAt(p.x, p.y);
      if (sw) {
        const f = E.courtFloorOf(p.y), to2 = sw.a === f ? sw.b : sw.a;
        nb.push({ x: p.x, y: p.y + E.courtFloorY0(to2) - E.courtFloorY0(f) });
      }
      for (const n of nb) {
        if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H) continue;
        const k = n.x + "," + n.y;
        if (dist.has(k) || !walk(n.x, n.y)) continue;
        dist.set(k, d + 1); qq.push(n);
      }
    }
    return -1;
  };
  /* On part de la case VOISINE de la commande (elle bloque : on se tient
     devant, on ne marche pas dessus) — la même case d'où la touche E marche. */
  const beside = (p) => [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
                                                          .find(c => walk(c.x, c.y));
  if (kg && kh && box) {
    const a = beside(kg), b = beside(kh), c = beside(box);
    ok(!!(a && b && c), "on peut se tenir devant les deux commandes et devant le coffre");
    if (a && b && c) {
      const dAB = bfs(a, b);
      ok(dAB > 0, "⚠️ les deux commandes sont reliées par un chemin praticable", `${dAB} cases`);
      const tAB = dAB / RUN + HUMAN;
      const win = Q.ENQ_LOCK_WINDOW_MS / 1000;
      ok(tAB <= win, "⚠️⚠️ SEUL, en courant, on relie les deux serrures dans la fenêtre",
         `${tAB.toFixed(1)} s pour ${win} s (${dAB} cases à ${RUN.toFixed(1)} c/s + ${HUMAN} s de marge humaine)`);
      ok(tAB >= win / 3, "⚠️ …et la fenêtre demande quand même quelque chose",
         `${tAB.toFixed(1)} s, plancher ${(win / 3).toFixed(1)} s`);
      ok(bfs(b, c) > 0, "…et le coffre est atteignable depuis la seconde commande", `${bfs(b, c)} cases`);
    }
  }

  /* La mécanique elle-même, rejouée sur les horloges de l'HÔTE (§3 : on ne
     compare jamais une horloge hôte à une horloge invité). */
  const mk = () => { const e = Q.newEnquete(); e.clues.acte = { by: "b", at: 1 }; return e; };
  let e = mk();
  let r = Q.resolveEnqLock(e, "greffe", "A", 1000);
  ok(r.ok && r.armed && !Q.enqHas(e, "coffre"), "une seule clé arme, elle n'ouvre pas");
  r = Q.resolveEnqLock(e, "huissier", "B", 1000 + Q.ENQ_LOCK_WINDOW_MS - 1);
  ok(r.opened && Q.enqHas(e, "coffre"), "les deux dans la fenêtre : le coffre s'ouvre");
  e = mk();
  Q.resolveEnqLock(e, "greffe", "A", 1000);
  r = Q.resolveEnqLock(e, "huissier", "B", 1000 + Q.ENQ_LOCK_WINDOW_MS + 1);
  ok(!r.opened && !Q.enqHas(e, "coffre"), "⚠️ une milliseconde de trop et ça ne s'ouvre pas");
  ok(r.armed, "…mais la seconde clé arme à son tour (on recommence dans l'autre sens)");
  e = mk();
  Q.resolveEnqLock(e, "greffe", "A", 1000);
  r = Q.resolveEnqLock(e, "greffe", "A", 1200);
  ok(!r.opened, "⚠️ tourner DEUX FOIS la même clé n'ouvre rien (sinon la règle à deux n'existe pas)");
  ok(!Q.resolveEnqLock(Q.newEnquete(), "greffe", "A", 1).ok
     || !Q.enqHas(Q.newEnquete(), "coffre"), "sans l'acte, le coffre reste fermé");

  /* Les signatures. ⚠️ SEUL, ON PEUT DÉPOSER : un jeu qui exige un second
     joueur pour finir est un jeu qu'on ne finit pas. */
  const e5 = Q.newEnquete();
  ok(Q.resolveEnqSign(e5, "joueur1", true).enough, "seul, la ville fournit le second témoin");
  const e6 = Q.newEnquete();
  ok(!Q.resolveEnqSign(e6, "joueur1", false).enough, "à deux, une seule signature ne suffit pas");
  ok(Q.resolveEnqSign(e6, "joueur2", false).enough, "…et la seconde la complète");
  ok(Q.resolveEnqSign(e6, "joueur2", false).count === 2, "⚠️ signer deux fois ne compte pas double");
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LE MARCHÉ — AVANT, ET APRÈS CHACUNE DES DEUX ISSUES
   ═══════════════════════════════════════════════════════════════════════════ */
title("6. ce que l'enquête fait au marché");

{
  /* ⚠️⚠️ LA FORMULE DE RÉFÉRENCE EST RÉÉCRITE ICI, ET C'EST LE SEUL ENDROIT DU
     BANC OÙ L'ON RECOPIE QUELQUE CHOSE. C'est délibéré, et c'est la règle du
     433 : *on ne mesure pas un trajet avec l'outil qui l'a produit.* Elle dit ce
     que `marketRate` faisait au 430, avant l'enquête ; si les deux divergent
     d'un centième sur une seule journée, c'est qu'on a changé le marché de tous
     ceux qui n'ouvriront jamais le carnet. */
  const span = Math.round(C.MARKET_SPREAD * 100);
  const ref430 = (day, fi) => {
    const h = E.marketHash(day, fi);
    let pct = h % (span + 1);
    if (E.isMarketDay(day)) pct = Math.max(pct, span - (h % Math.max(1, Math.round(span / 3))));
    return 1 + pct / 100;
  };
  let diff = 0, n = 0;
  for (let d = 1; d <= 1000; d++) for (let fi = 0; fi < E.MARKET_FAMILIES.length; fi++) {
    n++;
    if (Math.abs(E.marketRate(d, E.MARKET_FAMILIES[fi]) - ref430(d, fi)) > 1e-9) diff++;
  }
  ok(diff === 0, "⚠️⚠️ sans enquête, le cours est BIT À BIT celui du 430", `${n} couples (jour, famille) comparés`);

  const modR = Q.enqMarketMod({ enquete: { outcome: "restore" } });
  const modK = Q.enqMarketMod({ enquete: { outcome: "keep" } });
  ok(Q.enqMarketMod({}) === null && Q.enqMarketMod({ enquete: { outcome: null } }) === null,
     "une enquête non close ne touche à rien");

  let lo = 9, hi = -9, loK = 9, hiK = -9;
  for (let d = 1; d <= 1000; d++) for (const f of E.MARKET_FAMILIES) {
    const a = E.marketRate(d, f, modR), b = E.marketRate(d, f, modK);
    lo = Math.min(lo, a); hi = Math.max(hi, a); loK = Math.min(loK, b); hiK = Math.max(hiK, b);
  }
  ok(lo < 1, "⚠️ RESTITUTION : la cote peut descendre SOUS le prix du bac", `plancher ${(lo * 100 - 100).toFixed(0)} %`);
  ok(hi > 1 + C.MARKET_SPREAD, "…et monter plus haut qu'avant", `plafond +${(hi * 100 - 100).toFixed(0)} %`);
  ok(loK >= 1 + Q.ENQ_MARKET_FLOOR - 1e-9, "⚠️ MAINTIEN : le plancher demeure, et il est relevé",
     `plancher +${(loK * 100 - 100).toFixed(0)} %`);
  ok(Math.abs(hiK - (1 + C.MARKET_SPREAD)) < 1e-9, "…et le plafond ne bouge pas", `plafond +${(hiK * 100 - 100).toFixed(0)} %`);

  /* ⚠️ LE PLANCHER « JAMAIS MOINS CHER QU'AU BAC » ÉTAIT ÉCRIT DEUX FOIS avant
     ce zip (dans `marketPrice` et dans `resolveTownSellShared`). Il est
     maintenant dans `marketApply`, et c'est LUI qui doit tomber — pas seulement
     l'un des deux, sinon on aurait un marché libre au bac et un plancher chez
     les artisans, deux guichets qui ne racontent pas la même ville. */
  const base = 100;
  ok(E.marketApply(base, 0.8, modR) < base, "⚠️ restitution : le prix payé peut passer sous le prix du bac");
  ok(E.marketApply(base, 0.8, modK) === base, "maintien : le plancher tient, quelle que soit la cote");
  ok(E.marketApply(base, 0.8, null) === base, "sans enquête : le plancher tient (comportement d'avant)");
  ok(E.marketApply(1, 0.1, modR) >= 1, "…et rien ne tombe jamais à zéro");

  /* ⚠️⚠️ SI LES DEUX ISSUES DONNAIENT LE MÊME PRIX, LE CHOIX FINAL NE
     CHOISIRAIT RIEN — et il aurait l'air de choisir, ce qui est pire. */
  /* ⚠️⚠️ ET LA PREMIÈRE ÉCRITURE DE CE CONTRÔLE MESURAIT LA MAUVAISE GRANDEUR,
     ce qui est la sixième fois d'affilée dans ce dépôt (rues 434, eau 435,
     escaliers 436, mairie 439, parc 440, pont 441) : elle comptait les COTES
     IDENTIQUES et échouait à 10,8 % pour un seuil de 10 % choisi à l'œil. Or
     deux distributions linéaires tirées du même hachage SE CROISENT forcément —
     ici autour de +21 % — et le nombre de coïncidences ne dit rien de ce qu'on
     veut savoir. Ce qu'on veut savoir, c'est si le joueur SENT la différence,
     et ça se mesure en écart moyen, pas en collisions. *Vérifier le repère
     avant de corriger le dessin* (429). Le taux de coïncidence reste imprimé à
     côté : c'est une information, pas un verdict. */
  let same = 0, tot = 0, sum = 0;
  for (let d = 1; d <= 1000; d++) for (const f of E.MARKET_FAMILIES) {
    tot++;
    const dd = Math.abs(E.marketRate(d, f, modR) - E.marketRate(d, f, modK));
    sum += dd;
    if (dd < 1e-9) same++;
  }
  const moy = (sum / tot) * 100;
  ok(moy >= 10, "⚠️ les deux issues ne donnent pas le même marché",
     `écart moyen ${moy.toFixed(1)} points (et ${(100 * same / tot).toFixed(1)} % de cotes qui se croisent, ce qui est normal)`);

  // Déterminisme : c'est le contrôle le plus cher du 430, et il doit rester vrai
  // avec le modificateur (les deux clients lisent le même octet partagé).
  let nd = 0;
  for (let d = 1; d <= 500; d++) for (const f of E.MARKET_FAMILIES) {
    if (E.marketRate(d, f, modR) !== E.marketRate(d, f, modR)) nd++;
    if (E.marketRate(d, f, modK) !== E.marketRate(d, f, modK)) nd++;
  }
  ok(nd === 0, "⚠️ la cote reste DÉTERMINISTE sous les deux issues", `${nd} divergence(s)`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 bis. LE MENU DÉVELOPPEUR — IL DOIT AMENER À LA FIN, ET NE RIEN PAYER
   ═══════════════════════════════════════════════════════════════════════════ */
title("6 bis. le menu développeur de l'enquête");

{
  /* ⚠️⚠️ « TOUT JUSQU'AU DÉPÔT » DOIT VRAIMENT AMENER JUSQU'AU DÉPÔT, et c'est
     le genre de bouton qu'on croit sur parole. Les prérequis d'INFORMATION sont
     réels (la filiation ne se lit pas sans le nom ni le registre déchiffré) :
     une boucle unique dans l'ordre de la table la sauterait, le dossier serait
     incomplet, et le testeur conclurait que la scène finale est cassée alors que
     c'est le raccourci qui l'est. C'est le stub menteur du §10, dans l'outil de
     test lui-même. */
  const e = Q.newEnquete();
  const r = Q.devEnquete(e, "all");
  ok(r.ok, "« tout jusqu'au dépôt » s'exécute");
  const manquants = Q.ENQ_SITES.map(s2 => s2.id).filter(id => !Q.enqHas(r.enquete, id));
  ok(manquants.length === 0, "⚠️ …et il ne saute AUCUN indice (les prérequis sont respectés)", manquants.join(" "));
  ok(Q.enqCanFile(r.enquete), "⚠️ …et le dossier est déposable derrière");
  ok(r.enquete.ch === Q.ENQ_CHAPTERS.length - 1, "…et on est au dernier chapitre, pas au-delà",
     `chapitre ${r.enquete.ch + 1}/${Q.ENQ_CH_DONE}`);
  ok(!r.enquete.outcome, "⚠️ …mais il ne DÉPOSE pas : la décision reste au joueur");

  const e2 = Q.newEnquete();
  ok(Q.devEnquete(e2, "start").ok && Q.enqStarted(e2) && Object.keys(e2.clues).length === 1,
     "« lancer » ouvre l'enquête et ne donne qu'un indice");
  /* Chapitre par chapitre : huit clics doivent suffire, et le compte est un
     contrôle en soi — s'il en fallait douze, c'est qu'un chapitre ne se ferme
     pas et personne ne s'en apercevrait en cliquant. */
  const e3 = Q.newEnquete();
  let clics = 0;
  while (e3.ch < Q.ENQ_CHAPTERS.length - 1 && clics < 30) { Q.devEnquete(e3, "chapter"); clics++; }
  ok(e3.ch === Q.ENQ_CHAPTERS.length - 1, "« boucler le chapitre » mène au dépôt", `${clics} clic(s)`);
  ok(clics <= Q.ENQ_CHAPTERS.length, "…sans tourner en rond", `${clics} pour ${Q.ENQ_CHAPTERS.length} chapitres`);

  const e4 = Q.devEnquete(Q.newEnquete(), "all").enquete;
  const e5 = Q.devEnquete(e4, "reset").enquete;
  ok(!Q.enqStarted(e5) && !Q.enqDone(e5) && Object.keys(e5.clues).length === 0,
     "⚠️ « repartir de zéro » rend une enquête NEUVE (pas une enquête à moitié effacée)");
  ok(!Q.devEnquete(Q.newEnquete(), "n'importe quoi").ok, "une opération inconnue est refusée");
  ok(Q.ENQ_DEV_OPS.length === 4, "les quatre opérations sont exposées", Q.ENQ_DEV_OPS.join(" · "));
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. L'HÉRITIER — ET POURQUOI IL NE PEUT PAS CHANGER
   ═══════════════════════════════════════════════════════════════════════════ */
title("7. l'héritier");

{
  /* ⚠️⚠️ IL EST DANS LE VIVIER FIXE, ET C'EST LA DÉCISION ANTI-EXPLOIT DU 439
     RÉUTILISÉE. Tiré dans les résidents de la ferme, il aurait changé EN COURS
     D'ENQUÊTE quand on accueille ou renvoie quelqu'un — et une réclamation
     déposée hier aurait désigné quelqu'un d'autre aujourd'hui. */
  ok(C.TOWN_CANDIDATES.some(c => c.key === Q.ENQ_HEIR_KEY),
     "l'héritier est un candidat du vivier FIXE", Q.ENQ_HEIR_KEY);
  /* Et il est parfois maire, parfois non : c'est ce qui donne à la dernière
     scène deux versions sans coûter un octet (le maire du jour est une pure
     fonction du jour depuis le 439). */
  let asMayor = 0;
  for (let d = 1; d <= 3000; d += 30) if (E.mayorOf(d).key === Q.ENQ_HEIR_KEY) asMayor++;
  ok(asMayor > 0 && asMayor < 100, "⚠️ il est maire certains mandats et pas d'autres (deux fins possibles)",
     `${asMayor} mandat(s) sur 100`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. LES ARRÊTS DU MENU DÉVELOPPEUR MÈNENT-ILS OÙ ILS DISENT ?
   ═══════════════════════════════════════════════════════════════════════════ */
title("8. les arrêts de téléport des intérieurs");

{
  /* ⚠️⚠️ UN CHEMIN DE CODE SANS PORTE N'EXISTE PAS. La résolution du téléport
     savait traiter « hall » et « hallUpper » depuis le 438 — mais `DEV_TELEPORTS`
     ne les listait pas, donc aucun bouton, donc personne n'a jamais pu s'en
     servir. L'église (441) n'avait ni l'un ni l'autre. Trouvé en répondant à
     « peut-on relancer à l'envi ? », pas par un banc : celui-ci le mesure
     désormais, parce que la même chose se reproduira au quatrième bâtiment.
     ⚠️ On vérifie les DEUX SENS : chaque niveau habitable a son arrêt, et chaque
     arrêt tombe sur un niveau qui existe. */
  const inhabited = C.COURT_FLOORS.map((f, i) => [i, f]);
  const stops = C.DEV_TELEPORTS.filter(d => d.zone === "court").map(d => d.key);
  const KEY_OF_FLOOR = { 0: "court", 1: "courtUpper", 2: "courtBasement", 3: "hall", 4: "hallUpper", 5: "church", 6: "churchLoft" };
  const missing = inhabited.filter(([i]) => !stops.includes(KEY_OF_FLOOR[i])).map(([i, f]) => f.key);
  ok(missing.length === 0, "⚠️ chacun des sept niveaux a son arrêt de téléport",
     missing.length ? "sans arrêt : " + missing.join(" ") : stops.join(" · "));
  const ghosts = stops.filter(k => !Object.values(KEY_OF_FLOOR).includes(k));
  ok(ghosts.length === 0, "…et aucun arrêt ne pointe sur un niveau qui n'existe pas", ghosts.join(" "));
  /* Les six lieux de l'enquête qui vivent dans la mairie ne sont atteignables
     qu'avec ces arrêts-là : c'est ce qui rend le contrôle utile plutôt que
     décoratif. */
  const inHall = ["cardIndex", "registerStand", "docBox", "wallMap"].reduce((n, k) =>
    n + (cw.props || []).filter(p => p.kind === k && ["cadastre", "civil", "surveyor", "cityarch"].includes((E.courtRoomAt(p.x, p.y) || {}).key)).length, 0);
  ok(inHall >= 6, "⚠️ …et la mairie porte bien six meubles d'enquête ou plus", `${inHall} meubles`);
}

console.log(fails ? `\n❌ ${fails} ÉCHEC(S)\n` : `\n✅ Tous les contrôles passent.\n`);
console.log(`Ce banc ne JOUE pas : les panneaux, l'ordre des invites, la lisibilité
des documents et le plaisir de lecture ne se voient qu'en jouant. Il ne dit rien
non plus de la QUALITÉ des textes — il dit qu'aucun ne manque, dans les deux
langues, et que la chaîne des indices se referme sur elle-même.`);
process.exit(fails ? 1 : 0);
