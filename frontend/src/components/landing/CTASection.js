import { ArrowRight, Leaf } from "lucide-react";

export default function CTASection() {
  return (
    <section id="cta" className="py-24 md:py-32">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 border border-primary-600/40 p-12 md:p-20 text-center shadow-glow-lg">
          <div
            className="absolute -top-16 -right-16 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 bg-brand-lime/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-500/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <span className="badge bg-white/15 text-white border border-white/20 text-xs">
                <Leaf className="w-3 h-3" />
                Join the clean city movement
              </span>
            </div>

            <h2 className="font-display font-extrabold text-4xl md:text-6xl text-white mb-6 leading-tight">
              Ready to make your city
              <br />
              <span className="text-brand-lime">cleaner and smarter?</span>
            </h2>

            <p className="text-primary-200 text-lg md:text-xl mb-10 max-w-xl mx-auto">
              Start reporting waste, managing workers, or running your
              municipality dashboard today. Free to get started.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                id="cta-section-primary"
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-800 font-bold rounded-xl hover:bg-primary-50 transition-all duration-200 hover:-translate-y-0.5 shadow-lg w-full sm:w-auto justify-center"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                id="cta-section-secondary"
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 w-full sm:w-auto justify-center"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
