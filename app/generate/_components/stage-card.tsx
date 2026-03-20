"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl border transition-all relative overflow-hidden ${
        isActive
          ? "border-white/[0.1] bg-white/[0.03]"
          : isDone
          ? "border-white/[0.04] bg-white/[0.015]"
          : isError
          ? "border-red-500/20 bg-red-500/[0.03]"
          : "border-white/[0.04] bg-white/[0.01]"
      }`}
    >
      {/* Active stage: subtle left accent bar */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
          style={{ background: `linear-gradient(to bottom, ${color}, ${color}40)` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}

      {/* Active stage: ambient glow */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${color}, transparent 70%)`,
          }}
        />
      )}

      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={status === "upcoming"}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors relative z-10 ${
          status === "upcoming"
            ? "cursor-default opacity-35"
            : "cursor-pointer hover:bg-white/[0.02]"
        }`}
      >
        {/* Status indicator */}
        <div className="shrink-0 w-4 h-4 flex items-center justify-center">
          {isActive ? (
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color }}
            />
          ) : isDone ? (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
              <CheckCircle2 size={16} className="text-emerald-400" />
            </motion.div>
          ) : isError ? (
            <XCircle size={16} className="text-red-400" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-white/[0.08] bg-white/[0.02]" />
          )}
        </div>

        {/* Icon + label */}
        <Icon
          size={14}
          className="shrink-0"
          style={{ color: status === "upcoming" ? undefined : color }}
        />
        <span
          className={`text-[13px] font-medium flex-1 text-left tracking-wide ${
            isActive
              ? "text-gray-100"
              : isDone
              ? "text-gray-400"
              : "text-gray-600"
          }`}
        >
          {label}
        </span>

        {/* Badge */}
        {badge != null && isDone && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-gray-400"
            style={{
              borderColor: `${color}20`,
              backgroundColor: `${color}08`,
            }}
          >
            {badge}
          </motion.span>
        )}

        {/* Chevron */}
        {status !== "upcoming" && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={12} className="text-gray-600" />
          </motion.div>
        )}
      </button>

      {/* Summary line (visible when collapsed + done) */}
      {!expanded && isDone && summary ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-3 -mt-1 relative z-10"
        >
          <p className="text-[11px] text-gray-600 pl-[52px] leading-relaxed">
            {summary}
          </p>
        </motion.div>
      ) : null}

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden relative z-10"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};
