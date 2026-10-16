/**
 * The static half of the knowledge base.
 *
 * These are the documents that describe *how Obryn works* — shipping, returns,
 * warranty, payment, order tracking. They are code rather than rows in a table
 * because they are copy decisions, and because `SITE` already holds the contact
 * details they need to stay consistent with.
 *
 * Obryn is a general online store: phones, laptops, tablets, displays, audio,
 * cameras and accessories. The documents below are therefore written for a normal
 * online shopper. The few genuinely specialist ones (choosing a display, online
 * teaching, signage) are kept because those products are still in the catalogue.
 *
 * The catalogue half of the knowledge base is generated from the `products` table
 * at re-index time — see lib/rag/ingest.ts.
 *
 * Deliberately does NOT include: prices (live data, and the model must not quote
 * a stale figure), stock levels, or anything about a specific customer's account.
 */

import { SITE } from "@/lib/site";
import { FREE_SHIPPING_ABOVE, SHIPPING_FLAT } from "@/lib/pricing";

export type KnowledgeDocument = {
  /** Stable identifier. Re-indexing replaces every chunk sharing this id. */
  docId: string;
  source: "product" | "policy" | "service" | "faq";
  title: string;
  /** Markdown-ish plain text. Embedded and shown to the model as retrieved context. */
  content: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export const KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  /* ─── SHIPPING ──────────────────────────────────────────────────────────── */
  {
    docId: "policy-shipping",
    source: "policy",
    title: "Delivery and shipping",
    url: "/#support",
    metadata: { topic: "shipping" },
    content: `Delivery and shipping

Standard delivery across India is ${SHIPPING_FLAT} rupees, and it is free on any order above ${FREE_SHIPPING_ABOVE} rupees.

Deliveries are made across India. Small items such as earphones, cables and chargers go through a courier partner. Larger items - computers, monitors and displays - are moved by our own team where practical, because a screen is not something a parcel van should be trusted with.

We install across all Indian states. Installation is optional and quoted separately, so it never appears as a surprise on an invoice. For multiple sites, rollouts are planned as one job with consolidated billing.

If nobody is available at the delivery address, the visit is rescheduled and there is no extra charge.

Typical lead time for a standard in-stock item is two to five working days. Interactive displays of 75 inches and above, and any item needing a site visit or a wall survey, are quoted with their own lead time before the order is confirmed.

The customer should never be told a delivery date that has not been confirmed in the order.`,
  },
  {
    docId: "policy-returns",
    source: "policy",
    title: "Returns and refunds",
    url: "/#support",
    metadata: { topic: "returns" },
    content: `Returns and refunds

Unused, unboxed products can be returned within seven days of delivery.

To start a return the customer should contact support with their order number. The order number is on every order confirmation and is shown in the Orders section of the customer dashboard, and always begins with OB.

Opened or installed items cannot be returned, because an interactive panel or an OPS module that has been mounted into a wall cannot be resold as new. If an item arrives damaged or is not working, that is a warranty matter rather than a return, and it is handled differently and more favourably.

Refunds are issued to the original payment method. For online payments this normally takes five to seven working days to appear, depending on the bank. For cash-on-delivery orders the refund is made by bank transfer and the customer should have their account details ready.

Delivery charges are refunded only when the return is caused by a fault, a damaged item or an item that was not as described. If the customer simply changed their mind, the original delivery charge is deducted.

Warranty is separate from the seven-day return window and applies after delivery, for the period stated on the product.`,
  },
  {
    docId: "policy-warranty",
    source: "policy",
    title: "Warranty and support",
    url: "/#support",
    metadata: { topic: "warranty" },
    content: `Warranty and support

Every product carries a warranty for the period stated on its page, which is usually longer for computers and displays than for accessories. Accidental damage and physical damage are not covered.

Keep the invoice or the order number — warranty claims are matched against the order, and without it the claim cannot be verified.

Annual Maintenance Contracts are available for institutions. An AMC covers scheduled preventive visits, firmware updates, cleaning of the panel surface and a response time commitment for anything under warranty.

Technical support is available seven days a week. Customers on an AMC get priority response.

Before any technician is dispatched, the support team asks the customer for the order number, a photograph of the fault, and the model name from the product label. Having those three things ready makes it a same-day remote diagnosis in most cases rather than a site visit.

Support is reached on phone at ${SITE.phoneDisplay}, on WhatsApp, or by email at ${SITE.email}.`,
  },
  {
    docId: "policy-payment",
    source: "policy",
    title: "Payments and pricing",
    url: "/#support",
    metadata: { topic: "payment" },
    content: `Payments and pricing

Payments are processed through Razorpay. The customer can pay by UPI, Visa, Mastercard, RuPay card, net banking, or cash on delivery where available.

Online payment is secured end to end by Razorpay. Card details are never handled by Obryn.

Prices are inclusive of GST for a registered business. A GST invoice is raised against the order.

A product shown as "priced on request" has no fixed price and cannot be bought through the website. The customer must contact the sales team for a written quote, which is usually sent the same working day.

The assistant must never invent, estimate or guess a price. Only quote a price if it appears in the retrieved product or order context. If no price is available, say so and offer to arrange a quote.`,
  },

  /* ─── INSTALLATION & SERVICES ──────────────────────────────────────────── */
  {
    docId: "service-installation",
    source: "service",
    title: "Installation and commissioning",
    url: "/#services",
    metadata: { topic: "installation" },
    content: `Installation and commissioning

Installation is optional and quoted separately, so it never appears as a surprise on an invoice. It applies mainly to wall-mounted displays, OPS computers, studio arms and anything fixed in place. Most other products are delivered ready to use and need no installation. When it is booked, the work is carried out by our own technicians and is never subcontracted.

Installation is optional and quoted separately, so it never surprises anyone at checkout. It applies mainly to wall-mounted displays, OPS computers, studio arms and anything fixed in place.

An installation visit covers mounting, cabling, power and signal, calibration of the picture and touch, installation of the OPS computer if one was ordered, and a handover session with whoever will be using the equipment.

Most other products — phones, laptops, tablets, earphones, cameras — are delivered ready to use and need no installation.

Before installation, a wall survey is needed for anything 65 inches and above. The survey checks the wall material, the fixings required, cable routing and whether the power socket is in the right place. It is free, and it is better to do it than to discover the wall is hollow after the display has been delivered.

Customers should have the room ready on the day: clear access to the wall, a stable internet connection if the display is online, and someone available for the handover.

Training at handover covers how to switch between sources, how the stylus works, and how to get help. It usually takes twenty minutes.`,
  },
  {
    docId: "service-roles",
    source: "service",
    title: "Which team handles what",
    url: "/#services",
    metadata: { topic: "routing" },
    content: `Which team handles what

Sales and quotes — product advice, written quotations, bulk and multi-unit pricing. Reached on WhatsApp or by phone.

Technical support — faults, a display not switching on, touch not responding, an OPS module misbehaving. Needs the order number, a photograph of the fault and the model name.

Installation scheduling — booking a site visit, wall surveys, mount and cabling work.

Accounts — invoices, GST details, purchase orders, refund status for cash-on-delivery orders.

Website and app development — custom Android, iOS and cross-platform apps, websites, and learning management systems.

Digital marketing — search, social and paid campaigns.

The assistant should route the customer to the right one rather than trying to answer a question that belongs to another team.`,
  },
  {
    docId: "service-developer",
    source: "service",
    title: "Development and web services",
    url: "/#services",
    metadata: { topic: "development" },
    content: `Development and web services

Alongside hardware, Obryn builds software.

App development covers native Android, native iOS and cross-platform applications, built for education businesses in particular.

Website development covers marketing sites, and websites that take enquiries and turn them into orders.

Learning Management Systems are built for institutions, with student tracking and analytics.

Digital marketing covers search, social and paid campaigns.

These are all quoted rather than listed with a price, because the scope varies too much. The assistant should collect a rough description of what the customer wants and pass it to the sales team for a quote.`,
  },

  /* ─── PRODUCT KNOWLEDGE / FIT ──────────────────────────────────────────── */
  {
    docId: "faq-choosing-a-display",
    source: "faq",
    title: "How to choose an interactive display",
    url: "/product-page?category=Digital+Board",
    metadata: { topic: "guidance" },
    content: `How to choose an interactive display

Size is driven by how far back the students sit, not by the size of the room.

For a classroom, 65 inches is the usual starting point, and 86 inches works well for a lecture hall or a room where students sit further back. 55 inches suits a smaller room or a coaching centre with a tight seating plan.

Resolution: 4K matters above about 75 inches. At smaller sizes the difference is hard to see, and 4K costs more.

Touch points: twenty points or more is enough for a group of students working at the board at once. Below about ten, only one or two people can touch it.

Brightness matters more in a classroom than people expect, because projectors and windows fight with a screen. Choose a panel rated for the room rather than the cheapest one.

The computer is a separate decision. Most interactive panels accept a pluggable OPS module, which is a small computer that slots into the back of the panel. An OPS module is usually a better answer than connecting an external laptop, because the cables stay hidden.

Also worth budgeting for: a stylus, a wall mount, and an HDMI or USB-C cable. A panel without a mount is unusable and a panel without a stylus is barely an interactive display.`,
  },
  {
    docId: "faq-classroom-set",
    source: "faq",
    title: "What a complete smart classroom needs",
    url: "/#solutions",
    metadata: { topic: "guidance" },
    content: `What a complete smart classroom needs

A working smart classroom is five things, and buying only the first is the most common mistake.

One interactive display, correctly sized for the room.
An OPS computer, unless the room already has a laptop that will be brought to the front every single day.
A wall mount rated for the weight of the panel.
A stylus, at least one per panel, ideally two.
Cabling: a USB-C or HDMI cable long enough for the mount position.

For a room that also records or streams lessons, add a camera and a microphone. For coaching centres running many rooms, a single installation with a standard specification per room is easier to support than a different setup in every room.`,
  },
  {
    docId: "faq-online-teaching",
    source: "faq",
    title: "Setting up for online teaching",
    url: "/product-page?category=Camera",
    metadata: { topic: "guidance" },
    content: `Setting up for online teaching

Camera: a 4K streaming camera with auto-framing is worth the money, because it keeps the teacher in frame while they move around to a whiteboard. A laptop webcam is usually fine for talking-head lessons and bad for anything where the teacher moves.

Lighting matters more than camera quality. A ring light or a panel light between the teacher and the camera will do more for how the lesson looks than a more expensive camera. The worst common mistake is having a window behind the teacher.

Microphone: for a quiet room, the laptop microphone is acceptable. For a normal room with a fan or traffic noise, a wireless lavalier changes the lesson completely.

Acoustics: a hard, echoey room is the other common problem. Heavy curtains, a carpet or some soft furnishings will fix more than any microphone.`,
  },
  {
    docId: "faq-signage",
    source: "faq",
    title: "Digital signage and commercial displays",
    url: "/product-page?category=Monitor",
    metadata: { topic: "guidance" },
    content: `Digital signage and commercial displays

A commercial signage display is built to run continuously, often twenty-four hours a day. A television is not, and using a television as signage is the usual reason one fails early.

For a small number of screens, a media player with built-in scheduling is enough: it holds the content, plays it on a timetable, and reboots itself if something goes wrong.

For a video wall, the bezel width matters more than the resolution. A sub-1 mm bezel is what makes a tiled wall look like one surface instead of four screens.

Brightness again: signage in a bright lobby needs a very different panel to signage in a dim corridor.`,
  },
  {
    docId: "faq-order-tracking",
    source: "faq",
    title: "How to check an order",
    url: "/user-dashboard?tab=orders",
    metadata: { topic: "orders" },
    content: `How to check an order

Every order has an order number that begins with OB. It is in the order confirmation, and it is at the top of every order in the Orders tab of the customer dashboard.

An order moves through these statuses: pending, processing, shipped, delivered, cancelled.

A pending or processing order can be cancelled by the customer from the dashboard. Once an order has shipped it can no longer be cancelled online, and the customer needs to contact support.

The assistant can read a customer's own orders, but should describe the status and the items rather than promising a delivery date that has not been confirmed.

Payment method is shown on the order. Online payments are Razorpay; some orders can be paid cash on delivery. An unpaid pending order is not a completed purchase, so it should not be counted as something the customer has bought.`,
  },
  {
    docId: "faq-contact",
    source: "faq",
    title: "How to reach Obryn",
    url: "/#support",
    metadata: { topic: "contact" },
    content: `How to reach Obryn

Phone: ${SITE.phoneDisplay}
WhatsApp: the same number
Email: ${SITE.email}

Office: ${SITE.address}

Hours: Monday to Saturday, 10:00 to 19:00 IST. Customers on an Annual Maintenance Contract have emergency support outside these hours.

WhatsApp is the fastest channel, and for a quote a written one can follow immediately in the same conversation. Orders can also be placed by message if the customer would rather not pay online.`,
  },
];