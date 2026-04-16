"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "../../components/site-header";
import { sendBookingEmail } from "../../../lib/send-booking-email";

const ROOM_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  deluxe:   "/che2.jpg",
  family:   "/che3.jpg",
  suite:    "/che4.jpg",
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const GCASH_COMPANY_NAME = "PHINAS HOTEL";
const GCASH_COMPANY_NUMBER = "0917 000 0000";
const CHECK_IN_TIME_OPTIONS = ["2:00 AM", "2:00 PM"] as const;
const CHECK_OUT_TIME_OPTIONS = ["12:00 AM", "12:00 PM"] as const;
const DEFAULT_CHECK_IN_TIME = CHECK_IN_TIME_OPTIONS[1];
const DEFAULT_CHECK_OUT_TIME = CHECK_OUT_TIME_OPTIONS[1];

interface Room {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: number;
  description: string;
  amenities: string[];
  status: string;
  floor: number;
  image_url: string;
  free_food_guest_limit?: number;
  extra_guest_fee_per_night?: string;
  lunch_price_per_guest?: string;
  dinner_price_per_guest?: string;
  extra_guest_lunch_price_per_guest?: string;
  extra_guest_dinner_price_per_guest?: string;
}

interface BookingResponse {
  id: number;
  user_name?: string;
  user_first_name?: string;
  user_email: string;
  room_name: string;
  room_number: string;
  reference_number?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  guests: number;
  meal_category: string;
  total_price: string;
  status: string;
  free_food_guests?: number;
  meal_addon_total?: string;
  promo_code?: string;
  discount_amount?: string;
  payment?: {
    method?: string;
    reference_number?: string | null;
    sent_amount?: string | null;
    amount?: string;
    status?: string;
  } | null;
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
        ? `${fallback} The backend returned an HTML error page.`
        : (raw || fallback),
    };
  }

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      data: null,
      error: "The backend returned HTML instead of JSON. Make sure the API server is running.",
    };
  }

  try {
    return { ok: true, data: raw ? JSON.parse(raw) : null, error: "" };
  } catch {
    return { ok: false, data: null, error: "The backend returned invalid JSON." };
  }
}

export default function BookingPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [room, setRoom]           = useState<Room | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const [checkIn, setCheckIn]   = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [checkInTime, setCheckInTime] = useState<(typeof CHECK_IN_TIME_OPTIONS)[number]>(DEFAULT_CHECK_IN_TIME);
  const [checkOutTime, setCheckOutTime] = useState<(typeof CHECK_OUT_TIME_OPTIONS)[number]>(DEFAULT_CHECK_OUT_TIME);
  const [guests, setGuests]     = useState(1);
  const [mealCategory, setMealCategory] = useState("breakfast");
  const [agreeExtraFee, setAgreeExtraFee] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  // Payment
  const [payMethod, setPayMethod]       = useState("cash");
  const [payReference, setPayReference] = useState("");
  const [payAmount, setPayAmount]       = useState("");

  // Promo
  const [promoDiscount, setPromoDiscount] = useState(0);   // percent
  const [promoApplied, setPromoApplied]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }
    if (!id) return;

    // Load room details
    fetch(`${API}/hotelroom/rooms/${id}/`)
      .then(async res => {
        const result = await readApiResponse(res, "Room not found.");
        if (!result.ok) throw new Error(result.error);
        return result.data;
      })
      .then(data => { setRoom(data); setLoading(false); })
      .catch(err => { setError(err instanceof Error ? err.message : "Room not found."); setLoading(false); });

    // Load unavailable dates for this room
    fetch(`${API}/hotelroom/rooms/${id}/unavailable-dates/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const result = await readApiResponse(res, "Failed to load availability.");
        if (result.ok && Array.isArray(result.data)) {
          setUnavailableDates(result.data);
        }
      })
      .catch(err => console.error('Failed to load unavailable dates:', err));
  }, [id, router]);

  const nights      = checkIn && checkOut
    ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const baseTotal   = room ? nights * Number(room.price_per_night) : 0;
  const freeFoodGuests = room?.free_food_guest_limit ?? 2;
  const extraGuestCount = Math.max(0, guests - freeFoodGuests);
  const extraGuestFeePerNight = Number(room?.extra_guest_fee_per_night || 0);
  const extraGuestFeeTotal = extraGuestCount * extraGuestFeePerNight * nights;
  const lunchRate = Number(room?.lunch_price_per_guest ?? 250);
  const dinnerRate = Number(room?.dinner_price_per_guest ?? 400);
  const extraLunchRate = Number(room?.extra_guest_lunch_price_per_guest ?? lunchRate);
  const extraDinnerRate = Number(room?.extra_guest_dinner_price_per_guest ?? dinnerRate);
  const regularMealRate = mealCategory === "lunch"
    ? lunchRate
    : mealCategory === "dinner"
      ? dinnerRate
      : mealCategory === "both"
        ? lunchRate + dinnerRate
        : 0;
  const extraMealRate = mealCategory === "lunch"
    ? extraLunchRate
    : mealCategory === "dinner"
      ? extraDinnerRate
      : mealCategory === "both"
        ? extraLunchRate + extraDinnerRate
        : 0;
  const mealAddonTotal = (Math.min(guests, freeFoodGuests) * regularMealRate + extraGuestCount * extraMealRate) * nights;
  const subtotalBeforeDiscount = baseTotal + extraGuestFeeTotal + mealAddonTotal;
  const discountAmt = promoDiscount > 0 ? (subtotalBeforeDiscount * promoDiscount) / 100 : 0;
  const finalTotal  = subtotalBeforeDiscount - discountAmt;

  // Helper function to check if a date is unavailable
  const isDateUnavailable = (dateString: string) => {
    return unavailableDates.includes(dateString);
  };

  // Helper function to get the maximum selectable date (today + 1 year)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (nights <= 0) { 
      setToast({
        message: "Check-out date must be after check-in date.",
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
      setError("Check-out must be after check-in."); 
      return; 
    }
    
    // Check if any selected dates are unavailable
    if (checkIn && isDateUnavailable(checkIn)) {
      setToast({
        message: "Selected check-in date is not available for this room.",
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
      setError("Check-in date is not available.");
      return;
    }
    
    if (checkOut && isDateUnavailable(checkOut)) {
      setToast({
        message: "Selected check-out date is not available for this room.",
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
      setError("Check-out date is not available.");
      return;
    }
    if (room && guests > room.capacity) { 
      setToast({
        message: `Maximum capacity for this room is ${room.capacity} guests.`,
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
      setError(`Max capacity is ${room.capacity} guests.`); 
      return; 
    }
    if (extraGuestCount > 0 && !agreeExtraFee) { 
      setToast({
        message: "Please confirm the additional guest fee before proceeding.",
        type: 'warning'
      });
      setTimeout(() => setToast(null), 4000);
      setError("Please confirm the additional guest fee before booking."); 
      return; 
    }
    if (payMethod === "gcash" && !payReference.trim()) { setError("Please enter your GCash reference number."); return; }
    if (payMethod === "gcash" && (!payAmount.trim() || Number(payAmount) <= 0)) {
      setError("Please enter the amount you sent via GCash.");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }

    try {
      const res = await fetch(`${API}/hotelroom/bookings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room: Number(id),
          check_in: checkIn,
          check_out: checkOut,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          guests: Number(guests),
          meal_category: mealCategory,
          special_requests: "Booking confirmed from booking page",
          promo_code: promoApplied,
          payment_method: payMethod,
          payment_reference: payReference,
          payment_amount: payAmount,
        }),
      });

      if (res.status === 401) { localStorage.clear(); router.push("/"); return; }
      const result = await readApiResponse(res, "Booking failed.");
      if (!result.ok) {
        const data = result.data;
        const msgs = data && typeof data === "object"
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
          : result.error;
        throw new Error(msgs || "Booking failed.");
      }
      const data = result.data as BookingResponse;
      await sendBookingEmail({
        status: "pending",
        booking: data,
      });
      setSuccess(`Booking request submitted! #${data.id} is pending staff confirmation. Reference Number: ${data.reference_number || data.payment?.reference_number || "None"}. A confirmation email has been sent to your email address with booking details. The admin will review and send final confirmation after approval. ${String(data.meal_category || mealCategory).replace(/^./, (c: string) => c.toUpperCase())} meal selected. Total: PHP ${Number(data.total_price).toLocaleString()}. First ${data.free_food_guests ?? freeFoodGuests} guest(s) get free food.`);
      sessionStorage.setItem("recent_booking_room_id", String(id));
      sessionStorage.setItem("recent_booking_id", String(data.id));
      setCheckIn(""); setCheckOut(""); setGuests(1); setMealCategory("breakfast");
      setCheckInTime(DEFAULT_CHECK_IN_TIME); setCheckOutTime(DEFAULT_CHECK_OUT_TIME);
      setPromoApplied(""); setPromoDiscount(0);
      setPayReference("");
      setPayAmount("");
      setAgreeExtraFee(false);
      setToast({
        message: `Booking request submitted successfully. Booking ID: ${data.id}.`,
        type: "success",
      });
      setTimeout(() => setToast(null), 5000);
      setTimeout(() => router.push(`/rooms`), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setToast({
        message,
        type: "error",
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const img      = room ? (room.image_url || ROOM_IMAGES[room.room_type] || "/che.jpg") : "/che.jpg";
  const inputCls = "w-full px-4 py-3 border-b border-[#71867e] bg-transparent focus:outline-none focus:border-[#1c352c] transition text-sm text-[#1c352c]";
  const labelCls = "text-[#71867e] text-xs tracking-widest block mb-1";

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>

      <SiteHeader/>

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
                   toast.type === 'error' ? '❌ Booking Failed' : '✅ Booking Success'}
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

      <div className="pt-28 pb-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-2">Reservation</p>
          <h1 className="text-3xl md:text-4xl font-thin tracking-[0.2em]">BOOK YOUR STAY</h1>
        </div>

        {loading && <p className="text-center text-[#71867e] py-20">Loading...</p>}
        {!loading && error && !room && <p className="text-center text-red-500 py-20">{error}</p>}

        {room && (
          <div className="grid md:grid-cols-2 gap-12">

            {/* Room Summary */}
            <div>
              <div className="relative h-64 overflow-hidden mb-5">
                <img src={img} alt={room.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute top-4 left-4 px-3 py-1 text-xs font-semibold tracking-wide capitalize bg-[#1c352c] text-white">
                  {room.room_type}
                </div>
              </div>
              <h2 className="text-xl font-light tracking-[0.2em] mb-1">{room.name}</h2>
              <p className="text-xs text-[#71867e] mb-4">Room {room.room_number} · Floor {room.floor} · Up to {room.capacity} guests</p>
              <div className="text-2xl font-light mb-4">
                ₱{Number(room.price_per_night).toLocaleString()}
                <span className="text-sm text-[#71867e] font-normal"> / night</span>
              </div>
              <div className="mb-6 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-emerald-700">Food Benefit</p>
                <p>Breakfast is included for the first {freeFoodGuests} guest{freeFoodGuests > 1 ? "s" : ""}.</p>
                <p className="mt-1">Each extra guest adds PHP {extraGuestFeePerNight.toLocaleString()} per night to the room bill.</p>
                <p className="mt-1">Lunch adds PHP {lunchRate.toLocaleString()} per guest per night. Dinner adds PHP {dinnerRate.toLocaleString()} per guest per night.</p>
                <p className="mt-1">If you choose both, both lunch and dinner rates will apply.</p>
              </div>
              {room.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {room.amenities.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-1" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{a}</span>
                  ))}
                </div>
              )}

              {/* Price Summary */}
              {nights > 0 && (
                <div className="p-4 border border-[#d4d7c7]">
                  <p className="text-xs tracking-widest text-[#71867e] mb-3">PRICE SUMMARY</p>
                  <div className="flex justify-between text-sm mb-1">
                    <span>₱{Number(room.price_per_night).toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}</span>
                    <span>₱{baseTotal.toLocaleString()}</span>
                  </div>
                  {extraGuestFeeTotal > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        Extra guest fee (PHP {extraGuestFeePerNight.toLocaleString()} x {extraGuestCount} guest{extraGuestCount > 1 ? "s" : ""} x {nights} night{nights > 1 ? "s" : ""})
                      </span>
                      <span>{extraGuestFeeTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-1 text-[#4a6358]">
                    <span>Free food included</span>
                    <span>{Math.min(guests, freeFoodGuests)} guest{Math.min(guests, freeFoodGuests) > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1 text-[#4a6358]">
                    <span>Meal category</span>
                    <span className="capitalize">{mealCategory}</span>
                  </div>
                  {mealAddonTotal > 0 && (
                    <div className="flex justify-between text-sm mb-1 text-[#4a6358]">
                      <span>
                        Meal add-on for {mealCategory}
                      </span>
                      <span>₱{mealAddonTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 mb-1">
                      <span>Promo ({promoApplied} — {promoDiscount}% off)</span>
                      <span>−₱{discountAmt.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base border-t border-[#d4d7c7] pt-2 mt-2">
                    <span>Total</span>
                    <span>₱{finalTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Form */}
            <div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label className={labelCls}>CHECK-IN DATE</label>
                  <input type="date" value={checkIn} onChange={e => {
                    const selectedDate = e.target.value;
                    if (isDateUnavailable(selectedDate)) {
                      setToast({
                        message: "This date is not available for booking. Please select another date.",
                        type: 'warning'
                      });
                      setTimeout(() => setToast(null), 4000);
                      return;
                    }
                    setCheckIn(selectedDate);
                  }}
                    min={new Date().toISOString().split("T")[0]} className={inputCls} required />
                  <p className="mt-2 text-xs text-[#71867e]">Choose your check-in date. Unavailable dates will show a warning.</p>
                </div>
                <div>
                  <label className={labelCls}>CHECK-IN TIME</label>
                  <select value={checkInTime} onChange={e => setCheckInTime(e.target.value as (typeof CHECK_IN_TIME_OPTIONS)[number])} className={inputCls} required>
                    {CHECK_IN_TIME_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>CHECK-OUT DATE</label>
                  <input type="date" value={checkOut} onChange={e => {
                    const selectedDate = e.target.value;
                    if (isDateUnavailable(selectedDate)) {
                      setToast({
                        message: "This date is not available for booking. Please select another date.",
                        type: 'warning'
                      });
                      setTimeout(() => setToast(null), 4000);
                      return;
                    }
                    setCheckOut(selectedDate);
                  }}
                    min={checkIn || new Date().toISOString().split("T")[0]} className={inputCls} required />
                  <p className="mt-2 text-xs text-[#71867e]">Choose your check-out date. Unavailable dates will show a warning.</p>
                </div>
                <div>
                  <label className={labelCls}>CHECK-OUT TIME</label>
                  <select value={checkOutTime} onChange={e => setCheckOutTime(e.target.value as (typeof CHECK_OUT_TIME_OPTIONS)[number])} className={inputCls} required>
                    {CHECK_OUT_TIME_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>NUMBER OF GUESTS</label>
                  <input
                    type="number"
                    min={1}
                    max={room.capacity}
                    step={1}
                    inputMode="numeric"
                    value={guests}
                    onChange={e => setGuests(Math.max(1, Math.min(room.capacity, Number(e.target.value) || 1)))}
                    className={inputCls}
                    required
                  />
                  <p className="mt-2 text-xs text-[#71867e]">
                    First {freeFoodGuests} guest{freeFoodGuests > 1 ? "s" : ""} get complimentary food. Extra guests add room charges and are not included in the free food benefit.
                  </p>
                  {extraGuestCount > 0 && (
                    <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      <p className="font-medium">Additional guest fee will be added.</p>
                      <p className="mt-1">
                        You have {extraGuestCount} extra guest{extraGuestCount > 1 ? "s" : ""}. An extra room fee of PHP {extraGuestFeePerNight.toLocaleString()} per guest per night will be charged.
                      </p>
                      <label className="mt-3 flex items-start gap-2 text-[11px] leading-5">
                        <input
                          type="checkbox"
                          checked={agreeExtraFee}
                          onChange={e => setAgreeExtraFee(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>I understand and agree to the additional guest fee for this booking.</span>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls}>MEAL CATEGORY</label>
                  <select value={mealCategory} onChange={e => setMealCategory(e.target.value)} className={inputCls} required>
                    {/* <option value="breakfast">Breakfast</option> */}
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="both">Both</option>
                  </select>
                  <p className="mt-2 text-xs text-[#71867e]">
                    Breakfast is free. Lunch adds PHP {lunchRate.toLocaleString()} per guest per night, dinner adds PHP {dinnerRate.toLocaleString()} per guest per night, and both includes both meal rates.
                  </p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className={labelCls}>PAYMENT METHOD</label>
                  <select value={payMethod} onChange={e => { setPayMethod(e.target.value); setPayReference(""); setPayAmount(""); }} className={inputCls} required>
                    <option value="cash">Cash on Arrival</option>
                    <option value="gcash">GCash</option>
                  </select>
                </div>

                {payMethod === "gcash" && (
                  <div className="rounded-sm border border-[#d4d7c7] bg-[#faf9f6] p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#71867e]">GCash Payment Details</p>
                    <p className="mt-2 text-sm text-[#1c352c]">{GCASH_COMPANY_NAME}</p>
                    <p className="mt-1 text-lg font-semibold tracking-[0.12em] text-[#1c352c]">{GCASH_COMPANY_NUMBER}</p>
                    <p className="mt-2 text-xs text-[#71867e]">
                      Send your payment to the number above, then enter the GCash reference number below.
                    </p>
                    <label className={labelCls}>GCASH REFERENCE NUMBER</label>
                    <input type="text" value={payReference} onChange={e => setPayReference(e.target.value)}
                      placeholder="Enter GCash reference number" className={inputCls} required />
                    <label className={`${labelCls} mt-4`}>AMOUNT SENT</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      placeholder="Enter amount you sent"
                      className={inputCls}
                      required
                    />
                    <p className="mt-2 text-xs text-[#71867e]">
                      Enter the exact amount you transferred so staff and admin can verify it.
                    </p>
                  </div>
                )}
                {payMethod === "card" && (
                  <div>
                    <label className={labelCls}>CARD REFERENCE / LAST 4 DIGITS</label>
                    <input type="text" value={payReference} onChange={e => setPayReference(e.target.value)}
                      placeholder="e.g. 4242" className={inputCls} />
                  </div>
                )}

                {error && <p className="text-xs text-red-500 tracking-wide">{error}</p>}
                {success && <p className="text-xs text-green-600 tracking-wide">{success}</p>}

                {/* Confirm Booking Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-xs font-semibold tracking-[0.2em] text-white bg-[#1c352c] transition hover:bg-[#132222] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "SUBMITTING..." : "CONFIRM BOOKING"}
                </button>

                {success && (
                  <p className="text-center text-xs text-[#71867e] tracking-widest">Redirecting to Men Food...</p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
