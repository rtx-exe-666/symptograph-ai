import "./globals.css";

export const metadata = {
  title: "SymptoGraph AI — Intelligent Medical Interpreter & Ontology Graph",
  description: "Scan handwritten prescriptions or lab reports, translate jargon, visualize health relationships on a Neo4j ontology network, and dictate symptoms.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
