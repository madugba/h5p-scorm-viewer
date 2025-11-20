import { nanoid } from "nanoid";

const DEFAULT_SIZE = 10;

export function generateId(prefix?: string, size = DEFAULT_SIZE): string {
  const id = nanoid(size);
  return prefix ? `${prefix}_${id}` : id;
}

