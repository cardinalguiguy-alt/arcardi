"use client";
import { useRef, useState } from "react";
import FlagIcon from "./FlagIcon";
import SettingsMenu from "./SettingsMenu";

// `onHome` (optionnel) : action de navigation déclenchée par un clic sur le
// logo. Chaque page fournit la sienne (retour au menu principal, retour au
// lobby du salon…). Pour ne pas casser l'easter egg des 7 clics rapides, la
// navigation est différée de 350 ms et annulée dès qu'un nouveau clic
// arrive : un clic simple navigue, une rafale de clics reste l'easter egg.
export default function Brand({ lang, setLang, t, right, onHome }) {
  const clicks = useRef(0);
  const timer = useRef(null);
  const navTimer = useRef(null);
  const [soup, setSoup] = useState(false);
  const [toast, setToast] = useState("");

  function onLogoClick() {
    clicks.current++;
    clearTimeout(timer.current);
    clearTimeout(navTimer.current);
    timer.current = setTimeout(() => (clicks.current = 0), 1200);
    if (clicks.current >= 7) {
      clicks.current = 0;
      const on = !soup;
      setSoup(on);
      setToast(on ? t("eggSoup") : t("eggSoupOff"));
      setTimeout(() => setToast(""), 3500);
      if (on) rainSoup();
      return;
    }
    if (onHome) {
      navTimer.current = setTimeout(() => { clicks.current = 0; onHome(); }, 350);
    }
  }

  function rainSoup() {
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = ["🍲", "🥣", "🎤", "🍲"][i % 4];
      s.style.cssText = `position:fixed;top:-30px;left:${Math.random() * 100}vw;font-size:22px;z-index:99;pointer-events:none;transition:transform ${2 + Math.random() * 2}s linear,opacity 3s;`;
      document.body.appendChild(s);
      requestAnimationFrame(() => { s.style.transform = "translateY(110vh) rotate(540deg)"; s.style.opacity = ".4"; });
      setTimeout(() => s.remove(), 4200);
    }
  }

  return (
    <div className="brand" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <button onClick={onLogoClick} style={{ display: "flex", gap: 4, cursor: "pointer" }} title="ARCARDI" aria-label="ARCARDI">
        {"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <SettingsMenu t={t} />
        {/* Sélecteur de langue (2026-07) : l'ancien bouton unique affichait la
            langue CIBLE ("EN" pendant qu'on lit en français) — ambigu, on ne
            sait pas d'un coup d'œil dans quelle langue on est. Remplacé par
            un double bouton FR/EN toujours visible : la langue active est en
            évidence (pastille pleine), l'autre reste cliquable en retrait —
            plus aucune lecture à faire, l'état est montré, pas déduit. */}
        <div className="lang-switch" role="group" aria-label={t("langSwitchLabel")}>
          <button
            type="button"
            className={"lang-switch-opt" + (lang === "fr" ? " active" : "")}
            onClick={() => setLang("fr")}
            aria-pressed={lang === "fr"}
          >
            <FlagIcon code="fr" size={15} />
            <span>FR</span>
          </button>
          <button
            type="button"
            className={"lang-switch-opt" + (lang === "en" ? " active" : "")}
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
          >
            <FlagIcon code="gb" size={15} />
            <span>EN</span>
          </button>
        </div>
        {right}
      </div>
      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
          background: "var(--card2)", border: "2.5px solid var(--p4)", borderRadius: 99,
          padding: "10px 20px", fontWeight: 800, zIndex: 100, maxWidth: "92vw", textAlign: "center"
        }}>{toast}</div>
      )}
    </div>
  );
}
