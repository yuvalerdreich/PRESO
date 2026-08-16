'use client';

import { createContext, useContext } from 'react';

export const ProfileSettingsContext = createContext<{ open: () => void } | null>(null);

export function useProfileSettings() {
  const context = useContext(ProfileSettingsContext);
  if (!context) {
    throw new Error('useProfileSettings must be used within a ProfileSettingsProvider');
  }
  return context;
}
