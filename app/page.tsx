"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "./components/site-header";
import { getRoomNightlyRate } from "../lib/pricing";

const API = process.env.NEXT_PUBLIC_API_BASE_URL

interface Room {
  id: number;
  name: string;
  price_per_night: string;
  amenities: string[];
  image_url: string;
  avg_rating?: number | null;
  rating_count?: number;
}

function hasRoomRating(room: Room) {
  return (room.rating_count || 0) > 0 && Number.isFinite(Number(room.avg_rating));
}

function renderStars(avgRating?: number | null) {
  if (!avgRating) return "☆☆☆☆☆";
  const normalized = Number(avgRating);
  const fiveStarValue = Number.isFinite(normalized)
    ? Math.max(0, Math.min(5, Math.round(normalized)))
    : 0;
  return `${"★".repeat(fiveStarValue)}${"☆".repeat(5 - fiveStarValue)}`;
}

function getDisplayRating(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(5, normalized > 5 ? normalized / 2 : normalized));
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function parseApiResponse(raw: string, fallback: string) {
  if (!raw.trim()) {
    throw new Error(fallback);
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
      throw new Error("The server returned an HTML page instead of JSON. Check the frontend API base URL and backend route.");
    }
    throw new Error(raw.trim() || fallback);
  }
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a19.2 19.2 0 0 1-4.1 4.7" />
      <path d="M6.1 6.1C3.7 8.1 2 12 2 12s3.5 7 10 7c1 0 2-.1 2.9-.4" />
    </svg>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  required,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  required?: boolean;
  className: string;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className}
        required={required}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? `Hide ${placeholder.toLowerCase()}` : `Show ${placeholder.toLowerCase()}`}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0b0a8] transition hover:text-white"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role  = localStorage.getItem("user_role");
    const name  = localStorage.getItem("user_name");
    if (token && role) setLoggedInUser({ name: name || "", role });
  }, []);

  useEffect(() => {
    const authMode = new URLSearchParams(window.location.search).get("auth");
    if (authMode === "login") {
      setIsLogin(true);
      setShowAuth(true);
    } else if (authMode === "signup") {
      setIsLogin(false);
      setShowAuth(true);
    }
  }, []);

  const handleNavLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch(`${API}/user/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).finally(() => {
      localStorage.clear();
      setLoggedInUser(null);
      window.dispatchEvent(new Event("auth-changed"));
    });
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const resetAuthFields = () => {
    setEmail(""); setPassword(""); setConfirmPassword("");
    setFirstName(""); setMiddleName(""); setLastName(""); setUsername("");
    setContact(""); setAddress(""); setGender(""); setAuthError("");
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isLogin) {
        const res = await fetch(`${API}/user/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        const data = parseApiResponse(text, "Login failed.");
        if (!res.ok) throw new Error((data.detail || data.error || "Login failed") as string);
        const role = (data.user as Record<string, string>)?.role;
        localStorage.setItem("access_token", data.access_token as string);
        localStorage.setItem("refresh_token", data.refresh_token as string);
        localStorage.setItem("user_role", role || "user");
        const userName = `${(data.user as Record<string, string>)?.first_name || ""} ${(data.user as Record<string, string>)?.last_name || ""}`.trim();
        localStorage.setItem("user_name", userName);
        setLoggedInUser({ name: userName, role: role || "user" });
        window.dispatchEvent(new Event("auth-changed"));
        setShowAuth(false);
        const redirectTo = sessionStorage.getItem("redirect_after_login") || "/";
        sessionStorage.removeItem("redirect_after_login");
        if (role === "admin") router.push("/admin-dashboard");
        else if (role === "staff") router.push("/staff-dashboard");
        else router.push(redirectTo);
      } else {
        if (!isStrongPassword(password)) {
          setAuthError("Password must be at least 8 characters and include uppercase, lowercase, and a special character.");
          setAuthLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setAuthError("Passwords do not match!");
          setAuthLoading(false);
          return;
        }
        const res = await fetch(`${API}/user/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email, password, confirm_password: confirmPassword,
            first_name: firstName, middle_name: middleName || undefined,
            last_name: lastName, username, contact, address, gender,
          }),
        });
        const text = await res.text();
        const data = parseApiResponse(text, "Signup failed.");
        if (!res.ok) throw new Error((Object.values(data).flat().join(" ")) || "Signup failed");
        resetAuthFields();
        setIsLogin(true);
        setAuthError("✅ Account created! Please log in.");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  };

  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);

  useEffect(() => {
    fetch(`${API}/hotelroom/rooms/?status=available`)
      .then(res => res.json())
      .then(data => setFeaturedRooms(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  const inputCls = "w-full px-4 py-3 bg-transparent border-b border-[#71867e] text-white placeholder-[#a0b0a8] focus:outline-none focus:border-white transition text-sm";
  const passwordInputCls = `${inputCls} pr-12`;
  const selectCls = "w-full px-4 py-3 bg-[#1c352c] border-b border-[#71867e] text-white focus:outline-none focus:border-white transition text-sm";

  return (
    <div className="min-h-screen bg-[#f7f4ee] font-sans text-[#1c352c]">

      {/* ── NAVBAR ── */}
      <SiteHeader
        authUser={loggedInUser}
        onLogout={handleNavLogout}
        onLoginClick={() => {
          setIsLogin(true);
          setShowAuth(true);
        }}
        onSignupClick={() => {
          setIsLogin(false);
          setShowAuth(true);
        }}
      />

      {/* ── HERO ── */}
      <section className="relative flex min-h-[88vh] items-center justify-center px-6 pt-24">
        <img src="/che.jpg" alt="PHINAS HOTEL" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.5)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#132222]/70 via-[#132222]/35 to-[#132222]/70" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#d4d7c7]">Welcome to</p>
          <h1 className="mb-5 text-4xl font-light tracking-[0.15em] text-white md:text-6xl">
            PHINAS HOTEL
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-7 text-[#eef0e8] md:text-lg">
            Stay in a calm, elegant space designed for travelers who want comfort, convenience, and a smooth booking experience.
          </p>
        </div>
      </section>


      {/* ── WELCOME ── */}
      <section className="px-6 py-16 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#71867e]">Our Story</p>
        <h2 className="mb-5 text-3xl font-light md:text-4xl">
          Welcome to <span className="font-semibold">Our Hotel</span>
        </h2>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[#4a6358] md:text-base">
          In the heart of the city is a hotel designed for the quintessential traveler whose lifestyle
          encompasses comfort, proximity, aesthetics and efficiency.
          With its prime location just steps away from renowned landmarks, it&apos;s easy for guests to explore all
          that the city has to offer.
        </p>
      </section>

      {/* ── VISION BANNER ── */}
      <section className="px-6 pb-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-20 text-center">
          <img src="/che.jpg" alt="Vision" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.35)" }} />
          <div className="absolute inset-0 bg-[#132222]/45" />
          <div className="relative z-10">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#d4d7c7]">Our Vision</p>
          <h2 className="mb-4 text-3xl font-light text-white md:text-5xl">
            Mastered <span className="font-semibold">Simplicity</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[#d4d7c7] md:text-base">
            Simplicity beyond mere design | Experienced rooted in cultural discovery,
            Complete focus on guest&apos;s wellbeing
          </p>
          </div>
        </div>
      </section>

      {/* ── FEATURED ROOMS ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#71867e]">Accommodations</p>
            <h2 className="text-3xl font-light md:text-4xl">
              Our <span className="font-semibold">Rooms</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredRooms.map((room, idx) => {
              const img = room.image_url || ["/che4.jpg","/che1.jpg","/che2.jpg","/che3.jpg"][idx % 4];
              return (
                <div key={room.id} className="overflow-hidden rounded-3xl border border-[#e8e0d3] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-56 overflow-hidden">
                    <img src={img} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    <div className="absolute right-4 top-4 rounded-full bg-[#132222] px-3 py-1 text-xs font-semibold text-[#fff8ed]"
                    >
                      ₱{getRoomNightlyRate(room, 1).toLocaleString()}/night
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-medium text-[#1c352c]">{room.name}</h3>
                    <div className="mb-4">
                      <p className="text-base text-[#c48a3a]">{hasRoomRating(room) ? renderStars(getDisplayRating(room.avg_rating)) : "☆☆☆☆☆"}</p>
                      <p className="text-xs text-[#4a6358]">
                        {hasRoomRating(room) ? `${getDisplayRating(room.avg_rating).toFixed(1)}/5` : "No rating yet"}
                        {room.rating_count ? ` (${room.rating_count} review${room.rating_count > 1 ? "s" : ""})` : ""}
                      </p>
                    </div>
                    <div className="mb-6 flex flex-wrap gap-2">
                      {(room.amenities || []).slice(0, 3).map((f, j) => (
                        <span key={j} className="rounded-full bg-[#eef0e8] px-3 py-1 text-xs text-[#1c352c]">{f}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        router.push(`/roomdetails/${room.id}`);
                      }}
                      className="w-full rounded-full border border-[#1c352c] py-3 text-xs font-semibold tracking-[0.2em] text-[#1c352c] transition hover:bg-[#1c352c] hover:text-white"
                    >
                      VIEW DETAILS
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AMENITIES ── */}
      {/* <section className="bg-[#ece4d8] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#71867e]">Facilities</p>
            <h2 className="text-3xl font-light md:text-4xl">
              Our <span className="font-semibold">Amenities</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {amenities.map((a, i) => (
              <div key={i} className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
                <div className="mb-3 text-3xl">{a.icon}</div>
                <p className="text-sm text-[#1c352c]">{a.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ── CTA ── */}
      <section className="px-6 py-16">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-20 text-center">
        <img src="/che.jpg" alt="Book" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(0.3)" }} />
        <div className="absolute inset-0 bg-[#132222]/55" />
        <div className="relative z-10">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#d4d7c7]">Limited Offer</p>
          <h2 className="mb-4 text-3xl font-light text-white md:text-5xl">
            Ready to experience <span className="font-semibold">Phinas?</span>
          </h2>
          <p className="mb-8 text-sm leading-7 text-[#d4d7c7] md:text-base">Book your stay today and get 20% off your first visit.</p>
        </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#132222] px-8 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-light tracking-[0.2em] text-[#fff8ed]">PHINAS HOTEL</h3>
            <p className="text-[#71867e] text-xs leading-relaxed">Experience PHINAS like never before.</p>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">QUICK LINKS</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li><Link href="/roomsearch" className="hover:text-[#d4d7c7] transition">Our Rooms</Link></li>
              <li><Link href="#" className="hover:text-[#d4d7c7] transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-[#d4d7c7] transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">CONTACT</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li>📞 +639 702 230 263</li>
              <li>✉️ phinashotel@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[#1c352c] pt-8 text-center text-xs tracking-[0.2em] text-[#71867e]">
          © PHINAS HOTEL. ALL RIGHTS RESERVED.
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-8 shadow-2xl" style={{ backgroundColor: "#1c352c" }}>
            <button onClick={() => setShowAuth(false)}
              className="absolute top-4 right-5 text-[#a0b0a8] hover:text-white text-xl transition">✕</button>

            <p className="text-[#a0b0a8] tracking-[0.4em] text-xs uppercase mb-2 text-center">
              {isLogin ? "Welcome Back" : "Create Account"}
            </p>
            <h2 className="text-white text-2xl font-thin tracking-[0.3em] text-center mb-8">
              {isLogin ? "LOGIN" : "SIGN UP"}
            </h2>

            <form onSubmit={handleAuth} className="flex flex-col gap-5">
              {!isLogin && (
                <>
                  <div className="flex gap-3">
                    <input type="text" placeholder="First Name" value={firstName}
                      onChange={e => setFirstName(e.target.value)} className={inputCls} required />
                    <input type="text" placeholder="Last Name" value={lastName}
                      onChange={e => setLastName(e.target.value)} className={inputCls} required />
                  </div>
                  <input type="text" placeholder="Middle Name (optional)" value={middleName}
                    onChange={e => setMiddleName(e.target.value)} className={inputCls} />
                  <input type="text" placeholder="Username" value={username}
                    onChange={e => setUsername(e.target.value)} className={inputCls} required />
                  <input type="tel" placeholder="Contact (e.g. +639123456789)" value={contact}
                    onChange={e => setContact(e.target.value)} className={inputCls} required />
                  <input type="text" placeholder="Address" value={address}
                    onChange={e => setAddress(e.target.value)} className={inputCls} required />
                  <select value={gender} onChange={e => setGender(e.target.value)} className={selectCls} required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </>
              )}

              <input type="email" placeholder="Email Address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} required />
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="Password"
                visible={isLogin ? showLoginPassword : showSignupPassword}
                onToggle={() => (isLogin ? setShowLoginPassword(prev => !prev) : setShowSignupPassword(prev => !prev))}
                required
                className={passwordInputCls}
              />
              {!isLogin && (
                <p className="text-[11px] text-[#a0b0a8] -mt-3">
                  Password must be at least 8 characters and include uppercase, lowercase, and a special character.
                </p>
              )}
              {!isLogin && (
                <PasswordField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm Password"
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(prev => !prev)}
                  required
                  className={passwordInputCls}
                />
              )}

              {authError && (
                <p className={`text-xs text-center tracking-wide ${authError.includes("created") ? "text-green-400" : "text-red-400"}`}>
                  {authError}
                </p>
              )}

              <button type="submit" disabled={authLoading}
                className="mt-2 py-3 text-sm tracking-[0.3em] font-semibold transition disabled:opacity-50"
                style={{ backgroundColor: "#d4d7c7", color: "#132222" }}
                onMouseEnter={e => !authLoading && (e.currentTarget.style.backgroundColor = "#c5c8b8")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#d4d7c7")}
              >
                {authLoading ? "PLEASE WAIT..." : isLogin ? "LOGIN" : "CREATE ACCOUNT"}
              </button>
            </form>

            <p className="text-center text-[#a0b0a8] text-xs mt-6 tracking-wide">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setIsLogin(!isLogin); resetAuthFields(); }}
                className="text-[#d4d7c7] underline hover:text-white transition">
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
