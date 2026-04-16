"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "../../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const ROOM_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  deluxe: "/che2.jpg",
  family: "/che3.jpg",
  suite: "/che4.jpg",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: "Standard Room",
  deluxe: "Deluxe Room",
  family: "Family Room",
  suite: "Suite Room",
};

const ROOM_TYPE_DESCRIPTIONS: Record<string, string> = {
  standard:
    "A standard room is the hotel's baseline and most economical accommodation, usually around 200 to 400 square feet. It is a practical choice for budget-conscious travelers and includes essential amenities such as a comfortable king, queen, or twin bed.",
  family:
    "A family room is designed as a relaxed shared space for gathering, comfort, and entertainment. It offers a welcoming layout for families or groups who want to stay together comfortably.",
  deluxe:
    "A deluxe room is a premium hotel room category that offers more space, better views, and higher-quality amenities than a standard room. It often includes a king-size bed, a comfortable seating area, and a well-appointed bathroom for enhanced comfort.",
  suite:
    "A suite room is a premium hotel accommodation with more space than a standard room, usually featuring a separate bedroom and living area. It is ideal for longer stays, families, or business travelers seeking extra comfort, luxury, and functionality.",
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
  avg_rating?: number | null;
  rating_count?: number;
  current_bookings?: number;
  max_bookings?: number;
  is_fully_booked?: boolean;
}

async function readApiResponse(res: Response, fallback: string) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    if (contentType.includes("application/json")) {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        return { ok: false, data: parsed, error: parsed.error || parsed.detail || fallback };
      } catch {
        return { ok: false, data: null, error: raw || fallback };
      }
    }

    return {
      ok: false,
      data: null,
      error: raw.includes("<!DOCTYPE")
        ? `${fallback} The server returned an HTML page instead of JSON. Check the Vercel API environment variables and rewrite config.`
        : (raw || fallback),
    };
  }

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      data: null,
      error: "The server returned HTML instead of JSON. Check NEXT_PUBLIC_API_BASE_URL or the /api rewrite on Vercel.",
    };
  }

  try {
    return { ok: true, data: raw ? JSON.parse(raw) : null, error: "" };
  } catch {
    return { ok: false, data: null, error: "The backend returned invalid JSON." };
  }
}

function hasRoomRating(room: Room | null) {
  return !!room && (room.rating_count || 0) > 0 && Number.isFinite(Number(room.avg_rating));
}

function getRoomTypeLabel(roomType: string) {
  return ROOM_TYPE_LABELS[roomType] || roomType;
}

function getRoomDescription(room: Room) {
  const customDescription = room.description?.trim();
  if (customDescription) return customDescription;
  return ROOM_TYPE_DESCRIPTIONS[room.room_type] || "Comfortable accommodation with essential hotel amenities.";
}

function getDisplayRating(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(5, normalized > 5 ? normalized / 2 : normalized));
}

function renderStars(avgRating?: number | null) {
  const fiveStarRating = Math.round(getDisplayRating(avgRating));
  return `${"\u2605".repeat(fiveStarRating)}${"\u2606".repeat(5 - fiveStarRating)}`;
}

export default function RoomDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    const loadRoom = () => {
      setLoading(true);
      setError("");
      fetch(`${API}/hotelroom/rooms/${id}/`, { signal: controller.signal })
        .then(async (res) => {
          const result = await readApiResponse(res, "Room not found.");
          if (!result.ok) throw new Error(result.error);
          return result.data;
        })
        .then((data: Room) => {
          setRoom(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load room details.");
          setLoading(false);
        });
    };

    loadRoom();

    const refreshRoom = () => loadRoom();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshRoom();
      }
    };
    window.addEventListener("room-ratings-updated", refreshRoom);
    window.addEventListener("focus", refreshRoom);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.removeEventListener("room-ratings-updated", refreshRoom);
      window.removeEventListener("focus", refreshRoom);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [id]);

  const handleBookNow = async () => {
    if (!room) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", `/roomdetails/${room.id}`);
      router.push("/");
      return;
    }

    try {
      // Check room availability before proceeding to booking
      const availabilityResponse = await fetch(`${API}/hotelroom/rooms/${room.id}/check-capacity/`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        const currentBookings = availabilityData.current_bookings || 0;
        const maxBookings = availabilityData.max_bookings || room.capacity || 1;
        
        if (currentBookings >= maxBookings) {
          setToast({
            message: "This room is already fully booked. Please choose another room or check back later.",
            type: 'warning'
          });
          setTimeout(() => setToast(null), 5000);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to check room availability:', error);
      // Continue to booking page even if availability check fails
    }

    // Proceed to booking page if room is available
    router.push(`/booking/${room.id}`);
  };

  const normalizedImageUrl = room?.image_url?.trim();
  const imageSrc = normalizedImageUrl || (room ? ROOM_IMAGES[room.room_type] : "") || "/che.jpg";
  const imageGallery = [imageSrc, imageSrc, imageSrc];
  const ratingOutOfFive = hasRoomRating(room) ? getDisplayRating(room?.avg_rating) : 0;
  const currentBookings = room?.current_bookings || 0;
  const maxBookings = room?.max_bookings || room?.capacity || 1;
  const isFullyBooked = !!room && ((room.is_fully_booked || false) || currentBookings >= maxBookings);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
      <SiteHeader />

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

      <div className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          {loading && <p className="py-20 text-center text-[#71867e]">Loading room details...</p>}
          {!loading && error && <p className="py-20 text-center text-red-500">{error}</p>}

          {room && (
            <>
              <div className="mb-12 grid gap-8 md:grid-cols-[1.3fr_1fr]">
                <div className="relative h-[420px] overflow-hidden">
                  <img src={imageSrc} alt={room.name} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-6 top-6 bg-[#1c352c] px-3 py-1 text-xs font-semibold tracking-wide text-white">
                    {getRoomTypeLabel(room.room_type)}
                  </div>
                  <div className="absolute bottom-6 left-6 bg-[rgba(19,34,34,0.82)] px-4 py-3 text-[#fff8ed]">
                    <p className="text-xs tracking-[0.35em]">ROOM {room.room_number}</p>
                    <p className="mt-1 text-2xl font-light tracking-[0.15em]">{room.name}</p>
                  </div>
                </div>

                <div className="border border-[#d4d7c7] bg-white p-8 shadow-sm">
                  <p className="mb-2 text-xs uppercase tracking-[0.35em] text-[#71867e]">Room Details</p>
                  <h1 className="mb-3 text-3xl font-thin tracking-[0.18em]">{room.name}</h1>
                  <p className="mb-6 text-sm leading-7 text-[#4a6358]">{getRoomDescription(room)}</p>

                  <div className="mb-6 grid grid-cols-2 gap-4 border-y border-[#d4d7c7] py-5 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#71867e]">Price</p>
                      <p className="mt-1 text-xl font-light">PHP {Number(room.price_per_night).toLocaleString()}/night</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#71867e]">Capacity</p>
                      <p className="mt-1 text-xl font-light">{room.capacity} guest{room.capacity > 1 ? "s" : ""}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#71867e]">Floor</p>
                      <p className="mt-1 text-xl font-light">{room.floor}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#71867e]">Status</p>
                      <p className="mt-1 text-xl font-light">
                        {room.status === "maintenance" ? "Maintenance" : isFullyBooked ? "Fully Booked" : "Available"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-sm border border-[#d4d7c7] bg-[#faf9f6] px-4 py-4">
                    <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#71867e]">
                      <span>Booking Capacity</span>
                      <span>{currentBookings}/{maxBookings} booked</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${isFullyBooked ? "bg-red-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(100, (currentBookings / maxBookings) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-[#4a6358]">
                      {isFullyBooked
                        ? "This room has reached its booking limit right now."
                        : "This room stays visible and can still accept bookings until the booking limit is reached."}
                    </p>
                  </div>

                  <div className="mb-6 rounded-sm border border-[rgba(196,138,58,0.28)] bg-[rgba(255,248,237,0.7)] px-4 py-4">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#8e6d2e]">Guest Rating</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg tracking-[0.18em]" style={{ color: "#c48a3a" }}>
                        {hasRoomRating(room) ? renderStars(room.avg_rating) : "\u2606\u2606\u2606\u2606\u2606"}
                      </p>
                      <p className="text-sm font-medium text-[#1c352c]">
                        {hasRoomRating(room) ? `${ratingOutOfFive.toFixed(1)}/5` : "New"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#4a6358]">
                      {hasRoomRating(room) ? `${ratingOutOfFive.toFixed(1)}/5 stars` : "No rating yet"}
                      {room.rating_count ? ` (${room.rating_count} review${room.rating_count > 1 ? "s" : ""})` : ""}
                    </p>
                  </div>

                  <button
                    onClick={handleBookNow}
                    className="w-full border border-[#1c352c] bg-[#1c352c] px-6 py-4 text-sm tracking-[0.3em] text-white transition hover:bg-[#0e2419]"
                  >
                    BOOK THIS ROOM
                  </button>
                </div>
              </div>

              <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {imageGallery.map((img, index) => (
                  <div key={`${img}-${index}`} className="relative h-52 overflow-hidden border border-[#d4d7c7]">
                    <img
                      src={img}
                      alt={`${room.name} preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
                <div className="border border-[#d4d7c7] bg-white p-8 shadow-sm">
                  <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#71867e]">About This Room</p>
                  <p className="text-sm leading-8 text-[#4a6358]">{getRoomDescription(room)}</p>
                </div>

                <div className="border border-[#d4d7c7] bg-white p-8 shadow-sm">
                  <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#71867e]">Amenities</p>
                  <div className="flex flex-wrap gap-3">
                    {(room.amenities || []).map((amenity, index) => (
                      <span
                        key={`${amenity}-${index}`}
                        className="rounded-full bg-[#d4d7c7] px-4 py-2 text-xs tracking-wide text-[#1c352c]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
