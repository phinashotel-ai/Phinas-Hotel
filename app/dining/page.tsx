"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const menuTabs = ["Breakfast", "Lunch", "Dinner", "Drinks"] as const;
type MenuTab = typeof menuTabs[number];

const menu: Record<MenuTab, { name: string; desc: string; price: string }[]> = {
  Breakfast: [
    { name: "Filipino Tapsilog",       desc: "Cured beef tapa, garlic fried rice, sunny-side egg, pickled papaya",  price: "₱380" },
    { name: "Eggs Benedict Phinas",    desc: "Poached eggs, cured bangus, hollandaise, toasted brioche",            price: "₱420" },
    { name: "Overnight Oats Bowl",     desc: "Rolled oats, mango compote, chia seeds, coconut cream",              price: "₱280" },
    { name: "Pancake Stack",           desc: "Pandan-infused pancakes, salted caramel, fresh berries",             price: "₱320" },
    { name: "Continental Basket",      desc: "Assorted pastries, butter, jam, fresh fruit, coffee or tea",         price: "₱350" },
    { name: "Champorado Royale",       desc: "Dark chocolate rice porridge, tuyo flakes, condensed milk drizzle",  price: "₱260" },
  ],
  Lunch: [
    { name: "Sinigang na Salmon",      desc: "Tamarind broth, salmon belly, fresh vegetables, steamed rice",       price: "₱580" },
    { name: "Kare-Kare Terrine",       desc: "Slow-braised oxtail, peanut sauce, bagoong, banana blossom",         price: "₱680" },
    { name: "Grilled Sea Bass",        desc: "Lemon butter, capers, roasted asparagus, herb mashed potato",        price: "₱720" },
    { name: "Chicken Inasal",          desc: "Charcoal-grilled chicken, annatto oil, garlic rice, atchara",        price: "₱480" },
    { name: "Mushroom Risotto",        desc: "Arborio rice, wild mushrooms, parmesan, truffle oil",                price: "₱520" },
    { name: "Phinas Club Sandwich",    desc: "Triple-decker, smoked chicken, bacon, avocado, fries",               price: "₱440" },
  ],
  Dinner: [
    { name: "Wagyu Beef Tenderloin",   desc: "200g wagyu, red wine jus, truffle pomme purée, seasonal greens",     price: "₱1,850" },
    { name: "Lobster Thermidor",       desc: "Half lobster, cognac cream, gruyère gratin, garlic baguette",        price: "₱2,200" },
    { name: "Duck Confit",             desc: "Slow-cooked duck leg, cherry gastrique, lentil cassoulet",           price: "₱1,200" },
    { name: "Seafood Paella",          desc: "Saffron rice, prawns, mussels, squid, chorizo, aioli",               price: "₱980" },
    { name: "Lamb Rack",               desc: "Herb-crusted lamb, rosemary jus, ratatouille, polenta",              price: "₱1,650" },
    { name: "Vegetarian Tasting",      desc: "Five-course plant-based menu, seasonal produce, chef's selection",   price: "₱880" },
  ],
  Drinks: [
    { name: "Phinas Signature Mojito", desc: "White rum, calamansi, mint, soda, brown sugar rim",                  price: "₱280" },
    { name: "Mango Sunset",            desc: "Fresh mango, passion fruit, coconut rum, grenadine",                 price: "₱260" },
    { name: "Rooftop Negroni",         desc: "Gin, Campari, sweet vermouth, orange peel",                         price: "₱320" },
    { name: "Ube Latte",               desc: "Ube extract, oat milk, espresso, vanilla foam",                      price: "₱180" },
    { name: "Buko Pandan Cooler",      desc: "Young coconut water, pandan syrup, lychee, crushed ice",             price: "₱160" },
    { name: "Wine by the Glass",       desc: "Curated selection of red, white, and rosé — ask your sommelier",     price: "₱380" },
  ],
};

const restaurants = [
  {
    name: "The Phinas Table",
    tag: "Fine Dining · Level 3",
    desc: "Our flagship restaurant offers an elevated Filipino-European fusion experience. Intimate, candlelit, and unforgettable — perfect for special occasions.",
    hours: "6:00 PM – 11:00 PM",
    img: "/che2.jpg",
    accent: "#1c352c",
  },
  {
    name: "Rooftop Bar & Grill",
    tag: "Casual Dining · Rooftop",
    desc: "Panoramic city views, craft cocktails, and wood-fired grills. The perfect sunset spot for guests and locals alike.",
    hours: "4:00 PM – 1:00 AM",
    img: "/che3.jpg",
    accent: "#4a6358",
  },
  {
    name: "Café Phinas",
    tag: "All-Day Café · Lobby",
    desc: "Light bites, artisan coffee, and freshly baked pastries served all day. A cozy retreat in the heart of the hotel.",
    hours: "6:00 AM – 10:00 PM",
    img: "/che1.jpg",
    accent: "#71867e",
  },
];

export default function DiningPage() {
  const [activeTab, setActiveTab] = useState<MenuTab>("Breakfast");
  const [resForm, setResForm] = useState({ name: "", email: "", phone: "", date: "", time: "", guests: "2", notes: "" });
  const [resLoading, setResLoading] = useState(false);
  const [resMsg, setResMsg]         = useState("");
  const [resError, setResError]     = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API}/user/dashboard/user/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load user");
        return res.json();
      })
      .then(data => {
        const user = data?.user;
        if (!user) return;
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        setResForm(prev => ({
          ...prev,
          name: prev.name || fullName,
          email: prev.email || user.email || "",
          phone: prev.phone || user.contact || "",
        }));
      })
      .catch(() => {
        // Keep the form usable even if profile loading fails.
      });
  }, []);

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResLoading(true); setResMsg(""); setResError("");
    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", "/dining");
      window.location.href = "/";
      return;
    }
    try {
      const res = await fetch(`${API}/dining/reservations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: resForm.name,
          email: resForm.email,
          phone: resForm.phone,
          date: resForm.date,
          time: resForm.time,
          guests: Number(resForm.guests),
          notes: resForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reservation.");
      setResMsg("Reservation saved successfully. We will confirm your table shortly.");
      setResForm(prev => ({ ...prev, date: "", time: "", guests: "2", notes: "" }));
    } catch {
      setResError("Could not send reservation. Please try again or call us directly.");
    } finally {
      setResLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>

      <SiteHeader activeHref="/dining" cta={{ label: "BOOK NOW", href: "/roomsearch" }} />

      {/* ── HERO ── */}
      <section className="relative h-[75vh] flex items-end justify-center pb-20">
        <Image src="/che3.jpg" alt="Dining at Phinas" fill priority className="object-cover" style={{ filter: "brightness(0.35)" }} />
        <div className="relative z-10 text-center px-4">
          <p className="text-[#d4d7c7] tracking-[0.5em] text-xs uppercase mb-3">Culinary Excellence</p>
          <h1 className="text-white text-5xl md:text-7xl font-thin tracking-[0.25em] mb-4">DINING</h1>
          <div className="w-16 h-px bg-[#d4d7c7] mx-auto mb-6" />
          <p className="text-[#d4d7c7] text-sm max-w-lg mx-auto leading-relaxed tracking-wide">
            From sunrise breakfasts to candlelit dinners — every meal at Phinas is a celebration of Filipino flavors and world-class cuisine.
          </p>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: "#faf9f6" }}>
        <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-3">Our Philosophy</p>
        <h2 className="text-3xl md:text-4xl font-thin tracking-[0.2em] mb-6">
          FOOD IS OUR <span className="font-semibold">LOVE LANGUAGE</span>
        </h2>
        <p className="max-w-2xl mx-auto text-sm leading-relaxed text-[#4a6358]">
          At Phinas Hotel, dining is not just a meal — it is an experience. Our chefs source the finest local ingredients, honoring Filipino culinary heritage while weaving in global techniques to create dishes that are both familiar and extraordinary.
        </p>
      </section>

      {/* ── RESTAURANTS ── */}
      <section className="py-4 pb-24 px-6" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-3">Where to Eat</p>
            <h2 className="text-3xl md:text-4xl font-thin tracking-[0.2em]">
              OUR <span className="font-semibold">RESTAURANTS</span>
            </h2>
          </div>
          <div className="flex flex-col gap-1">
            {restaurants.map((r, i) => (
              <div key={i} className={`grid md:grid-cols-2 ${i % 2 !== 0 ? "md:grid-flow-dense" : ""}`}>
                <div className={`relative h-72 md:h-96 overflow-hidden ${i % 2 !== 0 ? "md:col-start-2" : ""}`}>
                  <Image src={r.img} alt={r.name} fill className="object-cover hover:scale-105 transition-transform duration-700" />
                </div>
                <div
                  className={`flex flex-col justify-center px-10 md:px-16 py-12 ${i % 2 !== 0 ? "md:col-start-1 md:row-start-1" : ""}`}
                  style={{ backgroundColor: r.accent }}
                >
                  <p className="text-[#a0b0a8] tracking-[0.4em] text-xs uppercase mb-3">{r.tag}</p>
                  <h3 className="text-white text-2xl md:text-3xl font-thin tracking-[0.15em] mb-4">{r.name}</h3>
                  <p className="text-[#d4d7c7] text-sm leading-relaxed mb-6">{r.desc}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-px bg-[#71867e]" />
                    <p className="text-[#71867e] text-xs tracking-widest">Open: {r.hours}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MENU ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#132222" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-3">Explore Our Menu</p>
            <h2 className="text-white text-3xl md:text-4xl font-thin tracking-[0.2em]">
              SAMPLE <span className="font-semibold">MENU</span>
            </h2>
          </div>

          {/* Menu Tabs */}
          <div className="flex justify-center gap-1 mb-12 flex-wrap">
            {menuTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-8 py-3 text-xs tracking-[0.3em] uppercase transition border"
                style={{
                  backgroundColor: activeTab === tab ? "#d4d7c7" : "transparent",
                  color:           activeTab === tab ? "#132222"  : "#71867e",
                  borderColor:     activeTab === tab ? "#d4d7c7"  : "#4a6358",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="grid sm:grid-cols-2 gap-px bg-[#1c352c]">
            {menu[activeTab].map((item, i) => (
              <div key={i} className="px-8 py-7 flex justify-between items-start gap-4" style={{ backgroundColor: "#132222" }}>
                <div className="flex-1">
                  <h4 className="text-white text-sm tracking-[0.15em] mb-1">{item.name}</h4>
                  <p className="text-[#71867e] text-xs leading-relaxed">{item.desc}</p>
                </div>
                <span className="text-[#d4d7c7] text-sm font-light tracking-widest whitespace-nowrap">{item.price}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[#4a6358] text-xs tracking-widest mt-8">
            * Menu items and prices are subject to change. Please ask your server for today&apos;s specials.
          </p>
        </div>
      </section>

      {/* ── CHEF QUOTE ── */}
      <section className="relative py-28 px-6 text-center">
        <Image src="/che4.jpg" alt="Chef" fill className="object-cover" style={{ filter: "brightness(0.25)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[#d4d7c7] text-3xl md:text-4xl font-thin tracking-wide leading-relaxed mb-6">
            &quot;Every dish tells a story of the land, the sea, and the people of the Philippines.&quot;
          </p>
          <div className="w-12 h-px bg-[#71867e] mx-auto mb-4" />
          <p className="text-[#71867e] text-xs tracking-[0.4em] uppercase">Executive Chef · Phinas Hotel</p>
        </div>
      </section>

      {/* ── PRIVATE DINING ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#faf9f6" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative h-80 overflow-hidden">
            <Image src="/che.jpg" alt="Private Dining" fill className="object-cover" />
          </div>
          <div>
            <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-4">Exclusive Experience</p>
            <h2 className="text-3xl font-thin tracking-[0.15em] mb-6">
              PRIVATE <span className="font-semibold">DINING</span>
            </h2>
            <p className="text-sm leading-relaxed text-[#4a6358] mb-4">
              Celebrate life&apos;s most precious moments in our private dining rooms. Whether it&apos;s an intimate anniversary dinner, a corporate luncheon, or a family gathering, our team will craft a bespoke menu and ambiance tailored entirely to you.
            </p>
            <p className="text-sm leading-relaxed text-[#4a6358] mb-8">
              Accommodates 4 to 30 guests. Full AV setup available. Dedicated butler service included.
            </p>
            <div className="flex gap-4">
              <div className="border-l-2 border-[#1c352c] pl-4">
                <p className="text-xs tracking-widest text-[#71867e] mb-1">RESERVATIONS</p>
                <p className="text-sm font-medium">+63 123 456 7890</p>
              </div>
              <div className="border-l-2 border-[#1c352c] pl-4">
                <p className="text-xs tracking-widest text-[#71867e] mb-1">EMAIL</p>
                <p className="text-sm font-medium">dining@phinashotel.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESERVATION FORM ── */}
      <section className="py-24 px-6" style={{ backgroundColor: "#1c352c" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-3">Reserve a Table</p>
            <h2 className="text-white text-3xl md:text-4xl font-thin tracking-[0.2em]">
              BOOK A <span className="font-semibold">TABLE</span>
            </h2>
          </div>
          <form onSubmit={handleReservation} className="flex flex-col gap-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Full Name *</label>
                <input required value={resForm.name} onChange={e => setResForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Email *</label>
                <input required type="email" value={resForm.email} onChange={e => setResForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Phone</label>
                <input value={resForm.phone} onChange={e => setResForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Number of Guests *</label>
                <select required value={resForm.guests} onChange={e => setResForm(p => ({ ...p, guests: e.target.value }))}
                  className="w-full bg-[#1c352c] border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} className="bg-[#1c352c]">{n} Guest{n > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Date *</label>
                <input required type="date" value={resForm.date} min={new Date().toISOString().split("T")[0]}
                  onChange={e => setResForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-transparent border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Preferred Time *</label>
                <select required value={resForm.time} onChange={e => setResForm(p => ({ ...p, time: e.target.value }))}
                  className="w-full bg-[#1c352c] border-b border-[#71867e] text-white text-sm py-2 focus:outline-none focus:border-[#d4d7c7] transition">
                  <option value="" className="bg-[#1c352c]">Select time</option>
                  {["6:00 AM","7:00 AM","8:00 AM","9:00 AM","12:00 PM","1:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM"].map(t => (
                    <option key={t} value={t} className="bg-[#1c352c]">{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Special Notes</label>
              <textarea value={resForm.notes} onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))}
                rows={3} placeholder="Dietary restrictions, special occasions, seating preferences..."
                className="w-full bg-transparent border-b border-[#71867e] text-white text-sm py-2 resize-none focus:outline-none focus:border-[#d4d7c7] transition" />
            </div>
            {resMsg   && <p className="text-xs text-emerald-400 tracking-wide">{resMsg}</p>}
            {resError && <p className="text-xs text-red-400 tracking-wide">{resError}</p>}
            <button type="submit" disabled={resLoading}
              className="py-4 text-xs tracking-[0.3em] font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: "#d4d7c7", color: "#132222" }}>
              {resLoading ? "SENDING..." : "REQUEST RESERVATION"}
            </button>
          </form>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: "#1c352c" }}>
        <p className="text-[#71867e] tracking-[0.5em] text-xs uppercase mb-3">Reserve Your Table</p>
        <h2 className="text-white text-3xl md:text-4xl font-thin tracking-[0.2em] mb-6">
          DINE WITH <span className="font-semibold">US TONIGHT</span>
        </h2>
        <p className="text-[#a0b0a8] text-sm max-w-md mx-auto mb-8 leading-relaxed">
          Book your stay and enjoy complimentary breakfast for two. Experience the full Phinas dining journey.
        </p>
        <Link
          href="/roomsearch"
          className="inline-block px-10 py-3 text-xs tracking-[0.3em] border border-[#d4d7c7] text-[#d4d7c7] hover:bg-[#d4d7c7] hover:text-[#132222] transition"
        >
          BOOK YOUR STAY
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-14 px-8" style={{ backgroundColor: "#132222" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-[#fff8ed] tracking-[0.3em] text-sm font-light mb-4">PHINAS HOTEL</h3>
            <p className="text-[#71867e] text-xs leading-relaxed">Experience PHINAS like never before.</p>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">QUICK LINKS</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li><Link href="/rooms"      className="hover:text-[#d4d7c7] transition">Our Rooms</Link></li>
              <li><Link href="/about"      className="hover:text-[#d4d7c7] transition">About Us</Link></li>
              <li><Link href="/dining"     className="hover:text-[#d4d7c7] transition">Dining</Link></li>
              <li><Link href="/roomsearch" className="hover:text-[#d4d7c7] transition">Book a Room</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#fff8ed] tracking-widest text-xs mb-4">CONTACT</h4>
            <ul className="space-y-2 text-[#71867e] text-xs">
              <li>📍 123 Hotel Street, City</li>
              <li>📞 +63 123 456 7890</li>
              <li>✉️ info@phinashotel.com</li>
            </ul>
          </div>
        </div>
        <div className="text-center mt-10 pt-8 border-t border-[#1c352c] text-[#71867e] text-xs tracking-widest">
          © 2024 PHINAS HOTEL. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
