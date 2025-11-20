import { NextResponse } from "next/server";
import { inMemoryStorage } from "@/lib/storage/in-memory-storage";
import { parseH5PArchive } from "@/lib/h5p/parser";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = inMemoryStorage.get(id);
  if (!record || record.type !== "h5p") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const parsed = await parseH5PArchive(record.file.buffer);
  const url = new URL(request.url);
  const assetParam = url.searchParams.get("asset");
  const assetPath = normalizePath(assetParam ?? parsed.metadata.mainFile);

  const asset = parsed.assets.get(assetPath);
  if (!asset) {
    return NextResponse.json(
      { error: `Asset "${assetPath}" not found` },
      { status: 404 }
    );
  }

  const extension = getExtension(assetPath);
  const contentType =
    CONTENT_TYPE_MAP[extension] ?? "application/octet-stream";

  const body = asset as BufferSource;

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
    }
  });
}

function getExtension(path: string): string {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\//, "");
}

