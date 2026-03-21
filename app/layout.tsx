import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chronology Daily",
  description: "Put 10 historical events in order. A new puzzle every day.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chronology",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Chronology Daily",
    description: "Put 10 historical events in order. A new puzzle every day.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Chronology Daily" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Chronology Daily",
    description: "Put 10 historical events in order. A new puzzle every day.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
