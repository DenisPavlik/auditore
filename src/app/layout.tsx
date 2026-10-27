import type { Metadata } from "next";
import { EB_Garamond, Marcellus } from "next/font/google";

import { InkBlots } from "@/components/atmosphere/ink-blots";
import { SeasonParticles } from "@/components/atmosphere/season-particles";
import { seasonBootScript } from "@/lib/seasons";

import "./globals.css";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Flared Roman capitals, after the inscriptions on Florentine façades.
const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Auditore · Trattoria Fiorentina",
    template: "%s · Auditore",
  },
  description:
    "A Florentine trattoria whose menu, terrace and tables follow the seasons. Book a table in La Sala or under the wisteria of the Terrazza.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The boot script sets data-season before React hydrates.
      suppressHydrationWarning
      className={`${garamond.variable} ${marcellus.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: seasonBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <SeasonParticles layer="far" />
        <SeasonParticles layer="near" />
        <InkBlots />
      </body>
    </html>
  );
}
