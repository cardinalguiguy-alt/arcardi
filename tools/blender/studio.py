"""
=============================================================================
 tools/blender/studio.py — LE STUDIO DES MEUBLES D'ARCARDI (2026-10-16)
-----------------------------------------------------------------------------
 Les intérieurs des maisons (docs/PROJETS.md §6). Décision de Guillaume, le
 2026-10-16 : les MEUBLES sont modélisés sous Blender et rendus en sprites ;
 les tableaux et les objets rares viennent d'images Gemini ; les murs et les
 sols sont peints au canevas.

 ⚠️⚠️ LEÇON DU 481, ET C'EST POURQUOI CE FICHIER EST DU CODE : le bureau du
 maire était un glTF exporté de Blender, chargé par le jeu et jamais regardé —
 le maire flottait deux mètres derrière son mur. Ici, Blender n'est qu'un
 MOTEUR DE RENDU : chaque meuble est construit par une fonction Python
 (relançable, relisible, versionnée), et seuls des PNG en sortent, regardés à
 l'écran le jour même. Aucun .blend, aucun glTF n'entre dans le dépôt ni dans
 le jeu.

 LA PROJECTION DU JEU, MESURÉE (cube d'une case, 2026-10-16) :
   le jeu dessine le sol vu de dessus et les faces vues de face, toutes deux à
   pleine échelle : un objet de profondeur p et de hauteur h occupe p + h vers
   le haut de l'écran. C'est une caméra ORTHOGRAPHIQUE inclinée à 45° dont les
   pixels sont étirés de √2 en largeur (`pixel_aspect_x = √2`) : mesuré, un
   cube de 1,183 m donne 32 px de large, 32 px de dessus, 32 px de face.
   ⚠️ `pixel_aspect_y = √2` fait l'inverse (le cube s'élargit à 46 px) : ce
   n'est pas symétrique, essayé.

 LE GRAIN : 32 px par case (1 case = 1,183 m, la porte de 2,04 m des façades,
   `TOWN_HOUSE_DOOR_PX`). C'est le grain des façades peintes (~31 « pixels »
   de dessin par case). Le jeu rééchantillonne ensuite par cran de zoom, comme
   les maisons (`tools/lib-mip.mjs`).

 LA MATIÈRE « TOON » : la lumière d'une seule direction (haut, devant, gauche)
   est ramenée à QUATRE paliers (dessus 1, face 0,88, flanc gauche 0,74, ombre
   0,58), les ombres virent au froid. C'est ce qui fait lire un rendu 3D comme
   un dessin au pixel, et ce qui garde la même lumière sur tous les meubles.
   Contour d'un pixel, brun très sombre, par coque inversée.

 USAGE (Blender 5.2) :
   en direct (MCP) : import sys; sys.path.insert(0, "<dépôt>/tools/blender");
                     import studio, importlib; importlib.reload(studio)
   en lot         : Blender -b -P tools/blender/rendre_meubles.py
=============================================================================
"""
import bpy, bmesh, math, json, os
from mathutils import Vector, Matrix

T = 1.183                 # une case, en mètres
PX = 32                   # pixels de dessin par case
SQ2 = math.sqrt(2.0)
VIEW = Vector((0.0, math.cos(math.radians(45)), -math.sin(math.radians(45))))   # direction de visée

# La lumière vient d'en haut, de devant et de la gauche : N·L = 0,76 dessus,
# 0,55 de face, 0,35 sur le flanc gauche, 0 sur le flanc droit.
SUN_DIR = Vector((0.35, 0.55, -0.76)).normalized()   # direction PARCOURUE par la lumière
OUTLINE_RGB = (0.105, 0.072, 0.058)                  # brun presque noir des contours des façades
SHADOW_TINT = (0.76, 0.74, 0.95)                     # les ombres virent au bleu-violet


# ─── la scène ─────────────────────────────────────────────────────────────
def reset_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def setup():
    """Rendu, caméra, soleil. Idempotent."""
    sc = bpy.context.scene
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except TypeError as e:
        print("moteur :", e)
    sc.render.film_transparent = True
    sc.render.filter_size = 0.0          # pas d'anticrénelage : des pixels francs
    sc.eevee.taa_render_samples = 1
    for attr, val in (("use_shadows", True), ("shadow_ray_count", 1), ("shadow_step_count", 6)):
        if hasattr(sc.eevee, attr):
            setattr(sc.eevee, attr, val)
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    sc.render.pixel_aspect_x = SQ2
    sc.render.pixel_aspect_y = 1.0
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    w = sc.world or bpy.data.worlds.new("Monde")
    sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0, 0, 0, 1)
    bg.inputs[1].default_value = 0.0

    cam = bpy.data.objects.get("CamArcardi")
    if cam is None:
        cd = bpy.data.cameras.new("CamArcardi")
        cam = bpy.data.objects.new("CamArcardi", cd)
        sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = 'HORIZONTAL'
    cam.data.clip_start = 0.01
    cam.data.clip_end = 100.0
    cam.rotation_euler = (math.radians(45), 0, 0)
    sc.camera = cam
    toon_group(rebuild=True)

    sun = bpy.data.objects.get("SoleilArcardi")
    if sun is None:
        ld = bpy.data.lights.new("SoleilArcardi", 'SUN')
        sun = bpy.data.objects.new("SoleilArcardi", ld)
        sc.collection.objects.link(sun)
    # ⚠️ Calibré le 2026-10-16 (cube d'une case, diffuse BLANCHE de la rampe) :
    # à 3,2 la valeur que lit la rampe est N·L, et ses seuils (0,20 / 0,45 /
    # 0,65) se lisent directement contre SUN_DIR. Premier essai à 4, mesuré
    # sur une diffuse de débogage laissée à son gris par défaut (0,8) : 25 %
    # trop fort, et la face passait au palier du dessus.
    sun.data.energy = 3.2
    sun.data.angle = math.radians(2.0)   # ombres nettes
    sun.data.use_shadow = True
    # Orienter le soleil : son axe -Z local doit suivre SUN_DIR.
    sun.rotation_euler = SUN_DIR.to_track_quat('-Z', 'Y').to_euler()
    return cam, sun


# ─── les matières ─────────────────────────────────────────────────────────
def _sock(node, ident, out=False):
    for s in (node.outputs if out else node.inputs):
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def toon_group(rebuild=False):
    """Le groupe de nœuds partagé par TOUTES les matières : une seule lumière.
    `setup()` le reconstruit (un réglage de la rampe doit se voir au rendu
    suivant) ; `mat()` reprend celui qui existe."""
    ng = bpy.data.node_groups.get("ArcToon")
    if ng is not None and not rebuild:
        return ng
    if ng is not None:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new("ArcToon", 'ShaderNodeTree')
    ng.interface.new_socket(name="Couleur", in_out='INPUT', socket_type='NodeSocketColor')
    s_l = ng.interface.new_socket(name="Lustre", in_out='INPUT', socket_type='NodeSocketFloat')
    s_l.default_value = 0.0
    ng.interface.new_socket(name="Shader", in_out='OUTPUT', socket_type='NodeSocketShader')
    N = ng.nodes; L = ng.links
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    dif = N.new('ShaderNodeBsdfDiffuse'); dif.inputs['Color'].default_value = (1, 1, 1, 1)
    s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs[0], s2r.inputs[0])
    bw = N.new('ShaderNodeRGBToBW'); L.new(s2r.outputs['Color'], bw.inputs[0])
    ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    E = ramp.color_ramp.elements
    # Cinq paliers, ÉCRITS EN VALEUR PERÇUE (sRGB) puis passés en linéaire.
    # ⚠️ 2026-10-16, premier canapé : des paliers 0,58 / 0,74 / 0,88 écrits en
    # linéaire n'assombrissent la face que de 7 % à l'écran — dessus, face et
    # flanc se confondaient en un aplat vert. Le palier du REFLET (N·L > 0,92)
    # ne touche que les arrondis tournés vers la lumière : c'est lui qui
    # dessine un bras roulé ou un coussin.
    def lin(v):
        return v ** 2.2
    for i, (pos, v) in enumerate(((0.0, 0.62), (0.18, 0.75), (0.45, 0.87), (0.65, 1.0), (0.92, 1.08))):
        e = E[i] if i < 2 else E.new(pos)
        e.position = pos
        e.color = (lin(v), lin(v), lin(v), 1)
    L.new(bw.outputs[0], ramp.inputs['Fac'])
    # Recoins : l'occlusion ambiante assombrit d'un palier les creux (plis de coussins, dessous d'étagère).
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.12
    aor = N.new('ShaderNodeValToRGB'); aor.color_ramp.interpolation = 'CONSTANT'
    aor.color_ramp.elements[0].position = 0.0; aor.color_ramp.elements[0].color = (0.62, 0.62, 0.62, 1)   # 0,80 perçu
    aor.color_ramp.elements[1].position = 0.55; aor.color_ramp.elements[1].color = (1, 1, 1, 1)
    L.new(_sock(ao, 'AO', out=True), aor.inputs['Fac'])
    lv = N.new('ShaderNodeMix'); lv.data_type = 'RGBA'; lv.blend_type = 'MULTIPLY'
    _sock(lv, 'Factor_Float').default_value = 1.0
    L.new(ramp.outputs['Color'], _sock(lv, 'A_Color')); L.new(aor.outputs['Color'], _sock(lv, 'B_Color'))
    # Teinte des ombres : plus le palier est bas, plus on tire vers le froid.
    lvbw = N.new('ShaderNodeRGBToBW'); L.new(_sock(lv, 'Result_Color', out=True), lvbw.inputs[0])
    mr = N.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.22; mr.inputs['From Max'].default_value = 1.0
    mr.inputs['To Min'].default_value = 0.0; mr.inputs['To Max'].default_value = 1.0
    L.new(lvbw.outputs[0], mr.inputs['Value'])
    tint = N.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MIX'
    _sock(tint, 'A_Color').default_value = (*SHADOW_TINT, 1)
    _sock(tint, 'B_Color').default_value = (1, 1, 1, 1)
    L.new(mr.outputs['Result'], _sock(tint, 'Factor_Float'))
    m1 = N.new('ShaderNodeMix'); m1.data_type = 'RGBA'; m1.blend_type = 'MULTIPLY'
    _sock(m1, 'Factor_Float').default_value = 1.0
    L.new(gi.outputs['Couleur'], _sock(m1, 'A_Color')); L.new(_sock(lv, 'Result_Color', out=True), _sock(m1, 'B_Color'))
    m2 = N.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'
    _sock(m2, 'Factor_Float').default_value = 1.0
    L.new(_sock(m1, 'Result_Color', out=True), _sock(m2, 'A_Color')); L.new(_sock(tint, 'Result_Color', out=True), _sock(m2, 'B_Color'))
    # Lustre : un reflet franc (cuir ciré, vernis, laiton), en un palier.
    gl = N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.25
    gs = N.new('ShaderNodeShaderToRGB'); L.new(gl.outputs[0], gs.inputs[0])
    gbw = N.new('ShaderNodeRGBToBW'); L.new(gs.outputs['Color'], gbw.inputs[0])
    gr = N.new('ShaderNodeValToRGB'); gr.color_ramp.interpolation = 'CONSTANT'
    gr.color_ramp.elements[0].color = (0, 0, 0, 1)
    gr.color_ramp.elements[1].position = 0.5; gr.color_ramp.elements[1].color = (1, 1, 1, 1)
    L.new(gbw.outputs[0], gr.inputs['Fac'])
    gm = N.new('ShaderNodeMath'); gm.operation = 'MULTIPLY'
    L.new(gr.outputs['Color'], gm.inputs[0]); L.new(gi.outputs['Lustre'], gm.inputs[1])
    add = N.new('ShaderNodeMix'); add.data_type = 'RGBA'; add.blend_type = 'SCREEN'
    L.new(gm.outputs[0], _sock(add, 'Factor_Float'))
    L.new(_sock(m2, 'Result_Color', out=True), _sock(add, 'A_Color'))
    _sock(add, 'B_Color').default_value = (1.0, 0.97, 0.88, 1)
    em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    L.new(_sock(add, 'Result_Color', out=True), em.inputs['Color'])
    L.new(em.outputs[0], go.inputs['Shader'])
    return ng


def hexrgb(h):
    """'#rrggbb' → couleur LINÉAIRE (Blender travaille en linéaire, le PNG sort en sRGB)."""
    h = h.lstrip('#')
    def lin(c):
        c = int(c, 16) / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(h[0:2]), lin(h[2:4]), lin(h[4:6]))


def mat(name, color, lustre=0.0, tex=None):
    """Une matière du studio. `color` : '#rrggbb'. `tex(nodes, links)` peut
    rendre une sortie de couleur (motif de tissu, veinage) qui remplace la couleur."""
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    g = nt.nodes.new('ShaderNodeGroup'); g.node_tree = toon_group()
    g.inputs['Couleur'].default_value = (*hexrgb(color), 1)
    g.inputs['Lustre'].default_value = lustre
    if tex is not None:
        nt.links.new(tex(nt.nodes, nt.links), g.inputs['Couleur'])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(g.outputs['Shader'], out.inputs['Surface'])
    return m


def outline_mat():
    m = bpy.data.materials.get("ArcContour")
    if m is not None:
        return m
    m = bpy.data.materials.new("ArcContour")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*OUTLINE_RGB, 1)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = True
    # ⚠️ 2026-10-16 : la coque ENFERME le meuble — sans ceci elle lui porte
    # ombre partout, et tout sort au palier d'ombre (rendu tout noir avec une
    # matière diffuse simple). Ses normales sont retournées : vue du soleil,
    # c'est une face arrière, qu'on écarte aussi de la passe d'ombre.
    m.use_backface_culling_shadow = True
    return m


def add_outline(obj, px=0.9):
    """Coque inversée : un contour d'environ `px` pixel de dessin."""
    if obj.type != 'MESH':
        return
    om = outline_mat()
    if om.name not in [s.name for s in obj.data.materials if s]:
        obj.data.materials.append(om)
    idx = [i for i, s in enumerate(obj.data.materials) if s and s.name == om.name][0]
    sol = obj.modifiers.new("Contour", 'SOLIDIFY')
    sol.thickness = px * T / PX
    sol.offset = 1.0
    sol.use_flip_normals = True
    sol.use_rim = False
    sol.material_offset = idx
    sol.material_offset_rim = idx


# ─── les volumes de base ──────────────────────────────────────────────────
def _link(obj, parent):
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def root(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def box(name, x0, y0, z0, w, d, h, material, parent=None, bevel=0.0, seg=2, outline=True):
    """Pavé par son coin bas-avant-gauche (x0, y0, z0) — y croît vers le FOND."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((v.co.x + 0.5) * w, (v.co.y + 0.5) * d, (v.co.z + 0.5) * h))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (x0, y0, z0)
    me.materials.append(material)
    if bevel > 0:
        bv = ob.modifiers.new("Arrondi", 'BEVEL')
        bv.width = min(bevel, w / 2 - 1e-4, d / 2 - 1e-4, h / 2 - 1e-4)
        bv.segments = seg
        bv.limit_method = 'NONE'
    _link(ob, parent)
    if outline:
        add_outline(ob)
    return ob


def cyl(name, cx, cy, z0, r, h, material, parent=None, verts=20, r_top=None, outline=True, aplat=1.0):
    """Cylindre (ou tronc de cône si `r_top`) posé par le centre de sa base.
    `aplat` < 1 écrase la profondeur : dans cette projection un cercle posé
    reste un CERCLE à l'écran (la profondeur est à l'échelle 1), et un pot ou
    un abat-jour se lit comme un œuf (planche du 2026-10-16). Le dessinateur
    triche en ovale ; on triche pareil, à 0,7."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=r, radius2=(r if r_top is None else r_top), depth=h)
    for v in bm.verts:
        v.co.z += h / 2
        v.co.y *= aplat
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (cx, cy, z0)
    me.materials.append(material)
    _link(ob, parent)
    for p in me.polygons:
        p.use_smooth = True
    if outline:
        add_outline(ob)
    return ob


def ellipsoide(name, cx, cy, cz, rx, ry, rz, material, parent=None, rot=(0, 0, 0), outline=False, seg=10):
    """Une feuille, un galet, une bouilloire : une sphère écrasée."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * rx, v.co.y * ry, v.co.z * rz))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (cx, cy, cz)
    ob.rotation_euler = rot
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    _link(ob, parent)
    if outline:
        add_outline(ob)
    return ob


def tube(name, pts, r, material, parent=None, outline=True, sides=10):
    """Un tube le long d'une polyligne (pieds cintrés, tiges, tuyau de poêle)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = max(1, sides // 4)
    cu.use_fill_caps = True
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (p[0], p[1], p[2], 1)
    ob = bpy.data.objects.new(name, cu)
    cu.materials.append(material)
    _link(ob, parent)
    if outline:
        # Une courbe n'a pas de coque : on la convertit en maillage.
        bpy.context.view_layer.objects.active = ob
        for o in bpy.context.selected_objects:
            o.select_set(False)
        ob.select_set(True)
        bpy.ops.object.convert(target='MESH')
        ob = bpy.context.view_layer.objects.active
        add_outline(ob)
    return ob


# ─── le rendu d'un meuble ─────────────────────────────────────────────────
def _meshes_under(r):
    out = []
    stack = [r]
    while stack:
        o = stack.pop()
        if o.type == 'MESH' and not o.hide_render:
            out.append(o)
        stack.extend(o.children)
    return out


def projected_bounds(r):
    """Bornes en PIXELS DE DESSIN : x vers la droite, v = (y + z) vers le haut."""
    dg = bpy.context.evaluated_depsgraph_get()
    xs, vs = [], []
    for o in _meshes_under(r):
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ev.matrix_world
        for v in me.vertices:
            w = mw @ v.co
            xs.append(w.x / T * PX)
            vs.append((w.y + w.z) / T * PX)
        ev.to_mesh_clear()
    return min(xs), max(xs), min(vs), max(vs)


ORIENT = {"S": 0, "E": 1, "N": 2, "W": 3}   # quart de tour : la FACE du meuble regarde vers…


def orient(r, w, d, key):
    """Tourne le meuble (emprise w × d en mètres, coin avant-gauche à l'origine)
    pour que sa face regarde `key`, et le ramène dans [0, w'] × [0, d']."""
    q = ORIENT[key]
    r.rotation_euler = (0, 0, q * math.pi / 2)
    r.location = [(0, 0, 0), (d, 0, 0), (w, d, 0), (0, w, 0)][q]
    bpy.context.view_layer.update()
    return (w, d) if q % 2 == 0 else (d, w)


def render(r, path, margin=2):
    """Rend tout ce qui est sous `r`, cadré au pixel près. L'ANCRE est le pixel
    du point (0, 0, 0) — le coin avant-gauche de l'emprise, au sol — dans
    l'image (x vers la droite, y vers le bas). Écrit le PNG et rend la méta."""
    sc = bpy.context.scene
    cam = sc.camera
    x0, x1, v0, v1 = projected_bounds(r)
    left = math.floor(x0) - margin
    right = math.ceil(x1) + margin
    top = math.ceil(v1) + margin
    bot = math.floor(v0) - margin
    W, H = right - left, top - bot
    sc.render.resolution_x = W
    sc.render.resolution_y = H
    cam.data.ortho_scale = W / PX * T
    # Le centre de l'image est le point (cx, cv) en pixels ; on le pose au sol (z = 0).
    cx, cv = (left + right) / 2, (top + bot) / 2
    target = Vector((cx / PX * T, cv / PX * T, 0.0))
    cam.location = target - VIEW * 20.0
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return {"w": W, "h": H, "ax": -left, "ay": top}
