"""
=============================================================================
 tools/blender/rendre_meubles.py — REFAIRE TOUS LES SPRITES DE MEUBLES (2026-10-16)
-----------------------------------------------------------------------------
 Usage (depuis la racine du dépôt) :
   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/rendre_meubles.py
 Écrit public/maison/<meuble><variante>_<orientation>.png (servies au jeu) et
 components/ferme/maisonSprites.js — l'ancre et l'emprise de chaque image, un
 module GÉNÉRÉ que le jeu (`maison.js`, le rendu de la zone « home ») et les
 bancs (`render-maison`, `verify-maison`) importent. Ne pas l'éditer à la main :
 un ancrage corrigé là serait écrasé au prochain rendu.

 La liste ci-dessous est LA liste : un meuble qu'on ajoute ici est rendu, un
 meuble qu’on retire disparaît du prochain `maisonSprites.js`. Les variantes sont des
 paramètres de la fonction du meuble (tissu, bois, allumé…).
=============================================================================
"""
import os, sys, json, traceback

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import studio, meubles  # noqa: E402

DEPOT = os.path.abspath(os.path.join(ICI, "..", ".."))
SORTIE = os.path.join(DEPOT, "public", "maison")
MODULE = os.path.join(DEPOT, "components", "ferme", "maisonSprites.js")

TRAVAUX = [
    # (meuble, variante, orientations, paramètres)
    ("canape", "", ("S", "E", "N", "W"), {}),
    ("canape", "_canard", ("S", "E", "N", "W"), dict(tissu="canard", bois="noyer", coussins="rouille")),
    ("fauteuil", "", ("S", "E", "N", "W"), {}),
    ("fauteuil", "_vert", ("S", "E", "N", "W"), dict(cuir="vert")),
    ("table_basse", "", ("S", "E"), {}),
    ("tapis", "", ("S", "E"), {}),
    ("tapis", "_bleu", ("S", "E"), dict(fond="#2f4f66", motif="#c9973a")),
    ("bibliotheque", "", ("S", "E", "N", "W"), {}),
    ("lampadaire", "", ("S",), {}),
    ("lampadaire", "_allume", ("S",), dict(allume=True)),
    ("lampadaire", "_moutarde", ("S",), dict(abat="moutarde")),
    ("lampadaire", "_moutarde_allume", ("S",), dict(abat="moutarde", allume=True)),
    # 2026-10-21 (lot 2c) — le poêle ÉTEINT par défaut (il était rendu allumé : `meubles.poele` a `allume=True` par défaut), et son
    # feu à part : E l'allume, il brûle quatre heures de jeu (`maison.homeFireLevel`).
    ("poele", "", ("S", "E", "N", "W"), dict(allume=False)),
    ("poele", "_allume", ("S", "E", "N", "W"), dict(allume=True)),
    ("plante_morte", "", ("S",), {}),
    ("plante_verte", "", ("S",), {}),
    ("gueridon", "", ("S",), {}),
    ("gueridon", "_allume", ("S",), dict(allume=True)),
    ("portemanteau", "", ("S", "E"), {}),
    ("lit", "", ("S", "E", "N", "W"), {}),
    ("tableau", "", ("S",), {}),
    # La volée du plan de l'étroite (maison.js) : 2,70 m d'étage sur 2,5 cases (2,96 m), 15 marches.
    ("escalier", "", ("S",), dict(marches=15, larg=1.0, montee=2.7, giron=0.197)),
    # 2026-10-17 — les ÉQUIPEMENTS (viennent avec la maison : `fixes` du plan, `maison.homeFixes`).
    # Les radiateurs : trois longueurs, choisies sous chaque fenêtre de la façade selon la place.
    ("radiateur", "_8", ("S",), dict(elements=8)),
    ("radiateur", "_11", ("S",), dict(elements=11)),
    ("radiateur", "_14", ("S",), dict(elements=14)),
    ("cheminee", "", ("S",), {}),
    ("cheminee", "_allume", ("S",), dict(allume=True)),
    # La cuisine de l'étroite : 1,18 + 1,18 + 0,70 + 1,65 m le long du mur nord (4 cases du plan).
    ("plan_travail", "_118", ("S",), dict(larg=1.18, objets="pain")),
    ("plan_travail", "_165", ("S",), dict(larg=1.65, objets="fruits")),
    ("evier", "", ("S",), dict(larg=1.18)),
    ("cuisiniere", "", ("S",), {}),
    ("baignoire", "", ("S",), {}),
    ("lavabo", "", ("S",), {}),
    ("wc", "", ("S",), {}),
]


def main():
    os.makedirs(SORTIE, exist_ok=True)
    meta, erreurs = {}, []
    # 2026-10-21 — `RENDRE=poele,poele_allume` (variable d'environnement) : ne refaire que ces meubles-là, les autres gardent
    # leur image et leur ancre du dernier `maisonSprites.js` (tout refaire prend plusieurs minutes et réécrit des images
    # que personne n'a touchées).
    seuls = [x for x in os.environ.get("RENDRE", "").split(",") if x]
    if seuls:
        with open(MODULE) as f:
            txt = f.read()
        meta = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    for nom, var, ors, kw in TRAVAUX:
        if seuls and nom + var not in seuls:
            continue
        try:
            meta[nom + var] = meubles.rendre(nom, getattr(meubles, nom), SORTIE, orients=ors, suffixe=var, **kw)
            print("✓", nom + var, ",".join(ors))
        except Exception:
            erreurs.append(nom + var)
            print("✗", nom + var, traceback.format_exc())
    with open(MODULE, "w") as f:
        f.write("/* GÉNÉRÉ PAR tools/blender/rendre_meubles.py — NE PAS ÉDITER (2026-10-16).\n"
                "   Par meuble et variante, par orientation (S, E, N, W : le côté vers lequel regarde\n"
                "   la FACE du meuble) : la taille de l'image (w, h, px à studio.PX par case), son ANCRE (ax, ay :\n"
                "   le pixel du coin avant-gauche de l'emprise, au sol) et l'emprise tournée (fw, fd,\n"
                "   en mètres). L'image est servie en /maison/<meuble><variante>_<orientation>.png. */\n")
        f.write("export const MEUBLES = " + json.dumps(meta, indent=1, sort_keys=True) + ";\n")
    print(f"{len(meta)} meubles, {sum(len(v) for v in meta.values())} images, {len(erreurs)} erreur(s)")
    if erreurs:
        sys.exit(1)


main()
