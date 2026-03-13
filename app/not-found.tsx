import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className="mb-4 text-8xl font-bold tracking-tight text-foreground/10">
          404
        </p>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or head back to the dashboard.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-[#F7C948] px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#e5b83d]"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
