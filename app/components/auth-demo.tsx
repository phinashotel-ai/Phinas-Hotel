"use client";

import { useState } from 'react';
import { setUserData, clearUserData } from '../../lib/auth-utils';
import { useAuth } from '../../lib/auth-context';

export default function AuthDemo() {
  const { user, isLoggedIn } = useAuth();
  const [showDemo, setShowDemo] = useState(false);

  const simulateLogin = () => {
    // Simulate a user login with sample data
    const sampleUser = {
      id: 1,
      first_name: "John",
      last_name: "Doe", 
      email: "john.doe@example.com",
      contact: "+63 912 345 6789"
    };
    setUserData(sampleUser);
  };

  const simulateLogout = () => {
    clearUserData();
  };

  if (!showDemo) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDemo(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition text-sm"
        >
          Demo Login
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Auth Demo</h3>
        <button
          onClick={() => setShowDemo(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      {isLoggedIn ? (
        <div className="space-y-2">
          <p className="text-xs text-green-600">✓ Logged in as:</p>
          <p className="text-xs font-medium">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-gray-600">{user?.email}</p>
          <button
            onClick={simulateLogout}
            className="w-full bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Not logged in</p>
          <button
            onClick={simulateLogin}
            className="w-full bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition"
          >
            Login as John Doe
          </button>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2">
        Visit contact page to see auto-fill
      </p>
    </div>
  );
}