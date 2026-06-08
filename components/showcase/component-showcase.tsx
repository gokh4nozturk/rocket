"use client";

import { Check, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";

function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      aria-label={label}
      className={cn(
        "shrink-0 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      onClick={copy}
      type="button"
    >
      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
    </button>
  );
}

/**
 * Doc-style showcase card: title, description, a copyable shadcn install command
 * and Preview / Code tabs (live render + highlighted source).
 */
export function ComponentShowcase({
  title,
  description,
  name,
  code,
  highlightedCode,
  children,
  className,
}: {
  title: string;
  description?: string;
  name: string;
  /** Raw component source, used for the Code tab's copy button. */
  code: string;
  /** shiki-highlighted HTML of the component source. */
  highlightedCode: string;
  children: ReactNode;
  className?: string;
}) {
  const command = `npx shadcn@latest add ${REGISTRY_URL}/r/${name}.json`;

  return (
    <section className={cn("w-full", className)}>
      <h2 className="font-semibold text-foreground text-lg">{title}</h2>
      {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
        <code className="overflow-x-auto whitespace-nowrap font-mono text-foreground text-xs">
          {command}
        </code>
        <CopyButton label="Copy install command" value={command} />
      </div>

      <Tabs className="mt-4" defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <div className="rounded-xl border bg-card p-5">{children}</div>
        </TabsContent>

        <TabsContent value="code">
          <div className="relative rounded-xl border bg-card">
            <CopyButton
              className="absolute top-3 right-3 z-10 rounded-md bg-card/80 p-1 backdrop-blur"
              label="Copy component source"
              value={code}
            />
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted, generated at build time */}
            <div className="shiki-block" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
