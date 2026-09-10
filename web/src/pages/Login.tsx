import { login, getMe } from "../api/auth.api"
import React, { useState } from "react";   
import Button from "../components/Button"
import Input from "../components/Input"
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

  async function handlelogin() {
    setError("");
    setSuccess("");
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

    setLoading(true);
    try {
      const response = await login({ identifier: trimmedUsername, password });
      console.log(response);
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
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card login-card">
        <span className="auth-header-tag">Account Login</span>
        <h2 className="auth-title">Log In</h2>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <Input
          label="Username or email"
          placeholder="Enter credentials"
          value={username}
          onChange={handleusernamechange}
          error={fieldErrors.username}
        />
        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          type="password"
          onChange={handlepasswordchange}
          error={fieldErrors.password}
        />

        <Button
          name={loading ? "Logging in..." : "Log In"}
          onClick={handlelogin}
          disabled={loading}
        />

        <div className="auth-link-group">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;