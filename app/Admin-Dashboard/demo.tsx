"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface AdminStats {
  totalUsers: number;
  totalInquiries: number;
  newInquiries: number;
  contactedInquiries: number;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  phone?: string | null;
  company?: string | null;
  created_at: string;
}

interface ProductItem {
  id: number;
  name: string;
  slug: string;
  category: string;
  price: number;
  rating: number;
  image_url: string;
  images: string[];
  description_intro?: string;
  created_at: string;
}

interface BlogItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  cover_image?: string;
  excerpt?: string;
  content: string;
  author: string;
  published: boolean;
  created_at: string;
}

interface InternshipItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  openings: number;
  description: string;
  skills: string[];
  image: string;
  color?: string;
  active?: boolean;
  created_at: string;
}

interface Inquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  product_category: string;
  brand?: string;
  state?: string;
  city?: string;
  message?: string;
  status: "NEW" | "CONTACTED" | "IN_PROGRESS" | "CLOSED";
  created_at: string;
}

interface SpecItem {
  key: string;
  value: string;
}

interface SpecSection {
  title: string;
  items: SpecItem[];
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE UPLOAD DROPZONE COMPONENTS (CLOUDINARY POWERED)
═══════════════════════════════════════════════════════════════ */
function ImageUploadField({
  label,
  value,
  onChange,
  folder = "products",
  helperText,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  helperText?: string;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [useManualUrl, setUseManualUrl] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err?.message || "Failed to upload image.");
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
          onClick={() => setUseManualUrl(!useManualUrl)}
          className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
        >
          {useManualUrl ? "← Switch to Photo Upload" : "Or Paste URL"}
        </button>
      </div>

      {useManualUrl ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
        />
      ) : (
        <div className="space-y-2">
          {value ? (
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">Image uploaded successfully</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{value}</p>
                <span className="inline-block mt-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Ready
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 text-xs transition-colors shrink-0 font-bold"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl cursor-pointer bg-slate-50/70 hover:bg-orange-50/20 transition-all text-center group">
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
                  <p className="text-[10.5px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 10MB</p>
                </div>
              )}
            </label>
          )}

          {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
        </div>
      )}

      {helperText && <p className="text-[10.5px] text-slate-400">{helperText}</p>}
    </div>
  );
}

function MultiImageUploadField({
  label,
  value,
  onChange,
  folder = "products",
}: {
  label: string;
  value: string;
  onChange: (csvUrls: string) => void;
  folder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [useManualUrl, setUseManualUrl] = useState(false);

  const urls = value
    ? value
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError("");
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      const combined = [...urls, ...uploadedUrls].join(", ");
      onChange(combined);
    } catch (err: any) {
      setError(err?.message || "Failed to upload gallery images.");
    } finally {
      setUploading(false);
    }
  };

  const removeUrl = (idxToRemove: number) => {
    const remaining = urls.filter((_, idx) => idx !== idxToRemove);
    onChange(remaining.join(", "));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase">{label}</label>
        <button
          type="button"
          onClick={() => setUseManualUrl(!useManualUrl)}
          className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
        >
          {useManualUrl ? "← Switch to Photo Upload" : "Or Paste URLs"}
        </button>
      </div>

      {useManualUrl ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://image1.jpg, https://image2.jpg"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
        ></textarea>
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

          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl cursor-pointer bg-slate-50/70 hover:bg-orange-50/20 transition-all text-center">
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
                📸 + Upload Gallery Photos (Multiple Selection)
              </span>
            )}
          </label>

          {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function EduPressAdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<"dashboard" | "users" | "products" | "blogs" | "internships" | "inquiries">("users");

  /*
    Off-canvas state for the sidebar, below lg only.

    Centralised in a `go` helper rather than passed to each nav button, because
    there are six of them and forgetting the close in one leaves the drawer
    covering the page the visitor just asked for.
  */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const go = useCallback((view: typeof activeNav) => {
    setActiveNav(view);
    setSidebarOpen(false);
  }, []);
  const [currentAdmin, setCurrentAdmin] = useState<{ name: string; email: string } | null>(null);
  
  // Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [internships, setInternships] = useState<InternshipItem[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState("");

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSlug, setNewProdSlug] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("interactive-flat-panel");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdGallery, setNewProdGallery] = useState("");
  const [newProdIntro, setNewProdIntro] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Dynamic Technical Specifications State
  const defaultIfpSpecs: SpecSection[] = [
    {
      title: "1. DISPLAY SPECIFICATIONS",
      items: [
        { key: "Screen Size", value: "" },
        { key: "Resolution", value: "" },
        { key: "Brightness", value: "" },
        { key: "Viewing Angle", value: "" },
        { key: "Touch Technology", value: "" },
        { key: "Glass Type", value: "" },
      ],
    },
    {
      title: "2. PERFORMANCE & HARDWARE",
      items: [
        { key: "Processor", value: "" },
        { key: "RAM", value: "" },
        { key: "Operating System", value: "" },
        { key: "Storage", value: "" },
      ],
    },
    {
      title: "3. CONNECTIVITY & PORTS",
      items: [
        { key: "HDMI Ports", value: "" },
        { key: "USB Ports", value: "" },
        { key: "Wi-Fi & Bluetooth", value: "" },
      ],
    },
    {
      title: "4. PHYSICAL & MOUNTING",
      items: [
        { key: "Dimensions & Weight", value: "" },
        { key: "Mounting", value: "" },
      ],
    },
  ];

  const [specSections, setSpecSections] = useState<SpecSection[]>(defaultIfpSpecs);

  // Blog Modal State
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogSlug, setNewBlogSlug] = useState("");
  const [newBlogCategory, setNewBlogCategory] = useState("Digital Boards");
  const [newBlogImage, setNewBlogImage] = useState("");
  const [newBlogAuthor, setNewBlogAuthor] = useState("");
  const [newBlogAuthorRole, setNewBlogAuthorRole] = useState("Founder & CEO");
  const [newBlogAuthorAvatar, setNewBlogAuthorAvatar] = useState("");
  const [newBlogReadTime, setNewBlogReadTime] = useState("8 min read");
  const [newBlogTags, setNewBlogTags] = useState("Digital Board, Smart Classroom, EdTech");
  const [newBlogExcerpt, setNewBlogExcerpt] = useState("");
  const [newBlogContent, setNewBlogContent] = useState("");
  const [newBlogSections, setNewBlogSections] = useState<{ title: string; content: string }[]>([
    { title: "", content: "" }
  ]);
  const [savingBlog, setSavingBlog] = useState(false);

  // Internship Modal State
  const [isInternshipModalOpen, setIsInternshipModalOpen] = useState(false);
  const [newInternTitle, setNewInternTitle] = useState("");
  const [newInternSlug, setNewInternSlug] = useState("");
  const [newInternCategory, setNewInternCategory] = useState("development");
  const [newInternOpenings, setNewInternOpenings] = useState("10");
  const [newInternSkills, setNewInternSkills] = useState("");
  const [newInternDescription, setNewInternDescription] = useState("");
  const [newInternImage, setNewInternImage] = useState("");
  const [savingInternship, setSavingInternship] = useState(false);

  const fetchAllData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      if (!meData.user || meData.user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
      setCurrentAdmin(meData.user);

      const [statsRes, usersRes, prodRes, blogRes, internRes, inqRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/products"),
        fetch("/api/blogs"),
        fetch("/api/internships"),
        fetch("/api/admin/inquiries"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);
      }
      if (blogRes.ok) {
        const bData = await blogRes.json();
        setBlogs(bData.blogs || []);
      }
      if (internRes.ok) {
        const iData = await internRes.json();
        setInternships(iData.internships || []);
      }
      if (inqRes.ok) {
        const inqData = await inqRes.json();
        setInquiries(inqData.inquiries || []);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleRoleChange = async (userId: number, newRole: "USER" | "ADMIN") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showNotice(`User role updated to ${newRole}`);
      }
    } catch {
      // ignore
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const galleryArray = newProdGallery
        ? newProdGallery.split(",").map((s) => s.trim()).filter(Boolean)
        : [newProdImage];

      const specifications: Record<string, Record<string, string>> = {};
      specSections.forEach((sec) => {
        if (sec.title.trim()) {
          const fieldsObj: Record<string, string> = {};
          sec.items.forEach((item) => {
            if (item.key.trim() && item.value.trim()) {
              fieldsObj[item.key.trim()] = item.value.trim();
            }
          });
          if (Object.keys(fieldsObj).length > 0) {
            specifications[sec.title.trim()] = fieldsObj;
          }
        }
      });

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName,
          slug: newProdSlug || newProdName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: newProdCategory,
          price: Number(newProdPrice) || 0,
          image_url: newProdImage,
          images: galleryArray,
          description_intro: newProdIntro,
          description_sections: [
            {
              title: "Product Highlights",
              content: newProdIntro || "Engineered for high performance and durability in educational and corporate setups.",
            },
          ],
          specifications: Object.keys(specifications).length > 0 ? specifications : {
            "1. GENERAL SPECIFICATIONS": { "Type": "Standard Product Specification" },
          },
        }),
      });

      if (res.ok) {
        showNotice("Product created successfully!");
        setIsProductModalOpen(false);
        setNewProdName("");
        setNewProdSlug("");
        setNewProdPrice("");
        setNewProdImage("");
        setNewProdGallery("");
        setNewProdIntro("");
        setSpecSections(defaultIfpSpecs);
        fetchAllData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create product");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.slug !== slug));
        showNotice("Product deleted.");
      }
    } catch {
      // ignore
    }
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBlog(true);
    try {
      const parsedTags = newBlogTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const validSections = newBlogSections.filter(
        (s) => s.title.trim() || s.content.trim()
      );

      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newBlogTitle,
          slug: newBlogSlug || newBlogTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: newBlogCategory,
          cover_image: newBlogImage,
          author: newBlogAuthor || currentAdmin?.name || "Ecommerce Team",
          author_role: newBlogAuthorRole || "Editorial Team",
          author_avatar: newBlogAuthorAvatar || null,
          read_time: newBlogReadTime || "8 min read",
          tags: parsedTags,
          sections: validSections,
          excerpt: newBlogExcerpt,
          content: newBlogContent,
        }),
      });

      if (res.ok) {
        showNotice("Blog published successfully!");
        setIsBlogModalOpen(false);
        setNewBlogTitle("");
        setNewBlogSlug("");
        setNewBlogImage("");
        setNewBlogAuthor("");
        setNewBlogAuthorRole("Founder & CEO");
        setNewBlogAuthorAvatar("");
        setNewBlogReadTime("8 min read");
        setNewBlogTags("Digital Board, Smart Classroom, EdTech");
        setNewBlogExcerpt("");
        setNewBlogContent("");
        setNewBlogSections([{ title: "", content: "" }]);
        fetchAllData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to publish blog");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save blog");
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (slug: string) => {
    if (!confirm("Delete this blog article?")) return;
    try {
      const res = await fetch(`/api/blogs/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setBlogs((prev) => prev.filter((b) => b.slug !== slug));
        showNotice("Blog deleted.");
      }
    } catch {
      // ignore
    }
  };

  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInternship(true);
    try {
      const skillsArray = newInternSkills
        ? newInternSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : ["Professional Training", "Live Project"];

      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newInternTitle,
          slug: newInternSlug || newInternTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: newInternCategory,
          openings: parseInt(newInternOpenings) || 10,
          description: newInternDescription,
          skills: skillsArray,
          image: newInternImage || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop",
          color: "from-indigo-600 to-purple-700",
        }),
      });

      if (res.ok) {
        showNotice("Internship opening published successfully!");
        setIsInternshipModalOpen(false);
        setNewInternTitle("");
        setNewInternSlug("");
        setNewInternCategory("development");
        setNewInternOpenings("10");
        setNewInternSkills("");
        setNewInternDescription("");
        setNewInternImage("");
        fetchAllData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to publish internship");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save internship");
    } finally {
      setSavingInternship(false);
    }
  };

  const handleDeleteInternship = async (slug: string) => {
    if (!confirm("Delete this internship opening?")) return;
    try {
      const res = await fetch(`/api/internships?slug=${slug}`, { method: "DELETE" });
      if (res.ok) {
        setInternships((prev) => prev.filter((i) => i.slug !== slug));
        showNotice("Internship opening deleted.");
      }
    } catch {
      // ignore
    }
  };

  const handleInquiryStatus = async (id: number, status: string) => {
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: status as Inquiry["status"] } : i))
        );
        showNotice("Inquiry status updated.");
      }
    } catch {
      // ignore
    }
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-indigo-600 font-bold">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading Admin Console...</span>
        </div>
      </div>
    );
  }

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery))
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlogs = blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInternships = internships.filter(
    (i) =>
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInquiries = inquiries.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.phone.includes(searchQuery) ||
      i.product_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Avatar colors generator
  const getAvatarBg = (name: string) => {
    const colors = [
      "bg-amber-100 text-amber-700",
      "bg-orange-100 text-orange-700",
      "bg-emerald-100 text-emerald-700",
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-orange-100 text-orange-700",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800">
      
      {/*
        Off-canvas scrim for the sidebar.

        The sidebar is 256px, which is 68% of a 375px phone — the console was
        unusable below lg. Below lg it now slides off-canvas and sits above a
        scrim; from lg up it is permanently docked and the scrim never appears.
      */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
          LEFT SIDEBAR (EduPress Style)
      ═══════════════════════════════════════════════════════════════ */}
      <aside
        aria-label="Console navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md">
              N
            </div>
            <div>
              <span className="font-black text-slate-900 text-base leading-none block">Ecommerce</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Solutions Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-sm font-semibold">
            <button
              onClick={() => go("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "dashboard"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => go("users")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "users"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span>User Management</span>
            </button>

            <button
              onClick={() => go("products")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "products"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <span>Product Management</span>
            </button>

            <button
              onClick={() => go("blogs")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "blogs"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              <span>Blog Management</span>
            </button>

            <button
              onClick={() => go("internships")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "internships"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>Internship Management</span>
              {internships.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {internships.length}
                </span>
              )}
            </button>

            <button
              onClick={() => go("inquiries")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeNav === "inquiries"
                  ? "bg-orange-50 text-orange-600 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>Inquiries & Leads</span>
              {stats?.newInquiries ? (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {stats.newInquiries}
                </span>
              ) : null}
            </button>
          </nav>
        </div>

        {/* Bottom Profile Card */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200/60 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-900 truncate">Super Admin</p>
              <p className="text-[11px] text-slate-500 truncate">{currentAdmin?.email || "admin@ecommerce.com"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            {/* The sidebar's only way out on small screens. */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebarOpen}
              className="-ml-1 shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-xl">
              {activeNav === "dashboard" && "Dashboard Overview"}
              {activeNav === "users" && "User Management"}
              {activeNav === "products" && "Product Management"}
              {activeNav === "blogs" && "Blog Management"}
              {activeNav === "inquiries" && "Inquiries & Leads"}
            </h2>
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-500">
              <Link href="/" target="_blank" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <span>View Live Site</span>
                <span>↗</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative w-64 sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, products, leads..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Floating Notification */}
        {notification && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <span>✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="p-8 max-w-7xl w-full">

          {/* ═══════════════════════════════════════════════════════════
              SECTION 1: DASHBOARD OVERVIEW
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "dashboard" && (
            <div className="space-y-8">
              {/* Metric Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{stats?.totalUsers ?? users.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">Registered in MySQL database</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{products.length}</p>
                  <p className="text-[11px] text-orange-600 mt-1 font-semibold">Live across categories</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-sm">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">New Inquiries</p>
                  <p className="text-3xl font-black text-amber-600 mt-2">{stats?.newInquiries ?? 0}</p>
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold">Awaiting consultation call</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published Blogs</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{blogs.length}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">SEO articles live</p>
                </div>
              </div>

              {/* Recent Inquiries Quick Table */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900">Recent Customer Inquiries</h3>
                  <button onClick={() => go("inquiries")} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                    View All →
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {inquiries.slice(0, 5).map((inq) => (
                    <div key={inq.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{inq.name}</p>
                        <p className="text-xs text-slate-500">{inq.product_category} • {inq.phone}</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-700">{inq.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2: USER MANAGEMENT (Matches screenshot exactly)
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "users" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">User Management</h3>
                <button
                  onClick={fetchAllData}
                  className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <span>⟳</span>
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4">USER</th>
                      <th className="pb-4">CURRENT ROLE</th>
                      <th className="pb-4">CHANGE ROLE</th>
                      <th className="pb-4 text-right">LAST SIGN IN / CREATED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* User info with circle avatar */}
                        <td className="py-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase shrink-0 ${getAvatarBg(u.name)}`}>
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Current Role Badge */}
                        <td className="py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              u.role === "ADMIN"
                                ? "bg-rose-100 text-rose-600"
                                : "bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {u.role === "ADMIN" ? "Admin" : "Student / User"}
                          </span>
                        </td>

                        {/* Change Role Dropdown */}
                        <td className="py-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as "USER" | "ADMIN")}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="USER">Student / User</option>
                          </select>
                        </td>

                        {/* Last Sign In Date */}
                        <td className="py-4 text-right text-xs text-slate-500 font-medium">
                          {new Date(u.created_at).toLocaleString("en-US", {
                            month: "numeric",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            second: "numeric",
                            hour12: true,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3: PRODUCT MANAGEMENT (Dynamic Products)
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "products" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage product cards across category folders and dynamic product pages</p>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <span>+ Add New Product</span>
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No products found. Click &quot;Add New Product&quot; to create your first dynamic product.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 mb-3 relative">
                          <Image src={p.image_url} alt={p.name} width={400} height={300} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                          {p.category.replace(/-/g, " ")}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">{p.name}</h4>
                        <p className="text-xs font-black text-slate-800 mt-1">
                          {Number(p.price) > 0 ? `₹${Number(p.price).toLocaleString("en-IN")}` : "Price on Request"}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center justify-between">
                        <Link
                          href={`/product/${p.slug}`}
                          target="_blank"
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <span>Live View</span>
                          <span>↗</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(p.slug)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 4: BLOG MANAGEMENT
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "blogs" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Blog Management</h3>
                  <p className="text-xs text-slate-500 mt-1">Publish and manage education technology blog posts</p>
                </div>
                <button
                  onClick={() => setIsBlogModalOpen(true)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <span>+ Create Blog Article</span>
                </button>
              </div>

              {filteredBlogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No blogs published yet. Click &quot;Create Blog Article&quot; to publish your first article.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBlogs.map((b) => (
                    <div key={b.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{b.category}</span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">{b.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.excerpt || b.content.replace(/<[^>]*>?/gm, "")}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
                        <Link
                          href={`/blogs/${b.slug}`}
                          target="_blank"
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          View Post ↗
                        </Link>
                        <button
                          onClick={() => handleDeleteBlog(b.slug)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-lg hover:bg-rose-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 5: INTERNSHIP MANAGEMENT
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "internships" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Internship Management</h3>
                  <p className="text-xs text-slate-500 mt-1">Publish, edit, and manage career tracks and student internship openings</p>
                </div>
                <button
                  onClick={() => setIsInternshipModalOpen(true)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <span>+ Create Internship Opening</span>
                </button>
              </div>

              {filteredInternships.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No internship openings found. Click &quot;Create Internship Opening&quot; to add a new domain.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInternships.map((intern) => (
                    <div
                      key={intern.id || intern.slug}
                      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Cover Image */}
                        <div className="relative w-full aspect-[16/9] overflow-hidden bg-slate-900/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={intern.image || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop"}
                            alt={intern.title}
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent"></div>
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 text-slate-800 border border-slate-100 shadow-sm backdrop-blur-sm">
                              {intern.category}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-800 shadow-md border border-slate-100">
                            👥 {intern.openings} Openings
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-5">
                          <h4 className="text-base font-black text-slate-900 leading-snug">{intern.title}</h4>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5 mb-2">
                            ECOMMERCE INTERNSHIP
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{intern.description}</p>

                          {/* Skills */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {intern.skills.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-700">
                                {skill}
                              </span>
                            ))}
                            {intern.skills.length > 3 && (
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-400">
                                +{intern.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          href="/internship"
                          target="_blank"
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <span>Live Page</span>
                          <span>↗</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteInternship(intern.slug)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 6: INQUIRIES & LEADS
          ═══════════════════════════════════════════════════════════ */}
          {activeNav === "inquiries" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-8">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-6 pb-4 border-b border-slate-100">
                Customer Inquiries & Quote Leads
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Client Contact</th>
                      <th className="pb-3">Product Category</th>
                      <th className="pb-3">Location / Notes</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Quick Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-slate-900">{inq.name}</p>
                          <p className="text-xs text-slate-400">{inq.email}</p>
                          <p className="text-xs text-orange-600 font-bold mt-0.5">{inq.phone}</p>
                        </td>
                        <td className="py-4">
                          <p className="font-bold text-slate-800 text-xs">{inq.product_category}</p>
                          {inq.brand && <p className="text-[11px] text-slate-500">{inq.brand}</p>}
                        </td>
                        <td className="py-4 max-w-xs">
                          <p className="text-xs text-slate-700 font-medium">{inq.city ? `${inq.city}, ${inq.state || ""}` : "Not specified"}</p>
                          {inq.message && <p className="text-xs text-slate-400 truncate mt-1">&quot;{inq.message}&quot;</p>}
                        </td>
                        <td className="py-4">
                          <select
                            value={inq.status}
                            onChange={(e) => handleInquiryStatus(inq.id, e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a href={`tel:${inq.phone}`} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs" title="Call">
                              📞
                            </a>
                            <a href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs" title="WhatsApp">
                              💬
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADD NEW PRODUCT
      ═══════════════════════════════════════════════════════════════ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-5 shadow-2xl relative sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-1">Create New Product</h3>
            <p className="text-xs text-slate-500 mb-6">Fill in the product details and image URLs to generate a dynamic product card & page.</p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => {
                    setNewProdName(e.target.value);
                    if (!newProdSlug) {
                      setNewProdSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Benchmark Classic 75 Inch 4K Digital Board"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category Folder *</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500"
                  >
                    <option value="interactive-flat-panel">Interactive Flat Panel</option>
                    <option value="cameras">Cameras</option>
                    <option value="studio-setup-solution">Studio Setup Solution</option>
                    <option value="accessories">Accessories</option>
                    <option value="brochures">Brochures</option>
                    <option value="ai-tools">AI Tools</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Starting Price (₹)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="105000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Custom URL Slug *</label>
                <input
                  type="text"
                  required
                  value={newProdSlug}
                  onChange={(e) => setNewProdSlug(e.target.value)}
                  placeholder="e.g. benchmark-classic-75-ifp"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Live URL: /product/{newProdSlug || "your-slug"}</p>
              </div>

              <ImageUploadField
                label="Main Cover Photo"
                value={newProdImage}
                onChange={setNewProdImage}
                folder="products"
                required={true}
                helperText="Primary high-resolution product showcase photo."
              />

              <MultiImageUploadField
                label="Gallery Photos (Multiple)"
                value={newProdGallery}
                onChange={setNewProdGallery}
                folder="products_gallery"
              />

              {/* Dynamic Technical Specifications Section */}
              <div className="pt-4 border-t border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Technical Specifications Builder
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      All section titles and specification boxes below are 100% editable. Customize them for digital boards, wireless earphones, cameras, or accessories.
                    </p>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="text-slate-400 self-center mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSpecSections(defaultIfpSpecs)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 transition-colors border border-slate-200"
                    >
                      📺 IFP / Digital Board
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections([
                        {
                          title: "1. AUDIO & SOUND DRIVERS",
                          items: [
                            { key: "Driver Size", value: "13mm Dynamic Drivers" },
                            { key: "Frequency Response", value: "20 Hz - 20,000 Hz" },
                            { key: "Active Noise Cancellation", value: "Up to 32dB Hybrid ANC" },
                            { key: "Microphone", value: "Quad-Mic with ENC Noise Filtering" },
                          ],
                        },
                        {
                          title: "2. BATTERY & CHARGING",
                          items: [
                            { key: "Earbuds Playtime", value: "Up to 8 Hours" },
                            { key: "Total Case Playtime", value: "Up to 36 Hours" },
                            { key: "Charging Port", value: "Type-C Fast Charging" },
                            { key: "Fast Charging", value: "10 mins charge = 2 hours playback" },
                          ],
                        },
                        {
                          title: "3. WIRELESS & CONNECTIVITY",
                          items: [
                            { key: "Bluetooth Version", value: "Bluetooth v5.3" },
                            { key: "Wireless Range", value: "10 Meters (33 ft)" },
                            { key: "Supported Audio Codecs", value: "AAC, SBC" },
                            { key: "Low Latency Gaming Mode", value: "45ms Ultra-Low Latency" },
                          ],
                        },
                        {
                          title: "4. BUILD & WARRANTY",
                          items: [
                            { key: "Water Resistance", value: "IPX5 Sweat & Splash Proof" },
                            { key: "Earbud Weight", value: "4.2g per earbud" },
                            { key: "Package Contents", value: "Earbuds, Case, Type-C Cable, 3 Ear Tips" },
                            { key: "Warranty", value: "1 Year Replacement Warranty" },
                          ],
                        },
                      ])}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-700 transition-colors border border-slate-200"
                    >
                      🎧 Wireless Earphones / Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecSections([
                        {
                          title: "1. OPTICS & SENSOR",
                          items: [
                            { key: "Sensor Type", value: "1/2.8 inch 4K Ultra HD CMOS" },
                            { key: "Optical Zoom", value: "12X / 20X Optical Zoom" },
                            { key: "Resolution & FPS", value: "4K @ 30fps / 1080p @ 60fps" },
                            { key: "Field of View (FOV)", value: "72.5° Wide Angle" },
                          ],
                        },
                        {
                          title: "2. PAN, TILT & TRACKING",
                          items: [
                            { key: "Pan Range", value: "±170° Continuous" },
                            { key: "Tilt Range", value: "-30° to +90°" },
                            { key: "AI Auto-Tracking", value: "Presenter Auto-Tracking" },
                            { key: "Preset Positions", value: "Up to 255 Presets" },
                          ],
                        },
                        {
                          title: "3. CONNECTIVITY & OUTPUT",
                          items: [
                            { key: "Video Outputs", value: "HDMI 2.0, USB 3.0, IP / LAN RJ45" },
                            { key: "PoE Support", value: "PoE (Power over Ethernet)" },
                            { key: "Control Protocol", value: "VISCA / Pelco-D / IP" },
                          ],
                        },
                        {
                          title: "4. PHYSICAL & COMPATIBILITY",
                          items: [
                            { key: "Mounting", value: "Tripod, Wall Mount, Ceiling Mount" },
                            { key: "Compatibility", value: "Zoom, Teams, OBS Studio" },
                          ],
                        },
                      ])}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 transition-colors border border-slate-200"
                    >
                      📹 Cameras & Optics
                    </button>
                  </div>
                </div>

                {/* Render Each Editable Specification Section */}
                <div className="space-y-5">
                  {specSections.map((sec, secIdx) => {
                    const sectionColors = ["bg-orange-600", "bg-indigo-600", "bg-orange-600", "bg-pink-600", "bg-purple-600", "bg-amber-600"];
                    const dotColor = sectionColors[secIdx % sectionColors.length];

                    return (
                      <div key={secIdx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                        {/* Section Header: Editable Title + Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <div className="flex items-center gap-2 flex-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></span>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => {
                                const updated = [...specSections];
                                updated[secIdx].title = e.target.value;
                                setSpecSections(updated);
                              }}
                              placeholder="e.g. 1. AUDIO & SOUND SPECIFICATIONS"
                              className="font-bold text-xs text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-orange-500 w-full max-w-md uppercase tracking-wider"
                            />
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...specSections];
                                updated[secIdx].items.push({ key: "", value: "" });
                                setSpecSections(updated);
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                              + Add Box
                            </button>
                            {specSections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecSections(specSections.filter((_, idx) => idx !== secIdx));
                                }}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                ✕ Delete Section
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Grid of Editable Boxes */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sec.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5 relative group">
                              <div className="flex items-center justify-between gap-1">
                                <input
                                  type="text"
                                  value={item.key}
                                  onChange={(e) => {
                                    const updated = [...specSections];
                                    updated[secIdx].items[itemIdx].key = e.target.value;
                                    setSpecSections(updated);
                                  }}
                                  placeholder="Attribute Name (e.g. Battery Life)"
                                  className="w-full text-[11px] font-bold text-slate-700 outline-none border-b border-transparent focus:border-orange-500 py-0.5"
                                />
                                {sec.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...specSections];
                                      updated[secIdx].items = updated[secIdx].items.filter((_, idx) => idx !== itemIdx);
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
                                placeholder="Value (e.g. 30 Hours / IPX5)"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs outline-none bg-slate-50 focus:bg-white focus:border-orange-500 text-slate-800 font-medium"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Button to Add New Specification Section */}
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = specSections.length + 1;
                    setSpecSections([
                      ...specSections,
                      {
                        title: `${nextNum}. CUSTOM SPECIFICATIONS`,
                        items: [
                          { key: "Feature", value: "" },
                          { key: "Details", value: "" },
                        ],
                      },
                    ]);
                  }}
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-500 hover:text-orange-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>+ Add Another Specification Section / Category</span>
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {savingProduct ? "Publishing Product..." : "Publish Product →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADD NEW BLOG
      ═══════════════════════════════════════════════════════════════ */}
      {isBlogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-5 shadow-2xl relative sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsBlogModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-1">Create Blog Article</h3>
            <p className="text-xs text-slate-500 mb-6">Write and publish an informative blog post for your education customers.</p>

            <form onSubmit={handleCreateBlog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={newBlogTitle}
                  onChange={(e) => {
                    setNewBlogTitle(e.target.value);
                    if (!newBlogSlug) setNewBlogSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                  }}
                  placeholder="e.g. 5 Benefits of 4K Interactive Flat Panels in Hybrid Classrooms"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={newBlogCategory}
                    onChange={(e) => setNewBlogCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="Digital Boards">Digital Boards</option>
                    <option value="Studio Setup">Studio Setup</option>
                    <option value="Cameras">Cameras</option>
                    <option value="Audio">Audio</option>
                    <option value="App Development">App Development</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Online Teaching">Online Teaching</option>
                    <option value="Product Reviews">Product Reviews</option>
                  </select>
                </div>
              </div>

              <ImageUploadField
                label="Article Cover Photo"
                value={newBlogImage}
                onChange={setNewBlogImage}
                folder="blogs"
                helperText="Main header banner for the blog article."
              />

              {/* Author & Meta Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Author & Reading Info</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={newBlogAuthor}
                      onChange={(e) => setNewBlogAuthor(e.target.value)}
                      placeholder="Mohitsh Vats"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Author Role</label>
                    <input
                      type="text"
                      value={newBlogAuthorRole}
                      onChange={(e) => setNewBlogAuthorRole(e.target.value)}
                      placeholder="Founder & CEO"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Estimated Read Time</label>
                    <input
                      type="text"
                      value={newBlogReadTime}
                      onChange={(e) => setNewBlogReadTime(e.target.value)}
                      placeholder="8 min read"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <ImageUploadField
                      label="Author Profile Photo"
                      value={newBlogAuthorAvatar}
                      onChange={setNewBlogAuthorAvatar}
                      folder="authors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tags (Comma Separated)</label>
                    <input
                      type="text"
                      value={newBlogTags}
                      onChange={(e) => setNewBlogTags(e.target.value)}
                      placeholder="Digital Board, Smart Classroom, EdTech"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Short Excerpt / Summary</label>
                <textarea
                  rows={2}
                  value={newBlogExcerpt}
                  onChange={(e) => setNewBlogExcerpt(e.target.value)}
                  placeholder="A quick 1-2 sentence preview for the card and search engines..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Main Article Content / Introduction *</label>
                <textarea
                  rows={5}
                  required
                  value={newBlogContent}
                  onChange={(e) => setNewBlogContent(e.target.value)}
                  placeholder="<p>Write your main introduction and article body here...</p>"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 font-mono text-xs"
                ></textarea>
              </div>

              {/* Dynamic Article Sections Builder */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Subheadings & Sections (Optional)</p>
                  <button
                    type="button"
                    onClick={() => setNewBlogSections([...newBlogSections, { title: "", content: "" }])}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    + Add Section
                  </button>
                </div>

                {newBlogSections.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Section {idx + 1}</span>
                      {newBlogSections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewBlogSections(newBlogSections.filter((_, i) => i !== idx))}
                          className="text-xs text-rose-500 font-bold hover:text-rose-700"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => {
                        const updated = [...newBlogSections];
                        updated[idx].title = e.target.value;
                        setNewBlogSections(updated);
                      }}
                      placeholder="e.g. Why Choose 4K Interactive Displays?"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold outline-none focus:border-orange-500"
                    />
                    <textarea
                      rows={3}
                      value={sec.content}
                      onChange={(e) => {
                        const updated = [...newBlogSections];
                        updated[idx].content = e.target.value;
                        setNewBlogSections(updated);
                      }}
                      placeholder="<p>Detailed explanation, key points, or list for this section...</p>"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-orange-500 font-mono"
                    ></textarea>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBlogModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBlog}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {savingBlog ? "Saving..." : "Publish Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADD NEW INTERNSHIP OPENING
      ═══════════════════════════════════════════════════════════════ */}
      {isInternshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-5 shadow-2xl relative sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsInternshipModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-1">Create Internship Opening</h3>
            <p className="text-xs text-slate-500 mb-6">
              Publish a new student/fresher career track with role specifications and cover photo.
            </p>

            <form onSubmit={handleCreateInternship} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={newInternTitle}
                  onChange={(e) => {
                    setNewInternTitle(e.target.value);
                    if (!newInternSlug) {
                      setNewInternSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. AI Automation Engineer"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Domain Category *</label>
                  <select
                    value={newInternCategory}
                    onChange={(e) => setNewInternCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="development">Development / Engineering</option>
                    <option value="automation">AI & Automation</option>
                    <option value="design">UI/UX & Graphic Design</option>
                    <option value="sales">Sales & BD</option>
                    <option value="outreach">Marketing & Outreach</option>
                    <option value="growth">Business Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Available Openings *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newInternOpenings}
                    onChange={(e) => setNewInternOpenings(e.target.value)}
                    placeholder="20"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Custom Slug *</label>
                <input
                  type="text"
                  required
                  value={newInternSlug}
                  onChange={(e) => setNewInternSlug(e.target.value)}
                  placeholder="ai-automation-engineer"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <ImageUploadField
                label="Main Cover Photo"
                value={newInternImage}
                onChange={setNewInternImage}
                folder="internships"
                helperText="Cover banner image for this internship opening."
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Skills & Tools (Comma Separated)
                </label>
                <input
                  type="text"
                  value={newInternSkills}
                  onChange={(e) => setNewInternSkills(e.target.value)}
                  placeholder="AI & ML Integration, Workflow Automation, Python, Data Analytics"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newInternDescription}
                  onChange={(e) => setNewInternDescription(e.target.value)}
                  placeholder="Describe the learning outcomes, live project responsibilities, and mentorship details..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInternshipModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInternship}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {savingInternship ? "Saving..." : "Publish Internship Opening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
