"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  User,
  Settings,
  LogOut,
  Menu,
  Package,
  CreditCard,
  MapPin,
  Trash2,
  Plus,
  Minus,
  Check,
  AlertCircle,
  ExternalLink,
  Truck,
  Loader2,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { SITE, whatsappLink } from "@/lib/site";
import ChatPanel from "@/app/components/chat/ChatPanel";

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type Order = {
  id: number;
  order_no: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  contact_name: string;
  contact_phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
};

type Address = {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: number;
};

type WishlistProduct = {
  id: number;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  image_url: string | null;
};

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ══════════════════════════════════════════════════════════════════ */

const FREE_SHIPPING_ABOVE = 25000;
const SHIPPING_FLAT = 499;

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "My Orders", icon: ShoppingBag },
  { id: "cart", label: "Cart", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "assistant", label: "Ask Ecommerce", icon: Sparkles },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_TITLES: Record<TabId, string> = {
  overview: "Account Overview",
  orders: "My Orders",
  cart: "Shopping Cart",
  wishlist: "My Wishlist",
  assistant: "Ask Ecommerce",
  addresses: "Saved Addresses",
  profile: "Profile Details",
  settings: "Account Settings",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-violet-100 text-violet-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

/** Orders can only be called off while they have not left the warehouse. */
const CANCELLABLE: OrderStatus[] = ["pending", "processing"];

function formatINR(value: number | string) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name?: string | null) {
  const clean = (name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

/** Renders cart lines for the WhatsApp order summary. */
function summariseCartLines(items: Array<{ name: string; price: number; quantity: number }>) {
  return items.map((item) => `• ${item.name} — ${formatINR(item.price)} × ${item.quantity}`);
}

const EMPTY_ADDRESS = {
  id: 0,
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: 0,
};

/* ══════════════════════════════════════════════════════════════════
   SMALL PRESENTATIONAL PIECES
   ══════════════════════════════════════════════════════════════════ */

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
        <div>
          <h2 className="text-sm font-black tracking-tight text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all ${
        onClick ? "hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md" : ""
      }`}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xl font-black text-slate-900">{value}</span>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </span>
    </Tag>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{message}</p>;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500";

/* ══════════════════════════════════════════════════════════════════
   ADDRESS FORM
   ══════════════════════════════════════════════════════════════════ */

function AddressForm({
  value,
  errors,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  value: typeof EMPTY_ADDRESS;
  errors: Record<string, string>;
  onChange: (next: typeof EMPTY_ADDRESS) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const set = (patch: Partial<typeof EMPTY_ADDRESS>) => onChange({ ...value, ...patch });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="addr-label">
            Label
          </label>
          <select
            id="addr-label"
            className={inputClass}
            value={value.label}
            onChange={(e) => set({ label: e.target.value })}
          >
            {["Home", "Office", "School", "Other"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="addr-name">
            Full name
          </label>
          <input
            id="addr-name"
            className={inputClass}
            value={value.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="John Doe"
          />
          <FieldError message={errors.fullName} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="addr-phone">
          Phone number
        </label>
        <input
          id="addr-phone"
          className={inputClass}
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder={SITE.phoneDisplay}
          inputMode="tel"
        />
        <FieldError message={errors.phone} />
      </div>

      <div>
        <label className={labelClass} htmlFor="addr-line1">
          Address line 1
        </label>
        <input
          id="addr-line1"
          className={inputClass}
          value={value.line1}
          onChange={(e) => set({ line1: e.target.value })}
          placeholder="Flat / House no, Building, Street"
        />
        <FieldError message={errors.line1} />
      </div>

      <div>
        <label className={labelClass} htmlFor="addr-line2">
          Area, Landmark <span className="normal-case text-slate-400">(optional)</span>
        </label>
        <input
          id="addr-line2"
          className={inputClass}
          value={value.line2}
          onChange={(e) => set({ line2: e.target.value })}
          placeholder="Near By-Tigri Gol Chakkar"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="addr-city">
            City
          </label>
          <input
            id="addr-city"
            className={inputClass}
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder={SITE.city}
          />
          <FieldError message={errors.city} />
        </div>
        <div>
          <label className={labelClass} htmlFor="addr-state">
            State
          </label>
          <input
            id="addr-state"
            className={inputClass}
            value={value.state}
            onChange={(e) => set({ state: e.target.value })}
            placeholder={SITE.state}
          />
          <FieldError message={errors.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="addr-pincode">
            PIN code
          </label>
          <input
            id="addr-pincode"
            className={inputClass}
            value={value.pincode}
            onChange={(e) => set({ pincode: e.target.value })}
            placeholder="201009"
            inputMode="numeric"
          />
          <FieldError message={errors.pincode} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={value.isDefault === 1}
          onChange={(e) => set({ isDefault: e.target.checked ? 1 : 0 })}
          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
        />
        Use as my default delivery address
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════════ */

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const { items, count, subtotal, ready: cartReady, updateQuantity, removeItem, clearCart, addItem, setBuyNowItem } =
    useCart();
  const { refresh: refreshWishlist } = useWishlist();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);

  // Forms
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const [addressDraft, setAddressDraft] = useState<typeof EMPTY_ADDRESS | null>(null);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const showNotice = useCallback((tone: "ok" | "error", text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

  /* ── Auth guard ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ── Deep link: /user-dashboard?tab=orders ──────────────────── */
  useEffect(() => {
    const tab = searchParams.get("tab") as TabId | null;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  /* ── Seed the profile form once the user is known ───────────── */
  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", email: user.email || "" });
    }
  }, [user]);

  /* ── Data loaders ───────────────────────────────────────────── */
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      showNotice("error", "Could not load your orders. Please try again.");
    } finally {
      setOrdersLoading(false);
    }
  }, [showNotice]);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load addresses");
      const data = await res.json();
      const list: Address[] = data.addresses || [];
      setAddresses(list);
      setSelectedAddressId((current) => {
        if (current && list.some((a) => a.id === current)) return current;
        const preferred = list.find((a) => a.is_default === 1) || list[0];
        return preferred ? preferred.id : null;
      });
    } catch {
      showNotice("error", "Could not load your addresses.");
    } finally {
      setAddressesLoading(false);
    }
  }, [showNotice]);

  const loadWishlist = useCallback(async () => {
    setWishlistLoading(true);
    try {
      const res = await fetch("/api/favorites", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load wishlist");
      const data = await res.json();
      setWishlist(data.favorites || []);
    } catch {
      showNotice("error", "Could not load your wishlist.");
    } finally {
      setWishlistLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    if (!user) return;
    loadOrders();
    loadAddresses();
    loadWishlist();
  }, [user, loadOrders, loadAddresses, loadWishlist]);

  /* ── Derived stats ──────────────────────────────────────────── */
  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      totalOrders: orders.length,
      activeOrders: active.length,
      totalSpent: active.reduce((sum, o) => sum + Number(o.total || 0), 0),
      wishlistCount: wishlist.length,
      addressCount: addresses.length,
      inTransit: orders.filter((o) => o.status === "shipped" || o.status === "processing").length,
    };
  }, [orders, wishlist, addresses]);

  const shipping = useMemo(() => {
    if (items.length === 0 || subtotal >= FREE_SHIPPING_ABOVE) return 0;
    return SHIPPING_FLAT;
  }, [items.length, subtotal]);

  const cartTotal = subtotal + shipping;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_ABOVE - subtotal);

  const checkoutAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  /* ── Actions ────────────────────────────────────────────────── */

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileErrors({});
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErrors(data.errors || {});
        throw new Error(data.error || "Could not save profile");
      }
      await refreshUser();
      showNotice("ok", "Profile updated");
    } catch (error: any) {
      showNotice("error", error.message || "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwords),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordErrors(data.errors || {});
        throw new Error(data.error || "Could not change password");
      }
      setPasswords({ currentPassword: "", newPassword: "" });
      showNotice("ok", "Password changed successfully");
    } catch (error: any) {
      showNotice("error", error.message || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const saveAddress = async (makeDefault: boolean) => {
    if (!addressDraft) return;
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const payload = { ...addressDraft, isDefault: makeDefault };
      const isEdit = addressDraft.id > 0;
      const res = await fetch(isEdit ? `/api/addresses/${addressDraft.id}` : "/api/addresses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddressErrors(data.errors || {});
        throw new Error(data.error || "Could not save address");
      }
      setAddressDraft(null);
      await loadAddresses();
      showNotice("ok", isEdit ? "Address updated" : "Address saved");
    } catch (error: any) {
      showNotice("error", error.message || "Could not save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const setDefaultAddress = async (id: number) => {
    try {
      const res = await fetch(`/api/addresses/${id}?only=default`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not update default address");
      await loadAddresses();
      showNotice("ok", "Default delivery address updated");
    } catch (error: any) {
      showNotice("error", error.message || "Could not update address");
    }
  };

  const deleteAddress = async (id: number) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not delete address");
      await loadAddresses();
      showNotice("ok", "Address deleted");
    } catch (error: any) {
      showNotice("error", error.message || "Could not delete address");
    }
  };

  const removeFromWishlist = async (productId: number) => {
    setWishlist((prev) => prev.filter((p) => p.id !== productId));
    try {
      const res = await fetch(`/api/favorites?productId=${productId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not update wishlist");
      await refreshWishlist();
    } catch (error: any) {
      showNotice("error", error.message || "Could not update wishlist");
      await loadWishlist();
    }
  };

  const cancelOrder = async (id: number) => {
    if (!window.confirm("Cancel this order?")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not cancel order");
      await loadOrders();
      showNotice("ok", "Order cancelled");
    } catch (error: any) {
      showNotice("error", error.message || "Could not cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const placeOrder = async () => {
    if (!user) return;
    if (items.length === 0) {
      showNotice("error", "Your cart is empty");
      return;
    }
    if (!checkoutAddress) {
      showNotice("error", "Add a delivery address before checking out");
      setActiveTab("addresses");
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          address: {
            fullName: checkoutAddress.full_name,
            phone: checkoutAddress.phone,
            line1: checkoutAddress.line1,
            line2: checkoutAddress.line2,
            city: checkoutAddress.city,
            state: checkoutAddress.state,
            pincode: checkoutAddress.pincode,
          },
          notes: orderNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not place order");

      const order = data.order;
      clearCart();
      setOrderNotes("");
      await loadOrders();
      setActiveTab("orders");
      showNotice("ok", `Order ${order.order_no} placed`);

      // The site has no payment gateway, so the order is confirmed over WhatsApp.
      const summary = [
        `Hello ${SITE.shortName}, I have just placed order *${order.order_no}* on your website.`,
        "",
        ...summariseCartLines(items),
        "",
        `Subtotal: ${formatINR(order.subtotal)}`,
        `Shipping: ${order.shipping > 0 ? formatINR(order.shipping) : "Free"}`,
        `Total: ${formatINR(order.total)}`,
        "",
        `Deliver to: ${checkoutAddress.full_name}, ${checkoutAddress.phone}`,
        `${[checkoutAddress.line1, checkoutAddress.line2, checkoutAddress.city, checkoutAddress.state, checkoutAddress.pincode]
          .filter(Boolean)
          .join(", ")}`,
        orderNotes.trim() ? `\nNotes: ${orderNotes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      window.open(whatsappLink(summary), "_blank", "noopener,noreferrer");
    } catch (error: any) {
      showNotice("error", error.message || "Could not place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ── Auth / loading states ──────────────────────────────────── */
  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Spinner label="Loading your account…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      {/* ═══ TOAST ═══ */}
      {notice && (
        <div
          className={`fixed right-5 top-5 z-[60] flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold shadow-2xl animate-in slide-in-from-top-2 ${
            notice.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {notice.tone === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notice.text}
        </div>
      )}

      {/* ═══ SIDEBAR ═══ */}
      {/*
        Off-canvas below lg.

        The rail is 256px open and 80px collapsed; on a 375px phone even the
        collapsed 80px is a fifth of the viewport, permanently. Below lg it now
        slides away entirely and sits over a scrim; from lg up it is docked and
        keeps its collapse-to-icons behaviour.
      */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        aria-label="Account navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          /*
            Below lg: a drawer — off-canvas when closed, overlaid when open, so
            the width only matters while it is on screen.

            From lg: docked, and back to collapsing to a 80px icon rail, which is
            what the toggle has always done on a desktop.
          */
          sidebarOpen
            ? "w-64 translate-x-0"
            : "w-20 -translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <Link href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-base font-black text-white shadow-lg shadow-orange-500/20">
              N
            </span>
          </Link>
          {sidebarOpen && (
            <div className="min-w-0">
              <span className="block truncate text-sm font-black leading-none tracking-tight text-white">
                {SITE.shortName}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                My Account
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all ${
                activeTab === item.id
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && (
                <>
                  {item.id === "cart" && count > 0 && (
                    <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                      {count}
                    </span>
                  )}
                  {item.id === "orders" && stats.activeOrders > 0 && (
                    <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                      {stats.activeOrders}
                    </span>
                  )}
                  {item.id === "wishlist" && stats.wishlistCount > 0 && (
                    <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                      {stats.wishlistCount}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      {/*
        `ml-0` below lg, because the sidebar is off-canvas there. From lg up it
        keeps the docked collapse: 256px open, 80px to icons.
      */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebarOpen}
              className="-ml-1 shrink-0 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              href="/product-page"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 sm:flex"
            >
              Browse Catalogue <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="hidden text-right sm:block">
              <p className="max-w-[10rem] truncate text-xs font-bold text-slate-800">
                {user.name}
              </p>
              <p className="max-w-[10rem] truncate text-[10px] text-slate-400">{user.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-xs font-black text-orange-700 shadow-sm">
              {initials(user.name)}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
          {/* ═══════════════════════════════════════════════════════
              TAB: OVERVIEW
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-5 text-white sm:p-8 shadow-xl">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-orange-500 blur-3xl" />
                  <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-orange-500 blur-3xl" />
                </div>
                <div className="relative">
                  <h2 className="text-2xl font-black tracking-tight">
                    Welcome back, {user.name?.split(" ")[0] || "there"} 👋
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-slate-300">
                    Track your orders, manage delivery addresses and revisit your wishlist —
                    all in one place.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/25 transition-colors hover:bg-orange-700"
                    >
                      View my orders
                    </button>
                    <Link
                      href="/product-page"
                      className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                    >
                      Continue shopping
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total orders"
                  value={String(stats.totalOrders)}
                  icon={ShoppingBag}
                  tone="bg-orange-100 text-orange-700"
                  onClick={() => setActiveTab("orders")}
                />
                <StatCard
                  label="In transit"
                  value={String(stats.inTransit)}
                  icon={Truck}
                  tone="bg-violet-100 text-violet-700"
                  onClick={() => setActiveTab("orders")}
                />
                <StatCard
                  label="Wishlist items"
                  value={String(stats.wishlistCount)}
                  icon={Heart}
                  tone="bg-rose-100 text-rose-700"
                  onClick={() => setActiveTab("wishlist")}
                />
                <StatCard
                  label="Total spent"
                  value={formatINR(stats.totalSpent)}
                  icon={CreditCard}
                  tone="bg-emerald-100 text-emerald-700"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard
                  title="Recent orders"
                  action={
                    orders.length > 0 && (
                      <button
                        onClick={() => setActiveTab("orders")}
                        className="text-xs font-bold text-orange-600 transition-colors hover:text-orange-700"
                      >
                        View all
                      </button>
                    )
                  }
                >
                  {ordersLoading ? (
                    <Spinner label="Loading orders…" />
                  ) : orders.length === 0 ? (
                    <EmptyState
                      icon={ShoppingBag}
                      title="No orders yet"
                      message="When you place an order it will appear here with live status updates."
                      action={
                        <Link
                          href="/product-page"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                        >
                          Browse products <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      }
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {orders.slice(0, 4).map((order) => (
                        <li key={order.id} className="flex items-center gap-4 py-3.5">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((item) =>
                              item.product_image ? (
                                <img
                                  key={item.id}
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="h-10 w-10 rounded-lg border-2 border-white bg-white object-contain"
                                />
                              ) : (
                                <span
                                  key={item.id}
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-slate-100 text-slate-400"
                                >
                                  <Package className="h-4 w-4" />
                                </span>
                              )
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {order.items[0]?.product_name}
                              {order.items.length > 1 && (
                                <span className="ml-1 font-semibold text-slate-400">
                                  +{order.items.length - 1} more
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {order.order_no} · {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">
                              {formatINR(order.total)}
                            </p>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                STATUS_STYLES[order.status]
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard
                  title="Default delivery address"
                  action={
                    <button
                      onClick={() => setActiveTab("addresses")}
                      className="text-xs font-bold text-orange-600 transition-colors hover:text-orange-700"
                    >
                      Manage
                    </button>
                  }
                >
                  {addressesLoading ? (
                    <Spinner label="Loading addresses…" />
                  ) : addresses.length === 0 ? (
                    <EmptyState
                      icon={MapPin}
                      title="No saved addresses"
                      message="Add a delivery address to check out faster."
                      action={
                        <button
                          onClick={() => {
                            setAddressDraft({ ...EMPTY_ADDRESS });
                            setActiveTab("addresses");
                          }}
                          className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-orange-700"
                        >
                          Add address
                        </button>
                      }
                    />
                  ) : (
                    (() => {
                      const preferred =
                        addresses.find((a) => a.is_default === 1) || addresses[0];
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                              {preferred.label}
                            </span>
                            {preferred.is_default === 1 && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm font-black text-slate-900">
                            {preferred.full_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{preferred.phone}</p>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {[preferred.line1, preferred.line2, preferred.city, preferred.state, preferred.pincode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      );
                    })()
                  )}
                </SectionCard>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: ORDERS
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {ordersLoading ? (
                <Spinner label="Loading your orders…" />
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No orders yet"
                  message="Once you place an order it will show up here with its status, items and invoice summary."
                  action={
                    <Link
                      href="/product-page"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                    >
                      Browse products <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 p-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">{order.order_no}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Placed on {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            STATUS_STYLES[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                        <p className="text-base font-black text-slate-900">
                          {formatINR(order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-5">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-slate-300">
                                <Package className="h-5 w-5" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {item.product_slug ? (
                              <Link
                                href={`/product/${item.product_slug}`}
                                className="line-clamp-2 text-xs font-bold text-slate-900 transition-colors hover:text-orange-600"
                              >
                                {item.product_name}
                              </Link>
                            ) : (
                              <p className="line-clamp-2 text-xs font-bold text-slate-900">
                                {item.product_name}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] text-slate-500">
                              {formatINR(item.unit_price)} × {item.quantity}
                            </p>
                          </div>
                          <p className="text-xs font-black text-slate-900">
                            {formatINR(item.line_total)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 bg-slate-50 p-5">
                      <div className="text-xs text-slate-500">
                        <p className="font-bold text-slate-700">Delivering to</p>
                        <p className="mt-1 max-w-sm leading-relaxed">
                          {[order.contact_name, order.contact_phone, order.address_line, order.city, order.state, order.pincode]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {order.notes && (
                          <p className="mt-2 italic text-slate-400">Note: {order.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">
                          Subtotal {formatINR(order.subtotal)} · Shipping{" "}
                          {Number(order.shipping) > 0 ? formatINR(order.shipping) : "Free"}
                        </p>
                        {CANCELLABLE.includes(order.status) && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={cancellingId === order.id}
                            className="mt-3 rounded-xl border border-rose-200 px-4 py-2 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                          >
                            {cancellingId === order.id ? "Cancelling…" : "Cancel order"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: CART
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "cart" && (
            <div className="space-y-6">
              {!cartReady ? (
                <Spinner label="Loading your cart…" />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Your cart is empty"
                  message="Browse the catalogue and add the products you need — your cart is saved on this device."
                  action={
                    <Link
                      href="/product-page"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                    >
                      Browse products <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <SectionCard
                      title={`Cart items (${count})`}
                      action={
                        <button
                          onClick={() => {
                            if (window.confirm("Remove all items from your cart?")) clearCart();
                          }}
                          className="text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
                        >
                          Clear cart
                        </button>
                      }
                    >
                      <ul className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <li key={item.productId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-slate-300">
                                  <Package className="h-5 w-5" />
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              {item.slug ? (
                                <Link
                                  href={`/product/${item.slug}`}
                                  className="line-clamp-2 text-xs font-bold text-slate-900 transition-colors hover:text-orange-600"
                                >
                                  {item.name}
                                </Link>
                              ) : (
                                <p className="line-clamp-2 text-xs font-bold text-slate-900">
                                  {item.name}
                                </p>
                              )}
                              <p className="mt-1 text-sm font-black text-slate-900">
                                {formatINR(item.price)}
                              </p>

                              <div className="mt-3 flex items-center gap-3">
                                <div className="flex items-center rounded-xl border border-slate-200">
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    aria-label="Decrease quantity"
                                    className="p-2 text-slate-500 transition-colors hover:bg-slate-50"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="min-w-[2.5rem] text-center text-xs font-bold text-slate-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    aria-label="Increase quantity"
                                    className="p-2 text-slate-500 transition-colors hover:bg-slate-50"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeItem(item.productId)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 transition-colors hover:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                              </div>
                            </div>

                            <p className="text-sm font-black text-slate-900">
                              {formatINR(item.price * item.quantity)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  </div>

                  <div className="space-y-6">
                    <SectionCard title="Order summary">
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span className="font-bold text-slate-900">{formatINR(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping</span>
                          <span className="font-bold text-slate-900">
                            {shipping > 0 ? formatINR(shipping) : "Free"}
                          </span>
                        </div>

                        {amountToFreeShipping > 0 && (
                          <div className="rounded-xl bg-amber-50 p-3">
                            <p className="text-[11px] font-semibold text-amber-800">
                              Add {formatINR(amountToFreeShipping)} more for free shipping
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all"
                                style={{
                                  width: `${Math.min(100, (subtotal / FREE_SHIPPING_ABOVE) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                          <span className="font-black text-slate-900">Total</span>
                          <span className="font-black text-slate-900">{formatINR(cartTotal)}</span>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="Delivery address">
                      {addressesLoading ? (
                        <Spinner label="Loading addresses…" />
                      ) : addresses.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500">
                            You need a saved address before checking out.
                          </p>
                          <button
                            onClick={() => {
                              setAddressDraft({ ...EMPTY_ADDRESS });
                              setActiveTab("addresses");
                            }}
                            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                          >
                            Add a delivery address
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {addresses.map((address) => (
                            <label
                              key={address.id}
                              className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all ${
                                selectedAddressId === address.id
                                  ? "border-orange-400 bg-orange-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="checkout-address"
                                checked={selectedAddressId === address.id}
                                onChange={() => setSelectedAddressId(address.id)}
                                className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-slate-900">
                                  {address.full_name}{" "}
                                  <span className="font-semibold text-slate-400">
                                    ({address.label})
                                  </span>
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                  {address.phone}
                                </span>
                                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                                  {[
                                    address.line1,
                                    address.line2,
                                    address.city,
                                    address.state,
                                    address.pincode,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </span>
                            </label>
                          ))}

                          <div>
                            <label className={labelClass} htmlFor="order-notes">
                              Order notes <span className="normal-case text-slate-400">(optional)</span>
                            </label>
                            <textarea
                              id="order-notes"
                              rows={2}
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              placeholder="Delivery timing, installation requirements…"
                              className={`${inputClass} resize-none`}
                            />
                          </div>

                          <Link
                            href="/checkout"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange-600/25 transition-all hover:from-orange-700 hover:to-amber-700"
                          >
                            <CreditCard className="h-4 w-4" /> Pay {formatINR(cartTotal)}
                          </Link>
                          <button
                            onClick={placeOrder}
                            disabled={placingOrder}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                          >
                            {placingOrder ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Placing order…
                              </>
                            ) : (
                              "Or order via WhatsApp"
                            )}
                          </button>
                          <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
                            Pay securely online by UPI or card, or send the order on WhatsApp
                            and our team will confirm delivery.
                          </p>
                        </div>
                      )}
                    </SectionCard>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: WISHLIST
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "wishlist" && (
            <div className="space-y-6">
              {wishlistLoading ? (
                <Spinner label="Loading your wishlist…" />
              ) : wishlist.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="Your wishlist is empty"
                  message="Tap the heart on any product to save it here — it stays on your account across devices."
                  action={
                    <Link
                      href="/product-page"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                    >
                      Browse products <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {wishlist.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="relative aspect-square overflow-hidden border-b border-slate-100 bg-white">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-300">
                            <Package className="h-10 w-10" />
                          </span>
                        )}
                        <button
                          onClick={() => removeFromWishlist(product.id)}
                          aria-label="Remove from wishlist"
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm transition-colors hover:bg-rose-50"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col gap-2 p-4">
                        {product.brand && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            {product.brand}
                          </p>
                        )}
                        <Link
                          href={`/product/${product.slug}`}
                          className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 transition-colors hover:text-orange-600"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-auto text-base font-black text-slate-900">
                          {formatINR(product.price)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              addItem({
                                productId: product.id,
                                slug: product.slug,
                                name: product.name,
                                price: Number(product.price) || 0,
                                image: product.image_url || undefined,
                              });
                              showNotice("ok", `${product.name} added to cart`);
                            }}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Add to cart
                          </button>
                          <button
                            onClick={() => {
                              setBuyNowItem({
                                productId: product.id,
                                slug: product.slug,
                                name: product.name,
                                price: Number(product.price) || 0,
                                image: product.image_url || undefined,
                              });
                              router.push("/checkout");
                            }}
                            className="flex-1 rounded-lg bg-slate-900 px-2 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-700"
                          >
                            Buy now
                          </button>
                        </div>
                        <div className="mt-2">
                          <Link
                            href={`/product/${product.slug}`}
                            className="block rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold text-slate-500 transition-colors hover:text-orange-600"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: ASK ECOMMERCE (AI assistant)
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "assistant" && (
            /* Height is the viewport minus the h-16 page header and this
               wrapper's own padding (p-6 on mobile, p-8 from lg), so the
               composer sits at the bottom without overflowing the shell. */
            <div className="h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
              <ChatPanel />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: ADDRESSES
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "addresses" && (
            <div className="space-y-6">
              {addressDraft ? (
                <SectionCard
                  title={addressDraft.id > 0 ? "Edit address" : "Add a new address"}
                  description="Used as the delivery address at checkout."
                >
                  <AddressForm
                    value={addressDraft}
                    errors={addressErrors}
                    onChange={setAddressDraft}
                    onSubmit={() => saveAddress(addressDraft.isDefault === 1)}
                    onCancel={() => {
                      setAddressDraft(null);
                      setAddressErrors({});
                    }}
                    submitting={savingAddress}
                    submitLabel={addressDraft.id > 0 ? "Update address" : "Save address"}
                  />
                </SectionCard>
              ) : (
                <button
                  onClick={() => {
                    setAddressDraft({ ...EMPTY_ADDRESS });
                    setAddressErrors({});
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" /> Add new address
                </button>
              )}

              {addressesLoading ? (
                <Spinner label="Loading addresses…" />
              ) : addresses.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="No saved addresses"
                  message="Save an address to speed up checkout and keep delivery details accurate."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {address.label}
                        </span>
                        {address.is_default === 1 && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm font-black text-slate-900">{address.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{address.phone}</p>
                      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">
                        {[
                          address.line1,
                          address.line2,
                          address.city,
                          address.state,
                          address.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => {
                            setAddressDraft({
                              id: address.id,
                              label: address.label,
                              fullName: address.full_name,
                              phone: address.phone,
                              line1: address.line1,
                              line2: address.line2,
                              city: address.city,
                              state: address.state,
                              pincode: address.pincode,
                              isDefault: address.is_default,
                            });
                            setAddressErrors({});
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        {address.is_default !== 1 && (
                          <button
                            onClick={() => setDefaultAddress(address.id)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddress(address.id)}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: PROFILE
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="max-w-3xl space-y-6">
              <SectionCard title="Your details" description="Used for order updates and invoices.">
                <div className="mb-6 flex items-center gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-2xl font-black text-white shadow-lg shadow-orange-500/20">
                    {initials(user.name)}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <p className="mt-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {user.role === "admin" ? "Administrator" : "Customer"}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveProfile();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass} htmlFor="profile-name">
                      Full name
                    </label>
                    <input
                      id="profile-name"
                      className={inputClass}
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                    <FieldError message={profileErrors.name} />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="profile-email">
                      Email address
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      className={inputClass}
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                    <FieldError message={profileErrors.email} />
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      This is also your login ID.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                </form>
              </SectionCard>

              <SectionCard
                title="Change password"
                description="Use at least 8 characters."
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    changePassword();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass} htmlFor="current-password">
                      Current password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      className={inputClass}
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, currentPassword: e.target.value })
                      }
                      autoComplete="current-password"
                    />
                    <FieldError message={passwordErrors.currentPassword} />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="new-password">
                      New password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      className={inputClass}
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, newPassword: e.target.value })
                      }
                      autoComplete="new-password"
                    />
                    <FieldError message={passwordErrors.newPassword} />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    {savingPassword ? "Updating…" : "Update password"}
                  </button>
                </form>
              </SectionCard>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB: SETTINGS
              ═══════════════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="max-w-3xl space-y-6">
              <SectionCard title="Order preferences">
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Orders are confirmed over WhatsApp after you place them — keep your number
                    reachable.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Free shipping on orders above {formatINR(FREE_SHIPPING_ABOVE)}, otherwise{" "}
                    {formatINR(SHIPPING_FLAT)}.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    Orders can be cancelled from your orders list while they are pending or
                    processing.
                  </li>
                </ul>
              </SectionCard>

              <SectionCard title="Need help?">
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/${SITE.whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                  >
                    Chat on WhatsApp
                  </a>
                  <a
                    href={`tel:${SITE.phoneDisplay.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Call {SITE.phoneDisplay}
                  </a>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  {SITE.address}
                </p>
              </SectionCard>

              <SectionCard title="Session">
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700"
                >
                  <LogOut className="h-4 w-4" /> Log out of all devices
                </button>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  Signing out clears the session cookie on this device. Other devices stay signed
                  in until their token expires.
                </p>
              </SectionCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
          <Spinner label="Loading your account…" />
        </div>
      }
    >
      <UserDashboardContent />
    </React.Suspense>
  );
}
