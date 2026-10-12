import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import AuthBrand from "../components/AuthBrand";
import AuthStage from "../components/AuthStage";
import { forgotPassword, resetPassword } from "../api/auth.api";

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  // Step 2 states
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle single digit input in 6-digit OTP grid
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];

    if (cleaned.length > 0) {
      newDigits[index] = cleaned[cleaned.length - 1];
      setOtpDigits(newDigits);
      setError("");

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

  // Step 1: Send recovery OTP
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const trimmed = identifier.trim();
    if (!trimmed) {
      setFieldErrors({ identifier: "Please enter your email or username" });
      setError("Please enter your email or username");
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword({ identifier: trimmed });
      setSuccess(response.data?.message || "Reset code sent! Check your inbox.");
      if (response.data?.email) {
        setMaskedEmail(response.data.email);
      }
      setStep(2);
      setCooldown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to send reset code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend code in Step 2
  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const response = await forgotPassword({ identifier: identifier.trim() });
      setSuccess(response.data?.message || "A new reset code has been sent!");
      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to resend reset code. Please try again.";
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  // Step 2: Submit OTP and set new password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const newErrors: Record<string, string> = {};

    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit recovery code");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        identifier: identifier.trim(),
        otp: code,
        newPassword,
      });

      setSuccess(response.data?.message || "Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to reset password. Please verify the code and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      <div className="auth-split-container">
        {/* Left Column: 3D Animated Rubik's Monument */}
        <div className="auth-stage-column">
          <div className="auth-brand-monument">
            <AuthStage />
            <AuthBrand />
          </div>
        </div>

        {/* Right Column: Interactive Reset Form */}
        <div className="auth-form-column">
          <div className="auth-form-overlay">
            <div className="auth-header-overlay">
              <h2 className="auth-title">
                {step === 1 ? "Reset password" : "New password"}
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary, #a1a1aa)",
                  margin: "8px 0 0 0",
                  lineHeight: "1.5",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {step === 1 ? (
                  "Enter your username or email address and we'll send a 6-digit recovery code."
                ) : (
                  <>
                    Enter the 6-digit recovery code sent to{" "}
                    <span style={{ color: "var(--accent-matrix, #10b981)", fontWeight: 600 }}>
                      {maskedEmail || identifier}
                    </span>
                  </>
                )}
              </p>
            </div>

            {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}
            {success && <div className="alert-success" style={{ marginBottom: 14 }}>{success}</div>}

            {step === 1 ? (
              /* Step 1: Identifier Input */
              <form onSubmit={handleSendCode} className="auth-form">
                <Input
                  label="Email or username"
                  placeholder="name@domain.com or username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier) setFieldErrors({});
                  }}
                  error={fieldErrors.identifier}
                  autoComplete="username"
                  autoFocus
                />

                <Button
                  name={loading ? "Sending Code..." : "Send Reset Code"}
                  onClick={() => handleSendCode()}
                  disabled={loading}
                  className="auth-submit-btn"
                />

                <div className="auth-link-group">
                  <div>
                    Remember your password? <Link to="/login">Back to log in</Link>
                  </div>
                </div>
              </form>
            ) : (
              /* Step 2: 6-Digit OTP + New Password */
              <form onSubmit={handleResetSubmit} className="auth-form">
                {/* 6-Digit OTP Box Grid */}
                <div style={{ marginBottom: 4 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--text-secondary, #a1a1aa)",
                      marginBottom: 8,
                    }}
                  >
                    6-digit recovery code
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      margin: "4px 0 16px 0",
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
                            borderRadius: 10,
                            outline: "none",
                            transition: "all 0.2s ease",
                            boxShadow: isFilled
                              ? "0 0 12px rgba(16, 185, 129, 0.15)"
                              : "none",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <Input
                  label="New password"
                  placeholder="At least 8 characters"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) {
                      setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                    }
                  }}
                  error={fieldErrors.newPassword}
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm new password"
                  placeholder="Repeat new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  error={fieldErrors.confirmPassword}
                  autoComplete="new-password"
                />

                <Button
                  name={loading ? "Resetting Password..." : "Reset Password"}
                  onClick={(e) => handleResetSubmit(e as any)}
                  disabled={loading}
                  className="auth-submit-btn"
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                    fontSize: "12px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resendLoading}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color:
                        cooldown > 0
                          ? "var(--text-muted, #71717a)"
                          : "var(--accent-matrix, #10b981)",
                      cursor: cooldown > 0 ? "default" : "pointer",
                      fontSize: "12px",
                      fontFamily: "inherit",
                    }}
                  >
                    {resendLoading
                      ? "Resending..."
                      : cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : "Resend recovery code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--text-secondary, #a1a1aa)",
                      cursor: "pointer",
                      fontSize: "12px",
                      textDecoration: "underline",
                      fontFamily: "inherit",
                    }}
                  >
                    Change username/email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
