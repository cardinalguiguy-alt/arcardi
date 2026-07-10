"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sfx";
import {
  getMusicTrackList, getCurrentMusicIndex, isAmbienceMutedNow,
  setAmbienceMuted, playTrackByIndex, subscribeAmbience,
} from "@/lib/ambience";
import { AVATARS } from "@/lib/avatars";

/* ==========================================================================
   SettingsMenu — bouton écrou (rotation continue au survol, voir
   .settings-gear-btn/.gear-icon dans globals.css) monté dans Brand.js, donc
   présent sur TOUTES les pages (login/signup/lounge/room) sans avoir à
   toucher chacune individuellement.

   Modale réutilisant le même habillage visuel que GameRulesButton
   (.rules-modal-overlay/.rules-modal/.rules-modal-close) pour rester
   cohérent avec le reste du site plutôt que d'inventer un système à part.

   Contenu, du plus universel au plus spécifique :
   - Son (effets) et Musique (ambiance) on/off — toujours utiles, même sans
     session (écrans login/signup). Persistés dans localStorage via
     lib/sfx.js (isSoundEnabled/setSoundEnabled) et lib/ambience.js
     (setAmbienceMuted, qui réutilise la même préférence musique).
   - Liste des pistes musicales, cliquables pour relancer celle qu'on
     préfère (lib/ambience.js expose l'index de la piste en cours et un
     abonnement pour suivre la rotation en direct pendant que le panneau
     est ouvert).
   - Avatar + déconnexion : seulement si une session/un profil existe
     (chargé à la première ouverture du panneau, mis en cache ensuite).
   ========================================================================== */
export default function SettingsMenu({ t }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [ambience, setAmbienceState] = useState({ musicIndex: -1, muted: false });
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    // Lu uniquement côté client (localStorage) : on ne fait rien au rendu
    // serveur pour ne jamais désaccorder serveur/client au premier rendu.
    setSoundOn(isSoundEnabled());
    setAmbienceState({ musicIndex: getCurrentMusicIndex(), muted: isAmbienceMutedNow() });
  }, []);

  useEffect(() => {
    if (!open) return;
    setAmbienceState({ musicIndex: getCurrentMusicIndex(), muted: isAmbienceMutedNow() });
    // Abonné seulement pendant que le panneau est ouvert : pas besoin de
    // suivre la rotation des pistes quand personne ne regarde la liste.
    unsubRef.current = subscribeAmbience(setAmbienceState);
    if (!profile && !profileLoading) {
      setProfileLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { setProfileLoading(false); return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          setProfile(data || null);
          setProfileLoading(false);
        });
      });
    }
    return () => { if (unsubRef.current) unsubRef.current(); unsubRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }
  function toggleMusic() {
    setAmbienceMuted(!ambience.muted);
  }
  async function changeAvatar(a) {
    if (!profile || a === profile.avatar || avatarSaving) return;
    setAvatarSaving(true);
    const prev = profile.avatar;
    setProfile(p => ({ ...p, avatar: a })); // optimiste : réactif tout de suite
    const { error } = await supabase.from("profiles").update({ avatar: a }).eq("id", profile.id);
    if (error) setProfile(p => ({ ...p, avatar: prev })); // échec réseau/RLS : on revient en arrière
    setAvatarSaving(false);
  }
  async function logout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const tracks = getMusicTrackList();

  return (
    <>
      <button
        type="button"
        className="settings-gear-btn"
        onClick={() => setOpen(true)}
        title={t("settingsTitle")}
        aria-label={t("settingsTitle")}
      >
        <span className="gear-icon">⚙️</span>
      </button>
      {open && (
        <div className="rules-modal-overlay" onClick={() => setOpen(false)}>
          <div className="rules-modal settings-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="rules-modal-close" onClick={() => setOpen(false)} aria-label="×">×</button>
            <h2 className="rules-modal-title">⚙️ {t("settingsTitle")}</h2>

            <div className="settings-section">
              <div className="settings-toggle-row">
                <span>🔊 {t("settingsSound")}</span>
                <button type="button" className={"settings-switch" + (soundOn ? " on" : "")} onClick={toggleSound} aria-pressed={soundOn}>
                  <span className="settings-switch-knob" />
                </button>
              </div>
              <div className="settings-toggle-row">
                <span>🎵 {t("settingsMusic")}</span>
                <button type="button" className={"settings-switch" + (!ambience.muted ? " on" : "")} onClick={toggleMusic} aria-pressed={!ambience.muted}>
                  <span className="settings-switch-knob" />
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3 className="settings-section-title">{t("settingsTracks")}</h3>
              <div className="settings-track-list">
                {tracks.map(tr => (
                  <button
                    type="button"
                    key={tr.index}
                    className={"settings-track-row" + (ambience.musicIndex === tr.index ? " playing" : "")}
                    onClick={() => playTrackByIndex(tr.index)}
                  >
                    <span className="settings-track-note">{ambience.musicIndex === tr.index ? "▶" : "🎵"}</span>
                    <span className="settings-track-num">{String(tr.index + 1).padStart(2, "0")}</span>
                    <span className="settings-track-text">
                      <span className="settings-track-title">{tr.title}</span>
                      {tr.performer && <span className="settings-track-performer">{tr.performer}</span>}
                    </span>
                  </button>
                ))}
                {/* Playlist volontairement non-close : d'autres pistes viendront
                    s'ajouter à MUSIC_TRACKS (lib/ambience.js) sans rien casser
                    ici — cette ligne le dit clairement, dans la même langue
                    (anglais) que le reste des références musicales ci-dessus. */}
                <p className="settings-track-more">🎼 More to come…</p>
              </div>
            </div>

            {profile && (
              <div className="settings-section">
                <h3 className="settings-section-title">{t("settingsAvatar")}</h3>
                <div className="settings-avatar-grid">
                  {AVATARS.map(a => (
                    <button
                      type="button"
                      key={a}
                      className={"settings-avatar-btn" + (a === profile.avatar ? " active" : "")}
                      onClick={() => changeAvatar(a)}
                      disabled={avatarSaving}
                      aria-label={a}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {profile && (
              <button type="button" className="btn ghost settings-logout-btn" onClick={logout}>
                🚪 {t("logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
