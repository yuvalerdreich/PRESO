import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/appointments/route';
import { appointmentsRepository } from '@/lib/appointments/repository';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/appointments', () => {
  it('creates a CONFIRMED appointment for an AUTO-approval business and adds it to My appointments', async () => {
    const response = await POST(
      postRequest({ employeeId: 'e-zohar', serviceId: 's-zohar-2', startsAt: '2026-09-01T11:00:00' }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body).toMatchObject({ status: 'CONFIRMED', employeeId: 'e-zohar', serviceId: 's-zohar-2' });

    await expect(appointmentsRepository.listCurrentClientAppointments()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: body.id, status: 'CONFIRMED', dateISO: '2026-09-01', time: '11:00' }),
      ]),
    );
  });

  it('creates a PENDING appointment for a MANUAL-approval business', async () => {
    const response = await POST(
      postRequest({ employeeId: 'e-glow-1', serviceId: 's-glow-1', startsAt: '2026-09-02T09:00:00' }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.status).toBe('PENDING');

    await expect(appointmentsRepository.listCurrentClientAppointments()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: body.id, status: 'PENDING' })]),
    );
  });

  it('returns 400 for a malformed body', async () => {
    const response = await POST(postRequest({ employeeId: 'e-zohar' }));
    expect(response.status).toBe(400);
  });

  it('returns 404 when the employee or service does not exist', async () => {
    const response = await POST(
      postRequest({ employeeId: 'nope', serviceId: 'nope', startsAt: '2026-09-01T11:00:00' }),
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 when the service does not belong to the given employee', async () => {
    const response = await POST(
      postRequest({ employeeId: 'e-zohar', serviceId: 's-glow-1', startsAt: '2026-09-01T11:00:00' }),
    );
    expect(response.status).toBe(404);
  });
});
