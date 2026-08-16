import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { useAuthStore } from "../store/authStore";

function Homepage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <Navbar />
      
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
        {user ? (
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
            <div style={{ flex: 1 }}>
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
            {(user.id || user._id) && (
              <Link
                to={`/profile/${user.id || user._id}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}
              >
                View Profile
              </Link>
            )}
          </div>
        ) : (
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
