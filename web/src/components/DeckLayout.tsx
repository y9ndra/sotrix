import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "./Navbar";
import Homepage from "../pages/Homepage";
import Explore from "../pages/Explore";
import Search from "../pages/Search";
import Messages from "../pages/Messages";
import Profile from "../pages/Profile";
import { useNotificationInitialization } from "../hooks/useNotificationInitialization";
import { useAuthStore } from "../store/authStore";

const DeckLayout = () => {
  useNotificationInitialization();

  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || (currentUser as any)?.id || "";

  const [activeSlot, setActiveSlot] = useState(0);
  const [renderNotifications, setRenderNotifications] = useState(false);
  const deckBaseLayerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const notificationsSheetRef = useRef<HTMLDivElement>(null);

  // Remember last visited profile path so swiping back lands on the same profile
  const lastProfilePathRef = useRef(currentUserId ? `/profile/${currentUserId}` : "/profile");
  useEffect(() => {
    if (pathname.startsWith("/profile")) {
      lastProfilePathRef.current = pathname;
    } else if (currentUserId && lastProfilePathRef.current === "/profile") {
      lastProfilePathRef.current = `/profile/${currentUserId}`;
    }
  }, [pathname, currentUserId]);

  // Keep a ref to activeSlot for non-stale event closures
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;

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

  const handleCloseNotifications = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Sync notifications-sheet-open class on document body to keep floating widgets clear
  useEffect(() => {
    if (isNotificationsActive) {
      document.body.classList.add("notifications-sheet-open");
    } else {
      document.body.classList.remove("notifications-sheet-open");
    }
    return () => {
      document.body.classList.remove("notifications-sheet-open");
    };
  }, [isNotificationsActive]);

  // Guard Profile space: keep rendered when on profile, or when notifications sheet is open over profile
  const isProfileActive = pathname.startsWith("/profile") || (isNotificationsActive && activeSlot === 4);
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

  // Slot path resolver
  const getSlotPath = useCallback((slotIndex: number) => {
    switch (slotIndex) {
      case 0:
        return "/";
      case 1:
        return "/explore";
      case 2:
        return "/search";
      case 3:
        return "/messages";
      case 4:
        return lastProfilePathRef.current || (currentUserId ? `/profile/${currentUserId}` : "/profile");
      default:
        return "/";
    }
  }, [currentUserId]);

  // Synchronize track transform on activeSlot change when not actively dragging
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (trackRef.current && !isDraggingRef.current) {
      trackRef.current.style.transform = `translateX(-${activeSlot * 20}%)`;
    }
  }, [activeSlot]);

  // Mobile horizontal swipe gesture navigation (Touch & Mouse Drag in mobile view)
  useEffect(() => {
    const baseLayer = deckBaseLayerRef.current;
    if (!baseLayer) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let directionLock: "horizontal" | "vertical" | null = null;
    let isGestureActive = false;

    const shouldIgnoreTarget = (target: HTMLElement | null): boolean => {
      if (!target) return true;
      return !!target.closest(
        "input, textarea, select, button, .chat-message-bubble-row, [data-no-swipe], .emoji-mart, .chat-emoji-picker-container, a"
      );
    };

    const isMobileView = (): boolean => {
      return window.innerWidth <= 768 || window.matchMedia("(max-width: 768px)").matches;
    };

    const handleSwipeEndLogic = (endX: number) => {
      if (!isGestureActive || !isDraggingRef.current) {
        isGestureActive = false;
        directionLock = null;
        isDraggingRef.current = false;
        return;
      }

      const diffX = endX - startX;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocityX = diffX / elapsed; // px per millisecond
      const screenWidth = window.innerWidth || 360;
      const currentSlot = activeSlotRef.current;

      // Restore track transition smoothly
      if (trackRef.current) {
        trackRef.current.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
      }

      // Check if user is inside an active chat in Messages on mobile
      const isInsideChat =
        currentSlot === 3 &&
        (location.pathname.includes("/messages") || location.pathname.includes("/chat")) &&
        (location.search.includes("conversationId") || !!document.querySelector(".chat-page-layout.has-active-chat"));

      if (isInsideChat) {
        // In an active chat on mobile: a deliberate right-swipe returns to the conversation list
        if ((diffX > 40 || velocityX > 0.25) && diffX > 20) {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(10);
            } catch {
              /* ignore */
            }
          }
          navigate("/messages");
        }
        // Always snap track back to slot 3 position
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${3 * 20}%)`;
        }
        isGestureActive = false;
        directionLock = null;
        isDraggingRef.current = false;
        return;
      }

      // Page swipe threshold: moved > 15% of screen width OR flicked with velocity > 0.25 px/ms
      const isSwipeNext = (diffX < -screenWidth * 0.15 || (diffX < -30 && velocityX < -0.25)) && currentSlot < 4;
      const isSwipePrev = (diffX > screenWidth * 0.15 || (diffX > 30 && velocityX > 0.25)) && currentSlot > 0;

      let targetSlot = currentSlot;
      if (isSwipeNext) {
        targetSlot = currentSlot + 1;
      } else if (isSwipePrev) {
        targetSlot = currentSlot - 1;
      }

      if (targetSlot !== currentSlot) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {
            /* ignore */
          }
        }
        setActiveSlot(targetSlot);
        navigate(getSlotPath(targetSlot));
      } else {
        // Snap back to current slot
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${currentSlot * 20}%)`;
        }
      }

      isGestureActive = false;
      directionLock = null;
      isDraggingRef.current = false;
    };

    // --- Touch Events ---
    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobileView()) return;
      if (e.touches.length > 1) return;

      const target = e.target as HTMLElement | null;
      if (shouldIgnoreTarget(target)) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      directionLock = null;
      isDraggingRef.current = false;
      isGestureActive = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isGestureActive) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - startX;
      const diffY = touch.clientY - startY;

      if (!directionLock) {
        if (Math.abs(diffY) >= 8 && Math.abs(diffY) >= Math.abs(diffX)) {
          directionLock = "vertical";
          return;
        }
        if (Math.abs(diffX) >= 8 && Math.abs(diffX) > Math.abs(diffY)) {
          directionLock = "horizontal";
          isDraggingRef.current = true;
          if (trackRef.current) {
            trackRef.current.style.transition = "none";
          }
        }
      }

      if (directionLock === "horizontal") {
        if (e.cancelable) {
          e.preventDefault();
        }

        const currentSlot = activeSlotRef.current;
        let effectiveDiffX = diffX;

        // Apply resistance if trying to swipe beyond edges
        if (currentSlot === 0 && diffX > 0) {
          effectiveDiffX = diffX * 0.22;
        } else if (currentSlot === 4 && diffX < 0) {
          effectiveDiffX = diffX * 0.22;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(calc(-${currentSlot * 20}% + ${effectiveDiffX}px))`;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endTouch = e.changedTouches[0];
      const endX = endTouch ? endTouch.clientX : startX;
      handleSwipeEndLogic(endX);
    };

    const handleTouchCancel = () => {
      if (trackRef.current) {
        trackRef.current.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
        trackRef.current.style.transform = `translateX(-${activeSlotRef.current * 20}%)`;
      }
      isGestureActive = false;
      directionLock = null;
      isDraggingRef.current = false;
    };

    // --- Mouse Drag Events (for testing in responsive preview/desktop) ---
    const handleMouseDown = (e: MouseEvent) => {
      if (!isMobileView()) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (shouldIgnoreTarget(target)) return;

      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      directionLock = null;
      isDraggingRef.current = false;
      isGestureActive = true;

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isGestureActive) return;

      const diffX = e.clientX - startX;
      const diffY = e.clientY - startY;

      if (!directionLock) {
        if (Math.abs(diffY) >= 8 && Math.abs(diffY) >= Math.abs(diffX)) {
          directionLock = "vertical";
          return;
        }
        if (Math.abs(diffX) >= 8 && Math.abs(diffX) > Math.abs(diffY)) {
          directionLock = "horizontal";
          isDraggingRef.current = true;
          if (trackRef.current) {
            trackRef.current.style.transition = "none";
          }
        }
      }

      if (directionLock === "horizontal") {
        const currentSlot = activeSlotRef.current;
        let effectiveDiffX = diffX;

        if (currentSlot === 0 && diffX > 0) {
          effectiveDiffX = diffX * 0.22;
        } else if (currentSlot === 4 && diffX < 0) {
          effectiveDiffX = diffX * 0.22;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(calc(-${currentSlot * 20}% + ${effectiveDiffX}px))`;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      handleSwipeEndLogic(e.clientX);
    };

    baseLayer.addEventListener("touchstart", handleTouchStart, { passive: true });
    baseLayer.addEventListener("touchmove", handleTouchMove, { passive: false });
    baseLayer.addEventListener("touchend", handleTouchEnd, { passive: true });
    baseLayer.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    baseLayer.addEventListener("mousedown", handleMouseDown);

    return () => {
      baseLayer.removeEventListener("touchstart", handleTouchStart);
      baseLayer.removeEventListener("touchmove", handleTouchMove);
      baseLayer.removeEventListener("touchend", handleTouchEnd);
      baseLayer.removeEventListener("touchcancel", handleTouchCancel);
      baseLayer.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getSlotPath, location.pathname, location.search, navigate]);

  // Dismiss notification sheet on mobile with right-swipe
  useEffect(() => {
    const sheet = notificationsSheetRef.current;
    if (!sheet || !isNotificationsActive) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isHorizontal = false;

    const handleSheetTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isHorizontal = false;
    };

    const handleSheetTouchMove = (e: TouchEvent) => {
      const diffX = e.touches[0].clientX - startX;
      const diffY = e.touches[0].clientY - startY;

      if (!isHorizontal) {
        if (Math.abs(diffY) > 8 && Math.abs(diffY) >= Math.abs(diffX)) {
          return;
        }
        if (diffX > 8 && diffX > Math.abs(diffY)) {
          isHorizontal = true;
        }
      }
    };

    const handleSheetTouchEnd = (e: TouchEvent) => {
      if (!isHorizontal) return;
      const diffX = e.changedTouches[0].clientX - startX;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocityX = diffX / elapsed;

      // Swiped right on notification sheet: close sheet
      if (diffX > 50 || velocityX > 0.28) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch {
            /* ignore */
          }
        }
        handleCloseNotifications();
      }
    };

    sheet.addEventListener("touchstart", handleSheetTouchStart, { passive: true });
    sheet.addEventListener("touchmove", handleSheetTouchMove, { passive: true });
    sheet.addEventListener("touchend", handleSheetTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener("touchstart", handleSheetTouchStart);
      sheet.removeEventListener("touchmove", handleSheetTouchMove);
      sheet.removeEventListener("touchend", handleSheetTouchEnd);
    };
  }, [isNotificationsActive, handleCloseNotifications]);

  return (
    <div className={`deck-root-container ${isNotificationsActive ? "notifications-active" : ""}`}>
      <Navbar />

      <div className="deck-workspace">
        {/* Base Layer: The Joint Horizontal Sliding Deck Workspace */}
        <div
          ref={deckBaseLayerRef}
          onScroll={handleBaseLayerScroll}
          className={`deck-base-layer ${isNotificationsActive ? "dimmed-half" : ""}`}
        >
          <div
            ref={trackRef}
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
        <div
          ref={notificationsSheetRef}
          className={`deck-sheet-container half-sheet ${isNotificationsActive ? "active" : ""}`}
        >
          {renderNotifications && (
            <>
              <div className="sheet-header">
                <div className="sheet-header-left">
                  <button
                    type="button"
                    className="sheet-close-btn"
                    onClick={handleCloseNotifications}
                    aria-label="Back"
                    title="Back"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
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
