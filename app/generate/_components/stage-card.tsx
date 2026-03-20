"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  CircleDotDashed,
  XCircle,
} from "lucide-react";

export type StageStatus = "upcoming" | "active" | "done" | "error";

interface StageCardProps {
  icon: React.ElementType;
  label: string;
  color: string;
  status: StageStatus;
  summary?: string;
  badge?: string;
  children?: React.ReactNode;
  autoCollapse?: boolean;
  /** Whether to show the vertical connecting line below this row */
  showConnector?: boolean;
}

/* ── Animation variants ── */

const subListVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" as const },
  visible: {
    height: "auto",
    opacity: 1,
    overflow: "visible" as const,
    transition: {
      duration: 0.25,
      staggerChildren: 0.05,
      ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number],
    },
  },
};

const iconVariants = {
  initial: { scale: 0.8, rotate: -10, opacity: 0 },
  animate: { scale: 1, rotate: 0, opacity: 1 },
  exit: { scale: 0.8, rotate: 10, opacity: 0 },
};

/* ── Status pill styles ── */
function pillClasses(status: StageStatus, color: string) {
  switch (status) {
    case "done":
      return "bg-emerald-500/10 text-emerald-400";
    case "active":
      // Use inline style for stage color
      return "";
    case "error":
      return "bg-red-500/10 text-red-400";
    case "upcoming":
      return "bg-white/[0.04] text-gray-600";
  }
}

function pillLabel(status: StageStatus) {
  switch (status) {
    case "done":
      return "Done";
    case "active":
      return "Active";
    case "error":
      return "Error";
    case "upcoming":
      return "Queued";
  }
}

export const StageCard = ({
  icon: Icon,
  label,
  color,
  status,
  summary,
  badge,
  children,
  autoCollapse = true,
  showConnector = true,
}: StageCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (status === "active") {
      setExpanded(true);
      wasActive.current = true;
    }
    if (status === "done" && wasActive.current && autoCollapse) {
      const timer = setTimeout(() => setExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, autoCollapse]);

  const handleToggle = () => {
    if (status !== "upcoming") setExpanded((prev) => !prev);
  };

  const isActive = status === "active";
  const isDone = status === "done";
  const isError = status === "error";
  const isUpcoming = status === "upcoming";

  return (
    <motion.div layout className="relative">
      {/* ── Vertical connecting line ── */}
      {showConnector && (
        <div
          className="absolute left-[15px] top-[36px] bottom-0 w-0 border-l-2 border-dashed"
          style={{
            borderColor: isDone
              ? "rgba(16,185,129,0.2)"
              : "rgba(255,255,255,0.06)",
          }}
        />
      )}

      {/* ── Row header ── */}
      <button
        onClick={handleToggle}
        disabled={isUpcoming}
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors relative z-10 ${
          isUpcoming
            ? "cursor-default opacity-35"
            : "cursor-pointer"
        }`}
        style={
          !isUpcoming
            ? { ["--hover-bg" as string]: "rgba(255,255,255,0.03)" }
            : undefined
        }
        onMouseEnter={(e) => {
          if (!isUpcoming)
            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)");
        }}
        onMouseLeave={(e) => {
          if (!isUpcoming)
            (e.currentTarget.style.backgroundColor = "transparent");
        }}
      >
        {/* Status icon */}
        <div className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key="active"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <CircleDotDashed
                  size={18}
                  style={{ color }}
                  className="animate-[spin_3s_linear_infinite]"
                />
              </motion.div>
            ) : isDone ? (
              <motion.div
                key="done"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 size={18} className="text-emerald-400" />
              </motion.div>
            ) : isError ? (
              <motion.div
                key="error"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15 }}
              >
                <XCircle size={18} className="text-red-400" />
              </motion.div>
            ) : (
              <motion.div
                key="upcoming"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15 }}
              >
                <Circle size={18} className="text-gray-700" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stage label */}
        <span
          className={`text-[13px] font-medium flex-1 text-left tracking-wide ${
            isActive
              ? "text-gray-100"
              : isDone
              ? "text-gray-500 line-through decoration-gray-700"
              : isError
              ? "text-red-300"
              : "text-gray-600"
          }`}
        >
          {label}
        </span>

        {/* Summary badge (done) */}
        {badge != null && isDone && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.04] text-gray-500"
          >
            {badge}
          </motion.span>
        )}

        {/* Status pill */}
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${pillClasses(status, color)}`}
          style={
            isActive
              ? {
                  backgroundColor: `${color}1a`,
                  color: color,
                }
              : undefined
          }
        >
          {pillLabel(status)}
        </span>
      </button>

      {/* ── Expandable sub-processes ── */}
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div
            variants={subListVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="overflow-hidden relative z-10"
          >
            <div className="pl-[30px] pr-2 pb-2 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};
