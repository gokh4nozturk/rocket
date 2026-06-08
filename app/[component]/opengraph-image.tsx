import { notFound } from "next/navigation";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";
import { getEntry, getSlugs } from "@/lib/showcase";

export const alt = "rocket component";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ component: slug }));
}

export default async function Image({ params }: { params: Promise<{ component: string }> }) {
  const { component } = await params;
  const entry = getEntry(component);

  if (!entry) {
    notFound();
  }

  return renderOgImage({ subtitle: entry.description, title: entry.title });
}
