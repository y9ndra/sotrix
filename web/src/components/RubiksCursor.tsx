import React, { useEffect, useRef, useState, useCallback } from "react";

export interface CubieFaceColors {
  U: string;
  D: string;
  F: string;
  B: string;
  R: string;
  L: string;
}

export interface Cubie {
  id: number;
  x: number; // -1 (left), 0 (center), 1 (right)
  y: number; // -1 (top), 0 (middle), 1 (bottom)
  z: number; // -1 (back), 0 (center), 1 (front)
  colors: CubieFaceColors;
}

// 6 separate, solid, static colors for all 6 sides (Zero glow, flat & crisp)
// Top: White, Bottom: Yellow, Front: Matrix Green, Back: Blue, Right: Red, Left: Orange
const COLOR_U = "#ffffff"; // Top = Pure White
const COLOR_D = "#eab308"; // Bottom = Canary Yellow
const COLOR_F = "#10b981"; // Front = Matrix Emerald Green
const COLOR_B = "#2563eb"; // Back = Royal Blue
const COLOR_R = "#ef4444"; // Right = Ruby Red
const COLOR_L = "#f97316"; // Left = Tangerine Orange
const COLOR_INTERNAL = "#000000"; // Seam / Internal Plastic Core

export const createInitialCubies = (): Cubie[] => {
  const cubies: Cubie[] = [];
  let id = 0;
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        cubies.push({
          id: id++,
          x,
          y,
          z,
          colors: {
            U: y === -1 ? COLOR_U : COLOR_INTERNAL,
            D: y === 1 ? COLOR_D : COLOR_INTERNAL,
            F: z === 1 ? COLOR_F : COLOR_INTERNAL,
            B: z === -1 ? COLOR_B : COLOR_INTERNAL,
            R: x === 1 ? COLOR_R : COLOR_INTERNAL,
            L: x === -1 ? COLOR_L : COLOR_INTERNAL,
          },
        });
      }
    }
  }
  return cubies;
};

// 3D Rotation Mathematical Operators in CSS Coordinates
// (+X = Right, +Y = Down, +Z = Front / Towards viewer)

// 1. rotateY(-90deg): Turns top/bottom clockwise (looking down)
const rotateY_neg90 = (c: Cubie): Cubie => ({
  ...c,
  x: -c.z,
  z: c.x,
  colors: {
    ...c.colors,
    F: c.colors.R,
    L: c.colors.F,
    B: c.colors.L,
    R: c.colors.B,
  },
});

// 2. rotateY(+90deg): Turns top/bottom counter-clockwise (looking down)
const rotateY_pos90 = (c: Cubie): Cubie => ({
  ...c,
  x: c.z,
  z: -c.x,
  colors: {
    ...c.colors,
    B: c.colors.R,
    L: c.colors.B,
    F: c.colors.L,
    R: c.colors.F,
  },
});

// 3. rotateX(-90deg): Rolls right/left column downwards (towards viewer)
const rotateX_neg90 = (c: Cubie): Cubie => ({
  ...c,
  y: c.z,
  z: -c.y,
  colors: {
    ...c.colors,
    D: c.colors.F,
    B: c.colors.D,
    U: c.colors.B,
    F: c.colors.U,
  },
});

// 4. rotateX(+90deg): Rolls right/left column upwards (away from viewer)
const rotateX_pos90 = (c: Cubie): Cubie => ({
  ...c,
  y: -c.z,
  z: c.y,
  colors: {
    ...c.colors,
    U: c.colors.F,
    B: c.colors.U,
    D: c.colors.B,
    F: c.colors.D,
  },
});

// 5. rotateZ(+90deg): Turns front/back face clockwise (looking from front)
const rotateZ_pos90 = (c: Cubie): Cubie => ({
  ...c,
  x: -c.y,
  y: c.x,
  colors: {
    ...c.colors,
    R: c.colors.U,
    D: c.colors.R,
    L: c.colors.D,
    U: c.colors.L,
  },
});

// 6. rotateZ(-90deg): Turns front/back face counter-clockwise (looking from front)
const rotateZ_neg90 = (c: Cubie): Cubie => ({
  ...c,
  x: c.y,
  y: -c.x,
  colors: {
    ...c.colors,
    L: c.colors.U,
    D: c.colors.L,
    R: c.colors.D,
    U: c.colors.R,
  },
});

interface MoveDef {
  id: string;
  name: string;
  match: (c: Cubie) => boolean;
  transform: string;
  apply: (c: Cubie) => Cubie;
  oppositeIdx: number;
}

const MOVES: MoveDef[] = [
  {
    id: "TOP_CW",
    name: "Top Row Clockwise (U)",
    match: (c) => c.y === -1,
    transform: "rotateY(-90deg)",
    apply: rotateY_neg90,
    oppositeIdx: 1,
  },
  {
    id: "TOP_CCW",
    name: "Top Row Counter-Clockwise (U')",
    match: (c) => c.y === -1,
    transform: "rotateY(90deg)",
    apply: rotateY_pos90,
    oppositeIdx: 0,
  },
  {
    id: "BOTTOM_CW",
    name: "Bottom Row Clockwise (D)",
    match: (c) => c.y === 1,
    transform: "rotateY(90deg)",
    apply: rotateY_pos90,
    oppositeIdx: 3,
  },
  {
    id: "BOTTOM_CCW",
    name: "Bottom Row Counter-Clockwise (D')",
    match: (c) => c.y === 1,
    transform: "rotateY(-90deg)",
    apply: rotateY_neg90,
    oppositeIdx: 2,
  },
  {
    id: "RIGHT_DOWN",
    name: "Right Column Down (R')",
    match: (c) => c.x === 1,
    transform: "rotateX(-90deg)",
    apply: rotateX_neg90,
    oppositeIdx: 5,
  },
  {
    id: "RIGHT_UP",
    name: "Right Column Up (R)",
    match: (c) => c.x === 1,
    transform: "rotateX(90deg)",
    apply: rotateX_pos90,
    oppositeIdx: 4,
  },
  {
    id: "LEFT_UP",
    name: "Left Column Up (L')",
    match: (c) => c.x === -1,
    transform: "rotateX(90deg)",
    apply: rotateX_pos90,
    oppositeIdx: 7,
  },
  {
    id: "LEFT_DOWN",
    name: "Left Column Down (L)",
    match: (c) => c.x === -1,
    transform: "rotateX(-90deg)",
    apply: rotateX_neg90,
    oppositeIdx: 6,
  },
  {
    id: "FRONT_CW",
    name: "Front Face Clockwise (F)",
    match: (c) => c.z === 1,
    transform: "rotateZ(90deg)",
    apply: rotateZ_pos90,
    oppositeIdx: 9,
  },
  {
    id: "FRONT_CCW",
    name: "Front Face Counter-Clockwise (F')",
    match: (c) => c.z === 1,
    transform: "rotateZ(-90deg)",
    apply: rotateZ_neg90,
    oppositeIdx: 8,
  },
  {
    id: "BACK_CW",
    name: "Back Face Clockwise (B)",
    match: (c) => c.z === -1,
    transform: "rotateZ(-90deg)",
    apply: rotateZ_neg90,
    oppositeIdx: 11,
  },
  {
    id: "BACK_CCW",
    name: "Back Face Counter-Clockwise (B')",
    match: (c) => c.z === -1,
    transform: "rotateZ(90deg)",
    apply: rotateZ_pos90,
    oppositeIdx: 10,
  },
];

const ANIMATION_DURATION_MS = 520;
const SETTLING_COOLDOWN_MS = 120;

export const RubiksCursor: React.FC = () => {
  const cursorWrapperRef = useRef<HTMLDivElement | null>(null);
  const [cubies, setCubies] = useState<Cubie[]>(createInitialCubies);
  const cubiesRef = useRef<Cubie[]>(cubies);
  cubiesRef.current = cubies;

  const [activeMove, setActiveMove] = useState<MoveDef | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClickableHovered, setIsClickableHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInputHovered, setIsInputHovered] = useState(false);

  const isBusyRef = useRef(false);
  const lastMoveIndexRef = useRef<number>(-1);

  const triggerSlowMove = useCallback(() => {
    // Cooldown lock: do not interrupt an ongoing smooth mechanical turn
    if (isBusyRef.current) return;
    isBusyRef.current = true;

    // Pick a move (avoid immediate inverse so it progressively scrambles & preserves state)
    let moveIdx = Math.floor(Math.random() * MOVES.length);
    const lastIdx = lastMoveIndexRef.current;
    if (lastIdx !== -1 && (moveIdx === lastIdx || moveIdx === MOVES[lastIdx].oppositeIdx)) {
      moveIdx = (moveIdx + 2) % MOVES.length;
    }
    lastMoveIndexRef.current = moveIdx;
    const move = MOVES[moveIdx];

    // Compute exact next positions and preserved face colors
    const nextCubies = cubiesRef.current.map((c) =>
      move.match(c) ? move.apply(c) : c
    );

    // Step 1: Mount the active rotating slice at rest (transform: none)
    setActiveMove(move);
    setIsAnimating(false);

    // Step 2: Next frame, start the slow, smooth 520ms CSS transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);

        // Step 3: Exactly when the 520ms rotation completes, commit new positions & colors
        setTimeout(() => {
          setCubies(nextCubies);
          cubiesRef.current = nextCubies;
          setIsAnimating(false);
          setActiveMove(null);

          // Cooltime: settling pause before next move is allowed
          setTimeout(() => {
            isBusyRef.current = false;
          }, SETTLING_COOLDOWN_MS);
        }, ANIMATION_DURATION_MS);
      });
    });
  }, []);

  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: -100, y: -100 });

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    // Default is Rubik's cursor (only false if explicitly set to "false")
    return localStorage.getItem("sotrix_rubiks_cursor") !== "false";
  });

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth <= 768 ||
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  });

  // Track global mouse position so cursor can instantly position itself when toggled on
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(
        window.innerWidth <= 768 ||
        window.matchMedia("(hover: none)").matches ||
        window.matchMedia("(pointer: coarse)").matches
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for cursor toggle custom event and storage event across tabs
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      const val =
        customEvent.detail !== undefined
          ? customEvent.detail
          : localStorage.getItem("sotrix_rubiks_cursor") !== "false";
      setIsEnabled(val);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sotrix_rubiks_cursor") {
        setIsEnabled(e.newValue !== "false");
      }
    };

    window.addEventListener("sotrix_cursor_toggle", handleToggle);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("sotrix_cursor_toggle", handleToggle);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Synchronize disable-custom-cursor class to document body & html
  useEffect(() => {
    if (!isEnabled || isMobileDevice) {
      document.documentElement.classList.add("disable-custom-cursor");
      document.body.classList.add("disable-custom-cursor");
    } else {
      document.documentElement.classList.remove("disable-custom-cursor");
      document.body.classList.remove("disable-custom-cursor");
    }
  }, [isEnabled, isMobileDevice]);

  // Handle active cursor movement and hover interactions
  useEffect(() => {
    if (!isEnabled || isMobileDevice) {
      setIsVisible(false);
      return;
    }

    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    // Immediately snap cursor to the user's current mouse position if known
    if (lastMousePosRef.current.x > 0 && cursorWrapperRef.current) {
      const x = lastMousePosRef.current.x - 13;
      const y = lastMousePosRef.current.y - 2;
      cursorWrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      setIsVisible(true);
    }

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (!cursorWrapperRef.current) return;

      // Position top-front apex right under mouse pointer
      const x = e.clientX - 13;
      const y = e.clientY - 2;
      cursorWrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        setIsInputHovered(isInput);

        const isClickable = Boolean(
          target.closest(
            "button, a, [role='button'], .notification-item, .chat-inbox-item, select, label, .post-action-btn, .profile-edit-btn, .profile-action-btn, .nav-item, .nav-space-link, .explore-tab-btn, input[type='checkbox'], input[type='radio'], input[type='submit'], input[type='button'], [tabindex='0']"
          )
        );
        setIsClickableHovered(isClickable);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        if (isInput) return;
      }
      triggerSlowMove();
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isEnabled, isMobileDevice, triggerSlowMove]);

  const renderCubie = (cubie: Cubie) => {
    const x = cubie.x * 8.2;
    const y = cubie.y * 8.2;
    const z = cubie.z * 8.2;

    return (
      <div
        key={cubie.id}
        className="rubiks-cubie"
        style={{
          transform: `translate3d(${x}px, ${y}px, ${z}px)`,
        }}
      >
        <div className="cubie-face face-f" style={{ backgroundColor: cubie.colors.F }} />
        <div className="cubie-face face-b" style={{ backgroundColor: cubie.colors.B }} />
        <div className="cubie-face face-r" style={{ backgroundColor: cubie.colors.R }} />
        <div className="cubie-face face-l" style={{ backgroundColor: cubie.colors.L }} />
        <div className="cubie-face face-u" style={{ backgroundColor: cubie.colors.U }} />
        <div className="cubie-face face-d" style={{ backgroundColor: cubie.colors.D }} />
      </div>
    );
  };

  const rotatingCubies = activeMove ? cubies.filter(activeMove.match) : [];
  const staticCubies = activeMove ? cubies.filter((c) => !activeMove.match(c)) : cubies;

  if (!isEnabled || isMobileDevice) return null;

  return (
    <div
      ref={cursorWrapperRef}
      className={`rubiks-cursor-wrapper ${
        isVisible && !isInputHovered ? "visible" : "hidden"
      } ${isClickableHovered ? "clickable-hover" : ""}`}
      aria-hidden="true"
    >
      {/* Precision pointer target dot for button aiming */}
      <div className="rubiks-pointer-target">
        <div className="rubiks-pointer-dot" />
      </div>

      {/* 3D Anchor for smooth gliding & scale3d (preserves true 3D perspective) */}
      <div className="rubiks-cube-anchor">
        <div className="rubiks-cube-scene">
          {/* Stationary cubies */}
          <div className="rubiks-slice static-slice">
            {staticCubies.map(renderCubie)}
          </div>

          {/* Slow, mechanical rotating slice with cooltime and preserved sticker positions */}
          {activeMove && (
            <div
              className="rubiks-slice active-rotating-slice"
              style={{
                transform: isAnimating ? activeMove.transform : "none",
                transition: isAnimating
                  ? `transform ${ANIMATION_DURATION_MS}ms cubic-bezier(0.35, 0.05, 0.15, 1)`
                  : "none",
              }}
            >
              {rotatingCubies.map(renderCubie)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RubiksCursor;
