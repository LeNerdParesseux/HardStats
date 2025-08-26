import "./../styles/globals.css";

export const metadata = {
  title: "HardStats",
  description: "Analyse progressive League of Legends (Riot API)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
