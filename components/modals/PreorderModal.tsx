'use client';

import { X, Clock } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
    expectedDate?: string;
  };
  onConfirm: (details: { email: string; name: string; phone: string }) => Promise<void>;
  error?: string | null;
  defaultEmail?: string;
  defaultName?: string;
  defaultPhone?: string;
  loading?: boolean;
}

export function PreorderModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  error,
  defaultEmail,
  defaultName,
  defaultPhone,
  loading = false,
}: PreorderModalProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [name, setName] = useState(defaultName || '');
  const [phone, setPhone] = useState(defaultPhone || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({ email, name, phone });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-gold" />
            <h2 className="text-xl font-heading tracking-widest uppercase">Reserve Preorder</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary transition-colors -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative w-20 h-28 bg-border">
             <Image src={product.image || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&q=80'} alt={product.name} fill className="object-cover" />
          </div>
          <div>
            <h3 className="font-heading text-lg">{product.name}</h3>
            <p className="text-text-secondary">₹{product.price.toFixed(2)}</p>
            <p className="text-sm mt-2 text-accent-gold">Expected Shipping: {product.expectedDate || 'Late next month'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-2">
          <p className="text-text-secondary leading-relaxed mb-4">
            This item is currently out of stock but available for preorder. Secure yours now by reserving. We will notify you when it&apos;s ready to ship.
          </p>

          {error && (
            <NoticeBanner tone="error">
              {error}
            </NoticeBanner>
          )}
          
          <input
            required
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />

          <input
            required
            type="email"
            placeholder="Enter your email to reserve"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />

          <input
            required
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={loading}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />
          
          <button
            type="submit"
            disabled={!name || !email || !phone || loading}
            className="w-full bg-accent-gold text-primary py-4 font-bold tracking-widest uppercase transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Reserving...' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
}
