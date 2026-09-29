import { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ArrowRight, Truck, ShieldCheck, CreditCard, RotateCcw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { ProductShelf } from '@/components/product/product-shelf';
import { CategoryGrid } from '@/components/category/category-grid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GET as getCmsApi } from '@/app/api/cms/route';
import { GET as getProductsApi } from '@/app/api/products/route';
import { GET as getCategoriesApi } from '@/app/api/categories/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "DaisyHub – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
  description:
    "DaisyHub is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Nepal.",
};

export default async function HomePage() {
  const [cmsRes, prodsRes, catsRes] = await Promise.all([
    getCmsApi(),
    getProductsApi(new Request('http://localhost/api/products')),
    getCategoriesApi(new Request('http://localhost/api/categories')),
  ]);

  const [cmsData, prodsData, catsData] = await Promise.all([
    cmsRes.json(),
    prodsRes.json(),
    catsRes.json(),
  ]);

  const cms = cmsData.cms || cmsData.data || {};
  const allProducts: any[] = prodsData.products || [];
  const categories: any[] = catsData.categories || [];

  const trendingProducts = allProducts.filter((p) => p.isTrending).slice(0, 8);
  const newArrivals = allProducts
    .filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'))
    .slice(0, 8);
  const bestSellers = allProducts
    .filter((p) => p.isBestSeller || p.reviewCount > 30)
    .slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AnnouncementBar text={cms.announcementBar?.text} enabled={cms.announcementBar?.enabled} />
      <Header />

      <main className="flex-1">
        {/* Luxury Hero Banner */}
        <section className="relative w-full py-20 md:py-28 lg:py-36 bg-gradient-to-b from-brand-cream/60 via-background to-background flex items-center justify-center border-b border-border overflow-hidden">
          {/* Subtle Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-sand/50 rounded-full blur-2xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto px-6 text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="gold" className="px-3.5 py-1 text-[10px] tracking-widest font-semibold flex items-center gap-1.5 shadow-xs">
                <Sparkles size={12} className="animate-pulse" />
                <span>NEPAL&apos;S PREMIER LADIES BOUTIQUE</span>
              </Badge>
            </div>

            <h1 className="font-serif-title text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] uppercase">
              Curated Luxury & <br />
              <span className="text-brand-gold italic font-normal">Everyday Elegance</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-sans">
              Discover flattering silhouettes, fine fabrics, and signature pieces tailored for the modern woman.
              Enjoy swift doorstep delivery across Kathmandu Valley and all 7 provinces of Nepal.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button asChild size="lg" variant="luxury" className="w-full sm:w-auto tracking-widest px-8">
                <Link href="/category/new-arrivals" className="flex items-center justify-center gap-2">
                  <span>SHOP NEW ARRIVALS</span>
                  <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto tracking-widest px-8">
                <Link href="/shop">
                  <span>EXPLORE ALL COLLECTIONS</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Value Propositions Strip */}
        <section className="border-b border-border bg-card/60 py-6 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="flex items-center gap-3 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
                <Truck size={18} className="text-brand-gold" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Express Delivery</h4>
                <p className="text-[11px] text-muted-foreground">Kathmandu & Nationwide</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
                <ShieldCheck size={18} className="text-brand-gold" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Premium Quality</h4>
                <p className="text-[11px] text-muted-foreground">100% Inspected Fabric</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
                <CreditCard size={18} className="text-brand-gold" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Easy Payments</h4>
                <p className="text-[11px] text-muted-foreground">Fonepay QR, eSewa & COD</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
                <RotateCcw size={18} className="text-brand-gold" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Hassle-Free Exchange</h4>
                <p className="text-[11px] text-muted-foreground">Fast size assistance</p>
              </div>
            </div>
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
          className="bg-secondary/40 border-y border-border"
        />

        {/* New Arrivals Shelf */}
        <ProductShelf
          title="NEW ARRIVALS"
          eyebrow="JUST DROPPED"
          icon={<Sparkles size={14} />}
          viewAllLink="/category/new-arrivals"
          viewAllLabel="EXPLORE NEW ARRIVALS"
          products={newArrivals}
          className="border-b border-border"
        />

        {/* Best Sellers Shelf */}
        <ProductShelf
          title="BEST SELLERS"
          eyebrow="CUSTOMER FAVORITES"
          icon={<Sparkles size={14} />}
          viewAllLink="/category/best-sellers"
          viewAllLabel="SHOP BEST SELLERS"
          products={bestSellers}
          className="bg-secondary/40"
        />
      </main>

      <Footer />
    </div>
  );
}
