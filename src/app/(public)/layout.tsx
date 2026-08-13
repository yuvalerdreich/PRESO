import { PublicHeader } from '@/components/common/public-header';

export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
