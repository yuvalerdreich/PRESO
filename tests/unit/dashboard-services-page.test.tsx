import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/catalog', () => ({
  upsertService: upsert,
  deleteService: remove,
}));

import { DashboardServicesPage } from '@/components/business/dashboard-services-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/domain';

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
    serviceCount: 2,
    isOwner: true,
  },
  {
    id: 'employee-miya',
    profileId: 'profile-miya',
    fullName: 'Miya Bar',
    avatarUrl: '',
    positionTitle: 'Chair 2',
    status: 'ACTIVE',
    phone: null,
    email: null,
    serviceCount: 1,
    isOwner: false,
  },
];

const services: DashboardService[] = [
  {
    id: 'service-haircut',
    employeeId: 'employee-zohar',
    employeeName: 'Zohar Levi',
    name: 'Haircut',
    description: 'A classic, professional cut',
    price: 150,
    durationMinutes: 45,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 'service-colour',
    employeeId: 'employee-miya',
    employeeName: 'Miya Bar',
    name: 'Colouring',
    description: '',
    price: 320,
    durationMinutes: 90,
    bufferMinutes: 0,
    status: 'INACTIVE',
  },
];

function renderServices({
  rows = services,
  currentEmployeeId = 'employee-zohar' as string | null,
} = {}) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardServicesPage services={rows} employees={employees} currentEmployeeId={currentEmployeeId} />
    </LanguageProvider>,
  );
}

describe('business services screen', () => {
  beforeEach(() => {
    refresh.mockClear();
    upsert.mockClear();
    remove.mockClear();
  });

  it('prices each treatment and names the one staff member who performs it', () => {
    renderServices();

    expect(screen.getByRole('heading', { name: 'Services and pricing' })).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
    expect(screen.getByText('150₪')).toBeInTheDocument();
    expect(screen.getByText('A classic, professional cut')).toBeInTheDocument();
    expect(screen.getByText('Length: 45 min')).toBeInTheDocument();
    expect(screen.getByText('Buffer: 10 min')).toBeInTheDocument();

    // One owner per service is the schema, not a display choice — the count says so out loud.
    expect(screen.getAllByText('Staff performing this treatment (1):')).toHaveLength(2);
    expect(screen.getByText('(manager)')).toBeInTheDocument();

    // An inactive service still lists — it is hidden from clients, not from its owner.
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('offers an edit button only on the caller’s own services', () => {
    renderServices();

    expect(screen.getAllByRole('button', { name: 'Edit service and price' })).toHaveLength(1);
    expect(screen.getByText('Miya Bar’s service — everyone manages their own treatments.')).toBeInTheDocument();
  });

  it('filters the catalogue by staff member in place, without a round trip', () => {
    renderServices();

    fireEvent.click(screen.getByRole('tab', { name: /Miya Bar/ }));

    expect(screen.getByText('Colouring')).toBeInTheDocument();
    expect(screen.queryByText('Haircut')).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'All staff (2)' }));
    expect(screen.getByText('Haircut')).toBeInTheDocument();
  });

  it('saves a new service through the action and refreshes the list', async () => {
    upsert.mockResolvedValueOnce({ ok: true, data: { id: 'service-new' } });
    renderServices();

    fireEvent.click(screen.getByRole('button', { name: 'Add a new service' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Service name'), { target: { value: 'Beard trim' } });
    fireEvent.change(within(dialog).getByLabelText('Price (₪)'), { target: { value: '80' } });
    fireEvent.change(within(dialog).getByLabelText('Treatment length (minutes)'), {
      target: { value: '20' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save service' }));

    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith({
        name: 'Beard trim',
        description: '',
        price: '80',
        durationMinutes: '20',
        bufferMinutes: '0',
        status: 'ACTIVE',
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('edits an existing service by id, seeded with what it already says', async () => {
    upsert.mockResolvedValueOnce({ ok: true, data: { id: 'service-haircut' } });
    renderServices();

    fireEvent.click(screen.getByRole('button', { name: 'Edit service and price' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Service name')).toHaveValue('Haircut');
    expect(within(dialog).getByLabelText('Service description (shown to clients)')).toHaveValue(
      'A classic, professional cut',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save service' }));

    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'service-haircut' })));
  });

  it('keeps the dialog open and shows why when the write is refused', async () => {
    upsert.mockResolvedValueOnce({
      ok: false,
      error: { code: 'VALIDATION', message: 'Check the fields.', fields: { price: 'Enter a valid price' } },
    });
    renderServices();

    fireEvent.click(screen.getByRole('button', { name: 'Add a new service' }));

    // Filled with values the *browser* accepts: constraint validation blocks submit on an empty
    // required input or one below `min`, so the form would never reach the action whose refusal
    // this test is about. The server re-parse is the boundary being exercised here (§9).
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Service name'), { target: { value: 'Beard trim' } });
    fireEvent.change(within(dialog).getByLabelText('Price (₪)'), { target: { value: '80' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save service' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the fields.');
    expect(screen.getByText('Enter a valid price')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  /**
   * §12.60 — deleting used to go through `window.confirm()`: the browser's dialog, announcing
   * "localhost:3000 says", LTR on an RTL screen, with an OS-labelled button doing the deleting.
   * These two pin what replaced it — that the destructive action is genuinely gated on the app's
   * own dialog, and that backing out of it does not take the form with it.
   */
  it('asks in the app’s own dialog before deleting, and does nothing until confirmed', async () => {
    remove.mockResolvedValueOnce({ ok: true, data: { softDeleted: false } });
    renderServices();

    fireEvent.click(screen.getByRole('button', { name: 'Edit service and price' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete service' }));

    // The app's dialog, not the browser's: it is in the document and it names the service. Scoped
    // with `within`, because the form underneath has a "Cancel" of its own — which is the point of
    // `aria-modal` on the top dialog, and the reason the confirmation cannot be queried globally.
    const confirmation = screen.getByRole('dialog', { name: 'Delete “Haircut”?' });
    expect(
      within(confirmation).getByText(/marked inactive instead of deleted, so history survives/),
    ).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    // Backing out deletes nothing and leaves the form standing.
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit service' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete service' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Delete “Haircut”?' })).getByRole('button', {
        name: 'Yes, delete',
      }),
    );

    await waitFor(() => expect(remove).toHaveBeenCalledWith({ id: 'service-haircut' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('lets Escape back out of the confirmation without discarding the form behind it', () => {
    renderServices();

    fireEvent.click(screen.getByRole('button', { name: 'Edit service and price' }));
    fireEvent.change(screen.getByLabelText('Service name'), { target: { value: 'Fade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete service' }));

    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    fireEvent.keyDown(document, { key: 'Escape' });

    // Only the top modal backs out; the edit form — and what was typed into it — survives.
    const remaining = screen.getAllByRole('dialog');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAccessibleName('Edit service');
    expect(screen.getByLabelText('Service name')).toHaveValue('Fade');
    expect(remove).not.toHaveBeenCalled();
  });

  it('says an empty catalogue makes the business unbookable', () => {
    renderServices({ rows: [] });

    expect(screen.getByRole('heading', { name: 'No services defined yet' })).toBeInTheDocument();
    // An empty catalogue outranks the filter: there is nothing to clear back to.
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('distinguishes that from a filter that excluded everything', () => {
    renderServices({ rows: [services[0]] });

    fireEvent.click(screen.getByRole('tab', { name: /Miya Bar/ }));

    expect(
      screen.getByRole('heading', { name: 'No treatments for the selected staff member' }),
    ).toBeInTheDocument();
  });
});
