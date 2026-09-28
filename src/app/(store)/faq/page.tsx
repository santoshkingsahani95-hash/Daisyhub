'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';

export default function FAQPage() {
  const faqs = [
    {
      q: 'Do you deliver across all of Nepal?',
      a: 'Yes, DAISY HUB delivers nationwide across all 7 provinces in Nepal. Orders above NPR 3,000 qualify for FREE Express shipping.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We support Cash on Delivery (COD), eSewa, Khalti, Fonepay QR, and major debit/credit cards.',
    },
    {
      q: 'How do size exchanges work?',
      a: 'If a dress or top does not fit as expected, you can request a size exchange within 7 days of receiving your package.',
    },
    {
      q: 'Are your designs exclusive to DAISY HUB?',
      a: 'Yes! All DAISY HUB pieces are original women’s clothing designs crafted with curated high-grade fabrics.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-ultra text-brand-gold">HELP CENTER</span>
          <h1 className="font-serif-title text-3xl md:text-5xl font-bold text-brand-dark">FREQUENTLY ASKED QUESTIONS</h1>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-6 bg-brand-cream/40 border border-brand-border rounded space-y-2">
              <h3 className="font-serif-title text-base font-bold text-brand-dark">{faq.q}</h3>
              <p className="text-xs text-brand-dark/80 leading-relaxed font-sans">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
