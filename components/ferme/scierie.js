/* ═══════════════════════════════════════════════════════════════════════════
   LOT E — LA GRANDE SCIE DE TRISTAN : LA MÉCANIQUE PURE.
   ═══════════════════════════════════════════════════════════════════════════
   Ce fichier est à la SCIE ce que `maire.js` est à l'audience : une simulation,
   des verdicts, et rien d'autre. Il ne dessine rien, il n'appelle pas React, il
   n'ouvre aucun panneau. `scierieAtelier.js` en LIT l'état pour placer une lame
   et deux paires de mains, `ScierieScene.js` l'anime, `FermeGame.js` l'arbitre,
   et `tools/verify-scierie.mjs` l'importe et JOUE des manches entières.

   Demande de Guillaume, mot pour mot : « la scie doit pas être trop rigide et on
   doit sentir l'effort. Je veux un truc bien arcade, appuyer en rythme pour
   découper les planches etc avec la possibilité de casser la planche de bois ».
   Le dossier de conception est au §17.6 de `QUETE.md`.

   ───────────────────────────────────────────────────────────────────────────
   CE QUE C'EST, EN QUATRE LIGNES

   Une lame sur un rail : −1 chez Tristan, +1 chez nous. Il tire, on tire, et
   c'est l'ALTERNANCE qui coupe. Tirer quand la lame revient entretient l'élan ;
   tirer quand il tire encore COINCE la lame — elle s'arque, elle chauffe, elle
   ne mord plus, et le bois encaisse. Cinq planches, trois ruptures autorisées.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ TROIS RÈGLES DE CONSTRUCTION, ET AUCUNE N'EST DÉCORATIVE.

   1. LA SIMULATION EST À PAS FIXE (`C.SAW_HZ`), ET ELLE N'EST JAMAIS APPELÉE
      AVEC UN `dt` D'IMAGE. C'est ce qui rend la manche REJOUABLE : le client
      envoie la liste des instants où il a tiré (des numéros de pas, pas des
      horodatages — leçon du 2026-08-27 : une date absolue ne survit pas à une
      opération 32 bits, et deux horloges ne se comparent jamais, §3), et l'hôte
      rejoue exactement la même manche. Le client n'annonce jamais son résultat.
      ⚠️ Corollaire mesuré ailleurs (458) : un réglage « par image » donne un jeu
      plus facile à 144 Hz qu'à 60. Ici la cadence d'affichage n'a aucun effet
      sur la mécanique — l'écran interpole, il ne décide pas.

   2. AUCUNE FONCTION TRANSCENDANTE DANS LE CHEMIN DE SIMULATION. Pas de `sin`,
      pas de `pow`, pas de `random` : la norme JavaScript garantit `+ − × ÷` au
      bit près et laisse `Math.sin` à l'implémentation. Deux navigateurs
      différents rejoueraient alors deux manches différentes, et le symptôme
      serait le pire qui soit — une manche gagnée à l'écran, refusée par le
      réseau, sans que rien ne l'explique. Le hasard de Tristan passe donc par un
      hachage ENTIER (`hash32`), qui est exact partout.

   3. LES DEUX POIGNÉES SONT SYMÉTRIQUES DANS LE CODE (`sawPull(s, side)`), MÊME
      SI UNE SEULE EST JOUÉE AUJOURD'HUI. Le §17.6 promet deux joueurs sur la
      même scie ; l'écrire aujourd'hui avec un « joueur » et un « automate »
      obligerait à tout rouvrir le jour où le second joueur arrive. Ici la seule
      chose qui change est QUI décide du trait de la poignée −1 : l'automate
      (`sawMate`) ou un second journal. La mécanique, elle, ne bouge pas.
      ⚠️ CE QUI N'EST PAS FAIT : le transport réseau de ce second journal. La
      manche se joue en solo avec Tristan en face, comme le §17.6 le prévoit pour
      le solo. C'est une dette DATÉE, pas un oubli.

   ⚠️ Rien ici ne connaît `STAR_TIMBER` ni la quête : la manche rend une NOTE, et
   c'est `FermeGame.js` qui décide ce qu'une note vaut. Un module de geste qui
   lirait la quête serait un module qu'on ne peut plus réutiliser pour la
   charpente, la grange ou le pont.
   ═══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";

/* ── LE HACHAGE. ⚠️ ENTIER DE BOUT EN BOUT, et c'est la règle n°2 ci-dessus.
   `Math.imul` est le seul moyen d'avoir une multiplication 32 bits exacte en
   JavaScript ; `a * b` sur deux grands entiers passe par un flottant 64 bits et
   perd les bits de poids faible — ceux-là mêmes qui font le hasard. ── */
export function hash32(a, b) {
  let h = (a | 0) ^ Math.imul(b | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
/* Une graine par pièce du navire : deux commandes différentes n'ont pas le même
   Tristan. ⚠️ ELLE SE DÉDUIT DU NOM DE LA PIÈCE, donc les deux côtés du réseau
   la calculent sans que rien ne circule (§3 : ce qui peut se déduire ne se
   diffuse pas). */
export function sawSeed(part) {
  let h = 2166136261;
  const s = String(part || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* Les cinq verdicts d'un trait. ⚠️ CE SONT DES CLÉS, PAS DES PHRASES : le texte
   vit dans `fermeStrings.js` comme partout ailleurs, et l'hôte rejoue des clés. */
export const SAW_VERDICTS = ["perfect", "good", "weak", "bind", "dead"];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ═══════════════════════════════════════════════════════════════════════════
   L'ÉTAT — TOUT CE QUI VIT ENTRE DEUX PAS, ET RIEN D'AUTRE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ IL EST PLAT ET SANS TABLEAU. Une seule raison, et elle a déjà coûté cher
   (2026-08-31, `poseTarget`) : un état qu'on peut copier par `{ ...s }` sans
   partager une référence est un état qu'on peut sauvegarder, comparer et
   rejouer sans piège. Les compteurs sont des nombres, pas une liste de traits.
   ═══════════════════════════════════════════════════════════════════════════ */
export function sawInit(ctx) {
  const o = ctx || {};
  const planks = Math.max(1, (o.planks | 0) || C.SAW_PLANKS);
  return {
    seed: (o.seed >>> 0) || sawSeed(o.part),
    planks, plank: 0,
    tick: 0,
    /* ⚠️ LA LAME PART CHEZ NOUS, AU REPOS, ET C'EST TRISTAN QUI OUVRE. Partie du
       centre, le premier trait du joueur n'a aucun sens de lecture — il ne sait
       pas encore que la scie ALTERNE. Le voir tirer une fois avant de devoir
       répondre enseigne la règle en une seconde, sans une ligne de texte. */
    bx: C.SAW_END, bv: 0,
    cut: 0, stress: 0, bind: 0, stam: 1, slack: 0,
    tempo: C.SAW_TEMPO_MAX,
    pull: 0, pullK: 1, mate: 0, mateWait: -1, mateN: 0,
    hold: 0, holdKind: "",
    perfect: 0, good: 0, weak: 0, binds: 0, dead: 0, strokes: 0,
    broken: 0, combo: 0, bestCombo: 0,
    over: "",                    // "" | "done" | "broken" | "timeout"
    /* ⚠️ LE DERNIER VERDICT EST DANS L'ÉTAT PARCE QUE LE DESSIN LE LIT. Le
       renvoyer seulement depuis `sawPull` aurait obligé la vue à le recopier
       dans un ref à elle, c'est-à-dire à tenir une seconde description du même
       fait (§8). `lastAt` date son affichage, en pas. */
    last: "", lastAt: -999,
  };
}

/* Une copie franche. ⚠️ Utilisée par le banc pour comparer deux manches pas à
   pas ; elle est sûre parce que l'état est plat (voir ci-dessus). */
export function sawCopy(s) { return { ...s }; }

/* ═══════════════════════════════════════════════════════════════════════════
   UN TRAIT — LE SEUL ENDROIT OÙ UNE DÉCISION ENTRE DANS LA SIMULATION
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LE VERDICT SE LIT SUR LA LAME, JAMAIS SUR UNE HORLOGE. C'est ce qui rend
   le geste lisible : le joueur VOIT où est la lame et dans quel sens elle va,
   donc il peut apprendre. Une fenêtre en millisecondes, invisible par
   construction, ne s'apprend pas — elle se subit, et le joueur conclut que le
   jeu est capricieux.
   ⚠️ ET C'EST AUSSI CE QUI ÉVITE LA DIVERGENCE DU §8 : le tempo et la fenêtre
   auraient été deux descriptions du même instant. Ici il n'y a qu'une grandeur,
   la position de la lame, et le tempo n'agit que sur la RÉACTION de Tristan.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️⚠️ LE VERDICT EST UN PRÉDICAT PUR, ET C'EST L'INTERFACE QUI L'A EXIGÉ.
   Le HUD doit dire au joueur, EN CONTINU, ce que donnerait un trait maintenant —
   sinon il n'a aucun moyen d'apprendre où se trouve la fenêtre, et un jeu de
   rythme qu'on ne peut pas apprendre est un jeu de hasard. Il aurait été facile
   de réécrire les trois conditions dans la vue : c'est la faute du 449 (deux
   réponses à la même question, les deux vertes, et personne ne les compare
   jamais). Une seule fonction, deux appelants — l'arbitre et l'affichage. */
export function sawWould(s) {
  if (s.over || s.hold > 0) return "dead";
  if (s.pull > 0) return "weak";
  if (s.mate > 0) return "bind";
  const x = -s.bx / C.SAW_END;
  /* ⚠️⚠️ DEUX GRANDEURS, ET IL EN FAUT DEUX : OÙ est la lame, et depuis combien
     de temps elle DORT. La position seule laissait la fenêtre parfaite ouverte
     pour toujours dès que la lame s'arrêtait chez Tristan — mesuré par le banc
     dès la première manche. Le mou est ce qui la referme, et il se voit à
     l'écran (la lame s'assied dans son trait) au lieu de se deviner. */
  if (x >= C.SAW_PERFECT_X && s.bv > -C.SAW_PERFECT_V && s.slack < C.SAW_SLACK_PERFECT) return "perfect";
  if (x >= C.SAW_GOOD_X && s.slack < C.SAW_SLACK_GOOD) return "good";
  return "weak";
}

export function sawPull(s, side) {
  const sd = (side | 0) || 1;
  /* ⚠️ ON REFUSE PENDANT LE TEMPS D'ARRÊT ET APRÈS LA FIN, ET ON LE DIT (`dead`).
     Un trait avalé en silence ferait croire à une touche qui ne répond pas —
     c'est le défaut « le jeu propose et refuse » (426) au niveau du doigt. */
  if (s.over || s.hold > 0) { s.dead++; s.last = "dead"; s.lastAt = s.tick; return "dead"; }

  /* La poignée d'en face : symétrique, et c'est la promesse du §17.6. */
  if (sd < 0) { s.mate = Math.round(C.SAW_PULL_MS * C.SAW_HZ / 1000); s.mateN++; return "mate"; }

  s.strokes++;
  const v = sawWould(s);

  /* ╔═══════════════════════════════════════════════════════════════════════
     ║ ⚠️⚠️⚠️ ON NE TIRE PAS DEUX FOIS DANS LE MÊME TRAIT, ET LE BANC A TROUVÉ
     ║ POURQUOI IL FALLAIT L'ÉCRIRE.
     ╚═══════════════════════════════════════════════════════════════════════
     Sans cette garde, un second appui pendant que le premier pousse encore
     AJOUTE sa force à la précédente : la manche jouée par le banc a sorti trois
     traits « parfaits » par aller-retour, une lame à trois fois la poussée
     prévue, et une note maximale obtenue en martelant pendant la bonne moitié
     du cycle. C'est exactement l'inverse du geste qu'on veut enseigner.
     ⚠️ ET LE VERDICT N'EST PAS « RIEN » MAIS « MOU » : le bras est au bout de sa
     course, on ne peut que secouer la poignée. Ça coûte du souffle et du tempo,
     comme toute crispation. *Un geste impossible doit répondre quelque chose,
     sinon le joueur croit que la touche a sauté* (426). */
  if (s.pull > 0) {
    s.weak++; s.combo = 0;
    s.stam = clamp(s.stam - C.SAW_STAM_COST, 0, 1);
    s.tempo = clamp(s.tempo + C.SAW_TEMPO_LOSS, C.SAW_TEMPO_MIN, C.SAW_TEMPO_MAX);
    s.last = "weak"; s.lastAt = s.tick;
    return "weak";
  }

  /* ⚠️⚠️ LE COINCEMENT N'EST PAS UNE « FENÊTRE RATÉE », C'EST DEUX FORCES
     OPPOSÉES. La condition est donc physique et pas temporelle : Tristan tire
     ENCORE. C'est exactement ce que le §17.6 promet — « tirer ensemble coince la
     lame » — et c'est visible à l'écran une demi-seconde avant, ce qui en fait
     une faute et pas un piège. */
  if (v === "bind") {
    s.bind = clamp(s.bind + C.SAW_BIND_HIT, 0, 1.6);
    s.binds++; s.combo = 0;
    s.tempo = clamp(s.tempo + C.SAW_TEMPO_LOSS, C.SAW_TEMPO_MIN, C.SAW_TEMPO_MAX);
    s.stam = clamp(s.stam - C.SAW_STAM_COST, 0, 1);
    s.last = "bind"; s.lastAt = s.tick;
    return "bind";
  }

  const k = v === "perfect" ? 1 : v === "good" ? 0.85 : 0.55;
  /* ⚠️ ON RELANCE LA LAME, DONC LE MOU TOMBE : c'est le trait qui retend, pas le
     temps qui passe. L'écrire dans `sawTick` aurait donné une seconde règle pour
     le même fait, et les deux auraient divergé au premier réglage (§8). */
  s.slack = 0;
  s.pull = Math.round(C.SAW_PULL_MS * C.SAW_HZ / 1000);
  s.pullK = k;
  s.stam = clamp(s.stam - C.SAW_STAM_COST, 0, 1);
  if (v === "perfect") {
    s.perfect++; s.combo++;
    if (s.combo > s.bestCombo) s.bestCombo = s.combo;
    s.tempo = clamp(s.tempo - C.SAW_TEMPO_GAIN, C.SAW_TEMPO_MIN, C.SAW_TEMPO_MAX);
  } else if (v === "good") {
    s.good++; s.combo = 0;
  } else {
    s.weak++; s.combo = 0;
    s.tempo = clamp(s.tempo + C.SAW_TEMPO_LOSS, C.SAW_TEMPO_MIN, C.SAW_TEMPO_MAX);
  }
  s.last = v; s.lastAt = s.tick;
  return v;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRISTAN — IL RÉPOND, IL NE MÈNE PAS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST LA DÉCISION DE CONCEPTION LA PLUS IMPORTANTE DU FICHIER. Un
   partenaire qui mène est un métronome : le joueur le suit ou le rate, et sa
   propre régularité ne change rien. Un partenaire qui RÉPOND fait de la scie un
   dialogue — bien tirer rapproche sa réponse, mal tirer lui rend du mou — et
   c'est ce qui donne l'accélération arcade sans qu'aucune courbe de difficulté
   n'ait été écrite. La montée émerge du geste.
   ⚠️ SON DÉLAI OSCILLE, ET LE HASARD EST UN HACHAGE (règle n°2) : sans ce
   flottement il devient parfaitement prévisible en trois traits, et le joueur
   cesse de regarder la lame pour compter dans sa tête.
   ═══════════════════════════════════════════════════════════════════════════ */
function sawMate(s, rate) {
  if (s.mate > 0 || s.hold > 0 || s.over) return;
  /* il n'engage que lorsque la lame est arrivée chez nous ET qu'elle y meurt :
     une scie qu'on relance avant la fin du trait précédent est une scie qui
     s'arrache des mains */
  if (s.mateWait < 0) {
    if (s.bx > C.SAW_END - 0.10 && s.bv < 0.30) {
      const j = hash32(s.seed, s.mateN) % 2001;                 // 0..2000
      const jit = ((j - 1000) / 1000) * C.SAW_MATE_JITTER_MS;   // ±SAW_MATE_JITTER_MS
      /* ⚠️ SON DÉLAI N'EST PLUS MIS À L'ÉCHELLE DU TEMPO : la dilatation globale
         du pas s'en charge déjà (`rate` dans `sawTick`). Le faire deux fois
         serait la divergence du §8 — deux descriptions de la même accélération —
         et Tristan répondrait au carré du tempo. Ne reste ici que son flottement
         propre, qui est ce qui l'empêche d'être un métronome. */
      const ms = C.SAW_MATE_DELAY_MS + jit;
      s.mateWait = Math.max(2, ms * C.SAW_HZ / 1000);
    }
    return;
  }
  s.mateWait -= rate;
  if (s.mateWait <= 0) { s.mateWait = -1; sawPull(s, -1); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UN PAS — LA LAME, LE TRAIT DE SCIE, LA CONTRAINTE, LE SOUFFLE
   ═══════════════════════════════════════════════════════════════════════════ */
export function sawTick(s) {
  if (s.over) return s;
  s.tick++;
  /* ⚠️⚠️⚠️ LA MANCHE A UNE FIN, ET ELLE EST ÉCRITE ICI — pas chez l'appelant.
     Voir la note de `SAW_MAX_TICKS` : une borne posée par chaque appelant est
     deux bornes, et les deux appelants sont le client et l'hôte. */
  if (s.tick >= C.SAW_MAX_TICKS) { s.over = "timeout"; return s; }

  if (s.hold > 0) {
    /* ⚠️ L'ARRÊT NE S'ACCÉLÈRE PAS AVEC LE TEMPO : c'est un battement de mise en
       scène (la planche bascule, la planche se fend), pas une phase de jeu. Le
       presser avec le reste reviendrait à raccourcir la seule chose qu'on a
       ajoutée pour qu'on la VOIE. */
    s.hold--;
    /* ⚠️ LA LAME S'ARRÊTE PENDANT L'ARRÊT, elle ne continue pas sur son erre :
       une planche qui vient de se fendre ne scie plus rien, et voir la lame
       poursuivre serait dire au joueur que la rupture est cosmétique. */
    s.bv = 0;
    if (s.hold === 0) s.holdKind = "";
    return s;
  }

  /* ⚠️⚠️ TOUT LE PAS EST DILATÉ PAR LE TEMPO. Un seul point d'entrée pour
     l'accélération : la lame, les compteurs de traits, la contrainte, le mou et
     le souffle avancent tous d'autant. C'est la seule façon que le geste reste
     IDENTIQUE en plus rapide — deux échelles de temps (une pour la lame, une
     pour la fatigue) auraient donné un jeu dont les règles changent en cours de
     route sans que rien ne le dise. */
  const rate = C.SAW_TEMPO_MAX / s.tempo;
  const DT = C.SAW_DT * rate;
  sawMate(s, rate);

  /* ── LES FORCES. ⚠️ LE SOUFFLE MULTIPLIE NOTRE TRAIT, PAS CELUI DE TRISTAN :
     c'est nous qui fatiguons, et c'est la seule façon de « sentir l'effort »
     sans afficher une barre de vie sur un geste d'artisan. ── */
  let a = 0;
  if (s.pull > 0) {
    const stam = C.SAW_STAM_FLOOR + (1 - C.SAW_STAM_FLOOR) * s.stam;
    a += C.SAW_PULL * (s.pullK || 1) * stam;
    s.pull -= rate;
  }
  if (s.mate > 0) { a -= C.SAW_PULL * C.SAW_MATE_PULL_K; s.mate -= rate; }
  a -= C.SAW_DRAG * s.bv;
  /* ⚠️⚠️ LE COINCEMENT FREINE LA LAME EN PLUS DE LA FAIRE CHAUFFER, et il le
     faut : sans ce terme, deux forces opposées se soldent par une lame
     IMMOBILE mais libre — elle repartirait à pleine vitesse à la milliseconde
     où l'une des deux s'arrête, ce qui se lit comme un défaut d'affichage. Une
     lame arquée dans son trait est FREINÉE, et c'est ce qu'on voit. */
  if (s.bind > 0) a -= s.bv * s.bind * 5.5;
  /* les butées : molles, parce qu'une scie qui tape sa butée est une scie
     cassée — et parce qu'un rebond dur ferait sauter la lame à l'écran */
  if (s.bx > C.SAW_END) a -= (s.bx - C.SAW_END) * 42;
  else if (s.bx < -C.SAW_END) a -= (s.bx + C.SAW_END) * 42;

  s.bv += a * DT;
  s.bx += s.bv * DT;
  /* garde dure : la lame ne sort JAMAIS de son cadre, quoi qu'il arrive à la
     physique. Une lame hors cadre, c'est un dessin faux — et un banc qui ne le
     verrait pas parce qu'il ne regarde que la note. */
  if (s.bx > 1) { s.bx = 1; if (s.bv > 0) s.bv = 0; }
  else if (s.bx < -1) { s.bx = -1; if (s.bv < 0) s.bv = 0; }

  /* ── CE QUI COUPE EST LA VITESSE, PAS L'APPUI. Une lame qu'on pousse sans
     qu'elle bouge chauffe le bois, elle ne le débite pas — c'est vrai d'une
     vraie scie, et c'est ce qui rend le coincement lisible sans un mot. ── */
  const bindN = s.bind > 1 ? 1 : s.bind;
  const bite = C.SAW_BITE * (1 - (1 - C.SAW_BITE_BIND) * bindN);
  const sp = s.bv < 0 ? -s.bv : s.bv;
  s.cut += bite * sp * DT;

  /* ── LA CONTRAINTE. Elle monte tant que la lame est arquée, elle redescend
     dès qu'elle est libre : une planche pardonne une faute, pas une habitude. ── */
  /* ── LE MOU. ⚠️ IL NE MONTE QUE QUAND PERSONNE NE TIRE ET QUE LA LAME NE VA
     NULLE PART : une lame lancée n'est jamais détendue, même lente. C'est la
     différence entre « lent » et « arrêté », et c'est elle qui autorise un
     joueur posé sans autoriser un joueur absent. ── */
  const still = (s.bv < 0 ? -s.bv : s.bv) < C.SAW_SLACK_STILL;
  if (s.pull <= 0 && s.mate <= 0 && still) s.slack += C.SAW_SLACK_RATE * DT;
  else if (s.pull > 0 || s.mate > 0) s.slack = 0;

  s.bind = s.bind > 0 ? clamp(s.bind - C.SAW_BIND_FALL * DT, 0, 1.6) : 0;
  s.stress = clamp(s.stress + (C.SAW_STRESS_BIND * bindN - C.SAW_STRESS_FALL) * DT, 0, 2);
  s.stam = clamp(s.stam + C.SAW_STAM_BACK * DT, 0, 1);

  /* ── LA RUPTURE. ⚠️ ELLE NE COÛTE PAS LA MANCHE : elle coûte le trait déjà
     fait, du bois, et le temps de recommencer. Trois ruptures, et la commande
     est perdue — mais rien n'a été dépensé, puisque l'hôte n'a encore rien
     prélevé (voir `starTimberSaw` dans `FermeGame.js`). C'est ce qui autorise
     un vrai risque : perdre ne punit que le temps qu'on vient d'y passer. ── */
  if (s.stress >= 1) {
    s.broken++;
    s.cut = 0; s.stress = 0; s.bind = 0; s.bv = 0; s.bx = C.SAW_END; s.slack = 0;
    s.pull = 0; s.mate = 0; s.mateWait = -1; s.combo = 0;
    s.hold = Math.round(C.SAW_BREAK_HOLD_MS * C.SAW_HZ / 1000);
    s.holdKind = "break";
    s.last = "break"; s.lastAt = s.tick;
    if (s.broken >= C.SAW_BREAK_MAX) { s.over = "broken"; s.hold = 0; s.holdKind = ""; }
    return s;
  }

  /* ── LA PLANCHE TOMBE. Un battement d'arrêt, le temps qu'elle bascule : sans
     lui, la planche suivante est déjà là avant que l'œil ait vu la première
     finir, et cinq planches se lisent comme une seule barre qui se remplit. ── */
  if (s.cut >= 1) {
    s.plank++;
    s.cut = 0; s.stress = 0; s.bind = 0; s.bv = 0; s.bx = C.SAW_END; s.slack = 0;
    s.pull = 0; s.mate = 0; s.mateWait = -1;
    s.last = "plank"; s.lastAt = s.tick;
    if (s.plank >= s.planks) { s.over = "done"; return s; }
    s.hold = Math.round(420 * C.SAW_HZ / 1000);
    s.holdKind = "plank";
  }
  return s;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA NOTE — CE QUE LA MANCHE VAUT, ET RIEN DE PLUS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ELLE NE CHANGE QUE LA DURÉE DE LA COMMANDE, PAS SON PRIX. Un mini-jeu qui
   change une dépense fait de l'adresse une monnaie, et la ferme a déjà une
   économie (§ `STAR_TIMBER`, zip 478). Le temps, lui, est très exactement ce que
   l'audit 477 reprochait à ce chantier : cinq sabliers et rien à faire pendant.
   ⚠️ SEULES LES PLANCHES CASSÉES COÛTENT DU BOIS, parce que c'est du bois qu'on
   a réellement fendu — la sanction dit ce qui s'est passé, elle n'invente pas
   une amende.
   ═══════════════════════════════════════════════════════════════════════════ */
export function sawResult(s) {
  const n = Math.max(1, s.perfect + s.good + s.weak + s.binds);
  const q = clamp((s.perfect + 0.62 * s.good + 0.22 * s.weak - 0.35 * s.binds) / n, 0, 1);
  return {
    ok: s.over === "done",
    over: s.over,
    planks: s.plank, broken: s.broken,
    perfect: s.perfect, good: s.good, weak: s.weak, binds: s.binds,
    strokes: s.strokes, bestCombo: s.bestCombo,
    ticks: s.tick,
    grade: q,
    /* ⚠️ LE PALIER EST DÉRIVÉ DE LA NOTE, JAMAIS COMPTÉ À PART (§8) : trois
       seuils écrits ailleurs auraient dérivé du jour où l'on retouche `grade`. */
    stars: q >= 0.86 ? 3 : q >= 0.62 ? 2 : q >= 0.34 ? 1 : 0,
    msScale: C.SAW_MS_WORST + (C.SAW_MS_BEST - C.SAW_MS_WORST) * q,
    woodExtra: s.broken * C.SAW_BREAK_WOOD,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE REJEU — CE QUE L'HÔTE APPELLE, ET LE CLIENT AUSSI
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ C'EST LA MÊME FONCTION DES DEUX CÔTÉS DU RÉSEAU, comme `mayorCtxOf`
   pour l'audience : leur accord est une propriété du code, pas une coïncidence.
   Le client la fait tourner en direct (un pas de simulation par tranche de
   8,33 ms d'horloge réelle) et note ses traits ; l'hôte la rejoue à partir de
   cette seule liste et retrouve le même état, au bit près.
   ⚠️ LE JOURNAL EST STRICTEMENT CROISSANT ET BORNÉ. Un journal désordonné ou
   trop long n'est pas une erreur à signaler : c'est une entrée réseau, donc on
   la NORMALISE avant de s'en servir (les traits en trop sont ignorés). Un
   résolveur qui lève sur une donnée du réseau est un résolveur qu'un client
   fautif peut arrêter.
   ⚠️ MARTELER N'EST PAS UNE TRICHE, C'EST UNE DÉFAITE : chaque trait posé
   pendant que Tristan tire coince la lame. Il n'y a donc rien à borner en
   cadence — la mécanique se défend toute seule, ce qui vaut toujours mieux
   qu'un garde-fou qu'on peut oublier de mettre à jour.
   ═══════════════════════════════════════════════════════════════════════════ */
export function sawNormalizeLog(log) {
  if (!Array.isArray(log)) return [];
  const out = [];
  let prev = -1;
  for (const raw of log) {
    const t = raw | 0;
    if (!(t > prev) || t < 0) continue;
    prev = t;
    out.push(t);
    if (out.length >= C.SAW_LOG_MAX) break;
  }
  return out;
}
export function sawRun(log, ctx) {
  const s = sawInit(ctx);
  const L = sawNormalizeLog(log);
  /* ⚠️ AUCUNE BORNE ICI : elle est dans `sawTick` (`SAW_MAX_TICKS`), donc la
     boucle se termine forcément, et elle se termine au MÊME pas que celle du
     client. Une seconde borne posée ici serait très exactement le défaut que la
     première a coûté. */
  let i = 0;
  while (!s.over) {
    while (i < L.length && L[i] <= s.tick) { sawPull(s, 1); i++; }
    sawTick(s);
  }
  return s;
}
