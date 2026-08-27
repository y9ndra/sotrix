import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Homepage from "../pages/Homepage";

const getPathIndex = (path: string): number => {
  if (path === "/") return 0;
  if (path.startsWith("/explore")) return 1;
  if (path.startsWith("/notifications")) return 2;
  if (path.startsWith("/profile")) return 3;
  if (path.startsWith("/my-posts")) return 4;
  if (path.startsWith("/feed")) return 0;
  return 5;
};

const DeckLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    const currentIndex = getPathIndex(pathname);
    if (currentIndex !== prevIndex) {
      setDirection(currentIndex > prevIndex ? "forward" : "backward");
      setPrevIndex(currentIndex);
    }
  }, [pathname, prevIndex]);

  // Determine if a sliding sheet should be active
  const isSheetActive = pathname !== "/";
  // Determine if the sheet is a half-width right sheet (for notifications/activity space)
  const isHalfSheet = pathname.startsWith("/notifications");

  // Compute lowercase title tag for sheet headers
  let sheetTitle = "";
  if (pathname.startsWith("/explore")) {
    sheetTitle = "discover";
  } else if (pathname.startsWith("/notifications")) {
    sheetTitle = "activity";
  } else if (pathname.startsWith("/profile")) {
    sheetTitle = "profile";
  } else if (pathname.startsWith("/my-posts")) {
    sheetTitle = "my posts";
  } else if (pathname.startsWith("/feed")) {
    sheetTitle = "feed";
  } else {
    sheetTitle = "space";
  }

  const handleClose = () => {
    navigate("/");
  };

  const baseLayerClass = isSheetActive
    ? isHalfSheet
      ? "dimmed-half"
      : "dimmed"
    : "";

  const sheetClass = `${isSheetActive ? "active" : ""} ${isHalfSheet ? "half-sheet" : ""}`;

  return (
    <div className="deck-root-container">
      <Navbar />

      <div className="deck-workspace">
        {/* Base Layer: Persistent Homepage timeline */}
        <div className={`deck-base-layer ${baseLayerClass}`}>
          <Homepage />
        </div>

        {/* Sliding Sheet Panel overlay */}
        <div className={`deck-sheet-container ${sheetClass}`}>
          {isSheetActive && (
            <>
              <div className="sheet-header">
                <div className="sheet-header-left">
                  <button className="sheet-close-btn" onClick={handleClose}>
                    ← back
                  </button>
                  <h2 className="sheet-title">{sheetTitle}</h2>
                </div>
              </div>
              <div className="sheet-content">
                <div key={pathname} className={`sheet-transition-wrapper ${direction}`}>
                  <Outlet />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Backdrop for the half sheet so clicking on the left side closes it */}
        {isSheetActive && isHalfSheet && (
          <div className="half-sheet-backdrop" onClick={handleClose} />
        )}
      </div>
    </div>
  );
};

export default DeckLayout;
