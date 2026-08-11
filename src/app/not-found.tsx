import Link from 'next/link';

/**
 * `NOT_FOUND` and `FORBIDDEN` are deliberately indistinguishable for
 * cross-tenant reads (TECHNICAL_DESIGN.md §8.1): answering "you may not see
 * this" would confirm the row exists. So this copy never speculates about why.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="opacity-80">
        The link may be out of date, or the item may no longer exist.
      </p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Go back home
      </Link>
    </main>
  );
}
