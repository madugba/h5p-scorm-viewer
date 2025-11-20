import { headers } from "next/headers";

function normalizeEnvUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

export async function resolveBaseUrl(): Promise<string | null> {
  const envUrl =
    normalizeEnvUrl(process.env["NEXT_PUBLIC_VERCEL_URL"]) ??
    normalizeEnvUrl(process.env["VERCEL_URL"]);
  if (envUrl) {
    return envUrl;
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) {
    return null;
  }
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

