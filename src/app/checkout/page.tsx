'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Lock, Tag, QrCode, RefreshCw, CheckCircle2, AlertCircle, X, Image as ImageIcon } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { useStore, getProductStock } from '@/lib/store';
import { db } from '@/lib/db';
import { PaymentMethod, Order, FonepaySettings } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart, user, directCheckoutItem, clearDirectCheckoutItem } = useStore();

  // Active checkout items: Use directCheckoutItem for "Buy It Now", otherwise use bag cart items
  const checkoutItems = directCheckoutItem ? [directCheckoutItem] : cart;

  const [formData, setFormData] = useState({
    fullName: user ? user.name : '',
    email: user ? user.email : '',
    mobile: user ? user.mobile || '' : '',
    province: 'Bagmati Province',
    district: 'Kathmandu',
    city: 'Kathmandu',
    streetAddress: 'New Baneshwor, Ward 10',
    landmark: 'Near Standard Chartered Bank',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fonepay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ valid: boolean; discountAmount: number; message: string } | null>(null);

  // Dynamic Fonepay Settings State (Synced Live from DB & Admin Panel)
  const [fonepaySettings, setFonepaySettings] = useState<FonepaySettings>(() => {
    const cms = db.getCMS();
    return (
      cms.fonepaySettings || {
        qrMode: 'static',
        qrImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
        merchantName: 'DAISY HUB PVT LTD',
        merchantCode: 'DAISY8849',
        accountNumber: '9841234567',
        instructions: 'Scan this official Fonepay QR code using any Mobile Banking app or digital wallet to complete payment.',
        autoVerifyEnabled: true,
      }
    );
  });

  // Fonepay Dynamic & Admin QR State
  const [showFonepayModal, setShowFonepayModal] = useState(false);
  const [fonepayQrData, setFonepayQrData] = useState<string | null>(null);
  const [fonepayPrn, setFonepayPrn] = useState<string | null>(null);
  const [userPrnInput, setUserPrnInput] = useState('');
  const [fonepayStatusMsg, setFonepayStatusMsg] = useState('Waiting for payment scan...');
  const [fonepayVerifying, setFonepayVerifying] = useState(false);
  const [fonepayError, setFonepayError] = useState('');
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [wsSocket, setWsSocket] = useState<WebSocket | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<'inside' | 'outside'>('inside');

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = couponStatus?.valid ? couponStatus.discountAmount : 0;

  // Dynamic delivery fee calculation (Inside Valley vs Outside Valley vs Free Delivery)
  const allProdsForShipping = db.getProducts();
  const isFreeDeliveryEligible = checkoutItems.length > 0 && checkoutItems.some((item) => {
    const p = allProdsForShipping.find((prod) => prod.id === item.productId || prod.slug === item.productSlug);
    return p?.isFreeDelivery;
  });

  const calculatedShipping = isFreeDeliveryEligible
    ? 0
    : checkoutItems.reduce((max, item) => {
      const p = allProdsForShipping.find((prod) => prod.id === item.productId || prod.slug === item.productSlug);
      if (p?.isFreeDelivery) return max;
      const fee = deliveryZone === 'inside'
        ? (p?.insideValleyFee !== undefined ? p.insideValleyFee : 100)
        : (p?.outsideValleyFee !== undefined ? p.outsideValleyFee : 200);
      return Math.max(max, fee);
    }, deliveryZone === 'inside' ? 100 : 200);

  const shipping = calculatedShipping;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = db.validateCoupon(couponCode, subtotal);
    setCouponStatus(res);
  };

  // Sync Fonepay Settings dynamically with DB updates & Admin Panel
  useEffect(() => {
    const syncSettings = () => {
      if (typeof window !== 'undefined') {
        const storedFonepay = localStorage.getItem('ace_db_fonepay_settings');
        if (storedFonepay) {
          try {
            const parsed = JSON.parse(storedFonepay);
            if (parsed && parsed.qrImageUrl) {
              setFonepaySettings(parsed);
              return;
            }
          } catch (e) { }
        }
      }
      const cms = db.getCMS();
      if (cms.fonepaySettings) {
        setFonepaySettings(cms.fonepaySettings);
      }
    };
    syncSettings();
    window.addEventListener('ace-db-updated', syncSettings);
    window.addEventListener('storage', syncSettings);
    return () => {
      window.removeEventListener('ace-db-updated', syncSettings);
      window.removeEventListener('storage', syncSettings);
      if (wsSocket) wsSocket.close();
    };
  }, [wsSocket]);

  const finalizeOrderSuccess = (order: Order) => {
    const allProds = db.getProducts();
    order.items.forEach((c) => {
      const prod = allProds.find((p) => p.id === c.productId || p.name === c.productName);
      if (prod) {
        const currentStock = getProductStock(prod, c.colorName);
        const newStock = Math.max(0, currentStock - c.quantity);
        db.updateInventory(prod.id, c.size, newStock);
      }
    });

    db.createOrder(order);
    if (directCheckoutItem) {
      clearDirectCheckoutItem();
    } else {
      clearCart();
    }
    setIsProcessing(false);
    setShowFonepayModal(false);
    if (wsSocket) wsSocket.close();
    router.push(`/order-confirmation/${order.id}`);
  };

  const handleCheckFonepayStatus = async (prnToCheck?: string, targetOrder?: Order) => {
    const prn = prnToCheck || userPrnInput.trim() || fonepayPrn;
    const orderToFinalize = targetOrder || pendingOrder;
    if (!orderToFinalize) return;

    setFonepayVerifying(true);
    setFonepayError('');
    setFonepayStatusMsg('Verifying payment with Fonepay server...');

    try {
      const res = await fetch('/api/fonepay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prn: prn || `PRN-${Date.now()}`,
          credentials: {
            apiUsername: fonepaySettings.apiUsername,
            apiPassword: fonepaySettings.apiPassword,
            merchantCode: fonepaySettings.merchantCode,
            apiKey: fonepaySettings.apiKey,
          },
        }),
      });
      const data = await res.json();

      if (data.verified) {
        setFonepayStatusMsg('PAYMENT VERIFIED & CONFIRMED!');
        setTimeout(() => {
          finalizeOrderSuccess(orderToFinalize);
        }, 1000);
      } else {
        setFonepayError(
          data.message ? `❌ ${data.message}` : '❌ Payment not yet verified! Please scan the Fonepay QR code and complete payment first before proceeding.'
        );
        setFonepayStatusMsg('Payment pending verification');
      }
    } catch (e) {
      setFonepayError('❌ Failed to connect to Fonepay server. Please complete payment and click verify again.');
      setFonepayStatusMsg('Verification attempt failed');
    } finally {
      setFonepayVerifying(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 && !directCheckoutItem) return;

    setIsProcessing(true);

    // Re-sync latest Fonepay settings from Admin Panel right before opening payment modal
    let activeSettings = fonepaySettings;
    if (typeof window !== 'undefined') {
      const storedFonepay = localStorage.getItem('ace_db_fonepay_settings');
      if (storedFonepay) {
        try {
          const parsed = JSON.parse(storedFonepay);
          if (parsed && parsed.qrImageUrl) activeSettings = parsed;
        } catch (e) { }
      }
    }
    if (!activeSettings.qrImageUrl && db.getCMS().fonepaySettings) {
      activeSettings = db.getCMS().fonepaySettings!;
    }
    setFonepaySettings(activeSettings);

    // Validate live inventory before starting order creation
    const allProds = db.getProducts();
    for (const item of checkoutItems) {
      const prod = allProds.find((p) => p.id === item.productId || p.slug === item.productSlug || p.name === item.productName);
      if (prod) {
        const currentStock = getProductStock(prod, item.colorName);
        if (item.quantity > currentStock) {
          setIsProcessing(false);
          alert(
            `Cannot complete order! "${item.productName}" only has ${currentStock} units remaining in stock. Please update your cart.`
          );
          return;
        }
      }
    }

    const orderId = `ord-${Date.now().toString().slice(-6)}`;
    const orderNum = `ACE-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      items: checkoutItems.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        colorName: c.colorName,
        size: c.size,
        quantity: c.quantity,
        price: c.price,
        image: c.image,
      })),
      subtotal: subtotal,
      discount: discount,
      shipping: shipping,
      total: total,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      orderStatus: 'Pending',
      customerName: formData.fullName,
      customerEmail: formData.email,
      customerMobile: formData.mobile,
      shippingAddress: {
        fullName: formData.fullName,
        mobile: formData.mobile,
        email: formData.email,
        province: formData.province,
        district: formData.district,
        city: formData.city,
        streetAddress: formData.streetAddress,
        landmark: formData.landmark,
      },
      estimatedDelivery: '3-5 Business Days',
      trackingNumber: `ACE-TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setPendingOrder(newOrder);

    if (paymentMethod === 'fonepay') {
      if (activeSettings.qrMode === 'dynamic') {
        try {
          const productNames = checkoutItems.map((c) => c.productName).join(', ');
          const qrRes = await fetch('/api/fonepay/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: total,
              remarks1: productNames, // Product name first so it appears directly in mobile banking app Remarks
              remarks2: activeSettings.merchantName || 'Ace Garment',
              apiUsername: activeSettings.apiUsername,
              apiPassword: activeSettings.apiPassword,
              merchantCode: activeSettings.merchantCode,
              apiKey: activeSettings.apiKey,
            }),
          });
          const qrData = await qrRes.json();

          setFonepayQrData(qrData.dynamicQrData || activeSettings.qrImageUrl);
          setFonepayPrn(qrData.prn || `ACE-PRN-${Date.now().toString().slice(-6)}`);
          setUserPrnInput(qrData.prn || `ACE-PRN-${Date.now().toString().slice(-6)}`);
          setFonepayStatusMsg('Waiting for scan & payment verification...');
          setFonepayError('');
          setShowFonepayModal(true);

          if (qrData.websocketUrl) {
            try {
              if (wsSocket) wsSocket.close();
              const ws = new WebSocket(qrData.websocketUrl);
              setWsSocket(ws);

              ws.onmessage = (event) => {
                try {
                  let msg = JSON.parse(event.data);
                  if (typeof msg.transactionStatus === 'string') {
                    msg = JSON.parse(msg.transactionStatus);
                  }

                  if (msg.qrVerified === true || msg.scanned === true) {
                    setFonepayStatusMsg('scanned - waiting for payment completion');
                  }
                  if (msg.paymentSuccess === true || msg.paymentStatus === 'SUCCESS') {
                    setFonepayStatusMsg('paid - verifying transaction...');
                    handleCheckFonepayStatus(qrData.prn, newOrder);
                  }
                  if (msg.paymentSuccess === false || msg.paymentStatus === 'FAILED') {
                    setFonepayError('❌ Fonepay WebSocket reported payment failed.');
                    ws.close();
                  }
                } catch (err) { }
              };
            } catch (err) { }
          }
        } catch (err) {
          setFonepayQrData(activeSettings.qrImageUrl);
          setFonepayPrn(`ACE-PRN-${Date.now().toString().slice(-6)}`);
          setUserPrnInput(`ACE-PRN-${Date.now().toString().slice(-6)}`);
          setFonepayStatusMsg('Waiting for scan...');
          setShowFonepayModal(true);
        }
      } else {
        // Static Admin Store QR Mode
        setFonepayQrData(null);
        const generatedPrn = `ACE-PRN-${Date.now().toString().slice(-6)}`;
        setFonepayPrn(generatedPrn);
        setUserPrnInput(generatedPrn);
        setFonepayStatusMsg('Scan static Fonepay QR & verify payment...');
        setFonepayError('');
        setShowFonepayModal(true);
      }
    } else {
      // Cash on Delivery (COD) order placement
      setTimeout(() => {
        finalizeOrderSuccess(newOrder);
      }, 1000);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AnnouncementBar />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="font-serif-title text-2xl font-bold text-brand-dark mb-4">Your checkout bag is empty</h2>
          <Link href="/shop" className="px-6 py-3 bg-brand-dark text-white text-xs font-semibold uppercase tracking-widest">
            RETURN TO SHOP
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark uppercase tracking-wider">
            SECURE CHECKOUT
          </h1>
        </div>

        {/* Guest Checkout vs Account Banner */}
        <div className="mb-8 p-4 bg-white rounded-lg border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Logged in as <strong className="text-brand-dark font-semibold">{user.name}</strong> ({user.email}). Order will automatically sync to your saved account history.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-brand-dark">
                <span className="px-2 py-0.5 bg-brand-cream text-brand-dark font-bold rounded text-[10px] uppercase font-mono border border-brand-border">
                  GUEST CHECKOUT ACTIVE
                </span>
                <span>No login required! Enter your email below to receive live delivery tracking & link future orders.</span>
              </div>
              <Link
                href="/login"
                className="text-xs font-bold text-brand-gold hover:underline whitespace-nowrap uppercase tracking-wider shrink-0"
              >
                Sign In (Optional) →
              </Link>
            </>
          )}
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Delivery Address & Payment */}
          <div className="lg:col-span-7 space-y-8">
            {/* Contact Details */}
            <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
              <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
                <span>1. CONTACT DETAILS</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">FULL NAME *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">MOBILE NUMBER *</label>
                  <input
                    type="text"
                    name="mobile"
                    required
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-brand-dark block mb-1">EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
              <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                2. SHIPPING ADDRESS (NEPAL)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">PROVINCE *</label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark bg-white"
                  >
                    <option value="Koshi Province">Koshi Province</option>
                    <option value="Madhesh Province">Madhesh Province</option>
                    <option value="Bagmati Province">Bagmati Province</option>
                    <option value="Gandaki Province">Gandaki Province</option>
                    <option value="Lumbini Province">Lumbini Province</option>
                    <option value="Karnali Province">Karnali Province</option>
                    <option value="Sudurpashchim Province">Sudurpashchim Province</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">DISTRICT *</label>
                  <input
                    type="text"
                    name="district"
                    required
                    value={formData.district}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">CITY / TOWN *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">STREET ADDRESS *</label>
                  <input
                    type="text"
                    name="streetAddress"
                    required
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-brand-dark block mb-1">LANDMARK / INSTRUCTIONS (OPTIONAL)</label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="e.g. Opposite Nepal Bank, Blue Gate"
                    className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div className="md:col-span-2 pt-2 border-t border-brand-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-dark block mb-2">
                    🚚 DELIVERY ZONE & RATES *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setDeliveryZone('inside')}
                      className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-center justify-between transition-all ${deliveryZone === 'inside'
                        ? 'border-brand-dark bg-brand-cream/50 shadow-xs'
                        : 'border-brand-border bg-white hover:border-brand-dark'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="deliveryZone"
                          checked={deliveryZone === 'inside'}
                          onChange={() => setDeliveryZone('inside')}
                          className="accent-brand-dark cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-brand-dark block">Inside Kathmandu Valley</span>
                          <span className="text-[10px] text-brand-muted">Kathmandu • Lalitpur • Bhaktapur</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-dark">
                        {isFreeDeliveryEligible ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">FREE</span>
                        ) : (
                          `NPR ${cart.reduce((max, item) => {
                            const p = allProdsForShipping.find((prod) => prod.id === item.productId || prod.slug === item.productSlug);
                            return Math.max(max, p?.insideValleyFee !== undefined ? p.insideValleyFee : 100);
                          }, 100)}`
                        )}
                      </span>
                    </label>

                    <label
                      onClick={() => setDeliveryZone('outside')}
                      className={`p-3.5 rounded-lg border-2 cursor-pointer flex items-center justify-between transition-all ${deliveryZone === 'outside'
                        ? 'border-brand-dark bg-brand-cream/50 shadow-xs'
                        : 'border-brand-border bg-white hover:border-brand-dark'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="deliveryZone"
                          checked={deliveryZone === 'outside'}
                          onChange={() => setDeliveryZone('outside')}
                          className="accent-brand-dark cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-brand-dark block">Outside Kathmandu Valley</span>
                          <span className="text-[10px] text-brand-muted font-light">All 77 Districts Across Nepal</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-dark">
                        {isFreeDeliveryEligible ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">FREE</span>
                        ) : (
                          `NPR ${cart.reduce((max, item) => {
                            const p = allProdsForShipping.find((prod) => prod.id === item.productId || prod.slug === item.productSlug);
                            return Math.max(max, p?.outsideValleyFee !== undefined ? p.outsideValleyFee : 200);
                          }, 200)}`
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Architecture */}
            <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
              <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
                <Lock size={18} className="text-brand-dark" />
                <span>3. SELECT PAYMENT METHOD</span>
              </h2>

              <div className="space-y-3">
                {[
                  {
                    id: 'fonepay',
                    label: 'Fonepay QR / Mobile Banking',
                    badge: fonepaySettings.qrMode === 'static' ? 'Official Store Static QR' : 'Dynamic QR + WebSocket',
                  },
                  { id: 'cod', label: 'Cash on Delivery (COD)', badge: 'Pay on Arrival' },
                ].map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-center justify-between p-4 rounded border cursor-pointer transition-all ${paymentMethod === pm.id ? 'border-brand-dark bg-brand-cream/40 font-bold' : 'border-brand-border hover:border-brand-dark'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.id}
                        checked={paymentMethod === pm.id}
                        onChange={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className="accent-brand-dark"
                      />
                      <span className="text-xs text-brand-dark font-medium">{pm.label}</span>
                    </div>
                    <span suppressHydrationWarning className="text-[10px] bg-brand-dark/10 text-brand-dark px-2 py-0.5 rounded font-mono font-semibold">
                      {pm.badge}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-6 sticky top-28">
              <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                ORDER SUMMARY ({checkoutItems.reduce((a, b) => a + b.quantity, 0)} ITEMS)
              </h2>

              {/* Items List */}
              <div className="divide-y divide-brand-border max-h-64 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 aspect-[3/4] bg-brand-cream rounded overflow-hidden shrink-0">
                        <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-brand-dark line-clamp-1">{item.productName}</h4>
                        <p className="text-[11px] text-brand-muted">{item.colorName} / {item.size} x {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-brand-dark shrink-0">
                      NPR {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Input Form */}
              <div className="space-y-2 border-t border-brand-border pt-4">
                <label className="text-xs font-semibold text-brand-dark flex items-center gap-1">
                  <Tag size={12} /> PROMO / COUPON CODE
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. WELCOME10 or ACE500"
                    className="bg-brand-cream/60 border border-brand-border text-xs px-3 py-2 flex-1 rounded-l uppercase font-mono focus:outline-none focus:border-brand-dark"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-r uppercase tracking-wider hover:bg-brand-dark/90"
                  >
                    APPLY
                  </button>
                </div>
                {couponStatus && (
                  <p className={`text-[11px] font-medium ${couponStatus.valid ? 'text-emerald-600' : 'text-brand-sale'}`}>
                    {couponStatus.message}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-xs border-t border-brand-border pt-4">
                <div className="flex justify-between text-brand-muted">
                  <span>Subtotal</span>
                  <span className="font-bold text-brand-dark">NPR {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Coupon Discount</span>
                    <span>- NPR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-brand-muted">
                  <span>Delivery Charge</span>
                  <span>{shipping === 0 ? 'FREE' : `NPR ${shipping}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-brand-dark pt-3 border-t border-brand-border">
                  <span>TOTAL AMOUNT</span>
                  <span className="text-base font-serif-title">NPR {total.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>INITIALIZING FONEPAY PAYMENT...</span>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>CONFIRM & PLACE ORDER</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-brand-muted text-center italic">
                By placing your order, you agree to DAISY HUB&apos;s Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </form>
      </main>

      {/* FONEPAY QR CODE & MANDATORY PAYMENT VERIFICATION MODAL */}
      {showFonepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setShowFonepayModal(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10 p-6 md:p-8 space-y-5 text-center max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div className="flex items-center gap-2 text-left">
                <div className="w-9 h-9 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-xs tracking-tighter font-mono shadow-xs">
                  fone
                </div>
                <div>
                  <h3 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
                    FONEPAY QR PAYMENT
                  </h3>
                  <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider block">
                    {fonepaySettings.merchantName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowFonepayModal(false);
                  setIsProcessing(false);
                  if (wsSocket) wsSocket.close();
                }}
                className="p-1.5 text-brand-muted hover:text-brand-dark rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Total Amount & Merchant Info */}
            <div className="bg-brand-cream/60 p-3.5 rounded-lg border border-brand-border flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-muted block">TOTAL PAYABLE AMOUNT</span>
                <span className="font-serif-title text-2xl font-bold text-brand-dark">
                  NPR {total.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-brand-muted block">OFFICIAL MERCHANT</span>
                <span className="font-mono text-xs font-bold text-brand-dark block">
                  {fonepaySettings.merchantName}
                </span>
                <span className="font-mono text-[11px] text-brand-gold font-bold block">Code: {fonepaySettings.merchantCode}</span>
              </div>
            </div>

            {/* Product Name Remarks Display */}
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-left space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1 font-mono">
                  <Tag size={12} className="text-amber-700" /> REQUIRED PAYMENT REMARKS (PRODUCT NAME):
                </span>
                <span className="text-[9px] bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                  REMARKS / NOTE
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-brand-dark block truncate">
                {checkoutItems.map((c) => c.productName).join(', ')}
              </span>
              <p className="text-[10px] text-amber-800/90 font-medium">
                💡 {fonepaySettings.qrMode === 'dynamic'
                  ? 'Product name is automatically encoded into this Dynamic QR payment remarks!'
                  : 'Please type the product name above into your Mobile Banking app Remarks/Note field during payment.'}
              </p>
            </div>

            {/* FONEPAY QR CODE IMAGE DISPLAY (DYNAMIC VS STATIC) */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                SCAN THIS FONEPAY QR CODE TO PAY:
              </span>
              <div className="relative aspect-square w-56 mx-auto bg-white rounded-xl border-4 border-brand-dark overflow-hidden p-3 shadow-md flex items-center justify-center">
                {fonepaySettings.qrMode === 'dynamic' && fonepayQrData ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fonepayQrData)}`}
                    alt="Fonepay Dynamic QR Code"
                    className="w-48 h-48 object-contain"
                  />
                ) : fonepaySettings.qrImageUrl ? (
                  <img
                    src={fonepaySettings.qrImageUrl}
                    alt="Official Store Fonepay QR Code"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-brand-muted">
                    <ImageIcon size={36} />
                    <span className="text-[10px] mt-1">QR Code Loading...</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-brand-muted max-w-sm mx-auto leading-relaxed">
                {fonepaySettings.instructions}
              </p>
            </div>

            {/* ERROR BANNER IF PAYMENT IS NOT VERIFIED */}
            {fonepayError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-2 text-left shadow-xs">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>{fonepayError}</span>
              </div>
            )}

            {/* Live Status Indicator */}
            <div className="p-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-ping ${fonepayStatusMsg.includes('VERIFIED') || fonepayStatusMsg.includes('paid') ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                <span className="font-semibold capitalize text-[11px]">{fonepayStatusMsg}</span>
              </div>
              {fonepayVerifying && <RefreshCw size={14} className="animate-spin text-brand-gold" />}
            </div>

            {/* Reference Input & STRICT VERIFICATION BUTTON */}
            <div className="space-y-3 pt-1 text-left">
              <div>
                <label className="text-[11px] font-bold text-brand-dark block mb-1">
                  PAYMENT TRANSACTION PRN / REFERENCE CODE *
                </label>
                <input
                  type="text"
                  value={userPrnInput}
                  onChange={(e) => setUserPrnInput(e.target.value)}
                  placeholder="e.g. PRN-172693829"
                  className="w-full p-2.5 border border-brand-border rounded font-mono text-xs font-bold bg-white focus:outline-none focus:border-brand-dark"
                />
              </div>

              <button
                type="button"
                onClick={() => handleCheckFonepayStatus()}
                disabled={fonepayVerifying}
                className="w-full py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 rounded shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {fonepayVerifying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>VERIFYING PAYMENT WITH FONEPAY...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>VERIFY PAYMENT & COMPLETE ORDER</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-brand-muted text-center italic">
                ⚠️ Order checkout WILL NOT PROCEED until Fonepay payment is confirmed and verified.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
