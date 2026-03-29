import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chronologydaily.com"),
  title: "Chronology Daily",
  description: "10 events. One correct order. A new puzzle every day.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chronology",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Chronology Daily — How good's your history?",
    description: "Put 10 historical events in the right order. A new puzzle every day. Free to play, no login needed.",
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Chronology Daily" }],
    type: "website",
    url: "https://chronologydaily.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chronology Daily — How good's your history?",
    description: "Put 10 historical events in the right order. A new puzzle every day. Free to play, no login needed.",
    images: ["/og/default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2C2C2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
