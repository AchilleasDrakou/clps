"use client";

import { motion } from "motion/react";

const Shimmer = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <motion.div
    className={`rounded bg-white/[0.04] ${className ?? ""}`}
    style={style}
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
  />
);

export const SkeletonBeats = () => (
  <div className="space-y-2 pl-[52px]">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Shimmer className="w-4 h-4 rounded-[4px] shrink-0" />
        <Shimmer className="h-3 rounded-full" style={{ width: `${50 + i * 12}%` }} />
      </div>
    ))}
  </div>
);

export const SkeletonBrowser = () => (
  <div className="space-y-3">
    {/* URL bar */}
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5">
        <Shimmer className="w-2.5 h-2.5 rounded-full" />
        <Shimmer className="w-2.5 h-2.5 rounded-full" />
        <Shimmer className="w-2.5 h-2.5 rounded-full" />
      </div>
      <Shimmer className="flex-1 h-5 rounded-md" />
    </div>
    {/* Content area */}
    <Shimmer className="w-full h-32 rounded-lg" />
  </div>
);

export const SkeletonNarration = () => (
  <div className="space-y-2.5 pl-[52px]">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Shimmer className="w-3 h-3 rounded-full shrink-0" />
        <Shimmer className="h-3 rounded-full flex-1" />
        <Shimmer className="w-8 h-3 rounded-full shrink-0" />
      </div>
    ))}
  </div>
);
