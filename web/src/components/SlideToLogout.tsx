import { useState, useRef, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "motion/react";

interface SlideToLogoutProps {
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
}

export const SlideToLogout = ({
  onConfirm,
  isLoading = false,
}: SlideToLogoutProps) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [maxDrag, setMaxDrag] = useState<number>(200);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const reduced = useReducedMotion() ?? false;

  const THUMB_WIDTH = 36;
  const PADDING = 4;

  const x = useMotionValue(0);

  const measureTrack = useCallback(() => {
    if (trackRef.current) {
      const clientWidth = trackRef.current.clientWidth;
      const calculatedMax = Math.max(0, clientWidth - THUMB_WIDTH - PADDING * 2);
      setMaxDrag(calculatedMax);
    }
  }, []);

  useEffect(() => {
    measureTrack();
    window.addEventListener("resize", measureTrack);
    return () => window.removeEventListener("resize", measureTrack);
  }, [measureTrack]);

  // Interpolated visual channels
  const labelOpacity = useTransform(x, [0, Math.max(1, maxDrag * 0.45)], [1, 0]);
  const progressWidth = useTransform(x, (val) => Math.min(val + THUMB_WIDTH + PADDING, (trackRef.current?.clientWidth || 300)));
  const iconRotate = useTransform(x, [0, Math.max(1, maxDrag)], [0, 18]);

  const handleDragEnd = () => {
    if (isLoading || isConfirmed) return;

    const threshold = maxDrag * 0.72;
    if (x.get() >= threshold) {
      // Snap to end
      animate(x, maxDrag, {
        type: "spring",
        stiffness: 450,
        damping: 28,
      });
      setIsConfirmed(true);
      onConfirm();
    } else {
      // Spring back to start
      animate(x, 0, {
        type: "spring",
        stiffness: 500,
        damping: 26,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isLoading || isConfirmed) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      animate(x, maxDrag, {
        type: "spring",
        stiffness: 400,
        damping: 28,
      });
      setIsConfirmed(true);
      onConfirm();
    }
  };

  return (
    <div
      ref={trackRef}
      className={`slide-logout-track ${isConfirmed || isLoading ? "is-confirmed" : ""}`}
      role="group"
      aria-label="Slide to confirm logout"
    >
      {/* Dynamic Progress Fill */}
      <motion.div
        className="slide-logout-progress"
        style={{ width: progressWidth }}
      />

      {/* Center Prompt Label */}
      {!isConfirmed && !isLoading && (
        <motion.div
          className="slide-logout-label"
          style={{ opacity: labelOpacity }}
        >
          <span>slide to log out</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </motion.div>
      )}

      {/* Confirmed / Loading State Display */}
      {(isConfirmed || isLoading) && (
        <div className="slide-logout-confirmed-text">
          <svg
            className="chat-spinner"
            style={{ width: "13px", height: "13px" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <span>logging out...</span>
        </div>
      )}

      {/* Draggable Thumb */}
      <motion.div
        className="slide-logout-thumb"
        tabIndex={0}
        role="slider"
        aria-valuenow={Math.round((x.get() / (maxDrag || 1)) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Drag slider to log out"
        onKeyDown={handleKeyDown}
        drag={isConfirmed || isLoading ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.06}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileHover={isConfirmed || isLoading || reduced ? undefined : { scale: 1.04 }}
        whileTap={isConfirmed || isLoading || reduced ? undefined : { scale: 0.96 }}
      >
        <motion.svg
          style={{
            width: "15px",
            height: "15px",
            stroke: "currentColor",
            rotate: iconRotate,
          }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </motion.svg>
      </motion.div>
    </div>
  );
};

export default SlideToLogout;
