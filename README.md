## H5P & SCORM Viewer

Next.js 16 App Router application for uploading, validating, and previewing interactive learning packages (H5P and SCORM) inside a controlled environment.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the application |
| `npm run build` | Production build |
| `npm run start` | Run the production server |
| `npm run lint` | ESLint with Next.js config |
| `npm run typecheck` | Strict TypeScript validation |
| `npm run test` | Run Vitest suite |

### Upload workflow

- `app/upload/page.tsx` renders the secure upload flow with client-side validation, server actions, and guidance.
- `components/sections/upload/upload-form.tsx` uses `useActionState` to invoke the `uploadPackageAction`, surfaces validation errors, and shows success details.
- `components/shared/share-link.tsx` creates copyable preview URLs (works locally and in Vercel previews).
- Successful uploads respond with the new ID and package type, store the raw archive via the in-memory storage layer, and present quick links to `/h5p/[id]` or `/scorm/[id]`.

### H5P viewer

- `lib/h5p/parser.ts` extracts metadata (title, main library, entry file) and exposes every asset in the archive.
- `app/h5p/[id]/page.tsx` renders a preview frame, package metadata, and a shareable link for any uploaded H5P archive.
- `app/h5p/[id]/route.ts` serves the requested asset (HTML, JS, CSS, media) with permissive CSP headers so embedded scripts/styles can execute.

### SCORM viewer

- `lib/scorm/parser.ts` parses `imsmanifest.xml`, determines SCORM version (1.2 / 2004), and resolves the launch file.
- `lib/scorm/api-shim.ts` exposes server-side helpers to inject SCORM 1.2 + 2004 API objects into any served HTML asset.
- `app/scorm/[id]/page.tsx` shows package metadata, preview iframe, share link, and the SCORM API `DebugPanel`.
- `app/scorm/[id]/route.ts` streams package assets and injects the API shim for HTML entries.
- `components/layout/debug-panel.tsx` captures API calls emitted by the shim for troubleshooting.

### Content Security Policy

- `next.config.ts` applies a strict, cache-busting CSP across the entire app (default-src self, inline script/style exceptions limited to viewer needs).
- Viewer asset routes (`app/h5p/[id]/route.ts`, `app/scorm/[id]/route.ts`) return a scoped CSP tailored for embedded HTML so packages can run while keeping connections self-contained.

### Storage & lifecycle

- `lib/storage/in-memory-storage.ts` keeps uploaded packages in-process with optional TTL support. Each record stores raw buffers, metadata, and timestamps so previews stay session-bound.
- `app/api/packages/[id]/route.ts` exposes a metadata endpoint that re-parses the archive on demand to surface human-readable info (title, launch file, etc.).
- Because storage is ephemeral, share links stay valid for the lifetime of the server process; restarting wipes all packages by design.

### Security, validation & parsing

- All file constraints (size, mime type, extensions) live in `lib/security/file-validator.ts`, which uses Zod schemas plus custom errors to enforce a single validation policy for both client and server.
- The upload flow performs two layers of validation:
  - Client-side guardrail in `components/sections/upload/upload-form.tsx` to short-circuit obvious issues (missing file, >100 MB).
  - Server-side Zod schema in `lib/upload/upload-form-schema.ts` that normalizes `FormData` before `uploadPackageAction` touches storage, ensuring consistent error messaging.
- ZIP handling safeguards live in `lib/security/zip-extractor.ts` to prevent zip-slip and oversize archives; the H5P/SCORM parsers call into it before reading file trees.

### API surface

| Route | Method | Description |
| --- | --- | --- |
| `/upload` | GET/POST | Upload UI + Server Action for package ingestion |
| `/h5p/:id` | GET | Viewer shell for H5P packages |
| `/h5p/:id/asset?asset=...` | GET | Streams individual H5P assets with viewer CSP |
| `/scorm/:id` | GET | SCORM viewer with API shim + debug panel |
| `/scorm/:id/asset?asset=...` | GET | Streams SCORM assets, injects shim for HTML |
| `/api/packages/:id` | GET | JSON metadata for an uploaded package |

### Testing

- `npm run test` executes Vitest suites covering upload helpers, storage, validators, parsers, and ZIP safety.
- Tests isolate domain logic (e.g., `__tests__/upload-actions.test.ts` mocks storage) so failures pinpoint business rules rather than UI wiring.
- Vercel deployments run `npm run ci:build` (tests followed by `next build`), so any failing spec blocks the deploy.

### Development & environment

- Requires Node 20+. Install deps with `npm install`.
- Optional env vars:
  - `MAX_FILE_SIZE_MB` to override the default 100 MB cap.
  - `NEXT_PUBLIC_VERCEL_URL` / `VERCEL_URL` to generate absolute share links.
- During development, `npm run dev --turbo` starts Turbopack with React 19 + Next 16 features (Server Actions, typed routes).

### Architectural summary

- **App layer (`app/`)**: Next.js routes, layouts, and Server Actions.
- **Domain/util layer (`lib/`)**: Pure logic for storage, parsing, security, and helpers. No React/Next dependencies so it is portable and testable.
- **Presentation (`components/`)**: Reusable client components (upload form, share link, debug panel).
- **Tests (`__tests__/`)**: Mirror domain modules to enforce SOLID boundaries.

Use this structure to extend functionality (e.g., add new package formats, persistence layers) without cross-cutting changes across the stack.

