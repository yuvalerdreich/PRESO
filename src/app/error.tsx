'use client';

import { useEffect } from 'react';

/**
 * Root error boundary (TECHNICAL_DESIGN.md §8.3). Route groups add their own
 * boundaries later so that, for example, the business dashboard keeps its
 * navigation and the user is not stranded on a bare page.
 *
 * No raw error message, SQLSTATE or stack trace ever reaches the browser
 * (§8.4); the digest is the only handle, and it correlates with the server log.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong on our side</h1>
      <p className="opacity-80">
        The page could not be loaded. Nothing you did caused this, and nothing was
        saved incorrectly.
      </p>
      <div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:opacity-80"
        >
          Try again
        </button>
      </div>
      {error.digest && (
        <p className="text-xs opacity-50">Reference: {error.digest}</p>
      )}
    </main>
  );
}
