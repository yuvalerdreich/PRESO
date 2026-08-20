import { redirect } from 'next/navigation';

/**
 * `/businesses/manage` — the section index, which is not a screen of its own.
 *
 * "ניהול העסק" on `/businesses` opens the business portal, and the portal's first real answer is
 * the diary: what is booked today. The overview this route used to hold was a placeholder, so
 * every visit to business management opened on "not yet implemented" with the real screens one
 * click further in. Redirecting sends people to the diary instead.
 *
 * When the overview (§10.7) is built, it replaces this redirect — the URL is already where it
 * belongs.
 */
export default async function ManageBusinessRoute() {
  redirect('/businesses/manage/appointments');
}
