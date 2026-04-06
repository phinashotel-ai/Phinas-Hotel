"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const CATEGORIES = ["All", "Grills", "Mains", "Burgers", "Ribs & BBQ", "Seafood", "Sides", "Drinks"] as const;
type Category = typeof CATEGORIES[number];

type FoodItem = { id: number; name: string; desc: string; price: number; category: Category; emoji: string };
type CartItem = FoodItem & { qty: number };

interface BookingBenefit {
  id: number;
  room_name: string;
  room_number: string;
  guests: number;
  free_food_guests: number;
  extra_guest_count: number;
}

const MENU: FoodItem[] = [
  // Grills
  { id: 1,  name: "Wagyu Ribeye 300g",    desc: "Marbled wagyu, truffle butter, roasted garlic",           price: 1480, category: "Grills",    emoji: "🥩" },
  { id: 2,  name: "T-Bone Steak",         desc: "400g T-bone, chimichurri, seasoned fries",                price: 1250, category: "Grills",    emoji: "🥩" },
  { id: 3,  name: "Tomahawk Steak",       desc: "600g bone-in ribeye, herb butter, grilled corn",          price: 2200, category: "Grills",    emoji: "🔥" },
  { id: 4,  name: "Mixed Grill Platter",  desc: "Beef, pork, chicken, chorizo & grilled veggies",          price: 980,  category: "Grills",    emoji: "🍖" },
  { id: 5,  name: "Grilled Chicken",      desc: "Marinated thighs, garlic rice, atchara",                  price: 420,  category: "Grills",    emoji: "🍗" },
  { id: 6,  name: "Grilled Salmon Steak", desc: "Atlantic salmon, lemon butter, asparagus",                price: 720,  category: "Grills",    emoji: "🐟" },
  // Mains
  { id: 7,  name: "Crispy Pata",          desc: "Deep-fried pork knuckle, liver sauce, pickled papaya",    price: 720,  category: "Mains",     emoji: "🍖" },
  { id: 8,  name: "Beef Caldereta",       desc: "Tender beef chunks in rich tomato-liver sauce",           price: 520,  category: "Mains",     emoji: "🍲" },
  { id: 9,  name: "Kare-Kare",            desc: "Oxtail & tripe in peanut sauce, bagoong",                 price: 580,  category: "Mains",     emoji: "🥜" },
  { id: 10, name: "Lechon Kawali",        desc: "Crispy pork belly slab, mang tomas sauce",                price: 460,  category: "Mains",     emoji: "🐷" },
  { id: 11, name: "Bulalo",               desc: "Beef marrow bone soup, corn, cabbage, patis",             price: 620,  category: "Mains",     emoji: "🍲" },
  { id: 12, name: "Chicken Inasal",       desc: "Grilled marinated chicken, garlic rice, chicken oil",     price: 380,  category: "Mains",     emoji: "🍗" },
  // Burgers
  { id: 13, name: "Smash Burger",         desc: "Double smash patty, cheddar, caramelized onion, brioche", price: 420,  category: "Burgers",   emoji: "🍔" },
  { id: 14, name: "BBQ Bacon Burger",     desc: "Beef patty, crispy bacon, BBQ sauce, coleslaw",           price: 460,  category: "Burgers",   emoji: "🍔" },
  { id: 15, name: "Mushroom Swiss",       desc: "Beef patty, sautéed mushrooms, Swiss cheese",             price: 440,  category: "Burgers",   emoji: "🍄" },
  { id: 16, name: "Spicy Jalapeño",       desc: "Beef patty, jalapeños, pepper jack, sriracha mayo",       price: 450,  category: "Burgers",   emoji: "🌶️" },
  // Ribs & BBQ
  { id: 17, name: "Full Rack Pork Ribs",  desc: "Slow-smoked ribs, smoky BBQ glaze, coleslaw",             price: 980,  category: "Ribs & BBQ", emoji: "🍖" },
  { id: 18, name: "Half Rack Pork Ribs",  desc: "Half rack, BBQ glaze, seasoned fries",                   price: 580,  category: "Ribs & BBQ", emoji: "🍖" },
  { id: 19, name: "BBQ Chicken Platter",  desc: "Half chicken, smoky BBQ, corn on the cob",                price: 520,  category: "Ribs & BBQ", emoji: "🍗" },
  { id: 20, name: "Pulled Pork Sandwich", desc: "Slow-cooked pulled pork, brioche bun, pickles",           price: 380,  category: "Ribs & BBQ", emoji: "🥪" },
  // Seafood
  { id: 21, name: "Grilled Lapu-Lapu",   desc: "Whole grouper, lemon butter, garlic rice",                price: 820,  category: "Seafood",   emoji: "🐟" },
  { id: 22, name: "Garlic Butter Shrimp",desc: "Tiger prawns, garlic butter, crusty bread",               price: 580,  category: "Seafood",   emoji: "🦐" },
  { id: 23, name: "Sinigang na Hipon",   desc: "Shrimp in tamarind broth, kangkong, radish",              price: 520,  category: "Seafood",   emoji: "🦐" },
  { id: 24, name: "Crispy Calamari",     desc: "Fried squid rings, spicy aioli dip",                      price: 340,  category: "Seafood",   emoji: "🦑" },
  // Sides
  { id: 25, name: "Seasoned Fries",      desc: "Crispy fries, house seasoning, dipping sauce",            price: 160,  category: "Sides",     emoji: "🍟" },
  { id: 26, name: "Garlic Rice",         desc: "Sinangag-style garlic fried rice",                        price: 120,  category: "Sides",     emoji: "🍚" },
  { id: 27, name: "Corn on the Cob",     desc: "Grilled corn, butter, sea salt",                          price: 140,  category: "Sides",     emoji: "🌽" },
  { id: 28, name: "Onion Rings",         desc: "Beer-battered onion rings, ranch dip",                    price: 180,  category: "Sides",     emoji: "🧅" },
  // Drinks
  { id: 29, name: "San Miguel Beer",     desc: "Cold draft beer, 330ml",                                  price: 140,  category: "Drinks",    emoji: "🍺" },
  { id: 30, name: "Red Horse Beer",      desc: "Strong beer, 500ml",                                      price: 160,  category: "Drinks",    emoji: "🍺" },
  { id: 31, name: "House Red Wine",      desc: "Glass of Cabernet Sauvignon",                             price: 280,  category: "Drinks",    emoji: "🍷" },
  { id: 32, name: "Whiskey on the Rocks",desc: "House blended whiskey, ice",                              price: 320,  category: "Drinks",    emoji: "🥃" },
  { id: 33, name: "Iced Calamansi",      desc: "Fresh calamansi, honey, sparkling water",                 price: 110,  category: "Drinks",    emoji: "🍋" },
  { id: 34, name: "Espresso",            desc: "Double shot, locally sourced beans",                      price: 120,  category: "Drinks",    emoji: "☕" },
];

export default function MenFoodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReturnToDashboard = searchParams.get("next") === "user-dashboard";
  const bookingId = searchParams.get("booking");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingBenefit, setBookingBenefit] = useState<BookingBenefit | null>(null);
  const [loadingBenefit, setLoadingBenefit] = useState(false);

  const [date, setDate]     = useState("");
  const [time, setTime]     = useState("");
  const [guests, setGuests] = useState("2");
  const [notes, setNotes]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const filtered   = activeCategory === "All" ? MENU : MENU.filter(f => f.category === activeCategory);
  const cartTotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);
  const complimentaryGuests = bookingBenefit?.free_food_guests ?? 0;
  const chargeableGuests = bookingBenefit?.extra_guest_count ?? 0;
  const payableEstimate = bookingBenefit && bookingBenefit.guests > 0
    ? cartTotal * (chargeableGuests / bookingBenefit.guests)
    : cartTotal;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !bookingId) return;

    setLoadingBenefit(true);
    fetch(`${API}/hotelroom/bookings/${bookingId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Booking benefit not found.");
        return res.json();
      })
      .then(data => {
        setBookingBenefit({
          id: data.id,
          room_name: data.room_name,
          room_number: data.room_number,
          guests: Number(data.guests || 0),
          free_food_guests: Number(data.free_food_guests || 0),
          extra_guest_count: Number(data.extra_guest_count || 0),
        });
        setGuests(String(data.guests || 2));
      })
      .catch(() => setBookingBenefit(null))
      .finally(() => setLoadingBenefit(false));
  }, [bookingId]);

  function addToCart(item: FoodItem) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id: number) {
    setCart(prev => {
      const ex = prev.find(c => c.id === id);
      if (!ex) return prev;
      if (ex.qty === 1) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  function getQty(id: number) {
    return cart.find(c => c.id === id)?.qty ?? 0;
  }

  async function handleConfirmOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!date.trim() || !time.trim()) { setError("Please enter date and time."); return; }
    if (cart.length === 0) { setError("Your cart is empty."); return; }

    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/dining/bookings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking: bookingBenefit?.id,
          date,
          time,
          guests: parseInt(guests) || 2,
          notes,
          items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })),
          total: cartTotal,
        }),
      });

      if (res.status === 401) { localStorage.clear(); router.push("/"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Could not place order.");

      setSuccess(`Order confirmed! #${data.id} - ${date} at ${time} - Menu total: PHP ${Number(data.total).toLocaleString()} - To pay: PHP ${Number(data.payable_total).toLocaleString()}`);
      setCart([]);
      setDate(""); setTime(""); setGuests("2"); setNotes("");
      setShowBooking(false);
      setShowCart(false);
      if (shouldReturnToDashboard) {
        const nextTab = searchParams.get("tab");
        window.setTimeout(() => {
          router.push(nextTab ? `/user-dashboard?tab=${nextTab}` : "/user-dashboard");
        }, 1600);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-transparent border-b border-[#9aa79f] text-[#1c352c] text-sm py-2 focus:outline-none focus:border-[#8a6a3a] transition placeholder-[#7d8a83]";
  const labelCls = "text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1";

  return (
    <div
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "linear-gradient(rgba(28, 53, 44, 0.42), rgba(28, 53, 44, 0.32)), url('/che.jpg')",
        backgroundColor: "#faf9f6",
        color: "#1c352c",
      }}
    >

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 py-5 backdrop-blur"
        style={{ backgroundColor: "rgba(19, 34, 34, 0.52)", borderBottom: "1px solid rgba(212, 215, 199, 0.45)" }}>
        <Link href="/" className="tracking-[0.3em] text-lg font-light" style={{ color: "#fff8ed", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>PHINAS HOTEL</Link>
        <div className="hidden md:flex gap-8 items-center text-sm tracking-widest">
          <Link href="/rooms"   className="text-[#d4d7c7] hover:text-white transition">Rooms</Link>
          <Link href="/dining"  className="text-[#d4d7c7] hover:text-white transition">Dining</Link>
          <Link href="/menfood" className="text-[#c8a060] border-b border-[#c8a060] pb-0.5">Men&apos;s Menu</Link>
        </div>
        {cartCount > 0 && (
          <button onClick={() => setShowCart(true)}
            className="px-4 py-2 text-xs tracking-widest font-bold transition"
            style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 20 }}>
            🛒 {cartCount} · ₱{cartTotal.toLocaleString()}
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-8 text-center">
        {shouldReturnToDashboard && (
          <div
            className="max-w-2xl mx-auto mb-8 px-5 py-4 text-sm tracking-wide"
            style={{ backgroundColor: "rgba(19, 34, 34, 0.48)", color: "#fff8ed", border: "1px solid rgba(212, 215, 199, 0.45)", borderRadius: 10 }}
          >
            Your room booking is confirmed. Choose your menfood first, then you will go to your dashboard.
          </div>
        )}
        {loadingBenefit && (
          <div
            className="max-w-2xl mx-auto mb-8 px-5 py-4 text-sm tracking-wide"
            style={{ backgroundColor: "rgba(19, 34, 34, 0.48)", color: "#fff8ed", border: "1px solid rgba(212, 215, 199, 0.45)", borderRadius: 10 }}
          >
            Loading booking food benefit...
          </div>
        )}
        {bookingBenefit && (
          <div
            className="max-w-2xl mx-auto mb-8 px-5 py-4 text-sm tracking-wide"
            style={{ backgroundColor: "rgba(16, 40, 29, 0.58)", color: "#f3fbf6", border: "1px solid rgba(183, 217, 194, 0.5)", borderRadius: 10 }}
          >
        Booking #{bookingBenefit.id} for {bookingBenefit.room_name} room {bookingBenefit.room_number}: {complimentaryGuests} guest{complimentaryGuests > 1 ? "s" : ""} get free food based on the room settings. {chargeableGuests > 0 ? `${chargeableGuests} extra guest${chargeableGuests > 1 ? "s" : ""} will be charged for food.` : "No extra food charge for guests on this booking."}
          </div>
        )}
        <p className="text-xs tracking-[0.5em] uppercase mb-3 font-semibold" style={{ color: "#f0c98a", textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>Bold Flavors · Hearty Portions</p>
        <h1 className="text-5xl md:text-7xl font-thin tracking-[0.25em] mb-4" style={{ color: "#fffdf7", textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}>MEN&apos;S MENU</h1>
        <div className="w-16 h-px mx-auto mb-6" style={{ backgroundColor: "#8a6a3a" }} />
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: "#f3efe6", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
          Steaks, ribs, burgers, and cold drinks — everything a man needs at the table.
        </p>
      </section>

      {/* Category Tabs */}
      <div className="sticky top-[73px] z-40 overflow-x-auto backdrop-blur" style={{ backgroundColor: "rgba(19, 34, 34, 0.45)", borderBottom: "1px solid rgba(212, 215, 199, 0.4)" }}>
        <div className="flex gap-1 px-6 py-3 min-w-max">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="px-5 py-2 text-xs tracking-widest uppercase transition border"
              style={{
                backgroundColor: activeCategory === cat ? "#8a6a3a" : "transparent",
                color:           activeCategory === cat ? "#faf9f6"  : "#71867e",
                borderColor:     activeCategory === cat ? "#8a6a3a"  : "#2a3a3a",
                borderRadius: 4,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <section className="px-6 py-10 max-w-6xl mx-auto">
        {success && (
          <div className="mb-6 px-5 py-4 text-sm tracking-wide" style={{ backgroundColor: "rgba(16, 40, 29, 0.58)", color: "#d7f7e1", border: "1px solid rgba(187, 247, 208, 0.4)", borderRadius: 8 }}>
            {success}
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const qty = getQty(item.id);
            return (
              <div key={item.id} className="flex flex-col justify-between p-5"
                style={{ backgroundColor: "rgba(19, 34, 34, 0.48)", border: "1px solid rgba(212, 215, 199, 0.4)", borderRadius: 10 }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl w-14 h-14 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(212, 215, 199, 0.6)", borderRadius: 8 }}>
                    {item.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1" style={{ color: "#fff8ed" }}>{item.name}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#71867e" }}>{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold" style={{ color: "#c8a060" }}>₱{item.price.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 flex items-center justify-center text-lg transition"
                          style={{ border: "1px solid #8a6a3a", color: "#c8a060", borderRadius: 4 }}>−</button>
                        <span className="text-sm font-bold w-5 text-center" style={{ color: "#fff8ed" }}>{qty}</span>
                      </>
                    )}
                    <button onClick={() => addToCart(item)}
                      className="w-9 h-9 flex items-center justify-center text-xl font-bold transition"
                      style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 6 }}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button onClick={() => setShowCart(true)}
            className="px-8 py-4 text-sm tracking-[0.2em] font-bold shadow-2xl transition"
            style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 12, minWidth: 320 }}>
            VIEW ORDER · {cartCount} items · ₱{cartTotal.toLocaleString()}
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowCart(false)}>
          <div className="w-full max-w-lg p-6 pb-10" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: "#faf9f6", borderTop: "1px solid #d4d7c7", borderRadius: "20px 20px 0 0" }}>
            <p className="text-sm font-bold tracking-[0.3em] mb-5" style={{ color: "#1c352c" }}>YOUR ORDER</p>
            <div className="max-h-72 overflow-y-auto flex flex-col gap-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 pb-3" style={{ borderBottom: "1px solid #1e3030" }}>
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#1c352c" }}>{item.name}</p>
                    <p className="text-xs" style={{ color: "#71867e" }}>₱{item.price.toLocaleString()} × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 flex items-center justify-center"
                      style={{ border: "1px solid #8a6a3a", color: "#c8a060", borderRadius: 4 }}>−</button>
                    <span className="text-sm font-bold w-4 text-center" style={{ color: "#1c352c" }}>{item.qty}</span>
                    <button onClick={() => addToCart(item)}
                      className="w-7 h-7 flex items-center justify-center"
                      style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 4 }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center py-4 mb-4" style={{ borderTop: "1px solid #2a3a3a" }}>
              <span className="text-xs tracking-[0.3em]" style={{ color: "#71867e" }}>TOTAL</span>
              <span className="text-2xl font-light" style={{ color: "#c8a060" }}>₱{cartTotal.toLocaleString()}</span>
            </div>
            {bookingBenefit && (
              <div className="mb-4 rounded-md px-4 py-3 text-sm" style={{ backgroundColor: "rgba(236, 253, 245, 0.82)", color: "#1c352c", border: "1px solid #b7d9c2" }}>
              Estimated payable after complimentary guests: PHP {payableEstimate.toLocaleString()}
              </div>
            )}
            <button onClick={() => { setShowCart(false); setShowBooking(true); }}
              className="w-full py-4 text-sm tracking-[0.3em] font-bold mb-3 transition"
              style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 6 }}>
              BOOK A TABLE
            </button>
            <button onClick={() => setShowCart(false)}
              className="w-full py-3 text-xs tracking-[0.3em] transition"
              style={{ border: "1px solid #2a3a3a", color: "#71867e", borderRadius: 6 }}>
              CONTINUE ORDERING
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowBooking(false)}>
          <div className="w-full max-w-lg p-6 pb-10" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: "#faf9f6", borderTop: "1px solid #d4d7c7", borderRadius: "20px 20px 0 0" }}>
            <p className="text-sm font-bold tracking-[0.3em] mb-6" style={{ color: "#1c352c" }}>RESERVE A TABLE</p>
            <form onSubmit={handleConfirmOrder} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Time *</label>
                  <select value={time} onChange={e => setTime(e.target.value)} required
                    className="w-full border-b border-[#3a4a3a] text-sm py-2 focus:outline-none focus:border-[#c8a060] transition"
                    style={{ backgroundColor: "#faf9f6", color: time ? "#1c352c" : "#7d8a83" }}>
                    <option value="">Select time</option>
                    {["11:00 AM","12:00 PM","1:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM"].map(t => (
                      <option key={t} value={t} style={{ backgroundColor: "#faf9f6" }}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Number of Guests</label>
                <select value={guests} onChange={e => setGuests(e.target.value)}
                  className="w-full border-b border-[#3a4a3a] text-sm py-2 focus:outline-none focus:border-[#c8a060] transition"
                  style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n} style={{ backgroundColor: "#faf9f6" }}>{n} Guest{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Special Requests</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Allergies, seating preference..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="flex justify-between items-center py-3" style={{ borderTop: "1px solid #2a3a3a" }}>
                <span className="text-xs tracking-[0.3em]" style={{ color: "#71867e" }}>ORDER TOTAL</span>
                <span className="text-xl font-light" style={{ color: "#c8a060" }}>₱{cartTotal.toLocaleString()}</span>
              </div>
              {bookingBenefit && (
                <div className="rounded-md px-4 py-3 text-sm" style={{ backgroundColor: "rgba(236, 253, 245, 0.82)", color: "#1c352c", border: "1px solid #b7d9c2" }}>
                  Complimentary guests: {complimentaryGuests}. Chargeable guests: {chargeableGuests}. Estimated payable: PHP {payableEstimate.toLocaleString()}.
                </div>
              )}
              {error   && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-4 text-sm tracking-[0.3em] font-bold transition disabled:opacity-50"
                style={{ backgroundColor: "#8a6a3a", color: "#faf9f6", borderRadius: 6 }}>
                {submitting ? "CONFIRMING..." : "CONFIRM RESERVATION"}
              </button>
              <button type="button" onClick={() => setShowBooking(false)}
                className="w-full py-3 text-xs tracking-[0.3em] transition"
                style={{ border: "1px solid #2a3a3a", color: "#71867e", borderRadius: 6 }}>
                BACK TO ORDER
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-10 px-8 text-center backdrop-blur" style={{ backgroundColor: "rgba(19, 34, 34, 0.45)", borderTop: "1px solid rgba(212, 215, 199, 0.4)" }}>
        <p className="text-xs tracking-[0.4em]" style={{ color: "#d4d7c7" }}>© 2024 PHINAS HOTEL · MEN&apos;S MENU</p>
      </footer>
    </div>
  );
}
