/* GÉNÉRÉ PAR tools/blender/rendre_meubles.py — NE PAS ÉDITER (2026-10-16).
   Par meuble et variante, par orientation (S, E, N, W : le côté vers lequel regarde
   la FACE du meuble) : la taille de l'image (w, h, px à studio.PX par case), son ANCRE (ax, ay :
   le pixel du coin avant-gauche de l'emprise, au sol) et l'emprise tournée (fw, fd,
   en mètres). L'image est servie en /maison/<meuble><variante>_<orientation>.png. */
export const MEUBLES = {
 "baignoire": {
  "S": {
   "ax": 3,
   "ay": 79,
   "fd": 0.68,
   "fw": 1.7,
   "h": 78,
   "w": 98
  }
 },
 "bibliotheque": {
  "E": {
   "ax": 3,
   "ay": 168,
   "fd": 1.0,
   "fw": 0.34,
   "h": 172,
   "w": 26
  },
  "N": {
   "ax": 5,
   "ay": 137,
   "fd": 0.34,
   "fw": 1.0,
   "h": 141,
   "w": 64
  },
  "S": {
   "ax": 5,
   "ay": 136,
   "fd": 0.34,
   "fw": 1.0,
   "h": 140,
   "w": 64
  },
  "W": {
   "ax": 5,
   "ay": 170,
   "fd": 1.0,
   "fw": 0.34,
   "h": 174,
   "w": 27
  }
 },
 "canape": {
  "E": {
   "ax": 3,
   "ay": 148,
   "fd": 2.0,
   "fw": 0.82,
   "h": 147,
   "w": 50
  },
  "N": {
   "ax": 4,
   "ay": 79,
   "fd": 0.82,
   "fw": 2.0,
   "h": 78,
   "w": 116
  },
  "S": {
   "ax": 3,
   "ay": 91,
   "fd": 0.82,
   "fw": 2.0,
   "h": 90,
   "w": 115
  },
  "W": {
   "ax": 2,
   "ay": 148,
   "fd": 2.0,
   "fw": 0.82,
   "h": 147,
   "w": 50
  }
 },
 "canape_canard": {
  "E": {
   "ax": 3,
   "ay": 148,
   "fd": 2.0,
   "fw": 0.82,
   "h": 147,
   "w": 50
  },
  "N": {
   "ax": 4,
   "ay": 79,
   "fd": 0.82,
   "fw": 2.0,
   "h": 78,
   "w": 116
  },
  "S": {
   "ax": 3,
   "ay": 91,
   "fd": 0.82,
   "fw": 2.0,
   "h": 90,
   "w": 115
  },
  "W": {
   "ax": 2,
   "ay": 148,
   "fd": 2.0,
   "fw": 0.82,
   "h": 147,
   "w": 50
  }
 },
 "cheminee": {
  "S": {
   "ax": 3,
   "ay": 88,
   "fd": 0.34,
   "fw": 1.36,
   "h": 92,
   "w": 80
  }
 },
 "cheminee_allume": {
  "S": {
   "ax": 3,
   "ay": 88,
   "fd": 0.34,
   "fw": 1.36,
   "h": 92,
   "w": 80
  }
 },
 "cuisiniere": {
  "S": {
   "ax": 3,
   "ay": 88,
   "fd": 0.55,
   "fw": 0.7,
   "h": 88,
   "w": 44
  }
 },
 "escalier": {
  "S": {
   "ax": 5,
   "ay": 360,
   "fd": 2.955,
   "fw": 1.0,
   "h": 367,
   "w": 62
  }
 },
 "evier": {
  "S": {
   "ax": 4,
   "ay": 84,
   "fd": 0.55,
   "fw": 1.18,
   "h": 83,
   "w": 72
  }
 },
 "fauteuil": {
  "E": {
   "ax": 3,
   "ay": 90,
   "fd": 0.92,
   "fw": 0.7,
   "h": 90,
   "w": 43
  },
  "N": {
   "ax": 3,
   "ay": 72,
   "fd": 0.7,
   "fw": 0.92,
   "h": 72,
   "w": 56
  },
  "S": {
   "ax": 3,
   "ay": 83,
   "fd": 0.7,
   "fw": 0.92,
   "h": 83,
   "w": 56
  },
  "W": {
   "ax": 2,
   "ay": 90,
   "fd": 0.92,
   "fw": 0.7,
   "h": 90,
   "w": 43
  }
 },
 "fauteuil_vert": {
  "E": {
   "ax": 3,
   "ay": 90,
   "fd": 0.92,
   "fw": 0.7,
   "h": 90,
   "w": 43
  },
  "N": {
   "ax": 3,
   "ay": 72,
   "fd": 0.7,
   "fw": 0.92,
   "h": 72,
   "w": 56
  },
  "S": {
   "ax": 3,
   "ay": 83,
   "fd": 0.7,
   "fw": 0.92,
   "h": 83,
   "w": 56
  },
  "W": {
   "ax": 2,
   "ay": 90,
   "fd": 0.92,
   "fw": 0.7,
   "h": 90,
   "w": 43
  }
 },
 "gueridon": {
  "S": {
   "ax": 3,
   "ay": 67,
   "fd": 0.46,
   "fw": 0.46,
   "h": 65,
   "w": 31
  }
 },
 "gueridon_allume": {
  "S": {
   "ax": 3,
   "ay": 67,
   "fd": 0.46,
   "fw": 0.46,
   "h": 65,
   "w": 31
  }
 },
 "lampadaire": {
  "S": {
   "ax": 4,
   "ay": 108,
   "fd": 0.4,
   "fw": 0.4,
   "h": 106,
   "w": 29
  }
 },
 "lampadaire_allume": {
  "S": {
   "ax": 4,
   "ay": 108,
   "fd": 0.4,
   "fw": 0.4,
   "h": 106,
   "w": 29
  }
 },
 "lampadaire_moutarde": {
  "S": {
   "ax": 4,
   "ay": 108,
   "fd": 0.4,
   "fw": 0.4,
   "h": 106,
   "w": 29
  }
 },
 "lampadaire_moutarde_allume": {
  "S": {
   "ax": 4,
   "ay": 108,
   "fd": 0.4,
   "fw": 0.4,
   "h": 106,
   "w": 29
  }
 },
 "lavabo": {
  "S": {
   "ax": 3,
   "ay": 72,
   "fd": 0.38,
   "fw": 0.56,
   "h": 68,
   "w": 37
  }
 },
 "lit": {
  "E": {
   "ax": 4,
   "ay": 146,
   "fd": 1.45,
   "fw": 2.05,
   "h": 149,
   "w": 119
  },
  "N": {
   "ax": 5,
   "ay": 147,
   "fd": 2.05,
   "fw": 1.45,
   "h": 150,
   "w": 88
  },
  "S": {
   "ax": 5,
   "ay": 178,
   "fd": 2.05,
   "fw": 1.45,
   "h": 182,
   "w": 88
  },
  "W": {
   "ax": 4,
   "ay": 146,
   "fd": 1.45,
   "fw": 2.05,
   "h": 149,
   "w": 119
  }
 },
 "plan_travail_118": {
  "S": {
   "ax": 4,
   "ay": 84,
   "fd": 0.55,
   "fw": 1.18,
   "h": 83,
   "w": 72
  }
 },
 "plan_travail_165": {
  "S": {
   "ax": 4,
   "ay": 87,
   "fd": 0.55,
   "fw": 1.65,
   "h": 86,
   "w": 97
  }
 },
 "plante_morte": {
  "S": {
   "ax": 7,
   "ay": 59,
   "fd": 0.42,
   "fw": 0.42,
   "h": 67,
   "w": 37
  }
 },
 "plante_verte": {
  "S": {
   "ax": 5,
   "ay": 95,
   "fd": 0.5,
   "fw": 0.5,
   "h": 91,
   "w": 38
  }
 },
 "poele": {
  "E": {
   "ax": 20,
   "ay": 121,
   "fd": 0.55,
   "fw": 0.4,
   "h": 122,
   "w": 46
  },
  "N": {
   "ax": 4,
   "ay": 111,
   "fd": 0.4,
   "fw": 0.55,
   "h": 112,
   "w": 38
  },
  "S": {
   "ax": 4,
   "ay": 142,
   "fd": 0.4,
   "fw": 0.55,
   "h": 143,
   "w": 38
  },
  "W": {
   "ax": 5,
   "ay": 121,
   "fd": 0.55,
   "fw": 0.4,
   "h": 122,
   "w": 46
  }
 },
 "portemanteau": {
  "E": {
   "ax": -2,
   "ay": 116,
   "fd": 0.62,
   "fw": 0.42,
   "h": 109,
   "w": 18
  },
  "S": {
   "ax": 1,
   "ay": 116,
   "fd": 0.42,
   "fw": 0.62,
   "h": 110,
   "w": 36
  }
 },
 "radiateur_11": {
  "S": {
   "ax": 6,
   "ay": 48,
   "fd": 0.12,
   "fw": 0.66,
   "h": 49,
   "w": 45
  }
 },
 "radiateur_14": {
  "S": {
   "ax": 6,
   "ay": 48,
   "fd": 0.12,
   "fw": 0.84,
   "h": 49,
   "w": 54
  }
 },
 "radiateur_8": {
  "S": {
   "ax": 6,
   "ay": 48,
   "fd": 0.12,
   "fw": 0.48,
   "h": 49,
   "w": 35
  }
 },
 "table_basse": {
  "E": {
   "ax": 3,
   "ay": 86,
   "fd": 1.1,
   "fw": 0.6,
   "h": 87,
   "w": 39
  },
  "S": {
   "ax": 3,
   "ay": 62,
   "fd": 0.6,
   "fw": 1.1,
   "h": 63,
   "w": 66
  }
 },
 "tableau": {
  "S": {
   "ax": 3,
   "ay": 104,
   "fd": 0.04,
   "fw": 0.8,
   "h": 43,
   "w": 50
  }
 },
 "tapis": {
  "E": {
   "ax": 3,
   "ay": 125,
   "fd": 2.2,
   "fw": 1.6,
   "h": 131,
   "w": 93
  },
  "S": {
   "ax": 6,
   "ay": 91,
   "fd": 1.6,
   "fw": 2.2,
   "h": 95,
   "w": 131
  }
 },
 "tapis_bleu": {
  "E": {
   "ax": 3,
   "ay": 125,
   "fd": 2.2,
   "fw": 1.6,
   "h": 131,
   "w": 93
  },
  "S": {
   "ax": 6,
   "ay": 91,
   "fd": 1.6,
   "fw": 2.2,
   "h": 95,
   "w": 131
  }
 },
 "wc": {
  "S": {
   "ax": 2,
   "ay": 75,
   "fd": 0.55,
   "fw": 0.4,
   "h": 73,
   "w": 26
  }
 }
};
