import "./globals.css";

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
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
