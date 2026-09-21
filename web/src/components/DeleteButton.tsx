import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";

const HINGE = "3px 6px";
const LID_OPEN = -35;
const WALL_TOP = 6;
const WALL_TOP_OPEN = 13.5;
const WALL_BASE = 20;

const HOLD = { deleted: 1400, kept: 600 };

const EASE = [0.32, 0.72, 0, 1] as const;
const EASE_LID = [0.34, 1.1, 0.64, 1] as const;

const WIDTH = { duration: 0.62, ease: EASE } as const;
const LID = { duration: 0.6, ease: EASE_LID } as const;
const WALL = { duration: 0.56, ease: EASE } as const;
const IN = { duration: 0.44, ease: EASE, delay: 0.14 } as const;
const OUT = { duration: 0.3, ease: EASE } as const;
const TAP = { duration: 0.2, ease: EASE } as const;
const SWAP = { duration: 0.22, ease: EASE } as const;
const SETTLE = { duration: 0.45, ease: EASE } as const;
const PRESS = {
  type: "spring",
  stiffness: 520,
  damping: 18,
  mass: 0.5,
} as const;
const INSTANT = { duration: 0 } as const;

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const panelMotion = {
  hidden: { opacity: 0, x: -6, transition: OUT },
  shown: { opacity: 1, x: 0, transition: { ...IN, staggerChildren: 0.07 } },
};

const circleMotion = {
  hidden: { opacity: 0, scale: 0.9, transition: OUT },
  shown: { opacity: 1, scale: 1, transition: IN },
};

export const DELETE_BUTTON_SIZES = {
  sm: {
    height: 24,
    tile: 24,
    panel: 48,
    borderRadius: 6,
    iconSize: 13,
    circleSize: 18,
    circleIconSize: 9,
    gap: 3,
    strokeWidth: 2,
    circleStrokeWidth: 3,
  },
  md: {
    height: 32,
    tile: 32,
    panel: 62,
    borderRadius: 8,
    iconSize: 16,
    circleSize: 22,
    circleIconSize: 11,
    gap: 4,
    strokeWidth: 2,
    circleStrokeWidth: 3.2,
  },
  lg: {
    height: 48,
    tile: 48,
    panel: 84,
    borderRadius: 14,
    iconSize: 20,
    circleSize: 28,
    circleIconSize: 14,
    gap: 8,
    strokeWidth: 2,
    circleStrokeWidth: 3.5,
  },
} as const;

export type DeleteButtonSize = keyof typeof DELETE_BUTTON_SIZES;

function Circle({
  label,
  onClick,
  children,
  circleSize,
  circleIconSize,
  strokeWidth,
  variant,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
  circleSize: number;
  circleIconSize: number;
  strokeWidth: number;
  variant: "confirm" | "cancel";
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div style={{ display: "flex" }} variants={reduced ? undefined : circleMotion}>
      <motion.button
        type="button"
        aria-label={label}
        onClick={onClick}
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.86 }}
        transition={PRESS}
        className={`sotrix-delete-circle ${variant}`}
        style={{ width: circleSize, height: circleSize }}
      >
        <svg
          {...ICON}
          width={circleIconSize}
          height={circleIconSize}
          stroke="currentColor"
          strokeWidth={strokeWidth}
        >
          {children}
        </svg>
      </motion.button>
    </motion.div>
  );
}

type Status = "idle" | "deleted" | "kept";

export type DeleteButtonProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  size?: DeleteButtonSize;
  accentColor?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  title?: string;
};

export function DeleteButton({
  className = "",
  style,
  size = "sm",
  accentColor = "#FF5F2E",
  onConfirm,
  onCancel,
  disabled = false,
  title = "Delete",
  ...props
}: DeleteButtonProps) {
  const s = DELETE_BUTTON_SIZES[size] || DELETE_BUTTON_SIZES.sm;
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const trigger = useRef<HTMLButtonElement>(null);
  const timing = (transition: Transition) => (reduced ? INSTANT : transition);

  const top = useMotionValue(WALL_TOP);
  const wall = useTransform(top, (y) => WALL_BASE - y);
  const bin = useMotionTemplate`M19 ${top}v${wall}a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V${top}`;
  const settle = useMotionValue(1);

  useEffect(() => {
    const walls = animate(
      top,
      open ? WALL_TOP_OPEN : WALL_TOP,
      reduced ? INSTANT : WALL
    );
    return () => walls.stop();
  }, [open, reduced, top]);

  useEffect(() => {
    if (status === "idle") return;
    const nudge =
      status === "kept" && !reduced
        ? animate(settle, [1, 0.86, 1], SETTLE)
        : null;
    const done = setTimeout(() => setStatus("idle"), HOLD[status]);
    return () => {
      nudge?.stop();
      clearTimeout(done);
    };
  }, [status, reduced, settle]);

  const resolve = (next: Exclude<Status, "idle">) => {
    setOpen(false);
    setStatus(next);
    trigger.current?.focus();
    if (next === "deleted") {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  };

  return (
    <motion.div
      data-slot="delete-button"
      data-state={open ? "open" : "closed"}
      data-status={status}
      className={`sotrix-delete-button ${className}`.trim()}
      style={{
        height: s.height,
        borderRadius: s.borderRadius,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        ...style,
      }}
      animate={{ width: open ? s.tile + s.panel : s.tile }}
      transition={timing(WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) resolve("kept");
      }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <motion.button
        ref={trigger}
        type="button"
        aria-label={title}
        title={open ? "Cancel delete" : title}
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          if (open) return resolve("kept");
          setStatus("idle");
          setOpen(true);
        }}
        whileTap={reduced || disabled ? undefined : { scale: 0.94 }}
        transition={TAP}
        className="sotrix-delete-trigger"
        style={{
          width: s.tile,
          height: s.height,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "deleted" ? (
            <motion.svg
              key="done"
              {...ICON}
              width={s.iconSize}
              height={s.iconSize}
              stroke={accentColor}
              strokeWidth={s.strokeWidth + 0.5}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={timing(SWAP)}
            >
              <motion.path
                d="M4 12.5 9.5 18 20 7"
                initial={reduced ? undefined : { pathLength: 0 }}
                animate={reduced ? undefined : { pathLength: 1 }}
                transition={SETTLE}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="bin"
              {...ICON}
              width={s.iconSize}
              height={s.iconSize}
              stroke="currentColor"
              strokeWidth={s.strokeWidth}
              className="overflow-visible"
              style={{ scale: settle }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={timing(SWAP)}
            >
              <motion.path d={bin} />
              <motion.g
                style={{ transformBox: "view-box", transformOrigin: HINGE }}
                animate={{ rotate: open ? LID_OPEN : 0 }}
                transition={timing(LID)}
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </motion.g>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>


      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            style={{
              width: s.panel,
              gap: s.gap,
            }}
            className="sotrix-delete-panel"
            variants={reduced ? undefined : panelMotion}
            initial="hidden"
            animate="shown"
            exit="hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="sotrix-delete-notch" />
            <Circle
              label="Confirm delete"
              variant="confirm"
              circleSize={s.circleSize}
              circleIconSize={s.circleIconSize}
              strokeWidth={s.circleStrokeWidth}
              onClick={(e) => {
                e.stopPropagation();
                resolve("deleted");
              }}
            >
              <path d="M4 12.5 9.5 18 20 7" stroke={accentColor} />
            </Circle>
            <Circle
              label="Cancel"
              variant="cancel"
              circleSize={s.circleSize}
              circleIconSize={s.circleIconSize}
              strokeWidth={s.circleStrokeWidth}
              onClick={(e) => {
                e.stopPropagation();
                resolve("kept");
              }}
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </Circle>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DeleteButton;
