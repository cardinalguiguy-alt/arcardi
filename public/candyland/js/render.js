/* =============================================================================
   render.js — Tout le dessin du mini-jeu (zip 385).
   -----------------------------------------------------------------------------
   Aucune logique de jeu ici, et aucun état modifié : `draw` prend un état de
   physique et le peint. La séparation est la même que côté ferme entre
   fermeArt.js et FermeGame.js, et elle sert la même chose — on peut changer
   l'allure du Gourmandin sans jamais toucher à la trajectoire du bonbon.

   Tout est tracé au code, comme le pixel art de la ferme : aucune image
   bitmap dans tout le mini-jeu. C'est la signature du site.
   ========================================================================== */

const Render = (function () {

  /* Le canvas est mis à l'échelle pour tenir dans la fenêtre en gardant le
     rapport 4:3 de la scène logique. On centre le reste en bandes. Le jeu se
     joue donc pareil partout — voir l'en-tête de config.js. */
  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const availW = window.innerWidth, availH = window.innerHeight;
    const scale = Math.min(availW / CFG.W, availH / CFG.H);
    canvas.style.width = Math.round(CFG.W * scale) + "px";
    canvas.style.height = Math.round(CFG.H * scale) + "px";
    canvas.width = Math.round(CFG.W * scale * dpr);
    canvas.height = Math.round(CFG.H * scale * dpr);
    return scale * dpr;
  }

  // Écran -> scène. Sans ça, toute la coupe serait fausse dès qu'on
  // redimensionne la fenêtre.
  function toScene(canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * CFG.W,
      y: (clientY - r.top) / r.height * CFG.H,
    };
  }

  /* -------------------------------------------------------------- décor -- */
  function drawBackground(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g.addColorStop(0, CFG.COL_BG_TOP);
    g.addColorStop(1, CFG.COL_BG_BOT);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // Collines de guimauve, deux plans, immobiles : le décor ne doit jamais
    // attirer l'œil pendant qu'on vise une corde.
    ctx.fillStyle = CFG.COL_HILL_1;
    ctx.beginPath();
    ctx.moveTo(0, CFG.H);
    for (let x = 0; x <= CFG.W; x += 40) ctx.lineTo(x, 470 + Math.sin(x * 0.011) * 26);
    ctx.lineTo(CFG.W, CFG.H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = CFG.COL_HILL_2;
    ctx.beginPath();
    ctx.moveTo(0, CFG.H);
    for (let x = 0; x <= CFG.W; x += 40) ctx.lineTo(x, 545 + Math.cos(x * 0.014) * 18);
    ctx.lineTo(CFG.W, CFG.H); ctx.closePath(); ctx.fill();

    // Nuages de barbe à papa, très pâles.
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    for (let i = 0; i < 5; i++) {
      const cx = 90 + i * 165 + Math.sin(t / 4200 + i) * 12, cy = 80 + (i % 3) * 42;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(cx + k * 22 - 30, cy + (k === 1 || k === 2 ? -9 : 0), 20 + (k % 2) * 7, 0, 7);
        ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------- le Gourmandin --
     Dessiné AUTOUR de la bouche : le niveau ne décrit qu'un cercle, et le
     monstre s'installe dessus. Un monstre posé indépendamment finirait tôt ou
     tard décalé par rapport à la zone qui gagne, ce qui est le pire défaut
     possible pour ce jeu — le joueur viserait une bouche qui n'est pas là. */
  function drawMonster(ctx, mouth, t, eating) {
    const R = mouth.r, cx = mouth.x, cy = mouth.y;
    const bodyR = R * 2.35;
    const breathe = Math.sin(t / 700) * (R * 0.035);

    ctx.save();
    ctx.translate(cx, cy + bodyR * 0.42 + breathe);

    // Corps hirsute : un disque dont le bord est découpé en mèches. Le tirage
    // dérive de l'angle, jamais du hasard — sinon la fourrure grouillerait
    // d'une image à l'autre.
    ctx.beginPath();
    const N = 46;
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2;
      const spike = (i % 2 === 0 ? 1 : 0.9) + Math.sin(a * 7) * 0.045;
      const rr = bodyR * spike;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = CFG.COL_MONSTER; ctx.fill();
    ctx.strokeStyle = CFG.COL_MONSTER_DARK; ctx.lineWidth = 3; ctx.stroke();

    // Pastilles de bonbon prises dans le pelage.
    const dots = ["#ff6f9e", "#ffd23f", "#7ce0f0", "#a8e02a"];
    for (let i = 0; i < 10; i++) {
      const a = i * 2.399, rr = bodyR * (0.35 + (i % 4) * 0.14);
      ctx.fillStyle = dots[i % 4];
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.9 + bodyR * 0.18, 5, 0, 7);
      ctx.fill();
    }
    ctx.restore();

    // Bouche : c'est LA zone de victoire, dessinée à son rayon exact. Elle
    // s'ouvre plus grand quand le bonbon approche (`eating`), ce qui donne le
    // seul retour visuel de « tu vas y arriver » du jeu.
    const open = 1 + eating * 0.22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath(); ctx.ellipse(0, 0, R * open, R * open * 0.92, 0, 0, 7);
    ctx.fillStyle = CFG.COL_MONSTER_MOUTH; ctx.fill();
    ctx.strokeStyle = CFG.COL_MONSTER_DARK; ctx.lineWidth = 4; ctx.stroke();

    // Langue, puis dents par-dessus.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, R * open, R * open * 0.92, 0, 0, 7); ctx.clip();
    ctx.fillStyle = CFG.COL_MONSTER_TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, R * open * 0.72 + Math.sin(t / 380) * 2, R * 0.72, R * 0.48, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fffdf6";
    for (let i = -2; i <= 2; i++) {
      const w = R * 0.19;
      ctx.beginPath();
      ctx.moveTo(i * w * 1.35 - w / 2, -R * open * 0.93);
      ctx.lineTo(i * w * 1.35 + w / 2, -R * open * 0.93);
      ctx.lineTo(i * w * 1.35, -R * open * 0.93 + R * 0.32);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // Yeux, au-dessus de la bouche. La pupille suit le bonbon : c'est ce qui
    // fait qu'on lit une créature et pas un trou.
    const eyeY = cy - R * 1.5, eyeDX = R * 0.78, eyeR = R * 0.46;
    for (const sx of [-1, 1]) {
      const ex = cx + sx * eyeDX;
      ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, 7);
      ctx.fillStyle = "#fffdf6"; ctx.fill();
      ctx.strokeStyle = CFG.COL_MONSTER_DARK; ctx.lineWidth = 2.5; ctx.stroke();
    }
    return { eyeY, eyeDX, eyeR };
  }

  function drawPupils(ctx, mouth, eyes, target) {
    const R = mouth.r;
    for (const sx of [-1, 1]) {
      const ex = mouth.x + sx * eyes.eyeDX;
      let dx = 0, dy = 0;
      if (target) {
        dx = target.x - ex; dy = target.y - eyes.eyeY;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(eyes.eyeR * 0.42, d) / d;
        dx *= k; dy *= k;
      }
      ctx.beginPath();
      ctx.arc(ex + dx, eyes.eyeY + dy, R * 0.2, 0, 7);
      ctx.fillStyle = "#20122e"; ctx.fill();
    }
  }

  /* -------------------------------------------------------------- objets -- */
  function drawRope(ctx, r, cand) {
    if (r.cut) return;
    const dx = cand.x - r.ax, dy = cand.y - r.ay;
    const d = Math.hypot(dx, dy);
    // Molle quand elle n'est pas tendue : la flèche vaut ce qui reste de
    // longueur. C'est la seule façon de VOIR qu'une corde ne retient rien.
    const slackAmt = Math.max(0, r.len - d);
    const nx = -dy / (d || 1), ny = dx / (d || 1);
    ctx.beginPath();
    for (let i = 0; i <= CFG.ROPE_SEGMENTS; i++) {
      const u = i / CFG.ROPE_SEGMENTS;
      const bow = Math.sin(u * Math.PI) * slackAmt * 0.5;
      const x = r.ax + dx * u + nx * bow * 0.15;
      const y = r.ay + dy * u + ny * bow * 0.15 + bow * 0.85;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = CFG.COL_ROPE; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
    ctx.strokeStyle = CFG.COL_ROPE_HI; ctx.lineWidth = 1.6; ctx.stroke();

    ctx.beginPath(); ctx.arc(r.ax, r.ay, 7, 0, 7);
    ctx.fillStyle = CFG.COL_ANCHOR; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawCandy(ctx, st, t) {
    const c = st.candy;
    // Traînée : deux images de mémoire suffisent à rendre la vitesse lisible,
    // et c'est important — c'est sur la vitesse qu'on décide de couper.
    for (let i = 0; i < st.trail.length; i++) {
      const p = st.trail[i], a = i / st.trail.length * 0.22;
      ctx.fillStyle = `rgba(232,53,110,${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, CFG.CANDY_R * 0.8, 0, 7); ctx.fill();
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.sin(t / 600) * 0.25);
    // Papillotes.
    ctx.fillStyle = CFG.COL_CANDY_WRAP;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * CFG.CANDY_R * 0.8, 0);
      ctx.lineTo(s * CFG.CANDY_R * 2, -CFG.CANDY_R * 0.85);
      ctx.lineTo(s * CFG.CANDY_R * 2, CFG.CANDY_R * 0.85);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, CFG.CANDY_R, 0, 7);
    ctx.fillStyle = CFG.COL_CANDY; ctx.fill();
    ctx.strokeStyle = "rgba(120,10,50,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(-CFG.CANDY_R * 0.3, -CFG.CANDY_R * 0.3, CFG.CANDY_R * 0.34, 0, 7);
    ctx.fillStyle = CFG.COL_CANDY_HI; ctx.fill();
    ctx.restore();
  }

  function drawStar(ctx, s, t) {
    if (s.got) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(t / 900);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? 11 : 4.6;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = CFG.COL_STAR; ctx.fill();
    ctx.strokeStyle = CFG.COL_STAR_HI; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function drawSpike(ctx, sp, t) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(t / 1500);
    ctx.beginPath();
    const N = 9;
    for (let i = 0; i <= N * 2; i++) {
      const a = i / (N * 2) * Math.PI * 2;
      const rr = i % 2 === 0 ? sp.r : sp.r * 0.55;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = CFG.COL_SPIKE; ctx.fill();
    ctx.strokeStyle = "#6f9a12"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(-sp.r * 0.25, -sp.r * 0.25, sp.r * 0.22, 0, 7);
    ctx.fillStyle = CFG.COL_SPIKE_HI; ctx.fill();
    ctx.restore();
  }

  function drawBumper(ctx, b, t) {
    const wob = 1 + Math.sin(t / 500) * 0.02;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * wob, 0, 7);
    ctx.fillStyle = CFG.COL_BUMPER; ctx.fill();
    ctx.strokeStyle = CFG.COL_BUMPER_HI; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.32, b.r * 0.22, 0, 7);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
  }

  function drawBubble(ctx, b, t) {
    if (b.popped) return;
    const wob = 1 + Math.sin(t / 420 + b.x) * 0.035;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * wob, 0, 7);
    ctx.fillStyle = CFG.COL_BUBBLE; ctx.fill();
    ctx.strokeStyle = CFG.COL_BUBBLE_EDGE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.38, b.r * 0.16, 0, 7);
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
  }

  function drawFan(ctx, f, t) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = CFG.COL_FAN;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    // Flèches de courant : elles disent la DIRECTION, sans quoi un rectangle
    // pâle n'apprend rien au joueur.
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    const dx = f.dx || 0, dy = f.dy || 0;
    const step = 62, drift = (t / 14) % step;
    for (let y = f.y + 26; y < f.y + f.h; y += 54) {
      for (let x = f.x + 10; x < f.x + f.w - 10; x += step) {
        const px = x + (dx ? drift : 0), py = y + (dy ? drift : 0);
        if (px > f.x + f.w - 8 || py > f.y + f.h - 8) continue;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dx * 20, py + dy * 20);
        ctx.lineTo(px + dx * 20 - dx * 7 - dy * 6, py + dy * 20 - dy * 7 - dx * 6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------- la scène */
  function draw(ctx, st, t, swipe) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CFG.W, CFG.H);
    drawBackground(ctx, t);

    for (const f of st.fans) drawFan(ctx, f, t);

    const d = Math.hypot(st.candy.x - st.mouth.x, st.candy.y - st.mouth.y);
    const eating = Math.max(0, 1 - d / (st.mouth.r * 4));
    const eyes = drawMonster(ctx, st.mouth, t, eating);
    drawPupils(ctx, st.mouth, eyes, st.candy);

    for (const b of st.bumpers) drawBumper(ctx, b, t);
    for (const sp of st.spikes) drawSpike(ctx, sp, t);
    for (const s of st.stars) drawStar(ctx, s, t);
    for (const r of st.ropes) drawRope(ctx, r, st.candy);
    drawCandy(ctx, st, t);
    for (const b of st.bubbles) drawBubble(ctx, b, t);

    // Geste de coupe en cours : un trait blanc qui s'efface. Sans lui, un
    // geste raté ne dit pas au joueur s'il a manqué la corde ou si le jeu ne
    // l'a pas entendu.
    if (swipe && swipe.length > 1) {
      ctx.beginPath();
      ctx.moveTo(swipe[0].x, swipe[0].y);
      for (let i = 1; i < swipe.length; i++) ctx.lineTo(swipe[i].x, swipe[i].y);
      ctx.strokeStyle = CFG.COL_CUT; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  return { fit, toScene, draw };
})();
