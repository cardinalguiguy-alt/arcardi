/* =============================================================================
   verify-textures.mjs — LA PIERRE A-T-ELLE DE LA MATIÈRE ? (zip 397)
   -----------------------------------------------------------------------------
   Guillaume, au 397 : « beaucoup trop d'amateurisme dans les textures des murs
   et du sol ». Le mot juste est « amateurisme », et il désignait quatre choses
   parfaitement mesurables — c'est ce qu'on a découvert en écrivant enfin le
   rasteriseur et en REGARDANT les PNG du 396 :

     1. DOUZE niveaux de gris pour tout un mur. Chaque bloc était un aplat ;
     2. une COUTURE de 10,6 entre les bords : on lisait la grille de répétition ;
     3. une seule taille de bloc, un seul joint, une seule épaisseur ;
     4. aucune usure.

   Trois de ces quatre défauts SE CHIFFRENT, et c'est tout l'objet de ce script.

   ⚠️ CE QU'IL NE PROUVE PAS, ET IL FAUT LE DIRE AUSSI CLAIREMENT QUE POUR LES
   AUTRES : il ne dit pas qu'une texture est BELLE. Une texture peut avoir
   soixante niveaux, aucune couture, un fort écart-type, et être laide. Il dit
   qu'elle n'est pas PLATE, pas RÉPÉTITIVE et pas MONOCHROME — trois choses
   qu'on ne peut pas rattraper à l'éclairage, et trois choses qu'on avait
   livrées quatre zips de suite sans s'en apercevoir.

   La beauté, elle, se regarde : `node tools/render-textures.mjs`, puis on ouvre
   les PNG. Ce script est le garde-fou, pas le juge.
   ========================================================================== */

import { load } from "./lib-play.mjs";
import { surface, stats, seam } from "./lib-raster.mjs";

const { CFG, Paint } = load(["js/config.js", "js/paint.js"]);

let fails = 0;
const ok = (n, c, x) => { console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  " + x : ""}`); if (!c) fails++; };

function make(w, h, f) {
  const s = surface(w, h);
  f(s.ctx, w, h);
  return s;
}

console.log("\n=== les textures ont-elles de la matière ? (zip 397) ===\n");

/* --------------------------------------------------------------------------
   LES SEUILS, ET D'OÙ ILS VIENNENT.
   --------------------------------------------------------------------------
   ⚠️ RÈGLE DU ZIP 379 : « tout contrôle qui s'applique à de l'art préexistant
   doit comparer à l'état d'avant, jamais à un idéal ». Les trois seuils ci-
   dessous sont donc calés sur les MESURES du 396, avec une marge :

     niveaux  — le mur du 396 en avait 12, le sol 8. On exige 60 : c'est très
                au-dessus de l'ancien et très en dessous des 122 obtenus, donc
                le contrôle ne casse pas au premier réglage de teinte ;
     écart    — le 396 était déjà correct (41 et 32), mais uniquement parce que
                ses aplats étaient très contrastés entre eux. On garde un
                plancher bas (14) : ce n'est pas ce défaut-là qu'on surveille ;
     couture  — le 396 était à 10,6 en x. On exige moins de 7. C'est le seul
                seuil qui soit une vraie exigence neuve, et c'est la couche
                « bruit périodique » qui la tient.
   ------------------------------------------------------------------------ */
const MIN_LEVELS = 60, MIN_SD = 14, MAX_SEAM = 7;

for (const [nom, seed] of [["mur A", 1], ["mur B", 7]]) {
  const W = CFG.TEX_WALL;
  const s = make(W, W, (c, w, h) => Paint.wall(c, CFG, w, h, seed));
  const st = stats(s.px, W, W), sm = seam(s.px, W, W);
  ok(`${nom} : plus de ${MIN_LEVELS} niveaux de gris (le 396 en avait 12)`,
    st.distinct >= MIN_LEVELS, `${st.distinct} niveaux`);
  ok(`${nom} : la matière n'est pas plate`, st.sd >= MIN_SD, `écart-type ${st.sd.toFixed(1)}`);
  /* ⚠️ ON NE CONTRÔLE QUE LA COUTURE HORIZONTALE, ET C'EST CE CONTRÔLE-CI QUI
     A FAIT TROUVER POURQUOI. Un mur ne répète sa tuile QUE latéralement
     (world.js/stoneMat : repeat.set(rx, 1)) : la texture porte une suie en
     haut et une mousse en bas qui décrivent le haut et le bas D'UN MUR, pas
     d'une tuile. La répéter verticalement mettrait une bande de suie au milieu
     de la maçonnerie.

     La première version de ce script exigeait les deux coutures sous 7. Il
     échouait en y (7,1) — et il avait raison de le signaler : l'asymétrie
     qu'il mesurait était le SYMPTÔME d'un gradient vertical intentionnel qu'on
     n'avait pas fini de penser côté rendu. Le chiffre a trouvé la faute ; la
     correction était dans world.js, pas ici. */
  ok(`${nom} : la répétition latérale ne se voit pas (couture < ${MAX_SEAM})`,
    sm.x < MAX_SEAM, `x ${sm.x.toFixed(1)}  (y ${sm.y.toFixed(1)} : non répété, voir stoneMat)`);
}
{
  const W = CFG.TEX_FLOOR;
  const s = make(W, W, (c, w, h) => Paint.floor(c, CFG, w, h, 3));
  const st = stats(s.px, W, W), sm = seam(s.px, W, W);
  ok(`sol : plus de ${MIN_LEVELS} niveaux de gris (le 396 en avait 8)`,
    st.distinct >= MIN_LEVELS, `${st.distinct} niveaux`);
  ok("sol : la matière n'est pas plate", st.sd >= MIN_SD, `écart-type ${st.sd.toFixed(1)}`);
  ok(`sol : la répétition ne se voit pas (couture < ${MAX_SEAM})`,
    sm.x < MAX_SEAM && sm.y < MAX_SEAM, `x ${sm.x.toFixed(1)} / y ${sm.y.toFixed(1)}`);
  /* LE SOL DOIT RESTER PLUS SOMBRE QUE LE MUR. Il reçoit la lumière des
     torches de biais ; un sol aussi clair qu'un mur écrase la perspective et
     le couloir perd sa profondeur. C'est écrit dans paint.js comme une
     intention — ici on le mesure, parce qu'une intention écrite en commentaire
     se perd au premier réglage de teinte. */
  const w2 = make(CFG.TEX_WALL, CFG.TEX_WALL, (c, w, h) => Paint.wall(c, CFG, w, h, 1));
  const sw = stats(w2.px, CFG.TEX_WALL, CFG.TEX_WALL);
  ok("le sol reste plus sombre que le mur (la perspective en dépend)",
    st.mean < sw.mean - 3, `sol ${st.mean.toFixed(1)} vs mur ${sw.mean.toFixed(1)}`);
}

/* --------------------------------------------------------------------------
   LE CHAMP DE HAUTEUR. Deux questions, et la seconde est la seule qui compte
   vraiment : le relief décrit-il LA MÊME PIERRE que la couleur ?
   ------------------------------------------------------------------------ */
{
  const W = CFG.TEX_WALL;
  const b = make(W, W, (c, w, h) => Paint.wallBump(c, CFG, w, h, 1));
  const sb = stats(b.px, W, W);
  ok("le relief du mur a de l'amplitude", sb.sd >= 12, `écart-type ${sb.sd.toFixed(1)}`);
  ok("... et il est bien en niveaux de gris", (() => {
    for (let i = 0; i < W * W * 4; i += 4)
      if (b.px[i] !== b.px[i + 1] || b.px[i + 1] !== b.px[i + 2]) return false;
    return true;
  })());

  /* ⚠️ LE CONTRÔLE LE PLUS UTILE DU FICHIER. Le mortier doit être PLUS BAS que
     la pierre — c'est ce qui fait que la torche creuse les joints en passant.
     Si quelqu'un inverse un jour le champ de hauteur (une soustraction au lieu
     d'une addition, un `1 - h` ajouté par confort), la texture continuera de
     s'afficher, le relief continuera d'exister, et le mur aura des joints EN
     RELIEF — un mur de carrelage neuf. Personne ne le verrait en relisant, et
     à l'écran on mettrait longtemps à nommer ce qui cloche.

     On repère le mortier par sa COULEUR (c'est la teinte la plus sombre de la
     texture d'albédo) et on compare les hauteurs moyennes des deux moitiés. */
  const a = make(W, W, (c, w, h) => Paint.wall(c, CFG, w, h, 1));
  let lumSum = 0, n = 0;
  for (let i = 0; i < W * W * 4; i += 4) { lumSum += 0.299 * a.px[i] + 0.587 * a.px[i + 1] + 0.114 * a.px[i + 2]; n++; }
  const mean = lumSum / n;
  let hDark = 0, nDark = 0, hLight = 0, nLight = 0;
  for (let i = 0; i < W * W * 4; i += 4) {
    const l = 0.299 * a.px[i] + 0.587 * a.px[i + 1] + 0.114 * a.px[i + 2];
    if (l < mean * 0.62) { hDark += b.px[i]; nDark++; }
    else if (l > mean * 1.15) { hLight += b.px[i]; nLight++; }
  }
  const dm = nDark ? hDark / nDark : 0, lm = nLight ? hLight / nLight : 0;
  ok("le mortier est CREUX, pas en relief (sinon : mur de carrelage neuf)",
    nDark > 500 && dm < lm - 20, `joint ${dm.toFixed(0)} vs pierre ${lm.toFixed(0)} sur 255`);
}

/* --------------------------------------------------------------------------
   LE COÛT. Une texture magnifique qui met quatre secondes à naître transforme
   la page de lancement en panne — et la page de lancement est justement ce que
   Guillaume a fait réparer au 396. On mesure donc, on ne suppose pas.
   ------------------------------------------------------------------------ */
{
  const W = CFG.TEX_WALL;
  const t0 = Date.now();
  make(W, W, (c, w, h) => Paint.wall(c, CFG, w, h, 99));      // graine neuve : pas de cache
  const dt = Date.now() - t0;
  /* 900 ms de plafond pour UNE texture, sur la machine de développement. La
     scène en construit quatre (deux murs + un sol + les reliefs, ces derniers
     partageant le champ déjà calculé), soit ~0,7 s au total, derrière l'écran
     de chargement du 396. La première écriture du 397 mettait 4 000 ms par
     texture : seize secondes de chargement, c'est-à-dire un jeu injouable par
     sa page de garde. Voir le commentaire de fieldFBM dans paint.js. */
  ok("une texture de mur naît en moins de 900 ms", dt < 900, `${dt} ms`);
}

/* La carte et la craie ont un FOND TRANSPARENT. Sans ça, la carte serait un
   rectangle beige plaqué sur la pierre et les marques de craie des carrés
   blancs — c'est-à-dire des autocollants, pas des traces. */
for (const [nom, w, h, f] of [
  ["la carte", 192, 144, (c, W2, H2) => Paint.mapSheet(c, CFG, W2, H2)],
  ["la craie", 64, 64, (c, W2, H2) => Paint.chalk(c, CFG, W2, H2, 0)],
]) {
  const s = make(w, h, f);
  let clear = 0;
  for (let i = 3; i < w * h * 4; i += 4) if (s.px[i] < 8) clear++;
  ok(`${nom} a bien un fond transparent`, clear > w * h * 0.10,
    `${((clear / (w * h)) * 100).toFixed(0)} % de pixels vides`);
}

console.log(fails ? `\n${fails} ÉCHEC(S)\n` : "\nToutes les textures ont de la matière.\n");
console.log(`⚠️ Ce script ne dit PAS si une texture est BELLE — il ne peut pas.
Il dit qu'elle n'est ni plate, ni répétitive, ni monochrome, que son relief
décrit la même pierre que sa couleur, et qu'elle ne coûte pas une page de
chargement. Pour le reste : node tools/render-textures.mjs, puis ON REGARDE.
C'est la leçon du 397 tout entière — quatre refontes graphiques avaient été
faites en aveugle, et les quatre avaient reçu le même reproche.\n`);
process.exit(fails ? 1 : 0);
