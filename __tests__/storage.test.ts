import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryStorage } from "../lib/storage/in-memory-storage";
import type { PackageRecord, PackageType } from "../lib/storage/types";

const createPackage = (
  overrides: Partial<PackageRecord> = {}
): PackageRecord => {
  const base: PackageRecord = {
    id: overrides.id ?? "pkg_" + Math.random().toString(36).slice(2),
    type: overrides.type ?? ("h5p" as PackageType),
    file: overrides.file ?? {
      filename: "lesson.h5p",
      mimeType: "application/zip",
      size: 4,
      buffer: Buffer.from("demo")
    },
    metadata: overrides.metadata ?? undefined,
    uploadedAt: overrides.uploadedAt ?? new Date(),
    expiresAt: overrides.expiresAt ?? undefined
  };

  return { ...base, ...overrides };
};

describe("InMemoryStorage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and returns packages", async () => {
    const storage = new InMemoryStorage();
    const record = await storage.store(createPackage({ id: "abc" }));

    expect(await storage.get("abc")).toEqual(record);
    expect(await storage.exists("abc")).toBe(true);
  });

  it("removes packages", async () => {
    const storage = new InMemoryStorage();
    await storage.store(createPackage({ id: "to-delete" }));

    expect(await storage.delete("to-delete")).toBe(true);
    expect(await storage.get("to-delete")).toBeUndefined();
  });

  it("supports TTL expiration", async () => {
    vi.useFakeTimers();
    const storage = new InMemoryStorage({ ttlMs: 100 });
    await storage.store(createPackage({ id: "ttl" }));

    vi.advanceTimersByTime(200);
    await Promise.resolve();

    expect(await storage.get("ttl")).toBeUndefined();
    expect(await storage.list()).toHaveLength(0);
  });

  it("lists active packages", async () => {
    const storage = new InMemoryStorage();
    await storage.store(createPackage({ id: "one" }));
    await storage.store(createPackage({ id: "two" }));

    const ids = (await storage.list()).map((pkg) => pkg.id);
    expect(ids).toEqual(expect.arrayContaining(["one", "two"]));
  });
});
