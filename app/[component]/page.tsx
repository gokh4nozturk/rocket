import { notFound } from "next/navigation";
import { ComponentShowcase } from "@/components/showcase/component-showcase";
import { getComponentSource } from "@/lib/registry-source";
import { getEntry, getSlugs } from "@/lib/showcase";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ component: slug }));
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

  return (
    <ComponentShowcase
      code={source.code}
      description={entry.description}
      highlightedCode={source.html}
      name={entry.registryName}
      title={entry.title}
    >
      {entry.demo}
    </ComponentShowcase>
  );
}
