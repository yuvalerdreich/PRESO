'use client';

import { createContext, useContext } from 'react';

export const AuthModalContext = createContext<{ openLogin: (next?: string) => void } | null>(null);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
