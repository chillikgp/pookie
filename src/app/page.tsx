"use client";

import React from "react";
import { useRouter } from "next/navigation";
import MobileLayout from "@/components/MobileLayout";

export default function HomePage() {
  const router = useRouter();

  return (
    <MobileLayout>
      {/* Header */}
      <header className="py-4 flex items-center justify-between">
        <div className="w-10" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white text-sm">👶</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            MelaBabu
          </h1>
        </div>
        <div className="w-10" />
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center pt-6 pb-16 hero-gradient">
        <div className="text-center mb-8">
          <h2 className="text-[28px] leading-[1.15] font-extrabold text-[var(--color-text-primary)] mb-4 tracking-tight">
            Create studio-style{" "}
            <br />
            <span className="text-[var(--color-primary)]">baby photos</span>
            {" "}in seconds
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm font-medium max-w-[280px] mx-auto leading-relaxed">
            Transform your baby&apos;s everyday moments into professional
            portraits using AI.
          </p>
        </div>

        {/* Hero Card */}
        <div className="w-full max-w-sm">
          <div className="card shadow-[var(--shadow-premium)]">
            <div className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dreamboat_cover.jpeg"
                alt="Dream Boat"
                className="w-full h-auto block"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="text-xs">✨</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  Dream Boat
                </span>
              </div>
            </div>

            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                Create this magic
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm mb-6 px-2">
                Our AI removes backgrounds and places your baby in dreamy
                settings.
              </p>
              <button
                onClick={() => router.push("/theme")}
                className="btn-primary"
              >
                <span>✨</span>
                Start Creating
              </button>
            </div>
          </div>
        </div>

        {/* How it works link */}
        <a
          href="#how-it-works"
          className="mt-8 flex flex-col items-center gap-1 text-[var(--color-text-muted)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            How it works
          </span>
          <span className="animate-bounce">↓</span>
        </a>
      </main>

      {/* How it works section */}
      <section
        id="how-it-works"
        className="bg-[var(--color-surface)] py-16 -mx-5 px-6"
      >
        <div className="max-w-xs mx-auto">
          <h3 className="text-xl font-bold text-center text-[var(--color-text-primary)] mb-10">
            Three simple steps
          </h3>
          <div className="space-y-10">
            {[
              {
                icon: "📸",
                title: "1. Upload",
                desc: "Upload any photo of your baby from your phone gallery.",
              },
              {
                icon: "🎨",
                title: "2. Choose Theme",
                desc: "Pick from premium studio themes like 'Floral Dreamscape'.",
              },
              {
                icon: "⬇️",
                title: "3. Download",
                desc: "Get your high-quality studio photo instantly.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-soft)] flex items-center justify-center mb-3">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <h4 className="text-base font-bold text-[var(--color-text-primary)] mb-1.5">
                  {step.title}
                </h4>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-surface-alt)] py-10 -mx-5 px-6 border-t border-[var(--color-border)]">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 opacity-60">
            <span className="text-[var(--color-primary)]">👶</span>
            <span className="text-[var(--color-text-primary)] font-bold text-lg">
              MelaBabu
            </span>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-medium text-center tracking-wide uppercase">
            © 2025 MelaBabu. Made with ❤️ for parents.
          </div>
        </div>
      </footer>
    </MobileLayout>
  );
}
