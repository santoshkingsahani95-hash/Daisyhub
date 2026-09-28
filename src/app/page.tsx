import { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { ProductShelf } from '@/components/product/product-shelf';
import { CategoryGrid } from '@/components/category/category-grid';
import { getCMS, getProducts, getCategories } from '@/lib/db-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "DaisyHub – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
  description:
    "DaisyHub is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Nepal.",
};

export default async function HomePage() {
  const [cms, allProducts, categories] = await Promise.all([
    getCMS(),
    getProducts(),
    getCategories(),
  ]);

  const trendingProducts = allProducts.filter((p) => p.isTrending).slice(0, 8);
  const newArrivals = allProducts
    .filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'))
    .slice(0, 8);
  const bestSellers = allProducts
    .filter((p) => p.isBestSeller || p.reviewCount > 30)
    .slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar text={cms.announcementBar?.text} enabled={cms.announcementBar?.enabled} />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 bg-gray-100 flex items-center justify-center border-b border-brand-border">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="font-serif-title text-5xl sm:text-7xl md:text-8xl font-bold tracking-widest text-yellow-500 uppercase">
              Daisy Hub
            </h1>
          </div>
        </section>

        {/* Category-wise Shopping Grid */}
        <CategoryGrid categories={categories} />

        {/* Trending Now Shelf */}
        <ProductShelf
          title="TRENDING NOW"
          eyebrow="HIGH DEMAND LOOKS"
          icon={<Sparkles size={14} />}
          viewAllLink="/category/trending"
          viewAllLabel="VIEW ALL TRENDING"
          products={trendingProducts}
          className="bg-brand-cream/40 border-y border-brand-border"
        />

        {/* New Arrivals Shelf */}
        <ProductShelf
          title="NEW ARRIVALS"
          eyebrow="FRESH DROPS"
          subtitle="Fresh pieces you'll want to wear on repeat."
          viewAllLink="/category/new-arrivals"
          viewAllLabel="VIEW ALL NEW ARRIVALS"
          products={newArrivals}
        />

        {/* Best Sellers Shelf */}
        <ProductShelf
          title="BEST SELLERS"
          eyebrow="CUSTOMER FAVORITES"
          viewAllLink="/category/best-sellers"
          viewAllLabel="SHOP BEST SELLERS"
          products={bestSellers}
          className="bg-brand-cream/30 border-t border-brand-border"
        />
      </main>

      <Footer />
    </div>
  );
}
