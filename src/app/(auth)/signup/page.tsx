import { SignupForm } from '@/components/auth/signup-form';

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const search = await searchParams;
  const next = typeof search.next === 'string' ? search.next : undefined;

  return <SignupForm next={next} />;
}
