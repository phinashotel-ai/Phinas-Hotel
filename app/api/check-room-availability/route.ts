import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('room_id');
  const checkIn = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Missing required parameters: room_id, check_in, check_out' },
      { status: 400 }
    );
  }

  try {
    // First, get room details to check if it exists and get booking info
    const roomResponse = await fetch(`${DJANGO_API_URL}/hotelroom/rooms/${roomId}/`);
    
    if (!roomResponse.ok) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomData = await roomResponse.json();
    
    // Check if room is under maintenance
    if (roomData.status === 'maintenance') {
      return NextResponse.json({
        available: false,
        message: 'This room is currently under maintenance and cannot be booked.'
      });
    }

    // Get booked ranges from room details
    const conflictingBookings = roomData.booked_ranges || [];
    
    // Check if the requested dates overlap with any existing bookings
    const requestedCheckIn = new Date(checkIn);
    const requestedCheckOut = new Date(checkOut);
    
    const hasConflict = conflictingBookings.some((booking: any) => {
      const bookingCheckIn = new Date(booking.check_in);
      const bookingCheckOut = new Date(booking.check_out);
      
      // Check for date overlap: booking conflicts if:
      // requested check-in is before booking check-out AND
      // requested check-out is after booking check-in
      return requestedCheckIn < bookingCheckOut && requestedCheckOut > bookingCheckIn;
    });

    if (hasConflict) {
      const conflictMessage = `Room is already booked during your selected dates. Existing bookings: ${conflictingBookings.map((b: any) => `${b.check_in} to ${b.check_out}`).join(', ')}`;
      
      return NextResponse.json({
        available: false,
        message: conflictMessage,
        conflicting_bookings: conflictingBookings
      });
    }

    // Room is available
    return NextResponse.json({
      available: true,
      message: 'Room is available for your selected dates!'
    });
    
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}