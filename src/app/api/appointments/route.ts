import { NextResponse } from 'next/server';
import { z } from 'zod';

import { appointmentsRepository } from '@/lib/appointments/repository';
import { discoveryRepository } from '@/lib/discovery/repository';

/**
 * POST /api/appointments — TECHNICAL_DESIGN.md §5.4. A route handler, not a server action,
 * because the caller must be able to distinguish "created" from "someone else took it" by
 * status code (the real `book_appointment()` RPC's 409 on a slot conflict). No Supabase schema
 * exists yet (CLAUDE.md §8), so this resolves against the mock discovery/appointments
 * repositories and only implements the codes that are meaningful without it: 201, 400, 404.
 * 401/403/409/422 need real auth and the real availability engine — see CLAUDE.md §12.
 */

const bodySchema = z.object({
  employeeId: z.string().min(1),
  serviceId: z.string().min(1),
  // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" — local time, no offset (the mock has no timezone engine yet).
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Expected YYYY-MM-DDTHH:mm'),
});

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse('bad_request', 'employeeId, serviceId, and a valid startsAt are required.', 400);
  }

  const { employeeId, serviceId, startsAt } = parsed.data;
  const [dateISO, timePart] = startsAt.split('T');
  const time = timePart.slice(0, 5);

  const [employee, service] = await Promise.all([
    discoveryRepository.getEmployeeById(employeeId),
    discoveryRepository.getServiceById(serviceId),
  ]);
  if (!employee || !service || service.employeeId !== employeeId) {
    return errorResponse('not_found', 'Employee or service not found.', 404);
  }

  const business = await discoveryRepository.getBusinessProfile(employee.businessId);
  if (!business) {
    return errorResponse('not_found', 'Business not found.', 404);
  }

  const status = business.approvalPolicy === 'AUTO' ? 'CONFIRMED' : 'PENDING';

  const appointment = await appointmentsRepository.createAppointment({
    businessName: business.name,
    employeeName: employee.fullName,
    serviceName: service.name,
    address: business.address,
    dateISO,
    time,
    status,
  });

  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + service.durationMinutes * 60_000);

  return NextResponse.json(
    {
      id: appointment.id,
      status,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      employeeId,
      serviceId,
    },
    { status: 201 },
  );
}
