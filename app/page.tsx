import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-gray-900">
      <div className="max-w-2xl space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          H5P & SCORM Previewer
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          h5p-scorm-viewer
        </h1>
        <p className="text-base text-slate-600">
          Upload interactive learning packages, validate metadata, and share secure preview
          links―all from a single streamlined workspace.
        </p>
        <div className="pt-2">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Go to Upload
          </Link>
        </div>
      </div>
    </main>
  );
}
