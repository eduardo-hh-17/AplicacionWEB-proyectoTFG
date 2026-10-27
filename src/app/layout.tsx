import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// MODIFICADO: Expandimos tus metadatos para mejorar el SEO en Google
export const metadata: Metadata = {
  title: "Restaurante Lempira | Comida Típica Hondureña",
  description: "Disfruta de la auténtica tradición hondureña en Restaurante Lempira. Sabores auténticos del Caribe y platos típicos en San Pedro Sula.",
  keywords: ["Restaurante Lempira", "Comida hondureña", "Baleadas", "San Pedro Sula", "Gastronomía de Honduras"],
  icons: {
    icon: '/icon.jpg',
  },
  openGraph: {
    title: "Restaurante Lempira | Sabores Auténticos",
    description: "El mejor restaurante Hondureño — Tradición en cada plato.",
    url: "https://restaurantelempira.xyz",
    siteName: "Restaurante Lempira",
    locale: "es_HN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
