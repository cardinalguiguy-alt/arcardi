/* cdp.mjs — PILOTER UN CHROME SANS FENÊTRE QUAND LE VOLET DU NAVIGATEUR INTÉGRÉ EST MASQUÉ (2026-11-08).
   Le volet masqué SUSPEND la page (plus d'images, plus de scripts) : les outils du navigateur intégré expirent. On lance alors
   Chrome sans tête avec un port de débogage et ce petit client CDP (Node 22+, `WebSocket` intégré) :
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 \
        --user-data-dir=<dossier jetable> --window-size=1200,800 --mute-audio about:blank      (en arrière-plan)
     node tools/cdp.mjs nav http://localhost:3100/audit-tmp       ouvrir le harnais (seul client : fermer le volet, sinon il reste l'hôte, gelé)
     node tools/cdp.mjs eval '<corps de fonction async, avec return>' [délai ms]
     node tools/cdp.mjs key KeyE e        un VRAI appui (trusted) — `__key` du harnais n'en vaut pas un partout
     node tools/cdp.mjs click 600,559     un vrai clic, en pixels de la fenêtre
     node tools/cdp.mjs shot fichier.png  la capture, qu'on lit ensuite comme une image
   ⚠️ Une page figée (boucle infinie, image interminable) bloque aussi `eval` et la navigation : tuer Chrome (`pkill -f 9333`) et relancer.
   ⚠️ Le rechargement à chaud ne remplace pas la boucle de rendu : après une retouche, `nav` (l'état de la partie repart à neuf).
   ⚠️ Pour figer un instant bref (une foudre de 0,4 s) : dans la page, tenir `__toff` à `cible − (Date.now() − __toff)` par un
   `setInterval` de 4 ms, capturer, puis `clearInterval` et `__toff = 0`. Voir docs/VERIFICATION.md §10. */
// Se connecte à la première page du Chrome sans tête (port 9333), exécute, se déconnecte.
const [, , cmd, arg, arg2] = process.argv;
const list = await (await fetch("http://127.0.0.1:9333/json")).json();
let page = list.find((p) => p.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
let out;
if (cmd === "nav") { await send("Page.enable"); out = await send("Page.navigate", { url: arg }); await new Promise(r => setTimeout(r, 4000)); }
else if (cmd === "eval") {
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${arg} })()`, awaitPromise: true, returnByValue: true, timeout: +(arg2 || 120000) });
  out = r.result && r.result.result ? r.result.result.value : r;
  if (r.result && r.result.exceptionDetails) out = r.result.exceptionDetails;
}
else if (cmd === "shot") {
  const r = await send("Page.captureScreenshot", { format: "png" });
  const fs = await import("fs"); fs.writeFileSync(arg, Buffer.from(r.result.data, "base64")); out = "ok " + arg;
}
else if (cmd === "key") {
  const code = arg, key = arg2 || arg.replace(/^Key/, "").toLowerCase();
  await send("Input.dispatchKeyEvent", { type: "keyDown", code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await new Promise(r => setTimeout(r, 90));
  await send("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  out = "key " + code;
}
else if (cmd === "click") { const [x, y] = arg.split(",").map(Number); await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); out = "click"; }
else if (cmd === "size") { out = await send("Emulation.setDeviceMetricsOverride", { width: +arg, height: +arg2, deviceScaleFactor: 1, mobile: false }); }
console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1));
ws.close();
process.exit(0);
