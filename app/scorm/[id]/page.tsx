import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShareLink } from "@/components/shared/share-link";
import { DebugPanel } from "@/components/layout/debug-panel";
import { ErrorMessage } from "@/components/ui/error-message";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { parseScormArchive } from "@/lib/scorm/parser";
import { resolveBaseUrl } from "@/lib/utils/base-url";
import { BYTES_PER_MB } from "@/lib/security/file-validator";

type ViewerPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "SCORM Viewer", // cspell:disable-line
  description: "Preview uploaded SCORM packages with a built-in API shim." // cspell:disable-line
};

export default async function SCORMViewerPage({ params }: ViewerPageProps) {
  const { id } = await params;

  const record = await storage.get(id);
  if (!record || record.type !== "scorm") {
    notFound();
  }

  let parsed;
  try {
    parsed = await parseScormArchive(record.file.buffer);
  } catch (error) {
    const errorMessage = (error as Error).message ?? "Unknown parsing error.";
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            SCORM Preview {/* cspell:disable-line */}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Unable to render this package
          </h1>
        </header>
        <ErrorMessage
          title="Package parsing failed"
          message="The uploaded archive appears to be malformed or missing required files (for example, imsmanifest.xml)."
          details={errorMessage}
        />
        <Button asChild variant="outline">
          <Link href="/upload">Upload a different package</Link>
        </Button>
      </div>
    );
  }

  const baseUrl = await resolveBaseUrl();
  const iframeSrc = `/scorm/${id}/asset?asset=${encodeURIComponent(parsed.launchFile)}`;
  const uploadedAt = record.uploadedAt.toLocaleString();
  const sizeMB = (record.file.size / BYTES_PER_MB).toFixed(2);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          SCORM Preview {/* cspell:disable-line */}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{parsed.title}</h1>
        <p className="text-base text-muted-foreground">
          Validate the SCO before distributing the preview link or LMS import package.
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
              <dt>SCORM Version</dt> {/* cspell:disable-line */}
              <dd className="text-base font-medium text-foreground">
                {parsed.version.toUpperCase()}
              </dd>
            </div>
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>Launch File</dt>
              <dd className="truncate text-base font-medium text-foreground">
                {parsed.launchFile}
              </dd>
            </div>
            <div className="rounded-2xl border border-dashed px-4 py-3">
              <dt>Organization</dt>
              <dd className="text-base font-medium text-foreground">
                {parsed.organization ?? "Not specified"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border bg-muted/30 p-6 shadow-sm">
          <ShareLink path={`/scorm/${id}`} baseUrl={baseUrl} label="Share preview link" />
          <p className="mt-3 text-sm text-muted-foreground">
            Share this link with SMEs or QA testers. Links remain active while stored.
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
                Sandboxed iframe renders with the SCORM API shim injected server-side. {/* cspell:disable-line */}
              </p>
            </div>
          </div>
          <div className="bg-muted/10">
            <iframe
              src={iframeSrc}
              title={parsed.title}
              className="h-[620px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <DebugPanel />
    </div>
  );
}
