import { Fragment } from "react";
import { authors, formatUpdated, updatedAt } from "@/content/editorial";

export function EditorialNote({ path, className = "" }: { path: string; className?: string }) {
  const updated = updatedAt[path];
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted ${className}`}>
      <span>
        Hazırlayanlar:{" "}
        {authors.map((author, index) => (
          <Fragment key={author.profile}>
            {index > 0 ? (index === authors.length - 1 ? " ve " : ", ") : null}
            <a href={author.profile} rel="author noopener" target="_blank" className="link-underline font-medium text-ink">
              {author.name}
            </a>
          </Fragment>
        ))}
      </span>
      {updated ? (
        <>
          <span aria-hidden>·</span>
          <span>
            Son güncelleme: <time dateTime={updated}>{formatUpdated(updated)}</time>
          </span>
        </>
      ) : null}
    </p>
  );
}
