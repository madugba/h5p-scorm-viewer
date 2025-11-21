"use client";

import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  details,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">{title}</p>
          <p className="text-sm text-destructive/90">{message}</p>
          {details && (
            <p className="text-xs font-mono text-destructive/70 mt-2">
              {details}
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-destructive hover:text-destructive/80 underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive flex items-center gap-1.5">
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  );
}
