import { StorefrontModals } from '@/components/layout/storefront-modals';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <StorefrontModals />
    </>
  );
}
