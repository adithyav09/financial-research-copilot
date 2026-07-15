import { useState } from "react";
import { AlertCircle, Github } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import ThesisMark from "./ThesisMark";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/**
 * Design 1i: sign-in with labeled fields, honest inline validation, and the
 * approval process explained up front instead of discovered as a dead end.
 */
export default function LoginPage() {
  const { signInWithGoogle, signInWithGitHub, signInWithPassword, signUpWithPassword } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("That doesn't look like an email address.");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const err =
        mode === "signin"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password);
      if (err) {
        setError(err);
      } else if (mode === "signup") {
        setInfo("Check your email to confirm your account before signing in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async () => {
    setError(null);
    if (!email || !validateEmail()) {
      setEmailError("Enter your email first, then click Forgot.");
      return;
    }
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
    setInfo(resetErr ? null : `Password reset email sent to ${email}.`);
    if (resetErr) setError(resetErr.message);
  };

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const fieldClass = (invalid: boolean) =>
    `w-full px-3.5 py-2.5 rounded-[10px] border bg-surface-secondary text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-accent transition-colors ${
      invalid ? "border-amber-600" : "border-border"
    }`;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 md:gap-6 justify-center">
        {/* Sign-in column */}
        <div className="w-full max-w-[400px] mx-auto md:mx-0 shrink-0">
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <ThesisMark size={34} />
            <span className="text-[19px] font-semibold text-white tracking-tight">Thesis</span>
          </div>
          <p className="mb-5 text-[12.5px] text-gray-500 text-center">Company research you can verify.</p>

          {/* Mode tabs */}
          <div className="flex border border-border rounded-[10px] p-[3px] bg-surface-secondary mb-4">
            {(["signin", "signup"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-[7px] rounded-lg text-[12.5px] text-center transition-all ${
                  mode === m
                    ? "font-semibold text-white bg-surface-tertiary border border-[#2a2f3c]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-400">Email</p>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={validateEmail}
                className={fieldClass(!!emailError)}
              />
              {emailError && (
                <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />{emailError}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-gray-400">Password</p>
                {mode === "signin" && (
                  <button type="button" onClick={handleForgot} className="text-[11px] text-accent-hover hover:underline">
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass(!!error)}
              />
              {error && (
                <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />{error}
                </p>
              )}
              {info && <p className="mt-1.5 text-[11px] text-emerald-400">{info}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-[11px] rounded-[10px] bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-[13px] font-semibold transition-all"
            >
              {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-gray-600">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={signInWithGoogle}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-border bg-surface-secondary hover:bg-surface-tertiary text-gray-200 text-[12.5px] font-medium transition-all"
            >
              <GoogleIcon /> Google
            </button>
            <button
              onClick={signInWithGitHub}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-border bg-surface-secondary hover:bg-surface-tertiary text-gray-200 text-[12.5px] font-medium transition-all"
            >
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>

          <p className="mt-5 text-[10.5px] text-gray-600 text-center leading-relaxed">
            By continuing you agree to the Terms of Use and Privacy Policy.
            <br />
            Research tool · not investment advice.
          </p>
        </div>

        {/* After-sign-up explainer (design 1i right column) */}
        <div className="hidden md:block w-px bg-border" />
        <div className="hidden md:flex w-[380px] shrink-0 flex-col justify-center">
          <p className="mb-1 text-[10.5px] font-bold text-gray-500 uppercase tracking-[.13em]">After sign-up</p>
          <h3 className="mb-4 text-base font-semibold text-white tracking-tight">You're in the review queue</h3>
          <div className="flex flex-col">
            {[
              { state: "done", title: "Create your account", body: "Email + password, or Google/GitHub." },
              { state: "active", title: "Access review — usually same day", body: "Each account gets a real AI budget, so access is approved manually to keep the free tier fast and abuse-free. You'll get an email." },
              { state: "todo", title: "Start researching", body: "Full access with a personal token budget." },
            ].map((step, i, arr) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    step.state === "done" ? "bg-emerald-500/15 border border-emerald-500/40"
                    : step.state === "active" ? "bg-accent/15 border border-accent/45"
                    : "border border-dashed border-[#2a2f3c]"
                  }`}>
                    {step.state === "done" ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    ) : (
                      <span className={`block rounded-full ${step.state === "active" ? "w-2 h-2 bg-accent-hover" : "w-1.5 h-1.5 bg-gray-700"}`} />
                    )}
                  </div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className={i < arr.length - 1 ? "pb-4" : ""}>
                  <p className={`text-[13px] font-semibold ${step.state === "todo" ? "text-gray-500" : "text-gray-200"}`}>{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-gray-500 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
