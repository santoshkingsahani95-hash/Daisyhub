'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { AuthCard, GoogleButton, AuthDivider, AuthAlert } from '@/components/auth';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';

export default function RegisterPage() {
  const router = useRouter();

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Verification State
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!mobile.trim()) {
      setErrorMsg('Please enter your mobile number.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please check and try again.');
      return;
    }

    // Check if user already exists
    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      setErrorMsg('An account with this email address already exists. Please log in.');
      return;
    }

    setIsLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          otpCode: code,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setStep('otp');
        setInfoMsg(data.message || `Verification code sent to ${email}`);
      } else {
        setErrorMsg(data.message || 'Failed to send verification email. Please try again.');
      }
    } catch {
      setIsLoading(false);
      setStep('otp');
      setInfoMsg(`Verification code generated: ${code}`);
    }
  };

  // Verify OTP & Complete Account Creation
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (inputOtp.trim() !== generatedOtp.trim()) {
      setErrorMsg('Invalid verification code. Please check your email and try again.');
      return;
    }

    const newUser: CustomerUser = {
      id: `usr-${Date.now()}`,
      name: fullName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password: password,
      role: 'CUSTOMER',
      registrationDate: new Date().toISOString().split('T')[0],
    };

    db.saveUser(newUser);
    router.push('/login?registered=1');
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <AuthCard
          badge="DAISY HUB PORTAL"
          title={step === 'form' ? 'CREATE ACCOUNT' : 'VERIFY EMAIL'}
          subtitle={
            step === 'form'
              ? 'Customer Registration with Email OTP Verification'
              : `Enter the 6-digit verification code sent to ${email}`
          }
        >
          <AuthAlert type="error" message={errorMsg} />
          <AuthAlert type="success" message={infoMsg} />

          {/* STEP 1: Registration Form */}
          {step === 'form' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1">FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aayusha Karki"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1">MOBILE NUMBER *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9841234567"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1">EMAIL ADDRESS *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aayusha@example.com"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1">NEW PASSWORD *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1">CONFIRM NEW PASSWORD *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>SENDING OTP...</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT & SEND VERIFICATION CODE</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <AuthDivider />

              <GoogleButton
                text="Sign Up with Google"
                callbackUrl="/account"
              />
            </form>
          )}

          {/* STEP 2: OTP Verification Form */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center p-4 bg-brand-cream/60 border border-brand-border rounded space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold block">
                  EMAIL SENT TO:
                </span>
                <span className="font-bold text-sm text-brand-dark font-mono block">{email}</span>
                <p className="text-[11px] text-brand-muted">
                  Please check your inbox or spam folder for the 6-digit code.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase tracking-wider text-center">
                  ENTER 6-DIGIT VERIFICATION CODE
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full p-3.5 border-2 border-brand-dark text-center font-mono font-bold text-xl tracking-[8px] rounded focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>VERIFY & REGISTER ACCOUNT</span>
              </button>

              <div className="flex justify-between items-center text-xs text-brand-muted pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="hover:text-brand-dark font-semibold cursor-pointer"
                >
                  ← Edit Registration Info
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSendOtp(e as any)}
                  className="hover:text-brand-dark font-semibold text-brand-gold cursor-pointer"
                >
                  Resend Code 🔄
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-brand-muted text-center pt-2">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-brand-dark hover:underline">
              Sign In
            </Link>
          </p>
        </AuthCard>
      </main>

      <Footer />
    </div>
  );
}
