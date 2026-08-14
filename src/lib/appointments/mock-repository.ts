import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

/**
 * Local fixture data standing in for Supabase reads (CLAUDE.md §8), mirroring the
 * lib/discovery/mock-repository.ts pattern. IDs are fixed so
 * tests/unit/appointments-repository.test.ts and tests/unit/appointments-panel.test.tsx
 * can address specific rows. Dates are computed relative to "today" so the fixture
 * never goes stale.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

const appointments: ClientAppointment[] = [
  {
    id: 'appointment-zohar',
    businessName: 'Studio Zohar',
    employeeName: 'Zohar Levi',
    serviceName: 'Haircut and styling',
    address: '142 Dizengoff St, Tel Aviv',
    dateISO: daysFromNow(5),
    time: '11:30',
    status: 'confirmed',
  },
  {
    id: 'appointment-glow-past',
    businessName: 'Glow Clinic',
    employeeName: 'Dana Cohen',
    serviceName: 'Advanced facial',
    address: '8 Aba Even Blvd, Herzliya',
    dateISO: daysFromNow(-10),
    time: '09:00',
    status: 'confirmed',
  },
];

const waitlistEntries: ClientWaitlistEntry[] = [
  {
    id: 'waitlist-noa',
    businessName: 'Glow Clinic',
    employeeName: 'Noa Golan',
    serviceName: 'Soft highlights',
    requestedDateISO: daysFromNow(7),
    requestedRange: '08:00 - 22:00',
  },
];

async function listCurrentClientAppointments(): Promise<ClientAppointment[]> {
  return appointments;
}

async function listCurrentClientWaitlistEntries(): Promise<ClientWaitlistEntry[]> {
  return waitlistEntries;
}

export const mockAppointmentsRepository = {
  listCurrentClientAppointments,
  listCurrentClientWaitlistEntries,
};
