import { Metadata } from 'next';
import { categoryService, productService } from '@/server/services';
import { CategoryClientView } from './category-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CategoryPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await categoryService.getCategoryBySlug(params.slug);
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
  const category = await categoryService.getCategoryBySlug(slug);
  const products = await productService.getProductsByCategory(slug);

  return (
    <CategoryClientView
      slug={slug}
      initialCategory={category || null}
      initialProducts={products}
    />
  );
}
