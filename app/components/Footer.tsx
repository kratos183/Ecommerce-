import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
  RefreshCcw,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site";

/**
 * The link groups below drive the footer's middle columns. Keeping them as data
 * means adding a section is one array entry, not another block of markup.
 */
const LINK_GROUPS = [
  {
    title: "Shop",
    links: [
      { label: "Mobiles", href: "/product-page?category=Phone" },
      { label: "Laptops & Computers", href: "/product-page?category=Laptop" },
      { label: "Tablets", href: "/product-page?category=Tablet+%2F+iPad" },
      { label: "TVs & Displays", href: "/product-page?category=Monitor" },
      { label: "Audio & Headphones", href: "/product-page?category=Mic" },
      { label: "Cameras", href: "/product-page?category=Camera" },
      { label: "Accessories", href: "/product-page?category=Accessories" },
    ],
  },
  {
    title: "Who we serve",
    links: [
      { label: "Home & Everyday", href: "/#solutions" },
      { label: "Students & Schools", href: "/#solutions" },
      { label: "Coaching Institutes", href: "/#solutions" },
      { label: "Offices & Conference Rooms", href: "/#solutions" },
      { label: "Creators & Studios", href: "/#solutions" },
      { label: "Retail & Signage", href: "/#solutions" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Installation & Setup", href: "/#services" },
      { label: "Annual Maintenance", href: "/#services" },
      { label: "Bulk & Corporate Orders", href: "/#services" },
      { label: "App & Website Development", href: "/#services" },
      { label: "Digital Marketing", href: "/#services" },
      { label: "Technical Support", href: "/#support" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Ecommerce", href: "/#about" },
      { label: "Contact Us", href: "/#support" },
      { label: "Your Orders", href: "/user-dashboard?tab=orders" },
      { label: "Your Wishlist", href: "/user-dashboard?tab=wishlist" },
      { label: "Help & Support", href: "/#support" },
      { label: "Admin Dashboard", href: "/Admin-Dashboard" },
    ],
  },
];

const TRUST = [
  { icon: Truck, label: "Free delivery over ₹25,000" },
  { icon: ShieldCheck, label: "Secure payments via Razorpay" },
  { icon: RefreshCcw, label: "7-day easy returns" },
  { icon: Headphones, label: "24/7 customer support" },
];

const SOCIALS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "YouTube", href: "#" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      {/* ── Trust strip ── */}
      <div className="border-b border-gray-200 bg-gray-50/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Icon className="h-4 w-4 text-orange-600" aria-hidden />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* ── Brand + contact ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <span className="text-sm font-bold">E</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                {SITE.name}
              </span>
            </div>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-gray-500">
              {SITE.about}
            </p>

            <div className="mt-6 space-y-3 text-xs text-gray-600">
              <a
                href={`tel:+${SITE.whatsappNumber}`}
                className="flex items-start gap-2.5 transition-colors hover:text-orange-700"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                {SITE.phoneDisplay}
              </a>
              <a
                href={`mailto:${SITE.email}`}
                className="flex items-start gap-2.5 break-all transition-colors hover:text-orange-700"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                {SITE.email}
              </a>
              {/*
                Broken across lines rather than one long string so the address wraps
                sensibly on a narrow footer column instead of overflowing.
              */}
              <address className="flex items-start gap-2.5 not-italic">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span className="leading-relaxed">
                  {SITE.address}
                </span>
              </address>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={whatsappLink("Hi Ecommerce, I'd like to know more about your products.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                Chat on WhatsApp
              </a>
              <a
                href={`tel:+${SITE.whatsappNumber}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                Call Sales
              </a>
            </div>
          </div>

          {/* ── Link columns ── */}
          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-orange-700"
                    >
                      {link.label}
                      <ArrowRight
                        className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Payment + social row ── */}
        <div className="mt-12 flex flex-col gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700">We accept</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {["UPI", "Visa", "Mastercard", "Rupay", "Net Banking", "Cash on Delivery"].map(
                (method) => (
                  <span
                    key={method}
                    className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-600"
                  >
                    {method}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold text-gray-700">Follow Ecommerce</p>
            <div className="mt-2.5 flex gap-2 sm:justify-end">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                >
                  <span className="text-[10px] font-bold">
                    {social.label.slice(0, 2).toUpperCase()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="#" className="transition-colors hover:text-gray-700">
              Privacy Policy
            </Link>
            <Link href="#" className="transition-colors hover:text-gray-700">
              Terms of Sale
            </Link>
            <Link href="#" className="transition-colors hover:text-gray-700">
              Shipping &amp; Returns
            </Link>
            <Link href="#" className="transition-colors hover:text-gray-700">
              Warranty
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Support online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}