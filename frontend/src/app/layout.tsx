import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--next-font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--next-font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "uaartist — косметички ручной работы из хлопкового букле и льна",
    template: "%s | uaartist",
  },
  description:
    "Косметички и аксессуары ручной работы из натуральных тканей — каждая в единственном экземпляре. Индивидуальный пошив. Отправка по всей России из Череповца.",
  openGraph: {
    type: "website",
    siteName: "uaartist",
    locale: "ru_RU",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
