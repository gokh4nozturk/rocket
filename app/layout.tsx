import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  description: "A small, distinctive component library distributed as a shadcn registry.",
  title: "rocket",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b px-6 py-5">
            <Link className="font-semibold text-foreground" href="/">
              rocket
            </Link>
            <ModeToggle />
          </header>
          <main className="mx-auto w-full max-w-7xl px-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
