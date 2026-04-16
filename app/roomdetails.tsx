"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
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
  
  // Room booking state - simulates database
  const [existingBookings, setExistingBookings] = useState([
    {
      id: "BK001",
      roomId: "deluxe-ocean-001",
      checkIn: "2024-12-25",
      checkOut: "2024-12-28",
      guest: "Alice Johnson",
      status: "confirmed" // confirmed, checked-in, checked-out, cancelled
    },
    {
      id: "BK002", 
      roomId: "deluxe-ocean-001",
      checkIn: "2024-12-30",
      checkOut: "2025-01-02",
      guest: "Bob Smith",
      status: "confirmed"
    }
  ]);

  const room = {
    id: "deluxe-ocean-001",
    name: "Deluxe Ocean View Room",
    description:
      "Enjoy luxury and comfort in our Deluxe Ocean View Room featuring a private balcony, modern interior design, and breathtaking sea views.",
    price: 4500,
    maxGuests: 4,
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "Flat-screen TV",
      "Mini Bar",
      "Private Balcony",
      "Hot & Cold Shower",
    ],
    images: ["/che.jpg", "/che.jpg", "/che.jpg"],
  };

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
    const nights = calculateNights(checkIn, checkOut);
    const subtotal = nights * room.price;
    const tax = subtotal * 0.12; // 12% tax
    return {
      nights,
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  // Booking availability functions
  const isDateRangeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);
    
    return startDate1 < endDate2 && startDate2 < endDate1;
  };

  const checkRoomAvailability = (roomId: string, checkInDate: string, checkOutDate: string) => {
    const activeBookings = existingBookings.filter(booking => 
      booking.roomId === roomId && 
      (booking.status === 'confirmed' || booking.status === 'checked-in')
    );

    const conflictingBookings = activeBookings.filter(booking =>
      isDateRangeOverlapping(checkInDate, checkOutDate, booking.checkIn, booking.checkOut)
    );

    return {
      available: conflictingBookings.length === 0,
      conflictingBookings,
      nextAvailableDate: getNextAvailableDate(roomId, checkOutDate)
    };
  };

  const getNextAvailableDate = (roomId: string, preferredDate: string) => {
    const activeBookings = existingBookings
      .filter(booking => 
        booking.roomId === roomId && 
        (booking.status === 'confirmed' || booking.status === 'checked-in') &&
        new Date(booking.checkOut) > new Date(preferredDate)
      )
      .sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime());

    if (activeBookings.length === 0) {
      return preferredDate;
    }

    return activeBookings[0].checkOut;
  };

  const addNewBooking = (bookingData: any) => {
    const newBooking = {
      id: `BK${Date.now()}`,
      roomId: room.id,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guest: bookingData.guest,
      email: bookingData.email,
      guests: bookingData.guests,
      status: 'confirmed',
      bookingDate: new Date().toISOString(),
      total: bookingData.total
    };
    
    setExistingBookings(prev => [...prev, newBooking]);
    return newBooking;
  };
  // Booking functions
  const checkAvailability = async () => {
    if (!checkIn || !checkOut || guests < 1) {
      alert("Please fill in all booking details");
      return;
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      alert("Check-out date must be after check-in date");
      return;
    }

    if (guests > room.maxGuests) {
      alert(`Maximum ${room.maxGuests} guests allowed for this room`);
      return;
    }

    setIsCheckingAvailability(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const availability = checkRoomAvailability(room.id, checkIn, checkOut);
      
      if (availability.available) {
        setAvailabilityResult({
          available: true,
          message: "✅ Room is available for your selected dates!"
        });
      } else {
        const conflictingBooking = availability.conflictingBookings[0];
        const nextAvailable = availability.nextAvailableDate;
        
        setAvailabilityResult({
          available: false,
          message: `❌ Room is already booked from ${conflictingBooking.checkIn} to ${conflictingBooking.checkOut} by ${conflictingBooking.guest}. Next available date: ${nextAvailable}`,
          nextAvailableDate: nextAvailable,
          conflictingBooking
        });
      }
      
      setIsCheckingAvailability(false);
    }, 1500);
  };

  const handleLogin = (email: string, password: string) => {
    // Simulate login
    setUser({ email, name: "John Doe" });
    setIsLoggedIn(true);
    setShowAuth(false);
  };

  const handleSignUp = (name: string, email: string, password: string) => {
    // Simulate signup
    setUser({ email, name });
    setIsLoggedIn(true);
    setShowAuth(false);
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

  const processPayment = () => {
    // Double-check availability before processing payment
    const finalAvailabilityCheck = checkRoomAvailability(room.id, checkIn, checkOut);
    
    if (!finalAvailabilityCheck.available) {
      alert("Room is no longer available. Please select different dates.");
      setBookingStep(1);
      setAvailabilityResult(null);
      return;
    }

    // Process payment and create booking
    const bookingData = {
      checkIn,
      checkOut,
      guests,
      guest: user?.name,
      email: user?.email,
      ...calculateTotal()
    };
    
    const newBooking = addNewBooking(bookingData);
    
    const confirmation = {
      bookingId: newBooking.id,
      room: room.name,
      checkIn,
      checkOut,
      guests,
      ...calculateTotal(),
      guest: user?.name,
      email: user?.email,
      bookingDate: new Date().toLocaleDateString()
    };
    
    setBookingConfirmation(confirmation);
    setBookingStep(3);
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
              {room.images.map((img, index) => (
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
                ₱{room.price.toLocaleString()} / night
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
  isLoggedIn, user
}: {
  room: any;
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
                <p className="text-sm text-zinc-600 dark:text-zinc-400">₱{room.price.toLocaleString()} per night</p>
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
                  {[...Array(room.maxGuests)].map((_, i) => (
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
                      <span>{total.nights} night{total.nights > 1 ? 's' : ''} × ₱{room.price.toLocaleString()}</span>
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
                  
                  {!availabilityResult.available && availabilityResult.nextAvailableDate && (
                    <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        💡 Suggestion: Try booking from {availabilityResult.nextAvailableDate} onwards
                      </p>
                      <button
                        onClick={() => {
                          setCheckIn(availabilityResult.nextAvailableDate!);
                          const nextDay = new Date(availabilityResult.nextAvailableDate!);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setCheckOut(nextDay.toISOString().split('T')[0]);
                          setAvailabilityResult(null);
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Use Suggested Dates
                      </button>
                    </div>
                  )}
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
                className="w-full p-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
              >
                Complete Booking - ₱{total.total.toLocaleString()}
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