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
    phone: '03-6223344',
    employeeCount: 2,
    employeeAvatarUrls: ['https://i.pravatar.cc/64?img=51', 'https://i.pravatar.cc/64?img=60'],
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
    positionTitle: { he: 'ספר/ית ראשי/ת', en: 'Lead stylist' },
    avatarUrl: 'https://i.pravatar.cc/96?img=51',
  },
  {
    id: 'e-studio-2',
    businessId: STUDIO_ZOHAR_ID,
    fullName: { he: 'נועה אמיר', en: 'Noa Amir' },
    positionTitle: { he: 'מעצבת שיער', en: 'Hair stylist' },
    avatarUrl: 'https://i.pravatar.cc/96?img=60',
  },
];

const services: ServiceSummary[] = [
  {
    id: 's-apex-1',
    employeeId: 'e-apex-1',
    name: { he: 'אימון אישי', en: 'Personal training session' },
    price: 150,
    durationMinutes: 60,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-1',
    employeeId: 'e-glow-1',
    name: { he: 'טיפול פנים מתקדם', en: 'Advanced facial' },
    price: 250,
    durationMinutes: 50,
    status: 'ACTIVE',
  },
  {
    id: 's-glow-2',
    employeeId: 'e-glow-2',
    name: { he: 'מניקור פדיקור רפואי', en: 'Medical mani-pedi' },
    price: 180,
    durationMinutes: 45,
    status: 'ACTIVE',
  },
  {
    id: 's-zohar-1',
    employeeId: 'e-zohar',
    name: { he: 'תספורת ועיצוב', en: 'Haircut and styling' },
    price: 180,
    durationMinutes: 45,
    status: 'ACTIVE',
  },
  {
    id: 's-studio2-1',
    employeeId: 'e-studio-2',
    name: { he: 'טיפול משקם לשיער', en: 'Restorative hair treatment' },
    price: 220,
    durationMinutes: 60,
    status: 'ACTIVE',
  },
];

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

export const mockDiscoveryRepository = {
  listCategories,
  searchBusinesses,
  getBusinessProfile,
  listBusinessEmployees,
  getBusinessEmployee,
  listEmployeeServices,
};
