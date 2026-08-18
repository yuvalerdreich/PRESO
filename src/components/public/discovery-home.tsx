'use client';

import { CalendarSearch } from 'lucide-react';

import { PanelHero } from '@/components/common/panel-hero';
import { SearchForm } from '@/components/public/search-form';
import { useLanguage } from '@/lib/i18n/language-provider';

export function DiscoveryHome() {
  const { copy } = useLanguage();

  return (
    <PanelHero title={copy.discovery.title} description={copy.discovery.description} icon={CalendarSearch}>
      <SearchForm />
    </PanelHero>
  );
}
