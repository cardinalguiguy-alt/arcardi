/* =============================================================================
   fake-supabase.mjs — REST bidon + RELAIS REALTIME LOCAL, pour JOUER À DEUX. (432)
   -----------------------------------------------------------------------------
   ⚠️⚠️ IL EXISTE PARCE QUE LE MULTIJOUEUR N'ÉTAIT VÉRIFIABLE NULLE PART. Tous les
   bancs du projet mesurent la simulation de l'HÔTE ; aucun ne voit ce que voit
   l'invité. C'est cet angle mort qui a laissé Valley Town injouable à deux
   pendant tout un zip (voir CLAUDE.md §4, `canStandTown`), et c'est lui que
   §13 réclame depuis le 419 pour les gels de PNJ.

   Ce serveur remplace Supabase EN LOCAL : il répond `[]` sur `/rest/v1/*` (ce
   qui suffit à passer l'écran « code de ferme ») et il RELAIE les broadcasts
   entre les onglets ouverts. Deux onglets = deux joueurs, sans compte, sans
   réseau, sans consommer un seul message du quota (§3).

   ⚠️⚠️ LE BROADCAST DE supabase-js 2.110 EST BINAIRE, PAS JSON. Le `Serializer`
   encode les messages utilisateur dans un format à lui (kind 3 à l'aller,
   kind 4 au retour) et n'envoie du texte que pour `phx_join`/`heartbeat`. Un
   relais qui ne traite que les trames texte voit la connexion s'établir, les
   canaux se joindre… et pas un seul broadcast passer. C'est trois quarts
   d'heure perdus si on ne le sait pas : d'où decodePush/encodeBroadcast.

   Usage :
     node tools/fake-supabase.mjs                      # relais direct
     LAT=90 JIT=60 node tools/fake-supabase.mjs        # + latence/gigue simulées
     VERBOSE=1 …                                       # détail message par message
   Puis un `.env.local` pointant sur http://127.0.0.1:54321 et une page jetable
   montant <FermeGame …> (recette complète en §10 de CLAUDE.md).
   ⚠️ LA PAGE JETABLE SE SUPPRIME AVANT DE LIVRER : en production elle ouvrirait
   une ferme sans authentification. Ce fichier-ci, lui, ne sert jamais au jeu.

   ⚠️ Il affiche toutes les 5 s le débit réel PAR TYPE de message : c'est la
   mesure qui dit si un défaut vient du réseau ou du jeu.
   ========================================================================== */
import http from "http";
import crypto from "crypto";

const PORT = 54321;
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/* ---------------- REST ---------------- */
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("[]");
  });
});

/* ---------------- WebSocket minimal ---------------- */
const clients = new Set(); // { socket, topics:Set, selfTopics:Set }

function sendFrame(sock, str) { sendRaw(sock, Buffer.from(str, "utf8"), 0x81); }
function sendRaw(sock, payload, first) {
  const len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
  else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  header[0] = first;
  sock.write(Buffer.concat([header, payload]));
}

/* Le broadcast utilisateur de supabase-js 2.110 est BINAIRE (Serializer,
   kind 3 = userBroadcastPush à l'aller, kind 4 = userBroadcast au retour). */
function decodePush(buf) {
  if (buf[0] !== 3) return null;
  const joinRefLen = buf[1], refLen = buf[2], topicLen = buf[3], evLen = buf[4], metaLen = buf[5], enc = buf[6];
  let o = 7;
  const joinRef = buf.subarray(o, o += joinRefLen).toString();
  const ref = buf.subarray(o, o += refLen).toString();
  const topic = buf.subarray(o, o += topicLen).toString();
  const ev = buf.subarray(o, o += evLen).toString();
  const meta = buf.subarray(o, o += metaLen).toString();
  const payload = buf.subarray(o);
  return { joinRef, ref, topic, ev, meta, enc, payload };
}
function encodeBroadcast(m) {
  const topic = Buffer.from(m.topic), ev = Buffer.from(m.ev), meta = Buffer.from(m.meta);
  const head = Buffer.alloc(5);
  head[0] = 4; head[1] = topic.length; head[2] = ev.length; head[3] = meta.length; head[4] = m.enc;
  return Buffer.concat([head, topic, ev, meta, m.payload]);
}

server.on("upgrade", (req, sock) => {
  const key = req.headers["sec-websocket-key"];
  const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  sock.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );
  // A Phoenix join can opt into receiving its own broadcasts. Binary frames do
  // not repeat that option, so the relay remembers it for every joined topic.
  const me = { sock, topics: new Set(), selfTopics: new Set() };
  clients.add(me);
  console.log("[ws] connexion (" + clients.size + ")");

  let buf = Buffer.alloc(0);
  sock.on("data", chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = off;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      const data = buf.subarray(off, off + len);
      if (masked) { const m = buf.subarray(maskOff, maskOff + 4); for (let i = 0; i < data.length; i++) data[i] ^= m[i % 4]; }
      const frame = Buffer.from(data);
      buf = buf.subarray(off + len);
      if (op === 8) { clients.delete(me); try { sock.end(); } catch {} return; }
      if (op === 1) handle(me, frame.toString("utf8"));
      if (op === 2) handleBinary(me, frame);
    }
  });
  sock.on("error", () => clients.delete(me));
  sock.on("close", () => clients.delete(me));
});

const VERBOSE = process.env.VERBOSE === "1";
const LAT = +(process.env.LAT || 0);   // latence de base (ms)
const JIT = +(process.env.JIT || 0);   // gigue ajoutée (ms)
let msgCount = 0;
const byEvent = new Map();
function handleBinary(me, frame) {
  const m = decodePush(frame);
  if (!m) return;
  msgCount++;
  byEvent.set(m.ev, (byEvent.get(m.ev) || 0) + 1);
  if (VERBOSE) console.log("[bc]", m.ev, m.payload.length + "o");
  const out = encodeBroadcast(m);
  const lag = LAT ? LAT + Math.random() * JIT : 0;
  for (const c of clients) {
    if (c === me && !me.selfTopics.has(m.topic)) continue;
    if (!c.topics.has(m.topic)) continue;
    if (lag) setTimeout(() => { try { sendRaw(c.sock, out, 0x82); } catch {} }, lag);
    else sendRaw(c.sock, out, 0x82);
  }
}
function handle(me, raw) {
  let msg; try { msg = JSON.parse(raw); } catch { return; }
  // Phoenix v2 : [join_ref, ref, topic, event, payload]
  const [joinRef, ref, topic, event, payload] = msg;
  if (event !== "broadcast" && event !== "heartbeat") console.log("[ws] <-", topic, event);
  if (topic === "phoenix" && event === "heartbeat") {
    sendFrame(me.sock, JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
    return;
  }
  if (event === "phx_join") {
    me.topics.add(topic);
    if (payload?.config?.broadcast?.self) me.selfTopics.add(topic);
    else me.selfTopics.delete(topic);
    sendFrame(me.sock, JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: [] } }]));
    return;
  }
  if (event === "phx_leave") {
    me.topics.delete(topic);
    me.selfTopics.delete(topic);
    sendFrame(me.sock, JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
    return;
  }
  if (event === "broadcast" || event === "access_token") {
    if (ref) sendFrame(me.sock, JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
    if (event !== "broadcast") return;
    msgCount++;
    if (VERBOSE) console.log("[bc]", payload && payload.event, "->", [...clients].filter(c => c !== me && c.topics.has(topic)).length);
    const self = Boolean(payload?.self) || me.selfTopics.has(topic);
    for (const c of clients) {
      if (c === me && !self) continue;
      if (!c.topics.has(topic)) continue;
      sendFrame(c.sock, JSON.stringify([null, null, topic, "broadcast", payload]));
    }
    return;
  }
  if (ref) sendFrame(me.sock, JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
}

setInterval(() => {
  if (!msgCount) return;
  const detail = [...byEvent.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ":" + (v / 5).toFixed(1)).join(" ");
  console.log("[realtime] " + (msgCount / 5).toFixed(1) + " msg/s  — " + detail);
  msgCount = 0; byEvent.clear();
}, 5000);

server.listen(PORT, () => console.log("fake supabase (REST + realtime) on " + PORT));
