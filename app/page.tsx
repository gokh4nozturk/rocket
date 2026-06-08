import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${siteConfig.url}/#website`,
        "@type": "WebSite",
        author: {
          "@type": "Person",
          name: siteConfig.author.name,
          url: siteConfig.author.url,
        },
        description: siteConfig.description,
        inLanguage: "en",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      {
        "@id": `${siteConfig.url}/#components`,
        "@type": "CollectionPage",
        hasPart: showcaseEntries.map((entry) => ({
          "@type": "SoftwareSourceCode",
          description: entry.description,
          name: entry.title,
          programmingLanguage: "TypeScript",
          url: `${siteConfig.url}/${entry.slug}`,
        })),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        name: siteConfig.title,
        url: siteConfig.url,
      },
    ],
  };

  return (
    <div className="flex w-full flex-col items-start gap-8">
      <JsonLd data={structuredData} />
      <div>
        <h1 className="font-medium text-foreground text-xl">rocket</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          A small component library distributed as a shadcn registry.
        </p>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {showcaseEntries.map((entry) => (
          <li key={entry.slug}>
            <Link
              className="block rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
              href={`/${entry.slug}`}
            >
              <span className="font-medium text-foreground text-sm">{entry.title}</span>
              <span className="mt-1 block text-muted-foreground text-sm">{entry.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
