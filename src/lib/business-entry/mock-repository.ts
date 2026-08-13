import type { BusinessEntryRepository } from '@/lib/business-entry/repository';
import type { BusinessEntryArea, BusinessEntryCategory, JoinableBusiness } from '@/types/business-entry';

const categories: BusinessEntryCategory[] = [
  { id: 'hair-beauty', name: { he: 'מספרות ומכוני יופי', en: 'Hair & beauty' } },
  { id: 'cosmetics', name: { he: 'קוסמטיקה וטיפוח', en: 'Cosmetics & skincare' } },
  { id: 'fitness', name: { he: 'כושר ופילאטיס', en: 'Fitness & Pilates' } },
];

const areas: BusinessEntryArea[] = [
  { id: 'tel-aviv', name: { he: 'תל אביב', en: 'Tel Aviv' } },
  { id: 'herzliya', name: { he: 'הרצליה', en: 'Herzliya' } },
  { id: 'haifa', name: { he: 'חיפה', en: 'Haifa' } },
];

const joinableBusinesses: JoinableBusiness[] = [
  {
    id: 'join-studio-zohar',
    name: { he: 'מספרת זוהר - Studio Zohar', en: 'Studio Zohar' },
    category: categories[0],
    area: areas[0],
    address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff Street, Tel Aviv' },
    imageVariant: 'studio',
  },
  {
    id: 'join-glow-clinic',
    name: { he: 'קליניקת אסתטיקה Glow Clinic', en: 'Glow Clinic' },
    category: categories[1],
    area: areas[1],
    address: { he: 'שדרות אבא אבן 8, הרצליה', en: '8 Abba Eban Boulevard, Herzliya' },
    imageVariant: 'clinic',
  },
  {
    id: 'join-apex-fitness',
    name: { he: 'סטודיו כושר ופילאטיס Apex Fitness', en: 'Apex Fitness Studio' },
    category: categories[2],
    area: areas[2],
    address: { he: 'דרך הים 45, חיפה', en: '45 HaYam Road, Haifa' },
    imageVariant: 'fitness',
  },
];

export const mockBusinessEntryRepository: BusinessEntryRepository = {
  async listCategories() {
    return categories;
  },
  async listAreas() {
    return areas;
  },
  async listJoinableBusinesses() {
    return joinableBusinesses;
  },
};
