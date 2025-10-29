import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Management System",
  description: "MERN → Next.js migration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="">
      <body>{children}</body>
    </html>
  );
}
