'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Plus, Scissors, UserRound } from 'lucide-react';

import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import { DashboardServiceList } from '@/components/business/dashboard-service-list';
import { ServiceFormModal } from '@/components/business/service-form-modal';
import {
  actionButton,
  actionButtonChip,
  actionButtonLarge,
  actionButtonSelectedOnLight,
} from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { EmptyState } from '@/components/common/empty-state';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/domain';

type FormTarget = { mode: 'add' } | { mode: 'edit'; service: DashboardService };

/**
 * `/dashboard/services` — the business's catalogue and pricing.
 *
 * The staff filter is client state filtering rows already in hand, exactly like the appointment
 * diary's: the whole catalogue is one small list, so a round trip per chip would buy nothing
 * (§12.43's in-place filtering). Unlike the diary there is no date to scope by, so nothing here
 * belongs in the URL.
 *
 * The screen reads the **whole business's** catalogue — that is a display concern, and seeing what
 * a colleague charges is the point of a price list. Writing stays scoped to the caller's own
 * position (§3.8), which is why `currentEmployeeId` is threaded down: it decides which cards offer
 * an edit button at all.
 */
export function DashboardServicesPage({
  services,
  employees,
  currentEmployeeId,
}: {
  services: DashboardService[];
  employees: DashboardEmployee[];
  currentEmployeeId: string | null;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const counts = useMemo(() => {
    const byEmployee = new Map<string, number>();
    for (const service of services) {
      byEmployee.set(service.employeeId, (byEmployee.get(service.employeeId) ?? 0) + 1);
    }
    return byEmployee;
  }, [services]);

  const visibleServices = useMemo(
    () => (employeeId ? services.filter((service) => service.employeeId === employeeId) : services),
    [services, employeeId],
  );

  function closeForm() {
    setFormTarget(null);
  }

  // `upsertService`/`deleteService` revalidate `/dashboard/services`; this re-runs the server
  // component that fetched these rows, so the card list and the nav badge both follow the write.
  function afterSave() {
    router.refresh();
    setFormTarget(null);
  }

  return (
    <section className="flex flex-col gap-5">
      <DashboardSectionHeader
        icon={Scissors}
        title={copy.dashboard.services.title}
        description={copy.dashboard.services.description}
        action={
          <button
            type="button"
            onClick={() => setFormTarget({ mode: 'add' })}
            className={`${actionButton} ${actionButtonLarge} shrink-0 shadow-lg`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {copy.dashboard.services.addService}
          </button>
        }
      />

      <div className={`${surfaceCard} gap-3 p-4 sm:p-5`}>
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
          <Filter className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {copy.dashboard.services.filterLabel}
        </p>

        <div role="tablist" aria-label={copy.dashboard.services.filterLabel} className="flex flex-wrap gap-2">
          <FilterChip
            label={copy.dashboard.services.allEmployees.replace('{count}', String(services.length))}
            selected={employeeId === ''}
            onClick={() => setEmployeeId('')}
          />
          {employees.map((employee) => (
            <FilterChip
              key={employee.id}
              label={employee.fullName || employee.positionTitle}
              count={counts.get(employee.id) ?? 0}
              avatarUrl={employee.avatarUrl}
              selected={employeeId === employee.id}
              onClick={() => setEmployeeId(employee.id)}
            />
          ))}
        </div>
      </div>

      {visibleServices.length > 0 ? (
        <DashboardServiceList
          services={visibleServices}
          employees={employees}
          currentEmployeeId={currentEmployeeId}
          onEdit={(service) => setFormTarget({ mode: 'edit', service })}
        />
      ) : (
        // Two different nothings, and the words have to tell them apart: an empty catalogue (which
        // makes the business unbookable) versus a filter that excluded everything.
        <EmptyState
          icon={services.length === 0 ? Scissors : UserRound}
          title={
            services.length === 0
              ? copy.dashboard.services.emptyTitle
              : copy.dashboard.services.emptyFilteredTitle
          }
          description={
            services.length === 0
              ? copy.dashboard.services.emptyDescription
              : copy.dashboard.services.emptyFilteredDescription
          }
          onClear={services.length === 0 ? undefined : () => setEmployeeId('')}
        />
      )}

      {formTarget ? (
        <ServiceFormModal
          service={formTarget.mode === 'edit' ? formTarget.service : undefined}
          onClose={closeForm}
          onSaved={afterSave}
        />
      ) : null}
    </section>
  );
}

/**
 * A staff chip. Same control-row shape as `/businesses`' filter tabs, on the light surface — so the
 * selected state is the ring-on-light variant, not the white ring that only reads on a `PanelHero`.
 */
function FilterChip({
  label,
  count,
  avatarUrl,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  avatarUrl?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`${actionButton} ${actionButtonChip} ${selected ? actionButtonSelectedOnLight : ''}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage host isn't in next.config's remotePatterns (§8)
        <img src={avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : null}
      {label}
      {count === undefined ? null : (
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{count}</span>
      )}
    </button>
  );
}
