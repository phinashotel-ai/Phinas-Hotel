"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const TYPE_IMAGES: Record<string, string> = {
  standard: "/c1.jpg",
  deluxe:   "/che2.jpg",
  family:   "/che3.jpg",
  suite:    "/che4.jpg",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: "Standard Room",
  deluxe: "Deluxe Room",
  family: "Family Room",
  suite: "Suite Room",
};

function getRoomTypeLabel(roomType: string) {
  return ROOM_TYPE_LABELS[roomType] || roomType;
}

function renderStars(avgRating?: number | null) {
  if (!avgRating) return "☆☆☆☆☆";
  const normalized = Number(avgRating);
  const fiveStarValue = Number.isFinite(normalized)
    ? Math.max(0, Math.min(5, Math.round(normalized)))
    : 0;
  return `${"★".repeat(fiveStarValue)}${"☆".repeat(5 - fiveStarValue)}`;
}

interface Room {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: number;
  description: string;
  amenities: string[];
  image_url: string;
  status: string;
  floor: number;
  avg_rating?: number | null;
  rating_count?: number;
}

function hasRoomRating(room: Room) {
  return (room.rating_count || 0) > 0 && Number.isFinite(Number(room.avg_rating));
}

function getDisplayRating(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(5, normalized > 5 ? normalized / 2 : normalized));
}

const today = new Date().toISOString().split("T")[0];

export default function RoomSearchPage() {
  const router = useRouter();
  const [checkIn, setCheckIn]     = useState("");
  const [checkOut, setCheckOut]   = useState("");
  const [roomType, setRoomType]   = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [guests, setGuests]       = useState(1);
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [searched, setSearched]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const panelStyle = {
    backgroundColor: "rgba(250, 249, 246, 0.72)",
    backdropFilter: "blur(12px)",
  };

  const loadRooms = useCallback(() => {
    const params = new URLSearchParams({ status: "available" });
    if (roomType)   params.append("type", roomType);
    if (guests > 1) params.append("capacity", String(guests));
    if (checkIn)    params.append("check_in", checkIn);
    if (checkOut)   params.append("check_out", checkOut);

    const url = searched
      ? `${API}/hotelroom/rooms/?${params}`
      : `${API}/hotelroom/rooms/?status=available`;

    fetch(url)
      .then(r => r.json())
      .then((data: Room[]) => {
        let filtered = Array.isArray(data) ? data : [];
        if (priceRange) {
          const [min, max] = priceRange.split("-").map(Number);
          filtered = filtered.filter(r => {
            const p = Number(r.price_per_night);
            return max ? p >= min && p <= max : p >= min;
          });
        }
        setRooms(filtered);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load rooms."); setLoading(false); });
  }, [roomType, guests, checkIn, checkOut, searched, priceRange]);

  // Load all available rooms on mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const refreshRooms = () => {
      setLoading(true);
      loadRooms();
    };
    window.addEventListener("room-ratings-updated", refreshRooms);
    window.addEventListener("focus", refreshRooms);
    document.addEventListener("visibilitychange", refreshRooms);
    return () => {
      window.removeEventListener("room-ratings-updated", refreshRooms);
      window.removeEventListener("focus", refreshRooms);
      document.removeEventListener("visibilitychange", refreshRooms);
    };
  }, [loadRooms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status: "available" });
    if (roomType)   params.append("type", roomType);
    if (guests > 1) params.append("capacity", String(guests));
    if (checkIn)    params.append("check_in", checkIn);
    if (checkOut)   params.append("check_out", checkOut);

    fetch(`${API}/hotelroom/rooms/?${params}`)
      .then(r => r.json())
      .then((data: Room[]) => {
        let filtered = Array.isArray(data) ? data : [];

        if (priceRange) {
          const [min, max] = priceRange.split("-").map(Number);
          filtered = filtered.filter(r => {
            const p = Number(r.price_per_night);
            return max ? p >= min && p <= max : p >= min;
          });
        }

        setRooms(filtered);
        setSearched(true);
        setLoading(false);
      })
      .catch(() => { setError("Search failed. Please try again."); setLoading(false); });
  };

  const handleViewDetails = (id: number) => {
    router.push(`/roomdetails/${id}`);
  };

  return (
    <div
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "linear-gradient(rgba(250, 249, 246, 0.84), rgba(250, 249, 246, 0.84)), url('/che.jpg')",
        backgroundColor: "#faf9f6",
        color: "#1c352c",
      }}
    >

      <SiteHeader  />

      {/* Hero Search */}
      <div className="relative pt-20">
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src="/che.jpg" alt="Search Rooms" className="absolute inset-0 h-full w-full object-cover brightness-40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[#d4d7c7] tracking-[0.4em] text-xs uppercase mb-2">Find Your Stay</p>
            <h1 className="text-3xl md:text-5xl font-thin tracking-[0.2em] text-white">SEARCH ROOMS</h1>
          </div>
        </div>

        {/* Search Form Card */}
        <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-10">
          <form
            onSubmit={handleSearch}
            className="shadow-xl border border-[rgba(212,215,199,0.8)] p-6 md:p-8"
            style={panelStyle}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

              {/* Check-in */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Check-in</label>
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  className="border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] outline-none focus:border-[#1c352c] transition bg-[#faf9f6]"
                />
              </div>

              {/* Check-out */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Check-out</label>
                <input
                  type="date"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] outline-none focus:border-[#1c352c] transition bg-[#faf9f6]"
                />
              </div>

              {/* Room Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Room Type</label>
                <select
                  value={roomType}
                  onChange={e => setRoomType(e.target.value)}
                  className="border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] outline-none focus:border-[#1c352c] transition bg-[#faf9f6]"
                >
                  <option value="">All Types</option>
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                  <option value="family">Family</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Price Range</label>
                <select
                  value={priceRange}
                  onChange={e => setPriceRange(e.target.value)}
                  className="border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] outline-none focus:border-[#1c352c] transition bg-[#faf9f6]"
                >
                  <option value="">Any Price</option>
                  <option value="0-2000">₱0 – ₱2,000</option>
                  <option value="2000-5000">₱2,000 – ₱5,000</option>
                  <option value="5000-10000">₱5,000 – ₱10,000</option>
                  <option value="10000-999999">₱10,000+</option>
                </select>
              </div>

              {/* Guests */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Guests</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={guests}
                  onChange={e => setGuests(Number(e.target.value))}
                  className="border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] outline-none focus:border-[#1c352c] transition bg-[#faf9f6]"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="px-10 py-3 text-xs tracking-[0.3em] uppercase transition"
                style={{ backgroundColor: "#1c352c", color: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
              >
                Search Rooms
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-20">

        {/* Result header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[#71867e] tracking-[0.3em] text-xs uppercase">
              {searched ? `${rooms.length} room${rooms.length !== 1 ? "s" : ""} found` : "Available Rooms"}
            </p>
          </div>
          {searched && (
            <button
              onClick={() => {
                setRoomType(""); setPriceRange(""); setGuests(1);
                setCheckIn(""); setCheckOut(""); setSearched(false);
                setLoading(true);
                fetch(`${API}/hotelroom/rooms/?status=available`)
                  .then(r => r.json())
                  .then(d => { setRooms(Array.isArray(d) ? d : []); setLoading(false); })
                  .catch(() => setLoading(false));
              }}
              className="text-[10px] tracking-widest text-[#71867e] hover:text-[#1c352c] underline transition"
            >
              CLEAR FILTERS
            </button>
          )}
        </div>

        {loading && (
          <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading rooms...</p>
        )}
        {error && (
          <p className="text-center text-red-500 py-20 text-sm">{error}</p>
        )}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[#d4d7c7]" style={panelStyle}>
            <p className="text-[#71867e] tracking-widest text-sm mb-2">No rooms match your search.</p>
            <p className="text-xs text-[#71867e]">Try adjusting your filters.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {!loading && rooms.map(room => {
            const img = room.image_url || TYPE_IMAGES[room.room_type] || "/che.jpg";
            return (
              <div
                key={room.id}
                className="overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-[rgba(212,215,199,0.8)]"
                style={panelStyle}
              >
                <div className="relative h-52 overflow-hidden">
                  <img src={img} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500" />
                  <div className="absolute top-3 right-3 px-3 py-1 text-xs tracking-widest font-semibold" style={{ backgroundColor: "#132222", color: "#fff8ed" }}>
                    ₱{Number(room.price_per_night).toLocaleString()}/night
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold tracking-wide capitalize bg-[#1c352c] text-white">
                    {getRoomTypeLabel(room.room_type)}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-light tracking-widest uppercase">{room.name}</h2>
                    <span className="text-xs text-[#71867e]">Room {room.room_number}</span>
                  </div>
                  <p className="text-xs text-[#71867e] mb-3">
                    {getRoomTypeLabel(room.room_type)} · Floor {room.floor} · Up to {room.capacity} guests
                  </p>
                  <div className="mb-4 rounded-sm border border-[rgba(196,138,58,0.28)] bg-[rgba(255,248,237,0.7)] px-3 py-3">
                    <p className="text-[10px] tracking-[0.35em] uppercase text-[#8e6d2e] mb-1">Guest Rating</p>
                    <div className="flex items-center justify-between gap-3">
                    <p className="text-lg tracking-[0.18em]" style={{ color: "#c48a3a" }}>{hasRoomRating(room) ? renderStars(getDisplayRating(room.avg_rating)) : "☆☆☆☆☆"}</p>
                    <p className="text-sm font-medium text-[#1c352c]">
                        {hasRoomRating(room) ? `${getDisplayRating(room.avg_rating).toFixed(1)}/5` : "New"}
                      </p>
                    </div>
                    <p className="text-xs text-[#4a6358] mt-1">
                      {hasRoomRating(room) ? `${getDisplayRating(room.avg_rating).toFixed(1)}/5 stars` : "No rating yet"}
                      {room.rating_count ? ` (${room.rating_count} review${room.rating_count > 1 ? "s" : ""})` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(room.amenities || []).slice(0, 3).map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 tracking-wide" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{a}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleViewDetails(room.id)}
                    className="w-full text-center py-2 text-xs tracking-[0.3em] border transition"
                    style={{ borderColor: "#1c352c", color: "#1c352c", backgroundColor: "transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1c352c"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1c352c"; }}
                  >
                    VIEW DETAILS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

