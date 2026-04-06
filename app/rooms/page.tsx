"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const TYPE_IMAGES: Record<string, string> = {
  standard: "/c1.jpg",
  regular:  "/che1.jpg",
  deluxe:   "/che2.jpg",
  family:   "/che3.jpg",
  suite:    "/che4.jpg",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  regular: "Regular Room",
  standard: "Standard Room",
  family: "Family Room",
  deluxe: "Deluxe Room",
  suite: "Suite Room",
};

function getRoomTypeLabel(roomType: string) {
  return ROOM_TYPE_LABELS[roomType] || roomType;
}

function renderStars(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return "\u2606\u2606\u2606\u2606\u2606";
  const fiveStarValue = Math.max(0, Math.min(5, Math.round(normalized)));
  return `${"\u2605".repeat(fiveStarValue)}${"\u2606".repeat(5 - fiveStarValue)}`;
}

function getDisplayRating(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(5, normalized > 5 ? normalized / 2 : normalized));
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

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const panelStyle = {
    backgroundColor: "rgba(250, 249, 246, 0.68)",
    backdropFilter: "blur(10px)",
  };

  const fetchRooms = (type: string) => {
    setLoading(true);
    const query = type ? `&type=${type}` : "";
    fetch(`${API}/hotelroom/rooms/?status=available${query}`)
      .then(res => res.json())
      .then(data => { setRooms(data); setLoading(false); })
      .catch(() => { setError("Failed to load rooms."); setLoading(false); });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchRooms(""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshRooms = () => fetchRooms(activeFilter);
    window.addEventListener("room-ratings-updated", refreshRooms);
    window.addEventListener("focus", refreshRooms);
    document.addEventListener("visibilitychange", refreshRooms);
    return () => {
      window.removeEventListener("room-ratings-updated", refreshRooms);
      window.removeEventListener("focus", refreshRooms);
      document.removeEventListener("visibilitychange", refreshRooms);
    };
  }, [activeFilter]);

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    fetchRooms(value);
  };

  const handleViewDetails = (roomId: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", `/booking/${roomId}`);
      router.push("/");
    } else {
      router.push(`/booking/${roomId}`);
    }
  };

  const filters = [
    { label: "All",         value: "" },
    { label: "Regular",     value: "regular" },
    { label: "Standard",    value: "standard" },
    { label: "Family Room", value: "family" },
    { label: "Deluxe",      value: "deluxe" },
    { label: "Suite",       value: "suite" },
  ];

  return (
    <div
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "linear-gradient(rgba(250, 249, 246, 0.86), rgba(250, 249, 246, 0.86)), url('/che.jpg')",
        backgroundColor: "#faf9f6",
        color: "#1c352c",
      }}
    >

      <SiteHeader />

      {/* Header */}
      <div className="pt-28 pb-8 text-center px-4">
        <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-2">Our Accommodations</p>
        <h1 className="text-4xl md:text-5xl font-thin tracking-[0.2em]">ROOMS & SUITES</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center gap-3 flex-wrap px-6 pb-10">
        {filters.map((f, i) => {
          const isActive = f.label === "All" ? activeFilter === "" : activeFilter === f.value;
          return (
            <button
              key={i}
              onClick={() => handleFilter(f.value)}
              className="px-6 py-2 text-xs tracking-[0.3em] border transition"
              style={{
                borderColor: "#1c352c",
                backgroundColor: isActive ? "#1c352c" : "transparent",
                color: isActive ? "#fff" : "#1c352c",
              }}
            >
              {f.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Room Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {loading && <p className="text-center text-[#71867e] py-20">Loading rooms...</p>}
        {error && <p className="text-center text-red-500 py-20">{error}</p>}
        {!loading && !error && rooms.length === 0 && (
          <p className="text-center text-[#71867e] py-20">No rooms found for this category.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map(room => {
            const img = room.image_url || TYPE_IMAGES[room.room_type] || "/che.jpg";
            return (
              <div key={room.id} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-[rgba(212,215,199,0.7)]" style={panelStyle}>

                {/* Main image */}
                <div className="relative h-52 overflow-hidden">
                  <img src={img} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500" />
                  <div className="absolute top-3 right-3 px-3 py-1 text-xs tracking-widest font-semibold" style={{ backgroundColor: "#132222", color: "#fff8ed" }}>
                    ₱{Number(room.price_per_night).toLocaleString()}/night
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold tracking-wide capitalize bg-[#1c352c] text-white">
                    {getRoomTypeLabel(room.room_type)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-light tracking-widest uppercase">{room.name}</h2>
                    <span className="text-xs text-[#71867e]">Room {room.room_number}</span>
                  </div>
                  <p className="text-xs text-[#71867e] mb-3">{getRoomTypeLabel(room.room_type)} · Floor {room.floor} · Up to {room.capacity} guests</p>
                  <div className="mb-3">
                    <p className="text-base tracking-[0.15em]" style={{ color: "#c48a3a" }}>{hasRoomRating(room) ? renderStars(getDisplayRating(room.avg_rating)) : "☆☆☆☆☆"}</p>
                    <p className="text-xs text-[#4a6358]">
                      {hasRoomRating(room) ? `${getDisplayRating(room.avg_rating).toFixed(1)}/5` : "No rating yet"}
                      {room.rating_count ? ` (${room.rating_count} review${room.rating_count > 1 ? "s" : ""})` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(room.amenities || []).slice(0, 3).map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 tracking-wide" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{f}</span>
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
