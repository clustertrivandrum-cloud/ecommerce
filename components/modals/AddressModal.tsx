'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { CustomerAddress, CustomerAddressInput } from '@/lib/customer-addresses';
import { INDIA_STATES } from '@/lib/india-states';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: CustomerAddressInput) => Promise<void> | void;
  initialAddress?: CustomerAddress | null;
  loading?: boolean;
  error?: string | null;
}

const emptyAddress: CustomerAddressInput = {
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

function getInitialFormData(initialAddress?: CustomerAddress | null): CustomerAddressInput {
  return initialAddress
    ? {
        fullName: initialAddress.fullName,
        phone: initialAddress.phone,
        addressLine: initialAddress.addressLine,
        city: initialAddress.city,
        state: initialAddress.state,
        pincode: initialAddress.pincode,
        isDefault: initialAddress.isDefault,
      }
    : emptyAddress;
}

function AddressModalForm({
  onClose,
  onSave,
  initialAddress,
  loading,
  error,
}: Omit<AddressModalProps, 'isOpen'>) {
  const [formData, setFormData] = useState<CustomerAddressInput>(() => getInitialFormData(initialAddress));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="w-full max-w-2xl bg-card border border-border flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-xl font-heading tracking-widest uppercase">
          {initialAddress ? 'Edit Address' : 'Add New Address'}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-primary transition-colors" disabled={loading}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm overflow-y-auto">
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />
          <input
            required
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />
        </div>

        <input
          required
          placeholder="Address Line"
          value={formData.addressLine}
          onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
          className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            required
            placeholder="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />
          <select
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors text-text-primary"
          >
            <option value="" className="bg-card text-text-secondary">Select State</option>
            {INDIA_STATES.map((state) => (
              <option key={state} value={state} className="bg-card text-text-primary">
                {state}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Pincode / ZIP"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50"
          />
        </div>

        <label className="flex items-center gap-3 text-text-secondary">
          <input
            type="checkbox"
            checked={Boolean(formData.isDefault)}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="h-4 w-4 border-border bg-transparent"
          />
          <span>Set as default address</span>
        </label>

        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-text-primary text-primary py-4 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialAddress ? 'Update Address' : 'Save Address'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-border py-4 font-bold tracking-widest uppercase transition-colors hover:bg-primary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress,
  loading = false,
  error = null,
}: AddressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm animate-in fade-in px-4">
      <AddressModalForm
        key={initialAddress?.id ?? 'new-address'}
        onClose={onClose}
        onSave={onSave}
        initialAddress={initialAddress}
        loading={loading}
        error={error}
      />
    </div>
  );
}
