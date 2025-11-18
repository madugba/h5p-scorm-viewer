## H5P & SCORM Viewer

Next.js 16 App Router application for uploading, validating, and previewing interactive learning packages (H5P and SCORM) inside a controlled environment.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next dev server with Turbo transforms |
| `npm run build` | Production build |
| `npm run start` | Run the production server |
| `npm run lint` | ESLint with Next.js config |
| `npm run typecheck` | Strict TypeScript validation |
| `npm run test` | Vitest suite (storage harness for now) |

### Content Security Policy

Global CSP header (configured in `next.config.ts`):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
frame-src 'self';
object-src 'none';
base-uri 'self';
```

`unsafe-inline` and `unsafe-eval` remain enabled so embedded H5P/SCORM runtimes can execute their injected scripts and legacy inline styles. If you harden the policy further, verify every package still loads correctly.

### In-Memory Storage

`lib/storage/in-memory-storage.ts` backs uploads with a process-level `Map`. Key traits:

- Strongly typed `PackageRecord` structure with metadata and file buffers.
- Optional TTL to auto-expire packages (`ttlMs` constructor option).
- CRUD helpers (`store`, `get`, `delete`, `exists`, `list`, `purgeExpired`).

#### Limitations

- **Ephemeral** – data disappears on server restarts, crashes, or deployments.
- **Not shared** – each server instance keeps its own memory map (horizontal scaling loses parity).
- **Memory-bound** – large uploads can exhaust RAM; enforce size checks before storing.

For production use, replace this layer with object storage (S3, Vercel Blob, GCS) and persist metadata in a database.

### Testing

Storage behavior is covered by `__tests__/storage.test.ts` (Vitest). Run `npm run test` to execute the suite. Add additional suites as new libraries and parsers are implemented.
