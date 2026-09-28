import { Metadata } from 'next';
import { GET as getCategoryApi } from '@/app/api/categories/[slug]/route';
import { GET as getProductsApi } from '@/app/api/products/route';
import { CategoryClientView } from './category-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CategoryPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const catRes = await getCategoryApi(new Request(`http://localhost/api/categories/${params.slug}`), { params });
  const catData = await catRes.json().catch(() => ({}));
  const category = catData.category || catData.data;

  const title = category?.name
    ? `${category.name} | Daisy Hub Luxury Garments`
    : params.slug === 'new-arrivals'
    ? 'New Arrivals | Daisy Hub'
    : params.slug === 'sale'
    ? 'Sale Edit | Daisy Hub'
    : 'Collection | Daisy Hub';

  return {
    title,
    description: category?.description || 'Explore our latest luxury designs at Daisy Hub.',
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const slug = params.slug || 'dresses';

  const [catRes, prodsRes] = await Promise.all([
    getCategoryApi(new Request(`http://localhost/api/categories/${slug}`), { params: { slug } }),
    getProductsApi(new Request(`http://localhost/api/products?category=${encodeURIComponent(slug)}`)),
  ]);

  const [catData, prodsData] = await Promise.all([
    catRes.json().catch(() => ({})),
    prodsRes.json().catch(() => ({})),
  ]);

  const category = catData.category || catData.data || null;
  const products = prodsData.products || [];

  return (
    <CategoryClientView
      slug={slug}
      initialCategory={category}
      initialProducts={products}
    />
  );
}
