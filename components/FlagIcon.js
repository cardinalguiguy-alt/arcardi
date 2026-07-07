"use client";

/* ==========================================================================
   FlagIcon — drapeau affiché en IMAGE plutôt qu'en emoji.
   ==========================================================================
   Les drapeaux emoji (🇫🇷, 🇬🇧...) ne s'affichent pas sous Windows/Chrome
   et Edge : ils tombent en "FR"/"GB" en lettres, ce qui casse Worldle (le
   drapeau du pays cible en est le cœur visuel) et le sélecteur de langue.
   flagcdn.com sert de vraies images PNG, identiques sur toutes les
   plateformes — code ISO 2 lettres en minuscules (ex: "fr", "gb").
   ========================================================================== */
export default function FlagIcon({ code, size = 18 }) {
  if (!code) return null;
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt=""
      width={size}
      height={h}
      loading="lazy"
      style={{ display: "inline-block", borderRadius: 2, verticalAlign: "middle", objectFit: "cover", width: size, height: h }}
    />
  );
}
