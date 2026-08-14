import type { ClientAppointment, ClientWaitlistEntry, CreateAppointmentInput } from '@/types/appointments';

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
      businessName: { he: 'Studio Zohar - מספרת זוהר', en: 'Studio Zohar' },
      employeeName: { he: 'זוהר לוי', en: 'Zohar Levi' },
      serviceName: { he: 'תספורת ועיצוב שיער', en: 'Haircut and styling' },
      address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff St, Tel Aviv' },
      dateISO: daysFromNow(5),
      time: '11:30',
      status: 'confirmed',
    },
    {
      id: 'appointment-glow-past',
      businessName: { he: 'Glow Clinic קליניקת אסתטיקה', en: 'Glow Clinic' },
      employeeName: { he: 'דנה כהן', en: 'Dana Cohen' },
      serviceName: { he: 'טיפול פנים מתקדם', en: 'Advanced facial' },
      address: { he: 'שדרות אבא אבן 8, הרצליה', en: '8 Aba Even Blvd, Herzliya' },
      dateISO: daysFromNow(-10),
      time: '09:00',
      status: 'confirmed',
    },
  ];
}

function initialWaitlistEntries(): ClientWaitlistEntry[] {
  return [
    {
      id: 'waitlist-noa',
      businessName: { he: 'Glow Clinic קליניקת אסתטיקה', en: 'Glow Clinic' },
      employeeName: { he: 'נועה גולן', en: 'Noa Golan' },
      serviceName: { he: 'גוונים רכים', en: 'Soft highlights' },
      requestedDateISO: daysFromNow(7),
      requestedRange: '08:00 - 22:00',
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
