"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "../../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const ROOM_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  regular: "/che1.jpg",
  deluxe: "/che2.jpg",
  family: "/che3.jpg",
  suite: "/che4.jpg",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  regular: "Regular Room",
  standard: "Standard Room",
  deluxe: "Deluxe Room",
  family: "Family Room",
  suite: "Suite Room",
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
}

function hasRoomRating(room: Room | null) {
  return !!room && (room.rating_count || 0) > 0 && Number.isFinite(Number(room.avg_rating));
}

function getRoomTypeLabel(roomType: string) {
  return ROOM_TYPE_LABELS[roomType] || roomType;
}

function getFiveStarRating(avgRating?: number | null) {
  const normalized = Number(avgRating);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.max(0, Math.min(5, normalized));
}

function renderStars(avgRating?: number | null) {
  const fiveStarRating = Math.round(getFiveStarRating(avgRating));
  return `${"★".repeat(fiveStarRating)}${"☆".repeat(5 - fiveStarRating)}`;
}

export default function RoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadRoom = () => {
      fetch(`${API}/hotelroom/rooms/${id}/`)
        .then((res) => {
          if (!res.ok) throw new Error("Room not found.");
          return res.json();
        })
        .then((data: Room) => {
          setRoom(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load room details.");
          setLoading(false);
        });
    };

    loadRoom();

    const refreshRoom = () => loadRoom();
    window.addEventListener("room-ratings-updated", refreshRoom);
    window.addEventListener("focus", refreshRoom);
    document.addEventListener("visibilitychange", refreshRoom);
    return () => {
      window.removeEventListener("room-ratings-updated", refreshRoom);
      window.removeEventListener("focus", refreshRoom);
      document.removeEventListener("visibilitychange", refreshRoom);
    };
  }, [id]);

  const handleBookNow = () => {
    if (!room) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", `/roomdetails/${room.id}`);
      router.push("/");
      return;
    }

    router.push(`/booking/${room.id}`);
  };

  const imageSrc = room ? room.image_url || ROOM_IMAGES[room.room_type] || "/che.jpg" : "/che.jpg";
  const imageGallery = [imageSrc, imageSrc, imageSrc];
  const ratingOutOfFive = hasRoomRating(room) ? getFiveStarRating(room?.avg_rating) : 0;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
      <SiteHeader
        rightLinks={[
          { label: "ALL ROOMS", href: "/rooms" },
          ...(room ? [{ label: "BOOK NOW", href: `/booking/${room.id}` }] : []),
        ]}
      />

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
                  <p className="mb-6 text-sm leading-7 text-[#4a6358]">{room.description}</p>

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
                        {room.status === "available" ? "Available" : "Unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-sm border border-[rgba(196,138,58,0.28)] bg-[rgba(255,248,237,0.7)] px-4 py-4">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#8e6d2e]">Guest Rating</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg tracking-[0.18em]" style={{ color: "#c48a3a" }}>
                        {hasRoomRating(room) ? renderStars(getFiveStarRating(room.avg_rating)) : "☆☆☆☆☆"}
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
                    className="w-full border px-6 py-4 text-sm tracking-[0.3em] transition"
                    style={{ borderColor: "#1c352c", backgroundColor: "#1c352c", color: "#fff" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0e2419")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1c352c")}
                  >
                    BOOK THIS ROOM
                  </button>
                </div>
              </div>

              <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {imageGallery.map((img, index) => (
                  <div key={`${img}-${index}`} className="relative h-52 overflow-hidden border border-[#d4d7c7]">
                    <img src={img} alt={`${room.name} preview ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
                <div className="border border-[#d4d7c7] bg-white p-8 shadow-sm">
                  <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#71867e]">About This Room</p>
                  <p className="text-sm leading-8 text-[#4a6358]">{room.description}</p>
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

