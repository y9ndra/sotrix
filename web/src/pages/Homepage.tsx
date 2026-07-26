import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { getMe } from "../api/auth.api";
import type { User } from "../types/user.types";
import { getToken } from "../services/token.service";

interface HomepageProps {
  token: string | null;
  onLogout: () => void;
}

function Homepage({ token, onLogout }: HomepageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    const jwtToken = getToken();
    if (!jwtToken) {
      setError("No token found. Please log in first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getMe();
      if (response.data && response.data.user) {
        setUser(response.data.user);
      }
    } catch (err: any) {
      console.error("Error fetching profile context", err);
      setError("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div>
      <Navbar isAuthenticated={!!token} onLogout={onLogout} />
      
      <div style={{
        maxWidth: "600px",
        margin: "40px auto 20px",
        padding: "30px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(229, 231, 235, 1)",
        fontFamily: "'Inter', sans-serif"
      }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "20px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e5e7eb",
              borderTop: "3px solid #4f46e5",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ color: "#4b5563", fontSize: "15px", fontWeight: 500, margin: 0 }}>
              Loading user profile...
            </p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            borderRadius: "12px",
            padding: "16px",
            color: "#991b1b"
          }}>
            <svg style={{ width: "24px", height: "24px", stroke: "#dc2626" }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {user && !loading && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: "20px", textAlign: "left" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              boxShadow: "0 4px 10px rgba(79, 70, 229, 0.3)"
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px 0", color: "#111827", fontSize: "20px", fontWeight: 700 }}>
                Welcome back, <span style={{ color: "#4f46e5" }}>{user.username}</span>!
              </h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg style={{ width: "16px", height: "16px", stroke: "#9ca3af" }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {!user && !loading && !error && (
          <div style={{ padding: "10px" }}>
            <p style={{ color: "#4b5563", fontSize: "15px", margin: 0 }}>
              Please log in to access all features.
            </p>
          </div>
        )}
      </div>

      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export default Homepage;
