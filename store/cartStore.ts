import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { getOrCreateCustomer } from '@/lib/api/customer';
import type { User } from '@supabase/supabase-js';

export type CartItem = {
  id: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  image?: string;
  variantId?: string;
  variantLabel?: string;
};

const calculateTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const getCartItemKey = (id: string, variantId?: string) => `${id}::${variantId || 'default'}`;

function normalizeCartItem(item: CartItem & { variant?: string }): CartItem {
  return {
    ...item,
    variantId: item.variantId ?? item.variant,
  };
}

type PersistedCartState = {
  items?: Array<CartItem & { variant?: string }>;
};

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  syncCart: (user: User) => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addItem: (item) => set((state) => {
        const normalizedItem = normalizeCartItem(item as CartItem & { variant?: string });
        const itemKey = getCartItemKey(normalizedItem.id, normalizedItem.variantId);
        const existing = state.items.find((i) => getCartItemKey(i.id, i.variantId) === itemKey);
        const availableStock = normalizedItem.stock ?? existing?.stock;

        if (availableStock !== undefined && availableStock <= 0) {
          return state;
        }

        const newItems = existing
          ? state.items.map((i) =>
              getCartItemKey(i.id, i.variantId) === itemKey
                ? { ...i, quantity: Math.min(i.quantity + normalizedItem.quantity, availableStock ?? i.quantity + normalizedItem.quantity), stock: availableStock ?? i.stock }
                : i
            )
          : [...state.items, { ...normalizedItem, stock: availableStock }];
        return { items: newItems, total: calculateTotal(newItems) };
      }),
      removeItem: (id, variantId) => set((state) => {
        const itemKey = getCartItemKey(id, variantId);
        const newItems = state.items.filter((i) => getCartItemKey(i.id, i.variantId) !== itemKey);
        return { items: newItems, total: calculateTotal(newItems) };
      }),
      updateQuantity: (id, variantId, quantity) => set((state) => {
        const itemKey = getCartItemKey(id, variantId);
        const current = state.items.find((i) => getCartItemKey(i.id, i.variantId) === itemKey);
        const cappedQuantity = current?.stock !== undefined ? Math.min(quantity, current.stock) : quantity;
        const newItems = cappedQuantity > 0
          ? state.items.map((i) => getCartItemKey(i.id, i.variantId) === itemKey ? { ...i, quantity: cappedQuantity } : i)
          : state.items.filter((i) => getCartItemKey(i.id, i.variantId) !== itemKey);
        return { items: newItems, total: calculateTotal(newItems) };
      }),
      clearCart: () => set({ items: [], total: 0 }),
      syncCart: async (user: User) => {
        const state = get();
        if (state.items.length === 0) return;

        const customerId = await getOrCreateCustomer(user);
        if (!customerId) return;
        
        // Very simple one-way sync: push local items to DB.
        // In a complex app, you'd fetch DB items and merge.
        const dbItems = state.items.map(i => ({
          customer_id: customerId,
          variant_id: i.variantId || null,
          quantity: i.quantity
        }));
        
        const { error } = await supabase.from('cart_items').upsert(dbItems);
        if (error) console.error('Failed to sync cart:', error);
      }
    }),
    {
      name: 'cart-storage',
      merge: (persistedState: unknown, currentState) => {
        const state = (persistedState || {}) as PersistedCartState;
        const items = (state.items || []).map((item) => normalizeCartItem(item));
        return {
          ...currentState,
          ...state,
          items,
          total: calculateTotal(items)
        };
      }
    }
  )
);
