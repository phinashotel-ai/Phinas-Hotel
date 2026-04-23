const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Room {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: number;
  capacity: number;
  description: string;
  amenities: string[];
  image_url?: string;
  room_image?: string;
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  max_bookings: number;
  booked_ranges?: Array<{
    check_in: string;
    check_out: string;
  }>;
}

export interface BookingRequest {
  room: number;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  guests: number;
  meal_category?: string;
  special_requests?: string;
  promo_code?: string;
  payment_method: 'cash' | 'gcash' | 'card';
  payment_reference?: string;
  payment_amount?: string;
}

export interface Booking {
  id: number;
  user: number;
  room: Room;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  guests: number;
  meal_category: string;
  total_price: number;
  status: string;
  reference_number: string;
  created_at: string;
  special_requests?: string;
  promo_code?: string;
  discount_amount: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || data.message || 'An error occurred' };
      }

      return { data };
    } catch (error) {
      return { error: 'Network error occurred' };
    }
  }

  // Room endpoints
  async getRooms(params?: {
    type?: string;
    capacity?: number;
    min_price?: number;
    max_price?: number;
    status?: string;
    check_in?: string;
    check_out?: string;
  }): Promise<ApiResponse<Room[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/hotelroom/rooms/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Room[]>(endpoint);
  }

  async getRoomDetails(roomId: number): Promise<ApiResponse<Room>> {
    return this.request<Room>(`/hotelroom/rooms/${roomId}/`);
  }

  // Booking endpoints
  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking>> {
    return this.request<Booking>('/hotelroom/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getMyBookings(): Promise<ApiResponse<Booking[]>> {
    return this.request<Booking[]>('/hotelroom/bookings/');
  }

  async getBookingDetails(bookingId: number): Promise<ApiResponse<Booking>> {
    return this.request<Booking>(`/hotelroom/bookings/${bookingId}/`);
  }

  // Check room availability
  async checkRoomAvailability(
    roomId: number,
    checkIn: string,
    checkOut: string
  ): Promise<ApiResponse<{ available: boolean; message: string; conflicting_bookings?: any[] }>> {
    const params = new URLSearchParams({
      room_id: roomId.toString(),
      check_in: checkIn,
      check_out: checkOut,
    });
    
    return this.request<{ available: boolean; message: string; conflicting_bookings?: any[] }>(
      `/hotelroom/check-availability/?${params.toString()}`
    );
  }

  // Promo code validation
  async validatePromoCode(code: string): Promise<ApiResponse<{ code: string; discount_percent: number }>> {
    return this.request<{ code: string; discount_percent: number }>('/hotelroom/promo-validate/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Auth endpoints (if you have them)
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.request<{ token: string; user: any }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.data?.token) {
      this.setToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
    }
    
    return response;
  }

  async register(name: string, email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.request<{ token: string; user: any }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    if (response.data?.token) {
      this.setToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
    }
    
    return response;
  }

  async logout(): Promise<void> {
    this.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request<any>('/user/profile/');
  }
}

export const apiClient = new ApiClient();