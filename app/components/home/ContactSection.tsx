import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site";

/**
 * The contact band near the foot of the homepage.
 *
 * The form is a plain uncontrolled HTML form with no action — it is a visual
 * placeholder, not a working endpoint. Wiring it up means pointing the action at
 * a real route or a form service; nothing here should pretend to submit.
 */
export default function ContactSection() {
  return (
    <section id="support" className="border-t border-gray-200 bg-gray-50/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-2">
            {/* ── Left: pitch + contact details ── */}
            <div className="flex flex-col justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white sm:p-8 lg:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Get a quote in one working day
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Send us the room size and a photo, or just tell us what you are
                teaching. We will come back with a bill of materials and a fixed price —
                no site visit fee.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`tel:+${SITE.whatsappNumber}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {SITE.phoneDisplay}
                </a>
                <a
                  href={whatsappLink(
                    "Hi Obryn, I'd like a quote for a classroom / studio setup."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp us
                </a>
              </div>

              <dl className="mt-9 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <dt className="sr-only">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${SITE.email}`}
                      className="break-all text-slate-200 transition-colors hover:text-white"
                    >
                      {SITE.email}
                    </a>
                  </dd>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <dt className="sr-only">Office</dt>
                  <dd className="text-slate-300">{SITE.address}</dd>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <dt className="sr-only">Hours</dt>
                  <dd className="text-slate-300">
                    Mon–Sat, 10:00–19:00 IST · Emergency support for AMC customers
                  </dd>
                </div>
              </dl>
            </div>

            {/* ── Right: enquiry form ── */}
            <div className="p-5 sm:p-8 lg:p-12">
              <h3 className="text-lg font-bold text-gray-900">Request a quote</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Tell us what you need — the more detail, the more accurate the quote.
              </p>

              <form
                className="mt-7 space-y-5"
                action="mailto:obryn@example.com"
                method="post"
                encType="text/plain"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Your name" name="name" placeholder="Priya Nair" required />
                  <Field
                    label="Phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="you@school.edu"
                  required
                />

                <div>
                  <label
                    htmlFor="requirement"
                    className="mb-1.5 block text-xs font-semibold text-gray-700"
                  >
                    What are you looking for?
                  </label>
                  <select
                    id="requirement"
                    name="requirement"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-50"
                  >
                    <option>A smart classroom setup</option>
                    <option>Interactive display / digital board</option>
                    <option>Commercial display or signage</option>
                    <option>Podcast or streaming studio</option>
                    <option>Computers, phones or laptops</option>
                    <option>AMC / maintenance contract</option>
                    <option>Something else</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-xs font-semibold text-gray-700"
                  >
                    Details
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="e.g. 6 classrooms, 65-inch panels, installation in Pune"
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-50"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-700 active:scale-[0.99]"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  Send enquiry
                </button>

                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-400">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />
                  This opens your email app with the details filled in. Prefer to talk?
                  Call {SITE.phoneDisplay} — we answer between 10am and 7pm.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-50"
      />
    </div>
  );
}