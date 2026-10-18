/* GÉNÉRÉ PAR tools/blender/rendre_meubles.py — NE PAS ÉDITER (2026-10-16).
   Par meuble et variante, par orientation (S, E, N, W : le côté vers lequel regarde
   la FACE du meuble) : la taille de l'image (w, h, px à studio.PX par case), son ANCRE (ax, ay :
   le pixel du coin avant-gauche de l'emprise, au sol) et l'emprise tournée (fw, fd,
   en mètres). L'image est servie en /maison/<meuble><variante>_<orientation>.png. */
export const MEUBLES = {
 "baignoire": {
  "S": {
   "ax": 3,
   "ay": 57,
   "fd": 0.68,
   "fw": 1.7,
   "h": 56,
   "w": 98
  }
 },
 "bibliotheque": {
  "E": {
   "ax": 3,
   "ay": 114,
   "fd": 1.0,
   "fw": 0.34,
   "h": 118,
   "w": 26
  },
  "N": {
   "ax": 5,
   "ay": 79,
   "fd": 0.34,
   "fw": 1.0,
   "h": 83,
   "w": 64
  },
  "S": {
   "ax": 5,
   "ay": 76,
   "fd": 0.34,
   "fw": 1.0,
   "h": 80,
   "w": 64
  },
  "W": {
   "ax": 5,
   "ay": 114,
   "fd": 1.0,
   "fw": 0.34,
   "h": 118,
   "w": 27
  }
 },
 "canape": {
  "E": {
   "ax": 3,
   "ay": 129,
   "fd": 2.0,
   "fw": 0.82,
   "h": 128,
   "w": 50
  },
  "N": {
   "ax": 4,
   "ay": 63,
   "fd": 0.82,
   "fw": 2.0,
   "h": 62,
   "w": 116
  },
  "S": {
   "ax": 3,
   "ay": 69,
   "fd": 0.82,
   "fw": 2.0,
   "h": 68,
   "w": 115
  },
  "W": {
   "ax": 2,
   "ay": 126,
   "fd": 2.0,
   "fw": 0.82,
   "h": 125,
   "w": 50
  }
 },
 "canape_canard": {
  "E": {
   "ax": 3,
   "ay": 129,
   "fd": 2.0,
   "fw": 0.82,
   "h": 128,
   "w": 50
  },
  "N": {
   "ax": 4,
   "ay": 63,
   "fd": 0.82,
   "fw": 2.0,
   "h": 62,
   "w": 116
  },
  "S": {
   "ax": 3,
   "ay": 69,
   "fd": 0.82,
   "fw": 2.0,
   "h": 68,
   "w": 115
  },
  "W": {
   "ax": 2,
   "ay": 126,
   "fd": 2.0,
   "fw": 0.82,
   "h": 125,
   "w": 50
  }
 },
 "cheminee": {
  "S": {
   "ax": 3,
   "ay": 62,
   "fd": 0.34,
   "fw": 1.36,
   "h": 66,
   "w": 80
  }
 },
 "cheminee_allume": {
  "S": {
   "ax": 3,
   "ay": 62,
   "fd": 0.34,
   "fw": 1.36,
   "h": 66,
   "w": 80
  }
 },
 "cuisiniere": {
  "S": {
   "ax": 3,
   "ay": 61,
   "fd": 0.55,
   "fw": 0.7,
   "h": 61,
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
   "ay": 58,
   "fd": 0.55,
   "fw": 1.18,
   "h": 57,
   "w": 72
  }
 },
 "fauteuil": {
  "E": {
   "ax": 3,
   "ay": 68,
   "fd": 0.92,
   "fw": 0.7,
   "h": 68,
   "w": 43
  },
  "N": {
   "ax": 3,
   "ay": 55,
   "fd": 0.7,
   "fw": 0.92,
   "h": 55,
   "w": 56
  },
  "S": {
   "ax": 3,
   "ay": 61,
   "fd": 0.7,
   "fw": 0.92,
   "h": 61,
   "w": 56
  },
  "W": {
   "ax": 2,
   "ay": 68,
   "fd": 0.92,
   "fw": 0.7,
   "h": 68,
   "w": 43
  }
 },
 "fauteuil_vert": {
  "E": {
   "ax": 3,
   "ay": 68,
   "fd": 0.92,
   "fw": 0.7,
   "h": 68,
   "w": 43
  },
  "N": {
   "ax": 3,
   "ay": 55,
   "fd": 0.7,
   "fw": 0.92,
   "h": 55,
   "w": 56
  },
  "S": {
   "ax": 3,
   "ay": 61,
   "fd": 0.7,
   "fw": 0.92,
   "h": 61,
   "w": 56
  },
  "W": {
   "ax": 2,
   "ay": 68,
   "fd": 0.92,
   "fw": 0.7,
   "h": 68,
   "w": 43
  }
 },
 "gueridon": {
  "S": {
   "ax": 3,
   "ay": 44,
   "fd": 0.46,
   "fw": 0.46,
   "h": 42,
   "w": 31
  }
 },
 "gueridon_allume": {
  "S": {
   "ax": 3,
   "ay": 44,
   "fd": 0.46,
   "fw": 0.46,
   "h": 42,
   "w": 31
  }
 },
 "lampadaire": {
  "S": {
   "ax": 4,
   "ay": 64,
   "fd": 0.4,
   "fw": 0.4,
   "h": 62,
   "w": 29
  }
 },
 "lampadaire_allume": {
  "S": {
   "ax": 4,
   "ay": 64,
   "fd": 0.4,
   "fw": 0.4,
   "h": 62,
   "w": 29
  }
 },
 "lampadaire_moutarde": {
  "S": {
   "ax": 4,
   "ay": 64,
   "fd": 0.4,
   "fw": 0.4,
   "h": 62,
   "w": 29
  }
 },
 "lampadaire_moutarde_allume": {
  "S": {
   "ax": 4,
   "ay": 64,
   "fd": 0.4,
   "fw": 0.4,
   "h": 62,
   "w": 29
  }
 },
 "lavabo": {
  "S": {
   "ax": 3,
   "ay": 47,
   "fd": 0.38,
   "fw": 0.56,
   "h": 43,
   "w": 37
  }
 },
 "lit": {
  "E": {
   "ax": 4,
   "ay": 114,
   "fd": 1.45,
   "fw": 2.05,
   "h": 117,
   "w": 119
  },
  "N": {
   "ax": 5,
   "ay": 131,
   "fd": 2.05,
   "fw": 1.45,
   "h": 134,
   "w": 88
  },
  "S": {
   "ax": 5,
   "ay": 146,
   "fd": 2.05,
   "fw": 1.45,
   "h": 150,
   "w": 88
  },
  "W": {
   "ax": 4,
   "ay": 114,
   "fd": 1.45,
   "fw": 2.05,
   "h": 117,
   "w": 119
  }
 },
 "plan_travail_118": {
  "S": {
   "ax": 4,
   "ay": 58,
   "fd": 0.55,
   "fw": 1.18,
   "h": 57,
   "w": 72
  }
 },
 "plan_travail_165": {
  "S": {
   "ax": 4,
   "ay": 58,
   "fd": 0.55,
   "fw": 1.65,
   "h": 57,
   "w": 97
  }
 },
 "plante_morte": {
  "S": {
   "ax": 7,
   "ay": 38,
   "fd": 0.42,
   "fw": 0.42,
   "h": 46,
   "w": 37
  }
 },
 "plante_verte": {
  "S": {
   "ax": 5,
   "ay": 59,
   "fd": 0.5,
   "fw": 0.5,
   "h": 55,
   "w": 38
  }
 },
 "poele": {
  "E": {
   "ax": 4,
   "ay": 55,
   "fd": 0.55,
   "fw": 0.4,
   "h": 56,
   "w": 30
  },
  "N": {
   "ax": 4,
   "ay": 47,
   "fd": 0.4,
   "fw": 0.55,
   "h": 48,
   "w": 38
  },
  "S": {
   "ax": 4,
   "ay": 50,
   "fd": 0.4,
   "fw": 0.55,
   "h": 51,
   "w": 38
  },
  "W": {
   "ax": 5,
   "ay": 55,
   "fd": 0.55,
   "fw": 0.4,
   "h": 56,
   "w": 31
  }
 },
 "portemanteau": {
  "E": {
   "ax": -2,
   "ay": 68,
   "fd": 0.62,
   "fw": 0.42,
   "h": 61,
   "w": 18
  },
  "S": {
   "ax": 1,
   "ay": 68,
   "fd": 0.42,
   "fw": 0.62,
   "h": 62,
   "w": 36
  }
 },
 "radiateur_11": {
  "S": {
   "ax": 6,
   "ay": 29,
   "fd": 0.12,
   "fw": 0.66,
   "h": 30,
   "w": 45
  }
 },
 "radiateur_14": {
  "S": {
   "ax": 6,
   "ay": 29,
   "fd": 0.12,
   "fw": 0.84,
   "h": 30,
   "w": 54
  }
 },
 "radiateur_8": {
  "S": {
   "ax": 6,
   "ay": 29,
   "fd": 0.12,
   "fw": 0.48,
   "h": 30,
   "w": 35
  }
 },
 "table_basse": {
  "E": {
   "ax": 3,
   "ay": 74,
   "fd": 1.1,
   "fw": 0.6,
   "h": 75,
   "w": 39
  },
  "S": {
   "ax": 3,
   "ay": 47,
   "fd": 0.6,
   "fw": 1.1,
   "h": 48,
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
   "ay": 54,
   "fd": 0.55,
   "fw": 0.4,
   "h": 52,
   "w": 26
  }
 }
};
