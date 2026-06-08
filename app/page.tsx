import { CopyButton } from "@/components/copy-button";
import { JsonLd } from "@/components/json-ld";
import { PreviewCard } from "@/components/showcase/preview-card";
import { showcaseEntries } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";

export default function Home() {
  const installAll = `npx shadcn@latest add ${showcaseEntries
    .map((entry) => `${REGISTRY_URL}/r/${entry.registryName}.json`)
    .join(" ")}`;

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
    <div className="flex w-full flex-col items-start gap-10">
      <JsonLd data={structuredData} />

      <header className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="font-semibold text-2xl text-foreground tracking-tight">rocket</h1>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            {siteConfig.description}
          </p>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Install every component</span>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-foreground text-xs">
              {installAll}
            </code>
            <CopyButton label="Copy install command for all components" value={installAll} />
          </div>
        </div>
      </header>

      <ul className="grid w-full gap-4 lg:grid-cols-2">
        {showcaseEntries.map((entry) => (
          <li className="min-w-0" key={entry.slug}>
            <PreviewCard
              demo={entry.demo}
              description={entry.description}
              registryName={entry.registryName}
              slug={entry.slug}
              title={entry.title}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
