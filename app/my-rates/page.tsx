"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../components/site-header";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const CHECK_IN_TIME = "2:00 PM";
const CHECK_OUT_TIME = "12:00 PM";
const REVIEWABLE_STATUSES = new Set([
  "completed",
  "confirmed",
  "checked_in",
  "checked_out",
  "checked-out",
  "checked out",
  "checkout",
]);

interface RoomRating {
  id: number;
  room: number;
  room_name: string;
  room_number: string;
  booking: number | null;
  stars: number;
  comment: string;
  created_at: string;
}

interface Booking {
  id: number;
  room: number;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  created_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtStay(dateValue: string, timeValue?: string) {
  return `${fmt(dateValue)}${timeValue ? ` • ${timeValue}` : ""}`;
}

function normalizeStars(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function starText(stars: number) {
  return `${normalizeStars(stars)}/5`;
}

function isReviewableStatus(status: string) {
  const normalized = status.trim().toLowerCase().replace(/_/g, " ");
  return REVIEWABLE_STATUSES.has(normalized);
}

function isReviewableBooking(booking: Booking) {
  return isReviewableStatus(booking.status);
}

function parseApiError(raw: string, fallback: string) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const message = parsed.error || parsed.detail;
    if (typeof message === "string" && message.trim()) return message;
    if (message !== undefined && message !== null) return String(message);
  } catch {
    // Fall back to the raw text below.
  }
  return raw.trim() || fallback;
}

function safeJsonParse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function dedupeRatingsByRoom(items: RoomRating[]) {
  const latestByRoom = new Map<number, RoomRating>();
  for (const item of items) {
    const existing = latestByRoom.get(item.room);
    if (!existing) {
      latestByRoom.set(item.room, item);
      continue;
    }

    const existingTime = new Date(existing.created_at).getTime();
    const nextTime = new Date(item.created_at).getTime();
    if (nextTime >= existingTime) {
      latestByRoom.set(item.room, item);
    }
  }
  return Array.from(latestByRoom.values());
}

function MyRatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBookingId = Number(searchParams.get("booking"));
  const [ratings, setRatings] = useState<RoomRating[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [ratingsError, setRatingsError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      sessionStorage.setItem("redirect_after_login", "/my-rates");
      router.push("/");
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    const loadRatings = async () => {
      setRatingsLoading(true);
      setRatingsError("");
      try {
        const res = await fetch(`${API}/hotelroom/ratings/my/`, { headers });
        const raw = await res.text();
        if (!res.ok) throw new Error(parseApiError(raw, "Failed to load your ratings."));
        const data = raw ? JSON.parse(raw) : [];
        if (!cancelled) setRatings(dedupeRatingsByRoom(Array.isArray(data) ? data : []));
      } catch (err) {
        if (!cancelled) {
          setRatingsError(err instanceof Error ? err.message : "Failed to load your ratings.");
          setRatings([]);
        }
      } finally {
        if (!cancelled) setRatingsLoading(false);
      }
    };

    const loadBookings = async () => {
      setBookingsLoading(true);
      setBookingsError("");
      try {
        const res = await fetch(`${API}/hotelroom/bookings/my/`, { headers });
        const raw = await res.text();
        if (!res.ok) throw new Error(parseApiError(raw, "Failed to load your bookings."));
        const data = raw ? JSON.parse(raw) : [];
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setBookingsError(err instanceof Error ? err.message : "Failed to load your bookings.");
          setBookings([]);
        }
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    };

    void loadRatings();
    void loadBookings();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const avgRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + normalizeStars(r.stars), 0) / ratings.length;
  }, [ratings]);

  const completedBookings = useMemo(
    () => bookings.filter(b => isReviewableBooking(b)),
    [bookings]
  );

  const ratedRoomIds = useMemo(
    () => new Set(ratings.map(r => r.room)),
    [ratings]
  );

  const reviewableBookings = useMemo(
    () => completedBookings.filter(b => !ratedRoomIds.has(b.room)),
    [completedBookings, ratedRoomIds]
  );

  const reviewedBookings = useMemo(
    () => completedBookings.filter(b => ratedRoomIds.has(b.room)),
    [completedBookings, ratedRoomIds]
  );

  const selectedBooking = useMemo(
    () => completedBookings.find(b => b.id === selectedBookingId) || null,
    [completedBookings, selectedBookingId]
  );

  const selectedRating = useMemo(
    () => ratings.find(r => r.room === selectedBooking?.room) || null,
    [ratings, selectedBooking]
  );
  const readyToReviewCount = reviewableBookings.length;

  useEffect(() => {
    if (completedBookings.length === 0) {
      if (selectedBookingId !== null) {
        setSelectedBookingId(null);
        setSelectedStars(0);
        setComment("");
        setSubmitMsg("");
      }
      return;
    }

    if (selectedBookingId !== null && !completedBookings.some(b => b.id === selectedBookingId)) {
      setSelectedBookingId(null);
      setSelectedStars(0);
      setComment("");
      setSubmitMsg("");
    }
  }, [completedBookings, selectedBookingId]);

  useEffect(() => {
    if (!Number.isFinite(requestedBookingId) || requestedBookingId <= 0) return;
    const matchingBooking = completedBookings.find(b => b.id === requestedBookingId);
    if (matchingBooking) {
      setSelectedBookingId(matchingBooking.id);
      setSelectedStars(0);
      setComment("");
      setSubmitMsg("");
    }
  }, [requestedBookingId, completedBookings]);

  useEffect(() => {
    if (selectedBookingId !== null) return;
    const firstAvailable = reviewableBookings[0] || reviewedBookings[0] || completedBookings[0] || null;
    if (firstAvailable) setSelectedBookingId(firstAvailable.id);
  }, [completedBookings, reviewableBookings, reviewedBookings, selectedBookingId]);

  useEffect(() => {
    if (!selectedBooking) return;
    if (selectedRating) {
      setSelectedStars(selectedRating.stars);
      setComment(selectedRating.comment || "");
      return;
    }
    setSelectedStars(0);
    setComment("");
  }, [selectedBooking, selectedRating]);

  const submitRating = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !selectedBooking) return;
    if (selectedStars < 1 || selectedStars > 5) {
      setSubmitMsg("Please choose a star rating first.");
      return;
    }

    setSubmitLoading(true);
    setSubmitMsg("");
    try {
      const res = await fetch(`${API}/hotelroom/rooms/${selectedBooking.room}/ratings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          stars: selectedStars,
          comment: comment.trim(),
        }),
      });

      const raw = await res.text();
      const data = safeJsonParse(raw);
      if (!res.ok) {
        setSubmitMsg(parseApiError(raw, "Could not submit your rating."));
        return;
      }

      window.dispatchEvent(new CustomEvent("room-ratings-updated", { detail: { roomId: data.room } }));
      setRatings(prev => {
        const merged = prev.filter(r => r.room !== data.room);
        return [...merged, data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
      setSubmitMsg(selectedRating ? "Rating updated successfully." : "Rating submitted successfully.");
      setSelectedStars(0);
      setComment("");
    } catch {
      setSubmitMsg("Could not submit your rating.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const loading = ratingsLoading || bookingsLoading;
  const error = [ratingsError, bookingsError].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(226,211,186,0.42),_transparent_34%),linear-gradient(180deg,_#fbf7ef_0%,_#f5efe6_48%,_#efe8dc_100%)] text-[#1c352c] font-sans">
      <SiteHeader
        rightLinks={[
          
          { label: "USER", href: "/user-dashboard?tab=bookings" },
        ]}
      />

      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="relative mb-10 overflow-hidden bg-white/80 p-8 shadow-[0_18px_60px_rgba(28,53,44,0.08)] backdrop-blur">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-[#d9c2a1]/35" />
            <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-[#9eb6a8]/20 blur-2xl" />
            <p className="relative text-xs uppercase tracking-[0.45em] text-[#71867e]">Your Feedback</p>
            <div className="relative mt-3 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-thin tracking-[0.22em]">MY RATES</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4a6358]">
                  You can rate a booking once it is confirmed, checked in, or checked out. Add an optional comment, pick a star rating, and submit it straight to the localhost database.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="bg-[#faf7f0] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Reviews</p>
                  <p className="mt-1 text-2xl font-light">{ratings.length}</p>
                </div>
                <div className="bg-[#faf7f0] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Average</p>
                  <p className="mt-1 text-2xl font-light">{ratings.length ? avgRating.toFixed(1) : "0.0"}/5</p>
                </div>
                <div className="bg-[#faf7f0] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Storage</p>
                  <p className="mt-1 text-sm text-[#4a6358]">Saved from localhost</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden border border-[#d9c2a1] bg-[#fffaf2] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#b07b2b]">After Checkout</p>
              <p className="mt-2 text-sm leading-6 text-[#5d4a2b]">
                When your booking is confirmed or active, it appears here ready for a star rating and an optional comment.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-[#8c6631]">
                {readyToReviewCount > 0 ? `${readyToReviewCount} stay(s) ready to rate` : "No bookings ready yet"}
              </p>
            </div>
          </div>

          {loading && <p className="py-20 text-center text-[#71867e] tracking-widest text-sm">Loading ratings...</p>}
          {!loading && error && <p className="py-20 text-center text-red-500 text-sm">{error}</p>}

          {!loading && !error && (
            <div className="mb-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="bg-white/92 p-5 shadow-[0_18px_50px_rgba(28,53,44,0.08)]">
                  <div className="border-b border-[#ece5d7] pb-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Reviewable stays</p>
                    <h2 className="mt-2 text-xl font-thin tracking-[0.16em]">Pick a room to review</h2>
                    <p className="mt-2 text-sm text-[#4a6358]">
                      Choose a stay that is confirmed, checked in, or checked out, then add stars and an optional comment.
                    </p>
                  </div>
                  <div className="mt-5 grid gap-3">
                  {reviewableBookings.length > 0 ? (
                    reviewableBookings.map(booking => {
                      const active = selectedBooking?.id === booking.id;
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => setSelectedBookingId(booking.id)}
                          className={`text-left p-4 transition ${active ? "bg-[#faf9f6]" : "bg-white hover:bg-[#faf9f6]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Booking #{booking.id}</p>
                              <h3 className="mt-1 text-lg font-light tracking-[0.15em] uppercase">{booking.room_name}</h3>
                              <p className="mt-1 text-xs text-[#71867e]">
                                Room {booking.room_number} • Check-in {booking.check_in_time || CHECK_IN_TIME} • Check-out {booking.check_out_time || CHECK_OUT_TIME}
                              </p>
                            </div>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-700">
                              Review Now
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-[#4a6358]">
                            Check-in {fmtStay(booking.check_in, booking.check_in_time || CHECK_IN_TIME)} to check-out {fmtStay(booking.check_out, booking.check_out_time || CHECK_OUT_TIME)}
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="border border-dashed border-[#d9c2a1] bg-[#fffaf2] p-6 text-center">
                      <p className="text-xs uppercase tracking-[0.35em] text-[#b07b2b]">No booking ready yet</p>
                      <p className="mt-3 text-sm text-[#5d4a2b]">
                        Your room will appear here once your booking is confirmed or active. After that, you can rate it with stars and a comment.
                      </p>
                    </div>
                  )}

                </div>

                {selectedBooking && (
                  <div className="mt-6 pt-6">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Review Room</p>
                    <div className="mt-3 grid gap-4 rounded-2xl bg-[#faf7f0] p-4">
                      <div>
                          <h3 className="text-xl font-thin tracking-[0.18em]">{selectedBooking.room_name}</h3>
                          <p className="mt-2 text-sm text-[#4a6358]">
                            Room {selectedBooking.room_number} | Booking #{selectedBooking.id}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-[#71867e]">
                          Check-in {fmtStay(selectedBooking.check_in, selectedBooking.check_in_time || CHECK_IN_TIME)} to check-out {fmtStay(selectedBooking.check_out, selectedBooking.check_out_time || CHECK_OUT_TIME)}
                          </p>
                      </div>

                      <div className="border border-[#d9c2a1] bg-[#fffaf2] px-4 py-3 text-sm text-[#5d4a2b]">
                        Leave a star rating and, if you want, a short comment for this room. Your feedback updates the room average for everyone.
                      </div>

                      {selectedRating && (
                        <div className="border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-700">Already reviewed</p>
                          <p className="mt-2 text-sm tracking-[0.18em] text-[#c48a3a]">
                            Rating {starText(selectedRating.stars)}
                          </p>
                          <p className="mt-3 text-sm leading-relaxed text-[#4a6358]">
                            {selectedRating.comment || "No comment left."}
                          </p>
                          <p className="mt-3 text-xs text-emerald-800">
                            Edit the stars or comment below, then save again to update the existing review.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-[#71867e]">Comment (Optional)</label>
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          rows={4}
                          placeholder="Share how your stay went, if you want..."
                          className="w-full resize-none bg-white px-3 py-2 text-sm outline-none transition"
                        />
                      </div>

                      {submitMsg && (
                        <p className={`text-xs ${submitMsg.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
                          {submitMsg}
                        </p>
                      )}

                      <div>
                        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#71867e]">Choose your rating</p>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setSelectedStars(n)}
                              disabled={submitLoading}
                              className={`bg-white px-2 py-4 text-center transition hover:-translate-y-0.5 hover:bg-[#f3ede2] disabled:opacity-50 ${
                                selectedStars === n ? "ring-2 ring-[#1c352c]" : ""
                              }`}
                            >
                              <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-[#c48a3a]">Rate</span>
                              <span className="mt-1 block text-xl leading-none text-[#1c352c]">{n}</span>
                              <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-[#71867e]">
                                {n === 1 ? "Star" : "Stars"}
                              </span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={submitRating}
                          disabled={submitLoading || selectedStars < 1}
                          className="mt-4 w-full bg-[#1c352c] px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-[#0e2419] disabled:opacity-50"
                        >
                          {submitLoading ? (selectedRating ? "Updating..." : "Submitting...") : selectedRating ? "Update Review" : "Submit Review"}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push("/user-dashboard?tab=bookings")}
                          className="mt-3 w-full border border-[#d9c2a1] bg-white px-4 py-3 text-xs uppercase tracking-[0.3em] text-[#5d4a2b] transition hover:bg-[#fffaf2]"
                        >
                          Maybe Later
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="bg-white/92 p-5 shadow-[0_18px_50px_rgba(28,53,44,0.08)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Submitted Ratings</p>
                <div className="mt-2 text-3xl font-light">{ratings.length}</div>
                <p className="mt-2 text-sm text-[#4a6358]">Average rating: {ratings.length ? avgRating.toFixed(1) : "0.0"}/5</p>
                <div className="mt-6 pt-4">
                  {ratings.length === 0 ? (
                    <p className="text-sm text-[#71867e]">No ratings submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {ratings.slice(0, 5).map((rating, index) => (
                        <div key={`${rating.room}-${rating.id}-${index}`} className="bg-[#faf9f6] p-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-[#c48a3a]">Rating {starText(rating.stars)}</p>
                          <p className="mt-2 text-sm text-[#4a6358]">{rating.room_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && ratings.length > 0 && (
            <div className="grid gap-4">
              {ratings.map((rating, index) => (
                <article key={`${rating.room}-${rating.id}-${index}`} className="bg-white/92 p-5 shadow-[0_18px_50px_rgba(28,53,44,0.08)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Room</p>
                      <h2 className="mt-1 text-2xl font-thin tracking-[0.18em]">{rating.room_name}</h2>
                      <p className="mt-1 text-xs text-[#71867e]">Room {rating.room_number} {rating.booking ? `· Booking #${rating.booking}` : ""}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">Rated On</p>
                      <p className="mt-1 text-sm text-[#4a6358]">{fmt(rating.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-sm bg-[#faf9f6] p-4">
                    <p className="text-sm tracking-[0.18em] text-[#c48a3a]">Rating {starText(rating.stars)}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[#4a6358]">{rating.comment || "No comment left."}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyRatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <MyRatesPageContent />
    </Suspense>
  );
}
