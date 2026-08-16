'use client';

import { useState, type ReactNode } from 'react';

import { ProfileSettingsForm } from '@/components/client/profile-settings-form';
import { Modal } from '@/components/common/modal';
import { ProfileSettingsContext } from '@/components/common/profile-settings-context';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { Database } from '@/types/database.types';

type AccountType = Database['public']['Enums']['account_type'];

/** Shares the profile settings modal across the header greeting (TECHNICAL_DESIGN.md §12.36). */
export function ProfileSettingsProvider({
  initialLocation,
  initialDateOfBirth,
  accountType,
  children,
}: {
  initialLocation: string;
  initialDateOfBirth: string;
  accountType: AccountType;
  children: ReactNode;
}) {
  const { copy } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ProfileSettingsContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}

      {isOpen ? (
        <Modal onClose={() => setIsOpen(false)} closeLabel={copy.profileSettings.close}>
          <ProfileSettingsForm
            initialLocation={initialLocation}
            initialDateOfBirth={initialDateOfBirth}
            accountType={accountType}
          />
        </Modal>
      ) : null}
    </ProfileSettingsContext.Provider>
  );
}
