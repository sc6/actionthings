import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

// Every page reads the local SQLite database at request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "actionthings",
  description: "Track objects and the actions they can use on each other.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
