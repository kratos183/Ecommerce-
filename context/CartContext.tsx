"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

/**
 * Shopping cart, persisted to localStorage.
 *
 * The cart deliberately lives on the client rather than in a `cart_items` table: it must
 * work for signed-out visitors, and the durable record of a purchase is the order row
 * created at checkout. Server-side prices are always re-resolved when an order is placed,
 * so a stale local price can never become the amount charged.
 */

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  /** False until localStorage has been read, to avoid rendering a wrong badge on first paint. */
  ready: boolean;
  count: number;
  subtotal: number;
  /**
   * A single item bought via "Buy now". Kept separate from the cart so it can be cleared
   * without touching the customer's saved basket, and is never persisted.
   */
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  clearBuyNowItem: () => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

/**
 * Bump the suffix when the shape of a stored cart changes, or stale carts from a
 * previous version will fail to parse into the new shape.
 *
 * NOTE: this key changed from "nitecore.cart.v1" during the Obryn rebrand, which
 * discards carts saved under the old name. Anyone mid-shopping lost their basket;
 * changing it back would restore theirs but keep the old brand in the code.
 */
const STORAGE_KEY = "obryn.cart.v1";
const MAX_QTY = 99;

const CartContext = createContext<CartContextType>({
  items: [],
  ready: false,
  count: 0,
  subtotal: 0,
  buyNowItem: null,
  setBuyNowItem: () => {},
  clearBuyNowItem: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null>(null);

  // Read persisted cart after mount so server and client markup match on first render.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter(
                (i): i is CartItem =>
                  i && typeof i.productId === "number" && typeof i.quantity === "number"
              )
              .map((i) => ({
                ...i,
                name: String(i.name ?? "Product"),
                slug: String(i.slug ?? ""),
                price: Number(i.price) || 0,
                quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(i.quantity) || 1)),
              }))
          );
        }
      }
    } catch {
      // Corrupt or unavailable storage: start with an empty cart rather than crashing.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota or private-mode failure: the cart still works for this session.
    }
  }, [items, ready]);

  const addItem = useCallback(
    (incoming: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const quantity = Math.min(MAX_QTY, Math.max(1, Math.floor(incoming.quantity ?? 1)));
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === incoming.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === incoming.productId
              ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity), price: incoming.price }
              : i
          );
        }
        return [...prev, { ...incoming, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.productId !== productId) return [i];
        const next = Math.floor(quantity);
        // A quantity of 0 or less removes the line entirely.
        if (!Number.isFinite(next) || next < 1) return [];
        return [{ ...i, quantity: Math.min(MAX_QTY, next) }];
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const setBuyNowItem = useCallback(
    (incoming: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setBuyNowItemState({
        ...incoming,
        quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(incoming.quantity ?? 1))),
      });
    },
    []
  );

  const clearBuyNowItem = useCallback(() => setBuyNowItemState(null), []);

  const value = useMemo<CartContextType>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      ready,
      count,
      subtotal,
      buyNowItem,
      setBuyNowItem,
      clearBuyNowItem,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, ready, buyNowItem, setBuyNowItem, clearBuyNowItem, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
