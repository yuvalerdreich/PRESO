import type { Locale } from '@/lib/i18n/types';

export const translations = {
  he: {
    brand: { name: 'Preso', version: 'MVP V1.0' },
    header: {
      tagline: 'Your spot. Secured.',
      discovery: 'אזור ללקוחות',
      browse: 'חיפוש עסקים',
      switchToEnglish: 'Switch to English',
    },
    discovery: {
      eyebrow: 'מערכת קביעת תורים לעסקים רב-צוותיים',
      title: 'מצא עסק, תור ואיש צוות, וקבע תור מידי בזמן אמת',
      description: 'התאמה מלאה בין לוח הזמנים האישי של העובד, השירות המבוקש וזמינות התורים הפנויים.',
      searchPlaceholder: 'חפש עסק, שירות, קטגוריה או עיר...',
      categoryPlaceholder: 'כל הקטגוריות',
      areaPlaceholder: 'כל הערים והאזורים',
      searchButton: 'חיפוש',
      categoriesTitle: 'קטגוריות פופולריות',
      featuredTitle: 'עסקים מומלצים לקביעת תור',
      resultCount: 'עסקים נמצאו',
      filteredResultHint: 'תוצאות לפי הסינון שבחרת',
      staffCount: 'אנשי צוות / עמדות',
      detailsSoon: 'פרטי העסק יתווספו בשלב הבא',
      mockNotice: 'הנתונים בדף זה הם נתוני הדגמה מקומיים בלבד.',
    },
    emptyState: {
      title: 'לא נמצאו עסקים מתאימים',
      description: 'נסה לחפש ביטוי אחר, קטגוריה אחרת או אזור אחר.',
      clearFilters: 'נקה סינון',
    },
  },
  en: {
    brand: { name: 'Preso', version: 'MVP V1.0' },
    header: {
      tagline: 'Your spot. Secured.',
      discovery: 'Client area',
      browse: 'Browse businesses',
      switchToEnglish: 'עברית',
    },
    discovery: {
      eyebrow: 'Appointment scheduling for multi-staff businesses',
      title: 'Find a business, a service, and the right person for your next appointment',
      description: 'Match the staff member’s schedule, the service you need, and available appointment times.',
      searchPlaceholder: 'Search a business, service, category, or city…',
      categoryPlaceholder: 'All categories',
      areaPlaceholder: 'All cities and areas',
      searchButton: 'Search',
      categoriesTitle: 'Popular categories',
      featuredTitle: 'Recommended businesses',
      resultCount: 'businesses found',
      filteredResultHint: 'Showing your filtered results',
      staffCount: 'staff members / positions',
      detailsSoon: 'Business details are coming next',
      mockNotice: 'This page uses local demonstration data only.',
    },
    emptyState: {
      title: 'No businesses match those filters',
      description: 'Try a different search term, category, or area.',
      clearFilters: 'Clear filters',
    },
  },
} as const satisfies Record<Locale, object>;

export type Translation = (typeof translations)[Locale];
