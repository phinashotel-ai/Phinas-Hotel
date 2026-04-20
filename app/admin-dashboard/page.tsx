"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendBookingEmail } from "../../lib/send-booking-email";
import RatingModal from "../components/admin-staff-rating";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const MSG_STATUS_STYLE: Record<string, string> = {
  unread:  "bg-yellow-100 text-yellow-700",
  read:    "bg-blue-100 text-blue-700",
  replied: "bg-emerald-100 text-emerald-700",
};

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

const PANEL_STYLE = {
  backgroundColor: "rgba(250, 249, 246, 0.68)",
  backdropFilter: "blur(10px)",
};

const MODAL_STYLE = {
  backgroundColor: "rgba(250, 249, 246, 0.82)",
  backdropFilter: "blur(12px)",
};

const ROOM_TYPE_OPTIONS = ["standard", "deluxe", "suite", "family"] as const;
const ROOM_STATUS_OPTIONS = ["available", "occupied", "maintenance"] as const;

interface AdminData {
  total_users: number;
  total_staff: number;
  total_admins: number;
  users: User[];
}

interface User {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  username: string;
  email: string;
  contact?: string;
  address?: string;
  gender?: string;
  role: string;
}

type UserFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  username: string;
  email: string;
  contact: string;
  address: string;
  gender: string;
  password: string;
};

interface ContactMsg {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  reply?: string;
  replied_at?: string | null;
  replied_by_name?: string;
  created_at: string;
}

interface Booking {
  id: number;
  reference_number?: string | null;
  user_name: string;
  user_first_name?: string;
  user_email: string;
  room_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  guests: number;
  total_price: string;
  status: string;
  cancel_request_status?: string;
  cancel_request_reason?: string;
  cancel_requested_at?: string | null;
  cancel_reviewed_at?: string | null;
  cancel_reviewed_by_name?: string | null;
  special_requests: string;
  created_at: string;
  payment?: Payment | null;
}

interface Payment {
  id: number;
  booking: number;
  method: string;
  reference_number?: string | null;
  amount: string;
  sent_amount?: string | null;
  status: string;
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

interface DiningReservation {
  id: number;
  user_name: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
  status: string;
  created_at: string;
}

interface DiningOrder {
  id: number;
  user_name: string;
  booking_room_name?: string;
  booking_room_number?: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
  total: string;
  payable_total: string;
  status: string;
  created_at: string;
}

interface Room {
  id: number;
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: number;
  max_bookings: number;
  description: string;
  amenities: string[];
  image_url: string;
  room_image?: string | null;
  status: string;
  floor: number;
  free_food_guest_limit: number;
  extra_guest_fee_per_night: string;
  lunch_price_per_guest: string;
  dinner_price_per_guest: string;
  extra_guest_lunch_price_per_guest: string;
  extra_guest_dinner_price_per_guest: string;
  created_at: string;
  avg_rating?: number | null;
  rating_count?: number;
}

type RoomFormState = {
  name: string;
  room_number: string;
  room_type: string;
  price_per_night: string;
  capacity: string;
  max_bookings: string;
  description: string;
  amenities: string;
  image_url: string;
  status: string;
  floor: string;
  free_food_guest_limit: string;
  extra_guest_fee_per_night: string;
  lunch_price_per_guest: string;
  dinner_price_per_guest: string;
  extra_guest_lunch_price_per_guest: string;
  extra_guest_dinner_price_per_guest: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtStay(dateValue: string, timeValue?: string) {
  return `${fmt(dateValue)}${timeValue ? ` • ${timeValue}` : ""}`;
}

function nights(ci: string, co: string) {
  return Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

function getBookingStatusBadge(booking: Booking) {
  if (booking.status === "cancelled") return { key: "cancelled", label: "cancelled" };
  if (booking.status === "checked_in") return { key: "checked_in", label: "checked in" };
  if (booking.status === "checked_out") return { key: "checked_out", label: "checked out" };
  if (booking.cancel_request_status === "requested") return { key: "cancel_requested", label: "cancel requested" };
  if (booking.cancel_request_status === "approved") return { key: "cancelled", label: "cancelled" };
  if (booking.cancel_request_status === "rejected") return { key: "cancel_rejected", label: "cancel rejected" };
  return { key: booking.status, label: booking.status };
}

function parseError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  return Object.values(data as Record<string, unknown>)
    .flatMap(value => Array.isArray(value) ? value.map(String) : [String(value)])
    .join(" ") || fallback;
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

const EMPTY_USER_FORM: UserFormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  username: "",
  email: "",
  contact: "",
  address: "",
  gender: "Male",
  password: "",
};

const EMPTY_ROOM_FORM: RoomFormState = {
  name: "",
  room_number: "",
  room_type: "standard",
  price_per_night: "",
  capacity: "2",
  max_bookings: "1",
  description: "",
  amenities: "",
  image_url: "",
  status: "available",
  floor: "1",
  free_food_guest_limit: "2",
  extra_guest_fee_per_night: "500",
  lunch_price_per_guest: "250",
  dinner_price_per_guest: "400",
  extra_guest_lunch_price_per_guest: "250",
  extra_guest_dinner_price_per_guest: "400",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab]           = useState<"overview" | "users" | "rooms" | "bookings" | "messages" | "ratings" | "dining">("overview");
  const [userSectionTab, setUserSectionTab] = useState<"users" | "staff">("users");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [users, setUsers]         = useState<User[]>([]);
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [diningReservations, setDiningReservations] = useState<DiningReservation[]>([]);
  const [diningOrders, setDiningOrders] = useState<DiningOrder[]>([]);
  const [diningView, setDiningView] = useState<"reservation" | "order">("reservation");
  const [ratings, setRatings]     = useState<RoomRating[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingDining, setLoadingDining] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [newRatingsCount, setNewRatingsCount] = useState(0);
  const [bookingLoadError, setBookingLoadError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingRefQuery, setBookingRefQuery] = useState("");
  const [cancelConfirm, setCancelConfirm]     = useState<number | null>(null);
  const [cancelling, setCancelling]           = useState<number | null>(null);
  const [currentRole, setCurrentRole]         = useState("");
  const [userActionId, setUserActionId]       = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [messages, setMessages]   = useState<ContactMsg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<ContactMsg | null>(null);
  const [deleteMsgId, setDeleteMsgId] = useState<number | null>(null);
  const [pwdUser, setPwdUser]           = useState<User | null>(null);
  const [pwdForm, setPwdForm]           = useState({ new_password: "", confirm_password: "" });
  const [pwdLoading, setPwdLoading]     = useState(false);
  const [pwdError, setPwdError]         = useState("");
  const [pwdSuccess, setPwdSuccess]     = useState("");
  const [userModalMode, setUserModalMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser]     = useState<User | null>(null);
  const [roomModalMode, setRoomModalMode] = useState<"create" | "edit" | null>(null);
  const [editingRoom, setEditingRoom]     = useState<Room | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({
    first_name: "",
    middle_name: "",
    last_name: "",
    username: "",
    email: "",
    contact: "",
    address: "",
    gender: "Male",
    password: "",
  });
  const [userFormError, setUserFormError] = useState("");
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomFormState>({ ...EMPTY_ROOM_FORM });
  const [roomFormError, setRoomFormError] = useState("");
  const [roomFormLoading, setRoomFormLoading] = useState(false);
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [roomActionId, setRoomActionId] = useState<number | null>(null);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role  = localStorage.getItem("user_role");
    setCurrentRole(role || "");
    if (!token || (role !== "admin" && role !== "staff")) {
      router.push("/");
      return;
    }

    fetch(`${API}/user/dashboard/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) { localStorage.clear(); router.push("/"); return null; }
        return res.json();
      })
      .then(d => { if (d) { setAdminData(d); setUsers(Array.isArray(d.users) ? d.users : []); setLoading(false); } })
      .catch(() => { localStorage.clear(); router.push("/"); });
  }, [router]);

  const refreshAdminData = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API}/user/dashboard/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setAdminData(data);
    setUsers(Array.isArray(data.users) ? data.users : []);
  };

  const fetchBookings = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setBookingLoadError("");
    setLoadingBookings(true);
    fetch(`${API}/hotelroom/bookings/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setBookings([]);
          setBookingLoadError(parseError(data, "Failed to load bookings."));
          return;
        }
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
          setBookingLoadError("Booking data is unavailable right now.");
        }
      })
      .catch(() => {
        setBookings([]);
        setBookingLoadError("Failed to load bookings.");
      })
      .finally(() => setLoadingBookings(false));
  };

  const fetchRatings = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingRatings(true);
    fetch(`${API}/hotelroom/ratings/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => {
        const incoming = Array.isArray(d) ? d : [];
        setRatings(prev => {
          if (incoming.length > prev.length) setNewRatingsCount(c => c + (incoming.length - prev.length));
          return incoming;
        });
        setLoadingRatings(false);
      })
      .catch(() => setLoadingRatings(false));
  };

  const fetchDiningData = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingDining(true);
    Promise.all([
      fetch(`${API}/dining/reservations/admin/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API}/dining/bookings/admin/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([reservations, orders]) => {
        setDiningReservations(Array.isArray(reservations) ? reservations : []);
        setDiningOrders(Array.isArray(orders) ? orders : []);
        setLoadingDining(false);
      })
      .catch(() => setLoadingDining(false));
  };

  const fetchRooms = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingRooms(true);
    fetch(`${API}/hotelroom/rooms/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(d => { setRooms(Array.isArray(d) ? d : []); setLoadingRooms(false); })
      .catch(() => setLoadingRooms(false));
  };

  useEffect(() => {
    const refreshRooms = () => {
      if (tab === "rooms") fetchRooms();
    };
    window.addEventListener("room-ratings-updated", refreshRooms);
    return () => window.removeEventListener("room-ratings-updated", refreshRooms);
  }, [tab]);

  useEffect(() => {
    const onNewRating = () => fetchRatings();
    window.addEventListener("room-ratings-updated", onNewRating);
    return () => window.removeEventListener("room-ratings-updated", onNewRating);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    if (!token || (role !== "admin" && role !== "staff")) return;
    const id = window.setInterval(fetchRatings, 15000);
    return () => window.clearInterval(id);
  }, []);

  const handleTabChange = (nextTab: "overview" | "users" | "rooms" | "bookings" | "messages" | "ratings" | "dining") => {
    setTab(nextTab);
    if (nextTab === "dining") fetchDiningData();
    if (nextTab === "rooms") fetchRooms();
    if (nextTab === "bookings") fetchBookings();
    if (nextTab === "messages") fetchMessages();
    if (nextTab === "ratings") { fetchRatings(); setNewRatingsCount(0); }
  };

  useEffect(() => {
    if (tab !== "bookings" || bookings.length > 0 || loadingBookings) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setBookingLoadError("");
    setLoadingBookings(true);
    fetch(`${API}/hotelroom/bookings/admin/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setBookings([]);
          setBookingLoadError(parseError(data, "Failed to load bookings."));
          return;
        }
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
          setBookingLoadError("Booking data is unavailable right now.");
        }
      })
      .catch(() => {
        setBookings([]);
        setBookingLoadError("Failed to load bookings.");
      })
      .finally(() => setLoadingBookings(false));
  }, [tab, bookings.length, loadingBookings]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    if (!token || (role !== "admin" && role !== "staff")) return;

    fetchMessages();

    const intervalId = window.setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const fetchMessages = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setLoadingMsgs(true);
    fetch(`${API}/user/contact/messages/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setMessages(Array.isArray(d) ? d : []); setLoadingMsgs(false); })
      .catch(() => setLoadingMsgs(false));
  };

  const handleMsgStatus = async (id: number, status: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API}/user/contact/messages/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    if (selectedMsg?.id === id) setSelectedMsg(prev => prev ? { ...prev, ...data } : null);
  };

  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const handleReplyMessage = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !selectedMsg || !replyText.trim()) return;
    setReplySaving(true);
    try {
      const res = await fetch(`${API}/user/contact/messages/${selectedMsg.id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setActionMsg(parseError(data, "Failed to save reply.")); return; }
      setMessages(prev => prev.map(m => m.id === selectedMsg.id ? data : m));
      setSelectedMsg(data);
      setReplyText("");
      setActionMsg("Reply sent to user.");
      setTimeout(() => setActionMsg(""), 3000);
    } finally {
      setReplySaving(false);
    }
  };

  const handleDeleteMsg = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`${API}/user/contact/messages/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeleteMsgId(null);
    if (selectedMsg?.id === id) setSelectedMsg(null);
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserModalMode("create");
    setUserForm({ ...EMPTY_USER_FORM });
    setUserFormError("");
  };

  const openCreateRoomModal = () => {
    setEditingRoom(null);
    setRoomModalMode("create");
    setRoomForm({ ...EMPTY_ROOM_FORM });
    setRoomImageFile(null);
    setRoomFormError("");
  };

  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setRoomModalMode("edit");
    setRoomForm({
      name: room.name || "",
      room_number: room.room_number || "",
      room_type: room.room_type || "standard",
      price_per_night: String(room.price_per_night ?? ""),
      capacity: String(room.capacity ?? 2),
      max_bookings: String(room.max_bookings ?? 1),
      description: room.description || "",
      amenities: Array.isArray(room.amenities) ? room.amenities.join(", ") : "",
      image_url: room.image_url || "",
      status: room.status || "available",
      floor: String(room.floor ?? 1),
      free_food_guest_limit: String(room.free_food_guest_limit ?? 2),
      extra_guest_fee_per_night: String(room.extra_guest_fee_per_night ?? "500"),
      lunch_price_per_guest: String(room.lunch_price_per_guest ?? "250"),
      dinner_price_per_guest: String(room.dinner_price_per_guest ?? "400"),
      extra_guest_lunch_price_per_guest: String(room.extra_guest_lunch_price_per_guest ?? "250"),
      extra_guest_dinner_price_per_guest: String(room.extra_guest_dinner_price_per_guest ?? "400"),
    });
    setRoomImageFile(null);
    setRoomFormError("");
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setUserModalMode("edit");
    setUserForm({
      first_name: user.first_name || "",
      middle_name: user.middle_name || "",
      last_name: user.last_name || "",
      username: user.username || "",
      email: user.email || "",
      contact: user.contact || "",
      address: user.address || "",
      gender: (user.gender || "Male") as "Male" | "Female" | "Other",
      password: "",
    });
    setUserFormError("");
  };

  const closeUserModal = () => {
    setUserModalMode(null);
    setEditingUser(null);
    setUserForm({ ...EMPTY_USER_FORM });
    setUserFormError("");
    setUserFormLoading(false);
  };

  const closeRoomModal = () => {
    setRoomModalMode(null);
    setEditingRoom(null);
    setRoomForm({ ...EMPTY_ROOM_FORM });
    setRoomImageFile(null);
    setRoomFormError("");
    setRoomFormLoading(false);
  };

  const buildRoomPayload = () => {
    const payload = new FormData();
    payload.append("name", roomForm.name.trim());
    payload.append("room_number", roomForm.room_number.trim());
    payload.append("room_type", roomForm.room_type);
    payload.append("price_per_night", roomForm.price_per_night);
    payload.append("capacity", roomForm.capacity);
    payload.append("max_bookings", roomForm.capacity);
    payload.append("description", roomForm.description.trim());
    payload.append("amenities", JSON.stringify(roomForm.amenities.split(",").map(item => item.trim()).filter(Boolean)));
    payload.append("image_url", roomForm.image_url.trim());
    payload.append("status", roomForm.status);
    payload.append("floor", roomForm.floor);
    payload.append("free_food_guest_limit", roomForm.free_food_guest_limit);
    payload.append("extra_guest_fee_per_night", roomForm.extra_guest_fee_per_night);
    payload.append("lunch_price_per_guest", roomForm.lunch_price_per_guest);
    payload.append("dinner_price_per_guest", roomForm.dinner_price_per_guest);
    payload.append("extra_guest_lunch_price_per_guest", roomForm.extra_guest_lunch_price_per_guest);
    payload.append("extra_guest_dinner_price_per_guest", roomForm.extra_guest_dinner_price_per_guest);
    if (roomImageFile) {
      payload.append("room_image", roomImageFile);
    }
    return payload;
  };

  const handleSubmitUserForm = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || currentRole !== "admin" || !userModalMode) return;

    if (!userForm.first_name || !userForm.last_name || !userForm.username || !userForm.email || !userForm.contact || !userForm.address) {
      setUserFormError("Please complete all required fields.");
      return;
    }
    if (userModalMode === "create" && !isStrongPassword(userForm.password)) {
      setUserFormError("Password must be at least 8 characters and include uppercase, lowercase, and a special character.");
      return;
    }

    setUserFormLoading(true);
    setUserFormError("");
    setUserActionId(editingUser?.id || null);
    try {
      const payload =
        userModalMode === "create"
          ? userForm
          : {
              first_name: userForm.first_name,
              middle_name: userForm.middle_name,
              last_name: userForm.last_name,
              username: userForm.username,
              email: userForm.email,
              contact: userForm.contact,
              address: userForm.address,
              gender: userForm.gender,
            };

      const res = await fetch(
        userModalMode === "create" ? `${API}/user/users/` : `${API}/user/users/${editingUser?.id}/`,
        {
          method: userModalMode === "create" ? "POST" : "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setUserFormError(parseError(data, userModalMode === "create" ? "Failed to create user." : "Failed to update user."));
        return;
      }
      await refreshAdminData();
      closeUserModal();
      setActionMsg(typeof data.message === "string" ? data.message : userModalMode === "create" ? "User created successfully." : "User updated successfully.");
      setTimeout(() => setActionMsg(""), 3000);
    } finally {
      setUserActionId(null);
      setUserFormLoading(false);
    }
  };

  const handleSubmitRoomForm = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !roomModalMode) return;

    if (!roomForm.name.trim() || !roomForm.room_number.trim() || !roomForm.price_per_night) {
      setRoomFormError("Please complete the room name, number, and nightly rate.");
      return;
    }

    setRoomFormLoading(true);
    setRoomFormError("");
    setRoomActionId(editingRoom?.id || null);
    try {
      const payload = buildRoomPayload();
      const res = await fetch(
        roomModalMode === "create" ? `${API}/hotelroom/rooms/admin/` : `${API}/hotelroom/rooms/admin/${editingRoom?.id}/`,
        {
          method: roomModalMode === "create" ? "POST" : "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: payload,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setRoomFormError(parseError(data, roomModalMode === "create" ? "Failed to create room." : "Failed to update room."));
        return;
      }
      fetchRooms();
      closeRoomModal();
      setActionMsg(roomModalMode === "create" ? "Room added successfully." : "Room updated successfully.");
      setTimeout(() => setActionMsg(""), 3000);
    } finally {
      setRoomActionId(null);
      setRoomFormLoading(false);
    }
  };

  const handleRoomStatusChange = async (id: number, status: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setRoomActionId(id);
    try {
      const res = await fetch(`${API}/hotelroom/rooms/admin/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(parseError(data, "Failed to update room status."));
        return;
      }
      setRooms(prev => prev.map(room => room.id === id ? data : room));
      setActionMsg("Room status updated.");
      setTimeout(() => setActionMsg(""), 2500);
    } finally {
      setRoomActionId(null);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token || currentRole !== "admin") return;
    if (!window.confirm(`Delete room #${id}?`)) return;
    setRoomActionId(id);
    try {
      const res = await fetch(`${API}/hotelroom/rooms/admin/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(parseError(data, "Failed to delete room."));
        return;
      }
      setRooms(prev => prev.filter(room => room.id !== id));
      setActionMsg("Room deleted successfully.");
      setTimeout(() => setActionMsg(""), 3000);
    } finally {
      setRoomActionId(null);
    }
  };

  const handleDeleteUser = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token || currentRole !== "admin") return;
    if (!window.confirm(`Delete user #${id}?`)) return;
    setUserActionId(id);
    try {
      const res = await fetch(`${API}/user/users/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(parseError(data, "Failed to delete user."));
        return;
      }
      await refreshAdminData();
      setActionMsg("User deleted successfully.");
      setTimeout(() => setActionMsg(""), 3000);
    } finally {
      setUserActionId(null);
    }
  };

  const handleSetPassword = async () => {
    if (!pwdUser) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setPwdError(""); setPwdSuccess("");
    if (!isStrongPassword(pwdForm.new_password)) { setPwdError("Password must be at least 8 characters and include uppercase, lowercase, and a special character."); return; }
    if (pwdForm.new_password !== pwdForm.confirm_password) { setPwdError("Passwords do not match."); return; }
    setPwdLoading(true);
    try {
      const res = await fetch(`${API}/user/users/${pwdUser.id}/set-password/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(pwdForm),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(data.error || "Failed to update password."); return; }
      setPwdSuccess(data.message || "Password updated successfully.");
      setPwdForm({ new_password: "", confirm_password: "" });
      setTimeout(() => { setPwdUser(null); setPwdSuccess(""); }, 1500);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    setCancelling(id);
    try {
      const res = await fetch(`${API}/hotelroom/bookings/admin/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        // Remove from bookings list
        setBookings(prev => prev.filter(b => b.id !== id));
        
        // Close modal if this booking was selected
        if (selectedBooking?.id === id) {
          setSelectedBooking(null);
        }
        
        setActionMsg("Booking deleted successfully.");
        setTimeout(() => setActionMsg(""), 3000);
      } else {
        const errorData = await res.json().catch(() => null);
        alert(parseError(errorData, "Failed to delete booking."));
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking. Please try again.');
    } finally {
      setCancelling(null);
      setCancelConfirm(null);
    }
  };

  const handleBookingStatus = async (id: number, status: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    setSelectedBooking(prev => prev?.id === id ? { ...prev, status: 'updating...' } : prev);
    
    try {
      const res = await fetch(`${API}/hotelroom/bookings/admin/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(parseError(data, "Failed to update booking."));
        return;
      }
      
      // Send confirmation email if status is confirmed
      if (status === "confirmed") {
        try {
          await sendBookingEmail({
            status: "confirmed",
            booking: data,
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }
      
      // Update bookings list
      setBookings(prev => prev.map(b => b.id === id ? data : b));
      if (selectedBooking?.id === id) setSelectedBooking(data);
      
      setActionMsg(`Booking ${status === 'confirmed' ? 'confirmed and email sent to customer' : `marked as ${status}`}.`);
      setTimeout(() => setActionMsg(""), 3000);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking. Please try again.');
    } finally {
      setSelectedBooking(prev => prev?.id === id ? { ...prev, status: status } : prev);
    }
  };

  const handleCancellationDecision = async (id: number, decision: "approve" | "reject") => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch(`${API}/hotelroom/bookings/admin/${id}/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_action: decision }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(parseError(data, "Failed to update booking."));
      return;
    }
    setBookings(prev => prev.map(b => b.id === id ? data : b));
    if (selectedBooking?.id === id) setSelectedBooking(data);
    setActionMsg(decision === "approve" ? "Cancellation request approved." : "Cancellation request rejected.");
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
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "linear-gradient(rgba(250, 249, 246, 0.86), rgba(250, 249, 246, 0.86)), url('/che.jpg')",
        backgroundColor: "#faf9f6",
      }}
    >
      <p className="text-[#71867e] tracking-widest text-sm">Loading...</p>
    </div>
  );

  const unreadCount = messages.filter(m => m.status === "unread").length;
  const regularUsers = users.filter(u => u.role === "user");
  const staffUsers = users.filter(u => u.role === "staff");
  const nonAdminUsers = users.filter(u => u.role !== "admin");

  const stats = [
    { label: "Total Users",    value: adminData?.total_users  ?? 0, color: "#1c352c" },
    { label: "Total Staff",    value: adminData?.total_staff  ?? 0, color: "#4a6358" },
    { label: "Total Admins",   value: adminData?.total_admins ?? 0, color: "#71867e" },
    { label: "Total Bookings", value: bookings.length,              color: "#132222" },
  ];

  const filteredBookings = bookings.filter(booking => {
    const query = bookingRefQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      String(booking.id),
      booking.reference_number || "",
      booking.user_name || "",
      booking.room_name || "",
      booking.room_number || "",
    ].some(value => value.toLowerCase().includes(query));
  });

  return (
    <div
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "linear-gradient(rgba(250, 249, 246, 0.9), rgba(250, 249, 246, 0.9)), url('/che.jpg')",
        backgroundColor: "#faf9f6",
        color: "#1c352c",
      }}
    >

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 py-5" style={{ backgroundColor: "#132222" }}>
        <Link href="/admin-dashboard" className="text-white tracking-[0.3em] text-lg font-light">PHINAS HOTEL</Link>
        <div className="flex gap-6 items-center">
          <span className="text-[#71867e] text-xs tracking-widest uppercase">Admin Panel</span>
          <button
            onClick={handleLogout}
            className="text-xs tracking-widest px-4 py-2 border border-[#71867e] text-[#d4d7c7] hover:bg-[#71867e] transition"
          >
            LOGOUT
          </button>
        </div>
      </nav>

      <div className="pt-28 pb-20 max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-1">Administration</p>
          <h1 className="text-3xl md:text-4xl font-thin tracking-[0.2em]">ADMIN DASHBOARD</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#d4d7c7] mb-8">
          {(["overview", "users", "rooms", "bookings", "messages", "ratings"] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`relative px-6 py-3 text-xs tracking-[0.3em] uppercase transition border-b-2 -mb-px ${
                tab === t ? "border-[#1c352c] text-[#1c352c] font-semibold" : "border-transparent text-[#71867e] hover:text-[#1c352c]"
              }`}
            >
              {t === "overview" ? "Overview" : t === "users" ? "Users" : t === "rooms" ? "Rooms" : t === "bookings" ? "Bookings" : t === "messages" ? "Messages" : "Ratings"}
              {t === "messages" && unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-red-500 text-white font-bold">{unreadCount}</span>
              )}
              {t === "ratings" && newRatingsCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-purple-500 text-white font-bold">{newRatingsCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="flex flex-col gap-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map(s => (
                <div key={s.label} className="p-6 border border-[#d4d7c7] text-center" style={PANEL_STYLE}>
                  <p className="text-3xl font-thin mb-1" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Manage Users",    action: () => handleTabChange("users") },
                { label: "Manage Rooms",    action: () => handleTabChange("rooms") },
                { label: "View Bookings",   action: () => handleTabChange("bookings") },
                { label: "Reply Messages",  action: () => handleTabChange("messages") },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="py-5 text-xs tracking-[0.3em] border border-[#d4d7c7] text-[#1c352c] hover:border-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                  style={PANEL_STYLE}
                >
                  {a.label.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Recent users preview */}
            <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
              <div className="px-6 py-4 border-b border-[#d4d7c7] flex justify-between items-center">
                <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Recent Users</p>
                <button onClick={() => handleTabChange("users")} className="text-[10px] tracking-widest text-[#1c352c] hover:underline">VIEW ALL</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ede6]">
                      {["Name", "Username", "Email", "Role"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nonAdminUsers.slice(0, 5).map(u => (
                      <tr key={u.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                        <td className="px-5 py-3">{u.first_name} {u.last_name}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.username}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] px-2 py-1 tracking-widest uppercase" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{u.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DINING TAB ── */}
        {tab === "dining" && (
          <div>
            {loadingDining && <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading dining data...</p>}
            <div className="mb-4 flex justify-end">
              <select
                value={diningView}
                onChange={e => setDiningView(e.target.value as "reservation" | "order")}
                className="border border-[#d4d7c7] bg-[#faf9f6] px-4 py-2 text-xs tracking-[0.2em] uppercase text-[#1c352c] outline-none focus:border-[#1c352c] transition"
              >
                <option value="reservation">Dining Reservation</option>
                <option value="order">Dining Order</option>
              </select>
            </div>

            {!loadingDining && diningView === "reservation" && diningReservations.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No dining reservations found.</p>
              </div>
            )}

            {!loadingDining && diningView === "order" && diningOrders.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No dining orders found.</p>
              </div>
            )}

            {!loadingDining && diningView === "reservation" && diningReservations.length > 0 && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7]">
                  <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Dining Reservations — {diningReservations.length} total</p>
                </div>
                <div className="overflow-x-auto">
                  {bookingRefQuery.trim() && filteredBookings.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <p className="text-xs uppercase tracking-[0.3em] text-[#71867e]">No booking found</p>
                      <p className="mt-3 text-sm text-[#4a6358]">Try a different reference number, booking ID, guest name, or room number.</p>
                    </div>
                  ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0ede6]">
                        {["#", "Customer", "Username", "Email", "Phone", "Date", "Time", "Guests", "Status", "Notes"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diningReservations.map((reservation, i) => (
                        <tr key={reservation.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                          <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{reservation.name}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{reservation.user_name}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{reservation.email}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{reservation.phone || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{reservation.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{reservation.time}</td>
                          <td className="px-4 py-3">{reservation.guests}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase whitespace-nowrap ${STATUS_STYLE[reservation.status] || "bg-gray-100 text-gray-600"}`}>
                              {reservation.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#71867e] min-w-[220px]">{reservation.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            )}

            {!loadingDining && diningView === "order" && diningOrders.length > 0 && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7]">
                  <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Dining Orders â€” {diningOrders.length} total</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0ede6]">
                        {["#", "Username", "Room", "Date", "Time", "Guests", "Total", "Payable", "Status", "Notes"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diningOrders.map((order, i) => (
                        <tr key={order.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                          <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{order.user_name}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">
                            {order.booking_room_name ? `${order.booking_room_name}${order.booking_room_number ? ` · ${order.booking_room_number}` : ""}` : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{order.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{order.time}</td>
                          <td className="px-4 py-3">{order.guests}</td>
                          <td className="px-4 py-3 whitespace-nowrap">₱{Number(order.total).toLocaleString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap">₱{Number(order.payable_total).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase whitespace-nowrap ${STATUS_STYLE[order.status] || "bg-gray-100 text-gray-600"}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#71867e] min-w-[220px]">{order.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="flex flex-col gap-8">
            <div className="flex border-b border-[#d4d7c7]">
              {(["users", "staff"] as const).map(section => (
                <button
                  key={section}
                  onClick={() => setUserSectionTab(section)}
                  className={`relative px-6 py-3 text-xs tracking-[0.3em] uppercase transition border-b-2 -mb-px ${
                    userSectionTab === section ? "border-[#1c352c] text-[#1c352c] font-semibold" : "border-transparent text-[#71867e] hover:text-[#1c352c]"
                  }`}
                >
                  {section === "users" ? `Users (${regularUsers.length})` : `Staff (${staffUsers.length})`}
                </button>
              ))}
            </div>

            {userSectionTab === "users" && (
            <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
              <div className="px-6 py-4 border-b border-[#d4d7c7] flex items-center justify-between gap-4">
                <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">
                  Registered Users — {regularUsers.length} total
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ede6]">
                      {["#", "Name", "Username", "Email", "Contact", "Gender", "Role", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.map((u, i) => (
                      <tr key={u.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                        <td className="px-5 py-3 text-[#71867e] text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium">{u.first_name} {u.last_name}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.username}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.email}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.contact || "—"}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.gender || "—"}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] px-2 py-1 tracking-widest uppercase" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3">
                          {currentRole === "admin" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditUserModal(u)}
                                disabled={userActionId === u.id}
                                className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition disabled:opacity-50"
                              >
                                EDIT
                              </button>
                              <button
                                onClick={() => { setPwdUser(u); setPwdForm({ new_password: "", confirm_password: "" }); setPwdError(""); setPwdSuccess(""); }}
                                className="text-[10px] tracking-widest px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white transition whitespace-nowrap"
                              >
                                SET PWD
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={userActionId === u.id}
                                className="text-[10px] tracking-widest px-3 py-1 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                              >
                                DELETE
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#71867e]">View only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {userSectionTab === "staff" && (
            <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
              <div className="px-6 py-4 border-b border-[#d4d7c7] flex items-center justify-between gap-4">
                <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">
                  Staff Accounts — {staffUsers.length} total
                </p>
                {currentRole === "admin" && (
                  <button
                    onClick={openCreateUserModal}
                    className="text-[10px] tracking-widest px-3 py-2 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                  >
                    CREATE STAFF
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0ede6]">
                      {["#", "Name", "Username", "Email", "Contact", "Gender", "Role", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((u, i) => (
                      <tr key={u.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                        <td className="px-5 py-3 text-[#71867e] text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium">{u.first_name} {u.last_name}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.username}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.email}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.contact || "—"}</td>
                        <td className="px-5 py-3 text-[#71867e]">{u.gender || "—"}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] px-2 py-1 tracking-widest uppercase" style={{ backgroundColor: "#d4d7c7", color: "#1c352c" }}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3">
                          {currentRole === "admin" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditUserModal(u)}
                                disabled={userActionId === u.id}
                                className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition disabled:opacity-50"
                              >
                                EDIT
                              </button>
                              <button
                                onClick={() => { setPwdUser(u); setPwdForm({ new_password: "", confirm_password: "" }); setPwdError(""); setPwdSuccess(""); }}
                                className="text-[10px] tracking-widest px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white transition whitespace-nowrap"
                              >
                                SET PWD
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={userActionId === u.id}
                                className="text-[10px] tracking-widest px-3 py-1 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                              >
                                DELETE
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#71867e]">View only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {tab === "rooms" && (
          <div>
            {loadingRooms && <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading rooms...</p>}
            {!loadingRooms && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7] flex items-center justify-between gap-4">
                  <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Room Management — {rooms.length} total</p>
                  <button
                    onClick={openCreateRoomModal}
                    className="text-[10px] tracking-widest px-3 py-2 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition"
                  >
                    ADD ROOM
                  </button>
                </div>
                {rooms.length === 0 ? (
                  <div className="text-center py-20 border-t border-dashed border-[#d4d7c7]">
                    <p className="text-[#71867e] tracking-widest text-sm">No rooms found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#f0ede6]">
                          {["#", "Room", "Type", "Status", "Capacity", "Price", "Rating", "Reviews", "Floor", "Actions"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((room, i) => (
                          <tr key={room.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                            <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium whitespace-nowrap">{room.name}</p>
                              <p className="text-xs text-[#71867e]">#{room.room_number}</p>
                            </td>
                            <td className="px-4 py-3 text-[#71867e] uppercase">{room.room_type}</td>
                            <td className="px-4 py-3">
                              <select
                                value={room.status}
                                onChange={e => handleRoomStatusChange(room.id, e.target.value)}
                                disabled={roomActionId === room.id}
                                className="text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase border border-[#d4d7c7] bg-[#faf9f6] outline-none disabled:opacity-50"
                              >
                                {ROOM_STATUS_OPTIONS.map(option => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-[#71867e]">{room.capacity}</td>
                            <td className="px-4 py-3 whitespace-nowrap">₱{Number(room.price_per_night).toLocaleString()}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#71867e]">
                              {room.avg_rating ? `${room.avg_rating.toFixed(1)}/5` : "New"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#71867e]">
                              {room.rating_count || 0}
                            </td>
                            <td className="px-4 py-3 text-[#71867e]">{room.floor}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditRoomModal(room)}
                                  disabled={roomActionId === room.id}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition disabled:opacity-50"
                                >
                                  EDIT
                                </button>
                                {currentRole === "admin" && (
                                  <button
                                    onClick={() => handleDeleteRoom(room.id)}
                                    disabled={roomActionId === room.id}
                                    className="text-[10px] tracking-widest px-3 py-1 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                                  >
                                    DELETE
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" && (
          <div>
            {loadingMsgs && <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading messages...</p>}
            {!loadingMsgs && messages.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No contact messages yet.</p>
              </div>
            )}
            {!loadingMsgs && messages.length > 0 && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7] flex justify-between items-center">
                  <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Contact Messages — {messages.length} total</p>
                  {unreadCount > 0 && <span className="text-xs text-red-500 tracking-widest">{unreadCount} unread</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0ede6]">
                        {["#", "Name", "Email", "Subject", "Date", "Status", "Reply", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((m, i) => (
                        <tr key={m.id} className={`border-b border-[#f0ede6] transition ${m.status === "unread" ? "bg-[rgba(254,249,195,0.6)]" : "hover:bg-[rgba(250,249,246,0.42)]"}`}>
                          <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{m.name}</td>
                          <td className="px-4 py-3 text-[#71867e]">{m.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{m.subject}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{new Date(m.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase ${MSG_STATUS_STYLE[m.status] || "bg-gray-100 text-gray-600"}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{m.reply ? "Saved" : "Pending"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setSelectedMsg(m); if (m.status === "unread") handleMsgStatus(m.id, "read"); }}
                                className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition whitespace-nowrap"
                              >VIEW</button>
                              <button
                                onClick={() => setDeleteMsgId(m.id)}
                                className="text-[10px] tracking-widest px-3 py-1 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                              >DELETE</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === "ratings" && (
          <div>
            {loadingRatings && <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading ratings...</p>}
            {!loadingRatings && ratings.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No customer ratings yet.</p>
              </div>
            )}
            {!loadingRatings && ratings.length > 0 && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7] flex justify-between items-center">
                  <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Customer Ratings â€” {ratings.length} total</p>
                  <p className="text-xs text-[#71867e] tracking-widest">Live from database</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0ede6]">
                        {["#", "Customer", "Room", "Booking", "Stars", "Comment", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ratings.map((rating, i) => (
                        <tr key={rating.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] align-top">
                          <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium">{rating.user_name}</div>
                            <div className="text-xs text-[#71867e]">#{rating.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{rating.room_name}</div>
                            <div className="text-xs text-[#71867e]">Room {rating.room_number}</div>
                          </td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{rating.booking ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="rounded-full bg-[#faf7f0] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#c48a3a]">
                              {rating.stars}/5
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#4a6358] max-w-md">{rating.comment || "No comment left."}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{new Date(rating.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "bookings" && (
          <div>
            {actionMsg && (
              <div className="mb-4 px-4 py-3 text-xs tracking-wide text-emerald-700 border border-emerald-200 bg-[rgba(236,253,245,0.75)] backdrop-blur-sm">{actionMsg}</div>
            )}

            {loadingBookings && (
              <p className="text-center text-[#71867e] py-20 tracking-widest text-sm">Loading bookings...</p>
            )}

            {!loadingBookings && bookingLoadError && (
              <div className="mb-4 px-4 py-3 text-xs tracking-wide text-red-700 border border-red-200 bg-[rgba(254,242,242,0.78)] backdrop-blur-sm">
                {bookingLoadError}
              </div>
            )}

            {!loadingBookings && !bookingLoadError && bookings.length === 0 && (
              <div className="text-center py-20 border border-dashed border-[#d4d7c7]">
                <p className="text-[#71867e] tracking-widest text-sm">No bookings found.</p>
              </div>
            )}

            {!loadingBookings && !bookingLoadError && bookings.length > 0 && (
              <div className="border border-[#d4d7c7]" style={PANEL_STYLE}>
                <div className="px-6 py-4 border-b border-[#d4d7c7] flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">All Bookings — {bookings.length} total</p>
                    {bookingRefQuery.trim() && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#71867e]">
                        Showing {filteredBookings.length} match{filteredBookings.length === 1 ? "" : "es"}
                      </p>
                    )}
                  </div>
                  <div className="w-full md:max-w-sm">
                    <label className="mb-1 block text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Find by reference</label>
                    <input
                      value={bookingRefQuery}
                      onChange={e => setBookingRefQuery(e.target.value)}
                      placeholder="Enter booking reference or ID"
                      className="w-full border border-[#d4d7c7] bg-[#faf9f6] px-4 py-2 text-sm outline-none transition focus:border-[#1c352c]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0ede6]">
                        {["#", "Guest", "Reference", "Room", "Check-in", "Check-out", "Nights", "Total", "Status", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.3em] uppercase text-[#71867e] font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b, i) => (
                        <tr key={b.id} className="border-b border-[#f0ede6] hover:bg-[rgba(250,249,246,0.42)] transition">
                          <td className="px-4 py-3 text-[#71867e] text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{b.user_name}</td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">
                            <div className="text-xs uppercase tracking-[0.22em]">#{b.reference_number || "N/A"}</div>
                            <div className="text-[10px] text-[#a0b0a8]">Use this to verify check-in</div>
                          </td>
                          <td className="px-4 py-3 text-[#71867e] whitespace-nowrap">{b.room_name} <span className="text-xs">#{b.room_number}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap">{fmtStay(b.check_in, b.check_in_time || "2:00 PM")}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{fmtStay(b.check_out, b.check_out_time || "12:00 PM")}</td>
                          <td className="px-4 py-3">{nights(b.check_in, b.check_out)}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">₱{Number(b.total_price).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold tracking-widest uppercase whitespace-nowrap ${STATUS_STYLE[getBookingStatusBadge(b).key] || "bg-gray-100 text-gray-600"}`}>
                              {getBookingStatusBadge(b).label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="text-[10px] tracking-widest px-3 py-1 border border-[#1c352c] text-[#1c352c] hover:bg-[#1c352c] hover:text-white transition whitespace-nowrap"
                              >
                                DETAILS
                              </button>
                              {b.cancel_request_status === "requested" ? (
                                <>
                                  <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-left">
                                    <p className="text-[10px] tracking-[0.3em] uppercase text-amber-700">Cancellation reason</p>
                                    <p className="mt-1 text-xs leading-5 text-amber-900">
                                      {b.cancel_request_reason || "No reason provided."}
                                    </p>
                                    {b.cancel_requested_at && (
                                      <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-amber-700">
                                        Requested {fmt(b.cancel_requested_at)}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCancellationDecision(b.id, "approve")}
                                    className="text-[10px] tracking-widest px-3 py-1 border border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white transition whitespace-nowrap"
                                  >
                                    APPROVE IF REASONABLE
                                  </button>
                                  <button
                                    onClick={() => handleCancellationDecision(b.id, "reject")}
                                    className="text-[10px] tracking-widest px-3 py-1 border border-amber-400 text-amber-600 hover:bg-amber-500 hover:text-white transition whitespace-nowrap"
                                  >
                                    KEEP BOOKING
                                  </button>
                                </>
                              ) : b.status === "pending" ? (
                                <button
                                  onClick={() => handleBookingStatus(b.id, "confirmed")}
                                  disabled={cancelling === b.id}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white transition whitespace-nowrap disabled:opacity-50"
                                >
                                  {cancelling === b.id ? "UPDATING..." : "CONFIRM"}
                                </button>
                              ) : b.status === "confirmed" ? (
                                <button
                                  onClick={() => handleBookingStatus(b.id, "checked_in")}
                                  disabled={cancelling === b.id}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-sky-400 text-sky-600 hover:bg-sky-500 hover:text-white transition whitespace-nowrap disabled:opacity-50"
                                >
                                  {cancelling === b.id ? "UPDATING..." : "CHECK IN"}
                                </button>
                              ) : b.status === "checked_in" ? (
                                <button
                                  onClick={() => handleBookingStatus(b.id, "checked_out")}
                                  disabled={cancelling === b.id}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-indigo-400 text-indigo-600 hover:bg-indigo-500 hover:text-white transition whitespace-nowrap disabled:opacity-50"
                                >
                                  {cancelling === b.id ? "UPDATING..." : "CHECK OUT"}
                                </button>
                              ) : b.status === "checked_out" ? (
                                <>
                                  <button
                                    disabled={true}
                                    className="text-[10px] tracking-widest px-3 py-1 border border-gray-400 text-gray-500 bg-gray-100 cursor-not-allowed whitespace-nowrap opacity-50"
                                  >
                                    CHECKED OUT
                                  </button>
                                  <button
                                    onClick={() => handleBookingStatus(b.id, "completed")}
                                    disabled={cancelling === b.id}
                                    className="text-[10px] tracking-widest px-3 py-1 border border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white transition whitespace-nowrap disabled:opacity-50"
                                  >
                                    {cancelling === b.id ? "UPDATING..." : "COMPLETE"}
                                  </button>
                                </>
                              ) : b.status === "completed" ? (
                                <button
                                  disabled={true}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-gray-400 text-gray-500 bg-gray-100 cursor-not-allowed whitespace-nowrap opacity-50"
                                >
                                  COMPLETED
                                </button>
                              ) : null}
                              <button
                                onClick={() => setRatingBooking(b)}
                                className="text-[10px] tracking-widest px-3 py-1 border border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white transition whitespace-nowrap"
                              >
                                RATE
                              </button>
                              {b.status !== "cancelled" && b.cancel_request_status !== "requested" && (
                                <button
                                  onClick={() => setCancelConfirm(b.id)}
                                  disabled={cancelling === b.id}
                                  className="text-[10px] tracking-widest px-3 py-1 border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition whitespace-nowrap disabled:opacity-50"
                                >
                                  {cancelling === b.id ? "DELETING..." : "DELETE"}
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
          </div>
        )}
      </div>

      {/* ── BOOKING DETAIL MODAL ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-md shadow-2xl overflow-hidden" style={MODAL_STYLE}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Booking #{selectedBooking.id}</p>
                <p className="text-white font-light tracking-[0.15em]">{selectedBooking.room_name}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-[#71867e]">Guest: <span className="text-[#1c352c] font-medium">{selectedBooking.user_name}</span></p>
                <span className={`text-[10px] px-3 py-1 rounded-full font-semibold tracking-widest uppercase ${STATUS_STYLE[getBookingStatusBadge(selectedBooking).key] || "bg-gray-100 text-gray-600"}`}>
                  {getBookingStatusBadge(selectedBooking).label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Reference Number", selectedBooking.reference_number || "N/A"],
                  ["Room Number",  selectedBooking.room_number],
                  ["Guests",       String(selectedBooking.guests)],
                  ["Check-in",     fmtStay(selectedBooking.check_in, selectedBooking.check_in_time || "2:00 PM")],
                  ["Check-out",    fmtStay(selectedBooking.check_out, selectedBooking.check_out_time || "12:00 PM")],
                  ["Nights",       String(nights(selectedBooking.check_in, selectedBooking.check_out))],
                  ["Booked on",    fmt(selectedBooking.created_at)],
                ].map(([l, v]) => (
                  <div key={l} className="border-b border-[#e8e4dc] pb-2">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">{l}</p>
                    <p className="text-[#1c352c]">{v}</p>
                  </div>
                ))}
              </div>

              {selectedBooking.special_requests && (
                <div className="border-b border-[#e8e4dc] pb-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-1">Special Requests</p>
                  <p className="text-sm text-[#4a6358]">{selectedBooking.special_requests}</p>
                </div>
              )}

              {selectedBooking.cancel_request_status === "requested" && selectedBooking.cancel_request_reason && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-1">Cancellation Comment</p>
                  <p>{selectedBooking.cancel_request_reason}</p>
                  {selectedBooking.cancel_requested_at && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-amber-700">
                      Requested {fmt(selectedBooking.cancel_requested_at)}
                    </p>
                  )}
                </div>
              )}

              {(selectedBooking.payment || selectedBooking.reference_number) && (
                <div className="border border-[#d4d7c7] bg-white/70 px-4 py-3 text-sm">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Payment Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Method</p>
                      <p className="text-[#1c352c] font-medium">
                        {selectedBooking.payment?.method
                          ? selectedBooking.payment.method.toUpperCase()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Reference</p>
                      <p className="text-[#1c352c] font-medium break-all">
                        {selectedBooking.payment?.reference_number || selectedBooking.reference_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Status</p>
                      <p className="text-[#1c352c] font-medium">
                        {selectedBooking.payment?.status || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Amount Due</p>
                      <p className="text-[#1c352c] font-medium">
                        ₱{Number(selectedBooking.payment?.amount || selectedBooking.total_price).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">Amount Sent</p>
                      <p className="text-[#1c352c] font-medium">
                        {selectedBooking.payment?.sent_amount
                          ? `₱${Number(selectedBooking.payment.sent_amount).toLocaleString()}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  {selectedBooking.payment?.method?.toLowerCase() === "gcash" && (
                    <p className="mt-3 text-xs text-emerald-700">
                      GCash payment detected. Please verify the reference number before confirming the booking.
                    </p>
                  )}
                  {selectedBooking.payment?.method?.toLowerCase() === "gcash" && selectedBooking.payment?.sent_amount && Number(selectedBooking.payment.sent_amount) !== Number(selectedBooking.total_price) && (
                    <p className="mt-2 text-xs text-amber-700">
                      The amount sent does not match the booking total. Please double-check before confirming.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <p className="text-xs tracking-widest text-[#71867e]">TOTAL AMOUNT</p>
                <p className="text-2xl font-light">₱{Number(selectedBooking.total_price).toLocaleString()}</p>
              </div>

              <div className="flex gap-3 pt-1">
                {selectedBooking.cancel_request_status === "requested" ? (
                  <>
                    <button
                      onClick={() => handleCancellationDecision(selectedBooking.id, "approve")}
                      className="flex-1 py-3 text-xs tracking-[0.25em] border border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                    >
                      APPROVE IF REASONABLE
                    </button>
                    <button
                      onClick={() => handleCancellationDecision(selectedBooking.id, "reject")}
                      className="flex-1 py-3 text-xs tracking-[0.25em] border border-amber-400 text-amber-600 hover:bg-amber-500 hover:text-white transition"
                    >
                      KEEP BOOKING
                    </button>
                  </>
                ) : selectedBooking.status === "pending" ? (
                  <button
                    onClick={() => handleBookingStatus(selectedBooking.id, "confirmed")}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-blue-400 text-blue-600 hover:bg-blue-500 hover:text-white transition"
                  >
                    CONFIRM
                  </button>
                ) : selectedBooking.status === "confirmed" ? (
                  <button
                    onClick={() => handleBookingStatus(selectedBooking.id, "checked_in")}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-sky-400 text-sky-600 hover:bg-sky-500 hover:text-white transition"
                  >
                    CHECK IN
                  </button>
                ) : selectedBooking.status === "checked_in" ? (
                  <button
                    onClick={() => handleBookingStatus(selectedBooking.id, "checked_out")}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-indigo-400 text-indigo-600 hover:bg-indigo-500 hover:text-white transition"
                  >
                    CHECK OUT
                  </button>
                ) : selectedBooking.status === "checked_out" ? (
                  <>
                    <button
                      disabled={true}
                      className="flex-1 py-3 text-xs tracking-[0.25em] border border-gray-400 text-gray-500 bg-gray-100 cursor-not-allowed opacity-50"
                    >
                      CHECKED OUT
                    </button>
                    <button
                      onClick={() => handleBookingStatus(selectedBooking.id, "completed")}
                      className="flex-1 py-3 text-xs tracking-[0.25em] border border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                    >
                      COMPLETE
                    </button>
                  </>
                ) : selectedBooking.status === "completed" && (
                  <button
                    disabled={true}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-gray-400 text-gray-500 bg-gray-100 cursor-not-allowed opacity-50"
                  >
                    COMPLETED
                  </button>
                )}
                {currentRole === "admin" && selectedBooking.status !== "cancelled" && selectedBooking.cancel_request_status !== "requested" && (
                  <button
                    onClick={() => { setSelectedBooking(null); setCancelConfirm(selectedBooking.id); }}
                    className="flex-1 py-3 text-xs tracking-[0.25em] border border-red-400 text-red-500 hover:bg-red-500 hover:text-white transition"
                  >
                    DELETE BOOKING
                  </button>
                )}
                <button
                  onClick={() => { setRatingBooking(selectedBooking); setSelectedBooking(null); }}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-purple-400 text-purple-600 hover:bg-purple-500 hover:text-white transition"
                >
                  RATE BOOKING
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
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

      {/* ── MESSAGE DETAIL MODAL ── */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-lg shadow-2xl overflow-hidden" style={MODAL_STYLE}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Message #{selectedMsg.id}</p>
                <p className="text-white font-light tracking-[0.15em]">{selectedMsg.subject}</p>
              </div>
              <button onClick={() => setSelectedMsg(null)} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["From",    selectedMsg.name],
                  ["Email",   selectedMsg.email],
                  ["Phone",   selectedMsg.phone || "—"],
                  ["Received", new Date(selectedMsg.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })],
                ].map(([l, v]) => (
                  <div key={l} className="border-b border-[#e8e4dc] pb-2">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-0.5">{l}</p>
                    <p className="text-sm text-[#1c352c]">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Message</p>
                <p className="text-sm text-[#4a6358] leading-relaxed p-4 border border-[#e8e4dc] bg-[rgba(245,243,238,0.72)] backdrop-blur-sm">{selectedMsg.message}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Previous Reply</p>
                <p className="text-sm text-[#4a6358] leading-relaxed p-4 border border-[#e8e4dc] bg-[rgba(245,243,238,0.72)] backdrop-blur-sm">{selectedMsg.reply || "No reply yet."}</p>
                {selectedMsg.replied_by_name && (
                  <p className="text-xs text-[#71867e] mt-2">Replied by {selectedMsg.replied_by_name}{selectedMsg.replied_at ? ` on ${fmt(selectedMsg.replied_at)}` : ""}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e] mb-2">Write Reply</p>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply to the user..."
                  className="w-full border border-[#d4d7c7] px-4 py-3 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition resize-none placeholder-[#a0b0a8]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleReplyMessage}
                  disabled={replySaving || !replyText.trim()}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition disabled:opacity-40"
                >{replySaving ? "SENDING..." : "SEND REPLY"}</button>
                <button
                  onClick={() => { setSelectedMsg(null); setReplyText(""); }}
                  className="flex-1 py-3 text-xs tracking-[0.25em] transition"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#0e2419")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
                >CLOSE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MESSAGE CONFIRM ── */}
      {deleteMsgId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-sm p-8 shadow-2xl text-center" style={MODAL_STYLE}>
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Delete Message</p>
            <p className="text-sm text-[#4a6358] mb-6">Delete message #{deleteMsgId}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteMsgId(null)} className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition">CANCEL</button>
              <button onClick={() => handleDeleteMsg(deleteMsgId)} className="flex-1 py-3 text-xs tracking-[0.25em] bg-red-500 text-white hover:bg-red-600 transition">YES, DELETE</button>
            </div>
          </div>
        </div>
      )}

      {roomModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden" style={MODAL_STYLE}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">
                  {roomModalMode === "create" ? "Create Room" : "Edit Room"}
                </p>
                <p className="text-white font-light tracking-[0.15em]">
                  {roomModalMode === "create" ? "Add a new hotel room" : `${editingRoom?.name} #${editingRoom?.room_number}`}
                </p>
              </div>
              <button onClick={closeRoomModal} className="text-[#71867e] hover:text-white text-xl transition">×</button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Room Name</label>
                  <input value={roomForm.name} onChange={e => setRoomForm(p => ({ ...p, name: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Room Number</label>
                  <input value={roomForm.room_number} onChange={e => setRoomForm(p => ({ ...p, room_number: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Room Type</label>
                  <select value={roomForm.room_type} onChange={e => setRoomForm(p => ({ ...p, room_type: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition">
                    {ROOM_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Status</label>
                  <select value={roomForm.status} onChange={e => setRoomForm(p => ({ ...p, status: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition">
                    {ROOM_STATUS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Price Per Night</label>
                  <input type="number" min="0" value={roomForm.price_per_night} onChange={e => setRoomForm(p => ({ ...p, price_per_night: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Capacity</label>
                  <input type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm(p => ({ ...p, capacity: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Max Bookings</label>
                  <input type="number" min="1" value={roomForm.max_bookings} onChange={e => setRoomForm(p => ({ ...p, max_bookings: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Floor</label>
                  <input type="number" min="1" value={roomForm.floor} onChange={e => setRoomForm(p => ({ ...p, floor: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Free Food Guest Limit</label>
                  <input type="number" min="0" value={roomForm.free_food_guest_limit} onChange={e => setRoomForm(p => ({ ...p, free_food_guest_limit: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Price for Extra Guest in Room</label>
                  <input type="number" min="0" value={roomForm.extra_guest_fee_per_night} onChange={e => setRoomForm(p => ({ ...p, extra_guest_fee_per_night: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Regular Lunch Price</label>
                  <input type="number" min="0" value={roomForm.lunch_price_per_guest} onChange={e => setRoomForm(p => ({ ...p, lunch_price_per_guest: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Regular Dinner Price</label>
                  <input type="number" min="0" value={roomForm.dinner_price_per_guest} onChange={e => setRoomForm(p => ({ ...p, dinner_price_per_guest: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Extra Guest Lunch Price</label>
                  <input type="number" min="0" value={roomForm.extra_guest_lunch_price_per_guest} onChange={e => setRoomForm(p => ({ ...p, extra_guest_lunch_price_per_guest: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Extra Guest Dinner Price</label>
                  <input type="number" min="0" value={roomForm.extra_guest_dinner_price_per_guest} onChange={e => setRoomForm(p => ({ ...p, extra_guest_dinner_price_per_guest: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Image Upload</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.bmp,.tif,.tiff,.webp,.heic,.heif,.svg,.eps,.raw,.cr2,.cr3,.nef,.arw,.psd,.ai,.xcf,image/*"
                    onChange={e => setRoomImageFile(e.target.files?.[0] || null)}
                    className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition"
                  />
                  <p className="text-[11px] text-[#71867e]">Upload an image file, or keep the URL below as a fallback.</p>
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Image URL Fallback</label>
                  <input value={roomForm.image_url} onChange={e => setRoomForm(p => ({ ...p, image_url: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Amenities</label>
                  <input value={roomForm.amenities} onChange={e => setRoomForm(p => ({ ...p, amenities: e.target.value }))} placeholder="WiFi, TV, Aircon" className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Description</label>
                  <textarea rows={4} value={roomForm.description} onChange={e => setRoomForm(p => ({ ...p, description: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition resize-none" />
                </div>
                {roomFormError && <p className="md:col-span-2 text-xs text-red-500 tracking-wide">{roomFormError}</p>}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeRoomModal} className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition">
                CANCEL
              </button>
              <button
                onClick={handleSubmitRoomForm}
                disabled={roomFormLoading}
                className="flex-1 py-3 text-xs tracking-[0.25em] transition disabled:opacity-50"
                style={{ backgroundColor: "#1c352c", color: "#fff" }}
                onMouseEnter={e => !roomFormLoading && (e.currentTarget.style.backgroundColor = "#0e2419")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
              >
                {roomFormLoading ? "SAVING..." : roomModalMode === "create" ? "CREATE ROOM" : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {userModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden" style={MODAL_STYLE}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">
                  {userModalMode === "create" ? "Create Account" : "Edit Account"}
                </p>
                <p className="text-white font-light tracking-[0.15em]">
                  {userModalMode === "create" ? "Add Staff Account" : `${editingUser?.first_name} ${editingUser?.last_name}`}
                </p>
              </div>
              <button onClick={closeUserModal} className="text-[#71867e] hover:text-white text-xl transition">×</button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">First Name</label>
                <input value={userForm.first_name} onChange={e => setUserForm(p => ({ ...p, first_name: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Middle Name</label>
                <input value={userForm.middle_name} onChange={e => setUserForm(p => ({ ...p, middle_name: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Last Name</label>
                <input value={userForm.last_name} onChange={e => setUserForm(p => ({ ...p, last_name: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Username</label>
                <input value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Contact</label>
                <input value={userForm.contact} onChange={e => setUserForm(p => ({ ...p, contact: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Gender</label>
                <select value={userForm.gender} onChange={e => setUserForm(p => ({ ...p, gender: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Role</label>
                <input value="Staff" readOnly className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[rgba(245,243,238,0.72)] text-[#4a6358] outline-none" />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Address</label>
                <textarea rows={3} value={userForm.address} onChange={e => setUserForm(p => ({ ...p, address: e.target.value }))} className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition resize-none" />
              </div>
              {userModalMode === "create" && (
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Password</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Create secure password" className="border border-[#d4d7c7] px-4 py-3 text-sm bg-[#faf9f6] outline-none focus:border-[#1c352c] transition" />
                  <p className="text-[11px] text-[#71867e]">Use at least 8 characters with uppercase, lowercase, and a special character.</p>
                </div>
              )}
              <div className="md:col-span-2 rounded-sm border border-[#d4d7c7] bg-[rgba(245,243,238,0.72)] px-4 py-3 text-xs text-[#4a6358]">
                This admin form creates staff accounts only. Staff use the normal login form on the home page and are redirected to the staff dashboard automatically.
              </div>
              {userFormError && <p className="md:col-span-2 text-xs text-red-500 tracking-wide">{userFormError}</p>}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={closeUserModal} className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition">
                CANCEL
              </button>
              <button
                onClick={handleSubmitUserForm}
                disabled={userFormLoading}
                className="flex-1 py-3 text-xs tracking-[0.25em] transition disabled:opacity-50"
                style={{ backgroundColor: "#1c352c", color: "#fff" }}
                onMouseEnter={e => !userFormLoading && (e.currentTarget.style.backgroundColor = "#0e2419")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
              >
                {userFormLoading ? "SAVING..." : userModalMode === "create" ? "CREATE ACCOUNT" : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET PASSWORD MODAL ── */}
      {pwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-sm shadow-2xl overflow-hidden" style={MODAL_STYLE}>
            <div className="px-6 py-5 border-b border-[#d4d7c7] flex justify-between items-center" style={{ backgroundColor: "#132222" }}>
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#71867e]">Set Password</p>
                <p className="text-white font-light tracking-[0.15em]">{pwdUser.first_name} {pwdUser.last_name} <span className="text-[#71867e] text-xs">({pwdUser.role})</span></p>
              </div>
              <button onClick={() => setPwdUser(null)} className="text-[#71867e] hover:text-white text-xl transition">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">New Password</label>
                <input
                  type="password"
                  value={pwdForm.new_password}
                  onChange={e => setPwdForm(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="border border-[#d4d7c7] px-4 py-3 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">Confirm Password</label>
                <input
                  type="password"
                  value={pwdForm.confirm_password}
                  onChange={e => setPwdForm(p => ({ ...p, confirm_password: e.target.value }))}
                  placeholder="Repeat password"
                  className="border border-[#d4d7c7] px-4 py-3 text-sm text-[#1c352c] bg-[#faf9f6] outline-none focus:border-[#1c352c] transition"
                />
              </div>
              <p className="text-[11px] text-[#71867e]">Use at least 8 characters with uppercase, lowercase, and a special character.</p>
              {pwdError && <p className="text-xs text-red-500 tracking-wide">{pwdError}</p>}
              {pwdSuccess && <p className="text-xs text-emerald-600 tracking-wide">{pwdSuccess}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPwdUser(null)}
                  className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSetPassword}
                  disabled={pwdLoading}
                  className="flex-1 py-3 text-xs tracking-[0.25em] transition disabled:opacity-50"
                  style={{ backgroundColor: "#1c352c", color: "#fff" }}
                  onMouseEnter={e => !pwdLoading && (e.currentTarget.style.backgroundColor = "#0e2419")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1c352c")}
                >
                  {pwdLoading ? "SAVING..." : "SAVE PASSWORD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RATING MODAL ── */}
      {ratingBooking && (
        <RatingModal
          booking={ratingBooking}
          onClose={() => setRatingBooking(null)}
          onSuccess={(message) => {
            setActionMsg(message);
            setTimeout(() => setActionMsg(""), 3000);
          }}
        />
      )}

      {/* ── CANCEL CONFIRM MODAL ── */}
      {cancelConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(19,34,34,0.7)" }}>
          <div className="w-full max-w-sm p-8 shadow-2xl text-center" style={MODAL_STYLE}>
            <p className="text-xs tracking-[0.4em] uppercase text-[#71867e] mb-3">Confirm Cancellation</p>
            <p className="text-sm text-[#4a6358] mb-6">Cancel Booking #{cancelConfirm}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-3 text-xs tracking-[0.25em] border border-[#d4d7c7] text-[#71867e] hover:border-[#1c352c] hover:text-[#1c352c] transition"
              >
                KEEP IT
              </button>
              <button
                onClick={() => handleCancelBooking(cancelConfirm)}
                disabled={cancelling === cancelConfirm}
                className="flex-1 py-3 text-xs tracking-[0.25em] bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {cancelling === cancelConfirm ? "CANCELLING..." : "YES, CANCEL"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
