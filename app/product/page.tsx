"use client";

import React, { useState } from 'react';
import { 
  Minus, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  CheckCircle2, 
  Truck, 
  Wrench,
  Star
} from 'lucide-react';

// --- MOCK DATA ---
const PRODUCT = {
  brand: "VIEWSONIC",
  name: "ViewSonic A14 75 Inch Interactive Digital Board",
  price: 145000,
  originalPrice: 210000,
  description: `Transform traditional teaching and presentations into engaging interactive experiences with the ViewSonic A14 75 Inch Interactive Digital Board. Featuring a large 75-inch touchscreen display, 8GB RAM and 128GB storage, this interactive panel is designed for modern classrooms, training centers, coaching institutes and professional meeting environments.

The large display area allows teachers, trainers and presenters to write, annotate, explain concepts and collaborate directly on screen while keeping audiences actively engaged. Whether conducting classroom lessons, online sessions, workshops, meetings or presentations, the ViewSonic A14 helps create a more interactive learning and communication experience.`,
  idealFor: [
    "Smart Classrooms", "Schools & Colleges", "Coaching Institutes", 
    "Universities", "Training Centers", "Corporate Meeting Rooms", 
    "Conference Halls", "Digital Learning Labs", "Seminar Rooms", 
    "Interactive Presentation Spaces"
  ],
  highlights: [
    "75 Inch Interactive Touch Display", "8GB RAM", "128GB Internal Storage", 
    "Digital Whiteboard Functionality", "Multi-Touch Collaboration", 
    "Interactive Teaching Experience", "Presentation & Annotation Tools", 
    "Large Screen Classroom Visibility", "Supports Hybrid Learning Environments", 
    "Professional Meeting & Training Solution"
  ],
  applications: "Perfect for interactive teaching, lesson delivery, digital content sharing, employee training, collaborative meetings, brainstorming sessions, presentations, workshops and hybrid learning environments."
};

const RECOMMENDATIONS = [
  {
    id: 1,
    name: "Hisense A13 75\" Interactive Learning Display (8GB + 64GB)",
    price: 145000,
    oldPrice: 210000,
    sale: true,
    image: '/product-placeholder.svg' // Placeholder
  },
  {
    id: 2,
    name: "MAXHUB U4 75 Inch Interactive Flat Panel Display",
    price: 215000,
    oldPrice: 399999,
    sale: true,
    image: '/product-placeholder.svg'
  },
  {
    id: 3,
    name: "PencilAi Plus 75 Inch AI4 Interactive Digital Board Without Camera & Mic",
    price: 140000,
    oldPrice: 165000,
    sale: true,
    image: '/product-placeholder.svg'
  },
  {
    id: 4,
    name: "PencilAi Pro 75 Inch AI4 Interactive Digital Board With Camera & Mic",
    price: 145000,
    oldPrice: 160000,
    sale: true,
    image: '/product-placeholder.svg'
  }
];

// --- COMPONENTS ---

const AccordionItem = ({ title, icon: Icon, children, isOpen, onClick }: any) => {
  return (
    <div className="border-b border-gray-200">
      <button 
        onClick={onClick}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-slate-700"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-gray-500" />}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'}`}
      >
        <div className="text-sm text-gray-600 leading-relaxed pl-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function ProductPage() {
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('why-buy');
  const [mainImage, setMainImage] = useState(0);

  // Mock images for the gallery
  const images = [
    '/product-placeholder.svg',
    '/product-placeholder.svg',
    '/product-placeholder.svg',
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* MAIN CONTENT CONTAINER */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          
          {/* LEFT COLUMN: IMAGES */}
          <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-visible py-2 sm:py-0">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setMainImage(idx)}
                  className={`relative h-20 w-20 shrink-0 rounded-md border-2 overflow-hidden transition-all ${mainImage === idx ? 'border-slate-900 ring-2 ring-slate-100' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={img} alt={`View ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            
            {/* Main Image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
              <img 
                src={images[mainImage]} 
                alt="Product Main" 
                className="h-full w-full object-contain p-4 mix-blend-multiply" 
              />
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-7 flex flex-col">
            
            {/* Header Info */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">{PRODUCT.brand}</p>
              <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl mb-4">
                {PRODUCT.name}
              </h1>
              
              <div className="flex flex-wrap items-end gap-3 mb-2">
                <span className="text-lg text-gray-400 line-through decoration-gray-400">
                  {formatPrice(PRODUCT.originalPrice)}
                </span>
                <span className="text-3xl font-bold text-slate-900">
                  {formatPrice(PRODUCT.price)}
                </span>
                <span className="mb-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                  Sale
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-6">Shipping calculated at checkout</p>
            </div>

            {/* Actions */}
            <div className="space-y-4 mb-8">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity</span>
                <div className="flex h-10 w-32 items-center justify-between rounded-md border border-gray-300 px-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-gray-500 hover:text-slate-900 disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-gray-500 hover:text-slate-900"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="flex-1 rounded-md border border-slate-900 bg-white py-3.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-gray-50">
                  Add to cart
                </button>
                <button className="flex-1 rounded-md bg-slate-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                  Buy it now
                </button>
              </div>
            </div>

            {/* Accordions */}
            <div className="mb-8 border-t border-gray-200">
              <AccordionItem 
                title="Why Buy From Creators Mind Shop" 
                icon={CheckCircle2}
                isOpen={activeAccordion === 'why-buy'}
                onClick={() => setActiveAccordion(activeAccordion === 'why-buy' ? null : 'why-buy')}
              >
                <ul className="list-disc space-y-1 pl-4">
                  <li>PAN India Installation & Support</li>
                  <li>Genuine Products with Warranty</li>
                  <li>Expert Technical Consultation</li>
                  <li>Secure Payment Options</li>
                </ul>
              </AccordionItem>
              
              <AccordionItem 
                title="Perfect For" 
                icon={Truck} // Using Truck as placeholder icon, ideally use a target/bullseye icon
                isOpen={activeAccordion === 'perfect-for'}
                onClick={() => setActiveAccordion(activeAccordion === 'perfect-for' ? null : 'perfect-for')}
              >
                <p>Ideal for Schools, Coaching Centers, Corporate Offices, and Training Institutes looking for reliable interactive displays.</p>
              </AccordionItem>

              <AccordionItem 
                title="Installation & Support" 
                icon={Wrench}
                isOpen={activeAccordion === 'install'}
                onClick={() => setActiveAccordion(activeAccordion === 'install' ? null : 'install')}
              >
                <p>We provide professional installation services across major cities in India. Our team ensures your board is mounted safely and configured perfectly for your needs.</p>
              </AccordionItem>
            </div>

            {/* Long Description */}
            <div className="prose prose-slate max-w-none">
              <h3 className="text-xl font-bold text-slate-900 mb-4">{PRODUCT.name}</h3>
              
              <div className="whitespace-pre-line text-sm leading-relaxed text-gray-600 mb-6">
                {PRODUCT.description}
              </div>

              <h4 className="font-bold text-slate-900 mb-3">Ideal For</h4>
              <ul className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                {PRODUCT.idealFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <h4 className="font-bold text-slate-900 mb-3">Key Highlights</h4>
              <ul className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                {PRODUCT.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <h4 className="font-bold text-slate-900 mb-3">Applications</h4>
              <p className="text-sm leading-relaxed text-gray-600 mb-8">
                {PRODUCT.applications}
              </p>
              
              <p className="text-sm leading-relaxed text-gray-600 mb-8">
                Creators Mind Shop provides complete smart classroom solutions including digital boards, OPS systems, PTZ cameras, studio setups, educational technology infrastructure and professional installation services across India.
              </p>

              <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-slate-900 transition-colors">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

          </div>
        </div>

        {/* YOU MAY ALSO LIKE SECTION */}
        <section className="mt-20 border-t border-gray-100 pt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">You may also like</h2>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {RECOMMENDATIONS.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 mb-4">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  {item.sale && (
                    <span className="absolute bottom-3 left-3 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
                      Sale
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm font-medium text-slate-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                  {item.name}
                </h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(item.oldPrice)}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatPrice(item.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CUSTOMER REVIEWS SECTION */}
        <section className="mt-20 border-t border-gray-100 pt-16 pb-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Customer Reviews</h2>
          
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
            <div className="flex flex-col items-center">
              <div className="flex gap-1 text-gray-300 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-current" />
                ))}
              </div>
              <p className="text-sm text-gray-500">Be the first to write a review</p>
            </div>
            
            <button className="rounded-md bg-orange-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700 shadow-sm">
              Write a review
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}