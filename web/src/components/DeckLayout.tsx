import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Homepage from "../pages/Homepage";
import Explore from "../pages/Explore";
import Profile from "../pages/Profile";

const DeckLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [activeSlot, setActiveSlot] = useState(0);
  const [renderNotifications, setRenderNotifications] = useState(false);

  // Map pathnames to joint horizontal deck slot indices
  useEffect(() => {
    if (pathname === "/") {
      setActiveSlot(0);
    } else if (pathname.startsWith("/explore")) {
      setActiveSlot(1);
    } else if (pathname.startsWith("/profile")) {
      setActiveSlot(2);
    }
  }, [pathname]);

  const isNotificationsActive = pathname.startsWith("/notifications");

  // Manage rendering state for notifications sheet overlay
  useEffect(() => {
    if (isNotificationsActive) {
      setRenderNotifications(true);
    } else {
      const timer = setTimeout(() => {
        setRenderNotifications(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isNotificationsActive]);

  const handleCloseNotifications = () => {
    // Go back to the page the user was on before checking notifications
    navigate(-1);
  };

  const isProfileActive = pathname.startsWith("/profile");

  return (
    <div className="deck-root-container">
      <Navbar />

      <div className="deck-workspace">
        {/* Base Layer: The Joint Horizontal Sliding Deck Workspace */}
        <div className={`deck-base-layer ${isNotificationsActive ? "dimmed-half" : ""}`}>
          <div
            className="joint-deck-track"
            style={{
              width: "300%",
              transform: `translateX(-${activeSlot * 33.333}%)`,
            }}
          >
            {/* Slot 0: Home Timeline Dashboard */}
            <div className="joint-deck-slot">
              <Homepage />
            </div>

            {/* Slot 1: Discover Feed */}
            <div className="joint-deck-slot">
              <Explore />
            </div>

            {/* Slot 2: Profile Space */}
            <div className="joint-deck-slot">
              {isProfileActive ? <Profile /> : <div />}
            </div>
          </div>
        </div>

        {/* Notifications Slide Overlay Sheet */}
        <div className={`deck-sheet-container half-sheet ${isNotificationsActive ? "active" : ""}`}>
          {renderNotifications && (
            <>
              <div className="sheet-header">
                <div className="sheet-header-left">
                  <button className="sheet-close-btn" onClick={handleCloseNotifications}>
                    ←
                  </button>
                  <h2 className="sheet-title">activity</h2>
                </div>
              </div>
              <div className="sheet-content">
                <Outlet />
              </div>
            </>
          )}
        </div>

        {/* Click Backdrop for closing Notifications */}
        {isNotificationsActive && (
          <div className="half-sheet-backdrop" onClick={handleCloseNotifications} />
        )}
      </div>
    </div>
  );
};

export default DeckLayout;
