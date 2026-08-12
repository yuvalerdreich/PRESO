import type { DiscoveryFilters, DiscoveryRepository } from '@/lib/discovery/repository';
import type { DiscoveryArea, DiscoveryBusiness, DiscoveryCategory } from '@/types/domain';

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
};
