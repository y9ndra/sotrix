import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuthStore } from "../store/authStore";

function Homepage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null; // Safety fallback for initial auth loading state

  return (
    <div>
      <Navbar />
      
      <div className="welcome-card-container">
        <div className="welcome-card">
          <div className="welcome-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="welcome-info">
            <h3 className="welcome-title">
              Welcome back, <span className="welcome-highlight">{user.username}</span>!
            </h3>
            <p className="welcome-email">
              <svg className="welcome-email-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {user.email}
            </p>
          </div>
          {(user.id || user._id) && (
            <Link to={`/profile/${user.id || user._id}`} className="btn welcome-btn">
              View Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Homepage;
