export type BookingEmailStatus = "pending" | "confirmed";

export interface BookingEmailPayload {
  status: BookingEmailStatus;
  booking: {
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
    total_price: string | number;
    meal_addon_total?: string | number;
    promo_code?: string;
    discount_amount?: string | number;
    status?: string;
    payment?: {
      method?: string;
      reference_number?: string | null;
      sent_amount?: string | number | null;
      amount?: string | number;
      status?: string;
    } | null;
  };
}

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMeal(mealCategory: string) {
  if (!mealCategory) return "N/A";
  return mealCategory.replace(/^./, char => char.toUpperCase());
}

function getGuestName(payload: BookingEmailPayload["booking"]) {
  return payload.user_first_name || payload.user_name || "Guest";
}

export function getBookingEmailContent(payload: BookingEmailPayload) {
  const { booking, status } = payload;
  const guestName = getGuestName(booking);
  const paymentMethod = booking.payment?.method || "N/A";
  const paymentReference = booking.payment?.reference_number || booking.reference_number || "N/A";
  const nights = Math.max(
    0,
    Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
    )
  );

  if (status === "pending") {
    return {
      subject: `Booking Received - Phinas Hotel (#${booking.id})`,
      text: [
        `Dear ${guestName},`,
        "",
        "Your booking request has been received and is now waiting for staff/admin confirmation.",
        "",
        `Booking ID: #${booking.id}`,
        `Reference Number: ${booking.reference_number || "N/A"}`,
        `Room: ${booking.room_name} (#${booking.room_number})`,
        `Check-in: ${booking.check_in} at ${booking.check_in_time || "2:00 PM"}`,
        `Check-out: ${booking.check_out} at ${booking.check_out_time || "12:00 PM"}`,
        `Guests: ${booking.guests}`,
        `Meal: ${formatMeal(booking.meal_category)}`,
        `Payment Method: ${paymentMethod}`,
        `Payment Reference: ${paymentReference}`,
        `Total: ${formatCurrency(booking.total_price)}`,
        "",
        "We will send your full confirmed booking details after the staff/admin team approves your reservation.",
        "Please keep your reference number for follow-up and verification.",
        "",
        "Thank you for choosing Phinas Hotel!",
        "For inquiries: phinashotel@gmail.com",
      ].join("\n"),
    };
  }

  return {
    subject: `Booking Confirmed - Phinas Hotel (#${booking.id})`,
    text: [
      `Dear ${guestName},`,
      "",
      "Your booking has been confirmed by our staff/admin team.",
      "",
      `Booking ID: #${booking.id}`,
      `Reference Number: ${booking.reference_number || "N/A"}`,
      `Room: ${booking.room_name} (#${booking.room_number})`,
      `Check-in: ${booking.check_in} at ${booking.check_in_time || "2:00 PM"}`,
      `Check-out: ${booking.check_out} at ${booking.check_out_time || "12:00 PM"}`,
      `Nights: ${nights}`,
      `Guests: ${booking.guests}`,
      `Meal: ${formatMeal(booking.meal_category)}`,
      `Status: ${booking.status || "confirmed"}`,
      `Payment Method: ${paymentMethod}`,
      `Payment Reference: ${paymentReference}`,
      booking.payment?.sent_amount ? `Amount Sent: ${formatCurrency(booking.payment.sent_amount)}` : "",
      booking.meal_addon_total ? `Meal Add-on: ${formatCurrency(booking.meal_addon_total)}` : "",
      booking.promo_code ? `Promo Code: ${booking.promo_code} (saved ${formatCurrency(booking.discount_amount)})` : "",
      `Total: ${formatCurrency(booking.total_price)}`,
      "",
      "Please keep this email for check-in verification.",
      "Present your reference number to the staff when you arrive.",
      "",
      "Thank you for choosing Phinas Hotel!",
      "For inquiries: phinashotel@gmail.com",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
