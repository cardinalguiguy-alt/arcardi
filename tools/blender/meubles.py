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
    """2,00 × 0,90 m, assise à 45 cm, dossier à 84 cm. Bras roulés, trois
    coussins d'assise et trois de dossier, deux coussins jetés aux bouts,
    pieds fuselés."""
    W, D = 2.00, 0.90
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
    """0,86 × 0,86 m, cuir ciré (lustre), bras ronds, clous de laiton le long
    des bras — un pixel chacun, sans contour."""
    W, D = 0.86, 0.86
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
    return r, W, D


# ─── 7. LE POÊLE À BOIS ──────────────────────────────────────────────────
def poele(email="fonte", allume=True):
    """0,55 × 0,45 m de fonte, porte vitrée, tuyau qui monte puis rentre dans le
    mur (25 cm derrière), une bouilloire émaillée dessus."""
    W, D = 0.55, 0.45
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
    tube("tuyau", [(W / 2, 0.24, 0.76), (W / 2, 0.24, 1.72), (W / 2, 0.30, 1.80), (W / 2, 0.70, 1.80)], 0.065, Fo, r)
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
    for k in range(16):
        t = k / 15.0
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
    box("pied_lit", 0.0, 0.0, 0.0, W, 0.06, 0.48, Bw, r, bevel=0.012)
    box("longeronG", 0.0, 0.06, 0.12, 0.05, D - 0.13, 0.20, Bw, r)
    box("longeronD", W - 0.05, 0.06, 0.12, 0.05, D - 0.13, 0.20, Bw, r)
    box("matelas", 0.04, 0.07, 0.30, W - 0.08, D - 0.15, 0.20, Dr, r, bevel=0.04, seg=3)
    box("couette", 0.02, 0.05, 0.44, W - 0.04, D - 0.66, 0.12, Co, r, bevel=0.05, seg=3)
    box("retour", 0.02, D - 0.66, 0.50, W - 0.04, 0.14, 0.06, Dr, r, bevel=0.03, seg=2)
    for x0 in (0.08, W / 2 + 0.02):
        o = box("oreiller", x0, D - 0.50, 0.50, W / 2 - 0.10, 0.36, 0.14, Li, r, bevel=0.06, seg=3)
        o.rotation_euler = (math.radians(-12), 0, 0)
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


COLORIS = {
    "canape": [dict(tissu=t, bois=b, coussins=c) for (t, b, c) in (
        ("sauge", "noyer", "moutarde"), ("canard", "noyer", "rouille"),
        ("rouille", "chene", "lin"), ("lin", "chene", "canard"), ("prune", "noyer", "moutarde"))],
}


# ─── rendre un meuble dans ses orientations ──────────────────────────────
def rendre(nom, fabrique, dossier, orients=("S", "E", "N", "W"), suffixe="", **kw):
    """Construit, rend chaque orientation dans `dossier/<nom><suffixe>_<O>.png`,
    rend la méta { O: {w, h, ax, ay, fw, fd} } — `fw`, `fd` : l'emprise en
    mètres une fois tournée."""
    import os
    S.reset_scene(); S.setup()
    r, w, d = fabrique(**kw)
    meta = {}
    for o in orients:
        fw, fd = S.orient(r, w, d, o)
        m = S.render(r, os.path.join(dossier, f"{nom}{suffixe}_{o}.png"))
        m.update(fw=round(fw, 3), fd=round(fd, 3))
        meta[o] = m
    return meta
