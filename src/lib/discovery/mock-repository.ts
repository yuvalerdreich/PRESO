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
  { id: 'beauty', icon: 'scissors', name: { he: 'מספרות ומכוני יופי', en: 'Hair salons & beauty' } },
  { id: 'cosmetics', icon: 'sparkles', name: { he: 'קוסמטיקה וציפורניים', en: 'Cosmetics & nails' } },
  { id: 'fitness', icon: 'dumbbell', name: { he: 'כושר ופילאטיס', en: 'Fitness & pilates' } },
  { id: 'clinics', icon: 'stethoscope', name: { he: 'קליניקות וטיפולים', en: 'Clinics & treatments' } },
  { id: 'lessons', icon: 'graduation-cap', name: { he: 'שיעורים וייעוץ', en: 'Lessons & consulting' } },
];

const businesses: (BusinessProfile & { employeeAvatarUrls: string[] })[] = [
  {
    id: APEX_FITNESS_ID,
    name: { he: 'Apex Fitness סטודיו כושר ופילאטיס', en: 'Apex Fitness' },
    categoryId: 'fitness',
    area: { id: 'haifa', name: { he: 'חיפה', en: 'Haifa' } },
    address: { he: 'דרך יפו 45, חיפה', en: '45 Yafo Rd, Haifa' },
    description: {
      he: 'אימונים אישיים, שיקום תנועתי ופילאטיס מכשירים אחד על אחד.',
      en: 'Personal training, movement rehab, and one-on-one equipment pilates.',
    },
    photoUrl: 'https://picsum.photos/seed/apex-fitness/640/480',
    phone: '04-8112233',
    employeeCount: 1,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=12'],
    approvalPolicy: 'AUTO',
  },
  {
    id: GLOW_CLINIC_ID,
    name: { he: 'Glow Clinic קליניקת אסתטיקה', en: 'Glow Clinic' },
    categoryId: 'cosmetics',
    area: { id: 'herzliya', name: { he: 'הרצליה', en: 'Herzliya' } },
    address: { he: 'שדרות אבא אבן 8, הרצליה', en: '8 Aba Even Blvd, Herzliya' },
    description: {
      he: 'טיפולי פנים מתקדמים, מניקור פדיקור רפואי ואסתטיקה פרא-רפואית.',
      en: 'Advanced facials, medical mani-pedi, and paramedical aesthetics.',
    },
    photoUrl: 'https://picsum.photos/seed/glow-clinic/640/480',
    phone: '09-9556677',
    employeeCount: 2,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=32', 'https://i.pravatar.cc/64?img=45'],
    // MANUAL on purpose: this is the only business in the fixture whose bookings land PENDING,
    // so the booking confirm flow can demonstrate both outcomes.
    approvalPolicy: 'MANUAL',
  },
  {
    id: STUDIO_ZOHAR_ID,
    name: { he: 'Studio Zohar - מספרת זוהר', en: 'Studio Zohar' },
    categoryId: 'beauty',
    area: { id: 'tel-aviv', name: { he: 'תל אביב', en: 'Tel Aviv' } },
    address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff St, Tel Aviv' },
    description: {
      he: 'סטודיו לעיצוב שיער, כימיקלים מתקדמים, גוונים ותספורות גברים ונשים.',
      en: 'Hair design studio — advanced color, balayage, and cuts for everyone.',
    },
    photoUrl: 'https://picsum.photos/seed/studio-zohar/640/480',
    phone: '03-6001122',
    employeeCount: 2,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=51', 'https://i.pravatar.cc/64?img=47'],
    approvalPolicy: 'AUTO',
  },
];

const employees: EmployeeSummary[] = [
  {
    id: 'e-apex-1',
    businessId: APEX_FITNESS_ID,
    fullName: { he: 'עידן ברק', en: 'Idan Barak' },
    positionTitle: { he: 'מאמן אישי', en: 'Personal trainer' },
    avatarUrl: 'https://i.pravatar.cc/96?img=12',
  },
  {
    id: 'e-glow-1',
    businessId: GLOW_CLINIC_ID,
    fullName: { he: 'דנה כהן', en: 'Dana Cohen' },
    positionTitle: { he: 'קוסמטיקאית רפואית', en: 'Medical aesthetician' },
    avatarUrl: 'https://i.pravatar.cc/96?img=32',
  },
  {
    id: 'e-glow-2',
    businessId: GLOW_CLINIC_ID,
    fullName: { he: 'ליאור שדה', en: 'Lior Sade' },
    positionTitle: { he: 'מניקוריסטית', en: 'Nail technician' },
    avatarUrl: 'https://i.pravatar.cc/96?img=45',
  },
  {
    id: 'e-zohar',
    businessId: STUDIO_ZOHAR_ID,
    fullName: { he: 'זוהר לוי', en: 'Zohar Levi' },
    positionTitle: { he: 'מעצב שיער ראשי ומנהל', en: 'Lead hairstylist & manager' },
    avatarUrl: 'https://i.pravatar.cc/96?img=51',
  },
  {
    id: 'e-miya',
    businessId: STUDIO_ZOHAR_ID,
    fullName: { he: 'מיה כהן', en: 'Miya Cohen' },
    positionTitle: { he: 'מומחית גוונים וכימיקלים', en: 'Color & chemical treatment specialist' },
    avatarUrl: 'https://i.pravatar.cc/96?img=47',
  },
];

const services: ServiceSummary[] = [
  {
    id: 's-apex-1',
    employeeId: 'e-apex-1',
    name: { he: 'אימון אישי', en: 'Personal training session' },
    description: {
      he: 'אימון פרטני מותאם למטרות שלך, כולל בניית תוכנית עבודה.',
      en: 'A one-on-one session tailored to your goals, including a training plan.',
    },
    price: 150,
    durationMinutes: 60,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-1',
    employeeId: 'e-glow-1',
    name: { he: 'טיפול פנים מתקדם', en: 'Advanced facial' },
    description: {
      he: 'ניקוי עמוק, פילינג ומסכה מותאמים אישית לסוג העור.',
      en: 'Deep cleansing, peeling, and a mask tailored to your skin type.',
    },
    price: 250,
    durationMinutes: 50,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-2',
    employeeId: 'e-glow-2',
    name: { he: 'מניקור פדיקור רפואי', en: 'Medical mani-pedi' },
    description: {
      he: 'טיפול רפואי לציפורניים ולעור סביבן, כולל הסרת עור קשה.',
      en: 'Medical treatment for nails and surrounding skin, including callus removal.',
    },
    price: 180,
    durationMinutes: 45,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-1',
    employeeId: 'e-zohar',
    name: { he: 'עיצוב זקן וגילוח מסורתי', en: 'Traditional beard styling & shave' },
    description: {
      he: 'פיסול זקן, מגבות חמות וטיפוח עור הפנים.',
      en: 'Beard sculpting, hot towels, and facial skin care.',
    },
    price: 70,
    durationMinutes: 20,
    bufferMinutes: 5,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-2',
    employeeId: 'e-zohar',
    name: { he: 'תספורת ועיצוב שיער (גברים/נשים)', en: 'Haircut and styling' },
    description: {
      he: 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.',
      en: 'A pampering wash, a personalized cut, and a blow-dry or styling finish.',
    },
    price: 120,
    durationMinutes: 30,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-3',
    employeeId: 'e-zohar',
    name: { he: 'פראפארט ופליקס לשיקום השיער', en: 'Paraffin & plex hair restoration' },
    description: {
      he: 'טיפול עמוק לשיער פגום עם חומצות אמינו.',
      en: 'A deep treatment for damaged hair with amino acids.',
    },
    price: 180,
    durationMinutes: 45,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-1',
    employeeId: 'e-miya',
    name: { he: 'גוונים וצבע אורגני מקצועי', en: 'Organic professional color & tones' },
    description: {
      he: "טכניקת בליאז'/גוונים מקיפה כולל טיפול שיקום וברק.",
      en: 'Full balayage/color technique, including a restorative gloss treatment.',
    },
    price: 380,
    durationMinutes: 90,
    bufferMinutes: 15,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-2',
    employeeId: 'e-miya',
    name: { he: 'תספורת ועיצוב שיער (גברים/נשים)', en: 'Haircut and styling' },
    description: {
      he: 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.',
      en: 'A pampering wash, a personalized cut, and a blow-dry or styling finish.',
    },
    price: 120,
    durationMinutes: 30,
    bufferMinutes: 10,
    status: 'ACTIVE',
  },
  {
    id: 's-miya-3',
    employeeId: 'e-miya',
    name: { he: 'טיפול קרטין להחלקת שיער', en: 'Keratin hair-smoothing treatment' },
    description: {
      he: 'החלקה מקצועית להארכת חיי הסטיילינג והפחתת נפח.',
      en: 'A professional smoothing treatment that extends styling life and reduces frizz.',
    },
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
  return [business.name.he, business.name.en, business.description.he, business.description.en]
    .join(' ')
    .toLowerCase();
}

async function listCategories(): Promise<Category[]> {
  return categories;
}

async function searchBusinesses(filters: BusinessSearchFilters = {}): Promise<BusinessSummary[]> {
  const q = filters.q?.trim().toLowerCase();

  return businesses.filter((business) => {
    if (q && !searchableText(business).includes(q)) return false;
    if (filters.category && business.categoryId !== filters.category) return false;
    if (filters.area && business.area.id !== filters.area) return false;
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
