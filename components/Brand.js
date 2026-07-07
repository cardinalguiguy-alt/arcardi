"use client";
import { useRef, useState } from "react";
import FlagIcon from "./FlagIcon";

export default function Brand({ lang, setLang, t, right }) {
  const clicks = useRef(0);
  const timer = useRef(null);
  const [soup, setSoup] = useState(false);
  const [toast, setToast] = useState("");

  function onLogoClick() {
    clicks.current++;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (clicks.current = 0), 1200);
    if (clicks.current >= 7) {
      clicks.current = 0;
      const on = !soup;
      setSoup(on);
      setToast(on ? t("eggSoup") : t("eggSoupOff"));
      setTimeout(() => setToast(""), 3500);
      if (on) rainSoup();
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
      <button onClick={onLogoClick} style={{ display: "flex", gap: 4 }} title="ARCARDI" aria-label="ARCARDI">
        {"ARCARDI".split("").map((c, i) => <span className="tile" key={i}>{c}</span>)}
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn ghost"
          style={{ width: "auto", margin: 0, padding: "8px 12px", fontSize: 13 }}
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FlagIcon code={lang === "fr" ? "gb" : "fr"} size={16} />
            {lang === "fr" ? "EN" : "FR"}
          </span>
        </button>
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
