"""
=============================================================================
 tools/blender/rendre_teintes.py — LES PASSES DE TEINTURE DES MEUBLES (2026-10-22, lot 2d)
-----------------------------------------------------------------------------
 Usage (depuis la racine du dépôt) :
   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/rendre_teintes.py
 Écrit public/maison/teinte/<meuble>_<orientation>_<passe>.png : « a » (le tissu principal en blanc),
 « b » (l'accent en blanc, s'il y en a), « g » (le reflet seul). Le pourquoi : `meubles.py`, « LES PASSES DE
 TEINTURE ». Les passes tombent au pixel près sur le cadre du rendu ordinaire (même géométrie) — vérifié ici
 contre `maisonSprites.js` et par `verify-maison`. ⚠️ À RELANCER après tout changement d'un meuble teintable
 (`meubles.TEINTES`) dans `rendre_meubles.py` : sinon le jeu recolore une forme qui n'est plus la sienne.
=============================================================================
"""
import os, sys, json, traceback

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import studio, meubles  # noqa: E402

DEPOT = os.path.abspath(os.path.join(ICI, "..", ".."))
SORTIE = os.path.join(DEPOT, "public", "maison", "teinte")
MODULE = os.path.join(DEPOT, "components", "ferme", "maisonSprites.js")


def main():
    os.makedirs(SORTIE, exist_ok=True)
    with open(MODULE) as f:
        txt = f.read()
    base = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    erreurs = []
    for nom in meubles.TEINTES:
        try:
            meta = meubles.rendre_teinte(nom, getattr(meubles, nom), SORTIE, orients=tuple(base[nom].keys()))
            for o, passes in meta.items():
                for p, m in passes.items():
                    b = base[nom][o]
                    if (m["w"], m["h"], m["ax"], m["ay"]) != (b["w"], b["h"], b["ax"], b["ay"]):
                        erreurs.append(f"{nom}_{o}_{p} : cadre {m} ≠ {b}")
            print("✓", nom, ",".join(meta.keys()))
        except Exception:
            erreurs.append(nom)
            print("✗", nom, traceback.format_exc())
    for e in erreurs:
        print("✗", e)
    if erreurs:
        sys.exit(1)


main()
