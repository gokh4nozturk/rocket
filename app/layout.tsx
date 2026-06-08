import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarNav } from "@/components/showcase/sidebar-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  category: "technology",
  creator: siteConfig.author.name,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.title,
    type: "website",
    url: siteConfig.url,
  },
  publisher: siteConfig.author.name,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.name}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@gokh4nozturk",
    description: siteConfig.description,
    title: siteConfig.title,
  },
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
