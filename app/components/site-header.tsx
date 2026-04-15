"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type HeaderLink = {
  label: string;
  href: string;
};

type LoggedInUser = {
  name: string;
  role: string;
};

interface SiteHeaderProps {
  activeHref?: string;
  navLinks?: HeaderLink[];
  rightLinks?: HeaderLink[];
  cta?: HeaderLink;
  brandHref?: string;
  authUser?: LoggedInUser | null;
  onLogout?: () => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  showAuthControls?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

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
  authUser,
  onLogout,
  onLoginClick,
  onSignupClick,
  showAuthControls = true,
}: SiteHeaderProps) {
  const router = useRouter();
  const [storedUser, setStoredUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    const syncAuthUser = () => {
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("user_role");
      const name = localStorage.getItem("user_name") || "";
      setStoredUser(token && role ? { name, role } : null);
    };

    syncAuthUser();
    window.addEventListener("storage", syncAuthUser);
    window.addEventListener("focus", syncAuthUser);
    window.addEventListener("auth-changed", syncAuthUser as EventListener);
    return () => {
      window.removeEventListener("storage", syncAuthUser);
      window.removeEventListener("focus", syncAuthUser);
      window.removeEventListener("auth-changed", syncAuthUser as EventListener);
    };
  }, []);

  const resolvedUser = authUser ?? storedUser;

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    const access = localStorage.getItem("access_token");

    fetch(`${API}/user/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: access ? `Bearer ${access}` : "",
      },
      body: JSON.stringify({ refresh_token: refresh }),
    }).finally(() => {
      localStorage.clear();
      window.dispatchEvent(new Event("auth-changed"));
      onLogout?.();
      router.push("/");
    });
  };

  const accountHref = resolvedUser
    ? resolvedUser.role === "admin"
      ? "/admin-dashboard"
      : resolvedUser.role === "staff"
        ? "/staff-dashboard"
        : "/user-dashboard"
    : "/";

  return (
    <nav
      className="fixed top-0 left-0 z-50 flex w-full items-center justify-between px-8 py-5 md:px-16"
      style={{ backgroundColor: "#132222" }}
    >
      <Link href={brandHref} className="text-lg font-light tracking-[0.3em] text-white">
        PHINAS HOTEL
      </Link>

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

      <div className="flex items-center gap-3 md:gap-4">
        {rightLinks?.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="hidden text-sm tracking-widest text-[#d4d7c7] transition hover:text-white md:inline-flex"
          >
            {link.label}
          </Link>
        ))}

        {cta ? (
          <Link
            href={cta.href}
            className="hidden px-5 py-2 text-xs tracking-widest border border-[#71867e] text-[#fff8ed] hover:bg-[#71867e] transition md:inline-flex"
          >
            {cta.label}
          </Link>
        ) : null}

        {showAuthControls ? (
          resolvedUser ? (
            <>
              <Link
                href={accountHref}
                className="rounded-full border border-[#71867e] px-4 py-2 text-sm text-[#fff8ed] transition hover:bg-[#203b31]"
              >
                {resolvedUser.name || "MY ACCOUNT"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#d4d7c7] px-4 py-2 text-sm font-semibold text-[#132222] transition hover:bg-[#c5c8b8]"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLoginClick || (() => router.push("/?auth=login"))}
                className="rounded-full border border-[#71867e] px-4 py-2 text-sm text-[#fff8ed] transition hover:bg-[#203b31]"
              >
                LOGIN
              </button>
              <button
                type="button"
                onClick={onSignupClick || (() => router.push("/?auth=signup"))}
                className="rounded-full bg-[#d4d7c7] px-4 py-2 text-sm font-semibold text-[#132222] transition hover:bg-[#c5c8b8]"
              >
                SIGN UP
              </button>
            </>
          )
        ) : null}
      </div>
    </nav>
  );
}
