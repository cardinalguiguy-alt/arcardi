/* =============================================================================
   patin.js — LE PATIN À GLACE DE VALLEY TOWN (2026-10-04), PUR.
   -----------------------------------------------------------------------------
   Guillaume : « des patins dispos à l'achat pour monter sur le lac gelé et le
   body of water au sud » ; tranché avec lui : un étal d'hiver au bord du lac,
   « très chic et couvert » ; « si on monte sur la glace sans patins on glisse et
   se blesse (même blessure prévue, temps de 15 vraies minutes) ».

   Ce fichier ne sait rien du jeu ni du dessin : il fait avancer une MACHINE
   D'ÉTAT du patineur à partir de l'ordre donné (une direction unitaire ou nulle),
   et rend la vitesse voulue. Le jeu l'applique axe par axe à travers la même
   collision que la marche (`canStandTown`) et signale les chocs (`skateBump`) —
   exactement le contrat de la glissade du cratère (`Q.starSlipStep`, quete.js).
   `tools/verify-patin.mjs` le joue : un tour de lac, un arrêt, une chute.

   ⚠️⚠️ CE QUI FAIT UN PATIN ET PAS UNE MARCHE RAPIDE, EN TROIS NOMBRES :
     · l'ÉLAN : sans ordre, la vitesse ne décroît qu'au taux `GLIDE_K` — neuf
       cases de lancée depuis la croisière (à 0,28, premier chiffre : vingt-sept,
       on traversait le lac sans pouvoir s'arrêter avant le quai d'en face) ;
     · le VIRAGE LARGE : avec un ordre, seule la part de vitesse PERPENDICULAIRE
       à l'ordre est mangée (`TURN_K`, les carres qui mordent) ; tourner, c'est
       courber sa trajectoire, jamais pivoter sur place ;
     · le FREINAGE : un ordre à contresens (`BRAKE_DOT`) ne fait pas repartir en
       arrière, il fait déraper en travers (`BRAKE`) — l'arrêt de hockey, avec sa
       gerbe de glace (le jeu la peint, `st.brake`).
   ⚠️ SANS PATINS, ON NE CONTRÔLE PLUS RIEN : la vitesse d'entrée continue presque
   seule (`SLIP_ACC` infime), les bras moulinent `SLIP_T` secondes, puis la chute
   (`FALL_T`) — et `mode === "down"` dit au jeu d'appliquer la blessure. C'est
   inévitable une fois sur la glace, et c'est voulu (la demande le dit) : le
   jeu prévient à la berge, une fois, avant le premier pas.
   ⚠️ AUCUN NOMBRE TIRÉ AU HASARD, AUCUNE HORLOGE LUE : `dt` est passé, l'état
   est rendu. Les autres joueurs ne reçoivent que la position, comme toujours ;
   la pose qu'ils voient se DÉDUIT (`skateSeen`, §3 de CLAUDE.md).
   ========================================================================== */

export const SKATE = {
  ACC: 6.2,            // cases/s² : la poussée, le long de l'ordre
  VMAX: 7.6,           // cases/s : la croisière (la marche fait 5,2, la course 9,1)
  VMAX_RUN: 9.4,       // en appuyant sur la course : on pousse plus fort, pas plus longtemps
  GLIDE_K: 0.85,       // /s : ce que perd la lancée sans ordre — v/k ≈ 9 cases de glisse depuis la croisière
  TURN_K: 2.6,         // /s : la part perpendiculaire mangée par les carres
  BRAKE: 13,           // cases/s² : l'arrêt en travers
  BRAKE_DOT: -0.3,     // ordre · sens de la vitesse sous lequel on freine au lieu de tourner
  BRAKE_MIN_V: 1.2,    // sous cette vitesse, un ordre à contresens repart simplement de l'autre côté
  BOUNCE: 0.22,        // ce qui revient d'un choc contre la berge (en sens inverse)
  STOP_V: 0.08,        // sous cette vitesse, on est arrêté
  /* Sans patins : la glissade incontrôlée, la chute, le temps au sol. */
  SLIP_T: 0.95, FALL_T: 1.5,
  SLIP_ACC: 0.9, SLIP_K: 0.18, FALL_K: 7,
  /* La foulée : une poussée par jambe, sa cadence monte avec la vitesse. */
  STRIDE_BASE: 1.6, STRIDE_PER_V: 0.22,
};

export function skateNew(vx = 0, vy = 0) {
  return { vx, vy, mode: "glide", t: 0, stride: 0, brake: 0, push: 0, bump: 0 };
}
/* Mettre à jour la machine depuis l'ordre (ix, iy) — unitaire ou nul — pendant
   `dt` secondes. `o.skates` : chaussé ou non ; `o.run` : la touche de course.
   Mute `st` et le rend. */
export function skateStep(st, ix, iy, dt, o) {
  const K = SKATE;
  const skates = !!(o && o.skates);
  st.bump = Math.max(0, st.bump - dt);
  st.brake = 0; st.push = 0;
  if (!skates) {
    /* ── SANS PATINS : on glisse, on mouline, on tombe. ── */
    if (st.mode === "glide") { st.mode = "slip"; st.t = 0; }
    st.t += dt;
    if (st.mode === "slip") {
      st.vx += ix * K.SLIP_ACC * dt; st.vy += iy * K.SLIP_ACC * dt;
      const k = Math.exp(-K.SLIP_K * dt); st.vx *= k; st.vy *= k;
      if (st.t >= K.SLIP_T) st.mode = "fall";
    } else if (st.mode === "fall") {
      const k = Math.exp(-K.FALL_K * dt); st.vx *= k; st.vy *= k;
      if (st.t >= K.SLIP_T + K.FALL_T) { st.mode = "down"; st.vx = 0; st.vy = 0; }
    } else { st.vx = 0; st.vy = 0; }
    return st;
  }
  /* ── CHAUSSÉ. ── */
  st.mode = "glide";
  const sp = Math.hypot(st.vx, st.vy);
  const vmax = o && o.run ? K.VMAX_RUN : K.VMAX;
  if (ix || iy) {
    const dot = sp > 1e-6 ? (ix * st.vx + iy * st.vy) / sp : 1;
    if (sp > K.BRAKE_MIN_V && dot < K.BRAKE_DOT) {
      // L'arrêt en travers : on mange la vitesse, on ne la retourne pas.
      const nsp = Math.max(0, sp - K.BRAKE * dt);
      st.vx *= nsp / sp; st.vy *= nsp / sp;
      st.brake = 1;
    } else {
      // La poussée le long de l'ordre, puis les carres mangent ce qui part de travers.
      st.vx += ix * K.ACC * dt; st.vy += iy * K.ACC * dt;
      const par = st.vx * ix + st.vy * iy;
      const kp = Math.exp(-K.TURN_K * dt);
      st.vx = ix * par + (st.vx - ix * par) * kp;
      st.vy = iy * par + (st.vy - iy * par) * kp;
      const s2 = Math.hypot(st.vx, st.vy);
      if (s2 > vmax) { st.vx *= vmax / s2; st.vy *= vmax / s2; }
      else st.push = 1;
    }
  } else {
    const k = Math.exp(-K.GLIDE_K * dt); st.vx *= k; st.vy *= k;
  }
  const s3 = Math.hypot(st.vx, st.vy);
  if (s3 < K.STOP_V && !(ix || iy)) { st.vx = 0; st.vy = 0; }
  /* La foulée n'avance que quand on POUSSE : en roue libre, les jambes restent
     jointes (on file), elles ne pédalent pas dans le vide. */
  if (st.push) st.stride += dt * (K.STRIDE_BASE + K.STRIDE_PER_V * s3);
  return st;
}
/* Un axe a buté (la berge, l'eau libre, un pieu) : sa vitesse revient un peu, en
   sens inverse. `axis` : "x" ou "y". Rend la vitesse du choc (pour la gerbe). */
export function skateBump(st, axis) {
  const v = axis === "x" ? st.vx : st.vy;
  if (axis === "x") st.vx = -v * SKATE.BOUNCE; else st.vy = -v * SKATE.BOUNCE;
  if (Math.abs(v) > 1.5) st.bump = 0.25;
  return Math.abs(v);
}
/* MA pose, lue sur ma machine : "glide" (en mouvement), "stand" (immobile sur
   ses lames), "brake", "slip" (les bras moulinent), "fall" (assis sur la glace). */
export function skatePose(st) {
  if (!st) return null;
  if (st.mode === "slip") return "slip";
  if (st.mode === "fall" || st.mode === "down") return "fall";
  if (st.brake) return "brake";
  return Math.hypot(st.vx, st.vy) > 0.35 ? "glide" : "stand";
}
/* LA POSE DES AUTRES, DÉDUITE (rien ne circule de plus) : sur la glace, chaussé,
   on glisse ou on se tient ; déchaussé, on mouline tant qu'on bouge, et un
   déchaussé immobile sur la glace est un déchaussé tombé. */
export function skateSeen(hasSkates, vx, vy) {
  const sp = Math.hypot(vx || 0, vy || 0);
  if (hasSkates) return sp > 0.6 ? "glide" : "stand";
  return sp > 0.3 ? "slip" : "fall";
}
/* La phase de foulée d'un patineur qu'on ne fait que voir : sa distance parcourue
   au rythme de la croisière. Rend un réel dont la partie entière alterne les jambes. */
export function skateSeenStride(dist) {
  return dist / 2.4;
}
