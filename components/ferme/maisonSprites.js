/* GÉNÉRÉ PAR tools/blender/rendre_meubles.py — NE PAS ÉDITER (2026-10-16).
   Par meuble et variante, par orientation (S, E, N, W : le côté vers lequel regarde
   la FACE du meuble) : la taille de l'image (w, h, px à 32 par case), son ANCRE (ax, ay :
   le pixel du coin avant-gauche de l'emprise, au sol) et l'emprise tournée (fw, fd,
   en mètres). L'image est servie en /maison/<meuble><variante>_<orientation>.png. */
export const MEUBLES = {
 "bibliotheque": {
  "E": {
   "ax": 3,
   "ay": 86,
   "fd": 1.0,
   "fw": 0.34,
   "h": 90,
   "w": 16
  },
  "N": {
   "ax": 4,
   "ay": 70,
   "fd": 0.34,
   "fw": 1.0,
   "h": 74,
   "w": 35
  },
  "S": {
   "ax": 4,
   "ay": 70,
   "fd": 0.34,
   "fw": 1.0,
   "h": 74,
   "w": 35
  },
  "W": {
   "ax": 4,
   "ay": 87,
   "fd": 1.0,
   "fw": 0.34,
   "h": 91,
   "w": 17
  }
 },
 "canape": {
  "E": {
   "ax": 3,
   "ay": 76,
   "fd": 2.0,
   "fw": 0.9,
   "h": 77,
   "w": 30
  },
  "N": {
   "ax": 3,
   "ay": 43,
   "fd": 0.9,
   "fw": 2.0,
   "h": 44,
   "w": 60
  },
  "S": {
   "ax": 3,
   "ay": 50,
   "fd": 0.9,
   "fw": 2.0,
   "h": 51,
   "w": 60
  },
  "W": {
   "ax": 3,
   "ay": 76,
   "fd": 2.0,
   "fw": 0.9,
   "h": 77,
   "w": 31
  }
 },
 "canape_canard": {
  "E": {
   "ax": 3,
   "ay": 76,
   "fd": 2.0,
   "fw": 0.9,
   "h": 77,
   "w": 30
  },
  "N": {
   "ax": 3,
   "ay": 43,
   "fd": 0.9,
   "fw": 2.0,
   "h": 44,
   "w": 60
  },
  "S": {
   "ax": 3,
   "ay": 50,
   "fd": 0.9,
   "fw": 2.0,
   "h": 51,
   "w": 60
  },
  "W": {
   "ax": 3,
   "ay": 76,
   "fd": 2.0,
   "fw": 0.9,
   "h": 77,
   "w": 31
  }
 },
 "escalier": {
  "S": {
   "ax": 4,
   "ay": 182,
   "fd": 2.955,
   "fw": 1.0,
   "h": 187,
   "w": 34
  }
 },
 "fauteuil": {
  "E": {
   "ax": 3,
   "ay": 45,
   "fd": 0.86,
   "fw": 0.86,
   "h": 46,
   "w": 29
  },
  "N": {
   "ax": 3,
   "ay": 42,
   "fd": 0.86,
   "fw": 0.86,
   "h": 43,
   "w": 30
  },
  "S": {
   "ax": 3,
   "ay": 48,
   "fd": 0.86,
   "fw": 0.86,
   "h": 49,
   "w": 30
  },
  "W": {
   "ax": 3,
   "ay": 45,
   "fd": 0.86,
   "fw": 0.86,
   "h": 46,
   "w": 30
  }
 },
 "fauteuil_vert": {
  "E": {
   "ax": 3,
   "ay": 45,
   "fd": 0.86,
   "fw": 0.86,
   "h": 46,
   "w": 29
  },
  "N": {
   "ax": 3,
   "ay": 42,
   "fd": 0.86,
   "fw": 0.86,
   "h": 43,
   "w": 30
  },
  "S": {
   "ax": 3,
   "ay": 48,
   "fd": 0.86,
   "fw": 0.86,
   "h": 49,
   "w": 30
  },
  "W": {
   "ax": 3,
   "ay": 45,
   "fd": 0.86,
   "fw": 0.86,
   "h": 46,
   "w": 30
  }
 },
 "gueridon": {
  "S": {
   "ax": 3,
   "ay": 36,
   "fd": 0.46,
   "fw": 0.46,
   "h": 37,
   "w": 19
  }
 },
 "gueridon_allume": {
  "S": {
   "ax": 3,
   "ay": 36,
   "fd": 0.46,
   "fw": 0.46,
   "h": 37,
   "w": 19
  }
 },
 "lampadaire": {
  "S": {
   "ax": 4,
   "ay": 56,
   "fd": 0.4,
   "fw": 0.4,
   "h": 57,
   "w": 18
  }
 },
 "lampadaire_allume": {
  "S": {
   "ax": 4,
   "ay": 56,
   "fd": 0.4,
   "fw": 0.4,
   "h": 57,
   "w": 18
  }
 },
 "lampadaire_moutarde": {
  "S": {
   "ax": 4,
   "ay": 56,
   "fd": 0.4,
   "fw": 0.4,
   "h": 57,
   "w": 18
  }
 },
 "lampadaire_moutarde_allume": {
  "S": {
   "ax": 4,
   "ay": 56,
   "fd": 0.4,
   "fw": 0.4,
   "h": 57,
   "w": 18
  }
 },
 "lit": {
  "E": {
   "ax": 3,
   "ay": 71,
   "fd": 1.45,
   "fw": 2.05,
   "h": 75,
   "w": 62
  },
  "N": {
   "ax": 3,
   "ay": 72,
   "fd": 2.05,
   "fw": 1.45,
   "h": 76,
   "w": 46
  },
  "S": {
   "ax": 4,
   "ay": 87,
   "fd": 2.05,
   "fw": 1.45,
   "h": 91,
   "w": 47
  },
  "W": {
   "ax": 3,
   "ay": 71,
   "fd": 1.45,
   "fw": 2.05,
   "h": 75,
   "w": 62
  }
 },
 "plante_morte": {
  "S": {
   "ax": 5,
   "ay": 31,
   "fd": 0.42,
   "fw": 0.42,
   "h": 36,
   "w": 21
  }
 },
 "plante_verte": {
  "S": {
   "ax": 3,
   "ay": 49,
   "fd": 0.5,
   "fw": 0.5,
   "h": 49,
   "w": 21
  }
 },
 "poele": {
  "E": {
   "ax": 10,
   "ay": 62,
   "fd": 0.55,
   "fw": 0.45,
   "h": 64,
   "w": 26
  },
  "N": {
   "ax": 4,
   "ay": 59,
   "fd": 0.45,
   "fw": 0.55,
   "h": 61,
   "w": 23
  },
  "S": {
   "ax": 4,
   "ay": 73,
   "fd": 0.45,
   "fw": 0.55,
   "h": 75,
   "w": 23
  },
  "W": {
   "ax": 4,
   "ay": 62,
   "fd": 0.55,
   "fw": 0.45,
   "h": 64,
   "w": 26
  }
 },
 "portemanteau": {
  "E": {
   "ax": 0,
   "ay": 60,
   "fd": 0.62,
   "fw": 0.42,
   "h": 58,
   "w": 11
  },
  "S": {
   "ax": 2,
   "ay": 60,
   "fd": 0.42,
   "fw": 0.62,
   "h": 59,
   "w": 21
  }
 },
 "table_basse": {
  "E": {
   "ax": 3,
   "ay": 45,
   "fd": 1.1,
   "fw": 0.6,
   "h": 47,
   "w": 23
  },
  "S": {
   "ax": 3,
   "ay": 31,
   "fd": 0.6,
   "fw": 1.1,
   "h": 33,
   "w": 36
  }
 },
 "tableau": {
  "S": {
   "ax": 3,
   "ay": 54,
   "fd": 0.04,
   "fw": 0.8,
   "h": 25,
   "w": 28
  }
 },
 "tapis": {
  "E": {
   "ax": 3,
   "ay": 64,
   "fd": 2.2,
   "fw": 1.6,
   "h": 68,
   "w": 49
  },
  "S": {
   "ax": 4,
   "ay": 47,
   "fd": 1.6,
   "fw": 2.2,
   "h": 51,
   "w": 68
  }
 },
 "tapis_bleu": {
  "E": {
   "ax": 3,
   "ay": 64,
   "fd": 2.2,
   "fw": 1.6,
   "h": 68,
   "w": 49
  },
  "S": {
   "ax": 4,
   "ay": 47,
   "fd": 1.6,
   "fw": 2.2,
   "h": 51,
   "w": 68
  }
 }
};
