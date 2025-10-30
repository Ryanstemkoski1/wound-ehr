"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border bg-card/50 border-t backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Left: Branding */}
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="text-foreground font-semibold">Wound EHR</span>
            <span>•</span>
            <span>Advanced Wound Care Management</span>
          </div>

          {/* Center: Links */}
          <nav className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/patients"
              className="hover:text-foreground transition-colors"
            >
              Patients
            </Link>
            <Link
              href="/dashboard/facilities"
              className="hover:text-foreground transition-colors"
            >
              Facilities
            </Link>
            <Link
              href="/dashboard/analytics"
              className="hover:text-foreground transition-colors"
            >
              Analytics
            </Link>
          </nav>

          {/* Right: Copyright */}
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <span>© {currentYear}</span>
            <span className="hidden sm:inline">Made with</span>
            <Heart
              className="fill-destructive text-destructive h-3.5 w-3.5"
              aria-label="love"
            />
            <span className="hidden sm:inline">for better patient care</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
