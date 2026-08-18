'use client';

import Image from 'next/image';
import Link from 'next/link';

import logo from '../../../public/images/preso-logo.png';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * The brand lockup. Replace `public/images/preso-logo.png` to change it — nothing here needs
 * editing.
 *
 * Imported as a **static asset**, not referenced by URL string, and that is the point: a static
 * import gives the file a content-hashed URL (`/_next/static/media/preso-logo.<hash>.png`), so
 * swapping the artwork changes the URL and the new one appears immediately. The plain `/images/…`
 * URL this used before kept serving the previous artwork out of the image optimizer's cache long
 * after the file on disk had changed. Static imports also supply the intrinsic width/height, so
 * there is no layout shift and no hand-maintained dimensions to drift.
 */
export function PresoLogo() {
  const { copy } = useLanguage();

  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src={logo}
        // Decorative: the brand name is right beside it as real text, so alt copy here would only
        // make a screen reader say "Preso" twice.
        alt=""
        priority
        // A square lockup in a header strip — 64px is as small as it goes before the wordmark
        // inside the artwork stops reading as text.
        className="h-16 w-16 shrink-0 object-contain"
      />

      <span>
        {/* Matches the navy→blue wordmark in the artwork; the old `--brand` purple fought it. */}
        <span className="block text-lg font-bold leading-tight text-[var(--brand-blue-dark)]">{copy.brand.name}</span>
        <span className="block text-xs leading-tight text-[var(--muted)]">{copy.header.subtitle}</span>
      </span>
    </Link>
  );
}
