import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { getBookingEmailContent, type BookingEmailPayload } from "../../../lib/booking-email";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingEmailPayload;

    if (!payload?.booking?.user_email || !payload?.booking?.id || !payload?.status) {
      return NextResponse.json({ error: "Missing booking email payload." }, { status: 400 });
    }

    const host = getRequiredEnv("SMTP_HOST");
    const port = Number(process.env.SMTP_PORT || 587);
    const user = getRequiredEnv("SMTP_USER");
    const pass = getRequiredEnv("SMTP_PASS");
    const from = process.env.SMTP_FROM || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const message = getBookingEmailContent(payload);

    await transporter.sendMail({
      from,
      to: payload.booking.user_email,
      subject: message.subject,
      text: message.text,
    });

    return NextResponse.json({ message: "Email sent." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
