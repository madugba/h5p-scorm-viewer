"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MAX_FILE_SIZE_BYTES,
  BYTES_PER_MB,
} from "@/lib/security/file-validator";
import { Button } from "@/components/ui/button";
import { ShareLink } from "@/components/shared/share-link";
import { ErrorMessage } from "@/components/ui/error-message";
import { cn } from "@/lib/utils";
import { getViewerRoute } from "@/lib/utils/viewer-routes";
import type { PackageType } from "@/lib/storage";

const ACCEPTED_EXTENSIONS = ".h5p,.zip";
const MAX_SIZE_MB = Math.round(MAX_FILE_SIZE_BYTES / BYTES_PER_MB);

interface UploadFormProps {
  baseUrl: string | null;
}

interface UploadSuccess {
  packageId: string;
  packageType: PackageType;
}

type UploadStatus = "idle" | "validating" | "uploading" | "completing" | "success" | "error";

const PACKAGE_OPTIONS = [
  { label: "Auto detect", value: "auto" },
  { label: "H5P (.h5p)", value: "h5p" },
  { label: "SCORM (.zip)", value: "scorm" }
] as const;

async function uploadToR2(
  file: File,
  packageType: string,
  onProgress?: (progress: number) => void
): Promise<UploadSuccess> {
  const presignResponse = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      packageType,
    }),
  });

  if (!presignResponse.ok) {
    const errorData = await presignResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message ?? "Failed to prepare upload");
  }

  const { uploadUrl, packageId, packageType: resolvedType } = await presignResponse.json();

  const uploadResponse = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      resolve(new Response(null, { status: xhr.status }));
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed. Please check your connection and try again."));
    };

    xhr.send(file);
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage");
  }

  const completeResponse = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      packageId,
      packageType: resolvedType,
      filename: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    }),
  });

  if (!completeResponse.ok) {
    const errorData = await completeResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message ?? "Failed to complete upload");
  }

  return { packageId, packageType: resolvedType };
}

export function UploadForm({ baseUrl }: UploadFormProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateClient(): string | null {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      return "Select a package to upload.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File must be smaller than ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateClient();
    if (validationError) {
      setError(validationError);
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData(event.currentTarget);
    const packageType = (formData.get("packageType") as string) ?? "auto";

    setError(null);
    setStatus("validating");
    setProgress(0);

    try {
      setStatus("uploading");
      const result = await uploadToR2(file, packageType, setProgress);
      setSuccess(result);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
      setStatus("error");
    }
  }

  function handleRetry() {
    setError(null);
    setStatus("idle");
    setProgress(0);
  }

  const isUploading = status === "validating" || status === "uploading" || status === "completing";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-card/60 p-6 shadow-sm"
    >
      <div className="space-y-2">
        <label
          htmlFor="package"
          className="text-sm font-medium text-foreground"
        >
          Package file
        </label>
        <input
          ref={fileInputRef}
          type="file"
          id="package"
          name="package"
          accept={ACCEPTED_EXTENSIONS}
          disabled={isUploading}
          className="block w-full cursor-pointer rounded-md border border-dashed border-border bg-background/80 px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          Accepted formats: .h5p or .zip (SCORM). Max size {MAX_SIZE_MB}MB.
        </p>
      </div>

      <fieldset className="space-y-2" disabled={isUploading}>
        <legend className="text-sm font-medium text-foreground">
          Package type
        </legend>
        <div className="flex flex-wrap gap-3">
          {PACKAGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm",
                option.value === "auto"
                  ? "bg-muted/30 text-muted-foreground"
                  : "bg-background/90",
                isUploading && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="radio"
                name="packageType"
                value={option.value}
                defaultChecked={option.value === "auto"}
                className="size-4"
                disabled={isUploading}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <ErrorMessage
          title="Upload failed"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {status === "validating" && "Validating..."}
              {status === "uploading" && "Uploading..."}
              {status === "completing" && "Finalizing..."}
            </span>
            {status === "uploading" && (
              <span className="font-medium">{progress}%</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isUploading}>
        {isUploading ? "Uploading…" : "Upload & Generate Preview"}
      </Button>

      {success && status === "success" && (
        <SuccessSummary
          packageId={success.packageId}
          packageType={success.packageType}
          baseUrl={baseUrl}
        />
      )}
    </form>
  );
}

function SuccessSummary({
  packageId,
  packageType,
  baseUrl,
}: {
  packageId: string;
  packageType: PackageType;
  baseUrl: string | null;
}) {
  const destination = useMemo(
    () => `/${packageType}/${packageId}`,
    [packageId, packageType]
  );

  return (
    <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
      <div>
        <p className="font-medium text-foreground">
          Package uploaded successfully.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the preview link below or open the viewer.
        </p>
      </div>
      <ShareLink path={destination} baseUrl={baseUrl} />
      <Button asChild variant="outline">
        <Link href={getViewerRoute(packageType, packageId)}>
          Open viewer
        </Link>
      </Button>
    </div>
  );
}
