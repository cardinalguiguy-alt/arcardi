/* =============================================================================
   build-demo.mjs — assemble la page autonome en UN SEUL FICHIER.
   -----------------------------------------------------------------------------
   ⚠️ CE FICHIER N'EST PAS LE JEU, C'EST UNE COMMODITÉ D'ESSAI. Le jeu livré
   est `public/crystal/` avec ses quatorze scripts, comme les trois autres
   mini-jeux. Mais un dossier ne s'ouvre pas d'un double-clic depuis une
   messagerie, et un `file://` avec des scripts relatifs se comporte
   différemment selon le navigateur. On produit donc une page unique, sans
   aucune ressource externe, uniquement pour REGARDER.
   ⚠️ NE JAMAIS LA MODIFIER À LA MAIN : elle est régénérée à chaque fois.
   ========================================================================== */
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const H = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(H, "..");
let html = fs.readFileSync(path.join(R, "index.html"), "utf8");
const css = fs.readFileSync(path.join(R, "css/style.css"), "utf8");
html = html.replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}\n</style>`);
let opened = 0;
html = html.replace(/<script src="js\/([^"]+)"><\/script>/g, (_, f) => {
  let js = fs.readFileSync(path.join(R, "js", f), "utf8");
  /* ⚠️ LA PAGE D'ESSAI S'OUVRE SUR LE JEU, LE DÉPÔT RESTE MURÉ. On bascule
     l'interrupteur ICI, dans la copie, et jamais dans `js/config.js`. C'est la
     seule différence entre les deux, et elle est d'un caractère.
     ⚠️ Si le motif ne se trouve plus (renommage de la clé), on s'arrête : une
     démo qu'on croit ouverte et qui ne l'est pas coûte un aller-retour. */
  if (f === "config.js") {
    const before = js;
    js = js.replace(/GATE_ON:\s*true/, "GATE_ON: false   /* page d'essai */");
    if (js !== before) opened = 1;
  }
  return `<script>\n${js}\n</script>`;
});
if (!opened) { console.error("✗ GATE_ON introuvable dans config.js — démo NON ouverte."); process.exit(1); }
const out = path.join(R, "..", "DEMO-vallee-de-verre.html");
fs.writeFileSync(out, html);
console.log("→ " + out + "  (" + (html.length / 1024).toFixed(0) + " Ko, mur ouvert)");
