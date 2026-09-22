import { useRef, useState, useEffect, useCallback } from "react";
import {
  Brain,
  MapPin,
  Users,
  BarChart3,
  Bell,
  Camera,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    title: "Photo Evidence",
    description:
      "Citizens upload waste photos directly from their browser. Before/after cleanup evidence keeps everyone accountable.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "group-hover:border-rose-400/40",
  },
  {
    icon: Brain,
    title: "AI Waste Analysis",
    description:
      "Every report is automatically analyzed for waste type, severity, and duplicate probability using our AI service.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "group-hover:border-purple-400/40",
  },
  {
    icon: MapPin,
    title: "Geospatial Routing",
    description:
      "PostGIS-powered nearest-worker assignment considers location, ward, priority, and worker availability in real time.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "group-hover:border-blue-400/40",
  },
  {
    icon: Zap,
    title: "Smart Priority Engine",
    description:
      "Complaints are auto-prioritized by severity, location type, wait time, nearby sensitive areas, and repeat reports.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "group-hover:border-amber-400/40",
  },
  {
    icon: Users,
    title: "Role-Based Experience",
    description:
      "Citizens, field workers, and municipality admins each see a tailored interface suited to their workflow.",
    color: "text-primary-400",
    bg: "bg-primary-400/10",
    border: "group-hover:border-primary-400/40",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Workers get alerted on new assignments. Citizens are notified on every status change from submission to closure.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "group-hover:border-cyan-400/40",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Municipality admins track complaint volume, resolution times, ward heat maps, and worker performance at a glance.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "group-hover:border-indigo-400/40",
  },
  {
    icon: ShieldCheck,
    title: "Audit & Compliance",
    description:
      "Every state transition, assignment, and AI decision is logged. Full audit trail ensures accountability and transparency.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "group-hover:border-emerald-400/40",
  },
];

const CARD_WIDTH = 280; // px — approximate card width + gap for scroll math
const SCROLL_STEP = CARD_WIDTH * 2; // scroll 2 cards at a time

export default function FeaturesSection() {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    // Active dot: which card is most centered
    const idx = Math.round(el.scrollLeft / (el.scrollWidth / FEATURES.length));
    setActiveIndex(Math.min(idx, FEATURES.length - 1));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncState();
    el.addEventListener("scroll", syncState, { passive: true });
    return () => el.removeEventListener("scroll", syncState);
  }, [syncState]);

  const scroll = (dir) => {
    trackRef.current?.scrollBy({
      left: dir === "right" ? SCROLL_STEP : -SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const scrollToCard = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.children[i];
    if (card)
      card.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  };

  return (
    <section id="features" className="py-20 md:py-28 overflow-hidden">
      <div className="section-container">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 mb-4">
              Platform Features
            </span>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-3">
              Everything you need to{" "}
              <span className="gradient-text">manage waste smarter</span>
            </h2>
            <p className="text-gray-400 text-base">
              End-to-end — from citizen report to verified cleanup — powered by
              AI.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              id="features-scroll-left-desktop"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll features left"
              className="w-10 h-10 rounded-full border border-surface-border flex items-center justify-center
                         text-gray-400 hover:text-white hover:border-primary-500 hover:bg-surface
                         disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id="features-scroll-right-desktop"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll features right"
              className="w-10 h-10 rounded-full border border-surface-border flex items-center justify-center
                         text-gray-400 hover:text-white hover:border-primary-500 hover:bg-surface
                         disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className={`absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none
                        bg-gradient-to-r from-surface to-transparent
                        transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
            aria-hidden="true"
          />
          <div
            className={`absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none
                        bg-gradient-to-l from-surface to-transparent
                        transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
            aria-hidden="true"
          />

          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                       snap-x snap-mandatory"
            role="list"
            aria-label="Feature cards"
          >
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                role="listitem"
                className={`
                  card group flex-shrink-0 w-[260px] sm:w-[280px] p-6
                  border transition-all duration-300
                  hover:-translate-y-1 hover:shadow-glow-sm ${feature.border}
                  snap-start cursor-default
                `}
              >
                <div
                  className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Feature card position"
          >
            {FEATURES.map((f, i) => (
              <button
                key={f.title}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Go to ${f.title}`}
                onClick={() => scrollToCard(i)}
                className={`h-1.5 rounded-full transition-all duration-300
                  ${
                    i === activeIndex
                      ? "w-6 bg-primary-400"
                      : "w-1.5 bg-surface-border hover:bg-gray-500"
                  }`}
              />
            ))}
          </div>
          <div className="flex sm:hidden items-center gap-2">
            <button
              id="features-scroll-left-mobile"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll features left"
              className="w-9 h-9 rounded-full border border-surface-border flex items-center justify-center
                         text-gray-400 hover:text-white hover:border-primary-500
                         disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="features-scroll-right-mobile"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll features right"
              className="w-9 h-9 rounded-full border border-surface-border flex items-center justify-center
                         text-gray-400 hover:text-white hover:border-primary-500
                         disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
