"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";

/**
 * Wishlist state, backed by the `favorites` table so it follows the customer across
 * devices. Only the set of favourited product ids is held here; the dashboard's wishlist tab
 * fetches the full product records for display.
 */

type WishlistContextType = {
  ids: number[];
  count: number;
  ready: boolean;
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (productId: number) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType>({
  ids: [],
  count: 0,
  ready: false,
  isFavorite: () => false,
  toggleFavorite: async () => false,
  refresh: async () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds([]);
      setReady(true);
      return;
    }
    try {
      const res = await fetch("/api/favorites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load wishlist");
      const data = await res.json();
      setIds((data.favorites || []).map((f: any) => Number(f.id)).filter(Boolean));
    } catch {
      // Leave the previous state in place; the heart simply stays unfilled.
    } finally {
      setReady(true);
    }
  }, [user]);

  // Reload whenever the signed-in user changes, so switching accounts swaps the wishlist.
  useEffect(() => {
    if (authLoading) return;
    setReady(false);
    refresh();
  }, [authLoading, refresh]);

  const isFavorite = useCallback(
    (productId: number) => ids.includes(productId),
    [ids]
  );

  const toggleFavorite = useCallback(
    async (productId: number) => {
      if (!user) return false;

      // Optimistic flip, reverted if the request fails.
      const wasFavorite = ids.includes(productId);
      setIds((prev) =>
        wasFavorite ? prev.filter((id) => id !== productId) : [...prev, productId]
      );

      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId, favorited: !wasFavorite }),
        });
        if (!res.ok) throw new Error("Failed to update wishlist");
        return !wasFavorite;
      } catch {
        setIds((prev) =>
          wasFavorite ? [...prev, productId] : prev.filter((id) => id !== productId)
        );
        return wasFavorite;
      }
    },
    [ids, user]
  );

  const value = useMemo<WishlistContextType>(
    () => ({ ids, count: ids.length, ready, isFavorite, toggleFavorite, refresh }),
    [ids, ready, isFavorite, toggleFavorite, refresh]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
