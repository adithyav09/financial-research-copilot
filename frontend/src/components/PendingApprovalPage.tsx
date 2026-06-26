import React, { useEffect } from "react";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PendingApprovalPage() {
  const { user, signOut, refreshProfile } = useAuth();

  // Poll every 30s in case admin approves while the page is open
  useEffect(() => {
    const interval = setInterval(refreshProfile, 30000);
    return () => clearInterval(interval);
  }, [refreshProfile]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mx-auto">
          <Clock className="w-7 h-7 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Access pending</h2>
          <p className="text-sm text-gray-400 mt-1">
            Your request is under review. You'll be able to use the tool as soon as it's approved.
          </p>
        </div>
        <p className="text-xs text-gray-600">Signed in as {user?.email}</p>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
