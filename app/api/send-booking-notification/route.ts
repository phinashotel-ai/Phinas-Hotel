import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { type, message, roomId, bookingId } = await request.json();

    // Create transporter for frontend nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAILER_GMAIL_USER,
        pass: process.env.MAILER_GMAIL_APP_PASSWORD,
      },
    });

    // Email content for frontend notification
    const mailOptions = {
      from: `${process.env.MAILER_FROM_NAME} <${process.env.MAILER_FROM_EMAIL}>`,
      to: process.env.MAILER_GMAIL_USER, // Send to admin
      subject: 'New Booking Created - Action Required - Phinas Hotel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1c352c;">🏨 New Booking Created - Confirmation Required</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Message:</strong> ${message}</p>
          ${bookingId ? `<p><strong>Booking ID:</strong> #${bookingId}</p>` : ''}
          ${roomId ? `<p><strong>Room ID:</strong> ${roomId}</p>` : ''}
          <p><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f7f4ee; border-left: 4px solid #1c352c;">
            <p style="margin: 0; font-weight: bold; color: #1c352c;">⚡ Action Required:</p>
            <p style="margin: 5px 0 0 0;">A new booking has been created and is waiting for your confirmation. Please:</p>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Go to the Admin Dashboard</li>
              <li>Navigate to the Bookings tab</li>
              <li>Find Booking #${bookingId || 'N/A'} with status "pending"</li>
              <li>Click "CONFIRM" to approve the booking</li>
            </ol>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e8; border-left: 4px solid #4caf50;">
            <p style="margin: 0; font-weight: bold; color: #2e7d32;">📧 What happens next:</p>
            <p style="margin: 5px 0 0 0;">When you click "CONFIRM" in the admin dashboard, the backend nodemailer will automatically send a confirmation email to the customer.</p>
          </div>
          
          <hr style="margin: 20px 0;">
          <p style="color: #71867e; font-size: 12px;">
            This is an automated notification from Phinas Hotel booking system.<br>
            Frontend Nodemailer → Admin Notification
          </p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Booking notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending booking notification:', error);
    return NextResponse.json(
      { error: 'Failed to send booking notification' },
      { status: 500 }
    );
  }
}