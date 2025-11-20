"use client";

import { useMemo, useRef, useState, useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  MAX_FILE_SIZE_BYTES,
  BYTES_PER_MB,
  DEFAULT_MAX_SIZE_MB
} from "@/lib/security/file-validator";
import { uploadPackageAction } from "@/app/upload/actions";
import { initialUploadState, type UploadState } from "@/app/upload/state";
import { Button } from "@/components/ui/button";
import { ShareLink } from "@/components/shared/share-link";
import { cn } from "@/lib/utils";
import { getViewerRoute } from "@/lib/utils/viewer-routes";

const ACCEPTED_EXTENSIONS = ".h5p,.zip";
const MAX_SIZE_MB = Math.round(MAX_FILE_SIZE_BYTES / BYTES_PER_MB);

interface UploadFormProps {
  baseUrl: string | null;
}

const PACKAGE_OPTIONS = [
  { label: "Auto detect", value: "auto" },
  { label: "H5P (.h5p)", value: "h5p" },
  { label: "SCORM (.zip)", value: "scorm" }
] as const;



export function UploadForm({ baseUrl }: UploadFormProps) {
  const [state, formAction] = useActionState(uploadPackageAction, initialUploadState);
  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const normalizedBaseUrl: string | null = baseUrl ?? null;

  function validateClient(): boolean {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setClientError("Select a package to upload.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(`File must be smaller than ${MAX_SIZE_MB}MB.`);
      return false;
    }
    setClientError(null);
    return true;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validateClient()) {
      event.preventDefault();
    }
  }

  const successState = state.status === "success" ? state : null;
  const errorMessage = clientError ?? (state.status === "error" ? state.message : null);

  return (
    <form
      ref={formRef}
      action={formAction}
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
          className="block w-full cursor-pointer rounded-md border border-dashed border-border bg-background/80 px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <p className="text-xs text-muted-foreground">
          Accepted formats: .h5p or .zip (SCORM). Max size {MAX_SIZE_MB}MB.
        </p>
      </div>

      <fieldset className="space-y-2">
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
                  : "bg-background/90"
              )}
            >
              <input
                type="radio"
                name="packageType"
                value={option.value}
                defaultChecked={option.value === "auto"}
                className="size-4"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {errorMessage && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <SubmitButton />

      {successState && (
        <SuccessSummary state={successState} baseUrl={normalizedBaseUrl} />
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" aria-disabled={pending}>
      {pending ? "Uploading…" : "Upload & Generate Preview"}
    </Button>
  );
}

function SuccessSummary({
  state,
  baseUrl
}: {
  state: Extract<UploadState, { status: "success" }>;
  baseUrl?: string | null;
}) {
  const destination = useMemo(
    () => `/${state.packageType}/${state.packageId}`,
    [state.packageId, state.packageType]
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
      <ShareLink path={destination} baseUrl={baseUrl ?? null} />
      <Button asChild variant="outline">
        <Link href={getViewerRoute(state.packageType, state.packageId)}>
          Open viewer
        </Link>
      </Button>
    </div>
  );
}

