import { Metadata } from 'next';
import { GET as getProductApi } from '@/app/api/products/[id]/route';
import { ProductDetailClient } from './product-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const res = await getProductApi(new Request(`http://localhost/api/products/${params.slug}`), {
    params: { id: params.slug },
  });
  const data = await res.json().catch(() => ({}));
  const product = data.product || data.data;

  return {
    title: product ? `${product.name} | Daisy Hub Luxury Garments` : 'Product Details | Daisy Hub',
    description: product?.description || 'Discover luxury fashion at Daisy Hub.',
    openGraph: product
      ? {
          title: product.name,
          description: product.description,
          images: product.colors?.[0]?.images?.[0] ? [{ url: product.colors[0].images[0] }] : [],
        }
      : undefined,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const res = await getProductApi(new Request(`http://localhost/api/products/${params.slug}`), {
    params: { id: params.slug },
  });
  const data = await res.json().catch(() => ({}));
  const product = data.product || data.data || null;

  return <ProductDetailClient initialProduct={product} slug={params.slug} />;
}
