import { ProfileSettingsForm } from '@/components/client/profile-settings-form';
import { requireSession } from '@/server/guards';

export default async function ProfileSettingsPage() {
  const profile = await requireSession();

  return (
    <ProfileSettingsForm
      initialLocation={profile.location ?? ''}
      initialDateOfBirth={profile.date_of_birth ?? ''}
      accountType={profile.account_type}
    />
  );
}
