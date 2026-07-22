import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/UI";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "One uppercase and lowercase letter", test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "One number", test: (value) => /\d/.test(value) },
  { label: "One symbol", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const friendlyError = (mode) => {
  if (mode === "reset") return "We could not send a reset email right now. Try again in a moment.";
  if (mode === "signup") return "We could not create this account. Check the email and password requirements.";
  return "We could not sign you in. Check your email and password.";
};

export default function Auth() {
  const {
    user,
    loadingAuth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isSupabaseConfigured,
  } = useAuth();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );
  const passwordReady = !isSignup || passwordChecks.every((rule) => rule.passed);
  const canSubmit = normalizedEmail && (isReset || password) && passwordReady && !busy;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    setShowPassword(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setBusy(true);
      setMessage(null);

      if (isReset) {
        await resetPassword(normalizedEmail);
        setMessage({
          type: "success",
          text: "If an account exists for that email, a password reset link has been sent.",
        });
        return;
      }

      if (isSignup) {
        await signUp(normalizedEmail, password);
        setPassword("");
        setMessage({
          type: "success",
          text: "Account created. Check your email if confirmation is enabled.",
        });
      } else {
        await signIn(normalizedEmail, password);
        setPassword("");
        setMessage({ type: "success", text: "Signed in securely." });
      }
    } catch {
      setMessage({ type: "error", text: friendlyError(mode) });
    } finally {
      setBusy(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="auth-page">
        <div className="auth-shell auth-loading">
          <Spinner />
          <span>Checking your secure session</span>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-page">
        <div className="auth-shell">
          <section className="auth-brand-panel">
            <img className="auth-logo theme-logo-dark" src="/assets/nutrident-logo.png" alt="NutriDent AI" />
            <img className="auth-logo theme-logo-light" src="/assets/nutrident-logo-light.png" alt="NutriDent AI" />
            <h1>Cloud accounts are waiting for Supabase.</h1>
            <p>Local tracking still works. Add the frontend Supabase environment values before deploying account sync.</p>
          </section>
          <section className="auth-form-card">
            <Alert type="warning">
              Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_KEY to enable secure sign in.
            </Alert>
          </section>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-page">
        <div className="auth-shell">
          <section className="auth-brand-panel">
            <img className="auth-logo theme-logo-dark" src="/assets/nutrident-logo.png" alt="NutriDent AI" />
            <img className="auth-logo theme-logo-light" src="/assets/nutrident-logo-light.png" alt="NutriDent AI" />
            <h1>Your NutriDent account is active.</h1>
            <p>Food logs, weight entries, and nutrition progress can sync while this session is signed in.</p>
          </section>

          <section className="auth-form-card">
            <span className="auth-eyebrow">Signed in</span>
            <h2>Account</h2>
            <div className="auth-session-card">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="auth-security-list">
              <span>Session managed by Supabase Auth</span>
              <span>Passwords are never stored in the app</span>
              <span>Cloud rows should stay protected by user-level RLS</span>
            </div>
            <button className="btn-primary w-full" onClick={signOut}>Sign Out</button>
            <Link className="auth-inline-link" to="/settings">Manage privacy and data controls</Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <img className="auth-logo theme-logo-dark" src="/assets/nutrident-logo.png" alt="NutriDent AI" />
          <img className="auth-logo theme-logo-light" src="/assets/nutrident-logo-light.png" alt="NutriDent AI" />
          <span className="auth-product-label">Private nutrition and dental risk tracking</span>
          <h1>{isSignup ? "Create your secure NutriDent account." : isReset ? "Reset your password safely." : "Welcome back to NutriDent."}</h1>
          <p>
            Sign in to keep your food logs, weight history, and dental risk insights connected across sessions.
          </p>
          <div className="auth-trust-grid" aria-label="Security highlights">
            <span>Supabase Auth</span>
            <span>Protected sessions</span>
            <span>User-owned logs</span>
          </div>
        </section>

        <form className="auth-form-card" onSubmit={submit}>
          <span className="auth-eyebrow">{isSignup ? "New account" : isReset ? "Password reset" : "Secure login"}</span>
          <h2>{isSignup ? "Create Account" : isReset ? "Reset Password" : "Sign In"}</h2>
          <p className="auth-form-sub">
            {isReset
              ? "Enter your email and we will send a reset link if the account exists."
              : "Use the same email you want connected to your NutriDent logs."}
          </p>

          <label className="field-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            spellCheck="false"
            placeholder="you@example.com"
            required
          />

          {!isReset && (
            <>
              <div className="auth-label-row">
                <label className="field-label" htmlFor="auth-password">Password</label>
                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                required
              />
            </>
          )}

          {isSignup && (
            <div className="auth-password-rules">
              {passwordChecks.map((rule) => (
                <span className={rule.passed ? "passed" : ""} key={rule.label}>
                  {rule.passed ? "OK" : "--"} {rule.label}
                </span>
              ))}
            </div>
          )}

          <button className="btn-primary w-full" disabled={!canSubmit}>
            {busy ? <><Spinner /> Working</> : isSignup ? "Create Account" : isReset ? "Send Reset Link" : "Sign In"}
          </button>

          {!isReset && (
            <button type="button" className="auth-text-button centered" onClick={() => switchMode("reset")}>
              Forgot password?
            </button>
          )}

          <div className="auth-mode-switch">
            {isSignup ? "Already have an account?" : "Need an account?"}
            <button type="button" className="auth-text-button" onClick={() => switchMode(isSignup ? "signin" : "signup")}>
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </div>

          {isReset && (
            <button type="button" className="auth-text-button centered" onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          )}

          {message && <Alert type={message.type}>{message.text}</Alert>}
        </form>
      </div>
    </div>
  );
}
