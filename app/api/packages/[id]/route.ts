import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { parseH5PArchive } from "@/lib/h5p/parser";
import { parseScormArchive } from "@/lib/scorm/parser";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = await storage.get(id);
  if (!record) {
    return NextResponse.json(
      { error: "Package not found" },
      { status: 404 }
    );
  }

  const common = {
    id: record.id,
    type: record.type,
    filename: record.file.filename,
    size: record.file.size,
    uploadedAt: record.uploadedAt.toISOString()
  };

  try {
    if (record.type === "h5p") {
      const parsed = await parseH5PArchive(record.file.buffer);
      return NextResponse.json({
        ...common,
        metadata: parsed.metadata
      });
    }
    if (record.type === "scorm") {
      const parsed = await parseScormArchive(record.file.buffer);
      return NextResponse.json({
        ...common,
        metadata: {
          title: parsed.title,
          version: parsed.version,
          organization: parsed.organization,
          launchFile: parsed.launchFile
        }
      });
    }
  } catch (error) {
    return NextResponse.json(
      { ...common, metadata: null, error: (error as Error).message },
      { status: 500 }
    );
  }

  return NextResponse.json(common);
}

