"use client";
import type { ReactNode } from "react";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container header-inner">
            <div className="header-brand">
              <h1>HRMS</h1>
              <p className="header-subtitle">HR management for your team.</p>
            </div>
            <nav className="nav" aria-label="Primary navigation">
              <Link
                href="/"
                className={isActive("/") ? "nav-link is-active" : "nav-link"}
              >
                Dashboard
              </Link>
              <Link
                href="/attendance"
                className={
                  isActive("/attendance") ? "nav-link is-active" : "nav-link"
                }
              >
                Attendance
              </Link>
            </nav>
          </div>
        </header>{" "}
        <main className="container main">{children}</main>
      </body>
    </html>
  );
}
