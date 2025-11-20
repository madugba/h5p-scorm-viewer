import type { PackageType } from "../storage/in-memory-storage";

type RouteFor<T extends PackageType> = T extends "h5p"
  ? `/h5p/${string}`
  : `/scorm/${string}`;

export function getViewerRoute<T extends PackageType>(
  type: T,
  id: string
): RouteFor<T> {
  if (type === "h5p") {
    return `/h5p/${id}` as RouteFor<T>;
  }
  return `/scorm/${id}` as RouteFor<T>;
}

