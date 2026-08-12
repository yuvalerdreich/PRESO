import type { DiscoveryFilters, DiscoveryRepository } from '@/lib/discovery/repository';
import type {
  BusinessEmployee,
  BusinessProfile,
  DiscoveryArea,
  DiscoveryBusiness,
  DiscoveryCategory,
  EmployeeService,
} from '@/types/domain';

const categories: DiscoveryCategory[] = [
  { id: 'hair-beauty', slug: 'hair-beauty', name: { he: 'מספרות ומכוני יופי', en: 'Hair & beauty' } },
  { id: 'cosmetics', slug: 'cosmetics', name: { he: 'מכוני קוסמטיקה וטיפוח', en: 'Cosmetics & skincare' } },
  { id: 'fitness', slug: 'fitness', name: { he: 'סטודיו לכושר ומאמנים', en: 'Fitness & trainers' } },
  { id: 'clinics', slug: 'clinics', name: { he: 'קליניקות וטיפולים', en: 'Clinics & treatments' } },
  { id: 'consulting', slug: 'consulting', name: { he: 'שיעורים פרטיים וייעוץ', en: 'Tutoring & consulting' } },
];

const areas: DiscoveryArea[] = [
  { id: 'tel-aviv', name: { he: 'תל אביב', en: 'Tel Aviv' } },
  { id: 'herzliya', name: { he: 'הרצליה', en: 'Herzliya' } },
  { id: 'haifa', name: { he: 'חיפה', en: 'Haifa' } },
];

const businesses: DiscoveryBusiness[] = [
  {
    id: 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001',
    name: { he: 'מספרת זוהר - Studio Zohar', en: 'Studio Zohar' },
    description: { he: 'סטודיו לעיצוב שיער, טיפולים מתקדמים, גוונים ותספורות גברים ונשים.', en: 'A hair studio for cuts, colour, styling, and modern treatments.' },
    category: categories[0],
    area: areas[0],
    address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff Street, Tel Aviv' },
    imageVariant: 'studio',
    employeeCount: 2,
  },
  {
    id: 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002',
    name: { he: 'קליניקת אסתטיקה Glow Clinic', en: 'Glow Clinic' },
    description: { he: 'טיפולי פנים מתקדמים, מיקרו פיגמנטציה ואסתטיקה פרא-רפואית.', en: 'Advanced facials, micro-pigmentation, and paramedical aesthetics.' },
    category: categories[1],
    area: areas[1],
    address: { he: 'שדרות אבא אבן 8, הרצליה', en: '8 Abba Eban Boulevard, Herzliya' },
    imageVariant: 'clinic',
    employeeCount: 2,
  },
  {
    id: 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1003',
    name: { he: 'סטודיו כושר ופילאטיס Apex Fitness', en: 'Apex Fitness Studio' },
    description: { he: 'אימונים אישיים, שיקום תנועתי ופילאטיס מכשירים אחד על אחד.', en: 'Personal training, movement recovery, and one-to-one reformer Pilates.' },
    category: categories[2],
    area: areas[2],
    address: { he: 'דרך הים 45, חיפה', en: '45 HaYam Road, Haifa' },
    imageVariant: 'fitness',
    employeeCount: 3,
  },
];

const businessProfiles: BusinessProfile[] = [
  {
    ...businesses[0],
    phone: '03-6001122',
    hours: [
      { day: { he: 'ראשון', en: 'Sunday' }, opensAt: '09:00', closesAt: '19:00' },
      { day: { he: 'שני', en: 'Monday' }, opensAt: '09:00', closesAt: '19:00' },
      { day: { he: 'שלישי', en: 'Tuesday' }, opensAt: '09:00', closesAt: '20:00' },
      { day: { he: 'רביעי', en: 'Wednesday' }, opensAt: '09:00', closesAt: '20:00' },
      { day: { he: 'חמישי', en: 'Thursday' }, opensAt: '09:00', closesAt: '20:00' },
      { day: { he: 'שישי', en: 'Friday' }, opensAt: '09:00', closesAt: '14:00' },
    ],
  },
  {
    ...businesses[1],
    phone: '09-7654321',
    hours: [
      { day: { he: 'ראשון', en: 'Sunday' }, opensAt: '10:00', closesAt: '18:00' },
      { day: { he: 'שני', en: 'Monday' }, opensAt: '10:00', closesAt: '19:00' },
      { day: { he: 'שלישי', en: 'Tuesday' }, opensAt: '10:00', closesAt: '19:00' },
      { day: { he: 'רביעי', en: 'Wednesday' }, opensAt: '10:00', closesAt: '19:00' },
      { day: { he: 'חמישי', en: 'Thursday' }, opensAt: '10:00', closesAt: '20:00' },
      { day: { he: 'שישי', en: 'Friday' }, opensAt: '09:00', closesAt: '13:00' },
    ],
  },
  {
    ...businesses[2],
    phone: '04-8123456',
    hours: [
      { day: { he: 'ראשון', en: 'Sunday' }, opensAt: '07:00', closesAt: '21:00' },
      { day: { he: 'שני', en: 'Monday' }, opensAt: '07:00', closesAt: '21:00' },
      { day: { he: 'שלישי', en: 'Tuesday' }, opensAt: '07:00', closesAt: '21:00' },
      { day: { he: 'רביעי', en: 'Wednesday' }, opensAt: '07:00', closesAt: '21:00' },
      { day: { he: 'חמישי', en: 'Thursday' }, opensAt: '07:00', closesAt: '21:00' },
      { day: { he: 'שישי', en: 'Friday' }, opensAt: '08:00', closesAt: '13:00' },
    ],
  },
];

const employees: BusinessEmployee[] = [
  {
    id: 'e-zohar',
    businessId: businesses[0].id,
    name: { he: 'זוהר לוי', en: 'Zohar Levi' },
    position: { he: 'מעצבת שיער', en: 'Hair stylist' },
    introduction: { he: 'מתמחה בתספורות, צבע ועיצוב אישי עם תשומת לב לפרטים.', en: 'Specialises in cuts, colour, and considered personal styling.' },
    avatarVariant: 'violet',
  },
  {
    id: 'e-noa',
    businessId: businesses[0].id,
    name: { he: 'נועה גולן', en: 'Noa Golan' },
    position: { he: 'צבע וטיפולי שיער', en: 'Colour and hair care' },
    introduction: { he: 'טיפולי שיער, גוונים ושיקום למראה טבעי ומדויק.', en: 'Hair treatments, highlights, and restorative care with a natural finish.' },
    avatarVariant: 'rose',
  },
  {
    id: 'e-maya',
    businessId: businesses[1].id,
    name: { he: 'מאיה כהן', en: 'Maya Cohen' },
    position: { he: 'קוסמטיקאית פרא-רפואית', en: 'Paramedical aesthetician' },
    introduction: { he: 'טיפולי פנים מתקדמים ותכניות טיפוח מדויקות לעור שלך.', en: 'Advanced facials and considered skincare plans for your skin.' },
    avatarVariant: 'amber',
  },
  {
    id: 'e-rina',
    businessId: businesses[1].id,
    name: { he: 'רינה בר', en: 'Rina Bar' },
    position: { he: 'מומחית מיקרופיגמנטציה', en: 'Micropigmentation specialist' },
    introduction: { he: 'גישה רגועה ומדויקת לטיפולים אסתטיים אישיים.', en: 'A calm, precise approach to personal aesthetic treatments.' },
    avatarVariant: 'teal',
  },
  {
    id: 'e-daniel',
    businessId: businesses[2].id,
    name: { he: 'דניאל אביב', en: 'Daniel Aviv' },
    position: { he: 'מאמן כושר אישי', en: 'Personal trainer' },
    introduction: { he: 'אימונים אישיים שמתחילים בדיוק מהמקום שבו אתם נמצאים.', en: 'Personal training that starts exactly where you are.' },
    avatarVariant: 'teal',
  },
  {
    id: 'e-yael',
    businessId: businesses[2].id,
    name: { he: 'יעל שי', en: 'Yael Shai' },
    position: { he: 'מדריכת פילאטיס', en: 'Pilates instructor' },
    introduction: { he: 'פילאטיס מכשירים בגישה אישית ומחזקת.', en: 'Reformer Pilates with a personal, confidence-building approach.' },
    avatarVariant: 'rose',
  },
  {
    id: 'e-omer',
    businessId: businesses[2].id,
    name: { he: 'עומר ברק', en: 'Omer Barak' },
    position: { he: 'מאמן תנועה ושיקום', en: 'Movement and recovery coach' },
    introduction: { he: 'תנועה מדויקת, חיזוק ושיקום בקצב שמתאים לכם.', en: 'Thoughtful movement, strength, and recovery at your own pace.' },
    avatarVariant: 'amber',
  },
];

const services: EmployeeService[] = [
  {
    id: 's-zohar-cut',
    employeeId: 'e-zohar',
    name: { he: 'תספורת ועיצוב שיער', en: 'Haircut and styling' },
    description: { he: 'ייעוץ קצר, תספורת ועיצוב שמתאימים לך.', en: 'A short consultation, cut, and styling tailored to you.' },
    durationMinutes: 60,
    price: 180,
  },
  {
    id: 's-zohar-colour',
    employeeId: 'e-zohar',
    name: { he: 'חידוש צבע', en: 'Colour refresh' },
    description: { he: 'רענון צבע וגוונים למראה חי וטבעי.', en: 'A colour and highlight refresh for a lively, natural finish.' },
    durationMinutes: 120,
    price: 420,
  },
  {
    id: 's-noa-treatment',
    employeeId: 'e-noa',
    name: { he: 'טיפול שיקום לשיער', en: 'Restorative hair treatment' },
    description: { he: 'טיפול עומק להזנה, ברק ורכות.', en: 'A deep treatment for nourishment, shine, and softness.' },
    durationMinutes: 45,
    price: 220,
  },
  {
    id: 's-noa-highlights',
    employeeId: 'e-noa',
    name: { he: 'גוונים עדינים', en: 'Soft highlights' },
    description: { he: 'גוונים מותאמים אישית עם מעבר טבעי.', en: 'Personalised highlights with a natural blend.' },
    durationMinutes: 150,
    price: 520,
  },
  {
    id: 's-maya-facial',
    employeeId: 'e-maya',
    name: { he: 'טיפול פנים מתקדם', en: 'Advanced facial' },
    description: { he: 'טיפול פנים מותאם למצב העור ולמטרות שלך.', en: 'A facial tailored to your skin’s needs and goals.' },
    durationMinutes: 75,
    price: 390,
  },
  {
    id: 's-rina-pigmentation',
    employeeId: 'e-rina',
    name: { he: 'ייעוץ מיקרופיגמנטציה', en: 'Micropigmentation consultation' },
    description: { he: 'פגישת היכרות ותכנון מותאם אישי.', en: 'An introductory consultation and personal treatment plan.' },
    durationMinutes: 45,
    price: 180,
  },
  {
    id: 's-daniel-training',
    employeeId: 'e-daniel',
    name: { he: 'אימון כושר אישי', en: 'Personal training' },
    description: { he: 'אימון אישי ממוקד מטרות וחיזוק.', en: 'Goal-focused personal training for strength and confidence.' },
    durationMinutes: 60,
    price: 260,
  },
  {
    id: 's-yael-pilates',
    employeeId: 'e-yael',
    name: { he: 'פילאטיס מכשירים אישי', en: 'Private reformer Pilates' },
    description: { he: 'שיעור אישי לחיזוק, יציבה ותנועה איכותית.', en: 'A private session for strength, posture, and quality movement.' },
    durationMinutes: 55,
    price: 240,
  },
  {
    id: 's-omer-recovery',
    employeeId: 'e-omer',
    name: { he: 'אימון תנועה ושיקום', en: 'Movement and recovery session' },
    description: { he: 'עבודה אישית על תנועה, חיזוק ושיקום.', en: 'One-to-one work on movement, strength, and recovery.' },
    durationMinutes: 60,
    price: 250,
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function localizedValues(value: { he: string; en: string }) {
  return `${value.he} ${value.en}`.toLocaleLowerCase();
}

function matchesFilters(business: DiscoveryBusiness, filters: DiscoveryFilters) {
  const query = filters.q ? normalize(filters.q) : '';
  const searchable = [business.name, business.description, business.category.name, business.area.name]
    .map(localizedValues)
    .join(' ');

  return (
    (!query || searchable.includes(query)) &&
    (!filters.category || business.category.slug === filters.category) &&
    (!filters.area || business.area.id === filters.area)
  );
}

export const mockDiscoveryRepository: DiscoveryRepository = {
  async listCategories() {
    return categories;
  },

  async listAreas() {
    return areas;
  },

  async searchBusinesses(filters) {
    return businesses.filter((business) => matchesFilters(business, filters));
  },

  async getBusinessProfile(businessId) {
    return businessProfiles.find((business) => business.id === businessId) ?? null;
  },

  async listBusinessEmployees(businessId) {
    return employees.filter((employee) => employee.businessId === businessId);
  },

  async getBusinessEmployee(businessId, employeeId) {
    return employees.find((employee) => employee.businessId === businessId && employee.id === employeeId) ?? null;
  },

  async listEmployeeServices(businessId, employeeId) {
    const employee = await this.getBusinessEmployee(businessId, employeeId);
    return employee ? services.filter((service) => service.employeeId === employee.id) : [];
  },
};
