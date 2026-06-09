import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileNav } from "@/components/showcase/mobile-nav";
import { SidebarContent } from "@/components/showcase/sidebar-content";
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
    creator: siteConfig.author.twitter,
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
          <div className="relative mx-auto flex w-full max-w-7xl flex-col md:flex-row">
            <MobileNav items={navItems} />
            <aside className="hidden shrink-0 flex-col gap-6 overflow-y-auto px-6 py-6 md:fixed md:flex md:h-screen md:w-56 md:border-r">
              <SidebarContent items={navItems} />
            </aside>
            <main className="min-w-0 flex-1 px-6 py-8 md:ml-56 md:py-12">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
