import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const decide = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/employee', () => ({
  decideJoinRequest: decide,
}));

import { DashboardStaffPage } from '@/components/business/dashboard-staff-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, JoinRequestSummary } from '@/types/domain';

const owner: DashboardEmployee = {
  id: 'employee-zohar',
  profileId: 'profile-zohar',
  fullName: 'Zohar Levi',
  avatarUrl: '',
  positionTitle: 'Chair 1',
  status: 'ACTIVE',
  phone: '054-1112233',
  email: 'zohar@demo.local',
  serviceCount: 2,
  isOwner: true,
};

const colleague: DashboardEmployee = {
  id: 'employee-miya',
  profileId: 'profile-miya',
  fullName: 'Miya Bar',
  avatarUrl: '',
  positionTitle: 'Chair 2',
  status: 'INACTIVE',
  phone: null,
  email: null,
  serviceCount: 1,
  isOwner: false,
};

const request: JoinRequestSummary = {
  id: 'request-1',
  businessId: 'business-zohar',
  businessName: 'Studio Zohar',
  profileId: 'profile-noa',
  fullName: 'Noa Golan',
  phone: '052-9998887',
  email: 'noa@demo.local',
  status: 'PENDING',
  createdAt: '2026-08-18T09:00:00.000Z',
};

function renderStaff({
  employees = [owner, colleague],
  requests = [request],
  isOwner = true,
}: {
  employees?: DashboardEmployee[];
  requests?: JoinRequestSummary[];
  isOwner?: boolean;
} = {}) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardStaffPage employees={employees} requests={requests} isOwner={isOwner} />
    </LanguageProvider>,
  );
}

describe('business staff screen', () => {
  // Both mocks are module-level, so "was not refreshed" only means anything if the previous
  // test's successful decision is cleared first.
  beforeEach(() => {
    refresh.mockClear();
    decide.mockClear();
  });

  it('names each position, its holder, and how to reach them', () => {
    renderStaff();

    expect(
      screen.getByRole('heading', { name: 'Team members and their roles in the business (2)' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Zohar Levi')).toBeInTheDocument();
    expect(screen.getByText('Business owner and manager')).toBeInTheDocument();
    expect(screen.getByText('Founder / owner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '054-1112233' })).toHaveAttribute('href', 'tel:054-1112233');
    expect(screen.getByRole('link', { name: 'zohar@demo.local' })).toHaveAttribute(
      'href',
      'mailto:zohar@demo.local',
    );
    expect(screen.getByText('Offers 2 services in this business')).toBeInTheDocument();

    // A retired position still lists — it anchors past appointments (§6.9) — and says so.
    expect(screen.getByText('Miya Bar')).toBeInTheDocument();
    expect(screen.getByText('Inactive position')).toBeInTheDocument();
    // Singular gets its own sentence rather than "1 services".
    expect(screen.getByText('Offers one service in this business')).toBeInTheDocument();
    expect(screen.getByText('No phone number provided')).toBeInTheDocument();
  });

  it('lets the founder approve a request, naming the position it creates', async () => {
    decide.mockResolvedValueOnce({ ok: true, data: { id: 'request-1', status: 'APPROVED' } });
    renderStaff();

    expect(
      screen.getByRole('heading', { name: 'Waiting list — people asking to join the team (1)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Applied on 2026-08-18')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve and add to the team' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Approving adds Noa Golan to the team/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Position / role title'), {
      target: { value: 'Senior stylist' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith({
        id: 'request-1',
        decision: 'APPROVED',
        positionTitle: 'Senior stylist',
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('keeps the dialog open and shows why when the decision is refused', async () => {
    decide.mockResolvedValueOnce({ ok: false, error: { code: 'FORBIDDEN', message: 'Not your call.' } });
    renderStaff();

    fireEvent.click(screen.getByRole('button', { name: 'Reject the request' }));
    const dialog = screen.getByRole('dialog');
    // Rejection writes no position, so it asks for none.
    expect(within(dialog).queryByLabelText('Position / role title')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject for good' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not your call.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows an employee the queue but not the buttons — deciding is the founder’s alone (§12.1)', () => {
    renderStaff({ isOwner: false });

    expect(screen.getByText('Noa Golan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve and add to the team' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Only the business owner can approve or reject join requests.'),
    ).toBeInTheDocument();
  });

  it('explains an empty queue rather than showing a bare zero', () => {
    renderStaff({ requests: [] });

    expect(
      screen.getByRole('heading', { name: 'Waiting list — people asking to join the team (0)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Nobody is on the waiting list right now' }),
    ).toBeInTheDocument();
  });
});
