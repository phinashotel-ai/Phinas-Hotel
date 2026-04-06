"use client";

import Image from "next/image";
import { useState } from "react";

export default function RoomSearchPage() {
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [roomType, setRoomType] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");
  const [guests, setGuests] = useState<number>(1);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const searchData = {
      checkIn,
      checkOut,
      roomType,
      priceRange,
      guests,
    };

    console.log("Search Data:", searchData);
    alert("Searching rooms...");

    // 👉 Connect to your backend API here
  };

  return (
    <div className="h-screen w-screen relative bg-slate-100 dark:bg-black flex items-center justify-center overflow-hidden">
      
      {/* Background Image */}
      <Image
        src="/che.jpg"
        alt="PHINAS HOTEL"
        fill
        priority
        className="object-cover brightness-50"
      />

      {/* Search Form */}
      <div className="relative z-10 w-full max-w-lg p-10 bg-white/20 dark:bg-black/30 backdrop-blur-2xl border border-white/30 rounded-3xl text-white shadow-2xl">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Room Search & Filter
        </h1>

        <form className="flex flex-col gap-4" onSubmit={handleSearch}>
          
          {/* Check-in */}
          <div>
            <label className="text-sm">Check-in Date</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/80 dark:bg-black/50 text-black dark:text-white outline-none"
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
              className="w-full p-3 rounded-xl bg-white/80 dark:bg-black/50 text-black dark:text-white outline-none"
              required
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="text-sm">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/80 dark:bg-black/50 text-black dark:text-white outline-none"
              required
            >
              <option value="">Select Room Type</option>
              <option value="standard">Standard Room</option>
              <option value="deluxe">Deluxe Room</option>
              <option value="suite">Suite</option>
              <option value="family">Family Room</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-sm">Price Range</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/80 dark:bg-black/50 text-black dark:text-white outline-none"
            >
              <option value="">Select Price Range</option>
              <option value="0-2000">₱0 - ₱2,000</option>
              <option value="2000-5000">₱2,000 - ₱5,000</option>
              <option value="5000-10000">₱5,000 - ₱10,000</option>
              <option value="10000+">₱10,000+</option>
            </select>
          </div>

          {/* Guests */}
          <div>
            <label className="text-sm">Number of Guests</label>
            <input
              type="number"
              min="1"
              max="10"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full p-3 rounded-xl bg-white/80 dark:bg-black/50 text-black dark:text-white outline-none"
              required
            />
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="mt-4 p-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
          >
            Search Rooms
          </button>
        </form>
      </div>
    </div>
  );
}