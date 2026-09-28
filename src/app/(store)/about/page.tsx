'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-ultra text-brand-gold">OUR BRAND STORY</span>
          <h1 className="font-serif-title text-4xl md:text-6xl font-bold text-brand-dark">DAISY HUB</h1>
          <p className="text-sm text-brand-muted leading-relaxed">
            Modern women’s fashion made for your everyday confidence. Clean silhouettes, luxury fabrics, and understated elegance.
          </p>
        </div>

        <div className="relative h-96 rounded-lg overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop"
            alt="Daisy Hub Brand Story"
            fill
            className="object-cover"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-xs md:text-sm text-brand-dark/80 leading-relaxed font-sans">
          <div className="space-y-4">
            <h3 className="font-serif-title text-xl font-bold text-brand-dark">DESIGNED FOR MODERN WOMEN</h3>
            <p>
              Founded with the vision to create a refined fashion destination exclusively for women, DAISY HUB brings together contemporary streetwear aesthetics, precision tailoring, and fluid satin silhouettes.
            </p>
            <p>
              We believe clothing should feel as empowering as it is beautiful. Every piece in our collection is thoughtfully designed to transition seamlessly from morning meetings to evening celebrations.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-serif-title text-xl font-bold text-brand-dark">UNCOMPROMISING QUALITY</h3>
            <p>
              From custom contour rib knits to 100% pure washed linen, our fabrics are selected for maximum durability, breathability, and luxurious hand-feel.
            </p>
            <p>
              Based in Nepal, we offer nationwide express delivery, effortless size exchanges, and dedicated customer support.
            </p>
          </div>
        </div>

        <div className="text-center pt-8">
          <Link
            href="/shop"
            className="inline-block px-8 py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90"
          >
            EXPLORE THE COLLECTION
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
