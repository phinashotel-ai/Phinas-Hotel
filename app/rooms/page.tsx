"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  family: "Family Room",
  deluxe: "Deluxe Room",
  suite: "Suite Room",
};

const ROOM_TYPE_DESCRIPTIONS: Record<string, string> = {
  standard:
    "A standard room is the hotel's most economical accommodation, usually around 200 to 400 square feet. It is ideal for budget-conscious travelers and includes essential amenities such as a comfortable king, queen, or twin bed.",
  family:
    "A family room is designed for relaxation, gathering, and entertainment. It offers a more spacious shared setup that works well for families or groups who want to stay together comfortably.",
  deluxe:
    "A deluxe room is a premium hotel room category with more space, better views, and higher-quality amenities than a standard room. It often includes a king-size bed, a seating area, and an upgraded bathroom for enhanced comfort.",
  suite:
    "A suite room is a premium accommodation with more space than a standard room, usually featuring a separate bedroom and living area. It is ideal for longer stays, families, or business travelers who want added comfort and functionality.",
};

function getRoomTypeLabel(roomType: string) {
  return ROOM_TYPE_LABELS[roomType] || roomType;
}

function getRoomDescription(room: Room) {
  const customDescription = room.description?.trim();
  if (customDescription) return customDescription;
  return ROOM_TYPE_DESCRIPTIONS[room.room_type] || "Comfortable accommodation with essential hotel amenities.";
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
  has_active_bookings?: boolean;
  current_bookings?: number;
  max_bookings?: number;
  is_fully_booked?: boolean;
  is_available?: boolean;
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const panelStyle = {
    backgroundColor: "rgba(250, 249, 246, 0.68)",
    backdropFilter: "blur(10px)",
  };

  const fetchRooms = async (type: string) => {
    setLoading(true);
    const query = type ? `&type=${type}` : "";
    
    try {
      const response = await fetch(`${API}/hotelroom/rooms/?${query.replace(/^&/, "")}`);
      const roomsData = await response.json();
      
      // Don't check availability here - rooms should always be visible
      // Availability will be checked only when user tries to book with specific dates
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setLoading(false);
    } catch {
      setError("Failed to load rooms.");
      setLoading(false);
    }
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
    // Always allow viewing room details
    // Availability check will happen in the booking page with specific dates
    router.push(`/roomdetails/${roomId}`);
  };

  const filters = [
    { label: "All",         value: "" },
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

      <SiteHeader activeHref="/rooms" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 max-w-md">
          <div className={`px-6 py-4 rounded-lg shadow-lg border-l-4 ${
            toast.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
            'bg-green-50 border-green-500 text-green-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {toast.type === 'warning' ? '⚠️ Room Not Available' : 
                   toast.type === 'error' ? '❌ Error' : '✅ Success'}
                </p>
                <p className="text-sm mt-1">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

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
            const currentBookings = room.current_bookings || 0;
            const maxBookings = 1; // Each room can only have 1 booking at a time
            const isOccupied = room.status === 'occupied' || room.has_active_bookings || currentBookings >= maxBookings;
            const isAvailable = room.status === 'available' && !isOccupied;

            return (
              <div key={room.id} className={`flex flex-col h-full overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-[rgba(212,215,199,0.7)] ${!isAvailable ? 'opacity-75' : ''}`} style={panelStyle}>

                {/* Main image */}
                <div className="relative h-52 overflow-hidden flex-shrink-0">
                  <img src={img} alt={room.name} className="absolute inset-0 h-full w-full object-cover transition-all duration-500" />
                  <div className="absolute top-3 right-3 px-3 py-1 text-xs tracking-widest font-semibold" style={{ backgroundColor: "#132222", color: "#fff8ed" }}>
                    ₱{Number(room.price_per_night).toLocaleString()}/night
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold tracking-wide capitalize bg-[#1c352c] text-white">
                    {getRoomTypeLabel(room.room_type)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-light tracking-widest uppercase">{room.name}</h2>
                    <span className="text-xs text-[#71867e]">Room {room.room_number}</span>
                  </div>
                  <p className="text-xs text-[#71867e] mb-3">{getRoomTypeLabel(room.room_type)} · Floor {room.floor} · Up to {room.capacity} guests</p>
                  
                  {/* Description with fixed height */}
                  <div className="mb-3 h-20 overflow-hidden">
                    <p className="text-sm leading-6 text-[#4a6358]">{getRoomDescription(room)}</p>
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 text-xs text-[#71867e]">
                      <span>{isAvailable ? 'Available' : 'Occupied'}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isFullyBooked ? "bg-red-500" : availableSpots <= 2 ? "bg-orange-500" : "bg-green-500"
                        }`}
                        style={{ width: isAvailable ? "0%" : "100%" }}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-base tracking-[0.15em]" style={{ color: "#c48a3a" }}>{hasRoomRating(room) ? renderStars(getDisplayRating(room.avg_rating)) : "☆☆☆☆☆"}</p>
                    <p className="text-xs text-[#4a6358]">
                      {hasRoomRating(room) ? `${getDisplayRating(room.avg_rating).toFixed(1)}/5` : "No rating yet"}
                      {room.rating_count ? ` (${room.rating_count} review${room.rating_count > 1 ? "s" : ""})` : ""}
                    </p>
                  </div>
                  {/* Amenities with fixed height */}
                  <div className="flex flex-wrap gap-2 mb-4 h-8 overflow-hidden">
                    {(room.amenities || []).slice(0, 3).map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 tracking-wide" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{f}</span>
                    ))}
                  </div>
                  
                  {/* Button pushed to bottom */}
                  <div className="mt-auto">
                    <button
                      onClick={() => handleViewDetails(room.id)}
                      disabled={!isAvailable}
                      className={`w-full text-center py-2 text-xs tracking-[0.3em] border transition ${
                        !isAvailable ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-400' : ''
                      }`}
                      style={isAvailable ? { borderColor: "#1c352c", color: "#1c352c", backgroundColor: "transparent" } : {}}
                      onMouseEnter={e => { 
                        if (isAvailable) {
                          e.currentTarget.style.backgroundColor = "#1c352c"; 
                          e.currentTarget.style.color = "#fff"; 
                        }
                      }}
                      onMouseLeave={e => { 
                        if (isAvailable) {
                          e.currentTarget.style.backgroundColor = "transparent"; 
                          e.currentTarget.style.color = "#1c352c"; 
                        }
                      }}
                    >
                      {isAvailable ? 'VIEW DETAILS' : 'NOT AVAILABLE'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
