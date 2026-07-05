import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice Sarkar — Governance by Voice",
  description:
    "Voice Sarkar enables any Indian citizen to access government services by making a phone call — no smartphone, no internet, no literacy required.",
  keywords: "voice, government, India, Bhashini, grievance, RTI, pension",
  openGraph: {
    title: "Voice Sarkar — Governance by Voice, Not by Screen",
    description: "Government services for every Indian citizen via voice call",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
