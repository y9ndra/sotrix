import { login, getMe } from "../api/auth.api";
import React, { useState } from "react";   
import Button from "../components/Button";
import Input from "../components/Input";
import AuthBrand from "../components/AuthBrand";
import AuthStage from "../components/AuthStage";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { saveToken } from "../services/token.service";

function Login() {
  const setUser = useAuthStore((state) => state.setUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [coldStartNotice, setColdStartNotice] = useState(false);
  const navigate = useNavigate();

  function handleusernamechange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: "" }));
    }
  }

  function handlepasswordchange(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
  }

  async function performLogin(loginId: string, pass: string) {
    setError("");
    setSuccess("");
    setColdStartNotice(false);
    setLoading(true);

    const timer = setTimeout(() => {
      setColdStartNotice(true);
    }, 3500);

    try {
      const response = await login({ identifier: loginId, password: pass });
      clearTimeout(timer);
      if (response.data && response.data.token) {
        saveToken(response.data.token);

        // Fetch user data after login to populate the Zustand store
        const userResponse = await getMe();
        if (userResponse.data && userResponse.data.user) {
          setUser(userResponse.data.user);
          setSuccess("Logged in successfully!");
          setUsername("");
          setPassword("");
          navigate("/", { replace: true });
        } else {
          setError("Failed to fetch user profile after authentication");
        }
      } else {
        setError("Failed to obtain authentication token");
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error(err);
      const serverErrors = err.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const mappedErrors: Record<string, string> = {};
        const messages: string[] = [];
        serverErrors.forEach((e: { path: string; message: string }) => {
          if (e.path) mappedErrors[e.path] = e.message;
          messages.push(e.message);
        });
        setFieldErrors(mappedErrors);
        setError(messages.join(". ") || err.response?.data?.message || "Failed to log in");
      } else {
        const errMsg = err.response?.data?.message || err.message || "Failed to log in";
        setError(errMsg);
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setColdStartNotice(false);
    }
  }

  async function handlelogin() {
    const newFieldErrors: Record<string, string> = {};

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      newFieldErrors.username = "Username or email is required";
    }
    if (!password) {
      newFieldErrors.password = "Password is required";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(Object.values(newFieldErrors)[0]);
      return;
    }

    await performLogin(trimmedUsername, password);
  }

  async function handleDemoLogin() {
    setUsername("demo@sotrix.dev");
    setPassword("demo123456");
    setFieldErrors({});
    await performLogin("demo@sotrix.dev", "demo123456");
  }

  return (
    <div className="auth-split-layout">
      <div className="auth-split-container">
        {/* Left Column: 3D Animated Rubik's Logo with Brand Name Below */}
        <div className="auth-stage-column">
          <div className="auth-brand-monument">
            <AuthStage />
            <AuthBrand />
          </div>
        </div>

        {/* Right Column: Seamless Minimalist Overlay Form */}
        <div className="auth-form-column">
          <div className="auth-form-overlay">
            <div className="auth-header-overlay">
              <h2 className="auth-title">Log in</h2>
            </div>

            {coldStartNotice && (
              <div className="alert-info">
                <span>⚡</span>
                <span>Connecting to backend... Render free tier may take ~30s on first spin-up.</span>
              </div>
            )}

            {error && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlelogin();
              }}
              className="auth-form"
            >
              <Input
                label="Email or username"
                placeholder="name@domain.com"
                value={username}
                onChange={handleusernamechange}
                error={fieldErrors.username}
              />
              <Input
                label="Password"
                placeholder="••••••••••••"
                value={password}
                type="password"
                onChange={handlepasswordchange}
                error={fieldErrors.password}
                autoComplete="current-password"
              />

              <Button
                name={loading ? "Logging in..." : "Login"}
                onClick={handlelogin}
                disabled={loading}
                className="auth-submit-btn"
              />

              <div className="auth-link-group">
                <div>
                  Don&apos;t have an account? <Link to="/signup">Sign up</Link>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="auth-demo-btn"
                    title="Log in with pre-seeded demo credentials"
                  >
                    <span className="auth-demo-sparkle">✦</span>
                    <span>Explore as Demo User</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;