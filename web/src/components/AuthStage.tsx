import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export type StagePhase = "assembling" | "viewing_assembled" | "twisting";

export interface CubieBlock {
  id: number;
  name: string;
  tier: "top" | "mid" | "bottom";
  x: number; // -1 (left), 0 (center), 1 (right)
  y: number; // -1 (top), 0 (mid), 1 (bottom)
  z: number; // -1 (back), 0 (center), 1 (front)
  rotX: number;
  rotY: number;
  rotZ: number;
  depth: number;
  scatter: {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  };
}

// Exactly 9 cubes categorized into 3 layers (3 cubes per layer):
// - Top Layer: Cubes 1, 2, 3 (T3, T6, T2) -> y = -1
// - Mid Layer: Cubes 4, 5, 6 (M2, M5, M8) -> y = 0
// - Bottom Layer: Cubes 7, 8, 9 (B8, B4, B7) -> y = 1
//
// Strict geometrical stacking matching sotrix-logo.svg:
// - Cube 3 (T2) sits directly above Cube 4 (M2) at x = -1, z = 0
// - Cube 6 (M8) sits directly above Cube 7 (B8) at x = +1, z = 0
const INITIAL_BLOCKS: CubieBlock[] = [
  // --- TOP LAYER (Cubes 1, 2, 3) ---
  {
    id: 1,
    name: "T3",
    tier: "top",
    x: -1,
    y: -1,
    z: -1,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 0.5,
    scatter: { x: -70, y: -260, z: -140, rx: 45, ry: -60, rz: 30 },
  },
  {
    id: 2,
    name: "T6",
    tier: "top",
    x: 0,
    y: -1,
    z: -1,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 0.7,
    scatter: { x: 220, y: -230, z: -90, rx: -30, ry: 70, rz: 45 },
  },
  {
    id: 3,
    name: "T2",
    tier: "top",
    x: -1,
    y: -1,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 0.6,
    scatter: { x: -240, y: -200, z: 70, rx: 60, ry: -40, rz: -30 },
  },

  // --- MID LAYER (Cubes 4, 5, 6) ---
  {
    id: 4,
    name: "M2",
    tier: "mid",
    x: -1,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 0.8,
    scatter: { x: -260, y: 15, z: 130, rx: -45, ry: -50, rz: 60 },
  },
  {
    id: 5,
    name: "M5",
    tier: "mid",
    x: 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 1.0,
    scatter: { x: 0, y: 25, z: -200, rx: 80, ry: 20, rz: 0 },
  },
  {
    id: 6,
    name: "M8",
    tier: "mid",
    x: 1,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 1.2,
    scatter: { x: 250, y: 20, z: -110, rx: 30, ry: 60, rz: -45 },
  },

  // --- BOTTOM LAYER (Cubes 7, 8, 9) ---
  {
    id: 7,
    name: "B8",
    tier: "bottom",
    x: 1,
    y: 1,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 1.4,
    scatter: { x: 230, y: 220, z: 90, rx: 50, ry: -45, rz: 30 },
  },
  {
    id: 8,
    name: "B4",
    tier: "bottom",
    x: 0,
    y: 1,
    z: 1,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 1.3,
    scatter: { x: -200, y: 240, z: 190, rx: -60, ry: 40, rz: -50 },
  },
  {
    id: 9,
    name: "B7",
    tier: "bottom",
    x: 1,
    y: 1,
    z: 1,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    depth: 1.6,
    scatter: { x: 50, y: 280, z: 240, rx: 70, ry: -30, rz: 40 },
  },
];

// Spacing between cubie centers in 3D space
const CUBIE_STEP = 54;

interface RubiksMoveDef {
  name: string;
  match: (b: CubieBlock) => boolean;
  axis: "X" | "Y" | "Z";
  angle: number;
  apply: (b: CubieBlock) => CubieBlock;
}

// Full move dictionary
const MOVE_DICT: Record<string, RubiksMoveDef> = {
  U: {
    name: "Top (U)",
    match: (b) => b.y === -1,
    axis: "Y",
    angle: -90,
    apply: (b) => ({ ...b, x: -b.z, z: b.x, rotY: b.rotY - 90 }),
  },
  U_prime: {
    name: "Top (U')",
    match: (b) => b.y === -1,
    axis: "Y",
    angle: 90,
    apply: (b) => ({ ...b, x: b.z, z: -b.x, rotY: b.rotY + 90 }),
  },
  D: {
    name: "Bottom (D)",
    match: (b) => b.y === 1,
    axis: "Y",
    angle: 90,
    apply: (b) => ({ ...b, x: b.z, z: -b.x, rotY: b.rotY + 90 }),
  },
  D_prime: {
    name: "Bottom (D')",
    match: (b) => b.y === 1,
    axis: "Y",
    angle: -90,
    apply: (b) => ({ ...b, x: -b.z, z: b.x, rotY: b.rotY - 90 }),
  },
  R: {
    name: "Right (R)",
    match: (b) => b.x === 1,
    axis: "X",
    angle: 90,
    apply: (b) => ({ ...b, y: -b.z, z: b.y, rotX: b.rotX + 90 }),
  },
  R_prime: {
    name: "Right (R')",
    match: (b) => b.x === 1,
    axis: "X",
    angle: -90,
    apply: (b) => ({ ...b, y: b.z, z: -b.y, rotX: b.rotX - 90 }),
  },
  F: {
    name: "Front (F)",
    match: (b) => b.z === 1,
    axis: "Z",
    angle: 90,
    apply: (b) => ({ ...b, x: -b.y, y: b.x, rotZ: b.rotZ + 90 }),
  },
  F_prime: {
    name: "Front (F')",
    match: (b) => b.z === 1,
    axis: "Z",
    angle: -90,
    apply: (b) => ({ ...b, x: b.y, y: -b.x, rotZ: b.rotZ - 90 }),
  },
  L: {
    name: "Left (L)",
    match: (b) => b.x === -1,
    axis: "X",
    angle: -90,
    apply: (b) => ({ ...b, y: b.z, z: -b.y, rotX: b.rotX - 90 }),
  },
  L_prime: {
    name: "Left (L')",
    match: (b) => b.x === -1,
    axis: "X",
    angle: 90,
    apply: (b) => ({ ...b, y: -b.z, z: b.y, rotX: b.rotX + 90 }),
  },
};

// 3 Distinct 6-Move Speedcuber Sets (Total = 18 moves)
// Each 6-move burst twists smoothly and mathematically resolves 100% back into the Sotrix 'S'
// without ever reversing! After every 6 moves, there is a dedicated 3s gap to view the solved logo.
const MOVE_SETS = [
  {
    name: "Right & Axial Twist",
    moves: ["U_prime", "D", "R", "U", "R_prime", "D_prime"],
  },
  {
    name: "Left & Axial Twist",
    moves: ["U", "L", "D", "L_prime", "U_prime", "D_prime"],
  },
  {
    name: "Front & Top Twist",
    moves: ["U", "F", "D", "U_prime", "D_prime", "F_prime"],
  },
];

const MOVE_DURATION = 420; // 420ms smooth, clearly visible slice rotation
const SETTLE_PAUSE = 60; // 60ms mechanical settle pause between moves
const LOGO_VIEW_GAP_MS = 2000; // 3.0s dedicated gap after every 6 moves so user clearly sees the solved logo

interface ActiveTwistState {
  axis: "X" | "Y" | "Z";
  angle: number;
  match: (b: CubieBlock) => boolean;
  duration: number;
}

export default function AuthStage() {
  const location = useLocation();

  // Master Phase State: assembling -> viewing_assembled -> twisting
  const [stagePhase, setStagePhase] = useState<StagePhase>("assembling");
  const [isAssembled, setIsAssembled] = useState(false);

  // Cubies coordinates & state
  const [blocks, setBlocks] = useState<CubieBlock[]>(INITIAL_BLOCKS);
  const blocksRef = useRef<CubieBlock[]>(INITIAL_BLOCKS);
  blocksRef.current = blocks;

  // Active twist engine state
  const [activeTwist, setActiveTwist] = useState<ActiveTwistState | null>(null);
  const [isSliceAnimating, setIsSliceAnimating] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // When activeTwist is set, start the CSS transition on the next frame
  useEffect(() => {
    if (!activeTwist) {
      setIsSliceAnimating(false);
      return;
    }
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setIsSliceAnimating(true);
        }
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [activeTwist]);

  // Master Orchestration: Magnetic Assembly -> Assembled Logo Pause -> Continuous Rubik's Twist Loop
  // Triggers on initial load/refresh or route change (/login <-> /signup)
  useEffect(() => {
    let isCancelled = false;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const executeMove = (moveKey: string): Promise<void> => {
      return new Promise((resolve) => {
        if (isCancelled || !isMountedRef.current) return resolve();

        const move = MOVE_DICT[moveKey];

        setActiveTwist({
          axis: move.axis,
          angle: move.angle,
          match: move.match,
          duration: MOVE_DURATION,
        });

        setTimeout(() => {
          if (isCancelled || !isMountedRef.current) return resolve();

          // Commit updated 3D coordinates
          const nextBlocks = blocksRef.current.map((b) =>
            move.match(b) ? move.apply(b) : b
          );
          blocksRef.current = nextBlocks;
          setBlocks(nextBlocks);
          setActiveTwist(null);
          setIsSliceAnimating(false);

          setTimeout(resolve, SETTLE_PAUSE);
        }, MOVE_DURATION + 40);
      });
    };

    const runMasterFlow = async () => {
      // 1. Initial State: Scattered blocks ready to assemble
      setStagePhase("assembling");
      setIsAssembled(false);
      setBlocks(INITIAL_BLOCKS);
      blocksRef.current = INITIAL_BLOCKS;
      setActiveTwist(null);
      setIsSliceAnimating(false);

      // Give browser time to paint scattered positions
      await sleep(100);
      if (isCancelled || !isMountedRef.current) return;

      // 2. Trigger Magnetic Snap: 9 blocks fly gravitationally into the 'S'
      setIsAssembled(true);

      // Staggered spring inertia completes in ~1400ms
      await sleep(1500);
      if (isCancelled || !isMountedRef.current) return;

      // 3. Pristine Assembled Logo View: Hold logo for 2.0s
      setStagePhase("viewing_assembled");
      await sleep(2000);
      if (isCancelled || !isMountedRef.current) return;

      // 4. Seamlessly transition to Continuous 18-Move Rubik's Twist Loop
      setStagePhase("twisting");

      while (!isCancelled && isMountedRef.current) {
        for (let setIdx = 0; setIdx < MOVE_SETS.length; setIdx++) {
          const currentSet = MOVE_SETS[setIdx];

          // Smoothly execute the 6 moves of this set (420ms per move)
          for (let moveIdx = 0; moveIdx < currentSet.moves.length; moveIdx++) {
            if (isCancelled) break;
            await executeMove(currentSet.moves[moveIdx]);
          }

          if (isCancelled) break;

          // Exactly at move 6, 12, 18: cube is 100% SOLVED into the Sotrix 'S'!
          setBlocks(INITIAL_BLOCKS);
          blocksRef.current = INITIAL_BLOCKS;

          // Dedicated 3.0s gap to clearly see the solved logo
          await sleep(LOGO_VIEW_GAP_MS);
        }
      }
    };

    runMasterFlow();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname]);

  // Render cubie with 6 obsidian & emerald faces
  const renderCubie = (b: CubieBlock, idx: number) => {
    let transform = `translate3d(${b.x * CUBIE_STEP}px, ${b.y * CUBIE_STEP}px, ${b.z * CUBIE_STEP}px) rotateX(${b.rotX}deg) rotateY(${b.rotY}deg) rotateZ(${b.rotZ}deg)`;
    let transition = "none";
    let transitionDelay = "0s";

    if (stagePhase === "assembling") {
      if (!isAssembled) {
        transform = `translate3d(${b.scatter.x}px, ${b.scatter.y}px, ${b.scatter.z}px) rotateX(${b.scatter.rx}deg) rotateY(${b.scatter.ry}deg) rotateZ(${b.scatter.rz}deg) scale3d(0.001, 0.001, 0.001)`;
        transition = "none";
      } else {
        transform = `translate3d(${b.x * CUBIE_STEP}px, ${b.y * CUBIE_STEP}px, ${b.z * CUBIE_STEP}px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale3d(1, 1, 1)`;
        transition = `transform 0.85s cubic-bezier(0.34, 1.45, 0.64, 1)`;
        transitionDelay = `${idx * 0.06}s`;
      }
    }

    return (
      <div
        key={b.id}
        className="auth-stage-cubie"
        style={{
          transform,
          transition,
          transitionDelay,
        }}
      >
        <div className="auth-cubie-face face-u" />
        <div className="auth-cubie-face face-d" />
        <div className="auth-cubie-face face-f" />
        <div className="auth-cubie-face face-b" />
        <div className="auth-cubie-face face-r" />
        <div className="auth-cubie-face face-l" />
      </div>
    );
  };

  // Group blocks into static and rotating slices when in twist mode
  const rotatingBlocks = activeTwist ? blocks.filter(activeTwist.match) : [];
  const staticBlocks = activeTwist ? blocks.filter((b) => !activeTwist.match(b)) : blocks;

  return (
    <div className="auth-stage-wrapper">
      {/* Background Atmospheric Radial Aura */}
      <div className="auth-stage-aura" />

      {/* 3D Canvas Holding the Animated Rubik's S */}
      <div className="auth-stage-canvas">
        <div className="auth-rubiks-scene">
          {/* Static Slice (Cubes not actively rotating) */}
          <div className="auth-rubiks-slice">
            {staticBlocks.map((b, idx) => renderCubie(b, idx))}
          </div>

          {/* Active Rotating Slice (Cubes executing true 3D layer twist) */}
          {activeTwist && (
            <div
              className="auth-rubiks-slice"
              style={{
                transform: isSliceAnimating
                  ? `rotate${activeTwist.axis}(${activeTwist.angle}deg)`
                  : "none",
                transition: isSliceAnimating
                  ? `transform ${activeTwist.duration}ms cubic-bezier(0.25, 1, 0.5, 1)`
                  : "none",
              }}
            >
              {rotatingBlocks.map((b, idx) => renderCubie(b, idx))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
