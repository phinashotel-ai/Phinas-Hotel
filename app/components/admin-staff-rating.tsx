"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

interface Booking {
  id: number;
  reference_number?: string | null;
  user_name: string;
  user_email: string;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: string;
  status: string;
  created_at: string;
}

interface RatingModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function RatingModal({ booking, onClose, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1-5 stars");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSubmitting(true);
    setError("");

    try {
      // Get the room ID from the booking details since it's not directly available
      const bookingRes = await fetch(`${API}/hotelroom/bookings/admin/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingsData = await bookingRes.json();
      const fullBooking = Array.isArray(bookingsData) 
        ? bookingsData.find((b: any) => b.id === booking.id)
        : null;
      
      const roomId = fullBooking?.room;
      
      if (!roomId) {
        setError("Unable to find room information for this booking");
        return;
      }

      const res = await fetch(`${API}/hotelroom/rooms/${roomId}/ratings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: booking.id,
          stars: rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || data.detail || "Failed to submit rating");
        return;
      }

      // Dispatch event to refresh ratings in other components
      window.dispatchEvent(new CustomEvent("room-ratings-updated", { detail: { roomId } }));
      
      onSuccess("Rating submitted successfully");
      onClose();
    } catch (err) {
      setError("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
      <div className="w-full max-w-md shadow-2xl overflow-hidden" style={{ backgroundColor: "rgba(250,249,246,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Rate Booking</p>
            <p className="text-white font-light tracking-[0.15em]">Booking #{booking.id} for {booking.room_name}</p>
          </div>
          <button onClick={onClose} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-xs text-[#71867e] mb-2">Guest: <span className="text-[#1c352c] font-medium">{booking.user_name}</span></p>
            <p className="text-xs text-[#71867e]">Room: <span className="text-[#1c352c] font-medium">{booking.room_name} #{booking.room_number}</span></p>
          </div>

          <div className="mb-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-3">Rating (1-5 stars)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-12 h-12 text-2xl transition ${
                    rating >= star 
                      ? "text-yellow-500 hover:text-yellow-600" 
                      : "text-gray-300 hover:text-yellow-400"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-xs text-[#71867e] mt-1">Selected: {rating}/5 stars</p>
          </div>

          <div className="mb-4">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2 block">Comment (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Add a comment about this booking..."
              className="w-full border border-[#d4d7c7] px-3 py-2 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition resize-none"
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 text-xs text-red-600 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating < 1}
              className="flex-1 py-3 text-xs tracking-[0.25em] transition disabled:opacity-50"
              style={{ backgroundColor: "#1c352c", color: "#fff" }}
            >
              {submitting ? "SUBMITTING..." : "SUBMIT RATING"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RatingModal;