import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InMemoryStorage,
  type PackageRecord,
  type PackageType
} from "../lib/storage/in-memory-storage";

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

  it("stores and returns packages", () => {
    const storage = new InMemoryStorage();
    const record = storage.store(createPackage({ id: "abc" }));

    expect(storage.get("abc")).toEqual(record);
    expect(storage.exists("abc")).toBe(true);
  });

  it("removes packages", () => {
    const storage = new InMemoryStorage();
    storage.store(createPackage({ id: "to-delete" }));

    expect(storage.delete("to-delete")).toBe(true);
    expect(storage.get("to-delete")).toBeUndefined();
  });

  it("supports TTL expiration", async () => {
    vi.useFakeTimers();
    const storage = new InMemoryStorage({ ttlMs: 100 });
    storage.store(createPackage({ id: "ttl" }));

    vi.advanceTimersByTime(200);
    await Promise.resolve();

    expect(storage.get("ttl")).toBeUndefined();
    expect(storage.list()).toHaveLength(0);
  });

  it("lists active packages", () => {
    const storage = new InMemoryStorage();
    storage.store(createPackage({ id: "one" }));
    storage.store(createPackage({ id: "two" }));

    const ids = storage.list().map((pkg) => pkg.id);
    expect(ids).toEqual(expect.arrayContaining(["one", "two"]));
  });
});


