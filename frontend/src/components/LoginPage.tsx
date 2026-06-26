import React from "react";
import { BarChart2, Github } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle, signInWithGitHub } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mx-auto">
            <BarChart2 className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SEC Research Terminal</h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Grounded financial research from SEC filings. Sign in to request access.
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface-secondary hover:bg-surface-tertiary text-white text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={signInWithGitHub}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface-secondary hover:bg-surface-tertiary text-white text-sm font-medium transition-all"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          After sign-in, you'll submit a brief access request. Approval is manual and typically same-day.
        </p>

        <p className="text-center text-[10px] text-gray-700">
          Not financial advice · SEC EDGAR data only · US securities only
        </p>
      </div>
    </div>
  );
}
