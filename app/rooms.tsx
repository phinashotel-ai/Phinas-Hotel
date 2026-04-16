"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const TYPE_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  deluxe:   "/che2.jpg",
  family:   "/che3.jpg",
  suite:    "/che4.jpg",
};

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
  current_bookings?: number;
  max_bookings?: number;
  is_fully_booked?: boolean;
}

export default function RoomsComponent() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const fetchRooms = (type: string) => {
    setLoading(true);
    const query = type ? `&type=${type}` : "";
    // Fetch all rooms including fully booked ones
    fetch(`${API}/hotelroom/rooms/?${query.replace('&', '')}`)
      .then(res => res.json())
      .then(data => { setRooms(data); setLoading(false); })
      .catch(() => { setError("Failed to load rooms."); setLoading(false); });
  };

  useEffect(() => {
    // Fetch all rooms including fully booked ones
    fetch(`${API}/hotelroom/rooms/`)
      .then(res => res.json())
      .then(data => { setRooms(data); setLoading(false); })
      .catch(() => { setError("Failed to load rooms."); setLoading(false); });
  }, []);

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    fetchRooms(value);
  };

  const handleViewDetails = async (roomId: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/");
      return;
    }
    
    const room = rooms.find(r => r.id === roomId);
    
    // Check if room is fully booked
    if (room && (room.is_fully_booked || room.status === 'fully_booked' || room.status === 'occupied')) {
      setToast({
        message: `${room.name} is already fully booked. Please choose another room or check back later.`,
        type: 'error'
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    
    // Check if user has any recent booking attempts for this room type
    const recentBookingRoomId = sessionStorage.getItem("recent_booking_room_id");
    const recentBookingId = sessionStorage.getItem("recent_booking_id");
    const isExtension = sessionStorage.getItem("is_extension") === "true";
    
    if (recentBookingRoomId && recentBookingId && !isExtension) {
      const recentRoom = rooms.find(r => r.id === Number(recentBookingRoomId));
      
      // Allow extension for same room or same room type
      if (room && recentRoom && room.room_type === recentRoom.room_type) {
        if (roomId === Number(recentBookingRoomId)) {
          // Same room - allow automatic extension
          sessionStorage.setItem("is_extension", "true");
          sessionStorage.setItem("extend_booking_id", recentBookingId);
          setToast({
            message: `Extending your existing booking for ${room.name} (Booking #${recentBookingId}). You can add more days to your stay.`,
            type: 'success'
          });
          setTimeout(() => setToast(null), 4000);
          router.push(`/roomdetails/${roomId}`);
          return;
        } else {
          // Different room but same type - offer extension option
          const confirmExtension = confirm(
            `You have an existing booking for a ${room.room_type} room (Booking #${recentBookingId}). \n\nWould you like to extend that booking instead of creating a new one?`
          );
          
          if (confirmExtension) {
            sessionStorage.setItem("is_extension", "true");
            sessionStorage.setItem("extend_booking_id", recentBookingId);
            sessionStorage.setItem("recent_booking_room_id", recentBookingRoomId);
            setToast({
              message: `Extending your existing ${room.room_type} room booking (Booking #${recentBookingId}).`,
              type: 'success'
            });
            setTimeout(() => setToast(null), 4000);
            router.push(`/roomdetails/${recentBookingRoomId}`);
            return;
          }
        }
      }
      
      // Different room type - show warning
      if (room && recentRoom && room.room_type !== recentRoom.room_type) {
        setToast({
          message: `You already have a pending booking for a ${recentRoom.room_type} room (Booking #${recentBookingId}). Please wait for admin confirmation before booking a different room type.`,
          type: 'warning'
        });
        setTimeout(() => setToast(null), 6000);
        return;
      }
    }
    
    router.push(`/roomdetails/${roomId}`);
  };

  const filters = [
    { label: "All",         value: "" },
    { label: "Regular",     value: "standard" },
    { label: "Standard",    value: "standard" },
    { label: "Family Room", value: "family" },
    { label: "Deluxe",      value: "deluxe" },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 py-5" style={{ backgroundColor: "#132222" }}>
        <Link href="/" className="text-white tracking-[0.3em] text-lg font-light">PHINAS HOTEL</Link>
        <Link href="/roomsearch" className="text-[#d4d7c7] text-sm tracking-widest hover:text-white transition">BOOK A ROOM</Link>
      </nav>

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
                  {toast.type === 'warning' ? '⚠️ Booking Conflict' : 
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
            const isFullyBooked = room.is_fully_booked || room.status === 'fully_booked' || room.status === 'occupied';
            
            return (
              <div key={room.id} className={`overflow-hidden shadow-md hover:shadow-xl transition-shadow ${isFullyBooked ? 'opacity-75' : ''}`} style={{ backgroundColor: "#fff" }}>

                {/* Main image */}
                <div className="relative h-52 overflow-hidden">
                  <Image src={img} alt={room.name} fill className="object-cover transition-all duration-500" />
                  <div className="absolute top-3 right-3 px-3 py-1 text-xs tracking-widest font-semibold" style={{ backgroundColor: "#132222", color: "#fff8ed" }}>
                    ₱{Number(room.price_per_night).toLocaleString()}/night
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold tracking-wide capitalize bg-[#1c352c] text-white">
                    {room.room_type}
                  </div>
                  {isFullyBooked && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold tracking-wide">
                        FULLY BOOKED
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-light tracking-widest uppercase">{room.name}</h2>
                    <span className="text-xs text-[#71867e]">Room {room.room_number}</span>
                  </div>
                  <p className="text-xs text-[#71867e] mb-3 capitalize">{room.room_type} · Floor {room.floor} · Up to {room.capacity} guests</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(room.amenities || []).slice(0, 3).map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 tracking-wide" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{a}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleViewDetails(room.id)}
                    disabled={isFullyBooked}
                    className={`w-full text-center py-2 text-xs tracking-[0.3em] border transition ${
                      isFullyBooked 
                        ? 'cursor-not-allowed opacity-50 bg-gray-200 text-gray-500 border-gray-300'
                        : ''
                    }`}
                    style={!isFullyBooked ? { borderColor: "#1c352c", color: "#1c352c", backgroundColor: "transparent" } : {}}
                    onMouseEnter={e => { 
                      if (!isFullyBooked) {
                        e.currentTarget.style.backgroundColor = "#1c352c"; 
                        e.currentTarget.style.color = "#fff"; 
                      }
                    }}
                    onMouseLeave={e => { 
                      if (!isFullyBooked) {
                        e.currentTarget.style.backgroundColor = "transparent"; 
                        e.currentTarget.style.color = "#1c352c"; 
                      }
                    }}
                  >
                    {isFullyBooked ? 'FULLY BOOKED' : 'VIEW DETAILS'}
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
