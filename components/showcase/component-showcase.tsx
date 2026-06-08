"use client";

import { Check, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://rocket.gozturk.dev";

function CopyButton({ value }: { value: string }) {
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
      aria-label="Copy install command"
      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      onClick={copy}
      type="button"
    >
      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
    </button>
  );
}

/**
 * Doc-style showcase card: title, description, a copyable shadcn install command
 * and a live preview area.
 */
export function ComponentShowcase({
  title,
  description,
  name,
  children,
  className,
}: {
  title: string;
  description?: string;
  name: string;
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
        <CopyButton value={command} />
      </div>

      <div className="mt-4 rounded-xl border bg-card p-5">{children}</div>
    </section>
  );
}
