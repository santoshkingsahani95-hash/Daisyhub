'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  Package,
  Heart,
  MapPin,
  Key,
  LogOut,
  ArrowRight,
  Shield,
  RefreshCw,
  Eye,
  X,
  ShoppingBag,
  Phone,
  Mail,
  Plus,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { Order, Address } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const { user, setUser, logout, wishlist } = useStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile' | 'addresses' | 'security'>('orders');
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchEmail, setSearchEmail] = useState('');

  // Address Management State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Address Form Fields
  const [addrName, setAddrName] = useState('');
  const [addrMobile, setAddrMobile] = useState('');
  const [addrProvince, setAddrProvince] = useState('Bagmati Province');
  const [addrDistrict, setAddrDistrict] = useState('Kathmandu');
  const [addrCity, setAddrCity] = useState('Kathmandu');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.addresses && user.addresses.length > 0) {
        setAddresses(user.addresses);
      } else {
        const initialAddr: Address = {
          id: 'addr-default-1',
          fullName: user.name || 'Simant Shrestha',
          mobile: user.mobile || '9709103911',
          email: user.email || 'simantshrestha2001@gmail.com',
          province: 'Bagmati Province',
          district: 'Kathmandu',
          city: 'Kathmandu',
          streetAddress: 'Baneshwor Height, Ward 10',
          isDefault: true,
        };
        setAddresses([initialAddr]);
      }
    }
  }, [user]);

  const handleSetDefaultAddress = (id: string) => {
    const updated = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setAddresses(updated);
    if (user) {
      const updatedUser = { ...user, addresses: updated };
      setUser(updatedUser);
      db.saveUser(updatedUser);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName.trim() || !addrMobile.trim() || !addrStreet.trim()) return;

    let updated: Address[];

    if (editingAddressId) {
      updated = addresses.map((addr) => {
        if (addr.id === editingAddressId) {
          return {
            ...addr,
            fullName: addrName.trim(),
            mobile: addrMobile.trim(),
            province: addrProvince,
            district: addrDistrict,
            city: addrCity,
            streetAddress: addrStreet.trim(),
            landmark: addrLandmark.trim(),
            isDefault: addrIsDefault,
          };
        }
        return addrIsDefault ? { ...addr, isDefault: false } : addr;
      });
    } else {
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        fullName: addrName.trim(),
        mobile: addrMobile.trim(),
        email: user?.email || '',
        province: addrProvince,
        district: addrDistrict,
        city: addrCity,
        streetAddress: addrStreet.trim(),
        landmark: addrLandmark.trim(),
        isDefault: addrIsDefault || addresses.length === 0,
      };

      if (newAddr.isDefault) {
        updated = addresses.map((a) => ({ ...a, isDefault: false }));
        updated.unshift(newAddr);
      } else {
        updated = [...addresses, newAddr];
      }
    }

    setAddresses(updated);
    if (user) {
      const updatedUser = { ...user, addresses: updated };
      setUser(updatedUser);
      db.saveUser(updatedUser);
    }

    setIsAddressModalOpen(false);
    setEditingAddressId(null);
  };

  const handleDeleteAddress = (id: string) => {
    if (addresses.length <= 1) {
      alert('You must keep at least one saved delivery address.');
      return;
    }
    const filtered = addresses.filter((a) => a.id !== id);
    if (!filtered.some((a) => a.isDefault) && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    setAddresses(filtered);
    if (user) {
      const updatedUser = { ...user, addresses: filtered };
      setUser(updatedUser);
      db.saveUser(updatedUser);
    }
  };

  const fetchUserOrders = () => {
    const allOrders = db.getOrders();
    if (user) {
      if (user.role === 'ADMIN' && !searchEmail.trim()) {
        setUserOrders(allOrders);
        return;
      }
      const targetEmail = searchEmail.trim() ? searchEmail.trim() : user.email;
      const matched = db.getOrdersByEmail(targetEmail);
      setUserOrders(matched);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }

    const handleDbUpdate = () => {
      if (user) fetchUserOrders();
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-cream/30">
        <AnnouncementBar />
        <Header />

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-lg bg-white p-8 md:p-10 rounded-xl border border-brand-border shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-dark border border-brand-border">
              <User size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-ultra font-bold text-brand-gold">CUSTOMER PORTAL</span>
              <h1 className="font-serif-title text-3xl font-bold text-brand-dark">ACCOUNT & ORDER HISTORY</h1>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Logging in is optional at Daisy Hub! You can browse and checkout anytime as a guest, or sign in to track and sync all past orders.
              </p>
            </div>

            <div className="p-4 bg-brand-cream/60 border border-brand-border rounded-lg text-xs text-brand-dark text-left space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <span>💡 Optional Login Benefits:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-brand-muted text-[11px]">
                <li>View complete order history and real-time shipment status</li>
                <li>Saved delivery addresses for lightning-fast checkout</li>
                <li>Access your saved wishlist items across devices</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/login"
                className="py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2"
              >
                <span>SIGN IN</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/register"
                className="py-3.5 bg-white border border-brand-dark text-brand-dark text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-cream transition-all flex items-center justify-center gap-2"
              >
                <span>CREATE ACCOUNT</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-brand-border">
              <Link
                href="/shop"
                className="text-xs text-brand-muted hover:text-brand-dark font-semibold transition-colors"
              >
                Continue Shopping as Guest →
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        {/* Welcome Card */}
        <div className="bg-white p-6 md:p-8 rounded-lg border border-brand-border shadow-sm flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-ultra font-bold text-brand-gold">CUSTOMER PORTAL</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                user.role === 'ADMIN' ? 'bg-brand-dark text-white' : 'bg-brand-cream text-brand-dark'
              }`}>
                ROLE: {user.role}
              </span>
            </div>
            <h1 className="font-serif-title text-3xl font-bold text-brand-dark">WELCOME, {user.name.toUpperCase()}</h1>
            <p className="text-xs text-brand-muted mt-0.5">{user.email} • Member since {user.registrationDate}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-4 py-2.5 border border-brand-border text-xs font-semibold text-brand-dark hover:bg-brand-cream rounded flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Dashboard Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'orders', label: 'My Orders', icon: Package, count: userOrders.length },
              { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlist.length },
              { id: 'profile', label: 'Profile Details', icon: User },
              { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
              { id: 'security', label: 'Security & Password', icon: Key },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full p-4 rounded text-left text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-all ${
                    activeTab === tab.id
                      ? 'bg-brand-dark text-white shadow'
                      : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-brand-cream text-brand-dark'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Display Pane */}
          <div className="lg:col-span-9 bg-white p-6 md:p-8 rounded-lg border border-brand-border shadow-sm">
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-brand-border gap-3">
                  <div>
                    <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                      SAVED ORDER HISTORY
                    </h2>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Showing orders linked to <strong className="text-brand-dark font-mono">{user.email}</strong>
                    </p>
                  </div>

                  {/* Optional Email / Order Lookup input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUserOrders()}
                      placeholder="Find orders by guest email..."
                      className="px-3 py-1.5 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark w-48 md:w-56"
                    />
                    <button
                      onClick={fetchUserOrders}
                      className="px-3 py-1.5 bg-brand-dark text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-brand-dark/90"
                    >
                      Filter
                    </button>
                    {searchEmail && (
                      <button
                        onClick={() => {
                          setSearchEmail('');
                          setTimeout(fetchUserOrders, 0);
                        }}
                        className="text-xs text-brand-muted hover:text-brand-dark font-semibold"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-brand-cream/60 rounded border border-brand-border text-xs text-brand-dark flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-brand-gold shrink-0" />
                    <span>
                      <strong>Optional Login Unlocked:</strong> Any past or future order placed with <strong>{user.email}</strong> is automatically saved and viewable in this portal.
                    </span>
                  </div>
                </div>

                {userOrders.length === 0 ? (
                  <div className="text-center py-12 text-xs text-brand-muted space-y-3">
                    <Package size={36} className="mx-auto text-brand-muted/40 stroke-1" />
                    <p className="font-serif-title text-base font-semibold text-brand-dark">No past orders placed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userOrders.map((ord) => (
                      <div key={ord.id} className="p-5 border border-brand-border rounded space-y-3 bg-brand-cream/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-brand-border text-xs gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-brand-dark text-sm">{ord.orderNumber}</span>
                              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                                ord.orderStatus === 'Out for Delivery'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : ord.orderStatus === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                {ord.orderStatus === 'Pending' ? '⏳ PENDING' : ord.orderStatus === 'Out for Delivery' ? '🚚 OUT FOR DELIVERY' : '❌ CANCELLED'}
                              </span>
                            </div>
                            <span className="text-brand-muted block text-[11px]">Placed on {new Date(ord.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-brand-dark text-sm">NPR {ord.total.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-xs text-brand-muted space-y-1">
                          <p><span className="font-semibold text-brand-dark">Items:</span> {ord.items.map((i) => `${i.productName} (${i.size}, ${i.colorName})`).join(', ')}</p>
                          <p><span className="font-semibold text-brand-dark">Payment:</span> {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="text-xs font-bold text-brand-dark hover:text-brand-gold flex items-center gap-1.5 uppercase tracking-wider bg-white px-3 py-1.5 border border-brand-border rounded shadow-xs"
                          >
                            <Eye size={14} />
                            <span>VIEW CLOTHES DETAILS</span>
                          </button>

                          <Link
                            href={`/order-confirmation/${ord.id}`}
                            className="text-xs font-bold text-brand-dark hover:text-brand-gold flex items-center gap-1 uppercase tracking-wider"
                          >
                            <span>VIEW RECEIPT</span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-4">
                  PERSONAL PROFILE
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">FULL NAME</label>
                    <input type="text" defaultValue={user.name} className="w-full p-3 border border-brand-border rounded bg-brand-cream/30" />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">EMAIL ADDRESS</label>
                    <input type="email" defaultValue={user.email} className="w-full p-3 border border-brand-border rounded bg-brand-cream/30" disabled />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">MOBILE NUMBER</label>
                    <input type="text" defaultValue={user.mobile || ''} className="w-full p-3 border border-brand-border rounded" />
                  </div>
                </div>
                <button className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest">
                  SAVE CHANGES
                </button>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
                  <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                    SAVED ADDRESSES ({addresses.length})
                  </h2>
                  <button
                    onClick={() => {
                      setEditingAddressId(null);
                      setAddrName(user?.name || '');
                      setAddrMobile(user?.mobile || '');
                      setAddrProvince('Bagmati Province');
                      setAddrDistrict('Kathmandu');
                      setAddrCity('Kathmandu');
                      setAddrStreet('');
                      setAddrLandmark('');
                      setAddrIsDefault(addresses.length === 0);
                      setIsAddressModalOpen(true);
                    }}
                    className="px-4 py-2 bg-brand-dark text-white text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-xs hover:bg-brand-dark/90 transition-colors"
                  >
                    <Plus size={14} />
                    <span>+ ADD NEW ADDRESS</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-5 border rounded-lg transition-all space-y-2 relative ${
                        addr.isDefault
                          ? 'border-brand-dark bg-white shadow-sm ring-1 ring-brand-dark'
                          : 'border-brand-border bg-brand-cream/20 hover:border-brand-dark/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {addr.isDefault ? (
                            <span className="text-[10px] bg-brand-dark text-white font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                              DEFAULT
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.id!)}
                              className="text-[10px] bg-brand-cream hover:bg-brand-dark hover:text-white border border-brand-border text-brand-dark font-bold px-2.5 py-1 rounded uppercase font-mono transition-colors cursor-pointer"
                            >
                              SET AS DEFAULT
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <button
                            onClick={() => {
                              setEditingAddressId(addr.id!);
                              setAddrName(addr.fullName);
                              setAddrMobile(addr.mobile);
                              setAddrProvince(addr.province || 'Bagmati Province');
                              setAddrDistrict(addr.district || 'Kathmandu');
                              setAddrCity(addr.city || 'Kathmandu');
                              setAddrStreet(addr.streetAddress);
                              setAddrLandmark(addr.landmark || '');
                              setAddrIsDefault(!!addr.isDefault);
                              setIsAddressModalOpen(true);
                            }}
                            className="text-brand-dark hover:text-brand-gold font-bold underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id!)}
                            className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="font-bold text-brand-dark pt-1 text-sm">{addr.fullName}</p>
                      <p className="text-xs text-brand-muted leading-relaxed">
                        {addr.streetAddress}{addr.landmark ? `, ${addr.landmark}` : ''}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {addr.city}, {addr.province}, Nepal
                      </p>
                      <p className="text-xs text-brand-muted font-mono pt-1">
                        Mobile: <strong className="text-brand-dark">{addr.mobile}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 max-w-md">
                <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-4">
                  CHANGE PASSWORD
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">CURRENT PASSWORD</label>
                    <input type="password" className="w-full p-3 border border-brand-border rounded" />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">NEW PASSWORD</label>
                    <input type="password" className="w-full p-3 border border-brand-border rounded" />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">CONFIRM NEW PASSWORD</label>
                    <input type="password" className="w-full p-3 border border-brand-border rounded" />
                  </div>
                </div>
                <button className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest">
                  UPDATE PASSWORD
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CUSTOMER ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-ultra text-brand-gold">
                  PURCHASED CLOTHES SPECIFICATION
                </span>
                <h3 className="font-serif-title text-2xl font-bold text-brand-dark">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-brand-dark hover:bg-brand-cream rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Delivery Address */}
            <div className="bg-brand-cream/40 p-4 rounded border border-brand-border text-xs space-y-1">
              <span className="font-bold text-brand-dark uppercase tracking-wider block text-[10px] text-brand-gold mb-1">
                DELIVERY DESTINATION
              </span>
              <p className="font-bold text-brand-dark flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-muted shrink-0" />
                <span>{selectedOrder.shippingAddress?.streetAddress || 'Address Provided'}</span>
              </p>
              <p className="text-brand-muted pl-5">
                {selectedOrder.shippingAddress?.city || 'Kathmandu'}, {selectedOrder.shippingAddress?.province || 'Bagmati'}
              </p>
              <p className="text-brand-muted pl-5 font-mono">Mobile Contact: {selectedOrder.customerMobile}</p>
            </div>

            {/* Purchased Clothes List */}
            <div className="space-y-3">
              <h4 className="font-serif-title text-sm font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-2">
                PURCHASED ITEMS ({selectedOrder.items.length})
              </h4>

              <div className="divide-y divide-brand-border">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 aspect-[3/4] bg-brand-cream rounded overflow-hidden shrink-0 border border-brand-border">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <ShoppingBag size={20} className="m-auto text-brand-muted" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-brand-dark text-sm">{item.productName}</h5>
                        <div className="flex items-center gap-2 text-[11px] text-brand-muted font-medium">
                          <span>Color: <strong className="text-brand-dark">{item.colorName}</strong></span>
                          <span>•</span>
                          <span>Size: <strong className="text-brand-dark font-mono">{item.size}</strong></span>
                        </div>
                        <p className="text-[11px] text-brand-muted font-mono">Quantity: {item.quantity} unit(s)</p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-brand-dark block text-sm">
                        NPR {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-brand-muted">
                        (NPR {item.price.toLocaleString()} each)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-4 bg-brand-cream/30 border border-brand-border rounded space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="font-bold text-brand-dark uppercase tracking-wider text-[11px]">ORDER STATUS:</span>
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded border ${
                  selectedOrder.orderStatus === 'Out for Delivery'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : selectedOrder.orderStatus === 'Cancelled'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {selectedOrder.orderStatus === 'Pending' ? '⏳ PENDING' : selectedOrder.orderStatus === 'Out for Delivery' ? '🚚 OUT FOR DELIVERY' : '❌ CANCELLED'}
                </span>
              </div>
              <div className="flex justify-between text-brand-muted">
                <span>Payment Method</span>
                <span className="font-mono uppercase font-bold text-brand-dark">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-bold text-brand-dark text-sm pt-2 border-t border-brand-border">
                <span>TOTAL PAID</span>
                <span>NPR {selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/order-confirmation/${selectedOrder.id}`}
                target="_blank"
                className="px-4 py-2.5 border border-brand-border text-brand-dark hover:bg-brand-cream text-xs font-bold uppercase tracking-wider rounded"
              >
                VIEW OFFICIAL RECEIPT ↗
              </Link>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl border border-brand-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-dark text-white p-5 flex items-center justify-between">
              <h3 className="font-serif-title font-bold text-base tracking-wide uppercase">
                {editingAddressId ? 'EDIT DELIVERY ADDRESS' : 'ADD NEW DELIVERY ADDRESS'}
              </h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-brand-dark block mb-1">FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  placeholder="e.g. Simant Shrestha"
                  className="w-full p-3 border border-brand-border rounded focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="font-semibold text-brand-dark block mb-1">MOBILE NUMBER *</label>
                <input
                  type="text"
                  required
                  value={addrMobile}
                  onChange={(e) => setAddrMobile(e.target.value)}
                  placeholder="e.g. 9841234567"
                  className="w-full p-3 border border-brand-border rounded font-mono focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">PROVINCE *</label>
                  <select
                    value={addrProvince}
                    onChange={(e) => setAddrProvince(e.target.value)}
                    className="w-full p-3 border border-brand-border rounded bg-white focus:outline-none focus:border-brand-dark"
                  >
                    <option value="Bagmati Province">Bagmati Province</option>
                    <option value="Koshi Province">Koshi Province</option>
                    <option value="Madhesh Province">Madhesh Province</option>
                    <option value="Gandaki Province">Gandaki Province</option>
                    <option value="Lumbini Province">Lumbini Province</option>
                    <option value="Karnali Province">Karnali Province</option>
                    <option value="Sudurpashchim Province">Sudurpashchim Province</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">CITY / DISTRICT *</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="e.g. Kathmandu / Lalitpur"
                    className="w-full p-3 border border-brand-border rounded focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-brand-dark block mb-1">STREET ADDRESS / TOLE *</label>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="e.g. Baneshwor Height, Ward 10"
                  className="w-full p-3 border border-brand-border rounded focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="font-semibold text-brand-dark block mb-1">LANDMARK / HOUSE NO. (OPTIONAL)</label>
                <input
                  type="text"
                  value={addrLandmark}
                  onChange={(e) => setAddrLandmark(e.target.value)}
                  placeholder="e.g. Near Standard Chartered Bank"
                  className="w-full p-3 border border-brand-border rounded focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultAddr"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="accent-brand-dark w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isDefaultAddr" className="text-xs text-brand-dark font-semibold cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-brand-muted hover:text-brand-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-dark/90 shadow-sm"
                >
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
