"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendBookingEmail } from "../../lib/send-booking-email";
import RatingModal from "../components/admin-staff-rating";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const MSG_STATUS_STYLE: Record<string, string> = {
  unread: "bg-yellow-100 text-yellow-700",
  read: "bg-blue-100 text-blue-700",
  replied: "bg-emerald-100 text-emerald-700",
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
  checked_in: "bg-sky-100 text-sky-700",
  checked_out: "bg-indigo-100 text-indigo-700",
  cancel_requested: "bg-amber-100 text-amber-700",
  cancel_rejected: "bg-slate-100 text-slate-700",
};

const PANEL_STYLE = {
  backgroundColor: "rgba(250, 249, 246, 0.68)",
  backdropFilter: "blur(10px)",
};

interface StaffStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  total_rooms: number;
  available_rooms: number;
  total_users: number;
  unread_messages: number;
}

interface Booking {
  id: number;
  reference_number?: string | null;
  user_name: string;
  user_email: string;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: string;
  status: string;
  cancel_request_status?: string;
  cancel_request_reason?: string;
  special_requests: string;
  created_at: string;
}

interface Room {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: number;
  status: string;
  floor: number;
  avg_rating?: number | null;
  rating_count?: number;
}

interface ContactMsg {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  reply?: string;
  created_at: string;
}

interface RoomRating {
  id: number;
  user_name: string;
  room_name: string;
  room_number: string;
  booking: number | null;
  stars: number;
  comment: string;
  created_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function StaffDashboardVertical() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "rooms" | "bookings" | "messages" | "ratings">("overview");
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [ratings, setRatings] = useState<RoomRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<ContactMsg | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    if (!token || role !== "staff") { router.push("/"); return; }

    fetch(`${API}/user/dashboard/staff/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) { localStorage.clear(); router.push("/"); return null; }
        return res.json();
      })
      .then(d => { if (d) { setStats(d); setLoading(false); } })
      .catch(() => { localStorage.clear(); router.push("/"); });
  }, [router]);

  const fetchData = (type: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const endpoints = {
      rooms: `${API}/hotelroom/rooms/admin/`,
      bookings: `${API}/hotelroom/bookings/admin/`,
      messages: `${API}/user/contact/messages/`,
      ratings: `${API}/hotelroom/ratings/admin/`,
    };

    fetch(endpoints[type as keyof typeof endpoints], {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => {
        const data = Array.isArray(d) ? d : [];
        switch (type) {
          case 'rooms': setRooms(data); break;
          case 'bookings': setBookings(data); break;
          case 'messages': setMessages(data); break;
          case 'ratings': setRatings(data); break;
        }
      })
      .catch(() => {});
  };

  const handleTabChange = (nextTab: typeof tab) => {
    setTab(nextTab);
    if (nextTab !== "overview") fetchData(nextTab);
  };

  const handleBookingStatus = async (id: number, status: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    const res = await fetch(`${API}/hotelroom/bookings/admin/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Failed to update booking."); return; }
    
    if (status === "confirmed") {
      await sendBookingEmail({ status: "confirmed", booking: data });
    }
    
    setBookings(prev => prev.map(b => b.id === id ? data : b));
    if (selectedBooking?.id === id) setSelectedBooking(data);
    setActionMsg(`Booking marked as ${status}.`);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch(`${API}/user/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).finally(() => { localStorage.clear(); router.push("/"); });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
      <p className="text-[#71867e] tracking-widest text-sm">Loading...</p>
    </div>
  );

  const unreadCount = messages.filter(m => m.status === "unread").length;
  const statCards = stats ? [
    { label: "Total Bookings", value: stats.total_bookings },
    { label: "Pending", value: stats.pending_bookings },
    { label: "Confirmed", value: stats.confirmed_bookings },
    { label: "Available Rooms", value: stats.available_rooms },
    { label: "Total Rooms", value: stats.total_rooms },
    { label: "Registered Users", value: stats.total_users },
  ] : [];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
      {/* Vertical Sidebar */}
      <div className="w-64 fixed left-0 top-0 h-full" style={{ backgroundColor: "#132222" }}>
        <div className="p-6 border-b border-[#71867e]/20">
          <Link href="/staff-dashboard-vertical" className="text-white tracking-[0.3em] text-lg font-light">
            PHINAS HOTEL
          </Link>
          <p className="text-[#71867e] text-xs tracking-widest uppercase mt-2">Staff Panel</p>
        </div>

        <nav className="p-4">
          {[
            { key: "overview", label: "Overview", icon: "📊" },
            { key: "rooms", label: "Rooms", icon: "🏠" },
            { key: "bookings", label: "Bookings", icon: "📅" },
            { key: "messages", label: "Messages", icon: "💬", badge: unreadCount },
            { key: "ratings", label: "Ratings", icon: "⭐" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key as typeof tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-2 text-left text-sm tracking-[0.2em] transition rounded ${
                tab === item.key 
                  ? "bg-[#1c352c] text-white" 
                  : "text-[#71867e] hover:text-white hover:bg-[#1c352c]/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="uppercase">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full text-xs tracking-widest px-4 py-2 border border-[#71867e] text-[#d4d7c7] hover:bg-[#71867e] transition"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-thin tracking-[0.2em] mb-2">STAFF DASHBOARD</h1>
          <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase">
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Section
          </p>
        </div>

        {actionMsg && (
          <div className="mb-6 px-4 py-3 text-xs tracking-wide text-emerald-700 border border-emerald-200 bg-[rgba(236,253,245,0.75)]">
            {actionMsg}
          </div>
        )}

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map(s => (
              <div key={s.label} className="p-6 border border-[#d4d7c7] text-center" style={PANEL_STYLE}>
                <p className="text-3xl font-thin mb-2 text-[#1c352c]">{s.value}</p>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Rooms */}
        {tab === "rooms" && (
          <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
            <div className="px-6 py-4 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Room Management — {rooms.length} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ede6]">
                    {["Room", "Type", "Status", "Capacity", "Price", "Rating", "Floor"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                      <td className="px-4 py-3">
                        <p className="font-medium">{room.name}</p>
                        <p className="text-xs text-[#71867e]">#{room.room_number}</p>
                      </td>
                      <td className="px-4 py-3 text-[#71867e] uppercase">{room.room_type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase ${
                          room.status === 'available' ? 'bg-green-100 text-green-700' :
                          room.status === 'occupied' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#71867e]">{room.capacity}</td>
                      <td className="px-4 py-3">₱{Number(room.price_per_night).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#71867e]">
                        {room.avg_rating ? `${room.avg_rating.toFixed(1)}/5` : "New"}
                      </td>
                      <td className="px-4 py-3 text-[#71867e]">{room.floor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings */}
        {tab === "bookings" && (
          <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
            <div className="px-6 py-4 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">All Bookings — {bookings.length} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ede6]">
                    {["Guest", "Room", "Check-in", "Check-out", "Total", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                      <td className="px-4 py-3 font-medium">{b.user_name}</td>
                      <td className="px-4 py-3 text-[#71867e]">{b.room_name} #{b.room_number}</td>
                      <td className="px-4 py-3">{fmt(b.check_in)}</td>
                      <td className="px-4 py-3">{fmt(b.check_out)}</td>
                      <td className="px-4 py-3 font-medium">₱{Number(b.total_price).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                          >
                            DETAILS
                          </button>
                          {b.status === "pending" && (
                            <button
                              onClick={() => handleBookingStatus(b.id, "confirmed")}
                              className="text-[10px] tracking-widest px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white transition"
                            >
                              CONFIRM
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messages */}
        {tab === "messages" && (
          <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
            <div className="px-6 py-4 border-b border-[#d4d7c7] flex justify-between items-center">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Contact Messages — {messages.length} total</p>
              {unreadCount > 0 && <span className="text-xs text-red-500 tracking-widest">{unreadCount} unread</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ede6]">
                    {["Name", "Email", "Subject", "Date", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} className={`border-b border-[#f0ede6] transition ${m.status === "unread" ? "bg-[rgba(254,249,195,0.6)]" : "hover:bg-[rgba(250,249,246,0.42)]"}`}>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-[#71867e]">{m.email}</td>
                      <td className="px-4 py-3">{m.subject}</td>
                      <td className="px-4 py-3 text-[#71867e]">{fmt(m.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase ${MSG_STATUS_STYLE[m.status] || "bg-gray-100 text-gray-600"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedMsg(m)}
                          className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                        >
                          VIEW
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ratings */}
        {tab === "ratings" && (
          <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
            <div className="px-6 py-4 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Customer Ratings — {ratings.length} total</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ede6]">
                    {["Customer", "Room", "Stars", "Comment", "Date"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(rating => (
                    <tr key={rating.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)]">
                      <td className="px-4 py-3 font-medium">{rating.user_name}</td>
                      <td className="px-4 py-3">
                        <div>{rating.room_name}</div>
                        <div className="text-xs text-[#71867e]">Room {rating.room_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#faf7f0] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#c48a3a]">
                          {rating.stars}/5
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#4a6358] max-w-md">{rating.comment || "No comment"}</td>
                      <td className="px-4 py-3 text-[#71867e]">{fmt(rating.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-md shadow-2xl overflow-hidden" style={{ backgroundColor: "rgba(250,249,246,0.95)", backdropFilter: "blur(12px)" }}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Booking #{selectedBooking.id}</p>
                <p className="text-white font-light tracking-[0.15em]">{selectedBooking.room_name}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#71867e]">Guest: <span className="text-[#1c352c] font-medium">{selectedBooking.user_name}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Room", selectedBooking.room_number],
                    ["Guests", String(selectedBooking.guests)],
                    ["Check-in", fmt(selectedBooking.check_in)],
                    ["Check-out", fmt(selectedBooking.check_out)],
                  ].map(([l, v]) => (
                    <div key={l} className="border-b border-[#e8e4dc] pb-2">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">{l}</p>
                      <p className="text-[#1c352c]">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className="text-xs tracking-widest text-[#71867e]">TOTAL</p>
                  <p className="text-2xl font-light">₱{Number(selectedBooking.total_price).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-3 text-xs tracking-[0.25em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg shadow-2xl overflow-hidden" style={{ backgroundColor: "rgba(250,249,246,0.95)", backdropFilter: "blur(12px)" }}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Message #{selectedMsg.id}</p>
                <p className="text-white font-light tracking-[0.15em]">{selectedMsg.subject}</p>
              </div>
              <button onClick={() => setSelectedMsg(null)} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["From", selectedMsg.name],
                    ["Email", selectedMsg.email],
                    ["Phone", selectedMsg.phone || "—"],
                    ["Date", fmt(selectedMsg.created_at)],
                  ].map(([l, v]) => (
                    <div key={l} className="border-b border-[#e8e4dc] pb-2">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">{l}</p>
                      <p className="text-sm text-[#1c352c]">{v}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Message</p>
                  <p className="text-sm text-[#4a6358] leading-relaxed p-4 border border-[#e8e4dc] bg-[rgba(245,243,238,0.72)]">
                    {selectedMsg.message}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="w-full py-3 text-xs tracking-[0.25em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}