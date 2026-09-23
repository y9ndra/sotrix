import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-matrix, #000000)",
        color: "var(--text-primary, #ffffff)",
        padding: "24px",
        textAlign: "center",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: "380px",
          width: "100%",
          padding: "36px 28px",
          borderRadius: "12px",
          backgroundColor: "var(--bg-card, #0a0a0a)",
          border: "1px solid var(--border-default, #1e1e1e)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-brand, Michroma, sans-serif)",
            fontSize: "36px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary, #ffffff)",
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h2
          style={{
            fontSize: "15px",
            fontWeight: 500,
            margin: 0,
            color: "var(--text-primary, #ffffff)",
          }}
        >
          page not found
        </h2>

        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary, #a1a1aa)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          The page or endpoint you are looking for doesn't exist.
        </p>

        <button
          onClick={() => navigate(isAuthenticated ? "/" : "/login")}
          style={{
            marginTop: "8px",
            padding: "9px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--accent-matrix, #10b981)",
            color: "#000000",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
        >
          {isAuthenticated ? "back to timeline" : "back to login"}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
