"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { apiClient, Room, Booking } from "../lib/api";

export default function RoomDetailsWithBackend() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{email: string; name: string} | null>(null);
  
  // Booking form state
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{available: boolean; message: string; nextAvailableDate?: string; conflictingBooking?: any} | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: dates, 2: payment, 3: confirmation
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  
  // Room data from backend
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load room data on component mount
  useEffect(() => {
    const loadRoom = async () => {
      try {
        setLoading(true);
        // For demo purposes, loading room ID 1. In real app, get from URL params
        const response = await apiClient.getRoomDetails(1);
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setRoom(response.data);
        }
      } catch (err) {
        setError('Failed to load room details');
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsLoggedIn(true);
      // In real app, you'd validate the token and get user info
      setUser({ email: 'user@example.com', name: 'Current User' });
    }
  }, []);

  // Helper functions
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    if (!room) return { nights: 0, subtotal: 0, tax: 0, total: 0 };
    
    const nights = calculateNights(checkIn, checkOut);
    const subtotal = nights * room.price_per_night;
    const tax = subtotal * 0.12; // 12% tax
    return {
      nights,
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  // Real availability checking using backend API
  const checkAvailability = async () => {
    if (!room || !checkIn || !checkOut || guests < 1) {
      alert("Please fill in all booking details");
      return;
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      alert("Check-out date must be after check-in date");
      return;
    }

    if (guests > room.capacity) {
      alert(`Maximum ${room.capacity} guests allowed for this room`);
      return;
    }

    setIsCheckingAvailability(true);
    
    try {
      const response = await apiClient.checkRoomAvailability(room.id, checkIn, checkOut);
      
      if (response.error) {
        setAvailabilityResult({
          available: false,
          message: `❌ ${response.error}`
        });
      } else if (response.data) {
        if (response.data.available) {
          setAvailabilityResult({
            available: true,
            message: "✅ Room is available for your selected dates!"
          });
        } else {
          setAvailabilityResult({
            available: false,
            message: `❌ ${response.data.message}`
          });
        }
      }
    } catch (error) {
      setAvailabilityResult({
        available: false,
        message: "❌ Error checking availability. Please try again."
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      if (response.error) {
        alert(response.error);
      } else if (response.data) {
        setUser({ email, name: response.data.user.name || 'User' });
        setIsLoggedIn(true);
        setShowAuth(false);
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.register(name, email, password);
      if (response.error) {
        alert(response.error);
      } else if (response.data) {
        setUser({ email, name });
        setIsLoggedIn(true);
        setShowAuth(false);
      }
    } catch (error) {
      alert('Registration failed. Please try again.');
    }
  };

  const proceedToPayment = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    if (!availabilityResult?.available) {
      alert("Please check availability first");
      return;
    }
    setBookingStep(2);
  };

  const processPayment = async () => {
    if (!room || !user) return;
    
    setIsProcessingBooking(true);
    
    try {
      const bookingData = {
        room: room.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        meal_category: 'breakfast',
        payment_method: 'cash' as const,
        special_requests: '',
      };
      
      const response = await apiClient.createBooking(bookingData);
      
      if (response.error) {
        alert(response.error);
        setBookingStep(1);
        setAvailabilityResult(null);
      } else if (response.data) {
        const confirmation = {
          bookingId: response.data.reference_number,
          room: room.name,
          checkIn,
          checkOut,
          guests,
          total: response.data.total_price,
          guest: user.name,
          email: user.email,
          bookingDate: new Date().toLocaleDateString()
        };
        
        setBookingConfirmation(confirmation);
        setBookingStep(3);
      }
    } catch (error) {
      alert('Booking failed. Please try again.');
      setBookingStep(1);
    } finally {
      setIsProcessingBooking(false);
    }
  };

  const resetBooking = () => {
    setShowBooking(false);
    setBookingStep(1);
    setAvailabilityResult(null);
    setBookingConfirmation(null);
    setCheckIn("");
    setCheckOut("");
    setGuests(1);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-black text-zinc-800 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-800 dark:border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading room details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-black text-zinc-800 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{error || 'Room not found'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black text-zinc-800 dark:text-white relative">

      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 w-full z-20 flex justify-between items-center px-10 py-6 text-white">
        <h1 className="text-2xl font-bold tracking-wide">
          PHINAS HOTEL
        </h1>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowAuth(true);
              setIsLogin(true);
            }}
            className="px-5 py-2 rounded-full border border-white hover:bg-white hover:text-black transition"
          >
            Login
          </button>

          <button
            onClick={() => {
              setShowAuth(true);
              setIsLogin(false);
            }}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center">

        <Image
          src="/che.jpg"
          alt="PHINAS HOTEL"
          fill
          priority
          className="object-cover brightness-50"
        />

        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">
            PHINAS HOTEL
          </h1>

          <p className="text-lg md:text-xl text-zinc-200 max-w-xl mx-auto">
            Experience comfort and unforgettable moments.
          </p>
        </div>
      </section>

      {/* ROOM DETAILS SECTION */}
      <section className="py-20 px-8 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto">

          <h2 className="text-4xl font-bold mb-10 text-center">
            Room Details
          </h2>

          <div className="grid md:grid-cols-2 gap-10">

            {/* Room Images */}
            <div className="grid grid-cols-2 gap-4">
              {["/che.jpg", "/che.jpg", "/che.jpg"].map((img, index) => (
                <div key={index} className="relative h-48 rounded-2xl overflow-hidden">
                  <Image
                    src={img}
                    alt="Room Image"
                    fill
                    className="object-cover hover:scale-110 transition duration-500"
                  />
                </div>
              ))}
            </div>

            {/* Room Info */}
            <div className="flex flex-col gap-6">

              <h3 className="text-3xl font-semibold">{room.name}</h3>

              <p className="text-zinc-600 dark:text-zinc-300">
                {room.description}
              </p>

              {/* Amenities */}
              <div>
                <h4 className="font-semibold mb-2">Amenities:</h4>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {room.amenities.map((amenity, index) => (
                    <li
                      key={index}
                      className="bg-zinc-200 dark:bg-zinc-800 px-3 py-2 rounded-lg"
                    >
                      ✓ {amenity}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price */}
              <div className="text-2xl font-bold">
                ₱{room.price_per_night.toLocaleString()} / night
              </div>

              {/* Availability */}
              <div>
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-500 text-white">
                  Check availability for your dates
                </span>
              </div>

              <button 
                onClick={() => setShowBooking(true)}
                className="mt-4 p-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
              >
                Book Now
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* AUTH MODAL */}
      {showAuth && (
        <AuthModal 
          isLogin={isLogin}
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
        />
      )}

      {/* BOOKING MODAL */}
      {showBooking && (
        <BookingModal 
          room={room}
          bookingStep={bookingStep}
          checkIn={checkIn}
          setCheckIn={setCheckIn}
          checkOut={checkOut}
          setCheckOut={setCheckOut}
          guests={guests}
          setGuests={setGuests}
          isCheckingAvailability={isCheckingAvailability}
          availabilityResult={availabilityResult}
          bookingConfirmation={bookingConfirmation}
          calculateTotal={calculateTotal}
          getTodayDate={getTodayDate}
          getTomorrowDate={getTomorrowDate}
          onClose={resetBooking}
          onCheckAvailability={checkAvailability}
          onProceedToPayment={proceedToPayment}
          onProcessPayment={processPayment}
          isLoggedIn={isLoggedIn}
          user={user}
          isProcessingBooking={isProcessingBooking}
        />
      )}
    </div>
  );
}

// Auth Modal Component
function AuthModal({ isLogin, onClose, onLogin, onSignUp }: {
  isLogin: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onSignUp: (name: string, email: string, password: string) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(formData.email, formData.password);
    } else {
      onSignUp(formData.name, formData.email, formData.password);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white/20 backdrop-blur-2xl border border-white/30 p-10 rounded-3xl w-[400px] text-white relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-5 text-xl">
          ✕
        </button>

        <h2 className="text-3xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="p-3 rounded-xl bg-white/80 text-black outline-none"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="p-3 rounded-xl bg-white/80 text-black outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="p-3 rounded-xl bg-white/80 text-black outline-none"
            required
          />

          <button 
            type="submit"
            className="mt-4 p-3 rounded-xl bg-black text-white font-semibold hover:bg-zinc-800 transition"
          >
            {isLogin ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Booking Modal Component
function BookingModal({ 
  room, bookingStep, checkIn, setCheckIn, checkOut, setCheckOut, 
  guests, setGuests, isCheckingAvailability, availabilityResult, 
  bookingConfirmation, calculateTotal, getTodayDate, getTomorrowDate,
  onClose, onCheckAvailability, onProceedToPayment, onProcessPayment,
  isLoggedIn, user, isProcessingBooking
}: {
  room: Room;
  bookingStep: number;
  checkIn: string;
  setCheckIn: (value: string) => void;
  checkOut: string;
  setCheckOut: (value: string) => void;
  guests: number;
  setGuests: (value: number) => void;
  isCheckingAvailability: boolean;
  availabilityResult: {available: boolean; message: string; nextAvailableDate?: string; conflictingBooking?: any} | null;
  bookingConfirmation: any;
  calculateTotal: () => any;
  getTodayDate: () => string;
  getTomorrowDate: () => string;
  onClose: () => void;
  onCheckAvailability: () => void;
  onProceedToPayment: () => void;
  onProcessPayment: () => void;
  isLoggedIn: boolean;
  user: {email: string; name: string} | null;
  isProcessingBooking: boolean;
}) {
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: ""
  });

  const total = calculateTotal();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-5 text-xl z-10">
          ✕
        </button>

        <div className="p-8">
          {/* Step 1: Date Selection & Availability */}
          {bookingStep === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Book Your Stay</h2>
              
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl mb-6">
                <h3 className="font-semibold mb-2">{room.name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">₱{room.price_per_night.toLocaleString()} per night</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Check-in Date</label>
                  <input
                    type="date"
                    value={checkIn}
                    min={getTodayDate()}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Check-out Date</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || getTomorrowDate()}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Number of Guests</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value))}
                  className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                >
                  {[...Array(room.capacity)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} Guest{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {total.nights > 0 && (
                <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl mb-6">
                  <h4 className="font-semibold mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{total.nights} night{total.nights > 1 ? 's' : ''} × ₱{room.price_per_night.toLocaleString()}</span>
                      <span>₱{total.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (12%)</span>
                      <span>₱{total.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total</span>
                      <span>₱{total.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={onCheckAvailability}
                disabled={isCheckingAvailability || !checkIn || !checkOut}
                className="w-full p-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 mb-4"
              >
                {isCheckingAvailability ? "Checking Availability..." : "Check Availability"}
              </button>

              {availabilityResult && (
                <div className={`p-4 rounded-xl mb-4 ${
                  availabilityResult.available 
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                }`}>
                  <p className="font-semibold mb-2">{availabilityResult.message}</p>
                </div>
              )}

              {availabilityResult?.available && (
                <button
                  onClick={onProceedToPayment}
                  className="w-full p-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {isLoggedIn ? "Proceed to Payment" : "Login to Continue"}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Payment */}
          {bookingStep === 2 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Payment Details</h2>
              
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl mb-6">
                <h4 className="font-semibold mb-2">Booking Summary</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Room:</strong> {room.name}</p>
                  <p><strong>Dates:</strong> {checkIn} to {checkOut}</p>
                  <p><strong>Guests:</strong> {guests}</p>
                  <p><strong>Total:</strong> ₱{total.total.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={paymentData.cardNumber}
                    onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={paymentData.expiryDate}
                      onChange={(e) => setPaymentData({...paymentData, expiryDate: e.target.value})}
                      className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={paymentData.cvv}
                      onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value})}
                      className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={paymentData.cardName}
                    onChange={(e) => setPaymentData({...paymentData, cardName: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
              </div>

              <button
                onClick={onProcessPayment}
                disabled={isProcessingBooking}
                className="w-full p-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessingBooking ? 'Processing...' : `Complete Booking - ₱${total.total.toLocaleString()}`}
              </button>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {bookingStep === 3 && bookingConfirmation && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold mb-6 text-green-600">Booking Confirmed!</h2>
              
              <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-xl mb-6 text-left">
                <h4 className="font-semibold mb-4">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Booking ID:</strong> {bookingConfirmation.bookingId}</p>
                  <p><strong>Guest:</strong> {bookingConfirmation.guest}</p>
                  <p><strong>Email:</strong> {bookingConfirmation.email}</p>
                  <p><strong>Room:</strong> {bookingConfirmation.room}</p>
                  <p><strong>Check-in:</strong> {bookingConfirmation.checkIn}</p>
                  <p><strong>Check-out:</strong> {bookingConfirmation.checkOut}</p>
                  <p><strong>Guests:</strong> {bookingConfirmation.guests}</p>
                  <p><strong>Total Paid:</strong> ₱{bookingConfirmation.total.toLocaleString()}</p>
                  <p><strong>Booking Date:</strong> {bookingConfirmation.bookingDate}</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                A confirmation email has been sent to {user?.email}
              </p>

              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}