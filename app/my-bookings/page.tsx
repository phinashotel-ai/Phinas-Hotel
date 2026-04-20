"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const ROOM_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  deluxe: "/che2.jpg",
  family: "/che3.jpg",
  suite: "/che4.jpg",
};

const CHECK_IN_TIME = "2:00 PM";
const CHECK_OUT_TIME = "12:00 PM";

interface Payment {
  method: string;
  reference_number: string;
  amount: string;
  status: string;
}

interface Booking {
  id: number;
  room: number;
  room_name: string;
  room_number: string;
  room_type?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_at?: string;
  check_out_at?: string;
  guests: number;
  meal_category: string;
  total_price: string;
  status: string;
  special_requests: string;
  promo_code: string;
  discount_amount: string;
  free_food_guests: number;
  extra_guest_count: number;
  extra_guest_fee_per_night: string;
  extra_guest_fee_total: string;
  meal_addon_rate: string;
  meal_addon_total: string;
  reference_number?: string | null;
  created_at: string;
  payment?: Payment | null;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
  checked_in: "bg-sky-100 text-sky-700",
  checked_out: "bg-indigo-100 text-indigo-700",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtStay(dateValue: string, timeValue?: string) {
  return `${fmt(dateValue)}${timeValue ? ` • ${timeValue}` : ""}`;
}

function isAfterCheckInWindow(checkIn: string) {
  return new Date(`${checkIn}T14:00:00`).getTime() <= Date.now();
}

function isAfterCheckOutWindow(checkOut: string) {
  return new Date(`${checkOut}T12:00:00`).getTime() <= Date.now();
}

function nights(ci: string, co: string) {
  return Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

function money(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function statusLabel(status: string) {
  if (status === "checked_in") return "checked in";
  if (status === "checked_out") return "checked out";
  return status;
}

function canReviewBooking(booking: Booking) {
  // Allow rating for any booking status
  return true;
}

function canCheckInBooking(booking: Booking) {
  if (booking.status !== "confirmed") return false;
  return isAfterCheckInWindow(booking.check_in);
}

function canCheckOutBooking(booking: Booking) {
  if (booking.status !== "checked_in") return false;
  return isAfterCheckOutWindow(booking.check_out);
}

function canExtendBooking(booking: Booking) {
  if (booking.status !== "confirmed" && booking.status !== "checked_in") return false;
  return new Date(`${booking.check_out}T12:00:00`).getTime() >= Date.now();
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    id: number;
    action: "check_in" | "check_out" | "extend_stay";
  } | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [extendTarget, setExtendTarget] = useState<Booking | null>(null);
  const [extendDays, setExtendDays] = useState(1);
  const [extendHours, setExtendHours] = useState(0);
  const [ratingTarget, setRatingTarget] = useState<Booking | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", "/my-bookings");
      router.push("/");
      return;
    }

    fetch(`${API}/hotelroom/bookings/my/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (res.status === 401) throw new Error("Session expired. Please log in again.");

        const contentType = res.headers.get("content-type") || "";
        const raw = await res.text();

        if (!res.ok) {
          let message = "Failed to load bookings.";
          if (contentType.includes("application/json")) {
            try {
              const parsed = JSON.parse(raw);
              message = parsed.error || parsed.detail || message;
            } catch {
              message = raw || message;
            }
          } else if (raw) {
            message = raw.includes("<!DOCTYPE") ? "The bookings API returned an HTML error page. Make sure the backend API is running." : raw;
          }
          throw new Error(message);
        }

        if (!contentType.includes("application/json")) {
          throw new Error("The bookings API returned HTML instead of JSON. Check the backend API server.");
        }

        return JSON.parse(raw);
      })
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setSelectedId(Array.isArray(data) && data.length > 0 ? data[0].id : null);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Failed to load bookings.");
        setLoading(false);
      });
  }, [router]);

  const selected = useMemo(
    () => bookings.find(b => b.id === selectedId) || bookings[0] || null,
    [bookings, selectedId]
  );

  const imageSrc = selected ? ROOM_IMAGES[selected.room_type || ""] || "/che.jpg" : "/che.jpg";

  const handleBookingAction = async (bookingId: number, action: "check_in" | "check_out" | "extend_stay") => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setActionLoading({ id: bookingId, action });
    setActionMsg("");

    try {
      const res = await fetch(`${API}/hotelroom/bookings/${bookingId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action === "extend_stay" ? { action, extend_days: extendDays, extend_hours: extendHours } : { action }),
      });

      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setActionMsg(
          typeof data.error === "string"
            ? data.error
            : action === "check_in"
              ? "Failed to check in."
              : "Failed to check out."
        );
        return;
      }

      const updated = (data.booking && typeof data.booking === "object" ? data.booking : data) as Booking;
      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, ...updated } : b)));
      setSelectedId(prev => (prev === bookingId ? bookingId : prev));
      if (action === "check_in") {
        setActionMsg("Check-in saved successfully.");
      } else if (action === "check_out") {
        setActionMsg("Check-out saved successfully.");
      } else {
        setActionMsg("Stay extended successfully.");
      }

      setTimeout(() => setActionMsg(""), 3000);
    } catch {
      setActionMsg(
        action === "check_in"
          ? "Failed to check in."
          : action === "check_out"
            ? "Failed to check out."
            : "Failed to extend your stay."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRating = async () => {
    if (!ratingTarget || ratingStars < 1) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setRatingLoading(true);
    try {
      const res = await fetch(`${API}/hotelroom/rooms/${ratingTarget.room}/ratings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: ratingTarget.id,
          stars: ratingStars,
          comment: ratingComment.trim(),
        }),
      });

      if (res.ok) {
        setActionMsg("Rating submitted successfully!");
        setRatingTarget(null);
        setRatingStars(0);
        setRatingComment("");
        setTimeout(() => setActionMsg(""), 3000);
      } else {
        setActionMsg("Failed to submit rating.");
      }
    } catch {
      setActionMsg("Failed to submit rating.");
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c352c] font-sans">
      <SiteHeader
        navLinks={[]} // Remove navigation links (Rooms, About, Contact)
        rightLinks={[]} // Remove right links (ROOMS, USER)
      />

      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-[#71867e]">Your Stay History</p>
            <h1 className="mt-3 text-4xl font-thin tracking-[0.2em]">MY BOOKINGS</h1>
            <p className="mt-3 text-sm text-[#4a6358]">View every booking, room charge, guest fee, meal add-on, and payment record in one place.</p>
          </div>

          {loading && <p className="py-20 text-center text-[#71867e] tracking-widest text-sm">Loading bookings...</p>}
          {!loading && error && <p className="py-20 text-center text-red-500 text-sm">{error}</p>}
          {!loading && !error && actionMsg && (
            <p className={`mb-6 text-center text-sm ${actionMsg.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
              {actionMsg}
            </p>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div className="mx-auto max-w-2xl border border-dashed border-[#d4d7c7] bg-white/60 p-12 text-center shadow-sm">
              <p className="text-sm tracking-widest text-[#71867e]">No bookings yet.</p>
              <p className="mt-3 text-xs text-[#4a6358]">Once you reserve a room, the full breakdown will appear here.</p>
              <Link href="/rooms" className="mt-6 inline-flex rounded-full bg-[#1c352c] px-6 py-3 text-xs tracking-[0.25em] text-white transition hover:bg-[#0e2419]">
                BROWSE ROOMS
              </Link>
            </div>
          )}

          {!loading && bookings.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {bookings.map(booking => {
                  const isActive = booking.id === selected?.id;
                  return (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedId(booking.id)}
                      className={`w-full text-left border p-4 shadow-sm transition ${isActive ? "border-[#1c352c] bg-white" : "border-[#e8e0d3] bg-white/70 hover:border-[#71867e]"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Booking #{booking.id}</p>
                          <h2 className="mt-1 text-lg font-light tracking-[0.15em] uppercase">{booking.room_name}</h2>
                          <p className="mt-1 text-xs text-[#71867e]">
                            Room {booking.room_number} · {fmtStay(booking.check_in, booking.check_in_time)} to {fmtStay(booking.check_out, booking.check_out_time)}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${STATUS_STYLE[booking.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabel(booking.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#4a6358]">
                        <span className="rounded-full bg-[#eef0e8] px-3 py-1">Guests: {booking.guests}</span>
                        <span className="rounded-full bg-[#eef0e8] px-3 py-1">Meal: {booking.meal_category}</span>
                        <span className="rounded-full bg-[#eef0e8] px-3 py-1">Total: ₱{money(booking.total_price)}</span>
                      </div>
                      {canReviewBooking(booking) && (
                        <div className="mt-4 border border-blue-200 bg-blue-50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-blue-700">Rate & Comment</p>
                              <p className="mt-1 text-xs text-blue-900">
                                Rate this booking experience
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setRatingTarget(booking);
                                setRatingStars(0);
                                setRatingComment("");
                              }}
                              className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 transition"
                            >
                              Rate Now
                            </button>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="border border-[#e8e0d3] bg-white p-6 shadow-sm">
                  <div className="relative mb-6 h-64 overflow-hidden">
                    <img src={imageSrc} alt={selected.room_name} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute left-4 top-4 rounded-full bg-[#1c352c] px-3 py-1 text-xs font-semibold tracking-wide text-white">
                      {selected.room_type || "room"}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Full Details</p>
                      <h2 className="mt-1 text-3xl font-thin tracking-[0.18em]">{selected.room_name}</h2>
                      <p className="mt-1 text-xs text-[#71867e]">Room {selected.room_number}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${STATUS_STYLE[selected.status] || "bg-gray-100 text-gray-700"}`}>
                      {statusLabel(selected.status)}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Detail label="Booking ID" value={`#${selected.id}`} />
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Detail label="Check-in" value={fmt(selected.check_in)} />
                    <Detail label="Check-in Time" value={selected.check_in_time || CHECK_IN_TIME} />
                    <Detail label="Check-out" value={fmt(selected.check_out)} />
                    <Detail label="Check-out Time" value={selected.check_out_time || CHECK_OUT_TIME} />
                    <Detail label="Reference Number" value={selected.reference_number || selected.payment?.reference_number || "None"} />
                    <Detail label="Nights" value={String(nights(selected.check_in, selected.check_out))} />
                    <Detail label="Guests" value={String(selected.guests)} />
                    <Detail label="Free Food Guests" value={String(selected.free_food_guests)} />
                    <Detail label="Extra Guests" value={String(selected.extra_guest_count)} />
                    <Detail label="Meal Category" value={selected.meal_category} />
                    <Detail label="Created At" value={fmt(selected.created_at)} />
                  </div>

                  <div className="mt-6 grid gap-3 border-t border-[#d4d7c7] pt-6">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">
                      Check-in, check-out, extend stay, and rate/comment
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCheckInBooking(selected)) {
                            setActionMsg("Check-in becomes available on or after your check-in date.");
                            return;
                          }
                          void handleBookingAction(selected.id, "check_in");
                        }}
                        disabled={!canCheckInBooking(selected) || actionLoading?.id === selected.id}
                        className="rounded-full border border-[#1c352c] px-5 py-3 text-xs uppercase tracking-[0.28em] text-[#1c352c] transition hover:bg-[#1c352c] hover:text-white disabled:opacity-50"
                      >
                        {actionLoading?.id === selected.id && actionLoading.action === "check_in" ? "Checking in..." : "Check-in"}
                      </button>
                <button
                  type="button"
                  onClick={() => {
                    if (canCheckOutBooking(selected)) {
                      void handleBookingAction(selected.id, "check_out");
                      return;
                    }
                    if (canReviewBooking(selected)) {
                      router.push(`/my-rates?booking=${selected.id}`);
                      return;
                    }
                    setActionMsg("This booking is not ready for checkout or review yet.");
                  }}
                  disabled={(!canCheckOutBooking(selected) && !canReviewBooking(selected)) || actionLoading?.id === selected.id}
                  className="rounded-full border border-emerald-500 px-5 py-3 text-xs uppercase tracking-[0.28em] text-emerald-700 transition hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                >
                  {actionLoading?.id === selected.id && actionLoading.action === "check_out"
                    ? "Checking out..."
                    : canCheckOutBooking(selected)
                      ? "Check-out / Rate Comment"
                      : "Rate & Comment"}
                </button>
                      <button
                        type="button"
                  onClick={() => {
                    if (!canExtendBooking(selected)) {
                      setActionMsg("You can only extend once the booking is confirmed or checked in.");
                      return;
                    }
                    setExtendTarget(selected);
                    setExtendDays(1);
                    setExtendHours(0);
                  }}
                        disabled={!canExtendBooking(selected) || actionLoading?.id === selected.id}
                        className="rounded-full border border-[#c48a3a] px-5 py-3 text-xs uppercase tracking-[0.28em] text-[#c48a3a] transition hover:bg-[#c48a3a] hover:text-white disabled:opacity-50 sm:col-span-2"
                      >
                      {actionLoading?.id === selected.id && actionLoading.action === "extend_stay" ? "Extending..." : "Extend Stay"}
                    </button>
                  </div>
                </div>

                  <div className="mt-6 grid gap-3 border-t border-[#d4d7c7] pt-6 text-sm">
                    <Line label="Room Total" value={`₱${money(Number(selected.total_price) - Number(selected.extra_guest_fee_total) - Number(selected.meal_addon_total) + Number(selected.discount_amount))}`} />
                    <Line label="Extra Guest Fee" value={`₱${money(selected.extra_guest_fee_total)}`} />
                    <Line label="Meal Add-on" value={`₱${money(selected.meal_addon_total)}`} />
                    
                    <Line label="Grand Total" value={`₱${money(selected.total_price)}`} strong />
                  </div>

                  <div className="mt-6 grid gap-3 border-t border-[#d4d7c7] pt-6 text-sm">
                    
                    <Line label="Special Requests" value={selected.special_requests || "None"} />
                    <Line label="Meal Rate" value={`₱${money(selected.meal_addon_rate)} per guest`} />
                    <Line label="Extra Guest Fee/Night" value={`₱${money(selected.extra_guest_fee_per_night)}`} />
                  </div>

                  {selected.payment && (
                    <div className="mt-6 border border-[#d4d7c7] bg-[#faf9f6] p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Payment</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Detail label="Method" value={selected.payment.method} />
                        <Detail label="Status" value={selected.payment.status} />
                        <Detail label="Reference" value={selected.payment.reference_number || selected.reference_number || "None"} />
                        <Detail label="Amount" value={`₱${money(selected.payment.amount)}`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg bg-[#faf9f6] p-8 shadow-2xl">
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Extend Stay</p>
            <p className="text-sm text-[#4a6358] mb-5">
              Booking #{extendTarget.id} for {extendTarget.room_name}. Choose extra days or hours to add.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Extra Days</label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  step={1}
                  value={extendDays}
                  onChange={e => setExtendDays(Math.max(0, Math.min(7, Number(e.target.value) || 0)))}
                  className="w-full border border-[#d4d7c7] px-4 py-3 text-sm bg-white outline-none focus:border-[#1c352c] transition"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Extra Hours</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={1}
                  value={extendHours}
                  onChange={e => setExtendHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                  className="w-full border border-[#d4d7c7] px-4 py-3 text-sm bg-white outline-none focus:border-[#1c352c] transition"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-[#71867e]">You can extend by up to 7 days and 24 hours at a time.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setExtendTarget(null);
                  setExtendDays(1);
                  setExtendHours(0);
                }}
                className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (!extendTarget) return;
                  void handleBookingAction(extendTarget.id, "extend_stay");
                  setExtendTarget(null);
                  setExtendDays(1);
                  setExtendHours(0);
                }}
                disabled={actionLoading?.id === extendTarget.id}
                className="flex-1 py-3 text-xs tracking-[0.25em] bg-[#c48a3a] text-white hover:bg-[#ad7427] transition disabled:opacity-50"
              >
                {actionLoading?.id === extendTarget.id && actionLoading.action === "extend_stay" ? "EXTENDING..." : "CONFIRM EXTENSION"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg bg-[#faf9f6] p-8 shadow-2xl">
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Rate Booking</p>
            <p className="text-sm text-[#4a6358] mb-5">
              Booking #{ratingTarget.id} for {ratingTarget.room_name}. Rate your experience.
            </p>
            
            <div className="mb-4">
              <label className="mb-2 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Rating (1-5 stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingStars(star)}
                    className={`w-10 h-10 text-xl transition ${
                      ratingStars >= star ? "text-yellow-500" : "text-gray-300"
                    } hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Comment (Optional)</label>
              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
                placeholder="Share your experience..."
                className="w-full border border-[#d4d7c7] px-4 py-3 text-sm bg-white outline-none focus:border-[#1c352c] transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRatingTarget(null);
                  setRatingStars(0);
                  setRatingComment("");
                }}
                className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleRating}
                disabled={ratingStars < 1 || ratingLoading}
                className="flex-1 py-3 text-xs tracking-[0.25em] bg-[#1c352c] text-white hover:bg-[#0e2419] transition disabled:opacity-50"
              >
                {ratingLoading ? "SUBMITTING..." : "SUBMIT RATING"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e8e0d3] bg-[#faf9f6] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#71867e]">{label}</p>
      <p className="mt-1 text-sm text-[#1c352c]">{value}</p>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "text-base font-semibold" : ""}`}>
      <span className="text-[#4a6358]">{label}</span>
      <span className={strong ? "text-[#1c352c]" : "text-[#1c352c]"}>{value}</span>
    </div>
  );
}
