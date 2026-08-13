import type { AppointmentsRepository } from '@/lib/appointments/repository';

const appointments = [
  {
    id: 'appointment-zohar',
    period: 'upcoming',
    status: 'confirmed',
    businessName: { he: 'מספרת זוהר - Studio Zohar', en: 'Studio Zohar' },
    employeeName: { he: 'זוהר לוי', en: 'Zohar Levi' },
    serviceName: { he: 'תספורת ועיצוב שיער', en: 'Haircut and styling' },
    address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff Street, Tel Aviv' },
    date: { he: 'יום שלישי, 18 באוגוסט', en: 'Tuesday, 18 August' },
    time: '10:00 – 11:00',
  },
  {
    id: 'appointment-maya',
    period: 'upcoming',
    status: 'pending',
    businessName: { he: 'קליניקת אסתטיקה Glow Clinic', en: 'Glow Clinic' },
    employeeName: { he: 'מאיה כהן', en: 'Maya Cohen' },
    serviceName: { he: 'טיפול פנים מתקדם', en: 'Advanced facial' },
    address: { he: 'שדרות אבא אבן 8, הרצליה', en: '8 Abba Eban Boulevard, Herzliya' },
    date: { he: 'יום חמישי, 20 באוגוסט', en: 'Thursday, 20 August' },
    time: '16:30 – 17:45',
  },
  {
    id: 'appointment-daniel',
    period: 'history',
    status: 'confirmed',
    businessName: { he: 'סטודיו כושר ופילאטיס Apex Fitness', en: 'Apex Fitness Studio' },
    employeeName: { he: 'דניאל אביב', en: 'Daniel Aviv' },
    serviceName: { he: 'אימון כושר אישי', en: 'Personal training' },
    address: { he: 'דרך הים 45, חיפה', en: '45 HaYam Road, Haifa' },
    date: { he: 'יום שני, 3 באוגוסט', en: 'Monday, 3 August' },
    time: '09:00 – 10:00',
  },
] as const;

const waitlistEntries = [
  {
    id: 'waitlist-noa',
    businessName: { he: 'מספרת זוהר - Studio Zohar', en: 'Studio Zohar' },
    employeeName: { he: 'נועה גולן', en: 'Noa Golan' },
    serviceName: { he: 'גוונים עדינים', en: 'Soft highlights' },
    requestedRange: { he: 'כל בוקר במהלך השבוע הקרוב', en: 'Any morning during the coming week' },
  },
] as const;

export const mockAppointmentsRepository: AppointmentsRepository = {
  async listCurrentClientAppointments() {
    return [...appointments];
  },

  async listCurrentClientWaitlistEntries() {
    return [...waitlistEntries];
  },
};
