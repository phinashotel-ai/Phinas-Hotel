"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const room = {
    name: "Deluxe Ocean View Room",
    description:
      "Enjoy luxury and comfort in our Deluxe Ocean View Room featuring a private balcony, modern interior design, and breathtaking sea views.",
    price: 4500,
    available: true,
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "Flat-screen TV",
      "Mini Bar",
      "Private Balcony",
      "Hot & Cold Shower",
    ],
    images: ["/che.jpg", "/che.jpg", "/che.jpg"],
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

      {/* ROOM DETAILS SECTION */}
      <section className="py-20 px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">

          <h2 className="text-4xl font-bold mb-10 text-center">
            Room Details
          </h2>

          <div className="grid md:grid-cols-2 gap-10">

            {/* Room Images */}
            <div className="grid grid-cols-2 gap-4">
              {room.images.map((img, index) => (
                <div key={index} className="relative h-48 rounded-2xl overflow-hidden">
                  <Image
                    src={img}
                    alt="Room Image"
                    fill
                    className="object-cover hover:scale-110 transition duration-500"
                  />
                </div>
              ))}
            </div>

            {/* Room Info */}
            <div className="flex flex-col gap-6">

              <h3 className="text-3xl font-semibold">{room.name}</h3>

              <p className="text-zinc-600 dark:text-zinc-300">
                {room.description}
              </p>

              {/* Amenities */}
              <div>
                <h4 className="font-semibold mb-2">Amenities:</h4>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {room.amenities.map((amenity, index) => (
                    <li
                      key={index}
                      className="bg-zinc-200 dark:bg-zinc-800 px-3 py-2 rounded-lg"
                    >
                      ✓ {amenity}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price */}
              <div className="text-2xl font-bold">
                ₱{room.price.toLocaleString()} / night
              </div>

              {/* Availability */}
              <div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    room.available
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {room.available ? "Available" : "Fully Booked"}
                </span>
              </div>

              <button className="mt-4 p-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition">
                Book Now
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* AUTH MODAL */}
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