import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Navbar from "./Navbar";
import Homepage from "../pages/Homepage";
import Explore from "../pages/Explore";
import Search from "../pages/Search";
import Messages from "../pages/Messages";
import Profile from "../pages/Profile";
import { useNotificationInitialization } from "../hooks/useNotificationInitialization";

const DeckLayout = () => {
  useNotificationInitialization();

  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [activeSlot, setActiveSlot] = useState(0);
  const [renderNotifications, setRenderNotifications] = useState(false);
  const deckBaseLayerRef = useRef<HTMLDivElement>(null);

  // Map pathnames to joint horizontal deck slot indices (0 to 4)
  useEffect(() => {
    if (pathname === "/") {
      setActiveSlot(0);
    } else if (pathname.startsWith("/explore")) {
      setActiveSlot(1);
    } else if (pathname.startsWith("/search")) {
      setActiveSlot(2);
    } else if (pathname.startsWith("/messages") || pathname.startsWith("/chat")) {
      setActiveSlot(3);
    } else if (pathname.startsWith("/profile")) {
      setActiveSlot(4);
    }
  }, [pathname]);

  // Ensure deck-base-layer is never shifted horizontally by browser focus or scroll events
  useEffect(() => {
    if (deckBaseLayerRef.current) {
      deckBaseLayerRef.current.scrollLeft = 0;
    }
  }, [pathname, activeSlot]);

  const handleBaseLayerScroll = () => {
    if (deckBaseLayerRef.current && deckBaseLayerRef.current.scrollLeft !== 0) {
      deckBaseLayerRef.current.scrollLeft = 0;
    }
  };

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
    navigate(-1);
  };

  // Guard Profile space with delayed unmount matching slide transition
  const isProfileActive = pathname.startsWith("/profile");
  const [renderProfile, setRenderProfile] = useState(isProfileActive);

  useEffect(() => {
    if (isProfileActive) {
      setRenderProfile(true);
    } else {
      const timer = setTimeout(() => {
        setRenderProfile(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isProfileActive]);

  return (
    <div className="deck-root-container">
      <Navbar />

      <div className="deck-workspace">
        {/* Base Layer: The Joint Horizontal Sliding Deck Workspace */}
        <div
          ref={deckBaseLayerRef}
          onScroll={handleBaseLayerScroll}
          className={`deck-base-layer ${isNotificationsActive ? "dimmed-half" : ""}`}
        >
          <div
            className="joint-deck-track"
            style={{
              width: "500%",
              transform: `translateX(-${activeSlot * 20}%)`,
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

            {/* Slot 2: Search Creators Space */}
            <div className="joint-deck-slot">
              <Search />
            </div>

            {/* Slot 3: Real-time Messages Space */}
            <div className="joint-deck-slot">
              <Messages />
            </div>

            {/* Slot 4: Profile Page */}
            <div className="joint-deck-slot">
              {renderProfile ? <Profile /> : <div />}
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
