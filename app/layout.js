import "./globals.css";
import SiteAmbience from "@/components/SiteAmbience";
import AmbienceSkipButton from "@/components/AmbienceSkipButton";
import LoadingIntro from "@/components/LoadingIntro";

export const metadata = {
  title: "ARCARDI — soirée jeux en ligne",
  description: "Mini-jeux multijoueurs à distance entre amis : quiz, mot mystère, Worldle, escape game musical, Puissance 4, Petits Chevaux et plus."
};

// Sans ceci, les navigateurs mobiles (Safari/Chrome iOS) rendent la page à
// une largeur virtuelle desktop (~980px) puis la réduisent pour qu'elle
// tienne à l'écran : tout apparaît minuscule, quelle que soit la taille
// réelle définie en CSS. C'est la cause la plus probable d'un rendu "petit"
// sur iPhone, avant même la taille de chaque jeu.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Barre système (statut iOS Safari, barre d'adresse Chrome Android)
  // teintée aux couleurs du site : sans ceci elle reste BLANCHE au-dessus
  // du fond brun sombre — l'un des défauts les plus visibles sur mobile.
  themeColor: "#2B1B12",
  // viewport-fit=cover : nécessaire pour que env(safe-area-inset-*) soit
  // renseigné sur iPhone (encoche / barre home) — les pastilles fixées en
  // bas (code du salon, chat) s'en servent pour ne pas être recouvertes.
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <SiteAmbience />
        <AmbienceSkipButton />
        <LoadingIntro>{children}</LoadingIntro>
      </body>
    </html>
  );
}
