import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarNav } from "@/components/showcase/sidebar-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { showcaseEntries } from "@/lib/showcase";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  description: "A small, distinctive component library distributed as a shadcn registry.",
  title: "rocket",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navItems = showcaseEntries.map((entry) => ({ slug: entry.slug, title: entry.title }));

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
          <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
            <aside className="flex shrink-0 flex-col gap-6 border-b px-6 py-6 md:h-screen md:w-56 md:border-r md:border-b-0">
              <Link className="font-semibold text-foreground" href="/">
                rocket
              </Link>
              <SidebarNav items={navItems} />
              <div className="mt-auto">
                <ModeToggle />
              </div>
            </aside>
            <main className="min-w-0 flex-1 px-6 py-12">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
