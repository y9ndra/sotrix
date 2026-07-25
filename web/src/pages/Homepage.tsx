import { useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { getMe, getCurrentUser } from "../api/auth.api";
import type { User } from "../types/auth.types";
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

  const handleGetUser = async () => {
    try {
      const response = await getCurrentUser();
      console.log("Current user response:", response.data);
    } catch (err: any) {
      console.error("Error with getCurrentUser:", err);
    }
  };

  return (
    <div>
      <Navbar isAuthenticated={!!token} onLogout={onLogout} />
      <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f9f9f9", borderBottom: "1px solid #eee" }}>
        {loading && <p>Loading user profile...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {user ? (
          <div>
            <h3>Welcome back, <span style={{ color: "#0066cc" }}>{user.username}</span>!</h3>
            <p>Email: {user.email}</p>
          </div>
        ) : (
          !loading && (
            <div>
              <p>Please log in to access all features.</p>
              {token && (
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
                  <button 
                    onClick={fetchProfile} 
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#0066cc", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: "4px", 
                      cursor: "pointer" 
                    }}
                  >
                    Load Profile Info
                  </button>
                  <button 
                    onClick={handleGetUser} 
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#4caf50", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: "4px", 
                      cursor: "pointer" 
                    }}
                  >
                    Get Current User
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export default Homepage;
