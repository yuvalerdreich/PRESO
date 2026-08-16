import type {
  BusinessProfile,
  BusinessSearchFilters,
  BusinessSummary,
  Category,
  EmployeeSummary,
  ServiceSummary,
} from '@/types/domain';

/**
 * Local fixture data standing in for Supabase reads (CLAUDE.md §8). IDs are
 * fixed so `tests/unit/discovery-repository.test.ts` (and the business/employee
 * profile pages once built) can address specific rows.
 */

const STUDIO_ZOHAR_ID = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const GLOW_CLINIC_ID = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002';
const APEX_FITNESS_ID = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000';

const categories: Category[] = [
  { id: 'beauty', slug: 'beauty', icon: 'scissors', name: { he: 'מספרות ומכוני יופי', en: 'Hair salons & beauty' } },
  { id: 'cosmetics', slug: 'cosmetics', icon: 'sparkles', name: { he: 'קוסמטיקה וציפורניים', en: 'Cosmetics & nails' } },
  { id: 'fitness', slug: 'fitness', icon: 'dumbbell', name: { he: 'כושר ופילאטיס', en: 'Fitness & pilates' } },
  { id: 'clinics', slug: 'clinics', icon: 'stethoscope', name: { he: 'קליניקות וטיפולים', en: 'Clinics & treatments' } },
  { id: 'lessons', slug: 'lessons', icon: 'graduation-cap', name: { he: 'שיעורים וייעוץ', en: 'Lessons & consulting' } },
];

const businesses: (BusinessProfile & { employeeAvatarUrls: string[] })[] = [
  {
    id: APEX_FITNESS_ID,
    name: 'Apex Fitness סטודיו כושר ופילאטיס',
    categoryId: 'fitness',
    area: 'חיפה',
    address: 'דרך יפו 45, חיפה',
    description: 'אימונים אישיים, שיקום תנועתי ופילאטיס מכשירים אחד על אחד.',
    photoUrl: 'https://picsum.photos/seed/apex-fitness/640/480',
    phone: '04-8112233',
    timezone: 'Asia/Jerusalem',
    cancellationWindowHours: 24,
    ownerProfileId: 'p-apex-owner',
    employeeCount: 1,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=12'],
    approvalPolicy: 'AUTO',
  },
  {
    id: GLOW_CLINIC_ID,
    name: 'Glow Clinic קליניקת אסתטיקה',
    categoryId: 'cosmetics',
    area: 'הרצליה',
    address: 'שדרות אבא אבן 8, הרצליה',
    description: 'טיפולי פנים מתקדמים, מניקור פדיקור רפואי ואסתטיקה פרא-רפואית.',
    photoUrl: 'https://picsum.photos/seed/glow-clinic/640/480',
    phone: '09-9556677',
    timezone: 'Asia/Jerusalem',
    cancellationWindowHours: 48,
    ownerProfileId: 'p-glow-owner',
    employeeCount: 2,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=32', 'https://i.pravatar.cc/64?img=45'],
    // MANUAL on purpose: this is the only business in the fixture whose bookings land PENDING,
    // so the booking confirm flow can demonstrate both outcomes.
    approvalPolicy: 'MANUAL',
  },
  {
    id: STUDIO_ZOHAR_ID,
    name: 'Studio Zohar - מספרת זוהר',
    categoryId: 'beauty',
    area: 'תל אביב',
    address: 'רחוב דיזנגוף 142, תל אביב',
    description: 'סטודיו לעיצוב שיער, כימיקלים מתקדמים, גוונים ותספורות גברים ונשים.',
    photoUrl: 'https://picsum.photos/seed/studio-zohar/640/480',
    phone: '03-6001122',
    timezone: 'Asia/Jerusalem',
    cancellationWindowHours: 24,
    ownerProfileId: 'p-zohar-owner',
    employeeCount: 2,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=51', 'https://i.pravatar.cc/64?img=47'],
    approvalPolicy: 'AUTO',
  },
];

const employees: EmployeeSummary[] = [
  {
    id: 'e-apex-1',
    businessId: APEX_FITNESS_ID,
    fullName: 'עידן ברק',
    positionTitle: 'מאמן אישי',
    avatarUrl: 'https://i.pravatar.cc/96?img=12',
  },
  {
    id: 'e-glow-1',
    businessId: GLOW_CLINIC_ID,
    fullName: 'דנה כהן',
    positionTitle: 'קוסמטיקאית רפואית',
    avatarUrl: 'https://i.pravatar.cc/96?img=32',
  },
  {
    id: 'e-glow-2',
    businessId: GLOW_CLINIC_ID,
    fullName: 'ליאור שדה',
    positionTitle: 'מניקוריסטית',
    avatarUrl: 'https://i.pravatar.cc/96?img=45',
  },
  {
    id: 'e-zohar',
    businessId: STUDIO_ZOHAR_ID,
    fullName: 'זוהר לוי',
    positionTitle: 'מעצב שיער ראשי ומנהל',
    avatarUrl: 'https://i.pravatar.cc/96?img=51',
  },
  {
    id: 'e-miya',
    businessId: STUDIO_ZOHAR_ID,
    fullName: 'מיה כהן',
    positionTitle: 'מומחית גוונים וכימיקלים',
    avatarUrl: 'https://i.pravatar.cc/96?img=47',
  },
];

const services: ServiceSummary[] = [
  {
    id: 's-apex-1',
    employeeId: 'e-apex-1',
    name: 'אימון אישי',
    description: 'אימון פרטני מותאם למטרות שלך, כולל בניית תוכנית עבודה.',
    price: 150,
    durationMinutes: 60,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-1',
    employeeId: 'e-glow-1',
    name: 'טיפול פנים מתקדם',
    description: 'ניקוי עמוק, פילינג ומסכה מותאמים אישית לסוג העור.',
    price: 250,
    durationMinutes: 50,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-2',
    employeeId: 'e-glow-2',
    name: 'מניקור פדיקור רפואי',
    description: 'טיפול רפואי לציפורניים ולעור סביבן, כולל הסרת עור קשה.',
    price: 180,
    durationMinutes: 45,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-1',
    employeeId: 'e-zohar',
    name: 'עיצוב זקן וגילוח מסורתי',
    description: 'פיסול זקן, מגבות חמות וטיפוח עור הפנים.',
    price: 70,
    durationMinutes: 20,
    bufferMinutes: 5,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-2',
    employeeId: 'e-zohar',
    name: 'תספורת ועיצוב שיער (גברים/נשים)',
    description: 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.',
    price: 120,
    durationMinutes: 30,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-3',
    employeeId: 'e-zohar',
    name: 'פראפארט ופליקס לשיקום השיער',
    description: 'טיפול עמוק לשיער פגום עם חומצות אמינו.',
    price: 180,
    durationMinutes: 45,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-1',
    employeeId: 'e-miya',
    name: 'גוונים וצבע אורגני מקצועי',
    description: "טכניקת בליאז'/גוונים מקיפה כולל טיפול שיקום וברק.",
    price: 380,
    durationMinutes: 90,
    bufferMinutes: 15,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-2',
    employeeId: 'e-miya',
    name: 'תספורת ועיצוב שיער (גברים/נשים)',
    description: 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.',
    price: 120,
    durationMinutes: 30,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-3',
    employeeId: 'e-miya',
    name: 'טיפול קרטין להחלקת שיער',
    description: 'החלקה מקצועית להארכת חיי הסטיילינג והפחתת נפח.',
    price: 320,
    durationMinutes: 75,
    bufferMinutes: 15,
    status: 'ACTIVE',
  },
];

/**
 * Presentation-only mock standing in for `get_available_slots()` (TECHNICAL_DESIGN.md §6.1,
 * §12.6) — NOT the real availability engine. It applies one uniform rule (closed Saturdays,
 * a fixed daily slot list) regardless of employee/service, so the duration+buffer packing
 * rule from §12.6 is not actually reflected yet. Kept behind the same repository interface
 * so swapping in the real RPC later doesn't touch the calendar/slot-picker components.
 */
const MOCK_DAY_SLOTS = [
  '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '13:45', '14:00',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isClosedDay(date: Date): boolean {
  return date.getDay() === 6; // Saturday — no WEEKLY_WINDOW rule in the mock
}

async function getMonthAvailability(_employeeId: string, _serviceId: string, monthISO: string): Promise<string[]> {
  const [year, month] = monthISO.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    if (!isClosedDay(date)) dates.push(toISODate(date));
  }
  return dates;
}

async function getDaySlots(_employeeId: string, _serviceId: string, dateISO: string): Promise<string[]> {
  const date = new Date(`${dateISO}T00:00:00`);
  return isClosedDay(date) ? [] : MOCK_DAY_SLOTS;
}

function searchableText(business: BusinessSummary): string {
  return [business.name, business.description].join(' ').toLowerCase();
}

async function listCategories(): Promise<Category[]> {
  return categories;
}

async function searchBusinesses(filters: BusinessSearchFilters = {}): Promise<BusinessSummary[]> {
  const q = filters.q?.trim().toLowerCase();
  const area = filters.area?.trim().toLowerCase();

  return businesses.filter((business) => {
    if (q && !searchableText(business).includes(q)) return false;
    if (filters.category && business.categoryId !== filters.category) return false;
    if (area && business.area.toLowerCase() !== area) return false;
    return true;
  });
}

async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  return businesses.find((business) => business.id === businessId) ?? null;
}

async function listBusinessEmployees(businessId: string): Promise<EmployeeSummary[]> {
  return employees.filter((employee) => employee.businessId === businessId);
}

async function getBusinessEmployee(businessId: string, employeeId: string): Promise<EmployeeSummary | null> {
  return employees.find((e) => e.id === employeeId && e.businessId === businessId) ?? null;
}

async function listEmployeeServices(businessId: string, employeeId: string): Promise<ServiceSummary[]> {
  const employee = employees.find((e) => e.id === employeeId && e.businessId === businessId);
  if (!employee) return [];
  return services.filter((service) => service.employeeId === employeeId);
}

// Looked up without a businessId, unlike listBusinessEmployees/listEmployeeServices above —
// this mirrors a plain `select ... where id = $1`, which is all POST /api/appointments has
// to go on per its documented request body (TECHNICAL_DESIGN.md §5.4).
async function getEmployeeById(employeeId: string): Promise<EmployeeSummary | null> {
  return employees.find((employee) => employee.id === employeeId) ?? null;
}

async function getServiceById(serviceId: string): Promise<ServiceSummary | null> {
  return services.find((service) => service.id === serviceId) ?? null;
}

export const mockDiscoveryRepository = {
  listCategories,
  searchBusinesses,
  getBusinessProfile,
  listBusinessEmployees,
  getBusinessEmployee,
  listEmployeeServices,
  getEmployeeById,
  getServiceById,
  getMonthAvailability,
  getDaySlots,
};
