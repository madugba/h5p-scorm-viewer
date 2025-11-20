1. Bootstrap Next 16 App Shell
- Finalize package.json scripts/deps, tsconfig.json, .eslintrc.json, next.config.ts, app/layout.tsx, app/globals.css.
- Document CSP defaults and dev scripts in README.

2. Implement In-Memory Storage Layer
- Create lib/storage/in-memory-storage.ts with Package types + CRUD helpers.
- Add unit tests or harness for storage behaviors and document trade-offs.

3. Security Utilities: Validation & ZIP Extraction
- Build lib/security/file-validator.ts and lib/security/zip-extractor.ts.
- Cover MIME/size checks, zip-slip protections, and config hooks.

4. Upload Workflow & Components
- Create app/upload/page.tsx, app/upload/actions.ts, components/sections/upload/upload-form.tsx, components/shared/share-link.tsx.
- Wire server action, client validation, success redirect, share links.

5. H5P Parsing & Viewer Routes
- Implement lib/h5p/parser.ts, app/h5p/[id]/page.tsx, app/h5p/[id]/route.ts.
- Ensure assets served with CSP headers and metadata rendering.

6. SCORM Parsing, API Shim, and Viewer
- Implement lib/scorm/parser.ts, lib/scorm/api-shim.ts, app/scorm/[id]/page.tsx, app/scorm/[id]/route.ts.
- Integrate components/layout/debug-panel.tsx for SCORM API logging.

7. Package Metadata API & Tests
- Build app/api/packages/[id]/route.ts and add tests under __tests__/upload.test.ts + __tests__/scorm-parser.test.ts.