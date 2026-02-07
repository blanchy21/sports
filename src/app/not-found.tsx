import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
      <p className="mb-6 text-muted-foreground">Page not found</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go Home
      </Link>
    </div>
  );
}
