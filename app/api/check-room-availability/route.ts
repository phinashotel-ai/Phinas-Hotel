import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL;

export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json();
    
    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, checkIn, checkOut' },
        { status: 400 }
      );
    }

    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Check room availability with backend
    const response = await fetch(`${API}/hotelroom/rooms/${roomId}/check-availability/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        check_in: checkIn,
        check_out: checkOut,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.detail || 'Failed to check availability' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Room availability check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}