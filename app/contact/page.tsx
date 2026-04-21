"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const subjects = [
  "General Inquiry",
  "Room Reservation",
  "Dining Reservation",
  "Event & Function",
  "Feedback & Complaint",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", subject: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/user/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess("Your message has been sent! We'll get back to you within 24 hours.");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      } else {
        const data = await res.json();
        setError(Object.values(data).flat().join(" ") || "Failed to send message.");
      }
    } catch {
      setError("Unable to connect. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-[#d4d7c7] px-4 py-3 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition placeholder-[#a0b0a8]";

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>

      <SiteHeader activeHref="/contact" />

      {/* ── HERO ── */}
      <section className="relative h-[60vh] flex items-end justify-center pb-20">
        <Image src="/che2.jpg" alt="Contact Phinas Hotel" fill priority className="object-cover" style={{ filter: "brightness(0.35)" }} />
        <div className="relative z-10 text-center px-4">
          <p className="text-[#d4d7c7] tracking-[0.5em] text-xs uppercase mb-3">We&apos;d Love to Hear From You</p>
          <h1 className="text-white text-5xl md:text-7xl font-thin tracking-[0.25em] mb-4">CONTACT US</h1>
          <div className="w-16 h-px bg-[#d4d7c7] mx-auto" />
        </div>
      </section>


      {/* ── FORM + MAP ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">

          {/* Form */}
          <div>
            <h2 className="text-3xl font-thin tracking-[0.15em] mb-8">
              GET IN <span className="font-semibold">TOUCH</span>
            </h2>

            {success && (
              <div className="mb-6 px-5 py-4 border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm tracking-wide">
                ✓ {success}
              </div>
            )}
            {error && (
              <div className="mb-6 px-5 py-4 border border-red-300 bg-red-50 text-red-600 text-sm tracking-wide">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Full Name *</label>
                  <input
                    name="name" value={form.name} onChange={handleChange}
                    placeholder="Cherreca Comajes Filipinas"
                    className={inputCls} required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Email *</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="cherreca@email.com"
                    className={inputCls} required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Phone</label>
                  <input
                    name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+63 912 345 6789"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Subject *</label>
                  <select
                    name="subject" value={form.subject} onChange={handleChange}
                    className={inputCls} required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Message *</label>
                <textarea
                  name="message" value={form.message} onChange={handleChange}
                  placeholder="Write your message here..."
                  rows={6}
                  className={inputCls + " resize-none"}
                  required
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="mt-2 py-4 text-xs tracking-[0.3em] uppercase font-semibold transition disabled:opacity-50"
                style={{ backgroundColor: "#1c352c", color: "#fff" }}
                onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "#0e2419")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
              >
                {loading ? "SENDING..." : "SEND MESSAGE"}
              </button>
            </form>
          </div>

          {/* Right side — map + extra info */}
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-3">Find Us</p>
              <h2 className="text-3xl font-thin tracking-[0.15em] mb-6">
                OUR <span className="font-semibold">ROOM</span>
              </h2>
            </div>

            {/* Map placeholder */}
            <div className="relative h-72 overflow-hidden border border-[#d4d7c7]">
              <Image src="/che4.jpg" alt="Hotel Location" fill className="object-cover" style={{ filter: "brightness(0.6)" }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              </div>
            </div>

            
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#132222] px-8 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-light tracking-[0.2em] text-[#fff8ed]">PHINAS HOTEL</h3>
            <p className="text-[#71867e] text-xs leading-relaxed">Experience PHINAS like never before.</p>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">QUICK LINKS</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li><Link href="/rooms" className="hover:text-[#d4d7c7] transition">Our Rooms</Link></li>
              <li><Link href="/about" className="hover:text-[#d4d7c7] transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#d4d7c7] transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">CONTACT</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li>📞 +639 702 230 263</li>
              <li>✉️ phinashotel@gmail.com</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">FOLLOW US</h4>
            <div className="flex gap-4 text-[#71867e] text-xl">
              <a href="#" className="hover:text-[#d4d7c7] transition">📘</a>
              <a href="#" className="hover:text-[#d4d7c7] transition">📸</a>
              <a href="#" className="hover:text-[#d4d7c7] transition">🐦</a>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-[#1c352c] pt-8 text-center text-xs tracking-[0.2em] text-[#71867e]">
          © PHINAS HOTEL. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
