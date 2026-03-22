'use client';

import { useCartStore } from '@/store/cartStore';
import { useUserStore } from '@/store/userStore';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, Lock, Tag } from 'lucide-react';
import { AddressModal } from '@/components/modals/AddressModal';
import { CouponModal } from '@/components/modals/CouponModal';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { createCustomerAddress, getCustomerAddresses, updateCustomerAddress } from '@/lib/api/customer-addresses';
import type { CustomerAddress, CustomerAddressInput } from '@/lib/customer-addresses';
import { splitAddressFullName } from '@/lib/customer-addresses';
import { getCustomerProfileState } from '@/lib/api/customer';
import { INDIA_STATES } from '@/lib/india-states';
import {
  calculateShippingCharge,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  type ShippingSettings,
} from '@/lib/shipping';

interface CheckoutResponse {
  error?: string;
  orderId: string;
  razorpayOrderId?: string | null;
  amount: number;
  razorpayKeyId: string | null;
}

interface VerifyPaymentResponse {
  error?: string;
  success?: boolean;
}

interface CheckoutStatusResponse {
  error?: string;
  success?: boolean;
}

interface CheckoutConfigResponse {
  paymentsEnabled?: boolean;
  shippingSettings?: Partial<ShippingSettings> | null;
}

type CheckoutNotice = {
  text: string;
  tone: 'error' | 'success' | 'info';
};

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

interface RazorpayCheckoutOptions {
  key: string | null;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss: () => void;
  };
}

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void | Promise<void>) => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function hasMultipleNameParts(value: string) {
  return normalizeFullName(value).split(' ').filter(Boolean).length > 1;
}

function getEffectiveAddressName(addressFullName: string, profileFullName: string) {
  const normalizedAddressName = normalizeFullName(addressFullName);
  const normalizedProfileName = normalizeFullName(profileFullName);

  if (normalizedAddressName && (hasMultipleNameParts(normalizedAddressName) || !hasMultipleNameParts(normalizedProfileName))) {
    return normalizedAddressName;
  }

  return normalizedProfileName || normalizedAddressName;
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const { user } = useUserStore();
  const router = useRouter();
  
  const [step, setStep] = useState<'contact' | 'shipping' | 'payment'>('contact');
  const [loading, setLoading] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [checkoutConfigLoaded, setCheckoutConfigLoaded] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  
  const [isCouponModalOpen, setCouponModalOpen] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{ amount: number; code: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false);
  const [savedAddressesError, setSavedAddressesError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState('');
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    pincode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const applyAddressToForm = useCallback((address: CustomerAddress) => {
    const effectiveFullName = getEffectiveAddressName(address.fullName, profileFullName);
    const { firstName, lastName } = splitAddressFullName(effectiveFullName);

    setSelectedAddressId(address.id);
    setFormData((current) => ({
      ...current,
      email: user?.email || current.email,
      phone: address.phone || current.phone,
      firstName,
      lastName,
      address: address.addressLine,
      apartment: address.apartment || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    }));
  }, [profileFullName, user?.email]);

  useEffect(() => {
    async function loadCheckoutConfig() {
      try {
        const response = await fetch('/api/checkout/config', { cache: 'no-store' });
        const payload = await response.json() as CheckoutConfigResponse;
        setPaymentsEnabled(Boolean(payload.paymentsEnabled));
        setShippingSettings(normalizeShippingSettings(payload.shippingSettings));
      } catch (error) {
        console.error('Could not load checkout config', error);
        setPaymentsEnabled(false);
        setShippingSettings(DEFAULT_SHIPPING_SETTINGS);
      } finally {
        setCheckoutConfigLoaded(true);
      }
    }

    loadCheckoutConfig();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAddressBook = async () => {
      if (!user) {
        setSavedAddresses([]);
        setSelectedAddressId(null);
        setSavedAddressesError(null);
        return;
      }

      setSavedAddressesLoading(true);
      setSavedAddressesError(null);

      try {
        const [profile, addresses] = await Promise.all([
          getCustomerProfileState(user),
          getCustomerAddresses(),
        ]);

        if (cancelled) return;

        setProfileFullName(profile.fullName);
        setFormData((current) => ({
          ...current,
          email: user.email || current.email,
          phone: current.phone || profile.phone,
          firstName: current.firstName || splitAddressFullName(profile.fullName).firstName,
          lastName: current.lastName || splitAddressFullName(profile.fullName).lastName,
        }));

        setSavedAddresses(addresses);

        const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0];
        if (defaultAddress) {
          applyAddressToForm(defaultAddress);
        }
      } catch (err: unknown) {
        if (cancelled) return;

        const errorMsg = err instanceof Error ? err.message : 'Could not load saved addresses.';
        setSavedAddressesError(errorMsg);
      } finally {
        if (!cancelled) {
          setSavedAddressesLoading(false);
        }
      }
    };

    void loadAddressBook();

    return () => {
      cancelled = true;
    };
  }, [applyAddressToForm, user]);

  const routeToOrders = (
    orderId: string,
    status: 'pending' | 'failed' | 'paid',
    message?: string
  ) => {
    const params = new URLSearchParams({ orderId, status });
    if (message) {
      params.set('message', message);
    }
    router.push(`/orders?${params.toString()}`);
  };

  const isPaymentUnavailable = checkoutConfigLoaded && !paymentsEnabled;
  const shippingCost =
    calculateShippingCharge({
      subtotal: total,
      discount: appliedDiscount?.amount || 0,
      state: formData.state,
      settings: shippingSettings,
    }) ?? 0;
  const isContactStepValid = Boolean(
    formData.email &&
      formData.phone &&
      formData.firstName &&
      formData.lastName &&
      formData.address &&
      formData.city &&
      formData.state &&
      formData.pincode
  );

  const openAddAddressModal = () => {
    setEditingAddress(null);
    setAddressModalError(null);
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (address: CustomerAddress) => {
    setEditingAddress({
      ...address,
      fullName: getEffectiveAddressName(address.fullName, profileFullName),
    });
    setAddressModalError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (input: CustomerAddressInput) => {
    setAddressSaving(true);
    setAddressModalError(null);

    try {
      const savedAddress = editingAddress
        ? await updateCustomerAddress(editingAddress.id, input)
        : await createCustomerAddress(input);

      setSavedAddresses((current) => {
        const withoutOld = current.filter((address) => address.id !== savedAddress.id);
        const next = [savedAddress, ...withoutOld];
        return savedAddress.isDefault
          ? next.map((address) => ({
              ...address,
              isDefault: address.id === savedAddress.id,
            }))
          : next;
      });

      applyAddressToForm(savedAddress);
      setIsAddressModalOpen(false);
      setEditingAddress(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not save address.';
      setAddressModalError(errorMsg);
    } finally {
      setAddressSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!paymentsEnabled) {
      setCheckoutNotice({
        tone: 'error',
        text: 'Online payments are temporarily unavailable. Please try again later.',
      });
      return;
    }

    setLoading(true);
    setCheckoutNotice(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            userId: user?.id,
            guestEmail: formData.email,
            guestName: `${formData.firstName} ${formData.lastName}`.trim(),
            guestPhone: formData.phone,
            address: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              addressLine: formData.address,
              apartment: formData.apartment,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode
            },
            shippingCharge: shippingCost,
            discountAmount: appliedDiscount?.amount,
            couponCode: appliedDiscount?.code,
          },
          items,
          subtotal: total
        })
      });

      const resData = await response.json() as CheckoutResponse;
      if (!response.ok) {
         throw new Error(resData.error || 'Server processing failed');
      }

      if (!resData.razorpayOrderId) {
        throw new Error('Payment session could not be created.');
      }

      let checkoutTerminalStateHandled = false;

      const handleVerificationFailure = async (orderId: string, razorpayOrderId: string, message: string) => {
        if (checkoutTerminalStateHandled) return;
        checkoutTerminalStateHandled = true;

        try {
          const statusResponse = await fetch('/api/checkout/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              amount: resData.amount / 100,
              razorpayOrderId,
              status: 'failed',
            }),
          });

          const statusData = await statusResponse.json() as CheckoutStatusResponse;
          if (!statusResponse.ok) {
            throw new Error(statusData.error || 'Could not update payment status.');
          }
        } catch (statusError) {
          console.error(statusError);
        }

        routeToOrders(orderId, 'failed', message);
      };

      const options: RazorpayCheckoutOptions = {
        key: resData.razorpayKeyId,
        amount: resData.amount,
        currency: "INR",
        name: "Cluster Fascination",
        description: "Premium Order",
        order_id: resData.razorpayOrderId,
        handler: async function (paymentResponse) {
          try {
            const verifyResponse = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: resData.orderId,
                amount: resData.amount / 100,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json() as VerifyPaymentResponse;
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            checkoutTerminalStateHandled = true;
            clearCart();
            routeToOrders(resData.orderId, 'paid');
          } catch (verificationError) {
            console.error(verificationError);
            await handleVerificationFailure(
              resData.orderId,
              paymentResponse.razorpay_order_id,
              verificationError instanceof Error ? verificationError.message : 'Payment verification failed.'
            );
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#C9A96E"
        },
        modal: {
          ondismiss: () => {
            if (checkoutTerminalStateHandled) return;
            checkoutTerminalStateHandled = true;
            routeToOrders(resData.orderId, 'pending');
          },
        }
      };
      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayCtor) {
        throw new Error('Razorpay SDK failed to load.');
      }
      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', async (failureResponse) => {
        const failureMessage = failureResponse.error?.description || 'Payment failed.';
        const failureOrderId = failureResponse.error?.metadata?.order_id || resData.razorpayOrderId || '';
        await handleVerificationFailure(resData.orderId, failureOrderId, failureMessage);
      });
      rzp.open();
    } catch (err: unknown) {
      console.error(err);
      setCheckoutNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Order failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center">
        <h1 className="text-3xl font-heading mb-6">Your Cart is Empty</h1>
        <Link href="/category" className="bg-text-primary text-primary px-6 py-3 text-sm font-medium hover:bg-accent-gold transition-colors">
          Return to Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 min-h-screen">
      <Link href="/cart" className="flex items-center gap-2 text-text-secondary hover:text-accent-gold transition-colors mb-8 text-sm uppercase tracking-widest font-medium">
        <ArrowLeft className="w-4 h-4" /> Return to Cart
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        {/* Checkout Flow */}
        <div className="space-y-12">
          {checkoutNotice && (
            <NoticeBanner
              tone={checkoutNotice.tone}
              onDismiss={() => setCheckoutNotice(null)}
            >
              {checkoutNotice.text}
            </NoticeBanner>
          )}

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-4 text-xs font-medium tracking-widest uppercase">
            <button 
              onClick={() => setStep('contact')}
              className={`${step === 'contact' ? 'text-accent-gold font-bold' : 'text-text-secondary'} hover:text-text-primary`}
            >
              Contact
            </button>
            <span className="text-border">/</span>
            <button 
              disabled={step === 'contact'}
              onClick={() => setStep('shipping')}
              className={`${step === 'shipping' ? 'text-accent-gold font-bold' : 'text-text-secondary'} ${step === 'contact' ? 'opacity-50 cursor-not-allowed' : 'hover:text-text-primary'}`}
            >
              Shipping
            </button>
            <span className="text-border">/</span>
            <button 
              disabled={step !== 'payment'}
              className={`${step === 'payment' ? 'text-accent-gold font-bold' : 'text-text-secondary'} ${step !== 'payment' ? 'opacity-50 cursor-not-allowed' : 'hover:text-text-primary'}`}
            >
              Payment
            </button>
          </nav>

          {/* Contact Step */}
          {step === 'contact' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-sm">
              <h2 className="text-2xl font-heading mb-6">Contact Information</h2>
              
              {!user && (
                <div className="mb-6 p-4 border border-border bg-card">
                  <p className="text-text-secondary mb-4">Already have an account?</p>
                  <Link href="/auth?redirect=/checkout" className="text-text-primary underline underline-offset-4 hover:text-accent-gold transition-colors">
                    Log in for faster checkout
                  </Link>
                </div>
              )}

              <input 
                name="email" value={formData.email} onChange={handleChange}
                type="email" placeholder="Email Address" 
                className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50"
              />
              <input 
                name="phone" value={formData.phone} onChange={handleChange}
                type="tel" placeholder="Phone Number" 
                className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50"
              />

              {user && (
                <div className="space-y-4 border border-border bg-card p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-heading">Saved Addresses</h3>
                      <p className="text-text-secondary text-sm mt-1">
                        Select an address, edit an existing one, or add a new address for this account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddAddressModal}
                      className="border border-border px-4 py-2 text-xs uppercase tracking-widest hover:bg-text-primary hover:text-primary transition-colors"
                    >
                      Add New
                    </button>
                  </div>

                  {savedAddressesError ? <p className="text-sm text-red-500">{savedAddressesError}</p> : null}

                  {savedAddressesLoading ? (
                    <p className="text-text-secondary">Loading saved addresses...</p>
                  ) : savedAddresses.length === 0 ? (
                    <p className="text-text-secondary">No saved addresses yet. Add one to speed up future checkouts.</p>
                  ) : (
                    <div className="grid gap-3">
                      {savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`border p-4 transition-colors ${
                            selectedAddressId === address.id ? 'border-accent-gold bg-primary/40' : 'border-border'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <button
                              type="button"
                              onClick={() => applyAddressToForm(address)}
                              className="text-left flex-1"
                            >
                              <div className="flex items-center gap-3">
                                <p className="font-medium">
                                  {getEffectiveAddressName(address.fullName, profileFullName)}
                                </p>
                                {address.isDefault ? (
                                  <span className="text-[10px] uppercase tracking-[0.25em] text-accent-gold">Default</span>
                                ) : null}
                              </div>
                              <p className="text-text-secondary mt-1">{address.phone}</p>
                              <p className="mt-1">{address.addressLine}</p>
                              <p className="text-text-secondary">{address.city}, {address.state} {address.pincode}</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditAddressModal(address)}
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
              )}
              
              <h2 className="text-2xl font-heading mb-6 mt-12">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="col-span-1 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="col-span-1 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="col-span-2 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
                <input name="apartment" value={formData.apartment} onChange={handleChange} placeholder="Apartment, suite, etc. (optional)" className="col-span-2 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
                <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="col-span-2 md:col-span-1 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
                <select
                  name="state"
                  value={formData.state}
                  onChange={(event) => setFormData((current) => ({ ...current, state: event.target.value }))}
                  className="col-span-2 md:col-span-1 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary"
                >
                  <option value="" className="bg-card text-text-secondary">Select State</option>
                  {INDIA_STATES.map((state) => (
                    <option key={state} value={state} className="bg-card text-text-primary">
                      {state}
                    </option>
                  ))}
                </select>
                <input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Postal Code" className="col-span-2 bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary placeholder:text-text-secondary/50" />
              </div>

              <button 
                onClick={() => setStep('shipping')}
                disabled={!isContactStepValid}
                className="w-full mt-8 bg-text-primary text-primary py-4 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98] disabled:opacity-50"
              >
                Continue to Shipping
              </button>
            </div>
          )}

          {/* Shipping Step */}
          {step === 'shipping' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-sm">
              <h2 className="text-2xl font-heading mb-6">Delivery Charge</h2>

              <div className="border border-border bg-card p-6 space-y-4">
                <div className="flex justify-between gap-4">
                  <span>Orders of ₹{shippingSettings.freeShippingThreshold} and above</span>
                  <span className="font-bold text-accent-gold">FREE</span>
                </div>
                <div className="flex justify-between gap-4 text-text-secondary">
                  <span>Kerala orders below ₹{shippingSettings.freeShippingThreshold}</span>
                  <span>₹{shippingSettings.keralaShippingCharge}</span>
                </div>
                <div className="flex justify-between gap-4 text-text-secondary">
                  <span>Other states below ₹{shippingSettings.freeShippingThreshold}</span>
                  <span>₹{shippingSettings.otherStatesShippingCharge}</span>
                </div>
              </div>

              <div className="border border-accent-gold bg-card p-6">
                <div className="flex justify-between gap-4 text-base">
                  <span>
                    Current delivery charge
                    <span className="block text-sm text-text-secondary mt-1">
                      {formData.state
                        ? `Shipping to ${formData.state}`
                        : 'Set your state in the contact step to confirm the delivery charge'}
                    </span>
                  </span>
                  <span className="font-bold text-accent-gold">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setStep('payment')}
                className="w-full mt-8 bg-text-primary text-primary py-4 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98]"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-sm">
              <h2 className="text-2xl font-heading mb-6">Payment</h2>
              <p className="text-text-secondary mb-6 flex items-center gap-2">
                <Lock className="w-4 h-4" /> All transactions are secure and encrypted.
              </p>

              {isPaymentUnavailable && (
                <NoticeBanner tone="error">
                  Online payments are temporarily unavailable. Please try again later.
                </NoticeBanner>
              )}
              
              <div className="border border-border bg-card p-6">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-heading text-lg">Razorpay Secure</span>
                  </div>
                  <p className="text-center text-text-secondary text-xs max-w-sm mx-auto">
                    {isPaymentUnavailable
                      ? 'Checkout is disabled until the payment gateway is available again.'
                      : 'After clicking "Pay Now", you will be securely redirected to Razorpay to complete your purchase using Cards, UPI, Netbanking, or Wallets.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={loading || !checkoutConfigLoaded || !paymentsEnabled}
                className="w-full mt-8 bg-accent-mint text-primary py-4 font-bold tracking-widest uppercase transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing...' : !checkoutConfigLoaded ? 'Checking Payment...' : !paymentsEnabled ? 'Payments Unavailable' : 'Pay Now'}
              </button>
            </div>
          )}
        </div>

        {/* Order Summary Lateral */}
        <div className="bg-card p-8 h-max sticky top-32 border border-border">
          <h2 className="text-xl font-heading mb-6 border-b border-border pb-6">Order Summary</h2>
          <div className="space-y-4 max-h-[40vh] overflow-y-auto w-full pr-4 mb-6">
            {items.map(item => (
              <div key={`${item.id}-${item.variantId || 'default'}`} className="flex justify-between items-center gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-border text-xs rounded-full">{item.quantity}</span>
                  <div className="min-w-0">
                    <span className="line-clamp-1 block">{item.name}</span>
                    {item.variantLabel && (
                      <span className="text-xs text-text-secondary line-clamp-1 block">{item.variantLabel}</span>
                    )}
                  </div>
                </div>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-6 space-y-3 text-sm mb-6">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            
            {appliedDiscount && (
              <div className="flex justify-between text-accent-mint">
                <span>Discount ({appliedDiscount.code})</span>
                <span>-₹{appliedDiscount.amount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-text-secondary">
              <span>Shipping</span>
              <span>
                {formData.state
                  ? shippingCost === 0
                    ? 'FREE'
                    : `₹${shippingCost.toFixed(2)}`
                  : `Enter state to calculate`}
              </span>
            </div>
            
            {!appliedDiscount && (
              <button 
                onClick={() => setCouponModalOpen(true)}
                className="mt-4 flex items-center gap-2 text-accent-gold transition-colors hover:text-text-primary"
              >
                <Tag className="w-4 h-4" /> Apply Coupon
              </button>
            )}
          </div>
          
          <div className="flex justify-between items-center text-xl font-heading pt-6 border-t border-border">
            <span>Total</span>
            <span className="text-accent-gold">₹{Math.max(0, total - (appliedDiscount?.amount || 0) + shippingCost).toFixed(2)}</span>
          </div>

          <div className="mt-8 pt-6 border-t border-border space-y-4">
            <div className="flex items-center gap-3 text-text-secondary">
              <Lock className="w-4 h-4 text-accent-mint" />
              <span className="text-xs tracking-wide">Secure 256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <svg className="w-4 h-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs tracking-wide">Satisfaction Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      <CouponModal 
        isOpen={isCouponModalOpen} 
        onClose={() => setCouponModalOpen(false)} 
        cartTotal={total}
        onApply={(amount, code) => setAppliedDiscount({ amount, code })}
      />

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          if (addressSaving) return;
          setIsAddressModalOpen(false);
          setEditingAddress(null);
          setAddressModalError(null);
        }}
        onSave={handleSaveAddress}
        initialAddress={editingAddress}
        loading={addressSaving}
        error={addressModalError}
      />
      
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </main>
  );
}
