/* =============================================================================
   models.js — LES ACCESSOIRES MODÉLISÉS (zip 422).
   -----------------------------------------------------------------------------
   Charge les .glb de `models/`, produits par Blender
   (outputs/candyluge_blender/candyluge_props.py, script conservé hors dépôt) et
   les met à disposition de world.js sous forme de GABARITS à cloner.

   ══════════════════════════════════════════════════════════════════════════════
   ⚠️⚠️ LES TROIS RÈGLES DE CE FICHIER, ET AUCUNE N'EST NÉGOCIABLE.
   ══════════════════════════════════════════════════════════════════════════════

   1. AUCUNE COULEUR NE VIENT DU .glb. Les fichiers sont exportés SANS matériaux
      (`export_materials='NONE'`). Chaque maillage y porte un nom `part_<clé>`,
      où <clé> est une clé de `mat` dans world.js, et c'est `bind()` qui
      rebranche les matériaux du jeu. Conséquence pratique : on change la teinte
      d'un sapin de gomme en éditant un nombre de config.js, exactement comme
      avant, sans rouvrir Blender ni régénérer un binaire.
      ⚠️ C'est la conséquence directe de la sensibilité aux palettes du projet
      (zips 405-408). Un fichier binaire qui déciderait d'une couleur serait un
      endroit où une teinte peut dériver SANS que personne puisse la relire.

   2. LE JEU DOIT TOURNER SANS EUX. `Models.ready` reste faux tant que le
      chargement n'a pas abouti — et s'il échoue, il reste faux pour toujours.
      world.js teste ce drapeau et retombe sur ses primitives du 416. Un décor
      un peu moins beau vaut infiniment mieux qu'une descente vide : cette page
      est servie dans une iframe par-dessus la ferme, et un accroc réseau ne
      doit pas transformer le mini-jeu en champ de neige nu.

   3. UN GABARIT, DES CLONES. Le .glb est parsé UNE fois ; chaque sucette est un
      `clone()` qui PARTAGE la géométrie. C'est la règle 2 de world.js (« tout
      est mutualisé ») : une descente pose plusieurs centaines d'accessoires, et
      dupliquer les sommets à chaque fois remplirait la mémoire vidéo en trois
      minutes.

   ══════════════════════════════════════════════════════════════════════════════
   ⚠️ POURQUOI LE CHARGEMENT EST ASYNCHRONE ET POURQUOI CE N'EST PAS UN PROBLÈME.
   ──────────────────────────────────────────────────────────────────────────────
   `THREE.GLTFLoader` est asynchrone, et `World.buildNode()` ne l'est pas : il
   construit un tronçon quand la luge s'en approche, tout de suite. Trois
   solutions étaient possibles, et le choix mérite d'être écrit :

     * une requête SYNCHRONE (XHR async=false) — elle gèle le fil principal et
       les navigateurs l'ont mise en voie d'extinction. Écarté ;
     * embarquer les modèles en base64 dans un .js — la page reste hors ligne,
       mais `GLTFLoader.parse()` reste asynchrone même sur un tampon déjà en
       mémoire, donc ça ne résout RIEN et ajoute 33 % de poids. Écarté ;
     * charger en tâche de fond, se rabattre sur les primitives en attendant, et
       RECONSTRUIRE les tronçons déjà bâtis quand les modèles arrivent.

   C'est la troisième, et elle est la bonne pour une raison de calendrier plus
   que de technique : au chargement de la page, le joueur voit un ÉCRAN-TITRE.
   Les modèles (300 Ko en tout, servis en même origine) sont là bien avant qu'il
   n'appuie sur « départ », donc aucun tronçon n'a encore été construit et il
   n'y a rien à reconstruire. Le rappel `onReady` n'existe que pour le cas
   tordu — connexion lente, ou preview qui recommence — et il coûte une ligne.
   ============================================================================= */

const Models = (function () {
  const PATH = "models/";

  /* La liste. ⚠️ Le nom du fichier EST la clé d'appel dans world.js : ajouter un
     accessoire, c'est ajouter une ligne ici et un cas dans le menu de
     `buildNode`. Rien d'autre à câbler. */
  const FILES = ["lollipop", "gumtree", "marshmallow", "peppermint", "macaron",
                 "candycane", "sugarcluster", "bear", "gingerhouse", "sled"];

  const tpl = {};            // nom → THREE.Group gabarit
  let pending = 0;
  let failed = 0;
  const waiting = [];
  const api = { ready: false, tris: 0 };

  /* ⚠️ LE NOM DU MAILLAGE PORTE PARFOIS UN SUFFIXE `.001`. Blender renomme
     automatiquement toute donnée dont le nom existe déjà — et comme les dix
     accessoires sont exportés à la suite depuis la même session, `part_candy`
     devient `part_candy.007` au septième. Ne pas retirer ce suffixe donnerait
     un objet SANS matériau assigné, c'est-à-dire blanc, et seulement pour
     certains accessoires : le genre de défaut qu'on met une heure à relier à
     son origine. */
  function keyOf(name) {
    const m = /^part_([A-Za-z0-9]+)/.exec(name || "");
    return m ? m[1] : null;
  }

  /* La correspondance nom de pièce → matériau du jeu. Les clés qui n'existent
     pas dans `mat` sont redirigées ici plutôt que dans Blender : c'est du
     rebranchement, ça n'a rien à faire dans un binaire. */
  const ALIAS = {
    icing2: "icing",     // les encadrements de fenêtre
    head: "skin",        // la tête prend la peau, qui vient de la ferme
    /* ⚠️ SANS CETTE LIGNE, LA CHEVELURE LONGUE SORT EN BLANC — et seulement
       pour les personnages féminins, c'est-à-dire une fois sur deux et jamais
       chez celui qui teste. `mat.hairlong` n'existe pas : les cheveux longs
       sont les mêmes cheveux, dans une autre forme. */
    hairlong: "hair",
  };

  /* ⚠️ `hue` N'EST PAS UN DÉTAIL : c'est ce qui rend six sucettes différentes à
     partir d'un seul fichier. Les pièces `part_candy` reçoivent une teinte de
     la palette tirée du hasard STABLE du tronçon (voir `hash` dans world.js),
     et les pièces lointaines la palette assombrie du 414. Sans ce paramètre, la
     forêt entière serait rose. */
  function bind(root, mats, hue, far) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const k0 = keyOf(o.name);
      const k = ALIAS[k0] || k0;
      if (!k) return;
      if (k === "candy") {
        const pal = far ? mats.candyFar : mats.candy;
        o.material = pal[hue % pal.length];
      } else if (k === "trunk" && far) {
        o.material = mats.trunkFar;
      } else if (mats[k]) {
        o.material = mats[k];
      }
      /* Les modèles sont lissés : les normales viennent du fichier et il ne
         faut SURTOUT pas les recalculer. Un `computeVertexNormals()` ici
         referait des normales par face et annulerait tout le lissage — les
         galbes redeviendraient des polyèdres, et on conclurait que Blender
         n'apporte rien. */
    });
    return root;
  }

  function load() {
    if (!window.THREE || !THREE.GLTFLoader) { failed = FILES.length; return; }
    const loader = new THREE.GLTFLoader();
    pending = FILES.length;
    for (const name of FILES) {
      loader.load(PATH + name + ".glb", (gltf) => {
        const g = gltf.scene;
        g.traverse((o) => {
          if (o.isMesh && o.geometry) {
            api.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
          }
        });
        tpl[name] = g;
        if (--pending === 0) done();
      }, undefined, () => {
        failed++;
        console.warn("[candyluge] modèle absent : " + name + ".glb — repli sur les primitives");
        if (--pending === 0) done();
      });
    }
  }

  function done() {
    // ⚠️ TOUT OU RIEN. Un décor moitié modelé moitié primitif serait pire que
    // l'un ou l'autre : deux niveaux de finition côte à côte se remarquent
    // beaucoup plus qu'un niveau bas homogène.
    api.ready = failed === 0 && FILES.every((f) => tpl[f]);
    for (const cb of waiting.splice(0)) { try { cb(); } catch (e) { console.warn(e); } }
  }

  return {
    load,
    get ready() { return api.ready; },
    get triangles() { return api.tris | 0; },
    onReady(cb) { if (api.ready) cb(); else waiting.push(cb); },
    /* Un clone posé, orienté, mis à l'échelle et rebranché sur les matériaux du
       jeu. Rend `null` si le modèle n'est pas là — l'appelant retombe alors sur
       sa primitive, et c'est le seul contrat de ce fichier. */
    place(name, mats, x, y, z, scale, yaw, hue, far) {
      const t = tpl[name];
      if (!t) return null;
      const o = t.clone(true);
      o.position.set(x, y, z);
      o.scale.setScalar(scale);
      o.rotation.y = yaw || 0;
      return bind(o, mats, hue | 0, !!far);
    },
    /* ═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ ZIP 424 — L'ÉCHELLE D'UN ACCESSOIRE SE DÉRIVE, ELLE NE SE RÈGLE PAS.
       ───────────────────────────────────────────────────────────────────────
       C'est la leçon la plus coûteuse du projet (CLAUDE.md §7) appliquée ici :
       « un paramètre de l'outil qui DOUBLE un paramètre du jeu est une
       divergence en attente ». Le 422 posait des diviseurs à la main —
       `h / 3.6` pour le sapin de gomme — en supposant la hauteur du gabarit.
       Le gabarit fait 1,2 unité, pas 3,6 : le sapin sortait donc à h/3 là où
       la primitive qu'il remplace fait 1,16·h, soit TROIS FOIS ET DEMIE trop
       petit. Et comme les modèles n'étaient de toute façon jamais chargés
       (voir hasModels() dans world.js), personne ne l'a jamais vu.

       `fit` mesure le gabarit et rend l'échelle qui lui donne exactement la
       hauteur demandée. L'appelant écrit alors une hauteur de JEU — la même
       grandeur que celle de sa primitive de repli — et les deux ne peuvent
       plus diverger.

       ⚠️ RENVOIE 1 SI LE GABARIT MANQUE, sans jamais lever : `place()` rendra
       `null` juste après et l'appelant retombera sur sa primitive. Une
       exception ici casserait précisément le repli que ce fichier existe pour
       garantir (règle 2). */
    fit(name, targetHeight) {
      const t = tpl[name];
      if (!t) return 1;
      if (t.userData.__h === undefined) {
        const b = new THREE.Box3().setFromObject(t);
        t.userData.__h = Math.max(1e-4, b.max.y - b.min.y);
      }
      return targetHeight / t.userData.__h;
    },
    /* Le gabarit brut, pour la luge : world.js l'assemble dans sa propre
       hiérarchie de pivots (voir SLED_PIVOT) et ne peut pas se contenter d'un
       objet posé. */
    raw(name, mats) {
      const t = tpl[name];
      if (!t) return null;
      return bind(t.clone(true), mats, 0, false);
    },
  };
})();
