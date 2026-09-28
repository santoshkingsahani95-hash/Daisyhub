import { MetadataRoute } from 'next';
import { GET as getProductsApi } from '@/app/api/products/route';
import { GET as getCategoriesApi } from '@/app/api/categories/route';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [catsRes, prodsRes] = await Promise.all([
      getCategoriesApi(new Request('http://localhost/api/categories')),
      getProductsApi(new Request('http://localhost/api/products')),
    ]);

    const [catsData, prodsData] = await Promise.all([
      catsRes.json().catch(() => ({})),
      prodsRes.json().catch(() => ({})),
    ]);

    categories = catsData.categories || [];
    products = prodsData.products || [];
  } catch (e) {
    console.error('[Sitemap Error]', e);
  }

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Category routes
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat: any) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Special collections
  const collectionSlugs = ['new-arrivals', 'sale', 'trending', 'best-sellers'];
  const collectionRoutes: MetadataRoute.Sitemap = collectionSlugs.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  // Individual product routes
  const productRoutes: MetadataRoute.Sitemap = products.map((prod: any) => ({
    url: `${baseUrl}/product/${prod.slug}`,
    lastModified: prod.createdAt ? new Date(prod.createdAt) : new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...collectionRoutes, ...productRoutes];
}
