"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

interface StaffStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  total_rooms: number;
  available_rooms: number;
  total_users: number;
  unread_messages: number;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount] = useState(0);
  const [newRatingsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    
    if (!token || role !== "staff") {
      router.push("/");
      return;
    }

    fetch(`${API}/user/dashboard/staff/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then(d => {
        if (d) {
          setStats(d);
          setLoading(false);
        }
      })
      .catch(() => {
        localStorage.clear();
        router.push("/");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#faf9f6" }}>
        <p className="text-[#71867e] tracking-widest text-sm">Loading...</p>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Bookings", value: stats.total_bookings },
    { label: "Pending", value: stats.pending_bookings },
    { label: "Confirmed", value: stats.confirmed_bookings },
    { label: "Available Rooms", value: stats.available_rooms },
    { label: "Total Rooms", value: stats.total_rooms },
    { label: "Registered Users", value: stats.total_users },
  ] : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6", color: "#1c352c" }}>
      <Sidebar 
        activeTab={tab}
        onTabChange={setTab}
        userRole="staff"
        unreadCount={unreadCount}
        newRatingsCount={newRatingsCount}
      />

      <div className="ml-64 p-8">
        <div className="mb-8">
          <p className="text-[#71867e] tracking-[0.4em] text-xs uppercase mb-1">Staff</p>
          <h1 className="text-3xl font-thin tracking-[0.2em]">STAFF DASHBOARD</h1>
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {statCards.map(stat => (
              <div key={stat.label} className="p-6 border border-[#d4d7c7] bg-white/50 backdrop-blur-sm">
                <p className="text-3xl font-thin mb-2 text-[#1c352c]">{stat.value}</p>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#71867e]">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "rooms" && (
          <div className="border border-[#d4d7c7] bg-white/50 backdrop-blur-sm">
            <div className="p-6 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Room Management</p>
            </div>
            <div className="p-6">
              <p className="text-[#71867e]">Room management functionality will be implemented here.</p>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="border border-[#d4d7c7] bg-white/50 backdrop-blur-sm">
            <div className="p-6 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Booking Management</p>
            </div>
            <div className="p-6">
              <p className="text-[#71867e]">Booking management functionality will be implemented here.</p>
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="border border-[#d4d7c7] bg-white/50 backdrop-blur-sm">
            <div className="p-6 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Messages</p>
            </div>
            <div className="p-6">
              <p className="text-[#71867e]">Message management functionality will be implemented here.</p>
            </div>
          </div>
        )}

        {tab === "ratings" && (
          <div className="border border-[#d4d7c7] bg-white/50 backdrop-blur-sm">
            <div className="p-6 border-b border-[#d4d7c7]">
              <p className="text-xs tracking-[0.3em] uppercase text-[#71867e]">Ratings</p>
            </div>
            <div className="p-6">
              <p className="text-[#71867e]">Rating management functionality will be implemented here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}