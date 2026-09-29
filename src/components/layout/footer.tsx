'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, ArrowRight, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    const res = db.addNewsletterSubscriber(email);
    setStatus({ type: 'success', message: res.message });
    setEmail('');
  };

  return (
    <footer className="bg-zinc-950 text-white pt-16 pb-12 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-zinc-800/80">
          {/* Column 1: Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="font-serif-title text-2xl md:text-3xl font-bold tracking-widest block text-white group">
              DAISY<span className="text-brand-gold ml-1">HUB</span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed font-sans">
              Modern women’s fashion made for your everyday confidence. Clean silhouettes, luxury fabrics, and understated elegance delivered across Nepal.
            </p>

            <div className="pt-4">
              <span className="text-[11px] uppercase tracking-widest text-zinc-400 block mb-2 font-semibold">JOIN THE DAISY HUB VIP CLUB</span>
              <form onSubmit={handleSubscribe} className="flex max-w-sm">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-zinc-900 text-white placeholder:text-zinc-500 text-xs rounded-r-none border-zinc-800 focus-visible:ring-brand-gold"
                />
                <Button
                  type="submit"
                  variant="gold"
                  size="default"
                  className="rounded-l-none px-4"
                >
                  <ArrowRight size={15} />
                </Button>
              </form>
              {status.type === 'success' && (
                <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {status.message}
                </p>
              )}
              {status.type === 'error' && (
                <p className="text-[11px] text-rose-400 mt-2">{status.message}</p>
              )}
            </div>
          </div>

          {/* Column 2: SHOP */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold tracking-wider text-white uppercase mb-4">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-sans">
              <li>
                <Link href="/category/new-arrivals" className="hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/category/tops" className="hover:text-white transition-colors">
                  Tops & Blouses
                </Link>
              </li>
              <li>
                <Link href="/category/dresses" className="hover:text-white transition-colors">
                  Dresses
                </Link>
              </li>
              <li>
                <Link href="/category/bottoms" className="hover:text-white transition-colors">
                  Bottoms & Jeans
                </Link>
              </li>
              <li>
                <Link href="/category/sets" className="hover:text-white transition-colors">
                  Co-ord Sets
                </Link>
              </li>
              <li>
                <Link href="/category/sale" className="text-brand-gold font-medium hover:text-white transition-colors">
                  Sale Edit
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: HELP */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold tracking-wider text-white uppercase mb-4">
              HELP & SUPPORT
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-sans">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ & Shipping
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-brand-gold hover:underline transition-colors font-mono text-[11px]">
                  Admin Control Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: COMPANY & SOCIAL */}
          <div>
            <h4 className="font-serif-title text-sm font-semibold tracking-wider text-white uppercase mb-4">
              COMPANY
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-sans mb-6">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Daisy Hub
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
            </ul>

            <span className="text-[11px] uppercase tracking-widest text-zinc-400 block mb-3 font-semibold">FOLLOW OUR LOOKBOOK</span>
            <div className="flex gap-2.5 text-zinc-400">
              <a
                href="https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg=="
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-brand-gold hover:text-white transition-all shadow-xs"
                aria-label="Instagram"
              >
                <Instagram size={15} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-brand-gold hover:text-white transition-all shadow-xs"
                aria-label="Facebook"
              >
                <Facebook size={15} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 gap-4 font-sans">
          <p>© 2026 DAISY HUB. All Rights Reserved. Curated for modern women across Nepal.</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Supported: Fonepay QR • eSewa • Khalti • Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
