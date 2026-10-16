import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  School,
  Home,
  Briefcase,
  Podcast,
  MonitorPlay,
  Wrench,
  Monitor,
  Code,
  Share2,
  MapPin,
  LifeBuoy,
  Quote,
  Check,
} from "lucide-react";
import { SOLUTIONS, SERVICES, TESTIMONIALS } from "@/lib/home";

/* Icon names arrive as strings from lib/home.ts so that data file stays free of
   a react dependency and can be imported by server code. */
const SOLUTION_ICONS = {
  GraduationCap,
  School,
  Home,
  Briefcase,
  MonitorPlay,
  Podcast,
} as const;

const SERVICE_ICONS = {
  Wrench,
  Monitor,
  Code,
  Share2,
  MapPin,
  LifeBuoy,
} as const;

/** Who we shop for — the "what is this for?" section. */
export function SolutionsSection() {
  return (
    <section id="solutions" className="border-y border-gray-200 bg-gray-50/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
            Shop your way
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Built for how you shop
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Same catalogue, different priorities. Whether you are buying one phone
            for yourself or fifty displays for a school, the pricing, delivery and
            support change — the checkout does not.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((solution) => {
            const Icon = SOLUTION_ICONS[solution.icon];
            return (
              <article
                key={solution.title}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-gray-200/60"
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <h3 className="text-base font-bold text-gray-900">{solution.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">
                  {solution.desc}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {solution.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/#support"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 transition-colors hover:text-orange-800"
                >
                  Ask about this
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Our Services — the dark band. */
export function ServicesSection() {
  return (
    <section id="services" className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
            What we do beyond selling
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Services &amp; support
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Hardware is the easy half. These are the services that keep a classroom
            running for the next five years.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = SERVICE_ICONS[service.icon];
            return (
              <article
                key={service.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-base font-bold">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {service.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Customer quotes. */
export function TestimonialsSection() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
          Customer stories
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          What our customers say
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <figure
            key={item.name}
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6"
          >
            <Quote className="h-6 w-6 text-orange-100" aria-hidden />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">
              {item.quote}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                {item.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-gray-900">
                  {item.name}
                </span>
                <span className="block truncate text-[11px] text-gray-500">
                  {item.role} · {item.location}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}