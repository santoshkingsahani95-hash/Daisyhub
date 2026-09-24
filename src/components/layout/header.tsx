'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Heart, User, Menu, Shield, LogOut } from 'lucide-react';
import { useStore } from '@/lib/store';
import { MegaMenu } from './mega-menu';
import { MobileDrawer } from './mobile-drawer';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { getCartItemCount, wishlist, openSearch, toggleMiniCart, user, logout } = useStore();
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
        className={`sticky top-0 z-40 bg-white transition-all duration-300 border-b border-brand-border ${
          isScrolled ? 'py-3 shadow-subtle' : 'py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between relative">
          {/* Mobile Hamburger & Desktop Left Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1 text-brand-dark hover:opacity-75 focus:outline-none"
              aria-label="Open Navigation Drawer"
            >
              <Menu size={24} />
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif-title font-bold text-2xl md:text-3xl tracking-widest text-yellow-500 group-hover:opacity-90 transition-opacity">
                DAISY HUB
              </span>
            </Link>
          </div>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold uppercase tracking-ultra text-brand-dark">
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
          <div className="flex items-center space-x-3 md:space-x-5 text-brand-dark">

            <button
              onClick={openSearch}
              className="p-1.5 hover:text-brand-gold transition-colors focus:outline-none"
              aria-label="Search"
              title="Search"
            >
              <Search size={20} />
            </button>

            {/* Account & Panel Menu */}
            <div className="relative group hidden md:block">
              <Link
                href={isMounted && user ? '/account' : '/login'}
                className="p-1.5 flex items-center gap-1 hover:text-brand-gold transition-colors"
                aria-label="Account"
                title={isMounted && user ? `Account (${user.name})` : 'Sign In'}
              >
                <User size={20} />
              </Link>

              {/* Hover Dropdown Menu */}
              {isMounted && (
                <div className="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white border border-brand-border rounded-lg shadow-xl p-3 text-xs space-y-2">
                    {user ? (
                      <>
                        <div className="pb-2 border-b border-brand-border">
                          <span className="font-bold text-brand-dark block truncate">{user.name}</span>
                          <span className="text-[10px] text-brand-muted block truncate font-mono">{user.email}</span>
                        </div>

                        <div className="space-y-1 pt-1">
                          <Link
                            href="/account"
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-brand-cream text-brand-dark font-medium"
                          >
                            <User size={14} />
                            <span>My Account & Orders</span>
                          </Link>

                          <button
                            onClick={logout}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-rose-50 text-rose-600 font-medium transition-colors cursor-pointer text-left"
                          >
                            <LogOut size={14} />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pb-2 border-b border-brand-border space-y-1">
                          <span className="font-bold text-brand-dark block">WELCOME TO DAISY HUB</span>
                          <p className="text-[10px] text-brand-muted leading-tight">Optional login to sync orders & saved preferences.</p>
                        </div>
                        <div className="space-y-1 pt-1">
                          <Link
                            href="/login"
                            className="block w-full py-2 text-center bg-brand-dark text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-brand-dark/90"
                          >
                            Sign In
                          </Link>
                          <Link
                            href="/register"
                            className="block w-full py-1.5 text-center text-brand-dark font-semibold text-xs hover:underline"
                          >
                            Create Account
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/wishlist"
              className="hidden md:block relative p-1.5 hover:text-brand-gold transition-colors"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={20} />
              {isMounted && wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-dark text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <button
              onClick={toggleMiniCart}
              className="relative p-1.5 hover:text-brand-gold transition-colors focus:outline-none"
              aria-label="Shopping Cart"
              title="Bag"
            >
              <ShoppingBag size={20} />
              {isMounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-brand-dark text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-soft-pulse">
                  {cartCount}
                </span>
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
