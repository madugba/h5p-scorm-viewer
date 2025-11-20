import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShareLink } from "@/components/shared/share-link";
import { DebugPanel } from "@/components/layout/debug-panel";
import { inMemoryStorage } from "@/lib/storage/in-memory-storage";
import { parseScormArchive } from "@/lib/scorm/parser";
import { resolveBaseUrl } from "@/lib/utils/base-url";
import { BYTES_PER_MB } from "@/lib/security/file-validator";

type ViewerPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "SCORM Viewer",
  description: "Preview uploaded SCORM packages with a built-in API shim."
};

export default async function SCORMViewerPage({ params }: ViewerPageProps) {
  const { id } = await params;

  const record = inMemoryStorage.get(id);
  if (!record || record.type !== "scorm") {
    notFound();
  }

  let parsed;
  try {
    parsed = await parseScormArchive(record.file.buffer);
  } catch (error) {
    const errorMessage =
      (error as Error).message ?? "Unknown parsing error.";
    return (
      <div className="space-y-6 py-10">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            SCORM Preview
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            We couldn’t render this SCORM package
          </h1>
        </header>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2 text-sm text-destructive">
          <p>
            The uploaded archive appears to be malformed or missing required
            files (for example, <code>imsmanifest.xml</code>). Please verify
            the package structure and upload a valid SCORM package.
          </p>
          {errorMessage && (
            <p className="text-xs font-mono text-destructive/80">
              Diagnostic: {errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }
  const baseUrl = await resolveBaseUrl();
  const iframeSrc = `/scorm/${id}/asset?asset=${encodeURIComponent(parsed.launchFile)}`;

  const uploadedAt = record.uploadedAt.toLocaleString();
  const sizeMB = (record.file.size / BYTES_PER_MB).toFixed(2);

  return (
    <div className="space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          SCORM Preview
        </p>
        <h1 className="text-3xl font-bold text-foreground">{parsed.title}</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded {uploadedAt} • {sizeMB} MB • Version {parsed.version.toUpperCase()}
        </p>
      </header>

      <ShareLink path={`/scorm/${id}`} baseUrl={baseUrl} label="Share preview link" />

      <section className="space-y-4">
        <div className="rounded-xl border bg-card shadow-sm">
          <iframe
            src={iframeSrc}
            title={parsed.title}
            className="h-[600px] w-full rounded-xl border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
          />
        </div>
      </section>

      <DebugPanel />
    </div>
  );
}

