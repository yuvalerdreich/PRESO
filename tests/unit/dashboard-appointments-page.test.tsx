import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { DashboardAppointmentsPage } from '@/components/business/dashboard-appointments-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { DashboardAppointment, DashboardEmployee } from '@/types/domain';

const employees: DashboardEmployee[] = [
  {
    id: 'employee-zohar',
    profileId: 'profile-zohar',
    fullName: 'Zohar Levi',
    avatarUrl: '',
    positionTitle: 'Chair 1',
    status: 'ACTIVE',
    phone: null,
    email: null,
    serviceCount: 3,
    isOwner: true,
  },
  {
    id: 'employee-noa',
    profileId: 'profile-noa',
    fullName: 'Noa Golan',
    avatarUrl: '',
    positionTitle: 'Chair 2',
    status: 'ACTIVE',
    phone: null,
    email: null,
    serviceCount: 2,
    isOwner: false,
  },
];

const appointments: DashboardAppointment[] = [
  {
    id: 'appointment-1',
    employeeId: 'employee-zohar',
    employeeName: 'Zohar Levi',
    clientName: 'Dana Cohen',
    clientPhone: '054-1112233',
    serviceName: 'Haircut',
    dateISO: '2026-08-19',
    time: '09:00',
    status: 'CONFIRMED',
  },
  {
    id: 'appointment-2',
    employeeId: 'employee-noa',
    employeeName: 'Noa Golan',
    clientName: 'Amit Bar',
    clientPhone: null,
    serviceName: 'Colouring',
    dateISO: '2026-08-19',
    time: '11:30',
    status: 'PENDING',
  },
];

function renderDiary(rows: DashboardAppointment[] = appointments) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardAppointmentsPage dateISO="2026-08-19" appointments={rows} employees={employees} />
    </LanguageProvider>,
  );
}

describe('business appointment diary', () => {
  it('shows the selected day, its count, and every booked row', () => {
    renderDiary();

    expect(screen.getByLabelText(/Display date/)).toHaveValue('2026-08-19');
    expect(
      screen.getByRole('heading', { name: 'Appointments scheduled for 2026-08-19' }),
    ).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Dana Cohen')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '054-1112233' })).toHaveAttribute('href', 'tel:054-1112233');
    expect(screen.getByText('No phone number provided')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
  });

  it('navigates rather than filtering when the display date changes', () => {
    renderDiary();

    fireEvent.change(screen.getByLabelText(/Display date/), { target: { value: '2026-08-20' } });

    expect(push).toHaveBeenCalledWith('/businesses/manage/appointments?date=2026-08-20', { scroll: false });
  });

  it('cuts the day down to one staff member in place', () => {
    renderDiary();

    fireEvent.change(screen.getByLabelText(/Station . staff filter/), {
      target: { value: 'employee-noa' },
    });

    expect(screen.getByText('Amit Bar')).toBeInTheDocument();
    expect(screen.queryByText('Dana Cohen')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith(
      expect.stringContaining('employee'),
      expect.anything(),
    );
  });

  it('explains an empty day rather than showing a bare zero', () => {
    renderDiary([]);

    expect(
      screen.getByRole('heading', { name: 'No appointments for the selected date and filter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing is booked for 2026-08-19/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('offers a colleague with nothing booked, so the filter can reach an empty answer', () => {
    renderDiary();

    fireEvent.change(screen.getByLabelText(/Station . staff filter/), {
      target: { value: 'employee-zohar' },
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(/Station . staff filter/), { target: { value: '' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
