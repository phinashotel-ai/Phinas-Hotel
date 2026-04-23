import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "PHINAS HOTEL | Luxury Accommodation",
  description: "Experience luxury, comfort, and unforgettable moments at PHINAS HOTEL. Book your stay today for the ultimate hospitality experience.",
  keywords: "hotel, luxury hotel, accommodation, booking, PHINAS HOTEL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
