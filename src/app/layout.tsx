import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MelaBabu — Studio-Style Baby Photos",
  description:
    "Create stunning studio-style baby photos in seconds using AI. Upload your baby photo, choose a theme, and download a professional portrait.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#fcf9f8" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
