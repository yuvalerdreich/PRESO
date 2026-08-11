import { siteConfig } from '@/lib/site';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">
        {siteConfig.name}
      </h1>
      <p className="text-lg text-balance opacity-80">{siteConfig.tagline}</p>
      <p className="text-sm opacity-60">
        Search and booking arrive with the discovery and booking features. This page is
        the shell they will render into.
      </p>
    </main>
  );
}
