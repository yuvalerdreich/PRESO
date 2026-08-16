import type { ClientAppointment, ClientWaitlistEntry, CreateAppointmentInput } from '@/types/domain';

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

function initialAppointments(): ClientAppointment[] {
  return [
    {
      id: 'appointment-zohar',
      businessName: 'Studio Zohar - מספרת זוהר',
      employeeName: 'זוהר לוי',
      serviceName: 'תספורת ועיצוב שיער',
      address: 'רחוב דיזנגוף 142, תל אביב',
      dateISO: daysFromNow(5),
      time: '11:30',
      status: 'CONFIRMED',
    },
    {
      id: 'appointment-glow-past',
      businessName: 'Glow Clinic קליניקת אסתטיקה',
      employeeName: 'דנה כהן',
      serviceName: 'טיפול פנים מתקדם',
      address: 'שדרות אבא אבן 8, הרצליה',
      dateISO: daysFromNow(-10),
      time: '09:00',
      status: 'CONFIRMED',
    },
  ];
}

function initialWaitlistEntries(): ClientWaitlistEntry[] {
  return [
    {
      id: 'waitlist-noa',
      businessName: 'Glow Clinic קליניקת אסתטיקה',
      employeeName: 'נועה גולן',
      serviceName: 'גוונים רכים',
      requestedDateISO: daysFromNow(7),
      requestedRange: '08:00 - 22:00',
      status: 'ACTIVE',
    },
  ];
}

/**
 * `POST /api/appointments` and the `(public)` layout's server-rendered "My appointments" panel
 * are separate route bundles — Turbopack dev compiles each into its own module graph, so a plain
 * module-level array here would give each bundle its own disconnected copy (a booking would
 * "succeed" but never appear in the panel). Keying the store off `globalThis` instead makes every
 * bundle share the same in-memory process state, the same fix used for framework singletons like
 * Prisma clients across HMR reloads.
 */
type MockAppointmentsStore = { appointments: ClientAppointment[]; waitlistEntries: ClientWaitlistEntry[]; nextCreatedAppointmentId: number };
const globalStore = globalThis as unknown as { __mockAppointmentsStore?: MockAppointmentsStore };
const store: MockAppointmentsStore = (globalStore.__mockAppointmentsStore ??= {
  appointments: initialAppointments(),
  waitlistEntries: initialWaitlistEntries(),
  nextCreatedAppointmentId: 1,
});

async function listCurrentClientAppointments(): Promise<ClientAppointment[]> {
  return store.appointments;
}

async function listCurrentClientWaitlistEntries(): Promise<ClientWaitlistEntry[]> {
  return store.waitlistEntries;
}

async function createAppointment(input: CreateAppointmentInput): Promise<ClientAppointment> {
  const appointment: ClientAppointment = { id: `appointment-demo-${store.nextCreatedAppointmentId++}`, ...input };
  store.appointments.push(appointment);
  return appointment;
}

export const mockAppointmentsRepository = {
  listCurrentClientAppointments,
  listCurrentClientWaitlistEntries,
  createAppointment,
};
