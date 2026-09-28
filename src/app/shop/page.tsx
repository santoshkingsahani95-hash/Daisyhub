import { Metadata } from 'next';
import { GET as getProductsApi } from '@/app/api/products/route';
import { GET as getCategoriesApi } from '@/app/api/categories/route';
import { ShopClient } from './shop-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Shop All | Daisy Hub Luxury Garments',
  description: "Explore the full Daisy Hub luxury women's collection with dresses, tops, bottoms, and sets.",
};

export default async function ShopPage() {
  const [prodsRes, catsRes] = await Promise.all([
    getProductsApi(new Request('http://localhost/api/products')),
    getCategoriesApi(new Request('http://localhost/api/categories')),
  ]);

  const [prodsData, catsData] = await Promise.all([
    prodsRes.json(),
    catsRes.json(),
  ]);

  const products = prodsData.products || [];
  const categories = catsData.categories || [];

  return <ShopClient initialProducts={products} initialCategories={categories} />;
}
