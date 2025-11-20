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
    <div className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          H5P Preview
        </p>
        <h1 className="text-3xl font-bold text-foreground">{parsed.metadata.title}</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded {uploadedAt} • {sizeMB} MB
        </p>
      </header>

      <ShareLink path={`/h5p/${id}`} baseUrl={baseUrl} label="Share preview link" />

      <section className="space-y-4">
        <div className="rounded-xl border bg-card shadow-sm">
          <iframe
            src={iframeSrc}
            title={parsed.metadata.title}
            className="h-[600px] w-full rounded-xl border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
          />
        </div>
      </section>
    </div>
  );
}

