'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCustomerProfileState, saveCustomerProfile } from '@/lib/api/customer';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';
import type { User } from '@supabase/supabase-js';

export default function AuthPage() {
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
  const { setUser, setSession } = useUserStore();
  const { syncCart } = useCartStore();
  const redirectPath = searchParams.get('redirect') || '/profile';

  useEffect(() => {
    let cancelled = false;

    const resumeAuthenticatedUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || cancelled) return;

      const profile = await getCustomerProfileState(session.user);
      if (cancelled) return;

      setUser(session.user);
      setSession(session);
      setEmail(session.user.email ?? '');

      if (profile.needsOnboarding) {
        setVerifiedUser(session.user);
        setFullName(profile.fullName);
        setPhone(profile.phone);
        setStep('profile');
        return;
      }

      router.replace(redirectPath);
    };

    void resumeAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [redirectPath, router, setSession, setUser]);

  const completeSignIn = async (user: User, shouldSyncCart = true) => {
    const profile = await getCustomerProfileState(user);

    if (profile.needsOnboarding) {
      setVerifiedUser(user);
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setStep('profile');
      return;
    }

    if (shouldSyncCart) {
      await syncCart(user);
    }

    router.push(redirectPath);
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
    <main className="max-w-md mx-auto px-6 py-32 min-h-screen flex flex-col justify-center">
      <div className="bg-card p-8 border border-border mt-20 md:mt-0 shadow-2xl relative">
        <h1 className="text-3xl font-heading mb-2">Welcome Back</h1>
        <p className="text-sm text-text-secondary mb-8">
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
              <label className="text-xs uppercase tracking-widest font-medium text-text-secondary">Email Address</label>
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
              className="w-full bg-text-primary text-primary py-4 text-sm font-bold tracking-widest uppercase transition-all hover:bg-accent-gold active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-medium text-text-secondary">Verification Code</label>
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
              className="w-full bg-text-primary text-primary py-4 text-sm font-bold tracking-widest uppercase transition-all hover:bg-accent-gold active:scale-[0.98] disabled:opacity-50"
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
              <label className="text-xs uppercase tracking-widest font-medium text-text-secondary">Verified Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-transparent border-b border-border py-2 text-lg text-text-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-medium text-text-secondary">Full Name</label>
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
              <label className="text-xs uppercase tracking-widest font-medium text-text-secondary">Phone Number</label>
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
              className="w-full bg-text-primary text-primary py-4 text-sm font-bold tracking-widest uppercase transition-all hover:bg-accent-gold active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
