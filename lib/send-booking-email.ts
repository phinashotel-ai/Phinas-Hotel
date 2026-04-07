import type { BookingEmailPayload } from "./booking-email";

export async function sendBookingEmail(payload: BookingEmailPayload) {
  const res = await fetch("/email/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to send booking email.");
  }
}
