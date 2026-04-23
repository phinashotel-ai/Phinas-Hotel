"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: "admin" | "staff";
  unreadCount?: number;
  newRatingsCount?: number;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  userRole, 
  unreadCount = 0, 
  newRatingsCount = 0 
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch(`${API}/user/logout/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${localStorage.getItem("access_token")}` 
      },
      body: JSON.stringify({ refresh_token: refresh }),
    }).finally(() => { 
      localStorage.clear(); 
      router.push("/"); 
    });
  };

  const adminTabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "rooms", label: "Rooms", icon: "🏨" },
    { id: "bookings", label: "Bookings", icon: "📅" },
    { id: "messages", label: "Messages", icon: "💬", badge: unreadCount },
    { id: "ratings", label: "Ratings", icon: "⭐", badge: newRatingsCount },
  ];

  const staffTabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "rooms", label: "Rooms", icon: "🏨" },
    { id: "bookings", label: "Bookings", icon: "📅" },
    { id: "messages", label: "Messages", icon: "💬", badge: unreadCount },
    { id: "ratings", label: "Ratings", icon: "⭐", badge: newRatingsCount },
  ];

  const tabs = userRole === "admin" ? adminTabs : staffTabs;

  return (
    <div className="fixed left-0 top-0 h-full w-64 z-40" style={{ backgroundColor: "#132222" }}>
      {/* Header */}
      <div className="p-6 border-b border-[#1c352c]">
        <Link href={`/${userRole}-dashboard`} className="text-white tracking-[0.3em] text-lg font-light">
          PHINAS HOTEL
        </Link>
        <p className="text-[#71867e] text-xs tracking-widest uppercase mt-1">
          {userRole === "admin" ? "Admin Panel" : "Staff Panel"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm tracking-[0.2em] uppercase transition rounded ${
                  activeTab === tab.id
                    ? "bg-[#1c352c] text-white"
                    : "text-[#71867e] hover:text-white hover:bg-[#1c352c]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[9px] rounded-full bg-red-500 text-white font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1c352c]">
        <button
          onClick={handleLogout}
          className="w-full py-3 text-xs tracking-widest border border-[#71867e] text-[#d4d7c7] hover:bg-[#71867e] transition rounded"
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}