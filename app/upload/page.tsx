import type { Metadata } from "next";
import { UploadForm } from "@/components/sections/upload/upload-form";
import { resolveBaseUrl } from "@/lib/utils/base-url";

export const metadata: Metadata = {
  title: "Upload | H5P & SCORM Viewer",
  description: "Upload interactive H5P or SCORM packages and generate preview links."
};

export default async function UploadPage() {
  const baseUrl = await resolveBaseUrl();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Upload package
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Generate preview links for H5P & SCORM content
        </h1>
        <p className="text-base text-muted-foreground">
          Files stay in memory for this session only. Validate, preview, and debug before sharing.
        </p>
      </div>
      <UploadForm baseUrl={baseUrl} />
    </div>
  );
}

