"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ScormEventDetail = {
  packageId: string;
  api: string;
  method: string;
  args: unknown[];
  result: unknown;
};

export function DebugPanel() {
  const [events, setEvents] = useState<ScormEventDetail[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<ScormEventDetail>).detail;
      setEvents((prev) => [detail, ...prev].slice(0, 100));
    }
    window.addEventListener("scorm-api-call", handler as EventListener);
    return () =>
      window.removeEventListener("scorm-api-call", handler as EventListener);
  }, []);

  if (!events.length && !open) {
    return null;
  }

  const visibleEvents = open ? events : events.slice(0, 5);

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">SCORM API Debugger</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen((prev) => !prev)}>
            {open ? "Collapse" : "Expand"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEvents([])}
            disabled={!events.length}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
        {visibleEvents.map((event, index) => (
          <div
            key={`${event.method}-${index}`}
            className="rounded-md border bg-muted/40 px-3 py-2"
          >
            <p className="text-xs uppercase text-muted-foreground">
              {event.api} • {event.method}
            </p>
            <p className="text-foreground">
              Args: {JSON.stringify(event.args)}
            </p>
            <p className="text-foreground">
              Result: {JSON.stringify(event.result)}
            </p>
          </div>
        ))}
      </div>
      {events.length > 5 && !open && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing latest 5 of {events.length} events. Expand to view more.
        </p>
      )}
    </div>
  );
}
