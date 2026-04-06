"use client";

import Link from "next/link";

type HeaderLink = {
  label: string;
  href: string;
};

interface SiteHeaderProps {
  activeHref?: string;
  navLinks?: HeaderLink[];
  rightLinks?: HeaderLink[];
  cta?: HeaderLink;
  brandHref?: string;
}

const DEFAULT_NAV_LINKS: HeaderLink[] = [
  { label: "Rooms", href: "/rooms" },
  { label: "About", href: "/about" },

  { label: "Contact", href: "/contact" },
];

export default function SiteHeader({
  activeHref,
  navLinks = DEFAULT_NAV_LINKS,
  rightLinks,
  cta,
  brandHref = "/",
}: SiteHeaderProps) {
  return (
    <nav
      className="fixed top-0 left-0 z-50 flex w-full items-center justify-between px-8 py-5 md:px-16"
      style={{ backgroundColor: "#132222" }}
    >
      <Link href={brandHref} className="text-lg font-light tracking-[0.3em] text-white">
        PHINAS HOTEL
      </Link>

      {rightLinks ? (
        <div className="flex items-center gap-6">
          {rightLinks.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="text-sm tracking-widest text-[#d4d7c7] transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:flex gap-8 items-center text-sm tracking-widest">
            {navLinks.map((link) => {
              const isActive = activeHref === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive ? "text-[#d4d7c7] border-b border-[#d4d7c7] pb-0.5" : "text-[#fff8ed] hover:text-[#d4d7c7] transition"}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {cta ? (
            <Link
              href={cta.href}
              className="px-5 py-2 text-xs tracking-widest border border-[#71867e] text-[#fff8ed] hover:bg-[#71867e] transition"
            >
              {cta.label}
            </Link>
          ) : null}
        </>
      )}
    </nav>
  );
}
