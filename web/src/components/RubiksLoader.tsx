import React, { useEffect, useState, useRef, useMemo } from "react";

export interface RubiksLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

export interface CubieFaceColors {
  U: string;
  D: string;
  F: string;
  B: string;
  R: string;
  L: string;
}

export interface LoaderCubie {
  id: number;
  x: number; // -1 (left), 0 (center), 1 (right)
  y: number; // -1 (top), 0 (middle), 1 (bottom)
  z: number; // -1 (back), 0 (center), 1 (front)
  colors: CubieFaceColors;
}

// Sotrix Obsidian & Emerald Theme Palette (Subtle directional lighting, NO rainbow toy colors)
const COLOR_U = "#1e293b"; // Top: Slate Graphite Highlight
const COLOR_F = "#0f172a"; // Front: Deep Obsidian Slate
const COLOR_R = "#162032"; // Right: Mid Slate
const COLOR_L = "#101622"; // Left: Ambient Shadow Slate
const COLOR_B = "#0a0e16"; // Back: Deep Shadow Slate
const COLOR_D = "#06090e"; // Bottom: Pure Dark Obsidian
const COLOR_INTERNAL = "#000000"; // Hidden internal core seam

const createInitialCubies = (): LoaderCubie[] => {
  const cubies: LoaderCubie[] = [];
  let id = 0;
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        // Skip hidden central core
        if (x === 0 && y === 0 && z === 0) continue;

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

// 3D Mathematical Coordinate & Face Rotations (Exact Engine from RubiksCursor)
// (+X = Right, +Y = Down, +Z = Front / Towards viewer)
const rotateY_neg90 = (c: LoaderCubie): LoaderCubie => ({
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

const rotateY_pos90 = (c: LoaderCubie): LoaderCubie => ({
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

const rotateX_neg90 = (c: LoaderCubie): LoaderCubie => ({
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

const rotateX_pos90 = (c: LoaderCubie): LoaderCubie => ({
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

const rotateZ_pos90 = (c: LoaderCubie): LoaderCubie => ({
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

const rotateZ_neg90 = (c: LoaderCubie): LoaderCubie => ({
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
  match: (c: LoaderCubie) => boolean;
  transform: string;
  apply: (c: LoaderCubie) => LoaderCubie;
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

// Left-Visible Speedcubing Solve Routines (<L, U, F> 3-Gen: Top, Left, Front faces only)
// Every turn happens directly on Top, Left, and Front faces (Right face remains stationary)
const SPEEDCUBER_ROUTINES: number[][] = [
  // Routine 1: Left-Handed "Sexy Move" trigger drill (L' U' L U x 2)
  [6, 1, 7, 0, 6, 1, 7, 0],

  // Routine 2: Front & Left Flick (F' L' U' L U F)
  [9, 6, 1, 7, 0, 8],

  // Routine 3: Left Sune OLL algorithm (L' U' L U' L' U' U' L)
  [6, 1, 7, 1, 6, 1, 1, 7],

  // Routine 4: Left T-Perm Trigger (L' U' L U L F' L' F)
  [6, 1, 7, 0, 7, 9, 6, 8],

  // Routine 5: L-U-F Triple Flow (L' U' L F U' F' L' U L)
  [6, 1, 7, 8, 1, 9, 6, 0, 7],

  // Routine 6: Inverse Left Sexy & Front Flick (U' L' U L F' L' F)
  [1, 6, 0, 7, 9, 6, 8],
];

const SPEED_MOVE_DURATION_MS = 260;

export const RubiksLoader: React.FC<RubiksLoaderProps> = ({
  size = "md",
  text,
  fullscreen = false,
  className = "",
}) => {
  const [cubies, setCubies] = useState<LoaderCubie[]>(createInitialCubies);
  const cubiesRef = useRef<LoaderCubie[]>(cubies);
  cubiesRef.current = cubies;

  const [activeMove, setActiveMove] = useState<MoveDef | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const isMountedRef = useRef(true);

  // Speedcuber solving routine cycle loop (Pure infinite continuous motion, zero pauses)
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    // Execute single 3D slice turn with double-RAF CSS transition (Zero delay handoff)
    const executeTurn = (moveIdx: number): Promise<void> => {
      return new Promise((resolve) => {
        if (isCancelled || !isMountedRef.current) return resolve();

        const move = MOVES[moveIdx];
        if (!move) return resolve();

        setActiveMove(move);
        setIsAnimating(false);

        // Frame 1 -> Frame 2: Trigger transition smoothly
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (isCancelled || !isMountedRef.current) return resolve();
            setIsAnimating(true);

            setTimeout(() => {
              if (isCancelled || !isMountedRef.current) return resolve();

              // Commit updated 3D coordinates & face colors
              const nextCubies = cubiesRef.current.map((c) =>
                move.match(c) ? move.apply(c) : c
              );
              cubiesRef.current = nextCubies;
              setCubies(nextCubies);
              setActiveMove(null);
              setIsAnimating(false);

              // Seamless immediate next turn (Zero pause)
              requestAnimationFrame(() => {
                if (!isCancelled && isMountedRef.current) resolve();
              });
            }, SPEED_MOVE_DURATION_MS);
          });
        });
      });
    };

    const runSpeedcubeLoop = async () => {
      let routineIndex = 0;

      while (!isCancelled && isMountedRef.current) {
        const routineMoves = SPEEDCUBER_ROUTINES[routineIndex % SPEEDCUBER_ROUTINES.length];
        routineIndex++;

        // Rapid scramble finger-tricks (continuous, zero pause)
        for (let i = 0; i < routineMoves.length; i++) {
          if (isCancelled || !isMountedRef.current) break;
          await executeTurn(routineMoves[i]);
        }

        if (isCancelled || !isMountedRef.current) break;

        // Immediate lightning speed-solve unwind (continuous, zero pause)
        for (let i = routineMoves.length - 1; i >= 0; i--) {
          if (isCancelled || !isMountedRef.current) break;
          const inverseIdx = MOVES[routineMoves[i]].oppositeIdx;
          await executeTurn(inverseIdx);
        }

        if (isCancelled || !isMountedRef.current) break;

        // Reset to clean alignment and instantly continue into next routine (zero pause)
        const solved = createInitialCubies();
        cubiesRef.current = solved;
        setCubies(solved);
      }
    };

    runSpeedcubeLoop();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, []);

  const staticCubies = useMemo(() => {
    return activeMove ? cubies.filter((c) => !activeMove.match(c)) : cubies;
  }, [cubies, activeMove]);

  const rotatingCubies = useMemo(() => {
    return activeMove ? cubies.filter(activeMove.match) : [];
  }, [cubies, activeMove]);

  // Screen-width-aligned responsive sizing
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sizeMultiplier = size === "sm" ? 0.82 : size === "lg" ? 1.35 : 1.0;
  // Dynamic screen width alignment: scales proportionally with viewport width
  const screenFactor = Math.max(0.92, Math.min(1.65, 0.75 + (windowWidth / 1920) * 0.85));
  const fullscreenFactor = fullscreen ? 1.15 : 1.0;
  const finalScale = Number((sizeMultiplier * screenFactor * fullscreenFactor).toFixed(3));

  const renderFace = (cubie: LoaderCubie, side: keyof CubieFaceColors, faceClass: string) => {
    const isInternal = cubie.colors[side] === COLOR_INTERNAL;
    return (
      <div
        className={`cubie-face ${faceClass} ${isInternal ? "is-internal" : "is-external"}`}
        style={{
          backgroundColor: isInternal ? "var(--bg-matrix, #000000)" : cubie.colors[side],
        }}
      />
    );
  };

  const renderCubie = (c: LoaderCubie) => {
    const x = c.x * 8.2;
    const y = c.y * 8.2;
    const z = c.z * 8.2;

    return (
      <div
        key={c.id}
        className="rubiks-loader-cubie"
        style={{
          transform: `translate3d(${x}px, ${y}px, ${z}px)`,
        }}
      >
        {renderFace(c, "F", "face-f")}
        {renderFace(c, "B", "face-b")}
        {renderFace(c, "R", "face-r")}
        {renderFace(c, "L", "face-l")}
        {renderFace(c, "U", "face-u")}
        {renderFace(c, "D", "face-d")}
      </div>
    );
  };

  const content = (
    <div
      className={`rubiks-loader-container rubiks-loader-${size} ${className}`}
      role="status"
      aria-label="Loading..."
      style={{
        ["--loader-scale" as any]: finalScale,
        gap: `${Math.round(18 * finalScale)}px`,
      }}
    >
      {/* 3D Kinetic Anchor with subtle floating levitation, dynamically aligned to screen width */}
      <div
        className="rubiks-loader-anchor"
        style={{
          width: `${Math.round(26 * finalScale)}px`,
          height: `${Math.round(26 * finalScale)}px`,
        }}
      >
        {/* Soft emerald atmospheric aura */}
        <div
          className="rubiks-loader-aura"
          style={{
            transform: `scale(${finalScale})`,
          }}
        />

        {/* 3D Isometric Scene matching RubiksCursor exactly, scaled to screen width */}
        <div
          className="rubiks-loader-cube-scene"
          style={{
            transform: `scale3d(${finalScale}, ${finalScale}, ${finalScale}) rotateX(-26deg) rotateY(38deg)`,
          }}
        >
          {/* Stationary cubies */}
          <div className="rubiks-loader-slice static-slice">
            {staticCubies.map(renderCubie)}
          </div>

          {/* Active speedcuber rotating slice */}
          {activeMove && (
            <div
              className="rubiks-loader-slice active-rotating-slice"
              style={{
                transform: isAnimating ? activeMove.transform : "none",
                transition: isAnimating
                  ? `transform ${SPEED_MOVE_DURATION_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`
                  : "none",
              }}
            >
              {rotatingCubies.map(renderCubie)}
            </div>
          )}
        </div>
      </div>

      {/* Themed Status Caption scaled proportionally to screen width */}
      {text && (
        <div
          className="rubiks-loader-caption"
          style={{
            fontSize: `${Math.max(10, Math.min(13, Math.round(11 * Math.sqrt(screenFactor))))}px`,
          }}
        >
          <span className="rubiks-loader-dot" />
          <span className="rubiks-loader-text">{text}</span>
          <span className="rubiks-loader-dot" />
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return <div className="rubiks-loader-overlay">{content}</div>;
  }

  return content;
};

export default RubiksLoader;
