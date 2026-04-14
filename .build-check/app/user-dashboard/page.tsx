"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ROOM_IMAGES: Record<string, string> = {
  standard: "/che.jpg",
  deluxe:   "/che2.jpg",
  family:   "/che3.jpg",
  suite:    "/che4.jpg",
};

const CHECK_IN_TIME = "2:00 PM";
const CHECK_OUT_TIME = "12:00 PM";

interface UserData {
  message: string;
  user: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    username: string;
    email: string;
    contact?: string;
    address?: string;
    gender?: string;
    role?: string;
  };
}

interface Booking {
  id: number;
  room: number;
  room_name: string;
  room_number: string;
  room_type?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_at?: string;
  check_out_at?: string;
  guests: number;
  total_price: string;
  status: string;
  cancel_request_status?: string;
  cancel_request_reason?: string;
  cancel_requested_at?: string | null;
  cancel_reviewed_at?: string | null;
  cancel_reviewed_by_name?: string | null;
  special_requests: string;
  free_food_guests: number;
  extra_guest_count: number;
  extra_guest_fee_per_night: string;
  extra_guest_fee_total: string;
  created_at: string;
}

interface ContactMsg {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  reply?: string;
  replied_at?: string | null;
  replied_by_name?: string;
  created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending:   "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
  checked_in: "bg-sky-100 text-sky-700",
  checked_out: "bg-indigo-100 text-indigo-700",
  cancel_requested: "bg-amber-100 text-amber-700",
  cancel_rejected: "bg-slate-100 text-slate-700",
};

function nights(ci: string, co: string) {
  return Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtStay(dateValue: string, timeValue?: string) {
  return `${fmt(dateValue)}${timeValue ? ` • ${timeValue}` : ""}`;
}

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: "profile" | "bookings" | "notifications" =
    requestedTab === "bookings" || requestedTab === "notifications" ? requestedTab : "profile";
  const [tab, setTab] = useState<"profile" | "bookings" | "notifications">(initialTab);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingUser, setLoadingUser]       = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");
  const [bookingAction, setBookingAction] = useState<{ id: number; action: string } | null>(null);
  const [extendTarget, setExtendTarget] = useState<Booking | null>(null);
  const [extendDays, setExtendDays] = useState(1);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", middle_name: "", contact: "", address: "", gender: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/"); return; }

    fetch(`${API}/user/dashboard/user/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(d => { setUserData(d); setLoadingUser(false); })
      .catch(() => { localStorage.clear(); router.push("/"); });
  }, [router]);

  const fetchBookings = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingBookings(true);
    fetch(`${API}/hotelroom/bookings/my/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoadingBookings(false); })
      .catch(() => setLoadingBookings(false));
  };

  const [notifications, setNotifications] = useState<ContactMsg[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<ContactMsg | null>(null);
  const [seenNotifIds, setSeenNotifIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("seen_notif_ids");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const fetchNotifications = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingNotifs(true);
    fetch(`${API}/user/contact/my-messages/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: ContactMsg[]) => {
        const replied = Array.isArray(d) ? d.filter(m => m.reply) : [];
        setNotifications(replied);
        setLoadingNotifs(false);
      })
      .catch(() => setLoadingNotifs(false));
  };

  useEffect(() => {
    if (tab === "bookings") {
      fetchBookings();
    }
    if (tab === "notifications") fetchNotifications();
  }, [tab, userData]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleCancel = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    if (!cancelReason.trim()) {
      setCancelMsg("Please add a cancellation comment before submitting.");
      return;
    }
    setCancelling(id);
    try {
      const res = await fetch(`${API}/hotelroom/bookings/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_cancellation", reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = data.booking || data;
        setCancelMsg("Cancellation request submitted for approval.");
        setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updated } : null);
        setCancelReason("");
      } else {
        setCancelMsg(data.error || "Failed to submit cancellation request.");
      }
    } finally {
      setCancelling(null);
      setCancelConfirm(null);
      setTimeout(() => setCancelMsg(""), 3000);
    }
  };



  const startEdit = () => {
    if (!u) return;
    setEditForm({
      first_name:  u.first_name  || "",
      last_name:   u.last_name   || "",
      middle_name: u.middle_name || "",
      contact:     u.contact     || "",
      address:     u.address     || "",
      gender:      u.gender      || "",
    });
    setEditing(true);
    setEditMsg("");
  };

  const handleEditSave = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API}/user/profile/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditMsg(Object.values(data).flat().join(" ") || "Update failed.");
        return;
      }
      setUserData(prev => prev ? { ...prev, user: { ...prev.user, ...data } } : prev);
      setEditing(false);
      setEditMsg("Profile updated successfully.");
      setTimeout(() => setEditMsg(""), 3000);
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch(`${API}/user/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).finally(() => { localStorage.clear(); router.push("/"); });
  };

  if (loadingUser) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
      <p className="text-[#71867e] tracking-widest text-sm">Loading...</p>
    </div>
  );

  const u = userData?.user;
  const getBookingBadge = (booking: Booking) => {
    if (booking.status === "cancelled") return { key: "cancelled", label: "cancelled" };
    if (booking.status === "checked_in") return { key: "checked_in", label: "checked in" };
    if (booking.status === "checked_out") return { key: "checked_out", label: "checked out" };
    if (booking.cancel_request_status === "requested") return { key: "cancel_requested", label: "cancel requested" };
    if (booking.cancel_request_status === "approved") return { key: "cancelled", label: "cancelled" };
    if (booking.cancel_request_status === "rejected") return { key: "cancel_rejected", label: "cancel rejected" };
    return { key: booking.status, label: booking.status };
  };

  const canReviewBooking = (booking: Booking) => {
    if (booking.status === "completed" || booking.status === "checked_out") return true;
    return new Date(`${booking.check_out}T12:00:00`).getTime() <= Date.now();
  };

  const canCheckInBooking = (booking: Booking) => {
    if (booking.status !== "confirmed") return false;
    return new Date(`${booking.check_in}T14:00:00`).getTime() <= Date.now();
  };

  const canCheckOutBooking = (booking: Booking) => {
    if (booking.status !== "checked_in") return false;
    return new Date(`${booking.check_out}T12:00:00`).getTime() <= Date.now();
  };

  const canExtendBooking = (booking: Booking) => {
    if (booking.status !== "checked_in") return false;
    return new Date(`${booking.check_out}T12:00:00`).getTime() >= Date.now();
  };

  const getStayState = (booking: Booking) => {
    if (booking.status === "checked_in") {
      return {
        title: "Checked In",
        body: `Your stay has been marked as checked in. Check-in time is ${CHECK_IN_TIME}. When checkout opens at ${CHECK_OUT_TIME}, you can either check out or extend your stay before leaving a review.`,
        tone: "sky",
      };
    }
    if (booking.status === "checked_out") {
      return {
        title: "Checked Out",
        body: "Your stay is complete. You can now leave a star rating and comment for this room.",
        tone: "emerald",
      };
    }
    if (booking.status === "confirmed") {
      return {
        title: "Ready for Check-in",
        body: `Your booking is confirmed. Check-in starts at ${CHECK_IN_TIME}, and check-out is at ${CHECK_OUT_TIME}.`,
        tone: "green",
      };
    }
    return null;
  };

  const handleBookingAction = async (id: number, action: "check_in" | "check_out" | "extend_stay", days?: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    setBookingAction({ id, action });
    setCancelMsg("");
    try {
      const res = await fetch(`${API}/hotelroom/bookings/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(action === "extend_stay" ? { action, extend_days: days ?? extendDays } : { action }),
      });
      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        setCancelMsg(
          typeof data.error === "string"
            ? data.error
            : action === "check_in"
              ? "Failed to check in."
              : action === "check_out"
                ? "Failed to check out."
                : "Failed to extend your stay."
        );
        return false;
      }

      const updated = (data.booking && typeof data.booking === "object" ? data.booking : data) as Booking;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
      setSelected(prev => prev && prev.id === id ? { ...prev, ...updated } : prev);
      if (action === "check_in") {
        setCancelMsg("Check-in saved successfully.");
      } else if (action === "check_out") {
        setCancelMsg("Check-out saved successfully.");
      } else {
        setCancelMsg("Stay extended successfully.");
      }
      setTimeout(() => setCancelMsg(""), 3000);
      return true;
    } finally {
      setBookingAction(null);
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 py-5" style={{ backgroundColor: "#132222" }}>
        <Link href="/" className="text-white tracking-[0.3em] text-lg font-light">PHINAS HOTEL</Link>
        <div className="flex gap-6 items-center">
          <Link href="/rooms" className="text-[#d4d7c7] text-sm tracking-widest hover:text-white transition">ROOMS</Link>
          <button
            onClick={handleLogout}
            className="text-xs tracking-widest px-4 py-2 border border-[#71867e] text-[#d4d7c7] hover:bg-[#71867e] transition"
          >
            LOGOUT
          </button>
        </div>
      </nav>

      <div className="pt-28 pb-20 max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-1">Welcome back</p>
            <h1 className="text-3xl md:text-4xl font-thin tracking-[0.2em]">
              {u?.first_name?.toUpperCase()} {u?.last_name?.toUpperCase()}
            </h1>
          </div>
          <Link
            href="/rooms"
            className="inline-block text-center px-8 py-3 text-xs tracking-[0.3em] font-semibold transition"
            style={{ backgroundColor: "#1c352c", color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
          >
            + NEW BOOKING
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#d4d7c7] mb-8">
        {(["profile", "bookings", "notifications"] as const).map(t => {
            const isNotif = t === "notifications";
            const unread = isNotif ? notifications.filter(n => !seenNotifIds.has(n.id)).length : 0;
            return (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === "notifications") {
                    const allIds = notifications.map(n => n.id);
                    const updated = new Set([...seenNotifIds, ...allIds]);
                    setSeenNotifIds(updated);
                    localStorage.setItem("seen_notif_ids", JSON.stringify([...updated]));
                  }
                }}
                className={`relative px-6 py-3 text-xs tracking-[0.3em] uppercase transition border-b-2 -mb-px ${
                  tab === t ? "border-[#1c352c] text-[#1c352c] font-semibold" : "border-transparent text-[#71867e] hover:text-[#1c352c]"
                }`}
              >
                {t === "profile" ? "My Profile" : t === "bookings" ? "My Bookings" : "Notifications"}
                {isNotif && unread > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-red-500 text-white font-bold">{unread}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* â”€â”€ PROFILE TAB â”€â”€ */}
        {tab === "profile" && u && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Avatar card */}
            <div className="flex flex-col items-center gap-4 p-8 border border-[#d4d7c7]" style={{ backgroundColor: "#fff" }}>
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#d4d7c7]">
                <Image src="/che.jpg" alt="avatar" fill className="object-cover" />
              </div>
              <div className="text-center">
                <p className="font-semibold tracking-wide">{u.first_name} {u.last_name}</p>
                <p className="text-xs text-[#71867e] tracking-widest mt-1 uppercase">{u.role || "Guest"}</p>
              </div>
              <span className="text-xs px-3 py-1 tracking-widest" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>
                @{u.username}
              </span>
            </div>

            {/* Details */}
            <div className="md:col-span-2 border border-[#d4d7c7] p-8" style={{ backgroundColor: "#fff" }}>
              <div className="flex justify-between items-center mb-6">
                <p className="text-xs tracking-[0.4em] uppercase text-[#71867e]">Account Details</p>
                {!editing && (
                  <button onClick={startEdit}
                    className="text-[10px] tracking-widest px-4 py-2 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition">
                    EDIT PROFILE
                  </button>
                )}
              </div>

              {editMsg && (
                <p className={`text-xs mb-4 tracking-wide ${editMsg.includes("success") ? "text-emerald-600" : "text-red-500"}`}>{editMsg}</p>
              )}

              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    ["First Name",   u.first_name],
                    ["Last Name",    u.last_name],
                    ["Middle Name",  u.middle_name || "â€”"],
                    ["Username",     u.username],
                    ["Email",        u.email],
                    ["Contact",      u.contact || "â€”"],
                    ["Address",      u.address || "â€”"],
                    ["Gender",       u.gender || "â€”"],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-[#f0ede6] pb-3">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-1">{label}</p>
                      <p className="text-sm text-[#1c352c]">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      ["first_name",  "First Name"],
                      ["last_name",   "Last Name"],
                      ["middle_name", "Middle Name"],
                      ["contact",     "Contact"],
                      ["address",     "Address"],
                    ] as [keyof typeof editForm, string][]).map(([field, label]) => (
                      <div key={field}>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">{label}</label>
                        <input
                          value={editForm[field]}
                          onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                          className="w-full border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] block mb-1">Gender</label>
                      <select
                        value={editForm.gender}
                        onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                        className="w-full border border-[#d4d7c7] px-3 py-2 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleEditSave} disabled={editLoading}
                      className="px-6 py-2 text-xs tracking-[0.25em] transition disabled:opacity-50"
                      style={{ backgroundColor: "#1c352c", color: "#fff" }}>
                      {editLoading ? "SAVING..." : "SAVE CHANGES"}
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="px-6 py-2 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition">
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* â”€â”€ BOOKINGS TAB â”€â”€ */}
        {tab === "bookings" && (
          <div>
            {cancelMsg && (
              <div className="mb-4 px-4 py-3 text-xs tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200">
                {cancelMsg}
              </div>
            )}

            <div className="mb-6 flex flex-col gap-3 border border-[#d4d7c7] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#71867e]">My Bookings</p>
                <p className="text-sm text-[#4a6358]">Review your room history, pricing breakdown, guest counts, and payment details.</p>
              </div>
              <Link
                href="/my-bookings"
                className="inline-block px-6 py-3 text-center text-xs tracking-[0.3em] transition"
                style={{ backgroundColor: "#132222", color: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#132222")}
              >
                VIEW ALL DETAILS
              </Link>
            </div>

            {loadingBookings && (
              <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading bookings...</p>
            )}

            {!loadingBookings && bookings.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm mb-4">No bookings yet.</p>
                <Link
                  href="/rooms"
                  className="inline-block px-8 py-3 text-xs tracking-[0.3em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
                >
                  BROWSE ROOMS
                </Link>
              </div>
            )}

            {!loadingBookings && bookings.length > 0 && (
              <div className="flex flex-col gap-4">
                {bookings.map(b => {
                  const n = nights(b.check_in, b.check_out);
                  const img = ROOM_IMAGES[b.room_type || ""] || "/che.jpg";
                  return (
                    <div key={b.id} className="flex flex-col sm:flex-row border border-[#d4d7c7] overflow-hidden" style={{ backgroundColor: "#fff" }}>
                      {/* Room image */}
                      <div className="relative w-full sm:w-40 h-36 sm:h-auto flex-shrink-0">
                        <Image src={img} alt={b.room_name} fill className="object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-[#71867e] tracking-widest mb-0.5">Booking #{b.id}</p>
                            <p className="font-semibold tracking-wide">{b.room_name}</p>
                            <p className="text-xs text-[#71867e]">
                              Room {b.room_number} · Check-in {b.check_in_time || CHECK_IN_TIME} · Check-out {b.check_out_time || CHECK_OUT_TIME}
                            </p>
                          </div>
                          <span className={`text-[10px] px-3 py-1 rounded-full font-semibold tracking-widest uppercase ${STATUS_STYLE[getBookingBadge(b).key] || "bg-gray-100 text-gray-600"}`}>
                            {getBookingBadge(b).label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-6 text-xs text-[#4a6358]">
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Check-in</p>
                            <p>{fmtStay(b.check_in, b.check_in_time || CHECK_IN_TIME)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Check-out</p>
                            <p>{fmtStay(b.check_out, b.check_out_time || CHECK_OUT_TIME)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Nights</p>
                            <p>{n}</p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Guests</p>
                            <p>{b.guests}</p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Total</p>
                            <p className="font-semibold text-[#1c352c]">â‚±{Number(b.total_price).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Free Food</p>
                            <p>{b.free_food_guests} guest{b.free_food_guests > 1 ? "s" : ""}</p>
                          </div>
                          {Number(b.extra_guest_fee_total) > 0 && (
                            <div>
                              <p className="text-[10px] tracking-widest text-[#71867e] uppercase mb-0.5">Extra Guest Fee</p>
                              <p className="font-semibold text-[#1c352c]">â‚±{Number(b.extra_guest_fee_total).toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => setSelected(b)}
                            className="text-[10px] tracking-[0.25em] px-4 py-2 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                          >
                            VIEW DETAILS
                          </button>
                          {b.status !== "cancelled" && b.status !== "completed" && b.status !== "checked_in" && b.status !== "checked_out" && (
                            <button
                              onClick={() => { setCancelReason(""); setCancelConfirm(b.id); }}
                              className="text-[10px] tracking-[0.25em] px-4 py-2 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                            >
                              CANCEL
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* â”€â”€ NOTIFICATIONS TAB â”€â”€ */}
        {tab === "notifications" && (
          <div>
            {loadingNotifs && <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading...</p>}
            {!loadingNotifs && notifications.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No replies from admin yet.</p>
              </div>
            )}
            {!loadingNotifs && notifications.length > 0 && (
              <div className="flex flex-col gap-4">
                {notifications.map(n => (
                  <div key={n.id} className="border border-[#d4d7c7] p-5 bg-white flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Re: {n.subject}</p>
                        <p className="text-sm text-[#1c352c] font-medium">{n.reply}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold tracking-widest uppercase whitespace-nowrap">Replied</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <p className="text-xs text-[#71867e]">
                        {n.replied_by_name ? `By ${n.replied_by_name}` : "Admin"}
                        {n.replied_at ? ` Â· ${fmt(n.replied_at)}` : ""}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedNotif(n);
                          const updated = new Set([...seenNotifIds, n.id]);
                          setSeenNotifIds(updated);
                          localStorage.setItem("seen_notif_ids", JSON.stringify([...updated]));
                        }}
                        className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                      >VIEW THREAD</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ NOTIFICATION THREAD MODAL â”€â”€ */}
        {selectedNotif && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
            <div className="w-full max-w-lg bg-[#faf9f6] overflow-hidden shadow-2xl">
              <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Admin Reply</p>
                  <p className="text-white font-light tracking-[0.15em]">{selectedNotif.subject}</p>
                </div>
                <button onClick={() => setSelectedNotif(null)} className="text-[#71867e] hover:text-white text-xl transition">âœ•</button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Your Message</p>
                  <p className="text-sm text-[#4a6358] leading-relaxed p-4 border border-[#e8e4dc] bg-[#f5f3ee]">{selectedNotif.message}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Admin Reply</p>
                  <p className="text-sm text-[#1c352c] leading-relaxed p-4 border border-emerald-200 bg-emerald-50">{selectedNotif.reply}</p>
                  {selectedNotif.replied_by_name && (
                    <p className="text-xs text-[#71867e] mt-2">
                      Replied by {selectedNotif.replied_by_name}{selectedNotif.replied_at ? ` on ${fmt(selectedNotif.replied_at)}` : ""}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="py-3 text-xs tracking-[0.25em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
                >CLOSE</button>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ BOOKING DETAIL MODAL â”€â”€ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg bg-[#faf9f6] overflow-hidden shadow-2xl">
            {/* Modal header image */}
            <div className="relative h-48">
              <Image src={ROOM_IMAGES[selected.room_type || ""] || "/che.jpg"} alt={selected.room_name} fill className="object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(19,34,34,0.7), transparent)" }} />
              <div className="absolute bottom-4 left-5 text-white">
                <p className="text-xs tracking-[0.3em] opacity-70 uppercase">Booking #{selected.id}</p>
                <p className="text-xl font-light tracking-[0.15em]">{selected.room_name}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-white text-xl leading-none hover:opacity-70 transition"
              >âœ•</button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#71867e] tracking-widest">
                  Room {selected.room_number} • Check-in {selected.check_in_time || CHECK_IN_TIME} • Check-out {selected.check_out_time || CHECK_OUT_TIME}
                </p>
                <span className={`text-[10px] px-3 py-1 rounded-full font-semibold tracking-widest uppercase ${STATUS_STYLE[getBookingBadge(selected).key] || "bg-gray-100 text-gray-600"}`}>
                  {getBookingBadge(selected).label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Check-in",  fmtStay(selected.check_in, selected.check_in_time || CHECK_IN_TIME)],
                  ["Check-out", fmtStay(selected.check_out, selected.check_out_time || CHECK_OUT_TIME)],
                  ["Nights",    String(nights(selected.check_in, selected.check_out))],
                  ["Guests",    String(selected.guests)],
                ].map(([l, v]) => (
                  <div key={l} className="border-b border-[#e8e4dc] pb-2">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">{l}</p>
                    <p className="text-[#1c352c]">{v}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!canCheckInBooking(selected)) {
                      setCancelMsg("Check-in becomes available on or after your check-in date.");
                      return;
                    }
                    void handleBookingAction(selected.id, "check_in");
                  }}
                  disabled={!canCheckInBooking(selected) || bookingAction?.id === selected.id}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#1c352c] hover:border-[#1c352c] transition disabled:opacity-50"
                >
                  {bookingAction?.id === selected.id && bookingAction.action === "check_in" ? "CHECKING IN..." : "CHECK-IN"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canCheckOutBooking(selected)) {
                      setCancelMsg("Check-out becomes available on or after your check-out date.");
                      return;
                    }
                    void handleBookingAction(selected.id, "check_out");
                  }}
                  disabled={!canCheckOutBooking(selected) || bookingAction?.id === selected.id}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-emerald-400 text-emerald-700 hover:bg-emerald-500 hover:text-white transition disabled:opacity-50"
                >
                  {bookingAction?.id === selected.id && bookingAction.action === "check_out" ? "CHECKING OUT..." : "CHECK-OUT / RATE"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canExtendBooking(selected)) {
                      setCancelMsg("You can only extend while your stay is still active.");
                      return;
                    }
                    setExtendTarget(selected);
                    setExtendDays(1);
                  }}
                  disabled={!canExtendBooking(selected) || bookingAction?.id === selected.id}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#c48a3a] text-[#c48a3a] hover:bg-[#c48a3a] hover:text-white transition disabled:opacity-50"
                >
                  {bookingAction?.id === selected.id && bookingAction.action === "extend_stay" ? "EXTENDING..." : "EXTEND STAY"}
                </button>
              </div>

              {getStayState(selected) && (
                <div
                  className={`border px-4 py-3 text-sm ${
                    getStayState(selected)?.tone === "sky"
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : getStayState(selected)?.tone === "emerald"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-green-200 bg-green-50 text-green-900"
                  }`}
                >
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-1">{getStayState(selected)?.title}</p>
                  <p>{getStayState(selected)?.body}</p>
                </div>
              )}

              {selected.special_requests && (
                <div className="border-b border-[#e8e4dc] pb-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-1">Special Requests</p>
                  <p className="text-sm text-[#4a6358]">{selected.special_requests}</p>
                </div>
              )}

              {selected.cancel_request_status === "requested" && selected.cancel_request_reason && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-1">Cancellation Comment</p>
                  <p>{selected.cancel_request_reason}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <p className="text-xs tracking-widest text-[#71867e]">TOTAL AMOUNT</p>
                <p className="text-2xl font-light">â‚±{Number(selected.total_price).toLocaleString()}</p>
              </div>

              {canReviewBooking(selected) && (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Your stay is complete. You can now leave a room review.
                </div>
              )}

              <div className="flex gap-3 pt-1">
                {selected.status !== "cancelled" && selected.status !== "completed" && selected.status !== "checked_in" && selected.status !== "checked_out" && selected.cancel_request_status !== "requested" && (
                  <button
                    onClick={() => { setSelected(null); setCancelReason(""); setCancelConfirm(selected.id); }}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                  >
                    CANCEL BOOKING
                  </button>
                )}
                {selected.cancel_request_status === "requested" && (
                  <div className="flex-1 py-3 text-center text-xs tracking-[0.25em] border border-amber-400 text-amber-700 bg-amber-50">
                    CANCELLATION PENDING APPROVAL
                  </div>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 text-xs tracking-[0.25em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ CANCEL CONFIRM MODAL â”€â”€ */}
      {cancelConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg bg-[#faf9f6] p-8 shadow-2xl">
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Confirm Cancellation</p>
            <p className="text-sm text-[#4a6358] mb-4">Add a short comment for why you want to cancel Booking #{cancelConfirm}. The admin/staff team will review it.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={4}
              placeholder="Example: We changed our travel plans."
              className="w-full border border-[#d4d7c7] px-4 py-3 text-sm bg-white outline-none focus:border-[#1c352c] transition mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelConfirm(null); setCancelReason(""); }}
                className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
              >
                KEEP IT
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                disabled={cancelling === cancelConfirm}
                className="flex-1 py-3 text-xs tracking-[0.25em] bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {cancelling === cancelConfirm ? "SUBMITTING..." : "SUBMIT REQUEST"}
              </button>
            </div>
          </div>
        </div>
      )}

      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg bg-[#faf9f6] p-8 shadow-2xl">
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Extend Stay</p>
            <p className="text-sm text-[#4a6358] mb-5">
              Booking #{extendTarget.id} for {extendTarget.room_name}. Choose how many extra days you want to add.
            </p>
            <label className="mb-2 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Extra Days</label>
            <input
              type="number"
              min={1}
              max={7}
              step={1}
              value={extendDays}
              onChange={e => setExtendDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              className="w-full border border-[#d4d7c7] px-4 py-3 text-sm bg-white outline-none focus:border-[#1c352c] transition"
            />
            <p className="mt-2 text-xs text-[#71867e]">You can extend by 1 to 7 days at a time.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setExtendTarget(null);
                  setExtendDays(1);
                }}
                className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (!extendTarget) return;
                  void handleBookingAction(extendTarget.id, "extend_stay", extendDays);
                  setExtendTarget(null);
                  setExtendDays(1);
                }}
                disabled={bookingAction?.id === extendTarget.id}
                className="flex-1 py-3 text-xs tracking-[0.25em] bg-[#c48a3a] text-white hover:bg-[#ad7427] transition disabled:opacity-50"
              >
                {bookingAction?.id === extendTarget.id && bookingAction.action === "extend_stay" ? "EXTENDING..." : "CONFIRM EXTENSION"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <UserDashboardContent />
    </Suspense>
  );
}

