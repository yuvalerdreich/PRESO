import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardRoute from '@/app/(public)/dashboard/page';
import DashboardAppointmentsRoute from '@/app/(public)/dashboard/appointments/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
describe('business dashboard pages', () => { it('renders overview and filters detailed local appointments', async () => { const { unmount } = render(<LanguageProvider initialLocale="en">{await DashboardRoute()}</LanguageProvider>); expect(screen.getByText('Display-only revenue')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /view all appointments/i })).toHaveAttribute('href', '/dashboard/appointments'); unmount(); render(<LanguageProvider initialLocale="en">{await DashboardAppointmentsRoute()}</LanguageProvider>); expect(screen.getByText('Yuval Erdrich')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Employee'), { target: { value: 'noa' } }); expect(screen.getAllByText('Noa Golan')).toHaveLength(3); expect(screen.queryByText('Yuval Erdrich')).not.toBeInTheDocument(); }); });
