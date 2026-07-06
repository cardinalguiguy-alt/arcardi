import "./globals.css";

export const metadata = {
  title: "ARCARDI — soirée jeux en ligne",
  description: "Mini-jeux multijoueurs à distance entre amis : quiz, mot mystère, Worldle, escape game musical, Puissance 4, Petits Chevaux et plus."
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
