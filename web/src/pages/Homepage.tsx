import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { getMe } from "../api/auth.api";
import type { User } from "../types/auth.types";

interface HomepageProps {
  token: string | null;
  onLogout: () => void;
}

function Homepage({ token, onLogout }: HomepageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      setLoading(true);
      setError("");
      getMe()
        .then((response) => {
          if (response.data && response.data.user) {
            setUser(response.data.user);
          }
        })
        .catch((err: any) => {
          console.error("Error fetching profile", err);
          setError("Failed to load user profile");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUser(null);
    }
  }, [token]);

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
          !loading && <p>Please log in to access all features.</p>
        )}
      </div>
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export default Homepage;
