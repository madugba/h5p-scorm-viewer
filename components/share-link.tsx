"use client";

import { useMemo, useState } from "react";
import { Button } from "./ui/button";

interface ShareLinkProps {
  path: string;
  baseUrl?: string | null;
  label?: string;
}

export function ShareLink({ path, baseUrl, label = "Preview link" }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const href = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URL(path, window.location.origin).toString();
    }
    if (baseUrl) {
      try {
        return new URL(path, baseUrl).toString();
      } catch {
        return path;
      }
    }
    return path;
  }, [path, baseUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {href}
        </code>
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

