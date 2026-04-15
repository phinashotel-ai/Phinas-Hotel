import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { type, message, roomId } = await request.json();

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
      subject: 'Booking Confirmation Request - Phinas Hotel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1c352c;">Booking Confirmation Request</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Message:</strong> ${message}</p>
          ${roomId ? `<p><strong>Room ID:</strong> ${roomId}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f7f4ee; border-left: 4px solid #1c352c;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please check the admin dashboard to confirm this booking request.</p>
          </div>
          
          <hr style="margin: 20px 0;">
          <p style="color: #71867e; font-size: 12px;">
            This is an automated notification from Phinas Hotel booking system.
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