import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";

// Newsreader is a variable font; `opsz` lets the browser pick the optical size for each text size.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Judges",
  description:
    "Verify that a wallet is backed by a passkey that passed user verification, without disclosing anything else. Verified on Monad.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plexMono.variable}`}>
      <body>
        {children}
        {/* The REJECTED stamp starts hidden and animates in; without JS it must still be readable. */}
        <noscript>
          <style>{`.stamp{opacity:1}`}</style>
        </noscript>
      </body>
    </html>
  );
}
