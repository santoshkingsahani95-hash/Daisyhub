'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-ultra text-brand-gold">WE ARE HERE TO HELP</span>
          <h1 className="font-serif-title text-3xl md:text-5xl font-bold text-brand-dark">CONTACT US</h1>
          <p className="text-xs text-brand-muted">Have a question about sizing, orders, or styling? Reach out to our team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
              CLIENT SERVICES
            </h3>

            <div className="space-y-4 text-xs text-brand-dark/80">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-brand-dark" />
                <span>support@daisyhub.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-brand-dark" />
                <span>+977 980-0000000 / 01-4440000</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-brand-dark" />
                <span>Daisy Hub Boutique, Baneshwor Height, Kathmandu, Nepal</span>
              </div>
            </div>

            <div className="p-4 bg-brand-cream rounded border border-brand-border text-xs text-brand-muted space-y-1">
              <p className="font-bold text-brand-dark">CUSTOMER SERVICE HOURS:</p>
              <p>Sunday – Friday: 10:00 AM – 7:00 PM NPT</p>
              <p>Saturday: Closed</p>
            </div>
          </div>

          <div className="bg-brand-cream/40 p-6 rounded-lg border border-brand-border">
            {sent ? (
              <div className="text-center py-12 space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                <h4 className="font-serif-title text-lg font-bold text-brand-dark">Message Received!</h4>
                <p className="text-xs text-brand-muted">Our customer care team will respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">YOUR NAME *</label>
                  <input type="text" required className="w-full p-3 border border-brand-border rounded bg-white" />
                </div>
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">EMAIL ADDRESS *</label>
                  <input type="email" required className="w-full p-3 border border-brand-border rounded bg-white" />
                </div>
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">MESSAGE / INQUIRY *</label>
                  <textarea rows={4} required className="w-full p-3 border border-brand-border rounded bg-white" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-brand-dark text-white font-bold uppercase tracking-widest">
                  SEND MESSAGE
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
