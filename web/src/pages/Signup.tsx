import React, { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import { signup } from "../api/auth.api";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
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

  function handleemailchange(event: React.ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: "" }));
    }
  }

  function handlepasswordchange(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
    if (confirmPassword && event.target.value !== confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
    } else if (confirmPassword && event.target.value === confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }

  function handleconfirmpasswordchange(event: React.ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(event.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  }

  async function handlesignup() {
    setError("");
    setSuccess("");
    const newFieldErrors: Record<string, string> = {};

    // Validate Username (3 to 30 chars)
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      newFieldErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
      newFieldErrors.username = "Username must be at least 3 characters";
    } else if (trimmedUsername.length > 30) {
      newFieldErrors.username = "Username must not exceed 30 characters";
    }

    // Validate Email
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      newFieldErrors.email = "Email is required";
    } else if (!emailRegex.test(trimmedEmail)) {
      newFieldErrors.email = "Please enter a valid email address (e.g. user@domain.com)";
    }

    // Validate Password (at least 8 chars)
    if (!password) {
      newFieldErrors.password = "Password is required";
    } else if (password.length < 8) {
      newFieldErrors.password = "Password must be at least 8 characters";
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      newFieldErrors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(Object.values(newFieldErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      const response = await signup({ username: trimmedUsername, email: trimmedEmail, password });
      console.log(response);
      setSuccess("Signup successful! Redirecting to login...");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setTimeout(() => {
        navigate("/login");
      }, 1500);
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
        setError(messages.join(". ") || err.response?.data?.message || "Failed to sign up");
      } else {
        const errMsg = err.response?.data?.message || err.message || "Failed to sign up";
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <span className="auth-header-tag">Account Signup</span>
        <h2 className="auth-title">Sign Up</h2>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <Input
          label="Username"
          placeholder="Pick a handle"
          value={username}
          onChange={handleusernamechange}
          error={fieldErrors.username}
          helperText="3 to 30 characters"
        />

        <Input
          label="Email"
          placeholder="name@domain.com"
          value={email}
          onChange={handleemailchange}
          error={fieldErrors.email}
          helperText="Valid email address"
        />

        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          type="password"
          onChange={handlepasswordchange}
          error={fieldErrors.password}
          helperText="Must be at least 8 characters"
        />

        <Input
          label="Confirm Password"
          placeholder="••••••••"
          value={confirmPassword}
          type="password"
          onChange={handleconfirmpasswordchange}
          error={fieldErrors.confirmPassword}
          helperText="Must match password"
        />

        <Button
          name={loading ? "Signing up..." : "Sign Up"}
          onClick={handlesignup}
          disabled={loading}
        />

        <div className="auth-link-group">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;