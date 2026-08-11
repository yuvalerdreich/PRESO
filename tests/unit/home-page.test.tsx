import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/page';
import { siteConfig } from '@/lib/site';

/**
 * Proves the component runner works: jsdom, the React plugin, RTL queries and
 * jest-dom matchers. Component behaviour tests start with the booking wizard.
 */
describe('component test harness', () => {
  it('renders the landing page heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: siteConfig.name }),
    ).toBeInTheDocument();
  });
});
