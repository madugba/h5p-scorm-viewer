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
- `components/upload-form.tsx` uses `useFormState` to invoke the `uploadPackageAction`, surfaces validation errors, and shows success details.
- `components/share-link.tsx` creates copyable preview URLs (works locally and in Vercel previews).
- Successful uploads respond with the new ID and package type, store the raw archive via the in-memory storage layer, and present quick links to `/h5p/[id]` or `/scorm/[id]`.

### Content Security Policy

