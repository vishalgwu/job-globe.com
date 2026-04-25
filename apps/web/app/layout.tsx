import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jarvis Job Globe",
  description: "Global job discovery foundation shell"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
