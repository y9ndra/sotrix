import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import AuthBrand from "../components/AuthBrand";
import AuthStage from "../components/AuthStage";
import { verifyEmailOtp, resendVerificationOtp, changeEmail, logout } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";

export default function VerifyEmail() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeEmail, setActiveEmail] = useState(user?.email || "");

  // Update Email toggle & inputs
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState("");

  const navigate = useNavigate();

  // If user is already verified or not logged in, redirect accordingly
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    } else if (user?.isEmailVerified || user?.isDemo) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Sync active email
  useEffect(() => {
    if (user?.email && !activeEmail) {
      setActiveEmail(user.email);
    }
  }, [user, activeEmail]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];

    if (cleaned.length > 0) {
      newDigits[index] = cleaned[cleaned.length - 1];
      setOtpDigits(newDigits);
      setError("");

      // Auto-advance to next input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else {
      newDigits[index] = "";
      setOtpDigits(newDigits);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    setError("");

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Submit OTP
  const handleVerify = async () => {
    setError("");
    setSuccess("");
    const code = otpDigits.join("");

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmailOtp({ otp: code });
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setSuccess("Email verified successfully! Redirecting...");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1200);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Verification failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const response = await resendVerificationOtp();
      setSuccess(response.data?.message || "Verification code resent successfully!");
      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to resend code. Please try again.";
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  // Change Email (dummy / outdated email recovery)
  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError("");
    setError("");

    const trimmedNewEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedNewEmail || !emailRegex.test(trimmedNewEmail)) {
      setChangeEmailError("Please enter a valid new email address");
      return;
    }

    if (!currentPassword) {
      setChangeEmailError("Current password is required to update email");
      return;
    }

    setChangeEmailLoading(true);
    try {
      const response = await changeEmail({
        newEmail: trimmedNewEmail,
        currentPassword,
      });

      setActiveEmail(trimmedNewEmail);
      setShowChangeEmail(false);
      setNewEmail("");
      setCurrentPassword("");
      setOtpDigits(["", "", "", "", "", ""]);
      setCooldown(60);
      setSuccess(response.data?.message || `Verification code sent to ${trimmedNewEmail}`);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update email. Please try again.";
      setChangeEmailError(msg);
    } finally {
      setChangeEmailLoading(false);
    }
  };

  // Logout / Switch account
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
    clearUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="auth-split-layout">
      <div className="auth-split-container">
        {/* Left Column: 3D Animated Rubik's Logo */}
        <div className="auth-stage-column">
          <div className="auth-brand-monument">
            <AuthStage />
            <AuthBrand />
          </div>
        </div>

        {/* Right Column: Verification Form */}
        <div className="auth-form-column">
          <div className="auth-form-overlay" style={{ maxWidth: 360 }}>
            <div className="auth-header-overlay" style={{ marginBottom: 24 }}>
              <h2 className="auth-title">Verify email</h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary, #a1a1aa)",
                  marginTop: 8,
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Code sent to:{" "}
                <span
                  style={{
                    color: "var(--accent-matrix, #10b981)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono, monospace)",
                    wordBreak: "break-all",
                  }}
                >
                  {activeEmail || "your email"}
                </span>
              </p>
            </div>

            {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}
            {success && <div className="alert-success" style={{ marginBottom: 14 }}>{success}</div>}

            {/* 6-Digit OTP Box Grid */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "space-between",
                margin: "16px 0 24px 0",
              }}
            >
              {otpDigits.map((digit, idx) => {
                const isFilled = Boolean(digit);
                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoFocus={idx === 0}
                    style={{
                      width: 48,
                      height: 54,
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono, 'Space Grotesk', monospace)",
                      textAlign: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      color: "#ffffff",
                      border: isFilled
                        ? "1px solid var(--accent-matrix, #10b981)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      outline: "none",
                      boxShadow: isFilled
                        ? "0 0 10px rgba(16, 185, 129, 0.25)"
                        : "none",
                      transition: "all 0.15s ease",
                      boxSizing: "border-box",
                    }}
                  />
                );
              })}
            </div>

            <Button
              name={loading ? "Verifying..." : "Verify Code"}
              onClick={handleVerify}
              disabled={loading || otpDigits.join("").length !== 6}
              className="auth-submit-btn"
            />

            {/* Resend Cooldown Action */}
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 12.5,
                color: "var(--text-muted, #71717a)",
              }}
            >
              {cooldown > 0 ? (
                <span>
                  Resend code in{" "}
                  <strong style={{ color: "var(--accent-matrix, #10b981)", fontWeight: 600 }}>
                    {cooldown}s
                  </strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary, #a1a1aa)",
                    cursor: "pointer",
                    fontSize: 12.5,
                    padding: 0,
                    textDecoration: "underline",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary, #a1a1aa)")}
                >
                  {resendLoading ? "Sending code..." : "Didn't receive code? Resend"}
                </button>
              )}
            </div>

            {/* Change Email Toggle Section for Dummy Email Users */}
            <div
              style={{
                marginTop: 22,
                paddingTop: 16,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "center",
              }}
            >
              {!showChangeEmail ? (
                <div>
                  <span style={{ fontSize: 12, color: "var(--text-muted, #71717a)" }}>
                    Can&apos;t access this email?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeEmail(true);
                      setChangeEmailError("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary, #a1a1aa)",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      textDecoration: "underline",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-matrix, #10b981)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary, #a1a1aa)")}
                  >
                    Change Email
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "rgba(10, 10, 10, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 14,
                    padding: 18,
                    marginTop: 8,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        color: "#f4f4f5",
                        textTransform: "uppercase",
                      }}
                    >
                      Update Email Address
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowChangeEmail(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted, #71717a)",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {changeEmailError && (
                    <div
                      className="alert-error"
                      style={{ fontSize: 11.5, padding: "8px 10px", marginBottom: 12 }}
                    >
                      {changeEmailError}
                    </div>
                  )}

                  <form onSubmit={handleChangeEmailSubmit}>
                    {/* Using type="text", inputMode="email", autoComplete="off" to suppress browser alias popup */}
                    <Input
                      label="New Email Address"
                      placeholder="name@domain.com"
                      value={newEmail}
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      name="sotrix_new_email_recovery"
                      id="sotrix_new_email_recovery"
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <Input
                      label="Current Password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      type="password"
                      autoComplete="current-password"
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />

                    <div style={{ marginTop: 8 }}>
                      <Button
                        name={
                          changeEmailLoading
                            ? "Sending..."
                            : "Send Code to New Email"
                        }
                        onClick={() => {}}
                        disabled={changeEmailLoading}
                        className="auth-submit-btn"
                      />
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Logout / Switch User Link */}
            <div style={{ marginTop: 18, textAlign: "center" }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted, #52525b)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 4,
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary, #a1a1aa)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted, #52525b)")}
              >
                Log out &amp; switch account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
