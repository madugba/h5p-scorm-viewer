import { NextResponse } from "next/server";
import { inMemoryStorage } from "@/lib/storage/in-memory-storage";
import { parseScormArchive } from "@/lib/scorm/parser";
import { buildScormApiScript } from "@/lib/scorm/api-shim";

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
  if (!record || record.type !== "scorm") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const parsed = parseScormArchive(record.file.buffer);
  const url = new URL(request.url);
  const assetParam = url.searchParams.get("asset");
  const assetPath = normalizePath(assetParam ?? parsed.launchFile);
  const asset = parsed.assets.get(assetPath);

  if (!asset) {
    return NextResponse.json(
      { error: `Asset "${assetPath}" not found` },
      { status: 404 }
    );
  }

  const extension = getExtension(assetPath);
  let body: Buffer | string = asset;

  if (extension === ".html" || extension === ".htm") {
    const html = asset.toString("utf-8");
    body = injectShim(html, buildScormApiScript(record.id));
  }

  const contentType =
    CONTENT_TYPE_MAP[extension] ?? "application/octet-stream";

  const responseBody =
    typeof body === "string" ? body : (body as BufferSource as BodyInit);

  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
    }
  });
}

function injectShim(html: string, script: string): string {
  const shimTag = `<script>${script}</script>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${shimTag}</head>`);
  }
  return `${shimTag}${html}`;
}

function getExtension(path: string): string {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\//, "");
}

