import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clips — Demo videos for any website",
  description: "Voice-driven demo video generator. Say what you want, get a cinematic video.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
