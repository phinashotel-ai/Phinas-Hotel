import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

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
    // First, get room details to check if it exists
    const roomResponse = await fetch(`${DJANGO_API_URL}/hotelroom/rooms/${roomId}/`);
    
    if (!roomResponse.ok) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const room = await roomResponse.json();

    // Check availability by querying rooms with date filters
    const availabilityResponse = await fetch(
      `${DJANGO_API_URL}/hotelroom/rooms/?check_in=${checkIn}&check_out=${checkOut}`
    );

    if (!availabilityResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    const availableRooms = await availabilityResponse.json();
    const isAvailable = availableRooms.some((r: any) => r.id === parseInt(roomId));

    if (isAvailable) {
      return NextResponse.json({
        available: true,
        message: 'Room is available for your selected dates!'
      });
    } else {
      // Get booked ranges to show conflict details
      const roomDetails = await fetch(`${DJANGO_API_URL}/hotelroom/rooms/${roomId}/`);
      const roomData = await roomDetails.json();
      
      const conflictingBookings = roomData.booked_ranges || [];
      const conflictMessage = conflictingBookings.length > 0 
        ? `Room is already booked during your selected dates. Existing bookings: ${conflictingBookings.map((b: any) => `${b.check_in} to ${b.check_out}`).join(', ')}`
        : 'Room is not available for the selected dates.';

      return NextResponse.json({
        available: false,
        message: conflictMessage,
        conflicting_bookings: conflictingBookings
      });
    }
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}