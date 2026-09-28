import { Metadata } from 'next';
import { productService, categoryService } from '@/server/services';
import { ShopClient } from './shop-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Shop All | Daisy Hub Luxury Garments',
  description: "Explore the full Daisy Hub luxury women's collection with dresses, tops, bottoms, and sets.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    productService.fetchProducts(),
    categoryService.fetchCategories(),
  ]);

  return <ShopClient initialProducts={products} initialCategories={categories} />;
}
