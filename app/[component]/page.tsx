import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { getComponentSource } from "@/lib/registry-source";
import { getEntry, getSlugs } from "@/lib/showcase";
import { siteConfig } from "@/lib/site";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ component: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ component: string }>;
}): Promise<Metadata> {
  const { component } = await params;
  const entry = getEntry(component);

  if (!entry) {
    return {};
  }

  const url = `${siteConfig.url}/${entry.slug}`;

  return {
    alternates: {
      canonical: `/${entry.slug}`,
    },
    description: entry.description,
    openGraph: {
      description: entry.description,
      title: `${entry.title} — ${siteConfig.name}`,
      type: "article",
      url,
    },
    title: entry.title,
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.author.twitter,
      description: entry.description,
      title: `${entry.title} — ${siteConfig.name}`,
    },
  };
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component } = await params;
  const entry = getEntry(component);

  if (!entry) {
    notFound();
  }

  const source = await getComponentSource(entry.registryName);
  const url = `${siteConfig.url}/${entry.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
    codeRepository: siteConfig.url,
    description: entry.description,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    name: entry.title,
    programmingLanguage: "TypeScript",
    runtimePlatform: "React",
    url,
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <ComponentShowcase
        code={source.code}
        description={entry.description}
        highlightedCode={source.html}
        name={entry.registryName}
        title={entry.title}
      >
        {entry.demo}
      </ComponentShowcase>
    </>
  );
}
