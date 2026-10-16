"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Check,
  CreditCard,
  Smartphone,
  Lock,
  Truck,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Package,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCart, type CartItem } from "@/context/CartContext";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/validation";
import { SITE } from "@/lib/site";

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */

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

type CheckoutSession = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
  items: Array<{
    product_id: number;
    name: string;
    slug: string;
    image: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  address: Record<string, string>;
  addressId: number | null;
  notes: string;
};

type Step = "address" | "review" | "success";

const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100";

const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{message}</p>;
}

/**
 * Loads Razorpay's official checkout script on demand.
 *
 * Returns the constructor once loaded. Rejects if the script fails, which the caller
 * surfaces rather than leaving a payment button that silently does nothing.
 */
let scriptPromise: Promise<any> | null = null;

function loadRazorpay(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existing) {
        existing.addEventListener("load", () => resolve((window as any).Razorpay));
        existing.addEventListener("error", () => reject(new Error("Razorpay failed to load")));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve((window as any).Razorpay);
      script.onerror = () => reject(new Error("Could not load the Razorpay checkout"));
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

/* ══════════════════════════════════════════════════════════════════
   ADDRESS FORM
   ══════════════════════════════════════════════════════════════════ */

function AddressFields({
  value,
  errors,
  onChange,
}: {
  value: typeof EMPTY_ADDRESS;
  errors: Record<string, string>;
  onChange: (next: typeof EMPTY_ADDRESS) => void;
}) {
  const set = (patch: Partial<typeof EMPTY_ADDRESS>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="co-label">
            Address type
          </label>
          <select
            id="co-label"
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
          <label className={labelClass} htmlFor="co-name">
            Full name
          </label>
          <input
            id="co-name"
            className={inputClass}
            value={value.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="John Doe"
          />
          <FieldError message={errors.fullName} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="co-phone">
          Phone number
        </label>
        <input
          id="co-phone"
          className={inputClass}
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder={SITE.phoneDisplay}
          inputMode="tel"
        />
        <FieldError message={errors.phone} />
      </div>

      <div>
        <label className={labelClass} htmlFor="co-line1">
          Address line 1
        </label>
        <input
          id="co-line1"
          className={inputClass}
          value={value.line1}
          onChange={(e) => set({ line1: e.target.value })}
          placeholder="Flat / House no, Building, Street"
        />
        <FieldError message={errors.line1} />
      </div>

      <div>
        <label className={labelClass} htmlFor="co-line2">
          Area, landmark <span className="normal-case text-slate-400">(optional)</span>
        </label>
        <input
          id="co-line2"
          className={inputClass}
          value={value.line2}
          onChange={(e) => set({ line2: e.target.value })}
          placeholder="Near By-Tigri Gol Chakkar"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="co-city">
            City
          </label>
          <input
            id="co-city"
            className={inputClass}
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder={SITE.city}
          />
          <FieldError message={errors.city} />
        </div>
        <div>
          <label className={labelClass} htmlFor="co-state">
            State
          </label>
          <input
            id="co-state"
            className={inputClass}
            value={value.state}
            onChange={(e) => set({ state: e.target.value })}
            placeholder={SITE.state}
          />
          <FieldError message={errors.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="co-pincode">
            PIN code
          </label>
          <input
            id="co-pincode"
            className={inputClass}
            value={value.pincode}
            onChange={(e) => set({ pincode: e.target.value })}
            placeholder="201009"
            inputMode="numeric"
          />
          <FieldError message={errors.pincode} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHECKOUT PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, ready: cartReady, buyNowItem, clearBuyNowItem, clearCart } = useCart();

  const [step, setStep] = useState<Step>("address");

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressDraft, setAddressDraft] = useState<typeof EMPTY_ADDRESS | null>(null);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [notes, setNotes] = useState("");

  // Payment
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{ order_no: string; total: number } | null>(null);

  /**
   * "razorpay" takes payment now through the gateway; "cod" places the order and
   * collects the money on delivery.
   *
   * The two paths are genuinely different, not a flag on one flow: Razorpay has
   * to price the basket server-side and open a signed order first, whereas COD
   * writes the order directly and leaves `payment_status` at 'pending'. Deciding
   * this on the client rather than inferring it later keeps the pay button honest
   * about what pressing it will actually do.
   */
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [placingCod, setPlacingCod] = useState(false);

  /* ── Which items are being bought ──────────────────────────────────────── */
  const checkoutItems: CartItem[] = useMemo(
    () => (buyNowItem ? [buyNowItem] : items),
    [buyNowItem, items]
  );
  const isBuyNow = Boolean(buyNowItem);

  /* ── Totals (mirrors the server calculation in lib/pricing.ts) ────────── */
  const totals = useMemo(
    () =>
      computeTotals(
        checkoutItems.map((i) => ({ unit_price: i.price, quantity: i.quantity }))
      ),
    [checkoutItems]
  );

  /* ── Auth guard ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  /* ── Load saved addresses ──────────────────────────────────────────────── */
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
      setError("Could not load your saved addresses. You can still enter one below.");
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAddresses();
  }, [user, loadAddresses]);

  /* ── Save a new address inline, then select it ────────────────────────── */
  const saveInlineAddress = async () => {
    if (!addressDraft) return;
    setSavingAddress(true);
    setAddressErrors({});
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...addressDraft, isDefault: addresses.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddressErrors(data.errors || {});
        throw new Error(data.error || "Could not save address");
      }
      setAddressDraft(null);
      await loadAddresses();
      if (data.address?.id) setSelectedAddressId(data.address.id);
    } catch (err: any) {
      if (!Object.keys(addressErrors).length) setError(err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  /**
   * Asks the server to price the basket and open a Razorpay order.
   * Amounts are decided server-side; the numbers shown here are only for display.
   */
  const beginPayment = async () => {
    setPreparing(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          addressId: selectedAddressId,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");

      setSession(data as CheckoutSession);
      await openRazorpay(data as CheckoutSession);
    } catch (err: any) {
      setError(err.message || "Could not start checkout");
    } finally {
      setPreparing(false);
    }
  };

  /** Opens the Razorpay modal. Card, UPI and netbanking are offered by the gateway. */
  const openRazorpay = async (checkoutSession: CheckoutSession) => {
    const Razorpay = await loadRazorpay();

    const options = {
      key: checkoutSession.keyId,
      amount: checkoutSession.amount,
      currency: checkoutSession.currency,
      name: "OBRYN",
      description:
        checkoutSession.items.length === 1
          ? checkoutSession.items[0].name
          : `${checkoutSession.items.length} items`,
      image: "/favicon.ico",
      order_id: checkoutSession.razorpayOrderId,
      prefill: {
        name: checkoutSession.address.fullName,
        contact: checkoutSession.address.phone,
      },
      notes: {
        address: `${checkoutSession.address.line1}, ${checkoutSession.address.city} ${checkoutSession.address.pincode}`,
      },
      // Leave `method` unset so the gateway offers every method enabled on the account,
      // which includes UPI, cards and netbanking.
      theme: { color: "#ea580c" },
      modal: {
        ondismiss: () => {
          setPaying(false);
        },
      },
      handler: async (response: any) => {
        await recordOrder(checkoutSession, response);
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", (response: any) => {
      setPaying(false);
      setError(
        response?.error?.description ||
          "Payment failed. If money was deducted it will be refunded automatically."
      );
    });
    rzp.open();
  };

  /**
   * Confirms the payment server-side and writes the order.
   * The signature check happens in the API, so the client cannot fake a paid order.
   */
  const recordOrder = async (checkoutSession: CheckoutSession, response: any) => {
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
          items: checkoutItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          address: checkoutSession.address,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not confirm your payment");

      setPlacedOrder({ order_no: data.order.order_no, total: data.order.total });
      setStep("success");

      // A buy-now consumes only its own item; a cart checkout empties the basket.
      if (isBuyNow) clearBuyNowItem();
      else clearCart();
    } catch (err: any) {
      setError(
        err.message ||
          "We could not confirm your payment. Please contact support with your payment id."
      );
    } finally {
      setPaying(false);
    }
  };

  const handlePayClick = async () => {
    if (paymentMethod === "cod") {
      await placeCashOnDelivery();
      return;
    }

    setPaying(true);
    setError(null);
    try {
      if (session) {
        await openRazorpay(session);
      } else {
        await beginPayment();
      }
    } catch (err: any) {
      setError(err.message || "Could not open the payment window");
      setPaying(false);
    }
  };

  /**
   * Cash on delivery.
   *
   * Goes through POST /api/orders, which prices the basket server-side inside the
   * `place_customer_order` function — same pricing path as a card payment, so the
   * two cannot drift apart. The order is written with `payment_status` left at
   * 'pending': nobody has handed over any money yet, and reporting it as paid
   * would let an uncollected order look settled in the admin dashboard.
   */
  const placeCashOnDelivery = async () => {
    if (!selectedAddress) {
      setError("Choose a delivery address first");
      return;
    }

    setPlacingCod(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          address: {
            // The DB columns are snake_case; `place_customer_order` reads the
            // camelCase keys the Razorpay route also sends, so both payment
            // paths hand the function an identically-shaped address.
            fullName: selectedAddress.full_name,
            phone: selectedAddress.phone,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 ?? "",
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
          notes: notes.trim(),
          paymentMethod: "cod",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not place the order");

      setPlacedOrder({ order_no: data.order.order_no, total: data.order.total });
      setStep("success");

      if (isBuyNow) clearBuyNowItem();
      else clearCart();
    } catch (err: any) {
      setError(err.message || "Could not place the order");
    } finally {
      setPlacingCod(false);
    }
  };

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  /* ── Loading / guard states ────────────────────────────────────────────── */
  if (authLoading || !user) {
    return (
      <CenteredState>
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        <p className="text-xs font-bold text-slate-500">Preparing checkout…</p>
      </CenteredState>
    );
  }

  if (cartReady && checkoutItems.length === 0 && step !== "success") {
    return (
      <CenteredState>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Package className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-black text-slate-900">Nothing to check out</h2>
        <p className="max-w-sm text-center text-xs leading-relaxed text-slate-500">
          Your cart is empty. Add a product, or buy one directly from its product page.
        </p>
        <Link
          href="/product-page"
          className="mt-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
        >
          Browse products
        </Link>
      </CenteredState>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
      SUCCESS
      ══════════════════════════════════════════════════════════════════ */
  if (step === "success" && placedOrder) {
    // A cash-on-delivery order is confirmed, not paid. Saying "Payment
    // successful" over an order where no money has changed hands would be a lie
    // the customer later has to unpick with support.
    const isCod = paymentMethod === "cod";

    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-16 font-sans">
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isCod ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {isCod ? <Truck className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          </span>

          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            {isCod ? "Order confirmed" : "Payment successful"}
          </h1>

          {isCod ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Nothing has been charged. Please keep{" "}
              <span className="font-bold text-slate-900">{formatINR(placedOrder.total)}</span>{" "}
              ready for the delivery agent.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              We have received your payment of{" "}
              <span className="font-bold text-slate-900">{formatINR(placedOrder.total)}</span>.
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order number
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">{placedOrder.order_no}</p>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px]">
              <span className="font-semibold text-slate-500">Payment method</span>
              <span className="font-bold text-slate-700">
                {isCod ? "Cash on delivery" : "Online — Razorpay"}
              </span>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              A confirmation has been sent to {user.email}. Our team will contact you to
              arrange delivery and installation.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/user-dashboard?tab=orders"
              className="flex-1 rounded-xl bg-orange-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700"
            >
              View my orders
            </Link>
            <Link
              href="/product-page"
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
      CHECKOUT
      ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Steps */}
        <div className="mb-8 flex items-center justify-center gap-2 text-xs font-bold">
          <StepPill label="Delivery address" active={step === "address"} done={step !== "address"} />
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <StepPill label="Review & pay" active={step === "review"} done={false} />
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <StepPill label="Confirmation" active={false} done={false} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main column ────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* ADDRESS STEP */}
            {step === "address" && (
              <Panel
                title="Where should we deliver?"
                subtitle="Use a saved address, or add a new one to continue."
              >
                {addressesLoading ? (
                  <Loading label="Loading your addresses…" />
                ) : (
                  <>
                    {addresses.length > 0 && (
                      <div className="space-y-3">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all ${
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
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-slate-900">
                                  {address.full_name}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                  {address.label}
                                </span>
                                {address.is_default === 1 && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    Default
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {address.phone}
                              </span>
                              <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">
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

                        <Link
                          href="/user-dashboard?tab=addresses"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 transition-colors hover:text-orange-700"
                        >
                          Manage saved addresses
                        </Link>
                      </div>
                    )}

                    {addressDraft ? (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500">
                          Add a new address
                        </h3>
                        <AddressFields
                          value={addressDraft}
                          errors={addressErrors}
                          onChange={setAddressDraft}
                        />
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={saveInlineAddress}
                            disabled={savingAddress}
                            className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-colors hover:bg-orange-700 disabled:opacity-50"
                          >
                            {savingAddress ? "Saving…" : "Save and use this address"}
                          </button>
                          <button
                            onClick={() => {
                              setAddressDraft(null);
                              setAddressErrors({});
                            }}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddressDraft({ ...EMPTY_ADDRESS });
                          setAddressErrors({});
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 ${
                          addresses.length > 0 ? "mt-5" : ""
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        Add a new address
                      </button>
                    )}
                  </>
                )}
              </Panel>
            )}

            {/* REVIEW STEP */}
            {step === "review" && (
              <div className="space-y-6">
                <Panel
                  title="Review your order"
                  subtitle="Confirm the items and delivery details before paying."
                >
                  <ul className="divide-y divide-slate-100">
                    {checkoutItems.map((item) => (
                      <li key={item.productId} className="flex gap-4 py-4 first:pt-0">
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
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatINR(item.price)} × {item.quantity}
                          </p>
                          {!isBuyNow && (
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-orange-600">
                              From your cart
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-black text-slate-900">
                          {formatINR(item.price * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Delivering to">
                  {selectedAddress ? (
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-xs leading-relaxed text-slate-600">
                        <p className="text-sm font-black text-slate-900">
                          {selectedAddress.full_name}{" "}
                          <span className="text-xs font-semibold text-slate-400">
                            ({selectedAddress.label})
                          </span>
                        </p>
                        <p className="mt-0.5 text-slate-500">{selectedAddress.phone}</p>
                        <p className="mt-1.5">
                          {[
                            selectedAddress.line1,
                            selectedAddress.line2,
                            selectedAddress.city,
                            selectedAddress.state,
                            selectedAddress.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => setStep("address")}
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No address selected.</p>
                  )}

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <label className={labelClass} htmlFor="co-notes">
                      Order notes <span className="normal-case text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="co-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Delivery timing, installation requirements…"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </Panel>

                <Panel title="Payment method">
                  {/*
                    Two radio cards rather than a dropdown: these are two genuinely
                    different processes, and the one that matters most to a
                    customer without a card — that none is needed — should not be
                    hidden behind a collapsed control.
                  */}
                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
                        paymentMethod === "razorpay"
                          ? "border-orange-500 bg-orange-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={paymentMethod === "razorpay"}
                        onChange={() => setPaymentMethod("razorpay")}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          paymentMethod === "razorpay"
                            ? "border-orange-500"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "razorpay" ? (
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            Online payment
                          </span>
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            Instant
                          </span>
                        </span>

                        <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                          UPI, credit or debit card, or netbanking, through Razorpay&apos;s
                          secure window.
                        </span>

                        <span className="mt-2.5 flex flex-wrap gap-1.5">
                          <Badge icon={Smartphone} label="UPI" />
                          <Badge icon={CreditCard} label="Cards" />
                          <Badge icon={Truck} label="Netbanking" />
                        </span>
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
                        paymentMethod === "cod"
                          ? "border-orange-500 bg-orange-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          paymentMethod === "cod"
                            ? "border-orange-500"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "cod" ? (
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            Cash on delivery
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Pay on arrival
                          </span>
                        </span>

                        <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                          Pay the delivery agent in cash or by UPI when your order arrives.
                          Nothing is charged now.
                        </span>
                      </span>
                    </label>
                  </div>

                  {paymentMethod === "razorpay" ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-[11px] leading-relaxed text-emerald-800">
                        Card and UPI details are entered on Razorpay&apos;s own secure page and
                        never touch our servers.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        Please keep the exact amount ready. To cancel, call us before the
                        order is dispatched — once shipped, it cannot be called off.
                      </p>
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="text-xs font-semibold leading-relaxed text-rose-800">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* ── Summary column ─────────────────────────────────────────── */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black tracking-tight text-slate-900">
                Order summary
              </h2>

              {isBuyNow && (
                <p className="mt-2 rounded-xl bg-orange-50 p-3 text-[11px] font-semibold text-orange-800">
                  Buy now — your saved cart is untouched.
                </p>
              )}

              <div className="mt-4 space-y-2.5 text-xs">
                <Row label={`Items (${countLabel(checkoutItems)})`} value={formatINR(totals.subtotal)} />
                <Row
                  label="Shipping"
                  value={totals.shipping > 0 ? formatINR(totals.shipping) : "Free"}
                />
              </div>

              {totals.amountToFreeShipping > 0 && totals.subtotal > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 p-3">
                  <p className="text-[11px] font-semibold text-amber-800">
                    Add {formatINR(totals.amountToFreeShipping)} more for free shipping
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(100, (totals.subtotal / 25000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
                <span className="text-sm font-black text-slate-900">Total</span>
                <span className="text-xl font-black text-slate-900">
                  {formatINR(totals.total)}
                </span>
              </div>

              {step === "address" ? (
                <button
                  onClick={() => {
                    if (!selectedAddressId && !addressDraft) {
                      setError("Select or add a delivery address to continue.");
                      return;
                    }
                    setError(null);
                    setStep("review");
                  }}
                  className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                >
                  Continue to payment
                </button>
              ) : (
                <button
                  onClick={handlePayClick}
                  disabled={preparing || paying || placingCod || checkoutItems.length === 0}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition-all disabled:opacity-60 ${
                    paymentMethod === "cod"
                      ? "bg-slate-900 shadow-slate-900/25 hover:bg-slate-800"
                      : "bg-gradient-to-r from-orange-600 to-amber-600 shadow-orange-600/25 hover:from-orange-700 hover:to-amber-700"
                  }`}
                >
                  {/* The label states what pressing it will actually do. Under COD
                      there is no payment window, and "Pay ₹…" on a button that
                      charges nothing is misleading. */}
                  {preparing || paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Opening payment…
                    </>
                  ) : placingCod ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Placing your order…
                    </>
                  ) : paymentMethod === "cod" ? (
                    <>
                      <Truck className="h-4 w-4" /> Place order — pay {formatINR(totals.total)} on delivery
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Pay {formatINR(session?.total ?? totals.total)}
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setError(null);
                  setStep("address");
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to address
              </button>

              <Link
                href={isBuyNow ? `/product/${checkoutItems[0]?.slug ?? ""}` : "/product-page"}
                className="mt-4 block text-center text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-600"
              >
                {isBuyNow ? "Back to product" : "Continue shopping"}
              </Link>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400">
                <Lock className="h-3 w-3" /> Secured by Razorpay
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SMALL PIECES
   ══════════════════════════════════════════════════════════════════ */

function countLabel(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-4">
      {children}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10">
      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      <span className="text-xs font-semibold text-slate-500">{label}</span>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-sm font-black tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
        active
          ? "bg-orange-600 text-white"
          : done
            ? "bg-emerald-100 text-emerald-700"
            : "bg-white text-slate-400 ring-1 ring-slate-200"
      }`}
    >
      {done ? <Check className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}