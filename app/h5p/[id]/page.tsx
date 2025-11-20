import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareLink } from "@/components/shared/share-link";
import { inMemoryStorage } from "@/lib/storage/in-memory-storage";
import { parseH5PArchive } from "@/lib/h5p/parser";
import { resolveBaseUrl } from "@/lib/utils/base-url";
import { BYTES_PER_MB } from "@/lib/security/file-validator";

type ViewerPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "H5P Viewer",
  description: "Preview uploaded H5P packages."
};

export default async function H5PViewerPage({ params }: ViewerPageProps) {
  const { id } = await params;

  const record = inMemoryStorage.get(id);
  if (!record || record.type !== "h5p") {
    notFound();
  }

  const parsed = await parseH5PArchive(record.file.buffer);
  const baseUrl = await resolveBaseUrl();
  const iframeSrc = `/h5p/${id}/asset?asset=${encodeURIComponent(parsed.metadata.mainFile)}`;

  const uploadedAt = record.uploadedAt.toLocaleString();
  const sizeMB = (record.file.size / BYTES_PER_MB).toFixed(2);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          H5P Preview
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {parsed.metadata.title}
        </h1>
        <p className="text-base text-muted-foreground">
          Review and validate your interactive package before sharing the link with
          stakeholders.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border bg-card/80 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Package Details
          </h2>
          <dl className="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>Uploaded</dt>
              <dd className="text-base font-medium text-foreground">{uploadedAt}</dd>
            </div>
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>File Size</dt>
              <dd className="text-base font-medium text-foreground">{sizeMB} MB</dd>
            </div>
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>Entry File</dt>
              <dd className="truncate text-base font-medium text-foreground">
                {parsed.metadata.mainFile}
              </dd>
            </div>
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>Main Library</dt>
              <dd className="text-base font-medium text-foreground">
                {parsed.metadata.mainLibrary ?? "Not specified"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border bg-muted/30 p-6 shadow-sm">
          <ShareLink path={`/h5p/${id}`} baseUrl={baseUrl} label="Share preview link" />
          <p className="mt-3 text-sm text-muted-foreground">
            Copy and distribute this link to reviewers. Links remain active while the
            server session persists.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="overflow-hidden rounded-3xl border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live Preview
              </p>
              <p className="text-sm text-muted-foreground">
                Sandboxed iframe renders with the same CSP as the production viewer.
              </p>
            </div>
          </div>
          <div className="bg-muted/10">
            <iframe
              src={iframeSrc}
              title={parsed.metadata.title}
              className="h-[620px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

