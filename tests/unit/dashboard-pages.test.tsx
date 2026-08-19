import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardRoute from '@/app/(business)/dashboard/page';
import DashboardServicesRoute from '@/app/(business)/dashboard/services/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
// Skipped: the dashboard overview and services pages are still typecheck-only placeholders
// (CLAUDE.md §8, punch-list #3). Remove .skip as each one is built for real.
//
// The appointment diary was the first of these to land — it is covered for real by
// `dashboard-appointments-page.test.tsx`, which drives the component rather than the route, since
// the route now reads the caller's business from Supabase.
describe.skip('business dashboard pages', () => { it('renders the overview', async () => { render(<LanguageProvider initialLocale="en">{await DashboardRoute()}</LanguageProvider>); expect(screen.getByText('Display-only revenue')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /view all appointments/i })).toHaveAttribute('href', '/dashboard/appointments'); }); it('shows employee-linked services and keeps a new service local to the demo', async () => { render(<LanguageProvider initialLocale="en">{await DashboardServicesRoute()}</LanguageProvider>); expect(screen.getByRole('heading', { name: 'Service management' })).toBeInTheDocument(); expect(screen.getAllByText('Zohar Levi').length).toBeGreaterThan(0); fireEvent.click(screen.getByRole('button', { name: 'Add service' })); fireEvent.change(screen.getByLabelText('Employee'), { target: { value: 'noa' } }); fireEvent.change(screen.getByLabelText('Service name'), { target: { value: 'Demo blow dry' } }); fireEvent.change(screen.getByLabelText('Service description'), { target: { value: 'A local-only test service' } }); fireEvent.click(screen.getByRole('button', { name: 'Save in demo' })); expect(screen.getByText('Demo blow dry')).toBeInTheDocument(); expect(screen.getByText('Service updated in demo only')).toBeInTheDocument(); }); });
