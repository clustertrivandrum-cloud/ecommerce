'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddressModal } from '@/components/modals/AddressModal';
import type { CustomerAddress, CustomerAddressInput } from '@/lib/customer-addresses';
import { createCustomerAddress, getCustomerAddresses, updateCustomerAddress } from '@/lib/api/customer-addresses';
import { getCustomerProfileState, saveCustomerProfile } from '@/lib/api/customer';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, setSession, setAuthModalOpen } = useUserStore();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [draftFullName, setDraftFullName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        setFullName('');
        setPhone('');
        setDraftFullName('');
        setDraftPhone('');
        setAddresses([]);
        return;
      }

      setAddressesLoading(true);
      setAddressesError(null);

      try {
        const [profile, savedAddresses] = await Promise.all([
          getCustomerProfileState(user),
          getCustomerAddresses(),
        ]);

        if (cancelled) return;

        setFullName(profile.fullName);
        setPhone(profile.phone);
        setDraftFullName(profile.fullName);
        setDraftPhone(profile.phone);
        setAddresses(savedAddresses);
      } catch (err: unknown) {
        if (cancelled) return;

        const errorMsg = err instanceof Error ? err.message : 'Could not load your profile.';
        setAddressesError(errorMsg);
      } finally {
        if (!cancelled) {
          setAddressesLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center">
        <h1 className="text-3xl font-heading mb-6">Access Profile</h1>
        <p className="text-text-secondary mb-8">Please log in to view your profile and orders.</p>
        <button onClick={() => setAuthModalOpen(true)} className="bg-text-primary text-primary px-8 py-4 text-sm font-medium hover:bg-accent-gold transition-colors uppercase tracking-widest">
          Sign In
        </button>
      </main>
    );
  }

  const handleStartEditProfile = () => {
    setDraftFullName(fullName);
    setDraftPhone(phone);
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setDraftFullName(fullName);
    setDraftPhone(phone);
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await saveCustomerProfile(user, {
        fullName: draftFullName,
        phone: draftPhone,
      });

      const updatedProfile = await getCustomerProfileState(user);
      setFullName(updatedProfile.fullName);
      setPhone(updatedProfile.phone);
      setDraftFullName(updatedProfile.fullName);
      setDraftPhone(updatedProfile.phone);
      setIsEditingProfile(false);
      setProfileSuccess('Profile updated.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(errorMsg);
    } finally {
      setProfileLoading(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressModalError(null);
    setAddressModalOpen(true);
  };

  const openEditAddress = (address: CustomerAddress) => {
    setEditingAddress(address);
    setAddressModalError(null);
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    if (addressSaving) return;

    setAddressModalOpen(false);
    setEditingAddress(null);
    setAddressModalError(null);
  };

  const handleSaveAddress = async (input: CustomerAddressInput) => {
    setAddressSaving(true);
    setAddressModalError(null);
    setAddressSuccess(null);

    try {
      const savedAddress = editingAddress
        ? await updateCustomerAddress(editingAddress.id, input)
        : await createCustomerAddress(input);

      setAddresses((current) => {
        const withoutOld = current.filter((address) => address.id !== savedAddress.id);
        const next = [savedAddress, ...withoutOld];
        return savedAddress.isDefault
          ? next.map((address) => ({
              ...address,
              isDefault: address.id === savedAddress.id,
            }))
          : next;
      });

      setAddressSuccess(editingAddress ? 'Address updated.' : 'Address added.');
      setAddressModalOpen(false);
      setEditingAddress(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not save address.';
      setAddressModalError(errorMsg);
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setSession(null);
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign out.';
      setSignOutError(errorMsg);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
        <h1 className="text-3xl md:text-5xl font-heading tracking-tight mb-16 border-b border-border pb-8">
          My Profile
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <aside className="col-span-1 space-y-4">
            <Link href="/profile" className="block text-accent-gold font-medium">Dashboard</Link>
            <Link href="/orders" className="block text-text-secondary hover:text-text-primary transition-colors">Order History</Link>
            <Link href="/preorders" className="block text-text-secondary hover:text-text-primary transition-colors">My Preorders</Link>
            <Link href="/wishlist" className="block text-text-secondary hover:text-text-primary transition-colors">Wishlist</Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="block text-text-secondary hover:text-red-500 transition-colors mt-8 pt-8 border-t border-border w-full text-left disabled:opacity-50"
            >
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            {signOutError ? <p className="text-sm text-red-500">{signOutError}</p> : null}
          </aside>

          <section className="col-span-1 md:col-span-3 space-y-12">
            <div className="bg-card p-8 border border-border">
              <h2 className="text-2xl font-heading mb-6">Account Details</h2>
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {profileError ? <p className="text-sm text-red-500">{profileError}</p> : null}
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Full Name</label>
                    <input
                      type="text"
                      value={draftFullName}
                      onChange={(e) => setDraftFullName(e.target.value)}
                      autoComplete="name"
                      required
                      className="w-full bg-transparent border border-border px-4 py-3 outline-none focus:border-accent-gold transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Email</label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full bg-transparent border border-border px-4 py-3 text-text-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Phone Number</label>
                    <input
                      type="tel"
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                      autoComplete="tel"
                      required
                      className="w-full bg-transparent border border-border px-4 py-3 outline-none focus:border-accent-gold transition-colors"
                    />
                  </div>
                  <div>
                    <span className="text-text-secondary w-32 inline-block text-sm">Login Method:</span>
                    <span className="text-sm">Email OTP</span>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileLoading || !draftFullName.trim() || !draftPhone.trim()}
                      className="border border-border px-6 py-3 text-sm font-medium hover:bg-text-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {profileLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditProfile}
                      disabled={profileLoading}
                      className="border border-border px-6 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {profileSuccess ? <p className="mb-4 text-sm text-green-500">{profileSuccess}</p> : null}
                  {profileError ? <p className="mb-4 text-sm text-red-500">{profileError}</p> : null}
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-text-secondary w-32 inline-block">Name:</span>
                      <span>{fullName || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary w-32 inline-block">Email:</span>
                      <span>{user.email || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary w-32 inline-block">Phone:</span>
                      <span>{phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary w-32 inline-block">Login Method:</span>
                      <span>Email OTP</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartEditProfile}
                    className="mt-8 border border-border px-6 py-3 text-sm font-medium hover:bg-text-primary hover:text-primary transition-colors"
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>

            <div className="bg-card p-8 border border-border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-heading">Saved Addresses</h2>
                  <p className="text-sm text-text-secondary mt-2">
                    Use the same address book on checkout for faster ordering.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddAddress}
                  className="border border-border px-6 py-3 text-sm font-medium hover:bg-text-primary hover:text-primary transition-colors"
                >
                  Add Address +
                </button>
              </div>

              {addressSuccess ? <p className="mb-4 text-sm text-green-500">{addressSuccess}</p> : null}
              {addressesError ? <p className="mb-4 text-sm text-red-500">{addressesError}</p> : null}

              {addressesLoading ? (
                <p className="text-text-secondary text-sm">Loading saved addresses...</p>
              ) : addresses.length === 0 ? (
                <p className="text-text-secondary text-sm">You have no saved addresses yet.</p>
              ) : (
                <div className="grid gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="border border-border p-5 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold">{address.fullName}</p>
                            {address.isDefault ? (
                              <span className="text-[10px] uppercase tracking-[0.25em] text-accent-gold">Default</span>
                            ) : null}
                          </div>
                          <p>{address.phone}</p>
                          <p>{address.addressLine}</p>
                          <p>{address.city}, {address.state} {address.pincode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditAddress(address)}
                          className="border border-border px-4 py-2 text-xs uppercase tracking-widest hover:bg-text-primary hover:text-primary transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <AddressModal
        isOpen={addressModalOpen}
        onClose={closeAddressModal}
        onSave={handleSaveAddress}
        initialAddress={editingAddress}
        loading={addressSaving}
        error={addressModalError}
      />
    </>
  );
}
