"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Booking States
  const pricePerNight = 4500;
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Calculate Nights & Price Automatically
  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = end.getTime() - start.getTime();
      const nights = diffTime / (1000 * 3600 * 24);

      if (nights > 0) {
        setTotalPrice(nights * pricePerNight);

        // Simulated Real-time Availability Check
        const randomAvailability = Math.random() > 0.3;
        setAvailable(randomAvailability);
      } else {
        setTotalPrice(0);
        setAvailable(null);
      }
    }
  }, [checkIn, checkOut]);

  // Generate Booking Reference
  const generateReference = () => {
    return "PH-" + Math.floor(100000 + Math.random() * 900000);
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!available) {
      alert("Room not available for selected dates.");
      return;
    }

    const ref = generateReference();
    setReferenceNumber(ref);
    setConfirmation("Booking Confirmed!");
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black text-zinc-800 dark:text-white relative">

      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 w-full z-20 flex justify-between items-center px-10 py-6 text-white">
        <h1 className="text-2xl font-bold tracking-wide">
          PHINAS HOTEL
        </h1>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowAuth(true);
              setIsLogin(true);
            }}
            className="px-5 py-2 rounded-full border border-white hover:bg-white hover:text-black transition"
          >
            Login
          </button>

          <button
            onClick={() => {
              setShowAuth(true);
              setIsLogin(false);
            }}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center">
        <Image
          src="/che.jpg"
          alt="PHINAS HOTEL"
          fill
          priority
          className="object-cover brightness-50"
        />

        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">
            PHINAS HOTEL
          </h1>
          <p className="text-lg md:text-xl text-zinc-200 max-w-xl mx-auto">
            Experience comfort and unforgettable moments.
          </p>
        </div>
      </section>

      {/* BOOKING SYSTEM */}
      <section className="py-20 px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-xl mx-auto bg-white dark:bg-zinc-800 p-10 rounded-3xl shadow-2xl">

          <h2 className="text-3xl font-bold mb-6 text-center">
            Booking System
          </h2>

          <form onSubmit={handleBooking} className="flex flex-col gap-4">

            {/* Check-in */}
            <div>
              <label className="text-sm">Check-in Date</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-100 dark:bg-zinc-700 outline-none"
                required
              />
            </div>

            {/* Check-out */}
            <div>
              <label className="text-sm">Check-out Date</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-100 dark:bg-zinc-700 outline-none"
                required
              />
            </div>

            {/* Price Calculation */}
            {totalPrice > 0 && (
              <div className="text-lg font-semibold">
                Total Price: ₱{totalPrice.toLocaleString()}
              </div>
            )}

            {/* Availability */}
            {available !== null && (
              <div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    available
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {available ? "Room Available" : "Not Available"}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="mt-4 p-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
            >
              Confirm Booking
            </button>
          </form>

          {/* Confirmation */}
          {confirmation && (
            <div className="mt-6 p-4 bg-green-500 text-white rounded-xl text-center">
              <p className="font-bold">{confirmation}</p>
              <p>Your Reference Number:</p>
              <p className="text-xl font-semibold">{referenceNumber}</p>
            </div>
          )}
        </div>
      </section>

      {/* AUTH MODAL (unchanged) */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white/20 backdrop-blur-2xl border border-white/30 p-10 rounded-3xl w-[400px] text-white relative shadow-2xl">

            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-5 text-xl"
            >
              ✕
            </button>

            <h2 className="text-3xl font-bold mb-6 text-center">
              {isLogin ? "Login" : "Sign Up"}
            </h2>

            <div className="flex flex-col gap-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  className="p-3 rounded-xl bg-white/80 text-black outline-none"
                />
              )}

              <input
                type="email"
                placeholder="Email"
                className="p-3 rounded-xl bg-white/80 text-black outline-none"
              />

              <input
                type="password"
                placeholder="Password"
                className="p-3 rounded-xl bg-white/80 text-black outline-none"
              />

              <button className="mt-4 p-3 rounded-xl bg-black text-white font-semibold hover:bg-zinc-800 transition">
                {isLogin ? "Login" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}