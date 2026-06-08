import Link from "next/link";
import { showcaseEntries } from "@/lib/showcase";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-start gap-8">
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
