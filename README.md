# H5P + SCORM Viewer 

A secure, lightweight H5P and SCORM viewer
supporting:

-   Uploading `.h5p` and SCORM `.zip` packages\
-   Parsing manifests (H5P + SCORM 1.2)\
-   Rendering content in an isolated sandbox\
-   API-shimmed SCORM runtime tracking\
-   CSP-protected iframe delivery\
-   Safe ZIP extraction (zip-slip protection)\
-   In-memory package storage (with documented limitations)

This project is ideal for **previewing** SCORM/H5P packages, validating
manifests, and testing SCORM API behavior---**not** for production LMS
usage without a persistence upgrade.

## Features

### H5P

-   Upload `.h5p` files\
-   Parse `h5p.json` + library dependencies\
-   Extract assets\
-   Serve content via `/h5p/[id]`

### SCORM 1.2

-   Upload `.zip` SCORM packages\
-   Parse `imsmanifest.xml`\
-   Support single- and multi-SCO courses\
-   Provides a SCORM 1.2 API shim\
-   Debug panel for API calls\
-   Serve packages via `/scorm/[id]`

## Project Structure

```
h5p-scorm-viewer/
├── app/
│   ├── upload/
│   │   ├── page.tsx                    # Upload page with validation
│   │   ├── actions.ts                  # Server action for file upload
│   │   └── state.ts                    # Upload state types
│   ├── h5p/
│   │   └── [id]/
│   │       ├── page.tsx                # H5P viewer
│   │       └── asset/
│   │           └── route.ts            # Serves H5P assets
│   ├── scorm/
│   │   └── [id]/
│   │       ├── page.tsx                # SCORM viewer with API shim
│   │       └── asset/
│   │           └── route.ts            # Serves SCORM assets
│   ├── api/
│   │   └── packages/[id]/
│   │       └── route.ts                # Metadata endpoint
│   ├── page.tsx                        # Home page
│   ├── layout.tsx                      # Root layout with CSP
│   └── globals.css
├── lib/
│   ├── storage/
│   │   └── in-memory-storage.ts        # Session-only storage
│   ├── scorm/
│   │   ├── api-shim.ts                 # SCORM 1.2 & 2004 runtime
│   │   └── parser.ts                   # Manifest parser
│   ├── h5p/
│   │   └── parser.ts                   # H5P parser
│   ├── security/
│   │   ├── zip-extractor.ts            # Secure ZIP extraction
│   │   ├── file-validator.ts           # MIME/size validation
│   │   └── errors.ts                   # Validation error types
│   ├── upload/
│   │   ├── infer-package-type.ts       # Package type detection
│   │   └── upload-form-schema.ts      # Zod validation schema
│   └── utils/
│       ├── id-generator.ts             # nanoid wrapper
│       ├── base-url.ts                 # Base URL resolution
│       ├── viewer-routes.ts            # Viewer route helpers
│       └── utils.ts                   # Utility functions
├── components/
│   ├── layout/
│   │   └── debug-panel.tsx            # SCORM API debug panel
│   ├── sections/
│   │   └── upload/
│   │       └── upload-form.tsx        # File upload form component
│   ├── shared/
│   │   └── share-link.tsx             # Shareable preview URL component
│   └── ui/
│       └── button.tsx                  # Reusable button component
├── __tests__/
│   ├── file-validator.test.ts          # File validation tests
│   ├── h5p-parser.test.ts              # H5P parser tests
│   ├── scorm-parser.test.ts            # SCORM parser tests
│   ├── storage.test.ts                 # In-memory storage tests
│   ├── upload-actions.test.ts          # Upload server action tests
│   ├── upload.test.ts                  # Upload validation tests
│   └── zip-extractor.test.ts          # ZIP extraction security tests
├── public/
│   └── samples/                        # Sample H5P + SCORM files
├── next.config.ts
├── vercel.json
├── tsconfig.json
└── README.md
```


## Included Sample Files
  Some sample file has been included in the  `public/sample` dir. 

  --------------------------------------------------------------------------------
  Filename                             Type               Source
  ------------------------------------ ------------------ ------------------------
  `accordion-6-7138.h5p`               H5P --- Accordion  H5P.org Accordion

  `course-presentation-21-21180.h5p`   H5P --- Course     H5P.org Presentation
                                       Presentation       

  `interactive-video-2-618.h5p`        H5P ---            H5P.org Interactive
                                       Interactive Video  Video

  `RuntimeMinimumCalls_SCORM12.zip`    SCORM 1.2          Standard runtime sample

  `greenpeace-scorm-sample.zip`        SCORM 1.2          Greenpeace SCORM repo

  `scorm-basic-sample.zip`             SCORM 1.2 (single  Minimal package
                                       SCO)               

  `scorm-checklist-sample.zip`         SCORM 1.2          Two-lesson multi-SCO        
  --------------------------------------------------------------------------------

## Limitations

### 404 on `/scorm/[id]` or `/h5p/[id]`

Root cause:\
`inMemoryStorage.get(id) === undefined`

Why: - Memory is per-process\
- Vercel/serverless runs each request in separate instances\
- Redirect viewer hits different runtime → 404\
- Redeploy/cold start wipes memory

Local dev issue (before fix):\
Turbopack spawned multiple workers → each had separate Map.

### Local Dev Fix Implemented

Storage is now pinned to:

    globalThis.H5P_SCORM_IN_MEMORY_STORAGE

All workers now share the same Map.

**This does NOT fix production**---serverless environments still have
isolated runtimes.

### SCORM API is a stub (not a full LMS)

The SCORM runtime provided by `lib/scorm/api-shim.ts` is a runtime shim that emulates key SCORM methods (`Initialize`, `GetValue`, `SetValue`, `Commit`, `Terminate`, and error helpers). It is intentionally lightweight:

- It captures and stores runtime parameters in memory for debugging and integration testing.
- It does not implement a full LMS feature set (user/session management, detailed attempt tracking, complex suspend-data handling, scoring policies, sequencing/rollup for multi-SCO courses, historical audit logs, or integration with an LRS).
- It is not suitable as a drop-in replacement for production LMS servers.

**Mitigation**: For production-grade tracking, integrate with a real backend that records sessions, attempts, timestamps, and audit logs; or connect to an existing LMS/LRS that supports the tracking semantics required.

### Some SCORM packages may not work fully

Real-world SCORM packages vary widely—vendors add non-standard JavaScript, rely on host LMS behaviors, or expect particular runtime features. As a result:

- Packages using advanced sequencing, third-party libraries, cross-origin calls, or non-standard manifest layouts may fail or behave unexpectedly.
- Inline scripts, `eval()` usage, or fragile assumptions about the window environment can break inside the sandboxed viewer or under CSP.
- Multi-SCO packages that depend on LMS-level sequencing, rollup, or cross-SCO suspend data may not behave correctly with the simplified shim.

**Mitigation**: Use the included Debug Panel to inspect API calls and errors. For problematic packages, test in a full LMS (Moodle, SCORM Cloud) or extend the shim/backend to emulate the missing LMS behaviors required by the package.

### CSP compromises for content compatibility

To allow legacy H5P/SCORM packages to run, the application's Content Security Policy is more permissive than a hardened production policy (for example, allowing `'unsafe-inline'` for styles/scripts in some routes). This is a pragmatic trade-off:

- Many packages embed inline scripts/styles, rely on `eval()` or use legacy patterns that are incompatible with strict CSP.
- The permissive policy increases attack surface compared to a fully locked-down CSP.

**Mitigation**:
- Only apply relaxed CSP on the isolated viewer routes; keep the rest of the application with a strict CSP.
- Prefer to host vetted packages and sanitize or rewrite inline assets where possible.
- For production, consider a content review process and a hardened proxy that rewrites inline scripts/styles into external assets, or require authors to publish CSP-friendly packages.

### Summary

The `globalThis` pin fixes local development worker inconsistencies but does not solve cross-instance persistence in serverless/clustered deployments.

For reliable, production-capable preview links and full tracking, implement persistent storage and a robust backend/LMS integration.

The SCORM shim and permissive CSP are pragmatic trade-offs for preview/testing convenience—they are not production-grade replacements for a full LMS with hardened security.

## Recommended Production:

Use real persistence:

-   Vercel Blob\
-   AWS S3\
-   Redis\
-   PostgreSQL / PlanetScale

## Setup

    npm install
    npm run dev
    npm test
    npm run build

## Deployment to Vercel

The project is configured for Vercel deployment via `vercel.json`:

- **Framework**: Next.js (auto-detected)
- **Build command**: `npm run ci:build` (runs `npm run test` followed by `npm run build`)
- **Install command**: `npm install`
- **Output directory**: `.next`
- **Serverless functions**: All routes under `app/**` are configured with:
  - Max duration: 60 seconds
  - Memory: 1024 MB

When deploying to Vercel:
1. Connect the Git repository to Vercel
2. Vercel automatically detects Next.js and uses the `vercel.json` configuration
3. Each deployment runs `npm run ci:build`, which executes tests before building
4. If tests fail, the deployment is blocked
5. Preview URLs are automatically generated for branches and pull requests

The `ShareLink` component automatically detects and uses Vercel preview URLs when available.

## Testing

### Local Development Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

2. **Upload a package**:
   - Navigate to `/upload`
   - Select an H5P (`.h5p`) or SCORM (`.zip`) package from `public/samples/` or upload your own
   - Click "Upload & Generate Preview"
   - On success, a preview link and "Open viewer" button will appear

3. **View the content**:
   - Click "Open viewer" or use the generated preview link
   - For H5P packages: Content renders in an iframe with metadata displayed
   - For SCORM packages: Content renders with a debug panel showing API calls (Initialize, GetValue, SetValue, Commit, Terminate)

4. **Verify functionality**:
   - H5P: Interactive elements should respond to user input
   - SCORM: Use the Debug Panel (bottom-right) to monitor API calls and verify runtime communication
   - Check that assets (images, styles, scripts) load correctly

5. **Test error handling**:
   - Upload an invalid file type to verify validation
   - Upload a malformed SCORM package to see error messages
   - Test file size limits (default 100MB)

**Note**: Local development uses a `globalThis` singleton for storage, so packages persist across hot reloads and multiple workers during the same development session.

### Production/Preview URL Testing

Testing on Vercel Preview URLs or production deployments has important limitations:

1. **Access the Preview URL**:
   - Vercel generates preview URLs  `https://h5p-scorm-viewer.vercel.app`
   - Navigate to `/upload` on the preview URL

2. **Upload a package**:
   - Follow the same upload process as local testing
   - A preview link will be generated using the preview domain

3. **Expected behavior and limitations**:
   - **Upload may succeed**: The server action stores the package in memory
   - **Viewer may return 404**: If the viewer request lands on a different serverless instance than the upload, `inMemoryStorage.get(id)` returns `undefined`, causing a 404
   - **Packages are ephemeral**: Any redeploy, scale event, or cold start wipes the memory map, breaking previously generated links
   - **No persistence**: Unlike local development, there is no shared storage across serverless invocations

4. **Why production testing may not work**:
   - Serverless functions run in isolated instances with separate memory
   - The upload action and viewer route may execute on different instances
   - Each instance has its own empty `Map`, so packages uploaded in one instance are not accessible from another
   - This is expected behavior for the current in-memory storage implementation

### Automated Test Suite

Run the test suite to verify core functionality:

```bash
npm test
```

This runs Vitest tests covering:
- File validation (`file-validator.test.ts`)
- H5P parsing (`h5p-parser.test.ts`)
- SCORM parsing (`scorm-parser.test.ts`)
- Storage operations (`storage.test.ts`)
- Upload actions (`upload-actions.test.ts`)
- ZIP extraction security (`zip-extractor.test.ts`)

## Security

-   CSP headers\
-   ZIP-slip prevention\
-   File validation\
-   Sandboxed iframes

