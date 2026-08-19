'use client';

import { Clock, Pencil, Timer, UserRound, Users } from 'lucide-react';

import {
  cardChip,
  cardHoverLift,
  cardMetaIcon,
  cardMetaRow,
  cardTitle,
  surfaceCard,
} from '@/components/common/card-styles';
import { actionButton, actionButtonChip } from '@/components/common/button-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/domain';

/**
 * The service cards, already filtered by `DashboardServicesPage`.
 *
 * **"Staff performing this treatment" is always exactly one person, by design.** `services.employee_id`
 * is a single owner (§2's invariant — services and availability belong to the employee, not the
 * business), so two stylists offering "haircut" are two rows at two prices, not one row with two
 * names. The list shape is kept because that is the question the screen answers, and the count in
 * the heading is what makes the one-owner rule visible rather than implied.
 */
export function DashboardServiceList({
  services,
  employees,
  currentEmployeeId,
  onEdit,
}: {
  services: DashboardService[];
  employees: DashboardEmployee[];
  /** The caller's own position — only their own services are theirs to edit (§3.8, RLS). */
  currentEmployeeId: string | null;
  onEdit: (service: DashboardService) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          owner={employees.find((employee) => employee.id === service.employeeId)}
          isOwnService={service.employeeId === currentEmployeeId}
          onEdit={() => onEdit(service)}
        />
      ))}
    </div>
  );
}

function ServiceCard({
  service,
  owner,
  isOwnService,
  onEdit,
}: {
  service: DashboardService;
  owner?: DashboardEmployee;
  isOwnService: boolean;
  onEdit: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <article className={`${surfaceCard} ${cardHoverLift} h-full gap-4 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cardTitle}>{service.name}</h3>
          {service.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{service.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-lg font-extrabold text-[var(--brand)]">{service.price}₪</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className={cardMetaRow}>
          <Clock className={cardMetaIcon} aria-hidden="true" />
          {copy.dashboard.services.duration.replace('{minutes}', String(service.durationMinutes))}
        </span>
        {service.bufferMinutes > 0 ? (
          <span className={cardMetaRow}>
            <Timer className={cardMetaIcon} aria-hidden="true" />
            {copy.dashboard.services.buffer.replace('{minutes}', String(service.bufferMinutes))}
          </span>
        ) : null}
        {service.status === 'ACTIVE' ? null : (
          <span className={`${cardChip} bg-slate-200 text-slate-600`}>
            {copy.dashboard.services.inactiveBadge}
          </span>
        )}
      </div>

      <div className="border-t border-[var(--line)] pt-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Users className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {copy.dashboard.services.performedBy.replace('{count}', '1')}
        </p>
        <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-slate-50/70 py-1 pe-3 ps-1 text-sm">
          <OwnerAvatar owner={owner} name={service.employeeName} />
          <span className="font-semibold text-[var(--foreground)]">{service.employeeName}</span>
          {owner?.isOwner ? (
            <span className="text-xs text-[var(--muted)]">({copy.dashboard.services.ownerSuffix})</span>
          ) : null}
        </span>
      </div>

      <div className="mt-auto pt-1">
        {isOwnService ? (
          <button type="button" onClick={onEdit} className={`${actionButton} ${actionButtonChip} w-full`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {copy.dashboard.services.edit}
          </button>
        ) : (
          // Not a disabled button: a colleague's service is not something this account can edit at
          // all — `upsertService` writes against the session's own employees row and RLS re-checks
          // it — so the card says whose it is instead of dangling a control that cannot fire.
          <p className="text-xs font-semibold text-[var(--muted)]">
            {copy.dashboard.services.colleagueService.replace('{name}', service.employeeName)}
          </p>
        )}
      </div>
    </article>
  );
}

function OwnerAvatar({ owner, name }: { owner?: DashboardEmployee; name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--soft-violet)] text-[var(--brand)]">
      {owner?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage host isn't in next.config's remotePatterns (§8)
        <img src={owner.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : name ? (
        <span className="text-xs font-extrabold">{[...name][0]}</span>
      ) : (
        <UserRound className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  );
}
