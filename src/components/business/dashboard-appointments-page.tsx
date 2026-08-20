'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, Users } from 'lucide-react';

import { DashboardAppointmentList } from '@/components/business/dashboard-appointment-list';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, fieldPaddingEndIcon, surfaceField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardAppointment, DashboardEmployee } from '@/types/domain';

/**
 * `/businesses/manage/appointments` — the business's diary for one day.
 *
 * The two controls are deliberately answered at different levels, and the split is the point:
 *
 * - **The date is in the URL.** It decides *which rows exist*, so changing it has to re-run the
 *   server query (`listDashboardAppointments` scoped to that day in the business's own timezone).
 *   Putting it in the URL also makes a given day linkable and the back button meaningful — the same
 *   reasoning the booking wizard's `month`/`date`/`slot` params follow.
 * - **The staff filter is local state.** The day's rows are already in hand, so filtering them is a
 *   cut of data on screen, not a different question for the database — the same in-place filtering
 *   `DiscoveryBrowser` does (§12.43). It survives a date change on purpose: someone reading one
 *   chair's day walks through dates with that chair still selected.
 *
 * The staff list comes from the roster rather than from the day's appointments, so filtering to a
 * colleague with nothing booked is possible — that empty answer is a real one, and the list would
 * otherwise never offer the option that produces it.
 */
export function DashboardAppointmentsPage({
  dateISO,
  appointments,
  employees,
}: {
  dateISO: string;
  appointments: DashboardAppointment[];
  employees: DashboardEmployee[];
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');

  const visibleAppointments = useMemo(
    () =>
      employeeId
        ? appointments.filter((appointment) => appointment.employeeId === employeeId)
        : appointments,
    [appointments, employeeId],
  );

  function selectDate(value: string) {
    // A cleared date input reports an empty string; there is no "no day" view to navigate to.
    if (!value) return;
    router.push(`/businesses/manage/appointments?date=${value}`, { scroll: false });
  }

  return (
    <section className="flex flex-col gap-6">
      <div role="group" aria-label={copy.dashboard.diary.filtersLabel} className={`${surfaceCard} gap-4 p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <CalendarDays className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
              {copy.dashboard.diary.dateLabel}
            </span>
            <input
              type="date"
              value={dateISO}
              onChange={(event) => selectDate(event.target.value)}
              className={`${surfaceField} ${fieldPadding} cursor-pointer font-semibold`}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <Users className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
              {copy.dashboard.diary.employeeLabel}
            </span>
            <div className="relative">
              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                // `picker-select` (globals.css) is what lets the option list be styled at all —
                // without it the popup belongs to the OS and drops every rule, cursor included.
                className={`picker-select ${surfaceField} ${fieldPaddingEndIcon} cursor-pointer appearance-none font-semibold`}
              >
                <option value="">{copy.dashboard.diary.allEmployees}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {[
                      employee.fullName || employee.positionTitle,
                      employee.status === 'ACTIVE' ? null : `(${copy.dashboard.diary.inactiveEmployee})`,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-[var(--brand)] ltr:right-4 rtl:left-4"
                aria-hidden="true"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[var(--foreground)]">
            {copy.dashboard.diary.scheduledForDate.replace('{date}', dateISO)}
          </h2>
          <span className="rounded-full bg-[var(--soft-violet)] px-2.5 py-0.5 text-xs font-bold text-[var(--brand-deep)]">
            {visibleAppointments.length}
          </span>
        </div>

        <DashboardAppointmentList appointments={visibleAppointments} dateISO={dateISO} />
      </div>
    </section>
  );
}
