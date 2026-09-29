'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Heart, Truck, Menu } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { MegaMenu } from './mega-menu';
import { MobileDrawer } from './mobile-drawer';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { getCartItemCount, wishlist, openSearch, toggleMiniCart } = useStore();
  const cartCount = getCartItemCount();

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-background/95 backdrop-blur-md transition-all duration-300 border-b border-border ${
          isScrolled ? 'py-3 shadow-subtle' : 'py-4 md:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between relative">
          {/* Mobile Hamburger & Desktop Left Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1.5 text-foreground hover:text-accent focus:outline-none transition-colors"
              aria-label="Open Navigation Drawer"
            >
              <Menu size={22} />
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif-title font-bold text-2xl md:text-3xl tracking-widest text-foreground group-hover:text-brand-gold transition-colors">
                DAISY<span className="text-brand-gold ml-1.5">HUB</span>
              </span>
            </Link>
          </div>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold uppercase tracking-widest text-foreground/90">
            <Link
              href="/category/new-arrivals"
              className="hover:text-brand-gold transition-colors py-2 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-brand-gold hover:after:w-full after:transition-all"
            >
              NEW ARRIVALS
            </Link>

            {/* CLOTHING with Mega Menu hover */}
            <div
              className="relative py-2 group cursor-pointer"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
            >
              <Link href="/shop" className="hover:text-brand-gold transition-colors flex items-center gap-1">
                CLOTHING
              </Link>
            </div>

            <Link href="/category/dresses" className="hover:text-brand-gold transition-colors py-2">
              DRESSES
            </Link>

            <Link href="/category/tops" className="hover:text-brand-gold transition-colors py-2">
              TOPS
            </Link>

            <Link href="/category/bottoms" className="hover:text-brand-gold transition-colors py-2">
              BOTTOMS
            </Link>

            <Link href="/category/sets" className="hover:text-brand-gold transition-colors py-2">
              SETS
            </Link>

            <Link href="/category/sale" className="text-brand-sale hover:opacity-80 transition-opacity py-2 font-bold">
              SALE
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-4 text-foreground">
            <button
              onClick={openSearch}
              className="p-2 rounded-full hover:bg-muted text-foreground hover:text-brand-gold transition-colors focus:outline-none"
              aria-label="Search"
              title="Search"
            >
              <Search size={19} />
            </button>

            {/* Track Order Direct Link */}
            <Link
              href="/track-order"
              className="p-2 rounded-full hover:bg-muted flex items-center gap-1.5 text-foreground hover:text-brand-gold transition-colors text-xs font-semibold uppercase tracking-wider"
              aria-label="Track Order"
              title="Track Order"
            >
              <Truck size={19} />
              <span className="hidden lg:inline text-[11px] font-sans font-medium">Track Order</span>
            </Link>

            <Link
              href="/wishlist"
              className="hidden md:flex relative p-2 rounded-full hover:bg-muted text-foreground hover:text-brand-gold transition-colors"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={19} />
              {isMounted && wishlist.length > 0 && (
                <Badge
                  variant="gold"
                  className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                >
                  {wishlist.length}
                </Badge>
              )}
            </Link>

            <button
              onClick={toggleMiniCart}
              className="relative p-2 rounded-full hover:bg-muted text-foreground hover:text-brand-gold transition-colors focus:outline-none"
              aria-label="Shopping Cart"
              title="Bag"
            >
              <ShoppingBag size={19} />
              {isMounted && cartCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[9px] font-bold flex items-center justify-center rounded-full leading-none animate-soft-pulse"
                >
                  {cartCount}
                </Badge>
              )}
            </button>
          </div>

          {/* Mega Menu Dropdown */}
          <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setIsMegaMenuOpen(false)} />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} />
    </>
  );
};
