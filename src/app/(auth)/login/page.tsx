import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const search = await searchParams;
  const next = typeof search.next === 'string' ? search.next : undefined;
  const suspended = search.error === 'suspended';

  return <LoginForm next={next} suspended={suspended} />;
}
