"""
=============================================================================
 tools/blender/meubles.py — LES MEUBLES, UNE FONCTION CHACUN (2026-10-16)
-----------------------------------------------------------------------------
 Chaque meuble est construit en mètres, son EMPRISE posée sur [0, w] × [0, d]
 au sol (z = 0), sa FACE tournée vers −y (vers celui qui regarde). Le rendu
 et l'orientation sont dans `studio.py`. Les cotes sont celles du monde réel
 (un canapé trois places fait 2 m) : c'est le personnage, 1,70 m, qui juge
 (noyau §4, « une taille se lit contre ses voisines »).

 ⚠️ LES PETITES PIÈCES N'ONT PAS DE CONTOUR. À 32 px par case, un livre fait
 un pixel d'épaisseur : son contour d'un pixel le remplacerait. Le contour
 n'est posé que sur les volumes qui font au moins ~4 px.

 Chaque fonction rend (racine, w, d) ; `COLORIS` donne les variantes de tissu
 et de bois qu'un joueur pourra commander (Colette teint, Marcel tourne).

 ⚠️⚠️ 2026-10-17 — LA PROFONDEUR SE TRICHE. Dans la projection du jeu, la
 profondeur ET la hauteur montent toutes deux vers le haut de l'écran à pleine
 échelle (`studio.py`) : un meuble aussi profond que large s'y lit comme une
 boîte allongée. Guillaume, sur le fauteuil club de 86 × 86 cm (53 × 92 px) :
 « le fauteuil est trop profond par rapport à sa largeur ». Le dessinateur
 triche, comme pour les ronds (`cyl(aplat=0.7)`) : les SIÈGES et les CAISSONS
 sont dessinés à ~0,75-0,8 de leur profondeur réelle, leur largeur et leur
 hauteur restent vraies. À vérifier sur toute pièce neuve : profondeur ≤ 0,8 ×
 largeur pour ce qui se voit de face (le lit, long par nature, garde sa longueur).

 2026-10-17 — LES ÉQUIPEMENTS DE LA MAISON (radiateur, cheminée, cuisine,
 bains, poteau de charpente) sont rendus ici comme les meubles, mais ils
 viennent AVEC la maison (`maison.js`, `fixes` du plan) : ni catalogue ni
 garde-meuble, ils ne se déplacent pas.
=============================================================================
"""
import math, random
import bpy
from mathutils import Vector
import studio as S
from studio import box, cyl, tube, mat, root, ellipsoide


# ─── les couleurs (sRGB, comme les façades) ──────────────────────────────
BOIS = {
    "chene":  ("#b07a43", "#8a5a2e"),
    "noyer":  ("#6e4529", "#553219"),
    "blanc":  ("#e8e0cf", "#cfc4ad"),   # bois peint, style campagne
}
TISSU = {
    "sauge":     "#7f9c70",
    "moutarde":  "#c9973a",
    "canard":    "#2f7078",
    "rouille":   "#b4582f",
    "lin":       "#ddd2bb",
    "prune":     "#7a3f5c",
}


# ─── textures ────────────────────────────────────────────────────────────
def _obj_coords(nodes, links):
    tc = nodes.new('ShaderNodeTexCoord')
    return tc.outputs['Object']


def tex_veinage(clair, fonce, fil='X'):
    """Le fil du bois : de FINS traits sombres qui courent dans le sens du fil.
    ⚠️ 2026-10-16 : une onde très déformée (4) faisait des taches, pas des
    fils. Les bandes varient PERPENDICULAIREMENT au fil — un fil le long de X
    se fait avec des bandes « Y »."""
    perp = {'X': 'Y', 'Y': 'X', 'Z': 'X'}[fil]
    def f(nodes, links):
        w = nodes.new('ShaderNodeTexWave')
        w.wave_type = 'BANDS'; w.bands_direction = perp
        w.inputs['Scale'].default_value = 14.0
        w.inputs['Distortion'].default_value = 1.2
        w.inputs['Detail'].default_value = 1.0
        w.inputs['Detail Scale'].default_value = 0.6
        links.new(_obj_coords(nodes, links), w.inputs['Vector'])
        r = nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
        e = r.color_ramp.elements
        e[0].position = 0.0; e[0].color = (*S.hexrgb(clair), 1)
        e[1].position = 0.86; e[1].color = (*S.hexrgb(fonce), 1)
        links.new(w.outputs['Fac'], r.inputs['Fac'])
        return r.outputs['Color']
    return f


def tex_rayures(a, b, echelle=10.0, axe='X', part=0.5):
    def f(nodes, links):
        w = nodes.new('ShaderNodeTexWave')
        w.wave_type = 'BANDS'; w.bands_direction = axe
        w.wave_profile = 'SAW'
        w.inputs['Scale'].default_value = echelle
        w.inputs['Distortion'].default_value = 0.0
        links.new(_obj_coords(nodes, links), w.inputs['Vector'])
        r = nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
        e = r.color_ramp.elements
        e[0].position = 0.0; e[0].color = (*S.hexrgb(a), 1)
        e[1].position = part; e[1].color = (*S.hexrgb(b), 1)
        links.new(w.outputs['Fac'], r.inputs['Fac'])
        return r.outputs['Color']
    return f


def _bois(nom, essence, fil='X'):
    c, f = BOIS[essence]
    return mat(f"bois_{nom}_{essence}_{fil}", c, lustre=0.12, tex=tex_veinage(c, f, fil=fil))


# ─── 1. LE CANAPÉ TROIS PLACES ───────────────────────────────────────────
def canape(tissu="sauge", bois="noyer", coussins="moutarde"):
    """2,00 × 0,82 m, assise à 45 cm, dossier à 84 cm. Bras roulés, trois
    coussins d'assise et trois de dossier, deux coussins jetés aux bouts,
    pieds fuselés. (2026-10-17 : 0,90 de profondeur au premier jet — la
    profondeur se triche, voir l'en-tête.)"""
    W, D = 2.00, 0.82
    r = root("canape")
    T = mat(f"tissu_{tissu}", TISSU[tissu], lustre=0.08)
    Tc = mat(f"tissu_{coussins}", TISSU[coussins], lustre=0.05)
    Bw = _bois("pied", bois, fil='Z')
    for (x, y) in ((0.09, 0.09), (W - 0.09, 0.09), (0.09, D - 0.09), (W - 0.09, D - 0.09)):
        cyl("pied", x, y, 0.0, 0.022, 0.13, Bw, r, verts=10, r_top=0.03, outline=False)
    box("caisse", 0.02, 0.04, 0.12, W - 0.04, D - 0.06, 0.27, T, r, bevel=0.03)
    for x0 in (0.0, W - 0.20):
        box("bras", x0, 0.02, 0.12, 0.20, D - 0.02, 0.50, T, r, bevel=0.085, seg=4)
    box("dossier", 0.14, D - 0.22, 0.36, W - 0.28, 0.22, 0.48, T, r, bevel=0.06, seg=3)
    n = 3
    lw = (W - 0.40) / n
    for i in range(n):
        x0 = 0.20 + i * lw
        box(f"assise{i}", x0 + 0.004, 0.05, 0.38, lw - 0.008, D - 0.27, 0.13, T, r, bevel=0.05, seg=3)
        c = box(f"dos{i}", x0 + 0.006, D - 0.36, 0.48, lw - 0.012, 0.16, 0.34, T, r, bevel=0.07, seg=3)
        c.rotation_euler = (math.radians(-9), 0, 0)
    for (x0, rz) in ((0.22, 10), (W - 0.62, -8)):
        c = box("jete", x0, D - 0.42, 0.50, 0.40, 0.13, 0.36, Tc, r, bevel=0.08, seg=3)
        c.rotation_euler = (math.radians(-14), math.radians(rz * 0.4), math.radians(rz))
    # 2026-10-17 (64 px, « meubles trop grossiers ») : le passepoil au bord des coussins
    # d'assise, deux capitons par coussin de dossier, la couture des bras, un plaid
    # jeté sur le bras droit.
    Pp = _m(f"passepoil_{tissu}", _assombrir(TISSU[tissu], 0.72))
    for i in range(n):
        x0 = 0.20 + i * lw
        box(f"passepoil{i}", x0 + 0.02, 0.045, 0.505, lw - 0.04, 0.012, 0.012, Pp, r, outline=False)
        for k in (0.33, 0.67):
            ellipsoide(f"capiton{i}{k}", x0 + lw * k, D - 0.32, 0.70, 0.016, 0.01, 0.016, Pp, r, seg=8)
    for x0 in (0.02, W - 0.04):
        box("couture_bras", x0, 0.015, 0.60, 0.02, 0.01, 0.012, Pp, r, outline=False)
    Pl = mat("plaid_canape", "#e3d6b8", tex=tex_rayures("#e3d6b8", "#7a3f2c", echelle=12.0, axe='Y', part=0.75))
    box("plaid_bras", W - 0.21, 0.10, 0.60, 0.22, D - 0.30, 0.04, Pl, r, bevel=0.015)
    box("plaid_pan", W - 0.03, 0.10, 0.30, 0.04, D - 0.30, 0.31, Pl, r, bevel=0.01, outline=False)
    return r, W, D

# ─── matières communes ───────────────────────────────────────────────────
def lumineux(nom, couleur, force=1.0):
    """Ce qui ÉCLAIRE (abat-jour allumé, braise) n'a pas de palier d'ombre :
    une émission franche, que la nuit du jeu laissera intacte."""
    m = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*S.hexrgb(couleur), 1)
    em.inputs['Strength'].default_value = force
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def _assombrir(h, k):
    h = h.lstrip('#')
    return "#" + "".join(f"{max(0, min(255, round(int(h[i:i + 2], 16) * k))):02x}" for i in (0, 2, 4))


def _m(nom, couleur, lustre=0.0):
    return mat(nom, couleur, lustre=lustre)


CUIR = {"cognac": "#8d4a25", "chocolat": "#5a3322", "bordeaux": "#6e2a2a", "vert": "#2f4f3a"}
METAL = {"laiton": ("#c9a24a", 0.8), "fonte": ("#34302e", 0.35), "chrome": ("#c8ccd0", 0.9), "noir": ("#2a2827", 0.3)}


# ─── 2. LE FAUTEUIL CLUB ─────────────────────────────────────────────────
def fauteuil(cuir="cognac", bois="noyer"):
    """0,92 × 0,70 m, cuir ciré (lustre), bras ronds, clous de laiton le long
    des bras — un pixel chacun, sans contour. ⚠️ 2026-10-17 : 0,86 × 0,86 au
    premier jet, « trop profond par rapport à sa largeur » (la profondeur se
    triche, voir l'en-tête)."""
    W, D = 0.92, 0.70
    r = root("fauteuil")
    Cu = _m(f"cuir_{cuir}", CUIR[cuir], lustre=0.55)
    Bw = _bois("pied", bois, fil='Z')
    La = _m("laiton", *METAL["laiton"])
    for (x, y) in ((0.08, 0.08), (W - 0.08, 0.08), (0.08, D - 0.08), (W - 0.08, D - 0.08)):
        cyl("pied", x, y, 0.0, 0.03, 0.08, Bw, r, verts=10, outline=False)
    box("caisse", 0.03, 0.04, 0.08, W - 0.06, D - 0.06, 0.30, Cu, r, bevel=0.05, seg=3)
    for x0 in (0.0, W - 0.18):
        box("bras", x0, 0.02, 0.08, 0.18, D - 0.02, 0.55, Cu, r, bevel=0.09, seg=5)
        for k in range(7):   # les clous, sur la face avant du bras
            box("clou", x0 + 0.03 + k * 0.02, 0.012, 0.13, 0.012, 0.01, 0.012, La, r, outline=False)
    box("dossier", 0.10, D - 0.22, 0.30, W - 0.20, 0.22, 0.52, Cu, r, bevel=0.09, seg=4)
    box("assise", 0.18, 0.05, 0.36, W - 0.36, D - 0.25, 0.13, Cu, r, bevel=0.05, seg=3)
    c = box("coussin_dos", 0.19, D - 0.34, 0.46, W - 0.38, 0.14, 0.30, Cu, r, bevel=0.06, seg=3)
    c.rotation_euler = (math.radians(-10), 0, 0)
    # 2026-10-17 (64 px) : le CAPITONNAGE du dos (des boutons en quinconce, cuir plus sombre),
    # le passepoil du bord de l'assise, un coussin de laine posé de biais.
    Cf = _m(f"cuir_{cuir}_fonce", _assombrir(CUIR[cuir], 0.62))
    for j, z in enumerate((0.58, 0.68)):
        for k in range(3 - j):
            x = 0.27 + (k + 0.5 * j) * (W - 0.54) / 2
            ellipsoide("bouton", x, D - 0.36 + j * 0.02, z, 0.014, 0.01, 0.014, Cf, r, seg=8)
    box("passepoil", 0.19, 0.045, 0.49, W - 0.38, 0.01, 0.012, Cf, r, outline=False)
    Co = mat("coussin_laine", TISSU["moutarde"], tex=tex_rayures(TISSU["moutarde"], "#e3d6b8", echelle=16.0, axe='X', part=0.8))
    k = box("coussin", 0.24, D - 0.40, 0.48, 0.30, 0.10, 0.26, Co, r, bevel=0.06, seg=3)
    k.rotation_euler = (math.radians(-16), 0, math.radians(8))
    return r, W, D


# ─── 3. LA TABLE BASSE ───────────────────────────────────────────────────
def table_basse(bois="chene"):
    """1,10 × 0,60 × 0,42 m, plateau et tablette basse. Dessus : deux livres,
    une tasse, une bougie ; dessous : des magazines."""
    W, D = 1.10, 0.60
    r = root("table_basse")
    Bw = _bois("table", bois, fil='X')
    box("plateau", 0.0, 0.0, 0.38, W, D, 0.04, Bw, r, bevel=0.012, seg=2)
    box("ceinture", 0.05, 0.05, 0.31, W - 0.10, D - 0.10, 0.07, Bw, r)
    for (x, y) in ((0.04, 0.04), (W - 0.09, 0.04), (0.04, D - 0.09), (W - 0.09, D - 0.09)):
        box("pied", x, y, 0.0, 0.05, 0.05, 0.38, Bw, r)
    box("tablette", 0.09, 0.09, 0.08, W - 0.18, D - 0.18, 0.025, Bw, r)
    for i, (c, h) in enumerate((("#a33a2c", 0.012), ("#e3d6b8", 0.010), ("#2d5566", 0.012))):
        box(f"mag{i}", 0.20 + i * 0.03, 0.16 + i * 0.02, 0.105 + i * 0.012, 0.30, 0.22, h, _m(f"papier{i}", c), r, outline=False)
    box("livre1", 0.12, 0.14, 0.42, 0.26, 0.19, 0.035, _m("couv_rouge", "#8e2f2a"), r, outline=False)
    b2 = box("livre2", 0.15, 0.15, 0.455, 0.22, 0.16, 0.03, _m("couv_bleu", "#2c4a6e"), r, outline=False)
    b2.rotation_euler = (0, 0, math.radians(8))
    cyl("tasse", 0.78, 0.30, 0.42, 0.045, 0.09, _m("faience", "#efe8da", 0.3), r, verts=14, outline=False)
    cyl("cafe", 0.78, 0.30, 0.505, 0.036, 0.005, _m("cafe", "#3b2416"), r, verts=14, outline=False)
    box("anse", 0.82, 0.29, 0.44, 0.03, 0.02, 0.05, _m("faience", "#efe8da", 0.3), r, outline=False)
    cyl("bougie", 0.95, 0.42, 0.42, 0.035, 0.10, _m("cire", "#f2ead2"), r, verts=12, outline=False)
    # 2026-10-17 (64 px) : le tiroir de la ceinture et son bouton, un soliflore et ses fleurs des champs.
    box("tiroir", 0.35, 0.04, 0.32, 0.40, 0.012, 0.05, _bois("tiroir", bois, fil='X'), r, outline=False)
    ellipsoide("bouton_tiroir", 0.55, 0.035, 0.345, 0.012, 0.008, 0.012, _m("laiton", *METAL["laiton"]), r)
    cyl("soliflore", 0.62, 0.42, 0.42, 0.03, 0.12, _m("vase_vert", "#5e8a6a", 0.5), r, verts=12, r_top=0.015, aplat=0.7, outline=False)
    for k, (dx, dz, c) in enumerate(((-0.03, 0.20, "#e3c34a"), (0.02, 0.23, "#f2ece0"), (0.04, 0.18, "#b4563a"))):
        tube(f"tige{k}", [(0.62, 0.42, 0.53), (0.62 + dx, 0.42, 0.42 + dz)], 0.004, _m("tige_verte", "#5a7a3a"), r, outline=False)
        ellipsoide(f"fleur{k}", 0.62 + dx, 0.42, 0.42 + dz, 0.022, 0.018, 0.016, _m(f"fleur_{c}", c), r, seg=8)
    return r, W, D


# ─── 4. LE TAPIS KILIM ───────────────────────────────────────────────────
def tex_kilim(W, D, fond="#a9482c", motif="#2f5a66", clair="#e8d8b8", bord="#3b2a26"):
    def f(nodes, links):
        co = _obj_coords(nodes, links)
        sep = nodes.new('ShaderNodeSeparateXYZ'); links.new(co, sep.inputs[0])
        def m(op, a, b=None):
            n = nodes.new('ShaderNodeMath'); n.operation = op
            for k, v in enumerate((a, b)):
                if v is None:
                    continue
                if isinstance(v, (int, float)):
                    n.inputs[k].default_value = v
                else:
                    links.new(v, n.inputs[k])
            return n.outputs[0]
        X, Y = sep.outputs['X'], sep.outputs['Y']
        d = m('MINIMUM', m('MINIMUM', X, m('SUBTRACT', W, X)), m('MINIMUM', Y, m('SUBTRACT', D, Y)))
        rb = nodes.new('ShaderNodeValToRGB'); rb.color_ramp.interpolation = 'CONSTANT'
        E = rb.color_ramp.elements
        for i, (pos, c) in enumerate(((0.0, bord), (0.05, clair), (0.09, fond), (0.16, bord), (0.19, clair))):
            e = E[i] if i < 2 else E.new(pos)
            e.position = pos; e.color = (*S.hexrgb(c), 1)
        links.new(d, rb.inputs['Fac'])
        # Le champ : un treillis de losanges (8 par mètre), deux couleurs.
        k = 3.2
        u = m('ABSOLUTE', m('SUBTRACT', m('FRACT', m('MULTIPLY', X, k)), 0.5))
        v = m('ABSOLUTE', m('SUBTRACT', m('FRACT', m('MULTIPLY', Y, k)), 0.5))
        dia = m('ADD', u, v)
        rd = nodes.new('ShaderNodeValToRGB'); rd.color_ramp.interpolation = 'CONSTANT'
        E = rd.color_ramp.elements
        for i, (pos, c) in enumerate(((0.0, clair), (0.12, motif), (0.30, fond), (0.62, motif), (0.70, fond))):
            e = E[i] if i < 2 else E.new(pos)
            e.position = pos; e.color = (*S.hexrgb(c), 1)
        links.new(dia, rd.inputs['Fac'])
        inside = m('GREATER_THAN', d, 0.22)
        mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        links.new(inside, S._sock(mix, 'Factor_Float'))
        links.new(rb.outputs['Color'], S._sock(mix, 'A_Color'))
        links.new(rd.outputs['Color'], S._sock(mix, 'B_Color'))
        return S._sock(mix, 'Result_Color', out=True)
    return f


def tapis(fond="#a9482c", motif="#2f5a66"):
    """2,20 × 1,60 m, kilim tissé : bordures, treillis de losanges, franges."""
    W, D = 2.20, 1.60
    r = root("tapis")
    Tk = mat(f"kilim_{fond}_{motif}", fond, tex=tex_kilim(W, D, fond=fond, motif=motif))
    box("trame", 0.0, 0.0, 0.0, W, D, 0.012, Tk, r)
    Fr = _m("frange", "#e8dcc0")
    for x0 in (-0.06, W):
        for k in range(0, 32):
            box("frange", x0, 0.04 + k * 0.048, 0.0, 0.06, 0.016, 0.006, Fr, r, outline=False)
    return r, W, D


# ─── 5. LA BIBLIOTHÈQUE ──────────────────────────────────────────────────
LIVRES = ("#7e2a26", "#2b3f5e", "#3f5e3a", "#b8892f", "#e2d5b5", "#5c3a22", "#262321", "#8a5a7a", "#a8452c", "#4a6b78")


def bibliotheque(bois="noyer", graine=7):
    """1,00 × 0,34 × 2,00 m, corniche, cinq tablettes pleines de livres (un
    par un, couleurs et hauteurs tirées), un vase, un pothos qui retombe."""
    W, D, H = 1.00, 0.34, 2.00
    rnd = random.Random(graine)
    r = root("bibliotheque")
    Bw = _bois("biblio", bois, fil='Z')
    Bf = _m(f"fond_{bois}", BOIS[bois][1])
    box("flancG", 0.0, 0.0, 0.0, 0.035, D, H, Bw, r)
    box("flancD", W - 0.035, 0.0, 0.0, 0.035, D, H, Bw, r)
    box("corniche", -0.025, -0.025, H - 0.05, W + 0.05, D + 0.025, 0.07, Bw, r, bevel=0.01)
    box("socle", 0.035, 0.0, 0.0, W - 0.07, D, 0.09, Bw, r)
    box("fond", 0.035, D - 0.025, 0.09, W - 0.07, 0.025, H - 0.14, Bf, r, outline=False)
    niveaux = (0.09, 0.47, 0.85, 1.23, 1.61)
    for z in niveaux[1:]:
        box("tablette", 0.035, 0.0, z - 0.025, W - 0.07, D - 0.025, 0.025, Bw, r, outline=False)
    for n, z in enumerate(niveaux):
        x = 0.045
        while x < W - 0.08:
            if rnd.random() < 0.08:          # un trou, ou un objet
                x += rnd.uniform(0.05, 0.12); continue
            e = rnd.uniform(0.022, 0.05); h = rnd.uniform(0.20, 0.30); p = rnd.uniform(0.17, 0.24)
            if x + e > W - 0.045:
                break
            c = LIVRES[rnd.randrange(len(LIVRES))]
            b = box("livre", x, 0.03 + (0.24 - p) * 0.3, z, e, p, h, _m(f"livre_{c}", c), r, outline=False)
            if rnd.random() < 0.06 and x > 0.2:   # un livre qui penche
                b.rotation_euler = (0, math.radians(rnd.choice((-12, 12))), 0)
            x += e + 0.002
    # Dessus de la corniche : un vase et un pothos.
    cyl("vase", 0.22, 0.16, H + 0.02, 0.06, 0.24, _m("vase_bleu", "#3a6a8a", 0.5), r, verts=16, r_top=0.035, aplat=0.7)
    cyl("pot_pothos", 0.74, 0.16, H + 0.02, 0.08, 0.12, _m("terre_cuite", "#b8653a"), r, verts=14, r_top=0.09, aplat=0.7)
    Fe = _m("feuille", "#4f8a3c"); Fe2 = _m("feuille2", "#6aa34a")
    for k in range(9):    # des feuilles qui retombent le long du flanc droit
        a = k / 8.0
        box("feuille", 0.70 + rnd.uniform(-0.06, 0.12), -0.01, H + 0.12 - a * 0.75 + rnd.uniform(-0.03, 0.03),
            0.05, 0.02, 0.04, Fe if k % 2 else Fe2, r, outline=False)
    return r, W, D


# ─── 6. LE LAMPADAIRE ────────────────────────────────────────────────────
def lampadaire(abat="lin", metal="laiton", allume=False):
    """1,62 m : socle lesté, fût fin, abat-jour tronconique (ovale, voir `cyl`).
    ⚠️ L'abat-jour est OUVERT en haut : son intérieur sombre (ou l'ampoule, allumé)
    est ce qui le distingue d'un œuf posé sur un bâton (planche du 2026-10-16)."""
    W = D = 0.40
    r = root("lampadaire")
    Me = _m(f"metal_{metal}", *METAL[metal])
    cyl("socle", 0.2, 0.2, 0.0, 0.14, 0.03, Me, r, verts=20, aplat=0.7)
    cyl("bulbe", 0.2, 0.2, 0.03, 0.05, 0.05, Me, r, verts=12, aplat=0.7, r_top=0.015, outline=False)
    cyl("fut", 0.2, 0.2, 0.06, 0.013, 1.30, Me, r, verts=8, outline=False)
    Ab = lumineux(f"abat_{abat}_allume", "#ffe2a8") if allume else _m(f"abat_{abat}", TISSU.get(abat, "#ddd2bb"))
    cyl("abat", 0.2, 0.2, 1.34, 0.21, 0.28, Ab, r, verts=28, r_top=0.14, aplat=0.7)
    cyl("liseré", 0.2, 0.2, 1.34, 0.215, 0.02, _m("galon", "#8a6a3a"), r, verts=28, aplat=0.7, outline=False)
    dedans = lumineux("ampoule", "#fff4d6") if allume else _m("dedans_abat", "#4a3a2a")
    cyl("dedans", 0.2, 0.2, 1.615, 0.125, 0.008, dedans, r, verts=24, aplat=0.7, outline=False)
    # 2026-10-17 (64 px) : la frange au bord de l'abat-jour, la chaînette d'interrupteur.
    Fr = _m("frange_abat", "#8a6a3a")
    for k in range(18):
        a = math.pi * (0.05 + 0.9 * k / 17)            # la moitié avant : celle qu'on voit
        box("frange", 0.2 + math.cos(a) * 0.205 - 0.006, 0.2 - math.sin(a) * 0.205 * 0.7, 1.30, 0.012, 0.006, 0.045, Fr, r, outline=False)
    tube("chainette", [(0.27, 0.16, 1.40), (0.27, 0.15, 1.24)], 0.004, Me, r, outline=False)
    ellipsoide("gland", 0.27, 0.15, 1.23, 0.01, 0.01, 0.014, Me, r, seg=8)
    return r, W, D


# ─── 7. LE POÊLE À BOIS ──────────────────────────────────────────────────
def poele(email="fonte", allume=True):
    """0,55 × 0,40 m de fonte (0,45 au premier jet : la profondeur se triche, voir
    l'en-tête), porte vitrée, l'amorce du tuyau (le jeu le monte au plafond), une
    bouilloire émaillée dessus."""
    W, D = 0.55, 0.40
    r = root("poele")
    Fo = _m(f"email_{email}", *METAL.get(email, METAL["fonte"]))
    La = _m("laiton", *METAL["laiton"])
    for (x, y) in ((0.04, 0.04), (W - 0.09, 0.04), (0.04, D - 0.09), (W - 0.09, D - 0.09)):
        box("pied", x, y, 0.0, 0.05, 0.05, 0.10, Fo, r)
    box("corps", 0.0, 0.0, 0.10, W, D, 0.62, Fo, r, bevel=0.02)
    box("plaque", -0.02, -0.02, 0.72, W + 0.04, D + 0.04, 0.04, Fo, r, bevel=0.01)
    box("cadre_porte", 0.08, -0.015, 0.20, 0.39, 0.02, 0.40, Fo, r, bevel=0.01)
    if allume:
        feu = bpy.data.materials.get("feu") or bpy.data.materials.new("feu")
        feu.use_nodes = True; nt = feu.node_tree; nt.nodes.clear()
        tx = nt.nodes.new('ShaderNodeTexWave'); tx.wave_type = 'BANDS'; tx.bands_direction = 'X'
        tx.inputs['Scale'].default_value = 6.0; tx.inputs['Distortion'].default_value = 8.0
        rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'CONSTANT'
        rp.color_ramp.elements[0].color = (*S.hexrgb("#ff8a2a"), 1)
        rp.color_ramp.elements[1].position = 0.6; rp.color_ramp.elements[1].color = (*S.hexrgb("#ffd36a"), 1)
        em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(tx.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], out.inputs['Surface'])
        vitre = feu
    else:
        vitre = _m("vitre_noire", "#1c1a1a", 0.6)
    box("vitre", 0.12, -0.02, 0.24, 0.31, 0.01, 0.32, vitre, r, outline=False)
    box("poignee", 0.47, -0.04, 0.38, 0.04, 0.03, 0.06, La, r, outline=False)
    box("cendrier", 0.10, -0.012, 0.12, 0.35, 0.01, 0.06, Fo, r, outline=False)
    # ⚠️ 2026-10-18 — LE TUYAU N'EST PLUS QU'UNE AMORCE (0,76 → 1,10 m, avant ×ZK). Il montait puis rentrait dans un mur à 0,70 m
    # derrière la façade du poêle : un sprite ne sait pas où est le mur — posé contre lui, le coude le traversait ; au milieu de la
    # pièce, il finissait en l'air. Le jeu le PROLONGE jusqu'au plafond, à la verticale, coupé avec les murs de la pièce
    # (`maisonArt.drawFlue`, qui lit cette amorce sur l'image : le haut opaque du sprite).
    tube("tuyau", [(W / 2, 0.24, 0.76), (W / 2, 0.24, 1.10)], 0.065, Fo, r)
    ellipsoide("bouilloire", 0.15, 0.22, 0.83, 0.10, 0.075, 0.08, _m("email_rouge", "#b23a2a", 0.6), r, outline=True, seg=16)
    cyl("couvercle", 0.15, 0.22, 0.90, 0.035, 0.03, _m("email_rouge", "#b23a2a", 0.6), r, verts=10, aplat=0.7, outline=False)
    box("bec", 0.24, 0.21, 0.82, 0.07, 0.025, 0.025, _m("email_rouge", "#b23a2a", 0.6), r, outline=False)
    return r, W, D


# ─── 8. LA PLANTE MORTE (elle attend le joueur dans le séjour vide) ──────
def plante_morte():
    """Décision de Guillaume (2026-10-16) : la maison est VIDE au premier
    passage, sauf un lit et une plante morte dans le séjour. Pot de terre
    cuite à lèvre, terreau craquelé, cinq tiges sèches qui retombent, des
    feuilles recroquevillées pendues, trois feuilles tombées par terre.
    ⚠️ Les tiges font UN pixel (rayon 1,8 cm) : plus fines, elles clignotent
    d'un pixel à l'autre selon l'orientation."""
    W = D = 0.42
    r = root("plante_morte")
    Tc = _m("terre_cuite", "#b8653a")
    Tf = _m("terre_cuite_f", "#8e4c2b")
    cyl("soucoupe", 0.21, 0.21, 0.0, 0.18, 0.03, Tf, r, verts=22, aplat=0.7)
    cyl("pot", 0.21, 0.21, 0.03, 0.12, 0.25, Tc, r, verts=22, r_top=0.15, aplat=0.7)
    cyl("levre", 0.21, 0.21, 0.27, 0.165, 0.055, Tc, r, verts=22, aplat=0.7)
    cyl("terre", 0.21, 0.21, 0.322, 0.15, 0.006, _m("terreau_sec", "#7a5d3e"), r, verts=22, aplat=0.7, outline=False)
    Ti = _m("tige_seche", "#5e4528")
    Fm = (_m("feuille_morte1", "#8a6a3a"), _m("feuille_morte2", "#b08a4a"), _m("feuille_morte3", "#6f5430"))
    for k, (ang, haut, chute) in enumerate(((15, 0.66, 0.34), (100, 0.50, 0.20), (165, 0.74, 0.46), (235, 0.44, 0.12), (305, 0.58, 0.30))):
        a = math.radians(ang)
        dx, dy = math.cos(a), math.sin(a) * 0.7
        p0 = (0.21 + dx * 0.02, 0.21 + dy * 0.02, 0.32)
        p1 = (0.21 + dx * 0.05, 0.21 + dy * 0.05, 0.32 + haut * 0.65)
        p2 = (0.21 + dx * 0.11, 0.21 + dy * 0.11, 0.32 + haut)
        p3 = (0.21 + dx * 0.19, 0.21 + dy * 0.19, 0.32 + haut - chute)
        tube(f"tige{k}", [p0, p1, p2, p3], 0.018, Ti, r, outline=False)
        x, y, z = p3
        ellipsoide(f"feuille{k}", x + dx * 0.02, y, z - 0.04, 0.035, 0.012, 0.055, Fm[k % 3], r,
                   rot=(0, math.radians(30 if dx > 0 else -30), 0))
        x, y, z = p1
        if k % 2 == 0:
            ellipsoide(f"feuille_b{k}", x + dx * 0.04, y, z - 0.02, 0.03, 0.01, 0.045, Fm[(k + 1) % 3], r,
                       rot=(0, math.radians(50 if dx > 0 else -50), 0))
    for k, (x, y, rz) in enumerate(((0.46, 0.06, 30), (-0.05, 0.03, -50), (0.36, -0.06, 75))):
        ellipsoide("tombee", x, y, 0.006, 0.045, 0.03, 0.006, Fm[k], r, rot=(0, 0, math.radians(rz)))
    return r, W, D


# ─── 9. LA PLANTE VERTE (figuier lyre) ─────────────────────────────────
def plante_verte(graine=3):
    """Un figuier lyre : un tronc, de grandes feuilles ovales étagées, trois
    verts (dessous sombre, dessus clair) — lisible à 32 px par case, ce que
    n'était pas le monstera en rectangles de la première planche."""
    W = D = 0.50
    rnd = random.Random(graine)
    r = root("plante_verte")
    cyl("pot", 0.25, 0.25, 0.0, 0.15, 0.38, _m("pot_creme", "#e6dcc8", 0.2), r, verts=22, r_top=0.18, aplat=0.7)
    cyl("bande", 0.25, 0.25, 0.24, 0.17, 0.04, _m("pot_bande", "#b9a27a"), r, verts=22, aplat=0.7, outline=False)
    cyl("terre", 0.25, 0.25, 0.375, 0.17, 0.006, _m("terreau", "#3e2c1e"), r, verts=22, aplat=0.7, outline=False)
    Tr = _m("tronc", "#6e5236")
    tube("tronc", [(0.25, 0.25, 0.38), (0.24, 0.25, 0.80), (0.27, 0.24, 1.25)], 0.022, Tr, r, outline=False)
    Fs = (_m("ficus1", "#2f6a2f"), _m("ficus2", "#478a3c"), _m("ficus3", "#62a64c"))
    for k in range(26):   # 2026-10-17 (64 px) : 26 feuilles (16 à 32 px par case : un figuier clairsemé)
        t = k / 25.0
        z = 0.62 + t * 0.70
        a = rnd.uniform(0, math.tau)
        L = 0.10 + 0.06 * (1 - t)
        cx = 0.25 + math.cos(a) * (0.10 + 0.06 * (1 - t))
        cy = 0.25 + math.sin(a) * 0.06
        col = Fs[2] if z > 1.0 else Fs[1] if k % 3 else Fs[0]
        ellipsoide(f"feuille{k}", cx, cy, z, L, 0.06, 0.016, col, r,
                   rot=(math.radians(rnd.uniform(15, 40)), math.radians(rnd.uniform(-30, 30)), a), outline=True)
    return r, W, D


# ─── 10. LE GUÉRIDON ET SA LAMPE ─────────────────────────────────────────
def gueridon(bois="noyer", abat="moutarde", allume=False):
    """Guéridon à pied central (plateau ovale), petite lampe de céramique
    verte, un livre. ⚠️ Premier jet trop chargé (lampe aussi large que le
    plateau) : la lampe fait maintenant 40 cm, abat-jour compris."""
    W = D = 0.46
    r = root("gueridon")
    Bw = _bois("gueridon", bois, fil='X')
    cyl("plateau", 0.23, 0.23, 0.55, 0.23, 0.035, Bw, r, verts=26, aplat=0.7)
    cyl("fut", 0.23, 0.23, 0.05, 0.035, 0.50, Bw, r, verts=10, outline=False)
    cyl("noeud", 0.23, 0.23, 0.22, 0.055, 0.08, Bw, r, verts=12, aplat=0.7, outline=False)
    cyl("base", 0.23, 0.23, 0.0, 0.17, 0.05, Bw, r, verts=22, r_top=0.12, aplat=0.7)
    Ce = _m("ceramique_verte", "#5e8a6a", 0.5)
    ellipsoide("lampe_pied", 0.17, 0.27, 0.65, 0.055, 0.04, 0.07, Ce, r, outline=True, seg=14)
    Ab = lumineux(f"abat_{abat}_allume", "#ffd98a") if allume else _m(f"abat_{abat}", TISSU[abat])
    cyl("lampe_abat", 0.17, 0.27, 0.74, 0.10, 0.12, Ab, r, verts=22, r_top=0.065, aplat=0.7)
    dedans = lumineux("ampoule", "#fff4d6") if allume else _m("dedans_abat", "#4a3a2a")
    cyl("lampe_dedans", 0.17, 0.27, 0.857, 0.058, 0.006, dedans, r, verts=18, aplat=0.7, outline=False)
    box("livre", 0.27, 0.10, 0.585, 0.14, 0.10, 0.03, _m("couv_vert", "#3d5a3a"), r, outline=False)
    # 2026-10-17 (64 px) : le napperon de dentelle sous la lampe, et des lunettes posées sur le livre.
    cyl("napperon", 0.20, 0.25, 0.585, 0.12, 0.002, _m("dentelle", "#f2ece0"), r, verts=20, aplat=0.7, outline=False)
    for dx in (0.0, 0.05):
        cyl("verre", 0.31 + dx, 0.13, 0.616, 0.02, 0.003, _m("lunettes", "#2a2624"), r, verts=10, aplat=0.7, outline=False)
    return r, W, D


# ─── 10 bis. LE PORTEMANTEAU DE L'ENTRÉE ─────────────────────────────────
def portemanteau(bois="noyer"):
    """Portemanteau perroquet (1,80 m) : un manteau, une écharpe, un chapeau ;
    un porte-parapluies à côté, avec un parapluie rouge."""
    W, D = 0.62, 0.42
    r = root("portemanteau")
    Bw = _bois("perroquet", bois, fil='Z')
    cx, cy = 0.22, 0.22
    for k in range(3):
        a = k * math.tau / 3 + 0.3
        tube(f"pied{k}", [(cx, cy, 0.18), (cx + math.cos(a) * 0.20, cy + math.sin(a) * 0.14, 0.0)], 0.018, Bw, r, outline=False)
    cyl("mat", cx, cy, 0.0, 0.025, 1.78, Bw, r, verts=10)
    ellipsoide("pomme", cx, cy, 1.80, 0.04, 0.03, 0.035, Bw, r, outline=True)
    for k in range(4):
        a = k * math.tau / 4 + 0.6
        tube(f"patere{k}", [(cx, cy, 1.62), (cx + math.cos(a) * 0.13, cy + math.sin(a) * 0.09, 1.70)], 0.012, Bw, r, outline=False)
    Ma = _m("manteau", "#4b5a6e")
    box("manteau", cx - 0.17, cy - 0.10, 0.62, 0.34, 0.14, 0.98, Ma, r, bevel=0.07, seg=3)
    box("col", cx - 0.12, cy - 0.11, 1.48, 0.24, 0.10, 0.14, _m("manteau_col", "#3c4858"), r, bevel=0.04, outline=False)
    Ec = mat("echarpe_rayee", "#b4582f", tex=tex_rayures("#b4582f", "#e3d6b8", echelle=18.0, axe='Z', part=0.7))
    box("echarpe", cx + 0.06, cy - 0.13, 0.95, 0.07, 0.03, 0.62, Ec, r, outline=False)
    ellipsoide("chapeau", cx - 0.02, cy, 1.74, 0.13, 0.10, 0.025, _m("feutre", "#5a4232"), r, outline=True)
    ellipsoide("calotte", cx - 0.02, cy, 1.79, 0.075, 0.06, 0.05, _m("feutre", "#5a4232"), r, outline=False)
    cyl("porte_parapluie", 0.50, 0.24, 0.0, 0.09, 0.50, _m("tole_verte", "#3f5e4a", 0.5), r, verts=16, aplat=0.7)
    tube("parapluie", [(0.50, 0.24, 0.30), (0.53, 0.25, 0.95)], 0.035, _m("parapluie_rouge", "#a8322c"), r)
    tube("crosse", [(0.53, 0.25, 0.95), (0.56, 0.25, 1.02), (0.60, 0.25, 0.98)], 0.012, Bw, r, outline=False)
    return r, W, D


# ─── 11. LE LIT (fourni au départ) ───────────────────────────────────────
def lit(linge="lin", couette="canard", bois="chene"):
    """Lit double 1,45 × 2,05 m. TÊTE AU FOND : la face (vers −y) est le PIED.
    Tête de lit à panneaux, matelas, drap retourné, couette, deux oreillers."""
    W, D = 1.45, 2.05
    r = root("lit")
    Bw = _bois("lit", bois, fil='X')
    Li = _m(f"linge_{linge}", TISSU.get(linge, "#ddd2bb"))
    Dr = _m("drap_blanc", "#f1ece0")
    cc = TISSU.get(couette, "#2f7078")
    Co = mat(f"couette_{couette}", cc, tex=tex_rayures(cc, _assombrir(cc, 0.86), echelle=7.0, axe='Y', part=0.86))
    box("tete", 0.0, D - 0.07, 0.0, W, 0.07, 1.05, Bw, r, bevel=0.015)
    for k in range(3):
        box("panneau", 0.10 + k * 0.42, D - 0.085, 0.50, 0.38, 0.02, 0.42, Bw, r, outline=False, bevel=0.005)
    # 2026-10-17 (64 px) : la corniche de la tête de lit, ses deux colonnes à pommeau, celles du pied.
    box("corniche_tete", -0.03, D - 0.09, 1.05, W + 0.06, 0.10, 0.05, Bw, r, bevel=0.01)
    for x in (0.0, W - 0.07):
        box("colonne_tete", x, D - 0.08, 0.0, 0.07, 0.08, 1.12, Bw, r, bevel=0.01)
        ellipsoide("pommeau", x + 0.035, D - 0.04, 1.16, 0.04, 0.035, 0.04, Bw, r, outline=True, seg=10)
        box("colonne_pied", x, -0.01, 0.0, 0.07, 0.08, 0.56, Bw, r, bevel=0.01)
        ellipsoide("pommeau_pied", x + 0.035, 0.03, 0.59, 0.035, 0.03, 0.035, Bw, r, outline=True, seg=10)
    box("pied_lit", 0.0, 0.0, 0.0, W, 0.06, 0.48, Bw, r, bevel=0.012)
    box("longeronG", 0.0, 0.06, 0.12, 0.05, D - 0.13, 0.20, Bw, r)
    box("longeronD", W - 0.05, 0.06, 0.12, 0.05, D - 0.13, 0.20, Bw, r)
    box("matelas", 0.04, 0.07, 0.30, W - 0.08, D - 0.15, 0.20, Dr, r, bevel=0.04, seg=3)
    box("couette", 0.02, 0.05, 0.44, W - 0.04, D - 0.66, 0.12, Co, r, bevel=0.05, seg=3)
    box("retour", 0.02, D - 0.66, 0.50, W - 0.04, 0.14, 0.06, Dr, r, bevel=0.03, seg=2)
    for x0 in (0.08, W / 2 + 0.02):
        o = box("oreiller", x0, D - 0.50, 0.50, W / 2 - 0.10, 0.36, 0.14, Li, r, bevel=0.06, seg=3)
        o.rotation_euler = (math.radians(-12), 0, 0)
        box("volant", x0 - 0.01, D - 0.52, 0.50, W / 2 - 0.08, 0.02, 0.05, Dr, r, outline=False)   # le volant de la taie
    # La couette PIQUÉE : des coutures en travers, d'un ton plus sombre, tous les 25 cm.
    Pq = _m(f"piqure_{couette}", _assombrir(cc, 0.70))
    for k in range(1, 6):
        box("piqure", 0.03, 0.05 + k * 0.24, 0.561, W - 0.06, 0.012, 0.004, Pq, r, outline=False)
    # Un plaid plié en travers du pied du lit, rayé.
    Pl = mat("plaid_moutarde", TISSU["moutarde"], tex=tex_rayures(TISSU["moutarde"], "#7a3f2c", echelle=9.0, axe='X', part=0.78))
    box("plaid", 0.0, 0.10, 0.555, W, 0.36, 0.05, Pl, r, bevel=0.025, seg=2)
    box("plaid_pan", -0.01, 0.10, 0.36, 0.03, 0.36, 0.22, Pl, r, bevel=0.01)
    return r, W, D


# ─── 12. LE TABLEAU (provisoire : le tableau viendra de Gemini) ──────────
def tableau(cadre="#b8903e"):
    """Accroché à 1,20 m. Seule la face existe (un objet de mur se voit de face)."""
    W, D = 0.80, 0.04
    r = root("tableau")
    Ca = _m("cadre_dore", cadre, 0.7)
    box("cadre", 0.0, 0.0, 1.20, W, D, 0.62, Ca, r, bevel=0.01)
    def paysage(nodes, links):
        co = _obj_coords(nodes, links)
        sep = nodes.new('ShaderNodeSeparateXYZ'); links.new(co, sep.inputs[0])
        rp = nodes.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'CONSTANT'
        E = rp.color_ramp.elements
        for i, (pos, c) in enumerate(((0.0, "#4a6b3a"), (0.35, "#7a9a58"), (0.55, "#c9b27a"), (0.62, "#a8c4d8"), (0.85, "#d8e4ea"))):
            e = E[i] if i < 2 else E.new(pos)
            e.position = pos; e.color = (*S.hexrgb(c), 1)
        mr = nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.50   # coordonnées LOCALES de la toile
        links.new(sep.outputs['Z'], mr.inputs['Value']); links.new(mr.outputs['Result'], rp.inputs['Fac'])
        return rp.outputs['Color']
    box("toile", 0.06, -0.005, 1.26, W - 0.12, 0.01, 0.50, mat("toile_paysage", "#7a9a58", tex=paysage), r, outline=False)
    return r, W, D


# ─── 13. L'ESCALIER DROIT (architecture, pas meuble : il vient avec la maison)
def escalier(bois="chene", marches=14, larg=0.95, montee=2.62, giron=0.21):
    """Volée droite qui monte vers le FOND (+y) : 14 marches de 18,7 cm, giron
    21 cm (2,94 m au sol), limon côté mur à gauche, rampe à balustres à
    droite, main courante de noyer. ⚠️ Rendu « S » seulement : une volée a un
    sens de montée, son orientation est celle du plan, jamais un choix."""
    W, D = larg, marches * giron
    r = root("escalier")
    Bw = _bois("marche", bois, fil='X')
    Cm = _m("contremarche", "#e4dac4")
    Nm = _bois("rampe", "noyer", fil='Z')
    h = montee / marches
    for k in range(marches):
        y0 = k * giron; z0 = k * h
        box(f"contre{k}", 0.04, y0, z0, W - 0.08, 0.02, h, Cm, r, outline=False)
        box(f"marche{k}", 0.0, y0 - 0.02, z0 + h - 0.03, W, giron + 0.02, 0.03, Bw, r, outline=(k % 1 == 0))
    # Limon côté mur (gauche) : une planche en biais, assez haute pour cacher le bout des marches.
    lim = box("limon", -0.04, -0.02, -0.05, 0.04, D + 0.02, 0.30, Bw, r)
    lim.rotation_euler = (math.atan2(montee, D), 0, 0)
    # Rampe : un balustre par marche, la main courante qui suit la pente.
    for k in range(marches):
        y = k * giron + giron * 0.5
        cyl(f"balustre{k}", W - 0.05, y, k * h + h, 0.012, 0.86, Nm, r, verts=6, outline=False)
    tube("main_courante", [(W - 0.05, -0.05, 0.92), (W - 0.05, D, montee + 0.92)], 0.026, Nm, r)
    cyl("poteau", W - 0.05, 0.0, 0.0, 0.045, 1.02, Nm, r, verts=8)
    ellipsoide("pomme", W - 0.05, 0.0, 1.06, 0.05, 0.035, 0.045, Nm, r, outline=True)
    return r, W, D


# ═══ 2026-10-17 — LES ÉQUIPEMENTS DE LA MAISON ═══════════════════════════
CERAMIQUE = "#f2efe8"


def _marbre():
    # ⚠️ Premier jet veiné en long (fil Z, contraste fort) : des cannelures de bois, pas du marbre (planche du 2026-10-17).
    return mat("marbre_blanc", "#e6e0d4", lustre=0.3, tex=tex_veinage("#e9e3d8", "#cfc7b9", fil='X'))


# ─── 14. LE RADIATEUR DE FONTE (sous les fenêtres de la façade) ──────────
def radiateur(elements=8, peinture="#e0d9c6"):
    """Radiateur à colonnes, peint : des éléments de 6 cm (une colonne de 4 cm,
    un jour d'un pixel), deux collecteurs, deux pieds, le robinet de laiton à
    gauche. 74 cm pieds compris ; 12 cm de profondeur (16 réels, triché)."""
    W, D = elements * 0.06, 0.12
    r = root("radiateur")
    Pe = _m(f"radiateur_{peinture}", peinture, 0.35)
    La = _m("laiton", *METAL["laiton"])
    for k in range(elements):
        box(f"elem{k}", k * 0.06 + 0.01, 0.01, 0.10, 0.04, D - 0.02, 0.62, Pe, r, bevel=0.015, seg=3,
            outline=(k == 0 or k == elements - 1))
    box("collecteur_bas", 0.005, 0.035, 0.15, W - 0.01, D - 0.07, 0.04, Pe, r, outline=False)
    box("collecteur_haut", 0.005, 0.035, 0.65, W - 0.01, D - 0.07, 0.04, Pe, r, outline=False)
    for x in (0.03, W - 0.07):
        box("pied", x, 0.02, 0.0, 0.04, D - 0.04, 0.11, Pe, r, outline=False)
    tube("tuyau", [(-0.035, D / 2, 0.0), (-0.035, D / 2, 0.60)], 0.011, La, r, outline=False)
    cyl("robinet", -0.035, D / 2, 0.58, 0.02, 0.05, La, r, verts=8, outline=False)
    ellipsoide("volant", -0.035, D / 2, 0.645, 0.03, 0.025, 0.01, La, r)
    return r, W, D


# ─── 15. LA CHEMINÉE DE MARBRE (le séjour) ──────────────────────────────
def cheminee(allume=False):
    """Cheminée de marbre blanc veiné : jambages, linteau à cartouche, tablette
    moulurée, sole de pierre ; dans le foyer le contrecœur de fonte, deux chenets,
    trois bûches (allumée : des flammes). Sur la tablette, une pendule de bronze
    et deux bougeoirs. 1,36 × 0,34 m (triché), 1,10 m. Le CONDUIT et le trumeau
    sont peints sur le mur (`maisonArt.paintConduit`) : posés ici, ils flotteraient
    quand le mur se coupe."""
    W, D = 1.36, 0.34
    r = root("cheminee")
    Ma = _marbre()
    Pi = _m("pierre_sole", "#a39b8e")
    Fo = _m("fonte_foyer", "#2b2725", 0.3)
    Su = _m("suie", "#17120f")
    La = _m("laiton", *METAL["laiton"])
    box("sole", 0.04, 0.0, 0.0, W - 0.08, 0.14, 0.03, Pi, r, bevel=0.005)
    # ⚠️ Le foyer est un CREUX : un premier jet en bloc de suie plein cachait les bûches,
    # les chenets et le feu (planche du 2026-10-17). Le fond, les flancs, l'âtre et la hotte
    # intérieure sont des parois sombres ; ce qui est dedans se voit entre les jambages.
    box("atre", 0.22, 0.12, 0.03, W - 0.44, D - 0.12, 0.01, Su, r, outline=False)
    box("fond_foyer", 0.22, D - 0.03, 0.03, W - 0.44, 0.03, 0.77, Su, r, outline=False)
    for x0 in (0.22, W - 0.25):
        box("flanc_foyer", x0, 0.14, 0.03, 0.03, D - 0.14, 0.77, Su, r, outline=False)
    box("hotte_foyer", 0.22, 0.14, 0.74, W - 0.44, D - 0.14, 0.06, Su, r, outline=False)
    box("contrecoeur", 0.30, D - 0.045, 0.06, W - 0.60, 0.015, 0.52, Fo, r, outline=False)
    ellipsoide("blason", W / 2, D - 0.05, 0.40, 0.09, 0.004, 0.11, _m("fonte_relief", "#3d3835", 0.4), r)
    for x0 in (0.04, W - 0.24):
        box("jambage", x0, 0.10, 0.03, 0.20, D - 0.10, 0.80, Ma, r, bevel=0.012)
        box("base_jambage", x0 - 0.01, 0.09, 0.03, 0.22, D - 0.09, 0.08, Ma, r, bevel=0.006, outline=False)
    box("linteau", 0.04, 0.10, 0.80, W - 0.08, D - 0.10, 0.22, Ma, r, bevel=0.012)
    box("cartouche", W / 2 - 0.13, 0.085, 0.85, 0.26, 0.02, 0.12, Ma, r, bevel=0.01, outline=False)
    box("tablette", 0.0, 0.07, 1.02, W, D - 0.06, 0.06, Ma, r, bevel=0.015, seg=3)
    for x in (0.38, W - 0.42):                       # les chenets
        box("chenet", x, 0.17, 0.03, 0.04, 0.10, 0.12, Fo, r, outline=False)
        ellipsoide("pomme_chenet", x + 0.02, 0.17, 0.17, 0.025, 0.02, 0.025, La, r)
    Bu = _m("buche", "#6e4a2c"); Bc = _m("buche_coupe", "#c49a68")
    for k, (z, y) in enumerate(((0.10, 0.22), (0.10, 0.27), (0.17, 0.245))):
        tube(f"buche{k}", [(0.40, y, z), (W - 0.40, y, z)], 0.035, Bu, r, outline=False)
        box(f"coupe{k}", 0.385, y - 0.03, z - 0.03, 0.015, 0.06, 0.06, Bc, r, outline=False)
    if allume:
        F1, F2 = lumineux("flamme", "#ff9a3a"), lumineux("flamme_coeur", "#ffe08a")
        for k, (x, h) in enumerate(((0.50, 0.22), (0.62, 0.30), (0.74, 0.26), (0.86, 0.20))):
            ellipsoide(f"flamme{k}", x, 0.25, 0.24 + h / 2, 0.05, 0.03, h / 2, F1, r)
            ellipsoide(f"coeur{k}", x, 0.23, 0.22 + h / 3, 0.025, 0.02, h / 3, F2, r)
    # La pendule de bronze et ses deux bougeoirs.
    box("pendule", W / 2 - 0.10, 0.14, 1.08, 0.20, 0.10, 0.24, La, r, bevel=0.02, seg=3)
    box("socle_pendule", W / 2 - 0.13, 0.13, 1.08, 0.26, 0.12, 0.04, La, r, bevel=0.008, outline=False)
    box("cadran", W / 2 - 0.05, 0.135, 1.19, 0.10, 0.006, 0.10, _m("email_blanc", "#f4f0e4", 0.4), r, outline=False)
    for x in (0.16, W - 0.16):
        cyl("bougeoir", x, 0.20, 1.08, 0.035, 0.02, La, r, verts=10, aplat=0.7, outline=False)
        cyl("fut_bougeoir", x, 0.20, 1.10, 0.012, 0.16, La, r, verts=8, outline=False)
        cyl("bougie", x, 0.20, 1.26, 0.014, 0.10, _m("cire", "#f2ead2"), r, verts=8, outline=False)
    return r, W, D


# ─── 16. LA CUISINE : PLANS DE TRAVAIL, ÉVIER, CUISINIÈRE ───────────────
FACADE_CUISINE = "#d8d0b4"


def _caisson(r, W, D, portes=None, tiroirs=True):
    """Le caisson bas d'une cuisine (0,90 m plan compris) : socle en retrait,
    portes à cadre, tiroirs, boutons de laiton. Rend la matière de façade."""
    Fa = _m("facade_cuisine", FACADE_CUISINE, 0.15)
    Fc = _m("facade_cuisine_cadre", _assombrir(FACADE_CUISINE, 0.86))
    La = _m("laiton", *METAL["laiton"])
    box("socle", 0.03, 0.06, 0.0, W - 0.06, D - 0.08, 0.10, _m("socle_cuisine", "#4f483d"), r, outline=False)
    box("caisson", 0.0, 0.03, 0.10, W, D - 0.05, 0.76, Fa, r)
    n = portes or max(1, round(W / 0.5))
    lw = W / n
    for i in range(n):
        x0 = i * lw
        if tiroirs:
            box(f"tiroir{i}", x0 + 0.012, 0.012, 0.69, lw - 0.024, 0.02, 0.14, Fa, r, bevel=0.004, outline=False)
            box(f"bouton_t{i}", x0 + lw / 2 - 0.02, 0.0, 0.75, 0.04, 0.014, 0.018, La, r, outline=False)
        box(f"porte{i}", x0 + 0.012, 0.012, 0.12, lw - 0.024, 0.02, 0.55, Fa, r, bevel=0.004, outline=False)
        box(f"panneau{i}", x0 + 0.05, 0.006, 0.17, lw - 0.10, 0.008, 0.45, Fc, r, outline=False)
        bx = x0 + (lw - 0.07 if i % 2 == 0 else 0.04)
        box(f"bouton{i}", bx, 0.0, 0.58, 0.022, 0.014, 0.022, La, r, outline=False)
    return Fa


def _plan(r, W, D):
    box("plan", -0.01, 0.0, 0.86, W + 0.02, D, 0.04, _bois("plan_travail", "chene", fil='X'), r, bevel=0.004)


def plan_travail(larg=1.18, objets="pain"):
    """Un plan de travail sur caissons (0,55 m triché, 0,90 m). Dessus, selon
    la longueur : la planche et le pain, le pot à ustensiles (« pain ») ; la
    corbeille de fruits et les bocaux (« fruits »)."""
    W, D = larg, 0.55
    r = root("plan_travail")
    _caisson(r, W, D)
    _plan(r, W, D)
    if objets == "pain":
        box("planche", 0.18, 0.12, 0.90, 0.40, 0.26, 0.025, _bois("planche", "chene", fil='X'), r, outline=False)
        ellipsoide("pain", 0.36, 0.25, 0.95, 0.15, 0.06, 0.045, _m("croute", "#c08a48"), r, outline=True)
        cyl("pot_ustensiles", W - 0.22, 0.38, 0.90, 0.06, 0.16, _m("gres_bleu", "#4f6f8a", 0.4), r, verts=14, aplat=0.7)
        for k, dx in enumerate((-0.025, 0.0, 0.025)):
            tube(f"ustensile{k}", [(W - 0.22 + dx, 0.38, 1.0), (W - 0.22 + dx * 2, 0.37, 1.20)], 0.008,
                 _bois("ustensile", "chene", fil='Z'), r, outline=False)
    else:
        cyl("corbeille", 0.40, 0.25, 0.90, 0.16, 0.07, _m("osier", "#b88a4a"), r, verts=18, r_top=0.19, aplat=0.7)
        for k, (x, y, c) in enumerate(((0.34, 0.25, "#c8382a"), (0.44, 0.27, "#e0a32a"), (0.40, 0.22, "#7aa33a"))):
            ellipsoide(f"fruit{k}", x, y, 1.00, 0.045, 0.04, 0.045, _m(f"fruit_{c}", c, 0.3), r, outline=True)
        for k, x in enumerate((W - 0.40, W - 0.27, W - 0.15)):
            cyl(f"bocal{k}", x, 0.42, 0.90, 0.045, 0.18 - k * 0.03, _m("verre_bocal", "#c9dcd4", 0.6), r, verts=12, aplat=0.7)
            cyl(f"bouchon{k}", x, 0.42, 1.08 - k * 0.03, 0.04, 0.025, _m("liege", "#b48a5a"), r, verts=12, aplat=0.7, outline=False)
    return r, W, D


def evier(larg=1.18):
    """L'évier de grès blanc (« timbre d'office ») encastré dans le plan, son
    robinet col-de-cygne de laiton ; sous l'évier, un rideau à rayures au lieu
    des portes, comme dans les vieilles cuisines ; un torchon pendu."""
    W, D = larg, 0.55
    r = root("evier")
    Fa = _m("facade_cuisine", FACADE_CUISINE, 0.15)
    La = _m("laiton", *METAL["laiton"])
    box("socle", 0.03, 0.06, 0.0, W - 0.06, D - 0.08, 0.10, _m("socle_cuisine", "#4f483d"), r, outline=False)
    box("caisson", 0.0, 0.03, 0.10, W, D - 0.05, 0.76, Fa, r)
    Ri = mat("rideau_evier", "#f0e8d8", tex=tex_rayures("#f0e8d8", "#b4463a", echelle=26.0, axe='X', part=0.62))
    box("rideau", 0.06, 0.005, 0.11, W - 0.12, 0.02, 0.70, Ri, r, outline=False)
    box("tringle", 0.05, 0.0, 0.80, W - 0.10, 0.015, 0.02, La, r, outline=False)
    _plan(r, W, D)
    Ce = _m("gres_blanc", CERAMIQUE, 0.45)
    bx = W / 2 - 0.36
    box("bac", bx, 0.06, 0.86, 0.72, 0.42, 0.07, Ce, r, bevel=0.02, seg=3)
    box("fond_bac", bx + 0.05, 0.11, 0.931, 0.62, 0.32, 0.002, _m("gres_ombre", "#c7cdcc"), r, outline=False)
    cyl("bonde", W / 2, 0.27, 0.934, 0.02, 0.002, _m("bonde", "#7d817f"), r, verts=10, aplat=0.7, outline=False)
    tube("col_de_cygne", [(W / 2, 0.47, 0.93), (W / 2, 0.47, 1.16), (W / 2, 0.40, 1.22), (W / 2, 0.32, 1.12)], 0.014, La, r, outline=False)
    for dx in (-0.09, 0.09):
        cyl("croisillon", W / 2 + dx, 0.47, 0.93, 0.012, 0.06, La, r, verts=8, outline=False)
        ellipsoide("tete_robinet", W / 2 + dx, 0.47, 1.00, 0.028, 0.028, 0.012, La, r)
    To = mat("torchon", "#f2ece0", tex=tex_rayures("#f2ece0", "#3e6a8a", echelle=40.0, axe='Z', part=0.8))
    box("torchon", W - 0.24, -0.012, 0.58, 0.16, 0.01, 0.28, To, r, outline=False)
    return r, W, D


def cuisiniere(email="#e9e1cc"):
    """La cuisinière émaillée crème : quatre feux sous leurs grilles de fonte, le
    dosseret à barre chromée, la porte du four vitrée, la rangée de manettes ;
    une cocotte rouge sur le feu arrière gauche. 0,70 × 0,55 m (triché)."""
    W, D = 0.70, 0.55
    r = root("cuisiniere")
    Em = _m(f"email_cuisiniere_{email}", email, 0.5)
    Fo = _m("fonte_grille", "#262321", 0.3)
    Ch = _m("chrome", *METAL["chrome"])
    box("socle", 0.03, 0.05, 0.0, W - 0.06, D - 0.07, 0.08, _m("socle_cuisine", "#4f483d"), r, outline=False)
    box("corps", 0.0, 0.02, 0.08, W, D - 0.02, 0.78, Em, r, bevel=0.012)
    box("bandeau", 0.0, 0.012, 0.70, W, 0.02, 0.12, Fo, r, outline=False)
    for k in range(5):
        cyl(f"manette{k}", 0.10 + k * 0.125, 0.0, 0.73, 0.022, 0.03, Em, r, verts=10, outline=False)
    box("porte_four", 0.05, 0.0, 0.14, W - 0.10, 0.02, 0.52, Em, r, bevel=0.008)
    box("hublot", 0.15, -0.004, 0.30, W - 0.30, 0.01, 0.24, _m("vitre_four", "#2a2422", 0.6), r, outline=False)
    tube("poignee_four", [(0.10, -0.03, 0.62), (W - 0.10, -0.03, 0.62)], 0.012, Ch, r, outline=False)
    box("dessus", 0.0, 0.02, 0.86, W, D - 0.02, 0.03, Fo, r, outline=False)
    for (x, y) in ((0.18, 0.16), (0.52, 0.16), (0.18, 0.39), (0.52, 0.39)):
        cyl("feu", x, y, 0.89, 0.09, 0.008, _m("bruleur", "#4a4440"), r, verts=16, aplat=0.75, outline=False)
        box("grille_x", x - 0.11, y - 0.008, 0.897, 0.22, 0.016, 0.012, Fo, r, outline=False)
        box("grille_y", x - 0.008, y - 0.085, 0.897, 0.016, 0.17, 0.012, Fo, r, outline=False)
    box("dosseret", 0.0, D - 0.05, 0.89, W, 0.05, 0.13, Em, r, bevel=0.01)
    tube("barre", [(0.03, D - 0.07, 0.97), (W - 0.03, D - 0.07, 0.97)], 0.01, Ch, r, outline=False)
    Ro = _m("cocotte_rouge", "#b23a2a", 0.55)
    cyl("cocotte", 0.18, 0.39, 0.91, 0.10, 0.10, Ro, r, verts=18, aplat=0.75)
    cyl("couvercle_cocotte", 0.18, 0.39, 1.01, 0.105, 0.02, Ro, r, verts=18, aplat=0.75, outline=False)
    ellipsoide("bouton_cocotte", 0.18, 0.39, 1.04, 0.025, 0.02, 0.015, _m("bouton_noir", "#2a2624"), r)
    return r, W, D


# ─── 17. LA SALLE DE BAINS : BAIGNOIRE, LAVABO, TOILETTES ───────────────
def baignoire(robe="#2f4f3a"):
    """La baignoire à pattes de lion : coque émaillée blanche à bord roulé, robe
    peinte vert anglais, quatre pieds de laiton, la colonne de robinetterie et sa
    douchette à gauche. 1,70 × 0,68 m (triché)."""
    W, D = 1.70, 0.68
    r = root("baignoire")
    Ce = _m("email_baignoire", CERAMIQUE, 0.5)
    Ro = _m(f"robe_{robe}", robe, 0.4)
    La = _m("laiton", *METAL["laiton"])
    for (x, y) in ((0.24, 0.12), (W - 0.24, 0.12), (0.24, D - 0.12), (W - 0.24, D - 0.12)):
        ellipsoide("patte", x, y, 0.07, 0.045, 0.04, 0.07, La, r, outline=True, seg=10)
        ellipsoide("griffe", x, y - 0.02, 0.015, 0.05, 0.04, 0.015, La, r, seg=10)
    box("robe", 0.04, 0.03, 0.12, W - 0.08, D - 0.06, 0.46, Ro, r, bevel=0.17, seg=6)
    box("bord", 0.0, 0.0, 0.55, W, D, 0.07, Ce, r, bevel=0.10, seg=5)
    ellipsoide("creux", W / 2, D / 2, 0.621, (W - 0.16) / 2, (D - 0.14) / 2, 0.002, _m("email_ombre", "#c9d1d3"), r, seg=24)
    ellipsoide("fond", W / 2 + 0.06, D / 2 - 0.03, 0.6215, (W - 0.40) / 2, (D - 0.30) / 2, 0.002, _m("email_fond", "#e3e9ea"), r, seg=24)
    for dy in (-0.08, 0.08):
        tube("colonne", [(0.11, D / 2 + dy, 0.62), (0.11, D / 2 + dy, 0.86)], 0.012, La, r, outline=False)
        ellipsoide("tete", 0.11, D / 2 + dy, 0.88, 0.03, 0.03, 0.012, La, r)
    tube("bec", [(0.11, D / 2, 0.84), (0.20, D / 2, 0.84), (0.24, D / 2, 0.78)], 0.012, La, r, outline=False)
    ellipsoide("douchette", 0.06, D / 2 + 0.16, 0.86, 0.025, 0.025, 0.05, La, r)
    return r, W, D


def lavabo():
    """Le lavabo sur colonne, de faïence blanche : vasque à bord épais, deux
    robinets de laiton à croisillons, un savon rose. Le MIROIR est peint au mur.
    0,56 × 0,38 m (triché).
    ⚠️ 2026-10-17 : cotes RÉELLES (vasque à 0,86 m), mises à l'échelle du PERSONNAGE par
    `ECHELLE_Z` (×0,5 : bord à 0,43 m). Le soir du 2026-10-17 on l'avait descendue de 20 cm
    (`DZ` = 0,20, bord à 0,82 m) : encore à la tête d'un personnage de 0,85 m — « Évier,
    miroir et fenêtre trop hauts, le perso est en dessous ». Le miroir peint au mur
    (`maison.js`, `peints` des bains) suit la même échelle."""
    W, D = 0.56, 0.38
    DZ = 0.0
    r = root("lavabo")
    Ce = _m("faience_lavabo", CERAMIQUE, 0.45)
    La = _m("laiton", *METAL["laiton"])
    cyl("colonne", W / 2, D * 0.55, 0.0, 0.10, 0.70 - DZ, Ce, r, verts=18, r_top=0.075, aplat=0.7)
    box("vasque", 0.0, 0.0, 0.70 - DZ, W, D, 0.16, Ce, r, bevel=0.06, seg=4)
    ellipsoide("creux", W / 2, D / 2 - 0.01, 0.861 - DZ, (W - 0.12) / 2, (D - 0.13) / 2, 0.002, _m("email_ombre", "#c9d1d3"), r, seg=20)
    for dx in (-0.12, 0.12):
        cyl("robinet", W / 2 + dx, D - 0.06, 0.86 - DZ, 0.012, 0.07, La, r, verts=8, outline=False)
        ellipsoide("croisillon", W / 2 + dx, D - 0.06, 0.94 - DZ, 0.028, 0.028, 0.01, La, r)
    tube("bec", [(W / 2, D - 0.06, 0.86 - DZ), (W / 2, D - 0.06, 0.95 - DZ), (W / 2, D - 0.14, 0.92 - DZ)], 0.011, La, r, outline=False)
    ellipsoide("savon", 0.10, D - 0.08, 0.875 - DZ, 0.035, 0.022, 0.014, _m("savon_rose", "#e8a9a0"), r, outline=True)
    return r, W, D


def wc(abattant="noyer"):
    """Les toilettes à réservoir bas : cuvette de faïence, abattant de bois fermé,
    réservoir et son bouton chromé. 0,40 × 0,55 m (triché)."""
    W, D = 0.40, 0.55
    r = root("wc")
    Ce = _m("faience_wc", CERAMIQUE, 0.45)
    box("reservoir", 0.02, D - 0.17, 0.40, W - 0.04, 0.17, 0.36, Ce, r, bevel=0.03, seg=3)
    box("couvercle", 0.0, D - 0.18, 0.76, W, 0.19, 0.03, Ce, r, bevel=0.01, outline=False)
    cyl("chasse", W / 2, D - 0.09, 0.79, 0.022, 0.012, _m("chrome", *METAL["chrome"]), r, verts=10, aplat=0.7, outline=False)
    cyl("cuvette", W / 2, 0.22, 0.0, 0.11, 0.38, Ce, r, verts=20, r_top=0.16, aplat=1.0)
    box("liaison", W / 2 - 0.10, 0.22, 0.12, 0.20, D - 0.39, 0.28, Ce, r, bevel=0.03, outline=False)
    ellipsoide("abattant", W / 2, 0.21, 0.40, 0.17, 0.19, 0.018, _bois("abattant", abattant, fil='Y'), r, outline=True, seg=20)
    box("charniere", W / 2 - 0.06, 0.38, 0.40, 0.12, 0.03, 0.025, _m("chrome", *METAL["chrome"]), r, outline=False)
    return r, W, D


# ─── 18. (le poteau de charpente : retiré le 2026-10-17) ─────────────────
# ⚠️ Un poteau seul sous un faîtage qu'on ne dessine pas (la vue est en coupe, sans
# toit), avec ses jambes de force et un bout de panne : vu à la planche, UNE POTENCE.
# Les poutres des combles sont peintes sur leur rampant (`maisonArt.paintSlopeFace`).

COLORIS = {
    "canape": [dict(tissu=t, bois=b, coussins=c) for (t, b, c) in (
        ("sauge", "noyer", "moutarde"), ("canard", "noyer", "rouille"),
        ("rouille", "chene", "lin"), ("lin", "chene", "canard"), ("prune", "noyer", "moutarde"))],
}


# ─── LES PASSES DE TEINTURE (2026-10-22, lot 2d : Colette) ───────────────
# ⚠️⚠️ POURQUOI DES PASSES ET NON UN RENDU PAR COLORIS : la matière toon (`studio.toon_group`) rend
#   couleur_linéaire × M(x)  puis  écran(·, crème × lustre(x))
# où M(x) (le palier de lumière, l'occlusion, la teinte froide des ombres) et le lustre NE DÉPENDENT PAS de la couleur.
# Rendre une fois le tissu en BLANC donne M(x) ; le rendre en NOIR avec son lustre donne le reflet seul. Le jeu recompose
# alors n'importe quelle teinture de Colette EXACTEMENT comme Blender l'aurait rendue (`maisonArt.teindre`) — la qualité d'un
# rendu par coloris, sans 4 orientations × N teintes × chaque meuble d'images (ni de canevas sur iPad). `verify-maison` le
# prouve : le canapé recoloré « canard / rouille » contre le vrai rendu Blender `canape_canard`.
# Les ZONES : « a » le tissu principal (et ce qui en dérive : passepoil, capitons, piqûres — un ton assombri du blanc),
# « b » l'accent (les coussins jetés du canapé). Elles se repèrent au NOM de la matière (`_za`, `_zb`) : la fonction du
# meuble est appelée avec ces couleurs-là, rien d'autre ne change — la géométrie, donc le cadrage et l'ancre, sont les mêmes.
TISSU["_za"] = TISSU["_zb"] = "#ffffff"
CUIR["_za"] = "#ffffff"
TEINTES = {
    # meuble : (paramètres des zones, zones)
    "canape": (dict(tissu="_za", coussins="_zb"), "ab"),
    "fauteuil": (dict(cuir="_za"), "a"),
    "lit": (dict(couette="_za"), "a"),
}


def _noir():
    m = bpy.data.materials.get("ArcPasseNoir") or bpy.data.materials.new("ArcPasseNoir")
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0, 0, 0, 1)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    # ⚠️ VU À LA PREMIÈRE PASSE (2026-10-22) : le noir remplace aussi `ArcContour`, la coque inversée qui ENFERME le meuble —
    # sans les deux réglages de `studio.outline_mat`, elle se voyait par-dessus tout et la passe sortait noire.
    m.use_backface_culling = True
    m.use_backface_culling_shadow = True
    return m


def _reflet_seul(m):
    """La matière `m`, couleur NOIRE (lien de texture coupé), lustre gardé : seul le reflet reste."""
    k = bpy.data.materials.get(m.name + "~g")
    if k is None:
        k = m.copy(); k.name = m.name + "~g"
    g = next(n for n in k.node_tree.nodes if n.type == 'GROUP')
    for l in list(g.inputs['Couleur'].links):
        k.node_tree.links.remove(l)
    g.inputs['Couleur'].default_value = (0, 0, 0, 1)
    return k


def passe(r, p):
    """Repeint les matières sous `r` pour la passe `p` : « a » ou « b » (la zone en blanc, le reste en noir pur), « g » (les
    zones en noir avec leur lustre, le reste en noir). Le contour (`ArcContour`) passe au noir comme le reste."""
    noir = _noir()
    garde = ("_za", "_zb") if p == "g" else ("_z" + p,)
    stack = [r]
    while stack:
        o = stack.pop()
        stack.extend(o.children)
        if o.type not in ('MESH', 'CURVE'):
            continue
        mats = o.data.materials
        for i, m in enumerate(mats):
            if m is None:
                continue
            zone = any(z in m.name for z in garde)
            mats[i] = (_reflet_seul(m) if p == "g" else m) if zone else noir


def rendre_teinte(nom, fabrique, dossier, orients=("S", "E", "N", "W")):
    """Rend les passes de `nom` dans `dossier/<nom>_<O>_<passe>.png`. Rend { O: {w, h, ax, ay} } (le banc vérifie qu'elles
    tombent sur le cadre du rendu ordinaire)."""
    import os
    kw, zones = TEINTES[nom]
    meta = {}
    for p in zones + "g":
        S.reset_scene(); S.setup()
        S.ZK = ECHELLE_Z.get(nom, 1.0)
        try:
            r, w, d = fabrique(**kw)
            passe(r, p)
            for o in orients:
                S.orient(r, w, d, o)
                meta.setdefault(o, {})[p] = S.render(r, os.path.join(dossier, f"{nom}_{o}_{p}.png"))
        finally:
            S.ZK = 1.0
    return meta


# ─── L'ÉCHELLE D'USAGE : LES COTES DE HAUTEUR SE LISENT CONTRE LE PERSONNAGE ──
# ⚠️⚠️ 2026-10-17 (après-midi) — « la tête du player est en dessous des plans de travail et objets ». Dedans, le
# plan est à ×2 (`maison.HOME_K`) mais le personnage ne l'est pas : il fait 1,70 / 2 = 0,85 m à côté de ses meubles.
# Un plan de travail à 0,90 m, une vasque à 0,82 m (déjà descendue de 20 cm le soir du 2026-10-17) lui arrivaient à la
# tête : à l'écran, sa tête passait SOUS la ligne du plan. Les emprises restent celles du monde réel (c'est ce qui
# fait la grandeur de la pièce) ; les HAUTEURS de ce qui s'utilise debout se divisent par K, comme le personnage :
# le plan lui arrive à la poitrine (0,45 m), la baignoire au genou, la cuvette à la cuisse.
# 2026-10-17 (après-midi, sur sa demande « passe le séjour, la chambre et les radiateurs à la même échelle ») : TOUS les meubles et
# équipements de la maison, hors ce qui n'est pas une cote de corps — le TAPIS (à plat), le TABLEAU (suspendu : sa hauteur
# est celle de l'accrochage, pas d'un meuble) et l'ESCALIER (ses marches font l'étage de 2,70 m des murs, `STOREY_M`).
# ⚠️ Les cotes ci-dessous sont celles du monde RÉEL ; `studio.ZK` les multiplie à la construction (z0, h, rz, tubes).
# ⚠️ CETTE LISTE EST RECOUPÉE avec `maison.SPRITES_ECHELLE_USAGE` par `verify-maison` §12 : ajouter un nom ici, c'est l'ajouter là.
HOME_K = 2.0
ECHELLE_Z = {nom: 1.0 / HOME_K for nom in (
    "plan_travail", "evier", "cuisiniere", "baignoire", "lavabo", "wc",
    "canape", "fauteuil", "table_basse", "bibliotheque", "lampadaire", "poele", "gueridon", "portemanteau",
    "plante_morte", "plante_verte", "lit", "radiateur")}
# ⚠️ LA CHEMINÉE FAIT EXCEPTION : un foyer de 1,36 m de large écrasé à ×0,5 devient une auge de 0,54 m (vu à la planche du
# 2026-10-17, pendule et bougeoirs minuscules). À ×0,65 la tablette est à 0,70 m — encore sous la tête du personnage (0,85 m).
ECHELLE_Z["cheminee"] = 0.65


# ─── rendre un meuble dans ses orientations ──────────────────────────────
def rendre(nom, fabrique, dossier, orients=("S", "E", "N", "W"), suffixe="", **kw):
    """Construit, rend chaque orientation dans `dossier/<nom><suffixe>_<O>.png`,
    rend la méta { O: {w, h, ax, ay, fw, fd} } — `fw`, `fd` : l'emprise en
    mètres une fois tournée."""
    import os
    S.reset_scene(); S.setup()
    S.ZK = ECHELLE_Z.get(nom, 1.0)     # voir « L'ÉCHELLE D'USAGE » : posé le temps de CE meuble, jamais gardé pour le suivant
    try:
        r, w, d = fabrique(**kw)
        meta = {}
        for o in orients:
            fw, fd = S.orient(r, w, d, o)
            m = S.render(r, os.path.join(dossier, f"{nom}{suffixe}_{o}.png"))
            m.update(fw=round(fw, 3), fd=round(fd, 3))
            meta[o] = m
    finally:
        S.ZK = 1.0
    return meta
