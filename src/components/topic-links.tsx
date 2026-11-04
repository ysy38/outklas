import Link from "next/link";
import { topicLinks } from "@/content/topics";

export function TopicLinks({
  title = "Hazırlık yazıları",
  exclude,
  className = "",
}: {
  title?: string;
  exclude?: string;
  className?: string;
}) {
  const links = topicLinks.filter((link) => link.href !== exclude);
  return (
    <nav aria-label={title} className={className}>
      <h2 className="text-2xl">{title}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="lift flex h-full flex-col rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-pine">
              <span className="font-medium text-ink">
                {link.label} <span aria-hidden className="text-pine">→</span>
              </span>
              <span className="mt-1 text-sm leading-6 text-muted">{link.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
