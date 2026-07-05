import "./globals.css";

export const metadata = {
  title: "ARCARDI — soirée jeux en ligne",
  description: "8 mini-jeux multijoueurs à distance : quiz, mot mystère, réflexes et plus."
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
