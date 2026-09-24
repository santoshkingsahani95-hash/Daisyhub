'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ChevronDown, User, Heart, Search, ShoppingBag, Shield, LogOut } from 'lucide-react';
import { useStore } from '@/lib/store';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const [clothingExpanded, setClothingExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { wishlist, user, logout, openSearch } = useStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
        {/* Top Header */}
        <div>
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <Link href="/" onClick={onClose} className="font-serif-title font-bold text-xl tracking-widest text-brand-dark">
              DAISY HUB
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-brand-dark hover:bg-brand-cream rounded-full transition-colors"
              aria-label="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Action Search Bar */}
          <div className="p-4 border-b border-brand-border">
            <button
              onClick={() => {
                onClose();
                openSearch();
              }}
              className="w-full flex items-center gap-3 bg-brand-cream px-4 py-2.5 rounded-full text-xs text-brand-muted hover:text-brand-dark transition-colors"
            >
              <Search size={16} />
              <span>Search dresses, tops, jeans...</span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-5 space-y-4 text-sm uppercase tracking-wider font-medium text-brand-dark">
            <Link
              href="/category/new-arrivals"
              onClick={onClose}
              className="block py-1 text-brand-gold font-semibold flex items-center justify-between"
            >
              <span>NEW ARRIVALS</span>
              <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full font-sans">NEW</span>
            </Link>

            {/* Accordion Clothing */}
            <div>
              <button
                onClick={() => setClothingExpanded(!clothingExpanded)}
                className="w-full flex items-center justify-between py-1 text-left"
              >
                <span>CLOTHING</span>
                <ChevronDown size={16} className={`transition-transform duration-300 ${clothingExpanded ? 'rotate-180' : ''}`} />
              </button>
              {clothingExpanded && (
                <div className="pl-4 pt-2 pb-1 space-y-2.5 text-xs text-brand-muted font-normal lowercase capitalize border-l border-brand-border ml-1 my-1">
                  <Link href="/category/tops" onClick={onClose} className="block hover:text-brand-dark">
                    Tops & Blouses
                  </Link>
                  <Link href="/category/dresses" onClick={onClose} className="block hover:text-brand-dark">
                    Dresses
                  </Link>
                  <Link href="/category/bottoms" onClick={onClose} className="block hover:text-brand-dark">
                    Bottoms & Jeans
                  </Link>
                  <Link href="/category/sets" onClick={onClose} className="block hover:text-brand-dark">
                    Co-ord Sets
                  </Link>
                </div>
              )}
            </div>

            <Link href="/category/dresses" onClick={onClose} className="block py-1">
              DRESSES
            </Link>

            <Link href="/category/tops" onClick={onClose} className="block py-1">
              TOPS
            </Link>

            <Link href="/category/bottoms" onClick={onClose} className="block py-1">
              BOTTOMS
            </Link>

            <Link href="/category/sets" onClick={onClose} className="block py-1">
              SETS
            </Link>

            <Link href="/category/sale" onClick={onClose} className="block py-1 text-brand-sale font-semibold">
              SALE
            </Link>

            <div className="pt-4 border-t border-brand-border space-y-3 normal-case text-xs text-brand-muted">
              <Link href="/about" onClick={onClose} className="block hover:text-brand-dark">
                About Daisy Hub
              </Link>
              <Link href="/contact" onClick={onClose} className="block hover:text-brand-dark">
                Contact & Support
              </Link>
              <Link href="/size-guide" onClick={onClose} className="block hover:text-brand-dark">
                Size Guide
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom User Controls */}
        <div className="p-5 border-t border-brand-border bg-brand-cream/50 space-y-3">
          {isMounted && user ? (
            <div className="space-y-2">
              <div className="pb-2 border-b border-brand-border/60">
                <span className="font-bold text-brand-dark text-xs block">{user.name}</span>
                <span className="text-[10px] text-brand-muted font-mono">{user.email}</span>
              </div>

              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-brand-dark py-1.5 hover:opacity-80"
              >
                <User size={18} />
                <span>My Account & Orders</span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-rose-600 py-1.5 hover:opacity-80 text-left"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-brand-dark py-2 hover:opacity-80"
            >
              <User size={18} />
              <span>SIGN IN / REGISTER (OPTIONAL)</span>
            </Link>
          )}

          <Link
            href="/wishlist"
            onClick={onClose}
            className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-brand-dark py-2 hover:opacity-80 pt-2 border-t border-brand-border/60"
          >
            <div className="flex items-center gap-3">
              <Heart size={18} />
              <span>WISHLIST</span>
            </div>
            {isMounted && wishlist.length > 0 && (
              <span className="bg-brand-dark text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {wishlist.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
};
