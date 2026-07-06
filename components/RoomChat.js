"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ==========================================================================
   ROOMCHAT — petit chat textuel de salon, discret et flottant.
   ==========================================================================
   Portée : tout le salon (lobby ET jeu en cours), monté une seule fois au
   niveau de la page room/[code] — PAS à l'intérieur d'un jeu — pour ne
   jamais se démonter/reconnecter lors des changements lobby <-> jeu.

   Volontairement ÉPHÉMÈRE (aucune table Supabase, aucune migration SQL) :
   les messages ne vivent que dans un canal Broadcast (self:true) et dans la
   mémoire de chaque onglet ouvert. Un rechargement de page vide l'historique
   — c'est un choix assumé pour rester "discret" et rapide à livrer sans
   toucher au schéma de la base. Si un historique persistant est souhaité un
   jour, il faudrait une table dédiée + RLS (à discuter avant de le faire).
   ========================================================================== */

const MAX_MESSAGES = 200;

export default function RoomChat({ room, me, t }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const channelRef = useRef(null);
  const listRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const ch = supabase.channel("chat_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "message" }, ({ payload }) => {
      setMessages(prev => {
        const next = [...prev, payload];
        return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
      });
      if (!openRef.current && payload.profile_id !== me.id) {
        setUnread(u => u + 1);
      }
    });

    ch.subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // Auto-scroll vers le bas à chaque nouveau message, seulement si le panneau est ouvert.
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  function toggle() {
    setOpen(o => {
      if (!o) setUnread(0);
      return !o;
    });
  }

  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast", event: "message",
      payload: {
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        profile_id: me.id, username: me.username, avatar: me.avatar,
        text: text.slice(0, 400), ts: Date.now(),
      },
    });
    setDraft("");
  }

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-head">
            <span>💬 {t("chatTitle")}</span>
            <button onClick={toggle} style={{ fontSize: 15, opacity: .75 }}>✕</button>
          </div>
          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 20 }}>{t("chatEmpty")}</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={"chat-msg" + (m.profile_id === me.id ? " mine" : "")}>
                <div className="who">{m.avatar} {m.username}</div>
                <div className="bubble">{m.text}</div>
              </div>
            ))}
          </div>
          <form className="chat-input-row" onSubmit={send}>
            <input
              type="text" value={draft} maxLength={400}
              onChange={e => setDraft(e.target.value)}
              placeholder={t("chatPlaceholder")}
            />
            <button type="submit">➤</button>
          </form>
        </div>
      )}
      <button className="chat-fab" onClick={toggle} aria-label={t("chatTitle")}>
        💬
        {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </>
  );
}
