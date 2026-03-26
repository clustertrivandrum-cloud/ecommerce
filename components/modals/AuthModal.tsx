'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCustomerProfileState, saveCustomerProfile } from '@/lib/api/customer';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';
import type { User } from '@supabase/supabase-js';
import { X } from 'lucide-react';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, setUser, setSession, user } = useUserStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'profile'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { syncCart } = useCartStore();
  const redirectPath = searchParams?.get('redirect') || '/profile';

  // Automatically close modal if user opens it but is already fully authenticated
  useEffect(() => {
    if (user && authModalOpen && step === 'email') {
      setAuthModalOpen(false);
    }
  }, [user, authModalOpen, setAuthModalOpen, step]);

  if (!authModalOpen) return null;

  const handleClose = () => {
    setAuthModalOpen(false);
    // Reset state on close
    setTimeout(() => {
      setEmail('');
      setOtp('');
      setStep('email');
      setError(null);
    }, 300);
  };

  const completeSignIn = async (verifiedUser: User, shouldSyncCart = true) => {
    const profile = await getCustomerProfileState(verifiedUser);

    if (profile.needsOnboarding) {
      setVerifiedUser(verifiedUser);
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setStep('profile');
      return;
    }

    if (shouldSyncCart) {
      await syncCart(verifiedUser);
    }

    handleClose();
    if (redirectPath === '/profile') {
      router.push(redirectPath);
    } else {
      router.refresh(); // just refresh the page they are on if they were just browsing
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
      });
      
      if (error) throw error;
      setStep('otp');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send login code.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      });
      
      if (error) throw error;
      
      setUser(data.user);
      setSession(data.session);
      
      if (data.user) {
        await completeSignIn(data.user);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid OTP.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifiedUser) {
      setError('Please verify your email again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveCustomerProfile(verifiedUser, { fullName, phone });
      await completeSignIn(verifiedUser);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save your profile.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm animate-in fade-in px-4">
      <div className="w-full max-w-md bg-card border border-border flex flex-col animate-in zoom-in-95 duration-200 relative shadow-2xl p-8 md:p-12">
        
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary hover:bg-primary transition-colors rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-heading mb-3 tracking-wide text-text-primary">Welcome Back</h2>
        <p className="text-sm text-text-secondary mb-8 leading-relaxed">
          {step === 'email'
            ? 'Enter your email to sign in or create an account.'
            : step === 'otp'
              ? `Enter the 6-digit code sent to ${email}`
              : 'Finish your account setup with your full name and phone number.'}
        </p>

        {error && (
          <div className="bg-red-950/30 border border-red-500 text-red-400 p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] font-medium text-text-secondary">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" 
                autoComplete="email"
                required
                className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-accent-gold transition-colors text-lg"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-text-secondary hover:bg-text-primary text-primary py-4 text-sm font-bold tracking-[0.15em] uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] font-medium text-text-secondary">Verification Code</label>
              <input 
                type="text" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000" 
                maxLength={6}
                required
                className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-accent-gold transition-colors text-2xl tracking-widest text-center"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-text-secondary hover:bg-text-primary text-primary py-4 text-sm font-bold tracking-[0.15em] uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
            <button 
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-text-secondary hover:text-text-primary text-sm transition-colors py-2"
            >
              Back to email entry
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteProfile} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] font-medium text-text-secondary">Verified Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-transparent border-b border-border py-2 text-lg text-text-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] font-medium text-text-secondary">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                required
                className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-accent-gold transition-colors text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.2em] font-medium text-text-secondary">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                required
                className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-accent-gold transition-colors text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !fullName.trim() || !phone.trim()}
              className="w-full bg-text-secondary hover:bg-text-primary text-primary py-4 text-sm font-bold tracking-[0.15em] uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
