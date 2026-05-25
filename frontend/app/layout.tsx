import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curtain Call — Theatre Production Predictor",
  description: "Predict box office performance before opening night using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
