"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Package, BarChart3, Settings, LogOut,
  Bell, Menu, Trash2, Edit, DollarSign, TrendingUp, Check, X, ShieldCheck, ShieldOff,
  Search, ExternalLink, Plus, RefreshCw, LayoutGrid, List, Sparkles, Image as ImageIcon, Tag,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BRAND_GRID } from '@/lib/catalog';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  brand?: string;
  price: number;
  image_url: string;
  images?: string[] | string;
  description_intro?: string;
  specifications?: Record<string, Record<string, string>> | string;
  created_at?: string;
}

interface SpecItem {
  key: string;
  value: string;
}

interface SpecSection {
  title: string;
  items: SpecItem[];
}

// ─── NAVBAR CATEGORIES & BRANDS ────────────────────────────────────────
// Single source of truth: the same map the Navbar mega menu renders from, so the
// storefront menu and the admin product form can never show different brands.
export const NAVBAR_CATEGORIES_AND_BRANDS: Record<string, string[]> = BRAND_GRID;

function ImageUploadField({
  label,
  value,
  onChange,
  required = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  helperText?: string;
}) {
  const [useUrl, setUseUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    try {
      setUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }
      onChange(data.url);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image to Cloudinary.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setUseUrl(!useUrl)}
          className="text-[10.5px] font-semibold text-orange-600 hover:text-orange-700 underline"
        >
          {useUrl ? '← Switch to Photo Upload' : 'Or Paste URL'}
        </button>
      </div>

      {useUrl ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
        />
      ) : value ? (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">Image ready (Cloudinary/Hosted)</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{value}</p>
            <span className="inline-block mt-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Ready
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 text-xs transition-colors shrink-0 font-bold"
            title="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-orange-50/30 transition-all text-center group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <div className="flex items-center gap-2 py-2 text-xs font-bold text-orange-600">
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading to Cloudinary...</span>
            </div>
          ) : (
            <div className="py-1">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                📸
              </div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drag & drop image
              </p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 10MB (Cloudinary Powered)</p>
            </div>
          )}
        </label>
      )}

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
      {helperText && <p className="text-[10.5px] text-slate-400">{helperText}</p>}
    </div>
  );
}

function MultiImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [useUrl, setUseUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const urls = value
    ? value
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError('');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'products_gallery');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      const combined = [...urls, ...uploadedUrls].join(', ');
      onChange(combined);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload gallery images.');
    } finally {
      setUploading(false);
    }
  };

  const removeUrl = (idxToRemove: number) => {
    const remaining = urls.filter((_, idx) => idx !== idxToRemove);
    onChange(remaining.join(', '));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase">{label}</label>
        <button
          type="button"
          onClick={() => setUseUrl(!useUrl)}
          className="text-[10.5px] font-semibold text-orange-600 hover:text-orange-700 underline"
        >
          {useUrl ? '← Switch to Photo Upload' : 'Or Paste URLs'}
        </button>
      </div>

      {useUrl ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://image1.jpg, https://image2.jpg"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
        />
      ) : (
        <div className="space-y-2">
          {urls.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              {urls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-slate-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeUrl(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-orange-50/30 transition-all text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesChange}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading gallery photos...</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-700">
                📸 + Upload Gallery Photos to Cloudinary (Multiple Selection)
              </span>
            )}
          </label>
        </div>
      )}

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
    </div>
  );
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout } = useAuth();

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; role: string } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Product management state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductSlug, setEditingProductSlug] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Product Filter and Sort State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [productSortBy, setProductSortBy] = useState('newest');

  // Pagination State for Products
  const [adminProdPage, setAdminProdPage] = useState(1);
  const [adminProdPerPage, setAdminProdPerPage] = useState(6);

  // Pagination State for Users
  const [adminUserPage, setAdminUserPage] = useState(1);
  const [adminUserPerPage, setAdminUserPerPage] = useState(10);

  // Modal Form Inputs
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Digital Board');
  const [newProdBrand, setNewProdBrand] = useState('ViewSonic');
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdGallery, setNewProdGallery] = useState('');
  const [newProdIntro, setNewProdIntro] = useState('');
  const [notification, setNotification] = useState('');

  // ─── SPECIFICATION PRESETS ──────────────────────────────────────────
  const defaultIfpSpecs: SpecSection[] = [
    {
      title: '1. DISPLAY SPECIFICATIONS',
      items: [
        { key: 'Screen Size', value: '75 Inch (Diagonal)' },
        { key: 'Resolution', value: '4K Ultra HD (3840 x 2160)' },
        { key: 'Brightness', value: '400 cd/m²' },
        { key: 'Viewing Angle', value: '178° Horizontal / 178° Vertical' },
        { key: 'Touch Technology', value: '20-Point Infrared Touch' },
        { key: 'Glass Type', value: '4mm Toughened Anti-Glare Glass' },
      ],
    },
    {
      title: '2. PERFORMANCE & HARDWARE',
      items: [
        { key: 'Processor', value: 'Quad-Core High-Speed EdTech CPU' },
        { key: 'RAM', value: '8GB DDR4' },
        { key: 'Operating System', value: 'Android 13.0 + Dual OS Ready' },
        { key: 'Storage', value: '128GB High-Speed eMMC' },
      ],
    },
    {
      title: '3. CONNECTIVITY & PORTS',
      items: [
        { key: 'HDMI Ports', value: '3x HDMI IN, 1x HDMI OUT' },
        { key: 'USB Ports', value: '4x USB 3.0 Front & Rear' },
        { key: 'Wi-Fi & Bluetooth', value: 'Dual Band Wi-Fi 6 + Bluetooth 5.2' },
      ],
    },
    {
      title: '4. PHYSICAL & MOUNTING',
      items: [
        { key: 'Dimensions & Weight', value: '1710 x 1020 x 86 mm (approx 48kg)' },
        { key: 'Mounting', value: 'Standard VESA 600x400 Heavy Wall Bracket' },
      ],
    },
  ];

  const laptopSpecs: SpecSection[] = [
    {
      title: '1. PROCESSOR & PERFORMANCE',
      items: [
        { key: 'Processor', value: 'Intel Core i7 13th Gen / Apple M3' },
        { key: 'Clock Speed', value: 'Up to 5.0 GHz Turbo' },
        { key: 'Graphics (GPU)', value: 'Intel Iris Xe / NVIDIA RTX 4050 6GB' },
      ],
    },
    {
      title: '2. MEMORY & STORAGE',
      items: [
        { key: 'RAM', value: '16GB DDR5 5200MHz' },
        { key: 'Storage', value: '512GB / 1TB M.2 NVMe SSD' },
        { key: 'Expandability', value: 'Up to 64GB Dual Channel' },
      ],
    },
    {
      title: '3. DISPLAY & BATTERY',
      items: [
        { key: 'Display Size & Resolution', value: '15.6 Inch FHD IPS 144Hz Anti-Glare' },
        { key: 'Battery Backup', value: 'Up to 8-10 Hours (65Wh Fast Charge)' },
        { key: 'Operating System', value: 'Windows 11 Home / macOS Sonoma' },
      ],
    },
  ];

  const phoneSpecs: SpecSection[] = [
    {
      title: '1. DISPLAY & DESIGN',
      items: [
        { key: 'Display', value: '6.7 Inch Super AMOLED 120Hz HDR10+' },
        { key: 'Resolution', value: '2412 x 1080 FHD+' },
        { key: 'Protection', value: 'Corning Gorilla Glass Victus' },
      ],
    },
    {
      title: '2. CAMERA SETUP',
      items: [
        { key: 'Rear Camera', value: '50MP OIS + 8MP Ultra-Wide + 2MP Macro' },
        { key: 'Front Camera', value: '32MP AI Portrait Camera' },
        { key: 'Video Recording', value: '4K @ 30/60fps, Ultra Steady Mode' },
      ],
    },
    {
      title: '3. HARDWARE & BATTERY',
      items: [
        { key: 'Chipset', value: 'Snapdragon 8 Gen 2 / Apple A17 Pro' },
        { key: 'RAM & Storage', value: '8GB / 12GB RAM + 256GB UFS 4.0' },
        { key: 'Battery & Charging', value: '5000 mAh + 80W SuperVOOC Fast Charge' },
      ],
    },
  ];

  const wirelessAudioSpecs: SpecSection[] = [
    {
      title: '1. AUDIO & SOUND DRIVERS',
      items: [
        { key: 'Driver Size', value: '13mm Dynamic Drivers' },
        { key: 'Frequency Response', value: '20 Hz - 20,000 Hz' },
        { key: 'Active Noise Cancellation', value: 'Up to 32dB Hybrid ANC' },
        { key: 'Microphone', value: 'Quad-Mic with ENC Noise Filtering' },
      ],
    },
    {
      title: '2. BATTERY & CHARGING',
      items: [
        { key: 'Earbuds Playtime', value: 'Up to 8 Hours' },
        { key: 'Total Case Playtime', value: 'Up to 36 Hours' },
        { key: 'Charging Port', value: 'Type-C Fast Charging' },
        { key: 'Fast Charging', value: '10 mins charge = 2 hours playback' },
      ],
    },
    {
      title: '3. WIRELESS & CONNECTIVITY',
      items: [
        { key: 'Bluetooth Version', value: 'Bluetooth v5.3' },
        { key: 'Wireless Range', value: '10 Meters (33 ft)' },
        { key: 'Supported Audio Codecs', value: 'AAC, SBC' },
      ],
    },
  ];

  const cameraSpecs: SpecSection[] = [
    {
      title: '1. OPTICS & SENSOR',
      items: [
        { key: 'Sensor Type', value: '1/2.8 inch 4K Ultra HD CMOS' },
        { key: 'Optical Zoom', value: '12X / 20X Optical Zoom' },
        { key: 'Resolution & FPS', value: '4K @ 30fps / 1080p @ 60fps' },
        { key: 'Field of View (FOV)', value: '72.5° Wide Angle' },
      ],
    },
    {
      title: '2. PAN, TILT & TRACKING',
      items: [
        { key: 'Pan Range', value: '±170° Continuous' },
        { key: 'Tilt Range', value: '-30° to +90°' },
        { key: 'AI Auto-Tracking', value: 'Presenter Auto-Tracking' },
      ],
    },
    {
      title: '3. CONNECTIVITY & OUTPUT',
      items: [
        { key: 'Video Outputs', value: 'HDMI 2.0, USB 3.0, IP / LAN RJ45' },
        { key: 'PoE Support', value: 'PoE (Power over Ethernet)' },
        { key: 'Compatibility', value: 'Zoom, Teams, OBS Studio, Google Meet' },
      ],
    },
  ];

  const micSpecs: SpecSection[] = [
    {
      title: '1. MICROPHONE CAPSULE & AUDIO',
      items: [
        { key: 'Capsule Type', value: 'Dual Wireless UHF / 2.4GHz Digital' },
        { key: 'Polar Pattern', value: 'Omnidirectional / Cardioid' },
        { key: 'Frequency Response', value: '50 Hz - 18,000 Hz' },
      ],
    },
    {
      title: '2. TRANSMISSION & BATTERY',
      items: [
        { key: 'Operating Range', value: 'Up to 50 Meters Line-of-Sight' },
        { key: 'Battery Life', value: 'Up to 10 Hours Continuous Operation' },
        { key: 'Charging', value: 'Rechargeable Lithium Battery + Type-C' },
      ],
    },
  ];

  const [specSections, setSpecSections] = useState<SpecSection[]>(defaultIfpSpecs);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Product Management', icon: Package },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // ignore
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'dashboard') {
      fetchUsers();
      fetchProducts();
    }
  }, [activeTab, fetchUsers, fetchProducts]);

  // Handle category change in modal
  const handleCategorySelectChange = (cat: string) => {
    setNewProdCategory(cat);
    const availableBrands = NAVBAR_CATEGORIES_AND_BRANDS[cat] || [];
    if (availableBrands.length > 0) {
      setNewProdBrand(availableBrands[0]);
      setIsCustomBrand(false);
    } else {
      setIsCustomBrand(true);
      setNewProdBrand('');
    }

    // Auto set preset specs
    if (cat === "Digital Board") setSpecSections(defaultIfpSpecs);
    else if (cat === "Laptop") setSpecSections(laptopSpecs);
    else if (cat === "Phone" || cat === "Tablet / iPad") setSpecSections(phoneSpecs);
    else if (cat === "Airbud" || cat === "Speaker") setSpecSections(wirelessAudioSpecs);
    else if (cat === "Camera") setSpecSections(cameraSpecs);
    else if (cat === "Mic") setSpecSections(micSpecs);
  };

  const openCreateModal = () => {
    setEditingProductSlug(null);
    setNewProdName('');
    setNewProdSlug('');
    setNewProdCategory('Digital Board');
    setNewProdBrand('ViewSonic');
    setCustomBrandInput('');
    setIsCustomBrand(false);
    setNewProdPrice('');
    setNewProdImage('');
    setNewProdGallery('');
    setNewProdIntro('');
    setSpecSections(defaultIfpSpecs);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProductSlug(p.slug);
    setNewProdName(p.name || '');
    setNewProdSlug(p.slug || '');
    setNewProdCategory(p.category || 'Digital Board');
    
    const catBrands = NAVBAR_CATEGORIES_AND_BRANDS[p.category] || [];
    if (p.brand && catBrands.includes(p.brand)) {
      setNewProdBrand(p.brand);
      setIsCustomBrand(false);
    } else if (p.brand) {
      setIsCustomBrand(true);
      setCustomBrandInput(p.brand);
      setNewProdBrand(p.brand);
    } else {
      setNewProdBrand(catBrands[0] || '');
      setIsCustomBrand(false);
    }

    setNewProdPrice(p.price ? String(p.price) : '');
    setNewProdImage(p.image_url || '');

    const galleryString = Array.isArray(p.images)
      ? p.images.join(', ')
      : typeof p.images === 'string'
      ? p.images
      : '';
    setNewProdGallery(galleryString);
    setNewProdIntro(p.description_intro || '');

    // Parse specifications into SpecSection array
    let rawSpecs = p.specifications;
    if (typeof rawSpecs === 'string') {
      try {
        rawSpecs = JSON.parse(rawSpecs);
      } catch {
        rawSpecs = {};
      }
    }

    if (rawSpecs && typeof rawSpecs === 'object' && Object.keys(rawSpecs).length > 0) {
      const parsedSections: SpecSection[] = Object.entries(rawSpecs).map(([secTitle, fields]) => ({
        title: secTitle,
        items:
          fields && typeof fields === 'object'
            ? Object.entries(fields as Record<string, string>).map(([k, v]) => ({
                key: k,
                value: String(v),
              }))
            : [],
      }));
      setSpecSections(parsedSections.length > 0 ? parsedSections : defaultIfpSpecs);
    } else {
      setSpecSections(defaultIfpSpecs);
    }

    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const galleryArray = newProdGallery
        ? newProdGallery
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [newProdImage].filter(Boolean);

      const specifications: Record<string, Record<string, string>> = {};
      specSections.forEach((sec) => {
        if (sec.title.trim()) {
          const fields: Record<string, string> = {};
          sec.items.forEach((item) => {
            if (item.key.trim() && item.value.trim()) {
              fields[item.key.trim()] = item.value.trim();
            }
          });
          if (Object.keys(fields).length > 0) {
            specifications[sec.title.trim()] = fields;
          }
        }
      });

      const slugValue = newProdSlug || newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const finalBrand = isCustomBrand ? customBrandInput : newProdBrand;

      if (editingProductSlug) {
        // Update product via PUT
        const res = await fetch(`/api/products/${editingProductSlug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newProdName,
            slug: slugValue,
            category: newProdCategory,
            brand: finalBrand,
            price: Number(newProdPrice) || 0,
            image_url: newProdImage,
            images: galleryArray,
            description_intro: newProdIntro,
            specifications:
              Object.keys(specifications).length > 0
                ? specifications
                : { '1. GENERAL SPECIFICATIONS': { Type: 'Standard Product Specification' } },
          }),
        });

        if (res.ok) {
          showNotice('Product updated successfully in catalog & slug template!');
          setIsProductModalOpen(false);
          fetchProducts();
        } else {
          const d = await res.json();
          alert(d.error || 'Failed to update product');
        }
      } else {
        // Create new product via POST
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newProdName,
            slug: slugValue,
            category: newProdCategory,
            brand: finalBrand,
            price: Number(newProdPrice) || 0,
            image_url: newProdImage,
            images: galleryArray,
            description_intro: newProdIntro,
            specifications:
              Object.keys(specifications).length > 0
                ? specifications
                : { '1. GENERAL SPECIFICATIONS': { Type: 'Standard Product Specification' } },
          }),
        });

        if (res.ok) {
          showNotice('Product published successfully! Dynamic slug live.');
          setIsProductModalOpen(false);
          fetchProducts();
        } else {
          const d = await res.json();
          alert(d.error || 'Failed to create product');
        }
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${slug}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.slug !== slug));
        showNotice('Product deleted successfully.');
      } else {
        alert('Failed to delete product.');
      }
    } catch {
      alert('Error deleting product.');
    }
  };

  // User Actions
  const updateRole = async (id: number, role: string) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    setEditingUser(null);
    fetchUsers();
    showNotice('User role updated');
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const status = currentStatus === 'blocked' ? 'active' : 'blocked';
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    fetchUsers();
    showNotice(`User marked ${status}`);
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchUsers();
    showNotice('User deleted');
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  // Product Filter and Sort Computed
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
        p.slug.toLowerCase().includes(productSearchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'all' ||
        p.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesBrand =
        brandFilter === 'all' ||
        (p.brand && p.brand.toLowerCase() === brandFilter.toLowerCase());

      return matchesSearch && matchesCat && matchesBrand;
    });

    switch (productSortBy) {
      case 'price-asc':
        return result.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return result.sort((a, b) => Number(b.price) - Number(a.price));
      case 'title-asc':
        return result.sort((a, b) => a.name.localeCompare(b.name));
      case 'title-desc':
        return result.sort((a, b) => b.name.localeCompare(a.name));
      case 'oldest':
        return result.sort((a, b) => (a.id || 0) - (b.id || 0));
      case 'newest':
      default:
        return result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
  }, [products, productSearchQuery, categoryFilter, brandFilter, productSortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setAdminProdPage(1);
  }, [productSearchQuery, categoryFilter, brandFilter, productSortBy, adminProdPerPage]);

  useEffect(() => {
    setAdminUserPage(1);
  }, [userSearchQuery, adminUserPerPage]);

  // Available brands based on selected category filter
  const filterBrandsList = useMemo(() => {
    if (categoryFilter !== 'all' && NAVBAR_CATEGORIES_AND_BRANDS[categoryFilter]) {
      return NAVBAR_CATEGORIES_AND_BRANDS[categoryFilter];
    }
    const set = new Set<string>();
    products.forEach(p => { if (p.brand) set.add(p.brand); });
    return Array.from(set);
  }, [categoryFilter, products]);

  const modalCategoryBrands = NAVBAR_CATEGORIES_AND_BRANDS[newProdCategory] || [];

  // Product Pagination Calculations
  const prodTotalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / adminProdPerPage));
  const safeProdPage = Math.min(adminProdPage, prodTotalPages);
  const prodStartIndex = (safeProdPage - 1) * adminProdPerPage;
  const prodEndIndex = Math.min(prodStartIndex + adminProdPerPage, filteredAndSortedProducts.length);
  const paginatedProducts = filteredAndSortedProducts.slice(prodStartIndex, prodEndIndex);

  const getAdminProdPageNumbers = () => {
    const range: (number | string)[] = [];
    for (let i = 1; i <= prodTotalPages; i++) {
      if (
        i === 1 ||
        i === prodTotalPages ||
        (i >= safeProdPage - 1 && i <= safeProdPage + 1)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  // User Pagination Calculations
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / adminUserPerPage));
  const safeUserPage = Math.min(adminUserPage, userTotalPages);
  const userStartIndex = (safeUserPage - 1) * adminUserPerPage;
  const userEndIndex = Math.min(userStartIndex + adminUserPerPage, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(userStartIndex, userEndIndex);

  const getAdminUserPageNumbers = () => {
    const range: (number | string)[] = [];
    for (let i = 1; i <= userTotalPages; i++) {
      if (
        i === 1 ||
        i === userTotalPages ||
        (i >= safeUserPage - 1 && i <= safeUserPage + 1)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════
          FLOATING NOTIFICATION
      ═══════════════════════════════════════════════════════════════ */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 border border-slate-700">
          <span className="text-emerald-400">✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-orange-500/20">
              E
            </div>
            {sidebarOpen && (
              <div>
                <span className="font-black text-sm tracking-tight block text-white leading-none">
                  Ecommerce
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  Admin Console
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-xs transition-all ${
                activeTab === item.id
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && item.id === 'products' && products.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold border border-slate-700">
                  {products.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════ */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Analytics & Performance'}
              {activeTab === 'products' && 'Product Management (Navbar Categories & Brands)'}
              {activeTab === 'users' && 'User Directory & Roles'}
              {activeTab === 'settings' && 'Platform Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/product-page"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <span>View Product Catalog</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs shadow-sm">
              AD
            </div>
          </div>
        </header>

        {/* Tab Body */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* ═══════════════════════════════════════════════════════════
              TAB: ANALYTICS
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Overview & Performance
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Summary of your store products, users, and catalog readiness.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Live Products
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{products.length}</p>
                  <p className="text-[11px] text-orange-600 mt-1 font-semibold">
                    Dynamic next.js slug products
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Registered Users
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{users.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Stored in MySQL database
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-orange-200 bg-orange-50/40 shadow-sm">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                    Navbar Categories
                  </p>
                  <p className="text-3xl font-black text-orange-600 mt-2">
                    {Object.keys(NAVBAR_CATEGORIES_AND_BRANDS).length}
                  </p>
                  <p className="text-[11px] text-orange-700 mt-1 font-semibold">
                    Supported product lines
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="mt-3 w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB: PRODUCT MANAGEMENT
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Top Controls Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Product Catalog & Slug Management
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage products categorized under Navbar lines (Phones, Laptops, Digital Boards, Audio, Cameras, etc.) with dynamic slug templates.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchProducts}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      title="Refresh products"
                    >
                      <RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={openCreateModal}
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add New Product</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search Input */}
                    <div className="relative min-w-[220px] flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Search name, category, brand, slug..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-500 transition-all"
                      />
                      {productSearchQuery && (
                        <button
                          onClick={() => setProductSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Category Filter */}
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setBrandFilter('all');
                      }}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="all">All Categories ({products.length})</option>
                      {Object.keys(NAVBAR_CATEGORIES_AND_BRANDS).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* Brand Filter */}
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="all">All Brands</option>
                      {filterBrandsList.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>

                    {/* Sort Filter */}
                    <select
                      value={productSortBy}
                      onChange={(e) => setProductSortBy(e.target.value)}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="newest">Sort: Newest First</option>
                      <option value="oldest">Sort: Oldest First</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="title-asc">Alphabetical: A-Z</option>
                      <option value="title-desc">Alphabetical: Z-A</option>
                    </select>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <span className="text-xs text-slate-400 font-semibold mr-1">
                      {filteredAndSortedProducts.length} items
                    </span>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'grid'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Grid view"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'table'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Table view"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Display */}
              {productsLoading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-500">Loading catalog products...</p>
                </div>
              ) : filteredAndSortedProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto text-2xl">
                    📦
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">No products found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {productSearchQuery || categoryFilter !== 'all' || brandFilter !== 'all'
                        ? 'Try clearing your search query or filters to view all products.'
                        : 'Your product catalog is currently empty. Click the button below to add your first product.'}
                    </p>
                  </div>
                  <button
                    onClick={openCreateModal}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add New Product
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {viewMode === 'grid' ? (
                    /* GRID VIEW */
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
                        >
                          <div>
                            {/* Image Preview */}
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-4 relative border border-slate-100">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                                  <span className="text-[11px]">No Image</span>
                                </div>
                              )}
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-orange-700 shadow-sm border border-slate-100 backdrop-blur-sm">
                                  {p.category}
                                </span>
                                {p.brand && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/90 text-white shadow-sm backdrop-blur-sm">
                                    {p.brand}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title & Price */}
                            <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-snug">
                              {p.name}
                            </h3>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                              /product/{p.slug}
                            </p>
                            <p className="text-base font-black text-slate-900 mt-2">
                              {Number(p.price) > 0
                                ? `₹${Number(p.price).toLocaleString('en-IN')}`
                                : 'Price on Request'}
                            </p>
                          </div>

                          {/* Card Action Row */}
                          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                            <Link
                              href={`/product/${p.slug}`}
                              target="_blank"
                              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                            >
                              <span>Live View</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.slug)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* TABLE VIEW */
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-4">Product</th>
                              <th className="px-6 py-4">Category & Brand</th>
                              <th className="px-6 py-4">Price</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paginatedProducts.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                      {p.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={p.image_url}
                                          alt={p.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                                        {p.name}
                                      </p>
                                      <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                                        /product/{p.slug}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 w-fit">
                                      {p.category}
                                    </span>
                                    {p.brand && (
                                      <span className="text-[11px] font-bold text-slate-500">
                                        Brand: {p.brand}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-900">
                                  {Number(p.price) > 0
                                    ? `₹${Number(p.price).toLocaleString('en-IN')}`
                                    : 'On Request'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Link
                                      href={`/product/${p.slug}`}
                                      target="_blank"
                                      className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                                      title="View on Live Site"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Link>
                                    <button
                                      onClick={() => openEditModal(p)}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                      title="Edit Product"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.slug)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════════════════════
                      BOTTOM PAGINATION CONTROLS (PRODUCT MANAGEMENT)
                  ═══════════════════════════════════════════════════════════ */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs text-slate-500 font-semibold">
                        Showing <span className="font-bold text-slate-900">{prodStartIndex + 1}</span>–
                        <span className="font-bold text-slate-900">{prodEndIndex}</span> of{' '}
                        <span className="font-bold text-slate-900">{filteredAndSortedProducts.length}</span> products
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pl-3 border-l border-slate-200">
                        <span>Items per page:</span>
                        <select
                          value={adminProdPerPage}
                          onChange={(e) => {
                            setAdminProdPerPage(Number(e.target.value));
                            setAdminProdPage(1);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value={6}>6</option>
                          <option value={9}>9</option>
                          <option value={12}>12</option>
                          <option value={24}>24</option>
                          <option value={48}>48</option>
                        </select>
                      </div>
                    </div>

                    {/* Pagination Buttons */}
                    {prodTotalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        {/* Jump First */}
                        {safeProdPage > 2 && (
                          <button
                            onClick={() => setAdminProdPage(1)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                            title="First Page"
                          >
                            <ChevronsLeft className="w-4 h-4" />
                          </button>
                        )}

                        {/* Previous */}
                        <button
                          onClick={() => setAdminProdPage((p) => Math.max(1, p - 1))}
                          disabled={safeProdPage === 1}
                          className="px-2.5 h-8 flex items-center gap-1 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Prev</span>
                        </button>

                        {/* Page Numbers */}
                        {getAdminProdPageNumbers().map((item, idx) => {
                          if (item === '...') {
                            return (
                              <span key={`prod-dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400">
                                ...
                              </span>
                            );
                          }
                          const pageNum = item as number;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setAdminProdPage(pageNum)}
                              className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                                safeProdPage === pageNum
                                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-black scale-105'
                                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {/* Next */}
                        <button
                          onClick={() => setAdminProdPage((p) => Math.min(prodTotalPages, p + 1))}
                          disabled={safeProdPage === prodTotalPages}
                          className="px-2.5 h-8 flex items-center gap-1 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                        >
                          <span className="hidden xs:inline">Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Jump Last */}
                        {safeProdPage < prodTotalPages - 1 && (
                          <button
                            onClick={() => setAdminProdPage(prodTotalPages)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                            title="Last Page"
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB: USER MANAGEMENT
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    User Management
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage registered users, update permissions, and monitor activity.
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs border border-slate-200 outline-none focus:border-orange-500 w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {usersLoading ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-bold">
                    Loading users...
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Joined</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            user.status === 'blocked' ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-black">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{user.email}</td>
                          <td className="px-6 py-4">
                            {editingUser?.id === user.id ? (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={editingUser.role}
                                  onChange={(e) =>
                                    setEditingUser({ id: user.id, role: e.target.value })
                                  }
                                  className="text-xs border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-orange-500"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button
                                  onClick={() => updateRole(user.id, editingUser.role)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingUser(null)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                                    user.role === 'admin'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                                user.status === 'blocked'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {user.status === 'blocked' ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(user.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingUser({ id: user.id, role: user.role })}
                                title="Change Role"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleStatus(user.id, user.status)}
                                title={user.status === 'blocked' ? 'Unblock User' : 'Block User'}
                                className={`p-2 rounded-xl transition-colors ${
                                  user.status === 'blocked'
                                    ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                }`}
                              >
                                {user.status === 'blocked' ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  <ShieldOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                title="Delete User"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  BOTTOM PAGINATION CONTROLS (USERS)
              ═══════════════════════════════════════════════════════════ */}
              {filteredUsers.length > 0 && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500 font-semibold">
                      Showing <span className="font-bold text-slate-900">{userStartIndex + 1}</span>–
                      <span className="font-bold text-slate-900">{userEndIndex}</span> of{' '}
                      <span className="font-bold text-slate-900">{filteredUsers.length}</span> users
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pl-3 border-l border-slate-200">
                      <span>Per page:</span>
                      <select
                        value={adminUserPerPage}
                        onChange={(e) => {
                          setAdminUserPerPage(Number(e.target.value));
                          setAdminUserPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {userTotalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAdminUserPage((p) => Math.max(1, p - 1))}
                        disabled={safeUserPage === 1}
                        className="px-2.5 h-8 flex items-center gap-1 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Prev</span>
                      </button>

                      {getAdminUserPageNumbers().map((item, idx) => {
                        if (item === '...') {
                          return (
                            <span key={`user-dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400">
                              ...
                            </span>
                          );
                        }
                        const pageNum = item as number;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setAdminUserPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                              safeUserPage === pageNum
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-black'
                                : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setAdminUserPage((p) => Math.min(userTotalPages, p + 1))}
                        disabled={safeUserPage === userTotalPages}
                        className="px-2.5 h-8 flex items-center gap-1 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                      >
                        <span className="hidden xs:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB: SETTINGS
          ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Platform Settings & Navigation Sync
              </h2>
              <div className="space-y-4 max-w-xl text-xs text-slate-600">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">Dynamic Routing Slug Support</p>
                  <p className="text-slate-500">
                    Next.js dynamic routes active at <code className="text-orange-600 font-bold">/product/[slug]</code>. Every product published with specifications is instantly accessible.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">Navbar & Category Synchronization</p>
                  <p className="text-slate-500">
                    All categories (Phones, Laptops, Digital Boards, Audio, Cameras, Monitors, etc.) and brands (Apple, HP, Samsung, ViewSonic, MAXHUB, boAt, Shure, Canon, etc.) are matched with the Navbar.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">Cloudinary Uploads</p>
                  <p className="text-slate-500">
                    Media is automatically uploaded to Cloudinary through the <code className="text-orange-600">/api/upload</code> endpoint.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT PRODUCT (With Navbar Categories & Brands)
      ═══════════════════════════════════════════════════════════════ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingProductSlug ? 'Edit Product Catalog Item' : 'Add New Product to Catalog'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set product details, cover photos, gallery images, and technical specification boxes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              {/* Row 1: Name & Price */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Product Title / Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => {
                      setNewProdName(e.target.value);
                      if (!editingProductSlug) {
                        setNewProdSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    placeholder="e.g. ViewSonic A14 75 Inch Interactive Digital Board"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Category (From Navbar) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => handleCategorySelectChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white cursor-pointer font-medium"
                  >
                    {Object.keys(NAVBAR_CATEGORIES_AND_BRANDS).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Brand Selection & Price */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Brand / Manufacturer
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBrand(!isCustomBrand);
                        if (!isCustomBrand) setCustomBrandInput(newProdBrand);
                      }}
                      className="text-[10.5px] font-semibold text-orange-600 underline"
                    >
                      {isCustomBrand ? '← Choose from Navbar Brands' : '+ Custom Brand'}
                    </button>
                  </div>

                  {isCustomBrand ? (
                    <input
                      type="text"
                      value={customBrandInput}
                      onChange={(e) => setCustomBrandInput(e.target.value)}
                      placeholder="e.g. Creators Mind / Custom Brand"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white font-medium"
                    />
                  ) : (
                    <select
                      value={newProdBrand}
                      onChange={(e) => setNewProdBrand(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white cursor-pointer font-medium"
                    >
                      {modalCategoryBrands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Price in INR (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="145000 (0 for Price on Request)"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white font-medium"
                    />
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    {Number(newProdPrice) > 0
                      ? `Display: ₹${Number(newProdPrice).toLocaleString('en-IN')}`
                      : 'Display: Price on Request'}
                  </p>
                </div>
              </div>

              {/* Row 3: Custom Slug */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Dynamic Page Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProdSlug}
                  onChange={(e) => setNewProdSlug(e.target.value)}
                  placeholder="e.g. viewsonic-a14-75-inch-digital-board"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-mono text-xs bg-white"
                />
                <p className="text-[10.5px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Dynamic Live URL:</span>
                  <span className="font-mono text-orange-600 font-bold">
                    /product/{newProdSlug || 'your-slug'}
                  </span>
                </p>
              </div>

              {/* Description Intro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Product Description / Introduction
                </label>
                <textarea
                  rows={3}
                  value={newProdIntro}
                  onChange={(e) => setNewProdIntro(e.target.value)}
                  placeholder="Transform traditional teaching and presentations into engaging interactive experiences with cutting-edge touch technology..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
                />
              </div>

              {/* Photos Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <ImageUploadField
                  label="Main Showcase Photo"
                  value={newProdImage}
                  onChange={setNewProdImage}
                  required={true}
                  helperText="Primary high-resolution photo displayed on product cards and main detail view (uploaded to Cloudinary)."
                />

                <MultiImageUploadField
                  label="Gallery Photos (Multiple Views)"
                  value={newProdGallery}
                  onChange={setNewProdGallery}
                />
              </div>

              {/* ═══════════════════════════════════════════════════════
                  DYNAMIC TECHNICAL SPECIFICATIONS BUILDER
              ═══════════════════════════════════════════════════════ */}
              <div className="pt-6 border-t border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      Technical Specifications Builder
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add custom sections, editable titles, and attribute boxes with &quot;+ Add Box&quot; and &quot;✕ Delete Section&quot;.
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className="text-slate-400 mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSpecSections(defaultIfpSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      📺 Digital Board
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections(laptopSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      💻 Laptop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections(phoneSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      📱 Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections(wirelessAudioSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      🎧 Airbuds
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections(cameraSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      📹 Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections(micSpecs)}
                      className="px-2.5 py-1 bg-white hover:bg-purple-50 hover:text-purple-600 rounded-lg text-slate-700 transition-colors border border-slate-200 shadow-sm"
                    >
                      🎙️ Mic
                    </button>
                  </div>
                </div>

                {/* Render Each Editable Specification Section */}
                <div className="space-y-4">
                  {specSections.map((sec, secIdx) => {
                    const sectionColors = [
                      'bg-orange-600',
                      'bg-indigo-600',
                      'bg-orange-600',
                      'bg-pink-600',
                      'bg-purple-600',
                      'bg-amber-600',
                    ];
                    const dotColor = sectionColors[secIdx % sectionColors.length];

                    return (
                      <div
                        key={secIdx}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-3 shadow-sm"
                      >
                        {/* Section Header: Editable Title + Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className={`w-3 h-3 rounded-full ${dotColor} shrink-0`}></span>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => {
                                const updated = [...specSections];
                                updated[secIdx].title = e.target.value;
                                setSpecSections(updated);
                              }}
                              placeholder="e.g. 1. DISPLAY SPECIFICATIONS"
                              className="font-bold text-xs text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-orange-500 w-full max-w-md uppercase tracking-wider"
                            />
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...specSections];
                                updated[secIdx].items.push({ key: '', value: '' });
                                setSpecSections(updated);
                              }}
                              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 px-3 py-1 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <span>+ Add Box</span>
                            </button>
                            {specSections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecSections(specSections.filter((_, idx) => idx !== secIdx));
                                }}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2.5 py-1 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shadow-sm"
                              >
                                ✕ Delete Section
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Grid of Editable Boxes */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sec.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1.5 relative group"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <input
                                  type="text"
                                  value={item.key}
                                  onChange={(e) => {
                                    const updated = [...specSections];
                                    updated[secIdx].items[itemIdx].key = e.target.value;
                                    setSpecSections(updated);
                                  }}
                                  placeholder="Attribute Name (e.g. Screen Size)"
                                  className="w-full text-[11px] font-bold text-slate-700 outline-none border-b border-transparent focus:border-orange-500 py-0.5"
                                />
                                {sec.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...specSections];
                                      updated[secIdx].items = updated[secIdx].items.filter(
                                        (_, idx) => idx !== itemIdx
                                      );
                                      setSpecSections(updated);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 text-xs px-1 font-bold"
                                    title="Remove this box"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={item.value}
                                onChange={(e) => {
                                  const updated = [...specSections];
                                  updated[secIdx].items[itemIdx].value = e.target.value;
                                  setSpecSections(updated);
                                }}
                                placeholder="Value (e.g. 75 Inch 4K UHD)"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none bg-slate-50 focus:bg-white focus:border-orange-500 text-slate-800 font-medium"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Section Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = specSections.length + 1;
                    setSpecSections([
                      ...specSections,
                      {
                        title: `${nextNum}. CUSTOM SPECIFICATIONS`,
                        items: [
                          { key: 'Feature', value: '' },
                          { key: 'Details', value: '' },
                        ],
                      },
                    ]);
                  }}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Another Specification Section / Category</span>
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50"
                >
                  {savingProduct
                    ? 'Saving Product...'
                    : editingProductSlug
                    ? 'Update Product Catalog →'
                    : 'Publish Dynamic Product →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
