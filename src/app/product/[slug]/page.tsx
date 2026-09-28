import { Metadata } from 'next';
import { getProductBySlug, getProductById } from '@/lib/db-queries';
import { ProductDetailClient } from './product-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProductDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product =
    (await getProductBySlug(params.slug)) ||
    (await getProductById(params.slug));

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
  const product =
    (await getProductBySlug(params.slug)) ||
    (await getProductById(params.slug));

  return <ProductDetailClient initialProduct={product || null} slug={params.slug} />;
}

